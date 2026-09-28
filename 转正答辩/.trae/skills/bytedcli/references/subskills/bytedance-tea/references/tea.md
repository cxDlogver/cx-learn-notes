# TEA（DataOpen / tea-next）

## Auth modes

| 模式       | 适用站点              | 凭据来源                                             | 何时使用                                                                                        |
| ---------- | --------------------- | ---------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| `dataopen` | cn / va / sg          | `TEA_APP_ID` + `TEA_APP_SECRET`（申请 DataOpen App） | 已有 DataOpen App，或需稳定后端对接                                                             |
| `titan`    | cn / va / sg / sglark | `bytedcli auth login` 扫码（走 titan_passport）      | 没有 DataOpen App，或想用扫码身份直接调内部 API；sglark 唯一可用，cn/va/sg 与 DataOpen 任选其一 |

通过 `--auth-mode dataopen|titan|auto` 显式切换；默认 `auto` 按下列优先级判定：

1. 命令行显式 `--auth-mode ...` 优先
2. `--tea-site sglark` 或 URL host 是 `tea-sglark.bytedance.net` → 强制 `titan`
3. 存在 `TEA_APP_ID/TEA_APP_SECRET` → `dataopen`
4. 站点支持 titan（当前 cn / va / sg / sglark 全部支持） → `titan`
5. 否则 `dataopen`（此时若无凭据会抛 `TEA_INPUT_ERROR`）

`sglark` 不支持 `dataopen`；cn / va / sg 两条路径任选其一。

## Command map

- `bytedcli tea event send`
  - 上报单条 TEA / ByteIO 事件；不支持批量文件上报
  - `--app-id <id>`：TEA / ByteIO app_id，必填
  - `--event <name>`：事件名，必填；事件名需以字母开头，只包含字母、数字、下划线、点或短横线
  - 身份默认值：不传身份参数时，CLI 从 bytedcli auth / userinfo / JWT / SSO 解析当前用户作为 `user_unique_id`；解析失败回退 `installation_id`
  - `--user-unique-id <id>`：覆盖自动解析出的用户 ID；`--device-id <id>` 与 `--web-id <id>` 可同时传，不互斥
  - `--no-auto-user`：禁用自动用户解析和 `installation_id` 回退，此时必须显式传 `--user-unique-id` / `--device-id` / `--web-id` 至少一个；仅传 `device_id` 或 `web_id` 时，会将该值同步作为 payload 与 SDK 配置里的 `user_unique_id`
  - `--require-user`：要求最终必须存在 `user_unique_id`，无法从登录态解析且未传 `--user-unique-id` 时失败
  - 事件属性：`--params-file <file>` 先加载 JSON object，`--params-json <json>` 覆盖同名字段，重复 `--param key=value` 最后覆盖；`--param` 的 value 按字符串处理，数字/布尔请用 JSON
  - `--timestamp-ms <ms>`：事件发生时间，默认当前时间；`--caller <caller>`：ByteIO caller，默认 `bytedcli.tea.event_send`；`--dry-run` 只构造 payload 不上报；`--dump <file>` 写出最终 payload
- `bytedcli tea search`
  - `--type dashboard_info`：按看板 URL 解析出的 `dashboard_id` 获取看板信息
  - `--type dashboard_reports`：列出看板内报表（包含 report_id / report_type / 简要描述）
  - `--tea-site <site>`：cn | va | sg | sglark | auto
  - `--auth-mode <mode>`：dataopen | titan | auto
  - `--tea-base-url <url>`：直接覆盖 DataOpen 基址（仅 dataopen 模式）
- `bytedcli tea report create`
  - 用 DSL 创建 tea-next report；输入 `--dsl <dslJson>` 或 `--dsl-file <file>`；写接口仅支持 titan 模式，默认走扫码登录态
  - `--project-id <projectId>`：TEA project_id；也可从 `--url` 解析
  - `--name <name>`：report 名称
  - `--dashboard-id <dashboardId>`：可选，写入创建 payload；展示到看板仍建议继续执行 `tea dashboard subscribe-reports`
  - `--report-type <type>`：默认 `event_analysis`
  - `--report-app-id <appId>`：创建 payload 的 `app_id`，默认使用 `project_id`；注意不是 DataOpen 鉴权用的 `--app-id`
  - 实际 endpoint：`POST /datafinder/api/v1/projects/<pid>/reports`（仅 titan 模式）
