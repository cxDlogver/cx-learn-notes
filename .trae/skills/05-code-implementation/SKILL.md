---
name: code-implementation
description: Use when a confirmed frontend tech plan should be implemented in code after READY or user-approved PARTIAL_READY scope.
---

# Code Implementation

## Purpose

根据已确认技术方案完成前端代码实现。该阶段不补 PRD、不猜接口、不做无关重构。

本阶段入口状态机由 `.trae/commands/delivery:code.md` 承接：主 Agent 在 command 内完成 precheck、execution bootstrap、任务队列、派发、独立代码审查、非浏览器 Gate Review、日志和最终放行。本 skill 只定义 code 阶段实现规则、任务输入包、BAM 矩阵核对、验证要求和审查清单；不得把这些规则解释为允许 `code-writer` 接管阶段编排。

代码执行角色分层：

- `code-implementation`：本 skill，负责定义 `/delivery:code` 的正式 Task N 编排规则、输入包、BAM 矩阵核对、非浏览器验证、审查和日志要求。
- `code-writer`：唯一代码编写 agent，用于正式 Task N、verify/design hotfix、`MICRO_CODE_FIX`、`CASE_CODE_FIX` 或其他已物化边界的受限代码修复；不承接阶段编排。
- `runtime-runner`：可选运行时 / 命令 / 日志辅助 agent，用于 dev server、端口归属、health check、HMR / 编译日志、lint/typecheck/test/build 等低上下文任务；不写代码、不判定 case、不做浏览器验证、不承接 Gate。


## Mandatory Precheck

执行前必须读取：

- `.trae/AGENTS.md`
- `.trae/DELIVERY_STATE.md`
- 当前 workspace 下的 `03-prd-analysis.md`
- 当前 workspace 下的 `04-tech-plan.md`
- 当前 workspace 下的 `delivery-task.md`
- 当前 workspace 下的 `09-test-case-matrix.md`
- 当前 workspace 下的 `07-design-alignment.md`（如存在）
- 当前 workspace 下的 `uncertainty-register.md`

必须满足：

- `03-prd-analysis.md` 状态为 DONE；若启用 Mock Preview Mode，允许 `PARTIAL_READY_FOR_PLAN`，但必须无影响前端效果预览的 P0。
- `04-tech-plan.md` Plan Readiness = READY，或用户明确允许 PARTIAL_READY 的限定实现。
- `/delivery:task` 已完成，`delivery-task.md` 存在且 `Task Readiness: PASS`，`09-test-case-matrix.md` coverage audit 为 PASS。
- 若启用 Mock Preview Mode，Code只核对当前 Task所需 rule是否存在于 BAM矩阵；矩阵缺失返回 `/delivery:task`，已有 rule但runtime需要补充时只更新该行 `补充说明`。
- 非 `MOCK_PREVIEW` 下不得要求 BAM mock矩阵或 mock产物；缺失不得阻塞 Code。
- 无影响实现的 P0_BLOCKER。
- 若存在未关闭设计 BLOCKER，`delivery-task.md` 必须包含对应 `Design Rework Task`；否则停止实现，返回 `/delivery:task` 或 `/delivery:design` handoff。
- 用户已确认允许进入实现。

若任一条件不满足：

- 必须执行 Pause and Ask Protocol。
- 禁止修改业务代码。

## PRD / Figma Semantic Alignment Gate

Code 阶段不能只判断“需求点有 Figma / task 有 nodeId / case 有 evidence”，还必须在派发 `code-writer` 前确认 PRD 语义、Figma 可见合同和 `delivery-task.md` 实现目标三者匹配。

适用范围：

- 任何 UI / Figma 相关 Task。
- 任何 `UI Evidence Mode = F2C_REQUIRED` 或 `RUNTIME_BASELINE_ALLOWED` 的 Task。
- 任何映射到 `Figma Region Contract`、`Figma Interaction Contract`、`Figma Cell Contract` 或 `Figma / UI 改造清单` 的 requirement。

必须核对：

- `requirement_id` 的 PRD 原子需求、literal copy、枚举 / 状态语义是否与 Figma 可见文案、结构、状态一致。
- `04-tech-plan.md` 中的 Figma Region / Interaction / Cell Contract 是否明确表达该需求点，而不是只记录有 `fileKey`、`nodeId` 或 cache。
- `delivery-task.md` 的 expected_result、checkbox steps、stop_conditions 是否把 Figma 合同转成可执行目标；不得只写“对齐 Figma”或只引用截图路径。
- `09-test-case-matrix.md` 对应 case 的 `positive_assertion`、`negative_assertion`、`visual_assertion` 是否覆盖 Figma 必显 / 禁显 / 状态差异。
- 对 Tag / Tooltip / Badge / Button / Table Cell / Popover 等可见控件，必须核对控件形态、父子 / 同级关系、触发前后状态、文案和禁显残留；不能只判断字段、DOM 文案或组件存在。

Gate 结论：

- `MATCHED`：PRD、Figma 和 task 目标同义，允许继续派发。
- `MATCHED_WITH_LIMITATION`：局限已在 plan / task / case 中写明，且不影响当前实现安全；允许继续，但必须在 `05-implementation-log.md` 登记。
- `MISMATCH_NEEDS_PLAN_REWORK`：PRD 与 Figma 可见结构 / 文案 / 状态冲突，或 Figma 明确要求未被 plan 表达；必须回 `/delivery:plan`，不得派发代码。
- `MISMATCH_NEEDS_TASK_REWORK`：plan 已表达清楚，但 `delivery-task.md` 或 `09-test-case-matrix.md` 未把 Figma 合同物化为可执行目标 / 验收断言；必须回 `/delivery:task`，不得派发代码。
- `PENDING_FIGMA_EVIDENCE`：只有“有 Figma 链接 / 有截图”但无法判断是否匹配当前需求点；必须先补 Figma / f2c / d2c 证据，不得把存在性当匹配性。

记录要求：

- `05-implementation-log.md` 必须包含 `PRD / Figma Semantic Alignment Matrix` 或等价表，逐 `requirement_id` / Task 记录 `prd_contract`、`figma_contract`、`task_contract`、`test_case_contract`、`match_result`、`required_rework`。
- `Task Review Packet` 必须携带该 alignment 结论；独立 reviewer 必须复核真实 diff 是否遵守匹配后的合同。
- 若 code 阶段发现 `04-tech-plan.md` 或 `delivery-task.md` 只证明“有证据”而缺少“语义匹配”判断，主 Agent 必须先补做该 Gate；不得把缺口推迟到 `/delivery:design`。

## Mock Preview Mode

本阶段支持 `--mock-preview`，用于在后端设计缺失时基于已完成的 BAM mock runtime 实现前端效果。

允许范围：

- 页面结构和 Figma / UI 改造点。
- 真实 page -> store -> service -> BAM 调用链。
- adapter / 类型隔离，但只允许稳定字段映射、格式化和展示兜底。
- skeleton / 空态 / 加载态 / 失败兜底。
- 表单校验。
- mock-debug 入口。
- 测试脚本、mock-debug fixture、case fixture 中的 `Test Fixture Mock`。

禁止范围：

- 真实调用未确认接口。
- 真实上传解析。
- 真实发送 IM。
- 真实创建触达任务或 BPO 任务。
- 真实下载 / 导出。
- 在 code 阶段修改目标 BAM marker、BAM wrapper mock patch、mock runtime、manifest、rule-map 或 generator 管理的 `__mock__`。
- 在 code 阶段操作浏览器、调用 `/delivery:mock`、采集真实 request / response 或执行 mock-debug。
- 在 component、store、service、adapter、route 等业务代码中写 mock 数据。
- fallback store、preview service。
- adapter 返回 fixture、补全业务字段、伪造状态流转或 fake success。
- 本地过滤 fixture 或本地保存成功。
- 将 mock-preview 结果标记为 integration-debug 通过或交付验收完成。

实现要求：

