import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import process from "node:process";
import { URL } from "node:url";
import { TextEncoder } from "node:util";
import { PGlite } from "@electric-sql/pglite";
import { AuthService } from "../apps/api/dist/auth/auth.service.js";
import { ProfileService } from "../apps/api/dist/profile/profile.service.js";

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
  const key = (label) => new TextEncoder().encode(label.padEnd(32, "x"));
  const config = {
    accessTokenKey: key("access"),
    phoneEncryptionKey: key("phone-encryption"),
    phoneLookupKey: key("phone-lookup"),
    otpHashKey: key("otp"),
    authIdempotencyKey: key("auth-idempotency"),
  };
  const delivered = new Map();
  const sms = {
    send: async (phone, code, purpose) => {
      delivered.set(`${purpose}:${phone}`, code);
    },
  };
  const auth = new AuthService(config, database, sms);
  const profile = new ProfileService(database, config);
  const login = async (phone) => {
    const challenge = await auth.createChallenge(
      { countryCode: "+86", phone, purpose: "login" },
      randomUUID(),
      randomUUID(),
    );
    return auth.verify(
      {
        challengeId: challenge.challengeId,
        code: delivered.get(`login:+86${phone}`),
      },
      randomUUID(),
      randomUUID(),
    );
  };

  const first = await login("13800138000");
  const initial = await profile.getMe(first.userId);
  assert.equal(initial.revision, 1);
  const profileKey = randomUUID();
  const updated = await profile.updateMe(
    first.userId,
    { username: "晨跑者", nickname: "晨晨", baseRevision: 1 },
    profileKey,
  );
  assert.equal(updated.username, "晨跑者");
  assert.equal(updated.revision, 2);
  await assert.rejects(
    profile.updateMe(
      first.userId,
      { username: "另一个用户名", baseRevision: 2 },
      randomUUID(),
    ),
    /用户名设置后不可修改/,
  );
  assert.deepEqual(
    await profile.updateMe(
      first.userId,
      { username: "晨跑者", nickname: "晨晨", baseRevision: 1 },
      profileKey,
    ),
    updated,
  );
  await assert.rejects(
    profile.updateMe(
      first.userId,
      { nickname: "另一个昵称", baseRevision: 1 },
      randomUUID(),
    ),
    /资料已在其他设备更新/,
  );
  assert.equal(
    (await profile.usernameAvailability("晨跑者", first.userId)).available,
    true,
  );

  const second = await login("13900139000");
  assert.equal(
    (await profile.usernameAvailability("晨跑者", second.userId)).available,
    false,
  );
  await assert.rejects(
    profile.updateMe(
      second.userId,
      { username: "晨跑者", baseRevision: 1 },
      randomUUID(),
    ),
    /用户名已被使用/,
  );
  await assert.rejects(
    auth.createPhoneChange(
      first.userId,
      { countryCode: "+86", phone: "13900139000" },
      randomUUID(),
    ),
    /手机号已绑定其他账号/,
  );

  const change = await auth.createPhoneChange(
    first.userId,
    { countryCode: "+86", phone: "13700137000" },
    randomUUID(),
  );
  assert.match(change.oldMasked, /\*{4}/);
  assert.equal(
    await auth.authenticate(`Bearer ${first.accessToken}`),
    first.userId,
  );
  await assert.rejects(
    auth.confirmPhoneChange(
      first.userId,
      { requestId: change.requestId, oldCode: "000000", newCode: "000000" },
      randomUUID(),
    ),
    /验证码不正确/,
  );
  const confirmed = await auth.confirmPhoneChange(
    first.userId,
    {
      requestId: change.requestId,
      oldCode: delivered.get("change_phone_old:+8613800138000"),
      newCode: delivered.get("change_phone_new:+8613700137000"),
    },
    randomUUID(),
  );
  assert.deepEqual(confirmed, { changed: true });
  await assert.rejects(
    auth.authenticate(`Bearer ${first.accessToken}`),
    /会话已失效/,
  );
  const newLogin = await login("13700137000");
  assert.equal(newLogin.userId, first.userId);
  assert.equal(newLogin.isNewUser, false);
  process.stdout.write(
    "Profile smoke passed: unique username, revision/idempotency, dual-code phone change and session revocation.\n",
  );
} finally {
  await pg.close();
}
