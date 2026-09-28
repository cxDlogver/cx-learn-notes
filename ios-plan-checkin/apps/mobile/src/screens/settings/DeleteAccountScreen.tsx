import { useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, type NavigationProp } from "@react-navigation/native";
import {
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useAppServices } from "../../data/services";
import type { RootStackParamList } from "../../navigation/navigation";
import { ErrorText, PlanScreen, planPalette, planStyles } from "../plans/ui";
import { purgeExportCache } from "./ExportDataScreen";

const danger = "#C6534C";

export function DeleteAccountScreen() {
  const { repository, session, queryClient, reminders, mockMode } =
    useAppServices();
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const [understood, setUnderstood] = useState(false);
  const [phrase, setPhrase] = useState("");
  const [busy, setBusy] = useState(false);
  const [serverAccepted, setServerAccepted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clearDevice = async () => {
    const accountId = session.getSnapshot().userId;
    reminders?.stop();
    if (accountId) await reminders?.cancelAccount(accountId).catch(() => {});
    try {
      purgeExportCache();
    } catch {
      /* Cache cleanup resumes on next launch. */
    }
    queryClient.clear();
    await session.clear();
  };
  const finish = async () => {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await clearDevice();
      Alert.alert(
        "账号已停用",
        "分享和登录已停止。30 天内可在登录页使用原手机号验证并撤销注销；到期后永久清理云端数据。",
      );
    } catch (cause) {
      setError(
        cause instanceof Error
          ? `云端已停用账号，本机清理失败：${cause.message}。请重试清理。`
          : "云端已停用账号，本机清理失败，请重试清理。",
      );
    } finally {
      setBusy(false);
    }
  };
  const submit = () => {
    if (busy || !understood || phrase.trim() !== "删除" || mockMode) return;
    Alert.alert(
      "确认注销账号？",
      "确认后立即停止登录、分享和提醒，并清除这台设备上的数据库、照片和密钥。未同步的本机记录也会丢失。30 天内可以短信验证撤销，期满永久删除云端数据。",
      [
        { text: "取消", style: "cancel" },
        {
          text: "确认注销",
          style: "destructive",
          onPress: () => {
            setBusy(true);
            setError(null);
            void repository
              .requestDeletion()
              .then(() => {
                setServerAccepted(true);
                setBusy(false);
                void finish();
              })
              .catch((cause: unknown) => {
                setError(
                  cause instanceof Error
                    ? cause.message
                    : "注销请求失败，请联网重试",
                );
                setBusy(false);
              });
          },
        },
      ],
    );
  };
  return (
    <PlanScreen>
      <View testID="delete-account.warning-icon" style={styles.icon}>
        <Ionicons name="warning-outline" color="#FFFFFF" size={30} />
      </View>
      <Text testID="delete-account.heading" style={styles.heading}>
        删除账号是永久性操作
      </Text>
      <View testID="delete-account.consequences" style={styles.card}>
        {[
          "确认后立即停用账号、解除好友分享并停止提醒",
          "30 天内可用原手机号验证撤销注销",
          "30 天后计划、打卡记录、照片和关系数据会被永久删除",
          "本机未同步记录会在确认后清除，无法从云端恢复",
        ].map((line) => (
          <View key={line} style={styles.bulletRow}>
            <View style={styles.dot} />
            <Text style={styles.bullet}>{line}</Text>
          </View>
        ))}
      </View>
      <Pressable
        testID="delete-account.export"
        accessibilityRole="button"
        onPress={() => navigation.navigate("ExportData")}
        style={styles.export}
      >
        <Text style={styles.exportText}>建议在删除前先导出已同步的数据</Text>
        <Text style={styles.exportLink}>去导出数据 ›</Text>
      </Pressable>
      <Pressable
        testID="delete-account.acknowledge"
        accessibilityRole="checkbox"
        accessibilityState={{ checked: understood }}
        onPress={() => setUnderstood(!understood)}
        style={styles.checkRow}
      >
        <Ionicons
          name={understood ? "checkbox" : "square-outline"}
          size={22}
          color={understood ? planPalette.primary : planPalette.secondary}
        />
        <Text style={styles.checkText}>我已了解上述后果，确认要删除账号</Text>
      </Pressable>
      <Text testID="delete-account.input-hint" style={styles.hint}>
        请输入「删除」以确认
      </Text>
      <TextInput
        testID="delete-account.confirm-input"
        accessibilityLabel="输入删除以确认"
        value={phrase}
        onChangeText={setPhrase}
        placeholder="删除"
        placeholderTextColor={planPalette.secondary}
        autoCorrect={false}
        style={planStyles.input}
      />
      <ErrorText message={error} />
      {serverAccepted ? (
        <Pressable
          testID="delete-account.retry-cleanup"
          accessibilityRole="button"
          disabled={busy}
          onPress={() => void finish()}
          style={styles.action}
        >
          <Text style={styles.actionText}>
            {busy ? "正在清理…" : "重试清理本机数据"}
          </Text>
        </Pressable>
      ) : (
        <Pressable
          testID="delete-account.submit"
          accessibilityRole="button"
          accessibilityState={{
            disabled:
              busy || !understood || phrase.trim() !== "删除" || mockMode,
          }}
          disabled={busy || !understood || phrase.trim() !== "删除" || mockMode}
          onPress={submit}
          style={[
            styles.action,
            (busy || !understood || phrase.trim() !== "删除" || mockMode) &&
              styles.disabled,
          ]}
        >
          <Text style={styles.actionText}>
            {busy ? "正在提交…" : "确认注销账号"}
          </Text>
        </Pressable>
      )}
      <Pressable
        testID="delete-account.cancel"
        accessibilityRole="button"
        onPress={() => navigation.goBack()}
        style={styles.cancel}
      >
        <Text style={styles.cancelText}>取消</Text>
      </Pressable>
      {mockMode ? (
        <Text style={planStyles.notice}>
          演示模式不连接云端，注销需使用开发服务。
        </Text>
      ) : null}
    </PlanScreen>
  );
}

const styles = StyleSheet.create({
  icon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: danger,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    marginTop: 24,
  },
  heading: {
    color: planPalette.text,
    fontSize: 19,
    fontWeight: "700",
    textAlign: "center",
    marginTop: 18,
  },
  card: {
    backgroundColor: planPalette.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: planPalette.border,
    padding: 17,
    gap: 12,
    marginTop: 26,
  },
  bulletRow: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: danger,
    marginTop: 7,
  },
  bullet: { color: planPalette.text, fontSize: 13, lineHeight: 20, flex: 1 },
  export: {
    minHeight: 52,
    borderRadius: 12,
    backgroundColor: "#E8F2EC",
    marginTop: 18,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  exportText: { color: planPalette.primary, fontSize: 12, flex: 1 },
  exportLink: { color: planPalette.primary, fontSize: 12, fontWeight: "600" },
  checkRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    minHeight: 48,
    marginTop: 18,
  },
  checkText: { color: planPalette.text, fontSize: 13, flex: 1 },
  hint: {
    color: planPalette.secondary,
    fontSize: 12,
    marginTop: 7,
    marginBottom: 8,
  },
  action: {
    minHeight: 48,
    borderRadius: 12,
    backgroundColor: danger,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 20,
  },
  actionText: { color: "#FFFFFF", fontSize: 15, fontWeight: "600" },
  disabled: { opacity: 0.5 },
  cancel: {
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 11,
  },
  cancelText: { color: planPalette.secondary, fontSize: 13 },
});
