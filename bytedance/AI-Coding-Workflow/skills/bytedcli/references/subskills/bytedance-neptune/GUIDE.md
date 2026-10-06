---
name: bytedance-neptune
description: "Operate Neptune via bytedcli: inspect security/stability/rate-limit/dispatch configs, query ACL gating and strict-auth/strong-auth status, update auth modes with `neptune auth-mode update`, enumerate deploy units, manage lane groups/lanes/lane resources, submit `neptune strict-auth apply`, add upstream callers with `neptune strict-auth add`, and call raw upstream ACL sync APIs. Use for Neptune governance, ACL checks, strict/strong auth changes, upstream ACL sync, lane operations, and related troubleshooting."
---

# bytedcli Neptune

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

- Neptune 平台：安全/稳定性/限流/调度配置排查
- 同时关注入流量（ingress）与出流量（egress）
- 跨环境（CN/BOE/ByteIntl）排查配置差异
- 提交严格授权申请（strict authorization / ACL application）：使用 `neptune strict-auth apply`（需按目标控制面指定 `--site`）
- 修改 strict-auth / strong-auth 模式：使用 `neptune auth-mode update`
- Neptune upstream ACL：
  - 枚举 callee 的 deploy units：`neptune deploy-unit list`
  - 给 callee 的单个 zone/cluster 增加 upstream caller：`neptune strict-auth add`
  - 只调用原始 sync API：`neptune strict-auth sync export|preview|create`
- `neptune strict-auth apply` 与 `neptune strict-auth add` 的语义要明确区分：
  - 如果是 **upstream / caller** 在请求获得某个 downstream / callee 的访问权限，优先使用 `neptune strict-auth apply`
  - 如果是 **downstream / callee 的 owner / 有权限修改下游 ACL 的操作者**，要把一个 caller 直接加进白名单，使用 `neptune strict-auth add`
  - 不要把 `apply` 当成 `add` 的别名；前者是申请权限，后者是直接写入 ACL 规则
- 用户只给出一个 PSM，要求"看 ACL 状态 / strict auth 状态 / strong auth 状态 / 这个服务有没有开 ACL"时：
  - 先把该字符串识别为 callee PSM
  - 先用 `neptune deploy-unit list --psm <psm>` 枚举 zone/cluster，再按每个 deploy unit 继续查询
- 用户要求"把 upstream caller 加到某个服务的 ACL 中"，尤其是类似"加到所有 clusters / all regions / 全部集群"时：
  - 把 upstream 服务识别为 **caller**
  - 把目标服务识别为 **callee**
  - 先用 `neptune deploy-unit list --psm <callee>` 枚举全部 zone/cluster
  - 再对每个 deploy unit 单独调用 `neptune strict-auth add`
- 查询泳道组（lane groups）列表
- 查询某个泳道组下的泳道（lanes）
- 查询泳道下的服务列表（list PSM in lane）
- 在指定泳道下新增服务（add PSM to lane）

## 前置条件

- 使用通用调用方式：`../../invocation.md`
- 需要鉴权的命令先登录：`bytedcli auth login`

## Quick start

