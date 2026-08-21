---
name: bytedance-grafana
description: "Operate Grafana dashboards via bytedcli: dashboard info/search, panel data query, dashboard/group/panel/variable/link CRUD, Metrics link injection, and panel screenshots. Use when tasks mention Grafana dashboards, panels, groups, variables, links, panel data, or dashboard screenshots."
---

# bytedcli Grafana

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

- Grafana 大盘的增删查改
- 大盘分组（Row）管理
- 面板的创建、更新、删除、查询
- 大盘变量与链接管理
- Metrics 链接注入
- 搜索大盘、按 URL/UID 获取大盘摘要、按 panel 查询数据
- 面板截图

## 前置条件

- 使用通用调用方式：`../../invocation.md`
- 认证：Dashboard CRUD、搜索、变量、分组、面板元数据读取使用用户级 Grafana session（本地 cache 默认 7 天）；收到服务端 401 时会**自动重换 cookie 并重试一次**。`grafana query` 的 Metrics FE 已知面板直查和 Byteplot fallback 使用当前用户 ByteCloud JWT，可在纯服务器/远程 devbox 上运行，不依赖 Chrome cookie。
- 生产网用：`export BYTEDCLI_NETWORK_PROFILE=prod`（i18n-bd / i18n-tt / us-ttp / eu-ttp 切到 `-api` 域名）
- 自动 OAuth 失败兜底（极少数情况）：TTY 模式下提示从浏览器 DevTools 拷 `grafana_session_v1` cookie 粘贴；非 TTY 直接抛错并指引 `bytedcli auth login --session --auto`
- TTL 调节：`BYTEDCLI_GRAFANA_SESSION_TTL_HOURS=<n>`（默认 168）—— 仅影响本地 cache TTL，不影响 401 自愈行为

> 示例省略 invocation 前缀。

## Quick start

```bash
# Seed-style 便捷入口
bytedcli --json grafana search "demo service"
bytedcli --json grafana info "https://grafana.example.com/d/demo-uid/demo-slug?var-dc=lf&var-dc=hl"
bytedcli --json grafana query "https://grafana.example.com/d/demo-uid/demo-slug?var-dc=lf" --panel 123 --from now-30m --to now --var dc=hl
# 不知道 panel ID 时，先 info 看 panels[].id/title，再把选中的 id 传给 query
bytedcli --json grafana info "https://grafana.example.com/d/demo-uid/demo-slug?var-dc=lf"
bytedcli --json grafana query "https://grafana.example.com/d/demo-uid/demo-slug?var-dc=lf" --panel 123

# 大盘
bytedcli grafana dashboard get --url "https://grafana.example.com/d/demo-uid/demo-slug"
bytedcli grafana dashboard create --title "demo-dashboard"
bytedcli grafana dashboard update --uid "demo-uid" --title "demo-updated"
bytedcli grafana dashboard delete --uid "demo-uid"

# 分组
bytedcli grafana group list --url "https://grafana.example.com/d/demo-uid/demo-slug"
bytedcli grafana group create --url "https://grafana.example.com/d/demo-uid/demo-slug" --title "demo-group"
bytedcli grafana group get --url "https://grafana.example.com/d/demo-uid/demo-slug" --group-title "demo-group"

# 面板
bytedcli grafana panel list --url "https://grafana.example.com/d/demo-uid/demo-slug"
bytedcli grafana panel get --url "https://grafana.example.com/d/demo-uid/demo-slug" --panel-id 123
bytedcli grafana panel create --url "https://grafana.example.com/d/demo-uid/demo-slug" --panel-json '{"title":"demo-panel","type":"graph"}'
# 面板时序数据（原生 /api/tsdb/query，走 grafana_session cookie，避开 screenshot 504）
bytedcli --json grafana panel query --url "https://grafana.example.com/d/demo-uid/demo-slug" --panel-id 123 --from now-1h --to now --var applicationId=application_demo_123

# 变量
bytedcli grafana variable get --url "https://grafana.example.com/d/demo-uid/demo-slug"
bytedcli grafana variable update --url "https://grafana.example.com/d/demo-uid/demo-slug" --variables-json '[{"name":"interval","type":"custom","query":"30s,1m,5m"}]'

# 链接
bytedcli grafana link get --url "https://grafana.example.com/d/demo-uid/demo-slug"

# 工具
bytedcli grafana inject-metrics-links --url "https://grafana.example.com/d/demo-uid/demo-slug"
bytedcli grafana data --url "https://grafana.example.com/d/demo-uid/demo-slug?viewPanel=123"
bytedcli grafana screenshot --url "https://grafana.example.com/d/demo-uid/demo-slug?viewPanel=123"
```

## 命令速查

