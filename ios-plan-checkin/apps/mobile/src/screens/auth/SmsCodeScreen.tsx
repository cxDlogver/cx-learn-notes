import { useEffect, useRef, useState } from "react";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import * as Crypto from "expo-crypto";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useAppServices } from "../../data/services";
import type { AuthStackParamList } from "../../navigation/navigation";
import { maskPhone, remainingSeconds } from "../../viewmodel/auth";
import { authColors, authStyles, InlineError } from "./ui";

type Props = NativeStackScreenProps<AuthStackParamList, "SmsCode">;

export function SmsCodeScreen({ navigation, route }: Props) {
  const { repository, session } = useAppServices();
  const [challenge, setChallenge] = useState(route.params.challenge);
  const [code, setCode] = useState("");
  const [pending, setPending] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resendAt, setResendAt] = useState(
    Date.now() + challenge.resendAfterSeconds * 1000,
  );
  const [now, setNow] = useState(Date.now());
  const input = useRef<TextInput>(null);
  const attempt = useRef<{ code: string; key: string } | null>(null);
  const sending = useRef(false);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  const remaining = remainingSeconds(resendAt, now);
  const expired = now >= Date.parse(challenge.expiresAt);

  async function verify(value: string): Promise<void> {
    if (!/^[0-9]{6}$/.test(value) || sending.current) return;
    if (expired) {
      setError("验证码已过期，请重新发送");
      return;
    }
    sending.current = true;
    setPending(true);
    setError(null);
    if (attempt.current?.code !== value)
      attempt.current = { code: value, key: Crypto.randomUUID() };
    try {
      const tokens = await repository.verifySms(
        challenge.challengeId,
        value,
        attempt.current.key,
      );
      await session.adopt(tokens);
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "验证码校验失败，请重试",
      );
    } finally {
      sending.current = false;
      setPending(false);
    }
  }

  useEffect(() => {
    if (code.length === 6) void verify(code);
  }, [code]);

  async function resend(): Promise<void> {
    if (remaining > 0 || resending) return;
    setResending(true);
    setError(null);
    try {
      const next = await repository.createSmsChallenge(route.params.phone);
      setChallenge(next);
      setResendAt(Date.now() + next.resendAfterSeconds * 1000);
      setNow(Date.now());
      setCode("");
      attempt.current = null;
      input.current?.focus();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "发送失败，请稍后重试");
    } finally {
      setResending(false);
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
          contentContainerStyle={authStyles.scroll}
        >
          <View style={styles.top}>
            <Text testID="auth.sms.instruction" style={authStyles.caption}>
              验证码已发送至 {maskPhone(route.params.phone)}
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="重新编辑手机号"
              onPress={() => navigation.goBack()}
              style={{ minHeight: 44, justifyContent: "center" }}
            >
              <Text style={styles.edit}>重新编辑手机号</Text>
            </Pressable>
          </View>
          <Pressable
            testID="auth.sms.digits"
            accessibilityRole="button"
            accessibilityLabel="输入六位验证码"
            onPress={() => input.current?.focus()}
            style={styles.codeRow}
          >
            {Array.from({ length: 6 }, (_, index) => (
              <View
                key={index}
                testID={`auth.sms.digit.${index + 1}`}
                style={[
                  styles.digit,
                  code.length === index && styles.digitActive,
                ]}
              >
                <Text style={styles.digitText}>{code[index] ?? ""}</Text>
              </View>
            ))}
            <TextInput
              ref={input}
              testID="auth.sms.input"
              accessibilityLabel="六位短信验证码"
              style={styles.hiddenInput}
              value={code}
              autoFocus
              onChangeText={(value) => {
                setCode(value.replace(/\D/g, "").slice(0, 6));
                setError(null);
                if (attempt.current?.code !== value) attempt.current = null;
              }}
              keyboardType="number-pad"
              textContentType="oneTimeCode"
              autoComplete="sms-otp"
              maxLength={6}
              importantForAutofill="yes"
              caretHidden
            />
          </Pressable>
          <InlineError message={error} />
          {error && code.length === 6 && !expired ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="重新验证"
              onPress={() => void verify(code)}
              style={[
                styles.retry,
                { minHeight: 44, justifyContent: "center" },
              ]}
            >
              <Text style={styles.edit}>重新验证</Text>
            </Pressable>
          ) : null}
          <Pressable
            testID="auth.sms.resend"
            accessibilityRole="button"
            accessibilityLabel={
              remaining > 0
                ? `${remaining} 秒后可重新发送验证码`
                : "重新发送验证码"
            }
            accessibilityState={{ disabled: remaining > 0 || resending }}
            disabled={remaining > 0 || resending}
            onPress={() => void resend()}
            style={[styles.resend, { minHeight: 44, justifyContent: "center" }]}
          >
            <Text style={remaining > 0 ? styles.waiting : styles.edit}>
              {resending
                ? "正在重新发送"
                : remaining > 0
                  ? `${remaining}秒后可重新发送`
                  : "重新发送验证码"}
            </Text>
          </Pressable>
          <Text style={styles.expiry}>
            {expired ? "验证码已过期" : "验证码有效期 5 分钟"}
          </Text>
          {pending ? (
            <Text accessibilityLiveRegion="polite" style={styles.expiry}>
              正在验证
            </Text>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  top: {
    marginTop: 42,
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  edit: { color: authColors.primary, fontSize: 14, fontWeight: "500" },
  codeRow: {
    marginTop: 45,
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 7,
    position: "relative",
  },
  digit: {
    flex: 1,
    maxWidth: 50,
    minWidth: 38,
    height: 56,
    borderWidth: 1,
    borderColor: authColors.border,
    borderRadius: 12,
    backgroundColor: authColors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  digitActive: { borderWidth: 2, borderColor: authColors.primary },
  digitText: { color: authColors.text, fontSize: 24, fontWeight: "600" },
  hiddenInput: {
    position: "absolute",
    left: 0,
    top: 0,
    width: "100%",
    height: 56,
    opacity: 0.01,
    color: "transparent",
  },
  resend: {
    alignItems: "center",
    marginTop: 24,
    minHeight: 44,
    justifyContent: "center",
  },
  retry: {
    alignItems: "center",
    marginTop: 12,
    minHeight: 44,
    justifyContent: "center",
  },
  waiting: { color: authColors.secondary, fontSize: 14 },
  expiry: {
    color: authColors.muted,
    fontSize: 13,
    textAlign: "center",
    marginTop: 11,
  },
});
