# Safe Disposal — Platforms, Scenes, Features, And Abilities

Query platform type, scene, feature, and action-reference metadata from the Safe disposal center, copy an existing feature or action reference into a publish ticket, create request-backed or puzzle-backed feature publish tickets, and create new action-reference publish tickets.

## Commands

```bash
bytedcli safe disposal platform list [--tenant <tenant>]
bytedcli safe disposal scene list --platform-type <n> [--tenant <tenant>]
bytedcli safe disposal feature list --platform-type <n> --scene-id <n> [--keyword <text>] [--tenant <tenant>]
bytedcli safe disposal feature explain-inputs --platform-type <n> --scene-id <n> --feature-key <key> [--tenant <tenant>]
bytedcli safe disposal feature test --platform-type <n> --scene-id <n> --feature-key <key> [--parameters <json>] [--extra <json>] [--target-id <id>] [--target-type <n>] [--tenant <tenant>]
bytedcli safe disposal ability list --platform-type <n> --scene-id <n> [--keyword <text>] [--tenant <tenant>]
bytedcli safe disposal ability create --explain-inputs --action-key <key> --platform-type <n> --scene-id <n> [--tenant <tenant>]
bytedcli safe disposal ability create --action-key <key> --platform-type <n> --scene-id <n> --target-type <n> --alias <text> --desc <text> --object-source-feature-key <feature-key> [--feature-param <ActionParamKey=feature-key> ...] [--config-param <json|@file.json> ...] [--constant-param <ActionParamKey=Value> ...] [--param-required <ActionParamKey=true|false> ...] [--punish-node-type <n> ...] [--machine-audit-scene <code> ...] [--reason <text>] [--dry-run] [--yes] [--guard-token <token>] [--tenant <tenant>]
bytedcli safe disposal action search --keyword <text> [--status <status>] [--page <n>] [--page-size <n>]
bytedcli safe disposal action get --action-key <key> [--status <status>]
bytedcli safe disposal feature create-request --feature-key <key> --feature-name <name> --feature-desc <text> --value-type <type> --platform-type <n> --scene-id <n> --req-path <path> [--reason <text>] [--dry-run] [--yes] [--guard-token <token>] [--tenant <tenant>]
bytedcli safe disposal feature create-puzzle --feature-key <key> --feature-name <name> --feature-desc <text> --value-type <type> --platform-type <n> --scene-id <n> --tenant <tenant> --pkg-code <code> --puzzle-feature-key <key> --item-code <code> --pkg-param <key=value> [--pkg-param <key=value> ...] [--reason <text>] [--dry-run] [--yes] [--guard-token <token>]
bytedcli safe disposal feature copy --from-platform-type <n> --from-scene-id <n> --to-platform-type <n> --to-scene-id <n> --feature-key <key> [--tenant <tenant>]
bytedcli safe disposal ability copy --from-platform-type <n> --from-scene-id <n> --to-platform-type <n> --to-scene-id <n> --action-register-key <key> [--tenant <tenant>]
```

## Examples