```bash
# 发现 Neptune 支持的站点（best-effort）
bytedcli neptune list-sites

# 查看某个站点支持的 zones/vregions（best-effort）
bytedcli --site cn neptune list-cp-regions
bytedcli --site boe neptune list-cp-regions
bytedcli --site byteintl neptune list-cp-regions
bytedcli --site i18n-tt neptune list-cp-regions

# 安全配置（method 默认 *；direction 默认 ingress）
bytedcli neptune security --psm example.service.api --cluster default --zone CN --method "*" --direction ingress

# 判断 caller→callee 是否被 ACL 白名单允许（综合 ACL authorization 三层，不检查 strong-auth token）。优先用这个，单看 security 容易误判
bytedcli --site us-ttp neptune acl-check --caller-psm example.caller.api --caller-cluster default --psm example.callee.api --cluster default --zone US-TTP
bytedcli --site eu-ttp neptune acl-check --caller-psm example.caller.api --caller-cluster default --psm example.callee.api --cluster default --zone EU-TTP
bytedcli --site i18n-tt neptune acl-check --caller-psm example.caller.api --caller-cluster default --psm example.callee.api --cluster default --zone SGALI

# 仅查 zone 级 ACL 总开关（mode=offline 表示该 zone 上 callee 没启用 ACL）
bytedcli --site us-ttp neptune acl-status --psm example.callee.api --cluster default --zone US-TTP

# 仅查服务级严格授权状态（mode=open 表示已启用白名单模式；grey 表示 canary 告警不拦截；deleted 表示未启用）
bytedcli --site i18n-tt neptune strict-auth-status --psm example.callee.api --cluster default --zone SGALI

# 仅查服务级 strong authentication 状态（返回 shape 与 strict-auth-status 相同）
bytedcli --site i18n-tt neptune strong-auth-status --psm example.callee.api --cluster default --zone SGALI

# 修改 strict-auth 模式
bytedcli --site i18n-tt neptune auth-mode update --kind strict-auth --mode grey --psm example.callee.api --cluster default --zone SGCOMPLIANCE

# 真正执行 strict-auth 模式修改时加 --execute
bytedcli --site i18n-tt neptune auth-mode update --kind strict-auth --mode grey --psm example.callee.api --cluster default --zone SGCOMPLIANCE --execute

# 修改 strong-auth 模式
bytedcli --site i18n-tt neptune auth-mode update --kind strong-auth --mode open --psm example.callee.api --cluster default --zone SGCOMPLIANCE

# 真正执行 strong-auth 模式修改时加 --execute
bytedcli --site i18n-tt neptune auth-mode update --kind strong-auth --mode open --psm example.callee.api --cluster default --zone SGCOMPLIANCE --execute

# 稳定性配置
bytedcli neptune stability --psm example.service.api --cluster default --zone CN --direction ingress

# 已知目标 method 时建议加 --method，可让后端按 method 精确过滤，避免拉全量万级配置
bytedcli neptune stability --psm example.service.api --cluster default --zone CN --direction ingress --method GetFoo

# 限流配置（v2 仅对 ingress 生效）
bytedcli neptune rate-limit --psm example.service.api --cluster default --zone CN --direction ingress
bytedcli neptune rate-limit --psm example.service.api --cluster default --zone CN --direction ingress --v2

# 调度配置
bytedcli neptune dispatch --psm example.service.api --cluster default --zone CN --direction ingress

# 严格授权申请（支持重复或逗号分隔 --method / --zone）
bytedcli --site i18n-tt neptune strict-auth apply \
  --caller-psm demo.caller.service \
  --caller-cluster default \
  --callee-psm demo.callee.service \
  --callee-cluster default \
  --method GetProductByID \
  --method MGetProductsByIds \
  --zone SGALI \
  --reason "Need access for demo workflow"

# 使用完整 payload 申请
bytedcli --site i18n-tt neptune strict-auth apply --payload-file /tmp/neptune_strict_auth_payload.json

# 枚举某个 callee 的 deploy units（zone/cluster pairs）
bytedcli --site i18n-tt neptune deploy-unit list \
  --psm example.callee.service \
  --allowed-zone MY-Compliance,SGCOMPLIANCE

# 预览给某个 callee 的单个 zone/cluster 增加 upstream caller（不加 --execute 时只输出 payload / plan）
bytedcli --site i18n-tt neptune strict-auth add \
  --callee-psm example.callee.service \
  --zone MY-Compliance \
  --callee-cluster lane-example-a \
  --caller-psm example.caller.service \
  --caller-cluster default

# 调 Neptune 原始 sync export API，导出某个 zone/cluster 的 upstream config
bytedcli --site i18n-tt neptune strict-auth sync export \
  --psm example.callee.service \
  --zone MY-Compliance \
  --cluster lane-example-a \
  --direction ingress

# 调 Neptune 原始 sync preview API，预览 from -> to 缺失的 configs
bytedcli --site i18n-tt neptune strict-auth sync preview \
  --from-psm example.callee.service \
  --from-zone MY-Compliance \
  --from-cluster lane-example-a \
  --to-psm example.callee.service \
  --to-zone SGCOMPLIANCE \
  --to-cluster lane-example-b \
  --ingress-category AccCtrl

# 调 Neptune 原始 sync create API；configs 通常由前一步 preview / agent merge 结果生成
bytedcli --site i18n-tt neptune strict-auth sync create \
  --metadata-file ./sample-neptune-sync-metadata.json \
  --configs-file ./sample-neptune-sync-configs.json

# 泳道组列表（问：当前有哪些泳道组？）
bytedcli neptune lane-group list
bytedcli neptune lane-group list --page 2 --page-size 20

# 泳道列表（问：某个泳道组下有哪些泳道？）
bytedcli neptune lane list --domain-code domain-adies --zone CN
bytedcli neptune lane list --domain-code domain-adies --zone CN --page 2 --page-size 50

# 查询指定泳道下的服务列表（问：某个泳道下有哪些服务？）
bytedcli neptune psm list --domain-code domain-adies --lane-name lane-adies-canary_online
bytedcli neptune psm list --domain-code domain-adies --lane-name lane-adies-canary_online --zone CN --page 1 --page-size 100

# 在指定泳道下新增服务（问：在某个泳道下新增一个服务？）
bytedcli neptune psm add --domain-code domain-adies --lane-name lane-adies-canary_online --zone CN --resource-psm data.incentive_engine.aweme
bytedcli neptune psm add --domain-code domain-adies --lane-name lane-adies-canary_online --zone CN --resource-psm data.incentive_engine.aweme --logic-unit-name default --resource-type tce --operation-type create

# 切换环境（BOE/ByteIntl/TikTok ROW）
bytedcli --site boe neptune stability --psm your.service.psm --cluster your.cluster --zone BOE --direction egress
bytedcli --site byteintl neptune stability --psm your.psm --cluster default --zone TEXAS --direction ingress
bytedcli --site i18n-tt neptune stability --psm your.service.psm --cluster your.cluster --zone SGALI --direction ingress

# 需要结构化输出时加 --json
bytedcli --json neptune stability --psm example.service.api --cluster default --zone CN
bytedcli --json neptune lane-group list
bytedcli --json neptune lane list --domain-code domain-adies --zone CN
```

