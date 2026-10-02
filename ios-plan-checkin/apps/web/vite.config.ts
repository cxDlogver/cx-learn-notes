import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { defineConfig, loadEnv } from "vite";

const repoRoot = fileURLToPath(new URL("../../", import.meta.url));
const certPath = fileURLToPath(
  new URL("../api/.local/lan-dev-cert.pem", import.meta.url),
);
const keyPath = fileURLToPath(
  new URL("../api/.local/lan-dev-key.pem", import.meta.url),
);

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, repoRoot, "");
  const bucket = env.OBJECT_BUCKET;
  const objectTarget = env.OBJECT_ENDPOINT;
  const bucketPath = bucket?.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  return {
    server: {
      host: "0.0.0.0",
      port: 5173,
      strictPort: true,
      ...(existsSync(certPath) && existsSync(keyPath)
        ? {
            https: { cert: readFileSync(certPath), key: readFileSync(keyPath) },
          }
        : {}),
      proxy: {
        "/api/v1": {
          target: process.env.WEB_API_PROXY_TARGET ?? "http://127.0.0.1:3000",
          changeOrigin: false,
        },
        ...(bucketPath && objectTarget
          ? {
              [`^/${bucketPath}(?:/|$)`]: {
                target: objectTarget,
                changeOrigin: false,
              },
            }
          : {}),
      },
    },
    preview: {
      host: "0.0.0.0",
      port: 4173,
      strictPort: true,
    },
    build: {
      outDir: "dist",
      sourcemap: false,
    },
  };
});
