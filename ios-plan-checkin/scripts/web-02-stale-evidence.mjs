import { Buffer } from "node:buffer";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import process from "node:process";

const current = spawnSync("git", ["rev-parse", "HEAD"], {
  cwd: resolve("."),
  encoding: "utf8",
});
if (current.status !== 0)
  throw new Error("Cannot determine current Git commit");
const commit = current.stdout.trim();
const checks = [
  [
    "stale-tests",
    [
      "-m",
      "unittest",
      "discover",
      "-s",
      "docs/atdd/web",
      "-p",
      "test_*.py",
      "-v",
    ],
  ],
  [
    "stale-dry-run",
    [
      "docs/atdd/web/mark_stale.py",
      "--commit",
      commit,
      "--reason",
      "tool-selftest",
      "--dry-run",
    ],
  ],
  ["stale-ledger", ["docs/atdd/web/check_execution_progress.py"]],
];
const manifest = {
  taskId: "WEB-02",
  increment: "stale-propagation",
  generatedAt: new Date().toISOString(),
  checks: [],
  browserAcceptance: "NOT_RUN",
};
let failed = false;
for (const [name, args] of checks) {
  const result = spawnSync("python", args, {
    cwd: resolve("."),
    encoding: "utf8",
    maxBuffer: 1024 * 1024,
  });
  const stdout = (result.stdout ?? "").replaceAll("\r\n", "\n");
  const stderr = (result.stderr ?? "").replaceAll("\r\n", "\n");
  const bytes = Buffer.from(
    `command: python ${args.join(" ")}\nexitCode: ${result.status}\nstdout:\n${stdout}\nstderr:\n${stderr}`,
    "utf8",
  );
  const path = `docs/atdd/web/evidence/WEB-02/${name}.txt`;
  await writeFile(resolve(path), bytes);
  manifest.checks.push({
    name,
    command: ["python", ...args],
    exitCode: result.status,
    path,
    bytes: bytes.length,
    sha256: createHash("sha256").update(bytes).digest("hex"),
  });
  if (result.status !== 0) failed = true;
  process.stdout.write(`${name}: ${result.status === 0 ? "PASS" : "FAIL"}\n`);
}
await writeFile(
  "docs/atdd/web/evidence/WEB-02/stale-checks.json",
  `${JSON.stringify(manifest, null, 2)}\n`,
);
if (failed) process.exitCode = 1;
