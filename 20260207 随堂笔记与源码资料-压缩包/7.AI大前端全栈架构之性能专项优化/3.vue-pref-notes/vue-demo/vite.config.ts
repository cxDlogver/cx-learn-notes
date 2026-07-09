import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import { visualizer } from "rollup-plugin-visualizer";
import devtools from "vite-plugin-vue-devtools";

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue(), devtools()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(moduleId) {
          return moduleId.includes("node_modules") ? "vendor" : undefined;
        },
      },
      plugins: [
        visualizer({
          filename: "./dist/stats.html", // 输出文件路径
          open: true, // 构建完成后自动打开浏览器
          template: "treemap", // 图表类型（sunburst、treemap、network）
        }),
      ],
    },
  },
});
