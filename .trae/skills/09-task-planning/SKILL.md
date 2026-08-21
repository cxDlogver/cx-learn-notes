---
name: task-planning
description: 在 `/delivery:task` 阶段使用。基于 `04-tech-plan.md` 和可选 `delivery-mock.md` 生成独立可执行任务产物 `delivery-task.md`，把任务物化从 plan 阶段中拆出。
---

# Task Planning

## Purpose

本 skill 负责把 delivery plan、可选已存在的 BAM mock 产物、Figma / UI contract 和设计返工输入，整理成 `/delivery:code` 可直接消费的独立任务产物 `delivery-task.md`。

本阶段只做任务物化，不修改业务代码，不生成 BAM mock，不生成最终测试用例矩阵。测试用例矩阵由后续 `test-case-planning` 基于 `delivery-task.md` 生成。

## Responsibility Boundary

### 本阶段负责

- 生成或修复当前 workspace 下的 `delivery-task.md`。
- 把 `04-tech-plan.md` 中的 requirement、Figma contract、Excluded Real Integration、字段来源、设计返工输入转成可执行 `### Task N`。
- 在 `MOCK_PREVIEW` 下，把已存在的 `delivery-mock.md` / `mock/rule-map.json` / 每接口 `manifest.json` 映射到任务；若尚未生成，则在对应 task 写明 verify 待闭合依赖，并要求 test case 保持一个 case 最多对应一个非 `N/A` `ruleId`；无法单 rule 覆盖时必须先拆分 test case。
- 检查任务是否会导致业务代码 mock、二次前端业务调整或未授权真实调用。

### 本阶段不负责

- 不修改 `04-tech-plan.md` 的主体计划。
- 不把 `delivery-task.md` 的任务清单回写进 `04-tech-plan.md`。
- 不生成、patch 或修改 BAM mock 产物；`MOCK_PREVIEW` 下 mock 产物缺失、未 PASS 或需要调整时，必须标记 `Mock Closure: PENDING` / `MOCK_REWORK_PENDING`，保留 task / case / rule / API 依赖并标明由 verify 按 case 闭合。非 `MOCK_PREVIEW` 下 mock 产物缺失为 `N/A`。
- 不写业务代码。
- 不生成 `09-test-case-matrix.md`；该产物由 `test-case-planning` 生成。

## Subagent Execution Contract

本 skill 在 `/delivery:task` 中由 `.trae/agents/task-planner.md` 执行。

- 主 Agent 负责阶段前置检查、固定输入包、最终 Gate Review、回退路由和阶段状态更新。
- `task-planner` 负责读取高 token 输入、生成 `delivery-task.md`、执行 `Executable Task Check`，再调用 `test-case-planning` 生成 `09-test-case-matrix.md`。`MOCK_PREVIEW` 下，`task-planner` 必须检查 task 的 verify 待闭合依赖是否支持一个 test case 最多对应一个非 `N/A` `ruleId`；无法单 rule 覆盖的验证目标必须拆分 test case。
- `task-planner` 不得修改 plan / mock / design 上游事实源；发现 plan/design 缺口时必须返回 `BLOCKED_NEEDS_PLAN_REWORK`。mock 产物缺口只记录为 `Mock Closure` 与后置 task 步骤，不阻塞 task 产物生成。
- 主 Agent 优先审查 `Agent Gate Summary`、Task Readiness、Executable Task Check、Task Coverage Audit 和 Test Case Coverage Result；只在异常时定向回读 evidence。
- `task-planner` 的 `PASS` 是阶段执行自检结论，不代表主 Agent 已放行 `/delivery:code`。

## Artifact Boundary

