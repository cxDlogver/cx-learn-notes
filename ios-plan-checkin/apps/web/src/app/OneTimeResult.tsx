import { useEffect, useRef, useState, type FormEvent } from "react";
import type {
  OneTimeResolution,
  OneTimeResolutionDto,
  OneTimeResolutionRequest,
  PlanDto,
} from "@plan-checkin/contracts";
import {
  ApiError,
  completeOneTimeMedia,
  getPlanDetail,
  saveOneTimeResolution,
} from "../data/api";
import { newUuid } from "../data/uuid";
import { stagePhoto } from "./TodayCheckin";
import { PrivateMediaGallery } from "./PrivateMediaGallery";

const stateLabels: Record<OneTimeResolution, string> = {
  completed: "完成",
  failed: "失败",
  cancelled: "取消",
};

function inputTime(instant: string): string {
  const date = new Date(instant);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
    .toISOString()
    .slice(0, 16);
}

function message(error: unknown): string {
  return error instanceof ApiError
    ? error.message
    : error instanceof Error
      ? error.message
      : "操作未完成，请稍后重试";
}

export function OneTimeResult({ plan }: { plan: PlanDto }) {
  const [saved, setSaved] = useState<OneTimeResolutionDto | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [resolution, setResolution] = useState<OneTimeResolution>("completed");
  const [completedAt, setCompletedAt] = useState(
    inputTime(new Date().toISOString()),
  );
  const [note, setNote] = useState("");
  const [numericValue, setNumericValue] = useState("");
  const [photos, setPhotos] = useState<File[]>([]);
  const [pendingMedia, setPendingMedia] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const photoInput = useRef<HTMLInputElement>(null);
  const pendingWrite = useRef<{
    input: OneTimeResolutionRequest;
    correction: boolean;
    key: string;
    stagedIds: string[];
  } | null>(null);
  const [retryOriginalWrite, setRetryOriginalWrite] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoaded(false);
    void getPlanDetail(plan.id)
      .then((detail) => {
        if (cancelled) return;
        const current =
          detail.statistics.kind === "one_time"
            ? detail.statistics.resolution
            : null;
        setSaved(current);
        if (current) {
          setResolution(current.resolution);
          setCompletedAt(inputTime(current.resolvedAt));
          setNote(current.note ?? "");
          setNumericValue(current.numeric?.value ?? "");
        }
        setLoaded(true);
      })
      .catch((caught: unknown) => {
        if (!cancelled) setError(message(caught));
      });
    return () => {
      cancelled = true;
    };
  }, [plan.id]);

  async function completePending(ids: string[]) {
    for (const mediaId of ids) await completeOneTimeMedia(mediaId, plan.id);
    setPendingMedia([]);
    setNotice("一次性任务结果和照片均已保存");
  }

  async function retryMedia() {
    if (busy || pendingMedia.length === 0) return;
    setBusy(true);
    setError("");
    try {
      await completePending(pendingMedia);
    } catch (caught) {
      setError(`结果已保存，照片尚未完成绑定：${message(caught)}`);
    } finally {
      setBusy(false);
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || !loaded) return;
    if (pendingMedia.length > 0) {
      setError("请先完成已保存结果的照片绑定，再修改结果");
      return;
    }
    const enteredTime = new Date(completedAt);
    if (resolution === "completed" && !Number.isFinite(enteredTime.getTime())) {
      setError("请选择有效的实际完成时间");
      return;
    }
    const completedInstant =
      resolution === "completed"
        ? saved?.resolution === "completed" &&
          completedAt === inputTime(saved.resolvedAt)
          ? saved.resolvedAt
          : enteredTime.toISOString()
        : undefined;
    if (numericValue && !/^(0|[1-9]\d*)(\.\d+)?$/.test(numericValue)) {
      setError("数值格式不正确，请输入非负数");
      return;
    }
    if (photos.length + (saved?.mediaIds?.length ?? 0) > 9) {
      setError("每条结果最多 9 张照片");
      return;
    }
    setBusy(true);
    setError("");
    setNotice("");
    let resultSaved = false;
    try {
      let write = pendingWrite.current;
      if (!write) {
        const stagedIds: string[] = [];
        for (const photo of photos) stagedIds.push(await stagePhoto(photo));
        write = {
          key: newUuid(),
          correction: saved !== null,
          stagedIds,
          input: {
            resolution,
            baseRevision: saved?.revision ?? 0,
            ...(completedInstant ? { completedAt: completedInstant } : {}),
            note: note.trim() || null,
            numeric:
              numericValue && plan.numericItem
                ? { value: numericValue, unit: plan.numericItem.unit }
                : null,
            mediaIds: [...(saved?.mediaIds ?? []), ...stagedIds],
          },
        };
        pendingWrite.current = write;
      }
      const result = await saveOneTimeResolution(
        plan.id,
        write.input,
        write.correction,
        write.key,
      );
      resultSaved = true;
      pendingWrite.current = null;
      setRetryOriginalWrite(false);
      setSaved(result);
      window.dispatchEvent(new Event("plan-data-changed"));
      setPhotos([]);
      if (photoInput.current) photoInput.current.value = "";
      if (result.mediaAttachFailed) {
        setError("结果已保存，但照片未能关联。请刷新后核对。");
        return;
      }
      if (write.stagedIds.length) {
        setPendingMedia(write.stagedIds);
        await completePending(write.stagedIds);
      } else setNotice("一次性任务结果已保存");
    } catch (caught) {
      if (
        !resultSaved &&
        caught instanceof ApiError &&
        (caught.status === 0 || caught.status >= 500) &&
        pendingWrite.current
      ) {
        setRetryOriginalWrite(true);
        setError("提交结果未知。联网后重试原操作，不会新建第二条终态。");
      } else {
        if (!resultSaved) pendingWrite.current = null;
        setError(
          resultSaved
            ? `结果已保存，照片尚未完成绑定：${message(caught)}`
            : message(caught),
        );
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="one-time-result" aria-labelledby="one-time-heading">
      <h2 id="one-time-heading">一次性任务结果</h2>
      {!loaded && !error && <p role="status">正在读取已有结果…</p>}
      {saved && (
        <p role="status">
          当前结果：{stateLabels[saved.resolution]} ·{" "}
          {saved.resolvedBusinessDate}
          {saved.timing === "late" ? " · 逾期完成" : ""}
          {saved.isRevised ? ` · 已修正 V${saved.revision}` : ""}
        </p>
      )}
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      {loaded && !saved && plan.lifecycle !== "active" && (
        <p role="status">计划当前不是进行中，不能首次提交结果。</p>
      )}
      {loaded && (saved || plan.lifecycle === "active") && (
        <form className="plan-form" onSubmit={(event) => void submit(event)}>
          <label>
            结果
            <select
              disabled={retryOriginalWrite}
              value={resolution}
              onChange={(event) =>
                setResolution(event.target.value as OneTimeResolution)
              }
            >
              <option value="completed">完成</option>
              <option value="failed">失败</option>
              <option value="cancelled">取消</option>
            </select>
          </label>
          {resolution === "completed" && (
            <label>
              实际完成时间（设备时区）
              <input
                disabled={retryOriginalWrite}
                type="datetime-local"
                value={completedAt}
                onChange={(event) => setCompletedAt(event.target.value)}
              />
            </label>
          )}
          <label>
            备注
            <textarea
              disabled={retryOriginalWrite}
              maxLength={2000}
              value={note}
              onChange={(event) => setNote(event.target.value)}
            />
          </label>
          {plan.numericItem && (
            <label>
              {plan.numericItem.label}（{plan.numericItem.unit}）
              <input
                disabled={retryOriginalWrite}
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
              disabled={retryOriginalWrite}
              type="file"
              multiple
              accept="image/jpeg,image/png,image/heic,image/webp,.heic,.heif"
              onChange={(event) =>
                setPhotos(Array.from(event.target.files ?? []))
              }
            />
          </label>
          {saved && <p>已保存照片：{saved.mediaIds?.length ?? 0} 张</p>}
          {saved && <PrivateMediaGallery mediaIds={saved.mediaIds ?? []} />}
          {photos.length > 0 && (
            <div>
              <p>待上传：{photos.map((file) => file.name).join("、")}</p>
              <button
                className="text-button"
                type="button"
                disabled={retryOriginalWrite}
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
          {notice && <p role="status">{notice}</p>}
          {pendingMedia.length > 0 && (
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
              disabled={busy || pendingMedia.length > 0}
            >
              {busy
                ? "正在保存…"
                : retryOriginalWrite
                  ? "重试原操作"
                  : saved
                    ? "保存结果修正"
                    : "提交结果"}
            </button>
          </div>
        </form>
      )}
    </section>
  );
}
