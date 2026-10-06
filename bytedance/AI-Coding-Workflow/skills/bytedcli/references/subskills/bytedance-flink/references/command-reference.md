# 命令与指标速查

本文件是 `bytedance-flink` skill 的「字典」，被 `startup-errors.md` / `failover.md` / `lag.md` / `backpressure.md` 等 playbook 引用。
全部命令均为 ByteDance 内部 CLI `bytedcli` 的子命令，所有命令路径与引用的 flag 均已用 `bytedcli <...> --help` 逐条核实存在。

> 纪律提醒（贯穿全文）：本 skill 只做**只读诊断 + 修复建议**。下表中标注「变更类」的命令（如 `tce instance delete`、`tce deployment action/execute-step/cancel`、`dorado instance abort/set-success`、rescale/重启/重置 offset/改并发/改内存/重新部署 等）**绝不**由本 skill 自动执行；如诊断结论需要变更，只向用户输出「建议执行的命令」，由用户确认后自行执行。
>
> 获取 Flink Web URL 的权威流程在 `locate-job.md`（入口 A/B/C）。本文件**不**负责「如何拿到 URL」——任何「怎么拿 URL」的问题都回到 `locate-job.md`。

---

## 0. 鉴权前置（实战第一坎）

所有真实查询都依赖**有效的 SSO 会话**。未登录时业务命令会**直接报 `AUTH_REQUIRED`**，并在 error 信息里提示用 `auth login --begin`。诊断前先确认登录状态，再开始打任何真实查询。

**交互终端**（人在终端前）可直接 `bytedcli auth login` 走标准登录。

**Agent / 非交互终端**用 **device-code（设备码）非阻塞流程**，分两步：

```bash
# 第 1 步：发起设备码登录（non-blocking），返回 verification_uri_complete + complete_token
bytedcli --json auth login --begin
#   → 把返回的 verification_uri_complete 交给用户在浏览器里完成授权

# 第 2 步：用户授权完成后，用第 1 步拿到的 complete_token 完成登录
bytedcli auth login --complete <complete_token>

# 校验：确认已登录、且登录的是目标账号
bytedcli --json auth status
```

| 命令 | 用途 | 备注 |
|---|---|---|
| `bytedcli --json auth login --begin` | 发起 device-code 登录（**agent 首选**） | non-blocking；返回 `verification_uri_complete`（给用户浏览器授权）+ `complete_token` |
| `bytedcli auth login --complete <complete_token>` | 用设备码 token 完成登录 | 配合 `--begin` 第二步 |
| `bytedcli auth login` | 交互式登录 | 仅交互终端（人工）直接用 |
| `bytedcli --json auth status` | 检查当前鉴权状态 / 当前账号 | 登录后校验；解析用 `--json` |

**典型失败信号与处置：**
- 业务命令直接报 **`AUTH_REQUIRED`** → 未登录。Agent 走 `auth login --begin` → `--complete <token>` 两步流程；交互终端直接 `auth login` 重登。
- 命令报 **`HTTP_ERROR` / `Network error: fetch failed`** 并卡满超时（~32s）→ **网络层不可达，不是鉴权**。常见于 **cn / 国内环境直连海外 tiktok-row endpoint**（如 `dataleap-sg.tiktok-row.net`，合规隔离）。`curl -s -o /dev/null <endpoint>` 同样超时即可佐证。**换不了参数/站点能解决，只能换能访问海外的网络环境或配代理**（全局 `--http-proxy`/`--socks5-proxy`）。`HTTP_ERROR`（连不上）与 `AUTH_REQUIRED`（连上但没登录）是两类不同前置失败。
- **海外 tiktok-row 鉴权要看 `environments[]`**：`auth status` 顶层 `authenticated:true`（bytecloud_auth）**不代表 tiktok 已登录**。返回里 `environments[]` 中 `environment=="tiktok"`（`sso.tiktok-intl.com`）那项的 `authenticated` 才决定海外任务能否鉴权——为 `false` 时需登录 tiktok（`auth login --begin/--complete`，浏览器在 `sso.tiktok-intl.com` 授权）。
- 海外作业注意 `--auth-site`（多为 `tiktok`，见 §1）是否对齐；登录态与站点不匹配会一直报鉴权错。
- office-network 类作业 cookie 过期 → flink 命令加 `--refresh-cookie` 从当前 SSO 会话重组 office cookie（见 §1）。

> 海外作业鉴权环境由 `--site` 推导，常需显式 `--auth-site tiktok`；登录态与站点不匹配会一直报鉴权错。**但 `dorado task get` 不收 `--site`**（只 `-r/--region`），海外 dorado 命令的鉴权只能靠 `-r <region>` 推导 endpoint + 已登录 tiktok 态；能切 `--site` 的是 `megatron`/`flink` 等。

---

## 1. 通用约定（所有命令通用）

| 参数 | 含义 | 备注 |
|---|---|---|
| `-j` / `--json` | 仅输出 JSON | **诊断默认全程加 `-j`**，便于解析 |
| `--site <cn\|boe\|i18n\|i18n-bd\|i18n-tt\|us-ttp\|us-ttp-bdee\|us-ttp-usts\|eu-ttp>` | ByteCloud 站点 | 默认 `cn`；海外作业必须显式指定 |
| `--vregion <vregion>` | 站点内虚拟 region | 如 `China-North`、`Singapore-Central`、`US-BOE` |
| `--vdc <vdc>` | vregion 内虚拟数据中心 | 如 `alisg`、`maliva`、`useast5` |
| `--auth-site <bytedance\|tiktok\|test>` | SSO 环境覆盖 | 默认由 `--site` 推导；海外多为 `tiktok` |
| `-d` / `--debug` | 调试日志 | 排查 CLI 自身报错时用 |

**海外作业模板（务必带 site/region/vdc）：**

```bash
bytedcli <子命令> -j --site i18n-tt --vregion Singapore-Central --vdc alisg ...
```

### flink 组专属（诊断核心）

`flink` 是**只读** Flink REST 代理。**每条 `flink` 命令都必须带 `--url <flinkWebUrl>`**（Godel stream-applications 的 Flink Web URL，office/prod 均可）。

| 参数 | 含义 |
|---|---|
| `--url <url>` (required) | Flink Web URL（REST base）。office 或 prod URL 都接受 |
| `--network <office\|prod>` | 把 host 改写到 office/prod 同源域名（`cn` 站点为 no-op） |
| `--refresh-cookie` | 丢弃已缓存的 office-network cookie，从 SSO 会话重新组装 |

