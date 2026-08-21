# Manta (DataLeap) CLI Reference

Manta is part of the DataLeap platform for data profiling and quality management. This CLI provides commands to query namespaces, list/run/create table monitor rules, query alarm records, create profiling rules, list profiling jobs, get profiling results, and query comparison job summaries.

Supported regions: `cn`, `sg`, `va`, `eu`, `mycis`, `sglark`, `jplark`, `uspipo`.

Manta authenticates automatically: bytedcli exchanges the ByteCloud SSO JWT for a DataLeap JWT (via the DataLeap `/user/jwt` issuer) and sends it as `x-dataleap-jwt-token`. No browser login and no session cookie are required — just complete the matching site's SSO login (see [Authentication](#authentication)).

## Commands

### yarn-queues

List available YARN queues for the current user in a given region. Use this to discover valid `--yarn-cluster` and `--yarn-queue` values before creating profiling rules.

```bash
bytedcli manta yarn-queues [options]
```

**Options:**

- `--region <region>` - Region (default: "cn")
- `-u, --username <username>` - Username (defaults to server-side identity)

**Examples:**

```bash
bytedcli manta yarn-queues --region va
bytedcli manta yarn-queues --region sg --username demo-user
bytedcli --json manta yarn-queues --region va
```

**Output:** Each queue is displayed as `region/idc/yarn_cluster/yarn_queue (load: X%)`. Use the `yarn_cluster` and `yarn_queue` fields as `--yarn-cluster` and `--yarn-queue` when creating profiling rules.

---

### namespaces

List available Manta namespaces for the selected region.

```bash
bytedcli manta namespaces [options]
```

**Options:**

- `--region <region>` - Region (default: "cn")

**Examples:**

```bash
bytedcli manta namespaces --region sg
bytedcli --json manta namespaces --region va
```

---

### monitor list

List table monitor rules. This is a read-only query over monitor objects; text output expands nested `parts[].monitors[]` rows into one row per rule.

```bash
bytedcli manta monitor list [options]
```

**Options:**

- `--region <region>` - Region (default: "cn")
- `--table-name-query <query>` - Search by database/table name
- `--project-id <id>` - Filter by project ID, repeatable (required)
- `--mine` - Only list my monitor objects
- `--triggered-only` - Only list triggered monitor objects
- `--monitor-state <state>` - Filter by monitor state
- `--monitor-type <type>` - Filter by monitor type, repeatable
- `--limit <n>` - Maximum rows to return (default: 100)
- `--offset <n>` - Pagination offset (default: 0)

**Examples:**

```bash
bytedcli manta monitor list --region mycis --table-name-query demo_db.demo_table --project-id 1234567
bytedcli manta monitor list --region sg --project-id 1234567 --monitor-type Table_Lines --monitor-state RUNNABLE
bytedcli --json manta monitor list --region va --project-id 1234567 --table-name-query demo_db.demo_table
```

**Notes:**

- `monitor list` 用于查监控规则与最近一次监控执行状态，`profile job list` 用于查数据探查任务历史；两者是并列查询入口，不要混用。
- `monitor list` 的后端接口是 `POST /monitor/object/find_monitors`，请求体按 `filter + search + pagination + project_ids` 组织。
- 文本模式会把 `parts[].monitors[]` 扁平化成逐条规则的表格行；`--json` 会保留原始嵌套结构，便于上层自动化处理。
- 查询具体表的监控规则时，如果已知项目归属，优先显式传 `--project-id`。在 `mycis` 等区域，仅使用 `--table-name-query` 或无筛选条件时，`find_monitors` 可能返回 `50005`。
- 推荐排查顺序：先执行 `manta monitor list --project-id ... --table-name-query ...`，再执行 `manta profile job list`，并明确区分“接口异常”和“确认无数据”。

---

### monitor run

Run one or more monitor rules once for a business datetime. This mirrors the Manta page trial-run action.

```bash
bytedcli manta monitor run [options]
```

**Options:**

- `--region <region>` - Region (default: "cn")
- `--rule-id <id>` - Monitor rule ID, repeatable
- `--date <datetime>` - Business datetime for trial run, `YYYY-MM-DD HH:mm:ss`

**Examples:**

