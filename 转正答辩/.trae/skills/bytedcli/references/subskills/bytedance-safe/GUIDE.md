---
name: bytedance-safe
description: Content moderation router skill for safe domain sub-skills — puzzle workflows, disposal feature/action + copy tickets, sample library, BBQ credential auth, Safe Auth permission/role/resource + risk-label, Hawk scene/ops (via safecli plugin), SafeMind graph lifecycle/test/trace, OCTP entity traces, Ark Send Review feature search/create, EFP feature search/get/create, TCR short-video to Compass long-video matching, TCS/Jimu template, Digital Employee workflows, Safe annotation, Predict, Retrace, Savepoint, Offline Guard, Retrieval, Qianxun, Prism report, KBS/model metadata, and Starfish moderation traces/review task type/play event (玩法注册管理) on webcast.bytedance.net via the safecli plugin. Use for 中文意图：内容安全、实体ID链路、送审、机审、处置、沟通、举报、权限/角色/资源树/成员列表/权限申请/用户权限/风险标签、Hawk 平台、Hawk 场景、Hawk ops（safecli plugin）、Ark 送审平台特征、EFP 生态特征、TCR 短视频长视频匹配、标注、Predict、Retrace、Savepoint、Offline Guard、检索、千寻、举报查询、KBS、模型 PSM、Starfish 审核 trace/object_id/webcast 审核流水/task_type/审核任务类型/QueryReviewTaskTypeList/SaveReviewTaskType/play event/玩法注册.
---

# Safe Domain

Content moderation platform commands for querying features, entities, datasources, tenants, packages, collections, disposal center features/actions, disposal feature/action copy tickets, sample libraries, BBQ app credential tokens, SafeMind graph instances, digital employee graph instances, and more.

## Authentication

Before using any safe command, authenticate first:

```bash
# Interactive login (opens browser for authorization, auto-polls until confirmed)
bytedcli safe login

# Or paste cookie directly
bytedcli safe login --cookie "session=xxx"

# Or set environment variable
export SAFE_COOKIE="your_cookie_here"
```

For agent / non-interactive flows, use the two-step pattern:

```bash
# Step 1: request auth token, returns auth_url + complete_token and exits immediately
# Use --agent-name to identify the calling agent (default: bytedcli)
bytedcli --json safe login --begin --agent-name <your-agent-name>

# Step 2: poll authorization result (status: pending / expired / success)
bytedcli --json safe login --complete <token>
```

The challenge is persisted to `~/.local/share/bytedcli/data/safe_login_challenges/<token>.json` with a 10-minute TTL. The user must open `auth_url` in a browser and confirm authorization. Once confirmed, `--complete` saves the session and reports `login_status: "success"`.

`--begin` JSON output fields (`data`):

| Field | Type | Description |
|-------|------|-------------|
| `login_status` | string | `"pending"` — challenge created, waiting for browser auth |
| `auth_url` | string | URL for the user to open in browser to authorize |
| `complete_token` | string | Token to pass to `--complete` |
| `complete_command` | string | Full CLI command: `bytedcli safe login --complete <token>` |
| `expire_at` | number | Unix timestamp (seconds) when the challenge expires |

`--complete` JSON output fields (`data`):

| Field | Type | Description |
|-------|------|-------------|
| `login_status` | string | `"success"` / `"pending"` / `"expired"` / `"already_logged_in"` |
| `complete_token` | string | (when pending) Token for retry |
| `complete_command` | string | (when pending) Retry command |

In JSON mode, use `safe login --begin` and `safe login --complete <token>` for the non-blocking agent flow; plain `bytedcli --json safe login` is rejected to avoid blocking. If the user already has a valid session, both `safe login` and `safe login --begin` will return `login_status: "already_logged_in"` with `data.user` and `data.starfish_sso` immediately, without triggering a new auth challenge. `--begin` returns `login_status: "pending"` only when no valid session exists. `--complete` returns `login_status` (`success` / `pending` / `expired`); only the confirmed success response includes `data.user` (`null` if user info is unavailable), with `data.user.open_id` populated when the backend returns it. Cookie-only login stores the supplied cookie and does not derive user metadata.

## Configuration

Manage tenant, business, and other Safe settings:

