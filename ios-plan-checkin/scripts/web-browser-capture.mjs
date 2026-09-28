import { spawn } from "node:child_process";
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
import { setTimeout as delay } from "node:timers/promises";

const workspace = resolve(import.meta.dirname, "..");
const args = new Map();
for (let index = 2; index < process.argv.length; index += 2) {
  args.set(process.argv[index], process.argv[index + 1]);
}
const targetUrl = args.get("--url");
const outputDirectory = args.get("--out");
if (!targetUrl || !outputDirectory) {
  throw new Error(
    "Usage: node scripts/web-browser-capture.mjs --url URL --out DIR [--width 390 --height 844 --browser chrome]",
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

async function freePort() {
  const server = createServer();
  await new Promise((done) => server.listen(0, "127.0.0.1", done));
  const port = server.address().port;
  await new Promise((done) => server.close(done));
  return port;
}

async function getJson(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`CDP HTTP ${response.status}`);
  return response.json();
}

class Cdp {
  constructor(socket) {
    this.socket = socket;
    this.nextId = 1;
    this.pending = new Map();
    this.events = [];
    socket.addEventListener("message", (event) => {
      const message = JSON.parse(event.data);
      if (!message.id) {
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
  const socket = new WebSocket(url);
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
  await cdp.command("Emulation.setDeviceMetricsOverride", {
    width,
    height,
    deviceScaleFactor: 1,
    mobile: width < 768,
  });
  await cdp.command("Page.navigate", { url: targetUrl });
  let ready = false;
  for (let attempt = 0; attempt < 80; attempt += 1) {
    ready = await cdp.evaluate('document.readyState === "complete"');
    if (ready) break;
    await delay(100);
  }
  if (!ready) throw new Error("page did not finish loading");
  const screenshot = await cdp.command("Page.captureScreenshot", {
    format: "png",
    captureBeyondViewport: false,
  });
  const html = await cdp.evaluate("document.documentElement.outerHTML");
  const accessibility = await cdp.command("Accessibility.getFullAXTree");
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
      join(output, "visual-result.json"),
      `${JSON.stringify(visual, null, 2)}\n`,
    ),
    writeFile(
      join(output, "browser-log.jsonl"),
      cdp.events.map((entry) => JSON.stringify(entry)).join("\n") + "\n",
    ),
    writeFile(
      join(output, "capture.json"),
      `${JSON.stringify({ capturedAt, url: safeUrl, browser: version.product, userAgent: version.userAgent, os: process.platform, requestedViewport: { width, height }, observedViewport: { width: visual.innerWidth, height: visual.innerHeight }, files: ["screen-after.png", "dom.html", "accessibility.json", "visual-result.json", "browser-log.jsonl"] }, null, 2)}\n`,
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
