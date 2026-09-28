import assert from "node:assert/strict";
import { createHash, randomBytes, randomInt, randomUUID } from "node:crypto";
import { createServer } from "node:net";
import { createRequire } from "node:module";
import process from "node:process";
import { URL } from "node:url";

const databaseUrl = process.env.WEB_ATDD_DATABASE_URL;
if (!databaseUrl) throw new Error("WEB_ATDD_DATABASE_URL is required");
const parsed = new URL(databaseUrl);
if (
  !["127.0.0.1", "localhost"].includes(parsed.hostname) ||
  !/^web_atdd(?:_[a-z0-9]+)?$/.test(parsed.pathname.slice(1))
)
  throw new Error("HTTP smoke requires an isolated loopback web_atdd database");
const reservation = createServer();
await new Promise((resolve) => reservation.listen(0, "127.0.0.1", resolve));
const port = reservation.address().port;
await new Promise((resolve) => reservation.close(resolve));
const origin = `http://127.0.0.1:${port}`;
Object.assign(process.env, {
  APP_ENV: "development",
  DATABASE_URL: databaseUrl,
  WEB_ORIGIN: origin,
  SMS_PROVIDER: "stub",
  OBJECT_ENDPOINT: "http://127.0.0.1:9000",
  OBJECT_BUCKET: "web-atdd-unused",
  OBJECT_ACCESS_KEY_ID: "web-atdd-unused",
  OBJECT_SECRET_ACCESS_KEY: "web-atdd-unused",
  ACCESS_TOKEN_SECRET: "web_atdd_only_access",
  PHONE_ENCRYPTION_KEY: "web_atdd_only_phone_encrypt",
  PHONE_LOOKUP_KEY: "web_atdd_only_phone_lookup",
  OTP_HASH_KEY: "web_atdd_only_otp",
  AUTH_IDEMPOTENCY_KEY: "web_atdd_only_idempotency",
  PUSH_TOKEN_ENCRYPTION_KEY: "web_atdd_only_push",
});
const requireApi = createRequire(
  new URL("../apps/api/package.json", import.meta.url),
);
const { NestFactory } = requireApi("@nestjs/core");
const { AppModule } = await import("../apps/api/dist/app.module.js");
const { ApiExceptionFilter } = await import("../apps/api/dist/http.js");
const { ApiConfig } = await import("../apps/api/dist/config.js");
const { Database } = await import("../apps/api/dist/database.js");
const { SmsProvider } = await import("../apps/api/dist/auth/sms-provider.js");
const { installObservability } =
  await import("../apps/api/dist/observability.js");
