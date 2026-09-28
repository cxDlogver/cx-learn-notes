# Safe Hawkpro — Trace Query

Query hawkpro moderation traces and HawkOps error reasons: aggregate trace stats, list traces by user ID / room ID / generic object filters, get trace detail with execution graph, export filtered cases, and use `trace doctor` when investigating objectID machine-review failures or Hawkpro error causes.

## Plugin source

The `safe hawkpro scene get`, `safe hawkpro scene get-dag`, `safe hawkpro scene upsert-param`, `safe hawkpro workflow get`, `safe hawkpro workflow list`, `safe hawkpro workflow update-task-params`, `safe hawkpro rule get`, `safe hawkpro group-draft ...`, and `safe hawkpro evaluation ...` commands are provided by the **safecli** plugin (repo `ies_safety/safecli`), not the bytedcli core binary. The plugin manifest requires bytedcli `>=0.88.0`. Install the plugin when you need any of the plugin-provided commands:

```bash
bytedcli self plugin install --repo ies_safety/safecli
bytedcli self plugin doctor --name safecli
```

If `scene get`, `scene get-dag`, `workflow get`, `workflow list`, `workflow update-task-params`, `group-draft`, or `evaluation` reports "unknown command", the safecli plugin is not installed or is disabled.

## Authentication

Requires Safe authentication. A single `safe login` covers `safe.bytedance.net`, `hawk.bytedance.net`, and `tcs.bytedance.net` via shared MPSSO cookies — no separate hawk login is needed.

```bash
bytedcli auth login --session
bytedcli safe login
```

If the hawk query reports missing permission, open the Hawk strategy tracing page below in a browser, apply for Hawk access, then retry:

```text
https://hawk.bytedance.net/v2/strategy_tracing?businessId=125&scene=community_audit_safe&start_time=1778223340945&end_time=1778309740945
```

## Trace Main Path Notes

- `trace stats`, `trace list-stats-fields`, and `trace export` are available in addition to existing `trace list` / `trace get` / `trace doctor`.
- `trace` continues to use the existing safe-domain business resolution chain: CLI flags > env > `safe config` > defaults `101/live`.
- Omit `--scene-id` to query across scenes. If an old script relied on an implicit scene, pass that `--scene-id` explicitly.
- Keep using `--uid`, `--room-id`, and historical `--action-type` for compatibility. New generic filters should prefer `--object-info`, `--effect-action-type`, and `--hit-action-type`.
- `--action-type` and `--effect-action-type` map to final effective action (`effect_action_types`); `--hit-action-type` maps to strategy hit action (`action_types`).
- `--business-key` mainly distinguishes business lines for trace queries. Common values include `live`, `community`, `ecology`, `open`, `game`, `comment`, `im`, `account`, `entertainment`, `playlet`, `fund_security`, `common`, `copyright`, `positive_ecology`, `perfesional`, `medical`, `account_ecology`, `submit_tool`, `special_effect`, `ecommerce`, and `anti_cheat`.
- `trace stats` / `trace export` auto-discover `field_keys` from `get_field_list` when `--fields` is omitted. Use `trace list-stats-fields` to inspect available fields.


## Commands


### trace stats

Aggregate trace metrics before looking at individual cases.

```bash
bytedcli safe hawkpro trace stats --business-id 102 --business-key community --scene-id 107 --days 1
bytedcli safe hawkpro trace stats --business-id 102 --business-key community --object-info user_id=demo-user-id-1 --days 3
bytedcli safe hawkpro trace list-stats-fields --scene-id 107
bytedcli --json safe hawkpro trace stats --business-id 102 --business-key community --scene-id 107 --fields total,hit_count,hit_rate
```

### trace list

List trace entries for a user or live room.

