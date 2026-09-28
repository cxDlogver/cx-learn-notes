import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { Ionicons } from "@expo/vector-icons";
import * as Notifications from "expo-notifications";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import {
  CommonActions,
  NavigationContainer,
  createNavigationContainerRef,
} from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useQuery } from "@tanstack/react-query";
import type {
  OneTimeResolution,
  PlanKind,
  SmsChallengeDto,
} from "@plan-checkin/contracts";
import { penColors } from "@plan-checkin/design-tokens";
import {
  ActivityIndicator,
  Alert,
  Button,
  SafeAreaView,
  StyleSheet,
  Text,
} from "react-native";
import { useAppServices } from "../data/services";
import { nativeLinks } from "../platform/links";
import { PhoneLoginScreen } from "../screens/auth/PhoneLoginScreen";
import { ProfileSetupScreen } from "../screens/auth/ProfileSetupScreen";
import { SmsCodeScreen } from "../screens/auth/SmsCodeScreen";
import { PlanListScreen } from "../screens/plans/PlanListScreen";
import {
  EditPlanScreen,
  PlanFormScreen,
} from "../screens/plans/PlanFormScreen";
import { GroupManagementScreen } from "../screens/plans/GroupManagementScreen";
import { PlanConfirmationsScreen } from "../screens/plans/PlanConfirmationsScreen";
import { PlanDetailScreen } from "../screens/plans/PlanDetailScreen";
import { RemindersScreen } from "../screens/plans/RemindersScreen";
import { EncouragementsScreen } from "../screens/social/EncouragementsScreen";
import { SocialNotificationsScreen } from "../screens/social/SocialNotificationsScreen";
import { SettingsScreen } from "../screens/settings/SettingsScreen";
import {
  ChangePhoneScreen,
  NotificationSettingsScreen,
  PrivacySettingsScreen,
  ProfileSettingsScreen,
} from "../screens/settings/AccountScreens";
import { CalendarScreen } from "../screens/calendar/CalendarScreen";
import { TodayScreen } from "../screens/today/TodayScreen";
import {
  RecordEditorScreen,
  type RecordMode,
} from "../screens/today/RecordEditorScreen";
import { RecordConflictScreen } from "../screens/today/RecordConflictScreen";
import { SyncFeedbackScreen } from "../screens/today/SyncFeedbackScreen";
import {
  FriendsListScreen,
  FriendProfileScreen,
  SharedPlanDetailScreen,
  SelectShareFriendScreen,
  SharePreviewScreen,
  SharePermissionsScreen,
} from "../screens/social/SocialScreens";
import type { PlanDraft } from "../screens/plans/planForm";
import { Shell } from "./entryScreens";
import { parseAppLink, type AppLink } from "./links";

export type MainTabParamList = {
  Today: undefined;
  Calendar: undefined;
  Plans: undefined;
  Friends: undefined;
};
export type RootStackParamList = {
  Home: undefined;
  PlanDetail: { planId: string };
  PlanCalendar: { planId: string };
  Checkin: {
    planId: string;
    businessDate: string;
    mode?: RecordMode;
    ruleVersion?: number;
    resolution?: OneTimeResolution;
  };
  RecordConflict: { planId: string; businessDate: string };
  SyncFeedback: undefined;
  Settings: undefined;
  ProfileSettings: undefined;
  ChangePhone: undefined;
  PrivacySettings: undefined;
  NotificationSettings: undefined;
  ExportData: undefined;
  DeleteAccount: undefined;
  Reminders: { planId?: string } | undefined;
  CreatePlan: { kind: PlanKind; draft?: PlanDraft };
  EditPlan: { planId: string };
  GroupManagement: undefined;
  PlanConfirmations: { planId: string };
  FriendProfile: { friendId: string };
  SharedPlanDetail: { planId: string; friendId: string };
  SelectShareFriend: { planId: string };
  SharePreview: { planId: string; friendId: string };
  SharePermissions: { friendId: string };
  Encouragements: { checkinId: string; canSend: boolean };
  SocialNotifications: undefined;
};
export type AuthStackParamList = {
  PhoneLogin: undefined;
  SmsCode: { phone: string; challenge: SmsChallengeDto };
  ProfileSetup: undefined;
};

const Tabs = createBottomTabNavigator<MainTabParamList>();
const RootStack = createNativeStackNavigator<RootStackParamList>();
const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const navigationRef = createNavigationContainerRef<RootStackParamList>();
const tabIcons: Record<keyof MainTabParamList, keyof typeof Ionicons.glyphMap> =
  {
    Today: "today-outline",
    Calendar: "calendar-outline",
    Plans: "list-outline",
    Friends: "people-outline",
  };

