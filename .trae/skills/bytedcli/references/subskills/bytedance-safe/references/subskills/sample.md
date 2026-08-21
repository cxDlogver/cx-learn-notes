# Safe Sample — Sample Library

Query sample library records and run route-recall lookups on the Safe sample platform.

## Prerequisite for route recall: safecli plugin

`safe sample recall` is provided by the safecli plugin. Install it once:

```bash
bytedcli self plugin install --repo ies_safety/safecli
```

If `bytedcli safe sample recall` reports an unknown command, run the install above, then verify with `bytedcli self plugin doctor --name safecli`.

## Command

```bash
bytedcli safe sample list (--condition-json <json> | --condition-file <path>) [--need-feature <key> ...] [--page <page>] [--page-size <size>] [--tenant <tenant>] [--business-id <id>] [--business-key <key>]

bytedcli safe sample recall --biz-type <community-video|live-audio|live-frame|live-general> --object-id <id> [<id> ...] [--top-k <n>] [--room-dedup-n <n>] [--source <seed|global|all>] [--sample-detail-type <value> ...] [--policy-title <value> ...] [--date <YYYYMMDD> ...] [--start <unixSeconds>] [--end <unixSeconds>] [--need-attrs] [--need-embedding]
```

## Recommended workflow

1. Prepare sample authentication: `bytedcli auth login --session`, then `bytedcli safe login`
2. If you need route recall, install the safecli plugin once: `bytedcli self plugin install --repo ies_safety/safecli`
3. For sample-list queries, translate natural language into four parts before executing: `tenant`, `category_id`, label filter, and time range
4. For sample-list queries, prefer `--condition-file` over long inline `--condition-json`
5. For sample-list queries, provide `--tenant`, `--business-id`, and `--business-key`
6. For route-recall queries, provide `--biz-type` plus one or more `--object-id`; do not ask for tenant or sample business headers
7. Add repeatable `--need-feature` keys for sample-list responses when you want extra fields extracted into `samples[*].features`
8. Use `--json` when another tool, agent, or script will consume the result

## Authentication

Sample queries use the Safe cookie stored by `bytedcli safe login`. On a fresh machine, run the SSO browser-session step first:

```bash
bytedcli auth login --session
bytedcli safe login
```

For agent or JSON-driven login orchestration, prefer the single-command Safe login flow: `bytedcli --json safe login --begin` returns `complete_token` plus the QR image path; once the user scans, `bytedcli --json safe login --complete <token>` finishes the login. The legacy `auth login --begin --session` + `auth login --complete <token>` + `safe login` three-step flow is still supported as a fallback.

If a user already provides a Safe cookie, `bytedcli safe login --cookie "session=xxx"` is also valid. Do not ask for manual cookies before trying the SSO-session path.

`safe sample recall` reuses the Safe cookie session from `bytedcli safe login` rather than introducing a separate auth flow.

## Route recall execution contract

`safe sample recall` calls the modelscale `route_recall` API through the existing Safe cookie session.

When assembling from natural language, use this order:

1. Resolve biz type alias
   - `community-video`
   - `live-audio`
   - `live-frame`
   - `live-general`
2. Extract one or more object IDs
   - Prefer the latest multi-value form: `--object-id id1 id2 id3`
   - If the user provides a comma-separated list, split it and preserve each non-empty ID
3. Resolve optional recall controls
   - `--top-k`
   - `--room-dedup-n`
   - `--source seed|global|all`
4. Resolve optional filters
   - `--sample-detail-type`
   - `--policy-title`
   - `--date`
   - `--start` / `--end`
5. Resolve response enrichment
   - Add `--need-attrs` when downstream steps need structured attrs
   - Add `--need-embedding` only when the user explicitly needs embeddings

Important constraints:

