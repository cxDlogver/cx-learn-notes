import fs from "node:fs";
import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { createPerformanceFixture } from "./performance-test-fixture.mjs";
const require = createRequire(import.meta.url),
  { chromium } = require(process.env.PLAYWRIGHT_MODULE_PATH || "playwright");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms)),
  base = "http://127.0.0.1:18089",
  fixture = createPerformanceFixture();
const file = fs.openSync(".performance-work/bfcache-server.log", "a"),
  stamp = Date.now();
const server = spawn(process.execPath, ["QHZHC_Server/dist/server/index.js"], {
  env: {
    ...process.env,
    PORT: "18089",
    DATABASE_PATH: fixture.filename,
    PERFORMANCE_DATABASE_PATH: ".performance-work/bfcache-performance-" + stamp + ".sqlite",
  },
  stdio: ["ignore", file, file],
  windowsHide: true,
});
let browser;
const report = { uploads: [], errors: [] };
try {
  for (let i = 0; i < 40; i++) {
    try {
      if ((await fetch(base + "/health")).ok) break;
    } catch {}
    await sleep(500);
  }
  browser = await chromium.launch({
    channel: "chrome",
    headless: false,
    ignoreDefaultArgs: ["--disable-back-forward-cache"],
  });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  await context.addInitScript(() =>
    window.addEventListener("pageshow", (e) => {
      window.__bfcachePersisted = e.persisted;
    })
  );
  const page = await context.newPage();
  page.on("pageerror", (e) => report.errors.push(e.message));
  page.on("response", (r) => {
    if (r.url().includes("/api/performance/batches")) {
      const b = r.request().postDataJSON();
      report.uploads.push({
        status: r.status(),
        documentId: b.documentId,
        viewId: b.viewId,
        events: b.events.map((e) => e.name),
        vitals: b.metrics.filter((m) => m.metricId).map((m) => ({ name: m.name, id: m.metricId })),
      });
    }
  });
  await page.goto(base + "/#/dataVisualization");
  await page.locator('input[autocomplete="username"]').fill(fixture.username);
  await page.locator('input[autocomplete="current-password"]').fill(fixture.password);
  await page.getByRole("button", { name: "登录", exact: true }).click();
  await page.waitForURL("**/#/dataVisualization");
  await sleep(2000);
  await page.reload();
  await sleep(11000);
  report.before = report.uploads.at(-1);
  await page.goto(base + "/health");
  await sleep(2000);
  await page.goBack({ waitUntil: "commit", timeout: 10000 }).catch((error) => {
    if (!page.url().endsWith("/#/dataVisualization")) throw error;
  });
  await sleep(11500);
  report.persisted = await page.evaluate(() => window.__bfcachePersisted);
  report.reasons = await page.evaluate(
    () => performance.getEntriesByType("navigation")[0]?.notRestoredReasons?.toJSON?.() || null
  );
  report.restoredBatch = report.uploads.find((b) => b.events.includes("bfcache-restore"));
  report.identitiesRenewed =
    !!report.restoredBatch &&
    report.restoredBatch.documentId !== report.before?.documentId &&
    report.restoredBatch.viewId !== report.before?.viewId;
  fs.writeFileSync(
    "reports/performance-monitoring/bfcache-results.json",
    JSON.stringify(report, null, 2)
  );
  console.log(
    JSON.stringify({
      persisted: report.persisted,
      identitiesRenewed: report.identitiesRenewed,
      reasons: report.reasons,
      errors: report.errors,
    })
  );
} finally {
  if (browser) await browser.close();
  server.kill();
  fs.closeSync(file);
}
