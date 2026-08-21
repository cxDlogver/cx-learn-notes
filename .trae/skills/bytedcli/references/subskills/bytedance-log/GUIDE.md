---
name: bytedance-log
description: "Operate log service via bytedcli: search logs by PSM/LogID/instance/pod, view log clusters; plus Footprint TCE Sync (tail/head/ls/grep on TCE pod log files for US-TTP / US-TTP2) and Footprint log URL downloads from footprint.tiktok-row.net, redirect_log.html, or concrete mljob-log-proxy file URLs. Use when tasks mention log search, logid lookup, instance logs, log clustering, Footprint, footprint.tiktok-row.net, TCE log, tce_search_mode, Primus executor log, mljob-log-proxy, 看 pod 日志, or tail/grep TCE 容器内日志."
---

# bytedcli Log

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

- 按 PSM / 时间搜索日志
- 按 LogID 查询日志
- 按接口维度查看 BytedTrace 总体性能分析
- 按 LogID 查看 BytedTrace 调用树与节点延迟
- 按环境 / 实例 / Pod 搜索日志
- 查看日志聚类
- Footprint TCE Sync pod 文件日志：`log footprint get`
- Footprint / Primus 日志 URL 下载：`log footprint download`

## 前置条件

- 使用通用调用方式：`../../invocation.md`

> 执行前缀见 `../../invocation.md`；下面示例直接写 `bytedcli`。

## 重试策略（Skill 行为）

- 默认不自动重试：日志查询命令执行失败时，不要在后台静默重跑。
- 失败后交互确认：首次失败后，必须清晰展示失败原因，并询问用户是否重试；用户确认后才进行下一次尝试。
- 可控重试次数：默认最多重试 1 次；若用户明确要求，可按用户给定上限执行，但是最多3次重试，且每一次重试都必须再次询问确认。
- 不建议重试的场景：参数校验失败（如缺少必填参数、格式错误）应提示用户修正参数，不进入重试流程。

## 查询策略（Skill 喜好）

- PSM 关键词查询默认不启用索引加速：除非用户明确要求开启索引（或明确要求短语查询），否则一律不加 `--enable-index`。
- LogID 查询优先级更高：当用户诉求包含某个/某些 LogID（即便同时给出 PSM），优先用 `log get-logid-log <logid> --psm <psm>` 查询。
- 如果用户明确要“先看接口总体瓶颈，再决定查哪些 logid”，优先用 `log analysis performance --psm <psm> --method <method> --start <time> --end <time>`。
- 如果用户明确要“看链路耗时 / 各节点延迟 / 调用树”，优先用 `log trace-tree --log-id <logid>`，不要继续用 `get-logid-log` 解析日志明细代替。
- 任何情况下不并发查询：同一轮对话中如需多次查询（多 LogID、多 PSM、多时间段），必须串行执行，上一条完成后再发下一条。
- 时间范围尽量精准且渐进扩展：优先使用用户给出的精确时间点（或从告警/工单/调用链获得的时间），先用 15m~30m 窗口定位；只有在证据不足时才逐步扩大窗口，避免一上来用小时级或天级范围。`get-logid-log` 支持 `--start`/`--end`（RFC3339 或 epoch 秒）显式指定时间范围，不传时由 `--scan-span` 推导。
- 超过 6 小时的 rolling 日志查询要按 6h 粒度串行执行：`search-psm-log`、`get-logid-log` rolling 模式（`--psm` 且未加 `--no-rolling`，或显式 `--rolling`）、`search-prod-instance-log`、`get-lane-instance-log` 在查询窗口超过 6h 时，会自动拆成多个不超过 6h 的时间片并串行请求；不要并发放大查询压力。
- 日志条数尽量最小且可控：`search-psm-log` 默认 `--max-logs 1000`；全量滚动需要显式传 `--max-logs 0`。`get-logid-log --psm` / `get-logid-log --rolling` 面向 LogID 定位，默认可全量滚动；首次排查仍优先显式设置较小的收集上限（如 `--max-logs 200`）与单次请求上限（如 `--limit 50` 或 `--limit 100`），只有用户明确要求全量 dump 时才使用 `--max-logs 0`。
- 扩大范围前先收窄条件：时间窗口不变时，优先通过 `--keyword/--exclude/--kv-filter/--idc` 收敛结果，再考虑扩大时间范围或提高 `--max-logs`。
- 大时间窗空查询要直接避免：当日志查询窗口超过 6h 且没有显式收窄条件（如 `--keyword`、`--exclude`、`--kv-filter`、`--level`、`--idc`）时，不要继续执行；先要求补充过滤条件或缩短时间范围。
- 关键词传参优先用重复选项：多关键词场景优先重复传 `--keyword/--exclude`（例如 `--keyword "a,b" --keyword "c"`），避免使用逗号分隔写法导致关键词内包含逗号时被误拆分。
- **vregion 必须显式指定**：`--vregion` 决定服务端去哪个区域的日志存储查数据，默认值按站点不同：`cn` 为 `China-North`，`boe` 为 `China-BOE`，`i18n`/`i18n-bd` 为 `Singapore-SaaS`，`i18n-tt` 为 `Singapore-Central`，`us-ttp`/`us-ttp-bdee`/`us-ttp-usts` 为 `US-TTP`。当目标服务部署在其他区域时，必须传正确的 `--vregion`（如 US-TTP 对应 useast5、`US-TTP2` 对应 useast8，必须显式传 `--vregion US-TTP2` 才会路由到 tx2 host），否则会在错误的区域查询，导致返回空结果。如果不确定目标区域，应先询问用户服务部署在哪个 region。

