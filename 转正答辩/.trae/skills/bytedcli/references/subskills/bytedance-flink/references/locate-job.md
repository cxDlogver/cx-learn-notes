# 定位作业并解析 Flink Web URL（统一入口）

本文件是所有 Flink 流式作业诊断的**第一步**：把用户手里的任意信息（Flink Web URL / Dorado 流式任务 ID 或 URL / 作业名 / PSM）解析成后续诊断真正需要的三件东西：

1. **一个可用的 Flink Web URL**（Godel stream-applications 的 Flink Web REST base，office 或 prod 均可）；
2. **jid**（Flink job id，单作业时多数命令可自动探测）；
3. **正确的 `--site` / `--vregion` / `--auth-site`**（海外作业必须正确，否则连不通或查不到）。

拿到这三件东西后，再进入对应的专项诊断：启动报错见 `startup-errors.md`、运行时 failover 见 `failover.md`、消费 Lag 见 `lag.md`、反压见 `backpressure.md`；命令字段速查见 `command-reference.md`。

> 全程只读。本 skill 绝不自动执行任何变更（rescale / 重启 / 重置 offset / 改并发等）。本文件不产生任何修复建议，只负责定位。

---

## 步骤 0：确认已登录（实战第一坎，先于一切定位）

所有真实查询都依赖**有效的 SSO 会话**。**离线 / 未登录 / 会话失效时，业务命令会直接报 `AUTH_REQUIRED`，并在 error 里提示用 `--begin`**。所以在做任何定位（入口 A/B/C）之前，先确认登录态：

```bash
# 看当前是否已登录、会话是否有效
bytedcli auth status
bytedcli --json auth status        # 程序化解析用 JSON
```

- **已登录且会话有效** → 直接进入下面的定位流程（入口 A/B/C）。
- **未登录 / 会话失效 / status 显示过期** → 先登录，再继续。

**交互终端**可直接：

```bash
bytedcli auth login
```

**Agent（非交互终端）**走 device-code 两步流程：

```bash
# 第一步：non-blocking，返回 verification_uri_complete + complete_token
bytedcli --json auth login --begin
# 把 verification_uri_complete 给用户在浏览器完成授权，拿回 complete_token 后：
bytedcli auth login --complete <complete_token>
# 校验
bytedcli --json auth status
```

> 提示：海外资源要在登录前后注意 `--auth-site`（`bytedance | tiktok | test`）与 `--site` 是否匹配；用 bytedance 账号查 tiktok 资源时，鉴权域不对同样会表现为「挂起 / 查不到」。site/auth 细节见本文件第七节。

### 步骤 0b：海外（TikTok-row / SG / US-TTP）前置自检 —— 两道门，缺一即诊断中止

海外任务（入口 URL 形如 `https://dataleap-sg.tiktok-row.net/...` 或 region 为 `sg/va/us-ttp/...`）在进入定位前，**必须先过两道门**，否则会在第 0 步就失败、根本进不到 `dorado task get`：

**门 1 —— 网络可达性**。海外 endpoint（如 `dataleap-sg.tiktok-row.net`）从 **cn / 国内侧网络通常不可达**（合规隔离）。表现是命令报 **`HTTP_ERROR` / `Network error: fetch failed`** 并卡满超时（实测 ~32s），endpoint 字段能看到打的是对的海外地址。**这是网络层失败，不是鉴权、不是参数错**——`curl -s -o /dev/null https://dataleap-sg.tiktok-row.net/` 也会超时即可佐证。

> ⚠️ **两类前置失败要分清**：`HTTP_ERROR / fetch failed`（网络不可达，海外 endpoint 在 cn 环境连不上）≠ `AUTH_REQUIRED`（已连上但没登录）。前者改不了参数、换不了站点能解决，只能换网络环境。

