# Slardar

Use `bytedcli slardar` as the unified Slardar command group:

- `slardar web`: Web / Hybrid Query Assistant, Workflow Studio, Data Explore, Flex meta, alarms, JS errors, SOP, and Investigation.
- `slardar app`: Slardar App abnormal trends, issue logs, retrace/native stack symbolication, native symbol URLs, log file search/download, and encrypted ALog zip decrypt.
- `slardar os`: Slardar OS issue event summaries and main-thread native stack symbolication.
- `slardar perfsee`: Perfsee Lab project config, snapshot list/get/run, report list/get/download, and URL parsing.

## URL routing

- `/node/app_detail/` with `#/track/logSearch/logs`: Slardar App log file search page. Use `slardar app file list --url "<url>"` to list files, or `slardar app file download --all --url "<url>" --output ./logs` to download all.
- `/node/app_detail/` with `#/abnormal/detail/`: Slardar App issue page. Use `slardar app issue log`, usually with `--symbolicate` when native stacks should be readable.
- App abnormal trends: use `slardar app trend` with any Slardar App `crash_type`. `--all-crash-types` follows the selected OS meta list: Android includes `anr`, `anr_start`, `anr_not_start`, `asan`, `dart`, `start`, `app`, `exception`, `kill_app`, `native_start`, `native`, `native_exception`, `native_not_start`, `tsan`, `biz_exception`, `serious_lag`, `lag`, `mp`, `lag_drop_frame`, `game`; iOS includes all non-empty meta `crash_type` values such as `watch_dog`, `crash`, `oom_crash`, `exception`, `ios_mem`, MetricKit, Extension, ASAN/TSAN, lag, game, and custom exception types.
- `/node/os_detail/issue/overview/system/detail`: Slardar OS issue page. Use `slardar os issue log`, usually with `--symbolicate` when native stacks should be readable.
- Web alarm page: use `slardar web analyze-alarm-url`, then `slardar web alarm-history` and optionally `slardar web start-investigation`.
- `/node/web/kanban/detail/`: Slardar Web dashboard page. Prefer `slardar web dashboard get --url "<url>"` when the user wants one dashboard's detail, or `dashboard update-name|like|unlike|item add|update|delete|migrate-hybrid-v3 --url "<url>"` when operating on an existing dashboard. Use `dashboard create` for a new dashboard and `dashboard migrate` when the task starts from `aid + dashboard_detail`.
- Web Data Explore: use `slardar web data ev-types|columns|trend|list|get|session-list|event-detail|action-detail`. Prefer `data list` for event rows, then `data get --dh-key <dh-key>` for one row's full `metric_map/json`.
- `/perfsee/projects/<projectId>/lab`: Perfsee Lab page. Use `slardar perfsee project config`, `snapshot list|get|run`, and `report list|get|download`. Report URLs containing `/lab/reports/<reportId>` can be passed directly to report commands.

## Web / Hybrid

When the user intent indicates troubleshooting (`排查` / `排障` / `探索` / `分析`), prefer running a full Slardar Investigation chain via `alarm-history -> start-investigation -> get-investigation`.

