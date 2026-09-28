# Test Case Matrix Template

```md
# Test Case Matrix

## Coverage Audit Summary
- Coverage Result: PASS / BLOCKED_NEEDS_PLAN_REWORK
- Mock Closure: PASS / PENDING / MOCK_REWORK_PENDING / N/A
- Plan Drift Audit: PASS / BLOCKED_NEEDS_PLAN_REWORK
- Plan Drift Findings:
- PRD Coverage Gaps:
- Figma Coverage Gaps:
- Interaction Coverage Gaps:
- Regression Coverage Gaps:
- Notes:

## Test Case Matrix
| case_id | case_layer | source | scope | figma_scope | minimum_figma_evidence_level | contract_ref | figma_source | runtime_state | capture_scope | verify_screenshot_key | design_reuse_policy | precondition | steps | expected | positive_assertion | negative_assertion | visual_assertion | negative_visual_assertion | evidence_required | verification_stage | blocker_id | implementation_task | mock_type | apiName | ruleId | mock_closure | mock_verifiable | mock_unverifiable_reason |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|

## BAM Mock Response Field Coverage Matrix
| case_id | ruleId | UI 落点 | BDD 行为规范 | BAM method / API | request key/value | mock key | mock 规则 | 验证断言 | real verify | 补充说明 |
|---|---|---|---|---|---|---|---|---|---|---|
```

## Field Rules

