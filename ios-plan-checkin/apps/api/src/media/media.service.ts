import { createHash, randomUUID } from "node:crypto";
import { Injectable } from "@nestjs/common";
import type { PoolClient } from "pg";
import type {
  CompleteMediaRequest,
  CreateUploadIntentRequest,
  MediaDownloadDto,
  MediaDto,
  UploadIntentDto,
} from "@plan-checkin/contracts";
import { Database } from "../database.js";
import { fail } from "../http.js";
import { guardFields, requireUuid } from "../plans/write.js";
import { appendUserChange } from "../sync/change-log.js";
import { ObjectStore } from "./object-store.js";

interface MediaRow {
  id: string;
  owner_id: string;
  checkin_id: string | null;
  one_time_plan_id: string | null;
  object_key: string;
  sha256: Buffer;
  mime: CreateUploadIntentRequest["mime"];
  bytes: number | string;
  status: "pending" | "ready" | "deleted";
}

const allowedMime = new Set([
  "image/jpeg",
  "image/png",
  "image/heic",
  "image/webp",
]);
function matchesMagic(mime: string, data: Buffer): boolean {
  if (mime === "image/jpeg")
    return (
      data.length >= 3 &&
      data[0] === 0xff &&
      data[1] === 0xd8 &&
      data[2] === 0xff
    );
  if (mime === "image/png")
    return data.subarray(0, 8).equals(Buffer.from("89504e470d0a1a0a", "hex"));
  if (mime === "image/webp")
    return (
      data.toString("ascii", 0, 4) === "RIFF" &&
      data.toString("ascii", 8, 12) === "WEBP"
    );
  if (mime === "image/heic")
    return (
      data.toString("ascii", 4, 8) === "ftyp" &&
      /^(?:heic|heix|hevc|hevx|mif1)$/.test(data.toString("ascii", 8, 12))
    );
  return false;
}
function dto(row: MediaRow): MediaDto {
  return {
    id: row.id,
    status: row.status === "ready" ? "ready" : "deleted",
    mime: row.mime,
    bytes: Number(row.bytes),
    checkinId: row.checkin_id,
    oneTimePlanId: row.one_time_plan_id,
  };
}

@Injectable()
export class MediaService {
  constructor(
    private readonly database: Database,
    private readonly objects: ObjectStore,
  ) {}

  async createIntent(
    userId: string,
    input: CreateUploadIntentRequest,
  ): Promise<UploadIntentDto> {
    guardFields(input as unknown, ["mime", "bytes", "sha256"]);
    if (
      !allowedMime.has(input.mime) ||
      !Number.isInteger(input.bytes) ||
      input.bytes < 1 ||
      input.bytes > 20 * 1024 * 1024 ||
      typeof input.sha256 !== "string" ||
      !/^[0-9a-f]{64}$/i.test(input.sha256)
    )
      fail("VALIDATION_ERROR", 400, "照片格式、大小或摘要不正确");
    const pending = await this.database.query<{ count: string }>(
      "SELECT count(*)::text AS count FROM media WHERE owner_id=$1 AND status='pending'",
      [userId],
    );
    if (Number(pending.rows[0]?.count ?? 0) >= 30)
      fail("RATE_LIMITED", 429, "待上传照片过多，请先完成或重试");
    const id = randomUUID();
    const key = `private/${randomUUID()}/${id}`;
    const sha = Buffer.from(input.sha256, "hex");
    const url = await this.objects.uploadUrl(
      key,
      input.mime,
      sha.toString("base64"),
    );
    await this.database.transaction(async (client) => {
      await client.query(
        `INSERT INTO media(id,owner_id,object_key,sha256,mime,bytes)
         VALUES($1,$2,$3,$4,$5,$6)`,
        [id, userId, key, sha, input.mime, input.bytes],
      );
      await client.query(
        `INSERT INTO worker_jobs(name,payload,run_after,dedupe_key)
         VALUES('cleanup-orphan-media',$1,now()+interval '24 hours',$2)`,
        [{ mediaId: id }, id],
      );
    });
    return {
      id,
      uploadUrl: url,
      expiresAt: new Date(Date.now() + 600_000).toISOString(),
      headers: {
        "Content-Type": input.mime,
        "x-amz-checksum-sha256": sha.toString("base64"),
      },
    };
  }

