import type {
  CalendarDayDto,
  CalendarMonthDto,
  CreateGroupRequest,
  CreatePlanRequest,
  CreateUploadIntentRequest,
  DataExportDownloadDto,
  DataExportDto,
  DeletionStatusDto,
  FriendRequestDto,
  FriendRequestsDto,
  CheckinContextDto,
  CheckinDto,
  GroupDto,
  InboxPageDto,
  InboxReadDto,
  EncouragementDto,
  MediaDownloadDto,
  MediaDto,
  NumericConfigRequest,
  OneTimeResolutionDto,
  OneTimeResolutionRequest,
  PlanDetailDto,
  PlanDto,
  PlanStatisticsDto,
  PlanShareDto,
  PutCheckinRequest,
  SmsChallengeDto,
  SocialUserDto,
  SharePreviewDto,
  SharedHistoryDto,
  SharedPlanDto,
  TodayDto,
  UpdateGroupRequest,
  UpdatePlanRequest,
  UploadIntentDto,
  UserDto,
  WebSessionDto,
  WebNotificationPreferencesDto,
  UpdateWebNotificationPreferencesRequest,
  RegisterWebPushSubscriptionRequest,
  WebPushSubscriptionDto,
  WebPushConfigDto,
} from "@plan-checkin/contracts";

interface Envelope<T> {
  data: T;
  requestId: string;
  serverTime: string;
}

interface ErrorEnvelope {
  code?: string;
  message?: string;
  details?: unknown;
}

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly retryAfterSeconds: number | null = null,
    readonly details: unknown = null,
  ) {
    super(message);
  }
}

type SessionListener = (session: WebSessionDto | null) => void;
const listeners = new Set<SessionListener>();
let activeSession: WebSessionDto | null = null;
let activeSessionLocalExpiresAt = 0;
let restorePromise: Promise<WebSessionDto | null> | null = null;
let refreshPromise: Promise<WebSessionDto | null> | null = null;
const channel =
  typeof BroadcastChannel === "undefined"
    ? null
    : new BroadcastChannel("plan-checkin-web-session");

function publish(session: WebSessionDto | null): void {
  activeSession = session;
  if (!session) activeSessionLocalExpiresAt = 0;
  else if (!activeSessionLocalExpiresAt)
    activeSessionLocalExpiresAt = Date.parse(session.accessExpiresAt);
  for (const listener of listeners) listener(session);
}

channel?.addEventListener(
  "message",
  (event: MessageEvent<{ type?: string }>) => {
    if (event.data?.type === "logout") publish(null);
    if (event.data?.type === "session-updated") void restoreWebSession(true);
  },
);

export function subscribeSession(listener: SessionListener): () => void {
  listeners.add(listener);
  listener(activeSession);
  return () => listeners.delete(listener);
}

export function currentSession(): WebSessionDto | null {
  return activeSession;
}

async function parseResponse<T>(response: Response): Promise<T> {
  const payload: unknown = await response.json().catch(() => ({}));
  if (!response.ok) {
    const problem = payload as ErrorEnvelope;
    const retry = Number(response.headers.get("retry-after"));
    throw new ApiError(
      response.status,
      problem.code ?? "REQUEST_FAILED",
      problem.message ?? "请求失败，请稍后重试",
      Number.isFinite(retry) && retry > 0 ? retry : null,
      problem.details ?? null,
    );
  }
  const envelope = payload as Envelope<T>;
  const data = envelope.data as Partial<WebSessionDto> | null;
  if (
    data &&
    typeof data === "object" &&
    typeof data.accessExpiresAt === "string" &&
    typeof envelope.serverTime === "string"
  ) {
    const remaining =
      Date.parse(data.accessExpiresAt) - Date.parse(envelope.serverTime);
    if (Number.isFinite(remaining))
      activeSessionLocalExpiresAt = Date.now() + Math.max(0, remaining);
  }
  return envelope.data;
}

async function fetchJson<T>(path: string, init: RequestInit = {}): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`/api/v1/${path}`, {
      ...init,
      credentials: "same-origin",
      cache: "no-store",
      headers: {
        ...(init.body ? { "content-type": "application/json" } : {}),
        "x-client-request-id": crypto.randomUUID(),
        ...init.headers,
      },
    });
  } catch {
    throw new ApiError(0, "NETWORK_UNAVAILABLE", "网络不可用，请连接后重试");
  }
  return parseResponse<T>(response);
}

