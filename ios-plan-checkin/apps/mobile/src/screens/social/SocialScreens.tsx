import { useState } from "react";
import { useNavigation, type NavigationProp } from "@react-navigation/native";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  PlanDto,
  SharedHistoryEntryDto,
  SharedPlanDto,
  SocialUserDto,
} from "@plan-checkin/contracts";
import { businessDateAt } from "@plan-checkin/domain";
import { Alert, Pressable, Text, View } from "react-native";
import { ScreenState, StatusNotice } from "../../components/ScreenState";
import { useAppServices } from "../../data/services";
import type { RootStackParamList } from "../../navigation/navigation";
import {
  Choice,
  PlanInput,
  PlanScreen,
  Submit,
  planPalette,
  planStyles,
} from "../plans/ui";

function label(user: SocialUserDto): string {
  return user.nickname || user.username;
}
function failure(error: unknown): string {
  return error instanceof Error ? error.message : "操作失败，请稍后重试";
}
function Person({
  user,
  detail,
  onPress,
  testID,
}: {
  user: SocialUserDto;
  detail?: string;
  onPress: () => void;
  testID: string;
}) {
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={`${label(user)}，@${user.username}${detail ? `，${detail}` : ""}`}
      onPress={onPress}
      style={[planStyles.card, planStyles.row, { minHeight: 72 }]}
    >
      <View
        style={{
          width: 42,
          height: 42,
          borderRadius: 21,
          backgroundColor: planPalette.pale,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Text
          style={{
            color: planPalette.primary,
            fontSize: 17,
            fontWeight: "600",
          }}
        >
          {label(user).slice(0, 1)}
        </Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={planStyles.cardTitle}>{label(user)}</Text>
        <Text style={planStyles.subtitle}>@{user.username}</Text>
      </View>
      {detail ? <Text style={planStyles.body}>{detail}</Text> : null}
    </Pressable>
  );
}
function PlainAction({
  label: copy,
  onPress,
  testID,
  danger = false,
}: {
  label: string;
  onPress: () => void;
  testID: string;
  danger?: boolean;
}) {
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={copy}
      onPress={onPress}
      style={{ minHeight: 44, justifyContent: "center" }}
    >
      <Text
        style={{
          color: danger ? planPalette.danger : planPalette.primary,
          fontWeight: "600",
        }}
      >
        {copy}
      </Text>
    </Pressable>
  );
}

