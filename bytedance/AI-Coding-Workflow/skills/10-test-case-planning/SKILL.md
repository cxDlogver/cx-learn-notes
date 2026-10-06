---
name: test-case-planning
description: Use in `/delivery:task` after `delivery-task.md` exists to generate independent `09-test-case-matrix.md` plus PRD/Figma/mock coverage audit before code, verify, or acceptance.
---

# Test Case Planning

## Overview

该 skill 负责把 `delivery-task.md` 转成独立测试用例，并反查任务是否完整覆盖 `03-prd-analysis.md`、`04-tech-plan.md` 的关键 Figma 可见事实。`MOCK_PREVIEW` 下，本 skill 还负责生成 BAM Mock Response Field Coverage Matrix、Mock Preview Scope 和 Mock / Real Boundary，并明确所有 `/delivery:mock`、BAM mock rule 生成 / 调整、真实 UI 请求采集和 mock-debug 验证都由主 Agent 执行。

它不负责发明实现任务，也不替代 `task-planning` 或 `04-tech-planning`。发现 plan / task coverage gap 时，只负责写清缺口并阻断后续放行；只有 `MOCK_PREVIEW` 下发现 mock 产物尚未生成或需调整时，才记录 `Mock Closure: PENDING` / `MOCK_REWORK_PENDING`，并要求对应 `implementation_task` 绑定 verify case / rule / API。非 `MOCK_PREVIEW` 下缺少 mock 产物不是 coverage gap。

## Required Inputs

必须读取：

- `.trae/DELIVERY_STATE.md`
- 当前 workspace 下的 `prd-source.md`
- 当前 workspace 下的 `03-prd-analysis.md`
- 当前 workspace 下的 `04-tech-plan.md`
- 当前 workspace 下的 `delivery-task.md`
- 当前 workspace 下的 `delivery-mock.md`（当 `Implementation Mode: MOCK_PREVIEW` 且已存在）
- 当前 workspace 下的 `mock/rule-map.json` 与每接口 `manifest.json`（当 `Implementation Mode: MOCK_PREVIEW` 且已存在）
- 当前 workspace 下的 `prd-figma-supplement.md`（如存在）
- 当前 workspace 下的 `07-design-alignment.md`（如存在）
- `.trae/skills/10-test-case-planning/test-case-matrix-template.md`

## Output Artifact

必须生成当前 workspace 下的 `09-test-case-matrix.md`。

非 `MOCK_PREVIEW` 至少包含：

1. `## Coverage Audit Summary`
2. `## Test Case Matrix`

非 `MOCK_PREVIEW` 下不得要求 `BAM Mock Response Field Coverage Matrix`、`Mock Preview Scope`、`Mock / Real Boundary`、`ruleId`、`mock_closure`、`mock_verifiable` 或 `mock_unverifiable_reason`；这些列如模板保留，必须填 `N/A`，不得因为没有 mock 阻塞 task/code/verify/design。

`MOCK_PREVIEW` 必须包含：

1. `## Coverage Audit Summary`
2. `## Test Case Matrix`
3. `## BAM Mock Response Field Coverage Matrix`
4. `## Mock Preview Scope`
5. `## Mock / Real Boundary`

不得只生成 case，不写 coverage 结论；也不得先生成粗粒度 case、再在 BAM mock 矩阵里用多条 rule 解释同一个 case。

`MOCK_PREVIEW` 下，`ruleId` 必须同时从两个方面判断：一是 mock response 覆盖的业务分支 / 字段覆盖；二是 request 影响字段的具体取值。若同一业务验证目标因为 request 影响字段取值不同而命中不同 mock rule，必须反向拆分为多个独立 test case，每个 case 绑定一个非 `N/A` `ruleId`。例如 `has_author_subject=false` 与 `has_author_subject=true` 需要不同 mock 规则时，必须拆成无主体 / 有主体两个 case，不得只写一个“主体筛选”case。非 `MOCK_PREVIEW` 下不执行该 ruleId 校验。