```bash
bytedcli manta monitor run --region cn --rule-id 123456 --date "2026-05-19 00:00:00"
bytedcli --json manta monitor run --region cn --rule-id 123456 --rule-id 123457 --date "2026-05-19 00:00:00"
```

**Notes:**

- `monitor run` calls `POST /monitor/dry_run` with `monitor_id_list` and `date`.
- The endpoint triggers the trial run; inspect records with `monitor result list --rule-id <id> --business-date-start <yyyymmdd> --business-date-end <yyyymmdd> --project-id <id>`.

---

### monitor result list

List Manta monitor alarm results. Use `--mode template` for Hive template rule results, `--mode custom` for custom SQL rule results, or the default `--mode all` to query both.

```bash
bytedcli manta monitor result list [options]
```

**Options:**

- `--region <region>` - Region (default: "cn")
- `--mode <mode>` - Result mode: `template`, `custom`, or `all` (default: `all`)
- `--business-date-start <yyyymmdd>` - Start business date in `YYYYMMDD` format (must be used with `--business-date-end`)
- `--business-date-end <yyyymmdd>` - End business date in `YYYYMMDD` format (must be used with `--business-date-start`)
- `--rule-id <id>` - Monitor business rule ID
- `--mine` - Only list my monitor results
- `--only-alarm` - Only list alarmed results
- `--project-id <id>` - Filter by project ID, repeatable (required)
- `--page <n>` - Page number (1-based, default: 1)
- `--page-size <n>` - Items per page (default: 100)

**Examples:**

```bash
bytedcli manta monitor result list --region cn --business-date-start 20260518 --business-date-end 20260519 --rule-id 123456 --mine --only-alarm --project-id 1234567 --page-size 50
bytedcli manta monitor result list --region cn --mode template --business-date-start 20260517 --business-date-end 20260519 --project-id 1234567 --page 2
bytedcli --json manta monitor result list --region cn --mode custom --rule-id 123456 --only-alarm --project-id 1234567 --page-size 20
```

**Notes:**

- `template` mode queries Hive template monitor results; `custom` mode queries custom SQL monitor results.
- `--business-date-start` 与 `--business-date-end` 表示日期范围边界；要么都不传，要传就必须一起传。
- Text output renders a flat result table; JSON output preserves the raw result payloads grouped by mode.
- `monitor result list` 后端在无项目过滤时可能返回 `50005`；建议始终显式传 `--project-id`。

---

### alarm-record list

List Manta alarm records by alarm time range. This mirrors the DataLeap alarm record page and is intended for record-detail queries rather than monitor execution result aggregation.

```bash
bytedcli manta alarm-record list [options]
```

**Options:**

- `--region <region>` - Region (default: "cn")
- `--project-id <id>` - Filter by project ID, repeatable (required)
- `--alarm-time-start <yyyy-mm-dd>` - Start alarm date in `YYYY-MM-DD` format (must be used with `--alarm-time-end`)
- `--alarm-time-end <yyyy-mm-dd>` - End alarm date in `YYYY-MM-DD` format (must be used with `--alarm-time-start`)
- `--status <status>` - Alarm status: `all`, `unresponded`, `responding`, or `processed` (default: `all`)
- `--mine` - Only list alarms received by the current user
- `--night-alarm` - Only list night alarms
- `--page <n>` - Page number (1-based, default: 1)
- `--page-size <n>` - Items per page (default: 20)

**Examples:**

```bash
bytedcli manta alarm-record list --region cn --project-id 1234567 --alarm-time-start 2026-05-20 --alarm-time-end 2026-05-26 --mine
bytedcli manta alarm-record list --region cn --project-id 1234567 --alarm-time-start 2026-05-20 --alarm-time-end 2026-05-26 --status unresponded --page-size 50
bytedcli --json manta alarm-record list --region cn --project-id 1234567 --alarm-time-start 2026-05-20 --alarm-time-end 2026-05-26 --night-alarm
```

**Notes:**

- `alarm-record list` 走 `POST /newmanta_api/v1/alarm_report/alarm_detail`，按报警时间范围查询报警记录详情。
- `--alarm-time-start` 与 `--alarm-time-end` 必须成对出现，格式固定为 `YYYY-MM-DD`。
- `--status all|unresponded|responding|processed` 分别映射全部报警、未响应、响应处理中、已处理。
- `--mine` 用于过滤“当前用户作为报警接收人”的记录；`--night-alarm` 用于只看夜间报警记录。
- `alarm-record list` 与 `monitor result list` 不同：前者按报警时间查记录详情，后者按监控结果模式（template/custom）查监控执行结果。

