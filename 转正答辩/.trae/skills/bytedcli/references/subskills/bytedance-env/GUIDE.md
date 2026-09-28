---
name: bytedance-env
description: "Operate ENV platform via bytedcli: list/search env, baseline create flow, deploy TCE/TCC, manage devices, deploy bytefaas (ByteCloud FaaS) services to PPE swimlanes, manage ENV ByteCopy services/instances/target addresses, and inspect tickets. Triggers: 把 bytefaas/FaaS 发到 PPE 泳道, 部署 FaaS 到 PPE, PPE 泳道挂载 FaaS, FaaS PPE deployment, deploy bytefaas to swimlane, env service deploy-bytefaas, env service upgrade-bytefaas, ByteCopy, bytecopy, 添加目标地址."
---

# bytedcli ENV

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

- 查看我收藏的 ENV
- 查看我管理的 ENV
- 按环境标识搜索 ENV
- 按服务（PSM）搜索 ENV
- 列出 ENV 下的服务列表
- 列出创建流程可选基准环境
- 查看基准环境可用机房
- 创建前校验环境名
- 创建 ENV
- 向 ENV 部署 TCE/TCC 服务
- 升级 TCE 服务（可指定集群和 SCM 依赖 env_type、SCM版本）
- 按 ENV 平台"集群模板"（如 UI 中"上次所选集群" / "online_cn 默认"）一把部署 TCE 多集群
- 列出某 service 的"集群模板"下拉数据源（cluster_param_template）
- 部署 bytefaas（ByteCloud FaaS）服务到 PPE 泳道
- 升级 PPE 泳道里已挂载的 bytefaas 实例到新的 SCM 版本
- 管理 ENV ByteCopy：按名称查看 ByteCopy service、查看 service 下 instance、查看/添加 instance 的目标地址
- 设备管理（新增/续期/解绑/列表）
- 工单查询（列表/详情）
- 需要跨站点（cn/boe/i18n-tt/i18n-bd/us-ttp/eu-ttp）统一查询

## 前置条件

- 使用通用调用方式：`../../invocation.md`

> 执行前缀见 `../../invocation.md`；下面示例直接写 `bytedcli`。

## Quick start

Commands are grouped under `env site`, `env service`, `env bytecopy`, `env device`, and `env ticket`. Old flat names (e.g. `env list-sites`, `env list-starred-env`, `env deploy-tce-service`) still work as hidden aliases.

