---
name: bytedance-tmates
description: "Operate TMates read-only OpenAPI through bytedcli: check OAuth authorization, list/fetch followed projects, inspect sandbox run summaries, and inspect managed agents and managed-agent spaces. Use for TMates task share URLs, tmates.tiktok-row.net run IDs, MP2C Regression Steward sessions, and debugging TMates sandbox runs without mutating sessions or agent configuration."
---

# bytedcli TMates

This skill covers the first bytedcli TMates OpenAPI draft. The command surface is intentionally read-only:

- `tmates auth check`
- `tmates project list`
- `tmates project get`
- `tmates run get`
- `tmates agent list`
- `tmates agent get`
- `tmates space list`
- `tmates space get`

Session-control and configuration-mutation APIs such as reply, stop, create, update, and archive are not exposed in this draft.

## When to use

Use this skill when the user asks to inspect or debug TMates data:

- TMates task share URLs such as `https://tmates.tiktok-row.net/task/share/<run_id>`
- TMates sandbox run status, messages, toolcalls, or resources
- MP2C Regression Steward managed-agent sessions
- TMates managed agent / managed-agent space lookup
- Checking whether current bytedcli auth can call TMates OpenAPI

## Authentication

TMates OpenAPI uses ByteCloud JWT in `x-jwt-token` plus the OpenAPI header `domain: tiktok_tmates;v1`.

For the TikTok ROW gateway, use the i18n-tt site:

```bash
bytedcli --site i18n-tt auth login
bytedcli --site i18n-tt tmates auth check
```

`--site` and `--json` are global options and must be placed before `tmates`.

## Quick Start

```bash
# Check current user authorization.
bytedcli --site i18n-tt tmates auth check

# List followed TMates projects.
bytedcli --site i18n-tt tmates project list

# Resolve a Codebase repo to a TMates project without creating a missing project.
bytedcli --site i18n-tt tmates project get --repo example-org/example-repo

# Inspect a sandbox run summary.
bytedcli --json --site i18n-tt tmates run get --run-id 38097

# Inspect managed-agent spaces and agents.
bytedcli --site i18n-tt tmates space list
bytedcli --site i18n-tt tmates space get --id 96
bytedcli --site i18n-tt tmates agent list --space-id 96
bytedcli --site i18n-tt tmates agent get --id 878
```

## Output Boundaries

The CLI returns normalized summaries instead of raw TMates payloads:

- Managed agent detail reports prompt length and config key summaries, not the raw system prompt or raw config body.
- Run detail reports bounded previews for prompt, messages, tool inputs, and tool outputs.
- Use `--message-limit`, `--toolcall-limit`, and `--preview-length` to control run summary size.

This keeps routine agent debugging useful while reducing accidental leakage of session content, environment values, or agent configuration secrets.

## Command Notes

### `tmates project get`

`project get` calls the OpenAPI project lookup with `createIfNotExist=false`. It does not create projects.

```bash
bytedcli --json --site i18n-tt tmates project get --repo example-org/example-repo
```

### `tmates run get`

Use the numeric run id from a TMates share URL:

```bash
bytedcli --json --site i18n-tt tmates run get --run-id 38097 --message-limit 5 --toolcall-limit 10
```

The JSON result includes status, managed-agent version identifiers, project/space ids, message/tool/resource counts, recent message previews, recent toolcall previews, resources, and toolcall status counts.

### `tmates agent get`

Use this to inspect a managed-agent summary. It does not expose mutation fields as write operations.

```bash
bytedcli --json --site i18n-tt tmates agent get --id 878
```

## Safety Guidance

- Do not simulate write operations by manually calling OpenAPI endpoints outside this command surface.
- If a user asks to stop/reply/update/archive a TMates run or managed agent, treat it as a separate high-risk feature request and ask for explicit confirmation before adding or using a write path.
- Avoid pasting raw run messages, raw tool output, system prompts, MCP configs, skill configs, env vars, or long-term memory content into chat unless the user explicitly asks and the data has been reviewed.

## References

- `../../invocation.md`
- `../../troubleshooting.md`
