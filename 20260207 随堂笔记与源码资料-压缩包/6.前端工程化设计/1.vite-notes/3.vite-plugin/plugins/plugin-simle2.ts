import { Plugin } from "vite";

export const pluginSimle2 = (): Plugin => {
  return {
    name: "plugin-smile2",
    version: "1.0.0",
    // 针对于代码做编译处理
    transform: {
      // 排序
      order: "post",

      handler(code, id, options) {
        console.log("simle 2");
      },
    },
  };
};