- Do not ask for `tenant`, `business-id`, or `business-key` when the task is route recall
- `--top-k` uses backend default `100` when omitted; it is the per-object single-route recall count, not the final merged result size
- `--room-dedup-n` is not supported for `community-video`
- `--source` is not supported for `live-audio`; that biz type always routes to the seed store
- `--sample-detail-type` and `--policy-title` are only supported for `community-video` and `live-general`
- `--date` is only supported for `community-video`
- `--start` and `--end` are only supported for `live-general`
- Prefer `--need-attrs` for troubleshooting, explanation, and follow-up filtering because text mode renders title / nickname / tag from parsed attrs
- When the backend partially rejects some inputs, surface `base_resp.failedObjectIds` (parsed from `BaseResp.Extra.error_object_ids`) so the caller can see which object IDs failed recall
- If the user already gives enough information, assemble the command and run it instead of stopping at advice

## Natural-language execution contract

This skill is expected to turn a user request such as:

- “查 webcast 近 7 天图音综合流、指定 label id 的样本”
- “查询智能标注近 7 天的直播图音综合流封建迷信数据”

into a runnable `bytedcli safe sample list` command.

When assembling from natural language, use this order:

1. Resolve tenant
   - “直播” / “webcast” -> `--tenant webcast`
2. Resolve category candidate
   - “图音综合流” should be normalized to the webcast intelligent-annotation integrated stream candidate documented in `sample-guide.md`
3. Resolve risk label filter
   - If the user gives a concrete `label id`, prefer it directly over fuzzy label-name guessing
4. Resolve time range
   - “近7天” -> `biz_time_range` covering `[now-7d, now]`
5. Build condition JSON and execute `bytedcli --json safe sample list`

If the request already includes tenant/category/label/time-range with enough precision, do not stop at advice. Assemble the command and run it.

If business headers are missing, ask only for the minimum missing execution inputs:

- `business-id`
- `business-key`
- `biz-scene-id` when required by `risk_label_ids`

Do not ask again for tenant/category/time range when those are already inferable from the natural-language request and the mapping guide.

## Examples

```bash
bytedcli safe sample list \
  --condition-file ./sample-condition.json \
  --tenant <tenant> \
  --business-id <business-id> \
  --business-key <business-key>

bytedcli --json safe sample list \
  --condition-file ./sample-condition.json \
  --need-feature dataset_id \
  --need-feature annotation_task_id \
  --need-feature room.room_id \
  --page 1 \
  --page-size 20 \
  --tenant <tenant> \
  --business-id <business-id> \
  --business-key <business-key>

bytedcli safe sample list \
  --condition-json '{"category_id":"<category-id>"}' \
  --tenant <tenant> \
  --business-id <business-id> \
  --business-key <business-key>

bytedcli --json safe sample list \
  --condition-file ./sample-condition.json \
  --tenant webcast \
  --business-id <business-id> \
  --business-key <business-key>

bytedcli safe sample recall \
  --biz-type live-general \
  --object-id sample_live_general@123_456

bytedcli safe sample recall \
  --biz-type community-video \
  --object-id sample_community_video@123_456 sample_community_video@789_012 \
  --top-k 50 \
  --source all \
  --sample-detail-type sample-detail-type-1 \
  --policy-title sample-policy-zh "sample policy en" \
  --need-attrs

bytedcli --json safe sample recall \
  --biz-type live-general \
  --object-id sample_live_general@123_456 \
  --top-k 20 \
  --start <start-unix-seconds> \
  --end <end-unix-seconds> \
  --need-embedding
```

### Natural-language assembly example

User intent:

> 查询智能标注近7天的直播的图音综合流的封建迷信的数据

Expected assembly pattern:

- tenant -> `webcast`
- category -> use the webcast intelligent-annotation integrated-stream category candidate from `sample-guide.md`
- time range -> `biz_time_range`
- label filter -> prefer concrete `label id`; if the user only gives a label name such as “封建迷信”, first resolve or request the exact `label id`

Example condition file:

```json
{
  "category_id": "46180000002",
  "risk_label_ids": {
    "<biz-scene-id>": ["<label-id>"]
  },
  "biz_time_range": {
    "from_time": 1700000000,
    "to_time": 1700604800
  }
}
```

