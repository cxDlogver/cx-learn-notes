import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFile, readdir, writeFile } from "node:fs/promises";
import process from "node:process";
import { URL } from "node:url";

const root = new URL("../", import.meta.url);
const manifestPath = new URL("docs/release-candidate.json", root);
const read = (path) => readFile(new URL(path, root));
const sha = (bytes) => createHash("sha256").update(bytes).digest("hex");
const rootFiles = [
  "package.json",
  "pnpm-lock.yaml",
  "apps/mobile/app.json",
  "apps/mobile/eas.json",
  "packages/contracts/openapi.json",
  "db/migrations/manifest.json",
  "docs/PRD-计划打卡-iOS-v1.md",
  "docs/技术方案-计划打卡-iOS-v1.md",
  "docs/UIUX-计划打卡-iOS-v1.md",
  "docs/ATDD-BDD-计划打卡-iOS-v1-验收矩阵.md",
  "docs/构建计划-计划打卡-iOS-v1.md",
  "docs/atdd/acceptance-cases.json",
  "docs/atdd/acceptance-result.schema.json",
  "docs/ui/component-map.json",
  "docs/ui/plan-checkin-page-map.json",
  "docs/ui/plan-checkin-visual-tree.json",
  "docs/ui/settings-semantic-extensions.json",
  "docs/ui/plan-checkin.pen",
  "infra/deploy/Dockerfile",
  "infra/deploy/manifest.mjs",
  "infra/observability/alerts.yml",
];
const migrationFiles = (await readdir(new URL("db/migrations/", root)))
  .filter((file) => file.endsWith(".sql"))
  .map((file) => `db/migrations/${file}`);
const designImages = (await readdir(new URL("docs/ui/", root)))
  .filter((file) => file.endsWith(".png"))
  .map((file) => `docs/ui/${file}`);
const paths = [...rootFiles, ...migrationFiles, ...designImages].sort();

async function hashes() {
  return Object.fromEntries(
    await Promise.all(paths.map(async (path) => [path, sha(await read(path))])),
  );
}

if (process.argv.includes("--check")) {
  const saved = JSON.parse(await readFile(manifestPath, "utf8"));
  const current = await hashes();
  assert.deepEqual(saved.artifactSha256, current);
  assert.equal(saved.releaseStatus, "SOURCE_FREEZE_NATIVE_PENDING");
  assert.equal(saved.acceptanceStatus, "NOT_RUN");
  process.stdout.write(
    `Candidate manifest check passed: ${paths.length} immutable artifacts.\n`,
  );
} else if (process.argv.includes("--write")) {
  const progress = JSON.parse(await read("docs/build-progress.json"));
  assert.equal(progress.tasks.length, 35);
  const sourceFreezeActive = progress.currentWork?.taskId === "OPS-06";
  const sourceFreezeRecorded =
    progress.currentWork === null &&
    progress.tasks.find((task) => task.id === "OPS-06")?.status === "BLOCKED" &&
    progress.tasks.find((task) => task.id === "OPS-06")?.staticPassed === true;
  assert.ok(sourceFreezeActive || sourceFreezeRecorded);
  for (const task of progress.tasks.filter((item) => item.id !== "OPS-06"))
    assert.ok(
      task.status === "DONE" ||
        (task.status === "BLOCKED" && task.staticPassed),
      `${task.id} has unfinished static work`,
    );
  const sourceCommit = execFileSync("git", ["rev-parse", "HEAD"], {
    encoding: "utf8",
    cwd: new URL("../", import.meta.url),
  }).trim();
  const version = JSON.parse(await read("apps/mobile/app.json")).expo.version;
  const openapi = JSON.parse(await read("packages/contracts/openapi.json"));
  const openApiOperations = Object.values(openapi.paths).reduce(
    (count, operations) =>
      count +
      Object.keys(operations).filter((key) =>
        ["get", "post", "put", "patch", "delete"].includes(key),
      ).length,
    0,
  );
  const designPageCount = JSON.parse(await read("docs/ui/component-map.json"))
    .screens.length;
  const blockers = progress.tasks
    .filter((task) => task.status === "BLOCKED")
    .map((task) => task.id);
  const result = {
    schemaVersion: "1.0",
    releaseStatus: "SOURCE_FREEZE_NATIVE_PENDING",
    acceptanceStatus: "NOT_RUN",
    sourceCommit,
    branch: progress.integrationBranch,
    appVersion: version,
    migrationVersion: JSON.parse(
      await read("db/migrations/manifest.json"),
    ).migrations.at(-1).file,
    openApiOperations,
    designPageCount,
    artifactSha256: await hashes(),
    taskSummary: {
      total: 35,
      done: progress.tasks.filter((task) => task.status === "DONE").length,
      staticPassedEnvironmentBlocked: blockers.length,
      environmentBlockedTaskIds: blockers,
    },
    nativeIosRelease: { status: "PENDING", artifactSha256: null },
    apiWorkerImage: { status: "PENDING", digest: null },
    deploymentAndRecovery: { status: "PENDING", environment: null },
    formalAtdd: { status: "NOT_RUN", evidencePackage: null },
  };
  await writeFile(manifestPath, JSON.stringify(result, null, 2) + "\n", "utf8");
  process.stdout.write(
    `Candidate source manifest written for ${paths.length} artifacts at ${sourceCommit}.\n`,
  );
} else {
  throw new Error(
    "Use --write to create the source manifest or --check to verify it.",
  );
}
