# Flow Regression Case

## Case ID

code-review-performance-packet

## Target Stage

code

## Original Issue

Code 阶段的独立审查在普通 Task 完成后容易重复读取完整 `04-tech-plan.md`、`delivery-task.md`、`09-test-case-matrix.md` 和大段日志，并重复运行 `code-writer` 已在最终 diff 后执行过的 typecheck / test，导致审查慢，但用户要求不降低审查严格度。

## Expected Behavior

`/delivery:code` 必须通过 `Task Context Index` 和 `Task Review Packet` 提升审查效率：主 Agent 先整理当前 Task 的合同、证据、targeted diff、机械检查和命令 freshness；独立 reviewer 默认先读 packet + targeted diff，只有缺证据、冲突、stale command 或高风险扩散时才扩大回读全文或要求重跑命令。普通 Task 的独立只读审查、UI evidence、mock boundary、scope / contract / verification 检查不能被跳过。

## Changed Process Files

- `AGENTS.md`
- `commands/delivery/code.md`
- `skills/05-code-implementation/SKILL.md`
- `docs/delivery-framework-flow.md`

## Related Tags

- stage: code
- contracts: task-context-index, task-review-packet, independent-review, verification-freshness
- agents: code-writer, runtime-runner, independent-reviewer
- commands: delivery:code
- cost: low
- priority: P1

## Replay Mode

STATIC_ASSERTION

## Minimal Replay Context

- required_artifacts: none
- required_case: static scan of `.trae` process files
- optional_runtime: none

## Assertions

| id | assertion | evidence_file | pass_condition | fail_condition |
|---|---|---|---|---|
| A1 | Code flow defines `Task Context Index`. | `commands/delivery/code.md`, `skills/05-code-implementation/SKILL.md` | Both files mention `Task Context Index`. | Either file lacks the term. |
| A2 | Code flow defines `Task Review Packet` before independent review. | `commands/delivery/code.md`, `skills/05-code-implementation/SKILL.md` | Both files mention `Task Review Packet` and targeted diff. | Reviewer input can be full-doc only, or packet is absent. |
| A3 | Independent reviewer still checks strict dimensions. | `commands/delivery/code.md`, `skills/05-code-implementation/SKILL.md`, `AGENTS.md` | Files retain scope, contract, UI evidence, mock boundary, verification freshness or equivalent checks. | Packet protocol replaces or removes independent review dimensions. |
| A4 | Reviewer expands context on risk. | `commands/delivery/code.md`, `skills/05-code-implementation/SKILL.md` | Files require expanded context when packet is missing, contradictory, stale or high risk. | Reviewer is allowed to PASS from incomplete packet. |
| A5 | Command reuse is freshness-gated. | `skills/05-code-implementation/SKILL.md` | Skill states command results may be reused only when produced after final diff and freshness is verified. | Skill encourages blind reuse or unconditional rerun. |

## Daily Suite Policy

- include_in_daily: true
- reason: Static assertions are cheap and protect a code-stage performance rule that can regress through wording changes.

## Captured Workflow Version

- git_commit: ffa0ae8
- git_branch: codex/trae-flow-observability
- dirty: true
- rules_hash: 5e7addbddb67336cbc1eef334bc91683386c3400eae21780653a8a00aa408e8f