- `05-implementation-log.md` 必须引用 `09-test-case-matrix.md` 中的 `Mock Preview Scope`、`Mock / Real Boundary` 和当前任务关联的 `case_id/ruleId`。
- 矩阵已有当前 rule即可继续；Code不读取或验证 mock runtime产物。
- `code-writer`发现 mock数据、matcher或wrapper透传需要补充时，只允许在矩阵已有的 `case_id / ruleId / apiName` 对应行 `补充说明` 记录代码位置、问题和证据；不得新建独立 handoff 或改写合同列。
- 对写接口、保存按钮、确定按钮或其他可能产生真实副作用的路径，Code 只实现正式调用链和前端保护，不点击真实提交。是否需要 `NO_RESPONSE_DATA`、`SYNTHETIC_CONTRACT` 或 wrapper patch 由 verify 的 `/delivery:mock` detour 判断。
- 前端请求参数、分页、筛选、payload 必须按最终 BAM 合同组装；BAM mock response 按已生成规则返回。
- 若表格 / 列表字段来自 BAM mock，业务代码仍只消费真实 service 返回结构；Code只依据 BAM矩阵合同实现。
- 所有 adapter 必须登记真实字段映射和展示兜底，不得登记为未来二次功能改造点。
- 真实接口接入后，只允许清理 / 替换 BAM mock response、更新接口产物并重跑真实验证；不得依赖后续前端业务代码调整。
- UI 执行仍必须优先覆盖 `Figma / UI 改造清单`，不能只做数据 mock。

### BAM Mock Matrix Check

- 当前 Task 需要 runtime mock 时，只检查 `BAM Mock Response Field Coverage Matrix` 是否已有对应 `case_id / ruleId / apiName`。
- 矩阵缺少对应规则或合同字段时返回 `/delivery:task` 修正矩阵；Code 不创建 Task→Case/Mock 交接记录。
- 矩阵已有规则但 mock数据、matcher、BAM wrapper字段透传或其他runtime产物需要补充时，只更新同一 `case_id / ruleId / apiName` 行的 `补充说明`，写清 `task_id`、问题、代码位置和证据。
- `补充说明` 是 BAM矩阵的行内提示列，不是合同列；不得改写 request / response、matcher或期望response，也不得拆成独立 handoff / 附录。
- Code 不修改 Mock Readiness、rule-map、manifest、BAM marker、wrapper patch 或 `__mock__`，也不因 runtime 尚未闭合而阻塞业务代码。

## Mandatory Agent Delegation

禁止把整阶段直接委派给 `code-writer` agent。Code 阶段必须采用“主 Agent 串行分派 / 审核，Subagent 执行单个 bounded task”的模式。

`MOCK_PREVIEW` 下 Code不生成/调整 BAM mock，不执行 `/delivery:mock`，不写 `delivery-mock.md`。Code只允许更新 BAM矩阵对应行的 `补充说明`。

阶段编排职责以 `.trae/commands/delivery:code.md` 为准。本 skill 中出现的“主 Agent 必须”均为 command 执行时引用的审查和执行规范，不是 `code-writer` 的任务授权。

每个 Task 必须至少经过两个互相独立的子 Agent 实例：

1. `code-writer`：只实现当前 `/delivery:code` Task N 或 handoff repair 的业务代码、非浏览器静态检查和代码层日志。
2. 独立代码审查子 Agent：在实现 agent 返回后由主 Agent 新开，只读审查当前 Task / handoff diff；不得复用刚完成实现的 agent 实例，不得修改代码，不得替主 Agent 放行下一 Task。

如当前 Task 需要隔离长日志、确认 dev server / HMR 状态、检查端口归属、运行耗时命令或归纳命令输出，主 Agent 可另行派 `runtime-runner`；该结果只作为 `command_result` / `runtime_status` / `auxiliary_evidence_candidate`，不计入独立代码审查，不替代 `code-writer` 的实现报告，也不得直接放行当前 Task。

独立代码审查是普通实现 Task 和 `CASE_CODE_FIX` 的硬门禁。审查未返回 `PASS` 前，主 Agent 不得派发下一个 `Task N` 或返回 verify/design 复验；mock closure 不属于 Code 审查结论。`MICRO_CODE_FIX` 使用下方 `Micro-Fix Fast Path` 的 micro review 例外，不要求新开独立代码审查子 Agent。

审查性能优化只能减少重复读取和重复运行，不得减少审查维度。普通 Task 的独立审查仍必须覆盖 task scope、plan / PRD / case matrix 对齐、真实 diff 是否影响不相干逻辑、临时代码、debug 代码、真实接口合同、UI / Figma 合同、验证证据和 mock 边界；优化方式是让主 Agent 先把这些事实压缩成可审计的 `Task Review Packet`，reviewer 先读 packet + targeted diff，必要时再扩大回读。

### Verify Failure Handoff Mode

当当前 workspace 存在 `code-fix-handoff.md`，且 handoff 指向当前 active verify case，或 `.trae/DELIVERY_STATE.md` 显示最近 `/delivery:verify` 因 `CODE_ISSUE` / `TYPE_ISSUE` / `BUILD` 阻塞时，`/delivery:code` 必须优先进入定向修复模式。不得因为 verify 仍处于 case 内 detour、尚未把阶段状态写成 blocked，就忽略有效 handoff。

定向修复模式的入口条件：

- `code-fix-handoff.md` 存在。
- handoff 的 `source_verify_report` 指向当前 workspace 的 `06-debug-verification.md`，且 `affected_case_ids` / 当前 `active_case_id` 可回溯。
- handoff 中 `agent_recommendation = DISPATCH_CODE_WRITER`。
- handoff 中 `fix_scope = MICRO_CODE_FIX / CASE_CODE_FIX`；缺失时默认按 `CASE_CODE_FIX` 处理。
- `expected_fix` 不需要 PRD / Figma / 产品决策。
- 若存在 `forbidden_files`，其内容仅作为审计提示，不再单独作为派发前置门禁。

执行要求：

- 主 Agent 先审 `code-fix-handoff.md`，确认边界完整。
- 优先派发 `code-writer` 处理该单点修复；不得让 `runtime-runner` 或主 Agent 在 `/delivery:verify` 阶段修代码。只有当修复已被重新物化为 `delivery-task.md ### Task N` 时，才按正式 Task N 输入包派发给 `code-writer`。
- 派发 prompt 必须包含：错误文件/行号、错误码、预期最小修复、必须运行的验证命令；若 handoff 已提供允许修改文件、禁止修改文件，可附带为审计提示。
- `code-writer` 返回后，主 Agent 必须审核 `Agent Gate Summary`、改动文件列表、验证结果和 `05-implementation-log.md` 更新。
- 若 agent 改动越界、代码 / 非 mock 验证失败或需要产品/设计决策，主 Agent 必须停止并返回 `NEEDS_TARGETED_REVIEW`；仅 `MOCK_PREVIEW` 下 mock 验证重试失败按 `MOCK_ISSUE` 回到 `/delivery:mock`，不得要求补做已完成 code task。非 `MOCK_PREVIEW` 下缺 mock 不参与 handoff。
- 修复完成后更新 `05-implementation-log.md` 的 `Verify Fixes` 小节，并建议重新执行 `/delivery:verify`。

若 handoff 不满足上述入口条件，不得自动修复；主 Agent 必须做 Gate Review 并决定返回 `/delivery:plan`、普通 `/delivery:code` 或暂停提问。

### Micro-Fix Fast Path

当 `code-fix-handoff.md` 中 `fix_scope = MICRO_CODE_FIX` 时，`/delivery:code` 进入低成本定向修复：

- 仍必须派发全新的 `code-writer`，不得由主 Agent 或 `runtime-runner` 直接修改业务代码。
- 派发输入只包含 handoff 的 `blocking_errors`、`allowed_files`、`forbidden_files`、`expected_fix`、`required_commands`、`affected_case_ids` 和 `broader_rerun_policy`。
- `code-writer` 只能修改 `allowed_files`，最多 2 个文件；若发现需要扩大范围，必须返回 `NEEDS_TARGETED_REVIEW`。
- 主 Agent 的 micro review 必须检查 diff 范围、错误是否闭合、`required_commands` 输出、`05-implementation-log.md` 的 `Verify Fixes` 记录，以及 `/delivery:verify` 回到原 case 的复验入口。
- 独立代码审查子 Agent 可跳过，仅当全部条件满足时记录 `independent_review: SKIPPED_MICRO_FIX`：改动不超过 2 个允许文件、无业务语义变化、无 UI 结构变化、无接口 / 权限 / 跨系统影响、required commands 已 PASS。
- 若触发 `broader_rerun_policy = RUN_TARGETED / RUN_FULL_BASELINE`，必须由主 Agent 回到 verify 后执行对应命令；code 阶段不得宣称 broader baseline 已通过，除非实际执行并记录证据。

