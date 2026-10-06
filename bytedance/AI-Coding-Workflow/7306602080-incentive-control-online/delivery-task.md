# Delivery Task Plan

## Task Readiness
- Task Readiness: PASS
- Implementation Mode: MOCK_PREVIEW
- Mock Closure: PENDING
- Source Plan: `/Users/bytedance/cx/spec-2/meego-11/artifacts/7306602080-incentive-control-online/04-tech-plan.md`
- Source Mock: 未发现 `delivery-mock.md`、`mock/rule-map.json` 或接口级 `manifest.json`；按 MOCK_PREVIEW 规则记录为 PENDING，不阻塞 Task。
- Source Design: `/Users/bytedance/cx/spec-2/meego-11/artifacts/7306602080-incentive-control-online/prd-figma-supplement.md`、`figma-cache/**`；未发现 `07-design-alignment.md`，且 plan 写明 `TEMPLATE_ONLY; no design rework handoff`。
- Notes: 本任务物化保留 `04-tech-plan.md` line 5 的完整范围，不因 BAM/IDL 字段差异删减配置提示、发奖剔除、人工提报、剔除明细、导出或埋点；所有运行时数据闭环只能走真实 page -> store -> service -> BAM wrapper，BAM mock 由后续 verify 按 case 闭合。

## Plan Drift Precheck
| source_ref | plan_ref | drift_type | required_plan_rework | status |
|---|---|---|---|---|
| `prd-source.md:147-152` 配置页两类参与资格提示、规则入口 | `04-tech-plan.md:39-40`, UI-001/UI-002, Region lines 145-146 | none | 无；文案、位置、交互一致 | PASS |
| `prd-source.md:166-170` DOU+币/券发奖前处罚状态与 timeout/exception/empty-list | `04-tech-plan.md:41-43`, TMI-D | none | 无；mock-preview 下真实事务一致性进入 EX-RI-001 回收 | PASS |
| `prd-source.md:170-192` 人工提报命中态、一键移除、导出、submit guard | `04-tech-plan.md:44-48`, UI-005/UI-006, Region lines 155-158 | none | 无；导出文案和原因口径已按 Ask First 用户决策收敛 | PASS |
| `prd-source.md:194-198` 剔除明细 Tab、筛选、字段、分页 | `04-tech-plan.md:49-52`, UI-003/UI-004, list style lines 176-187 | none | 无；DOU+币作品维度与 DOU+券作者维度均保留 | PASS |
| `prd-source.md:200-208` 埋点需求 | `04-tech-plan.md:53-55`, UI-007, TMI-E | none | 无；事件命名/UV 口径为 P1，不压缩埋点范围 | PASS |
| `uncertainty-register.md` Ask First 反馈：规则链接、原因字段、BAM/IDL 差异权威 | `04-tech-plan.md:24-33`, `04-tech-plan.md:267-271` | none | 无；按用户决策执行，正式 URL/token 仅 Main Agent 定向 review | PASS |
| `prd-figma-supplement.md` G1-G18 PASS，核心节点 `1:9770`、`1:10938`、`1:12120`、`1:12390`、`25:13842`、`25:13971` | `04-tech-plan.md:72-83`, `04-tech-plan.md:141-158` | none | 无；cache/screenshot 证据在任务中规范映射为 `F2C_REQUIRED` 或 `RUNTIME_BASELINE_ALLOWED` | PASS |

## Task Coverage Audit
| requirement_id | plan_ref | mock_ref | design_ref | task_id | status | gap | route |
|---|---|---|---|---|---|---|---|
| AR-001 | `04-tech-plan.md:39`, UI-001 | Mock Closure PENDING; no runtime mock | Figma `1:9770`, text `1:10202`, IMG3 | TASK-001 | COVERED | 正式 URL/token P1 review | code -> verify/design |
| AR-002 | `04-tech-plan.md:40`, UI-002 | Mock Closure PENDING; no runtime mock | Figma `1:10938`, text `1:11370`, IMG4 | TASK-002 | COVERED | 正式 URL/token P1 review | code -> verify/design |
| AR-003 | `04-tech-plan.md:41`, TMI-D | RuleIds `R-BAM-AWARD-COIN-PENALTY`, `R-BAM-AWARD-COIN-EMPTY`, `R-BAM-AWARD-COIN-TIMEOUT`, `R-BAM-CANDIDATE-REMOVE-SUCCESS` pending | Non-figma functional | TASK-007 | COVERED | 真实治理状态/事务一致性 real verify；发奖成功后 no-award upload 需验证 | code -> verify -> real verify |
| AR-004 | `04-tech-plan.md:42`, TMI-D | RuleIds `R-BAM-AWARD-COUPON-PENALTY`, `R-BAM-AWARD-COUPON-EXCEPTION`, `R-BAM-CANDIDATE-REMOVE-SUCCESS` pending | Non-figma functional | TASK-007 | COVERED | 真实治理状态/事务一致性 real verify；发奖成功后 no-award upload 需验证 | code -> verify -> real verify |
| AR-005 | `04-tech-plan.md:43`, COPY-TIMEOUT/COPY-EXCEPTION | RuleIds `R-BAM-AWARD-COIN-TIMEOUT`, `R-BAM-AWARD-COUPON-EXCEPTION`, `R-BAM-AWARD-COIN-EMPTY` pending | PRD copy only | TASK-007 | COVERED | 错误码承载方式 P1，前端固定 PRD 文案 | code -> verify |
| AR-006 | `04-tech-plan.md:44`, UI-005/UI-006 | RuleIds `R-BAM-MANUAL-SEARCH-HIT`, `R-BAM-BATCH-SHEET-HIT` pending | Figma `25:13842` / `87:6973`; `25:13971` / `101:6308` | TASK-005,TASK-006 | COVERED | 手动输入接口字段同步为 low risk | code -> verify/design |
| AR-007 | `04-tech-plan.md:45`, COPY-MANUAL-SUMMARY | Same as AR-006 | Figma `87:6998` | TASK-005,TASK-006 | COVERED | 无 | code -> verify/design |
| AR-008 | `04-tech-plan.md:46`, Interaction line 170 | No manual remove runtime mock; search/download rules only | Figma `87:7000`, `87:7043` | TASK-005,TASK-006 | COVERED | 已移除记录生命周期和 drawer reset P1 | code -> verify |
| AR-009 | `04-tech-plan.md:47`, Field lines 90-91 | RuleId `R-BAM-DOWNLOAD-REMOVE-RECORD` pending | Figma `87:7002` | TASK-005,TASK-006 | COVERED | lark_url 权限 real verify；移除后重复导出需验证 | code -> verify -> design -> real verify |
| AR-010 | `04-tech-plan.md:48`, Interaction line 173 | RuleId `R-BAM-MANUAL-SEARCH-HIT` pending | Figma `87:7133` | TASK-005,TASK-006 | COVERED | 无 | code -> verify |
| AR-011 | `04-tech-plan.md:49`, UI-003 | RuleIds `R-BAM-COIN-REMOVE-DEFAULT`, `R-BAM-COIN-REMOVE-FILTER` pending | Figma `1:12120`, IMG5 | TASK-003 | COVERED | 排序/错误码 P1 | code -> verify/design |
| AR-012 | `04-tech-plan.md:50`, Field line 93 | RuleId `R-BAM-COIN-REMOVE-FILTER` pending | Figma `1:12120` | TASK-003 | COVERED | 操作人 employee_id 接受范围 P1 | code -> verify |
| AR-013 | `04-tech-plan.md:51`, UI-004 | RuleIds `R-BAM-COUPON-REMOVE-DEFAULT`, `R-BAM-COUPON-REMOVE-FILTER` pending | Figma `1:12390`, IMG6 | TASK-004 | COVERED | 排序/错误码 P1 | code -> verify/design |
| AR-014 | `04-tech-plan.md:52`, Field line 93 | RuleId `R-BAM-COUPON-REMOVE-FILTER` pending | Figma `1:12390` | TASK-004 | COVERED | 作者ID产品标签映射 `candidate_ids` 需注释/测试 | code -> verify |
| AR-015 | `04-tech-plan.md:53`, UI-007 | No runtime mock | Figma `1:9770` / `1:10938` | TASK-008 | COVERED | event id/element id P1 | code -> verify |
| AR-016 | `04-tech-plan.md:54`, UI-007 | RuleId `R-BAM-MANUAL-SEARCH-HIT` pending for visible hit state | Figma `25:13842` | TASK-008 | COVERED | event id P1 | code -> verify |
| AR-017 | `04-tech-plan.md:55`, UI-007 | RuleIds `R-BAM-COIN-REMOVE-DEFAULT`, `R-BAM-COUPON-REMOVE-DEFAULT` pending for tab load | Figma `1:12120` / `1:12390` | TASK-008 | COVERED | UV 口径 P1 | code -> verify |

## Executable Task Check
| task_id | files | checkbox_steps | verification | expected_result | forbidden_path | result |
|---|---|---|---|---|---|---|
| TASK-001 | `step-reward-config/index.tsx`, `index.module.scss` | PASS | PASS | PASS | PASS | PASS |
| TASK-002 | `step-reward-config/index.tsx`, `index.module.scss` | PASS | PASS | PASS | PASS | PASS |
| TASK-003 | `send-award/index.tsx`, `dou-coin-remove-record-table/index.tsx`, local styles/utils | PASS | PASS | PASS | PASS | PASS |
| TASK-004 | `send-award/index.tsx`, `dou-coupon-remove-record-table/index.tsx`, local styles/utils | PASS | PASS | PASS | PASS | PASS |
| TASK-005 | `manuallySubmitVideoStore.ts`, manual drawer/form files, generated wrappers only by import | PASS | PASS | PASS | PASS | PASS |
| TASK-006 | `manuallySubmitVideoStore.ts`, submit-selector/form/drawer files | PASS | PASS | PASS | PASS | PASS |
| TASK-007 | `batch-submit-modal/index.tsx`, award stores, existing award submit handlers | PASS | PASS | PASS | PASS | PASS |
| TASK-008 | config prompt, manual form, send-award logger call sites | PASS | PASS | PASS | PASS | PASS |

