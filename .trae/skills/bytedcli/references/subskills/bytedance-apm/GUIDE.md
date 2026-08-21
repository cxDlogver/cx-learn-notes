---
name: bytedance-apm
description: "Operate APM via bytedcli: service preview, QPS, upstream/downstream dependency analysis, per-method SLA (success rate, QPS), Redis monitoring dashboards, FaaS MQ trigger consumption metrics, runtime/TLB/TCC/MySQL/AGW monitoring via Byteheart and Argos, and APM metric querying (with Query DSL, anti-drift duration, multi-region). Use when tasks mention APM, service monitoring, QPS, dependencies, SLA, success rate, metric query, Redis monitoring, or FaaS MQ trigger metrics."
---

# bytedcli APM

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

- 服务预览、QPS 查询
- 上下游服务依赖分析（deps：查看服务的 upstream/downstream 依赖及其 QPS、错误率、成功率）
- 接口维度 SLA 分析（methods：查看每个 method 的 QPS、成功率，支持按成功率阈值过滤）
- Metric 指标高级查询（Query DSL）及 Metric 探索 (search, field-list, tagk-list, tagv-list)
- Redis 监控（overview/client/server/proxy）
- FaaS MQ trigger 成功消费 QPS 查询
- 运行时 / 中间件监控（runtime/TLB/TCC/MySQL/AGW）

## 前置条件

- 使用通用调用方式：`../../invocation.md`

> 执行前缀见 `../../invocation.md`；下面示例直接写 `bytedcli`。

## Quick start

**命令行结构**：`bytedcli [全局选项] apm <子命令族> <子命令> [命令选项]`

| 类别     | 选项                              | 位置                        | 说明                             |
| -------- | --------------------------------- | --------------------------- | -------------------------------- |
| 全局选项 | `--json`、`--site`、`--debug`     | `bytedcli` 之后、子命令之前 | 对所有子命令生效                 |
| 命令选项 | `--psm`、`--region`、`--start` 等 | 子命令之后                  | 仅对当前子命令生效，见参数归属表 |

**必须严格遵守的格式**：`bytedcli --json apm service qps --psm "example.service.api"`（`--json` 在 `apm` 之前）

Commands are grouped under `apm service`, `apm redis`, `apm metric`, and `apm faas-mq-trigger`. Old flat names (e.g. `apm service-preview`, `apm redis-qps`) still work as hidden aliases.