```bash
# Query Slardar Web Assistant
bytedcli slardar web query-assistant "查询bid为slardar_test，最近1天的JS错误数，按照错误信息分组"

# Call raw alarm rule-list
bytedcli slardar web alarm-rule-list --origin <slardar-origin> --bid <bid> --site-type web

# Call raw alarm history
bytedcli slardar web alarm-history --origin <slardar-origin> --bid <bid> --site-type web --rule-id <rule-id> --start-time <start-time> --end-time <end-time> --env <env>

# Start investigation by alarm history id
bytedcli slardar web start-investigation --history-id <history_id> --origin <slardar-origin>

# Get investigation details by investigation id
bytedcli slardar web get-investigation --investigation-id <investigation_id> --origin <slardar-origin>

# Create SOP
bytedcli slardar web create-sop --bid <bid> --name <name> --runbook <runbook> --target-metric <target_metric> --origin <slardar-origin>

# Get SOP details by sop id
bytedcli slardar web get-sop --bid <bid> --sop-id <sop_id> --origin <slardar-origin>

# Analyze a Slardar alarm URL
bytedcli slardar web analyze-alarm-url "<slardar-alarm-url>"

# List dashboards from the same context as a dashboard page
bytedcli --json slardar web dashboard list --url "https://slardar.example/node/web/kanban/detail/123456?env=production&bid=demo_bid&region=cn&lang=zh&site_type=web"

# Get one dashboard and include the raw payload for follow-up edits
bytedcli --json slardar web dashboard get --url "https://slardar.example/node/web/kanban/detail/123456?env=production&bid=demo_bid&region=cn&lang=zh&site_type=web" --with-raw

# Create / rename / like / unlike a dashboard
bytedcli slardar web dashboard create --origin "https://slardar.example" --bid demo_bid --env production --site-type web --region cn --lang zh --name "demo-dashboard"
bytedcli slardar web dashboard update-name --url "https://slardar.example/node/web/kanban/detail/123456?env=production&bid=demo_bid&region=cn&lang=zh&site_type=web" --name "demo-dashboard-renamed"
bytedcli slardar web dashboard like --url "https://slardar.example/node/web/kanban/detail/123456?env=production&bid=demo_bid&region=cn&lang=zh&site_type=web"
bytedcli slardar web dashboard unlike --url "https://slardar.example/node/web/kanban/detail/123456?env=production&bid=demo_bid&region=cn&lang=zh&site_type=web"

# Add one item or rewrite the full dashboard payload
bytedcli slardar web dashboard item add --url "https://slardar.example/node/web/kanban/detail/123456?env=production&bid=demo_bid&region=cn&lang=zh&site_type=web" --item-file ./sample-dashboard-item.json
bytedcli slardar web dashboard update --url "https://slardar.example/node/web/kanban/detail/123456?env=production&bid=demo_bid&region=cn&lang=zh&site_type=web" --items-file ./sample-dashboard-items.json --extra-file ./sample-dashboard-extra.json

# Dashboard migration and cleanup
bytedcli slardar web dashboard migrate --origin "https://slardar.example" --aid 123 --dashboard-detail-json '{"demo":{"bid":"demo_bid","env":"production","site_type":"web","region":"cn","lang":"zh"}}'
bytedcli slardar web dashboard migrate-hybrid-v3 --url "https://slardar.example/node/web/kanban/detail/123456?env=production&bid=demo_bid&region=cn&lang=zh&site_type=web"
bytedcli slardar web dashboard delete --url "https://slardar.example/node/web/kanban/detail/123456?env=production&bid=demo_bid&region=cn&lang=zh&site_type=web"

# List Workflow Studio workflows
bytedcli slardar web workflow list --bid <bid> --env <env> --filter-name <workflow-name>

# Get Workflow Studio workflow detail by flow id
bytedcli slardar web workflow get --bid <bid> --env <env> --flow-id <flow-id>

# List Workflow Studio triggers by workflow internal name
bytedcli slardar web workflow trigger list --bid <bid> --env <env> --workflow-name <workflow-name>

# List Workflow Studio tool nodes
bytedcli slardar web workflow tool list

# List Data Explore event types
bytedcli slardar web data ev-types --bid <bid> --env <env>

# List Data Explore columns for an event type
bytedcli slardar web data columns --bid <bid> --env <env> --ev-type <ev-type>

# Query Data Explore trend chart
bytedcli slardar web data trend --bid <bid> --env <env> --ev-type <ev-type> --start-time <start-time> --end-time <end-time>

# List Data Explore rows and fetch one row detail
bytedcli slardar web data list --bid <bid> --env <env> --ev-type <ev-type> --start-time <start-time> --end-time <end-time> --metrics-json '["timestamp","url","session_id"]'
bytedcli slardar web data get --bid <bid> --env <env> --ev-type <ev-type> --dh-key <dh-key>

# List events in one Data Explore session timeline
bytedcli slardar web data session-list --bid <bid> --env <env> --session-id <session-id> --start-time <start-time> --end-time <end-time>

# Query legacy Data Explore detail APIs by event_id / action_id
bytedcli slardar web data event-detail --bid <bid> --env <env> --event-id <event-id> [--kind <kind>] [--start-time <start-time> --end-time <end-time>]
bytedcli slardar web data action-detail --bid <bid> --env <env> --action-id <action-id> [--start-time <start-time> --end-time <end-time>]

# List Web Flex measure categories
bytedcli slardar web flex meta --bid <bid> --env <env> [--filter-label <label>] [--with-raw] [--without-row-raw]

# List Web Flex custom events
bytedcli slardar web flex event-list --bid <bid> --env <env> [--filter-label <label>] [--with-raw] [--without-row-raw]

# List Web Flex measures for a custom event
bytedcli slardar web flex event-measure --bid <bid> --env <env> --event-name <event-name> [--filter-label <label>] [--with-raw] [--without-row-raw]

# List metric-related filters / groups / granularity
bytedcli slardar web flex metric-related --bid <bid> --env <env> --measure-list-json '[{"measure_name":"sample.metric"}]'

# Get / save a query config
bytedcli slardar web flex config get --bid <bid> --env <env> --id <analyze-id>
bytedcli slardar web flex config save --bid <bid> --env <env> --query-config-file ./sample-query-config.json

# Run chart queries
bytedcli slardar web flex query candidate --bid <bid> --env <env> --filter-name <filter-name> --request-file ./sample-request.json
bytedcli slardar web flex query series --bid <bid> --env <env> --request-file ./sample-request.json --group-by-list-json '[{"group_by_name":"sample.dimension"}]'
bytedcli slardar web flex query pie --bid <bid> --env <env> --request-file ./sample-request.json
bytedcli slardar web flex query indicator-card --bid <bid> --env <env> --request-file ./sample-request.json
bytedcli slardar web flex query pivot-table --bid <bid> --env <env> --request-file ./sample-request.json
bytedcli slardar web flex query histogram --bid <bid> --env <env> --request-file ./sample-request.json --histogram-config-list-file ./sample-histogram-config.json

# List pending JS errors
bytedcli slardar web js-error-list --bid <bid> --env <env> --start-time <start-time> --end-time <end-time> --origin <slardar-origin>

# Get JS error issue detail by issue id
bytedcli slardar web js-error-issue-detail --bid <bid> --env <env> --issue-id <issue-id> --start-time <start-time> --end-time <end-time> --origin <slardar-origin>

# Get JS error issue stack by issue id and release
bytedcli slardar web js-error-issue-stack --bid <bid> --env <env> --issue-id <issue-id> --release <release> --start-time <start-time> --end-time <end-time> --origin <slardar-origin> [--raw-only|--sourcemap-only]

# Analyze a Slardar alarm URL and return structured JSON for agent composition
bytedcli --json slardar web analyze-alarm-url "<slardar-alarm-url>"
```