## Quick start

```bash
# PSM 日志搜索
bytedcli log search-psm-log --psm "psm.name" --start "2026-02-02T08:00:00" --end "2026-02-02T09:00:00"

# PSM 日志搜索（直接输出到控制台）
bytedcli log search-psm-log --psm "psm.name" --start "2026-02-02T08:00:00" --end "2026-02-02T09:00:00" --output console

# PSM 日志搜索（指定输出文件）
bytedcli log search-psm-log --psm "psm.name" --start "2026-02-02T08:00:00" --end "2026-02-02T09:00:00" --output file --output-file "/tmp/bytedcli.search.log"

# PSM 日志搜索（按 KV 过滤）
bytedcli log search-psm-log --psm "example.service.api" --keyword "deploy" --kv-filter "method=Deploy|Rollback" --kv-filter "_idc=lf|hl"

# PSM 日志搜索（按日志级别过滤）
bytedcli log search-psm-log --psm "example.service.api" --level Error --level Warn --max-logs 200 --output console

# PSM 日志搜索（错误/告警快捷过滤）
bytedcli log search-psm-log --psm "example.service.api" --error-warn --keyword "timeout" --max-logs 200

# PSM 日志搜索（多关键词按 OR 组合：命中任意关键词即返回，默认是 AND）
bytedcli log search-psm-log --psm "example.service.api" --keyword "GetFoo" --keyword "GetBar" --keyword-operator OR --max-logs 200 --output console

# PSM 日志搜索（超过 6h 会自动按 6h 串行分片）
bytedcli log search-psm-log --psm "example.service.api" --start "2026-02-02T00:00:00" --end "2026-02-02T18:00:00" --keyword "timeout" --output console

# PSM 日志搜索（索引加速查询：enable_index=true）
bytedcli log search-psm-log --psm "psm.name" --start "2026-02-02T08:00:00" --end "2026-02-02T09:00:00" --keyword "error" --enable-index

# PSM 日志搜索（索引加速 + 短语查询：is_term=true，不分词）
bytedcli log search-psm-log --psm "psm.name" --start "2026-02-02T08:00:00" --end "2026-02-02T09:00:00" --term "User not found" --enable-index

# PSM 日志搜索（BOE 的 boei18n 分区 US-BOE）
bytedcli --site boe --json log search-psm-log --psm "demo.psm" --vregion "US-BOE" --start "2026-04-16T21:08:48-07:00" --end "2026-04-16T21:33:48-07:00" --keyword "demo-keyword" --output console

# LogID 查询（提供 PSM 时默认自动使用 rolling __logid PSM search）
bytedcli log get-logid-log "20260202085428C91A145A63CB5F0B9D80" --psm "psm.name" --vregion "China-North"

# LogID 查询（禁用 rolling，改用 trace API 的 psm_list 过滤，适合 rolling 被限流时）
bytedcli log get-logid-log "20260202085428C91A145A63CB5F0B9D80" --psm "psm.name" --no-rolling --vregion "China-North"

# LogID 查询（显式 rolling：通过 PSM 日志搜索 + __logid KV 过滤滚动拉取并输出覆盖证明）
bytedcli log get-logid-log "20260202085428C91A145A63CB5F0B9D80" --psm "psm.name" --rolling --max-logs 0 --output console

# LogID 查询（全量 dump 快捷方式；需要提供 PSM）
bytedcli log get-logid-log "20260202085428C91A145A63CB5F0B9D80" --psm "psm.name" --dump --output file

# LogID 查询 + 日志级别过滤（rolling 模式，按 Error/Warn 过滤）
bytedcli log get-logid-log "20260202085428C91A145A63CB5F0B9D80" --psm "psm.name" --level Error,Warn --output console

# 接口总体性能分析（默认把完整结果落到本地文件）
bytedcli log analysis performance --psm "psm.name" --method "QueryFoo" --start "2026-02-02T08:00:00+08:00" --end "2026-02-02T09:00:00+08:00"

# 接口总体性能分析（默认 only-normal-trace=true；如需放宽可显式传 false）
bytedcli log analysis performance --psm "psm.name" --method "QueryFoo" --start "1776866375" --end "1776952775" --only-normal-trace false

# LogID 调用树（默认 region=China-North，默认 time_range_right_shift=600，并把完整结果落到本地文件）
bytedcli log trace-tree --log-id "sample-trace-logid-001"

# LogID 调用树（指定保存路径）
bytedcli log trace-tree --log-id "sample-trace-logid-001" --output-file "/tmp/trace-tree-demo.json"

# LogID 调用树（调整 trace 搜索窗口）
bytedcli log trace-tree --log-id "sample-trace-logid-001" --time-range-right-shift 900

# LogID 查询（BOE 的 boei18n 分区 US-BOE）
bytedcli --site boe log get-logid-log "20260417132015F8E8485573EF893978AE" --psm "demo.psm" --vregion "US-BOE" --output console

# LogID 查询（指定时间范围，RFC3339 或 epoch 秒；不传时由 --scan-span 推导）
bytedcli log get-logid-log "20260202085428C91A145A63CB5F0B9D80" --vregion "EU-Compliance2" --start "2026-06-12T05:31:02" --end "2026-06-12T05:41:02"

# LogID 查询（国际化，新加坡区域）
BYTEDCLI_CLOUD_SITE=i18n-bd bytedcli log get-logid-log "20260202085428C91A145A63CB5F0B9D80" --psm "psm.name" --vregion "Singapore-Central"

# LogID 查询（EU TTP 区域，支持 EU-Compliance2/EU-Compliance/EU-TTP/EU-TTP2/US-EastRed）
bytedcli --site eu-ttp log get-logid-log "20260202085428C91A145A63CB5F0B9D80" --vregion "EU-Compliance2"

# LogID 查询（直接输出到控制台）
bytedcli log get-logid-log "20260202085428C91A145A63CB5F0B9D80" --psm "psm.name" --vregion "China-North" --output console

# LogID 查询（指定输出文件）
bytedcli log get-logid-log "20260202085428C91A145A63CB5F0B9D80" --psm "psm.name" --vregion "China-North" --output file --output-file "/tmp/bytedcli.logid.log"

# 泳道实例日志
bytedcli log get-lane-instance-log "psm.name" --env "ppe_xxx" --start "2026-02-02T08:00:00"

# 生产实例日志（按 Pod）
bytedcli log search-prod-instance-log --psm "psm.name" --env prod --region "China-North" --range 1h --keyword "error"

# 生产实例日志（直接输出到控制台）
bytedcli log search-prod-instance-log --psm "psm.name" --env prod --region "China-North" --range 1h --keyword "error" --output console

# 生产实例日志（指定输出文件）
bytedcli log search-prod-instance-log --psm "psm.name" --env prod --region "China-North" --range 1h --keyword "error" --output file --output-file "/tmp/bytedcli.prod.instance.log"

# 日志聚类
bytedcli log get-log-cluster "psm.name" --start "2026-02-02T08:00:00"

# 日志聚类（按 KV 过滤，如日志级别）
bytedcli log get-log-cluster "psm.name" --start "2026-02-02T08:00:00" --kv-filter "level=ERROR|WARN"
```

