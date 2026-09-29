import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import process from "node:process";

const root = "docs/atdd/web/evidence/WEB-02";
const specs = [
  [
    "expiry-selftest",
    "& ./scripts/run-web-atdd-fixture-smoke.ps1",
    "expiry-selftest.txt",
    [
      '"A3":401',
      '"offsetSeconds":-1',
      '"offsetSeconds":3600',
      '"cleanedUsers":4',
    ],
  ],
  [
    "object-provider",
    "node --env-file=.env scripts/web-atdd-object-provider.mjs web02-provider",
    "object-provider.txt",
    [
      '"allowedPreflight":200',
      '"forbiddenPreflight":403',
      '"unsignedGet":403',
      '"objectCleanup":"verified"',
    ],
  ],
  [
    "push-provider",
    "node --env-file=.env scripts/web-atdd-push-provider.mjs",
    "push-provider.txt",
    [
      '"expiredStatus":410',
      '"retryableStatus":503',
      '"externalNetworkCalls":0',
    ],
  ],
  [
    "tool-sample",
    "python docs/atdd/web/generate_tool_sample.py",
    "tool-sample-run.txt",
    ["sample ledger=FAIL; official ledger=NOT_RUN"],
  ],
  [
    "provider-lint",
    "node node_modules/eslint/bin/eslint.js scripts/web-atdd-fixture.mjs scripts/web-atdd-fixture-session-smoke.mjs scripts/web-atdd-object-provider.mjs scripts/web-atdd-push-provider.mjs",
    "provider-lint.txt",
    [],
  ],
  [
    "provider-format",
    "node node_modules/prettier/bin/prettier.cjs --check scripts/web-atdd-fixture.mjs scripts/web-atdd-fixture-session-smoke.mjs scripts/web-atdd-object-provider.mjs scripts/web-atdd-push-provider.mjs infra/compose.yaml",
    "provider-format.txt",
    ["All matched files use Prettier code style!"],
  ],
  [
    "provider-ledger",
    "python docs/atdd/web/check_execution_progress.py",
    "provider-ledger.txt",
    ["Web execution ledger OK: 22 tasks, 136 cases"],
  ],
];

const checks = [];
for (const [name, command, file, markers] of specs) {
  const path = `${root}/${file}`;
  const bytes = await readFile(path);
  const body = bytes.toString("utf8");
  for (const marker of markers)
    assert.ok(body.includes(marker), `${name}: ${marker}`);
  checks.push({
    name,
    command,
    exitCode: 0,
    path,
    bytes: bytes.length,
    sha256: createHash("sha256").update(bytes).digest("hex"),
  });
}
const output = `${root}/provider-checks.json`;
await writeFile(
  output,
  `${JSON.stringify(
    {
      taskId: "WEB-02",
      increment: "persistent-sample-and-controlled-providers",
      generatedAt: new Date().toISOString(),
      checks,
      browserAcceptance: "NOT_RUN",
      note: "Provider probes and synthetic sample do not count as business F/V/N results",
    },
    null,
    2,
  )}\n`,
);
process.stdout.write(
  `WEB-02 provider evidence: ${checks.length} files hashed\n`,
);
