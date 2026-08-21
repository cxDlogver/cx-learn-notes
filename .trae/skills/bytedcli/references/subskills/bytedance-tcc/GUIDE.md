---
name: bytedance-tcc
description: "Operate TCC via bytedcli: list/search/get namespaces, list/get/decrypt/diff config versions, create/update/deploy configs, list directories, import base config, apply namespace permissions, and inspect metadata. Use when tasks mention TCC or config center."
---

# bytedcli TCC

## 如何调用 bytedcli

推荐：先全局安装一次，后续所有命令直接调用 `bytedcli`。

```bash
# 推荐方式：先全局安装，后续直接调用 bytedcli
NPM_CONFIG_REGISTRY=http://bnpm.byted.org npm install -g @bytedance-dev/bytedcli@latest
bytedcli <command> [options]
```

```bash
# Fallback：仅在无法全局安装时使用 npx 临时执行
NPM_CONFIG_REGISTRY=http://bnpm.byted.org npx -y @bytedance-dev/bytedcli@latest <command> [options]
```

## When to use

- Namespace/Config 查询
- Namespace 详情查询
- 配置版本查询与版本间 diff
- 配置创建、更新、发布（通过 `--publish-mode` 控制发布策略）
- 目录查询与基准配置导入

## 前置条件

- 使用通用调用方式：`../../invocation.md`

> 执行前缀见 `../../invocation.md`；下面示例直接写 `bytedcli`。

## Quick start

Commands are grouped under `tcc namespace`, `tcc config`, `tcc deployment`, `tcc env`, `tcc site`, and `tcc permission`. Old flat names (e.g. `tcc list-sites`, `tcc search-namespace`, `tcc get-config`) still work as hidden aliases.

```bash
bytedcli tcc site list
bytedcli --site cn tcc namespace list --page 1 --size 50
bytedcli --site cn tcc namespace search "keyword" --scope all --page 1 --size 50
bytedcli --site cn tcc namespace get "namespace"
bytedcli tcc config list "namespace" --region CN --keyword "demo" --dir-path "/default"
bytedcli tcc config get "namespace" "config_name" --region CN --dir "/default"
# View decrypted clear value for encrypted configs
bytedcli tcc config get "namespace" "config_name" --region CN --dir "/encrypt" --decrypt
bytedcli tcc config version list "namespace" "config_name" --region CN --dir "/default"
bytedcli tcc config version get "namespace" "config_name" --ver 3 --region CN --dir "/default"
bytedcli tcc config version diff "namespace" "config_name" --from-version 2 --to-version 3 --region CN --dir "/default"
bytedcli --site i18n-bd tcc config dir list "namespace" --env ppe_xxx
bytedcli --site i18n-bd tcc config meta list --env ppe_xxx
bytedcli --site cn tcc config create "namespace" "config_name" --env ppe --region CN --dir "/default" --description "demo config" --data-type yaml --encrypted true --value "a: b"
bytedcli --site cn tcc config update "namespace" "config_name" --env ppe --region CN --encrypted false --value "a: b"
# Only update the explicitly requested region; do not expand same-key sync-group peers
bytedcli --site cn tcc config update "namespace" "config_name" --env ppe --region CN --no-sync-group --value "a: b"
bytedcli --site cn tcc deployment deploy "namespace" "config_name" --env ppe --region CN --dir-path "/default"
# Only deploy the explicitly requested region; do not expand same-key sync-group peers
bytedcli --site cn tcc deployment deploy "namespace" "config_name" --env ppe --region CN --dir-path "/default" --no-sync-group
bytedcli --site i18n-bd tcc config import "namespace" --config-ids "123,456" --target-env ppe_xxx
# Only create deployment, do not start (manual mode)
bytedcli tcc deployment deploy "namespace" "config_name" --env ppe --region CN --dir-path "/default" --publish-mode manual
# Deploy with review support (auto mode, default): auto-publish if no review, otherwise return review info
bytedcli --site cn tcc deployment deploy "namespace" "config_name" --env prod --region CN --dir-path "/default" --publish-mode auto
# Force auto-publish regardless of review requirement
bytedcli --site cn tcc deployment deploy "namespace" "config_name" --env prod --region CN --dir-path "/default" --publish-mode force-auto
# Query publish details by deployment ID or control-panel URL
bytedcli --site cn tcc deployment get "1234567890" --env prod
bytedcli tcc deployment get "https://example.com/tcc/namespace/demo.namespace/publish-details/1234567890??x-resource-account=demo&x-bc-region-id=example" --env prod
# Operate deployment or approve/reject current review step
bytedcli tcc deployment operate "1234567890" --operation start --env prod
bytedcli tcc deployment approve "https://example.com/tcc/namespace/demo.namespace/publish-details/1234567890??x-resource-account=demo&x-bc-region-id=example" --env prod
bytedcli tcc deployment reject "1234567890" --env prod
# Apply for a TCC namespace permission (files an auth/bpm ticket routed to the namespace owners)
bytedcli --site i18n-tt tcc permission apply "namespace" --access write --reason "Need config access"
# Preview the exact request body without submitting
bytedcli --site i18n-tt tcc permission apply "namespace" --access write --reason "Need config access" --dry-run
# Use an explicit TCC role instead of the --access mapping
bytedcli --site i18n-tt tcc permission apply "namespace" --role tcc.ns_operator --reason "Need config access"
```

