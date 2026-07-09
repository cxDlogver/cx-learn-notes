import { createServer } from "node:http";
import { readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import etag from "etag";
import fresh from "fresh";

const headers = {
  //   Expires: new Date(Date.now() + 10 * 60 * 60).toUTCString(),
  "Cache-Control": "public, max-age=0",
};

/**
 * 路由
 */
const routes = {
  "/": join(import.meta.dirname, "./index.html"),
  js: join(import.meta.dirname, "./js/index.js"),
  css: join(import.meta.dirname, "./css/index.css"),
};

/**
 * 文件 mime 类型
 */
const mimeTypes = {
  html: "text/html",
  js: "text/javascript",
  css: "text/css",
};

const server = createServer((req, res) => {
  const { url } = req;

  if (url === "/") {
    const fileStat = statSync(routes["/"]);
    res.writeHead(200, {
      "Content-Type": mimeTypes.html,
      "Last-Modified": fileStat.mtime.toUTCString(),
      ...headers,
    });
    res.end(readFileSync(routes["/"]));
    return;
  }

  if (url.endsWith(".js")) {
    const fileStat = statSync(routes["/"]);
    res.writeHead(200, {
      ...headers,
      "Content-Type": mimeTypes.js,
      "Last-Modified": fileStat.mtime.toUTCString(),
    });
    res.end(readFileSync(routes.js));
    return;
  }
  if (url.endsWith(".css")) {
    const css = readFileSync(routes.css);
    const fileStat = statSync(routes["/"]);
    const fileEtag = etag(fileStat);

    // 判读文件是否修改过
    const isFresh = fresh(req.headers, {
      etag: fileEtag,
      "last-modified": fileStat.mtime.toUTCString(),
    });

    console.log("🚀 ~ isFresh:", isFresh);

    res.writeHead(isFresh ? 304 : 200, {
      ...headers,
      Etag: fileEtag,
      "Content-Type": mimeTypes.css,
      "Last-Modified": fileStat.mtime.toUTCString(),
    });
    res.end(css);
    return;
  }
});

server.listen(3000, () => {
  console.log("Server running at http://127.0.0.1:3000");
});
