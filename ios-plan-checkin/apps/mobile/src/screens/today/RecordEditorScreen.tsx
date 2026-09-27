import { useEffect, useState } from "react";
import * as Crypto from "expo-crypto";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  CheckinResult,
  OneTimeResolution,
  PlanDto,
} from "@plan-checkin/contracts";
import { businessDateAt } from "@plan-checkin/domain";
import { Alert, Pressable, Text, View } from "react-native";
import { useAppServices } from "../../data/services";
import {
  Choice,
  ErrorText,
  FormField,
  PlanInput,
  PlanScreen,
  Submit,
  planPalette,
  planStyles,
} from "../plans/ui";

export type RecordMode = "today" | "edit" | "backfill";
export interface RecordEditorProps {
  planId: string;
  businessDate: string;
  mode?: RecordMode;
  ruleVersion?: number;
  onDone: () => void;
}

const results: { key: CheckinResult; label: string }[] = [
  { key: "success", label: "做到了" },
  { key: "failure", label: "未做到" },
  { key: "skip", label: "跳过" },
];
const oneTimeResults: { key: OneTimeResolution; label: string }[] = [
  { key: "completed", label: "已完成" },
  { key: "failed", label: "未完成" },
  { key: "cancelled", label: "取消任务" },
];
function resultLabel(plan: PlanDto, result: CheckinResult): string {
  if (plan.direction === "avoid")
    return result === "success"
      ? "成功避开"
      : result === "failure"
        ? "发生了"
        : "跳过记录";
  return results.find((item) => item.key === result)?.label ?? result;
}