`BAM Mock Response Field Coverage Matrix` 必须覆盖 `Test Case Matrix` 中所有 `mock_type = BAM_RUNTIME_MOCK` 且 `ruleId != N/A` 的 case。即使多个 case 共用同一个 `ruleId`，也必须按 `case_id` 逐行列出 UI 落点、BDD 行为规范、验证断言和 real verify；不得只保留一个代表 case 或只按 ruleId 汇总。矩阵允许同一个 `ruleId` 出现在多行，但这些行必须共享同一组影响 mock 规则的 request key/value。

后续 `/delivery:mock` 生成 manifest / rule-map 时，必须把使用同一 `ruleId` 的完整 case 列表写入 `caseIds` 数组；不得使用单个主 case 代替矩阵中的全量 case 覆盖。

## Coverage Rules

### Plan Drift Audit

生成或放行 `09-test-case-matrix.md` 前，必须先执行 Plan Drift Audit。该审计不让 test case 阶段替 plan 纠偏，只负责发现偏移、阻断放行，并给 `/delivery:plan` 一个可执行回修包。

必须对照：

- `prd-source.md` 中本轮 in-scope 的业务语义、状态、字段、操作、权限、边界条件和验收描述。
- `03-prd-analysis.md` 的 Atomic Requirement、范围 formalization、用户确认的 in-scope / out-of-scope。
- `decision-log.md` 或阶段输入中的用户显式决策。
- `04-tech-plan.md` 的 PRD Logic Coverage Matrix、Figma Region / Interaction / Cell contract、Excluded Real Integration。
- `delivery-task.md` 的 Task Coverage Audit、Task N、Files、Steps、expected_result 和 stop_conditions。
- Figma / design evidence 中已确权的主结构、文案、字段、视觉语义和交互事实。

如果发现以下任一类偏移，`Coverage Result` 必须为 `BLOCKED_NEEDS_PLAN_REWORK`，不得通过自行生成“正确版 case”来绕过 plan：

- PRD / 用户决策中的业务语义被 plan 或 task 反向理解、弱化、扩大或替换。
- PRD 原文中 in-scope 的状态、字段、操作、权限、边界条件或验收要求没有进入 plan / task，且不是明确排除项。
- plan / task 把 `LOW confidence`、`PLAN_DISCOVERY`、未确权接口字段、未确权 Figma 细节或参考页面行为写成确定实现。
- Figma 已确权主结构、文案、字段顺序、控件形态、标签视觉语义或交互状态与 plan / task 冲突。
- `delivery-task.md` 为了让 case 可生成而新增了 plan 没有授权的范围、mock 行为、fallback store、preview service、adapter 造数或 fake success。
- 同一 requirement 在 plan、task、test case 中的 `requirement_id` / `contract_ref` 映射出现语义错配。

审计结果必须写入 `Coverage Audit Summary`：

- `Plan Drift Audit: PASS / BLOCKED_NEEDS_PLAN_REWORK`
- `Plan Drift Findings:` 每项包含 `source_ref`、`plan_ref/task_ref`、`drift_type`、`why_it_matters`、`required_plan_rework`

只有当偏移属于 mock 产物尚未生成或需要调整，且 `MOCK_PREVIEW` 的 case / rule / BDD / request key/value / assertion 已能从 plan 与 task 推导时，才允许 `Coverage Result = PASS` 且 `Mock Closure = PENDING / MOCK_REWORK_PENDING`。这类 mock closure 不属于 plan drift。

必须逐项审计：