**门 2 —— tiktok SSO 登录态**。海外 tiktok-row 走 **tiktok** SSO（`sso.tiktok-intl.com`），与 bytedance 域是两套。`bytedcli --json auth status` 返回里看 **`environments[]`**：

```bash
bytedcli --json auth status
#   顶层 authenticated:true（bytecloud_auth）≠ tiktok 已登录！
#   必须看 environments 里 environment=="tiktok" 那项的 authenticated 字段：
#   - environments[tiktok].authenticated == true  → 过门 2
#   - == false → 海外任务会鉴权失败，需登录 tiktok（auth login --begin/--complete，浏览器在 sso.tiktok-intl.com 授权）
```

**解锁顺序**（门 1 必须先于门 2，网络不通时连登录都做不了）：
1. 换到能访问 tiktok-row 的网络环境（海外跳板机 / 海外 office 网络 / 配了 i18n 代理的机器）；或给 bytedcli 配代理（全局 `--http-proxy <addr>` / `--socks5-proxy <addr>`，需代理能到 tiktok-row）。
2. 登录 tiktok SSO：`bytedcli --json auth login --begin` → 浏览器在 **sso.tiktok-intl.com** 授权 → `bytedcli auth login --complete <token>`，再 `auth status` 确认 `environments[tiktok].authenticated=true`。
3. 再走入口 B 标准链路（`dorado task get <taskId> -r sg` → `megatron app search` → `flink ...`）。

> Agent 在 cn 环境遇到海外任务时，**先如实判定卡在哪道门**（看 `HTTP_ERROR` 还是 `AUTH_REQUIRED`、看 `environments[tiktok]`），给出上面的解锁步骤，**不要硬编/臆造数据**——网络/鉴权前置不满足时没有任何作业数据可取。

---

## 一、适用症状 / 何时用本文件

- 用户只给了一个「Flink UI / 作业运行页」链接，不知道里面有哪些 job、状态如何。
- 用户只给了 Dorado 流式任务 ID 或一段 Dorado URL，需要找到运行态作业。
- 用户只报了一个**作业名**或 **PSM**，连任务 ID 都没有。
- 任何诊断开始前，需要先确认「作业到底在哪、site/vregion 对不对、REST 通不通」。

---

## 二、诊断决策树（你有什么 → 走哪条路）

```
用户给的信息是什么？
│
├─ (A) 已经是 Flink Web REST URL（形如 https://.../flink/.../  或作业运行页里复制的 Flink UI 地址）
│        → 最可靠。直接 flink job list --url URL -j 验证连通 + 拿 jid/状态
│        → office 网络失败：加 --network office|prod 或 --refresh-cookie
│        → 海外作业：加 --site / --vregion
│        ✅ 完成，进入专项诊断
│
├─ (B) Dorado 流式任务 ID 或 Dorado URL  —— 标准三步链路
│        → 从 URL 解析 taskId / region（注意：task get 不接受 --project-id）
│        → dorado task get <taskId> -r region -j      取 .data.name / .data.cluster / .data.queue
│        → megatron app search --app-name <作业名或关键词> [--application-type Flink] -j
│             取 state=RUNNING 且 tags 含 job=dorado_<taskId> 的 app 的 tracking_url
│        → tracking_url 就是 Flink Web URL
│        ↓ 拿到 URL 后回到 (A)
│
└─ (C) 只有作业名 / PSM
         → 作业名：megatron app search --app-name <作业名> -j   直接定位 application + tracking_url
         → PSM：megatron app search --app-name <psm 末段关键词> -j（默认 --fuzzy）
                再用返回里 application_tags 的 psm=<psm> 字段核对归属
         → 辅助：dorado task advanced-search --project-id PID -k 名字 ... 可按名找 taskId（再回到 B）
         ↓ 拿到 tracking_url 后回到 (A)
```

---

## 三、入口 A：已有 Flink Web REST URL（最可靠路径）

只要手里有 Flink Web URL，就**不要绕 Dorado**，直接打 REST 最准。

