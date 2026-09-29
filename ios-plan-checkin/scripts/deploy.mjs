import { spawnSync } from "node:child_process";
import process from "node:process";
import {
  buildManifests,
  loadProfile,
  secretKeys,
} from "../infra/deploy/manifest.mjs";

const value = (name) => {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] : undefined;
};
const environment = value("environment");
const context = value("context");
const mode = value("mode") ?? "deploy";
if (
  !environment ||
  !context ||
  !["deploy", "rollback", "render"].includes(mode)
)
  throw new Error(
    "Required: --environment development|staging|production --context KUBE_CONTEXT --mode deploy|rollback|render.",
  );
const profile = await loadProfile(environment);
const manifests = buildManifests(profile, {
  image: value("image") ?? "",
  webImage: value("web-image") ?? "",
  releaseId: value("release") ?? "",
  host: value("host") ?? "",
  tlsSecret: value("tls-secret") ?? "",
  objectOrigin: value("object-origin") ?? "",
});
const resources = (items) =>
  JSON.stringify({ apiVersion: "v1", kind: "List", items });
if (mode === "render") {
  process.stdout.write(
    resources([
      manifests.namespace,
      ...manifests.serviceAccounts,
      manifests.migration,
      ...manifests.app,
    ]) + "\n",
  );
  process.exit(0);
}
const base = ["--context", context, "--namespace", profile.namespace];
function kubectl(args, input) {
  const result = spawnSync("kubectl", [...base, ...args], {
    input,
    encoding: "utf8",
    maxBuffer: 2_000_000,
  });
  if (result.error || result.status !== 0)
    throw new Error(
      `kubectl ${args[0]} failed: ${result.error?.message ?? result.stderr.trim()}`,
    );
  return result.stdout;
}
kubectl(
  ["apply", "-f", "-"],
  resources([manifests.namespace, ...manifests.serviceAccounts]),
);
for (const component of ["api", "worker", "migration"]) {
  const raw = kubectl([
    "get",
    "secret",
    `plan-checkin-${component}`,
    "-o",
    "json",
  ]);
  const keys = Object.keys(JSON.parse(raw).data ?? {});
  const required =
    component === "migration" ? ["DATABASE_URL"] : secretKeys[component];
  for (const key of required)
    if (!keys.includes(key))
      throw new Error(
        `Missing ${component} secret key ${key}; workload was not changed.`,
      );
}
const tls = JSON.parse(
  kubectl(["get", "secret", value("tls-secret"), "-o", "json"]),
);
if (!tls.data?.["tls.crt"] || !tls.data?.["tls.key"])
  throw new Error("TLS secret is incomplete; workload was not changed.");
const nodes = JSON.parse(
  kubectl([
    "get",
    "nodes",
    "-l",
    `topology.kubernetes.io/region=${profile.region}`,
    "-o",
    "json",
  ]),
);
const zones = new Set(
  (nodes.items ?? [])
    .filter(
      (node) =>
        !node.spec?.unschedulable &&
        node.status?.conditions?.some(
          (condition) =>
            condition.type === "Ready" && condition.status === "True",
        ),
    )
    .map((node) => node.metadata?.labels?.["topology.kubernetes.io/zone"])
    .filter(Boolean),
);
if (profile.environment === "production" && zones.size < 2)
  throw new Error(
    "Production requires ready capacity across two zones; workload was not changed.",
  );
if (mode === "deploy") {
  kubectl(["apply", "-f", "-"], resources([manifests.migration]));
  kubectl([
    "wait",
    `job/${manifests.jobName}`,
    "--for=condition=complete",
    "--timeout=900s",
  ]);
}
const routing = manifests.app.filter((item) => item.kind === "Ingress");
const workloads = manifests.app.filter((item) => item.kind !== "Ingress");
kubectl(["apply", "-f", "-"], resources(workloads));
kubectl(["rollout", "status", "deployment/plan-checkin-api", "--timeout=600s"]);
kubectl([
  "rollout",
  "status",
  "deployment/plan-checkin-worker",
  "--timeout=600s",
]);
kubectl(["rollout", "status", "deployment/plan-checkin-web", "--timeout=600s"]);
kubectl(["apply", "-f", "-"], resources(routing));
process.stdout.write(
  `${environment} ${mode} complete for ${value("release")}.\n`,
);
