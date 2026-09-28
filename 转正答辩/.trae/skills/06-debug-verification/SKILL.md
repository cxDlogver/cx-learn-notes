---
name: debug-verification
description: 调试验证。用于执行 lint、typecheck、test、build、mock-debug、integration-debug、debug 代码检查和失败根因分析。
---

# Debug Verification

## Purpose

把“代码写完”变成“代码经过验证”。验证失败时必须定位根因并回到实现或暂停提问。运行时环境、dev server、HMR、命令和日志可以由 `runtime-runner` 辅助，但 verify case 判断始终由主 Agent 负责。

本文件是 `/delivery:verify` 的唯一详细规则来源；命令入口和 `.trae/AGENTS.md` 只保留必读输入、全局门禁与项目专属启动约束，不应重复维护本文件中的 case 执行、证据对账、效率优化或 auto-fix 细则。

## Mandatory Precheck

必须读取：

- `.trae/AGENTS.md`
- `.trae/PROJECT_CONTEXT.md`
- `.trae/DELIVERY_STATE.md`
- 当前 workspace 下的 `04-tech-plan.md`
- 当前 workspace 下的 `delivery-mock.md`（当 `Implementation Mode: MOCK_PREVIEW` 且已存在）
- 当前 workspace 下的 `05-implementation-log.md`
- 当前 workspace 下的 `09-test-case-matrix.md`
- 本 skill 目录下的 `debug-verification-case-result.template.md`
- 本 skill 目录下的 `debug-verification-report.template.md`

如果没有代码实现记录，必须暂停，不得伪造验证结果。

## Verify Mainline

Verify 阶段只保留一条主线：主 Agent 串行拥有 case，Subagent 只做运行时、命令、日志或机械证据辅助。

本阶段必须遵守 `.trae/AGENTS.md` 的 `Shared Case Evidence Closure Protocol`。共享协议只统一 case 队列、证据字段、detour 恢复和归档语义；verify 的阶段专属职责仍是运行态、交互、Network、命令和 mock / integration 事实，不得把 runtime source 写成 Figma-vs-Runtime 视觉对齐结论。

1. **Pending Verification Merge Audit**：先读取 `05-implementation-log.md` 的集中 `## 待验证项`，逐条映射到 `09-test-case-matrix.md` 的 case；映射成功的待验证点必须并入对应 case 的执行焦点和证据对账。映射失败或发现 matrix 断言缺口时，直接进入 `Test Case Completion Detour`，按 `test-case-planning` 规则受限补全 `09-test-case-matrix.md`。该审计一旦完成，必须立即增量写入 `06-debug-verification.md` 的 `## Pending Verification Merge Audit`。未落盘前不得进入 `Build Case Queue`。
2. **Build Case Queue**：从 `09-test-case-matrix.md` 选取 `verification_stage = verify / verify+design / verify+accept` 的 case，并包含 Pending Verification Merge Audit 命中的所有 verify 相关 case；`MOCK_VERIFY_RETRY_REQUIRED` / `PASS_WITH_MOCK_VERIFY_RETRY` 对应 case 优先；其余 case 按 `case_batch_key`（route / page / sample / auth state / mock rule / shared setup）分组排序，在组内保持 matrix 顺序。队列建立后，必须从 `debug-verification-case-result.template.md` 为每个 case 初始化 `verify-logs/case-results/<case_id>.md`，按原字段初始化 Ledger，并仅在 Case Result Index 写入稳定相对路径；初始化时必须为该 case 的每个 `positive_assertion`、`negative_assertion`、`visual_assertion`、`negative_visual_assertion` 和 `evidence_required:<type>` 预建 `Assertion` 记录，并把复合断言拆成最小可独立判断的 `acceptance_item` 行。未创建 case 文档、未建立索引、仍保留模板占位行、或复合断言仍是单行泛化描述时，不得进入 Preflight、baseline 或首个 case。
3. **Preflight**：在 Pending Verification Merge Audit 和 Build Case Queue 已落盘后，再确认 `.trae/DELIVERY_STATE.md` 的执行仓库、Node / 依赖、本地服务、vmok 壳 URL、浏览器能力、SSO 状态；只处理环境与入口可用性，不采集带业务断言含义的运行态证据。完成后增量更新 `06-debug-verification.md` 的 `## Summary` 和 `## Environment / Baseline Checks`，至少写入 execution repo、vmok URL、browser runtime fields 和当前阶段状态；未落盘前不得视为 Preflight 完成。
4. **Run Baseline Checks**：主 Agent 在本地终端优先执行或说明无法执行 lint、typecheck、unit test、build、mock-debug、integration-debug、debug 代码检查和改动范围检查；不得把整组 baseline 当作默认 subagent 批处理。只有单条命令、dev server / HMR / 日志或 health check 需要隔离执行时，才可派 `runtime-runner`；执行结果写入 `baseline_snapshot`，供后续增量复验复用。每个 baseline 维度完成后必须立即回写 `## Environment / Baseline Checks`；整组 baseline 未落盘时不得宣称 baseline 已完成。
5. **Execute Cases**：逐 case 消费 `contract_ref`、`positive_assertion`、`negative_assertion`、`visual_assertion`、`negative_visual_assertion`、`evidence_required`，并覆盖已合并的 code 阶段待验证点；同一页面、登录态、mock rule、操作路径、截图或 DOM snapshot 可复用，但每个 `assertion_ref` 必须有独立 evidence mapping。一次验证对应一个断言；复合断言保持一个 `assertion_ref`，并在该断言覆盖表中列出可独立判定的 `acceptance_item` 行，分别记录 `observed_value`、`evidence_ref` 与 `coverage_result`。`evidence_requirement_id` 只由 `case_id + assertion_ref` 派生，不得由 `acceptance_item` 派生。每个 case 结束、暂停或进入 detour 前，必须先完整更新其 `verify-logs/case-results/<case_id>.md`，执行 `evidence_ref` 持久化校验，再同步 `06-debug-verification.md` 的 Ledger、Case Result Index、Case Evidence Coverage Audit、截图 / Evidence 索引、缺口表、Failures / Detours 和 Gate 状态。
6. **Triage Failures**：失败时先查代码路径，再查接口 / 数据 / 样本 / mock；代码问题进入 code auto-fix detour，`MOCK_PREVIEW` mock 问题进入 `/delivery:mock` detour；非 `MOCK_PREVIEW` 下若基础真实链路或接口合同已明确且仅缺样本 / 状态覆盖，可按 `SAMPLE_COVERAGE_GAP` 进入受控 `/delivery:mock` 临时构造样本补充取证。
7. **Gate**：全部必需 case、Pending Verification Merge Audit、基线检查、各 case 文档及 `06-debug-verification.md` 的全局 `Case Evidence Coverage Audit` 均通过，且所有全局表格与 case 文档一致，才允许进入 `/delivery:design`；非阻断 notes 必须有明确分类和可审计证据。Gate 判定前必须先更新所有 case 文档，再刷新 `06-debug-verification.md` 的全部派生表和 Gate Recommendation；任何“case 已完成但文档或全局表格未更新”的情况一律按未完成处理。

### MTR Mode (`--mtr`)

`--mtr` 表示 Mock-To-Real Recheck，只能在当前 workspace 为 `Implementation Mode: MOCK_PREVIEW` 时使用；否则必须判定 `INVALID_ARGUMENT / MTR_REQUIRES_MOCK_PREVIEW`。它不是继续验证 mock 数据，而是在 mock-preview 代码已完成后，把需要真实环境回收的 case 拉出复测。

执行要求：