- `03-prd-analysis.md` 的每条 Atomic Requirement 是否被 `delivery-task.md` 的 task、`MOCK_PREVIEW` 下的 BAM mock / adapter 行为或明确排除项覆盖。
- 每个 `FIGMA_MAIN_STATE_CONFIRMED` 页面中的核心可见区域，是否有对应 UI case。
- 每个可操作控件，是否有对应 Interaction case。
- 每个 design blocker / 已知回归问题，是否有对应 Regression case。
- 每个带有视觉语义的标签类字段，是否有独立视觉契约 case，而不是只被“字段存在”或“文案正确”笼统覆盖。典型例子包括：状态标签、权限标签、枚举 badge、等级/归属标签。
- 对表格 / 列表型主态，是否存在“首行关键单元格逐格比对” case；不得只校验表头、列顺序或整表截图。
- 每个筛选区是否有字段级 schema case，逐项覆盖外显筛选项、全部筛选弹层项、字段顺序、控件形态、placeholder / 默认值、payload 字段和禁显残留；不得只写“filter 可见”或“筛选正常”。
- 每个表格 / 列表是否有表头与列信息 case，逐项覆盖列文案、列顺序、列 key / dataIndex、固定列、操作列、可见/禁显列和跨 Tab / 跨域残留；不得只写“表格列正确”。
- 对任何 Tab / Segment / Switch 下的筛选区和表格，必须按每个 Tab 单独生成 filter schema case 与 table header/column case；不得用一个泛化 Tab 切换 case 替代字段级白名单/黑名单。
- 当 `04-tech-plan.md` 存在字段来源覆盖证据（融合在 Region / Cell / API / Task，或条件输出的 `Field Source Coverage Audit`）时，其中每个筛选项 / 表头 / 可见字段 / 导出字段 / 标签枚举是否至少有一条 case 或明确的非可见排除理由。
- `Figma Region Contract` / `Figma Interaction Contract` / `Figma Cell Contract` 中的防漏字段是否被转成 case：`结构签名`、`必显元素/字段`、`禁显元素/残留`、`负向断言(禁显/无副作用)`、`必显子元素/字段`、`禁显子元素/残留`。

若发现以下任一问题，Coverage Result 不得为 `PASS`：

- `Plan Drift Audit` 不是 `PASS`。
- PRD requirement 没有映射到 plan task 或明确行为。
- 核心 Figma 可见区域没有对应 case。
- 可操作控件没有点击/状态变化 case。
- `Implementation Mode = MOCK_PREVIEW`，但 case 把 BAM mock 验证当作真实集成已验证结果。
- `Implementation Mode = MOCK_PREVIEW`，但需要后端响应的 case 没有 `apiName`、`ruleId`、`mock_closure`、`mock_verifiable`、`mock_unverifiable_reason`，或 `mock_unverifiable_reason` 没有说明当前 case 可 / 不可在 mock-preview 下完整验证的原因，或该 case 没有逐行进入本文件的 `BAM Mock Response Field Coverage Matrix` 并填写具体 UI 操作的 `BDD 行为规范` 与 `request key/value`。
- 标签类字段只有文案 / 存在性 case，没有样式 / 语义 / token / badge 形态 case。
- 表格主态只有“列存在 / 顺序正确” case，没有首行关键单元格的视觉契约 case。
- 筛选区只有区域级或交互级 case，没有筛选项字段白名单、字段黑名单、控件形态、placeholder / 默认值、payload 的 case。
- 表格 / 列表只有整表截图或表头存在性 case，没有表头顺序、列 key / dataIndex、可见/禁显列、操作列和跨域/跨 Tab 残留的 case。
- 字段来源覆盖证据中的字段没有映射到 `contract_ref`、`positive_assertion`、`negative_assertion`、`visual_assertion`、`negative_visual_assertion` 或 `evidence_required`，或没有明确 `OUT_OF_SCOPE` / `BACKEND_ONLY` / `PLAN_DISCOVERY` 等排除理由。
- 三契约中的任一防漏字段没有映射到 `contract_ref`、`positive_assertion`、`negative_assertion`、`visual_assertion`、`negative_visual_assertion` 或 `evidence_required`。

## Case Construction Rules