## Notes

- `--start/--end` 支持 RFC3339 或时间戳（秒/毫秒），不传则默认近 1 小时
- `--start/--end` 的 RFC3339 形式支持显式时区偏移（如 `2026-04-16T21:08:48-07:00`、`2026-04-16T21:08:48+08:00`、`2026-04-16T21:08:48Z`）；不带偏移时按运行机器的本地时区解析，跨机器/跨时区场景建议显式带偏移避免歧义
- `--range` 和 `--start -1h` 相对语法仅 `search-prod-instance-log` 支持
- 日志查询时间范围上限为 7 天（`end - start <= 7d`），超出会报错
- `search-psm-log`、`get-logid-log` rolling 模式（`--psm` 且未加 `--no-rolling`，或显式 `--rolling`）、`search-prod-instance-log`、`get-lane-instance-log` 在查询窗口超过 6h 时，会自动拆成多个不超过 6h 的时间片并串行请求；JSON 输出会额外返回 `query_slices`，`retrieval_coverage` 中也会标记 `sliced/time_slices`
- 当 `search-psm-log`、`search-prod-instance-log`、`get-lane-instance-log` 的查询窗口超过 6h 且没有显式过滤条件时，CLI 会直接拒绝，避免长时间范围空查询
- `--keyword/--exclude` 支持重复或逗号分隔
- `search-psm-log` 可用 `--keyword-operator <AND|OR>` 控制多个 `--keyword`/`--term` 的组合方式：`AND`（默认）要求同一条日志命中全部关键词，`OR` 命中任意关键词即返回；JSON 输出会回显 `keyword_operator`
- `search-psm-log` 可用 `--enable-index` 开启索引加速查询（`enable_index=true`），适用于 PSM 关键词搜索
- `search-psm-log` 可用 `--term` 开启短语查询（`is_term=true`，不分词）；短语查询必须配合索引加速（`--enable-index`）
- `search-psm-log` 开启 `--enable-index` 时会提示二次确认 PSM 是否已开索引，并给出索引说明文档：`https://bytedance.larkoffice.com/docx/K1lHdQppSo0d1HxkAMscn1Wfnff`；非交互场景可加 `--yes` 跳过确认
- `search-psm-log` 默认 `--max-logs 1000`；JSON 输出会包含 `retrieval_coverage`（含 `verdict`、`pagination_proof`、`rounds`）证明本次拉取覆盖程度
- `search-psm-log` 支持 `--max-logs N` 显式限制收集条数；需要全量滚动到后端 `finished=true` 或 `--poll-timeout` 时，显式传 `--max-logs 0`
- `search-psm-log` 支持 `--level <level>` 日志级别过滤（可重复或逗号分隔），常用快捷方式：`--error-warn` 等价于 `--level Error --level Warn`，`--error-only` 等价于 `--level Error`
- `get-logid-log` 提供 PSM 时默认自动走 rolling 模式：用 PSM 日志滚动查询按 `__logid` KV 过滤，并返回同样的 `retrieval_coverage`；如果 rolling 被限流或只需要 trace API 的 PSM 过滤，可加 `--no-rolling`
- `get-logid-log` 在 rolling 模式下支持 `--level <level>`（可重复或逗号分隔）按日志级别过滤，快捷方式同 `search-psm-log`：`--error-warn`、`--error-only`；该过滤仅在 rolling 模式（提供 `--psm` 且未加 `--no-rolling`，或显式提供 `--rolling`/`--dump`）下生效，直查 trace 模式不支持，未提供 PSM 时传 `--level` 会报错并提示补 `--psm`
- `get-logid-log` rolling 文本导出默认透出全部字段；支持 `--fields` 指定字段导出（可重复或逗号分隔），仅影响 `--output console/file` 的文本内容，JSON 输出保持完整 payload
- `get-logid-log --dump` 是全量 rolling dump 快捷方式，等价于 `--rolling --max-logs 0`，需要同时提供 `--psm`
- `search-psm-log` 和 `get-log-cluster` 支持 `--kv-filter key=value1|value2`，可重复传递多个过滤条件
- `--idc` 在 `search-psm-log` 中会自动映射为 `_idc` 过滤
- `get-log-cluster` 使用 `--kv-filter` 可按日志级别等字段过滤聚类结果，例如 `--kv-filter "level=ERROR|WARN"`
- `search-psm-log` / `get-logid-log` 使用 `--vregion`，`search-prod-instance-log` / `get-lane-instance-log` 使用 `--region`；在 `i18n-tt` 站点时，`search-psm-log` / `get-logid-log` 不提供 `--vregion` 的话默认使用 `Singapore-Central`
- `log analysis performance` 使用 `--metrics-region`，默认 `cn`；它表示分析接口所使用的指标区域，不是 logservice 的 `--vregion`。
- `trace-tree` 使用 `--region`（BytedTrace region），首版默认 `China-North`；它不是 logservice 的 `--vregion`
- `log analysis performance` 默认把完整分析 JSON 保存到本地临时文件；可用 `--output-file` 指定路径；stdout 固定返回 summary preview，不支持 stdout JSON
- `log analysis performance` 默认使用 `--only-normal-trace true`；如需分析不完整链路，显式传 `--only-normal-trace false`
- 如果 agent 需要理解 `log analysis performance` 完整结果的字段语义，先看 `references/log.md` 里的“完整结果 JSON 关键字段语义”，不要只靠字段名猜测 `cost_in_us`、`called_percentage`、`analysis_span_histogram` 等含义
- `trace-tree` 默认把完整 trace JSON 保存到本地临时文件；可用 `--output-file` 指定路径；stdout 固定返回 summary preview，不支持 stdout JSON
- `trace-tree` 遇到 `others` / merge span 聚合导致下游挂载不稳定时，可能补充 `[raw]` 预览子节点；更精确的 parent-child 关系以保存下来的完整 payload 为准
- `--vregion` 默认值按站点不同：`cn` 为 `China-North`，`boe` 为 `China-BOE`，`i18n`/`i18n-bd` 为 `Singapore-SaaS`，`i18n-tt` 为 `Singapore-Central`，`us-ttp`/`us-ttp-bdee`/`us-ttp-usts` 为 `US-TTP`。该参数决定服务端在哪个区域的日志存储中查询，传错区域会导致查到空结果而非报错。常见 vregion 值：`China-North`、`Singapore-SaaS`、`Singapore-Central`、`US-East`、`US-EastBD`、`US-TTP`、`US-TTP2`、`China-BOE`、`US-BOE`、`EU-Compliance2`、`EU-Compliance`、`EU-TTP`、`EU-TTP2`、`US-EastRed`
- `--site i18n-bd --vregion US-EastBD` 会路由到 US-EastBD 专用 logservice（`logservice-us-eastbd.byted.org`），JWT 继续使用 `i18n-bd` 站点凭证，BCGW vregion/header 与请求体保留用户传入的 vregion。
- `--vregion US-TTP`（别名 `usttp`、`ttp-us`、`ttp-us-limited`）会自动路由到 US-TTP 专用 logservice（`logservice-tx.tiktok-us.org`，对应 `useast5`），JWT 获取走 `cloud-ttp-us.bytedance.net`
- `--vregion US-TTP2`（别名 `usttp2`、`ttp-us2`）会路由到 US-TTP2 专用 logservice（`logservice-tx2.tiktok-us.org`，对应 `useast8`），与 US-TTP 是独立的 vregion；JWT 同样走 `cloud-ttp-us.bytedance.net`
- `--vregion US-BOE`（BOE 的 boei18n 分区）会路由到 `logservice-boei18n.byted.org`，JWT 从 `cloud.bytedance.net`（bytedance SSO）获取，与 China-BOE 的 `logservice-boe.byted.org` + `cloud-boe.bytedance.net` 不同。使用方式：`bytedcli --site boe log search-psm-log --psm demo.psm --vregion US-BOE ...`（传错 China-BOE 分区会报 `vregion ... is not in the same site/partition`，error_code=101400）
- `--vregion` 支持 EU TTP 域的 5 个区域：`EU-Compliance2`、`EU-Compliance`、`EU-TTP`、`EU-TTP2`、`US-EastRed`。使用 `--site eu-ttp` 或 `--site i18n-tt` 时，这些 vregion 会自动路由到 `tiktok-eu.org` 域的专用 logservice，JWT 使用 i18n-tt 站点凭证
- 切换 i18n 站点时建议显式使用 `--site i18n-bd` 或 `--site i18n-tt`。认证隔离按 SSO 环境生效：`i18n-tt`、`eu-ttp` 与 `cn`/`i18n`/`i18n-bd` 隔离，使用前需先确认对应站点已登录（如 `BYTEDCLI_CLOUD_SITE=i18n-tt ... auth status`），否则可能报 `获取字节云 JWT 失败: 401`，详见 `../../troubleshooting.md`
- **建议在 `i18n-tt` 站点查询实例日志时显式指定 `--region`**：`search-prod-instance-log` 和 `get-lane-instance-log` 在 `--site i18n-tt` 时，不提供 `--region` 的话默认使用 `Singapore-Central`。如需查询其他区域的日志，建议显式传入 `--region`，例如 `--region "Singapore-Central"`、`--region "US-East"`等。常见的 i18n-tt 站点 region 值包括：`Singapore-Central`、`US-East` 等。
- `search-psm-log` / `get-logid-log` / `get-log-cluster` 等命令需要结构化输出时可加 `--json`（全局选项，放在子命令之前，如 `bytedcli --json log search-psm-log ...`）；`log analysis performance` 与 `trace-tree` 不支持 stdout JSON
- `search-psm-log` / `search-prod-instance-log` / `get-logid-log` 默认 `--output file`，会在控制台打印输出文件路径；可用 `--output console` 直接打印日志
- `search-psm-log` 文本导出默认透出全部字段；支持 `--fields` 指定字段导出（可重复或逗号分隔）
- `trace-tree` 默认直接输出文本树，不支持 `--output file|console` 切换；文本模式仍会打印保存下来的结果文件路径
- 日志时间统一按 UTC+8 输出
- **沙箱环境优先使用 `--output file`**：在沙箱环境（如 Trae IDE）中，`--output console` 可能因输出缓冲或权限限制导致结果不显示，建议使用默认的 `--output file`。
-