## Execution Tasks

### Task 1: 配置页全部用户态不激励提示与规则入口
- task_id: TASK-001
- requirement_id: AR-001
- test_case_id: TC-UI-CFG-ALL-BASELINE, TC-INT-CFG-RULE-LINK
- ruleId: N/A
- source_refs: `04-tech-plan.md:39`, `04-tech-plan.md:118`, Region `04-tech-plan.md:145`, Cell `04-tech-plan.md:209`, Copy `04-tech-plan.md:228-229`, `prd-source.md:147-152`, `prd-figma-supplement.md:19`, `prd-figma-supplement.md:104-108`
- mode: MOCK_PREVIEW
- code_locator: `/Users/bytedance/cx/spec-2/meego-11/meego-7306602080/repos/alliance-operation-mono/apps/alliance-operation-content/src/routes/content-activity/edit/components/step-reward-config/index.tsx`; sibling styles `index.module.scss`; grep anchors: 活动参与资格字段、预埋用户名单字段、Form item render branch
- implementation_directive: legacy local patch from UI-001; run `/f2c get_d2c_json` for fileKey `fNJJ7mEmEMYU5y0tcAZm3X` node `1:9770` and text node `1:10202`, then render the exact prompt and clickable link under 活动参与资格=全部用户 without changing reward config data model
- ui_evidence_mode: F2C_REQUIRED
- component_strategy: LEGACY_LOCAL_PATCH; evidence reason: plan had `cache F2 + screenshot IMG3`, normalized to F2C_REQUIRED because exact text/link style and placement must be read before patching
- figma_fileKey: fNJJ7mEmEMYU5y0tcAZm3X
- figma_nodeId: `1:9770`, text `1:10202`
- figma_state_scope: 配置页 / 活动参与资格=全部用户 / 配置项下方不激励提示与规则 link
- mapped_case_ids: TC-UI-CFG-ALL-BASELINE, TC-INT-CFG-RULE-LINK
- acceptance_focus_ref: UI-001; Region:配置-全部用户/不激励提示; Cell:配置提示/规则入口; COPY-CFG-PROMPT/COPY-CFG-LINK
- excluded_scope: 不新增不激励账号数量、名单下载、申诉入口、配置页治理接口调用、业务代码 mock；不改奖励配置数据结构
- mock_boundary: No runtime mock
- verification_commands: `pnpm --dir /Users/bytedance/cx/spec-2/meego-11/meego-7306602080/repos/alliance-operation-mono/apps/alliance-operation-content build`; verify/design 关闭 TC-UI-CFG-ALL-BASELINE 与 TC-INT-CFG-RULE-LINK
- expected_result: 全部用户态在原配置项下方展示完整提示和 `查看【不激励】规则` link，点击只触发目标材料跳转/打开和后续埋点，不出现下载或申诉入口
- stop_conditions: 若无法在 `step-reward-config/index.tsx` 定位活动参与资格分支，或 F2C 读取的 `1:9770` 与 plan 中 copy/placement 冲突，停止并返回 `/delivery:plan`；mock 缺失不得停止

Steps:
- [x] 读取 `/f2c get_d2c_json --fileKey fNJJ7mEmEMYU5y0tcAZm3X --nodeId 1:9770` 和 text `1:10202`，记录 text/link style、placement 与截图 IMG3 的证据键。
- [x] 在 `step-reward-config/index.tsx` 中定位活动参与资格=全部用户的配置项渲染分支，新增可复用提示渲染片段，但本任务只挂载全部用户态。
- [x] 文案必须精确为 `奖励发放环节将进行账号校验，命中【不激励】规则的账号无法被发奖` 和 `查看【不激励】规则`，link 热区仅覆盖 link 文案。
- [x] link 目标从文档中的【电商内容生态激励管控讨论】材料地址/配置来源读取；若仅能定位材料名但不能定位 URL，保留 Main Agent targeted review item，不删掉点击交互。
- [x] 禁止新增名单下载、申诉、数量提示或任何接口请求；样式优先使用 Figma token，无法精确读取时使用现有 Auxo link/text token并保持位置与文案。
- [x] Verify Closure Dependency: N/A；关闭 case `TC-UI-CFG-ALL-BASELINE`、`TC-INT-CFG-RULE-LINK` 时仅需 DOM、截图和 click 证据。

### Task 2: 配置页预埋名单态不激励提示与规则入口
- task_id: TASK-002
- requirement_id: AR-002
- test_case_id: TC-UI-CFG-PREFILLED-BASELINE, TC-INT-CFG-RULE-LINK
- ruleId: N/A
- source_refs: `04-tech-plan.md:40`, `04-tech-plan.md:119`, Region `04-tech-plan.md:146`, Cell `04-tech-plan.md:209`, Copy `04-tech-plan.md:228-229`, `prd-source.md:147-152`, `prd-figma-supplement.md:20`, `prd-figma-supplement.md:104-108`
- mode: MOCK_PREVIEW
- code_locator: `/Users/bytedance/cx/spec-2/meego-11/meego-7306602080/repos/alliance-operation-mono/apps/alliance-operation-content/src/routes/content-activity/edit/components/step-reward-config/index.tsx`; sibling styles `index.module.scss`; grep anchors: 预埋用户、预埋名单、活动参与资格 option
- implementation_directive: legacy local patch from UI-002; run `/f2c get_d2c_json` for fileKey `fNJJ7mEmEMYU5y0tcAZm3X` node `1:10938` and text node `1:11370`, then reuse Task 1 prompt renderer under 仅限预埋用户/预埋名单配置区
- ui_evidence_mode: F2C_REQUIRED
- component_strategy: LEGACY_LOCAL_PATCH; evidence reason: plan had `cache F2 + screenshot IMG4`, normalized to F2C_REQUIRED because same prompt must be placed in a different form context
- figma_fileKey: fNJJ7mEmEMYU5y0tcAZm3X
- figma_nodeId: `1:10938`, text `1:11370`
- figma_state_scope: 配置页 / 活动参与资格=仅限预埋用户 / 预埋名单配置项下方不激励提示与规则 link
- mapped_case_ids: TC-UI-CFG-PREFILLED-BASELINE, TC-INT-CFG-RULE-LINK
- acceptance_focus_ref: UI-002; Region:配置-预埋名单/不激励提示; Cell:配置提示/规则入口; COPY-CFG-PROMPT/COPY-CFG-LINK
- excluded_scope: 不改变预埋名单详情展示、不新增下载/申诉/数量提示、不改变全部用户态逻辑、不写 mock 数据
- mock_boundary: No runtime mock
- verification_commands: `pnpm --dir /Users/bytedance/cx/spec-2/meego-11/meego-7306602080/repos/alliance-operation-mono/apps/alliance-operation-content build`; verify/design 关闭 TC-UI-CFG-PREFILLED-BASELINE 与 TC-INT-CFG-RULE-LINK
- expected_result: 预埋名单态在名单详情区域下方展示同款提示与 link，文案、位置、点击行为与 Figma/PRD 一致
- stop_conditions: 若预埋名单态无法在现有表单状态中定位，或需要新增后端能力才能判断该状态，停止并返回 `/delivery:plan`

Steps:
- [x] 读取 `/f2c get_d2c_json --fileKey fNJJ7mEmEMYU5y0tcAZm3X --nodeId 1:10938` 和 text `1:11370`，确认预埋名单上下文中的提示 placement。
- [x] 复用 Task 1 的提示渲染片段，将其挂载到 仅限预埋用户/预埋名单配置项下方。
- [x] 保持原预埋名单详情和后续配置项顺序，不移动或隐藏既有配置项。
- [x] link 点击处理与 Task 1 保持同一目标材料来源，禁止为预埋态创建独立 mock URL 或内联 fixture。
- [x] Verify Closure Dependency: N/A；关闭 case 时需要 DOM、截图、click 证据。

