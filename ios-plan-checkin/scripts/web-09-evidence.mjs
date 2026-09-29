import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, readdir, writeFile } from "node:fs/promises";
import process from "node:process";

const root = "docs/atdd/web/evidence/WEB-09";
const names = [
  "object-provider.txt",
  "object-expiry.txt",
  "local-http-smoke.txt",
  "local-http-smoke-v2.txt",
  "local-http-report.json",
];
const files = [];
for (const name of names) {
  const path = `${root}/${name}`;
  const bytes = await readFile(path);
  assert.ok(bytes.length > 0, path);
  const content = bytes.toString("utf8");
  if (name === "local-http-report.json")
    assert.doesNotMatch(content, /1[3-9]\d{9}/);
  assert.doesNotMatch(content, /__Host-plan-refresh=/);
  files.push({
    path,
    bytes: bytes.length,
    sha256: createHash("sha256").update(bytes).digest("hex"),
  });
}
const objectProbe = await readFile(`${root}/object-provider.txt`, "utf8");
for (const pair of [
  '"allowedPreflight":200',
  '"forbiddenPreflight":403',
  '"signedPut":200',
  '"signedGet":200',
  '"unsignedGet":403',
  '"objectCleanup":"verified"',
])
  assert.ok(objectProbe.includes(pair), pair);
const expiryProbe = await readFile(`${root}/object-expiry.txt`, "utf8");
for (const pair of [
  '"shortSignedGetBefore":200',
  '"shortSignedGetAfter":403',
  '"objectCleanup":"verified"',
])
  assert.ok(expiryProbe.includes(pair), pair);
