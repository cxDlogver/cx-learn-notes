# Workflow Operations

This document is the operational runbook for `bytedcli aicolate workflow`.
Use it for end-to-end workflow execution: inspect, edit, explain, debug, and
lifecycle operations.

## Command surface

Read and inspect:

```bash
bytedcli aicolate workflow list --space <spaceId>
bytedcli aicolate workflow list --space <spaceId> --keyword <keyword> --mine
bytedcli aicolate workflow list --space <spaceId> --workflow-id <wfIdOrUrl>
bytedcli aicolate workflow get --id <wfIdOrUrl> --space <spaceId>
bytedcli aicolate workflow export --id <wfIdOrUrl> --space <spaceId> --schema
bytedcli aicolate workflow summary get --id <wfIdOrUrl> --space <spaceId>
bytedcli aicolate workflow node-types --space <spaceId>
```

Edit and persist:

```bash
bytedcli aicolate workflow apply --id <wfIdOrUrl> --space <spaceId> --ops-file ops.json --dry-run
bytedcli aicolate workflow apply --id <wfIdOrUrl> --space <spaceId> --ops-file ops.json --save
bytedcli aicolate workflow apply --id <wfIdOrUrl> --space <spaceId> --ops-file ops.json --dry-run --save
bytedcli aicolate workflow apply --id <wfIdOrUrl> --space <spaceId> --schema-file dag.json --dry-run
```

`ops.json` is a local file path provided by the user. The `references/` docs in
this skill are shape references, not runtime file paths consumed by the command.

Execute and debug:

```bash
bytedcli aicolate workflow run --id <wfIdOrUrl> --space <spaceId> --input '{"k":"v"}'
bytedcli aicolate workflow run --id <wfIdOrUrl> --space <spaceId> --input '{"k":"v"}' --no-wait
bytedcli aicolate workflow batch run --id <wfIdOrUrl> --space <spaceId> --input-file inputs.jsonl
bytedcli aicolate workflow instance list --space <spaceId>
bytedcli aicolate workflow task list --job-id <jobId> --space <spaceId>
bytedcli aicolate workflow execution get --id <wfIdOrUrl> --space <spaceId> --execute-id <executeId>
bytedcli aicolate workflow log get --id <wfIdOrUrl> --execute-id <executeId>
bytedcli aicolate workflow execution retry --id <wfIdOrUrl> --space <spaceId> --execute-id <executeId> --event-id <eventId> --data-json '{"key":"value"}'
```

Lifecycle:

```bash
bytedcli aicolate workflow create --space <spaceId> --name <name> --desc <desc>
bytedcli aicolate workflow duplicate create --id <wfIdOrUrl> --space <spaceId>
bytedcli aicolate workflow publish --id <wfIdOrUrl> --space <spaceId>
bytedcli aicolate workflow delete --id <wfIdOrUrl> --space <spaceId> --yes
```

## Workflow URL target resolution

For workflow commands using `--id`, both raw id and page URL are supported:

```text
https://aicolate.tiktok-row.net/agent/work_flow?workflow_id=<wfId>&space_id=<spaceId>
```

Rules:

- If `--id` is a URL and `--space` is omitted, URL `space_id` is used.
- If URL `space_id` and explicit `--space` both exist, explicit `--space` wins.
- For raw workflow id, `--space` is required on space-scoped commands.
- For `workflow list` with repeatable `--workflow-id`, all URL ids must resolve to one
  space when `--space` is omitted.
- Fuzzy workflow-name filtering uses `--keyword`; creator filtering uses `--mine`.

Backend passthrough numeric filters use explicit suffixes so the CLI surface is
honest about raw enum values:

- `workflow list`: `--type-code`, `--status-code`, `--order-by-code`, `--flow-mode-code`, `--schema-type-code`, `--checker-id`, `--bind-biz-type-code`
- `workflow instance list`: `--status-code`, `--order-by-code`, `--job-entity-type-code`
- `workflow task list`: `--status-code`, `--order-by-code`

Known code values (from workflow IDL enums):

- `--status-code` for `workflow list` (`WorkFlowListStatus`):
  - `1`: unpublished
  - `2`: published
- `--order-by-code` (`OrderBy`):
  - `0`: create_time
  - `1`: update_time
  - `2`: publish_time
  - `3`: hot
  - `4`: id
- `--flow-mode-code` (`WorkflowMode`):
  - `0`: workflow
  - `1`: imageflow
  - `2`: sceneflow
  - `3`: chatflow
  - `100`: all (query-only)
- `--schema-type-code` (`SchemaType`):
  - `0`: dag (legacy)
  - `1`: fdl
  - `2`: blockwise (legacy)
- `--checker-id` (`CheckType`):
  - `1`: web_sdk_publish
  - `2`: social_publish
  - `3`: bot_agent
  - `4`: bot_social_publish
  - `5`: bot_web_sdk_publish
- `--bind-biz-type-code` (`BindBizType`):
  - `1`: agent
  - `2`: scene
  - `3`: douyin_bot
- `--status-code` for `workflow instance list` / `workflow task list` (`WorkflowBatchStatus`):
  - `0`: pending
  - `1`: queuing
  - `2`: running
  - `3`: success
  - `4`: fail
  - `5`: canceled
  - `6`: expired
- `--job-entity-type-code` (`WorkflowJobEntityType`):
  - `0`: workflow

## Apply behavior and safety contract

`workflow apply` accepts exactly one input source:

- `--ops-file`: structured ops mutation.
- `--schema-file`: full schema replacement.

Behavior:

- Default (`no --save`) is preview-only.
- `--dry-run` prints diff and does not save by itself.
- `--save` persists schema through `workflow_api/save`.
- `--save` without `--dry-run` skips the full diff preview and returns a
  `diff` marker reminding to add `--dry-run` when you want a preview.
- `--dry-run --save` is valid and runs preview first, then save.
- No-op mutation reports no schema changes and skips unnecessary save.

Safety:

- Always start with dry-run before save.
- Use `--schema-file` only when full replacement is intentional.
- For schema internals and End-node mapping constraints, read
  `workflow-schema.md`.

## Durable debugging chain

Use `instance list -> task list -> execution get` for stable identifiers and node-level state.

- `instance list` returns async jobs and high-level status.
- `task list` resolves `task_id`, `execute_id`, and `log_id` under one job.
- `execution get` returns node-level execution details and supports deeper filters:
  `--sub-execute-id`, `--need-async`, `--log-id`, `--node-id`.

`log get` wraps `workflow_api/get_trace`. If logs are empty but UI Trace console
has rows, use the page Trace console as fallback observability.

`execution retry` is a state-changing operation:

- `--event-id` must be a numeric id string from an actual interrupted event.
- Placeholder values (for example `demo-event-id`) fail backend id parsing.
- Require explicit approval before running resume.

## Lifecycle safety

- `create` and `copy` create durable objects; verify with `get` or `export`.
- `publish` is externally visible; require explicit user intent.
- `delete` is irreversible and should never be default behavior.
