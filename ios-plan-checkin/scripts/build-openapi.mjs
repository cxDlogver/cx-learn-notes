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
  ReminderConfig: properties(["enabled"], {
    enabled: { type: "boolean" },
    timeLocal: { type: "string", pattern: "^([01][0-9]|2[0-3]):[0-5][0-9]$" },
    weekdays: {
      type: "array",
      items: { type: "integer", minimum: 1, maximum: 7 },
      uniqueItems: true,
    },
    daysBeforeDue: { enum: [0, 1, 3] },
  }),
  FixedPlanCreate: properties(
    ["kind", "direction", "title", "timezone", "startDate", "rule"],
    {
      kind: { const: "fixed" },
      direction: { enum: ["do", "avoid"] },
      title: str(),
      description: { oneOf: [str(), { type: "null" }] },
      timezone: str(),
      startDate: date,
      endDate: { oneOf: [date, { type: "null" }] },
      groupId: { oneOf: [uuid, { type: "null" }] },
      reminder: ref("ReminderConfig"),
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
      description: { oneOf: [str(), { type: "null" }] },
      timezone: str(),
      startDate: date,
      endDate: { oneOf: [date, { type: "null" }] },
      groupId: { oneOf: [uuid, { type: "null" }] },
      reminder: ref("ReminderConfig"),
      rule: properties(["weeklyTarget"], {
        weeklyTarget: { type: "integer", minimum: 1, maximum: 7 },
      }),
    },
  ),
  OneTimePlanCreate: properties(
    ["kind", "direction", "title", "timezone", "dueDate"],
    {
      kind: { const: "one_time" },
      direction: { const: "do" },
      title: str(),
      description: { oneOf: [str(), { type: "null" }] },
      timezone: str(),
      startDate: date,
      dueDate: date,
      groupId: { oneOf: [uuid, { type: "null" }] },
      reminder: ref("ReminderConfig"),
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
  UpdatePlanRequest: properties(["baseRevision"], {
    baseRevision: { type: "integer", minimum: 1 },
    title: str(),
    description: { oneOf: [str(), { type: "null" }] },
    groupId: { oneOf: [uuid, { type: "null" }] },
    endDate: { oneOf: [date, { type: "null" }] },
    dueDate: date,
    rule: {
      oneOf: [
        properties(["weekdays"], {
          weekdays: {
            type: "array",
            items: { type: "integer", minimum: 1, maximum: 7 },
            minItems: 1,
            uniqueItems: true,
          },
        }),
        properties(["weeklyTarget"], {
          weeklyTarget: { type: "integer", minimum: 1, maximum: 7 },
        }),
      ],
    },
  }),
  Group: properties(["id", "name", "sortOrder", "revision"], {
    id: uuid,
    name: str(),
    sortOrder: { type: "integer" },
    revision: { type: "integer", minimum: 1 },
  }),
  CreateGroupRequest: properties(["name"], {
    name: str(),
    sortOrder: { type: "integer" },
  }),
  UpdateGroupRequest: properties(["baseRevision"], {
    baseRevision: { type: "integer", minimum: 1 },
    name: str(),
    sortOrder: { type: "integer" },
  }),
  LifecycleRequest: properties(["baseRevision"], {
    baseRevision: { type: "integer", minimum: 1 },
  }),
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
      failureReason: { oneOf: [str(), { type: "null" }] },
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
  SocialUser: properties(["id", "username", "nickname", "avatarMediaId"], {
    id: uuid,
    username: str(),
    nickname: { oneOf: [str(), { type: "null" }] },
    avatarMediaId: { oneOf: [uuid, { type: "null" }] },
  }),
  FriendRequest: properties(
    ["id", "sender", "receiver", "status", "createdAt", "respondedAt"],
    {
      id: uuid,
      sender: ref("SocialUser"),
      receiver: ref("SocialUser"),
      status: { enum: ["pending", "accepted", "rejected", "cancelled"] },
      createdAt: instant,
      respondedAt: { oneOf: [instant, { type: "null" }] },
    },
  ),
  FriendRequests: properties(["incoming", "outgoing"], {
    incoming: { type: "array", items: ref("FriendRequest") },
    outgoing: { type: "array", items: ref("FriendRequest") },
  }),
  CreateFriendRequestRequest: properties(["receiverId"], { receiverId: uuid }),
  CreateBlockRequest: properties(["blockedId"], { blockedId: uuid }),
  ShareGrantRequest: properties(["previewToken"], { previewToken: str() }),
  PlanShare: properties(["planId", "friend", "grantedAt", "revision"], {
    planId: uuid,
    friend: ref("SocialUser"),
    grantedAt: instant,
    revision: { type: "integer", minimum: 1 },
  }),
  SharedPlan: properties(
    [
      "id",
      "owner",
      "kind",
      "direction",
      "title",
      "timezone",
      "startDate",
      "endDate",
      "dueDate",
      "lifecycle",
      "ruleVersion",
      "rule",
      "progress",
    ],
    {
      id: uuid,
      owner: ref("SocialUser"),
      kind: { enum: ["fixed", "weekly", "one_time"] },
      direction: { enum: ["do", "avoid"] },
      title: str(),
      timezone: str(),
      startDate: date,
      endDate: { oneOf: [date, { type: "null" }] },
      dueDate: { oneOf: [date, { type: "null" }] },
      lifecycle: { enum: ["active", "paused", "archived"] },
      ruleVersion: { type: "integer", minimum: 1 },
      rule: {
        oneOf: [
          properties(["weekdays"], {
            weekdays: {
              type: "array",
              items: { type: "integer", minimum: 1, maximum: 7 },
            },
          }),
          properties(["weeklyTarget"], {
            weeklyTarget: { type: "integer", minimum: 1, maximum: 7 },
          }),
          { type: "null" },
        ],
      },
      progress: {
        oneOf: [
          properties(
            ["kind", "successCount", "denominator", "completionRate"],
            {
              kind: { const: "fixed" },
              successCount: { type: "integer", minimum: 0 },
              denominator: { type: "integer", minimum: 0 },
              completionRate: {
                oneOf: [
                  { type: "number", minimum: 0, maximum: 1 },
                  { type: "null" },
                ],
              },
            },
          ),
          properties(["kind", "weekStartDate", "successes", "target"], {
            kind: { const: "weekly" },
            weekStartDate: date,
            successes: { type: "integer", minimum: 0 },
            target: {
              oneOf: [
                { type: "integer", minimum: 1, maximum: 7 },
                { type: "null" },
              ],
            },
          }),
          properties(["kind", "state"], {
            kind: { const: "one_time" },
            state: {
              enum: [
                "pending",
                "overdue",
                "completed",
                "late_completed",
                "failed",
                "cancelled",
              ],
            },
          }),
        ],
      },
    },
  ),
  SharedHistoryEntry: properties(
    [
      "businessDate",
      "status",
      "note",
      "failureReason",
      "isBackfilled",
      "isRevised",
      "ruleVersion",
    ],
    {
      businessDate: date,
      status: {
        enum: [
          "success",
          "failure",
          "skip",
          "pending",
          "unrecorded",
          "future",
          "due",
          "overdue",
          "completed",
          "late_completed",
          "failed",
          "cancelled",
          "not_due",
        ],
      },
      note: { oneOf: [str(), { type: "null" }] },
      failureReason: { oneOf: [str(), { type: "null" }] },
      isBackfilled: { type: "boolean" },
      isRevised: { type: "boolean" },
      ruleVersion: { type: "integer", minimum: 1 },
    },
  ),
  SharedHistory: properties(
    [
      "plan",
      "month",
      "entries",
      "weeklySummaries",
      "earliestMonth",
      "latestMonth",
    ],
    {
      plan: ref("SharedPlan"),
      month: str(),
      entries: { type: "array", items: ref("SharedHistoryEntry") },
      weeklySummaries: { type: "array", items: ref("WeeklySummary") },
      earliestMonth: str(),
      latestMonth: str(),
    },
  ),
  SharePreview: properties(
    [
      "plan",
      "month",
      "entries",
      "weeklySummaries",
      "earliestMonth",
      "latestMonth",
      "friend",
      "disclosure",
      "previewToken",
    ],
    {
      plan: ref("SharedPlan"),
      month: str(),
      entries: { type: "array", items: ref("SharedHistoryEntry") },
      weeklySummaries: { type: "array", items: ref("WeeklySummary") },
      earliestMonth: str(),
      latestMonth: str(),
      friend: ref("SocialUser"),
      disclosure: str(),
      previewToken: str(),
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
      description: { oneOf: [str(), { type: "null" }] },
      timezone: str(),
      startDate: date,
      ruleEffectiveDate: date,
      rule: {
        oneOf: [
          properties(["weekdays"], {
            weekdays: {
              type: "array",
              items: { type: "integer", minimum: 1, maximum: 7 },
            },
          }),
          properties(["weeklyTarget"], {
            weeklyTarget: { type: "integer", minimum: 1, maximum: 7 },
          }),
          { type: "null" },
        ],
      },
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
      failureReason: { oneOf: [str(), { type: "null" }] },
      numeric: { oneOf: [ref("NumericEntry"), { type: "null" }] },
      mediaIds: { type: "array", items: uuid },
      mediaAttachFailed: { type: "boolean" },
      isBackfilled: { type: "boolean" },
      isRevised: { type: "boolean" },
      revision: { type: "integer", minimum: 1 },
      ruleVersion: { type: "integer", minimum: 1 },
      createdAt: instant,
      updatedAt: instant,
      syncSequence: { type: "integer", minimum: 0 },
    },
  ),
  SyncChange: properties(
    ["seq", "entityType", "entityId", "operation", "changedAt"],
    {
      seq: { type: "integer", minimum: 1 },
      entityType: {
        enum: ["plan", "checkin", "group", "share", "friend", "user"],
      },
      entityId: uuid,
      operation: { enum: ["upsert", "delete", "revoke"] },
      payload: object,
      changedAt: instant,
    },
  ),
  SyncChanges: properties(["changes", "nextCursor", "hasMore"], {
    changes: { type: "array", items: ref("SyncChange") },
    nextCursor: str(),
    hasMore: { type: "boolean" },
  }),
  SyncAckRequest: properties(["cursor", "deviceId"], {
    cursor: str(),
    deviceId: uuid,
  }),
  SyncAck: properties(["acknowledgedSeq"], {
    acknowledgedSeq: { type: "integer", minimum: 0 },
  }),
  OneTimeResolution: properties(
    [
      "planId",
      "resolution",
      "resolvedBusinessDate",
      "resolvedAt",
      "note",
      "revision",
      "isRevised",
      "timing",
    ],
    {
      planId: uuid,
      resolution: { enum: ["completed", "failed", "cancelled"] },
      resolvedBusinessDate: date,
      resolvedAt: instant,
      note: { oneOf: [str(), { type: "null" }] },
      revision: { type: "integer", minimum: 1 },
      isRevised: { type: "boolean" },
      timing: { enum: ["on_time", "late", null] },
    },
  ),
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
  CalendarEntry: properties(
    [
      "planId",
      "title",
      "kind",
      "direction",
      "timezone",
      "businessDate",
      "status",
      "recordId",
      "ruleVersion",
      "isBackfilled",
      "isRevised",
    ],
    {
      planId: uuid,
      title: str(),
      kind: { enum: ["fixed", "weekly", "one_time"] },
      direction: { enum: ["do", "avoid"] },
      timezone: str(),
      businessDate: date,
      status: {
        enum: [
          "success",
          "failure",
          "skip",
          "pending",
          "unrecorded",
          "future",
          "due",
          "overdue",
          "completed",
          "late_completed",
          "failed",
          "cancelled",
        ],
      },
      recordId: { oneOf: [uuid, { type: "null" }] },
      ruleVersion: { type: "integer", minimum: 1 },
      isBackfilled: { type: "boolean" },
      isRevised: { type: "boolean" },
    },
  ),
  CalendarDay: properties(["businessDate", "counts", "entries"], {
    businessDate: date,
    counts: properties(["success", "failure", "skip", "unrecorded"], {
      success: { type: "integer", minimum: 0 },
      failure: { type: "integer", minimum: 0 },
      skip: { type: "integer", minimum: 0 },
      unrecorded: { type: "integer", minimum: 0 },
    }),
    entries: { type: "array", items: ref("CalendarEntry") },
  }),
  WeeklySummary: properties(
    [
      "weekStartDate",
      "ruleVersion",
      "target",
      "successes",
      "completeWeek",
      "attained",
      "progressRate",
    ],
    {
      weekStartDate: date,
      ruleVersion: {
        oneOf: [{ type: "integer", minimum: 1 }, { type: "null" }],
      },
      target: { oneOf: [{ type: "integer", minimum: 1 }, { type: "null" }] },
      successes: { type: "integer", minimum: 0 },
      completeWeek: { type: "boolean" },
      attained: { oneOf: [{ type: "boolean" }, { type: "null" }] },
      progressRate: {
        oneOf: [{ type: "number", minimum: 0 }, { type: "null" }],
      },
    },
  ),
  CalendarMonth: properties(
    ["month", "dateSemantics", "groupId", "days", "weeklySummaries"],
    {
      month: { type: "string", pattern: "^[0-9]{4}-(0[1-9]|1[0-2])$" },
      dateSemantics: { const: "plan_business_date" },
      groupId: { oneOf: [uuid, { type: "null" }] },
      days: { type: "array", items: ref("CalendarDay") },
      weeklySummaries: {
        type: "array",
        items: properties(["planId", "title", "timezone", "summary"], {
          planId: uuid,
          title: str(),
          timezone: str(),
          summary: ref("WeeklySummary"),
        }),
      },
    },
  ),
  Today: properties(["viewTimezone", "viewDate", "items"], {
    viewTimezone: str(),
    viewDate: date,
    items: {
      type: "array",
      items: properties(
        [
          "plan",
          "planBusinessDate",
          "status",
          "activeRuleVersion",
          "record",
          "weeklyProgress",
          "canCheckIn",
          "reminderTimeLocal",
        ],
        {
          plan: ref("Plan"),
          planBusinessDate: date,
          status: {
            enum: [
              "success",
              "failure",
              "skip",
              "pending",
              "unrecorded",
              "future",
              "due",
              "overdue",
              "completed",
              "late_completed",
              "failed",
              "cancelled",
              "goal_met",
            ],
          },
          activeRuleVersion: { type: "integer", minimum: 1 },
          record: {
            oneOf: [
              properties(
                ["id", "result", "revision", "isBackfilled", "isRevised"],
                {
                  id: uuid,
                  result: { enum: ["success", "failure", "skip"] },
                  revision: { type: "integer", minimum: 1 },
                  isBackfilled: { type: "boolean" },
                  isRevised: { type: "boolean" },
                },
              ),
              { type: "null" },
            ],
          },
          weeklyProgress: { oneOf: [ref("WeeklySummary"), { type: "null" }] },
          canCheckIn: { type: "boolean" },
          reminderTimeLocal: { oneOf: [str(), { type: "null" }] },
        },
      ),
    },
  }),
  FixedStatistics: properties(
    [
      "kind",
      "planId",
      "timezone",
      "statisticsThroughBusinessDate",
      "ruleVersions",
      "successCount",
      "failureCount",
      "skipCount",
      "unrecordedCount",
      "denominator",
      "completionRate",
      "consecutiveDueSuccesses",
    ],
    {
      kind: { const: "fixed" },
      planId: uuid,
      timezone: str(),
      statisticsThroughBusinessDate: date,
      ruleVersions: { type: "array", items: { type: "integer", minimum: 1 } },
      successCount: { type: "integer", minimum: 0 },
      failureCount: { type: "integer", minimum: 0 },
      skipCount: { type: "integer", minimum: 0 },
      unrecordedCount: { type: "integer", minimum: 0 },
      denominator: { type: "integer", minimum: 0 },
      completionRate: {
        oneOf: [{ type: "number", minimum: 0, maximum: 1 }, { type: "null" }],
      },
      consecutiveDueSuccesses: { type: "integer", minimum: 0 },
    },
  ),
  WeeklyStatistics: properties(
    [
      "kind",
      "planId",
      "timezone",
      "statisticsThroughBusinessDate",
      "ruleVersions",
      "completeWeekCount",
      "attainedWeekCount",
      "attainmentRate",
      "consecutiveAttainedWeeks",
      "currentWeek",
      "completedWeeks",
    ],
    {
      kind: { const: "weekly" },
      planId: uuid,
      timezone: str(),
      statisticsThroughBusinessDate: date,
      ruleVersions: { type: "array", items: { type: "integer", minimum: 1 } },
      completeWeekCount: { type: "integer", minimum: 0 },
      attainedWeekCount: { type: "integer", minimum: 0 },
      attainmentRate: {
        oneOf: [{ type: "number", minimum: 0, maximum: 1 }, { type: "null" }],
      },
      consecutiveAttainedWeeks: { type: "integer", minimum: 0 },
      currentWeek: ref("WeeklySummary"),
      completedWeeks: { type: "array", items: ref("WeeklySummary") },
    },
  ),
  OneTimeStatistics: properties(
    [
      "kind",
      "planId",
      "timezone",
      "statisticsThroughBusinessDate",
      "ruleVersions",
      "dueDate",
      "state",
      "resolution",
    ],
    {
      kind: { const: "one_time" },
      planId: uuid,
      timezone: str(),
      statisticsThroughBusinessDate: date,
      ruleVersions: { type: "array", items: { type: "integer", minimum: 1 } },
      dueDate: date,
      state: {
        enum: [
          "pending",
          "overdue",
          "completed",
          "late_completed",
          "failed",
          "cancelled",
        ],
      },
      resolution: { oneOf: [ref("OneTimeResolution"), { type: "null" }] },
    },
  ),
  PlanDetail: properties(
    ["plan", "statistics", "todayStatus", "recentRecords"],
    {
      plan: ref("Plan"),
      statistics: {
        oneOf: [
          ref("FixedStatistics"),
          ref("WeeklyStatistics"),
          ref("OneTimeStatistics"),
        ],
      },
      todayStatus: {
        enum: [
          "success",
          "failure",
          "skip",
          "pending",
          "unrecorded",
          "future",
          "due",
          "overdue",
          "completed",
          "late_completed",
          "failed",
          "cancelled",
          "goal_met",
          "not_due",
        ],
      },
      recentRecords: { type: "array", items: ref("CalendarEntry") },
    },
  ),
});