---

### monitor create

Create monitor rules using a single command with `--mode template|custom`.

```bash
bytedcli manta monitor create [options]
```

**Options:**

- `--region <region>` - Region (default: "cn")
- `--mode <mode>` - Rule mode: `custom` or `template` (required)
- `--project-id <id>` - Project ID (required unless `--body-file`)
- `--monitor-name <name>` - Rule name (required unless `--body-file`)
- `--monitor-type <type>` - Monitor type (required unless `--body-file`)
- `--monitor-state <state>` - Monitor state (`RUNNABLE` or `DISABLE`)
- `--db-name <name>` - Database name
- `--tb-name <name>` - Table name
- `--partition <partition>` - Partition name
- `--description <desc>` - Description
- `--rule-sql <sql>` - SQL for custom mode (required for `custom` unless `--body-file`)
- `--alarm-conditions <json>` - Alarm conditions JSON string or `@file`
- `--schedule <value>` - Schedule
- `--cron <value>` - Cron expression
- `--body-file <path>` - Full JSON request body file (overrides all other options)

**Examples:**

```bash
bytedcli manta monitor create --region cn --mode custom --project-id 1085 --monitor-name demo_rule --monitor-type Custom_SQL --rule-sql "select 1"
bytedcli manta monitor create --region cn --mode template --project-id 1085 --monitor-name demo_template_rule --monitor-type Table_Lines
bytedcli manta monitor create --region cn --mode custom --body-file ./create-body.json
bytedcli manta monitor create --region cn --mode template --body-file ./demo-manta-template-monitor-sources.json
```

**Notes:**

- `--mode custom` 调用 `POST /monitor/batch_create_monitor`
- `--mode template` 调用 `POST /monitor/batch_create_monitor_with_object`
- 传 `--body-file` 时，请求体会完整直传并覆盖结构化参数
- `custom` 与 `template` 在 `--body-file` 模式下都优先推荐使用 `monitor_sources[].monitor_conf_list[]` 结构；模板规则不要把详情页里的扁平字段（如顶层 `monitor_object_id`、`monitor_conf`、`alarm_conditions`、`queue_conf`）直接原样提交给 create 接口。
- `template + --body-file` 的最小稳定结构是：顶层 `alarm_conf` + `monitor_sources[]`；其中 `monitor_sources[]` 负责 `db_name`、`tb_name`、`project_id`、`region`、`part_name`、`bind_tasks`、`extra_conf`，具体规则定义放在 `monitor_sources[].monitor_conf_list[]`。
- 已验证可复用示例：`skills/bytedance-manta/references/demo-manta-template-monitor-sources.json`。
- 若模板规则走任务触发，确保 `bind_tasks.tasks[].task_frequency` 与真实任务频率一致；若后端无法从请求中推导 frequency，常见报错为 `The frequency [null] is not supported`。

---

### monitor update

Update one monitor rule. Without `--body-file`, the CLI reads the current detail first, merges the supplied fields, and submits the full update payload. With `--body-file`, the file is treated as the complete update payload.

```bash
bytedcli manta monitor update [options]
```

**Options:**

- `--region <region>` - Region (default: "cn")
- `--mode <mode>` - Rule mode: `custom` or `template` (default: `custom`)
- `--rule-id <id>` - Monitor rule ID (required)
- `--name <name>` - Rule name
- `--monitor-state <state>` - Monitor state (`RUNNABLE` or `DISABLE`)
- `--description <desc>` - Description
- `--schedule <value>` - Schedule
- `--cron <value>` - Cron expression
- `--alarm-conditions <json>` - Alarm conditions JSON string or `@file`
- `--body-file <path>` - Full JSON request body file

**Examples:**

```bash
bytedcli manta monitor update --region cn --mode custom --rule-id 123456 --description sample-update
bytedcli manta monitor update --region cn --mode template --rule-id 123456 --monitor-state RUNNABLE
bytedcli manta monitor update --region cn --mode template --rule-id 123456 --body-file ./update-body.json
```

**Notes:**