```bash
# 服务预览
bytedcli --json apm service preview --psm "psm.name" --service-type redis

# QPS
bytedcli --json apm redis qps --psm "cache.demo.redis"
bytedcli --json apm redis traffic --psm "cache.demo.redis"
bytedcli --json apm service qps --psm "example.service.api"
bytedcli --json apm service qps --psm "example.service.api" --metric "service.request.server.throughput.total"
bytedcli --json apm service downstream-qps --psm "example.service.api"
bytedcli --json apm service downstream-qps --psm "example.service.api" --metric "service.request.downstream.throughput.total"

# 上下游服务依赖分析
bytedcli --json apm service deps --psm "example.service.api"
bytedcli --json apm service deps --psm "example.service.api" --direction upstream
bytedcli --json apm service deps --psm "example.service.api" --direction downstream
bytedcli --json apm service deps --psm "example.service.api" --start 1714000000 --end 1714003600
bytedcli --json apm service deps --psm "example.service.api" --region "China-North"
bytedcli --json apm service deps --psm "example.service.api" --with-method
bytedcli --json apm service deps --psm "example.service.api" --method "QueryHotelDetail"

# 接口维度 SLA 分析
bytedcli --json apm service methods --psm "example.service.api"
bytedcli --json apm service methods --psm "example.service.api" --min-success-rate 99.9
bytedcli --json apm service methods --psm "example.service.api" --latency
bytedcli --json apm service methods --psm "example.service.api" --latency --top 10
bytedcli --json apm service methods --psm "example.service.api" --latency --method "QueryHotelDetail"
bytedcli --json apm service methods --psm "example.service.api" --start 1714000000 --end 1714003600 --region "China-North"

# i18n-bd 站点查询（deps / methods / qps / preview 均支持）
bytedcli --site i18n-bd --json apm service deps --psm "example.service.api"
bytedcli --site i18n-bd --json apm service methods --psm "example.service.api"

# Metric 基础查询（单值指标，带必要的 _psm tag）
bytedcli --json apm metric query "sum:bytedtrace.sdk.span.server.rate{}{_psm=literal_or(example.demo.api)}" --start-time 1714000000 --end-time 1714003600 --region "China-North"

# Metric 多值指标查询（delta_counter 类型，[delta] 必须放在末尾）
bytedcli --json apm metric query "sum:store:example.service.api.throughput{_psm=literal_or(example.demo.api)}{}[delta]" --start-time 1714000000 --end-time 1714003600

# Metric 多值指标查询（timer 类型，加权 P99）
bytedcli --json apm metric query "sum:store:example.service.api.latency{_psm=literal_or(example.demo.api)}{}[weighted_avg(value=pct99,weight=counter)]" --start-time 1714000000 --end-time 1714003600

# Metrics FE / Bosun OpenTSDB 查询（覆盖当前站点全部前端 region）
bytedcli --json apm bosun query "sum:store:example.service.metric" --duration 10m --all-regions

# Redis 监控
bytedcli --json apm redis overview --psm "cache.demo.redis"
bytedcli --json apm redis client --psm "cache.demo.redis"
bytedcli --json apm redis server --psm "cache.demo.redis"
bytedcli --json apm redis proxy --psm "cache.demo.redis"

# FaaS MQ trigger 成功消费 QPS
bytedcli --json apm faas-mq-trigger metrics --function "demo-function" --mqid "demo-mqid" --duration 30m
bytedcli --json apm faas-mq-trigger metrics --function "demo-function" --mqid "demo-mqid" --start-time 1714000000 --end-time 1714003600 --step 15s

# 运行时 / 中间件
bytedcli --json apm service preview --psm "psm.name" --service-type runtime
bytedcli --json apm service preview --psm "psm.name" --service-type tlb
bytedcli --json apm service preview --psm "psm.name" --service-type tcc
bytedcli --json apm service preview --psm "psm.name" --service-type mysql
bytedcli --json apm service preview --psm "psm.name" --service-type agw_sidecar

# Argos bosun/data：VMP PromQL 查询（简化模式）
bytedcli --json apm argos bosun query \
  --account-id 1234567890 \
  --workspace-id 00000000-0000-0000-0000-000000000000 \
  --prom 'sum(rate(proxy_requests_total{cluster="demo-cluster"}[1m]))' \
  --duration 1h

# Argos bosun/data：VMP PromQL 查询（passthrough 模式，整段 bosun 表达式）
bytedcli --json apm argos bosun query --expr-file ./panel.bosun --duration 30m

# Argos oncall：值班计划搜索 / 查询 / 修改
bytedcli --json apm argos oncall plan search --query "demo-service"
bytedcli --json apm argos oncall plan get --uid "demo-plan-uid"
bytedcli --json apm argos oncall plan set-users --uid "demo-plan-uid" --user demo-user-a --dry-run
bytedcli --json apm argos oncall plan set-users --uid "demo-plan-uid" --user demo-user-a --user demo-user-b

# Argos oncall：报警接收人 / 节点配置查询
bytedcli --json apm argos oncall receiver by-node --psm "example.service.api" --vregion "ChinaSinf-North"
bytedcli --json apm argos oncall node setting --node-id "demo-node-id" --vregion "ChinaSinf-North"
bytedcli --json apm argos oncall node parents --node-id "demo-node-id" --vregion "ChinaSinf-North"

# Argos alarm：报警规则查询 / 创建 / 通知方式变更 / 接收人查询
bytedcli --json apm argos alarm rule get --id "demo-rule-id"
bytedcli --json apm argos alarm rule enable-lark-at --id "demo-rule-id" --dry-run
bytedcli --json apm argos alarm rule enable-lark-at --id "demo-rule-id"
# 创建报警规则（默认安全：不带 --yes 只预览 payload，不写入）。--from 克隆已有规则，--set 按点路径覆盖字段
bytedcli --json apm argos alarm rule create --from "src-rule-id" --name "new-rule" --set "query.cluster=demo-target-cluster" --dry-run
bytedcli --json apm argos alarm rule create --from "src-rule-id" --name "new-rule" --set "query.cluster=demo-target-cluster" --yes
bytedcli --json apm argos alarm receiver by-rule --id "demo-rule-id" --vregion "ChinaSinf-North"

# Argos event：查看服务最近变更/发布/配置事件
bytedcli --json apm argos event list --psm "demo.service.api" --duration 12h
bytedcli --json apm argos event list --psm "demo.service.api" --start 1714000000 --end 1714043200 \
  --category TCC --action open_modify_config --page-size 100

# Argos StreamLog：错误日志按代码位置聚合（默认 aggregator=location，仅看 Error）
bytedcli --json apm argos log aggregate --psm "demo.service.api" --vregion "China-North" \
  --duration 1h --log-level Error

# Argos StreamLog：按多个 log level 过滤 + 显示完整 metric/kibana 链接
bytedcli --json apm argos log aggregate --psm "demo.service.api" --vregion "China-North" \
  --duration 1h --log-level Error --log-level Warn --show-links

# Argos StreamLog：按用户自定义错误规则聚合（需带 --cluster）
bytedcli --json apm argos log aggregate --psm "demo.service.api" --vregion "China-North" \
  --duration 1h --aggregator custom --cluster default

# Argos StreamLog：同时拉 aggregate_key facets
bytedcli --json apm argos log aggregate --psm "demo.service.api" --vregion "China-North" \
  --duration 1h --with-facets
```

