# Blade Notes

## Command surface

当前 Blade domain 提供三个 task 命令：

```bash
bytedcli --site i18n-bd blade task get --id sample-task-id
bytedcli blade task list --region mycis --owner demo.owner --project-id demo-project-id --task-name demo
bytedcli blade task list --region mycis --owner demo.owner --project-id demo-project-id --create-status created --task-type data-sync
bytedcli blade task get --region mycis --id sample-task-id
bytedcli blade task update --region mycis --id sample-task-id --payload-file ./blade-task-update.json --dry-run
```

## URL to CLI

Blade 控制台 URL 常见格式：

```text
https://blade.byteintl.net/resource/task/<taskId>
```

CLI 参数映射：

- 路径里的 `<taskId>` 对应 `--id`
- `mycis` 任务可直接传 `--region mycis`，CLI 会自动映射到 `i18n-bd`
- 未显式传 region 时，站点默认建议 `--site i18n-bd`
- 列表过滤条件映射为 `--task-name` / `--owner` / `--project-id` / `--create-status` / `--task-type` / `--page` / `--page-size`
- 编辑页或抓包回放场景，更新 body 建议放到 `--payload-file`

示例：

```bash
bytedcli --site i18n-bd blade task get --id sample-task-id
bytedcli blade task list --region mycis --owner demo.owner --project-id demo-project-id --task-name demo
bytedcli blade task list --region mycis --owner demo.owner --project-id demo-project-id --create-status created --task-type data-sync
bytedcli blade task get --region mycis --id sample-task-id
bytedcli blade task update --region mycis --id sample-task-id --payload-file ./blade-task-update.json --dry-run
```

## List tasks

- `blade task list` 对应 `POST /v1/des_controller/data_sync_tasks/list`
- 请求体中的分页字段固定映射为 `page.page_num` / `page.page_size`
- 已验证 `--task-name`、`--owner`、`--project-id`、`--create-status`、`--task-type` 可直接覆盖浏览器列表页常见查询
- 当前已验证的公共枚举是 `--create-status created` 与 `--task-type data-sync`

示例：

```bash
bytedcli blade task list --region mycis --owner demo.owner --project-id demo-project-id
bytedcli blade task list --region mycis --owner demo.owner --project-id demo-project-id --create-status created --task-type data-sync
bytedcli blade task list --region mycis --task-name demo --page 1 --page-size 20
```

## Update task

- `blade task update` 对应 `PUT /v1/des_controller/data_sync_tasks/<taskId>`
- 更新 payload 建议直接保存浏览器抓包里的 JSON body，再通过 `--payload-file` 传入
- 这是写操作：必须先 `--dry-run`，确认后再用 `--yes`

推荐顺序：

```bash
bytedcli blade task update --region mycis --id sample-task-id \
  --payload-file ./blade-task-update.json \
  --dry-run

bytedcli blade task update --region mycis --id sample-task-id \
  --payload-file ./blade-task-update.json \
  --yes
```

## Authentication summary

- 首选：`blade.byteintl.net` 站点 cookie + fresh `ByteCloud JWT`
- `--region mycis` 会自动走 `i18n-bd` 站点获取鉴权材料
- 兜底：Titan Passport cookie
- 无 cookie 也可直接请求，但前提是 JWT 仍然有效
- 如果命中 `code=82000` 或 `redirect_url=/auth/api/v1/jwt`，优先判断 JWT 是否过期

建议命令：

```bash
bytedcli --site i18n-bd auth login --session
bytedcli --site i18n-bd blade task get --id sample-task-id
```

纯 JWT 自动化场景：

```bash
export BYTEDCLI_USER_CLOUD_JWT="sample-fresh-jwt"
bytedcli --site i18n-bd blade task get --id sample-task-id
```

## Output

`blade task get` 与 `blade task list` 的文本模式 / JSON 顶层会优先暴露这些字段：

- `id`
- `name`
- `status`
- `taskType`
- `projectId`
- `owner`
- `region`
- `sourceRegion`
- `targetRegion`
- `sourceDb`
- `sourceTable`
- `targetDb`
- `targetTable`
- `consoleUrl`

`--json` 模式仍然走标准输出 envelope：`{ status, data, ... }`。下面这些字段约定位于 `data` 内；完整后端响应仍保留在 `raw` 里。

字段语义说明：

- `taskType` 已从后端原始值归一化为语义枚举（当前已验证 `data-sync`）
- `createStatus` 已从后端原始值归一化为语义枚举（当前已验证 `created`）
- 原始数值会保留在 `taskTypeCode` / `createStatusCode`
- `executeStatus` 当前仍是后端原始 code 字符串，尚未在 CLI 层语义化
- 对既有 `blade task get --json` 消费方，`data.taskType` 现在是语义枚举；若只需要当前已验证的 Blade numeric mapping，可读 `data.taskTypeCode`（当前 `data-sync -> 2`）。原始字符串形态如 `data_sync` 当前不再单独保留

`blade task list` 额外会暴露：

- `page_info.total_count`
- `page_info.page_num`
- `page_info.page_size`
- `createStatus`
- `createStatusCode`
- `executeStatus`
- `taskTypeCode`

`blade task update` 的输出约定：

- `--dry-run`：返回 `dry_run: true` 与 `request`
- `--yes`：返回 `request` 与后端 `response`
