import { useNavigation, type NavigationProp } from "@react-navigation/native";
import { useQuery } from "@tanstack/react-query";
import type {
  CalendarEntryDto,
  PlanDetailDto,
  PlanStatisticsDto,
} from "@plan-checkin/contracts";
import { businessDateAt } from "@plan-checkin/domain";
import { Pressable, Text, View } from "react-native";
import { useAppServices } from "../../data/services";
import { ScreenState, StatusNotice } from "../../components/ScreenState";
import type { RootStackParamList } from "../../navigation/navigation";
import { Choice, PlanScreen, planPalette, planStyles } from "./ui";

const statusCopy: Record<string, string> = {
  success: "已记录成功",
  failure: "已记录失败",
  skip: "已跳过",
  unrecorded: "未记录",
  pending: "待完成",
  overdue: "已逾期",
  completed: "已完成",
  late_completed: "逾期完成",
  failed: "已失败",
  cancelled: "已取消",
  due: "待记录",
  not_due: "今天无需记录",
  goal_met: "本周已达标",
  future: "未到日期",
};
const percent = (value: number | null): string =>
  value === null ? "暂无完整周期" : `${Math.round(value * 100)}%`;

function StatTile({
  title,
  value,
  testID,
}: {
  title: string;
  value: string;
  testID: string;
}) {
  return (
    <View
      testID={testID}
      style={[planStyles.card, { flex: 1, minWidth: 0, alignItems: "center" }]}
    >
      <Text style={planStyles.body}>{title}</Text>
      <Text style={[planStyles.title, { marginTop: 8 }]}>{value}</Text>
    </View>
  );
}
function StatSection({
  statistics,
  recentRecords,
}: {
  statistics: PlanStatisticsDto;
  recentRecords: CalendarEntryDto[];
}) {
  if (statistics.kind === "fixed")
    return (
      <>
        <View
          testID="detail.fixed.rate"
          style={[
            planStyles.card,
            { alignItems: "center", paddingVertical: 28 },
          ]}
        >
          <Text
            style={{
              color: planPalette.primary,
              fontSize: 42,
              fontWeight: "700",
            }}
          >
            {percent(statistics.completionRate)}
          </Text>
          <Text style={[planStyles.cardTitle, { marginTop: 5 }]}>完成率</Text>
          <Text
            style={[planStyles.body, { marginTop: 12, textAlign: "center" }]}
          >
            成功次数 ÷（已结束应打卡次数 − 跳过次数）；今天暂不计入
          </Text>
        </View>
        <View style={[planStyles.row, { gap: 8 }]}>
          <StatTile
            testID="detail.fixed.streak"
            title="连续成功"
            value={`${statistics.consecutiveDueSuccesses} 次`}
          />
          <StatTile
            testID="detail.fixed.success"
            title="成功"
            value={`${statistics.successCount} 次`}
          />
          <StatTile
            testID="detail.fixed.failure"
            title="失败"
            value={`${statistics.failureCount} 次`}
          />
        </View>
        <View style={planStyles.card}>
          <Text style={planStyles.cardTitle}>状态分布</Text>
          <View
            style={{
              height: 9,
              flexDirection: "row",
              borderRadius: 6,
              overflow: "hidden",
              marginTop: 18,
              backgroundColor: planPalette.border,
            }}
          >
            {(
              [
                [statistics.successCount, planPalette.primary],
                [statistics.failureCount, planPalette.danger],
                [statistics.skipCount, "#6A608D"],
                [statistics.unrecordedCount, planPalette.secondary],
              ] as const
            )
              .filter(([count]) => count > 0)
              .map(([count, color], index) => (
                <View
                  key={index}
                  style={{ flex: count, backgroundColor: color }}
                />
              ))}
          </View>
          <Text style={[planStyles.body, { marginTop: 12 }]}>
            成功 {statistics.successCount} · 失败 {statistics.failureCount} ·
            跳过 {statistics.skipCount} · 未记录 {statistics.unrecordedCount}
          </Text>
        </View>
      </>
    );
  if (statistics.kind === "weekly")
    return (
      <>
        <View
          testID="detail.weekly.progress"
          style={[
            planStyles.card,
            { alignItems: "center", paddingVertical: 26 },
          ]}
        >
          <Text style={planStyles.body}>每周目标</Text>
          <Text
            style={{
              color: planPalette.primary,
              fontSize: 42,
              fontWeight: "700",
              marginTop: 9,
            }}
          >
            {statistics.currentWeek.successes} /{" "}
            {statistics.currentWeek.target ?? "—"}
          </Text>
          <Text style={[planStyles.body, { marginTop: 5 }]}>本周进度</Text>
          <View
            style={{
              width: "100%",
              height: 9,
              backgroundColor: planPalette.border,
              borderRadius: 5,
              marginTop: 23,
            }}
          >
            <View
              style={{
                width: `${Math.round((statistics.currentWeek.progressRate ?? 0) * 100)}%`,
                height: 9,
                backgroundColor: planPalette.primary,
                borderRadius: 5,
              }}
            />
          </View>
          <Text style={[planStyles.body, { marginTop: 13 }]}>
            本周内任意时间可记录，周日结束后重新开始计算
          </Text>
        </View>
        <View style={[planStyles.row, { gap: 10 }]}>
          <StatTile
            testID="detail.weekly.rate"
            title="历史达标周"
            value={`${statistics.attainedWeekCount} 周`}
          />
          <StatTile
            testID="detail.weekly.streak"
            title="连续达标周"
            value={`${statistics.consecutiveAttainedWeeks} 周`}
          />
        </View>
        <Text style={[planStyles.body, { marginTop: 10 }]}>
          历史达标率 {percent(statistics.attainmentRate)}，仅计算完整周。
        </Text>
        <View style={planStyles.card}>
          <Text style={planStyles.cardTitle}>本周</Text>
          <View
            style={[
              planStyles.row,
              { justifyContent: "space-between", marginTop: 16 },
            ]}
          >
            {[0, 1, 2, 3, 4, 5, 6].map((offset) => {
              const value = new Date(
                `${statistics.currentWeek.weekStartDate}T12:00:00Z`,
              );
              value.setUTCDate(value.getUTCDate() + offset);
              const date = value.toISOString().slice(0, 10);
              const entry = recentRecords.find(
                (record) => record.businessDate === date,
              );
              return (
                <View
                  key={offset}
                  style={{ alignItems: "center", minWidth: 30 }}
                >
                  <Text style={planStyles.body}>
                    {"一二三四五六日"[offset]}
                  </Text>
                  <Text
                    style={{
                      color:
                        entry?.status === "success"
                          ? planPalette.primary
                          : planPalette.secondary,
                      marginTop: 10,
                    }}
                  >
                    {entry?.status === "success"
                      ? "✓"
                      : entry?.status === "failure"
                        ? "×"
                        : entry?.status === "skip"
                          ? "−"
                          : "○"}
                  </Text>
                </View>
              );
            })}
          </View>
          <Text style={[planStyles.body, { marginTop: 12 }]}>
            空白日没有待办，可在本周任意一天完成。
          </Text>
        </View>
        <Text style={[planStyles.cardTitle, { marginTop: 28 }]}>
          历史周记录
        </Text>
        {statistics.completedWeeks.slice(0, 12).map((week) => (
          <View key={week.weekStartDate} style={planStyles.card}>
            <Text style={planStyles.cardTitle}>
              {week.weekStartDate} 开始的一周
            </Text>
            <Text style={[planStyles.body, { marginTop: 6 }]}>
              {week.successes} / {week.target ?? "—"} 次 ·{" "}
              {week.attained === null
                ? "部分周，不计入达标率"
                : week.attained
                  ? "已达标"
                  : "未达标"}{" "}
              · 规则版本 {week.ruleVersion ?? "—"}
            </Text>
          </View>
        ))}
      </>
    );
  return (
    <>
      <View
        testID="detail.once.state"
        style={[planStyles.card, { alignItems: "center", paddingVertical: 30 }]}
      >
        <Text
          style={{
            color:
              statistics.state === "overdue"
                ? planPalette.amber
                : planPalette.primary,
            fontSize: 26,
          }}
        >
          ◷
        </Text>
        <Text
          style={[
            planStyles.title,
            {
              marginTop: 13,
              color:
                statistics.state === "overdue"
                  ? planPalette.amber
                  : planPalette.primary,
            },
          ]}
        >
          {statusCopy[statistics.state] ?? statistics.state}
        </Text>
        <Text style={[planStyles.body, { marginTop: 10 }]}>
          截止日期 {statistics.dueDate}
        </Text>
      </View>
    </>
  );
}

