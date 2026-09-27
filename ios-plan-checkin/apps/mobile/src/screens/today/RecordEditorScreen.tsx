import { useEffect, useState } from "react";
import * as Crypto from "expo-crypto";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  CheckinResult,
  OneTimeResolution,
  PlanDto,
} from "@plan-checkin/contracts";
import { businessDateAt } from "@plan-checkin/domain";
import { Alert, Image, Pressable, Text, View } from "react-native";
import { File } from "expo-file-system";
import { useNavigation, type NavigationProp } from "@react-navigation/native";
import type { RootStackParamList } from "../../navigation/navigation";
import { useAppServices } from "../../data/services";
import type { AppRepository } from "../../data/repository";
import type { LocalMediaMetadata } from "../../data/localCache";
import { choosePrivatePhotos } from "../../platform/privatePhoto";
import { ScreenState, StatusNotice } from "../../components/ScreenState";
import {
  Choice,
  ErrorText,
  FormField,
  PlanInput,
  PlanScreen,
  Submit,
  planPalette,
  planStyles,
} from "../plans/ui";

export type RecordMode = "today" | "edit" | "backfill";
export interface RecordEditorProps {
  planId: string;
  businessDate: string;
  mode?: RecordMode;
  ruleVersion?: number;
  resolution?: OneTimeResolution;
  onDone: () => void;
}

const results: { key: CheckinResult; label: string }[] = [
  { key: "success", label: "做到了" },
  { key: "failure", label: "未做到" },
  { key: "skip", label: "跳过" },
];
const oneTimeResults: { key: OneTimeResolution; label: string }[] = [
  { key: "completed", label: "已完成" },
  { key: "failed", label: "未完成" },
  { key: "cancelled", label: "取消任务" },
];
function resultLabel(plan: PlanDto, result: CheckinResult): string {
  if (plan.direction === "avoid")
    return result === "success"
      ? "成功避开"
      : result === "failure"
        ? "发生了"
        : "跳过记录";
  return results.find((item) => item.key === result)?.label ?? result;
}

function PrivatePhoto({
  id,
  index,
  repository,
  onRemove,
}: {
  id: string;
  index: number;
  repository: AppRepository;
  onRemove: () => void;
}) {
  const image = useQuery({
    queryKey: ["private-media-url", id],
    queryFn: () => repository.getMediaDownloadUrl(id),
    staleTime: 240_000,
    refetchInterval: 240_000,
    retry: false,
  });
  return (
    <View style={{ width: 86, marginRight: 8 }}>
      {image.data ? (
        <Image
          source={{ uri: image.data }}
          accessibilityLabel={`已有照片 ${index + 1}`}
          style={{ width: 80, height: 80, borderRadius: 10 }}
        />
      ) : (
        <Text style={planStyles.body}>
          {image.isError ? "照片暂不可见" : "读取照片…"}
        </Text>
      )}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`删除已有照片 ${index + 1}`}
        onPress={onRemove}
        style={{ minHeight: 44, justifyContent: "center" }}
      >
        <Text style={{ color: planPalette.danger }}>删除</Text>
      </Pressable>
    </View>
  );
}

