# 去除 buyin-multistar-cli 并改用 alliance-operation-router 取数计划

## Summary

结论：可以改，但当前不能直接无损替换。

`alliance-operation-router` 已经具备自己的登录态和 ECOP 取数能力，入口是 `skills/alliance-operation-router/scripts/alliance-operation.sh`，登录命令是 `auth status/token/login --begin/login --complete`，实际取数由内置 `author-info-summary`、`create-author-task`、`content-video-detail` 运行时完成。因此不需要继续默认依赖全局 `buyin-multistar-cli`。

功能覆盖上，现有 router 已覆盖 `visit-proposal-document-generator` 的大部分作者经营、商品、直播、违规、拜访记录接口；但还缺少若干旧 `multistar-author` atom 直接依赖的动作。若要彻底移除默认 `buyin-multistar-cli`，必须先在 router action inventory 中补齐这些动作，然后把旧 atom 的底层 `ecop_cli.py` 改成 router 适配器。

本计划选择“彻底去默认依赖，不保留静默 fallback 到 `buyin-multistar-cli`”。缺 action 时直接报 `ACTION_NOT_SUPPORTED_BY_ROUTER`，避免用户以为已走新登录态但实际退回旧 CLI。

## Current State Analysis

### 现有 router 能力

- `alliance-operation-router/SKILL.md` 已要求通过 `scripts/alliance-operation.sh` 使用内置 CLI。
- `scripts/alliance-operation.sh` 已将 `auth` 路由到 `author-info-summary auth`，并设置 `ALLIANCE_OPERATION_AUTH_CLI_NAME=alliance-operation`。
- `author-info-summary` 支持：
  - `auth status --json`
  - `auth token --json`
  - `auth login --begin --json`
  - `auth login --complete <challenge-token> --json`
  - `actions list/show`
  - `run --action <action-id> --query <json|@file> --body <json|@file> [--dry-run]`
- 本地实测 wrapper 需要 Node；当前机器可用 `/opt/homebrew/bin/node`，可通过 `ALLIANCE_OPERATION_LOCAL_NODE=/opt/homebrew/bin/node` 运行。
- `author-info-summary actions list --json` 当前已有作者详情、商品、直播、违规、运营记录、拜访、会议等 action。

### 旧依赖位置

实际默认依赖 `buyin-multistar-cli` 的位置集中在：

- `skills/alliance-operation-router/references/subskills/multistar-author/scripts/ecop_cli.py`
- `skills/alliance-operation-router/references/subskills/multistar_visit/scripts/ecop_cli.py`
- `skills/alliance-operation-router/references/subskills/multistar_contact/scripts/ecop_cli.py`
- `skills/alliance-operation-router/references/subskills/multistar-scale-operation/scripts/ecop_cli.py`
- 上述 subskill 的 `assets/config.json`、`SKILL.md`、`README.md` 和部分 `references/**.md`
- `skills/alliance-operation-router/references/subskills/multistar-ecop-auth/**`
- `skills/visit-proposal-document-generator/scripts/vp_common.py`
- `skills/visit-proposal-document-generator/SKILL.md`
- `skills/visit-proposal-document-generator/templates/acceptance_contract.json`

关键旧实现：

- `multistar-author/scripts/ecop_cli.py` 写死：
  - `CLI_BIN_NAME = "buyin-multistar-cli"`
  - `ecop call --command <id>`
  - 失败提示要求全局安装 `@buyin-multistar/cli`
- `visit-proposal-document-generator/scripts/vp_common.py` 写死从用户 skill 根目录找 `multistar-author/scripts`：
  - `ATOM_SCRIPTS_DIR = ~/.trae/skills/multistar-author/scripts`
  - `_atom_env()` 自动注入 `BUYIN_MULTISTAR_SKILLS_DIR`
  - 登录失效提示 `buyin-multistar-cli ecop auth recheck`
- `multistar-author/scripts/author_live_top_rooms.py` 仍读取旧 session：
  - `~/.buyin-multistar-cli/.local/ecop-session.json`

### 覆盖判断

当前 router 已可覆盖或可直接映射的旧命令：