## Perfsee Lab

Use `slardar perfsee` when the user needs Perfsee Lab data from CLI. Prefer `--url` for existing pages and reports so the CLI can parse `origin`, `projectId`, `snapshotId`, and `reportId`. CLI options such as `--project-id`, `--snapshot-id`, and `--report-id` override URL-derived values.

Authentication priority is explicit auth first, then cached sessions:

- `--authorization` for a raw Authorization header.
- `--token` or `PERFSEE_TOKEN` for a Perfsee access token.
- `--cookie` or `PERFSEE_COOKIE` for a raw Cookie header.
- Cached Perfsee cookies created by `slardar perfsee auth login`.
- ByteDance SSO browser session from `bytedcli --site cn auth login --session`.

```bash
# Parse a Perfsee URL without making a network request
bytedcli slardar perfsee url parse --url "https://slardar.example/perfsee/projects/demo-project/lab/reports/85/overview"

# Prepare local SSO-backed Perfsee cookies
bytedcli --site cn auth login --session
bytedcli slardar perfsee auth login --origin "https://slardar.example"
bytedcli slardar perfsee auth status --origin "https://slardar.example"

# CI and scripted runs can use a token instead
# export PERFSEE_TOKEN=<perfsee-token>

# Inspect project pages, profiles, and environments
bytedcli --json slardar perfsee project config \
  --url "https://slardar.example/perfsee/projects/demo-project/lab"

# List and inspect snapshots
bytedcli slardar perfsee snapshot list \
  --url "https://slardar.example/perfsee/projects/demo-project/lab"

bytedcli slardar perfsee snapshot get \
  --url "https://slardar.example/perfsee/projects/demo-project/lab?snapshotId=31"

# List reports from a snapshot and inspect one report
bytedcli slardar perfsee report list \
  --url "https://slardar.example/perfsee/projects/demo-project/lab?snapshotId=31"

bytedcli slardar perfsee report get \
  --url "https://slardar.example/perfsee/projects/demo-project/lab/reports/85/overview"

# Download selected report artifacts
bytedcli slardar perfsee report download \
  --url "https://slardar.example/perfsee/projects/demo-project/lab/reports/85/overview" \
  --kind lhr,requests,trace \
  -o ./perfsee-report

# Trigger configured-page or temporary snapshots
bytedcli slardar perfsee snapshot run \
  --url "https://slardar.example/perfsee/projects/demo-project/lab" \
  --page <page-name-or-id> \
  --profile <profile-name-or-id> \
  --env <env-name-or-id> \
  --wait

bytedcli slardar perfsee snapshot run-temp \
  --url "https://slardar.example/perfsee/projects/demo-project/lab" \
  --target-url "https://example.com/" \
  --profile <profile-name-or-id> \
  --env <env-name-or-id> \
  --wait
```

## App

Use `slardar app trend` to query `/api_v2/app/crash/trend` and display the same platform summary metrics for Android and iOS App abnormal `crash_type` values. `--all-crash-types` uses the selected OS meta list; iOS `memory_graph` has an empty meta `crash_type` and is not included in the automatic all-type query.

```bash
bytedcli slardar app trend \
  --origin "https://slardar.example" \
  --aid 123 \
  --os Android \
  --region cn \
  --start-time 1778673780 \
  --end-time 1778760180 \
  --crash-type app \
  --app-version 10.7.0 \
  --channel gp

bytedcli slardar app trend \
  --aid 123 \
  --os Android \
  --region cn \
  --start-time 1778673780 \
  --end-time 1778760180 \
  --all-crash-types
```

Text summaries use the response total fields, not the trend point arrays:

