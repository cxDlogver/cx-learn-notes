import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
// import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [vue() /* react() */],
  // build: {
  //   lib: {
  //     entry: "./lib/miaoma-utils.jsx",
  //     name: "MiaomaUtils",
  //     formats: ["es", "umd"],
  //   },
  // },
});