## Footprint (TCE Sync + URL Download)

`log footprint get` 封装 `footprint.tiktok-row.net` 的 TCE Sync 日志查看 API，直接在指定 TCE pod 的容器内本地文件系统上按 `--mode` 选择 `tail` / `head` / `ls` / `grep`。

`log footprint download` 封装 Footprint 的日志 URL 下载模型，输入 Footprint 页面 URL、Primus `redirect_log.html` URL 或直接的 concrete `mljob-log-proxy` 文件 URL，解析出最终 `applicationId` 后调用 `search-log` 与 `download-log` 下载内容。它适合 Primus executor 日志、EU-TTP Footprint 页面、以及长 executor pod 名导致 TCE Sync 报 `search keyword is too long` 的场景。

它们与上面的 `log search` / `log get-logid-log` / `log trace-tree` 等命令查的是不同来源：BytedLog 查询的是已采集日志库；Footprint TCE Sync 查 pod 文件系统；Footprint URL 下载查页面内嵌或直接给出的 concrete mljob-log-proxy 文件。

不要把 Footprint 页面、Primus `redirect_log.html` 或 `mljob-log-proxy` URL 传给 `log footprint get --file`；`get --file` 只接 pod 内文件名，例如 `app.log`。URL 型输入统一先判断是否为 concrete file URL：Footprint 页面、Primus `redirect_log.html`、concrete mljob 文件 URL 走 `log footprint download --url <url>`；plain mljob landing URL 不是文件，不能当作已可下载日志正文。