```bash
bytedcli safe disposal platform list

bytedcli --json safe disposal platform list

bytedcli safe disposal scene list --platform-type 1

bytedcli --json safe disposal scene list --platform-type 1

bytedcli safe disposal feature list --platform-type 1 --scene-id 2

bytedcli safe disposal feature list \
  --platform-type 1 \
  --scene-id 2 \
  --keyword target_id

bytedcli --json safe disposal feature list \
  --platform-type 1 \
  --scene-id 2 \
  --keyword target_id

bytedcli safe disposal feature explain-inputs \
  --platform-type 1 \
  --scene-id 13 \
  --feature-key sample_puzzle_feature

bytedcli --json safe disposal feature explain-inputs \
  --platform-type 1 \
  --scene-id 13 \
  --feature-key sample_puzzle_feature

bytedcli safe disposal feature test \
  --platform-type 1 \
  --scene-id 13 \
  --feature-key sample_puzzle_feature \
  --parameters '{"live_id":"sample_live_id","room_id":"sample_room_id"}'

bytedcli --json safe disposal feature test \
  --platform-type 1 \
  --scene-id 13 \
  --feature-key sample_puzzle_feature \
  --parameters '{"live_id":"sample_live_id","room_id":"sample_room_id"}' \
  --extra '{}'

bytedcli safe disposal ability list \
  --platform-type 1 \
  --scene-id 2 \
  --keyword demo_action

bytedcli --json safe disposal ability list \
  --platform-type 1 \
  --scene-id 2 \
  --keyword demo_action

bytedcli --json safe disposal ability create \
  --explain-inputs \
  --action-key sample_action \
  --platform-type 1 \
  --scene-id 2

bytedcli --json safe disposal ability create \
  --action-key sample_action \
  --platform-type 1 \
  --scene-id 2 \
  --target-type 1 \
  --alias "Sample Action Reference" \
  --desc "Sample action reference description" \
  --object-source-feature-key target_id \
  --feature-param 'room_id=room_id' \
  --constant-param 'is_audience=0' \
  --guard-token <guard-token-from-agent-guidance> \
  --dry-run

bytedcli safe disposal action search \
  --keyword "Demo Action"

bytedcli safe disposal action get \
  --action-key demo_action

bytedcli --json safe disposal action get \
  --action-key demo_action \
  --status online

bytedcli safe disposal feature create-request \
  --feature-key sample_request_feature \
  --feature-name "Sample Request Feature" \
  --feature-desc "Sample request feature description" \
  --value-type int \
  --platform-type 1 \
  --scene-id 2 \
  --req-path '["Extra","sample_request_feature"]' \
  --guard-token <guard-token-from-agent-guidance> \
  --dry-run

bytedcli --json safe disposal feature create-request \
  --feature-key sample_request_feature \
  --feature-name "Sample Request Feature" \
  --feature-desc "Sample request feature description" \
  --value-type int \
  --platform-type 1 \
  --scene-id 2 \
  --req-path Extra.sample_request_feature \
  --reason "Create sample request feature" \
  --guard-token <guard-token-from-agent-guidance> \
  --yes

bytedcli safe disposal feature create-puzzle \
  --feature-key sample_puzzle_feature \
  --feature-name "Sample Puzzle Feature" \
  --feature-desc "Sample puzzle feature description" \
  --value-type bool \
  --platform-type 1 \
  --scene-id 2 \
  --tenant sample-tenant \
  --pkg-code sample-package \
  --puzzle-feature-key sample_puzzle_key \
  --item-code sample_item \
  --pkg-param sample_input=sample_feature \
  --guard-token <guard-token-from-agent-guidance> \
  --dry-run

bytedcli --json safe disposal feature create-puzzle \
  --feature-key sample_puzzle_feature \
  --feature-name "Sample Puzzle Feature" \
  --feature-desc "Sample puzzle feature description" \
  --value-type bool \
  --platform-type 1 \
  --scene-id 2 \
  --tenant sample-tenant \
  --pkg-code sample-package \
  --puzzle-feature-key sample_puzzle_key \
  --item-code sample_item \
  --pkg-param sample_input=sample_feature \
  --reason "Create sample puzzle feature" \
  --guard-token <guard-token-from-agent-guidance> \
  --yes

bytedcli safe disposal feature copy \
  --from-platform-type 1 \
  --from-scene-id 2 \
  --to-platform-type 1 \
  --to-scene-id 13 \
  --feature-key demo_feature

bytedcli --json safe disposal feature copy \
  --from-platform-type 1 \
  --from-scene-id 2 \
  --to-platform-type 1 \
  --to-scene-id 13 \
  --feature-key demo_feature

bytedcli safe disposal ability copy \
  --from-platform-type 1 \
  --from-scene-id 2 \
  --to-platform-type 1 \
  --to-scene-id 13 \
  --action-register-key demo_action-1-2-3

bytedcli --json safe disposal ability copy \
  --from-platform-type 1 \
  --from-scene-id 2 \
  --to-platform-type 1 \
  --to-scene-id 13 \
  --action-register-key demo_action-1-2-3
```

## Options

