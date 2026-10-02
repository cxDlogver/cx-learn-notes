import { spawn } from "node:child_process";
import { Buffer } from "node:buffer";
import { createHash } from "node:crypto";
import {
  mkdir,
  mkdtemp,
  readFile,
  realpath,
  rm,
  writeFile,
} from "node:fs/promises";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { dirname, join, resolve, sep } from "node:path";
import process from "node:process";
import { clearTimeout, setTimeout } from "node:timers";
import { setTimeout as delay } from "node:timers/promises";
import { URL } from "node:url";

const workspace = resolve(import.meta.dirname, "..");
const args = new Map();
for (let index = 2; index < process.argv.length; index += 2) {
  args.set(process.argv[index], process.argv[index + 1]);
}
const targetUrl = args.get("--url");
const outputDirectory = args.get("--out");
if (!targetUrl || !outputDirectory) {
  throw new Error(
    "Usage: node scripts/web-browser-capture.mjs --url URL --out DIR [--width 390 --height 844 --browser chrome --steps FILE]",
  );
}
const output = resolve(outputDirectory);
if (!output.startsWith(workspace + sep)) {
  throw new Error("--out must be inside the project workspace");
}
const width = Number(args.get("--width") ?? 390);
const height = Number(args.get("--height") ?? 844);
if (
  !Number.isInteger(width) ||
  width < 240 ||
  !Number.isInteger(height) ||
  height < 320
) {
  throw new Error(
    "viewport must be whole CSS pixels with width >= 240 and height >= 320",
  );
}
const browser = args.get("--browser") ?? "chrome";
const executables = {
  chrome: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  edge: "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
};
const executable = executables[browser];
if (!executable) throw new Error("--browser must be chrome or edge");
const parsedUrl = new URL(targetUrl);
if (!["http:", "https:", "data:"].includes(parsedUrl.protocol)) {
  throw new Error(
    "URL must use http, https, or synthetic data for tool self-tests",
  );
}
const frozenNowUtc = args.get("--frozen-now");
if (frozenNowUtc) {
  if (
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(frozenNowUtc) ||
    Number.isNaN(new Date(frozenNowUtc).valueOf()) ||
    (parsedUrl.protocol !== "data:" &&
      !["127.0.0.1", "localhost"].includes(parsedUrl.hostname))
  )
    throw new Error(
      "--frozen-now requires exact UTC time and a synthetic or loopback page",
    );
}
const canonicalFrozenNow = frozenNowUtc
  ? new Date(frozenNowUtc).toISOString()
  : null;
const browserTimezone = args.get("--timezone") ?? "Asia/Shanghai";
try {
  new Intl.DateTimeFormat("en", { timeZone: browserTimezone });
} catch {
  throw new Error("--timezone must be a valid IANA timezone");
}
const stepsPath = args.get("--steps");
let steps = [];
if (stepsPath) {
  const resolved = resolve(stepsPath);
  if (!resolved.startsWith(workspace + sep))
    throw new Error("--steps must be inside the project workspace");
  steps = JSON.parse(await readFile(resolved, "utf8"));
  if (!Array.isArray(steps) || steps.length > 100)
    throw new Error("steps must be an array of at most 100 actions");
}

async function freePort() {
  const server = createServer();
  await new Promise((done) => server.listen(0, "127.0.0.1", done));
  const port = server.address().port;
  await new Promise((done) => server.close(done));
  return port;
}

async function getJson(url) {
  const response = await globalThis.fetch(url);
  if (!response.ok) throw new Error(`CDP HTTP ${response.status}`);
  return response.json();
}