export function FriendsListScreen() {
  const { repository } = useAppServices();
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const queryClient = useQueryClient();
  const [username, setUsername] = useState("");
  const [submitted, setSubmitted] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const friends = useQuery({
    queryKey: ["friends"],
    queryFn: () => repository.listFriends(),
  });
  const requests = useQuery({
    queryKey: ["friend-requests"],
    queryFn: () => repository.listFriendRequests(),
  });
  const search = useQuery({
    queryKey: ["friend-search", submitted],
    queryFn: () => repository.searchUsers(submitted),
    enabled: submitted.length >= 3,
    retry: false,
  });
  const updateRequest = async (id: string, action: "accept" | "reject") => {
    setBusy(id);
    setError(null);
    try {
      if (action === "accept") await repository.acceptFriendRequest(id);
      else await repository.rejectFriendRequest(id);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["friend-requests"] }),
        queryClient.invalidateQueries({ queryKey: ["friends"] }),
      ]);
    } catch (cause) {
      setError(failure(cause));
    } finally {
      setBusy(null);
    }
  };
  const requestFriend = async (user: SocialUserDto) => {
    setBusy(user.id);
    setError(null);
    try {
      await repository.requestFriend(user.id);
      await queryClient.invalidateQueries({ queryKey: ["friend-requests"] });
      setSubmitted("");
    } catch (cause) {
      setError(failure(cause));
    } finally {
      setBusy(null);
    }
  };
  const doSearch = () => {
    const value = username.normalize("NFKC").trim();
    if (value.length < 3 || value.length > 30) {
      setError("请输入 3–30 位用户名");
      return;
    }
    setError(null);
    setSubmitted(value);
  };
  return (
    <PlanScreen>
      <Text testID="friends.title" style={planStyles.title}>
        朋友
      </Text>
      <View style={[planStyles.row, { marginTop: 20 }]}>
        <View style={planStyles.flex}>
          <PlanInput
            value={username}
            onChangeText={setUsername}
            placeholder="搜索用户名添加好友"
            testID="friends.search.input"
          />
        </View>
        <PlainAction
          label="搜索"
          testID="friends.search.submit"
          onPress={doSearch}
        />
      </View>
      {error ? (
        <StatusNotice
          kind="failure"
          testID="friends.action-error"
          message={error}
        />
      ) : null}
      {search.isError ? (
        <ScreenState
          kind="error"
          testID="friends.search-error"
          message="搜索失败，请检查用户名或网络"
          onRetry={() => void search.refetch()}
        />
      ) : null}
      {search.data?.map((user) => (
        <View key={user.id} style={planStyles.card}>
          <Text style={planStyles.cardTitle}>
            {label(user)} · @{user.username}
          </Text>
          <PlainAction
            label={busy === user.id ? "正在发送…" : "发送好友申请"}
            testID={`friends.request.${user.id}`}
            onPress={() => void requestFriend(user)}
          />
        </View>
      ))}
      {submitted && search.isSuccess && !search.data.length ? (
        <ScreenState
          kind="empty"
          testID="friends.search-empty"
          message="没有找到这个用户名"
        />
      ) : null}
      <Text style={[planStyles.cardTitle, { marginTop: 25 }]}>好友</Text>
      {friends.isPending ? (
        <ScreenState
          kind="loading"
          testID="friends.loading"
          message="正在读取好友…"
        />
      ) : null}
      {friends.isError ? (
        <ScreenState
          kind="error"
          testID="friends.error"
          message="暂时无法读取好友"
          onRetry={() => void friends.refetch()}
        />
      ) : null}
      {friends.isSuccess && !friends.data.length ? (
        <ScreenState
          kind="empty"
          testID="friends.empty"
          message="还没有好友，可以通过用户名发送申请"
        />
      ) : null}
      {friends.data?.map((friend) => (
        <Person
          key={friend.id}
          user={friend}
          testID={`friends.item.${friend.id}`}
          onPress={() =>
            navigation.navigate("FriendProfile", { friendId: friend.id })
          }
        />
      ))}
      <Text
        testID="friends.incoming.title"
        style={[planStyles.cardTitle, { marginTop: 26 }]}
      >
        新的申请
      </Text>
      {requests.data?.incoming.length ? (
        requests.data.incoming.map((item) => (
          <View
            key={item.id}
            testID={`friends.incoming.${item.id}`}
            style={planStyles.card}
          >
            <Text style={planStyles.cardTitle}>
              {label(item.sender)} · @{item.sender.username}
            </Text>
            <View style={[planStyles.row, { marginTop: 8 }]}>
              <Choice
                label="拒绝"
                testID={`friends.reject.${item.id}`}
                disabled={busy === item.id}
                onPress={() => void updateRequest(item.id, "reject")}
              />
              <Choice
                label="同意"
                testID={`friends.accept.${item.id}`}
                disabled={busy === item.id}
                selected
                onPress={() => void updateRequest(item.id, "accept")}
              />
            </View>
          </View>
        ))
      ) : (
        <Text style={[planStyles.body, { marginTop: 12 }]}>暂无新申请</Text>
      )}
      {requests.data?.outgoing.length ? (
        <Text style={[planStyles.subtitle, { marginTop: 20 }]}>
          已发送 {requests.data.outgoing.length} 个好友申请，等待对方回应。
        </Text>
      ) : null}
    </PlanScreen>
  );
}