const failed = await readFile(`${root}/local-http-smoke.txt`, "utf8");
assert.match(failed, /internal\/metrics|heartbeat_age_seconds/);
const passed = await readFile(`${root}/local-http-smoke-v2.txt`, "utf8");
assert.match(passed, /Local HTTP checks: 10\/10 passed/);
const report = JSON.parse(
  await readFile(`${root}/local-http-report.json`, "utf8"),
);
assert.equal(report.cases.length, 10);
assert.ok(report.cases.every((entry) => entry.status === "PASS"));
assert.equal(
  report.cases.find(
    (entry) => entry.caseId === "MEDIA-api-signed-upload-private-download",
  )?.status,
  "PASS",
);
const gallery = `${root}/private-gallery-chrome-390`;
const [capture, visual, network, trace, dom] = await Promise.all([
  readFile(`${gallery}/capture.json`, "utf8").then(JSON.parse),
  readFile(`${gallery}/visual-result.json`, "utf8").then(JSON.parse),
  readFile(`${gallery}/network.json`, "utf8").then(JSON.parse),
  readFile(`${gallery}/action-trace.json`, "utf8").then(JSON.parse),
  readFile(`${gallery}/dom.html`, "utf8"),
]);
assert.match(capture.observedPathname, /^\/plans\/[a-f\d-]{36}$/);
assert.equal(visual.innerWidth, 390);
assert.equal(visual.horizontalOverflow, false);
assert.equal(visual.controlsOutsideViewportWidth, 0);
assert.match(dom, /src="\[REDACTED_SIGNED_URL\]"/);
assert.doesNotMatch(dom, /X-Amz-Signature|AWSAccessKeyId/);
assert.ok(
  trace.some(
    (entry) =>
      entry.action === "wait-for-image" &&
      entry.selector === ".one-time-result .private-media-grid img",
  ),
);
assert.ok(
  network.some(
    (entry) =>
      entry.method === "GET" &&
      /^\/api\/v1\/media\/[a-f\d-]{36}\/download-url$/.test(entry.path) &&
      entry.status === 200,
  ),
);
assert.ok(
  network.some(
    (entry) =>
      entry.method === "GET" &&
      entry.path === "[object-store]" &&
      entry.status === 200 &&
      entry.mimeType === "image/png",
  ),
);
for (const name of (await readdir(gallery)).sort()) {
  const path = `${gallery}/${name}`;
  const bytes = await readFile(path);
  files.push({
    path,
    bytes: bytes.length,
    sha256: createHash("sha256").update(bytes).digest("hex"),
  });
}
for (const [name, expectedStatus] of [
  ["private-owner-chrome-390", 200],
  ["private-other-edge-1280", 404],
]) {
  const base = `${root}/${name}`;
  const [run, layout, requests, actions, markup] = await Promise.all([
    readFile(`${base}/capture.json`, "utf8").then(JSON.parse),
    readFile(`${base}/visual-result.json`, "utf8").then(JSON.parse),
    readFile(`${base}/network.json`, "utf8").then(JSON.parse),
    readFile(`${base}/action-trace.json`, "utf8").then(JSON.parse),
    readFile(`${base}/dom.html`, "utf8"),
  ]);
  assert.equal(layout.horizontalOverflow, false, name);
  assert.equal(layout.controlsOutsideViewportWidth, 0, name);
  assert.doesNotMatch(markup, /X-Amz-Signature|AWSAccessKeyId/, name);
  const mediaReads = requests.filter(
    (entry) =>
      entry.method === "GET" &&
      /^\/api\/v1\/media\/[a-f\d-]{36}\/download-url$/.test(entry.path),
  );
  assert.equal(mediaReads.length, 1, name);
  assert.equal(mediaReads[0].status, expectedStatus, name);
  if (expectedStatus === 200) {
    assert.match(run.observedPathname, /^\/plans\/[a-f\d-]{36}$/);
    assert.match(markup, /src="\[REDACTED_SIGNED_URL\]"/);
    assert.ok(
      requests.some(
        (entry) =>
          entry.path === "[object-store]" &&
          entry.method === "GET" &&
          entry.status === 200,
      ),
    );
  } else {
    assert.ok(
      actions.some(
        (entry) =>
          entry.action === "probe-private-media" && entry.status === 404,
      ),
    );
    assert.equal(
      requests.some(
        (entry) => entry.path === "[object-store]" && entry.method === "GET",
      ),
      false,
    );
  }
  for (const file of (await readdir(base)).sort()) {
    const path = `${base}/${file}`;
    const bytes = await readFile(path);
    files.push({
      path,
      bytes: bytes.length,
      sha256: createHash("sha256").update(bytes).digest("hex"),
    });
  }
}
const ownership = (
  await readFile(`${root}/db-cross-account-media.txt`, "utf8")
).trim();
assert.equal(ownership, "web_atdd_private_owner|ready|1|0");
const ownershipBytes = await readFile(`${root}/db-cross-account-media.txt`);
files.push({
  path: `${root}/db-cross-account-media.txt`,
  bytes: ownershipBytes.length,
  sha256: createHash("sha256").update(ownershipBytes).digest("hex"),
});
{
  const base = `${root}/tenth-photo-chrome-390`;
  const [run, layout, requests, actions, markup] = await Promise.all([
    readFile(`${base}/capture.json`, "utf8").then(JSON.parse),
    readFile(`${base}/visual-result.json`, "utf8").then(JSON.parse),
    readFile(`${base}/network.json`, "utf8").then(JSON.parse),
    readFile(`${base}/action-trace.json`, "utf8").then(JSON.parse),
    readFile(`${base}/dom.html`, "utf8"),
  ]);
  assert.match(run.observedPathname, /^\/plans\/[a-f\d-]{36}$/);
  assert.equal(layout.horizontalOverflow, false);
  assert.equal(layout.controlsOutsideViewportWidth, 0);
  assert.match(markup, /当前结果：取消/);
  assert.ok(
    actions.some(
      (entry) => entry.action === "upload-file" && entry.fileCount === 10,
    ),
  );
  assert.ok(
    actions.some(
      (entry) =>
        entry.action === "wait-for-text" &&
        entry.expectedText === "每条结果最多 9 张照片",
    ),
  );
  assert.equal(
    requests.filter(
      (entry) =>
        entry.method === "POST" &&
        entry.path === `/api/v1${run.observedPathname}/one-time-resolution` &&
        entry.status === 201,
    ).length,
    1,
  );
  assert.equal(
    requests.some(
      (entry) =>
        entry.path === "[object-store]" ||
        entry.path === "/api/v1/media/upload-intents" ||
        /^\/api\/v1\/media\/[a-f\d-]{36}\/complete$/.test(entry.path),
    ),
    false,
  );
  for (const label of ["tenth-photo-rejected", "pure-result-saved"])
    assert.ok((await readFile(`${base}/screen-${label}.png`)).length > 1000);
  for (const file of (await readdir(base)).sort()) {
    const path = `${base}/${file}`;
    const bytes = await readFile(path);
    files.push({
      path,
      bytes: bytes.length,
      sha256: createHash("sha256").update(bytes).digest("hex"),
    });
  }
}
const pureResult = (
  await readFile(`${root}/db-tenth-photo-pure-result.txt`, "utf8")
).trim();
assert.equal(pureResult, "cancelled|不附照片也可提交|1|1|0");
const pureResultBytes = await readFile(
  `${root}/db-tenth-photo-pure-result.txt`,
);
files.push({
  path: `${root}/db-tenth-photo-pure-result.txt`,
  bytes: pureResultBytes.length,
  sha256: createHash("sha256").update(pureResultBytes).digest("hex"),
});
{
  const base = `${root}/oversize-photo-chrome-390`;
  const [run, layout, requests, actions, markup] = await Promise.all([
    readFile(`${base}/capture.json`, "utf8").then(JSON.parse),
    readFile(`${base}/visual-result.json`, "utf8").then(JSON.parse),
    readFile(`${base}/network.json`, "utf8").then(JSON.parse),
    readFile(`${base}/action-trace.json`, "utf8").then(JSON.parse),
    readFile(`${base}/dom.html`, "utf8"),
  ]);
  assert.match(run.observedPathname, /^\/plans\/[a-f\d-]{36}$/);
  assert.equal(layout.horizontalOverflow, false);
  assert.equal(layout.controlsOutsideViewportWidth, 0);
  assert.match(markup, /当前结果：取消/);
  assert.ok(
    actions.some(
      (entry) =>
        entry.action === "upload-oversize-fixture" &&
        entry.bytes === 20 * 1024 * 1024 + 1,
    ),
  );
  assert.ok(
    actions.some(
      (entry) =>
        entry.action === "wait-for-text" &&
        entry.expectedText === "不超过 20 MB",
    ),
  );
  assert.equal(
    requests.filter(
      (entry) =>
        entry.method === "POST" &&
        entry.path === `/api/v1${run.observedPathname}/one-time-resolution` &&
        entry.status === 201,
    ).length,
    1,
  );
  assert.equal(
    requests.some(
      (entry) =>
        entry.path === "[object-store]" ||
        entry.path === "/api/v1/media/upload-intents" ||
        /^\/api\/v1\/media\/[a-f\d-]{36}\/complete$/.test(entry.path),
    ),
    false,
  );
  for (const label of ["oversize-rejected", "pure-result-saved"])
    assert.ok((await readFile(`${base}/screen-${label}.png`)).length > 1000);
  for (const file of (await readdir(base)).sort()) {
    const path = `${base}/${file}`;
    const bytes = await readFile(path);
    files.push({
      path,
      bytes: bytes.length,
      sha256: createHash("sha256").update(bytes).digest("hex"),
    });
  }
}
const oversizeResult = (
  await readFile(`${root}/db-oversize-pure-result.txt`, "utf8")
).trim();
assert.equal(oversizeResult, "cancelled|超大照片不阻断纯结果|1|1|0");
const oversizeBytes = await readFile(`${root}/db-oversize-pure-result.txt`);
files.push({
  path: `${root}/db-oversize-pure-result.txt`,
  bytes: oversizeBytes.length,
  sha256: createHash("sha256").update(oversizeBytes).digest("hex"),
});
{
  const base = `${root}/nine-photos-chrome-390`;
  const [run, layout, requests, actions, markup] = await Promise.all([
    readFile(`${base}/capture.json`, "utf8").then(JSON.parse),
    readFile(`${base}/visual-result.json`, "utf8").then(JSON.parse),
    readFile(`${base}/network.json`, "utf8").then(JSON.parse),
    readFile(`${base}/action-trace.json`, "utf8").then(JSON.parse),
    readFile(`${base}/dom.html`, "utf8"),
  ]);
  assert.match(run.observedPathname, /^\/plans\/[a-f\d-]{36}$/);
  assert.equal(layout.horizontalOverflow, false);
  assert.equal(layout.controlsOutsideViewportWidth, 0);
  assert.match(markup, /已保存照片：9 张/);
  assert.equal(
    (markup.match(/src="\[REDACTED_SIGNED_URL\]"/g) ?? []).length,
    9,
  );
  assert.ok(
    actions.some(
      (entry) => entry.action === "upload-file" && entry.fileCount === 9,
    ),
  );
  for (const [method, path, status, expected] of [
    ["POST", /^\/api\/v1\/media\/upload-intents$/, 201, 9],
    ["PUT", /^\[object-store\]$/, 200, 9],
    ["POST", /^\/api\/v1\/media\/[a-f\d-]{36}\/complete$/, 201, 9],
    ["GET", /^\/api\/v1\/media\/[a-f\d-]{36}\/download-url$/, 200, 9],
    ["GET", /^\[object-store\]$/, 200, 9],
    ["POST", /^\/api\/v1\/plans\/[a-f\d-]{36}\/one-time-resolution$/, 201, 1],
  ])
    assert.equal(
      requests.filter(
        (entry) =>
          entry.method === method &&
          path.test(entry.path) &&
          entry.status === status,
      ).length,
      expected,
    );
  for (const label of ["nine-ready", "nine-saved", "nine-gallery"])
    assert.ok((await readFile(`${base}/screen-${label}.png`)).length > 1000);
  for (const file of (await readdir(base)).sort()) {
    const path = `${base}/${file}`;
    const bytes = await readFile(path);
    files.push({
      path,
      bytes: bytes.length,
      sha256: createHash("sha256").update(bytes).digest("hex"),
    });
  }
}
assert.equal(
  (await readFile(`${root}/db-nine-photos.txt`, "utf8")).trim(),
  "cancelled|1|1|9|9",
);
const nineBytes = await readFile(`${root}/db-nine-photos.txt`);
files.push({
  path: `${root}/db-nine-photos.txt`,
  bytes: nineBytes.length,
  sha256: createHash("sha256").update(nineBytes).digest("hex"),
});
const result = {
  taskId: "WEB-09",
  status: "IN_PROGRESS",
  generatedAt: new Date().toISOString(),
  formalBusinessCasePassCount: 0,
  browserRunCount: 6,
  checks: files,
};
await writeFile(`${root}/checks.json`, `${JSON.stringify(result, null, 2)}\n`);
process.stdout.write(
  `WEB-09 evidence OK: ${files.length} files, private gallery browser image loaded; formal cases pending\n`,
);
