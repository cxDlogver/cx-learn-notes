import { useEffect, useState } from "react";
import * as Notifications from "expo-notifications";
import { useQuery } from "@tanstack/react-query";
import { Alert, Linking, Switch, Text, View } from "react-native";
import type { NotificationPreferencesDto } from "@plan-checkin/contracts";
import { useAppServices } from "../../data/services";
import { ScreenState } from "../../components/ScreenState";
import {
  Choice,
  ErrorText,
  PlanScreen,
  planPalette,
  planStyles,
} from "../plans/ui";

const rows: {
  key: keyof Pick<
    NotificationPreferencesDto,
    "friendRequests" | "sharedUpdates" | "encouragements"
  >;
  label: string;
}[] = [
  { key: "friendRequests", label: "好友申请" },
  { key: "sharedUpdates", label: "计划分享" },
  { key: "encouragements", label: "鼓励留言" },
];

export function SocialNotificationsScreen() {
  const { repository, queryClient, registerPush } = useAppServices();
  const prefs = useQuery({
    queryKey: ["notification-preferences"],
    queryFn: () => repository.getNotificationPreferences(),
  });
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [permission, setPermission] = useState<boolean | null>(null);
  useEffect(() => {
    void Notifications.getPermissionsAsync()
      .then((result) => setPermission(result.granted))
      .catch(() => setPermission(false));
  }, []);
  const change = async (key: (typeof rows)[number]["key"], value: boolean) => {
    if (!prefs.data || busy) return;
    setBusy(key);
    setError(null);
    try {
      const updated = await repository.updateNotificationPreferences({
        baseRevision: prefs.data.revision,
        [key]: value,
      });
      queryClient.setQueryData(["notification-preferences"], updated);
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "设置保存失败，请联网重试",
      );
      await prefs.refetch();
    } finally {
      setBusy(null);
    }
  };
  const enableSystem = () =>
    Alert.alert(
      "开启社交通知",
      "系统通知用于提示好友申请、计划分享和鼓励留言。通知内容不会包含私人照片、数值或完整笔记。",
      [
        { text: "取消", style: "cancel" },
        {
          text: "继续",
          onPress: () => {
            void (async () => {
              try {
                const before = await Notifications.getPermissionsAsync();
                const after =
                  !before.granted && before.canAskAgain
                    ? await Notifications.requestPermissionsAsync()
                    : before;
                setPermission(after.granted);
                await registerPush();
              } catch {
                setError("无法启用系统通知，请稍后重试");
              }
            })();
          },
        },
      ],
    );
  return (
    <PlanScreen>
      <Text testID="social-notifications.title" style={planStyles.title}>
        社交通知
      </Text>
      <Text style={planStyles.subtitle}>
        分别选择想收到的互动提醒。打卡提醒在计划中单独设置。
      </Text>
      {prefs.isPending ? (
        <ScreenState
          kind="loading"
          testID="social-notifications.loading"
          message="正在读取通知设置…"
        />
      ) : null}
      {prefs.isError ? (
        <ScreenState
          kind="error"
          testID="social-notifications.error"
          message="暂时无法读取通知设置"
          onRetry={() => void prefs.refetch()}
        />
      ) : null}
      {prefs.data ? (
        <View style={planStyles.card}>
          {rows.map((row, index) => (
            <View
              key={row.key}
              style={[
                planStyles.row,
                {
                  minHeight: 56,
                  justifyContent: "space-between",
                  borderTopWidth: index ? 1 : 0,
                  borderTopColor: planPalette.border,
                },
              ]}
            >
              <Text style={planStyles.cardTitle}>{row.label}</Text>
              <Switch
                testID={`social-notifications.${row.key}`}
                accessibilityLabel={`${row.label}通知`}
                value={prefs.data![row.key]}
                disabled={Boolean(busy)}
                onValueChange={(value) => void change(row.key, value)}
                trackColor={{ true: planPalette.primary }}
              />
            </View>
          ))}
        </View>
      ) : null}
      <ErrorText message={error} />
      <Text style={[planStyles.label, { marginTop: 30 }]}>系统通知权限</Text>
      <View style={planStyles.card}>
        <Text testID="social-notifications.permission" style={planStyles.body}>
          {permission
            ? "系统通知已开启"
            : "系统通知未开启，App 内设置仍会保存。"}
        </Text>
        {!permission ? (
          <Choice
            testID="social-notifications.enable-system"
            label="开启系统通知"
            onPress={enableSystem}
          />
        ) : null}
        {permission === false ? (
          <Choice
            testID="social-notifications.open-settings"
            label="前往系统设置"
            onPress={() => void Linking.openSettings()}
          />
        ) : null}
      </View>
    </PlanScreen>
  );
}