- `case_id`: 稳定唯一 ID，推荐 `TC-PRD-*`、`TC-UI-*`、`TC-INT-*`、`TC-DATA-*`、`TC-REG-*`。
- `case_layer`: 仅允许 `page-level`、`region-level`、`interaction-level`、`cell-level`；核心页面至少 1 条 `page-level` 首屏视觉 baseline case。
- `source`: 仅允许 `PRD`、`FIGMA_NODE`、`FIGMA_SCREENSHOT`、`PLAN`、`BUGFIX`、`DESIGN_BLOCKER`。
- `verification_stage`: 仅允许 `verify`、`design`、`accept`、`verify+design`、`verify+accept`。
- `blocker_id`: 无对应 blocker 时填 `-`。
- `implementation_task`: 填 `delivery-task.md` 中的 `Task N` 或 `Task N / step`。
- `figma_scope`: 填 Figma 证据实际覆盖范围，允许 `page`、`region`、`node`、`tooltip`、`cell`、`mixed`；不得把局部 probe 伪写成 page / region。
- `minimum_figma_evidence_level`: 仅允许 `L1_PAGE_BASELINE`、`L2_REGION_BASELINE`、`L3_NODE_REFERENCE`、`L4_AUXILIARY_DATA`。page-level case 至少 `L1_PAGE_BASELINE`；region-level case 至少 `L2_REGION_BASELINE`；interaction-level / cell-level case 可用 `L2` 或 `L3`，`L4` 只能补充不能单独关闭 case。
- `contract_ref`: UI case 必须引用三契约行，例如 `Region:<页面/区域>`、`Interaction:<控件文案>`、`Cell:<表格/列名>`；非 UI case 填 `-`。
- `figma_source`: design / verify+design case 必填；填写 Figma screenshot key、nodeId 或等价可追溯路径。
- `runtime_state`: 当前 case 需要关闭的运行态，例如 `main-default`、`hover-cluster-major`、`tooltip-auth-open`、`page-first-screen`。
- `capture_scope`: 当前截图的视觉范围，例如 `page-first-screen`、`top-tag-region`、`cluster-tooltip`、`table-header-first-row`。
- `verify_screenshot_key`: verify 写入截图索引时使用的稳定 key；若当前 case 不复用 verify 截图则填 `N/A` 并说明原因。
- `design_reuse_policy`: 仅允许 `REUSE_VERIFY_FIRST`、`NEW_CAPTURE_REQUIRED`、`N/A`。
- `positive_assertion`: 来自三契约的必显、应变化、应保持事实；不得只写“符合预期”。
- `negative_assertion`: 来自三契约的禁显、禁残留、无副作用事实；无适用项填 `-`。
- `visual_assertion`: 结构、层级、顺序、badge/tag 形态、颜色、圆角、间距、icon / asset 等视觉合同；不得只写“视觉一致”。
- `negative_visual_assertion`: 多余容器、旧结构残留、错误颜色、错误 icon、空 tooltip、覆盖错位等视觉负向断言；无适用项填 `-`。
- `mock_verifiable`: 当前 case 是否能在 mock-preview 下被完整验证；不需要 mock 时，表示 mock-preview 与 real-preview 一致，默认填 `是`。
- `mock_unverifiable_reason`: 填写 `mock_verifiable` 的判断原因。`是` 时说明为什么可以完整验证；`否` 时说明为什么不能完整验证，聚焦真实后端、外部系统或副作用等 mock-preview 无法证明的部分，避免重复 `evidence_required`、positive / negative assertion、截图、DOM、Network 或 BAM 矩阵已有描述。
- `Plan Drift Findings`: 当 plan / task 与 `prd-source.md`、用户决策或已确权 Figma evidence 冲突时填写；每项包含 `source_ref`、`plan_ref/task_ref`、`drift_type`、`why_it_matters`、`required_plan_rework`。发现 drift 时不得自行生成另一套 case 事实继续放行。
- 常见不可完整 mock 验证原因：写接口不能真实调用后端并产生副作用；必要接口两轮 UI 自然点击仍无法定位时只能验证 `SYNTHETIC_CONTRACT` 数据 mock 和 real verify 回收；后端异步任务、审批流、权限计算、风控、聚合统计、排序分页、推荐策略、持久化副作用、跨服务回写、第三方回调或消息队列无法通过 BAM response mock 证明。
- `evidence_required`: 关闭 case 所需证据，例如 `DOM+截图`、`before/action/after`、`computed style`、`Network`、`Figma screenshot diff`。
- 对 `verification_stage = design / verify+design` 的 case，`evidence_required` 至少包含 `runtime screenshot`；仅有 DOM / 文案不得让 design PASS。
- 对 `verification_stage = design / verify+design` 的 case，必须能从表中直接推导 design 的执行顺序：先看 `case_layer/scope`，再看 `figma_scope/minimum_figma_evidence_level`，再看 `verify_screenshot_key/runtime_state/capture_scope`。缺任一关键字段时不得开始 design 判定。
- `BDD 行为规范`: 只用于 `BAM Mock Response Field Coverage Matrix`；必须以具体 UI 操作为核心，例如 `Given 在舆情列表页且筛选区展开 When 点击“无舆情主体”筛选项并点击查询 Then 调用 <BAM API> 且列表展示无舆情主体行`。不得写抽象“用户操作后请求”。
- `BAM Mock Response Field Coverage Matrix`: 必须逐行覆盖 `Test Case Matrix` 中所有 `mock_type = BAM_RUNTIME_MOCK` 且 `ruleId != N/A` 的 case；多个 case 共用同一 `ruleId` 时也要按 `case_id` 分别列出，不得只写代表 case 或只按 ruleId 汇总。
- `request key/value`: 只用于 `BAM Mock Response Field Coverage Matrix`；必须区分 `影响字段` 与 `非影响字段`。值会影响 mock matcher、ruleId 分流、返回 mock 数据或当前 case 请求断言的字段才是影响字段，并必须给具体 value。非影响但真实请求需要携带的字段可以写入该列，但 value 必须写成 `<真实UI获取>`，例如 `非影响字段: author_id=<真实UI获取>`；该字段只提示后续 `/delivery:mock` 通过 UI 自然请求采集到 manifest 的 `realRequest` / `collectionOnlyFields` / `responseContract.request`，不得进入 matcher 或 ruleId 唯一性判断。只有后续 `/delivery:mock` 完成两轮 UI 自然点击仍无法定位必要接口时，manifest 才能以 `synthetic_contract` 标记合成 request / response。
- `补充说明`: task阶段默认填 `-`；后续 Code 只允许在已有行更新这一列，记录 `task_id`、代码位置、问题和证据，推荐写成 `task_id=<...>; code_location=<...>; finding=<...>; evidence=<...>`。不得改写其他合同列、不得拆成独立 handoff / 附录；Verify/Mock 只将其作为 runtime 缺口提示读取，不得把它当成 request / response / matcher / 断言的权威来源。
- `ruleId`: 同时看 response 覆盖分支和 request 影响字段取值；若同一业务验证目标因影响字段不同值命中不同 mock rule，必须拆分 test case，每个 case 最多绑定一个非 `N/A` `ruleId`。

## Minimum Coverage

- 每条 Atomic Requirement 至少 1 条 case。
- 每个核心页面至少 1 条 `page-level` 首屏视觉 baseline case。
- 每个核心可见区域至少 1 条 UI case。
- 每个可操作控件至少 1 条 Interaction case。
- 每个 design blocker 或历史回归问题至少 1 条 Regression case。
- 每个 `Figma Region Contract` 的 `结构签名`、`必显元素/字段`、`禁显元素/残留` 必须有 case 覆盖。
- 每个 `Figma Interaction Contract` 的 `负向断言(禁显/无副作用)` 必须有 case 覆盖。
- 每个 `Figma Cell Contract` 的 `必显子元素/字段`、`禁显子元素/残留` 必须有 case 覆盖。