function MainTabs() {
  return (
    <Tabs.Navigator
      screenOptions={({ route }) => ({
        tabBarActiveTintColor: penColors.primary,
        tabBarInactiveTintColor: penColors.secondary,
        tabBarStyle: { backgroundColor: penColors.surface },
        tabBarLabelPosition: "below-icon",
        tabBarIcon: ({ color, size }) => (
          <Ionicons name={tabIcons[route.name]} color={color} size={size} />
        ),
      })}
    >
      <Tabs.Screen
        name="Today"
        component={TodayScreen}
        options={{
          title: "今日",
          headerRight: () => (
            <Button
              title="个人"
              onPress={() => navigationRef.navigate("Settings")}
              color={penColors.primary}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="Calendar"
        component={CalendarScreen}
        options={{ title: "日历" }}
      />
      <Tabs.Screen
        name="Plans"
        component={PlanListScreen}
        options={{ title: "计划" }}
      />
      <Tabs.Screen
        name="Friends"
        component={FriendsListScreen}
        options={{ title: "朋友" }}
      />
    </Tabs.Navigator>
  );
}

function MainStack() {
  return (
    <RootStack.Navigator>
      <RootStack.Screen
        name="Home"
        component={MainTabs}
        options={{ headerShown: false }}
      />
      <RootStack.Screen name="PlanDetail" options={{ title: "计划详情" }}>
        {({ route }) => <PlanDetailScreen planId={route.params.planId} />}
      </RootStack.Screen>
      <RootStack.Screen name="PlanCalendar" options={{ title: "计划日历" }}>
        {({ route }) => <CalendarScreen planId={route.params.planId} />}
      </RootStack.Screen>
      <RootStack.Screen
        name="Checkin"
        options={{ headerShown: false, presentation: "modal" }}
      >
        {({ route, navigation }) => (
          <RecordEditorScreen
            {...route.params}
            onDone={() => navigation.goBack()}
          />
        )}
      </RootStack.Screen>
      <RootStack.Screen
        name="RecordConflict"
        options={{ headerShown: false, presentation: "modal" }}
      >
        {({ route, navigation }) => (
          <RecordConflictScreen
            {...route.params}
            onDone={() => navigation.goBack()}
          />
        )}
      </RootStack.Screen>
      <RootStack.Screen name="SyncFeedback" options={{ title: "同步状态" }}>
        {({ navigation }) => (
          <SyncFeedbackScreen
            onConflict={(planId, businessDate) =>
              navigation.navigate("RecordConflict", { planId, businessDate })
            }
            onEdit={(planId, businessDate) =>
              navigation.navigate("Checkin", {
                planId,
                businessDate,
                mode: "edit",
              })
            }
          />
        )}
      </RootStack.Screen>
      <RootStack.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          headerTitle: () => (
            <Text
              testID="settings.title"
              style={{ color: penColors.text, fontSize: 17, fontWeight: "700" }}
            >
              设置
            </Text>
          ),
        }}
      />
      <RootStack.Screen
        name="ProfileSettings"
        component={ProfileSettingsScreen}
        options={{ title: "资料" }}
      />
      <RootStack.Screen
        name="ChangePhone"
        component={ChangePhoneScreen}
        options={{ title: "更换手机号" }}
      />
      <RootStack.Screen
        name="PrivacySettings"
        component={PrivacySettingsScreen}
        options={{ title: "隐私" }}
      />
      <RootStack.Screen
        name="NotificationSettings"
        component={NotificationSettingsScreen}
        options={{ title: "通知" }}
      />
      <RootStack.Screen name="ExportData" options={{ title: "导出数据" }}>
        {() => <Shell title="导出数据" body="数据导出功能正在开发。" />}
      </RootStack.Screen>
      <RootStack.Screen name="DeleteAccount" options={{ title: "删除账号" }}>
        {() => <Shell title="删除账号" body="账号删除功能正在开发。" />}
      </RootStack.Screen>
      <RootStack.Screen
        name="Reminders"
        options={{
          headerTitle: () => (
            <Text
              testID="reminders.title"
              style={{ color: penColors.text, fontSize: 18, fontWeight: "600" }}
            >
              提醒设置
            </Text>
          ),
        }}
      >
        {({ route }) => <RemindersScreen planId={route.params?.planId} />}
      </RootStack.Screen>
      <RootStack.Screen name="CreatePlan" options={{ title: "创建计划" }}>
        {({ route, navigation }) => (
          <PlanFormScreen
            key={route.params.kind}
            kind={route.params.kind}
            initial={route.params.draft}
            onDone={() => navigation.goBack()}
          />
        )}
      </RootStack.Screen>
      <RootStack.Screen name="EditPlan" options={{ title: "编辑计划" }}>
        {({ route, navigation }) => (
          <EditPlanScreen
            planId={route.params.planId}
            onDone={() => navigation.goBack()}
          />
        )}
      </RootStack.Screen>
      <RootStack.Screen
        name="GroupManagement"
        component={GroupManagementScreen}
        options={{ title: "管理分组" }}
      />
      <RootStack.Screen
        name="PlanConfirmations"
        options={{ title: "管理计划" }}
      >
        {({ route, navigation }) => (
          <PlanConfirmationsScreen
            planId={route.params.planId}
            onDone={() => navigation.goBack()}
          />
        )}
      </RootStack.Screen>
      <RootStack.Screen name="FriendProfile" options={{ title: "朋友主页" }}>
        {({ route }) => (
          <FriendProfileScreen friendId={route.params.friendId} />
        )}
      </RootStack.Screen>
      <RootStack.Screen name="SharedPlanDetail" options={{ title: "好友计划" }}>
        {({ route }) => <SharedPlanDetailScreen {...route.params} />}
      </RootStack.Screen>
      <RootStack.Screen
        name="SelectShareFriend"
        options={{ title: "选择好友" }}
      >
        {({ route }) => <SelectShareFriendScreen {...route.params} />}
      </RootStack.Screen>
      <RootStack.Screen name="SharePreview" options={{ title: "分享预览" }}>
        {({ route }) => <SharePreviewScreen {...route.params} />}
      </RootStack.Screen>
      <RootStack.Screen name="SharePermissions" options={{ title: "分享权限" }}>
        {({ route }) => <SharePermissionsScreen {...route.params} />}
      </RootStack.Screen>
      <RootStack.Screen name="Encouragements" options={{ title: "鼓励留言" }}>
        {({ route }) => <EncouragementsScreen {...route.params} />}
      </RootStack.Screen>
      <RootStack.Screen
        name="SocialNotifications"
        component={SocialNotificationsScreen}
        options={{ title: "社交通知" }}
      />
    </RootStack.Navigator>
  );
}

export function AppNavigation() {
  const { session, repository, queryClient, todaySession } = useAppServices();
  const snapshot = useSyncExternalStore(
    session.subscribe,
    session.getSnapshot,
    session.getSnapshot,
  );
  const profile = useQuery({
    queryKey: ["me", snapshot.userId],
    queryFn: () => repository.getMe(),
    enabled: snapshot.phase === "authenticated",
  });
  const pending = useRef<AppLink | null>(null);
  const pendingNotification = useRef<{
    accountId: string;
    planId: string;
  } | null>(null);
  const pendingSocialNotification = useRef(false);
  const opening = useRef(false);
  const cachedUser = useRef<string | null>(null);
  const [ready, setReady] = useState(false);
  const phase = useRef(snapshot.phase);
  phase.current = snapshot.phase;
  const profileReady = useRef(
    Boolean(profile.data?.username && profile.data.nickname),
  );
  profileReady.current = Boolean(
    profile.data?.username && profile.data.nickname,
  );

  const openPending = useCallback(async () => {
    const link = pending.current;
    if (
      !link ||
      opening.current ||
      phase.current !== "authenticated" ||
      !profileReady.current ||
      !ready ||
      !navigationRef.isReady()
    )
      return;
    opening.current = true;
    try {
      const plan = await repository.getPlan(link.planId);
      if (pending.current !== link) return;
      queryClient.setQueryData(["plan", link.planId], plan);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["today"] }),
        queryClient.invalidateQueries({
          queryKey: ["plan-detail", link.planId],
        }),
        queryClient.invalidateQueries({ queryKey: ["checkin", link.planId] }),
      ]);
      if (pending.current !== link) return;
      pending.current = null;
      if (link.screen === "PlanDetail")
        navigationRef.navigate("PlanDetail", { planId: link.planId });
      else
        navigationRef.navigate("Checkin", {
          planId: link.planId,
          businessDate: link.businessDate,
        });
    } catch {
      if (pending.current === link) {
        pending.current = null;
        Alert.alert(
          "无法打开计划",
          "计划可能已删除、权限已变化，或当前网络不可用。请稍后重试。",
        );
      }
    } finally {
      opening.current = false;
      if (pending.current && pending.current !== link)
        void openPendingRef.current();
    }
  }, [queryClient, ready, repository]);

  const openPendingRef = useRef(openPending);
  openPendingRef.current = openPending;
  const openSocial = useCallback(() => {
    if (
      !pendingSocialNotification.current ||
      phase.current !== "authenticated" ||
      !profileReady.current ||
      !ready ||
      !navigationRef.isReady()
    )
      return;
    pendingSocialNotification.current = false;
    void queryClient.invalidateQueries({ queryKey: ["friends"] });
    void queryClient.invalidateQueries({ queryKey: ["friend-requests"] });
    void queryClient.invalidateQueries({ queryKey: ["shared-plan"] });
    void queryClient.invalidateQueries({ queryKey: ["encouragements"] });
    navigationRef.dispatch(
      CommonActions.navigate({ name: "Home", params: { screen: "Friends" } }),
    );
  }, [queryClient, ready]);
  const openSocialRef = useRef(openSocial);
  openSocialRef.current = openSocial;

  useEffect(() => {
    const accept = (url: string) => {
      const link = parseAppLink(url);
      if (link) pending.current = link;
      void openPendingRef.current();
    };
    void nativeLinks.initialUrl().then((url) => {
      if (url) accept(url);
    });
    return nativeLinks.subscribe(accept);
  }, []);
  useEffect(() => {
    const accept = (response: Notifications.NotificationResponse) => {
      const data = response.notification.request.content.data;
      if (data?.kind === "social") {
        pendingSocialNotification.current = true;
        void openSocialRef.current();
        void Notifications.clearLastNotificationResponseAsync();
        return;
      }
      if (
        data?.kind !== "plan-checkin-reminder-v1" ||
        typeof data.accountId !== "string" ||
        typeof data.planId !== "string"
      )
        return;
      const current = session.getSnapshot();
      if (current.phase === "authenticated") {
        if (current.userId !== data.accountId) return;
        pending.current = { screen: "PlanDetail", planId: data.planId };
        void openPendingRef.current();
      } else
        pendingNotification.current = {
          accountId: data.accountId,
          planId: data.planId,
        };
      void Notifications.clearLastNotificationResponseAsync();
    };
    const subscription =
      Notifications.addNotificationResponseReceivedListener(accept);
    void Notifications.getLastNotificationResponseAsync().then((response) => {
      if (response) accept(response);
    });
    return () => subscription.remove();
  }, [session]);
  useEffect(() => {
    const notification = pendingNotification.current;
    if (!notification || snapshot.phase !== "authenticated") return;
    pendingNotification.current = null;
    if (notification.accountId !== snapshot.userId) return;
    pending.current = { screen: "PlanDetail", planId: notification.planId };
    void openPendingRef.current();
  }, [snapshot.phase, snapshot.userId]);
  useEffect(() => {
    void openPending();
    openSocial();
  }, [
    openPending,
    openSocial,
    snapshot.phase,
    profile.data?.username,
    profile.data?.nickname,
  ]);
  useEffect(() => {
    if (snapshot.phase === "unauthenticated") {
      queryClient.clear();
      todaySession.clear();
    }
  }, [queryClient, snapshot.phase, todaySession]);
  useEffect(() => {
    if (cachedUser.current && cachedUser.current !== snapshot.userId) {
      queryClient.clear();
      todaySession.clear();
    }
    cachedUser.current = snapshot.userId;
  }, [queryClient, snapshot.userId, todaySession]);

  if (snapshot.phase === "loading")
    return (
      <SafeAreaView style={styles.screen}>
        <ActivityIndicator style={styles.loading} color={penColors.primary} />
      </SafeAreaView>
    );
  if (snapshot.phase === "unavailable")
    return (
      <Shell
        title="暂时无法恢复会话"
        body="请检查网络后重试，原有会话仍保留在本机。"
        retry={() => void session.restore()}
      />
    );
  if (snapshot.phase === "authenticated" && profile.isPending)
    return (
      <SafeAreaView style={styles.screen}>
        <ActivityIndicator style={styles.loading} color={penColors.primary} />
      </SafeAreaView>
    );
  if (snapshot.phase === "authenticated" && profile.isError)
    return (
      <Shell
        title="暂时无法读取资料"
        body="请检查网络后重试。"
        retry={() => void profile.refetch()}
      />
    );
  const needsProfile =
    snapshot.phase === "authenticated" &&
    (!profile.data?.username || !profile.data.nickname);
  return (
    <NavigationContainer
      ref={navigationRef}
      onReady={() => {
        setReady(true);
        void openPendingRef.current();
        openSocialRef.current();
      }}
    >
      {snapshot.phase === "authenticated" && !needsProfile ? (
        <MainStack />
      ) : snapshot.phase === "authenticated" && profile.data ? (
        <AuthStack.Navigator>
          <AuthStack.Screen name="ProfileSetup" options={{ title: "完善资料" }}>
            {() => <ProfileSetupScreen user={profile.data} />}
          </AuthStack.Screen>
        </AuthStack.Navigator>
      ) : (
        <AuthStack.Navigator>
          <AuthStack.Screen
            name="PhoneLogin"
            component={PhoneLoginScreen}
            options={{ headerShown: false }}
          />
          <AuthStack.Screen
            name="SmsCode"
            component={SmsCodeScreen}
            options={{ title: "输入验证码" }}
          />
        </AuthStack.Navigator>
      )}
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: penColors.background },
  loading: { flex: 1 },
});