- 先建立 `MTR Real Recheck Queue`：从 `09-test-case-matrix.md` 的 `Mock / Real Boundary`、`real verify` 列、`delivery-mock.md` 的 real verify 回收项以及既有 verify / design notes 中抽取待复测 case；每行至少记录 `case_id`、API / ruleId、真实断言、mock 清理要求、安全分类和预期证据。
- 跑任何真实读链路、安全可写链路或浏览器安全拦截前，必须先对目标 app 执行 `bam update` 清理 BAM 数据 mock：优先使用目标 app 的 `bam` 脚本，或等价 `npx bam update --remove-folder` 重新生成 `src/bam/**`。当前项目若目标 app 为 `apps/alliance-operation-content`，标准命令是 `pnpm --dir apps/alliance-operation-content bam`。
- MTR 产物必须直接追加到现有验证产物，保留 mock-preview 下的历史 mock 证据，并把本次真实复测动作、真实证据和真实结论追加记录到现有验证文档。
- 不得覆盖 mock-preview 下的验收证据：既有 `mock_handling`、`[BAM_MOCK_HIT]` 解析、mock Evidence Reconciliation、截图 / Network 证据和历史 case `final_result` 必须保留；MTR 只能在现有验证产物上追加本次真实复测结果，不得覆写原 mock-preview 证据。
- 跑真实读链路或安全可写链路前，还必须去掉会返回 mock 数据的运行环境：移除 URL mock-debug 参数；BAM 数据 mock、`synthetic_contract`、`sample_coverage_synthetic` 与 mock `lark_url` 需通过前述 `bam update` 清理。默认 / no-hit 只能 pass-through 到真实响应。包含 `[BAM_MOCK_HIT]`、`mockedResponse`、synthetic response 的证据不得作为 MTR real pass。
- 在真实环境复测时，证据必须来自真实 host / vmok 页面、真实 Network request / response、真实打开资源、真实 DOM / screenshot 或 DA / 表格平台等真实系统回执；缺真实响应时只能分类为 `API_ISSUE`、`DATA_ISSUE`、`ENV_ISSUE` 或 `PASS_WITH_NOTES`。不得再把“已按安全要求拦截的高风险写接口”单独记为阻塞型 `SAFETY_BLOCKED`。
- 有安全风险的写接口仍禁止真实写入后端，除非本 case 已有明确测试数据、测试环境和授权。未授权时必须使用浏览器层 mock / route 拦截阻止请求离开浏览器上下文，并记录 `safety_intercept=true`、被拦截 method/path、脱敏 request 摘要和 `backend_write=not_sent`；该证据关闭 no-call / 安全保护断言，MTR 结论统一记为 `PASS_WITH_NOTES`。真实持久化、事务成功、发奖成功、导出成功、回滚 / 重试 / 后端审计未被证明时，必须写入 `remaining_real_gap`，并明确该 gap 是安全策略导致的非阻塞 note，不得作为继续交付或进入后续阶段的 blocker。
- MTR Queue 全部闭合、完成 `bam update` 且确认无 active 数据 mock 后，才允许在 `06-debug-verification.md` 和 `.trae/DELIVERY_STATE.md` 将当前运行环境标签从 `MOCK_PREVIEW` 更新为 `REAL_ENV_VERIFIED / 真实环境`。不得重写 `04-tech-plan.md` 或 `09-test-case-matrix.md` 中作为历史事实的 `Implementation Mode: MOCK_PREVIEW`；若剩余 gap 仅为已按浏览器层安全拦截处理的高风险写接口真实副作用未验证，应保留 `PASS_WITH_NOTES` 与 `remaining_real_gap`，不得因此阻塞阶段继续；若仍有非写接口真实读链路、DA / 表格平台、权限、样本或环境未复测项，必须保留待复检 notes 和相应 Gate 限制。

## Report Format

`06-debug-verification.md` 固定结构见同目录 `debug-verification-report.template.md`；初始化或修正 `06-debug-verification.md` 时必须以该模板为阶段报告骨架，只填充行数据和阶段状态，不得重定义核心章节或表头。`Case Results` 正文迁移到 `verify-logs/case-results/<case_id>.md`，并在原位置使用 `Case Result Index` 定位。单 case 文档格式以 `debug-verification-case-result.template.md` 为准。

格式门禁：

- 每个 case 必须有且只有一个 `verify-logs/case-results/<case_id>.md`；`case_result_ref` 必须使用 `[<case_id>](verify-logs/case-results/<case_id>.md)` 可点击相对链接。
- 除 `Case Results` 被替换为 `Case Result Index` 外，其余既有章节、表名、表头和职责不得改动；全局表格从单 case 文档派生并持续增量更新。
- `Verify Case Ledger.owner` 对 case 只能写 `main-agent`；Subagent 辅助只能进入 evidence 摘要或 detour。
- mock 命中、mock 修复、auto-fix 和复验结论写入对应 case 文档，同时按既有字段更新 `06-debug-verification.md` 的汇总表。
- 若某阶段动作已执行但对应章节尚未更新，该阶段不得宣称完成；Gate 前必须先补写并标记失效 / 更新时间。

## Ownership Boundaries

主 Agent 必须：

- 自行读取验证输入、建立 Verify Case Queue、执行每个 case、维护独立 case-result 文档与 `06-debug-verification.md` 定位索引并做 Gate 判断。
- 亲自完成浏览器点击、DOM / screenshot、Network 证据、`[BAM_MOCK_HIT]` 解析、BAM warning 验证、mock-debug、integration-debug 和 `/delivery:mock` detour。
- 对每个 case 的最终结果负责；当前 case 证据闭合后才能进入下一个 case。
- 亲自解释 `runtime-runner` 返回的 dev server、HMR、命令或日志证据；不得把辅助摘要直接当作 case closure。
- 在 `CODE_ISSUE` / `TYPE_ISSUE` / `BUILD` 满足 handoff 条件时，先写 `code-fix-handoff.md`，再进入受限 `/delivery:code` 单点修复，修复后复用同一 dev server 和浏览器会话复验当前 case。
- 在 `MOCK_PREVIEW` 下遇到 `MOCK_ISSUE` 时，直接调用 `/delivery:mock`，传入失败 case、origin_stage=`verify`、resume_point、自然触发动作、预期 / 实际 rule、request / response 合同和受影响范围；BAM mock 审查通过后恢复当前 verify。
- 在非 `MOCK_PREVIEW` 下，只有当失败分类为 `SAMPLE_COVERAGE_GAP` 且接口 method/path、请求字段、响应字段或枚举语义已通过技术文档 / BAM / IDL / generated types / 代码消费链路 / 至少一条同接口真实请求证据明确时，才允许调用 `/delivery:mock`。该 detour 只可临时构造样本并补充 hover / 状态 / 视觉截图证据，必须同步传入 `base_contract_evidence`、`supplemental_assertions`、`forbidden_contract_assertions`、`mock_debug_param` 和 `cleanup_required=true`；不得用 mock 覆盖真实 request / response 字段值验证，也不得宣称真实后端已返回该状态。

Subagent 只能：

- 仅在主 Agent 需要隔离运行时噪音或当前工具无法稳定采集某一条明确的非浏览器证据时，执行一条被点名的非浏览器命令、dev server / HMR / health check、单个日志摘要、单个只读证据点或文档保存。
- 返回命令结果、文件读取摘要、候选失败分类和建议下一步。
- 在主 Agent 已生成 `code-fix-handoff.md` 且满足 Code Fix Handoff Protocol 时，由 `code-writer` 通过受限 `/delivery:code` 或当前 verify detour 做单点修复。

Subagent 禁止：

- 执行整个 verify 阶段、单个 case 或 case 集合。
- 执行浏览器点击、DOM / screenshot / Network 取证、BAM warning 验证、mock-debug / integration-debug 的 UI 运行态验证。
- 把 `lint/typecheck/test/build/check_no_debug_code/check_changed_files` 作为三个或多个并行 baseline 任务默认派发。
- 在脚本、命令或输出口径已明确时擅自改跑“看起来等价”的替代命令；例如 `verify_frontend.sh` 缺失时，不能自行改成 `pnpm lint && pnpm test && pnpm build` 后宣称已覆盖同一检查。
- 在执行器本身异常（如 `trae-sandbox: command not found`）时，通过更换 subagent 或不同包装环境制造口径不一致的 baseline 结论。
- 触发 `/delivery:mock`，或关闭 case，或宣布进入下一阶段。

## Runtime Runner Delegation Gate

运行时和 baseline 检查采用 `main-agent local-first`：

1. 主 Agent 先在当前 execution workspace 的可用终端直接执行目标命令或脚本。
2. 只有当主 Agent 需要隔离长日志 / 运行时噪音，或当前工具确实无法稳定采集某一条明确命令、dev server / HMR、端口归属、health check 输出时，才允许把该**单项任务**定向委派给 `runtime-runner`。
3. 如果目标脚本不存在、路径不对、权限不足、执行器包装损坏或命令协议未闭合，主 Agent 必须把该项记为 `SCRIPT_MISSING`、`ENV_ISSUE`、`TOOL_LIMITATION` 或 `NOT_APPLICABLE`，不得让 subagent 自行推断替代命令。
4. baseline 的“必做项”指校验维度必须覆盖，不代表必须通过 subagent 凑齐形式上的命令数量。
5. `runtime-runner` 默认不得操作当前 `Browser Runtime Mode` 下的浏览器。只有主 Agent 明确提供单步机械采集目标和“只采证不判定”的边界时，才允许辅助采集；任何 case 判定仍由主 Agent 完成。

## Verify Efficiency Protocol

效率优化只能减少重复探索和重复命令，不能降低 case 证据门禁。任何复用都必须在 `06-debug-verification.md` 中记录复用来源、适用范围和失效条件。

### Case Queue Batching

- `补充说明` 不改变 Case Queue顺序，只在执行对应 case时读取。
- 普通 case 允许按 `case_batch_key` 分组排序：`route`、`page`、`sample_id`、`auth_state`、`mock_rule_id`、`shared_setup`、`browser_state`。同一 batch 内可复用登录态、页面入口、筛选条件、Network 监听窗口和截图缓存。
- batch 只服务执行效率，不改变逐 case closure：当前 `active_case_id` 失败时必须先完成 detour / 修复 / 复验 / 归档，不能跳过失败 case 去跑同 batch 的后续 case。
- 若复用的页面状态与当前 case 要求不匹配，必须重建状态或标记 `state_mismatch`，不得用同一截图 / DOM / Network 泛化关闭多个 case。

