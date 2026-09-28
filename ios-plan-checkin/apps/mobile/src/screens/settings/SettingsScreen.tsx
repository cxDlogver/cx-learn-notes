import { useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { useNavigation, type NavigationProp } from "@react-navigation/native";
import { penColors } from "@plan-checkin/design-tokens";
import {
  Alert,
  Linking,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useAppServices } from "../../data/services";
import { ScreenState } from "../../components/ScreenState";
import type { RootStackParamList } from "../../navigation/navigation";
import {
  requestNativeSmokePermissions,
  runNativeCapabilitySmoke,
} from "../../platform/nativeSmoke";

const border = "#E1E6DE";
const danger = "#A34039";

function Section({ label, testID }: { label: string; testID: string }) {
  return (
    <Text testID={testID} style={styles.section}>
      {label}
    </Text>
  );
}

function Row({
  label,
  icon,
  onPress,
  testID,
  trailing,
}: {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress?: () => void;
  testID: string;
  trailing?: string;
}) {
  return (
    <Pressable
      testID={testID}
      accessibilityRole={onPress ? "button" : "text"}
      accessibilityLabel={label}
      onPress={onPress}
      style={styles.row}
    >
      <Ionicons name={icon} size={19} color={penColors.secondary} />
      <Text style={styles.rowLabel}>{label}</Text>
      {trailing ? <Text style={styles.trailing}>{trailing}</Text> : null}
      {onPress ? (
        <Ionicons
          name="chevron-forward"
          size={18}
          color={penColors.secondary}
        />
      ) : null}
    </Pressable>
  );
}

export function SettingsScreen() {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const { repository, session, queryClient } = useAppServices();
  const user = useQuery({
    queryKey: ["me", session.getSnapshot().userId],
    queryFn: () => repository.getMe(),
  });
  const [busy, setBusy] = useState(false);
  const [nativeStatus, setNativeStatus] = useState<string | null>(null);
  const logout = () =>
    Alert.alert(
      "退出登录",
      "将撤销这台设备的登录会话。尚未同步的记录会留在本机，重新登录同一账号后可继续同步。",
      [
        { text: "取消", style: "cancel" },
        {
          text: "退出登录",
          style: "destructive",
          onPress: () => {
            if (busy) return;
            setBusy(true);
            void session
              .logout()
              .then(() => {
                queryClient.clear();
              })
              .catch((error: unknown) =>
                Alert.alert(
                  "退出失败",
                  error instanceof Error ? error.message : "请联网后重试",
                ),
              )
              .finally(() => setBusy(false));
          },
        },
      ],
    );
  const openLegal = (kind: "terms" | "privacy") => {
    const url =
      kind === "terms"
        ? process.env.EXPO_PUBLIC_TERMS_URL
        : process.env.EXPO_PUBLIC_PRIVACY_URL;
    if (!url?.startsWith("https://")) {
      Alert.alert("暂时无法打开", "当前环境尚未配置该文档地址。");
      return;
    }
    void Linking.openURL(url).catch(() =>
      Alert.alert("暂时无法打开", "请稍后重试。"),
    );
  };
  const nativeSmoke = async () => {
    try {
      await requestNativeSmokePermissions();
      const result = await runNativeCapabilitySmoke();
      setNativeStatus(
        `SQLCipher: ${result.sqlCipher}; Keychain: ${result.keychain}; APNs: ${result.apnsToken}; 相册: ${result.photoPermission}`,
      );
    } catch (error) {
      setNativeStatus(error instanceof Error ? error.message : "检查失败");
    }
  };
  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.scroll}>
        {user.isPending ? (
          <ScreenState
            kind="loading"
            testID="settings.loading"
            message="正在读取资料…"
          />
        ) : null}
        {user.isError ? (
          <ScreenState
            kind="error"
            testID="settings.error"
            message="暂时无法读取资料"
            onRetry={() => void user.refetch()}
          />
        ) : null}
        {user.data ? (
          <Pressable
            testID="settings.profile-card"
            accessibilityRole="button"
            accessibilityLabel="个人资料"
            onPress={() => navigation.navigate("ProfileSettings")}
            style={styles.profile}
          >
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {(user.data.nickname ?? user.data.username ?? "我").slice(0, 1)}
              </Text>
            </View>
            <View style={styles.profileText}>
              <Text style={styles.nickname}>
                {user.data.nickname ?? "未设置昵称"}
              </Text>
              <Text style={styles.handle}>
                @{user.data.username ?? "未设置用户名"}
              </Text>
            </View>
            <Ionicons
              name="chevron-forward"
              size={20}
              color={penColors.secondary}
            />
          </Pressable>
        ) : null}
        <Section label="账户" testID="settings.account-section" />
        <View style={styles.group}>
          <Row
            label="资料"
            icon="person-outline"
            testID="settings.profile"
            onPress={() => navigation.navigate("ProfileSettings")}
          />
          <Row
            label="隐私"
            icon="lock-closed-outline"
            testID="settings.privacy"
            onPress={() => navigation.navigate("PrivacySettings")}
          />
          <Row
            label="通知"
            icon="notifications-outline"
            testID="settings.notifications"
            onPress={() => navigation.navigate("NotificationSettings")}
          />
        </View>
        <Section label="数据" testID="settings.data-section" />
        <View style={styles.group}>
          <Row
            label="导出数据"
            icon="download-outline"
            testID="settings.export"
            onPress={() => navigation.navigate("ExportData")}
          />
          <Row
            label="同步状态"
            icon="sync-outline"
            testID="settings.sync"
            onPress={() => navigation.navigate("SyncFeedback")}
            trailing="查看"
          />
        </View>
        <Section label="关于" testID="settings.about-section" />
        <View style={styles.group}>
          <Row
            label="服务协议"
            icon="document-text-outline"
            testID="settings.terms"
            onPress={() => openLegal("terms")}
          />
          <Row
            label="隐私政策"
            icon="shield-checkmark-outline"
            testID="settings.policy"
            onPress={() => openLegal("privacy")}
          />
          <Row
            label="版本号"
            icon="information-circle-outline"
            testID="settings.version"
            trailing="0.1.0"
          />
        </View>
        <Pressable
          testID="settings.delete-account"
          accessibilityRole="button"
          accessibilityLabel="删除账号"
          onPress={() => navigation.navigate("DeleteAccount")}
          style={styles.logout}
        >
          <Text style={styles.logoutText}>删除账号</Text>
          <Ionicons name="chevron-forward" size={18} color={danger} />
        </Pressable>
        <Pressable
          testID="settings.logout"
          accessibilityRole="button"
          accessibilityLabel="退出登录"
          disabled={busy}
          onPress={logout}
          style={styles.logout}
        >
          <Text style={styles.logoutText}>
            {busy ? "正在退出…" : "退出登录"}
          </Text>
          <Ionicons name="chevron-forward" size={18} color={danger} />
        </Pressable>
        {__DEV__ ? (
          <Pressable onPress={() => void nativeSmoke()}>
            <Text style={styles.dev}>运行 iOS 能力检查</Text>
          </Pressable>
        ) : null}
        {__DEV__ && nativeStatus ? (
          <Text style={styles.dev}>{nativeStatus}</Text>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: penColors.background },
  scroll: { paddingHorizontal: 22, paddingTop: 17, paddingBottom: 40 },
  profile: {
    minHeight: 74,
    paddingHorizontal: 15,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: penColors.surface,
    borderColor: border,
    borderWidth: 1,
    borderRadius: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#E8F2EB",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { color: penColors.primary, fontSize: 20, fontWeight: "600" },
  profileText: { flex: 1, marginLeft: 12 },
  nickname: { color: penColors.text, fontSize: 16, fontWeight: "600" },
  handle: { color: penColors.secondary, fontSize: 12, marginTop: 3 },
  section: {
    color: penColors.secondary,
    fontSize: 13,
    marginTop: 22,
    marginBottom: 7,
  },
  group: {
    backgroundColor: penColors.surface,
    borderColor: border,
    borderWidth: 1,
    borderRadius: 12,
    overflow: "hidden",
  },
  row: {
    minHeight: 48,
    paddingHorizontal: 15,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderBottomColor: border,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowLabel: { color: penColors.text, flex: 1, fontSize: 15 },
  trailing: { color: penColors.secondary, fontSize: 12 },
  logout: {
    marginTop: 28,
    minHeight: 48,
    backgroundColor: penColors.surface,
    borderColor: border,
    borderWidth: 1,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 15,
  },
  logoutText: { color: danger, fontSize: 15 },
  dev: { color: penColors.secondary, fontSize: 12, marginTop: 15 },
});
