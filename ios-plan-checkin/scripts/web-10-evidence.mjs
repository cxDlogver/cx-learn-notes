import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, readdir, writeFile } from "node:fs/promises";
import process from "node:process";

const root = "docs/atdd/web/evidence/WEB-10";
const names = ["photo-checkin-chrome-390", "correction-edge-1280"];
const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");
const readJson = async (path) => JSON.parse(await readFile(path, "utf8"));
const runs = [];
for (const name of names) {
  const base = `${root}/${name}`;
  const [capture, visual, network, dom] = await Promise.all([
    readJson(`${base}/capture.json`),
    readJson(`${base}/visual-result.json`),
    readJson(`${base}/network.json`),
    readFile(`${base}/dom.html`, "utf8"),
  ]);
  assert.ok(["/", "/today"].includes(capture.observedPathname), name);
  assert.equal(visual.horizontalOverflow, false, name);
  assert.equal(visual.controlsOutsideViewportWidth, 0, name);
  assert.ok(visual.documentWidth <= visual.innerWidth, name);
  assert.match(dom, /记录和照片均已保存/, name);
  assert.match(dom, /已保存照片：[12] 张/, name);
  for (const [method, path, status] of [
    ["POST", "/api/v1/media/upload-intents", 201],
    ["OPTIONS", "[object-store]", 200],
    ["PUT", "[object-store]", 200],
  ]) {
    assert.ok(
      network.some(
        (entry) =>
          entry.method === method &&
          entry.path === path &&
          entry.status === status,
      ),
      `${name}: ${method} ${path}`,
    );
  }
  assert.ok(
    network.some(
      (entry) =>
        entry.method === "PUT" &&
        /^\/api\/v1\/plans\/[a-f\d-]{36}\/checkins\/2026-09-29$/.test(
          entry.path,
        ) &&
        entry.status === 200,
    ),
    `${name}: checkin PUT`,
  );
  assert.ok(
    network.some(
      (entry) =>
        entry.method === "POST" &&
        /^\/api\/v1\/media\/[a-f\d-]{36}\/complete$/.test(entry.path) &&
        entry.status === 201,
    ),
    `${name}: media complete`,
  );
  assert.equal(
    network.some(
      (entry) =>
        entry.status >= 400 && entry.path !== "/api/v1/auth/web/session",
    ),
    false,
    name,
  );
  if (name === "correction-edge-1280") {
    assert.ok(
      network.some(
        (entry) =>
          entry.method === "GET" &&
          /\/checkins\/2026-09-29$/.test(entry.path) &&
          entry.status === 200,
      ),
    );
    assert.match(dom, /未完成/);
    assert.match(dom, /已保存照片：2 张/);
    assert.doesNotMatch(dom, /checkin-green\.png/);
  }
  for (const label of name.startsWith("photo")
    ? ["checkin-ready", "checkin-saved"]
    : ["correction-ready", "correction-saved"]) {
    assert.ok((await readFile(`${base}/screen-${label}.png`)).length > 1000);
  }
  const files = [];
  for (const file of (await readdir(base)).sort()) {
    const bytes = await readFile(`${base}/${file}`);
    files.push({ path: `${base}/${file}`, sha256: sha256(bytes) });
  }
  runs.push({
    name,
    browser: capture.browser,
    viewport: capture.observedViewport,
    files,
  });
}
const record = (await readFile(`${root}/db-record.txt`, "utf8")).trim();
const revisions = (await readFile(`${root}/db-revisions.txt`, "utf8")).trim();
assert.match(
  record,
  /\|2026-09-29\|failure\|天气影响\|1\.200000\|公里\|2\|t\|2\|ready,ready$/,
);
assert.equal(revisions, "2|1|2");
const dbFiles = [];
for (const file of ["db-record.txt", "db-revisions.txt"]) {
  const path = `${root}/${file}`;
  dbFiles.push({ path, sha256: sha256(await readFile(path)) });
}
for (const name of [
  "one-time-complete-chrome-390-v2",
  "one-time-correct-edge-1280",
]) {
  const base = `${root}/${name}`;
  const [capture, visual, network, dom] = await Promise.all([
    readJson(`${base}/capture.json`),
    readJson(`${base}/visual-result.json`),
    readJson(`${base}/network.json`),
    readFile(`${base}/dom.html`, "utf8"),
  ]);
  assert.match(capture.observedPathname, /^\/plans\/[a-f\d-]{36}$/);
  assert.equal(visual.horizontalOverflow, false);
  assert.equal(visual.controlsOutsideViewportWidth, 0);
  assert.ok(visual.documentWidth <= visual.innerWidth);
  assert.match(dom, /已保存照片：1 张/);
  const completed = name.startsWith("one-time-complete");
  assert.ok(
    network.some(
      (entry) =>
        entry.path ===
          `/api/v1${capture.observedPathname}/one-time-resolution` &&
        entry.method === (completed ? "POST" : "PATCH") &&
        entry.status === (completed ? 201 : 200),
    ),
  );
  if (completed) {
    assert.match(dom, /一次性任务结果和照片均已保存/);
    for (const [method, path, status] of [
      ["OPTIONS", "[object-store]", 200],
      ["PUT", "[object-store]", 200],
    ])
      assert.ok(
        network.some(
          (entry) =>
            entry.method === method &&
            entry.path === path &&
            entry.status === status,
        ),
      );
    assert.ok(
      network.some(
        (entry) =>
          /\/media\/[a-f\d-]{36}\/complete$/.test(entry.path) &&
          entry.status === 201,
      ),
    );
  } else assert.match(dom, /当前结果：失败/);
  const files = [];
  for (const file of (await readdir(base)).sort()) {
    const path = `${base}/${file}`;
    files.push({ path, sha256: sha256(await readFile(path)) });
  }
  runs.push({
    name,
    browser: capture.browser,
    viewport: capture.observedViewport,
    files,
  });
}
const oneTimeResult = (
  await readFile(`${root}/db-one-time-result.txt`, "utf8")
).trim();
const oneTimeRevisions = (
  await readFile(`${root}/db-one-time-revisions.txt`, "utf8")
).trim();
assert.match(
  oneTimeResult,
  /\|failed\|2026-09-29\|需要返工\|12\.000000\|页\|2\|1\|ready$/,
);
assert.equal(oneTimeRevisions, "2|1|2");
for (const file of ["db-one-time-result.txt", "db-one-time-revisions.txt"]) {
  const path = `${root}/${file}`;
  dbFiles.push({ path, sha256: sha256(await readFile(path)) });
}
{
  const name = "backfill-chrome-390-v2";
  const base = `${root}/${name}`;
  const [capture, visual, network, dom] = await Promise.all([
    readJson(`${base}/capture.json`),
    readJson(`${base}/visual-result.json`),
    readJson(`${base}/network.json`),
    readFile(`${base}/dom.html`, "utf8"),
  ]);
  assert.match(capture.observedPathname, /^\/plans\/[a-f\d-]{36}$/);
  assert.equal(visual.horizontalOverflow, false);
  assert.equal(visual.controlsOutsideViewportWidth, 0);
  assert.ok(visual.documentWidth <= visual.innerWidth);
  assert.match(dom, /业务日期：2026-09-28/);
  assert.match(dom, /当天规则：V1/);
  assert.match(dom, /记录已保存/);
  const contextPath = `/api/v1${capture.observedPathname}/checkin-context/2026-09-28`;
  assert.ok(
    network.filter(
      (entry) =>
        entry.method === "GET" &&
        entry.path === contextPath &&
        entry.status === 200,
    ).length >= 2,
  );
  assert.ok(
    network.some(
      (entry) =>
        entry.method === "PUT" &&
        entry.path ===
          `/api/v1${capture.observedPathname}/checkins/2026-09-28` &&
        entry.status === 200,
    ),
  );
  const files = [];
  for (const file of (await readdir(base)).sort()) {
    const path = `${base}/${file}`;
    files.push({ path, sha256: sha256(await readFile(path)) });
  }
  runs.push({
    name,
    browser: capture.browser,
    viewport: capture.observedViewport,
    files,
  });
}
const backfill = (await readFile(`${root}/db-backfill.txt`, "utf8")).trim();
assert.match(backfill, /\|2026-09-28\|success\|3\.400000\|公里\|t\|f\|1\|1$/);
dbFiles.push({
  path: `${root}/db-backfill.txt`,
  sha256: sha256(await readFile(`${root}/db-backfill.txt`)),
});
{
  const name = "not-due-chrome-390";
  const base = `${root}/${name}`;
  const [capture, visual, network, dom] = await Promise.all([
    readJson(`${base}/capture.json`),
    readJson(`${base}/visual-result.json`),
    readJson(`${base}/network.json`),
    readFile(`${base}/dom.html`, "utf8"),
  ]);
  assert.match(capture.observedPathname, /^\/plans\/[a-f\d-]{36}$/);
  assert.equal(visual.horizontalOverflow, false);
  assert.equal(visual.controlsOutsideViewportWidth, 0);
  assert.ok(visual.documentWidth <= visual.innerWidth);
  assert.match(dom, /这一天不在可补记范围/);
  assert.doesNotMatch(dom, /class="today-checkin"/);
  assert.ok(
    network.some(
      (entry) =>
        entry.path ===
          `/api/v1${capture.observedPathname}/checkin-context/2026-09-29` &&
        entry.method === "GET" &&
        entry.status === 200,
    ),
  );
  assert.equal(
    network.some(
      (entry) => entry.method === "PUT" && entry.path.includes("/checkins/"),
    ),
    false,
  );
  const files = [];
  for (const file of (await readdir(base)).sort()) {
    const path = `${base}/${file}`;
    files.push({ path, sha256: sha256(await readFile(path)) });
  }
  runs.push({
    name,
    browser: capture.browser,
    viewport: capture.observedViewport,
    files,
  });
}
assert.equal((await readFile(`${root}/db-not-due.txt`, "utf8")).trim(), "0");
dbFiles.push({
  path: `${root}/db-not-due.txt`,
  sha256: sha256(await readFile(`${root}/db-not-due.txt`)),
});
{
  const name = "weekly-backfill-edge-1280";
  const base = `${root}/${name}`;
  const [capture, visual, network, dom] = await Promise.all([
    readJson(`${base}/capture.json`),
    readJson(`${base}/visual-result.json`),
    readJson(`${base}/network.json`),
    readFile(`${base}/dom.html`, "utf8"),
  ]);
  assert.match(capture.observedPathname, /^\/plans\/[a-f\d-]{36}$/);
  assert.equal(visual.horizontalOverflow, false);
  assert.equal(visual.controlsOutsideViewportWidth, 0);
  assert.ok(visual.documentWidth <= visual.innerWidth);
  assert.match(dom, /业务日期：2026-09-28/);
  assert.match(dom, /当天规则：V1/);
  assert.match(dom, /记录已保存/);
  assert.ok(
    network.some(
      (entry) =>
        entry.method === "GET" &&
        entry.path ===
          `/api/v1${capture.observedPathname}/checkin-context/2026-09-28` &&
        entry.status === 200,
    ),
  );
  assert.ok(
    network.some(
      (entry) =>
        entry.method === "PUT" &&
        entry.path ===
          `/api/v1${capture.observedPathname}/checkins/2026-09-28` &&
        entry.status === 200,
    ),
  );
  const files = [];
  for (const file of (await readdir(base)).sort()) {
    const path = `${base}/${file}`;
    files.push({ path, sha256: sha256(await readFile(path)) });
  }
  runs.push({
    name,
    browser: capture.browser,
    viewport: capture.observedViewport,
    files,
  });
}
const weeklyBackfill = (
  await readFile(`${root}/db-weekly-backfill.txt`, "utf8")
).trim();
assert.match(weeklyBackfill, /^weekly\|.*\|2026-09-28\|success\|t\|1$/);
dbFiles.push({
  path: `${root}/db-weekly-backfill.txt`,
  sha256: sha256(await readFile(`${root}/db-weekly-backfill.txt`)),
});
{
  const name = "one-time-cancel-chrome-360";
  const base = `${root}/${name}`;
  const [capture, visual, network, dom] = await Promise.all([
    readJson(`${base}/capture.json`),
    readJson(`${base}/visual-result.json`),
    readJson(`${base}/network.json`),
    readFile(`${base}/dom.html`, "utf8"),
  ]);
  assert.match(capture.observedPathname, /^\/plans\/[a-f\d-]{36}$/);
  assert.equal(visual.horizontalOverflow, false);
  assert.equal(visual.controlsOutsideViewportWidth, 0);
  assert.ok(visual.documentWidth <= visual.innerWidth);
  assert.match(dom, /当前结果：取消/);
  assert.ok(
    network.some(
      (entry) =>
        entry.method === "POST" &&
        entry.path ===
          `/api/v1${capture.observedPathname}/one-time-resolution` &&
        entry.status === 201,
    ),
  );
  const files = [];
  for (const file of (await readdir(base)).sort()) {
    const path = `${base}/${file}`;
    files.push({ path, sha256: sha256(await readFile(path)) });
  }
  runs.push({
    name,
    browser: capture.browser,
    viewport: capture.observedViewport,
    files,
  });
}
assert.equal(
  (await readFile(`${root}/db-one-time-cancel.txt`, "utf8")).trim(),
  "cancelled|主动取消|1|1",
);
dbFiles.push({
  path: `${root}/db-one-time-cancel.txt`,
  sha256: sha256(await readFile(`${root}/db-one-time-cancel.txt`)),
});
for (const name of [
  "one-time-late-create-chrome-390",
  "one-time-late-complete-edge-1280-v2",
]) {
  const base = `${root}/${name}`;
  const [capture, visual, network, dom] = await Promise.all([
    readJson(`${base}/capture.json`),
    readJson(`${base}/visual-result.json`),
    readJson(`${base}/network.json`),
    readFile(`${base}/dom.html`, "utf8"),
  ]);
  assert.match(capture.observedPathname, /^\/plans\/[a-f\d-]{36}$/);
  assert.equal(visual.horizontalOverflow, false);
  assert.equal(visual.controlsOutsideViewportWidth, 0);
  assert.ok(visual.documentWidth <= visual.innerWidth);
  const completion = name.includes("complete");
  if (completion) {
    assert.match(dom, /当前结果：完成 · 2026-09-29 · 逾期完成/);
    assert.ok(
      network.some(
        (entry) =>
          entry.method === "POST" &&
          entry.path ===
            `/api/v1${capture.observedPathname}/one-time-resolution` &&
          entry.status === 201,
      ),
    );
  } else {
    assert.match(dom, /截止日期<\/dt><dd>2026-09-29/);
    assert.equal(
      network.some((entry) => entry.path.endsWith("/one-time-resolution")),
      false,
    );
  }
  const files = [];
  for (const file of (await readdir(base)).sort()) {
    const path = `${base}/${file}`;
    files.push({ path, sha256: sha256(await readFile(path)) });
  }
  runs.push({
    name,
    browser: capture.browser,
    viewport: capture.observedViewport,
    files,
  });
}
assert.equal(
  (await readFile(`${root}/db-late-fixture.txt`, "utf8")).trim(),
  "1",
);
assert.equal(
  (await readFile(`${root}/db-one-time-late.txt`, "utf8")).trim(),
  "2026-09-28|2026-09-28|completed|2026-09-29|次日完成|1",
);
for (const file of ["db-late-fixture.txt", "db-one-time-late.txt"]) {
  const path = `${root}/${file}`;
  dbFiles.push({ path, sha256: sha256(await readFile(path)) });
}
{
  const name = "retry-chrome-390";
  const base = `${root}/${name}`;
  const [capture, visual, network, trace, dom] = await Promise.all([
    readJson(`${base}/capture.json`),
    readJson(`${base}/visual-result.json`),
    readJson(`${base}/network.json`),
    readJson(`${base}/action-trace.json`),
    readFile(`${base}/dom.html`, "utf8"),
  ]);
  assert.ok(["/", "/today"].includes(capture.observedPathname));
  assert.equal(visual.horizontalOverflow, false);
  assert.equal(visual.controlsOutsideViewportWidth, 0);
  assert.ok(visual.documentWidth <= visual.innerWidth);
  assert.match(dom, /记录已保存/);
  assert.ok(trace.some((entry) => entry.action === "network-offline"));
  assert.ok(trace.some((entry) => entry.action === "network-online"));
  const writes = network.filter(
    (entry) =>
      entry.method === "PUT" && /\/checkins\/2026-09-29$/.test(entry.path),
  );
  assert.equal(writes.length, 2);
  assert.deepEqual(
    writes.map((entry) => entry.status),
    [0, 200],
  );
  assert.match(writes[0].operationKeySha256, /^[0-9a-f]{64}$/);
  assert.equal(writes[0].operationKeySha256, writes[1].operationKeySha256);
  for (const label of ["unknown-offline", "retry-saved"])
    assert.ok((await readFile(`${base}/screen-${label}.png`)).length > 1000);
  const files = [];
  for (const file of (await readdir(base)).sort()) {
    const path = `${base}/${file}`;
    files.push({ path, sha256: sha256(await readFile(path)) });
  }
  runs.push({
    name,
    browser: capture.browser,
    viewport: capture.observedViewport,
    files,
  });
}
assert.equal(
  (await readFile(`${root}/db-retry.txt`, "utf8")).trim(),
  "1|1|1|0|1",
);
dbFiles.push({
  path: `${root}/db-retry.txt`,
  sha256: sha256(await readFile(`${root}/db-retry.txt`)),
});
{
  const name = "one-time-retry-chrome-390";
  const base = `${root}/${name}`;
  const [capture, visual, network, trace, dom] = await Promise.all([
    readJson(`${base}/capture.json`),
    readJson(`${base}/visual-result.json`),
    readJson(`${base}/network.json`),
    readJson(`${base}/action-trace.json`),
    readFile(`${base}/dom.html`, "utf8"),
  ]);
  assert.match(capture.observedPathname, /^\/plans\/[a-f\d-]{36}$/);
  assert.equal(visual.horizontalOverflow, false);
  assert.equal(visual.controlsOutsideViewportWidth, 0);
  assert.ok(visual.documentWidth <= visual.innerWidth);
  assert.match(dom, /当前结果：取消/);
  assert.match(dom, /一次性任务结果已保存/);
  assert.ok(trace.some((entry) => entry.action === "network-offline"));
  assert.ok(trace.some((entry) => entry.action === "network-online"));
  const writes = network.filter(
    (entry) =>
      entry.method === "POST" &&
      entry.path === `/api/v1${capture.observedPathname}/one-time-resolution`,
  );
  assert.equal(writes.length, 2);
  assert.deepEqual(
    writes.map((entry) => entry.status),
    [0, 201],
  );
  assert.match(writes[0].operationKeySha256, /^[0-9a-f]{64}$/);
  assert.equal(writes[0].operationKeySha256, writes[1].operationKeySha256);
  for (const label of ["unknown-offline", "retry-saved"])
    assert.ok((await readFile(`${base}/screen-${label}.png`)).length > 1000);
  const files = [];
  for (const file of (await readdir(base)).sort()) {
    const path = `${base}/${file}`;
    files.push({ path, sha256: sha256(await readFile(path)) });
  }
  runs.push({
    name,
    browser: capture.browser,
    viewport: capture.observedViewport,
    files,
  });
}
assert.equal(
  (await readFile(`${root}/db-one-time-retry.txt`, "utf8")).trim(),
  "cancelled|断网后原操作重试|1|1|1",
);
dbFiles.push({
  path: `${root}/db-one-time-retry.txt`,
  sha256: sha256(await readFile(`${root}/db-one-time-retry.txt`)),
});
{
  const name = "one-time-response-loss-chrome-390";
  const base = `${root}/${name}`;
  const [capture, visual, network, trace, dom] = await Promise.all([
    readJson(`${base}/capture.json`),
    readJson(`${base}/visual-result.json`),
    readJson(`${base}/network.json`),
    readJson(`${base}/action-trace.json`),
    readFile(`${base}/dom.html`, "utf8"),
  ]);
  assert.match(capture.observedPathname, /^\/plans\/[a-f\d-]{36}$/);
  assert.equal(visual.horizontalOverflow, false);
  assert.equal(visual.controlsOutsideViewportWidth, 0);
  assert.ok(visual.documentWidth <= visual.innerWidth);
  assert.match(dom, /当前结果：取消/);
  assert.ok(
    trace.some(
      (entry) =>
        entry.action === "response-dropped-after-server" &&
        entry.serverStatus === 201,
    ),
  );
  const writes = network.filter(
    (entry) =>
      entry.method === "POST" &&
      entry.path === `/api/v1${capture.observedPathname}/one-time-resolution`,
  );
  assert.equal(writes.length, 2);
  assert.deepEqual(
    writes.map((entry) => entry.status),
    [0, 201],
  );
  assert.equal(writes[0].operationKeySha256, writes[1].operationKeySha256);
  for (const label of ["committed-unknown", "replayed-saved"])
    assert.ok((await readFile(`${base}/screen-${label}.png`)).length > 1000);
  const files = [];
  for (const file of (await readdir(base)).sort()) {
    const path = `${base}/${file}`;
    files.push({ path, sha256: sha256(await readFile(path)) });
  }
  runs.push({
    name,
    browser: capture.browser,
    viewport: capture.observedViewport,
    files,
  });
}
assert.equal(
  (await readFile(`${root}/db-one-time-response-loss.txt`, "utf8")).trim(),
  "cancelled|服务端先提交,再丢浏览器响应|1|1|1",
);
dbFiles.push({
  path: `${root}/db-one-time-response-loss.txt`,
  sha256: sha256(await readFile(`${root}/db-one-time-response-loss.txt`)),
});
{
  const name = "media-complete-retry-chrome-390-v3";
  const base = `${root}/${name}`;
  const [capture, visual, network, trace, dom] = await Promise.all([
    readJson(`${base}/capture.json`),
    readJson(`${base}/visual-result.json`),
    readJson(`${base}/network.json`),
    readJson(`${base}/action-trace.json`),
    readFile(`${base}/dom.html`, "utf8"),
  ]);
  assert.match(capture.observedPathname, /^\/plans\/[a-f\d-]{36}$/);
  assert.equal(visual.horizontalOverflow, false);
  assert.equal(visual.controlsOutsideViewportWidth, 0);
  assert.ok(visual.documentWidth <= visual.innerWidth);
  assert.match(dom, /一次性任务结果和照片均已保存/);
  assert.ok(
    trace.some((entry) => entry.action === "media-complete-request-blocked"),
  );
  assert.ok(
    trace.some(
      (entry) =>
        entry.action === "wait-for" &&
        entry.selector === ".one-time-result .primary-button:disabled",
    ),
  );
  assert.equal(
    network.filter(
      (entry) =>
        entry.method === "POST" &&
        entry.path ===
          `/api/v1${capture.observedPathname}/one-time-resolution` &&
        entry.status === 201,
    ).length,
    1,
  );
  const mediaWrites = network.filter(
    (entry) =>
      entry.method === "POST" &&
      /^\/api\/v1\/media\/[a-f\d-]{36}\/complete$/.test(entry.path),
  );
  assert.equal(mediaWrites.length, 2);
  assert.deepEqual(
    mediaWrites.map((entry) => entry.status),
    [0, 201],
  );
  for (const label of ["media-pending", "media-ready"])
    assert.ok((await readFile(`${base}/screen-${label}.png`)).length > 1000);
  const files = [];
  for (const file of (await readdir(base)).sort()) {
    const path = `${base}/${file}`;
    files.push({ path, sha256: sha256(await readFile(path)) });
  }
  runs.push({
    name,
    browser: capture.browser,
    viewport: capture.observedViewport,
    files,
  });
}
assert.equal(
  (await readFile(`${root}/db-media-complete-retry-v3.txt`, "utf8")).trim(),
  "cancelled|1|1|1|1",
);
dbFiles.push({
  path: `${root}/db-media-complete-retry-v3.txt`,
  sha256: sha256(await readFile(`${root}/db-media-complete-retry-v3.txt`)),
});
await writeFile(
  `${root}/checks.json`,
  `${JSON.stringify(
    {
      status: "PASS",
      scope:
        "WEB-10 incremental browser and DB probes only; WEB-CHECK cases remain NOT_RUN",
      createdAt: new Date().toISOString(),
      runs,
      dbFiles,
    },
    null,
    2,
  )}\n`,
);
process.stdout.write(
  `WEB-10 incremental evidence passed: ${runs.length} browsers, cycle and one-time record revisions, ready media\n`,
);
