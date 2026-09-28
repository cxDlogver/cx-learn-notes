import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import process from "node:process";
import { URL } from "node:url";
import ts from "typescript";

const root = new URL("../", import.meta.url);
async function load(path) {
  const source = await readFile(new URL(path, root), "utf8");
  let javascript = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  javascript = javascript.replaceAll(
    'from "@plan-checkin/domain"',
    `from "${new URL("packages/domain/dist/index.js", root).href}"`,
  );
  return import(`data:text/javascript,${encodeURIComponent(javascript)}`);
}

const { SessionManager } = await load("apps/mobile/src/data/session.ts");
const { parseAppLink } = await load("apps/mobile/src/navigation/links.ts");
const {
  normalizePhone,
  phonePattern,
  maskPhone,
  validUsername,
  validNickname,
  remainingSeconds,
} = await load("apps/mobile/src/viewmodel/auth.ts");
const memory = () => {
  let value = null;
  return {
    read: async () => value,
    write: async (next) => {
      value = next;
    },
    clear: async () => {
      value = null;
    },
  };
};
const tokens = (refreshToken = "rotated") => ({
  accessToken: "access",
  refreshToken,
  accessExpiresAt: new Date(Date.now() + 3_600_000).toISOString(),
  userId: "00000000-0000-4000-8000-000000000001",
  isNewUser: false,
});

const store = memory();
const session = new SessionManager(
  store,
  { refresh: async (value) => tokens(`${value}-new`) },
  (error) => error?.status === 401,
);
await session.restore();
assert.equal(session.getSnapshot().phase, "unauthenticated");
await store.write("saved");
await session.restore();
assert.equal(session.getSnapshot().phase, "authenticated");
assert.equal(await store.read(), "saved-new");
assert.equal(await session.accessToken(), "access");
await session.clear();
assert.equal(await store.read(), null);

const logoutStore = memory();
const revoked = [];
const logoutSession = new SessionManager(
  logoutStore,
  {
    refresh: async () => tokens(),
    logout: async (value) => revoked.push(value),
  },
  () => false,
);
await logoutSession.adopt(tokens("active-refresh"));
await logoutSession.logout();
assert.deepEqual(revoked, ["active-refresh"]);
assert.equal(logoutSession.getSnapshot().phase, "unauthenticated");
assert.equal(await logoutStore.read(), null);
const failedLogout = new SessionManager(
  logoutStore,
  {
    refresh: async () => tokens(),
    logout: async () => {
      throw new Error("offline");
    },
  },
  () => false,
);
await failedLogout.adopt(tokens("preserved-refresh"));
await assert.rejects(() => failedLogout.logout(), /offline/);
assert.equal(failedLogout.getSnapshot().phase, "authenticated");
assert.equal(await logoutStore.read(), "preserved-refresh");

const transientStore = memory();
await transientStore.write("still-saved");
const transient = new SessionManager(
  transientStore,
  {
    refresh: async () => {
      throw new Error("offline");
    },
  },
  () => false,
);
await transient.restore();
assert.equal(transient.getSnapshot().phase, "unavailable");
assert.equal(await transientStore.read(), "still-saved");

const invalidStore = memory();
await invalidStore.write("revoked");
const invalid = new SessionManager(
  invalidStore,
  {
    refresh: async () => {
      throw { status: 401 };
    },
  },
  (error) => error?.status === 401,
);
await invalid.restore();
assert.equal(invalid.getSnapshot().phase, "unauthenticated");
assert.equal(await invalidStore.read(), null);

const lifecycleEvents = [];
const localAware = new SessionManager(
  memory(),
  { refresh: async () => tokens() },
  () => false,
  {
    activate: async (userId) => lifecycleEvents.push(`activate:${userId}`),
    clearCurrent: async () => lifecycleEvents.push("clear"),
  },
);
await localAware.adopt(tokens());
await localAware.adopt({
  ...tokens(),
  userId: "00000000-0000-4000-8000-000000000002",
});
await localAware.clear();
assert.deepEqual(lifecycleEvents, [
  "activate:00000000-0000-4000-8000-000000000001",
  "activate:00000000-0000-4000-8000-000000000002",
  "clear",
]);

assert.equal(normalizePhone("138 0012 3456"), "13800123456");
assert.equal(phonePattern.test(normalizePhone("138 0012 3456")), true);
assert.equal(phonePattern.test("12800123456"), false);
assert.equal(maskPhone("13800123456"), "138****3456");
assert.equal(validUsername("晨跑者_01"), true);
assert.equal(validUsername("ab!"), false);
assert.equal(validNickname("林晓"), true);
assert.equal(validNickname(" "), false);
assert.equal(remainingSeconds(1_999, 1_000), 1);

const planId = "01234567-89ab-4def-8abc-0123456789ab";
assert.deepEqual(parseAppLink(`plancheckin://plan/${planId}`), {
  screen: "PlanDetail",
  planId,
});
assert.deepEqual(parseAppLink(`plancheckin://checkin/${planId}/2026-09-28`), {
  screen: "Checkin",
  planId,
  businessDate: "2026-09-28",
});
for (const link of [
  `https://example.com/plan/${planId}`,
  `plancheckin://plan/${planId}?redirect=https://evil.example`,
  `plancheckin://plan/${planId}#fragment`,
  `plancheckin://checkin/${planId}/2026-02-30`,
  `plancheckin://checkin/${planId}/2026-09-28/extra`,
  "plancheckin://plan/invalid",
])
  assert.equal(parseAppLink(link), null, link);
process.stdout.write(
  "Mobile architecture smoke passed: session recovery, rotation and guarded links.\n",
);
