# Safe TCS — Project, Trace & Object ID Operations

Query TCS project metadata, related project list, trace information and review object IDs, and perform limited write operations (such as ProductType migration and queue cloning) on the TCS platform via `bytedcli safe tcs`.

## Plugin source

The `safe tcs task get-send-template`, `safe tcs task send`, and `safe tcs task list-send-history` commands are provided by the **safecli** plugin (repo `ies_safety/safecli`), not the bytedcli core binary. All other `safe tcs project` / `safe tcs trace` subcommands are built into bytedcli core and need no plugin. Install the plugin when you need any of the plugin-provided commands:

```bash
bytedcli self plugin install --repo ies_safety/safecli
bytedcli self plugin doctor --name safecli
```

If `task get-send-template`, `task send`, or `task list-send-history` reports "unknown command", the safecli plugin is not installed or is disabled.

## Authentication

Requires Safe authentication. See the parent skill `bytedance-safe` for login instructions:

```bash
bytedcli auth login --session
bytedcli safe login
```

`safe tcs jimu get`, `safe tcs project get-tpl`, and `safe tcs task ...` are provided by the safecli plugin (repo `ies_safety/safecli`, bytedcli `>=0.88.0`). Install it with `bytedcli self plugin install --repo ies_safety/safecli` if those commands are unknown.

## Commands

> Jimu template commands are provided by the safecli plugin.

### project

```bash
# Get TCS project by project id
bytedcli safe tcs project get --project-id <project-id>

# Get template info for a TCS project (safecli plugin)
bytedcli safe tcs project get-tpl --project-id example-project-id

# Explicit JSON output
bytedcli --json safe tcs project get --project-id <project-id>

# Update a TCS project's ProductType by migrating it from a target project
bytedcli safe tcs project update-product-type --project-id <project-id> --target-project-id <target-project-id>

# Explicit JSON output
bytedcli --json safe tcs project update-product-type --project-id <project-id> --target-project-id <target-project-id>

# List related projects that share with the given TCS project id
bytedcli safe tcs project get-related-project-list --shared-project-id <shared-project-id>

# Explicit JSON output
bytedcli --json safe tcs project get-related-project-list --shared-project-id <shared-project-id>

# Set the share split allocation for a TCS shared project (use JSON string or @file)
bytedcli safe tcs project set-shared-project-split --shared-project-id <shared-project-id> --split-list <json|@file> [--action <number>] [--yes]

# Explicit JSON output (automation must include --yes)
bytedcli --json safe tcs project set-shared-project-split --shared-project-id <shared-project-id> --split-list <json|@file> [--action <number>] --yes

# Query object IDs that entered review for a project within a time range
bytedcli safe tcs project query-object-ids --project-id <project-id> --start <time> --end <time>

# Explicit JSON output with a custom limit
bytedcli --json safe tcs project query-object-ids --project-id <project-id> --start <time> --end <time> --limit 50
```

### task

Provided by the **safecli** plugin (see Plugin source above). Manual send-task lifecycle: pull the lark template, submit a filled template as a send-task, and review historical send-task records.

```bash
# Get the manual send-task lark template URL for a TCS project
bytedcli safe tcs task get-send-template --project-id <project-id>

# Explicit JSON output
bytedcli --json safe tcs task get-send-template --project-id <project-id>

# Submit a manual send-task using a filled lark template URL for a TCS project
bytedcli safe tcs task send --project-id <project-id> --lark-url <lark-url>

# Explicit JSON output
bytedcli --json safe tcs task send --project-id <project-id> --lark-url <lark-url>

# List historical manual send-task records for a TCS project
bytedcli safe tcs task list-send-history --project-id <project-id> [--page-no <n>] [--page-size <n>]

# Explicit JSON output
bytedcli --json safe tcs task list-send-history --project-id <project-id> --page-no 1 --page-size 10
```

### trace

