---
name: bytedance-tiktok-gecko
description: "Use bytedcli tiktok-gecko commands to query TikTok Gecko resources (workbench, app, channel, ticket, host-app, deployment, deployment-channel, channel package, online package), and to perform product-level write operations: channel create, channel update, channel SCM repo config create/update, package create, package enable/disable, release create, and package online rollback. Advanced troubleshooting also exposes ticket cancel/retry/execute, but these are ticket lifecycle actions, not primary user scenarios. Trigger this skill whenever the user asks to inspect Gecko console data, list or get Gecko resources, filter Gecko tickets, troubleshoot Gecko IDs/regions, create a Gecko channel, update/edit a Gecko channel's attributes, create or update a Gecko channel's SCM repo config, create/enable/disable a Gecko resource package, create a Gecko release from an existing package/SCM source, or roll back a live online package."
---

# bytedcli TikTok Gecko

## 如何调用 bytedcli

本 skill 支持 TikTok ROW (prod) 与 TikTok BOE i18n 两个站点，二选一即可：

```bash
# Prod (TikTok ROW)：默认推导 TikTok SSO
bytedcli --site i18n-tt --auth-site tiktok <command> [options]

# BOE i18n 分区：默认推导 bytedance SSO
bytedcli --site boe <command> [options]
```

- 支持 `--site`：`i18n-tt`（prod，host `tiktok-gecko-global.tiktok-row.net`）、`boe`（BOE i18n 分区，host `tiktok-gecko-global-boei18n.bytedance.net`）。
- 其它站点（`cn` / `i18n-bd` / `eu-ttp` 等）会被入口直接拒绝，错误码 `TIKTOK_GECKO_SITE_AUTH_MISMATCH`。
- `--auth-site` 通常无需显式传入：`i18n-tt` 默认推导 `tiktok`，`boe` 默认推导 `bytedance`。**不要**在 `i18n-tt` 上显式传 `--auth-site bytedance`，也**不要**在 `boe` 上显式传 `--auth-site tiktok`，会被入口校验拒绝。
- 推荐先全局安装：`NPM_CONFIG_REGISTRY=http://bnpm.byted.org npm install -g @bytedance-dev/bytedcli@latest`，后续直接调用 `bytedcli ...`。仅在无法全局安装时退回到 `NPM_CONFIG_REGISTRY=http://bnpm.byted.org npx -y @bytedance-dev/bytedcli@latest` 作为 fallback；详见 `../../invocation.md`。

### 站点对照表（site → host / SSO / JWT issuer）

| `--site` | Backend host | SSO | JWT issuer | 隐式 vregion |
| --- | --- | --- | --- | --- |
| `i18n-tt` | `https://tiktok-gecko-global.tiktok-row.net` | `tiktok` | `cloud.tiktok-row.net` | （无须） |
| `boe` | `https://tiktok-gecko-global-boei18n.bytedance.net` | `bytedance` | `cloud.bytedance.net` | `boei18n`（CLI 自动注入，无需手动 `--vregion`） |

后文示例统一以 `--site i18n-tt --auth-site tiktok` 写出；要打到 BOE，直接把这两个 flag 替换成 `--site boe`（auth-site 通常省略），其余参数完全一致。CLI 内部会按 `--site` 自动切换 base URL、JWT host 与 permission apply URL。

## When to use

- 查询 TikTok Gecko 工作台关注项和待处理工单
- 按名称或条件分页查询 Gecko App / Channel / Ticket / Host App
- 根据 ID 拉取单个 Gecko 资源详情（App、Channel、Ticket、Host App、Deployment）
- 查看 Deployment 下关联的 Channel 列表
- 需要基于 CLI 快速确认 Gecko 资源 ID、地域、状态或关联关系
- **产品级写操作**：创建 Channel（`channel create`）、更新 Channel（`channel update`）、创建/更新 Channel SCM 仓库配置（`channel scm-config create/update`）、创建资源包（`package create`）、启用/禁用资源包（`package enable/disable`）、基于已有 package / SCM source 发起 Release（`release create`）、回滚线上包（`package online rollback`）
- **高级排障 / 内部编排动作**：`ticket cancel/retry/execute` 仅用于已有工单的生命周期操作，不作为普通用户主入口推荐，也不应作为 bytedcli skill 使用场景 UV 天花板统计项。

## 前置条件

- 建议先确认目标站点登录态可用：

```bash
# Prod
bytedcli --site i18n-tt --auth-site tiktok auth status
# BOE i18n
bytedcli --site boe auth status
```

- 若未登录或 token 失效，先执行对应站点的 auth login：

```bash
# Prod 登录态走 TikTok SSO
bytedcli --site i18n-tt --auth-site tiktok auth login
# BOE 登录态走 bytedance SSO
bytedcli --site boe auth login
```

> Prod 与 BOE 使用不同 SSO，登录态彼此独立；切站点前确认对应站点的 token 仍有效。

## Quick start — 只读查询

> 后文示例统一写 prod (`--site i18n-tt --auth-site tiktok`)。要改打 BOE，直接把这两 flag 替换成 `--site boe`，命令其余部分不变。例如：
>
> ```bash
> bytedcli --site boe tiktok-gecko channel get --channel-id <id>
> bytedcli --site boe tiktok-gecko ticket get --ticket-id <id>
> ```

```bash
# 工作台概览（关注 Channel/App/Deployment + 待处理工单）
bytedcli --site i18n-tt --auth-site tiktok tiktok-gecko workbench get

# 列表查询
bytedcli --site i18n-tt --auth-site tiktok tiktok-gecko app list --page 1 --page-size 20
bytedcli --site i18n-tt --auth-site tiktok tiktok-gecko channel list --region row --name demo-channel
bytedcli --site i18n-tt --auth-site tiktok tiktok-gecko ticket list --creator demo.user --status pending
bytedcli --site i18n-tt --auth-site tiktok tiktok-gecko host-app list --keyword demo-app

# 详情查询（按 ID）
bytedcli --site i18n-tt --auth-site tiktok tiktok-gecko app get --app-id <app_id>
bytedcli --site i18n-tt --auth-site tiktok tiktok-gecko channel get --channel-id <channel_id>
bytedcli --site i18n-tt --auth-site tiktok tiktok-gecko ticket get --ticket-id <ticket_id>
bytedcli --site i18n-tt --auth-site tiktok tiktok-gecko host-app get --host-app-id <host_app_id>
bytedcli --site i18n-tt --auth-site tiktok tiktok-gecko deployment get --deployment-id <deployment_id>

# 等待工单跑到终态（内置 polling，--watch 模式；agent 不要再自己写 sleep loop）
bytedcli --site i18n-tt --auth-site tiktok tiktok-gecko ticket get --ticket-id <ticket_id> --watch --watch-interval 5 --watch-timeout 600

# 查询部署下的 Channel
bytedcli --site i18n-tt --auth-site tiktok tiktok-gecko deployment channel list --deployment-id <deployment_id> --type all

# 查询某个 Channel 下的资源包（推荐）
bytedcli --site i18n-tt --auth-site tiktok tiktok-gecko channel package list --channel-id-list <channel_id_a>,<channel_id_b> --creator-list demo.user

# 查询线上包列表（GET /gecko/api/channel/package-online/list）
bytedcli --site i18n-tt --auth-site tiktok tiktok-gecko package online list --channel-region-id <channel_region_id> --target-os 2 --page 1 --page-size 20

# 资源包高级过滤（与控制台 package-meta/list 参数对齐）
bytedcli --site i18n-tt --auth-site tiktok tiktok-gecko channel package list \
  --channel-id-list <channel_id_a>,<channel_id_b> \
  --region-list row,eu-ttp,us-ttp \
  --target-os-list 0,1,2,3,4,5,6 \
  --meta-package-id-list <meta_package_id> \
  --region-package-id-list <region_package_id> \
  --package-type-list 1,2 \
  --env-lane-list ppe \
  --creator-list demo.user \
  --page 1 --page-size 20
```