export function PlanDetailScreen({ planId }: { planId: string }) {
  const { repository } = useAppServices();
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const detail = useQuery({
    queryKey: ["plan-detail", planId],
    queryFn: () => repository.getPlanDetail(planId),
  });
  const groups = useQuery({
    queryKey: ["groups"],
    queryFn: () => repository.listGroups(),
  });
  const data: PlanDetailDto | undefined = detail.data;
  const plan = data?.plan;
  const openRecord = (entry: CalendarEntryDto) =>
    navigation.navigate("Checkin", {
      planId: entry.planId,
      businessDate: entry.businessDate,
      mode: entry.recordId ? "edit" : "backfill",
      ruleVersion: entry.ruleVersion,
    });
  return (
    <PlanScreen>
      {detail.isPending ? (
        <ScreenState
          kind="loading"
          testID="detail.loading"
          message="正在读取计划详情…"
        />
      ) : null}
      {detail.isError ? (
        <ScreenState
          kind="error"
          testID="detail.error"
          message="暂时无法读取计划详情，请检查网络"
          onRetry={() => void detail.refetch()}
        />
      ) : null}
      {data && plan ? (
        <>
          {detail.data?.source === "local" ? (
            <StatusNotice
              kind="offline"
              testID="detail.offline"
              message="当前离线，显示上次同步的计划统计。本机新记录暂未计入统计。"
            />
          ) : null}
          {detail.data?.pendingCount ? (
            <StatusNotice
              kind="pending"
              testID="detail.pending"
              message={`${detail.data.pendingCount} 条本机记录等待同步，统计以云端截止日为准。`}
            />
          ) : null}
          <View style={[planStyles.row, { justifyContent: "space-between" }]}>
            <Text testID="detail.title" style={planStyles.title}>
              {plan.title}
            </Text>
            <Pressable
              testID="detail.edit"
              accessibilityRole="button"
              accessibilityLabel="编辑计划"
              onPress={() => navigation.navigate("EditPlan", { planId })}
              style={{
                minWidth: 44,
                minHeight: 44,
                alignItems: "flex-end",
                justifyContent: "center",
              }}
            >
              <Text style={{ color: planPalette.primary }}>编辑</Text>
            </Pressable>
          </View>
          <Pressable
            testID="detail.reminders"
            accessibilityRole="button"
            accessibilityLabel="设置此计划提醒"
            onPress={() => navigation.navigate("Reminders", { planId })}
            style={{ minHeight: 44, justifyContent: "center" }}
          >
            <Text style={{ color: planPalette.primary }}>提醒设置 ›</Text>
          </Pressable>
          <Text style={[planStyles.subtitle, { marginTop: 10 }]}>
            {plan.kind === "fixed"
              ? "固定日期"
              : plan.kind === "weekly"
                ? "每周目标"
                : "一次性任务"}{" "}
            · {plan.direction === "avoid" ? "不要做" : "要做"} ·{" "}
            {groups.data?.find((group) => group.id === plan.groupId)?.name ??
              "未分组"}
          </Text>
          {plan.description ? (
            <Text style={[planStyles.body, { marginTop: 12 }]}>
              {plan.description}
            </Text>
          ) : null}
          <Text
            testID="detail.timezone"
            style={[planStyles.body, { marginTop: 13 }]}
          >
            计划时区：{plan.timezone}
          </Text>
          <Text
            testID="detail.statistics-through"
            style={[planStyles.body, { marginTop: 5 }]}
          >
            统计截至：{data.statistics.statisticsThroughBusinessDate}
          </Text>
          <Text
            testID="detail.rule-versions"
            style={[planStyles.body, { marginTop: 5 }]}
          >
            使用的规则版本：
            {data.statistics.ruleVersions.length
              ? data.statistics.ruleVersions.join("、")
              : "暂无"}
          </Text>
          {plan.kind === "fixed" && plan.rule && "weekdays" in plan.rule ? (
            <Text style={[planStyles.body, { marginTop: 5 }]}>
              每周{" "}
              {plan.rule.weekdays
                .map((day) => "一二三四五六日"[day - 1])
                .join("、")}
              记录
            </Text>
          ) : null}
          {plan.kind === "weekly" &&
          plan.rule &&
          "weeklyTarget" in plan.rule ? (
            <Text style={[planStyles.body, { marginTop: 5 }]}>
              每周任选 {plan.rule.weeklyTarget} 天记录
            </Text>
          ) : null}
          <Text style={[planStyles.cardTitle, { marginTop: 30 }]}>
            记录与统计
          </Text>
          <StatSection
            statistics={data.statistics}
            recentRecords={data.recentRecords}
          />
          {plan.kind === "one_time" && data.statistics.kind === "one_time" ? (
            <>
              {plan.lifecycle === "active" &&
              ["pending", "overdue"].includes(data.statistics.state) ? (
                <View testID="detail.once.actions" style={planStyles.card}>
                  <Text style={planStyles.body}>
                    这项任务当前处于待处理状态
                  </Text>
                  <View style={[planStyles.wrap, { marginTop: 14 }]}>
                    {(
                      [
                        ["completed", "完成"],
                        ["failed", "未完成"],
                        ["cancelled", "取消任务"],
                      ] as const
                    ).map(([resolution, label]) => (
                      <Choice
                        key={resolution}
                        label={label}
                        testID={`detail.once.${resolution}`}
                        onPress={() =>
                          navigation.navigate("Checkin", {
                            planId,
                            businessDate: businessDateAt(
                              new Date(),
                              plan.timezone,
                            ),
                            mode: "today",
                            resolution,
                          })
                        }
                      />
                    ))}
                  </View>
                </View>
              ) : null}
              <Text style={[planStyles.cardTitle, { marginTop: 30 }]}>
                任务时间线
              </Text>
              <View style={planStyles.card}>
                <Text style={planStyles.body}>{plan.startDate} · 创建任务</Text>
                <Text style={[planStyles.body, { marginTop: 12 }]}>
                  {data.statistics.dueDate} · 截止日期
                  {data.statistics.state === "overdue"
                    ? "（已逾期，尚未处理）"
                    : ""}
                </Text>
                {data.statistics.resolution ? (
                  <Text style={[planStyles.body, { marginTop: 12 }]}>
                    {data.statistics.resolution.resolvedBusinessDate} ·{" "}
                    {statusCopy[data.statistics.state] ?? data.statistics.state}
                  </Text>
                ) : null}
              </View>
            </>
          ) : null}
          <View style={[planStyles.wrap, { marginTop: 25 }]}>
            <Choice
              label="查看计划日历"
              testID="detail.calendar"
              onPress={() => navigation.navigate("PlanCalendar", { planId })}
            />
            <Choice
              label="管理计划"
              testID="detail.manage"
              onPress={() =>
                navigation.navigate("PlanConfirmations", { planId })
              }
            />
            <Choice
              label="分享给朋友"
              testID="detail.share"
              onPress={() =>
                navigation.navigate("SelectShareFriend", { planId })
              }
            />
          </View>
          {plan.kind !== "one_time" ? (
            <>
              <Text style={[planStyles.cardTitle, { marginTop: 31 }]}>
                历史记录
              </Text>
              {!data.recentRecords.length ? (
                <Text style={[planStyles.body, { marginTop: 12 }]}>
                  还没有记录
                </Text>
              ) : null}
              {data.recentRecords.map((entry) => (
                <Pressable
                  key={`${entry.planId}:${entry.businessDate}`}
                  testID={`detail.record.${entry.businessDate}`}
                  accessibilityRole="button"
                  onPress={() => openRecord(entry)}
                  style={planStyles.card}
                >
                  <View
                    style={[
                      planStyles.row,
                      { justifyContent: "space-between" },
                    ]}
                  >
                    <Text style={planStyles.cardTitle}>
                      {entry.businessDate}
                    </Text>
                    <Text style={{ color: planPalette.primary }}>
                      {statusCopy[entry.status] ?? entry.status}
                    </Text>
                  </View>
                  <Text style={[planStyles.body, { marginTop: 7 }]}>
                    规则版本 {entry.ruleVersion}
                    {entry.isBackfilled ? " · 已补记" : ""}
                    {entry.isRevised ? " · 已修改" : ""}
                  </Text>
                </Pressable>
              ))}
            </>
          ) : null}
        </>
      ) : null}
    </PlanScreen>
  );
}