不满足上述任一条件时，自动升级为 `CASE_CODE_FIX` 或 `MAIN_AGENT_REVIEW_REQUIRED`，不得继续走 micro-fix。

供 `/delivery:code` command 调用的主 Agent 审查清单（普通实现适用；`MICRO_CODE_FIX` / `CASE_CODE_FIX` 使用 `code-fix-handoff.md` 的 handoff 审查清单，除非被重新物化为 `delivery-task.md ### Task N`）。以下条目只在普通实现或回流为正式 Task N 时执行：

- 确认实现范围。
- 使用 `Use Skill: executing-plans` 加载并审查 `delivery-task.md`。
- 使用 `04-tech-plan.md` 做上游合同校验。
- 确认 `delivery-task.md` 已经是 `executing-plans` 可直接执行的 implementation plan。
- 审查 `04-tech-plan.md` 是否包含 `PRD Logic Coverage Matrix`，并确认每个 Atomic Requirement 都有执行任务、mock / skeleton 行为或明确排除项。
- 审查 `04-tech-plan.md` 是否包含 `Page-Level Figma Coverage Audit`，并确认页面级 UI 结构任务只来自 `FIGMA_MAIN_STATE_CONFIRMED` 页面。
- 审查 `04-tech-plan.md` 是否包含 `Figma / UI 改造清单`，并确认已确权 UI 事实已转成执行任务。
- 审查 `04-tech-plan.md` 是否包含 `Switcher Impact Contract`，并确认页面级切换会影响下游 region / component / store 查询参数 / BAM mock response（如适用）/ skeleton state。
- 审查 `04-tech-plan.md` 是否包含 `Figma Region Contract`，并确认每个已确权可见区域都有 fileKey、nodeId、数据来源、需 execute 提取的数据、视觉结构与顺序和验收方式，且视觉结构验收不只依赖 build / grep。
- 审查 `04-tech-plan.md` 是否包含 `Figma Cell Contract`，并确认每个关键单元格的列名、nodeId、单元格类型、子元素和形态/热区/空态完整，复杂单元格逐子元素展开成多行。
- 审查 `04-tech-plan.md` 是否包含 `Figma Interaction Contract`，并确认每个可操作控件都有触发前状态、触发动作、触发后状态、Code 执行断言和 Verify 点击断言。
- 消费并校验 UI Task 已声明的 `UI Evidence Mode`：以 `delivery-task.md` 为权威输入，不在 code 阶段重新分类。该字段只能是 `F2C_REQUIRED` / `RUNTIME_BASELINE_ALLOWED` / `NO_F2C_REQUIRED`。必须确认 task 中的 mode 与 `04-tech-plan.md` 的 `UI Implementation Directive Matrix`、`figma_fileKey` / `figma_nodeId` / `figma_state_scope`、实现边界和验收 case 同义；若缺失、非规范枚举值、冲突或证据模式不匹配，返回 `/delivery:task` 或 `/delivery:plan`，不得在 code 阶段自行改判继续实现。
- 若 `.trae/DELIVERY_STATE.md` 或 `07-design-alignment.md` 存在未关闭设计 BLOCKER，审查 `delivery-task.md` 是否已有对应 `Design Rework Task`，并确认 BLOCKER ID、checkbox step、HMR / browser 复核点和预期结果完整；代码定位线索和排除业务范围如存在则作为审计提示。
- 如 `delivery-task.md` 不具备可执行任务粒度，停止实现并返回 `/delivery:task` 修复；若缺口来自 plan，才返回 `/delivery:plan`。
- 按 `delivery-task.md` 中 `### Task N` 的顺序建立任务队列，逐项派发、审核和记录。不得跳过 Task、不得并发派发多个 Task、不得把多个不同 `Task N` 合并给同一个子 Agent。
- 每个 Task 派发前整理固定输入包：Task ID、requirement/case/rule/API、checkbox steps、Figma / BDD / UI 落点、`figma_fileKey` / `figma_nodeId` / `figma_state_scope`、Mock / Real 边界、验证命令和验收断言。UI Task 必须附带 `UI Evidence Mode` 及已有实现证据；若 task 文档提供代码定位线索 / 排除范围，可附带为 review 审计提示。
- 每个 Task 返回后执行 Gate Review：审查子 Agent `Agent Gate Summary`、checkbox完成情况、真实 diff文件、非浏览器验证结果、`05-implementation-log.md`、BAM矩阵核对结果和剩余风险；代码实现、静态检查或非浏览器测试未通过前不得派发下一 Task；mock未生成或未验证不属于 Code Gate。
- 每个 Task 返回后必须核对 `delivery-task.md` 的当前 Task checkbox delta：已完成 step 必须从 `[ ]` 勾选为 `[x]`，未完成 / 阻塞 step 必须保持未勾选并在实现报告说明原因；若当前 Task 未回写勾选、勾选了未完成 step、或提前勾选后续 Task，Gate Review 结论必须为 `BLOCKED` / `NEEDS_TARGETED_REVIEW`，不得 checkpoint。
- 每个 Task 的实现 Gate Review 初步通过后，必须新开独立代码审查子 Agent 做 read-only review；审查维度包括 task scope、plan / PRD / case matrix 对齐、真实 diff 是否影响不相干逻辑、临时代码、真实接口合同、UI / Figma 合同和缺失验证。涉及 UI 的 Task 必须审查是否按 `UI Evidence Mode` 消费证据：`F2C_REQUIRED` 看 f2c / d2c，`RUNTIME_BASELINE_ALLOWED` 看现有 DOM / screenshot / computed style baseline 与复核断言；仅凭实现子 Agent 自述不得放行。
- 在 `05-implementation-log.md` 写入 `Task Dispatch / Review Ledger`，记录每个 Task 的派发、执行、独立代码审查、测试、mock、审核和放行状态。
- 确认没有越界重构。
- 更新阶段状态。

`code-writer` 是当前 Task 的执行者，使用条件：

- 单个任务边界清晰、不会与其他任务并发冲突。
- 主 Agent 已完成 plan review，明确该任务的验收方式；若 task 文档附带代码定位线索 / 排除范围，可作为 review 审计提示。
- UI Task 必须同时提供对应 `Figma Region Contract` / `Figma Interaction Contract`、`figma_fileKey` / `figma_nodeId` / `figma_state_scope` 和 `UI Evidence Mode`；`F2C_REQUIRED` 缺少 f2c / d2c 结构证据不得派发，`RUNTIME_BASELINE_ALLOWED` 缺少 runtime baseline 不得派发。若 code 阶段发现 mode 与 task / plan 合同冲突，只能回 `/delivery:task` 或 `/delivery:plan`，不得在当前阶段改写 mode 后继续。
- 当前 Task 的业务代码和非浏览器局部测试在同一任务点内闭合；BAM mock rule、BAM marker patch、mock-debug 和浏览器验证统一移交 verify/design，不在 Code Task Gate Review 中闭合。

`code-writer` 必须：

- 只按主 Agent 派发的当前 Task 和 `04-tech-plan.md` 修改代码。
- 按当前 Task 的 checkbox 顺序小步执行，不得处理后续 Task。
- 每步记录改动文件、原因、关联 requirement/case/rule。
- 每个 checkbox step 完成并通过对应验收后，必须只在 `delivery-task.md` 中把当前 Task 对应项从 `[ ]` 勾选为 `[x]`；不得改写 task 文案、不得勾选未完成项、不得勾选后续 Task。
- `MOCK_PREVIEW` 任务内发现 runtime mock需要补充时，完成正式调用链并返回矩阵已有的 case/rule/API、代码位置、问题和证据；字段与期望行为只引用 BAM矩阵。
- 每个 checkbox 完成后执行对应测试 / 验收命令；无法执行必须说明原因和替代证据。
- 遇到接口合同缺失、矩阵缺规则或字段语义不确定时返回 `/delivery:task`；若矩阵完整且仅需补充 mock runtime，在 `补充说明` 记录后继续代码审查。

