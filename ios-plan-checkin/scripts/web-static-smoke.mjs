import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createServer } from "node:net";
import process from "node:process";
import { setTimeout as delay } from "node:timers/promises";
import { fileURLToPath, URL } from "node:url";

const freePort = await new Promise((resolve, reject) => {
  const probe = createServer();
  probe.once("error", reject);
  probe.listen(0, "127.0.0.1", () => {
    const address = probe.address();
    probe.close(() => resolve(address.port));
  });
});
const server = spawn(
  process.execPath,
  [fileURLToPath(new URL("../apps/web/server.mjs", import.meta.url))],
  {
    env: {
      ...process.env,
      WEB_PORT: String(freePort),
      WEB_OBJECT_ORIGIN: "https://objects.example.cn",
    },
    stdio: ["ignore", "pipe", "pipe"],
  },
);
let stderr = "";
server.stderr.setEncoding("utf8").on("data", (chunk) => {
  stderr += chunk;
});
const base = `http://127.0.0.1:${freePort}`;

try {
  let ready = false;
  for (let attempt = 0; attempt < 40; attempt++) {
    if (server.exitCode !== null)
      throw new Error(`Web static server exited: ${stderr}`);
    try {
      const response = await globalThis.fetch(`${base}/healthz`);
      if (response.ok) {
        ready = true;
        break;
      }
    } catch {
      await delay(50);
    }
  }
  assert.ok(ready, `Web static server did not start: ${stderr}`);
  const page = await globalThis.fetch(`${base}/`, {
    headers: { Accept: "text/html" },
  });
  assert.equal(page.status, 200);
  assert.equal(page.headers.get("cache-control"), "no-store");
  assert.match(
    page.headers.get("content-security-policy"),
    /frame-ancestors 'none'/,
  );
  assert.match(
    page.headers.get("content-security-policy"),
    /connect-src 'self' https:\/\/objects\.example\.cn/,
  );
  assert.equal(page.headers.get("x-content-type-options"), "nosniff");
  const html = await page.text();
  const assetPath = html.match(/src="(\/assets\/[^"]+\.js)"/)?.[1];
  assert.ok(assetPath, "Built HTML must reference a fingerprinted JS asset.");
  const asset = await globalThis.fetch(`${base}${assetPath}`);
  assert.equal(asset.status, 200);
  assert.match(asset.headers.get("cache-control"), /immutable/);
  const deepLink = await globalThis.fetch(`${base}/plans/example`, {
    headers: { Accept: "text/html" },
  });
  assert.equal(deepLink.status, 200);
  assert.equal(await deepLink.text(), html);
  const api = await globalThis.fetch(`${base}/api/v1/today`, {
    headers: { Accept: "text/html" },
  });
  assert.equal(api.status, 404);
  const missingAsset = await globalThis.fetch(`${base}/assets/missing.js`, {
    headers: { Accept: "text/html" },
  });
  assert.equal(missingAsset.status, 404);
  process.stdout.write(
    "Web static smoke passed: SPA fallback, API isolation, CSP, no-store and fingerprinted cache.\n",
  );
} finally {
  server.kill();
}
