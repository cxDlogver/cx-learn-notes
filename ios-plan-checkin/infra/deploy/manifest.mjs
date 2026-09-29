import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { URL } from "node:url";

const apiSecrets = [
  "DATABASE_URL",
  "ACCESS_TOKEN_SECRET",
  "PHONE_ENCRYPTION_KEY",
  "PHONE_LOOKUP_KEY",
  "OTP_HASH_KEY",
  "AUTH_IDEMPOTENCY_KEY",
  "PUSH_TOKEN_ENCRYPTION_KEY",
  "WEB_ORIGIN",
  "VAPID_PUBLIC_KEY",
  "OBJECT_ENDPOINT",
  "OBJECT_PUBLIC_ENDPOINT",
  "OBJECT_BUCKET",
  "OBJECT_REGION",
  "OBJECT_ACCESS_KEY_ID",
  "OBJECT_SECRET_ACCESS_KEY",
  "SMS_GATEWAY_URL",
  "SMS_GATEWAY_TOKEN",
  "API_METRICS_TOKEN",
];
const workerSecrets = [
  "DATABASE_URL",
  "PUSH_TOKEN_ENCRYPTION_KEY",
  "VAPID_PUBLIC_KEY",
  "VAPID_PRIVATE_KEY",
  "VAPID_SUBJECT",
  "OBJECT_ENDPOINT",
  "OBJECT_BUCKET",
  "OBJECT_REGION",
  "OBJECT_ACCESS_KEY_ID",
  "OBJECT_SECRET_ACCESS_KEY",
  "APNS_BUNDLE_ID",
  "APNS_TEAM_ID",
  "APNS_KEY_ID",
  "APNS_PRIVATE_KEY_BASE64",
];
export const secretKeys = { api: apiSecrets, worker: workerSecrets, web: [] };
const imagePattern = /^[a-z0-9][a-z0-9./:_-]+@sha256:[0-9a-f]{64}$/i;
const releasePattern = /^[0-9a-f]{40}$/i;
const hostPattern = /^[a-z0-9.-]+\.[a-z]{2,}$/;

export async function loadProfile(environment) {
  if (!["development", "staging", "production"].includes(environment))
    throw new Error("Unknown deployment environment.");
  return JSON.parse(
    await readFile(
      new URL(`./environments/${environment}.json`, import.meta.url),
      "utf8",
    ),
  );
}

const envRef = (key, name) => ({
  name: key,
  valueFrom: { secretKeyRef: { name, key } },
});
const commonLabels = (component) => ({ app: "plan-checkin", component });

function container(name, image, profile) {
  const api = name === "api";
  const web = name === "web";
  return {
    name,
    image,
    imagePullPolicy: "IfNotPresent",
    command: [
      "node",
      web
        ? "server.mjs"
        : api
          ? "apps/api/dist/main.js"
          : "apps/worker/dist/main.js",
    ],
    ports:
      api || web ? [{ containerPort: web ? 8080 : 3000, name: "http" }] : [],
    env: [
      ...(web
        ? [
            { name: "WEB_PORT", value: "8080" },
            { name: "WEB_OBJECT_ORIGIN", value: profile.objectOrigin },
          ]
        : [{ name: "APP_ENV", value: profile.environment }]),
      ...(web
        ? []
        : api
          ? [
              { name: "API_PORT", value: "3000" },
              {
                name: "API_TRUST_PROXY_HOPS",
                value: String(profile.trustProxyHops),
              },
              { name: "SMS_PROVIDER", value: profile.smsProvider },
            ]
          : [
              { name: "APNS_PROVIDER", value: profile.apnsProvider },
              { name: "APNS_ENV", value: profile.apnsEnvironment },
            ]),
      ...(web ? [] : api ? apiSecrets : workerSecrets).map((key) =>
        envRef(key, `plan-checkin-${name}`),
      ),
    ],
    resources: web
      ? {
          requests: { cpu: "50m", memory: "64Mi" },
          limits: { cpu: "500m", memory: "256Mi" },
        }
      : api
        ? {
            requests: { cpu: "100m", memory: "256Mi" },
            limits: { cpu: "1000m", memory: "768Mi" },
          }
        : {
            requests: { cpu: "100m", memory: "256Mi" },
            limits: { cpu: "1000m", memory: "1Gi" },
          },
    securityContext: {
      allowPrivilegeEscalation: false,
      readOnlyRootFilesystem: true,
      runAsNonRoot: true,
      runAsUser: 1000,
      capabilities: { drop: ["ALL"] },
    },
    volumeMounts: [{ name: "tmp", mountPath: "/tmp" }],
    ...(api || web
      ? {
          readinessProbe: {
            httpGet: {
              path: web ? "/healthz" : "/api/v1/health/ready",
              port: "http",
            },
            periodSeconds: 10,
            timeoutSeconds: 3,
          },
          livenessProbe: {
            httpGet: {
              path: web ? "/healthz" : "/api/v1/health/live",
              port: "http",
            },
            periodSeconds: 20,
            timeoutSeconds: 3,
          },
        }
      : {}),
  };
}

