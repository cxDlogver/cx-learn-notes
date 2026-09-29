import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { resolve, sep } from "node:path";
import process from "node:process";
import { fileURLToPath, URL } from "node:url";

const root = resolve(fileURLToPath(new URL("./dist/", import.meta.url)));
const port = Number(process.env.WEB_PORT ?? 8080);
const objectUrl = new URL(process.env.WEB_OBJECT_ORIGIN ?? "");
if (
  !Number.isInteger(port) ||
  port < 1 ||
  port > 65535 ||
  objectUrl.protocol !== "https:" ||
  objectUrl.origin !== process.env.WEB_OBJECT_ORIGIN
)
  throw new Error("WEB_PORT or WEB_OBJECT_ORIGIN is invalid.");

const objectOrigin = objectUrl.origin;
const csp = [
  "default-src 'none'",
  "base-uri 'none'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "script-src 'self'",
  "style-src 'self'",
  "style-src-attr 'unsafe-inline'",
  `connect-src 'self' ${objectOrigin}`,
  `img-src 'self' blob: data: ${objectOrigin}`,
  "font-src 'self'",
  "manifest-src 'self'",
  "worker-src 'self'",
  "object-src 'none'",
].join("; ");
const types = new Map([
  [".html", "text/html; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"],
  [".css", "text/css; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".svg", "image/svg+xml"],
  [".png", "image/png"],
  [".ico", "image/x-icon"],
  [".woff2", "font/woff2"],
]);

function headers(response) {
  response.setHeader("Content-Security-Policy", csp);
  response.setHeader("Strict-Transport-Security", "max-age=31536000");
  response.setHeader("X-Content-Type-Options", "nosniff");
  response.setHeader("X-Frame-Options", "DENY");
  response.setHeader("Referrer-Policy", "no-referrer");
  response.setHeader(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=()",
  );
}

function contentType(path) {
  const extension = path.slice(path.lastIndexOf("."));
  return types.get(extension) ?? "application/octet-stream";
}

const server = createServer(async (request, response) => {
  headers(response);
  if (request.method !== "GET" && request.method !== "HEAD") {
    response.writeHead(405, {
      Allow: "GET, HEAD",
      "Cache-Control": "no-store",
    });
    response.end();
    return;
  }
  let pathname;
  try {
    pathname = new URL(request.url ?? "/", "http://localhost").pathname;
  } catch {
    response.writeHead(400, { "Cache-Control": "no-store" });
    response.end();
    return;
  }
  if (pathname === "/healthz") {
    response.writeHead(200, {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
    });
    response.end(request.method === "HEAD" ? undefined : "ok\n");
    return;
  }
  if (pathname.startsWith("/api/") || pathname === "/api") {
    response.writeHead(404, { "Cache-Control": "no-store" });
    response.end();
    return;
  }
  let decoded;
  try {
    decoded = decodeURIComponent(pathname);
  } catch {
    response.writeHead(400, { "Cache-Control": "no-store" });
    response.end();
    return;
  }
  if (
    decoded.includes("\\") ||
    decoded.split("/").some((part) => part.startsWith("."))
  ) {
    response.writeHead(404, { "Cache-Control": "no-store" });
    response.end();
    return;
  }
  const target = resolve(root, `.${decoded}`);
  if (target !== root && !target.startsWith(`${root}${sep}`)) {
    response.writeHead(404, { "Cache-Control": "no-store" });
    response.end();
    return;
  }
  let file = target;
  try {
    if (!(await stat(file)).isFile()) throw new Error("not a file");
  } catch {
    const last = decoded.split("/").at(-1) ?? "";
    if (!request.headers.accept?.includes("text/html") || last.includes(".")) {
      response.writeHead(404, { "Cache-Control": "no-store" });
      response.end();
      return;
    }
    file = resolve(root, "index.html");
  }
  try {
    const body = await readFile(file);
    const asset = decoded.startsWith("/assets/") && file === target;
    response.writeHead(200, {
      "Content-Type": contentType(file),
      "Content-Length": body.byteLength,
      "Cache-Control": asset
        ? "public, max-age=31536000, immutable"
        : "no-store",
      ...(decoded === "/notification-sw.js"
        ? { "Service-Worker-Allowed": "/" }
        : {}),
    });
    response.end(request.method === "HEAD" ? undefined : body);
  } catch {
    response.writeHead(503, { "Cache-Control": "no-store" });
    response.end();
  }
});

server.listen(port, "0.0.0.0");
