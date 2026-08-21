---
description: 在修改流程 skill / agent / command 后，于隔离的 shadow replay workspace 中重跑指定交付阶段，并验证用户提出的问题是否已被新流程解决
---

请按 `.trae/AGENTS.md` 的 Phase Gate Rules 执行 `/delivery:regress`。

## Usage

```text
/delivery:regress --stage <prd|bam|plan|mock|task|code|verify|design> --issue "<用户提出的问题>" --expected "<修复后必须满足的结果>"
/delivery:regress --case .trae/flow-regression-cases/<stage>/<case-id>.md
/delivery:regress --suite daily
```

允许省略参数，但必须从最近对话和变更中推断：

- `--stage`：默认使用最近被修改的 delivery command / skill 对应阶段。
- `--issue`：默认使用用户最近指出的流程失败问题。
- `--expected`：默认使用最近新增规则或用户确认的决策。

无法推断时必须暂停提问，不得伪造验证。

`--case` / `--suite daily` 用于执行已捕获的流程回归用例。普通 skill / command / agent 修改完成时，默认只要求 `/delivery:capture-regression` 记录 case，不强制立即执行本命令；daily suite 负责集中执行和报告。

## Mandatory Precheck

必须读取：

- `.trae/DELIVERY_STATE.md`
- `.trae/skills/09-flow-regression-validation/SKILL.md`
- `.trae/skills/delivery-stage-rewind/SKILL.md`
- `.trae/scripts/delivery_stage_rewind.sh`
- 目标阶段 command，例如 `.trae/commands/delivery:plan.md`
- 目标阶段 skill，例如 `.trae/skills/04-tech-planning/SKILL.md`
- 目标阶段相关 agent，例如 `.trae/agents/tech-planner.md`
- 当前 workspace 的相关阶段产物

## Execute

执行 `flow-regression-validation` skill。

该命令不是普通验证命令。它必须完成：

1. 将用户问题写成 `flow-regression-case.md`。
2. 在当前 workspace 下创建 `flow-regression-replay-index.md`，记录 shadow replay workspace / 可选 shadow execution workspace / 可选 shadow branch / 输入复制清单。
3. 在隔离的 shadow replay workspace 中使用最新流程重跑 `--stage` 指定阶段。
4. 对 shadow replay 产物执行正式阶段 Gate 断言检查。
5. 写入 `flow-regression-report.md`。
6. 输出 `PASS` / `FAIL` / `BLOCKED`。

## Hard Rules