- `--platform-type <n>` — `PlatformTypeEnum`, the industry or content-type enum for scene, feature, and ability list queries.
- `--scene-id <n>` — `SceneIdEnum`, the scene or business-category enum for feature and ability list queries.
- `--keyword <text>` — Optional fuzzy search keyword. Feature list maps this to `SearchKey`; ability list and action search map this to `search_key`.
- `--action-key <key>` — Exact disposal action key for `action get`. This is different from `--action-register-key`: `action get` reads global action metadata, while `ability copy` works on scoped action references.
- `--status <status>` — Optional action list status for `action search` and `action get`; defaults to `online`. Supported upstream values are usually `online`, `offline`, and `draft`.
- `--feature-key <key>` — Feature key selector. For list/copy/explain/test flows it is the target or exact existing feature key; for create commands it is the new feature key. `explain-inputs` starts from this key and recursively follows only supported dependencies.
- `--parameters <json>` / `--extra <json>` — JSON object strings for `feature test`. The CLI validates them as JSON objects and passes the original text into `Req.Parameters` / `Req.Extra`; this preserves large numeric IDs in the request body.
- `--target-id <id>` / `--target-type <n>` / `--tag-id <id>` / `--operator <name>` / `--punish-ticket-id <id>` — Optional `Req` fields for `feature test`. `--tag-id` can repeat or use comma-separated values.
- `--context-tag-id <id>` / `--context-rule-id <id>` / `--context-rule-tag-id <id>` — Optional `Context` fields for `feature test`. `--context-rule-tag-id` can repeat or use comma-separated values.
- `--feature-name <name>` / `--feature-desc <text>` — New feature metadata for create commands. `--feature-desc` is required for feature creation and should describe the business meaning of the feature. The upstream API does not strictly reject an empty description, but the CLI/Agent must still require it because publish tickets and feature lists are read by humans; an empty description makes the feature confusing to review and maintain.
- `--value-type <type>` — Feature value type enum for create commands. For `feature create-puzzle`, the Agent should derive this from the selected Puzzle feature option when possible, then pass the final value to the CLI.
- `--req-path <path>` — Required for `feature create-request`. This becomes `access_param.from_req_param`; pass a JSON array such as `["Extra","sample_request_feature"]` or a dot path such as `Extra.sample_request_feature`.
- `--pkg-code <code>` / `--puzzle-feature-key <key>` / `--item-code <code>` — Required for `feature create-puzzle`; these should be selected by the Agent after querying Puzzle package and feature candidates.
- `--pkg-param <key=value>` — Repeatable binding for `feature create-puzzle`. Left side is the Puzzle input param key; right side is the disposal feature key to bind.
- `--reason <text>` — Optional approval reason for create commands.
- `--dry-run` — Print the final feature payload without creating an approval ticket.
- `--yes` — Required for create commands when actually creating an approval ticket.
- `--guard-token <token>` — Required for `feature create-request` and `feature create-puzzle` dry-run or real ticket creation. Agents must read this full guide and follow `Agent Guidance` before using it; the token is documented in the `Agent Guidance` section and must not be guessed.
- `--from-platform-type <n>` / `--from-scene-id <n>` — Source scope for `feature copy` and `ability copy`.
- `--to-platform-type <n>` / `--to-scene-id <n>` — Target scope for `feature copy` and `ability copy`.
- `--action-register-key <key>` — Exact source action reference key for `ability copy`. Action register keys are globally unique, and `ability copy` requires this key instead of `action_key`.
- `--tenant <tenant>` — Tenant for Safe API requests on commands that expose it. For `feature create-puzzle`, this option is required because Puzzle feature creation requires a tenant value; it authenticates the Safe request tenant and is also written to `access_param.puzzle_param.tenant` as the Puzzle tenant code.

## Output

