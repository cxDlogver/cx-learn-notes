import { useState } from "react";
import { useNavigation, type NavigationProp } from "@react-navigation/native";
import { penColors } from "@plan-checkin/design-tokens";
import { Button, SafeAreaView, StyleSheet, Text, View } from "react-native";
import {
  requestNativeSmokePermissions,
  runNativeCapabilitySmoke,
} from "../platform/nativeSmoke";
import type { RootStackParamList } from "./navigation";

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

export function SettingsEntry() {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
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
        <Button
          title="提醒设置"
          onPress={() => navigation.navigate("Reminders")}
          color={penColors.primary}
        />
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
