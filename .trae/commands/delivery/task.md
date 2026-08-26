---
description: 在 plan 完成后生成独立 delivery-task.md、测试用例矩阵和 MOCK_PREVIEW 的 mock 合同；mock 依赖由 verify/design 按 case 闭合。
---

请按 `.trae/AGENTS.md` 的 Phase Gate Rules 执行 `/delivery:task`。

## Purpose

本命令负责把 delivery plan 和可选的 BAM mock 产物转成代码阶段可消费的独立执行材料；在 `MOCK_PREVIEW` 下，本阶段也是 mock 合同物化阶段：

1. 使用 `Use Skill: task-planning` 生成当前 workspace 下的 `delivery-task.md`。
2. 使用 `Use Skill: test-case-planning` 生成当前 workspace 下的 `09-test-case-matrix.md`。
3. `MOCK_PREVIEW` 下，`09-test-case-matrix.md` 必须生成 `Test Case Matrix`、`BAM Mock Response Field Coverage Matrix`、`Mock Preview Scope` 和 `Mock / Real Boundary`。
4. 审查独立任务产物、用例、三契约防漏字段，以及 `MOCK_PREVIEW` 下的 mock 合同 / 产物是否一致。

本命令不修改业务代码，不生成 BAM mock 产物，不把任务清单回写进 `04-tech-plan.md`。`MOCK_PREVIEW` 下需要 BAM mock 的 task 必须保留 `implementation_task -> case_id -> ruleId -> apiName -> request/response 字段` 依赖，并将运行态 mock 实施与浏览器验证明确交给 `/delivery:verify` 按 case 闭合。

## Mandatory Precheck

必须读取：

- `.trae/AGENTS.md`
- `.trae/DELIVERY_STATE.md`
- 当前 workspace 下的 `prd-source.md`
- 当前 workspace 下的 `03-prd-analysis.md`
- 当前 workspace 下的 `04-tech-plan.md`
- 当前 workspace 下的 `delivery-mock.md`（当 `Implementation Mode: MOCK_PREVIEW` 且已存在）
- 当前 workspace 下的 `mock/rule-map.json` 与每接口 `manifest.json`（当 `Implementation Mode: MOCK_PREVIEW` 且已存在）
- 当前 workspace 下的 `prd-figma-supplement.md`（如存在）
- 当前 workspace 下的 `07-design-alignment.md`（如存在）
- `.trae/skills/09-task-planning/SKILL.md`
- `.trae/skills/10-test-case-planning/SKILL.md`
- `.trae/skills/10-test-case-planning/test-case-matrix-template.md`
- `.trae/agents/task-planner.md`

必须满足：

- `04-tech-plan.md` 的 Plan Readiness 不是 `BLOCKED`。
- 若 `Implementation Mode: MOCK_PREVIEW`，不强制 `/delivery:mock` 已完成，也不因缺少 `delivery-mock.md` / `mock/**` 阻塞 task 阶段。
- 若 `Implementation Mode: MOCK_PREVIEW` 且已有 `delivery-mock.md` / `mock/rule-map.json` / 每接口 `manifest.json`，必须读取并记录状态；未 PASS、缺失或与 task/case 暂未对齐时，task/case 必须标记 `Mock Closure: PENDING` 或 `MOCK_REWORK_PENDING`，并在对应 task 中登记 `Verify Closure Dependency`。。
- 非 `MOCK_PREVIEW` 下不得要求 `delivery-mock.md`、`mock/**`、BAM mock matrix 或 mock closure；缺少这些产物必须记为 `N/A`，不得阻塞 task、不得写入 `/delivery:mock` 步骤。
- `04-tech-plan.md` 只提供实现模式、接口探索和真实集成禁区；不得因 plan 缺少 `BAM Mock Response Field Coverage Matrix`、`Mock Preview Scope` 或 `Mock / Real Boundary` 而返回 plan。
- `Mock / Real Boundary` 必须由本阶段基于 task/case/rule 生成，且不得允许未来二次前端业务代码调整。

## Execute