## Quick start — 写操作（含风险等级）

> **写操作不做客户端权限预检**：所有写命令直接发请求，由后端 `permission_service.checkCurrentUserPermission`（`@CheckPermission` AOP）裁决；权限被拒时 CLI 错误渲染层（`src/services/tiktok_gecko/error_render.ts`）会基于可选的 `--channel-id` 自动附上申请会员链接（host 也按 site 自动切换：prod 用 `tiktok-gecko-global.tiktok-row.net`、BOE 用 `tiktok-gecko-global-boei18n.bytedance.net`；缺 `--channel-id` 时降级到 `/gecko/site/v2` 首页）。详情见下方 "Permission denial 错误渲染（server-side single source of truth）" 小节。
>
> **写命令同样支持 `--site boe`**：把示例里的 `--site i18n-tt --auth-site tiktok` 替换成 `--site boe`，request body / risk gating / dry-run 流程完全一致；CLI 自动改写 base URL 与 permission apply URL。BOE 上的 channel id 与 prod 是不同的命名空间，**别复用 prod 的 channelId**——先在 BOE 上用 `--site boe tiktok-gecko channel list` 拿到对应 id 再继续。

### 1. Channel Create（HIGH RISK，必须先 `--dry-run` 再 `--yes`）

创建一个新的 Gecko channel（`POST /gecko/api/channel/create`）。该命令会创建一个后续工单（返回 `ticketId`）；channel 是后续 release 发布的承载资源，属于 deployment-agnostic 写操作（没有 `deploymentType` 可供判级），risk gating 始终判定为 **HIGH**，必须走 `--dry-run` → 用户确认 → `--yes` 二段式。

```bash
# Step 1: 预览请求体，向用户展示（HIGH RISK — 不要自动确认）
# channel-type / package-type 用语义值（数字仍兼容）；--creator 省略时取登录身份
bytedcli --site i18n-tt --auth-site tiktok tiktok-gecko channel create \
  --target-deployment-meta-id <meta_id> \
  --deployment-id <deployment_id> \
  --name demo-channel \
  --channel-type offline+online \
  --package-type compressed-file \
  --service-tree-id <service_tree_id> \
  --x-target-regions row,eu-ttp \
  --dry-run

# Step 2: 用户明确同意后，把同一条命令的 --dry-run 换成 --yes 重新执行
bytedcli --site i18n-tt --auth-site tiktok tiktok-gecko channel create \
  --target-deployment-meta-id <meta_id> \
  --deployment-id <deployment_id> --name demo-channel --channel-type offline+online --package-type compressed-file \
  --service-tree-id <service_tree_id> --x-target-regions row,eu-ttp --yes

# 带可选字段（角色、子 channel、config/business）的完整示例（同样先 --dry-run 再 --yes）
bytedcli --site i18n-tt --auth-site tiktok tiktok-gecko channel create \
  --target-deployment-meta-id <meta_id> \
  --deployment-id <deployment_id> --name demo-channel --channel-type offline+online --package-type compressed-file \
  --service-tree-id <service_tree_id> --x-target-regions row,eu-ttp \
  --creator demo.user --business-type 0 --masters demo.master --developers demo.dev1,demo.dev2 --approvers demo.approver \
  --support-sub-channel --sub-download-priority 1 \
  --channel-group on_demand --normal-prefix-rule '${deploymentId}/teko/resource' --pkg-max-size 10485760 \
  --business-scope 0 --tech-type 0 --discard-time '2026-12-31 08:00' --dry-run
```

- **必填项**：`--target-deployment-meta-id`（可重复或逗号分隔，至少一个）、`--deployment-id`、`--name`、`--channel-type`、`--package-type`、`--service-tree-id`、`--x-target-regions`（见下方坑 3：必须显式收敛创建 region，否则后端会取一个更宽的默认 region 集合，偶现 `"<group>" isn't exist in all region!`）。
- **`--channel-type` / `--package-type` 接受语义值**（与 `release create --apply-type` 一致的词表）：`--channel-type offline | online | offline+online`；`--package-type compressed-file | uncompressed-file | settings-file | settings-data`。原始数字编码仍兼容（如 `--channel-type 1`）。
- **`--creator` 可选**：省略时取你的登录身份（与 `release create` 等写命令一致；后端最终也以 JWT 身份为准）。仅在需要代他人记名时显式传 `--creator <username>`。
- **角色/开关类可选项**：`--masters` / `--developers` / `--approvers`（csv），`--disable-distribute` / `--disable-patch` / `--package-need-approve` / `--disable-self-approve`（布尔开关，置位后对应字段设为 1）。
- **子 channel**：`--main-channel-id`（省略或 0 表示这是主 channel）、`--support-sub-channel`、`--sub-download-priority`（0=独立，1=随主 channel）。
- **config 段**：`--channel-group`（csv，几乎必填，见下方坑 3）、`--normal-prefix-rule`（多 app 用 `${deploymentId}` 模板，见坑 2）、`--pkg-max-size`。
- **business 段**：`--business-scope`、`--tech-type`、`--discard-time`。
- ⚠️ `--target-deployment-meta-id` 是 deployment id 列表（见坑 1），`--normal-prefix-rule` 多 app 用 `${deploymentId}` 模板（见坑 2）。**别逐字照抄参照 channel 的配置**。
- 非 TTY 环境下缺 `--yes` 会以结构化错误码 `TIKTOK_GECKO_HIGH_RISK_NEED_YES` 拒绝执行；TTY 下会弹 `Proceed with HIGH RISK channel create? [y/N]` 交互 prompt。
- 创建成功后返回 `ticketId`，但**工单不会自动执行**（停在待审批/待执行态）。channel create 的工单**不能用 CLI 的 `ticket execute` 驱动**，**必须把工单链接返回给用户，让用户在控制台打开并确认执行**：
  - 链接格式：`https://tiktok-gecko-global.tiktok-row.net/gecko/site/ticket/<ticketId>`（BOE 站点把 host 换成 `tiktok-gecko-global-boei18n.bytedance.net`）。
  - 例如返回的 `ticketId` 为 `<ticket_id>` 时，给用户 `https://tiktok-gecko-global.tiktok-row.net/gecko/site/ticket/<ticket_id>`，提示「请打开此工单确认并执行」。执行完成后再用 `channel list --name <name>` 确认 region/deployment 是否齐全。

