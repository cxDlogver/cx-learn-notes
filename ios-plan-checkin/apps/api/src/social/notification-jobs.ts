import type { PoolClient } from "pg";

export type SocialNotificationEvent =
  | { kind: "friend_request"; requestId: string; recipientId: string }
  | {
      kind: "plan_share";
      planId: string;
      recipientId: string;
      revision: number;
    }
  | { kind: "encouragement"; encouragementId: string; recipientId: string };

/** Queue only identifiers in the business transaction; the worker rechecks visibility. */
export async function enqueueSocialNotification(
  client: PoolClient,
  event: SocialNotificationEvent,
): Promise<void> {
  const dedupe =
    event.kind === "friend_request"
      ? `friend-request:${event.requestId}`
      : event.kind === "plan_share"
        ? `plan-share:${event.planId}:${event.recipientId}:${event.revision}`
        : `encouragement:${event.encouragementId}`;
  await client.query(
    `INSERT INTO worker_jobs(name,payload,dedupe_key)
     VALUES('send-social-notification',$1,$2) ON CONFLICT DO NOTHING`,
    [JSON.stringify(event), dedupe],
  );
}
