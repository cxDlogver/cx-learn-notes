import { readFile, readdir } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import process from "node:process";
import { URL, fileURLToPath } from "node:url";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");
const template = await read(".env.example");
const entries = Object.fromEntries(
  template
    .split(/\r?\n/)
    .filter((line) => line && !line.startsWith("#"))
    .map((line) => {
      const separator = line.indexOf("=");
      if (separator < 1)
        throw new Error(`Invalid environment template entry: ${line}`);
      return [line.slice(0, separator), line.slice(separator + 1)];
    }),
);
const required = [
  "APP_ENV",
  "API_PORT",
  "DATABASE_URL",
  "REDIS_URL",
  "OBJECT_ENDPOINT",
  "OBJECT_BUCKET",
  "OBJECT_ACCESS_KEY_ID",
  "OBJECT_SECRET_ACCESS_KEY",
  "SMS_PROVIDER",
  "PUSH_PROVIDER",
  "ACCESS_TOKEN_SECRET",
  "REFRESH_TOKEN_SECRET",
];
for (const key of required) {
  if (!entries[key]) throw new Error(`Missing .env.example key: ${key}`);
}
if (entries.APP_ENV !== "development")
  throw new Error("Local env must be development.");
for (const [key, value] of Object.entries(entries)) {
  if (/SECRET|TOKEN/.test(key) && !value.startsWith("local_only_")) {
    throw new Error(`Example secret ${key} must be clearly marked local only.`);
  }
}

for (const environment of ["development", "staging", "production"]) {
  const config = JSON.parse(
    await read(`config/environments/${environment}.example.json`),
  );
  if (config.environment !== environment)
    throw new Error(`Wrong ${environment} template.`);
  if (
    environment !== "development" &&
    config.secretsSource !== "secret-manager"
  ) {
    throw new Error(`${environment} must use injected secrets.`);
  }
}

const migrationDir = new URL("db/migrations/", root);
const manifest = JSON.parse(await read("db/migrations/manifest.json"));
const files = (await readdir(migrationDir)).filter((name) =>
  /^\d{4}_.+\.sql$/.test(name),
);
if (files.length !== manifest.migrations.length) {
  throw new Error("Migration manifest does not match SQL files.");
}
for (const [index, migration] of manifest.migrations.entries()) {
  const expectedNumber = String(index + 1).padStart(4, "0");
  if (
    !migration.file.startsWith(`${expectedNumber}_`) ||
    !files.includes(migration.file)
  ) {
    throw new Error(`Migration order mismatch: ${migration.file}`);
  }
}
if (manifest.nextMigration !== String(files.length + 1).padStart(4, "0")) {
  throw new Error("Migration next ID is stale.");
}

const result = spawnSync(
  "docker",
  [
    "compose",
    "-f",
    fileURLToPath(new URL("infra/compose.yaml", root)),
    "config",
    "--quiet",
  ],
  {
    encoding: "utf8",
  },
);
if (result.error || result.status !== 0) {
  throw new Error(
    `Docker Compose config failed: ${result.error?.message ?? result.stderr}`,
  );
}
process.stdout.write(
  "Local Compose, 3 environment templates and migration manifest passed.\n",
);
