import { SafeAreaView, StyleSheet, Text, View } from "react-native";

export default function App() {
  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.content}>
        <Text style={styles.title}>计划打卡</Text>
        <Text style={styles.subtitle}>工程基线已建立</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#F8F9F6" },
  content: { flex: 1, justifyContent: "center", alignItems: "center" },
  title: { color: "#17231C", fontSize: 28, fontWeight: "700" },
  subtitle: { color: "#7E8880", fontSize: 16, marginTop: 12 },
});