| 产物 | 职责 | 是否由本 skill 生成 |
|---|---|---|
| `04-tech-plan.md` | plan 事实源：需求覆盖、Figma / UI contract、接口 / 字段探索、Excluded Real Integration、风险和任务输入 | 否 |
| `delivery-mock.md` / `mock/rule-map.json` / 每接口 `manifest.json` | BAM mock 事实源：mock rule、response path、patch / verify 结论 | 否 |
| `delivery-task.md` | code 执行源：`### Task N`、代码定位线索、步骤、验证命令、mock 对齐和停止条件 | 是 |
| `09-test-case-matrix.md` | 测试用例和 mock 合同源：case、assertion、evidence、coverage audit；`MOCK_PREVIEW` 下还包含 BAM mock rule 矩阵、Mock Preview Scope、Mock / Real Boundary | 否 |

## Required Inputs

必须读取：

- `.trae/AGENTS.md`
- `.trae/DELIVERY_STATE.md`
- 当前 workspace 下的 `prd-source.md`
- 当前 workspace 下的 `03-prd-analysis.md`
- 当前 workspace 下的 `04-tech-plan.md`
- 当前 workspace 下的 `uncertainty-register.md`
- 当前 workspace 下的 `delivery-mock.md`（当 `Implementation Mode: MOCK_PREVIEW` 且已存在）
- 当前 workspace 下的 `mock/rule-map.json` 与每接口 `manifest.json`（当 `Implementation Mode: MOCK_PREVIEW` 且已存在）
- 当前 workspace 下的 `prd-figma-supplement.md`（如存在）
- 当前 workspace 下的 `07-design-alignment.md`（如存在，且需要设计返工任务）

如果任一必需 plan / design 输入缺失，必须输出 `Task Readiness: BLOCKED_NEEDS_PLAN_REWORK`，不得生成猜测任务。`MOCK_PREVIEW` 下 mock 产物缺失不是 task 阶段 blocker；必须记录 `Mock Closure: PENDING`。非 `MOCK_PREVIEW` 下不要求 `delivery-mock.md`、`mock/**`、BAM mock matrix 或 mock closure；缺失必须写为 `N/A`，不得阻塞 task。

## Document Writing Rules

- `delivery-task.md` 的主要正文必须使用中文。
- 文件名、代码标识符、API 名、JSON key、枚举值、命令、路径、字段路径和日志原文保持原样。
- 任务必须写成可执行动作，不得写“按计划实现”“对齐设计”“处理接口”等泛化描述。
- 每个任务必须能被 `executing-plans` 独立读取执行；不得依赖“同上”“类似 Task N”。
- 任务必须显式列出代码定位线索，例如页面、组件、函数、selector、接口调用链、store 或 grep 依据；不得产出“允许修改文件 / 可改动文件范围”约束。

## Execution Flow

1. 读取并审查 `04-tech-plan.md`
   - 确认 `Plan Readiness` 不是 `BLOCKED`。
   - 确认 `Implementation Mode`。
   - 抽取 `PRD Logic Coverage Matrix`、Figma contract、Excluded Real Integration、字段来源和设计返工输入。
2. 执行 Plan Drift Precheck
   - 用 `prd-source.md`、`03-prd-analysis.md`、用户决策和已确权 Figma / design evidence 对照 `04-tech-plan.md`。
   - 若发现业务语义反转、in-scope 范围缺失、未确权事实被写成确定实现、Figma 主结构 / 文案 / 字段 / 状态与 plan 冲突，必须返回 `Task Readiness: BLOCKED_NEEDS_PLAN_REWORK`。
   - 本阶段不得自行改写 plan，也不得为了继续生成任务而把正确事实写进 `delivery-task.md` 覆盖错误 plan。
3. 读取 mock 产物或待闭合需求
   - 当 `Implementation Mode: MOCK_PREVIEW` 且 `delivery-mock.md` / `mock/rule-map.json` / 每接口 `manifest.json` 已存在时，必须读取并校验任务所需 mock 字段、response path、rule、verification assertion 是否已闭合。
   - 当 `Implementation Mode: MOCK_PREVIEW` 且 mock 产物尚未存在时，不得回退到 plan 寻找 BAM mock 矩阵；必须在对应 task 中保留 case/rule/API 依赖并绑定 verify 闭合入口，要求 test case 与非 `N/A` `ruleId` 一一对应。无法由单个 rule 覆盖的验证目标必须拆分 test case。
   - 当 `Implementation Mode` 不是 `MOCK_PREVIEW` 时，跳过本步骤的 mock closure 检查；不得生成 `/delivery:mock` checkpoint，也不得把 mock 产物缺失写成 blocker。
