import assert from "node:assert/strict";
import { Buffer } from "node:buffer";
import {
  createCipheriv,
  createHash,
  createHmac,
  randomBytes,
} from "node:crypto";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import process from "node:process";
import { URL } from "node:url";
import pg from "pg";
import {
  addCalendarDays,
  businessDateAt,
  mondayOfWeek,
} from "../packages/domain/dist/index.js";

const [action, runId, serverNowUtc, expiryOffset] = process.argv.slice(2);
if (
  !["seed", "cleanup", "set-session-expiry"].includes(action) ||
  !/^[a-z0-9-]{3,40}$/.test(runId ?? "")
)
  throw new Error(
    "Use seed|cleanup|set-session-expiry RUN_ID [SERVER_NOW_UTC|ALIAS OFFSET_SECONDS]",
  );
const databaseUrl = process.env.WEB_ATDD_DATABASE_URL;
if (!databaseUrl) throw new Error("WEB_ATDD_DATABASE_URL is required");
const database = new URL(databaseUrl);
if (
  !["127.0.0.1", "localhost"].includes(database.hostname) ||
  !/^web_atdd(?:_[a-z0-9]+)?$/.test(database.pathname.slice(1)) ||
  process.env.APP_ENV !== "development" ||
  process.env.SMS_PROVIDER !== "stub"
)
  throw new Error(
    "Fixture only accepts loopback web_atdd database with development SMS stub",
  );
const fixtureRoot = resolve("docs/atdd/web/artifacts/fixtures", runId);
const manifestPath = resolve(fixtureRoot, "manifest.json");
const privatePath = resolve(fixtureRoot, "browser-sessions.json");
const namespace = createHash("sha256")
  .update(`web-atdd:${runId}`)
  .digest("hex")
  .slice(0, 12);