#### Channel Create 实战要点 / 常见坑（MUST READ）

以下都是实际创建 channel 时高频踩的坑，按报错顺序排列。参照已有 channel 复制配置时尤其注意坑 2（前缀模板不要逐字照抄）。

1. **`--target-deployment-meta-id` = 目标 app 的 deployment id 列表，不是 channel meta id。**
   - 想让 channel 同时覆盖多个 app（如 TIKTOK + Musically），就把这些 app 各自的 in_house/online deployment id 全列进去（例如 TIKTOK=`1,2`、Musically=`3,4` → `--target-deployment-meta-id 1 2 3 4`）。
   - 不确定有哪些 deployment id 时：`channel get --channel-id <参照channel>` 看 `relatedDeploymentIds`，或 `workbench get` 看目标 channel 的 `deploymentMetaList[].deploymentId`，或 `deployment get --deployment-id <id>` 看 `relatedDeployments`（同一 app 的 in_house↔online 互为 related）。
   - `--deployment-id`（单数，必填）填其中一个主 deployment（一般填 online，如 `2`）。

2. **`--normal-prefix-rule` 多 app 必须用模板 `${deploymentId}/teko/resource`，不要硬编码数字前缀。**
   - 字面量前缀（如 `7/teko/resource`）跨多个 app 会报 `[30000] Can't set the same prefix rule under multiple apps!`；即使单 app，硬编码的数字若不属于目标 deployment 还会报 `Your default prefix rule use illegal deploymentId!`。
   - 正确写法是字面 `${deploymentId}` 模板（shell 里务必用**单引号**包住，避免被展开成空串），后端会按每个 deployment 自动替换成各自的 id。参照 channel 里看到的 `7/teko/resource` 是历史遗留/控制台特殊产物，**不要照抄**。
   - 不需要自定义前缀时，直接省略 `--normal-prefix-rule`，让后端自动分配。

3. **`--x-target-regions` 现在是 channel create 的必填项；它决定 channel/工单在「哪些 region」创建。`--channel-group` 必须在这些目标 region 都已注册，否则报 `"<group>" isn't exist in all region!`；但完全不传 group 又会报 `[CreateTicket]: 'ResourceItems' params should not be empty!`（group 实际是生成资源项的必需输入）。**
   - 为什么必填：不传 `--x-target-regions` 时后端会自行取一个**更宽的默认 region 集合**，可能命中某个没注册该 group 的 region，于是整单被偶现拒绝（`isn't exist in all region!`）。显式收敛 region 后行为才确定，因此 CLI 缺该参数会直接报错并提示。
   - 典型坑：`us-ttp`（USDS 合规隔离区，独立 CDN/cloud）常常没有注册对应 channel group，于是带 `us-ttp` 的整单被拒。
   - 应对：用 `--x-target-regions` 把创建范围**收敛到 group 真实存在的 region**（例如先 `--x-target-regions row,eu-ttp` 建好，us-ttp 等控制台补齐 group 注册后再单独扩区）。要带 us-ttp 必须确认该 group 已在 us-ttp 注册。
   - 排查「到底哪个 region 缺 group」没有只读接口，只能用 `--x-target-regions` 逐步缩小（每次失败不会创建任何资源，可安全试探）。

### 2. Channel Update（HIGH RISK，必须先 `--dry-run` 再 `--yes`）

更新一个已存在的 Gecko channel（`POST /gecko/api/channel/update`）。channel 创建时信息很可能没有一次填全/填对，本命令用于修正：以 `--id` 定位 channel，只传需要修改的字段（后端按 patch 语义处理），同样创建后续工单（返回 `ticketId`）。与 create 一样属于 deployment-agnostic 写操作，risk gating 始终 **HIGH**，必须 `--dry-run` → 用户确认 → `--yes`。

```bash
# Step 1: 预览更新 payload，向用户展示（HIGH RISK — 不要自动确认）
bytedcli --site i18n-tt --auth-site tiktok tiktok-gecko channel update \
  --target-deployment-meta-id <meta_id> \
  --id <channel_id> \
  --service-tree-id <new_service_tree_id> \
  --dry-run

# Step 2: 用户明确同意后，把同一条命令的 --dry-run 换成 --yes 重新执行
bytedcli --site i18n-tt --auth-site tiktok tiktok-gecko channel update \
  --target-deployment-meta-id <meta_id> \
  --id <channel_id> --service-tree-id <new_service_tree_id> --yes

# 修改多个属性（业务类型 / 分发开关 / 子 channel / business 段）的示例（先 --dry-run 再 --yes）
bytedcli --site i18n-tt --auth-site tiktok tiktok-gecko channel update \
  --target-deployment-meta-id <meta_id> \
  --id <channel_id> \
  --business-type 0 --disable-distribute --package-need-approve \
  --support-sub-channel --main-channel-id <main_channel_id> \
  --business-scope 0 --tech-type 0 --discard-time '2026-12-31 08:00' --dry-run
```

- **必填项**：`--target-deployment-meta-id`（可重复或逗号分隔，至少一个）、`--id`（要更新的 channel id）。其余字段都是可选的，只传需要修改的即可。
- **可改属性**：`--business-type`、`--disable-distribute` / `--disable-patch` / `--package-need-approve` / `--disable-self-approve`（布尔开关，置位后设为 1）、`--service-tree-id`、`--main-channel-id`、`--support-sub-channel`。
- **business 段**：`--business-scope`、`--tech-type`、`--discard-time`。
- 与 create 不同，update 不能改 `name` / `channelType` / `packageType` / `creator` / 角色成员；这些在创建时确定，成员变更走控制台的成员管理入口。
- 非 TTY 环境下缺 `--yes` 会以 `TIKTOK_GECKO_HIGH_RISK_NEED_YES` 拒绝执行；TTY 下会弹 `Proceed with HIGH RISK channel update? [y/N]` 交互 prompt。
- 更新成功后返回的 `ticketId` 可用 `tiktok-gecko ticket get --ticket-id <id> --watch` 等待终态。

### 2.5 Channel SCM Repo Config（HIGH RISK，必须先 `--dry-run` 再 `--yes`）

修改 channel 的 SCM 仓库分发配置（repo 驱动的 offline/online 资源分发）。**典型时序**：先 `channel create`（或 `channel update`）创建/修正 channel 并执行其工单完成后，再用本命令为 channel 配置 SCM 仓库。两个子命令：

- `channel scm-config create`（`POST /gecko/api/scm-repo-config/create`）：为 channel 新建 SCM 仓库配置。
- `channel scm-config update`（`POST /gecko/api/scm-repo-config/update`）：以 `--id`（配置数据 id）patch 已有 SCM 仓库配置。

二者都是 deployment-agnostic 写操作、都会创建后续工单（返回 `ticketId`），risk gating 始终 **HIGH**，必须 `--dry-run` → 用户确认 → `--yes`。