export function FriendProfileScreen({ friendId }: { friendId: string }) {
  const { repository } = useAppServices();
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const queryClient = useQueryClient();
  const [side, setSide] = useState<"sent" | "received">("sent");
  const [error, setError] = useState<string | null>(null);
  const friends = useQuery({
    queryKey: ["friends"],
    queryFn: () => repository.listFriends(),
  });
  const friend = friends.data?.find((item) => item.id === friendId);
  const received = useQuery({
    queryKey: ["shared-plan", friendId],
    queryFn: () => repository.listFriendPlans(friendId),
    enabled: Boolean(friend),
  });
  const sent = useQuery({
    queryKey: ["friend-sent-shares", friendId],
    queryFn: async () => {
      const plans = await repository.listPlans();
      const rows = await Promise.all(
        plans.map(async (plan) => ({
          plan,
          shares: await repository.listPlanShares(plan.id),
        })),
      );
      return rows.filter((row) =>
        row.shares.some((share) => share.friend.id === friendId),
      );
    },
    enabled: Boolean(friend),
  });
  const endFriendship = (kind: "delete" | "block") => {
    if (!friend) return;
    Alert.alert(
      kind === "delete" ? "删除好友？" : "屏蔽好友？",
      "对方将立即失去你分享的计划访问权限，历史也无法继续查看。",
      [
        { text: "取消", style: "cancel" },
        {
          text: kind === "delete" ? "删除好友" : "屏蔽好友",
          style: "destructive",
          onPress: () => {
            void (async () => {
              try {
                if (kind === "delete") await repository.removeFriend(friendId);
                else await repository.blockFriend(friendId);
                queryClient.removeQueries({
                  queryKey: ["shared-plan", friendId],
                });
                queryClient.removeQueries({
                  queryKey: ["friend-sent-shares", friendId],
                });
                await queryClient.invalidateQueries({ queryKey: ["friends"] });
                navigation.goBack();
              } catch (cause) {
                setError(failure(cause));
              }
            })();
          },
        },
      ],
    );
  };
  const revoke = (plan: PlanDto) => {
    Alert.alert(
      "取消分享？",
      `取消后，${friend ? label(friend) : "这位好友"}将无法查看「${plan.title}」的历史记录。`,
      [
        { text: "保留分享", style: "cancel" },
        {
          text: "取消分享",
          style: "destructive",
          onPress: () => {
            void (async () => {
              try {
                await repository.revokePlanShare(plan.id, friendId);
                await queryClient.invalidateQueries({
                  queryKey: ["friend-sent-shares", friendId],
                });
                await queryClient.invalidateQueries({
                  queryKey: ["plan-shares", plan.id],
                });
              } catch (cause) {
                setError(failure(cause));
              }
            })();
          },
        },
      ],
    );
  };
  return (
    <PlanScreen>
      <Text testID="friend-profile.title" style={planStyles.title}>
        朋友
      </Text>
      {friends.isPending ? (
        <ScreenState
          kind="loading"
          testID="friend-profile.loading"
          message="正在读取好友…"
        />
      ) : null}
      {friends.isError ? (
        <ScreenState
          kind="error"
          testID="friend-profile.error"
          message="无法读取好友"
          onRetry={() => void friends.refetch()}
        />
      ) : null}
      {friends.isSuccess && !friend ? (
        <ScreenState
          kind="empty"
          testID="friend-profile.revoked"
          message="你们已不是好友，分享内容不可再访问"
        />
      ) : null}
      {friend ? (
        <>
          <View style={{ alignItems: "center", marginTop: 30 }}>
            <View
              style={{
                width: 78,
                height: 78,
                borderRadius: 39,
                backgroundColor: planPalette.pale,
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <Text style={{ color: planPalette.primary, fontSize: 28 }}>
                {label(friend).slice(0, 1)}
              </Text>
            </View>
            <Text style={[planStyles.title, { marginTop: 15 }]}>
              {label(friend)}
            </Text>
            <Text style={planStyles.subtitle}>@{friend.username}</Text>
          </View>
          <View style={[planStyles.wrap, { marginTop: 26 }]}>
            <Choice
              label="我分享给TA"
              testID="friend-profile.sent"
              selected={side === "sent"}
              onPress={() => setSide("sent")}
            />
            <Choice
              label="TA分享给我"
              testID="friend-profile.received"
              selected={side === "received"}
              onPress={() => setSide("received")}
            />
          </View>
          {error ? (
            <StatusNotice
              kind="failure"
              testID="friend-profile.action-error"
              message={error}
            />
          ) : null}
          {side === "sent" ? (
            <>
              <Text style={[planStyles.cardTitle, { marginTop: 27 }]}>
                你已分享以下计划给{label(friend)}
              </Text>
              {sent.isPending ? (
                <ScreenState
                  kind="loading"
                  testID="friend-profile.sent-loading"
                  message="正在读取分享…"
                />
              ) : null}
              {sent.isError ? (
                <ScreenState
                  kind="error"
                  testID="friend-profile.sent-error"
                  message="无法读取分享"
                  onRetry={() => void sent.refetch()}
                />
              ) : null}
              {sent.isSuccess && !sent.data.length ? (
                <ScreenState
                  kind="empty"
                  testID="friend-profile.sent-empty"
                  message="还没有分享计划给这位好友"
                />
              ) : null}
              {sent.data?.map(({ plan }) => (
                <View
                  key={plan.id}
                  testID={`friend-profile.sent.${plan.id}`}
                  style={planStyles.card}
                >
                  <Text style={planStyles.cardTitle}>{plan.title}</Text>
                  <Text style={planStyles.subtitle}>
                    {plan.kind === "fixed"
                      ? "固定日期"
                      : plan.kind === "weekly"
                        ? "每周目标"
                        : "一次性任务"}{" "}
                    · 分享中
                  </Text>
                  <PlainAction
                    label="取消分享"
                    testID={`friend-profile.revoke.${plan.id}`}
                    danger
                    onPress={() => revoke(plan)}
                  />
                </View>
              ))}
              <PlainAction
                label="分享新计划给TA ›"
                testID="friend-profile.manage"
                onPress={() =>
                  navigation.navigate("SharePermissions", { friendId })
                }
              />
            </>
          ) : (
            <>
              <Text style={[planStyles.cardTitle, { marginTop: 27 }]}>
                {label(friend)}分享给你的计划
              </Text>
              {received.isPending ? (
                <ScreenState
                  kind="loading"
                  testID="friend-profile.received-loading"
                  message="正在读取计划…"
                />
              ) : null}
              {received.isError ? (
                <ScreenState
                  kind="error"
                  testID="friend-profile.received-error"
                  message="分享权限可能已变化"
                  onRetry={() => void received.refetch()}
                />
              ) : null}
              {received.isSuccess && !received.data.length ? (
                <ScreenState
                  kind="empty"
                  testID="friend-profile.received-empty"
                  message="对方尚未分享计划给你"
                />
              ) : null}
              {received.data?.map((plan) => (
                <Pressable
                  key={plan.id}
                  testID={`friend-profile.received.${plan.id}`}
                  accessibilityRole="button"
                  onPress={() =>
                    navigation.navigate("SharedPlanDetail", {
                      planId: plan.id,
                      friendId,
                    })
                  }
                  style={planStyles.card}
                >
                  <Text style={planStyles.cardTitle}>{plan.title}</Text>
                  <Text style={planStyles.subtitle}>
                    只读 · 查看进度和历史 ›
                  </Text>
                </Pressable>
              ))}
            </>
          )}
          <View
            style={[
              planStyles.row,
              { marginTop: 25, justifyContent: "space-between" },
            ]}
          >
            <PlainAction
              label="屏蔽该好友"
              testID="friend-profile.block"
              danger
              onPress={() => endFriendship("block")}
            />
            <PlainAction
              label="删除好友"
              testID="friend-profile.delete"
              danger
              onPress={() => endFriendship("delete")}
            />
          </View>
          <Text style={planStyles.subtitle}>
            删除或屏蔽后，对方将无法访问你分享的计划。
          </Text>
        </>
      ) : null}
    </PlanScreen>
  );
}

const historyLabels: Record<SharedHistoryEntryDto["status"], string> = {
  success: "已记录成功",
  failure: "已记录失败",
  skip: "跳过记录",
  unrecorded: "未记录",
  pending: "待记录",
  future: "未来日期",
  due: "待记录",
  overdue: "已逾期",
  completed: "已完成",
  late_completed: "逾期完成",
  failed: "未完成",
  cancelled: "已取消",
  not_due: "未到日期",
};
function monthBefore(value: string): string {
  const [year, month] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year!, month! - 2, 1));
  return date.toISOString().slice(0, 7);
}
function monthAfter(value: string): string {
  const [year, month] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year!, month!, 1));
  return date.toISOString().slice(0, 7);
}
function progressText(plan: SharedPlanDto): string {
  const progress = plan.progress;
  if (progress.kind === "fixed")
    return progress.completionRate === null
      ? "暂无完成率"
      : `完成率 ${Math.round(progress.completionRate * 100)}%`;
  if (progress.kind === "weekly")
    return `本周 ${progress.successes}/${progress.target ?? "—"} 天`;
  return progress.state === "pending"
    ? "待处理"
    : progress.state === "overdue"
      ? "已逾期"
      : "已处理";
}
export function SharedPlanDetailScreen({
  planId,
  friendId,
}: {
  planId: string;
  friendId: string;
}) {
  const { repository } = useAppServices();
  const [month, setMonth] = useState<string | null>(null);
  const history = useQuery({
    queryKey: ["shared-plan", planId, "history", month],
    queryFn: () => repository.getSharedHistory(planId, month ?? undefined),
    retry: false,
  });
  const data =
    history.data?.plan.owner.id === friendId ? history.data : undefined;
  const displayMonth = month ?? data?.month ?? "";
  return (
    <PlanScreen>
      <Text testID="shared-detail.title" style={planStyles.title}>
        {data?.plan.owner.nickname || data?.plan.owner.username || "好友计划"}
      </Text>
      {history.isPending ? (
        <ScreenState
          kind="loading"
          testID="shared-detail.loading"
          message="正在读取分享计划…"
        />
      ) : null}
      {history.isError ? (
        <ScreenState
          kind="error"
          testID="shared-detail.revoked"
          message="这项计划已无法查看，分享可能已撤销"
          onRetry={() => void history.refetch()}
        />
      ) : null}
      {data ? (
        <>
          <StatusNotice
            kind="permission"
            testID="shared-detail.readonly"
            message={`这是${data.plan.owner.nickname || data.plan.owner.username}分享给你的计划 · 只读`}
          />
          <Text style={[planStyles.title, { marginTop: 25 }]}>
            {data.plan.title}
          </Text>
          <Text style={planStyles.subtitle}>
            {data.plan.kind === "fixed"
              ? "固定日期"
              : data.plan.kind === "weekly"
                ? "每周目标"
                : "一次性任务"}{" "}
            · {data.plan.direction === "avoid" ? "不要做" : "要做"}
          </Text>
          <View style={planStyles.card}>
            <Text
              testID="shared-detail.progress"
              style={[planStyles.title, { color: planPalette.primary }]}
            >
              {progressText(data.plan)}
            </Text>
            <Text style={planStyles.subtitle}>
              进度按计划时区 {data.plan.timezone} 计算
            </Text>
          </View>
          <Text style={[planStyles.cardTitle, { marginTop: 27 }]}>
            历史记录
          </Text>
          <View
            style={[
              planStyles.row,
              { justifyContent: "space-between", marginTop: 10 },
            ]}
          >
            <PlainAction
              label="上个月"
              testID="shared-detail.prev-month"
              onPress={() => setMonth(monthBefore(displayMonth))}
            />
            <Text style={planStyles.body}>{displayMonth}</Text>
            <PlainAction
              label="下个月"
              testID="shared-detail.next-month"
              onPress={() => setMonth(monthAfter(displayMonth))}
            />
          </View>
          {!data.entries.length ? (
            <ScreenState
              kind="empty"
              testID="shared-detail.empty"
              message="这个月暂无记录"
            />
          ) : null}
          {data.entries.map((entry) => (
            <View
              key={entry.businessDate}
              testID={`shared-detail.entry.${entry.businessDate}`}
              style={planStyles.card}
            >
              <View
                style={[planStyles.row, { justifyContent: "space-between" }]}
              >
                <Text style={planStyles.cardTitle}>{entry.businessDate}</Text>
                <Text
                  style={{
                    color:
                      entry.status === "failure"
                        ? planPalette.danger
                        : planPalette.primary,
                  }}
                >
                  {historyLabels[entry.status]}
                </Text>
              </View>
              {entry.note ? (
                <Text style={[planStyles.body, { marginTop: 8 }]}>
                  {entry.note}
                </Text>
              ) : null}
              {entry.failureReason ? (
                <Text style={[planStyles.body, { marginTop: 6 }]}>
                  {entry.failureReason}
                </Text>
              ) : null}
              {entry.isBackfilled || entry.isRevised ? (
                <Text style={planStyles.subtitle}>
                  {entry.isBackfilled ? "补记" : ""}
                  {entry.isBackfilled && entry.isRevised ? " · " : ""}
                  {entry.isRevised ? "已修正" : ""}
                </Text>
              ) : null}
            </View>
          ))}
          <Text style={[planStyles.subtitle, { marginTop: 20 }]}>
            好友计划仅供查看。照片、数值和其他私人信息不在此页面展示。
          </Text>
        </>
      ) : null}
    </PlanScreen>
  );
}