4. 生成任务覆盖审计
   - 每条 Atomic Requirement 必须映射到 task 或明确排除项。
   - 每个已确权 UI / Figma contract 必须映射到 task 或明确非 code 范围。
   - 每个 UI task 必须消费 `04-tech-plan.md` 的 `UI Implementation Directive Matrix` 或等价章节；不得只根据 Figma contract 存在性生成任务。
   - 每个 UI task 必须把“功能点 -> Figma node / state -> test case”的追踪链显式物化为 `figma_fileKey`、`figma_nodeId`、`figma_state_scope`、`mapped_case_ids`、`acceptance_focus_ref`；若 plan 无法提供这些事实，不得猜测补齐，必须返回 `/delivery:plan`。
   - 每个设计 BLOCKER 必须映射到 Design Rework Task 或明确返回上游。
5. 生成 `delivery-task.md`
   - 先写 `Task Readiness`。
   - 再写 `Plan Drift Precheck`。
   - 再写 `Task Coverage Audit`。
   - 最后写 `Execution Tasks`。
6. 自检与路由
   - 任务可执行且无 mock 泄漏：`PASS`；非 `MOCK_PREVIEW` 下 mock 字段为 `N/A` 不算泄漏。
   - plan 信息不足：`BLOCKED_NEEDS_PLAN_REWORK`。
- `MOCK_PREVIEW` 下 mock 产物缺失或需要增删改 BAM mock：`Task Readiness: PASS`，并记录 `Mock Closure: PENDING` / `MOCK_REWORK_PENDING`。非 `MOCK_PREVIEW` 下不得使用该路由。

## Task Construction Rules

每个任务必须从上游产物推导，不得临时发明范围：

- PRD 逻辑来自 `03-prd-analysis.md` 的 Atomic Requirement。
- 实现边界来自 `04-tech-plan.md` 的 `PRD Logic Coverage Matrix`、`Excluded Real Integration` 和 P0/P1；`MOCK_PREVIEW` 的 mock 边界必须在 task 中绑定后续 verify case，并可由 `09-test-case-matrix.md` 继续细化。
- 若 `prd-source.md`、用户决策或已确权 Figma evidence 与 `04-tech-plan.md` 冲突，以源证据为准标记 drift 并返回 `/delivery:plan`；不得在 task 阶段直接按源证据另起一套任务。
- UI 任务来自 `Figma / UI 改造清单`、`Figma Region Contract`、`Figma Interaction Contract`、`Figma Cell Contract`。
- UI 任务必须同时来自 `UI Implementation Directive Matrix` 或等价实现指令。每个 UI task 必须把 plan 阶段的 `implementation_directive` 物化为明确 checkbox，例如 `使用 /f2c get_d2c_json 读取 node <nodeId> 后实现 <region/component>`、`复用 <component/path> 并按 node <nodeId> 调整 token`、`保留 legacy <component/path> 仅修改文案/显隐/样式`。不得只写“按设计实现”“对齐 Figma”。
- 每个 UI task 必须显式绑定功能点与 Figma / case 追踪链：`figma_fileKey`、`figma_nodeId`、`figma_state_scope`、`mapped_case_ids`、`acceptance_focus_ref`。其中 `figma_state_scope` 需写明页面/区域/状态/示例语义，例如 `author-detail header / default state / rating-row`；`mapped_case_ids` 必须列出将关闭该 task 的 case；`acceptance_focus_ref` 必须回指 `04-tech-plan.md` 中对应的验收焦点、结构合同或 test case contract。不得只在 `source_refs` 中笼统写 “Figma / case”。
- 每个 UI task 的 `ui_evidence_mode` 只能是 `F2C_REQUIRED` / `RUNTIME_BASELINE_ALLOWED` / `NO_F2C_REQUIRED` 之一；截图编号、cache 名称、baseline、Figma 节点和非 Figma 原因必须写入证据 / reason 字段。
- `MOCK_PREVIEW` 任务必须引用已完成的 `delivery-mock.md` / `mock/rule-map.json` / 每接口 `manifest.json`，或引用本阶段 `09-test-case-matrix.md` 的 `case_id + ruleId + apiName` mock 合同并写明由 verify 闭合；后一种情况不阻塞 task。每个 `case_id` 最多只能对应一个非 `N/A` `ruleId`，否则必须拆分 test case。
- 设计返工任务只能来自已记录的 design BLOCKER，且必须有 BLOCKER ID、代码定位线索、禁止业务范围或排除项、验证命令。