- `bytedcli tea report get`
  - 获取已有 tea-next report 配置；`--url` 可解析 project/report 和控制面 host，或显式传 `--project-id --report-id --tea-site <site>`
  - 传入 `--dashboard-url <url>` 或 `--dashboard-id <id>` 时，改为读取 dashboard 绑定的 card report 对象；用于排查 report detail 与 dashboard card 渲染配置不一致的情况
  - dashboard 模式可用 `--report-id <id>` 指定目标 report，也可同时传 tea-next report `--url` 解析 report_id
  - `--dsl-only`：仅输出 `dsls[--dsl-index].dsl_content`，`--dsl-index` 默认 0，便于保存成 JSON 文件后修改
  - 如果要导出后再用 `report update` 写回，请使用普通 report detail 路径（`--project-id/--report-id` 或 report `--url`），不要带 `--dashboard-url/--dashboard-id`；dashboard 模式读取的是 card 内嵌 report，主要用于排查渲染配置
  - 实际 endpoint：普通模式 `GET /datafinder/api/v1/projects/<pid>/reports/<report_id>`；dashboard 模式 `GET /datafinder/api/v1/projects/<pid>/dashboards/<did>/reports`（均仅 titan 模式）
- `bytedcli tea report list`
  - 列出 dashboard 当前绑定的 reports：`--dashboard-url <url>`，或 `--project-id <pid> --dashboard-id <did> --tea-site <site>`
  - JSON 模式返回完整 dashboard reports 原始块 `dashboard_reports`，包含 `reports`、`layout`、`denied`、`total`、`available` 等字段；文本模式只展示 report 摘要
  - 该接口单页全量返回；JSON 顶层 `total` 是后端 total，`page=1`，`page_size` = `total`（单页全量，避免被误判为还有分页），`accessible_count` = 本次返回的可访问 reports 数；原始 `available/denied` 保留在 `dashboard_reports` 中
  - 用于先确认 dashboard card 绑定的是哪些 report，以及获取 dashboard card 使用的内嵌 report DSL/`show_option`/`extra`
  - 实际 endpoint：`GET /datafinder/api/v1/projects/<pid>/dashboards/<did>/reports`（仅 titan 模式）
- `bytedcli tea report update`
  - 原地更新已有 tea-next report；先 GET 当前 report，再 PATCH 同一路径，保留线上其它字段
  - `--dsl <json>` / `--dsl-file <file>`：替换 `dsls[--dsl-index].dsl_content`；`--dsl-index` 默认 0；从普通 report detail 路径的 `report get --dsl-only` 导出后写回时，两边使用相同 `--dsl-index`
  - 可同时更新 `--name`、`--desc`、`--report-type`、`--dsl-name`
  - 用显式 `--project-id --report-id` 而不是 URL 时，需要传 `--tea-site <site>` 让 titan 模式确定 tea-next host
  - 实际 endpoint：`PATCH /datafinder/api/v1/projects/<pid>/reports/<report_id>`（仅 titan 模式）
- `bytedcli tea dashboard subscribe-reports`
  - 把已有 report 添加到 dashboard：`--project-id <pid> --dashboard-id <did> --report-ids <rid1,rid2>`
  - 写接口仅支持 titan 模式，默认走扫码登录态
  - 默认会读取当前 dashboard reports/layout，保留已有卡片位置，只给新增 report 补自动布局，并 PATCH `layout/page_config`
  - `--no-update-layout`：只建立订阅关系，不修改 dashboard 布局
  - 订阅接口 body 同时传 `report_id` 和 `report_ids`；后端返回 `401003`（订阅关系已存在）时按幂等成功处理
  - 验证接口 `GET /projects/<pid>/dashboards/<did>/reports` 通常返回 `{ [dashboardId]: { reports, layout } }`
