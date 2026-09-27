import { Injectable } from "@nestjs/common";
import type {
  CreateGroupRequest,
  GroupDto,
  UpdateGroupRequest,
} from "@plan-checkin/contracts";
import { ApiConfig } from "../config.js";
import { Database } from "../database.js";
import { fail } from "../http.js";
import { appendUserChange } from "../sync/change-log.js";
import {
  cleanText,
  guardFields,
  PlanWrite,
  requireUuid,
  revision,
} from "./write.js";

interface GroupRow {
  id: string;
  name: string;
  sort_order: number;
  revision: number;
}
const dto = (row: GroupRow): GroupDto => ({
  id: row.id,
  name: row.name,
  sortOrder: row.sort_order,
  revision: row.revision,
});
const columns = "id, name, sort_order, revision";

@Injectable()
export class GroupsService {
  private readonly write: PlanWrite;
  constructor(database: Database, config: ApiConfig) {
    this.database = database;
    this.write = new PlanWrite(database, config);
  }
  private readonly database: Database;

  async list(userId: string): Promise<GroupDto[]> {
    const rows = await this.database.query<GroupRow>(
      `SELECT ${columns} FROM groups WHERE owner_id = $1 ORDER BY sort_order, created_at, id`,
      [userId],
    );
    return rows.rows.map(dto);
  }

  async create(
    userId: string,
    input: CreateGroupRequest,
    key: string,
  ): Promise<GroupDto> {
    guardFields(input, ["name", "sortOrder"]);
    const name = cleanText(input.name, 40);
    const sortOrder = input.sortOrder ?? 0;
    if (!Number.isInteger(sortOrder) || Math.abs(sortOrder) > 100000)
      fail("VALIDATION_ERROR", 400, "排序值不正确");
    try {
      return await this.write.run(
        userId,
        key,
        "group.create",
        { name, sortOrder },
        async (client) => {
          const result = await client.query<GroupRow>(
            `INSERT INTO groups (owner_id, name, sort_order) VALUES ($1, $2, $3) RETURNING ${columns}`,
            [userId, name, sortOrder],
          );
          const group = dto(result.rows[0]!);
          await appendUserChange(client, userId, "group", group.id, "upsert", {
            revision: group.revision,
          });
          return group;
        },
      );
    } catch (error) {
      if (
        typeof error === "object" &&
        error &&
        "code" in error &&
        error.code === "23505"
      )
        fail("VALIDATION_ERROR", 409, "分组名称已存在");
      throw error;
    }
  }

  async update(
    userId: string,
    id: string,
    input: UpdateGroupRequest,
    key: string,
  ): Promise<GroupDto> {
    requireUuid(id);
    guardFields(input, ["name", "sortOrder", "baseRevision"]);
    const baseRevision = revision(input.baseRevision);
    if (input.name === undefined && input.sortOrder === undefined)
      fail("VALIDATION_ERROR", 400, "至少修改一个字段");
    const name =
      input.name === undefined ? undefined : cleanText(input.name, 40);
    const sortOrder = input.sortOrder;
    if (
      sortOrder !== undefined &&
      (!Number.isInteger(sortOrder) || Math.abs(sortOrder) > 100000)
    )
      fail("VALIDATION_ERROR", 400, "排序值不正确");
    try {
      return await this.write.run(
        userId,
        key,
        "group.update",
        { id, name, sortOrder, baseRevision },
        async (client) => {
          const found = await client.query<GroupRow>(
            `SELECT ${columns} FROM groups WHERE id = $1 AND owner_id = $2 FOR UPDATE`,
            [id, userId],
          );
          if (!found.rows[0]) fail("NOT_FOUND", 404, "分组不存在");
          if (found.rows[0].revision !== baseRevision)
            fail("RULE_CHANGED", 409, "分组已在其他设备修改");
          const changed = await client.query<GroupRow>(
            `UPDATE groups SET name = $3, sort_order = $4, revision = revision + 1, updated_at = now()
           WHERE id = $1 AND owner_id = $2 RETURNING ${columns}`,
            [
              id,
              userId,
              name ?? found.rows[0].name,
              sortOrder ?? found.rows[0].sort_order,
            ],
          );
          const group = dto(changed.rows[0]!);
          await appendUserChange(client, userId, "group", group.id, "upsert", {
            revision: group.revision,
          });
          return group;
        },
      );
    } catch (error) {
      if (
        typeof error === "object" &&
        error &&
        "code" in error &&
        error.code === "23505"
      )
        fail("VALIDATION_ERROR", 409, "分组名称已存在");
      throw error;
    }
  }

  async remove(
    userId: string,
    id: string,
    baseRevision: number,
    key: string,
  ): Promise<{ deleted: true }> {
    requireUuid(id);
    revision(baseRevision);
    return this.write.run(
      userId,
      key,
      "group.delete",
      { id, baseRevision },
      async (client) => {
        const found = await client.query<GroupRow>(
          `SELECT ${columns} FROM groups WHERE id = $1 AND owner_id = $2 FOR UPDATE`,
          [id, userId],
        );
        if (!found.rows[0]) fail("NOT_FOUND", 404, "分组不存在");
        if (found.rows[0].revision !== baseRevision)
          fail("RULE_CHANGED", 409, "分组已在其他设备修改");
        const detached = await client.query<{ id: string; revision: number }>(
          "UPDATE plans SET group_id = NULL, revision = revision + 1, updated_at = now() WHERE owner_id = $1 AND group_id = $2 RETURNING id,revision",
          [userId, id],
        );
        for (const plan of detached.rows)
          await appendUserChange(client, userId, "plan", plan.id, "upsert", {
            revision: plan.revision,
          });
        await client.query(
          "DELETE FROM groups WHERE id = $1 AND owner_id = $2",
          [id, userId],
        );
        await appendUserChange(client, userId, "group", id, "delete");
        return { deleted: true as const };
      },
    );
  }
}