| 旧命令 | router action/command |
|---|---|
| `author.overview` | `daren.author_info.detail_overview` |
| `author.base_relations` | `daren.author_info.detail_base`，取同一 `/api/buyin/admin/multistar/base` |
| `author.archive_base_info` | `daren.author_info.archive_base_info` |
| `author.level_info` | `daren.author_info.level_info` |
| `author.performance` | `daren.author_info.operation_performance` |
| `author.search_by_condition` | `daren.author_info.author_search` |
| `author.genre_gmv_overview` | `daren.author_info.genre_gmv_overview` |
| `author.live_top_rooms` | `daren.author_info.live_room_list` |
| `author.video_top_items` | `daren.author_info.video_top_items` |
| `author.item_aggregate_indicator` | `daren.author_info.item_aggregate_indicator` |
| `author.item_trend_indicator` | `daren.author_info.item_trend_indicator` |
| `author.live_core_indicators` | `daren.author_info.live_core_indicators` |
| `author.live_overall_analysis` | `daren.author_info.live_overview` |
| `author.violation_list` | `daren.author_info.violation_list` |
| `author.item_config` | `daren.author_info.item_config` |
| `author.fans_overview` | `daren.author_info.fans_overview` |
| `author.promote_product_distribution` | `daren.author_info.product_distribution` |
| `visit.author_recent` | `daren.author_info.operation_visit` 或 `daren.visit.list`，按入参语义映射 |
| `visit.create` | `daren.visit.create` |
| `visit.summary_get` | `daren.visit.detail` |
| `contact.record` | `daren.author_info.operation_contact_single` |
| `contact.group_chat_record` | `daren.author_info.operation_contact_group` |
| `contact.operate_swimlane` | `daren.author_info.operation_swimlane` |
| `scale-operation.operation_crowd_version_list` | `scale.group.version_list` |
| `scale-operation.operation_crowd_list` | `scale.group.list` / `scale.group.detail` |
| `scale-operation.scale_operation_data` | `scale.group.scale_operation_data` |

当前 router 缺少、必须补齐后才能无损移除旧 CLI 的命令：

| 旧命令 | 影响 |
|---|---|
| `author.save_access_data_log` | `visit-proposal` 的 `unlock_sensitive()` 依赖；缺失会导致部分敏感指标可能返回屏蔽值 |
| `author.item_flow_trade` | `visit-proposal` 的流量队列/渠道主项、GMV reconciliation 依赖 |
| `author.fans_portrait` | `visit-proposal` 粉丝画像依赖 |
| `author.fans_consumption_preference` | `visit-proposal` 消费偏好依赖 |
| `author.fans_similar_author_list` | `visit-proposal` 相似达人依赖 |
| `author.live_flow_queue_analysis` | `visit-proposal` 直播推荐流量队列依赖 |
| `author.live_flow_channel_analysis` | `visit-proposal` 直播来源渠道依赖 |
| `author.live_card_by_ids` | `multistar-author` 对外 atom 仍声明，完整 subskills 迁移需要 |
| `author.video_sales_data_tab` | `multistar-author` 对外 atom 仍声明，完整 subskills 迁移需要 |
| `author.video_detail_data_tab` | `multistar-author` 对外 atom 仍声明，完整 subskills 迁移需要 |
| `visit.employee_all` | `multistar_visit` 对外 atom 仍声明 |
| `visit.accompany_apply` | `multistar_visit` 对外 atom 仍声明，mutation，需要继续保留显式确认/安全规则 |
| `visit.summary_write` | `multistar_visit` 对外 atom 仍声明，mutation，需要继续保留显式确认/安全规则 |
| `contact.msg_record` | `multistar_contact` 对外 atom 仍声明 |
| `contact.group_chat_msg_record` | `multistar_contact` 对外 atom 仍声明 |

这些缺口的 transport path、method、query/body schema 都已经在旧 `assets/config.json` 中存在，可以迁移到 router 的 action inventory，不需要重新猜接口。

## Proposed Changes

### 1. 暴露 router 的低层动作入口

修改文件：

- `skills/alliance-operation-router/scripts/alliance-operation.sh`

