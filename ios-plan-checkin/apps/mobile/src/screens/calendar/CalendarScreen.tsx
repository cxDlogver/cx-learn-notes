import { useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, type NavigationProp } from "@react-navigation/native";
import { useQuery } from "@tanstack/react-query";
import type { CalendarEntryDto } from "@plan-checkin/contracts";
import { businessDateAt } from "@plan-checkin/domain";
import { Pressable, Text, View } from "react-native";
import { useAppServices } from "../../data/services";
import type { RootStackParamList } from "../../navigation/navigation";
import {
  Choice,
  ErrorText,
  PlanScreen,
  planPalette,
  planStyles,
} from "../plans/ui";
import { dayState, monthCells, shiftMonth } from "./calendarModel";

const weekdays = ["一", "二", "三", "四", "五", "六", "日"];
const stateLabel: Record<string, string> = {
  success: "已记录成功",
  failure: "已记录失败",
  skip: "已跳过",
  unrecorded: "未记录",
  pending: "待完成",
  due: "待记录",
  completed: "已完成",
  late_completed: "逾期完成",
  overdue: "已逾期",
  failed: "已失败",
  cancelled: "已取消",
  future: "未到日期",
};
const dotColor: Record<string, string> = {
  success: planPalette.primary,
  failure: planPalette.danger,
  unrecorded: planPalette.secondary,
  skip: "#6A608D",
  none: "transparent",
};
function formatMonth(month: string): string {
  const [year, number] = month.split("-");
  return `${year}年${Number(number)}月`;
}
function dayTitle(date: string): string {
  const value = new Date(`${date}T12:00:00Z`);
  return `${Number(date.slice(5, 7))}月${Number(date.slice(8))}日 周${weekdays[(value.getUTCDay() + 6) % 7]}`;
}