- `bytedcli tea get-dsl`
  - 输入：tea-next 报表链接（report）或快照链接（snapshot）
  - 输出：DSL JSON（文本模式直接打印到 stdout；JSON 模式输出 JSON Lines 的 data=DSL 本体，可直接 pipe 到 `tea query`）
  - `--tea-site <site>`：cn | va | sg | sglark | auto
  - `--auth-mode <mode>`：dataopen | titan | auto
  - `--project-id <projectId>`：TEA project_id（不传时优先从 URL 解析）
  - `--dashboard-id <dashboardId>`：仅 sglark titan 必填（sglark 没有 `/analysis/<id>/result` endpoint，要靠 `dashboards/<did>/reports` 兜底）；DataOpen 与 cn/va/sg titan 都不需要
  - `--tea-base-url <url>`：直接覆盖 DataOpen 基址（仅 dataopen 模式）
  - 实际 endpoint：
    - dataopen：`POST /dataopen/open-apis/datafinder/openapi/v1/projects/<pid>/dsls`，snapshot/report 通用
    - cn / va / sg titan：`GET /datafinder/api/v1/analysis/<id>/result?pack_dsl=1`，snapshot/report 通用，DSL 在 envelope 顶层 `dsl` 字段
    - sglark titan：`GET /datafinder/api/v1/dashboards/<did>/reports` 兜底，仅支持 report 类型 URL（带 `dashboardId`）；snapshot URL 不支持
- `bytedcli tea query`
  - **dataopen / cn-va-sg titan 模式**：输入 DSL JSON（`--dsl` 或 stdin），输出 analysis 数据
  - **sglark titan 模式**：需传 `--url` 或同时传 `--project-id/--dashboard-id/--report-id` 三元组；输出报表 analysis 数据
  - SG `tea-captain.tiktok-row.net` / `tea-captain.byteintl.net` 链接做 `get-dsl | query` 时，query 阶段也传同一个 `--url`；管道只传 DSL，不携带来源 host，只写 `--tea-site sg` 会回到默认 `tea-captain.tiktok-row.net`（旧 `tea-sg.tiktok-row.net` 已作为 alias 保留）
  - `--tea-site <site>`：cn | va | sg | sglark | auto
  - `--auth-mode <mode>`：dataopen | titan | auto
  - `--tea-base-url <url>`：直接覆盖 DataOpen 基址（仅 dataopen 模式）
  - 实际 endpoint：
    - dataopen：`POST /dataopen/open-apis/datafinder/openapi/v1/analysis`，同步返回数组
    - cn / va / sg titan：`POST /datafinder/api/v1/analysis` 返回 `{ result_id }`，CLI 自动轮询 `GET /datafinder/api/v1/analysis/<result_id>/result`；默认轮询超时取 `max(60s, --http-timeout-ms)`（结果尚未就绪时会输出 `result_id`/`status`，可重新执行同一条命令）
    - sglark titan：`POST /datafinder/api/v1/projects/<pid>/dashboards/<did>/reports/<rid>/analysis`
- `bytedcli tea behavior`
  - 查询行为细查行为流（behavior-detail/detail）。**仅 dataopen 模式可用，所有区域 titan 模式都不支持**（tea-next 内部 API `/datafinder/api/v1/...` 未暴露 `behaviors/flows_v3`），titan 调用会抛 `TEA_TITAN_NOT_SUPPORTED`。
  - API: `/dataopen/open-apis/datafinder/openapi/v1/projects/:project_id/behaviors/flows_v3`
  - `--url <url>`：tea-next `behavior-detail/detail` 链接，会自动解析 `project_id/query_id/query_type/appId/timestamp/eventFilterList/sort`
  - `--project-id <projectId>`：TEA project_id（不用 URL 时必填）
  - `--query-id <queryId>`：查询 ID，如 device_id / user_unique_id / user_id
  - `--query-type <queryType>`：`device_id` | `user_unique_id` | `user_id`
  - `--behavior-app-id <appId>`：行为细查请求体 `app_id`；注意不是 DataOpen 凭证 `--app-id`
  - `--start-time <ts>` / `--end-time <ts>`：秒或毫秒时间戳
  - `--events <events>`：精确事件名列表（逗号分隔），会下发为 OpenAPI `event_name` 做服务端前置过滤
  - `--dump <filepath>`：将原始行为流 JSON 写入文件；`--json` 模式下必须搭配 `--dump`