1. 审查 `04-tech-plan.md` 的覆盖表、Figma contract、`Excluded Real Integration` 和 P0/P1。
2. 主 Agent 按 `.trae/agents/task-planner.md` 提供固定输入包并派发 Task 阶段；`task-planner` 必须先执行 `task-planning` 生成 `delivery-task.md`，完成 `Executable Task Check` 后，再执行 `test-case-planning` 生成 `09-test-case-matrix.md`。
3. `task-planner` 发现 plan / design 缺口时只记录并返回路由；只有 `MOCK_PREVIEW` 下才处理 mock 缺口并写入 verify case 的待闭合依赖。非 `MOCK_PREVIEW` 缺 mock 产物不算缺口。
4. 主 Agent 审查 `task-planner` 的 `Agent Gate Summary`、Task Readiness、Executable Task Check、Task Coverage Audit 和 Test Case Coverage Result：
   - 每条 Atomic Requirement 映射到 Task 或明确排除项。
   - `Plan Drift Audit` 必须证明 `04-tech-plan.md` / `delivery-task.md` 没有偏离 `prd-source.md`、用户决策和已确权 Figma 事实；若发现语义反转、范围缺失、未确权事实被当成确定实现、Figma 主结构 / 文案 / 字段 / 状态与源证据冲突，必须返回 `/delivery:plan`，不得在 test case 阶段自行改写为另一套事实。
   - UI Task 必须消费 `04-tech-plan.md` 的 `UI Implementation Directive Matrix` 或等价实现指令；每个 UI Task 必须写明 `implementation_directive`、`ui_evidence_mode`、`component_strategy`，并把 `/f2c` / d2c 或复用组件动作写进 checkbox。不得只写“按 Figma 实现”。
   - 每个 UI Task 还必须显式写明 `figma_fileKey`、`figma_nodeId`、`figma_state_scope`、`mapped_case_ids`、`acceptance_focus_ref`，把功能点、Figma state / node 和验收 case 绑定成可审计追踪链。若这些字段无法唯一定位，必须返回 `/delivery:plan`，不得带着模糊映射进入 `/delivery:code`。
   - 三契约防漏字段映射到 `contract_ref`、`positive_assertion`、`negative_assertion`、`evidence_required`。
   - `MOCK_PREVIEW` case 标记为 `mock-preview verified`，真实接口接入后的验证不得被省略或误标；非 `MOCK_PREVIEW` case 不要求 mock-preview 相关字段。
   - `mock_verifiable` 表示当前 case 是否能在 mock-preview 下被完整验证；前提是该 case 需要 mock。`mock_unverifiable_reason` 用于写明“可以完整验证”或“不能完整验证”的原因，尽量避免重复 `evidence_required`、断言或 BAM 矩阵已有描述。mock 无法完整验证时，不得作为 verify 阶段阻塞原因，只能要求记录 real verify / integration-debug 回收点。
   - `MOCK_PREVIEW` 下必须确认每个需要后端响应的 case 最多一个 `ruleId`，不需要后端响应的 case 为 `ruleId: N/A`；若同一业务验证目标因 request 影响字段不同值命中不同 mock rule，必须先拆分 test case。
   - `BAM Mock Response Field Coverage Matrix` 必须逐行覆盖所有 `mock_type = BAM_RUNTIME_MOCK` 且 `ruleId != N/A` 的 case；多个 case 共用同一 `ruleId` 时也必须按 `case_id` 分别列出，不得只保留代表 case 或只按 ruleId 汇总。
   - `BAM Mock Response Field Coverage Matrix` 必须包含具体 UI 操作描述的 `BDD 行为规范`，且 `request key/value` 必须区分 `影响字段` 与 `非影响字段`：影响 mock 命中 / ruleId 分流 / mock 返回或当前 case 请求断言的字段必须给具体 value；非影响但真实请求需要携带的字段只能写成 `field=<真实UI获取>`，后续由 `/delivery:mock` 采集到 manifest 的 `realRequest` / `collectionOnlyFields`，不得进入 matcher。`补充说明` 作为矩阵行内新列由 Task 默认填 `-`，仅供后续 Code 在同一 `case_id / ruleId / apiName` 行记录已有 rule 的补充需求。
   - `Mock Preview Scope` 必须同时覆盖 `Test Case Matrix` 中的 Test Fixture Mock 和 `BAM Mock Response Field Coverage Matrix` 中的 BAM runtime mock。
   - `Mock / Real Boundary` 必须按 task/case/rule 粒度说明真实接口、BAM mock、Test Fixture Mock 或排除真实集成。
   - `MOCK_PREVIEW` 下，每个需要 BAM mock 的 implementation task 必须完成正式业务调用链，并明确关联 `case_id / ruleId / apiName` 与 verify 验证入口。

