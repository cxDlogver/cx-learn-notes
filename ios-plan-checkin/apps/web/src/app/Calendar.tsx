import { useEffect, useState } from "react";
import type {
  CalendarDayDto,
  CalendarMonthDto,
  CalendarStatus,
} from "@plan-checkin/contracts";
import { getCalendarDay, getCalendarMonth } from "../data/api";

import { Icon } from "./MobileUI";

const weekdays = ["一", "二", "三", "四", "五", "六", "日"];
const statusLabels: Record<CalendarStatus, string> = {
  success: "已完成",
  failure: "未完成",
  skip: "跳过",
  pending: "待处理",
  unrecorded: "未记录",
  future: "未到日期",
  due: "待打卡",
  overdue: "已逾期",
  completed: "按时完成",
  late_completed: "逾期完成",
  failed: "失败",
  cancelled: "已取消",
};

function localMonth(): string {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function nextMonth(month: string, offset: number): string {
  const [year, number] = month.split("-").map(Number);
  const date = new Date(Date.UTC(year!, number! - 1 + offset, 1));
  return date.toISOString().slice(0, 7);
}

function readCalendarPath(path: string): {
  month: string;
  date: string | null;
} {
  const params = new URLSearchParams(path.split("?")[1] ?? "");
  const candidate = params.get("month") ?? "";
  const month = /^\d{4}-(0[1-9]|1[0-2])$/.test(candidate)
    ? candidate
    : localMonth();
  const requestedDate = params.get("date");
  const date =
    requestedDate && /^\d{4}-\d{2}-\d{2}$/.test(requestedDate)
      ? requestedDate
      : null;
  return { month, date: date?.startsWith(`${month}-`) ? date : null };
}

function countLabel(day: CalendarDayDto): string {
  const parts = [
    day.counts.success ? `完成 ${day.counts.success}` : "",
    day.counts.failure ? `未完成 ${day.counts.failure}` : "",
    day.counts.skip ? `跳过 ${day.counts.skip}` : "",
    day.counts.unrecorded ? `未记录 ${day.counts.unrecorded}` : "",
  ].filter(Boolean);
  return parts.join("、") || (day.entries.length ? "有计划" : "无安排");
}

function message(error: unknown): string {
  return error instanceof Error ? error.message : "日历暂时无法读取";
}

function businessToday(timezone: string): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const value = (type: string) =>
    parts.find((part) => part.type === type)?.value;
  return `${value("year")}-${value("month")}-${value("day")}`;
}

function incompleteWeekLabel(weekStartDate: string, timezone: string): string {
  const today = businessToday(timezone);
  if (weekStartDate > today) return " · 尚未开始";
  const weekEnd = new Date(`${weekStartDate}T00:00:00Z`);
  weekEnd.setUTCDate(weekEnd.getUTCDate() + 7);
  return weekEnd.toISOString().slice(0, 10) > today
    ? " · 本周进行中，暂不计入达标统计"
    : " · 部分周不参与统计";
}

