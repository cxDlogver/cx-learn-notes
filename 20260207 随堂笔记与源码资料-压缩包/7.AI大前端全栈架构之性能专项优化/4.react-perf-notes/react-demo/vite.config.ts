import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { visualizer } from "rollup-plugin-visualizer";

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    visualizer({
      filename: "./dist/stats.html", // 输出文件路径
      open: true, // 构建完成后自动打开浏览器
      template: "treemap", // 图表类型（sunburst、treemap、network）
    }),
  ],
  build: {
    rolldownOptions: {
      output: {
        manualChunks(moduleId) {
          if (moduleId.includes("node_modules")) {
            return "vendor";
          }
        },
      },
    },
  },
});
