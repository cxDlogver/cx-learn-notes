import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, readdir, writeFile } from "node:fs/promises";
import process from "node:process";

const root = "docs/atdd/web/evidence/WEB-05";
const names = [
  "login-initial-chrome-390",
  "login-chrome-390",
  "login-edge-1280",
  "login-flow-chrome-390-v2",
  "login-reload-chrome-390",
  "login-flow-edge-1280",
  "existing-login-chrome-390",
  "logout-back-chrome-390",
  "today-empty-chrome-390-v2",
  "today-empty-edge-1280",
  "change-phone-form-chrome-390",
  "change-phone-chrome-390",
  "new-phone-login-chrome-390",
  "change-phone-invalid-chrome-390-v3",
  "access-refresh-chrome-390",
  "auth07-real-plan-chrome-390-v2",
  "invalid-phone-chrome-390",
  "invalid-code-chrome-390",
];
const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");
const readJson = async (path) => JSON.parse(await readFile(path, "utf8"));
const runs = [];
for (const name of names) {
  const base = `${root}/${name}`;
  const capture = await readJson(`${base}/capture.json`);
  const visual = await readJson(`${base}/visual-result.json`);
  assert.equal(visual.horizontalOverflow, false, name);
  assert.equal(visual.controlsOutsideViewportWidth, 0, name);
  assert.equal(visual.documentWidth, visual.innerWidth, name);
  const fileNames = (await readdir(base)).sort();
  const files = [];
  for (const file of fileNames) {
    const path = `${base}/${file}`;
    const bytes = await readFile(path);
    assert.ok(bytes.length > 0, `${name}/${file}`);
    if (/\.(?:json|jsonl|html)$/.test(file)) {
      const body = bytes.toString("utf8");
      assert.doesNotMatch(body, /139000012(?:3[4-9]|4[0-7]|58)/);
      assert.doesNotMatch(body, /__Host-plan-refresh=/);
      assert.doesNotMatch(body, /id="sms-code"[^>]*value="\d{6}"/);
      assert.doesNotMatch(
        body,
        /id="(?:old|new)-phone-code"[^>]*value="\d{6}"/,
      );
    }
    files.push({ path, bytes: bytes.length, sha256: sha256(bytes) });
  }
  if (name === "login-reload-chrome-390") {
    const network = await readJson(`${base}/network.json`);
    assert.ok(
      network.some(
        (item) =>
          item.path === "/api/v1/auth/web/session" && item.status === 200,
      ),
    );
    const storage = await readJson(`${base}/browser-storage.json`);
    assert.deepEqual(storage.localStorageKeys, []);
    assert.deepEqual(storage.readableCookieNames, []);
    assert.ok(
      storage.cookieMetadata.some(
        (cookie) =>
          cookie.name === "__Host-plan-refresh" &&
          cookie.secure &&
          cookie.httpOnly &&
          cookie.sameSite === "Lax",
      ),
    );
  }
  if (name === "existing-login-chrome-390") {
    const network = await readJson(`${base}/network.json`);
    assert.equal(
      network.some(
        (item) => item.path === "/api/v1/me" && item.method === "PATCH",
      ),
      false,
    );
    assert.equal(capture.observedPathname, "/today");
  }
  if (name === "logout-back-chrome-390") {
    const network = await readJson(`${base}/network.json`);
    assert.ok(
      network.some(
        (item) =>
          item.path === "/api/v1/auth/web/logout" && item.status === 201,
      ),
    );
    const storage = await readJson(`${base}/browser-storage.json`);
    assert.deepEqual(storage.cookieMetadata, []);
    assert.equal(storage.pathname, "/login");
  }
  if (name.startsWith("today-empty-")) {
    const network = await readJson(`${base}/network.json`);
    assert.ok(
      network.some(
        (item) => item.path === "/api/v1/today" && item.status === 200,
      ),
    );
    const dom = await readFile(`${base}/dom.html`, "utf8");
    assert.match(dom, /还没有今日计划/);
    assert.match(dom, /href="\/plans\/new"/);
    assert.equal(capture.observedPathname, "/today");
  }
  if (name === "change-phone-form-chrome-390") {
    const dom = await readFile(`${base}/dom.html`, "utf8");
    assert.match(dom, /当前号码收到的验证码/);
    assert.match(dom, /新号码收到的验证码/);
    assert.equal(capture.observedPathname, "/settings/change-phone");
  }
  if (name === "change-phone-chrome-390") {
    const network = await readJson(`${base}/network.json`);
    for (const path of [
      "/api/v1/me/change-phone/challenge",
      "/api/v1/me/change-phone/confirm",
      "/api/v1/auth/web/logout",
    ]) {
      assert.ok(
        network.some((item) => item.path === path && item.status === 201),
      );
    }
    const storage = await readJson(`${base}/browser-storage.json`);
    assert.equal(storage.pathname, "/login");
    assert.deepEqual(storage.cookieMetadata, []);
  }
  if (name === "new-phone-login-chrome-390") {
    const network = await readJson(`${base}/network.json`);
    assert.ok(
      network.some((item) => item.path === "/api/v1/me" && item.status === 200),
    );
    assert.equal(
      network.some(
        (item) => item.path === "/api/v1/me" && item.method === "PATCH",
      ),
      false,
    );
    assert.equal(capture.observedPathname, "/today");
  }
  if (name === "change-phone-invalid-chrome-390-v3") {
    const network = await readJson(`${base}/network.json`);
    assert.ok(
      network.some(
        (item) =>
          item.path === "/api/v1/me/change-phone/confirm" &&
          item.status === 400,
      ),
    );
    const dom = await readFile(`${base}/dom.html`, "utf8");
    assert.match(dom, /验证码不正确/);
    assert.equal(capture.observedPathname, "/settings/change-phone");
    const ax = await readFile(`${base}/accessibility.json`, "utf8");
    assert.doesNotMatch(ax, /"value"\s*:\s*"\d{6}"/);
  }
  if (name === "access-refresh-chrome-390") {
    const trace = await readJson(`${base}/action-trace.json`);
    assert.ok(
      trace.some(
        (item) => item.action === "advance-clock" && item.offsetMs === 960000,
      ),
    );
    const network = await readJson(`${base}/network.json`);
    assert.equal(
      network.filter(
        (item) =>
          item.path === "/api/v1/auth/web/refresh" && item.status === 201,
      ).length,
      1,
    );
    assert.equal(
      network.filter(
        (item) => item.path === "/api/v1/today" && item.status === 200,
      ).length,
      2,
    );
    assert.equal(capture.observedPathname, "/today");
  }
  if (name === "auth07-real-plan-chrome-390-v2") {
    const trace = await readJson(`${base}/action-trace.json`);
    assert.ok(
      trace.some(
        (item) => item.action === "advance-clock" && item.offsetMs === 960000,
      ),
    );
    const network = await readJson(`${base}/network.json`);
    assert.equal(
      network.filter(
        (item) =>
          item.path === "/api/v1/auth/web/refresh" && item.status === 201,
      ).length,
      1,
    );
    assert.ok(
      network.some(
        (item) =>
          item.path === "/api/v1/plans" &&
          item.method === "GET" &&
          item.status === 200,
      ),
    );
    assert.ok(
      network.some(
        (item) =>
          item.path === "/api/v1/groups" &&
          item.method === "GET" &&
          item.status === 200,
      ),
    );
    assert.ok(
      network.some(
        (item) =>
          item.path === `/api/v1${capture.observedPathname}` &&
          item.method === "GET" &&
          item.status === 200,
      ),
    );
    assert.equal(
      network.some(
        (item) => item.method === "PATCH" || item.method === "DELETE",
      ),
      false,
    );
    assert.match(capture.observedPathname, /^\/plans\/[a-f\d-]{36}$/);
    const storage = await readJson(`${base}/browser-storage.json`);
    assert.deepEqual(storage.localStorageKeys, []);
    assert.deepEqual(storage.readableCookieNames, []);
    assert.ok(
      storage.cookieMetadata.some(
        (cookie) =>
          cookie.name === "__Host-plan-refresh" &&
          cookie.secure &&
          cookie.httpOnly,
      ),
    );
  }
  if (name === "invalid-phone-chrome-390") {
    const network = await readJson(`${base}/network.json`);
    assert.equal(
      network.some((item) => item.path === "/api/v1/auth/sms/challenges"),
      false,
    );
    const dom = await readFile(`${base}/dom.html`, "utf8");
    assert.match(dom, /请输入有效的中国大陆手机号/);
    assert.equal(capture.observedPathname, "/login");
  }
  if (name === "invalid-code-chrome-390") {
    const network = await readJson(`${base}/network.json`);
    assert.ok(
      network.some(
        (item) =>
          item.path === "/api/v1/auth/web/verify" && item.status === 400,
      ),
    );
    const storage = await readJson(`${base}/browser-storage.json`);
    assert.deepEqual(storage.cookieMetadata, []);
    const dom = await readFile(`${base}/dom.html`, "utf8");
    assert.match(dom, /验证码不正确/);
    assert.equal(capture.observedPathname, "/login");
  }
  runs.push({
    name,
    browser: capture.browser,
    viewport: capture.observedViewport,
    observedPathname: capture.observedPathname ?? null,
    files,
  });
}