```bash
grafana search <keyword> [--limit <limit>]
grafana info <url-or-uid>
grafana query <url-or-uid> [--panel <id>] [--from <time>] [--to <time>] [--var <KEY=VALUE>] [--timeout <duration>]
grafana dashboard create --title <title> [--folder-id <id>] [--panels-json <json>] [--templating-json <json>] [--links-json <json>] [--grafana-session <token>]
grafana dashboard get (--uid <uid> | --url <url>) [--grafana-session <token>]
grafana dashboard update (--uid <uid> | --url <url>) [--title <title>] [--panels-json <json>] [--templating-json <json>] [--links-json <json>] [--grafana-session <token>]
grafana dashboard delete (--uid <uid> | --url <url>) [--grafana-session <token>]
grafana variable get (--uid <uid> | --url <url>) [--grafana-session <token>]
grafana variable update (--uid <uid> | --url <url>) --variables-json <json> [--mode <append|overwrite>] [--grafana-session <token>]
grafana link get (--uid <uid> | --url <url>) [--grafana-session <token>]
grafana link update (--uid <uid> | --url <url>) --links-json <json> [--mode <append|overwrite>] [--grafana-session <token>]
grafana group create (--uid <uid> | --url <url>) --title <title> [--collapsed] [--position-json <json>] [--grafana-session <token>]
grafana group get (--uid <uid> | --url <url>) (--group-id <id> | --group-title <title>) [--no-panels] [--grafana-session <token>]
grafana group list (--uid <uid> | --url <url>) [--keyword <keyword>] [--grafana-session <token>]
grafana group update (--uid <uid> | --url <url>) (--group-id <id> | --target-group-title <title>) [--title <title>] [--collapsed] [--position-json <json>] [--grafana-session <token>]
grafana group delete (--uid <uid> | --url <url>) (--group-id <id> | --group-title <title>) [--keep-panels] [--grafana-session <token>]
grafana panel create (--uid <uid> | --url <url>) --panel-json <json> [--group-id <id>] [--target-group-title <title>] [--position-json <json>] [--enable-compare <offsets>] [--grafana-session <token>]
grafana panel get (--uid <uid> | --url <url>) (--panel-id <id> | --panel-title <title>) [--grafana-session <token>]
grafana panel list (--uid <uid> | --url <url>) [--keyword <keyword>] [--grafana-session <token>]
grafana panel update (--uid <uid> | --url <url>) (--panel-id <id> | --panel-title <title>) [--panel-json <json>] [--group-id <id>] [--target-group-title <title>] [--position-json <json>] [--enable-compare <offsets>] [--grafana-session <token>]
grafana panel delete (--uid <uid> | --url <url>) (--panel-id <id> | --panel-title <title>) [--grafana-session <token>]
grafana panel query (--uid <uid> | --url <url>) [--panel-id <id> | --panel-title <title>] [--from <time>] [--to <time>] [--var <KEY=VALUE>] [--datasource <name>] [--datasource-id <id>] [--sql <sql>]
grafana inject-metrics-links (--uid <uid> | --url <url>) [--grafana-session <token>]
grafana data --url <url> [--timeout <duration>]
grafana screenshot --url <url> [--duration <duration>] [--end-time <time>] [--width <px>] [--height <px>] [--grafana-session <token>]
```

## 便捷查询入口

- `grafana info <url-or-uid>` 会合并输出 dashboard 标题、URL 中的 `var-*` 变量、模板变量列表和展开后的面板列表；collapsed row 内的子面板也会列出。JSON 模式下从 `data.panels[]` 读取 `id/title/groupTitle/datasource/targets_count`，用于选择下一步 `grafana query --panel <id>`。
- `grafana search <keyword>` 走 Grafana 原生搜索 API，返回匹配 dashboard 的 `uid/title/url/tags` 等字段。
- `grafana query <url-or-uid>` 会复用 URL 里的 `from/to/viewPanel/panelId/var-*`，也可用 `--panel`、`--from`、`--to`、重复 `--var KEY=VALUE` 覆盖；多值变量会按重复 `var-*` 参数保留。
- 当用户给的是 dashboard URL 且不知道 panel ID，不要猜 panel ID，也不要发明 `--panel-title` / `--panel-keyword` 参数；先执行 `bytedcli --json grafana info <url>`，根据用户意图在 `data.panels[]` 里挑选候选 panel，再执行 `bytedcli --json grafana query <url> --panel <id>`。若无法唯一判断，回复候选 panel 的 `id/title/groupTitle`。
- `grafana info/query` 支持现代 `/d/<uid>/<slug>` URL，也支持老式 `/dashboard/db/<slug>` URL；`query` 对已知 Forge 指标大盘的 fountain read 面板会本地转换为现代 URL，其他老式 URL 会先解析为真实 UID。
- `grafana query` 对已知 Forge 指标大盘的 fountain read 面板会优先从 URL 变量合成 Metrics FE Byteplot 查询；其余面板先尝试 Cloud Grafana OpenAPI，失败后读取 dashboard JSON，将 ByteTSD panel target 转成 Metrics FE Byteplot 查询。真正点位请求按 datasource / Grafana host 选择 CN / ROW / EU-TTP / US-TTP 对应 Metrics FE 后端。
- `grafana data` 是原始 Cloud OpenAPI data 入口；需要稳定查询面板点位时优先用 `grafana query`。
- `grafana panel query` 走 Grafana 原生 `/api/tsdb/query` 路径（复用 `grafana_session` cookie + 401 自动重换），适合需要拿面板**原始 SQL 时序列**（如 DTop 的 Yarn/Spark CPU/Mem used/alloc）且 `grafana data`/`screenshot` 经常 504 的场景。它内部会：`panel get` 读取 datasource + `targets[0].query` -> `/api/frontend/settings` 解析 datasource 数字 id -> 把 `$from`/`$to`（秒）和重复 `--var name=value`（匹配 `$name`/`${name}`/`[[name]]`）注入 SQL -> POST `/api/tsdb/query` -> 解码 base64 Arrow `dataframes` 为列数组。可用 `--datasource`/`--datasource-id`/`--sql` 覆盖自动解析。JSON 输出含 `columns`（列名->值数组）、`column_names`、`row_count`、解析后的 `datasource`/`datasource_id`/`sql`/`from`/`to`。
- 对于单个 Bosun/ByteTSD 点位表达式，优先使用 `bytedcli apm bosun query "sum:store:example.metric" --duration 10m --all-regions` 或 `bytedcli apm metric query ...`，不要为了点位查询反向拼 Grafana URL。

