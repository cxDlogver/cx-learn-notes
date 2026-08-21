# Flow Regression Case

## Case ID

`design-large-figma-semantic-grid-first`

## Target Stage

`design`

## Original Issue

当 Figma source 是整页 atlas / whole-file 大图，且同一张图里有多个相似页面、多个状态或多个信息区时，旧流程可能只凭局部 probe、hover 截图或 node data 拼出结论，未先把当前 case 对应的完整 Figma 区域裁剪保存为本地 baseline，也未先按行/列/组语义整体对比。结果可能把“局部标签顺序或样式已改善”误判为“整体区域通过”。

## Expected Behavior

在固定输入不变时：

- 若 Figma source 是整页 atlas / whole-file 大图，design 阶段必须先裁剪或导出当前 case 对应的本地 Figma baseline。
- `07-design-alignment.md` 必须记录原始大图路径、裁剪/导出图路径、选中区域/状态、选择依据和 materialization 状态。
- page-level / region-level / 信息区 / 卡片区 / 表格区 case 必须先输出 Figma 行列语义表，再输出 runtime 行列语义事实。
- 若整体行、列、分组、归属或同级顺序不同，必须先标记 `structure_mismatch_visible` / `BLOCKER` / `NEEDS_TARGETED_REVIEW`，不得用单个标签、颜色、圆角、顺序或 DOM 文案正确来关闭 case。
- 只有整体行列语义匹配或有明确豁免来源后，才允许进入细节元素样式对比和最终 PASS 判定。

## Changed Process Files

- `.trae/skills/07-design-alignment/SKILL.md`
- `.trae/AGENTS.md`

## Related Tags

- stage: `design`
- contracts: `large_figma_baseline`, `semantic_grid_first`, `screenshot_first`, `region_level`
- agents: `design-checker`
- commands: `delivery:design`
- cost: `low`
- priority: `P0`

## Replay Mode

`STATIC_ASSERTION`

## Fixed Image Evidence

本 case 涉及图片取证规则，因此固定图片必须随 case 一起保存，避免回归判断依赖外部 artifacts 是否仍存在。

| image_id | local_path | source | dimensions | purpose |
|---|---|---|---|---|
| `IMG-FIGMA-01` | `flow-regression-cases/design/design-large-figma-semantic-grid-first/assets/figma-after-main-top-info-region-tight-v2.png` | `artifacts/7328763164-author-detail-top-tags/figma-cache/crops/figma-after-main-top-info-region-tight-v2-from-page-1-12256.png` | `760x150` | 固定 Figma 大图裁剪 baseline，代表 `After / 主态 / 顶部信息区` |
| `IMG-RUNTIME-01` | `flow-regression-cases/design/design-large-figma-semantic-grid-first/assets/runtime-tc-prd-01-main-default-top-tag-region.png` | `artifacts/7328763164-author-detail-top-tags/screenshots/TC-PRD-01__main-default__top-tag-region.png` | `2196x1774` | 固定 runtime baseline，用于证明行列语义必须整体对比 |

## Minimal Replay Context

- required_rules:
  - `.trae/skills/07-design-alignment/SKILL.md`
  - `.trae/AGENTS.md`
- required_images:
  - `flow-regression-cases/design/design-large-figma-semantic-grid-first/assets/figma-after-main-top-info-region-tight-v2.png`
  - `flow-regression-cases/design/design-large-figma-semantic-grid-first/assets/runtime-tc-prd-01-main-default-top-tag-region.png`
- required_keywords:
  - `物化整体 Figma baseline`
  - `先做 Figma 行列语义表`
  - `semantic_grid_comparison`
  - `figma_baseline_materialization`
  - `裁剪图`
- optional_artifacts:
  - `artifacts/*/figma-cache/atlas/*.png`
  - `artifacts/*/figma-cache/crops/*.png`

## Assertions

| id | assertion | evidence_file | pass_condition | fail_condition |
|---|---|---|---|---|
| A1 | 整页 atlas / whole-file 大图必须先本地物化为当前 case 的裁剪或节点截图 | `07-design-alignment/SKILL.md`; `AGENTS.md` | 规则明确要求裁剪/导出、保存路径、确认可读且不得裁偏 | 仍允许直接用全局图或局部 probe 做 closure |
| A2 | 整体大图 case 必须先做行列语义对比 | `07-design-alignment/SKILL.md`; `AGENTS.md` | 规则明确要求 Figma 行列语义表与 runtime 行列语义事实 | 只要求结构/样式对比，未要求行/列/组/归属语义 |
| A3 | 语义 mismatch 必须优先阻断 PASS | `07-design-alignment/SKILL.md`; `AGENTS.md` | 规则明确说明语义不同先判 `structure_mismatch_visible` / `BLOCKER`，细节元素不能覆盖整体 mismatch | 局部标签顺序、颜色或文案正确仍可关闭整体 case |
| A4 | Evidence / debug log 必须记录物化和语义对比字段 | `07-design-alignment/SKILL.md` | 存在 `figma_baseline_materialization`、`semantic_grid_comparison`、`figma_baseline_local_path`、`semantic_grid_result` 等字段 | 报告字段无法追踪选中哪张图、是否裁剪、语义是否对齐 |
| A5 | 图片型 regression case 必须携带本地固定图片 | `flow-regression-cases/design/design-large-figma-semantic-grid-first/assets/*` | `IMG-FIGMA-01` 和 `IMG-RUNTIME-01` 均存在且可读 | 只在文档里引用外部 artifacts，case 目录下没有固定图片 |

## Daily Suite Policy

- include_in_daily: `true`
- reason: `STATIC_ASSERTION 只检查流程规则关键词和字段，成本低，可防止 design 阶段再次把整体大图 case 降级成局部标签对比。`

## Captured Workflow Version

- git_commit: `uncommitted`
- git_branch: `current`
- rules_hash: `pending-local-diff`