function deployment(name, image, profile) {
  const labels = commonLabels(name);
  return {
    apiVersion: "apps/v1",
    kind: "Deployment",
    metadata: {
      namespace: profile.namespace,
      name: `plan-checkin-${name}`,
      labels,
    },
    spec: {
      replicas:
        name === "api"
          ? profile.apiReplicas
          : name === "web"
            ? profile.webReplicas
            : profile.workerReplicas,
      revisionHistoryLimit: 3,
      strategy: {
        type: "RollingUpdate",
        rollingUpdate: { maxSurge: 1, maxUnavailable: 0 },
      },
      selector: { matchLabels: labels },
      template: {
        metadata: {
          labels,
          annotations: { "plan-checkin/release": profile.releaseId },
        },
        spec: {
          serviceAccountName: `plan-checkin-${name}`,
          automountServiceAccountToken: false,
          nodeSelector: { "topology.kubernetes.io/region": profile.region },
          topologySpreadConstraints:
            profile.environment === "production"
              ? [
                  {
                    maxSkew: 1,
                    topologyKey: "topology.kubernetes.io/zone",
                    whenUnsatisfiable: "DoNotSchedule",
                    labelSelector: { matchLabels: labels },
                  },
                ]
              : [],
          securityContext: {
            runAsNonRoot: true,
            seccompProfile: { type: "RuntimeDefault" },
          },
          containers: [container(name, image, profile)],
          volumes: [{ name: "tmp", emptyDir: { sizeLimit: "256Mi" } }],
        },
      },
    },
  };
}

