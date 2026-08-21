# Safe Starfish

Query Starfish moderation traces, list review search condition options (`condition list`), manage the review task type catalog (`task-type list/max/save`), and inspect or create play events (玩法注册管理) on `webcast.bytedance.net`. Provided by the **safecli plugin** as the `safe starfish` sub-command group (`bytedcli safe starfish ...`).

## Installation

The starfish commands are part of the `safecli` plugin and must be installed once:

```bash
bytedcli self plugin install --repo ies_safety/safecli
```

Minimum host: `@bytedance-dev/bytedcli >= 0.76.0`. The installed safecli plugin must include a manifest entry for the `safe starfish` subtree with `overrideBuiltIn: true`; update or reinstall the plugin if the command is missing.

## Authentication

Starfish reuses the BDSSO browser session that backs `bytedcli auth login --session`, and `bytedcli safe login` automatically bootstraps the Starfish SSO session as part of its success path — no separate Starfish login is needed.

```bash
bytedcli auth login --session
bytedcli safe login
```

If `safe login` reports `! Starfish session not bootstrapped`, finish the BDSSO web flow with `bytedcli auth login --session` and re-run `bytedcli safe login`.

Cookie precedence for individual `bytedcli safe starfish ...` calls:

1. `--cookie "..."` on the command
2. `STARFISH_COOKIE` environment variable
3. Session captured by `bytedcli safe login` (via `ctx.auth.getSafeCookieHeader` host fallback)

> BOE (`--env boe`) needs the `boe_sid_starfish` cookie, which the SSO bootstrap does **not** issue. Pass it via `--cookie` or `STARFISH_COOKIE` when calling `play-event` against BOE.

## Commands

### trace

Search Starfish trace spans for one `object_id`.

```bash
bytedcli safe starfish trace --object-id example_obj@1
bytedcli safe starfish trace --object-id example_obj@1 --room-id sample-room-id --task-type 1001
bytedcli safe starfish trace --object-id example_obj@1 --object-type 2 --object-type 3 --action-type 22 --action-type 21
bytedcli safe starfish trace --object-id example_obj@1 --user-id sample-user-id --is-audience --has-review --is-punish
bytedcli safe starfish trace --object-id example_obj@1 --start "2h ago" --end now
bytedcli safe starfish trace --object-id example_obj@1 --detail
bytedcli --json safe starfish trace --object-id example_obj@1 --page-size 5
```

| Option                 | Default    | Description                                                       |
| ---------------------- | ---------- | ----------------------------------------------------------------- |
| `--object-id <id>`     | (required) | Object ID, e.g. `example_obj@1`                                   |
| `--room-id <id>`       | —          | Live room ID filter                                               |
| `--task-type <n...>`   | —          | Task type filter (repeatable)                                     |
| `--object-type <n...>` | —          | Object type filter (repeatable, e.g. `--object-type 2 --object-type 3`) |
| `--action-type <n...>` | —          | Action type filter (repeatable, e.g. `--action-type 22 --action-type 21`) |
| `--user-id <id>`       | —          | User ID filter                                                    |
| `--is-audience`        | off        | Only spans where the target is an audience member                |
| `--has-review`         | off        | Only spans that have been reviewed                               |
| `--is-punish`          | off        | Only spans that resulted in a punishment                         |
| `--start <start>`      | —          | Start time (Unix seconds, date string, or relative like `2h ago`). Must be provided together with `--end`. |
| `--end <end>`          | —          | End time (same format as `--start`). Must be provided together with `--start` (e.g. `--start "2h ago" --end now`). |
| `--page <n>`           | `1`        | Page number                                                       |
| `--page-size <n>`      | `20`       | Page size                                                         |
| `--detail`             | off        | Text mode: print every `show_fields` / `tags` / `origin_value` per span without truncation. JSON mode is unaffected. |
| `--cookie <cookie>`    | —          | Override cookie header for this request                           |

The multi-select filters (`--task-type` / `--object-type` / `--action-type`) and the checkbox flags (`--is-audience` / `--has-review` / `--is-punish`) map to the corresponding `search_params` entries; checkbox flags are only sent when enabled, and empty multi-selects are omitted entirely.

Output:

- Default text mode renders a compact span table (`TIME / KEY / TITLE / TAGS / DETAILS`); the `DETAILS` column shows the first two `show_fields` truncated to ~48 chars to keep the table narrow.
- `--detail` switches to a per-span vertical block that lists every `show_fields` entry (with `notes`), the full tag list and the raw `origin_value`. Recommended when you need to read all moderation context without `--json`.
- JSON mode always returns the full `item_list` with `span_list`, `show_fields`, `tags` and `origin_value`.

### condition list

List the selectable Starfish review search condition options via `GET /starfish/api/review/trace/get_search_conditions`. Returns three multi-select groups — `task_type` (任务类型), `object_type` (片段类型) and `action_type` (操作类型). This is a standalone lookup: it does not require an `object_id` or any `trace` query. It is also handy for discovering valid `--task-type` / `--object-type` / `--action-type` values when you do want to filter a `trace` search.

```bash
bytedcli safe starfish condition list
bytedcli safe starfish condition list --type object_type
bytedcli safe starfish condition list --type task_type --type action_type
bytedcli --json safe starfish condition list --type object_type
```

| Option              | Default      | Description                                                                                  |
| ------------------- | ------------ | -------------------------------------------------------------------------------------------- |
| `--type <field...>` | all three    | Restrict to specific filter field(s). Repeatable. Choices: `task_type`, `object_type`, `action_type`. Omit to return all three groups. |
| `--cookie <cookie>` | —            | Override cookie header for this request                                                       |