> **URL 从哪来？** 见 `locate-job.md`（入口 A/B/C）。标准产出路径是 **`megatron app search`**：按作业名搜到 application，取返回里的 **`tracking_url`** 即 Flink Web URL（详见 §3.4）。从平台「Flink UI / 作业运行页」复制 URL 是**备选 / 兜底**手段。本文件假设你已经拿到 URL。

---

## 2. 流 / 批引擎与 megatron——什么时候用 flink、什么时候用 megatron

**第一性问题：目标作业是 Flink 流作业，还是 Spark 批作业？** 两套引擎走两套命令，用错命令组只会一路报错或空结果。

| 引擎 | 诊断命令组 | 关键命令 |
|---|---|---|
| **Flink 流作业**（Godel stream-applications） | `megatron app search`（定位 application + 取 `tracking_url`）+ `flink`（§3.1）+ `bmq`/`rmq`（Lag）+ `sip`（外因） | `megatron app search`、`flink job list/get`、`flink job exception get`、`flink vertex metric list`（反压） |
| **Spark 批作业**（YARN / Spark History） | `megatron`（§3.4）+ `dorado get-container-log` | `megatron app get`、`megatron spark-ui summary`、`dorado get-container-log --file stderr` |

> **`megatron` 不只是 Spark。** `megatron app search` 的 `--application-type` 枚举含 **Flink / SPARK / PRESTO / Ray** 等，**`app search` 是定位 Flink application（拿 `tracking_url` = Flink Web URL）的核心命令**（详见 §3.4）。但 **`megatron spark-ui jobs/stages/executors/sql/environment/summary`、`dorado instance diagnose --engine spark` 等仍是 Spark 专用**，读的是 Spark History Server，对 Flink 作业不适用；反过来 `flink` 命令对 Spark 作业也无效。本 skill 主线是 **Flink 流作业**；遇到 Spark 批作业只在 megatron spark-ui 路径上给出建议命令。

**如何判别引擎（按可得信息择一）：**
- **从 Dorado 任务类型**：`bytedcli dorado task get <taskId> -r REGION -j`，看任务类型字段——流作业为 `type=stream_managed_java_flink`、`conf.typeGroup=stream`、`engineType=flink-1.11`；离线批 SQL 等多为 Spark。
- **从入口物**：手里是 **Flink Web URL** → 必是 Flink 流作业，直接走 `flink`；手里是 **YARN `application_x_y` ID** 或 **Spark History 链接** → 是 Spark，走 `megatron` / `dorado get-container-log`。
- **从实例诊断**：`bytedcli dorado instance diagnose <instanceId> --project-id PID --no-trigger -j`（`--engine` 默认 `spark`），返回里是 Spark stage/executor 语义即 Spark 批。

---

## 3. bytedcli 命令速查（按组）

### 3.1 `flink` —— 只读 Flink REST 代理

> ⚠️ **命令形态纪律**：`job config/plan/accumulator/checkpoint-config`、`cluster overview/config`、`jobmanager config/metric`、`vertex backpressure/metric/watermark/...`、`taskmanager log/metric` 等都是**子命令组**，真正的叶子命令是其下的 **`get` / `list`**。写成 `flink job plan --url`、`flink cluster overview --url`、`flink jobmanager config --url` 这类**漏 `get`/`list` 的形态全部是错的**。下表是权威形态。
>
> 单作业场景下 `--job-id` 可省略（自动探测）；多作业必须显式 `--job-id <jid>`。

| 命令 | 用途 | REST |
|---|---|---|
| `flink job list --url URL` | 作业列表 + 状态 + jid | `GET /jobs/overview` |
| `flink job get --url URL [--job-id JID]` | 单作业详情（状态、vertices、duration） | `GET /jobs/:jid` |
| `flink job exception get --url URL [--job-id JID]` | 根因异常栈（failover/启动报错首选） | `GET /jobs/:jid/exceptions` |
| `flink job checkpoint list --url URL [--job-id JID]` | checkpoint **概览**（counts/latest/history）；未开 checkpoint 时报 `Checkpointing has not been enabled`（见下） | `GET /jobs/:jid/checkpoints` |
| `flink job checkpoint get --url URL --checkpoint-id ID [--job-id JID]` | **单次** checkpoint 明细（`--checkpoint-id` required，缺失报 `CLI_ARGS_MISSING`） | `GET /jobs/:jid/checkpoints/details/:id` |
| `flink job checkpoint-config get --url URL [--job-id JID]` | checkpoint 配置（间隔/超时/模式） | `GET /jobs/:jid/checkpoints/config` |
| `flink job config get --url URL [--job-id JID]` | 作业运行时配置 | `GET /jobs/:jid/config` |
| `flink job plan get --url URL [--job-id JID]` | 执行计划（算子拓扑/并发） | `GET /jobs/:jid/plan` |
| `flink job accumulator get --url URL [--job-id JID]` | 累加器 | `GET /jobs/:jid/accumulators` |
| `flink job metric list --url URL [--job-id JID] [--names m1,m2]` | 作业级指标 | `GET /jobs/:jid/metrics` |
| `flink vertex get --url URL --vertex-id VID [--job-id JID]` | 算子详情（subtask 状态） | `GET /jobs/:jid/vertices/:vid` |
| `flink vertex backpressure get --url URL --vertex-id VID [--job-id JID]` | 反压 ⚠️**部分作业返回 `{"status":"deprecated"}`**（并非一律废弃，正常返回 level/ratio 可直接用）；deprecated 即切指标法（见下） | `GET .../vertices/:vid/backpressure` |
| `flink vertex metric list --url URL --vertex-id VID [--names ...]` | 算子级指标（反压主走此命令）。⚠️`vertex metric` **只有 `list` 叶子，没有 `get`**，`--names` 过滤挂在 `list` 上 | `GET .../vertices/:vid/metrics` |
| `flink vertex watermark get --url URL --vertex-id VID [--job-id JID]` | watermark（数据延迟/乱序） | `GET .../vertices/:vid/watermarks` |
| `flink vertex subtask-time list --url URL --vertex-id VID [--job-id JID]` | subtask 各阶段耗时 | `GET .../vertices/:vid/subtasktimes` |
| `flink vertex taskmanager list --url URL --vertex-id VID [--job-id JID]` | 算子到 TM 的映射 | `GET .../vertices/:vid/taskmanagers` |
| `flink taskmanager list --url URL` | TM 列表 | `GET /taskmanagers` |
| `flink taskmanager get --url URL --tm-id ID` | 单 TM 详情（slot/内存/GC） | `GET /taskmanagers/:id` |
| `flink taskmanager log list --url URL --tm-id ID` | TM 日志文件列表 | `GET /taskmanagers/:id/logs` |
| `flink taskmanager log get --url URL --tm-id ID [--name FILE] [--stdout] [--tail N(默认500)] [--full] [--out PATH]` | 取 TM 日志内容 | — |
| `flink taskmanager metric list --url URL --tm-id ID [--names ...]` | TM 级指标 | `GET /taskmanagers/:id/metrics` |
| `flink jobmanager config get --url URL` | JM 配置 | `GET /jobmanager/config` |
| `flink jobmanager metric list --url URL [--names ...]` | JM 级指标 | `GET /jobmanager/metrics` |
| `flink jobmanager log list --url URL` | JM 日志文件列表 | `GET /jobmanager/logs` |
| `flink jobmanager log get --url URL [--name FILE] [--stdout] [--tail N(默认500)] [--full] [--out PATH]` | JM 日志内容（启动失败首选） | — |
| `flink cluster overview get --url URL` | 集群概览（slot 总量/空闲） | `GET /overview` |
| `flink cluster config get --url URL` | 集群配置 | `GET /config` |
| `flink raw get --url URL --path /any/rest/path [--text]` | **逃生口**：任意 REST 路径 | — |