export function buildManifests(
  profile,
  { image, webImage, releaseId, host, tlsSecret, objectOrigin },
) {
  if (!imagePattern.test(image) || !imagePattern.test(webImage))
    throw new Error("Image must be pinned by sha256 digest.");
  if (!releasePattern.test(releaseId))
    throw new Error("Release ID must be a 40-character Git SHA.");
  if (!hostPattern.test(host) || host.endsWith(".invalid"))
    throw new Error("Web/API host must be a real DNS name.");
  if (!/^[a-z0-9-]{1,63}$/.test(tlsSecret))
    throw new Error("Invalid TLS secret name.");
  let objectUrl;
  try {
    objectUrl = new URL(objectOrigin);
  } catch {
    throw new Error("Web object origin must be an HTTPS origin.");
  }
  if (objectUrl.protocol !== "https:" || objectUrl.origin !== objectOrigin)
    throw new Error("Web object origin must be an HTTPS origin.");
  if (!Number.isInteger(profile.webReplicas) || profile.webReplicas < 1)
    throw new Error("Web requires at least one replica.");
  if (!/^cn-[a-z0-9-]+$/.test(profile.region))
    throw new Error("Deployment region must be in China mainland.");
  if (
    profile.environment === "production" &&
    (profile.apiReplicas < 2 ||
      profile.workerReplicas < 2 ||
      profile.webReplicas < 2)
  )
    throw new Error(
      "Production requires multiple API, Worker and Web replicas.",
    );
  const config = { ...profile, releaseId, objectOrigin };
  const namespace = profile.namespace;
  const jobName = `plan-checkin-migrate-${createHash("sha256").update(releaseId).digest("hex").slice(0, 12)}`;
  const namespaceObject = {
    apiVersion: "v1",
    kind: "Namespace",
    metadata: {
      name: namespace,
      labels: { "plan-checkin/environment": profile.environment },
    },
  };
  const job = {
    apiVersion: "batch/v1",
    kind: "Job",
    metadata: { namespace, name: jobName, labels: commonLabels("migration") },
    spec: {
      backoffLimit: 1,
      activeDeadlineSeconds: 900,
      ttlSecondsAfterFinished: 604800,
      template: {
        spec: {
          serviceAccountName: "plan-checkin-migration",
          automountServiceAccountToken: false,
          restartPolicy: "Never",
          nodeSelector: { "topology.kubernetes.io/region": profile.region },
          securityContext: {
            runAsNonRoot: true,
            seccompProfile: { type: "RuntimeDefault" },
          },
          containers: [
            {
              name: "migration",
              image,
              imagePullPolicy: "IfNotPresent",
              command: ["node", "scripts/migrate.mjs"],
              env: [envRef("DATABASE_URL", "plan-checkin-migration")],
              securityContext: {
                allowPrivilegeEscalation: false,
                readOnlyRootFilesystem: true,
                runAsNonRoot: true,
                runAsUser: 1000,
                capabilities: { drop: ["ALL"] },
              },
              resources: {
                requests: { cpu: "100m", memory: "128Mi" },
                limits: { cpu: "500m", memory: "512Mi" },
              },
            },
          ],
        },
      },
    },
  };
  const serviceAccounts = ["api", "worker", "web", "migration"].map((name) => ({
    apiVersion: "v1",
    kind: "ServiceAccount",
    metadata: { namespace, name: `plan-checkin-${name}` },
    automountServiceAccountToken: false,
  }));
  const app = [
    deployment("api", image, config),
    deployment("worker", image, config),
    deployment("web", webImage, config),
    {
      apiVersion: "v1",
      kind: "Service",
      metadata: { namespace, name: "plan-checkin-web" },
      spec: {
        type: "ClusterIP",
        selector: commonLabels("web"),
        ports: [{ name: "http", port: 80, targetPort: "http" }],
      },
    },
    {
      apiVersion: "v1",
      kind: "Service",
      metadata: { namespace, name: "plan-checkin-api" },
      spec: {
        type: "ClusterIP",
        selector: commonLabels("api"),
        ports: [{ name: "http", port: 80, targetPort: "http" }],
      },
    },
    {
      apiVersion: "networking.k8s.io/v1",
      kind: "Ingress",
      metadata: {
        namespace,
        name: "plan-checkin-api",
        annotations: { "kubernetes.io/ingress.class": "public-waf" },
      },
      spec: {
        tls: [{ hosts: [host], secretName: tlsSecret }],
        rules: [
          {
            host,
            http: {
              paths: [
                {
                  path: "/api/v1",
                  pathType: "Prefix",
                  backend: {
                    service: {
                      name: "plan-checkin-api",
                      port: { name: "http" },
                    },
                  },
                },
                {
                  path: "/",
                  pathType: "Prefix",
                  backend: {
                    service: {
                      name: "plan-checkin-web",
                      port: { name: "http" },
                    },
                  },
                },
              ],
            },
          },
        ],
      },
    },
    {
      apiVersion: "autoscaling/v2",
      kind: "HorizontalPodAutoscaler",
      metadata: { namespace, name: "plan-checkin-api" },
      spec: {
        scaleTargetRef: {
          apiVersion: "apps/v1",
          kind: "Deployment",
          name: "plan-checkin-api",
        },
        minReplicas: profile.apiMinReplicas,
        maxReplicas: profile.apiMaxReplicas,
        metrics: [
          {
            type: "Resource",
            resource: {
              name: "cpu",
              target: { type: "Utilization", averageUtilization: 70 },
            },
          },
        ],
      },
    },
  ];
  return {
    namespace: namespaceObject,
    serviceAccounts,
    migration: job,
    app,
    jobName,
  };
}