```bash
# 查看站点与动态 standard_env 列表
bytedcli env site list

# 查看收藏/管理 ENV（默认查全部站点）
bytedcli env list-starred --page 1 --size 10
bytedcli env list-managed --page 1 --size 10

# 指定站点（支持重复或逗号）
bytedcli env list-starred --env-site cn --env-site boe
bytedcli env list-managed --env-site i18n-tt,us-ttp

# 按环境标识搜索
bytedcli env search --keyword "ppe_coze" --env-site eu-ttp

# 按服务搜索（先 service suggest，再按 psm 查询）
bytedcli env search-service --service "example.service.api" --env-site cn,boe

# 列出 ENV 下的服务列表
bytedcli env service list --env "ppe_qianchuan2" --standard-env online_cn
bytedcli env service list --env "ppe_qianchuan2" --standard-env online_cn --service-types tce --page 1 --page-size 20
bytedcli env service get --instance-id 123456 --standard-env online_cn

# 创建流程：基准环境 / 机房 / 名称校验 / 创建
bytedcli env site baseline-list
bytedcli env site baseline-zones --standard-env online_cn
bytedcli env check-name --name "ppe_demo" --standard-env online_cn
bytedcli env create --name "ppe_demo" --standard-env online_cn --idc LF --visibility private

# 部署/升级服务
bytedcli env service deploy-tce --env "ppe_demo" --standard-env online_i18nbd --psm "flow.bot.open_gateway" --flow-base prod
# 自定义资源租期：UI"添加服务"弹窗里的"租期"输入框对应 --lease-days，--lease-rule-id 透传系统策略 id
bytedcli env service deploy-tce --env "boe_demo" --standard-env boe --psm "demo.sample.svc" --flow-base prod --lease-days 2 --lease-rule-id 145
bytedcli env service deploy-tcc --env "ppe_demo" --standard-env online_i18nbd --psm "ocean.cloud.bot_adapter"
bytedcli env service upgrade-tce --env "ppe_demo" --standard-env online_i18nbd --psm "flow.bot.open_gateway" --cluster-id 350079955 --flow-base prod --scm-env-type prod --scm-repo-version "1.0.0.370"

# 按 ENV 平台"集群模板"部署（等价 UI"集群模板"下拉，一次写入多集群分集群配置）
bytedcli env service list-cluster-templates --psm "demo.psm.tce" --standard-env online_cn
bytedcli env service deploy-tce --env "ppe_demo" --standard-env online_cn --psm "demo.psm.tce" --cluster-template-name "上次所选集群"
bytedcli env service deploy-tce --env "ppe_demo" --standard-env online_cn --psm "demo.psm.tce" --cluster-template-id 22708

# 部署/升级 bytefaas（PPE 泳道）
bytedcli env service deploy-bytefaas --env "ppe_demo_swimlane" --standard-env online_cn --psm "demo.psm.faas"
bytedcli env service deploy-bytefaas --env "ppe_demo_swimlane" --standard-env online_cn --psm "demo.psm.faas" --scm-version "1.0.0.123"
bytedcli env service upgrade-bytefaas --env "ppe_demo_swimlane" --standard-env online_cn --psm "demo.psm.faas" --scm-version "1.0.0.124"

# 允许远程调试：置 meta.debug=true（默认关闭）
bytedcli env service deploy-tce --env "ppe_demo" --standard-env online_cn --psm "demo.psm.tce" --allow-debug
bytedcli env service deploy-bytefaas --env "ppe_demo_swimlane" --standard-env online_cn --psm "demo.psm.faas" --allow-debug

# ENV ByteCopy（SG/EU/US：--site i18n-tt|eu-ttp|us-ttp）
bytedcli env bytecopy service get --site i18n-tt --service-name "demo.service"
bytedcli env bytecopy instance get --site eu-ttp --service-name "demo.service" --instance-name "demo.instance"
bytedcli env bytecopy target-address list --site i18n-tt --instance-id 67890
bytedcli env bytecopy target-address add --site i18n-tt --instance-id 67890 --target-address 192.0.2.11:8080 --ttl 30

# 设备管理
bytedcli env device list --env "ppe_demo" --standard-env online_i18nbd
bytedcli env device add --env "ppe_demo" --standard-env online_i18nbd --device-id 4252524525 --expire-at "2026-02-19T01:19:40.471Z"
bytedcli env device update --env "ppe_demo" --standard-env online_i18nbd --device-id 4252524525 --expire-at "2026-02-19T09:19:58+08:00"
bytedcli env device unbind --standard-env online_i18nbd --device-id 4252524525

# 工单
bytedcli env ticket list --env "ppe_demo" --standard-env online_i18nbd --page 1 --size 10
bytedcli env ticket get --ticket-id 2021755505366867968 --standard-env online_i18nbd
```

## Notes

- 需要结构化输出加 `--json`（全局选项，放在子命令之前，如 `bytedcli --json env ticket get --ticket-id 2021755505366867968 ...`）
- `--env-site` 支持：`cn|boe|i18n-tt|i18n-bd|us-ttp|eu-ttp`
- ByteCopy 命令使用 `--site i18n-tt|eu-ttp|us-ttp`，对应控制台里的 SG、EU TTP、US TTP；不要用 `--env-site`
- `create` 名称规则：
  - `online_*` 必须 `ppe_` 前缀
  - `boe*` 必须 `boe_` 前缀
- Flag renames: `--page-num` is now `--page`; old names still work as hidden aliases

## ENV ByteCopy

### 触发场景

- 用户给出 ENV ByteCopy 控制台 URL，或提到 ByteCopy service / instance。
- 用户要按 service name 或 instance name 查看 ByteCopy service / instance。
- 用户要在具体 instance 上添加"目标地址"。

在 ByteDance 生产网络环境中调用 `env bytecopy --site i18n-tt` 时，设置 `BYTEDCLI_NETWORK_PROFILE=prod`；bytedcli 会自动把 i18n-tt 路由到生产网可达域名。

### 命令示例

```bash
# 查 ByteCopy service
bytedcli env bytecopy service get --site i18n-tt --service-name demo.service

# 查看某个 service 下的 instance
bytedcli env bytecopy instance get --site eu-ttp \
  --service-name demo.service --instance-name demo.instance

# 查看 / 添加 instance 目标地址
bytedcli env bytecopy target-address list --site i18n-tt --instance-id 67890
bytedcli env bytecopy target-address add --site i18n-tt \
  --instance-id 67890 --target-address 192.0.2.11:8080 --ttl 30
```

### 关键参数

