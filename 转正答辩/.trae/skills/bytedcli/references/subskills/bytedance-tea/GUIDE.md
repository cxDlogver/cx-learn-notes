---
name: bytedance-tea
description: "Operate TEA (DataOpen / tea-next) via bytedcli: run semantic analysis queries (event/funnel/retention/composition/path-find/life-cycle/distribution) without hand-writing DSL, search dashboard info, list dashboard reports, inspect dashboard card report DSL, create reports from DSL, subscribe reports to dashboards, fetch report DSL from tea-next URLs, query analysis data by DSL, query behavior-detail event flows, generate analysis result links from DSL, query event metadata, and send TEA / ByteIO events. Supports multi-region (cn/va/sg/sglark). Use when tasks mention TEA, tea-next dashboards, reports, snapshots, DSL, DataOpen access_token, behavior detail, event flows, event metadata, event upload/reporting, creating reports, subscribing dashboard reports, generating analysis links, or analysis models like 事件分析/漏斗/留存/构成/路径/生命周期/分布."
---

# bytedcli TEA

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

**做数据分析时，先在 `tea analysis` 与 `tea query` 之间二选一：**

- **默认用 `tea analysis`**：做事件 / 漏斗 / 留存 / 构成 / 路径 / 生命周期 / 分布查询时，只要你能用「事件名 + 指标 + 过滤 + 分组」描述清楚要查什么，就用它——CLI 自动构造 DSL，**你不需要懂 DSL**。前置条件：必须提供有效的 `--project-id`（analysis 的 DSL 直接带 project_id，缺了会报 `TEA_INPUT_ERROR`；project_id 可从 tea-next 看板 URL 的 `/project/<id>/` 段获取）。需要检查 CLI 构造出的 DSL 时，加 `--print-dsl`，它只打印 DSL，不鉴权、不发请求。
- **仅当你手上已经有现成的 DSL JSON 时，才用 `tea query`**：比如 DSL 是你自己写好的，或先用 `tea get-dsl` 从 tea-next 看板 / 报表 / 快照链接提取出来的。`tea query` 只负责把现成 DSL 投递出去拿结果，不帮你构造。

其它能力：

- 需要从 tea-next 看板 / 报表链接提取 DSL（用 `tea get-dsl`，常配合 `tea query`）
- 需要从 tea-next 行为细查详情页查询用户行为流（behavior-detail/detail）
- 需要根据 DSL 生成 tea-next 分析结果链接
- 需要查看有权限的看板信息 / 看板内报表列表
- 需要用 DSL 创建 tea-next report，或把已有 report 添加到 dashboard
- 查询多个区域的 tea 数据，支持 cn、va、sg、sglark 地区
- 需要查询事件元数据（event metadata）
- 需要上报单条 TEA / ByteIO 事件（用 `tea event send`）

## Auth 模式

tea 子命令支持两种鉴权模式，通过 `--auth-mode` 选择，默认 `auto` 自动判定：

| 模式       | 适用                                                | 凭据来源                                                                      |
| ---------- | --------------------------------------------------- | ----------------------------------------------------------------------------- |
| `dataopen` | DataOpen openapi（cn / va / sg）                    | 环境变量 `TEA_APP_ID` + `TEA_APP_SECRET`，或 `--app-id` / `--app-secret` 参数 |
| `titan`    | tea-next 内部 API（cn / va / sg / sglark 全部支持） | `bytedcli auth login` 后自动换 `titan_passport_id` cookie                     |

判定优先级（`decideAuthMode`）：

1. 显式 `--auth-mode dataopen|titan` 最高优先
2. site 为 `sglark` → 强制 `titan`（sglark 不支持 DataOpen）
3. 当 `TEA_APP_ID`+`TEA_APP_SECRET` 均存在 → `dataopen`
4. 其他情况 → `titan`（cn / va / sg 在没有 DataOpen 凭据时会自动走 titan，无需申请 App，仅需扫码登录一次）

### Prerequisites (DataOpen 模式)

