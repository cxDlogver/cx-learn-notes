# Flow Regression Case

## Case ID

emo-scm-noninteractive-build

## Target Stage

verify

## Original Issue

`/delivery:verify` 的 build baseline 在 `alliance-operation-mono` 本地自动化环境中执行 `emo scm` 时，会卡在 `Please choose a scm name to build locally` 交互提示，导致 verify 无法继续，用户又明确要求不改业务脚本。

## Expected Behavior

当仓库 `eden.mono.pipeline.json` 的 `scene.scm` 只有唯一稳定条目时，verify 规则必须允许保留原始命令 `emo scm`，并通过确定性的非交互包装执行，例如 `BUILD_REPO_NAME=<scm-key> emo scm`。如果 scm 选项不唯一，则必须停止猜测并要求人工确认。

## Changed Process Files

- `PROJECT_CONTEXT.md`
- `skills/06-debug-verification/SKILL.md`
- `skills/emo-scm-noninteractive/SKILL.md`

## Related Tags

- stage: verify
- contracts: build-baseline, non-interactive-build, emo, scm
- agents: main-agent, runtime-runner
- commands: delivery:verify
- cost: low
- priority: P1

## Replay Mode

STATIC_ASSERTION

## Minimal Replay Context

- required_artifacts: none
- required_case: static scan of `.trae` process files and repo pipeline config
- optional_runtime: none

## Assertions

| id | assertion | evidence_file | pass_condition | fail_condition |
|---|---|---|---|---|
| A1 | Verify skill allows deterministic non-interactive wrapper for `emo scm`. | `skills/06-debug-verification/SKILL.md` | Skill mentions `emo-scm-noninteractive` or `BUILD_REPO_NAME` as preferred wrapper. | Skill only allows ad hoc enter/newline or leaves the prompt unresolved. |
| A2 | Project context records the repo-approved scm key. | `PROJECT_CONTEXT.md` | Context records `ecom/alliance_operation_mono/mono` and prefers `BUILD_REPO_NAME=... emo scm`. | Context lacks the scm key or still treats blind enter as the primary path. |
| A3 | A reusable skill exists for the prompt. | `skills/emo-scm-noninteractive/SKILL.md` | Skill exists and forbids guessing when multiple scm entries exist. | No reusable skill exists, or it permits guessing scm keys. |

## Daily Suite Policy

- include_in_daily: true
- reason: Static assertions are cheap and protect a verify-stage blocker that directly stops local build evidence collection.

## Captured Workflow Version

- git_commit: pending
- git_branch: codex/trae-flow-observability
- dirty: true
- rules_hash: pending