## Metric 探索工作流

如果你不确定具体的 metric 名称或 tag，请按以下步骤探索：

1. 查租户 → `tenant-list`
2. 找 metric → `search`
3. 查 tag keys → `tagk-list`
4. 查 tag values → `tagv-list`
5. 查询数据 → `query`

完整的探索指南和高级用法请参考：[exploration-guide.md](./references/exploration-guide.md)、[metric.md](./references/metric.md)

## 参数归属

Agent 在构造命令时，**必须**参照下表判断参数归属。不在表中的参数表示该子命令不支持。

### `apm metric` 系列

| 参数                          |          `query`           |  `search`   | `field-list` | `tagk-list` | `tagv-list` | `tenant-list` |
| ----------------------------- | :------------------------: | :---------: | :----------: | :---------: | :---------: | :-----------: |
| `--region`                    |        ✅ (可多次)         | ✅ (可多次) | ✅ (可多次)  | ✅ (可多次) | ✅ (可多次) |  ✅ (可多次)  |
| `--all-regions`               |             ✅             |     ❌      |      ❌      |     ❌      |     ❌      |      ❌       |
| `--start-time` / `--end-time` | ✅ (推荐，Unix 秒级时间戳) |     ❌      |      ❌      |     ❌      |     ❌      |      ❌       |
| `--duration`                  |          ⚠️ 废弃           |     ❌      |      ❌      |     ❌      |     ❌      |      ❌       |
| `--group-by-region`           |             ✅             |     ❌      |      ❌      |     ❌      |     ❌      |      ❌       |
| `--tenant`                    |    ✅ (默认 `default`)     |     ✅      |      ✅      |     ✅      |     ✅      |      ❌       |
| `--prefix`                    |             ❌             |  ✅ (必填)  |      ❌      |     ❌      |     ❌      |      ❌       |
| `--metric`                    |             ❌             |     ❌      |  ✅ (必填)   |  ✅ (必填)  |  ✅ (必填)  |      ❌       |
| `--tags`                      |             ❌             |     ❌      |      ❌      |     ❌      |  ✅ (必填)  |      ❌       |
| `--filters`                   |             ❌             |     ❌      |      ❌      |     ❌      |     ✅      |      ❌       |
| `--limit`                     |             ❌             |     ✅      |      ❌      |     ❌      |     ❌      |      ❌       |
| `--psm`                       |   ❌ (写在 query {} 内)    |     ❌      |      ❌      |     ❌      |     ❌      |      ❌       |

### `apm service` 系列

