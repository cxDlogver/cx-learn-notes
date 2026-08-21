# Flow Regression Case

## Case ID

`design-white-screen-console-first`

## Target Stage

`design`

## Original Issue

在 `/delivery:design` 浏览器取证中，截图出现白屏或只有骨架时，流程没有强制先读取 console 日志，容易把白屏误写成设计差异、页面无内容，或在缺少 runtime 根因的情况下继续 case 判定。

## Expected Behavior

当 design 运行态截图白屏、空白主区域、只有骨架/Loading 或内容未渲染时，主 Agent 与 `design-checker` 必须先检查同页 console 是否存在 `error` / uncaught exception / resource load failure / chunk load failure / hydration / runtime crash，并把结果写入证据日志后再分流；不得直接给出 PASS / BLOCKER / 页面无内容结论。

## Changed Process Files

- `.trae/AGENTS.md`
- `.trae/skills/07-design-alignment/SKILL.md`
- `.trae/agents/design-checker.md`

## Related Tags
- stage: `design`
- contracts: `runtime_evidence`, `browser_led_visible_contract_audit`, `design_evidence_debug_log`
- agents: `design-checker`
- commands: `delivery:design`
- cost: `low`
- priority: `P1`

## Replay Mode

`STATIC_ASSERTION`

## Minimal Replay Context
- required_artifacts:
  - `.trae/AGENTS.md`
  - `.trae/skills/07-design-alignment/SKILL.md`
  - `.trae/agents/design-checker.md`
- required_case:
  - `design screenshot is blank / loading-only`
- optional_runtime:
  - `browser console evidence`

## Assertions
| id | assertion | evidence_file | pass_condition | fail_condition |
|---|---|---|---|---|
| A1 | 全局 verify/design gate 对白屏截图要求先查 console | `.trae/AGENTS.md` | 存在“白屏/骨架空白先读取 console error”规则 | 只要求截图/snapshot，不要求 console |
| A2 | design skill 对白屏 runtime source 规定 console-first 分流 | `.trae/skills/07-design-alignment/SKILL.md` | 同时出现“白屏/Loading”与“先读取 console 日志”与“不得直接下 design 结论” | 仍允许只凭白屏截图判定 |
| A3 | design-checker agent 输出合同包含 console 检查字段 | `.trae/agents/design-checker.md` | 存在 `console_checked`、`console_error_summary`、`screen_state_classification` 要求 | design-checker 遇白屏仍可不报告 console |

## Daily Suite Policy
- include_in_daily: `true`
- reason: `STATIC_ASSERTION，成本低，能防止 design 阶段再次忽略 console-first runtime triage`

## Captured Workflow Version
- git_commit: `uncommitted`
- git_branch: `current`
- rules_hash: `pending-local-diff`
