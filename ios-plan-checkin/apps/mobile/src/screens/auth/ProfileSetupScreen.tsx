import { useEffect, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import type { UserDto } from "@plan-checkin/contracts";
import {
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useAppServices } from "../../data/services";
import { validNickname, validUsername } from "../../viewmodel/auth";
import {
  authColors,
  authStyles,
  Field,
  InlineError,
  PrimaryAction,
} from "./ui";

type Availability = "idle" | "checking" | "available" | "taken" | "unknown";

export function ProfileSetupScreen({ user }: { user: UserDto }) {
  const { repository, queryClient } = useAppServices();
  const [nickname, setNickname] = useState(user.nickname ?? "");
  const [username, setUsername] = useState(user.username ?? "");
  const [availability, setAvailability] = useState<Availability>("idle");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const normalized = username.normalize("NFKC").trim();

  useEffect(() => {
    if (!validUsername(normalized)) {
      setAvailability("idle");
      return;
    }
    if (normalized === user.username) {
      setAvailability("available");
      return;
    }
    let cancelled = false;
    setAvailability("checking");
    const timer = setTimeout(() => {
      void repository
        .checkUsername(normalized)
        .then((result) => {
          if (!cancelled)
            setAvailability(result.available ? "available" : "taken");
        })
        .catch(() => {
          if (!cancelled) setAvailability("unknown");
        });
    }, 400);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [normalized, repository, user.username]);

  async function save(): Promise<void> {
    if (saving) return;
    if (!validNickname(nickname) || !validUsername(normalized)) {
      setError("请填写昵称和 3–30 位用户名");
      return;
    }
    if (availability === "taken") {
      setError("用户名已被使用，请换一个");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const updated = await repository.updateMe({
        username: normalized,
        nickname: nickname.normalize("NFKC").trim(),
        baseRevision: user.revision,
      });
      queryClient.setQueryData(["me", user.id], updated);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "资料保存失败，请重试");
      await queryClient.invalidateQueries({ queryKey: ["me", user.id] });
    } finally {
      setSaving(false);
    }
  }

  return (
    <SafeAreaView style={authStyles.screen}>
      <KeyboardAvoidingView
        style={authStyles.screen}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.scroll}
        >
          <Text testID="auth.profile.description" style={styles.description}>
            设置一个昵称，方便朋友认出你
          </Text>
          <View testID="auth.profile.avatar" style={styles.avatar}>
            <Ionicons
              name="person-outline"
              size={36}
              color={authColors.secondary}
            />
          </View>
          <Text
            testID="auth.profile.avatar-caption"
            style={styles.avatarCaption}
          >
            头像可稍后设置
          </Text>
          <Field label="昵称" testID="auth.profile.nickname-field">
            <TextInput
              testID="auth.profile.nickname"
              accessibilityLabel="昵称"
              style={authStyles.input}
              value={nickname}
              onChangeText={(value) => {
                setNickname(value);
                setError(null);
              }}
              placeholder="请输入昵称"
              placeholderTextColor={authColors.muted}
              maxLength={20}
              autoCapitalize="none"
            />
          </Field>
          <Text testID="auth.profile.nickname-hint" style={styles.hint}>
            昵称最多 20 个字符，之后也可修改
          </Text>
          <Field label="用户名" testID="auth.profile.username-field">
            <TextInput
              testID="auth.profile.username"
              accessibilityLabel="用户名"
              style={authStyles.input}
              value={username}
              onChangeText={(value) => {
                setUsername(value);
                setError(null);
              }}
              placeholder="字母、数字或下划线"
              placeholderTextColor={authColors.muted}
              maxLength={30}
              autoCapitalize="none"
              autoCorrect={false}
              editable={!user.username}
            />
          </Field>
          <Text
            testID="auth.profile.availability"
            accessibilityLiveRegion="polite"
            style={[styles.hint, availability === "taken" && styles.taken]}
          >
            {availability === "checking"
              ? "正在检查用户名"
              : availability === "available"
                ? "该用户名可用"
                : availability === "taken"
                  ? "用户名已被使用"
                  : availability === "unknown"
                    ? "暂时无法预检查，保存时会再次验证"
                    : "3–30 个字母、数字或下划线；设置后不可修改"}
          </Text>
          <InlineError message={error} />
          <View style={styles.spacer} />
          <PrimaryAction
            testID="auth.profile.submit"
            label="完成设置"
            onPress={() => void save()}
            disabled={
              !validNickname(nickname) ||
              !validUsername(normalized) ||
              availability === "taken"
            }
            pending={saving}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flexGrow: 1,
    paddingHorizontal: 22,
    paddingTop: 22,
    paddingBottom: 24,
  },
  description: {
    color: authColors.secondary,
    fontSize: 14,
    lineHeight: 21,
    marginTop: 4,
  },
  avatar: {
    width: 91,
    height: 91,
    borderRadius: 46,
    backgroundColor: "#E8F2EC",
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    marginTop: 47,
  },
  avatarCaption: {
    color: authColors.secondary,
    fontSize: 13,
    alignSelf: "center",
    marginTop: 10,
  },
  hint: {
    color: authColors.secondary,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 9,
  },
  taken: { color: authColors.danger },
  spacer: { flexGrow: 1, minHeight: 32 },
});