改动：

- 增加对 `actions`、`summaries`、`run` 的顶层转发：
  - `actions ...` -> `author-info-summary actions ...`
  - `summaries ...` -> `author-info-summary summaries ...`
  - `run ...` -> `author-info-summary run ...`
- `run_unified()` 的 Node 解析补充尊重 `ALLIANCE_OPERATION_LOCAL_NODE`，与内置 CLI 的本地运行方式一致。
- 帮助文案加入：
  - `actions list|show`
  - `run --action <action-id> --query <json> --body <json>`

原因：

- 旧 Python atom 需要一个稳定的本地取数入口。
- 不应让脚本直接调用 `vendor/bin/.../author-info-summary`，否则会绕开 router 入口约束。

### 2. 增加 router ECOP 兼容适配器

新增文件：

- `skills/alliance-operation-router/references/subskills/_shared/alliance_router_ecop.py`

职责：

- 提供与旧 `ecop_cli.py` 兼容的接口：
  - `AUTH_REQUIRED_EXIT_CODE = 7`
  - `build_args(command_id, params=None, extra=None, allow_empty_keys=None)`
  - `run_ecop_call(command_id, params=None, extra=None, allow_empty_keys=None)`
  - `parse_agent_output(stdout)`
  - `extract_agent_data(stdout)`
- 自动定位 router wrapper：
  - 优先 `ALLIANCE_OPERATION_ROUTER_CLI`
  - 否则从当前文件向上定位 `alliance-operation-router/scripts/alliance-operation.sh`
- 将旧 command id 映射到 router action id，并按 action contract 拆分 query/body。
- 调用方式：
  - `bash scripts/alliance-operation.sh run --action <action-id> --query <json> --body <json>`
- 输出兼容旧 atom 的 `agent-json`：
  - 成功：`{"ok": true, "data": <router.data>, "meta": {"router_action": "<action-id>"}}`
  - 失败：`{"ok": false, "error": {...}, "meta": {"router_action": "<action-id>"}}`
- 当 router 返回鉴权错误时归一到 exit code `7`，stderr 明确提示：
  - `bash <router>/scripts/alliance-operation.sh auth status --json`
  - `bash <router>/scripts/alliance-operation.sh auth login --begin --json`
  - `bash <router>/scripts/alliance-operation.sh auth login --complete <challenge-token> --json`
- 当 command id 没有映射时返回非 0，并报 `ACTION_NOT_SUPPORTED_BY_ROUTER`。

映射表放在该文件内，先覆盖全部旧 `assets/config.json` 中的 ECOP command；不保留 `buyin-multistar-cli` fallback。

`--format raw` 兼容策略：

- 现有生成器只使用 JSON 模式。
- 旧 atom 的 `--format raw` 保留可执行，但输出 router 完整 JSON envelope，不再承诺是 `buyin-multistar-cli --output raw` 的原始 HTTP envelope。
- 文档中明确该变化；如果后续确有严格 raw 兼容需求，再在 `author-info-summary run` 增加 `--output raw`。

### 3. 替换四个 subskill 的 ecop_cli.py

修改文件：

- `skills/alliance-operation-router/references/subskills/multistar-author/scripts/ecop_cli.py`
- `skills/alliance-operation-router/references/subskills/multistar_visit/scripts/ecop_cli.py`
- `skills/alliance-operation-router/references/subskills/multistar_contact/scripts/ecop_cli.py`
- `skills/alliance-operation-router/references/subskills/multistar-scale-operation/scripts/ecop_cli.py`

改动：

- 删除 `CLI_BIN_NAME = "buyin-multistar-cli"` 和旧 `ecop call` 拼装。
- 动态把 `_shared` 目录加入 `sys.path`。
- 从 `_shared/alliance_router_ecop.py` re-export：
  - `AUTH_REQUIRED_EXIT_CODE`
  - `build_args`
  - `run_ecop_call`
  - `parse_agent_output`
  - `extract_agent_data`
- 保持 atom 脚本的入参解析、默认值、输出 JSON 结构不变。

原因：

