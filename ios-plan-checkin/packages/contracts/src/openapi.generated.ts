// Generated from packages/contracts/openapi.json. Do not edit.
export interface paths {
  "/api/v1/auth/sms/challenges": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    post: operations["createSmsChallenge"];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/auth/sms/verify": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    post: operations["verifySmsChallenge"];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/auth/refresh": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    post: operations["refreshSession"];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/auth/logout": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    post: operations["logout"];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/auth/web/verify": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    post: operations["verifyWebSmsChallenge"];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/auth/web/session": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get: operations["getWebSession"];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/auth/web/refresh": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    post: operations["refreshWebSession"];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/auth/web/logout": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    post: operations["logoutWebSession"];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/me": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get: operations["getMe"];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch: operations["updateMe"];
    trace?: never;
  };
  "/api/v1/me/inbox": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get: operations["listInbox"];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/me/inbox/{id}/read": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    post: operations["markInboxRead"];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/usernames/availability": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get: operations["checkUsername"];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/me/change-phone/challenge": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    post: operations["createChangePhoneChallenge"];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/me/change-phone/confirm": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    post: operations["confirmChangePhone"];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/exports": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get: operations["listDataExports"];
    put?: never;
    post: operations["createDataExport"];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/exports/{id}": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get: operations["getDataExport"];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/exports/{id}/download-url": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get: operations["getDataExportDownloadUrl"];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/groups": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get: operations["listGroups"];
    put?: never;
    post: operations["createGroup"];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/groups/{id}": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    post?: never;
    delete: operations["deleteGroup"];
    options?: never;
    head?: never;
    patch: operations["updateGroup"];
    trace?: never;
  };
  "/api/v1/plans": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get: operations["listPlans"];
    put?: never;
    post: operations["createPlan"];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/today": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get: operations["getToday"];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/calendar": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get: operations["getGlobalCalendar"];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/calendar/{businessDate}": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get: operations["getCalendarDay"];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/plans/{id}": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get: operations["getPlan"];
    put?: never;
    post?: never;
    delete: operations["deletePlan"];
    options?: never;
    head?: never;
    patch: operations["updatePlan"];
    trace?: never;
  };
  "/api/v1/plans/{id}/detail": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get: operations["getPlanDetail"];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/plans/{id}/numeric-config": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    post: operations["createPlanNumericConfig"];
    delete?: never;
    options?: never;
    head?: never;
    patch: operations["updatePlanNumericConfig"];
    trace?: never;
  };
  "/api/v1/plans/{id}/pause": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    post: operations["pausePlan"];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/plans/{id}/resume": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    post: operations["resumePlan"];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/plans/{id}/archive": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    post: operations["archivePlan"];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/plans/{id}/calendar": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get: operations["getPlanCalendar"];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/plans/{id}/checkins/{businessDate}": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get: operations["getCheckin"];
    put: operations["putCheckin"];
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/plans/{id}/statistics": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get: operations["getPlanStatistics"];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/plans/{id}/one-time-resolution": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    post: operations["createOneTimeResolution"];
    delete?: never;
    options?: never;
    head?: never;
    patch: operations["reviseOneTimeResolution"];
    trace?: never;
  };
  "/api/v1/media/upload-intents": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    post: operations["createUploadIntent"];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/media/{id}/complete": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    post: operations["completeMedia"];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/media/{id}": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    post?: never;
    delete: operations["deleteMedia"];
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/media/{id}/download-url": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get: operations["getMediaDownloadUrl"];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/users/search": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get: operations["searchUsers"];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/friend-requests": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get: operations["listFriendRequests"];
    put?: never;
    post: operations["createFriendRequest"];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/friend-requests/{id}/accept": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    post: operations["acceptFriendRequest"];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/friend-requests/{id}/reject": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    post: operations["rejectFriendRequest"];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/friends": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get: operations["listFriends"];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/friends/{id}": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    post?: never;
    delete: operations["deleteFriend"];
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/blocks": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    post: operations["createBlock"];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/blocks/{id}": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    post?: never;
    delete: operations["deleteBlock"];
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/plans/{id}/share-preview": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get: operations["getSharePreview"];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/plans/{id}/shares": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get: operations["listPlanShares"];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/plans/{id}/shares/{friendId}": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put: operations["sharePlan"];
    post?: never;
    delete: operations["revokePlanShare"];
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/friends/{id}/shared-plans": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get: operations["listSharedPlans"];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/shared-plans/{id}": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get: operations["getSharedPlan"];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/shared-plans/{id}/checkins": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get: operations["listSharedCheckins"];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/checkins/{id}/encouragements": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get: operations["listEncouragements"];
    put?: never;
    post: operations["createEncouragement"];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/plans/{id}/reminder": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get: operations["getReminder"];
    put: operations["putReminder"];
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/devices/push-token": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    post: operations["registerPushToken"];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/me/notification-preferences": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get: operations["getNotificationPreferences"];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch: operations["updateNotificationPreferences"];
    trace?: never;
  };
  "/api/v1/sync/changes": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get: operations["getSyncChanges"];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/sync/ack": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    post: operations["ackSync"];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/me/exports": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get: operations["listExports"];
    put?: never;
    post: operations["createExport"];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/me/exports/{id}": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get: operations["getExport"];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/me/exports/{id}/download-url": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get: operations["getExportDownloadUrl"];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/me/deletion-request": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    post: operations["requestDeletion"];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/me/deletion-cancel": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    post: operations["cancelDeletion"];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/me/deletion-status": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get: operations["getDeletionStatus"];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
}
export type webhooks = Record<string, never>;
export interface components {
  schemas: {
    ApiError: {
      /** @enum {string} */
      code:
        | "VALIDATION_ERROR"
        | "UNAUTHENTICATED"
        | "FORBIDDEN"
        | "NOT_FOUND"
        | "RATE_LIMITED"
        | "SERVICE_UNAVAILABLE"
        | "OTP_EXPIRED"
        | "OTP_INVALID"
        | "OTP_RATE_LIMITED"
        | "SMS_UNAVAILABLE"
        | "USERNAME_TAKEN"
        | "PHONE_TAKEN"
        | "PLAN_DATE_INVALID"
        | "RULE_CHANGED"
        | "CHECKIN_CONFLICT"
        | "PLAN_NOT_ACTIVE"
        | "IDEMPOTENCY_KEY_REUSED"
        | "SHARE_REVOKED"
        | "FRIEND_BLOCKED"
        | "MEDIA_NOT_READY"
        | "CURSOR_EXPIRED"
        | "ACCOUNT_DELETION_PENDING";
      message: string;
      requestId: string;
      details?: {
        [key: string]: unknown;
      };
    };
    ApiSuccess: {
      data: {
        [key: string]: unknown;
      };
      requestId: string;
      /** Format: date-time */
      serverTime: string;
    };
    NumericEntry: {
      value: string;
      unit: string;
    };
    RecordedNumericEntry: {
      value: string;
      unit: string;
      label?: string | null;
      configVersion?: number | null;
    };
    NumericItemInput: {
      label: string;
      unit: string;
    };
    NumericItem: {
      label: string;
      unit: string;
      version: number;
      /** Format: date */
      effectiveFrom: string;
    };
    NumericConfigRequest: {
      label: string;
      unit: string;
      baseRevision: number;
    };
    ReminderConfig: {
      enabled: boolean;
      timeLocal?: string;
      weekdays?: number[];
      /** @enum {unknown} */
      daysBeforeDue?: 0 | 1 | 3;
    };
    PutReminderRequest: {
      enabled: boolean;
      baseRevision: number;
      timeLocal?: string;
      weekdays?: number[];
      /** @enum {unknown} */
      daysBeforeDue?: 0 | 1 | 3;
    };
    Reminder: {
      /** Format: uuid */
      planId: string;
      enabled: boolean;
      timeLocal: string | null;
      weekdays: number[];
      /** @enum {unknown} */
      daysBeforeDue: 0 | 1 | 3 | null;
      revision: number;
      updatedAt: string | null;
    };
    CreateEncouragementRequest: {
      /** @enum {unknown} */
      kind: "emoji" | "message";
      body: string;
    };
    Encouragement: {
      /** Format: uuid */
      id: string;
      /** Format: uuid */
      checkinId: string;
      sender: components["schemas"]["SocialUser"];
      /** @enum {unknown} */
      kind: "emoji" | "message";
      body: string;
      /** Format: date-time */
      createdAt: string;
    };
    RegisterPushTokenRequest: {
      /** Format: uuid */
      deviceId: string;
      /** @constant */
      platform: "ios";
      token: string | null;
      enabled: boolean;
    };
    PushTokenRegistration: {
      /** Format: uuid */
      deviceId: string;
      registered: boolean;
    };
    NotificationPreferences: {
      friendRequests: boolean;
      sharedUpdates: boolean;
      encouragements: boolean;
      revision: number;
      /** Format: date-time */
      updatedAt: string;
    };
    InboxMessage: {
      /** Format: uuid */
      id: string;
      /** @enum {unknown} */
      eventType:
        | "friend_request"
        | "friend_accepted"
        | "share"
        | "shared_update"
        | "encouragement";
      actorId: string | null;
      subjectId: string | null;
      canOpen: boolean;
      /** Format: date-time */
      createdAt: string;
      readAt: string | null;
    };
    InboxPage: {
      messages: components["schemas"]["InboxMessage"][];
      nextCursor: string | null;
      hasMore: boolean;
      unreadCount: number;
    };
    InboxRead: {
      /** Format: uuid */
      id: string;
      /** Format: date-time */
      readAt: string;
    };
    UpdateNotificationPreferencesRequest: {
      baseRevision: number;
      friendRequests?: boolean;
      sharedUpdates?: boolean;
      encouragements?: boolean;
    };
    DataExport: {
      /** Format: uuid */
      id: string;
      /** @enum {unknown} */
      status: "queued" | "running" | "ready" | "failed" | "expired";
      /** Format: date-time */
      createdAt: string;
      completedAt: string | null;
      expiresAt: string | null;
      fileBytes: number | null;
      fileCount: number | null;
      errorCode: string | null;
    };
    DataExportDownload: {
      /** Format: uri */
      url: string;
      /** Format: date-time */
      expiresAt: string;
      sha256: string;
      bytes: number;
    };
    DeletionStatus: {
      /** @enum {unknown} */
      status: "active" | "deletion_pending";
      dueAt: string | null;
    };
    DeletionRequest: {
      /** @constant */
      confirmed: true;
    };
    FixedPlanCreate: {
      /**
       * @description discriminator enum property added by openapi-typescript
       * @enum {string}
       */
      kind: "FixedPlanCreate";
      /** @enum {unknown} */
      direction: "do" | "avoid";
      title: string;
      description?: string | null;
      timezone: string;
      /** Format: date */
      startDate: string;
      endDate?: string | null;
      groupId?: string | null;
      reminder?: components["schemas"]["ReminderConfig"];
      numericItem?: components["schemas"]["NumericItemInput"];
      rule: {
        weekdays: number[];
      };
    };
    WeeklyPlanCreate: {
      /**
       * @description discriminator enum property added by openapi-typescript
       * @enum {string}
       */
      kind: "WeeklyPlanCreate";
      /** @enum {unknown} */
      direction: "do" | "avoid";
      title: string;
      description?: string | null;
      timezone: string;
      /** Format: date */
      startDate: string;
      endDate?: string | null;
      groupId?: string | null;
      reminder?: components["schemas"]["ReminderConfig"];
      numericItem?: components["schemas"]["NumericItemInput"];
      rule: {
        weeklyTarget: number;
      };
    };
    OneTimePlanCreate: {
      /**
       * @description discriminator enum property added by openapi-typescript
       * @enum {string}
       */
      kind: "OneTimePlanCreate";
      /** @constant */
      direction: "do";
      title: string;
      description?: string | null;
      timezone: string;
      /** Format: date */
      startDate?: string;
      /** Format: date */
      dueDate: string;
      groupId?: string | null;
      reminder?: components["schemas"]["ReminderConfig"];
      numericItem?: components["schemas"]["NumericItemInput"];
    };
    CreatePlanRequest:
      | components["schemas"]["FixedPlanCreate"]
      | components["schemas"]["WeeklyPlanCreate"]
      | components["schemas"]["OneTimePlanCreate"];
    UpdatePlanRequest: {
      baseRevision: number;
      title?: string;
      description?: string | null;
      groupId?: string | null;
      endDate?: string | null;
      /** Format: date */
      dueDate?: string;
      rule?:
        | {
            weekdays: number[];
          }
        | {
            weeklyTarget: number;
          };
    };
    Group: {
      /** Format: uuid */
      id: string;
      name: string;
      sortOrder: number;
      revision: number;
    };
    CreateGroupRequest: {
      name: string;
      sortOrder?: number;
    };
    UpdateGroupRequest: {
      baseRevision: number;
      name?: string;
      sortOrder?: number;
    };
    LifecycleRequest: {
      baseRevision: number;
    };
    PutCheckinRequest: {
      /** @enum {unknown} */
      result: "success" | "failure" | "skip";
      note?: string | null;
      failureReason?: string | null;
      numeric?: components["schemas"]["NumericEntry"] | null;
      mediaIds?: string[];
      baseRevision: number;
      /** Format: date-time */
      clientCreatedAt: string;
      /** Format: uuid */
      clientOperationId: string;
      ruleVersion: number;
      /** Format: uuid */
      resolutionOfConflictId?: string;
    };
    OneTimeResolutionRequest: {
      /** @enum {unknown} */
      resolution: "completed" | "failed" | "cancelled";
      baseRevision: number;
      /** Format: date-time */
      completedAt?: string;
      reason?: string;
      note?: string | null;
      numeric?: components["schemas"]["NumericEntry"] | null;
      mediaIds?: string[];
    };
    SmsChallengeRequest: {
      /** @constant */
      countryCode: "+86";
      phone: string;
      /** @enum {unknown} */
      purpose: "login" | "change_phone" | "cancel_deletion";
    };
    SmsVerifyRequest: {
      /** Format: uuid */
      challengeId: string;
      code: string;
    };
    RefreshRequest: {
      refreshToken: string;
    };
    LogoutRequest: {
      refreshToken?: string;
    };
    SmsChallengeResponse: {
      /** Format: uuid */
      challengeId: string;
      /** Format: date-time */
      expiresAt: string;
      resendAfterSeconds: number;
    };
    AuthTokens: {
      accessToken: string;
      refreshToken: string;
      /** Format: date-time */
      accessExpiresAt: string;
      /** Format: uuid */
      userId: string;
      isNewUser: boolean;
    };
    WebSession: {
      accessToken: string;
      /** Format: date-time */
      accessExpiresAt: string;
      /** Format: uuid */
      userId: string;
      isNewUser: boolean;
      csrfToken: string;
    };
    User: {
      /** Format: uuid */
      id: string;
      username: string | null;
      nickname: string | null;
      avatarMediaId: string | null;
      /** @enum {unknown} */
      accountStatus: "active" | "deletion_pending";
      revision: number;
    };
    SocialUser: {
      /** Format: uuid */
      id: string;
      username: string;
      nickname: string | null;
      avatarMediaId: string | null;
    };
    FriendRequest: {
      /** Format: uuid */
      id: string;
      sender: components["schemas"]["SocialUser"];
      receiver: components["schemas"]["SocialUser"];
      /** @enum {unknown} */
      status: "pending" | "accepted" | "rejected" | "cancelled";
      /** Format: date-time */
      createdAt: string;
      respondedAt: string | null;
    };
    FriendRequests: {
      incoming: components["schemas"]["FriendRequest"][];
      outgoing: components["schemas"]["FriendRequest"][];
    };
    CreateFriendRequestRequest: {
      /** Format: uuid */
      receiverId: string;
    };
    CreateBlockRequest: {
      /** Format: uuid */
      blockedId: string;
    };
    ShareGrantRequest: {
      previewToken: string;
    };
    PlanShare: {
      /** Format: uuid */
      planId: string;
      friend: components["schemas"]["SocialUser"];
      /** Format: date-time */
      grantedAt: string;
      revision: number;
    };
    SharedPlan: {
      /** Format: uuid */
      id: string;
      owner: components["schemas"]["SocialUser"];
      /** @enum {unknown} */
      kind: "fixed" | "weekly" | "one_time";
      /** @enum {unknown} */
      direction: "do" | "avoid";
      title: string;
      timezone: string;
      /** Format: date */
      startDate: string;
      endDate: string | null;
      dueDate: string | null;
      /** @enum {unknown} */
      lifecycle: "active" | "paused" | "archived";
      ruleVersion: number;
      rule:
        | {
            weekdays: number[];
          }
        | {
            weeklyTarget: number;
          }
        | null;
      progress:
        | {
            /** @constant */
            kind: "fixed";
            successCount: number;
            denominator: number;
            completionRate: number | null;
          }
        | {
            /** @constant */
            kind: "weekly";
            /** Format: date */
            weekStartDate: string;
            successes: number;
            target: number | null;
          }
        | {
            /** @constant */
            kind: "one_time";
            /** @enum {unknown} */
            state:
              | "pending"
              | "overdue"
              | "completed"
              | "late_completed"
              | "failed"
              | "cancelled";
          };
    };
    SharedHistoryEntry: {
      checkinId: string | null;
      /** Format: date */
      businessDate: string;
      /** @enum {unknown} */
      status:
        | "success"
        | "failure"
        | "skip"
        | "pending"
        | "unrecorded"
        | "future"
        | "due"
        | "overdue"
        | "completed"
        | "late_completed"
        | "failed"
        | "cancelled"
        | "not_due";
      note: string | null;
      failureReason: string | null;
      isBackfilled: boolean;
      isRevised: boolean;
      ruleVersion: number;
    };
    SharedHistory: {
      plan: components["schemas"]["SharedPlan"];
      month: string;
      entries: components["schemas"]["SharedHistoryEntry"][];
      weeklySummaries: components["schemas"]["WeeklySummary"][];
      earliestMonth: string;
      latestMonth: string;
    };
    SharePreview: {
      plan: components["schemas"]["SharedPlan"];
      month: string;
      entries: components["schemas"]["SharedHistoryEntry"][];
      weeklySummaries: components["schemas"]["WeeklySummary"][];
      earliestMonth: string;
      latestMonth: string;
      friend: components["schemas"]["SocialUser"];
      disclosure: string;
      previewToken: string;
    };
    Plan: {
      /** Format: uuid */
      id: string;
      /** Format: uuid */
      ownerId: string;
      /** @enum {unknown} */
      kind: "fixed" | "weekly" | "one_time";
      /** @enum {unknown} */
      direction: "do" | "avoid";
      title: string;
      description?: string | null;
      timezone: string;
      /** Format: date */
      startDate: string;
      /** Format: date */
      ruleEffectiveDate?: string;
      rule?:
        | {
            weekdays: number[];
          }
        | {
            weeklyTarget: number;
          }
        | null;
      endDate?: string | null;
      dueDate?: string | null;
      /** @enum {unknown} */
      lifecycle: "active" | "paused" | "archived" | "deleted";
      ruleVersion: number;
      numericItem?: components["schemas"]["NumericItem"] | null;
      revision: number;
    };
    Checkin: {
      /** Format: uuid */
      id: string;
      /** Format: uuid */
      planId: string;
      /** Format: date */
      businessDate: string;
      /** @enum {unknown} */
      result: "success" | "failure" | "skip";
      note?: string | null;
      failureReason?: string | null;
      numeric?: components["schemas"]["RecordedNumericEntry"] | null;
      mediaIds?: string[];
      mediaAttachFailed?: boolean;
      isBackfilled?: boolean;
      isRevised?: boolean;
      revision: number;
      ruleVersion: number;
      /** Format: date-time */
      createdAt?: string;
      /** Format: date-time */
      updatedAt?: string;
      syncSequence: number;
    };
    CreateUploadIntentRequest: {
      /** @enum {unknown} */
      mime: "image/jpeg" | "image/png" | "image/heic" | "image/webp";
      bytes: number;
      sha256: string;
    };
    UploadIntent: {
      /** Format: uuid */
      id: string;
      /** Format: uri */
      uploadUrl: string;
      /** Format: date-time */
      expiresAt: string;
      headers: {
        [key: string]: string;
      };
    };
    CompleteMediaRequest:
      | {
          /** Format: uuid */
          checkinId: string;
        }
      | {
          /** Format: uuid */
          oneTimePlanId: string;
        };
    Media: {
      /** Format: uuid */
      id: string;
      /** @enum {unknown} */
      status: "ready" | "deleted";
      /** @enum {unknown} */
      mime: "image/jpeg" | "image/png" | "image/heic" | "image/webp";
      bytes: number;
      checkinId: string | null;
      oneTimePlanId: string | null;
    };
    MediaDownload: {
      /** Format: uri */
      url: string;
      /** Format: date-time */
      expiresAt: string;
    };
    SyncChange: {
      seq: number;
      /** @enum {unknown} */
      entityType: "plan" | "checkin" | "group" | "share" | "friend" | "user";
      /** Format: uuid */
      entityId: string;
      /** @enum {unknown} */
      operation: "upsert" | "delete" | "revoke";
      payload?: {
        [key: string]: unknown;
      };
      /** Format: date-time */
      changedAt: string;
    };
    SyncChanges: {
      changes: components["schemas"]["SyncChange"][];
      nextCursor: string;
      hasMore: boolean;
    };
    SyncAckRequest: {
      cursor: string;
      /** Format: uuid */
      deviceId: string;
    };
    SyncAck: {
      acknowledgedSeq: number;
    };
    OneTimeResolution: {
      /** Format: uuid */
      planId: string;
      /** @enum {unknown} */
      resolution: "completed" | "failed" | "cancelled";
      /** Format: date */
      resolvedBusinessDate: string;
      /** Format: date-time */
      resolvedAt: string;
      note: string | null;
      numeric?: components["schemas"]["RecordedNumericEntry"] | null;
      mediaIds?: string[];
      mediaAttachFailed?: boolean;
      revision: number;
      isRevised: boolean;
      /** @enum {unknown} */
      timing: "on_time" | "late" | null;
    };
    UpdateMeRequest: {
      baseRevision: number;
      username?: string;
      nickname?: string;
      avatarMediaId?: string | null;
    };
    ChangePhoneChallengeRequest: {
      /** @constant */
      countryCode: "+86";
      phone: string;
    };
    ChangePhoneConfirmRequest: {
      /** Format: uuid */
      requestId: string;
      oldCode: string;
      newCode: string;
    };
    ChangePhoneChallengeResponse: {
      /** Format: uuid */
      requestId: string;
      oldMasked: string;
      newMasked: string;
      /** Format: date-time */
      expiresAt: string;
    };
    UsernameAvailability: {
      available: boolean;
      normalized: string;
    };
    CalendarEntry: {
      /** Format: uuid */
      planId: string;
      title: string;
      /** @enum {unknown} */
      kind: "fixed" | "weekly" | "one_time";
      /** @enum {unknown} */
      direction: "do" | "avoid";
      timezone: string;
      /** Format: date */
      businessDate: string;
      /** @enum {unknown} */
      status:
        | "success"
        | "failure"
        | "skip"
        | "pending"
        | "unrecorded"
        | "future"
        | "due"
        | "overdue"
        | "completed"
        | "late_completed"
        | "failed"
        | "cancelled";
      recordId: string | null;
      ruleVersion: number;
      isBackfilled: boolean;
      isRevised: boolean;
    };
    CalendarDay: {
      /** Format: date */
      businessDate: string;
      counts: {
        success: number;
        failure: number;
        skip: number;
        unrecorded: number;
      };
      entries: components["schemas"]["CalendarEntry"][];
    };
    WeeklySummary: {
      /** Format: date */
      weekStartDate: string;
      ruleVersion: number | null;
      target: number | null;
      successes: number;
      completeWeek: boolean;
      attained: boolean | null;
      progressRate: number | null;
    };
    CalendarMonth: {
      month: string;
      /** @constant */
      dateSemantics: "plan_business_date";
      groupId: string | null;
      days: components["schemas"]["CalendarDay"][];
      weeklySummaries: {
        /** Format: uuid */
        planId: string;
        title: string;
        timezone: string;
        summary: components["schemas"]["WeeklySummary"];
      }[];
    };
    Today: {
      viewTimezone: string;
      /** Format: date */
      viewDate: string;
      items: {
        plan: components["schemas"]["Plan"];
        /** Format: date */
        planBusinessDate: string;
        /** @enum {unknown} */
        status:
          | "success"
          | "failure"
          | "skip"
          | "pending"
          | "unrecorded"
          | "future"
          | "due"
          | "overdue"
          | "completed"
          | "late_completed"
          | "failed"
          | "cancelled"
          | "goal_met";
        activeRuleVersion: number;
        record: {
          /** Format: uuid */
          id: string;
          /** @enum {unknown} */
          result: "success" | "failure" | "skip";
          revision: number;
          isBackfilled: boolean;
          isRevised: boolean;
        } | null;
        weeklyProgress: components["schemas"]["WeeklySummary"] | null;
        canCheckIn: boolean;
        reminderTimeLocal: string | null;
      }[];
    };
    FixedStatistics: {
      /** @constant */
      kind: "fixed";
      /** Format: uuid */
      planId: string;
      timezone: string;
      /** Format: date */
      statisticsThroughBusinessDate: string;
      ruleVersions: number[];
      successCount: number;
      failureCount: number;
      skipCount: number;
      unrecordedCount: number;
      denominator: number;
      completionRate: number | null;
      consecutiveDueSuccesses: number;
    };
    WeeklyStatistics: {
      /** @constant */
      kind: "weekly";
      /** Format: uuid */
      planId: string;
      timezone: string;
      /** Format: date */
      statisticsThroughBusinessDate: string;
      ruleVersions: number[];
      completeWeekCount: number;
      attainedWeekCount: number;
      attainmentRate: number | null;
      consecutiveAttainedWeeks: number;
      currentWeek: components["schemas"]["WeeklySummary"];
      completedWeeks: components["schemas"]["WeeklySummary"][];
    };
    OneTimeStatistics: {
      /** @constant */
      kind: "one_time";
      /** Format: uuid */
      planId: string;
      timezone: string;
      /** Format: date */
      statisticsThroughBusinessDate: string;
      ruleVersions: number[];
      /** Format: date */
      dueDate: string;
      /** @enum {unknown} */
      state:
        | "pending"
        | "overdue"
        | "completed"
        | "late_completed"
        | "failed"
        | "cancelled";
      resolution: components["schemas"]["OneTimeResolution"] | null;
    };
    PlanDetail: {
      plan: components["schemas"]["Plan"];
      statistics:
        | components["schemas"]["FixedStatistics"]
        | components["schemas"]["WeeklyStatistics"]
        | components["schemas"]["OneTimeStatistics"];
      /** @enum {unknown} */
      todayStatus:
        | "success"
        | "failure"
        | "skip"
        | "pending"
        | "unrecorded"
        | "future"
        | "due"
        | "overdue"
        | "completed"
        | "late_completed"
        | "failed"
        | "cancelled"
        | "goal_met"
        | "not_due";
      recentRecords: components["schemas"]["CalendarEntry"][];
    };
  };
  responses: never;
  parameters: never;
  requestBodies: never;
  headers: never;
  pathItems: never;
}
export type $defs = Record<string, never>;
export interface operations {
  createSmsChallenge: {
    parameters: {
      query?: never;
      header: {
        "Idempotency-Key": string;
        "X-Client-Request-Id": string;
      };
      path?: never;
      cookie?: never;
    };
    requestBody: {
      content: {
        "application/json": components["schemas"]["SmsChallengeRequest"];
      };
    };
    responses: {
      /** @description Success */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": {
            data: components["schemas"]["SmsChallengeResponse"];
            requestId: string;
            /** Format: date-time */
            serverTime: string;
          };
        };
      };
      /** @description Invalid request */
      400: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiError"];
        };
      };
      /** @description Unauthenticated */
      401: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiError"];
        };
      };
      /** @description Forbidden */
      403: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiError"];
        };
      };
      /** @description Conflict */
      409: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiError"];
        };
      };
      /** @description Rate limited */
      429: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiError"];
        };
      };
    };
  };
  verifySmsChallenge: {
    parameters: {
      query?: never;
      header: {
        "X-Device-Id": string;
        "Idempotency-Key": string;
        "X-Client-Request-Id": string;
      };
      path?: never;
      cookie?: never;
    };
    requestBody: {
      content: {
        "application/json": components["schemas"]["SmsVerifyRequest"];
      };
    };
    responses: {
      /** @description Success */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": {
            data: components["schemas"]["AuthTokens"];
            requestId: string;
            /** Format: date-time */
            serverTime: string;
          };
        };
      };
      /** @description Invalid request */
      400: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiError"];
        };
      };
      /** @description Unauthenticated */
      401: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiError"];
        };
      };
      /** @description Forbidden */
      403: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiError"];
        };
      };
      /** @description Conflict */
      409: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiError"];
        };
      };
      /** @description Rate limited */
      429: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiError"];
        };
      };
    };
  };
  refreshSession: {
    parameters: {
      query?: never;
      header: {
        "Idempotency-Key": string;
        "X-Client-Request-Id": string;
      };
      path?: never;
      cookie?: never;
    };
    requestBody: {
      content: {
        "application/json": components["schemas"]["RefreshRequest"];
      };
    };
    responses: {
      /** @description Success */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": {
            data: components["schemas"]["AuthTokens"];
            requestId: string;
            /** Format: date-time */
            serverTime: string;
          };
        };
      };
      /** @description Invalid request */
      400: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiError"];
        };
      };
      /** @description Unauthenticated */
      401: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiError"];
        };
      };
      /** @description Forbidden */
      403: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiError"];
        };
      };
      /** @description Conflict */
      409: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiError"];
        };
      };
      /** @description Rate limited */
      429: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiError"];
        };
      };
    };
  };
  logout: {
    parameters: {
      query?: never;
      header: {
        "Idempotency-Key": string;
        "X-Client-Request-Id": string;
      };
      path?: never;
      cookie?: never;
    };
    requestBody: {
      content: {
        "application/json": components["schemas"]["LogoutRequest"];
      };
    };
    responses: {
      /** @description Success */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiSuccess"];
        };
      };
      /** @description Invalid request */
      400: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiError"];
        };
      };
      /** @description Unauthenticated */
      401: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiError"];
        };
      };
      /** @description Forbidden */
      403: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiError"];
        };
      };
      /** @description Conflict */
      409: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiError"];
        };
      };
      /** @description Rate limited */
      429: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiError"];
        };
      };
    };
  };
  verifyWebSmsChallenge: {
    parameters: {
      query?: never;
      header: {
        "X-Device-Id": string;
        Origin: string;
        "Idempotency-Key": string;
        "X-Client-Request-Id": string;
      };
      path?: never;
      cookie?: never;
    };
    requestBody: {
      content: {
        "application/json": components["schemas"]["SmsVerifyRequest"];
      };
    };
    responses: {
      /** @description Success */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": {
            data: components["schemas"]["WebSession"];
            requestId: string;
            /** Format: date-time */
            serverTime: string;
          };
        };
      };
      /** @description Invalid request */
      400: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiError"];
        };
      };
      /** @description Unauthenticated */
      401: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiError"];
        };
      };
      /** @description Forbidden */
      403: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiError"];
        };
      };
      /** @description Conflict */
      409: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiError"];
        };
      };
      /** @description Rate limited */
      429: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiError"];
        };
      };
    };
  };
  getWebSession: {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      /** @description Success */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": {
            data: components["schemas"]["WebSession"];
            requestId: string;
            /** Format: date-time */
            serverTime: string;
          };
        };
      };
      /** @description Invalid request */
      400: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiError"];
        };
      };
      /** @description Unauthenticated */
      401: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiError"];
        };
      };
      /** @description Forbidden */
      403: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiError"];
        };
      };
      /** @description Conflict */
      409: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiError"];
        };
      };
      /** @description Rate limited */
      429: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiError"];
        };
      };
    };
  };
  refreshWebSession: {
    parameters: {
      query?: never;
      header: {
        Origin: string;
        "X-CSRF-Token": string;
        "Idempotency-Key": string;
        "X-Client-Request-Id": string;
      };
      path?: never;
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      /** @description Success */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": {
            data: components["schemas"]["WebSession"];
            requestId: string;
            /** Format: date-time */
            serverTime: string;
          };
        };
      };
      /** @description Invalid request */
      400: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiError"];
        };
      };
      /** @description Unauthenticated */
      401: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiError"];
        };
      };
      /** @description Forbidden */
      403: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiError"];
        };
      };
      /** @description Conflict */
      409: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiError"];
        };
      };
      /** @description Rate limited */
      429: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiError"];
        };
      };
    };
  };
  logoutWebSession: {
    parameters: {
      query?: never;
      header: {
        Origin: string;
        "X-CSRF-Token": string;
        "Idempotency-Key": string;
        "X-Client-Request-Id": string;
      };
      path?: never;
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      /** @description Success */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiSuccess"];
        };
      };
      /** @description Invalid request */
      400: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiError"];
        };
      };
      /** @description Unauthenticated */
      401: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiError"];
        };
      };
      /** @description Forbidden */
      403: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiError"];
        };
      };
      /** @description Conflict */
      409: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiError"];
        };
      };
      /** @description Rate limited */
      429: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiError"];
        };
      };
    };
  };
  getMe: {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      /** @description Success */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": {
            data: components["schemas"]["User"];
            requestId: string;
            /** Format: date-time */
            serverTime: string;
          };
        };
      };
      /** @description Invalid request */
      400: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiError"];
        };
      };
      /** @description Unauthenticated */
      401: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiError"];
        };
      };
      /** @description Forbidden */
      403: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiError"];
        };
      };
      /** @description Conflict */
      409: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiError"];
        };
      };
      /** @description Rate limited */
      429: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiError"];
        };
      };
    };
  };
  updateMe: {
    parameters: {
      query?: never;
      header: {
        "Idempotency-Key": string;
        "X-Client-Request-Id": string;
      };
      path?: never;
      cookie?: never;
    };
    requestBody: {
      content: {
        "application/json": components["schemas"]["UpdateMeRequest"];
      };
    };
    responses: {
      /** @description Success */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": {
            data: components["schemas"]["User"];
            requestId: string;
            /** Format: date-time */
            serverTime: string;
          };
        };
      };
      /** @description Invalid request */
      400: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiError"];
        };
      };
      /** @description Unauthenticated */
      401: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiError"];
        };
      };
      /** @description Forbidden */
      403: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiError"];
        };
      };
      /** @description Conflict */
      409: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiError"];
        };
      };
      /** @description Rate limited */
      429: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiError"];
        };
      };
    };
  };
  listInbox: {
    parameters: {
      query?: {
        cursor?: string;
        limit?: number;
      };
      header?: never;
      path?: never;
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      /** @description Success */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": {
            data: components["schemas"]["InboxPage"];
            requestId: string;
            /** Format: date-time */
            serverTime: string;
          };
        };
      };
      /** @description Invalid request */
      400: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiError"];
        };
      };
      /** @description Unauthenticated */
      401: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiError"];
        };
      };
      /** @description Forbidden */
      403: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiError"];
        };
      };
      /** @description Conflict */
      409: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiError"];
        };
      };
      /** @description Rate limited */
      429: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiError"];
        };
      };
    };
  };
  markInboxRead: {
    parameters: {
      query?: never;
      header: {
        "Idempotency-Key": string;
        "X-Client-Request-Id": string;
      };
      path: {
        id: string;
      };
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      /** @description Success */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": {
            data: components["schemas"]["InboxRead"];
            requestId: string;
            /** Format: date-time */
            serverTime: string;
          };
        };
      };
      /** @description Invalid request */
      400: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiError"];
        };
      };
      /** @description Unauthenticated */
      401: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiError"];
        };
      };
      /** @description Forbidden */
      403: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiError"];
        };
      };
      /** @description Conflict */
      409: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiError"];
        };
      };
      /** @description Rate limited */
      429: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiError"];
        };
      };
    };
  };
  checkUsername: {
    parameters: {
      query: {
        username: string;
      };
      header?: never;
      path?: never;
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      /** @description Success */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": {
            data: components["schemas"]["UsernameAvailability"];
            requestId: string;
            /** Format: date-time */
            serverTime: string;
          };
        };
      };
      /** @description Invalid request */
      400: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiError"];
        };
      };
      /** @description Unauthenticated */
      401: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiError"];
        };
      };
      /** @description Forbidden */
      403: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiError"];
        };
      };
      /** @description Conflict */
      409: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiError"];
        };
      };
      /** @description Rate limited */
      429: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiError"];
        };
      };
    };
  };
  createChangePhoneChallenge: {
    parameters: {
      query?: never;
      header: {
        "Idempotency-Key": string;
        "X-Client-Request-Id": string;
      };
      path?: never;
      cookie?: never;
    };
    requestBody: {
      content: {
        "application/json": components["schemas"]["ChangePhoneChallengeRequest"];
      };
    };
    responses: {
      /** @description Success */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": {
            data: components["schemas"]["ChangePhoneChallengeResponse"];
            requestId: string;
            /** Format: date-time */
            serverTime: string;
          };
        };
      };
      /** @description Invalid request */
      400: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiError"];
        };
      };
      /** @description Unauthenticated */
      401: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiError"];
        };
      };
      /** @description Forbidden */
      403: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiError"];
        };
      };
      /** @description Conflict */
      409: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiError"];
        };
      };
      /** @description Rate limited */
      429: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiError"];
        };
      };
    };
  };
  confirmChangePhone: {
    parameters: {
      query?: never;
      header: {
        "Idempotency-Key": string;
        "X-Client-Request-Id": string;
      };
      path?: never;
      cookie?: never;
    };
    requestBody: {
      content: {
        "application/json": components["schemas"]["ChangePhoneConfirmRequest"];
      };
    };
    responses: {
      /** @description Success */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiSuccess"];
        };
      };
      /** @description Invalid request */
      400: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiError"];
        };
      };
      /** @description Unauthenticated */
      401: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiError"];
        };
      };
      /** @description Forbidden */
      403: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiError"];
        };
      };
      /** @description Conflict */
      409: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiError"];
        };
      };
      /** @description Rate limited */
      429: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiError"];
        };
      };
    };
  };
  listDataExports: {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      /** @description Success */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": {
            data: components["schemas"]["DataExport"][];
            requestId: string;
            /** Format: date-time */
            serverTime: string;
          };
        };
      };
      /** @description Invalid request */
      400: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiError"];
        };
      };
      /** @description Unauthenticated */
      401: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiError"];
        };
      };
      /** @description Forbidden */
      403: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiError"];
        };
      };
      /** @description Conflict */
      409: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiError"];
        };
      };
      /** @description Rate limited */
      429: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiError"];
        };
      };
    };
  };
  createDataExport: {
    parameters: {
      query?: never;
      header: {
        "Idempotency-Key": string;
        "X-Client-Request-Id": string;
      };
      path?: never;
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      /** @description Success */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": {
            data: components["schemas"]["DataExport"];
            requestId: string;
            /** Format: date-time */
            serverTime: string;
          };
        };
      };
      /** @description Invalid request */
      400: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiError"];
        };
      };
      /** @description Unauthenticated */
      401: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiError"];
        };
      };
      /** @description Forbidden */
      403: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiError"];
        };
      };
      /** @description Conflict */
      409: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiError"];
        };
      };
      /** @description Rate limited */
      429: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiError"];
        };
      };
    };
  };
  getDataExport: {
    parameters: {
      query?: never;
      header?: never;
      path: {
        id: string;
      };
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      /** @description Success */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": {
            data: components["schemas"]["DataExport"];
            requestId: string;
            /** Format: date-time */
            serverTime: string;
          };
        };
      };
      /** @description Invalid request */
      400: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiError"];
        };
      };
      /** @description Unauthenticated */
      401: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiError"];
        };
      };
      /** @description Forbidden */
      403: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiError"];
        };
      };
      /** @description Conflict */
      409: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiError"];
        };
      };
      /** @description Rate limited */
      429: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiError"];
        };
      };
    };
  };
  getDataExportDownloadUrl: {
    parameters: {
      query?: never;
      header?: never;
      path: {
        id: string;
      };
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      /** @description Success */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": {
            data: components["schemas"]["DataExportDownload"];
            requestId: string;
            /** Format: date-time */
            serverTime: string;
          };
        };
      };
      /** @description Invalid request */
      400: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiError"];
        };
      };
      /** @description Unauthenticated */
      401: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiError"];
        };
      };
      /** @description Forbidden */
      403: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiError"];
        };
      };
      /** @description Conflict */
      409: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiError"];
        };
      };
      /** @description Rate limited */
      429: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiError"];
        };
      };
    };
  };
  listGroups: {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      /** @description Success */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": {
            data: components["schemas"]["Group"][];
            requestId: string;
            /** Format: date-time */
            serverTime: string;
          };
        };
      };
      /** @description Invalid request */
      400: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiError"];
        };
      };
      /** @description Unauthenticated */
      401: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiError"];
        };
      };
      /** @description Forbidden */
      403: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiError"];
        };
      };
      /** @description Conflict */
      409: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiError"];
        };
      };
      /** @description Rate limited */
      429: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiError"];
        };
      };
    };
  };
  createGroup: {
    parameters: {
      query?: never;
      header: {
        "Idempotency-Key": string;
        "X-Client-Request-Id": string;
      };
      path?: never;
      cookie?: never;
    };
    requestBody: {
      content: {
        "application/json": components["schemas"]["CreateGroupRequest"];
      };
    };
    responses: {
      /** @description Success */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": {
            data: components["schemas"]["Group"];
            requestId: string;
            /** Format: date-time */
            serverTime: string;
          };
        };
      };
      /** @description Invalid request */
      400: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiError"];
        };
      };
      /** @description Unauthenticated */
      401: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiError"];
        };
      };
      /** @description Forbidden */
      403: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiError"];
        };
      };
      /** @description Conflict */
      409: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiError"];
        };
      };
      /** @description Rate limited */
      429: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiError"];
        };
      };
    };
  };
  deleteGroup: {
    parameters: {
      query: {
        baseRevision: number;
      };
      header: {
        "Idempotency-Key": string;
        "X-Client-Request-Id": string;
      };
      path: {
        id: string;
      };
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      /** @description Success */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiSuccess"];
        };
      };
      /** @description Invalid request */
      400: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiError"];
        };
      };
      /** @description Unauthenticated */
      401: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiError"];
        };
      };
      /** @description Forbidden */
      403: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiError"];
        };
      };
      /** @description Conflict */
      409: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiError"];
        };
      };
      /** @description Rate limited */
      429: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiError"];
        };
      };
    };
  };
  updateGroup: {
    parameters: {
      query?: never;
      header: {
        "Idempotency-Key": string;
        "X-Client-Request-Id": string;
      };
      path: {
        id: string;
      };
      cookie?: never;
    };
    requestBody: {
      content: {
        "application/json": components["schemas"]["UpdateGroupRequest"];
      };
    };
    responses: {
      /** @description Success */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": {
            data: components["schemas"]["Group"];
            requestId: string;
            /** Format: date-time */
            serverTime: string;
          };
        };
      };
      /** @description Invalid request */
      400: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiError"];
        };
      };
      /** @description Unauthenticated */
      401: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiError"];
        };
      };
      /** @description Forbidden */
      403: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiError"];
        };
      };
      /** @description Conflict */
      409: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiError"];
        };
      };
      /** @description Rate limited */
      429: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiError"];
        };
      };
    };
  };
  listPlans: {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      /** @description Success */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": {
            data: components["schemas"]["Plan"][];
            requestId: string;
            /** Format: date-time */
            serverTime: string;
          };
        };
      };
      /** @description Invalid request */
      400: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiError"];
        };
      };
      /** @description Unauthenticated */
      401: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiError"];
        };
      };
      /** @description Forbidden */
      403: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiError"];
        };
      };
      /** @description Conflict */
      409: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiError"];
        };
      };
      /** @description Rate limited */
      429: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiError"];
        };
      };
    };
  };
  createPlan: {
    parameters: {
      query?: never;
      header: {
        "Idempotency-Key": string;
        "X-Client-Request-Id": string;
      };
      path?: never;
      cookie?: never;
    };
    requestBody: {
      content: {
        "application/json": components["schemas"]["CreatePlanRequest"];
      };
    };
    responses: {
      /** @description Success */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": {
            data: components["schemas"]["Plan"];
            requestId: string;
            /** Format: date-time */
            serverTime: string;
          };
        };
      };
      /** @description Invalid request */
      400: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiError"];
        };
      };
      /** @description Unauthenticated */
      401: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiError"];
        };
      };
      /** @description Forbidden */
      403: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiError"];
        };
      };
      /** @description Conflict */
      409: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiError"];
        };
      };
      /** @description Rate limited */
      429: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiError"];
        };
      };
    };
  };
  getToday: {
    parameters: {
      query?: {
        timezone?: string;
      };
      header?: never;
      path?: never;
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      /** @description Success */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": {
            data: components["schemas"]["Today"];
            requestId: string;
            /** Format: date-time */
            serverTime: string;
          };
        };
      };
      /** @description Invalid request */
      400: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiError"];
        };
      };
      /** @description Unauthenticated */
      401: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiError"];
        };
      };
      /** @description Forbidden */
      403: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiError"];
        };
      };
      /** @description Conflict */
      409: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiError"];
        };
      };
      /** @description Rate limited */
      429: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiError"];
        };
      };
    };
  };
  getGlobalCalendar: {
    parameters: {
      query: {
        month: string;
        groupId?: string;
      };
      header?: never;
      path?: never;
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      /** @description Success */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": {
            data: components["schemas"]["CalendarMonth"];
            requestId: string;
            /** Format: date-time */
            serverTime: string;
          };
        };
      };
      /** @description Invalid request */
      400: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiError"];
        };
      };
      /** @description Unauthenticated */
      401: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiError"];
        };
      };
      /** @description Forbidden */
      403: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiError"];
        };
      };
      /** @description Conflict */
      409: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiError"];
        };
      };
      /** @description Rate limited */
      429: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiError"];
        };
      };
    };
  };
  getCalendarDay: {
    parameters: {
      query?: {
        groupId?: string;
      };
      header?: never;
      path: {
        businessDate: string;
      };
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      /** @description Success */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": {
            data: components["schemas"]["CalendarDay"];
            requestId: string;
            /** Format: date-time */
            serverTime: string;
          };
        };
      };
      /** @description Invalid request */
      400: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiError"];
        };
      };
      /** @description Unauthenticated */
      401: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiError"];
        };
      };
      /** @description Forbidden */
      403: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiError"];
        };
      };
      /** @description Conflict */
      409: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiError"];
        };
      };
      /** @description Rate limited */
      429: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiError"];
        };
      };
    };
  };
  getPlan: {
    parameters: {
      query?: never;
      header?: never;
      path: {
        id: string;
      };
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      /** @description Success */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": {
            data: components["schemas"]["Plan"];
            requestId: string;
            /** Format: date-time */
            serverTime: string;
          };
        };
      };
      /** @description Invalid request */
      400: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiError"];
        };
      };
      /** @description Unauthenticated */
      401: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiError"];
        };
      };
      /** @description Forbidden */
      403: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiError"];
        };
      };
      /** @description Conflict */
      409: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiError"];
        };
      };
      /** @description Rate limited */
      429: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiError"];
        };
      };
    };
  };
  deletePlan: {
    parameters: {
      query: {
        baseRevision: number;
      };
      header: {
        "X-Confirm-Delete": "true";
        "Idempotency-Key": string;
        "X-Client-Request-Id": string;
      };
      path: {
        id: string;
      };
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      /** @description Success */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiSuccess"];
        };
      };
      /** @description Invalid request */
      400: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiError"];
        };
      };
      /** @description Unauthenticated */
      401: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiError"];
        };
      };
      /** @description Forbidden */
      403: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiError"];
        };
      };
      /** @description Conflict */
      409: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiError"];
        };
      };
      /** @description Rate limited */
      429: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiError"];
        };
      };
    };
  };
  updatePlan: {
    parameters: {
      query?: never;
      header: {
        "Idempotency-Key": string;
        "X-Client-Request-Id": string;
      };
      path: {
        id: string;
      };
      cookie?: never;
    };
    requestBody: {
      content: {
        "application/json": components["schemas"]["UpdatePlanRequest"];
      };
    };
    responses: {
      /** @description Success */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": {
            data: components["schemas"]["Plan"];
            requestId: string;
            /** Format: date-time */
            serverTime: string;
          };
        };
      };
      /** @description Invalid request */
      400: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiError"];
        };
      };
      /** @description Unauthenticated */
      401: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiError"];
        };
      };
      /** @description Forbidden */
      403: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiError"];
        };
      };
      /** @description Conflict */
      409: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiError"];
        };
      };
      /** @description Rate limited */
      429: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiError"];
        };
      };
    };
  };
  getPlanDetail: {
    parameters: {
      query?: never;
      header?: never;
      path: {
        id: string;
      };
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      /** @description Success */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": {
            data: components["schemas"]["PlanDetail"];
            requestId: string;
            /** Format: date-time */
            serverTime: string;
          };
        };
      };
      /** @description Invalid request */
      400: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiError"];
        };
      };
      /** @description Unauthenticated */
      401: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiError"];
        };
      };
      /** @description Forbidden */
      403: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiError"];
        };
      };
      /** @description Conflict */
      409: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiError"];
        };
      };
      /** @description Rate limited */
      429: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiError"];
        };
      };
    };
  };
  createPlanNumericConfig: {
    parameters: {
      query?: never;
      header: {
        "Idempotency-Key": string;
        "X-Client-Request-Id": string;
      };
      path: {
        id: string;
      };
      cookie?: never;
    };
    requestBody: {
      content: {
        "application/json": components["schemas"]["NumericConfigRequest"];
      };
    };
    responses: {
      /** @description Success */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": {
            data: components["schemas"]["Plan"];
            requestId: string;
            /** Format: date-time */
            serverTime: string;
          };
        };
      };
      /** @description Invalid request */
      400: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiError"];
        };
      };
      /** @description Unauthenticated */
      401: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiError"];
        };
      };
      /** @description Forbidden */
      403: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiError"];
        };
      };
      /** @description Conflict */
      409: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiError"];
        };
      };
      /** @description Rate limited */
      429: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiError"];
        };
      };
    };
  };
  updatePlanNumericConfig: {
    parameters: {
      query?: never;
      header: {
        "Idempotency-Key": string;
        "X-Client-Request-Id": string;
      };
      path: {
        id: string;
      };
      cookie?: never;
    };
    requestBody: {
      content: {
        "application/json": components["schemas"]["NumericConfigRequest"];
      };
    };
    responses: {
      /** @description Success */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": {
            data: components["schemas"]["Plan"];
            requestId: string;
            /** Format: date-time */
            serverTime: string;
          };
        };
      };
      /** @description Invalid request */
      400: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiError"];
        };
      };
      /** @description Unauthenticated */
      401: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiError"];
        };
      };
      /** @description Forbidden */
      403: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiError"];
        };
      };
      /** @description Conflict */
      409: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiError"];
        };
      };
      /** @description Rate limited */
      429: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiError"];
        };
      };
    };
  };
  pausePlan: {
    parameters: {
      query?: never;
      header: {
        "Idempotency-Key": string;
        "X-Client-Request-Id": string;
      };
      path: {
        id: string;
      };
      cookie?: never;
    };
    requestBody: {
      content: {
        "application/json": components["schemas"]["LifecycleRequest"];
      };
    };
    responses: {
      /** @description Success */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": {
            data: components["schemas"]["Plan"];
            requestId: string;
            /** Format: date-time */
            serverTime: string;
          };
        };
      };
      /** @description Invalid request */
      400: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiError"];
        };
      };
      /** @description Unauthenticated */
      401: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiError"];
        };
      };
      /** @description Forbidden */
      403: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiError"];
        };
      };
      /** @description Conflict */
      409: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiError"];
        };
      };
      /** @description Rate limited */
      429: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiError"];
        };
      };
    };
  };
  resumePlan: {
    parameters: {
      query?: never;
      header: {
        "Idempotency-Key": string;
        "X-Client-Request-Id": string;
      };
      path: {
        id: string;
      };
      cookie?: never;
    };
    requestBody: {
      content: {
        "application/json": components["schemas"]["LifecycleRequest"];
      };
    };
    responses: {
      /** @description Success */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": {
            data: components["schemas"]["Plan"];
            requestId: string;
            /** Format: date-time */
            serverTime: string;
          };
        };
      };
      /** @description Invalid request */
      400: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiError"];
        };
      };
      /** @description Unauthenticated */
      401: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiError"];
        };
      };
      /** @description Forbidden */
      403: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiError"];
        };
      };
      /** @description Conflict */
      409: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiError"];
        };
      };
      /** @description Rate limited */
      429: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiError"];
        };
      };
    };
  };
  archivePlan: {
    parameters: {
      query?: never;
      header: {
        "Idempotency-Key": string;
        "X-Client-Request-Id": string;
      };
      path: {
        id: string;
      };
      cookie?: never;
    };
    requestBody: {
      content: {
        "application/json": components["schemas"]["LifecycleRequest"];
      };
    };
    responses: {
      /** @description Success */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": {
            data: components["schemas"]["Plan"];
            requestId: string;
            /** Format: date-time */
            serverTime: string;
          };
        };
      };
      /** @description Invalid request */
      400: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiError"];
        };
      };
      /** @description Unauthenticated */
      401: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiError"];
        };
      };
      /** @description Forbidden */
      403: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiError"];
        };
      };
      /** @description Conflict */
      409: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiError"];
        };
      };
      /** @description Rate limited */
      429: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiError"];
        };
      };
    };
  };
  getPlanCalendar: {
    parameters: {
      query: {
        month: string;
      };
      header?: never;
      path: {
        id: string;
      };
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      /** @description Success */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": {
            data: components["schemas"]["CalendarMonth"];
            requestId: string;
            /** Format: date-time */
            serverTime: string;
          };
        };
      };
      /** @description Invalid request */
      400: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiError"];
        };
      };
      /** @description Unauthenticated */
      401: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiError"];
        };
      };
      /** @description Forbidden */
      403: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiError"];
        };
      };
      /** @description Conflict */
      409: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiError"];
        };
      };
      /** @description Rate limited */
      429: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiError"];
        };
      };
    };
  };
  getCheckin: {
    parameters: {
      query?: never;
      header?: never;
      path: {
        id: string;
        businessDate: string;
      };
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      /** @description Success */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": {
            data: components["schemas"]["Checkin"];
            requestId: string;
            /** Format: date-time */
            serverTime: string;
          };
        };
      };
      /** @description Invalid request */
      400: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiError"];
        };
      };
      /** @description Unauthenticated */
      401: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiError"];
        };
      };
      /** @description Forbidden */
      403: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiError"];
        };
      };
      /** @description Conflict */
      409: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiError"];
        };
      };
      /** @description Rate limited */
      429: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiError"];
        };
      };
    };
  };
  putCheckin: {
    parameters: {
      query?: never;
      header: {
        "Idempotency-Key": string;
        "X-Client-Request-Id": string;
      };
      path: {
        id: string;
        businessDate: string;
      };
      cookie?: never;
    };
    requestBody: {
      content: {
        "application/json": components["schemas"]["PutCheckinRequest"];
      };
    };
    responses: {
      /** @description Success */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": {
            data: components["schemas"]["Checkin"];
            requestId: string;
            /** Format: date-time */
            serverTime: string;
          };
        };
      };
      /** @description Invalid request */
      400: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiError"];
        };
      };
      /** @description Unauthenticated */
      401: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiError"];
        };
      };
      /** @description Forbidden */
      403: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiError"];
        };
      };
      /** @description Conflict */
      409: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiError"];
        };
      };
      /** @description Rate limited */
      429: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiError"];
        };
      };
    };
  };
  getPlanStatistics: {
    parameters: {
      query?: never;
      header?: never;
      path: {
        id: string;
      };
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      /** @description Success */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": {
            data:
              | components["schemas"]["FixedStatistics"]
              | components["schemas"]["WeeklyStatistics"]
              | components["schemas"]["OneTimeStatistics"];
            requestId: string;
            /** Format: date-time */
            serverTime: string;
          };
        };
      };
      /** @description Invalid request */
      400: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiError"];
        };
      };
      /** @description Unauthenticated */
      401: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiError"];
        };
      };
      /** @description Forbidden */
      403: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiError"];
        };
      };
      /** @description Conflict */
      409: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiError"];
        };
      };
      /** @description Rate limited */
      429: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiError"];
        };
      };
    };
  };
  createOneTimeResolution: {
    parameters: {
      query?: never;
      header: {
        "Idempotency-Key": string;
        "X-Client-Request-Id": string;
      };
      path: {
        id: string;
      };
      cookie?: never;
    };
    requestBody: {
      content: {
        "application/json": components["schemas"]["OneTimeResolutionRequest"];
      };
    };
    responses: {
      /** @description Success */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": {
            data: components["schemas"]["OneTimeResolution"];
            requestId: string;
            /** Format: date-time */
            serverTime: string;
          };
        };
      };
      /** @description Invalid request */
      400: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiError"];
        };
      };
      /** @description Unauthenticated */
      401: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiError"];
        };
      };
      /** @description Forbidden */
      403: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiError"];
        };
      };
      /** @description Conflict */
      409: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiError"];
        };
      };
      /** @description Rate limited */
      429: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiError"];
        };
      };
    };
  };
  reviseOneTimeResolution: {
    parameters: {
      query?: never;
      header: {
        "Idempotency-Key": string;
        "X-Client-Request-Id": string;
      };
      path: {
        id: string;
      };
      cookie?: never;
    };
    requestBody: {
      content: {
        "application/json": components["schemas"]["OneTimeResolutionRequest"];
      };
    };
    responses: {
      /** @description Success */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": {
            data: components["schemas"]["OneTimeResolution"];
            requestId: string;
            /** Format: date-time */
            serverTime: string;
          };
        };
      };
      /** @description Invalid request */
      400: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiError"];
        };
      };
      /** @description Unauthenticated */
      401: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiError"];
        };
      };
      /** @description Forbidden */
      403: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiError"];
        };
      };
      /** @description Conflict */
      409: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiError"];
        };
      };
      /** @description Rate limited */
      429: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiError"];
        };
      };
    };
  };
  createUploadIntent: {
    parameters: {
      query?: never;
      header: {
        "Idempotency-Key": string;
        "X-Client-Request-Id": string;
      };
      path?: never;
      cookie?: never;
    };
    requestBody: {
      content: {
        "application/json": components["schemas"]["CreateUploadIntentRequest"];
      };
    };
    responses: {
      /** @description Success */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": {
            data: components["schemas"]["UploadIntent"];
            requestId: string;
            /** Format: date-time */
            serverTime: string;
          };
        };
      };
      /** @description Invalid request */
      400: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiError"];
        };
      };
      /** @description Unauthenticated */
      401: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiError"];
        };
      };
      /** @description Forbidden */
      403: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiError"];
        };
      };
      /** @description Conflict */
      409: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiError"];
        };
      };
      /** @description Rate limited */
      429: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiError"];
        };
      };
    };
  };
  completeMedia: {
    parameters: {
      query?: never;
      header: {
        "Idempotency-Key": string;
        "X-Client-Request-Id": string;
      };
      path: {
        id: string;
      };
      cookie?: never;
    };
    requestBody: {
      content: {
        "application/json": components["schemas"]["CompleteMediaRequest"];
      };
    };
    responses: {
      /** @description Success */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": {
            data: components["schemas"]["Media"];
            requestId: string;
            /** Format: date-time */
            serverTime: string;
          };
        };
      };
      /** @description Invalid request */
      400: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiError"];
        };
      };
      /** @description Unauthenticated */
      401: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiError"];
        };
      };
      /** @description Forbidden */
      403: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiError"];
        };
      };
      /** @description Conflict */
      409: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiError"];
        };
      };
      /** @description Rate limited */
      429: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiError"];
        };
      };
    };
  };
  deleteMedia: {
    parameters: {
      query?: never;
      header: {
        "Idempotency-Key": string;
        "X-Client-Request-Id": string;
      };
      path: {
        id: string;
      };
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      /** @description Success */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": {
            data: {
              /** @constant */
              deleted: true;
            };
            requestId: string;
            /** Format: date-time */
            serverTime: string;
          };
        };
      };
      /** @description Invalid request */
      400: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiError"];
        };
      };
      /** @description Unauthenticated */
      401: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiError"];
        };
      };
      /** @description Forbidden */
      403: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiError"];
        };
      };
      /** @description Conflict */
      409: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiError"];
        };
      };
      /** @description Rate limited */
      429: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiError"];
        };
      };
    };
  };
  getMediaDownloadUrl: {
    parameters: {
      query?: never;
      header?: never;
      path: {
        id: string;
      };
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      /** @description Success */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": {
            data: components["schemas"]["MediaDownload"];
            requestId: string;
            /** Format: date-time */
            serverTime: string;
          };
        };
      };
      /** @description Invalid request */
      400: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiError"];
        };
      };
      /** @description Unauthenticated */
      401: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiError"];
        };
      };
      /** @description Forbidden */
      403: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiError"];
        };
      };
      /** @description Conflict */
      409: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiError"];
        };
      };
      /** @description Rate limited */
      429: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiError"];
        };
      };
    };
  };
  searchUsers: {
    parameters: {
      query: {
        username: string;
      };
      header?: never;
      path?: never;
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      /** @description Success */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": {
            data: components["schemas"]["SocialUser"][];
            requestId: string;
            /** Format: date-time */
            serverTime: string;
          };
        };
      };
      /** @description Invalid request */
      400: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiError"];
        };
      };
      /** @description Unauthenticated */
      401: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiError"];
        };
      };
      /** @description Forbidden */
      403: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiError"];
        };
      };
      /** @description Conflict */
      409: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiError"];
        };
      };
      /** @description Rate limited */
      429: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiError"];
        };
      };
    };
  };
  listFriendRequests: {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      /** @description Success */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": {
            data: components["schemas"]["FriendRequests"];
            requestId: string;
            /** Format: date-time */
            serverTime: string;
          };
        };
      };
      /** @description Invalid request */
      400: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiError"];
        };
      };
      /** @description Unauthenticated */
      401: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiError"];
        };
      };
      /** @description Forbidden */
      403: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiError"];
        };
      };
      /** @description Conflict */
      409: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiError"];
        };
      };
      /** @description Rate limited */
      429: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiError"];
        };
      };
    };
  };
  createFriendRequest: {
    parameters: {
      query?: never;
      header: {
        "Idempotency-Key": string;
        "X-Client-Request-Id": string;
      };
      path?: never;
      cookie?: never;
    };
    requestBody: {
      content: {
        "application/json": components["schemas"]["CreateFriendRequestRequest"];
      };
    };
    responses: {
      /** @description Success */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": {
            data: components["schemas"]["FriendRequest"];
            requestId: string;
            /** Format: date-time */
            serverTime: string;
          };
        };
      };
      /** @description Invalid request */
      400: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiError"];
        };
      };
      /** @description Unauthenticated */
      401: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiError"];
        };
      };
      /** @description Forbidden */
      403: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiError"];
        };
      };
      /** @description Conflict */
      409: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiError"];
        };
      };
      /** @description Rate limited */
      429: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiError"];
        };
      };
    };
  };
  acceptFriendRequest: {
    parameters: {
      query?: never;
      header: {
        "Idempotency-Key": string;
        "X-Client-Request-Id": string;
      };
      path: {
        id: string;
      };
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      /** @description Success */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": {
            data: components["schemas"]["FriendRequest"];
            requestId: string;
            /** Format: date-time */
            serverTime: string;
          };
        };
      };
      /** @description Invalid request */
      400: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiError"];
        };
      };
      /** @description Unauthenticated */
      401: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiError"];
        };
      };
      /** @description Forbidden */
      403: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiError"];
        };
      };
      /** @description Conflict */
      409: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiError"];
        };
      };
      /** @description Rate limited */
      429: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiError"];
        };
      };
    };
  };
  rejectFriendRequest: {
    parameters: {
      query?: never;
      header: {
        "Idempotency-Key": string;
        "X-Client-Request-Id": string;
      };
      path: {
        id: string;
      };
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      /** @description Success */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": {
            data: components["schemas"]["FriendRequest"];
            requestId: string;
            /** Format: date-time */
            serverTime: string;
          };
        };
      };
      /** @description Invalid request */
      400: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiError"];
        };
      };
      /** @description Unauthenticated */
      401: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiError"];
        };
      };
      /** @description Forbidden */
      403: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiError"];
        };
      };
      /** @description Conflict */
      409: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiError"];
        };
      };
      /** @description Rate limited */
      429: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiError"];
        };
      };
    };
  };
  listFriends: {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      /** @description Success */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": {
            data: components["schemas"]["SocialUser"][];
            requestId: string;
            /** Format: date-time */
            serverTime: string;
          };
        };
      };
      /** @description Invalid request */
      400: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiError"];
        };
      };
      /** @description Unauthenticated */
      401: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiError"];
        };
      };
      /** @description Forbidden */
      403: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiError"];
        };
      };
      /** @description Conflict */
      409: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiError"];
        };
      };
      /** @description Rate limited */
      429: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiError"];
        };
      };
    };
  };
  deleteFriend: {
    parameters: {
      query?: never;
      header: {
        "Idempotency-Key": string;
        "X-Client-Request-Id": string;
      };
      path: {
        id: string;
      };
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      /** @description Success */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiSuccess"];
        };
      };
      /** @description Invalid request */
      400: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiError"];
        };
      };
      /** @description Unauthenticated */
      401: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiError"];
        };
      };
      /** @description Forbidden */
      403: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiError"];
        };
      };
      /** @description Conflict */
      409: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiError"];
        };
      };
      /** @description Rate limited */
      429: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiError"];
        };
      };
    };
  };
  createBlock: {
    parameters: {
      query?: never;
      header: {
        "Idempotency-Key": string;
        "X-Client-Request-Id": string;
      };
      path?: never;
      cookie?: never;
    };
    requestBody: {
      content: {
        "application/json": components["schemas"]["CreateBlockRequest"];
      };
    };
    responses: {
      /** @description Success */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiSuccess"];
        };
      };
      /** @description Invalid request */
      400: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiError"];
        };
      };
      /** @description Unauthenticated */
      401: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiError"];
        };
      };
      /** @description Forbidden */
      403: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiError"];
        };
      };
      /** @description Conflict */
      409: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiError"];
        };
      };
      /** @description Rate limited */
      429: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiError"];
        };
      };
    };
  };
  deleteBlock: {
    parameters: {
      query?: never;
      header: {
        "Idempotency-Key": string;
        "X-Client-Request-Id": string;
      };
      path: {
        id: string;
      };
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      /** @description Success */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiSuccess"];
        };
      };
      /** @description Invalid request */
      400: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiError"];
        };
      };
      /** @description Unauthenticated */
      401: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiError"];
        };
      };
      /** @description Forbidden */
      403: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiError"];
        };
      };
      /** @description Conflict */
      409: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiError"];
        };
      };
      /** @description Rate limited */
      429: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiError"];
        };
      };
    };
  };
  getSharePreview: {
    parameters: {
      query: {
        friendId: string;
        month: string;
      };
      header?: never;
      path: {
        id: string;
      };
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      /** @description Success */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": {
            data: components["schemas"]["SharePreview"];
            requestId: string;
            /** Format: date-time */
            serverTime: string;
          };
        };
      };
      /** @description Invalid request */
      400: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiError"];
        };
      };
      /** @description Unauthenticated */
      401: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiError"];
        };
      };
      /** @description Forbidden */
      403: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiError"];
        };
      };
      /** @description Conflict */
      409: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiError"];
        };
      };
      /** @description Rate limited */
      429: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiError"];
        };
      };
    };
  };
  listPlanShares: {
    parameters: {
      query?: never;
      header?: never;
      path: {
        id: string;
      };
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      /** @description Success */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": {
            data: components["schemas"]["PlanShare"][];
            requestId: string;
            /** Format: date-time */
            serverTime: string;
          };
        };
      };
      /** @description Invalid request */
      400: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiError"];
        };
      };
      /** @description Unauthenticated */
      401: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiError"];
        };
      };
      /** @description Forbidden */
      403: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiError"];
        };
      };
      /** @description Conflict */
      409: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiError"];
        };
      };
      /** @description Rate limited */
      429: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiError"];
        };
      };
    };
  };
  sharePlan: {
    parameters: {
      query?: never;
      header: {
        "Idempotency-Key": string;
        "X-Client-Request-Id": string;
      };
      path: {
        id: string;
        friendId: string;
      };
      cookie?: never;
    };
    requestBody: {
      content: {
        "application/json": components["schemas"]["ShareGrantRequest"];
      };
    };
    responses: {
      /** @description Success */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": {
            data: components["schemas"]["PlanShare"];
            requestId: string;
            /** Format: date-time */
            serverTime: string;
          };
        };
      };
      /** @description Invalid request */
      400: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiError"];
        };
      };
      /** @description Unauthenticated */
      401: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiError"];
        };
      };
      /** @description Forbidden */
      403: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiError"];
        };
      };
      /** @description Conflict */
      409: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiError"];
        };
      };
      /** @description Rate limited */
      429: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiError"];
        };
      };
    };
  };
  revokePlanShare: {
    parameters: {
      query?: never;
      header: {
        "Idempotency-Key": string;
        "X-Client-Request-Id": string;
      };
      path: {
        id: string;
        friendId: string;
      };
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      /** @description Success */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiSuccess"];
        };
      };
      /** @description Invalid request */
      400: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiError"];
        };
      };
      /** @description Unauthenticated */
      401: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiError"];
        };
      };
      /** @description Forbidden */
      403: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiError"];
        };
      };
      /** @description Conflict */
      409: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiError"];
        };
      };
      /** @description Rate limited */
      429: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiError"];
        };
      };
    };
  };
  listSharedPlans: {
    parameters: {
      query?: never;
      header?: never;
      path: {
        id: string;
      };
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      /** @description Success */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": {
            data: components["schemas"]["SharedPlan"][];
            requestId: string;
            /** Format: date-time */
            serverTime: string;
          };
        };
      };
      /** @description Invalid request */
      400: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiError"];
        };
      };
      /** @description Unauthenticated */
      401: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiError"];
        };
      };
      /** @description Forbidden */
      403: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiError"];
        };
      };
      /** @description Conflict */
      409: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiError"];
        };
      };
      /** @description Rate limited */
      429: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiError"];
        };
      };
    };
  };
  getSharedPlan: {
    parameters: {
      query?: never;
      header?: never;
      path: {
        id: string;
      };
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      /** @description Success */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": {
            data: components["schemas"]["SharedPlan"];
            requestId: string;
            /** Format: date-time */
            serverTime: string;
          };
        };
      };
      /** @description Invalid request */
      400: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiError"];
        };
      };
      /** @description Unauthenticated */
      401: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiError"];
        };
      };
      /** @description Forbidden */
      403: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiError"];
        };
      };
      /** @description Conflict */
      409: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiError"];
        };
      };
      /** @description Rate limited */
      429: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiError"];
        };
      };
    };
  };
  listSharedCheckins: {
    parameters: {
      query?: {
        month?: string;
      };
      header?: never;
      path: {
        id: string;
      };
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      /** @description Success */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": {
            data: components["schemas"]["SharedHistory"];
            requestId: string;
            /** Format: date-time */
            serverTime: string;
          };
        };
      };
      /** @description Invalid request */
      400: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiError"];
        };
      };
      /** @description Unauthenticated */
      401: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiError"];
        };
      };
      /** @description Forbidden */
      403: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiError"];
        };
      };
      /** @description Conflict */
      409: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiError"];
        };
      };
      /** @description Rate limited */
      429: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiError"];
        };
      };
    };
  };
  listEncouragements: {
    parameters: {
      query?: never;
      header?: never;
      path: {
        id: string;
      };
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      /** @description Success */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": {
            data: components["schemas"]["Encouragement"][];
            requestId: string;
            /** Format: date-time */
            serverTime: string;
          };
        };
      };
      /** @description Invalid request */
      400: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiError"];
        };
      };
      /** @description Unauthenticated */
      401: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiError"];
        };
      };
      /** @description Forbidden */
      403: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiError"];
        };
      };
      /** @description Conflict */
      409: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiError"];
        };
      };
      /** @description Rate limited */
      429: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiError"];
        };
      };
    };
  };
  createEncouragement: {
    parameters: {
      query?: never;
      header: {
        "Idempotency-Key": string;
        "X-Client-Request-Id": string;
      };
      path: {
        id: string;
      };
      cookie?: never;
    };
    requestBody: {
      content: {
        "application/json": components["schemas"]["CreateEncouragementRequest"];
      };
    };
    responses: {
      /** @description Success */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": {
            data: components["schemas"]["Encouragement"];
            requestId: string;
            /** Format: date-time */
            serverTime: string;
          };
        };
      };
      /** @description Invalid request */
      400: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiError"];
        };
      };
      /** @description Unauthenticated */
      401: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiError"];
        };
      };
      /** @description Forbidden */
      403: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiError"];
        };
      };
      /** @description Conflict */
      409: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiError"];
        };
      };
      /** @description Rate limited */
      429: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiError"];
        };
      };
    };
  };
  getReminder: {
    parameters: {
      query?: never;
      header?: never;
      path: {
        id: string;
      };
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      /** @description Success */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": {
            data: components["schemas"]["Reminder"];
            requestId: string;
            /** Format: date-time */
            serverTime: string;
          };
        };
      };
      /** @description Invalid request */
      400: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiError"];
        };
      };
      /** @description Unauthenticated */
      401: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiError"];
        };
      };
      /** @description Forbidden */
      403: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiError"];
        };
      };
      /** @description Conflict */
      409: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiError"];
        };
      };
      /** @description Rate limited */
      429: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiError"];
        };
      };
    };
  };
  putReminder: {
    parameters: {
      query?: never;
      header: {
        "Idempotency-Key": string;
        "X-Client-Request-Id": string;
      };
      path: {
        id: string;
      };
      cookie?: never;
    };
    requestBody: {
      content: {
        "application/json": components["schemas"]["PutReminderRequest"];
      };
    };
    responses: {
      /** @description Success */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": {
            data: components["schemas"]["Reminder"];
            requestId: string;
            /** Format: date-time */
            serverTime: string;
          };
        };
      };
      /** @description Invalid request */
      400: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiError"];
        };
      };
      /** @description Unauthenticated */
      401: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiError"];
        };
      };
      /** @description Forbidden */
      403: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiError"];
        };
      };
      /** @description Conflict */
      409: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiError"];
        };
      };
      /** @description Rate limited */
      429: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiError"];
        };
      };
    };
  };
  registerPushToken: {
    parameters: {
      query?: never;
      header: {
        "Idempotency-Key": string;
        "X-Client-Request-Id": string;
      };
      path?: never;
      cookie?: never;
    };
    requestBody: {
      content: {
        "application/json": components["schemas"]["RegisterPushTokenRequest"];
      };
    };
    responses: {
      /** @description Success */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": {
            data: components["schemas"]["PushTokenRegistration"];
            requestId: string;
            /** Format: date-time */
            serverTime: string;
          };
        };
      };
      /** @description Invalid request */
      400: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiError"];
        };
      };
      /** @description Unauthenticated */
      401: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiError"];
        };
      };
      /** @description Forbidden */
      403: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiError"];
        };
      };
      /** @description Conflict */
      409: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiError"];
        };
      };
      /** @description Rate limited */
      429: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiError"];
        };
      };
    };
  };
  getNotificationPreferences: {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      /** @description Success */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": {
            data: components["schemas"]["NotificationPreferences"];
            requestId: string;
            /** Format: date-time */
            serverTime: string;
          };
        };
      };
      /** @description Invalid request */
      400: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiError"];
        };
      };
      /** @description Unauthenticated */
      401: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiError"];
        };
      };
      /** @description Forbidden */
      403: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiError"];
        };
      };
      /** @description Conflict */
      409: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiError"];
        };
      };
      /** @description Rate limited */
      429: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiError"];
        };
      };
    };
  };
  updateNotificationPreferences: {
    parameters: {
      query?: never;
      header: {
        "Idempotency-Key": string;
        "X-Client-Request-Id": string;
      };
      path?: never;
      cookie?: never;
    };
    requestBody: {
      content: {
        "application/json": components["schemas"]["UpdateNotificationPreferencesRequest"];
      };
    };
    responses: {
      /** @description Success */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": {
            data: components["schemas"]["NotificationPreferences"];
            requestId: string;
            /** Format: date-time */
            serverTime: string;
          };
        };
      };
      /** @description Invalid request */
      400: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiError"];
        };
      };
      /** @description Unauthenticated */
      401: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiError"];
        };
      };
      /** @description Forbidden */
      403: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiError"];
        };
      };
      /** @description Conflict */
      409: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiError"];
        };
      };
      /** @description Rate limited */
      429: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiError"];
        };
      };
    };
  };
  getSyncChanges: {
    parameters: {
      query?: {
        cursor?: string;
        limit?: number;
      };
      header?: never;
      path?: never;
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      /** @description Success */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": {
            data: components["schemas"]["SyncChanges"];
            requestId: string;
            /** Format: date-time */
            serverTime: string;
          };
        };
      };
      /** @description Invalid request */
      400: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiError"];
        };
      };
      /** @description Unauthenticated */
      401: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiError"];
        };
      };
      /** @description Forbidden */
      403: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiError"];
        };
      };
      /** @description Conflict */
      409: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiError"];
        };
      };
      /** @description Rate limited */
      429: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiError"];
        };
      };
    };
  };
  ackSync: {
    parameters: {
      query?: never;
      header: {
        "Idempotency-Key": string;
        "X-Client-Request-Id": string;
      };
      path?: never;
      cookie?: never;
    };
    requestBody: {
      content: {
        "application/json": components["schemas"]["SyncAckRequest"];
      };
    };
    responses: {
      /** @description Success */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": {
            data: components["schemas"]["SyncAck"];
            requestId: string;
            /** Format: date-time */
            serverTime: string;
          };
        };
      };
      /** @description Invalid request */
      400: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiError"];
        };
      };
      /** @description Unauthenticated */
      401: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiError"];
        };
      };
      /** @description Forbidden */
      403: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiError"];
        };
      };
      /** @description Conflict */
      409: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiError"];
        };
      };
      /** @description Rate limited */
      429: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiError"];
        };
      };
    };
  };
  listExports: {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      /** @description Success */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiSuccess"];
        };
      };
      /** @description Invalid request */
      400: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiError"];
        };
      };
      /** @description Unauthenticated */
      401: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiError"];
        };
      };
      /** @description Forbidden */
      403: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiError"];
        };
      };
      /** @description Conflict */
      409: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiError"];
        };
      };
      /** @description Rate limited */
      429: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiError"];
        };
      };
    };
  };
  createExport: {
    parameters: {
      query?: never;
      header: {
        "Idempotency-Key": string;
        "X-Client-Request-Id": string;
      };
      path?: never;
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      /** @description Success */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiSuccess"];
        };
      };
      /** @description Invalid request */
      400: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiError"];
        };
      };
      /** @description Unauthenticated */
      401: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiError"];
        };
      };
      /** @description Forbidden */
      403: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiError"];
        };
      };
      /** @description Conflict */
      409: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiError"];
        };
      };
      /** @description Rate limited */
      429: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiError"];
        };
      };
    };
  };
  getExport: {
    parameters: {
      query?: never;
      header?: never;
      path: {
        id: string;
      };
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      /** @description Success */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiSuccess"];
        };
      };
      /** @description Invalid request */
      400: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiError"];
        };
      };
      /** @description Unauthenticated */
      401: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiError"];
        };
      };
      /** @description Forbidden */
      403: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiError"];
        };
      };
      /** @description Conflict */
      409: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiError"];
        };
      };
      /** @description Rate limited */
      429: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiError"];
        };
      };
    };
  };
  getExportDownloadUrl: {
    parameters: {
      query?: never;
      header?: never;
      path: {
        id: string;
      };
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      /** @description Success */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiSuccess"];
        };
      };
      /** @description Invalid request */
      400: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiError"];
        };
      };
      /** @description Unauthenticated */
      401: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiError"];
        };
      };
      /** @description Forbidden */
      403: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiError"];
        };
      };
      /** @description Conflict */
      409: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiError"];
        };
      };
      /** @description Rate limited */
      429: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiError"];
        };
      };
    };
  };
  requestDeletion: {
    parameters: {
      query?: never;
      header: {
        "Idempotency-Key": string;
        "X-Client-Request-Id": string;
      };
      path?: never;
      cookie?: never;
    };
    requestBody: {
      content: {
        "application/json": components["schemas"]["DeletionRequest"];
      };
    };
    responses: {
      /** @description Success */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": {
            data: components["schemas"]["DeletionStatus"];
            requestId: string;
            /** Format: date-time */
            serverTime: string;
          };
        };
      };
      /** @description Invalid request */
      400: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiError"];
        };
      };
      /** @description Unauthenticated */
      401: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiError"];
        };
      };
      /** @description Forbidden */
      403: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiError"];
        };
      };
      /** @description Conflict */
      409: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiError"];
        };
      };
      /** @description Rate limited */
      429: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiError"];
        };
      };
    };
  };
  cancelDeletion: {
    parameters: {
      query?: never;
      header: {
        "Idempotency-Key": string;
        "X-Client-Request-Id": string;
      };
      path?: never;
      cookie?: never;
    };
    requestBody: {
      content: {
        "application/json": components["schemas"]["SmsVerifyRequest"];
      };
    };
    responses: {
      /** @description Success */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": {
            data: components["schemas"]["AuthTokens"];
            requestId: string;
            /** Format: date-time */
            serverTime: string;
          };
        };
      };
      /** @description Invalid request */
      400: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiError"];
        };
      };
      /** @description Unauthenticated */
      401: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiError"];
        };
      };
      /** @description Forbidden */
      403: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiError"];
        };
      };
      /** @description Conflict */
      409: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiError"];
        };
      };
      /** @description Rate limited */
      429: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiError"];
        };
      };
    };
  };
  getDeletionStatus: {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      /** @description Success */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": {
            data: components["schemas"]["DeletionStatus"];
            requestId: string;
            /** Format: date-time */
            serverTime: string;
          };
        };
      };
      /** @description Invalid request */
      400: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiError"];
        };
      };
      /** @description Unauthenticated */
      401: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiError"];
        };
      };
      /** @description Forbidden */
      403: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiError"];
        };
      };
      /** @description Conflict */
      409: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiError"];
        };
      };
      /** @description Rate limited */
      429: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApiError"];
        };
      };
    };
  };
}