- `platform list` text mode renders platform type, name, raw value, and extra metadata.
- `scene list` text mode renders platform type, scene ID, name, raw value, and extra metadata.
- Text mode renders a table with feature ID, key, name, value type, status, usage type, access type, version, and operator.
- `ability list` text mode renders a table with action reference ID, action key, alias, scope, target type, status, and operator.
- `action search` text mode renders candidate action key, name, status, managers, object type, severity, and PSM.
- `action search` JSON mode returns `{ "keyword": string, "status": string, "page": number, "page_size": number, "total": number, "source": "action_with_draft", "list": [...] }`.
- `action get` text mode renders action key, name, status, description, object type, severity, PSM, cluster, managers, custom display params, and before/after preview picture URLs.
- `action get` JSON mode returns `{ "action_key": string, "status": string, "manager": string[], "action": {...} | null, "draft": {...} | null, "display_info": {...} | null, "param_list": [...], "before_effective_pictures": [...], "after_effective_pictures": [...], "sources": {...} }`.
- JSON mode returns `{ "total": number, "list": [...] }`. Platform and scene list items include normalized IDs plus upstream raw enum metadata; feature and ability list items preserve upstream fields.
- Use `ability list --json` when action-reference copy or inspection workflows need full param/object source details.
- `feature explain-inputs` text mode renders the required request inputs or an unsupported reason.
- `feature explain-inputs` JSON mode returns `{ "supported": boolean, "required_inputs": [...], "parameters_template": {...}, "extra_template": {...}, "request_template": {...}, "dependency_graph": [...] }`. If unsupported, it also includes `unsupported_feature_key`, `unsupported_access_type`, `unsupported_reason`, and `resolved_chains`.
- `feature test` text mode renders whether the feature fetch is OK, the backend `ErrorInfo`, the returned `Result`, and the request that was sent.
- `feature test` JSON mode returns `{ "ok": boolean, "result": string, "error_info": string, "parsed_result": any, "request": {...} }`. `parsed_result` is `null` when `result` is blank or not valid JSON.
- `feature copy` text mode renders the publish ticket ID and URL.
- `feature copy` JSON mode returns `{ "id": string, "url": string, "feature": {...} }`.
- `feature create-request` text mode renders the approval ticket ID and URL, or a dry-run payload summary.
- `feature create-request` JSON mode returns `{ "id": string | null, "url": string | null, "dryRun": boolean, "feature": {...} }`.
- `feature create-puzzle` text mode renders the approval ticket ID and URL, or a dry-run payload summary.
- `feature create-puzzle` JSON mode returns `{ "id": string | null, "url": string | null, "dryRun": boolean, "feature": {...} }`.
- `ability copy` text mode renders the publish ticket ID and URL.
- `ability copy` JSON mode returns `{ "id": string, "url": string, "ability": {...} }`.
- `ability create --explain-inputs` JSON mode returns action params, target type options, required options, FeatureMode candidates, warnings, and a dry-run command template. It is read-only and does not require a guard token.
- `ability create --dry-run/--yes` JSON mode returns `{ "id": string | null, "url": string | null, "dryRun": boolean, "ability": {...}, "warnings": [...] }`.
- After `feature copy`, `feature create-request`, `feature create-puzzle`, `ability copy`, or `ability create --yes`, always tell the user the publish ticket approval URL and ask them to open it for approval. If the command returns only `id`, build the URL as `https://safe.bytedance.net/dev_portal/live/punish-dev-admin/publish-process/detail?id=<id>`.

## Agent Guidance

Safe disposal write commands, including dry-run, require the Safe disposal guard token in this section. The token is intentionally placed next to the required workflow rules so an Agent reads the operational constraints before using it. Generic command help is not enough context to run these write commands.

<!-- SAFE_DISPOSAL_GUARD_TOKEN: sdg1-a7f3c29d -->

