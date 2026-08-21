---
name: bytedance-aicolate
description: 'Operate the AI Colate platform (Coze + Fornax large-model platform) via bytedcli: sign in (bdsso cookie session), list spaces/tenants, browse AI Application intelligences (agents/apps), knowledge bases, plugins, MCP servers, skills, models, app services, publish connectors and publish records; and fully manage workflows as DAGs — list/get/export/explain the node+edge schema, create/copy/publish workflows, apply schema or ops changes, test-run them, inspect instances/tasks/process/logs, and resume interrupted executions. Use when tasks mention AI Colate / aicolate, Coze on aicolate.tiktok-row.net, AI Application, intelligences/agents/apps, workflow DAG creation or debugging, knowledge bases, plugins, MCP servers, or skills on this platform. Note: an AI Colate "skill" is a backend Skill resource of this platform, not a Claude/Agent skill under the repo''s top-level skills/ directory.'
---

# bytedcli AI Colate (Coze + Fornax large-model platform)

AI Colate (`aicolate.tiktok-row.net`, ROW) is a Coze + Fornax based large-model
platform with three products: **AI Application**, **Model Development**, **Model
Market**. This skill covers the AI Application surface.

## Auth

AI Colate authenticates purely via bdsso CAS cookies (no bearer token). Sign in
once; the session is cached and reused until the cookie expires.

Primary path (recommended): refresh the i18n-tt bytedcli browser session first,
then run `bytedcli aicolate auth login`. The command now prefers this SSO
session bootstrap path and falls back to an interactive browser bootstrap when
needed.

```bash
BYTEDCLI_CLOUD_SITE=i18n-tt bytedcli auth login --session
bytedcli aicolate auth login
```

```bash
bytedcli aicolate auth login      # opens a browser for SSO, caches the cookie session
bytedcli aicolate auth status     # check whether a valid session is cached
bytedcli aicolate auth logout     # clear the cached session
```

If a command reports `AUTH_AICOLATE_SESSION_REQUIRED`, run `bytedcli aicolate auth login`.

## Spaces / Applications

`space_id` (a.k.a. tenant id) scopes almost everything.

```bash
bytedcli aicolate space list                              # list spaces (tenants)
bytedcli aicolate app list --space <spaceId>              # list intelligences (agents/apps)
bytedcli aicolate app get --id <intelligenceId> --type app  # --type agent | app
bytedcli aicolate app publish-records --id <projectId>    # publish history
```

## AI Application resources (space-scoped lists)

```bash
bytedcli aicolate knowledge   list --space <spaceId>   # knowledge bases (datasets)
bytedcli aicolate plugin      list --space <spaceId>   # plugins
bytedcli aicolate mcp         list --space <spaceId>   # MCP servers
bytedcli aicolate skill       list --space <spaceId>   # skills
bytedcli aicolate model       list --space <spaceId>   # models available to the space
bytedcli aicolate app-service list --space <spaceId>   # published app services
bytedcli aicolate connector   list --id <projectId>    # publish connectors of an intelligence
```

## MCP server tools

Fetch an MCP server's tool catalog (`name` + `input_schema` + `description`) — these
are the entries inlined into a workflow Skill node's `mcpList[].tools` when the
workflow calls the MCP. `--psm` mirrors the MCP server metadata (the backend
`source_type`/`transport_mode` enums default to `1`).

```bash
bytedcli aicolate mcp tools --id <mcpServerId> --psm <psm>   # e.g. --psm bytedance.mcp.example_server
```

## Skill lifecycle (create / upload / release)

> Terminology: an **AI Colate "skill"** here is a backend **Skill resource** of the
> AI Application platform (a reusable prompt/tool capability bound into a workflow
> Skill node via `mcpList[]`/`skills[]`). It is NOT a Claude/Agent skill under the
> repo's top-level `skills/` directory — unrelated concepts that share the word.