### Baseline Snapshot And Incremental Rerun Policy

阶段开始时生成 `baseline_snapshot`，至少记录：

| 字段 | 要求 |
|---|---|
| `command_id` | lint / typecheck / test / build / mock-debug / integration-debug / debug_code_check / changed_files_check |
| `command` | 实际执行命令或脚本名 |
| `status` | PASS / FAIL / NOT_APPLICABLE / TOOL_BLOCKED |
| `exit_code` | 命令退出码或 N/A |
| `evidence_ref` | 持久化日志 / JSON / Markdown 路径，或已落盘的无法执行原因记录；不得只写自然语言摘要 |
| `scope` | full / targeted / case-specific |
| `valid_for` | 适用 case / batch / all |
| `invalidated_by` | 会使该 snapshot 失效的文件范围或失败类型 |

浏览器环境快照必须在 `Environment / Baseline Checks` 或等价位置记录：

| 字段 | 要求 |
|---|---|
| `browser_runtime_mode` | `TRAE_DESKTOP` / `COCO_CLI_HEADLESS` |
| `browser_tool` | `integrated_browser` / `playwright_chromium_headless` / `chrome_devtools_headless` / 其他实际工具名 |
| `headless` | `true` / `false` |
| `browser_profile_or_state` | Profile 或 storage state 路径；不得记录 cookie / token 原文 |
| `network_evidence_level` | 是否可采集 URL / method / status / request 摘要 / response 摘要 |
| `sso_result` | `business_page` / `sso_blocked` / `auth_reused` / `tool_blocked` |

Incremental Rerun Policy：

- code auto-fix 后默认只重跑 `code-fix-handoff.md` 中的 `required_commands`、受影响 `active_case_id` 和被修复文件直接关联的证据项。
- 以下情况必须升级重跑 broader lint / typecheck / build / related test：改动公共组件、shared util、BAM types、service / adapter、路由入口、构建配置、类型声明、依赖配置，或 baseline 已经 `FAIL / TOOL_BLOCKED / stale`。
- 若未触发升级条件，不得伪称“全量 build/test 已重跑”；报告必须写 `baseline_reuse_reason` 和 `broader_rerun_reason: not triggered by policy`。
- 阶段 Gate 前，所有 baseline 维度必须有 PASS、NOT_APPLICABLE、TOOL_BLOCKED 或明确的风险分类；不得把缺失命令记录为空白。

### Browser And Evidence Reuse

- 必须复用当前 dev server、vmok URL、浏览器 session / Profile、Network 监听和 `browser-verify-runbook.json`；只有端口归属错误、Profile 失效、页面卡死或 SSO 状态不可恢复时才重启。
- 同一 Network capture 可以服务多个 case，但每个 case 的 `evidence_ref` 必须能定位到具体 request id / URL / method / status / payload 摘要，不能只写“同上”。
- 同一截图可以作为多个 case 的 runtime source，前提是截图状态与每个 case 的断言状态匹配；报告必须为每个 case 单独写 `observed_value` 与 `coverage_result`。
- 长日志、重复点击轨迹和大 DOM 只放 Appendix；主报告保留 evidence mapping、关键 observed value、失败分类和 Gate 结论。

## Failure Triage Order

当 case 结果与合同不一致，或出现 `PASS_WITH_NOTES` / `NEEDS_TARGETED_REVIEW` / limited behavior / “疑似接口未返回字段”时，主 Agent 不得先用宽松口径收口，必须按固定顺序排查：

1. **先检查代码实现**：回读当前 case 直连的 component、store、service、adapter、type/model、路由入口，确认 UI 是否消费相关字段、条件分支是否接线、是否存在本地固化数据或只做摘要级渲染。
2. **再检查接口 / 样本**：只有代码路径确认前端具备能力或明确依赖某字段后，才检查 Network、mock manifest、真实 response、样本 author_id / task_id、权限和数据闭合。
3. **按根因修复或分流**：代码名下问题必须立即走 `code-fix-handoff.md` -> 受限 `/delivery:code` -> 保存 -> 复验当前 case；接口、数据、权限、真实 response 不完整或 mock 规则未命中，分别按 `API_ISSUE` / `DATA_ISSUE` / `MOCK_ISSUE` 处理；若基础真实链路或接口合同已明确但当前样本无法覆盖目标 hover / 状态 / 可见分支，只能分类为 `SAMPLE_COVERAGE_GAP`，并走临时 mock 样本补充取证，不得改写为 `API_ISSUE` 或 `PASS_WITH_NOTES`。

执行约束：

- 未完成代码核对前，不得把异常直接归因为“后端没返回”、“样本不对”或“limited behavior 合理”。
- 字段已存在于真实 response、generated types、model 或 adapter，但 UI 未消费、hover / tooltip 未渲染、分支未接线，必须归类为 `CODE_ISSUE / MISSING_CONSUMPTION`，不得写成 `PASS_WITH_NOTES`、`REAL_READY_LIMITED` 或“字段未到位”。
- 涉及 `PASS_WITH_NOTES` 的 case 必须按 case-result 模板写待复检项；任何已知运行态 UI / DOM / screenshot / computed style 不一致都不得用 notes 收口。
- 只要运行态证据已经能判断 UI 事实，且结果与当前 case 断言、code 阶段待验证项或已实现合同不一致，必须归类为 `CODE_ISSUE` 并生成 `code-fix-handoff.md`；只有纯 Figma 目标差异、且运行态事实本身已正确记录但 verify 阶段无法判定设计合同真伪时，才允许留给 `/delivery:design`。
- `REAL_READY_LIMITED` 只能在真实接口 / BAM 合同确实缺字段、代码核对确认无漏消费、且计划中预先声明 limited behavior 时使用。
- 浏览器异常、DOM 缺失、hover 未出现、Drawer 未关闭、表格字段不全、tooltip 文案错位只是运行态信号，不是根因结论。
- 若静态代码、接口返回和运行态证据互相矛盾，当前 case 至少标记 `NEEDS_TARGETED_REVIEW`，不得直接判 `PASS`。

## Main Agent Gate Review

主 Agent 只输出和审查高信号内容：

- Verification Report 的 Summary、Commands、Verify Case Ledger、Case Evidence Coverage Audit、Case Result Index、Runtime Screenshot Evidence Index、Evidence Index、Failures / Detours、Gate Recommendation，以及索引指向的单 case 文档。
- 失败分类是否为 `CODE_ISSUE`、`TYPE_ISSUE`、`ENV_ISSUE`、`API_ISSUE`、`DATA_ISSUE`、`DESIGN_ISSUE`、`SAMPLE_COVERAGE_GAP` 或 `UNKNOWN`。
- `Pending Verification Merge Audit` 是否覆盖 `05-implementation-log.md ## 待验证项` 的全部非 `N/A` 条目；每条待验证项是否映射到一个或多个 `09-test-case-matrix.md` case，并在对应 case 的 evidence mapping 中完成验证。
- `09-test-case-matrix.md` 中 `verification_stage = verify / verify+design / verify+accept` 的 case 执行结果。
- 每个已执行 case 是否消费 `contract_ref`、`positive_assertion`、`negative_assertion`、`visual_assertion`、`negative_visual_assertion`、`evidence_required`，尤其是三契约防漏字段的反向断言和视觉正 / 负向断言。
- `Case Evidence Coverage Audit` 是否逐 `case_id + assertion_ref` 映射全部断言和 required evidence，`evidence_requirement_id` 是否严格等于该组合派生值，是否分别记录 `verification_status` 与 `recording_status`，且全部 required assertion 的 `coverage_result = PASS`；复合断言的覆盖表是否全部闭合，且不存在按 `acceptance_item` 生成全局 Audit 行或以部分覆盖整体 PASS。
- 浏览器证据是否覆盖关键点击、DOM / 文案 / 显隐 / store / Network 变化、截图和负向断言。
- Subagent 辅助动作是否只是运行时、命令、日志或文档辅助，且未替代 case 判定。
- 阻塞项、失败分类和下一步建议是否能直接路由到 code auto-fix、`/delivery:mock`、上游阶段或暂停提问。

只有当 Gate 显示 `BLOCKED` / `NEEDS_TARGETED_REVIEW`、失败分类不清、环境问题可能被误判为代码问题、或验证证据不足时，主 Agent 才定向回读对应命令日志或浏览器证据。不得默认粘贴或复审完整终端日志。

## Test Case Consumption Policy

`/delivery:verify` 不得只自由探索页面，必须消费独立 `09-test-case-matrix.md`。

执行规则：

