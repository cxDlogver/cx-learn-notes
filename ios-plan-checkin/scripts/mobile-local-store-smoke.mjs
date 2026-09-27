import assert from "node:assert/strict";
import { createHash, randomBytes } from "node:crypto";
import { readFile } from "node:fs/promises";
import process from "node:process";
import { URL } from "node:url";
import ts from "typescript";

const source = await readFile(
  new URL("../apps/mobile/src/data/localStore.ts", import.meta.url),
  "utf8",
);
const javascript = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2022,
  },
}).outputText;
const keys = new Map();
const files = new Set();
const directories = new Set();
const versions = new Map();
const statements = [];
let cipherEnabled = true;
class FakeFile {
  constructor(_directory, name) {
    this.name = name;
  }
  get exists() {
    return files.has(this.name);
  }
}
class FakeDirectory {
  constructor(...parts) {
    this.uri = parts.join("/");
  }
  get exists() {
    return directories.has(this.uri);
  }
  create() {
    directories.add(this.uri);
  }
  delete() {
    directories.delete(this.uri);
  }
}
const sqlite = {
  defaultDatabaseDirectory: "file:///sqlite",
  openDatabaseAsync: async (name) => {
    files.add(name);
    return {
      execAsync: async (sql) => {
        statements.push(sql);
        const match = /^PRAGMA user_version = (\d+)$/.exec(sql);
        if (match) versions.set(name, Number(match[1]));
      },
      getFirstAsync: async (sql) =>
        sql === "PRAGMA cipher_version"
          ? cipherEnabled
            ? { cipher_version: "4.0.0" }
            : null
          : { user_version: versions.get(name) ?? 0 },
      closeAsync: async () => {},
    };
  },
  deleteDatabaseAsync: async (name) => {
    files.delete(name);
    versions.delete(name);
  },
};
const localRequire = (name) => {
  if (name === "expo-crypto")
    return {
      CryptoDigestAlgorithm: { SHA256: "sha256" },
      digestStringAsync: async (_algorithm, input) =>
        createHash("sha256").update(input).digest("hex"),
      getRandomBytes: (count) => randomBytes(count),
    };
  if (name === "expo-file-system")
    return {
      Directory: FakeDirectory,
      File: FakeFile,
      Paths: { document: "file:///documents" },
    };
  if (name === "expo-secure-store")
    return {
      AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY: "after-first-unlock",
      getItemAsync: async (key) => keys.get(key) ?? null,
      setItemAsync: async (key, value) => {
        keys.set(key, value);
      },
      deleteItemAsync: async (key) => {
        keys.delete(key);
      },
    };
  if (name === "expo-sqlite") return sqlite;
  if (name === "react-native") return { Platform: { OS: "ios" } };
  if (name === "./localMigrations")
    return {
      localMigrations: [
        { version: 1, sql: "CREATE TABLE test(id TEXT);" },
        { version: 2, sql: "CREATE INDEX test_idx ON test(id);" },
      ],
      localSchemaVersion: 2,
    };
  throw new Error(`Unexpected import: ${name}`);
};
const module = { exports: {} };
new Function("require", "module", "exports", javascript)(
  localRequire,
  module,
  module.exports,
);
const store = new module.exports.LocalStore();
const first = "00000000-0000-4000-8000-000000000001";
const second = "00000000-0000-4000-8000-000000000002";
await store.activate(first);
assert.equal(files.size, 1);
assert.equal(versions.values().next().value, 2);
assert.equal(directories.size, 1);
const originalKey = [...keys].find(([key]) => key.includes("database-key"))[1];
await store.activate(first);
assert.equal(
  [...keys].find(([key]) => key.includes("database-key"))[1],
  originalKey,
);
await assert.rejects(
  store.transaction(first, async () => {
    throw new Error("rollback");
  }),
  /rollback/,
);
assert.equal(statements.at(-1), "ROLLBACK");
await store.activate(second);
assert.equal(files.size, 1);
assert.equal(directories.size, 1);
assert.equal(
  [...keys].filter(([key]) => key.includes("database-key")).length,
  1,
);
await assert.rejects(
  store.read(first, async () => true),
  /账户已切换/,
);
await store.clearCurrent();
assert.equal(files.size, 0);
assert.equal(directories.size, 0);
assert.equal(keys.size, 0);
cipherEnabled = false;
await assert.rejects(
  new module.exports.LocalStore().activate(first),
  /SQLCipher/,
);
assert.equal(files.size, 0);
assert.equal(keys.size, 0);
process.stdout.write(
  "Mobile local store smoke passed: keyed activation, rollback, account purge, logout and plaintext guard.\n",
);