- 这样 `visit-proposal` 仍可复用现有 atom 脚本，不需要重写所有 fetch 脚本。
- 替换点集中在底层 adapter，回归面最小。

### 4. 补齐 author-info-summary action inventory

修改文件：

- `skills/alliance-operation-router/share/author-info-summary/data/action-inventory.json`
- `skills/alliance-operation-router/runtime/author-info-summary/dist/index.cjs`

新增或补齐 action：

- `daren.author_info.save_access_data_log`
- `daren.author_info.item_flow_trade`
- `daren.author_info.fans_portrait`
- `daren.author_info.fans_consumption_preference`
- `daren.author_info.fans_similar_author_list`
- `daren.author_info.live_flow_queue_analysis`
- `daren.author_info.live_flow_channel_analysis`
- `daren.author_info.live_card_by_ids`
- `daren.author_info.video_sales_data_tab`
- `daren.author_info.video_detail_data_tab`

数据来源：

- 从 `references/subskills/multistar-author/assets/config.json` 迁移 method、path、querySchema、bodySchema、responseEnvelope、描述和安全分类。

注意：

- 当前插件目录只有打包产物，没有 TypeScript/JS 源码。短期执行时需要同时改 `share/.../action-inventory.json` 和 `runtime/.../dist/index.cjs` 的内置 action 列表。
- 长期应回到生成器源头补齐这些 action 后重新打包，避免人工修改 bundle 后续被覆盖。

### 5. 补齐 visit/contact 迁移动作

修改文件：

- `skills/alliance-operation-router/share/author-info-summary/data/action-inventory.json`
- `skills/alliance-operation-router/runtime/author-info-summary/dist/index.cjs`

新增或补齐 action：

- `daren.visit.employee_all`
- `daren.visit.accompany_apply`
- `daren.visit.summary_write`
- `daren.author_info.operation_contact_msg_record`
- `daren.author_info.operation_contact_group_msg_record`

复用已有 action：

- `visit.author_recent` 映射到 `daren.author_info.operation_visit` 或 `daren.visit.list`。
- `visit.summary_get` 映射到 `daren.visit.detail`。
- `contact.record` 映射到 `daren.author_info.operation_contact_single`。
- `contact.group_chat_record` 映射到 `daren.author_info.operation_contact_group`。
- `contact.operate_swimlane` 映射到 `daren.author_info.operation_swimlane`。

安全规则：

- `visit.accompany_apply` 和 `visit.summary_write` 是 mutation，action inventory 必须标记：
  - `safety.classification = "mutation"`
  - `requires_confirmation = true`
  - 如支持 dry-run，必须 `requires_dry_run = true`
- 适配器默认拒绝 mutation；只有调用方显式传入原 atom 已支持的确认参数时才执行。

### 6. 补齐 scale 映射

修改文件：

- `skills/alliance-operation-router/references/subskills/_shared/alliance_router_ecop.py`

映射：

- `scale-operation.operation_crowd_version_list` -> `scale.group.version_list`
- `scale-operation.operation_crowd_list` -> `scale.group.list` 或 `scale.group.detail`
- `scale-operation.scale_operation_data` -> `scale.group.scale_operation_data`

调用方式：

- scale 相关 action 走 `create-author-task`。如果 `scripts/alliance-operation.sh run` 只转发 author-info，则适配器对 scale command 改走：
  - `bash scripts/alliance-operation.sh scale group ...`
  - 或新增 wrapper route `scale run --action <action-id>` 转发到 `create-author-task run/actions`

实现时优先新增 wrapper route，保持 adapter 调用模型一致。

### 7. 迁移 visit-proposal-document-generator

修改文件：

- `skills/visit-proposal-document-generator/scripts/vp_common.py`
- `skills/visit-proposal-document-generator/SKILL.md`
- `skills/visit-proposal-document-generator/templates/acceptance_contract.json`

`vp_common.py` 改动：

- `ATOM_SCRIPTS_DIR` 默认改为插件内置路径：
  - `Path(__file__).resolve().parents[2] / "alliance-operation-router/references/subskills/multistar-author/scripts"`
