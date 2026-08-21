---
name: bytedance-blade
description: "Inspect and update Blade data sync tasks via bytedcli: get task detail from a task ID, confirm source/target database and table metadata, submit update payloads with `--dry-run` / `--yes`, and troubleshoot Blade auth on `blade.byteintl.net`. Use when tasks mention Blade, `blade.byteintl.net`, data sync tasks, `des_controller`, or Blade console URLs such as `/resource/task/<id>`."
---

# bytedcli Blade

## 如何调用 bytedcli

推荐：先全局安装一次，后续所有命令直接调用 `bytedcli`。

```bash
# 推荐方式：先全局安装，后续直接调用 bytedcli
NPM_CONFIG_REGISTRY=http://bnpm.byted.org npm install -g @bytedance-dev/bytedcli@latest
bytedcli <command> [options]
```

```bash
# Fallback：仅在无法全局安装时使用 npx 临时执行
NPM_CONFIG_REGISTRY=http://bnpm.byted.org npx -y @bytedance-dev/bytedcli@latest <command> [options]
```

## When to use

- 按 Blade task ID 查看单个 data sync task 详情
- 按 owner / project / task name 分页列出 Blade tasks
- 按浏览器抓包 payload 回放或提交 Blade task update
- 从 `blade.byteintl.net/resource/task/<id>` 页面回到 CLI
- 确认任务的 `projectId`、owner、源/目标 region、db/table
- 排查 Blade 鉴权问题，尤其是 JWT 过期或页面态未准备好的场景

## 前置条件

- 使用通用调用方式：`../../invocation.md`
- Blade 国际站默认建议显式带 `--site i18n-bd`
- 如果已经知道任务在 `mycis`，可直接传 `--region mycis`，CLI 会自动映射到 `i18n-bd` 鉴权站点
- 认证优先使用 fresh `ByteCloud JWT`
- 如果需要先准备浏览器态，再执行：`bytedcli --site i18n-bd auth login --session`
- 如果只想走纯 JWT 模式，也可以直接提供 `BYTEDCLI_USER_CLOUD_JWT`

> 执行前缀见 `../../invocation.md`；下面示例直接写 `bytedcli`。

## Quick start

当前接入 `blade task get`、`blade task list` 与 `blade task update`。

```bash
# 直接按 task ID 查询
bytedcli --site i18n-bd blade task get --id sample-task-id

# 按 owner / project / task name 分页列出任务
bytedcli blade task list --region mycis --owner demo.owner --project-id demo-project-id --task-name demo

# 按创建状态 / 任务类型过滤
bytedcli blade task list --region mycis --owner demo.owner --project-id demo-project-id --create-status created --task-type data-sync

# 直接用 region 推导站点
bytedcli blade task get --region mycis --id sample-task-id

# 需要完整 raw payload 时用 --json
bytedcli --site i18n-bd --json blade task get --id sample-task-id

# 更新前必须先 dry-run 预览请求体
bytedcli blade task update --region mycis --id sample-task-id \
  --payload-file ./blade-task-update.json \
  --dry-run

# 确认 dry-run 后，再加 --yes 真正提交
bytedcli blade task update --region mycis --id sample-task-id \
  --payload-file ./blade-task-update.json \
  --yes

# 纯 JWT 模式：显式提供 fresh ByteCloud JWT
BYTEDCLI_USER_CLOUD_JWT="sample-fresh-jwt" \
  bytedcli --site i18n-bd blade task get --id sample-task-id
```

如果用户给的是 Blade 控制台 URL：

```text
https://blade.byteintl.net/resource/task/sample-task-id
```

则直接把路径里的 task ID 提出来即可：

```bash
bytedcli blade task get --region mycis --id sample-task-id
```

如果用户给的是任务列表页上下文，例如 owner / project / 模糊 task name 过滤条件：

```bash
bytedcli blade task list --region mycis --owner demo.owner --project-id demo-project-id --task-name demo
bytedcli blade task list --region mycis --owner demo.owner --project-id demo-project-id --create-status created --task-type data-sync
```

如果用户给的是编辑页 URL：

