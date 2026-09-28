import { useState } from "react";
import {
  CommonActions,
  useNavigation,
  type NavigationProp,
} from "@react-navigation/native";
import { useQuery } from "@tanstack/react-query";
import { Alert, Pressable, Text, TextInput, View } from "react-native";
import { useAppServices } from "../../data/services";
import { ScreenState } from "../../components/ScreenState";
import type { RootStackParamList } from "../../navigation/navigation";
import {
  normalizePhone,
  phonePattern,
  validNickname,
} from "../../viewmodel/auth";
import {
  Choice,
  ErrorText,
  PlanScreen,
  planPalette,
  planStyles,
  Submit,
} from "../plans/ui";

type PhoneChallenge = {
  requestId: string;
  oldMasked: string;
  newMasked: string;
  expiresAt: string;
};

export function ProfileSettingsScreen() {
  const { repository, session, queryClient } = useAppServices();
  const accountId = session.getSnapshot().userId;
  const user = useQuery({
    queryKey: ["me", accountId],
    queryFn: () => repository.getMe(),
  });
  const [nickname, setNickname] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const save = async () => {
    if (!user.data?.username || busy) return;
    const value = (nickname ?? user.data.nickname ?? "")
      .normalize("NFKC")
      .trim();
    if (!validNickname(value)) {
      setError("昵称需填写 1–20 个字符");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const updated = await repository.updateMe({
        username: user.data.username,
        nickname: value,
        baseRevision: user.data.revision,
      });
      queryClient.setQueryData(["me", accountId], updated);
      setNickname(null);
      Alert.alert("已保存", "昵称已更新。", [{ text: "好" }]);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "保存失败，请联网重试");
      await user.refetch();
    } finally {
      setBusy(false);
    }
  };
  return (
    <PlanScreen>
      <Text testID="profile-settings.title" style={planStyles.title}>
        个人资料
      </Text>
      {user.isPending ? (
        <ScreenState
          kind="loading"
          testID="profile-settings.loading"
          message="正在读取资料…"
        />
      ) : null}
      {user.isError ? (
        <ScreenState
          kind="error"
          testID="profile-settings.error"
          message="暂时无法读取资料"
          onRetry={() => void user.refetch()}
        />
      ) : null}
      {user.data ? (
        <>
          <Text style={[planStyles.label, { marginTop: 28 }]}>昵称</Text>
          <TextInput
            testID="profile-settings.nickname"
            accessibilityLabel="昵称"
            style={planStyles.input}
            value={nickname ?? user.data.nickname ?? ""}
            onChangeText={(value) => {
              setNickname(value);
              setError(null);
            }}
            maxLength={20}
            autoCapitalize="none"
          />
          <Text style={[planStyles.label, { marginTop: 24 }]}>用户名</Text>
          <View style={planStyles.card}>
            <Text
              testID="profile-settings.username"
              style={planStyles.cardTitle}
            >
              @{user.data.username}
            </Text>
            <Text style={planStyles.body}>
              用户名设置后不可修改，也不会暴露手机号。
            </Text>
          </View>
          <ErrorText message={error} />
          <Submit
            testID="profile-settings.save"
            label="保存资料"
            pending={busy}
            disabled={
              busy || (nickname ?? user.data.nickname) === user.data.nickname
            }
            onPress={() => void save()}
          />
          <Text style={[planStyles.label, { marginTop: 32 }]}>账号安全</Text>
          <Choice
            testID="profile-settings.change-phone"
            label="更换手机号"
            onPress={() => navigation.navigate("ChangePhone")}
          />
          <Text style={[planStyles.body, { marginTop: 10 }]}>
            手机号仅用于登录和账号恢复，不会出现在好友搜索中。
          </Text>
        </>
      ) : null}
    </PlanScreen>
  );
}