export function RecordEditorScreen({
  planId,
  businessDate,
  mode = "today",
  ruleVersion,
  onDone,
}: RecordEditorProps) {
  const { repository, todaySession } = useAppServices();
  const queryClient = useQueryClient();
  const planQuery = useQuery({
    queryKey: ["plan", planId],
    queryFn: () => repository.getPlan(planId),
  });
  const recordQuery = useQuery({
    queryKey: ["checkin", planId, businessDate],
    queryFn: () => repository.getCheckin(planId, businessDate),
    enabled: mode === "edit" && Boolean(planQuery.data),
    retry: false,
  });
  const [result, setResult] = useState<CheckinResult | null>(null);
  const [note, setNote] = useState("");
  const [failureReason, setFailureReason] = useState("");
  const [numberValue, setNumberValue] = useState("");
  const [numberUnit, setNumberUnit] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedLocally, setSavedLocally] = useState(false);
  const [onceResult, setOnceResult] = useState<OneTimeResolution | null>(null);
  useEffect(() => {
    if (!recordQuery.data) return;
    setResult(recordQuery.data.result);
    setNote(recordQuery.data.note ?? "");
    setFailureReason(recordQuery.data.failureReason ?? "");
    setNumberValue(recordQuery.data.numeric?.value ?? "");
    setNumberUnit(recordQuery.data.numeric?.unit ?? "");
  }, [recordQuery.data]);
  const plan = planQuery.data;
  const nowDate = plan ? businessDateAt(new Date(), plan.timezone) : null;
  const isBackfill = Boolean(nowDate && businessDate < nowDate);
  const invalidDate = Boolean(
    plan &&
    nowDate &&
    (businessDate > nowDate ||
      businessDate < plan.startDate ||
      (plan.endDate && businessDate > plan.endDate)),
  );
  const validate = (): string | null => {
    if (!plan || !result) return "请选择本次结果";
    if (invalidDate) return "该日期不在可记录范围";
    if (plan.lifecycle !== "active") return "当前计划已暂停或归档";
    if (note.length > 2000) return "备注最多 2000 字";
    if (failureReason.length > 1000) return "未做到的原因最多 1000 字";
    if (
      numberValue &&
      (!/^-?(?:0|[1-9]\d{0,11})(?:\.\d{1,6})?$/.test(numberValue) ||
        !numberUnit.trim())
    )
      return "请输入有效的数值和单位";
    if (numberUnit.length > 30) return "单位最多 30 字";
    return null;
  };
  const save = async () => {
    const problem = validate();
    if (problem) {
      setError(problem);
      return;
    }
    if (!plan || !result) return;
    setPending(true);
    setError(null);
    try {
      const saved = await repository.saveCheckin(plan, businessDate, {
        result,
        note: note.trim() || null,
        failureReason:
          result === "failure" ? failureReason.trim() || null : null,
        numeric: numberValue
          ? { value: numberValue, unit: numberUnit.trim() }
          : null,
        mediaIds: recordQuery.data?.mediaIds ?? [],
        baseRevision: recordQuery.data?.revision ?? 0,
        clientCreatedAt: new Date().toISOString(),
        clientOperationId: Crypto.randomUUID(),
        ruleVersion:
          recordQuery.data?.ruleVersion ?? ruleVersion ?? plan.ruleVersion,
      });
      const today = queryClient.getQueryData<
        Awaited<ReturnType<typeof repository.getToday>>
      >(["today"]);
      const item = today?.items.find(
        (candidate) =>
          candidate.plan.id === plan.id &&
          candidate.planBusinessDate === businessDate,
      );
      if (item) todaySession.hold(item, saved.record);
      queryClient.setQueryData(["checkin", planId, businessDate], saved.record);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["today"] }),
        queryClient.invalidateQueries({ queryKey: ["calendar"] }),
        queryClient.invalidateQueries({ queryKey: ["plan-detail", planId] }),
      ]);
      if (saved.source === "local") {
        setSavedLocally(true);
        Alert.alert("已保存到本机", "记录会在联网后同步。", [
          { text: "知道了", onPress: onDone },
        ]);
      } else onDone();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "保存失败，请重试");
    } finally {
      setPending(false);
    }
  };
  const finishOnce = async () => {
    if (!onceResult || !plan) {
      setError("请选择任务结果");
      return;
    }
    setPending(true);
    setError(null);
    try {
      await repository.resolveOneTime(plan.id, {
        resolution: onceResult,
        baseRevision: 0,
        completedAt:
          onceResult === "completed" ? new Date().toISOString() : undefined,
        reason: note.trim() || undefined,
      });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["today"] }),
        queryClient.invalidateQueries({ queryKey: ["plan-detail", planId] }),
      ]);
      onDone();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "需要联网后重试");
    } finally {
      setPending(false);
    }
  };
  return (
    <PlanScreen>
      <View
        testID="record.editor.header"
        style={[planStyles.row, { justifyContent: "space-between" }]}
      >
        <Pressable accessibilityRole="button" onPress={onDone}>
          <Text style={{ color: planPalette.secondary }}>取消</Text>
        </Pressable>
        <Text style={planStyles.cardTitle}>
          {mode === "edit"
            ? "修改记录"
            : mode === "backfill" || isBackfill
              ? "补记"
              : "记录今天"}
        </Text>
        <View style={{ width: 32 }} />
      </View>
      {planQuery.isPending || (mode === "edit" && recordQuery.isPending) ? (
        <Text style={[planStyles.subtitle, { marginTop: 25 }]}>
          正在读取记录…
        </Text>
      ) : null}
      {planQuery.isError || recordQuery.isError ? (
        <ErrorText message="暂时无法读取计划或记录，请返回后重试" />
      ) : null}
      {plan ? (
        <>
          <Text
            testID="record.editor.plan"
            style={[planStyles.title, { marginTop: 28 }]}
          >
            {plan.title}
          </Text>
          <Text testID="record.editor.date" style={planStyles.subtitle}>
            计划日期 {businessDate} · {plan.timezone}
          </Text>
          {mode === "edit" ? (
            <Text style={planStyles.notice}>
              修改后以本次结果为准，原记录会保留修订痕迹。
            </Text>
          ) : null}
          {isBackfill ? (
            <Text style={planStyles.notice}>
              正在补记过去日期，请按当时实际情况填写。
            </Text>
          ) : null}
          {plan.kind === "one_time" ? (
            <>
              <Text style={[planStyles.cardTitle, { marginTop: 28 }]}>
                这项任务的结果
              </Text>
              <View style={[planStyles.wrap, { marginTop: 13 }]}>
                {oneTimeResults.map((item) => (
                  <Choice
                    key={item.key}
                    testID={`record.once.${item.key}`}
                    label={item.label}
                    selected={onceResult === item.key}
                    onPress={() => setOnceResult(item.key)}
                  />
                ))}
              </View>
              <Text style={[planStyles.subtitle, { marginTop: 18 }]}>
                一次性任务结果需联网保存。
              </Text>
            </>
          ) : (
            <>
              <Text style={[planStyles.cardTitle, { marginTop: 28 }]}>
                这次的结果
              </Text>
              <View style={[planStyles.wrap, { marginTop: 13 }]}>
                {results.map((item) => (
                  <Choice
                    key={item.key}
                    testID={`record.result.${item.key}`}
                    label={resultLabel(plan, item.key)}
                    selected={result === item.key}
                    onPress={() => setResult(item.key)}
                  />
                ))}
              </View>
              {result === "failure" ? (
                <FormField label="原因（可选）" testID="record.failure-reason">
                  <PlanInput
                    value={failureReason}
                    onChangeText={setFailureReason}
                    placeholder="写下这次的情况"
                    multiline
                    testID="record.failure-reason.input"
                  />
                </FormField>
              ) : null}
            </>
          )}
          <FormField label="备注（可选）" testID="record.note">
            <PlanInput
              value={note}
              onChangeText={setNote}
              placeholder="想记下什么？"
              multiline
              testID="record.note.input"
            />
          </FormField>
          {plan.kind !== "one_time" ? (
            <View style={[planStyles.row, { alignItems: "flex-start" }]}>
              <View style={planStyles.flex}>
                <FormField label="数值（可选）" testID="record.numeric">
                  <PlanInput
                    value={numberValue}
                    onChangeText={setNumberValue}
                    placeholder="例如 30"
                    testID="record.numeric.input"
                  />
                </FormField>
              </View>
              <View style={planStyles.flex}>
                <FormField label="单位" testID="record.unit">
                  <PlanInput
                    value={numberUnit}
                    onChangeText={setNumberUnit}
                    placeholder="例如 分钟"
                    testID="record.unit.input"
                  />
                </FormField>
              </View>
            </View>
          ) : null}
          {savedLocally ? (
            <Text testID="record.local-saved" style={planStyles.notice}>
              已保存到本机，等待联网同步
            </Text>
          ) : null}
          <ErrorText message={error} />
          <Submit
            testID="record.save"
            label={mode === "edit" ? "保存修改" : "保存记录"}
            onPress={() =>
              void (plan.kind === "one_time" ? finishOnce() : save())
            }
            pending={pending}
            disabled={Boolean(
              planQuery.isError || recordQuery.isError || invalidDate,
            )}
          />
        </>
      ) : null}
    </PlanScreen>
  );
}
