import type { ReactNode } from "react";
import { penColors } from "@plan-checkin/design-tokens";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

export const authColors = {
  ...penColors,
  border: "#E1E6DE",
  muted: "#AAB2AA",
  danger: "#A34039",
} as const;

export function PrimaryAction({
  label,
  onPress,
  disabled,
  pending,
  testID,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  pending?: boolean;
  testID: string;
}) {
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{
        disabled: Boolean(disabled || pending),
        busy: Boolean(pending),
      }}
      onPress={onPress}
      disabled={disabled || pending}
      style={({ pressed }) => [
        styles.button,
        (disabled || pending) && styles.disabled,
        pressed && styles.pressed,
      ]}
    >
      {pending ? (
        <ActivityIndicator color="#FFFFFF" />
      ) : (
        <Text style={styles.buttonLabel}>{label}</Text>
      )}
    </Pressable>
  );
}

export function InlineError({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <Text
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
      style={styles.error}
    >
      {message}
    </Text>
  );
}

export function Field({
  label,
  children,
  testID,
}: {
  label: string;
  children: ReactNode;
  testID: string;
}) {
  return (
    <View testID={testID} style={styles.fieldBlock}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.field}>{children}</View>
    </View>
  );
}

export const authStyles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: authColors.background },
  scroll: { flexGrow: 1, paddingHorizontal: 22 },
  input: {
    flex: 1,
    minHeight: 48,
    color: authColors.text,
    fontSize: 16,
    paddingHorizontal: 15,
  },
  caption: { color: authColors.secondary, fontSize: 13, lineHeight: 19 },
  heading: { color: authColors.text, fontSize: 23, fontWeight: "700" },
});

const styles = StyleSheet.create({
  button: {
    minHeight: 50,
    borderRadius: 9,
    backgroundColor: authColors.primary,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 18,
  },
  disabled: { opacity: 0.52 },
  pressed: { opacity: 0.86 },
  buttonLabel: { color: "#FFFFFF", fontSize: 16, fontWeight: "600" },
  error: {
    color: authColors.danger,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 10,
  },
  fieldBlock: { marginTop: 24 },
  label: { color: authColors.secondary, fontSize: 13, marginBottom: 9 },
  field: {
    minHeight: 50,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: authColors.border,
    backgroundColor: authColors.surface,
    flexDirection: "row",
    alignItems: "center",
  },
});