## 判断 caller→callee 在某个 zone 能否调通

`acl-check` 只回答 **authorization / ACL whitelist** 这个问题，不检查 caller token 是否有效。推荐**优先用 `acl-check`** 判断 caller 是否被 ACL 允许；如果还要确认 strong authentication，再额外查 `strong-auth-status`。

1. **Zone 级 ACL 总开关**：`neptune acl-status`
   - `mode=offline` → 该 zone 上 callee 的 ACL 未启用，所有调用默认放行（与下面两层无关）
   - `mode=online` → ACL 启用，继续看第 2 层
2. **服务级严格授权**：`neptune strict-auth-status`
   - `mode=deleted` → 严格授权未启用，没显式规则也能调
   - `mode=open` → 启用白名单模式，没显式 allow 则被拦截
   - `mode=grey` → canary 模式；未命中的 caller 会告警，但不会被 strict-auth 直接拦截
3. **Caller 级显式规则**：`neptune security`（`acc_ctrl.exist + value.deny`）
   - `exist=true, deny=false` → 显式 allow
   - `exist=true, deny=true` → 显式 deny（永远覆盖前两层）
   - `exist=false` → 无显式规则，落在前两层默认行为上

**不在 `acl-check` 覆盖范围内**：

- **服务级 strong authentication**：`neptune strong-auth-status`
  - 这是 **authentication**（caller token / credential 是否有效），不是 ACL whitelist **authorization**
  - 返回 shape 与 `strict-auth-status` 相同，但语义不同；要确认 token 校验是否会拦截，请单独查询它

`acl-check` 输出的 `verdict`：

- `allow` → 前两层 gate 都未启用，默认放行
- `allow`（strict-auth grey）→ canary 模式，只告警不拦截
- `allow-explicit` → 有显式 allow 规则
- `deny-strict` → strict_authorization 已开但 caller 无 allow 规则
- `deny-explicit` → 有显式 deny 规则
- `indeterminate` → 配置矛盾或字段未覆盖到，需要人工去 ByteCloud 网页确认

**站点对照**：

