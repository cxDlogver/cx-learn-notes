# Flow Regression Cases

This directory stores process-regression cases for the `.trae` delivery framework.

Use these cases to prevent a previously fixed workflow bug from returning after future changes to `AGENTS.md`, `commands/**`, `skills/**`, or `agents/**`.

## Default Policy

- Capture a case whenever a user-reported workflow problem leads to a `.trae` process-rule change.
- Capturing a case does not require running it immediately.
- Daily or targeted regression runs execute selected cases later and write reports under `.trae/flow-regression-runs/`.
- Cases must not contain secrets, raw request / response bodies, screenshots, full DOM, full Figma JSON, or large business-code context.

## Replay Modes

| mode | meaning | default usage |
|---|---|---|
| `STATIC_ASSERTION` | Grep or static file assertions only | Safe for daily |
| `ARTIFACT_ASSERTION_ONLY` | Check stage artifacts and Gate assertions without replay | Safe for daily |
| `SHADOW_REPLAY_LIGHT` | Replay light stages in shadow workspace | Daily only for P0 / recent failures |
| `SHADOW_REPLAY_HEAVY` | Replay verify / design / mock / code with runtime dependencies | Targeted or weekly |
| `MANUAL_CONTEXT_REQUIRED` | Context too large or not reliably replayable | Record only |

## Layered Staticization Pattern

当某个流程 bug 的修复目标是“先把规则写死，再验证固定证据会被正确判定”，优先把它拆成两层 case：

- `L1 STATIC_ASSERTION`
  - 只检查规则是否已经落到 command / skill / agent / `AGENTS.md`
  - 适合 daily，成本最低
- `L2 ARTIFACT_ASSERTION_ONLY`
  - 只消费固定 artifacts 或固定图对，例如 `Figma screenshot + runtime screenshot + design report`
  - 断言固定证据必须导向某个 Gate 结论，例如 `VISIBLE_MISMATCH`
  - 不再生成 shadow replay workspace，也不验证当前业务代码的实时正确性

推荐用法：

- 对 design 的 screenshot-first、scope-match、evidence-materialization 类问题，优先使用 `L1 + L2`，不要默认上 `SHADOW_REPLAY_LIGHT`
- 只有当结论仍依赖浏览器、运行态日志、mock detour、dev server 或 execution diff 时，再升级到 shadow replay

## Case Template

```md
# Flow Regression Case

## Case ID

## Target Stage

## Original Issue

## Expected Behavior

## Changed Process Files

## Related Tags
- stage:
- contracts:
- agents:
- commands:
- cost:
- priority:

## Replay Mode

## Minimal Replay Context
- required_artifacts:
- required_case:
- optional_runtime:

## Assertions
| id | assertion | evidence_file | pass_condition | fail_condition |
|---|---|---|---|---|

## Daily Suite Policy
- include_in_daily:
- reason:

## Captured Workflow Version
- git_commit:
- git_branch:
- rules_hash:
```

## Index

`index.json` should summarize case metadata for fast selection:

```json
{
  "cases": [
    {
      "id": "design-autofix-resume-active-case",
      "path": "flow-regression-cases/design/design-autofix-resume-active-case.md",
      "stage": "design",
      "tags": ["design_auto_fix", "active_case_resume"],
      "replay_mode": "ARTIFACT_ASSERTION_ONLY",
      "priority": "P0",
      "include_in_daily": true
    }
  ]
}
```