```bash
# By user ID (default: last 7 days, hit only)
bytedcli safe hawkpro trace list --uid 3722318767734586

# By user ID with day range
bytedcli safe hawkpro trace list --uid 3722318767734586 --days 3

# Multiple users
bytedcli safe hawkpro trace list --uid 3722318767734586 --uid 8765432109876543

# By room ID
bytedcli safe hawkpro trace list --room-id 7631824140719737626

# By object IDs (repeatable)
bytedcli safe hawkpro trace list --object-ids demo-object-id-1 demo-object-id-2

# With time range (relative)
bytedcli safe hawkpro trace list --uid 3722318767734586 --start "2h ago"

# With time range (absolute)
bytedcli safe hawkpro trace list --uid 3722318767734586 --start "2026-04-01" --end "2026-04-27"

# Filter by hit result
bytedcli safe hawkpro trace list --uid 3722318767734586 --hit true
bytedcli safe hawkpro trace list --uid 3722318767734586 --hit false

# Filter by hit action / effective action
bytedcli safe hawkpro trace list --business-id 102 --business-key community --scene-id 107 --hit-action-type 送人审-线上审核
bytedcli safe hawkpro trace list --business-id 102 --business-key community --scene-id 107 --action-type 送处置
bytedcli safe hawkpro trace list --business-id 102 --business-key community --scene-id 107 --effect-action-type 送处置

# Generic object info
bytedcli safe hawkpro trace list --business-id 102 --business-key community --object-info user_id=demo-user-id-1
bytedcli safe hawkpro trace list --business-id 109 --business-key im --object-info im_conv_short_id=demo-conv-id --scene-id 2 --scene-id 14 --scene-id 3

# Pagination
bytedcli safe hawkpro trace list --uid 3722318767734586 --page-size 50
bytedcli safe hawkpro trace list --uid 3722318767734586 --cursor <next-cursor>

# JSON output
bytedcli --json safe hawkpro trace list --uid 3722318767734586
```

### trace get

Get trace detail by trace ID. Shows execution graph, rule hit results, and disposition action analysis.

```bash
# Basic detail (auto-detects disposition rules, shows View 1)
bytedcli safe hawkpro trace get --id <trace-id>

# Limit returned rule_infos to a specific group
bytedcli safe hawkpro trace get --id <trace-id> --group-id 10

# Limit returned rule_infos to a specific rule
bytedcli safe hawkpro trace get --id <trace-id> --rule-id 100

# Override only_hit / only_exec filters (defaults to true when --group-id/--rule-id are absent)
bytedcli safe hawkpro trace get --id <trace-id> --only-hit false
bytedcli safe hawkpro trace get --id <trace-id> --group-id 10 --only-hit true --only-exec false

# View 2: Find rules by risk label name
bytedcli safe hawkpro trace get --id <trace-id> --risk-label demo-label

# Show upstream chain with all conditions (works with both views)
bytedcli safe hawkpro trace get --id <trace-id> --upstream

# Combine risk-label and upstream
bytedcli safe hawkpro trace get --id <trace-id> --risk-label demo-label --upstream

# JSON output
bytedcli --json safe hawkpro trace get --id <trace-id>
```


### trace export

Export filtered cases after confirming the filter with `trace stats` / `trace list`.
The current export flow is asynchronous: after the command is accepted, a Feishu
bot sends the export task status and download link later. Do not treat an empty
inline `taskId` / `downloadUrl` in CLI output as a failure by itself.

```bash
bytedcli safe hawkpro trace export --business-id 102 --business-key community --scene-id 107 --object-info user_id=demo-user-id-1 --days 3
bytedcli safe hawkpro trace export --business-id 102 --business-key community --object-ids demo-object-id-1,demo-object-id-2 --start "2h ago"
bytedcli safe hawkpro trace export --business-id 102 --business-key community --scene-id 107 --fields trace_id,object_id,effect_action_types
```

### trace doctor

Diagnose the latest failed execution error reason for object_id(s).

```bash
bytedcli safe hawkpro trace doctor --scene demo-scene --object-id demo-object-id-1
bytedcli safe hawkpro trace doctor --scene demo-scene --object-id demo-object-id-1 --object-id demo-object-id-2 --hours 48
bytedcli safe hawkpro trace doctor --scene community_audit_safe --object-id demo-object-id-1
bytedcli --json safe hawkpro trace doctor --scene demo-scene --object-id demo-object-id-1
```

When `--scene community_audit_safe` and the V2 brief returns "not found", the
service automatically falls back to the legacy brief endpoint on the upstream
scene `aweme_first_review_video_new_arch` to distinguish frame-extraction
failure from missing review records.

Failure-record fields exposed alongside `error_code`:

These triage helper fields are best-effort enrichments on top of the primary
`error_code` / `message` result. Some failure paths still only emit the base
error pair when no stronger normalized guidance is available yet, so callers
must tolerate them being absent.