- case 必须从 `delivery-task.md` 回溯到 `implementation_task`，不得脱离现有任务体系临时发明实现范围。
- case 可以指出 plan / task 偏移，但不得把偏移后的 plan 事实静默改写成另一套 case 事实；一旦 case 的正确断言与 `04-tech-plan.md` / `delivery-task.md` 冲突，必须在 `Plan Drift Findings` 中阻断并回 `/delivery:plan`。
- `MOCK_PREVIEW` 下，每个需要后端响应的 case 必须标记 `mock_type = BAM_RUNTIME_MOCK`，并填写 `apiName`、`ruleId`、`mock_closure`、`implementation_task`、`mock_verifiable`、`mock_unverifiable_reason`；每个 case 最多只能对应一个非 `N/A` 的 `ruleId`。若一个验证目标需要多个 `ruleId` 才能覆盖，或同一请求影响字段的不同值需要不同 mock 规则，必须拆成多个 case，分别绑定各自的 `ruleId`。不需要 mock 的 case 不进入 BAM mock 矩阵，`mock_verifiable` 默认填 `是`，表示 mock-preview 与 real-preview 一致。
- 非 `MOCK_PREVIEW` 下，case 只需要按真实功能、UI、Network 或 integration 断言定义；`mock_type`、`ruleId`、`mock_closure`、BAM mock 矩阵和 manifest 对齐均为 `N/A`，不得触发 `/delivery:mock`。
- `BAM Mock Response Field Coverage Matrix` 的每一行必须从 `MOCK_PREVIEW` Test Case Matrix 的 `case_id + ruleId + apiName` 派生，记录 UI 落点、BDD 行为规范、BAM method / API、request key/value、mock key、mock 规则、验证断言、real verify 和 `补充说明`。每个 `BAM_RUNTIME_MOCK` case 必须有且只有一行；共享 `ruleId` 的多个 case 也要逐行列出，不得用一个 case 代表整条 rule。
- `BDD 行为规范` 必须用具体 UI 操作描述当前 rule 的触发路径，格式建议为 `Given <页面/数据前置> When <具体点击/筛选/切换/输入/展开动作> Then <触发的接口和可观测 UI 结果>`；不得写“用户操作”“进入页面后请求”等抽象描述，必须点名具体 Tab、按钮、筛选项、表格行、抽屉或弹窗落点。
- `request key/value` 必须把请求字段分成两类写清楚：`影响字段` 和 `非影响字段`。只有字段值会改变 mock matcher 命中、ruleId 分流、返回 mock 数据、目标记录/场景或当前 case 请求断言时，才是影响字段；影响字段必须写具体 value，例如 `影响字段: has_author_subject=false` 对应“无舆情主体”case、`影响字段: has_author_subject=true` 对应“有舆情主体”case。
- 非影响但真实请求需要携带、或仅用于真实接口采集成功的字段，可以写入 `request key/value`，但 value 必须统一写成 `<真实UI获取>`，例如 `非影响字段: event_id=<真实UI获取>`、`author_id=<真实UI获取>`。这类字段只提示 `/delivery:mock` 后续通过 UI 自然请求采集并写入 manifest 的 `realRequest` / `collectionOnlyFields` / `responseContract.request`，不得进入 `ruleMatchKeys`、不得参与 ruleId 唯一性判断，也不得写 `mock_*`、`sample_*`、伪造 ID、手工猜测值或其他占位文案。
- `MOCK_PREVIEW` 下，每个 `ruleId` 在本矩阵中只能对应一组影响 mock 命中的 request key/value；同一个 `ruleId` 不得对应多组会改变 mock 规则的影响 key/value，同一组影响 key/value 也不得对应多个 `ruleId`。若同一字段不同取值对应不同 mock 规则，必须拆分 `ruleId` 和 test case。非影响字段即使在矩阵中以 `<真实UI获取>` 标出，也不属于影响 key/value；其真实值优先由 `/delivery:mock` 的 UI 真实请求采集后写入 manifest。若 `/delivery:mock` 两轮 UI 自然点击仍无法定位必要接口，可在 manifest 中以 `synthetic_contract` 标记合成值，并由 manifest gate 校验唯一命中一个 `ruleId`。
- `mock_verifiable` 表示当前 case 是否能在 mock-preview 下被完整验证；前提是该 case 需要 mock。可完整验证填 `是`，不可完整验证填 `否`；不需要 mock 时，表示 mock-preview 与 real-preview 一致，默认填 `是`。
- `mock_unverifiable_reason` 填写 `mock_verifiable` 的判断原因。`是` 时说明为什么可以完整验证；`否` 时说明为什么不能完整验证，聚焦真实后端、外部系统或副作用等 mock-preview 无法证明的部分。原因尽量保持一句话，避免重复 `evidence_required`、positive / negative assertion、截图、DOM、Network 或 BAM 矩阵已有描述。不需要 mock 时，可简要写明 mock-preview 与 real-preview 一致。
- 常见 `mock_verifiable=否` 原因包括：写接口不能真实调用后端并产生副作用；后端异步任务、审批流、权限计算、风控、聚合统计、排序分页、推荐策略、数据一致性、持久化副作用、跨服务回写等服务端处理逻辑无法靠 BAM response mock 证明；真实第三方回调、消息队列、定时任务或数据同步链路不在当前前端 mock 闭环内；只能验证前端渲染和交互，不能证明真实业务状态已生效。
- `mock_verifiable=否` 或 mock 无法完全验证不得作为 verify 阶段阻塞原因；verify 仍应完成可由 mock 证明的前端闭环，并把剩余真实接口验证写入 `real verify` / integration-debug 回收要求。只有 `MOCK_PREVIEW` 下缺少可执行 UI case、BDD 落点、request key/value、mock 规则、断言或业务调用链时，才按 coverage / mock closure 规则阻塞。
- `MOCK_PREVIEW` case 的 expected 必须写明 `mock-preview verified` 或真实接口接入后需重跑 `real verify`；每个需要后端响应的 case 在验证前必须由对应 implementation task 完成业务调用链，并通过 UI 触发 `/delivery:mock` 生成或调整 mock。非 `MOCK_PREVIEW` case 不写 mock-preview 结论，按真实验证预期记录。
- case 同时保留来源：PRD、Figma node/screenshot、design blocker、历史回归。
- case 预期结果必须可观察，优先写文案、顺序、默认值、显隐、点击后状态、表格渲染、Network 约束。
- 对 verify/design/accept 的分工必须显式写在 `verification_stage`。
- 若 `04-tech-plan.md` 本身缺失 coverage，允许生成 blocker case，但必须在 `Coverage Audit Summary` 中把问题标成 `BLOCKED_NEEDS_PLAN_REWORK`。
- 若 `MOCK_PREVIEW` 下缺失 mock 产物但 Test Case Matrix 已能推导需要的 `case_id + apiName + ruleId + BDD 行为规范 + request key/value + 验证断言`，`Coverage Result` 仍可为 `PASS`，但必须在 `Coverage Audit Summary` 标记 `Mock Closure: PENDING`，并确认对应 `implementation_task` 绑定 verify case。
- 若已有 mock 产物与 `09-test-case-matrix.md` 中的 case/rule/scope/boundary 不一致，标记 `Mock Closure: MOCK_REWORK_PENDING`，并确认对应 verify case 可消费该依赖。只有 plan 或 task 缺少可生成 case 的需求、UI 落点、BDD 行为规范、request key/value 或验证断言时，才标记 `BLOCKED_NEEDS_PLAN_REWORK`。
- `contract_ref` 必须指向 `04-tech-plan.md` 中的契约行，例如 `Region:<页面/区域>`、`Interaction:<控件文案>`、`Cell:<表格/列名>`；非 UI case 可填 `-`。
- `positive_assertion` 必须写清“应出现 / 应变化 / 应保持”的可观测事实。
- `negative_assertion` 必须写清“不得出现 / 不得残留 / 不得误触发”的反向断言；没有适用项时填 `-`。
- `visual_assertion` 必须写清结构、层级、顺序、显隐、颜色、形态、icon / asset 等可观测视觉事实；非视觉 case 填 `-`。
- `negative_visual_assertion` 必须写清不得出现的旧结构、错误容器、错误颜色、错误 icon、错误列或额外视觉残留；没有适用项时填 `-`。
- `evidence_required` 必须写明关闭 case 所需证据类型，例如 `DOM+截图`、`before/action/after`、`computed style`、`Network`、`Figma screenshot diff`。

