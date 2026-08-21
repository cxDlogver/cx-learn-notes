# Netlink

Netlink 相关能力用于排查域名接入、TLB servername 与 Location(path) 配置。

## 环境与站点

Use global `--site` to select the ByteCloud deployment. Per-service `--netlink-site` is a hidden alias for backward compatibility.

- CN: `--site cn`（默认）
- BOE: `--site boe`
- I18N(BD): `--site i18n-bd`
- I18N-TT: `--site i18n-tt`

站点差异（bytedcli 内部已处理）：

- CN/BOE：API host 在 ByteCloud 控制台域名下（`cloud.bytedance.net` / `cloud-boe.bytedance.net`），请求需要 `x-bcgw-tenant-id: bytedance`
- I18N：API host 为 `netlink-i18nbd.byteintl.net`，JWT 从 `cloud.byteintl.net` 获取
- I18N-TT：API host 为 `cloud.tiktok-row.net`，JWT 从 `cloud-i18n.bytedance.net` 获取
- forward-proxy：部分接口使用 Netlink 独立网关（如 CN 搜索走 `netlink.bytedance.net`），而详情仍在 ByteCloud 控制台网关下

## 命令映射

- `netlink search-domain`：通过 domain list 搜索域名，返回 `servername_id/namespace_id` 等信息
- `netlink list-services`：通过 PSM 反查部署信息（上游精确匹配，不支持模糊），走 v2 `list_router` 接口，文本表格展示域名(`ServiceName`)、集群(`TLB Cluster`)、部署路径(`Location` Name)，并按「域名 + 路径」聚合（仅集群不同则合并到同一行）；`--json` 返回未聚合的原始 `routers` 行
- `netlink list-domain-configs`：拉取 servername 详情并列出所有 Location
- `netlink search-path`：在 servername locations 中按关键字搜索
- `netlink get-path-config`：获取单个 Location（支持 `=/path` 或 `/path`）
- `netlink get-topology`：按域名获取拓扑信息（best-effort）
- `netlink get-servername`：按 servername id 获取完整配置（best-effort）
- `netlink forward-proxy search`：按 account 搜索正向代理列表
- `netlink forward-proxy get`：获取正向代理详情（包含出口白名单 IP）；`--ips-only` 可仅输出白名单 IP 列表（每行一个）
- `netlink locate`：通过 URL 或域名+路径一步定位后端 PSM、代码仓库（Overpass）和匹配的 RPC 方法（Thrift IDL 解析）；支持 `--url` 或 `--domain` + `--path`，并支持通配域名兜底匹配（例如 FaaS `*.fn.bytedance.net`）；对于可访问的 HTTPS 目标，还会补发 `HEAD` probe 尝试提取 `x-gw-dst-psm` 等运行时 headers。对于 FaaS gateway 域名，若 probe 命中了 `x-gw-dst-psm`，CLI 会优先使用这个运行时目标 PSM 继续查询 repo / IDL
- `netlink observe log list`：查询 NetArch observe 日志明细
- `netlink observe log aggregate`：查询同一批 observe 日志明细后，在 CLI 本地按 response 字段聚合

## 参数

- `--unified-platform-id`：按特定业务平台过滤结果；需要收窄结果范围时显式指定

## NetArch Observe Log

Observe log 命令需要可用的 bytedcli 登录态；首次使用或认证失败时先执行 `bytedcli auth login`，也可以用 `bytedcli --json auth status` 检查当前认证来源。Agent 或脚本消费明细时优先对命令使用全局 `--json`，JSON 会保留完整 rows、查询窗口、region、返回条数和 warning 信息。聚合命令在全局 `--json` 模式下会保留每个 bucket 的完整 sample rows。

`netlink observe log list` 查询 NetArch observe 日志明细接口：

```bash
bytedcli --json netlink observe log list \
  --account-id "demo-account-id" \
  --business-id "demo-business-id" \
  --dataset-id "demo-dataset-id" \
  --region "China-North" \
  --duration 10m \
  --filter application_id:in:demo-app-id
```

也可以用绝对时间窗口：

```bash
bytedcli --json netlink observe log list \
  --account-id "demo-account-id" \
  --dataset-id "demo-dataset-id" \
  --region "China-North" \
  --start 1780214400 \
  --end 1780215000 \
  --filter-json '{"Field":"span_id","Operator":"in","Value":["demo-span-id"]}'
```

协议映射：

- `--account-id` -> `x-netarch-account-id` header，必填
- `--business-id` -> optional `x-netlink-business-id` header
- `--dataset-id` -> body `From`，必填
- `--region` / global `--vregion` -> body `Regions`；`--region` 可重复或逗号分隔，未传时回退全局 `--vregion`
- `--start` / `--end` or `--duration` -> body `StartTime` / `EndTime`；默认相对窗口可用于快速查询，精确复现页面结果时用绝对 Unix seconds；最大窗口 `7d`
- `--times` -> body `Times`，默认 `1`，最大 `100`
- `--where-json` / `--where-file` -> raw body `Where`
- `--filter-json` / `--filter field:operator:value1,value2` -> backend leaf filters wrapped in the browser-compatible nested `Where`
- `list --field` -> list 文本输出展示列；JSON 输出仍保留完整 row
- `list --limit` -> list 本地文本展示行数限制，不改变后端查询

Filter 优先级固定为 `--where-json/--where-file > --filter-json > --filter`。不同优先级不要混用；需要复杂嵌套条件或复现浏览器抓包时使用 raw `Where`，简单字段过滤使用 `--filter`。

`netlink observe log aggregate` performs local grouping over returned rows. It does not call a backend aggregation endpoint; it first queries the same detail rows as `list`, then groups them locally by `--group-by`. Missing fields are grouped as `(missing)`, and empty string values as `(empty)`. It does not expose `--field` or `--limit`; use `--sample-size` to control sample rows per bucket.

```bash
bytedcli --json netlink observe log aggregate \
  --account-id "demo-account-id" \
  --dataset-id "demo-dataset-id" \
  --region "China-North" \
  --duration 10m \
  --group-by span_id \
  --sample-size 3
```

When `returned_count` is close to or equals `100`, treat it as a possible backend soft cap. Narrow the time window with `--duration` or `--start`/`--end`, or add filters before drawing conclusions from the result set.

High-level error-code meaning:

- Auth errors: login/JWT state is missing, expired, or rejected by NetArch; run `bytedcli auth login` and retry.
- Input errors: required options, region fallback, time window, or filter JSON/compact filter syntax is invalid.
- API errors: NetArch returned a failure envelope, such as account, dataset, region, or permission rejection.
- Parse errors: the backend response shape did not match the expected observe-log success envelope.
