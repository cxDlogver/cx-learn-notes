import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, readdir, writeFile } from "node:fs/promises";
import process from "node:process";

const root = "docs/atdd/web/evidence/WEB-11";
const runs = [
  {
    name: "calendar-chrome-390-v3",
    width: 390,
    images: ["calendar-month", "calendar-day", "calendar-previous-month"],
    calendar: true,
  },
  {
    name: "statistics-chrome-390-v2",
    width: 390,
    images: ["statistics-before", "statistics-after", "calendar-recorded"],
    fixed: true,
  },
  {
    name: "statistics-edge-1280",
    width: 1280,
    images: ["statistics-before", "statistics-after", "calendar-recorded"],
    fixed: true,
  },
  {
    name: "weekly-chrome-390-v2",
    width: 390,
    images: ["weekly-statistics", "weekly-calendar"],
    weekly: true,
  },
  {
    name: "one-time-chrome-390",
    width: 390,
    images: ["one-time-statistics-before", "one-time-statistics-after"],
    oneTime: true,
  },
  {
    name: "timezone-honolulu-390",
    width: 390,
    images: ["calendar-month", "calendar-day"],
    timezone: "Pacific/Honolulu",
  },
  {
    name: "timezone-shanghai-390",
    width: 390,
    images: ["timezone-shanghai-day"],
    timezone: "Asia/Shanghai",
  },
];
const sha256 = (buffer) => createHash("sha256").update(buffer).digest("hex");
const json = async (path) => JSON.parse(await readFile(path, "utf8"));
const files = [];
const results = [];
for (const run of runs) {
  const base = `${root}/${run.name}`;
  const [capture, visual, network, dom] = await Promise.all([
    json(`${base}/capture.json`),
    json(`${base}/visual-result.json`),
    json(`${base}/network.json`),
    readFile(`${base}/dom.html`, "utf8"),
  ]);
  assert.equal(capture.observedViewport.width, run.width, run.name);
  assert.equal(visual.innerWidth, run.width, run.name);
  assert.equal(visual.horizontalOverflow, false, run.name);
  assert.equal(visual.controlsOutsideViewportWidth, 0, run.name);
  assert.ok(visual.documentWidth <= visual.innerWidth, run.name);
  assert.equal(
    network.some(
      (entry) =>
        entry.status >= 400 && entry.path !== "/api/v1/auth/web/session",
    ),
    false,
    `${run.name}: unexpected HTTP error`,
  );
  const statisticsGets = network.filter(
    (entry) =>
      entry.method === "GET" &&
      /\/api\/v1\/plans\/[a-f\d-]{36}\/statistics$/.test(entry.path) &&
      entry.status === 200,
  );
  const calendarGets = network.filter(
    (entry) =>
      entry.method === "GET" &&
      entry.path === "/api/v1/calendar" &&
      entry.status === 200,
  );
  if (run.calendar) {
    assert.ok(calendarGets.length >= 2, run.name);
    assert.ok(
      network.some(
        (entry) =>
          entry.path === "/api/v1/calendar/2026-09-27" && entry.status === 200,
      ),
    );
    assert.match(dom, /2026年8月/);
  }
  if (run.fixed) {
    assert.ok(statisticsGets.length >= 2, run.name);
    assert.ok(
      network.some(
        (entry) =>
          entry.method === "PUT" &&
          /\/checkins\/2026-09-28$/.test(entry.path) &&
          entry.status === 200,
      ),
    );
    assert.ok(
      network.some(
        (entry) =>
          entry.path === "/api/v1/calendar/2026-09-28" && entry.status === 200,
      ),
    );
    assert.match(dom, /每日散步日历/);
  }
  if (run.weekly) {
    assert.ok(statisticsGets.length >= 1 && calendarGets.length >= 1, run.name);
    assert.match(dom, /部分周不参与统计/);
    assert.match(dom, /本周进行中，暂不计入达标统计/);
  }
  if (run.oneTime) {
    assert.ok(statisticsGets.length >= 2, run.name);
    assert.ok(
      network.some(
        (entry) =>
          entry.method === "POST" &&
          /\/one-time-resolution$/.test(entry.path) &&
          entry.status === 201,
      ),
    );
    assert.match(dom, /按时完成/);
  }
  if (run.timezone) {
    assert.equal(capture.browserTimezone, run.timezone, run.name);
    assert.ok(
      network.some(
        (entry) =>
          entry.method === "GET" &&
          entry.path === "/api/v1/calendar/2026-09-29" &&
          entry.status === 200,
      ),
      run.name,
    );
    assert.match(dom, /2026-09-29 的计划/);
    assert.match(dom, /每日散步日历/);
    assert.match(dom, /Asia\/Shanghai/);
  }
  for (const label of run.images)
    assert.ok(
      (await readFile(`${base}/screen-${label}.png`)).length > 1000,
      `${run.name}: ${label}`,
    );
  for (const filename of (await readdir(base)).sort()) {
    const path = `${base}/${filename}`;
    files.push({ path, sha256: sha256(await readFile(path)) });
  }
  results.push({
    run: run.name,
    browser: capture.browser,
    viewport: capture.observedViewport,
    statisticsGet200: statisticsGets.length,
    calendarGet200: calendarGets.length,
    horizontalOverflow: visual.horizontalOverflow,
  });
}
const db = (await readFile(`${root}/db-statistics.txt`, "utf8")).trim();
assert.match(db, /web_atdd_stats_1312\|fixed\|2026-09-27\|1\|1\|2026-09-28/);
assert.match(db, /web_atdd_stats_1313\|fixed\|2026-09-27\|1\|1\|2026-09-28/);
assert.match(db, /web_atdd_weekly_stats_1316\|weekly\|2026-09-23\|0\|0/);
assert.match(
  db,
  /web_atdd_one_time_stats_1315\|one_time\|2026-09-29\|0\|0\|\|completed\|2026-09-29/,
);
files.push({
  path: `${root}/db-statistics.txt`,
  sha256: sha256(await readFile(`${root}/db-statistics.txt`)),
});
const timezoneDb = (await readFile(`${root}/db-timezone.txt`, "utf8")).trim();
assert.equal(timezoneDb, "web_atdd_timezone_1317|Asia/Shanghai|2026-09-27");
files.push({
  path: `${root}/db-timezone.txt`,
  sha256: sha256(await readFile(`${root}/db-timezone.txt`)),
});
const report = {
  generatedAt: new Date().toISOString(),
  status: "INCREMENTAL_PASS",
  formalBusinessCasePassCount: 0,
  runs: results,
  files,
};
await writeFile(`${root}/checks.json`, `${JSON.stringify(report, null, 2)}\n`);
process.stdout.write(
  `WEB-11 incremental evidence OK: ${runs.length} runs, ${files.length} hashed files; formal cases not signed`,
);
