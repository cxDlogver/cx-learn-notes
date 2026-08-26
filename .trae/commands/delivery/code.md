---
description: 按已确认技术方案进行前端代码实现；P0 未决或技术方案未 READY 时禁止修改业务代码
---

请按 `.trae/AGENTS.md` 的 Phase Gate Rules 执行 `/delivery:code`。

## Optional Parameter

支持：

- `/delivery:code --mock-preview`

当用户显式传入 `--mock-preview`，或在 `/delivery:plan --mock-preview` 后确认进入实现时，启用 Mock Preview Code Mode。具体实现边界和 BAM矩阵核对规则由 `.trae/skills/05-code-implementation/SKILL.md` 定义；Code不实施mock、不调用浏览器。

## Mandatory Precheck

必须读取：

- `.trae/DELIVERY_STATE.md`
- 当前 workspace 下的 `03-prd-analysis.md`
- 当前 workspace 下的 `04-tech-plan.md`
- 当前 workspace 下的 `delivery-task.md`
- 当前 workspace 下的 `09-test-case-matrix.md`
- 当前 workspace 下的 `07-design-alignment.md`（如存在）
- 当前 workspace 下的 `uncertainty-register.md`
- 当前 workspace 下的 `code-fix-handoff.md`（如存在）
- `.trae/skills/05-code-implementation/SKILL.md`

必须满足：

- PRD 解析 DONE；若启用 `--mock-preview`，允许 PRD 解析为 `PARTIAL_READY_FOR_PLAN`，但必须无影响前端效果预览的 P0。
- 技术方案 Plan Readiness = READY，或用户明确允许 PARTIAL_READY 的限定实现。
- `/delivery:task` 已完成，`delivery-task.md` 存在且 `Task Readiness: PASS`，`09-test-case-matrix.md` coverage audit 为 PASS。
- 若启用 `--mock-preview`，`04-tech-plan.md` 必须包含 `Implementation Mode: MOCK_PREVIEW`，且 `09-test-case-matrix.md` 必须包含 `Test Case Matrix`、`BAM Mock Response Field Coverage Matrix`、`Mock Preview Scope` 和 `Mock / Real Boundary`。
- 非 `MOCK_PREVIEW` 下不得要求 BAM mock矩阵或 mock产物；缺失不得阻塞 Code。
- 无影响实现的 P0_BLOCKER。
- 若 `.trae/DELIVERY_STATE.md` 或 `07-design-alignment.md` 存在未关闭设计 BLOCKER，`delivery-task.md` 必须包含对应 `Design Rework Task`，且逐条映射 BLOCKER ID。
- 用户已确认允许进入实现。

否则必须暂停提问，禁止修改业务代码。

执行前先按 `.trae/AGENTS.md` 的 `Execution Environment Bootstrap Gate` 处理 `Execution State`：若已存在则复用；若不存在，则由当前 execution phase 入口命令先创建 execution branch/worktree，再进入 install 和本阶段执行流程。

## Execute

执行 `code-implementation` skill。`/delivery:code` command 是本阶段状态机入口，主 Agent 的阶段编排职责在本 command 闭合；`code-implementation` skill 只作为实现规则、任务输入包、mock 边界、验证和审查清单的规范来源。

- 若当前 workspace 存在 `code-fix-handoff.md`，且最近 `/delivery:verify` 因代码 / 类型 / 构建问题阻塞，优先按 skill 的 `Verify Failure Handoff Mode` 执行。
- 当 `code-fix-handoff.md` 声明 `fix_scope = MICRO_CODE_FIX` 时，按 skill 的 `Micro-Fix Fast Path` 执行：派 `code-writer`，Gate Review 只覆盖 handoff diff、allowed files、required commands 和原 verify case 复验。
- 普通实现必须先 `Use Skill: executing-plans` 审查 `04-tech-plan.md` 与 `delivery-task.md`；`MICRO_CODE_FIX` / `CASE_CODE_FIX` 只审 `code-fix-handoff.md` 的边界完整性、allowed files、required commands 和不需要 PRD / Figma / 产品决策的证据。若 `CASE_CODE_FIX` 需要改计划或重排任务，必须先回上游物化为 `delivery-task.md ### Task N`。
- 普通实现只允许按 `delivery-task.md` 既有 `### Task N` 串行执行；不得临时发明任务、并发派发、跳过任务或把后续任务顺手并入当前任务。`MICRO_CODE_FIX` / `CASE_CODE_FIX` 不要求存在对应 `### Task N`，只允许按 `code-fix-handoff.md` 的 `blocking_errors` / `allowed_files` / `required_commands` 执行。
- 普通业务代码 implementation task必须由 `code-implementation` skill编排；，并派 `code-writer` 执行当前 Task N 的受限代码切片；主 Agent负责编排、非浏览器 Gate Review和BAM矩阵核对。
- `MICRO_CODE_FIX` / `CASE_CODE_FIX` 也必须交给 `code-writer` 执行；若 handoff 已被重新物化为 `/delivery:code` Task N，则按普通 Task N 输入包派发给 `code-writer`。
- 主 Agent 可按需派 `runtime-runner` 做 dev server、端口归属、health check、HMR / 编译日志、长命令或日志摘要辅助；其结果只作为非浏览器运行时 / 命令 / 日志证据候选，不替代 `code-writer` 的代码实现结果、独立代码审查或 Gate Review。
- 每个 Task 返回后必须按 skill 执行 Gate Review；代码实现、独立代码审查、静态检查或非浏览器测试未通过前不得派发下一 Task。
### Main Agent Orchestration