### Task 3: DOU+币剔除明细 Tab、筛选、表格与分页
- task_id: TASK-003
- requirement_id: AR-011, AR-012
- test_case_id: TC-UI-COIN-REMOVE-PAGE, TC-DATA-COIN-FILTER-SCHEMA, TC-DATA-COIN-COLUMNS, TC-CELL-COIN-FIRST-ROW, TC-INT-REMOVE-TAB-SWITCH-COIN
- ruleId: R-BAM-COIN-REMOVE-DEFAULT, R-BAM-COIN-REMOVE-FILTER
- source_refs: `04-tech-plan.md:49-50`, UI-003 `04-tech-plan.md:120`, Region `04-tech-plan.md:147-150`, Interaction `04-tech-plan.md:165-169`, list style `04-tech-plan.md:180-183`, `prd-source.md:194-198`, `prd-figma-supplement.md:145-193`
- mode: MOCK_PREVIEW
- code_locator: `/Users/bytedance/cx/spec-2/meego-11/meego-7306602080/repos/alliance-operation-mono/apps/alliance-operation-content/src/routes/content-activity/award/components/send-award/index.tsx`; new sibling component `/Users/bytedance/cx/spec-2/meego-11/meego-7306602080/repos/alliance-operation-mono/apps/alliance-operation-content/src/routes/content-activity/award/components/dou-coin-remove-record-table/index.tsx`; reuse references `dou-coin-distribution-table/index.tsx`, `@ecop/table`, `PeopleSelect`, `@ecom/smaller-image`
- implementation_directive: concrete reuse from UI-003; use existing SubTab pattern in `send-award/index.tsx` to add `剔除明细`, then create coin remove record table with `apiGetDouPlusCoinRemoveRecord`, EcopTable search columns `candidate_ids` and `operator_id`, and page/page_num pagination
- ui_evidence_mode: RUNTIME_BASELINE_ALLOWED
- component_strategy: CONCRETE_REUSE_PATH; evidence reason: plan had `cache F3 + screenshot IMG5`, normalized to runtime baseline because table styling must reuse existing EcopTable/coin delivery renderer rather than generated F2C code
- figma_fileKey: fNJJ7mEmEMYU5y0tcAZm3X
- figma_nodeId: `1:12120`
- figma_state_scope: 奖励投放 / DOU+币 / 剔除明细 active / SubTab、筛选区、作品表格、分页
- mapped_case_ids: TC-UI-COIN-REMOVE-PAGE, TC-DATA-COIN-FILTER-SCHEMA, TC-DATA-COIN-COLUMNS, TC-CELL-COIN-FIRST-ROW, TC-INT-REMOVE-TAB-SWITCH-COIN
- acceptance_focus_ref: UI-003; Region:DOU+币剔除明细/SubTab/筛选区/表格/分页; Interaction:作品ID筛选/操作人筛选/分页; list style: DOU+币剔除明细 rows
- excluded_scope: 不修改投放明细旧表参数、不隐藏 `奖励下发`/`投放明细`、不新增操作人接口、不展示投放金额/状态/充值记录、不做 client-only pagination、不写本地 mock 数据
- mock_boundary: BAM mock only; mock artifacts pending
- verification_commands: `pnpm --dir /Users/bytedance/cx/spec-2/meego-11/meego-7306602080/repos/alliance-operation-mono/apps/alliance-operation-content build`; verify 关闭 `R-BAM-COIN-REMOVE-DEFAULT` 与 `R-BAM-COIN-REMOVE-FILTER` 后执行 Network + DOM + screenshot
- expected_result: 点击 DOU+币 `剔除明细` 后仅渲染作品维度列表，筛选项为作品ID/操作人，request 使用 `activity_id/config_id/page/page_num/candidate_ids/operator_id`，表头和首行单元格无旧投放列残留
- stop_conditions: 若 `currentConfigId`/reward type 无法传入表格，或 generated wrapper `apiGetDouPlusCoinRemoveRecord` 不存在，停止并返回 `/delivery:plan`; mock 未闭合只登记 Verify Closure Dependency

Steps:
- [x] 在 `send-award/index.tsx` 定位 `SubTab.REWARD`/`SubTab.DETAIL` 与 `moduleMetaMap`，新增 `SubTab.REMOVE_DETAIL` 文案 `剔除明细`，保留 legacy 两个 Tab 可点击。
- [x] 新建 `dou-coin-remove-record-table/index.tsx`，复用 `dou-coin-distribution-table` 的 EcopTable、`filterEmpty`、`PeopleSelect`、`PeopleCard`、`SmallerImage` 模式，但列只保留 `作品内容`、`剔除发奖原因`、`剔除发奖时间`、`操作人`。
- [x] 表格请求只调用 `apiGetDouPlusCoinRemoveRecord`，参数保留 `activity_id`、`config_id`、`page`、`page_num`，作品ID批量输入映射为 `candidate_ids`，操作人映射为 `operator_id`。
- [x] `remove_time` 使用 `dayjs.unix(remove_time).format(...)`；`item_card` 缺封面/标题/ID时展示正常空态 `-`，不得造数。
- [x] 分页使用 EcopTable pagination 并发起真实 page/page_num 请求，禁止 client-only pagination。
- [x] Verify Closure Dependency: `TC-UI-COIN-REMOVE-PAGE/R-BAM-COIN-REMOVE-DEFAULT/apiGetDouPlusCoinRemoveRecord`; `TC-DATA-COIN-FILTER-SCHEMA/R-BAM-COIN-REMOVE-FILTER/apiGetDouPlusCoinRemoveRecord`; mock 由 verify 自然点击 Tab、输入作品ID、选择操作人后闭合。

### Task 4: DOU+券剔除明细 Tab、筛选、表格与分页
- task_id: TASK-004
- requirement_id: AR-013, AR-014
- test_case_id: TC-UI-COUPON-REMOVE-PAGE, TC-DATA-COUPON-FILTER-SCHEMA, TC-DATA-COUPON-COLUMNS, TC-CELL-COUPON-FIRST-ROW, TC-INT-REMOVE-TAB-SWITCH-COUPON
- ruleId: R-BAM-COUPON-REMOVE-DEFAULT, R-BAM-COUPON-REMOVE-FILTER
- source_refs: `04-tech-plan.md:51-52`, UI-004 `04-tech-plan.md:121`, Region `04-tech-plan.md:151-154`, Interaction `04-tech-plan.md:165-169`, list style `04-tech-plan.md:184-187`, `prd-source.md:194-198`, `prd-figma-supplement.md:195-243`
- mode: MOCK_PREVIEW
- code_locator: `/Users/bytedance/cx/spec-2/meego-11/meego-7306602080/repos/alliance-operation-mono/apps/alliance-operation-content/src/routes/content-activity/award/components/send-award/index.tsx`; new sibling component `/Users/bytedance/cx/spec-2/meego-11/meego-7306602080/repos/alliance-operation-mono/apps/alliance-operation-content/src/routes/content-activity/award/components/dou-coupon-remove-record-table/index.tsx`; reuse references `dou-coupon-distribution-table/index.tsx`, `@ecop/table`, `PeopleSelect`, `PeopleCard`
- implementation_directive: concrete reuse from UI-004; reuse the SubTab introduced by Task 3 and render coupon remove record table with `apiGetDouPlusCouponRemoveRecord`, author-ID label mapped to `candidate_ids`, operator PeopleSelect, and page/page_num pagination
- ui_evidence_mode: RUNTIME_BASELINE_ALLOWED
- component_strategy: CONCRETE_REUSE_PATH; evidence reason: plan had `cache F4 + screenshot IMG6`, normalized to runtime baseline because coupon author renderer and EcopTable are existing component baselines
- figma_fileKey: fNJJ7mEmEMYU5y0tcAZm3X
- figma_nodeId: `1:12390`
- figma_state_scope: 奖励投放 / DOU+券 / 剔除明细 active / SubTab、筛选区、作者表格、分页
- mapped_case_ids: TC-UI-COUPON-REMOVE-PAGE, TC-DATA-COUPON-FILTER-SCHEMA, TC-DATA-COUPON-COLUMNS, TC-CELL-COUPON-FIRST-ROW, TC-INT-REMOVE-TAB-SWITCH-COUPON
- acceptance_focus_ref: UI-004; Region:DOU+券剔除明细/SubTab/筛选区/表格/分页; Interaction:作者ID筛选/操作人筛选/分页; list style: DOU+券剔除明细 rows
- excluded_scope: 不把 `author_ids` 作为请求字段除非 IDL 后续变更；不展示作品内容、投放状态、券数量；不新增操作人接口；不隐藏 legacy Tab；不写本地 mock 数据
- mock_boundary: BAM mock only; mock artifacts pending
- verification_commands: `pnpm --dir /Users/bytedance/cx/spec-2/meego-11/meego-7306602080/repos/alliance-operation-mono/apps/alliance-operation-content build`; verify 关闭 `R-BAM-COUPON-REMOVE-DEFAULT` 与 `R-BAM-COUPON-REMOVE-FILTER` 后执行 Network + DOM + screenshot
- expected_result: 点击 DOU+券 `剔除明细` 后仅渲染作者维度列表，筛选项为作者ID/操作人，请求字段 `candidate_ids` 与产品标签差异有代码注释/测试断言，表头和首行单元格无作品维度列残留
- stop_conditions: 若 reward type 无法稳定区分 DOU+币/券或无法复用 SubTab 状态，停止并返回 `/delivery:plan`; mock 未闭合只登记 Verify Closure Dependency

Steps:
- [x] 复用 Task 3 的 `SubTab.REMOVE_DETAIL`，在 DOU+券 reward type 下渲染 `dou-coupon-remove-record-table`，不得改变 DOU+币表渲染条件。
- [x] 新建 `dou-coupon-remove-record-table/index.tsx`，复用 `dou-coupon-distribution-table` 的作者头像/昵称/ID renderer、EcopTable 和 PeopleSelect/PeopleCard 模式。
- [x] 筛选区文案必须为 `作者ID` 和 `操作人`；作者ID请求字段按 plan 映射为 `candidate_ids`，代码注释说明产品标签与 IDL 字段名差异。
- [x] 表格列只保留 `作者信息`、`剔除发奖原因`、`剔除发奖时间`、`操作人`；空 avatar/name/id 使用正常空态，不造数据。
- [x] 分页变更发起真实 `page`/`page_num` 请求，禁止 client-only pagination。
- [x] Verify Closure Dependency: `TC-UI-COUPON-REMOVE-PAGE/R-BAM-COUPON-REMOVE-DEFAULT/apiGetDouPlusCouponRemoveRecord`; `TC-DATA-COUPON-FILTER-SCHEMA/R-BAM-COUPON-REMOVE-FILTER/apiGetDouPlusCouponRemoveRecord`; mock 由 verify 自然点击 Tab、输入作者ID、选择操作人后闭合。

