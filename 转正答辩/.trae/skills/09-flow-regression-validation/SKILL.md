---
name: flow-regression-validation
description: Use when a delivery skill, agent, command, or process rule was changed after a user-reported workflow failure and the same stage must be replayed to prove the issue is fixed.
context: fork
---

# Flow Regression Validation

## Purpose

验证“流程修改是否真的生效”。当用户指出 `/delivery:prd`、`/delivery:plan`、`/delivery:mock`、`/delivery:task`、`/delivery:code` 等阶段没有达到预期，且主 Agent 修改了 skill / agent / command 后，必须用本 skill 把用户问题转成回归用例，并用新流程重跑对应阶段。

该 skill 不验证业务代码本身是否最终正确；它验证“新的流程规则能否阻止同类问题再次发生”。

流程问题沉淀分两步：`/delivery:capture-regression` 只记录用例，默认不重跑、不阻塞当前流程修改；`/delivery:regress` 才按单 case、目标阶段或 suite 执行回归验证。

## Trigger

必须使用本 skill 的场景：

- 用户指出某阶段没有按预期执行，随后主 Agent 修改了 `.trae/skills/**`、`.trae/agents/**` 或 `.trae/commands/**`。
- 用户要求“重新执行 plan / code 看看问题是否修复”。
- 用户质疑“为什么改了 skill 但还是没按规则执行”。
- 用户要求验证一个新流程规则，例如 Figma-first、Switcher Impact Contract、Mock Preview、PRD Logic Coverage。
- 用户执行 `/delivery:regress --case <case-file>` 或 `/delivery:regress --suite daily`。

不适用：

- 只验证代码 build / lint / mock-debug，使用 `debug-verification`。
- 只做最终交付审查，使用 `delivery-acceptance`。
- 用户只是询问规则含义，或只要求捕获 case 而不要求重跑阶段；此时使用 `/delivery:capture-regression`。

## Capture vs Replay Policy

修改 `.trae` 流程规则时，默认只要求捕获 regression case，不强制立即 replay。这样 skill / command / agent 的修复不会被重型回归拖慢。

必须立即执行 `/delivery:regress` 的情况：

- 用户明确要求现在验证 / 重跑 / regress。
- 修改的是 `/delivery:regress` 自身、flow regression case schema、全局 Gate、状态机核心路由或角色批量重命名。
- 发布 / 合并前需要流程回归证明。

可以只记录、由 daily suite 后续执行的情况：

- 单个阶段规则补充。
- agent 边界小调整。
- 输入宽松度 / 文档字段要求调整。
- code 阶段上下文过大且只能稳定断言流程边界。

回归执行成本分级：

| mode | 执行方式 | 默认策略 |
|---|---|---|
| `STATIC_ASSERTION` | grep / 静态文件断言 | daily 默认跑 |
| `ARTIFACT_ASSERTION_ONLY` | 只检查阶段产物结构和 Gate 断言 | daily 默认跑 |
| `SHADOW_REPLAY_LIGHT` | shadow workspace 重跑轻阶段 | daily 挑 P0 / 最近失败 |
| `SHADOW_REPLAY_HEAVY` | verify / design / mock / code 等运行态重放 | targeted / weekly / 用户确认 |
| `MANUAL_CONTEXT_REQUIRED` | 只记录人工复现说明 | daily 只列 pending |

## Mandatory Inputs

必须读取：

- `.trae/AGENTS.md`
- `.trae/DELIVERY_STATE.md`
- `.trae/skills/delivery-stage-rewind/SKILL.md`
- `.trae/scripts/delivery_stage_rewind.sh`
- 被验证阶段的 command，例如 `.trae/commands/delivery/plan.md`
- 被验证阶段的 skill，例如 `.trae/skills/04-tech-planning/SKILL.md`
- 被验证阶段可能委派的 agent，例如 `.trae/agents/tech-planner.md`
- 当前 workspace 下与该阶段相关的产物，例如：
  - `03-prd-analysis.md`
  - `prd-figma-supplement.md`
  - `04-tech-plan.md`
  - `05-implementation-log.md`
  - `decision-log.md`
  - `uncertainty-register.md`

必须明确：