| 参数                 |         `preview`          |           `deps`           |         `methods`          |           `qps`            |      `downstream-qps`      | `runtime/tlb/tcc/mysql/agw-sidecar` |
| -------------------- | :------------------------: | :------------------------: | :------------------------: | :------------------------: | :------------------------: | :---------------------------------: |
| `--psm`              |         ✅ (必填)          |         ✅ (必填)          |         ✅ (必填)          |         ✅ (必填)          |         ✅ (必填)          |              ✅ (必填)              |
| `--region`           |        ✅ (可多次)         |        ✅ (可多次)         |        ✅ (可多次)         |        ✅ (可多次)         |        ✅ (可多次)         |                 ❌                  |
| `--start` / `--end`  | ✅ (推荐，Unix 秒级时间戳) | ✅ (推荐，Unix 秒级时间戳) | ✅ (推荐，Unix 秒级时间戳) | ✅ (推荐，Unix 秒级时间戳) | ✅ (推荐，Unix 秒级时间戳) |                 ❌                  |
| `--range`            |          ⚠️ 废弃           |          ⚠️ 废弃           |          ⚠️ 废弃           |          ⚠️ 废弃           |          ⚠️ 废弃           |                 ❌                  |
| `--service-type`     |             ✅             |             ❌             |             ❌             |             ✅             |             ✅             |              ✅ (预设)              |
| `--direction`        |             ❌             |             ✅             |             ❌             |             ❌             |             ❌             |                 ❌                  |
| `--with-method`      |             ❌             |             ✅             |             ❌             |             ❌             |             ❌             |                 ❌                  |
| `--method`           |             ❌             | ✅（隐含 `--with-method`） |             ✅             |             ✅             |             ✅             |                 ❌                  |
| `--metric`           |             ❌             |             ❌             |             ❌             |             ✅             |             ✅             |                 ❌                  |
| `--latency`          |             ❌             |             ❌             |             ✅             |             ❌             |             ❌             |                 ❌                  |
| `--min-success-rate` |             ❌             |             ❌             |             ✅             |             ❌             |             ❌             |                 ❌                  |
| `--top`              |             ❌             |             ❌             |             ✅             |             ❌             |             ❌             |                 ❌                  |
| `--aggregator`       |             ❌             |             ❌             |             ✅             |             ✅             |             ✅             |                 ❌                  |

### `apm redis` 系列

| 参数       |   `qps`   | `traffic` | `overview` | `client`  | `server`  |  `proxy`  |
| ---------- | :-------: | :-------: | :--------: | :-------: | :-------: | :-------: |
| `--psm`    | ✅ (必填) | ✅ (必填) | ✅ (必填)  | ✅ (必填) | ✅ (必填) | ✅ (必填) |
| `--idc`    |    ❌     |    ❌     |     ✅     |    ✅     |    ✅     |    ✅     |
| `--region` |    ❌     |    ❌     |     ❌     |    ❌     |    ❌     |    ❌     |

### `apm faas-mq-trigger` 系列

| 参数                          | `metrics`  | 说明                                                     |
| ----------------------------- | :--------: | -------------------------------------------------------- |
| `--function <id>`             | ✅ (必填) | FaaS function id                                         |
| `--mqid <id>`                 | ✅ (必填) | FaaS MQ trigger id                                       |
| `--start-time` / `--end-time` |     ✅     | Unix 秒级时间戳；成对使用时覆盖 `--duration` 默认时间窗 |
| `--duration`                  |     ✅     | 相对时间窗，默认 `30m`                                  |
| `--step`                      |     ✅     | Prometheus query step，默认 `15s`                       |
| `--end-offset`                |     ✅     | 默认结束时间相对 now 的偏移，默认 `30s`                 |
| `--datasource`                |     ✅     | Grafana Prometheus datasource，默认 `vefaas-cn-beijing` |
| `--grafana-url`               |     ✅     | Grafana base URL，默认 `https://infra-grafana.byted.org` |

### 时间戳格式

| 参数                          | 格式            | 示例         | 说明                                                                                                         |
| ----------------------------- | --------------- | ------------ | ------------------------------------------------------------------------------------------------------------ |
| `--start-time` / `--end-time` | Unix 秒级时间戳 | `1714000000` | 仅支持数字时间戳，不支持相对时间                                                                             |
| `--start`                     | Unix 秒级时间戳 | `1714000000` | 也支持 RFC3339 和 `-1h`，但**必须优先使用时间戳**                                                            |
| `--end`                       | Unix 秒级时间戳 | `1714003600` | 同 `--start`，也支持 `now`，但**必须优先使用时间戳**                                                         |
| `--duration` / `--range`      | —               | —            | **⚠️ 废弃**，不要使用。相对时间导致结果不确定，Agent 必须用 `--start-time`/`--end-time` 或 `--start`/`--end` |

**Agent 构造命令时，必须将用户意图转换为 Unix 秒级时间戳。** 示例：用户说"最近 1 小时"，Agent 应计算 `当前时间戳 - 3600` 作为 `--start` 值，`当前时间戳` 作为 `--end` 值。