export function CalendarPage({
  path,
  onNavigate,
}: {
  path: string;
  onNavigate: (path: string) => void;
}) {
  const { month, date } = readCalendarPath(path);
  const [calendar, setCalendar] = useState<CalendarMonthDto | null>(null);
  const [selectedDay, setSelectedDay] = useState<CalendarDayDto | null>(null);
  const [monthLoading, setMonthLoading] = useState(false);
  const [dayLoading, setDayLoading] = useState(false);
  const [error, setError] = useState("");
  const [dayError, setDayError] = useState("");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setMonthLoading(true);
    setError("");
    void getCalendarMonth(month)
      .then((value) => {
        if (!cancelled) setCalendar(value);
      })
      .catch((caught: unknown) => {
        if (!cancelled) {
          setCalendar(null);
          setError(message(caught));
        }
      })
      .finally(() => {
        if (!cancelled) setMonthLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [month, attempt]);

  useEffect(() => {
    if (!date) {
      setSelectedDay(null);
      return;
    }
    let cancelled = false;
    setDayLoading(true);
    setDayError("");
    void getCalendarDay(date)
      .then((value) => {
        if (!cancelled) setSelectedDay(value);
      })
      .catch((caught: unknown) => {
        if (!cancelled) {
          setSelectedDay(null);
          setDayError(message(caught));
        }
      })
      .finally(() => {
        if (!cancelled) setDayLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [date, attempt]);

  const firstDay = new Date(`${month}-01T00:00:00Z`).getUTCDay();
  const leading = (firstDay + 6) % 7;
  const title = new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "long",
    timeZone: "UTC",
  }).format(new Date(`${month}-01T00:00:00Z`));

  return (
    <section className="content-panel" data-page-key="calendar-month">
      <div className="page-heading">
        <h1>日历</h1>
        <button
          className="text-button"
          type="button"
          onClick={() => onNavigate(`/calendar?month=${localMonth()}`)}
        >
          今天
        </button>
      </div>
      <div className="calendar-toolbar">
        <button
          className="icon-button"
          aria-label="上个月"
          type="button"
          onClick={() => onNavigate(`/calendar?month=${nextMonth(month, -1)}`)}
        >
          <Icon name="back" />
        </button>
        <h2>{title}</h2>
        <button
          className="icon-button"
          aria-label="下个月"
          type="button"
          onClick={() => onNavigate(`/calendar?month=${nextMonth(month, 1)}`)}
        >
          <Icon name="next" />
        </button>
      </div>
      {error && (
        <div className="empty-card" role="alert">
          <p>{error}</p>
          <button
            type="button"
            onClick={() => setAttempt((value) => value + 1)}
          >
            重试
          </button>
        </div>
      )}
      {monthLoading && <p role="status">正在读取月日历…</p>}
      {calendar?.month === month && (
        <>
          <div className="calendar-grid" aria-label={`${title}日历`}>
            {weekdays.map((weekday) => (
              <strong className="calendar-weekday" key={weekday}>
                {weekday}
              </strong>
            ))}
            {Array.from({ length: leading }, (_, index) => (
              <span className="calendar-empty" key={`leading-${index}`} />
            ))}
            {calendar.days.map((day) => (
              <button
                key={day.businessDate}
                className={`calendar-date${date === day.businessDate ? " selected" : ""}`}
                type="button"
                aria-pressed={date === day.businessDate}
                aria-label={`${day.businessDate}，${countLabel(day)}`}
                onClick={() =>
                  onNavigate(
                    `/calendar?month=${month}&date=${day.businessDate}`,
                  )
                }
              >
                <span>{Number(day.businessDate.slice(-2))}</span>
                <span className="calendar-dots" aria-hidden="true">
                  {day.counts.success > 0 && <i />}
                  {day.counts.failure > 0 && <i className="failure" />}
                  {(day.counts.skip > 0 || day.counts.unrecorded > 0) && (
                    <i className="skip" />
                  )}
                </span>
              </button>
            ))}
          </div>
          <p className="calendar-legend">
            <span>● 完成</span>
            <span>■ 未完成</span>
            <span>● 跳过 / 未记录</span>
          </p>
          {calendar.days.every((day) => day.entries.length === 0) && (
            <p className="muted">本月没有计划记录或应执行日。</p>
          )}
          {calendar.weeklySummaries.some(
            (week) => week.summary.ruleVersion !== null,
          ) && (
            <section
              className="calendar-weeks"
              aria-labelledby="weekly-heading"
            >
              <h2 id="weekly-heading">周目标概览</h2>
              <ul>
                {calendar.weeklySummaries
                  .filter((week) => week.summary.ruleVersion !== null)
                  .map((week) => (
                    <li key={`${week.planId}-${week.summary.weekStartDate}`}>
                      <strong>{week.title}</strong> ·{" "}
                      {week.summary.weekStartDate} 起：
                      {week.summary.successes}/{week.summary.target ?? "—"}
                      {week.summary.completeWeek
                        ? week.summary.attained
                          ? " · 已达标"
                          : " · 未达标"
                        : incompleteWeekLabel(
                            week.summary.weekStartDate,
                            week.timezone,
                          )}
                    </li>
                  ))}
              </ul>
            </section>
          )}
        </>
      )}
      {date && (
        <section className="calendar-day-detail" data-page-key="calendar-day">
          <h2>{date} 的计划</h2>
          {dayLoading && <p role="status">正在读取当日记录…</p>}
          {dayError && <p role="alert">{dayError}</p>}
          {selectedDay?.businessDate === date && (
            <>
              <p>{countLabel(selectedDay)}</p>
              {selectedDay.entries.length === 0 ? (
                <p className="muted">这一天没有计划记录。</p>
              ) : (
                <ul className="calendar-entry-list">
                  {selectedDay.entries.map((entry) => (
                    <li key={`${entry.planId}-${entry.businessDate}`}>
                      <button
                        type="button"
                        className="text-button"
                        onClick={() => onNavigate(`/plans/${entry.planId}`)}
                      >
                        {entry.title}
                      </button>
                      <span>{statusLabels[entry.status]}</span>
                      <small>
                        {entry.timezone} · 规则 V{entry.ruleVersion}
                        {entry.isBackfilled ? " · 补记" : ""}
                        {entry.isRevised ? " · 已修正" : ""}
                      </small>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </section>
      )}
    </section>
  );
}
