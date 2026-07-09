import { build } from "esbuild";

build({
  entryPoints: ["src/index.ts"],
  outdir: "es",
  minify: true,
  bundle: true,
  format: "esm",
});
