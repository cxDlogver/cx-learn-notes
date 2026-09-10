import fs from "node:fs";
import path from "node:path";
import { randomBytes, randomUUID } from "node:crypto";
import { DatabaseSync } from "node:sqlite";
import { AppDatabase } from "../QHZHC_Server/dist/server/database.js";
import { hashPassword } from "../QHZHC_Server/dist/server/password.js";
// Test-only: always create a NEW isolated file. Never opens or rotates credentials in an existing database.
export function createPerformanceFixture(directory = ".performance-work") {
  const root = path.resolve(directory);
  fs.mkdirSync(root, { recursive: true });
  const filename = path.join(root, "performance-fixture-" + randomUUID() + ".sqlite");
  const created = fs.openSync(filename, "wx");
  fs.closeSync(created);
  const seeded = new AppDatabase(filename);
  seeded.close();
  const password = randomBytes(32).toString("base64url");
  const { hash, salt } = hashPassword(password);
  const database = new DatabaseSync(filename);
  try {
    database
      .prepare("UPDATE users SET password_hash=?,password_salt=? WHERE username=?")
      .run(hash, salt, "admin");
  } finally {
    database.close();
  }
  return { filename, username: "admin", password };
}
