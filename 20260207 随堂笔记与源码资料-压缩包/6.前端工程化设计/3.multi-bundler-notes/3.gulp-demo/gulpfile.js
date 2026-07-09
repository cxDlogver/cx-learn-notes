const fs = require("node:fs");
const { series, parallel } = require("gulp");

// function task(cb) {
//   console.log("执行流程。。。");

//   fs.writeFileSync("./miao.md", "# gulp 的讲解");

//   cb();
// }

// module.exports = exports = {
//   default: task,
// };

// 既要转换 js、css、生成 md，构建之前删除情况原产物

function clean(cb) {
  // 删除产物目录 dist
  cb();
}

function css(cb) {
  // css 编译转化，postcss
  const isExists = fs.existsSync("./dist");
  if (!isExists) {
    fs.mkdirSync("./dist");
  }
  const code = "body{color:pink}";
  fs.writeFileSync("./dist/index.css", code);
  cb();
}

function javascript(cb) {
  // 通过 babel 的转换编译
  const isExists = fs.existsSync("./dist");
  if (!isExists) {
    fs.mkdirSync("./dist");
  }
  const code = "console.log(123)";
  fs.writeFileSync("./dist/index.js", code);
  cb();
}

function md(cb) {
  console.log("正在执行流程");
  // 打包
  // 编译
  // 文件输出
  const code = `
  # 妙码学院
  ## gulpfile 的讲解
  `;
  const isExists = fs.existsSync("./dist");
  if (!isExists) {
    fs.mkdirSync("./dist");
  }
  fs.writeFileSync("./dist/miao.md", code);
  cb();
}

// 1. 先 clean 清除原产物
// 2. 并行生成 js、css、md
exports.default = series(clean, parallel(css, javascript, md));