特别要求：

- 对标签类字段，case expected 不能只写“展示某个标签文案”这类文本结果，必须写清 badge 形态、底色/文字色、圆角、尺寸级别或等价的视觉语义要求。可用状态标签、权限标签、枚举 badge 作为 example，但不得把具体业务词当成规则主体。
- 对表格 / 列表主态，至少一条 UI case 必须覆盖“首行关键单元格逐格比对”。优先覆盖承载核心识别和操作语义的关键列，如名片、标签、状态、权限、操作等。expected 必须写清哪些单元格要对比文案、显隐、样式、badge 形态，而不是只看整表截图。
- 若 Figma 对标签颜色/底色/圆角有明确视觉事实，而 `04-tech-plan.md` 没有把该字段列为独立 UI contract，必须在 `Coverage Audit Summary` 标记 `BLOCKED_NEEDS_PLAN_REWORK`。
- Field Source case 必须覆盖字段 key、产品标签/表头、筛选 payload、表格/列表展示、空值态、枚举正反语义和禁止残留；例如 `is_inout_author` 必须同时验证 UI 文案、`1=双栖` / `0=仅站外`、不得裸露 `1/0`、不得反向实现为错误标签。
- Filter Schema case 必须覆盖每个筛选项的产品文案、字段 key、适用 domain / tab、控件类型、placeholder / 默认值、选项语义、查询 payload、重置行为和禁显字段；Tab 下筛选区必须分别列出每个 Tab 的允许字段与禁止字段。
- Table Header / Column case 必须覆盖表头文案顺序、列 key / dataIndex、固定列、操作列、排序列、可见列、禁显列和空值态；Tab / domain 切换场景必须分别断言当前表头白名单和上一 Tab / 另一域列信息不残留。
- Region case 必须覆盖 `结构签名`、`必显元素/字段` 和 `禁显元素/残留`，避免只验证“设计有的出现了”而漏掉代码多出的旧结构。
- Interaction case 必须把 `负向断言(禁显/无副作用)` 写入 `negative_assertion`，尤其是点击后旧 Drawer、错误 Popover、重复按钮、无效状态、重复请求等残留。
- Cell case 必须覆盖首行关键单元格的 `必显子元素/字段` 与 `禁显子元素/残留`，不能只用表头或整表截图关闭。