const fixtureUuid = (name) => {
  const hex = createHash("sha256").update(`${namespace}:${name}`).digest("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-a${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
};
const secret = (name) => {
  const raw = process.env[name];
  if (!raw?.startsWith("web_atdd_only_"))
    throw new Error(`${name} must be an isolated web_atdd_only_ test key`);
  return createHash("sha256").update(raw).digest();
};
const phoneKey = secret("PHONE_ENCRYPTION_KEY");
const lookupKey = secret("PHONE_LOOKUP_KEY");
const csrfKey = secret("AUTH_IDEMPOTENCY_KEY");
const encrypt = (value) => {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", phoneKey, iv);
  return Buffer.concat([
    iv,
    cipher.update(value, "utf8"),
    cipher.final(),
    cipher.getAuthTag(),
  ]);
};
const client = new pg.Client({ connectionString: databaseUrl });
await client.connect();
try {
  const migrated = await client.query(
    "SELECT count(*)::int AS n FROM schema_migrations",
  );
  assert.ok(migrated.rows[0]?.n >= 12, "Apply all 12 migrations first");
  if (action === "set-session-expiry") {
    if (
      !["A1", "A2", "A3", "B1", "C1", "D1"].includes(serverNowUtc) ||
      !/^-?\d{1,4}$/.test(expiryOffset ?? "") ||
      Math.abs(Number(expiryOffset)) > 3600
    )
      throw new Error(
        "Use one seeded session alias and an offset within one hour",
      );
    const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
    const sessions = JSON.parse(await readFile(privatePath, "utf8"));
    if (
      manifest.runId !== runId ||
      manifest.database !== database.pathname.slice(1) ||
      !sessions[serverNowUtc]
    )
      throw new Error("Fixture session does not match the test database");
    const result = await client.query(
      `UPDATE sessions s SET expires_at=clock_timestamp()+($3::integer * interval '1 second')
       FROM users u WHERE s.id=$1 AND s.user_id=u.id AND u.id=$2
         AND left(u.username,length($4))=$4
       RETURNING s.expires_at`,
      [
        sessions[serverNowUtc].sessionId,
        sessions[serverNowUtc].userId,
        Number(expiryOffset),
        `atdd_${namespace}_`,
      ],
    );
    if (result.rowCount !== 1)
      throw new Error("Refused to change a nonfixture session");
    const databaseNow = await client.query(
      "SELECT clock_timestamp() AS database_now",
    );
    process.stdout.write(
      `${JSON.stringify({
        runId,
        alias: serverNowUtc,
        offsetSeconds: Number(expiryOffset),
        expiresAt: result.rows[0].expires_at,
        databaseNow: databaseNow.rows[0].database_now,
      })}\n`,
    );
  } else if (action === "cleanup") {
    const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
    if (
      manifest.runId !== runId ||
      manifest.database !== database.pathname.slice(1)
    )
      throw new Error(
        "Fixture manifest does not match the requested test database",
      );
    const userIds = Object.values(manifest.users);
    await client.query("BEGIN");
    try {
      const found = await client.query(
        "SELECT id,username FROM users WHERE id = ANY($1::uuid[]) FOR UPDATE",
        [userIds],
      );
      if (
        found.rows.some((row) => !row.username.startsWith(`atdd_${namespace}_`))
      )
        throw new Error("Fixture cleanup refused a nonfixture user");
      await client.query("DELETE FROM users WHERE id = ANY($1::uuid[])", [
        userIds,
      ]);
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    }
    await unlink(privatePath).catch((error) => {
      if (error.code !== "ENOENT") throw error;
    });
    manifest.cleanedAt = new Date().toISOString();
    await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
    const remaining = await client.query(
      "SELECT count(*)::int AS n FROM users WHERE id = ANY($1::uuid[])",
      [userIds],
    );
    assert.equal(remaining.rows[0].n, 0);
    process.stdout.write(
      `${JSON.stringify({ runId, cleanedUsers: userIds.length, remainingUsers: 0 })}\n`,
    );
  } else {
    if (
      !serverNowUtc ||
      !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(serverNowUtc) ||
      Number.isNaN(new Date(serverNowUtc).valueOf())
    )
      throw new Error("SERVER_NOW_UTC must be an exact ISO UTC instant");
    const timezone = "Asia/Shanghai";
    const today = businessDateAt(serverNowUtc, timezone);
    const currentMonday = mondayOfWeek(today);
    const previousMonday = addCalendarDays(currentMonday, -7);
    const previousWednesday = addCalendarDays(previousMonday, 2);
    const previousThursday = addCalendarDays(previousMonday, 3);
    const users = Object.fromEntries(
      ["A", "B", "C", "D"].map((role) => [role, fixtureUuid(`user:${role}`)]),
    );
    const planSpecs = [
      ["F", "fixed", "do", [1, 3, 5], null, "周一三五"],
      ["F_AVOID", "fixed", "avoid", [1, 3, 5], null, "避免拖延"],
      ["FD", "fixed", "do", [1, 2, 3, 4, 5, 6, 7], null, "每日阅读"],
      ["FD_AVOID", "fixed", "avoid", [1, 2, 3, 4, 5, 6, 7], null, "每日少糖"],
      ["W", "weekly", "do", null, 3, "每周运动"],
      ["W_AVOID", "weekly", "avoid", null, 3, "每周少熬夜"],
      ["W_CHANGED", "weekly", "do", null, 3, "目标变更部分周"],
      ["O", "one_time", "do", null, null, "体检预约"],
      ["PAUSED", "fixed", "do", [1, 3, 5], null, "暂停样本"],
      ["ARCHIVED", "fixed", "do", [1, 3, 5], null, "归档样本"],
    ];
    const plans = Object.fromEntries(
      planSpecs.map(([code]) => [code, fixtureUuid(`plan:${code}`)]),
    );
    const sessions = {};
    await client.query("BEGIN");
    try {
      const duplicate = await client.query(
        "SELECT id FROM users WHERE id = ANY($1::uuid[])",
        [Object.values(users)],
      );
      if (duplicate.rowCount)
        throw new Error("Fixture already exists; cleanup it before reseeding");
      for (const [role, id] of Object.entries(users)) {
        const sentinel = `ATDD/${runId}/${role}`;
        await client.query(
          "INSERT INTO users(id,phone_ciphertext,phone_lookup_hash,username,nickname) VALUES($1,$2,$3,$4,$5)",
          [
            id,
            encrypt(sentinel),
            createHmac("sha256", lookupKey).update(sentinel).digest(),
            `atdd_${namespace}_${role.toLowerCase()}`,
            `测试${role}`,
          ],
        );
      }
      for (const alias of ["A1", "A2", "A3", "B1", "C1", "D1"]) {
        const role = alias[0];
        const id = fixtureUuid(`session:${alias}`);
        const refresh = `${id}.${randomBytes(32).toString("base64url")}`;
        await client.query(
          `INSERT INTO sessions(id,user_id,refresh_hash,device_id,expires_at,client_channel)
           VALUES($1,$2,$3,$4,now()+interval '30 days','web')`,
          [
            id,
            users[role],
            createHash("sha256").update(refresh).digest(),
            `atdd:${runId}:${alias}`,
          ],
        );
        sessions[alias] = {
          userId: users[role],
          sessionId: id,
          cookie: `__Host-plan-refresh=${refresh}`,
          csrf: createHmac("sha256", csrfKey)
            .update(`web-csrf:${refresh}`)
            .digest("base64url"),
        };
      }
      const groupId = fixtureUuid("group:main");
      await client.query(
        "INSERT INTO groups(id,owner_id,name) VALUES($1,$2,$3)",
        [groupId, users.A, "Web ATDD"],
      );
      for (const [
        code,
        kind,
        direction,
        weekdays,
        target,
        title,
      ] of planSpecs) {
        const oneTime = kind === "one_time";
        const status =
          code === "PAUSED"
            ? "paused"
            : code === "ARCHIVED"
              ? "archived"
              : "active";
        await client.query(
          `INSERT INTO plans(id,owner_id,group_id,kind,direction,title,timezone,start_date,due_date,status,current_rule_version)
           VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
          [
            plans[code],
            users.A,
            groupId,
            kind,
            direction,
            title,
            timezone,
            previousMonday,
            oneTime ? addCalendarDays(today, 2) : null,
            status,
            code === "W_CHANGED" ? 2 : 1,
          ],
        );
        await client.query(
          `INSERT INTO plan_rule_versions(id,plan_id,version,effective_date,weekdays,weekly_target)
           VALUES($1,$2,1,$3,$4,$5)`,
          [
            fixtureUuid(`rule:${code}:1`),
            plans[code],
            previousMonday,
            weekdays,
            target,
          ],
        );
        if (code === "W_CHANGED")
          await client.query(
            `INSERT INTO plan_rule_versions(id,plan_id,version,effective_date,weekly_target)
             VALUES($1,$2,2,$3,4)`,
            [fixtureUuid("rule:W_CHANGED:2"), plans[code], previousThursday],
          );
        if (status !== "active")
          await client.query(
            `INSERT INTO plan_lifecycle_events(plan_id,seq,action,effective_at,business_date)
             VALUES($1,1,$2,$3,$4)`,
            [
              plans[code],
              status === "paused" ? "pause" : "archive",
              serverNowUtc,
              today,
            ],
          );
      }
      await client.query(
        `INSERT INTO plan_numeric_config_versions(id,plan_id,version,effective_from,label,unit)
         VALUES($1,$2,1,$3,'距离','公里'),($4,$2,2,$5,'用时','分钟'),
               ($6,$7,1,$3,'体重','千克')`,
        [
          fixtureUuid("numeric:F:1"),
          plans.F,
          previousMonday,
          fixtureUuid("numeric:F:2"),
          currentMonday,
          fixtureUuid("numeric:O:1"),
          plans.O,
        ],
      );
      await client.query(
        `INSERT INTO checkins(id,plan_id,owner_id,business_date,result,numeric_value,numeric_unit,numeric_label,
          numeric_config_version_id,rule_version_id)
         VALUES($1,$2,$3,$4,'success',4.25,'公里','距离',$5,$6),
               ($7,$2,$3,$8,'success',35,'分钟','用时',$9,$6)`,
        [
          fixtureUuid("checkin:F:old"),
          plans.F,
          users.A,
          previousWednesday,
          fixtureUuid("numeric:F:1"),
          fixtureUuid("rule:F:1"),
          fixtureUuid("checkin:F:new"),
          currentMonday,
          fixtureUuid("numeric:F:2"),
        ],
      );
      for (const offset of [0, 1, 2])
        await client.query(
          `INSERT INTO checkins(id,plan_id,owner_id,business_date,result,rule_version_id)
           VALUES($1,$2,$3,$4,'success',$5)`,
          [
            fixtureUuid(`checkin:W:${offset}`),
            plans.W,
            users.A,
            addCalendarDays(previousMonday, offset),
            fixtureUuid("rule:W:1"),
          ],
        );
      await client.query(
        "INSERT INTO friendships(user_low,user_high) VALUES($1,$2)",
        [
          users.A < users.B ? users.A : users.B,
          users.A < users.B ? users.B : users.A,
        ],
      );
      await client.query(
        "INSERT INTO blocks(blocker_id,blocked_id) VALUES($1,$2)",
        [users.A, users.D],
      );
      await client.query(
        "INSERT INTO plan_shares(plan_id,friend_id) VALUES($1,$2)",
        [plans.F, users.B],
      );
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    }
    const counts = await client.query(
      `SELECT (SELECT count(*)::int FROM users WHERE id = ANY($1::uuid[])) AS users,
              (SELECT count(*)::int FROM plans WHERE owner_id=$2) AS plans,
              (SELECT count(*)::int FROM sessions WHERE user_id = ANY($1::uuid[])) AS sessions,
              (SELECT count(*)::int FROM checkins WHERE owner_id=$2) AS checkins`,
      [Object.values(users), users.A],
    );
    assert.deepEqual(counts.rows[0], {
      users: 4,
      plans: 10,
      sessions: 6,
      checkins: 5,
    });
    const manifest = {
      runId,
      database: database.pathname.slice(1),
      serverNowUtc,
      timezone,
      today,
      previousMonday,
      users,
      plans,
      counts: counts.rows[0],
      aliases: ["A1", "A2", "A3", "B1", "C1", "D1"],
      seededAt: new Date().toISOString(),
    };
    await mkdir(fixtureRoot, { recursive: true });
    await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
    await writeFile(privatePath, `${JSON.stringify(sessions, null, 2)}\n`, {
      mode: 0o600,
    });
    process.stdout.write(
      `${JSON.stringify({
        runId,
        serverNowUtc,
        today,
        users: counts.rows[0].users,
        plans: counts.rows[0].plans,
        sessions: counts.rows[0].sessions,
        checkins: counts.rows[0].checkins,
        friendPairs: 1,
        blockedPairs: 1,
        shares: 1,
        privateSessionFile: "ignored-local-artifact",
      })}\n`,
    );
  }
} finally {
  await client.end();
}
