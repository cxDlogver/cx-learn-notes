import { defineConfig } from "vite";
import { visualizer } from "rollup-plugin-visualizer";
// const { visualizer } = require("rollup-plugin-visualizer");

export default defineConfig({
  optimizeDeps: {
    include: ["react", "react-dom"],
    // exclude:
  },
  server: {
    watch: {
      ignored: ["**/large-static-files/**"], // 不被热更新监听的文件
    },
  },
  build: {
    // minify: "esbuild",
    rollupOptions: {
      plugins: [
        visualizer({
          filename: "./dist/stats.html",
          open: true,
        }),
      ],
      output: {
        manualChunks(id) {
          if (id.includes("node_modules")) {
            // return "miaoma";
            return id
              .toString()
              .split("node_modules/")[1]
              .split("/")[0]
              .toString();
          }
        },
      },
    },
  },
  //   plugins: [

  //   ]
});