class Cdp {
  constructor(socket) {
    this.socket = socket;
    this.nextId = 1;
    this.pending = new Map();
    this.events = [];
    this.requests = new Map();
    this.network = [];
    this.dropNextOneTimeResponse = false;
    this.failNextMediaComplete = false;
    this.actionTrace = null;
    socket.addEventListener("message", (event) => {
      const message = JSON.parse(event.data);
      if (!message.id) {
        if (message.method === "Fetch.requestPaused") {
          const paused = message.params;
          let oneTimeWrite = false;
          let mediaComplete = false;
          try {
            const path = new URL(paused.request.url).pathname;
            oneTimeWrite =
              /^\/api\/v1\/plans\/[a-f\d-]{36}\/one-time-resolution$/.test(
                path,
              ) && ["POST", "PATCH"].includes(paused.request.method);
            mediaComplete =
              /^\/api\/v1\/media\/[a-f\d-]{36}\/complete$/.test(path) &&
              paused.request.method === "POST";
          } catch {
            /* unexpected request URL is continued below */
          }
          if (
            this.failNextMediaComplete &&
            mediaComplete &&
            paused.responseStatusCode === undefined
          ) {
            this.failNextMediaComplete = false;
            this.actionTrace?.push({
              action: "media-complete-request-blocked",
              at: new Date().toISOString(),
            });
            void this.command("Fetch.failRequest", {
              requestId: paused.requestId,
              errorReason: "Failed",
            }).catch(() => {});
          } else if (
            this.dropNextOneTimeResponse &&
            oneTimeWrite &&
            paused.responseStatusCode >= 200 &&
            paused.responseStatusCode < 300
          ) {
            this.dropNextOneTimeResponse = false;
            this.actionTrace?.push({
              action: "response-dropped-after-server",
              serverStatus: paused.responseStatusCode,
              at: new Date().toISOString(),
            });
            void this.command("Fetch.failRequest", {
              requestId: paused.requestId,
              errorReason: "Failed",
            }).catch(() => {});
          } else
            void this.command("Fetch.continueRequest", {
              requestId: paused.requestId,
            }).catch(() => {});
        }
        if (message.method === "Network.requestWillBeSent") {
          try {
            const requested = new URL(message.params.request.url);
            const path = requested.pathname;
            if (path.startsWith("/api/v1/")) {
              const key = Object.entries(
                message.params.request.headers ?? {},
              ).find(([name]) => name.toLowerCase() === "idempotency-key")?.[1];
              this.requests.set(message.params.requestId, {
                path,
                method: message.params.request.method,
                ...(typeof key === "string"
                  ? {
                      operationKeySha256: createHash("sha256")
                        .update(key)
                        .digest("hex"),
                    }
                  : {}),
              });
            } else if (
              ["127.0.0.1", "localhost"].includes(requested.hostname) &&
              requested.port === "19000"
            )
              this.requests.set(message.params.requestId, {
                path: "[object-store]",
                method: message.params.request.method,
              });
          } catch {
            /* CDP may report a non-URL resource */
          }
        }
        if (message.method === "Network.responseReceived") {
          const request = this.requests.get(message.params.requestId);
          if (request) {
            this.network.push({
              ...request,
              status: message.params.response.status,
              mimeType: message.params.response.mimeType,
              at: new Date().toISOString(),
            });
            this.requests.delete(message.params.requestId);
          }
        }
        if (message.method === "Network.loadingFailed") {
          const request = this.requests.get(message.params.requestId);
          if (request) {
            this.network.push({
              ...request,
              status: 0,
              mimeType: "",
              at: new Date().toISOString(),
            });
            this.requests.delete(message.params.requestId);
          }
        }
        if (
          [
            "Runtime.consoleAPICalled",
            "Log.entryAdded",
            "Network.loadingFailed",
          ].includes(message.method)
        ) {
          this.events.push({
            method: message.method,
            at: new Date().toISOString(),
          });
        }
        return;
      }
      const waiting = this.pending.get(message.id);
      if (!waiting) return;
      this.pending.delete(message.id);
      if (message.error) waiting.reject(new Error(message.error.message));
      else waiting.resolve(message.result ?? {});
    });
  }

  command(method, params = {}) {
    const id = this.nextId++;
    return new Promise((resolvePromise, reject) => {
      const timeout = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`CDP timeout: ${method}`));
      }, 15000);
      this.pending.set(id, {
        resolve: (value) => {
          clearTimeout(timeout);
          resolvePromise(value);
        },
        reject: (error) => {
          clearTimeout(timeout);
          reject(error);
        },
      });
      this.socket.send(JSON.stringify({ id, method, params }));
    });
  }

  async evaluate(expression) {
    const response = await this.command("Runtime.evaluate", {
      expression,
      returnByValue: true,
      awaitPromise: true,
    });
    if (response.exceptionDetails)
      throw new Error(response.exceptionDetails.text);
    return response.result.value;
  }
}

async function connect(url) {
  const socket = new globalThis.WebSocket(url);
  await new Promise((done, fail) => {
    const timeout = setTimeout(
      () => fail(new Error("WebSocket connection timeout")),
      10000,
    );
    socket.addEventListener(
      "open",
      () => {
        clearTimeout(timeout);
        done();
      },
      { once: true },
    );
    socket.addEventListener(
      "error",
      () => {
        clearTimeout(timeout);
        fail(new Error("WebSocket connection failed"));
      },
      { once: true },
    );
  });
  return new Cdp(socket);
}