## Main Agent Gate Review

主 Agent 必须遵守 `.trae/AGENTS.md` 的 `Main / Subagent Collaboration Contract`。

本阶段主 Agent 不把整个 `/delivery:code` 委派给 `code-writer`。每次只派发一个 `Task N`，并在 `code-writer` 返回后先审：

- `Agent Gate Summary`。
- 单任务 `Implementation Report`。
- 真实 diff 文件列表，以及是否影响不相干逻辑、后续 Task 或用户排除范围。
- `05-implementation-log.md` 中该任务记录。
- UI Task 的 `UI Evidence Usage` 是否匹配 `UI Evidence Mode` 并真实被代码消费。
- 验证命令结果、BAM矩阵规则核对、`补充说明` 和非浏览器失败分类。

上述实现 Gate Review 初步通过后，主 Agent 必须再派发一个新的独立代码审查子 Agent 执行 read-only review。该 reviewer 必须重点审查当前 Task diff 与 PRD / plan / test matrix 的一致性；涉及 UI 的 Task 必须审查 `UI Evidence Mode` 对应证据和 Figma 合同是否被严格消费，尤其文案、区域顺序、直接子元素、控件形态、显隐、禁显残留和交互状态。独立 reviewer 不修改代码，不复用实现子 Agent，不宣布阶段推进。

独立 reviewer 默认先读取主 Agent 为当前 Task 整理的 `Task Review Packet`、targeted diff、changed files 和机械检查结果。只有当 packet 缺少必要合同、摘录自相矛盾、targeted diff 无法判断行为、命令证据不是最终 diff 后产生、UI 证据与实现报告不一致、发现高风险代码路径，或 review 输出为 `BLOCKED` / `NEEDS_TARGETED_REVIEW` 时，才扩大回读完整 `04-tech-plan.md`、`delivery-task.md`、`09-test-case-matrix.md`、日志或源码上下文；扩大回读原因必须写进 `packet_sufficiency`。

只有当 summary 或独立 review显示 `BLOCKED` / `NEEDS_TARGETED_REVIEW`、真实 diff疑似影响不相干逻辑、计划约束和实现不一致、临时代码未登记、代码或非浏览器验证失败，或 BAM矩阵缺少当前 Task需要的规则时，主 Agent才定向回读对应代码 diff、plan/task/test/log。mock运行态未验证不触发 Code回读或重试状态。

### Design Rework Subagent Slice Mode

当 `/delivery:design` 或 `design-checker` 输出可修复的设计 BLOCKER 时，默认必须采用该模式，不需要用户特别指定节省上下文。边改边修 / auto-fix 也必须走该模式。

1. 主 Agent 先确认 dev server 可用，并把 vmok URL、Figma evidence、blocker_id、代码定位线索、排除范围、HMR / browser 复核点整理为单任务包；同时必须附上当前 case 已存在的 runtime screenshot / DOM / computed style baseline。验证命令只在任务声明或触发升级条件时补充。
2. 主 Agent 必须先确保 BLOCKER 已物化进 `delivery-task.md` 的 `Design Rework Task`，格式满足 `executing-plans`；该物化可由 `/delivery:design` auto-fix 在当前阶段内增量完成，也可来自既有 `/delivery:task` 产物。任务目标应定义为“当前 active case 场景收敛到 Figma 合同”，而不是“只改一条局部差异”。禁止让代码 agent 直接根据截图、聊天摘要或 `07-design-alignment.md` 写业务代码。
3. 当前仍处于 `/delivery:design` hot-fix loop 时，派发 `code-writer` 执行该单切片；如果该返工已经回流为 `/delivery:code` 的 `Task N`，则按正式 Task N 输入包派发给 `code-writer`。代码 agent 只返回压缩 Implementation Report：改动文件、契约满足点、验证命令、失败/风险；不得输出大段无关代码或全量 diff。
4. 主 Agent 必须做 Gate Review：检查改动是否越界、读取 targeted diff、跑 `GetDiagnostics`、复用浏览器立即检查原 BLOCKER computed style / DOM / 截图。design hot-fix 不得把浏览器复核延后到后续 case 或阶段末尾。
5. 若发现子 Agent 漏修类型、CSS module、构建、越界或视觉未闭合，主 Agent 必须重新派发同一切片或返回 `NEEDS_TARGETED_REVIEW`；不得绕过代码 agent 直接改业务代码，也不得扩大成整阶段重构。

代码 agent task prompt 必须包含：

- `Task ID / Blocks`。
- `Forbidden Files / Boundary Hints`（如 `delivery-task.md` 已提供，用于 review 审计，不作为派发前置门禁）。
- `Visual Contract`：目标文案、组件形态、关键尺寸/颜色/圆角、禁显残留。
- `Runtime Evidence`：现状差异的 selector / computed style / screenshot path，以及可复用的 baseline runtime evidence。
- `Verification`：设计返工默认包含 HMR / 自动增量编译状态、浏览器即时复验点、原 design case 复核方式和修后 closure evidence 要求；diagnostics / build / targeted typecheck 只在任务包明确要求、改动涉及类型 / 接口 / 数据结构 / 公共组件、或 HMR/browser 证据无法定位时升级。浏览器复验、mock-debug、BAM warning 验证统一交给主 Agent，除非子 Agent 运行环境已显式授予浏览器能力。
- `Stop Condition`：遇到产品/设计决策、接口、权限或状态流转不完整立即返回 BLOCKED。

## Execution Efficiency and Evidence Protocol

在满足 Gate 的前提下，默认采用“先一次性补齐任务队列上下文，再按 Task N 串行派发，单 Task 即时验收”的执行方式。效率优化不得降低 PRD / Figma / plan / runtime evidence 门槛，也不得跳过任务顺序或把多个 Task 的验收延后到批次末尾。

### Batching Rules

- **一次性任务队列打包**：每个 code 阶段开始前，主 Agent 可以一次性整理所有 Task 的 `task_id`、`requirement_id`、`verification_commands`、`fileKey/nodeId`、Figma contracts、Mock / Real 边界、adapter / skeleton 许可和浏览器复核方式；若 task 文档自带代码定位线索 / 排除范围，则把它们记录为 review 审计提示，但派发仍必须一次一个 Task。
- **Task Context Index**：普通实现进入队列前，主 Agent 应把所有 Task 的关键上下文整理为轻量索引，至少覆盖 `task_id`、requirement/case/rule/API、plan contract ref、test case ref、UI Evidence Mode、allowed / boundary hints、Mock / Real 边界、required commands、浏览器复核点和 stop conditions。小型单 Task 可内联到 `05-implementation-log.md`；多 Task、UI 任务或上下文较大时应落盘为当前 workspace 的 `code-review/context-index.md`。索引只做导航，不替代 `04-tech-plan.md`、`delivery-task.md`、`09-test-case-matrix.md` 或真实证据。
- **PRD / Figma Semantic Alignment Matrix**：普通实现进入 UI Task 队列前，主 Agent 必须逐 requirement / Task 建立语义匹配表，确认 PRD 原子需求、Figma 可见合同、task 目标和 test case 断言同义。该矩阵是派发前 Gate，不得只以“有 nodeId / 有截图 / 有 case”视为匹配。
- **D2C MCP Artifact Storage**：任何 `F2C_REQUIRED` Task 调用 d2c MCP 后，必须把当前 Task 实际消费的最小 d2c MCP 产物存储在当前 workspace 的 `code-review/d2c-evidence/task-<task-id>/` 下。只保留对应 node 的 JSON / result / SCSS result、被用于视觉判断的 preview / screenshot 和短 manifest；不得整目录保存临时产物、不得保存未消费节点、不得把未消费的生成代码或大量无关截图塞进 review packet。
- **强耦合任务不得合并执行**：共享同一页面主态、状态机或交互链路的任务可以在上下文中连续排队，但不得合并为一个子 Agent 任务；必须完成前一个 Task 的主 Agent Gate Review 后，才能派发下一个 Task。
- **每个 Task 完成即 review**：每个 Task 完成后必须检查越界、违反 plan / Figma contract、P0/P1阻塞、代码 / 非浏览器验证结果、日志和 BAM矩阵核对；不得在多个 Task尚未逐个收口时触发整树 acceptance或交付验收。
- **任务边界按当前 Task 解释**：review 默认只判断真实 diff 是否与当前 Task 目标、checkbox、PRD/Figma/验证断言相称，以及是否影响不相干逻辑；不得把 task 阶段的代码定位线索解释成可改动文件范围。若工作树中存在其他已通过 review 的任务改动，不得反复以“整棵树不纯”阻断当前 Task。整体验收前再统一收口 MR 范围。

