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
  description?: string | null;
  timezone: IanaTimezone;
  startDate: BusinessDate;
  endDate?: BusinessDate | null;
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
  | (Omit<PlanCreateBase, "endDate" | "startDate"> & {
      kind: "one_time";
      direction: "do";
      startDate?: BusinessDate;
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
  description: string | null;
  timezone: IanaTimezone;
  startDate: BusinessDate;
  endDate: BusinessDate | null;
  dueDate: BusinessDate | null;
  groupId: Uuid | null;
  lifecycle: PlanLifecycle;
  ruleVersion: number;
  ruleEffectiveDate: BusinessDate;
  rule: { weekdays: Weekday[] } | { weeklyTarget: number } | null;
  revision: number;
  createdAt: UtcInstant;
  updatedAt: UtcInstant;
}
export interface UpdatePlanRequest {
  title?: string;
  description?: string | null;
  groupId?: Uuid | null;
  endDate?: BusinessDate | null;
  dueDate?: BusinessDate;
  rule?: { weekdays: Weekday[] } | { weeklyTarget: number };
  baseRevision: number;
}
export interface GroupDto {
  id: Uuid;
  name: string;
  sortOrder: number;
  revision: number;
}
export interface CreateGroupRequest {
  name: string;
  sortOrder?: number;
}
export interface UpdateGroupRequest {
  name?: string;
  sortOrder?: number;
  baseRevision: number;
}
export interface NumericEntry {
  value: DecimalString;
  unit: string;
}
export interface PutCheckinRequest {
  result: CheckinResult;
  note?: string | null;
  failureReason?: string | null;
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
  failureReason: string | null;
  numeric: NumericEntry | null;
  mediaIds: Uuid[];
  mediaAttachFailed?: boolean;
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
export interface OneTimeResolutionDto {
  planId: Uuid;
  resolution: OneTimeResolution;
  resolvedBusinessDate: BusinessDate;
  resolvedAt: UtcInstant;
  note: string | null;
  revision: number;
  isRevised: boolean;
  timing: "on_time" | "late" | null;
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
export interface SmsChallengeDto {
  challengeId: Uuid;
  expiresAt: UtcInstant;
  resendAfterSeconds: number;
}
export interface UsernameAvailabilityDto {
  available: boolean;
  normalized: string;
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
export interface SocialUserDto {
  id: Uuid;
  username: string;
  nickname: string | null;
  avatarMediaId: Uuid | null;
}
export interface FriendRequestDto {
  id: Uuid;
  sender: SocialUserDto;
  receiver: SocialUserDto;
  status: "pending" | "accepted" | "rejected" | "cancelled";
  createdAt: UtcInstant;
  respondedAt: UtcInstant | null;
}
export interface FriendRequestsDto {
  incoming: FriendRequestDto[];
  outgoing: FriendRequestDto[];
}
export interface CreateFriendRequestRequest {
  receiverId: Uuid;
}
export interface CreateBlockRequest {
  blockedId: Uuid;
}
export interface ShareGrantRequest {
  previewToken: string;
}
export interface PlanShareDto {
  planId: Uuid;
  friend: SocialUserDto;
  grantedAt: UtcInstant;
  revision: number;
}
export interface SharedPlanDto {
  id: Uuid;
  owner: SocialUserDto;
  kind: PlanKind;
  direction: Direction;
  title: string;
  timezone: IanaTimezone;
  startDate: BusinessDate;
  endDate: BusinessDate | null;
  dueDate: BusinessDate | null;
  lifecycle: Exclude<PlanLifecycle, "deleted">;
  ruleVersion: number;
  rule: { weekdays: Weekday[] } | { weeklyTarget: number } | null;
  progress:
    | {
        kind: "fixed";
        successCount: number;
        denominator: number;
        completionRate: number | null;
      }
    | {
        kind: "weekly";
        weekStartDate: BusinessDate;
        successes: number;
        target: number | null;
      }
    | {
        kind: "one_time";
        state:
          | "pending"
          | "overdue"
          | "completed"
          | "late_completed"
          | "failed"
          | "cancelled";
      };
}
export interface SharedHistoryEntryDto {
  businessDate: BusinessDate;
  status: CalendarStatus | "not_due";
  note: string | null;
  failureReason: string | null;
  isBackfilled: boolean;
  isRevised: boolean;
  ruleVersion: number;
}
export interface SharedHistoryDto {
  plan: SharedPlanDto;
  month: string;
  entries: SharedHistoryEntryDto[];
  weeklySummaries: WeeklySummaryDto[];
  earliestMonth: string;
  latestMonth: string;
}
export interface SharePreviewDto extends SharedHistoryDto {
  friend: SocialUserDto;
  disclosure: string;
  previewToken: string;
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
export interface SyncAckRequest {
  cursor: string;
  deviceId: Uuid;
}
export interface SyncAckDto {
  acknowledgedSeq: number;
}
export interface StatisticsMetadata {
  timezone: IanaTimezone;
  throughDate: BusinessDate;
  ruleVersion: number;
}
export type CalendarStatus =
  | CheckinResult
  | "pending"
  | "unrecorded"
  | "future"
  | "due"
  | "overdue"
  | "completed"
  | "late_completed"
  | "failed"
  | "cancelled";
export interface CalendarEntryDto {
  planId: Uuid;
  title: string;
  kind: PlanKind;
  direction: Direction;
  timezone: IanaTimezone;
  businessDate: BusinessDate;
  status: CalendarStatus;
  recordId: Uuid | null;
  ruleVersion: number;
  isBackfilled: boolean;
  isRevised: boolean;
}
export interface CalendarDayDto {
  businessDate: BusinessDate;
  counts: {
    success: number;
    failure: number;
    skip: number;
    unrecorded: number;
  };
  entries: CalendarEntryDto[];
}
export interface WeeklySummaryDto {
  weekStartDate: BusinessDate;
  ruleVersion: number | null;
  target: number | null;
  successes: number;
  completeWeek: boolean;
  attained: boolean | null;
  progressRate: number | null;
}
export interface CalendarWeekDto {
  planId: Uuid;
  title: string;
  timezone: IanaTimezone;
  summary: WeeklySummaryDto;
}
export interface CalendarMonthDto {
  month: string;
  dateSemantics: "plan_business_date";
  groupId: Uuid | null;
  days: CalendarDayDto[];
  weeklySummaries: CalendarWeekDto[];
}
export interface TodayItemDto {
  plan: PlanDto;
  planBusinessDate: BusinessDate;
  status: CalendarStatus | "goal_met";
  activeRuleVersion: number;
  record: Pick<
    CheckinDto,
    "id" | "result" | "revision" | "isBackfilled" | "isRevised"
  > | null;
  weeklyProgress: WeeklySummaryDto | null;
  canCheckIn: boolean;
  reminderTimeLocal: string | null;
}
export interface TodayDto {
  viewTimezone: IanaTimezone;
  viewDate: BusinessDate;
  items: TodayItemDto[];
}
export interface FixedStatisticsDto {
  kind: "fixed";
  planId: Uuid;
  timezone: IanaTimezone;
  statisticsThroughBusinessDate: BusinessDate;
  ruleVersions: number[];
  successCount: number;
  failureCount: number;
  skipCount: number;
  unrecordedCount: number;
  denominator: number;
  completionRate: number | null;
  consecutiveDueSuccesses: number;
}
export interface WeeklyStatisticsDto {
  kind: "weekly";
  planId: Uuid;
  timezone: IanaTimezone;
  statisticsThroughBusinessDate: BusinessDate;
  ruleVersions: number[];
  completeWeekCount: number;
  attainedWeekCount: number;
  attainmentRate: number | null;
  consecutiveAttainedWeeks: number;
  currentWeek: WeeklySummaryDto;
  completedWeeks: WeeklySummaryDto[];
}
export interface OneTimeStatisticsDto {
  kind: "one_time";
  planId: Uuid;
  timezone: IanaTimezone;
  statisticsThroughBusinessDate: BusinessDate;
  ruleVersions: number[];
  dueDate: BusinessDate;
  state:
    | "pending"
    | "overdue"
    | "completed"
    | "late_completed"
    | "failed"
    | "cancelled";
  resolution: OneTimeResolutionDto | null;
}
export type PlanStatisticsDto =
  FixedStatisticsDto | WeeklyStatisticsDto | OneTimeStatisticsDto;
export interface PlanDetailDto {
  plan: PlanDto;
  statistics: PlanStatisticsDto;
  todayStatus: CalendarStatus | "goal_met" | "not_due";
  recentRecords: CalendarEntryDto[];
}
export type {
  paths as ApiPaths,
  operations as ApiOperations,
} from "./openapi.generated.js";
