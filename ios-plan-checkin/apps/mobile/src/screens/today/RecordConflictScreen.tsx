import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { CheckinDto, PlanDto } from "@plan-checkin/contracts";
import { Alert, Pressable, Text, View } from "react-native";
import { ScreenState, StatusNotice } from "../../components/ScreenState";
import { useAppServices } from "../../data/services";
import { PlanScreen, planPalette, planStyles } from "../plans/ui";

function resultLabel(plan: PlanDto, record: CheckinDto): string {
  if (record.result === "skip") return "跳过记录";
  if (plan.direction === "avoid")
    return record.result === "success" ? "成功避开" : "发生了";
  return record.result === "success" ? "已完成" : "未完成";
}

function VersionCard({
  label,
  record,
  plan,
  selected,
  onPress,
  current,
}: {
  label: string;
  record: CheckinDto;
  plan: PlanDto;
  selected: boolean;
  onPress: () => void;
  current: boolean;
}) {
  return (
    <Pressable
      testID={`conflict.version.${current ? "server" : "local"}`}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      accessibilityLabel={`${label}，${resultLabel(plan, record)}，${record.note ?? "无备注"}`}
      onPress={onPress}
      style={[
        planStyles.card,
        { borderColor: selected ? planPalette.primary : planPalette.border },
      ]}
    >
      <View style={[planStyles.row, { justifyContent: "space-between" }]}>
        <Text style={{ color: planPalette.secondary, fontSize: 12 }}>
          {label} · {new Date(record.updatedAt).toLocaleString("zh-CN")}
        </Text>
        {current ? (
          <Text style={{ color: planPalette.primary, fontSize: 12 }}>
            当前保留
          </Text>
        ) : null}
      </View>
      <Text style={[planStyles.cardTitle, { marginTop: 12 }]}>
        {resultLabel(plan, record)}
      </Text>
      {record.note ? (
        <Text style={[planStyles.body, { marginTop: 8 }]}>{record.note}</Text>
      ) : null}
      {record.failureReason ? (
        <Text style={[planStyles.body, { marginTop: 8 }]}>
          原因：{record.failureReason}
        </Text>
      ) : null}
      {record.numeric ? (
        <Text style={[planStyles.body, { marginTop: 8 }]}>
          数值：{record.numeric.value} {record.numeric.unit}
        </Text>
      ) : null}
      {record.mediaIds.length ? (
        <Text style={[planStyles.body, { marginTop: 8 }]}>
          附件：{record.mediaIds.length} 张照片
        </Text>
      ) : null}
    </Pressable>
  );
}

export function RecordConflictScreen({
  planId,
  businessDate,
  onDone,
}: {
  planId: string;
  businessDate: string;
  onDone: () => void;
}) {
  const { repository, localCache, session, todaySession } = useAppServices();
  const queryClient = useQueryClient();
  const snapshot = session.getSnapshot();
  const accountId = snapshot.phase === "authenticated" ? snapshot.userId : null;
  const conflict = useQuery({
    queryKey: ["record-conflict", accountId, planId, businessDate],
    queryFn: () => localCache?.conflict(accountId!, planId, businessDate),
    enabled: Boolean(accountId && localCache),
  });
  const plan = useQuery({
    queryKey: ["plan", planId],
    queryFn: () => repository.getPlan(planId),
  });
  const [selection, setSelection] = useState<"server" | "local" | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const resolve = async (choice: "server" | "local") => {
    setPending(true);
    setError(null);
    try {
      const record = await repository.resolveCheckinConflict(
        planId,
        businessDate,
        choice,
      );
      todaySession.clear();
      queryClient.setQueryData(["checkin", planId, businessDate], record);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["today"] }),
        queryClient.invalidateQueries({ queryKey: ["calendar"] }),
        queryClient.invalidateQueries({ queryKey: ["plan-detail", planId] }),
        queryClient.invalidateQueries({ queryKey: ["record-conflict"] }),
      ]);
      onDone();
    } catch (cause) {
      setSelection(null);
      await conflict.refetch();
      setError(
        cause instanceof Error ? cause.message : "处理失败，请联网后重试",
      );
    } finally {
      setPending(false);
    }
  };
  const confirm = () => {
    if (!selection || pending) return;
    Alert.alert(
      "确认保留这个版本？",
      selection === "server"
        ? "本机尚未同步的内容将被丢弃。"
        : "本机版本会作为新的修订同步到云端；若云端再次变化，仍需重新选择。",
      [
        { text: "再看看", style: "cancel" },
        { text: "确认保留", onPress: () => void resolve(selection) },
      ],
    );
  };
  return (
    <PlanScreen>
      <View style={[planStyles.row, { justifyContent: "space-between" }]}>
        <Pressable
          testID="conflict.cancel"
          accessibilityRole="button"
          onPress={onDone}
          style={{ minHeight: 44, justifyContent: "center" }}
        >
          <Text style={{ color: planPalette.secondary }}>稍后处理</Text>
        </Pressable>
        <Text style={planStyles.cardTitle}>发现记录冲突</Text>
        <View style={{ width: 58 }} />
      </View>
      {plan.isPending || conflict.isPending ? (
        <ScreenState
          kind="loading"
          testID="conflict.loading"
          message="正在读取两个版本…"
        />
      ) : null}
      {plan.isError || conflict.isError ? (
        <ScreenState
          kind="error"
          testID="conflict.error"
          message="暂时无法读取冲突，请重试"
          onRetry={() => void Promise.all([plan.refetch(), conflict.refetch()])}
        />
      ) : null}
      {plan.data && conflict.data ? (
        <>
          <Text
            style={[planStyles.body, { marginTop: 20, textAlign: "center" }]}
          >
            「{plan.data.title}」在 {businessDate}{" "}
            存在两个不同版本，请选择要保留的内容。
          </Text>
          <VersionCard
            label="云端版本"
            plan={plan.data}
            record={conflict.data.details.serverRecord}
            current
            selected={selection === "server"}
            onPress={() => setSelection("server")}
          />
          <VersionCard
            label="本机版本"
            plan={plan.data}
            record={conflict.data.localRecord}
            current={false}
            selected={selection === "local"}
            onPress={() => setSelection("local")}
          />
          <Text
            style={[
              planStyles.subtitle,
              { textAlign: "center", marginTop: 20 },
            ]}
          >
            选择云端版本会丢弃本机草稿；选择本机版本会在云端留下新的修订记录。
          </Text>
          {error ? (
            <StatusNotice
              kind="failure"
              testID="conflict.resolve-error"
              message={error}
            />
          ) : null}
          <Pressable
            testID="conflict.confirm"
            accessibilityRole="button"
            accessibilityState={{ disabled: !selection || pending }}
            onPress={confirm}
            style={{
              backgroundColor:
                selection && !pending
                  ? planPalette.primary
                  : planPalette.border,
              borderRadius: 12,
              minHeight: 50,
              alignItems: "center",
              justifyContent: "center",
              marginTop: 20,
            }}
          >
            <Text style={{ color: "#FFFFFF", fontWeight: "600" }}>
              {pending ? "正在处理…" : "确认保留此版本"}
            </Text>
          </Pressable>
        </>
      ) : null}
      {!conflict.isPending && !conflict.data && !conflict.isError ? (
        <ScreenState
          kind="empty"
          testID="conflict.empty"
          message="这条记录已没有待处理冲突"
        />
      ) : null}
    </PlanScreen>
  );
}
