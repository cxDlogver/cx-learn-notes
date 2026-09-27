import { useEffect, useState } from "react";
import * as Notifications from "expo-notifications";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useQuery } from "@tanstack/react-query";
import type { PlanDto, ReminderDto, Weekday } from "@plan-checkin/contracts";
import {
  Alert,
  Linking,
  Platform,
  Pressable,
  Switch,
  Text,
  View,
} from "react-native";
import { useAppServices } from "../../data/services";
import { ScreenState } from "../../components/ScreenState";
import {
  Choice,
  ErrorText,
  PlanScreen,
  Submit,
  planPalette,
  planStyles,
} from "./ui";

const dayNames = ["一", "二", "三", "四", "五", "六", "日"] as const;
const defaultTime = "20:00";

function summary(
  plan: PlanDto,
  enabled: boolean,
  time: string,
  days: Weekday[],
  lead: 0 | 1 | 3,
): string {
  if (!enabled) return "提醒已关闭";
  if (plan.kind === "one_time")
    return `${lead === 0 ? "截止当天" : `提前 ${lead} 天`} ${time} 提醒`;
  const chosen =
    plan.kind === "fixed" && plan.rule && "weekdays" in plan.rule
      ? plan.rule.weekdays
      : days;
  const names = chosen.map((day) => `周${dayNames[day - 1]}`).join("、");
  return `${names || "未选择星期"} ${time} 提醒${plan.kind === "weekly" ? "；本周达标后停止" : ""}`;
}

