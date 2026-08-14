export const pluginTest = () => {
  return {
    name: "pluginTest",
    version: "1.0.0",
    // 盘点一下开发最常见的钩子
    // 代码转换
    transform(code, id) {
      console.log("transform test");
    },
    // html 转换
    transformIndexHtml(html) {
      console.log("transformIndexHtml");
    },
    // 配置钩子
    configureServer(server) {
      console.log("configureServer");
    },
    // chunk 转换
    renderChunk() {
      console.log("renderChunk");
    },
    // 构建产物输出
    generateBundle() {
      console.log("generateBundle");
    },
  };
};
