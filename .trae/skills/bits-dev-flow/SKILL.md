---
name: bits-dev-flow
description: 当需要执行需求级 BITS 开发任务初始化、处理 Codebase Assistant / Aime / CodeGuard 评审修复闭环，或通过 BITS 流程执行覆盖率优化闭环时使用。
---

# BITS 开发流程

## 目标

本 skill 用于编排需求级 BITS 流程：

1. 围绕当前 delivery workspace 创建或复用 BITS 开发任务。
2. 基于当前需求范围处理 Codebase Assistant / Aime / CodeGuard 评审反馈。
3. 基于 Huatuo 分支覆盖率执行覆盖率优化、真实线上 UI 覆盖和刷新验证。
4. 形成可追溯、可验证、可回写的选择性修复闭环。

本 skill 可以读取其它 skill、command、agent 和阶段产物作为证据，但不得修改其它 skill、command、agent 或它们的触发描述来引入本规范。若 `/delivery:bits` 规范本身需要调整，只能修改本 skill、`.trae/commands/delivery:bits.md` 和必要的全局入口说明。

## 模式

| 模式 | 触发 | 目标 | 默认行为 |
| --- | --- | --- | --- |
| `--init` | 用户要求创建或初始化 BITS 开发任务 | 解析仓库、分支、Meego、MR 和 BITS 创建参数；按已读取的 CLI 说明生成或执行开发任务命令。 | dry-run |
| `--cr` | 用户要求处理 Codebase Assistant / Aime / CodeGuard 评审问题 | 拉取评审评论，生成问题清单和修复任务产物，选择性修复有效问题，验证，逐 thread reply，并在用户授权时提交、推送和 resolve。 | 本地修复和逐 thread reply，不提交不 resolve |
| `--coverage` | 用户要求通过 `/delivery:bits` 执行覆盖率优化闭环 | 拉取最新 Huatuo 覆盖率，判断整体覆盖率阈值，按未覆盖行数最大文件最多三轮执行代码优化、真实线上 UI 覆盖、写接口浏览器拦截和刷新验证。 | 本地优化和验证，不提交不回写 |

`--init`、`--cr` 和 `--coverage` 互斥。若未提供模式，必须暂停并询问用户要执行哪一种。

## 授权边界

- `--init` 未传 `--execute` 时，只允许生成命令和执行 dry-run，不得真实创建 BITS 任务。
- `--cr --dry-run` 只允许拉取、解析、归一化、合并问题和产出决策草案；不得修改业务代码，不得远端 reply、resolve / 关闭线程或发布 MR 总结。
- `--cr` 未传 `--submit` 时，可以在审核通过后修改本地代码、运行验证，并默认对每个纳入处理的当前 CR thread 独立 reply 供人工审核；但不得 commit、push、resolve / 关闭线程或发布 MR 总结。
- `--cr --submit` 只有在本地修复和验证完成后，才允许并要求提交、推送；push 成功后才允许 resolve / 关闭已成功 reply 的对应 thread。reply 与 resolve 必须分开，禁止绕过 reply 直接 resolve，也禁止用一个总回复替代所有问题的逐条回复。
- `--coverage --dry-run` 只允许拉取覆盖率、选择候选文件、生成分析和覆盖方案草案；不得修改业务代码、执行真实写操作、提交、推送或回写。
- `--coverage` 未传 `--submit` 时，可以在审核通过后修改本地代码、执行真实线上 UI 覆盖和刷新验证，但不得 commit、push 或发布覆盖率评审表达。
- `--coverage --submit` 只有在三轮闭环结束、验证完成后，才允许提交、推送和发布覆盖率评审表达。
- 任何会访问内网、创建任务、写远端评论、关闭线程、推送分支的动作，都必须遵守当前环境的授权和登录要求。

## 必读前置文件

任一模式开始前必须读取：

- `.trae/AGENTS.md`
- `.trae/PROJECT_CONTEXT.md`
- `.trae/DELIVERY_STATE.md`
- `.trae/commands/delivery:bits.md`
- 涉及内部平台 CLI 时，读取 `bytedcli` skill；具体命令、参数、鉴权、fallback 和 domain guide 以该 skill 为准

`--init` 创建或复用 BITS 开发任务时，还必须读取 `.trae/skills/bytedcli/references/subskills/bytedance-bits/GUIDE.md`。`bytedcli bits develop create` 的参数、可省略项、自动解析能力、dry-run 行为和错误处理只以该 `bytedance-bits` 规范为准。其它 bytedcli subskill 或平台中的同名 `space_id` / workspace / devflow 规则不得用于填充 BITS 创建字段。

`--cr` 还必须读取：

- `.trae/skills/receiving-code-review/SKILL.md`
- `.trae/skills/verification-before-completion/SKILL.md`
- 当前 artifacts workspace 中用于映射需求范围的产物，至少包括已存在的 `03-prd-analysis.md`、`04-tech-plan.md`、`delivery-task.md`、`09-test-case-matrix.md`、`05-implementation-log.md`
- 如果输入或 artifacts 中包含本地 CodeGuard 报告，则读取 `bytedcli` skill 中 Code Review / CodeGuard 相关领域说明

`--coverage` 还必须读取：

- 当前覆盖率脚本，优先使用本 skill 内的 `scripts/collect-huatuo-branch-coverage.js`；若用户显式传入脚本路径，则以用户参数为准。
- 当前 artifacts workspace 中用于映射需求范围的产物，至少包括已存在的 `03-prd-analysis.md`、`delivery-task.md`、`09-test-case-matrix.md`、`05-implementation-log.md`、`10-user-test-report.md`。
- 当前覆盖率报告目录 `<workspace>/bits-flow/coverage/<cov-run-id>/coverage/` 下的 `latest.json`、`report.md`、`uncovered-list.json`、`uncovered-list.md` 和目标文件明细；若不存在，先通过脚本生成。
- 与真实线上 UI 覆盖、请求入参来源、写接口浏览器拦截和 BAM MOCK 已有入参相关的规则或证据；覆盖率优化必须由真实线上 UI 发起。读接口和无副作用接口必须保持真实请求；会落库、发奖、删除、修改配置、发送通知或产生其他线上副作用的写接口，必须在内置浏览器会话内拦截请求并返回 mock 响应，禁止真实命中后端。

