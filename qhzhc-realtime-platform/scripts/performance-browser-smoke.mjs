import { createPerformanceFixture } from "./performance-test-fixture.mjs";
import fs from "node:fs";
import { spawn } from "node:child_process";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE_PATH || "playwright");
fs.mkdirSync(".performance-work", { recursive: true });
const fixture = createPerformanceFixture();
const log = fs.openSync(".performance-work/server.log", "a");
const server = spawn(process.execPath, ["QHZHC_Server/dist/server/index.js"], {
  cwd: process.cwd(),
  env: {
    ...process.env,
    PORT: "18089",
    DATABASE_PATH: fixture.filename,
    PERFORMANCE_DATABASE_PATH: ".performance-work/performance.sqlite",
  },
  stdio: ["ignore", log, log],
  windowsHide: true,
});
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let browser;
const result = { errors: [], uploads: [], checks: [], batches: [] };
try {
  for (let i = 0; i < 40; i++) {
    try {
      if ((await fetch("http://127.0.0.1:18089/health")).ok) break;
    } catch {}
    await sleep(500);
  }
  browser = await chromium.launch({ channel: "chrome", headless: false });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await context.newPage();
  page.on("pageerror", (e) => result.errors.push(e.message));
  page.on("response", (r) => {
    if (r.url().includes("/api/performance/batches")) {
      result.uploads.push(r.status());
      if (r.status() === 204) {
        const b = r.request().postDataJSON();
        result.batches.push({
          eligible: b.eligible,
          mixed: b.mixed,
          context: b.context,
          metrics: b.metrics,
          missing: b.missing,
          events: b.events,
        });
      }
      if (r.status() === 400)
        result.checks.push({ scene: "rejected-batch", body: r.request().postDataJSON() });
    }
  });
  await page.goto("http://127.0.0.1:18089/#/dataVisualization");
  await page.locator('input[autocomplete="username"]').fill("admin");
  await page.locator('input[autocomplete="current-password"]').fill(fixture.password);
  await page.getByRole("button", { name: "登录", exact: true }).click();
  await page.waitForURL("**/#/dataVisualization");
  await sleep(25000);
  result.checks.push({ scene: "2d", connected: await page.locator(".state-box").textContent() });
  let attempts = 0;
  await page.route("**/api/chart/dataTrans/5min**", async (route) => {
    attempts++;
    if (attempts === 1) {
      await route.fulfill({
        status: 401,
        contentType: "application/json",
        body: JSON.stringify({ message: "test-expired" }),
      });
      return;
    }
    await sleep(600);
    await route.continue();
  });
  await page.reload();
  await sleep(16000);
  await page.unroute("**/api/chart/dataTrans/5min**");
  result.checks.push({ scene: "auth-retry-and-delay", attempts });
  await page.evaluate(() => {
    const until = performance.now() + 250;
    while (performance.now() < until) {
      /* test only */
    }
  });
  await sleep(1200);
  await context.setOffline(true);
  await sleep(1800);
  await context.setOffline(false);
  await sleep(5000);
  result.checks.push({
    scene: "reconnect",
    connected: await page.locator(".state-box").textContent(),
  });
  const background = await context.newPage();
  await background.goto("about:blank");
  await sleep(2000);
  await background.close();
  await page.bringToFront();
  await sleep(3000);
  const button = page.getByRole("button", { name: "3D", exact: true });
  if (!(await button.isVisible()))
    await page.getByRole("button", { name: "切换工具栏", exact: true }).click();
  await button.click();
  await sleep(16000);
  await page.goto("http://127.0.0.1:18089/#/admin/performance");
  await page.getByRole("heading", { name: "性能监控", exact: true }).waitFor();
  await sleep(3000);
  result.checks.push({
    scene: "dashboard",
    text: (await page.locator("main").innerText()).slice(0, 8000),
  });
  await page.screenshot({ path: ".performance-work/performance-dashboard.png", fullPage: true });
  await page.getByRole("button", { name: "指标说明与阈值", exact: true }).click();
  await sleep(300);
  result.checks.push({
    scene: "definitions",
    visible: await page.getByRole("heading", { name: "LCP（Largest Contentful Paint）" }).count(),
  });
  await page.screenshot({ path: ".performance-work/performance-definitions.png" });
  await page
    .getByRole("button", { name: "close 指标说明与阈值" })
    .click()
    .catch(() => page.keyboard.press("Escape"));
  await sleep(300);
  const detail = page.getByRole("button", { name: "查看过程" }).first();
  if (await detail.count()) {
    await detail.click();
    await sleep(1000);
    result.checks.push({
      scene: "detail",
      text: (await page.locator(".el-drawer").last().innerText()).slice(0, 2500),
    });
  }
  const samples = result.batches.flatMap((b) => b.metrics);
  result.assertions = {
    uploadsSuccessful: result.uploads.every((x) => x === 204),
    noPageErrors: result.errors.length === 0,
    spaIneligible: result.batches.some((b) => !b.eligible),
    refreshEligible: result.batches.some((b) => b.eligible && !b.mixed),
    oneLogicalRetry: samples
      .filter((m) => m.name === "apiAttempts" && m.component === "/api/chart/dataTrans/5min")
      .some((m) => m.distribution.max === 2),
    apiDelayVisible: samples.some((m) => m.name === "apiDuration" && m.distribution.max >= 600),
    blockingVisible: samples.some((m) => m.name === "eventLoop" && m.distribution.max >= 150),
    disconnectVisible: samples.some((m) => m.name === "disconnect"),
    loafBounded: samples
      .filter((m) => m.name === "loafBlocking")
      .every((m) => m.distribution.max <= 100),
  };
  fs.writeFileSync(".performance-work/browser-result.json", JSON.stringify(result, null, 2));
  console.log(
    JSON.stringify({
      errors: result.errors,
      uploads: result.uploads,
      checks: result.checks.map((x) => ({ scene: x.scene, connected: x.connected })),
    })
  );
} catch (e) {
  result.error = String(e);
  fs.writeFileSync(".performance-work/browser-result.json", JSON.stringify(result, null, 2));
  throw e;
} finally {
  if (browser) await browser.close();
  server.kill();
  fs.closeSync(log);
}
