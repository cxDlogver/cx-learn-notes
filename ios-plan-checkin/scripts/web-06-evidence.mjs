import { createHash } from "node:crypto";
import { Buffer } from "node:buffer";
import { mkdir, writeFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import process from "node:process";

const evidenceDir = resolve("docs/atdd/web/evidence/WEB-06");
await mkdir(evidenceDir, { recursive: true });
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
  ["openapi", "scripts/build-openapi.mjs", ["--check"]],
  ["compat", "scripts/check-contract-compat.mjs", []],
  ["plans-smoke", "scripts/plans-smoke.mjs", []],
  ["plans-http", "scripts/run-web-plans-http-smoke.ps1", []],
  ["statistics", "--test", ["packages/domain/test/statistics.test.mjs"]],
  [
    "lint",
    "node_modules/eslint/bin/eslint.js",
    [
      "apps/api/src/plans/plans.service.ts",
      "apps/api/src/plans/plans.controller.ts",
      "packages/contracts/src/index.ts",
      "packages/contracts/src/routes.ts",
      "scripts/build-openapi.mjs",
      "scripts/plans-smoke.mjs",
      "scripts/web-plans-http-smoke.mjs",
      "packages/domain/test/statistics.test.mjs",
      "scripts/web-06-evidence.mjs",
    ],
  ],
  [
    "format",
    "node_modules/prettier/bin/prettier.cjs",
    [
      "--check",
      "apps/api/src/plans/plans.service.ts",
      "apps/api/src/plans/plans.controller.ts",
      "packages/contracts/src/index.ts",
      "packages/contracts/src/routes.ts",
      "scripts/build-openapi.mjs",
      "scripts/plans-smoke.mjs",
      "scripts/web-plans-http-smoke.mjs",
      "packages/domain/test/statistics.test.mjs",
      "scripts/web-06-evidence.mjs",
      "docs/任务执行计划-计划打卡-Web-v1.md",
      "docs/atdd/web/execution-progress.json",
    ],
  ],
  ["progress-ledger", "docs/atdd/web/check_execution_progress.py", []],
];
const manifest = {
  task: "WEB-06",
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
    maxBuffer: 4 * 1024 * 1024,
  });
  const output = `command: ${isPython ? "python" : isPowerShell ? "powershell" : "node"} ${argv.join(" ")}\nexitCode: ${result.status}\nstdout:\n${result.stdout ?? ""}\nstderr:\n${result.stderr ?? ""}`;
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
    evidencePath: `docs/atdd/web/evidence/WEB-06/${path}`,
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
