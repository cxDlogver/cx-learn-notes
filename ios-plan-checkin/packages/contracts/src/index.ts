/** Public HTTP wire types. Dates and decimals remain strings on the wire. */
export type BusinessDate = string;
export type UtcInstant = string;
export type IanaTimezone = string;
export type DecimalString = string;
export type Uuid = string;

import type { ApiErrorCode } from "./routes.js";
export { apiRoutes, errorCodes } from "./routes.js";
export type { ApiErrorCode } from "./routes.js";

export interface ApiError {
  code: ApiErrorCode;
  message: string;
  requestId: string;
  details?: Record<string, unknown>;
}
export interface ApiSuccess<T> {
  data: T;
  requestId: string;
  serverTime: UtcInstant;
}
export interface CursorPage<T> {
  items: T[];
  nextCursor: string | null;
}

export type Direction = "do" | "avoid";
export type PlanKind = "fixed" | "weekly" | "one_time";
export type PlanLifecycle = "active" | "paused" | "archived" | "deleted";
export type Weekday = 1 | 2 | 3 | 4 | 5 | 6 | 7;
export type CheckinResult = "success" | "failure" | "skip";
export type OneTimeResolution = "completed" | "failed" | "cancelled";

export interface ReminderConfig {
  enabled: boolean;
  timeLocal?: string;
  weekdays?: Weekday[];
  daysBeforeDue?: 0 | 1 | 3;
}
interface PlanCreateBase {
  title: string;
  timezone: IanaTimezone;
  startDate: BusinessDate;
  endDate: BusinessDate | null;
  groupId?: Uuid | null;
  reminder?: ReminderConfig;
}
export type CreatePlanRequest =
  | (PlanCreateBase & {
      kind: "fixed";
      direction: Direction;
      rule: { weekdays: Weekday[] };
      dueDate?: never;
    })
  | (PlanCreateBase & {
      kind: "weekly";
      direction: Direction;
      rule: { weeklyTarget: number };
      dueDate?: never;
    })
  | (Omit<PlanCreateBase, "endDate"> & {
      kind: "one_time";
      direction: "do";
      dueDate: BusinessDate;
      endDate?: never;
      rule?: never;
    });

export interface PlanDto {
  id: Uuid;
  ownerId: Uuid;
  kind: PlanKind;
  direction: Direction;
  title: string;
  timezone: IanaTimezone;
  startDate: BusinessDate;
  endDate: BusinessDate | null;
  dueDate: BusinessDate | null;
  groupId: Uuid | null;
  lifecycle: PlanLifecycle;
  ruleVersion: number;
  revision: number;
  createdAt: UtcInstant;
  updatedAt: UtcInstant;
}
export interface NumericEntry {
  value: DecimalString;
  unit: string;
}
export interface PutCheckinRequest {
  result: CheckinResult;
  note?: string | null;
  numeric?: NumericEntry | null;
  mediaIds?: Uuid[];
  baseRevision: number;
  clientCreatedAt: UtcInstant;
  clientOperationId: Uuid;
  ruleVersion: number;
  resolutionOfConflictId?: Uuid;
}
export interface CheckinDto {
  id: Uuid;
  planId: Uuid;
  businessDate: BusinessDate;
  result: CheckinResult;
  note: string | null;
  numeric: NumericEntry | null;
  mediaIds: Uuid[];
  isBackfilled: boolean;
  isRevised: boolean;
  revision: number;
  ruleVersion: number;
  createdAt: UtcInstant;
  updatedAt: UtcInstant;
  syncSequence: number;
}
export interface CheckinConflictDetails {
  conflictId: Uuid;
  currentRevision: number;
  serverRecord: CheckinDto;
  submittedSummary: Pick<PutCheckinRequest, "result" | "clientCreatedAt">;
}
export interface OneTimeResolutionRequest {
  resolution: OneTimeResolution;
  baseRevision: number;
  completedAt?: UtcInstant;
  reason?: string;
}
export interface SmsChallengeRequest {
  countryCode: "+86";
  phone: string;
  purpose: "login" | "change_phone" | "cancel_deletion";
}
export interface SmsVerifyRequest {
  challengeId: Uuid;
  code: string;
}
export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  accessExpiresAt: UtcInstant;
  userId: Uuid;
  isNewUser: boolean;
}
export interface UserDto {
  id: Uuid;
  username: string | null;
  nickname: string | null;
  avatarMediaId: Uuid | null;
  accountStatus: "active" | "deletion_pending";
  revision: number;
}
export interface UpdateMeRequest {
  username?: string;
  nickname?: string;
  avatarMediaId?: Uuid | null;
  baseRevision: number;
}
export interface ChangePhoneChallengeRequest {
  countryCode: "+86";
  phone: string;
}
export interface ChangePhoneConfirmRequest {
  requestId: Uuid;
  oldCode: string;
  newCode: string;
}
export interface SyncChange {
  seq: number;
  entityType: "plan" | "checkin" | "group" | "share" | "friend" | "user";
  entityId: Uuid;
  operation: "upsert" | "delete" | "revoke";
  payload?: Record<string, unknown>;
  changedAt: UtcInstant;
}
export interface SyncChangesDto {
  changes: SyncChange[];
  nextCursor: string;
  hasMore: boolean;
}
export interface StatisticsMetadata {
  timezone: IanaTimezone;
  throughDate: BusinessDate;
  ruleVersion: number;
}
export type {
  paths as ApiPaths,
  operations as ApiOperations,
} from "./openapi.generated.js";
