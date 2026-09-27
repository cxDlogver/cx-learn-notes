import { useQuery } from "@tanstack/react-query";
import { penColors } from "@plan-checkin/design-tokens";
import { businessDateAt } from "@plan-checkin/domain";
import { Button, SafeAreaView, StyleSheet, Text, View } from "react-native";
import { useAppServices } from "../data/services";
import {
  requestNativeSmokePermissions,
  runNativeCapabilitySmoke,
} from "../platform/nativeSmoke";
import { pageState } from "../viewmodel/pageState";

export function Shell({
  title,
  body,
  retry,
}: {
  title: string;
  body: string;
  retry?: () => void;
}) {
  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.content}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.body}>{body}</Text>
        {retry ? (
          <Button title="重试" onPress={retry} color={penColors.primary} />
        ) : null}
      </View>
    </SafeAreaView>
  );
}

export function TodayEntry() {
  const { repository } = useAppServices();
  const query = useQuery({
    queryKey: ["today"],
    queryFn: () => repository.getToday(),
  });
  const state = pageState(query, (data) => data.items.length === 0);
  return (
    <Shell
      title="今日"
      body={
        state.kind === "loading"
          ? "正在读取计划"
          : state.kind === "error"
            ? "暂时无法读取今日计划"
            : state.kind === "empty"
              ? "今天暂无需要处理的计划"
              : `今天有 ${state.data.items.length} 项计划`
      }
      retry={state.kind === "error" ? () => void query.refetch() : undefined}
    />
  );
}

export function CalendarEntry() {
  const { repository } = useAppServices();
  const month = businessDateAt(new Date(), "Asia/Shanghai").slice(0, 7);
  const query = useQuery({
    queryKey: ["calendar", month],
    queryFn: () => repository.getCalendar(month),
  });
  return (
    <Shell
      title="日历"
      body={
        query.isPending
          ? "正在读取日历"
          : query.isError
            ? "暂时无法读取日历"
            : `${query.data.month} 的记录`
      }
      retry={query.isError ? () => void query.refetch() : undefined}
    />
  );
}

export function PlansEntry() {
  const { repository } = useAppServices();
  const query = useQuery({
    queryKey: ["plans"],
    queryFn: () => repository.listPlans(),
  });
  return (
    <Shell
      title="计划"
      body={
        query.isPending
          ? "正在读取计划"
          : query.isError
            ? "暂时无法读取计划"
            : `共 ${query.data.length} 项计划`
      }
      retry={query.isError ? () => void query.refetch() : undefined}
    />
  );
}

export function FriendsEntry() {
  return <Shell title="朋友" body="好友功能将在社交模块接入" />;
}

export function SettingsEntry() {
  const [status, setStatus] = useState("尚未运行原生能力检查");
  const run = async () => {
    try {
      await requestNativeSmokePermissions();
      const result = await runNativeCapabilitySmoke();
      setStatus(
        `SQLCipher: ${result.sqlCipher}; Keychain: ${result.keychain}; APNs: ${result.apnsToken}; 相册: ${result.photoPermission}`,
      );
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "检查失败");
    }
  };
  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.content}>
        <Text style={styles.title}>个人</Text>
        <Text style={styles.body}>设置入口将在账号模块接入</Text>
        {__DEV__ ? (
          <Button
            title="运行 iOS 能力检查"
            onPress={() => void run()}
            color={penColors.primary}
          />
        ) : null}
        {__DEV__ ? <Text style={styles.body}>{status}</Text> : null}
      </View>
    </SafeAreaView>
  );
}

export function LoginEntry() {
  const { mockMode, session } = useAppServices();
  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.content}>
        <Text style={styles.title}>手机号登录</Text>
        <Text style={styles.body}>
          请输入手机号以继续。登录表单将在 APP-02 接入。
        </Text>
        {mockMode ? (
          <Button
            title="进入导航样板"
            onPress={() =>
              void session.adopt({
                accessToken: "mock-access",
                refreshToken: "mock-refresh",
                accessExpiresAt: new Date(Date.now() + 3_600_000).toISOString(),
                userId: "00000000-0000-4000-8000-000000000001",
                isNewUser: false,
              })
            }
          />
        ) : null}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: penColors.background },
  content: { flex: 1, paddingHorizontal: 24, justifyContent: "center" },
  title: { color: penColors.text, fontSize: 23, fontWeight: "700" },
  body: {
    color: penColors.secondary,
    fontSize: 15,
    lineHeight: 23,
    marginTop: 12,
    marginBottom: 16,
  },
});
import { useState } from "react";