> **`flink raw get` 是逃生口，保留**：当上面封装命令不覆盖某个 REST 端点、或某版本 Flink 字段命名特殊时，用 `flink raw get --url URL --path <任意 Flink REST 路径>` 直接打。`--path` 是 required（如 `/jobs/overview`）；返回非 JSON（如 `/jobmanager/log`）加 `--text` 按纯文本处理。它本身仍是**只读 GET**，符合只读红线。

**实测要点（Flink 1.11 / Godel，必读）：**
- **jid 全 0**：Godel 流作业的 `jid` 是 `00000000000000000000000000000000`（`flink job list` 返回的 `jid` 字段就是它）。`--job-id` 写它即可，单作业场景可省略。
- **`flink job list` 自带 Grafana 入口**：返回的 `jobs[]` 每条附带两个现成 dashboard URL 字段——`metric`（`flink-<cluster>-<jobname>` 作业大盘）和 `dtop`（`flink-on-k8s-resource-v2` 资源大盘）。需要看趋势时**直接复用这两个 URL**，是 `apm grafana` 之外的现成入口。
- **反压先试 `backpressure get`，deprecated 再切指标法**：该端点**并非一律废弃**——同集群（Flink 1.11/Godel）部分作业正常返回 `backpressure-level`/逐 subtask `ratio`（可直接用），部分作业返回 `{"status":"deprecated"}`。收到 deprecated 立即切**指标法**——`flink vertex metric list`（不带 `--names`）拉全量，找 `backPressuredTimeMsPerSecond` / `busyTimeMsPerSecond` / `idleTimeMsPerSecond` / `isBackPressured`（名随版本变，先 list 再挑），或 `flink raw get --path /jobs/<jid>/vertices/<vid>/subtasks` 看 subtask 详情。**不要把 `deprecated` 误判为「无反压」**。
- **算子 chain 成单顶点时的盲区与破法**：整条链合并为一个 vertex 时，vertex 级 `numRecordsIn/Out` 恒为 0、`busyTimeMsPerSecond` 可能 NaN。用**算子级指标** `<subtask>.<算子名>.<指标>`（如 `0.Map.numRecordsOutPerSecond`，就在 `vertex metric list` 全量输出里）还原链内每个算子的吞吐。
- **`fullRestarts`/`numRestarts` 可能不存在**：部分版本 `flink job metric list --names fullRestarts,numRestarts` 返回空。重启情况以 `job get` 的 uptime/start-time 与 `exception get` 时间线为准。
- **TM_ID 每次现取**：TM 被驱逐/重建后编号递增（`…-taskmanager-1-1` → `1-2` → `1-3`），复用旧编号查 metric/log 得空结果。先 `taskmanager list` 再查。
- **RESTARTING 时 metric list 返回 `[]`**：作业处于 RESTARTING / 无 RUNNING subtask 时，`flink vertex metric list` 和 `flink job metric list` 返回**空数组 `[]`**（`status` 仍 `success`）。这不是命令错误，是无运行实体可采指标；此时根因看 `flink job exception get`，**不要反复重试 metric**。
- **`metric list` 不带 `--names` 时 value 全是 null**：第一趟（无 `--names`）只返回**指标名录**，每条 `value=null`；要数值**必须带 `--names` 再跑第二趟**。别把第一趟的 null 误读成「算子无流量/无数据」——那只是没请求值。即「`[]` = 无运行实体」「`value:null` = 没带 --names」是两种不同情形。
- **checkpoint 命令形态**：`flink job checkpoint` 是**子命令组**，叶子是 `checkpoint list`（概览：counts/latest/history = `GET /jobs/:jid/checkpoints`）和 `checkpoint get --checkpoint-id <id>`（单次明细 = `GET .../checkpoints/details/:id`）。`checkpoint get` **不能当概览用**（缺 `--checkpoint-id` 报 `CLI_ARGS_MISSING`）。
- **`Checkpointing has not been enabled` 的含义**：对**未开启 checkpoint** 的作业打 `/checkpoints` 会返回 `RestHandlerException: Checkpointing has not been enabled`——这表示**作业根本没开 checkpoint**，不是查询方式错，不必换命令。

### 3.2 `dorado` —— DataLeap 批/流任务（生命周期 / 定位）

> 多数命令支持 `-r/--region <cn\|sg\|va\|us-ttp\|us-ttp-bdee\|us-eastred\|eu-ttp2\|eu-compliance2\|gcp\|boe\|boei18n\|...>`。