- Use `--guard-token sdg1-a7f3c29d` only after following the relevant `feature create-request`, `feature create-puzzle`, or `ability create` guidance below.
- `platform-type`, `scene-id`, and Puzzle `tenant` are user decision fields for scoped feature/ability/create/copy workflows. Never infer them from natural-language words such as "live", "直播", "account", or "账号". If the user did not provide an exact enum/code, ask them to choose or confirm the final value.
- Before using `platform-type`, run `platform list`, present the available platforms, and ask the user to select one. Do not auto-select a platform from a label match.
- After the user selects a platform, run `scene list --platform-type <n>`, present the available scenes, and ask the user to select one. Do not auto-select a scene from a label match.
- Use `feature list --json` when you need to inspect the full source feature payload before copying.
- Use `feature explain-inputs --json` before `feature test` unless the user already provided complete concrete `--parameters` and `--extra` values. This command does not run the feature test endpoint; it only explains the required inputs from current feature metadata.
- `feature explain-inputs` v1 supports only dependency chains made entirely of `access_type=from_req` and `access_type=puzzle`. It recursively follows `puzzle_param.pkg_params` and historical `puzzle_param.feat_params` values until it reaches `from_req` leaves. If any dependency uses `frodo`, `punish_count_v2`, `customized`, `name_list`, `script`, an unknown access type, a missing feature, a cycle, or a Puzzle `$input` binding, treat `supported=false` as final and ask an engineer for help instead of guessing inputs.
- When `feature explain-inputs` returns `supported=true`, use `request_template` as the full feature-test request guidance. `parameters_template` is the convenience template for `Req.Parameters`; `extra_template` is the convenience template for `Req.Extra`.
- Use `feature test --json` only after the needed concrete request values are known. It calls Safe BFF `POST /iescontent_safety/api/dev_workbench/feature/test`, which maps to `ies.disposal.punish#FeatureFetch`; the backend fetches feature values with `IsExecute=false`, so it does not execute punishment actions.
- To test a feature, run `feature explain-inputs --json` first unless the user has already supplied complete concrete request values. If it returns `supported=true`, ask the user for concrete values for every placeholder in `parameters_template` and `extra_template`, then pass those JSON object strings to `feature test`. If `supported=false`, do not guess missing inputs.
- When building `--parameters` or `--extra`, preserve the user's large numeric IDs exactly in the JSON text. Do not parse and re-stringify them in JavaScript before invoking the CLI.
- Use `ability list --json` when you need detailed action-reference metadata, including `param_source` and `object_source`.
- Use `action search --keyword <text> --json` when the user gives an action name, partial key, or fuzzy keyword and needs candidate action keys. This command queries `action/list_action_with_draft` with `search_key`.
- Use `action get --action-key <key> --json` when you need detail for one exact action key: action metadata, display parameters, and before/after preview image URLs. The command combines Safe `action/detail` with `action/list_action_with_draft` and is read-only.
- `action search` and `action get` do not accept `platform_type`; `action/list_action_with_draft` has no platform field in its request model, so action metadata is queried by `search_key` or exact `action_key` plus `status`.
- `action search` and `action get` do not accept `scene_id`; the action metadata endpoints do not bind scene. Use `ability list --platform-type <n> --scene-id <n> --json` when you need scene-scoped action references.
- Do not use `ability list` as a substitute for action metadata image URLs; ability records are scoped action references and do not include the full display picture data.
- For `ability create`, first collect only `platform-type`, `scene-id`, and exact `action-key`. Do not ask for `target-type` before running explain; target type depends on the selected action and Safe enum data.
- Run `bytedcli --json safe disposal ability create --explain-inputs --platform-type <n> --scene-id <n> --action-key <key>` before constructing a create command. This read-only step expands action params, struct fields such as `$#$.base_params.room_id`, target type candidates, current-scene FeatureMode candidates, similar existing references, and required options.
- When discussing `ability create` with a user, do not expose raw option names as the primary concept. Translate them into Safe UI/business terms first:
  - `--target-type` = 处置对象类型: what kind of object the action will punish, such as live comment/user/room. Present the label/value from `target_type_options`, then ask the user to confirm the final ID.
  - `--object-source-feature-key` = 动作对象来源的特征 Key: which disposal feature returns the object ID for the action. In the regular flow, ask only for the 动作对象来源的特征 Key; the CLI writes `object_source.ActionParamKey` with the same value and fills `object_source.ActionParamType` from that feature's `value_type`.
  - `--feature-param`, `--config-param`, and `--constant-param` = 执行参数来源: how each action execution parameter is produced. Explain whether the value comes from a disposal feature, from strategy/operator configuration, or from a fixed constant.
  - `ActionParamKey` = 动作元信息里的参数名, not something the user should invent. Use the keys from explain output; for struct fields preserve paths such as `$#$.base_params.room_id`.
