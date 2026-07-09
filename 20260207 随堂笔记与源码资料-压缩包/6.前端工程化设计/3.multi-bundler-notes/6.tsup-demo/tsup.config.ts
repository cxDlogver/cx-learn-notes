import { defineConfig } from "tsup";

export default defineConfig({
  // 入口
  entry: ["src/index.ts"],
  // 模块化规范
  format: "esm",
  dts: true, // tsup 就可以帮忙生成标准 dts 文件
  treeshake: true,
  clean: true,
  outExtension(ctx) {
    return {
      js: ".js",
      mts: ".ts"
    };
  },
});