### 步骤 A1：验证连通并列出所有 job + 状态 + jid

```bash
bytedcli flink job list --url "<flinkWebUrl>" -j
```

返回 `/jobs/overview`：作业列表，每条含 `jid`、`name`、`state`（RUNNING / FAILING / RESTARTING / FINISHED / CANCELED 等）。

- **能正常返回** → 记下目标作业的 `jid` 和 `state`，定位完成。
- **单作业场景** → 后续 `flink job get` / `exception` / `vertex` 等多数命令可省略 `--job-id`，CLI 会自动探测唯一 jid；**多作业**时必须显式带 `--job-id <jid>`。
- ⚠️ **Godel 流作业 jid 多为全 0**：`00000000000000000000000000000000`（实测 1.11）。这是正常的 job id，不是错误。

### 步骤 A2：office 网络连不通时

office 网络访问 prod 域（或反之）会因 cookie / host 问题失败，按顺序尝试：

```bash
# 把 host 改写到 office/prod 对应的兄弟域名（cn 站点为 no-op）
bytedcli flink job list --url "<flinkWebUrl>" --network office -j
bytedcli flink job list --url "<flinkWebUrl>" --network prod   -j

# 仍失败：丢弃缓存的 office 网络 cookie，用当前 SSO 会话重新拼装
bytedcli flink job list --url "<flinkWebUrl>" --refresh-cookie -j
```

`--network` 与 `--refresh-cookie` 是 `flink` 子命令通用标志，后续所有 `flink ...` 命令都可带。

### 步骤 A3：海外作业加 site / vregion

海外作业必须指定站点与虚拟区域，否则路由到错误集群：

```bash
bytedcli flink job list --url "<flinkWebUrl>" \
  --site i18n-tt --vregion Singapore-Central -j
```

- `--site` 取值：`cn`（默认）`| boe | i18n | i18n-bd | i18n-tt | us-ttp | us-ttp-bdee | us-ttp-usts | eu-ttp`。
- `--vregion` 例：`China-North | Singapore-Central | US-BOE`；必要时再加 `--vdc`（例 `alisg | maliva | useast5`）。
- `--auth-site`（`bytedance | tiktok | test`）默认由 `--site` 推导，跨 SSO 域时可显式覆盖。

### 步骤 A4：拿到 jid 后看单作业详情（可选，承接专项诊断）

```bash
bytedcli flink job get --url "<flinkWebUrl>" --job-id "<jid>" -j
```

至此入口 A 完成。接下来按症状进入 `startup-errors.md` / `failover.md` / `lag.md` / `backpressure.md`。

---

## 四、入口 B：Dorado 流式任务 ID / URL（标准三步链路）

**标准链路【Dorado 任务 ID → Flink Web URL】已打通，无需从平台页复制 URL。** 三步：`dorado task get` → `megatron app search` → 取 `tracking_url`。

### 步骤 B1：从 Dorado URL 解析 taskId / region

**Dorado URL 解析口径**（以实测 URL 为例）：

```
# 国内：
https://data.bytedance.net/dorado/development/node/125879395?project=cn_581
                                              └─ node/<taskId> ┘ └ project=<region>_<projectId>
# 海外（TikTok-row，如 SG）：
https://dataleap-sg.tiktok-row.net/dorado/development/node/304004969?groupName=sg&project=sg_300001874
        └ 海外域名=合规隔离，cn 环境不可达，先过步骤 0b ┘  └ node/<taskId> ┘   └ project=sg_<projectId>
```