- `bytedcli tea get-event`
  - 查询事件元数据（event metadata）。**仅 dataopen 模式可用，所有区域 titan 模式都不支持**（tea-next 内部 API 未暴露 `metadata/list/events`），titan 调用会抛 `TEA_TITAN_NOT_SUPPORTED`。
  - API: `/dataopen/open-apis/datafinder/openapi/v1/metadata/projects/:project_id/list/events`
  - `--project-id <projectId>`：TEA project_id
  - `--events <events>`：事件名列表（逗号分隔，如 `example.play,example.view`），支持一个或多个事件，必填
  - `--status <status>`：事件状态列表（逗号分隔；可选值 0=审批中 1=已上报 3=停止采集 4=隐藏，默认 0,1,3,4）
  - `--with <with>`：附加返回信息（逗号分隔；可选值 params|virtual_params|property_dict|values|alias|event_groups|event_sample，默认 params）
  - `--dump <filepath>`：将原始 JSON 结果写入文件（相对路径基于工作目录）
- `bytedcli tea get-profile`
  - 查询用户属性元数据（user profile metadata）。**仅 dataopen 模式可用，所有区域 titan 模式都不支持**（tea-next 内部 API 未暴露 `metadata/list/user_profiles`），titan 调用会抛 `TEA_TITAN_NOT_SUPPORTED`。
  - API: `/dataopen/open-apis/datafinder/openapi/v1/metadata/projects/:project_id/list/user_profiles`
  - `--project-id <projectId>`：（必填）TEA project_id
  - `--names <names>`：用户属性名列表（逗号分隔，如 `country,age`；不传则返回全部）
  - `--status <status>`：用户属性状态列表（逗号分隔，如 `0,1`；可单独使用，不依赖 `--names`）
  - `--region <region>`：DataOpen 区域（如 `va`、`sg`），用于自动推导 DataOpen 基址
  - `--dump <filepath>`：将原始 JSON 结果写入文件（相对路径基于工作目录）；`--json` 模式下必须搭配 `--dump`
- `bytedcli tea dsl2link`
  - 根据 DSL 生成 tea-next 分析结果链接。**仅 dataopen 模式可用，所有区域 titan 模式都不支持**（tea-next 内部 API 未暴露 `dsls/jumper`），titan 调用会抛 `TEA_TITAN_NOT_SUPPORTED`。
  - API: `/dataopen/open-apis/datafinder/openapi/v1/projects/:project_id/dsls/jumper`
  - `--query-type <queryType>`：查询类型（不传时从 DSL 的 `content.query_type` 自动推断）；可选值 `event-analysis` | `retention-analysis` | `funnel-analysis` | `compositon-analysis` | `pathfind-analysis` | `life_cycle-analysis` | `distribution-analysis`
  - DSL `content.query_type` 自动映射：`event`→`event-analysis`, `retention`→`retention-analysis`, `funnel`→`funnel-analysis`, `path_find`→`pathfind-analysis`, `life_cycle`→`life_cycle-analysis`, `event_topk`→`distribution-analysis`, `composition`→`compositon-analysis`
  - `--dsl <dslJson>`：DSL JSON（字符串形式；也支持从 stdin 读取）
  - `project_id` 从 DSL 的 `resources[0].project_ids[0]` 自动提取，无需手动指定

### analysis 语义化查询

`bytedcli tea analysis <model>` 把 7 个分析模型封装成语义化子命令，CLI 自动构造 DSL 并投递 `/analysis`，无需手写 JSON。它支持 dataopen cn/va/sg 与 titan cn/va/sg；sglark titan 不支持裸 `/analysis`，需要 sglark 时请改用 `tea query --url <tea-next-report-url>` 或 `tea query --project-id <pid> --dashboard-id <did> --report-id <rid>` 的三元组报表路径。所有子命令共享下列通用 option：

