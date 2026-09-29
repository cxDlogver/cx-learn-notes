import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import type {
  CreatePlanRequest,
  Direction,
  GroupDto,
  PlanDto,
  PlanKind,
  UpdatePlanRequest,
  Weekday,
} from "@plan-checkin/contracts";
import {
  ApiError,
  changePlanLifecycle,
  createGroup,
  createPlan,
  deleteGroup,
  deletePlan,
  getPlan,
  listGroups,
  listPlans,
  setPlanNumericItem,
  updateGroup,
  updatePlan,
} from "../data/api";
import { OneTimeResult } from "./OneTimeResult";
import { ModalDialog } from "./ModalDialog";
import { PlanHistory } from "./PlanHistory";
import { PlanStatistics } from "./PlanStatistics";
import { ShareManager } from "./ShareManager";

const weekdays: { value: Weekday; label: string }[] = [
  { value: 1, label: "周一" },
  { value: 2, label: "周二" },
  { value: 3, label: "周三" },
  { value: 4, label: "周四" },
  { value: 5, label: "周五" },
  { value: 6, label: "周六" },
  { value: 7, label: "周日" },
];
const lifecycleLabels = {
  active: "进行中",
  paused: "已暂停",
  archived: "已归档",
  deleted: "已删除",
} as const;

function message(error: unknown): string {
  return error instanceof ApiError ? error.message : "操作未完成，请稍后重试";
}

function todayAt(timezone: string): string {
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(new Date());
    const part = (type: string) =>
      parts.find((item) => item.type === type)?.value;
    return `${part("year")}-${part("month")}-${part("day")}`;
  } catch {
    return "";
  }
}

function PlanLink({
  href,
  onNavigate,
  children,
  className,
}: {
  href: string;
  onNavigate: (path: string) => void;
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
        onNavigate(href);
      }}
    >
      {children}
    </a>
  );
}

function PlanList({ onNavigate }: { onNavigate: (path: string) => void }) {
  const [plans, setPlans] = useState<PlanDto[] | null>(null);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let cancelled = false;
    void listPlans()
      .then((result) => {
        if (!cancelled) setPlans(result);
      })
      .catch((caught: unknown) => {
        if (!cancelled) setError(message(caught));
      });
    return () => {
      cancelled = true;
    };
  }, [attempt]);
  return (
    <section className="content-panel" data-page-key="plans">
      <div className="page-heading">
        <div>
          <p className="eyebrow">按自己的节奏，认真生活</p>
          <h1>我的计划</h1>
        </div>
        <PlanLink
          href="/plans/new"
          onNavigate={onNavigate}
          className="action-link"
        >
          创建计划
        </PlanLink>
      </div>
      {!plans && !error && <p role="status">正在读取计划…</p>}
      {error && (
        <div className="empty-card" role="alert">
          <h2>暂时无法读取计划</h2>
          <p>{error}</p>
          <button
            type="button"
            className="secondary-button"
            onClick={() => {
              setError("");
              setAttempt((value) => value + 1);
            }}
          >
            重试
          </button>
        </div>
      )}
      {plans?.length === 0 && (
        <div className="empty-card" role="status">
          <span className="empty-icon" aria-hidden="true">
            ◌
          </span>
          <h2>还没有计划</h2>
          <p>先从一个小目标开始。</p>
          <PlanLink
            href="/plans/new"
            onNavigate={onNavigate}
            className="action-link"
          >
            创建第一个计划
          </PlanLink>
        </div>
      )}
      {plans && plans.length > 0 && (
        <div className="today-list" aria-label="我的计划列表">
          {plans.map((plan) => (
            <article
              className="today-card"
              key={plan.id}
              data-group-id={plan.groupId ?? "none"}
            >
              <div>
                <p className="eyebrow">
                  {plan.kind === "one_time"
                    ? "一次性任务"
                    : plan.kind === "weekly"
                      ? "周目标"
                      : "固定星期"}
                  {plan.lifecycle !== "active"
                    ? ` · ${lifecycleLabels[plan.lifecycle]}`
                    : ""}
                </p>
                <h2>{plan.title}</h2>
                <p>
                  {plan.timezone} · 从 {plan.startDate} 开始
                </p>
              </div>
              <PlanLink
                href={`/plans/${plan.id}`}
                onNavigate={onNavigate}
                className="action-link"
              >
                查看计划
              </PlanLink>
            </article>
          ))}
        </div>
      )}
      {plans && (
        <GroupManager
          plans={plans}
          onPlansChanged={() => setAttempt((value) => value + 1)}
        />
      )}
    </section>
  );
}