- 必须至少执行 `verification_stage` 为 `verify`、`verify+design`、`verify+accept` 的 case。
- 执行 case 前必须完成 `Pending Verification Merge Audit`：把 `05-implementation-log.md ## 待验证项` 中每条非 `N/A` 记录映射到 existing / newly completed case；后续 case 执行必须覆盖所有映射上的 code 阶段待验证点。
- `verify` 侧重运行态、交互、渲染、Network、build/typecheck/test 和 mock/integration 事实。
- `MOCK_PREVIEW` 下执行 case时读取对应规则及 `补充说明`；失败按 `MOCK_ISSUE` 进入 `/delivery:mock`。
- `design` 独占的 case 不在本阶段关闭，但可复用其前置运行证据。
- `06-debug-verification.md` 继续维护既有阶段表格和全局审计；只把原 `Case Results` 记录块替换为指向 `verify-logs/case-results/<case_id>.md` 的 `Case Result Index`。
- `Verify Case Ledger` 保持既有字段；case 文档定位统一写入 `Case Result Index`。
- 每个 verify / verify+design / verify+accept case 必须在独立 case 文档中逐项记录 `contract_ref`、全部断言和实际证据；不得只写 case 总体 PASS。
- 对 `verify+design`，或 `evidence_required` / `design_reuse_policy` 指向截图复用的 case，verify 必须把运行态截图当作 design 输入物，而不是可有可无的附属证据。
- 每个 case 文档必须基于 `debug-verification-case-result.template.md`。
- `visual_assertion` / `negative_visual_assertion` 中可由 verify 阶段运行态证据判断的结构、层级、顺序、显隐、颜色、间距、圆角、尺寸、形态、icon / asset 等事实必须写入同一 `assertion_ref` 的覆盖表；若只能由 `/delivery:design` 的 Figma 对比关闭，verify 必须记录 runtime source，不得写成设计对齐 PASS。
- 对上述运行态可判断的视觉事实，若 DOM / screenshot / computed style 证明未渲染、错渲染、旧结构残留或与断言相反，当前行必须路由为 `CODE_ISSUE`，case 最终状态为 `NEEDS_TARGETED_REVIEW`，并生成 `code-fix-handoff.md` 后复验；不得把该行或断言汇总为 `PASS_WITH_NOTES`。
- auto-fix、mock runtime、fixture 和逐步证据写入对应 case 文档；`06-debug-verification.md` 继续维护既有汇总表、审计表和定位引用，不复制 Case Result 正文。
- Region case 的 verify 证据至少验证 `结构签名`、`必显元素/字段`、`禁显元素/残留` 中可由运行态 DOM / screenshot 判断的部分。
- Interaction case 必须执行 `Verify点击断言`，并额外验证 `负向断言(禁显/无副作用)`，例如旧弹层未出现、重复按钮不存在、点击后没有重复请求或错误状态残留。
- Cell case 的 verify 证据必须覆盖首行关键单元格的 `必显子元素/字段` 和 `禁显子元素/残留`；只验证表头或列顺序不得关闭 case。
- 若 `09-test-case-matrix.md` 缺失相关 verify case 或断言不足，必须先执行 `Test Case Completion Detour` 受限补全 matrix；若缺口来自 plan contract 不完整，返回 `/delivery:plan`；只有 `MOCK_PREVIEW` 下缺口来自 BAM mock 产物时，才由主 Agent 直接调用 `/delivery:mock` 定向修复。非 `MOCK_PREVIEW` 下 mock 产物缺失不是 matrix 缺口。

### Test Case Completion Detour

- 仅当 `Pending Verification Merge Audit` 发现 code 阶段待验证项无法映射到现有 verify case，或现有 case 的 assertion / evidence_required 不足以关闭该待验证项时触发。
- 主 Agent 直接按 `test-case-planning` 规则补全 `09-test-case-matrix.md`，只允许新增 / 拆分 / 强化 Test Case Matrix、BAM Mock Response Field Coverage Matrix、Mock Preview Scope 或 Mock / Real Boundary 中与该待验证项相关的行。
- 禁止修改 `delivery-task.md`、`04-tech-plan.md`、PRD / Figma 源、BAM mock 产物或业务代码；若缺口需要新增需求、改 plan、改 task 或引入未授权事实，必须返回 `/delivery:plan` 或暂停提问。
- detour 完成后必须重跑 `Pending Verification Merge Audit`，再建立 Verify Case Queue。

## Incremental Report Write Protocol

`verify-logs/case-results/<case_id>.md` 是单 case 的实时事实源；`06-debug-verification.md` 继续作为阶段工作台维护既有全局表格，只不再内联 Case Result 正文。

执行要求：

- verify 开始后先初始化或修正 `06-debug-verification.md` 的阶段表格；队列建立后为每个 case 从 case-result template 创建 `verify-logs/case-results/<case_id>.md`，按原字段初始化 Ledger，并在 Case Result Index 写入可定位的相对链接。创建 case 文档不是复制空模板：必须立即消费 matrix 断言字段，生成完整 `Assertion` 记录和已原子化的 `acceptance_item` 行；无法拆分时必须把该 case 标记为 `NEEDS_TARGETED_REVIEW`，不得继续执行浏览器动作或命令取证。
- case 开始前将该 case 文档更新为 `IN_PROGRESS`，再同步 Ledger 与 Case Result Index。
- case 执行中发生 detour、auto-fix、fixture、截图失败或环境阻塞时，必须先更新 case 文档，再同步 `06-debug-verification.md` 中对应的 Ledger、全局 Audit、索引、缺口表和 Failures / Detours。
- case 结束、暂停或恢复前，先完成并回读 case 文档，确认 required evidence 可审计，再原子更新 `06-debug-verification.md` 的全部派生表。`06-debug-verification.md` 与 case 文档冲突时以 case 文档为事实源，并先修正全局表格后继续。
- 会话中断后从 Ledger 第一个非终态 case 出发，通过 Case Result Index 的 `case_result_ref` 恢复；已闭合 case 只能在其独立文档中追加复验说明，并同步全部派生表。

禁止事项：

- 禁止把多个 case 写入同一 case-result 文件。
- 禁止在 `06-debug-verification.md` 中内联 Case Result 正文或逐条 Evidence；既有全局 Audit、截图索引、Evidence Index 和缺口表必须继续维护。
- 禁止先累计多个 case 再批量生成独立文档或补索引。
- 当前 case 文档未落盘或索引未同步时不得进入下一个 case。

## UI 条件自动补齐协议

UI 被必填项、时间、充值记录、样本状态或前置数据校验拦截时，不得立即把 case 判为 `BLOCKED`。主 Agent 必须优先通过真实 UI 控件完成前置条件，再继续原验证路径。

执行要求：

- 先解析页面提示，逐项记录拦截字段、记录序号、当前值、期望值和定位方式；不得只写“被必填项拦截”。
- 优先通过页面已有编辑入口和真实 UI 事件补齐前置条件；不得直接改 MobX store、React state、业务响应或运行时 fallback。同一页面至少执行两轮稳定定位 / 填写尝试，确定控件不存在、不可编辑、值无法提交或样本合同无法满足时才可提前失败。
- 每轮必须记录填写字段和值、保存结果、剩余拦截项和截图 / DOM 证据；成功后从原自然 UI 入口重新触发目标动作。
- Select、PeopleSelect、TreeSelect、Cascader、AutoComplete 等复合控件必须完成真实选择动作，并记录 DOM 选中态、组件 value、业务字段、request payload 或页面回显中的至少一项生效证据；只有输入值、搜索词或 placeholder 变化不得判 `PASS`。
- 补齐过程中若出现计划外 POST / PUT / PATCH / DELETE，先列出当前点击链路所有可能副作用写接口。最终确认前，每个写接口都必须具备 BAM patch、manifest、目标 ruleId、mock 开关和接口级 verify 结果。
- `MOCK_PREVIEW` 下写接口安全门缺失必须归类为 `MOCK_ISSUE / WRITE_GATE_MISSING` 并进入 `/delivery:mock` detour，恢复后从触发写接口的自然 UI 步骤重跑；非 `MOCK_PREVIEW` 下不得用 mock 兜底，按真实接口风险分类并在最终确认前暂停。

## Test Fixture Script Fallback Protocol

当两轮自然 UI 定位 / 填写仍失败，或存在控件缺失、样本合同无法满足等确定性证据时，允许使用测试 fixture script 兜底验证 DOM、接口合同或功能逻辑。

Verify 阶段生成的可审计产物默认写入当前 artifact workspace 的 `verify-logs/` 目录；运行态截图仍按 `Screenshot And Runbook Protocol` 写入当前 workspace 的 `screenshots/`。

执行边界：

