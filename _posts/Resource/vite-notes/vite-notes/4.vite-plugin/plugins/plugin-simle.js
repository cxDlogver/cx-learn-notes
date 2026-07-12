export const pluginSimle = () => {
  return {
    name: "pluginSimle",
    version: "1.0.0",
    // 插件在什么时机去处理事情
    // 代码转换时
    transform(code, id) {
      console.log("transform ------->", code, id);
      //   注意，这块我们不是按照严格的编译原理来实现的，而是通过简单的正则匹配替换来实现的
      let transformedCode = code
        .replace(":smile:", "😄")
        .replace(":cry:", "😢");

      transformedCode = transformedCode.replace(
        "// track",
        `
        console.log("track");
      `
      );

      return transformedCode;
    },
  };
};
