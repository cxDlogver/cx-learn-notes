---
name: bytedance-tce
description: "Operate TCE via bytedcli: list/search/get/create/update/delete services, list/create/update/scale/reset clusters, list/search instances, list/get/cancel/action deployments, env cascader, deploy lane. Use when tasks mention TCE services, clusters, deployments or environment queries."
---

# bytedcli TCE

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

- 服务列表/搜索/详情/创建/更新/删除
- 集群信息查询/创建/更新/扩缩容/删除/滚动重启
- 实例列表/搜索
- 发布工单查询与操作（列表/详情/取消/工单级 action/步骤级 action）
- 环境级联查询
- 泳道部署

## 前置条件

- 使用通用调用方式：`../../invocation.md`

> 执行前缀见 `../../invocation.md`；下面示例直接写 `bytedcli`。

## Quick start

Commands are grouped under `tce service`, `tce cluster`, `tce instance`, and `tce deployment`. Old flat names (e.g. `tce list-starred-service`, `tce search-service`, `tce get-service`, `tce list-service-clusters`, `tce list-instance`, `tce list-deployment`, `tce get-deployment`) still work as hidden aliases.

> 在 ByteDance 生产网络内使用 `--site i18n-tt` 时，设置 `BYTEDCLI_NETWORK_PROFILE=prod`，TCE OpenAPI 与 ByteCloud JWT host 会自动切到生产网可达的 `cloud-i18n.bytedance.net`。

```bash
# 列出支持的站点
bytedcli tce list-sites

# 收藏的服务
bytedcli tce service list --page 1 --page-size 10

# 搜索服务
bytedcli tce service search --keyword "keyword" --env "ppe_xxx" --page 1 --page-size 10

# 获取服务详情（也支持 --psm + 可选 --env）
bytedcli --site cn tce service get <service_id>
bytedcli --site cn tce service get --psm example.service.api --env prod

# 列出服务集群（支持 --service-id 或 --psm）
bytedcli --site cn tce cluster list --service-id <service_id> --page 1 --page-size 10
bytedcli --site cn tce cluster list --psm example.service.api --env prod --page 1 --page-size 10
bytedcli --site boe tce cluster list --service-id 234558 --cluster-name tls_mix_proxy_boe --page 1 --page-size 10

# 创建/更新/删除服务（默认必须先 dry-run，真实提交加 --yes）
bytedcli tce service create --service-info-file service-info.json --dry-run
bytedcli tce service create --service-info-file service-info.json --yes
bytedcli tce service update --service-id <service_id> --service-info-file service-info.json --dry-run
bytedcli tce service delete --service-id <service_id> --dry-run

# 查询和校验服务可用 SCM 包
bytedcli tce service repo-info-list --service-id <service_id>
bytedcli tce service check-repos --service-id <service_id> --request-file check-repos.json --dry-run

# 创建/删除集群（cluster_info 建议来自平台推荐模板或控制台导出的 payload）
bytedcli tce cluster create --service-id <service_id> --cluster-info-file cluster-info.json --dry-run
bytedcli tce cluster create --service-id <service_id> --cluster-info-file cluster-info.json --yes
bytedcli tce cluster reset --service-id <service_id> --cluster-id <cluster_id> --dry-run

# 更新集群（通过 JSON 文件提交 update_info）
bytedcli tce cluster update --cluster-id <cluster_id> --service-id <service_id> --update-info-file payload.json --yes
bytedcli tce cluster update --cluster-id <cluster_id> --service-id <service_id> --update-info-file payload.json --dry-run
bytedcli tce cluster update --cluster-id <cluster_id> --service-id <service_id> --update-info-file payload.json --wait --note "demo update"

# 集群扩缩容（调整各 IDC 副本数）
bytedcli tce cluster scale --psm example.service.api --env prod --cluster-name demo-prod --replicas 2 --dry-run
bytedcli tce cluster scale --psm example.service.api --env prod --cluster-name demo-prod --replicas 2 --yes
bytedcli tce cluster scale --cluster-id <cluster_id> --service-id <service_id> --scale-info-file scale.json --wait --pipeline-template 400013643

# 集群滚动重启（TCE 原生「操作实例 → 重建实例」，由 TCE 按并发粒度滚动重建）
bytedcli tce cluster restart --psm example.service.api --env prod --cluster-name demo-prod --dry-run
bytedcli tce cluster restart --cluster-id <cluster_id> --service-id <service_id> --surge-percent 25 --interval-sec 10 --yes --wait

# 列出服务实例（推荐使用 --psm + --env）
bytedcli --site cn tce instance list --psm example.service.api --env prod --ordering -cpu

# 搜索服务实例（兼容方式：使用 service_id）
bytedcli --site cn tce instance search --service-id <service_id> --ordering cpu --page 1 --page-size 10

# 按 node IP 过滤服务实例
bytedcli tce instance list --service-id 234558 --node-ip 10.35.142.21 --force-update --page 1 --page-size 10 --tce-site boe



# 直接复用本地浏览器态 SSO session，自动从 PSM/env 建立 webshell 会话
bytedcli --json auth login --begin --session --session-method qr --no-terminal-qr
bytedcli --json auth login --complete <complete_token>
bytedcli tce webshell open --psm example.service.api --env prod --first
bytedcli tce webshell exec --session-id ws_demo --command 'hostname; date'
bytedcli tce webshell interactive --psm example.service.api --env prod --first
```