### Task 5: 人工提报手动输入命中态、移除、导出与提交保护
- task_id: TASK-005
- requirement_id: AR-006, AR-007, AR-008, AR-009, AR-010
- test_case_id: TC-UI-MANUAL-HIT-PAGE, TC-CELL-MANUAL-HIT-STATUS, TC-INT-MANUAL-ONE-CLICK-REMOVE, TC-INT-MANUAL-EXPORT, TC-INT-MANUAL-EXPORT-PERSIST-AFTER-REMOVE, TC-INT-MANUAL-SUBMIT-GUARD
- ruleId: R-BAM-MANUAL-SEARCH-HIT, R-BAM-DOWNLOAD-REMOVE-RECORD
- source_refs: `04-tech-plan.md:44-48`, UI-005 `04-tech-plan.md:122`, Region `04-tech-plan.md:155-157`, Interaction `04-tech-plan.md:170-173`, manual list style `04-tech-plan.md:193-201`, Cell `04-tech-plan.md:207-208`, Copy `04-tech-plan.md:230-235`, `prd-source.md:166-192`, `prd-figma-supplement.md:245-312`
- mode: MOCK_PREVIEW
- code_locator: `/Users/bytedance/cx/spec-2/meego-11/meego-7306602080/repos/alliance-operation-mono/apps/alliance-operation-content/src/routes/content-activity/award/stores/manuallySubmitVideoStore.ts`; `/Users/bytedance/cx/spec-2/meego-11/meego-7306602080/repos/alliance-operation-mono/apps/alliance-operation-content/src/routes/content-activity/award/components/manually-submit-videos/manually-submit-videos-drawer/index.tsx`; `/Users/bytedance/cx/spec-2/meego-11/meego-7306602080/repos/alliance-operation-mono/apps/alliance-operation-content/src/routes/content-activity/award/components/manually-submit-videos/manually-submit-videos-drawer/manually-submit-videos-form/index.tsx`; generated wrappers `apiSearchDeliveryItems`, `apiDownloadContentRemoveRecord`
- implementation_directive: legacy local patch from UI-005; run `/f2c get_d2c_json` for node `25:13842` plus content `87:6973` and row `87:7016`, then extend existing store/form/drawer to consume `if_not_incentive` and `not_incentive_reason`, render summary/action/row status, remove hit rows locally without `apiCandidateRemove`, preserve removed rows for export, call only the real download wrapper for export, and block submit while hit rows remain
- ui_evidence_mode: F2C_REQUIRED
- component_strategy: LEGACY_LOCAL_PATCH; evidence reason: plan had `cache F5/F7 + screenshot IMG7`, normalized to F2C_REQUIRED because alert order, buttons, red row labels, and footer state are exact Figma contracts
- figma_fileKey: fNJJ7mEmEMYU5y0tcAZm3X
- figma_nodeId: `25:13842`, content `87:6973`, rows `87:7016`
- figma_state_scope: 奖励投放 / 人工提报 Drawer / 手动输入命中态 / summary、action、row status、footer submit guard
- mapped_case_ids: TC-UI-MANUAL-HIT-PAGE, TC-CELL-MANUAL-HIT-STATUS, TC-INT-MANUAL-ONE-CLICK-REMOVE, TC-INT-MANUAL-EXPORT, TC-INT-MANUAL-EXPORT-PERSIST-AFTER-REMOVE, TC-INT-MANUAL-SUBMIT-GUARD
- acceptance_focus_ref: UI-005; Region:人工提报命中态/Drawer/Summary/action/表格行态; Interaction:一键移除/导出剔除明细/行级移除/提交并投放; Cell:人工提报命中态/视频内容/操作区
- excluded_scope: 不自动剔除命中项；不新增申诉入口；不创建本地导出文件；不导出可发奖记录；不把 mock response 写入 store；不改变既有投放金额、时长、转化目标、受众、提报理由编辑能力
- mock_boundary: BAM mock only; mock artifacts pending
- verification_commands: `pnpm --dir /Users/bytedance/cx/spec-2/meego-11/meego-7306602080/repos/alliance-operation-mono/apps/alliance-operation-content build`; verify 关闭 `R-BAM-MANUAL-SEARCH-HIT`、`R-BAM-DOWNLOAD-REMOVE-RECORD` 后执行 interaction cases，并断言手动移除不产生 `candidate_remove` 请求
- expected_result: 手动输入返回命中字段后，命中项仍保留在列表，summary 数量正确，红字标签显示，一键移除只在前端移除命中/不满足项并保留 removed records；导出只提交 preserved removed records，移除前导出提示暂无已移除记录，移除后完整 `提报汇总` 栏和按钮组保留，`一键移除` 可见但置灰，导出入口可重复导出；命中项未移除前 `提交并投放` 不打开 batch submit modal也不发起 reward submit
- stop_conditions: 若 `delivery_item_info` 无可用于 download 的 item/candidate id 且无法从现有 item_card 派生，停止并返回 `/delivery:plan`; mock 未闭合只登记 Verify Closure Dependency

Steps:
- [x] 读取 `/f2c get_d2c_json --fileKey fNJJ7mEmEMYU5y0tcAZm3X --nodeId 25:13842`、content `87:6973`、rows `87:7016`，提取 summary、按钮顺序、红字状态与 footer 结构。
- [x] 在 `manuallySubmitVideoStore.ts` 保留 `apiSearchDeliveryItems` 真实请求，扩展派生状态：命中项判定为 `if_satisfy_delivery_rules === false or if_not_incentive === true`，统计命中数量，不向 store 写入任何 mock 数据。
- [x] 在 `manually-submit-videos-form/index.tsx` 表格上方渲染 summary：`共{作品总数}个作品，其中不满足准入门槛或命中【不激励】规则的作品数为：{作品个数}个`；preserved removed records 存在时即使无当前命中项也保留 summary 和按钮组，`一键移除` 可见但置灰，`导出剔除明细` 保持可点击。
- [x] 扩展视频/图文内容 cell：在标题/ID 下方以危险色展示 `不满足准入门槛` 和/或 `命中【不激励】规则`，保留封面、标题、ID、既有投放记录提示和行级 `移除`。
- [x] REPAIR-002: Make one-click remove local-only and preserve removed rows for export.
- [x] 实现 `一键移除`：从当前列表本地移除 `if_satisfy_delivery_rules === false` 或 `if_not_incentive === true` 的行，不调用 `apiCandidateRemove`，并在移除前把这些行写入 preserved removed records。
- [x] REPAIR-003: Export removed-record collection only and warn before any removal.
- [x] 实现 `导出剔除明细`：只基于 preserved removed records 组装 `ContentRemoveRecord[]`，字段包含 `author_id`、`item_id`、`item_name`、`remove_reason`、`penalty_reason`；`penalty_reason` 来源为接口 `not_incentive_reason` 的最新罚单原因；无 preserved removed records 时提示暂无可导出的剔除明细；成功返回 `lark_url` 后打开或展示该链接。
- [x] REPAIR-004: Keep export entry visible after removal and allow repeated export.
- [x] 确认移除后 `导出剔除明细` 入口仍可见，重复点击时继续使用同一 preserved removed records 发起 `apiDownloadContentRemoveRecord`，不得因为当前命中行已消失而隐藏导出入口或清空导出数据。
- [x] REPAIR-005: Keep submit summary and action buttons visible after removal, with 一键移除 disabled and export enabled.
- [x] 确认点击 `一键移除` 后仍展示 `提报汇总` summary 文案、`一键移除` 按钮和 `导出剔除明细` 按钮；当前命中数为 0 时 `一键移除` 必须 disabled，`导出剔除明细` 必须 enabled 且继续使用 preserved removed records。
- [x] 在 `manually-submit-videos-drawer/index.tsx` 扩展 footer guard：命中项存在时点击 `提交并投放` 展示阻断提示，禁止打开 batch submit modal，禁止 reward submit 请求；移除后沿用既有提交流程。
- [ ] Verify Closure Dependency: `TC-UI-MANUAL-HIT-PAGE/R-BAM-MANUAL-SEARCH-HIT/apiSearchDeliveryItems`; `TC-INT-MANUAL-ONE-CLICK-REMOVE/NONE/no candidate_remove request`; `TC-INT-MANUAL-EXPORT/NONE/no download request before removal`; `TC-INT-MANUAL-EXPORT-PERSIST-AFTER-REMOVE/R-BAM-DOWNLOAD-REMOVE-RECORD/apiDownloadContentRemoveRecord`。

### Task 6: 批量上传命中态复用与 baseline 保持
- task_id: TASK-006
- requirement_id: AR-006, AR-007, AR-010
- test_case_id: TC-UI-BATCH-HIT-REUSE, TC-INT-BATCH-ONE-CLICK-REMOVE, TC-INT-BATCH-EXPORT
- ruleId: R-BAM-BATCH-SHEET-HIT, R-BAM-DOWNLOAD-REMOVE-RECORD
- source_refs: `04-tech-plan.md:44-45`, `04-tech-plan.md:48`, UI-006 `04-tech-plan.md:123`, Region `04-tech-plan.md:158`, Interaction `04-tech-plan.md:174`, `prd-figma-supplement.md:24`, `prd-figma-supplement.md:251`, `decision-log.md` AF-003
- mode: MOCK_PREVIEW
- code_locator: `/Users/bytedance/cx/spec-2/meego-11/meego-7306602080/repos/alliance-operation-mono/apps/alliance-operation-content/src/routes/content-activity/award/stores/manuallySubmitVideoStore.ts`; `/Users/bytedance/cx/spec-2/meego-11/meego-7306602080/repos/alliance-operation-mono/apps/alliance-operation-content/src/routes/content-activity/award/components/manually-submit-videos/manually-submit-videos-drawer/submit-selector/index.tsx`; `/Users/bytedance/cx/spec-2/meego-11/meego-7306602080/repos/alliance-operation-mono/apps/alliance-operation-content/src/routes/content-activity/award/components/manually-submit-videos/manually-submit-videos-drawer/manually-submit-videos-form/index.tsx`; wrapper `apiGetDeliveryItemsFromSheet`
- implementation_directive: legacy local patch from UI-006; preserve batch upload baseline node `25:13971` / content `101:6308`, but route sheet response items through the same hit-state renderer and submit guard implemented in Task 5
- ui_evidence_mode: RUNTIME_BASELINE_ALLOWED
- component_strategy: LEGACY_LOCAL_PATCH; evidence reason: plan had `cache F6/F8 + screenshot IMG8`, normalized to runtime baseline because Figma only confirms batch baseline and user decision AF-003 says reuse manual hit state
- figma_fileKey: fNJJ7mEmEMYU5y0tcAZm3X
- figma_nodeId: `25:13971`, content `101:6308`, table `101:6332`
- figma_state_scope: 奖励投放 / 人工提报 Drawer / 批量上传 baseline / 上传后复用命中 summary、row status、submit guard
- mapped_case_ids: TC-UI-BATCH-HIT-REUSE
- acceptance_focus_ref: UI-006; Region:批量上传 baseline; Interaction:人工提报批量上传; user decision AF-003
- excluded_scope: 不新增独立批量上传命中骨架；不等待新设计；不绕过 `apiGetDeliveryItemsFromSheet`；不写内联 sheet fixture
- mock_boundary: BAM mock only; mock artifacts pending
- verification_commands: `pnpm --dir /Users/bytedance/cx/spec-2/meego-11/meego-7306602080/repos/alliance-operation-mono/apps/alliance-operation-content build`; verify 关闭 `R-BAM-BATCH-SHEET-HIT` 后执行 batch case
- expected_result: 批量上传态保持 radio/upload/table/footer baseline；sheet response 若包含不激励字段，渲染与手动输入一致的 summary、红字行态、local-only 一键移除、preserved removed records 导出和提交阻断
- stop_conditions: 若 sheet response 类型无法承载 `if_not_incentive` / `not_incentive_reason` 且 BAM/IDL 同步无可用字段，停止并返回 `/delivery:plan`; mock 未闭合只登记 Verify Closure Dependency

