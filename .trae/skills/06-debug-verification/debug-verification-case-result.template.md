# Verification Case Result

### Case: `<case_id>`

- `order`: <Verify Case Ledger 中的执行顺序>
- `verification_stage`: <verify / verify+design / verify+accept>
- `priority`: <retry / normal>
- `contract_ref`: <合同或矩阵引用>
- `source_verify_report`: ../../06-debug-verification.md
- `updated_at`: <更新时间>
- `verification_target`: <contract_ref / BDD UI 操作 / 验收断言>
- `acceptance_steps`:
  - <按 test case matrix / BDD 行为逐步列出验收动作和断言>
- `verification_process`:
  - <步骤 1：自然 UI 操作 / 命令 / Network / DOM / 截图>
  - <步骤 2：断言 positive_assertion / negative_assertion / visual_assertion / negative_visual_assertion / evidence_required>
- `ui_condition_completion`: <not_triggered / 每轮真实 UI 定位、填写、保存和剩余拦截项 / deterministic_failure>
- `write_interface_gate`: <MOCK_PREVIEW 下记录 BAM patch、manifest、ruleId、mock 开关、接口 verify 与运行态 BAM_MOCK_HIT；非 MOCK_PREVIEW 下记录真实环境、测试样本、授权与副作用边界；不适用写 N/A>
- `fixture_fallback`: <not_triggered / 触发原因、脚本与结果引用、覆盖边界>
- `mock_handling`: <effective_verify_mode；MOCK_PREVIEW 下记录 ruleId、apiName、requestBody、mockedResponse、/delivery:mock detour；非 MOCK_PREVIEW 写 N/A>
- `auto_fix_handling`: <是否触发 code-fix-handoff、修复文件、复验命令、结果或 N/A>
- `final_result`: <PASS / PASS_WITH_NOTES / NEEDS_TARGETED_REVIEW / BLOCKED>
- `evidence_summary`: <证据对账摘要；不得替代下方逐项 Evidence Reconciliation>
- `residual_risk`: <real verify / integration-debug 回收项或 N/A>
- `next_step`: <next case / targeted retry / upstream route / N/A>

#### Runbook Sync（Runbook 同步）

- `case_id`: <case_id>
- `runbook_ref`: verify-logs/browser-verify-runbook.json#<case_id>
- `runbook_status`: <created / updated / reused / stale / N/A>
- `entry_url`: <稳定或脱敏入口地址 / N/A>
- `sample_params`: <样本参数 / N/A>
- `step_changes`: <步骤变更 / none / N/A>
- `assertion_changes`: <断言变更 / none / N/A>
- `evidence_alignment`: <aligned / partial / not_aligned / N/A>
- `notes`: <备注 / N/A>

#### Evidence Reconciliation（证据对账）

##### Assertion（断言）：`<assertion_ref>`

- `case_id`: <case_id>
- `evidence_requirement_id`: <由 case_id + assertion_ref 派生的稳定 ID；与全局 Case Evidence Coverage Audit 同列一致>
- `assertion_ref`: <positive_assertion / negative_assertion / visual_assertion / negative_visual_assertion / evidence_required>
- `verification_status`: <EXECUTED / NOT_EXECUTED / TOOL_BLOCKED>
- `execution_ref`: <验证动作或采集过程引用；未执行时写 N/A 和原因>
- `recording_status`: <RECORDED / NOT_RECORDED>
- `evidence_type`: <Network / UI / DOM / bbox / screenshot / computed_style / asset_ref / command / log>
- `coverage_result`: <PASS / PASS_WITH_NOTES / NEEDS_TARGETED_REVIEW / BLOCKED>

| `acceptance_item` | `observed_value` | `evidence_ref` | `coverage_result` |
|---|---|---|---|
| <当前 assertion_ref 下的一个最小可独立判断事实> | <该项实际观察到的请求字段、UI 文案、DOM 状态、视觉事实、命令结果或日志摘要> | <当前 artifacts workspace 内已存在、可读、类型匹配的持久证据文件路径或文件内锚点；例如截图文件、case evidence JSON、Network capture JSON、命令日志文件。不得写 viewId、snapshot ref、browser 历史、代码路径、DOM selector、computed style 文本或不存在的文件。> | <PASS / PASS_WITH_NOTES / NEEDS_TARGETED_REVIEW / BLOCKED> |