```bash
bytedcli safe config get
bytedcli safe config get --key tenant
bytedcli safe config set --key tenant --value sample_tenant
bytedcli safe config clear --key tenant
```

## Sub-Domain References

每个 sub-domain 都已经合并到本 skill 的 `references/subskills/` 目录。需要某一类操作时再按需加载，不再单独发布 sub-skill。

| Sub-Domain         | Reference                                                          | When to load                                                                                                                                                   |
| ------------------ | ------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| bbq                | [references/subskills/bbq.md](references/subskills/bbq.md)                             | `safe bbq auth login` / `safe bbq group/topic/quota/lag/tos get`，BBQ token 缓存与配额计算                                                                      |
| auth               | [references/subskills/auth.md](references/subskills/auth.md)                           | `safe auth role/resource/user ...`，权限/角色/资源树/成员列表/权限申请/用户权限/风险标签                                                                        |
| puzzle             | [references/subskills/puzzle.md](references/subskills/puzzle.md)                       | Puzzle feature platform — features, entities, datasources, tenants, packages, collections                                                                       |
| annotation         | [references/subskills/annotation.md](references/subskills/annotation.md)               | Safe annotation — dataset group、dataset batch、task、result                                                                                                    |
| disposal           | [references/subskills/disposal.md](references/subskills/disposal.md)                   | Disposal center — feature/action list、test、copy 工单                                                                                                           |
| hawk               | [references/subskills/hawk.md](references/subskills/hawk.md)                           | Hawk 平台 — services/scopes/scenes 元信息与 ops 查询                                                                                                              |
| hawkpro            | [references/subskills/hawkpro.md](references/subskills/hawkpro.md)                     | Hawkpro trace list/get、scene/rule/action 操作                                                                                                                   |
| sample             | [references/subskills/sample.md](references/subskills/sample.md)                       | Sample library — `safe sample list` / `safe sample query_samples` / `safe sample recall` 工作流                                                                   |
| digital-employee   | [references/subskills/digital-employee.md](references/subskills/digital-employee.md)   | Digital Employee — list/agent lookup、graph 验证、模拟、批量 sheet/CSV 任务                                                                                     |
| predict            | [references/subskills/predict.md](references/subskills/predict.md)                     | Safe Predict — scene/ability/dag/draft/test/operator/publish-ticket                                                                                             |
| retrace            | [references/subskills/retrace.md](references/subskills/retrace.md)                     | Safe Retrace — create/get/copy/pause/resume/terminate task and update flow control                                                                               |
| savepoint          | [references/subskills/savepoint.md](references/subskills/savepoint.md)                 | Savepoint emergency — version list、emergency list/deploy/load/unload                                                                                            |
| offline-guard      | [references/subskills/offline-guard.md](references/subskills/offline-guard.md)         | Offline Guard / RIP — recall-task and process-task list/get                                                                                                      |
| retrieval          | [references/subskills/retrieval.md](references/subskills/retrieval.md)                 | Safe Retrieval — search by query/item/image and risk event search                                                                                                |
| qianxun            | [references/subskills/qianxun.md](references/subskills/qianxun.md)                     | Qianxun aggregated item/user detail                                                                                                                              |
| report             | [references/subskills/report.md](references/subskills/report.md)                       | Safe Prism report list and detail lookup                                                                                                                         |
| kbs                | [references/subskills/kbs.md](references/subskills/kbs.md)                             | Safe KBS base detail lookup                                                                                                                                      |
| model-psm          | [references/subskills/model-psm.md](references/subskills/model-psm.md)                 | Safe model PSM metadata list                                                                                                                                     |
| safemind           | [references/subskills/safemind.md](references/subskills/safemind.md)                   | SafeMind — model list、graph 生命周期、test、trace 分析                                                                                                          |
| eva                | [references/subskills/eva.md](references/subskills/eva.md)                             | EVA — model CRUD、feature/prompt 查询、evaluation search/create、scene、time range                                                                                |
| sparkinnovation    | [references/subskills/sparkinnovation.md](references/subskills/sparkinnovation.md)     | SparkInnovation 小改变工作流 — list/get/create/update/claim、业务线/部门、枚举                                                                                  |
| tcs                | [references/subskills/tcs.md](references/subskills/tcs.md)                             | TCS project / trace / plugin task send workflow — get / clone / update-product-type / get-related-project-list / set-shared-project-split / query-object-ids / task get-send-template / task send / task list-send-history / TCS / Jimu template |
| tcs-project-switch | [references/subskills/tcs-project-switch.md](references/subskills/tcs-project-switch.md) | TCS 队列用工模式切换编排 — 主审 → 众包 / 盲审分流 / ProductType 修复                                                                                                |
| octp               | [references/subskills/octp.md](references/subskills/octp.md)                           | OCTP entity trace — 按实体 ID 串联 review、machine-review、disposal、communication、report 链路                                                                  |
| bcp                | [references/subskills/bcp.md](references/subskills/bcp.md)                             | BCP reconciliation key list — 按 rule_id + 结果码查 bcp_key（Aeolus dashboard 263849）                                                                            |
| spider             | [references/subskills/spider.md](references/subskills/spider.md)                       | Spider lineage — 按 biz/tenant/node-type/node-code 查上下游依赖、节点模糊搜索                                                                                    |
| ark                | [references/subskills/ark.md](references/subskills/ark.md)                             | Ark Send Review Platform — feature search（按 content type / feature scene / 子树）与 feature create                                                              |
| efp                | [references/subskills/efp.md](references/subskills/efp.md)                             | Eco Feature Platform — feature search / get / create / update（imis）                                                                                  |
| starfish           | [references/subskills/starfish.md](references/subskills/starfish.md)                   | Starfish 审核平台 (`webcast.bytedance.net`) — `trace` 流水、`task-type list/max/save`、`play-event` 玩法注册管理（list/get/config/create/list-operators） |
| tcr                | [references/subskills/tcr.md](references/subskills/tcr.md)                             | TCR (Toutiao Content Recognition) — `safe tcr get` 短视频 item 与 Compass 长视频实体的匹配查询                                                                  |

