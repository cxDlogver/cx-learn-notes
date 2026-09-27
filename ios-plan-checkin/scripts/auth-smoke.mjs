import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import process from "node:process";
import { URL } from "node:url";
import { TextEncoder } from "node:util";
import { PGlite } from "@electric-sql/pglite";
import { AuthService } from "../apps/api/dist/auth/auth.service.js";

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
  let delivered = null;
  const sms = {
    send: async (phone, code) => {
      delivered = { phone, code };
    },
  };
  const auth = new AuthService(config, database, sms);
  const challengeKey = randomUUID();
  const challenge = await auth.createChallenge(
    { countryCode: "+86", phone: "13800138000", purpose: "login" },
    "127.0.0.1",
    challengeKey,
  );
  assert.equal(delivered.phone, "+8613800138000");
  const repeatedChallenge = await auth.createChallenge(
    { countryCode: "+86", phone: "13800138000", purpose: "login" },
    "127.0.0.1",
    challengeKey,
  );
  assert.deepEqual(repeatedChallenge, challenge);
  await assert.rejects(
    auth.createChallenge(
      { countryCode: "+86", phone: "13900139000", purpose: "login" },
      "127.0.0.1",
      challengeKey,
    ),
    /该操作标识已用于另一请求/,
  );
  await assert.rejects(
    auth.createChallenge(
      { countryCode: "+86", phone: "13800138000", purpose: "login" },
      "127.0.0.1",
      randomUUID(),
    ),
    /请求过于频繁/,
  );
  await assert.rejects(
    auth.verify(
      { challengeId: challenge.challengeId, code: "000000" },
      "ios-test-device",
      randomUUID(),
    ),
    /验证码不正确/,
  );
  const verifyKey = randomUUID();
  const tokens = await auth.verify(
    { challengeId: challenge.challengeId, code: delivered.code },
    "ios-test-device",
    verifyKey,
  );
  assert.deepEqual(
    await auth.verify(
      { challengeId: challenge.challengeId, code: delivered.code },
      "ios-test-device",
      verifyKey,
    ),
    tokens,
  );
  assert.equal(tokens.isNewUser, true);
  assert.equal(
    await auth.authenticate(`Bearer ${tokens.accessToken}`),
    tokens.userId,
  );
  const refreshKey = randomUUID();
  const rotated = await auth.refresh(tokens.refreshToken, refreshKey);
  assert.deepEqual(
    await auth.refresh(tokens.refreshToken, refreshKey),
    rotated,
  );
  await assert.rejects(
    auth.refresh(tokens.refreshToken, randomUUID()),
    /会话已失效/,
  );
  await auth.logout(rotated.refreshToken, randomUUID());
  await assert.rejects(
    auth.authenticate(`Bearer ${rotated.accessToken}`),
    /会话已失效/,
  );
  process.stdout.write(
    "Auth smoke passed: OTP, access token, refresh rotation and logout.\n",
  );
} finally {
  await pg.close();
}