## Notes

- 环境/region/dir 建议显式指定
- `tcc config get` 支持 `--decrypt`，用于查看加密配置（`enable_encryption=true`）的明文值；不传 `--decrypt` 时加密配置只显示提示信息，不输出密文
- `tcc config list` 支持 `--keyword` 和 `--dir-path`，分别按配置名关键字与目录路径筛选结果
- `tcc config version diff` 按 namespace、config name、from/to version 直接输出两个配置版本的 unified diff；JSON 配置会先格式化再 diff，可用 `--context-lines` 调整上下文行数
- `tcc deployment deploy` 支持 `--dir-path`，用于在同一 namespace 下存在同名配置时按目录锁定目标配置
- `tcc deployment deploy` 在策略类型为 `feature` 时，`--env` 仅支持 `ppe`/`ppe_*` 或 `boe`/`boe_*`（例如 `ppe_demo`、`boe_demo`）
- 使用全局 `--site` 选择站点（`cn|boe|i18n|i18n-bd|i18n-tt|us-ttp|eu-ttp`，别名：`prod` -> `cn`）。Per-service `--tcc-site` is a hidden alias for backward compatibility.
- `tcc namespace get <namespace>` 查询 namespace 详情，返回 namespace id、owner/operator/viewer、regions、Bytetree 节点等控制台详情字段。
- `tcc permission apply <namespace>` 申请 TCC namespace 权限：复用 TCC 控制台同款 `auth/bpm/create` 接口（走 `/api/v3/tcc/bcc/` 网关，不受 `iam permission apply` 在 i18n-tt 上遇到的 IAM 网关白名单限制）。命令会自动从 namespace 名解析 `ns_id` 和负责人（`rs_owners`），并按当前登录用户填申请人；工单路由给 namespace 负责人审批
  - `--access` 映射 TCC 角色：`read->tcc.ns_viewer`、`write->tcc.ns_operator`、`admin->tcc.ns_owner`；也可用 `--role` 直接指定角色（覆盖 `--access`）
  - `--approver <username...>` 覆盖默认负责人；`--username` 覆盖申请人；`--dry-run` 只打印请求体不提交
  - namespace 入参支持直接给名字，或给 `https://<host>/tcc/namespace/<name>` 形式的控制台 URL
- 需要结构化输出加 `--json`（全局选项，放在子命令之前，如 `bytedcli --json tcc config list "namespace" --region CN ...`）
- `tcc config create` 需要显式传 `--description`；TCC Web 创建接口要求 description 非空，CLI 会先在本地校验
- `tcc config create` 的 `--data-type` 默认值是 `yaml`，CLI 不会根据 `--value` / `--file` 内容自动识别类型。**调用 `tcc config create` 之前，必须先根据待写入内容推断 data type，并显式传入 `--data-type`**：
  - 内容能被 `JSON.parse` 解析成对象/数组（典型形如 `{...}` / `[...]`） → `--data-type json`
  - 内容是 YAML 文档（含 `key: value`、缩进列表、`---` 文档分隔等典型 YAML 结构） → `--data-type yaml`
  - 内容是单行/多行纯文本，且既不是合法 JSON 也不是 YAML 结构 → `--data-type string`
  - 用 `--file` 传入时，优先按扩展名判断（`.json` → json，`.yaml` / `.yml` → yaml，其他 → 用上面的内容判断兜底）
  - 推断不确定时优先选 `string`，避免被 TCC 当作 yaml 解析失败或字段语义错配
