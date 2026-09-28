import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import process from "node:process";
import { TextEncoder } from "node:util";
import { PGlite } from "@electric-sql/pglite";
import { AuthService } from "../apps/api/dist/auth/auth.service.js";
import { DeletionService } from "../apps/api/dist/deletion/deletion.service.js";
import {
  finalizeDeletedPlans,
  finalizeDueAccounts,
} from "../apps/worker/dist/deletion.js";

const pg = new PGlite();
try {
  const manifest = JSON.parse(
    await readFile("db/migrations/manifest.json", "utf8"),
  );
  for (const migration of manifest.migrations)
    await pg.exec(await readFile(`db/migrations/${migration.file}`, "utf8"));
  const adapt = (client) => ({
    query: async (sql, params = []) => {
      const result = await client.query(sql, params);
      return {
        ...result,
        rowCount: result.rows.length || result.affectedRows || 0,
      };
    },
    release: () => {},
  });
  const database = {
    query: adapt(pg).query,
    transaction: (fn) => pg.transaction((tx) => fn(adapt(tx))),
  };
  const key = (label) => new TextEncoder().encode(label.padEnd(32, "x"));
  const config = {
    accessTokenKey: key("access"),
    phoneEncryptionKey: key("phone-encryption"),
    phoneLookupKey: key("phone-lookup"),
    otpHashKey: key("otp"),
    authIdempotencyKey: key("auth-idempotency"),
  };
  const delivered = new Map();
  const auth = new AuthService(config, database, {
    send: async (phone, code, purpose) =>
      delivered.set(`${purpose}:${phone}`, code),
  });
  const deletion = new DeletionService(database);
  const phone = "13800138000";
  const challenge = async (purpose) =>
    auth.createChallenge(
      { countryCode: "+86", phone, purpose },
      randomUUID(),
      randomUUID(),
    );
  const loginChallenge = await challenge("login");
  const tokens = await auth.verify(
    {
      challengeId: loginChallenge.challengeId,
      code: delivered.get(`login:+86${phone}`),
    },
    "ios-device",
    randomUUID(),
  );
  const userId = tokens.userId;
  const friend = await pg.query(
    "INSERT INTO users(phone_ciphertext,phone_lookup_hash,username) VALUES(decode('02','hex'),decode('22','hex'),'friend') RETURNING id",
  );
  const friendId = friend.rows[0].id;
  const [low, high] =
    userId < friendId ? [userId, friendId] : [friendId, userId];
  await pg.query("INSERT INTO friendships(user_low,user_high) VALUES($1,$2)", [
    low,
    high,
  ]);
  const shared = await pg.query(
    "INSERT INTO plans(owner_id,kind,direction,title,timezone,start_date) VALUES($1,'fixed','do','共享计划','Asia/Shanghai','2026-09-01') RETURNING id",
    [userId],
  );
  await pg.query("INSERT INTO plan_shares(plan_id,friend_id) VALUES($1,$2)", [
    shared.rows[0].id,
    friendId,
  ]);
  await assert.rejects(deletion.request(userId, false), /确认注销/);
  const pending = await deletion.request(userId, true);
  assert.equal(pending.status, "deletion_pending");
  assert.equal(
    Math.round((Date.parse(pending.dueAt) - Date.now()) / 86400000),
    30,
  );
  await assert.rejects(
    auth.authenticate(`Bearer ${tokens.accessToken}`),
    /会话已失效/,
  );
  await assert.rejects(
    auth.refresh(tokens.refreshToken, randomUUID()),
    /会话已失效/,
  );
  assert.equal((await deletion.status(userId)).status, "deletion_pending");
  assert.ok(
    (
      await pg.query("SELECT revoked_at FROM plan_shares WHERE plan_id=$1", [
        shared.rows[0].id,
      ])
    ).rows[0].revoked_at,
  );
  assert.equal(
    (
      await pg.query(
        "SELECT count(*)::integer AS n FROM change_log WHERE user_id=$1 AND operation='revoke'",
        [friendId],
      )
    ).rows[0].n,
    2,
  );
  await pg.query(
    "UPDATE auth_challenges SET created_at=now()-interval '2 minutes'",
  );
  const cancelChallenge = await challenge("cancel_deletion");
  const restored = await auth.verify(
    {
      challengeId: cancelChallenge.challengeId,
      code: delivered.get(`cancel_deletion:+86${phone}`),
    },
    "ios-device",
    randomUUID(),
    "cancel_deletion",
  );
  assert.equal(restored.userId, userId);
  assert.equal((await deletion.status(userId)).status, "active");
  assert.equal(
    (
      await pg.query("SELECT status FROM deletion_jobs WHERE user_id=$1", [
        userId,
      ])
    ).rows[0].status,
    "cancelled",
  );

  const plan = await pg.query(
    "INSERT INTO plans(owner_id,kind,direction,title,timezone,start_date,status,deleted_at) VALUES($1,'fixed','do','待删计划','Asia/Shanghai','2026-09-01','deleted',now()-interval '12 minutes') RETURNING id",
    [userId],
  );
  const planId = plan.rows[0].id;
  await pg.query(
    "INSERT INTO media(owner_id,one_time_plan_id,object_key,mime,bytes,status,completed_at) VALUES($1,$2,$3,'image/jpeg',10,'ready',now())",
    [userId, planId, `media/${randomUUID()}`],
  );
  const pool = { query: adapt(pg).query, connect: async () => adapt(pg) };
  assert.equal(await finalizeDeletedPlans(pool), 0);
  await pg.query(
    "UPDATE media SET status='deleted',deleted_at=now(),object_deleted_at=now() WHERE owner_id=$1",
    [userId],
  );
  assert.equal(await finalizeDeletedPlans(pool), 1);
  assert.equal(
    (
      await pg.query("SELECT status FROM plan_deletion_jobs WHERE plan_id=$1", [
        planId,
      ])
    ).rows[0].status,
    "completed",
  );
  assert.equal(
    (
      await pg.query("SELECT count(*)::integer AS n FROM plans WHERE id=$1", [
        planId,
      ])
    ).rows[0].n,
    0,
  );

  const remainingPlan = await pg.query(
    "INSERT INTO plans(owner_id,kind,direction,title,timezone,start_date) VALUES($1,'fixed','do','保留至到期','Asia/Shanghai','2026-09-01') RETURNING id",
    [userId],
  );
  await pg.query(
    "INSERT INTO media(owner_id,one_time_plan_id,object_key,mime,bytes,status,completed_at) VALUES($1,$2,$3,'image/jpeg',10,'ready',now())",
    [userId, remainingPlan.rows[0].id, `media/${randomUUID()}`],
  );
  const exportId = randomUUID();
  await pg.query(
    "INSERT INTO data_exports(id,user_id,status,object_key,file_bytes,file_sha256,file_count,expires_at) VALUES($1,$2,'ready',$3,100,decode($4,'hex'),2,now()+interval '1 day')",
    [exportId, userId, `exports/${userId}/${exportId}.zip`, "a".repeat(64)],
  );
  await deletion.request(userId, true);
  assert.ok(
    (
      await pg.query(
        "SELECT expires_at<=now() AS expired FROM data_exports WHERE id=$1",
        [exportId],
      )
    ).rows[0].expired,
  );
  await pg.query(
    "UPDATE users SET deletion_due_at=now()-interval '1 minute' WHERE id=$1",
    [userId],
  );
  await pg.query(
    "UPDATE deletion_jobs SET due_at=now()-interval '1 minute' WHERE user_id=$1",
    [userId],
  );
  assert.equal(await finalizeDueAccounts(pool), 0);
  assert.equal(
    (await pg.query("SELECT status FROM media WHERE owner_id=$1", [userId]))
      .rows[0].status,
    "deleted",
  );
  await pg.query("UPDATE media SET object_deleted_at=now() WHERE owner_id=$1", [
    userId,
  ]);
  assert.equal(await finalizeDueAccounts(pool), 0);
  await pg.query(
    "UPDATE data_exports SET status='expired',object_key=NULL,file_bytes=NULL,file_sha256=NULL,file_count=NULL WHERE id=$1",
    [exportId],
  );
  assert.equal(await finalizeDueAccounts(pool), 1);
  assert.equal(
    (
      await pg.query("SELECT count(*)::integer AS n FROM users WHERE id=$1", [
        userId,
      ])
    ).rows[0].n,
    0,
  );
  assert.equal(
    (await pg.query("SELECT count(*)::integer AS n FROM deletion_tombstones"))
      .rows[0].n,
    1,
  );
  assert.equal(
    (await pg.query("SELECT attempt_count FROM deletion_tombstones")).rows[0]
      .attempt_count,
    1,
  );
  await pg.query(
    "INSERT INTO users(phone_ciphertext,phone_lookup_hash,created_at) SELECT decode('09','hex'),subject_hash,completed_at+interval '1 second' FROM deletion_tombstones",
  );
  assert.equal(
    (
      await pg.query(
        "SELECT count(*)::integer AS n FROM users u JOIN deletion_tombstones t ON u.phone_lookup_hash=t.subject_hash AND u.created_at<=t.completed_at",
      )
    ).rows[0].n,
    0,
  );
  process.stdout.write(
    "Deletion smoke passed: immediate revocation, OTP cancellation, gated plan/account purge and tombstone.\n",
  );
} finally {
  await pg.close();
}
