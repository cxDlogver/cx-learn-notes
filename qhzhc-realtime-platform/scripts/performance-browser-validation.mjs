import { createPerformanceFixture } from "./performance-test-fixture.mjs";
// Optional real-Chrome validation. Run with Node >=24 and PLAYWRIGHT_MODULE_PATH pointing to playwright.
import fs from "node:fs";
import os from "node:os";
import { spawn } from "node:child_process";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE_PATH || "playwright");
const base = "http://127.0.0.1:18089",
  output = process.env.PERFORMANCE_VALIDATION_OUTPUT || ".performance-work";
fs.mkdirSync(output, { recursive: true });
const duration = Number(process.env.PERFORMANCE_RUN_MS) || 300000;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const fixture = createPerformanceFixture();
const logfile = fs.openSync(output + "/ab-server.log", "a");
const stamp = Date.now();
const resume = process.env.PERFORMANCE_RESUME_DIAGNOSTICS === "true";
const server = spawn(process.execPath, ["QHZHC_Server/dist/server/index.js"], {
  cwd: process.cwd(),
  env: {
    ...process.env,
    PORT: "18089",
    DATABASE_PATH: fixture.filename,
    PERFORMANCE_DATABASE_PATH: output + "/ab-monitor-" + stamp + ".sqlite",
  },
  stdio: ["ignore", logfile, logfile],
  windowsHide: true,
});
let browser;
const report = {
  startedAt: new Date().toISOString(),
  hardware: {
    cpu: os.cpus()[0]?.model,
    logicalCpus: os.cpus().length,
    totalMemory: os.totalmem(),
    platform: os.platform(),
    node: process.version,
  },
  durationMs: duration,
  runs: [],
  errors: [],
  stress: [],
};
if (resume) {
  Object.assign(
    report,
    JSON.parse(fs.readFileSync(output + "/performance-ab-results.json", "utf8"))
  );
  report.diagnosticResumeAt = new Date().toISOString();
  delete report.failure;
}
function save() {
  fs.writeFileSync(output + "/performance-ab-results.json", JSON.stringify(report, null, 2));
}
async function admin(path, body, method = "POST") {
  const login = await fetch(base + "/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: "admin", password: fixture.password }),
  });
  const token = (await login.json()).accessToken;
  const r = await fetch(base + path, {
    method,
    headers: { "Content-Type": "application/json", Authorization: "Bearer " + token },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw Error(path + ": " + r.status);
  return r.json();
}
async function loggedPage(enabled) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  await context.addInitScript((value) => {
    sessionStorage.setItem("qhzhc_performance_enabled", value ? "true" : "false");
  }, enabled);
  const page = await context.newPage();
  page.on("pageerror", (e) =>
    report.errors.push({ at: new Date().toISOString(), message: e.message })
  );
  await page.goto(base + "/#/dataVisualization");
  await page.locator('input[autocomplete="username"]').fill("admin");
  await page.locator('input[autocomplete="current-password"]').fill(fixture.password);
  await page.getByRole("button", { name: "登录", exact: true }).click();
  await page.waitForURL("**/#/dataVisualization");
  await page.locator(".state-box").filter({ hasText: "连接成功" }).waitFor({ timeout: 30000 });
  await page.bringToFront();
  return { page, context };
}
async function installProbe(page) {
  await page.evaluate(() => {
    const vm = document.querySelector(".app-content").__vue__;
    const probe = {
      frames: [],
      updates: {},
      visibility: [],
      started: performance.now(),
      pointsStart: vm.gasdata?.data?.length || 0,
    };
    window.__performanceValidation = probe;
    const visit = (component) => {
      if (component.$options.name === "VisualizationCharts") {
        const fn = component.__validationOriginalUpdate || component.updateOptions;
        component.__validationOriginalUpdate = fn;
        component.updateOptions = function (...args) {
          const start = performance.now();
          try {
            return fn.apply(this, args);
          } finally {
            const name = component.chartName;
            const a = probe.updates[name] || (probe.updates[name] = []);
            if (a.length < 20000) a.push(performance.now() - start);
          }
        };
      }
      for (const child of component.$children || []) visit(child);
    };
    visit(vm);
    const sample = () => {
      let first = 0,
        frames = 0;
      const frame = (now) => {
        if (!first) first = now;
        else frames++;
        if (now - first < 5000) requestAnimationFrame(frame);
        else
          probe.frames.push({
            fps: (frames / (now - first)) * 1000,
            visible: document.visibilityState === "visible",
            focused: document.hasFocus(),
          });
      };
      requestAnimationFrame(frame);
    };
    sample();
    probe.timer = setInterval(() => {
      probe.visibility.push({
        at: performance.now() - probe.started,
        visible: document.visibilityState === "visible",
        focused: document.hasFocus(),
      });
      sample();
    }, 30000);
  });
}
async function readProbe(page) {
  return page.evaluate(() => {
    const p = window.__performanceValidation;
    clearInterval(p.timer);
    const percentile = (a, q) => {
      a.sort((x, y) => x - y);
      return a[Math.max(0, Math.ceil(a.length * q) - 1)] ?? null;
    };
    const vm = document.querySelector(".app-content").__vue__;
    return {
      frames: p.frames,
      visibility: p.visibility,
      pointsStart: p.pointsStart,
      pointsEnd: vm.gasdata?.data?.length || 0,
      updates: Object.fromEntries(
        Object.entries(p.updates).map(([name, a]) => [
          name,
          { count: a.length, p95: percentile(a, 0.95), max: Math.max(...a) },
        ])
      ),
      actualMs: performance.now() - p.started,
    };
  });
}
async function trace(page) {
  const client = await page.context().newCDPSession(page);
  await client.send("Tracing.start", {
    categories: "devtools.timeline,blink.user_timing",
    transferMode: "ReturnAsStream",
  });
  await sleep(15000);
  const complete = new Promise((resolve) => client.once("Tracing.tracingComplete", resolve));
  await client.send("Tracing.end");
  const { stream } = await complete;
  const destination = fs.openSync(output + "/performance-chrome-trace.json", "w");
  try {
    while (true) {
      const chunk = await client.send("IO.read", { handle: stream });
      fs.writeSync(
        destination,
        chunk.base64Encoded ? Buffer.from(chunk.data, "base64") : chunk.data
      );
      if (chunk.eof) break;
    }
  } finally {
    fs.closeSync(destination);
    await client.send("IO.close", { handle: stream });
    await client.detach();
  }
}
try {
  for (let i = 0; i < 40; i++) {
    try {
      if ((await fetch(base + "/health")).ok) break;
    } catch {}
    await sleep(500);
  }
  browser = await chromium.launch({ channel: "chrome", headless: false });
  report.browser = browser.version();
  await admin(
    "/api/admin/simulator/config",
    { pointsPerSecond: 20, batchIntervalMs: 250, pattern: "circle" },
    "PATCH"
  );
  if (!resume) await sleep(20000); // Ensure the initial snapshot contains the same 300-point window for all runs.
  for (let run = 0; run < (resume ? 0 : 6); run++) {
    const enabled = run % 2 === 1;
    const { page, context } = await loggedPage(enabled);
    const uploads = [];
    page.on("response", (r) => {
      if (r.url().includes("/api/performance/batches")) uploads.push(r.status());
    });
    await installProbe(page);
    const start = Date.now();
    console.log(
      JSON.stringify({ event: "run-start", run: run + 1, enabled, durationMs: duration })
    );
    const heartbeat = setInterval(
      () =>
        console.log(
          JSON.stringify({
            event: "run-progress",
            run: run + 1,
            elapsedSeconds: Math.round((Date.now() - start) / 1000),
          })
        ),
      60000
    );
    try {
      await sleep(duration);
    } finally {
      clearInterval(heartbeat);
    }
    const data = await readProbe(page);
    report.runs.push({ run: run + 1, enabled, ...data, uploads });
    save();
    console.log(
      JSON.stringify({
        event: "run-complete",
        run: run + 1,
        enabled,
        pointsEnd: data.pointsEnd,
        fps: data.frames.map((f) => f.fps),
      })
    );
    await context.close();
  }
  const { page, context } = await loggedPage(true);
  // Real DevTools trace is a diagnostic cross-check, kept outside the A/B measurement windows.
  await trace(page);
  console.log(JSON.stringify({ event: "trace-complete" }));
  const tools = page.getByRole("button", { name: "切换工具栏", exact: true });
  const threeD = page.getByRole("button", { name: "3D", exact: true });
  if (!(await threeD.isVisible())) await tools.click();
  await threeD.click();
  await sleep(15000);
  for (const rate of [20, 100, 500]) {
    await admin("/api/admin/simulator/config", { pointsPerSecond: rate }, "PATCH");
    await installProbe(page);
    const stageMs = rate === 20 ? 300000 : 30000;
    for (let elapsed = 0; elapsed < stageMs; elapsed += 30000) {
      await sleep(Math.min(30000, stageMs - elapsed));
      console.log(
        JSON.stringify({
          event: "stress-progress",
          pointsPerSecond: rate,
          elapsedSeconds: (elapsed + 30000) / 1000,
        })
      );
    }
    report.stress.push({ mapType: "3d", pointsPerSecond: rate, ...(await readProbe(page)) });
    console.log(JSON.stringify({ event: "stress-complete", pointsPerSecond: rate }));
    save();
  }
  await context.close();
  const median = (a) => {
    const b = a.slice().sort((x, y) => x - y);
    return b[Math.floor(b.length / 2)];
  };
  const values = (enabled) => report.runs.filter((r) => r.enabled === enabled);
  const fps = (enabled) =>
    median(
      values(enabled)
        .map((r) => {
          const valid = r.frames.filter((f) => f.visible && f.focused);
          return valid.length ? valid.reduce((s, f) => s + f.fps, 0) / valid.length : null;
        })
        .filter((x) => x !== null)
    );
  const off = fps(false),
    on = fps(true);
  report.comparison = {
    fpsOff: off,
    fpsOn: on,
    fpsRelativeDrop: off ? (off - on) / off : null,
    components: {},
  };
  for (const name of Object.keys(report.runs[0].updates)) {
    const baseline = median(
        values(false)
          .map((r) => r.updates[name]?.p95)
          .filter((x) => x != null)
      ),
      instrumented = median(
        values(true)
          .map((r) => r.updates[name]?.p95)
          .filter((x) => x != null)
      );
    report.comparison.components[name] = {
      baselineP95: baseline,
      instrumentedP95: instrumented,
      increase: instrumented - baseline,
      budget: Math.max(1, baseline * 0.05),
      withinBudget: instrumented - baseline <= Math.max(1, baseline * 0.05),
    };
  }
  report.endedAt = new Date().toISOString();
  save();
  console.log(JSON.stringify({ event: "complete", comparison: report.comparison }));
} catch (error) {
  report.failure = String(error);
  save();
  console.error(error);
  process.exitCode = 1;
} finally {
  if (browser) await browser.close();
  server.kill();
  fs.closeSync(logfile);
}