- `target_stage`：要重跑的阶段，如 `prd`、`bam`、`plan`、`mock`、`task`、`code`、`verify`、`design`。
- `user_issue`：用户提出的原问题。
- `expected_fix`：流程修改后必须满足的预期。

如果用户没有给出明确 `target_stage`，根据最近修改的 command / skill 推断；无法推断时暂停提问。

当使用 `--case` 时，必须读取指定 case 文件，并从其中取得 `Target Stage`、`Replay Mode`、`Assertions`、`Minimal Replay Context` 和 `Expected Behavior`。

当使用 `--suite daily` 时，必须读取 `.trae/flow-regression-cases/index.json`（如存在）和 `.trae/flow-regression-cases/**/*.md`，按优先级选择 case：

1. 最近新增或最近失败。
2. P0 / P1。
3. `STATIC_ASSERTION` 与 `ARTIFACT_ASSERTION_ONLY`。
4. 少量稳定的 `SHADOW_REPLAY_LIGHT`。
5. `SHADOW_REPLAY_HEAVY` 默认跳过，除非最近失败或用户显式选择。
6. `MANUAL_CONTEXT_REQUIRED` 只列入 pending manual review。

## Replay Isolation Contract

回归验证必须采用“双工作区隔离”：

- `active workspace`：`.trae/DELIVERY_STATE.md` 中当前真实 workspace。这里只允许写：
  - `flow-regression-case.md`
  - `flow-regression-report.md`
  - `flow-regression-replay-index.md`
- `shadow replay workspace`：位于当前 workspace 下的隔离回放目录，推荐：
  - `flow-regression-shadow/<target_stage>-<timestamp>/artifacts/`
- `shadow execution workspace`：仅当目标阶段可能触发 execution 写操作时创建；不得复用 active execution workspace / repo root。
- `shadow branch`：仅当存在 `shadow execution workspace/worktree` 时创建，推荐：
  - `shadow/regress-<target_stage>-<timestamp>`

必须满足：

- 禁止在 regress 中直接修改 active workspace 的真实阶段产物。
- 禁止为了“让断言通过”而手工 patch replay 版阶段产物；若流程规则仍需补丁，只能修改 `.trae/commands/**`、`.trae/skills/**`、`.trae/agents/**` 后重新 replay，且受预算限制。
- `prd` / `bam` / `plan` / `mock` / `task` 的 shadow replay 输入保留集、stale 清理语义、恢复来源与文件边界，必须参考 `delivery-stage-rewind` 的 preserve / stale / snapshot contract，但该语义只能作用于 shadow replay workspace，不得改写 active workspace 或 `.trae/DELIVERY_STATE.md`。
- 若目标阶段可能触发 BAM 同步、mock patch、业务代码修改、code auto-fix、dev server 或浏览器运行态 detour，必须建立 shadow execution workspace / worktree，并在 `flow-regression-replay-index.md` 记录：
  - active workspace
  - shadow replay workspace
  - shadow execution workspace
  - shadow branch
  - copied / recovered inputs
  - replay command chain
  - active workspace mutation check
- `target_stage = plan` 默认视为“repo 只读探索 + shadow artifacts 落盘”场景：若本次 replay 不涉及 repo 写操作、依赖恢复、启动服务、BAM 同步或其他 execution 副作用，则不强制要求 shadow execution workspace / shadow branch，也不得仅因当前环境不能写 git metadata 就判为 BLOCKED。

## Regression Case Contract

重跑前必须先把用户问题写成可检查断言，落盘到 active workspace：

```md
# Flow Regression Case

## Target Stage

## User Issue

## Changed Process Files

## Replay Inputs

## Regression Assertions
| id | assertion | evidence_file | pass_condition | fail_condition |
|---|---|---|---|---|
```

默认文件名：

- `flow-regression-case.md`
- `flow-regression-replay-index.md`

断言要求：

- 不能只写“按 Figma 执行”这类泛化表述。
- 必须写成能在阶段产物中检查的条件。
- 每个断言必须指定 evidence file。
- 对存在正式阶段 Gate 的目标阶段，断言至少覆盖对应 command 中的核心 Gate 字段；不得只写“结构大致正确”这类弱断言。

例：