Example execution:

```bash
bytedcli --json safe sample list \
  --condition-file ./sample-condition.json \
  --need-feature dataset_id \
  --need-feature annotation_task_id \
  --need-feature room.room_id \
  --tenant webcast \
  --business-id <business-id> \
  --business-key <business-key>
```

## Common Options

- `--tenant <tenant>` — Tenant for API requests. Priority: CLI > env (`SAFE_TENANT`) > config > default.
- `--business-id <id>` / `--business-key <key>` — Sample business headers. Priority: CLI > env (`SAFE_BUSINESS_ID`, `SAFE_BUSINESS_KEY`) > safe config (`business_id`, `business_key`).
- `--need-feature <key>` — Request and extract additional fields into `samples[*].features`.
- `--page` / `--page-size` — Pagination controls.
- `--biz-type <type>` — Route recall biz alias: `community-video`, `live-audio`, `live-frame`, `live-general`.
- `--object-id <id> [<id> ...]` — Route recall seed object IDs. Prefer the latest multi-value form after one `--object-id`.
- `--top-k` / `--room-dedup-n` / `--source` — Optional recall tuning controls. `--top-k` defaults to backend value `100`.
- `--sample-detail-type` / `--policy-title` / `--date` / `--start` / `--end` — Optional route recall filters.
- `--need-attrs` / `--need-embedding` — Expand route recall response payloads.

## References

- [sample-api.md](references/sample-api.md) — API and payload shape
- [sample-guide.md](references/sample-guide.md) — Usage patterns and troubleshooting

## Reference: sample-api

## Sample API Reference

## Base URL

`https://safe.bytedance.net/`

## Authentication

- Sample queries reuse the Safe cookie stored by `bytedcli safe login`
- On a fresh machine, first run `bytedcli auth login --session`, then run `bytedcli safe login` to exchange the local SSO browser session for the Safe cookie
- If a Safe cookie is already available, `bytedcli safe login --cookie "session=xxx"` can seed it directly
- There is no separate sample-only login flow
- Sample queries also require request context from `tenant`, `business-id`, and `business-key`
- When `--business-id` / `--business-key` are supplied, bytedcli sends the sample business headers required by the API

## Endpoint

| Method | HTTP | Path |
|--------|------|------|
| QuerySamples | POST | /api/sample/v1/samples |

## CLI-to-request mapping

| CLI input | Upstream request |
|-----------|------------------|
| `--condition-json` / `--condition-file` | `condition` |
| `--need-feature <key>` | `need_features[]` |
| `--page <n>` | `page` |
| `--page-size <n>` | `page_size` |
| `--tenant`, `--business-id`, `--business-key` | headers / request context |

## Request format

```json
{
  "condition": {
    "category_id": "<category-id>"
  },
  "need_features": ["dataset_id", "annotation_task_id"],
  "page": 1,
  "page_size": 20
}
```

## Response format

```json
{
  "code": 0,
  "msg": "success",
  "data": {
    "samples": [
      {
        "id": "<sample-id>",
        "extra_data": "{...}",
        "origin_data": "{...}"
      }
    ],
    "total": 123
  }
}
```

## Notes

- Provide exactly one of `--condition-json` or `--condition-file`
- Prefer `--condition-file` for realistic payloads and complex filters
- `expression_group` queries should include `category_id`
- `need_features` can include dotted keys such as `room.room_id` and `user.base_nickname`
- bytedcli parses `extra_data` / `origin_data` defensively and exposes requested values in `samples[*].features`

## Reference: sample-guide

## Sample Query Usage Guide

## Quick Start

1. Prepare sample authentication:
   ```bash
   bytedcli auth login --session
   bytedcli safe login
   ```
2. Set defaults if needed:
   ```bash
   bytedcli safe config set --key tenant --value <tenant>
   bytedcli safe config set --key business_id --value <business-id>
   bytedcli safe config set --key business_key --value <business-key>
   ```
