// node http
import { createServer } from "node:http";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const routes = {
  "/": join(import.meta.dirname, "./index.html"),
  js: join(import.meta.dirname, "./js/index.js"),
  css: join(import.meta.dirname, "./css/index.css"),
  "favicon.ico": join(import.meta.dirname, "./css/index.css"),
  "sw.js": join(import.meta.dirname, "./sw.js"),
};

const mimeTypes = {
  html: "text/html",
  js: "text/javascript",
  css: "text/css",
};

const server = createServer((req, res) => {
  const { url } = req;

  //   路由判断
  if (url === "/") {
    res.writeHead(200, { "content-type": mimeTypes.html });
    res.end(readFileSync(routes["/"]));
    return;
  }

  if (url.endsWith("sw.js")) {
    res.writeHead(200, { "content-type": mimeTypes.js });
    res.end(readFileSync(routes["sw.js"]));
    return
  }

  if (url.endsWith(".js")) {
    res.writeHead(200, { "content-type": mimeTypes.js });
    res.end(readFileSync(routes["js"]));
  }

  if (url.endsWith("favicon.ico")) {
    res.writeHead(200, { "content-type": mimeTypes.css });
    res.end(readFileSync(routes["favicon.ico"]));
  }

  if (url.endsWith(".css")) {
    res.writeHead(200, { "content-type": mimeTypes.css });
    res.end(readFileSync(routes["css"]));
  }
});

server.listen(3000);
