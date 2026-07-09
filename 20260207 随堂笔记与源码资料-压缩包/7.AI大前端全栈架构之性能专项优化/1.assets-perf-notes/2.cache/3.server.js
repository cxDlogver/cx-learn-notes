// node http
import { createServer } from "node:http";
import { readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import fresh from "fresh";
import etag from "etag";

const routes = {
  "/": join(import.meta.dirname, "./index.html"),
  js: join(import.meta.dirname, "./js/index.js"),
  css: join(import.meta.dirname, "./css/index.css"),
};

const mimeTypes = {
  html: "text/html",
  js: "text/javascript",
  css: "text/css",
};

const header = {
  "cache-control": "public, max-age=10",
};

const server = createServer((req, res) => {
  const { url } = req;

  //   路由判断
  if (url === "/") {
    res.writeHead(200, { "content-type": mimeTypes.html });
    res.end(readFileSync(routes["/"]));
  }

  if (url.endsWith(".js")) {
    const fileStat = statSync(routes["css"]);
    // 1.拿到请求头来判断
    const isModified =
      fileStat.mtime.toUTCString() !== req.headers["if-modified-since"];
    // 响应头
    res.writeHead(200, {
      "content-type": mimeTypes.js,
      ...header,
    });
    res.end(readFileSync(routes["js"]));
  }

  if (url.endsWith(".css")) {
    const fileStat = statSync(routes["css"]);
    // 直接通过 etag
    const fileEtag = etag(fileStat);
    console.log("🚀 ~ fileEtag:", fileEtag);
    const isMatch = fresh(req.headers, {
      etag: fileEtag,
      "last-modified": fileStat.mtime.toUTCString(),
    });

    console.log("🚀 ~ fileStat:", fileStat);
    console.log("if-modified-since", req.headers["if-modified-since"]);
    res.writeHead(isMatch ? 304 : 200, {
      "content-type": mimeTypes.css,
      // ...header,
      etag: fileEtag,
      "last-modified": fileStat.mtime.toUTCString(),
    });
    res.end(readFileSync(routes["css"]));
  }
});

server.listen(3000);
