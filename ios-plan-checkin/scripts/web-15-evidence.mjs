import { spawnSync } from "node:child_process";
import { Buffer } from "node:buffer";
import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import process from "node:process";

const evidenceDir = resolve("docs/atdd/web/evidence/WEB-15");
await mkdir(evidenceDir, { recursive: true });
const source = [
  "apps/api/src/auth/auth.service.ts",
  "apps/api/src/config.ts",
  "apps/api/src/social/notification-jobs.ts",
  "apps/api/src/social/notifications.controller.ts",
  "apps/api/src/social/notifications.service.ts",
  "apps/api/src/social/social.module.ts",
  "apps/worker/src/main.ts",
  "apps/worker/src/planReminders.ts",
  "apps/worker/src/queue.ts",
  "apps/worker/src/webNotifications.ts",
  "apps/worker/src/webPush.ts",
  "db/migrations/manifest.json",
  "docs/atdd/web/WEB-15-分端提醒与WebPush服务.md",
  "docs/atdd/web/execution-progress.json",
  "docs/任务执行计划-计划打卡-Web-v1.md",
  "infra/deploy/manifest.mjs",
  "packages/contracts/src/index.ts",
  "packages/contracts/src/routes.ts",
  "scripts/build-openapi.mjs",
  "scripts/migrations-smoke.mjs",
  "scripts/sql-static-check.mjs",
  "scripts/web-notifications-http-smoke.mjs",
  "scripts/web-notifications-smoke.mjs",
  "scripts/web-plan-reminders-smoke.mjs",
  "scripts/web-push-rfc-smoke.mjs",
  "scripts/web-15-evidence.mjs",
];
const checks = [
  [
    "contracts-typecheck",
    "node_modules/typescript/bin/tsc",
    ["--noEmit", "-p", "packages/contracts/tsconfig.json"],
  ],
  [
    "domain-build",
    "node_modules/typescript/bin/tsc",
    ["-p", "packages/domain/tsconfig.json"],
  ],
  [
    "api-build",
    "node_modules/typescript/bin/tsc",
    ["-p", "apps/api/tsconfig.json"],
  ],
  [
    "worker-build",
    "node_modules/typescript/bin/tsc",
    ["-p", "apps/worker/tsconfig.json"],
  ],
  ["openapi", "scripts/build-openapi.mjs", ["--check"]],
  ["compat", "scripts/check-contract-compat.mjs", []],
  ["sql-static", "scripts/sql-static-check.mjs", []],
  ["migrations", "scripts/migrations-smoke.mjs", []],
  ["web-migrations", "scripts/web-migrations-smoke.mjs", []],
  ["reminders", "scripts/reminders-smoke.mjs", []],
  ["social-notifications", "scripts/social-notifications-smoke.mjs", []],
  ["web-notifications", "scripts/web-notifications-smoke.mjs", []],
  ["web-plan-reminders", "scripts/web-plan-reminders-smoke.mjs", []],
  ["web-push-rfc", "scripts/web-push-rfc-smoke.mjs", []],
  ["web-http", "scripts/run-web-notifications-http-smoke.ps1", []],
  ["security-static", "scripts/security-static.mjs", []],
  ["deployment-static", "scripts/deployment-static-check.mjs", []],
  [
    "lint",
    "node_modules/eslint/bin/eslint.js",
    source.filter((path) => /\.(?:[cm]?js|ts)$/.test(path)),
  ],
  ["format", "node_modules/prettier/bin/prettier.cjs", ["--check", ...source]],
  ["progress-ledger", "docs/atdd/web/check_execution_progress.py", []],
];
const manifest = {
  task: "WEB-15",
  generatedAt: new Date().toISOString(),
  checks: [],
};
let failed = false;
for (const [name, executable, args] of checks) {
  const python = executable.endsWith(".py");
  const powershell = executable.endsWith(".ps1");
  const program = python
    ? "python"
    : powershell
      ? "powershell"
      : process.execPath;
  const argv = powershell
    ? ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", executable, ...args]
    : [executable, ...args];
  const result = spawnSync(program, argv, {
    cwd: resolve("."),
    encoding: "utf8",
    maxBuffer: 8 * 1024 * 1024,
  });
  const output = `command: ${python ? "python" : powershell ? "powershell" : "node"} ${argv.join(" ")}\nexitCode: ${result.status}\nstdout:\n${(result.stdout ?? "").replaceAll("\r\n", "\n")}\nstderr:\n${(result.stderr ?? "").replaceAll("\r\n", "\n")}`;
  const bytes = Buffer.from(output, "utf8");
  const path = `${name}.txt`;
  await writeFile(resolve(evidenceDir, path), bytes);
  manifest.checks.push({
    name,
    command: [python ? "python" : powershell ? "powershell" : "node", ...argv],
    exitCode: result.status,
    evidencePath: `docs/atdd/web/evidence/WEB-15/${path}`,
    sha256: createHash("sha256").update(bytes).digest("hex"),
  });
  if (result.status !== 0) failed = true;
  process.stdout.write(`${name}: ${result.status === 0 ? "PASS" : "FAIL"}\n`);
}
await writeFile(
  resolve(evidenceDir, "checks.json"),
  `${JSON.stringify(manifest, null, 2)}\n`,
);
if (failed) process.exitCode = 1;