- fixture 只允许写入当前 artifact workspace 的 `verify-logs/test-fixtures/`，文件使用 `<case_id>-<语义名>.browser.js` 或 `.mjs`，同目录保存 `.result.json` 和 `.log`；不得新增依赖、修改业务代码 / 测试目录 / bundle / store / fallback。
- browser fixture 必须作用于当前真实页面 DOM；logic / contract fixture 只能调用已有纯函数、请求格式化逻辑或 artifact mock script，不得手写返回值冒充生产逻辑。
- fixture 只关闭其实际覆盖的 DOM、接口或功能断言；视觉断言仍需基于 fixture 产生的真实 DOM 另存截图。未通过写接口安全门时不得用 fixture 继续确认写操作。
- Case Evidence 必须记录 `verification_method=TEST_FIXTURE_SCRIPT`、`fixture_type`、`fixture_reason`、`fixture_script_ref`、`fixture_result_ref`、`fixture_coverage`、`natural_ui_status`、`write_mock_gate` 和 `result_limit=PASS_WITH_NOTES`。
- 使用 fixture 的 case 最高只能为 `PASS_WITH_NOTES`，并在 `Pending Recheck Items` 保留“自然 UI 路径未完成”的复检项；缺少脚本、日志、结构化结果或 evidence 互链时不得关闭对应断言。

## Screenshot And Runbook Protocol

截图和 runbook 只服务于复用证据，不替代 case 断言。

- 对 `verification_stage = verify+design`，或 `evidence_required` 包含 `截图` / `screenshot` / `Figma` / `computed style`，或 `design_reuse_policy != N/A` 的 case，必须保存运行态截图到当前 workspace 的 `screenshots/`，文件名使用 `<case_id>--<runtime_state>--<capture_scope>.png` 或等价稳定语义名。
- `06-debug-verification.md` 的 `Runtime Screenshot Evidence Index` 必须继续记录 `case_id`、`runtime_state`、`capture_scope`、`screenshot_path`、`verify_screenshot_key`、`sample_ref`、`dom_anchor`、`state_match_hints`、`design_reuse_note`、`materialization_type` 和结果；对应 case 文档同步保存本 case 的截图事实。
- verify 只能写“可供 `/delivery:design` 复用的 runtime source”，不得声明 Figma-vs-Runtime diff 已通过。
- 表格 / 列表 / Drawer case 的截图至少要读出核心区域：表头、首行关键单元格和关键操作区；只截整页但核心不可读不算有效证据。
- page-level 首屏视觉 baseline case 必须产出首屏整页或主内容容器截图；只保留局部截图不得声称已经覆盖整体 UI 基线。
- 截图必须完成本地落盘闭环；不得存在“截图已返回图像预览但无法保存到本地”的合规状态。`browser_take_screenshot` 返回图像预览即表示本地应存在可检索的截图文件，文件位置只能是当前 workspace `screenshots/` 或工具约定的本地临时截图目录。
- 调用 Trae `integrated_browser.browser_take_screenshot` 时必须传入语义化 `filename`，并按以下固定源目录读取截图文件：

```bash
SCREENSHOT_NAME='<case_id>--<runtime_state>--<capture_scope>.png'
INTEGRATED_BROWSER_SCREENSHOT_PATH="$(getconf DARWIN_USER_TEMP_DIR)/trae/screenshots/$SCREENSHOT_NAME"
stat "$INTEGRATED_BROWSER_SCREENSHOT_PATH"
```

- 写入 `screenshot_path` 前，必须把内置浏览器源截图复制到当前 workspace 的 `screenshots/`只有 workspace 文件存在、可读且为图片时，才能写 `materialization_type=local_file`；
- 若截图工具已返回图像预览，但按 workspace 和工具临时目录仍未检索到本地截图文件，应判定为截图检索或物化流程未闭合，必须修正检索方式或重试取证；只有确认工具调用失败、本地文件系统异常或截图能力不可用时，才分类为 `ENV_ISSUE / SCREENSHOT_MATERIALIZATION_FAILED` 或工具调用异常。凡 required screenshot evidence、`verify+design`、`design_reuse_policy != N/A` 或视觉断言依赖截图时，截图未本地物化、路径不可读或路径不存在一律不得 `PASS` / `PASS_WITH_NOTES`。
- `Runtime Screenshot Evidence Index.screenshot_path` 必须指向当前 workspace 内真实存在的截图文件；工具临时路径只能写入 notes，不得作为 design 复用路径。若只记录聊天内图片、临时路径或不存在路径，design 复用状态必须是 `NOT_REUSABLE`。

凡依赖浏览器交互的 case，必须维护 `verify-logs/browser-verify-runbook.json`，用于减少重复探索：

- runbook 记录 `case_id`、`contract_ref`、vmok 入口模板、样本参数、前置条件、语义步骤、正向 / 负向断言、视觉正 / 负向断言、证据目标和最近结果。
- runbook 必须额外记录 `runtime_state`、`capture_scope`、`verify_screenshot_key`、`sample_ref` 和 `preferred_reuse_for_design`，让 design 能直接按键复用 verify 截图。
- 步骤必须是稳定语义，例如 `navigate`、`click`、`wait_for_text`、`screenshot`、`evaluate`；不得只保存刷新即失效的 snapshot ref。
- runbook 失效时，在 `notes` 和 `06-debug-verification.md` 记录原因；runbook 只帮助复跑，不替代本轮运行态断言。


## Case Evidence Coverage Audit

`Case Evidence Coverage Audit` 用于区分“未验证”和“已验证但未沉淀证据”。必须在 Gate 前完成。

证据项要求：

- 全局 `Case Evidence Coverage Audit` 只保留 `case_id + assertion_ref` 维度的汇总行；逐断言、逐验收项字段和判定细则以 `debug-verification-case-result.template.md` 的 `Evidence Reconciliation` 为准。
- 每个 verify case 必须按 `09-test-case-matrix.md` 的 `positive_assertion`、`negative_assertion`、`visual_assertion`、`negative_visual_assertion` 和 `evidence_required:<type>` 写入独立 evidence mapping；复合视觉断言保持原 `assertion_ref`，只在 case-result 覆盖表中拆分最小可判断事实。Gate 前必须回读所有 case-result 文档，若任一必需断言仍存在模板占位、空 `acceptance_item`、整段复合断言未拆分、或泛化验收行，则该 assertion 的 `coverage_result` 必须为 `NEEDS_TARGETED_REVIEW`，case 不得 PASS。
- case 关闭必须依赖类型匹配、可审计、已记录的证据；未执行、已执行未记录、证据缺失、类型不匹配、required evidence 工具限制、仅引用 Summary / Ledger / `.trae/DELIVERY_STATE.md` 或泛化自然语言总结时，当前 case 不得 `PASS`，必须按模板规则补证、重跑、标记 `BLOCKED` / `NEEDS_TARGETED_REVIEW`，或在运行态事实冲突时进入 `CODE_ISSUE` 修复闭环。

Gate 前必须分别输出：

- `Not Verified Items`：所有 `verification_status = NOT_EXECUTED` 的 `case_id + assertion_ref`。
- `Evidence Not Recorded Items`：所有 `verification_status = EXECUTED && recording_status = NOT_RECORDED` 的 `case_id + assertion_ref`。
- `Evidence Materialization Missing Items`：所有 `evidence_ref` 未通过 case-result 模板定义的持久化存在检查的 `case_id + assertion_ref + evidence_ref`。

三类列表均为空、所有 `evidence_ref` 均为持久化存在证据，且其余 required coverage 全部 PASS，才允许把证据 Gate 判为 PASS。

## Environment Bootstrap Protocol

验证前必须先建立可复现环境，禁止把未初始化的 `build` / `dev` 失败直接归因到业务代码。

稳定路径：

```text
Node 18 -> emo install -> 确认 8079 属于当前 workspace -> emo start alliance-operation-daren -> localhost health check -> vmok 壳 URL 交互
```

硬约束：

- `emo` / `edenx dev` 依赖 Node 18；`command not found: emo` 先执行 `source ~/.nvm/nvm.sh && nvm use 18`。
- `edenx` 不存在且提示 `node_modules missing` 时，先在 monorepo 根目录执行 `source ~/.nvm/nvm.sh && nvm use 18 && emo install`。
- `emo start` 必须使用非交互形式：`source ~/.nvm/nvm.sh && nvm use 18 && emo start alliance-operation-daren`。
- `8079` 必须空闲或属于当前 `execution_repo_root`；若服务退到 `8080`，不得继续浏览器验证，先检查端口归属。
- localhost 只做 health check：`http://localhost:8079/alliance-operation-daren`；页面交互、截图、DOM、Network 必须走 vmok 壳 URL。
- mock-debug 必须显式带 mock 开关，例如 `externalLeadsDomainMock=1`；不得依赖 XHR 拦截伪造业务状态。
- 非 `MOCK_PREVIEW` 的 `SAMPLE_COVERAGE_GAP` 若走 mock 补证，浏览器 URL 也必须显式带 mock-debug 开关；未带该参数产生的页面、Network、console、`[BAM_MOCK_HIT]` 或截图证据不得记为补充 mock 证据。

推荐检查：

