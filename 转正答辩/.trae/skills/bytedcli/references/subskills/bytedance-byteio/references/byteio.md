# ByteIO

## Capability

ByteIO commands wrap the documented ByteIO OpenAPI surface for event tracking metadata, requirements, BTM points, test cases, location attributes, and ad metadata.

Flow commands additionally support requirement/event write workflows with JSON payload input. BTM point creation uses the ByteIO web API on `https://data.bytedance.net`.

## Authentication

The OpenAPI gateway expects an `authorization` header for query/read commands. bytedcli reads it from:

1. `BYTEDCLI_BYTEIO_AUTHORIZATION`

Flow write commands use the same `authorization` header:

```bash
export BYTEDCLI_BYTEIO_AUTHORIZATION=<byteio-openapi-authorization>
```

Never hardcode real authorization values in repository files, test fixtures, skill docs, or user-facing summaries.

## Regions

| Region | OpenAPI base |
|--------|--------------|
| `cn` | `https://openapi-dp.byted.org/openapi/byteio-cn` |
| `sg` (default, office network) | `https://openapi-alisg.tiktok-row.org/openapi/byteio-sg` |
| `sg` (`BYTEDCLI_NETWORK_PROFILE=prod`) | `https://openapi-alisg.byted.org/openapi/byteio-sg` |

Use `--region cn|sg`; default is `cn`.

SG 有两个 host，按网络环境切换：
- 默认（办公网 / 本地 CLI）：`openapi-alisg.tiktok-row.org`，仅办公网可达，生产网不可用。
- `BYTEDCLI_NETWORK_PROFILE=prod`：`openapi-alisg.byted.org`，开发机 / BOE / PPE / 线上服务端可达，办公网不可达。

## Commands and APIs

| User task | Command | Method / path |
|-----------|---------|---------------|
| 查询单个埋点元数据详情 | `byteio event get --app-id <id> --event-name <name>` | `GET /byteio/open/v1/schema/detail` |
| 校验埋点参数 | `byteio event check-params --app-id-list <ids> --event-name-list <names> --param-name-list <names>` | `POST /byteio/open/v1/schema/param/check` |
| 查询需求列表 | `byteio requirement list --app-id <id>` | `POST /byteio/open/v1/requirements/list` |
| 查询需求详情 | `byteio requirement get --requirement-id <id>` | `GET /byteio/open/v1/requirements/{id}/` |
| 创建 BTM 点位 | `byteio btm point create --app-id <id> --parent-id <id> --type <kind> --site-id <id> --owner <owner> --label <label>` | `POST /byteio/api/v1/btm_codes` |
| 查询 BTM 点位详情 | `byteio btm point get --operator <user> --requirement-id <id>` | `POST /open/v1/btm_requirement/get_point_details` |
| 查询测试用例信息列表 | `byteio test-case list --app-id <id>` | `POST /open/v1/test_case_suite/test_case/info/list` |
| 查询测试用例详情 | `byteio test-case get --test-case-id <id>` | `GET /open/v1/test_case_suite/test_case/{test_case_id}` |
| 根据业务线查询点位 | `byteio map locations --app-id <id> --business-module-ids <ids>` | `POST /open/v1/event_map/location_attribute/tree` |
| 根据点位查询点位上的埋点 | `byteio map events --app-id <id> --full-identifier-list <ids>` | `POST /byteio/open/v1/event_map/location_attribute/group/event/list` |
| 查询需求中的点位列表 | `byteio requirement locations --app-id <id> --requirement-id <id>` | `POST /byteio/open/v1/event_map/location_attribute/list_in_requirement` |
| 查询广告 tag 列表 | `byteio ad tags` | `GET /open/v1/ad/data_manage/tag/list` |
| 查询广告 label 列表 | `byteio ad labels` | `GET /open/v1/ad/data_manage/label/list` |
| 根据用户邮箱前缀查询埋点信息 | `byteio event list --owner <owner>` | `POST /byteio/open/v1/schema/name/list` |

## Important parameters

- `event get`: `--app-id`, `--event-name`, optional `--include-scene`
- `event check-params`: either the three list flags or `--checks-json`; use `--param-name-list '*'` to check all params
- `requirement list`: `--app-id`; optional `--keyword`, `--owner`, `--requirement-status`, `--requirement-status-list`, `--requirement-id-list`, `--type`, `--external-rid`, `--page`, `--page-size`, `--filter-empty-location-attribute`
- `btm point create`: `--app-id`, `--parent-id`, `--type` (`page|block|module`), `--site-id`, `--owner`, `--label`; optional `--image-url`, `--index-code`, `--parent-ids`, `--business-modules-json`, `--locale`, `--body-json`
- `btm point get`: `--operator`, `--requirement-id`; optional `--btm-full-code-list`
- `test-case list`: `--app-id`; optional `--test-case-ids`, `--test-case-suite-ids`, `--name`, `--event-name`, `--page`, `--page-size`
- `map locations`: `--app-id`; optional `--business-module-ids` as comma-separated values or JSON array
- `map events`: `--app-id`, `--full-identifier-list`; optional `--event-trigger-type-list`, `--page`, `--page-size`

