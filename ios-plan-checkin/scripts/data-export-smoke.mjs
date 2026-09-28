import assert from "node:assert/strict";
import { Buffer } from "node:buffer";
import { execFileSync } from "node:child_process";
import { mkdtemp, readFile, rmdir, unlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import process from "node:process";
import { PGlite } from "@electric-sql/pglite";
import { datasets } from "../apps/worker/dist/dataExport.js";
import { ZipWriter } from "../apps/worker/dist/zip.js";
import { ExportsService } from "../apps/api/dist/exports/exports.service.js";

const db = new PGlite();
try {
  const manifest = JSON.parse(
    await readFile("db/migrations/manifest.json", "utf8"),
  );
  for (const migration of manifest.migrations)
    await db.exec(await readFile(`db/migrations/${migration.file}`, "utf8"));
  const first = await db.query(
    "INSERT INTO users(phone_ciphertext,phone_lookup_hash,username) VALUES(decode('01','hex'),decode('11','hex'),'export_owner') RETURNING id",
  );
  const second = await db.query(
    "INSERT INTO users(phone_ciphertext,phone_lookup_hash,username) VALUES(decode('02','hex'),decode('22','hex'),'other_owner') RETURNING id",
  );
  const owner = first.rows[0].id,
    other = second.rows[0].id;
  await db.query(
    "INSERT INTO plans(owner_id,kind,direction,title,timezone,start_date) VALUES($1,'fixed','do','我的计划','Asia/Shanghai','2026-09-01'),($2,'fixed','do','别人的计划','Asia/Shanghai','2026-09-01')",
    [owner, other],
  );
  await db.exec("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");
  await db.query("SELECT set_config('app.export_user',$1,true)", [owner]);
  for (const dataset of datasets) {
    const found = await db.query(dataset.sql);
    assert.ok(Array.isArray(found.rows), dataset.name);
    assert.ok(
      !dataset.fields.some((field) => /phone|token|ciphertext/i.test(field)),
      dataset.name,
    );
  }
  const plans = await db.query(
    datasets.find((dataset) => dataset.name === "plans").sql,
  );
  assert.equal(plans.rows.length, 1);
  assert.equal(plans.rows[0].title, "我的计划");
  await db.exec("COMMIT");
  const database = {
    query: (sql, params = []) => db.query(sql, params),
    transaction: async (work) => {
      await db.exec("BEGIN");
      try {
        const result = await work(db);
        await db.exec("COMMIT");
        return result;
      } catch (error) {
        await db.exec("ROLLBACK");
        throw error;
      }
    },
  };
  const service = new ExportsService(database, {
    downloadUrl: async () => "https://private.example/export.zip",
  });
  const idempotencyKey = "66a4a531-4985-4580-841c-02a4ce8b7f33";
  const created = await service.create(owner, idempotencyKey);
  assert.equal(created.status, "queued");
  assert.equal((await service.create(owner, idempotencyKey)).id, created.id);
  assert.equal((await service.list(other)).length, 0);
  await assert.rejects(service.get(other, created.id), /导出任务不存在/);
  await assert.rejects(
    service.download(owner, created.id, "request-1"),
    /尚未生成/,
  );
  await db.query(
    "UPDATE data_exports SET status='ready',object_key=$2,file_bytes=100,file_sha256=decode($3,'hex'),file_count=3,completed_at=now(),expires_at=now()+interval '1 hour' WHERE id=$1",
    [created.id, `exports/${owner}/${created.id}.zip`, "a".repeat(64)],
  );
  await assert.rejects(
    service.download(other, created.id, "request-2"),
    /尚未生成/,
  );
  const download = await service.download(owner, created.id, "request-3");
  assert.equal(download.bytes, 100);
  assert.equal(download.url, "https://private.example/export.zip");
  assert.equal(
    (
      await db.query(
        "SELECT count(*)::integer AS n FROM data_export_access WHERE export_id=$1",
        [created.id],
      )
    ).rows[0].n,
    1,
  );
} finally {
  await db.close();
}

const chunks = [];
const zip = new ZipWriter({
  write: async (chunk) => {
    chunks.push(chunk);
  },
});
await zip.add("json/profile.json", [Buffer.from('[{"name":"测试"}]')]);
await zip.add("csv/profile.csv", [Buffer.from("\uFEFFname\r\n测试\r\n")]);
await zip.add("manifest.json", [
  Buffer.from(JSON.stringify({ fileCount: 3, files: zip.files })),
]);
await zip.finish();
const directory = await mkdtemp(join(tmpdir(), "plan-export-zip-"));
const path = join(directory, "export.zip");
try {
  await writeFile(path, Buffer.concat(chunks));
  execFileSync("python", [
    "-c",
    `import sys,zipfile,json\np=sys.argv[1]\nwith zipfile.ZipFile(p) as z:\n assert z.testzip() is None\n assert set(z.namelist())=={'json/profile.json','csv/profile.csv','manifest.json'}\n assert json.loads(z.read('manifest.json'))['fileCount']==3\n assert '测试' in z.read('json/profile.json').decode('utf-8')`,
    path,
  ]);
} finally {
  await unlink(path);
  await rmdir(directory);
}
process.stdout.write(
  "Data export smoke passed: scoped SQL, owner-only download and independent ZIP extraction.\n",
);
