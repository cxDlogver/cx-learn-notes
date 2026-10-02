import { useEffect, useState, type FormEvent } from "react";
import type { PlanDto, ReminderDto, Weekday } from "@plan-checkin/contracts";
import { getPlanReminder, listPlans, savePlanReminder } from "../data/api";

const days = ["一", "二", "三", "四", "五", "六", "日"];

function ReminderCard({ plan }: { plan: PlanDto }) {
  const [current, setCurrent] = useState<ReminderDto | null>(null);
  const [enabled, setEnabled] = useState(false);
  const [time, setTime] = useState("20:00");
  const [weekdays, setWeekdays] = useState<Weekday[]>([]);
  const [lead, setLead] = useState<0 | 1 | 3>(0);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [attempt, setAttempt] = useState(0);
  function apply(rule: ReminderDto) {
    setCurrent(rule);
    setEnabled(rule.enabled);
    setTime(rule.timeLocal ?? "20:00");
    setWeekdays(rule.weekdays);
    setLead(rule.daysBeforeDue ?? 0);
  }
  useEffect(() => {
    let cancelled = false;
    void getPlanReminder(plan.id)
      .then((rule) => {
        if (!cancelled) apply(rule);
      })
      .catch((caught: unknown) => {
        if (!cancelled)
          setError(caught instanceof Error ? caught.message : "提醒读取失败");
      });
    return () => {
      cancelled = true;
    };
  }, [plan.id, attempt]);
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!current || busy) return;
    setNotice("");
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) {
      setError("请选择有效提醒时间");
      return;
    }
    if (enabled && plan.kind === "weekly" && weekdays.length === 0) {
      setError("至少选择一个提醒星期");
      return;
    }
    setBusy(true);
    setError("");
    try {
      apply(
        await savePlanReminder(plan.id, {
          enabled,
          timeLocal: time,
          baseRevision: current.revision,
          ...(plan.kind === "weekly" ? { weekdays } : {}),
          ...(plan.kind === "one_time" ? { daysBeforeDue: lead } : {}),
        }),
      );
      setNotice("提醒规则已保存");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "保存失败，请重试");
    } finally {
      setBusy(false);
    }
  }
  return (
    <article className="settings-card reminder-card" data-plan-kind={plan.kind}>
      <p className="eyebrow">
        {plan.kind === "fixed"
          ? "固定日期计划"
          : plan.kind === "weekly"
            ? "每周目标计划"
            : "一次性任务"}{" "}
        · {plan.title}
      </p>
      {!current && !error && <p role="status">正在读取提醒…</p>}
      {error && (
        <p className="form-error" role="alert">
          {error}
          <button
            type="button"
            className="text-button"
            disabled={busy}
            onClick={() => {
              setError("");
              setAttempt((value) => value + 1);
            }}
          >
            重新读取规则
          </button>
        </p>
      )}
      {current && (
        <form onSubmit={(event) => void save(event)}>
          <label className="switch-row">
            <span>提醒规则</span>
            <input
              type="checkbox"
              checked={enabled}
              disabled={busy}
              onChange={(event) => setEnabled(event.target.checked)}
            />
          </label>
          {plan.kind === "weekly" && (
            <fieldset disabled={!enabled || busy}>
              <legend>提醒星期</legend>
              <div className="weekday-grid">
                {days.map((day, index) => {
                  const value = (index + 1) as Weekday;
                  return (
                    <label
                      className="weekday-option"
                      aria-label={`周${day}`}
                      key={day}
                    >
                      <input
                        type="checkbox"
                        checked={weekdays.includes(value)}
                        onChange={(event) =>
                          setWeekdays((selected) =>
                            event.target.checked
                              ? [...selected, value].sort()
                              : selected.filter((item) => item !== value),
                          )
                        }
                      />
                      {day}
                    </label>
                  );
                })}
              </div>
            </fieldset>
          )}
          {plan.kind === "one_time" && (
            <label>
              提醒时机
              <select
                value={lead}
                disabled={!enabled || busy}
                onChange={(event) =>
                  setLead(Number(event.target.value) as 0 | 1 | 3)
                }
              >
                <option value={0}>截止当天</option>
                <option value={1}>提前1天</option>
                <option value={3}>提前3天</option>
              </select>
            </label>
          )}
          <label>
            提醒时间
            <input
              type="time"
              value={time}
              disabled={!enabled || busy}
              onChange={(event) => setTime(event.target.value)}
            />
          </label>
          <p className="hint">
            {plan.kind === "fixed" && plan.rule && "weekdays" in plan.rule
              ? `仅在选中星期（${plan.rule.weekdays.map((day) => days[day - 1]).join("、")}）当天提醒`
              : plan.kind === "weekly"
                ? "达标后本周将停止提醒"
                : "默认关闭，开启后可选择提醒时机"}{" "}
            · {plan.timezone}
          </p>
          <button className="secondary-button" type="submit" disabled={busy}>
            {busy ? "保存中…" : "保存提醒规则"}
          </button>
          {notice && (
            <p role="status" className="success-note">
              {notice}
            </p>
          )}
        </form>
      )}
    </article>
  );
}

export function PlanReminders() {
  const [plans, setPlans] = useState<PlanDto[] | null>(null);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let cancelled = false;
    void listPlans()
      .then((items) => {
        if (!cancelled)
          setPlans(items.filter((plan) => plan.lifecycle === "active"));
      })
      .catch((caught: unknown) => {
        if (!cancelled)
          setError(caught instanceof Error ? caught.message : "计划读取失败");
      });
    return () => {
      cancelled = true;
    };
  }, [attempt]);
  return (
    <section aria-label="计划提醒规则">
      <h2>计划提醒</h2>
      <p className="hint">
        时间、星期和规则在各端共享；是否接收通知由各端开关分别控制。
      </p>
      {error && (
        <p className="form-error" role="alert">
          {error}
          <button
            className="text-button"
            type="button"
            onClick={() => {
              setError("");
              setAttempt((value) => value + 1);
            }}
          >
            重试
          </button>
        </p>
      )}
      {!plans && !error && <p role="status">正在读取计划…</p>}
      {plans?.length === 0 && <p className="muted">暂无进行中的计划。</p>}
      {plans?.map((plan) => (
        <ReminderCard key={plan.id} plan={plan} />
      ))}
    </section>
  );
}