- `tcc config create` / `tcc config update` 支持 `--encrypted <boolean>`，用于显式控制 Web V1 namespace 的 `enable_encryption`
- `tcc config create` 在 `former_tcc` / `tcc_v2` namespace 上会自动回退到 V2 `service_id` 创建接口，不需要手写内部 API
- `tcc config update` 在 `former_tcc` / `tcc_v2` namespace 上会自动回退到 V2 `service_id` 的 `config/upsert/v2` 接口，按传入的 `--region` 和 `--dir` 更新对应副本
- `tcc config create` / `tcc config update` 在 `former_tcc` / `tcc_v2` namespace 上暂不支持 `--encrypted`；CLI 会直接报错，避免静默忽略
- `tcc config update` 在 Web V1 namespace 上默认会根据 `sync_config_regions` 自动补齐同组内所有已存在副本的 `extend_regions` 和 `update_base_version`；例如同一配置同时存在于 `CN` / `China-East` 时，不需要手动拆成多次更新，JSON 输出会返回实际覆盖的 `regions`
- 如需只更新显式传入的 `--region`，可加 `--no-sync-group`；CLI 将跳过同步组扩展，只更新单个 region
- `tcc deployment deploy` 在 `former_tcc` / `tcc_v2` namespace 上会自动切到 TCC AG 的 V2 发布链路：先用 `service_id` 读取配置，再调用 `config/upsert_deploy/v2` 创建或复用 activity 发布单，并按 `deployment/step_info` 判断是否继续推进 `next`；未发布配置会按目标最新版本构造 V2 deploy payload，并把备注写入 `config_data.note`
- `tcc deployment deploy` 在 Web V1 namespace 上默认会根据 `sync_config_regions` 自动补齐同组内所有已存在副本的 `config_changes` 与 `check_review conf_ids`；例如同一配置同时存在于 `CN` / `China-East` 时，不需要手动拆成多次发布，JSON 输出会返回实际覆盖的 `regions` / `config_ids`
- 如需只发布显式传入的 `--region`，可加 `--no-sync-group`；CLI 将跳过同步组扩展，只创建单 region 发布单
- 如需区域并行发布，在命令中添加 `--region-parallel`
- `tcc deployment deploy` 通过 `--publish-mode` 控制发布策略：
  - `auto`（默认）：不需要 review 时会在每次操作前读取当前 `get_step`，并按当前步骤允许的前进操作自动推进（如 `start`、`next_batch`、`finish`）；需要 review 时创建审批工单并返回当前 review 工单信息
  - `manual`：只创建发布工单，不自动 start/finish
  - `force-auto`：无论是否需要 review，都尝试按当前步骤允许的前进操作自动推进
  - 被 SCP 策略封禁时，返回逃逸申请链接
- 当策略阶段配置了 `force_rolling=true` 时，`tcc deployment deploy` 会自动把对应阶段的 `enable_rolling` 一并置为 `true`，避免 Web 发布 payload 因滚动开关不一致被拒绝
- `tcc deployment get` 支持直接传 TCC 控制台 `publish-details` URL；未显式传 `--site` 时，会优先按 URL host 自动推断站点
- `tcc deployment get` 默认会并发调用 `get_step`，把当前步骤索引、阶段类型和 `allow_operations` 一起返回；若 `get_step` 失败，不会影响主查询结果。文本模式下拿到 step 信息时也会打印当前 step 摘要，方便继续执行 `tcc deployment operate`
- `tcc deployment operate` 直接透传底层 `deployment/operate`；未显式传 `--current-step-index` 时，会自动调用 `get_step` 推断当前步骤
- `tcc deployment approve` / `tcc deployment reject` 分别封装 review 步骤的 `review_pass` / `review_reject`

## References

- `references/tcc.md`
