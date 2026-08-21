# Megatron CLI Reference

Megatron 是 Spark 应用管理平台，提供 Spark 应用元数据查询、应用搜索、队列使用情况查询、用户队列配额查询，以及通过 Spark History Server REST API 读取单个应用的 Spark UI 运行详情（jobs / stages / executors / sql）的能力。

## Routing

- 使用全局 `--site` 选择站点：`cn`、`i18n-tt`、`eu-ttp`、`us-ttp`、`us-ttp-bdee`、`us-ttp-usts`、`boe`。
- 使用 `-r, --region <region>` 或全局 `--vregion <vregion>` 选择站点内 Megatron 虚拟区域。
- `i18n-tt` 默认 `sg`；常用值：`sg`、`va`、`us-west`、`us_south_west`、`eu`、`id`、`mygp`。
- `eu-ttp` 默认 `i18n_gcp`；常用值：`eu_ttp`、`i18n_gcp_gp`、`i18n_gcp`、`eu_ttp_no`。
- `boe` 默认 `boe`；常用值：`boe`、`boei18n`。
- `cn`、`us-ttp`、`us-ttp-bdee`、`us-ttp-usts` 不接受 `-r/--region`（站点本身唯一定位区域）。

## Commands

### app get

```bash
bytedcli megatron app get --app-ids <appIds...> [-r <region>]
```

- `--app-ids <appIds...>`：Application IDs，支持逗号或空格分隔。
- `-r, --region <region>`：Megatron 虚拟区域。

Examples:

```bash
bytedcli megatron app get --app-ids application_1234567890000_000001
bytedcli --site i18n-tt megatron app get --app-ids application_1234567890000_000001,application-abc-123 -r sg
bytedcli --site i18n-tt megatron app get --app-ids application_1234567890000_000001 application-abc-123 -r va
```

### app search

```bash
bytedcli megatron app search [filters] [-r <region>]
```

Filters: `--app-id`、`--app-name`、`--real-name`、`--me`、`--state`、`--application-type`、`--fuzzy <bool>`、`--page-size <n>`。

- `--state` 取值：`SUBMITTED`、`ACCEPTED`、`RUNNING`、`NEW_SAVING`、`NEW`、`FINISHED`、`FAILED`、`KILLED`。
- `--application-type` 取值：`MAPREDUCE`、`SPARK`、`ZION`、`Flink`、`Primus`、`FLUCTLIGHT`、`ALFRED`、`PRESTO`、`SPARK_STREAMING`、`Ray`。
- `--me` 自动以当前登录的 SSO 用户填充 `--real-name`。
- JSON 输出包含 `next_page_token`，文本输出在表格下方提示该 token。

```bash
bytedcli --site i18n-tt megatron app search --app-name demo-app --state RUNNING -r sg
bytedcli --site i18n-tt megatron app search --me -r va
```

### queue list

列出 Megatron 队列。默认按当前登录的 SSO 用户过滤，可通过 `--user` / `--all-users` 切换范围。

```bash
bytedcli megatron queue list [--user <name> | --all-users] [--fuzzy <bool>] [--page <n>] [--page-size <n>] [--with-usage <bool>] [-r <region>]
```

- `--user <name>`：按指定用户过滤；默认是当前 SSO 用户。
- `--all-users`：列出所有队列（不带 user 过滤）。与 `--user` 互斥。
- `--with-usage <bool>`：默认 `true`，包含每个队列的使用情况。

```bash
bytedcli --site i18n-tt megatron queue list -r sg
bytedcli --site i18n-tt megatron queue list --user demo-user -r sg
bytedcli --site i18n-tt megatron queue list --all-users --page 2 --page-size 20 -r sg
```

### queue usage

合并了原 `queue get-usage` 与 `queue calc-user-quota`：在一条命令里同时返回队列使用情况、用户配额（min × ratio / max × ratio）以及当前队列层面的剩余可用资源 `available_now_*`。

```bash
bytedcli megatron queue usage [--queue-name <queueName>] [--user-name <userName>] [--user <name> | --all-users] [--fuzzy <bool>] [--page <n>] [--page-size <n>] [-r <region>]
```

- `--queue-name <queueName>`：可选；省略时通过 `queue list` 枚举多队列并并行计算（最多 10 路）。
- `--user-name <userName>`：用于计算配额的用户名；未指定时默认使用当前登录的 SSO 用户。
- `--user` / `--all-users`：仅在 `--queue-name` 省略时影响要枚举的队列范围；与 `--user-name` 解耦。
- 输出字段：
  - 顶层：`queue_name`、`region_name`、`cluster_name`、`label_name`、`num_active_apps`、`num_pending_apps`、`user_name`、`ratio`、`ratio_source`（`per_user` 或 `default`）
  - `user`：`{ name, min_cpu, max_cpu, min_memory, max_memory, used_cpu, used_memory }`，`min`/`max` 是 `queue.min/max * ratio` 推算的用户配额上下限
  - `queue`：`{ min_cpu, max_cpu, min_memory, max_memory, used_cpu, used_memory }`，队列层面的边界与总用量（`used_*` 已包含你自己）
  - `others`：`{ used_cpu, used_memory }` = `queue.used - user.used`
  - `available_now`：`{ cpu, memory }` = `max(0, queue.max - queue.used)`
- 关键含义：
  - **`available_now.cpu` / `available_now.memory`** 是「队列层面当下还有多少空闲资源」。等于 0 表示队列已经触顶或被借出超过其 max，此时即使你的 `user.min_*` / `user.max_*` 还有富余，新任务也会排队，要等到队列内其他用户释放资源后才会被调度。
  - `user.min_*` / `user.max_*` 是「按 ratio 推算的你这个用户的配额上下限」，不代表当前真实可用。判断「我现在能不能被调度」请看 `available_now`；判断「我这个用户配额还能再涨多少」请看 `user.max_* - user.used_*`。
  - `queue.used_*` 已经包含你自己的用量；`others.used_*` 是其他用户的用量。