const successOf = (data) =>
  properties(["data", "requestId", "serverTime"], {
    data,
    requestId: str(),
    serverTime: instant,
  });
const responseData = {
  getToday: ref("Today"),
  getGlobalCalendar: ref("CalendarMonth"),
  getCalendarDay: ref("CalendarDay"),
  getPlanDetail: ref("PlanDetail"),
  getPlanStatistics: {
    oneOf: [
      ref("FixedStatistics"),
      ref("WeeklyStatistics"),
      ref("OneTimeStatistics"),
    ],
  },
  getPlanCalendar: ref("CalendarMonth"),
  createSmsChallenge: ref("SmsChallengeResponse"),
  verifySmsChallenge: ref("AuthTokens"),
  refreshSession: ref("AuthTokens"),
  getMe: ref("User"),
  updateMe: ref("User"),
  checkUsername: ref("UsernameAvailability"),
  createChangePhoneChallenge: ref("ChangePhoneChallengeResponse"),
  createPlan: ref("Plan"),
  listPlans: { type: "array", items: ref("Plan") },
  getPlan: ref("Plan"),
  updatePlan: ref("Plan"),
  pausePlan: ref("Plan"),
  resumePlan: ref("Plan"),
  archivePlan: ref("Plan"),
  listGroups: { type: "array", items: ref("Group") },
  createGroup: ref("Group"),
  updateGroup: ref("Group"),
  putCheckin: ref("Checkin"),
  getCheckin: ref("Checkin"),
  createOneTimeResolution: ref("OneTimeResolution"),
  reviseOneTimeResolution: ref("OneTimeResolution"),
  getSyncChanges: ref("SyncChanges"),
  ackSync: ref("SyncAck"),
  searchUsers: { type: "array", items: ref("SocialUser") },
  listFriends: { type: "array", items: ref("SocialUser") },
  listFriendRequests: ref("FriendRequests"),
  createFriendRequest: ref("FriendRequest"),
  acceptFriendRequest: ref("FriendRequest"),
  getSharePreview: ref("SharePreview"),
  listPlanShares: { type: "array", items: ref("PlanShare") },
  sharePlan: ref("PlanShare"),
  listSharedPlans: { type: "array", items: ref("SharedPlan") },
  getSharedPlan: ref("SharedPlan"),
  listSharedCheckins: ref("SharedHistory"),
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
  updatePlan: "UpdatePlanRequest",
  createGroup: "CreateGroupRequest",
  updateGroup: "UpdateGroupRequest",
  pausePlan: "LifecycleRequest",
  resumePlan: "LifecycleRequest",
  archivePlan: "LifecycleRequest",
  putCheckin: "PutCheckinRequest",
  createOneTimeResolution: "OneTimeResolutionRequest",
  reviseOneTimeResolution: "OneTimeResolutionRequest",
  createFriendRequest: "CreateFriendRequestRequest",
  createBlock: "CreateBlockRequest",
  sharePlan: "ShareGrantRequest",
  ackSync: "SyncAckRequest",
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
  if (operationId === "getToday")
    parameters.push({
      name: "timezone",
      in: "query",
      required: false,
      schema: str(),
    });
  if (operationId === "getSharePreview")
    parameters.push({
      name: "friendId",
      in: "query",
      required: true,
      schema: uuid,
    });
  if (operationId === "getSharePreview" || operationId === "listSharedCheckins")
    parameters.push({
      name: "month",
      in: "query",
      required: operationId === "getSharePreview",
      schema: { type: "string", pattern: "^[0-9]{4}-(0[1-9]|1[0-2])$" },
    });
  if (operationId === "getGlobalCalendar" || operationId === "getPlanCalendar")
    parameters.push({
      name: "month",
      in: "query",
      required: true,
      schema: { type: "string", pattern: "^[0-9]{4}-(0[1-9]|1[0-2])$" },
    });
  if (operationId === "getGlobalCalendar" || operationId === "getCalendarDay")
    parameters.push({
      name: "groupId",
      in: "query",
      required: false,
      schema: uuid,
    });
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
  if (operationId === "deletePlan" || operationId === "deleteGroup") {
    parameters.push({
      name: "baseRevision",
      in: "query",
      required: true,
      schema: { type: "integer", minimum: 1 },
    });
  }
  if (operationId === "deletePlan") {
    parameters.push({
      name: "X-Confirm-Delete",
      in: "header",
      required: true,
      schema: { const: "true" },
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
  if (method !== "GET") {
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