## Notes

- `apm service deps` 基于 Argos measurement 接口，默认输出按 service 聚合的上下游依赖。
  - QPS：`service.request.{downstream|upstream}.throughput.total`
  - Error QPS：`service.request.{downstream|upstream}.throughput.error`
  - Success Rate：基于 `service.request.{downstream|upstream}.error_rate`（成功率 = `100 - error_rate`），避免用数量做除法带来的偏差。
  - `--with-method`：输出方法级依赖，包含对端 `method` 与当前 PSM 的 `self_method`。
  - `--method <name>`：只看当前 PSM 指定接口的上下游依赖（可重复/逗号分隔），自动启用方法级依赖查询。
- `apm service methods` 基于 Argos measurement 接口，输出 method 维度指标（按 `method` / `service.method` 聚合，必要时自动 fallback）。
  - Success Rate：基于 `service.request.server.error_rate`（成功率 = `100 - error_rate`，两位小数）。
  - 延迟：用 `--latency` 打开（默认指标 `service.request.server.latency.total`，并自动转成 `ms`）。
  - `--top <n>`：按 `Max QPS` 排序取前 N。
  - `--method <name>`：只看指定方法（可重复/逗号分隔）。
- `apm service deps` 和 `apm service methods` 均支持 `--site i18n-bd`（映射到 mycis region）和 `--site i18n-tt` 海外查询，以及 `--region`、`--start`/`--end`（Unix 秒级时间戳）参数。`--range` 已废弃，不要使用。
- `apm faas-mq-trigger metrics` 通过 infra Grafana datasource proxy 查询 FaaS MQ trigger 成功消费 QPS，默认 Grafana 为 `https://infra-grafana.byted.org`，默认 datasource 为 `vefaas-cn-beijing`。输出包含 PromQL、时间窗、点位数组与 min/max/avg/last 摘要。该命令的 `--duration` 是命令自有的默认时间窗，不适用 `apm metric query` 的 Query DSL 约束；如果需要可复现窗口，优先传 `--start-time` 和 `--end-time`。
- `apm metric query` 的查询语句是**位置参数**，且**不支持** `--psm` 与 `--query` 参数，请直接将过滤条件（如 `_psm=...`）写在 query 的标签内。
- 部分指标（如 `bytedtrace.sdk.span.server.rate`）有 tag rewrite 逻辑，**必须指定 `_psm` tag** 才能查询，例如：`bytedtrace.sdk.span.server.rate{_psm=literal_or(example.demo.api)}{}`
- Metric 查询格式：`aggregator[:downsample][:rate{opts}][:topK]:metric_name{group_tags}{filter_tags}[multi_field_expr]`，**必须使用** `key=func(value)` 格式，**禁止** `key=value`。**Agent / Skills 必须严格按 `aggregator → downsample → rate → topK → metric` 的顺序拼接**（parser 实现宽松容错只是兜底，不作为推荐用法）。`[multi_field_expr]` 仅多值指标需要，**必须放在末尾**。顶层 aggregator 支持 `sum/avg/max/min/count/zimsum/pct50/pct90/pct99`（前 5 种为日常主力，`zimsum` 等价 `sum`，`pct50/pct90/pct99` 仅在百分位指标场景使用）；downsample / TopK 内部 agg 仅支持 `max\|min\|avg\|count\|sum`。downsample 必须以数字开头（如 `1m-sum-zero`），不支持旧格式 `sum-1m-zero`。详见 [metric.md](./references/metric.md)
- `apm metric query` 支持直接输入前端页面中的 Query DSL 进行解析（支持 `[xxx]` 等多值语法提取），必须用 `--start-time`/`--end-time`（Unix 秒级时间戳）指定时间窗。`--duration` 已废弃，不要使用。支持 `--region` 多次声明以组装数组进行多机房查询；需要覆盖 Metrics FE 当前站点全部下拉 region 时用 `--all-regions`。
- `apm grafana query/search` 与 `apm bosun query` 走 Metrics FE 前端链路，使用当前用户 ByteCloud JWT，不需要 Metrics OpenAPI 的 app_name/app_secret，也不依赖浏览器 cookie。`apm grafana query` 可直接接收前端/Grafana 里的 ByteTSD DSL（`aggregator[:downsample]:metric{group_tags}{filter_tags}`），也兼容 `metric{tag=value}` 简化格式；若目标是从现有 Grafana 面板取点位，用 `bytedcli grafana query <grafana-url-or-uid> --panel <id>`，已知 Forge 指标大盘的 fountain read 面板会直接转 Metrics FE Byteplot 查询，其他面板会在 Cloud OpenAPI data 失败时自动 fallback。`apm bosun query` 调 Metrics FE 的 `/byteplot/api/v2/bosun/expr` 代理，可接收裸 OpenTSDB/ByteTSD 写法（例如 `sum:store:example.service.metric`，需配 `--duration`）或完整 `q(...)` 表达式。
- Metrics FE 按站点分桶：CN 用 `--site cn`，ROW 用 `--site i18n-tt`（也可用别名 `--site row`），EU-TTP 用 `--site eu-ttp`，US-TTP 用 `--site us-ttp` / `--site us-ttp-bdee` / `--site us-ttp-usts`（也可用别名 `--site tx-ttp`）。`--all-regions` 只展开当前站点包含的 VRegion；`--region` 只是当前站点内的查询维度，不会反向切换 Metrics FE 后端。若 VRegion 属于其他站点，改用对应 `--site`。
- `apm service preview/runtime/tlb/tcc/mysql/agw-sidecar` 调用 Byteheart 全局视图接口
- Redis 相关命令返回 Grafana/Argos 监控入口链接（按集群维度）
- `apm service qps` 基于 Argos measurement 接口，可用 `--metric` 指定指标，支持使用 `--region` 参数过滤 vregion；现已支持通过 `--site i18n-tt` 进行海外控制面查询。支持传入多个机房进行正则聚合查询（通过多次指定 `--region A --region B`，或直接传入 `China-North|Singapore-Central` 格式）
- `apm service downstream-qps` 基于 Argos measurement 接口，默认指标为 `service.request.downstream.throughput.total`，用于查看服务调用下游依赖的 QPS，同样支持 `--region` 参数过滤 vregion 以及 `--site i18n-tt` 海外查询。支持传入多个机房进行正则聚合查询（通过多次指定 `--region A --region B`，或直接传入 `China-North|Singapore-Central` 格式）
- APM 的 Argos measurement / monitoring / event API base URL 可用环境变量 `BYTEDCLI_APM_API_BASE_URL` 覆盖，值支持裸域名或完整 `https://...`。该变量只覆盖这些 APM Argos API 请求，不覆盖 `apm argos log aggregate` 的 StreamLog host；认证 origin / JWT host 仍按当前 `--site` 解析。
- `apm redis qps/traffic` 基于 Cache 服务详情的当前统计值
- `apm argos bosun query` 通过 Argos `bosun/data` 接口查询 VMP（Volcengine Managed Prometheus）数据，是 Argos 自定义看板 `query_type: "bosun"` 面板的同条链路；与 `apm bosun query`（走 Byteplot `/byteplot/api/v2/bosun/expr`，OpenTSDB 语法）相互独立。
  - 简化模式：`--prom` + `--account-id` + `--workspace-id`，CLI 自动包装成 `["accountID=…&workspaceID=…"]promql/promras(...)`；用 `--func promras` 切换包装函数（promras 顶层函数必须带 `by` 子句）。
  - Passthrough 模式：`--expr` 或 `--expr-file` 直接传入完整 bosun 表达式（`promras` 多变量组合或从看板面板复制的整段表达式推荐使用此模式）。
  - `--region` 是火山引擎 region（默认 `cn-beijing`），不是 Argos region。
  - 前置条件：火山账号必须先通过 Argos 多云代理工单加入；详见 [`references/vmp-bosun.md`](./references/vmp-bosun.md)。