- 增加中性 override：
  - `ALLIANCE_OPERATION_MULTISTAR_AUTHOR_SCRIPTS_DIR`
- 删除默认注入 `BUYIN_MULTISTAR_SKILLS_DIR` / `BUYIN_MULTISTAR_SKILL_ROOTS`。
- `_atom_env()` 注入：
  - `ALLIANCE_OPERATION_ROUTER_CLI=<.../alliance-operation.sh>`
  - 保留用户已有 `ALLIANCE_OPERATION_LOCAL_NODE`。
- exit code 7 的提示改为 router 登录：
  - `bash <router>/scripts/alliance-operation.sh auth status --json`
  - `bash <router>/scripts/alliance-operation.sh auth login --begin --json`
  - `bash <router>/scripts/alliance-operation.sh auth login --complete <challenge-token> --json`

`SKILL.md` 改动：

- 删除“调用 multistar-* 能力前确保 `BUYIN_MULTISTAR_SKILLS_DIR`”。
- 改为“调用前使用 `alliance-operation-router/scripts/alliance-operation.sh auth status --json` 检查登录态”。
- 明确默认 atom 来源为插件内置 router subskill，不依赖用户全局 skill 注册。

`acceptance_contract.json` 改动：

- 去掉要求出现 `BUYIN_MULTISTAR_` 的 literal。
- 增加 `ALLIANCE_OPERATION_ROUTER_CLI`、`alliance-operation.sh auth`、`fetch_all` 等新链路证据。

### 8. 更新 subskill 文档和配置

修改文件范围：

- `skills/alliance-operation-router/references/subskills/multistar-author/**`
- `skills/alliance-operation-router/references/subskills/multistar_visit/**`
- `skills/alliance-operation-router/references/subskills/multistar_contact/**`
- `skills/alliance-operation-router/references/subskills/multistar-scale-operation/**`
- `skills/alliance-operation-router/references/subskills/multistar-ecop-auth/**`
- 其他 `scale-operation-*` 文档中提到 `buyin-multistar-cli` 的位置

改动：

- `assets/config.json` 中 `cli.binary` 从 `buyin-multistar-cli` 改为 `alliance-operation-router/scripts/alliance-operation.sh` 或描述为“router adapter internal”。
- `loginCommand` 从 `buyin-multistar-cli ecop auth login` 改为 `alliance-operation.sh auth login --begin/--complete`。
- `SKILL.md`、`README.md`、`references/common/*.md` 中删除全局安装 `@buyin-multistar/cli` 的强制要求。
- `multistar-ecop-auth` 从旧 skill 改成兼容说明：
  - 新默认认证状态目录是 router 管理的 `~/.alliance-operation-cli/...`
  - 禁止手动编辑 session
  - 登录统一由 router auth 完成

### 9. 更新 legacy session 读取

修改文件：

- `skills/alliance-operation-router/references/subskills/multistar-author/scripts/author_live_top_rooms.py`

改动：

- 默认 session path 从：
  - `~/.buyin-multistar-cli/.local/ecop-session.json`
- 改为：
  - `~/.alliance-operation-cli/ecop-session.json`
- 如 router auth runtime 暴露 token/status JSON 中含 `employee_id`，优先通过 `alliance-operation.sh auth status --json` 读取，文件路径仅作兼容后备。

## Assumptions & Decisions

- 默认目标是移除“默认依赖”，不是删除所有历史文本痕迹。实现完成后，目标目录不应再出现要求安装或执行 `buyin-multistar-cli` 的当前操作指令。
- 不保留自动 fallback 到 `buyin-multistar-cli`。这能保证问题暴露在新 router 能力边界内，而不是隐藏到旧链路。
- `visit-proposal-document-generator` 的功能完整性以 JSON 数据采集链路为准；`--format raw` 是诊断模式，允许变成 router envelope。
- mutation action 仍必须走显式确认规则，不因为迁移 router 而放宽。
- 打包产物内补 action 是短期落地方案；长期应从生成器源头补齐后重新发布插件。

## Verification Steps

### 静态检查

1. 确认目标运行路径不再默认引用旧 CLI：