```env
TEA_APP_ID=123
TEA_APP_SECRET=***
```

申请地址：https://data.bytedance.net/dataopen/tea-next/app

### Prerequisites (titan 模式)

```bash
bytedcli auth login  # 扫码登录即可，无需申请 DataOpen App
```

### Region / Control plane

所有 tea 子命令支持 `--region` 或 `--tea-site` 切换控制面：

| 区域         | 值       | DataOpen 域名（办公网）                         | DataOpen 域名（生产网）                       | Titan internal 域名                                                    | DataOpen | Titan |
| ------------ | -------- | ----------------------------------------------- | --------------------------------------------- | ---------------------------------------------------------------------- | -------- | ----- |
| 中国（默认） | `cn`     | `data.bytedance.net/dataopen/open-apis`         | 同左                                          | `data.bytedance.net/datafinder/api/v1`                                 | ✅       | ✅    |
| Virginia     | `va`     | `data-va.tiktok-row.net/dataopen/open-apis`     | `data-va.bytedance.net/dataopen/open-apis`    | `tea-va.bytedance.net` 或 `tea-va.tiktok-row.net` `/datafinder/api/v1` | ✅       | ✅    |
| Singapore    | `sg`     | `tea-captain.tiktok-row.net/dataopen/open-apis` | `tea-captain.byteintl.net/dataopen/open-apis` | `tea-captain.tiktok-row.net/datafinder/api/v1`（旧 `tea-sg.tiktok-row.net` 作为 alias） |
| SG Lark      | `sglark` | —                                               | —                                             | `tea-sglark.bytedance.net/datafinder/api/v1`                           | ❌       | ✅    |

> cn / va / sg 三个区域 DataOpen 与 Titan 任选其一；如果没有 DataOpen App 凭据，可直接 `bytedcli auth login` 后用 `--auth-mode titan`（或留空 `--auth-mode` 让默认逻辑兜底）。SG Lark 仅支持 titan。
>
> VA 区域同时识别 `tea-va.bytedance.net` 与 `tea-va.tiktok-row.net` 两个 host，用户给的 URL host 会优先于 site 默认值，避免请求被改写到错误后端。
>
> SG 的 `tea-captain.tiktok-row.net` / `tea-captain.byteintl.net` 同时承担 DataOpen 与部分 analysis/snapshot 入口。`tea get-dsl` 通过 URL 能保留该 host；但 `get-dsl | tea query` 的管道只传 DSL，query 阶段若只写 `--tea-site sg` 会丢失来源 host。处理 tea-captain 链接时，query 阶段也传同一个 `--url`。
>
> **生产网模式**：在 ByteDance 生产网（如 FaaS、TCE 容器）中运行时，设置 `BYTEDCLI_NETWORK_PROFILE=prod` 可将 VA / SG 的 DataOpen 域名切换为生产网可达的内部域名（见上表"生产网"列）。CN 不受影响。

- `--tea-site cn|va|sg|sglark|auto`：显式选择控制面；`auto` 会按 tea-next URL host 自动推断（识别 `data.bytedance.net` / `tea.bytedance.net` / `tea-va.bytedance.net` / `tea-va.tiktok-row.net` / `data-va.tiktok-row.net` / `data-va.bytedance.net` / `tea-captain.tiktok-row.net` / `tea-captain.byteintl.net` / `dataopen-sg.tiktok-row.net` / `tea-sg.bytedance.net` / `tea-sg.tiktok-row.net` / `tea-sglark.bytedance.net`）
- `--tea-base-url <url>`：直接覆盖 DataOpen API 基址（仅 DataOpen 模式有效）

优先级：`--tea-base-url` > `--tea-site` > `--region`

## Quick start

```bash
# 语义化查询：事件渗透率（无需手写 DSL，CLI 自动构造并投递 /analysis）
# 这是 7 个分析模型之一；event/funnel/retention/composition/path-find/life-cycle/distribution 的完整用法见下方 `## tea analysis` 章节
# --project-id 必填（有效 TEA project_id，可从看板 URL 的 /project/<id>/ 段获取）
bytedcli tea analysis event --project-id 123 --event example.play --indicator penetration --last 30d