```md
| A1 | plan 必须包含 Switcher Impact Contract | 04-tech-plan.md | 存在章节且覆盖业务域 Select | 缺章节或只写本地 state |
| A2 | KA 主态必须保持原页面 | 04-tech-plan.md | KA 使用 TASKIZE_LEGACY_MAIN_STATE | KA 被写成 skeleton 或复用 scale 主态 |
```

## Replay Protocol

按目标阶段执行最新流程，而不是只搜索现有产物。

统一步骤：

1. 在 active workspace 写入 `flow-regression-case.md`。
2. 创建 `flow-regression-replay-index.md`，记录 shadow replay workspace、shadow execution workspace、复制输入、恢复输入和 replay 命令链。
3. 在 shadow replay workspace 中准备 replay 输入；对 `prd` / `bam` / `plan` / `mock` / `task`，复用 `delivery-stage-rewind` 的保留/清理语义，但不改 active workspace。
4. 若目标阶段可能触发 execution 写操作，在 shadow execution workspace / worktree 中完成 replay；必要时创建 shadow branch，并禁止复用 active execution workspace / active branch。`plan` 阶段默认不属于这一类，除非当前 replay 明确需要 repo 写操作或其他副作用。
5. 只通过“最新阶段 command + skill + agent”回放阶段；若阶段支持 replay override，必须把 `replay_workspace_override`、可选 `replay_execution_worktree_override`、可选 `replay_branch_override` 透传到底层阶段；禁止手工 patch replay 版阶段产物来伪造通过。
6. 对 replay 版产物执行回归断言与正式阶段 Gate 检查。

### `Replay Mode = STATIC_ASSERTION`

只检查 `.trae` 流程文件，不创建 shadow replay workspace。

允许检查：

- 旧标识符是否消失。
- 新角色 / command / skill 是否存在。
- 禁止路径是否仍被引用。
- 关键边界语句是否存在。

禁止把 static assertion 的 PASS 解释为阶段业务验证通过。

适用的分层静态化模式：

- 当一个流程 bug 可以拆成“规则是否存在”和“固定证据是否会被正确判定”两层时，优先拆成：
  - `L1 = STATIC_ASSERTION`：只校验 command / skill / agent / `AGENTS.md` 是否存在目标规则。
  - `L2 = ARTIFACT_ASSERTION_ONLY`：只消费固定 artifact 或固定图对，不再建立 shadow replay workspace。
- `L1` 的 PASS 只代表规则文本已落地，不代表该规则已经在证据判断上生效。

### `Replay Mode = ARTIFACT_ASSERTION_ONLY`

只读取 active workspace 或 case 指定的 artifacts，检查产物结构、Gate 断言、detour 记录和 evidence mapping。

必须明确写出：

- 检查的 artifact 文件。
- 每条断言的 evidence file。
- 为什么该 case 不需要完整阶段 replay。

对 design / verify 的 screenshot-first、scope-match、evidence-materialization 一类问题，若已存在稳定的 Figma screenshot、runtime screenshot 和阶段报告，可把它们固定成 `ARTIFACT_ASSERTION_ONLY` 输入：

- 允许把 Figma screenshot path、runtime screenshot path、相关 artifact path 写进 case 的 `Minimal Replay Context`。
- 允许断言“固定图对 + 固定合同”必须导向某个结论，例如 `VISIBLE_MISMATCH`、`NEEDS_TARGETED_REVIEW`、`BLOCKED_NEEDS_FIGMA_SOURCE`。
- 不得把这类静态 case 伪装成对当前业务代码实时正确性的验证；它只证明“流程对这组稳定证据的判定路径是正确的”。

### `Replay Mode = SHADOW_REPLAY_LIGHT / SHADOW_REPLAY_HEAVY`

按目标阶段执行对应 replay protocol。`SHADOW_REPLAY_HEAVY` 涉及浏览器、dev server、BAM mock、业务代码修改或 execution workspace 时，必须建立 shadow execution workspace / branch，并记录 active workspace mutation check。

### `Replay Mode = MANUAL_CONTEXT_REQUIRED`

不得伪造 PASS。只输出 `PENDING_MANUAL_REVIEW`，并在报告中列出人工复现条件、必要产物和为什么不能自动 replay。

### `target_stage = plan`

必须执行：

