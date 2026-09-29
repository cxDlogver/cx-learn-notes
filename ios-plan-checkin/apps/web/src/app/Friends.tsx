import { useEffect, useState, type FormEvent } from "react";
import type { FriendRequestsDto, SocialUserDto } from "@plan-checkin/contracts";
import {
  blockUser,
  listFriendRequests,
  listFriends,
  removeFriend,
  respondFriendRequest,
  searchUsers,
  sendFriendRequest,
} from "../data/api";
import { ModalDialog } from "./ModalDialog";

const emptyRequests: FriendRequestsDto = { incoming: [], outgoing: [] };
const person = (user: SocialUserDto) => user.nickname || user.username;
const message = (error: unknown) =>
  error instanceof Error ? error.message : "操作未完成，请稍后重试";

export function FriendsPage({
  onNavigate,
}: {
  onNavigate: (path: string) => void;
}) {
  const [friends, setFriends] = useState<SocialUserDto[]>([]);
  const [requests, setRequests] = useState(emptyRequests);
  const [username, setUsername] = useState("");
  const [results, setResults] = useState<SocialUserDto[]>([]);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [pending, setPending] = useState<{
    action: "remove" | "block";
    user: SocialUserDto;
  } | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function reload() {
    const [nextFriends, nextRequests] = await Promise.all([
      listFriends(),
      listFriendRequests(),
    ]);
    setFriends(nextFriends);
    setRequests(nextRequests);
  }

  useEffect(() => {
    let cancelled = false;
    void Promise.all([listFriends(), listFriendRequests()])
      .then(([nextFriends, nextRequests]) => {
        if (!cancelled) {
          setFriends(nextFriends);
          setRequests(nextRequests);
        }
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

  async function search(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = username.normalize("NFKC").trim();
    if (
      [...value].length < 3 ||
      [...value].length > 30 ||
      !/^[\p{L}\p{N}_]+$/u.test(value)
    ) {
      setError("请输入 3–30 个字母、数字或下划线组成的完整用户名");
      return;
    }
    setBusy("search");
    setError("");
    setNotice("");
    try {
      setResults(await searchUsers(value));
      setSearched(true);
    } catch (caught) {
      setError(message(caught));
    } finally {
      setBusy("");
    }
  }

  async function act(
    key: string,
    work: () => Promise<unknown>,
    success: string,
  ) {
    setBusy(key);
    setError("");
    setNotice("");
    try {
      await work();
      await reload();
      setPending(null);
      setNotice(success);
    } catch (caught) {
      setError(message(caught));
    } finally {
      setBusy("");
    }
  }

  return (
    <section className="content-panel" data-page-key="friends">
      <p className="eyebrow">选择分享的人</p>
      <h1>朋友</h1>
      <p className="muted">
        成为朋友不会自动开放任何计划。每项计划都要单独预览并授权。
      </p>
      {loading && <p role="status">正在读取朋友和申请…</p>}
      {error && (
        <p role="alert" className="form-error">
          {error}
        </p>
      )}
      {notice && (
        <p role="status" className="success-note">
          {notice}
        </p>
      )}
      <section className="social-card" aria-labelledby="find-friend-heading">
        <h2 id="find-friend-heading">查找用户</h2>
        <form
          className="social-search"
          onSubmit={(event) => void search(event)}
        >
          <label htmlFor="friend-username">完整用户名</label>
          <div>
            <input
              id="friend-username"
              value={username}
              onChange={(event) => {
                setUsername(event.target.value);
                setSearched(false);
                setResults([]);
              }}
              autoComplete="off"
            />
            <button
              className="primary-button"
              type="submit"
              disabled={Boolean(busy)}
            >
              查找
            </button>
          </div>
        </form>
        {searched && results.length === 0 && (
          <p className="muted">未找到可添加的用户。</p>
        )}
        {results.map((user) => {
          const isFriend = friends.some((friend) => friend.id === user.id);
          const requested = requests.outgoing.some(
            (request) => request.receiver.id === user.id,
          );
          return (
            <div className="social-person" key={user.id}>
              <div>
                <strong>{person(user)}</strong>
                <span>@{user.username}</span>
              </div>
              {isFriend ? (
                <span>已是朋友</span>
              ) : requested ? (
                <span>申请已发送</span>
              ) : (
                <button
                  type="button"
                  className="secondary-button"
                  disabled={Boolean(busy)}
                  onClick={() =>
                    void act(
                      `request-${user.id}`,
                      () => sendFriendRequest(user.id),
                      "好友申请已发送",
                    )
                  }
                >
                  发送申请
                </button>
              )}
            </div>
          );
        })}
      </section>
      <section className="social-card" aria-labelledby="incoming-heading">
        <h2 id="incoming-heading">收到的申请</h2>
        {requests.incoming.length === 0 && (
          <p className="muted">暂无待处理申请。</p>
        )}
        {requests.incoming.map((request) => (
          <div className="social-person" key={request.id}>
            <div>
              <strong>{person(request.sender)}</strong>
              <span>@{request.sender.username}</span>
            </div>
            <div className="social-actions">
              <button
                type="button"
                className="primary-button"
                disabled={Boolean(busy)}
                onClick={() =>
                  void act(
                    `accept-${request.id}`,
                    () => respondFriendRequest(request.id, "accept"),
                    "已接受好友申请",
                  )
                }
              >
                接受
              </button>
              <button
                type="button"
                className="secondary-button"
                disabled={Boolean(busy)}
                onClick={() =>
                  void act(
                    `reject-${request.id}`,
                    () => respondFriendRequest(request.id, "reject"),
                    "已拒绝申请",
                  )
                }
              >
                拒绝
              </button>
            </div>
          </div>
        ))}
      </section>
      <section className="social-card" aria-labelledby="outgoing-heading">
        <h2 id="outgoing-heading">发出的申请</h2>
        {requests.outgoing.length === 0 && (
          <p className="muted">没有等待对方处理的申请。</p>
        )}
        {requests.outgoing.map((request) => (
          <div className="social-person" key={request.id}>
            <div>
              <strong>{person(request.receiver)}</strong>
              <span>@{request.receiver.username}</span>
            </div>
            <span>等待回应</span>
          </div>
        ))}
      </section>
      <section className="social-card" aria-labelledby="friend-list-heading">
        <h2 id="friend-list-heading" tabIndex={-1}>
          我的朋友
        </h2>
        {friends.length === 0 && (
          <p className="muted">还没有朋友。添加后仍需逐项授权计划。</p>
        )}
        {friends.map((user) => (
          <div className="social-person" key={user.id}>
            <div>
              <strong>{person(user)}</strong>
              <span>@{user.username}</span>
            </div>
            <div className="social-actions">
              <button
                type="button"
                className="text-button"
                onClick={() => onNavigate(`/friends/${user.id}`)}
              >
                查看共享
              </button>
              <button
                type="button"
                className="text-button"
                onClick={() => setPending({ action: "remove", user })}
              >
                删除好友
              </button>
              <button
                type="button"
                className="text-button"
                onClick={() => setPending({ action: "block", user })}
              >
                屏蔽
              </button>
            </div>
          </div>
        ))}
      </section>
      {pending && (
        <ModalDialog
          className="social-card"
          labelledBy="relationship-confirm-heading"
          describedBy="relationship-confirm-description"
          fallbackFocusId="friend-list-heading"
          onClose={() => {
            if (!busy) setPending(null);
          }}
        >
          <h2 id="relationship-confirm-heading">
            确认{pending.action === "block" ? "屏蔽" : "删除好友"}？
          </h2>
          <p id="relationship-confirm-description">
            与 {person(pending.user)} 的相关计划分享会立即撤销。
          </p>
          <div className="social-actions">
            <button
              type="button"
              className="secondary-button"
              onClick={() => setPending(null)}
              disabled={Boolean(busy)}
              data-initial-focus
            >
              返回
            </button>
            <button
              type="button"
              className="primary-button"
              disabled={Boolean(busy)}
              onClick={() =>
                void act(
                  `${pending.action}-${pending.user.id}`,
                  () =>
                    pending.action === "block"
                      ? blockUser(pending.user.id)
                      : removeFriend(pending.user.id),
                  pending.action === "block" ? "已屏蔽用户" : "已删除好友",
                )
              }
            >
              确认{pending.action === "block" ? "屏蔽" : "删除"}
            </button>
          </div>
        </ModalDialog>
      )}
    </section>
  );
}