export function SelectShareFriendScreen({ planId }: { planId: string }) {
  const { repository } = useAppServices();
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const [filter, setFilter] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const friends = useQuery({
    queryKey: ["friends"],
    queryFn: () => repository.listFriends(),
  });
  const shares = useQuery({
    queryKey: ["plan-shares", planId],
    queryFn: () => repository.listPlanShares(planId),
  });
  const selectedFriend = friends.data?.find((item) => item.id === selected);
  const sharedIds = new Set(shares.data?.map((item) => item.friend.id));
  const visible = friends.data?.filter((user) =>
    `${user.nickname ?? ""} ${user.username}`
      .toLowerCase()
      .includes(filter.trim().toLowerCase()),
  );
  return (
    <PlanScreen>
      <Text testID="share-select.title" style={planStyles.title}>
        分享给朋友
      </Text>
      <Text style={[planStyles.body, { marginTop: 19 }]}>
        选择一位好友，Ta 将能查看这项计划的规则、进度和历史记录。
      </Text>
      <View style={{ marginTop: 18 }}>
        <PlanInput
          value={filter}
          onChangeText={setFilter}
          placeholder="搜索好友"
          testID="share-select.search"
        />
      </View>
      {friends.isPending || shares.isPending ? (
        <ScreenState
          kind="loading"
          testID="share-select.loading"
          message="正在读取好友与分享状态…"
        />
      ) : null}
      {friends.isError || shares.isError ? (
        <ScreenState
          kind="error"
          testID="share-select.error"
          message="无法读取好友或分享状态"
          onRetry={() => {
            void friends.refetch();
            void shares.refetch();
          }}
        />
      ) : null}
      {visible?.length === 0 ? (
        <ScreenState
          kind="empty"
          testID="share-select.empty"
          message={filter ? "没有匹配的好友" : "还没有好友，请先添加好友"}
        />
      ) : null}
      {visible?.map((user) => (
        <View
          key={user.id}
          style={{ opacity: sharedIds.has(user.id) ? 0.65 : 1 }}
        >
          <Person
            user={user}
            detail={
              sharedIds.has(user.id)
                ? "已分享"
                : selected === user.id
                  ? "已选择 ✓"
                  : undefined
            }
            testID={`share-select.friend.${user.id}`}
            onPress={() => {
              if (!sharedIds.has(user.id)) setSelected(user.id);
            }}
          />
        </View>
      ))}
      <Submit
        label="下一步"
        testID="share-select.next"
        disabled={!selectedFriend || sharedIds.has(selectedFriend.id)}
        onPress={() => {
          if (selectedFriend)
            navigation.navigate("SharePreview", {
              planId,
              friendId: selectedFriend.id,
            });
        }}
      />
    </PlanScreen>
  );
}

