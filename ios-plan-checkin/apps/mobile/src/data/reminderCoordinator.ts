import * as Notifications from "expo-notifications";
import {
  addCalendarDays,
  businessDateAt,
  mondayOfWeek,
  reminderOccurrences,
  type BusinessDate,
  type ReminderOccurrence,
} from "@plan-checkin/domain";
import type {
  PlanDto,
  ReminderDto,
  TodayDto,
  Weekday,
} from "@plan-checkin/contracts";
import type { AppRepository } from "./repository";
import type { LocalCache } from "./localCache";

const marker = "plan-checkin-reminder-v1";
const limit = 50; // Leave room under iOS's pending-local-notification cap.
interface Desired extends ReminderOccurrence {
  revision: number;
}

function identifier(accountId: string, occurrence: Desired): string {
  return `${marker}:${accountId}:${occurrence.planId}:${occurrence.businessDate}:${occurrence.revision}`;
}
function isOwned(item: Notifications.NotificationRequest): boolean {
  return item.content.data?.kind === marker;
}

/** Reconcile a short, bounded queue; the server remains the source of reminder rules. */
export class ReminderCoordinator {
  private running: Promise<void> | null = null;
  private rerun = false;
  private stopped = false;

  constructor(
    private readonly repository: AppRepository,
    private readonly cache: LocalCache,
    private readonly accountId: () => string | null,
  ) {}

  start(): void {
    this.stopped = false;
  }
  stop(): void {
    this.stopped = true;
  }
  trigger(): Promise<void> {
    if (this.stopped) return Promise.resolve();
    if (this.running) {
      this.rerun = true;
      return this.running;
    }
    this.running = (async () => {
      do {
        this.rerun = false;
        await this.reconcile();
      } while (this.rerun && !this.stopped);
    })().finally(() => {
      this.running = null;
    });
    return this.running;
  }

  async cancelPlan(planId: string): Promise<void> {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    await Promise.all(
      scheduled
        .filter((item) => isOwned(item) && item.content.data?.planId === planId)
        .map((item) =>
          Notifications.cancelScheduledNotificationAsync(item.identifier),
        ),
    );
  }
  async cancelAccount(accountId: string): Promise<void> {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    await Promise.all(
      scheduled
        .filter(
          (item) => isOwned(item) && item.content.data?.accountId === accountId,
        )
        .map((item) =>
          Notifications.cancelScheduledNotificationAsync(item.identifier),
        ),
    );
  }
  async cancelForDate(planId: string, businessDate: string): Promise<void> {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    await Promise.all(
      scheduled
        .filter(
          (item) =>
            isOwned(item) &&
            item.content.data?.planId === planId &&
            item.content.data?.businessDate === businessDate,
        )
        .map((item) =>
          Notifications.cancelScheduledNotificationAsync(item.identifier),
        ),
    );
  }

  private async pruneLocal(
    accountId: string,
    scheduled: Notifications.NotificationRequest[],
  ): Promise<void> {
    for (const item of scheduled) {
      if (!isOwned(item)) continue;
      if (item.content.data?.accountId !== accountId) {
        await Notifications.cancelScheduledNotificationAsync(item.identifier);
        continue;
      }
      const planId = item.content.data?.planId;
      const date = item.content.data?.businessDate;
      if (typeof planId !== "string" || typeof date !== "string") continue;
      const record = await this.cache
        .checkin(accountId, planId, date)
        .catch(() => null);
      if (record)
        await Notifications.cancelScheduledNotificationAsync(item.identifier);
    }
  }

  private async desired(accountId: string): Promise<Desired[]> {
    const now = new Date();
    const [plans, today] = await Promise.all([
      this.repository.listPlans(),
      this.repository.getToday(),
    ]);
    const active = plans.filter((plan) => plan.lifecycle === "active");
    const reminders = await Promise.all(
      active.map((plan) => this.repository.getReminder(plan.id)),
    );
    const candidates = await Promise.all(
      active.map(async (plan, index) =>
        this.planOccurrences(accountId, plan, reminders[index]!, today, now),
      ),
    );
    return candidates
      .flat()
      .sort((a, b) => a.when.getTime() - b.when.getTime())
      .slice(0, limit);
  }