### 什么时候用 Footprint

- 想看某个具体 pod 当下还在写的最新日志、还没被采集滚动归档的内容 → 用 `log footprint get --mode tail` / `--mode grep`
- 已知 logid / trace_id、想跨 pod 查已采集字段 → 还是用前文的 `log search` / `log get-logid-log`
- 想看 pod 上 `/var/log/tiger` 目录下有哪些文件、各自多大 → `log footprint get --mode ls`
- 用户给的是 Footprint 页面、Primus `redirect_log.html`、或 concrete `mljob-log-proxy` 文件直链，尤其是 Primus executor 日志 → 用 `log footprint download --url <url>`

### 支持的 region

| `--region` 取值          | 页面 idc | backend 字段 `idc` |
| ------------------------ | -------- | ------------------ |
| `us-ttp`（别名 `ttp`）   | US-TTP   | `ttp`              |
| `us-ttp2`（别名 `ttp2`） | US-TTP2  | `ttp2`             |

CLI 暴露 `--region`（对齐仓库标准 flag），内部映射成 Footprint 后端的 `idc` 字段。其它机房暂未接入。

`log footprint download` 使用 `--region`（可省略，优先从 URL 推断），支持 `US-TTP` / `ttp` / `usttp` → `ttp`，`US-TTP2` → `ttp2`，`EU-TTP` / `euttp` → `eu_ttp_no1a`，`EU-TTP-GCP` / `euttp-gcp` → `eu_ttp_gcp`，`EU-TTP-USEAST2A` → `eu_ttp_useast2a`，`EU-TTP-USEAST2B` → `eu_ttp_useast2b`。

