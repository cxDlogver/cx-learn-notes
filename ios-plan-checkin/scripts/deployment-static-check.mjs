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
const releaseId = "b".repeat(40);
for (const environment of ["development", "staging", "production"]) {
  const profile = await loadProfile(environment);
  const built = buildManifests(profile, {
    image,
    releaseId,
    host: `api.${environment}.example.cn`,
    tlsSecret: "plan-checkin-tls",
  });
  assert.equal(built.namespace.metadata.name, profile.namespace);
  assert.equal(
    built.migration.spec.template.spec.containers[0].command[1],
    "scripts/migrate.mjs",
  );
  const deployments = built.app.filter((item) => item.kind === "Deployment");
  assert.equal(deployments.length, 2);
  for (const deployment of deployments) {
    const component = deployment.metadata.labels.component;
    const pod = deployment.spec.template.spec;
    const main = pod.containers[0];
    assert.equal(main.image, image);
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
  assert.ok(built.app.some((item) => item.kind === "HorizontalPodAutoscaler"));
}
const production = await loadProfile("production");
assert.throws(
  () =>
    buildManifests(production, {
      image: "app:latest",
      releaseId,
      host: "api.example.cn",
      tlsSecret: "tls",
    }),
  /digest/,
);
const dockerfile = await readFile(
  new URL("../infra/deploy/Dockerfile", import.meta.url),
  "utf8",
);
assert.match(dockerfile, /--frozen-lockfile/);
assert.match(dockerfile, /USER node/);
process.stdout.write(
  "Deployment static check passed: three isolated environments, digest images, migration gate and secret references.\n",
);