- US-TTP / US-TTP2 → `--site us-ttp`（API 走 `cloud.tiktok-us.net`）
- EU-TTP / EU-TTP2 / USEASTRED → `--site eu-ttp`（API 走 `bc-iedt-gw.tiktok-eu.net`）
- SGALI → `--site i18n-tt`（API 走 `cloud.tiktok-row.net`）
- CN / BOE / ByteIntl → `--site cn|boe|byteintl`

**Zone naming note**：

- 在用户意图层面，`SGALI`、`Singapore-Central`、`SG-Central` 指向同一个逻辑区域。
- 但这不是"命令参数可互换"的意思：某些 Neptune API / 命令只接受其中一种字面值。
- 因此 agent 应理解用户说 "`SG-Central`" 时是在指这个逻辑 zone，但真正调用 `bytedcli` 时，仍要保留对应命令/API 已要求的 zone 字面值，不要无条件把所有调用都改写成另一种写法。

合规区现状（截至 2026-05）：US-TTP / US-TTP2 / EU-TTP / EU-TTP2 默认未启用 ACL（acl/get_status=offline、strict_authorization=deleted），调用默认放行；SGALI 部分服务已启用 strict_authorization=open，新 caller 调用前必须先确认是否在白名单里。

## 查 US-TTP / EU-TTP 合规区配置

US-TTP 和 EU-TTP 是两个独立控制面，跟 CN / BOE / i18n-tt 走的是不同的 API gateway 和 JWT 链路。CLI 已经做了透明封装，**只要选对 `--site`、传对 `--zone`，security / stability / rate-limit / dispatch / acl-status / strict-auth-status / strong-auth-status / acl-check 这些查询命令都能用**。

**`--site` 与 zone 对应关系**：

| 控制面                     | `--site`                   | 可选 zone                        | UI host（浏览器看的）        | API host（CLI 实际打的）   |
| -------------------------- | -------------------------- | -------------------------------- | ---------------------------- | -------------------------- |
| US-TTP（BDEE / USTS 公用） | `us-ttp`                   | `US-TTP`, `US-TTP2`              | `cloud-ttp-us.bytedance.net` | `cloud.tiktok-us.net`      |
| EU-TTP                     | `eu-ttp`                   | `EU-TTP`, `EU-TTP2`, `USEASTRED` | `cloud-eu.tiktok-row.net`    | `bc-iedt-gw.tiktok-eu.net` |
| SGALI                      | `i18n-tt`（不是 `eu-ttp`） | `SGALI`                          | `cloud.tiktok-row.net`       | 同左                       |

**常见姿势**：

```bash
# 查 US-TTP 上某 callee 的 ingress security 配置
bytedcli --site us-ttp neptune security \
  --psm example.service.callee --cluster default \
  --zone US-TTP --method "*" --direction ingress --json

# 同一个 callee 在 EU-TTP2 的配置
bytedcli --site eu-ttp neptune security \
  --psm example.service.callee --cluster default \
  --zone EU-TTP2 --method "*" --direction ingress --json

# 判断 caller 现在能否调通 callee —— 优先用 acl-check
bytedcli --site us-ttp neptune acl-check \
  --caller-psm example.service.caller --caller-cluster default \
  --psm example.service.callee --cluster default --zone US-TTP

bytedcli --site eu-ttp neptune acl-check \
  --caller-psm example.service.caller --caller-cluster default \
  --psm example.service.callee --cluster default --zone EU-TTP

# 拆开看两层 gate
bytedcli --site us-ttp neptune acl-status --psm example.service.callee --cluster default --zone US-TTP
bytedcli --site us-ttp neptune strict-auth-status --psm example.service.callee --cluster default --zone US-TTP
```

**关键易踩的坑**：

