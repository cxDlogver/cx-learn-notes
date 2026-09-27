import { readFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import process from "node:process";
import { URL, fileURLToPath } from "node:url";
import ts from "typescript";

const source = await readFile(
  new URL("../apps/mobile/src/data/localMigrations.ts", import.meta.url),
  "utf8",
);
const javascript = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.ESNext,
    target: ts.ScriptTarget.ES2022,
  },
}).outputText;
const { localMigrations } = await import(
  `data:text/javascript,${encodeURIComponent(javascript)}`
);
const result = spawnSync(
  "python",
  [fileURLToPath(new URL("./mobile-local-schema-smoke.py", import.meta.url))],
  {
    input: JSON.stringify(localMigrations),
    encoding: "utf8",
    timeout: 30_000,
  },
);
process.stdout.write(result.stdout ?? "");
process.stderr.write(result.stderr ?? "");
if (result.error) throw result.error;
if (result.status !== 0) process.exitCode = result.status ?? 1;
