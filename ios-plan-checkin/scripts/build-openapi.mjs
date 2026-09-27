import { readFile, writeFile } from "node:fs/promises";
import process from "node:process";
import { URL } from "node:url";
import openapiTS, { astToString } from "openapi-typescript";
import prettier from "prettier";
import ts from "typescript";

const root = new URL("../", import.meta.url);
const routeSource = await readFile(
  new URL("packages/contracts/src/routes.ts", root),
  "utf8",
);
const js = ts.transpileModule(routeSource, {
  compilerOptions: {
    module: ts.ModuleKind.ESNext,
    target: ts.ScriptTarget.ES2022,
  },
}).outputText;
const { apiRoutes, errorCodes } = await import(
  `data:text/javascript,${encodeURIComponent(js)}`
);

const ref = (name) => ({ $ref: `#/components/schemas/${name}` });
const str = (format) => ({ type: "string", ...(format ? { format } : {}) });
const uuid = str("uuid");
const date = str("date");
const instant = str("date-time");
const decimal = {
  type: "string",
  pattern: "^-?(?:0|[1-9][0-9]*)(?:\\.[0-9]+)?$",
};
const object = { type: "object", additionalProperties: true };
const properties = (required, fields, extra = {}) => ({
  type: "object",
  required,
  properties: fields,
  additionalProperties: false,
  ...extra,
});
const schemas = {
  ApiError: properties(["code", "message", "requestId"], {
    code: { type: "string", enum: errorCodes },
    message: str(),
    requestId: str(),
    details: object,
  }),
  ApiSuccess: properties(["data", "requestId", "serverTime"], {
    data: object,
    requestId: str(),
    serverTime: instant,
  }),
  NumericEntry: properties(["value", "unit"], { value: decimal, unit: str() }),
  FixedPlanCreate: properties(
    ["kind", "direction", "title", "timezone", "startDate", "rule"],
    {
      kind: { const: "fixed" },
      direction: { enum: ["do", "avoid"] },
      title: str(),
      timezone: str(),
      startDate: date,
      endDate: { oneOf: [date, { type: "null" }] },
      groupId: { oneOf: [uuid, { type: "null" }] },
      rule: properties(["weekdays"], {
        weekdays: {
          type: "array",
          items: { type: "integer", minimum: 1, maximum: 7 },
          minItems: 1,
          uniqueItems: true,
        },
      }),
    },
  ),
  WeeklyPlanCreate: properties(
    ["kind", "direction", "title", "timezone", "startDate", "rule"],
    {
      kind: { const: "weekly" },
      direction: { enum: ["do", "avoid"] },
      title: str(),
      timezone: str(),
      startDate: date,
      endDate: { oneOf: [date, { type: "null" }] },
      groupId: { oneOf: [uuid, { type: "null" }] },
      rule: properties(["weeklyTarget"], {
        weeklyTarget: { type: "integer", minimum: 1, maximum: 7 },
      }),
    },
  ),
  OneTimePlanCreate: properties(
    ["kind", "direction", "title", "timezone", "startDate", "dueDate"],
    {
      kind: { const: "one_time" },
      direction: { const: "do" },
      title: str(),
      timezone: str(),
      startDate: date,
      dueDate: date,
      groupId: { oneOf: [uuid, { type: "null" }] },
    },
  ),
  CreatePlanRequest: {
    oneOf: [
      ref("FixedPlanCreate"),
      ref("WeeklyPlanCreate"),
      ref("OneTimePlanCreate"),
    ],
    discriminator: { propertyName: "kind" },
  },
  PutCheckinRequest: properties(
    [
      "result",
      "baseRevision",
      "clientCreatedAt",
      "clientOperationId",
      "ruleVersion",
    ],
    {
      result: { enum: ["success", "failure", "skip"] },
      note: { oneOf: [str(), { type: "null" }] },
      numeric: { oneOf: [ref("NumericEntry"), { type: "null" }] },
      mediaIds: { type: "array", items: uuid },
      baseRevision: { type: "integer", minimum: 0 },
      clientCreatedAt: instant,
      clientOperationId: uuid,
      ruleVersion: { type: "integer", minimum: 1 },
      resolutionOfConflictId: uuid,
    },
  ),
  OneTimeResolutionRequest: properties(["resolution", "baseRevision"], {
    resolution: { enum: ["completed", "failed", "cancelled"] },
    baseRevision: { type: "integer", minimum: 0 },
    completedAt: instant,
    reason: str(),
  }),
  SmsChallengeRequest: properties(["countryCode", "phone", "purpose"], {
    countryCode: { const: "+86" },
    phone: { type: "string", pattern: "^1[3-9][0-9]{9}$" },
    purpose: { enum: ["login", "change_phone", "cancel_deletion"] },
  }),
  SmsVerifyRequest: properties(["challengeId", "code"], {
    challengeId: uuid,
    code: { type: "string", pattern: "^[0-9]{6}$" },
  }),
  RefreshRequest: properties(["refreshToken"], { refreshToken: str() }),
  LogoutRequest: properties([], { refreshToken: str() }),
  SmsChallengeResponse: properties(
    ["challengeId", "expiresAt", "resendAfterSeconds"],
    {
      challengeId: uuid,
      expiresAt: instant,
      resendAfterSeconds: { type: "integer", minimum: 0 },
    },
  ),
};
Object.assign(schemas, {
  AuthTokens: properties(
    ["accessToken", "refreshToken", "accessExpiresAt", "userId", "isNewUser"],
    {
      accessToken: str(),
      refreshToken: str(),
      accessExpiresAt: instant,
      userId: uuid,
      isNewUser: { type: "boolean" },
    },
  ),
  User: properties(
    [
      "id",
      "username",
      "nickname",
      "avatarMediaId",
      "accountStatus",
      "revision",
    ],
    {
      id: uuid,
      username: { oneOf: [str(), { type: "null" }] },
      nickname: { oneOf: [str(), { type: "null" }] },
      avatarMediaId: { oneOf: [uuid, { type: "null" }] },
      accountStatus: { enum: ["active", "deletion_pending"] },
      revision: { type: "integer", minimum: 1 },
    },
  ),
  Plan: properties(
    [
      "id",
      "ownerId",
      "kind",
      "direction",
      "title",
      "timezone",
      "startDate",
      "lifecycle",
      "ruleVersion",
      "revision",
    ],
    {
      id: uuid,
      ownerId: uuid,
      kind: { enum: ["fixed", "weekly", "one_time"] },
      direction: { enum: ["do", "avoid"] },
      title: str(),
      timezone: str(),
      startDate: date,
      endDate: { oneOf: [date, { type: "null" }] },
      dueDate: { oneOf: [date, { type: "null" }] },
      lifecycle: { enum: ["active", "paused", "archived", "deleted"] },
      ruleVersion: { type: "integer", minimum: 1 },
      revision: { type: "integer", minimum: 1 },
    },
  ),
  Checkin: properties(
    [
      "id",
      "planId",
      "businessDate",
      "result",
      "revision",
      "ruleVersion",
      "syncSequence",
    ],
    {
      id: uuid,
      planId: uuid,
      businessDate: date,
      result: { enum: ["success", "failure", "skip"] },
      note: { oneOf: [str(), { type: "null" }] },
      numeric: { oneOf: [ref("NumericEntry"), { type: "null" }] },
      mediaIds: { type: "array", items: uuid },
      isBackfilled: { type: "boolean" },
      isRevised: { type: "boolean" },
      revision: { type: "integer", minimum: 1 },
      ruleVersion: { type: "integer", minimum: 1 },
      createdAt: instant,
      updatedAt: instant,
      syncSequence: { type: "integer", minimum: 0 },
    },
  ),
  SyncChanges: properties(["changes", "nextCursor", "hasMore"], {
    changes: { type: "array", items: object },
    nextCursor: str(),
    hasMore: { type: "boolean" },
  }),
  UpdateMeRequest: properties(["baseRevision"], {
    baseRevision: { type: "integer", minimum: 1 },
    username: str(),
    nickname: str(),
    avatarMediaId: { oneOf: [uuid, { type: "null" }] },
  }),
  ChangePhoneChallengeRequest: properties(["countryCode", "phone"], {
    countryCode: { const: "+86" },
    phone: { type: "string", pattern: "^1[3-9][0-9]{9}$" },
  }),
  ChangePhoneConfirmRequest: properties(["requestId", "oldCode", "newCode"], {
    requestId: uuid,
    oldCode: { type: "string", pattern: "^[0-9]{6}$" },
    newCode: { type: "string", pattern: "^[0-9]{6}$" },
  }),
  ChangePhoneChallengeResponse: properties(
    ["requestId", "oldMasked", "newMasked", "expiresAt"],
    {
      requestId: uuid,
      oldMasked: str(),
      newMasked: str(),
      expiresAt: instant,
    },
  ),
  UsernameAvailability: properties(["available", "normalized"], {
    available: { type: "boolean" },
    normalized: str(),
  }),
});

