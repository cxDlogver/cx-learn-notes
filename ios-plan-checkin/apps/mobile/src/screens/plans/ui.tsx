import type { ReactNode, RefObject } from "react";
import { penColors } from "@plan-checkin/design-tokens";
import {
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

export const planPalette = {
  ...penColors,
  border: "#E1E6DE",
  pale: "#E8F2EB",
  danger: "#A34039",
  amber: "#8C6436",
} as const;
export const planStyles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: planPalette.background },
  scroll: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 40 },
  title: { color: planPalette.text, fontSize: 25, fontWeight: "700" },
  subtitle: {
    color: planPalette.secondary,
    fontSize: 13,
    lineHeight: 20,
    marginTop: 7,
  },
  label: { color: planPalette.secondary, fontSize: 13, marginBottom: 8 },
  field: { marginTop: 22 },
  input: {
    minHeight: 48,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: planPalette.border,
    backgroundColor: planPalette.surface,
    color: planPalette.text,
    fontSize: 16,
  },
  card: {
    backgroundColor: planPalette.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: planPalette.border,
    padding: 16,
    marginTop: 12,
  },
  cardTitle: { color: planPalette.text, fontSize: 16, fontWeight: "600" },
  body: { color: planPalette.secondary, fontSize: 13, lineHeight: 20 },
  row: { flexDirection: "row", alignItems: "center", gap: 10 },
  wrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  flex: { flex: 1 },
  error: {
    color: planPalette.danger,
    marginTop: 12,
    fontSize: 13,
    lineHeight: 19,
  },
  notice: {
    color: planPalette.amber,
    backgroundColor: "#FBF3E7",
    borderRadius: 12,
    padding: 13,
    fontSize: 13,
    lineHeight: 20,
    marginTop: 15,
  },
});
export function PlanScreen({
  children,
  scrollRef,
}: {
  children: ReactNode;
  scrollRef?: RefObject<ScrollView | null>;
}) {
  return (
    <SafeAreaView style={planStyles.screen}>
      <ScrollView
        ref={scrollRef}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={planStyles.scroll}
      >
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}
export function FormField({
  label,
  children,
  testID,
}: {
  label: string;
  children: ReactNode;
  testID: string;
}) {
  return (
    <View testID={testID} style={planStyles.field}>
      <Text style={planStyles.label}>{label}</Text>
      {children}
    </View>
  );
}
export function PlanInput({
  value,
  onChangeText,
  placeholder,
  testID,
  multiline = false,
}: {
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  testID: string;
  multiline?: boolean;
}) {
  return (
    <TextInput
      testID={testID}
      accessibilityLabel={placeholder}
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={planPalette.secondary}
      multiline={multiline}
      style={[
        planStyles.input,
        multiline && {
          minHeight: 86,
          textAlignVertical: "top",
          paddingTop: 12,
        },
      ]}
    />
  );
}
export function Choice({
  label,
  selected,
  onPress,
  testID,
  danger = false,
  disabled = false,
}: {
  label: string;
  selected?: boolean;
  onPress: () => void;
  testID: string;
  danger?: boolean;
  disabled?: boolean;
}) {
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityState={{ selected: Boolean(selected) }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        {
          borderRadius: 10,
          borderWidth: 1,
          borderColor: selected ? planPalette.primary : planPalette.border,
          backgroundColor: selected ? planPalette.pale : planPalette.surface,
          paddingHorizontal: 13,
          paddingVertical: 11,
          opacity: disabled ? 0.55 : pressed ? 0.72 : 1,
        },
      ]}
    >
      <Text
        style={{
          color: danger
            ? planPalette.danger
            : selected
              ? planPalette.primary
              : planPalette.text,
          fontSize: 14,
          fontWeight: selected ? "600" : "400",
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}
export function Submit({
  label,
  onPress,
  pending,
  disabled,
  testID,
  danger = false,
}: {
  label: string;
  onPress: () => void;
  pending?: boolean;
  disabled?: boolean;
  testID: string;
  danger?: boolean;
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
      disabled={disabled || pending}
      onPress={onPress}
      style={({ pressed }) => [
        {
          minHeight: 50,
          borderRadius: 12,
          backgroundColor: danger ? planPalette.danger : planPalette.primary,
          alignItems: "center",
          justifyContent: "center",
          marginTop: 24,
          opacity: disabled ? 0.5 : pressed ? 0.8 : 1,
        },
      ]}
    >
      {pending ? (
        <ActivityIndicator color="#FFF" />
      ) : (
        <Text style={{ color: "#FFF", fontSize: 16, fontWeight: "600" }}>
          {label}
        </Text>
      )}
    </Pressable>
  );
}
export function ErrorText({ message }: { message: string | null }) {
  return message ? (
    <Text accessibilityRole="alert" style={planStyles.error}>
      {message}
    </Text>
  ) : null;
}