```bash
# Create — Step 1: 预览（HIGH RISK — 不要自动确认）
bytedcli --site i18n-tt --auth-site tiktok tiktok-gecko channel scm-config create \
  --target-deployment-meta-id <meta_id> \
  --channel-meta-id <channel_meta_id> \
  --channel-id <channel_id> \
  --scm-repo org/repo \
  --online-config '[{"configType":"all","resourcePath":"./dist"}]' \
  --dry-run

# Create — Step 2: 用户同意后把 --dry-run 换成 --yes 重新执行
bytedcli --site i18n-tt --auth-site tiktok tiktok-gecko channel scm-config create \
  --target-deployment-meta-id <meta_id> \
  --channel-meta-id <channel_meta_id> --channel-id <channel_id> --scm-repo org/repo \
  --online-config '[{"configType":"all","resourcePath":"./dist"}]' --yes

# Update — 以配置数据 id 定位，patch offline/online 列表（先 --dry-run 再 --yes）
bytedcli --site i18n-tt --auth-site tiktok tiktok-gecko channel scm-config update \
  --target-deployment-meta-id <meta_id> \
  --channel-meta-id <channel_meta_id> --scm-repo org/repo --id <config_id> \
  --offline-config '[{"configType":"iOS","resourcePath":"./ios","needUnzip":1}]' --dry-run
```

- **Create 必填**：`--target-deployment-meta-id`（可重复/逗号分隔，至少一个）、`--channel-meta-id`、`--channel-id`、`--scm-repo`，且 `--offline-config` / `--online-config` 至少提供一个。
- **Update 必填**：`--target-deployment-meta-id`、`--channel-meta-id`、`--scm-repo`、`--id`（配置数据 id），同样至少提供一个 config 列表。
- ⚠️ **`--target-deployment-meta-id` 必须把目标的所有 deployment id 列全（和 channel create 坑 1 同根因）。** SCM 配置按 `targetDeploymentMetaIdList` 逐个 deployment 写入，只传一个（例如只传 TIKTOK online 的 meta id）就**只会改到那一个 deployment**，TIKTOK 内测、MUSICALLY 在线、MUSICALLY 内测都不会被更新（偶发"只改了 TIKTOK 在线"就是这么来的）。想同时覆盖 TIKTOK + Musically 的 in_house/online 四个环境，就把四个 deployment id 全列进去（`--target-deployment-meta-id <tiktok_inhouse> <tiktok_online> <musically_inhouse> <musically_online>`）。不确定有哪些 id：`channel get --channel-id <channel_id>` 看 `relatedDeploymentIds`，或 `workbench get` 看 `deploymentMetaList[].deploymentId`，或 `deployment get --deployment-id <id>` 看 `relatedDeployments`。
- **配置列表入参**：`--offline-config` / `--online-config` 接收 JSON 数组（每个元素是一条配置明细，至少含 `configType` 与 `resourcePath`）；也可用 `--offline-config-file` / `--online-config-file` 从文件读取同样的 JSON。未知字段会在落库前被裁剪，可直接粘贴控制台抓到的明细对象。
- **配置明细字段**：`configType`（如 `all`/`CDN`/`iOS`/`Android`/`Web`/`Mac`/`Windows`）、`resourcePath`（如 `./dist`）必填；可选 `targetAppVersion`、`issueType`、`issueValue`、`needUnzip`、`enableCDNDeploy`、`delIfDownloadFailed`、`delOldPkgBeforeDownload`、`useBytest`、`useProbe`、`isLynx`、`dids`、`webHeader`、`envLane`（数组）、`extend`（数组）、`areaDistributeRule`（`{enable,type,value[]}`）、`enable`。
- 非 TTY 环境下缺 `--yes` 会以 `TIKTOK_GECKO_HIGH_RISK_NEED_YES` 拒绝执行；TTY 下会弹 `Proceed with HIGH RISK channel scm-config create/update? [y/N]` 交互 prompt。
- 成功后返回 `ticketId`。与 channel create/update 不同，**SCM 配置工单支持用 CLI 的 `ticket execute` 直接驱动执行，无需人工打开控制台确认**：审批通过后工单停在待执行态，用 `tiktok-gecko ticket execute --ticket-id <id>` 触发执行（仍走 risk gating，按目标 deployment 传 `--deployment-type`，省略则 fail-safe 视为 HIGH），再用 `tiktok-gecko ticket get --ticket-id <id> --watch` 等待终态。

#### JSON 多行换行（必读）

config 列表是 JSON，建议写成单行内联字符串（如上例）。若必须在 shell 里跨多行，用 `$'...'` 写换行，不要用普通双引号里写 `\n`（bash/zsh 双引号不解释 `\n`，CLI 会拿到字面量两个字符）。更稳妥的做法是把 JSON 存成文件后用 `--online-config-file <path>` / `--offline-config-file <path>` 读取。

### 3. Package Create / Enable / Disable（按 deployment type 判级）

`package create` 覆盖 `PACKAGE_CREATE`，支持 offline / online 两个后端 create endpoint。因为离线包和线上包创建表单字段较多且结构不同，CLI 当前以 `--body-json` / `--body-file` 透传后端请求体；body 至少需要包含 `channelName`、`targetOs`、`targetAppVersion`，以及 `targetDeploymentAkList` 或 `targetDeploymentMetaIdList`。offline create 还需要 `url` 或 `candidatePackageId`。

```bash
# Offline package create（用户测试 / in-house 场景）
bytedcli --site i18n-tt --auth-site tiktok tiktok-gecko package create \
  --type offline \
  --body-json '{"channelName":"demo-channel","targetDeploymentAkList":["<ak>"],"url":"<pkg_url>","targetOs":2,"targetAppVersion":"1.2.3","issueType":1,"issueValue":{"pct":100}}' \
  --x-target-regions row \
  --deployment-type in-house \
  --dry-run

# Online package create（prod/online 必须先 dry-run，确认后再 --yes）
bytedcli --site i18n-tt --auth-site tiktok tiktok-gecko package create \
  --type online \
  --body-file /path/to/create-online-package.json \
  --x-target-regions row \
  --deployment-type online \
  --dry-run
```

`package enable` / `package disable` 覆盖 `PACKAGE_ENABLE` / `PACKAGE_DISABLE`，底层接口是 `POST /gecko/api/channel/package-meta/switch-package-status`。单个目标可用 `--region + --package-region-id + --package-type`，多个目标用重复 `--package REGION:PACKAGE_REGION_ID:PACKAGE_TYPE`。

```bash
# Enable offline package
bytedcli --site i18n-tt --auth-site tiktok tiktok-gecko package enable \
  --package row:<package_region_id>:offline_package \
  --x-target-regions row \
  --deployment-type in-house \
  --dry-run

# Disable online package（prod/online 必须先 dry-run，确认后再 --yes）
bytedcli --site i18n-tt --auth-site tiktok tiktok-gecko package disable \
  --region row \
  --package-region-id <package_region_id> \
  --package-type online_package \
  --x-target-regions row \
  --deployment-type online \
  --dry-run
```

