import { readdir, readFile } from "node:fs/promises";
import { join, relative } from "node:path";
import process from "node:process";

const roots = ["apps", "packages", "scripts", "infra"];
const ignoredDirectories = new Set([
  "node_modules",
  "dist",
  "coverage",
  ".expo",
]);
const sourceExtensions = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".mjs",
  ".json",
  ".yaml",
  ".yml",
  ".sql",
]);
const forbidden = [
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
  /(?:authorization|api[_-]?key|secret|password)\s*[:=]\s*["'](?:sk_|ep_|Bearer\s+)[A-Za-z0-9_-]{12,}/i,
];

async function* files(directory) {
  let entries;
  try {
    entries = await readdir(directory, { withFileTypes: true });
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "ENOENT"
    ) {
      return;
    }
    throw error;
  }
  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (!ignoredDirectories.has(entry.name))
        yield* files(join(directory, entry.name));
    } else if (
      entry.isFile() &&
      sourceExtensions.has(entry.name.slice(entry.name.lastIndexOf(".")))
    ) {
      yield join(directory, entry.name);
    }
  }
}

let scanned = 0;
const findings = [];
for (const root of roots) {
  for await (const path of files(root)) {
    const content = await readFile(path, "utf8");
    scanned += 1;
    if (forbidden.some((pattern) => pattern.test(content))) {
      findings.push(relative(process.cwd(), path));
    }
  }
}

if (findings.length) {
  process.stderr.write(
    `Potential credential material in: ${findings.join(", ")}\n`,
  );
  process.exitCode = 1;
} else {
  process.stdout.write(
    `Security static scan passed (${scanned} source files).\n`,
  );
}
