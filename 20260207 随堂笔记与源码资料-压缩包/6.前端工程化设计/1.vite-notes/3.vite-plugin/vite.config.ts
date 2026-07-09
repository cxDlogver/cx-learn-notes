import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import inspect from "vite-plugin-inspect";
import { pluginSimle } from "./plugins/plugin-simle";
import { pluginSimle2 } from "./plugins/plugin-simle2";
import { pluginState } from "./plugins/plugin-state";

export default defineConfig({
  cacheDir: ".miaoma-vite",
  // 插件拓展
  plugins: [
    react({}),
    inspect(),
    // 插件，确定的结构「插件协议 = skill【name、description】」
    pluginSimle(),
    pluginSimle2(),
    pluginState(),

    {
      // 名称
      name: "test",
      version: "1.0.0",
      // 插件的处理
      // 预设的一些方法
      // 文件加载时，我们要做xxx，就可以用这个钩子
      load(id, options) {
        console.log("🚀 ~ load id:", id);
      },
      // 文件编译转换时
      transform(code, id, options) {
        console.log("🚀 ~ transform code, id:", id);
      },
      resolveId(source, importer, options) {
        console.log("🚀 ~ resolveId importer:", importer);
      },
      //   augmentChunkHash(chunkId, hash) {
      //     console.log("🚀 ~ augmentChunkHash chunkId:", chunkId);
      //   },
      //   // output options hook
      //   outputOptions(options) {
      //     console.log("🚀 ~ outputOptions:", options);
      //     return options;
      //   },
      //   // render chunk hook
      //   renderChunk(code, chunk, options) {
      //     console.log("🚀 ~ renderChunk chunk:", chunk.fileName);
      //     return null;
      //   },
      //   // render dynamic import hook
      //   renderDynamicImport(options) {
      //     console.log("🚀 ~ renderDynamicImport:", options);
      //     return null;
      //   },
      //   // render error hook
      //   renderError(error) {
      //     console.log("🚀 ~ renderError:", error);
      //   },
      //   // render start hook
      //   renderStart(outputOptions, inputOptions) {
      //     console.log("🚀 ~ renderStart");
      //   },
      //   // resolve file url hook
      //   resolveFileUrl(options) {
      //     console.log("🚀 ~ resolveFileUrl:", options);
      //     return null;
      //   },
      //   // resolve import meta hook
      //   resolveImportMeta(property, options) {
      //     console.log("🚀 ~ resolveImportMeta property:", property);
      //     return null;
      //   },
      //   // write bundle hook
      //   writeBundle(options, bundle) {
      //     console.log("🚀 ~ writeBundle bundle keys:", Object.keys(bundle));
      //   },
    },
  ],
});