### Review Performance Protocol

目标是把独立审查从“重新读完整阶段材料”改为“先读可审计的当前 Task 包，再按风险展开”。这不是降级：审查维度不减少，缺证据时必须扩大回读或阻塞。

`Task Review Packet` 由主 Agent 在实现 Gate Review 初步通过后、派独立 reviewer 前整理。建议落盘到当前 workspace 的 `code-review/task-<task-id>-review-packet.md`；小型单 Task 可内联到 `05-implementation-log.md`。Packet 必须包含：

- 当前 Task / handoff 摘要、来源段落引用和 `Task Context Index` 引用。
- `04-tech-plan.md` 对应该 Task 的 PRD / Figma / Interaction / Cell / Switcher / adapter 合同摘录。
- `PRD / Figma Semantic Alignment Matrix` 中当前 Task 的匹配结论；若没有，packet 不充分。
- `09-test-case-matrix.md` 对应 case 的 positive / negative assertion、evidence_required 和 mock / real 边界。
- UI Task 的 `UI Evidence Mode`、f2c / d2c、Figma MCP、runtime baseline、浏览器复核点；非 UI Task 写 `N/A`。
- `F2C_REQUIRED` 的 d2c 证据必须引用 `code-review/d2c-evidence/task-<task-id>/` 下本 Task 实际消费的 d2c MCP 产物路径、manifest 和精简 `consumed_contract` 摘要；不得只引用临时目录或未消费节点。
- `code-writer` 的 `Agent Gate Summary`、Implementation Report、UI Evidence Usage、Changed Files、Verification Results、Type Check Evidence 和 mock checkpoint 状态。
- `targeted_diff` 路径或摘要、`changed_files` 摘要、debug / 临时代码扫描结果、真实 diff 是否影响不相干逻辑的审计结果。
- 命令证据 freshness：命令名称、退出码、运行时间或 commit/diff 标识、是否在最终 diff 后执行；无法证明 freshness 时标记 `STALE_OR_UNKNOWN`。

机械检查优先由主 Agent 本地运行，只有输出过长或需要隔离命令时才派 `runtime-runner`。推荐把以下结果写入 packet：

- `.trae/scripts/check_no_debug_code.sh <workspace>/code-review/task-<task-id>-debug-code-scan.md`
- `.trae/scripts/check_changed_files.sh <workspace>/code-review/task-<task-id>-changed-files.md`
- 当前 Task 的 targeted diff，例如 `git diff -- <task-files>` 输出到 `<workspace>/code-review/task-<task-id>-targeted-diff.patch`，或在 diff 很小时内联摘要。

命令结果可复用但必须校验 freshness：如果 `code-writer` 已在最终 diff 之后运行 task 要求的 typecheck / test / lint / build，独立 reviewer 和主 Agent 优先核验该证据，而不是重复运行同一命令。只有当 diff 之后又有改动、命令证据缺失或过期、命令覆盖范围不足、日志显示 warning / flake / timeout、涉及公共组件 / 类型 / adapter / 构建配置高风险改动，或 reviewer 明确要求复核时，才重新运行。

可并行但不得并发实现：`code-writer`返回后，主 Agent可同时完成 BAM矩阵核对和 `补充说明` 整理；最终 Gate仍等待独立review。

独立 reviewer 输出必须短而完整，不得粘贴大段 diff 或复述全文。必须包含：

- `review_result: PASS / BLOCKED / NEEDS_TARGETED_REVIEW`
- `packet_sufficiency: SUFFICIENT / EXPANDED_CONTEXT_REQUIRED`
- `expanded_context_reason`（未扩大写 `N/A`）
- `task_scope_fit`
- `contract_fit`
- `figma_ui_alignment`
- `prd_figma_semantic_alignment`：需求点、Figma 可见合同和 task 目标是否同义；若只检查 evidence 存在，必须 `BLOCKED`。
- `ui_evidence_fit`
- `mock_boundary_fit`
- `verification_freshness`
- `code_quality_risks`
- `missing_verification`
- `required_followup`

扩大回读触发条件：

- Packet 缺少当前 Task 原始范围、plan/test/UI 合同、verification freshness 或 targeted diff。
- Packet 摘录互相冲突，或与 `code-writer` 报告 / diff 不一致。
- UI Task 缺少对应 `UI Evidence Mode` 证据，或证据只停留在自述。
- diff 涉及未列入 Task 的页面、公共组件、adapter、service、权限、跨系统动作、BAM wrapper、构建配置或生成代码。
- 机械检查发现 debug / 临时代码 / 业务 mock / fake success / `.only(`。
- reviewer 无法从 packet 判断是否满足原始 contract。

禁止为了速度跳过独立审查、跳过 targeted diff、跳过 UI 证据适配、跳过 mock 边界、把 stale 命令当 PASS、或让 `runtime-runner` / `code-writer` 代替独立 reviewer 作最终审查。

### Scenario Simulation

场景：`/delivery:code` 的 Task 3 修改已有筛选表格的局部文案、筛选 wiring 和状态 tag，属于 `RUNTIME_BASELINE_ALLOWED`。慢路径会让 reviewer 重新读取完整 `04-tech-plan.md`、`delivery-task.md`、`09-test-case-matrix.md` 并重复跑 typecheck。优化后：

1. 主 Agent 在 code 阶段开始整理 `Task Context Index`，记录 Task 3 的 requirement、case、Figma / runtime baseline、allowed files 和 typecheck 命令。
2. `code-writer` 只执行 Task 3，返回 Implementation Report、UI Evidence Usage、Changed Files 和最终 diff 后的 typecheck 证据。
3. 主 Agent 生成 `Task Review Packet`，同时运行 changed files / debug code 机械检查，并把 targeted diff 指向 Task 3 文件。
4. 独立 reviewer 先读 packet + targeted diff，检查 scope、contract、UI evidence、mock boundary 和 verification freshness；若 packet 完整且无矛盾，不再全文回读或重复 typecheck。
5. 若 reviewer 发现 diff 触达公共 table 组件或 typecheck 证据早于最终 diff，才扩大回读或要求重跑。

结论：Task 仍逐个 Gate、独立审查仍存在、UI 和 mock 证据不降级；节省的是重复 I/O、重复命令和长文档重读。

### Checkpoint Commit Rules

- 每个 `Task N` 只有在主 Agent Gate Review、独立只读审查、静态检查、非浏览器测试和 `Task Dispatch / Review Ledger` 最终结论均为 `PASS` / `PASS_WITH_APPROVED_EXCEPTIONS` 后，才能创建本地 checkpoint commit。
- checkpoint commit 是本地提交，不 push、不提 MR；阶段最终 MR 仍在 `/delivery:verify` 和验收通过后统一整理。
- 派发下一个 `Task N+1` 前，必须完成当前 Task 的 checkpoint commit，或记录 `checkpoint_commit: N/A (no diff)`。若 commit 因未授权 diff、生成扩散、冲突或用户改动混杂无法安全创建，必须暂停修正或提问，不得继续派发下一 Task。
- 只允许 stage 当前 Task 已批准文件、该 Task 相关 `05-implementation-log.md` / `decision-log.md` 更新，以及已在前序 Gate 明确批准但尚未提交的必要前置文件；禁止 `git add .`，必须用显式路径 `git add -- <paths>` 并检查 `git diff --cached --name-only`。
- 对 BAM / generated 任务，commit 前必须先清理跨 app / package sprawl、无关版本 URL churn、临时 BAM 分支 pinning 和未解释 generated 扩散；只保留任务需要的真实合同变更与对应日志证据。
- 推荐提交信息：`delivery(code): task-NN <short-scope>`；若是 BAM 合同刷新任务，可用 `delivery(code): task-001 sync bam contract`。
- `05-implementation-log.md` 的 `Task Dispatch / Review Ledger` 必须记录 checkpoint commit hash；若未产生 diff，记录 `N/A (no diff)` 和原因。

