import { useEffect, useState } from "react";
import type {
  EncouragementDto,
  SharedHistoryDto,
  SharedPlanDto,
  SocialUserDto,
} from "@plan-checkin/contracts";
import {
  createEncouragement,
  getSharedHistory,
  listEncouragements,
  listFriendSharedPlans,
  listFriends,
} from "../data/api";

const message = (error: unknown) =>
  error instanceof Error ? error.message : "共享内容暂时无法读取";

function Encouragements({ checkinId }: { checkinId: string }) {
  const [items, setItems] = useState<EncouragementDto[]>([]);
  const [body, setBody] = useState("");
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function reveal() {
    setOpen(true);
    setError("");
    try {
      setItems(await listEncouragements(checkinId));
    } catch (caught) {
      setError(message(caught));
    }
  }

  async function send(kind: "emoji" | "message") {
    const value = kind === "emoji" ? "👍" : body.trim();
    if (!value || busy) return;
    setBusy(true);
    setError("");
    try {
      await createEncouragement(checkinId, kind, value);
      setItems(await listEncouragements(checkinId));
      setBody("");
    } catch (caught) {
      setError(message(caught));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="encouragements">
      {!open ? (
        <button
          type="button"
          className="text-button"
          onClick={() => void reveal()}
        >
          鼓励和留言
        </button>
      ) : (
        <>
          <h4>鼓励和留言</h4>
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          {items.length === 0 && <p className="muted">还没有互动。</p>}
          <ul>
            {items.map((item) => (
              <li key={item.id}>
                {item.sender.nickname || item.sender.username}：{item.body}
              </li>
            ))}
          </ul>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              void send("message");
            }}
          >
            <label htmlFor={`encourage-${checkinId}`}>写一句鼓励</label>
            <textarea
              id={`encourage-${checkinId}`}
              value={body}
              onChange={(event) => setBody(event.target.value)}
              maxLength={500}
            />
            <div className="social-actions">
              <button
                type="submit"
                className="primary-button"
                disabled={busy || !body.trim()}
              >
                发送留言
              </button>
              <button
                type="button"
                className="secondary-button"
                disabled={busy}
                onClick={() => void send("emoji")}
              >
                发送 👍
              </button>
            </div>
          </form>
        </>
      )}
    </div>
  );
}

export function FriendSharedPage({
  friendId,
  onNavigate,
}: {
  friendId: string;
  onNavigate: (path: string) => void;
}) {
  const [friend, setFriend] = useState<SocialUserDto | null>(null);
  const [plans, setPlans] = useState<SharedPlanDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    let cancelled = false;
    void Promise.all([listFriends(), listFriendSharedPlans(friendId)])
      .then(([friends, shared]) => {
        if (!cancelled) {
          setFriend(friends.find((item) => item.id === friendId) ?? null);
          setPlans(shared);
        }
      })
      .catch((caught: unknown) => {
        if (!cancelled) {
          setPlans([]);
          setError(message(caught));
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [friendId]);
  return (
    <section className="content-panel" data-page-key="friend-shared-plans">
      <button
        type="button"
        className="text-button"
        onClick={() => onNavigate("/friends")}
      >
        ← 返回朋友
      </button>
      <h1>
        {friend
          ? `${friend.nickname || friend.username} 的共享计划`
          : "共享计划"}
      </h1>
      <p className="muted">
        好友关系不会自动开放计划，只显示主人单独授权的项目。
      </p>
      {loading && <p role="status">正在核对分享授权…</p>}
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      {!loading && !error && plans.length === 0 && (
        <div className="empty-card">
          <h2>暂无共享计划</h2>
          <p>对方还没有向你授权任何计划。</p>
        </div>
      )}
      {plans.map((plan) => (
        <div className="social-card" key={plan.id}>
          <h2>{plan.title}</h2>
          <p>
            {plan.timezone} ·{" "}
            {plan.kind === "weekly"
              ? "周目标"
              : plan.kind === "fixed"
                ? "固定星期"
                : "一次性任务"}{" "}
            · 只读
          </p>
          <button
            type="button"
            className="text-button"
            onClick={() => onNavigate(`/shared-plans/${plan.id}`)}
          >
            查看共享历史
          </button>
        </div>
      ))}
    </section>
  );
}

export function SharedPlanPage({
  planId,
  path,
  onNavigate,
}: {
  planId: string;
  path: string;
  onNavigate: (path: string) => void;
}) {
  const requestedMonth = new URLSearchParams(path.split("?")[1] ?? "").get(
    "month",
  );
  const month =
    requestedMonth && /^\d{4}-(0[1-9]|1[0-2])$/.test(requestedMonth)
      ? requestedMonth
      : null;
  const [history, setHistory] = useState<SharedHistoryDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    void getSharedHistory(planId, month ?? undefined)
      .then((value) => {
        if (!cancelled) setHistory(value);
      })
      .catch((caught: unknown) => {
        if (!cancelled) {
          setHistory(null);
          setError(message(caught));
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [planId, month, attempt]);

  return (
    <section className="content-panel" data-page-key="shared-plan-detail">
      <button
        type="button"
        className="text-button"
        onClick={() => onNavigate("/friends")}
      >
        ← 返回朋友
      </button>
      <h1>{history?.plan.title ?? "共享计划"}</h1>
      <p className="muted">主人授权的只读视图。照片、数值和私人统计不显示。</p>
      <div className="social-actions">
        <label htmlFor="shared-month">月份</label>
        <input
          id="shared-month"
          type="month"
          value={month ?? history?.month ?? ""}
          onChange={(event) =>
            onNavigate(`/shared-plans/${planId}?month=${event.target.value}`)
          }
        />
        <button
          type="button"
          className="secondary-button"
          onClick={() => setAttempt((value) => value + 1)}
        >
          刷新授权和历史
        </button>
      </div>
      {loading && <p role="status">正在核对当前授权和历史…</p>}
      {error && (
        <div className="empty-card" role="alert">
          <h2>无法查看这项计划</h2>
          <p>分享可能已撤销，或你没有访问权限。{error}</p>
        </div>
      )}
      {history && !loading && (
        <>
          <div className="social-card">
            <p>
              主人：{history.plan.owner.nickname || history.plan.owner.username}
            </p>
            <p>
              计划时区：{history.plan.timezone} · 状态：{history.plan.lifecycle}{" "}
              · 规则 V{history.plan.ruleVersion}
            </p>
            <p>
              可见月份：{history.earliestMonth} 至 {history.latestMonth}
            </p>
          </div>
          <div className="social-card">
            <h2>{history.month} 的历史</h2>
            {history.entries.length === 0 && (
              <p className="muted">本月暂无可见记录。</p>
            )}
            <ul className="share-entry-list">
              {history.entries.map((entry) => (
                <li key={`${entry.businessDate}-${entry.checkinId ?? "due"}`}>
                  <strong>
                    {entry.businessDate} · {entry.status}
                  </strong>
                  <p>
                    规则 V{entry.ruleVersion}
                    {entry.isBackfilled ? " · 补记" : ""}
                    {entry.isRevised ? " · 已修正" : ""}
                  </p>
                  {entry.note && <p>{entry.note}</p>}
                  {entry.failureReason && <p>{entry.failureReason}</p>}
                  {entry.checkinId && (
                    <Encouragements checkinId={entry.checkinId} />
                  )}
                </li>
              ))}
            </ul>
          </div>
        </>
      )}
    </section>
  );
}
