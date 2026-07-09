import { Plugin } from "vite";

export const pluginSimle = (): Plugin => {
  return {
    name: "plugin-smile",
    version: "1.0.0",
    // 针对于代码做编译处理
    transform: {
      // 排序
      order: "pre",

      handler(code, id, options) {
        console.log('simle')
      },
    },
  };
};
