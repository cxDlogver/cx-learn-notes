import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { flushSync } from "react-dom";
import type {
  SmsChallengeDto,
  TodayDto,
  UserDto,
  WebSessionDto,
} from "@plan-checkin/contracts";
import {
  ApiError,
  cancelDeletionWeb,
  confirmPhoneChange,
  forgetWebSession,
  getMe,
  getToday,
  logoutWeb,
  requestPhoneChange,
  restoreWebSession,
  saveProfile,
  sendLoginCode,
  subscribeSession,
  verifyLoginCode,
  type PhoneChangeChallenge,
} from "../data/api";
import { PlansPage } from "./Plans";
import { TodayCheckin } from "./TodayCheckin";
import { CalendarPage } from "./Calendar";
import { FriendsPage } from "./Friends";
import { InboxPage } from "./Inbox";
import { FriendSharedPage, SharedPlanPage } from "./SharedPlans";
import {
  cleanupWebPushAfterLogout,
  NotificationSettings,
} from "./NotificationSettings";
import { LivePlanReminder } from "./LivePlanReminder";
import { DataManagement } from "./DataManagement";

const navigation = [
  { href: "/today", label: "今日", icon: "◉" },
  { href: "/plans", label: "计划", icon: "▤" },
  { href: "/calendar", label: "日历", icon: "▦" },
  { href: "/friends", label: "朋友", icon: "♧" },
  { href: "/inbox", label: "消息", icon: "✉" },
  { href: "/settings", label: "设置", icon: "⚙" },
] as const;

function readLocation(): string {
  return `${window.location.pathname}${window.location.search}`;
}

function navigate(path: string, replace = false): void {
  if (replace) window.history.replaceState(null, "", path);
  else window.history.pushState(null, "", path);
  window.dispatchEvent(new PopStateEvent("popstate"));
}

function destination(path: string): string {
  if (
    !path.startsWith("/") ||
    path.startsWith("//") ||
    path.startsWith("/login")
  )
    return "/today";
  return path;
}

function errorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.retryAfterSeconds)
      return `${error.message}，约 ${error.retryAfterSeconds} 秒后重试`;
    return error.message;
  }
  return "操作未完成，请稍后重试";
}

