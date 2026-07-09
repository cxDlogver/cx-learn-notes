import { defineConfig } from "tsup";

export default defineConfig({
    entry: ['src'],
    // dts: true,
    splitting: false,
    sourcemap: false,
    // minify: true,
    clean: true,
    format: ['esm'],
    outDir: 'dist',
    external: ["dotenv"] // 打包构建时，不要包含这个依赖
});