## Bosun 表达式格式（重要）

创建/更新面板时，targets 中的 `expr` 必须使用标准 Bosun `nv(q(...))` 语法，分两种格式：

**非多值指标**（QPS使用 `rate{counter}:`）：

```
$child= nv(q("sum:30s-avg-zero:rate{counter}:指标名{}{}","$start", "30s"),0)
$child
```

示例：

```json
{
  "title": "激活成功率",
  "targets": [
    {
      "expr": "$child= nv(q(\"sum:30s-avg-zero:rate{counter}:caijing.fe.akali.do_active_success{}{}\",\"$start\", \"30s\"),0) \n$mother = nv(q(\"sum:30s-avg-zero:rate{counter}:caijing.fe.akali.do_active{}{}\",\"$start\", \"30s\"),0) \n$child/$mother"
    }
  ]
}
```

**多值指标**（QPS使用 `.delta_counter` + `[rate]`）：

```
$child= nv(q("sum:30s-avg-zero:指标名.delta_counter{}{}[rate]","$start", "30s"),0)
$child
```

示例：

```json
{
  "title": "绑卡量",
  "targets": [
    {
      "expr": "$child= nv(q(\"sum:30s-avg-zero:kepler.finance_fe.monitor.wallet_bcard_institution_bind_result.delta_counter{}{}[rate]\",\"$start\", \"30s\"),0) \n$child"
    }
  ]
}
```

**转化率（多变量除法）**：

```json
{
  "title": "激活转化率",
  "targets": [
    {
      "expr": "$child= nv(q(\"sum:30s-avg-zero:rate{counter}:caijing.fe.akali.do_active_success{}{}\",\"$start\", \"30s\"),0) \n$mother= nv(q(\"sum:30s-avg-zero:rate{counter}:caijing.fe.akali.do_active{}{}\",\"$start\", \"30s\"),0) \n$child/$mother"
    }
  ]
}
```

### Bosun 分组与过滤语法

指标格式：`metric{group}{filter}`，两个 `{}` 分别是分组条件和过滤条件。

- **分组 `{group}`**（= SQL GROUP BY）
  - `{tag=*}`：按 tag 值分组展示
  - `{}`：不分组（聚合所有数据）
- **过滤 `{filter}`**（= SQL WHERE）
  - `{tag=value}`：精确匹配
  - `{tag=literal_or(a|b|c)}`：WHERE IN（区分大小写）
  - `{tag=not_literal_or(a|b)}`：WHERE NOT IN
  - `{tag=wildcard(*.douyin.com)}`：通配符匹配
  - `{tag=regexp(data\\-[0-9])}`：正则匹配
  - 多条件逗号分隔：`{host=web*, dc=lf}`
- **注意**：两个 Group 必须互为子集才能运算，否则报 `unjoined group`

示例：按 method 分组，过滤 err_code=0：

```
sum:30s-avg-zero:rate{counter}:metric{method=*}{err_code=literal_or(0)}
```

### 注意事项

- 不要传简单的 `metric{tag}` 格式，必须包裹在 `nv(q(...))` 中
- 系统会兜底转换简单格式：含 `.delta_counter` 走多值，否则走非多值 `rate{counter}`
- tags 的 `{}` 中只放确定存在的固定值，不要使用 Grafana 模板变量（如 `$xxx`），避免目标大盘缺少该变量导致查询失败
- 支持多变量计算如 `$a/$b`、`$a + $b` 等
- 如果用户未指定 `target` 字段，系统自动设为 `"Bosun Query"`
- 如果用户未指定 `datasource`，默认使用 `"bosun"`

## Notes

- 大盘标识支持 `--uid` 或 `--url`（至少传一个），URL 支持带 `var-*` 模板变量
- 复杂参数（panels、variables、links、position）通过 `--xxx-json` 传递 JSON 字符串
- 创建大盘时 `--folder-id` 默认 164421972
- 所有命令通过 MCP 自动暴露为 `grafana_*` 系列 tool