- **taskId**：取 path 中 **`node/<taskId>`** 段（上例 = `125879395` / `304004969`）。`dorado/stream-task?...keyword=<taskId>` 形态的 URL 则取 `keyword=` 参数。
- **region / projectId**：query 参数 **`project=<region>_<projectId>`** 按下划线拆开——前缀是 region（上例 `cn` / `sg`），后缀是 projectId（上例 `581` / `300001874`）。
  - **域名直接暗示 region**：`data.bytedance.net` = cn；`dataleap-sg.tiktok-row.net` = sg（海外，先过步骤 0b 两道门）。
  - region 填给 `dorado task` 的 **`-r/--region`**，取值如 `cn`（默认）`| sg | va | gcp | mycis | mybd | us-ttp | us-ttp-bdee | us-eastred | eu-ttp2 | eu-compliance2 | boe | boei18n | gp-us`。
  - projectId 本步用不上（`task get` 不收它），留给 `check-online`/`advanced-search`/`task code` 等需要 `--project-id` 的命令。

> ⚠️ **`dorado task get` 只收 `taskId` 位置参数 + `-r/--region`**，**既不接受 `--project-id` 也不接受 `--site`**（实测带上都报 `CLI_PARSE_ERROR: unknown option`）。这点与 `megatron`/`flink`（收 `--site`）不同——**海外 dorado 命令无法手工切站点鉴权，只能靠 `-r <region>` 推导 endpoint + tiktok 登录态**（见步骤 0b）。所以海外 `dorado task get <taskId> -r sg`（不带 `--site`）是正确形态；鉴权对不对取决于你是否已登录 tiktok。`--project-id`/`--site` 只在搜索 / instance / `megatron` / `flink` 等命令里按需带。

### 步骤 B2：dorado task get —— 取作业名 / cluster / queue

```bash
bytedcli -j dorado task get <taskId> -r <region>
```

从返回里提取（megatron 搜索要用）：

- `.data.name`：作业名（megatron `--app-name` 的输入）。
- `.data.cluster`：如 `Feins-LQ`。
- `.data.queue`：如 `root.feins_lq_flink_inf_streaming_compute`。

流作业判别字段：`type=stream_managed_java_flink`、`conf.typeGroup=stream`、`engineType=flink-1.11`。

> ⚠️ **流式作业不走 instance 模型**：`dorado instance list` 对流作业实测返回 0 条（instance 模型属批 / 例行实例）。**不要对流作业跑 `instance list` / `instance diagnose`**——在线态与运行实体一律以 megatron application（步骤 B3）为准。`dorado task check-online` 仅返回薄布尔 `{"checkResult": bool}`，同样不推荐。

### 步骤 B3：megatron app search —— 取 tracking_url（即 Flink Web URL）

```bash
bytedcli -j megatron app search --app-name "<作业名或较短关键词>" [--application-type Flink] [--state RUNNING]
```

返回 `apps[]`，每条含：

- `app_id`（如 `application-89d93770-1780549107999-4852149`）、`app_name`、`cluster_name`、`queue_name`、`state`（RUNNING / FAILED / KILLED / FINISHED / ACCEPTED…）、`application_type`（`Apache Flink`）。
- **`tracking_url`** = `https://godel-stream-applications.byted.org/<cluster>/application-.../` ← **这就是 Flink Web URL！**
- `application_tags`：`...,platform=dorado,link=...,psm=<psm>,version=1,job=dorado_<taskId>,user=<user>` ← 用 **`job=dorado_<taskId>`** 精确核对归属；`psm=` 字段可反查 PSM。
- `application_platform_link`（Dorado 平台页）、`am_container_logs`（AM=JobManager 容器日志，离线取证用）、`diagnostics`（FAILED 时的诊断信息——**实测常常只有薄薄一个 `FAILED`**，真正根因要进 `am_container_logs`/JM 日志取证）。

取 **`state=RUNNING` 且 `tags` 含 `job=dorado_<taskId>`** 的 app 的 `tracking_url`，即可回到入口 A 进入 flink 子命令层。

