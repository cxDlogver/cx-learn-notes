import { useEffect, useState } from "react";
import type {
  CalendarEntryDto,
  CheckinContextDto,
  PlanDto,
  TodayItemDto,
} from "@plan-checkin/contracts";
import { ApiError, getCheckinContext, getPlanDetail } from "../data/api";
import { TodayCheckin } from "./TodayCheckin";

function planToday(timezone: string): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const part = (type: string) =>
    parts.find((item) => item.type === type)?.value;
  return `${part("year")}-${part("month")}-${part("day")}`;
}

function previousDate(date: string): string {
  const parsed = new Date(`${date}T12:00:00Z`);
  parsed.setUTCDate(parsed.getUTCDate() - 1);
  return parsed.toISOString().slice(0, 10);
}

function message(error: unknown): string {
  return error instanceof ApiError
    ? error.message
    : "无法读取历史记录，请稍后重试";
}

export function PlanHistory({ plan }: { plan: PlanDto }) {
  const maxDate = planToday(plan.timezone);
  const [date, setDate] = useState(
    previousDate(maxDate) >= plan.startDate ? previousDate(maxDate) : maxDate,
  );
  const [context, setContext] = useState<CheckinContextDto | null>(null);
  const [recent, setRecent] = useState<CalendarEntryDto[]>([]);
  const [error, setError] = useState("");
  const [reload, setReload] = useState(0);
  useEffect(() => {
    let cancelled = false;
    setContext((current) =>
      current?.planBusinessDate === date ? current : null,
    );
    setError("");
    void getCheckinContext(plan.id, date)
      .then((value) => {
        if (!cancelled) setContext(value);
      })
      .catch((caught: unknown) => {
        if (!cancelled) setError(message(caught));
      });
    void getPlanDetail(plan.id)
      .then((value) => {
        if (!cancelled) setRecent(value.recentRecords);
      })
      .catch((caught: unknown) => {
        if (!cancelled) setError(message(caught));
      });
    return () => {
      cancelled = true;
    };
  }, [plan.id, plan.revision, date, reload]);

  const item: TodayItemDto | null = context?.ruleVersion
    ? {
        plan: { ...plan, numericItem: context.numericItem },
        planBusinessDate: context.planBusinessDate,
        status: context.record?.result ?? "pending",
        activeRuleVersion: context.ruleVersion,
        record: context.record,
        weeklyProgress: null,
        canCheckIn: context.canCreate,
        reminderTimeLocal: null,
      }
    : null;

  return (
    <section className="plan-history" aria-labelledby="plan-history-heading">
      <h2 id="plan-history-heading">历史记录与补记</h2>
      <p>按计划时区选择业务日期。只在该日规则允许时补记，原记录可修正。</p>
      <label htmlFor="history-date">业务日期</label>
      <input
        id="history-date"
        type="date"
        min={plan.startDate}
        max={maxDate}
        value={date}
        onChange={(event) => setDate(event.target.value)}
      />
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      {!context && !error && <p role="status">正在核对当天规则和记录…</p>}
      {context && (
        <div className="history-context">
          <p>
            当天规则：
            {context.ruleVersion ? `V${context.ruleVersion}` : "尚未生效"}
            {context.numericItem
              ? ` · ${context.numericItem.label}（${context.numericItem.unit}）`
              : ""}
          </p>
          {item && (context.canCreate || context.canRevise) ? (
            <TodayCheckin
              key={`${plan.id}-${date}`}
              item={item}
              mode="history"
              onSaved={() => setReload((value) => value + 1)}
            />
          ) : (
            <p role="status">这一天不在可补记范围，也没有可修正的记录。</p>
          )}
        </div>
      )}
      {recent.length > 0 && (
        <div className="history-recent">
          <h3>最近记录</h3>
          <ul>
            {recent.map((entry) => (
              <li key={`${entry.planId}-${entry.businessDate}`}>
                <button
                  type="button"
                  className="text-button"
                  onClick={() => setDate(entry.businessDate)}
                >
                  {entry.businessDate} · {entry.status}
                  {entry.isBackfilled ? " · 补记" : ""}
                  {entry.isRevised ? " · 已修正" : ""}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