function mutation(
  body: unknown,
  headers: Record<string, string> = {},
): RequestInit {
  return {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "idempotency-key": crypto.randomUUID(), ...headers },
  };
}

function deviceId(): string {
  const key = "plan-checkin-web-device";
  const prior = sessionStorage.getItem(key);
  if (prior) return prior;
  const fresh = crypto.randomUUID();
  sessionStorage.setItem(key, fresh);
  return fresh;
}

export async function sendLoginCode(
  phone: string,
  purpose: "login" | "cancel_deletion" = "login",
): Promise<SmsChallengeDto> {
  return fetchJson<SmsChallengeDto>(
    "auth/sms/challenges",
    mutation({ countryCode: "+86", phone, purpose }),
  );
}

export async function cancelDeletionWeb(
  challengeId: string,
  code: string,
): Promise<WebSessionDto> {
  const session = await fetchJson<WebSessionDto>(
    "auth/web/deletion-cancel",
    mutation({ challengeId, code }, { "x-device-id": deviceId() }),
  );
  publish(session);
  channel?.postMessage({ type: "session-updated" });
  return session;
}

export function listDataExports(): Promise<DataExportDto[]> {
  return apiRequest<DataExportDto[]>("me/exports");
}

export function createDataExport(): Promise<DataExportDto> {
  return apiRequest<DataExportDto>("me/exports", { method: "POST" });
}

export function getDataExportDownloadUrl(
  id: string,
): Promise<DataExportDownloadDto> {
  return apiRequest<DataExportDownloadDto>(
    `me/exports/${encodeURIComponent(id)}/download-url`,
  );
}

export function getDeletionStatus(): Promise<DeletionStatusDto> {
  return apiRequest<DeletionStatusDto>("me/deletion-status");
}

export function requestAccountDeletion(): Promise<DeletionStatusDto> {
  return apiRequest<DeletionStatusDto>("me/deletion-request", {
    method: "POST",
    body: { confirmed: true },
  });
}

export async function verifyLoginCode(
  challengeId: string,
  code: string,
): Promise<WebSessionDto> {
  const session = await fetchJson<WebSessionDto>(
    "auth/web/verify",
    mutation({ challengeId, code }, { "x-device-id": deviceId() }),
  );
  publish(session);
  channel?.postMessage({ type: "session-updated" });
  return session;
}

export async function restoreWebSession(
  force = false,
): Promise<WebSessionDto | null> {
  if (
    !force &&
    activeSession &&
    activeSessionLocalExpiresAt > Date.now() + 30_000
  )
    return activeSession;
  if (restorePromise) return restorePromise;
  restorePromise = (async () => {
    try {
      const session = await fetchJson<WebSessionDto>("auth/web/session");
      publish(session);
      return session;
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        publish(null);
        return null;
      }
      throw error;
    } finally {
      restorePromise = null;
    }
  })();
  return restorePromise;
}

async function rotateWebSession(): Promise<WebSessionDto | null> {
  if (!activeSession) return restoreWebSession(true);
  const csrfToken = activeSession.csrfToken;
  try {
    const next = await fetchJson<WebSessionDto>(
      "auth/web/refresh",
      mutation({}, { "x-csrf-token": csrfToken }),
    );
    publish(next);
    channel?.postMessage({ type: "session-updated" });
    return next;
  } catch (error) {
    if (
      error instanceof ApiError &&
      (error.status === 401 || error.status === 403)
    )
      return restoreWebSession(true);
    throw error;
  }
}

export async function refreshWebSession(): Promise<WebSessionDto | null> {
  if (refreshPromise) return refreshPromise;
  const work = async () => {
    if (activeSession && activeSessionLocalExpiresAt > Date.now() + 30_000)
      return activeSession;
    return rotateWebSession();
  };
  refreshPromise = (async () =>
    typeof navigator.locks?.request === "function"
      ? await navigator.locks.request("plan-checkin-refresh", work)
      : await work())();
  try {
    return await refreshPromise;
  } finally {
    refreshPromise = null;
  }
}

interface ApiRequest {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  idempotencyKey?: string;
  confirmDelete?: boolean;
}