Steps:
- [x] 确认 `apiGetDeliveryItemsFromSheet` 响应仍经 `fillIfDeliveryTrue` 进入 `videoItems`，不得改为本地 fixture 或 preview service。
- [x] 将 Task 5 的命中项判定、summary、row status、local-only remove、preserved removed records、export 和 submit guard 抽成可复用派生逻辑，让手动输入和批量上传共用。
- [x] 保持批量上传 radio、上传模板、表格 baseline 和 footer 文案，不新增独立命中态骨架或 unsupported UI。
- [ ] Verify Closure Dependency: `TC-UI-BATCH-HIT-REUSE/R-BAM-BATCH-SHEET-HIT/apiGetDeliveryItemsFromSheet`; `TC-INT-BATCH-ONE-CLICK-REMOVE/NONE/no candidate_remove request`; `TC-INT-BATCH-EXPORT/R-BAM-DOWNLOAD-REMOVE-RECORD/apiDownloadContentRemoveRecord`。

### Task 7: 发奖前剔除规则、错误边界与空名单处理
- task_id: TASK-007
- requirement_id: AR-003, AR-004, AR-005
- test_case_id: TC-INT-AWARD-COIN-PENALTY, TC-INT-AWARD-COIN-RELIEVED, TC-INT-AWARD-COUPON-PENALTY, TC-INT-AWARD-COUPON-RELIEVED, TC-INT-AWARD-TIMEOUT, TC-INT-AWARD-EXCEPTION, TC-INT-AWARD-EMPTY-LIST, TC-INT-AWARD-SUCCESS-UPLOAD-NO-AWARD-LIST
- ruleId: R-BAM-AWARD-COIN-PENALTY, R-BAM-AWARD-COIN-RELIEVED, R-BAM-AWARD-COUPON-PENALTY, R-BAM-AWARD-COUPON-RELIEVED, R-BAM-AWARD-COIN-TIMEOUT, R-BAM-AWARD-COUPON-EXCEPTION, R-BAM-AWARD-COIN-EMPTY, R-BAM-CANDIDATE-REMOVE-SUCCESS
- source_refs: `04-tech-plan.md:41-43`, TMI-D `04-tech-plan.md:280`, Copy `04-tech-plan.md:236-237`, Excluded real integration EX-RI-001/002, `prd-source.md:166-170`, `decision-log.md` AF-004
- mode: MOCK_PREVIEW
- code_locator: `/Users/bytedance/cx/spec-2/meego-11/meego-7306602080/repos/alliance-operation-mono/apps/alliance-operation-content/src/routes/content-activity/award/components/send-award/batch-submit-modal/index.tsx` functions `submitSendAwardVideos` / `submitSendAwardAuthors`; `/Users/bytedance/cx/spec-2/meego-11/meego-7306602080/repos/alliance-operation-mono/apps/alliance-operation-content/src/routes/content-activity/award/stores/couponDeliveryRecordStore.ts` `submitDelivery`; `/Users/bytedance/cx/spec-2/meego-11/meego-7306602080/repos/alliance-operation-mono/apps/alliance-operation-content/src/routes/content-activity/award/stores/sendAwardToVideoStore.ts` submit/save flow; wrappers `apiDeliveryDouPlusCoin`, `apiDeliveryDouPlusCoupon`, `apiCandidateRemove`
- implementation_directive: N/A for UI; implement logic-only guards around existing real award submit wrappers so status 0 natural punishment blocks success, status 1/2解除不阻断, timeout/exception show fixed PRD messages, backend-returned empty post-removal list ends normally without fake success, and successful award delivery triggers a post-success `apiCandidateRemove` upload for the selected no-award/removed candidates only
- ui_evidence_mode: N/A
- component_strategy: N/A
- figma_fileKey: N/A
- figma_nodeId: N/A
- figma_state_scope: N/A
- mapped_case_ids: N/A
- acceptance_focus_ref: PRD 3.2 发奖前剔除; COPY-TIMEOUT; COPY-EXCEPTION; EX-RI-001/002
- excluded_scope: 不在前端自行计算处罚状态；不新增 fallback store、preview service、adapter 造数或 fake success；不改奖励金额/候选排序算法；真实治理处罚状态与事务一致性由 real verify 回收，默认不需要二次前端代码调整
- mock_boundary: BAM mock only; mock artifacts pending
- verification_commands: `pnpm --dir /Users/bytedance/cx/spec-2/meego-11/meego-7306602080/repos/alliance-operation-mono/apps/alliance-operation-content build`; verify 关闭 award ruleIds 后执行 Network + message + no-success assertions
- expected_result: DOU+币/券自然处罚不进入发奖成功；解除状态不被前端误阻断；timeout 显示 `治理校验失败，请稍后重试`；exception 显示 `治理校验异常，请联系管理员`；剔除后空名单正常结束且无激励发放成功假象；发奖成功后调用 `apiCandidateRemove` 上传本次 selected no-award candidates，发奖失败/取消/人工提报移除均不上传
- stop_conditions: 若现有 award submit 路径无法安全定位，或 wrapper 响应没有任何可区分成功/失败/空名单的字段且 plan 未给替代策略，停止并返回 `/delivery:plan`; mock 未闭合只登记 Verify Closure Dependency

Steps:
- [x] 在 `batch-submit-modal/index.tsx`、`couponDeliveryRecordStore.ts` 和相关 award stores 中定位 DOU+币/券最终 submit wrapper 调用，不改变候选计算、金额编辑或排序逻辑。
- [x] 接入固定错误文案：timeout 使用 `治理校验失败，请稍后重试`，exception 使用 `治理校验异常，请联系管理员`，覆盖后端 message 差异但不吞掉日志/返回码。
- [x] 对自然处罚阻断场景，按真实 wrapper response 分支阻止成功态和成功 toast；解除状态保持既有成功流程。
- [x] 对剔除后空名单场景，确保不发起空名单奖励发放或不展示奖励发放成功假象，按 PRD 正常结束。
- [x] REPAIR-001: Move no-award list upload to reward success and include only selected no-award candidates.
- [x] 发奖成功后再调用 `apiCandidateRemove` 上传本次 no-award/剔除候选名单，payload 只包含当前选中的 no-award candidates；发奖失败、异常、取消和人工提报一键/行级移除均不得触发该接口。
- [ ] Verify Closure Dependency: `TC-INT-AWARD-COIN-PENALTY/R-BAM-AWARD-COIN-PENALTY/apiDeliveryDouPlusCoin`; `TC-INT-AWARD-COIN-RELIEVED/R-BAM-AWARD-COIN-RELIEVED/apiDeliveryDouPlusCoin`; `TC-INT-AWARD-COUPON-PENALTY/R-BAM-AWARD-COUPON-PENALTY/apiDeliveryDouPlusCoupon`; `TC-INT-AWARD-COUPON-RELIEVED/R-BAM-AWARD-COUPON-RELIEVED/apiDeliveryDouPlusCoupon`; `TC-INT-AWARD-TIMEOUT/R-BAM-AWARD-COIN-TIMEOUT/apiDeliveryDouPlusCoin`; `TC-INT-AWARD-EXCEPTION/R-BAM-AWARD-COUPON-EXCEPTION/apiDeliveryDouPlusCoupon`; `TC-INT-AWARD-EMPTY-LIST/R-BAM-AWARD-COIN-EMPTY/apiDeliveryDouPlusCoin`; `TC-INT-AWARD-SUCCESS-UPLOAD-NO-AWARD-LIST/R-BAM-CANDIDATE-REMOVE-SUCCESS/apiCandidateRemove`。