- `apm bosun query` 通过 Byteplot `/byteplot/api/v2/bosun/expr` 查询 OpenTSDB 风格的 Bosun 表达式（与 metrics-fe Bosun 面板同链路）。
  - `--duration <1h|30m|1d|...>` 必填；CLI 会把 `aggregator:metric{...}` 这种 OpenTSDB 简写自动包装成 `q("...", "<duration>s", "<downsample>")`。
  - `--end-time <epochSeconds>` 可选：Bosun 表达式基于一个求值基点（"now"）执行，`q()` 中的 start/end delta 均相对于此基点。传入 Unix 秒级时间戳后 CLI 会换算成 UTC `date=YYYY-MM-DD&time=HH:MM:SS` 透传给后端；不传则基点默认为当前时间。例如 `q("sum:metric{}", "1h", "")` 查的是基点前 1 小时到基点的数据。
  - `--region` 直接透传 Byteplot `_region`（如 `Singapore-Central|Singapore-Compliance`、`US-TTP`）。`--site` 决定调用的 Byteplot 集群（`cn` / `i18n-tt` / `eu-ttp` / `us-ttp` 等）。`--all-regions` 可展开当前站点全部前端 region。
  - 鉴权与 `apm metric` 共用 Byteplot SSO JWT，无需单独配置。
