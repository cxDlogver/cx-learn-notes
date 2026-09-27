import assert from "node:assert/strict";
import { Buffer } from "node:buffer";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import process from "node:process";
import { URL } from "node:url";
import { PGlite } from "@electric-sql/pglite";
import { SocialService } from "../apps/api/dist/social/social.service.js";

const root = new URL("../", import.meta.url);
const manifest = JSON.parse(
  await readFile(new URL("db/migrations/manifest.json", root), "utf8"),
);
const pg = new PGlite();
try {
  for (const migration of manifest.migrations) {
    await pg.exec(
      await readFile(new URL(`db/migrations/${migration.file}`, root), "utf8"),
    );
  }
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
  const social = new SocialService(database, {
    authIdempotencyKey: Buffer.alloc(32, 5),
  });
  const users = [];
  for (const username of ["alice", "bob", "charlie"]) {
    const id = (
      await pg.query(
        `INSERT INTO users (phone_ciphertext, phone_lookup_hash, username, nickname)
       VALUES ($1, $2, $3, $4) RETURNING id`,
        [
          Buffer.from(randomUUID()),
          Buffer.from(randomUUID()),
          username,
          username,
        ],
      )
    ).rows[0].id;
    users.push(id);
  }
  const [alice, bob, charlie] = users;
  assert.equal((await social.search(alice, "BOB")).length, 1);
  assert.deepEqual(await social.search(alice, "ali"), []);
  assert.deepEqual(await social.search(alice, "char"), []);
  await assert.rejects(
    social.request(alice, alice, randomUUID()),
    /不能添加自己/,
  );
  const key = randomUUID();
  const sent = await social.request(alice, bob, key);
  assert.equal(sent.status, "pending");
  assert.deepEqual(await social.request(alice, bob, key), sent);
  assert.equal((await social.requests(bob)).incoming.length, 1);
  const mutual = await social.request(bob, alice, randomUUID());
  assert.equal(mutual.status, "accepted");
  assert.equal((await social.friends(alice)).length, 1);
  assert.equal((await social.requests(alice)).outgoing.length, 0);
  await assert.rejects(
    social.accept(charlie, sent.id, randomUUID()),
    /好友申请不存在/,
  );
  await assert.rejects(
    social.request(alice, bob, randomUUID()),
    /双方已是好友/,
  );

  const planId = (
    await pg.query(
      `INSERT INTO plans (owner_id, kind, direction, title, timezone, start_date)
     VALUES ($1, 'fixed', 'do', 'test', 'Asia/Shanghai', '2026-09-01') RETURNING id`,
      [alice],
    )
  ).rows[0].id;
  await pg.query(
    "INSERT INTO plan_shares (plan_id, friend_id) VALUES ($1, $2)",
    [planId, bob],
  );
  await social.remove(alice, bob, randomUUID());
  assert.equal((await social.friends(bob)).length, 0);
  assert.ok(
    (
      await pg.query("SELECT revoked_at FROM plan_shares WHERE plan_id = $1", [
        planId,
      ])
    ).rows[0].revoked_at,
  );
  assert.ok(
    (
      await pg.query(
        "SELECT 1 FROM change_log WHERE user_id = $1 AND entity_type = 'share' AND operation = 'revoke'",
        [bob],
      )
    ).rows.length,
  );

  const second = await social.request(alice, bob, randomUUID());
  assert.equal(
    (await social.accept(bob, second.id, randomUUID())).status,
    "accepted",
  );
  assert.equal((await social.block(bob, alice, randomUUID())).blocked, true);
  assert.deepEqual(await social.search(alice, "bob"), []);
  assert.equal((await social.friends(alice)).length, 0);
  await assert.rejects(
    social.request(alice, bob, randomUUID()),
    /无法向该用户发送好友申请/,
  );
  assert.equal(
    (await social.unblock(bob, alice, randomUUID())).unblocked,
    true,
  );
  assert.equal((await social.friends(alice)).length, 0);
  assert.equal((await social.search(alice, "bob")).length, 1);
  process.stdout.write("Social relation smoke passed.\n");
} finally {
  await pg.close();
}
