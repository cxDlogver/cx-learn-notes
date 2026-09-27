import { File, UploadType } from "expo-file-system";
import * as Network from "expo-network";
import type { MediaDto, UploadIntentDto } from "@plan-checkin/contracts";
import type { ApiClient } from "./repository";
import type { LocalCache, LocalMediaUpload } from "./localCache";

function retryable(error: unknown): boolean {
  if (!error || typeof error !== "object" || !("status" in error)) return true;
  const status = error.status;
  return (
    typeof status !== "number" ||
    status === 0 ||
    status === 429 ||
    status >= 500
  );
}
function errorCode(error: unknown): string {
  return error &&
    typeof error === "object" &&
    "code" in error &&
    typeof error.code === "string"
    ? error.code
    : "MEDIA_UPLOAD_FAILED";
}

/** Media is linked only after its base record is acknowledged; a failed photo never rewrites the result. */
export class MediaRunner {
  private inFlight: Promise<void> | null = null;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private stopped = false;
  private rerunRequested = false;

  constructor(
    private readonly api: ApiClient,
    private readonly cache: LocalCache,
    private readonly accountId: () => string | null,
    private readonly onApplied: () => Promise<void> = async () => {},
  ) {}

  start(): void {
    this.stopped = false;
  }
  stop(): void {
    this.stopped = true;
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
  }
  trigger(): Promise<void> {
    if (this.stopped) return Promise.resolve();
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
    if (this.inFlight) {
      this.rerunRequested = true;
      return this.inFlight;
    }
    this.inFlight = (async () => {
      do {
        this.rerunRequested = false;
        await this.run();
      } while (this.rerunRequested && !this.stopped);
    })().finally(() => {
      this.inFlight = null;
      void this.schedule().catch(() => {});
    });
    return this.inFlight;
  }

  private async upload(media: LocalMediaUpload): Promise<string> {
    const file = new File(media.fileUri);
    if (!file.exists || file.size !== media.byteSize)
      throw new Error("本机照片文件已丢失或改变");
    const intent = await this.api.post<UploadIntentDto>(
      "/media/upload-intents",
      {
        mime: media.mimeType,
        bytes: media.byteSize,
        sha256: media.sha256,
      },
    );
    const uploaded = await file.upload(intent.uploadUrl, {
      httpMethod: "PUT",
      uploadType: UploadType.BINARY_CONTENT,
      headers: intent.headers,
      mimeType: media.mimeType,
    });
    if (uploaded.status < 200 || uploaded.status >= 300)
      throw new Error(`照片传输失败：HTTP ${uploaded.status}`);
    const body = media.checkinId
      ? { checkinId: media.checkinId }
      : { oneTimePlanId: media.oneTimePlanId };
    const ready = await this.api.post<MediaDto>(
      `/media/${encodeURIComponent(intent.id)}/complete`,
      body,
    );
    if (ready.status !== "ready") throw new Error("照片未完成关联");
    return ready.id;
  }

  private async run(): Promise<void> {
    const accountId = this.accountId();
    if (!accountId) return;
    try {
      const state = await Network.getNetworkStateAsync();
      if (state.isConnected === false || state.isInternetReachable === false)
        return;
    } catch {
      // Unknown reachability: allow the API call to classify transport failure.
    }
    for (let count = 0; count < 20 && !this.stopped; count++) {
      if (this.accountId() !== accountId) return;
      const media = await this.cache.claimMediaUpload(accountId);
      if (!media) return;
      try {
        const remoteId = await this.upload(media);
        if (this.accountId() !== accountId) return;
        await this.cache.uploadedMedia(accountId, media.id, remoteId);
        await this.onApplied().catch(() => {});
      } catch (error) {
        if (this.accountId() !== accountId) return;
        const retryAt = retryable(error)
          ? new Date(
              Date.now() +
                Math.min(
                  3_600_000,
                  30_000 * 2 ** Math.min(media.retryCount, 7),
                ),
            )
          : null;
        await this.cache.failedMedia(
          accountId,
          media.id,
          errorCode(error),
          retryAt,
        );
      }
    }
    this.rerunRequested = true;
  }

  private async schedule(): Promise<void> {
    const accountId = this.accountId();
    if (!accountId || this.stopped) return;
    const next = await this.cache.nextMediaWakeAt(accountId);
    if (!next || this.accountId() !== accountId) return;
    this.timer = setTimeout(
      () => void this.trigger(),
      Math.max(1000, next.getTime() - Date.now()),
    );
  }
}