## 产物目录

优先从 `.trae/DELIVERY_STATE.md` 解析当前 artifacts workspace。若缺失或存在歧义，必须阻塞并要求用户提供任务空间路径。

在当前 workspace 下创建 `bits-flow/`。根目录只放跨轮次索引、当前状态和少量稳定入口；每一次 `--cr`、`--coverage` 执行都必须写入独立轮次目录：

```text
<workspace>/bits-flow/
  bits-task-info.md
  bits-task-info.json
  current-cr -> cr/<cr-run-id>/              # 可选符号链接或文本指针，指向最新 CR 轮次
  current-coverage -> coverage/<cov-run-id>/ # 可选符号链接或文本指针，指向最新覆盖率轮次
  cr/
    <cr-run-id>/
      round-meta.json
      sources/
        codebase-mr-comments.json
        codebase-mr-files.json
        codebase-mr-get.json
        codebase-mr-status.json
        codebase-checks.json
        codeguard-report.md
      analysis/
        codebase-assistant-issue-list.md
        codebase-assistant-fix-tasks.md
      closure/
        cr-modification-closure.json
      writeback/
        review-writeback.md
        submit-mr-summary.md
        replies/
          reply-<issue-id>.md
      snapshots/
        after-submit/
          codebase-mr-comments.json
          codebase-mr-get.json
          codebase-mr-status.json
          codebase-checks.json
  coverage/
    coverage-exclusion-log.json
    <cov-run-id>/
      round-meta.json
      coverage-optimization-log.md
      coverage-optimization-state.json
      coverage-optimization-plan-round-<n>.md
      coverage-review-expression.md
      coverage/
        latest.json
        report.md
        uncovered-list.json
        uncovered-list.md
        results/
```

`<cr-run-id>` 必须稳定且可读，格式为 `YYYYMMDD-HHMMSS-mr-<iid>-v<version>`；如果无法读取 MR version，则用 `YYYYMMDD-HHMMSS-mr-<iid>-commit-<shortsha>`。`<cov-run-id>` 格式为 `YYYYMMDD-HHMMSS-coverage-<branch-or-mr>`。

只创建当前模式需要的文件。同一轮次内可基于新证据更新同名文件；跨轮次必须新建目录，禁止覆盖旧轮次。远端原始快照只能写入本轮 `sources/` 或 `snapshots/`，不得写入 `bits-flow/` 根目录。

`--coverage` 的 Huatuo 原始报告产物写入当前轮次目录 `<workspace>/bits-flow/coverage/<cov-run-id>/coverage/`，例如 `bits-flow/coverage/20260626-150451-coverage-feat-meego-7306602080-incentive-control/coverage/results/`。该目录必须由覆盖率脚本重建或替换，且不得默认带 `browser-bridge-*` 目录层。覆盖率脚本产物必须至少包含 `latest.json`、`report.md`、`uncovered-list.json`、`uncovered-list.md` 和逐文件 `report.md` / `summary.json`。不得把本轮唯一有效 `results/` 写到共享 `<workspace>/coverage/`。

`<workspace>/bits-flow/coverage/coverage-exclusion-log.json` 是跨 run 目标文件版本登记与候选跳过事实源，字段和策略以 `coverage-exclusion-log.template.json` 为准。`insertLines = 0` 与 BAM 文件由覆盖率脚本默认过滤；同一轮目标文件、处理结果和全局排除审核写入本轮 state。所有被作为本轮目标文件处理过的文件都必须写入或更新全局日志，并记录当时 Huatuo 文件报告的 `fileCoverageVersion`；后续刷新报告时，只有当前候选的 `fileCoverageVersion` 与 ACTIVE 记录一致，才跳过该文件；版本变化时必须先将旧 ACTIVE 记录标记为 `SUPERSEDED`，再允许该文件重新进入候选。

## 模板文件

- `cr-modification-closure.template.json`：用于初始化 `<workspace>/bits-flow/cr/<cr-run-id>/closure/cr-modification-closure.json`。
- `coverage-optimization-state.template.json`：用于初始化 `<workspace>/bits-flow/coverage/<cov-run-id>/coverage-optimization-state.json`。
- `coverage-optimization-plan-round.template.md`：用于初始化 `<workspace>/bits-flow/coverage/<cov-run-id>/coverage-optimization-plan-round-<n>.md`。
- `coverage-exclusion-log.template.json`：用于初始化 `<workspace>/bits-flow/coverage/coverage-exclusion-log.json`。

`SKILL.md` 只描述 Gate 和执行规则，不重复维护模板中的字段结构。

## `--init` 流程

### 1. 事实解析

按以下优先级收集事实：

1. `.trae/DELIVERY_STATE.md`
2. 当前 artifacts workspace：`00-inputs.md`、`02-task-space.md`、`repo-routing.md`、`meego-summary.md`、`04-tech-plan.md`、`bits-flow/bits-task-info.json`
3. `meego-*/context/` 和 `meego-*/repos/` 目录
4. 目标仓库 git 状态：分支、remote URL、既有 MR 链接
5. 用户参数

字段冲突时不得按“最后一个值”覆盖；必须在 `bits-task-info.json.blockers[]` 中列出候选值、来源和需要用户确认的字段。