每个 `### Task N` 必须包含：

- `task_id`
- `requirement_id`
- `source_refs`
- `mode`
- `code_locator`
- `implementation_directive`
- `ui_evidence_mode`（UI task 必填；非 UI task 写 `N/A`）
- `component_strategy`（UI task 必填；非 UI task 写 `N/A`）
- `figma_fileKey`（UI task 必填；非 UI task 写 `N/A`）
- `figma_nodeId`（UI task 必填；非 UI task 写 `N/A`）
- `figma_state_scope`（UI task 必填；非 UI task 写 `N/A`）
- `mapped_case_ids`（UI task 必填；非 UI task 写 `N/A`）
- `acceptance_focus_ref`（UI task 必填；非 UI task 写 `N/A`）
- `excluded_scope`
- `verification_commands`
- `expected_result`
- `stop_conditions`
- `Steps`

`MOCK_PREVIEW` 下需要 BAM runtime mock 的 task，`Steps` 必须按当前 task 的真实边界写出业务实现动作，并满足以下依赖关系：

- 若当前 task 涉及业务代码接线，只要求完成 `page -> store -> service -> BAM` 调用链；真实请求采集、mock 调整和浏览器验证不属于 Task / Code 步骤。
- Task 只记录 `Verify Closure Dependency`：当 task 依赖 mock 闭合时，引用对应 `case_id / ruleId / apiName`，并标记 `Mock Closure` / real verify 回收项；

## Executable Task Check

每个 `### Task N:` 必须可被 `Use Skill: executing-plans` 直接执行。自检必须确认：

- 存在 `code_locator:`。
- UI task 存在 `implementation_directive:`，且该字段不是泛化描述；必须明确 `/f2c` / d2c 动作、复用组件路径或 legacy patch 策略之一。
- UI task 存在 `ui_evidence_mode:` 和 `component_strategy:`；`ui_evidence_mode` 必须是 `F2C_REQUIRED` / `RUNTIME_BASELINE_ALLOWED` / `NO_F2C_REQUIRED`。
- UI task 存在 `figma_fileKey:`、`figma_nodeId:`、`figma_state_scope:`、`mapped_case_ids:`、`acceptance_focus_ref:`，且这些字段共同能把当前任务唯一追溯到具体功能点、Figma state / node 和关闭该任务的 case；不得只填 `same as source_refs`、`see plan`、泛化页面名或空列表。
- `code_locator:` 至少精确到页面、组件、函数、selector、接口调用链、store、grep 依据或同等可定位粒度；不得只写仓库名、应用名或模块名。
- 每个 Task 有 checkbox step，使用 `- [ ]`。
- 每个 Task 有验证命令和预期结果。
- 若任务只允许 adapter / skeleton / no-op，必须写明真实集成排除范围。

- 生成任务时可复用 `Use Skill: writing-plans` 的执行计划格式，但落盘目标只能是 `delivery-task.md`，不得把最终 Task 列表回写进 `04-tech-plan.md`。
- Task 必须来自既有 plan、`MOCK_PREVIEW` 下的 mock、design 产物，不得新增需求范围。

Task 生成要求：