# 看板信息
bytedcli tea search --type dashboard_info --url https://data.example.net/tea-next/project/3/dashboard/7446993126637437450

# 看板内报表列表
bytedcli tea report list --dashboard-url https://data.example.net/tea-next/project/123/dashboard/456 --tea-site cn

# 用 DSL 创建 report（tea-next 写接口仅支持 titan 模式）
bytedcli tea report create --project-id 123 --name sample-report --dsl-file ./dsl.json --auth-mode titan --tea-site cn

# 获取已有 report 的 DSL，修改后可用于原地更新
bytedcli tea report get --project-id 123 --report-id 789 --tea-site cn --dsl-only > report.dsl.json

# 获取 dashboard card 使用的内嵌 report 配置（排查看板卡片渲染时优先用这个）
bytedcli --json tea report get --dashboard-url https://data.example.net/tea-next/project/123/dashboard/456 --report-id 789 --tea-site cn

# 原地更新已有 report，保留线上其它配置字段，只替换显式传入字段
bytedcli tea report update --project-id 123 --report-id 789 --tea-site cn --dsl-file ./report.dsl.json

# 把 report 订阅到 dashboard，并默认补齐 layout/page_config
bytedcli tea dashboard subscribe-reports --project-id 123 --dashboard-id 456 --report-ids 789 --auth-mode titan --tea-site cn

# 只建立 dashboard-report 订阅关系，不修改看板布局
bytedcli tea dashboard subscribe-reports --url https://data.example.net/tea-next/project/123/dashboard/456 --report-ids 789 --no-update-layout

# 从报表 URL 获取 DSL（report 类型）
bytedcli tea get-dsl --url https://data.example.net/tea-next/project/3/event-analysis/7447021494577660443?dashboardId=7446993126637437450

# 从快照 URL 获取 DSL（snapshot 类型）
bytedcli tea get-dsl --url https://data.example.net/tea-next/project/3/event-analysis/result/zaa4ac0427bb59b3fbc4589

# 获取 DSL 后直接查询（建议加 --json 便于机器读取）
bytedcli --json tea get-dsl --url https://data.example.net/tea-next/project/3/event-analysis/7447021494577660443 | \
  bytedcli --json tea query

# 根据 DSL 生成 tea-next 分析结果链接（DSL 通过管道传入，query-type 从 DSL 自动推断）
bytedcli tea get-dsl --url https://data.example.net/tea-next/project/3/event-analysis/7447021494577660443 | \
  bytedcli tea dsl2link

# 根据 DSL 生成链接（直接传入 DSL，query-type 从 DSL content.query_type 自动推断）
# 自动映射：event→event-analysis, retention→retention-analysis, funnel→funnel-analysis, path_find→pathfind-analysis, life_cycle→life_cycle-analysis, event_topk→distribution-analysis, composition→compositon-analysis
bytedcli tea dsl2link --dsl '{"resources":[{"project_ids":[55]}],"content":{"query_type":"event"}}'

# 也可以显式指定 --query-type 覆盖自动推断
bytedcli tea dsl2link --query-type event-analysis --dsl '{"resources":[{"project_ids":[55]}],"content":{}}'

# 查询事件元数据
bytedcli tea get-event --project-id 123 --events example.play
bytedcli tea get-event --project-id 123 --events example.play,example.view

# 上报单条事件；默认从 bytedcli auth 解析当前用户作为 user_unique_id
bytedcli tea event send --app-id 123456 --event demo_click --param button=submit --param page=home

# 调试上报 payload，不真正发送
bytedcli tea event send --app-id 123456 --event demo_click --params-json '{"page":"home","duration_ms":120}' --dry-run

# 纯设备事件：禁用自动用户解析，显式传 device_id
bytedcli tea event send --app-id 123456 --event device_boot --no-auto-user --device-id device-1