- `apm argos oncall plan search/get` 查询 Argos 值班计划列表与详情；`plan set-users` 支持 `--only`（仅替换）与 `--dry-run`（预览，不发 PUT）；`--user` 可重复指定或逗号分隔。
- `apm argos oncall receiver by-node` 解析指定 PSM + vregion 的实际报警接收人链路（含升级层级、通知渠道）；`node setting` / `node parents` 查看节点本身及继承的值班设置。
- `apm argos alarm rule get` 获取报警规则详情（含 alarm_methods_list）；`rule enable-lark-at` 确保规则通知方式包含 Lark 和 LarkAtUser，支持 `--dry-run` 预览；`receiver by-rule` 解析指定规则在某 vregion 的实际接收人。
- `apm argos alarm rule create` 创建报警规则（POST `/aiopsaggr/alarm/v2/rules/create`）。**默认安全**：不带 `--yes` 时只解析并返回 payload，不会写入；`--dry-run` 静默预览；`--yes` 才真正创建。`--from <id>` 克隆已有规则（自动剥离 id / 审计字段），`--name` 覆盖名称，`--set path=value` 按点路径覆盖字段（可重复），`--payload <json|@file>` 直接指定完整规则体。典型用法：从 App 规则克隆出 Web 规则，仅改 cluster / consumer_group / `_cluster`。
  - JSON 输出用 `mode` 字段表达三态，消费者只需判断 `mode`：`preview`（默认、未传 `--yes`，仅预览且 `confirmation_required:true`）、`dry_run`（显式 `--dry-run`，仅预览、无需确认）、`created`（传了 `--yes`，已写入，`applied:true` 且带 `created_id`）。`dry_run` / `confirmation_required` / `applied` 字段保留以兼容，但建议以 `mode` 为准。
  - `--yes` 与 `--dry-run` 互斥，同时传会报 `CLI_INPUT_ERROR`；要写入用 `--yes`，要预览用 `--dry-run`。
- `apm argos alarm` 的 `rule get` / `rule create` / `rule enable-lark-at` / `receiver by-rule` 都支持 `--region` 选择 Argos 报警数据面：省略 = CN，`us-ttp` = US-TTP，`eu-ttp2` = EU-TTP2；只接受这三种取值，传别名或拼写错误会报 `APM_INPUT_ERROR`（不会静默落到 CN）。ROW / Singapore 数据面需另设 `ARGOS_ALARM_BASE`（及可选 `ARGOS_ALARM_ORIGIN` / `ARGOS_ALARM_RG`）。`--region-group` 缺省时按 region 自动推导，一般不用手动传。
- `apm argos event list` 查询 Argos 服务事件（`/event/api/v2/service/brief`），适合在报警/错误波动前后查看 TCC、Bernard、TCE、Redis 等变更事件。
  - 默认时间窗为最近 12 小时；也可传 `--start` / `--end` Unix 秒级时间戳，二者必须成对出现且不能与 `--duration` 同时使用。
  - `--category` 可重复指定或逗号分隔；不传时使用后端默认类别集合。
  - `--action` 可重复指定或逗号分隔，用于只看特定事件动作；传 `--action` 时必须同时传且只传一个 `--category`。
  - `--region` 使用 Argos/APM region/vregion（如 `China-North` / `Singapore-Central`），默认按当前 `--site` 推导。
  - 文本模式默认展示事件时间、类别、动作、操作者、region、状态和事件 ID；加 `--show-psms` 可展示事件影响的 PSM 列表。JSON 模式保留完整事件数组和分页信息。