> ⚠️ **模糊搜索是「前缀匹配」**（`--fuzzy` 默认 true）：全名、任意**前缀**关键词均命中；**中缀 / 后缀关键词不命中**（实测：搜 `heap_oom` 中缀 0 条，搜 `flink_failure_zoo` 前缀命中）。全名本身就是自己的前缀，**全名精确可搜**，且会一并带出 `<全名>_stage` 等带后缀的衍生 app。一次 0 命中**不要立刻下「从未提交」结论**——先换更短的前缀关键词复搜核对（实测曾有全名搜临时返回 0、复搜命中 10 条的先例）。
>
> 其余 flag：`--app-id`、`--real-name <user>`、`--me`、`--page-size`、`-r/--region`。已知 application ID 时可 `megatron app get --app-ids <id...>` 直查。

> **megatron 不只是 Spark**：`--application-type` 枚举含 Flink / SPARK / PRESTO / Ray，`app search` 是定位 Flink application 的核心命令。但 `megatron spark-ui`、`dorado instance diagnose --engine spark` 等仍是 Spark 专用，不适用 Flink。

拿到 `tracking_url` 后，回到 **入口 A 步骤 A1** 用 `flink job list --url ... -j` 验证并取 jid。

### 实测样例（真实可复现）

```bash
# 用户给的 URL：https://data.bytedance.net/dorado/development/node/125880782?project=cn_581
#   → 按 B1 口径解析：taskId=125880782（node/ 后段）、region=cn、projectId=581（project=cn_581 拆开）

bytedcli -j dorado task get 125880782 -r cn
#   → name=flink_failure_zoo_case_npe, cluster=Feins-LQ, queue=root.feins_lq_flink_inf_streaming_compute

bytedcli -j megatron app search --app-name flink_failure_zoo
#   → 命中 flink_failure_zoo_case_npe（dorado task 125880782），state=RUNNING，
#     tracking_url=https://godel-stream-applications.byted.org/feins-lq/application-89d93770-1780549107999-4852149/

bytedcli -j flink job exception get --url "<tracking_url>" --job-id 00000000000000000000000000000000
#   → root-exception: java.lang.NullPointerException（RESTARTING failover 现场）
```

> 同名 app 通常不止一条：搜索会返回**全部历史 application**（含 FAILED）。例：`--app-name flink_failure_zoo_case_heap_oom` 命中 10 条——1 个 RUNNING + 8 个 FAILED（首尾相接滚动 3 天）+ 1 个 `_stage` 调试运行。按 `state` + tags 里 `job=dorado_<taskId>` 挑当前那条。

### 调试 / stage 影子任务（development 页）

Dorado **development 页**（URL 含 `/development/node/<id>`）跑的调试运行，会生成名为 **`<作业名>_stage`** 的独立 application，其 tags 里的 `job=dorado_<影子taskId>` 是一个**生产 Dorado API 查不到的影子任务 ID**（`dorado task get <影子id>` 报「任务不存在」——它属于 fedev/stage 环境，tags 里 `link=` 指向 `dorado.fedev`、project 是 stage 项目）。判别与归属核对：

- app 名以 **`_stage` 结尾** → 调试运行，不代表生产任务在线；
- 归属核对用三要素：**作业名前缀 + cluster + user**（影子 taskId 无法回查）；
- 用户给的是 development 页 URL 时，对应的运行实体很可能就是这个 `_stage` app。

---

### 在线态判别（megatron state 为准）

**不要用 `dorado task check-online` 判断作业是否在线**——它仅返回 `{"checkResult": bool}` 薄布尔，无任何附加信息，不推荐作为判别手段。

**标准判别**：`megatron app search` 按名搜，看是否存在 `state=RUNNING` 且 tags 匹配 `dorado_<taskId>` 的 application。三分支决策：