export async function apiRequest<T>(
  path: string,
  input: ApiRequest = {},
): Promise<T> {
  const method = input.method ?? "GET";
  const session = await refreshWebSession();
  if (!session) throw new ApiError(401, "UNAUTHENTICATED", "请重新登录");
  const idempotencyKey = input.idempotencyKey ?? crypto.randomUUID();
  const issue = (accessToken: string) =>
    fetchJson<T>(path, {
      method,
      ...(input.body === undefined ? {} : { body: JSON.stringify(input.body) }),
      headers: {
        authorization: `Bearer ${accessToken}`,
        ...(method === "GET" ? {} : { "idempotency-key": idempotencyKey }),
        ...(input.confirmDelete ? { "x-confirm-delete": "true" } : {}),
      },
    });
  try {
    return await issue(session.accessToken);
  } catch (error) {
    if (!(error instanceof ApiError) || error.status !== 401) throw error;
    const renewed = await rotateWebSession();
    if (!renewed) throw error;
    return issue(renewed.accessToken);
  }
}

export function getMe(): Promise<UserDto> {
  return apiRequest<UserDto>("me");
}

export function getToday(): Promise<TodayDto> {
  return apiRequest<TodayDto>("today");
}

export function getCheckin(
  planId: string,
  businessDate: string,
): Promise<CheckinDto> {
  return apiRequest<CheckinDto>(
    `plans/${encodeURIComponent(planId)}/checkins/${encodeURIComponent(businessDate)}`,
  );
}

export function getCheckinContext(
  planId: string,
  businessDate: string,
): Promise<CheckinContextDto> {
  return apiRequest<CheckinContextDto>(
    `plans/${encodeURIComponent(planId)}/checkin-context/${encodeURIComponent(businessDate)}`,
  );
}

export function putCheckin(
  planId: string,
  businessDate: string,
  input: PutCheckinRequest,
  idempotencyKey: string,
): Promise<CheckinDto> {
  return apiRequest<CheckinDto>(
    `plans/${encodeURIComponent(planId)}/checkins/${encodeURIComponent(businessDate)}`,
    { method: "PUT", body: input, idempotencyKey },
  );
}

export function createUploadIntent(
  input: CreateUploadIntentRequest,
): Promise<UploadIntentDto> {
  return apiRequest<UploadIntentDto>("media/upload-intents", {
    method: "POST",
    body: input,
  });
}

export function completeMedia(
  mediaId: string,
  checkinId: string,
): Promise<MediaDto> {
  return apiRequest<MediaDto>(`media/${encodeURIComponent(mediaId)}/complete`, {
    method: "POST",
    body: { checkinId },
  });
}

export function listPlans(): Promise<PlanDto[]> {
  return apiRequest<PlanDto[]>("plans");
}

export function searchUsers(username: string): Promise<SocialUserDto[]> {
  return apiRequest<SocialUserDto[]>(
    `users/search?username=${encodeURIComponent(username)}`,
  );
}

export function listFriendRequests(): Promise<FriendRequestsDto> {
  return apiRequest<FriendRequestsDto>("friend-requests");
}

export function sendFriendRequest(
  receiverId: string,
): Promise<FriendRequestDto> {
  return apiRequest<FriendRequestDto>("friend-requests", {
    method: "POST",
    body: { receiverId },
  });
}

export function respondFriendRequest(
  id: string,
  decision: "accept" | "reject",
): Promise<FriendRequestDto> {
  return apiRequest<FriendRequestDto>(
    `friend-requests/${encodeURIComponent(id)}/${decision}`,
    { method: "POST" },
  );
}

export function listFriends(): Promise<SocialUserDto[]> {
  return apiRequest<SocialUserDto[]>("friends");
}