- **不要走 `--site i18n-tt --zone US-TTP/EU-TTP` 这条路**。i18n-tt 控制面虽然 `list-cp-regions` 会列出这两个 zone，但拿到的是"远端摘要"，数据跟 US-TTP / EU-TTP 真实控制面**不一致**。要查 US-TTP 必须 `--site us-ttp`，要查 EU-TTP 必须 `--site eu-ttp`。
- **CLI 拿到的数据 = 网页上 `rules/security/ingress` 的原始 XHR**，跟 ByteCloud 网页那个"展开后显示 Allow + Effective"的 UI 综合视图**不是同一个东西**。`security` 命令里 `exist=false` 在 ACL 未启用的 zone 不代表"被拒"，而是"无显式规则 + 默认放行"。要拿"能不能调通"的最终结论用 `acl-check`，别只看 `security`。
- US-TTP / EU-TTP 都用 ByteDance SSO 换 JWT（不是 TikTok SSO）。本地 `bytedcli auth login` 登好就行，不需要额外操作；查询命令（security / acl-status / strict-auth-status / acl-check）仅在本机有 SSO 登录态时可用。

## Notes

- 使用全局 `--site` 选择站点（`cn|boe|byteintl|i18n-tt|us-ttp|eu-ttp`，默认 `cn`）。Per-service `--neptune-site` is a hidden alias for backward compatibility.
- `--direction` 支持：`ingress|egress`（默认 `ingress`）
- `neptune stability` 命令：
  - `--method <method>`（可选）：精确匹配的 server-side filter，不支持 glob；目标 method 已知时强烈建议传入，可把 ~10k 条 / 17 MB 量级响应缩到几十条 / KB 量级（后端只接受 method 这一项 server-side filter，caller psm/cluster 不会被后端识别；如需按 caller 过滤请在调用方做客户端过滤）
- `--zone` 建议显式传入；如不传，默认：`CN(cn/byteintl)`、`BOE(boe)`、`SG(i18n-tt)`；可用 `neptune list-cp-regions` 查看可选值
- `neptune strict-auth apply` 命令：
  - 结构化参数模式要求 `--caller-psm`、`--callee-psm`、`--reason`、至少一个 `--method`，可选 `--caller-cluster`、`--callee-cluster`、`--zone`、`--reviewer`、`--viewer`
  - `--method` 和 `--zone` 支持重复传入或逗号分隔；payload 中会写入 `zones: string[]`
  - 如平台字段超出 CLI flags，使用 `--payload-json` 或 `--payload-file` 传完整 strict authorization payload；raw payload 模式不要混用结构化 flags
- `neptune deploy-unit list`：
  - 枚举 deploy units / zone-cluster pairs，便于 agent 先发现目标集群
- `neptune strict-auth add`：
  - 默认 dry-run；只有显式传 `--execute` 才会真的调 `call_chain/create` + `acc_ctrl/update`
  - 需要显式传 `--zone` 和 `--callee-cluster`；CLI 不会再自动枚举全部 deploy units 并批量 fanout
- `neptune auth-mode update`：
  - 默认 preview；只有显式传 `--execute` 才会真正调用后端 mutation API
  - 用于直接修改服务级 strict-auth / strong-auth 模式
  - `--kind strict-auth` 与 `--kind strong-auth` 走不同后端 endpoint，响应 shape 也不同：
    - `strict-auth` 常见返回 `config_value.deny` / `config_value.grey`
    - `strong-auth` 常见返回 `config_value.status`
  - `--mode` 使用语义值 `open|grey|closed`
  - **安全要求**：如果操作会把 strict-auth 或 strong-auth 从未启用/关闭态改成启用态（例如改成 `grey` 或 `open`），agent 必须先：
    - 查询当前状态（优先用 `neptune strict-auth-status` / `neptune strong-auth-status`）
    - 明确提示这可能导致线上流量被拦截或触发事故
    - 向用户二次确认，并在拿到明确确认前不要执行 `neptune auth-mode update`
  - 如果用户只是说"开启 ACL / 开启 strict auth / 开启 strong auth"，但没有再次确认，默认先停在确认步骤，不直接写入
- `neptune strict-auth sync export|preview|create`：
  - 这是对 Neptune 原始 sync API 的薄封装，不会在 CLI 内部自动做 hub 选择、flatten、merge、fanout
  - `export` 直接拿指定 `psm/zone/cluster` 的 upstream config dump
  - `preview` / `create` 支持 structured metadata flags，或 `--metadata-json` / `--metadata-file` 传完整 metadata
  - `create` 额外要求 `--configs-json` / `--configs-file`，configs 通常由 agent 根据多处 export + preview 结果自己整理
  - Neptune `create_order` 是异步任务；如果 phase 2 依赖 phase 1 产物，agent 需要自行等待/重跑 fanout

