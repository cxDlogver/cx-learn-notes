import { useEffect, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { Directory, File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";
import { penColors } from "@plan-checkin/design-tokens";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import type { DataExportDto } from "@plan-checkin/contracts";
import { useAppServices } from "../../data/services";
import { ScreenState } from "../../components/ScreenState";
import {
  ErrorText,
  PlanScreen,
  Submit,
  planPalette,
  planStyles,
} from "../plans/ui";

const content: {
  icon: keyof typeof Ionicons.glyphMap;
  name: string;
  description: string;
}[] = [
  {
    icon: "grid-outline",
    name: "CSV",
    description: "计划、规则、打卡和修订的表格数据",
  },
  {
    icon: "code-slash-outline",
    name: "JSON",
    description: "完整的结构化数据和字段说明",
  },
  { icon: "images-outline", name: "照片", description: "你上传的私人打卡照片" },
  {
    icon: "people-outline",
    name: "关系数据",
    description: "好友、请求、分享和鼓励记录",
  },
];
const tempDirectory = () => new Directory(Paths.cache, "plan-checkin-exports");
export function purgeExportCache(): void {
  const directory = tempDirectory();
  if (directory.exists) directory.delete();
}
function cleanupOldFiles(): void {
  const directory = tempDirectory();
  if (!directory.exists) return;
  for (const item of directory.list()) {
    if (!(item instanceof File)) continue;
    if (!/^[0-9a-f-]{36}\.zip$/i.test(item.name)) continue;
    if ((item.modificationTime ?? 0) < Date.now() - 60 * 60 * 1000)
      item.delete();
  }
}
const statusText = (item: DataExportDto) => {
  switch (item.status) {
    case "queued":
      return "正在排队生成";
    case "running":
      return "正在整理数据和照片";
    case "ready":
      return "文件已生成";
    case "failed":
      return "生成失败，可以重试";
    case "expired":
      return "文件已过期，可以重新生成";
  }
};
export function ExportDataScreen() {
  const { repository, queryClient, mockMode } = useAppServices();
  const exportsQuery = useQuery({
    queryKey: ["data-exports"],
    queryFn: () => repository.listDataExports(),
    refetchInterval: (query) =>
      query.state.data?.some(
        (item) => item.status === "queued" || item.status === "running",
      )
        ? 3000
        : false,
  });
  const [busy, setBusy] = useState<"create" | "download" | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    try {
      cleanupOldFiles();
    } catch {
      /* Cache cleanup is best effort. */
    }
  }, []);
  const latest = exportsQuery.data?.[0] ?? null;
  const active = latest?.status === "queued" || latest?.status === "running";
  const create = async () => {
    if (busy || active) return;
    setBusy("create");
    setError(null);
    try {
      const created = await repository.createDataExport();
      queryClient.setQueryData<DataExportDto[]>(["data-exports"], (old) => [
        created,
        ...(old ?? []).filter((item) => item.id !== created.id),
      ]);
      await exportsQuery.refetch();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "生成请求失败，请重试");
    } finally {
      setBusy(null);
    }
  };
  const download = async (item: DataExportDto) => {
    if (busy || item.status !== "ready") return;
    setBusy("download");
    setError(null);
    let file: File | null = null;
    try {
      if (!(await Sharing.isAvailableAsync()))
        throw new Error("当前设备无法打开系统分享面板");
      const grant = await repository.getDataExportDownload(item.id);
      if (!grant.url.startsWith("https://") && !__DEV__)
        throw new Error("下载地址不安全，请稍后重试");
      const directory = tempDirectory();
      directory.create({ idempotent: true, intermediates: true });
      const target = new File(directory, `${item.id}.zip`);
      file = await File.downloadFileAsync(grant.url, target, {
        idempotent: true,
      });
      if (file.size !== grant.bytes) throw new Error("下载文件不完整，请重试");
      await Sharing.shareAsync(file.uri, {
        mimeType: "application/zip",
        UTI: "com.pkware.zip-archive",
      });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "下载失败，请重试");
    } finally {
      try {
        if (file?.exists) file.delete();
      } catch {
        /* Next entry cleans old cache files. */
      }
      setBusy(null);
    }
  };
  const explain = () =>
    Alert.alert(
      "完整导出",
      "为避免遗漏数据，首版始终导出全部时间范围，并包含 CSV、JSON、私人照片和关系数据。ZIP 只供本人下载，生成后 24 小时过期。",
    );
  return (
    <PlanScreen>
      <Text testID="export-data.intro" style={styles.intro}>
        导出将生成一个 ZIP 文件，包含你的全部计划记录
      </Text>
      <View testID="export-data.contents" style={styles.card}>
        {content.map((item, index) => (
          <View
            key={item.name}
            style={[styles.contentRow, index > 0 && styles.divider]}
          >
            <Ionicons name={item.icon} size={21} color={penColors.primary} />
            <View style={styles.contentText}>
              <Text style={styles.contentName}>{item.name}</Text>
              <Text style={styles.contentDescription}>{item.description}</Text>
            </View>
          </View>
        ))}
      </View>
      <Text testID="export-data.options-title" style={styles.section}>
        导出设置
      </Text>
      <Pressable
        testID="export-data.range"
        accessibilityRole="button"
        accessibilityLabel="时间范围，全部时间"
        onPress={explain}
        style={styles.option}
      >
        <Text style={styles.optionName}>时间范围</Text>
        <Text style={styles.optionValue}>全部时间</Text>
        <Ionicons
          name="information-circle-outline"
          size={18}
          color={penColors.secondary}
        />
      </Pressable>
      {(["CSV 数据（必含）", "JSON 数据", "照片", "关系数据"] as const).map(
        (label, index) => (
          <Pressable
            key={label}
            testID={`export-data.option.${index}`}
            accessibilityRole="button"
            accessibilityLabel={`${label}，已包含`}
            onPress={explain}
            style={styles.option}
          >
            <Text style={styles.optionName}>{label}</Text>
            <Ionicons name="checkbox" size={22} color={penColors.primary} />
          </Pressable>
        ),
      )}
      <ErrorText message={error} />
      <Submit
        testID="export-data.create"
        label={
          active
            ? "正在生成导出文件"
            : busy === "create"
              ? "正在提交…"
              : "生成导出文件"
        }
        pending={busy === "create"}
        disabled={Boolean(busy || active || mockMode)}
        onPress={() => void create()}
      />
      <Text testID="export-data.hint" style={styles.hint}>
        大文件可能需要几分钟，完成后可在此页下载。文件生成后保留 24 小时。
      </Text>
      {mockMode ? (
        <Text style={planStyles.notice}>
          演示模式不连接云端，数据导出需使用开发服务。
        </Text>
      ) : null}
      {exportsQuery.isPending ? (
        <ScreenState
          kind="loading"
          testID="export-data.loading"
          message="正在读取导出记录…"
        />
      ) : null}
      {exportsQuery.isError ? (
        <ScreenState
          kind="error"
          testID="export-data.error"
          message="暂时无法读取导出记录"
          onRetry={() => void exportsQuery.refetch()}
        />
      ) : null}
      {latest ? (
        <View
          testID="export-data.status"
          style={[styles.card, { marginTop: 24 }]}
        >
          <Text style={styles.contentName}>最近一次导出</Text>
          <Text style={[styles.contentDescription, { marginTop: 8 }]}>
            {statusText(latest)}
          </Text>
          {latest.status === "ready" ? (
            <>
              <Text style={[styles.contentDescription, { marginTop: 5 }]}>
                {latest.fileBytes
                  ? `${(latest.fileBytes / 1024 / 1024).toFixed(1)} MB · `
                  : ""}
                有效期至{" "}
                {latest.expiresAt
                  ? new Date(latest.expiresAt).toLocaleString("zh-CN")
                  : ""}
              </Text>
              <Pressable
                testID="export-data.download"
                accessibilityRole="button"
                disabled={Boolean(busy)}
                onPress={() => void download(latest)}
                style={styles.download}
              >
                <Text style={styles.downloadText}>
                  {busy === "download" ? "正在下载…" : "下载并分享 ZIP"}
                </Text>
              </Pressable>
            </>
          ) : null}
        </View>
      ) : null}
    </PlanScreen>
  );
}