一次验证对应一个 `Assertion`。`acceptance_item` 只作为该断言覆盖表中的验收事实行，不作为独立分层、独立断言或独立证据块。case 文档创建时就必须把每个 matrix 断言物化为本表中的最小可独立判断事实行；不得把 matrix 原文整段复制为单行，除非该断言本身确实只有一个可观察事实。只有表内所有必需行的 `coverage_result` 均为 `PASS` 时，断言级 `coverage_result` 才能为 `PASS`。

字段与判定规则：

- 证据对账只按 `assertion_ref` 建立 `Assertion` 记录；
- `evidence_requirement_id` 只由 `case_id + assertion_ref` 派生，并与全局 `Case Evidence Coverage Audit` 同列一致；`acceptance_item` 只作为断言覆盖表内的事实行。
- 不扩展模板字段：`verification_status`、`execution_ref`、`recording_status`、`evidence_type` 等保持在 `Assertion` 记录层；`acceptance_item` 表只记录事实项、观察值、证据引用和覆盖结果。
- `assertion_ref` 必须直接回指 `09-test-case-matrix.md` 的 `positive_assertion`、`negative_assertion`、`visual_assertion`、`negative_visual_assertion` 或 `evidence_required`。
- 当 `assertion_ref = evidence_required` 时，本断言只验收“关闭当前 case 所需证据是否齐全且可审计”，不替代 `positive_assertion` / `negative_assertion` / `visual_assertion` 的业务或视觉结论。`acceptance_item` 必须逐项列出 matrix 要求的证据类型，例如 screenshot、DOM、Network、computed_style、bbox、asset_ref、command、log。
- `verification_status` 与 `recording_status` 必须分开判断：`NOT_EXECUTED` 表示没有完成验证；`EXECUTED + NOT_RECORDED` 表示验证动作完成但没有留下可审计结果；`execution_ref` 必须能定位执行动作，不能只写“已验证”。
- `evidence_type` 必须匹配要求的证据类型。只记录 Network 不能覆盖 UI / DOM / screenshot 要求，只记录截图也不能覆盖 Network / request payload 要求。
- `evidence_ref` 必须是可审计、已持久化的证据引用。允许引用当前 artifacts workspace 内真实存在的截图、JSON、Markdown、log、mock manifest、Network capture 或命令输出文件，必要时带稳定锚点。
- 禁止把 browser viewId、tab id、snapshot ref、console / Network 面板历史、inline screenshot、非 workspace 临时文件、业务代码路径、函数名、行号、组件名、store 方法、DOM selector、computed style 文本、bbox 数值、自然语言总结、cookie、token、完整 response body 或大型 DOM 写入 `evidence_ref`。
- 代码引用只能作为 `observed_value` 的实现说明、`execution_ref` 的定位说明，或新增 `implementation_ref` / `analysis_note`；不能替代证据。
- 禁止把 `.trae/DELIVERY_STATE.md`、全局 Summary、`Verify Case Ledger` 的结论行或一句自然语言总结作为唯一证据关闭 case。
- 允许复用同一浏览器状态、截图或 Network 采集过程，但每个 case、每个复合视觉事实必须有独立 evidence mapping；多个断言共用一条无法区分的泛化证据时均不得 PASS
- `coverage_result = PASS`：`verification_status = EXECUTED`、`recording_status = RECORDED`，证据类型匹配，`evidence_ref` 通过 materialization check，`observed_value` 能支持当前验收项。
- `coverage_result = PASS_WITH_NOTES`：当前验收项已由持久证据闭合，但仍有 design 或 real verify 等非阻断复检内容；必须同步写入 `Pending Recheck Items`。
- `coverage_result = NEEDS_TARGETED_REVIEW`：验证动作或证据链存在定向缺口，例如证据未落盘、证据缺失、类型不匹配、映射未拆细、运行态事实与结论不一致；必须补做验证、补证或重跑，当前 case 不得 PASS。
- `coverage_result = BLOCKED`：当前验收项受不可恢复环境、权限、必需输入或上游合同阻塞，无法在本阶段继续验证。
- 若证据证明运行态视觉事实缺失、仅部分实现或与断言冲突，必须归类为 `CODE_ISSUE`，生成 `code-fix-handoff.md`，修复后复验当前 case；若仅为证据记录缺口，则补证或重跑。