### 2. 字段要求

| 字段 | 是否必需 | 解析规则 |
| --- | --- | --- |
| `space_id` | 是，除非 `from_dev_id` 能完整继承 | 用户或既有 BITS 任务显式提供时使用显式值；缺失时默认 `139033499138`。 |
| `title` | 是 | 优先使用 Meego 标题或当前需求摘要；不得使用空泛标题。 |
| `change` 或 `services` | 是 | 默认使用 BITS 主 SCM / project unique id：`service=ecom/alliance_operation_mono/mono,branch=<当前仓库分支>`；已知 BITS service / branch / MR 时优先用 `--change`。用户若写 `server`，按 `service` 理解。 |
| `lane` | 是 | 优先使用用户显式 lane；缺失时默认与 PPE 环境相同。若 PPE 也缺失，先随机生成 PPE，再令 `lane=<ppe_environment>`。 |
| `scm_branch` | 是 | 使用当前仓库分支；禁止使用 `master` / `main` 作为需求开发分支。若远程分支不存在，dry-run 只记录待推送命令；`--execute` 或用户明确授权时，必须先推送当前分支再创建 BITS 任务。 |
| `meego` | 强依赖 | 从 state 或 artifacts 读取 Meego URL / 工作项 ID；缺失则询问。 |
| `from_dev_id` | 可选 | 有已验证模板开发任务时优先使用。 |
| `mr` | 可选 | 若当前分支已有 open MR 且需要复用，则在 `--change` 中加入 `mr=<id>`。 |
| `ppe_environment` | 派生 | 优先使用用户输入或上下文中的 PPE；缺失时随机生成，建议格式为 `ppe_<task_id>_<6位小写字母数字>`，并写入 `field_sources`。 |

字段解析采用 `bytedcli` 明确支持的来源和自动能力。尤其注意：

- `space_id` 优先来自 BITS workspace URL、既有 BITS 配置、既有 BITS 任务、用户输入，或由已验证 `from_dev_id` 完整继承；这些来源都缺失时使用本 skill 固定默认值 `139033499138`。不得使用 Meego project key、飞书 Wiki `space_id`、Lark DevOps space、仓库 ID 或其它平台同名字段代替。
- `service` 默认固定为 BITS 主 SCM / project unique id `ecom/alliance_operation_mono/mono`，其关联 Codebase 仓库路径为 `ecom/alliance-operation-mono`。`service` / `projectUniqueId` 与 Codebase `repo_path` 不是同一字段；不得把仓库路径 `ecom/alliance-operation-mono` 当作 BITS `service` 默认值，除非用户显式提供且 dry-run 验证通过。用户提供其它 BITS service / project unique id 时使用用户值，并在 `field_sources` 记录覆盖来源；不得从其它平台的 space / project id 推导 service。
- `lane` 默认等于 PPE 环境；PPE 缺失时必须先随机生成 `ppe_environment`，再派生 `lane`。用户显式传入 lane 时可覆盖默认值，但若与 PPE 不一致，必须在 `field_sources` 记录差异。
- `scm_branch` 必须来自当前仓库分支。远程分支缺失时，未授权场景不得 push；只写入 `remote_branch_status=PENDING_PUSH` 和待执行的 `git push -u origin <branch>`。真实创建前必须确认远程分支存在或已推送成功。
- `from_dev_id` 必须是已存在的 BITS 研发任务 ID；不得把 Meego 工作项 ID、需求 ID、MR ID 或 release ticket ID 当作 `from_dev_id`。
- `.bits/project_config.json` 只能按 `bytedance-bits` 规范中已声明的字段语义使用；若 guide 未说明某字段可补齐 `develop create --space-id`，不得自行扩展。
- GUIDE 和本 skill 默认值都未声明可自动推断的字段，必须写入 `bits-task-info.json.blockers[]` 并暂停询问，不得通过其它 skill 的同名规则猜测。

任一必填字段缺失，或同一字段存在多个冲突候选时，必须在运行 CLI 前停止并询问用户，不得猜测。

### 3. 命令生成和执行

遵守 `bytedcli` skill 中 `develop create` 的调用规范生成命令。优先使用已安装的 `bytedcli`；不可用时只替换命令前缀为 fallback，不得改变参数语义：

```bash
NPM_CONFIG_REGISTRY=http://bnpm.byted.org npx -y @bytedance-dev/bytedcli@latest ...
```

若用户没有明确授权真实执行，默认只生成并执行 dry-run：

```bash
bytedcli bits develop create \
  --title "<title>" \
  --change "service=ecom/alliance_operation_mono/mono,branch=<current_branch>[,mr=<mr>]" \
  --lane "<ppe_environment>" \
  --space-id 139033499138 \
  --from-dev-id <from_dev_id> \
  --meego "<meego_url_or_id>" \
  --dry-run
```

只允许使用 `bytedance-bits/GUIDE.md` 明确支持的 `--services`、`--change`、`--service-type`、`--space-id`、`--from-dev-id`、`--meego`、`--lane` 等参数组合。需要复用已有 MR、指定非主 SCM、用 Meego 自动填标题或用 `--service-type` 自动解析 projectUniqueId 时，也必须以该 guide 的说明为准。`--from-dev-id` 没有值时不得出现在最终命令中。只有用户显式传入 `--execute`，且 dry-run 成功、字段无冲突、CLI 登录态可用、远程分支已存在或已授权推送成功时，才执行真实创建。

### 4. `bits-task-info.json` 合同

写入 `bits-task-info.md` 和 `bits-task-info.json`。

`bits-task-info.json` 必须包含：

