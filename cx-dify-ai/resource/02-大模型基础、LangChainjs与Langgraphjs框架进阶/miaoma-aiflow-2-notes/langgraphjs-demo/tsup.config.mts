import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/"],
  outDir: "dist",
  format: ["esm"],
  clean: true,
});