```bash
rg -n "buyin-multistar-cli|BUYIN_MULTISTAR|\\.buyin-multistar-cli" \
  alliance-operation-plugin/skills/alliance-operation-router/references/subskills \
  alliance-operation-plugin/skills/visit-proposal-document-generator
```

预期：不再出现当前执行指令、默认环境变量注入、默认 session 路径；只允许迁移说明或历史兼容说明中非执行性引用。

2. 确认 router 顶层入口可用：

```bash
ALLIANCE_OPERATION_LOCAL_NODE=/opt/homebrew/bin/node \
  bash alliance-operation-plugin/skills/alliance-operation-router/scripts/alliance-operation.sh \
  actions show --action daren.author_info.fans_portrait --json
```

预期：返回 `status: success` 和 action contract。

3. 确认 auth 提示走新链路：

```bash
ALLIANCE_OPERATION_LOCAL_NODE=/opt/homebrew/bin/node \
  bash alliance-operation-plugin/skills/alliance-operation-router/scripts/alliance-operation.sh \
  auth status --json
```

预期：命令可执行；无登录态时输出 router auth 结构，不提示安装 `buyin-multistar-cli`。

### 单元/入口测试

1. 运行已有 atom 入口测试：

```bash
python3 alliance-operation-plugin/skills/alliance-operation-router/references/subskills/multistar_visit/scripts/test_visit_entrypoints.py
python3 alliance-operation-plugin/skills/alliance-operation-router/references/subskills/multistar_contact/scripts/test_contact_entrypoints.py
```

2. 对 author atom 做无网络 mock 测试：

- mock `_shared/alliance_router_ecop.run_ecop_call()` 返回 `{"ok": true, "data": {"sample": true}}`
- 覆盖 `author_fans_portrait.py`、`author_fans_consumption_preference.py`、`author_item_flow_trade.py`、`author_live_flow_queue_analysis.py`、`author_live_flow_channel_analysis.py`
- 预期 atom JSON 输出仍为 data 子树。

### 登录失效验证

在无有效 ECOP session 的环境运行：

```bash
ALLIANCE_OPERATION_LOCAL_NODE=/opt/homebrew/bin/node \
python3 alliance-operation-plugin/skills/alliance-operation-router/references/subskills/multistar-author/scripts/author_fans_portrait.py \
  --author-id 3250600708947220
```

预期：

- exit code 为 `7` 或 atom 按旧约定识别为登录失效。
- stderr 提示 `alliance-operation.sh auth ...`。
- stderr 不提示 `buyin-multistar-cli`。

### 有登录态真实 smoke

在有效登录态下选择一个已知 author_id：

```bash
ALLIANCE_OPERATION_LOCAL_NODE=/opt/homebrew/bin/node \
python3 alliance-operation-plugin/skills/alliance-operation-router/references/subskills/multistar-author/scripts/author_fans_portrait.py \
  --author-id <known_author_id>

ALLIANCE_OPERATION_LOCAL_NODE=/opt/homebrew/bin/node \
python3 alliance-operation-plugin/skills/alliance-operation-router/references/subskills/multistar-author/scripts/author_item_flow_trade.py \
  --author-id <known_author_id> --scene flow-channel
```

预期：输出合法 JSON，字段结构与旧 atom 下游消费一致。

### visit-proposal 集成验证

在有效登录态下：

```bash
ALLIANCE_OPERATION_LOCAL_NODE=/opt/homebrew/bin/node \
python3 alliance-operation-plugin/skills/visit-proposal-document-generator/scripts/fetch_all.py \
  --author-id <known_author_id> \
  --output /tmp/visit-proposal-payload.json
```

预期：

- payload 包含粉丝画像、消费偏好、流量队列/渠道、相似达人、GMV reconciliation。
- `fetch_all.py` 过程中不依赖 `BUYIN_MULTISTAR_SKILLS_DIR`。
- 失败时错误提示指向 router auth。

### 插件测试

运行插件现有 Node 测试：

```bash
node --test alliance-operation-plugin/tests/*.test.mjs
```

如测试依赖固定文案，需要同步更新期望中的旧 CLI 文案为 router 文案。