- Treat all `candidate_options` and `confirmation_groups` from `ability create --explain-inputs` as suggestions, not confirmed bindings. For high-confidence FeatureMode groups, ask the user whether to accept all proposed bindings in one question. For medium/low confidence candidates, ask explicitly. Never silently pass a `--feature-param` just because explain found it.
- `--target-type`, `--alias`, `--desc`, and `--object-source-feature-key` must be confirmed by the user before dry-run. Ask in business language: "请选择处置对象类型", "动作引用中文别名/描述怎么写", and "请选择动作对象来源的特征 Key". In the regular object-source flow, only ask for this feature key; the CLI fills `object_source.ActionParamKey` with the same value and `object_source.ActionParamType` from the feature `value_type`. Ask for `--object-source-action-param-key` and `--object-source-action-param-type` only if the user explicitly wants the object to first come from direct `ActionReqParams`.
- For `ability create`, `--feature-param <ActionParamKey=FeatureKey>` uses action metadata keys. If the ActionParamKey contains `$#$`, single-quote the whole option value, for example `--feature-param '$#$.base_params.room_id=room_id'`.
- For every optional action execution parameter from `ability create --explain-inputs`, the Agent must ask the user to explicitly choose one final handling mode: do not configure it, FeatureMode, ConfigMode, or ConstantMode. A generic confirmation such as "use your suggestion" or "looks good" must not be interpreted as "do not configure it" unless the Agent explicitly recommended leaving that exact parameter unconfigured and the user confirmed that recommendation.
- For `ability create`, ConfigMode and ConstantMode are business decisions. Do not treat "use config mode" as enough information to run dry-run. For every ConfigMode parameter, ask the user to confirm the full operator-facing configuration before passing `--config-param`: `action_param_key`, interaction mode, display text, optional default value, optional param description, optional input constraints (`param_suffix`, `min_value`, `max_value`), and whether it remains required when the explain result marks it optional.
- For ConfigMode, supported `interaction_mode` values are `input_single`, `input_multi`, `select_single`, `select_multi`, and `time`. For `select_single`, `select_multi`, and `time`, a complete key/value option list is mandatory; ask for the exact options and do not run dry-run until they are known. For `input_single` and `input_multi`, option lists should normally be omitted. You may recommend values from existing action references or business semantics, but the user must explicitly confirm them.
- If an action execution parameter is `duration`, recommend ConfigMode with `interaction_mode=time` and `optional_values=[{"key":"-1","value":"永久"},{"key":"1","value":"短期"}]`. Explain that these are the operator-facing duration options, then ask the user to confirm this recommendation before passing `--config-param`.
- For ConstantMode, ask for the exact constant value and show it in the pre-dry-run summary. Do not invent constants from the action param name.
- If `ability create --dry-run` fails because a ConfigMode parameter is missing `optional_values`, has an invalid interaction mode, or lacks required config fields, stop and ask for the exact missing ConfigMode fields. Do not silently switch modes or fabricate an option list.
- `CountFeatureMode` is legacy and is not supported by `ability create`. If a user asks for it, reject the create flow and ask an engineer to convert the plan to FeatureMode, ConfigMode, or ConstantMode.
- Before `ability create --dry-run`, show a ready-to-dry-run checklist and ask the user to confirm there are no unresolved choices. The checklist must include platform type, scene ID, action key, target type, alias, desc, action object source feature key, every FeatureMode binding, every ConfigMode field including option lists, every ConstantMode value, and any required/optional overrides.
- For `ability create`, run `--dry-run --json --guard-token <token>` only after all required values are confirmed. After dry-run, show a complete business summary before asking for creation confirmation. The summary must include platform type with label when known, scene ID with label when known, action key, target type with label when known, alias, desc, action object source feature key and inferred `ActionParamType`, every `param_source` row with mode/action parameter key/required flag/action parameter type, FeatureMode `FeatureKey`, ConfigMode `ParamKey`, `Text`, `ParamType`, `InteractionMode`, `DefaultValue`, `OptionalValueList`, `ParamDesc`, `InputConfig`, ConstantMode `ConstantValue`, and warnings exactly as returned (`none` if empty). Do not omit platform or scene even if the user supplied them earlier.
- Only after the user confirms the dry-run summary, run the same `ability create` command with `--yes` instead of `--dry-run`. `ability create --yes` without `--reason` is allowed but discouraged; before `--yes`, ask for an approval reason when the user can provide one, or get explicit confirmation that no reason should be attached.
- For `feature create-request`, confirm `feature-key`, `feature-name`, `feature-desc`, `value-type`, `platform-type`, `scene-id`, and `req-path` with the user before creating. `feature-desc` and `req-path` are business-critical; do not invent them. `feature-desc` is enforced by the CLI for human readability even though the API currently does not validate it. Use `--dry-run --json --guard-token <token>` first when the user wants to review the payload.
- `feature create-request` creates `access_type=from_req`, defaults usage type to both `quantify` and `qualitative`, selects all optional-operator nodes, and fills each node with the frontend default operators for the selected `value-type`.
- For `feature create-request` and `feature create-puzzle` dry-run or real ticket creation, pass the Safe disposal guard token from this `Agent Guidance` section via `--guard-token`. If the CLI says the guard token is missing, stop, re-read this full guide, follow the workflow here, and retry; do not continue from generic `--help` output alone.
- Before starting `feature create-puzzle`, ask whether the requester is an engineering user or an operations user. Use this role only to decide the confirmation style; it does not change the final Safe payload shape.
- For `feature create-puzzle`, split the workflow into discovery and creation. First collect only the requester role and new disposal feature metadata (`feature-key`, `feature-name`, required `feature-desc`). Then resolve user decision fields in order: ask for or confirm the exact Puzzle tenant code, ask the user to choose `platform-type` from `platform list`, then ask the user to choose `scene-id` from `scene list`. Do not ask for `--pkg-code`, `--puzzle-feature-key`, `--item-code`, `--value-type`, `--pkg-param`, or a generic "search keyword" in the first question.
- For `feature create-puzzle`, discover dropdown candidates through bytedcli commands that reuse the regular Safe login state:
  - Tenant candidates, when the user gave a tenant label instead of an exact code: `bytedcli --json safe puzzle tenant list`
  - Package candidates: `bytedcli --json safe puzzle pkg list --tenant <tenant> [--keyword <optional package hint>]`
  - Package detail and package params: `bytedcli --json safe puzzle pkg get --tenant <tenant> --id <selected package id>`
  - Package-bound Puzzle feature candidates: `bytedcli --json safe puzzle pkg list-features --tenant <tenant> --id <selected package id> [--keyword <optional feature hint>]`
  - Puzzle feature detail: `bytedcli --json safe puzzle feature get --tenant <tenant> --id <selected feature id>`
  - Puzzle feature dependencies and package input params: `bytedcli --json safe puzzle feature list-dependencies --tenant <tenant> --id <selected feature id> --collection-code <selected package code> [--instance-code <selected item code>]`
  - Disposal feature binding candidates: `bytedcli --json safe disposal feature list --platform-type <n> --scene-id <n> [--keyword <feature-key-or-name>]`