### Task 8: 配置页、人工提报、剔除明细埋点
- task_id: TASK-008
- requirement_id: AR-015, AR-016, AR-017
- test_case_id: TC-TRACK-CFG-RULE-LINK, TC-TRACK-MANUAL-HIT-EXPOSE, TC-TRACK-REMOVE-DETAIL-TAB-COIN, TC-TRACK-REMOVE-DETAIL-TAB-COUPON
- ruleId: N/A for logger itself; TC-TRACK-MANUAL-HIT-EXPOSE reuses R-BAM-MANUAL-SEARCH-HIT; TC-TRACK-REMOVE-DETAIL-TAB-COIN reuses R-BAM-COIN-REMOVE-DEFAULT; TC-TRACK-REMOVE-DETAIL-TAB-COUPON reuses R-BAM-COUPON-REMOVE-DEFAULT
- source_refs: `04-tech-plan.md:53-55`, UI-007 `04-tech-plan.md:124`, TMI-E `04-tech-plan.md:281`, Excluded real integration EX-RI-004, `prd-source.md:200-208`
- mode: MOCK_PREVIEW
- code_locator: existing `@ecom/operation-logger` usage in `/Users/bytedance/cx/spec-2/meego-11/meego-7306602080/repos/alliance-operation-mono/apps/alliance-operation-content/src/routes/content-activity/**`; concrete call sites in `step-reward-config/index.tsx`, `manually-submit-videos-form/index.tsx`, `send-award/index.tsx`; grep anchors `sendModuleExposeLog`, `IModuleMeta`, `moduleMetaMap`, `operation-logger`
- implementation_directive: N/A for visual UI; concrete reuse from UI-007 by extending existing operation-logger click/expose patterns without creating a new logging framework
- ui_evidence_mode: N/A
- component_strategy: N/A
- figma_fileKey: N/A
- figma_nodeId: N/A
- figma_state_scope: N/A
- mapped_case_ids: N/A
- acceptance_focus_ref: UI-007; PRD tracking table; EX-RI-004
- excluded_scope: 不新建 logger SDK；不改变业务状态以触发埋点；不把 event name/element_id P1 当作删减埋点范围理由；不写 fake success
- mock_boundary: No runtime mock for logger; hit/tab visible states depend on BAM cases listed in test matrix
- verification_commands: `pnpm --dir /Users/bytedance/cx/spec-2/meego-11/meego-7306602080/repos/alliance-operation-mono/apps/alliance-operation-content build`; logger spy 或 runtime event capture 关闭 tracking cases
- expected_result: 配置页规则入口 click UV、人工提报命中提示曝光 UV、剔除明细 Tab 曝光/点击 UV 均按现有 logger 模式上报，剔除明细 extra 可区分配置项与 DOU+币/券
- stop_conditions: 若仓库中不存在可复用 operation-logger 模式，停止并返回 `/delivery:plan`; event id/UV 聚合口径未最终确认不得删减埋点，只登记 Main Agent review

Steps:
- [x] grep 现有 `@ecom/operation-logger` 用法，复用已有 `sendModuleExposeLog`、click/expose meta 命名方式，整理配置页、人工提报、send-award 三处参数映射。
- [x] 在配置页规则 link 点击处上报点击 UV，参数至少包含当前页面/模块、activity/config 上下文；不得影响跳转执行。
- [x] 在人工提报 summary 首次可见时上报曝光 UV，命中状态重复渲染不得重复上报。
- [x] 在剔除明细 Tab 点击和内容曝光时上报点击/曝光 UV，extra 必须区分配置项和奖励类型 DOU+币/DOU+券。
- [x] Verify Closure Dependency: logger 本身无 BAM rule；`TC-TRACK-MANUAL-HIT-EXPOSE` 依赖 `R-BAM-MANUAL-SEARCH-HIT` 形成命中态，`TC-TRACK-REMOVE-DETAIL-TAB-COIN` 与 `TC-TRACK-REMOVE-DETAIL-TAB-COUPON` 分别依赖对应 remove-detail table rule 形成 tab 内容。

### Task 9: Design Rework - 配置页全部用户态不激励提示对齐 Figma 1:9770
- task_id: DESIGN-REWORK-001
- origin_phase: /delivery:design
- active_case_id: TC-UI-CFG-ALL-BASELINE
- blocker_id: B-TC-UI-CFG-ALL-BASELINE-001
- requirement_id: AR-001
- source_refs: `07-design-alignment.md` Figma-vs-Runtime Evidence; `code-review/d2c-evidence/task-TASK-001/1_9770/manifest.md`; Figma screenshot `figma-cache/screenshots/1_9770-config-all-user-after.png`; runtime screenshot `screenshots/TC-UI-CFG-ALL-BASELINE--config-all-user--config-prompt-row.png`
- mode: MOCK_PREVIEW
- ui_evidence_mode: F2C_REQUIRED
- code_locator: `/Users/bytedance/cx/spec-2/meego-11/meego-7306602080/repos/alliance-operation-mono/apps/alliance-operation-content/src/routes/content-activity/edit/components/step-reward-config/index.tsx` lines 83-98; `/Users/bytedance/cx/spec-2/meego-11/meego-7306602080/repos/alliance-operation-mono/apps/alliance-operation-content/src/routes/content-activity/edit/components/step-reward-config/index.module.scss` lines 90-107
- implementation_directive: 在当前 design 阶段内做受限视觉返工；移除全部用户态不激励提示前的无设计来源 `DoubtIcon`，保留现有 copy、href、target、rel、click logger；按 d2c text node `1:10202` 对齐默认提示样式：灰色文案 `12px/20px`，规则入口蓝色下划线；不得新增不激励数量、下载名单、申诉入口、额外卡片、旧白板占位或下载按钮。
- allowed_files: `step-reward-config/index.tsx`; `step-reward-config/index.module.scss`
- forbidden_files: `mock/**`; BAM wrapper; store; award routes; non-active design cases
- verification_commands: HMR-first；仅当 dev server 编译失败、runtime error、类型/公共组件风险或浏览器无法定位时再升级 targeted build/typecheck
- expected_result: `TC-UI-CFG-ALL-BASELINE` 复跑时，活动参与资格下方直接展示灰色提示文案 + 蓝色下划线 `查看【不激励】规则`，无 leading icon，copy/link 精确，negative scan 仍无数量/下载/申诉/额外卡片/旧占位/下载按钮。
- stop_conditions: 若移除 icon 会改变未确权业务规则、接口合同、权限语义、真实跳转或 logger 语义，停止并返回主 Agent；否则不得扩大到其他 case。

Steps:
- [x] 移除 `NoIncentivePrompt` 中的 `DoubtIcon` 渲染，并清理不再使用的 icon import。
- [x] 调整 `.noIncentivePrompt` 与 `.noIncentiveRuleLink` 默认样式，使其与 d2c `1:10202` 的 `12px/20px`、灰色文案、蓝色下划线 link 对齐。
- [x] 保留现有 `NO_INCENTIVE_PROMPT_COPY`、`NO_INCENTIVE_RULE_LINK_COPY`、`NO_INCENTIVE_RULE_URL`、`handleRuleLinkClick` 和 `<a>` 热区。
- [x] HMR 后复跑 `TC-UI-CFG-ALL-BASELINE`，记录新 runtime screenshot / DOM / negative scan 到 `07-design-alignment.md`。

### Task 10: Design Rework - 配置页预埋名单态不激励提示对齐 Figma 1:10938
- task_id: DESIGN-REWORK-002
- origin_phase: /delivery:design
- active_case_id: TC-UI-CFG-PREFILLED-BASELINE
- blocker_id: B-TC-UI-CFG-PREFILLED-BASELINE-001
- requirement_id: AR-002
- source_refs: `07-design-alignment.md` Current Evidence for `TC-UI-CFG-PREFILLED-BASELINE`; `code-review/d2c-evidence/task-TASK-002/1_10938/manifest.md`; Figma screenshot `figma-cache/screenshots/1_10938-config-prefilled-after.png`; runtime screenshot `screenshots/TC-UI-CFG-PREFILLED-BASELINE--design--config-prefilled-user.png`
- mode: MOCK_PREVIEW
- ui_evidence_mode: F2C_REQUIRED
- code_locator: `/Users/bytedance/cx/spec-2/meego-11/meego-7306602080/repos/alliance-operation-mono/apps/alliance-operation-content/src/routes/content-activity/edit/components/step-reward-config/index.tsx` lines 49-95 and 727-740; `/Users/bytedance/cx/spec-2/meego-11/meego-7306602080/repos/alliance-operation-mono/apps/alliance-operation-content/src/routes/content-activity/edit/components/step-reward-config/index.module.scss` lines 90-108
- implementation_directive: 在当前 design 阶段内做受限视觉返工；为 `NoIncentiveRulePrompt` 增加预埋名单态样式变体，仅在 `预埋用户名单` extra 使用；预埋名单态按 d2c text node `1:11370` 对齐：灰色文案 `14px/20px`，规则入口 `#0088ff`，默认不下划线、hover 下划线；不得回归 `TC-UI-CFG-ALL-BASELINE` 已归档的 `12px/#1966ff/underline` all-user 样式；不得新增 icon、不激励数量、下载名单、申诉入口、额外卡片或旧白板占位。
- allowed_files: `step-reward-config/index.tsx`; `step-reward-config/index.module.scss`
- forbidden_files: `mock/**`; BAM wrapper; store; award routes; non-active design cases; shared unrelated components
- verification_commands: HMR-first；仅当 dev server 编译失败、runtime error、类型/公共组件风险或浏览器无法定位时再升级 targeted build/typecheck
- expected_result: `TC-UI-CFG-PREFILLED-BASELINE` 复跑时，预埋名单控件下方展示同款提示与规则入口，字体/link 默认样式符合 d2c `1:11370`，结构和负向扫描保持 PASS；快速复核 all-user prompt 不回归。
- stop_conditions: 若需要改变 copy、href、logger、表单业务语义、接口合同或权限语义，停止并返回主 Agent；否则不得扩大到其他 case。

Steps:
- [x] 为 `NoIncentiveRulePrompt` 增加预埋名单态样式变体参数，默认保持 all-user 已归档样式。
- [x] 仅在 `预埋用户名单` extra 的 `NoIncentiveRulePrompt` 调用处启用预埋名单态变体。
- [x] 新增/调整 SCSS，使预埋名单态文案为 `14px/20px`、link 为 `#0088ff`、默认不下划线且 hover 下划线。
- [x] HMR 后复跑 `TC-UI-CFG-PREFILLED-BASELINE`，并快速确认 `TC-UI-CFG-ALL-BASELINE` 不回归，记录截图 / DOM / negative scan 到 `07-design-alignment.md`。