- Full payload updates use `POST /monitor/update_monitor`.
- For template partition edits, keep the backend fields aligned in the body file, for example `monitor_conf.partition_value` and top-level `part_name`. If the template partition actually changes, the CLI additionally calls `POST /monitor/object/partition/modify` with `monitor_object_id`, `project_id`, `origin_partition`, and `new_partition`, because `update_monitor` alone may return success without persisting the real partition.
- `update_monitor` success does not by itself prove that `monitor_state` changed. If an update request includes a `monitor_state` different from the current detail state, the CLI calls the separate enable/disable endpoint after the full update. If the state is already unchanged, no extra state call is made.

---

### profile job list

List existing data profiling jobs. This is a read-only query and can filter by owner plus one search option: instance ID, table name, or description.

```bash
bytedcli manta profile job list [options]
```

**Options:**

- `--region <region>` - Region (default: "cn")
- `--instance-id <id>` - Search by profiling job instance ID
- `--table-name-query <query>` - Search by database/table name
- `--description-query <query>` - Search by description
- `--mine` - Only list my data profiling jobs
- `--limit <n>` - Maximum rows to return (default: 100)
- `--offset <n>` - Pagination offset (default: 0)

**Examples:**

```bash
bytedcli manta profile job list --region sg --table-name-query demo_table --limit 20
bytedcli manta profile job list --region va --instance-id 123456
bytedcli --json manta profile job list --region mycis --mine
```

---

### profile job result

Get a data profiling job result. The result includes overview, quality, detail, and partition_detail sections returned by Manta.

```bash
bytedcli manta profile job result [options]
```

**Options:**

- `--region <region>` - Region (default: "cn")
- `--instance-id <id>` - Profiling job instance ID (required)

**Examples:**

```bash
bytedcli manta profile job result --region sg --instance-id 123456
bytedcli --json manta profile job result --region va --instance-id 123456
```

---

### profile rule create

Create a data profiling rule on the DataLeap Manta platform.

```bash
bytedcli manta profile rule create [options]
```

**Options:**

- `--region <region>` - Region (default: "cn")
- `--db-name <name>` - Database name (required unless `--body-file`)
- `--tb-name <name>` - Table name (required unless `--body-file`)
- `--partitions <partition>` - Partitions, repeatable (e.g. `date=20260331`); multi-level: `date=20260331/asset_type=sdk/metrics_tag=basic_info`
- `--columns <spec>` - Profile columns: simple `name:type,...` or full JSON array; prefix `@` to read JSON from file; 省略时自动获取表 schema 探查全部字段
- `--engine-strategy <strategy>` - Engine strategy (default: "auto")
- `--description <desc>` - Description
- `--where-condition <cond>` - SQL WHERE condition
- `--yarn-cluster <cluster>` - YARN cluster (e.g. `virtual-sg`)
- `--yarn-queue <queue>` - YARN queue (e.g. `root.example_queue`)
- `--queue-idc <idc>` - Queue IDC (default: "virtual")
- `--body-file <path>` - Full JSON request body file (overrides all other options)

**Examples:**

```bash
# SG region with inline columns
bytedcli manta profile rule create --region sg --db-name demo_db --tb-name demo_table --partitions date=20260331 --columns region:string,age:int --yarn-cluster virtual-sg --yarn-queue root.example_queue

# CN region
bytedcli manta profile rule create --region cn --db-name demo_db --tb-name demo_table --partitions date=20260401 --columns id:int,name:string --yarn-cluster virtual-cn --yarn-queue root.example_queue

# VA region
bytedcli manta profile rule create --region va --db-name demo_db --tb-name demo_table --partitions date=20260401 --columns id:int,name:string --yarn-cluster virtual-va --yarn-queue root.example_queue

# 多级分区探查
bytedcli manta profile rule create --region va --db-name demo_db --tb-name demo_table --partitions date=20260401/asset_type=sdk/metrics_tag=basic_info

# EU region
bytedcli manta profile rule create --region eu --db-name demo_db --tb-name demo_table --partitions date=20260401 --columns id:int,name:string --yarn-cluster virtual-eu --yarn-queue root.example_queue

# From JSON file
bytedcli manta profile rule create --body-file ./demo-profile-rule.json
```

**Notes:**