3. Save a condition JSON object to a file such as `sample-condition.json`
4. Run the query in JSON mode:
   ```bash
   bytedcli --json safe sample query_samples \
     --condition-file ./sample-condition.json \
     --tenant <tenant> \
     --business-id <business-id> \
     --business-key <business-key>
   ```

## Condition Patterns

### Filter by category

```json
{
  "category_id": "<category-id>"
}
```

### Filter by category and risk label

```json
{
  "category_id": "<category-id>",
  "risk_label_ids": {
    "<biz-scene-id>": ["<risk-label-id>"]
  }
}
```

### Filter by annotation task

```json
{
  "category_id": "<category-id>",
  "expression_group": {
    "logic": "and",
    "expressions": [
      {
        "operator": "eq",
        "left": "annotation_task_id",
        "right": "<annotation-task-id>"
      }
    ]
  }
}
```

### Filter by business time and case type

```json
{
  "category_id": "<category-id>",
  "case_type": 11,
  "biz_time_range": {
    "from_time": 1700000000,
    "to_time": 1700086400
  }
}
```

### Filter by category, risk label, and recent 7-day time range

```json
{
  "category_id": "<category-id>",
  "risk_label_ids": {
    "<biz-scene-id>": ["<risk-label-id>"]
  },
  "biz_time_range": {
    "from_time": 1700000000,
    "to_time": 1700604800
  }
}
```

## Common `case_type` hints

| Value | Meaning |
|-------|---------|
| `0` | Undetermined |
| `11` | Positive sample |
| `12` | Strong positive sample |
| `21` | Negative sample |
| `22` | Hard negative sample |

## Tenant mapping hints

The following tenant mappings come from the user-provided CSV in `.chat` and can be used to turn natural-language business context into `--tenant` values.

| Tenant code | 中文含义 |
|-------------|----------|
| `webcast` | 直播 |
| `community` | 视频 |
| `playlet` | 短剧 |
| `ecology` | 视频生态 |
| `open` | 小程序 |
| `entertainment` | 泛娱乐 |
| `account` | 账号 |
| `im` | im |
| `perfesional` | perfesional |
| `common` | common |

Use this mapping when the user says things like:

- “直播样本” -> `--tenant webcast`
- “视频样本” -> `--tenant community`
- “短剧样本” -> `--tenant playlet`

## Category mapping hints

The following category mappings also come from the user-provided CSV in `.chat`. Treat them as lookup candidates, not guaranteed one-to-one rules. In particular, do not assume a single `category_id` from `tenant` alone.

| Category ID | Tenant | Material type | Source |
|-------------|--------|---------------|--------|
| `322352800002` | `webcast` | 图片流 | 智能标注 |
| `131735200002` | `webcast` | 泛娱乐 | 智能标注 |
| `225892000002` | `webcast` | 直播_通用 | 智能标注 |
| `589770609154` | `webcast` | 直播切片 | 智能标注 |
| `72752800002` | `webcast` | 直播测试题材 | 智能标注 |
| `46180000002` | `webcast` | 综合事件流 | 智能标注 |
| `802813821698` | `webcast` | 综合事件流 | 直播生态智能标注 |
| `386096800002` | `webcast` | 音频流 | 智能标注 |
| `281956000514` | `community` | 视频 | 智能标注 |
| `209764483586` | `ecology` | 视频 | 智能标注 |
| `400996000002` | `playlet` | 短剧 | 智能标注 |
| `184573652738` | `open` | 小程序 | 智能标注 |

### Additional category examples

| Category ID | Tenant | Material type | Source |
|-------------|--------|---------------|--------|
| `209764000002` | `webcast` | 图片流 | 优质样本基建 |
| `400996000514` | `webcast` | 直播_通用 | 优质样本基建 |
| `209764000514` | `webcast` | 综合事件流 | 优质样本基建 |
| `191485831170` | `community` | 视频 | 优质样本基建 |
| `260912817666` | `playlet` | 短剧 | 高质量样本 |
| `271664985346` | `entertainment` | 泛娱乐 | 高质量样本 |
| `1512752800002` | `community` | 视频 | cot机标回流表 |
| `796823200258` | `webcast` | 直播测试题材 | 样本挖掘 |