- `--project-id <projectId>`：**必填**，有效 TEA project_id（缺失或非正整数报 `TEA_INPUT_ERROR`）；可从 tea-next 看板 URL 的 `/project/<id>/` 段获取
- `--last <Nd|Nw|Nm>`：时间窗口，格式 `<数字><d|w|m>`，如 `30d` / `4w` / `3m`（默认 `30d`）
- `--limit <n>`：结果行数上限（默认 50，不是分页 `--page-size`）；达上限会在输出里提示截断（请缩小窗口或调大 `--limit`）
- `--no-validate`：跳过事件/属性预校验，直接构造 DSL 并查询（titan 模式自动跳过）
- `--print-dsl`：只打印 CLI 构造出的 DSL，不鉴权、不发请求；需要实际 HTTP 请求/响应时，用全局参数 `bytedcli --http-debug tea analysis ...`
- 认证 / 站点与 `tea query` 一致：`--region` / `--app-id` / `--app-secret` / `--tea-site` / `--auth-mode` / `--tea-base-url` / `--dump`；默认 `--auth-mode auto`，有 DataOpen 凭据时走 dataopen，否则 cn/va/sg 可回退 titan；JSON 输出使用全局 `bytedcli --json tea analysis ...`

成功查询默认只输出归一化摘要，不落盘原始响应；若显式传 `--dump <filepath>`，则把完整原始 JSON 写入指定路径，并在输出中返回路径。终端不直接展开原始响应，避免大体量数据刷屏。

属性字段统一支持类型后缀：`:common`（默认，公共事件属性）/ `:event`（事件私有属性）/ `:profile`（用户属性，注意不是 `user_profile`）。

- `bytedcli tea analysis event`
  - `--event <name>`：事件名（必填）
  - `--indicator <ind>`：`count`(总次数PV) / `users`(总人数UV) / `penetration`(渗透率) / `per-user`(人均次数) / `per-active`(全活跃人均) / `measure`(自定义度量)
  - `--measure-property <field>`：度量属性字段（需显式 `--indicator measure`，否则本地拒绝，避免静默退回基础指标）
  - `--measure-agg <agg>`：9 种聚合 `sum`/`min`/`max`/`avg`/`per-user`/`per-active`/`distinct`/`distinct-user`/`pct`（仅 event 全支持）
  - `--percentile <n>`：分位点（`measure-agg=pct` 必填，如 50/90；缺则 400012）
  - `--group <field>`：分组维度，可重复或逗号分隔
  - `--filter <expr>`：事件级过滤（按事件属性筛行，表达式可重复，多条默认 AND）
  - `--cohort <spec>`：用户分群对比（按用户画像分组对照）
  - `--granularity <g>`：`minute`/`five_minute`/`ten_minute`/`fifteen_minute`/`thirty_minute`/`hour`/`day`/`week`/`month`（禁 `all`）
  - `--compare <type>`：环比 `last-cycle`/`last-week`/`last-month`/`last-year`，需配 `--period-start-ts`/`--period-end-ts`（秒级时间戳）指定当前周期
  - `--filter` 表达式语法：`<字段[:类型]><操作符><值>`，操作符支持 `=` `!=` `>` `<` `>=` `<=` `in` `not_in` `contain` `not_contain` `match` `not_match` `is_null` `is_not_null`；多条 `--filter` 之间为 AND
- `bytedcli tea analysis funnel`
  - `--steps <e1,e2,...>`：旧写法，漏斗步骤事件，逗号分隔或重复传入（至少 2 个，按顺序为步骤；每步无独立 filter）
  - `--step <event>` + `--step-filter <expr>`：新写法，`--step` 可重复；每个 `--step-filter` 归属最近一个 `--step`，用于同名事件按场景钉住。`--step-filter` 是事件级过滤，只支持 `:common`/`:event`，用户属性请用 `--cohort`。`--steps` 与 `--step` 二选一
  - `--window-period <n>` + `--window-unit <second|minute|hour|day>`：转化窗口；`--no-window` 关闭窗口（不限制转化时长）
  - `--unordered`：无序漏斗（默认有序，前一步发生后才计后一步）
  - `--relation <field>`：步骤关联属性
  - `--group <field>`：分组维度（只作用于首步 step1）；`--cohort <spec>`：用户分群
  - `--granularity <g>`：禁 `minute`(1分)；支持 `five/ten/fifteen/thirty_minute`/`hour`/`day`/`week`/`month`/`all`
  - funnel 无 indicator/measure 概念，只算各步转化率与转化人数