- 每个 Task 必须有 `code_locator:`、checkbox step、验证命令和预期结果；`code_locator` 只用于定位，不限制 code 阶段真实可修改文件。
- 每个 UI Task 必须有 `implementation_directive:`，并在 checkbox step 中显式执行该指令。`F2C_REQUIRED` 必须写出 `/f2c` / d2c 命令或工具动作和 nodeId；`RUNTIME_BASELINE_ALLOWED` 必须写出复用组件或 runtime baseline；`NO_F2C_REQUIRED` 必须写明原因。
- 每个 UI Task 必须有 `figma_fileKey:`、`figma_nodeId:`、`figma_state_scope:`、`mapped_case_ids:`、`acceptance_focus_ref:`。若 task 对应多个 case，必须显式列出 case 列表；若 task 对应多个 Figma state / node，必须先拆 task 或返回 `/delivery:plan` 消歧，不能在 task 阶段保留模糊绑定。
- `MOCK_PREVIEW` 下，Task 只能接入真实 page -> store -> service -> BAM 调用链，引用已完成 mock 产物或 `09-test-case-matrix.md` 中待闭合的 BAM mock rule，不得新增业务代码 mock。
- 非 mock 模式下，运行时业务闭环必须来自真实后端能力；未闭合能力必须标记为 `PLAN_DISCOVERY` / `WAIT_BACKEND_VERIFY` / `Excluded Real Integration` / `BLOCKED`。

## Mode Rules

`mode` 只能使用以下枚举：

| mode | 含义 |
|---|---|
| `REAL_READY` | 真实接口和业务规则已可实现 |
| `MOCK_PREVIEW` | 基于 task 中后置 mock 步骤闭合的 BAM mock 前端效果预览 |
| `DESIGN_REWORK` | 设计对齐返工切片 |
| `SKELETON_ONLY` | 仅允许 skeleton / loading / empty / error 或明确限定展示 |

`MOCK_PREVIEW` 下必须遵守：

- 任务只能接入真实 page -> store -> service -> BAM 调用链。
- 运行时 mock response 只能来自 `/delivery:mock` 生成或调整的 BAM mock / mock server。
- 任务不得要求 `/delivery:code` 生成 mock response；需要调整 BAM mock、目标 BAM marker 或 generator 管理的 `__mock__` 时，必须绑定对应 verify case。
- 任务不得包含 fallback store、preview service、业务代码内联 fixture、adapter 造数、本地过滤 fixture、本地保存成功或 fake success。
- 如果任务执行依赖新增、删除或修改 mock 数据，必须在该 task 的 `mock_boundary` 和对应 verify case 标记 `MOCK_REWORK_PENDING`；不得把 task 阶段标记为 BLOCKED。

## Output Contract

必须生成当前 workspace 下的 `delivery-task.md`，结构如下：

```md
# Delivery Task Plan

## Task Readiness
- Task Readiness: PASS / BLOCKED_NEEDS_PLAN_REWORK
- Implementation Mode:
- Mock Closure: PASS / PENDING / MOCK_REWORK_PENDING / N/A
- Source Plan:
- Source Mock:
- Source Design:
- Notes:

## Plan Drift Precheck
| source_ref | plan_ref | drift_type | required_plan_rework | status |
|---|---|---|---|---|

## Task Coverage Audit
| requirement_id | plan_ref | mock_ref | design_ref | task_id | status | gap | route |
|---|---|---|---|---|---|---|---|

## Execution Tasks

### Task 1: <name>
- task_id:
- requirement_id:
- test_case_id:
- ruleId:
- source_refs:
- mode:
- code_locator:
- implementation_directive:
- ui_evidence_mode:
- component_strategy:
- figma_fileKey:
- figma_nodeId:
- figma_state_scope:
- mapped_case_ids:
- acceptance_focus_ref:
- excluded_scope:
- mock_boundary:
- verification_commands:
- expected_result:
- stop_conditions:

Steps:
- [ ] ...
```

字段要求：