## Natural-language assembly guidance

### Rule 1: map business language to tenant first

- “直播” -> `--tenant webcast`
- “视频” -> `--tenant community`
- “短剧” -> `--tenant playlet`

This step is usually stable.

### Rule 1.5: resolve explicit execution slots from natural language

For complex sample queries, normalize the request into these execution slots:

- `tenant`
- `category_id`
- `risk_label_ids`
- `biz_time_range`

Example:

- “webcast / 直播” -> `--tenant webcast`
- “指定 label id=12345” -> `risk_label_ids`
- “近7天” -> `biz_time_range`
- “图音综合流” -> category candidate under webcast intelligent annotation mapping

### Rule 2: never choose `category_id` from tenant alone

For sample queries, `category_id` should be narrowed by at least:

- `tenant`
- `material_type`
- `source`

If the user only says “直播样本” or “直播智能标注样本”, that is not enough to determine a unique `category_id`.

### Rule 3: if multiple rows match, return candidates instead of guessing

For example, under `webcast` with intelligent annotation related rows, the CSV contains multiple categories such as:

| Category ID | Material type | Source |
|-------------|---------------|--------|
| `322352800002` | 图片流 | 智能标注 |
| `131735200002` | 泛娱乐 | 智能标注 |
| `225892000002` | 直播_通用 | 智能标注 |
| `589770609154` | 直播切片 | 智能标注 |
| `72752800002` | 直播测试题材 | 智能标注 |
| `46180000002` | 综合事件流 | 智能标注 |
| `81815205634` | 综合事件流 | 智能标注 |
| `386096800002` | 音频流 | 智能标注 |
| `1351933603842` | 风险案例库 | 智能标注 |
| `1298941606146` | 风险案例库 | 智能标注 |

That means the skill should surface candidates like these and ask the caller to confirm the intended material type or source instead of silently picking one.

### Safer assembly examples

#### Example: 用户说“查直播综合事件流的智能标注样本”

This is narrower than just “直播智能标注”, but it is still not always unique. The CSV contains at least these candidates:

- `46180000002` -> `webcast / 综合事件流 / 智能标注`
- `81815205634` -> `webcast / 综合事件流 / 智能标注`

Safe behavior:

- set `--tenant webcast`
- present both candidate `category_id` values
- do not silently choose one unless there is additional confirmed business context

#### Example: 用户说“查 webcast 指定 label id、近7天、图音综合流的数据”

This is the target high-value execution pattern for this skill.

Expected assembly:

- `--tenant webcast`
- `category_id`: use the webcast intelligent-annotation integrated-stream mapping
- `risk_label_ids`: use the provided label id directly
- `biz_time_range`: set to the most recent 7-day window

Condition template:

```json
{
  "category_id": "46180000002",
  "risk_label_ids": {
    "<biz-scene-id>": ["<label-id>"]
  },
  "biz_time_range": {
    "from_time": 1700000000,
    "to_time": 1700604800
  }
}
```

Runnable command template:

```bash
bytedcli --json safe sample query_samples \
  --condition-file ./sample-condition.json \
  --tenant webcast \
  --business-id <business-id> \
  --business-key <business-key>
```

If the user says “封建迷信” but does not provide the concrete label id, the skill should first resolve or request the exact label id instead of guessing from the label name.

#### Example: 用户说“查询智能标注近7天的直播的图音综合流的封建迷信的数据”

Recommended behavior:

- map “直播” -> `webcast`
- map “近7天” -> `biz_time_range`
- map “图音综合流” to the integrated-stream category candidate under webcast intelligent annotation
- treat “封建迷信” as a label intent; if there is already a known `label id`, use it directly, otherwise ask only for the exact label id or the upstream mapping source

If your environment standardizes “图音综合流” to the webcast intelligent-annotation integrated-stream category, prefer assembling and running the command rather than stopping at a generic explanation.

