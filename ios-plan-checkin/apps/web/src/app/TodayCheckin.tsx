import { useEffect, useRef, useState, type FormEvent } from "react";
import type {
  CheckinDto,
  CheckinConflictDetails,
  CheckinResult,
  CreateUploadIntentRequest,
  PutCheckinRequest,
  TodayItemDto,
} from "@plan-checkin/contracts";
import {
  ApiError,
  completeMedia,
  createUploadIntent,
  getCheckin,
  putCheckin,
} from "../data/api";
import { newUuid } from "../data/uuid";
import { PrivateMediaGallery } from "./PrivateMediaGallery";

const allowedMime = new Set<CreateUploadIntentRequest["mime"]>([
  "image/jpeg",
  "image/png",
  "image/heic",
  "image/webp",
]);
const maxPhotoBytes = 20 * 1024 * 1024;

function mediaMime(file: File): CreateUploadIntentRequest["mime"] | null {
  if (allowedMime.has(file.type as CreateUploadIntentRequest["mime"]))
    return file.type as CreateUploadIntentRequest["mime"];
  if (/\.hei[cf]$/i.test(file.name)) return "image/heic";
  return null;
}

export async function stagePhoto(file: File): Promise<string> {
  const mime = mediaMime(file);
  if (!mime || file.size > maxPhotoBytes || file.size < 1)
    throw new Error("只支持不超过 20 MB 的 JPEG、PNG、HEIC 或 WebP 照片");
  const bytes = await file.arrayBuffer();
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  const sha256 = Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
  const intent = await createUploadIntent({ mime, bytes: file.size, sha256 });
  let response: Response;
  try {
    response = await fetch(intent.uploadUrl, {
      method: "PUT",
      headers: intent.headers,
      body: bytes,
    });
  } catch {
    throw new Error("照片上传失败，请检查网络后重试");
  }
  if (!response.ok) throw new Error("照片上传失败，请重新选择照片后重试");
  return intent.id;
}

function message(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error) return error.message;
  return "保存失败，请稍后重试";
}

function conflictDetails(value: unknown): CheckinConflictDetails | null {
  if (!value || typeof value !== "object") return null;
  const details = value as Partial<CheckinConflictDetails>;
  if (
    typeof details.conflictId !== "string" ||
    !Number.isInteger(details.currentRevision) ||
    !details.serverRecord ||
    typeof details.serverRecord.id !== "string"
  )
    return null;
  return details as CheckinConflictDetails;
}

const resultLabel: Record<CheckinResult, string> = {
  success: "完成",
  failure: "未完成",
  skip: "跳过",
};

