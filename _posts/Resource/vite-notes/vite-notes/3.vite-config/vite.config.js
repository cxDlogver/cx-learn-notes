import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import commonjs from "vite-plugin-commonjs";

export default defineConfig({
  plugins: [vue(), commonjs()],
  resolve: {
    extensions: [".js", ".jsx", ".ts", ".tsx", ".vue", ".miaoma"],
    alias: {
      "@": "/src",
    },
  },
  server: {
    port: 8080,
    proxy: {
      "/api": {
        target: "http://localhost:8000",
        changeOrigin: true,
        pathRewrite: {
          "^/api": "",
        },
      },
    },
  },
  build: {
    outDir: "build",
    clean: true,
    rollupOptions: {
      output: {
        chunkFileNames: "static/js/[name]-[hash].js",
        manualChunks(id) {
          console.log(process.env.NODE_ENV, process.env.MIAOMA);
          if (id.includes("sum")) {
            return "sum";
          }
        },
      },
    },
  },
  define: {
    "process.env.MIAOMA": "123456",
  },
  esbuild: {
    minify: true,
    target: "es2015",
  },
});