- `异常数`: `count_total_`
- `异常率`: `count_start_total_ * 1000‰`
- `影响用户数`: `active_total_`
- `平均影响用户比例`: `user_active_total_ * 1000‰`
- `整体影响用户比例`: `user_active_total_all_ * 1000‰`

### Web Data Explore event drilldown

Use this workflow when the user has a Slardar Web Data Explore page or browser request and wants the same data from CLI.

1. Capture the page request body and copy `common.bid`, `common.env`, `common.site_type`, `time_filter`, `ev_type`, `filter_conditions`, and selected metrics.
2. Use `data ev-types` when the event type is unknown, then `data columns --ev-type <ev-type>` to resolve selectable fields.
3. Run `data list` with the captured time window and filters. Use `--metrics-json` for selected columns and `--filter-conditions-json` for the browser filter tree.
4. Extract `dhKey` from the returned rows and call `data get --ev-type <ev-type> --dh-key <dh-key>` for full row details.
5. If the row has a `session_id`, call `data session-list --session-id <session-id>` with the same time window to reconstruct the session timeline.
6. If the row exposes `event_id` or `action_id`, call `data event-detail` or `data action-detail`; when the UI request already carries a time window, pass the same `start_time/end_time` pair to avoid cross-window ambiguity.

Text mode prints compact summaries. Use `--json` for structured output, and add `--with-raw` only when the caller needs the top-level Slardar payload.

### Web dashboard workflow

Use this workflow when the user gives a Slardar dashboard page and wants to inspect or edit the dashboard from CLI.

1. Start with `dashboard get --url "<url>" --with-raw` to confirm the parsed dashboard context and capture the current payload.
2. For lightweight changes on an existing dashboard, prefer `dashboard update-name`, `dashboard like`, `dashboard unlike`, or `dashboard item add` with the same `--url`.
3. For full dashboard rewrites, export the raw `items` array and optional `extra` from `dashboard get --with-raw`, then pass them back with `dashboard update --items-file ... --extra-file ...`.
4. For create flows, use `dashboard create --origin <slardar-origin> --bid <bid> --env <env> --site-type <site-type>` and keep `--region` / `--lang` aligned with the target dashboard page.
5. For migration flows, use `dashboard migrate` when you already have `aid + dashboard_detail`, and use `dashboard migrate-hybrid-v3 --url "<url>"` when migrating an eligible existing dashboard.

### Web event design apply

Use this workflow when the user has a Slardar event design file and wants the CLI to create missing events and merge their properties.

1. Prepare a design JSON object with an `events` array. Each event should include `event_name`, optional `description`, `owners`, and optional `keys`. Each key should include `key_name`, `key_type` (`category`, `metric`, or `extra`), and optional `description`.
2. Run `slardar web event apply` with `--design-file` or `--design-json`. The command first lists existing events, then creates missing ones, then merges keys by `key_name + key_type` before sending a single update request per event.
3. Use `--dry-run` to preview the planned create / update actions without writing. Add `--update-existing-event` when you also want existing event descriptions and owners rewritten from the design file.

```bash
bytedcli slardar web event apply \
  --bid demo_bid \
  --site-type hybrid \
  --region cn \
  --lang zh \
  --design-file ./sample-event-design.json

bytedcli slardar web event apply \
  --bid demo_bid \
  --site-type hybrid \
  --region cn \
  --lang zh \
  --design-json '{"events":[{"event_name":"sample_event","description":"sample description","owners":["demo-owner"],"keys":[{"key_name":"sample_metric","key_type":"metric","description":"sample metric"}]}]}' \
  --dry-run

bytedcli slardar web event apply \
  --bid demo_bid \
  --site-type hybrid \
  --region cn \
  --lang zh \
  --design-file ./sample-event-design.json \
  --update-existing-event
```

### Web event key deletion

Use this workflow when the user needs to remove a specific event key before re-applying the desired design.

1. Pick the target event by `event_name`.
2. Delete a single key by `key_name`, or narrow it further with `key_type` when the same key name exists in multiple types.
3. Use `--dry-run` to preview the remaining key list before writing.

```bash
bytedcli slardar web event key delete \
  --bid demo_bid \
  --site-type hybrid \
  --region cn \
  --lang zh \
  --event-name sample_event \
  --key-name status_code \
  --key-type metric
```

### Web Flex custom-event line chart

Use this workflow when the user asks for a Web Flex line chart over custom events, for example two custom TTI metrics such as `<event-name>/<map-key>/95分位`, a fixed `bid/env`, a recent time range, and day-level granularity.

1. Discover candidate custom events with a broad contiguous label filter. If the exact metric text contains separated tokens, search by a stable event prefix instead of the full display label.

```bash
bytedcli --json slardar web flex event-list \
  --bid <bid> \
  --env <env> \
  --filter-label <event-prefix> \
  --without-row-raw
```