export function SharePreviewScreen({
  planId,
  friendId,
}: {
  planId: string;
  friendId: string;
}) {
  const { repository } = useAppServices();
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const plan = useQuery({
    queryKey: ["plan", planId],
    queryFn: () => repository.getPlan(planId),
  });
  const month = plan.data
    ? businessDateAt(new Date(), plan.data.timezone).slice(0, 7)
    : null;
  const preview = useQuery({
    queryKey: ["share-preview", planId, friendId, month],
    queryFn: () => repository.getSharePreview(planId, friendId, month!),
    enabled: Boolean(month),
    staleTime: 0,
    retry: false,
  });
  const grant = async () => {
    if (!preview.data) return;
    setBusy(true);
    setError(null);
    try {
      await repository.sharePlan(planId, friendId, preview.data.previewToken);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["plan-shares", planId] }),
        queryClient.invalidateQueries({
          queryKey: ["friend-sent-shares", friendId],
        }),
      ]);
      navigation.navigate("SharePermissions", { friendId });
    } catch (cause) {
      setError(failure(cause));
      // A preview token binds the current history. A changed record needs a fresh preview.
      void preview.refetch();
    } finally {
      setBusy(false);
    }
  };
  const data = preview.data;
  return (
    <PlanScreen>
      <Text testID="share-preview.title" style={planStyles.title}>
        分享预览
      </Text>
      {plan.isPending || preview.isPending ? (
        <ScreenState
          kind="loading"
          testID="share-preview.loading"
          message="正在生成分享预览…"
        />
      ) : null}
      {plan.isError || preview.isError ? (
        <ScreenState
          kind="error"
          testID="share-preview.error"
          message="预览已失效或暂时无法读取，请重试"
          onRetry={() => {
            void plan.refetch();
            void preview.refetch();
          }}
        />
      ) : null}
      {data ? (
        <>
          <Text style={[planStyles.body, { marginTop: 22 }]}>
            以下是 {label(data.friend)} 将看到的内容
          </Text>
          <View style={planStyles.card}>
            <Text style={[planStyles.subtitle, { color: planPalette.primary }]}>
              预览
            </Text>
            <Text style={[planStyles.cardTitle, { marginTop: 8 }]}>
              {data.plan.title}
            </Text>
            <Text style={planStyles.subtitle}>
              {data.plan.kind === "fixed"
                ? "固定日期"
                : data.plan.kind === "weekly"
                  ? "每周目标"
                  : "一次性任务"}{" "}
              · {data.plan.direction === "avoid" ? "不要做" : "要做"}
            </Text>
            <Text style={[planStyles.cardTitle, { marginTop: 18 }]}>
              {progressText(data.plan)}
            </Text>
            <Text style={[planStyles.cardTitle, { marginTop: 20 }]}>
              历史状态
            </Text>
            {data.entries.length ? (
              data.entries.map((entry) => (
                <View key={entry.businessDate} style={{ marginTop: 10 }}>
                  <View
                    style={[
                      planStyles.row,
                      { justifyContent: "space-between" },
                    ]}
                  >
                    <Text style={planStyles.body}>{entry.businessDate}</Text>
                    <Text style={planStyles.body}>
                      {historyLabels[entry.status]}
                    </Text>
                  </View>
                  {entry.note ? (
                    <Text style={[planStyles.body, { marginTop: 4 }]}>
                      {entry.note}
                    </Text>
                  ) : null}
                  {entry.failureReason ? (
                    <Text style={[planStyles.body, { marginTop: 4 }]}>
                      {entry.failureReason}
                    </Text>
                  ) : null}
                </View>
              ))
            ) : (
              <Text style={[planStyles.body, { marginTop: 9 }]}>
                暂无历史记录
              </Text>
            )}
          </View>
          <StatusNotice
            kind="permission"
            testID="share-preview.disclosure"
            message={data.disclosure}
          />
          <StatusNotice
            kind="permission"
            testID="share-preview.private"
            message="照片、数值、其他计划和个人统计不会分享。"
          />
          {error ? (
            <StatusNotice
              kind="failure"
              testID="share-preview.action-error"
              message={`${error}。请查看更新后的预览再提交。`}
            />
          ) : null}
          <Submit
            label={`分享这项计划给 ${label(data.friend)}`}
            testID="share-preview.confirm"
            pending={busy}
            onPress={() => void grant()}
          />
          <PlainAction
            label="返回修改"
            testID="share-preview.back"
            onPress={() => navigation.goBack()}
          />
        </>
      ) : null}
    </PlanScreen>
  );
}