function ReminderCard({
  plan,
  onPermissionChange,
}: {
  plan: PlanDto;
  onPermissionChange: (granted: boolean) => void;
}) {
  const { repository, queryClient, reminders } = useAppServices();
  const rule = useQuery({
    queryKey: ["reminder", plan.id],
    queryFn: () => repository.getReminder(plan.id),
  });
  const [enabled, setEnabled] = useState(false);
  const [time, setTime] = useState(defaultTime);
  const [weekdays, setWeekdays] = useState<Weekday[]>([]);
  const [lead, setLead] = useState<0 | 1 | 3>(0);
  const [picker, setPicker] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (!rule.data) return;
    setEnabled(rule.data.enabled);
    setTime(rule.data.timeLocal ?? defaultTime);
    setWeekdays(rule.data.weekdays);
    setLead(rule.data.daysBeforeDue ?? 0);
  }, [rule.data]);
  const current = rule.data;
  const changed = Boolean(
    current &&
    (enabled !== current.enabled ||
      time !== (current.timeLocal ?? defaultTime) ||
      (plan.kind === "weekly" &&
        weekdays.join(",") !== current.weekdays.join(",")) ||
      (plan.kind === "one_time" && lead !== (current.daysBeforeDue ?? 0))),
  );
  const toggle = () => {
    if (!enabled) {
      Alert.alert(
        "开启打卡提醒",
        "应用会在你设置的时间发送本地提醒。系统通知权限会在首次开启时请求。",
        [
          { text: "取消", style: "cancel" },
          {
            text: "继续",
            onPress: () => {
              setEnabled(true);
              setError(null);
            },
          },
        ],
      );
    } else {
      setEnabled(false);
      setError(null);
    }
  };
  const save = async () => {
    if (!current || saving) return;
    if (enabled && plan.kind === "weekly" && weekdays.length === 0) {
      setError("请至少选择一个提醒星期");
      return;
    }
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) {
      setError("提醒时间格式应为 HH:mm");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const updated: ReminderDto = await repository.putReminder(plan.id, {
        enabled,
        timeLocal: time,
        ...(plan.kind === "weekly" ? { weekdays } : {}),
        ...(plan.kind === "one_time" ? { daysBeforeDue: lead } : {}),
        baseRevision: current.revision,
      });
      queryClient.setQueryData(["reminder", plan.id], updated);
      if (enabled) {
        try {
          const before = await Notifications.getPermissionsAsync();
          const after =
            !before.granted && before.canAskAgain
              ? await Notifications.requestPermissionsAsync()
              : before;
          onPermissionChange(after.granted);
        } catch {
          onPermissionChange(false);
        }
      } else await reminders?.cancelPlan(plan.id).catch(() => {});
      void reminders?.trigger().catch(() => {});
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "保存失败，请联网后重试",
      );
      await rule.refetch();
    } finally {
      setSaving(false);
    }
  };
  const toggleDay = (day: Weekday) => {
    setWeekdays((currentDays) =>
      currentDays.includes(day)
        ? currentDays.filter((value) => value !== day)
        : [...currentDays, day].sort((a, b) => a - b),
    );
    setError(null);
  };
  if (rule.isPending)
    return (
      <ScreenState
        kind="loading"
        testID={`reminders.${plan.id}.loading`}
        message="正在读取提醒…"
      />
    );
  if (rule.isError || !current)
    return (
      <ScreenState
        kind="error"
        testID={`reminders.${plan.id}.error`}
        message="无法读取提醒规则"
        onRetry={() => void rule.refetch()}
      />
    );
  return (
    <View testID={`reminders.${plan.id}.card`} style={{ marginTop: 28 }}>
      <Text style={planStyles.label}>
        {plan.kind === "fixed"
          ? "固定日期计划"
          : plan.kind === "weekly"
            ? "每周目标计划"
            : "一次性任务"}{" "}
        · {plan.title}
      </Text>
      <View style={planStyles.card}>
        <View
          style={[
            planStyles.row,
            { justifyContent: "space-between", minHeight: 44 },
          ]}
        >
          <Text style={planStyles.cardTitle}>提醒</Text>
          <Switch
            testID={`reminders.${plan.id}.enabled`}
            accessibilityLabel={`${plan.title}提醒`}
            value={enabled}
            onValueChange={toggle}
            trackColor={{ true: planPalette.primary }}
          />
        </View>
        {plan.kind === "fixed" ? (
          <Text style={[planStyles.body, { marginTop: 8 }]}>
            仅在计划选中的星期提醒
          </Text>
        ) : plan.kind === "weekly" ? (
          <View style={{ marginTop: 12 }}>
            <Text style={planStyles.label}>提醒星期</Text>
            <View style={[planStyles.row, { justifyContent: "space-between" }]}>
              {dayNames.map((name, index) => {
                const day = (index + 1) as Weekday;
                const selected = weekdays.includes(day);
                return (
                  <Pressable
                    key={day}
                    testID={`reminders.${plan.id}.weekday-${day}`}
                    accessibilityRole="button"
                    accessibilityLabel={`周${name}`}
                    accessibilityState={{ selected }}
                    onPress={() => toggleDay(day)}
                    style={{
                      width: 38,
                      height: 38,
                      borderRadius: 19,
                      backgroundColor: selected
                        ? planPalette.primary
                        : planPalette.surface,
                      borderWidth: selected ? 0 : 1,
                      borderColor: planPalette.border,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Text
                      style={{
                        color: selected ? "#FFF" : planPalette.secondary,
                      }}
                    >
                      {name}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            <Text style={[planStyles.body, { marginTop: 12 }]}>
              达标后本周将停止提醒
            </Text>
          </View>
        ) : (
          <View style={{ marginTop: 12 }}>
            <Text style={planStyles.body}>默认关闭，开启后可选择提醒时机</Text>
            <View style={[planStyles.wrap, { marginTop: 10 }]}>
              {([0, 1, 3] as const).map((days) => (
                <Choice
                  key={days}
                  testID={`reminders.${plan.id}.lead-${days}`}
                  label={days === 0 ? "截止当天" : `提前${days}天`}
                  selected={lead === days}
                  onPress={() => setLead(days)}
                />
              ))}
            </View>
          </View>
        )}
        <Pressable
          testID={`reminders.${plan.id}.time`}
          accessibilityRole="button"
          accessibilityLabel={`${plan.title}提醒时间 ${time}`}
          onPress={() => setPicker(true)}
          style={[
            planStyles.row,
            {
              justifyContent: "space-between",
              borderTopWidth: 1,
              borderTopColor: planPalette.border,
              marginTop: 16,
              paddingTop: 14,
              minHeight: 44,
            },
          ]}
        >
          <Text style={planStyles.cardTitle}>提醒时间</Text>
          <Text style={planStyles.body}>{time} ›</Text>
        </Pressable>
        {picker ? (
          <DateTimePicker
            mode="time"
            display={Platform.OS === "ios" ? "spinner" : "default"}
            value={new Date(`2000-01-01T${time}:00`)}
            onChange={(_, value) => {
              if (value)
                setTime(
                  `${String(value.getHours()).padStart(2, "0")}:${String(value.getMinutes()).padStart(2, "0")}`,
                );
              if (Platform.OS !== "ios") setPicker(false);
            }}
          />
        ) : null}
        {picker && Platform.OS === "ios" ? (
          <Choice
            testID={`reminders.${plan.id}.time-done`}
            label="完成"
            onPress={() => setPicker(false)}
          />
        ) : null}
      </View>
      <Text
        testID={`reminders.${plan.id}.summary`}
        style={[planStyles.subtitle, { marginLeft: 3 }]}
      >
        {summary(plan, enabled, time, weekdays, lead)}
      </Text>
      <ErrorText message={error} />
      {changed ? (
        <Submit
          testID={`reminders.${plan.id}.save`}
          label="保存提醒设置"
          pending={saving}
          onPress={() => void save()}
        />
      ) : null}
    </View>
  );
}

export function RemindersScreen({ planId }: { planId?: string }) {
  const { repository } = useAppServices();
  const plans = useQuery({
    queryKey: ["plans"],
    queryFn: () => repository.listPlans(),
  });
  const [permission, setPermission] = useState<boolean | null>(null);
  useEffect(() => {
    void Notifications.getPermissionsAsync()
      .then((value) => setPermission(value.granted))
      .catch(() => setPermission(false));
  }, []);
  const shown =
    plans.data?.filter(
      (plan) =>
        plan.lifecycle !== "archived" && (!planId || plan.id === planId),
    ) ?? [];
  return (
    <PlanScreen>
      {plans.isPending ? (
        <ScreenState
          kind="loading"
          testID="reminders.loading"
          message="正在读取计划…"
        />
      ) : null}
      {plans.isError ? (
        <ScreenState
          kind="error"
          testID="reminders.error"
          message="无法读取计划，请联网重试"
          onRetry={() => void plans.refetch()}
        />
      ) : null}
      {plans.isSuccess && shown.length === 0 ? (
        <ScreenState
          kind="empty"
          testID="reminders.empty"
          message="还没有可设置提醒的计划"
        />
      ) : null}
      {shown.map((plan) => (
        <ReminderCard
          key={plan.id}
          plan={plan}
          onPermissionChange={setPermission}
        />
      ))}
      <Text style={[planStyles.label, { marginTop: 36 }]}>系统通知权限</Text>
      <View style={planStyles.card}>
        <Text testID="reminders.permission" style={planStyles.body}>
          {permission === false
            ? "系统通知已关闭，提醒规则仍会保存。请前往系统设置开启通知。"
            : permission === true
              ? "系统通知已开启"
              : "通知权限只在首次开启提醒时请求"}
        </Text>
        {permission === false ? (
          <Choice
            testID="reminders.open-settings"
            label="前往系统设置"
            onPress={() => void Linking.openSettings()}
          />
        ) : null}
      </View>
    </PlanScreen>
  );
}