- `--partitions` 支持多级分区，用 `/` 分隔：`date=20260331/asset_type=sdk/metrics_tag=basic_info`
- `--partition-old` / `--partition-new` 同样支持多级分区格式
- `--columns` 省略时，自动调用 `getTableSchema` 获取全部字段并按类型生成默认 profile_list
- `--columns` 简写格式的 `profile_list` 按类型自动推导：string → `[null, enum, empty]`，numeric → `[null, enum, statistic, zero]`
- YARN 队列自动选取用户有权限的、负载最低的队列；也可通过 `--yarn-cluster`/`--yarn-queue` 显式指定
- MYCIS 的 profile `create-rule` 请求体需要使用后端 profile region；CLI 会自动从对外 `--region mycis` 转换。使用 `--body-file` 手写完整请求体时，先执行 `manta namespaces --region mycis` 确认 namespace，不要直接硬编码对外 region
- On success, the response includes report URLs for each partition that can be opened to view profiling results

---

### comparison job create

Create a two-table data comparison job on the DataLeap Manta platform.

```bash
bytedcli manta comparison job create [options]
```

**Options:**

- `--region <region>` - Region (default: "cn")
- `--db-name-old <name>` - Old (baseline) database name (required unless `--body-file`)
- `--tb-name-old <name>` - Old (baseline) table name (required unless `--body-file`)
- `--partition-old <partition>` - Old table partition (e.g. `date=20260402`); multi-level: `date=20260402/asset_type=sdk/metrics_tag=v1`
- `--db-name-new <name>` - New (target) database name (required unless `--body-file`)
- `--tb-name-new <name>` - New (target) table name (required unless `--body-file`)
- `--partition-new <partition>` - New table partition (e.g. `date=20260403`); multi-level: `date=20260403/asset_type=sdk/metrics_tag=v2`
- `--primary-keys <keys>` - Primary key columns for JOIN; format: `col` or `col_old,col_new`; multiple separated by `;`. 未指定时自动推断并发出警告
- `--comparison-columns <cols>` - Comparison columns; format: `col` or `col_old,col_new,diff_type`; multiple separated by `;`. diff_type: `absolute_equal` | `number_diff`. 省略时对比所有共有字段
- `--where-condition-old <cond>` - SQL WHERE for old table
- `--where-condition-new <cond>` - SQL WHERE for new table
- `--yarn-queue <queue>` - YARN queue in format `region/idc/cluster/queue`; auto-detected if omitted
- `--body-file <path>` - Full JSON request body file (overrides all other options)

**Examples:**

```bash
# 同库同表不同分区对比，指定主键
bytedcli manta comparison job create --region va --db-name-old demo_db --tb-name-old demo_table --partition-old date=20260402 --db-name-new demo_db --tb-name-new demo_table --partition-new date=20260403 --primary-keys "id"

# 多级分区对比（用 / 分隔多级分区键）
bytedcli manta comparison job create --region va --db-name-old demo_db --tb-name-old demo_table --partition-old "date=20260402/asset_type=sdk/metrics_tag=v1" --db-name-new demo_db --tb-name-new demo_table --partition-new "date=20260402/asset_type=sdk/metrics_tag=v2" --primary-keys "id"

# 指定主键和对比列
bytedcli manta comparison job create --region sg --db-name-old demo_db --tb-name-old demo_table --partition-old date=20260402 --db-name-new demo_db --tb-name-new demo_table --partition-new date=20260403 --primary-keys "upstream_id;downstream_id" --comparison-columns "col_a;col_b;col_c"

# 通过 JSON 文件创建
bytedcli manta comparison job create --body-file ./demo-comparison.json
```

**Notes:**

- `--primary-keys` 控制 JOIN 匹配行（哪些列标识同一行），`--comparison-columns` 控制对比哪些字段的差异
- 主键必须由用户指定或确认，禁止猜测；未指定时 CLI 会自动推断并输出 `⚠` 警告
- 若指定了 `--comparison-columns` 但未指定 `--primary-keys`，对比列会自动从主键候选中排除
- YARN 队列自动选取用户有权限的、负载最低的队列；也可通过 `--yarn-queue` 显式指定（格式 `region/idc/cluster/queue`）
- On success, the response includes a comparison report URL that can be opened to view results

---

### comparison job get

Get a data comparison job result from the Manta comparison result endpoints.

```bash
bytedcli manta comparison job get [options]
```

**Options:**