| megatron 搜索结果 | 含义 | 下一步 |
|---|---|---|
| 有 `state=RUNNING` 且 tags 匹配 | **在线** | 取 `tracking_url` 进 flink 层（回入口 A），按症状走专项诊断 |
| 无 RUNNING，但有 `FAILED`/`KILLED` app | 作业最近挂掉 / 被杀（离线分支） | 看该 app 的 `diagnostics` + `am_container_logs` 取证，见 `failover.md`（`diagnostics` 常只有薄值 `FAILED`，根因以日志为准） |
| 完全搜不到 application | 从未成功提交到 YARN | 走部署层 / 启动报错分支，见 `startup-errors.md`，查 dorado 任务配置与提交日志 |

---

## 五、入口 C：只有作业名 / PSM

目标是直接拿到 application 的 `tracking_url`（即 Flink Web URL），回到入口 A；多数情况无需先绕 taskId。

### 步骤 C1：作业名直接 megatron app search

```bash
bytedcli -j megatron app search --app-name "<作业名或较短关键词>" [--application-type Flink] [--state RUNNING]
```

- 命中后取 `state=RUNNING` 的 app 的 `tracking_url` → 回入口 A。
- 搜索是**前缀匹配**（`--fuzzy` 默认 true）：全名或任意前缀关键词可搜，中缀/后缀关键词搜不到；命中后用 `application_tags` 里的 `job=dorado_<taskId>` 核对是否目标作业。

### 步骤 C2：PSM 定位（用 tags 里的 psm= 核对）

`megatron app search` 不支持按 tags 过滤，但返回里 `application_tags` 含 `psm=<psm>`。做法：用 **PSM 末段关键词模糊搜** `--app-name`（很多作业的 app_name 近似 PSM 后缀），再在返回里核对 `psm=<完整 PSM>`：

```bash
bytedcli -j megatron app search --app-name "<psm 末段关键词>"
# 在返回的 apps[].application_tags 里找 psm=<目标 PSM>，确认归属
```

> 如已知 Pod / IP / host，还可用 `bytedcli tce instance search -k "<IP|podName|host>" -j` 反查（取证用，详见 `command-reference.md`）。`tce service search -k <psm>` 给的是服务侧信息，可辅助确认业务线，但**不直接产出 Flink Web URL**。

### 步骤 C3：辅助 —— 按名找 taskId（dorado task advanced-search）

若需要先拿到 Dorado taskId（例如要查任务配置 / 提交日志），可用高级搜索：

```bash
bytedcli dorado task advanced-search \
  --project-id <PID> -k "<作业名或关键词>" \
  --search-scope owner,name,uid -r <region> -j
```

- `--search-scope` 默认 `owner,name,uid`，可按需收窄（如只 `name`）；可加 `--owner`、`--limit`。
- **必须有 projectId**；若用户连项目都不确定，先确认归属项目。
- 拿到 taskId 后回到 **入口 B**（`dorado task get` → `megatron app search`）。

---

## 六、速查表：我有什么 → 用什么命令 → 得到什么

| 我手里有 | 用什么命令 | 得到什么 / 下一步 |
|---|---|---|
| Flink Web REST URL | `bytedcli flink job list --url URL -j` | 作业列表 + `jid` + `state`；连通即定位完成（入口 A） |
| Flink Web URL（office 连不通） | 同上加 `--network office\|prod` 或 `--refresh-cookie` | 修复 office/prod 域与 cookie，重试连通 |
| Flink Web URL（海外作业） | 同上加 `--site i18n-tt --vregion ... [--vdc ...]` | 路由到正确海外集群 |
| Flink Web URL + jid | `bytedcli flink job get --url URL --job-id JID -j` | 单作业详情，承接专项诊断 |
| Dorado 任务 ID | `bytedcli -j dorado task get <taskId> -r region` | `.data.name` / `.data.cluster` / `.data.queue`（**不接 --project-id**）（入口 B） |
| 作业名 / 关键词 | `bytedcli -j megatron app search --app-name 名字 [--application-type Flink] [--state RUNNING]` | `apps[]` + `tracking_url`（=Flink Web URL）+ `tags`（含 `job=dorado_<taskId>`） |
| application ID | `bytedcli -j megatron app get --app-ids <id>` | 按 application ID 直查 |
| 判别在线态 | `megatron app search` 看是否有 `state=RUNNING` 且 tags 匹配 `dorado_<taskId>` | 在线 → 取 tracking_url；FAILED/KILLED → 看 diagnostics+am_container_logs；无 app → 启动报错分支 |
| 按名找 taskId（辅助） | `bytedcli dorado task advanced-search --project-id PID -k 名字 --search-scope owner,name,uid -j` | 命中的 taskId → 回到入口 B |
| PSM | `bytedcli -j megatron app search --app-name <psm 末段>`，核对返回 tags 里 `psm=` | 确认归属并取 tracking_url（`tce service search` 仅辅助确认业务线） |
| IP / podName / host | `bytedcli tce instance search -k <值> -j` | Pod 取证信息（详见 `command-reference.md`） |
| 任意 Flink REST 路径（逃生口） | `bytedcli flink raw get --url URL --path /any/rest/path -j` | 直读任意 REST 端点（命令未覆盖时兜底） |