### Visual Evidence Rules

- **UI Evidence Mode 分层取证**：
  - `F2C_REQUIRED`：新增页面 / 新增区域 / 新增复杂组件 / 表格整体结构 / Drawer / Modal / Popover 首次实现，必须用 `/f2c` 获取 d2c 结构证据并结合 Figma MCP 原始节点；不得凭父节点名称、截图印象或组件经验实现。
  - `RUNTIME_BASELINE_ALLOWED`：已有 UI 的局部文案、样式、显隐、交互 wiring、数据接入或设计返工，可以用 Figma / Design contract + 现有 DOM / screenshot / computed style baseline 替代 f2c；新的浏览器复核由 verify/design 完成。
  - `NO_F2C_REQUIRED`：非可见逻辑、类型、构建、接口修复或 legacy 保留，不要求 f2c，且不得借 f2c 重建旧 UI。
- **先 Visible Contract 后代码**：写代码前必须明确父容器、直接子元素、区域顺序、背景归属、分隔线、行内/块级文本、基础组件形态、交互热区和禁显残留。
- **证据冲突必须暂停**：当 `/f2c`、Figma MCP、节点截图、原页面基线或 runtime evidence 互相冲突，且影响区域结构或控件语义时，必须暂停并返回 `/delivery:plan` 或 `/delivery:design` 处理，不得按“效率优先”继续猜。

### Code Verification Rules

- **区域级即时复核**：涉及可见 UI 的区域改完后，主 Agent 必须复用现有 dev server 和当前 `Browser Runtime Mode` 对应的浏览器会话，等待 HMR / 自动编译后在同一页面复核 snapshot、DOM、computed style 和关键点击断言。
- **Task 级验证优先**：每个 Task 必须先执行 task 内声明的验证命令。非浏览器静态命令由 `code-writer` 执行；mock-debug、BAM warning 验证、真实 UI 点击和 Network 证据采集必须由主 Agent 执行。常规 `/delivery:code` Task 完成前必须执行静态类型检查，保证类型无误；由 `/delivery:design` auto-fix 派发给 `code-writer` 的 `Design Rework Task` 默认走 HMR-first / browser-first 复核，只有触发编译、runtime、类型、接口、数据结构、公共组件或证据定位风险时才升级 targeted typecheck / build / diagnostics。完整 lint / build / broader test 仍属于 `/delivery:verify` 的验证范围，不作为 code 阶段阶段级门禁。mock-debug / BAM warning 验证失败时记录重试项，不单独阻断后续 Task。
- **验收阶段不前置**：`delivery-reviewer`、交付验收和完整 design acceptance 不在 `/delivery:code` 中反复触发；code 阶段完成后只允许建议进入 `/delivery:verify`。

## Mandatory Execution Flow

以下是 `/delivery:code` command 必须引用的阶段执行清单；`code-writer` 不得按本清单接管阶段编排。必须按以下顺序执行：

1. `Use Skill: executing-plans`
   - 加载 `delivery-task.md`，并用 `04-tech-plan.md` 做上游合同校验。
   - 批判性审查计划是否足以执行。
   - 必须确认 `delivery-task.md` 包含 `### Task N:`、`code_locator:` 或等价代码定位线索、checkbox step、验证命令和预期结果；不得要求 task 产出可改动文件范围。
   - 必须检查 `PRD Logic Coverage Matrix` 是否覆盖权限显隐、推荐规则、筛选规则、列表字段、排序、创建校验、状态流转、成功跳转、下载和跨系统动作。
   - 若 PRD / Figma / 用户补充中存在业务域、页面 Tab、内容 Tab、权限身份态或 route mode，必须检查 `Business State Disposition Matrix`；每个 option 必须分类为 `CREATE_NEW_VISIBLE`、`RESTRUCTURE_VISIBLE`、`KEEP_LEGACY_VISIBLE`、`REMOVE_VISIBLE` 或 `LOGIC_ONLY`。
   - 若某 option 语义是“维持老页面 / 老状态”，计划必须标 `KEEP_LEGACY_VISIBLE` 并给出 legacy 不回归验证；若计划把它写成 `TASKIZE_SKELETON_ONLY` 或复用另一个 option 的新 UI，必须停止实现并返回 `/delivery:plan` 修复。
   - 必须检查 `Page-Level Figma Coverage Audit` 是否存在；若缺失，停止实现并返回 `/delivery:plan` 修复。
   - 必须检查所有页面级结构任务对应页面的审计结论是否为 `FIGMA_MAIN_STATE_CONFIRMED`，Plan 动作为 `TASKIZE_UI_STRUCTURE`。
   - 若某页面为 `FIGMA_PARTIAL_STRUCTURE_ONLY` 或 `BLOCKED_FOR_UI_STRUCTURE`，不得执行该页面的页面骨架、区域顺序、推荐区、筛选区、表格 / 列表布局或操作区结构任务。
   - 必须检查 `Figma / UI 改造清单` 是否覆盖顶层切换、表格 Tab、筛选项、表头、批量操作、状态 Tag、操作列和已确权容器形态。
   - 必须检查 `Switcher Impact Contract` 是否覆盖业务域 Select、页面级 Tab、内容 Tab、表格上方 Tab 等切换控件；每个 option 必须有主态证据、影响区域、状态流向和 Plan 动作。主态证据可以是 Figma，也可以是用户明确确认的原页面基线。
   - 若计划把业务域切换、页面级 Tab 或内容 Tab 写成本地 state，且没有传递到下游 region / component / store 查询参数 / BAM mock response（如适用）/ skeleton state，必须停止实现并返回 `/delivery:plan` 修复。
   - 必须检查 `Figma Region Contract` 是否逐区覆盖 fileKey、nodeId、数据来源、需 execute 提取的数据、视觉结构与顺序（区域顺序、容器层级、筛选项、推荐区、工具栏、表格列、分页和切换后下方区域变化）和验收方式；若只写“浅蓝推荐区 / 卡片 / mock / 后续视觉对齐”或缺少 nodeId，停止实现并返回 `/delivery:plan` 修复。
   - 必须检查 `Figma Interaction Contract` 是否覆盖所有可操作控件；若 `收起`、`展开`、`一键筛选`、`全部筛选`、`下载`、`自定义列`、`批量创建`、Tab、Select、Popover trigger、Modal/Drawer 按钮等只作为静态文案出现，停止实现并返回 `/delivery:plan` 修复。
  - 必须消费 `delivery-task.md` 已声明的 `UI Evidence Mode`，不得在 code 阶段重新给 task 贴 mode。只有 `F2C_REQUIRED` 缺 f2c 时才停止补证；`RUNTIME_BASELINE_ALLOWED` 必须提供现有 DOM / screenshot / computed style baseline；`NO_F2C_REQUIRED` 必须说明为什么不涉及视觉结构还原。若发现 mode 与 `04-tech-plan.md` / task 合同不一致，停止实现并返回 `/delivery:task` 或 `/delivery:plan`。
   - 若存在未关闭设计 BLOCKER，必须检查 `delivery-task.md` 是否包含对应 `Design Rework Task`。设计返工任务必须逐条列出 BLOCKER ID、目标 Figma evidence、runtime 差异、checkbox step、HMR / browser 复核点和预期结果；代码定位线索和排除业务范围如存在则作为审计提示。缺关键项停止实现。
   - 若存在关键缺口，暂停并提问；不得边实现边猜。
