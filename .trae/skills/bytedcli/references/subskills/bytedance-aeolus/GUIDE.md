---
name: bytedance-aeolus
description: "Query, explore, edit, and save Aeolus BI/data analytics datasets via bytedcli: list authorized datasets and dashboards, get dataset field details (dimensions and metrics), get dataset model info (underlying data source and query), add source table joins and expose fields, execute SQL queries, run and save visual dataset queries, resolve report URLs to metadata and dimMet lists, query saved reports for either rows or the underlying SQL via `report query --format data|sql`, manage Query Editor files/folders for ad-hoc SQL execution (Hive or ClickHouse via --engine ch), and explore Shuttle data query projects, search/create/delete/move templates, organise saved templates into folders (list/tree/create/delete/move/rename), submit query tasks with custom SQL, check task results, and download full-result Excel/CSV files. Use when tasks mention Aeolus, BI dashboards, datasets, data analytics queries, Query Editor, Shuttle, or data templates."
---

# bytedcli Aeolus (Data Analytics Platform)

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

- List dashboards and datasets you have access to
- Get dataset field details (dimensions and metrics)
- Get dataset model info (underlying data source, query, and table schema)
- Execute SQL queries against datasets
- Run visual dataset queries and save them as shareable Aeolus report links
- Resolve report URLs to metadata and full dimMet lists, then execute saved reports for either data rows or the underlying SQL (via `report query --format`)
- Explore Aeolus BI platform data
- Manage Query Editor folders and query files (CRUD)
- Run ad-hoc SQL queries via Query Editor (Hive runner by default, or ClickHouse when SQL matches the browser Query Editor CH task, e.g. `params{'...'}`)
- Browse Query Editor saved templates: `query-editor template list` (list templates under a folder/node) and `query-editor template get` (fetch a template's SQL)
- ⚠️ Shuttle (`aeolus shuttle …`) is **deprecated** — its backend `/shuttle/web/api/v1/` is offline on all regions; use the equivalent `aeolus query-editor …` commands instead (see the Shuttle section for the redirect table)

## 前置条件

- 使用通用调用方式：`../../invocation.md`

> 执行前缀见 `../../invocation.md`；下面示例直接写 `bytedcli`。

## Supported Regions

Dataset / report API 默认域名与 `src/api/aeolus/site.ts` 一致；控制台入口可能因租户不同而异。

| Region      | Description                                    | Default API host                                                                                                                       |
| ----------- | ---------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `cn`        | China                                          | `https://data.bytedance.net`                                                                                                           |
| `sg`        | Singapore (TikTok row)                         | `https://aeolus-sg.tiktok-row.net`                                                                                                     |
| `va`        | US East (TikTok row)                           | `https://aeolus-va.tiktok-row.net`                                                                                                     |
| `euttp`     | EU-TTP / EU Compliance (GCP)                   | `https://aeolus-eu-ttp.tiktok-eu.net` (office); `https://aeolus-eu-ttp.bytedance.net` (prod). Override: `BYTEDCLI_AEOLUS_EUTTP_ORIGIN` |
| `eupipo`    | EU PIPO / IE2                                  | `https://aeolus-clover-pipo.tiktok-eu.net`                                                                                             |
| `mycis`     | MYCIS                                          | `https://aeolus-mycis.byteintl.net`                                                                                                    |
| `hrbimycis` | HRBI MYCIS (alias `hrbi_mycis` / `hrbi-mycis`) | `https://people-aeolus.byteintl.net`                                                                                                   |
| `mybd`      | MYBD                                           | `https://aeolus-mybd.sinf.net`                                                                                                         |
| `sglark`    | Singapore Lark                                 | `https://aeolus-sglark.bytedance.net`                                                                                                  |
| `usttpusts` | US TTP USTS                                    | `https://aeolus-tx.tiktok-usts.net`                                                                                                    |
| `usbd`      | US ByteDance                                   | `https://aeolus-usbd.byteintl.net`                                                                                                     |

## Quick start

For report/dataQuery URLs, prefer this workflow by default:

1. `resolve-report` to get the dataset ID.
2. `dataset-fields` to confirm dimensions/metrics and partition fields.
3. `dataset-model-info` to inspect the underlying query and lineage.
4. If logical dataset SQL fails or only returns `dummy`, inspect `system.query_log` to locate the backing physical `aeolus_data_db_*`.`aeolus_data_table_*`.
5. Query the physical table directly.

```bash
# List authorized datasets and dashboards (region is required)
bytedcli aeolus list-authorized -r va --limit 20

# Filter by type (dashboard or data_set)
bytedcli aeolus list-authorized -r cn --type data_set

# Resolve a dataQuery/report URL to dataset IDs before querying
bytedcli aeolus resolve-report -r va --url "https://aeolus-va..."

# Resolve a report URL to metadata and full dimMet list
bytedcli aeolus report resolve --url "https://aeolus-example.tiktok-row.net/aeolus/pages/dataQuery?appId=1005563&rid=13958206&sid=4961129"

# Fetch data from a saved report (auto-resolves config from URL)
bytedcli aeolus report query --url "https://aeolus-example.tiktok-row.net/aeolus/pages/dataQuery?appId=1005563&rid=13958206&sid=4961129"

# Get the underlying SQL for a saved report (still issues a real query)
bytedcli aeolus report query --format sql --url "https://aeolus-example.tiktok-row.net/aeolus/pages/dataQuery?appId=1005563&rid=13958206&sid=4961129"

# Get dataset field details (dimensions and metrics)
bytedcli aeolus dataset-fields -r va 1576311

# Get dataset model info (underlying query, lineage, source table / physical table hints)
bytedcli aeolus dataset-model-info -r va --app-id 1000252 --dataset-id 2109028

# Add a source table join and expose a metric; use --json + --dry-run to inspect payload first
bytedcli --json aeolus dataset-add-source-table -r cn --app-id <appId> --dataset-id <dataSetId> --db-name demo_db --table-name sample_table --join-from-table sample_prev_table --join-key key1 --join-key key2 --metric-field score --field-descr score=points --increment-field updated_at --dry-run

# Trigger an Aeolus dataFactory dataset sync/backfill range captured from the dataManage page
bytedcli aeolus dataset-sync trigger -r cn --app-id <appId> --dataset-id <dataSetId> --start-date "2026-04-22 00" --end-date "2026-05-06 23" --queue-name root.demo_queue --max-parallelism 5

# Check sync/backfill instance status for the same business time range
bytedcli aeolus dataset-sync status -r cn --app-id <appId> --dataset-id <dataSetId> --start-date "2026-04-22 00" --end-date "2026-05-06 23"

# If direct logical SQL fails, inspect query_log to find the actual physical table name
bytedcli aeolus query -r va 1576311 "SELECT event_time, query FROM system.query_log WHERE query LIKE '%aeolus_data_table_%' ORDER BY event_time DESC LIMIT 20"

# Query the physical Aeolus table directly after locating it
bytedcli aeolus query -r va 1576311 "SELECT reporting_ad_id, max(pangle_rolling3d_dollar_cost) AS pangle_rolling3d_dollar_cost FROM \`aeolus_data_db_xxx\`.\`aeolus_data_table_xxx\` WHERE p_date = '2026-03-01' GROUP BY reporting_ad_id ORDER BY pangle_rolling3d_dollar_cost DESC LIMIT 10"
```

## Recommended workflow for report/dataQuery links

1. Use `resolve-report` to get the dataset ID from the report URL.
2. Use `dataset-fields` to confirm dimensions/metrics and identify partition fields.
3. Always use `dataset-model-info` before assuming logical dataset SQL will work. Many Aeolus datasets expose derived fields in metadata, but `aeolus query` may only succeed against the backing physical ClickHouse table, not a logical dataset alias like `[DatasetName]` or `"2231500"`.
4. If direct logical dataset SQL fails with errors like `unknownTable`, `unknownIdentifier`, or only returns `dummy`, inspect:
   - `modelInfo.nodeConf[].query` for the source logic
   - `modelInfo.nodeConf[].lineageInfo` for upstream tables
   - `system.query_log` via `aeolus query` to find the real physical table name used by Aeolus (often `aeolus_data_db_*`.`aeolus_data_table_*`)
5. Query the physical Aeolus table directly, and deduplicate with `GROUP BY` / `max(...)` when repeated rows exist per key.
6. Do not stop at `SELECT * LIMIT 1` returning only `dummy`; that usually means you still need the physical table, not that the dataset is unusable.

### Failure signatures

- `unknownTable` when using a logical dataset name or dataset ID as the table
- `unknownIdentifier` / missing field errors even though the field exists in `dataset-fields`
- `SELECT * LIMIT 1` or `select dummy` only returning a `dummy` column

These are all strong signals to switch from logical dataset SQL to physical-table discovery.

Other recurring `aeolus query` error signatures and what they actually mean:

- `指标内含有非聚合字段 ...`：bracket 形式的指标显示名（`[指标名]`）会自动展开成**非聚合表达式**，外面要么包一层聚合函数，要么改用物理表裸列自己写聚合。
- `聚合函数中包含聚合函数`：该 bracket 字段本身已是预聚合指标，不要再套 `sum()` / `count()`。
- `SQL语法错误，请检查面板中字段的语法是否正确`（无行列号）：常见于 `[日期]` 这类分区宏用法不对，或 ORDER BY 里引用了 SELECT 别名；逐段删减定位，不要按普通 ClickHouse 语法错误排查。
- `存在未知字段、或缺失字段权限`（`SELECT *` 触发）：显式列出需要的字段，不要 `SELECT *`；该错误不会告诉你具体是哪个字段。
- `引擎查询失败`（无任何细节）：用 `bytedcli --http-debug ... aeolus query ...` 看原始响应；常见原因是数据集需要特定队列/权限，或保存的查询配置已失效。
- `不支持参数{params}取值为{value}`（占位符未插值）：数据集不支持当前请求形态（典型如不支持 Open API SQL 直查的受限数据集类型）；CLI 会附带 hint。

### End-to-end fallback example

```bash
# 1) Resolve the report URL
bytedcli aeolus resolve-report -r va --url "https://aeolus-va..."

# 2) Inspect semantic fields and partition fields
bytedcli aeolus dataset-fields -r va 2231500

# 3) Inspect the underlying model/query
bytedcli aeolus dataset-model-info -r va --app-id 555116 --dataset-id 2231500

# 4) Find the backing physical table from recent Aeolus queries
bytedcli aeolus query -r va 2231500 "SELECT event_time, query FROM system.query_log WHERE query LIKE '%aeolus_data_table_%' ORDER BY event_time DESC LIMIT 50"

# 5) Query the physical table directly
bytedcli aeolus query -r va 2231500 "SELECT reporting_ad_id, sum(placement_dollar_cost_1d/100000) AS cost FROM \`aeolus_data_db_xxx\`.\`aeolus_data_table_xxx\` WHERE p_date = '2026-04-07' AND placement = 'Pangle' GROUP BY reporting_ad_id ORDER BY cost DESC LIMIT 5"
```

## Dataset VizQuery (无需写 SQL 的数据集可视化查询)

`aeolus viz-query` 对应浏览器里 Aeolus 报表/数据集页面发起的 `POST /aeolus/vqs/api/v2/vizQuery/query`，
走和 `aeolus query` 一致的 Titan Passport cookie 鉴权。因此它在 `hrbi_mycis` 等
没有 Query Editor 权限的 region 上也能工作，非常适合：

- 只想快速拿某个 dataset 的 row count / 单维度聚合结果；
- 浏览器抓到一份 payload，想复用结构化参数而不是自己拼 SQL；
- 需要和 Aeolus 前端行为完全一致（含权限与过滤下推）。

默认情况下不需要显式传 `--data-source-id`。当某些数据集在 CLI 构造请求下仍返回
`aeolus/unknown`，并且你在浏览器抓到的成功 payload 明确包含 `dataSourceId` 时，
再把该值作为 `--data-source-id` 传入，或直接复用整份 `--body-file`。

实现和排障上还有几个关键点：

- 鉴权优先复用 Titan Passport cookie（与 `aeolus query` 同一路径），避免依赖 QE session，这样才能覆盖 `hrbi_mycis` 等没有 Query Editor 权限的 region。
- 请求体需要补齐顶层 `schema`、`display`、`originalSchema`；服务端会校验这些字段是否存在。
- 响应的真实数据行通常在 `data.vizData.datasets[]`，键名是各字段 `unique_id` 的字符串形式；解析时需要结合 `data.columns[]` 元数据重建列顺序。
- 若无 `--body-file`，默认构造应尽量贴近浏览器 payload：维度列优先使用原始 `dimMetId` 作为 `id` / `groupById` / `locations.dimensions`，指标列保留聚合前缀 id（如 `count_159...`），并默认带浏览器常见的 table `display.conf` / `fieldsFormat` 与 schema where filter 包装。

### VizQuery quick start

一维 count（对应用户示例：dataset=2889 昨日数据条数）：

```bash
bytedcli --site i18n-bd aeolus viz-query \
  -r hrbi_mycis --app-id 667 --dataset-id 2889 \
  --dim-met '{"dimMetId":1590328014122,"name":"app_id","expr":"`app_id`","roleType":1,"aggregation":"count(","dataType":"int"}' \
  --where '{"dimMetId":1590328014119,"name":"partition_date","op":"lastSync","val":[1],"valOption":{"datetimeUnit":"day","anchorOffset":0}}'
```

参数说明：

- `--dim-met`（可重复）：一个维度或指标，推荐 JSON 对象形式。必填 `dimMetId` / `name` / `expr`；
  `roleType=0` 为维度、`1` 为指标。指标的聚合函数处理要看 `expr`：
  - 当 `expr` 为原始列（如 `dau`、`dnu`）时，需补 `aggregation`（如 `count(` / `sum(`）。
  - 当 `expr` 已自带聚合（如 `sum(dnu_non_reinstall)/count(distinct p_date)` 这类"日均/比率"指标）时，**不要再传 `aggregation`**，否则后端会报"参数类型不应为 Date"等校验错误。判别依据：在 `aeolus dataset-fields` 输出中 `expr` 已含 `sum(`/`count(`/`avg(` 等。
  - 也支持紧凑的 `dimMetId=1,name=xxx,expr=\`xxx\`,roleType=1,aggr=count(`。
  ⚠️ Aeolus 平台 report 原始 JSON（`reqJson`）里的 roleType 语义是 `1=维度、2=指标`，与 CLI 的 `0=维度、1=指标` 不同；从浏览器 payload 或 `report resolve` 输出照抄 dimMet 时必须换算，照抄会被 `roleType must be 0 (dim) or 1 (metric)` 拒绝。
- `--where`（可重复）：筛选条件 JSON，需 `name` / `dimMetId` / `op` / `val`（数组）。
- `--limit`：行数上限，默认 1000。
- `--timeout-ms`：单次请求超时，单位毫秒；适合大数据集或高峰期查询较慢时显式放宽。
- `--transform`：`table`（默认）或 `chart`。
- 响应里的 `queryHistoryId` 可拼成 `<region baseUrl>/pages/dataQuery?appId=<appId>&id=<queryHistoryId>&sid=<datasetId>` 打开 web 页面复现该次查询；CLI 取数与 web 端"展示 X 条"结果一致。`<region baseUrl>` 取上文 region 表里对应行的 host（例如 `va` → `https://aeolus-va.tiktok-row.net`、`cn` → `https://data.bytedance.net`、`jplark` → `https://aeolus-jp-lark.bytedance.net` 等），实现侧以 `src/api/aeolus/site.ts` 的 `REGION_CONFIG[region].baseUrl` 为准。

### `aeolus report create`

Use `aeolus report create` when the user needs an openable/shareable Aeolus page, not just a one-off query result. The legacy flat alias `aeolus save-viz-query` still works but is hidden from help.

Typical cases:

- Turn a verified `viz-query` into a saved report page
- Share "yesterday users", "distinct app_id list", or a simple aggregate result
- Produce a visual page link for `hrbi_mycis`, where Query Editor is unavailable

Examples:

```bash
# Save a grouped page (yesterday distinct users by email)
bytedcli aeolus report create \
  -r hrbi_mycis --app-id 667 --dataset-id 2926 \
  --name "yesterday-users" \
  --dim-met '{"dimMetId":1590328021777,"name":"email","expr":"`email`","roleType":0}' \
  --where '{"dimMetId":1590328021772,"name":"pdate","op":"lastSync","val":[1],"valOption":{"datetimeUnit":"day","anchorOffset":0}}'

# Save an aggregate page (yesterday row count)
bytedcli aeolus report create \
  -r hrbi_mycis --app-id 667 --dataset-id 2926 \
  --name "yesterday-count" \
  --dim-met '{"dimMetId":1590328021772,"name":"pdate","expr":"`pdate`","roleType":1,"aggregation":"count("}' \
  --where '{"dimMetId":1590328021772,"name":"pdate","op":"lastSync","val":[1],"valOption":{"datetimeUnit":"day","anchorOffset":0}}'
```

Agent Guidance:

- `aeolus report create` calls `POST /aeolus/api/v3/dataMart/report`, and shareable links use `/aeolus/pages/dataQuery?...&rid=<reportId>&sid=<datasetId>`.
- `hrbi_mycis` defaults to `dataSourceId=10035`; other regions require explicit `--data-source-id` when no built-in mapping exists.
- Save responses may return `data.reportId`, `data.id`, or `data.lastInsertId` with `code=0`.
- Aggregate payloads should stay on the normal aggregate path: use IDs like `count_<dimMetId>`, keep `sourceType: "aggr"`, set `realMetricTableRouteConfig.isRealMetricQuery = false`, and do not emit `real_metrics_*` / `metricConf`.
- To avoid page-side query errors, keep browser-parity metadata such as `query.dimMetList`, `schema.customConfig.fields.details=[]`, `originalSchema`, `requestId`, and `locale: "zh_CN"`.
- If the browser save payload is already available, prefer reusing it directly; otherwise keep the CLI-generated payload as close to browser shape as possible.
- `--chart-type <type>` saves the report as a chart instead of the default `table`. Supported: `table`, `measure_card`, `line`, `column`, `bar`, `bar_percent`, `area`, `pie`, `double_axis`, `histogram`, `pivot_table`, `funnel`. The CLI bundles a render-ready display preset per type. The chart's query transform is not the same string as the displayType: `series` for `line`/`column`/`bar`/`bar_percent`/`area`/`double_axis`, `pie_series` for `pie`, `histogram` for `histogram`, `funnel` for `funnel`, `table` for `table`/`pivot_table`, and `measure_card` for `measure_card`.

```bash
# Save a line chart of a metric over a date dimension
bytedcli aeolus report create -r va --app-id 1000252 --dataset-id 3436909 \
  --name "accuracy-trend" --data-source-id 668 --chart-type line \
  --dim-met '{"dimMetId":100,"name":"p_date","expr":"`p_date`","roleType":0}' \
  --dim-met '{"dimMetId":200,"name":"accuracy","expr":"`accuracy`","roleType":1}'
```

### `aeolus report update`

`aeolus report update --report-id <id>` overwrites an existing saved report in place via `PUT /aeolus/api/v3/dataMart/report`, keeping the same report ID so any dashboard referencing it stays intact. It takes the same options as `report create`, but **`--report-id` is required** here (for `report create` it is optional). `report create` always creates a new report.

```bash
bytedcli aeolus report update -r cn --app-id 1000252 --dataset-id 3436909 \
  --report-id 174615 --data-source-id 668 --chart-type table \
  --dim-met '{"dimMetId":200,"name":"amount","expr":"`amount`","roleType":1,"aggregation":"sum("}'
```

### `aeolus dashboard create` / `aeolus dashboard build`

Use `aeolus dashboard create` for an empty dashboard, or `aeolus dashboard build --spec <file>` to build a complete multi-chart dashboard from a JSON spec in one call: it creates each report, auto-lays-out a 12-column masonry `componentTree`, then creates the dashboard embedding all charts (a single `POST /aeolus/api/v3/dashboard/dashboard`).

```bash
# Empty dashboard
bytedcli aeolus dashboard create -r cn --app-id 1000252 --name "demo-dashboard"
# Multi-chart dashboard from a spec
bytedcli aeolus dashboard build -r cn --spec ./dashboard.json
# List published dashboard versions
bytedcli --json aeolus dashboard version list -r cn --app-id 1000252 --dashboard-id 123456
# Fetch a sheet's simpleSheet payload
bytedcli --json aeolus dashboard sheet get -r cn --app-id 1000252 --dashboard-id 123456 --sheet-id 789012
# Save/publish an existing dashboard from an editor-compatible PUT payload
bytedcli --json aeolus dashboard update -r cn --app-id 1000252 --dashboard-id 123456 \
  --payload-file ./dashboard-update.json --publish --version-descr "add funnel" \
  --auto-delete-oldest-version --dry-run
```

Spec shape (`dashboard.json`):

```jsonc
{
  "appId": 1000252,
  "name": "demo-cost-monitor",
  "datasetId": 3436909,
  "dataSourceId": 668,
  "charts": [
    {
      "type": "measure_card",
      "name": "total",
      "dimMet": [{ "field": "amount", "agg": "sum", "as": "total" }],
      "where": [{ "field": "bill_type", "op": "in", "val": ["normal"] }],
      "style": { "numFormat": "money_wan" },
    },
    {
      "type": "table",
      "name": "by product",
      "dimMet": [{ "field": "product_name" }, { "field": "amount", "agg": "sum" }],
      "style": { "topN": 25, "conditionalFormat": "bar" },
    },
  ],
}
```

Agent Guidance:

- `dashboard build` resolves each chart's `dimMet[].field` / `where[].field` to its dimMetId via dataset metadata, so the spec uses field **names**, not IDs.
- A chart's `type` may be omitted or set to `"auto"` to recommend one from the dimMet shape: no measure → `table`; 0 dimensions → `measure_card`; 1 date-dimension + 1 measure → `line` (trend); 1 dimension + 1 measure → `column`; 1 dimension + ≥2 measures → `double_axis`; ≥2 dimensions → `table`. Pass an explicit `type` to override.
- `style.numFormat` takes **either a full numFormat object** (any prefix / suffix / unit / precision / type — not limited to money) **or a shortcut string**. Shortcuts: `"money"` (￥ auto 万/亿), `"money_wan"` (￥ fixed 万), `"auto"` (plain number, auto-scaled 万/亿, no currency), `"int"` (integer, thousands separator), `"percent"`. For any other unit, pass the object directly, e.g. a count in 万: `{ "kSep": true, "precision": 1, "unit": { "ratio": 10000, "symbol": " 万次" } }`, or bytes→GB: `{ "precision": 2, "unit": { "ratio": 1073741824, "symbol": " GB" } }`, or a plain suffix: `{ "kSep": true, "precision": 0, "suffix": " 人" }`.
- `style.conditionalFormat`: `"bar"` (in-cell data bar) / `"heatmap"` (color scale) / `"tag"` (up/down/flat arrows + colored text by sign, best on diff measures), or a full conditionalFormat object. `style.topN`: keep the top N dimension rows, sorted by the measure desc.
- More analysis configs (reference fields by **name**): `style.sort` `[{ "field": "amount", "order": "desc" }]` (sort by a dimension or a measure); `style.referenceLine` `[{ "name": "目标", "value": 100, "field": "amount" }]` (fixed-value line; `field` defaults to the first measure).
- `layout` is optional per chart; omitted charts auto-flow in a 12-column masonry (measure_card spans 4 columns, table/line span 12, others 6). Pass an explicit `layout` (`width` px / `x` / `gridIndex`) to override.
- Auth reuses `getAeolusHeaders` (Titan Passport cookie), same as `report create`. `appId` and `dataSourceId` are required; when `dataSourceId` is unknown, read it from a `viz-query --http-debug` SQL comment (`data_source_id: <id>`).
- `dashboard update` mirrors the dashboard editor's `PUT /aeolus/api/v3/dashboard/dashboard` call and adds the required `App-Id` header. Use it when modifying an existing dashboard sheet/layout with a browser-compatible payload containing fields such as `id`, `updateDashboard`, `updateSheets`, `publish`, `versionDescr`, and `deleteVersionId`.
- When publishing, pass `--publish --version-descr <text>`. By default the command sets `update_dashboard_resource=true`; use `--no-update-dashboard-resource` only when intentionally preserving the raw payload behavior.
- Aeolus dashboards can have a small published-version cap. `--auto-delete-oldest-version` first calls `dashboard version list` and, when there are already 3 versions and no explicit `--delete-version-id`, adds the oldest version ID to `deleteVersionId`.
- Always run `bytedcli --json aeolus dashboard update --dry-run ...` before a write to inspect the final payload. Then rerun without `--dry-run` to save/publish.
- Known limitations (not yet supported by spec builders): period-comparison (同环比), table calculations (表计算/占比), in-cell mini charts (迷你图), and the multi-series `combination` chart type (use `double_axis` for the common bars+line case). (表计算/迷你图/同环比 each require minting derived/placeholder pills into the saved schema, which is unreliable to construct outside the web editor.)

### `aeolus dataset-add-fields`

Add computed dimensions/metrics to an existing editable dataset (the same `dataSetV2` edit path as the dataManage page), without rebuilding the dataset.

```bash
bytedcli aeolus dataset-add-fields -r va --app-id 1000252 --dataset-id 3436909 \
  --metric "accuracy=[right_count]/[total_count]" \
  --dim "category=get_json_object(\`payload\`, '\$.cat')"

# Preview the change without saving
bytedcli --json aeolus dataset-add-fields -r va --app-id 1000252 --dataset-id 3436909 \
  --metric "accuracy=[right_count]/[total_count]" --dry-run
```

Agent Guidance:

- `--dim`/`--metric` are repeatable and take `name=expression`; metric expressions may reference other fields via `[name]`.
- Reads `allDataSetInfoV2`, appends computed fields (metrics `mapType=1`, dims `mapType=0`, both `isUpstreamField=false`), pre-checks via `preCheckDimMetList`, and saves with `dataSetV2`.
- A freshly created/edited dataset can briefly report `saveForbidden`/`updating`; the command retries with backoff.
- Duplicate field names are rejected; pick a unique name or remove the existing field first.

### `aeolus dataset-remove-fields`

Remove dimensions/metrics from an existing editable dataset by name.

```bash
bytedcli aeolus dataset-remove-fields -r va --app-id 1000252 --dataset-id 3436909 --field old_metric

# Force-remove a referenced or partition field
bytedcli aeolus dataset-remove-fields -r va --app-id 1000252 --dataset-id 3436909 --field p_date --force
```

Agent Guidance:

- `--field` is repeatable. By default the command blocks removing a field that another field's expression references via `[name]`, or a partition/auto-added field; pass `--force` to override.
- Refuses to remove every field (a dataset must keep at least one).
- Use `--dry-run` to preview the before/after field count without saving.

### `aeolus report resolve`

Resolve an Aeolus dataQuery URL to report metadata and the full dimMet list (dimensions + metrics). Useful as a first step before `report query` when you have a browser URL but need the underlying dataset structure.

```bash
# Resolve from a dataQuery URL (region auto-detected from URL)
bytedcli aeolus report resolve --url "https://aeolus-example.tiktok-row.net/aeolus/pages/dataQuery?appId=1005563&rid=13958206&sid=4961129"

# Resolve without URL (requires --region and --report-id)
bytedcli aeolus report resolve -r va --report-id 13958206
```

Agent Guidance:

- `aeolus report resolve` fetches the report detail and enriches it with the dataset's full dimMet list (dimensions + metrics with IDs, names, expressions, and partition flags). Used to discover the saved query config (dimMet IDs, reqJson) for a single dataQuery URL — typically as input to `report query`.
- The flat `aeolus resolve-report` command serves a different intent: it resolves dashboard or dataQuery URLs to dataset IDs, intended for batch dataset discovery and access-request workflows. Prefer `report resolve` when you have a single dataQuery URL and want the saved query config; prefer `resolve-report` when you have a dashboard URL or only need dataset IDs.
- If the report has an associated dataset, the dimMet list is fetched automatically; a dimMet fetch failure is non-fatal and the report metadata is still returned.
- Saved reports store their dimMet selection in two shapes, and `report resolve` exposes it as `dimMetConfig` in the JSON output when the report has one: inline entry objects land in `dimMetConfig.dimMetMap`, ID-only selections land in `dimMetConfig.dimMetIdsByDataset` (e.g. `{"<datasetId>": [1700059025281, ...]}`). When `dimMetConfig` is present, both maps are present (the unused shape is an empty object). For the ID-list shape, resolve each ID against the `dimensions` / `metrics` arrays in the same output (or `dataset-fields`). The API may return `displayType: null` for saved dataQuery reports; the CLI normalizes that to an omitted field (`reportDisplayType` absent from JSON output).

### `aeolus report query`

Execute a saved Aeolus report and output rows (`--format data`, default) or the underlying ClickHouse SQL (`--format sql`). When `--url` is provided, the report's saved dimMet and where clauses are auto-resolved; otherwise specify `--dim-met` explicitly.

```bash
# Fetch data from a saved report URL (auto-resolves config)
bytedcli aeolus report query --url "https://aeolus-example.tiktok-row.net/aeolus/pages/dataQuery?appId=1005563&rid=13958206&sid=4961129"

# Fetch data with explicit parameters
bytedcli aeolus report query -r va --app-id 1005563 --dataset-id 4961129 \
  --dim-met '{"dimMetId":1590328014122,"name":"app_id","expr":"`app_id`","roleType":0}' \
  --limit 50

# Fetch with a where filter
bytedcli aeolus report query -r va --app-id 1005563 --dataset-id 4961129 \
  --dim-met '{"dimMetId":1590328014122,"name":"app_id","expr":"`app_id`","roleType":0}' \
  --where '{"dimMetId":1590328014119,"name":"partition_date","op":"lastSync","val":[1],"valOption":{"datetimeUnit":"day","anchorOffset":0}}'

# Get the underlying SQL (still issues a real query against Aeolus)
bytedcli aeolus report query --format sql --url "https://aeolus-example.tiktok-row.net/aeolus/pages/dataQuery?appId=1005563&rid=13958206&sid=4961129"
```

**Options:**

- `--url <aeolusUrl>` — Aeolus dataQuery URL (auto-resolves report config)
- `-r, --region <region>` — Region (required when `--url` is not provided)
- `--app-id <appId>` — Aeolus app ID (required without `--url`)
- `--dataset-id <datasetId>` — Aeolus dataset ID (required without `--url`)
- `--report-id <reportId>` — Aeolus report ID for auto-resolving dimMet config
- `--dim-met <json>` — One dimension/metric entry, repeatable (required without `--url`)
- `--where <json>` — One filter entry, repeatable
- `--limit <N>` — Row limit (default 100)
- `--timeout-ms <ms>` — Request timeout in milliseconds
- `--format <fmt>` — `data` (default) returns rows; `sql` returns the generated ClickHouse SQL extracted from the response. **Note:** `--format sql` still issues a real VizQuery request — there is no compile-only endpoint.

Agent Guidance:

- When `--url` is provided and the report has saved configuration (`reqJson`), it is used as the request body override, preserving the report's original dimMet/where setup.
- When no saved config exists, `--dim-met` must be provided explicitly.
- `--format data` output includes `columns`, `rows`, `rowCount`, and `requestId` for debugging.
- `--format sql` extracts `sqlList` and `queryHistoryId` from the raw response. If the response does not contain `sqlList`, the output will indicate "No SQL found in VizQuery response."
- Uses the same VizQuery API as `aeolus viz-query`, so Titan Passport cookie auth applies.

### `hrbi_mycis` 使用提示

- 如果 `dataset-fields` 在 `hrbi_mycis` 返回 `aeolus/clickhouse/invalidRequest`，优先改查同名的迁移数据集。
- 很多 ClickHouse 数据集会强制要求命中日期分区；直接执行 `viz-query` 时，优先补 `partition_date` 过滤，否则容易报 `force_index_by_date`。
- 若需要对 `hrbi_mycis` 等 region 增加仓库内本地策略限制，统一走 `src/services/aeolus/policy.ts` + `config/aeolus/aeolus_policy.json`，并在 handler 调用真实 API 前集中校验；不要把用户名、dataset allowlist 或 region 特判硬编码到 `src/api/*`、command 层或多个 handler 分支里。用户身份优先复用 `~/.local/share/bytedcli/data/userinfo.json`，缺失时再提示执行 `bytedcli auth userinfo`。
- Aeolus 这类随仓库固定交付的策略文件，默认放在 `config/aeolus/` 下，并通过 `src/utils/package_root.ts#getPackageRoot()` 从项目根目录读取；环境变量 override 只作为测试或临时调试兜底，不要再把项目级策略默认放到 `~/.local/share/bytedcli/data/`。
- 例如查询 `用户权限删除记录数据集（MY 迁移）` 的 `new_emp_id` 时，可以这样写：

```bash
bytedcli --site i18n-bd aeolus viz-query \
  -r hrbi_mycis --app-id 667 --dataset-id 2892 \
  --dim-met '{"dimMetId":1590328014236,"name":"new_emp_id","expr":"`new_emp_id`","roleType":0,"dataType":"string"}' \
  --where '{"dimMetId":1590328014230,"name":"partition_date","op":"lastSync","val":[1],"valOption":{"datetimeUnit":"day","anchorOffset":0}}'
```

### 复用浏览器 payload

如果直接抓到浏览器的完整 payload，可以整段丢给 `--body` 或 `--body-file`：

```bash
bytedcli --site i18n-bd aeolus viz-query \
  -r hrbi_mycis --app-id 667 --dataset-id 2889 \
  --timeout-ms 90000 \
  --body-file ./payload.json
```

`requestId` 会自动替换为 CLI 生成的新值；其余字段（`schema`、`display`、`originalSchema` 等）保持不变。

## SQL Syntax Notes

- Do **not** assume ``FROM `[DatasetName]` `` or `FROM "<datasetId>"` will work. For many datasets this returns `unknownTable`.
- `dataset-fields` lists semantic fields, but not every field name can be queried directly without first locating the physical Aeolus table.
- If `SELECT * LIMIT 1` returns only `dummy`, that does **not** prove the dataset is unusable; it usually means you are not yet querying the backing table.
- Prefer physical-table SQL once you have identified the actual table name from `system.query_log` or dataset model info.
- Partition fields must still be included in `WHERE` clauses where applicable.

## Authentication

By default, Aeolus commands reuse the token obtained from `bytedcli auth login`, just like most other bytedcli domains.

For most Dataset API commands, you can optionally configure region-specific `ClientID/ClientSecret` in `.aeolus.env` or environment variables. When present, CLI will prefer those credentials, which is useful for automation:

1. Visit the Aeolus Developer Console to get your ClientID and ClientSecret（域名以租户为准，常见如下）:
   - **CN region**: [data.bytedance.net](https://data.bytedance.net/aeolus/pages/developer/console/certification)
   - **SG region**: [aeolus-sg.tiktok-row.net](https://aeolus-sg.tiktok-row.net/pages/developer/console/certification)
   - **VA region**: [aeolus-va.tiktok-row.net](https://aeolus-va.tiktok-row.net/pages/developer/console/certification)
   - **EU-TTP region (`euttp`)**: [aeolus-eu-ttp.tiktok-eu.net](https://aeolus-eu-ttp.tiktok-eu.net/pages/developer/console/certification)
   - **EU PIPO region (`eupipo`)**: [aeolus-clover-pipo.tiktok-eu.net](https://aeolus-clover-pipo.tiktok-eu.net/pages/developer/console/certification)
2. Create `.aeolus.env` file (choose one location):
   - **Global**: `~/.bytedcli/.aeolus.env` (recommended for npm global install)
   - **Local**: `./.aeolus.env` in current working directory (overrides global)

```bash
# Region-specific credentials
BYTEDCLI_AEOLUS_CN_CLIENT_ID=your_cn_client_id
BYTEDCLI_AEOLUS_CN_CLIENT_SECRET=your_cn_client_secret
BYTEDCLI_AEOLUS_SG_CLIENT_ID=your_sg_client_id
BYTEDCLI_AEOLUS_SG_CLIENT_SECRET=your_sg_client_secret
BYTEDCLI_AEOLUS_VA_CLIENT_ID=your_va_client_id
BYTEDCLI_AEOLUS_VA_CLIENT_SECRET=your_va_client_secret
BYTEDCLI_AEOLUS_EUTTP_CLIENT_ID=your_euttp_client_id
BYTEDCLI_AEOLUS_EUTTP_CLIENT_SECRET=your_euttp_client_secret
BYTEDCLI_AEOLUS_EUPIPO_CLIENT_ID=your_eupipo_client_id
BYTEDCLI_AEOLUS_EUPIPO_CLIENT_SECRET=your_eupipo_client_secret
```

## Query Editor (ad-hoc SQL)

Query Editor defaults to the authentication result obtained from `bytedcli auth login`, but it does not support region-specific `ClientID/ClientSecret` overrides. It defaults to `cn`, and also supports `-r/--region` to switch between `cn`, `sg`, `va`, `euttp`, `eupipo`, `mycis`, `hrbimycis`, `mybd`, `sglark`, `usttpusts`, and `usbd`. For `mycis`, `mybd`, and `usbd`, Query Editor reuses the local browser session for `i18n-bd`. For `euttp`, it reuses the local browser session for `eu-ttp`. `eupipo` also uses the `eu-ttp` site, but exchanges Titan credentials through the host-specific `do-pipo.tiktok-eu.net` issuer and targets the Clover/PIPO host. For `usttpusts`, it reuses the local browser session for `us-ttp-usts`. For `hrbimycis`, bytedcli only supports dataset visual queries through `aeolus viz-query`.

### EU-TTP (`euttp`) — same auth model as US-TTP (`usttpusts`)

|                    | US-TTP (`usttpusts`)        | EU-TTP (`euttp`)              |
| ------------------ | --------------------------- | ----------------------------- |
| Cloud site         | `--site us-ttp-usts`        | `--site eu-ttp`               |
| Office Aeolus host | `aeolus-tx.tiktok-usts.net` | `aeolus-eu-ttp.tiktok-eu.net` |
| Query Editor `-r`  | `usttpusts`                 | `euttp`                       |

`auth login` / `auth login --session` alone is **not** enough for compliance QE; run **`aeolus query-editor login`** on the compliance host.

### Query Editor authentication

```bash
# One-time login
bytedcli auth login

# Query Editor on mycis / mybd / usbd
bytedcli --site i18n-bd auth login --session

# Compliance QE (euttp / usttpusts)
bytedcli --site eu-ttp aeolus query-editor login
bytedcli --site us-ttp-usts aeolus query-editor login
```

Cookies are cached locally and reused until expiry (~14 days). For `mycis`, `mybd`, and `usbd`, make sure the `i18n-bd` browser session is ready first. For `euttp`, complete sign-in on `aeolus-eu-ttp.tiktok-eu.net` in the temporary browser opened by `query-editor login` (not only `auth login --session`). For `usttpusts`, use `query-editor login` on `aeolus-tx.tiktok-usts.net`. For `hrbimycis`, use `aeolus viz-query` instead of Query Editor or `aeolus query`.

For `eupipo`, use `bytedcli --site eu-ttp auth login`; if Aeolus still returns a product-login page, run `bytedcli --site eu-ttp auth login --session --auto --yes` once to seed the Clover/PIPO product cookie, then retry with `-r eupipo`.

### Query Editor quick start

```bash
# Check current user
bytedcli aeolus query-editor whoami
bytedcli aeolus query-editor whoami --region sg

# Folder management
bytedcli aeolus query-editor folder list
bytedcli aeolus query-editor folder list --region va
bytedcli aeolus query-editor folder tree
bytedcli aeolus query-editor folder create --name "my-queries"

# File management
bytedcli aeolus query-editor file create --name "test" --folder-id 123
bytedcli aeolus query-editor file write-sql --file-id 456 --sql "SELECT 1"
bytedcli aeolus query-editor file search --keyword "test"

# SQL execution
bytedcli aeolus query-editor queues
bytedcli aeolus query-editor query parse --sql "SELECT 1"
bytedcli aeolus query-editor query run --file-id 456 --folder-id 123 --queue <your_queue> --sql "SELECT 1"
bytedcli aeolus query-editor query run --file-id 456 --folder-id 123 --queue <your_queue> --file ./queries/demo.sql
bytedcli aeolus query-editor query status --task-id 789 --file-id 456 --folder-id 123
bytedcli aeolus query-editor query logs --task-id 789
bytedcli aeolus query-editor query cancel --task-id 789

# One-shot query (auto-creates file, runs SQL, returns results)
bytedcli aeolus query-editor query one --queue <your_queue> --sql "SELECT 1"

# Custom datasource (user-defined, e.g. DORIS): list sources, then query (no --queue)
export QE_APP_ID=<yourWorkspaceAppId>   # custom datasources are appId-scoped
bytedcli aeolus query-editor datasources
# by name (resolved to id+type via the datasources list):
bytedcli aeolus query-editor query one --engine datasource --datasource-name <datasourceName> --sql "select * from sample_db.sample_tbl limit 10"
# or directly by id+type (works without the workspace appId):
bytedcli aeolus query-editor query one --engine datasource --datasource-id <datasourceId> --datasource-type DORIS --sql "select * from sample_db.sample_tbl limit 10"
```

### Query Editor: ClickHouse (`--engine ch`)

默认走 Hive `/hive/task/run`；与浏览器 Query Editor 一致的 ClickHouse 任务请用 **`--engine ch`**（`/ch/task/*`）、并保证 **`status` / `logs` / `cancel` 与 `run` 使用相同 `--engine`**。参数表、`QE_APP_ID`、`BYTEDCLI_CLOUD_SITE`（VA/SG 常为 `i18n-tt`）等完整说明见 **`references/aeolus.md` 的「Query Editor」章节**。

### Query Editor: parse/check SQL

`query parse` mirrors the browser Query Editor Parse button. It calls `/hive/task/explain` by default, or `/ch/task/explain` with `--engine ch`, and does not submit a task:

```bash
bytedcli aeolus query-editor query parse --sql "SELECT 1"
bytedcli aeolus query-editor query parse --file ./queries/demo.sql
bytedcli aeolus query-editor query parse --engine ch --cluster-name <cluster_name> --ch-region VA --sql "SELECT 1"
```

### Query Editor: 自定义数据源（`--engine datasource`）

针对用户在风神里自建的数据源（如 DORIS）提交查询。两种指定方式：**`--datasource-name <name>`**（自动从 `aeolus query-editor datasources` 解析出 id+type）或 **`--datasource-id <id> --datasource-type <type>`**（直接指定，`--datasource-id` 优先）。走 `/datasource/task/*`，不需要 `--queue`/`--idc`；`status` / `logs` / `cancel` 必须复用同一个 `--engine datasource`。⚠️ 自定义源是 **appId 作用域**的：`datasources` 列表能列出该源、`--datasource-name` 能解析，都要求 `QE_APP_ID` 等于拥有该源的 Query Editor 工作区 appId（即页面 URL 里的 `appId=`）；用显式 `--datasource-id` 提交则不依赖 appId。完整参数与示例见 **`references/aeolus.md` 的「Query Editor」与「Custom datasource example」章节**。

### Query Editor: `HTTP 406` 解码

`query run` / `query one` 报 **`HTTP 406`** 不是协议问题，而是后端拒绝执行，两个常见原因：

1. 当前账号缺少所查表的权限 —— 走 `bytedcli coral permission apply` 申请表权限。
2. 该表/集群要求显式指定队列与机房 —— 重跑时带上 `--queue <queue> --idc <idc>`。

带了 queue/idc 仍 406 时，用 `bytedcli --http-debug ... query-editor query run ...` 看原始响应定位。

### Recommended usage: `query one` vs full Query Editor workflow

- Use `aeolus query-editor query one` for one-off or exploratory SQL where you only need to run a small number of temporary queries quickly.
- Use the full Query Editor workflow when you are analyzing one system or topic and expect multiple related SQL queries over time.
- The full workflow avoids creating a new temporary folder on every query, lets you reuse the same folder/file IDs, and keeps related SQL under one theme directory so you can search and review query history later.
- In the full workflow, prefer passing SQL directly to `query run --sql ...` or `query run --file ...`. Writing SQL into the file first is optional, not required for execution.
- Under the hood, both `query run --sql ...` and `query run --file ...` call the same Query Editor `run` API with the same `page_id` / `block_id`; **Hive** (default) sends `yarn` queue fields, while **`--engine ch`** sends `cluster_name` / `region` instead. The only difference between `--sql` and `--file` is where `query` / `query_template` text comes from.
- A practical organization pattern is: create one folder for the overall analysis theme, create multiple files for different sub-scenarios under that theme, and then reuse the same `file-id` for multiple `query run` executions when one sub-scenario needs several SQL variants.
- In that model, `folder-id` is the theme container, and `file-id` is closer to a reusable query context for one sub-scenario than a hard binding to exactly one SQL statement.

Recommended persistent workflow:

```bash
# 1) Create or reuse a theme folder once
bytedcli aeolus query-editor folder create --name "svc-frk-analysis"

# 2) Create one or more query files inside that folder
bytedcli aeolus query-editor file create --name "partitions" --folder-id 123
bytedcli aeolus query-editor file create --name "daily-sample" --folder-id 123
bytedcli aeolus query-editor file create --name "rootcause-drilldown" --folder-id 123

# 3) Run queries against the same reusable file/folder IDs
bytedcli aeolus query-editor query run --file-id 456 --folder-id 123 --queue <your_queue> --sql "SHOW PARTITIONS svc_frk.ods_cp_cds_keys_df"
bytedcli aeolus query-editor query run --file-id 457 --folder-id 123 --queue <your_queue> --sql "SELECT * FROM svc_frk.ods_cp_cds_keys_df WHERE date = '20260412' LIMIT 100"
bytedcli aeolus query-editor query run --file-id 457 --folder-id 123 --queue <your_queue> --file ./queries/daily-sample.sql
bytedcli aeolus query-editor query run --file-id 458 --folder-id 123 --queue <your_queue> --sql "SELECT protocol, date FROM svc_frk.ods_cp_cds_keys_usttp_df WHERE date = '20260412' LIMIT 10"
bytedcli aeolus query-editor query run --file-id 458 --folder-id 123 --queue <your_queue> --sql "SELECT to_service, count(*) FROM svc_frk.ods_cp_cds_keys_usttp_df WHERE date = '20260412' GROUP BY to_service LIMIT 20"

# 4) Optionally persist SQL into the file body for later viewing/editing in Query Editor UI
bytedcli aeolus query-editor file write-sql --file-id 456 --sql "SHOW PARTITIONS svc_frk.ods_cp_cds_keys_df"
bytedcli aeolus query-editor file write-sql --file-id 457 --sql "SELECT * FROM svc_frk.ods_cp_cds_keys_df WHERE date = '20260412' LIMIT 100"

# 5) Inspect task status / logs and search historical SQL files later
bytedcli aeolus query-editor query status --task-id 789 --file-id 456 --folder-id 123
bytedcli aeolus query-editor query logs --task-id 789
bytedcli aeolus query-editor query cancel --task-id 789
bytedcli aeolus query-editor file search --keyword "svc_frk"
```

Notes:

- `query one` is optimized for convenience, not long-term organization.
- `query run` should include `--sql` or `--file` when you want to execute against an existing `file-id` / `folder-id`.
- For repeated analysis, prefer naming folders by topic/system (for example `svc-frk-analysis`, `creator-growth-debug`, `dashboard-245033-rootcause`).
- Query Editor commands default to `cn`, and support `-r/--region` to switch host/domain consistently with Aeolus dataset/report APIs.

### Query Editor command structure

```
aeolus query-editor
  ├── whoami / queues / datasources
  ├── folder   list|tree|create|rename|move|delete
  ├── file     get|create|write-sql|rename|move|delete|search
  ├── template list|get
  └── query    parse|run|status|logs|one
```

### Query Editor templates

`template list/get` 浏览 Query Editor 已保存模板（替代已下线的 `shuttle template search/get`）：

```bash
# 列模板（默认 parent-id=0 根目录、department=public）
bytedcli aeolus query-editor template list -r cn
bytedcli aeolus query-editor template list -r cn --parent-id 123 --department public
# 分页（默认 --page 1、--page-size 20）
bytedcli aeolus query-editor template list -r cn --page 2 --page-size 50
# 取某模板的 SQL（--template-id 用 list 返回的 template_id）
bytedcli aeolus query-editor template get -r cn --template-id 17
```


## Shuttle (Data Query Projects)

> **⚠️ Deprecated（后端已下线）**：Shuttle 旧后端路径 `/shuttle/web/api/v1/` 已在全部机房下线（cn 302 跳 titan/login，ROW 网关返回前端 SPA HTML），所有 `aeolus shuttle …` 子命令均无法返回数据。命令树暂时保留仅用于发现性引导，请改用等价的 `aeolus query-editor …` 命令（走 `/qe/v2/api/`，5 个机房均已验证可用）：
>
> | shuttle（已下线） | 改用 query-editor |
> | --- | --- |
> | `shuttle template search` | `query-editor template list` |
> | `shuttle template get` | `query-editor template get` |
> | `shuttle folder list/tree/create/delete/move/rename` | `query-editor folder list/tree/create/delete/move/rename` |
> | `shuttle task get` / `task submit` | `query-editor query status` / `query run` |
> | `shuttle queue get` | `query-editor queues` |
> | `shuttle project list` | 无直接等价（QE 用 `template list` 浏览模板/目录） |

Shuttle 是 Aeolus 平台上的数据查询项目管理工具。按项目组织查询模板，用模板已有 SQL 或 `--query`/`--query-file` 自定义 SQL 提交查询任务，再回看任务结果、下载完整结果文件。同一项目下的模板可以归档进「我的模板」侧栏的文件夹层级里，所以创建/重命名/移动/删除模板与文件夹的命令成对存在。

### Shuttle quick start

```bash
# 项目与队列资源
bytedcli aeolus shuttle project list -r va
bytedcli aeolus shuttle project list -r va --keyword "example" --limit 20
bytedcli aeolus shuttle queue   get  -r va --project-id 1233

# 搜索 / 查看模板（搜索要求 --project-id）
bytedcli aeolus shuttle template search -r va --project-id 1233 --keyword "detection"
bytedcli aeolus shuttle template search -r va --project-id 1233 --creator "username"
bytedcli aeolus shuttle template get    -r va --template-id 100100

# 提交查询任务
# - 用模板已有 SQL：BATCH 基板可加 --start-date/--end-date 范围；ADHOC 基板不接受范围
bytedcli aeolus shuttle task submit -r va --template-id 100100 --project-id 1233 --start-date 2026-04-25 --end-date 2026-04-28
# - 用自定义 SQL：CLI 在内部创建一次性临时模板（不进侧栏「我的模板」），继承 --template-id 的 taskType/dataSource/engine 与 DECC infos
bytedcli aeolus shuttle task submit -r va --template-id 100100 --project-id 1233 --query "SELECT count(DISTINCT user_id) AS uv FROM demo_table WHERE p_date >= '20260425'"

# 查看 / 下载任务结果（--shuttle-region 是任务详情 infos 的 key，与 -r/--region 无关）
bytedcli aeolus shuttle task get      -r va --task-id 200200
bytedcli aeolus shuttle task result   -r va --task-id 200200
bytedcli aeolus shuttle task download -r va --task-id 200200 --shuttle-region US --fmt excel -o ./demo-shuttle-export.xlsx
bytedcli aeolus shuttle task download -r va --task-id 200200 --shuttle-region EU --fmt csv   -o ./demo-shuttle-export.csv --timeout-ms 240000

# 新建模板（默认进入项目根目录下的「我的模板」侧栏）
bytedcli aeolus shuttle template create -r va --project-id 1233 --name "my_template" --query "SELECT 1"
# 需要 DECC 合规审批：用 --clone-template-id 从已有模板复制 deccSchemaId / taskType / dataSource / engine
bytedcli aeolus shuttle template create -r va --project-id 1233 --name "my_template" --query "SELECT 1" --clone-template-id 100100
# 克隆的是 BATCH 基板：必须显式给日期范围，否则后端会因缺少范围而报错
bytedcli aeolus shuttle template create -r va --project-id 1233 --name "my_template" --query "SELECT 1" --clone-template-id 100200 --start-date 2026-04-25 --end-date 2026-04-28
# 不依赖任何已有模板：直接用 --decc-schema-id 绑定一个已知的 DECC schema，CLI 客户端构造 infos
# 适合：已知目标 region 的 deccSchemaId，又不想为找一个"合适的 clone 源 template"花时间排查
# （HDFS vs MQ channel、infos.region 是否匹配目标机房等）
bytedcli aeolus shuttle template create -r va --project-id 1233 --name "demo_us_template" --query-file ./uv.sql \
  --decc-schema-id <us_schema_id> --decc-region US --decc-channel-type HDFS
# 其他 region 同样直接绑（注意 schemaId 与 region 都换成目标区的）
bytedcli aeolus shuttle template create -r va --project-id 1233 --name "demo_eu_template" --query-file ./uv.sql \
  --decc-schema-id <eu_schema_id> --decc-region EU --decc-channel-type HDFS

# 整理「我的模板」目录树
#   folder 用 --folder-id / --parent-id / --target-parent-id；template move 用 --target-folder-id
#   "项目根目录" 在 CLI 里有两种等价写法：省略目标 ID flag，或显式传 0（CLI 内部会翻译成后端的 null parent）
bytedcli aeolus shuttle folder tree   -r va --project-id 1233
bytedcli aeolus shuttle folder list   -r va --project-id 1233                          # 列项目根目录
bytedcli aeolus shuttle folder list   -r va --project-id 1233 --folder-id 4521         # 列指定文件夹下的内容
bytedcli aeolus shuttle folder create -r va --project-id 1233 --name "demo_folder"     # 在项目根目录新建
bytedcli aeolus shuttle folder create -r va --project-id 1233 --name "sub" --parent-id 4521
bytedcli aeolus shuttle folder rename -r va --project-id 1233 --folder-id 4521 --name "renamed_folder"
bytedcli aeolus shuttle folder move   -r va --project-id 1233 --folder-id 4521 --target-parent-id 0   # 移回根目录
bytedcli aeolus shuttle folder delete -r va --project-id 1233 --folder-id 4521                     # 必须先清空

# Shuttle 没有 template rename API；要改名请「重新 create + 删旧」。
bytedcli aeolus shuttle template move   -r va --project-id 1233 --template-id 100100 --target-folder-id 4521
bytedcli aeolus shuttle template move   -r va --project-id 1233 --template-id 100100 --target-folder-id 0   # 移回根目录
# 删除模板：模板若在文件夹里，传 --project-id 让 CLI 先把它从父文件夹解绑（避免父文件夹之后无法 delete）
bytedcli aeolus shuttle template delete -r va --template-id 100100 --project-id 1233
```

#### 把一段 SQL 保存到指定文件夹（save 等价流程）

CLI 没有单条 `save`；`template create` 也不接受 `--parent-id`/`--folder-id`。要按"命名 + 路径"保存 SQL，组合两步即可：

```bash
# 1) 先准备目标文件夹（已存在就跳过这步，直接复用其 folderId）
bytedcli aeolus shuttle folder tree   -r va --project-id 1233
bytedcli aeolus shuttle folder create -r va --project-id 1233 --name "kb-saved-sql"   # 记下返回的 folderId（例：4521）

# 2) 创建模板（先在根目录），再移入目标文件夹
bytedcli aeolus shuttle template create -r va --project-id 1233 --name "uv_by_country" --query-file ./uv.sql
bytedcli aeolus shuttle template move   -r va --project-id 1233 --template-id <newTemplateId> --target-folder-id 4521
```

### Shuttle command structure

```
aeolus shuttle
  ├── project list                                              List Shuttle projects
  ├── queue   get                                               YARN queue info for a project
  ├── template
  │   ├── search    (--project-id required)                     Search templates
  │   ├── get                                                   Template detail (SQL, params, DECC)
  │   ├── create    (default taskType=BATCH → --start-date/--end-date required)  Create template; clone DECC via --clone-template-id, OR bind directly via --decc-schema-id + --decc-region
  │   ├── delete    (--project-id detaches from parent folder)  Delete a template
  │   └── move      (--target-folder-id; omit or 0 = project root)  Move template into / out of a folder
  │   (no rename — Shuttle has no public template-rename endpoint; re-create + delete)
  ├── folder
  │   ├── list      (--folder-id; omit = project root)          List a folder's direct children
  │   ├── tree                                                  Full folder/template tree
  │   ├── create    (--parent-id; omit = project root)          Create a new folder
  │   ├── delete                                                Delete an empty folder
  │   ├── move      (--target-parent-id; omit or 0 = project root) Move a folder under another parent
  │   └── rename                                                Rename a folder
  └── task
      ├── get                                                   Task detail (status, engine, region info)
      ├── result                                                Task query result (columns + rows)
      ├── download  (--fmt excel|csv, --shuttle-region <code>)  Save full result file to disk
      └── submit    (--query / --query-file for custom SQL)     Submit a query task
```

### Shuttle notes

- Shuttle 命令复用 Aeolus 认证（`bytedcli auth login` 或 region-specific `ClientID/ClientSecret`）。
- `template search` 必填 `--project-id`，并支持 `--keyword` / `--creator` / `--only-favored` / `--page` / `--per-page`。
- `template get` 返回模板 SQL（`query`）、参数定义（`params`，兼容 `name`/`defaultValue` 与 `key`/`value` 两种字段形态）、以及各 region 的 DECC 合规信息（`deccSchemaId`）。
- `task submit` 有两种模式：
  - 不带 `--query` / `--query-file`：使用模板已有 SQL，占位符支持 `${name}` 与 `{{name}}`（`${date}` / `${date-N}`、`{{date}}` / `{{date-N}}` 由 CLI 按 `--end-date` 展开），`--var key=value` 覆盖模板参数默认值。
  - 带 `--query` / `--query-file`：CLI 从 `--template-id` 拉详情，创建一次性临时模板时继承 `taskType` / `dataSource` / `engine` 与 DECC `infos`，模板不会进入「我的模板」侧栏。**自定义 SQL 必须产出与源模板 DECC schema 一致的列**（例如 `score_bucket` / `commission_rate` / `detection_uv` + `COUNT(DISTINCT author_id)`），否则后端会返回误导的 `invalidTemplateSnapshotException: failed to parse the template sql`。
  - **ADHOC 基板 + `--start-date` / `--end-date` 会立即报错**：ADHOC 单日任务不接受范围，需要范围请改用 BATCH 基板。
- `template create` 默认 `taskType=BATCH` 进入「我的模板」侧栏（项目根目录），**所以无论是否使用 `--clone-template-id` 都必须传 `--start-date` / `--end-date`**——后端会因缺少范围而 NPE。需要 DECC 审批时用 `--clone-template-id` 复制源模板的 `deccSchemaId` 与 `taskType` / `dataSource` / `engine`（如果克隆的是 ADHOC 基板则不需要日期范围）。CLI 没有 `save` 命令；要保存到具体文件夹用上面的「save 等价流程」。
- **`--decc-schema-id` 直接绑定（不依赖已有模板）**：当你已知目标 region 的 `deccSchemaId` 时，可用 `--decc-schema-id <id> --decc-region <US|EU|EU-TTP2|...> [--decc-channel-type HDFS|MQ] [--decc-status approved]` 直接构造 `infos` 绑定 DECC schema。规则：
  - 与 `--clone-template-id` **互斥**（同时传报 `SHUTTLE_TEMPLATE_CREATE_CONFLICTING_OPTIONS`）
  - `--decc-region` 必填（缺则报 `SHUTTLE_TEMPLATE_CREATE_MISSING_REGION`）
  - `--decc-channel-type` 默认 `HDFS`，`--decc-status` 默认 `approved`
  - 走该路径时 CLI 自动设 `taskType=ADHOC` / `dataSource=HIVE` / `engine=Auto`——避免 BATCH 默认值在缺 range 时触发后端 NPE；要做 BATCH 时仍可叠加 `--start-date` / `--end-date`
  - SQL 输出列仍受 DECC schema 字段池约束（同 clone 路径），不匹配后端会回 `invalidTemplateSnapshotException`
- 文件夹与模板归档：
  - 顶层（项目根目录）在 CLI 里有两种等价写法——省略目标 ID flag，或显式传 `0`。CLI 在内部把 `0` 翻译成后端要求的 `null`；**不要直接对 Shuttle 后端 API 传 `0`**，它会回 `Directory Node 0 does not exist`。
  - `folder list` 返回某文件夹的直接子项（子文件夹 + 该文件夹下的模板），`folder tree` 返回项目下整棵目录树。
  - `folder delete` 要求文件夹空；删除其中的模板时**务必传 `template delete --project-id <id>`**，CLI 会先把模板从父文件夹解绑、再 DELETE，否则即使 `folder list` 已经空，`folder delete` 仍会返回 `Cannot delete directory as it is not empty`。
  - 区分动作对象：`template move --target-folder-id <id>` 是把单个模板挂到目标文件夹下；`folder move --target-parent-id <id>` 是把整棵子目录挂到新的父级。
  - Shuttle 没有公开的 template-rename 接口（`PUT/POST/PATCH /template/{id}` 全部返回 405，Shuttle UI 也只提供 Move / Save to）。要改名请重新 `template create` 起新名，再 `template delete --project-id` 老的。
- `task result` 从任务详情 `infos.{REGION}.result` 提取列名和数据行。
- `task download` 调用 `GET .../task/{taskId}/download`，把 Excel 或 CSV 写入 `-o/--output`。**`-r/--region`（Aeolus 网关 cn/sg/va）须用户显式指定**，与平时能打开 Shuttle 的 Aeolus 站点一致，**不能**由 task id 或 `--shuttle-region` 推断。`--shuttle-region` 对应 URL 里的 `region=`，**必须与任务详情 `infos` 的 key 一致**（EU 与 US/TTP **不要混用**，拼写以后台为准），**不要与 `-r` 混淆**。大文件用 `--timeout-ms`（默认 180000 ms）。若接口先返回 Shuttle JSON 信封且 `data` 为对象存储 HTTPS 链接，CLI 仅在与 Shuttle API **同 host** 时对跟链请求附带 Aeolus 鉴权，跨域预签名 URL 不会发送 Cookie/token。
- `queue get` 显示项目在各 region 的 YARN 队列资源使用率、可用内存、等待任务数等。

## Notes

- Use `--json` for structured JSON output (global option before subcommand)
- **Region (`-r`) is required** for all Dataset API commands
- Dataset ID can be found in `list-authorized` output
- App ID can be found in `list-authorized` JSON output (`app.id` field)
- Partition fields are marked in `dataset-fields` output
- `dataset-fields`, `dataset-model-info` and `query` only work with `data_set` type, not `dashboard`
- Query Editor commands default to `cn`; pass `-r/--region <region>` to target `sg`, `va`, `euttp`, `eupipo`, `mycis`, `hrbimycis`, `mybd`, `sglark`, `usttpusts`, or `usbd`

## References

- `references/aeolus.md`（命令级参考；含 **Query Editor**、`--engine ch`、Regions 与鉴权）
- `../../invocation.md`
- `../../troubleshooting.md`（工具版本过期与常见错误自查，排错前先看）