---

## 七、site / vregion / auth / SSO 注意事项

- **默认 site=cn。** 海外作业**必须**显式带 `--site`，否则鉴权与路由错误，表现为连不通或查不到。取值：`cn | boe | i18n | i18n-bd | i18n-tt | us-ttp | us-ttp-bdee | us-ttp-usts | eu-ttp`。
- **两套区域维度不要混淆：**
  - `flink ...` 用全局 `--site` / `--vregion` / `--vdc`。
  - `dorado task ...` / `megatron app ...` 用 `-r/--region`（取值集合不同，见入口 B），海外建议**同时**带全局 `--site` 对齐鉴权。
- **`--vregion` / `--vdc`：** 海外多区域时配合 `--site` 精确定位，例 `--vregion Singapore-Central --vdc alisg`。
- **`--auth-site`：** `bytedance | tiktok | test`，默认由 `--site` 推导；跨 SSO 域（如用 bytedance 账号查 tiktok 资源）时显式指定。
- **office vs prod 网络：** `flink` 子命令的 `--network office|prod` 改写 host 到兄弟域；`--refresh-cookie` 丢弃缓存 cookie 用当前 SSO 重新拼装。两者均**只对 `flink` 子命令有效**，cn 站点 `--network` 为 no-op。
- **SSO / 离线限制：** 所有真实查询都依赖有效 SSO 会话；离线或会话失效时命令会挂起或失败。本 skill 在无在线作业时**只核实命令是否存在（`--help`），不跑真实查询**。
- **`-j/--json` 默认全程加上**，便于程序化解析；调试连通问题时可临时去掉看人类可读输出，或加 `-d/--debug` 看请求细节。

---

## 八、定位失败时的兜底

- `flink job list` 报连接/鉴权错 → 依次试 `--network office`、`--network prod`、`--refresh-cookie`，再确认 `--site`/`--vregion` 是否匹配海外作业。
- `megatron app search` 全名搜返回空 → 搜索是**前缀匹配**：换**更短的前缀关键词**复搜（中缀/后缀关键词永远 0 命中），再用 tags 里 `job=dorado_<taskId>` 核对；前缀复搜仍为空才可下「从未生成 application」结论（走启动报错分支 `startup-errors.md`）。
- `dorado task get` 报 `CLI_PARSE_ERROR` → 多半误带了 `--project-id`；`task get` 只接受 `taskId` 位置参数 + `-r/--region`。
- 取不到 `tracking_url`（兜底）→ 标准产出路径是 megatron `tracking_url`；万一 megatron 也查不到，**才**让用户从平台「Dorado 作业运行页 / Flink UI」复制 URL 走入口 A。**不要臆造 URL。**
- 命令未覆盖某个 REST 端点 → 用 `flink raw get --url URL --path <REST 路径> [-j|--text]` 作为逃生口。