const styles = StyleSheet.create({
  intro: { color: penColors.text, fontSize: 15, lineHeight: 23, marginTop: 4 },
  card: {
    backgroundColor: penColors.surface,
    borderWidth: 1,
    borderColor: planPalette.border,
    borderRadius: 12,
    paddingHorizontal: 15,
    marginTop: 18,
  },
  contentRow: {
    minHeight: 63,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  divider: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: planPalette.border,
  },
  contentText: { flex: 1 },
  contentName: { color: penColors.text, fontSize: 15, fontWeight: "600" },
  contentDescription: {
    color: penColors.secondary,
    fontSize: 12,
    marginTop: 4,
    lineHeight: 18,
  },
  section: {
    color: penColors.secondary,
    fontSize: 13,
    marginTop: 26,
    marginBottom: 8,
  },
  option: {
    minHeight: 47,
    backgroundColor: penColors.surface,
    borderWidth: 1,
    borderColor: planPalette.border,
    borderRadius: 10,
    paddingHorizontal: 15,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 1,
  },
  optionName: { color: penColors.text, fontSize: 14, flex: 1 },
  optionValue: { color: penColors.secondary, fontSize: 13, marginRight: 9 },
  hint: {
    color: penColors.secondary,
    fontSize: 12,
    lineHeight: 19,
    textAlign: "center",
    marginTop: 10,
  },
  download: {
    backgroundColor: penColors.primary,
    borderRadius: 10,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 15,
  },
  downloadText: { color: penColors.surface, fontSize: 15, fontWeight: "600" },
});