function GroupManager({
  plans,
  onPlansChanged,
}: {
  plans: PlanDto[];
  onPlansChanged: () => void;
}) {
  const [groups, setGroups] = useState<GroupDto[] | null>(null);
  const [newName, setNewName] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [reload, setReload] = useState(0);
  useEffect(() => {
    let cancelled = false;
    void listGroups()
      .then((result) => {
        if (!cancelled) setGroups(result);
      })
      .catch((caught: unknown) => {
        if (!cancelled) setError(message(caught));
      });
    return () => {
      cancelled = true;
    };
  }, [reload]);
  async function run(work: () => Promise<unknown>, reloadPlans = false) {
    setBusy(true);
    setError("");
    try {
      await work();
      setReload((value) => value + 1);
      if (reloadPlans) onPlansChanged();
    } catch (caught) {
      setError(message(caught));
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="group-manager" aria-labelledby="group-heading">
      <h2 id="group-heading" tabIndex={-1}>
        计划分组
      </h2>
      <p className="hint">
        分组只整理列表；删除分组会把计划移到未分组，计划和记录保留。
      </p>
      {!groups && !error && <p role="status">正在读取分组…</p>}
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      {!groups && error && (
        <button
          type="button"
          className="secondary-button"
          onClick={() => {
            setError("");
            setReload((value) => value + 1);
          }}
        >
          重试
        </button>
      )}
      {groups && (
        <>
          <form
            className="group-create"
            onSubmit={(event) => {
              event.preventDefault();
              const name = newName.trim();
              if (!name || name.length > 40) {
                setError("分组名称需为 1–40 个字符");
                return;
              }
              void run(async () => {
                await createGroup({ name });
                setNewName("");
              });
            }}
          >
            <label htmlFor="group-new-name">新分组名称</label>
            <input
              id="group-new-name"
              value={newName}
              maxLength={40}
              onChange={(event) => setNewName(event.target.value)}
            />
            <button type="submit" className="secondary-button" disabled={busy}>
              创建分组
            </button>
          </form>
          {groups.length === 0 && <p className="hint">还没有分组。</p>}
          <div className="group-list">
            {groups.map((group) => (
              <div className="group-row" key={group.id}>
                <form
                  onSubmit={(event) => {
                    event.preventDefault();
                    const data = new FormData(event.currentTarget);
                    const name = String(data.get("name") ?? "").trim();
                    if (!name || name.length > 40) {
                      setError("分组名称需为 1–40 个字符");
                      return;
                    }
                    void run(() =>
                      updateGroup(group.id, {
                        name,
                        baseRevision: group.revision,
                      }),
                    );
                  }}
                >
                  <label htmlFor={`group-name-${group.id}`}>分组名称</label>
                  <input
                    id={`group-name-${group.id}`}
                    name="name"
                    defaultValue={group.name}
                    maxLength={40}
                  />
                  <button
                    type="submit"
                    className="secondary-button"
                    disabled={busy}
                  >
                    保存名称
                  </button>
                </form>
                <button
                  type="button"
                  className="text-button"
                  onClick={() => setConfirmDeleteId(group.id)}
                >
                  删除分组
                </button>
                {confirmDeleteId === group.id && (
                  <ModalDialog
                    className="group-delete-confirm"
                    label={`删除分组 ${group.name}`}
                    fallbackFocusId="group-heading"
                    onClose={() => {
                      if (!busy) setConfirmDeleteId(null);
                    }}
                  >
                    <p>
                      删除“{group.name}”后，该组计划会进入未分组，历史记录保留。
                    </p>
                    <button
                      type="button"
                      className="secondary-button"
                      disabled={busy}
                      onClick={() =>
                        void run(async () => {
                          await deleteGroup(group.id, group.revision);
                          setConfirmDeleteId(null);
                        }, true)
                      }
                    >
                      确认删除分组
                    </button>
                    <button
                      type="button"
                      className="text-button"
                      disabled={busy}
                      data-initial-focus
                      onClick={() => setConfirmDeleteId(null)}
                    >
                      取消
                    </button>
                  </ModalDialog>
                )}
              </div>
            ))}
          </div>
          {plans.length > 0 && (
            <div className="group-moves">
              <h3>移动计划</h3>
              {plans.map((plan) => (
                <label key={plan.id} htmlFor={`plan-group-${plan.id}`}>
                  <span>{plan.title}</span>
                  <select
                    id={`plan-group-${plan.id}`}
                    value={plan.groupId ?? ""}
                    disabled={busy}
                    onChange={(event) => {
                      const groupId = event.target.value || null;
                      void run(
                        () =>
                          updatePlan(plan.id, {
                            groupId,
                            baseRevision: plan.revision,
                          }),
                        true,
                      );
                    }}
                  >
                    <option value="">未分组</option>
                    {groups.map((group) => (
                      <option key={group.id} value={group.id}>
                        {group.name}
                      </option>
                    ))}
                  </select>
                </label>
              ))}
            </div>
          )}
        </>
      )}
    </section>
  );
}

function PlanEdit({
  plan,
  onSaved,
}: {
  plan: PlanDto;
  onSaved: (next: PlanDto) => void;
}) {
  const [title, setTitle] = useState(plan.title);
  const [description, setDescription] = useState(plan.description ?? "");
  const [endDate, setEndDate] = useState(plan.endDate ?? "");
  const [dueDate, setDueDate] = useState(plan.dueDate ?? "");
  const [selectedWeekdays, setSelectedWeekdays] = useState<Weekday[]>(
    plan.rule && "weekdays" in plan.rule ? plan.rule.weekdays : [],
  );
  const [weeklyTarget, setWeeklyTarget] = useState(
    plan.rule && "weeklyTarget" in plan.rule
      ? String(plan.rule.weeklyTarget)
      : "",
  );
  const [numericLabel, setNumericLabel] = useState(
    plan.numericItem?.label ?? "",
  );
  const [numericUnit, setNumericUnit] = useState(plan.numericItem?.unit ?? "");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function savePlan(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = title.trim();
    if (!name || name.length > 80) {
      setError("计划名称需为 1–80 个字符");
      return;
    }
    const input: UpdatePlanRequest = { baseRevision: plan.revision };
    if (name !== plan.title) input.title = name;
    if (description.trim() !== (plan.description ?? ""))
      input.description = description.trim() || null;
    if (plan.kind === "one_time") {
      if (
        !dueDate ||
        dueDate < todayAt(plan.timezone) ||
        dueDate < plan.startDate
      ) {
        setError("截止日期不能早于计划时区的今天或开始日期");
        return;
      }
      if (dueDate !== plan.dueDate) input.dueDate = dueDate;
    } else {
      if (
        endDate &&
        (endDate < plan.startDate || endDate < todayAt(plan.timezone))
      ) {
        setError("结束日期不能早于今天或开始日期");
        return;
      }
      if ((endDate || null) !== plan.endDate) input.endDate = endDate || null;
      if (plan.kind === "fixed" && plan.rule && "weekdays" in plan.rule) {
        if (selectedWeekdays.length === 0) {
          setError("至少选择一个星期");
          return;
        }
        if (selectedWeekdays.join() !== plan.rule.weekdays.join())
          input.rule = { weekdays: selectedWeekdays };
      }
      if (plan.kind === "weekly" && plan.rule && "weeklyTarget" in plan.rule) {
        if (!/^[1-7]$/.test(weeklyTarget)) {
          setError("周目标需为 1–7 的整数");
          return;
        }
        if (Number(weeklyTarget) !== plan.rule.weeklyTarget)
          input.rule = { weeklyTarget: Number(weeklyTarget) };
      }
    }
    if (Object.keys(input).length === 1) {
      setError("没有需要保存的计划变更");
      return;
    }
    setBusy(true);
    setError("");
    try {
      onSaved(await updatePlan(plan.id, input));
    } catch (caught) {
      setError(message(caught));
    } finally {
      setBusy(false);
    }
  }

  async function saveNumeric(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const label = numericLabel.trim();
    const unit = numericUnit.trim();
    if (!label || !unit) {
      setError("数值名称和单位需要同时填写");
      return;
    }
    if (label === plan.numericItem?.label && unit === plan.numericItem.unit) {
      setError("数值项没有变化");
      return;
    }
    setBusy(true);
    setError("");
    try {
      onSaved(
        await setPlanNumericItem(
          plan.id,
          { label, unit, baseRevision: plan.revision },
          Boolean(plan.numericItem),
        ),
      );
    } catch (caught) {
      setError(message(caught));
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="plan-edit-panel" aria-label="编辑计划">
      <p className="hint">
        计划时区和开始日期保持不变；规则与数值项改动从计划时区的下一业务日生效，历史记录保留原规则和单位。
      </p>
      <form
        className="plan-form"
        onSubmit={(event) => void savePlan(event)}
        noValidate
      >
        <label htmlFor="edit-plan-title">计划名称</label>
        <input
          id="edit-plan-title"
          value={title}
          maxLength={80}
          onChange={(event) => setTitle(event.target.value)}
        />
        <label htmlFor="edit-plan-description">说明</label>
        <textarea
          id="edit-plan-description"
          value={description}
          maxLength={1000}
          onChange={(event) => setDescription(event.target.value)}
        />
        {plan.kind === "fixed" && (
          <fieldset className="plan-fieldset" id="edit-plan-weekdays">
            <legend>固定星期</legend>
            <div className="weekday-grid">
              {weekdays.map((day) => (
                <label key={day.value} className="weekday-option">
                  <input
                    type="checkbox"
                    checked={selectedWeekdays.includes(day.value)}
                    onChange={(event) =>
                      setSelectedWeekdays((current) =>
                        event.target.checked
                          ? [...current, day.value].sort()
                          : current.filter((value) => value !== day.value),
                      )
                    }
                  />
                  {day.label}
                </label>
              ))}
            </div>
          </fieldset>
        )}
        {plan.kind === "weekly" && (
          <>
            <label htmlFor="edit-weekly-target">每周目标次数（1–7）</label>
            <input
              id="edit-weekly-target"
              type="number"
              min={1}
              max={7}
              step={1}
              value={weeklyTarget}
              onChange={(event) => setWeeklyTarget(event.target.value)}
            />
          </>
        )}
        {plan.kind === "one_time" ? (
          <>
            <label htmlFor="edit-due-date">截止日期</label>
            <input
              id="edit-due-date"
              type="date"
              value={dueDate}
              onChange={(event) => setDueDate(event.target.value)}
            />
          </>
        ) : (
          <>
            <label htmlFor="edit-end-date">结束日期（可选）</label>
            <input
              id="edit-end-date"
              type="date"
              value={endDate}
              onChange={(event) => setEndDate(event.target.value)}
            />
          </>
        )}
        <button className="primary-button" type="submit" disabled={busy}>
          保存计划修改
        </button>
      </form>
      <form
        className="plan-form"
        onSubmit={(event) => void saveNumeric(event)}
        noValidate
      >
        <h3>数值项</h3>
        <label htmlFor="edit-numeric-label">名称</label>
        <input
          id="edit-numeric-label"
          value={numericLabel}
          onChange={(event) => setNumericLabel(event.target.value)}
        />
        <label htmlFor="edit-numeric-unit">单位</label>
        <input
          id="edit-numeric-unit"
          value={numericUnit}
          onChange={(event) => setNumericUnit(event.target.value)}
        />
        <button className="secondary-button" type="submit" disabled={busy}>
          保存数值项
        </button>
      </form>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

function PlanCreate({ onNavigate }: { onNavigate: (path: string) => void }) {
  const initialZone =
    Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Shanghai";
  const [kind, setKind] = useState<PlanKind>("fixed");
  const [direction, setDirection] = useState<Direction>("do");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [timezone, setTimezone] = useState(initialZone);
  const [startDate, setStartDate] = useState(todayAt(initialZone));
  const [endDate, setEndDate] = useState("");
  const [dueDate, setDueDate] = useState(todayAt(initialZone));
  const [selectedWeekdays, setSelectedWeekdays] = useState<Weekday[]>([]);
  const [weeklyTarget, setWeeklyTarget] = useState("3");
  const [numericLabel, setNumericLabel] = useState("");
  const [numericUnit, setNumericUnit] = useState("");
  const [error, setError] = useState("");
  const [errorField, setErrorField] = useState("");
  const [busy, setBusy] = useState(false);

  function invalid(field: string, text: string): void {
    setErrorField(field);
    setError(text);
    document.getElementById(field)?.focus();
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setErrorField("");
    const normalizedTitle = title.trim();
    if (!normalizedTitle || normalizedTitle.length > 80) {
      invalid("plan-title", "计划名称需为 1–80 个字符");
      return;
    }
    if (description.length > 1000) {
      invalid("plan-description", "说明最多 1000 个字符");
      return;
    }
    const zoneToday = todayAt(timezone);
    if (!zoneToday) {
      invalid("plan-timezone", "请输入有效的 IANA 时区");
      return;
    }
    if (!startDate) {
      invalid("plan-start-date", "请选择开始日期");
      return;
    }
    if (kind !== "one_time" && endDate && endDate < startDate) {
      invalid("plan-end-date", "结束日期不能早于开始日期");
      return;
    }
    if (kind === "fixed" && selectedWeekdays.length === 0) {
      invalid("plan-weekdays", "至少选择一个星期");
      return;
    }
    if (kind === "weekly" && !/^[1-7]$/.test(weeklyTarget)) {
      invalid("plan-weekly-target", "周目标需为 1–7 的整数");
      return;
    }
    if (kind === "one_time" && (dueDate < zoneToday || dueDate < startDate)) {
      invalid("plan-due-date", "截止日期不能早于计划时区的今天或开始日期");
      return;
    }
    if (Boolean(numericLabel.trim()) !== Boolean(numericUnit.trim())) {
      invalid("plan-numeric-label", "数值名称和单位需要同时填写");
      return;
    }
    const base = {
      title: normalizedTitle,
      description: description.trim() || null,
      timezone,
      startDate,
      ...(numericLabel.trim()
        ? {
            numericItem: {
              label: numericLabel.trim(),
              unit: numericUnit.trim(),
            },
          }
        : {}),
    };
    let input: CreatePlanRequest;
    if (kind === "fixed") {
      input = {
        ...base,
        kind: "fixed",
        direction,
        endDate: endDate || null,
        rule: { weekdays: selectedWeekdays },
      };
    } else if (kind === "weekly") {
      input = {
        ...base,
        kind: "weekly",
        direction,
        endDate: endDate || null,
        rule: { weeklyTarget: Number(weeklyTarget) },
      };
    } else {
      input = {
        ...base,
        kind: "one_time",
        direction: "do",
        dueDate,
      };
    }
    setBusy(true);
    try {
      const plan = await createPlan(input);
      onNavigate(`/plans/${plan.id}`);
    } catch (caught) {
      setError(message(caught));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="content-panel" data-page-key="plan-create">
      <p className="eyebrow">为自己定个可行的目标</p>
      <h1>创建计划</h1>
      <form
        className="plan-form"
        onSubmit={(event) => void submit(event)}
        noValidate
      >
        <label htmlFor="plan-title">计划名称</label>
        <input
          id="plan-title"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          maxLength={80}
          aria-invalid={errorField === "plan-title"}
        />
        <label htmlFor="plan-description">说明（可选）</label>
        <textarea
          id="plan-description"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          maxLength={1000}
        />
        <label htmlFor="plan-kind">计划类型</label>
        <select
          id="plan-kind"
          value={kind}
          onChange={(event) => setKind(event.target.value as PlanKind)}
        >
          <option value="fixed">固定星期</option>
          <option value="weekly">每周目标</option>
          <option value="one_time">一次性任务</option>
        </select>
        {kind !== "one_time" && (
          <fieldset className="plan-fieldset">
            <legend>方向</legend>
            <label>
              <input
                type="radio"
                name="direction"
                value="do"
                checked={direction === "do"}
                onChange={() => setDirection("do")}
              />{" "}
              要做
            </label>
            <label>
              <input
                type="radio"
                name="direction"
                value="avoid"
                checked={direction === "avoid"}
                onChange={() => setDirection("avoid")}
              />{" "}
              不要做
            </label>
          </fieldset>
        )}
        <label htmlFor="plan-timezone">计划时区</label>
        <input
          id="plan-timezone"
          list="plan-timezones"
          value={timezone}
          onChange={(event) => setTimezone(event.target.value)}
          aria-invalid={errorField === "plan-timezone"}
        />
        <datalist id="plan-timezones">
          <option value="Asia/Shanghai" />
          <option value="Asia/Tokyo" />
          <option value="America/Los_Angeles" />
          <option value="Europe/London" />
        </datalist>
        <p className="hint">计划日期和提醒按此时区计算。</p>
        <label htmlFor="plan-start-date">开始日期</label>
        <input
          id="plan-start-date"
          type="date"
          value={startDate}
          onChange={(event) => setStartDate(event.target.value)}
          aria-invalid={errorField === "plan-start-date"}
        />
        {kind === "fixed" && (
          <fieldset
            className="plan-fieldset"
            id="plan-weekdays"
            tabIndex={-1}
            aria-invalid={errorField === "plan-weekdays"}
          >
            <legend>每周哪几天</legend>
            <div className="weekday-grid">
              {weekdays.map((day) => (
                <label key={day.value} className="weekday-option">
                  <input
                    type="checkbox"
                    checked={selectedWeekdays.includes(day.value)}
                    onChange={(event) =>
                      setSelectedWeekdays((current) =>
                        event.target.checked
                          ? [...current, day.value].sort()
                          : current.filter((item) => item !== day.value),
                      )
                    }
                  />
                  {day.label}
                </label>
              ))}
            </div>
            <button
              type="button"
              className="text-button"
              onClick={() =>
                setSelectedWeekdays(weekdays.map((day) => day.value))
              }
            >
              每日
            </button>
          </fieldset>
        )}
        {kind === "weekly" && (
          <>
            <label htmlFor="plan-weekly-target">每周目标次数（1–7）</label>
            <input
              id="plan-weekly-target"
              type="number"
              inputMode="numeric"
              min={1}
              max={7}
              step={1}
              value={weeklyTarget}
              onChange={(event) => setWeeklyTarget(event.target.value)}
              aria-invalid={errorField === "plan-weekly-target"}
            />
          </>
        )}
        {kind === "one_time" ? (
          <>
            <label htmlFor="plan-due-date">截止日期</label>
            <input
              id="plan-due-date"
              type="date"
              min={todayAt(timezone)}
              value={dueDate}
              onChange={(event) => setDueDate(event.target.value)}
              aria-invalid={errorField === "plan-due-date"}
            />
          </>
        ) : (
          <>
            <label htmlFor="plan-end-date">结束日期（可选）</label>
            <input
              id="plan-end-date"
              type="date"
              value={endDate}
              onChange={(event) => setEndDate(event.target.value)}
              aria-invalid={errorField === "plan-end-date"}
            />
          </>
        )}
        <fieldset className="plan-fieldset">
          <legend>数值记录（可选）</legend>
          <p className="hint">
            每个计划最多一个数值项，仅用于回顾，不自动决定成败。
          </p>
          <label htmlFor="plan-numeric-label">名称</label>
          <input
            id="plan-numeric-label"
            value={numericLabel}
            onChange={(event) => setNumericLabel(event.target.value)}
            placeholder="例如 距离"
            aria-invalid={errorField === "plan-numeric-label"}
          />
          <label htmlFor="plan-numeric-unit">单位</label>
          <input
            id="plan-numeric-unit"
            value={numericUnit}
            onChange={(event) => setNumericUnit(event.target.value)}
            placeholder="例如 公里"
          />
        </fieldset>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <div className="form-actions">
          <button className="primary-button" type="submit" disabled={busy}>
            {busy ? "正在保存…" : "保存计划"}
          </button>
          <PlanLink
            href="/plans"
            onNavigate={onNavigate}
            className="text-button"
          >
            取消
          </PlanLink>
        </div>
      </form>
    </section>
  );
}

function PlanDetail({
  id,
  onNavigate,
}: {
  id: string;
  onNavigate: (path: string) => void;
}) {
  const [plan, setPlan] = useState<PlanDto | null>(null);
  const [error, setError] = useState("");
  const [pendingAction, setPendingAction] = useState<
    "pause" | "resume" | "archive" | "delete" | null
  >(null);
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(false);
  useEffect(() => {
    let cancelled = false;
    void getPlan(id)
      .then((result) => {
        if (!cancelled) setPlan(result);
      })
      .catch((caught: unknown) => {
        if (!cancelled) setError(message(caught));
      });
    return () => {
      cancelled = true;
    };
  }, [id]);
  async function confirmAction() {
    if (!plan || !pendingAction || busy) return;
    setBusy(true);
    setError("");
    try {
      if (pendingAction === "delete") {
        await deletePlan(plan.id, plan.revision);
        onNavigate("/plans");
      } else {
        setPlan(
          await changePlanLifecycle(plan.id, pendingAction, plan.revision),
        );
        setPendingAction(null);
      }
    } catch (caught) {
      setError(message(caught));
    } finally {
      setBusy(false);
    }
  }
  const actionText = {
    pause: "暂停计划",
    resume: "恢复计划",
    archive: "归档计划",
    delete: "永久删除计划",
  } as const;
  return (
    <section
      className="content-panel"
      data-page-key="plan-detail"
      data-lifecycle={plan?.lifecycle}
      data-rule-version={plan?.ruleVersion}
      data-numeric-version={plan?.numericItem?.version}
    >
      <PlanLink href="/plans" onNavigate={onNavigate} className="text-button">
        ← 返回计划
      </PlanLink>
      {!plan && !error && <p role="status">正在读取计划…</p>}
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      {plan && (
        <>
          <p className="eyebrow">
            {plan.kind === "one_time"
              ? "一次性任务"
              : plan.kind === "weekly"
                ? "周目标"
                : "固定星期"}
          </p>
          <h1>{plan.title}</h1>
          <div className="settings-card plan-detail-card">
            <dl>
              <dt>状态</dt>
              <dd>{lifecycleLabels[plan.lifecycle]}</dd>
              <dt>方向</dt>
              <dd>{plan.direction === "avoid" ? "不要做" : "要做"}</dd>
              <dt>计划时区</dt>
              <dd>{plan.timezone}</dd>
              <dt>开始日期</dt>
              <dd>{plan.startDate}</dd>
              {plan.dueDate && (
                <>
                  <dt>截止日期</dt>
                  <dd>{plan.dueDate}</dd>
                </>
              )}
              {plan.endDate && (
                <>
                  <dt>结束日期</dt>
                  <dd>{plan.endDate}</dd>
                </>
              )}
              {plan.kind === "fixed" &&
                plan.rule &&
                "weekdays" in plan.rule && (
                  <>
                    <dt>固定星期</dt>
                    <dd>
                      {plan.rule.weekdays
                        .map(
                          (day) =>
                            weekdays.find((item) => item.value === day)?.label,
                        )
                        .join("、")}
                    </dd>
                  </>
                )}
              {plan.kind === "weekly" &&
                plan.rule &&
                "weeklyTarget" in plan.rule && (
                  <>
                    <dt>每周目标</dt>
                    <dd>{plan.rule.weeklyTarget} 次</dd>
                  </>
                )}
              {plan.numericItem && (
                <>
                  <dt>数值项</dt>
                  <dd>
                    {plan.numericItem.label}（{plan.numericItem.unit}）
                  </dd>
                </>
              )}
              <dt>规则版本</dt>
              <dd>
                V{plan.ruleVersion}，{plan.ruleEffectiveDate} 生效
              </dd>
            </dl>
            {plan.description && <p>{plan.description}</p>}
          </div>
          {plan.kind === "one_time" && <OneTimeResult plan={plan} />}
          {plan.kind !== "one_time" && <PlanHistory plan={plan} />}
          <PlanStatistics planId={plan.id} revision={plan.revision} />
          <ShareManager plan={plan} />
          <div className="plan-lifecycle-actions" aria-label="计划状态操作">
            {plan.lifecycle !== "archived" && (
              <button
                type="button"
                className="secondary-button"
                onClick={() => setEditing((value) => !value)}
              >
                {editing ? "收起编辑" : "编辑计划"}
              </button>
            )}
            {plan.lifecycle === "active" && (
              <button
                type="button"
                className="secondary-button"
                onClick={() => setPendingAction("pause")}
              >
                暂停
              </button>
            )}
            {(plan.lifecycle === "paused" || plan.lifecycle === "archived") && (
              <button
                type="button"
                className="secondary-button"
                onClick={() => setPendingAction("resume")}
              >
                恢复
              </button>
            )}
            {plan.lifecycle !== "archived" && (
              <button
                type="button"
                className="secondary-button"
                onClick={() => setPendingAction("archive")}
              >
                归档
              </button>
            )}
            <button
              type="button"
              className="text-button"
              onClick={() => setPendingAction("delete")}
            >
              删除
            </button>
          </div>
          {editing && plan.lifecycle !== "archived" && (
            <PlanEdit
              key={`${plan.id}-${plan.revision}`}
              plan={plan}
              onSaved={(next) => {
                setPlan(next);
                setEditing(false);
              }}
            />
          )}
          {pendingAction && (
            <ModalDialog
              className="plan-confirm"
              labelledBy="plan-confirm-title"
              describedBy="plan-confirm-detail"
              onClose={() => {
                if (!busy) setPendingAction(null);
              }}
            >
              <h2 id="plan-confirm-title">确认{actionText[pendingAction]}？</h2>
              <p id="plan-confirm-detail">
                {pendingAction === "delete"
                  ? "此操作不可撤销。计划、打卡记录、照片和分享将不可读；如需保留历史，请选择归档。"
                  : pendingAction === "archive"
                    ? "归档后保留历史记录，暂停未来打卡与提醒，之后可以恢复。"
                    : pendingAction === "pause"
                      ? "暂停后未来义务停止；恢复时按新生效日期继续。"
                      : "恢复后按计划规则继续，历史记录保持原样。"}
              </p>
              <div className="form-actions">
                <button
                  type="button"
                  className="primary-button"
                  disabled={busy}
                  onClick={() => void confirmAction()}
                >
                  {busy ? "处理中…" : `确认${actionText[pendingAction]}`}
                </button>
                <button
                  type="button"
                  className="secondary-button"
                  disabled={busy}
                  data-initial-focus
                  onClick={() => setPendingAction(null)}
                >
                  取消
                </button>
                {pendingAction === "delete" && (
                  <button
                    type="button"
                    className="text-button"
                    disabled={busy}
                    onClick={() => setPendingAction("archive")}
                  >
                    改为归档
                  </button>
                )}
              </div>
            </ModalDialog>
          )}
        </>
      )}
    </section>
  );
}

export function PlansPage({
  path,
  onNavigate,
}: {
  path: string;
  onNavigate: (path: string) => void;
}) {
  if (path === "/plans/new") return <PlanCreate onNavigate={onNavigate} />;
  if (path.startsWith("/plans/"))
    return (
      <PlanDetail
        id={path.slice("/plans/".length).split("?")[0] ?? ""}
        onNavigate={onNavigate}
      />
    );
  return <PlanList onNavigate={onNavigate} />;
}