  private async verifyObject(row: MediaRow): Promise<void> {
    let object;
    try {
      object = await this.objects.read(row.object_key);
    } catch {
      fail("MEDIA_NOT_READY", 409, "照片尚未上传完成");
    }
    if (!object.Body) fail("MEDIA_NOT_READY", 409, "照片文件为空");
    const hash = createHash("sha256");
    let size = 0;
    let prefix = Buffer.alloc(0);
    for await (const chunk of object.Body as AsyncIterable<Uint8Array>) {
      const bytes = Buffer.from(chunk);
      size += bytes.length;
      if (size > 20 * 1024 * 1024)
        fail("VALIDATION_ERROR", 400, "照片超过 20 MB");
      hash.update(bytes);
      if (prefix.length < 16)
        prefix = Buffer.concat([prefix, bytes.subarray(0, 16 - prefix.length)]);
    }
    if (
      size !== Number(row.bytes) ||
      !hash.digest().equals(row.sha256) ||
      !matchesMagic(row.mime, prefix)
    )
      fail("VALIDATION_ERROR", 400, "上传文件与照片授权不一致");
  }

  async complete(
    userId: string,
    mediaId: string,
    input: CompleteMediaRequest,
  ): Promise<MediaDto> {
    requireUuid(mediaId);
    guardFields(input as unknown, ["checkinId", "oneTimePlanId"]);
    if (Boolean(input.checkinId) === Boolean(input.oneTimePlanId))
      fail("VALIDATION_ERROR", 400, "请选择一条记录或一次性任务关联照片");
    if (input.checkinId) requireUuid(input.checkinId);
    if (input.oneTimePlanId) requireUuid(input.oneTimePlanId);
    const found = await this.database.query<MediaRow>(
      "SELECT * FROM media WHERE id=$1 AND owner_id=$2",
      [mediaId, userId],
    );
    const candidate = found.rows[0];
    if (!candidate || candidate.status === "deleted")
      fail("NOT_FOUND", 404, "照片不存在");
    if (candidate.status === "pending") await this.verifyObject(candidate);
    return this.database.transaction(async (client) => {
      const locked = await client.query<MediaRow>(
        "SELECT * FROM media WHERE id=$1 AND owner_id=$2 FOR UPDATE",
        [mediaId, userId],
      );
      const row = locked.rows[0];
      if (!row || row.status === "deleted")
        fail("NOT_FOUND", 404, "照片不存在");
      if (row.status === "ready") {
        if (
          row.checkin_id !== (input.checkinId ?? null) ||
          row.one_time_plan_id !== (input.oneTimePlanId ?? null)
        )
          fail("FORBIDDEN", 403, "照片已关联另一条记录");
        return dto(row);
      }
      await this.requireTarget(client, userId, input);
      const count = await client.query<{ n: string }>(
        `SELECT count(*)::text AS n FROM media
         WHERE owner_id=$1 AND status='ready' AND
           (($2::uuid IS NOT NULL AND checkin_id=$2) OR
            ($3::uuid IS NOT NULL AND one_time_plan_id=$3))`,
        [userId, input.checkinId ?? null, input.oneTimePlanId ?? null],
      );
      if (Number(count.rows[0]?.n ?? 0) >= 9)
        fail("VALIDATION_ERROR", 400, "每条记录最多添加 9 张照片");
      const updated = await client.query<MediaRow>(
        `UPDATE media SET checkin_id=$3,one_time_plan_id=$4,status='ready',completed_at=now()
         WHERE id=$1 AND owner_id=$2 RETURNING *`,
        [mediaId, userId, input.checkinId ?? null, input.oneTimePlanId ?? null],
      );
      if (input.checkinId) {
        const record = await client.query<{
          plan_id: string;
          business_date: string;
        }>("SELECT plan_id,business_date::text FROM checkins WHERE id=$1", [
          input.checkinId,
        ]);
        await appendUserChange(
          client,
          userId,
          "checkin",
          input.checkinId,
          "upsert",
          {
            planId: record.rows[0]!.plan_id,
            businessDate: record.rows[0]!.business_date,
          },
        );
      }
      return dto(updated.rows[0]!);
    });
  }