- The underlying Safe/Puzzle APIs are authenticated, but the authentication source is bytedcli's Safe client. Run `bytedcli auth login --session` and `bytedcli safe login` when login is missing. Do not read bytedcli session files or hand-build curl requests.
- If a required creation argument cannot be uniquely derived from the CLI discovery output, ask the user for the exact final value. Do not invent values.
- Do not run Puzzle package/feature discovery until the exact Puzzle tenant code has been confirmed by the user. For example, do not translate "直播租户" to `live`; ask for the tenant code or show tenant candidates and let the user choose.
- For `feature create-puzzle`, treat `--pkg-code`, `--puzzle-feature-key`, `--item-code`, `--value-type`, and `--pkg-param` as final CLI arguments produced by discovery. Query Puzzle package candidates from the tenant. If the package candidate list is empty, ask for a narrow package or feature hint in plain business language. If more than one package candidate remains, stop and ask the user to choose the package. Do not call `pkg list-features` until exactly one package has been selected or explicitly confirmed by the user. Do not iterate across multiple unconfirmed package candidates to search for features.
- For `feature create-puzzle`, derive the final creation arguments from the selected CLI discovery results: use the selected package `code` as `--pkg-code`, the selected Puzzle feature `code` as `--puzzle-feature-key`, the selected feature's entity/item code (for example `entity_code=room`) as `--item-code`, the selected feature's unique value type as `--value-type`, and package/dependency params as the required left-side keys for repeatable `--pkg-param`. Ignore deprecated `feat_params`. If a required field is missing from the CLI discovery output, ask the user for the final value.
- For `feature create-puzzle`, do not ask the user to manually type `--value-type` when the selected Puzzle feature option exposes a unique feature value type. The Agent should fill `--value-type` for the CLI.
- For engineering users, resolve PkgParams best-effort, run `--dry-run --json --guard-token <token>`, show the final feature payload and all bindings, and ask the engineer to confirm before creating the ticket with `--yes`. Prefer exact `live_id=live_id` and `room_id=room_id`. Treat `target_id` as the current disposal object ID; when a Puzzle param represents a unique entity/object identifier, recommend mapping it to `target_id` when appropriate. For other params, make a reasonable recommendation from the current-scene feature candidates, then rely on the engineer's dry-run confirmation.
- For operations users, do not show raw dry-run payloads or ask them to review low-level CLI parameters. Resolve only business-safe PkgParams automatically, ask business-readable questions when needed, create the approval ticket with `--yes` after the business choices are clear, and return the approval URL directly.
- For operations users, PkgParams binding policy is strict: auto-bind only `live_id=live_id` and `room_id=room_id` when those exact params appear.
- For operations users, recommend binding through `target_id` only when exactly one Puzzle param remains and that value is the unique identifier of the object being disposed. The Puzzle param does not have to be literally named `target_id`; examples include a single `ip` param for an IP-location feature, `comment_id`, `user_id`, or another entity ID. In that case, explain in business language that `target_id` means "the current disposal object ID", propose the concrete mapping such as `ip=target_id`, and ask the operations user to confirm.
- For operations users, if multiple non-auto params remain, or the remaining param is not clearly a unique disposal-object identifier, stop and tell the operations user that this feature contains fields requiring engineering support, then ask them to find an engineer.
- If Puzzle package, Puzzle feature, item code, or param binding has multiple candidates or no safe default, ask the user. Do not guess. The CLI intentionally only accepts final values.
- `feature create-puzzle` also selects all optional-operator nodes and fills each node with the frontend default operators for the selected `value-type`.
- `feature create-puzzle` does not support or submit deprecated `feat_params`.
- Default operator mapping by `value-type`: `int`/`float` use `eq,ne,gt,lt,ge,le,in,not_in,range`; `string` uses `eq,ne,in,not_in`; `bool` uses `eq`; `int_arr`/`string_arr` use `multi_in,multi_not_in,multi_must_eq`. If a value type is outside this mapping, ask for clarification instead of guessing.
- `feature copy` first queries the source feature within `from-platform-type + from-scene-id`, then creates a publish ticket for `to-platform-type + to-scene-id`.
  - Do not modify copied feature fields except the destination `platform_type_enum` and `scene_id_enum`, which must reflect the target scope. Do not submit the source feature `id` when creating the copy ticket.
- `ability copy` first queries the source action reference within `from-platform-type + from-scene-id`, then creates a publish ticket for `to-scene-id`. `from-platform-type` and `to-platform-type` must be identical.
  - Do not copy by `action_key`; one `action_key` can have multiple action references under a platform and scene. Use exact `action_register_key`.
  - Do not submit the source action reference `id` or `action_register_key` when creating the copy ticket; the backend generates both fields.
- After any successful `feature copy`, `feature create-request`, `feature create-puzzle`, `ability copy`, or `ability create --yes`, do not stop at saying the operation succeeded. Extract the returned `url`, or build `https://safe.bytedance.net/dev_portal/live/punish-dev-admin/publish-process/detail?id=<id>` from the returned ticket `id`, then explicitly send that URL to the user and tell them to approve the publish ticket there.

## Authentication

Use the regular Safe login flow before querying:

```bash
bytedcli auth login --session
bytedcli safe login
```

If a Safe cookie is already available:

```bash
bytedcli safe login --cookie "session=xxx"
```