- `classification`
  - `root_cause` — final answer; safe to count in Top reasons.
  - `continue_drilldown` — must be drilled further (e.g. via `picked.log_id`)
    before being treated as a final reason.
  - `evidence_gap` — only evidence is missing; do not aggregate as a reason.
- `canonical_reason` — stable reason key, e.g. `upstream_frame_failed`,
  `brief_missing`, `brief_lookup_failed`, `detail_failed_but_logid_available`,
  `detail_lookup_failed`, `trace_lookup_failed`,
  `duplicate_submit_callback_read_failed`.
- `upstream_scene` — populated when the fallback upstream scene matched
  (currently `aweme_first_review_video_new_arch`).
- `next_action` — suggested follow-up such as `continue_with_picked_logid`,
  `widen_window_or_check_upstream_submission`,
  `treat_as_upstream_frame_failure`, `retry_brief_lookup_or_check_hawk_auth`,
  `retry_detail_lookup`, `retry_trace_lookup`, `contact_business_oncall`.
- `picked.log_id` / `picked.rand_id` — surfaced on every detail-stage failure
  (HTTP error, envelope non-200, 401 auth, parse failure) so the caller can
  chase the trace via log_id without rerunning trace doctor.
- `picked.service_name` — on the normal V2 path this is the requested service
  being drilled (for example `Hawkpro`); on the legacy fallback path it stays
  as the upstream service carried by the matched execution record (for example
  `ReviewPipeline`).

Error codes specific to the `community_audit_safe` fallback:

- `TRACE_FRAME_FAILED` — upstream legacy brief has records but V2 brief
  missed; treat as upstream frame-extraction failure (`classification=root_cause`).
- `TRACE_BRIEF_NOT_FOUND` — neither V2 nor legacy upstream brief has records;
  treat as evidence gap (`classification=evidence_gap`).

### workflow list

List hawkpro workflows for a business. Provided by the **safecli** plugin (see Plugin source above). Requires `--business-id` and `--business-key`.

```bash
# Basic list
bytedcli safe hawkpro workflow list --business-id 102 --business-key sample-business

# Filter by scene and creator
bytedcli safe hawkpro workflow list --business-id 102 --business-key sample-business --in-scene-id 6748 --creator demo-user

# Search by workflow remark with pagination
bytedcli safe hawkpro workflow list --business-id 102 --business-key sample-business --keyword demo-workflow --page 1 --page-size 20

# Filter by create time (relative time supported)
bytedcli safe hawkpro workflow list --business-id 102 --business-key sample-business --create-start-time "7d ago"

# JSON output
bytedcli --json safe hawkpro workflow list --business-id 102 --business-key sample-business
```

### workflow get

Get a hawkpro workflow detail by ID. Provided by the **safecli** plugin (see Plugin source above). Requires `--workflow-id`, `--business-id`, and `--business-key`.

```bash
# Basic detail (frodo endpoint)
bytedcli safe hawkpro workflow get --workflow-id 12345 --business-id 102 --business-key sample-business

# With auditor detail and strategy diff
bytedcli safe hawkpro workflow get --workflow-id 12345 --business-id 102 --business-key sample-business --with-auditors --with-strategy-diff

# Query the RD workbench workflow endpoint instead of frodo
bytedcli safe hawkpro workflow get --workflow-id 12345 --business-id 102 --business-key sample-business --is-rd-workbench

# JSON output
bytedcli --json safe hawkpro workflow get --workflow-id 12345 --business-id 102 --business-key sample-business
```

### workflow update-task-params

Update the params of a single task in a hawkpro workflow task tree. Provided by the **safecli** plugin (see Plugin source above). Requires `--workflow-id`, `--task-id`, `--params`, `--business-id`, and `--business-key`. The downstream `/workflow/update` endpoint patches `workflow.task_tree` only (`workflow.extra` is not touched).

This is a write command and prompts for interactive confirmation before applying. Pass `--yes` to skip the prompt (required in non-interactive shells). `--params` accepts an inline JSON string or a path to a JSON file; the value is validated as JSON and forwarded as-is to the upstream task `params` field.