1. 读取 `/delivery:plan` command、`04-tech-planning` skill、`tech-planner` agent、`writing-plans` skill。
2. 在 shadow replay workspace 中使用最新流程回放 `plan` 阶段。默认只要求 shadow artifacts 落盘和 repo 只读探索，不强制创建 shadow execution worktree / shadow branch。只有当 repo 侧探索、命令证据或其他子步骤明确需要写 repo、装依赖、起服务、做 BAM 同步或保留 execution diff 时，才必须同时创建 shadow execution worktree / shadow branch，并通过 `replay_execution_worktree_override` / `replay_branch_override` 透传给 `/delivery:plan`。
3. 不得绕过 `writing-plans`，也不得手工 patch replay 版 `04-tech-plan.md`。
4. 对 replay 版 `04-tech-plan.md` 执行 `delivery:plan` 的正式 Gate 检查，至少包括：
   - `Plan Readiness`
   - `Implementation Mode`
   - `Main Agent Gate Review` 核心门禁项
5. 若断言涉及 `MOCK_PREVIEW`，必须检查 Code只更新 BAM矩阵 `补充说明`，且 `delivery-mock.md` 只由 `/delivery:mock` 写入。
6. 对 `flow-regression-case.md` 的每条断言检查 replay 版 `04-tech-plan.md`。

### `target_stage = mock`

必须执行：

1. 读取 `/delivery:mock` command、`bam-mock-runtime-generator` skill 和 `04-tech-plan.md`。
2. 在 shadow replay workspace 与 shadow execution workspace 中使用接口级流程重跑 replay 版 `delivery-mock.md` 与 `mock/` 产物。
3. 检查 replay 版 `delivery-mock.md`、`mock/rule-map.json`、`mock/rule-map.md` 与每接口 `manifest.json` 是否与 plan 中 requirement / 字段 / response path 对齐。
4. 不得通过业务代码 fixture、fallback store、preview service 或 fake success 满足断言。
5. 对 `flow-regression-case.md` 的每条断言检查 replay 版 mock 产物。

### `target_stage = task`

必须执行：

1. 读取 `/delivery:task` command、`09-task-planning` skill、`10-test-case-planning` skill、`04-tech-plan.md` 和 `delivery-mock.md`（如 `MOCK_PREVIEW`）。
2. 在 shadow replay workspace 中使用最新流程产出 replay 版 `delivery-task.md` 与 `09-test-case-matrix.md`。
3. 不得跳过 `test-case-planning`，也不得手工 patch replay 版 `delivery-task.md` 或 `09-test-case-matrix.md`。
4. 对 replay 版产物执行 `delivery:task` 的正式 Gate 检查，至少包括：
   - `Task Readiness`
   - `Coverage Result`
   - `Mock Closure`
   - 非 `MOCK_PREVIEW` 下的 mock `N/A` 规则
5. 对 `flow-regression-case.md` 的每条断言检查 replay 版 `04-tech-plan.md`、`delivery-task.md` 与 `09-test-case-matrix.md`。

### `target_stage = code`

必须执行：

1. 读取 `/delivery:code` command、`05-code-implementation` skill、`executing-plans` skill。
2. 先在 shadow replay workspace 中审查 replay 版 `04-tech-plan.md` 与 `delivery-task.md` 是否满足正式 Gate 与回归断言。
3. 若 plan / task 不满足，停止并返回 `REGRESSION_FAIL_UPSTREAM_NOT_READY`，不得修改任何真实业务代码。
4. 若上游满足，再按最新 `/delivery:code` 流程在 shadow execution workspace 中执行限定实现。
5. 检查 replay 版 `05-implementation-log.md` 和 shadow execution workspace 中的代码 diff 是否满足回归断言。

### `target_stage = prd`

必须执行：

1. 读取 `/delivery:prd` command、`03-prd-analysis` skill、`prd-analyzer` agent、`prd-figma-supplementor` skill。
2. 在 shadow replay workspace 中重跑 PRD 阶段产物。
3. 检查 replay 版 `03-prd-analysis.md`、`prd-figma-supplement.md`、`uncertainty-register.md`。

### `target_stage = bam`

必须执行：