export function CalendarScreen({ planId }: { planId?: string }) {
  const { repository } = useAppServices();
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const today: string = businessDateAt(new Date(), "Asia/Shanghai");
  const [month, setMonth] = useState(today.slice(0, 7));
  const [date, setDate] = useState<string>(today);
  const [groupId, setGroupId] = useState<string | undefined>();
  const calendar = useQuery({
    queryKey: ["calendar", planId ?? "all", month, groupId ?? "all"],
    queryFn: () =>
      planId
        ? repository.getPlanCalendar(planId, month)
        : repository.getCalendar(month, groupId),
  });
  const groups = useQuery({
    queryKey: ["groups"],
    queryFn: () => repository.listGroups(),
  });
  const byDate = new Map(
    calendar.data?.days.map((item) => [item.businessDate, item]) ?? [],
  );
  const selected = byDate.get(date);
  const changeMonth = (delta: number) => {
    const next = shiftMonth(month, delta);
    setMonth(next);
    setDate(next === today.slice(0, 7) ? today : `${next}-01`);
  };
  const openEntry = (entry: CalendarEntryDto) => {
    if (entry.status === "future") return;
    if (entry.kind === "one_time") {
      navigation.navigate("PlanDetail", { planId: entry.planId });
      return;
    }
    navigation.navigate("Checkin", {
      planId: entry.planId,
      businessDate: entry.businessDate,
      mode: entry.recordId
        ? "edit"
        : entry.businessDate === businessDateAt(new Date(), entry.timezone)
          ? "today"
          : "backfill",
      ruleVersion: entry.ruleVersion,
    });
  };
  return (
    <PlanScreen>
      <View
        testID="calendar.month-header"
        style={[planStyles.row, { justifyContent: "space-between" }]}
      >
        <Pressable
          testID="calendar.previous"
          accessibilityRole="button"
          accessibilityLabel="上个月"
          onPress={() => changeMonth(-1)}
          style={{ padding: 9 }}
        >
          <Ionicons name="chevron-back" size={20} color={planPalette.text} />
        </Pressable>
        <Text style={planStyles.title}>{formatMonth(month)}</Text>
        <Pressable
          testID="calendar.next"
          accessibilityRole="button"
          accessibilityLabel="下个月"
          onPress={() => changeMonth(1)}
          style={{ padding: 9 }}
        >
          <Ionicons name="chevron-forward" size={20} color={planPalette.text} />
        </Pressable>
      </View>
      <Pressable
        testID="calendar.today"
        accessibilityRole="button"
        onPress={() => {
          setMonth(today.slice(0, 7));
          setDate(today);
        }}
        style={{ alignSelf: "center", marginTop: 7 }}
      >
        <Text style={{ color: planPalette.primary }}>今天</Text>
      </Pressable>
      {!planId && groups.data?.length ? (
        <View
          testID="calendar.group-filter"
          style={[planStyles.wrap, { marginTop: 20 }]}
        >
          <Choice
            label="全部计划"
            selected={!groupId}
            onPress={() => setGroupId(undefined)}
            testID="calendar.group.all"
          />
          {groups.data.map((group) => (
            <Choice
              key={group.id}
              label={group.name}
              selected={groupId === group.id}
              onPress={() => setGroupId(group.id)}
              testID={`calendar.group.${group.id}`}
            />
          ))}
        </View>
      ) : null}
      {calendar.data?.source === "local" ? (
        <Text testID="calendar.offline" style={planStyles.notice}>
          当前离线，显示上次同步的日历和本机待同步记录。
        </Text>
      ) : null}
      {calendar.data?.pendingCount ? (
        <Text testID="calendar.pending" style={planStyles.notice}>
          {calendar.data.pendingCount} 条记录已保存到本机，等待同步。
        </Text>
      ) : null}
      <View
        testID="calendar.grid"
        style={[
          planStyles.card,
          { marginTop: 24, flexDirection: "row", flexWrap: "wrap" },
        ]}
      >
        {weekdays.map((label) => (
          <View
            key={label}
            style={{
              width: "14.2857%",
              alignItems: "center",
              paddingVertical: 10,
            }}
          >
            <Text style={planStyles.body}>{label}</Text>
          </View>
        ))}
        {monthCells(month).map((cell, index) => {
          const state = dayState(cell ? byDate.get(cell) : undefined);
          return (
            <View
              key={cell ?? `blank-${index}`}
              style={{ width: "14.2857%", minHeight: 53, alignItems: "center" }}
            >
              {cell ? (
                <Pressable
                  testID={`calendar.day.${cell}`}
                  accessibilityRole="button"
                  accessibilityLabel={`${dayTitle(cell)}，${state === "none" ? "无记录" : stateLabel[state]}`}
                  accessibilityState={{ selected: cell === date }}
                  onPress={() => setDate(cell)}
                  style={{
                    width: 39,
                    height: 48,
                    alignItems: "center",
                    justifyContent: "center",
                    borderRadius: 12,
                    backgroundColor:
                      cell === today
                        ? planPalette.primary
                        : cell === date
                          ? planPalette.pale
                          : "transparent",
                    borderWidth: cell === date && cell !== today ? 1.5 : 0,
                    borderColor: planPalette.primary,
                  }}
                >
                  <Text
                    style={{
                      color:
                        cell === today
                          ? "#FFFFFF"
                          : cell === date
                            ? planPalette.primary
                            : planPalette.text,
                      fontWeight: cell === date ? "700" : "400",
                    }}
                  >
                    {Number(cell.slice(8))}
                  </Text>
                  <View
                    style={{
                      width: 5,
                      height: 5,
                      borderRadius: 3,
                      marginTop: 4,
                      backgroundColor: dotColor[state],
                    }}
                  />
                </Pressable>
              ) : null}
            </View>
          );
        })}
      </View>
      <View style={[planStyles.wrap, { marginTop: 11 }]}>
        {(
          [
            ["success", "全部成功"],
            ["failure", "有失败"],
            ["unrecorded", "未记录"],
          ] as const
        ).map(([state, label]) => (
          <View key={state} style={planStyles.row}>
            <View
              style={{
                width: 7,
                height: 7,
                borderRadius: 4,
                backgroundColor: dotColor[state],
              }}
            />
            <Text style={planStyles.body}>{label}</Text>
          </View>
        ))}
      </View>
      {calendar.isPending ? (
        <Text style={[planStyles.subtitle, { marginTop: 20 }]}>
          正在读取日历…
        </Text>
      ) : null}
      {calendar.isError ? (
        <>
          <ErrorText message="暂时无法读取日历，请检查网络" />
          <Choice
            label="重试"
            testID="calendar.retry"
            onPress={() => void calendar.refetch()}
          />
        </>
      ) : null}
      <Text
        testID="calendar.selected-date"
        style={[planStyles.cardTitle, { marginTop: 30 }]}
      >
        {dayTitle(date)}
      </Text>
      {calendar.data && !selected?.entries.length ? (
        <Text
          testID="calendar.empty-day"
          style={[planStyles.body, { marginTop: 13 }]}
        >
          这一天没有记录
        </Text>
      ) : null}
      {selected?.entries.map((entry) => (
        <Pressable
          key={`${entry.planId}:${entry.businessDate}`}
          testID={`calendar.entry.${entry.planId}`}
          accessibilityRole="button"
          accessibilityLabel={`${entry.title}，${stateLabel[entry.status] ?? entry.status}`}
          onPress={() => openEntry(entry)}
          style={planStyles.card}
        >
          <View style={[planStyles.row, { justifyContent: "space-between" }]}>
            <Text style={planStyles.cardTitle}>{entry.title}</Text>
            <Text
              style={{
                color:
                  entry.status === "failure" || entry.status === "failed"
                    ? planPalette.danger
                    : entry.status === "unrecorded"
                      ? planPalette.secondary
                      : planPalette.primary,
              }}
            >
              {stateLabel[entry.status] ?? entry.status}
            </Text>
          </View>
          <Text style={[planStyles.body, { marginTop: 7 }]}>
            {entry.kind === "fixed"
              ? "固定日期"
              : entry.kind === "weekly"
                ? "每周目标"
                : "一次性任务"}{" "}
            · {entry.timezone} · 规则版本 {entry.ruleVersion}
          </Text>
          <Text style={[planStyles.body, { marginTop: 7 }]}>
            {entry.isBackfilled ? "已补记 · " : ""}
            {entry.isRevised ? "已修改 · " : ""}
            {entry.recordId
              ? "查看或修改"
              : entry.businessDate < today && entry.kind !== "one_time"
                ? "补记"
                : "查看"}
          </Text>
        </Pressable>
      ))}
    </PlanScreen>
  );
}
