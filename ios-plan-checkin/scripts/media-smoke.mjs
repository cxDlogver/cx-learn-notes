import assert from "node:assert/strict";
import { Buffer } from "node:buffer";
import console from "node:console";
import { createHash, randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { URL } from "node:url";
import { PGlite } from "@electric-sql/pglite";
import { MediaService } from "../apps/api/dist/media/media.service.js";
import {
  claimMediaCleanup,
  enqueueMediaCleanup,
  processMediaCleanup,
} from "../apps/worker/dist/mediaCleanup.js";

const root = new URL("../", import.meta.url);
const manifest = JSON.parse(
  await readFile(new URL("db/migrations/manifest.json", root), "utf8"),
);
const pg = new PGlite();
const adapt = (client) => ({
  query: async (sql, params) => {
    const result = await client.query(sql, params);
    return {
      ...result,
      rowCount: result.rows.length || result.affectedRows || 0,
    };
  },
});
const database = {
  query: adapt(pg).query,
  transaction: (fn) => pg.transaction((tx) => fn(adapt(tx))),
};
const pool = {
  query: adapt(pg).query,
  connect: async () => ({ ...adapt(pg), release() {} }),
};
const objects = new Map();
const store = {
  async uploadUrl(key) {
    return `https://private.example.test/upload/${key}`;
  },
  async downloadUrl(key) {
    return `https://private.example.test/download/${key}`;
  },
  async read(key) {
    const value = objects.get(key);
    if (!value) throw new Error("Object missing");
    return {
      Body: (async function* () {
        yield value;
      })(),
    };
  },
  async delete(key) {
    objects.delete(key);
  },
};
const service = new MediaService(database, store);
const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3, 4]);
const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");

try {
  for (const migration of manifest.migrations)
    await pg.exec(
      await readFile(new URL(`db/migrations/${migration.file}`, root), "utf8"),
    );
  const owners = [];
  for (const username of ["alice", "bob"])
    owners.push(
      (
        await pg.query(
          `INSERT INTO users(phone_ciphertext,phone_lookup_hash,username)
           VALUES($1,$2,$3) RETURNING id`,
          [Buffer.from(randomUUID()), Buffer.from(randomUUID()), username],
        )
      ).rows[0].id,
    );
  const [alice, bob] = owners;
  const planId = (
    await pg.query(
      `INSERT INTO plans(owner_id,kind,direction,title,timezone,start_date)
       VALUES($1,'fixed','do','跑步','Asia/Shanghai',current_date) RETURNING id`,
      [alice],
    )
  ).rows[0].id;
  const ruleId = (
    await pg.query(
      `INSERT INTO plan_rule_versions(plan_id,version,effective_date,weekdays)
       VALUES($1,1,current_date,ARRAY[1,2,3,4,5,6,7]::smallint[]) RETURNING id`,
      [planId],
    )
  ).rows[0].id;
  const checkinId = (
    await pg.query(
      `INSERT INTO checkins(plan_id,owner_id,business_date,result,rule_version_id)
       VALUES($1,$2,current_date,'success',$3) RETURNING id`,
      [planId, alice, ruleId],
    )
  ).rows[0].id;

  await assert.rejects(
    service.createIntent(alice, {
      mime: "image/svg+xml",
      bytes: 20,
      sha256: sha256(jpeg),
    }),
    /照片格式/,
  );
  const intent = await service.createIntent(alice, {
    mime: "image/jpeg",
    bytes: jpeg.length,
    sha256: sha256(jpeg),
  });
  const row = (
    await pg.query("SELECT object_key FROM media WHERE id=$1", [intent.id])
  ).rows[0];
  await assert.rejects(
    service.complete(alice, intent.id, { checkinId }),
    /尚未上传/,
  );
  objects.set(row.object_key, Buffer.from("wrong"));
  await assert.rejects(
    service.complete(alice, intent.id, { checkinId }),
    /授权不一致/,
  );
  objects.set(row.object_key, jpeg);
  await assert.rejects(
    service.complete(bob, intent.id, { checkinId }),
    /照片不存在/,
  );
  const completed = await service.complete(alice, intent.id, { checkinId });
  assert.equal(completed.status, "ready");
  assert.equal(
    (await service.complete(alice, intent.id, { checkinId })).id,
    intent.id,
  );
  await assert.rejects(service.download(bob, intent.id), /照片不存在/);
  assert.match(
    (await service.download(alice, intent.id)).url,
    /private\.example/,
  );
  await service.remove(alice, intent.id);
  await assert.rejects(service.download(alice, intent.id), /照片不存在/);

  const orphan = await service.createIntent(alice, {
    mime: "image/jpeg",
    bytes: jpeg.length,
    sha256: sha256(jpeg),
  });
  const orphanKey = (
    await pg.query("SELECT object_key FROM media WHERE id=$1", [orphan.id])
  ).rows[0].object_key;
  objects.set(orphanKey, jpeg);
  await pg.query(
    "UPDATE media SET created_at=now()-interval '25 hours' WHERE id=$1",
    [orphan.id],
  );
  await enqueueMediaCleanup(pool);
  let jobs = 0;
  while (jobs < 5) {
    const job = await claimMediaCleanup(pool);
    if (!job) break;
    await processMediaCleanup(pool, store, job);
    jobs++;
  }
  assert.equal(objects.has(orphanKey), false);
  assert.equal(
    (await pg.query("SELECT status FROM media WHERE id=$1", [orphan.id]))
      .rows[0].status,
    "deleted",
  );
  console.log(
    "Media owner, content, idempotency and orphan cleanup smoke passed.",
  );
} finally {
  await pg.close();
}