1. 读取 `/delivery:bam` command、`.trae/skills/bam/SKILL.md`、`.trae/scripts/sync_bam_config_from_tech_doc.mjs`。
2. 读取 active workspace 的 `tech-doc-raw.md`、`repo-routing.md`、`bam/bam-link-detection.md`（如存在）和 `bam/bam-sync-report.md`（如存在），并在 shadow replay workspace / shadow execution workspace 中准备 replay。
3. 使用最新流程在 shadow replay workspace 中重跑 replay 版 `bam/bam-sync-report.md`；不得只复查旧报告。
4. 检查回归断言是否覆盖：
   - 是否根据当前仓库命令协议唯一确定 repo root、目标 app/package 和 BAM 命令入口。
   - 是否正确重放 `bam.config.js` 同步与 BAM update。
   - 当 BAM update 输出 `Welcome to bam v1` / `remote:org/repo#branch` 时，是否先触发 `.trae/PROJECT_CONTEXT.md` 中的 `install_command` 完成依赖恢复，再按相同命令优先级重试一次。
   - 是否在命令不通、依赖缺失或 generator 未命中时产出正确 blocker，而不是继续走错阶段。
   - PASS 后是否提示下一阶段 `/delivery:plan` 的两种入口：非 mock-preview `/delivery:plan` 与 mock-preview `/delivery:plan --mock-preview`，并给出推荐入口和选择依据。
   - 推荐是否遵守明确判据：用户明确要求效果预览，或真实后端合同 / 响应 / 联调环境未闭合但 BAM runtime mock 可支撑时才推荐 `--mock-preview`；其余情况默认普通 plan，且不得把 mock-preview 描述为真实联调完成。
5. 对 `flow-regression-case.md` 的每条断言检查 replay 版 `bam/bam-sync-report.md`、相关 BAM 证据与目标配置文件。

### `target_stage = verify`

必须执行：

1. 读取 `/delivery:verify` command、`06-debug-verification` skill；只有目标回归明确涉及子 Agent 委派边界时才读取 `runtime-runner` agent。
2. 在 shadow execution workspace 中按最新环境协议执行验证。
3. 检查 replay 版 `06-debug-verification.md` 和命令证据，且必须满足 `delivery:verify` 的正式 case queue / case ledger / detour 边界。
4. 检查 replay 版 `06-debug-verification.md` 是否包含 `Verify Case Ledger` 和 `Case Evidence Coverage Audit`。
5. 对每个 executed case，必须确认：
   - 能从 `09-test-case-matrix.md` 反查到同一 `case_id`，且 `verification_stage` 为 `verify` / `verify+design` / `verify+accept`。
   - `positive_assertion`、`negative_assertion`、`evidence_required` 均有对应 `case_id + assertion_ref` 记录。
   - `Case Evidence Coverage Audit` 使用当前 verify skill 固定列：`case_id`、`evidence_requirement_id`、`assertion_ref`、`verification_status`、`execution_ref`、`recording_status`、`evidence_type`、`evidence_ref`、`coverage_result`；其中 `evidence_requirement_id = case_id + assertion_ref`，不得包含 `acceptance_item`，也不得要求全局 Audit 额外包含 `evidence_source`、`observed_value` 或 `acceptance_item`。
   - 每个 executed case 必须能从 `Case Result Index` 打开对应 `verify-logs/case-results/<case_id>.md`，并在 `Evidence Reconciliation` 中按 `Assertion` 记录 `case_id`、`evidence_requirement_id`、`assertion_ref`、`verification_status`、`execution_ref`、`recording_status`、`evidence_type`、`coverage_result`；每个 `Assertion` 的覆盖表必须包含 `acceptance_item`、`observed_value`、`evidence_ref`、`coverage_result`。
   - 组合证据已按断言或证据类型拆分；例如 `Network+反馈 UI` 至少有 `evidence_required:Network` 和 `evidence_required:UI` 两个 `assertion_ref`，复合视觉断言则保持一个 `visual_assertion` / `negative_visual_assertion`，在覆盖表中拆分 `acceptance_item` 行。
6. 以下情况必须判定回归失败：case PASS 但无证据对账、证据类型不匹配、证据只引用 Summary / `.trae/DELIVERY_STATE.md`、多个 case 共用一条无法区分的泛化证据、required evidence 缺失但 Gate 仍进入下一阶段。
7. 必须分别检查 `Not Verified Items` 与 `Evidence Not Recorded Items`：前者只能由 `verification_status = NOT_EXECUTED` 产生，后者只能由 `EXECUTED + NOT_RECORDED` 产生；若二者仍被合并成“证据不足”，回归失败。