- `bytedcli tea analysis retention`
  - `--init-event <e>`：初始行为事件（如注册/首次播放）
  - `--return-event <e>`：回访行为事件（次日及之后是否再次发生）
  - `--group <field>` / `--cohort <spec>`：分组维度 / 用户分群
  - `--granularity <day|week|month>`：仅支持 day/week/month（分钟级/小时/all 全报 400012）
  - retention 无 indicator/measure 概念，输出留存矩阵（各周期回访率）
- `bytedcli tea analysis composition`
  - `--group-by <field>`：构成维度（必填，可重复或逗号分隔，支持多维交叉）；用户属性写 `:profile`
  - `--cohort <spec>`：限定参与构成的用户群（不传则统计全量用户）
  - 固定按 `all` 周期聚合，无 indicator/measure/granularity 概念，输出各维度取值的用户数构成
- `bytedcli tea analysis path-find`
  - `--start <event>` + `--end <event>`：旧写法，起点与终点事件，必须同时提供（不能用 `any_event`，报 400014）
  - `--node <event>` + `--node-filter <expr>`：新写法，`--node` 可重复且至少 2 个；第一个为起点，每个 `--node-filter` 归属最近一个 `--node`，用于多节点路径或同名事件按场景钉住。`--node-filter` 是事件级过滤，只支持 `:common`/`:event`，用户属性请用 `--cohort`。`--start/--end` 与 `--node` 二选一
  - `--window-period <n>` + `--window-unit <second|minute|hour|day>`：会话窗口
  - `--group <field>`：按起点事件属性分组；`--cohort <spec>`：用户分群
  - 专属 option 字段缺失会报 400056，CLI 已自动补齐；输出桑基图节点数据
- `bytedcli tea analysis life-cycle`
  - `--event <name>`：事件名
  - `--mode <active|lost>`：active（活跃视角，返回 4 种用户类型）/ lost（流失视角，返回 3 种用户类型）
  - `--period <n>` + `--period-granularity <day|week|month>`：一个生命周期的长度（如 7 天为一个周期判断活跃/流失）
  - `--group <field>` / `--cohort <spec>`：分组维度 / 用户分群
  - `--granularity <day|week|month|all>`：仅支持 day/week/month/all（分钟级/小时报 400012）
  - 输出二维数据：每个阶段的用户数与占比（%）
- `bytedcli tea analysis distribution`
  - `--event <name>`：事件名
  - `--indicator <ind>`：基础指标；**做度量分布必须显式 `--indicator measure`**（只传 `--measure-property`/`--measure-agg` 而不带 `--indicator measure` 会被拒：`TEA_INPUT_ERROR`，避免静默退回基础指标查出错数）
  - `--measure-property <field>`：要分布的度量字段（需 `--indicator measure`；注意写对类型后缀，如事件参数加 `:event`）
  - `--measure-agg <agg>`：**仅 6 种** `sum`/`avg`/`max`/`min`/`distinct`/`distinct-user`（不支持 `per-user`/`per-active`/`pct`，传了报 400000）
  - `--buckets <n>`（自动等分桶数）与 `--breaks <list>`（自定义断点列表，右闭左开）二选一，不能同时使用
  - `--group <field>` / `--cohort <spec>`：分组维度 / 用户分群
  - `--granularity <g>`：全支持含 `all`（与 event 相反，event 禁 all，distribution 可用 all）

通用错误码：`400012`（measure_info 错误，`measure-agg=pct` 缺 `--percentile`，后端字段 `measure_value`）/ `400014`（路径参数错，path-find 用 any_event）/ `400055`（`DB::Exception`，通常是查询计算量过大被后端数据库引擎拒绝执行，优先缩短 `--last`、降低粒度、减少分组或拆小查询）/ `400056`（path-find 缺专属字段）/ `400062`（属性类型填错）/ `400108`（无权限，需在 TEA App 页申请功能包）/ `400114`（认证失败）。

所有子命令都支持全局 `bytedcli --json ...`（JSON Lines 输出）与 `--dump <filepath>`。

