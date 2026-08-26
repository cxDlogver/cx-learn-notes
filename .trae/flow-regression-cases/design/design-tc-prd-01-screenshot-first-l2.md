# Flow Regression Case

## Case ID

`design-tc-prd-01-screenshot-first-l2`

## Target Stage

`design`

## Original Issue

`TC-PRD-01` 的旧误判不是因为缺少证据，而是因为流程先相信了 `06-debug-verification.md` 里的 DOM / bbox 顺序描述，没有先对固定图对做 screenshot-first 判定，导致运行态截图中已经可见的 `结算S2` 落位争议被错误放行为 `PASS`。

## Expected Behavior

在固定输入不变时：

- 使用 `FG-C04` + `FG-C01` + `FG-C05` 作为目标结构来源；
- 使用已物化的 `TC-PRD-01__main-default__top-tag-region.png` 作为 runtime source；
- 流程必须先把这组固定证据转成 `target_structure` 和 `runtime_structure_facts`；
- 然后在 screenshot-first 阶段给出 `VISIBLE_MISMATCH` 或等价失败结论；
- case 最终必须停在 `NEEDS_TARGETED_REVIEW` / `REOPENED_FOR_TARGETED_REVIEW`，不得归档 `PASS`。

## Changed Process Files

- `.trae/skills/07-design-alignment/SKILL.md`
- `.trae/agents/design-checker.md`
- `.trae/AGENTS.md`
- `.trae/commands/delivery/design.md`

## Related Tags
- stage: `design`
- contracts: `screenshot_first`, `artifact_assertion_only`, `fixed_image_pair`
- agents: `design-checker`
- commands: `delivery:design`
- cost: `low`
- priority: `P0`

## Replay Mode

`ARTIFACT_ASSERTION_ONLY`

## Minimal Replay Context
- required_artifacts:
  - `artifacts/7328763164-author-detail-top-tags/04-tech-plan.md`
  - `artifacts/7328763164-author-detail-top-tags/06-debug-verification.md`
  - `artifacts/7328763164-author-detail-top-tags/07-design-alignment.md`
  - `artifacts/7328763164-author-detail-top-tags/09-test-case-matrix.md`
  - `artifacts/7328763164-author-detail-top-tags/figma-cache/images/probe-20-8269.png`
  - `artifacts/7328763164-author-detail-top-tags/figma-cache/raw/call-01-direct-node-20-8269.md`
  - `artifacts/7328763164-author-detail-top-tags/figma-cache/raw/call-05-parent-34-7474.md`
  - `artifacts/7328763164-author-detail-top-tags/screenshots/TC-PRD-01__main-default__top-tag-region.png`
- required_case:
  - `TC-PRD-01`
- optional_runtime:
  - `N/A；本 case 固定消费已有图对，不要求浏览器、dev server、mock 或 execution workspace`

## Assertions
| id | assertion | evidence_file | pass_condition | fail_condition |
|---|---|---|---|---|
| A1 | 固定图对必须足以重建目标结构与运行态事实 | `04-tech-plan.md`; `09-test-case-matrix.md`; `figma-cache/images/probe-20-8269.png`; `screenshots/TC-PRD-01__main-default__top-tag-region.png` | 合同能明确目标结构，且本地存在 Figma 图与 runtime 图 | 缺任一固定证据，或合同不足以支撑截图阶段判定 |
| A2 | 固定 runtime 图必须先导出 `runtime_structure_facts`，而不是先信 DOM 顺序 | `screenshots/TC-PRD-01__main-default__top-tag-region.png`; `06-debug-verification.md` | 对同一张 runtime 图，优先结论来自截图中 `结算S2` 的可见落位争议 | 仍把 `06-debug-verification.md` 的 DOM 顺序当成主结论来源 |
| A3 | 固定图对的 Gate 结论必须是失败态，不得归档 | `07-design-alignment.md` | `TC-PRD-01` 为 `NEEDS_TARGETED_REVIEW` / `REOPENED_FOR_TARGETED_REVIEW`，且不是 `ARCHIVED_PASS` | 同样图对仍可被写成 `PASS` / `NON_BLOCKER` / `ARCHIVED` |
| A4 | 当前 case 未闭合前 queue 不得推进 | `07-design-alignment.md`; `.trae/DELIVERY_STATE.md` | active case 仍是 `TC-PRD-01`，`TC-PRD-02` 仍为 `PENDING_AFTER_TC-PRD-01` | 固定图对校验后 queue 继续推进到后续 case |

## Daily Suite Policy
- include_in_daily: `true`
- reason: `L2 只消费固定 artifacts 和固定图对，不依赖 shadow replay，成本低且能直接验证截图判定路径`

## Captured Workflow Version
- git_commit: `uncommitted`
- git_branch: `current`
- rules_hash: `pending-local-diff`
