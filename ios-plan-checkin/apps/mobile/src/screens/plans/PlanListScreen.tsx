import { useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import type { NavigationProp } from "@react-navigation/native";
import { useNavigation } from "@react-navigation/native";
import { useQuery } from "@tanstack/react-query";
import type { PlanDto, PlanKind, PlanLifecycle } from "@plan-checkin/contracts";
import { Pressable, Text, View } from "react-native";
import { useAppServices } from "../../data/services";
import { ScreenState, StatusNotice } from "../../components/ScreenState";
import type { RootStackParamList } from "../../navigation/navigation";
import { Choice, PlanScreen, planPalette, planStyles } from "./ui";
import { kindLabels } from "./planForm";

const tabs: { status: PlanLifecycle; label: string }[] = [
  { status: "active", label: "进行中" },
  { status: "paused", label: "已暂停" },
  { status: "archived", label: "已归档" },
];
const kinds: { kind: PlanKind; label: string; description: string }[] = [
  { kind: "fixed", label: "固定日期", description: "选择每周打卡日" },
  { kind: "weekly", label: "每周目标", description: "设定每周完成次数" },
  { kind: "one_time", label: "一次性任务", description: "在截止日前完成" },
];
function ruleText(plan: PlanDto): string {
  if (plan.kind === "one_time") return `截止 ${plan.dueDate}`;
  if (plan.rule && "weeklyTarget" in plan.rule)
    return `每周 ${plan.rule.weeklyTarget} 次`;
  if (plan.rule && "weekdays" in plan.rule)
    return `每周 ${plan.rule.weekdays.map((day) => "一二三四五六日"[day - 1]).join("、")}`;
  return kindLabels[plan.kind];
}
export function PlanListScreen() {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const { repository } = useAppServices();
  const [status, setStatus] = useState<PlanLifecycle>("active");
  const [showKinds, setShowKinds] = useState(false);
  const plans = useQuery({
    queryKey: ["plans", "with-source"],
    queryFn: () => repository.listPlansWithSource(),
  });
  const groups = useQuery({
    queryKey: ["groups"],
    queryFn: () => repository.listGroups(),
  });
  const visible =
    plans.data?.items.filter((plan) => plan.lifecycle === status) ?? [];
  const grouped = new Map<string | null, PlanDto[]>();
  for (const plan of visible)
    grouped.set(plan.groupId, [...(grouped.get(plan.groupId) ?? []), plan]);
  const orderedGroups = [...grouped].sort(([left], [right]) => {
    if (left === null) return 1;
    if (right === null) return -1;
    const leftGroup = groups.data?.find((group) => group.id === left);
    const rightGroup = groups.data?.find((group) => group.id === right);
    return (leftGroup?.sortOrder ?? 0) - (rightGroup?.sortOrder ?? 0);
  });
  return (
    <PlanScreen>
      <View style={[planStyles.row, { justifyContent: "space-between" }]}>
        <Text testID="plans.list.title" style={planStyles.title}>
          我的计划
        </Text>
        <Pressable
          testID="plans.list.add"
          accessibilityRole="button"
          accessibilityLabel="创建计划"
          hitSlop={8}
          onPress={() => setShowKinds(!showKinds)}
        >
          <Ionicons name="add-circle" size={29} color={planPalette.primary} />
        </Pressable>
      </View>
      <Text style={planStyles.subtitle}>
        按自己的节奏，把重要的事慢慢完成。
      </Text>
      {showKinds ? (
        <View testID="plans.list.kind-menu" style={planStyles.card}>
          {kinds.map((item) => (
            <Pressable
              key={item.kind}
              testID={`plans.list.create-${item.kind}`}
              accessibilityRole="button"
              onPress={() => {
                setShowKinds(false);
                navigation.navigate("CreatePlan", { kind: item.kind });
              }}
              style={{ paddingVertical: 9 }}
            >
              <Text style={planStyles.cardTitle}>{item.label}</Text>
              <Text style={planStyles.body}>{item.description}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}
      <View style={[planStyles.row, { marginTop: 24 }]}>
        {tabs.map((tab) => (
          <Choice
            key={tab.status}
            testID={`plans.list.tab-${tab.status}`}
            label={tab.label}
            selected={status === tab.status}
            onPress={() => setStatus(tab.status)}
          />
        ))}
      </View>
      <Text
        testID="plans.list.count"
        style={[planStyles.subtitle, { marginTop: 12 }]}
      >
        {visible.length} 项计划
      </Text>
      {plans.data?.source === "local" ? (
        <StatusNotice
          kind="offline"
          testID="plans.list.offline"
          message="当前离线，显示本机上次同步的计划。计划修改需联网。"
        />
      ) : null}
      {plans.isPending ? (
        <ScreenState
          kind="loading"
          testID="plans.list.loading"
          message="正在读取计划…"
        />
      ) : null}
      {plans.isError ? (
        <ScreenState
          kind="error"
          testID="plans.list.error"
          message="暂时无法读取计划，请检查网络"
          onRetry={() => void plans.refetch()}
        />
      ) : null}
      {!plans.isPending && !plans.isError && visible.length === 0 ? (
        <View testID="plans.list.empty" style={planStyles.card}>
          <Text style={planStyles.cardTitle}>
            {status === "active"
              ? "还没有进行中的计划"
              : status === "paused"
                ? "没有暂停的计划"
                : "没有归档的计划"}
          </Text>
          <Text style={[planStyles.body, { marginTop: 6 }]}>
            点右上角的＋，开始一个新计划。
          </Text>
        </View>
      ) : null}
      {orderedGroups.map(([groupId, items]) => (
        <View
          key={groupId ?? "ungrouped"}
          testID={`plans.list.group-${groupId ?? "none"}`}
        >
          <Text
            style={[planStyles.cardTitle, { marginTop: 26, marginBottom: 3 }]}
          >
            {groups.data?.find((group) => group.id === groupId)?.name ??
              "未分组"}
          </Text>
          <Text
            testID={`plans.list.group-count-${groupId ?? "none"}`}
            style={planStyles.body}
          >
            {items.length} 项计划
          </Text>
          {items.map((plan) => (
            <View
              key={plan.id}
              testID={`plans.list.plan-${plan.id}`}
              style={planStyles.card}
            >
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`${plan.title}，${ruleText(plan)}`}
                onPress={() =>
                  navigation.navigate("PlanDetail", { planId: plan.id })
                }
                style={[planStyles.row, { justifyContent: "space-between" }]}
              >
                <Text style={planStyles.cardTitle}>{plan.title}</Text>
                <Ionicons
                  name="chevron-forward"
                  size={17}
                  color={planPalette.secondary}
                />
              </Pressable>
              <Text style={[planStyles.body, { marginTop: 8 }]}>
                {ruleText(plan)} ·{" "}
                {plan.direction === "avoid" ? "要避免" : "要完成"}
              </Text>
              <View style={[planStyles.wrap, { marginTop: 12 }]}>
                {plan.lifecycle !== "archived" ? (
                  <Choice
                    testID={`plans.list.edit-${plan.id}`}
                    label="编辑"
                    onPress={() =>
                      navigation.navigate("EditPlan", { planId: plan.id })
                    }
                  />
                ) : null}
                <Choice
                  testID={`plans.list.action-${plan.id}`}
                  label="管理"
                  onPress={() =>
                    navigation.navigate("PlanConfirmations", {
                      planId: plan.id,
                    })
                  }
                />
              </View>
            </View>
          ))}
        </View>
      ))}
      <Choice
        testID="plans.list.manage-groups"
        label="管理分组"
        onPress={() => navigation.navigate("GroupManagement")}
      />
    </PlanScreen>
  );
}