```json
{
  "version": 1,
  "mode": "init",
  "status": "BLOCKED|DRY_RUN_READY|DRY_RUN_PASS|CREATED|REUSED",
  "resolved_at": "",
  "inputs": {
    "task_id": "",
    "workspace": "",
    "target_repo": "",
    "execution_repo_root": "",
    "branch": "",
    "remote_branch_status": "EXISTS|PENDING_PUSH|PUSHED|UNKNOWN",
    "remote_branch_push_command": "",
    "meego": "",
    "ppe_environment": "",
    "mr": ""
  },
  "bits": {
    "space_id": "",
    "dev_id": "",
    "change_id": "",
    "lane": "",
    "from_dev_id": "",
    "service": "",
    "command": "",
    "dry_run_command": "",
    "execution_output_ref": ""
  },
  "field_sources": [],
  "blockers": []
}
```

## `--cr` 流程

### 1. MR 和来源解析

从 `.trae/DELIVERY_STATE.md`、`bits-task-info.json`、当前 git 分支、Codebase URL 或用户参数中解析 repo、branch 和 MR。

使用 bytedcli / Codebase 能力获取 Codebase Assistant / Aime 评论，必须保存拉取命令、拉取时间、MR version / commit 和线程状态。如果存在或用户要求合并本地 CodeGuard 报告，也纳入来源，例如：

- `bits-code-guard/report.md`
- `bits-code-guard-history-*/report.md`

如果无法唯一确定 MR 或仓库，必须阻塞并要求用户提供 MR URL 或 repo path。

解析 MR 后必须创建本轮 `bits-flow/cr/<cr-run-id>/`，并写入 `round-meta.json`：

- 记录 repo、branch、MR iid、MR version / source commit、base commit、用户参数、命令证据、创建时间和状态。
- 记录 `sources/`、`analysis/`、`closure/`、`writeback/`、`snapshots/` 的相对路径。
- bytedcli / Codebase / CodeGuard 原始输入快照必须写入 `sources/`。

### 2. 问题归一化

写入本轮 `analysis/codebase-assistant-issue-list.md`，必须包含：

- 来源元数据：MR、commit / version、拉取时间、命令证据
- 当前 MR 相关 `open`、`resolved`、`outdated` 线程
- 本轮纳入的 CodeGuard 问题
- 稳定 issue id
- 文件 / 行号 / 线程引用
- reviewer 原始 claim
- `Detailed Issues` 章节：每个稳定 issue 必须有独立小节，写明线程 ID / 来源 / 状态、文件行号、原始问题描述、具体触发场景、具体风险、reviewer 建议；被拒绝或部分采纳的问题还必须写明本轮分类依据或处理口径。不得只用摘要表、短 claim summary 或 closure JSON 替代具体问题描述。
- 合并关系：`merged_into` / `merged_from`
- 初步分类：`REQUIREMENT_RELEVANT`、`UNREACHABLE_BY_CURRENT_FLOW`、`OUT_OF_SCOPE_LOW_IMPACT`、`CONFLICTS_WITH_REQUIREMENT`、`OVER_DEFENSIVE`、`ALREADY_FIXED`、`NEEDS_INVESTIGATION`

合并规则：

- 同一根因、同一行为风险、同一修复点的问题必须合并。
- 同一文件但不同根因的问题不得合并。
- Codebase Assistant 与 CodeGuard 对同一风险的重复反馈，必须合并为一个 issue，并保留全部来源。
- 只靠文本相似但行为风险不同的问题不得合并。

### 3. 选择性修复任务列表

代码修改前必须写入本轮 `analysis/codebase-assistant-fix-tasks.md`。每个归一化 issue 都必须映射到任务行：

| 任务 | 来源问题 | 处理决策 | 需求 / 原子需求引用 | 原因 | 状态 | 解决方案 | 解决结果 |
| --- | --- | --- | --- | --- | --- | --- | --- |

决策枚举：

- `ACCEPT`：问题成立，且属于当前需求范围，必须修复。
- `PARTIAL`：问题部分成立，只修复与当前需求范围相关的最小部分。
- `REJECT`：问题不成立、链路不可达、范围外、与需求冲突或属于过度防护。
- `ALREADY_FIXED`：当前代码已经满足要求，只记录证据和回写说明。
- `BLOCKED`：需要用户、产品、接口、权限或远端信息确认。

决策规则：

- 不默认认为任何评审问题都是正确的。
- 每个问题都必须对照当前需求、原子需求、实现代码和测试用例核实。
- 链路不通、无法通过当前业务入口到达、或会被外层组件 / 前置校验 / 权限 / 状态机拦截而无法进入的代码问题，必须拒绝处理并记录可达性证据。
- 不处理不在本次需求修改范围且影响程度不高的问题。
- 不采纳会破坏、稀释或改变本次需求功能实现的建议；以当前需求实现为主。
- 不实现对本需求没有实质风险收益的过度防护；安全防护、兜底、抛异常、try/catch、空值保护、监控 / 日志 / 异常上报等建议必须保持最小必要范围。
- 需求未提及且无法证明当前需求链路存在可达、确定性风险的安全防护建议，必须标记为 `OVER_DEFENSIVE` 并 `REJECT`；不得以“更安全”“更健壮”“便于排障”为理由新增需求外防护逻辑。
- Codebase / Aime / CodeGuard 引用的代码规范、规则来源或同类文件实现只能作为评审来源，不能作为需求证据；`ACCEPT` / `PARTIAL` 必须有 PRD、技术方案、任务或测试用例证据，否则按范围外建议拒绝。
- 已修复的问题只记录证据并关闭或回复线程，不做无意义代码改动。

### 4. 可达性、最小改动和代码规范 Gate

进入代码修改前，必须先完成以下 Gate：