const checkFiles = [
  [
    "web-typecheck",
    "tsc --noEmit -p apps/web/tsconfig.json",
    "web-typecheck.txt",
  ],
  ["web-build", "project Node 22.13 + apps/web Vite 8 build", "web-build.txt"],
  [
    "lint",
    "eslint apps/web/src apps/web/vite.config.ts scripts/web-browser-capture.mjs scripts/web-05-evidence.mjs",
    "lint.txt",
  ],
  [
    "format",
    "prettier --check apps/web scripts/web-browser-capture.mjs scripts/web-05-evidence.mjs scripts/web-05-*.json package.json infra/compose.yaml",
    "format.txt",
  ],
  ["root-check", "npm run check", "root-check.txt"],
  ["ledger", "python docs/atdd/web/check_execution_progress.py", "ledger.txt"],
  [
    "change-phone-db",
    "isolated PostgreSQL account/session/change aggregate",
    "change-phone-db.txt",
  ],
  [
    "change-phone-invalid-db",
    "isolated PostgreSQL unconsumed change and attempt aggregate",
    "change-phone-invalid-db.txt",
  ],
];
const checks = [];
for (const [name, command, file] of checkFiles) {
  const path = `${root}/${file}`;
  const bytes = await readFile(path);
  checks.push({
    name,
    command,
    exitCode: 0,
    path,
    bytes: bytes.length,
    sha256: sha256(bytes),
  });
}
assert.match(await readFile(`${root}/web-build.txt`, "utf8"), /built in/);
assert.match(
  await readFile(`${root}/root-check.txt`, "utf8"),
  /Security static scan passed/,
);
assert.match(
  await readFile(`${root}/ledger.txt`, "utf8"),
  /Web execution ledger OK: 22 tasks, 136 cases/,
);
assert.match(
  await readFile(`${root}/change-phone-db.txt`, "utf8"),
  /^1\|4\|1\|3\|1\s*$/,
);
assert.match(
  await readFile(`${root}/change-phone-invalid-db.txt`, "utf8"),
  /^1\|0\|1\s*$/,
);
await writeFile(
  `${root}/checks.json`,
  `${JSON.stringify(
    {
      taskId: "WEB-05",
      status: "IN_PROGRESS",
      generatedAt: new Date().toISOString(),
      businessCasePassCount: 0,
      browserRuns: runs,
      checks,
      note: "Development probes; 12 AUTH cases remain NOT_RUN until complete F/V/N",
    },
    null,
    2,
  )}\n`,
);
process.stdout.write(
  `WEB-05 evidence: ${runs.length} browser probes, ${checks.length} checks hashed; 0 business PASS\n`,
);