> Note: `safe ark`, `safe efp`, `safe tcr`, `safe starfish`, `safe sample recall`, `safe hawk`, `safe annotation`, `safe predict`, `safe retrace`, `safe savepoint`, `safe offline-guard`, `safe retrieval`, `safe qianxun`, `safe report`, `safe kbs`, `safe model-psm`, `safe tcs jimu`, and part of `safe puzzle` / `safe hawkpro` / `safe tcs` / `safe digital-employee` are provided by the safecli plugin (`bytedcli self plugin install --repo ies_safety/safecli`). `safe ark` / `safe efp` / `safe tcr` / `safe tcs jimu` authenticate via the ByteDance SSO web session (`bytedcli auth login --session`), not `safe login` (MPSSO); `safe starfish` reuses the `webcast.bytedance.net` SSO session that `bytedcli safe login` bootstraps (also accepts `STARFISH_COOKIE` / `--cookie`); most other safecli plugin commands reuse Safe cookie/session from `bytedcli safe login` unless a subskill states otherwise. `safe tcs task` should also be used with an active `bytedcli auth login --session`, and the detailed TCS auth / usage notes remain in `references/subskills/tcs.md`. The plugin manifest requires bytedcli `>=0.88.0`.

## Common Options

- `--tenant <tenant>` — Tenant for API requests. Puzzle sub-commands, disposal feature/action queries, digital employee list/agent lookup, graph validation/update/simulation/result queries, digital employee batch simulation tasks, SafeMind queries, and sample queries support this option. Priority: `--tenant` > `SAFE_TENANT` env > config > default `ecology`.
  - Config: `bytedcli safe config set --key tenant --value <tenant>`
- `--business <business>` — Business ID (default: default)
- `--business-id <id>` / `--business-key <key>` — Sample query business headers. Priority: CLI > env (`SAFE_BUSINESS_ID`, `SAFE_BUSINESS_KEY`) > config (`business_id`, `business_key`).

## Digital Employee Quick Examples

```bash
bytedcli safe digital-employee list --name demo --page 1 --page-size 10
bytedcli safe digital-employee list --department-ids demo-department-id --project-ids demo-project-id
bytedcli safe digital-employee agent list --id demo-employee-id --page 1 --page-size 10
bytedcli safe digital-employee agent get --id demo-agent-id
```