- `--type`：`offline` → `/gecko/api/channel/package/create`；`online` → `/gecko/api/channel/package-online/create`。
- `--package-type` / `--package` 第三段：`offline_package` 或 `online_package`。
- `--deployment-type` 只用于 CLI 端 risk gating：`in-house` 判 low；`online` 或省略都判 HIGH。
- prod package 通常仍应走业务特定流水线；这个能力主要用于用户测试、排障、或明确需要直接调用 Gecko package API 的场景。

### 4. In-house Release（low risk，agent 可直接执行）

`release create` 的对象是已有 Gecko resource package / SCM source 的发布动作，不等同于从零创建资源包。若还没有资源包，先走 `package create` 或业务流水线；prod package 发布通常应走业务特定流水线，不应默认用本 skill 替代。

```bash
bytedcli --site i18n-tt --auth-site tiktok tiktok-gecko release create \
  --channel-name demo-channel \
  --channel-id <channel_id> \
  --apply-type offline \
  --description 'fix demo bug' \
  --target-region row \
  --target-deployment-ak <ak> \
  --from-branch master --scm-repo my/repo \
  --target-os 2 --target-app-version 1.2.3 \
  --deployment-type in-house
```

- `--deployment-type in-house` 让 risk gating 判定为 low，可直接执行。
- 不传 `--deployment-type` 会被 fail-safe 判为 HIGH，需要 `--dry-run` + `--yes` 二段式。

### 5. Online Release（HIGH RISK，必须先 `--dry-run` 再 `--yes`）

```bash
# Step 1: 预览请求体，向用户展示
bytedcli --site i18n-tt --auth-site tiktok tiktok-gecko release create \
  --channel-name demo-channel \
  --channel-id <channel_id> \
  --apply-type offline+online \
  --description 'launch v2' \
  --target-region row \
  --target-deployment-ak <ak> \
  --from-scm-version 1.2.3 --scm-repo my/repo \
  --target-os 2 --target-app-version 1.2.3 \
  --online-issue-percent 100 --online-auto-start-release \
  --deployment-type online --dry-run

# Step 2: 用户明确同意后，agent 把同一条命令加 --yes 重新执行
bytedcli --site i18n-tt --auth-site tiktok tiktok-gecko release create \
  ... --channel-id <channel_id> --deployment-type online --yes
```

### 6. Online Package Rollback（ALWAYS HIGH RISK）

```bash
# Step 1: 预览（推荐传 --channel-id；CLI 不做客户端预检，但后端拒绝时会用它构造申请会员链接 deep-link）
bytedcli --site i18n-tt --auth-site tiktok tiktok-gecko package online rollback \
  --region row \
  --region-ticket-id <region_ticket_id> \
  --package-id <current_pkg_id> \
  --rollback-package-id <target_pkg_id> \
  --channel-id <channel_id> \
  --dry-run

# Step 2: 用户明确同意后，re-run with --yes
bytedcli --site i18n-tt --auth-site tiktok tiktok-gecko package online rollback \
  --region row \
  --region-ticket-id <region_ticket_id> \
  --package-id <current_pkg_id> \
  --rollback-package-id <target_pkg_id> \
  --channel-id <channel_id> \
  --yes
```

### 7. Advanced: Ticket cancel / retry / execute

这些命令是已有工单的生命周期动作，不代表独立 Gecko 产品能力。Agent 不应在普通任务里把它们作为首选入口；只有在用户明确要求处理某个 ticket，或上层业务命令已创建 ticket 且需要继续编排时才使用。

```bash
# 取消（low risk，可直接执行；推荐先 list/get 确认 ticket）
# --channel-id 可选；CLI 不做客户端预检，权限只由后端裁决，传上后只用于在被拒时构造申请会员链接（不传则 apply URL 降级为首页）
bytedcli --site i18n-tt --auth-site tiktok tiktok-gecko ticket cancel --ticket-id <ticket_id> --channel-id <channel_id>

# 重试（low risk）
bytedcli --site i18n-tt --auth-site tiktok tiktok-gecko ticket retry --ticket-id <ticket_id> --channel-id <channel_id>

# 在 in-house 工单上执行（low risk）
bytedcli --site i18n-tt --auth-site tiktok tiktok-gecko ticket execute --ticket-id <ticket_id> --channel-id <channel_id> --deployment-type in-house

# 在 online 工单上执行（HIGH RISK，必须先 --dry-run 再 --yes）
bytedcli --site i18n-tt --auth-site tiktok tiktok-gecko ticket execute --ticket-id <ticket_id> --channel-id <channel_id> --deployment-type online --dry-run
bytedcli --site i18n-tt --auth-site tiktok tiktok-gecko ticket execute --ticket-id <ticket_id> --channel-id <channel_id> --deployment-type online --yes

# 可选：限定到特定 region ticket（repeatable）
bytedcli --site i18n-tt --auth-site tiktok tiktok-gecko ticket cancel \
  --ticket-id <ticket_id> \
  --region-ticket row:rt_abc \
  --region-ticket eu-ttp:rt_def
```

`--region-ticket` 接收 `region:regionTicketId[:nodeId]` 格式，可重复传多个；不传则后端默认对所有满足条件的 region ticket 生效。

> 所有写命令的 `--channel-id` 都是**可选**的。它**不会**触发任何客户端预检——后端始终是权限的唯一可信源——CLI 仅在后端返回 `CHECK_PERMISSION_ERROR` 时用它来构造申请会员链接（deep-link）。

## Permission denial 错误渲染（server-side single source of truth）

CLI 不再做客户端权限预检。所有写命令直接发请求，由后端 `permission_service.checkCurrentUserPermission`（`@CheckPermission` AOP）裁决。被拒时后端返回 `ResponseCodeEnum.CHECK_PERMISSION_ERROR = 3` 的响应，CLI 客户端把它包装成：

```text
tiktok-gecko API error: [3] Permission denied in regions: row. Username: alice.doe, Resource: <channelName>, Url: https://...
```

**`src/services/tiktok_gecko/error_render.ts`** 在 service 层 `await` 每个写 API 时统一捕获并增强：

- 命中权限拒绝（`code === "TIKTOK_GECKO_ERROR"` + 含 `[3] ` / `permission denied` / `no permission` / `don't have permission`）时，重新抛出
  `AppError(code: "TIKTOK_GECKO_PERMISSION_DENIED")`，并附加 `hint`、`details.applyUrl`、`details.channelId`、`details.site`、`details.originalMessage`。
- message 在原文末尾追加单独一行 `Apply membership/role at: <applyUrl>`，避免被单行日志截断。
- 其他错误（输入校验、`SERVICE_ERROR=10000`、HTTP 4xx/5xx 等）原样透传，保持 stack trace 与实例不变。

申请入口 URL 模板（host 按 `--site` 自动切换；缺 `--channel-id` 时降级为 `/gecko/site/v2`）：

```text
# --site i18n-tt（默认）
https://tiktok-gecko-global.tiktok-row.net/gecko/site/v2/channel/<channelId>?moduleType=memberManagement
# --site boe
https://tiktok-gecko-global-boei18n.bytedance.net/gecko/site/v2/channel/<channelId>?moduleType=memberManagement
```