- 禁止只检查旧产物而不重跑阶段。
- 禁止只说“规则已更新”而不输出回归结果。
- 禁止在 regress 中直接 patch 当前 workspace 的真实阶段产物；`flow-regression-case.md`、`flow-regression-report.md`、`flow-regression-replay-index.md` 之外的产物只能写入 shadow replay workspace。
- 禁止在 regress 中复用 active execution workspace / repo root 执行会产生仓库写操作的阶段；若目标阶段可能触发 BAM 同步、mock patch、代码修改、code auto-fix 或其他 execution 写操作，必须建立 shadow execution workspace / worktree。
- 若目标是 `prd` / `bam` / `plan` / `mock` / `task`，shadow replay workspace 的输入保留集与清理语义必须参考 `delivery-stage-rewind` 的 preserve / stale contract，但该语义只能作用于 shadow replay workspace，不得改动 active workspace 或 `.trae/DELIVERY_STATE.md`。
- 如果目标是 `bam`，必须在 shadow replay workspace 中通过最新 `/delivery:bam` / `.trae/skills/bam/SKILL.md` / `.trae/scripts/sync_bam_config_from_tech_doc.mjs` 重跑 BAM 阶段，并检查 replay 版 `bam/bam-link-detection.md`、`bam/bam-sync-report.md`、目标 `bam.config.js` 与 BAM update 结果；PASS 后还必须检查输出是否提示下一阶段 `/delivery:plan` 的两种入口：非 mock-preview `/delivery:plan` 与 mock-preview `/delivery:plan --mock-preview`，并给出推荐入口和选择依据。只有用户明确要求效果预览，或真实后端合同 / 响应 / 联调环境未闭合但 BAM runtime mock 可支撑时，才允许推荐 `--mock-preview`；其余情况默认推荐普通 plan，并明确 mock-preview 不代表真实联调完成。
- 如果目标是 `plan`，必须在 shadow replay workspace 中通过最新 `/delivery:plan` / `04-tech-planning` / `tech-planner` / `writing-plans` 回放 plan 阶段；默认按 repo 只读探索执行，不强制要求 shadow execution worktree / shadow branch。只有当本次 plan replay 明确需要 repo 写操作、依赖恢复、启动服务、BAM 同步或其他 execution 副作用时，才必须建立 shadow execution worktree / shadow branch，并通过 `replay_workspace_override`、可选 `replay_execution_worktree_override`、可选 `replay_branch_override` 透传给 `/delivery:plan`；随后按 `delivery:plan` 的正式 Gate 检查 `Plan Readiness`、`Implementation Mode` 以及 `Main Agent Gate Review` 核心门禁项。
- 如果目标是 `mock`，必须确认当前回归场景为 `Implementation Mode: MOCK_PREVIEW`，或为 `verify` / `design` 的 `SAMPLE_COVERAGE_GAP` 补充取证模式，并在 shadow replay workspace 与 shadow execution workspace 中由主 Agent 以 code / verify / design 的具体 task / case 执行上下文调用最新 `/delivery:mock` 产出 replay 版 `delivery-mock.md` 与 `mock/` 产物；`MOCK_PREVIEW` 继续检查与 replay 版 `09-test-case-matrix.md` 的 case / rule / request key/value / mock key 对齐；`SAMPLE_COVERAGE_GAP` 额外检查 `real_contract_evidence`、`mock-only supplemental evidence`、`supplemental_assertions`、`forbidden_contract_assertions`、`mock_debug_param` 与 `cleanup_status` 是否被完整记录且未被 mock 覆盖，并确认移除 debug 参数后的复查已执行。若 manifest 存在 `requestFields[].kind = "wrapper_request_mapping"`，必须复查目标 BAM wrapper 的 `BAM_MOCK_WRAPPER_FIELD` marker、字段表达式和最终 `[BAM_MOCK_HIT]` requestBody 中的字段 / 值，不得把 wrapper 字段透传补丁误判为需要回 `/delivery:plan`。其余非 `MOCK_PREVIEW` 场景不得以目标 `mock` 执行 `/delivery:mock`，应回归对应 task/code/verify/design 阶段的 `N/A` 处理。
- 如果目标是 `task`，必须在 shadow replay workspace 中通过最新 `/delivery:task` / `09-task-planning` / `10-test-case-planning` 产出 replay 版 `delivery-task.md` 与 `09-test-case-matrix.md`；并按 `delivery:task` 的正式 Gate 检查 `Task Readiness`、`Coverage Result`、`Mock Closure` 与 mock `N/A` 规则。
- 如果目标是 `code`，必须先确认 replay 版 plan/task 满足正式 Gate，并在 shadow execution workspace 回放；矩阵缺规则时返回 `/delivery:task`，已有 rule 需补充时只更新 `补充说明`，不得写 `delivery-mock.md`；非 `MOCK_PREVIEW` 下 mock 产物缺失不得阻塞。
- 如果目标是 `verify`，必须在 shadow execution workspace 中通过最新 `/delivery:verify` / `06-debug-verification` 重跑验证阶段，并检查：`Verify Case Queue`、`Verify Case Ledger`、`Case Evidence Coverage Audit`、case block 记录、`/delivery:mock` detour 边界、code auto-fix handoff 边界，以及 `runtime-runner` 不承接 case 验证、只返回运行时 / 命令 / 日志 / 机械证据。若命中非 `MOCK_PREVIEW` 的 `SAMPLE_COVERAGE_GAP`，还必须检查 `real_contract_evidence` 与 `mock-only supplemental evidence` 并列存在，且 mock 没有覆盖真实 contract 断言。case PASS 但无证据对账、证据类型不匹配、证据只引用 Summary / `.trae/DELIVERY_STATE.md`、多个 case 共用一条无法区分的泛化证据，或把未验证与未记录合并成“证据不足”，均必须判定回归失败。
- 如果目标是 `design`，必须在 shadow replay workspace 中通过最新 `/delivery:design` / `07-design-alignment` / `design-checker` 重跑设计对齐，并按正式 Gate 检查 replay 版 `07-design-alignment.md`、`04-tech-plan.md` handoff 与 `DELIVERY_STATE` handoff 状态；`MOCK_PREVIEW` 下 mock 根因必须走 `MOCK_AUTO_FIX` 并由主 Agent 调用 `/delivery:mock` 后恢复原 design case；非 `MOCK_PREVIEW` 下若命中 `SAMPLE_COVERAGE_GAP`，必须检查补充取证只覆盖样本依赖的视觉 / 状态证据，且 `real_contract_evidence` 与 `mock-only supplemental evidence` 并列存在；可执行 BLOCKER 必须在当前 design 阶段内写入 Design Rework Task、派发 `code-writer`、完成最小验证、更新 `05-implementation-log.md` 并复跑原 design case；除 `SAMPLE_COVERAGE_GAP` 外，非 `MOCK_PREVIEW` 下缺 mock 仍不得阻塞 design，也不得成为设计 BLOCKER 或 `/delivery:mock` detour。
- 若重跑会覆盖关键产物，必须采用增量更新；禁止全量重写事实文档。
- 如果使用 `--suite daily`，必须读取 `.trae/flow-regression-cases/index.json` 和 `.trae/flow-regression-cases/**/*.md`，优先选择最近新增、最近失败、P0/P1、`STATIC_ASSERTION`、`ARTIFACT_ASSERTION_ONLY` 和少量稳定 `SHADOW_REPLAY_LIGHT` 用例；默认跳过 `SHADOW_REPLAY_HEAVY` 与 `MANUAL_CONTEXT_REQUIRED`，除非它们最近失败或用户显式选择。daily 结果写入 `.trae/flow-regression-runs/YYYY-MM-DD.md`。
- 如果使用 `--case`，必须按 case 的 `Replay Mode` 决定执行方式；`MANUAL_CONTEXT_REQUIRED` 只输出待人工复核，不得伪造 PASS。

## Required Artifacts

当前 workspace 下必须写入：

- `flow-regression-case.md`
- `flow-regression-report.md`
- `flow-regression-replay-index.md`

`--suite daily` 还必须写入：

- `.trae/flow-regression-runs/YYYY-MM-DD.md`

## Output

最终回复必须包含：

- Target Stage
- Regression Result
- Shadow Replay Workspace / Shadow Execution Workspace / Shadow Branch
- 通过 / 失败的关键断言
- 修改或重跑的产物文件
- Active Workspace Mutation Check
- 若失败，下一步应该修哪个流程文件或阶段产物