## Agent Guidance: upstream ACL sync

- 如果用户只给了一个服务名/PSM，例如"show me the ACL status of example.callee.service"，默认把它理解为 **callee PSM**，不是 caller、cluster 或 zone。
- 如果用户没有给 zone/cluster，不要猜；先运行 `neptune deploy-unit list --psm <psm>` 找出所有 deploy units，再按每个 zone/cluster 分别查询。
- 如果用户提到 `SG-Central` / `Singapore-Central`，要理解这是在说与 `SGALI` 对应的逻辑区域；但真正发命令时，不要把 zone 名当作全局可互换 alias，仍需按具体命令/API 已接受的字面值来传参。
- 当用户说"ACL status of <psm>"时，优先给出一个按 deploy unit 聚合的摘要，至少包含：
  - zone
  - cluster
  - `acl-status`：zone 级 ACL 总开关
  - `strict-auth-status`：strict authorization / 白名单授权状态
  - `strong-auth-status`：strong authentication / 强鉴权状态
- 术语映射要稳定：
  - **authorization** 对应 `neptune strict-auth-status`
  - **authentication** 对应 `neptune strong-auth-status`
- 当用户只问某个 PSM 的 ACL / auth 状态、但没有给 caller 时，不要默认跑 `acl-check`；`acl-check` 需要 caller→callee 语义，适合回答"某个 caller 现在能不能调这个 callee"。
- 推荐 agent workflow（PSM-only 状态排查）：
  - 先运行 `neptune deploy-unit list --psm <psm>`
  - 对每个 zone/cluster 运行 `neptune acl-status --psm <psm> --cluster <cluster> --zone <zone>`
  - 对每个 zone/cluster 运行 `neptune strict-auth-status --psm <psm> --cluster <cluster> --zone <zone>`
  - 对每个 zone/cluster 运行 `neptune strong-auth-status --psm <psm> --cluster <cluster> --zone <zone>`
  - 最终把结果汇总成一张按 zone/cluster 展开的状态表，再给结论性摘要
- 如果用户要求"Add upstream X to the ACL of service Y in all clusters and regions"，默认语义是：
  - `X` = **caller / upstream**
  - `Y` = **callee / downstream / rule target**
- 如果用户说的是"我这个 upstream 想申请访问某个 downstream / please request permission / 帮我提权限单"，默认不要走 `strict-auth add`：
  - 这表示发起方是 **caller/upstream 在申请权限**
  - 应优先走 `neptune strict-auth apply`
- 如果用户说的是"我来给我的服务加一个 upstream / add caller X to the ACL of service Y"，默认优先走 `strict-auth add`：
  - 这表示操作者已经站在 **downstream/callee owner** 视角
  - 只有在操作者本身有权限修改 downstream ACL 时，这个路径才成立
- 这里的"fanout add"与"copy/sync existing ACL rules"是两种不同 workflow：
  - **fanout add**：把某个 caller 作为新 upstream，逐个加到多个 target deploy units 上；使用 `neptune strict-auth add`
  - **sync/copy**：把某个 source zone/cluster 上已有 ACL 配置复制到一个或多个 target zone/cluster；使用 `neptune strict-auth sync export|preview|create`
- 当用户明确说"all clusters / all regions / 全部集群 / 全部 region"时，不要假设 CLI 会自动 fanout；agent 应自行编排：
  - 先运行 `neptune deploy-unit list --psm <callee>`
  - 对 deploy-unit list 返回的每个 `zone + cluster` 单独调用一次 `neptune strict-auth add`
  - 每次调用都传：
    - `--callee-psm <callee>`
    - `--zone <zone>`
    - `--callee-cluster <cluster>`
    - `--caller-psm <caller>`