### 行为矩阵

| Action 入口 | `--channel-id` 默认行为 |
| --- | --- |
| `channel.create` | 不接收 `--channel-id`（channel 尚未创建）；权限被拒时 apply URL 降级为 `/gecko/site/v2` 首页 |
| `channel.update` | 不接收 `--channel-id`（用 `--id` 定位目标 channel）；权限被拒时 apply URL 降级为 `/gecko/site/v2` 首页 |
| `release.create` | 可选；缺省时 apply URL 降级为 `/gecko/site/v2` 首页 |
| `ticket.cancel/retry/execute` | 可选；ticket payload 本身不带 channel id，不传则 apply URL 降级为首页 |
| `package.online.rollback` | 可选；不传则 apply URL 降级为首页 |

### 设计决策

- **后端 = single source of truth**：CLI 不再额外打一次 `get-permissions-by-meta-resource`。`channel_master / channel_admin / channel_package_write / channel_approver` 等具体权限规则全部由后端 AOP 维护，避免客户端 / 服务端漂移。
- **god / 管理员账号** 走后端 `assignPermission=true` 通配自动放行，与 CLI 无关。
- **dry-run 不会触发权限校验**（因为根本不发请求）。如果担心 dry-run 看到 OK 但 `--yes` 被后端拒，就先用低风险或 in-house deployment 验证，或直接 `--yes` 并阅读错误。
- **错误结构化字段**（用于 `--json` 模式 / agent 编程消费）：
  ```json
  {
    "code": "TIKTOK_GECKO_PERMISSION_DENIED",
    "hint": "Apply membership / role on TikTok Gecko channel <channel_id>: https://...",
    "details": {
      "applyUrl": "https://tiktok-gecko-global.tiktok-row.net/gecko/site/v2/channel/<channel_id>?moduleType=memberManagement",
      "channelId": "<channel_id>",
      "site": "i18n-tt",
      "originalCode": "TIKTOK_GECKO_ERROR",
      "originalMessage": "tiktok-gecko API error: [3] Permission denied in regions: row. Username: ..."
    }
  }
  ```

## Stability Rules（MUST follow）

| 命令 | 默认风险 | 触发因素 |
| --- | --- | --- |
| `channel create` | **HIGH（永远）** | 资源创建、deployment-agnostic（无 `deploymentType` 判级）；risk gating 始终 high，必须 `--dry-run` → `--yes` |
| `channel update` | **HIGH（永远）** | 资源更新、deployment-agnostic（无 `deploymentType` 判级）；risk gating 始终 high，必须 `--dry-run` → `--yes` |
| `channel scm-config create` | **HIGH（永远）** | repo 驱动的分发配置写入、deployment-agnostic；risk gating 始终 high，必须 `--dry-run` → `--yes` |
| `channel scm-config update` | **HIGH（永远）** | repo 驱动的分发配置更新、deployment-agnostic；risk gating 始终 high，必须 `--dry-run` → `--yes` |
| `package create` | low | high 当 `--deployment-type online`；不传 `--deployment-type` 也 fail-safe 升 high |
| `package enable` | low | high 当 `--deployment-type online`；不传 `--deployment-type` 也 fail-safe 升 high |
| `package disable` | low | high 当 `--deployment-type online`；不传 `--deployment-type` 也 fail-safe 升 high |
| `release create` | low | high 当 `--deployment-type online`；不传 `--deployment-type` 也 fail-safe 升 high |
| `package online rollback` | **HIGH（永远）** | always destructive，影响线上服务 |
| `ticket cancel` | low | — |
| `ticket retry` | low | — |
| `ticket execute` | low | high 当 `--deployment-type online`；不传 `--deployment-type` 也 fail-safe 升 high |

> Risk gating 与 `--site` 维度无关。`--site boe` 上的 high-risk 命令同样需要 `--dry-run` → 用户确认 → `--yes` 二段式；BOE 也是有真实流量的环境，不要因为名字带 BOE 就降级处理。

### `channel create` / `channel update` 安全规则（MUST follow）

1. **ALWAYS HIGH RISK**：channel 是后续 release 发布的承载资源，且没有 `deploymentType` 可供降级，create 与 update 的 risk gating 始终 high。
2. **必须先 `--dry-run`**：把请求体（`targetDeploymentMetaIdList`、base 字段、可选 config/business 等；update 还要确认改了哪些字段）完整展示给用户，等用户明确确认后再加 `--yes`。
3. **不要默认带 `--yes` 静默执行**；非 TTY 缺 `--yes` 会以 `TIKTOK_GECKO_HIGH_RISK_NEED_YES` 拒绝。
4. **update 用 `--id` 定位、按需传字段**：channel 创建时常常信息没填全/填对，update 只传需要修正的字段即可；`name` / `channelType` / `packageType` / `creator` / 角色成员不可通过 update 修改。

### `channel scm-config create` / `channel scm-config update` 安全规则（MUST follow）

1. **ALWAYS HIGH RISK**：SCM 仓库配置驱动 channel 的资源分发，且没有 `deploymentType` 可供降级，create 与 update 的 risk gating 始终 high，必须 `--dry-run` → 用户确认 → `--yes`。
2. **必须先 `--dry-run`**：把请求体（`targetDeploymentMetaIdList`、`channelMetaId`、`scmRepo`、`data` 下的 offline/online 配置列表；update 还要确认 `data.id` 与改了哪些明细）完整展示给用户，确认后再加 `--yes`。
3. **典型时序**：通常在 `channel create`/`channel update` 的工单执行完成后再配置 SCM 仓库；不要把 channel 写入和 scm-config 写入混在同一次未经确认的批处理里。
4. **配置明细用 JSON 传入**：`--offline-config` / `--online-config`（或 `--*-config-file`）每个元素至少含 `configType` 与 `resourcePath`；create 与 update 都要求至少提供一个配置列表，否则会以 `TIKTOK_GECKO_INPUT_ERROR` 拒绝（避免静默提交空工单）。

### `release create` 安全规则（MUST follow）

1. **online deployment 必须先 `--dry-run`**：把请求体（包括 SCM 源、target 列表、apply-types、issuePercent 等）完整展示给用户，等用户明确确认后才允许加 `--yes` 真正提交。
2. **不要默认带 `--yes` 静默执行**：即使是脚本场景，遇到 high risk 也要让用户先看 dry-run。
3. **不传 `--deployment-type` 会被强制视为 HIGH RISK**（fail-safe）；agent 在调用前应主动从上下文（如 `deployment get` 的 `typeName`）确认目标 deployment 的属性。

### `package create` / `package enable` / `package disable` 安全规则（MUST follow）