2. Resolve each event's measure name. For a `95分位` custom metric under map key `<map-key>`, filter by `<map-key>/95分位` and capture the returned `measureName`.

```bash
bytedcli --json slardar web flex event-measure \
  --bid <bid> \
  --env <env> \
  --event-name sample_custom_event_tti \
  --filter-label '<map-key>/95分位' \
  --without-row-raw
```

For percentile custom-event metrics, the returned `measureName` is typically a JSON string shaped like:

```jsonc
{
  "metric": "custom.metrics.pct95",
  "event_dimension": "event_name",
  "event_name": "sample_custom_event_tti",
  "map_key": "<map-key>",
}
```

Prefer the API-returned `measureName` over hand-written values whenever possible.

3. Build a Flex series request. Use Unix seconds for `start_time` and `end_time`. For "past seven days, day-level granularity", use the local timezone's start of day seven days ago as `start_time`, today's start of day as exclusive `end_time`, and `granularity: "86400"`.

```jsonc
{
  "need_time_rollup": false,
  "start_time": <start-time-sec>,
  "end_time": <end-time-sec>,
  "granularity": "86400",
  "cond_settings": {
    "exclude_null": "false"
  },
  "group_by_list": [],
  "time_shift_list": [],
  "filter_list": [],
  "measure_list": [
    {
      "type": "monomial",
      "raw_measure_list": [
        {
          "measure_name": "{\"metric\":\"custom.metrics.pct95\",\"event_dimension\":\"event_name\",\"event_name\":\"sample_custom_event_a_tti\",\"map_key\":\"<map-key>\"}",
          "filter_list": [],
          "event_name": "sample_custom_event_a_tti"
        }
      ],
      "formula": "",
      "name": "sample_custom_event_a_tti/<map-key>/95分位",
      "unit": {
        "unit_type": "",
        "unit": ""
      }
    },
    {
      "type": "monomial",
      "raw_measure_list": [
        {
          "measure_name": "{\"metric\":\"custom.metrics.pct95\",\"event_dimension\":\"event_name\",\"event_name\":\"sample_custom_event_b_tti\",\"map_key\":\"<map-key>\"}",
          "filter_list": [],
          "event_name": "sample_custom_event_b_tti"
        }
      ],
      "formula": "",
      "name": "sample_custom_event_b_tti/<map-key>/95分位",
      "unit": {
        "unit_type": "",
        "unit": ""
      }
    }
  ]
}
```

4. Run the line-chart query. Prefer `--request-file` for long payloads; use `--request-json` when the caller needs a single command.

```bash
bytedcli --json slardar web flex query series \
  --bid <bid> \
  --env <env> \
  --request-file ./sample-flex-series-request.json
```

```bash
bytedcli --json slardar web flex query series \
  --bid <bid> \
  --env <env> \
  --request-json '{"need_time_rollup":false,"start_time":<start-time-sec>,"end_time":<end-time-sec>,"granularity":"86400","cond_settings":{"exclude_null":"false"},"group_by_list":[],"time_shift_list":[],"filter_list":[],"measure_list":[{"type":"monomial","raw_measure_list":[{"measure_name":"{\"metric\":\"custom.metrics.pct95\",\"event_dimension\":\"event_name\",\"event_name\":\"sample_custom_event_a_tti\",\"map_key\":\"<map-key>\"}","filter_list":[],"event_name":"sample_custom_event_a_tti"}],"formula":"","name":"sample_custom_event_a_tti/<map-key>/95分位","unit":{"unit_type":"","unit":""}},{"type":"monomial","raw_measure_list":[{"measure_name":"{\"metric\":\"custom.metrics.pct95\",\"event_dimension\":\"event_name\",\"event_name\":\"sample_custom_event_b_tti\",\"map_key\":\"<map-key>\"}","filter_list":[],"event_name":"sample_custom_event_b_tti"}],"formula":"","name":"sample_custom_event_b_tti/<map-key>/95分位","unit":{"unit_type":"","unit":""}}]}'
```

5. Validate the response before summarizing it to the user: `status` should be `success`, `isAsyncPending` should be false, `xAxisLength` should match the expected bucket count, and `seriesCount` should match the requested metric count. Use `data.series[].data` for the full point arrays and `seriesRows[]` for compact labels, point counts, averages, and sums.

## App issue logs and symbolication

Use `issue log` to fetch the event detail/log from a Slardar App issue URL:

```bash
bytedcli --json slardar app issue log \
  --url "https://slardar.example/node/app_detail/?region=cn&aid=123&os=Android&type=app&lang=zh#/abnormal/detail/crash/demo_issue?params=%7B%22start_time%22%3A1773410940%2C%22end_time%22%3A1776089340%2C%22event_index%22%3A1%7D"
```

The URL parser reads:

- outer query: `region`, `aid`, `os`, `lang`
- hash route: `/abnormal/detail/<crash_type>/<issue_id>`
- `params` JSON: `start_time`, `end_time`, `event_index`, `token`, `token_type`, `crash_time_type`, `granularity`, `filters_conditions`

When the URL contains `params.event_index`, bytedcli uses it to select the matching event before fetching the log.

Use `issue log --symbolicate` when the user wants the original native stack from an App issue URL:

```bash
bytedcli --json slardar app issue log --symbolicate \
  --url "https://slardar.example/node/app_detail/?region=cn&aid=123&os=Android&type=app&lang=zh#/abnormal/detail/crash/demo_issue?params=%7B%22start_time%22%3A1773410940%2C%22end_time%22%3A1776089340%2C%22event_index%22%3A1%7D"
```

Useful options:

- `--include-lib librvm.so`: only symbolize frames from one library.
- `--max-frames 6`: cap the number of frames.
- `--output-dir ./symbols`: override the local fallback symbol cache directory.
- `--force-download`: refresh cached `.zst` and `.so` files during local fallback.
- `--addr2line-path <path>` and `--zstd-path <path>`: provide explicit local fallback tool paths.

The command calls Slardar App retrace first. If retrace is unavailable or returns no symbolicated native frames, it falls back to downloading native symbols locally. The local fallback uses `crash_lib_uuid` from the event log when available; if that mapping is missing, it falls back to converting the native stack `BuildId` into a Slardar symbol uuid.

Generate a native symbol URL:

```bash
bytedcli slardar app symbol url --build-id 00112233445566778899aabbccddeeff00112233
bytedcli slardar app symbol url --uuid 33221100554477660
```

The native symbol URL uses these defaults unless the caller overrides them:

```text
origin=<built-in Slardar App origin>
type=Native
os=Android
aid=13
update_version_code=3
region=cn
```

## App log file search and download

Use `file list` to search log files by device ID:

```bash
bytedcli --json slardar app file list \
  --aid 123 --os Android --region cn \
  --device-id demo_device \
  --start-time 1776092520 --end-time 1776351720
```

The URL parser reads (`--url` is also supported):

- outer query: `aid`, `os`, `region`, `lang`
- hash JSON after `#/track/logSearch/logs?`: `device_id` (or `uid`), `start_time`, `end_time`

Filter options: `--scene`, `--log-type`, `--merge <0|1>`, `--page-no`, `--page-size`.

Use `file range` to query available filter dimension values:

```bash
bytedcli --json slardar app file range \
  --aid 123 --os Android --region cn \
  --device-id demo_device \
  --start-time 1776092520 --end-time 1776351720 \
  --dimension scene
```

Use `file download` to download a single file (the first match):

```bash
bytedcli slardar app file download \
  --aid 123 --os Android --region cn \
  --device-id demo_device \
  --start-time 1776092520 --end-time 1776351720 \
  --output ./demo.alog.hot
```

Use `file download --all` to download all files to a directory:

```bash
bytedcli slardar app file download --all \
  --aid 123 --os Android --region cn \
  --device-id demo_device \
  --start-time 1776092520 --end-time 1776351720 \
  --output ./logs
```

With `--all`, each file is downloaded individually to the `--output` directory (defaults to `./slardar_logs`). Duplicate file names are automatically deduplicated with a numeric suffix.

## App encrypted ALog decrypt

Use `log decrypt` to upload a local encrypted ALog zip and save the decrypted txt file:

```bash
bytedcli slardar app log decrypt \
  --aid 123 --os Android \
  --input ./sample-alog.zip \
  --output ./sample-alog.txt
```

`--region` defaults to `cn`; pass `--region <region>` when the decrypted artifact must be downloaded from another Slardar App region. The command sends the zip content as base64 to `/api_v2/app/alog/decrypt`, always requests a returned download token internally, and then downloads the decrypted txt through the Slardar App file download API.

## OS issue event summary and symbolication

Use `issue log` to fetch the selected Slardar OS issue event from a URL:

```bash
bytedcli --json slardar os issue log \
  --url "https://slardar.example/node/os_detail/issue/overview/system/detail?app_id=123&start_time=1775491200&end_time=1776133985&region=cn&category=3&time_type=client_time&filter_conditions=%257B%2522type%2522%253A%2522and%2522%252C%2522sub_conditions%2522%253A%255B%255D%257D&issue_id=demo_issue&pgno=1"
```

The URL parser reads:

- path: `/node/os_detail/issue/overview/system/detail`
- query: `app_id`, `region`, `issue_id`, `category`, `time_type`, `start_time`, `end_time`, `pgno` or `page_num`
- query: `filter_conditions`, including double-encoded JSON from the Slardar OS UI

The command calls:

```text
POST <origin>/api_v2/os/event/list?lang=<lang>
```

`page_size` defaults to `1`. Text output prints event metadata and the extracted main thread stack. JSON output returns the selected event, the original request body, and `mainThreadStack`.