export function RecordEditorScreen({
  planId,
  businessDate,
  mode = "today",
  ruleVersion,
  resolution,
  onDone,
}: RecordEditorProps) {
  const {
    repository,
    todaySession,
    localCache,
    localStore,
    mediaRunner,
    session,
  } = useAppServices();
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const queryClient = useQueryClient();
  const snapshot = session.getSnapshot();
  const accountId = snapshot.phase === "authenticated" ? snapshot.userId : null;
  const localRecord = useQuery({
    queryKey: ["local-checkin", accountId, planId, businessDate],
    queryFn: () => localCache!.checkin(accountId!, planId, businessDate),
    enabled: Boolean(accountId && localCache),
    refetchInterval: 3000,
  });
  const planQuery = useQuery({
    queryKey: ["plan", planId],
    queryFn: () => repository.getPlan(planId),
  });
  const recordQuery = useQuery({
    queryKey: ["checkin", planId, businessDate],
    queryFn: () => repository.getCheckin(planId, businessDate),
    enabled: mode === "edit" && Boolean(planQuery.data),
    retry: false,
  });
  const [result, setResult] = useState<CheckinResult | null>(null);
  const [note, setNote] = useState("");
  const [failureReason, setFailureReason] = useState("");
  const [numberValue, setNumberValue] = useState("");
  const [numberUnit, setNumberUnit] = useState("");
  const [pending, setPending] = useState(false);
  const [choosingPhoto, setChoosingPhoto] = useState(false);
  const [operationId] = useState(() => Crypto.randomUUID());
  const [photos, setPhotos] = useState<LocalMediaMetadata[]>([]);
  const [removedRemoteMediaIds, setRemovedRemoteMediaIds] = useState<string[]>(
    [],
  );
  const existingPhotoIds = (recordQuery.data?.mediaIds ?? []).filter(
    (id) => !removedRemoteMediaIds.includes(id),
  );
  const [error, setError] = useState<string | null>(null);
  const [localStatus, setLocalStatus] = useState<
    "local" | "syncing" | "failed" | "conflict" | null
  >(null);
  const [onceResult, setOnceResult] = useState<OneTimeResolution | null>(
    resolution ?? null,
  );
  useEffect(() => {
    if (!recordQuery.data) return;
    setResult(recordQuery.data.result);
    setNote(recordQuery.data.note ?? "");
    setFailureReason(recordQuery.data.failureReason ?? "");
    setNumberValue(recordQuery.data.numeric?.value ?? "");
    setNumberUnit(recordQuery.data.numeric?.unit ?? "");
  }, [recordQuery.data]);
  const plan = planQuery.data;
  const nowDate = plan ? businessDateAt(new Date(), plan.timezone) : null;
  const isBackfill = Boolean(nowDate && businessDate < nowDate);
  const invalidDate = Boolean(
    plan &&
    nowDate &&
    (businessDate > nowDate ||
      businessDate < plan.startDate ||
      (plan.endDate && businessDate > plan.endDate)),
  );
  const validate = (): string | null => {
    if (!plan || !result) return "请选择本次结果";
    if (invalidDate) return "该日期不在可记录范围";
    if (plan.lifecycle !== "active") return "当前计划已暂停或归档";
    if (note.length > 2000) return "备注最多 2000 字";
    if (failureReason.length > 1000) return "未做到的原因最多 1000 字";
    if (
      numberValue &&
      (!/^-?(?:0|[1-9]\d{0,11})(?:\.\d{1,6})?$/.test(numberValue) ||
        !numberUnit.trim())
    )
      return "请输入有效的数值和单位";
    if (numberUnit.length > 30) return "单位最多 30 字";
    return null;
  };
  const addPhotos = async () => {
    if (!accountId || !localCache || !localStore) {
      setError("当前无法在本机保存照片");
      return;
    }
    setChoosingPhoto(true);
    setError(null);
    try {
      const chosen = await choosePrivatePhotos(
        accountId,
        operationId,
        9 - existingPhotoIds.length - photos.length,
        localStore,
        localCache,
      );
      setPhotos((current) => [...current, ...chosen]);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "无法添加照片");
    } finally {
      setChoosingPhoto(false);
    }
  };
  const removePhoto = async (photo: LocalMediaMetadata) => {
    if (!accountId || !localCache) return;
    try {
      await localCache.removeStagedMedia(accountId, photo.id);
      const file = new File(photo.fileUri);
      if (file.exists) file.delete();
      setPhotos((current) => current.filter((item) => item.id !== photo.id));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "无法移除照片");
    }
  };
  const cancel = () => {
    void (async () => {
      for (const photo of photos) await removePhoto(photo);
      onDone();
    })().catch(() => onDone());
  };
  const removeRemotePhoto = (id: string) => {
    Alert.alert("删除这张照片？", "删除后照片将从云端移除，此操作立即生效。", [
      { text: "取消", style: "cancel" },
      {
        text: "删除照片",
        style: "destructive",
        onPress: () => {
          void (async () => {
            try {
              await repository.removeMedia(id);
              setRemovedRemoteMediaIds((current) => [...current, id]);
              await recordQuery.refetch();
            } catch (cause) {
              setError(
                cause instanceof Error
                  ? cause.message
                  : "删除照片失败，请联网后重试",
              );
            }
          })();
        },
      },
    ]);
  };
  const save = async () => {
    const problem = validate();
    if (problem) {
      setError(problem);
      return;
    }
    if (!plan || !result) return;
    setPending(true);
    setError(null);
    try {
      const saved = await repository.saveCheckin(plan, businessDate, {
        result,
        note: note.trim() || null,
        failureReason:
          result === "failure" ? failureReason.trim() || null : null,
        numeric: numberValue
          ? { value: numberValue, unit: numberUnit.trim() }
          : null,
        mediaIds: existingPhotoIds,
        baseRevision: recordQuery.data?.revision ?? 0,
        clientCreatedAt: new Date().toISOString(),
        clientOperationId: operationId,
        ruleVersion:
          recordQuery.data?.ruleVersion ?? ruleVersion ?? plan.ruleVersion,
      });
      const today = queryClient.getQueryData<
        Awaited<ReturnType<typeof repository.getToday>>
      >(["today"]);
      const item = today?.items.find(
        (candidate) =>
          candidate.plan.id === plan.id &&
          candidate.planBusinessDate === businessDate,
      );
      if (item) todaySession.hold(item, saved.record);
      void mediaRunner?.trigger().catch(() => {});
      queryClient.setQueryData(["checkin", planId, businessDate], saved.record);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["today"] }),
        queryClient.invalidateQueries({ queryKey: ["calendar"] }),
        queryClient.invalidateQueries({ queryKey: ["plan-detail", planId] }),
      ]);
      if (saved.source === "local") {
        setLocalStatus(
          saved.syncState === "synced" ? "local" : saved.syncState,
        );
        Alert.alert(
          "已保存到本机",
          saved.syncState === "conflict"
            ? "记录存在版本冲突，请稍后选择保留的内容。"
            : saved.syncState === "failed"
              ? "同步失败，记录仍保存在本机，可稍后重试。"
              : "记录会在联网后同步。",
          saved.syncState === "conflict"
            ? [
                { text: "稍后处理", onPress: onDone },
                {
                  text: "选择版本",
                  onPress: () =>
                    navigation.navigate("RecordConflict", {
                      planId,
                      businessDate,
                    }),
                },
              ]
            : [{ text: "知道了", onPress: onDone }],
        );
      } else onDone();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "保存失败，请重试");
    } finally {
      setPending(false);
    }
  };
  const finishOnce = async () => {
    if (!onceResult || !plan) {
      setError("请选择任务结果");
      return;
    }
    setPending(true);
    setError(null);
    try {
      await repository.resolveOneTime(plan.id, {
        resolution: onceResult,
        baseRevision: 0,
        completedAt:
          onceResult === "completed" ? new Date().toISOString() : undefined,
        reason: note.trim() || undefined,
      });
      if (accountId && localCache && photos.length) {
        await localCache.linkOneTimeMedia(accountId, operationId, plan.id);
        void mediaRunner?.trigger().catch(() => {});
      }
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["today"] }),
        queryClient.invalidateQueries({ queryKey: ["plan-detail", planId] }),
      ]);
      onDone();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "需要联网后重试");
    } finally {
      setPending(false);
    }
  };
  return (
    <PlanScreen>
      <View
        testID="record.editor.header"
        style={[planStyles.row, { justifyContent: "space-between" }]}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="取消记录"
          onPress={cancel}
          style={{ minWidth: 44, minHeight: 44, justifyContent: "center" }}
        >
          <Text style={{ color: planPalette.secondary }}>取消</Text>
        </Pressable>
        <Text style={planStyles.cardTitle}>
          {mode === "edit"
            ? "修改记录"
            : mode === "backfill" || isBackfill
              ? "补记"
              : "记录今天"}
        </Text>
        <View style={{ width: 32 }} />
      </View>
      {planQuery.isPending || (mode === "edit" && recordQuery.isPending) ? (
        <ScreenState
          kind="loading"
          testID="record.loading"
          message="正在读取记录…"
        />
      ) : null}
      {planQuery.isError || recordQuery.isError ? (
        <ScreenState
          kind="error"
          testID="record.load-error"
          message="暂时无法读取计划或记录，请检查网络"
          onRetry={() =>
            void (planQuery.isError
              ? planQuery.refetch()
              : recordQuery.refetch())
          }
        />
      ) : null}
      {plan && (mode !== "edit" || recordQuery.isSuccess) ? (
        <>
          <Text
            testID="record.editor.plan"
            style={[planStyles.title, { marginTop: 28 }]}
          >
            {plan.title}
          </Text>
          <Text testID="record.editor.date" style={planStyles.subtitle}>
            计划日期 {businessDate} · {plan.timezone}
          </Text>
          {mode === "edit" ? (
            <Text style={planStyles.notice}>
              修改后以本次结果为准，原记录会保留修订痕迹。
            </Text>
          ) : null}
          {isBackfill ? (
            <Text style={planStyles.notice}>
              正在补记过去日期，请按当时实际情况填写。
            </Text>
          ) : null}
          {plan.kind === "one_time" ? (
            <>
              <Text style={[planStyles.cardTitle, { marginTop: 28 }]}>
                这项任务的结果
              </Text>
              <View style={[planStyles.wrap, { marginTop: 13 }]}>
                {oneTimeResults.map((item) => (
                  <Choice
                    key={item.key}
                    testID={`record.once.${item.key}`}
                    label={item.label}
                    selected={onceResult === item.key}
                    onPress={() => setOnceResult(item.key)}
                  />
                ))}
              </View>
              <Text style={[planStyles.subtitle, { marginTop: 18 }]}>
                一次性任务结果需联网保存。
              </Text>
            </>
          ) : (
            <>
              <Text style={[planStyles.cardTitle, { marginTop: 28 }]}>
                这次的结果
              </Text>
              <View style={[planStyles.wrap, { marginTop: 13 }]}>
                {results.map((item) => (
                  <Choice
                    key={item.key}
                    testID={`record.result.${item.key}`}
                    label={resultLabel(plan, item.key)}
                    selected={result === item.key}
                    onPress={() => setResult(item.key)}
                  />
                ))}
              </View>
              {result === "failure" ? (
                <FormField label="原因（可选）" testID="record.failure-reason">
                  <PlanInput
                    value={failureReason}
                    onChangeText={setFailureReason}
                    placeholder="写下这次的情况"
                    multiline
                    testID="record.failure-reason.input"
                  />
                </FormField>
              ) : null}
            </>
          )}
          <FormField label="备注（可选）" testID="record.note">
            <PlanInput
              value={note}
              onChangeText={setNote}
              placeholder="想记下什么？"
              multiline
              testID="record.note.input"
            />
          </FormField>
          {plan.kind !== "one_time" ? (
            <View style={[planStyles.row, { alignItems: "flex-start" }]}>
              <View style={planStyles.flex}>
                <FormField label="数值（可选）" testID="record.numeric">
                  <PlanInput
                    value={numberValue}
                    onChangeText={setNumberValue}
                    placeholder="例如 30"
                    testID="record.numeric.input"
                  />
                </FormField>
              </View>
              <View style={planStyles.flex}>
                <FormField label="单位" testID="record.unit">
                  <PlanInput
                    value={numberUnit}
                    onChangeText={setNumberUnit}
                    placeholder="例如 分钟"
                    testID="record.unit.input"
                  />
                </FormField>
              </View>
            </View>
          ) : null}
          <View testID="record.photos" style={{ marginTop: 24 }}>
            <Text style={planStyles.cardTitle}>照片（可选）</Text>
            <Text style={[planStyles.subtitle, { marginTop: 6 }]}>
              最多 9 张。照片单独上传，失败不会影响记录保存。
            </Text>
            {existingPhotoIds.length || photos.length ? (
              <View style={[planStyles.wrap, { marginTop: 12 }]}>
                {existingPhotoIds.map((id, index) => (
                  <PrivatePhoto
                    key={id}
                    id={id}
                    index={index}
                    repository={repository}
                    onRemove={() => removeRemotePhoto(id)}
                  />
                ))}
                {photos.map((photo, index) => (
                  <View key={photo.id} style={{ width: 86, marginRight: 8 }}>
                    <Image
                      source={{ uri: photo.fileUri }}
                      accessibilityLabel={`待上传照片 ${index + 1}`}
                      style={{ width: 80, height: 80, borderRadius: 10 }}
                    />
                    <Pressable
                      testID={`record.photo.remove.${photo.id}`}
                      accessibilityRole="button"
                      accessibilityLabel={`移除待上传照片 ${index + 1}`}
                      onPress={() => void removePhoto(photo)}
                      style={{ minHeight: 44, justifyContent: "center" }}
                    >
                      <Text style={{ color: planPalette.danger }}>移除</Text>
                    </Pressable>
                  </View>
                ))}
              </View>
            ) : null}
            <Pressable
              testID="record.photo.add"
              accessibilityRole="button"
              accessibilityLabel="添加照片"
              accessibilityState={{
                disabled:
                  choosingPhoto ||
                  pending ||
                  existingPhotoIds.length + photos.length >= 9,
              }}
              onPress={() => void addPhotos()}
              style={{ minHeight: 44, justifyContent: "center" }}
            >
              <Text style={{ color: planPalette.primary, fontWeight: "600" }}>
                {choosingPhoto ? "正在处理照片…" : "添加照片"}
              </Text>
            </Pressable>
          </View>
          {localStatus ? (
            <StatusNotice
              kind={
                localStatus === "failed" || localStatus === "conflict"
                  ? "failure"
                  : "pending"
              }
              testID="record.local-saved"
              message={
                localStatus === "conflict"
                  ? "已保存到本机，存在版本冲突"
                  : localStatus === "failed"
                    ? "已保存到本机，同步失败，可稍后重试"
                    : "已保存到本机，等待联网同步"
              }
            />
          ) : null}
          {localRecord.data?.state === "conflict" ? (
            <StatusNotice
              kind="failure"
              testID="record.conflict-action"
              message="这条记录在另一台设备上也发生了修改。请选择要保留的版本。"
              actionLabel="查看两个版本"
              onAction={() =>
                navigation.navigate("RecordConflict", { planId, businessDate })
              }
            />
          ) : null}
          {localRecord.data?.state === "failed" ? (
            <StatusNotice
              kind="failure"
              testID="record.retry-action"
              message="本机记录尚未同步成功，可在同步状态中查看原因并重试。"
              actionLabel="查看同步状态"
              onAction={() => navigation.navigate("SyncFeedback")}
            />
          ) : null}
          <ErrorText message={error} />
          <Submit
            testID="record.save"
            label={mode === "edit" ? "保存修改" : "保存记录"}
            onPress={() =>
              void (plan.kind === "one_time" ? finishOnce() : save())
            }
            pending={pending}
            disabled={Boolean(
              planQuery.isError ||
              recordQuery.isError ||
              invalidDate ||
              choosingPhoto ||
              localRecord.data?.state === "conflict",
            )}
          />
        </>
      ) : null}
    </PlanScreen>
  );
}