```bash
# Inline JSON params (interactive confirmation)
bytedcli safe hawkpro workflow update-task-params --workflow-id 12345 --task-id 1 --params '{"key":"value"}' --business-id 102 --business-key sample-business

# Params from a JSON file
bytedcli safe hawkpro workflow update-task-params --workflow-id 12345 --task-id 2 --params ./sample-params.json --business-id 102 --business-key sample-business

# Skip the confirmation prompt
bytedcli safe hawkpro workflow update-task-params --workflow-id 12345 --task-id 1 --params '{"key":"value"}' --business-id 102 --business-key sample-business --yes

# JSON output
bytedcli --json safe hawkpro workflow update-task-params --workflow-id 12345 --task-id 1 --params '{"key":"value"}' --business-id 102 --business-key sample-business --yes
```

### scene list

List hawkpro scenes.

```bash
bytedcli safe hawkpro scene list
```

### scene get

Get a machine review scene detail by ID. Provided by the **safecli** plugin (see Plugin source above). Pass `--with-feature true` to return extra feature reference counts and binding fill info; this requires additional backend joins and responds slower. Defaults to `false`.

```bash
bytedcli safe hawkpro scene get --id 274
bytedcli safe hawkpro scene get --id 274 --with-feature true
bytedcli --json safe hawkpro scene get --id 274
```

### scene get-dag

Get scene orchestration (DAG) info. Provided by the safecli plugin.

```bash
bytedcli safe hawkpro scene get-dag --id 274 --business-key demo-scope
bytedcli safe hawkpro scene get-dag --id 274 --key demo-scene-key --business-key demo-scope
bytedcli --json safe hawkpro scene get-dag --id 274 --business-key demo-scope
```

### scene update-runtime-conf

Update a scene's runtime configuration.

```bash
bytedcli safe hawkpro scene update-runtime-conf --id 6748 --action-conf '{"key": "value"}'
bytedcli safe hawkpro scene update-runtime-conf --key demo-key --action-conf ./path/to/conf.json
```

### scene upsert-param

Add a scene param when missing, or update its Chinese display name when the key already exists and all non-name fields are compatible. Provided by the safecli plugin.

```bash
bytedcli safe hawkpro scene upsert-param --id 6748 --param '{"key":"demo_param","name":"Demo Param","value_type":"int64"}' --business-key demo-scope
bytedcli safe hawkpro scene upsert-param --key demo-scene-key --param ./param.json --business-key demo-scope
```

### rule list

List rules in a hawkpro scene.

```bash
bytedcli safe hawkpro rule list --scene-id 6748
bytedcli safe hawkpro rule list --scene-id 6748 --group-keyword demo
bytedcli safe hawkpro rule list --scene-id 6748 --rule-keyword spam
bytedcli --json safe hawkpro rule list --scene-id 6748
```

### rule get

Get Hawkpro rule detail. Provided by the safecli plugin.

```bash
bytedcli safe hawkpro rule get --scene-id 6748 --rule-ids 123
bytedcli safe hawkpro rule get --scene-id 6748 --rule-ids 123 --draft-id 354967
bytedcli --json safe hawkpro rule get --scene-id 6748 --rule-ids 123
```

### group-draft

Manage Hawkpro rule group drafts. Provided by the safecli plugin.

```bash
bytedcli safe hawkpro group-draft create --group-id 123 --content '{"rules":[]}'
bytedcli safe hawkpro group-draft create --group-id 123 --content '{"rules":[]}' --name draft-for-review
bytedcli safe hawkpro group-draft list --group-id 123
bytedcli safe hawkpro group-draft get --id 354967
bytedcli --json safe hawkpro group-draft list --group-id 123
```

### evaluation

List, inspect, and delete Hawkpro evaluation tasks. Provided by the safecli plugin.

```bash
bytedcli safe hawkpro evaluation list --scope sample-scope --page 1 --page-size 10
bytedcli safe hawkpro evaluation list-result --id 101 --scope sample-scope
bytedcli safe hawkpro evaluation get-report --id 101 --scope sample-scope
bytedcli safe hawkpro evaluation delete --id 101 --scope sample-scope --yes
bytedcli --json safe hawkpro evaluation list --scope sample-scope
```

### action list

List actions in a hawkpro scene.

```bash
bytedcli safe hawkpro action list --scene-id 6748
bytedcli safe hawkpro action list --scene-id 6748 --keyword test
bytedcli --json safe hawkpro action list --scene-id 6748
```

### action copy

Copy actions to a target scene.

