import { useEffect, useState } from "react";
import type {
  WebNotificationPreferencesDto,
  WebPushConfigDto,
} from "@plan-checkin/contracts";
import {
  getWebNotificationPreferences,
  getWebPushConfig,
  getWebPushSubscription,
  registerWebPushSubscription,
  removeWebPushSubscription,
  updateWebNotificationPreferences,
} from "../data/api";

const supportsPush = () =>
  window.isSecureContext &&
  "serviceWorker" in navigator &&
  "PushManager" in window &&
  "Notification" in window;

function base64urlBytes(value: string): Uint8Array<ArrayBuffer> {
  const padded = value
    .replace(/-/g, "+")
    .replace(/_/g, "/")
    .padEnd(Math.ceil(value.length / 4) * 4, "=");
  const binary = window.atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1)
    bytes[index] = binary.charCodeAt(index);
  return bytes;
}

function base64urlKey(value: ArrayBuffer | null): string {
  if (!value) throw new Error("浏览器未提供完整的推送订阅密钥");
  const bytes = new Uint8Array(value);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return window
    .btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function message(error: unknown): string {
  return error instanceof Error ? error.message : "通知设置未能保存，请重试";
}

export async function cleanupWebPushAfterLogout(): Promise<void> {
  if (!supportsPush()) return;
  try {
    await removeWebPushSubscription();
  } catch {
    // Logout still revokes the Web session, which makes server delivery ineligible.
  }
  try {
    const registration = await navigator.serviceWorker.getRegistration("/");
    const subscription = await registration?.pushManager.getSubscription();
    await subscription?.unsubscribe();
  } catch {
    // Browser cleanup is best effort during logout.
  }
}

export function NotificationSettings() {
  const [preferences, setPreferences] =
    useState<WebNotificationPreferencesDto | null>(null);
  const [config, setConfig] = useState<WebPushConfigDto | null>(null);
  const [permission, setPermission] = useState<
    NotificationPermission | "unsupported"
  >(supportsPush() ? Notification.permission : "unsupported");
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const [nextPreferences, nextConfig, serverSubscription] =
          await Promise.all([
            getWebNotificationPreferences(),
            getWebPushConfig(),
            getWebPushSubscription(),
          ]);
        const registration = supportsPush()
          ? await navigator.serviceWorker.getRegistration("/")
          : null;
        const subscription = await registration?.pushManager.getSubscription();
        if (cancelled) return;
        setPreferences(nextPreferences);
        setConfig(nextConfig);
        setSubscribed(Boolean(subscription) && serverSubscription.registered);
      } catch (caught) {
        if (!cancelled) setError(message(caught));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function changePreference(
    field:
      "planEnabled" | "friendRequests" | "sharedUpdates" | "encouragements",
    enabled: boolean,
  ) {
    if (!preferences || busy) return;
    setBusy(field);
    setError("");
    setNotice("");
    try {
      setPreferences(
        await updateWebNotificationPreferences({
          baseRevision: preferences.revision,
          [field]: enabled,
        }),
      );
      window.dispatchEvent(new Event("web-notification-preferences-changed"));
      setNotice("Web 端提醒设置已保存，不影响 iOS 端开关。");
    } catch (caught) {
      setError(message(caught));
    } finally {
      setBusy("");
    }
  }

  async function enablePush() {
    if (!supportsPush() || !config?.available || !config.publicKey || busy)
      return;
    setBusy("subscribe");
    setError("");
    setNotice("");
    try {
      // This call starts directly from the click handler and retains the user gesture.
      const nextPermission = await Notification.requestPermission();
      setPermission(nextPermission);
      if (nextPermission !== "granted") {
        setNotice("浏览器通知未获授权。站内消息和今日待处理仍可使用。");
        return;
      }
      const registration = await navigator.serviceWorker.register(
        "/notification-sw.js",
        { scope: "/" },
      );
      const existing = await registration.pushManager.getSubscription();
      const subscription =
        existing ??
        (await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: base64urlBytes(config.publicKey),
        }));
      await registerWebPushSubscription({
        endpoint: subscription.endpoint,
        expirationTime:
          subscription.expirationTime === null
            ? null
            : new Date(subscription.expirationTime).toISOString(),
        keys: {
          p256dh: base64urlKey(subscription.getKey("p256dh")),
          auth: base64urlKey(subscription.getKey("auth")),
        },
      });
      setSubscribed(true);
      setNotice("已为当前浏览器开启通知。后台送达取决于浏览器和系统状态。");
    } catch (caught) {
      setError(message(caught));
    } finally {
      setBusy("");
    }
  }

  async function disablePush() {
    if (busy) return;
    setBusy("unsubscribe");
    setError("");
    setNotice("");
    try {
      await removeWebPushSubscription();
      const registration = await navigator.serviceWorker.getRegistration("/");
      const subscription = await registration?.pushManager.getSubscription();
      await subscription?.unsubscribe();
      setSubscribed(false);
      setNotice("当前浏览器的通知订阅已关闭。站内消息仍会保留。");
    } catch (caught) {
      setError(message(caught));
    } finally {
      setBusy("");
    }
  }

  const toggles = [
    { field: "planEnabled", label: "计划提醒" },
    { field: "friendRequests", label: "好友申请" },
    { field: "sharedUpdates", label: "共享计划动态" },
    { field: "encouragements", label: "鼓励与留言" },
  ] as const;

  return (
    <section
      className="social-card notification-settings"
      data-page-key="notification-settings"
      aria-labelledby="notification-settings-heading"
    >
      <h2 id="notification-settings-heading">提醒与通知</h2>
      <p>计划提醒时间和星期在 Web 与 iOS 间共享；以下接收开关仅影响 Web。</p>
      {loading && <p role="status">正在读取提醒设置…</p>}
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      {notice && (
        <p className="success-note" role="status">
          {notice}
        </p>
      )}
      {preferences && (
        <fieldset className="notification-toggles" disabled={Boolean(busy)}>
          <legend>Web 端接收</legend>
          {toggles.map(({ field, label }) => (
            <label key={field}>
              <input
                type="checkbox"
                checked={preferences[field]}
                onChange={(event) =>
                  void changePreference(field, event.target.checked)
                }
              />
              <span>{label}</span>
            </label>
          ))}
        </fieldset>
      )}
      <h3>当前浏览器通知</h3>
      {permission === "unsupported" ? (
        <p>当前浏览器或连接不支持推送通知。站内消息和今日待处理仍可使用。</p>
      ) : (
        <>
          <p>
            权限：
            {permission === "granted"
              ? "已允许"
              : permission === "denied"
                ? "已拒绝"
                : "尚未决定"}{" "}
            · 订阅：{subscribed ? "已开启" : "未开启"}
          </p>
          {!config?.available && (
            <p>当前服务尚未配置浏览器推送。站内提醒不受影响。</p>
          )}
          {permission === "denied" && (
            <p>如需开启，请先到浏览器的网站权限设置中允许通知。</p>
          )}
          <div className="social-actions">
            <button
              type="button"
              className="secondary-button"
              disabled={
                Boolean(busy) || !config?.available || permission === "denied"
              }
              onClick={() => void enablePush()}
            >
              {subscribed ? "重新同步订阅" : "开启浏览器通知"}
            </button>
            {subscribed && (
              <button
                type="button"
                className="text-button"
                disabled={Boolean(busy)}
                onClick={() => void disablePush()}
              >
                关闭当前浏览器通知
              </button>
            )}
          </div>
          <p className="muted">
            iPhone/iPad
            关闭页面后的通知通常需要先将网页添加到主屏幕并授权。实际后台送达受设备和系统限制。
          </p>
        </>
      )}
    </section>
  );
}
