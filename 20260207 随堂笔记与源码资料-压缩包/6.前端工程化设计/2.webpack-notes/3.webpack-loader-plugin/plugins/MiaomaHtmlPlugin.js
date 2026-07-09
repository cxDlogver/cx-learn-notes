// webpack 插件的本质是一个对象

const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Document</title>
</head>
<body>
    
</body>
</html>
`;

export default class MiaomaHtmlPlugin {
  constructor() {}

  //   webpack 插件对象跟不同对象有什么区别？
  // 区别在于，对象必须有 applay 方法【插件设计协议】
  apply(compiler) {
    // webpack 编译有很多阶段
    // 我到底在哪个阶段生成 html 文件呢？
    compiler.hooks.emit.tapAsync(
      "MiaomaHtmlPlugin",
      async (compilation, next) => {
        // 编译中间产物
        // compilation.assets["miaoma.html"] = {
        //   source: function () {
        //     return html;
        //   },
        //   size: html.length,
        // };

        // markdown
        let filelist = "# 文件统计\n\n";
        for (const filename in compilation.assets) {
          filelist += `- ${filename} ${compilation.assets[filename].source().length}b\n  `;
        }
        compilation.assets["filelist.md"] = {
          source: function () {
            return filelist;
          },
          size: filelist.length,
        };

        next();
      },
    );

    console.log(
      "🚀 ~ MiaomaHtmlPlugin ~ apply ~ compiler.hooks:",
      compiler.hooks,
    );
  }
}