POST commands that have typed options also support `--body-json <json>` to merge additional documented fields into the request body.

## BTM create authentication

`btm point create` does not use the OpenAPI `Authorization` header. It uses a logged-in ByteIO web session for `data.bytedance.net`.

- Preferred: open `https://data.bytedance.net/byteio/event/btm` once in Chrome/Chromium, then run the command.
- Override: set `BYTEDCLI_BYTEIO_WEB_COOKIE` to a valid `data.bytedance.net` cookie header.

## BTM create examples

```bash
# 字段版：常用字段直接走 flags
bytedcli byteio btm point create \
  --app-id 7418 \
  --parent-id 196916 \
  --type block \
  --site-id 189925 \
  --owner demo.user \
  --label 测试区块 \
  --image-url 'https://data.bytedance.net/byteio/api/v1/file/images/demo.png'

# 贴近浏览器请求：补 business_modules / parent_ids / codes 细项
bytedcli byteio btm point create \
  --app-id 7418 \
  --parent-id 196916 \
  --type block \
  --site-id 189925 \
  --owner demo.user \
  --label 测试区块 \
  --body-json '{"business_modules":[null],"parent_ids":[196916],"codes":[{"label":"测试区块","image_url":"https://data.bytedance.net/byteio/api/v1/file/images/demo.png","index_code":false}]}'
```

## Response interpretation

For existence checks:

- `exists: true`: the HTTP request succeeds and the response has non-empty event schema/detail data.
- `exists: false`: the HTTP request succeeds and the response clearly indicates empty data or not found.
- `exists: "unknown"`: authorization, permission, network, timeout, invalid JSON, or unclear business errors.

Always include concise evidence: business code/message when present and whether a non-empty detail payload was returned.

## Flow write workflow

```bash
# 本地 JSON 全链路
BYTEDCLI_BYTEIO_AUTHORIZATION=<token> \
bytedcli byteio flow run \
  --app-id 1128 \
  --requirement-payload-json '{"name":"byteio-demo","sync_app_ids":[1128],"os":["android"],"owners":["demo.user"],"involved_employee":["review.user"]}' \
  --events-json '[{"event_name":"demo_event","trigger_type":"tech","description":"描述","category":"business"}]'

# dry-run 校验，不发请求
BYTEDCLI_BYTEIO_AUTHORIZATION=<token> \
bytedcli byteio flow run \
  --app-id 1128 \
  --requirement-payload-json '{"name":"byteio-demo","sync_app_ids":[1128],"os":["android"],"owners":["demo.user"],"involved_employee":["review.user"]}' \
  --events-json '{"creator":"demo.user","events":[{"event_name":"demo_event","trigger_type":"tech","description":"描述","category":"business"}]}' \
  --dry-run

# JSON 输出
BYTEDCLI_BYTEIO_AUTHORIZATION=<token> \
bytedcli --json byteio flow run \
  --app-id 1128 \
  --requirement-payload-json '{"name":"byteio-demo","sync_app_ids":[1128],"os":["android"],"owners":["demo.user"],"involved_employee":["review.user"]}' \
  --events-json '{"creator":"demo.user","events":[{"event_name":"demo_event","trigger_type":"tech","description":"描述","category":"business"}]}'
```

Behavior notes:

- `flow run` 使用 JSON 输入创建需求并批量录入事件。
- 创建链路为：先调 `POST /byteio/open/v1/requirements`，再调当前 region 对应的 `/service/available` 获取 `requirement:import_event_v2` 的 `url`，拼接成完整 URL 后以原请求体调用 `event_records?requirement_id=...` 批量创建需求内埋点。
- requirement v1 请求体按 `name`、`description`、`sync_app_ids`、`os`、`owners`、`involved_employee` 组织；响应需求 ID 在 `data.id`。
- `--events-json` 的最小事件字段为 `event_name`、`trigger_type`、`description`、`category`；`trigger_type` 取值范围为 `click/show/stay/slide/play/page_view/result/tech`。可选字段包括 `cost_business_line_name`、`image_urls`、`tags`、`business_module_id`、`scenes`、`remark`、`params`。兼容输入别名 `name -> event_name`。
- `params` 中 `param_data_type` 仅支持 `string` / `integer` / `float` / `boolean`；`param_type` 仅支持 `ordinary` / `enum` / `range`；`is_required` 支持 `0/1`（字符串或数字）及布尔值输入。
- `--events-json` 支持数组、单对象，以及包装对象中的 `events` / `event_records`；`schemas` 可作为兼容别名读取。
- `sync_app_ids` 自动补齐当前 `--app-id`。
- `creator`、`product_owners`、`develop_owners`、`test_owners` 不属于当前 requirement v1 请求模型；若输入这些旧字段，CLI 会在新链路中剔除。
- 批量创建接口失败时，会为本批次中的每个事件生成 retry list。
- 成功输出会汇总 `requirementId`、`createdCount`、`failedCount`、`failures`、`batchEventResponse`；`failures[]` 内含 `index`、`event_name`、`code`、`message`。