## 发布工单

```bash
# 查询发布工单列表
bytedcli tce deployment list --service-id <service_id> --type upgrade
bytedcli tce deployment list --psm example.service.api --env prod --type upgrade

# 查询发布工单详情
bytedcli tce deployment get <deployment_id>

# 取消发布工单
bytedcli tce deployment cancel <deployment_id>

# 执行工单级 action（先通过 deployment get 查看 pipeline.allow_actions）
bytedcli tce deployment action --deployment-id <deployment_id> --action start --dry-run
bytedcli tce deployment action --deployment-id <deployment_id> --action start --yes

# 执行步骤级 action（先通过 deployment get 查看 step.allow_actions）
bytedcli tce deployment execute-step --step-id <step_id> --action start --dry-run
bytedcli tce deployment execute-step --step-id <step_id> --action start --yes

# 跨站点查询
bytedcli --site boe tce deployment list --service-id <service_id>
bytedcli --site byteintl tce deployment get <deployment_id>
```

## 环境级联查询

```bash
# 查询 PSM 的环境级联信息（partition -> env -> lane）
bytedcli tce env-cascader --psm example.service.api

# 指定分区
bytedcli tce env-cascader --psm example.service.api --partition CN

# 指定环境
bytedcli tce env-cascader --psm example.service.api --env prod
```

## 泳道部署

```bash
# 部署泳道（需要指定 env、standard-env、psm、flow-base、branch）
bytedcli tce deploy-lane \
  --env ppe_demo \
  --standard-env online_cn \
  --psm example.service.api \
  --flow-base prod \
  --branch master

# 部署指定 SCM 版本（仅提交指定仓库，不携带完整 SCM 列表）
bytedcli tce deploy-lane \
  --env prod \
  --standard-env boe \
  --psm example.service.api \
  --flow-base boe \
  --scm-repo-name example/service/api \
  --scm-repo-version 1.0.0.8 \
  --action upgrade

# 创建时注入自定义环境变量（逗号分隔 key=value）
bytedcli tce deploy-lane \
  --env boe_demo \
  --standard-env boe \
  --psm example.service.api \
  --action create \
  --cluster-names default \
  --env-vars "scmVersion=1.0.0.100"

# 开启热部署
bytedcli tce deploy-lane \
  --env ppe_demo \
  --standard-env online_cn \
  --psm example.service.api \
  --flow-base prod \
  --branch master \
  --action create \
  --hot-deploy
```

## 环境变量注入（upgrade-tce）

```bash
# 升级时设置自定义环境变量
bytedcli env service upgrade-tce \
  --psm example.service.api \
  --env boe_demo \
  --standard-env boe \
  --cluster-id 12345 \
  --env-vars "scmVersion=1.0.0.100"
```

`--env-vars` 支持逗号分隔的多个键值对，如 `--env-vars "key1=val1,key2=val2"`。值会合并到集群的 `new_env_vars` 中，不会覆盖未指定的已有环境变量。

## 跨站点示例

```bash
bytedcli --site boe tce service search --keyword "my-service"
bytedcli --site byteintl tce service search --keyword "my-service"
bytedcli --site ttp-us-limited tce service search --keyword "my-service"
bytedcli --site ttp-eu tce service search --keyword "my-service"
```

## Notes

