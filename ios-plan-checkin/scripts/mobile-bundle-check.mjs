import { spawnSync } from "node:child_process";
import process from "node:process";
import { fileURLToPath, URL } from "node:url";

const cli = fileURLToPath(
  new URL("../apps/mobile/node_modules/expo/bin/cli", import.meta.url),
);
const cwd = fileURLToPath(new URL("../apps/mobile/", import.meta.url));
const result = spawnSync(
  process.execPath,
  [cli, "export", "--platform", "ios", "--output-dir", "dist"],
  { cwd, env: process.env, stdio: "inherit" },
);
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