const { businessDateAt } = await import("../packages/domain/dist/index.js");
const app = await NestFactory.create(AppModule, { logger: false });
let delivered;
app.get(SmsProvider).send = async (_phone, code) => {
  delivered = code;
};
app.setGlobalPrefix("api/v1");
app.useGlobalFilters(new ApiExceptionFilter());
const db = app.get(Database);
installObservability(app, db, app.get(ApiConfig));
try {
  await app.listen(port, "127.0.0.1");
  const request = async (method, path, body, token, key, extra = {}) => {
    const response = await globalThis.fetch(`${origin}/api/v1/${path}`, {
      method,
      headers: {
        "content-type": "application/json",
        "x-client-request-id": randomUUID(),
        ...(method !== "GET" ? { "idempotency-key": key ?? randomUUID() } : {}),
        ...(token ? { authorization: `Bearer ${token}` } : {}),
        ...(path === "auth/web/verify"
          ? { origin, "x-device-id": randomUUID() }
          : {}),
        ...extra,
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    return {
      status: response.status,
      body: await response.json(),
      cacheControl: response.headers.get("cache-control"),
    };
  };
  const login = async (phone) => {
    const number =
      phone ?? `138${String(randomInt(0, 100_000_000)).padStart(8, "0")}`;
    const challenge = await request("POST", "auth/sms/challenges", {
      countryCode: "+86",
      phone: number,
      purpose: "login",
    });
    assert.equal(challenge.status, 201);
    const verified = await request("POST", "auth/web/verify", {
      challengeId: challenge.body.data.challengeId,
      code: delivered,
    });
    assert.equal(verified.status, 201);
    return { ...verified.body.data, phone: number };
  };
  const a = await login();
  const b = await login();
  const c = await login();
  const d = await login();
  // The public OTP stub limits repeated challenges from one loopback IP.
  // Add a second isolated Web refresh session for B and obtain its access token via the real endpoint.
  const sessionId = randomUUID();
  const refresh = `${sessionId}.${randomBytes(32).toString("base64url")}`;
  await db.query(
    `INSERT INTO sessions(id,user_id,refresh_hash,device_id,expires_at,client_channel)
     VALUES($1,$2,$3,$4,now()+interval '30 days','web')`,
    [
      sessionId,
      b.userId,
      createHash("sha256").update(refresh).digest(),
      `atdd:${sessionId}`,
    ],
  );
  const restored = await request(
    "GET",
    "auth/web/session",
    undefined,
    undefined,
    undefined,
    { cookie: `__Host-plan-refresh=${refresh}` },
  );
  assert.equal(restored.status, 200);
  const b2 = restored.body.data;
  assert.equal(b.userId, b2.userId);
  for (const [alias, user] of Object.entries({ a, b, c, d }))
    await db.query("UPDATE users SET username=$2,nickname=$2 WHERE id=$1", [
      user.userId,
      `atdd_http_${alias}`,
    ]);
  const friendKey = randomUUID();
  const friendRequest = await request(
    "POST",
    "friend-requests",
    { receiverId: b.userId },
    a.accessToken,
    friendKey,
  );
  assert.equal(friendRequest.status, 201);
  assert.equal(
    (
      await request(
        "POST",
        "friend-requests",
        { receiverId: b.userId },
        a.accessToken,
        friendKey,
      )
    ).status,
    201,
  );
  const initialInbox = await request(
    "GET",
    "me/inbox",
    undefined,
    b.accessToken,
  );
  assert.equal(initialInbox.status, 200);
  assert.equal(initialInbox.body.data.messages[0].eventType, "friend_request");
  const accepted = await request(
    "POST",
    `friend-requests/${friendRequest.body.data.id}/accept`,
    undefined,
    b.accessToken,
  );
  assert.equal(accepted.status, 201);
  const acceptedInbox = await request(
    "GET",
    "me/inbox",
    undefined,
    a.accessToken,
  );
  assert.equal(
    acceptedInbox.body.data.messages[0].eventType,
    "friend_accepted",
  );

  const today = businessDateAt(new Date(), "Asia/Shanghai");
  const plan = await request(
    "POST",
    "plans",
    {
      kind: "fixed",
      direction: "do",
      title: "WEB-13 分享",
      timezone: "Asia/Shanghai",
      startDate: today,
      rule: { weekdays: [1, 2, 3, 4, 5, 6, 7] },
    },
    a.accessToken,
  );
  assert.equal(plan.status, 201);
  const planId = plan.body.data.id;
  const preview = await request(
    "GET",
    `plans/${planId}/share-preview?friendId=${b.userId}&month=${today.slice(0, 7)}`,
    undefined,
    a.accessToken,
  );
  assert.equal(preview.status, 200);
  const share = await request(
    "PUT",
    `plans/${planId}/shares/${b.userId}`,
    { previewToken: preview.body.data.previewToken },
    a.accessToken,
  );
  assert.equal(share.status, 200);
  const checkin = await request(
    "PUT",
    `plans/${planId}/checkins/${today}`,
    {
      result: "success",
      note: "PRIVATE_NOTE_SENTINEL",
      baseRevision: 0,
      clientCreatedAt: new Date().toISOString(),
      clientOperationId: randomUUID(),
      ruleVersion: 1,
    },
    a.accessToken,
  );
  assert.equal(checkin.status, 200);
  const encouragement = await request(
    "POST",
    `checkins/${checkin.body.data.id}/encouragements`,
    {
      kind: "message",
      body: "PRIVATE_COMMENT_SENTINEL",
    },
    b.accessToken,
  );
  assert.equal(encouragement.status, 201);
  const bPage = await request(
    "GET",
    "me/inbox?limit=1",
    undefined,
    b.accessToken,
  );
  assert.equal(bPage.status, 200);
  assert.equal(bPage.body.data.hasMore, true);
  const bNext = await request(
    "GET",
    `me/inbox?limit=1&cursor=${encodeURIComponent(bPage.body.data.nextCursor)}`,
    undefined,
    b2.accessToken,
  );
  assert.equal(bNext.status, 200);
  assert.notEqual(
    bPage.body.data.messages[0].id,
    bNext.body.data.messages[0].id,
  );
  const wrongCursor = await request(
    "GET",
    `me/inbox?limit=1&cursor=${encodeURIComponent(bPage.body.data.nextCursor)}`,
    undefined,
    c.accessToken,
  );
  assert.equal(wrongCursor.status, 400);
  const readKey = randomUUID();
  const read = await request(
    "POST",
    `me/inbox/${bPage.body.data.messages[0].id}/read`,
    undefined,
    b.accessToken,
    readKey,
  );
  assert.equal(read.status, 201);
  const readAgain = await request(
    "POST",
    `me/inbox/${bPage.body.data.messages[0].id}/read`,
    undefined,
    b.accessToken,
    readKey,
  );
  assert.deepEqual(readAgain.body.data, read.body.data);
  const bOtherBrowser = await request(
    "GET",
    "me/inbox",
    undefined,
    b2.accessToken,
  );
  assert.equal(
    bOtherBrowser.body.data.messages[0].readAt,
    read.body.data.readAt,
  );
  const foreignRead = await request(
    "POST",
    `me/inbox/${bPage.body.data.messages[0].id}/read`,
    undefined,
    c.accessToken,
  );
  assert.equal(foreignRead.status, 404);
  const beforeRevoke = await request(
    "GET",
    "me/inbox",
    undefined,
    b.accessToken,
  );
  assert.ok(
    beforeRevoke.body.data.messages.some(
      (item) => item.eventType === "share" && item.canOpen,
    ),
  );
  assert.ok(
    !JSON.stringify(beforeRevoke.body.data).includes("PRIVATE_NOTE_SENTINEL"),
  );
  assert.ok(
    !JSON.stringify(beforeRevoke.body.data).includes(
      "PRIVATE_COMMENT_SENTINEL",
    ),
  );
  const revoked = await request(
    "DELETE",
    `plans/${planId}/shares/${b.userId}`,
    undefined,
    a.accessToken,
  );
  assert.equal(revoked.status, 200);
  const afterRevoke = await request(
    "GET",
    "me/inbox",
    undefined,
    b2.accessToken,
  );
  assert.equal(afterRevoke.status, 200);
  for (const item of afterRevoke.body.data.messages.filter((entry) =>
    ["share", "shared_update"].includes(entry.eventType),
  )) {
    assert.equal(item.canOpen, false);
    assert.equal(item.subjectId, null);
    assert.equal(item.actorId, null);
  }
  const revokedPlan = await request(
    "GET",
    `shared-plans/${planId}`,
    undefined,
    b.accessToken,
  );
  assert.equal(revokedPlan.status, 403);
  const blocked = await request(
    "POST",
    "blocks",
    { blockedId: d.userId },
    a.accessToken,
  );
  assert.equal(blocked.status, 201);
  const dRequest = await request(
    "POST",
    "friend-requests",
    { receiverId: a.userId },
    d.accessToken,
  );
  assert.equal(dRequest.status, 403);
  assert.equal(
    (await request("GET", "me/inbox", undefined, c.accessToken)).body.data
      .messages.length,
    0,
  );
  assert.equal(
    (await request("GET", "me/inbox", undefined, d.accessToken)).body.data
      .messages.length,
    0,
  );
  const count = async (userId, type) =>
    Number(
      (
        await db.query(
          "SELECT count(*)::text AS n FROM inbox_messages WHERE recipient_user_id=$1 AND event_type=$2",
          [userId, type],
        )
      ).rows[0].n,
    );
  const summary = {
    accounts: 4,
    bSessions: 2,
    friendRequest: await count(b.userId, "friend_request"),
    friendAccepted: await count(a.userId, "friend_accepted"),
    share: await count(b.userId, "share"),
    sharedUpdate: await count(b.userId, "shared_update"),
    encouragement: await count(a.userId, "encouragement"),
    pageStatuses: [bPage.status, bNext.status],
    crossAccountCursor: wrongCursor.status,
    readStatuses: [read.status, readAgain.status, foreignRead.status],
    revokedShare: revokedPlan.status,
    blockedRequest: dRequest.status,
    privateCacheControl: afterRevoke.cacheControl,
    crossSessionReadEqual: true,
    revokedTargetsHidden: true,
    payloadPrivate: true,
  };
  assert.deepEqual(
    [
      summary.friendRequest,
      summary.friendAccepted,
      summary.share,
      summary.sharedUpdate,
      summary.encouragement,
    ],
    [1, 1, 1, 1, 1],
  );
  assert.equal(summary.privateCacheControl, "no-store");
  process.stdout.write(`${JSON.stringify(summary)}\n`);
} finally {
  await app.close();
}