### Task 11: Design Rework - DOU+币剔除明细筛选 placeholder 对齐 Figma 1:12120
- task_id: DESIGN-REWORK-003
- origin_phase: /delivery:design
- active_case_id: TC-UI-COIN-REMOVE-PAGE
- blocker_id: B-TC-UI-COIN-REMOVE-PAGE-001, B-TC-UI-COIN-REMOVE-PAGE-002
- requirement_id: AR-011
- source_refs: `07-design-alignment.md` Current Evidence for `TC-UI-COIN-REMOVE-PAGE`; Figma screenshot `figma-cache/screenshots/1_12120-dou-coin-removal-detail.png`; Figma node data `figma-cache/nodes/F3-get_figma_data-1_12120-d4.md`; runtime screenshot `screenshots/TC-UI-COIN-REMOVE-PAGE--remove-detail-coin-default--mock-hit.png`; runtime JSON `verify-logs/evidence/TC-UI-COIN-REMOVE-PAGE--mock-hit-runtime.json`
- mode: MOCK_PREVIEW
- ui_evidence_mode: RUNTIME_BASELINE_ALLOWED
- code_locator: `/Users/bytedance/cx/spec-2/meego-11/meego-7306602080/repos/alliance-operation-mono/apps/alliance-operation-content/src/routes/content-activity/award/components/dou-coin-remove-record-table/index.tsx` lines 45-46 and 102-104
- implementation_directive: 在当前 design 阶段内做受限视觉文案返工；将 `作品ID` 筛选 placeholder 改为 `支持批量输入，用逗号间隔`，将 `操作人` PeopleSelect placeholder 改为 `请选择`；保留 request params、columns、EcopTable search controls、SubTab wiring、BAM mock 行为和已有 renderer，不改 DOU+券表、不改 mock。
- allowed_files: `apps/alliance-operation-content/src/routes/content-activity/award/components/dou-coin-remove-record-table/index.tsx`
- forbidden_files: `mock/**`; `delivery-mock.md`; BAM generated files; `send-award/index.tsx`; `dou-coupon-remove-record-table/**`; non-active design cases
- verification_commands: HMR-first；仅当 dev server 编译失败、runtime error、类型/公共组件风险或浏览器无法定位时再升级 targeted build/typecheck
- expected_result: `TC-UI-COIN-REMOVE-PAGE` 复跑时，DOU+币剔除明细首屏结构保持不变，两个 placeholder 对齐 Figma，Network 仍命中 `apiGetDouPlusCoinRemoveRecord` / `R-BAM-COIN-REMOVE-DEFAULT`，负向扫描仍无旧列残留。
- stop_conditions: 若需要改变请求字段、分页、列定义、BAM mock、奖励类型分支或 DOU+券表，停止并返回主 Agent；否则不得扩大到其他 case。

Steps:
- [x] 修改 `candidate_ids` search placeholder 为 `支持批量输入，用逗号间隔`。
- [x] 修改 `operator_id` PeopleSelect placeholder 为 `请选择`。
- [x] 保持列白名单、request params、SubTab wiring、BAM mock rule 与 renderer 不变。
- [x] HMR 后复跑 `TC-UI-COIN-REMOVE-PAGE`，记录新截图 / DOM placeholder / Network mock hit / negative scan 到 `07-design-alignment.md`。

### Task 12: Design Rework - DOU+币剔除明细表头顺序对齐 Figma 1:12120
- task_id: DESIGN-REWORK-004
- origin_phase: /delivery:design
- active_case_id: TC-DATA-COIN-COLUMNS
- blocker_id: B-TC-DATA-COIN-COLUMNS-001
- requirement_id: AR-011
- source_refs: `07-design-alignment.md` Current Evidence for `TC-DATA-COIN-COLUMNS`; Figma screenshot `figma-cache/screenshots/1_12120-dou-coin-removal-detail.png`; Figma crop `figma-cache/crops/TC-DATA-COIN-COLUMNS--figma-table-header-wide-crop.png`; Figma node data `figma-cache/nodes/F3-get_figma_data-1_12120-d4.md`; runtime screenshot `screenshots/TC-UI-COIN-REMOVE-PAGE--design-rerun--remove-detail-coin-default--dom-capture.png`; source evidence `verify-logs/evidence/TC-DATA-COIN-COLUMNS--source-evidence.md`
- mode: MOCK_PREVIEW
- ui_evidence_mode: RUNTIME_BASELINE_ALLOWED
- code_locator: `/Users/bytedance/cx/spec-2/meego-11/meego-7306602080/repos/alliance-operation-mono/apps/alliance-operation-content/src/routes/content-activity/award/components/dou-coin-remove-record-table/index.tsx` lines 78-93
- implementation_directive: 在当前 design 阶段内做受限视觉结构返工；将 `剔除发奖时间` / `remove_time` 列移动到 `剔除发奖原因` / `remove_reason` 列之前，使 DOU+币剔除明细表头顺序对齐 Figma：`作品内容 / 剔除发奖时间 / 剔除发奖原因 / 操作人`；保留每列 title、dataIndex、width、hideInSearch、render、固定列、search、request params、pagination、BAM mock 行为和已有 renderer，不改 DOU+券表、不改 cell 内容形态。
- allowed_files: `apps/alliance-operation-content/src/routes/content-activity/award/components/dou-coin-remove-record-table/index.tsx`
- forbidden_files: `mock/**`; `delivery-mock.md`; BAM generated files; `send-award/index.tsx`; `dou-coupon-remove-record-table/**`; non-active design cases
- verification_commands: HMR-first；仅当 dev server 编译失败、runtime error、类型/公共组件风险或浏览器无法定位时再升级 targeted build/typecheck
- expected_result: `TC-DATA-COIN-COLUMNS` 复跑时，DOU+币剔除明细表头顺序为 `作品内容 / 剔除发奖时间 / 剔除发奖原因 / 操作人`，禁显列仍不出现，Network 仍命中 `apiGetDouPlusCoinRemoveRecord` / `R-BAM-COIN-REMOVE-DEFAULT`，不得提前关闭 `TC-CELL-COIN-FIRST-ROW`。
- stop_conditions: 若需要改变接口字段、列内容 renderer、分页、BAM mock、奖励类型分支或 DOU+券表，停止并返回主 Agent；否则不得扩大到其他 case。

Steps:
- [x] 将 DOU+币表格 `remove_time` 列移动到 `remove_reason` 列之前。
- [x] 保持 `remove_time` / `remove_reason` 的 title、dataIndex、width、hideInSearch 与 render 逻辑不变。
- [x] 保持列白名单、request params、SubTab wiring、BAM mock rule、pagination 与 `candidate_ids/operator_id` 列不变。
- [x] HMR 后复跑 `TC-DATA-COIN-COLUMNS`，记录新截图 / DOM header order / source order / Network mock hit / negative scan 到 `07-design-alignment.md`。

### Task 13: Design Rework - DOU+券剔除明细首屏筛选与 SubTab 行对齐 Figma 1:12390
- task_id: DESIGN-REWORK-005
- origin_phase: /delivery:design
- active_case_id: TC-UI-COUPON-REMOVE-PAGE
- blocker_id: B-TC-UI-COUPON-REMOVE-PAGE-001, B-TC-UI-COUPON-REMOVE-PAGE-002
- requirement_id: AR-013
- source_refs: `07-design-alignment.md` Current Evidence for `TC-UI-COUPON-REMOVE-PAGE`; Figma screenshot `figma-cache/screenshots/1_12390-dou-coupon-removal-detail.png`; Figma node data `figma-cache/nodes/F4-get_figma_data-1_12390-d4.md`; runtime screenshot `screenshots/TC-UI-COUPON-REMOVE-PAGE--remove-detail-coupon-default--mock-hit.png`; runtime JSON `verify-logs/evidence/TC-UI-COUPON-REMOVE-PAGE--mock-hit-runtime.json`
- mode: MOCK_PREVIEW
- ui_evidence_mode: RUNTIME_BASELINE_ALLOWED
- code_locator: `/Users/bytedance/cx/spec-2/meego-11/meego-7306602080/repos/alliance-operation-mono/apps/alliance-operation-content/src/routes/content-activity/award/components/dou-coupon-remove-record-table/index.tsx` lines 45-47 and 99-101; `/Users/bytedance/cx/spec-2/meego-11/meego-7306602080/repos/alliance-operation-mono/apps/alliance-operation-content/src/routes/content-activity/award/components/send-award/index.tsx` lines 991-995
- implementation_directive: 在当前 design 阶段内做受限可见 UI 返工；将 DOU+券 `作者ID` 筛选 placeholder 改为 `支持批量输入，用逗号间隔`，将 `操作人` PeopleSelect placeholder 改为 `请选择`；当 `activeSubTab === SubTab.REMOVE_DETAIL` 时不渲染 `ugc内容标签存在T+2修正逻辑...` 奖励下发提示，使 DOU+券剔除明细首屏从 SubTab 直接进入 filters；保留 request params、columns、EcopTable controls、SubTab 三按钮、logger、BAM mock 行为和已有 renderer，不改 DOU+币表、不改 mock。
- allowed_files: `apps/alliance-operation-content/src/routes/content-activity/award/components/dou-coupon-remove-record-table/index.tsx`; `apps/alliance-operation-content/src/routes/content-activity/award/components/send-award/index.tsx`
- forbidden_files: `mock/**`; `delivery-mock.md`; BAM generated files; `dou-coin-remove-record-table/**`; non-active design cases
- verification_commands: HMR-first；仅当 dev server 编译失败、runtime error、类型/公共组件风险或浏览器无法定位时再升级 targeted build/typecheck
- expected_result: `TC-UI-COUPON-REMOVE-PAGE` 复跑时，DOU+券剔除明细首屏结构保持配置摘要 -> SubTab -> filters -> table -> pagination，两个 placeholder 对齐 Figma，T+2 奖励下发提示不显示在 remove-detail SubTab 行，Network 仍命中 `apiGetDouPlusCouponRemoveRecord` / `R-BAM-COUPON-REMOVE-DEFAULT`，负向扫描仍无 DOU+币作品列残留。
- stop_conditions: 若需要改变请求字段、分页、列定义、BAM mock、奖励类型分支、logger 语义或 DOU+币表，停止并返回主 Agent；否则不得扩大到其他 case。

