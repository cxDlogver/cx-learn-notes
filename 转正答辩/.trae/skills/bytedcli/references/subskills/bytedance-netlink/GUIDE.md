---
name: bytedance-netlink
description: "Operate Netlink (DNS/TLB/NetArch observe logs) via bytedcli: search domains, search paths, look up deployment info by PSM, list domain configs, fetch topology/servername details, and query observe log rows across CN/BOE/I18N/I18N-TT. Use when tasks mention Netlink, NetArch observe logs, domain routing, path configs, or PSM deployment lookup."
---

# bytedcli Netlink

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

- Netlink 平台：域名检索、路由/Location 配置排查
- 在一个域名内搜索 path/location
- 拉取 servername(TLB) 配置与拓扑（best-effort）
- 通过 URL 或域名+路径定位后端 PSM、代码仓库和 RPC 方法

## 前置条件

- 使用通用调用方式：`../../invocation.md`
- 需要鉴权的命令先登录：`bytedcli auth login`

> 执行前缀见 `../../invocation.md`；下面示例直接写 `bytedcli`。

## Quick start

```bash
# 发现 Netlink 支持的站点（best-effort）
bytedcli netlink list-sites

# 搜索域名（CN 默认）
bytedcli netlink search-domain --keyword "api.example.com" --page 1 --page-size 10

# 通过 PSM 反查部署信息（域名 / 集群 / 部署路径）
bytedcli netlink list-services --psm "demo.example.service"
bytedcli netlink list-services --psm "demo.example.service" --page 1 --page-size 20

# 列出一个域名的所有 Location 配置（TLB servername locations）
bytedcli netlink list-domain-configs --domain "api.example.com"

# 搜索一个域名内的 path/location
bytedcli netlink search-path --domain "api.example.com" --keyword "demo-path"

# 查看具体 path 的配置（支持 =/path 或 /path）
bytedcli netlink get-path-config --domain "api.example.com" --path "=/v3/chat/demo-path"
bytedcli netlink get-path-config --domain "api.example.com" --path "/v3/chat/demo-path"

# 获取域名拓扑信息（best-effort）
bytedcli netlink get-topology --domain "api.example.com"

# 按 servername id 获取 TLB 完整配置
bytedcli netlink get-servername --servername-id 12345 --unified-platform-id 67890

# 切换环境（BOE / I18N / I18N-TT）
bytedcli --site boe netlink search-domain --keyword "example.com"
bytedcli --site i18n-bd netlink search-domain --keyword "docs.example.com"
bytedcli --site i18n-tt netlink search-domain --keyword "example.com"

# 需要结构化输出时加 --json
bytedcli --json netlink list-domain-configs --domain "api.example.com"

# 搜索正向代理（forward-proxy）
bytedcli netlink forward-proxy search --account "proxy-abc123"

# 获取正向代理出口白名单 IP（每行一个）
bytedcli netlink forward-proxy get --account "proxy-abc123" --cluster "normal_flow_fixed_l7" --ips-only

# 通过 URL 定位 PSM、代码仓库和 RPC 方法（一步到位）
bytedcli netlink locate --url "api.example.com/v1/demo-path"
bytedcli netlink locate --domain "api.example.com" --path "/v1/demo-path"

# JSON 输出
bytedcli --json netlink locate --url "api.example.com/v1/demo-path"

# 查询 NetArch observe 日志明细（JSON 适合 Agent/脚本消费）
bytedcli --json netlink observe log list \
  --account-id "demo-account-id" \
  --dataset-id "demo-dataset-id" \
  --region "China-North" \
  --duration 10m \
  --filter application_id:in:demo-app-id \
  --filter device_id:in:demo-device-id

# 按 response 字段做本地聚合
bytedcli --json netlink observe log aggregate \
  --account-id "demo-account-id" \
  --dataset-id "demo-dataset-id" \
  --region "China-North" \
  --duration 10m \
  --group-by span_id \
  --sample-size 3
```

## Notes

- 使用全局 `--site` 选择站点（`cn|boe|i18n-bd|i18n-tt`，默认 `cn`）。Per-service `--netlink-site` is a hidden alias for backward compatibility.
- `netlink list-services --psm <psm>` 走 v2 `list_router` 接口反查部署信息（上游按 PSM 精确匹配，不支持模糊）。文本表格展示三列：`ServiceName`(域名) / `TLB Cluster`(集群) / `Location`(部署路径)，并按「域名 + 路径」聚合，仅集群不同的结果合并到同一行的 `TLB Cluster` 列（逗号分隔），域名或路径不同则分行。`--json` 模式返回未聚合的原始 `routers` 行（每行含 `service_name` / `tlb_cluster` / `location`），不含聚合视图。JWT 与请求域名随 `--site` 自动切换。
- `--unified-platform-id` 用于按特定业务平台过滤结果；`list-domain-configs`、`search-path`、`get-path-config`、`get-topology` 会自动从域名的 `business.node_id` 解析，通常无需手动指定；`get-servername` 因无域名上下文，仍需显式传入
- `locate` 命令支持 `--url`（自动拆分域名和路径）或 `--domain` + `--path` 两种方式；它会依次查询 TLB 路由（Netlink）→ IDL 和仓库信息（Overpass）→ 解析 Thrift IDL 中的 RPC 方法；如果 Overpass 不可用，仍会返回 TLB 路由信息；域名查找支持通配域名兜底匹配，例如 FaaS `*.fn.bytedance.net`；对于可访问的 HTTPS 目标，还会补发 `HEAD` probe 尝试提取 `x-gw-dst-psm`、request id、trace id 等运行时 headers。对于 FaaS gateway 域名，若 probe 命中了 `x-gw-dst-psm`，CLI 会优先使用这个运行时目标 PSM 继续查询 repo / IDL
- `netlink observe log list` 调用 NetArch observe 日志明细接口，需要先完成 `bytedcli auth login`；必填 `--account-id`、`--dataset-id`，region 通过 `--region` 或全局 `--vregion` 提供，`--business-id` 是可选的 `x-netlink-business-id`。
- `netlink observe log aggregate` 不调用后端聚合接口；它先查询同一批 `data[]` 明细，再在 CLI 本地按 `--group-by` 字段分组统计。字段缺失归 `(missing)`，空值归 `(empty)`。
- Observe log 查询窗口使用 `--duration`，或使用 `--start` + `--end`；两种方式不要混用。
- Filter 优先级固定为 `--where-json/--where-file > --filter-json > --filter`。不要混用不同优先级；复杂嵌套条件用 `--where-file`。
- NetArch observe 返回的 row 字段很多；Agent 或脚本消费明细时优先对命令使用全局 `--json` 保留完整 rows。聚合命令在全局 `--json` 模式下保留每个 bucket 的完整 sample rows；文本模式默认展示紧凑字段，`list` 可以用 `--field` 指定展示列。
- 当返回 `returned_count` 接近或等于 `100` 时，按可能命中后端软上限处理，缩短时间窗口或增加过滤条件后重试。
- 常见错误码含义：认证失败通常是 JWT/登录态问题；输入错误通常是缺必填参数、时间窗口或 filter 格式不合法；API 错误表示 NetArch 后端拒绝请求；解析错误表示响应结构和 CLI 预期不一致。

## References

- `references/netlink.md`
