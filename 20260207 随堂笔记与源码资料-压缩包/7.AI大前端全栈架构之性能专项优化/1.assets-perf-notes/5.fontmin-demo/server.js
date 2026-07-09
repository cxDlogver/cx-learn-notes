import { createServer } from "node:http";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import Fontmin from "fontmin";

const fontPath = join(import.meta.dirname, "./AlimamaShuHeiTi-Bold.ttf");

function fontSplitter(text, destPath) {
  const fontmin = new Fontmin()
    .src(fontPath)
    .use(
      Fontmin.otf2ttf({
        text,
      })
    )
    .use(
      Fontmin.glyph({
        text,
      })
    )
    .use(Fontmin.ttf2eot())
    .use(Fontmin.ttf2woff({ deflate: true }))
    .use(Fontmin.ttf2woff2())
    .use(Fontmin.ttf2svg())
    .dest(destPath);

  return fontmin.runAsync();
}

const routes = {
  "/": join(import.meta.dirname, "./index.html"),
};

const mimeTypes = {
  html: "text/html",
};

const server = createServer(async (req, res) => {
  const { url } = req;

  if (url === "/") {
    res.writeHead(200, { "content-type": mimeTypes.html });
    // 模拟，很多应用都是服务端渲染，服务端渲染的场景很适合字体子集化处理
    // 随机生成 32 位 Id
    const requestId = Math.random().toString(36).substring(2, 10);

    const destPath = join(import.meta.dirname, `./dist/${requestId}`);

    const fileContent = readFileSync(routes["/"]);
    const fileContentTxt = fileContent.toString();
    console.log("🚀 ~ fileContentTxt:", fileContentTxt);
    const c = await fontSplitter(fileContentTxt, destPath);
    const newFileContentTxt = fileContentTxt.replace(
      "<head>",
      `
        <head>
          <style>
            @font-face {
              font-family: "heyi";
              src: url("./dist/${requestId}/AlimamaShuHeiTi-Bold.woff2") format("woff2");
            }

            body {
              font-family: "heyi";
            }
          </style>
      `
    );

    res.end(newFileContentTxt);
    return;
  }

  console.log("🚀 ~ url:", url);
  if (url.startsWith("/dist")) {
    const { url } = req;
    const staticPath = join(
      import.meta.dirname,
      url.slice(url.indexOf("/dist"))
    );

    const fileContent = readFileSync(staticPath);
    console.log("🚀 ~ fileContent:", fileContent);
    res.writeHead(200, { "content-type": mimeTypes.html });
    res.end(fileContent);
    return;
  }
});

server.listen(3000, () => {
  console.log("服务启动，http://localhost:3000");
});