```bash
lsof -nP -iTCP:8079 -sTCP:LISTEN
ps -ef | rg 'alliance-operation-daren/.+(app-tools|edenx|proxy)' | rg -v rg
curl -I http://localhost:8079/alliance-operation-daren
curl -I http://localhost:15323
```

浏览器协议：

```text
https://ecop.bytedance.net/alliance-operation-daren/author-import?cjDebugSubApp=alliance-operation-daren:http://localhost:8079/alliance-operation-daren&externalLeadsDomainMock=1
```

- 主 Agent 必须先判定 `Browser Runtime Mode` 并固定可复用的浏览器证据入口；具体打开、截图、DOM、console、Network 采集可由主 Agent 当前浏览器工具、`browser-verify-runbook.json` 或明确授权的 browser-capable helper 执行，但 case 判定和 Gate 仍由主 Agent 完成：
  - `TRAE_DESKTOP`：有 Trae 桌面内置浏览器能力时，优先使用 Trae 内置浏览器在当前会话完成 vmok 页面打开、snapshot、DOM、截图、点击和 Network 检查。若内置浏览器无法复用登录态、无法打开 vmok 壳、落到 SSO，或工具不能指定持久化 Profile，才使用固定 Profile fallback：`.trae/browser-profiles/ecop-vmok-agent-browser`。
  - `COCO_CLI_HEADLESS`：CoCo / Trae CLI / 无桌面环境必须使用无头浏览器，优先 Playwright Chromium，其次可用的 Chrome DevTools / browser MCP headless 能力。必须通过同一 vmok URL 完成 `goto`、点击、DOM、screenshot、console、Network 采集；不得调用 `open -na "Google Chrome"` 或依赖人工可见窗口。
- 桌面 fallback 必须记录 `browser_tool`、`browser_capabilities`、`network_evidence_level`、`browser_session_reuse`、`builtin_browser_result`、`open_method`、`browser_profile`、`sso_result`。如果当前桌面工具不能指定持久化 Profile，可使用：`open -na "Google Chrome" --args --user-data-dir=.trae/browser-profiles/ecop-vmok-agent-browser <vmok-url>`；若内置浏览器仍无法复用登录态，可继续用该持久化 Profile 浏览器作为桌面 fallback 证据源，但必须在报告中标明。
- 无头分支必须记录 `browser_tool`、`headless=true`、`browser_engine`、`browser_capabilities`、`network_evidence_level`、`browser_session_reuse`、`open_method=headless_browser`、`browser_profile_or_state`、`sso_result`；登录态通过专用 user data dir 或 storage state 复用，禁止把 cookie/JWT/token 原文写入产物。
- 禁止删除、清空或覆盖浏览器 Profile / storage state；对应模式下浏览器仍无法取得必要证据时，归类为 `ENV_ISSUE / HOST_AUTH_REQUIRED` 或 `ENV_ISSUE / BROWSER_TOOL_UNAVAILABLE`。
- 当前项目的 mock-debug 页面交互、截图、DOM 文案检查和 Network 检查必须通过 vmok 壳 URL 执行；localhost 子应用 URL 只能用于 health check。
- 如果 localhost 深链白屏但 vmok 壳可用，应归类为 `ENV_ISSUE / HOST_CONTEXT_REQUIRED`，不得直接判定为业务代码白屏。
- 如果浏览器落到 ByteDance SSO，桌面分支按固定 Profile fallback 完成登录后重试；无头分支必须使用已授权的 user data dir / storage state 重试，或暂停要求用户在安全授权环境提供可复用登录态。仍无法打开业务页或取得必要证据时，再按 `ENV_ISSUE / HOST_AUTH_REQUIRED` 提示用户处理登录态后复跑 mock-debug。
- `06-debug-verification.md` 必须记录实际访问的 vmok URL。

## Required Verification Items

必须执行或说明无法执行原因：

1. lint
2. typecheck
3. unit test / related test
4. build
5. mock-debug：`MOCK_PREVIEW` 时，在 patched BAM / BAM mock response 下验证 UI / 交互 / 状态，只能形成 `mock-preview verified`。
6. integration-debug：用于验证真实接口本身的字段 / 权限 / 错误处理；它与 Mock Verify 分层记录，不能用中间真实响应替代 Mock 请求 / 响应断言。
7. debug 代码检查：`.trae/scripts/check_no_debug_code.sh`
8. 改动范围检查：`.trae/scripts/check_changed_files.sh`

补充约束：

- 若仓库 / app 已存在明确脚本或命令协议，必须按该协议执行并记录原始脚本名。
- 若项目 build 协议本身包含稳定且可判定的单项交互阻断（例如 `emo scm` 在自动化环境里固定弹出唯一 `scm name` 选择），主 Agent 应先按 `PROJECT_CONTEXT.md` 或 `emo-scm-noninteractive` skill 的项目特例使用非交互包装执行原命令，并在 `baseline_snapshot` 中同时记录原始命令名与实际执行包装。优先示例：`command=emo scm`，`execution_ref=BUILD_REPO_NAME=ecom/alliance_operation_mono/mono emo scm`；仅当环境变量注入不可用且默认项唯一时，才允许记录 `execution_ref=printf '\\n' | emo scm auto-confirmed唯一 scm entry ...`。禁止把多选或不稳定交互猜测成默认项。
- 若脚本缺失，只能记录“脚本缺失 / 不适用 / 环境阻断”，不得擅自改用自推导命令后宣称同等覆盖。
- `check_no_debug_code.sh` 与 `check_changed_files.sh` 默认由主 Agent 本地执行；只有单条脚本输出无法采集或需要隔离长日志时，才允许把该单条脚本委派给 `runtime-runner`。

## Mock Debug Protocol

`MOCK_PREVIEW` 的 mock-debug 必须基于 `/delivery:mock` 生成的 patched BAM；不得用 XHR 拦截、业务 fixture、fallback store、静态构造日志或中间真实响应替代浏览器运行态证据。非 `MOCK_PREVIEW` 下缺少 mock 产物记为 `N/A`，继续 integration-debug / UI / 命令验证。

必须覆盖：

- 本地 health check、vmok 壳入口、关键页面入口。
- 关键按钮 / modal / drawer、空态、失败兜底、权限显隐或不可用态。
- `09-test-case-matrix.md` 中正向断言、负向断言、视觉正向断言与视觉负向断言，尤其旧结构、错误按钮、错误容器、禁显字段、错误颜色 / icon / 容器形态和无副作用条件。
- `04-tech-plan.md` 中 `Figma Interaction Contract` 的 `Verify 点击断言`；对可操作控件必须记录点击前、点击动作、点击后 DOM / 文案 / 显隐 / store / Network / 截图变化。

`MOCK_PREVIEW` 下还必须验证同一条浏览器自然请求产生的 `[BAM_MOCK_HIT] <json>`：

- `ruleId` 命中当前 case 预期规则。
- `requestBody` 覆盖 test matrix / manifest 声明的请求字段和值。
- `mockedResponse` 覆盖响应合同、mock key / mock 规则、默认列 / 固定列 / `totalColumns` 等 UI 消费字段。
- 表格 / 列表 case 必须抽样验证表头、首行关键单元格、布尔 / 枚举文案，不得只验证接口有数据。
- manifest rule 为 `synthetic_contract` 时，额外记录 `[BAM_MOCK_SYNTHETIC_CONTRACT]`、两轮 UI 尝试说明和 real verify 回收项。

失败分类：

- 自然 UI 操作未产生 `[BAM_MOCK_HIT]`、埋点缺 `requestBody` / `mockedResponse` 或命中后未应用目标 Mock：`MOCK_ISSUE / MOCK_APPLICATION_MISS`。
- 预期 rule 只能通过 response 推断或测试专用 selector 命中：`MOCK_ISSUE / RULE_TRIGGER_MISMATCH`。
- mock response 缺少继续操作所需结构、字段、配置或关联数据：`MOCK_ISSUE / DATA_CLOSURE`。
- request / response case、manifest、runtime 和 BAM patch 不一致：`MOCK_ISSUE / CONTRACT_DRIFT`。

结论边界：

- 报告只能写 `mock-preview verified` / `BAM mock 响应下前端闭环通过`；不得写真实环境验证完成或最终交付完成。
- `mock_verifiable=否` 的 case，以及写接口真实调用、后端异步处理、权限 / 风控 / 聚合 / 持久化 / 跨服务回写等无法由 mock 证明的内容，记录为 real verify / integration-debug 回收项，不得单独阻塞 mock-debug。
- BOE / Feelgood / 监控上报 404、CORS、JSON parse 噪声若不影响本地渲染和 mock 交互，归类为 `ENV_ISSUE / ENV_NOISE`，不得单独阻断。

## Failure Classification

失败必须归类：