#### Example: 用户说“查直播通用的智能标注样本”

Candidate:

- `225892000002` -> `webcast / 直播_通用 / 智能标注`

This is a stronger candidate because the row is more specific, but it should still be described as a candidate derived from the CSV mapping rather than a guaranteed universal rule.

#### Example: 用户说“查视频智能标注样本”

Candidate:

- `281956000514` -> `community / 视频 / 智能标注`

This is a reasonable candidate from the CSV, but if the user actually means another video-related source table, list alternatives instead of forcing this value.

#### Example: 用户说“查短剧智能标注样本”

Candidate:

- `400996000002` -> `playlet / 短剧 / 智能标注`

This is a reasonable candidate from the CSV and is more specific than a tenant-only mapping.

## How to use the mapping safely

- First map the natural-language business domain to `tenant`
- Then narrow `category_id` by `material_type + source`
- If the user mentions “智能标注”, prefer rows whose `source` is `智能标注`
- If the user explicitly asks for webcast + label id + recent 7 days + 图音综合流, prefer producing a runnable `condition` object instead of only returning guidance
- If the user mentions “优质样本”, prefer rows whose `source` is `优质样本基建` or `高质量样本`
- If multiple rows still match, return candidate categories instead of guessing silently
- If the same `tenant + material_type + source` combination maps to multiple IDs, treat the mapping as ambiguous
- Treat the CSV as an assistant-side lookup aid, not as an authoritative guarantee that one phrase always maps to one category

## Tips

- Prefer `--condition-file` over long inline JSON
- Add `--json` for machine-readable output
- Repeat `--need-feature` to request multiple fields
- Dotted feature keys such as `room.room_id` and `user.base_nickname` are supported
- If you use `expression_group`, include `category_id` in the same condition

## Common Issues

- `SAFE_AUTH_REQUIRED` / `401 No login`
  - Run `bytedcli auth login --session`, then `bytedcli safe login`
  - If the error says `BDSSO cookie not found`, the missing step is `auth login --session`
- `Invalid JSON in --condition-json`
  - Move the payload into `--condition-file`
- Requested feature is missing from `samples[*].features`
  - Confirm the field exists in upstream `extra_data`
  - Confirm the `--need-feature` name matches the upstream key exactly

## Reference: onboarding

## Safe Sample 新手指南

这份文档面向第一次接触 `bytedcli safe sample query_samples` 的同学，目标是帮你在最短路径内完成一次可复现的样本查询，并理解后续如何把自然语言需求翻译成可执行命令。

## 1. 这条命令是做什么的

`safe sample query_samples` 用来查询 Safe 样本库里的样本数据。

命令入口：

```bash
bytedcli safe sample query_samples (--condition-json <json> | --condition-file <path>) [options]
```

最常见的用途：

- 查某个业务租户下的样本
- 查某个 category 的样本
- 查某个 risk label 的样本
- 查最近 N 天的样本
- 拉出额外 feature 字段供后续分析

## 2. 先准备什么

第一次使用前，至少要准备下面几项：

1. 准备 SSO browser session 并登录 Safe
2. 确认 tenant
3. 确认 business-id / business-key
4. 确认查询条件 JSON

### 2.1 登录

Safe sample 查询最终使用 `bytedcli safe login` 保存的 Safe cookie。第一次使用时，先准备 SSO browser session，再换取 Safe cookie：

```bash
bytedcli auth login --session
bytedcli safe login
```

Agent 或 JSON 编排场景可以用非阻塞 SSO 流程启动 browser session：

```bash
bytedcli --json auth login --begin --session
bytedcli --json auth login --complete <token>
bytedcli safe login
```

如果已经有 Safe cookie，也可以直接注入：

```bash
bytedcli safe login --cookie "session=xxx"
```

如果没登录，常见报错通常是 `SAFE_AUTH_REQUIRED` 或 `401 No login`。遇到 `BDSSO cookie not found` 时，先补 `bytedcli auth login --session`，再执行 `bytedcli safe login`。

