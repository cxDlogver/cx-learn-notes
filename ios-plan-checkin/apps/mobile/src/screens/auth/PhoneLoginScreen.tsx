import { useState } from "react";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import {
  Alert,
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
import { nativeLinks } from "../../platform/links";
import { normalizePhone, phonePattern } from "../../viewmodel/auth";
import {
  authColors,
  authStyles,
  Field,
  InlineError,
  PrimaryAction,
} from "./ui";

type Props = NativeStackScreenProps<AuthStackParamList, "PhoneLogin">;

export function PhoneLoginScreen({ navigation }: Props) {
  const { repository } = useAppServices();
  const [phone, setPhone] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const normalized = normalizePhone(phone);

  async function openPolicy(
    url: string | undefined,
    title: string,
  ): Promise<void> {
    if (!url || !url.startsWith("https://")) {
      Alert.alert(title, "协议页面尚未配置，请联系应用支持。");
      return;
    }
    try {
      await nativeLinks.openExternal(url);
    } catch {
      Alert.alert(title, "暂时无法打开，请稍后重试。");
    }
  }

  async function requestCode(): Promise<void> {
    if (pending) return;
    if (!phonePattern.test(normalized)) {
      setError("请输入有效的中国大陆手机号");
      return;
    }
    setPending(true);
    setError(null);
    try {
      const challenge = await repository.createSmsChallenge(normalized);
      navigation.navigate("SmsCode", { phone: normalized, challenge });
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "验证码发送失败，请重试",
      );
    } finally {
      setPending(false);
    }
  }
  async function requestCancellation(): Promise<void> {
    if (pending) return;
    if (!phonePattern.test(normalized)) {
      setError("请输入原账号绑定的手机号");
      return;
    }
    setPending(true);
    setError(null);
    try {
      const challenge =
        await repository.createCancellationChallenge(normalized);
      navigation.navigate("SmsCode", {
        phone: normalized,
        challenge,
        purpose: "cancel_deletion",
      });
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "验证码发送失败，请重试",
      );
    } finally {
      setPending(false);
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
          <View style={styles.brand}>
            <View testID="auth.phone.brand-icon" style={styles.brandIcon}>
              <Ionicons name="calendar-outline" size={31} color="#FFFFFF" />
            </View>
            <Text testID="auth.phone.brand-name" style={styles.brandName}>
              行迹
            </Text>
            <Text testID="auth.phone.brand-caption" style={styles.brandCaption}>
              安静地记录，诚实地回顾
            </Text>
          </View>
          <View style={styles.form}>
            <Field label="手机号" testID="auth.phone.field">
              <Text style={styles.country}>+86</Text>
              <View style={styles.divider} />
              <TextInput
                testID="auth.phone.input"
                accessibilityLabel="中国大陆手机号"
                style={authStyles.input}
                placeholder="请输入手机号"
                placeholderTextColor={authColors.muted}
                keyboardType="phone-pad"
                autoComplete="tel"
                textContentType="telephoneNumber"
                maxLength={13}
                value={phone}
                onChangeText={(value) => {
                  setPhone(value);
                  setError(null);
                }}
                returnKeyType="done"
                onSubmitEditing={() => void requestCode()}
              />
            </Field>
            <View testID="auth.phone.privacy" style={styles.privacy}>
              <Text style={authStyles.caption}>继续即代表同意 </Text>
              <Pressable
                accessibilityRole="link"
                accessibilityLabel="服务协议"
                style={{ minHeight: 44, justifyContent: "center" }}
                onPress={() =>
                  void openPolicy(process.env.EXPO_PUBLIC_TERMS_URL, "服务协议")
                }
              >
                <Text style={styles.policy}>《服务协议》</Text>
              </Pressable>
              <Text style={authStyles.caption}> 和 </Text>
              <Pressable
                accessibilityRole="link"
                accessibilityLabel="隐私政策"
                style={{ minHeight: 44, justifyContent: "center" }}
                onPress={() =>
                  void openPolicy(
                    process.env.EXPO_PUBLIC_PRIVACY_URL,
                    "隐私政策",
                  )
                }
              >
                <Text style={styles.policy}>《隐私政策》</Text>
              </Pressable>
            </View>
            <InlineError message={error} />
            <View style={styles.action}>
              <PrimaryAction
                testID="auth.phone.submit"
                label="获取验证码"
                onPress={() => void requestCode()}
                disabled={normalized.length === 0}
                pending={pending}
              />
            </View>
            <Pressable
              testID="auth.phone.cancel-deletion"
              accessibilityRole="button"
              accessibilityLabel="撤销账号注销"
              onPress={() => void requestCancellation()}
              style={{
                minHeight: 44,
                alignItems: "center",
                justifyContent: "center",
                marginTop: 15,
              }}
            >
              <Text style={styles.policy}>30 天内撤销账号注销</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  brand: { alignItems: "center", marginTop: 60 },
  brandIcon: {
    width: 65,
    height: 65,
    borderRadius: 18,
    backgroundColor: authColors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  brandName: {
    color: authColors.text,
    fontSize: 23,
    fontWeight: "700",
    marginTop: 14,
  },
  brandCaption: { color: authColors.secondary, fontSize: 13, marginTop: 5 },
  form: { marginTop: 25 },
  country: { color: authColors.text, fontSize: 15, paddingHorizontal: 14 },
  divider: { width: 1, height: 48, backgroundColor: authColors.border },
  privacy: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    marginTop: 17,
  },
  policy: { color: authColors.primary, fontSize: 13 },
  action: { marginTop: 30 },
});
