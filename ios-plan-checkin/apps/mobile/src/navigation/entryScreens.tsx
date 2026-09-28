import { penColors } from "@plan-checkin/design-tokens";
import { Button, SafeAreaView, StyleSheet, Text, View } from "react-native";

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