| 命令 | 用途 |
|---|---|
| `dorado task get <taskId> [-r region]` | 任务详情（取 `name`/`cluster`/`queue`/`type`/`engineType`，**判别引擎**看类型字段）。⚠️**既不接受 `--project-id` 也不接受 `--site`**（实测均报 `CLI_PARSE_ERROR: unknown option`）：仅 `taskId` 位置参数 + `-r/--region`。海外任务用 `-r sg`（不带 `--site`），鉴权靠 tiktok 登录态，见 §0 |
| `dorado task check-online <taskId> --project-id PID` | 检查任务在线态。⚠️需 `--project-id`，但**仅返回薄布尔** `{"checkResult": bool}`，无任何附加信息——**不再推荐作为在线态判别手段**，在线态请用 `megatron app search` 看 `state`（见 §3.4 / `locate-job.md`） |
| `dorado task advanced-search --project-id PID -k KEYWORD [--search-scope owner,name,uid] [--owner O] [--limit N]` | 按 owner/name/uid 搜索任务（作业名/PSM 入口） |
| `dorado task search --project-id PID --keyword K [--status ...] ...` | 基础过滤搜索（按名/状态/目录） |
| `dorado task alarms --project-id PID ...` | 任务告警规则 + baseline |
| `dorado task code ...` | 任务 SQL/代码 |
| `dorado task data-outputs ...` | 任务输出表 |
| `dorado instance get <instanceId> [-r region]` | 实例详情 |
| `dorado instance list --project-id PID [--task-id T] [--status pending\|running\|succeed\|failed] [--start-time] [--end-time] [--page] [--page-size]` | 实例列表 |
| `dorado instance diagnose <instanceId> --project-id PID [--no-trigger] [--engine spark] [--run-mode system]` | 实例诊断数据（`--no-trigger` 只读缓存，**不触发新诊断**） |
| `dorado instance log-summary <instanceId>` | 实例日志摘要 |
| `dorado instance slowest-link <instanceId>` | 上游最慢链路 |
| `dorado get-container-log --application-id application_x_y [--file stderr] [--tail N]`（或 `--logs-url URL`） | 取 YARN container 日志（Spark 批） |
| `dorado get-spark-history --instance-id ID`（或 `--application-id ID`） | Spark history 链接 |
| `dorado download-instance-log --instance-id ID [--project-id PID] -o out.txt` | 下载实例日志为文本（`--project-id` 省略时自动探测；需浏览器会话） |
| ⚠️变更类 `dorado instance abort` / `dorado instance set-success` | 终止 / 标记成功 —— **不在只读诊断范围**，仅可作为建议命令输出 |
| ⚠️变更类 `dorado task online` / `commit` / `update` / `rerun` / `transfer-owner` 等 | 部署 / 提交 / 改任务 —— **不在范围**，仅建议命令 |

### 3.3 `oceanus` —— DataLeap 另一套流任务

| 命令 | 用途 |
|---|---|
| `oceanus task search [options]` | 搜索 legacy 流任务（显式选项或原始 JSON query） |
| `oceanus task bind-node ...` | legacy 任务 bind-node 映射 |
| `oceanus task dependency-recommendation ...` | 任务依赖推荐 |
| `oceanus node ...` | node draft 操作 |
| `oceanus project ...` | project 操作 |
| `oceanus tree-node ...` | IDE tree-node 操作 |

### 3.4 `megatron` —— application 定位（**Flink + Spark 通用**）

> **`megatron` 不只是 Spark。** `app search` / `app get` 是定位 **Flink** application（拿 `tracking_url` = Flink Web URL）的**核心命令**；只有 `spark-ui *` 子命令组才是 Spark 专用。

#### `megatron app search` / `app get`（Flink 定位核心）

| 命令 | 用途 |
|---|---|
| `megatron app search --app-name <作业名或关键词> [--application-type Flink] [--state RUNNING] [--app-id ID] [--real-name USER] [--me] [--fuzzy] [--page-size N] [-r region]` | 按名/条件搜 application（**Flink 定位核心**），返回 `apps[]`（字段见下） |
| `megatron app get --app-ids id1 id2 [-r region]` | 按 application ID 直查 app 元数据 |

**`app search` 关键 flag：**

| flag | 含义 / 取值 |
|---|---|
| `--app-name <name>` | 作业名或前缀关键词；**搜索是「前缀匹配」**（`--fuzzy` 默认 `true`）——全名或任意前缀命中，**中缀/后缀关键词 0 命中**；返空时换更短前缀复搜再下结论，命中后用 tags 核对 |
| `--application-type <Flink\|SPARK\|PRESTO\|Ray\|...>` | application 类型枚举；Flink 用 `Flink`（返回里 `application_type` = `"Apache Flink"`） |
| `--state <RUNNING\|FAILED\|KILLED\|FINISHED\|ACCEPTED\|...>` | 按状态过滤；在线态判别取 `state=RUNNING` |
| `--app-id <id>` / `--real-name <user>` / `--me` | 按 application ID / 责任人 / 当前用户过滤 |
| `--fuzzy` | 模糊搜（默认 true） |
| `--page-size N` / `-r/--region` | 分页 / region |

**`app search` 返回 `apps[]` 关键字段：**

| 字段 | 含义 |
|---|---|
| `app_id` | application ID（如 `application-89d93770-1780549107999-4852149`） |
| `app_name` / `cluster_name` / `queue_name` | 作业名 / 集群 / 队列 |
| `state` | `RUNNING` / `FAILED` / `KILLED` / `FINISHED` / `ACCEPTED` …（**在线态判别的权威字段**） |
| `application_type` | Flink 为 `"Apache Flink"` |
| **`tracking_url`** | **= Flink Web URL**（如 `https://godel-stream-applications.byted.org/feins-lq/application-.../`）；取 `state=RUNNING` 那条进 `flink` 子命令层 |
| `application_tags` | `...,platform=dorado,psm=<psm>,job=dorado_<taskId>,user=<user>,...`：**用 `job=dorado_<taskId>` 精确核对归属**；`psm=<psm>` 给出 PSM 入口（tags 不支持过滤，但返回可见） |
| `application_platform_link` | Dorado 平台页 URL |
| `am_container_logs` | AM = JobManager 容器日志 URL（**离线取证**用，作业已挂时取 diagnostics 配套看） |
| `diagnostics` | FAILED 时的诊断信息（⚠️实测常只有薄值 `FAILED`，根因要进 `am_container_logs`/JM 日志） |

> **在线态判别（见 §2 / `locate-job.md`）**：按名搜后看是否存在 `state=RUNNING` 且 tags 含 `job=dorado_<taskId>` 的 app——有则在线（取 `tracking_url`）；只有 FAILED/KILLED 则最近挂掉（看 `diagnostics` + `am_container_logs`）；完全搜不到 application 则从未成功提交到 YARN（走启动报错分支）。
>
> **同名 app 通常多条**：返回含全部历史 application。多个 FAILED 首尾相接（各存活数小时）= restart-strategy 熔断 → Dorado 自动重提的滚动循环（转 `failover.md`）；名为 `<作业名>_stage` 的是 development 页调试运行，其 `job=dorado_<id>` 是生产 Dorado API 查不到的影子任务 ID（见 `locate-job.md`）。