2. 创建或更新 `05-implementation-log.md`
   - 写入本轮允许实现范围。
   - 写入被排除的 `USER_DEFERRED_PLAN_RISK` / `PLAN_DISCOVERY` 范围。
   - 若为 mock-preview，引用 `09-test-case-matrix.md` 中的矩阵、Scope / Boundary和 `Excluded Real Integration`。
   - 引用 `delivery-task.md` 已存在的可执行任务清单。
   - 写入 `Figma / UI 执行检查清单`，逐项记录视觉稿改造点、代码落点、`UI Evidence Mode`、证据引用、执行状态和验证方式。
3. 按任务顺序串行派发并小步执行
   - 主 Agent 必须按 `delivery-task.md` 中 `### Task N` 的自然顺序派发；不得跳过未完成任务、不得并发派发多个任务、不得把后续 Task 的代码顺手并入当前 Task。
   - 每个任务开始前，主 Agent 标明目标 requirement_id、case_id/ruleId/API（如适用）、checkbox steps、代码定位线索、预期验证和验收断言。UI Task 还必须标明 `UI Evidence Mode` 和对应证据。
   - 子 Agent 负责执行当前 Task 的业务代码实现、非浏览器静态检查和代码层任务日志记录；不得生成 / 调整 BAM mock rule，不得 patch BAM marker，不得调用 `/delivery:mock`，不得执行 mock-debug / no-response warning 浏览器验证。
   - 子 Agent 不得处理主 Agent 未派发的下一个 Task；如发现必须修改后续 Task 文件或范围，返回 `NEEDS_TARGETED_REVIEW`。
   - 每个 Task 完成后，主 Agent 必须审核子 Agent 输出、真实 diff 文件、非浏览器测试结果和 `delivery-task.md` 当前 Task checkbox 勾选 delta；review 阶段基于真实 diff 判断是否影响不相干逻辑、后续 Task 或用户排除范围，不再使用 task 阶段文件范围作为可改动约束。实现 Gate Review 初步通过后，必须新开独立代码审查子 Agent 做 read-only review；涉及 UI 的 Task 必须审查 Figma 合同执行情况和 `UI Evidence Mode` 对应证据消费情况。代码实现、独立代码审查、当前 Task checkbox 勾选核对和非 mock 验收审核通过后才派发下一个 Task。若仅 mock 验证失败，审核结论可记为 `PASS_WITH_MOCK_VERIFY_RETRY` 并继续。
   - 每个涉及 UI 的任务必须同时标明对应 Figma 事实或 `P1 未确权` 原因。
  - **F2C-First Visual Implementation Protocol**：每个已在 task 中声明为 `F2C_REQUIRED` 的任务，在实现 UI 代码前，必须先执行以下步骤：
     1. 从 `delivery-task.md` 和 `04-tech-plan.md` 读取该任务对应区域的 `fileKey`、`nodeId`、`figma_state_scope` 和验收断言。
     2. 优先调用 `/f2c` 系列能力对应的 `get_d2c_json(figma_url)` 或 `get_d2c_result(figma_url)`，把 Figma 节点转换为可实现的结构证据；复杂页面骨架、筛选区、推荐区、工具栏、表格、Drawer / Modal / Popover 默认至少需要 `get_d2c_json`。
     3. 将当前 Task 实际消费的 d2c MCP 返回产物存储到 `code-review/d2c-evidence/task-<task-id>/`，至少包含必要 JSON / result / preview / screenshot 和短 manifest；manifest 记录 `task_id`、`nodeId`、产物路径和提取的关键结构摘要。
     4. 同步调用 Figma MCP `get_figma_data(fileKey, nodeId, depth)` 获取原始 layout / visual / typography / state 数据；Figma MCP 是原始事实来源，`/f2c` 是结构翻译来源，两者冲突时必须回看节点截图或导出图，不能主观二选一。
     5. 写代码前必须形成区域 Visible Contract：父容器、直接子元素、区域顺序、背景归属、分隔线、行内/块级文本、基础组件形态、交互热区、禁显残留。
     6. 对复杂单元格（头像、主副文本、tag、热区、hover、popover、空态），必须读取 `Figma Cell Contract` 或列表样式总表，并用 `/f2c` / Figma MCP 返回的子节点结构校验。
     7. 结构证据不足、样式细节不确定、基础组件选型、真实交互和可见 UI 复核要求，统一按 `.trae/agents/code-writer.md` 的 `Universal Coding Standard` 执行，并在 `05-implementation-log.md` 记录证据来源。
     8. 完成代码后把区域顺序、direct children、computed style、关键按钮/输入/标签语义和点击后状态写成 verify 复核点；Code 阶段不打开浏览器。
   - 实现 agent 的 Implementation Report 必须包含 `UI Evidence Usage`，逐项说明当前模式、使用证据、落实到哪些文件和结构；缺该表时主 Agent Gate Review 不得通过。
   - `F2C_REQUIRED` 任务必须按 `Figma Region Contract` 完成首轮结构级样式还原，包括文案顺序、容器层级、主要间距、尺寸、圆角、边框 / 背景、按钮位置和基础组件形态；`RUNTIME_BASELINE_ALLOWED` 任务只需闭合本次局部差异和运行态复核断言。
   - 每个可操作控件必须按 `Figma Interaction Contract` 和 `code-writer` 的通用真实交互规则闭合。
    - 每个任务完成后由子 Agent更新代码执行记录；已有 rule 的补充需求只写入矩阵同一行 `补充说明`。
   - 涉及 adapter / Test Fixture Mock / 临时代码的登记要求按 `code-writer` 执行；`MOCK_PREVIEW` 下运行时 BAM mock 只能引用 `/delivery:mock` 产物。非 `MOCK_PREVIEW` 下缺少 BAM mock 产物不得阻塞 code，真实接口或数据问题按真实失败类型处理。
    - 若目标 BAM wrapper疑似丢字段，子 Agent只在对应矩阵行 `补充说明` 记录问题和证据。Code不判断 patch是否成立。
   - 历史 `MOCK_CHECKPOINT_REQUIRED`、`MOCK_VERIFY_RETRY_REQUIRED` 或 `Pending BAM Mock Runtime Generation` 记录只作为兼容输入保留给 verify 归一化消费；新 Code 执行不得产生这些状态。
4. 执行任务级验证
   - 每个 Task 必须先执行该 Task 声明的非浏览器测试 / 验收命令，无法执行必须说明原因。mock-debug、BAM warning、真实 UI 点击和 Network 证据采集移交 verify。
   - 常规 `/delivery:code` Task 完成前，子 Agent 必须执行静态类型检查（优先使用 task 声明或仓库最小 typecheck 命令），确保类型无误；无法执行时必须说明原因和替代证据。`Design Rework Task` 由 design auto-fix 派发时，静态类型检查不作为默认固定成本；按 HMR-first / browser-first 复核，触发升级条件时再执行 targeted typecheck / build / diagnostics。
5. 阶段收口
   - 汇总已改文件、未完成项、待验证项；已执行 / 已放行的每个 Task 或 handoff 必须在 `05-implementation-log.md` 的集中 `## 待验证项` 清单中有对应条目，或明确写 `N/A` 及依据。
   - 汇总每个 Task 的 dispatch / review / verification 状态；存在代码审查、非浏览器验证或待验证项覆盖结论为 `BLOCKED` / `NEEDS_TARGETED_REVIEW` 的 Task 时不得收口。
   - 汇总每个已放行 Task 的 checkpoint commit hash；任何已放行但未提交且仍有 diff 的 Task 必须先补本地 checkpoint commit，才能继续阶段收口或派发后续 Task。
    - 确认 BAM矩阵核对完成，补充需求已写入对应行 `补充说明`；这些项不阻塞 Code收口。
   - 在 `05-implementation-log.md` 的 `Task Dispatch / Review Ledger` 中记录每个 Task 的静态类型检查命令、结果和无法执行原因。
   - 只允许建议进入 `/delivery:verify`，不得自行进入交付验收。

## Implementation Rules

