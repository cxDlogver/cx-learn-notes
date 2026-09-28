import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Text, View } from "react-native";
import { useAppServices } from "../../data/services";
import { ApiRequestError } from "../../data/repository";
import { ScreenState } from "../../components/ScreenState";
import {
  Choice,
  ErrorText,
  PlanInput,
  PlanScreen,
  Submit,
  planStyles,
} from "../plans/ui";

const emojis = ["👏", "💪", "🌱", "👍", "❤️"] as const;

export function EncouragementsScreen({
  checkinId,
  canSend,
}: {
  checkinId: string;
  canSend: boolean;
}) {
  const { repository, queryClient } = useAppServices();
  const messages = useQuery({
    queryKey: ["encouragements", checkinId],
    queryFn: () => repository.listEncouragements(checkinId),
    retry: false,
    staleTime: 0,
    refetchOnMount: "always",
  });
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [revoked, setRevoked] = useState(false);
  const inaccessible =
    messages.error instanceof ApiRequestError &&
    [403, 404].includes(messages.error.status);
  const send = async (kind: "emoji" | "message", value: string) => {
    if (busy || !value.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await repository.createEncouragement(checkinId, {
        kind,
        body: value.trim(),
      });
      setBody("");
      await queryClient.invalidateQueries({
        queryKey: ["encouragements", checkinId],
      });
    } catch (cause) {
      if (cause instanceof ApiRequestError && [403, 404].includes(cause.status))
        setRevoked(true);
      setError(
        cause instanceof Error ? cause.message : "发送失败，请联网后重试",
      );
    } finally {
      setBusy(false);
    }
  };
  return (
    <PlanScreen>
      <Text testID="encouragements.title" style={planStyles.title}>
        鼓励留言
      </Text>
      <Text style={planStyles.subtitle}>只对计划拥有者和留言本人可见。</Text>
      {messages.isPending || messages.isFetching ? (
        <ScreenState
          kind="loading"
          testID="encouragements.loading"
          message="正在读取留言…"
        />
      ) : null}
      {messages.isError || revoked ? (
        <ScreenState
          kind="error"
          testID="encouragements.error"
          message={
            inaccessible || revoked ? "这条记录已无法查看" : "暂时无法读取留言"
          }
          onRetry={() => void messages.refetch()}
        />
      ) : null}
      {!revoked &&
      !messages.isFetching &&
      messages.isSuccess &&
      messages.data.length === 0 ? (
        <ScreenState
          kind="empty"
          testID="encouragements.empty"
          message="还没有鼓励留言"
        />
      ) : null}
      {!revoked && !messages.isFetching && messages.isSuccess
        ? messages.data.map((item) => (
            <View
              key={item.id}
              testID={`encouragements.item.${item.id}`}
              style={planStyles.card}
            >
              <Text style={planStyles.cardTitle}>
                {item.sender.nickname || item.sender.username}
              </Text>
              <Text style={[planStyles.body, { marginTop: 8 }]}>
                {item.body}
              </Text>
              <Text style={planStyles.subtitle}>
                {new Date(item.createdAt).toLocaleString("zh-CN")}
              </Text>
            </View>
          ))
        : null}
      {canSend && !revoked && !messages.isFetching && messages.isSuccess ? (
        <View style={{ marginTop: 24 }}>
          <Text style={planStyles.cardTitle}>送上一点鼓励</Text>
          <View style={[planStyles.wrap, { marginTop: 12 }]}>
            {emojis.map((emoji) => (
              <Choice
                key={emoji}
                testID={`encouragements.emoji.${emoji}`}
                label={emoji}
                disabled={busy}
                onPress={() => void send("emoji", emoji)}
              />
            ))}
          </View>
          <View style={{ marginTop: 12 }}>
            <PlanInput
              testID="encouragements.body"
              value={body}
              onChangeText={setBody}
              placeholder="写一句鼓励的话（最多 500 字）"
              multiline
            />
          </View>
          <ErrorText message={error} />
          <Submit
            testID="encouragements.send"
            label="发送留言"
            pending={busy}
            disabled={!body.trim() || body.trim().length > 500}
            onPress={() => void send("message", body)}
          />
        </View>
      ) : null}
    </PlanScreen>
  );
}