- `source_refs` 必须写明 PRD / plan / mock / Figma / blocker 引用。
- `implementation_directive` 必须从 `04-tech-plan.md` 的 `UI Implementation Directive Matrix` 或设计返工输入推导，不能由 task 阶段临时发明。
- UI task 的 `figma_fileKey`、`figma_nodeId`、`figma_state_scope`、`mapped_case_ids`、`acceptance_focus_ref` 必须与 `04-tech-plan.md`、已确权 Figma evidence 和 `09-test-case-matrix.md` 同义；若其中任一字段无法唯一确定当前 task 的视觉合同和验收 case，必须返回 `/delivery:plan`，不得以 `source_refs` 或自然语言段落兜底。
- `excluded_scope` 必须包含与本任务相关的排除业务范围、不可触碰能力或明确不属于当前 task 的逻辑；不得写成允许修改文件白名单；
- `mock_boundary` 必须写明 `BAM mock only`、`Test Fixture Mock only`、`No runtime mock` 或 `N/A`。
- `verification_commands` 必须是可执行命令或明确说明由 `/delivery:verify` 关闭的运行态 case。
- `stop_conditions` 必须列出何时停止并返回 `/delivery:plan` 或 `/delivery:design`。`MOCK_PREVIEW` 下缺 mock 不得成为 Code stop condition；由 verify/design 当前 active case 按需调用 `/delivery:mock`。

## Gate

PASS 条件：

- `delivery-task.md` 存在。
- `Task Readiness: PASS`。
- 每个 required Atomic Requirement 映射到任务或明确排除项。
- 每个已确权 UI / Figma contract 映射到任务或明确非 code 范围。
- 每个 UI task 都有明确 `implementation_directive`、`ui_evidence_mode` 和 `component_strategy`，且指令可被 `/delivery:code` 直接执行。
- 每个 UI task 的 `ui_evidence_mode` 为 `F2C_REQUIRED` / `RUNTIME_BASELINE_ALLOWED` / `NO_F2C_REQUIRED` 三类之一，且 `ui_evidence_gate_acceptance` 已把该 mode 的门禁验收写成可审查断言。
- 每个 UI task 都有明确 `figma_fileKey`、`figma_nodeId`、`figma_state_scope`、`mapped_case_ids`、`acceptance_focus_ref`，并能把当前 task 唯一回溯到具体功能点、Figma state / node 和验收 case。
- `MOCK_PREVIEW` 下，所有运行时 mock 依赖都能回溯到已完成的 `delivery-mock.md` / `mock/rule-map.json` / 每接口 `manifest.json`，或回溯到 `09-test-case-matrix.md` 中 `case_id + ruleId + apiName` mock 合同，并在对应 task 中绑定 verify 闭合入口；同一 `case_id` 不得对应多个非 `N/A` `ruleId`。
- 没有业务代码 mock、fallback store、preview service、内联 fixture、adapter 造数或 fake success。

BLOCKED 条件：

- `Task Readiness: BLOCKED_NEEDS_PLAN_REWORK`：必须返回 `/delivery:plan`。
- UI task 无法唯一绑定具体功能点、Figma state / node 或验收 case，或 `mapped_case_ids` / `acceptance_focus_ref` 与 plan / case matrix 不同义；必须返回 `/delivery:plan`。
- UI task 的 `ui_evidence_mode` 非规范枚举。
- `Mock Closure: PENDING` / `MOCK_REWORK_PENDING`：仅适用于 `MOCK_PREVIEW`，不得阻塞 task/code；在 verify 或 design 的具体 active case 按依赖触发 `/delivery:mock`。非 `MOCK_PREVIEW` 下不得输出该状态，mock 相关列使用 `N/A`。
- 任务需要未来二次前端业务代码调整才能闭合。
- 任务依赖业务代码 mock、fallback store、preview service、内联 fixture、adapter 造数或 fake success。
- 任务缺少代码定位线索、排除范围、验证命令或停止条件。

## Main Agent Review

主 Agent 只需审查：

- `Task Readiness`。
- `Task Coverage Audit` 中的 `gap` 和 `route`。
- `MOCK_PREVIEW` task 的 `mock_boundary`。
- 是否存在应返回 `/delivery:plan` 的 blocker，或需要写入 task 步骤的 mock 执行点。