1. 可达性 Gate：
   - 从当前需求入口、用户操作路径、组件渲染条件、权限 / 状态机、外层组件拦截逻辑和测试用例判断目标代码是否可达。
   - 若代码链路不通、被外层组件拦截、当前交互状态无法进入，或只能通过非当前需求路径构造进入，必须标记为 `UNREACHABLE_BY_CURRENT_FLOW`，决策为 `REJECT` 或 `ALREADY_FIXED`。
   - 不得为不可达代码补空值保护、异常兜底、安全防护或重构。
2. 安全防护精简 Gate：
   - 对“安全防护”“抛出异常”“try/catch”“兜底返回”“空值保护”“监控 / 日志 / 异常上报”等评审建议，只允许处理当前需求链路中可达且有实际风险的最小场景。
   - 若 PRD、技术方案或原子需求没有要求，且现有链路已有提示、拦截、权限、类型或错误处理能力，必须优先 `REJECT` 额外防护；不得新增需求外的安全校验、失败埋点、异常上报、数据清洗或兜底分支。
   - 不得用已提交误改或同类文件中的需求外实现反向证明当前需求；若规范与历史结论冲突，以规范为准，并先纠正产物和代码。
   - 优先复用现有错误处理、类型约束、前置校验和业务兜底；不得新增宽泛 catch、吞错、默认成功、全局 fallback 或改变正常业务语义的异常分支。
3. 最小改动 Gate：
   - 只改关闭当前 issue 必需的最少文件、最少分支、最少判断和最少类型定义。
   - 不夹带无关重构、命名整理、样式调整、依赖升级、文件搬迁或既有代码清理。
4. BAM 接口 / 字段 Gate：
   - CR 中涉及 BAM 接口、字段、request / response、IDL 或生成类型不一致时，只允许通过当前仓库认可的 BAM update / codegen 命令更新，例如 `npm run bam`、`npx bam update --remove-folder` 或项目既有等价脚本。
   - 禁止手动编辑 `src/bam/**`、`bam/**` 等 BAM 生成目录来新增、删除或修改接口、字段、枚举、request / response 类型、方法签名或 URL 映射。
   - 如果 BAM update 后字段或接口仍不存在，必须把对应 CR issue 标记为 `REJECT` 或 `BLOCKED`，并记录 update 命令、生成版本和缺失证据；不得通过 `any`、手写扩展 generated type、手补 generated 文件或伪造字段合同来关闭问题。
5. 代码规范 Gate：
   - 修改必须沿用当前仓库的代码风格、类型写法、错误处理方式、命名规范和格式化习惯。
   - 不得引入 debug 代码、临时日志、未使用变量、无意义注释、绕过类型检查的 `any` / `as unknown as`、或与现有 lint / typecheck 规则冲突的写法。
   - 不能运行完整规范检查时，必须记录原因、已执行的替代检查和残余风险。

### 5. 代码修改审核

任何被接受的问题在编辑代码前，都必须先把审核记录写入本轮 `closure/cr-modification-closure.json`：

从 `cr-modification-closure.template.json` 初始化，不得在 `SKILL.md` 中重写 JSON 结构。

这个 JSON 是闭环事实源。它必须保留 issue id、来源证据、决策、计划 / 实际改动、影响文件、验证和回写状态。`ACCEPT` / `PARTIAL` issue 缺少 `scope_audit.reachability`、`change_audit.minimal_change` 或 `change_audit.code_style_compliant` 时，不得开始编辑代码。

### 6. 串行实现

对每个 `ACCEPT` / `PARTIAL` issue：

1. 重新读取目标代码和需求 / 测试引用。
2. 确认改动位于当前需求仓库内。
3. 确认目标代码在当前需求链路中可达，且不会被外层组件拦截。
4. 确认改动有意义且可被验证覆盖。
5. 确认改动不与当前需求行为冲突。
6. 确认安全防护类改动足够精简。
7. 只编辑审核通过的文件，并遵循最小改动原则。
8. 确认修改满足当前仓库代码规范。
9. 针对该 issue 运行聚焦验证。
10. 进入下一个 issue 前更新本轮 `analysis/codebase-assistant-fix-tasks.md` 和 `closure/cr-modification-closure.json`。

不得把无关修复打包到同一个 issue 下。不得夹带无关重构。若实现过程中发现 issue 范围扩大，必须暂停并重新更新该 issue 的 audit。

### 7. 验证

声明完成前必须具备新鲜验证证据：

- 至少运行与本次改动直接相关的聚焦验证。
- 对本次修改文件运行可用的格式化、lint、typecheck 命令。
- 对本次修改文件确认 `git diff --check`。
- 检查本次修改没有 debug 代码、临时日志、未使用变量、无关重构或与现有风格冲突的写法。
- 若 full typecheck / build 因无关文件失败，保留全量失败证据，并提供本次修改路径过滤结果。
- 若某项验证无法运行，必须记录原因、替代验证和残余风险；不得把未运行说成通过。

验证结果必须同步写入本轮 `closure/cr-modification-closure.json.issues[].verification`。

### 8. 回写

非 `--dry-run` 的 `--cr` 默认必须逐 thread reply，用于人工审核。只有用户要求提交，或 command 模式明确传入 `--submit`，才允许 commit、push、resolve / 关闭线程和发布 MR 总结。

`--cr` 的 reply 是默认闭环，不是可选增强；`--cr --submit` 的 resolve 是提交代码后的强制闭环。回写按已读取的 Codebase 评论相关说明执行，并遵守：