Assertion 拆分标准：

- 简单断言可以只有一行 `acceptance_item`；复合断言必须拆成多行，直到每行都能被一次明确观察独立判断。
- 拆分维度包括但不限于：结构、层级、顺序、显隐、文案、数值、状态、权限、交互结果、无副作用、Network method / path / status / payload、颜色、间距、圆角、尺寸、形态、icon、asset。
- `visual_assertion` / `negative_visual_assertion` 必须把运行态可判断的视觉事实写入覆盖表；不得只写“视觉一致”“样式正确”“整体符合”“主要部分通过”。
- 禁止把包含多个谓词、多个 UI 区域、多个字段、多个状态、多个 API 条件、多个视觉属性或正负向混合条件的断言保留为单个 `acceptance_item`；这类行即使已有截图或 DOM 证据也必须判为 `NEEDS_TARGETED_REVIEW`。
- `negative_assertion` / `negative_visual_assertion` 必须把旧结构、错误颜色、错误 icon、额外容器、错位、重复请求、禁显字段、残留状态等分别列为覆盖表行。
- 同一截图、DOM snapshot 或 Network capture 可以服务多行，但每行必须独立填写 `observed_value`、`evidence_ref` 和 `coverage_result`。

复合 `visual_assertion` / `negative_visual_assertion` 仍保持一个 `assertion_ref`，只在该断言的覆盖表中按最小可独立判断视觉事实增加多行。证据文件可以复用，但每行必须独立填写 `observed_value`、`evidence_ref` 与 `coverage_result`；不得用部分行、整页截图或 notes 推导整条断言通过。无法在 verify 阶段完成 Figma 差异判断时，仍必须记录运行态观察值和后续 `/delivery:design` 复用关系，不能把“设计阶段会看”当作缺失证据的 PASS 理由。

仅 `verification_method = TEST_FIXTURE_SCRIPT` 时，在对应 `Assertion` 下追加：

- `verification_method`: TEST_FIXTURE_SCRIPT
- `fixture_type`: <DOM_FIXTURE / LOGIC_FIXTURE / CONTRACT_FIXTURE>
- `fixture_reason`: <两轮自然 UI 失败或确定性失败证据>
- `fixture_script_ref`: verify-logs/test-fixtures/<case_id>-<语义名>.browser.js / .mjs
- `fixture_result_ref`: <同目录 .result.json 与 .log>
- `fixture_coverage`: <fixture 实际覆盖的 DOM / 接口合同 / 功能逻辑断言；对应覆盖表中的 acceptance_item 行>
- `natural_ui_status`: <两轮尝试摘要或确定性失败>
- `write_mock_gate`: <PASS / NEEDS_TARGETED_REVIEW / BLOCKED / N/A>
- `result_limit`: PASS_WITH_NOTES

#### Pending Recheck Items（待复检项）

`PASS` case 必须写 `N/A`。`PASS_WITH_NOTES` case 必须至少有一条非阻断复检项。`NEEDS_TARGETED_REVIEW` / `BLOCKED` case 必须列出恢复条件和目标证据。

| `recheck_id` | `status` | `trigger_result` | `recheck_stage` | `target_assertion` | `reason` | `required_persistent_evidence` | `resume_point` | `owner` |
|---|---|---|---|---|---|---|---|---|
| <case_id>__recheck__<short_name> | <OPEN / CLOSED / N/A> | <PASS_WITH_NOTES / NEEDS_TARGETED_REVIEW / BLOCKED / N/A> | </delivery:design / real verify / /delivery:mock cleanup / /delivery:verify retry / user input / N/A> | <assertion_ref / N/A> | <复检原因；PASS 写 N/A> | <复检完成时必须落盘的证据路径或类型；PASS 写 N/A> | <恢复入口；PASS 写 N/A> | <main-agent / design-checker / real verifier / user / N/A> |