export function SharePermissionsScreen({ friendId }: { friendId: string }) {
  const { repository } = useAppServices();
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const friends = useQuery({
    queryKey: ["friends"],
    queryFn: () => repository.listFriends(),
  });
  const friend = friends.data?.find((item) => item.id === friendId);
  const plans = useQuery({
    queryKey: ["plans"],
    queryFn: () => repository.listPlans(),
    enabled: Boolean(friend),
  });
  const groups = useQuery({
    queryKey: ["groups"],
    queryFn: () => repository.listGroups(),
    enabled: Boolean(friend),
  });
  const shares = useQuery({
    queryKey: ["friend-share-permissions", friendId],
    queryFn: async () => {
      const list = await repository.listPlans();
      const entries = await Promise.all(
        list.map((plan) => repository.listPlanShares(plan.id)),
      );
      return entries.flat().filter((share) => share.friend.id === friendId);
    },
    enabled: Boolean(friend),
  });
  const shared = new Map(shares.data?.map((item) => [item.planId, item]));
  const revoke = (plan: PlanDto) => {
    Alert.alert(
      "关闭分享？",
      "关闭后，对方将立即失去访问权限，包括查看历史。",
      [
        { text: "取消", style: "cancel" },
        {
          text: "关闭分享",
          style: "destructive",
          onPress: () => {
            void (async () => {
              try {
                await repository.revokePlanShare(plan.id, friendId);
                await queryClient.invalidateQueries({
                  queryKey: ["friend-share-permissions", friendId],
                });
                await queryClient.invalidateQueries({
                  queryKey: ["friend-sent-shares", friendId],
                });
                await queryClient.invalidateQueries({
                  queryKey: ["plan-shares", plan.id],
                });
              } catch (cause) {
                setError(failure(cause));
              }
            })();
          },
        },
      ],
    );
  };
  return (
    <PlanScreen>
      <Text testID="share-permissions.title" style={planStyles.title}>
        分享给{friend ? label(friend) : "好友"}的计划
      </Text>
      <Text style={[planStyles.body, { marginTop: 16 }]}>
        为每个计划单独设置是否分享。开启前会展示对方能看到的规则、进度和历史记录。
      </Text>
      {friends.isPending || plans.isPending || shares.isPending ? (
        <ScreenState
          kind="loading"
          testID="share-permissions.loading"
          message="正在读取权限…"
        />
      ) : null}
      {friends.isSuccess && !friend ? (
        <ScreenState
          kind="empty"
          testID="share-permissions.revoked"
          message="好友关系已失效，不能继续分享"
        />
      ) : null}
      {friends.isError || plans.isError || shares.isError ? (
        <ScreenState
          kind="error"
          testID="share-permissions.error"
          message="无法读取分享权限"
          onRetry={() => {
            void friends.refetch();
            void plans.refetch();
            void shares.refetch();
          }}
        />
      ) : null}
      {error ? (
        <StatusNotice
          kind="failure"
          testID="share-permissions.action-error"
          message={error}
        />
      ) : null}
      {friend && plans.isSuccess && !plans.data.length ? (
        <ScreenState
          kind="empty"
          testID="share-permissions.empty"
          message="还没有可分享的计划"
        />
      ) : null}
      {friend &&
        plans.data?.map((plan) => (
          <View
            key={plan.id}
            testID={`share-permissions.plan.${plan.id}`}
            style={planStyles.card}
          >
            <Text style={planStyles.subtitle}>
              {groups.data?.find((group) => group.id === plan.groupId)?.name ??
                "未分组"}
            </Text>
            <Text style={[planStyles.cardTitle, { marginTop: 5 }]}>
              {plan.title}
            </Text>
            <Text style={planStyles.subtitle}>
              {plan.kind === "fixed"
                ? "固定日期"
                : plan.kind === "weekly"
                  ? "每周目标"
                  : "一次性任务"}{" "}
              · {plan.direction === "avoid" ? "不要做" : "要做"}
            </Text>
            {shared.has(plan.id) ? (
              <Text style={planStyles.subtitle}>
                分享中 · {shared.get(plan.id)?.grantedAt.slice(0, 10)}
              </Text>
            ) : null}
            <PlainAction
              label={shared.has(plan.id) ? "关闭分享" : "预览并开启分享"}
              testID={`share-permissions.toggle.${plan.id}`}
              danger={shared.has(plan.id)}
              onPress={() =>
                shared.has(plan.id)
                  ? revoke(plan)
                  : navigation.navigate("SharePreview", {
                      planId: plan.id,
                      friendId,
                    })
              }
            />
          </View>
        ))}
      <Text
        testID="share-permissions.warning"
        style={[planStyles.subtitle, { marginTop: 24 }]}
      >
        关闭后，对方将立即失去访问权限，包括查看历史。
      </Text>
    </PlanScreen>
  );
}