  private async planOccurrences(
    accountId: string,
    plan: PlanDto,
    reminder: ReminderDto,
    today: TodayDto,
    now: Date,
  ): Promise<Desired[]> {
    if (!reminder.enabled || !reminder.timeLocal) return [];
    const date = businessDateAt(now, plan.timezone);
    const item = today.items.find((entry) => entry.plan.id === plan.id);
    const local = await this.cache.checkinsForView(accountId, "", plan.id);
    const recorded = new Set<BusinessDate>(
      local.map((entry) => entry.record.businessDate as BusinessDate),
    );
    if (item?.record) recorded.add(item.planBusinessDate as BusinessDate);
    let terminal = false;
    let currentWeekSuccesses = item?.weeklyProgress?.successes ?? 0;
    if (plan.kind === "weekly" || plan.kind === "one_time") {
      try {
        const detail = await this.repository.getPlanDetail(plan.id);
        if (detail.statistics.kind === "one_time")
          terminal = !["pending", "overdue"].includes(detail.statistics.state);
        if (plan.kind === "weekly") {
          const monday = mondayOfWeek(date);
          const next = addCalendarDays(monday, 7);
          const latest = new Map(
            detail.recentRecords.map((entry) => [
              entry.businessDate,
              entry.status,
            ]),
          );
          for (const entry of local)
            latest.set(entry.record.businessDate, entry.record.result);
          currentWeekSuccesses = [...latest].filter(
            ([day, status]) =>
              day >= monday && day < next && status === "success",
          ).length;
        }
      } catch {
        // Preserve the last server summary if a detail snapshot is unavailable offline.
      }
    }
    return reminderOccurrences(
      {
        id: plan.id,
        title: plan.title,
        kind: plan.kind,
        lifecycle: plan.lifecycle,
        timezone: plan.timezone,
        startDate: plan.startDate as BusinessDate,
        endDate: plan.endDate as BusinessDate | null,
        dueDate: plan.dueDate as BusinessDate | null,
        fixedWeekdays:
          plan.kind === "fixed" && plan.rule && "weekdays" in plan.rule
            ? (plan.rule.weekdays as Weekday[])
            : [],
        fixedTodayEligible:
          plan.kind === "fixed" && plan.ruleEffectiveDate > date
            ? Boolean(item)
            : undefined,
        weeklyTarget:
          plan.kind === "weekly" && plan.rule && "weeklyTarget" in plan.rule
            ? plan.rule.weeklyTarget
            : null,
        terminal,
        recordedDates: [...recorded],
        currentWeekSuccesses,
        reminder: {
          enabled: reminder.enabled,
          timeLocal: reminder.timeLocal,
          weekdays: reminder.weekdays,
          daysBeforeDue: reminder.daysBeforeDue,
        },
      },
      now,
    ).map((occurrence) => ({ ...occurrence, revision: reminder.revision }));
  }

  private async reconcile(): Promise<void> {
    const accountId = this.accountId();
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    if (!accountId) {
      await Promise.all(
        scheduled
          .filter(isOwned)
          .map((item) =>
            Notifications.cancelScheduledNotificationAsync(item.identifier),
          ),
      );
      return;
    }
    await this.pruneLocal(accountId, scheduled);
    const permissions = await Notifications.getPermissionsAsync();
    if (!permissions.granted) return;
    let desired: Desired[];
    try {
      desired = await this.desired(accountId);
    } catch {
      // Keep previously scheduled items when the server cannot provide a fresh rule snapshot.
      return;
    }
    if (this.accountId() !== accountId || this.stopped) return;
    const wanted = new Map(
      desired.map((item) => [identifier(accountId, item), item]),
    );
    const present = new Set<string>();
    for (const old of scheduled.filter(isOwned)) {
      if (wanted.has(old.identifier)) present.add(old.identifier);
      else await Notifications.cancelScheduledNotificationAsync(old.identifier);
    }
    for (const [id, item] of wanted) {
      if (present.has(id) || this.accountId() !== accountId || this.stopped)
        continue;
      await Notifications.scheduleNotificationAsync({
        identifier: id,
        content: {
          title: "计划打卡",
          body: "查看计划安排",
          data: {
            kind: marker,
            accountId,
            planId: item.planId,
            businessDate: item.businessDate,
          },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: item.when,
        },
      });
    }
  }
}
