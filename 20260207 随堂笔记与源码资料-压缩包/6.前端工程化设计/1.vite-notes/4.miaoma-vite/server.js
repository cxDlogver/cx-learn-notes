// 用来作为 vite 开发服务器的
import http from "node:http";
import fs from "node:fs";
import esbuild from "esbuild";

const indexHtml = fs.readFileSync("./index.html", "utf-8");

const mimeTypes = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".css": "text/css",
  ".ts": "text/javascript",
};

// miaoma vite 初始化时，创建缓存文件夹
fs.mkdirSync("./node_modules/.miaoma-vite/deps", { recursive: true });

const app = http.createServer((req, res) => {
  //   console.log(req, res);
  console.log("🚀 ~ req:", req.url);
  const fileType = req.url.split(".").pop();
  const extname = `.${fileType}`;
  console.log("🚀 ~ extname:", extname);

  res.setHeader("Content-Type", mimeTypes[extname] || mimeTypes[".html"]);

  if (fileType === "/") {
    res.end(indexHtml);
  } else if (extname in mimeTypes) {
    const rs = fs.readFileSync(`./${req.url}`);

    // res.end(rs);
    if (extname === ".ts") {
      const cacheFileUrl = `./node_modules/.miaoma-vite/deps${req.url
        .replace("/src", "")
        .replace(".ts", ".js")}`;

      // 判断缓存是否存在
      if (fs.existsSync(cacheFileUrl)) {
        res.end(fs.readFileSync(cacheFileUrl, "utf-8"));
        console.log("🚀 ~ cache hit:", cacheFileUrl);
      } else {
        // 需要编译
        const { code } = esbuild.transformSync(rs.toString(), {
          loader: "ts",
        });

        //   将编译结果写入到缓存
        fs.writeFileSync(cacheFileUrl, code);
        res.end(code);
      }
    } else {
      res.end(rs);
    }
  }
});

app.listen(5173);
