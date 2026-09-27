import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Text, View } from "react-native";
import { useAppServices } from "../../data/services";
import { ScreenState } from "../../components/ScreenState";
import { Choice, ErrorText, PlanScreen, planStyles, Submit } from "./ui";

type Action = "pause" | "resume" | "archive" | "delete";
const copy: Record<
  Action,
  { title: string; message: string; confirm: string }
> = {
  pause: {
    title: "暂停计划？",
    message:
      "今天尚未打卡的待办会立即取消，恢复后从恢复当天继续。已保存记录不会删除。",
    confirm: "确认暂停",
  },
  resume: {
    title: "恢复计划？",
    message: "计划将重新生成待办；历史记录和既有规则保留。",
    confirm: "确认恢复",
  },
  archive: {
    title: "归档计划？",
    message:
      "今天尚未打卡的待办会立即取消。归档后无法继续编辑或打卡，历史记录仍可查看。",
    confirm: "确认归档",
  },
  delete: {
    title: "永久删除计划？",
    message: "计划、历史打卡、照片和统计将一起永久删除，且无法恢复。",
    confirm: "永久删除",
  },
};
export function PlanConfirmationsScreen({
  planId,
  onDone,
}: {
  planId: string;
  onDone: () => void;
}) {
  const { repository, queryClient } = useAppServices();
  const plan = useQuery({
    queryKey: ["plan", planId],
    queryFn: () => repository.getPlan(planId),
  });
  const [action, setAction] = useState<Action | null>(null);
  const [acknowledged, setAcknowledged] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function perform(): Promise<void> {
    if (
      !action ||
      !plan.data ||
      saving ||
      (action === "delete" && !acknowledged)
    )
      return;
    setSaving(true);
    setError(null);
    try {
      if (action === "delete")
        await repository.deletePlan(planId, plan.data.revision);
      else await repository.transitionPlan(planId, action, plan.data.revision);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["plans"] }),
        queryClient.invalidateQueries({ queryKey: ["today"] }),
        queryClient.invalidateQueries({ queryKey: ["calendar"] }),
        queryClient.invalidateQueries({ queryKey: ["plan", planId] }),
      ]);
      onDone();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "操作失败，请检查网络后重试",
      );
      await plan.refetch();
    } finally {
      setSaving(false);
    }
  }
  return (
    <PlanScreen>
      <Text testID="plans.confirm.title" style={planStyles.title}>
        管理计划
      </Text>
      {plan.isPending ? (
        <ScreenState
          kind="loading"
          testID="plans.confirm.loading"
          message="正在读取计划…"
        />
      ) : null}
      {plan.isError ? (
        <ScreenState
          kind="error"
          testID="plans.confirm.error"
          message="无法读取计划，请联网重试"
          onRetry={() => void plan.refetch()}
        />
      ) : null}
      {plan.data ? (
        <>
          <View style={planStyles.card}>
            <Text style={planStyles.cardTitle}>{plan.data.title}</Text>
            <Text style={planStyles.body}>
              当前状态：
              {plan.data.lifecycle === "active"
                ? "进行中"
                : plan.data.lifecycle === "paused"
                  ? "已暂停"
                  : "已归档"}
            </Text>
          </View>
          <View style={[planStyles.wrap, { marginTop: 20 }]}>
            {(plan.data.lifecycle === "active"
              ? ["pause", "archive", "delete"]
              : plan.data.lifecycle === "paused"
                ? ["resume", "archive", "delete"]
                : ["delete"]
            ).map((item) => (
              <Choice
                key={item}
                testID={`plans.confirm.choose-${item}`}
                label={copy[item as Action].confirm}
                danger={item === "delete"}
                selected={action === item}
                onPress={() => {
                  setAction(item as Action);
                  setAcknowledged(false);
                  setError(null);
                }}
              />
            ))}
          </View>
        </>
      ) : null}
      {action ? (
        <View testID="plans.confirm.sheet" style={planStyles.card}>
          <Text style={planStyles.cardTitle}>{copy[action].title}</Text>
          <Text style={[planStyles.body, { marginTop: 10 }]}>
            {copy[action].message}
          </Text>
          {action === "delete" ? (
            <View style={{ marginTop: 16 }}>
              <Choice
                testID="plans.confirm.acknowledge"
                label={
                  acknowledged ? "已知晓不可恢复" : "我已知晓此操作不可恢复"
                }
                selected={acknowledged}
                onPress={() => setAcknowledged(!acknowledged)}
              />
            </View>
          ) : null}
          <ErrorText message={error} />
          <Submit
            testID="plans.confirm.submit"
            label={copy[action].confirm}
            danger={action === "delete"}
            pending={saving}
            disabled={action === "delete" && !acknowledged}
            onPress={() => void perform()}
          />
          <Choice
            testID="plans.confirm.cancel"
            label="取消"
            onPress={() => setAction(null)}
          />
        </View>
      ) : null}
      <Text style={planStyles.subtitle}>计划状态变更需要网络连接。</Text>
    </PlanScreen>
  );
}