- 对本轮每个纳入处理的当前评审问题生成独立 reply，不得把所有问题合并成一个 MR 级总回复来替代逐条回复。
- 若一个归一化 issue 合并了多个 open/current Codebase thread，必须对每个源 thread 分别 reply；回复正文可以复用，但每个 thread 都必须有自己的远端回复证据。
- 每个需要关闭的 thread 必须在 `--submit` 提交并 push 成功后，先确认该 thread 的 reply 成功，再执行 resolve / 关闭线程；禁止未 reply 直接 resolve，也禁止未提交代码就 resolve。
- `REJECT`、`ALREADY_FIXED`、`ACCEPT`、`PARTIAL` 都必须有对应 reply，说明采纳、拒绝或已修复的原因与证据。
- MR 总结可以额外发布，但不能替代逐 issue / 逐 thread reply。
- 任一应 reply 的 thread 因权限、网络或 CLI 失败未完成时，本轮状态不得标记为 `PASS`；任一 `--submit` 下应 resolve 的 thread 未完成时，本轮状态不得标记为 `SUBMITTED` / `PASS`；必须记录为 `BLOCKED` 或 `PARTIAL_SUBMITTED`，并保留失败证据和待人工动作。

写入本轮 `writeback/review-writeback.md`，记录：

- 每个 issue 的最终处理状态。
- Codebase thread id / comment id。
- 已回复、已关闭 / resolved、跳过或待人工回写的状态。
- 不采纳原因和证据摘要。
- commit、push、MR 总结状态。

未传 `--submit` 时，本轮 `writeback/review-writeback.md` 必须记录每个 thread 的 reply 证据或失败原因，并明确 resolve 状态为未执行 / 待提交后处理；不得伪造 resolved 状态。传入 `--submit` 时，`review-writeback.md` 和 `closure/cr-modification-closure.json` 必须记录每个 thread 的 reply 证据、提交推送后的 resolve 证据和远端快照引用。

## `--coverage` 流程

### 1. 覆盖率上下文解析

从 `.trae/DELIVERY_STATE.md`、当前 workspace、当前执行仓库和用户参数中解析：

- `workspace`
- `execution_repo_root`
- `target_repo`
- `fromBranch`
- `toBranch`
- 覆盖率脚本路径
- `threshold`，默认 `90`
- `rounds`，默认 `3`

覆盖率脚本优先使用本 skill 内的 `scripts/collect-huatuo-branch-coverage.js`；若用户显式传入脚本路径，则以用户参数为准。无法唯一确定脚本、仓库或分支时必须暂停。

解析覆盖率上下文后必须创建本轮 `bits-flow/coverage/<cov-run-id>/`，并写入 `round-meta.json`：

- 记录 workspace、execution repo、target repo、fromBranch、toBranch、threshold、rounds、脚本路径、用户参数、创建时间和状态。
- 记录本轮 `coverage/`、`coverage-optimization-log.md`、`coverage-optimization-state.json`、`coverage-review-expression.md` 和 `coverage-optimization-plan-round-<n>.md` 的相对路径。
- 创建或读取 `<workspace>/bits-flow/coverage/coverage-exclusion-log.json`，并基于 `coverage-optimization-state.template.json` 初始化本轮 state。字段结构、默认执行策略和全局排除策略以模板为准；日志不可解析时必须暂停。

### 2. 拉取最新覆盖率

必须通过覆盖率脚本刷新 Huatuo 数据：

```bash
node <coverage-script> \
  --browserCaptureServer \
  --repoRoot <execution_repo_root> \
  --outDir <workspace>/bits-flow/coverage/<cov-run-id>/coverage

# 脚本输出 loader 后，在已登录的 Huatuo coverage-list 页面用 browser_evaluate 执行 loader。
# 浏览器脚本必须在 Huatuo 页面内用 credentials: include 发真实线上请求；
# update/files/code 响应分段 POST 回本地 capture receiver，由 Node 自动合并到本轮 coverage/ 下生成 latest.json/report.md/uncovered-list.*。
```

脚本执行要求：

- 必须先触发 Huatuo 分支更新，再拉取 `branch/files` 和目标文件 `branch/code`。
- 必须提取所有未满 100%、`insertLines > 0` 且非 BAM 文件的明细；过滤结果写入脚本产物，避免在 skill 中重复维护候选规则。
- 必须替换本轮 `<workspace>/bits-flow/coverage/<cov-run-id>/coverage/` 的旧产物，不得混入旧报告。
- 默认使用“浏览器真实请求 + Node 分段接收落盘”的 capture server 模式：Huatuo API 请求在已登录 Huatuo 页面内发起，本地服务只接收分段响应并生成规范产物，避免 browser_evaluate 返回完整 payload 超时。
- `--printBrowserScript` + `--fromBrowserPayload` 仅作为人工 fallback；不得把轻量摘要冒充完整报告。
- 不得使用本地服务代理 Huatuo API，不得手工伪造覆盖率产物，不得把 Cookie 写入产物或提交记录。
- 仅在两段式模式不可用且用户明确提供 Cookie 时，才允许用 `HUATUO_COOKIE` 或 `--cookie` 作为备用直连模式。

### 3. 整体覆盖率 Gate

从最新 `latest.json` 中读取整体覆盖率：

1. 优先读取 Huatuo 更新接口返回的整体 `coverRatio`，例如 `latest.updateApi.coverRatio` 或原始更新响应中的 `data.coverRatio`。
2. 若没有整体覆盖率字段，不得用单文件 `coverRatio`、平均值或自行计算值替代，必须记录 blocker 并暂停。
3. 整体覆盖率 `>= threshold` 时，基于 `coverage-optimization-state.template.json` 写入本轮 `coverage-optimization-state.json`，同时写入本轮 `coverage-optimization-log.md`，状态为 `PASS`，不进入优化轮次。

### 4. 轮次候选文件选择

若整体覆盖率未达标，最多执行 `rounds` 轮。每轮从脚本生成的 `uncovered-list.json` 中选择 `effectiveUncoveredInsertedRows` 最大、未被本轮 state 或全局排除日志拦截的文件。

