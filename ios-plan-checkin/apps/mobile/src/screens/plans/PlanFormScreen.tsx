import { useLayoutEffect, useRef, useState } from "react";
import { useNavigation, type NavigationProp } from "@react-navigation/native";
import DateTimePicker from "@react-native-community/datetimepicker";
import * as Notifications from "expo-notifications";
import type { PlanDto, PlanKind, Weekday } from "@plan-checkin/contracts";
import { useQuery } from "@tanstack/react-query";
import { Alert, Platform, Pressable, Text, View } from "react-native";
import { useAppServices } from "../../data/services";
import { ScreenState } from "../../components/ScreenState";
import type { RootStackParamList } from "../../navigation/navigation";
import {
  Choice,
  ErrorText,
  FormField,
  PlanInput,
  PlanScreen,
  planStyles,
} from "./ui";
import {
  createRequest,
  dateFromPicker,
  initialDraft,
  kindLabels,
  pickerDate,
  planTimezone,
  todayIn,
  updateRequest,
  validateDraft,
  weekdays,
  type PlanDraft,
} from "./planForm";

type FormProps = {
  kind: PlanKind;
  existing?: PlanDto;
  initial?: PlanDraft;
  onDone: (plan: PlanDto) => void;
};
export function PlanFormScreen({ kind, existing, initial, onDone }: FormProps) {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const { repository, queryClient, reminders, registerPush } = useAppServices();
  const [draft, setDraft] = useState<PlanDraft>(
    () => initial ?? initialDraft(kind, existing),
  );
  const [picker, setPicker] = useState<
    "startDate" | "endDate" | "dueDate" | null
  >(null);
  const [reminder, setReminder] = useState(false);
  const [reminderTime, setReminderTime] = useState("20:00");
  const [reminderWeekdays, setReminderWeekdays] = useState<Weekday[]>([]);
  const [daysBeforeDue, setDaysBeforeDue] = useState<0 | 1 | 3>(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const zone = existing?.timezone ?? planTimezone();
  const today = todayIn(zone);
  const groups = useQuery({
    queryKey: ["groups"],
    queryFn: () => repository.listGroups(),
  });
  const update = <K extends keyof PlanDraft>(key: K, value: PlanDraft[K]) => {
    setDraft((current) => ({ ...current, [key]: value }));
    setError(null);
  };
  const ruleChanged = Boolean(existing && updateRequest(existing, draft).rule);
  async function save(): Promise<void> {
    if (saving) return;
    const invalid = validateDraft(kind, draft, zone);
    if (invalid) return setError(invalid);
    if (reminder && !/^([01]\d|2[0-3]):[0-5]\d$/.test(reminderTime))
      return setError("提醒时间格式应为 HH:mm");
    if (reminder && kind === "weekly" && reminderWeekdays.length === 0)
      return setError("请至少选择一个提醒星期");
    if (groups.isError) return setError("无法确认分组是否可用，请联网后重试");
    const changes = existing ? updateRequest(existing, draft) : null;
    if (changes && Object.keys(changes).length === 1)
      return setError("没有需要保存的修改");
    setSaving(true);
    setError(null);
    try {
      const request = createRequest(kind, draft, zone);
      const plan = existing
        ? await repository.updatePlan(existing.id, changes!)
        : await repository.createPlan({
            ...request,
            ...(reminder
              ? {
                  reminder: {
                    enabled: true,
                    timeLocal: reminderTime,
                    ...(kind === "fixed" ? { weekdays: draft.weekdays } : {}),
                    ...(kind === "weekly"
                      ? { weekdays: reminderWeekdays }
                      : {}),
                    ...(kind === "one_time" ? { daysBeforeDue } : {}),
                  },
                }
              : {}),
          });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["plans"] }),
        queryClient.invalidateQueries({ queryKey: ["today"] }),
        queryClient.invalidateQueries({ queryKey: ["calendar"] }),
      ]);
      queryClient.setQueryData(["plan", plan.id], plan);
      if (reminder) {
        try {
          const permission = await Notifications.getPermissionsAsync();
          if (!permission.granted && permission.canAskAgain)
            await Notifications.requestPermissionsAsync();
        } catch {
          // The plan is saved even if the system permission prompt is unavailable.
        }
        void registerPush().catch(() => {});
      }
      void reminders?.trigger().catch(() => {});
      onDone(plan);
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "保存失败，请检查网络后重试",
      );
      if (existing)
        void queryClient.invalidateQueries({ queryKey: ["plan", existing.id] });
    } finally {
      setSaving(false);
    }
  }
  const saveRef = useRef(save);
  saveRef.current = save;
  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <Pressable
          testID="plans.form.save"
          accessibilityRole="button"
          accessibilityLabel="保存计划"
          accessibilityState={{ busy: saving }}
          disabled={saving}
          onPress={() => void saveRef.current()}
        >
          <Text style={{ color: "#236B4A", fontSize: 16, fontWeight: "600" }}>
            {saving ? "保存中" : "保存"}
          </Text>
        </Pressable>
      ),
    });
  }, [navigation, saving]);
  const dateChoice = (
    key: "startDate" | "endDate" | "dueDate",
    label: string,
  ) => (
    <FormField label={label} testID={`plans.form.${key}-field`}>
      <Choice
        testID={`plans.form.${key}`}
        label={draft[key] ?? "不设置"}
        onPress={() => setPicker(picker === key ? null : key)}
      />
    </FormField>
  );
  return (
    <PlanScreen>
      <Text testID="plans.form.title" style={planStyles.cardTitle}>
        名称与方向
      </Text>
      <Text style={planStyles.subtitle}>
        计划时区：{zone}
        {existing ? "（创建后固定）" : "（创建后不可修改）"}
      </Text>
      {existing ? (
        <Text testID="plans.edit.impact" style={planStyles.notice}>
          修改不会重算历史记录。规则变更从下一个有效日期生效；本周修改每周目标时，本周统计可能显示为部分周。
        </Text>
      ) : null}
      <FormField label="计划名称" testID="plans.form.name-field">
        <PlanInput
          testID="plans.form.name"
          value={draft.title}
          onChangeText={(value) => update("title", value)}
          placeholder="给计划起个名字"
        />
      </FormField>
      <FormField label="计划方向" testID="plans.form.direction-field">
        <View style={planStyles.row}>
          <Choice
            testID="plans.form.direction-do"
            label="要完成"
            selected={draft.direction === "do"}
            disabled={Boolean(existing) || kind === "one_time"}
            onPress={() => update("direction", "do")}
          />
          <Choice
            testID="plans.form.direction-avoid"
            label="要避免"
            selected={draft.direction === "avoid"}
            disabled={Boolean(existing) || kind === "one_time"}
            onPress={() => update("direction", "avoid")}
          />
        </View>
      </FormField>
      {!existing && kind === "one_time" ? (
        <Text
          testID="plans.form.one-time-direction"
          style={planStyles.subtitle}
        >
          一次性任务用于完成一件事，方向固定为「要完成」。
        </Text>
      ) : null}
      <FormField label="所属分组" testID="plans.form.group-field">
        <View style={planStyles.wrap}>
          <Choice
            testID="plans.form.group-none"
            label="未分组"
            selected={!draft.groupId}
            onPress={() => update("groupId", null)}
          />
          {groups.data?.map((group) => (
            <Choice
              key={group.id}
              testID={`plans.form.group-${group.id}`}
              label={group.name}
              selected={draft.groupId === group.id}
              onPress={() => update("groupId", group.id)}
            />
          ))}
        </View>
        {groups.isError ? (
          <ErrorText message="分组加载失败，请联网重试" />
        ) : null}
      </FormField>
      {!existing ? (
        <FormField label="执行方式" testID="plans.form.kind-field">
          <View style={planStyles.wrap}>
            {(["fixed", "weekly", "one_time"] as PlanKind[]).map((option) => (
              <Choice
                key={option}
                testID={`plans.form.kind-${option}`}
                label={kindLabels[option]}
                selected={kind === option}
                onPress={() => {
                  if (kind !== option)
                    navigation.navigate("CreatePlan", {
                      kind: option,
                      draft: {
                        ...draft,
                        direction:
                          option === "one_time" ? "do" : draft.direction,
                        startDate:
                          option === "one_time" ? today : draft.startDate,
                      },
                    });
                }}
              />
            ))}
          </View>
        </FormField>
      ) : null}
      {kind === "fixed" ? (
        <FormField label="每周打卡日" testID="plans.form.weekdays-field">
          <View style={planStyles.wrap}>
            {weekdays.map((day) => (
              <Choice
                key={day.value}
                testID={`plans.form.weekday-${day.value}`}
                label={`周${day.label}`}
                selected={draft.weekdays.includes(day.value)}
                onPress={() =>
                  update(
                    "weekdays",
                    draft.weekdays.includes(day.value)
                      ? draft.weekdays.filter((value) => value !== day.value)
                      : [...draft.weekdays, day.value as Weekday],
                  )
                }
              />
            ))}
          </View>
        </FormField>
      ) : null}
      {kind === "weekly" ? (
        <FormField label="每周目标" testID="plans.form.weekly-target-field">
          <View style={planStyles.row}>
            <Choice
              testID="plans.form.weekly-decrement"
              label="−"
              onPress={() =>
                update("weeklyTarget", Math.max(1, draft.weeklyTarget - 1))
              }
            />
            <Text
              testID="plans.form.weekly-target"
              style={planStyles.cardTitle}
            >
              每周 {draft.weeklyTarget} 次
            </Text>
            <Choice
              testID="plans.form.weekly-increment"
              label="＋"
              onPress={() =>
                update("weeklyTarget", Math.min(7, draft.weeklyTarget + 1))
              }
            />
          </View>
        </FormField>
      ) : null}
      {kind === "one_time" ? (
        dateChoice("dueDate", "截止日期")
      ) : (
        <>
          {existing ? (
            <Text testID="plans.edit.start-locked" style={planStyles.notice}>
              开始日期 {draft.startDate} 已固定
            </Text>
          ) : (
            dateChoice("startDate", "开始日期")
          )}
          {dateChoice("endDate", "结束日期（可选）")}
          {draft.endDate ? (
            <Choice
              testID="plans.form.clear-end"
              label="清除结束日期"
              onPress={() => update("endDate", null)}
            />
          ) : null}
        </>
      )}
      {kind === "one_time" && !existing ? (
        <Text testID="plans.form.created-date" style={planStyles.subtitle}>
          创建日期：{today}
        </Text>
      ) : null}
      {picker ? (
        <View testID="plans.form.date-picker">
          <DateTimePicker
            mode="date"
            display={Platform.OS === "ios" ? "inline" : "default"}
            value={pickerDate(draft[picker] ?? today)}
            minimumDate={
              picker === "startDate" || picker === "dueDate"
                ? pickerDate(today)
                : pickerDate(draft.startDate > today ? draft.startDate : today)
            }
            onChange={(_event, value) => {
              if (!value) return;
              update(picker, dateFromPicker(value));
              if (Platform.OS !== "ios") setPicker(null);
            }}
          />
          {Platform.OS === "ios" ? (
            <Choice
              testID="plans.form.date-done"
              label="完成选择"
              onPress={() => setPicker(null)}
            />
          ) : null}
        </View>
      ) : null}
      {!existing ? (
        <FormField label="提醒" testID="plans.form.reminder-field">
          <Choice
            testID="plans.form.reminder"
            label={reminder ? "已开启提醒" : "不开启提醒"}
            selected={reminder}
            onPress={() =>
              reminder
                ? setReminder(false)
                : Alert.alert(
                    "开启打卡提醒",
                    "应用会在你选择的时间发送本地通知。保存计划时会请求系统通知权限。",
                    [
                      { text: "取消", style: "cancel" },
                      { text: "继续", onPress: () => setReminder(true) },
                    ],
                  )
            }
          />
          {reminder ? (
            <View>
              {kind === "weekly" ? (
                <View style={[planStyles.wrap, { marginTop: 10 }]}>
                  {weekdays.map((day) => (
                    <Choice
                      key={day.value}
                      testID={`plans.form.reminder-day-${day.value}`}
                      label={day.label}
                      selected={reminderWeekdays.includes(day.value)}
                      onPress={() =>
                        setReminderWeekdays((current) =>
                          current.includes(day.value)
                            ? current.filter((value) => value !== day.value)
                            : [...current, day.value].sort((a, b) => a - b),
                        )
                      }
                    />
                  ))}
                </View>
              ) : null}
              {kind === "one_time" ? (
                <View style={[planStyles.wrap, { marginTop: 10 }]}>
                  {([0, 1, 3] as const).map((days) => (
                    <Choice
                      key={days}
                      testID={`plans.form.reminder-lead-${days}`}
                      label={days === 0 ? "截止当天" : `提前${days}天`}
                      selected={daysBeforeDue === days}
                      onPress={() => setDaysBeforeDue(days)}
                    />
                  ))}
                </View>
              ) : null}
              <PlanInput
                testID="plans.form.reminder-time"
                value={reminderTime}
                onChangeText={setReminderTime}
                placeholder="提醒时间 HH:mm"
              />
            </View>
          ) : null}
        </FormField>
      ) : null}
      <FormField label="备注（可选）" testID="plans.form.description-field">
        <PlanInput
          testID="plans.form.description"
          value={draft.description}
          onChangeText={(value) => update("description", value)}
          placeholder="写下这项计划的说明"
          multiline
        />
      </FormField>
      {ruleChanged ? (
        <Text testID="plans.edit.rule-warning" style={planStyles.notice}>
          规则变更将生成新版本，历史记录仍按原规则保留。
        </Text>
      ) : null}
      <ErrorText message={error} />
      <Text style={planStyles.subtitle}>计划与分组的修改需要网络连接。</Text>
    </PlanScreen>
  );
}

export function EditPlanScreen({
  planId,
  onDone,
}: {
  planId: string;
  onDone: (plan: PlanDto) => void;
}) {
  const { repository } = useAppServices();
  const query = useQuery({
    queryKey: ["plan", planId],
    queryFn: () => repository.getPlan(planId),
  });
  if (query.isPending)
    return (
      <PlanScreen>
        <ScreenState
          kind="loading"
          testID="plans.edit.loading"
          message="正在读取计划…"
        />
      </PlanScreen>
    );
  if (query.isError)
    return (
      <PlanScreen>
        <ScreenState
          kind="error"
          testID="plans.edit.error"
          message="无法读取计划，请检查网络"
          onRetry={() => void query.refetch()}
        />
      </PlanScreen>
    );
  if (query.data.lifecycle === "archived")
    return (
      <PlanScreen>
        <ErrorText message="归档计划不可修改" />
      </PlanScreen>
    );
  return (
    <PlanFormScreen
      key={`${query.data.id}-${query.data.revision}`}
      kind={query.data.kind}
      existing={query.data}
      onDone={onDone}
    />
  );
}