## Main / Subagent Collaboration

主 Agent 必须：

- 完成阶段前置检查，固定实现模式、事实源、输出路径、禁止路径和 mock 边界。
- 审查 `task-planner` 的高信号摘要与关键表，决定是否进入 `/delivery:code` 或返回 `/delivery:plan`。
- 只在 summary 缺失、自相矛盾或显示 `NEEDS_TARGETED_REVIEW` / `BLOCKED` 时定向回读 evidence。

`task-planner` 必须：

- 只生成 `delivery-task.md` 与 `09-test-case-matrix.md`。
- 不修改 `04-tech-plan.md`、`delivery-mock.md`、业务代码或阶段状态；`MOCK_PREVIEW` 下的 mock 变更只作为 verify/design case 的待闭合依赖写入任务与测试矩阵。
- 不发明任务范围；发现 plan 上游缺口时返回 `BLOCKED_NEEDS_PLAN_REWORK`。`MOCK_PREVIEW` 下 mock 产物缺失或未完成时记录为 `Mock Closure: PENDING`，不得仅因此阻塞 task 阶段；非 `MOCK_PREVIEW` 下 mock 缺失必须为 `N/A`。
- `PASS` 只表示产物自检通过，最终 Task Gate 由主 Agent 判断。

## Gate

PASS 条件：

- `delivery-task.md` 存在且 `Task Readiness: PASS`。
- UI Task 均包含可执行 `implementation_directive`，明确使用 `/f2c` / d2c、复用具体组件路径或 legacy patch 策略。
- UI Task 均包含 `figma_fileKey`、`figma_nodeId`、`figma_state_scope`、`mapped_case_ids`、`acceptance_focus_ref`，且这些字段能把 task 唯一回溯到具体功能点、Figma state / node 和验收 case。
- `09-test-case-matrix.md` 存在且 `Coverage Result: PASS`。
- `MOCK_PREVIEW` 下，task 和 case 引用已完成的 `delivery-mock.md` / `mock/rule-map.json` / 每接口 `manifest.json`，或引用本阶段生成的 `BAM Mock Response Field Coverage Matrix` 并标记 `Mock Closure: PENDING`；每个待 mock rule 都绑定对应 implementation task 和 verify case。
- `09-test-case-matrix.md` 包含 `Test Case Matrix`、`BAM Mock Response Field Coverage Matrix`、`Mock Preview Scope` 和 `Mock / Real Boundary`，且每个需要后端响应的 case 最多一个 `ruleId`；`BAM Mock Response Field Coverage Matrix` 的 `case_id` 集合必须与所有 `BAM_RUNTIME_MOCK` 且非 `N/A` rule case 完全一致。

BLOCKED 条件：

- `Plan Drift Audit` 发现 plan / task 与 `prd-source.md`、用户决策或已确权 Figma evidence 存在事实冲突。
- UI Task 缺少 `figma_fileKey`、`figma_nodeId`、`figma_state_scope`、`mapped_case_ids`、`acceptance_focus_ref`，或这些字段与 `04-tech-plan.md` / `09-test-case-matrix.md` 不同义，导致无法唯一定位功能点与 Figma / case 对应关系。
- `09-test-case-matrix.md` 的 coverage audit 为 `BLOCKED_NEEDS_PLAN_REWORK`。
- `delivery-task.md` 的 Task Readiness 为 `BLOCKED_NEEDS_PLAN_REWORK`。
- Task 需要未来二次前端业务代码调整才能闭合。
- Task 或 case 依赖 fallback store、preview service、内联 fixture、adapter 造数或 fake success。
- `task-planner` 越界修改上游产物、业务代码、BAM 或阶段状态。

## Output

只输出：

1. Task Readiness。
2. `delivery-task.md` 的 Task 列表摘要。
3. Test Case Coverage Result。
4. 未闭合 requirement / contract / mock 对齐项，以及 `Mock Closure: PASS / PENDING / MOCK_REWORK_PENDING`。
5. 下一步：`/delivery:code` 或返回 `/delivery:plan`。