Steps:
- [x] 修改 DOU+券 `candidate_ids` search placeholder 为 `支持批量输入，用逗号间隔`。
- [x] 修改 DOU+券 `operator_id` PeopleSelect placeholder 为 `请选择`。
- [x] 在 `activeSubTab === SubTab.REMOVE_DETAIL` 时隐藏 UGC T+2 奖励下发提示，保持其他 SubTab 的提示行为不变。
- [x] 保持列白名单、request params、SubTab 三按钮、logger、BAM mock rule、pagination、renderers 与 DOU+币表不变。
- [x] HMR 后复跑 `TC-UI-COUPON-REMOVE-PAGE`，记录新截图 / DOM placeholder / T+2 negative scan / Network mock hit / DOU+币残留 negative scan 到 `07-design-alignment.md`。

### Task 14: Design Rework - DOU+券剔除明细分页总数与每页数量控件对齐 Figma 1:12401
- task_id: DESIGN-REWORK-006
- origin_phase: /delivery:design
- active_case_id: TC-UI-COUPON-REMOVE-PAGE
- blocker_id: B-TC-UI-COUPON-REMOVE-PAGE-003
- requirement_id: AR-013
- source_refs: `07-design-alignment.md` Auto Fix Rerun Evidence for `TC-UI-COUPON-REMOVE-PAGE`; Figma screenshot `figma-cache/screenshots/1_12390-dou-coupon-removal-detail.png`; Figma node data `figma-cache/nodes/F4-get_figma_data-1_12390-d4.md` pagination node `1:12401`; runtime screenshot `screenshots/TC-UI-COUPON-REMOVE-PAGE--remove-detail-coupon-default--recheck-after-DESIGN-REWORK-005-v2.png`; mock response total=40 via `R-BAM-COUPON-REMOVE-DEFAULT`
- mode: MOCK_PREVIEW
- ui_evidence_mode: RUNTIME_BASELINE_ALLOWED
- code_locator: `/Users/bytedance/cx/spec-2/meego-11/meego-7306602080/repos/alliance-operation-mono/apps/alliance-operation-content/src/routes/content-activity/award/components/dou-coupon-remove-record-table/index.tsx` around the `EcopTable<DouPlusCouponRemoveRecord>` props
- implementation_directive: 在当前 design 阶段内做受限可见 UI 返工；为 DOU+券剔除明细 EcopTable 显式补充分页配置，使 mock total=40 时分页区展示 `共40条` 和 `20条/页` / page-size 控件；保留 request params `page/page_num`、columns、placeholder、PeopleSelect、T+2 隐藏逻辑、BAM mock rule、pagination 翻页行为、renderers，不改 DOU+币表、不改 mock。
- allowed_files: `apps/alliance-operation-content/src/routes/content-activity/award/components/dou-coupon-remove-record-table/index.tsx`
- forbidden_files: `mock/**`; `delivery-mock.md`; BAM generated files; `send-award/index.tsx`; `dou-coin-remove-record-table/**`; non-active design cases
- verification_commands: HMR-first；仅当 dev server 编译失败、runtime error、类型/公共组件风险或浏览器无法定位时再升级 targeted build/typecheck
- expected_result: `TC-UI-COUPON-REMOVE-PAGE` 复跑时，分页区展示 `共40条` 与 `20条/页`，两个 placeholder 与 T+2 negative scan 仍 PASS，Network 仍命中 `apiGetDouPlusCouponRemoveRecord` / `R-BAM-COUPON-REMOVE-DEFAULT`，表头/分页/DOU+币残留 negative scan 仍满足当前 page-level contract。
- stop_conditions: 若需要改变接口字段、mock response、列定义、奖励类型分支、logger 语义、DOU+币表或后续 case，停止并返回主 Agent；否则不得扩大到其他 case。

Steps:
- [x] 为 DOU+券剔除明细 EcopTable 添加 pagination 配置，显示 `共40条` 与 `20条/页` / page-size 控件。
- [x] 保持 `page/page_num` request mapping、table columns、placeholder、PeopleSelect、T+2 隐藏逻辑和 BAM mock rule 不变。
- [x] HMR 后复跑 `TC-UI-COUPON-REMOVE-PAGE`，记录新截图 / pagination DOM / placeholder/T+2 regression / Network mock hit / DOU+币残留 negative scan 到 `07-design-alignment.md`。

### Task 15: Design Rework - 人工提报命中态 Drawer footer 与表格列结构对齐 d2c 25:13842 / 87:6973
- task_id: DESIGN-REWORK-007
- origin_phase: /delivery:design
- active_case_id: TC-UI-MANUAL-HIT-PAGE
- blocker_id: B-TC-UI-MANUAL-HIT-PAGE-001, B-TC-UI-MANUAL-HIT-PAGE-002
- requirement_id: AR-006, AR-007, AR-010
- source_refs: `07-design-alignment.md` Current Evidence for `TC-UI-MANUAL-HIT-PAGE`; d2c manifest `code-review/d2c-evidence/task-TASK-005/manifest.md`; d2c XML/JPG `code-review/d2c-evidence/task-TASK-005/87_6973/`; d2c XML/JPG `code-review/d2c-evidence/task-TASK-005/87_7016/`; Figma screenshot `figma-cache/screenshots/25_13842-manual-submit-hit-state.png`; runtime screenshot `screenshots/TC-UI-MANUAL-HIT-PAGE--manual-drawer-hit--mock-hit.png`; runtime JSON `verify-logs/evidence/TC-UI-MANUAL-HIT-PAGE--manual-hit-runtime.json`
- mode: MOCK_PREVIEW
- ui_evidence_mode: F2C_REQUIRED
- f2c_source: `code-review/d2c-evidence/task-TASK-005/manifest.md`; `25_13842/figma_25_13842_1783501825825.xml`; `87_6973/figma_87_6973_1783501944620.xml`; `87_6973/figma_87_6973_1783501944620.jpg`; `87_7016/figma_87_7016_1783502075850.xml`; `87_7016/figma_87_7016_1783502075850.jpg`
- code_locator: `/Users/bytedance/cx/spec-2/meego-11/meego-7306602080/repos/alliance-operation-mono/apps/alliance-operation-content/src/routes/content-activity/award/components/manually-submit-videos/manually-submit-videos-drawer/index.tsx` lines 86-98; `/Users/bytedance/cx/spec-2/meego-11/meego-7306602080/repos/alliance-operation-mono/apps/alliance-operation-content/src/routes/content-activity/award/components/manually-submit-videos/manually-submit-videos-drawer/manually-submit-videos-form/index.tsx` lines 671-735
- implementation_directive: 在当前 design 阶段内做受限可见结构返工；为人工提报 Drawer 自定义 footer 或使用 Auxo 支持的等价配置，使可见顺序为 `取消 -> 提交并投放`，同时保留 `handleCancel`、`handleConfirmClick`、命中项 submit guard、BatchSubmitModal 流程和 clear store 行为；调整手动提报表格 visible columns，移除/隐藏 standalone `性别`、`年龄` 列，并按 d2c 顺序展示 `序号 / 视频图文内容 / 投放金额 / 投放时长 / 转化目标偏好 / 投放生效时间 / 目标受众 / 提报理由 / 操作`；保留目标受众编辑能力、金额/时长/转化目标/生效时间/提报理由/操作渲染、summary/action、红字行态、BAM mock 行为和共享 rule。
- allowed_files: `apps/alliance-operation-content/src/routes/content-activity/award/components/manually-submit-videos/manually-submit-videos-drawer/index.tsx`; `apps/alliance-operation-content/src/routes/content-activity/award/components/manually-submit-videos/manually-submit-videos-drawer/manually-submit-videos-form/index.tsx`
- forbidden_files: `mock/**`; `delivery-mock.md`; BAM generated files; `04-tech-plan.md`; `09-test-case-matrix.md`; non-active design cases; batch-upload implementation; DOU+币/DOU+券 remove-detail files
- verification_commands: HMR-first；仅当 dev server 编译失败、runtime error、类型/公共组件风险或浏览器无法定位时再升级 targeted `git diff --check` / typecheck / build
- expected_result: `TC-UI-MANUAL-HIT-PAGE` 复跑时，Drawer footer 左到右为 `取消 / 提交并投放`；表格无 standalone `性别`、`年龄` 表头，列顺序匹配 d2c；summary/action、三行保留、红字标签、row remove、submit guard、BAM mock hit、负向扫描仍 PASS；不得关闭 `TC-CELL-MANUAL-HIT-STATUS` 或后续 case。
- stop_conditions: 若需要改变 `apiSearchDeliveryItems`/`apiCandidateRemove`/`apiDownloadContentRemoveRecord` 协议、BAM mock、真实提交语义、store 数据结构、埋点语义、批量上传 case 或后续 case，停止并返回主 Agent；否则不得扩大范围。

Steps:
- [x] 在人工提报 Drawer 中显式控制 footer 可见顺序为 `取消 -> 提交并投放`。
- [x] 保留 `handleCancel`、`handleConfirmClick`、命中项 submit guard、BatchSubmitModal 打开/确认流程和关闭清理逻辑。
- [x] 调整手动提报表格默认列，移除/隐藏 standalone `性别`、`年龄` 列。
- [x] 将 `投放生效时间` 列移动到 `目标受众` 列之前，保持各列 title/dataIndex/cellType/render/edit 能力不变。
- [x] 保持 summary/action、红字行态、三行保留、row remove、BAM mock rule 和负向残留扫描不变。
- [x] HMR 后复跑 `TC-UI-MANUAL-HIT-PAGE`，记录 footer 顺序、表格列顺序、无额外列、summary/action/row labels、Network/BAM marker 和 negative scan 到 `07-design-alignment.md`。