- `--site` 支持 `i18n-tt`（SG）、`eu-ttp`（EU TTP）、`us-ttp`（US TTP）。
- `--service-name` 是 ByteCopy service 名称。
- `--instance-name` 是 ByteCopy instance 名称。
- `--instance-id` 来自 `env bytecopy instance get` 或控制台 instance URL。
- `--target-address` 使用 `ip:port`；IPv6 用 `[2001:db8::1]:8080`。
- `target-address add` 的 `--ttl` 单位是分钟，默认 `30`。

## PPE bytefaas 部署

### 触发场景

- 用户说"把 bytefaas/FaaS 发到 PPE 泳道"、"PPE 挂载 FaaS"、"测试环境部署 FaaS"。
- 用户在 PPE/泳道场景下要升级一个已挂载的 bytefaas 实例到新的 SCM 版本。

### 关键区分：PPE 部署 vs 生产发布

- `bytedcli env service deploy-bytefaas` / `upgrade-bytefaas`：走 **ENV 平台**，把 bytefaas 实例挂到 **PPE 泳道**，用于测试与联调。
- `bytedcli faas release create`（`bytedance-faas` skill）：走 **FaaS 平台**，做生产 cluster 的正式发布。

如果用户要做生产发布，改走 `bytedance-faas` skill；PPE/泳道场景走本节命令。

### 命令示例

```bash
# 首次把 bytefaas 服务挂到 PPE 泳道(自动取 prod 基线最新 SCM 版本)
bytedcli env service deploy-bytefaas \
  --env ppe_demo_swimlane --standard-env online_cn \
  --psm demo.psm.faas

# 显式指定 SCM 版本号
bytedcli env service deploy-bytefaas \
  --env ppe_demo_swimlane --standard-env online_cn \
  --psm demo.psm.faas --scm-version 1.0.0.123

# 升级已挂载实例到新的 SCM 版本
bytedcli env service upgrade-bytefaas \
  --env ppe_demo_swimlane --standard-env online_cn \
  --psm demo.psm.faas --scm-version 1.0.0.124
```

### 关键参数

- `--env` / `--standard-env` / `--psm` 必填。
- `--standard-env` 是基线（`online_cn` / `boe` / `i18n` 等），不是泳道类型；PPE 类型由命令本身定位，必要时用 `--env-type` 覆盖。
- `--scm-version` 省略时自动从 ENV 取 prod 基线最新版。
- `--region` / `--cluster` 默认 `cn-north` / `faas-cn-north`。
- `--code-revision` 省略时使用最新 code revision。
- PPE bytefaas 实例默认 14 天短回收，CLI 暂不支持自定义租期。
- **没有** `--branch`：部署制品是 SCM 包，不是 git 分支。
- **没有** `--lease-days`：PPE bytefaas 实例固定为默认 14 天短回收，CLI 不暴露租期参数。

### Agent 易踩坑

- 把 `--standard-env` 当成"泳道类型"：`online_cn` 是基线，`ppe` 才是 env type；两者不要互换。
- 试图传 git 分支或 ICM 镜像标签：目前只支持 SCM 制品，镜像/分支不会被识别。
- 想做生产发布却调用 `deploy-bytefaas`：这条命令只会挂到 PPE 泳道，生产发布请走 `bytedance-faas`。

## 集群模板（Cluster Param Template）

UI 中"集群配置 → 集群模板"下拉对应 ENV 平台的 `cluster_param_template` 资源。
模板返回的 `clusters[]` 已是部署所需的全量字段（`name / zone / virtual_cluster /
dc_infos / cpu / mem / count / base_cluster_id`），CLI 会直接拿来作为 `pre_check`
和 `dsl/env/{env}` 的 `clusters` 数组，**无需再调 create_suggest**。

```bash
# 列出该 service 的所有可选模板（含"上次所选集群"、"<standard_env> 默认"等）
bytedcli env service list-cluster-templates --psm demo.psm.tce --standard-env online_cn

# 等价 UI："集群模板 = 上次所选集群"，一把按多集群分集群配置部署
bytedcli env service deploy-tce --env ppe_demo --standard-env online_cn \
  --psm demo.psm.tce --cluster-template-name "上次所选集群"

# 也可以按 id（从 list 拿到）
bytedcli env service deploy-tce --env ppe_demo --standard-env online_cn \
  --psm demo.psm.tce --cluster-template-id 22708
```

集群配置参数优先级（高 → 低）：
`--cluster-template-id` / `--cluster-template-name` > `--cluster-spec-file`
> `--cluster-names` > 自动 suggest（`--specify-dcs/--zone/--virtual-cluster`）。

模板与 `--cluster-spec-file` / `--specify-dcs` / `--zone` / `--virtual-cluster`
互斥，混用会直接报 ENV_INPUT_ERROR。

## References

- `references/env.md`