1. **online/prod 必须先 `--dry-run`**：创建 / 启用 / 禁用线上资源包会影响发布链路，必须把 URL、headers、body 展示给用户。
2. **in-house / 用户测试场景可直接执行**：显式传 `--deployment-type in-house` 时 risk = low；如果不传 `--deployment-type`，CLI fail-safe 视为 HIGH。
3. **prod package 默认走业务流水线**：只有用户明确要求直接调用 Gecko package API，或场景是用户测试 / 排障 / in-house 验证时，才使用 `package create`。
4. **`package create` body 使用后端原始 schema**：不要臆造默认字段。若字段来自控制台抓包或业务流水线配置，优先用 `--body-file` 保存完整 JSON，再 dry-run 给用户确认。
5. **enable/disable 先确认 package id 类型**：`packageRegionId` 是 region 资源包 id，`packageType` 必须是 `offline_package` 或 `online_package`；不要把 meta package id 当 region package id 使用。

### `package online rollback` 安全规则（MUST follow）

1. **ALWAYS HIGH RISK**：无论 `--deployment-type` 是什么、无论目标 region 是哪一个，回滚都会立即影响线上服务，必须二次确认。
2. **必须先 `--dry-run`**：把 `region / region-ticket-id / package-id → rollback-package-id` 映射完整展示给用户，等用户确认后再加 `--yes`。
3. **每次只回滚单个 package**：CLI MVP 只支持 `--region` + 一组 `--package-id` / `--rollback-package-id`；不要在一条命令里编排多 region 多 package 的批量回滚——逐个串行执行，每次都重新预览 + 确认。
4. **`--package-id` 与 `--rollback-package-id` 必须不同**：service 层会校验，agent 在生成命令前也应主动校验。
5. **回滚前先用 `package online list` 与 `ticket get` 确认线上包现状与原发布单**：避免用过期 / 模糊匹配的 packageId 触发回滚。

### `ticket execute` 安全规则（MUST follow）

1. **online deployment 工单必须先 `--dry-run`**：执行 online 工单等同于触发线上发布，必须把请求体展示给用户。
2. **不传 `--deployment-type` 时 fail-safe 视为 HIGH**；agent 在调 `ticket execute` 之前应主动用 `ticket get` 或上下文确认目标工单是 in-house 还是 online。
3. **`ticket cancel` / `ticket retry` 是 low risk**，但仍建议先用 `ticket get --ticket-id` 确认工单状态、避免误操作。

## `ticket get --watch` — 内置终态轮询（agent 等待优先用这个）

`tiktok-gecko ticket get` 支持 `--watch` 模式：CLI 内部按固定间隔轮询 ticket 详情，直到 ticket 跑到终态（成功 / 失败 / 取消 / 回滚）或超时。Agent / 用户不需要再自己写 sleep loop。

```bash
# 默认 5s 间隔、600s 超时
bytedcli --site i18n-tt --auth-site tiktok tiktok-gecko ticket get \
  --ticket-id <ticket_id> --watch

# 自定义节奏（JSON 模式输出 NDJSON 状态变化流 + 最终 envelope）
bytedcli --json --site i18n-tt --auth-site tiktok tiktok-gecko ticket get \
  --ticket-id <ticket_id> --watch --watch-interval 10 --watch-timeout 1800
```

### Flags

| Flag | 默认值 | 校验 |
| --- | --- | --- |
| `--watch` | off | 启用后才会进入 polling；不传 `--watch` 时 `--watch-interval/--watch-timeout` 会被忽略并打印 warn |
| `--watch-interval <seconds>` | 5 | 1 ≤ value ≤ 60 整数 |
| `--watch-timeout <seconds>` | 600（10 分钟） | 5 ≤ value ≤ 3600 整数；且必须 > `--watch-interval` |

### Ticket 状态码（与后端 `ticketStatus` 完全对齐）

| Code | Name | 终态 | 说明 |
| ---: | --- | :---: | --- |
| 0 | INIT | | 初始 |
| 1 | PENDING_AUDIT | | 待审 |
| 2 | REJECT | ✓ | 失败终态：审核被拒 |
| 3 | PASS | | 审核通过但还没执行（不算成功终态） |
| 4 | PENDING_EXECUTE | | 待执行 |
| 5 | RUNNING | | 执行中 |
| 6 | FAILED | ✓ | 失败终态：执行失败 |
| 7 | CANCELING | | 取消中 |
| 8 | CANCELED | ✓ | 失败终态：已取消 |
| 9 | ROLLING_BACK | | 回滚中 |
| 10 | ROLLBACK | ✓ | 失败终态：已回滚 |
| 11 | SUCCESS | ✓ | **成功终态** |

> `regionTicketStatus`（每个 region 子工单的状态）是另一套枚举，watch 命令只看 top-level `ticketStatus`，不会混用。

### 退出码

| Exit | 触发条件 |
| ---: | --- |
| 0 | 终态 = SUCCESS(11) |
| 1 | 终态 = REJECT(2) / FAILED(6) / CANCELED(8) / ROLLBACK(10) |
| 2 | 超时未到终态 |
| 130 | SIGINT (Ctrl+C)；退出前会打印当前观测到的最后状态 |

### 输出格式

**文本模式**（默认）：每次状态变化打印一行；中间相同状态不重复打印；终态后追加 summary：

```
[2026-05-15T22:50:00.000Z] ticket <ticket_id> status=5 RUNNING (initial observation, elapsed=12ms, poll=1)
[2026-05-15T22:50:15.000Z] ticket <ticket_id> status=11 SUCCESS (transition from RUNNING, elapsed=15012ms, poll=3)
Ticket <ticket_id> finished: SUCCESS (15s, polls=3)
```

**JSON 模式**（`-j` / `--json`）：先输出每条状态变化的 NDJSON 行：

```json
{"kind":"ticket_status_change","ticket_id":"<ticket_id>","status":5,"status_name":"RUNNING","at":"2026-05-15T22:50:00.000Z","poll_count":1}
{"kind":"ticket_status_change","ticket_id":"<ticket_id>","status":11,"status_name":"SUCCESS","at":"2026-05-15T22:50:15.000Z","poll_count":3}
```

最后一行是常规的 `outputResult` envelope（`status: success | error`），`data` 字段包含：

- `action: "ticket_watch"`
- `terminal_status` (number) / `terminal_status_name` (string)
- `outcome`：`success` / `failure` / `timeout` / `aborted`
- `polls`、`elapsed_ms`
- `last_detail`：最后一次 `getTicketDetail` 的完整响应

## release / package / ticket 关系说明

CLI 不再单独提供 `release list / release get / release cancel`。Release 在后端本质上就是一个 release 类型的 ticket，因此：

- **取消 release 工单** → `tiktok-gecko ticket cancel --ticket-id <release_ticket_id>`
- **查询 release 工单详情** → `tiktok-gecko ticket get --ticket-id <release_ticket_id>`
- **列出 release 工单** → `tiktok-gecko ticket list --type <release_type_code>`（按 ticketType 数值过滤）
- **重试 / 执行 release 工单** → `tiktok-gecko ticket retry/execute --ticket-id <release_ticket_id>`（注意 risk gating）
- **重新提交 release** → `tiktok-gecko release create`（不要尝试用 ticket retry 来"重发"失败的 release，retry 仅在工单内重试节点逻辑）