### 2.2 配默认值

如果你经常查同一个业务，建议先把默认值写到本地配置：

```bash
bytedcli safe config set --key tenant --value webcast
bytedcli safe config set --key business_id --value <business-id>
bytedcli safe config set --key business_key --value <business-key>
```

这样后面执行命令时可以少写很多参数。

## 3. 最小可用命令

先从最小可用版本开始：只查一个 category。

### 3.1 直接内联 JSON

```bash
bytedcli --json safe sample query_samples \
  --condition-json '{"category_id":"46180000002"}' \
  --tenant webcast \
  --business-id <business-id> \
  --business-key <business-key>
```

### 3.2 用 condition 文件

更推荐把条件放文件里。

`sample-condition.json`:

```json
{
  "category_id": "46180000002"
}
```

执行：

```bash
bytedcli --json safe sample query_samples \
  --condition-file ./sample-condition.json \
  --tenant webcast \
  --business-id <business-id> \
  --business-key <business-key>
```

为什么更推荐 `--condition-file`：

- JSON 更长时不容易写错引号
- 方便保存和复用
- 更适合复杂筛选条件

## 4. 最常见的 condition 长什么样

### 4.1 只按 category 查

```json
{
  "category_id": "46180000002"
}
```

### 4.2 按 category + risk label 查

```json
{
  "category_id": "46180000002",
  "risk_label_ids": {
    "<biz-scene-id>": ["<label-id>"]
  }
}
```

这里要注意：

- `risk_label_ids` 不是单个字符串
- 它是一个对象，key 是 `biz-scene-id`
- value 是 label id 数组

### 4.3 按近 7 天查

```json
{
  "category_id": "46180000002",
  "biz_time_range": {
    "from_time": 1700000000,
    "to_time": 1700604800
  }
}
```

### 4.4 按 category + label + 最近时间窗口查

```json
{
  "category_id": "46180000002",
  "risk_label_ids": {
    "<biz-scene-id>": ["<label-id>"]
  },
  "biz_time_range": {
    "from_time": 1700000000,
    "to_time": 1700604800
  }
}
```

这就是最接近真实业务查询的组合写法。

## 5. 怎么把自然语言翻成命令

这是大家最容易卡住的地方。

推荐把一句自然语言拆成 4 个槽位：

1. `tenant`
2. `category_id`
3. `risk_label_ids`
4. `biz_time_range`

### 5.1 一个完整例子

用户原话：

> 查询智能标注近7天的直播的图音综合流的封建迷信的数据

建议拆法：

- “直播” -> `tenant=webcast`
- “智能标注” -> source 倾向 `智能标注`
- “图音综合流” -> category 候选，当前文档按 webcast 智能标注综合流候选处理
- “封建迷信” -> 风险标签意图，最好落到明确的 `label id`
- “近7天” -> `biz_time_range`

然后组装成：

```json
{
  "category_id": "46180000002",
  "risk_label_ids": {
    "<biz-scene-id>": ["<label-id>"]
  },
  "biz_time_range": {
    "from_time": 1700000000,
    "to_time": 1700604800
  }
}
```

对应命令：

```bash
bytedcli --json safe sample query_samples \
  --condition-file ./sample-condition.json \
  --tenant webcast \
  --business-id <business-id> \
  --business-key <business-key>
```

### 5.2 什么时候可以直接查，什么时候要先停一下

可以直接查：

- tenant 已知
- category 已唯一确定
- label id 已知
- 时间范围已知
- business-id / business-key 已知

应该先停一下补信息：

- 只说“封建迷信”，但没给 `label id`
- 只说“直播智能标注样本”，但 category 还不唯一
- 没有 `business-id / business-key`

## 6. tenant 和 category 怎么找

### 6.1 tenant 常见映射

- 直播 -> `webcast`
- 视频 -> `community`
- 短剧 -> `playlet`

### 6.2 webcast 智能标注下常见 category 候选

当前参考文档中能看到这些候选：

