import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, readdir, writeFile } from "node:fs/promises";
import process from "node:process";

const root = "docs/atdd/web/evidence/WEB-07";
const names = [
  "fixed-create-chrome-390-v2",
  "weekly-create-edge-1280",
  "one-time-create-chrome-360",
  "fixed-empty-chrome-390",
  "lifecycle-chrome-390",
  "lifecycle-chrome-390-v2",
  "groups-chrome-390-v2",
  "archive-resume-chrome-390",
  "edit-chrome-390",
  "weekly-edit-edge-1280",
];
const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");
const readJson = async (path) => JSON.parse(await readFile(path, "utf8"));
const runs = [];
for (const name of names) {
  const base = `${root}/${name}`;
  const capture = await readJson(`${base}/capture.json`);
  const visual = await readJson(`${base}/visual-result.json`);
  const network = await readJson(`${base}/network.json`);
  const dom = await readFile(`${base}/dom.html`, "utf8");
  assert.equal(visual.horizontalOverflow, false, name);
  assert.equal(visual.controlsOutsideViewportWidth, 0, name);
  assert.equal(visual.documentWidth, visual.innerWidth, name);
  assert.equal(
    network.some((entry) => entry.status >= 500),
    false,
    name,
  );
  if (name === "weekly-edit-edge-1280") {
    assert.match(capture.observedPathname, /^\/plans\/[a-f\d-]{36}$/);
    assert.ok(
      network.some(
        (entry) =>
          entry.method === "PATCH" &&
          entry.path === `/api/v1${capture.observedPathname}` &&
          entry.status === 200,
      ),
    );
    assert.match(dom, /data-rule-version="2"/);
    assert.ok(
      (await readFile(`${base}/screen-weekly-edit-form.png`)).length > 1000,
    );
  } else if (name === "edit-chrome-390") {
    assert.match(capture.observedPathname, /^\/plans\/[a-f\d-]{36}$/);
    const planPath = `/api/v1${capture.observedPathname}`;
    assert.ok(
      network.some(
        (entry) =>
          entry.method === "PATCH" &&
          entry.path === planPath &&
          entry.status === 200,
      ),
    );
    assert.ok(
      network.some(
        (entry) =>
          entry.method === "PATCH" &&
          entry.path === `${planPath}/numeric-config` &&
          entry.status === 200,
      ),
    );
    assert.match(dom, /data-rule-version="2"/);
    assert.match(dom, /data-numeric-version="2"/);
    for (const label of ["edit-rule-form", "rule-v2", "numeric-form"]) {
      assert.ok((await readFile(`${base}/screen-${label}.png`)).length > 1000);
    }
  } else if (name === "archive-resume-chrome-390") {
    assert.match(capture.observedPathname, /^\/plans\/[a-f\d-]{36}$/);
    const planPath = `/api/v1${capture.observedPathname}`;
    for (const action of ["archive", "resume"]) {
      assert.ok(
        network.some(
          (entry) =>
            entry.method === "POST" &&
            entry.path === `${planPath}/${action}` &&
            entry.status === 201,
        ),
      );
    }
    assert.match(dom, /进行中/);
    assert.ok((await readFile(`${base}/screen-archived.png`)).length > 1000);
  } else if (name === "groups-chrome-390-v2") {
    assert.equal(capture.observedPathname, "/plans");
    for (const [method, path, status, count] of [
      ["POST", "/api/v1/plans", 201, 2],
      ["POST", "/api/v1/groups", 201, 1],
      ["PATCH", "/api/v1/plans/", 200, 2],
      ["PATCH", "/api/v1/groups/", 200, 1],
      ["DELETE", "/api/v1/groups/", 200, 1],
    ]) {
      assert.equal(
        network.filter(
          (entry) =>
            entry.method === method &&
            entry.path.startsWith(path) &&
            entry.status === status,
        ).length,
        count,
      );
    }
    assert.equal(
      (dom.match(/class="today-card"[^>]*data-group-id="none"/g) ?? []).length,
      2,
    );
    assert.doesNotMatch(dom, /class="group-row"/);
    for (const label of [
      "group-created",
      "two-moved",
      "renamed",
      "delete-group-confirm",
    ]) {
      assert.ok((await readFile(`${base}/screen-${label}.png`)).length > 1000);
    }
  } else if (name.startsWith("lifecycle-chrome-390")) {
    assert.equal(capture.observedPathname, "/plans");
    assert.ok(
      network.some(
        (entry) =>
          entry.method === "POST" &&
          entry.path === "/api/v1/plans" &&
          entry.status === 201,
      ),
    );
    const planPath = network.find(
      (entry) =>
        entry.method === "GET" &&
        /^\/api\/v1\/plans\/[a-f\d-]{36}$/.test(entry.path),
    )?.path;
    assert.ok(planPath);
    for (const action of ["pause", "resume", "archive"]) {
      assert.ok(
        network.some(
          (entry) =>
            entry.method === "POST" &&
            entry.path === `${planPath}/${action}` &&
            entry.status === 201,
        ),
      );
    }
    assert.ok(
      network.some(
        (entry) =>
          entry.method === "DELETE" &&
          entry.path === planPath &&
          entry.status === 200,
      ),
    );
    assert.match(dom, /还没有计划/);
    for (const label of [
      "pause-confirm",
      "paused",
      "resumed",
      "archived",
      "delete-confirm",
    ]) {
      assert.ok((await readFile(`${base}/screen-${label}.png`)).length > 1000);
    }
  } else if (name === "fixed-empty-chrome-390") {
    assert.equal(capture.observedPathname, "/plans/new");
    assert.match(dom, /至少选择一个星期/);
    assert.match(dom, /id="plan-weekdays"[^>]*aria-invalid="true"/);
    assert.equal(
      network.some(
        (entry) => entry.method === "POST" && entry.path === "/api/v1/plans",
      ),
      false,
    );
  } else {
    assert.match(capture.observedPathname, /^\/plans\/[a-f\d-]{36}$/);
    assert.ok(
      network.some(
        (entry) =>
          entry.method === "POST" &&
          entry.path === "/api/v1/plans" &&
          entry.status === 201,
      ),
    );
    assert.ok(
      network.some(
        (entry) =>
          entry.method === "GET" &&
          entry.path === `/api/v1${capture.observedPathname}` &&
          entry.status === 200,
      ),
    );
  }
  const files = [];
  for (const file of (await readdir(base)).sort()) {
    const path = `${base}/${file}`;
    const bytes = await readFile(path);
    assert.ok(bytes.length > 0, path);
    if (/\.(?:json|jsonl|html)$/.test(file)) {
      const text = bytes.toString("utf8");
      assert.doesNotMatch(text, /139000012(?:49|50|52|53|54|56|57|58|59)/);
      assert.doesNotMatch(text, /__Host-plan-refresh=/);
      assert.doesNotMatch(text, /id="sms-code"[^>]*value="\d{6}"/);
    }
    files.push({ path, bytes: bytes.length, sha256: sha256(bytes) });
  }
  runs.push({
    name,
    browser: capture.browser,
    viewport: capture.observedViewport,
    observedPathname: capture.observedPathname,
    files,
  });
}
const database = [];
for (const file of [
  "fixed-create-db.txt",
  "weekly-create-db.txt",
  "one-time-create-db.txt",
  "lifecycle-db.txt",
  "lifecycle-v2-db.txt",
  "groups-db.txt",
  "archive-resume-db.txt",
  "edit-db.txt",
  "weekly-edit-db.txt",
]) {
  const path = `${root}/${file}`;
  const bytes = await readFile(path);
  assert.ok(bytes.length > 0);
  if (file.startsWith("lifecycle") && file.endsWith("db.txt")) {
    assert.match(
      bytes.toString("utf8"),
      /deleted\|5\|pause,resume,archive,delete\|pending/,
    );
  }
  if (file === "groups-db.txt") assert.match(bytes.toString("utf8"), /2\|2\|0/);
  if (file === "archive-resume-db.txt")
    assert.match(bytes.toString("utf8"), /active\|3\|archive,resume/);
  if (file === "edit-db.txt") {
    const text = bytes.toString("utf8");
    assert.match(text, /rule\|1\|2026-09-29\|1,3,5/);
    assert.match(text, /rule\|2\|2026-09-30\|1,2,5/);
    assert.match(text, /numeric\|1\|2026-09-29\|距离\|公里/);
    assert.match(text, /numeric\|2\|2026-09-30\|用时\|分钟/);
  }
  if (file === "weekly-edit-db.txt") {
    const text = bytes.toString("utf8");
    assert.match(text, /plan\|weekly\|avoid\|2\|2/);
    assert.match(text, /rule\|1\|2026-09-29\|7/);
    assert.match(text, /rule\|2\|2026-09-30\|1/);
  }
  database.push({ path, bytes: bytes.length, sha256: sha256(bytes) });
}
const servicePath = `${root}/archive-resume-service.txt`;
const serviceBytes = await readFile(servicePath);
assert.match(serviceBytes.toString("utf8"), /Plans smoke passed/);
const result = {
  taskId: "WEB-07",
  status: "IN_PROGRESS",
  generatedAt: new Date().toISOString(),
  businessCasePassCount: 0,
  browserRuns: runs,
  database,
  service: {
    path: servicePath,
    bytes: serviceBytes.length,
    sha256: sha256(serviceBytes),
  },
};
await writeFile(`${root}/checks.json`, `${JSON.stringify(result, null, 2)}\n`);
process.stdout.write(
  `WEB-07 evidence OK: ${runs.length} browser runs, ${database.length} DB aggregates`,
);