```text
https://blade.byteintl.net/resource/task/sample-task-id/edit?project=demo-project-id
```

则仍然用路径里的 task ID，更新 body 建议落到文件里再执行：

```bash
bytedcli blade task update --region mycis --id sample-task-id \
  --payload-file ./blade-task-update.json \
  --dry-run
```

## Authentication

- CLI 会优先复用 `blade.byteintl.net` 的站点 cookie，并同时携带 fresh `X-Jwt-Token`
- `--region mycis` 会自动选择 `i18n-bd` 站点来换取 JWT 与 Titan cookie
- 如果站点 cookie 不可用，会继续尝试 Titan Passport cookie
- 即使 cookie 都不可用，只要当前 `ByteCloud JWT` 仍然有效，也允许直接请求 Blade 详情接口
- 运行期已验证：**过期 JWT** 常见返回是 `code=82000`，并带 `redirect_url=/auth/api/v1/jwt`
- 因此 Blade 鉴权排查时，先看 JWT 是否 fresh，再看站点页面态是否准备好

推荐顺序：

```bash
# 推荐：先刷新页面态 + JWT
bytedcli --site i18n-bd auth login --session

# 然后查询任务
bytedcli --site i18n-bd blade task get --id sample-task-id

# 或者直接按 region 查询
bytedcli blade task get --region mycis --id sample-task-id
```

如果调用方只维护自动化 JWT，不希望依赖 session：

```bash
export BYTEDCLI_USER_CLOUD_JWT="sample-fresh-jwt"
bytedcli --site i18n-bd blade task get --id sample-task-id
```

## Output

文本模式会优先展示这些归一化字段：

- `Task ID`
- `Name`
- `Status`
- `Type`
- `Project ID`
- `Owner`
- `Region`
- `Source Region` / `Target Region`
- `Source DB` / `Source Table`
- `Target DB` / `Target Table`
- `Console URL`

`--json` 模式仍然走标准输出 envelope：`{ status, data, ... }`。以下字段约定位于 `data` 内，同时保留完整 `raw` payload，适合继续补字段映射或和浏览器抓包对齐。

`blade task get` / `blade task list` 的字段约定：

- `taskType` 已从后端原始值归一化为语义枚举（当前已验证 `data-sync`）
- `createStatus` 已从后端原始值归一化为语义枚举（当前已验证 `created`）
- 原始数值会保留在 `taskTypeCode` / `createStatusCode`
- `executeStatus` 当前仍是后端原始 code 字符串，尚未在 CLI 层语义化
- 对既有 `blade task get --json` 消费方，`data.taskType` 现在是语义枚举；若只需要当前已验证的 Blade numeric mapping，可读 `data.taskTypeCode`（当前 `data-sync -> 2`）。原始字符串形态如 `data_sync` 当前不再单独保留

`blade task list` 的输出约定：

- 返回 `tasks` 与 `page_info`
- `tasks[].basic_info` 会归一化为顶层 `id` / `name` / `owner` / `projectId` / `sourceDb` / `targetDb`
- 顶层 `create_status` / `execute_status` 会归一化为 `createStatus` / `executeStatus`
- 当前已验证的公共枚举是 `--create-status created` 与 `--task-type data-sync`
- 原始数值会保留在 `createStatusCode` / `taskTypeCode`

`blade task update` 的输出约定：

- `--dry-run`：输出 `dry_run: true` 和 `request`
- `--yes`：输出 `request` 与后端 `response`

## Notes

- `--json` 是全局参数，必须放在 `blade` 前面，例如 `bytedcli --site i18n-bd --json blade task get --id sample-task-id`
- 当前内置 region 只支持 `mycis`
- 当前支持 `task get`、`task list` 与 `task update`；还没有 search / create / delete 能力
- `task update` 是显式写操作：必须先 `--dry-run`，确认后再 `--yes`
- parser 会优先读取 `data_sync_task.basic_info`、`source_resource_config`、`target_resource_config` 的显式路径字段；如果某个任务仍有字段遗漏，优先查看 `raw`

## References

- `references/blade.md`
- `../../invocation.md`