候选策略、同轮去重和跨 run 排除以 `coverage-optimization-state.template.json.execution_policy` 与 `coverage-exclusion-log.template.json.policy` 为准：

- 全局日志只记录“该文件曾作为目标文件处理”及当时的 `fileCoverageVersion`，不得要求或依赖进入排除的业务原因。
- 所有被选为目标文件的文件，在本轮结束前都必须写入或更新全局日志为 `ACTIVE`，并保存当前 `source_file_coverage_version`；无论本轮结果是代码优化、真实 UI 覆盖、写接口浏览器拦截、无安全数据阻塞或其他 `BLOCKED`，都适用。
- 全局日志中的 `ACTIVE` 记录只在 `source_file_coverage_version` 与当前 `coverage/latest.json.uncoveredFiles[].fileCoverageVersion` 或目标 `summary.json.fileCoverageVersion` 一致时拦截；同版本文件不得重新执行该文件的覆盖率优化 / UI 覆盖 / 刷新闭环。
- 如果版本不同，必须把旧 `ACTIVE` 记录标记为 `SUPERSEDED`，在本轮 state 中记录 `VERSION_CHANGED_ALLOW`，并允许该文件重新参与候选选择。
- 既有日志缺少 `source_file_coverage_version` 时视为 `NO_VERSION_RECORDED`，不得继续作为 ACTIVE_SKIP 的依据；本轮刷新后必须 supersede 旧记录并以当前版本重新处理该文件。
- 每轮只处理一个目标文件；如果没有可优化候选文件，必须写入 blocker 并暂停，不得改 BAM 文件、范围外文件或重复执行没有代码变化且文件覆盖率版本未变化的覆盖尝试。

### 5. 未覆盖行分析和覆盖方案

每轮必须基于 `coverage-optimization-plan-round.template.md` 生成本轮 `coverage-optimization-plan-round-<n>.md`，并填入目标文件、未覆盖行、需求 / test case 映射、代码优化方案、真实线上 UI 覆盖方案、请求入参来源和写接口浏览器拦截记录。

代码优化方案必须遵守：

- 链路不通、无法到达、被外层组件拦截而无法进入的代码，直接删除或从当前需求改动中移除。
- 过度安全防护、抛异常、宽泛 try/catch、无收益兜底尽可能精简。
- 可合并的重复逻辑、链式逻辑应合并，但不得改变业务语义。
- 优化代码必须符合当前仓库代码规范。
- 与本需求功能无关的新增代码必须删除。

覆盖方案必须遵守：

- 结合 test case 和原子需求设计内置浏览器页面操作。
- 必须使用真实线上环境；禁止本地会话、`localhost` 调试入口、只在本地预览制造覆盖率。
- 覆盖任务必须由真实线上 UI 发起；读接口和无副作用接口必须真实命中线上后端。
- 请求入参优先从真实页面、真实接口返回或真实业务数据取得；缺少字段时，可以参考 BAM MOCK 已有入参。
- BAM MOCK 入参只作为字段来源，不得接管请求、替换响应或替代真实 UI 覆盖；写接口 mock 响应必须由内置浏览器会话的请求拦截规则返回，不得通过 BAM runtime mock 或 `src/bam/**` 改动实现。
- 覆盖率优化允许由真实线上 UI 触发写接口发送动作，但必须在内置浏览器内拦截该写接口并返回 mock 响应。拦截必须发生在请求到达后端前，mock 响应需满足前端分支所需字段，并记录 endpoint、method、匹配条件、mock response、UI 后续状态、截图 / DOM 证据和“未真实命中后端”的证据。
- 不得因为未覆盖行需要写接口就停止 UI 覆盖尝试。若能安全拦截，必须继续执行 UI 后续分支并刷新覆盖率；只有内置浏览器无法稳定拦截、无法证明未触达后端，或缺少可构造的安全入参时，才允许记录为 blocker。
- 覆盖证据按“一个原子需求对应一个证据”整理，不得只堆到文档末尾。

### 6. 实现、验证和刷新

每轮执行顺序固定：

1. 先完成代码优化。
2. 对本轮修改运行聚焦验证、`git diff --check` 和可用的 lint / typecheck。
3. 使用内置浏览器在真实线上环境执行覆盖任务。
4. 确认读接口和无副作用接口未接管请求、未替换响应；确认所有写接口均由内置浏览器拦截并返回 mock 响应，且未真实命中后端。
5. 重新执行覆盖率脚本刷新本轮 `<workspace>/bits-flow/coverage/<cov-run-id>/coverage/`。
6. 基于 `coverage-optimization-state.template.json` 更新本轮 `coverage-optimization-state.json`，记录目标文件处理结果、覆盖率刷新、UI 证据、验证命令、blocker 和全局排除审核。
7. 本轮目标文件必须同步写入或更新 `coverage-exclusion-log.json`；日志不记录进入排除的业务原因，只登记目标文件、当前 `fileCoverageVersion`、来源 run/round 和证据。写入项时必须保存当前文件 `fileCoverageVersion`，后续刷新发现版本变化时必须 supersede 旧 ACTIVE 项而不是继续跳过。

整体覆盖率达到阈值后立即停止后续轮次。未达到且轮次未满时，刷新覆盖率报告后继续选择最大未覆盖候选文件；跨 run 是否排除同时看全局排除日志中的 ACTIVE 记录与文件覆盖率版本，版本变化的 ACTIVE 记录不得继续拦截。

### 7. 三轮结束和评审表达

三轮结束后，如果存在代码优化，必须生成本轮 `coverage-review-expression.md`，包含：

- 覆盖率起止值和最新报告路径。
- 每轮目标文件、优化点、删除 / 精简 / 合并说明。
- 真实线上 UI 覆盖证据。
- 请求入参来源和写接口浏览器拦截记录。
- 验证命令和结果。
- 剩余未覆盖风险和下一步建议。