```bash
bytedcli safe hawkpro action copy --to-scene-id 6749 --action-ids 100 101
bytedcli --json safe hawkpro action copy --to-scene-id 6749 --action-ids 100
```

### scene add-param

Add a new parameter to a hawkpro scene.

```bash
bytedcli safe hawkpro scene add-param --id 6748 --param-key my_param --param-name "My Param" --param-value-type string
```

## Options

### trace list

| Option | Default | Description |
|--------|---------|-------------|
| `--uid <uid...>` | — | User ID filter (repeatable) |
| `--room-id <roomId...>` | — | Live room ID filter (repeatable) |
| `--object-ids <objectIds...>` | — | Object ID filter (repeatable; comma-separated values are also supported) |
| `--scene-id <sceneId...>` | — | Scene ID filter (repeatable). Omit it to query across scenes. |
| `--start <time>` | — | Start time: Unix seconds, date string, or relative (`"2h ago"`, `"1 day ago"`) |
| `--end <time>` | — | End time (same format as `--start`) |
| `--days <days>` | `7` | Day range when `--start`/`--end` are omitted (max: 7) |
| `--hit <boolean>` | — | Hit filter: `true` or `false`. Omitted means no hit filter (returns both hit and non-hit traces). Pass `--hit true` to keep the legacy "hit-only" behavior. |
| `--hit-action-type <type>` | — | Hit action type filter, mapped to backend `action_types` (e.g. `送大模型识别`) |
| `--effect-action-type <type>` | — | Explicit final effective action filter, mapped to backend `effect_action_types` (e.g. `送处置`) |
| `--object-info <key=value...>` | — | Generic `object_infos[]` filter. Repeat for different keys; comma-separate multiple values for one key. |
| `--fields <keys...>` | — | Explicit `field_keys` for `trace stats` / `trace export`; omitted means auto-discover fields. |
| `--action-type <type>` | — | Effect action type filter, mapped to backend `effect_action_types` (e.g. `送处置`) |
| `--group-ids <groupIds...>` | — | Rule group ID filter (repeatable) |
| `--rule-ids <ruleIds...>` | — | Rule ID filter (repeatable) |
| `--page-size <n>` | `20` | Page size (max: 100) |
| `--cursor <cursor>` | — | Pagination cursor from previous response |

### trace get

| Option | Default | Description |
|--------|---------|-------------|
| `--id <id>` | (required) | Trace ID |
| `--group-id <id>` | — | Limit returned `rule_infos` to a specific group ID |
| `--rule-id <id>` | — | Limit returned `rule_infos` to a specific rule ID |
| `--only-hit <bool>` | — | Override `only_hit` filter (`true`/`false`). Defaults to `true` when `--group-id`/`--rule-id` are absent; otherwise omitted unless explicitly set. |
| `--only-exec <bool>` | — | Override `only_exec` filter (`true`/`false`). Defaults to `true` when `--group-id`/`--rule-id` are absent; otherwise omitted unless explicitly set. |
| `--risk-label <name>` | — | Find rules by risk label name (View 2) |
| `--upstream` | `false` | Show upstream chain with all conditions |

### trace stats

| Option | Default | Description |
|--------|---------|-------------|
| `--scene-id <sceneId...>` | — | Scene ID filter (repeatable). Omit it to query across scenes. |
| `--uid <uid...>` | — | Compatibility alias for `--object-info user_id=<value>` |
| `--room-id <roomId...>` | — | Compatibility alias for `--object-info room_id=<value>` |
| `--object-ids <objectIds...>` | — | Object ID filter (repeatable; comma-separated values are also supported) |
| `--object-info <key=value...>` | — | Generic `object_infos[]` filter. Repeat for different keys; comma-separate multiple values for one key. |
| `--start <time>` / `--end <time>` | — | Start / end time: Unix seconds, date string, or relative time |
| `--days <days>` | `7` | Day range when `--start` / `--end` are omitted (max: 7) |
| `--hit <boolean>` | — | Hit filter: `true` / `false`; omitted means no hit filter |
| `--action-type <type>` | — | Legacy final effective action filter, mapped to `effect_action_types` |
| `--effect-action-type <type>` | — | Explicit final effective action filter, mapped to `effect_action_types` |
| `--hit-action-type <type>` | — | Hit action filter, mapped to `action_types` |
| `--fields <keys...>` | auto | Explicit `field_keys`; omitted means auto-discover from `get_field_list` |
| `--source-type <type>` | — | `source_type` filter (`online` / `offline`) |
| `--workflow-type <int>` | — | `workflow_type` filter |
| `--group-ids <groupIds...>` / `--rule-ids <ruleIds...>` | — | Multi group / rule filter |