Use `issue log --symbolicate` when the user wants readable native symbols from a Slardar OS issue:

```bash
bytedcli --json slardar os issue log --symbolicate \
  --url "https://slardar.example/node/os_detail/issue/overview/system/detail?app_id=123&start_time=1775491200&end_time=1776133985&region=cn&category=3&time_type=client_time&filter_conditions=%257B%2522type%2522%253A%2522and%2522%252C%2522sub_conditions%2522%253A%255B%255D%257D&issue_id=demo_issue&pgno=1" \
  --max-frames 20
```

Useful options:

- `--include-lib <name>`: only symbolize frames matching a library path/name, BuildID, or `offset:<apk-offset>`.
- `--max-frames <n>`: cap the number of native frames.
- `--output-dir ./symbols`: override the local symbol cache directory.
- `--force-download`: refresh cached `.zst` and decompressed symbol files.
- `--addr2line-path <path>` and `--zstd-path <path>`: provide explicit local tool paths.
- `--update-version-code <code>`: override the Slardar native symbol download `update_version_code`.

For APK embedded native frames, bytedcli groups symbolication by `BuildId + APK offset`. The native symbol implementation is shared with Slardar App: BuildID is converted to the Slardar symbol uuid, the `.zst` symbol file is downloaded through the native mapping endpoint, then `llvm-addr2line` resolves the requested PCs.

If one symbol group fails to download or symbolize, bytedcli records those frames under `unresolvedFrames` and continues with the other groups.

## Org BID list

List all BIDs (sites/projects) under an organization:

```bash
# Basic usage: list all BIDs under an org (without metric values)
bytedcli --json slardar web bid-list --origin <slardar-origin> --oid "<oid>"

# Text output
bytedcli slardar web bid-list --origin <slardar-origin> --oid "<oid>"

# Specify custom time range (Unix timestamps in seconds)
bytedcli slardar web bid-list --origin <slardar-origin> --oid "<oid>" --start-time 1781157676 --end-time 1781244076

# Specify metrics via JSON string to include metric values in response
bytedcli slardar web bid-list --origin <slardar-origin> --oid "<oid>" --metric-list-json '[{"description":"PV","groupKey":"base","groupName":"用户分析","name":"hybrid_pv.count_recover","isDefault":true,"type":"number","unit":""}]'

# Specify metrics via JSON file
bytedcli slardar web bid-list --origin <slardar-origin> --oid "<oid>" --metric-list-file ./sample-metric-list.json

# Pass granularity in seconds (default: 10800 = 3h)
bytedcli slardar web bid-list --origin <slardar-origin> --oid "<oid>" --granularity 3600
```

`--origin` and `--oid` are required. Useful options:

- `--site-type <type>`: site type, default `hybrid`.
- `--org-type <n>`: organization type, default `0`.
- `--start-time` / `--end-time`: Unix seconds; default the last 24h.
- `--granularity <seconds>`: data granularity, default `10800` (3h).
- `--metric-list-json <json>` / `--metric-list-file <path>`: metric list array; omit both to return BIDs without metric values (`metricMap` stays empty). When both are passed, `--metric-list-file` takes precedence.

### Metric list format

The `--metric-list-json` / `--metric-list-file` accepts an array of metric objects. Each item needs `name` (metric key), `description` (display label), `type` (e.g. `"number"`) and `unit` (e.g. `""` or `"%"`); `groupKey`, `groupName` and `isDefault` are optional. Example:

```json
[
  {
    "description": "PV",
    "groupKey": "base",
    "groupName": "用户分析",
    "name": "hybrid_pv.count_recover",
    "isDefault": true,
    "type": "number",
    "unit": ""
  }
]
```

**Note**: Available metrics vary by organization and site type. Check the Slardar web console for your organization's supported metrics.

### Response fields

Each row carries `bid`, `name` (display name), `id` (internal site id), `siteType`, `owners` (usernames), `containerNames` (platform container names, e.g. Spark), `env` (e.g. `["production", "test"]`), `createdAt` / `updatedAt` (Unix seconds) and `metricMap` (values for the requested metrics). The top-level result reports `total` (number of BIDs returned), `page` / `pageSize`, and `hasMore`. This endpoint returns all BIDs in a single response and does not paginate, so `page` is always `1` and `hasMore` is always `false`.

## Alarm rule management

Create or update Slardar alarm rules. These commands default to dry-run mode and require `--confirm` to execute.

**Important**: The alarm param JSON structure is complex and `alarm-rule-update` is full-payload (the submitted `alarm_param` replaces the whole rule). The recommended workflow is:

1. Use `alarm-rule-list` to get the existing full alarm configuration
2. Extract the complete `alarm_param` object from the output
3. Modify the fields as needed (e.g., `name`, `alarm_level`, `strategy_list`; set `is_close: true` to disable the rule)
4. Pass the modified full JSON via `--alarm-param-json` or `--alarm-param-file`

