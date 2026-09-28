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

async function enqueueWebMessage(
  client: PoolClient,
  messageId: string,
  recipientId: string,
): Promise<void> {
  await client.query(
    `INSERT INTO worker_jobs(name,payload,dedupe_key)
     VALUES('send-web-push',$1,$2) ON CONFLICT DO NOTHING`,
    [
      JSON.stringify({ kind: "social", messageId, recipientId }),
      `inbox:${messageId}`,
    ],
  );
}

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
  if (event.kind === "friend_request") {
    const messages = await client.query<{ id: string }>(
      `INSERT INTO inbox_messages
        (recipient_user_id,event_type,actor_user_id,subject_id,business_event_key)
       SELECT $2,'friend_request',r.sender_id,r.id,$3
       FROM friend_requests r WHERE r.id=$1
       ON CONFLICT (recipient_user_id,business_event_key) DO NOTHING RETURNING id`,
      [event.requestId, event.recipientId, dedupe],
    );
    for (const message of messages.rows)
      await enqueueWebMessage(client, message.id, event.recipientId);
  } else if (event.kind === "plan_share") {
    const messages = await client.query<{ id: string }>(
      `INSERT INTO inbox_messages
        (recipient_user_id,event_type,actor_user_id,subject_id,business_event_key)
       SELECT $2,'share',p.owner_id,p.id,$3
       FROM plans p WHERE p.id=$1
       ON CONFLICT (recipient_user_id,business_event_key) DO NOTHING RETURNING id`,
      [event.planId, event.recipientId, dedupe],
    );
    for (const message of messages.rows)
      await enqueueWebMessage(client, message.id, event.recipientId);
  } else {
    const messages = await client.query<{ id: string }>(
      `INSERT INTO inbox_messages
        (recipient_user_id,event_type,actor_user_id,subject_id,business_event_key)
       SELECT $2,'encouragement',e.sender_id,e.checkin_id,$3
       FROM encouragements e WHERE e.id=$1
       ON CONFLICT (recipient_user_id,business_event_key) DO NOTHING RETURNING id`,
      [event.encouragementId, event.recipientId, dedupe],
    );
    for (const message of messages.rows)
      await enqueueWebMessage(client, message.id, event.recipientId);
  }
}

export async function recordFriendAccepted(
  client: PoolClient,
  requestId: string,
  senderId: string,
  receiverId: string,
): Promise<void> {
  const messages = await client.query<{ id: string }>(
    `INSERT INTO inbox_messages
      (recipient_user_id,event_type,actor_user_id,subject_id,business_event_key)
     VALUES($1,'friend_accepted',$2,$3,$4)
     ON CONFLICT (recipient_user_id,business_event_key) DO NOTHING RETURNING id`,
    [senderId, receiverId, requestId, `friend-accepted:${requestId}`],
  );
  for (const message of messages.rows)
    await enqueueWebMessage(client, message.id, senderId);
}

export async function recordSharedUpdate(
  client: PoolClient,
  ownerId: string,
  planId: string,
  eventKey: string,
): Promise<void> {
  const messages = await client.query<{
    id: string;
    recipient_user_id: string;
  }>(
    `INSERT INTO inbox_messages
      (recipient_user_id,event_type,actor_user_id,subject_id,business_event_key)
     SELECT s.friend_id,'shared_update',$1,$2,$3
     FROM plan_shares s
     JOIN plans p ON p.id=s.plan_id AND p.owner_id=$1 AND p.status<>'deleted'
     JOIN users viewer ON viewer.id=s.friend_id AND viewer.status='active'
     JOIN friendships f ON f.user_low=least($1::uuid,s.friend_id)
       AND f.user_high=greatest($1::uuid,s.friend_id)
     WHERE s.plan_id=$2 AND s.revoked_at IS NULL
       AND NOT EXISTS (SELECT 1 FROM blocks b WHERE
         (b.blocker_id=$1 AND b.blocked_id=s.friend_id) OR
         (b.blocker_id=s.friend_id AND b.blocked_id=$1))
     ON CONFLICT (recipient_user_id,business_event_key) DO NOTHING RETURNING id,recipient_user_id`,
    [ownerId, planId, eventKey],
  );
  for (const message of messages.rows)
    await enqueueWebMessage(client, message.id, message.recipient_user_id);
}