## Sites

| 区域      | 值       | 前端入口 host（用户浏览器）                       | DataOpen 基址（办公网）                         | DataOpen 基址（生产网）                       | Titan internal host                                                   |
| --------- | -------- | ------------------------------------------------- | ----------------------------------------------- | --------------------------------------------- | --------------------------------------------------------------------- |
| 中国      | `cn`     | `data.bytedance.net` / `tea.bytedance.net`        | `data.bytedance.net/dataopen/open-apis`         | 同左                                          | `data.bytedance.net`                                                  |
| Virginia  | `va`     | `tea-va.bytedance.net` 或 `tea-va.tiktok-row.net` | `data-va.tiktok-row.net/dataopen/open-apis`     | `data-va.bytedance.net/dataopen/open-apis`    | `tea-va.bytedance.net` 或 `tea-va.tiktok-row.net`（与 URL host 一致） |
| Singapore | `sg`     | `tea-captain.tiktok-row.net`                       | `tea-captain.tiktok-row.net/dataopen/open-apis` | `tea-captain.byteintl.net/dataopen/open-apis` | `tea-captain.tiktok-row.net`（旧 `tea-sg.tiktok-row.net` 作为 alias） |
| SG Lark   | `sglark` | `tea-sglark.bytedance.net`                        | —（titan only）                                 | —                                             | `tea-sglark.bytedance.net`                                            |

`--tea-site auto` 会按 URL host 自动推断（识别 `data.bytedance.net` / `tea.bytedance.net` / `tea-va.bytedance.net` / `tea-va.tiktok-row.net` / `data-va.tiktok-row.net` / `data-va.bytedance.net` / `tea-captain.tiktok-row.net` / `tea-captain.byteintl.net` / `dataopen-sg.tiktok-row.net` / `tea-sg.bytedance.net` / `tea-sg.tiktok-row.net` / `tea-sglark.bytedance.net`）；`--tea-base-url <url>` 可直接覆盖 DataOpen 基址（海外私有部署场景）。

VA 区域的 titan host 会保留 URL 中的实际 host：用户给的链接是 `tea-va.tiktok-row.net` 时，CLI 会同时把 cookie 签发与后续请求都发到 `tea-va.tiktok-row.net`，避免被改写到 `tea-va.bytedance.net` 后命中错误后端。

SG 的 `tea-captain.tiktok-row.net` / `tea-captain.byteintl.net` 是 DataOpen origin，也能服务 analysis/snapshot。`tea get-dsl --url <tea-captain-url>` 会保留 URL host；但文本管道只把 DSL 传给 `tea query`，不会把来源 host 传过去。推荐写法：

```bash
URL='https://tea-captain.tiktok-row.net/tea-next/project/<pid>/event-analysis/result/<snapshot-id>'
bytedcli --json tea get-dsl --tea-site auto --auth-mode titan --url "$URL" | \
  bytedcli --json tea query --tea-site auto --auth-mode titan --url "$URL"
```

如果 query 阶段只写 `--tea-site sg --auth-mode titan`，CLI 按 sg 默认 host 走 `tea-captain.tiktok-row.net`。旧 `tea-sg.tiktok-row.net` 已作为 alias 保留，仍然兼容。

**生产网模式**：在 ByteDance 生产网（如 FaaS、TCE 容器）中运行时，设置 `BYTEDCLI_NETWORK_PROFILE=prod` 可将 VA / SG 的 DataOpen 域名自动切换为生产网可达的内部域名（见上表"生产网"列）。CN 不受影响。

## Inputs

### Dashboard URL

`.../tea-next/project/<project_id>/dashboard/<dashboard_id>`

### Report URL

`.../tea-next/project/<project_id>/event-analysis/<report_id>?dashboardId=<dashboard_id>`

### Snapshot URL

`.../tea-next/project/<project_id>/event-analysis/result/<snapshot_id>`

### Behavior detail URL

`.../tea-next/project/<project_id>/behavior-detail/detail?query_id=<id>&query_type=<type>&appId=<app_id>&timestamp=<start_ms>&timestamp=<end_ms>&eventFilterList=%5B%5D`
