import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import process from "node:process";

const frozenNowUtc = "2026-09-28T13:00:00Z";
const canonicalFrozenNow = new Date(frozenNowUtc).toISOString();
const environment = {
  ...process.env,
  WEB_ATDD_FROZEN_NOW: frozenNowUtc,
  WEB_ATDD_DATABASE_URL: "postgres://ignored@127.0.0.1/web_atdd_clock",
  APP_ENV: "development",
  SMS_PROVIDER: "stub",
};
const server = spawnSync(
  process.execPath,
  [
    "--import",
    "./scripts/web-atdd-clock.mjs",
    "-e",
    "process.stdout.write(new Date().toISOString()+'|'+Date.now())",
  ],
  { cwd: resolve("."), env: environment, encoding: "utf8" },
);
assert.equal(server.status, 0, server.stderr);
assert.equal(
  server.stdout,
  `${canonicalFrozenNow}|${Date.parse(frozenNowUtc)}`,
);
const forbidden = spawnSync(
  process.execPath,
  ["--import", "./scripts/web-atdd-clock.mjs", "-e", "0"],
  {
    cwd: resolve("."),
    env: { ...environment, APP_ENV: "production" },
    encoding: "utf8",
  },
);
assert.notEqual(forbidden.status, 0);
assert.match(forbidden.stderr, /isolated loopback Web ATDD/);
const output = "docs/atdd/web/evidence/WEB-02/browser-clock-selftest";
const html = `<meta name="viewport" content="width=device-width, initial-scale=1"><p id="clock">Clock probe</p>`;
const url = `data:text/html,${encodeURIComponent(html)}`;
const browser = spawnSync(
  process.execPath,
  [
    "scripts/web-browser-capture.mjs",
    "--url",
    url,
    "--out",
    output,
    "--browser",
    "chrome",
    "--width",
    "390",
    "--height",
    "844",
    "--frozen-now",
    frozenNowUtc,
    "--timezone",
    "America/Los_Angeles",
  ],
  { cwd: resolve("."), encoding: "utf8", maxBuffer: 1024 * 1024 },
);
assert.equal(browser.status, 0, browser.stderr);
const timeline = JSON.parse(
  await readFile(resolve(output, "timeline.json"), "utf8"),
);
const capture = JSON.parse(
  await readFile(resolve(output, "capture.json"), "utf8"),
);
assert.equal(timeline.observedPageNow, canonicalFrozenNow);
assert.equal(capture.browserTimezone, "America/Los_Angeles");
const files = {};
for (const filename of capture.files) {
  const bytes = await readFile(resolve(output, filename));
  files[filename] = createHash("sha256").update(bytes).digest("hex");
}
const summary = {
  kind: "synthetic-clock-probe",
  frozenNowUtc,
  serverDate: server.stdout,
  browser: capture.browser,
  observedPageNow: timeline.observedPageNow,
  browserTimezone: capture.browserTimezone,
  rejectedProductionClock: forbidden.status !== 0,
  files,
};
await writeFile(
  "docs/atdd/web/evidence/WEB-02/clock-selftest.json",
  `${JSON.stringify(summary, null, 2)}\n`,
);
process.stdout.write(
  `${JSON.stringify({
    frozenNowUtc,
    serverDate: server.stdout,
    browser: capture.browser,
    observedPageNow: timeline.observedPageNow,
    timezone: capture.browserTimezone,
    fileCount: Object.keys(files).length,
    rejectedProductionClock: true,
  })}\n`,
);
