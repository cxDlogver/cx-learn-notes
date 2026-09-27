import { useSyncExternalStore } from "react";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, type NavigationProp } from "@react-navigation/native";
import { useQuery } from "@tanstack/react-query";
import type { TodayItemDto } from "@plan-checkin/contracts";
import { Pressable, Text, View } from "react-native";
import { useAppServices } from "../../data/services";
import type { RootStackParamList } from "../../navigation/navigation";
import { ErrorText, PlanScreen, planPalette, planStyles } from "../plans/ui";

const dateLabel = (date: string): string => {
  const [year, month, day] = date.split("-");
  return `${year}年${Number(month)}月${Number(day)}日`;
};
const statusText: Record<string, string> = {
  due: "待记录",
  pending: "待完成",
  success: "已成功",
  failure: "已失败",
  skip: "已跳过",
  completed: "已完成",
  failed: "已失败",
  goal_met: "本周已达标",
  missed: "未记录",
  overdue: "已逾期",
  cancelled: "已取消",
};

function TodayCard({
  item,
  onPress,
}: {
  item: TodayItemDto;
  onPress: () => void;
}) {
  const label =
    item.plan.kind === "one_time"
      ? "一次性任务"
      : item.plan.kind === "weekly"
        ? "本周可记录"
        : item.plan.direction === "avoid"
          ? "不要做"
          : "要做";
  const status = statusText[item.status] ?? item.status;
  return (
    <Pressable
      testID={`today.card.${item.plan.id}`}
      accessibilityRole="button"
      accessibilityLabel={`${item.plan.title}，${label}，${status}`}
      onPress={onPress}
      style={({ pressed }) => [
        planStyles.card,
        { opacity: pressed ? 0.72 : 1 },
      ]}
    >
      <View style={[planStyles.row, { justifyContent: "space-between" }]}>
        <Text style={{ color: planPalette.primary, fontSize: 12 }}>
          {label}
        </Text>
        <Text
          testID={`today.card.status.${item.plan.id}`}
          style={{ color: planPalette.secondary, fontSize: 12 }}
        >
          {status}
        </Text>
      </View>
      <Text style={[planStyles.cardTitle, { marginTop: 9 }]}>
        {item.plan.title}
      </Text>
      {item.plan.kind === "weekly" && item.weeklyProgress ? (
        <Text style={[planStyles.body, { marginTop: 8 }]}>
          本周 {item.weeklyProgress.successes}/{item.weeklyProgress.target} 次
        </Text>
      ) : null}
      {item.plan.kind === "one_time" && item.plan.dueDate ? (
        <Text style={[planStyles.body, { marginTop: 8 }]}>
          截止 {item.plan.dueDate}
        </Text>
      ) : null}
      <Text
        style={[planStyles.body, { marginTop: 10, color: planPalette.primary }]}
      >
        {item.plan.kind === "one_time"
          ? "查看任务"
          : item.record
            ? "查看或修改记录"
            : "记录今天"}{" "}
        ›
      </Text>
    </Pressable>
  );
}

export function TodayScreen() {
  const { repository, todaySession } = useAppServices();
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  useSyncExternalStore(
    todaySession.subscribe,
    todaySession.getSnapshot,
    todaySession.getSnapshot,
  );
  const query = useQuery({
    queryKey: ["today"],
    queryFn: () => repository.getToday(),
  });
  const today = query.data ? todaySession.merge(query.data) : null;
  const items = today?.items ?? [];
  const actionable = items.filter(
    (item) => item.plan.kind !== "weekly" && item.plan.kind !== "one_time",
  );
  const weekly = items.filter((item) => item.plan.kind === "weekly");
  const once = items.filter((item) => item.plan.kind === "one_time");
  const open = (item: TodayItemDto) => {
    navigation.navigate("Checkin", {
      planId: item.plan.id,
      businessDate: item.planBusinessDate,
      mode: item.record ? "edit" : "today",
      ruleVersion: item.activeRuleVersion,
    });
  };
  return (
    <PlanScreen>
      <View
        testID="today.header"
        style={[planStyles.row, { justifyContent: "space-between" }]}
      >
        <View>
          <Text testID="today.date" style={planStyles.title}>
            {today ? dateLabel(today.viewDate) : "今天"}
          </Text>
          <Text style={planStyles.subtitle}>
            {today ? `显示时区：${today.viewTimezone}` : "正在读取今日计划"}
          </Text>
        </View>
        <Ionicons
          name="person-circle-outline"
          size={35}
          color={planPalette.primary}
        />
      </View>
      {query.data?.source === "local" ? (
        <Text testID="today.offline" style={planStyles.notice}>
          当前离线，显示本机计划和记录。新记录会保存到本机，联网后同步。
        </Text>
      ) : null}
      {query.isPending ? (
        <Text style={[planStyles.subtitle, { marginTop: 24 }]}>
          正在读取今日计划…
        </Text>
      ) : null}
      {query.isError ? (
        <>
          <ErrorText message="暂时无法读取今日计划，请检查网络" />
          <Pressable
            accessibilityRole="button"
            onPress={() => void query.refetch()}
          >
            <Text style={{ color: planPalette.primary, marginTop: 12 }}>
              重试
            </Text>
          </Pressable>
        </>
      ) : null}
      {today && items.length === 0 ? (
        <View
          testID="today.empty"
          style={{ alignItems: "center", paddingTop: 110 }}
        >
          <Ionicons
            name="calendar-clear-outline"
            size={54}
            color={planPalette.primary}
          />
          <Text style={[planStyles.cardTitle, { marginTop: 22 }]}>
            今天没有待处理的计划
          </Text>
          <Text
            style={[planStyles.body, { marginTop: 9, textAlign: "center" }]}
          >
            先创建一个计划，开始记录每一天
          </Text>
          <Pressable
            testID="today.empty.create"
            accessibilityRole="button"
            onPress={() => navigation.navigate("CreatePlan", { kind: "fixed" })}
            style={{
              marginTop: 25,
              backgroundColor: planPalette.primary,
              paddingHorizontal: 23,
              paddingVertical: 14,
              borderRadius: 12,
            }}
          >
            <Text style={{ color: "#FFF", fontWeight: "600" }}>新建计划</Text>
          </Pressable>
        </View>
      ) : null}
      {actionable.length ? (
        <Text
          testID="today.section.actionable"
          style={[planStyles.cardTitle, { marginTop: 30 }]}
        >
          需要处理
        </Text>
      ) : null}
      {actionable.map((item) => (
        <TodayCard key={item.plan.id} item={item} onPress={() => open(item)} />
      ))}
      {weekly.length ? (
        <Text
          testID="today.section.weekly"
          style={[planStyles.cardTitle, { marginTop: 28 }]}
        >
          本周可记录
        </Text>
      ) : null}
      {weekly.map((item) => (
        <TodayCard key={item.plan.id} item={item} onPress={() => open(item)} />
      ))}
      {once.length ? (
        <Text
          testID="today.section.deadline"
          style={[planStyles.cardTitle, { marginTop: 28 }]}
        >
          临近截止
        </Text>
      ) : null}
      {once.map((item) => (
        <TodayCard key={item.plan.id} item={item} onPress={() => open(item)} />
      ))}
    </PlanScreen>
  );
}
