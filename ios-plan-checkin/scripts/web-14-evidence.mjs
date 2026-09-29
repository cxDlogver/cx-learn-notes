import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, readdir, writeFile } from "node:fs/promises";
import process from "node:process";

const root = "docs/atdd/web/evidence/WEB-14";
const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");
const readJson = async (path) => JSON.parse(await readFile(path, "utf8"));
const runs = [
  {
    name: "request-chrome-390",
    width: 390,
    images: ["search-result", "request-sent", "inbox-empty"],
  },
  {
    name: "accept-chrome-390",
    width: 390,
    images: [
      "incoming-request",
      "friend-accepted",
      "inbox-after-accept",
      "inbox-read",
    ],
  },
  { name: "read-edge-1280", width: 1280, images: ["desktop-inbox-read"] },
  {
    name: "share-grant-chrome-390",
    width: 390,
    images: ["share-preview", "share-granted"],
  },
  {
    name: "shared-read-chrome-390",
    width: 390,
    images: [
      "friend-shared-list",
      "shared-history-readonly",
      "encouragement-sent",
    ],
  },
  {
    name: "share-revoke-chrome-390",
    width: 390,
    images: ["share-before-revoke", "share-revoke-confirm", "share-revoked"],
  },
  {
    name: "revoked-link-edge-1280",
    width: 1280,
    images: ["revoked-link-denied"],
  },
];
const files = [];
const results = [];
for (const run of runs) {
  const base = `${root}/${run.name}`;
  const [capture, visual, network, dom] = await Promise.all([
    readJson(`${base}/capture.json`),
    readJson(`${base}/visual-result.json`),
    readJson(`${base}/network.json`),
    readFile(`${base}/dom.html`, "utf8"),
  ]);
  assert.equal(capture.observedViewport.width, run.width, run.name);
  assert.equal(visual.horizontalOverflow, false, run.name);
  assert.equal(visual.controlsOutsideViewportWidth, 0, run.name);
  assert.ok(visual.documentWidth <= visual.innerWidth, run.name);
  const has = (method, path, status) =>
    network.some(
      (entry) =>
        entry.method === method &&
        path.test(entry.path) &&
        entry.status === status,
    );
  if (run.name === "request-chrome-390") {
    assert.ok(has("GET", /\/users\/search$/, 200));
    assert.ok(has("POST", /\/friend-requests$/, 201));
    assert.doesNotMatch(dom, /今天走了三公里/);
  } else if (run.name === "accept-chrome-390") {
    assert.ok(has("POST", /\/friend-requests\/[a-f\d-]{36}\/accept$/, 201));
    assert.ok(has("POST", /\/me\/inbox\/[a-f\d-]{36}\/read$/, 201));
    assert.match(dom, /未读 0 条/);
  } else if (run.name === "read-edge-1280") {
    assert.ok(has("GET", /\/me\/inbox$/, 200));
    assert.match(dom, /未读 0 条/);
    assert.match(dom, /已读/);
  } else if (run.name === "share-grant-chrome-390") {
    assert.ok(has("GET", /\/share-preview$/, 200));
    assert.ok(has("PUT", /\/shares\/[a-f\d-]{36}$/, 200));
    assert.match(dom, /已授权这项计划/);
  } else if (run.name === "shared-read-chrome-390") {
    assert.ok(has("GET", /\/shared-plans\/[a-f\d-]{36}\/checkins$/, 200));
    assert.ok(has("POST", /\/checkins\/[a-f\d-]{36}\/encouragements$/, 201));
    assert.match(dom, /今天走了三公里/);
    assert.match(dom, /坚持得很好/);
    assert.doesNotMatch(dom, /已保存照片/);
  } else if (run.name === "share-revoke-chrome-390") {
    assert.ok(has("DELETE", /\/shares\/[a-f\d-]{36}$/, 200));
    assert.match(dom, /分享已撤销/);
  } else {
    assert.ok(has("GET", /\/shared-plans\/[a-f\d-]{36}\/checkins$/, 403));
    assert.match(dom, /无法查看这项计划/);
    assert.doesNotMatch(dom, /今天走了三公里|甲的晨间散步/);
  }
  if (run.name !== "revoked-link-edge-1280")
    assert.equal(
      network.some(
        (entry) =>
          entry.status >= 400 && entry.path !== "/api/v1/auth/web/session",
      ),
      false,
      run.name,
    );
  for (const label of run.images)
    assert.ok(
      (await readFile(`${base}/screen-${label}.png`)).length > 1000,
      `${run.name}: ${label}`,
    );
  for (const name of (await readdir(base)).sort()) {
    const path = `${base}/${name}`;
    files.push({ path, sha256: sha256(await readFile(path)) });
  }
  results.push({
    run: run.name,
    browser: capture.browser,
    viewport: capture.observedViewport,
    horizontalOverflow: false,
  });
}
const relation = (
  await readFile(`${root}/db-request-accept.txt`, "utf8")
).trim();
const share = (await readFile(`${root}/db-share-revoke.txt`, "utf8")).trim();
assert.equal(relation, "web_atdd_social_a_1318|web_atdd_calendar_1310|1|1|1");
assert.equal(share, "甲的晨间散步|revoked|2|1|1|1");
for (const name of ["db-request-accept.txt", "db-share-revoke.txt"]) {
  const path = `${root}/${name}`;
  files.push({ path, sha256: sha256(await readFile(path)) });
}
await writeFile(
  `${root}/checks.json`,
  `${JSON.stringify({ generatedAt: new Date().toISOString(), status: "INCREMENTAL_PASS", formalBusinessCasePassCount: 0, runs: results, files }, null, 2)}\n`,
);
process.stdout.write(
  `WEB-14 incremental evidence OK: ${runs.length} runs, ${files.length} hashed files; formal cases not signed\n`,
);