function useServiceReachability(): boolean {
  const [reachable, setReachable] = useState(true);
  useEffect(() => {
    let active = true;
    let pending: AbortController | null = null;
    const probe = async () => {
      pending?.abort();
      const controller = new AbortController();
      pending = controller;
      const timeout = window.setTimeout(() => controller.abort(), 5000);
      try {
        const response = await fetch("/api/v1/health/live", {
          cache: "no-store",
          credentials: "same-origin",
          signal: controller.signal,
        });
        if (active && pending === controller) setReachable(response.ok);
      } catch {
        if (active && pending === controller) setReachable(false);
      } finally {
        window.clearTimeout(timeout);
        if (pending === controller) pending = null;
      }
    };
    const onResume = () => void probe();
    const onVisible = () => {
      if (document.visibilityState === "visible") void probe();
    };
    void probe();
    const interval = window.setInterval(() => void probe(), 30_000);
    window.addEventListener("online", onResume);
    window.addEventListener("offline", onResume);
    window.addEventListener("focus", onResume);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      active = false;
      pending?.abort();
      window.clearInterval(interval);
      window.removeEventListener("online", onResume);
      window.removeEventListener("offline", onResume);
      window.removeEventListener("focus", onResume);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);
  return reachable;
}

function OfflineBanner() {
  const reachable = useServiceReachability();
  if (reachable) return null;
  return (
    <p className="connection-banner" role="alert">
      暂时无法连接计划打卡服务。当前内容可能不是最新，无法保存或下载；恢复连接后请重新核对。
    </p>
  );
}

function AppLink({
  href,
  children,
  className,
}: {
  href: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <a
      href={href}
      className={className}
      onClick={(event) => {
        if (
          event.button !== 0 ||
          event.metaKey ||
          event.ctrlKey ||
          event.shiftKey ||
          event.altKey
        )
          return;
        event.preventDefault();
        navigate(href);
      }}
    >
      {children}
    </a>
  );
}

function LoginPage({
  onSignedIn,
}: {
  onSignedIn: (session: WebSessionDto) => Promise<void>;
}) {
  const [phone, setPhone] = useState("");
  const [purpose, setPurpose] = useState<"login" | "cancel_deletion">(
    new URLSearchParams(window.location.search).get("recovery") === "1"
      ? "cancel_deletion"
      : "login",
  );
  const [code, setCode] = useState("");
  const [challenge, setChallenge] = useState<SmsChallengeDto | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [remaining, setRemaining] = useState(0);

  useEffect(() => {
    if (remaining <= 0) return;
    const timer = window.setInterval(
      () => setRemaining((value) => Math.max(0, value - 1)),
      1000,
    );
    return () => window.clearInterval(timer);
  }, [remaining]);

  async function requestCode() {
    if (!/^1[3-9]\d{9}$/.test(phone)) {
      setError("请输入有效的中国大陆手机号");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const next = await sendLoginCode(phone, purpose);
      setChallenge(next);
      setCode("");
      setRemaining(next.resendAfterSeconds);
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setBusy(false);
    }
  }

  async function verify(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!challenge || !/^\d{6}$/.test(code)) {
      setError("请输入 6 位验证码");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const session =
        purpose === "cancel_deletion"
          ? await cancelDeletionWeb(challenge.challengeId, code)
          : await verifyLoginCode(challenge.challengeId, code);
      await onSignedIn(session);
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main
      className="auth-layout"
      data-page-key={challenge ? "sms-code" : "phone-login"}
    >
      <div className="auth-intro">
        <span className="brand-mark" aria-hidden="true">
          ✓
        </span>
        <p className="eyebrow">把想做的事，慢慢做成</p>
        <h1>计划打卡</h1>
        <p>为每一天留下一点确实发生的进展。</p>
      </div>
      <section className="auth-card" aria-labelledby="auth-title">
        <OfflineBanner />
        {challenge ? (
          <>
            <button
              type="button"
              className="text-button"
              onClick={() => {
                setChallenge(null);
                setError("");
              }}
            >
              ← 修改手机号
            </button>
            <h2 id="auth-title">
              {purpose === "cancel_deletion" ? "撤销注销验证" : "输入验证码"}
            </h2>
            <p className="muted">
              {import.meta.env.DEV
                ? `尾号 ${phone.slice(-4)} 的验证码请求已提交。本地测试若未接入短信网关，请在运行服务的电脑获取验证码。`
                : `验证码已发送至尾号 ${phone.slice(-4)} 的手机`}
            </p>
            <form onSubmit={verify} noValidate>
              <label htmlFor="sms-code">6 位短信验证码</label>
              <input
                id="sms-code"
                name="sms-code"
                type="password"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                pattern="[0-9]{6}"
                value={code}
                onChange={(event) =>
                  setCode(event.target.value.replace(/\D/g, ""))
                }
                aria-invalid={Boolean(error)}
                aria-describedby={error ? "auth-error" : undefined}
                autoFocus
              />
              {error && (
                <p className="form-error" id="auth-error" role="alert">
                  {error}
                </p>
              )}
              <button
                type="submit"
                className="primary-button"
                disabled={busy || code.length !== 6}
              >
                {busy
                  ? "正在验证…"
                  : purpose === "cancel_deletion"
                    ? "撤销注销并登录"
                    : "登录或注册"}
              </button>
            </form>
            <button
              type="button"
              className="text-button resend"
              disabled={busy || remaining > 0}
              onClick={() => void requestCode()}
            >
              {remaining > 0 ? `${remaining} 秒后可重新发送` : "重新发送验证码"}
            </button>
          </>
        ) : (
          <>
            <h2 id="auth-title">
              {purpose === "cancel_deletion" ? "撤销账号注销" : "手机号登录"}
            </h2>
            <p className="muted">
              {purpose === "cancel_deletion"
                ? "请使用原手机号。仅在 30 天撤销期内可恢复账号；已有分享权限不会自动恢复。"
                : "新用户验证后即可创建账号，无需邀请码。"}
            </p>
            <form
              onSubmit={(event) => {
                event.preventDefault();
                void requestCode();
              }}
              noValidate
            >
              <label htmlFor="phone">中国大陆手机号</label>
              <div className="phone-field">
                <span aria-hidden="true">+86</span>
                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel-national"
                  maxLength={11}
                  value={phone}
                  onChange={(event) =>
                    setPhone(event.target.value.replace(/\D/g, ""))
                  }
                  placeholder="请输入 11 位手机号"
                  aria-invalid={Boolean(error)}
                  aria-describedby={error ? "auth-error" : undefined}
                />
              </div>
              {error && (
                <p className="form-error" id="auth-error" role="alert">
                  {error}
                </p>
              )}
              <button
                type="submit"
                className="primary-button"
                disabled={busy || phone.length !== 11}
              >
                {busy ? "正在发送…" : "获取验证码"}
              </button>
              {import.meta.env.DEV && (
                <p className="muted">
                  本地测试若未接入短信网关，验证码不会发送到手机。
                </p>
              )}
            </form>
            <button
              type="button"
              className="text-button"
              onClick={() => {
                setPurpose(purpose === "login" ? "cancel_deletion" : "login");
                setChallenge(null);
                setCode("");
                setError("");
                setRemaining(0);
              }}
            >
              {purpose === "login"
                ? "已申请注销？撤销账号注销"
                : "返回普通登录"}
            </button>
          </>
        )}
      </section>
    </main>
  );
}

function SetupPage({
  profile,
  onSaved,
}: {
  profile: UserDto;
  onSaved: (user: UserDto) => void;
}) {
  const [username, setUsername] = useState(profile.username ?? "");
  const [nickname, setNickname] = useState(profile.nickname ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalized = username.normalize("NFKC").trim();
    if (
      [...normalized].length < 3 ||
      [...normalized].length > 30 ||
      !/^[\p{L}\p{N}_]+$/u.test(normalized)
    ) {
      setError("用户名需为 3–30 个字母、数字或下划线");
      return;
    }
    if (nickname.trim().length < 1 || nickname.trim().length > 40) {
      setError("昵称需为 1–40 个字符");
      return;
    }
    setBusy(true);
    setError("");
    try {
      onSaved(await saveProfile(normalized, nickname.trim(), profile.revision));
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="auth-layout" data-page-key="profile-setup">
      <div className="auth-intro">
        <span className="brand-mark" aria-hidden="true">
          ✓
        </span>
        <p className="eyebrow">欢迎加入</p>
        <h1>从一个称呼开始</h1>
        <p>完善资料后，就能为自己创建第一个计划。</p>
      </div>
      <section className="auth-card" aria-labelledby="setup-title">
        <h2 id="setup-title">设置个人资料</h2>
        <form onSubmit={submit} noValidate>
          <label htmlFor="username">用户名</label>
          <input
            id="username"
            autoComplete="username"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            aria-invalid={Boolean(error)}
          />
          <p className="hint">3–30 个字母、数字或下划线，设置后不可修改。</p>
          <label htmlFor="nickname">昵称</label>
          <input
            id="nickname"
            value={nickname}
            onChange={(event) => setNickname(event.target.value)}
            aria-invalid={Boolean(error)}
          />
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          <button type="submit" className="primary-button" disabled={busy}>
            {busy ? "正在保存…" : "开始使用"}
          </button>
        </form>
      </section>
    </main>
  );
}

function PendingPage({ page }: { page: string }) {
  const names: Record<string, string> = {
    today: "今日",
    plans: "计划",
    calendar: "日历",
    friends: "朋友",
    inbox: "消息",
    settings: "设置",
  };
  const label = names[page] ?? "页面";
  return (
    <section className="content-panel" data-page-key={page}>
      <p className="eyebrow">计划打卡</p>
      <h1>{label}</h1>
      <div className="empty-card" role="status">
        <span className="empty-icon" aria-hidden="true">
          ◌
        </span>
        <h2>{label}页面正在建设</h2>
        <p>
          登录和资料设置已经接入；此页面的数据和操作将在对应任务完成后开放。
        </p>
      </div>
    </section>
  );
}

function TodayPage() {
  const [today, setToday] = useState<TodayDto | null>(null);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let cancelled = false;
    void getToday()
      .then((result) => {
        if (!cancelled) setToday(result);
      })
      .catch((caught: unknown) => {
        if (!cancelled) setError(errorMessage(caught));
      });
    return () => {
      cancelled = true;
    };
  }, [attempt]);
  return (
    <section className="content-panel" data-page-key="today">
      <p className="eyebrow">每一天，都算数</p>
      <h1>今日</h1>
      {!today && !error && <p role="status">正在读取今日计划…</p>}
      {error && (
        <div className="empty-card" role="alert">
          <h2>暂时无法读取今日计划</h2>
          <p>{error}</p>
          <button
            className="secondary-button"
            type="button"
            onClick={() => {
              setError("");
              setAttempt((value) => value + 1);
            }}
          >
            重试
          </button>
        </div>
      )}
      {today && today.items.length === 0 && (
        <div className="empty-card" role="status">
          <span className="empty-icon" aria-hidden="true">
            ◌
          </span>
          <h2>还没有今日计划</h2>
          <p>从一个想坚持的小目标开始。</p>
          <AppLink href="/plans/new" className="action-link">
            创建计划
          </AppLink>
        </div>
      )}
      {today && today.items.length > 0 && (
        <div className="today-list" aria-label="今日计划">
          {today.items.map((item) => (
            <article className="today-card" key={item.plan.id}>
              <div>
                <p className="eyebrow">
                  {item.plan.kind === "one_time" ? "一次性任务" : "循环计划"}
                </p>
                <h2>{item.plan.title}</h2>
                <p>{item.status === "pending" ? "待完成" : "查看详情与记录"}</p>
              </div>
              <TodayCheckin
                item={item}
                onSaved={() => setAttempt((value) => value + 1)}
              />
              <AppLink href={`/plans/${item.plan.id}`} className="action-link">
                查看计划
              </AppLink>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function ChangePhonePage({ onChanged }: { onChanged: () => void }) {
  const [phone, setPhone] = useState("");
  const [oldCode, setOldCode] = useState("");
  const [newCode, setNewCode] = useState("");
  const [challenge, setChallenge] = useState<PhoneChangeChallenge | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function request(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!/^1[3-9]\d{9}$/.test(phone)) {
      setError("请输入有效的新手机号");
      return;
    }
    setBusy(true);
    setError("");
    try {
      setChallenge(await requestPhoneChange(phone));
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setBusy(false);
    }
  }

  async function confirm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!challenge || !/^\d{6}$/.test(oldCode) || !/^\d{6}$/.test(newCode)) {
      setError("请分别输入旧号和新号收到的 6 位验证码");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await confirmPhoneChange(challenge.requestId, oldCode, newCode);
      try {
        await logoutWeb();
      } finally {
        forgetWebSession();
      }
      onChanged();
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="content-panel" data-page-key="change-phone">
      <p className="eyebrow">账户安全</p>
      <h1>更换手机号</h1>
      <div className="settings-card phone-change-card">
        <p>需要同时验证当前手机号和新手机号。成功后所有设备须重新登录。</p>
        {!challenge ? (
          <form onSubmit={request} noValidate>
            <label htmlFor="new-phone">新手机号</label>
            <input
              id="new-phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel-national"
              maxLength={11}
              value={phone}
              onChange={(event) =>
                setPhone(event.target.value.replace(/\D/g, ""))
              }
              aria-invalid={Boolean(error)}
            />
            {error && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}
            <button
              className="primary-button"
              type="submit"
              disabled={busy || phone.length !== 11}
            >
              {busy ? "正在发送…" : "向两个号码发送验证码"}
            </button>
          </form>
        ) : (
          <form onSubmit={confirm} noValidate>
            <p>当前号码：{challenge.oldMasked}</p>
            <p>新号码：{challenge.newMasked}</p>
            <label htmlFor="old-phone-code">当前号码收到的验证码</label>
            <input
              id="old-phone-code"
              type="password"
              inputMode="numeric"
              autoComplete="off"
              maxLength={6}
              value={oldCode}
              onChange={(event) =>
                setOldCode(event.target.value.replace(/\D/g, ""))
              }
            />
            <label htmlFor="new-phone-code">新号码收到的验证码</label>
            <input
              id="new-phone-code"
              type="password"
              inputMode="numeric"
              autoComplete="off"
              maxLength={6}
              value={newCode}
              onChange={(event) =>
                setNewCode(event.target.value.replace(/\D/g, ""))
              }
            />
            {error && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}
            <button
              className="primary-button"
              type="submit"
              disabled={busy || oldCode.length !== 6 || newCode.length !== 6}
            >
              {busy ? "正在确认…" : "确认更换并重新登录"}
            </button>
          </form>
        )}
        <AppLink href="/settings" className="text-button">
          返回设置
        </AppLink>
      </div>
    </section>
  );
}

function Shell({
  path,
  profile,
  onLoggedOut,
}: {
  path: string;
  profile: UserDto;
  onLoggedOut: (nextPath?: string) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const page = path.split("?")[0]?.split("/")[1] || "today";
  const routeId = path.split("?")[0]?.split("/")[2] ?? "";
  const selected = navigation.some((item) => item.href === `/${page}`)
    ? page
    : page === "shared-plans"
      ? ""
      : "today";
  async function logout() {
    setBusy(true);
    setError("");
    try {
      await cleanupWebPushAfterLogout();
      await logoutWeb();
      onLoggedOut();
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="app-layout">
      <aside className="sidebar" aria-label="主导航">
        <AppLink href="/today" className="sidebar-brand">
          <span className="brand-mark">✓</span>
          <span>计划打卡</span>
        </AppLink>
        <nav aria-label="主导航" className="side-links">
          {navigation.map((item) => (
            <AppLink
              key={item.href}
              href={item.href}
              className={
                selected === item.href.slice(1)
                  ? "side-link active"
                  : "side-link"
              }
            >
              <span aria-hidden="true">{item.icon}</span>
              {item.label}
            </AppLink>
          ))}
        </nav>
        <div className="side-account">
          <strong>{profile.nickname ?? profile.username}</strong>
          <span>@{profile.username}</span>
        </div>
      </aside>
      <main className="workspace">
        <header className="topbar">
          <span className="mobile-brand">计划打卡</span>
          <span>你好，{profile.nickname ?? profile.username}</span>
        </header>
        <OfflineBanner />
        <LivePlanReminder onNavigate={navigate} />
        {error && (
          <p role="alert" className="form-error">
            {error}
          </p>
        )}
        {selected === "settings" ? (
          path.startsWith("/settings/change-phone") ? (
            <ChangePhonePage
              onChanged={() => {
                onLoggedOut();
              }}
            />
          ) : (
            <section className="content-panel" data-page-key="settings">
              <p className="eyebrow">账户</p>
              <h1>设置</h1>
              <div className="settings-card">
                <p>
                  已登录为{" "}
                  <strong>{profile.nickname ?? profile.username}</strong>
                </p>
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => void logout()}
                  disabled={busy}
                >
                  {busy ? "正在退出…" : "退出登录"}
                </button>
                <AppLink href="/settings/change-phone" className="text-button">
                  更换手机号
                </AppLink>
              </div>
              <NotificationSettings />
              <DataManagement
                onDeleted={() => onLoggedOut("/login?recovery=1")}
              />
            </section>
          )
        ) : page === "shared-plans" && routeId ? (
          <SharedPlanPage planId={routeId} path={path} onNavigate={navigate} />
        ) : selected === "today" ? (
          <TodayPage />
        ) : selected === "plans" ? (
          <PlansPage path={path} onNavigate={navigate} />
        ) : selected === "calendar" ? (
          <CalendarPage path={path} onNavigate={navigate} />
        ) : selected === "friends" ? (
          routeId ? (
            <FriendSharedPage friendId={routeId} onNavigate={navigate} />
          ) : (
            <FriendsPage onNavigate={navigate} />
          )
        ) : selected === "inbox" ? (
          <InboxPage onNavigate={navigate} />
        ) : (
          <PendingPage page={selected} />
        )}
      </main>
      <nav className="bottom-nav" aria-label="手机主导航">
        {navigation.map((item) => (
          <AppLink
            key={item.href}
            href={item.href}
            className={
              selected === item.href.slice(1)
                ? "bottom-link active"
                : "bottom-link"
            }
          >
            <span aria-hidden="true">{item.icon}</span>
            <span>{item.label}</span>
          </AppLink>
        ))}
      </nav>
    </div>
  );
}

export function App() {
  const [path, setPath] = useState(readLocation);
  const [session, setSession] = useState<WebSessionDto | null>(null);
  const [profile, setProfile] = useState<UserDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const onLocation = () => setPath(readLocation());
    window.addEventListener("popstate", onLocation);
    const unsubscribe = subscribeSession((next) => {
      setSession(next);
      if (!next) setProfile(null);
    });
    let cancelled = false;
    let loadRevision = 0;
    async function loadSession(force = false) {
      const revision = ++loadRevision;
      setError("");
      try {
        const restored = await restoreWebSession(force);
        if (restored) {
          const user = await getMe();
          if (cancelled || revision !== loadRevision) return;
          setProfile(user);
          if (!user.username) navigate("/setup", true);
        }
      } catch (caught) {
        if (!cancelled && revision === loadRevision)
          setError(errorMessage(caught));
      } finally {
        if (!cancelled && revision === loadRevision) setLoading(false);
      }
    }
    const onPageHide = () => {
      loadRevision++;
      // Clear the private DOM before the browser stores this page in BFCache.
      flushSync(() => {
        setProfile(null);
        setError("");
        setLoading(true);
      });
    };
    const onPageShow = (event: PageTransitionEvent) => {
      if (event.persisted) void loadSession(true);
    };
    window.addEventListener("pagehide", onPageHide);
    window.addEventListener("pageshow", onPageShow);
    void loadSession();
    return () => {
      cancelled = true;
      loadRevision++;
      unsubscribe();
      window.removeEventListener("popstate", onLocation);
      window.removeEventListener("pagehide", onPageHide);
      window.removeEventListener("pageshow", onPageShow);
    };
  }, []);

  useEffect(() => {
    if (loading) return;
    if (!session && !path.startsWith("/login"))
      navigate(`/login?next=${encodeURIComponent(destination(path))}`, true);
    else if (session && profile && !profile.username && path !== "/setup")
      navigate("/setup", true);
    else if (
      session &&
      profile?.username &&
      (path === "/setup" || path.startsWith("/login"))
    ) {
      const next =
        new URLSearchParams(window.location.search).get("next") ?? "/today";
      navigate(destination(next), true);
    }
  }, [loading, path, profile, session]);

  async function onSignedIn(next: WebSessionDto) {
    setProfile(null);
    setSession(next);
    const user = await getMe();
    setProfile(user);
    if (!user.username) navigate("/setup", true);
    else {
      const nextPath =
        new URLSearchParams(window.location.search).get("next") ?? "/today";
      navigate(destination(nextPath), true);
    }
  }

  if (loading)
    return (
      <main className="loading-screen" role="status">
        正在恢复会话…
      </main>
    );
  if (error && !profile)
    return (
      <main className="loading-screen" role="alert">
        <p>{error}</p>
        <button type="button" onClick={() => window.location.reload()}>
          重试
        </button>
      </main>
    );
  if (!session || path.startsWith("/login"))
    return <LoginPage onSignedIn={onSignedIn} />;
  if (!profile)
    return (
      <main className="loading-screen" role="status">
        正在读取资料…
      </main>
    );
  if (!profile.username || path === "/setup")
    return (
      <SetupPage
        profile={profile}
        onSaved={(user) => {
          setProfile(user);
          navigate("/today", true);
        }}
      />
    );
  return (
    <Shell
      path={path}
      profile={profile}
      onLoggedOut={(nextPath) => {
        setProfile(null);
        navigate(nextPath ?? "/login", true);
      }}
    />
  );
}