#### `megatron spark-ui *`（**仅 Spark**，见 §2）

| 命令 | 用途 |
|---|---|
| `megatron spark-ui jobs` | Spark jobs |
| `megatron spark-ui stages` | Spark stages |
| `megatron spark-ui executors` | Spark executors |
| `megatron spark-ui sql` | Spark SQL queries |
| `megatron spark-ui environment` | Spark 运行时配置 |
| `megatron spark-ui summary` | 聚合的 run-health digest |

#### 实测样例（真实可复现，2026-06-05）

```bash
# 1) Dorado 任务 ID → 作业名 / cluster / queue
bytedcli -j dorado task get 125879395 -r cn
#   → name=flink_failure_zoo_case_heap_oom, cluster=Feins-LQ,
#     queue=root.feins_lq_flink_inf_streaming_compute

# 2) 作业名 → application + tracking_url（Flink Web URL）
bytedcli -j megatron app search --app-name flink_failure_zoo
#   → 命中 flink_failure_zoo_case_npe（dorado task 125880782），state=RUNNING，
#     tracking_url=https://godel-stream-applications.byted.org/feins-lq/application-89d93770-1780549107999-4852149/

# 3) tracking_url + 全 0 jid → 根因异常
bytedcli -j flink job exception get \
  --url "https://godel-stream-applications.byted.org/feins-lq/application-89d93770-1780549107999-4852149/" \
  --job-id 00000000000000000000000000000000
#   → root-exception: java.lang.NullPointerException（RESTARTING failover 现场）
```

> 注意：用完整长名精确搜有时返回空（实测 `flink_failure_zoo_case_heap_oom` 全名搜 0 条——该任务确实从未生成 application）；建议用较短关键词模糊搜再用 tags 核对。

### 3.5 `apm` —— 指标趋势 / 根因

| 命令 | 用途 |
|---|---|
| `apm grafana query "<query>" [--start-time s\|--end-time s\|--duration 1h\|30m\|1d] [--region R] [--all-regions] [--tenant T] [--downsample 5m-sum] [--aggregator sum]` | 查 ByteTSD 指标趋势。**Flink 指标三层 schema 已实测**（`flink.job.*{jobname=}` / `flink.jobmanager.<job>.*` / `flink.taskmanager.<job>.<算子>.*`），详见 §4.2 |
| `apm grafana search <prefix> [--region R] [--tenant T] [--limit N]` | 按**前缀**搜指标名（中缀搜不到；`<prefix>` 是位置参数） |
| `apm metric query "<query>"` | 查 native metric（aiops 接口） |
| `apm metric search --prefix <prefix> [--tenant T] [--region R] [--limit N]` | 按前缀搜 APM 指标（`--prefix` required） |
| `apm metric field-list ...` | 列某指标的 fields(tags) |
| `apm metric tagk-list --metric <metric> [--tenant T] [--region R]` | 列某指标的 **tag keys**（`--metric` required） |
| `apm metric tagv-list --metric <metric> --tags <k...> [--filters k=v...] [--tenant T] [--region R]` | 列某 tag 的可能**取值**（`--metric` 与 `--tags` 均 required） |
| `apm metric tenant-list ...` | 列可用 tenant |
| `apm bosun query "<query>"` | 查 Bosun 指标（OpenTSDB 或 `q(...)` 表达式） |
| `apm service preview ...` | 服务总览（Argos/Byteheart） |
| `apm service qps ...` | 服务 QPS |
| `apm service methods ...` | 分 method 的 QPS + 成功率 |
| `apm service deps ...` | 上下游依赖 + QPS + 成功率 |
| `apm service downstream-qps ...` | 下游（client）QPS |

### 3.6 `bmq` —— Kafka（Lag 主战场）

| 命令 | 用途 |
|---|---|
| `bmq consumer list [-s 搜索group] [--cluster-name C] [-a 全部] [-v vregion] [--page] [--page-size]` | 列 consumer group（含 lag，详见 §4.3） |
| `bmq topic get --topic-id ID`（或 `bmq topic get <topicId>`） | topic 详情 |
| `bmq topic list` | topic 列表 |
| `bmq cluster ...` | cluster 操作 |

### 3.7 `rmq` —— RocketMQ（Lag）

| 命令 | 用途 |
|---|---|
| `rmq consumer stats --topic T --group G --cluster C [--top-lag-queue N] [-v vregion]` | 消费统计：TPS、lag、queue 明细（详见 §4.3） |
| `rmq consumer list --topic ...` | 列某 topic 的 consumer group |
| `rmq consumer clients ...` | 活跃 client 连接 |
| `rmq consumer allocation ...` | queue 在各 proxy 的分配状态 |

### 3.8 `tce` —— Pod 取证（**半侵入式只读取证**）

> **定性**：`tce webshell` 是**半侵入式只读取证**通道——进的是**生产 Pod**，因此每次执行都需**用户确认**；只允许在 Pod 内跑**只读**诊断命令（白名单见下），用于抓 JVM 栈 / GC / OOM / 磁盘等本地证据。**只读红线照常**：webshell 内**禁止**任何写 / 变更命令（`kill`、重启进程、改配置、删文件等）。

| 命令 | 用途 |
|---|---|
| `tce instance search -k <IP\|podName\|host>` | 全局按 IP/podName/host 搜 pod（从 TM 反查 pod 首选） |
| `tce instance list ...` | 列某 cluster/service 的 pod |
| `tce service search ...` / `tce service get [id]` / `tce service list` | 服务发现 / 详情 |
| `tce deployment get <id\|url>` | 部署详情 / 步骤（启动期部署状态首选） |
| `tce deployment list ...` | 列部署 ticket |
| `tce env-cascader ...` | 把 PSM 解析为 partitions/envs/lanes（只读） |
| `tce webshell open --psm ... [--env ...] [--pod-name ...] [--container-name ...] [--first]` | 解析并持久化可复用 webshell 会话（建立会话本身只读） |
| `tce webshell exec --session-id ID --command "<只读命令>"` | 在 Pod 内执行命令——**半侵入式只读取证**：仅限下方白名单只读命令，**用户确认后**执行；**禁止**任何写/变更命令 |
| `tce webshell interactive --session-id ID` | 交互式 shell——同样仅限只读取证，需用户确认 |
| `tce webshell close --session-id ID` | 关闭 webshell 会话 |
| ⚠️变更类 `tce instance delete` | 删 pod —— **不在范围**，仅建议命令 |
| ⚠️变更类 `tce deployment action` / `tce deployment execute-step` / `tce deployment cancel` / `tce deploy-lane` | 驱动 / 取消部署 —— **不在范围**，仅建议命令 |

