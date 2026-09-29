import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { createServer } from "node:net";
import { createRequire } from "node:module";
import { resolve } from "node:path";
import process from "node:process";
import { URL } from "node:url";

const runId = process.argv[2];
const expiredAlias = process.argv[3] ?? null;
if (!/^[a-z0-9-]{3,40}$/.test(runId ?? "")) throw new Error("RUN_ID required");
if (
  expiredAlias !== null &&
  !["A1", "A2", "A3", "B1", "C1", "D1"].includes(expiredAlias)
)
  throw new Error("Unknown expected expired alias");
const databaseUrl = process.env.WEB_ATDD_DATABASE_URL;
if (!databaseUrl) throw new Error("WEB_ATDD_DATABASE_URL required");
const database = new URL(databaseUrl);
if (
  !["127.0.0.1", "localhost"].includes(database.hostname) ||
  !/^web_atdd(?:_[a-z0-9]+)?$/.test(database.pathname.slice(1)) ||
  process.env.APP_ENV !== "development" ||
  process.env.SMS_PROVIDER !== "stub"
)
  throw new Error("Session probe only accepts isolated Web ATDD test database");
const privatePath = resolve(
  "docs/atdd/web/artifacts/fixtures",
  runId,
  "browser-sessions.json",
);
const sessions = JSON.parse(await readFile(privatePath, "utf8"));
const reservation = createServer();
await new Promise((done) => reservation.listen(0, "127.0.0.1", done));
const port = reservation.address().port;
await new Promise((done) => reservation.close(done));
const origin = `http://127.0.0.1:${port}`;
process.env.DATABASE_URL = databaseUrl;
process.env.WEB_ORIGIN = origin;
process.env.OBJECT_ENDPOINT = "http://127.0.0.1:9000";
process.env.OBJECT_BUCKET = "web-atdd-unused";
process.env.OBJECT_ACCESS_KEY_ID = "web-atdd-unused";
process.env.OBJECT_SECRET_ACCESS_KEY = "web-atdd-unused";
const requireApi = createRequire(
  new URL("../apps/api/package.json", import.meta.url),
);
const { NestFactory } = requireApi("@nestjs/core");
const { AppModule } = await import("../apps/api/dist/app.module.js");
const { ApiExceptionFilter } = await import("../apps/api/dist/http.js");
const { ApiConfig } = await import("../apps/api/dist/config.js");
const { Database } = await import("../apps/api/dist/database.js");
const { installObservability } =
  await import("../apps/api/dist/observability.js");
const app = await NestFactory.create(AppModule, { logger: false });
app.setGlobalPrefix("api/v1");
app.useGlobalFilters(new ApiExceptionFilter());
installObservability(app, app.get(Database), app.get(ApiConfig));
try {
  await app.listen(port, "127.0.0.1");
  const observed = {};
  for (const [alias, session] of Object.entries(sessions)) {
    const response = await globalThis.fetch(
      `${origin}/api/v1/auth/web/session`,
      {
        headers: {
          cookie: session.cookie,
          "x-client-request-id": randomUUID(),
        },
      },
    );
    const payload = await response.json();
    if (alias === expiredAlias) {
      assert.equal(response.status, 401, alias);
      assert.equal(payload.code, "UNAUTHENTICATED", alias);
      observed[alias] = { status: response.status, userId: session.userId };
      continue;
    }
    assert.equal(response.status, 200, alias);
    assert.equal(payload.data.userId, session.userId, alias);
    assert.equal(response.headers.get("cache-control"), "no-store");
    assert.ok(payload.data.accessToken);
    observed[alias] = { status: response.status, userId: payload.data.userId };
  }
  assert.equal(observed.A1.userId, observed.A2.userId);
  assert.equal(observed.A1.userId, observed.A3.userId);
  assert.equal(
    new Set(Object.values(sessions).map((entry) => entry.sessionId)).size,
    6,
  );
  assert.equal(
    new Set(Object.values(observed).map((entry) => entry.userId)).size,
    4,
  );
  process.stdout.write(
    `${JSON.stringify({
      runId,
      sessionStatuses: Object.fromEntries(
        Object.entries(observed).map(([alias, value]) => [alias, value.status]),
      ),
      distinctUsers: 4,
      distinctSessions: 6,
      sameAccountA: true,
      expiredAlias,
      privateCacheControl: "no-store",
    })}\n`,
  );
} finally {
  await app.close();
}