- `--region <region>` - Region (default: "cn")
- `--instance-id <id>` - Comparison job instance ID (required)
- `--view <view>` - Result view: `summary` (default) or `overview`

**Examples:**

```bash
bytedcli manta comparison job get --region sg --instance-id 123456
bytedcli --json manta comparison job get --region mycis --instance-id 123456
bytedcli manta comparison job get --region mycis --instance-id 123456 --view overview
```

**Notes:**

- `--view summary` 调用 `GET /comparison/result-info?instance_id=...`，返回两表对比任务的概要信息
- `--view overview` 调用 `GET /comparison/result-overview?instance_id=...`，返回 overview 结果
- 文本模式会按顶层字段输出概要表，并附带 `view`；`--json` 保留原始返回结构，便于继续自动化处理
- 输出里附带 report URL，便于继续在浏览器中打开完整对比结果页

---

### comparison job diff-sql

Get the diff SQL for a specific compared field from the Manta `comparison/diff/sql` endpoint.

```bash
bytedcli manta comparison job diff-sql [options]
```

**Options:**

- `--region <region>` - Region (default: "cn")
- `--instance-id <id>` - Comparison job instance ID (required)
- `--old-column <name>` - Old-side field name (required)
- `--new-column <name>` - New-side field name (required)

**Examples:**

```bash
bytedcli manta comparison job diff-sql --region mycis --instance-id 49289 --old-column obj_type --new-column obj_type
bytedcli --json manta comparison job diff-sql --region mycis --instance-id 49289 --old-column obj_type --new-column obj_type
```

**Notes:**

- 该命令调用 `GET /comparison/diff/sql?instance_id=...&old_column=...&new_column=...`
- 适合查看某个字段差异明细所对应的 SQL，便于继续分析 diff 的来源或重放查询
- 文本模式会展示字段名与 SQL；`--json` 保留原始返回结构

---

### comparison sql create

Create a SQL-based data comparison job on the DataLeap Manta platform. Supports two modes: **auto-generate** (from table names, with map/array handling) and **raw SQL** (directly pass SQL statements).

```bash
bytedcli manta comparison sql create [options]
```

**Options:**

- `--region <region>` - Region (default: "cn")
- `--source-table <db.table>` - Source table in `database.table` format (auto-generate mode)
- `--target-table <db.table>` - Target table in `database.table` format (auto-generate mode)
- `--source-filter <condition>` - Source table WHERE condition (without `WHERE` keyword; auto-generate mode only)
- `--target-filter <condition>` - Target table WHERE condition (without `WHERE` keyword; auto-generate mode only)
- `--source-sql <sql>` - Raw source SQL statement (raw SQL mode; skips schema fetch)
- `--target-sql <sql>` - Raw target SQL statement (raw SQL mode; skips schema fetch)
- `--join-keys <keys>` - Join key columns, comma-separated (required unless `--body-file`)
- `--map-keys <spec>` - Map column keys: `col=key1,key2;col2=key3,key4`. Expands native Hive `map<>` fields via `col['key'] AS col_key` (auto-generate mode only)
- `--json-keys <spec>` - JSON string field keys: `col=key1,key2;col2=key3,key4`. Expands STRING fields containing JSON via `get_json_object(col, '$.key') AS col_key` (auto-generate mode only)
- `--dry-run` - Only generate/display SQL without submitting the job
- `--yarn-queue <queue>` - YARN queue in format `region/idc/cluster/queue`; auto-detected if omitted
- `--body-file <path>` - Full JSON request body file (overrides all other options)

**Examples:**