# 查询行为细查行为流（URL 自动解析 project/query/app/time/eventFilterList）
bytedcli tea behavior --url 'https://data.bytedance.net/tea-next/project/<project_id>/behavior-detail/detail?query_id=<id>&query_type=device_id&appId=<app_id>&timestamp=<start_ms>&timestamp=<end_ms>&eventFilterList=%5B%5D&sort=desc' --dump ./behavior.json

# 行为细查：用精确事件名做服务端前置过滤，避免拉取大量无关埋点
bytedcli tea behavior --project-id 123 --behavior-app-id 456 --query-id '<device_id>' --query-type device_id --start-time 1776096000 --end-time 1776182399 --events example.play,example.view --dump ./behavior.json

# 查询事件元数据（VA 区域）
bytedcli tea get-event --project-id 123 --events example.play --region va

# 按 tea-next URL host 自动推断控制面
bytedcli tea get-dsl --tea-site auto --url https://tea-va.example.net/tea-next/project/302625/funnel-analysis/result/sample-snapshot-id

# 显式指定 VA 控制面
bytedcli tea get-dsl --tea-site va --url https://tea-va.example.net/tea-next/project/302625/funnel-analysis/result/sample-snapshot-id

# 直接覆盖 DataOpen 基址
bytedcli tea query --tea-base-url https://data-va.example.net/dataopen/open-apis --dsl '{"use_app_cloud_id":true,"version":3,"content":{}}'

# 查询事件元数据（JSON 输出数据量大，需搭配 --dump）
bytedcli tea get-event --project-id 123 --events example.play,example.view --json --dump ./events.json

# 查询事件元数据并将原始 JSON 写入文件
bytedcli tea get-event --project-id 123 --events example.play --with params,virtual_params --dump ./events.json

# VA 区域查询
bytedcli tea search --type dashboard_info --url https://data-va.example.net/tea-next/project/3/dashboard/7446993126637437450 --region va
bytedcli --json tea get-dsl --url https://data-va.example.net/tea-next/project/3/event-analysis/7447021494577660443 --region va | \
  bytedcli --json tea query --region va

# SG Lark 租户（titan 模式，扫码即用）
# 先扫码登录一次
bytedcli auth login

# 看板信息（sglark 自动走 titan 模式）
bytedcli tea search --type dashboard_info \
  --url https://tea-sglark.bytedance.net/tea-next/project/<pid>/dashboard/<did>

# 看板报表列表（sglark titan 模式下可直接从响应抽取 DSL）
bytedcli tea report list \
  --dashboard-url https://tea-sglark.bytedance.net/tea-next/project/<pid>/dashboard/<did>

# 拿某个 report 的 DSL（sglark titan 模式下 --dashboard-id 必填；URL 中含 /dashboard/<id> 会自动识别）
bytedcli tea get-dsl \
  --url https://tea-sglark.bytedance.net/tea-next/project/<pid>/event-analysis/<rid>?dashboardId=<did>

# 执行报表分析（sglark titan 模式走三元组 project/dashboard/report）
bytedcli tea query \
  --url https://tea-sglark.bytedance.net/tea-next/project/<pid>/dashboard/<did>/reports/<rid>

# cn / va / sg titan 模式（无需申请 DataOpen App，扫码即用）
bytedcli auth login

# cn 区域 titan 看板信息
bytedcli tea search --type dashboard_info --tea-site cn --auth-mode titan \
  --url https://data.bytedance.net/tea-next/project/<pid>/dashboard/<did>

# va 区域 titan 从 snapshot 链接拿 DSL（走 /analysis/<id>/result?pack_dsl=1，不需要 dashboardId）
bytedcli tea get-dsl --tea-site va --auth-mode titan \
  --url https://tea-va.tiktok-row.net/tea-next/project/<pid>/event-analysis/result/<snapshot-id>

