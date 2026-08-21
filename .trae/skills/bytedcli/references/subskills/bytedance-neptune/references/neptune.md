# Neptune

Neptune 用于服务治理配置查询（安全/稳定性/限流/调度）、严格授权申请，以及 upstream ACL 的枚举 / 增补 / 原始 sync API 调用，支持跨站点排查差异。

## 环境与站点

Use global `--site` to select the ByteCloud deployment. Per-service `--neptune-site` is a hidden alias for backward compatibility.

- CN: `--site cn`（默认）
- BOE: `--site boe`
- ByteIntl: `--site byteintl`
- TikTok ROW: `--site i18n-tt`（aliases: `i18ntt|row|tiktok|tiktok-row`；`sg` 保持兼容 ByteIntl）

站点差异（bytedcli 内部已处理）：

- CN/BOE：API host 在 ByteCloud 控制台域名下（`cloud.bytedance.net` / `cloud-boe.bytedance.net`），请求需要 `x-bcgw-tenant-id: bytedance`
- ByteIntl：API host 为 `cloud.byteintl.net`，请求不需要 `x-bcgw-tenant-id`
- TikTok ROW：API host 为 `cloud.tiktok-row.net`，请求不需要 `x-bcgw-tenant-id`

## 站点/VRegion 自动发现（best-effort）

命令：`neptune list-sites`

bytedcli 会调用平台 meta 接口 `list_platform_vregions?platform=neptune`（并缓存 1 天）来尽量列出支持的站点与 VRegion。

## zones/vregions 列表（best-effort）

命令：`bytedcli --site <site> neptune list-cp-regions`

用于查询 Neptune 当前站点支持的 `zones` 与 `vregions` 列表，便于为后续配置查询选择正确的 `--zone`。

## 命令映射

- `neptune security`：安全配置（支持 `--method`，默认 `*`；支持 `--direction ingress|egress`）
- `neptune stability`：稳定性配置（支持 `--direction ingress|egress`）
- `neptune rate-limit`：限流配置（支持 `--direction ingress|egress`；`--v2` 仅对 ingress 生效）
- `neptune dispatch`：调度配置（支持 `--direction ingress|egress`）
- `neptune acl-status`：zone 级 ACL 总开关查询（`acl/get_status`），返回 `mode: offline|online`
- `neptune strict-auth-status`：服务级严格授权状态（`acl/strict_authorization/status`），返回 `mode: deleted|grey|open`
- `neptune strong-auth-status`：服务级 strong authentication 状态（`acl/strong_auth/status`），返回 shape 与 `strict-auth-status` 相同，但语义是 **authentication**（token/credential 校验）而不是 ACL **authorization**
- `neptune acl-check`：综合 ACL authorization 三层（acl-status + strict-auth-status + security/ingress），按 caller/callee/zone 输出 `verdict: allow|allow-explicit|deny-strict|deny-explicit|indeterminate`。它**不检查 strong-auth token validity**；判断"ACL 白名单是否允许调通"优先用这个，单跑 `neptune security` 容易误判（exist=false 在 ACL 未启用的 zone 不等于"被拒"）
- `neptune strict-auth apply`：严格授权申请（支持结构化参数，或 `--payload-json` / `--payload-file` 传完整 payload）
- `neptune auth-mode update`：预览或直接修改服务级 strict-auth / strong-auth 模式（`--kind strict-auth|strong-auth`，`--mode open|grey|closed`，加 `--execute` 才会真正发送请求）
- `neptune deploy-unit list`：枚举 callee deploy units / zone-cluster pairs
- `neptune strict-auth add`：给 callee 的单个 zone/cluster 增加 upstream caller（默认 dry-run；显式 `--execute` 才会写入）
- `neptune strict-auth sync export`：调用原始 `sync/call_chains/dump`
- `neptune strict-auth sync preview`：调用原始 `async/rules/pre_view`
- `neptune strict-auth sync create`：调用原始 `async/rules/create_order`

## Apply vs add

agent 需要明确区分 `neptune strict-auth apply` 与 `neptune strict-auth add`：

- `strict-auth apply`：适用于 **caller / upstream 在请求访问某个 downstream / callee** 的场景，本质是提交权限申请 / 工单 / BPM
- `strict-auth add`：适用于 **downstream / callee 的 owner 或已有 ACL 修改权限的操作者**，直接把某个 caller 写入 downstream ACL 白名单
- 不要把 `apply` 当作 `add` 的别名：前者是"申请权限"，后者是"直接改规则"

推荐判断方式：

- 如果用户语气是"我这个 upstream 想访问某个 downstream，帮我申请权限" → 优先用 `neptune strict-auth apply`
- 如果用户语气是"帮我把 upstream X 加到我服务 Y 的 ACL 里" → 优先用 `neptune strict-auth add`
- 如果请求里明确体现操作者只有 upstream 视角、并没有 downstream ACL 管理权，默认不要尝试 `add`