```bash
# Get TCS trace of a project by project id
bytedcli safe tcs trace get --project-id <project-id>

# Explicit JSON output
bytedcli --json safe tcs trace get --project-id <project-id>
```

### jimu

```bash
# Get a Jimu template via the unified API (safecli plugin)
bytedcli safe tcs jimu get --tpl-id demo-tpl-id
bytedcli safe tcs jimu get --tpl-id demo-tpl-id --version 3
bytedcli --json safe tcs jimu get --tpl-id demo-tpl-id
```

### task

```bash
# Manual review SendTCS task helper commands (safecli plugin)
bytedcli safe tcs task get-send-template --project-id example-project-id
bytedcli safe tcs task send --project-id example-project-id --lark-url https://example.com/docs/demo
bytedcli safe tcs task list-send-history --project-id example-project-id --page 1 --page-size 10
bytedcli --json safe tcs task get-send-template --project-id example-project-id
```

## Options

### project get / trace get

| Option              | Default    | Description    |
| ------------------- | ---------- | -------------- |
| `--project-id <id>` | (required) | TCS project id |

### project update-product-type

| Option                     | Default    | Description                                                                   |
| -------------------------- | ---------- | ----------------------------------------------------------------------------- |
| `--project-id <id>`        | (required) | Source TCS project id whose ProductType will be updated                       |
| `--target-project-id <id>` | (required) | Target TCS project id whose ProductType will be applied to the source project |

### project get-related-project-list

| Option                     | Default    | Description                                                        |
| -------------------------- | ---------- | ------------------------------------------------------------------ |
| `--shared-project-id <id>` | (required) | Shared TCS project id whose related project list will be retrieved |

### project set-shared-project-split

| Option                     | Default    | Description                                                                                                                                                                                                                                                                                            |
| -------------------------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `--shared-project-id <id>` | (required) | Shared TCS project id whose split allocation will be set                                                                                                                                                                                                                                               |
| `--split-list <json>`      | (required) | JSON string of split items, or `@/path/to/file.json`; each item: `{ projectId, sharedTaskPercent, isSupportProject?, action?, projectVerifyType? }`. `projectVerifyType` is optional and should come from the child queue's `safe tcs project get` field `project_verify_type`; omit when unavailable. |
| `--action <number>`        | `1`        | Outer action value sent to the upstream API; per-item `action` defaults to this when omitted                                                                                                                                                                                                           |
| `-y`, `--yes`              | (off)      | Skip the interactive preview & confirm step (use in automation; required when running with `--json` or non-TTY shell)                                                                                                                                                                                  |

### project query-object-ids

| Option              | Default    | Description                                                                                     |
| ------------------- | ---------- | ----------------------------------------------------------------------------------------------- |
| `--project-id <id>` | (required) | TCS project id                                                                                  |
| `--start <time>`    | (required) | Start time of the query window                                                                  |
| `--end <time>`      | (required) | End time of the query window                                                                    |
| `--limit <n>`       | `50`       | Max object IDs to return; must be a positive integer and cannot exceed backend-supported limits |

### task get-send-template

Provided by the **safecli** plugin (see Plugin source above).

| Option              | Default    | Description                                                                                          |
| ------------------- | ---------- | ---------------------------------------------------------------------------------------------------- |
| `--project-id <id>` | (required) | TCS project (queue) id; positive integer, e.g. `100`. CLI passes it through to backend `project_id`. |

### task send

Provided by the **safecli** plugin (see Plugin source above). High-risk write operation — the plugin is responsible for any preview / confirm gate.

| Option              | Default    | Description                                                                                                                                                  |
| ------------------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `--project-id <id>` | (required) | TCS project (queue) id; positive integer, e.g. `100`. CLI passes it through to backend `project_id`.                                                         |
| `--lark-url <url>`  | (required) | `http(s)://` lark sheet URL whose rows have been filled per the template returned by `task get-send-template`, e.g. `https://example.feishu.cn/sheets/demo`. |

