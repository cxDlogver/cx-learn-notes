import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import process from "node:process";
import { URL } from "node:url";
import {
  buildManifests,
  loadProfile,
  secretKeys,
} from "../infra/deploy/manifest.mjs";

const image = `registry.example.cn/plan-checkin/app@sha256:${"a".repeat(64)}`;
const webImage = `registry.example.cn/plan-checkin/web@sha256:${"c".repeat(64)}`;
const releaseId = "b".repeat(40);
for (const environment of ["development", "staging", "production"]) {
  const profile = await loadProfile(environment);
  const built = buildManifests(profile, {
    image,
    webImage,
    releaseId,
    host: `app.${environment}.example.cn`,
    tlsSecret: "plan-checkin-tls",
    objectOrigin: `https://objects.${environment}.example.cn`,
  });
  assert.equal(built.namespace.metadata.name, profile.namespace);
  assert.equal(
    built.migration.spec.template.spec.containers[0].command[1],
    "scripts/migrate.mjs",
  );
  const deployments = built.app.filter((item) => item.kind === "Deployment");
  assert.equal(deployments.length, 3);
  for (const deployment of deployments) {
    const component = deployment.metadata.labels.component;
    const pod = deployment.spec.template.spec;
    const main = pod.containers[0];
    assert.equal(main.image, component === "web" ? webImage : image);
    assert.equal(pod.automountServiceAccountToken, false);
    assert.equal(main.securityContext.readOnlyRootFilesystem, true);
    assert.equal(
      pod.nodeSelector["topology.kubernetes.io/region"],
      profile.region,
    );
    const injected = main.env
      .filter((entry) => entry.valueFrom)
      .map((entry) => entry.name);
    assert.deepEqual(injected, secretKeys[component]);
    if (component === "web") {
      assert.equal(main.command[1], "server.mjs");
      assert.equal(
        main.env.find((entry) => entry.name === "WEB_OBJECT_ORIGIN")?.value,
        `https://objects.${environment}.example.cn`,
      );
      assert.equal(main.readinessProbe.httpGet.path, "/healthz");
    }
    assert.ok(
      main.env.every(
        (entry) =>
          !entry.value || !/PASSWORD|SECRET|TOKEN|KEY/.test(entry.name),
      ),
    );
  }
  if (environment === "production") {
    assert.ok(
      deployments.every(
        (item) => item.spec.template.spec.topologySpreadConstraints.length > 0,
      ),
    );
    assert.equal(profile.apnsEnvironment, "production");
  }
  assert.ok(
    built.app.some((item) => item.kind === "Ingress" && item.spec.tls.length),
  );
  const ingress = built.app.find((item) => item.kind === "Ingress");
  assert.deepEqual(
    ingress.spec.rules[0].http.paths.map((item) => [
      item.path,
      item.backend.service.name,
    ]),
    [
      ["/api/v1", "plan-checkin-api"],
      ["/", "plan-checkin-web"],
    ],
  );
  assert.ok(
    built.app.some(
      (item) =>
        item.kind === "Service" && item.metadata.name === "plan-checkin-web",
    ),
  );
  assert.ok(built.app.some((item) => item.kind === "HorizontalPodAutoscaler"));
}
const production = await loadProfile("production");
assert.throws(
  () =>
    buildManifests(production, {
      image: "app:latest",
      webImage,
      releaseId,
      host: "api.example.cn",
      tlsSecret: "tls",
      objectOrigin: "https://objects.example.cn",
    }),
  /digest/,
);
const dockerfile = await readFile(
  new URL("../infra/deploy/Dockerfile", import.meta.url),
  "utf8",
);
assert.match(dockerfile, /--frozen-lockfile/);
assert.match(dockerfile, /USER node/);
const webDockerfile = await readFile(
  new URL("../infra/deploy/Web.Dockerfile", import.meta.url),
  "utf8",
);
assert.match(webDockerfile, /--frozen-lockfile/);
assert.match(webDockerfile, /USER node/);
assert.match(webDockerfile, /@plan-checkin\/web build/);
process.stdout.write(
  "Deployment static check passed: three isolated environments, Web/API routing, digest images, migration gate and secret references.\n",
);