- 多队列模式下，JSON 输出形式为 `{ queues: [...] }`；单队列时顶层即单条记录。

```bash
bytedcli --site i18n-tt megatron queue usage --queue-name root.demo_queue -r sg
bytedcli --site i18n-tt megatron queue usage --queue-name root.demo_queue --user-name demo-user -r sg
bytedcli --site i18n-tt megatron queue usage -r sg
bytedcli --site i18n-tt megatron queue usage --all-users -r sg
```

### queue quota

```bash
bytedcli megatron queue quota list-users [--queue-name <queueName>] [--user <name> | --all-users] [-r <region>]
bytedcli megatron queue quota get-default [--queue-name <queueName>] [--user <name> | --all-users] [-r <region>]
```

- `list-users`：列出指定队列（或 `queue list` 枚举出的多队列）下所有按用户配置的 ratio。
- `get-default`：返回指定队列的默认 user-quota ratio；多队列时输出 `default_ratios` 数组，每条 `{ queue_name, default_ratio }`。
- `--queue-name` 省略时，通过 `queue list` 枚举并并行（最多 10 路）请求。

```bash
bytedcli --site i18n-tt megatron queue quota list-users --queue-name root.demo_queue -r sg
bytedcli --site i18n-tt megatron queue quota get-default --queue-name root.demo_queue -r sg
bytedcli --site i18n-tt megatron queue quota list-users -r sg
```

### spark-ui

读取单个 Spark 应用的运行详情。数据来自 Spark History Server 的标准 REST API（`/api/v1/applications/{appId}/...`），返回原始 Spark UI JSON，便于程序化分析任务运行情况（慢 stage、数据倾斜、executor 异常、failed task）。

```bash
bytedcli megatron spark-ui jobs list        --app-id <appId> [--spark-history-url <url>] [--timeout-ms <ms>] [-r <region>]
bytedcli megatron spark-ui stages list     --app-id <appId> [-r <region>]
bytedcli megatron spark-ui stages get      --app-id <appId> --stage-id <n> [-r <region>]
bytedcli megatron spark-ui executors list   --app-id <appId> [--all] [-r <region>]
bytedcli megatron spark-ui sql list         --app-id <appId> [-r <region>]
bytedcli megatron spark-ui environment get --app-id <appId> [-r <region>]
bytedcli megatron spark-ui summary get     --app-id <appId> [-r <region>]
```

- `--app-id <appId>`：YARN application ID（如 `application_1234567890000_000001`）。
- `--spark-history-url <url>`：可选；直接给出 Spark UI 链接（如 `http://spark3-history-example.example.net/history/<appId>/jobs/`）。提供后跳过需鉴权的 megatron app-info 解析，直接打 REST API；适用于 app-info 鉴权失败但 REST 开放的场景。
- `--timeout-ms <ms>`：REST 超时（毫秒），默认 `120000`。History Server 对已结束任务首次访问需回放 event log，冷启动较慢（轻量端点数秒，带 task 明细的单 stage 可达约 80s），故默认值较大。
- `-r, --region <region>`：仅用于解析 History Server 主机；提供 `--spark-history-url` 时可省略。
- 子命令（`<resource> <action>` 结构，末级为标准动词）：
  - `jobs list`：列出全部 job（task / failed-task 计数、状态、提交时间）。
  - `stages list`：列出全部 stage；`stages get --stage-id <n>`：下钻到该 stage 的 task 级明细（冷启动较慢，会先提示）。
  - `executors list`：列出 executor；`--all` 额外包含已退出（dead）executor，并带 GC 时间、shuffle 读写量。文本模式额外打印 executor 退出原因分类（OOM / 驱逐抢占 / 正常缩容），可直接据此确认是否 OOM，无需另查 container log。
  - `sql list`：列出 SQL query；`--json` 返回完整 `planDescription`（physical plan）。
  - `environment get`：展示 runtime 与常用 Spark 配置；`--json` 返回全部属性。
  - `summary get`：聚合 jobs + executors + sql，输出运行健康摘要（job/executor 失败数、OOM-killed executor 数、最大 GC、shuffle 总量、dead executor 数），并自动标记异常。
- 输出复用：每个命令的 JSON `context.spark_history_root` 会带上解析出的 History Server REST root。多命令诊断同一应用时，先取一次该值，后续命令用 `--spark-history-url <root>/history/<appId>/jobs/` 复用，避免反复经鉴权网关解析（该网关偶发瞬时网络错误）。
- 注意：不要使用 attempt 维度路径（无多 attempt 的应用会卡住）；裸 `/applications/{appId}` 路由不可用，统一走子资源。

```bash
bytedcli --site i18n-tt megatron spark-ui summary get --app-id application_1234567890000_000001 -r sg
bytedcli --site i18n-tt megatron spark-ui jobs list --app-id application_1234567890000_000001 -r sg
bytedcli --site i18n-tt megatron spark-ui stages get --app-id application_1234567890000_000001 --stage-id 8 -r sg
bytedcli --site i18n-tt megatron spark-ui executors list --app-id application_1234567890000_000001 --all -r sg
bytedcli -j --site i18n-tt megatron spark-ui sql list --app-id application_1234567890000_000001 -r sg
bytedcli megatron spark-ui jobs list --app-id application_1234567890000_000001 --spark-history-url http://spark3-history-example.example.net/history/application_1234567890000_000001/jobs/
```

## Authentication

The CLI uses ByteCloud JWT authentication via SSO. Ensure you are logged in:

```bash
bytedcli auth login
```
