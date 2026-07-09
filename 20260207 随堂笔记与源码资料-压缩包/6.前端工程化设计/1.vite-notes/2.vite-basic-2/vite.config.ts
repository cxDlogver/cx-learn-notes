import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
// import vue from "@vitejs/plugin-vue";
import inspect from "vite-plugin-inspect";

export default defineConfig({
  // 插件拓展
  plugins: [react({}), /* vue({}), */ inspect()],
  // 解析相关的配置
  resolve: {
    alias: {
      "@": "/src", // 设置 `@` 为 `/src` 的别名
    },
    extensions: [".js", ".jsx", ".ts", ".tsx"], // 自动解析指定后缀
  },
  // 开发服务
  server: {
    host: "0.0.0.0",
    port: 3000,
    open: true,
    // 代理
    proxy: {
      "/api/topics": {
        target: "https://cnodejs.org/api/v1", // https://cnodejs.org/api/v1/topics
        changeOrigin: true,
        rewrite: (path) => path.replace(/\api/, ""),
      },
    },
  },
  build: {
    outDir: "dist",
    // 构建的配置
    rollupOptions: {
      output: {
        // 异步组件加载会自动分 chunk
        chunkFileNames: "static/js/[name]-[hash].js",
        // 手动分 chunk
        manualChunks(moduleId, meta) {
        //   console.log("process.env.MIAOMA", process.env.NODE_ENV);
          // 将 node_modules 依赖包提取打到 vendor 文件中
          if (moduleId.includes("node_modules")) {
            return "vendor";
          }
        },
      },
    },
    // rolldownOptions   voidzero 开发的新构建工具
  },
  //   define: {
  //     "process.env.NODE_ENV": "MIAOMA",
  //   },
});
