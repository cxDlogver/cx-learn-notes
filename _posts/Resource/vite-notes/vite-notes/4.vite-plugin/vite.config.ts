import { defineConfig } from "vite";
// import type { Plugin } from "vite";
import vue from "@vitejs/plugin-vue";
import { pluginSimle } from "./plugins/plugin-simle.js";

// const miaoma = (): Plugin => {
//   console.log("miaoma");
//   return {
//     name: "miaoma",
//     version: "1.0.0",
//     load(id: string) {
//       console.log("load ------->", id);
//     },
//     renderDynamicImport(args) {
//       console.log("renderDynamicImport ------->", args);
//     },
//     transformIndexHtml(html: string) {
//       console.log("transformIndexHtml ------->", html);
//     },
//     configureServer(server) {
//       server.middlewares.use((req, res, next) => {
//         // 自定义请求处理...
//         // res.end("hello miaoma");
//         next();
//       });
//     },
//   };
// };

export default defineConfig({
  plugins: [vue(), pluginSimle()],
});