```bash
# 自动生成模式：同表不同条件的 SQL 比对
bytedcli manta comparison sql create --region cn --source-table demo_db.demo_table --target-table demo_db.demo_table --source-filter "date='20260405' and type='A'" --target-filter "date='20260405' and type='B'" --join-keys user_id

# 自动生成模式：展开 map 字段并预览 SQL（dry run）
bytedcli manta comparison sql create --region cn --source-table demo_db.demo_table --target-table demo_db.demo_table --source-filter "date='20260405'" --target-filter "date='20260404'" --join-keys user_id --map-keys "metrics=cpu,mem;tags=a,b" --dry-run

# 原始 SQL 模式：直接传 SQL 语句
bytedcli manta comparison sql create --region cn --source-sql "SELECT id, name, amount FROM demo_db.t WHERE date='20260405'" --target-sql "SELECT id, name, amount FROM demo_db.t WHERE date='20260404'" --join-keys id

# 原始 SQL 模式 + dry-run 预览
bytedcli manta comparison sql create --region cn --source-sql "SELECT id, name FROM demo_db.source_t WHERE dt='20260405'" --target-sql "SELECT id, name FROM demo_db.target_t WHERE dt='20260404'" --join-keys id --dry-run

# 提取 JSON 字符串字段的子 key 进行对比
bytedcli manta comparison sql create --region sg --source-table demo_db.demo_table --target-table demo_db.demo_table --source-filter "date='20260403'" --target-filter "date='20260402'" --join-keys uid --json-keys "props=type,status,label"

# 通过 JSON 文件
bytedcli manta comparison sql create --body-file ./demo-sql-comparison.json
```

**Notes:**

- `--source-sql/--target-sql` 与 `--source-table/--target-table` 互斥；前者为原始 SQL 模式（跳过 schema 查询），后者为自动生成模式
- 自动生成模式下，`map<>` 字段：如果指定了 `--map-keys`，每个 key 会展平为独立列 `col['key'] AS col_key`；未指定 keys 的 map 列保留原样
- 自动生成模式下，`--json-keys` 用于 STRING 类型但内容是 JSON 的字段，通过 `get_json_object(col, '$.key') AS col_key` 提取子 key 为独立对比列
- 自动生成模式下，`array<>` 字段：自动排序并拼接为字符串 `concat_ws(',', sort_array(col)) AS col_str`
- `--join-keys` 对应的列在 `field_details` 中标记为 `further_detail=false`（唯一键），其他列标记为 `further_detail=true`（查询 Diff 明细）
- API 端点使用 v1 `create_sql_rule`，与 `comparison job create` 的 `create-rule` 端点不同
- `--dry-run` 仅在本地生成并输出 SQL 和字段列表，不发起任何 API 请求
- On success, the response includes a comparison report URL

---

## Supported Regions

| Region  | Description        | API Base URL                                              |
| ------- | ------------------ | --------------------------------------------------------- |
| `cn`    | China (default)    | `https://data.bytedance.net/newmanta_api/v3`              |
| `sg`    | Singapore          | `https://dataleap-sg.tiktok-row.net/newmanta_sg_api/v3`   |
| `va`    | US East (Virginia) | `https://dataleap-va.tiktok-row.net/newmanta_i18n_api/v3` |
| `eu`    | EU                 | `https://dataleap.tiktok-eu.net/newmanta_tx_api/v3`       |
| `mycis` | ByteIntl MYCIS     | `https://dataleap-mycis.byteintl.net/newmanta_tx_api/v3`  |

## Authentication

Manta authenticates automatically with a DataLeap JWT in the `x-dataleap-jwt-token` header. bytedcli takes the ByteCloud SSO JWT and exchanges it for a DataLeap JWT through the DataLeap `/user/jwt` issuer (reused from Dorado). No browser login and no session cookie are required.

Region-to-site mapping (just complete the matching site's SSO login):

- `cn`, `sglark` → `cn` site (ByteDance SSO)
- `sg`, `va`, `eu` → `i18n-tt` site (TikTok SSO)
- `mycis`, `jplark`, `uspipo` → `i18n-bd` site (ByteIntl SSO)

The `eu` region's DataLeap JWT is minted by the `us-eastred` issuer (same `dataleap.tiktok-eu.net` host); all other regions map to their same-named Dorado issuer.

> Known cross-region differences for the `/user/jwt` exchange: `cn` and `sg` mint a Dataleap JWT directly from a bare ByteCloud JWT; `sglark` (on the `cn` site, but its Dorado issuer uses `authMode: "session"`) and `mycis` / `jplark` / `uspipo` (on the `i18n-bd` site) require a cookie-gated bootstrap, and the CLI now retries those via a Dorado session bootstrap automatically. If a region still returns a "not logged in" style error, confirm the matching site's SSO login is done first.

Ensure you are logged in for the target site:

```bash
# For cn / sglark regions
bytedcli auth login

# For sg/va/eu regions (TikTok SSO)
bytedcli --site i18n-tt auth login

# For mycis/jplark/uspipo regions (ByteIntl SSO)
bytedcli --site i18n-bd auth login
```
