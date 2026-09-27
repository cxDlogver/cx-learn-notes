import assert from "node:assert/strict";
import { Buffer } from "node:buffer";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import process from "node:process";
import { URL } from "node:url";
import { PGlite } from "@electric-sql/pglite";
import { SyncService } from "../apps/api/dist/sync/sync.service.js";
import { appendUserChange } from "../apps/api/dist/sync/change-log.js";

const root = new URL("../", import.meta.url);
const manifest = JSON.parse(
  await readFile(new URL("db/migrations/manifest.json", root), "utf8"),
);
const pg = new PGlite();
try {
  for (const migration of manifest.migrations)
    await pg.exec(
      await readFile(new URL(`db/migrations/${migration.file}`, root), "utf8"),
    );
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
  const service = new SyncService(database, {
    authIdempotencyKey: Buffer.alloc(32, 3),
  });
  const users = [];
  for (const name of ["owner", "viewer"])
    users.push(
      (
        await pg.query(
          "INSERT INTO users (phone_ciphertext,phone_lookup_hash,username) VALUES ($1,$2,$3) RETURNING id",
          [Buffer.from(randomUUID()), Buffer.from(randomUUID()), name],
        )
      ).rows[0].id,
    );
  const [owner, viewer] = users;
  const planId = (
    await pg.query(
      `INSERT INTO plans (owner_id,kind,direction,title,timezone,start_date)
     VALUES ($1,'fixed','do','测试','Asia/Shanghai','2026-09-01') RETURNING id`,
      [owner],
    )
  ).rows[0].id;
  const groupId = (
    await pg.query(
      "INSERT INTO groups (owner_id,name) VALUES ($1,'健康') RETURNING id",
      [owner],
    )
  ).rows[0].id;
  await database.transaction(async (client) => {
    await appendUserChange(client, owner, "plan", planId, "upsert", {
      revision: 1,
    });
    await appendUserChange(client, owner, "group", groupId, "upsert", {
      revision: 1,
    });
    await appendUserChange(client, owner, "group", groupId, "delete");
  });
  await pg.query("DELETE FROM groups WHERE id=$1", [groupId]);
  const first = await service.changes(owner, undefined, "1");
  assert.equal(first.changes.length, 1);
  assert.equal(first.changes[0].entityType, "plan");
  assert.equal(first.hasMore, true);
  const second = await service.changes(owner, first.nextCursor, "2");
  assert.deepEqual(
    second.changes.map((row) => row.operation),
    ["delete", "delete"],
  );
  assert.equal(second.hasMore, false);
  assert.equal(
    (await service.changes(owner, second.nextCursor, undefined)).changes.length,
    0,
  );
  await assert.rejects(
    service.changes(viewer, first.nextCursor, undefined),
    /同步游标/,
  );
  await assert.rejects(
    service.changes(owner, `${first.nextCursor}x`, undefined),
    /同步游标/,
  );
  await assert.rejects(service.changes(owner, undefined, "201"), /批量大小/);
  const deviceId = randomUUID();
  assert.equal(
    (await service.acknowledge(owner, { cursor: second.nextCursor, deviceId }))
      .acknowledgedSeq,
    3,
  );
  await service.acknowledge(owner, { cursor: first.nextCursor, deviceId });
  assert.equal(
    (
      await pg.query(
        "SELECT last_seq FROM sync_acknowledgements WHERE user_id=$1 AND device_id=$2",
        [owner, deviceId],
      )
    ).rows[0].last_seq,
    3,
  );
  await assert.rejects(
    service.acknowledge(viewer, { cursor: first.nextCursor, deviceId }),
    /同步游标/,
  );
  await assert.rejects(
    service.acknowledge(owner, { deviceId }),
    /同步确认字段/,
  );
  await pg.query(
    "UPDATE plans SET status='deleted',deleted_at=now() WHERE id=$1",
    [planId],
  );
  assert.equal(
    (await service.changes(owner, undefined, "1")).changes[0].operation,
    "delete",
  );
  process.stdout.write(
    "Incremental sync smoke passed: pagination, current permissions, opaque cursor, ack monotonicity and deletion projection.\n",
  );
} finally {
  await pg.close();
}