- 如果用户没有显式说"all clusters / all regions"，也没有提供 zone/cluster，不要默认全量写入；先确认范围，或者先展示 deploy-unit list 给用户确认。
- 推荐 agent workflow（upstream ACL fanout add）：
  - 从用户请求中提取 caller/upstream 与 callee/downstream
  - 运行 `neptune deploy-unit list --psm <callee>`
  - 如果请求是全量 fanout，则遍历全部 deploy units；如果请求是部分范围，则先按用户给定 zone/cluster 过滤
  - 对每个目标 deploy unit 调用 `neptune strict-auth add --callee-psm <callee> --zone <zone> --callee-cluster <cluster> --caller-psm <caller>`
  - 默认先 dry-run 预览；只有用户明确要执行，或上下文明确是执行请求时，再加 `--execute`
  - 最终汇总成功/失败结果，并按 zone/cluster 列出每次 add 的目标
- 如果用户说的是"copy my ACL rules from <specified region and cluster> to <one or more regions and clusters>"，默认不要走 `strict-auth add`：
  - 这表示用户想复制 source cluster 上**已有**规则，而不是新增单一 caller
  - 应优先走 `neptune strict-auth sync export|preview|create`
- 推荐 agent workflow（ACL sync / copy）：
  - 明确 source `psm + zone + cluster`
  - 明确一个或多个 target `psm + zone + cluster`
  - 先对 source 运行 `neptune strict-auth sync export`
  - 对每个 target 运行 `neptune strict-auth sync preview`
  - 让 agent 在 preview 结果基础上整理 configs
  - 对每个 target 运行 `neptune strict-auth sync create`
  - 汇总每个 target 的 preview / create 结果
- 只需要"枚举 callee 的 deploy units"时，用 `neptune deploy-unit list`
- 只需要"给某个明确的 zone/cluster 补 upstream caller"时，用 `neptune strict-auth add`
- 需要跨 zone/cluster 同步 upstream ACL 时，不要把 hub 选择、flatten、merge、fanout 逻辑硬编码成固定 CLI 流程；优先让 agent 自己编排，并通过 `run_command` 调以下原语：
  - `neptune strict-auth sync export`
  - `neptune strict-auth sync preview`
  - `neptune strict-auth sync create`
- 推荐 agent workflow：
  - 先用 `deploy-unit list` 或其他已知 deploy-unit 来源找出目标 zone/cluster 集合
  - 对每个目标 zone/cluster 单独调用 `strict-auth add`；不要假设 CLI 会自动对全部 cluster 批量写入
  - 对一个或多个 source cluster 跑 `sync export`
  - 在 agent 侧做 caller flatten / dedupe / merge / blacklist 过滤
  - 对每个 fanout 目标先跑 `sync preview`
  - 确认 preview 结果后，再跑 `sync create`
- `--page` 和 `--page-size` 用于分页（`--page-count` 和 `--page-num` 是隐藏的兼容别名）
- `neptune lane list` 命令：
  - `--domain-code`: 域名代码（必填）
  - `--group-code`: 组代码（可选，默认同 domain-code）
  - `--zone`: 区域（必填）
  - `--lane-name`: 泳道名称过滤（可选）
  - `--logic-unit-name`: 逻辑单元名称（可选，默认 "default"）
  - `--psm`: PSM 过滤（可选）
- `neptune psm add` 命令：
  - `--domain-code`: 域名代码（必填）
  - `--lane-name`: 泳道名称（必填）
  - `--zone`: 区域（可选，默认：CN 适用于 cn/byteintl，BOE 适用于 boe）
  - `--resource-psm`: 服务 PSM（必填）
  - `--logic-unit-name`: 逻辑单元名称（可选，默认 "default"）
  - `--resource-type`: 资源类型（可选，默认 "tce"）
  - `--is-sub-lane`: 是否为子泳道（可选，默认 false）
  - `--operation-type`: 操作类型（可选，默认 "create"）
- `neptune psm list` 命令：
  - `--domain-code`: 域名代码（必填）
  - `--lane-name`: 泳道名称（必填）
  - `--zone`: 区域（可选，默认：CN 适用于 cn/byteintl，BOE 适用于 boe）
  - `--logic-unit-name`: 逻辑单元名称（可选，默认 "default"）
  - `--page`: 页码（可选，默认 1）
  - `--page-size`: 每页数量（可选，默认 100）

## References

- `references/neptune.md`