**webshell 内只读命令白名单**（抓 JVM/GC/OOM/磁盘证据，需 `tce webshell open --session --` 类有效 SSO browser session，见 §0）：

| 命令 | 取证目的 |
|---|---|
| `jstack <pid>` | 线程栈（卡死 / 死锁 / 热点线程） |
| `jmap -heap <pid>` | 堆配置与各代占用（**只看，不要 dump 大文件**） |
| `jstat -gcutil <pid> <interval>` | GC 各代占用率与 GC 次数/耗时 |
| `top -b -n1` / `top -H -b -n1 -p <pid>` | 进程 / 线程级 CPU |
| `dmesg \| tail` | 内核日志（OOM-Killer / 硬件） |
| `cat <日志文件>` / `tail -n N <日志>` | 容器内 Flink / GC 日志 |
| `df -h` / `free -m` | 磁盘 / 内存余量（本地盘写满导致 checkpoint/spill 失败） |

> ⚠️ 即便是只读白名单命令，也务必**先取得用户确认**再执行（进的是生产 Pod）；任何不在白名单、或带写语义的命令一律改为「建议命令」交给用户。

### 3.9 `sip` —— 智能运维事件（failover 外因根因）

| 命令 | 用途 |
|---|---|
| `sip event list [--duration 30m\|--start T --end T] [--region r(可重复)] [--biz tiktok_feeds] [--filter '{json}'] [--category LIBRA\|Demotion\|TCE] [--keyword K] [--page-no] [--page-size] [--mode card\|simple]` | 列时间窗内运维事件（机器降级/TCE 事件/限流降级，**默认值陷阱详见 §4.4**） |
| `sip event get --id ID` | 事件详情 |

---

## 4. 指标与字段速查

> ⚠️ **指标名纪律（贯穿全文，单一出处在此）**：Flink REST 指标名**随 Flink 版本 / connector / 算子实现变化**，**不要臆造确定的指标名**。具体可用名以 `flink ... metric list`（**不带 `--names`**）的**全量输出**为准——先拉全量看实际有哪些名，再挑出来填进 `--names`。下面各表是「常见名」，仅供定位方向，**不要假定一定存在**。

### 4.1 常见 Flink REST 指标（用于 `metric list --names`）

**取指标的通用流程：**

```bash
# 1) 先不带 --names 拉全量，看实际有哪些指标名
bytedcli flink vertex metric list -j --url "$URL" --vertex-id "$VID"

# 2) 从全量输出里挑出需要的名，再带 --names 精确取值
bytedcli flink vertex metric list -j --url "$URL" --vertex-id "$VID" \
  --names "numRecordsInPerSecond,numRecordsOutPerSecond,buffers.inPoolUsage"
```

#### source 消费类（Lag / 吞吐定位）
| 常见名（以实际输出为准） | 含义 |
|---|---|
| `numRecordsInPerSecond` / `numRecordsOutPerSecond` | 算子每秒进/出记录数（吞吐） |
| `numRecordsIn` / `numRecordsOut` | 累计进/出记录数 |
| `currentFetchEventTimeLag` | source 拉取到的事件时间滞后（ms） |
| `currentEmitEventTimeLag` | source 发射时事件时间滞后（ms） |
| `pendingRecords` | source 待消费记录数（部分 connector 暴露，近似 lag） |
| `sourceIdleTime` | source 空闲时长（上游无数据时升高） |
| `*.records-lag-max` / `*.consumer-lag` | Kafka connector 暴露的消费 lag（命名带 connector 前缀，差异大，**务必看全量**） |

> Kafka/BMQ 的「权威 lag」以 `bmq consumer list` 的 lag 字段为准（见 §4.3），Flink 侧指标用于交叉验证。

#### 反压类（backpressure 定位）
| 常见名（以实际输出为准） | 含义 |
|---|---|
| `buffers.inPoolUsage` | 输入 buffer 池占用率（接近 1 表示下游来不及/被反压） |
| `buffers.outPoolUsage` | 输出 buffer 池占用率（接近 1 表示本算子被下游反压） |
| `buffers.inputQueueLength` / `buffers.outputQueueLength` | 输入/输出队列长度 |
| `isBackPressured` | 是否处于反压（部分版本暴露布尔/比率） |
| `idleTimeMsPerSecond` / `busyTimeMsPerSecond` | 每秒空闲/繁忙毫秒（busy 高=本算子是瓶颈；idle 高=被上游饿着） |
| `backPressuredTimeMsPerSecond` | 每秒处于反压的毫秒数 |

> ⚠️ `flink vertex backpressure get` **部分作业返回 `{"status":"deprecated"}`（并非一律废弃——正常返回 level/ratio 可直接用，见 §3.1）**。算子级反压主流程：**先试一次 `backpressure get`，收到 `deprecated` 立即切指标法**——上表 `backPressuredTimeMsPerSecond` / `busyTimeMsPerSecond` / `idleTimeMsPerSecond` / `isBackPressured`（先 `metric list` 不带 `--names` 拉全量看实际有哪些名再挑），**不要把 `deprecated` 误判为「无反压」**。

#### checkpoint 类（启动 / failover / 状态定位）
| 常见名 / 字段（以实际输出为准） | 含义 |
|---|---|
| `lastCheckpointDuration` | 最近一次 checkpoint 耗时 |
| `lastCheckpointSize` / `lastCheckpointFullSize` | 最近 checkpoint 大小（状态膨胀） |
| `lastCheckpointExternalPath` | 最近 checkpoint 外部路径 |
| `numberOfFailedCheckpoints` / `numberOfCompletedCheckpoints` | 失败/完成数（失败多=对齐慢/反压/超时） |
| checkpoint list 内 `alignment_duration` / `sync_duration` / `async_duration` | 对齐/同步/异步阶段耗时（反压导致对齐时间飙升） |

> checkpoint 的结构化明细优先用 `flink job checkpoint list` / `flink job checkpoint get` / `flink job checkpoint-config get`，而非 metric。

