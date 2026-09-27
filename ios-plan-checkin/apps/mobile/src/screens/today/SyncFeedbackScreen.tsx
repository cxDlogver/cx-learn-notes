import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Alert, Pressable, Text, View } from "react-native";
import { ScreenState, StatusNotice } from "../../components/ScreenState";
import { useAppServices } from "../../data/services";
import { PlanScreen, planPalette, planStyles } from "../plans/ui";

const statusLabel = {
  pending: "已保存在本机",
  sending: "同步中",
  retry: "等待重试",
  conflict: "存在冲突 · 选择版本",
  failed: "同步失败 · 点击重试",
} as const;

export function SyncFeedbackScreen({
  onConflict,
  onEdit,
}: {
  onConflict: (planId: string, businessDate: string) => void;
  onEdit: (planId: string, businessDate: string) => void;
}) {
  const { localCache, outbox, incrementalSync, session, todaySession } =
    useAppServices();
  const snapshot = session.getSnapshot();
  const accountId = snapshot.phase === "authenticated" ? snapshot.userId : null;
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const queue = useQuery({
    queryKey: ["sync-feedback", accountId],
    queryFn: () => localCache!.pendingOperations(accountId!),
    enabled: Boolean(accountId && localCache),
    refetchInterval: 3000,
  });
  const plans = useQuery({
    queryKey: ["sync-plan-labels", accountId],
    queryFn: () => localCache!.listPlans(accountId!),
    enabled: Boolean(accountId && localCache),
  });
  const names = new Map(plans.data?.map((plan) => [plan.id, plan.title]));
  const retry = async (operationId: string) => {
    if (!accountId || !localCache || !outbox) return;
    setBusy(operationId);
    setError(null);
    try {
      await localCache.retryFailedOperation(accountId, operationId);
      await queue.refetch();
      await outbox.trigger();
      await incrementalSync?.trigger();
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["today"] }),
        queryClient.invalidateQueries({ queryKey: ["calendar"] }),
        queue.refetch(),
      ]);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "重试失败，请稍后再试");
    } finally {
      setBusy(null);
    }
  };
  const discard = (planId: string, businessDate: string) => {
    if (!accountId || !localCache) return;
    Alert.alert(
      "放弃本机更改？",
      "这一天未同步的本机内容会被移除；云端已有记录不会删除。",
      [
        { text: "取消", style: "cancel" },
        {
          text: "放弃更改",
          style: "destructive",
          onPress: () => {
            void (async () => {
              try {
                await localCache.discardFailedRecord(
                  accountId,
                  planId,
                  businessDate,
                );
                todaySession.clear();
                await Promise.all([
                  queue.refetch(),
                  queryClient.invalidateQueries({ queryKey: ["today"] }),
                  queryClient.invalidateQueries({ queryKey: ["calendar"] }),
                  queryClient.invalidateQueries({ queryKey: ["checkin"] }),
                ]);
              } catch (cause) {
                setError(
                  cause instanceof Error ? cause.message : "无法放弃本机更改",
                );
              }
            })();
          },
        },
      ],
    );
  };
  const rows = queue.data ?? [];
  return (
    <PlanScreen>
      <Text testID="sync.title" style={planStyles.title}>
        同步状态
      </Text>
      <Text style={planStyles.subtitle}>
        本机保存和云端同步是两件事。网络恢复后会自动重试未完成的记录。
      </Text>
      {queue.isPending ? (
        <ScreenState
          kind="loading"
          testID="sync.loading"
          message="正在读取本机队列…"
        />
      ) : null}
      {queue.isError ? (
        <ScreenState
          kind="error"
          testID="sync.error"
          message="暂时无法读取同步状态"
          onRetry={() => void queue.refetch()}
        />
      ) : null}
      {error ? (
        <StatusNotice
          kind="failure"
          testID="sync.retry-error"
          message={error}
        />
      ) : null}
      {!queue.isPending && !queue.isError && rows.length === 0 ? (
        <ScreenState
          kind="empty"
          testID="sync.empty"
          message="所有本机记录已同步"
        />
      ) : null}
      {rows.map((row) => (
        <View
          key={row.operationId}
          testID={`sync.item.${row.operationId}`}
          style={planStyles.card}
        >
          <Text style={planStyles.cardTitle}>
            {names.get(row.planId) ?? "计划记录"} · {row.businessDate}
          </Text>
          <Text style={[planStyles.body, { marginTop: 8 }]}>
            {row.status === "failed" && row.errorCode === "CHECKIN_CONFLICT"
              ? "记录版本已变化 · 重新编辑"
              : statusLabel[row.status]}
          </Text>
          {row.errorCode ? (
            <Text style={[planStyles.body, { marginTop: 4 }]}>
              错误代码：{row.errorCode}
            </Text>
          ) : null}
          {row.status === "conflict" ? (
            <Pressable
              testID={`sync.resolve.${row.operationId}`}
              accessibilityRole="button"
              accessibilityLabel="查看两版内容并选择"
              onPress={() => onConflict(row.planId, row.businessDate)}
              style={{ minHeight: 44, justifyContent: "center" }}
            >
              <Text style={{ color: planPalette.primary, fontWeight: "600" }}>
                查看两版内容并选择 ›
              </Text>
            </Pressable>
          ) : null}
          {row.status === "failed" ? (
            <Pressable
              testID={`sync.edit.${row.operationId}`}
              accessibilityRole="button"
              accessibilityLabel="重新编辑并提交记录"
              onPress={() => onEdit(row.planId, row.businessDate)}
              style={{ minHeight: 44, justifyContent: "center" }}
            >
              <Text style={{ color: planPalette.primary, fontWeight: "600" }}>
                重新编辑并提交 ›
              </Text>
            </Pressable>
          ) : null}
          {row.status === "failed" ? (
            <Pressable
              testID={`sync.discard.${row.operationId}`}
              accessibilityRole="button"
              accessibilityLabel="放弃这一天未同步的本机更改"
              onPress={() => discard(row.planId, row.businessDate)}
              style={{ minHeight: 44, justifyContent: "center" }}
            >
              <Text style={{ color: planPalette.danger }}>放弃本机更改</Text>
            </Pressable>
          ) : null}
          {row.status === "failed" && row.errorCode !== "CHECKIN_CONFLICT" ? (
            <Pressable
              testID={`sync.retry.${row.operationId}`}
              accessibilityRole="button"
              accessibilityLabel="重试同步"
              accessibilityState={{ disabled: busy === row.operationId }}
              onPress={() => void retry(row.operationId)}
              style={{ minHeight: 44, justifyContent: "center" }}
            >
              <Text style={{ color: planPalette.primary, fontWeight: "600" }}>
                {busy === row.operationId ? "正在重试…" : "重试同步"}
              </Text>
            </Pressable>
          ) : null}
        </View>
      ))}
      <Pressable
        testID="sync.refresh"
        accessibilityRole="button"
        onPress={() => void queue.refetch()}
        style={{
          minHeight: 44,
          marginTop: 18,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Text style={{ color: planPalette.primary }}>刷新状态</Text>
      </Pressable>
    </PlanScreen>
  );
}
