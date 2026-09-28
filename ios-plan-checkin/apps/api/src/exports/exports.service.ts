import { createHash } from "node:crypto";
import { Injectable } from "@nestjs/common";
import type {
  DataExportDto,
  DataExportDownloadDto,
} from "@plan-checkin/contracts";
import { Database } from "../database.js";
import { fail } from "../http.js";
import { ObjectStore } from "../media/object-store.js";

interface ExportRow {
  id: string;
  status: DataExportDto["status"];
  created_at: Date | string;
  completed_at: Date | string | null;
  expires_at: Date | string | null;
  file_bytes: string | number | null;
  file_count: number | null;
  error_code: string | null;
  object_key: string | null;
  file_sha256: Buffer | null;
}
const dto = (row: ExportRow): DataExportDto => ({
  id: row.id,
  status: row.status,
  createdAt: new Date(row.created_at).toISOString(),
  completedAt: row.completed_at
    ? new Date(row.completed_at).toISOString()
    : null,
  expiresAt: row.expires_at ? new Date(row.expires_at).toISOString() : null,
  fileBytes: row.file_bytes === null ? null : Number(row.file_bytes),
  fileCount: row.file_count,
  errorCode: row.error_code,
});
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

@Injectable()
export class ExportsService {
  constructor(
    private readonly database: Database,
    private readonly objects: ObjectStore,
  ) {}

  async create(userId: string, idempotencyKey: string): Promise<DataExportDto> {
    if (!uuid.test(idempotencyKey ?? ""))
      fail("VALIDATION_ERROR", 400, "缺少有效的幂等键");
    return this.database.transaction(async (client) => {
      await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [
        userId,
      ]);
      const hash = createHash("sha256").update("data-export-v1").digest();
      const previous = await client.query<{
        request_hash: Buffer;
        response_json: DataExportDto;
      }>(
        "SELECT request_hash,response_json FROM idempotency_keys WHERE user_id=$1 AND key=$2 AND expires_at>now()",
        [userId, idempotencyKey],
      );
      if (previous.rows[0]) {
        if (!Buffer.from(previous.rows[0].request_hash).equals(hash))
          fail("IDEMPOTENCY_KEY_REUSED", 409, "幂等键已用于其他请求");
        return previous.rows[0].response_json;
      }
      const active = await client.query<ExportRow>(
        "SELECT * FROM data_exports WHERE user_id=$1 AND status IN ('queued','running') ORDER BY created_at DESC LIMIT 1",
        [userId],
      );
      let row = active.rows[0];
      if (!row) {
        const count = await client.query<{ n: string }>(
          "SELECT count(*) AS n FROM data_exports WHERE user_id=$1 AND created_at>now()-interval '24 hours'",
          [userId],
        );
        if (Number(count.rows[0]?.n) >= 5)
          fail("RATE_LIMITED", 429, "今天的导出次数已达上限，请明天再试");
        const created = await client.query<ExportRow>(
          "INSERT INTO data_exports(user_id) VALUES($1) RETURNING *",
          [userId],
        );
        row = created.rows[0];
        if (!row) throw new Error("EXPORT_CREATE_FAILED");
        await client.query(
          "INSERT INTO worker_jobs(name,payload,dedupe_key) VALUES('prepare-data-export',jsonb_build_object('exportId',$1::text),$1::text)",
          [row.id],
        );
      }
      const response = dto(row);
      await client.query(
        "INSERT INTO idempotency_keys(user_id,key,request_hash,status_code,response_json,expires_at) VALUES($1,$2,$3,200,$4,now()+interval '24 hours')",
        [userId, idempotencyKey, hash, response],
      );
      return response;
    });
  }

  async list(userId: string): Promise<DataExportDto[]> {
    const result = await this.database.query<ExportRow>(
      "SELECT * FROM data_exports WHERE user_id=$1 ORDER BY created_at DESC LIMIT 10",
      [userId],
    );
    return result.rows.map((row) =>
      dto(
        row.status === "ready" &&
          row.expires_at &&
          new Date(row.expires_at).getTime() <= Date.now()
          ? { ...row, status: "expired" }
          : row,
      ),
    );
  }

  async get(userId: string, exportId: string): Promise<DataExportDto> {
    if (!uuid.test(exportId)) fail("NOT_FOUND", 404, "导出任务不存在");
    const result = await this.database.query<ExportRow>(
      "SELECT * FROM data_exports WHERE id=$1 AND user_id=$2",
      [exportId, userId],
    );
    if (!result.rows[0]) fail("NOT_FOUND", 404, "导出任务不存在");
    const row = result.rows[0];
    return dto(
      row.status === "ready" &&
        row.expires_at &&
        new Date(row.expires_at).getTime() <= Date.now()
        ? { ...row, status: "expired" }
        : row,
    );
  }

  async download(
    userId: string,
    exportId: string,
    requestId: string,
  ): Promise<DataExportDownloadDto> {
    if (!uuid.test(exportId)) fail("NOT_FOUND", 404, "导出文件不存在");
    const result = await this.database.query<ExportRow>(
      `SELECT e.* FROM data_exports e JOIN users u ON u.id=e.user_id
       WHERE e.id=$1 AND e.user_id=$2 AND u.status='active'`,
      [exportId, userId],
    );
    const row = result.rows[0];
    if (
      !row ||
      row.status !== "ready" ||
      !row.object_key ||
      !row.file_sha256 ||
      !row.file_bytes ||
      !row.expires_at ||
      new Date(row.expires_at).getTime() <= Date.now()
    )
      fail("NOT_FOUND", 404, "导出文件尚未生成或已过期");
    const url = await this.objects.downloadUrl(row.object_key);
    await this.database.query(
      "INSERT INTO data_export_access(export_id,user_id,request_id) VALUES($1,$2,$3)",
      [exportId, userId, requestId.slice(0, 100)],
    );
    return {
      url,
      expiresAt: new Date(Date.now() + 300_000).toISOString(),
      sha256: Buffer.from(row.file_sha256).toString("hex"),
      bytes: Number(row.file_bytes),
    };
  }
}
