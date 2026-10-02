import { useEffect, useRef, useState } from "react";
import type { TodayItemDto } from "@plan-checkin/contracts";
import { getToday, getWebNotificationPreferences } from "../data/api";
import { newUuid } from "../data/uuid";

function planLocalClock(timezone: string): { date: string; time: string } {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date());
  const value = (type: string) =>
    parts.find((part) => part.type === type)?.value;
  return {
    date: `${value("year")}-${value("month")}-${value("day")}`,
    time: `${value("hour")}:${value("minute")}`,
  };
}

function readyToRemind(item: TodayItemDto): boolean {
  if (
    !item.reminderTimeLocal ||
    !item.canCheckIn ||
    !["pending", "due", "overdue", "unrecorded"].includes(item.status)
  )
    return false;
  const clock = planLocalClock(item.plan.timezone);
  return (
    clock.date === item.planBusinessDate &&
    clock.time >= item.reminderTimeLocal.slice(0, 5)
  );
}

async function claimReminder(
  key: string,
  tabId: string,
): Promise<string | null> {
  const bytes = new TextEncoder().encode(key);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  const hash = Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
  const storageKey = `plan-checkin-reminder:${hash}`;
  const claim = () => {
    try {
      const previous = JSON.parse(
        localStorage.getItem(storageKey) ?? "null",
      ) as {
        tabId?: string;
        at?: number;
      } | null;
      if (previous?.at && Date.now() - previous.at < 86_400_000)
        return previous.tabId === tabId ? storageKey : null;
      localStorage.setItem(
        storageKey,
        JSON.stringify({ tabId, at: Date.now() }),
      );
      return storageKey;
    } catch {
      // Storage can be unavailable in restricted browser modes.
      return storageKey;
    }
  };
  return typeof navigator.locks?.request === "function"
    ? navigator.locks.request(`plan-checkin-reminder:${hash}`, claim)
    : claim();
}

export function LivePlanReminder({
  onNavigate,
}: {
  onNavigate: (path: string) => void;
}) {
  const dismissed = useRef(new Set<string>());
  const tabId = useRef(newUuid());
  const claimedStorageKey = useRef<string | null>(null);
  const [prompt, setPrompt] = useState<{ key: string; count: number } | null>(
    null,
  );

  useEffect(() => {
    let cancelled = false;
    async function check() {
      if (document.visibilityState !== "visible") return;
      try {
        const [preferences, today] = await Promise.all([
          getWebNotificationPreferences(),
          getToday(),
        ]);
        if (cancelled) return;
        if (!preferences.planEnabled) {
          setPrompt(null);
          return;
        }
        const due = today.items.filter(readyToRemind);
        if (due.length === 0) {
          setPrompt(null);
          return;
        }
        const key = due
          .map((item) => `${item.plan.id}:${item.planBusinessDate}`)
          .sort()
          .join("|");
        if (dismissed.current.has(key)) {
          setPrompt(null);
          return;
        }
        const claim = await claimReminder(key, tabId.current);
        if (cancelled) return;
        claimedStorageKey.current = claim;
        setPrompt(claim ? { key, count: due.length } : null);
      } catch {
        // The Today page and Settings surface their own fetch errors.
      }
    }
    void check();
    const interval = window.setInterval(() => void check(), 60_000);
    const onResume = () => void check();
    const onClaimChanged = (event: StorageEvent) => {
      if (!event.key || event.key !== claimedStorageKey.current) return;
      try {
        const current = JSON.parse(
          localStorage.getItem(event.key) ?? "null",
        ) as {
          tabId?: string;
        } | null;
        if (current?.tabId !== tabId.current) setPrompt(null);
      } catch {
        // Failed storage reads do not affect the visible Today list.
      }
    };
    window.addEventListener("focus", onResume);
    window.addEventListener("online", onResume);
    window.addEventListener("plan-data-changed", onResume);
    window.addEventListener("web-notification-preferences-changed", onResume);
    window.addEventListener("storage", onClaimChanged);
    document.addEventListener("visibilitychange", onResume);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
      window.removeEventListener("focus", onResume);
      window.removeEventListener("online", onResume);
      window.removeEventListener("plan-data-changed", onResume);
      window.removeEventListener(
        "web-notification-preferences-changed",
        onResume,
      );
      window.removeEventListener("storage", onClaimChanged);
      document.removeEventListener("visibilitychange", onResume);
    };
  }, []);

  if (!prompt) return null;
  return (
    <div className="live-reminder" role="status" aria-live="polite">
      <span>有 {prompt.count} 项计划到了提醒时间，可在今日页处理。</span>
      <div className="social-actions">
        <button
          type="button"
          className="text-button"
          onClick={() => onNavigate("/today")}
        >
          查看今日
        </button>
        <button
          type="button"
          className="text-button"
          onClick={() => {
            dismissed.current.add(prompt.key);
            setPrompt(null);
          }}
        >
          稍后
        </button>
      </div>
    </div>
  );
}