- MOCK_ISSUE：仅适用于 `MOCK_PREVIEW` 的 mock 规则、fixture、拦截、请求匹配、响应合同或跨 API 数据闭合问题；非 `MOCK_PREVIEW` 下不得使用该分类。
- SAMPLE_COVERAGE_GAP：仅适用于非 `MOCK_PREVIEW` 的 verify 阶段，且必须同时满足“基础真实链路或接口合同已明确”“当前缺口仅是样本或状态覆盖不足”“mock 只临时构造样本并补充 UI / hover / screenshot 证据”。该路径不得关闭真实 request / response contract 断言，也不能把 `API_ISSUE / DATA_CONTRACT_MISMATCH` 改写为通过。
- CODE_ISSUE：代码问题。
- TYPE_ISSUE：类型问题。
- ENV_ISSUE：环境/依赖问题。
- API_ISSUE：接口问题。
- DATA_ISSUE：测试数据问题。
- DESIGN_ISSUE：设计/交互问题。
- UNKNOWN：无法判断，必须暂停提问或请求更多日志。

### REAL_READY_LIMITED 使用边界

- `REAL_READY_LIMITED` 只能表示“真实接口/BAM 合同当前缺失细字段，因此当前实现仅允许摘要级真实合同闭合”；它不是 verify 阶段的宽松免责口径。
- verify 发现异常时，必须先完成代码路径、model、adapter、渲染层和真实 request/response 证据核对，再决定是否还能引用 `REAL_READY_LIMITED`。
- 若 case 依赖的字段已存在于真实 response、generated types、model 或 adapter 中，但 UI 未消费、hover/tooltip 未接线、分支未渲染或组件漏实现，必须归类为 `CODE_ISSUE`，不得继续写成 `PASS_WITH_NOTES`、`limited behavior` 或“字段未到位”。
- 仅当以下条件同时成立时，才允许按 `REAL_READY_LIMITED` 记录 notes：
  - 真实 response/BAM 合同中确实无目标细字段，或字段在当前样本中明确未返回；
  - 代码核对后确认前端没有漏消费已存在字段；
  - 计划/任务中已预先声明该 limited behavior，不是 verify 临场解释。
- 若上述条件任一不成立，必须停止用 `REAL_READY_LIMITED` 收口，改走 `CODE_ISSUE` / `API_ISSUE` / `DATA_ISSUE` 正常分诊。

细分建议：

- `ENV_ISSUE / NODE_VERSION`：Node 版本错误导致 `emo` 不可用。
- `ENV_ISSUE / DEPENDENCY_MISSING`：`node_modules` 缺失导致 `edenx` 不可用。
- `ENV_ISSUE / HOST_AUTH_REQUIRED`：vmok 壳需要 ByteDance SSO 登录。应提示用户登录后复跑 mock-debug，不作为业务代码失败。
- `ENV_ISSUE / ENV_NOISE`：监控、BOE、Feelgood 等外部环境噪声，不影响本地 mock 功能。
- `CODE_ISSUE / RUNTIME`：页面主流程白屏、组件异常、关键交互无法打开。
- `CODE_ISSUE / MISSING_CONSUMPTION`：字段已存在于真实 response、types、model 或 adapter，但 UI 未消费、hover/tooltip 未渲染、分支未接线，不能再按 `REAL_READY_LIMITED` 收口。
- `TYPE_ISSUE / BUILD`：`pnpm build` 或 typecheck 因本次代码类型错误失败。
- `API_ISSUE / CONTRACT`：真实接口字段、权限、错误码与前端适配不一致。
- `SAMPLE_COVERAGE_GAP / SUPPLEMENTAL_MOCK_ONLY`：接口 / 字段 / schema / 代码消费链路已明确，但当前真实样本不足以覆盖目标 hover / 状态 / 视觉分支；仅允许临时 mock 样本补充证据，不允许替代真实 contract 断言。
- `MOCK_ISSUE / RULE_TRIGGER_MISMATCH`：自然请求未命中目标规则，或规则依赖 response / 测试专用 selector。
- `MOCK_ISSUE / MOCK_APPLICATION_MISS`：自然 UI 操作未产生预期埋点、埋点字段不完整，或命中后未应用目标 Mock。
- `MOCK_ISSUE / DATA_CLOSURE`：mock response 缺少页面后续操作所需结构、字段、配置或关联数据。
- `MOCK_ISSUE / CONTRACT_DRIFT`：request / response case、manifest、runtime 和 BAM patch 不一致。

## Required Outputs

必须更新：

- `06-debug-verification.md`
- `verify-logs/case-results/<case_id>.md`（每个进入队列的 case 必须有且只有一个）
- `code-fix-handoff.md`（当失败可定位到本轮改动代码且满足 code auto-fix 条件时）
- `delivery-mock.md` 的本次 `/delivery:mock` 执行记录（当 `MOCK_PREVIEW` 失败分类为 `MOCK_ISSUE`，或非 `MOCK_PREVIEW` 下失败分类为 `SAMPLE_COVERAGE_GAP` 时，由 `/delivery:mock` 写入；`SAMPLE_COVERAGE_GAP` 必须包含 `base_contract_evidence`、`mock_debug_param`、临时 mock 文件清单与 `cleanup_status`）
- `omission-risk-scan.md`

运行态说明：

- `.trae/DELIVERY_STATE.md` 是本地状态机缓存，不属于本 skill 的交付产物。
- 如需记录阶段状态，只由主 Agent 在 Gate Review 后做最小更新；Subagent 只写被明确派发的命令结果、文件保存结果或日志摘要，不写 case 结论，也不宣布进入下一阶段。

## Code Fix Handoff Protocol

当验证失败满足以下条件时，`/delivery:verify` 必须生成可执行的 `code-fix-handoff.md`，并允许在当前 verify 流程中进入 code auto-fix detour，定向派发 `code-writer`（或通过 `/delivery:code` 的 handoff 模式派发 `code-writer`）修复后回到当前 case：

- 失败分类为 `CODE_ISSUE`、`TYPE_ISSUE` 或 `BUILD` 相关问题。
- 根因定位到本轮改动文件，且文件路径、错误行号、错误摘要明确。
- 不需要重新解释 PRD / Figma，不需要新增产品决策。
- 不涉及未关闭设计 BLOCKER 或计划外功能。

`code-fix-handoff.md` 必须包含：

| 字段 | 要求 |
|---|---|
| `source_verify_report` | 指向作为定位索引的 `06-debug-verification.md` |
| `source_case_result` | 指向当前 `verify-logs/case-results/<case_id>.md` 事实源 |
| `failure_classification` | `TYPE_ISSUE` / `CODE_ISSUE` / `BUILD` 等 |
| `fix_scope` | `MICRO_CODE_FIX` / `CASE_CODE_FIX` / `MAIN_AGENT_REVIEW_REQUIRED` |
| `blocking_errors` | 文件、行号、错误码、错误摘要 |
| `allowed_files` | 可修改文件；`MICRO_CODE_FIX` 最多 2 个文件 |
| `forbidden_files` | 禁止修改文件或目录 |
| `affected_case_ids` | 当前 case 或受影响 case 列表 |
| `expected_fix` | 行为保持不变的最小代码修复说明 |
| `required_commands` | 修复后必须执行的验证命令 |
| `broader_rerun_policy` | `SKIP_UNLESS_TRIGGERED` / `RUN_TARGETED` / `RUN_FULL_BASELINE` 及触发条件 |
| `agent_recommendation` | `DISPATCH_CODE_WRITER` 或 `MAIN_AGENT_REVIEW_REQUIRED` |

如果失败定位不清、需要产品/设计决策，或可能需要改 `04-tech-plan.md`，不得生成 `DISPATCH_CODE_WRITER` handoff；必须标记 `MAIN_AGENT_REVIEW_REQUIRED` 并说明返回哪个阶段。

## Verify Code Auto-Fix Protocol

`/delivery:verify` 默认可执行受限自动修复闭环；`--auto-fix` 仅作为显式强调，不改变安全边界。

允许自动修复的前提：

- 失败分类为 `CODE_ISSUE`、`TYPE_ISSUE` 或 `BUILD` 相关问题。
- 满足 `Code Fix Handoff Protocol`，且 `agent_recommendation = DISPATCH_CODE_WRITER`。
- 修复不需要新增产品/设计决策，不需要修改 `04-tech-plan.md`，不涉及未关闭设计 BLOCKER。

执行顺序：

1. 执行当前 case，定位失败并写对应 case-result 文档与 `code-fix-handoff.md`，再同步 `06-debug-verification.md` 索引。
2. 进入受限 `code-writer` auto-fix（或 `/delivery:code` handoff 模式），只修 handoff 中的 blocking errors。
3. 修复后回到当前 verify case，重跑 `required_commands` 和受影响 case。
4. 先更新受影响的 `verify-logs/case-results/<case_id>.md` 的 `auto_fix_handling`、`Evidence Reconciliation` 与最终结果，再同步 `06-debug-verification.md` 的 Ledger、Case Result Index、全局 Audit、Evidence / 截图索引、缺口表和 Failures / Detours，标记 auto-fix、复验结果、已关闭 case 和仍阻塞 case。