### task list-send-history

Provided by the **safecli** plugin (see Plugin source above).

| Option              | Default    | Description                                                                                          |
| ------------------- | ---------- | ---------------------------------------------------------------------------------------------------- |
| `--project-id <id>` | (required) | TCS project (queue) id; positive integer, e.g. `100`. CLI passes it through to backend `project_id`. |
| `--page-no <n>`     | `1`        | 1-based page number; positive integer. Mapped to backend `page_no`.                                  |
| `--page-size <n>`   | `10`       | Records per page; positive integer. Mapped to backend `page_size`.                                   |

## Output Modes

- **默认文本**: `project get`、`project update-product-type`、`project get-related-project-list`、`project set-shared-project-split` 与 `trace get` 会输出可读文本；对象结果会渲染成 KV 表。`project query-object-ids` 会先输出命中数量，再逐行输出 object ID。
- **显式 JSON (`--json`)**: 在 `data` 字段返回结构化 JSON，适合脚本消费。

## Common Patterns

**Inspect a project's metadata then pull its trace:**

```bash
bytedcli safe tcs project get --project-id example-project-id
bytedcli safe tcs trace get --project-id example-project-id
```

**Template -> Fill -> Send -> History (safecli plugin required):**

```bash
bytedcli self plugin install --repo ies_safety/safecli
bytedcli self plugin doctor --name safecli

# 1) Pull the lark template URL for the queue
bytedcli safe tcs task get-send-template --project-id 100

# 2) Fill the returned lark sheet, then submit it back
bytedcli safe tcs task send --project-id 100 --lark-url https://example.feishu.cn/sheets/demo-send-task

# 3) Review historical send records
bytedcli safe tcs task list-send-history --project-id 100 --page-no 1 --page-size 10
```

> `task send` 是由 **safecli** plugin 提供的高危写命令；preview / confirm / `--yes` 等护栏由插件实现，bytedcli core 只负责在 skill 文档中声明来源与用法。

**Update a project's ProductType to match another project:**

```bash
bytedcli safe tcs project update-product-type \
  --project-id example-source-id \
  --target-project-id example-target-id
```

**List related projects that share with a given TCS project id:**

```bash
bytedcli safe tcs project get-related-project-list \
  --shared-project-id example-shared-id
```

**Set split allocation for a shared project (JSON inline):**

```bash
bytedcli safe tcs project set-shared-project-split \
  --shared-project-id example-shared-id \
  --split-list '[{"projectId":"example-p1","sharedTaskPercent":0.8},{"projectId":"example-p2","sharedTaskPercent":0.2}]'
```

**Set split allocation from file:**

```bash
bytedcli safe tcs project set-shared-project-split \
  --shared-project-id example-shared-id \
  --split-list @/path/to/splits.json \
  --action 1
```

**Clone a TCS project (queue) to a new queue:**

```bash
# Clone as a regular queue
bytedcli safe tcs project clone --project-id 100000

# Clone as a crowd-source (hands) queue (must specify --group-name)
bytedcli safe tcs project clone --project-id 100000 --is-hands-project --group-name "demo-group"

# Clone as a shared (parent) queue
bytedcli safe tcs project clone --project-id 100000 --is-shared-project

# Clone with a custom title (optional; passed through to clone_project)
bytedcli safe tcs project clone --project-id 100000 --is-hands-project --group-name "demo-group" --title "demo-hands"
```

> `--title <title>` 可选；用户明确提供「克隆后队列名称」时透传，未提及则不写入请求体，沿用后端默认命名。
> `--group-name <name>` 透传到后端 `belongGroupName`；当 `--is-hands-project=true` 时必须指定。取值参考飞书表格 <https://bytedance.larkoffice.com/wiki/TZoBw7G72iaX7RkTtoXcxNvSnif?table=tblH8ScsAFYsdk02&view=vewdWVvBH5>。
> 缺省 `--group-name` 时：交互式 TTY 会追问一行；`--json` 或非 TTY 模式直接抛 `SAFE_INPUT_ERROR`，自动化场景必须显式追加 `--group-name`。

