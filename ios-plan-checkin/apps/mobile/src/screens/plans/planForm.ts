import type {
  CreatePlanRequest,
  PlanDto,
  PlanKind,
  UpdatePlanRequest,
  Weekday,
} from "@plan-checkin/contracts";
import { businessDateAt } from "@plan-checkin/domain";

export const weekdays: { value: Weekday; label: string }[] = [
  { value: 1, label: "一" },
  { value: 2, label: "二" },
  { value: 3, label: "三" },
  { value: 4, label: "四" },
  { value: 5, label: "五" },
  { value: 6, label: "六" },
  { value: 7, label: "日" },
];
export const kindLabels: Record<PlanKind, string> = {
  fixed: "固定日期",
  weekly: "每周目标",
  one_time: "一次性任务",
};
export const planTimezone = (): string =>
  Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Shanghai";
export const todayIn = (zone: string): string =>
  businessDateAt(new Date(), zone);
export const pickerDate = (date: string): Date => {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(year!, month! - 1, day!, 12);
};
export const dateFromPicker = (date: Date): string =>
  [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");

export interface PlanDraft {
  title: string;
  description: string;
  direction: "do" | "avoid";
  groupId: string | null;
  startDate: string;
  endDate: string | null;
  dueDate: string;
  weekdays: Weekday[];
  weeklyTarget: number;
}
export function initialDraft(kind: PlanKind, existing?: PlanDto): PlanDraft {
  const zone = existing?.timezone ?? planTimezone();
  const today = todayIn(zone);
  return {
    title: existing?.title ?? "",
    description: existing?.description ?? "",
    direction: existing?.direction ?? "do",
    groupId: existing?.groupId ?? null,
    startDate: existing?.startDate ?? today,
    endDate: existing?.endDate ?? null,
    dueDate: existing?.dueDate ?? today,
    weekdays:
      existing?.rule && "weekdays" in existing.rule
        ? existing.rule.weekdays
        : [1, 2, 3, 4, 5],
    weeklyTarget:
      existing?.rule && "weeklyTarget" in existing.rule
        ? existing.rule.weeklyTarget
        : 3,
  };
}
export function validateDraft(
  kind: PlanKind,
  draft: PlanDraft,
  zone: string,
): string | null {
  if (!draft.title.trim() || draft.title.trim().length > 80)
    return "计划名称需为 1–80 个字符";
  if (draft.description.trim().length > 1000) return "备注不能超过 1000 个字符";
  if (kind === "one_time") {
    if (draft.dueDate < todayIn(zone)) return "截止日期不能早于今天";
    if (draft.dueDate < draft.startDate) return "截止日期不能早于开始日期";
    return null;
  }
  if (draft.endDate && draft.endDate < draft.startDate)
    return "结束日期不能早于开始日期";
  if (kind === "fixed" && draft.weekdays.length === 0) return "至少选择一天";
  if (kind === "weekly" && (draft.weeklyTarget < 1 || draft.weeklyTarget > 7))
    return "每周目标需为 1–7 次";
  return null;
}
export function createRequest(
  kind: PlanKind,
  draft: PlanDraft,
  zone: string,
): CreatePlanRequest {
  const base = {
    title: draft.title.trim(),
    description: draft.description.trim() || null,
    timezone: zone,
    groupId: draft.groupId,
  };
  if (kind === "one_time")
    return {
      ...base,
      kind,
      direction: "do",
      startDate: todayIn(zone),
      dueDate: draft.dueDate,
    };
  const shared = {
    ...base,
    direction: draft.direction,
    startDate: draft.startDate,
    endDate: draft.endDate,
  };
  return kind === "fixed"
    ? { ...shared, kind, rule: { weekdays: [...draft.weekdays].sort() } }
    : { ...shared, kind, rule: { weeklyTarget: draft.weeklyTarget } };
}
export function updateRequest(
  existing: PlanDto,
  draft: PlanDraft,
): UpdatePlanRequest {
  const request: UpdatePlanRequest = { baseRevision: existing.revision };
  if (draft.title.trim() !== existing.title) request.title = draft.title.trim();
  if ((draft.description.trim() || null) !== existing.description)
    request.description = draft.description.trim() || null;
  if (draft.groupId !== existing.groupId) request.groupId = draft.groupId;
  if (existing.kind === "one_time") {
    if (draft.dueDate !== existing.dueDate) request.dueDate = draft.dueDate;
  } else {
    if (draft.endDate !== existing.endDate) request.endDate = draft.endDate;
    const nextRule =
      existing.kind === "fixed"
        ? { weekdays: [...draft.weekdays].sort() }
        : { weeklyTarget: draft.weeklyTarget };
    if (JSON.stringify(nextRule) !== JSON.stringify(existing.rule))
      request.rule = nextRule;
  }
  return request;
}