只有用户传 `--submit` 或明确要求提交时，才允许 commit、push 和发布覆盖率评审表达。未传 `--submit` 时，本轮 `coverage-review-expression.md` 只能记录待提交命令和建议评审表达，不得伪造远端评论或提交状态。

## Gate

### `--init` 完成条件

满足任一条件才可声明完成：

- `bits-task-info.json.status = "DRY_RUN_PASS"`，且 dry-run 命令和输出证据已记录。
- `bits-task-info.json.status = "CREATED"` 或 `"REUSED"`，且 BITS task id / dev id / change id 已记录。

若状态为 `BLOCKED`，只能声明“已暂停并记录 blocker”，不得声明初始化完成。

### `--cr` 完成条件

必须同时满足：

- 本轮 `analysis/codebase-assistant-issue-list.md` 已记录本轮全部来源和 issue。
- 本轮 `analysis/codebase-assistant-issue-list.md` 已包含 `Detailed Issues` 章节，且每个 issue 都有可独立阅读的具体问题描述、触发场景、风险和 reviewer 建议；若只有表格摘要，不得声明 `--cr` 完成。
- 本轮 `analysis/codebase-assistant-fix-tasks.md` 中每个 issue 都有决策和状态。
- 本轮 `closure/cr-modification-closure.json` 可解析，且每个 issue 都有决策。
- 每个 `ACCEPT` / `PARTIAL` issue 都有实现结果、changed files 和验证记录。
- 每个 `REJECT` / `ALREADY_FIXED` issue 都有证据或原因。
- 本轮 `writeback/review-writeback.md` 已记录提交 / 回写状态或待执行动作。
- 非 `--dry-run` 的 `--cr` 中，每个纳入处理的 open/current Codebase thread 都必须有独立 reply 证据或失败 blocker；不得用 MR 总结或聚合回复替代。若传入 `--submit`，需要关闭的 thread 还必须有提交推送后、reply 后的 resolve 证据。
- `overall_status` 为 `PASS`、`PASS_WITH_NOTES` 或 `BLOCKED`；不得留在 `IN_PROGRESS`。

### `--coverage` 完成条件

必须同时满足：

- `<workspace>/bits-flow/coverage/<cov-run-id>/coverage/latest.json`、`report.md`、`uncovered-list.json`、`uncovered-list.md` 存在且来自本轮脚本刷新。
- `<workspace>/bits-flow/coverage/coverage-exclusion-log.json` 存在且可解析；本轮所有被作为目标文件处理过的文件已写入或更新该日志，并记录当前 `fileCoverageVersion`。
- 本轮 `coverage-optimization-log.md` 已记录拉取命令、Huatuo 更新时间、整体覆盖率、阈值判断和每轮摘要。
- 本轮 `coverage-optimization-state.json` 可解析，且基于 `coverage-optimization-state.template.json` 填充了真实轮次、覆盖率、目标文件处理结果、全局排除审核结果、验证和 blocker 证据。
- 若整体覆盖率未达标，每轮都已记录候选文件选择依据；脚本默认过滤和全局排除日志生效；全局日志不记录进入排除的业务原因，只按目标文件 `fileCoverageVersion` 判断是否跳过，版本变化时必须 supersede 旧 ACTIVE 并允许重新入选。
- 每个被优化文件都有本轮 `coverage-optimization-plan-round-<n>.md`，且包含未覆盖行分析、代码优化方案、真实线上 UI 覆盖方案、请求入参来源和写接口浏览器拦截记录。
- 若存在代码修改，必须有聚焦验证、`git diff --check` 和可用 lint / typecheck 记录。
- 三轮结束后若存在代码优化，必须有本轮 `coverage-review-expression.md`；未传 `--submit` 时只能记录待提交 / 待回写内容。
- 最终状态为 `PASS`、`PASS_WITH_NOTES` 或 `BLOCKED`；不得留在 `IN_PROGRESS`。

## 暂停规则

以下情况必须暂停：

- 无法唯一确定 workspace、repo、branch、MR 或 Meego。
- `--init` 缺少创建 BITS 开发任务的必填字段，且该字段没有本 skill 明确默认值。
- `--init --execute` 需要先推送当前分支但用户未授权推送，或推送失败。
- `--cr` 的 review issue 无法映射到当前需求范围，且继续会导致猜测式修复。
- `--coverage` 无法唯一确定覆盖率脚本、执行仓库、Huatuo 分支参数或整体覆盖率字段。
- `--coverage` 未达标但候选文件只剩 BAM 文件、范围外文件，或只剩全局排除日志中仍为 ACTIVE 的文件。
- 评审建议与当前需求口径冲突，但缺少用户确认或需求证据。
- 接受某个 issue 会修改当前需求仓库外文件，或会改变未被当前需求覆盖的核心行为。
- 需要提交、推送、真实创建 BITS 任务、resolve / 关闭线程或发布 MR 总结，但用户未授权。
- CLI 登录态、权限、网络或远端服务不可用，且无法通过本地证据闭环。

暂停输出必须包含：

- 已确认信息
- 缺失字段
- 阻塞原因
- 建议用户回答格式
- 恢复命令

## 输出契约

最终输出必须包含：

1. 执行模式和已写入产物。
2. `--init` 的 BITS task id / 命令状态，`--cr` 的问题数量、接受 / 部分接受 / 拒绝 / 阻塞摘要，或 `--coverage` 的整体覆盖率、阈值、轮次、优化文件和剩余 blocker。
3. 如适用，代码 commit / push / MR 回写状态。
4. 验证命令和明确的通过 / 失败状态。
5. 如阻塞，输出阻塞信息和继续所需的最小用户输入。