# SG tea-captain 链接：query 阶段也传同一个 --url，避免管道只保留 DSL 后丢失来源 host
URL='https://tea-captain.tiktok-row.net/tea-next/project/<pid>/event-analysis/result/<snapshot-id>'
bytedcli --json tea get-dsl --tea-site auto --auth-mode titan --url "$URL" | \
  bytedcli --json tea query --tea-site auto --auth-mode titan --url "$URL"

# cn 区域 titan 执行查询（与 DataOpen 一样直接 pipe DSL，不需要三元组；CLI 自动轮询异步结果）
bytedcli --json tea get-dsl --tea-site cn --auth-mode titan \
  --url https://data.bytedance.net/tea-next/project/<pid>/event-analysis/result/<snapshot-id> \
  | bytedcli --json tea query --tea-site cn --auth-mode titan
```

## tea analysis（语义化查询，推荐）

`tea analysis` 把 7 个分析模型封装成语义化子命令：直接传事件名、指标、过滤、分组等显式 option，CLI 自动构造 DSL 并投递 `/analysis`，**不需要手写 JSON DSL**。优先用它来回答数据问题；只有需要手搓复杂 DSL（如多层组合指标、特殊 option）时才回退到「动态事件分析」流程。默认只输出归一化摘要，不落盘原始响应；需要保存完整原始结果时，显式传 `--dump <filepath>`，CLI 会把原始 JSON 写入指定路径并在输出中返回路径。

| 子命令                      | 模型     | 用途一句话                           | 关键参数                                                                              |
| --------------------------- | -------- | ------------------------------------ | ------------------------------------------------------------------------------------- |
| `tea analysis event`        | 事件分析 | 事件次数/人数/渗透率/人均/自定义度量 | `--event` `--indicator` `--measure-agg`/`--percentile` `--compare`                    |
| `tea analysis funnel`       | 漏斗分析 | 多步转化率与转化人数                 | `--steps` 或 `--step`/`--step-filter` `--window-period`/`--window-unit` `--unordered` |
| `tea analysis retention`    | 留存分析 | 初始行为后回访留存矩阵               | `--init-event` `--return-event` `--granularity`                                       |
| `tea analysis composition`  | 用户构成 | 当前用户群按维度统计用户数构成       | `--group-by`（必填）                                                                  |
| `tea analysis path-find`    | 路径分析 | 桑基图，从起点事件追踪后续路径       | `--start`/`--end` 或 `--node`/`--node-filter` `--window-period`                       |
| `tea analysis life-cycle`   | 生命周期 | 用户活跃/流失阶段流转                | `--event` `--mode` `--period`/`--period-granularity`                                  |
| `tea analysis distribution` | 分布分析 | 度量值落在各区间的分布               | `--event` `--measure-property`/`--measure-agg` `--buckets`/`--breaks`                 |

详细参数见 `references/tea.md` 的「analysis 语义化查询」段，示例见 `references/usages/usages.md`。

### 认证

`tea analysis` 复用与 `tea query` 完全一致的认证与站点参数：`--app-id`/`--app-secret`（或环境变量 `TEA_APP_ID`/`TEA_APP_SECRET`）、`--region`、`--tea-site`、`--tea-base-url`、`--auth-mode`。默认 `--auth-mode auto`：有 DataOpen 凭据时走 dataopen，否则 cn/va/sg 可回退 titan；sglark 仍强制 titan。

`tea analysis` 支持 dataopen cn/va/sg，也支持 titan cn/va/sg。sglark titan 不支持裸 `/analysis` 语义化查询；需要 sglark 时，优先用 `tea query --url <tea-next-report-url>` 或 `tea query --project-id <pid> --dashboard-id <did> --report-id <rid>` 走三元组报表路径。与 dataopen 唯一差异：titan 下**没有字段预校验**（元数据接口在 titan 不开放，CLI 自动降级跳过），填错事件名/属性名只能靠后端结果判断。

### Agent Guidance（跨 type 关键约束，构造查询前必读）

同一个参数/取值在不同模型下支持范围不同，构造命令前先确认下面这几条，避免后端报错。

- **granularity 白名单各 type 不同**：
  - event：支持 `minute`/`five_minute`/`ten_minute`/`fifteen_minute`/`thirty_minute`/`hour`/`day`/`week`/`month`，**禁用 `all`**（传 all 只返单天非整段）。
  - funnel：**不支持 `minute`(1分)**，支持 `five/ten/fifteen/thirty_minute`/`hour`/`day`/`week`/`month`/`all`。
  - retention：**仅 `day`/`week`/`month`**（分钟级/小时/all 全报 400012）。
  - life-cycle：**仅 `day`/`week`/`month`/`all`**（分钟级/小时报 400012）。
  - distribution：全支持，含 `all`（与 event 相反）。
- **measure 聚合方式**：event 支持全部 9 种（`sum`/`min`/`max`/`avg`/`per-user`/`per-active`/`distinct`/`distinct-user`/`pct`）；**distribution 仅 6 种**（`sum`/`avg`/`max`/`min`/`distinct`/`distinct-user`），不支持 `per-user`/`per-active`/`pct`（这三种聚合到单值，与分布语义冲突，传了报 400000）。`pct` 必须配 `--percentile`（分位点，如 50/90），缺则报 400012。funnel/retention/path-find/life-cycle 无 measure/indicator 概念。
- **funnel/path-find 节点级 filter**：`--step-filter` / `--node-filter` 是事件级过滤，只支持 `:common` / `:event`；用户属性筛选请用 `--cohort`（不要在节点级 filter 里写 `:profile`）。
- **path-find 有两种节点写法**：简单两点路径用 `--start X --end Y`；需要同名事件按场景钉住或多节点路径时，用重复 `--node`，并在对应节点后紧跟 `--node-filter`。节点不能用 `any_event`（报 400014）。按用户筛选继续用 `--cohort`。
- **属性类型后缀**：字段名后写 `:common`（默认，公共事件属性）/ `:event`（事件私有属性）/ `:profile`（用户属性）。事件私有属性必须显式写 `:event`（如 `duration:event`），否则按 common 解析报 400062。用户属性统一写 `:profile`（**不是 `user_profile`**，后端只认 `profile`）；用户属性的分组/过滤走用户级，CLI 已自动归位。
- **`--filter` vs `--cohort`**：`--filter` 是事件级过滤（按事件属性筛选行），`--cohort` 是用户分群对比（按用户画像分组对照）；两者语义不同、可叠加。
- **预校验开关**：`--no-validate` 跳过事件/属性预校验直接构造 DSL；titan 模式因元数据接口不开放会自动跳过预校验。
- **调试 DSL / HTTP**：`--print-dsl` 只打印 CLI 构造出的 DSL，不鉴权、不发请求；看实际 HTTP 请求/响应时，用全局参数 `bytedcli --http-debug tea analysis ...`。
- **常见错误码**：`400012` measure_info 错误（`measure-agg=pct` 缺 `--percentile`，后端字段 `measure_value`）/ `400014` 路径参数错（path-find 用 any_event）/ `400055` `DB::Exception`，通常是查询计算量过大被后端数据库引擎拒绝执行，优先缩短 `--last`、降低粒度、减少分组或拆小查询 / `400056` path-find 缺专属字段（CLI 已自动补齐）/ `400062` 属性类型填错 / `400108` 无权限（需在 TEA App 页申请功能包）/ `400114` 认证失败（token 无效）。

## 动态事件分析

如果用户期望根据指定事件进行多个维度下钻的复杂分析，参考 `references/usages/usages.md`的流程进行。

## Notes

- `tea search` 会从 URL 自动解析 `project_id` 与 `dashboard_id`；其中 `--type dashboard_reports` 底层同 `tea report list`，仅支持 titan 模式。
- `tea report create` 用 `--dsl` 或 `--dsl-file` 创建 report；写接口仅支持 titan 模式，默认走扫码登录态。若还要展示到看板，创建后继续执行 `tea dashboard subscribe-reports`。
- `tea report get` 读取已有 report 配置；`--dsl-only` 只输出 `dsls[--dsl-index].dsl_content`（默认 index 0），适合保存后局部编辑。若要导出后用 `report update` 写回，请使用普通 report detail 路径；dashboard 模式读取 card 内嵌配置，仅用于排查渲染差异。
- `tea report list` 列出 dashboard 当前绑定的 reports；仅支持 titan 模式。该接口单页全量返回，JSON 顶层 `total` 是后端 total，`page=1`，`page_size` = `total`（单页全量，避免 JSON 消费方误判为还有分页），`accessible_count` = 本次返回的可访问 reports 数。
- `tea report update` 原地更新已有 report；写接口仅支持 titan 模式，会先 GET 当前 report，再 PATCH 同一路径，保留线上其它字段，只替换显式传入的 `--dsl/--dsl-file`、`--name`、`--desc`、`--report-type`、`--dsl-name`。用显式 `--project-id/--report-id` 而不是 URL 时需要传 `--tea-site`。
- `tea dashboard subscribe-reports` 订阅已有 report 到 dashboard；写接口仅支持 titan 模式，默认会读取现有 reports/layout，保留已有卡片位置，只给新 report 自动补位置并 PATCH `layout/page_config`。若只想订阅不改布局，传 `--no-update-layout`。
- `tea dashboard subscribe-reports` 的订阅接口会同时传 `report_id` 和 `report_ids`；后端返回 `401003` 表示订阅关系已存在，CLI 按幂等成功处理。验证时 `GET /projects/<pid>/dashboards/<did>/reports` 的返回结构通常是 `{ [dashboardId]: { reports, layout } }`。
- `tea get-dsl` 支持从 stdin 读取 URL；`tea query`（DataOpen 模式）支持从 stdin 读取 DSL JSON。
- `tea behavior` 查询行为细查行为流，支持从 `/behavior-detail/detail` URL 自动解析 `project_id/query_id/query_type/appId/timestamp/eventFilterList/sort`。`--behavior-app-id` 是行为细查请求体 `app_id`；`--app-id` 是 DataOpen 凭证 app id。`--events` 会下发为 OpenAPI `event_name`，用于精确事件名服务端前置过滤。**注意：`--json` 模式下必须搭配 `--dump` 使用**，原始行为流会写入文件。
- `tea get-event` 查询事件元数据，必须提供 `--events`；`--events` 支持一个或多个事件，多个事件用逗号分隔。`--dump <filepath>` 可将原始 JSON 结果写入文件（相对路径基于工作目录）。**注意：`--json` 模式下必须搭配 `--dump` 使用**，原始数据量较大不适合直接输出到终端。
- `--region`：切换 DataOpen 区域（`cn` | `va` | `sg`，默认 `cn`）。使用管道联动时，每个子命令都需要指定 `--region`。
- `--tea-site`：切换控制面（`cn` | `va` | `sg` | `sglark` | `auto`）；需要按 tea-next URL host 路由海外控制面时优先推荐使用。
- SG tea-captain 链接（host 为 `tea-captain.tiktok-row.net` 或 `tea-captain.byteintl.net`）做 `get-dsl | query` 时，query 阶段也传原始 `--url`。现在 sg 默认 host 已切为 `tea-captain.tiktok-row.net`，管道只写 `--tea-site sg` 也能正确路由；但传 `--url` 仍是最稳妥的写法。
- `--tea-base-url`：直接覆盖 DataOpen API 基址，适合调试特殊网关或临时验证。
- `--auth-mode`：`dataopen` / `titan` / `auto`（默认），titan 模式下无需 TEA_APP_ID/SECRET，先 `bytedcli auth login` 扫码登录即可。
- `--project-id`：不传时优先从 URL 自动解析，兜底使用 3。

### Titan 模式说明

Titan 走的是 tea-next 的内部 API（`/datafinder/api/v1/*`），只暴露了一部分 endpoint。下面按命令列出实际能力：

| 命令                                  | dataopen                            | cn / va / sg titan                                                                           | sglark titan                                                                                        |
| ------------------------------------- | ----------------------------------- | -------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| `tea search --type dashboard_info`    | ✅                                  | ✅                                                                                           | ✅                                                                                                  |
| `tea search --type dashboard_reports` | ❌（dashboard reports 走 internal） | ✅ GET `/projects/<pid>/dashboards/<did>/reports`                                            | ✅ GET `/projects/<pid>/dashboards/<did>/reports`                                                   |
| `tea report create`                   | ❌（写接口仅 tea-next internal）    | ✅ POST `/projects/<pid>/reports`                                                            | ✅ POST `/projects/<pid>/reports`                                                                   |
| `tea report get/update`               | ❌（report 详情写回走 internal）    | ✅ GET/PATCH `/projects/<pid>/reports/<rid>`                                                 | ✅ GET/PATCH `/projects/<pid>/reports/<rid>`                                                        |
| `tea report list`                     | ❌（dashboard reports 走 internal） | ✅ GET `/projects/<pid>/dashboards/<did>/reports`                                            | ✅ GET `/projects/<pid>/dashboards/<did>/reports`                                                   |
| `tea dashboard subscribe-reports`     | ❌（写接口仅 tea-next internal）    | ✅ POST `/projects/<pid>/reports/subscription` + PATCH `/dashboards/<did>`                   | ✅ POST `/projects/<pid>/reports/subscription` + PATCH `/dashboards/<did>`                          |
| `tea get-dsl`                         | ✅ POST `/projects/<pid>/dsls`      | ✅ GET `/analysis/<id>/result?pack_dsl=1`（snapshot/report 都不需要 dashboardId）            | ✅ GET `/dashboards/<did>/reports` 兜底（需要 dashboardId；snapshot URL 不支持）                    |
| `tea query`                           | ✅ POST `/analysis`（同步）         | ✅ POST `/analysis`（异步：返回 `result_id` 后 CLI 自动轮询 `/analysis/<result_id>/result`） | ✅ POST `/reports/<rid>/analysis`（需要 project/dashboard/report 三元组，只能走 URL 或显式三个 ID） |
| `tea behavior`                        | ✅                                  | ❌（内部 API 未暴露 `behaviors/flows_v3`）                                                   | ❌                                                                                                  |
| `tea get-event`                       | ✅                                  | ❌（内部 API 未暴露 `metadata/list/events`）                                                 | ❌                                                                                                  |
| `tea get-profile`                     | ✅                                  | ❌（内部 API 未暴露 `metadata/list/user_profiles`）                                          | ❌                                                                                                  |
| `tea dsl2link`                        | ✅                                  | ❌（内部 API 未暴露 `dsls/jumper`）                                                          | ❌                                                                                                  |

要点：

- `sglark` 站点只支持 titan 模式；显式传 `--auth-mode dataopen --tea-site sglark` 会报错。
- `tea query` 在 cn / va / sg titan 下与 DataOpen 一样直接传 DSL（通过 `--dsl` 或 stdin），不需要三元组。`/analysis` 是异步 endpoint，CLI 默认轮询超时取 `max(60s, --http-timeout-ms)`；超时会输出 `result_id` 与最近状态，可用同一条命令重试。
- `tea get-dsl` 在 cn / va / sg titan 下走 `GET /analysis/<id>/result?pack_dsl=1`，对 snapshot 与 report URL 都适用，**不需要** `--dashboard-id`。
- `tea get-dsl` 在 sglark titan 下没有 `/analysis/<id>/result` 兜底，必须有 `--dashboard-id`（URL 中含 `dashboardId=` 或 `/dashboard/<id>` 时会自动解析）；snapshot URL 在 sglark 上不支持。
- `tea behavior` / `tea get-event` / `tea get-profile` / `tea dsl2link` 在所有区域 titan 模式下都不支持（tea-next 内部 API 没有对应路径），会报 `TEA_TITAN_NOT_SUPPORTED`；想用这些命令必须切到 DataOpen 模式（cn/va/sg）。