#### TM / JVM 资源类（OOM / GC / failover 定位）
| 常见名（以实际输出为准） | 含义 |
|---|---|
| `Status.JVM.Memory.Heap.Used` / `Status.JVM.Memory.Heap.Max` | 堆内存使用/上限 |
| `Status.JVM.Memory.NonHeap.Used` | 非堆内存使用 |
| `Status.JVM.GarbageCollector.*.Count` / `*.Time` | GC 次数 / 累计耗时（GC 频繁=停顿/反压/OOM 前兆） |
| `Status.JVM.CPU.Load` / `Status.JVM.CPU.Time` | JVM CPU 负载。⚠️`CPU.Load` 按**宿主机核数**归一化，容器配额下读数严重偏低（实测 0.043 ≈ 平台口径 47% 配额利用率）——判断 CPU 是否打满以 JM 日志 autoscaler 的 `max CPU util`（grep `Autoscaling result`）或 `dtop` 大盘为准，CPU.Load 只用于「≈0」的定性判断（阻塞型瓶颈一锤，见 `backpressure.md`）；`CPU.Time` 部分版本不存在 |
| `Status.JVM.Threads.Count` | 线程数 |
| `Status.Flink.Memory.Managed.Used` / `Status.Flink.Memory.Managed.Total` | Flink managed 内存（RocksDB state 后端相关） |
| `Status.Shuffle.Netty.*` | 网络/shuffle 相关（反压/网络瓶颈） |

```bash
# TM JVM 资源（先拉全量确认实际名，再 --names）
bytedcli flink taskmanager metric list -j --url "$URL" --tm-id "$TMID" \
  --names "Status.JVM.Memory.Heap.Used,Status.JVM.GarbageCollector.G1_Young_Generation.Time"
```

### 4.2 `apm grafana query` —— ByteTSD Flink 指标（**实测字典，2026-06-07**）

两种写法（命令 help 原文）：

1. **简单式** `metric{tag=value}`：默认 `aggregator=sum`、`downsample=5m-sum`，可用 `--aggregator` / `--downsample` 覆盖。
2. **完整式** `aggregator[:downsample]:metric{group_tags}{filter_tags}`；分组 tag 用 `{tag=*}` 形态（如 `{taskid=*}` 按 subtask 拆 series）。

时间窗：`--duration 1h|30m|1d`，或 `--start-time`/`--end-time`（秒级 epoch）。海外用 `--region`（如 `US-TTP`、`Singapore-Central`）或 `--all-regions`。

#### Flink 指标三层命名 schema（实测打通，cn 站点）

| 层级 | 指标名形态 | 作业怎么定位 | 内容 |
|---|---|---|---|
| **作业级（tag 过滤）** | `flink.job.<指标>` | **`{jobname=<作业名>}` tag 过滤** | 55 个：`numRestarts`/`fullRestarts`/`uptime`/`downtime`/`restartingTime`/`recoveringTime`、checkpoint 全系列（`numberOfFailedCheckpoints`/`numberOfContinuousCheckpointFailure`/`lastCheckpointDuration`/`lastCheckpointFullSize`）、`consumerRecordsRate`/`currentOffsetsRate`、`noResourceAvailableException`、`numberOfTmExceedQuota`、`autoscalingSuggestedParallelism` |
| **作业级（JM 内嵌名）** | `flink.jobmanager.<作业名>.<指标>` | 作业名在指标名里 | 32 个：重启/uptime 系列外，还有 **`ratioTaskLoadSkew`**（负载倾斜比）、**`numOfFailFilteredByAggregatedStrategy`**（被熔断策略吞掉的失败数）、`JMHeartbeatTimeoutFromTM`、`executionStatus` |
| **算子级** | `flink.taskmanager.<作业名>.<算子名>.<指标>` | 作业名+算子名在指标名里 | 每算子 ~55 个：**反压全家桶历史趋势**——`backPressuredTimeMsPerSecond`/`busyTimeMsPerSecond`/`idleTimeMsPerSecond`、`buffers.in/outPoolUsage`、`inputQueueLength`、`isTaskStuck`、`latency.mean/p99`、`numRecordsIn/OutPerSecond.rate`、`taskFailingTime` |

**tag 维度**（`tagk-list` 实测）：`jobname` / `job_name` / `cluster` / `queue` / `flinkVersion` / `region` / `jobType`；算子级额外有 **`taskid`（=subtask 编号）/ `tmid` / `host`**。

**租户**：Flink 指标实际存于 **`computation.flink`**——`apm grafana query/search` 默认租户**自动路由**到它（响应 `query.tenant` 可见），无需显式传；但 `apm metric tagk-list/tagv-list` 建议显式 `--tenant computation.flink`。`search` 同样是**前缀匹配**（中缀搜不到）。

#### 实测可照抄示例（真实返回过数据）

```bash
# ① 重启历史（REST 的 metric list 里没有 fullRestarts/numRestarts，ByteTSD 有！）
bytedcli -j apm grafana query "flink.job.numRestarts{jobname=<作业名>}" \
  --duration 10d --aggregator max --downsample 1d-max
#   读法：阶梯上升=持续 failover；高速攀升后突然归零=熔断→app FAILED→Dorado 重提（OOM 风暴实测每小时 +250~450、单代攒 ~6000 次后归零）

# ② 反压历史回溯（REST 只有即时值，这里有任意时间窗趋势）
bytedcli -j apm grafana query \
  "flink.taskmanager.<作业名>.<算子名>.backPressuredTimeMsPerSecond" \
  --duration 6h --aggregator avg --downsample 30m-avg

# ③ 按 subtask 分组看数据倾斜（{taskid=*} 拆 series，逐 subtask 对比吞吐）
bytedcli -j apm grafana query \
  "avg:flink.taskmanager.<作业名>.<算子名>.numRecordsOutPerSecond.rate{taskid=*}" \
  --duration 1h --downsample 30m-avg

# ④ checkpoint 失败趋势
bytedcli -j apm grafana query \
  "flink.job.numberOfFailedCheckpoints{jobname=<作业名>}" --duration 1d
```

#### 探名串联（schema 外的指标仍先探再查）

```bash
bytedcli -j apm grafana search "flink.job."                                  # 前缀搜指标名
bytedcli -j apm grafana search "flink.taskmanager.<作业名>"                  # 该作业全部算子级指标
bytedcli -j apm metric tagk-list --metric "flink.job.downtime" --tenant computation.flink
bytedcli -j apm metric tagv-list --metric "flink.job.uptime" --tags jobname --tenant computation.flink
```

> host CPU/mem、下游服务延迟等**非 Flink 自身**指标的前缀因业务接入而异，仍要先 `search` 探名。Flink 自身指标用上面的实测 schema 直接拼即可。

### 4.3 BMQ / RMQ Lag 字段说明

