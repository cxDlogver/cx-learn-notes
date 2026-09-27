import { useState } from "react";
import { Button, SafeAreaView, StyleSheet, Text, View } from "react-native";
import {
  requestNativeSmokePermissions,
  runNativeCapabilitySmoke,
} from "./platform/nativeSmoke";

export default function App() {
  const [smokeResult, setSmokeResult] = useState("尚未运行原生能力检查");

  async function runSmoke(): Promise<void> {
    try {
      await requestNativeSmokePermissions();
      const result = await runNativeCapabilitySmoke();
      setSmokeResult(
        `SQLCipher: ${result.sqlCipher}; Keychain: ${result.keychain}; APNs: ${result.apnsToken}; 相册: ${result.photoPermission}`,
      );
    } catch (error) {
      setSmokeResult(error instanceof Error ? error.message : "检查失败");
    }
  }

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.content}>
        <Text style={styles.title}>计划打卡</Text>
        <Text style={styles.subtitle}>原生能力样板</Text>
        {__DEV__ ? (
          <Button title="运行 iOS 能力检查" onPress={() => void runSmoke()} />
        ) : null}
        {__DEV__ ? <Text style={styles.status}>{smokeResult}</Text> : null}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#F8F9F6" },
  content: { flex: 1, justifyContent: "center", alignItems: "center" },
  title: { color: "#17231C", fontSize: 28, fontWeight: "700" },
  subtitle: { color: "#7E8880", fontSize: 16, marginTop: 12 },
  status: {
    color: "#17231C",
    fontSize: 14,
    marginTop: 20,
    textAlign: "center",
  },
});