**High-risk write commands — CLI auto preview & require confirmation:**

`set-shared-project-split` 与 `update-product-type` 是高危写命令，CLI handler 层会自动拦截：拉取队列名称、把改动以中文 preview 渲染到 stderr，然后通过 readline 单行提示等用户输入 `y` / `yes`（忽略大小写）才真正调用上游 API。任何 skill / MCP / shell 调用都会走同一道护栏，无需 Agent 重复实现。

行为约定：

- 交互式 TTY 未带 `--yes` → 打印 preview，readline 单行提示等待确认；用户输入 `y` / `yes` 之外的内容时 CLI 抛 `SAFE_INPUT_ERROR`（message：`操作已取消`）。
- `--json` 模式或非 TTY 未带 `--yes` → CLI 立即抛 `SAFE_INPUT_ERROR`（message：`高危操作需要交互确认，非交互/JSON 模式请追加 --yes 跳过提示`），避免脚本死锁；自动化调用必须显式追加 `--yes`。
- name lookup 失败时该条目降级为 `<id> (name unavailable)`，preview 仍会打印并继续要求确认。

CLI 实际打印的 preview 模板：

```text
# set-shared-project-split
本次提交的分流配置是：
• 父队列：example-shared-id+父队列名称
• 子队列 example-p1+子队列名称：80%
• 子队列 example-p2+子队列名称：20%

# update-product-type
本次即将执行高危操作：迁移 TCS 队列 ProductType
• 源队列（被修改）：example-source-id+源队列名称
• 目标队列（提供 ProductType）：example-target-id+目标队列名称
```

调用示例：

```bash
# 交互式：CLI 自动 preview 并等待用户确认
bytedcli safe tcs project set-shared-project-split \
  --shared-project-id example-shared-id \
  --split-list '[{"projectId":"example-p1","sharedTaskPercent":0.8},{"projectId":"example-p2","sharedTaskPercent":0.2}]'

# 自动化 / JSON 模式：必须显式追加 --yes 跳过 preview
bytedcli --json safe tcs project set-shared-project-split \
  --shared-project-id example-shared-id \
  --split-list @/path/to/splits.json \
  --yes

# update-product-type 同样受拦截
bytedcli safe tcs project update-product-type \
  --project-id example-source-id \
  --target-project-id example-target-id

bytedcli --json safe tcs project update-product-type \
  --project-id example-source-id \
  --target-project-id example-target-id \
  --yes
```

**Query object IDs that entered review in a time window:**

```bash
bytedcli safe tcs project query-object-ids \
  --project-id example-project-id \
  --start 2026-01-01T00:00:00Z \
  --end 2026-01-01T01:00:00Z \
  --limit 50
```

## References

- [invocation.md](../invocation.md) — bytedcli 通用调用方式
- [tcs-api.md](references/tcs-api.md) — 命令与 API 映射
- [troubleshooting.md](../troubleshooting.md) — 常见问题与处理
- [tcs-project-switch.md](tcs-project-switch.md) — 队列用工模式切换（主审 → 众包 / 盲审）编排

## Reference: tcs-api

## TCS API 与 CLI 命令映射

`bytedcli safe tcs` 下的命令会按不同子命令访问不同 host：

- `project get`：走 Safe Queue Center（`https://safe.bytedance.net`），依赖 MPSSO 登录态
- `project update-product-type`：走 Safe Spring Meta（`https://safe.bytedance.net`），依赖 MPSSO 登录态
- `project get-related-project-list`：走 Safe Queue Center Split（`https://safe.bytedance.net`），依赖 MPSSO 登录态
- `project set-shared-project-split`：走 Safe Queue Center Split（`https://safe.bytedance.net`），依赖 MPSSO 登录态
- `project clone`：走 Safe Spring Meta（`https://safe.bytedance.net`），依赖 MPSSO 登录态
- `trace get`：走 TCS（`https://tcs.bytedance.net`），依赖 MPSSO 登录态

