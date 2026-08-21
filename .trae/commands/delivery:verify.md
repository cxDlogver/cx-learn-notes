---
description: 执行前端调试验证：按测试矩阵逐 case 验证运行态、命令检查、mock / integration 证据，并在安全边界内完成 code 或 mock 修复闭环。
argument-hint: [--mtr]
---

请按 `.trae/AGENTS.md` 的 Phase Gate Rules 执行 `/delivery:verify`，并完整执行 `.trae/skills/06-debug-verification/SKILL.md`。本命令只定义入口、必读输入和阶段边界；verify 的详细执行规则以 skill 为唯一准绳。

## Required Inputs

必须读取：

- `.trae/AGENTS.md`
- `.trae/PROJECT_CONTEXT.md`
- `.trae/DELIVERY_STATE.md`
- 当前 workspace 下的 `04-tech-plan.md`
- 当前 workspace 下的 `05-implementation-log.md`
- 当前 workspace 下的 `09-test-case-matrix.md`
- 当前 workspace 下的 `delivery-mock.md`（仅 `Implementation Mode: MOCK_PREVIEW` 且文件存在时）
- `.trae/skills/06-debug-verification/SKILL.md`

如果缺少实现记录或测试矩阵，不得伪造验证结论，必须标记 `BLOCKED` 并返回上游阶段补齐。

## Arguments

- `--mtr`：Mock-To-Real Recheck，只能用于当前 workspace 仍为 `Implementation Mode: MOCK_PREVIEW` 时的真实环境复测。该模式必须从 `Mock / Real Boundary`、`real verify` 列和 `delivery-mock.md` 回收项列出待复测 case；真实复测前必须先对目标 app 执行 `bam update`（优先使用 app 本地 `bam` 脚本，或等价 `npx bam update --remove-folder`）清理 BAM mock 后再跑真实环境。高风险写接口不得真实写入后端，只能使用浏览器层安全拦截并记录为 `PASS_WITH_NOTES` safety evidence，真实副作用未验证写入 `remaining_real_gap`，不作为阶段继续 blocker。

## Canonical Rules

- 逐 case 闭环、证据字段、detour 恢复和归档语义遵守 `.trae/AGENTS.md` 的 `Shared Case Evidence Closure Protocol`。
- verify 阶段的主线、ownership、baseline、效率优化、failure triage、报告结构、auto-fix、`MICRO_CODE_FIX`、mock detour 和 Gate 细则均以 `.trae/skills/06-debug-verification/SKILL.md` 为准。
- 本入口不得扩展或覆盖 skill 细则；若发现冲突，以 `.trae/AGENTS.md` 的全局硬约束和 `.trae/skills/06-debug-verification/SKILL.md` 的阶段细则为准，并同步修正本文件。

## Execution Summary

执行时保持以下最小阶段边界：

1. 主 Agent 串行拥有 Verify Case Queue；`runtime-runner` 只可做 dev server / HMR / health check / 明确命令 / 日志归纳 / 机械证据辅助，不得执行 / 关闭 case。
2. 建立队列前，先把 `05-implementation-log.md ## 待验证项` 与 `09-test-case-matrix.md` 合并审计；缺 case 或断言不足时直接按 `test-case-planning` 规则受限补全 `09-test-case-matrix.md`，不得返回 `/delivery:task`。
3. 从 `09-test-case-matrix.md` 消费 `verification_stage = verify / verify+design / verify+accept` 的 case，并确保队列覆盖所有 code 阶段待验证项；按 `case_batch_key` 复用状态但逐 case 记录结论。
4. 队列与 case-result 初始化落盘后，再执行 Preflight / 环境启动 / 浏览器运行态探测；随后运行阶段级 baseline，生成 `baseline_snapshot`；修复后按 skill 的 incremental rerun policy 复验。
5. 每个 case 必须对 `positive_assertion`、`negative_assertion`、`visual_assertion`、`negative_visual_assertion`、`evidence_required` 做 evidence mapping；verify 截图只能作为 runtime source，不得声明 Figma-vs-Runtime 对齐通过。
6. `CODE_ISSUE` / `TYPE_ISSUE` / `BUILD` 只允许通过 `code-fix-handoff.md` -> 受限 `/delivery:code` -> 当前 case 复验闭环；`MOCK_PREVIEW` 下的 `MOCK_ISSUE` 只允许通过 `/delivery:mock` detour 修复；非 `MOCK_PREVIEW` 下当基础真实链路或接口合同已明确且失败分类为 `SAMPLE_COVERAGE_GAP` 时，允许通过 `/delivery:mock` 临时构造样本补充状态证据，且不得替代真实 request / response 合同验证。该路径必须显式带 `mock_debug_param`，并在当前 case 关闭后立刻删除临时 mock 代码 / 产物并移除 debug 参数复查。
7. 只有全部必需 case、code 阶段待验证项、baseline 风险分类和证据覆盖审计均闭合，才允许进入 `/delivery:design`。

## Output

更新当前 workspace 的 `06-debug-verification.md`，至少包含 skill 要求的 Summary、Environment / Baseline Checks、Pending Verification Merge Audit、Verify Case Ledger、Case Result Index、Runtime Screenshot Evidence Index、Case Evidence Coverage Audit、Evidence Index、Failures / Detours 和 Gate Recommendation。

`Runtime Screenshot Evidence Index` 必须记录 `case_id`、`runtime_state`、`capture_scope`、`screenshot_path`、`verify_screenshot_key`、`sample_ref`、`dom_anchor`、`state_match_hints`、`design_reuse_note`、`materialization_type`、`result`。凡 `verify+design`、`evidence_required` 包含截图 / computed style / Figma，或 `design_reuse_policy != N/A` 的 case，都必须写入该索引；无可复用截图时也要写不可复用原因。