- 需要结构化输出加 `--json`（全局选项，放在子命令之前，如 `bytedcli --json tce instance list --psm example.service.api --env prod ...`）
- Flag renames: `--page-num` is now `--page`; old name still works as a hidden alias
- 使用全局 `--site` 选择站点（`cn|boe|byteintl|ttp-us-limited|ttp-eu`），不传则默认跟随 `BYTEDCLI_CLOUD_SITE`。Per-service `--tce-site` is a hidden alias for backward compatibility.
- 常用别名：`prod=cn`、`i18n=byteintl`、`tx-ttp=ttp-us-limited`、`eu-ttp=ttp-eu`
- **`cluster update` 安全规则（MUST follow）**：(1) ALWAYS 先 `--dry-run` 并展示完整请求给用户；(2) ALWAYS 等用户明确确认后才执行真正提交；(3) `update_info` 为替换语义——修改 `env_list` 时 MUST 包含全部已有环境变量，否则遗漏的变量会被永久删除；(4) 首次提交不要用 `--yes`，让 CLI 弹确认。详见 `references/tce.md` 中的 CRITICAL SAFETY RULES
- **`cluster scale` 安全规则**：与 `cluster update` 相同——(1) ALWAYS 先 `--dry-run`；(2) 等用户确认后再真正提交；(3) 首次提交不要用 `--yes`。可用 `--replicas` 自动按集群 IDC 扩缩容，或用 `--scale-info-file` 传 `{ "dc_info": [...], "canary_dc_info": [...] }`；预留模式缩容时 `dc_info[].quota_op` 支持 `{ "type": "reserve", "to_psm": "<target_psm>" }`
- **服务/集群创建安全规则**：`service create/update/delete`、`cluster create/reset`、`service check-repos`、`deployment action`、`deployment execute-step` 默认必须二选一：先 `--dry-run` 展示请求体，或在用户明确确认后加 `--yes` 提交；同时传 `--dry-run` 和 `--yes` 时，`--dry-run` 优先生效且不会提交真实请求。创建 LGP/TCE 服务时优先使用平台推荐模板或控制台导出的 `service_info` / `cluster_info` payload，不要凭空拼接复杂 payload。
- **`cluster restart` 安全规则**：该命令调用 TCE 原生「操作实例 → 重建实例」接口（`/deployment/cluster/batch/`，`exec_type=rebuild`），由 TCE 按 `--surge-percent`（并发粒度，默认 10%）和 `--interval-sec`（操作间隔，默认 30s）滚动重建整集群实例，**不是逐个删 Pod**。(1) ALWAYS 先 `--dry-run` 看请求体；(2) 等用户确认后再加 `--yes` 真正执行；(3) 不要把「重启」与 `instance delete` 混用——本命令是显式的滚动重建工单，可用 `--wait` 等待工单到终态。
- `service get`、`cluster list`、`deployment list` 都支持 `--psm`；如果同一 PSM 在多个 env 下都有服务，可加 `--env` 做唯一定位
- `cluster list --cluster-name` 可按集群名过滤结果；当同一 vregion 下存在多个同名集群时，建议和 `--service-id` 或 `--psm --env` 一起使用
- **PPE 环境**：当 `--env` 值匹配 `ppe` 或 `ppe_*` 时，bytedcli 自动按 PPE 环境查询，无需显式传 `--ppe`。拿到 PPE service ID 后，`deployment list`、`cluster update`、`instance list` 等命令直接用 `--service-id`
- `instance list` 推荐使用 `--psm + --env` 组合；兼容方式也支持 `--service-id`
- `instance list --node-ip` 可按 node IP 过滤服务实例；仅支持和 `--service-id` 或 `--psm --env` 一起使用，不支持 `--cluster-id`
- `instance list` 的文本表格会展示 `IDC` 列；按 `--node-ip` 排查时可直接看到实例所在机房
- `instance delete` 需要同时传 `--cluster-id`、`--idc`、`--pod-name`；推荐先 `--dry-run` 检查 DELETE 请求，默认会要求交互确认，非交互场景可显式加 `--yes`
- **`instance delete` 稳定性规则（MUST follow）**：
  (1) 除非用户明确要求“删除实例 / 删除 pod”，或上下文明确是在做“实例迁移 / 节点迁移”并且删除实例是迁移动作的一部分，否则不要主动建议或执行 `tce instance delete`；不要把“重启”“排障”“恢复”“摘流量”自动等同为删除实例。
  (2) 禁止一次性删除 2 个或以上实例；任何多实例场景都只能单个串行执行，每删一个都要重新观察，再决定下一个。
  (3) 任何真实删除前都必须先执行 `--dry-run`，并向用户展示精确的 `cluster-id / idc / pod-name`。
  (4) 任何真实删除都必须二次确认：第一次确认目标实例是否正确，第二次确认是否现在执行删除；不要复用历史确认。
  (5) 删除前先用 `instance list` / `instance search` 确认目标实例当前仍存在且唯一，避免用过期 pod 名或模糊匹配结果直接删。
  (6) 删除前先检查剩余实例数量与状态；如果无法确认删除后仍有足够健康副本，尤其是 prod / 单副本 / 低副本场景，先提示风险并暂停，等待用户明确继续。
  (7) 删除后必须重新执行实例查询，确认 replacement / remaining pods 状态，再继续任何下一步操作；如果删除后状态异常，不要继续串行删第二个。
  (8) 不要把实例删除和 `cluster update`、扩缩容、deployment 操作并发混用；有正在进行的发布或变更时，优先提醒用户存在叠加风险。
- `instance list --ordering` 支持 `cpu/mem/idc/createtime/podstatus`，带 `-` 前缀表示倒序
- `tce webshell` 适合在 `instance list` / `deployment get` 已经定位到目标 pod 之后做补充排障；agent 优先使用 `auth login --begin --session --session-method qr --no-terminal-qr` + `auth login --complete <token>` 准备浏览器态 SSO session，再使用 `tce webshell open/exec/close`，人用交互场景再使用 `tce webshell interactive --psm --env`。BOE webshell 若返回 SSO HTML 或 `invalid JSON response`，通常需要额外补一次 `--site cn` 的 session。

## References

- `references/tce.md`
