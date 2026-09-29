import { useEffect, useState } from "react";
import type { InboxMessageDto, InboxPageDto } from "@plan-checkin/contracts";
import { listInbox, markInboxRead } from "../data/api";

const labels: Record<InboxMessageDto["eventType"], string> = {
  friend_request: "收到好友申请",
  friend_accepted: "好友申请已接受",
  share: "收到计划分享",
  shared_update: "共享计划有新进展",
  encouragement: "收到鼓励",
};
const message = (error: unknown) =>
  error instanceof Error ? error.message : "消息暂时无法读取";

export function InboxPage({
  onNavigate,
}: {
  onNavigate: (path: string) => void;
}) {
  const [items, setItems] = useState<InboxMessageDto[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");

  function applyPage(page: InboxPageDto, append: boolean) {
    setItems((current) =>
      append ? [...current, ...page.messages] : page.messages,
    );
    setNextCursor(page.hasMore ? page.nextCursor : null);
    setUnreadCount(page.unreadCount);
  }

  useEffect(() => {
    let cancelled = false;
    void listInbox()
      .then((page) => {
        if (!cancelled) applyPage(page, false);
      })
      .catch((caught: unknown) => {
        if (!cancelled) setError(message(caught));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function refresh() {
    setBusy("refresh");
    setError("");
    try {
      applyPage(await listInbox(), false);
    } catch (caught) {
      setError(message(caught));
    } finally {
      setBusy("");
    }
  }

  async function loadMore() {
    if (!nextCursor) return;
    setBusy("more");
    setError("");
    try {
      applyPage(await listInbox(nextCursor), true);
    } catch (caught) {
      setError(message(caught));
    } finally {
      setBusy("");
    }
  }

  async function open(item: InboxMessageDto) {
    if (!item.canOpen) return;
    setBusy(item.id);
    setError("");
    try {
      if (!item.readAt) {
        const updated = await markInboxRead(item.id);
        setItems((current) =>
          current.map((entry) =>
            entry.id === item.id ? { ...entry, readAt: updated.readAt } : entry,
          ),
        );
        setUnreadCount((count) => Math.max(0, count - 1));
      }
      if (item.eventType === "share" || item.eventType === "shared_update") {
        if (item.subjectId) onNavigate(`/shared-plans/${item.subjectId}`);
      } else if (item.eventType === "encouragement") onNavigate("/plans");
      else onNavigate("/friends");
    } catch (caught) {
      setError(message(caught));
    } finally {
      setBusy("");
    }
  }

  async function markReadOnly(item: InboxMessageDto) {
    if (item.readAt) return;
    setBusy(item.id);
    setError("");
    try {
      const updated = await markInboxRead(item.id);
      setItems((current) =>
        current.map((entry) =>
          entry.id === item.id ? { ...entry, readAt: updated.readAt } : entry,
        ),
      );
      setUnreadCount((count) => Math.max(0, count - 1));
    } catch (caught) {
      setError(message(caught));
    } finally {
      setBusy("");
    }
  }

  return (
    <section className="content-panel" data-page-key="inbox">
      <p className="eyebrow">可回看的互动</p>
      <h1>消息</h1>
      <div className="inbox-toolbar">
        <p>未读 {unreadCount} 条</p>
        <button
          type="button"
          className="secondary-button"
          disabled={Boolean(busy)}
          onClick={() => void refresh()}
        >
          刷新
        </button>
      </div>
      {loading && <p role="status">正在读取消息…</p>}
      {error && (
        <p role="alert" className="form-error">
          {error}
        </p>
      )}
      {!loading && items.length === 0 && (
        <div className="empty-card">
          <h2>暂无消息</h2>
          <p>好友申请、分享和留言会保留在这里。</p>
        </div>
      )}
      <ul className="inbox-list">
        {items.map((item) => (
          <li
            key={item.id}
            className={item.readAt ? "inbox-item" : "inbox-item unread"}
          >
            <div>
              <strong>{labels[item.eventType]}</strong>
              <time dateTime={item.createdAt}>
                {new Intl.DateTimeFormat("zh-CN", {
                  dateStyle: "medium",
                  timeStyle: "short",
                }).format(new Date(item.createdAt))}
              </time>
              <span>{item.readAt ? "已读" : "未读"}</span>
            </div>
            <div className="social-actions">
              {item.canOpen ? (
                <button
                  type="button"
                  className="text-button"
                  disabled={Boolean(busy)}
                  onClick={() => void open(item)}
                >
                  查看
                </button>
              ) : (
                <span className="muted">相关内容已不可访问</span>
              )}
              {!item.readAt && (
                <button
                  type="button"
                  className="text-button"
                  disabled={Boolean(busy)}
                  onClick={() => void markReadOnly(item)}
                >
                  标记已读
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>
      {nextCursor && (
        <button
          type="button"
          className="secondary-button"
          disabled={Boolean(busy)}
          onClick={() => void loadMore()}
        >
          {busy === "more" ? "正在读取…" : "加载更多"}
        </button>
      )}
    </section>
  );
}