- `322352800002` -> 图片流 / 智能标注
- `225892000002` -> 直播_通用 / 智能标注
- `46180000002` -> 综合事件流 / 智能标注
- `386096800002` -> 音频流 / 智能标注

注意：

- 不要只靠 tenant 猜 category
- 如果一个自然语言意图能匹配多个 category，优先列候选，不要静默乱选

## 7. 怎么拿到更多字段

很多时候你不只想看样本主字段，还想看样本的扩展特征。可以加 `--need-feature`。

例如：

```bash
bytedcli --json safe sample query_samples \
  --condition-file ./sample-condition.json \
  --need-feature dataset_id \
  --need-feature annotation_task_id \
  --need-feature room.room_id \
  --tenant webcast \
  --business-id <business-id> \
  --business-key <business-key>
```

这些字段会出现在结果里的 `samples[*].features` 中。

## 8. 新手最容易踩的坑

### 8.1 忘了登录

现象：401、未登录、`SAFE_AUTH_REQUIRED`

处理：

```bash
bytedcli auth login --session
bytedcli safe login
```

如果报错明确写着 `BDSSO cookie not found`，说明缺的是 SSO browser session，不是 sample 查询条件；先完成 `auth login --session`。

### 8.2 `condition-json` 写错

现象：JSON 解析报错。

处理：

- 优先改成 `--condition-file`
- 不要在 shell 里硬写太长 JSON

### 8.3 把 label 名当 label id 用

现象：查不到或返回不符合预期。

处理：

- `risk_label_ids` 里应该尽量放明确的 `label id`
- 如果只有中文标签名，先确认它对应哪个 id

### 8.4 business headers 漏了

现象：命令能跑，但接口侧报业务参数问题。

处理：

- 补 `--business-id`
- 补 `--business-key`

### 8.5 category 不唯一时直接拍脑袋选一个

这会导致“命令能跑，但结果不是你想要的”。

更稳妥的做法：

- 先缩小 material type
- 再缩小 source
- 如果还是多个候选，就先确认 category id

## 9. 推荐给新同学的工作流

### 第一步：先跑最小查询

先验证登录、tenant、business-id、business-key 都没问题。

### 第二步：再加 category

确认 category 后先做一次只按 category 的查询。

### 第三步：再加时间范围

比如加最近 3 天或最近 7 天。

### 第四步：最后再加 risk label

因为 label 往往最容易填错，最后加更容易定位问题。

## 10. 推荐的调试顺序

如果一条复杂命令查不出来，按这个顺序排查：

1. 能否只按 category 查出数据
2. 加上时间范围后还有没有数据
3. 加上 risk label 后还有没有数据
4. `--need-feature` 的字段名是否拼对了

## 11. 给 Agent / Skill 开发同学的建议

如果你要把自然语言自动翻译成 sample 查询，建议遵守这几个原则：

- 优先产出可执行命令，不要只给概念解释
- tenant/category/label/time-range 四个槽位要显式落盘
- 缺最关键参数时只追问最少的信息
- `business-id / business-key / biz-scene-id` 是高频缺失项
- category 不唯一时，返回候选，不要静默猜一个

## 12. 一条可直接复制的模板

`sample-condition.json`:

```json
{
  "category_id": "46180000002",
  "risk_label_ids": {
    "<biz-scene-id>": ["<label-id>"]
  },
  "biz_time_range": {
    "from_time": 1700000000,
    "to_time": 1700604800
  }
}
```

执行命令：

```bash
bytedcli --json safe sample query_samples \
  --condition-file ./sample-condition.json \
  --need-feature dataset_id \
  --need-feature annotation_task_id \
  --need-feature room.room_id \
  --tenant webcast \
  --business-id <business-id> \
  --business-key <business-key>
```

## 13. 继续看哪里

- `references/sample-api.md`：看 API 字段与返回结构
- `references/sample-guide.md`：看 tenant/category 映射和自然语言组装规则
- `SKILL.md`：看 skill 应该如何把自然语言请求转成命令