## 命令 ↔ API 映射

| CLI 命令                                                                                          | HTTP 方法 | 路径                                                                                                  |
| ------------------------------------------------------------------------------------------------- | --------- | ----------------------------------------------------------------------------------------------------- |
| `bytedcli safe tcs project get --project-id <id>`                                                 | `GET`     | `https://safe.bytedance.net/api/queue-center/api/v1/queue_manage/get_queue_detail?id=<id>`            |
| `bytedcli safe tcs project update-product-type --project-id <id> --target-project-id <target-id>` | `POST`    | `https://safe.bytedance.net/api/spring/agw_bff/queue_center/update_project_product_type`              |
| `bytedcli safe tcs project get-related-project-list --shared-project-id <id>`                     | `GET`     | `https://safe.bytedance.net/api/queue-center/api/split/get_related_project_list?sharedProjectId=<id>` |
| `bytedcli safe tcs project set-shared-project-split --shared-project-id <id> --split-list <json>` | `PUT`     | `https://safe.bytedance.net/api/queue-center/api/split/set_shared_project_split`                      |
| `bytedcli safe tcs project clone --project-id <id>`                                               | `POST`    | `https://safe.bytedance.net/api/spring/agw_bff/clone_project`                                         |
| `bytedcli safe tcs trace get --project-id <id>`                                                   | `GET`     | `/api/v2/projects/<id>/trace`                                                                         |

其中 `<id>` 会在 API 层通过 URL 编码后放到 query 参数中（`project get` 使用 `id`、`project get-related-project-list` 使用 `sharedProjectId`）；`project update-product-type` 与 `project set-shared-project-split` 通过 JSON body 传递。

## 请求

### project get（Safe Queue Center）

请求使用 `safeGet()`，会附带 MPSSO cookie，并包含 Safe 域常用 header（如 tenant/business）。响应为 `{ code, message, data }`，CLI 会自动解包返回 `data`。

### project update-product-type（Safe Spring Meta）

请求使用 `safePost()`，同样会附带 MPSSO cookie 与 Safe 域常用 header；body 采用 snake_case 命名：

```json
{
  "projectId": "<source-project-id>",
  "targetProjectId": "<target-project-id>"
}
```

响应为 `{ code, message, data }`，CLI 会自动解包返回 `data`；非零 `code` 会抛出 `SAFE_API_ERROR`。

### project get-related-project-list（Safe Queue Center Split）

请求使用 `safeGet()`，会附带 MPSSO cookie；`sharedProjectId` 以 query 参数传递。响应为 `{ code, message, data }`，CLI 会自动解包返回 `data`（包含分流后的相关 project 列表，字段由服务端决定）。

### project set-shared-project-split（Safe Queue Center Split）

请求方法 `PUT`，使用 `safePut()`，会附带 MPSSO cookie 与 Safe 域常用 header。请求体 JSON 示例：

```json
{
  "sharedProjectId": "<shared-project-id>",
  "action": 1,
  "splitList": [
    {
      "projectId": "<p1>",
      "sharedTaskPercent": 0.8,
      "isSupportProject": false,
      "action": 1,
      "projectVerifyType": 0
    },
    { "projectId": "<p2>", "sharedTaskPercent": 0.2, "isSupportProject": false, "action": 1 }
  ]
}
```

字段说明：