主 Agent 必须在本 command 内完成以下编排，不得下放给 `code-writer`：

普通实现走 Task N 队列；`MICRO_CODE_FIX` / `CASE_CODE_FIX` 走 handoff 单修复队列，不建立新的 `delivery-task.md ### Task N`，除非修复被回流为正式 Task。

1. 普通实现时，建立 `delivery-task.md` 中 `### Task N` 的串行队列；handoff 修复时，建立只包含当前 `code-fix-handoff.md` 的单项队列。
2. 普通实现每次只派发一个 Task 给全新的 `code-writer` 实例；handoff 修复只派发当前 handoff 给全新的 `code-writer` 实例。
3. 普通实现进入任务队列前，主 Agent 应先整理 `Task Context Index`，把每个 `Task N` 对应的 requirement、case/rule/API、plan/test/UI contract、Mock / Real 边界、代码定位线索、验证命令和浏览器复核点做成轻量索引；小型单 Task 可内联到 `05-implementation-log.md`，多 Task 或上下文较大时应落盘为当前 workspace 的 `code-review/context-index.md`。
4. 为当前 Task / handoff 整理固定输入包：`task_id` 或 handoff id、`requirement_id`、`case_id/ruleId/API`、checkbox steps 或 `blocking_errors`、代码定位线索、Figma / BDD / UI 落点、Mock / Real 边界、验证命令、验收断言和 stop conditions。
5. 对 UI / Figma Task 执行 `PRD / Figma Semantic Alignment Gate`：确认 PRD 原子需求、Figma 可见合同、`delivery-task.md` 目标和 `09-test-case-matrix.md` 断言同义，并确认 task 中的 `figma_fileKey`、`figma_nodeId`、`figma_state_scope`、`mapped_case_ids`、`acceptance_focus_ref` 没有漂移。不得只因为存在 Figma node / screenshot / case 就判定匹配；若不匹配，必须返回 `/delivery:plan` 或 `/delivery:task` 修复，不得派发 `code-writer`。
6. 消费并校验当前 Task 已声明的 `UI Evidence Mode`：以 `delivery-task.md` 为权威输入，不在 code 阶段重新分类。主 Agent 只检查该 mode 是否与当前 task 的 Figma 合同、实现边界和 diff 风险一致，并确认对应证据已备齐：`F2C_REQUIRED` 必须准备 Figma URL、fileKey、nodeId、`figma_state_scope`、`/f2c` d2c 证据、Figma MCP 摘录，以及存储在当前 workspace `code-review/d2c-evidence/task-<task-id>/` 下的必要 d2c MCP 产物；`RUNTIME_BASELINE_ALLOWED` 必须准备 Figma / Design contract、现有 DOM / screenshot / computed style baseline 和复核断言；`NO_F2C_REQUIRED` 必须说明不涉及视觉结构还原。若 task 内 mode 缺失、与 plan/task 合同冲突或证据模式不匹配，必须返回 `/delivery:task` 或 `/delivery:plan`，不得在 code 阶段自行改判后继续实现。
7. 实现 agent 返回后，主 Agent 先做实现 Gate Review：审查 `Agent Gate Summary`、Implementation Report、UI Evidence Usage、改动文件、非浏览器验证、静态类型检查、`05-implementation-log.md` 记录、mock checkpoint 和是否计划外扩散。
8. 实现 Gate Review 初步通过后，主 Agent 必须整理当前 Task 的 `Task Review Packet`，让独立 reviewer 先读 packet + targeted diff。Packet 必须包含当前 Task 摘要、Task Context Index 引用、PRD/Figma semantic alignment 结论、plan/test/UI 关键合同摘录、改动文件、targeted diff 路径或摘要、`code-writer` Gate Summary、验证命令证据、静态类型证据、mock 状态和机械检查结果；若是 `F2C_REQUIRED`，packet 必须引用 `code-review/d2c-evidence/task-<task-id>/` 下当前 Task 实际消费的 d2c MCP 产物和 manifest；小型单 Task 可内联到 `05-implementation-log.md`，多 Task 或 diff 较大时应落盘为当前 workspace 的 `code-review/task-<task-id>-review-packet.md`。
9. 实现 Gate Review 初步通过后，主 Agent 必须再新开一个独立代码审查子 Agent 做 read-only review。该 reviewer 不能复用刚完成实现的 `code-writer` 实例，也不得修改代码。唯一例外是 `fix_scope = MICRO_CODE_FIX` 且改动不超过 2 个允许文件、无业务语义变化、required commands 已 PASS、原 verify case 已复验；此时主 Agent 可执行 micro review 并记录 `independent_review: SKIPPED_MICRO_FIX`。
10. 独立代码审查子 Agent 必须检查：
   - 当前 Task diff 是否严格匹配 `delivery-task.md`、`04-tech-plan.md` 和 `09-test-case-matrix.md`。
   - UI Task 是否真的通过了 PRD / Figma semantic alignment；不得只检查 Figma 证据是否存在。
   - 基于真实 diff 检查是否影响不相干逻辑、后续 Task 偷跑、无关重构、临时代码、debug 代码、业务 mock、fake success 或接口字段猜测；不得用 task 阶段的文件清单作为可改动范围白名单。
   - 若 Task 涉及 UI / Figma，是否按 `UI Evidence Mode` 消费证据：`F2C_REQUIRED` 审 f2c / d2c 与 Figma contract，`RUNTIME_BASELINE_ALLOWED` 审现有 DOM / screenshot / computed style baseline 与运行态复核；缺少对应证据时必须要求主 Agent 补证，不得直接 PASS。
   - 若 Task 涉及 adapter / service / BAM 类型，是否只消费真实合同或已登记的 limited behavior，不得本地造数。