export function TodayCheckin({
  item,
  onSaved,
  mode = "today",
}: {
  item: TodayItemDto;
  onSaved: () => void;
  mode?: "today" | "history";
}) {
  const [open, setOpen] = useState(false);
  const [record, setRecord] = useState<CheckinDto | null>(null);
  const [result, setResult] = useState<CheckinResult>("success");
  const [note, setNote] = useState("");
  const [failureReason, setFailureReason] = useState("");
  const [numericValue, setNumericValue] = useState("");
  const [photos, setPhotos] = useState<File[]>([]);
  const photoInput = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [pendingMedia, setPendingMedia] = useState<{
    checkinId: string;
    mediaIds: string[];
  } | null>(null);
  const pendingWrite = useRef<{
    input: PutCheckinRequest;
    key: string;
    stagedIds: string[];
  } | null>(null);
  const [retryOriginalWrite, setRetryOriginalWrite] = useState(false);
  const [conflict, setConflict] = useState<CheckinConflictDetails | null>(null);
  const [resolutionReady, setResolutionReady] = useState(false);

  useEffect(() => {
    if (!open || !item.record || record?.id === item.record.id) return;
    let cancelled = false;
    setLoading(true);
    void getCheckin(item.plan.id, item.planBusinessDate)
      .then((full) => {
        if (cancelled) return;
        setRecord(full);
        setResult(full.result);
        setNote(full.note ?? "");
        setFailureReason(full.failureReason ?? "");
        setNumericValue(full.numeric?.value ?? "");
      })
      .catch((caught: unknown) => {
        if (!cancelled) setError(message(caught));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, item.plan.id, item.planBusinessDate, item.record, record?.id]);

  const numericItem =
    item.plan.numericItem?.effectiveFrom &&
    item.plan.numericItem.effectiveFrom <= item.planBusinessDate
      ? item.plan.numericItem
      : null;
  const submitted = pendingWrite.current?.input;
  const canEdit = item.canCheckIn || item.record !== null;

  async function retryMedia() {
    if (!pendingMedia) return;
    setBusy(true);
    setError("");
    try {
      for (const mediaId of pendingMedia.mediaIds)
        await completeMedia(mediaId, pendingMedia.checkinId);
      setPendingMedia(null);
      setNotice("记录和照片均已保存");
    } catch (caught) {
      setError(`记录已保存，照片尚未完成绑定：${message(caught)}`);
    } finally {
      setBusy(false);
    }
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || loading || !canEdit) return;
    if (pendingMedia) {
      setError("请先完成已保存记录的照片绑定，再修改记录");
      return;
    }
    if (item.record && !record) {
      setError("原记录尚未加载，请稍后重试");
      return;
    }
    if (
      numericValue &&
      (!numericItem || !/^(0|[1-9]\d*)(\.\d+)?$/.test(numericValue))
    ) {
      setError("数值格式不正确，请输入非负数");
      return;
    }
    const existingIds = record?.mediaIds ?? [];
    if (existingIds.length + photos.length > 9) {
      setError("每条记录最多 9 张照片");
      return;
    }
    setBusy(true);
    setError("");
    setNotice("");
    let recordSaved = false;
    try {
      let write = pendingWrite.current;
      if (!write) {
        const stagedIds: string[] = [];
        for (const photo of photos) stagedIds.push(await stagePhoto(photo));
        const operationId = newUuid();
        write = {
          key: operationId,
          stagedIds,
          input: {
            result,
            note: note.trim() || null,
            failureReason:
              result === "failure" ? failureReason.trim() || null : null,
            numeric:
              numericValue && numericItem
                ? { value: numericValue, unit: numericItem.unit }
                : null,
            mediaIds: [...existingIds, ...stagedIds],
            baseRevision: record?.revision ?? item.record?.revision ?? 0,
            clientCreatedAt: new Date().toISOString(),
            clientOperationId: operationId,
            ruleVersion: item.activeRuleVersion,
          },
        };
        pendingWrite.current = write;
      }
      const saved = await putCheckin(
        item.plan.id,
        item.planBusinessDate,
        write.input,
        write.key,
      );
      recordSaved = true;
      pendingWrite.current = null;
      setRetryOriginalWrite(false);
      setResolutionReady(false);
      setConflict(null);
      setRecord(saved);
      setPhotos([]);
      if (photoInput.current) photoInput.current.value = "";
      onSaved();
      window.dispatchEvent(new Event("plan-data-changed"));
      if (saved.mediaAttachFailed) {
        setError("记录已保存，但照片未能关联。请刷新记录核对后重试照片。");
        return;
      }
      if (write.stagedIds.length) {
        setPendingMedia({ checkinId: saved.id, mediaIds: write.stagedIds });
        for (const mediaId of write.stagedIds)
          await completeMedia(mediaId, saved.id);
        setPendingMedia(null);
      }
      setNotice(write.stagedIds.length ? "记录和照片均已保存" : "记录已保存");
    } catch (caught) {
      if (
        !recordSaved &&
        caught instanceof ApiError &&
        caught.code === "CHECKIN_CONFLICT" &&
        pendingWrite.current &&
        conflictDetails(caught.details)
      ) {
        setConflict(conflictDetails(caught.details));
        setResolutionReady(false);
        setError("");
      } else if (
        !recordSaved &&
        caught instanceof ApiError &&
        (caught.status === 0 || caught.status >= 500) &&
        pendingWrite.current
      ) {
        setRetryOriginalWrite(true);
        setError("提交结果未知。联网后重试原操作，不会新建第二条记录。");
      } else {
        if (!recordSaved) pendingWrite.current = null;
        setResolutionReady(false);
        setError(
          recordSaved
            ? `记录已保存，照片尚未完成绑定：${message(caught)}`
            : message(caught),
        );
      }
    } finally {
      setBusy(false);
    }
  }

  function keepServerVersion() {
    if (!conflict) return;
    const latest = conflict.serverRecord;
    pendingWrite.current = null;
    setConflict(null);
    setResolutionReady(false);
    setRecord(latest);
    setResult(latest.result);
    setNote(latest.note ?? "");
    setFailureReason(latest.failureReason ?? "");
    setNumericValue(latest.numeric?.value ?? "");
    setPhotos([]);
    if (photoInput.current) photoInput.current.value = "";
    setNotice("已采用服务器上的最新记录。未提交的本机修改已放弃。");
    onSaved();
  }

  function prepareMine() {
    if (!conflict || !pendingWrite.current) return;
    const operationId = newUuid();
    pendingWrite.current = {
      ...pendingWrite.current,
      key: operationId,
      input: {
        ...pendingWrite.current.input,
        baseRevision: conflict.currentRevision,
        clientOperationId: operationId,
        resolutionOfConflictId: conflict.conflictId,
      },
    };
    setRecord(conflict.serverRecord);
    setConflict(null);
    setResolutionReady(true);
    setNotice(
      "已选择本机版本。请再次点击保存确认覆盖；若记录又变化，会再次提示冲突。",
    );
  }

  if (item.plan.kind === "one_time") return null;
  return (
    <div className="today-checkin">
      <button
        className="secondary-button"
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-controls={`checkin-${item.plan.id}`}
      >
        {item.record
          ? "查看或修正记录"
          : mode === "history"
            ? "补记这一天"
            : "今日打卡"}
      </button>
      {open && (
        <div id={`checkin-${item.plan.id}`} className="checkin-panel">
          <p className="checkin-date">
            业务日期：{item.planBusinessDate} · {item.plan.timezone}
          </p>
          {!canEdit ? (
            <p role="status">当前计划不可打卡</p>
          ) : (
            <form className="plan-form" onSubmit={(event) => void save(event)}>
              <fieldset
                disabled={
                  busy ||
                  loading ||
                  retryOriginalWrite ||
                  Boolean(conflict) ||
                  resolutionReady
                }
              >
                <legend>本次结果</legend>
                <div className="checkin-options">
                  <label>
                    <input
                      type="radio"
                      name={`result-${item.plan.id}`}
                      value="success"
                      checked={result === "success"}
                      onChange={() => setResult("success")}
                    />
                    {item.plan.direction === "avoid" ? "守住目标" : "已完成"}
                  </label>
                  <label>
                    <input
                      type="radio"
                      name={`result-${item.plan.id}`}
                      value="failure"
                      checked={result === "failure"}
                      onChange={() => setResult("failure")}
                    />
                    {item.plan.direction === "avoid" ? "未守住" : "未完成"}
                  </label>
                  <label>
                    <input
                      type="radio"
                      name={`result-${item.plan.id}`}
                      value="skip"
                      checked={result === "skip"}
                      onChange={() => setResult("skip")}
                    />
                    跳过
                  </label>
                </div>
              </fieldset>
              {result === "failure" && (
                <label>
                  失败原因
                  <textarea
                    disabled={
                      retryOriginalWrite || Boolean(conflict) || resolutionReady
                    }
                    value={failureReason}
                    maxLength={1000}
                    onChange={(event) => setFailureReason(event.target.value)}
                  />
                </label>
              )}
              <label>
                备注
                <textarea
                  disabled={
                    retryOriginalWrite || Boolean(conflict) || resolutionReady
                  }
                  value={note}
                  maxLength={2000}
                  onChange={(event) => setNote(event.target.value)}
                />
              </label>
              {numericItem && (
                <label>
                  {numericItem.label}（{numericItem.unit}）
                  <input
                    disabled={
                      retryOriginalWrite || Boolean(conflict) || resolutionReady
                    }
                    type="number"
                    min="0"
                    step="any"
                    inputMode="decimal"
                    value={numericValue}
                    onChange={(event) => setNumericValue(event.target.value)}
                  />
                </label>
              )}
              <label>
                照片（最多 9 张，每张不超过 20 MB）
                <input
                  ref={photoInput}
                  disabled={
                    retryOriginalWrite || Boolean(conflict) || resolutionReady
                  }
                  type="file"
                  accept="image/jpeg,image/png,image/heic,image/webp,.heic,.heif"
                  multiple
                  onChange={(event) => {
                    const chosen = Array.from(event.target.files ?? []);
                    if (chosen.length + (record?.mediaIds.length ?? 0) > 9)
                      setError("每条记录最多 9 张照片");
                    else {
                      setError("");
                      setPhotos(chosen);
                    }
                  }}
                />
              </label>
              {record && <p>已保存照片：{record.mediaIds.length} 张</p>}
              {record && <PrivateMediaGallery mediaIds={record.mediaIds} />}
              {photos.length > 0 && (
                <div>
                  <p>待上传：{photos.map((file) => file.name).join("、")}</p>
                  <button
                    className="text-button"
                    type="button"
                    disabled={
                      retryOriginalWrite || Boolean(conflict) || resolutionReady
                    }
                    onClick={() => {
                      setPhotos([]);
                      if (photoInput.current) photoInput.current.value = "";
                      setError("");
                    }}
                  >
                    移除待上传照片
                  </button>
                </div>
              )}
              {error && (
                <p className="form-error" role="alert">
                  {error}
                </p>
              )}
              {notice && <p role="status">{notice}</p>}
              {conflict && (
                <section
                  className="checkin-conflict"
                  role="group"
                  aria-label="记录冲突选择"
                >
                  <h3>记录已在另一处修改</h3>
                  <div className="conflict-versions">
                    <div>
                      <strong>
                        服务器最新版本 V{conflict.currentRevision}
                      </strong>
                      <p>结果：{resultLabel[conflict.serverRecord.result]}</p>
                      <p>备注：{conflict.serverRecord.note || "无"}</p>
                      <p>
                        失败原因：{conflict.serverRecord.failureReason || "无"}
                      </p>
                      <p>
                        数值：
                        {conflict.serverRecord.numeric
                          ? `${conflict.serverRecord.numeric.value} ${conflict.serverRecord.numeric.unit}`
                          : "无"}
                      </p>
                    </div>
                    <div>
                      <strong>本机待提交版本</strong>
                      <p>
                        结果：{submitted ? resultLabel[submitted.result] : "无"}
                      </p>
                      <p>备注：{submitted?.note || "无"}</p>
                      <p>失败原因：{submitted?.failureReason || "无"}</p>
                      <p>
                        数值：
                        {submitted?.numeric
                          ? `${submitted.numeric.value} ${submitted.numeric.unit}`
                          : "无"}
                      </p>
                    </div>
                  </div>
                  <div className="social-actions">
                    <button
                      type="button"
                      className="secondary-button"
                      onClick={keepServerVersion}
                    >
                      保留服务器版本
                    </button>
                    <button
                      type="button"
                      className="secondary-button"
                      onClick={prepareMine}
                    >
                      选择我的版本
                    </button>
                  </div>
                </section>
              )}
              {pendingMedia && (
                <button
                  className="secondary-button"
                  type="button"
                  disabled={busy}
                  onClick={() => void retryMedia()}
                >
                  重试完成照片绑定
                </button>
              )}
              <div className="form-actions">
                <button
                  className="primary-button"
                  type="submit"
                  disabled={
                    busy ||
                    loading ||
                    pendingMedia !== null ||
                    Boolean(conflict)
                  }
                >
                  {busy
                    ? "正在保存…"
                    : retryOriginalWrite
                      ? "重试原操作"
                      : resolutionReady
                        ? "确认以我的版本保存"
                        : item.record
                          ? "保存修正"
                          : "保存打卡"}
                </button>
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