### trace list-stats-fields

| Option | Default | Description |
|--------|---------|-------------|
| `--scene-id <sceneId>` | — | Single scene ID used for field discovery |
| `--item-type <type>` | `scene` | `item_type` for `get_field_list`: `scene` / `event` / `rule` |
| `--source <int>` | `1` | `source` parameter for `get_field_list` |

### trace export

| Option | Default | Description |
|--------|---------|-------------|
| `--scene-id <sceneId...>` | — | Scene ID filter (repeatable). Omit it to query across scenes. |
| `--uid <uid...>` / `--room-id <roomId...>` | — | Compatibility aliases for common object filters |
| `--object-ids <objectIds...>` | — | Object ID filter (repeatable; comma-separated values are also supported) |
| `--object-info <key=value...>` | — | Generic `object_infos[]` filter |
| `--start <time>` / `--end <time>` | — | Start / end time: Unix seconds, date string, or relative time |
| `--days <days>` | `7` | Day range when `--start` / `--end` are omitted (max: 7) |
| `--fields <keys...>` | auto | Explicit export `field_keys`; omitted means use default-selected field list |
| `--action-type <type>` / `--effect-action-type <type>` | — | Final effective action filters |
| `--hit-action-type <type>` | — | Hit action filter |

### workflow list

Provided by the safecli plugin.

| Option | Default | Description |
|--------|---------|-------------|
| `--business-id <id>` | (required) | Business ID |
| `--business-key <key>` | (required) | Business key |
| `--in-stage <stage...>` | — | Filter by workflow stage(s) (repeatable) |
| `--in-process-status <status...>` | — | Filter by process status (repeatable) |
| `--in-deploy-type <type...>` | — | Filter by deploy type (repeatable) |
| `--in-workflow-id <id...>` | — | Filter by workflow ID (repeatable) |
| `--in-bizline-id <id...>` | — | Filter by business line ID (repeatable) |
| `--in-scene-id <id...>` | — | Filter by scene ID (repeatable) |
| `--creator <creator...>` | — | Filter by creator (repeatable) |
| `--auditor <auditor...>` | — | Filter by auditor (repeatable) |
| `--keyword <keyword>` | — | Search by workflow remark |
| `--create-start-time <time>` | — | Create time start (Unix seconds, date string, or relative like `1h ago`) |
| `--create-end-time <time>` | — | Create time end (same format as `--create-start-time`) |
| `--deploy-start-time <time>` | — | Deploy time start (same time formats) |
| `--deploy-end-time <time>` | — | Deploy time end (same time formats) |
| `--order-by <field>` | — | Order results by the given field |
| `--page <page>` | `1` | Page number |
| `--page-size <pageSize>` | `10` | Page size |
| `--tenant <code>` | — | Tenant code |

### workflow get

Provided by the safecli plugin.

| Option | Default | Description |
|--------|---------|-------------|
| `--workflow-id <id>` | (required) | Workflow ID |
| `--business-id <id>` | (required) | Business ID |
| `--business-key <key>` | (required) | Business key |
| `--is-rd-workbench` | `false` | Query the RD workbench workflow endpoint instead of frodo (presence = true) |
| `--with-auditors` | `false` | Resolve auditors via `/workflow/auditors/get` and attach as `auditors_detail` (presence = true) |
| `--with-strategy-diff` | `false` | Include strategy diff (mapped to `with_rules` upstream; presence = true) |
| `--tenant <code>` | — | Tenant code |

### workflow update-task-params

Provided by the safecli plugin. Write command; confirms before applying.

| Option | Default | Description |
|--------|---------|-------------|
| `--workflow-id <id>` | (required) | Workflow ID |
| `--task-id <id>` | (required) | Task ID from the workflow task tree (positive integer) |
| `--params <json>` | (required) | New task params as an inline JSON string or a path to a JSON file (validated as JSON, forwarded as-is) |
| `--business-id <id>` | (required) | Business ID |
| `--business-key <key>` | (required) | Business key |
| `--tenant <code>` | — | Tenant code |
| `--yes` | `false` | Skip interactive confirmation (required in non-interactive shells) |