## Output Contract

`09-test-case-matrix.md` 必须使用如下结构：

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

## Mock Preview Scope
| mock category | source matrix | scope item | allowed behavior | forbidden behavior | files / recovery point | verification |
|---|---|---|---|---|---|---|

## Mock / Real Boundary
| task_id | case_id | ruleId | 能力 | 当前数据来源 | 是否形成运行时业务闭环 | 模式归属 | 必须重跑验证 |
|---|---|---|---|---|---|---|---|
```

字段要求：

- `mock_type` 取值为 `NONE` / `TEST_FIXTURE_MOCK` / `BAM_RUNTIME_MOCK`。只有 `BAM_RUNTIME_MOCK` 会进入 BAM mock 矩阵。
- `MOCK_PREVIEW` 下，`BAM_RUNTIME_MOCK` case 必须填写 `apiName` 和非 `N/A` `ruleId`；同一个 `case_id` 最多只能有一个非 `N/A` `ruleId`。
- `MOCK_PREVIEW` 下，`BAM Mock Response Field Coverage Matrix` 的 `case_id` 集合必须等于 `Test Case Matrix` 中所有 `mock_type = BAM_RUNTIME_MOCK` 且 `ruleId != N/A` 的 `case_id` 集合；缺行、额外行或用单行代表多个 case 均为无效输出。
- `MOCK_PREVIEW` 下，若同一个 `case_id` 在 `BAM Mock Response Field Coverage Matrix` 中对应多个非 `N/A` `ruleId`，输出无效；必须回到 `Test Case Matrix` 拆分 case 后再生成 BAM mock 矩阵。
- `MOCK_PREVIEW` 下，`BDD 行为规范` 必须以具体 UI 操作为核心，能指导 `/delivery:mock` 到达同一请求点；缺少按钮/筛选/Tab/行级动作等具体落点时输出无效。
- `MOCK_PREVIEW` 下，`request key/value` 中必须区分 `影响字段` 与 `非影响字段`：影响字段必须给出具体 value 并用于 mock matcher / ruleId 分流；非影响字段只能写成 `field=<真实UI获取>`，只作为 `/delivery:mock` 采集 `realRequest` / `collectionOnlyFields` 的提示，不得进入 matcher。必要接口两轮 UI 自然点击失败后的 synthetic 值只能由 `/delivery:mock` 写入 manifest。
- `MOCK_PREVIEW` 下，若同一个 `ruleId` 在 `BAM Mock Response Field Coverage Matrix` 中对应多组不同影响 `request key/value`，或同一组影响 `request key/value` 对应多个 `ruleId`，输出无效；必须拆分 `ruleId` 和 test case。若同一请求影响字段不同 value 会触发不同 mock 规则，也必须拆分 test case，不得把 true / false、不同枚举值或不同业务场景混在同一个 case 中。非影响 key 的实际 request value 优先由 `/delivery:mock` 的 UI 真实请求采集结果写入 manifest；若 `/delivery:mock` 两轮 UI 自然点击仍无法定位必要接口，可在 manifest 中以 `synthetic_contract` 标记合成值，并由 manifest gate 校验。
- `MOCK_PREVIEW` 下，`mock_closure` 必须指向 `implementation_task` 中的后置步骤：业务代码调用链完成后，由主 Agent 通过 UI 触发真实 request / response，调用 `/delivery:mock`，再回到当前 case 验证。
- `mock_verifiable` 表示当前 case 是否能在 mock-preview 下被完整验证；前提是该 case 需要 mock。可完整验证填 `是`，不可完整验证填 `否`。
- `mock_unverifiable_reason` 填写 `mock_verifiable` 的判断原因：`是` 写可以完整验证的原因，`否` 写不能完整验证的原因；
- `MOCK_PREVIEW` 下，`ruleId: N/A` 的 case 不得出现在 `BAM Mock Response Field Coverage Matrix`。
- `MOCK_PREVIEW` 下，`Mock Preview Scope` 必须同时覆盖 `Test Fixture Mock` 和 `BAM runtime mock` 两类 mock 方式。
- `MOCK_PREVIEW` 下，`Mock / Real Boundary` 必须引用 `04-tech-plan.md` 的 `Excluded Real Integration` 并细化到 task / case / rule。`真实接口接入后是否允许二次前端代码调整` 默认应为 `否`；需要调整时必须路由到 plan 重新确认。

## Gate

- `Coverage Result = PASS`：允许主流程继续放行 `/delivery:code`。
- `Coverage Result = BLOCKED_NEEDS_PLAN_REWORK`：必须回到 `/delivery:plan` 修复 `04-tech-plan.md`，不得假设 `/delivery:code` 会自行补齐。
- `Mock Closure: PENDING` / `MOCK_REWORK_PENDING`：仅适用于 `MOCK_PREVIEW`，不得阻塞 task/code；后续 verify/design 阶段按 active case 依赖由主 Agent调用 `/delivery:mock`。非 `MOCK_PREVIEW` 下 mock closure 写 `N/A`。