With no `--type`, all three groups are returned; pass `--type` (repeatable) to return only the requested groups. Invalid `--type` values are rejected with the allowed list. Text mode prints each group as a `VALUE / LABEL` table; JSON mode returns `{ groups: [{ field, label, tips, items: [{ value, label }] }] }`. Option `value`s are always normalized to strings.

### task-type list

Inspect the review task type catalog via the BFF endpoint `POST /starfish/api/bff/webcast/review/config/QueryReviewTaskTypeList`.

```bash
bytedcli safe starfish task-type list
bytedcli safe starfish task-type list --status 1 --page-size 50
bytedcli safe starfish task-type list --task-type 203
bytedcli --json safe starfish task-type list --page 2 --page-size 100
```

| Option              | Default | Description                                                 |
| ------------------- | ------- | ----------------------------------------------------------- |
| `--page <n>`        | `1`     | Page number                                                 |
| `--page-size <n>`   | `20`    | Items per page                                              |
| `--status <n>`      | `0`     | `0` = no filter, `1` = active, `2` = deprecated             |
| `--source <n>`      | `0`     | `0` = no filter, `1` = starfish-managed                     |
| `--task-type <n>`   | —       | Hint TaskType filter (server-side filtering not fully verified; double-check with list output) |
| `--pack-level <n>`  | `2`     | PackLevel passed to BFF (matches console UI)                |

Text mode prints `TASK_TYPE / ID / NAME / POSITION / CATEGORY / PRIORITY / STATUS / OPERATOR` columns and a `Matched N task type(s)` summary. JSON mode returns `{ total, item_list[] }`.

### task-type max

Resolve the largest `TaskType` value with two paged calls.

```bash
bytedcli safe starfish task-type max
bytedcli safe starfish task-type max --status 1
bytedcli --json safe starfish task-type max
```

Text mode prints `Scanned N task type(s); largest TaskType is X.` and the matching row. JSON mode returns `{ total, max_task_type, item }`; both `max_task_type` and `item` are `null` when the filter matches no rows.

### task-type save

Create or update a review task type via `POST /starfish/api/bff/webcast/review/config/SaveReviewTaskType`. **This is a write operation** that mutates the production catalog.

```bash
bytedcli safe starfish task-type save --task-type 99995 --name demo-task --position demo_position_99995
bytedcli safe starfish task-type save --task-type 99996 --name demo --position demo_position --operator another.user
bytedcli --json safe starfish task-type save --task-type 99997 --name demo --position demo_position
```

Required: `--task-type`, `--name`, `--position`. Defaults can be overridden:

| Field          | Default     | Option            |
| -------------- | ----------- | ----------------- |
| `Operator`     | `agent-op`  | `--operator`      |
| `Priority`     | `0`         | `--priority`      |
| `TaskCategory` | `20`        | `--task-category` |
| `Source`       | `1`         | `--source`        |
| `Status`       | `1`         | `--status`        |

> Run `bytedcli safe starfish task-type list --task-type <n>` (or `task-type max`) first to confirm whether you would overwrite an existing entry. Pass `--operator <real-user>` if the backend rejects the placeholder `agent-op` value.

JSON mode returns `{ id: <string|null>, task_type: <number|null> }`; `id` is always returned as a string to preserve 19-digit precision.

### play-event list / get / config / list-operators

Inspect Starfish play events via `/starfish/api/review/general_manage/*`. `--env online` (default) hits `webcast.bytedance.net` (`x-businessid=3`, `x-businesskey=review`); `--env boe` hits `testboe-webcast.bytedance.net` (`x-businessid=11`, `x-businesskey=test_001`) and additionally needs the `boe_sid_starfish` cookie supplied via `--cookie` or `STARFISH_COOKIE` (the bootstrap inside `safe login` does not issue it).

```bash
bytedcli safe starfish play-event list
bytedcli safe starfish play-event list --page 1 --page-size 50 --creator demo-user
bytedcli safe starfish play-event list --event demo_event --keyword demo
bytedcli safe starfish play-event get --event-id 7000000000000000000
bytedcli safe starfish play-event config --event-id 7000000000000000000
bytedcli safe starfish play-event list-operators
bytedcli safe starfish play-event list --env boe --cookie "boe_sid_starfish=...; sid_starfish=..."
```

`play-event list` returns a `total` count that reflects the un-filtered population — an empty `items` array with non-zero `total` typically means your filter matched zero rows, not that authentication failed.

`play-event config` resolves `operator_id` / `operator_param_id` to readable `operator_name` / `param_name` / `param_desc` by parallel-fetching the operator catalog (`play-event list-operators`). The catalog fetch degrades gracefully to the raw IDs when it fails.

### play-event create

```bash
bytedcli safe starfish play-event create --name demo --event demo_key --desc 'demo desc' --callback-psm a.b.c
bytedcli safe starfish play-event create --env boe --name demo --event demo_key --desc 'demo desc' --callback-psm a.b.c
bytedcli safe starfish play-event create --name demo --event demo_key --desc 'demo desc' --callback-psm a.b.c --yes
```

This is a write operation. Default behavior shows a y/N confirmation; pass `--yes` to skip. JSON mode (`--json`) and non-TTY contexts skip the prompt automatically.

## Notes

- BFF responses can return 19-digit integer IDs; the CLI quotes large integer tokens before parsing so `id` fields are returned as strings in both text and JSON output.
- `task-type save` only supports upsert semantics — no `delete` command exists today; the catalog has no documented hard-delete endpoint.
- `play-event` requests share the same webcast cookie as `trace` and `task-type`, but use distinct fixed headers (separate `Origin/Referer/x-businessid/x-businesskey`); GET endpoints intentionally omit `Content-Type: application/json` because the backend silently returns empty `events` otherwise.

## References

- [invocation.md](../invocation.md)
- [troubleshooting.md](../troubleshooting.md)