export function ChangePhoneScreen() {
  const { repository, session, queryClient } = useAppServices();
  const [phone, setPhone] = useState("");
  const [challenge, setChallenge] = useState<PhoneChallenge | null>(null);
  const [oldCode, setOldCode] = useState("");
  const [newCode, setNewCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const start = async () => {
    if (busy) return;
    const value = normalizePhone(phone);
    if (!phonePattern.test(value)) {
      setError("请输入有效的中国大陆手机号");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      setChallenge(await repository.createPhoneChange(value));
      setOldCode("");
      setNewCode("");
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "验证码发送失败，请重试",
      );
    } finally {
      setBusy(false);
    }
  };
  const confirm = async () => {
    if (!challenge || busy) return;
    if (!/^\d{6}$/.test(oldCode) || !/^\d{6}$/.test(newCode)) {
      setError("请分别输入两个 6 位验证码");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await repository.confirmPhoneChange({
        requestId: challenge.requestId,
        oldCode,
        newCode,
      });
      queryClient.clear();
      await session.clear();
      Alert.alert("手机号已更换", "所有旧会话已失效，请使用新手机号重新登录。");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "换号失败，请重试");
    } finally {
      setBusy(false);
    }
  };
  return (
    <PlanScreen>
      <Text testID="change-phone.title" style={planStyles.title}>
        更换手机号
      </Text>
      <Text style={planStyles.subtitle}>
        需要同时验证当前手机号和新手机号。更换成功后，所有设备都需要重新登录。
      </Text>
      {!challenge ? (
        <>
          <Text style={[planStyles.label, { marginTop: 32 }]}>
            新手机号（+86）
          </Text>
          <TextInput
            testID="change-phone.new-phone"
            accessibilityLabel="新手机号"
            keyboardType="phone-pad"
            textContentType="telephoneNumber"
            maxLength={11}
            value={phone}
            onChangeText={(value) => {
              setPhone(value);
              setError(null);
            }}
            style={planStyles.input}
            placeholder="请输入 11 位手机号"
            placeholderTextColor={planPalette.secondary}
          />
          <ErrorText message={error} />
          <Submit
            testID="change-phone.send"
            label="发送验证码"
            pending={busy}
            disabled={busy || !phonePattern.test(normalizePhone(phone))}
            onPress={() => void start()}
          />
        </>
      ) : (
        <>
          <Text style={[planStyles.label, { marginTop: 30 }]}>
            当前号码 {challenge.oldMasked} 收到的验证码
          </Text>
          <TextInput
            testID="change-phone.old-code"
            accessibilityLabel="当前手机号验证码"
            keyboardType="number-pad"
            textContentType="oneTimeCode"
            maxLength={6}
            value={oldCode}
            onChangeText={(value) => {
              setOldCode(value);
              setError(null);
            }}
            style={planStyles.input}
          />
          <Text style={[planStyles.label, { marginTop: 22 }]}>
            新号码 {challenge.newMasked} 收到的验证码
          </Text>
          <TextInput
            testID="change-phone.new-code"
            accessibilityLabel="新手机号验证码"
            keyboardType="number-pad"
            textContentType="oneTimeCode"
            maxLength={6}
            value={newCode}
            onChangeText={(value) => {
              setNewCode(value);
              setError(null);
            }}
            style={planStyles.input}
          />
          <Text
            testID="change-phone.expiry"
            style={[planStyles.body, { marginTop: 15 }]}
          >
            验证码有效期至{" "}
            {new Date(challenge.expiresAt).toLocaleTimeString("zh-CN", {
              hour: "2-digit",
              minute: "2-digit",
            })}
            。过期后请重新申请。
          </Text>
          <ErrorText message={error} />
          <Submit
            testID="change-phone.confirm"
            label="确认更换"
            pending={busy}
            disabled={
              busy || !/^\d{6}$/.test(oldCode) || !/^\d{6}$/.test(newCode)
            }
            onPress={() => void confirm()}
          />
          <Pressable
            testID="change-phone.restart"
            accessibilityRole="button"
            onPress={() => {
              setChallenge(null);
              setOldCode("");
              setNewCode("");
              setError(null);
            }}
          >
            <Text
              style={{
                color: planPalette.primary,
                textAlign: "center",
                marginTop: 20,
              }}
            >
              重新填写新号码
            </Text>
          </Pressable>
        </>
      )}
    </PlanScreen>
  );
}

export function PrivacySettingsScreen() {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  return (
    <PlanScreen>
      <Text testID="privacy-settings.title" style={planStyles.title}>
        隐私
      </Text>
      <Text style={planStyles.subtitle}>
        只有你明确分享的计划，好友才可以查看。
      </Text>
      <View style={planStyles.card}>
        <Text style={planStyles.cardTitle}>好友与分享</Text>
        <Text style={[planStyles.body, { marginTop: 10 }]}>
          好友通过用户名找到你。分享前可以预览对方将看到的历史状态和文字备注；照片、数值和其他计划始终不对好友展示。
        </Text>
        <Choice
          testID="privacy-settings.friends"
          label="查看好友与分享"
          onPress={() =>
            navigation.dispatch(
              CommonActions.navigate({
                name: "Home",
                params: { screen: "Friends" },
              }),
            )
          }
        />
      </View>
      <View style={planStyles.card}>
        <Text style={planStyles.cardTitle}>账号与数据</Text>
        <Text style={[planStyles.body, { marginTop: 10 }]}>
          你可以更换登录手机号、导出自己的数据，也可以申请删除账号。
        </Text>
        <Choice
          testID="privacy-settings.profile"
          label="账号资料"
          onPress={() => navigation.navigate("ProfileSettings")}
        />
        <Choice
          testID="privacy-settings.export"
          label="导出数据"
          onPress={() => navigation.navigate("ExportData")}
        />
        <Choice
          testID="privacy-settings.delete"
          label="删除账号"
          onPress={() => navigation.navigate("DeleteAccount")}
        />
      </View>
    </PlanScreen>
  );
}

export function NotificationSettingsScreen() {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  return (
    <PlanScreen>
      <Text testID="notification-settings.title" style={planStyles.title}>
        通知
      </Text>
      <Text style={planStyles.subtitle}>
        计划提醒和社交通知分别设置，系统权限可在 iOS 设置中管理。
      </Text>
      <View style={planStyles.card}>
        <Choice
          testID="notification-settings.reminders"
          label="计划提醒"
          onPress={() => navigation.navigate("Reminders")}
        />
        <Choice
          testID="notification-settings.social"
          label="社交通知"
          onPress={() => navigation.navigate("SocialNotifications")}
        />
      </View>
    </PlanScreen>
  );
}