const profile = await mkdtemp(join(tmpdir(), "plan-checkin-web-cdp-"));
const port = await freePort();
let processHandle;
let cdp;
try {
  await mkdir(output, { recursive: true });
  processHandle = spawn(
    executable,
    [
      "--headless=new",
      "--disable-gpu",
      "--no-first-run",
      "--no-default-browser-check",
      `--remote-debugging-port=${port}`,
      `--user-data-dir=${profile}`,
      "about:blank",
    ],
    { windowsHide: true, stdio: "ignore" },
  );
  let page;
  for (let attempt = 0; attempt < 60; attempt += 1) {
    if (processHandle.exitCode !== null)
      throw new Error("browser exited before CDP became ready");
    try {
      const pages = await getJson(`http://127.0.0.1:${port}/json/list`);
      page = pages.find((item) => item.type === "page");
      if (page) break;
    } catch {
      /* browser still starting */
    }
    await delay(250);
  }
  if (!page) throw new Error("browser CDP page did not become ready");
  cdp = await connect(page.webSocketDebuggerUrl);
  await Promise.all([
    cdp.command("Page.enable"),
    cdp.command("Runtime.enable"),
    cdp.command("DOM.enable"),
    cdp.command("Accessibility.enable"),
    cdp.command("Log.enable"),
    cdp.command("Network.enable"),
  ]);
  if (args.get("--allow-local-certificate") === "true") {
    if (!(
      ["localhost", "127.0.0.1"].includes(parsedUrl.hostname) ||
      /^(?:10\.|192\.168\.|172\.(?:1[6-9]|2\d|3[01])\.)/.test(
        parsedUrl.hostname,
      )
    ))
      throw new Error(
        "Certificate exception is restricted to isolated local network probes",
      );
    await cdp.command("Security.setIgnoreCertificateErrors", { ignore: true });
  }
  await cdp.command("Emulation.setDeviceMetricsOverride", {
    width,
    height,
    deviceScaleFactor: 1,
    mobile: width < 768,
  });
  await cdp.command("Emulation.setTimezoneOverride", {
    timezoneId: browserTimezone,
  });
  if (frozenNowUtc)
    await cdp.command("Page.addScriptToEvaluateOnNewDocument", {
      source: `(() => {
        const NativeDate = globalThis.Date;
        const frozen = NativeDate.parse(${JSON.stringify(canonicalFrozenNow)});
        class FrozenDate extends NativeDate {
          constructor(...args) { super(...(args.length ? args : [frozen])); }
          static now() { return frozen; }
        }
        globalThis.Date = FrozenDate;
      })();`,
    });
  await cdp.command("Page.navigate", { url: targetUrl });
  let ready = false;
  for (let attempt = 0; attempt < 80; attempt += 1) {
    ready = await cdp.evaluate('document.readyState === "complete"');
    if (ready) break;
    await delay(100);
  }
  if (!ready) throw new Error("page did not finish loading");
  const observedPageNow = await cdp.evaluate("new Date().toISOString()");
  if (canonicalFrozenNow && observedPageNow !== canonicalFrozenNow)
    throw new Error(
      "browser page clock was not frozen at the requested instant",
    );
  await cdp.evaluate("document.fonts.ready.then(() => true)");
  const before = await cdp.command("Page.captureScreenshot", {
    format: "png",
    captureBeyondViewport: false,
  });
  await writeFile(
    join(output, "screen-before.png"),
    Buffer.from(before.data, "base64"),
  );
  const capturedAtForStub = new Date().toISOString();
  const actionTrace = [];
  cdp.actionTrace = actionTrace;
  const intermediateFiles = [];
  for (const [index, step] of steps.entries()) {
    if (step?.action === "viewport") {
      if (
        !Number.isInteger(step.width) ||
        step.width < 240 ||
        !Number.isInteger(step.height) ||
        step.height < 320
      )
        throw new Error("Invalid responsive probe viewport");
      await cdp.command("Emulation.setDeviceMetricsOverride", {
        width: step.width,
        height: step.height,
        deviceScaleFactor: 1,
        mobile: step.width < 768,
      });
      actionTrace.push({
        action: step.action,
        width: step.width,
        height: step.height,
        at: new Date().toISOString(),
      });
      continue;
    }
    if (step?.action === "color-scheme") {
      if (!["light", "dark"].includes(step.value))
        throw new Error("Invalid probe color scheme");
      await cdp.command("Emulation.setEmulatedMedia", {
        features: [{ name: "prefers-color-scheme", value: step.value }],
      });
      actionTrace.push({
        action: step.action,
        value: step.value,
        at: new Date().toISOString(),
      });
      continue;
    }

    if (step?.action === "probe-private-media") {
      if (
        !["127.0.0.1", "localhost"].includes(parsedUrl.hostname) ||
        process.env.APP_ENV !== "development" ||
        process.env.WEB_ATDD_SMS_STUB !== "1" ||
        !/^[a-f\d-]{36}$/.test(step.mediaId ?? "") ||
        ![200, 404].includes(step.expectedStatus)
      )
        throw new Error(
          "private media probe requires isolated loopback Web ATDD",
        );
      const status = await cdp.evaluate(`(async () => {
        const media = await import('/src/data/api.ts');
        try {
          await media.getPrivateMediaDownload(${JSON.stringify(step.mediaId)});
          return 200;
        } catch (error) {
          return typeof error?.status === 'number' ? error.status : 0;
        }
      })()`);
      if (status !== step.expectedStatus)
        throw new Error(`private media status ${status} at step ${index + 1}`);
      actionTrace.push({
        action: step.action,
        mediaId: "[other-user-media]",
        status,
        at: new Date().toISOString(),
      });
      continue;
    }
    if (step?.action === "fail-next-media-complete") {
      if (
        !["127.0.0.1", "localhost"].includes(parsedUrl.hostname) ||
        process.env.APP_ENV !== "development" ||
        process.env.WEB_ATDD_SMS_STUB !== "1" ||
        cdp.failNextMediaComplete
      )
        throw new Error("media failure requires isolated loopback Web ATDD");
      await cdp.command("Fetch.enable", {
        patterns: [
          {
            urlPattern: "*api/v1/media/*/complete",
            requestStage: "Request",
          },
        ],
      });
      cdp.failNextMediaComplete = true;
      actionTrace.push({ action: step.action, at: new Date().toISOString() });
      continue;
    }
    if (step?.action === "drop-next-one-time-response") {
      if (
        !["127.0.0.1", "localhost"].includes(parsedUrl.hostname) ||
        process.env.APP_ENV !== "development" ||
        process.env.WEB_ATDD_SMS_STUB !== "1" ||
        cdp.dropNextOneTimeResponse
      )
        throw new Error("response drop requires isolated loopback Web ATDD");
      await cdp.command("Fetch.enable", {
        patterns: [
          {
            urlPattern: "*api/v1/plans/*/one-time-resolution",
            requestStage: "Response",
          },
        ],
      });
      cdp.dropNextOneTimeResponse = true;
      actionTrace.push({
        action: step.action,
        at: new Date().toISOString(),
      });
      continue;
    }
    if (
      step?.action === "network-offline" ||
      step?.action === "network-online"
    ) {
      if (
        !["127.0.0.1", "localhost"].includes(parsedUrl.hostname) ||
        process.env.APP_ENV !== "development" ||
        process.env.WEB_ATDD_SMS_STUB !== "1"
      )
        throw new Error("network toggle requires isolated loopback Web ATDD");
      await cdp.command("Network.emulateNetworkConditions", {
        offline: step.action === "network-offline",
        latency: 0,
        downloadThroughput: 0,
        uploadThroughput: 0,
      });
      actionTrace.push({ action: step.action, at: new Date().toISOString() });
      await delay(100);
      continue;
    }
    if (step?.action === "upload-file") {
      if (
        typeof step.selector !== "string" ||
        typeof step.file !== "string" ||
        (step.count !== undefined &&
          (!Number.isInteger(step.count) || step.count < 1 || step.count > 10))
      )
        throw new Error(`invalid file upload at step ${index + 1}`);
      const filePath = await realpath(resolve(step.file));
      if (!filePath.startsWith(workspace + sep))
        throw new Error("file upload must be inside the project workspace");
      if (!/\.(png|jpe?g|webp|heic)$/i.test(filePath))
        throw new Error("file upload requires an image fixture");
      if ((await readFile(filePath)).length > 1_000_000)
        throw new Error("browser evidence image fixture is too large");
      const root = await cdp.command("DOM.getDocument");
      const node = await cdp.command("DOM.querySelector", {
        nodeId: root.root.nodeId,
        selector: step.selector,
      });
      if (!node.nodeId)
        throw new Error(`file input unavailable at step ${index + 1}`);
      await cdp.command("DOM.setFileInputFiles", {
        nodeId: node.nodeId,
        files: Array(step.count ?? 1).fill(filePath),
      });
      actionTrace.push({
        action: "upload-file",
        selector: step.selector,
        fixture: "[workspace-image]",
        fileCount: step.count ?? 1,
        at: new Date().toISOString(),
      });
      await delay(100);
      continue;
    }
    if (step?.action === "upload-oversize-fixture") {
      if (
        typeof step.selector !== "string" ||
        !["127.0.0.1", "localhost"].includes(parsedUrl.hostname) ||
        process.env.APP_ENV !== "development" ||
        process.env.WEB_ATDD_SMS_STUB !== "1"
      )
        throw new Error("oversize fixture requires isolated loopback Web ATDD");
      const filePath = join(profile, "oversize-20mb.png");
      const fileBytes = Buffer.alloc(20 * 1024 * 1024 + 1);
      const validPng = await readFile(
        join(workspace, "docs/atdd/web/fixtures/checkin-green.png"),
      );
      validPng.copy(fileBytes);
      await writeFile(filePath, fileBytes);
      const root = await cdp.command("DOM.getDocument");
      const node = await cdp.command("DOM.querySelector", {
        nodeId: root.root.nodeId,
        selector: step.selector,
      });
      if (!node.nodeId)
        throw new Error(`file input unavailable at step ${index + 1}`);
      await cdp.command("DOM.setFileInputFiles", {
        nodeId: node.nodeId,
        files: [filePath],
      });
      actionTrace.push({
        action: step.action,
        selector: step.selector,
        fixture: "[generated-oversize-image]",
        bytes: fileBytes.length,
        at: new Date().toISOString(),
      });
      await delay(100);
      continue;
    }
    if (step?.action === "snapshot") {
      if (!/^[a-z0-9-]{1,32}$/.test(step.label ?? ""))
        throw new Error(`invalid snapshot label at step ${index + 1}`);
      const filename = `screen-${step.label}.png`;
      if (intermediateFiles.includes(filename))
        throw new Error(`duplicate snapshot label at step ${index + 1}`);
      await cdp.evaluate("document.fonts.ready.then(() => true)");
      const layout = await cdp.evaluate(`(() => {
        const root = document.documentElement;
        const container = document.querySelector('.app-layout,.auth-layout,.loading-screen');
        const bounds = container?.getBoundingClientRect();
        const navigation = document.querySelector('.bottom-nav');
        const controls = [...document.querySelectorAll('button,a,input,select,textarea')];
        const outside = controls.filter((node) => { const box = node.getBoundingClientRect(); return box.width > 0 && box.height > 0 && (box.right > innerWidth + .5 || box.left < -.5); });
        return { pathname: location.pathname, viewport: { width: innerWidth, height: innerHeight }, documentWidth: root.scrollWidth,
          horizontalOverflow: root.scrollWidth > innerWidth, controlsOutsideViewportWidth: outside.length,
          container: bounds ? { width: bounds.width, left: bounds.left, right: bounds.right, top: bounds.top } : null,
          bodyFont: getComputedStyle(document.body).fontFamily, fontLoaded: [...document.fonts].some((font) => font.family === 'Noto Sans SC' && font.status === 'loaded'),
          background: getComputedStyle(root).backgroundColor, surface: getComputedStyle(root).getPropertyValue('--ui-surface').trim(),
          navigationLabels: navigation ? [...navigation.querySelectorAll('.bottom-link')].map((link) => link.textContent.trim()) : [],
          theme: matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light',
          modalOpen: Boolean(document.querySelector('dialog[open]')) };
      })()`);
      const layoutFilename = `layout-${step.label}.json`;
      await writeFile(
        join(output, layoutFilename),
        `${JSON.stringify(layout, null, 2)}\n`,
      );
      intermediateFiles.push(layoutFilename);
      const frame = await cdp.command("Page.captureScreenshot", {
        format: "png",
        captureBeyondViewport: false,
      });
      await writeFile(
        join(output, filename),
        Buffer.from(frame.data, "base64"),
      );
      intermediateFiles.push(filename);
      actionTrace.push({
        action: "snapshot",
        label: step.label,
        at: new Date().toISOString(),
      });
      continue;
    }
    if (step?.action === "history-back") {
      const history = await cdp.command("Page.getNavigationHistory");
      const prior = history.entries?.[history.currentIndex - 1];
      if (!prior) throw new Error("No prior browser history entry");
      await cdp.command("Page.navigateToHistoryEntry", { entryId: prior.id });
      actionTrace.push({
        action: "history-back",
        at: new Date().toISOString(),
      });
      await delay(200);
      continue;
    }
    if (step?.action === "reload") {
      await cdp.command("Page.reload", { ignoreCache: true });
      actionTrace.push({ action: "reload", at: new Date().toISOString() });
      await delay(200);
      continue;
    }
    if (step?.action === "advance-clock") {
      if (
        !["127.0.0.1", "localhost"].includes(parsedUrl.hostname) ||
        process.env.APP_ENV !== "development" ||
        process.env.WEB_ATDD_SMS_STUB !== "1" ||
        !Number.isInteger(step.offsetMs) ||
        step.offsetMs < 0 ||
        step.offsetMs > 3_600_000
      )
        throw new Error("clock advance requires isolated loopback Web ATDD");
      await cdp.evaluate(`(() => {
        const originalNow = Date.now.bind(Date);
        Date.now = () => originalNow() + ${step.offsetMs};
        return Date.now();
      })()`);
      actionTrace.push({
        action: "advance-clock",
        offsetMs: step.offsetMs,
        at: new Date().toISOString(),
      });
      continue;
    }
    if (step?.action === "wait-for-absence") {
      if (typeof step.selector !== "string" || !step.selector)
        throw new Error(`invalid absence selector at step ${index + 1}`);
      let absent = false;
      for (let attempt = 0; attempt < 50; attempt += 1) {
        absent = await cdp.evaluate(
          `!document.querySelector(${JSON.stringify(step.selector)})`,
        );
        if (absent) break;
        await delay(100);
      }
      if (!absent) throw new Error(`selector remained at step ${index + 1}`);
      actionTrace.push({
        action: "wait-for-absence",
        selector: step.selector,
        at: new Date().toISOString(),
      });
      continue;
    }
    if (step?.action === "wait-for-text") {
      if (
        typeof step.selector !== "string" ||
        !step.selector ||
        typeof step.text !== "string" ||
        !step.text ||
        step.text.length > 120
      )
        throw new Error(`invalid text wait at step ${index + 1}`);
      let found = false;
      for (let attempt = 0; attempt < 50; attempt += 1) {
        found = await cdp.evaluate(`(() => {
          const node = document.querySelector(${JSON.stringify(step.selector)});
          return !!node && (node.textContent ?? '').includes(${JSON.stringify(step.text)});
        })()`);
        if (found) break;
        await delay(100);
      }
      if (!found) throw new Error(`text not found at step ${index + 1}`);
      actionTrace.push({
        action: "wait-for-text",
        selector: step.selector,
        expectedText: step.text,
        at: new Date().toISOString(),
      });
      continue;
    }
    if (step?.action === "wait-for-image") {
      if (typeof step.selector !== "string" || !step.selector)
        throw new Error(`invalid image selector at step ${index + 1}`);
      let loaded = false;
      for (let attempt = 0; attempt < 50; attempt += 1) {
        loaded = await cdp.evaluate(`(() => {
          const image = document.querySelector(${JSON.stringify(step.selector)});
          return image instanceof HTMLImageElement && image.complete && image.naturalWidth > 0;
        })()`);
        if (loaded) break;
        await delay(100);
      }
      if (!loaded) throw new Error(`image did not load at step ${index + 1}`);
      actionTrace.push({
        action: step.action,
        selector: step.selector,
        at: new Date().toISOString(),
      });
      continue;
    }
    if (step?.action === "set-date") {
      if (
        typeof step.selector !== "string" ||
        !/^\d{4}-\d{2}-\d{2}$/.test(step.value ?? "")
      )
        throw new Error(`invalid date input at step ${index + 1}`);
      const changed = await cdp.evaluate(`(() => {
        const field = document.querySelector(${JSON.stringify(step.selector)});
        if (!(field instanceof HTMLInputElement) || field.type !== 'date') return false;
        const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
        setter.call(field, ${JSON.stringify(step.value)});
        field.dispatchEvent(new Event('input', {bubbles: true}));
        field.dispatchEvent(new Event('change', {bubbles: true}));
        return field.value === ${JSON.stringify(step.value)};
      })()`);
      if (!changed)
        throw new Error(`date input unavailable at step ${index + 1}`);
      actionTrace.push({
        action: "set-date",
        selector: step.selector,
        value: step.value,
        at: new Date().toISOString(),
      });
      await delay(100);
      continue;
    }
    if (
      step?.action === "select-option" ||
      step?.action === "select-option-index"
    ) {
      if (
        typeof step.selector !== "string" ||
        (step.action === "select-option" &&
          (typeof step.value !== "string" || step.value.length > 100)) ||
        (step.action === "select-option-index" &&
          (!Number.isInteger(step.index) || step.index < 0 || step.index > 20))
      )
        throw new Error(`invalid select option at step ${index + 1}`);
      const chosen = await cdp.evaluate(`(() => {
        const field = document.querySelector(${JSON.stringify(step.selector)});
        const value = ${step.action === "select-option" ? JSON.stringify(step.value) : `field?.options[${step.index}]?.value`};
        if (!(field instanceof HTMLSelectElement) || ![...field.options].some((option) => option.value === value)) return false;
        const setter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value').set;
        setter.call(field, value);
        field.dispatchEvent(new Event('input', {bubbles: true}));
        field.dispatchEvent(new Event('change', {bubbles: true}));
        return true;
      })()`);
      if (!chosen)
        throw new Error(`select option unavailable at step ${index + 1}`);
      actionTrace.push({
        action: step.action,
        selector: step.selector,
        ...(step.action === "select-option"
          ? { value: step.value }
          : { index: step.index }),
        at: new Date().toISOString(),
      });
      await delay(100);
      continue;
    }
    if (
      !step ||
      !["click", "type", "replace", "wait-for", "type-stub-code"].includes(
        step.action,
      )
    )
      throw new Error(`unsupported action at step ${index + 1}`);
    if (typeof step.selector !== "string" || !step.selector)
      throw new Error(`missing selector at step ${index + 1}`);
    let box;
    for (let attempt = 0; attempt < 50; attempt += 1) {
      box = await cdp.evaluate(`(() => {
        const node = document.querySelector(${JSON.stringify(step.selector)});
        if (!node) return null;
        node.scrollIntoView({block: 'center'});
        const rect = node.getBoundingClientRect();
        return rect.width && rect.height ? {x: rect.x + rect.width / 2, y: rect.y + rect.height / 2} : null;
      })()`);
      if (box) break;
      await delay(100);
    }
    if (!box) throw new Error(`selector unavailable at step ${index + 1}`);
    if (
      step.action === "click" ||
      step.action === "type" ||
      step.action === "replace" ||
      step.action === "type-stub-code"
    ) {
      await cdp.command("Input.dispatchMouseEvent", {
        type: "mousePressed",
        x: box.x,
        y: box.y,
        button: "left",
        clickCount: 1,
      });
      await cdp.command("Input.dispatchMouseEvent", {
        type: "mouseReleased",
        x: box.x,
        y: box.y,
        button: "left",
        clickCount: 1,
      });
    }
    if (step.action === "type" || step.action === "replace") {
      if (typeof step.text !== "string")
        throw new Error(`missing text at step ${index + 1}`);
      if (step.action === "replace") {
        await cdp.command("Input.dispatchKeyEvent", {
          type: "keyDown",
          key: "a",
          code: "KeyA",
          windowsVirtualKeyCode: 65,
          modifiers: 2,
        });
        await cdp.command("Input.dispatchKeyEvent", {
          type: "keyUp",
          key: "a",
          code: "KeyA",
          windowsVirtualKeyCode: 65,
          modifiers: 2,
        });
      }
      await cdp.command("Input.insertText", { text: step.text });
    }
    if (step.action === "type-stub-code") {
      const purpose = step.purpose ?? "login";
      if (
        !["127.0.0.1", "localhost"].includes(parsedUrl.hostname) ||
        process.env.APP_ENV !== "development" ||
        process.env.SMS_PROVIDER !== "stub" ||
        process.env.WEB_ATDD_SMS_STUB !== "1" ||
        !/^\d{4}$/.test(step.expectedPhoneLast4 ?? "") ||
        !["login", "change_phone_old", "change_phone_new"].includes(purpose)
      )
        throw new Error(
          "SMS stub input is restricted to isolated loopback Web ATDD",
        );
      const outbox = new URL(
        `../apps/api/.local/sms-outbox-${purpose}.json`,
        import.meta.url,
      );
      let message;
      for (let attempt = 0; attempt < 50; attempt += 1) {
        try {
          const candidate = JSON.parse(await readFile(outbox, "utf8"));
          if (
            candidate.purpose === purpose &&
            candidate.phoneE164?.endsWith(step.expectedPhoneLast4) &&
            /^\d{6}$/.test(candidate.code ?? "") &&
            Date.parse(candidate.createdAt) >= Date.parse(capturedAtForStub)
          ) {
            message = candidate;
            break;
          }
        } catch {
          /* wait for the isolated SMS stub output */
        }
        await delay(100);
      }
      if (!message)
        throw new Error("Fresh isolated SMS stub code not available");
      await cdp.command("Input.insertText", { text: message.code });
    }
    actionTrace.push({
      action: step.action,
      selector: step.selector,
      ...(["type", "replace"].includes(step.action)
        ? { characters: step.text.length }
        : {}),
      ...(step.action === "type-stub-code" ? { characters: 6 } : {}),
      at: new Date().toISOString(),
    });
    await delay(100);
  }
  const screenshot = await cdp.command("Page.captureScreenshot", {
    format: "png",
    captureBeyondViewport: false,
  });
  const html = await cdp.evaluate(`(() => {
    const clone = document.documentElement.cloneNode(true);
    for (const field of clone.querySelectorAll('input,textarea')) {
      field.removeAttribute('value');
      if (field.tagName === 'TEXTAREA') field.textContent = '';
    }
    for (const node of clone.querySelectorAll('img[src],a[href]')) {
      const attribute = node.tagName === 'IMG' ? 'src' : 'href';
      if (/[?&](?:X-Amz-Signature|Signature|AWSAccessKeyId)=/i.test(node.getAttribute(attribute) ?? ''))
        node.setAttribute(attribute, '[REDACTED_SIGNED_URL]');
    }
    return clone.outerHTML;
  })()`);
  const accessibility = await cdp.command("Accessibility.getFullAXTree");
  for (const node of accessibility.nodes ?? []) {
    if (
      node.value &&
      ["textField", "textBox", "searchBox"].includes(node.role?.value)
    ) {
      node.value = { type: node.value.type, value: "[REDACTED]" };
    }
  }
  const visual = await cdp.evaluate(`(() => {
    const root = document.documentElement;
    const controls = [...document.querySelectorAll('button,a,input,select,textarea')];
    const inaccessible = controls.filter((node) => {
      const box = node.getBoundingClientRect();
      return box.width > 0 && box.height > 0 && (box.right > innerWidth || box.left < 0);
    }).length;
    return {
      innerWidth, innerHeight, documentWidth: root.scrollWidth,
      documentHeight: root.scrollHeight, horizontalOverflow: root.scrollWidth > innerWidth,
      controlsOutsideViewportWidth: inaccessible,
      colorScheme: matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
    };
  })()`);
  const storage = await cdp.evaluate(`({
    localStorageKeys: Object.keys(localStorage).sort(),
    sessionStorageKeys: Object.keys(sessionStorage).sort(),
    readableCookieNames: document.cookie.split(';').map((part) => part.trim().split('=')[0]).filter(Boolean).sort(),
    pathname: location.pathname
  })`);
  const cookieResponse = await cdp.command("Network.getAllCookies");
  const cookieMetadata = (cookieResponse.cookies ?? []).map((cookie) => ({
    name: cookie.name,
    domain: cookie.domain,
    path: cookie.path,
    secure: cookie.secure,
    httpOnly: cookie.httpOnly,
    sameSite: cookie.sameSite ?? null,
  }));
  const version = await cdp.command("Browser.getVersion");
  const capturedAt = new Date().toISOString();
  const safeUrl =
    parsedUrl.protocol === "data:"
      ? "data:synthetic"
      : `${parsedUrl.origin}${parsedUrl.pathname}`;
  await Promise.all([
    writeFile(
      join(output, "screen-after.png"),
      Buffer.from(screenshot.data, "base64"),
    ),
    writeFile(join(output, "dom.html"), html),
    writeFile(
      join(output, "accessibility.json"),
      `${JSON.stringify(accessibility, null, 2)}\n`,
    ),
    writeFile(
      join(output, "action-trace.json"),
      `${JSON.stringify(actionTrace, null, 2)}\n`,
    ),
    writeFile(
      join(output, "timeline.json"),
      `${JSON.stringify({ capturedAt, frozenNowUtc: canonicalFrozenNow, observedPageNow, browserTimezone, actions: actionTrace }, null, 2)}\n`,
    ),
    writeFile(
      join(output, "visual-result.json"),
      `${JSON.stringify(visual, null, 2)}\n`,
    ),
    writeFile(
      join(output, "browser-log.jsonl"),
      cdp.events.map((entry) => JSON.stringify(entry)).join("\n") + "\n",
    ),
    writeFile(
      join(output, "network.json"),
      `${JSON.stringify(cdp.network, null, 2)}\n`,
    ),
    writeFile(
      join(output, "browser-storage.json"),
      `${JSON.stringify({ ...storage, cookieMetadata }, null, 2)}\n`,
    ),
    writeFile(
      join(output, "capture.json"),
      `${JSON.stringify({ capturedAt, url: safeUrl, observedPathname: storage.pathname, browser: version.product, userAgent: version.userAgent, os: process.platform, requestedViewport: { width, height }, observedViewport: { width: visual.innerWidth, height: visual.innerHeight }, frozenNowUtc: canonicalFrozenNow, observedPageNow, browserTimezone, files: ["screen-before.png", ...intermediateFiles, "screen-after.png", "action-trace.json", "timeline.json", "dom.html", "accessibility.json", "visual-result.json", "browser-log.jsonl", "network.json", "browser-storage.json"] }, null, 2)}\n`,
    ),
  ]);
  const image = await readFile(join(output, "screen-after.png"));
  if (image.subarray(0, 8).toString("hex") !== "89504e470d0a1a0a")
    throw new Error("invalid PNG signature");
  process.stdout.write(
    `Captured ${version.product} ${visual.innerWidth}x${visual.innerHeight} into ${output}\n`,
  );
} finally {
  cdp?.socket.close();
  processHandle?.kill();
  await delay(250);
  const profileReal = await realpath(profile);
  const tempReal = await realpath(tmpdir());
  if (dirname(profileReal) !== tempReal)
    // eslint-disable-next-line no-unsafe-finally
    throw new Error(
      "refusing to remove a browser profile outside the temporary directory",
    );
  await rm(profileReal, {
    recursive: true,
    force: true,
    maxRetries: 5,
    retryDelay: 200,
  });
}