**BMQ（Kafka）—— `bmq consumer list`**
- 以 consumer group 维度返回，含每个 group/分区的**消费 lag**（已生产 offset 与已提交 offset 之差，单位「条」）。
- 常用过滤：`-s <group>` 按 group 名搜、`--cluster-name <C>` 限集群、`-a` 显示全部（非仅自己拥有）、`-v <vregion>`（默认 `US-BOE`）。
- lag 持续增长 = 消费跟不上生产；lag 稳定但高 = 一次性积压未追平；lag 突增 = 上游突发流量或下游卡死（结合反压判断）。

```bash
bytedcli bmq consumer list -j -s "$GROUP" --cluster-name "$CLUSTER" -v Singapore-Central
```

**RMQ（RocketMQ）—— `rmq consumer stats`**
- 必填 `--topic` `--group` `--cluster`；返回 **TPS、总 lag、各 queue 明细**。
- `--top-lag-queue N`：按 lag 降序取前 N 个 queue（定位「个别 queue 堆积」型倾斜）。
- `-v/--vregion` 默认 `China-BOE`，海外务必覆盖。
- 字段判读：总 lag 高但 TPS 正常 → 历史积压追平中；单 queue lag 远高于其他 → 分区倾斜 / 该 queue 对应 consumer 卡住（再看 `rmq consumer clients` / `rmq consumer allocation`）。

```bash
bytedcli rmq consumer stats -j --topic "$TOPIC" --group "$GROUP" --cluster "$CLUSTER" --top-lag-queue 10
```

### 4.4 `sip event` 的 `--biz` / `--filter` / `--category`（默认值陷阱 · 单一出处）

> 本节是 `failover.md` 等文件引用的 sip event 参数**单一出处**。failover 的**外因**（机器降级、TCE 事件、限流降级）多来自运维事件；`sip event list` 有**默认值陷阱**，不覆盖就查不到目标作业相关事件。

| 参数 | 默认值 | 陷阱与正确用法 |
|---|---|---|
| `--biz` | `tiktok_feeds` | **默认只查 `tiktok_feeds` 业务线**。目标作业属于别的业务线（如 `tiktok_live`）时必须显式覆盖，否则漏报。 |
| `--filter` | `{"libra":{"app":["TikTok"]}}` | **默认只过滤 TikTok 应用**。是缩小结果的必填项；按实际应用覆盖，如 `'{"libra":{"app":["Douyin"]}}'`。 |
| `--category` | 无（不过滤） | 按类别子串过滤：`LIBRA`（限流/降级配置）、`Demotion`（降级）、`TCE`（容器/调度事件）。定位 failover 外因时常用 `--category TCE` 或 `--category Demotion`。 |
| `--region` | 无（可重复，默认空） | 海外作业按所在 region 过滤，如 `--region us-ttp --region sg`。 |
| `--duration` / `--start` `--end` | `--duration` 默认 `30m` | 对齐 failover 发生时刻；给了 `--start` 则忽略 `--duration`。窗口要覆盖 failover 时间点前后。 |
| `--page-no` / `--page-size` | `1` / `12` | 结果分页；事件多时翻页。 |
| `--mode` | `card` | `card`/`simple` 两种列表展示模式。 |

```bash
# 正确：覆盖 biz 与 filter，按 failover 时刻拉 TCE 类事件
bytedcli sip event list -j \
  --biz tiktok_live --filter '{"libra":{"app":["TikTok"]}}' \
  --category TCE --region us-ttp --start "-1h" --end now
```

---

## 5. 四类问题 · 入口定位决策树

> 入口收敛流程的**权威版本在 `locate-job.md`**（入口 A/B/C）；这里是速记。任何「如何拿 Flink Web URL」的细节都以 `locate-job.md` 为准。

```
入口
├─ Flink Web REST URL  ──────────────► 直接用 flink 组（最快，入口 A）
│        flink job list -j --url URL  → 拿 jid / 状态
│
├─ Dorado 流式任务 ID / URL ─────────► dorado task get <taskId> -r REGION（入口 B）
│        └─ 取 name → megatron app search --app-name <name> → 取 RUNNING 那条的 tracking_url（= Flink Web URL）
│        └─ 引擎为 Spark 时：megatron app get / dorado get-container-log（见 §2）
│
└─ 作业名 / PSM ─────────────────────► dorado task advanced-search --project-id PID -k KEYWORD（入口 C）
         （或 oceanus task search）   → 定位 taskId → 回到入口 B
```

> 标准产出路径是 `megatron app search` 的 `tracking_url`（见 §3.4）；万一搜不到 application（从未提交成功），再退到「从平台 Flink UI / 作业运行页复制 URL」。**不要编造 URL**；完整步骤见 `locate-job.md`。

### 四类问题 → 证据命令首选（详见各 playbook）

| 症状 | 根因方向 | 首选证据命令 | 修复**建议**（仅建议，用户确认后执行） | 详见 |
|---|---|---|---|---|
| 启动报错（作业起不来） | 配置/资源/依赖/checkpoint 恢复失败 | `flink job exception get`、`flink jobmanager log get`、`tce deployment get`、（Spark）`dorado get-container-log --file stderr` | 修配置 / 调资源 / 重选 checkpoint —— 输出建议命令，**不自动执行** | `startup-errors.md` |
| 运行时 failover | 算子异常 / OOM-GC / 机器降级 / TCE 事件 | `flink job exception get`、`flink taskmanager log get`、`flink taskmanager metric list`（GC/Heap）、`sip event list --category TCE\|Demotion` | 内因→改代码/调内存并发；外因→上报/迁移 —— 建议命令 | `failover.md` |
| 消费 Lag | 吞吐不足 / 反压 / 分区倾斜 / 上游突增 | `bmq consumer list` 或 `rmq consumer stats`、`flink vertex metric list`（吞吐/lag/反压指标） | 扩并发 / 调 source / 排倾斜 —— **不自动 rescale / 改并发 / 重置 offset**，仅建议 | `lag.md` |
| 反压 | 某算子是瓶颈 / 下游慢 / 资源不足 | `flink vertex metric list`（`backPressuredTimeMsPerSecond`/`busyTimeMsPerSecond`/`idleTimeMsPerSecond`；`backpressure get` 部分作业返回 deprecated，见 §3.1）、`flink job checkpoint list`（对齐耗时） | 定位瓶颈算子→扩并发/优化逻辑 —— 仅建议 | `backpressure.md` |

> 跨文件引用：根因分类的完整决策与「根因→证据→建议」明细见各专题文件（`startup-errors.md` / `failover.md` / `lag.md` / `backpressure.md`）；URL 解析见 `locate-job.md`；指标名与命令参数始终以本 `command-reference.md` 为准。