- `sharedProjectId` 必填，为分流共享 project id。
- `splitList` 必填，且为非空对象数组。
- 每个 item：
  - `projectId` 必填。
  - `sharedTaskPercent` 必填，取值范围 `[0, 1]`。
  - `isSupportProject` 可选，默认 `false`。
  - `action` 可选，默认取外层 `action`。
  - `projectVerifyType` 可选，整数；用于显式透传该子队列的 `project_verify_type`。值来源于对应子队列的 `bytedcli safe tcs project get --project-id <id>` 返回字段 `project_verify_type`，无法获取时不要填写（缺省时不写入 body）。
- 外层 `action` 默认 `1`，表示发送给上游 API 的 action 值；单个 item 未显式提供 `action` 时，回落到外层 `action`。

输出说明：响应为 `{ code, message, data }`，成功时 CLI 会返回服务端 `data` 字段；默认文本模式下渲染为 KV 表，`-j/--json` 输出标准 JSON；非零 `code` 会抛出 `SAFE_API_ERROR`。

#### Pre-execution checks（高危写操作）

`set-shared-project-split` 是高危写操作。CLI handler 会在调用上游 API 之前自动完成 name lookup、向 stderr 渲染中文 preview 并要求用户确认：

```
本次提交的分流配置是：

• 父队列：<sharedProjectId>+<父队列名称>
• 子队列 <projectId>+<子队列名称>：<percent>%
```

行为约定：

- 交互式终端：默认渲染上述 preview 后通过 readline 单行提示等用户输入 `y` / `yes`（忽略大小写）才继续，其它输入抛 `SAFE_INPUT_ERROR`（message：`操作已取消`）。
- `--json` 或非 TTY（如脚本管道、Skill 调用）：必须显式追加 `--yes` / `-y` 跳过确认，否则抛 `SAFE_INPUT_ERROR`（message：`高危操作需要交互确认，非交互/JSON 模式请追加 --yes 跳过提示`），避免脚本死锁。
- 任意 name lookup 失败：该队列在 preview 中渲染为 `<id> (name unavailable)`，仍会照常 prompt，不会跳过确认。

`update-product-type` 行为一致：handler 会并行查询源 / 目标队列名称并渲染 preview，再决定是否调用上游接口；自动化场景同样需要 `--yes`。

### project clone（Safe Spring Meta）

请求方法 `POST`，使用 `safePost()`，会附带 MPSSO cookie 与 Safe 域常用 header。请求体 JSON 示例：

```json
{
  "projectId": "12345",
  "isHandsProject": true,
  "isSharedProject": false,
  "title": "demo-hands",
  "belongGroupName": "demo-group"
}
```

字段说明：

- `projectId` 必填，CLI 接收字符串形式的 `--project-id`，handler 与 API 层都校验为正整数字符串（`/^\d+$/` 且非全 0）后**保持 string 透传**进入 body，避免 `Number(...)` 截断超过 `Number.MAX_SAFE_INTEGER` 的 id；空字符串、非数字、非正整数都会抛 `AppError({ code: "SAFE_INPUT_ERROR" })`。
- `isHandsProject` 可选，对应 CLI 的 `--is-hands-project`；标志位省略时不写入 body。
- `isSharedProject` 可选，对应 CLI 的 `--is-shared-project`（body 字段使用后端 `Shared` 拼写）；标志位省略时不写入 body。与 `--is-hands-project` 互斥，同时设置时 CLI 抛 `SAFE_INPUT_ERROR`。
- `title` 可选，对应 CLI 的 `--title <title>`；handler / API 层会做 `trim`，结果非空才写入 body。未传 / 空白字符串视为不写入，沿用后端默认命名。
- `belongGroupName` 可选，对应 CLI 的 `--group-name <name>`；handler / API 层会做 `trim`，结果非空才写入 body。当 `--is-hands-project=true` 但未传 `--group-name` 时：交互式 TTY 会从 stderr 提示并读取一行 stdin；`--json` 或非 TTY 模式直接抛 `SAFE_INPUT_ERROR`。取值参考飞书表格 <https://bytedance.larkoffice.com/wiki/TZoBw7G72iaX7RkTtoXcxNvSnif?table=tblH8ScsAFYsdk02&view=vewdWVvBH5>。