### Usage

```bash
# tail：默认 --lines 2000、--path /var/log/tiger
bytedcli log footprint get --mode tail --region us-ttp --psm example.service.rank --pod dp-xxx --file app.log

# head：默认 --lines 200
bytedcli log footprint get --mode head --region us-ttp --psm example.service.rank --pod dp-xxx --file app.log --lines 200

# ls：默认 --args "-alh"，--mode ls 不接受 --file
bytedcli log footprint get --mode ls --region us-ttp2 --psm example.data.gpu --pod dp-yyy

# grep：必填 --pattern，--lines 控制结果尾部裁剪行数（默认 1000）
bytedcli log footprint get --mode grep --region us-ttp --psm example.service.rank --pod dp-xxx --file app.log --pattern ERROR --lines 1000

# Agent 调用统一加 --json
bytedcli --json log footprint get --mode tail --region us-ttp --psm example.service.rank --pod dp-xxx --file app.log

# 日志 URL 型下载：Footprint 页面、redirect_log.html 或 mljob-log-proxy 直链
bytedcli log footprint download --url 'https://footprint.example/?applicationId=https%3A%2F%2Fmljob-log-us-proxy.example%2Fyodel-logs%2Fproxy%2Fdemo%2Frunner.log&idc=US-TTP'
bytedcli log footprint download --url 'https://mljob-log-us-proxy.example/yodel-logs/proxy/demo/dataio.log.INFO' --start '0-200000' --output ./dataio-front.log
bytedcli log footprint download --url 'https://mljob-log-eu-proxy.example/yodel-logs/proxy/demo/runner.log' --region EU-TTP-GCP --start '100-200' --output ./demo-runner.log
bytedcli --json log footprint download --url 'https://mljob-log-us-proxy.example/yodel-logs/proxy/demo/runner.log' --start '-200'
```

