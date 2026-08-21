# Flow Regression Case

## Case ID

`design-tc-prd-01-screenshot-first-l1`

## Target Stage

`design`

## Original Issue

`TC-PRD-01` 曾出现误判：运行态截图里 `结算S2` 的落位已经肉眼可见存在结构争议，但流程仍先采信 DOM / bbox 顺序描述，把“结构存在”误判成“结构正确”，最终错误给出 `PASS`。

## Expected Behavior

当 design case 消费固定的 Figma screenshot / node data 与 runtime screenshot 时，规则层必须先要求：

1. 先提取目标可见结构；
2. 再抄录运行态事实；
3. 先做 screenshot-first 判定；
4. 只有之后，DOM / bbox / computed style 才能解释差异，不得把截图中的已可见结构冲突改写成 `PASS`。

## Changed Process Files

- `.trae/skills/07-design-alignment/SKILL.md`
- `.trae/agents/design-checker.md`
- `.trae/AGENTS.md`
- `.trae/commands/delivery:design.md`
- `.trae/docs/delivery-framework-flow.md`

## Related Tags
- stage: `design`
- contracts: `screenshot_first`, `structure_first_check`, `visible_mismatch`
- agents: `design-checker`
- commands: `delivery:design`
- cost: `low`
- priority: `P0`

## Replay Mode

`STATIC_ASSERTION`

## Minimal Replay Context
- required_artifacts:
  - `.trae/skills/07-design-alignment/SKILL.md`
  - `.trae/agents/design-checker.md`
  - `.trae/AGENTS.md`
  - `.trae/commands/delivery:design.md`
  - `.trae/docs/delivery-framework-flow.md`
- required_case:
  - `TC-PRD-01 screenshot-first regression`
- optional_runtime:
  - `N/A`

## Assertions
| id | assertion | evidence_file | pass_condition | fail_condition |
|---|---|---|---|---|
| A1 | design skill 必须先建目标结构再抄录运行态事实 | `.trae/skills/07-design-alignment/SKILL.md` | 存在“先建立目标结构并抄录运行态事实”与 screenshot-first 规则 | 仍允许直接用 DOM / 代码先下结论 |
| A2 | design command 必须把 screenshot-first 顺序写进 SOP | `.trae/commands/delivery:design.md` | 明确要求“目标可见结构 -> 运行态事实 -> screenshot-first -> DOM解释” | 仍只要求 Figma↔runtime 对比，不固化顺序 |
| A3 | 全局 gate 必须禁止 DOM 推翻截图冲突 | `.trae/AGENTS.md` | 明确写出截图中的可见结构冲突不得被 DOM / 代码推翻 | 仍允许 DOM / 代码把截图冲突解释回 PASS |
| A4 | design-checker 必须先输出 `Structure First Check` | `.trae/agents/design-checker.md` | 存在 `Structure First Check` 表和 `VISIBLE_MISMATCH` 约束 | agent 输出合同仍可跳过结构事实抄录 |

## Daily Suite Policy
- include_in_daily: `true`
- reason: `L1 只做静态规则检查，成本极低，适合每天防回退`

## Captured Workflow Version
- git_commit: `uncommitted`
- git_branch: `current`
- rules_hash: `pending-local-diff`
