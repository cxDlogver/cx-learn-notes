import { spawnSync } from "node:child_process";
import { Buffer } from "node:buffer";
import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import process from "node:process";

const evidenceDir = resolve("docs/atdd/web/evidence/WEB-13");
await mkdir(evidenceDir, { recursive: true });
const source = [
  "apps/api/src/social/notification-jobs.ts",
  "apps/api/src/social/social.service.ts",
  "apps/api/src/social/inbox.service.ts",
  "apps/api/src/social/inbox.controller.ts",
  "apps/api/src/social/social.module.ts",
  "apps/api/src/records/records.service.ts",
  "packages/contracts/src/index.ts",
  "packages/contracts/src/routes.ts",
  "scripts/build-openapi.mjs",
  "scripts/web-inbox-smoke.mjs",
  "scripts/web-inbox-http-smoke.mjs",
  "scripts/web-13-evidence.mjs",
];
const checks = [
  [
    "contracts-typecheck",
    "node_modules/typescript/bin/tsc",
    ["--noEmit", "-p", "packages/contracts/tsconfig.json"],
  ],
  [
    "api-build",
    "node_modules/typescript/bin/tsc",
    ["-p", "apps/api/tsconfig.json"],
  ],
  ["openapi", "scripts/build-openapi.mjs", ["--check"]],
  ["compat", "scripts/check-contract-compat.mjs", []],
  ["social-smoke", "scripts/social-smoke.mjs", []],
  ["shares-smoke", "scripts/shares-smoke.mjs", []],
  ["social-notifications-smoke", "scripts/social-notifications-smoke.mjs", []],
  ["records-smoke", "scripts/records-smoke.mjs", []],
  ["web-inbox-smoke", "scripts/web-inbox-smoke.mjs", []],
  ["inbox-http", "scripts/run-web-inbox-http-smoke.ps1", []],
  ["security-static", "scripts/security-static.mjs", []],
  ["lint", "node_modules/eslint/bin/eslint.js", source],
  ["format", "node_modules/prettier/bin/prettier.cjs", ["--check", ...source]],
  ["progress-ledger", "docs/atdd/web/check_execution_progress.py", []],
];
const manifest = {
  task: "WEB-13",
  generatedAt: new Date().toISOString(),
  checks: [],
};
let failed = false;
for (const [name, executable, args] of checks) {
  const isPython = executable.endsWith(".py");
  const isPowerShell = executable.endsWith(".ps1");
  const program = isPython
    ? "python"
    : isPowerShell
      ? "powershell"
      : process.execPath;
  const argv = isPowerShell
    ? ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", executable, ...args]
    : [executable, ...args];
  const result = spawnSync(program, argv, {
    cwd: resolve("."),
    encoding: "utf8",
    maxBuffer: 8 * 1024 * 1024,
  });
  const stdout = (result.stdout ?? "").replaceAll("\r\n", "\n");
  const stderr = (result.stderr ?? "").replaceAll("\r\n", "\n");
  const output = `command: ${isPython ? "python" : isPowerShell ? "powershell" : "node"} ${argv.join(" ")}\nexitCode: ${result.status}\nstdout:\n${stdout}\nstderr:\n${stderr}`;
  const bytes = Buffer.from(output, "utf8");
  const path = `${name}.txt`;
  await writeFile(resolve(evidenceDir, path), bytes);
  manifest.checks.push({
    name,
    command: [
      isPython ? "python" : isPowerShell ? "powershell" : "node",
      ...argv,
    ],
    exitCode: result.status,
    evidencePath: `docs/atdd/web/evidence/WEB-13/${path}`,
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