### Footprint Agent Guidance

- 用户只说 Footprint、给出 `footprint.tiktok-row.net` 页面、Primus `redirect_log.html`，或 concrete `mljob-log-proxy` 文件直链时，使用 `bytedcli log footprint ...`；当前 CLI 入口不是顶层 `bytedcli footprint`。如果 URL 是 mljob landing page（没有具体 `.log`/`.out`/`.err`/`.txt` 文件，或 Primus JSON 标记 `logResolutionStatus: "landing-only"`），不要把它当作 concrete file 下载；如果它来自 Primus role row，回到 `bytedcli primus log get --file-pattern <pattern>` 或 `bytedcli primus log list --fetch` 让 Primus 命令解析日志页。
- `--mode` 必填，取值仅 `tail` / `head` / `ls` / `grep`，1:1 映射后端 `tce_search_mode`。
- 默认日志路径 `/var/log/tiger`，绝大多数 TCE pod 都用这个；除非用户明确给了 `--path`，否则不要自己改。
- `--mode tail` / `head` / `grep` 必填 `--file`；`--mode ls` 不接受 `--file`（要看具体文件请改用 tail/head）。
- `--file` 只接 pod-local 文件名；如果用户手上是 Footprint / Primus / mljob URL，不要拆成 `get --mode tail/grep`，直接用 `log footprint download --url <url>`。
- `--mode grep` 必填 `--pattern`；CLI 会自动补 `| tail -n <--lines>`，用户不要自己拼，想控制条数改 `--lines` 即可。
- `--pattern` 的值会被**单引号包裹**后送到远端 `grep '<pattern>' | tail -n N`，因此 `|`、`;`、`&`、`$`、`<`、`>`、括号、花括号、双引号、反引号、空格都会被原样传给远端 grep（用来匹配 HTML 标签、价格、bash 片段、含管道符的日志等都没问题）。CLI 只拒绝会破坏单引号包裹本身的字符：`'`、`\`、`\n`、`\r`。需要在 pattern 里放单引号或换行时，让用户分多次 grep。
- Footprint 后端对所有 mode 的行数都有 2000 上限：`tail -n`/`head -n` 服务端会报 `tail: limit exceeded (max 2000)` / `head: limit exceeded (max 2000)`；CLI 在 tail、head、grep 上都把 `--lines` 上限统一卡在 2000（超过直接抛 `FOOTPRINT_INPUT_ERROR` 不发请求），需要更多日志请分多次串行查询。
- 文本输出按 `currentLine` 顺序逐行打印 `matched_pattern`；JSON 输出额外带 `mode`、`region`、`unique_search_id`、`status`、`line_count` 等元信息字段。
- `log footprint download` 支持从 Footprint query 的 `applicationId` / `logUrl` / `originUrl` / `url` 提取 concrete mljob-log-proxy URL，也支持 Primus `redirect_log.html` query 的 `originUrl` / `url`。若 URL query 里 `file` 双重 encode 了 `&pod_name=...&start=...`，CLI 会修复成最终 mljob-log-proxy query。
- `log footprint download --start` 支持 `0`、`100-`、`100-200`、`-200`，并写入最终 resolved mljob-log-proxy URL query；命令行 `--start` 会覆盖 URL 里已有的 `start`。较大的范围（例如 `0-200000`）会自动按后端可接受的窗口分片下载再拼接，不要手工改成只看 `-4096` 尾部。
- `log footprint download --json` 成功输出包含 `input_url`、`resolved_url`、`source`、`idc`、`start`、`byte_count`、`empty_content`；未指定 `--output` 时包含 `content`（大内容会截断并带 `content_truncated`），指定 `--output` 时包含 `output_file` 且不输出日志正文；不会输出 cookie/JWT/token。
- 部分 Primus concrete file 页面能被 Footprint 索引出来，但 `download-log` 返回空 `fileContent`；这时 JSON 里会有 `empty_content: true` 和 `empty_content_hint`。不要反复用同一空链接重试，回到 `primus log get` 选择另一个 concrete file，优先小的文本日志。
- 鉴权失败常见原因：当前账号没有 Footprint 访问权限，或某一侧 SSO session 过期。Footprint 横跨两套 SSO realm（`sso.tiktok-intl.com` + `sso.bytedance.com`），CLI 首次调用会驱动 i18n / tx 两条 cloud-X JWT 链和 footprint 自身的 `/api/login` CAS 回跳链来补齐 `bd_sso_3b6da9` + `titan_passport_id` + `api_sid` cookie。两个 jar 都必须有：报错时先让用户跑 `bytedcli auth status`；缺哪侧就补哪侧：tiktok 侧 `bytedcli --site i18n-tt auth login --session`，bytedance 侧 `bytedcli auth login --session`，再重试命令。

## References

- `references/log.md`
