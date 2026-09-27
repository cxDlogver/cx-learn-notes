import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { penColors } from "@plan-checkin/design-tokens";

export type NoticeKind = "offline" | "pending" | "permission" | "failure";

export function StatusNotice({
  kind,
  message,
  testID,
  onAction,
  actionLabel,
}: {
  kind: NoticeKind;
  message: string;
  testID: string;
  onAction?: () => void;
  actionLabel?: string;
}) {
  return (
    <View
      testID={testID}
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
      style={{
        backgroundColor:
          kind === "failure"
            ? "#F9EAE9"
            : kind === "permission"
              ? "#F3F0E9"
              : "#FBF3E7",
        borderRadius: 12,
        padding: 13,
        marginTop: 15,
      }}
    >
      <Text
        style={{
          color: kind === "failure" ? "#A34039" : "#684E30",
          fontSize: 13,
          lineHeight: 20,
        }}
      >
        {message}
      </Text>
      {onAction && actionLabel ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={actionLabel}
          onPress={onAction}
          style={{
            minHeight: 44,
            justifyContent: "center",
            alignSelf: "flex-start",
          }}
        >
          <Text style={{ color: penColors.primary, fontWeight: "600" }}>
            {actionLabel}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export function ScreenState({
  kind,
  message,
  testID,
  onRetry,
}: {
  kind: "loading" | "error" | "empty";
  message: string;
  testID: string;
  onRetry?: () => void;
}) {
  return (
    <View
      testID={testID}
      accessibilityLiveRegion="polite"
      style={{ minHeight: 60, justifyContent: "center", marginTop: 18 }}
    >
      {kind === "loading" ? (
        <ActivityIndicator
          color={penColors.primary}
          accessibilityLabel={message}
        />
      ) : null}
      <Text
        accessibilityRole={kind === "error" ? "alert" : "text"}
        style={{
          color: kind === "error" ? "#A34039" : penColors.secondary,
          fontSize: 14,
          lineHeight: 21,
          marginTop: kind === "loading" ? 9 : 0,
        }}
      >
        {message}
      </Text>
      {kind === "error" && onRetry ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="重试"
          onPress={onRetry}
          style={{
            minHeight: 44,
            justifyContent: "center",
            alignSelf: "flex-start",
          }}
        >
          <Text style={{ color: penColors.primary, fontWeight: "600" }}>
            重试
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}