响应为 `{ code, message, data }`，CLI 会自动解包返回 `data`，结构通常包含 `destProject` / `origionProject` 两个对象；非零 `code` 会抛出 `SAFE_API_ERROR`。

### trace get（TCS）

请求使用下列 header：

```
Accept: application/json
Cookie: <MPSSO session, 由 safe login 生成>
```

trace 响应若含 `{ "data": {...} }` envelope，CLI 的 parser 会自动解包；未知字段默认兜底为 `""`。

## project get 输出

project get 的 `data` 字段为“队列详情”对象，字段可能随服务端变化。CLI 文本模式会以通用 KV 表展示所有字段；`--json` 下会原样输出该对象。

| CLI 字段      | API 原始字段  | 说明                               |
| ------------- | ------------- | ---------------------------------- |
| `id`          | `id`          | project id（支持 string / number） |
| `name`        | `name`        | project 名称                       |
| `description` | `description` | 描述                               |
| `ownerId`     | `owner_id`    | 所有者 id                          |
| `createdAt`   | `created_at`  | 创建时间                           |
| `updatedAt`   | `updated_at`  | 更新时间                           |

## project update-product-type 输出

`update-product-type` 的 `data` 字段结构由服务端决定。默认文本模式会把对象结果渲染成 KV 表；JSON 模式下会原样输出，`status` 为 `success` 表示写操作被接受。

## project get-related-project-list 输出

`get-related-project-list` 的 `data` 字段为分流相关 project 列表对象（通常包含 `list` 等字段，随服务端变化）。默认文本模式会以通用 KV 表展示顶层字段；`--json` 下会原样输出对象，便于脚本进一步解析每个相关 project。

## project clone 输出

`project clone` 的 `data` 字段结构通常包含 `destProject`（克隆后的新队列）与 `origionProject`（源队列摘要）两个对象，具体字段由服务端决定。默认文本模式会把对象结果渲染成 KV 表；`--json` 下会原样输出，`status` 为 `success` 表示克隆请求被接受。

## `TcsTrace` 字段

| CLI 字段    | API 原始字段 | 说明                             |
| ----------- | ------------ | -------------------------------- |
| `id`        | `id`         | trace id（支持 string / number） |
| `projectId` | `project_id` | 所属 project id                  |
| `status`    | `status`     | trace 状态                       |
| `startTime` | `start_time` | 开始时间                         |
| `endTime`   | `end_time`   | 结束时间                         |
| `summary`   | `summary`    | 摘要                             |

## 错误码

| 错误                       | 场景                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `SAFE_INPUT_ERROR`         | CLI 未传 `--project-id`、`--target-project-id` 或 `--shared-project-id`，或相关参数为空白字符串；`project set-shared-project-split` 缺 `--shared-project-id`、缺/非法 `--split-list`，或 split 项字段缺失或越界；`project clone` 缺 `--project-id`；`project clone --is-hands-project` 在 `--json` / 非 TTY 模式下未追加 `--group-name`，或交互式追问得到空白输入；`set-shared-project-split` / `update-product-type` 在 `--json` / 非 TTY 模式下未追加 `--yes`；交互式终端中用户对 preview 输入了非 `y` / `yes` 的内容 |
| `SAFE_API_ERROR`           | Safe 端返回非零 `code`（例如写操作鉴权失败、project 不存在等）                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| `401 no login`             | Safe Queue Center 返回未登录，需要 `bytedcli safe login` 重新登录                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| `401001 no auth available` | TCS 侧 MPSSO cookie 缺失或过期，需要 `bytedcli safe login` 重新登录                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| HTTP 4xx / 5xx             | 走 `@/utils/http` 的通用重试与错误结构，请检查内网访问与权限                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
