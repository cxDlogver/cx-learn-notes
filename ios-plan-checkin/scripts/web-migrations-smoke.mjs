import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import pg from "pg";

const root = new URL("../", import.meta.url);
const manifest = JSON.parse(
  await readFile(new URL("db/migrations/manifest.json", root), "utf8"),
);
const webMigration = "0012_web_compatibility.sql";
const sql = await readFile(
  new URL(`db/migrations/${webMigration}`, root),
  "utf8",
);
const databaseUrl = process.env.WEB_ATDD_DATABASE_URL;
let db;
let engine = "PGlite";
if (databaseUrl) {
  const parsed = new URL(databaseUrl);
  if (
    !["127.0.0.1", "localhost"].includes(parsed.hostname) ||
    !/^web_atdd(?:_[a-z0-9]+)?$/.test(parsed.pathname.slice(1))
  ) {
    throw new Error("PostgreSQL smoke requires a loopback web_atdd database");
  }
  const client = new pg.Client({ connectionString: databaseUrl });
  await client.connect();
  db = {
    query: (sql, values) => client.query(sql, values),
    exec: (sql) => client.query(sql),
    close: () => client.end(),
  };
  engine = "PostgreSQL";
  const existing = await db.query(
    "SELECT count(*)::int AS n FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE'",
  );
  if (existing.rows[0].n !== 0) {
    await db.close();
    throw new Error("PostgreSQL smoke requires an empty web_atdd database");
  }
} else {
  db = new PGlite();
}
try {
  for (const migration of manifest.migrations) {
    if (migration.file === webMigration) break;
    await db.exec(
      await readFile(new URL(`db/migrations/${migration.file}`, root), "utf8"),
    );
  }
  const owner = await db.query(
    "INSERT INTO users(phone_ciphertext,phone_lookup_hash) VALUES(decode('01','hex'),decode('11','hex')) RETURNING id",
  );
  const other = await db.query(
    "INSERT INTO users(phone_ciphertext,phone_lookup_hash) VALUES(decode('02','hex'),decode('12','hex')) RETURNING id",
  );
  const ownerId = owner.rows[0].id;
  const otherId = other.rows[0].id;
  await db.query(
    "INSERT INTO notification_preferences(user_id,friend_requests,shared_updates,encouragements,revision) VALUES($1,false,true,false,3)",
    [ownerId],
  );
  await db.query(
    "INSERT INTO sessions(user_id,refresh_hash,device_id,expires_at) VALUES($1,decode('21','hex'),'legacy-ios',now()+interval '30 days')",
    [ownerId],
  );
  const fixed = await db.query(
    `INSERT INTO plans(owner_id,kind,direction,title,timezone,start_date)
     VALUES($1,'fixed','do','Legacy run','Asia/Shanghai','2026-09-01') RETURNING id`,
    [ownerId],
  );
  const fixedId = fixed.rows[0].id;
  const rule = await db.query(
    `INSERT INTO plan_rule_versions(plan_id,version,effective_date,weekdays,numeric_config)
     VALUES($1,1,'2026-09-01',ARRAY[1,2,3,4,5,6,7]::SMALLINT[],$2::jsonb) RETURNING id`,
    [fixedId, JSON.stringify({ label: "Distance", unit: "km" })],
  );
  await db.query(
    `INSERT INTO checkins(plan_id,owner_id,business_date,result,rule_version_id,numeric_value,numeric_unit)
     VALUES($1,$2,'2026-09-21','success',$3,5.5,'km')`,
    [fixedId, ownerId, rule.rows[0].id],
  );
  const once = await db.query(
    `INSERT INTO plans(owner_id,kind,direction,title,timezone,start_date,due_date)
     VALUES($1,'one_time','do','Legacy finish','Asia/Shanghai','2026-09-01','2026-09-30') RETURNING id`,
    [ownerId],
  );
  await db.query(
    `INSERT INTO one_time_resolutions(plan_id,resolution,resolved_business_date,resolved_at,note)
     VALUES($1,'completed','2026-09-20',now(),'old note')`,
    [once.rows[0].id],
  );

  // A transactional rollback must leave the legacy schema and rows untouched.
  await db.exec("BEGIN");
  await db.exec(sql);
  await db.exec("ROLLBACK");
  const before = await db.query(
    "SELECT count(*)::int AS n FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE'",
  );
  assert.equal(before.rows[0].n, 37);
  const legacy = await db.query(
    "SELECT friend_requests,revision FROM notification_preferences WHERE user_id=$1",
    [ownerId],
  );
  assert.deepEqual(legacy.rows[0], { friend_requests: false, revision: 3 });

  await db.exec(sql);
  const after = await db.query(
    "SELECT count(*)::int AS n FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE'",
  );
  assert.equal(after.rows[0].n, 41);
  const ios = await db.query(
    "SELECT channel,friend_requests,shared_updates,encouragements,revision FROM channel_notification_preferences WHERE user_id=$1",
    [ownerId],
  );
  assert.deepEqual(ios.rows, [
    {
      channel: "ios",
      friend_requests: false,
      shared_updates: true,
      encouragements: false,
      revision: 3,
    },
  ]);
  const session = await db.query(
    "SELECT client_channel FROM sessions WHERE user_id=$1",
    [ownerId],
  );
  assert.equal(session.rows[0].client_channel, "ios");
  const record = await db.query(
    "SELECT numeric_value::text AS value,numeric_unit,numeric_label FROM checkins WHERE plan_id=$1",
    [fixedId],
  );
  assert.deepEqual(record.rows[0], {
    value: "5.500000",
    numeric_unit: "km",
    numeric_label: "Distance",
  });
  const oneTime = await db.query(
    "SELECT note,numeric_value,numeric_unit FROM one_time_resolutions WHERE plan_id=$1",
    [once.rows[0].id],
  );
  assert.deepEqual(oneTime.rows[0], {
    note: "old note",
    numeric_value: null,
    numeric_unit: null,
  });

  const version = await db.query(
    `INSERT INTO plan_numeric_config_versions(plan_id,version,effective_from,label,unit)
     VALUES($1,1,'2026-09-28','Minutes','min') RETURNING id`,
    [once.rows[0].id],
  );
  await db.query(
    `UPDATE one_time_resolutions SET numeric_value=45,numeric_unit='min',numeric_label='Minutes',numeric_config_version_id=$2
     WHERE plan_id=$1`,
    [once.rows[0].id, version.rows[0].id],
  );
  await assert.rejects(
    db.query(
      "UPDATE checkins SET numeric_config_version_id=$1 WHERE plan_id=$2",
      [version.rows[0].id, fixedId],
    ),
    /foreign key/i,
  );
  await assert.rejects(
    db.query(
      "UPDATE one_time_resolutions SET numeric_unit=NULL WHERE plan_id=$1",
      [once.rows[0].id],
    ),
    /check constraint/i,
  );
  await assert.rejects(
    db.query(
      "UPDATE plan_numeric_config_versions SET unit='hours' WHERE id=$1",
      [version.rows[0].id],
    ),
    /append-only/i,
  );
  await db.query(
    `INSERT INTO inbox_messages(recipient_user_id,event_type,actor_user_id,business_event_key)
     VALUES($1,'friend_request',$2,'request:1')`,
    [ownerId, otherId],
  );
  await assert.rejects(
    db.query(
      `INSERT INTO inbox_messages(recipient_user_id,event_type,actor_user_id,business_event_key)
       VALUES($1,'friend_request',$2,'request:1')`,
      [ownerId, otherId],
    ),
    /duplicate key/i,
  );
  await db.query(
    `INSERT INTO web_push_subscriptions
      (user_id,browser_device_id,endpoint_hash,endpoint_ciphertext,p256dh_ciphertext,auth_ciphertext)
     VALUES($1,'browser-test-1',decode(repeat('a1',32),'hex'),decode('01','hex'),decode('02','hex'),decode('03','hex'))`,
    [ownerId],
  );
  await assert.rejects(
    db.query(
      `INSERT INTO web_push_subscriptions
        (user_id,browser_device_id,endpoint_hash,endpoint_ciphertext,p256dh_ciphertext,auth_ciphertext)
       VALUES($1,'browser-test-2',decode(repeat('a1',32),'hex'),decode('01','hex'),decode('02','hex'),decode('03','hex'))`,
      [otherId],
    ),
    /duplicate key/i,
  );
  await db.query(
    "INSERT INTO worker_jobs(name,payload) VALUES('send-web-push','{}'::jsonb)",
  );
  await db.query(
    "INSERT INTO worker_jobs(name,payload) VALUES('send-plan-reminder','{}'::jsonb)",
  );
  process.stdout.write(
    `${engine} Web migration smoke passed: rollback, 37→41 tables, iOS backfill, legacy numeric snapshot, one-time result, inbox, Push and worker constraints.\n`,
  );
} finally {
  await db.close();
}