11. 独立 reviewer 只有在 packet 缺字段、自相矛盾、targeted diff 无法支撑结论、命令证据过期或发现高风险信号时，才扩大回读完整 `04-tech-plan.md`、`delivery-task.md`、`09-test-case-matrix.md`、日志或代码上下文；扩大回读原因必须写入 review 输出。
12. 主 Agent汇总实现 Gate Review、独立代码审查、非浏览器测试和BAM矩阵核对后，才能写入 `Task Dispatch / Review Ledger` 最终放行结论。
13. 当前 Task 最终放行结论写入 `Task Dispatch / Review Ledger` 后、派发下一 Task 前，必须按 `code-implementation` skill 的 `Checkpoint Commit Rules` 创建本地 checkpoint commit，或记录 `checkpoint_commit: N/A (no diff)`；不得 push，不得提 MR。
14. 任一审查结论为 `BLOCKED` / `NEEDS_TARGETED_REVIEW` 时，不得派发下一 Task，也不得为该 Task 创建 checkpoint commit；必须重派当前 Task 修复、回退上游阶段或暂停提问。

### Independent Review Subagent Input

每个 Task 后的独立代码审查子 Agent 输入必须包含：

- 当前 Task 的 `Task Review Packet`，以及 packet 引用的 targeted diff / changed files / 机械检查输出。
- 当前 `task_id` 与 `delivery-task.md` 对应 Task 原文或 task 摘要；若 reviewer 判断摘要不足，必须定向回读原文。
- `04-tech-plan.md` 中对应 PRD / Figma / Interaction / Cell / Switcher 合同摘录；若摘录缺失、冲突或不足以判断，必须定向回读完整相关小节。
- UI / Figma Task 必须包含 `UI Evidence Mode` 和对应证据摘录；非 UI Task 写 `N/A`。
- `09-test-case-matrix.md` 中对应 case 的 positive / negative assertion。
- 实现 agent（`code-writer`）的 Agent Gate Summary、Implementation Report、Changed Files、Verification Results、Type Check Evidence。
- 当前 Task 的 diff 文件列表和必要 targeted diff。

审查输出必须包含：

- `Agent Gate Summary`。
- `review_result: PASS / BLOCKED / NEEDS_TARGETED_REVIEW`。
- `packet_sufficiency: SUFFICIENT / EXPANDED_CONTEXT_REQUIRED`，若扩大回读必须说明原因和读取范围。
- `task_scope_fit`。
- `figma_ui_alignment`（非 UI Task 写 `N/A`）。
- `prd_figma_semantic_alignment`（非 UI Task 写 `N/A`；若只检查 evidence 存在而未检查需求/Figma/task 语义匹配，必须 `BLOCKED`）。
- `ui_evidence_fit`（非 UI Task 写 `N/A`；对应模式缺证据必须 `BLOCKED`）。
- `code_quality_risks`。
- `missing_verification`。
- `required_followup`。

## Required Artifacts

- `05-implementation-log.md`
- `decision-log.md` 如有实现取舍

`05-implementation-log.md` 必须包含 `Figma / UI 执行检查清单`，逐项记录已确权 UI 改造点的 `UI Evidence Mode`、证据引用、执行状态和浏览器复核方式；不得只在 `/delivery:design` 阶段补救。
`05-implementation-log.md` 还必须包含 `Task Dispatch / Review Ledger`，逐 Task / handoff 记录派发、实现 agent 执行、独立代码审查子 Agent、验证、静态类型检查、主 Agent 审核、放行状态和 checkpoint commit hash。
`05-implementation-log.md` 必须包含集中 `## 待验证项` 清单，覆盖每个已执行 / 已放行 Task 或 handoff；缺项不得输出 READY 或建议进入 `/delivery:verify`。

## Output

输出已修改文件、实现说明、每个 Task 的静态类型检查结果、checkpoint commit hash、未完成项、待验证项、下一步建议 `/delivery:verify`。
