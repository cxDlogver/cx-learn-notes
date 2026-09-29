import { useEffect, useState } from "react";
import type { PlanStatisticsDto } from "@plan-checkin/contracts";
import { getPlanStatistics } from "../data/api";

const oneTimeStateLabels = {
  pending: "待处理",
  overdue: "已逾期",
  completed: "按时完成",
  late_completed: "逾期完成",
  failed: "失败",
  cancelled: "已取消",
} as const;

function percent(value: number | null): string {
  return value === null ? "暂无可统计样本" : `${(value * 100).toFixed(1)}%`;
}

export function PlanStatistics({
  planId,
  revision,
}: {
  planId: string;
  revision: number;
}) {
  const [statistics, setStatistics] = useState<PlanStatisticsDto | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    const onChange = () => setRefresh((value) => value + 1);
    window.addEventListener("plan-data-changed", onChange);
    return () => window.removeEventListener("plan-data-changed", onChange);
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    void getPlanStatistics(planId)
      .then((value) => {
        if (!cancelled) setStatistics(value);
      })
      .catch((caught: unknown) => {
        if (!cancelled) {
          setStatistics(null);
          setError(
            caught instanceof Error ? caught.message : "统计暂时无法读取",
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [planId, revision, refresh]);

  return (
    <section
      className="plan-statistics"
      data-page-key="plan-statistics"
      aria-labelledby="statistics-heading"
    >
      <div className="plan-statistics-heading">
        <h2 id="statistics-heading">统计</h2>
        <button
          type="button"
          className="text-button"
          onClick={() => setRefresh((value) => value + 1)}
          disabled={loading}
        >
          刷新
        </button>
      </div>
      {loading && <p role="status">正在读取统计…</p>}
      {error && (
        <p role="alert" className="form-error">
          {error}
        </p>
      )}
      {statistics && !loading && (
        <>
          <p className="muted">
            计划时区 {statistics.timezone} · 统计截至{" "}
            {statistics.statisticsThroughBusinessDate} · 规则 V
            {statistics.ruleVersions.join("、")}
          </p>
          {statistics.kind === "fixed" && (
            <dl className="statistics-grid">
              <div>
                <dt>应执行日</dt>
                <dd>{statistics.denominator}</dd>
              </div>
              <div>
                <dt>完成率</dt>
                <dd>{percent(statistics.completionRate)}</dd>
              </div>
              <div>
                <dt>成功</dt>
                <dd>{statistics.successCount}</dd>
              </div>
              <div>
                <dt>失败</dt>
                <dd>{statistics.failureCount}</dd>
              </div>
              <div>
                <dt>跳过</dt>
                <dd>{statistics.skipCount}</dd>
              </div>
              <div>
                <dt>未记录</dt>
                <dd>{statistics.unrecordedCount}</dd>
              </div>
              <div>
                <dt>连续应执行日成功</dt>
                <dd>{statistics.consecutiveDueSuccesses}</dd>
              </div>
            </dl>
          )}
          {statistics.kind === "weekly" && (
            <>
              <dl className="statistics-grid">
                <div>
                  <dt>完整周</dt>
                  <dd>{statistics.completeWeekCount}</dd>
                </div>
                <div>
                  <dt>达标周</dt>
                  <dd>{statistics.attainedWeekCount}</dd>
                </div>
                <div>
                  <dt>达标率</dt>
                  <dd>{percent(statistics.attainmentRate)}</dd>
                </div>
                <div>
                  <dt>连续达标周</dt>
                  <dd>{statistics.consecutiveAttainedWeeks}</dd>
                </div>
              </dl>
              <p className="statistics-current-week">
                本周（{statistics.currentWeek.weekStartDate} 起）：
                {statistics.currentWeek.successes}/
                {statistics.currentWeek.target ?? "—"}{" "}
                次。进行中不计入完整周达标率；周中变更等部分周不参与达标统计。
              </p>
              {statistics.completedWeeks.length > 0 && (
                <ul className="statistics-weeks" aria-label="最近完整周">
                  {statistics.completedWeeks
                    .slice(-6)
                    .reverse()
                    .map((week) => (
                      <li key={week.weekStartDate}>
                        {week.weekStartDate} 起 · {week.successes}/
                        {week.target ?? "—"} ·{" "}
                        {week.attained ? "达标" : "未达标"}
                      </li>
                    ))}
                </ul>
              )}
            </>
          )}
          {statistics.kind === "one_time" && (
            <dl className="statistics-grid">
              <div>
                <dt>截止日期</dt>
                <dd>{statistics.dueDate}</dd>
              </div>
              <div>
                <dt>当前结果</dt>
                <dd>{oneTimeStateLabels[statistics.state]}</dd>
              </div>
              {statistics.resolution && (
                <div>
                  <dt>结果日期</dt>
                  <dd>{statistics.resolution.resolvedBusinessDate}</dd>
                </div>
              )}
            </dl>
          )}
        </>
      )}
    </section>
  );
}