### scene list

| Option | Default | Description |
|--------|---------|-------------|
| `--keyword <name>` | — | Scene keyword |
| `--page <n>` | `1` | Page number |
| `--page-size <n>` | `10` | Page size |

### scene get

| Option | Default | Description |
|--------|---------|-------------|
| `--id <sceneId>` | (required) | Scene ID |
| `--with-feature <bool>` | `false` | Return extra feature reference counts and binding fill info (needs additional backend joins, slower) |

### scene update-runtime-conf

| Option | Default | Description |
|--------|---------|-------------|
| `--id <id>` | — | Scene ID (at least one of --id or --key is required) |
| `--key <key>` | — | Scene Key |
| `--action-conf <conf>` | (required) | JSON string or path to JSON file |

### scene add-param

| Option | Default | Description |
|--------|---------|-------------|
| `--id <id>` | — | Scene ID (at least one of --id or --key is required) |
| `--key <key>` | — | Scene Key |
| `--param-key <key>` | (required) | Parameter key |
| `--param-name <name>` | (required) | Parameter name |
| `--param-value-type <type>`| (required) | Parameter value type (string/bool/int/float/[]string/[]int/[]float/map) |
| `--param-is-encrypt` | `false` | Whether the parameter is encrypted |
| `--param-material-type <type>`| — | Material type |
| `--param-desc <desc>` | — | Parameter description |

### rule list

| Option | Default | Description |
|--------|---------|-------------|
| `--scene-id <id>` | (required) | Scene ID |
| `--group-keyword <name>` | — | Group keyword |
| `--rule-keyword <name>` | — | Rule keyword |
| `--page <n>` | `1` | Page number |
| `--page-size <n>` | `10` | Page size |

### action list

| Option | Default | Description |
|--------|---------|-------------|
| `--scene-id <id>` | — | Scene ID (required if --scene-key is absent) |
| `--scene-key <key>` | — | Scene Key (required if --scene-id is absent) |
| `--keyword <name>` | — | Action keyword |
| `--page <n>` | `1` | Page number |
| `--page-size <n>` | `10` | Page size |

### action copy

| Option | Default | Description |
|--------|---------|-------------|
| `--to-scene-id <id>` | (required) | Target scene ID |
| `--action-ids <ids...>` | (required) | Action IDs to copy |

## Output Modes

### trace get views

- **View 1 (default)**: When the trace has disposition actions, displays only the rules that affected the disposition, with their hit conditions and upstream dependencies.
- **View 2 (`--risk-label`)**: Searches graph nodes for the specified risk label, displays all matching rules with full condition details.

The `--upstream` flag adds upstream chain information to either view, showing parent node conditions.

### JSON mode

Use `--json` for machine-readable output. The JSON response matches the raw API response structure and includes full trace detail with graph nodes, action lists, and rule information.

## Common Patterns

**Investigating a user's recent hits:**
```bash
bytedcli safe hawkpro trace list --uid <uid> --hit true --days 3
```

**Finding traces that triggered disposition:**
```bash
bytedcli safe hawkpro trace list --uid <uid> --action-type 送处置 --days 7
```

**Finding traces that hit a specific action type:**
```bash
bytedcli safe hawkpro trace list --uid <uid> --hit-action-type 送大模型识别 --days 7
```

**Understanding why a trace was disposed:**
```bash
# Step 1: List to find the trace
bytedcli safe hawkpro trace list --uid <uid> --start "2h ago"
# Step 2: Get detail to see disposition rules
bytedcli safe hawkpro trace get --id <trace-id>
```

**Tracing upstream rule conditions:**
```bash
bytedcli safe hawkpro trace get --id <trace-id> --upstream
```


**Measuring trace stats before case drilldown:**
```bash
bytedcli safe hawkpro trace stats --business-id 102 --business-key community --scene-id 107 --days 1
```

**Exporting a filtered case set:**
```bash
bytedcli safe hawkpro trace export --business-id 102 --business-key community --scene-id 107 --fields trace_id,object_id,effect_action_types
```
If the command succeeds, wait for the Feishu bot notification for the export
task result and download link.