## Auth mode update

`neptune auth-mode update` 用于直接修改服务级 strict-auth / strong-auth 开关，不要和只读状态查询命令混淆：

- `--kind strict-auth` → 调 `acl/strict_authorization/status` 的 PUT 接口
- `--kind strong-auth` → 调 `acl/strong_auth/status` 的 PUT 接口
- `--mode` 使用语义值 `open|grey|closed`
- 默认只输出 preview；只有显式传 `--execute` 才会真正调用后端 mutation API

响应 shape 需要按 kind 区分理解：

- `strict-auth` 常见返回：
  - `config_value.deny`
  - `config_value.grey`
  - `metadata.rpc_meta.caller = "any"`、`caller_cluster = "any"`
- `strong-auth` 常见返回：
  - `config_value.status`
  - `metadata.rpc_meta.caller = ""`、`caller_cluster = ""`

推荐使用场景：

- 用户说"把 strict auth 改成 grey/open/closed" → `neptune auth-mode update --kind strict-auth ...`
- 用户说"把 strong auth 改成 grey/open/closed" → `neptune auth-mode update --kind strong-auth ...`
- 用户只是想查看当前状态，而不是修改开关 → 继续使用 `neptune strict-auth-status` / `neptune strong-auth-status`

安全要求：

- 如果操作会把 strict-auth 或 strong-auth 从未启用/关闭态改成启用态（例如目标 mode 是 `grey` 或 `open`），agent 必须先查当前状态：
  - `strict-auth` → `neptune strict-auth-status`
  - `strong-auth` → `neptune strong-auth-status`
- 在执行写操作前，agent 必须明确提醒用户：误开启 ACL / strict-auth / strong-auth 可能导致线上流量被拦截，进而触发事故。
- 这类"enable"动作必须等用户**明确二次确认**后才能执行；不要因为用户第一次说"enable / turn on / 改成 grey/open"就直接调用 `neptune auth-mode update`。
- 如果用户只是表达"想开启"而没有再次确认，默认停在确认步骤，先展示当前状态和风险，再等用户确认。

## Zone naming note

对 agent 来说，`SGALI`、`Singapore-Central`、`SG-Central` 在用户语义上指向同一个逻辑区域。

但这不是 CLI/API 参数层面的"可任意互换 alias"：

- 某些 Neptune API 或命令只接受其中一种 zone 字面值
- 因此 agent 应理解用户提到 `SG-Central` 时想表达的是这个逻辑区域
- 真正发起 `bytedcli` 调用时，仍要沿用对应命令/API 已要求的 zone 写法，不要无条件把所有请求改写成 `SGALI` 或 `Singapore-Central`

## PSM-only ACL status workflow

当用户只给出一个 PSM，例如 `"show me the ACL status of example.callee.service"`，推荐 agent 采用下面的流程：

1. 把该字符串识别为 **callee PSM**
2. 先运行 `neptune deploy-unit list --psm <psm>` 找出所有 zone/cluster deploy units
3. 对每个 deploy unit 分别查询：
   - `neptune acl-status`
   - `neptune strict-auth-status`
   - `neptune strong-auth-status`
4. 将结果按 zone/cluster 汇总成一张状态表，再给结论摘要

术语映射：

- **authorization** → `neptune strict-auth-status`
- **authentication** → `neptune strong-auth-status`

注意：

- 用户只问某个 PSM 的 ACL / auth 状态、但没有给 caller 时，不要默认跑 `neptune acl-check`；`acl-check` 是 caller→callee 的 **ACL authorization** 判断，需要 caller 语义，也不覆盖 strong-auth token 校验。
- 用户没有给 zone/cluster 时不要猜；先 `deploy-unit list` 再展开查询。
- 如果用户把目标区域说成 `SG-Central` / `Singapore-Central`，应把它理解为与 `SGALI` 对应的逻辑区域；但真正传给具体命令的 zone 字面值，仍需遵循该命令/API 实际接受的格式。

## Upstream ACL add workflow

当用户要求"把 upstream caller 加到某个服务的 ACL 中"，尤其是类似 `"Add the upstream example.caller.service to the ACL of my service example.callee.service in all clusters and regions"` 这样的请求，推荐 agent 采用下面的流程：

1. 把 upstream 服务识别为 **caller**
2. 把目标服务识别为 **callee**
3. 先运行 `neptune deploy-unit list --psm <callee>` 找出所有 zone/cluster deploy units
4. 对每个 deploy unit 单独调用 `neptune strict-auth add`
5. 汇总每个 zone/cluster 的 add 结果，再给最终摘要

关键语义：