### Micro Code Fix Fast Path

`MICRO_CODE_FIX` 是 verify 内的低成本修复路径，只能用于根因明确、边界极窄的问题，目标是避免为单行类型 / 构建 / 明确运行时接线错误重跑完整 code 阶段成本。

允许条件必须同时满足：

- `failure_classification` 为 `TYPE_ISSUE`、`BUILD` 或 `CODE_ISSUE / RUNTIME`，且错误文件、行号、错误码或 selector / stack 明确。
- `allowed_files` 不超过 2 个文件，且不包含公共架构、路由大改、BAM 生成物、业务规则、权限规则、跨系统协议或设计结构重建。
- `expected_fix` 是保持行为不变的最小修复，如类型补齐、导入修正、空值保护、事件接线漏连、条件分支漏消费已存在字段。
- `required_commands` 至少包含触发失败的原命令或最小 targeted 命令；若是 UI runtime 问题，还必须包含当前 `active_case_id` 的浏览器复验点。

执行要求：

1. 仍必须生成 `code-fix-handoff.md`，且 `fix_scope = MICRO_CODE_FIX`、`agent_recommendation = DISPATCH_CODE_WRITER`。
2. 仍通过受限 `/delivery:code` handoff 模式或当前 verify detour 派 `code-writer`，不得由 `runtime-runner` 或主 Agent 在 verify 阶段直接改业务代码。
3. `code-writer` 只改 `allowed_files`，只修 `blocking_errors`，不得重构、顺手修其它 case 或改计划。
4. 返回后主 Agent 只做 micro review：核对 diff 是否限定在 `allowed_files`、是否只覆盖 `blocking_errors`、`required_commands` 是否执行、当前 case 是否复验通过。
5. 只有触发 `broader_rerun_policy` 的升级条件时，才重跑 broader lint / typecheck / build / test；否则记录 `broader_rerun_reason: not triggered by policy`。

禁止把以下问题标成 `MICRO_CODE_FIX`：接口合同不清、样本数据缺失、mock rule 缺口、设计 BLOCKER、权限业务规则、真实写接口、跨系统动作、需要改 `04-tech-plan.md` 或 `delivery-task.md` 的问题。

禁止：

- 未生成 handoff 就进入自动修复。
- 无允许文件边界、无错误行号、无复验命令时直接改业务代码。
- 把 API、数据、设计、权限、跨系统、真实写接口问题纳入 auto-fix。
- 把 `MOCK_PREVIEW` 下的 `MOCK_ISSUE` 当作业务 code auto-fix；Mock 问题必须由主 Agent 直接调用 `/delivery:mock`。非 `MOCK_PREVIEW` 下缺 mock 不属于 `MOCK_ISSUE`。
- 把 `SAMPLE_COVERAGE_GAP` 当作真实接口问题或直接放行理由；它只是一条受控临时样本补充取证路径，必须与 `base_contract_evidence` 并列记录。
- 每轮重启新的 dev server 或新建浏览器 profile；必须复用当前 workspace 的长运行环境和当前 case queue 的浏览器会话。

## Delivery Mock Detour Protocol

当 `MOCK_PREVIEW` 失败分类为 `MOCK_ISSUE`，或非 `MOCK_PREVIEW` 下失败分类为 `SAMPLE_COVERAGE_GAP` 时，当前 verify 执行会话必须由主 Agent 通过 `/delivery:mock` 执行定向 mock 返工：

1. 记录当前已通过 case、失败 case、剩余 case、dev server、`Browser Runtime Mode`、浏览器会话 / Profile / storage state 和 vmok URL。
2. 主 Agent 调用 `/delivery:mock`，传入 origin_stage=`verify`、resume_point、resume_command、自然触发动作、受影响 case、允许修改范围和 resume_checks；`MOCK_PREVIEW` 继续传预期 / 实际 rule 与 request / response 合同，`SAMPLE_COVERAGE_GAP` 额外传 `real_contract_evidence`、`base_contract_evidence`、`supplemental_assertions`、`forbidden_contract_assertions`、`mock_debug_param` 和 `cleanup_required=true`。
3. `/delivery:mock` 必须读取当前阶段上下文和 `09-test-case-matrix.md`，只修改受影响 mock artifact、manifest、runtime、目标 BAM / `__mock__`，并通过 UI 自然操作取得真实 request / response 后落地规则；若验证发现 UI 已选中字段但 patched BAM `requestBody` 缺失该字段，且证据指向 BAM wrapper 丢字段，必须由 `/delivery:mock` 用 `BAM_MOCK_WRAPPER_FIELD` marker 补齐目标 wrapper 透传；若两轮 UI 自然点击仍无法定位必要接口，可按 `synthetic_contract` 落地 synthetic request / response，并记录 real verify。
4. 审查 `delivery-mock.md` 本次执行记录、`mock/mock-log.md`、`rule-map`、接口 manifest、runtime、BAM marker、最终 patched BAM 验证和 Forbidden Path Check。
5. BAM mock 审查通过后自动恢复当前 `/delivery:verify`。
6. 先更新受影响的 `verify-logs/case-results/<case_id>.md` 的 `mock_handling`、`Evidence Reconciliation` 与阶段结果；再重跑受影响 case。通过后继续剩余 case，不重复未受影响且已有有效证据的 case，不得停在“mock 修复完成”。

## Gate

- 全部必需验证通过，`Pending Verification Merge Audit` 覆盖所有 `05-implementation-log.md ## 待验证项` 非 `N/A` 条目，`Case Evidence Coverage Audit` 中全部 required evidence 均为 `PASS`，且 Case Result Index 中每个引用都存在并与对应 case 文档最终结果一致：允许进入 `/delivery:design`。
- 任一 case 的 required evidence 缺失、类型不匹配、只写结论无可审计引用，或唯一证据来自 `.trae/DELIVERY_STATE.md` / 全局 Summary / 泛化自然语言摘要：Gate 必须为 `NEEDS_TARGETED_REVIEW`，不得进入 `/delivery:design`。
- Gate Recommendation 必须分别列出 `Not Verified Items` 与 `Evidence Not Recorded Items`，让后续动作能区分“补做验证”和“补沉淀 / 重采证据”。
- 如果缺失的是 testcase 本身或 verification_stage 不正确，先执行 `Test Case Completion Detour` 受限补全 `09-test-case-matrix.md`；如果缺口来自 plan contract 不完整，返回 `/delivery:plan`。
- `MOCK_PREVIEW` Mock 问题：不得停止在 verify，也不得修改业务代码；主 Agent 直接调用 `/delivery:mock` 修复，BAM mock 审查通过后恢复 verify。
- `MOCK_PREVIEW` 下补充说明对应规则验证失败时按 Mock问题处理；不得要求重跑已完成 Code Task。
- 非 `MOCK_PREVIEW` 下缺少 `delivery-mock.md`、`mock/**`、manifest、`[BAM_MOCK_HIT]` 或 mock retry 记录不得阻塞 verify；相关 case 继续按真实 API / 数据 / 环境 / 代码 / 设计分类验证。
- 非 `MOCK_PREVIEW` 的 `SAMPLE_COVERAGE_GAP`：只要基础真实链路或接口合同已明确，允许用 `/delivery:mock` 临时构造样本补齐样本依赖断言；报告中必须同时列出 `base_contract_evidence` 与 `mock-only supplemental evidence`，并把被 mock 补齐的断言明确标记为 `SUPPLEMENTAL_ONLY`。当前 case 一旦关闭，主 Agent 必须立即回到 `/delivery:mock` 做 cleanup，删除临时 mock 规则、BAM patch / wrapper patch、manifest active rule、生成器管理的临时 `__mock__` 文件，并移除 `mock_debug_param` 后复查页面；cleanup 未完成、残留临时 mock 代码或移除 debug 参数后仍依赖临时 mock，Gate 仍为 `NEEDS_TARGETED_REVIEW`。若接口字段 / schema / 代码消费链路本身未明确，或真实响应与方案不一致，Gate 仍为 `NEEDS_TARGETED_REVIEW`、`API_ISSUE` 或 `DATA_CONTRACT_MISMATCH`。
- 代码问题：若满足 Code Fix Handoff Protocol，必须生成 `code-fix-handoff.md` 并在当前 verify 流程中进入 code auto-fix detour；修复后回到当前 case 复验。只有不满足 handoff 条件、越过允许文件或需要产品/设计决策时，才返回 `/delivery:code` 或上游阶段由主 Agent 审核。
- 可由本地流程修复的环境问题：先按 Environment Bootstrap Protocol 修复并重试，不得立即暂停。
- 修复后仍不可恢复的环境/接口/数据问题：执行 Pause and Ask Protocol。
- mock-debug 通过但存在非阻断环境噪声：允许输出 `MOCK_DEBUG_PASS_WITH_NOTES`，并在相关 case 的 `Pending Recheck Items` 记录复检项后进入 `/delivery:design`。