- 通用编码规范统一以 `.trae/agents/code-writer.md` 的 `Universal Coding Standard` 为准；本节只保留 `/delivery:code` 阶段编排和 Task N 特有规则。
- `MOCK_PREVIEW` 下发现 BAM mock数据需要补充时，只允许更新矩阵对应行 `补充说明`；不得写 `delivery-mock.md` 或调用 `/delivery:mock`。
- 禁止绕过 `executing-plans` 直接开始 `/delivery:code` Task N 修改。
- 禁止在 `/delivery:code` 阶段把摘要型技术方案临时改写成执行任务；任务必须来自 `delivery-task.md`。
- 禁止在 `/delivery:code` 阶段直接根据 `07-design-alignment.md`、截图或口头描述发明设计返工任务；设计 BLOCKER 必须先物化为 `delivery-task.md` 的 `Design Rework Task`。若来源是 `/delivery:design` auto-fix，该物化应由 design 阶段内完成并随即派发 `code-writer`，不要求先中断回 `/delivery:task`。
- 禁止在 Mock Preview Mode 下真实调用未确认后端或跨系统能力。

## Figma / UI Execution Gate

若 `04-tech-plan.md` 缺少 `Page-Level Figma Coverage Audit`，必须停止实现并返回 `/delivery:plan` 修复计划。

若页面存在业务域、页面 Tab、内容 Tab、权限身份态或 route mode，但 `04-tech-plan.md` 缺少 `Business State Disposition Matrix`，必须停止实现并返回 `/delivery:plan` 修复计划。

若 `Business State Disposition Matrix` 未逐项覆盖所有 option，或没有把每个 option 分类为 `CREATE_NEW_VISIBLE`、`RESTRUCTURE_VISIBLE`、`KEEP_LEGACY_VISIBLE`、`REMOVE_VISIBLE`、`LOGIC_ONLY` 之一，必须停止实现。

若某 option 被标为 `KEEP_LEGACY_VISIBLE`，但任务没有保留旧页面 / 旧状态的代码路径、可见 UI 范围和不回归验证，必须停止实现。禁止把 legacy option 渲染成另一个新增 option 的同款 UI。

若 `Page-Level Figma Coverage Audit` 显示某页面为 `FIGMA_PARTIAL_STRUCTURE_ONLY`、`Plan 动作 = BLOCKED_FOR_UI_STRUCTURE`，或证据描述为 `PRD + wiki 为主` / `完整 Figma 主态未补抓`，禁止执行该页面的结构实现任务。该问题不得在 `/delivery:code` 阶段用现有组件拼装解决。

若 `03-prd-analysis.md` 或 `prd-figma-supplement.md` 中存在已确权 UI 主态，但 `04-tech-plan.md` 缺少 `Figma / UI 改造清单`，必须停止实现并返回 `/delivery:plan` 修复计划。

若页面存在业务域切换、页面级 Tab、内容 Tab 或表格上方 Tab，但 `04-tech-plan.md` 缺少 `Switcher Impact Contract`，必须停止实现并返回 `/delivery:plan` 修复计划。

若 `Switcher Impact Contract` 未说明切换状态如何影响下方区域、BAM mock response（如适用）、store 查询参数、筛选配置、表格列、推荐区、legacy 原页面基线或 skeleton，必须停止实现。禁止把切换控件实现为仅改变标题旁 Select 文案的本地 state。

若 `FIGMA_MAIN_STATE_CONFIRMED` 页面缺少 `Figma Region Contract`，必须停止实现并返回 `/delivery:plan` 修复计划。只通过 build、grep、接口 / BAM mock 数据检查，不足以证明页面结构实现完成。

若 `FIGMA_MAIN_STATE_CONFIRMED` 页面 `Figma Region Contract` 未逐区写明 fileKey、nodeId、数据来源、需 execute 提取的数据、视觉结构与顺序和验收方式，必须停止实现并返回 `/delivery:plan` 修复计划。

若 `FIGMA_MAIN_STATE_CONFIRMED` 页面存在可操作控件但缺少 `Figma Interaction Contract`，或 contract 未逐项写明触发前状态、触发动作、触发后状态、Code 执行断言和 Verify 点击断言，必须停止实现并返回 `/delivery:plan` 修复计划。禁止将 `收起`、`展开`、`一键筛选`、`全部筛选`、`下载`、`自定义列`、`批量创建` 等实现为静态文本。

`ui-source-map.md` 不是 `/delivery:code` 的实现输入。代码执行阶段只消费 `04-tech-plan.md`；如果需要回查证据，只能用于解释为什么返回 `/delivery:plan` 修复，不得直接从 `ui-source-map.md` 补写实现任务。

若 `04-tech-plan.md` 有清单但遗漏以下已确权项，也必须停止实现：

- 顶层切换按钮 / 业务域切换 / 标题旁选择器。
- 页面或表格 Tab。
- 表格上方筛选项与输入占位。
- 筛选项 / 表单项的基础组件选型，例如 Auxo `Select`、`Input`、`Button`、`DatePicker`。
- 表头列顺序、状态 Tag、操作列文案。
- 批量操作按钮、下载 / 导出、只看我创建。
- Modal / Drawer / Popover 等承载形态。

若存在未关闭设计 BLOCKER，但 `delivery-task.md` 缺少 `Design Rework Task`，必须停止实现并返回 `/delivery:task` 或 `/delivery:design` handoff。

`Design Rework Task` 必须满足：

- `Blocks:` 明确列出 BLOCKER ID。
- `code_locator:` 或等价代码定位线索明确；`excluded_scope:` 或等价排除项说明不属于当前返工的业务范围。不得把 task 产物写成可改动文件范围约束。
- Steps 能被 `executing-plans` 直接执行。
- 验证覆盖对应 BLOCKER 的 DOM 文案、组件结构、截图复检或命令检查。
- 不扩大到未被 BLOCKER 覆盖的 UI / 业务逻辑。

允许继续实现的条件：

- 已确权 UI 项均已成为具体执行任务。
- 未确权 UI 项已登记为 `P1_RISK`、`mock / skeleton` 或明确排除范围。
- `05-implementation-log.md` 已写入对应执行检查清单。
- Code diff 满足 `code-writer` 的基础组件优先规则；若需要自绘已有基础组件，必须先返回 `/delivery:plan` 补充自绘理由和验收方式。

## Required Outputs

必须更新：

- `05-implementation-log.md`
- `decision-log.md` 如有实现取舍
- `09-test-case-matrix.md` 的 `补充说明`（仅需要补充时）

运行态说明：

- `.trae/DELIVERY_STATE.md` 是本地状态机缓存，不属于本 skill 的交付产物。
- `code-writer` 不得直接修改 `.trae/DELIVERY_STATE.md` 或 `delivery-mock.md`。

## Output Contract for 05-implementation-log.md

必须包含：

1. 实现范围。
2. requirement_id 到代码文件映射。
3. 已修改文件。
4. 每个文件的改动原因。
5. `Figma / UI 执行检查清单`，逐项记录 `UI Evidence Mode`、实现证据引用和 verify 复核点。
6. `Task Context Index`：可内联或引用 `code-review/context-index.md`，记录每个 Task 的 requirement/case/rule/API、合同引用、UI Evidence Mode、Mock / Real 边界、required commands 和 stop conditions。
7. `Task Review Packet` 引用：每个已实现 Task / handoff 指向内联审查包或 `code-review/task-<task-id>-review-packet.md`，并记录 `targeted_diff`、mechanical checks、verification freshness 和 packet sufficiency。
8. `Task Dispatch / Review Ledger`：每个 Task / handoff的派发输入、实现 agent执行结果、`delivery-task.md` checkbox勾选核对、独立代码审查结论、`ui_evidence_fit`、非浏览器测试命令、BAM矩阵核对结果、主 Agent最终审核结论和下一步。
9. `09-test-case-matrix.md` 的 BAM矩阵、Mock Preview Scope / Mock / Real Boundary引用（若启用）。
10. `Excluded Real Integration`（若启用）。
11. 临时代码登记。
12. 未完成项。
13. 待验证项。
14. 下一步验证命令。

## Gate

实现完成后只允许进入 `/delivery:verify`。

Final前只检查：当前 Task需要的 rule在 BAM矩阵中存在；需要补充时已更新 `补充说明`。