```bash
# List existing alarms to use as a template
bytedcli --json slardar web alarm-rule-list --origin <slardar-origin> --bid <bid> --site-type hybrid

# Create a new alarm rule (dry-run by default)
bytedcli slardar web alarm-rule-create --origin <slardar-origin> --bid <bid> --site-type hybrid --alarm-param-file ./new-alarm.json

# Create and confirm execution
bytedcli slardar web alarm-rule-create --origin <slardar-origin> --bid <bid> --site-type hybrid --alarm-param-file ./new-alarm.json --confirm

# Update an existing alarm rule (full-payload; requires id field in alarm param)
bytedcli slardar web alarm-rule-update --origin <slardar-origin> --bid <bid> --site-type hybrid --alarm-param-file ./updated-alarm.json

# Disable a rule: edit its full alarm_param from alarm-rule-list, set "is_close": true, then update
bytedcli slardar web alarm-rule-update --origin <slardar-origin> --bid <bid> --site-type hybrid --alarm-param-file ./disabled-alarm.json --confirm
```

`--origin` and `--bid` are required. Useful options:

- `--site-type <type>`: site type, default `web`.
- `--alarm-param-json <json>` / `--alarm-param-file <path>`: alarm param as a single object or an array.
- `--confirm`: execute the write; without it the command stays in dry-run.

### Alarm param JSON structure

The `--alarm-param-json` / `--alarm-param-file` accepts either a single alarm param object or an array of objects for batch operations. Key fields include:

```json
{
  "id": 123456,
  "name": "Sample alarm rule name",
  "is_close": false,
  "methods": ["lark"],
  "receivers": ["username"],
  "chats": ["chat_id"],
  "alarm_level": "P2",
  "interval_seconds": 1800,
  "category": "container_error",
  "strategy_list": [
    {
      "measure": {
        "type": "monomial",
        "raw_measure_list": [
          {
            "measure_name": "hybrid_jserr.ratio_recover",
            "filter_list": []
          }
        ]
      },
      "alarm_threshold": 0.01,
      "threshold_cmp_op": "gt",
      "alarm_window_size": 3600
    }
  ],
  "bid": "target_bid",
  "env": "",
  "region": "maliva"
}
```

For `alarm-rule-create`: omit `id` field.

For `alarm-rule-update`: include `id` field with the existing alarm ID and the full `alarm_param` (update is full-payload). To disable a rule, set `is_close: true` on that full param.

### Batch operations

To add/update multiple alarms in one request, pass an array:

```bash
# Batch create via JSON file
bytedcli slardar web alarm-rule-create --origin <slardar-origin> --bid <bid> --alarm-param-file ./batch-alarms.json --confirm
```

Where `batch-alarms.json` contains:

```json
[
  { "name": "Alarm 1", ... },
  { "name": "Alarm 2", ... }
]
```

## Alarm region sync

Slardar mirrors an alarm across control planes (ROW / EU / TTP). Each region holds its own alarm with a distinct `entity_id`; the synced relationship is tracked as a `region_map`. These are two independent base APIs and do not orchestrate other commands.

- `entity-region-get` (read-only): list the regions an alarm entity is currently synced to. Pass any one existing synced region as `--entity-id` / `--entity-region`.
- `entity-region-update` (write, dry-run by default, requires `--confirm`): set the full synced `region_map`. The submitted `region_map` is a full-payload overwrite, so to add a region you must first create the alarm in that region with `alarm-rule-create` (to obtain its `entity_id`), then submit the complete region list.

`--entity-region` / `entity_region` values are e.g. `sg` (ROW), `us_ttp`, `eu_ttp`.

Auth note: these endpoints are served by the global console and only accept the control-panel JWT (`x-slardar-global-control-panel-jwt`); they do not accept the ByteCloud `x-jwt-token` fallback that alarm endpoints use. Point `--origin` at the global console origin (not a regional compliance domain) so bytedcli mints the panel JWT automatically.

```bash
# List which regions an alarm is synced to
bytedcli --json slardar web entity-region-get --origin <slardar-origin> --bid <bid> --entity-id 100002 --entity-region us_ttp

# Preview the new sync map (dry-run)
bytedcli slardar web entity-region-update --origin <slardar-origin> --bid <bid> --region-map-file ./region-map.json

# Apply the new sync map
bytedcli slardar web entity-region-update --origin <slardar-origin> --bid <bid> --region-map-file ./region-map.json --confirm
```

Where `region-map.json` contains the full list of synced regions (each entry needs `entity_id` and `entity_region`; `bid` defaults to `--bid` when omitted):

```json
[
  { "entity_id": "100001", "entity_region": "sg" },
  { "entity_id": "100002", "entity_region": "us_ttp" },
  { "entity_id": "100003", "entity_region": "eu_ttp" }
]
```
