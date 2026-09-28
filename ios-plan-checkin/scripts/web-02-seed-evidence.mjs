import { Buffer } from "node:buffer";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import process from "node:process";

const folder = resolve("docs/atdd/web/evidence/WEB-02");
const checks = [
  [
    "fixture-selftest",
    "powershell",
    [
      "-NoProfile",
      "-ExecutionPolicy",
      "Bypass",
      "-File",
      "scripts/run-web-atdd-fixture-smoke.ps1",
    ],
  ],
  ["clock-run", "node", ["scripts/web-atdd-clock-selftest.mjs"]],
  [
    "seed-lint",
    "node",
    [
      "node_modules/eslint/bin/eslint.js",
      "scripts/web-atdd-fixture.mjs",
      "scripts/web-atdd-fixture-session-smoke.mjs",
      "scripts/web-atdd-clock.mjs",
      "scripts/web-atdd-clock-selftest.mjs",
      "scripts/web-browser-capture.mjs",
      "scripts/web-02-seed-evidence.mjs",
    ],
  ],
  [
    "seed-format",
    "node",
    [
      "node_modules/prettier/bin/prettier.cjs",
      "--check",
      "scripts/web-atdd-fixture.mjs",
      "scripts/web-atdd-fixture-session-smoke.mjs",
      "scripts/web-atdd-clock.mjs",
      "scripts/web-atdd-clock-selftest.mjs",
      "scripts/web-browser-capture.mjs",
      "scripts/web-02-seed-evidence.mjs",
      "docs/atdd/web/WEB-02-证据工具进展.md",
      "docs/任务执行计划-计划打卡-Web-v1.md",
      "docs/atdd/web/execution-progress.json",
    ],
  ],
  ["seed-ledger", "python", ["docs/atdd/web/check_execution_progress.py"]],
];
const manifest = {
  taskId: "WEB-02",
  increment: "isolated-fixture-and-clock",
  generatedAt: new Date().toISOString(),
  checks: [],
  browserAcceptance: "NOT_RUN",
};
let failed = false;
for (const [name, program, argv] of checks) {
  const result = spawnSync(
    program === "node" ? process.execPath : program,
    argv,
    {
      cwd: resolve("."),
      encoding: "utf8",
      maxBuffer: 4 * 1024 * 1024,
    },
  );
  const stdout = (result.stdout ?? "").replaceAll("\r\n", "\n");
  const stderr = (result.stderr ?? "").replaceAll("\r\n", "\n");
  const output = `command: ${program} ${argv.join(" ")}\nexitCode: ${result.status}\nstdout:\n${stdout}\nstderr:\n${stderr}`;
  const bytes = Buffer.from(output, "utf8");
  const path = `docs/atdd/web/evidence/WEB-02/${name}.txt`;
  await writeFile(resolve(path), bytes);
  manifest.checks.push({
    name,
    command: [program, ...argv],
    exitCode: result.status,
    path,
    bytes: bytes.length,
    sha256: createHash("sha256").update(bytes).digest("hex"),
  });
  if (result.status !== 0) failed = true;
  process.stdout.write(`${name}: ${result.status === 0 ? "PASS" : "FAIL"}\n`);
}
await writeFile(
  resolve(folder, "seed-checks.json"),
  `${JSON.stringify(manifest, null, 2)}\n`,
);
if (failed) process.exitCode = 1;