- upstream = caller
- downstream / target service = callee
- `neptune strict-auth add` 只处理单个 `zone + callee_cluster`
- "all clusters / all regions" 不是 CLI 自动能力，而是 agent 在 `deploy-unit list` 结果上做 fanout
- 这类 workflow 是"新增一个 caller 到多个 target"；如果用户说的是"把 source cluster 上已有 ACL 规则复制到其他 targets"，那属于 sync/copy workflow，不应使用 `strict-auth add`
- 只有当操作者已经站在 downstream / callee owner 视角，并且有权限修改 downstream ACL 时，才应默认走 `strict-auth add`

推荐 fanout 模板：

```bash
bytedcli --site i18n-tt neptune deploy-unit list --psm example.callee.service

bytedcli --site i18n-tt neptune strict-auth add \
  --callee-psm example.callee.service \
  --zone MY-Compliance \
  --callee-cluster lane-example-a \
  --caller-psm example.caller.service \
  --execute
```

注意：

- 如果用户没有明确说要覆盖全部 clusters / regions，且又没给 zone/cluster，不要默认全量写入；应先确认范围，或先把 deploy-unit list 结果展示给用户。
- 默认建议先 dry-run；只有用户明确要求执行写入时再加 `--execute`。

## ACL sync / copy workflow

当用户要求类似 `"copy my acl rules from <source zone/cluster> to <one or more target zones/clusters>"` 时，推荐 agent 采用下面的流程：

1. 明确 source `psm + zone + cluster`
2. 明确一个或多个 target `psm + zone + cluster`
3. 对 source 运行 `neptune strict-auth sync export`
4. 对每个 target 运行 `neptune strict-auth sync preview`
5. 基于 preview 结果整理 configs
6. 对每个 target 运行 `neptune strict-auth sync create`
7. 汇总每个 target 的 preview / create 结果

关键语义：

- **add** = 新增一个 caller/upstream 到某个 target deploy unit
- **sync/copy** = 复制 source deploy unit 上已有 ACL 配置到其他 targets
- 当用户说"copy rules from source to targets"时，默认优先走 `sync export|preview|create`，不要退化成逐条 `strict-auth add`

## 严格授权申请

命令：`bytedcli --site <site> neptune strict-auth apply`

结构化参数模式：

```bash
bytedcli --site i18n-tt neptune strict-auth apply \
  --caller-psm example.caller.service \
  --caller-cluster default \
  --callee-psm example.callee.service \
  --callee-cluster default \
  --method GetProductByID \
  --method MGetProductsByIds \
  --zone SGALI \
  --reason "Need access for demo workflow"
```

完整 payload 模式：

```bash
bytedcli --site i18n-tt neptune strict-auth apply --payload-file ./sample-neptune-strict-auth.json
```

- `--method` 和 `--zone` 支持重复传入或逗号分隔。
- 未传 `--zone` 时默认：`CN(cn/byteintl)`、`BOE(boe)`、`SG(i18n-tt)`。
- 平台新增字段尚未映射为 CLI flag 时，优先使用 `--payload-json` 或 `--payload-file`；raw payload 模式不要混用结构化 flags。
- 当用户是 **upstream / caller 在请求访问下游服务**，且语义上是在"提权限申请"而不是"直接改 ACL 规则"时，优先使用这条命令，而不是 `neptune strict-auth add`。

## Upstream ACL sync

`neptune deploy-unit list` 负责枚举 callee deploy units / zone-cluster pairs；`neptune strict-auth add` 要求显式 `--zone` 与 `--callee-cluster`，不会再自动对所有 deploy units 做 fanout。需要批量覆盖多个 cluster 时，让 agent 先 `deploy-unit list` 再逐个调用 `strict-auth add`。

这些 sync 命令是对 Neptune 原始同步接口的薄封装，便于 agent 通过 `run_command` 自己编排多阶段同步：

```bash
# export：导出 source cluster 的 upstream configs
bytedcli --site i18n-tt neptune strict-auth sync export \
  --psm example.callee.service \
  --zone MY-Compliance \
  --cluster lane-example-a \
  --direction ingress

# preview：预览 from -> to 还缺哪些 configs
bytedcli --site i18n-tt neptune strict-auth sync preview \
  --from-psm example.callee.service \
  --from-zone MY-Compliance \
  --from-cluster lane-example-a \
  --to-psm example.callee.service \
  --to-zone SGCOMPLIANCE \
  --to-cluster lane-example-b \
  --ingress-category AccCtrl

# create：提交异步同步工单
bytedcli --site i18n-tt neptune strict-auth sync create \
  --metadata-file ./sample-neptune-sync-metadata.json \
  --configs-file ./sample-neptune-sync-configs.json
```

- 这些命令不会自动帮你选 hub、flatten caller、merge 多个 export、或自动 fanout。
- 如果用户要"把一个 region 的规则汇总后再同步到其他 region/cluster"，优先在 agent skill 内处理 merge / dedupe / blacklist / fanout 策略，再调用这些原始 sync 原语。
- `create_order` 是异步任务；若 phase 2 依赖 phase 1 的结果，通常需要等待上一轮 order 生效后再继续 fanout。