const successOf = (data) =>
  properties(["data", "requestId", "serverTime"], {
    data,
    requestId: str(),
    serverTime: instant,
  });
const responseData = {
  createSmsChallenge: ref("SmsChallengeResponse"),
  verifySmsChallenge: ref("AuthTokens"),
  refreshSession: ref("AuthTokens"),
  getMe: ref("User"),
  updateMe: ref("User"),
  checkUsername: ref("UsernameAvailability"),
  createChangePhoneChallenge: ref("ChangePhoneChallengeResponse"),
  createPlan: ref("Plan"),
  getPlan: ref("Plan"),
  updatePlan: ref("Plan"),
  putCheckin: ref("Checkin"),
  getCheckin: ref("Checkin"),
  getSyncChanges: ref("SyncChanges"),
};

const bodies = {
  createSmsChallenge: "SmsChallengeRequest",
  verifySmsChallenge: "SmsVerifyRequest",
  refreshSession: "RefreshRequest",
  logout: "LogoutRequest",
  updateMe: "UpdateMeRequest",
  createChangePhoneChallenge: "ChangePhoneChallengeRequest",
  confirmChangePhone: "ChangePhoneConfirmRequest",
  createPlan: "CreatePlanRequest",
  putCheckin: "PutCheckinRequest",
  createOneTimeResolution: "OneTimeResolutionRequest",
  reviseOneTimeResolution: "OneTimeResolutionRequest",
};
const paths = {};
for (const [method, suffix, operationId, auth] of apiRoutes) {
  const path = `/api/v1/${suffix}`;
  const parameters = [...suffix.matchAll(/\{([^}]+)\}/g)].map((match) => ({
    name: match[1],
    in: "path",
    required: true,
    schema: match[1] === "businessDate" ? date : uuid,
  }));
  if (operationId === "getSyncChanges") {
    parameters.push({
      name: "cursor",
      in: "query",
      required: false,
      schema: str(),
    });
    parameters.push({
      name: "limit",
      in: "query",
      required: false,
      schema: { type: "integer", minimum: 1, maximum: 200 },
    });
  } else if (operationId === "searchUsers") {
    parameters.push({
      name: "username",
      in: "query",
      required: true,
      schema: str(),
    });
  } else if (operationId === "checkUsername") {
    parameters.push({
      name: "username",
      in: "query",
      required: true,
      schema: str(),
    });
  }
  if (operationId === "verifySmsChallenge") {
    parameters.push({
      name: "X-Device-Id",
      in: "header",
      required: true,
      schema: str(),
    });
  }
  if (method !== "GET" && method !== "DELETE") {
    parameters.push({
      name: "Idempotency-Key",
      in: "header",
      required: true,
      schema: uuid,
    });
    parameters.push({
      name: "X-Client-Request-Id",
      in: "header",
      required: true,
      schema: str(),
    });
  }
  const body = bodies[operationId];
  paths[path] ??= {};
  paths[path][method.toLowerCase()] = {
    operationId,
    tags: [suffix.split("/")[0]],
    ...(auth ? { security: [{ bearerAuth: [] }] } : {}),
    ...(parameters.length ? { parameters } : {}),
    ...(body
      ? {
          requestBody: {
            required: true,
            content: { "application/json": { schema: ref(body) } },
          },
        }
      : {}),
    responses: {
      200: {
        description: "Success",
        content: {
          "application/json": {
            schema: responseData[operationId]
              ? successOf(responseData[operationId])
              : ref("ApiSuccess"),
          },
        },
      },
      400: {
        description: "Invalid request",
        content: { "application/json": { schema: ref("ApiError") } },
      },
      401: {
        description: "Unauthenticated",
        content: { "application/json": { schema: ref("ApiError") } },
      },
      403: {
        description: "Forbidden",
        content: { "application/json": { schema: ref("ApiError") } },
      },
      409: {
        description: "Conflict",
        content: { "application/json": { schema: ref("ApiError") } },
      },
      429: {
        description: "Rate limited",
        content: { "application/json": { schema: ref("ApiError") } },
      },
    },
  };
}
const spec = {
  openapi: "3.1.0",
  info: { title: "计划打卡 API", version: "0.1.0" },
  servers: [{ url: "/" }],
  paths,
  components: {
    securitySchemes: {
      bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" },
    },
    schemas,
  },
};
const target = new URL("packages/contracts/openapi.json", root);
const serialized = await prettier.format(JSON.stringify(spec), {
  parser: "json",
});
const typeTarget = new URL("packages/contracts/src/openapi.generated.ts", root);
const generatedTypes = await prettier.format(
  `// Generated from packages/contracts/openapi.json. Do not edit.\n${astToString(await openapiTS(spec))}`,
  { parser: "typescript" },
);
if (process.argv.includes("--write")) {
  await writeFile(target, serialized, "utf8");
  await writeFile(typeTarget, generatedTypes, "utf8");
  process.stdout.write(`Generated ${apiRoutes.length} OpenAPI operations.\n`);
} else if (process.argv.includes("--check")) {
  if ((await readFile(target, "utf8")) !== serialized) {
    throw new Error(
      "OpenAPI drifted from route/types source. Run contracts:build.",
    );
  }
  if ((await readFile(typeTarget, "utf8")) !== generatedTypes) {
    throw new Error(
      "Generated client types drifted from OpenAPI. Run contracts:build.",
    );
  }
  const ids = apiRoutes.map((route) => route[2]);
  if (new Set(ids).size !== ids.length)
    throw new Error("Duplicate OpenAPI operation IDs.");
  process.stdout.write(
    `OpenAPI route catalog contains ${ids.length} unique operations.\n`,
  );
} else {
  throw new Error("Use --write or --check.");
}