export function removeFriend(id: string): Promise<{ deleted: true }> {
  return apiRequest<{ deleted: true }>(`friends/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}

export function blockUser(id: string): Promise<{ blocked: true }> {
  return apiRequest<{ blocked: true }>("blocks", {
    method: "POST",
    body: { blockedId: id },
  });
}

export function listInbox(cursor?: string): Promise<InboxPageDto> {
  return apiRequest<InboxPageDto>(
    `me/inbox?limit=20${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ""}`,
  );
}

export function markInboxRead(id: string): Promise<InboxReadDto> {
  return apiRequest<InboxReadDto>(`me/inbox/${encodeURIComponent(id)}/read`, {
    method: "POST",
  });
}

export function getSharePreview(
  planId: string,
  friendId: string,
  month: string,
): Promise<SharePreviewDto> {
  return apiRequest<SharePreviewDto>(
    `plans/${encodeURIComponent(planId)}/share-preview?friendId=${encodeURIComponent(friendId)}&month=${encodeURIComponent(month)}`,
  );
}

export function listPlanShares(planId: string): Promise<PlanShareDto[]> {
  return apiRequest<PlanShareDto[]>(
    `plans/${encodeURIComponent(planId)}/shares`,
  );
}

export function grantPlanShare(
  planId: string,
  friendId: string,
  previewToken: string,
): Promise<PlanShareDto> {
  return apiRequest<PlanShareDto>(
    `plans/${encodeURIComponent(planId)}/shares/${encodeURIComponent(friendId)}`,
    { method: "PUT", body: { previewToken } },
  );
}

export function revokePlanShare(
  planId: string,
  friendId: string,
): Promise<{ revoked: true }> {
  return apiRequest<{ revoked: true }>(
    `plans/${encodeURIComponent(planId)}/shares/${encodeURIComponent(friendId)}`,
    { method: "DELETE" },
  );
}

export function listFriendSharedPlans(
  friendId: string,
): Promise<SharedPlanDto[]> {
  return apiRequest<SharedPlanDto[]>(
    `friends/${encodeURIComponent(friendId)}/shared-plans`,
  );
}

export function getSharedHistory(
  planId: string,
  month?: string,
): Promise<SharedHistoryDto> {
  return apiRequest<SharedHistoryDto>(
    `shared-plans/${encodeURIComponent(planId)}/checkins${month ? `?month=${encodeURIComponent(month)}` : ""}`,
  );
}

export function createEncouragement(
  checkinId: string,
  kind: "emoji" | "message",
  body: string,
): Promise<EncouragementDto> {
  return apiRequest<EncouragementDto>(
    `checkins/${encodeURIComponent(checkinId)}/encouragements`,
    { method: "POST", body: { kind, body } },
  );
}

export function listEncouragements(
  checkinId: string,
): Promise<EncouragementDto[]> {
  return apiRequest<EncouragementDto[]>(
    `checkins/${encodeURIComponent(checkinId)}/encouragements`,
  );
}

export function getWebNotificationPreferences(): Promise<WebNotificationPreferencesDto> {
  return apiRequest<WebNotificationPreferencesDto>(
    "me/notification-channels/web",
  );
}

export function updateWebNotificationPreferences(
  input: UpdateWebNotificationPreferencesRequest,
): Promise<WebNotificationPreferencesDto> {
  return apiRequest<WebNotificationPreferencesDto>(
    "me/notification-channels/web",
    { method: "PATCH", body: input },
  );
}

export function getWebPushConfig(): Promise<WebPushConfigDto> {
  return apiRequest<WebPushConfigDto>("web-push/config");
}

export function getWebPushSubscription(): Promise<WebPushSubscriptionDto> {
  return apiRequest<WebPushSubscriptionDto>("me/web-push-subscriptions");
}

export function registerWebPushSubscription(
  input: RegisterWebPushSubscriptionRequest,
): Promise<WebPushSubscriptionDto> {
  return apiRequest<WebPushSubscriptionDto>("me/web-push-subscriptions", {
    method: "POST",
    body: input,
  });
}

export function removeWebPushSubscription(): Promise<WebPushSubscriptionDto> {
  return apiRequest<WebPushSubscriptionDto>("me/web-push-subscriptions", {
    method: "DELETE",
  });
}

export function getPlan(id: string): Promise<PlanDto> {
  return apiRequest<PlanDto>(`plans/${encodeURIComponent(id)}`);
}

export function getPlanDetail(id: string): Promise<PlanDetailDto> {
  return apiRequest<PlanDetailDto>(`plans/${encodeURIComponent(id)}/detail`);
}

export function getPlanStatistics(id: string): Promise<PlanStatisticsDto> {
  return apiRequest<PlanStatisticsDto>(
    `plans/${encodeURIComponent(id)}/statistics`,
  );
}

export function getCalendarMonth(month: string): Promise<CalendarMonthDto> {
  return apiRequest<CalendarMonthDto>(
    `calendar?month=${encodeURIComponent(month)}`,
  );
}

export function getCalendarDay(date: string): Promise<CalendarDayDto> {
  return apiRequest<CalendarDayDto>(`calendar/${encodeURIComponent(date)}`);
}

export function saveOneTimeResolution(
  id: string,
  input: OneTimeResolutionRequest,
  correction: boolean,
  idempotencyKey?: string,
): Promise<OneTimeResolutionDto> {
  return apiRequest<OneTimeResolutionDto>(
    `plans/${encodeURIComponent(id)}/one-time-resolution`,
    {
      method: correction ? "PATCH" : "POST",
      body: input,
      ...(idempotencyKey ? { idempotencyKey } : {}),
    },
  );
}

export function completeOneTimeMedia(
  mediaId: string,
  planId: string,
): Promise<MediaDto> {
  return apiRequest<MediaDto>(`media/${encodeURIComponent(mediaId)}/complete`, {
    method: "POST",
    body: { oneTimePlanId: planId },
  });
}

export function getPrivateMediaDownload(
  mediaId: string,
): Promise<MediaDownloadDto> {
  return apiRequest<MediaDownloadDto>(
    `media/${encodeURIComponent(mediaId)}/download-url`,
  );
}

export function createPlan(input: CreatePlanRequest): Promise<PlanDto> {
  return apiRequest<PlanDto>("plans", { method: "POST", body: input });
}

export function updatePlan(
  id: string,
  input: UpdatePlanRequest,
): Promise<PlanDto> {
  return apiRequest<PlanDto>(`plans/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: input,
  });
}

