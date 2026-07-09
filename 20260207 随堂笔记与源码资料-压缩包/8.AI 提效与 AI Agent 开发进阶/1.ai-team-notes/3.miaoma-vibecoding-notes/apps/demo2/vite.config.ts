import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { fileURLToPath, URL } from "node:url";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: [
      {
        find: "@miaoma/ui/styles.css",
        replacement: fileURLToPath(new URL("../../packages/ui/src/styles.css", import.meta.url))
      },
      {
        find: "@miaoma/ui",
        replacement: fileURLToPath(new URL("../../packages/ui/src/index.ts", import.meta.url))
      }
    ]
  },
  server: {
    host: "127.0.0.1",
    port: 5174
  }
});
