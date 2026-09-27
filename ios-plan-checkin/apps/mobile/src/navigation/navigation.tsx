import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { Ionicons } from "@expo/vector-icons";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import {
  NavigationContainer,
  createNavigationContainerRef,
} from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { penColors } from "@plan-checkin/design-tokens";
import {
  ActivityIndicator,
  Alert,
  Button,
  SafeAreaView,
  StyleSheet,
} from "react-native";
import { useAppServices } from "../data/services";
import { nativeLinks } from "../platform/links";
import {
  CalendarEntry,
  FriendsEntry,
  LoginEntry,
  PlansEntry,
  SettingsEntry,
  Shell,
  TodayEntry,
} from "./entryScreens";
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
  Checkin: { planId: string; businessDate: string };
  Settings: undefined;
};
type AuthStackParamList = { PhoneLogin: undefined };

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
        component={TodayEntry}
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
        component={CalendarEntry}
        options={{ title: "日历" }}
      />
      <Tabs.Screen
        name="Plans"
        component={PlansEntry}
        options={{ title: "计划" }}
      />
      <Tabs.Screen
        name="Friends"
        component={FriendsEntry}
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
        {({ route }) => (
          <Shell title="计划详情" body={`计划 ${route.params.planId}`} />
        )}
      </RootStack.Screen>
      <RootStack.Screen name="Checkin" options={{ title: "打卡" }}>
        {({ route }) => (
          <Shell title="打卡" body={`业务日期 ${route.params.businessDate}`} />
        )}
      </RootStack.Screen>
      <RootStack.Screen
        name="Settings"
        component={SettingsEntry}
        options={{ title: "个人" }}
      />
    </RootStack.Navigator>
  );
}

export function AppNavigation() {
  const { session, repository, queryClient } = useAppServices();
  const snapshot = useSyncExternalStore(
    session.subscribe,
    session.getSnapshot,
    session.getSnapshot,
  );
  const pending = useRef<AppLink | null>(null);
  const opening = useRef(false);
  const cachedUser = useRef<string | null>(null);
  const [ready, setReady] = useState(false);
  const phase = useRef(snapshot.phase);
  phase.current = snapshot.phase;

  const openPending = useCallback(async () => {
    const link = pending.current;
    if (
      !link ||
      opening.current ||
      phase.current !== "authenticated" ||
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
    void openPending();
  }, [openPending, snapshot.phase]);
  useEffect(() => {
    if (snapshot.phase === "unauthenticated") queryClient.clear();
  }, [queryClient, snapshot.phase]);
  useEffect(() => {
    if (cachedUser.current && cachedUser.current !== snapshot.userId)
      queryClient.clear();
    cachedUser.current = snapshot.userId;
  }, [queryClient, snapshot.userId]);

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
  return (
    <NavigationContainer
      ref={navigationRef}
      onReady={() => {
        setReady(true);
        void openPendingRef.current();
      }}
    >
      {snapshot.phase === "authenticated" ? (
        <MainStack />
      ) : (
        <AuthStack.Navigator>
          <AuthStack.Screen
            name="PhoneLogin"
            component={LoginEntry}
            options={{ headerShown: false }}
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