export function setPlanNumericItem(
  id: string,
  input: NumericConfigRequest,
  existing: boolean,
): Promise<PlanDto> {
  return apiRequest<PlanDto>(`plans/${encodeURIComponent(id)}/numeric-config`, {
    method: existing ? "PATCH" : "POST",
    body: input,
  });
}

export function listGroups(): Promise<GroupDto[]> {
  return apiRequest<GroupDto[]>("groups");
}

export function createGroup(input: CreateGroupRequest): Promise<GroupDto> {
  return apiRequest<GroupDto>("groups", { method: "POST", body: input });
}

export function updateGroup(
  id: string,
  input: UpdateGroupRequest,
): Promise<GroupDto> {
  return apiRequest<GroupDto>(`groups/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: input,
  });
}

export function deleteGroup(
  id: string,
  baseRevision: number,
): Promise<{ deleted: true }> {
  return apiRequest<{ deleted: true }>(
    `groups/${encodeURIComponent(id)}?baseRevision=${baseRevision}`,
    { method: "DELETE" },
  );
}

export function changePlanLifecycle(
  id: string,
  action: "pause" | "resume" | "archive",
  baseRevision: number,
): Promise<PlanDto> {
  return apiRequest<PlanDto>(`plans/${encodeURIComponent(id)}/${action}`, {
    method: "POST",
    body: { baseRevision },
  });
}

export function deletePlan(
  id: string,
  baseRevision: number,
): Promise<{ deleted: true }> {
  return apiRequest<{ deleted: true }>(
    `plans/${encodeURIComponent(id)}?baseRevision=${baseRevision}`,
    { method: "DELETE", confirmDelete: true },
  );
}

export function saveProfile(
  username: string,
  nickname: string,
  baseRevision: number,
): Promise<UserDto> {
  return apiRequest<UserDto>("me", {
    method: "PATCH",
    body: { username, nickname, baseRevision },
  });
}

export interface PhoneChangeChallenge {
  requestId: string;
  oldMasked: string;
  newMasked: string;
  expiresAt: string;
}

export function requestPhoneChange(
  phone: string,
): Promise<PhoneChangeChallenge> {
  return apiRequest<PhoneChangeChallenge>("me/change-phone/challenge", {
    method: "POST",
    body: { countryCode: "+86", phone },
  });
}

export function confirmPhoneChange(
  requestId: string,
  oldCode: string,
  newCode: string,
): Promise<{ changed: true }> {
  return apiRequest<{ changed: true }>("me/change-phone/confirm", {
    method: "POST",
    body: { requestId, oldCode, newCode },
  });
}

export function forgetWebSession(): void {
  publish(null);
  channel?.postMessage({ type: "logout" });
}

export async function logoutWeb(): Promise<void> {
  const session = activeSession;
  if (!session) return;
  await fetchJson<{ loggedOut: true }>(
    "auth/web/logout",
    mutation({}, { "x-csrf-token": session.csrfToken }),
  );
  forgetWebSession();
}