### `target_stage = design`

必须执行：

1. 读取 `/delivery:design` command、`07-design-alignment` skill、`design-checker` agent。
2. 在 shadow replay workspace 中按最新设计对齐流程重跑 replay 版 `07-design-alignment.md`。
3. 如果存在 `MOCK_PREVIEW` 下的 `MOCK_ISSUE`，必须检查主 Agent 是否在当前 design 阶段内调用 `/delivery:mock` 更新 replay 版 mock 产物 / BAM marker / wrapper request 字段透传，并在审查 PASS 后恢复原 design case 重取证据继续。
4. 如果存在 BLOCKER，必须检查 replay 版 `07-design-alignment.md` 是否写入 `Design Rework Task Draft`。
5. 如果存在可执行 BLOCKER，须检查 replay 版 `delivery-task.md` 是否增量写入对应 `Design Rework Task`，逐条映射 BLOCKER ID、允许修改文件、禁止修改文件、checkbox step、验证命令和预期结果，并派发 `code-writer` 完成单切片修复。
6. 检查修复后是否完成最小验证、更新 replay 版 `05-implementation-log.md`、复跑原 design case / BLOCKER，并继续 design；不得把可执行返工标记为 BLOCKED 或只建议“回到 `/delivery:code`”。
7. 检查 shadow replay 的阶段状态记录（例如隔离复制的 `DELIVERY_STATE` 快照或等价 replay state）是否反映 handoff / BLOCKED 状态；不得把未关闭 BLOCKER 标记为可进入 `/delivery:accept`。

## Report Contract

重跑后必须写入：

- `flow-regression-report.md`
- `flow-regression-replay-index.md`

当使用 `--suite daily` 时，还必须写入：

- `.trae/flow-regression-runs/YYYY-MM-DD.md`

当使用 `--case` 时，不必重新生成 active workspace 的 `flow-regression-case.md`；可以在 `flow-regression-report.md` 中引用 case 文件路径，但必须保留本次执行的 assertion results。

格式：

```md
# Flow Regression Report

## Result
PASS | FAIL | BLOCKED

## Target Stage

## Replay Isolation
- Active Workspace:
- Shadow Replay Workspace:
- Shadow Execution Workspace:
- Active Workspace Mutation Check:

## Replayed With Latest Process
| file | role | checked |
|---|---|---|

## Assertion Results
| id | assertion | result | evidence | notes |
|---|---|---|---|---|

## Residual Risk

## Required Follow-up
```

判定规则：

- `PASS`：所有断言满足，阶段产物来自最新流程，且 active workspace 的真实阶段产物未被 regress 改写。
- `FAIL`：任一断言失败，或阶段仍按旧错误路径输出，或 active workspace 被错误改写。
- `BLOCKED`：缺少输入、环境或用户决策，无法完成重跑。

## Budget

默认预算：

- 读取流程文件：最多 8 个。
- 读取阶段产物：最多 10 个。
- 重跑阶段：1 次。
- 修复流程规则：最多 1 轮小补丁。
- 断言复查：最多 2 轮。

超过预算必须暂停，输出当前 `flow-regression-report.md`，不得无限修改规则。

## Stop Conditions

必须停止并报告：

- 目标阶段不明确且无法从上下文推断。
- 用户问题无法转成可检查断言。
- 重跑阶段需要修改业务代码，但用户只要求验证流程。
- 回归失败需要继续改流程；只能做 1 轮小补丁，之后必须向用户报告失败点。
- 无法建立 shadow replay workspace，或目标阶段需要 execution 隔离但无法建立 shadow execution workspace。
- 回放协议要求隔离执行，但当前方案会覆盖 active workspace 或 active execution workspace 的关键产物。

## Required User-Facing Summary

最终回复必须包含：

- 验证的阶段。
- 原问题被转成了哪些关键断言。
- 新流程重跑后的结果：PASS / FAIL / BLOCKED。
- Shadow Replay Workspace / Shadow Execution Workspace 与 Active Workspace Mutation Check。
- 失败时指出哪个规则或产物仍不满足。

禁止只说“已经更新 skill”。必须说明是否通过回归验证。