  private async requireTarget(
    client: PoolClient,
    userId: string,
    input: CompleteMediaRequest,
  ): Promise<void> {
    if (input.checkinId) {
      const record = await client.query(
        `SELECT 1 FROM checkins c JOIN plans p ON p.id=c.plan_id
         WHERE c.id=$1 AND c.owner_id=$2 AND p.status<>'deleted' FOR UPDATE OF c`,
        [input.checkinId, userId],
      );
      if (!record.rowCount) fail("NOT_FOUND", 404, "记录不存在");
    } else {
      const plan = await client.query(
        `SELECT 1 FROM plans p JOIN one_time_resolutions r ON r.plan_id=p.id
         WHERE p.id=$1 AND p.owner_id=$2 AND p.kind='one_time'
           AND p.status<>'deleted' FOR UPDATE OF p`,
        [input.oneTimePlanId, userId],
      );
      if (!plan.rowCount) fail("NOT_FOUND", 404, "一次性任务结果不存在");
    }
  }

  async remove(userId: string, mediaId: string): Promise<{ deleted: true }> {
    requireUuid(mediaId);
    await this.database.transaction(async (client) => {
      const row = await client.query<MediaRow>(
        "SELECT * FROM media WHERE id=$1 AND owner_id=$2 FOR UPDATE",
        [mediaId, userId],
      );
      if (!row.rows[0]) fail("NOT_FOUND", 404, "照片不存在");
      if (row.rows[0].status !== "deleted") {
        await client.query(
          "UPDATE media SET status='deleted',deleted_at=now() WHERE id=$1",
          [mediaId],
        );
        await client.query(
          `INSERT INTO worker_jobs(name,payload,dedupe_key)
           VALUES('cleanup-orphan-media',$1,NULL)`,
          [{ mediaId }],
        );
        if (row.rows[0].checkin_id) {
          const record = await client.query<{
            plan_id: string;
            business_date: string;
          }>("SELECT plan_id,business_date::text FROM checkins WHERE id=$1", [
            row.rows[0].checkin_id,
          ]);
          if (record.rows[0])
            await appendUserChange(
              client,
              userId,
              "checkin",
              row.rows[0].checkin_id,
              "upsert",
              {
                planId: record.rows[0].plan_id,
                businessDate: record.rows[0].business_date,
              },
            );
        }
      }
    });
    return { deleted: true };
  }

  async download(userId: string, mediaId: string): Promise<MediaDownloadDto> {
    requireUuid(mediaId);
    const found = await this.database.query<{ object_key: string }>(
      `SELECT m.object_key FROM media m
       LEFT JOIN checkins c ON c.id=m.checkin_id
       JOIN plans p ON p.id=coalesce(c.plan_id,m.one_time_plan_id)
       WHERE m.id=$1 AND m.owner_id=$2 AND m.status='ready'
         AND p.owner_id=$2 AND p.status<>'deleted'`,
      [mediaId, userId],
    );
    const key = found.rows[0]?.object_key;
    if (!key) fail("NOT_FOUND", 404, "照片不存在");
    return {
      url: await this.objects.downloadUrl(key),
      expiresAt: new Date(Date.now() + 300_000).toISOString(),
    };
  }
}