- `apm argos log aggregate` 接 Argos「错误日志 → 聚合统计」（`cloud.bytedance.net/argos/streamlog/info_overview/aggregate_statistics` 的后端）。
  - 后端 host 是 `logservice.byted.org`（与其它 `apm argos *` 走 `aiops-argos.byted.org` 不同），鉴权同样是 `x-jwt-token` (ByteCloud Passport JWT)。
  - `--vregion` **必须**传后端真值（如 `China-North` / `Singapore-Central`），不要传 `cn` / `sg` 这类缩写。
  - `--aggregator` 仅支持 `location`（默认）与 `custom` 两种取值；`custom` 模式下 `--cluster` 必填（streamlog 集群名）。
  - `--filter <dim>=v1,v2` 只接受白名单 dim：`location|cluster|dc|log_level|stage`。`--log-level Error` 是 `--filter log_level=Error` 的语法糖。
  - 当后端返回 `error_code: 101401` 或 `error_type: "Unauthorized"` 时，CLI 会提示运行 `bytedcli auth login` 刷新 JWT。
  - 默认只调 `overview`（Top-N 错误位置 + 时序 + Kibana 深链）；加 `--with-facets` 会额外调 `aggregate_key` 列出其他维度可选值。
  - JSON 模式始终透传 `sampled_log` 数组（实测每条错误约 44 个 key/value 字段，含 `_msg` / `error` / `func` / `_logid` 等）。文本模式默认不展示，加 `--show-sample-log` 在 Top 表后追加"Sample logs:"区块，优先输出 `_msg` 字段，fallback 到 `error`，再 fallback 到第一个非元数据字段。
  - 当前支持的站点：`cn` / `boe` / `i18n` / `i18n-tt` / `us-ttp` / `us-ttp-bdee` / `us-ttp-usts` / `eu-ttp`（CN 实测，其余 7 站点 host 来自 Argos 前端 bundle 完整 dump）。`i18n-bd` 在前端 bundle 中无独立 host 条目，传入会报 `CLI_INPUT_ERROR`，需后续实测确认。
- **所有 APM 命令必须加 `--json`**。`--json` 是全局选项，**必须放在 `apm` 之前**，不能放在子命令之后。正确：`bytedcli --json apm service qps --psm "example.service.api"`；错误：`bytedcli apm service qps --json --psm "example.service.api"`（虽然不会报错，但不符合规范）

## References

以下文件包含 SKILL.md 未展开的详细内容。**按需读取**——仅当你遇到对应场景时才读取，避免不必要的 tool call。

| 何时读取                                                      | 文件                                                      | 内容                                                                                                      |
| ------------------------------------------------------------- | --------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| 需要 service/redis 命令的完整参数说明表                       | [apm.md](./references/apm.md)                             | `apm service deps/methods` 的逐项参数表与输出说明                                                         |
| 需要构造 metric query、理解 Query DSL 语法、或解读 query 响应 | [metric.md](./references/metric.md)                       | 5 大探索命令详解、Query DSL 语法、`{}` 双花括号规则、Response 格式（成功/失败判断与字段解读）、常见指标名 |
| 不知道 metric 名或 tag，需要一步步探索                        | [exploration-guide.md](./references/exploration-guide.md) | 从 search → tagk-list → tagv-list → query 的完整场景演示                                                  |
| 需要了解 bytedcli 安装、站点切换、JWT 认证                    | [invocation.md](./../../invocation.md)               | npx/全局安装方式、`--site` 切换、`--json` 用法、HTTP 调试                                                 |
| 命令执行报错，需要排查                                        | [troubleshooting.md](./../../troubleshooting.md)     | 常见错误（未认证、Missing command、metric query 报错等）的原因与处理                                      |
| 需要查询 VMP（Argos bosun/data）PromQL 数据                   | [vmp-bosun.md](./references/vmp-bosun.md)                 | `apm argos bosun query` 简化/passthrough 模式、多云代理前置条件、region 映射、常见 error_code 处理        |
| 修改 skill 后需要回归验证，或查阅验收判断逻辑                 | [maintenance-guide.md](./maintenance-guide.md)            | 回归测试用例（26 个场景）、验收判断逻辑、已踩坑记录、文件职责边界                                         |
| 需要搜索 Argos Trace（按 PSM / 时间窗 / 过滤条件）            | [trace.md](./references/trace.md)                         | `apm argos trace search/categories/dimensions` 参数详解、JSON 输出结构、分页与常见陷阱                    |
