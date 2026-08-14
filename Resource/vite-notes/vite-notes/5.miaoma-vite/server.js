// vite 开发服务器
import http from "node:http";
import chalk from "chalk";
import fs from "node:fs";
import esbuild from "esbuild";
import config from "./miaoma-vite.config.js";

const indexHtml = fs.readFileSync("./index.html", "utf-8");

const mimeTypes = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".css": "text/css",
  ".ts": "text/javascript",
};

const cache = new Map();

fs.mkdirSync("./node_modules/.miaoma-vite/deps", { recursive: true });

const app = http.createServer((req, res) => {
  console.log("🚀 ~ req:", req.url);
  const fileType = req.url.split(".").pop();
  const extname = `.${fileType}`;
  console.log("🚀 ~ extname:", extname);
  res.setHeader("Content-Type", mimeTypes[extname] || "text/html");
  if (fileType === "/") {
    res.end(indexHtml);
  } else if (extname in mimeTypes) {
    const rs = fs.readFileSync(`./${req.url}`);

    // 如果你的文件是 ts 文件，就需要进行 esbuild 编译
    if (extname === ".ts") {
      const cacheFileUrl = `./node_modules/.miaoma-vite/deps${req.url
        .replace("/src", "")
        .replace(".ts", ".js")}`;
      if (fs.existsSync(cacheFileUrl)) {
        res.end(fs.readFileSync(cacheFileUrl, "utf-8"));
        console.log("🚀 ~ cache hit:", cacheFileUrl);
        return;
      } else {
        const { code } = esbuild.transformSync(rs.toString(), {
          loader: "ts",
        });

        // 缓存编译结果
        cache.set(req.url, code);
        fs.writeFileSync(cacheFileUrl, code);
        res.end(code);
      }
    } else {
      res.end(rs);
    }
  } else {
    res.end("404 Not Found");
  }
});

app.listen(config.server.port, () => {
  /**
     *   VITE v7.1.12  ready in 323 ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
  ➜  press h + enter to show help
     */
  console.log(
    `MIAOMA-VITE v${chalk.green("1.0.0")}
    开发服务器运行在 ${chalk.green(`http://localhost:${config.server.port}`)}
    
    按 ${chalk.green("h + enter")} 查看帮助
    `
  );
});