Package 与 release 是上下游关系：

- `PACKAGE_CREATE`：创建资源包 / 产物入库，对应 `tiktok-gecko package create --type offline|online`。
- `PACKAGE_ENABLE` / `PACKAGE_DISABLE`：启用 / 禁用已有资源包，对应 `tiktok-gecko package enable|disable`。
- `PACKAGE_RELEASE*`：把已有资源包发布到 offline / online / offline+online 分发链路。
- `release create` 不能被当成完整 package 发布链路；它只表达 release 阶段。若没有资源包，先走 `package create` 或业务流水线。prod package 发布链路通常应由业务流水线负责。

## Agent-facing 协议

> 这一节面向 Claude Code、Cursor、其他 LLM agent。在自动化场景下严格按以下流程使用本 skill。

1. **低风险命令**（risk = low）
   - 对应：`*list / *get` 等只读命令、`package create|enable|disable --deployment-type in-house`、`release create --deployment-type in-house`、`ticket cancel`、`ticket retry`、`ticket execute --deployment-type in-house`
   - Agent 行为：可直接调用 CLI 执行，输出结果给用户。

2. **高风险命令**（risk = high）
   - 对应：`channel create` / `channel update`（始终高风险）、`channel scm-config create` / `channel scm-config update`（始终高风险）、`package create|enable|disable --deployment-type online`（或缺省 `--deployment-type`）、`release create --deployment-type online`（或缺省 `--deployment-type`）、`package online rollback`（始终高风险）、`ticket execute --deployment-type online`（或缺省 `--deployment-type`）
   - Agent 行为：
     1. **MUST 先用 `--dry-run` 调一次**，从输出里拿到完整的 request body 与 risk 等级。
     2. **把 dry-run preview 完整展示给用户**（包括 URL、headers、body、影响范围）。
     3. **等用户在对话里明确同意**（"go" / "确认" / "yes" 等）。
     4. **agent 把同一条命令去掉 `--dry-run`、加上 `--yes` 重新执行**，并把响应交回用户。
   - **不要在用户没明确同意时自动加 `--yes`**；不要把高风险命令藏在脚本/批处理里悄悄跑。

3. **如何判断目标是 online 还是 in-house**
   - `tiktok-gecko deployment get --deployment-id <id>` 的 `Type` 字段、或 `ticket get --ticket-id <id>` 详情里的 `deploymentType`：`1 = online`、`2 = in-house`。
   - 把判断结果作为 `--deployment-type` 参数显式传入；不要省略它。

4. **等待工单跑完**
   - 触发 `package create|enable|disable` / `release create` / `package online rollback` / `ticket execute|retry|cancel` 之后想等结果时，**MUST** 用 `tiktok-gecko ticket get --ticket-id <id> --watch`，**不要自己写 sleep loop**。
   - 退出码已经按"成功 0 / 失败 1 / 超时 2 / 中断 130"约定好，shell / agent / CI 都能直接消费。
   - 在 `--json` 模式下读 NDJSON 状态变化行可以做实时反馈，最后一行 envelope 给最终判定。

5. **ticket 动作降级原则**
   - `ticket execute/cancel/retry` 是 API 层工单生命周期动作，不是产品级主场景。不要把它们单独推荐给普通用户。
   - 优先使用上层业务命令表达用户意图；只有用户明确给出 ticket 操作诉求，或上层命令需要继续编排时才调用。
   - 统计 skill 使用场景或 UV 天花板时，不把 `ticket execute/cancel/retry` 作为独立场景计入。

## 常用操作指南

1. **先拿列表再查详情**：先用 `list` 命令确认资源 ID，再用 `get` 命令拉详细信息，避免手填错误 ID。
   - `channel get --channel-id` 需要传 **channel meta id**（例如 `channel list` 返回里的 `metaIdList`），不是 deployment 下的 channel region id。
2. **先按条件缩小范围**：`channel list` 可用 `--region` / `--name`；`ticket list` 可用 `--creator` / `--reviewer` / `--status` / `--type`。
   - 查询某个 channel 的资源包时，优先使用 `channel package list`（底层接口为 `channel/package-meta/list`）。
   - 查询某个 channel 的线上包（已下发到 CDN 的包）时使用 `package online list`。
3. **排查部署关联关系**：先 `deployment get` 看部署基本信息，再用 `deployment channel list` 看挂载 Channel。
4. **结构化输出给自动化流程**：在全局参数添加 `--json`，例如 `bytedcli --json --site i18n-tt tiktok-gecko app list`。

## Notes

- `tiktok-gecko` 当前覆盖只读查询 + 产品级写操作（channel create / channel update / channel scm-config create|update / package create / package enable|disable / release create / package online rollback）。`ticket cancel/retry/execute` 已暴露但属于 advanced troubleshooting / workflow orchestration，不是主入口。
- 当前未覆盖的常见工单能力包括：权限申请/授权、customized release 专门入口、release template 创建/更新/删除、channel prefix/size limit、SCM config delete、channel group/change/clean/push/delete、host app/settings/resource-loader、GeckoNG 相关工单等。
- `release create` 只能覆盖 release 阶段，不能作为完整 package 发布链路。`package create` 已暴露底层 package 创建 API，但 prod package 发布通常走业务特定流水线；skill 更适合用户测试、内测、排障和已有 package/SCM source 的辅助发布。
- `tiktok-gecko` 支持 `--site i18n-tt`（TikTok ROW prod，TikTok SSO 默认）与 `--site boe`（BOE i18n 分区，bytedance SSO 默认）。也可通过 `BYTEDCLI_CLOUD_SITE` 环境变量设置。两站点的 base URL、JWT 颁发 host 与 permission apply URL 都按 site 自动切换；显式传入与该 site 不匹配的 `--auth-site`（例如 `--site i18n-tt --auth-site bytedance`）会被入口校验直接拒绝。
- BOE 不需要手动传 `--vregion`：`--site boe` 时 CLI 内部会按隐式 `boei18n` 分区计算 SSO env，并把 JWT 取自 `cloud.bytedance.net`。
- `tiktok-gecko ticket list` 的时间筛选参数使用 epoch 毫秒：`--create-start-time` / `--create-end-time`。
- `deployment channel list` 默认 `--type all`，与控制台部署详情页默认筛选一致。
- 资源包环境可通过 `deploymentName` 快速判断：`online_deployment` 通常为线上包，`in_house_deployment` 通常为测试包。
- `package online list` 至少需要 `--channel-id` 或 `--channel-region-id` 之一（推荐 `--channel-region-id`）。
- 写操作的 `--deployment-type` 参数 **仅用于 CLI 端 risk gating**，不会转发到后端；后端会从 target 里自行推导。
- 写操作的 `--x-target-regions` 转发为 `x-target-regions` 请求头（与控制台调试一致）。
- 高风险命令在非 TTY 环境下若没有 `--yes`，CLI 会以结构化错误码 `TIKTOK_GECKO_HIGH_RISK_NEED_YES` 拒绝执行；TTY 下会弹 `Proceed with HIGH RISK ... [y/N]` 交互 prompt。