Beyond `skill list`, a skill can be created and have its content uploaded. The
content is a zip package (with a `SKILL.md`) stored in TOS; `save-data --data-file`
takes a JSON file holding the **base64 of that zip** as a JSON string.

```bash
bytedcli aicolate skill create    --space <spaceId> --name N --desc D [--tags a,b] [--public]   # -> skill_id
bytedcli aicolate skill save-data --space <spaceId> --id <skillId> --data-file zip_b64.json [--config-file cfg.json]
bytedcli aicolate skill release   --space <spaceId> --id <skillId> --env online --version 1.0.0 [--desc D]
bytedcli aicolate skill get       --space <spaceId> --id <skillId> [--version 1.0.0]   # draft when --version omitted
```

A workflow Skill node (type 63) binds a released skill via its `skills[]` and calls
MCP tools via `mcpList[]`. `config` is sent to the backend as a JSON string.

## Workflows (DAG)

Workflow is the deepest and most stateful surface in AI Colate. Keep the entry
skill concise and route workflow tasks to dedicated references.

When a task touches workflow read/modify/debug/lifecycle, read these files in
order before operating:

1. [workflow-operations.md](references/workflow-operations.md)
2. [workflow-schema.md](references/workflow-schema.md)
3. [workflow-debugging.md](references/workflow-debugging.md)

Quick workflow command map:

```bash
# read / inspect
bytedcli aicolate workflow list --space <spaceId>
bytedcli aicolate workflow list --space <spaceId> --keyword <keyword> --mine
bytedcli aicolate workflow list --space <spaceId> --workflow-id <wfIdOrUrl>
bytedcli aicolate workflow get --id <wfIdOrUrl> --space <spaceId>
bytedcli aicolate workflow summary get --id <wfIdOrUrl> --space <spaceId>

# edit
bytedcli aicolate workflow apply --id <wfIdOrUrl> --space <spaceId> --ops-file ops.json --dry-run
bytedcli aicolate workflow apply --id <wfIdOrUrl> --space <spaceId> --ops-file ops.json --save

# debug
bytedcli aicolate workflow run --id <wfIdOrUrl> --space <spaceId> --input '{"k":"v"}'
bytedcli aicolate workflow run --id <wfIdOrUrl> --space <spaceId> --input '{"k":"v"}' --no-wait
bytedcli aicolate workflow batch run --id <wfIdOrUrl> --space <spaceId> --input-file inputs.jsonl
bytedcli aicolate workflow instance list --space <spaceId>
bytedcli aicolate workflow task list --job-id <jobId> --space <spaceId>
bytedcli aicolate workflow execution get --id <wfIdOrUrl> --space <spaceId> --execute-id <executeId>
bytedcli aicolate workflow log get --id <wfIdOrUrl> --execute-id <executeId>
bytedcli aicolate workflow execution retry --id <wfIdOrUrl> --space <spaceId> --execute-id <executeId> --event-id <eventId> --data-json '{"approved":true}'

# lifecycle
bytedcli aicolate workflow create --space <spaceId> --name <name> --desc <desc>
bytedcli aicolate workflow duplicate create --id <wfIdOrUrl> --space <spaceId>
bytedcli aicolate workflow publish --id <wfIdOrUrl> --space <spaceId>
```

`ops.json` is a user-provided local file. If you need a structural reference for
the ops payload shape, use `references/workflow-schema.md` and
`references/workflow-operations.md` as format guides.

## Agent Guidance

- All commands accept `--json` for structured output and are exposed as MCP tools.
- `--region` currently only supports `row` (`aicolate.tiktok-row.net`); other
  regions can be added to `src/api/aicolate/site.ts` as they are confirmed.
- Some endpoints (knowledge, mcp) return results at the top level alongside
  `code` rather than under `data`; the client handles both.
- Write operations (`workflow create/apply/publish/run`) mutate real data —
  confirm intent before running them.
