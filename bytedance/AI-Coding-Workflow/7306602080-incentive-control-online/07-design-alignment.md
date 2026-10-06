# 07 Design Alignment

> command: `/delivery:design`  
> workspace: `artifacts/7306602080-incentive-control-online`  
> started_at: `2026-07-09 22:02:55 +0800`  
> execution_repo_root: `/Users/bytedance/cx/spec-2/meego-11/meego-7306602080/repos/alliance-operation-mono`  
> browser_runtime_mode: `TRAE_DESKTOP`  
> vmok_url: `https://ecop.bytedance.net/alliance-operation-content/content-activity/list?cjDebugSubApp=alliance-operation-content:http://localhost:8083/alliance-operation-content&externalLeadsDomainMock=1`

## Scope Guard

- `/delivery:design` consumes every `09-test-case-matrix.md` case whose `verification_stage` is `design` or `verify+design`.
- The Design Case Queue is strict serial: only one `active_case_id` is open at a time.
- Scope is not compressed for delivery convenience. A case is archived only after its `contract_ref`, `positive_assertion`, `negative_assertion`, and `evidence_required` are consumed.
- Subagents, when used, are scoped to the active case and are not interrupted arbitrarily.

## Design Case Queue

| Order | case_id | layer | runtime_state | verify_screenshot_key | implementation_task | ui_evidence_mode | archive_status |
|---:|---|---|---|---|---|---|---|
| 1 | TC-UI-CFG-ALL-BASELINE | page-level | config-all-user | cfg-all-user-prompt | Task 1 | F2C_REQUIRED | FIXED_PASS_ARCHIVED |
| 2 | TC-UI-CFG-PREFILLED-BASELINE | page-level | config-prefilled-user | cfg-prefilled-prompt | Task 2 | F2C_REQUIRED | FIXED_PASS_ARCHIVED |
| 3 | TC-UI-COIN-REMOVE-PAGE | page-level | remove-detail-coin-default | coin-remove-page | Task 3 | RUNTIME_BASELINE_ALLOWED | FIXED_PASS_ARCHIVED |
| 4 | TC-DATA-COIN-COLUMNS | region-level | coin-table-loaded | coin-remove-columns | Task 3 | RUNTIME_BASELINE_ALLOWED | FIXED_PASS_ARCHIVED |
| 5 | TC-CELL-COIN-FIRST-ROW | cell-level | coin-table-loaded | coin-remove-first-row | Task 3 | RUNTIME_BASELINE_ALLOWED | PASS_ARCHIVED |
| 6 | TC-INT-REMOVE-TAB-SWITCH-COIN | interaction-level | coin-tab-switch | coin-remove-tab-switch | Task 3 | RUNTIME_BASELINE_ALLOWED | PASS_ARCHIVED |
| 7 | TC-UI-COUPON-REMOVE-PAGE | page-level | remove-detail-coupon-default | coupon-remove-page | Task 4 | RUNTIME_BASELINE_ALLOWED | FIXED_PASS_ARCHIVED |
| 8 | TC-DATA-COUPON-COLUMNS | region-level | coupon-table-loaded | coupon-remove-columns | Task 4 | RUNTIME_BASELINE_ALLOWED | PASS_ARCHIVED |
| 9 | TC-CELL-COUPON-FIRST-ROW | cell-level | coupon-table-loaded | coupon-remove-first-row | Task 4 | RUNTIME_BASELINE_ALLOWED | PASS_ARCHIVED |
| 10 | TC-INT-REMOVE-TAB-SWITCH-COUPON | interaction-level | coupon-tab-switch | coupon-remove-tab-switch | Task 4 | RUNTIME_BASELINE_ALLOWED | PASS_ARCHIVED |
| 11 | TC-UI-MANUAL-HIT-PAGE | page-level | manual-hit | manual-hit-page | Task 5 | F2C_REQUIRED | FIXED_PASS_ARCHIVED |
| 12 | TC-CELL-MANUAL-HIT-STATUS | cell-level | manual-hit-row | manual-hit-status-cell | Task 5 | F2C_REQUIRED | PASS_ARCHIVED |
| 13 | TC-UI-BATCH-HIT-REUSE | page-level | batch-upload-hit | batch-hit-reuse | Task 6 | RUNTIME_BASELINE_ALLOWED | NON_BLOCKER_ARCHIVED |
| 14 | TC-INT-MANUAL-EXPORT-PERSIST-AFTER-REMOVE | interaction-level | manual-hit-after-remove | manual-export-persist-after-remove | Task 5 / REPAIR-005 | RUNTIME_BASELINE_ALLOWED | PASS_WITH_NOTES_ARCHIVED |

## Active Case

- archived_case_id: `TC-UI-CFG-ALL-BASELINE`
- archived_status: `FIXED_PASS`
- closure_screenshot: `screenshots/TC-UI-CFG-ALL-BASELINE--design-rerun--config-all-user.png`
- archived_case_id: `TC-UI-CFG-PREFILLED-BASELINE`
- archived_status: `FIXED_PASS`
- closure_screenshot: `screenshots/TC-UI-CFG-PREFILLED-BASELINE--design-rerun--config-prefilled-user--prompt-row.png`
- next_active_case_id: `TC-UI-COIN-REMOVE-PAGE`
- archived_case_id: `TC-UI-COIN-REMOVE-PAGE`
- archived_status: `FIXED_PASS`
- closure_screenshot: `screenshots/TC-UI-COIN-REMOVE-PAGE--design-rerun--remove-detail-coin-default--dom-capture.png`
- archived_case_id: `TC-DATA-COIN-COLUMNS`
- archived_status: `FIXED_PASS`
- closure_screenshot: `screenshots/TC-DATA-COIN-COLUMNS--design-rerun--coin-table-header.png`
- archived_case_id: `TC-CELL-COIN-FIRST-ROW`
- archived_status: `PASS`
- closure_screenshot: `screenshots/TC-DATA-COIN-COLUMNS--design-rerun--coin-table-header.png`
- archived_case_id: `TC-INT-REMOVE-TAB-SWITCH-COIN`
- archived_status: `PASS`
- closure_screenshot: `screenshots/TC-DATA-COIN-COLUMNS--design-rerun--coin-table-header.png`
- archived_case_id: `TC-UI-COUPON-REMOVE-PAGE`
- archived_status: `FIXED_PASS`
- closure_screenshot: `screenshots/TC-UI-COUPON-REMOVE-PAGE--design-rerun--pagination.png`
- archived_case_id: `TC-DATA-COUPON-COLUMNS`
- archived_status: `PASS`
- closure_screenshot: `screenshots/TC-UI-COUPON-REMOVE-PAGE--design-rerun--pagination.png`
- archived_case_id: `TC-CELL-COUPON-FIRST-ROW`
- archived_status: `PASS`
- closure_screenshot: `screenshots/TC-UI-COUPON-REMOVE-PAGE--design-rerun--pagination.png`
- archived_case_id: `TC-INT-REMOVE-TAB-SWITCH-COUPON`
- archived_status: `PASS`
- closure_screenshot: `screenshots/TC-INT-REMOVE-TAB-SWITCH-COUPON--coupon-tab-switch--design-recheck-stable.png`
- archived_case_id: `TC-UI-MANUAL-HIT-PAGE`
- archived_status: `FIXED_PASS`
- closure_screenshot: `screenshots/TC-UI-MANUAL-HIT-PAGE--design-rerun--manual-drawer-hit-rework-007.png`
- archived_case_id: `TC-CELL-MANUAL-HIT-STATUS`
- archived_status: `PASS`
- closure_screenshot: `screenshots/TC-UI-MANUAL-HIT-PAGE--design-rerun--manual-drawer-hit-rework-007.png`
- archived_case_id: `TC-UI-BATCH-HIT-REUSE`
- archived_status: `NON_BLOCKER`
- closure_screenshot: `screenshots/TC-UI-BATCH-HIT-REUSE--design-current-batch-hit.png`
- archived_case_id: `TC-INT-MANUAL-EXPORT-PERSIST-AFTER-REMOVE`
- archived_status: `PASS_WITH_NOTES`
- closure_screenshot: `screenshots/TC-INT-MANUAL-EXPORT-PERSIST-AFTER-REMOVE--after-remove-toolbar--drawer.png`
- active_case_id: `none`
- status: `DESIGN_REPAIR_SCOPE_COMPLETE_WITH_NOTES`

## Design Case Ledger

| case_id | figma_source | runtime_source | result | archive_status | auto_fix_status | next_action |
|---|---|---|---|---|---|---|
| TC-UI-CFG-ALL-BASELINE | node `1:9770`; d2c `code-review/d2c-evidence/task-TASK-001/1_9770/` | `screenshots/TC-UI-CFG-ALL-BASELINE--design-rerun--config-all-user.png` | FIXED_PASS | ARCHIVED | FIX_VERIFIED | Continue to `TC-UI-CFG-PREFILLED-BASELINE` |
| TC-UI-CFG-PREFILLED-BASELINE | node `1:10938`; d2c `code-review/d2c-evidence/task-TASK-002/1_10938/` | `screenshots/TC-UI-CFG-PREFILLED-BASELINE--design-rerun--config-prefilled-user--prompt-row.png` | FIXED_PASS | ARCHIVED | FIX_VERIFIED | Continue to `TC-UI-COIN-REMOVE-PAGE` |
| TC-UI-COIN-REMOVE-PAGE | node `1:12120`; Figma node data `figma-cache/nodes/F3-get_figma_data-1_12120-d4.md` | `screenshots/TC-UI-COIN-REMOVE-PAGE--design-rerun--remove-detail-coin-default--dom-capture.png` | FIXED_PASS | ARCHIVED | FIX_VERIFIED | Continue to `TC-DATA-COIN-COLUMNS` |
| TC-DATA-COIN-COLUMNS | node `1:12120`; crop `figma-cache/crops/TC-DATA-COIN-COLUMNS--figma-table-header-wide-crop.png` | `screenshots/TC-DATA-COIN-COLUMNS--design-rerun--coin-table-header.png`; current source order `candidate_ids -> remove_time -> remove_reason -> operator_id` | FIXED_PASS | ARCHIVED | FIX_VERIFIED | Continue to `TC-CELL-COIN-FIRST-ROW` |
| TC-CELL-COIN-FIRST-ROW | node data `1:12278`, `1:12291`, `1:12281`; screenshot `figma-cache/screenshots/1_12120-dou-coin-removal-detail.png` | `screenshots/TC-DATA-COIN-COLUMNS--design-rerun--coin-table-header.png`; source evidence `verify-logs/evidence/TC-CELL-COIN-FIRST-ROW--source-evidence.md` | PASS | ARCHIVED | N/A | Continue to `TC-INT-REMOVE-TAB-SWITCH-COIN` |
| TC-INT-REMOVE-TAB-SWITCH-COIN | active tab `1:12273`; node data `figma-cache/nodes/F3-get_figma_data-1_12120-d4.md` | `screenshots/TC-DATA-COIN-COLUMNS--design-rerun--coin-table-header.png`; source evidence `verify-logs/evidence/TC-INT-REMOVE-TAB-SWITCH-COIN--source-evidence.md` | PASS | ARCHIVED | N/A | Continue to `TC-UI-COUPON-REMOVE-PAGE` |
| TC-UI-COUPON-REMOVE-PAGE | node `1:12390`; screenshot `figma-cache/screenshots/1_12390-dou-coupon-removal-detail.png`; node data `figma-cache/nodes/F4-get_figma_data-1_12390-d4.md` | `screenshots/TC-UI-COUPON-REMOVE-PAGE--design-rerun--pagination.png`; runtime JSON `verify-logs/evidence/TC-UI-COUPON-REMOVE-PAGE--mock-hit-runtime.json` | FIXED_PASS | ARCHIVED | FIX_VERIFIED | Continue to `TC-DATA-COUPON-COLUMNS` |
| TC-DATA-COUPON-COLUMNS | node `1:12390`; header nodes `1:12561`, `1:12670`; screenshot `figma-cache/screenshots/1_12390-dou-coupon-removal-detail.png` | `screenshots/TC-UI-COUPON-REMOVE-PAGE--design-rerun--pagination.png`; source order `candidate_ids -> remove_reason -> remove_time -> operator_id` | PASS | ARCHIVED | N/A | Continue to `TC-CELL-COUPON-FIRST-ROW` |
| TC-CELL-COUPON-FIRST-ROW | node `1:12390`; cell/header nodes `1:12561`, `1:12670`, `1:12574`, `1:12564`, `1:12671`; screenshot `figma-cache/screenshots/1_12390-dou-coupon-removal-detail.png` | `screenshots/TC-UI-COUPON-REMOVE-PAGE--design-rerun--pagination.png`; computed style `verify-logs/evidence/TC-CELL-COUPON-FIRST-ROW--runtime-computed-style.json`; source evidence `verify-logs/evidence/TC-CELL-COUPON-FIRST-ROW--source-evidence.md` | PASS | ARCHIVED | N/A | Continue to `TC-INT-REMOVE-TAB-SWITCH-COUPON` |
| TC-INT-REMOVE-TAB-SWITCH-COUPON | active tab node `1:12560`; screenshot `figma-cache/screenshots/1_12390-dou-coupon-removal-detail.png`; node data `figma-cache/nodes/F4-get_figma_data-1_12390-d4.md` | fresh closure `screenshots/TC-INT-REMOVE-TAB-SWITCH-COUPON--coupon-tab-switch--design-recheck-stable.png`; persisted baseline `screenshots/TC-INT-REMOVE-TAB-SWITCH-COUPON--coupon-tab-switch--mock-hit.png`; runtime JSON `verify-logs/evidence/TC-INT-REMOVE-TAB-SWITCH-COUPON--runtime.json`; source evidence `verify-logs/evidence/TC-INT-REMOVE-TAB-SWITCH-COUPON--source-evidence.md` | PASS | ARCHIVED | N/A | Continue to `TC-UI-MANUAL-HIT-PAGE` |
| TC-UI-MANUAL-HIT-PAGE | d2c `code-review/d2c-evidence/task-TASK-005/`; nodes `25:13842`, `87:6973`, `87:7016`; screenshot `figma-cache/screenshots/25_13842-manual-submit-hit-state.png` | closure `screenshots/TC-UI-MANUAL-HIT-PAGE--design-rerun--manual-drawer-hit-rework-007.png`; evidence `verify-logs/evidence/TC-UI-MANUAL-HIT-PAGE--design-rerun-rework-007-runtime.json`; baseline `screenshots/TC-UI-MANUAL-HIT-PAGE--manual-drawer-hit--mock-hit.png` | FIXED_PASS | ARCHIVED | FIX_VERIFIED | Continue to `TC-CELL-MANUAL-HIT-STATUS` only |
| TC-CELL-MANUAL-HIT-STATUS | row label nodes `87:7028` / `87:7113`; d2c row node `87:7016`; screenshot `figma-cache/screenshots/25_13842-manual-submit-hit-state.png`; design evidence `verify-logs/evidence/TC-CELL-MANUAL-HIT-STATUS--design-alignment-evidence.json` | closure screenshot `screenshots/TC-UI-MANUAL-HIT-PAGE--design-rerun--manual-drawer-hit-rework-007.png`; computed style `verify-logs/evidence/TC-CELL-MANUAL-HIT-STATUS--runtime-computed-style.json`; design evidence `verify-logs/evidence/TC-CELL-MANUAL-HIT-STATUS--design-alignment-evidence.json` | PASS | ARCHIVED | N/A | Continue to `TC-UI-BATCH-HIT-REUSE` only |
| TC-UI-BATCH-HIT-REUSE | nodes `25:13971` / `101:6308` / `101:6332`; IMG8; Task 6 runtime baseline allowed; AF-003 | fresh closure `screenshots/TC-UI-BATCH-HIT-REUSE--design-current-batch-hit.png`; subagent closure `screenshots/TC-UI-BATCH-HIT-REUSE--design-check-current.png`; verify Network/runtime `verify-logs/evidence/TC-UI-BATCH-HIT-REUSE--runtime-mock-hit.json`; design evidence `verify-logs/evidence/TC-UI-BATCH-HIT-REUSE--design-alignment-evidence.json` | NON_BLOCKER | ARCHIVED | N/A | Design queue complete; keep real backend and batch interaction rechecks open |
| TC-INT-MANUAL-EXPORT-PERSIST-AFTER-REMOVE | Figma/manual action nodes `87:7000` / `87:7002`; manual hit baseline `figma-cache/screenshots/25_13842-manual-submit-hit-state.png`; d2c `code-review/d2c-evidence/task-TASK-005/`; REPAIR-005 interaction contract | runtime screenshot `screenshots/TC-INT-MANUAL-EXPORT-PERSIST-AFTER-REMOVE--after-remove-toolbar--drawer.png`; runtime JSON `verify-logs/evidence/TC-INT-MANUAL-EXPORT-PERSIST-AFTER-REMOVE--runtime.json`; synthetic Network boundary `verify-logs/network/TC-INT-MANUAL-EXPORT-PERSIST-AFTER-REMOVE--network.md`; case doc `verify-logs/case-results/TC-INT-MANUAL-EXPORT-PERSIST-AFTER-REMOVE.md` | PASS_WITH_NOTES | ARCHIVED | N/A | Repair design replay complete; real Feishu sheet / real export XHR recheck remains open |

## Figma-vs-Runtime Evidence

| field | value |
|---|---|
| case_id | TC-UI-CFG-ALL-BASELINE |
| figma_source_type | FIGMA_SCREENSHOT + FIGMA_NODE_DATA |
| figma_source | node `1:9770`, text `1:10202`; `figma-cache/screenshots/1_9770-config-all-user-after.png`; d2c archive `code-review/d2c-evidence/task-TASK-001/1_9770/` |
| ui_evidence_mode | F2C_REQUIRED |
| f2c_source | d2c manifest/xml/jpg under `code-review/d2c-evidence/task-TASK-001/1_9770/` |
| consumed_contract | d2c XML lines 227-245: `活动参与资格` row, `全部用户` checked, helper text node `1:10202` is grey sentence plus blue underlined `查看【不激励】规则`; helper container has no leading icon |
| runtime_source | `screenshots/TC-UI-CFG-ALL-BASELINE--config-all-user--config-prompt-row.png`; verify case result `verify-logs/case-results/TC-UI-CFG-ALL-BASELINE.md` |
| figma_baseline_materialization | `local_file`; PNG `3616 x 4746`, d2c JPG `1808 x 2373`, XML readable |
| semantic_grid_comparison | PASS: all-user state, prompt placement under `活动参与资格`, following form order, copy, and link are present |
| structure_comparison | BLOCKER: runtime/code adds leading `DoubtIcon` before the helper text, not present in Figma/d2c contract |
| style_comparison | BLOCKER: runtime prompt uses `14px`; link uses `#0088ff` with no default underline, while d2c text node uses `12px`, link `rgb(25,102,255)` and underline |
| negative_scan | PASS: no non-incentive count, download list, appeal entry, extra card, old whiteboard placeholder, or download button |
| result | AUTO_FIX_REQUIRED / DESIGN_AUTO_FIX |

### Auto Fix Rerun Evidence: TC-UI-CFG-ALL-BASELINE

| field | value |
|---|---|
| case_id | TC-UI-CFG-ALL-BASELINE |
| figma_source_type | FIGMA_SCREENSHOT + FIGMA_NODE_DATA |
| figma_source | node `1:9770`, text `1:10202`; `figma-cache/screenshots/1_9770-config-all-user-after.png`; d2c archive `code-review/d2c-evidence/task-TASK-001/1_9770/` |
| ui_evidence_mode | F2C_REQUIRED |
| f2c_source | d2c manifest/xml/jpg under `code-review/d2c-evidence/task-TASK-001/1_9770/` |
| consumed_contract | text-only helper, grey `12px/20px` sentence, blue `rgb(25,102,255)` underlined link, no leading icon |
| runtime_source | `screenshots/TC-UI-CFG-ALL-BASELINE--design-rerun--config-all-user.png` |
| runtime_materialization_status | local_file; PNG `1733 x 1523` |
| semantic_grid_comparison | PASS: all-user state, form order, prompt placement, copy, link, and following controls match the Figma/d2c contract |
| structure_comparison | PASS: prompt children are text span then `<a>`; no svg/img/icon child in prompt; no standalone card |
| style_comparison | PASS: prompt `12px/20px rgb(188,189,192)`; link `12px/20px rgb(25,102,255)` and underlined |
| negative_scan | PASS: no non-incentive count, download list, appeal entry, extra card, old whiteboard placeholder, or download button |
| result | FIXED_PASS |

### Current Evidence: TC-UI-COIN-REMOVE-PAGE

| field | value |
|---|---|
| case_id | TC-UI-COIN-REMOVE-PAGE |
| figma_source_type | FIGMA_SCREENSHOT + FIGMA_NODE_DATA |
| figma_source | node `1:12120`; screenshot `figma-cache/screenshots/1_12120-dou-coin-removal-detail.png`; node data `figma-cache/nodes/F3-get_figma_data-1_12120-d4.md` |
| ui_evidence_mode | RUNTIME_BASELINE_ALLOWED |
| f2c_source | N/A; current task mode does not require d2c gate, but Figma screenshot/node data were consumed |
| consumed_contract | DOU+币剔除明细 first screen: config summary -> SubTab -> filters -> table -> pagination; filter placeholders `支持批量输入，用逗号间隔` and `请选择`; table headers `作品内容 / 剔除发奖原因 / 剔除发奖时间 / 操作人`; no legacy delivery columns |
| runtime_source | `screenshots/TC-UI-COIN-REMOVE-PAGE--remove-detail-coin-default--mock-hit.png`; runtime JSON `verify-logs/evidence/TC-UI-COIN-REMOVE-PAGE--mock-hit-runtime.json` |
| runtime_materialization_status | local_file |
| semantic_grid_comparison | PASS_WITH_BLOCKER: page region order, tabs, table, and pagination match; filter placeholder text mismatches |
| structure_comparison | PASS: three tabs visible, `剔除明细` active, filters/table/pagination present |
| style_comparison | BLOCKER: `作品ID` placeholder is `支持批量查询，用逗号隔开` instead of `支持批量输入，用逗号间隔`; `操作人` placeholder is `请输入姓名搜索` instead of `请选择` |
| negative_scan | PASS: no hidden legacy tabs, no `投放金额`, no `充值记录`, no old delivery table, no cross-tab column residue |
| result | AUTO_FIX_REQUIRED / DESIGN_AUTO_FIX |

### Auto Fix Rerun Evidence: TC-UI-COIN-REMOVE-PAGE

| field | value |
|---|---|
| case_id | TC-UI-COIN-REMOVE-PAGE |
| figma_source_type | FIGMA_SCREENSHOT + FIGMA_NODE_DATA |
| figma_source | node `1:12120`; screenshot `figma-cache/screenshots/1_12120-dou-coin-removal-detail.png`; node data `figma-cache/nodes/F3-get_figma_data-1_12120-d4.md` |
| ui_evidence_mode | RUNTIME_BASELINE_ALLOWED |
| f2c_source | N/A |
| consumed_contract | Region: DOU+币剔除明细/SubTab/筛选区/表格/分页; filters `作品ID` placeholder `支持批量输入，用逗号间隔`, `操作人` placeholder `请选择`; no legacy delivery columns |
| runtime_source | `screenshots/TC-UI-COIN-REMOVE-PAGE--design-rerun--remove-detail-coin-default--dom-capture.png` |
| runtime_materialization_status | local_file; PNG `1498 x 1317` |
| semantic_grid_comparison | PASS: config summary, tabs, filters, work table, and pagination match active case contract |
| structure_comparison | PASS: legacy tabs visible, `剔除明细` active, filters before table, pagination present |
| style_comparison | PASS: `作品ID` placeholder=`支持批量输入，用逗号间隔`; `操作人` placeholder=`请选择` |
| negative_scan | PASS: no `投放金额`, no `充值记录`, no old delivery table columns, no DOU+券 author residue |
| mock_evidence | PASS: console `[BAM_MOCK_HIT]`, api `apiGetDouPlusCoinRemoveRecord`, rule `R-BAM-COIN-REMOVE-DEFAULT` |
| result | FIXED_PASS |

### Visual Contract Consumption: TC-UI-COIN-REMOVE-PAGE

| field | value |
|---|---|
| case_id | TC-UI-COIN-REMOVE-PAGE |
| contract_ref | AR-011 DOU+币剔除明细首屏; Region:DOU+币剔除明细/SubTab/筛选区/表格/分页; Figma node `1:12120`, IMG5 |
| positive_assertion_consumed | PASS after rework: clicking DOU+币奖励投放 `剔除明细` shows active Tab, filters, work table, pagination, and requests `apiGetDouPlusCoinRemoveRecord` through rule `R-BAM-COIN-REMOVE-DEFAULT` |
| negative_assertion_consumed | PASS: legacy tabs are not hidden; no `投放金额`, `充值记录`, old delivery table, cross-tab columns, DOU+券 author residue, or hallucinated extra controls are visible |
| evidence_required_consumed | PASS: Figma screenshot/node data, local runtime screenshot, DOM placeholder facts, Network/mock hit summary, and negative DOM scan were consumed; closure screenshot is materialized as a local PNG |
| closure_risk | none for design scope; real backend pagination/sorting/has_more remains a separate post-verify real-backend note and does not close in `/delivery:design` |

### Current Evidence: TC-DATA-COIN-COLUMNS

| field | value |
|---|---|
| case_id | TC-DATA-COIN-COLUMNS |
| figma_source_type | FIGMA_SCREENSHOT + FIGMA_NODE_DATA |
| figma_source | node `1:12120`; screenshot `figma-cache/screenshots/1_12120-dou-coin-removal-detail.png`; region crop `figma-cache/crops/TC-DATA-COIN-COLUMNS--figma-table-header-wide-crop.png`; node data `figma-cache/nodes/F3-get_figma_data-1_12120-d4.md` |
| ui_evidence_mode | RUNTIME_BASELINE_ALLOWED |
| f2c_source | N/A; current case is existing EcopTable column whitelist/order verification, not F2C_REQUIRED |
| consumed_contract | DOU+币剔除明细 table header order from Figma crop: `作品内容` -> `剔除发奖时间` -> `剔除发奖原因` -> `操作人`; forbidden columns `投放金额` / `投放状态` / `充值记录` / `处罚原因` / DOU+券作者信息 absent |
| runtime_source | closure screenshot `screenshots/TC-UI-COIN-REMOVE-PAGE--design-rerun--remove-detail-coin-default--dom-capture.png`; verify screenshot `screenshots/TC-UI-COIN-REMOVE-PAGE--remove-detail-coin-default--mock-hit.png`; runtime JSON `verify-logs/evidence/TC-UI-COIN-REMOVE-PAGE--mock-hit-runtime.json`; source evidence `verify-logs/evidence/TC-DATA-COIN-COLUMNS--source-evidence.md` |
| runtime_materialization_status | local_file for all screenshot/runtime/source evidence |
| semantic_grid_comparison | BLOCKER: table exists under filters and whitelist columns exist, but runtime/source order is `作品内容` -> `剔除发奖原因` -> `剔除发奖时间` -> `操作人` |
| structure_comparison | BLOCKER: `剔除发奖时间` and `剔除发奖原因` are reversed relative to Figma |
| style_comparison | blocked_by_structure; no pixel-level closure before visible column order matches |
| negative_scan | PASS: no `投放金额`, `投放状态`, `充值记录`, `处罚原因`, DOU+券作者信息, or old delivery-table column residue |
| result | AUTO_FIX_REQUIRED / DESIGN_AUTO_FIX |

### Visual Contract Consumption: TC-DATA-COIN-COLUMNS

| field | value |
|---|---|
| case_id | TC-DATA-COIN-COLUMNS |
| contract_ref | AR-011 DOU+币表头与列白名单; Region:DOU+币剔除明细/表格; list style:DOU+币剔除明细; Figma node `1:12120`, headers `1:12278` / `1:12291` / `1:12281` |
| positive_assertion_consumed | PARTIAL: 4 个目标列存在且字段 key/dataIndex 可追溯; FAIL: visual order does not match Figma crop because `剔除发奖原因` appears before `剔除发奖时间` |
| negative_assertion_consumed | PASS: forbidden columns and cross-tab DOU+券 author residue are absent in runtime DOM and source column config |
| evidence_required_consumed | PASS: DOM/runtime screenshot/source column check were consumed; Figma crop was materialized as `figma-cache/crops/TC-DATA-COIN-COLUMNS--figma-table-header-wide-crop.png` |
| closure_risk | current case cannot be archived before column-order rework and same-case rerun |

### Auto Fix Rerun Evidence: TC-DATA-COIN-COLUMNS

| field | value |
|---|---|
| case_id | TC-DATA-COIN-COLUMNS |
| figma_source_type | FIGMA_SCREENSHOT + FIGMA_NODE_DATA |
| figma_source | node `1:12120`; crop `figma-cache/crops/TC-DATA-COIN-COLUMNS--figma-table-header-wide-crop.png`; node data `figma-cache/nodes/F3-get_figma_data-1_12120-d4.md` |
| ui_evidence_mode | RUNTIME_BASELINE_ALLOWED |
| f2c_source | N/A; current case is existing EcopTable column whitelist/order verification |
| consumed_contract | DOU+币剔除明细 table header order: `作品内容` -> `剔除发奖时间` -> `剔除发奖原因` -> `操作人`; forbidden old delivery/DOU+券 columns absent |
| runtime_source | `screenshots/TC-DATA-COIN-COLUMNS--design-rerun--coin-table-header.png` |
| runtime_materialization_status | local_file; PNG `1733 x 1523` |
| semantic_grid_comparison | PASS: DOU+币剔除明细 loaded state, filters/table region, and header order match Figma crop |
| structure_comparison | PASS: DOM/runtime table header order is `作品内容 / 剔除发奖时间 / 剔除发奖原因 / 操作人` |
| style_comparison | PASS for current case scope: table header row aligns after column order fix; no additional header style blocker reported |
| negative_scan | PASS: no `投放金额`, `投放状态`, `充值记录`, `处罚原因`, DOU+券作者信息, `券数量`, or old delivery-table column residue |
| mock_evidence | PASS: `apiGetDouPlusCoinRemoveRecord` and console `[BAM_MOCK_HIT]` for `R-BAM-COIN-REMOVE-DEFAULT` |
| result | FIXED_PASS |

### Current Evidence: TC-CELL-COIN-FIRST-ROW

| field | value |
|---|---|
| case_id | TC-CELL-COIN-FIRST-ROW |
| figma_source_type | FIGMA_NODE_DATA + FIGMA_SCREENSHOT |
| figma_source | node data `figma-cache/nodes/F3-get_figma_data-1_12120-d4.md` for nodes `1:12278`, `1:12291`, `1:12281`; screenshot `figma-cache/screenshots/1_12120-dou-coin-removal-detail.png` |
| ui_evidence_mode | RUNTIME_BASELINE_ALLOWED |
| f2c_source | N/A; current case is existing EcopTable cell renderer verification, not F2C_REQUIRED |
| consumed_contract | DOU+币首行 cell contract: 作品内容=封面/标题/ID; 时间=`remove_time`; 原因=`remove_reason`; 操作人=PeopleCard/`-`; no recharge/delivery-status/penalty/naked operator id/author structure |
| runtime_source | `screenshots/TC-DATA-COIN-COLUMNS--design-rerun--coin-table-header.png`; source evidence `verify-logs/evidence/TC-CELL-COIN-FIRST-ROW--source-evidence.md`; current browser DOM/computed style from design-checker |
| runtime_materialization_status | local_file; PNG `1733 x 1523` |
| semantic_grid_comparison | PASS: first row has four target cells in the post-case4 order and uses the expected field/render mapping |
| structure_comparison | PASS: cover/title/ID, time, reason, and PeopleCard/default avatar renderer are observable |
| style_comparison | PASS for cell contract scope: cover `40x60` radius `4px`; cell text `12px/16px`; ID `#999`; PeopleCard avatar `16x16` radius `8px` |
| negative_scan | PASS: no `充值记录`, `投放状态`, `处罚原因`, naked `operator_id`, author nickname/avatar structure, `作者信息`, or `券数量` |
| mock_evidence | PASS: `apiGetDouPlusCoinRemoveRecord` hit `R-BAM-COIN-REMOVE-DEFAULT` with row fields present |
| result | PASS |

### Visual Contract Consumption: TC-CELL-COIN-FIRST-ROW

| field | value |
|---|---|
| case_id | TC-CELL-COIN-FIRST-ROW |
| contract_ref | AR-011 DOU+币首行关键单元格; Cell:DOU+币剔除明细/作品内容/原因/时间/操作人; nodes `1:12278`, `1:12291`, `1:12281` |
| positive_assertion_consumed | PASS: 首行作品内容含封面/标题/ID，原因来自 `remove_reason`，时间由 `remove_time` 格式化，操作人为 PeopleCard/default avatar 或 `-` renderer; four key cells are observable |
| negative_assertion_consumed | PASS: no `充值记录`, `投放状态`, `处罚原因`, naked `operator_id`, author nickname/avatar structure, DOU+券 author info, or coupon count residue |
| evidence_required_consumed | PASS: DOM/current browser evidence, local screenshot, source renderer evidence, and computed style summary were consumed |
| closure_risk | none for design scope; readable PeopleCard employee name and real backend row order remain separate real-verify notes and do not block this cell-level design closure |

### Current Evidence: TC-INT-REMOVE-TAB-SWITCH-COIN

| field | value |
|---|---|
| case_id | TC-INT-REMOVE-TAB-SWITCH-COIN |
| figma_source_type | FIGMA_NODE_DATA + FIGMA_SCREENSHOT |
| figma_source | active tab `1:12273`; node data `figma-cache/nodes/F3-get_figma_data-1_12120-d4.md`; screenshot `figma-cache/screenshots/1_12120-dou-coin-removal-detail.png` |
| ui_evidence_mode | RUNTIME_BASELINE_ALLOWED |
| f2c_source | N/A; current case verifies existing Radio/SubTab + EcopTable runtime baseline |
| consumed_contract | 三个同级 Tab `奖励下发 / 投放明细 / 剔除明细`; `剔除明细` active style; click triggers DOU+币 remove-detail table and request; legacy tabs remain returnable; no DOU+券 table or cross reward residue |
| runtime_source | `screenshots/TC-DATA-COIN-COLUMNS--design-rerun--coin-table-header.png`; runtime JSON `verify-logs/evidence/TC-UI-COIN-REMOVE-PAGE--mock-hit-runtime.json`; source evidence `verify-logs/evidence/TC-INT-REMOVE-TAB-SWITCH-COIN--source-evidence.md`; bounded click evidence from design-checker |
| runtime_materialization_status | local_file; PNG `1733 x 1523` |
| semantic_grid_comparison | PASS: three tabs are visible, `剔除明细` is checked, and DOU+币 table region follows |
| structure_comparison | PASS: bounded click `剔除明细 -> 投放明细 -> 剔除明细` preserves legacy tab return and re-enters remove-detail table |
| style_comparison | PASS: active Radio token color `rgb(25,102,255)` matches Figma `#1966FF`; active rect `90x32` |
| negative_scan | PASS: no DOU+券 table, `作者信息`, `券数量`, `投放金额`, `投放状态`, `充值记录`, or `处罚原因` residue |
| mock_evidence | PASS: `apiGetDouPlusCoinRemoveRecord` hit `R-BAM-COIN-REMOVE-DEFAULT`; no coupon remove request observed in current DOU+币 case |
| result | PASS |

### Visual Contract Consumption: TC-INT-REMOVE-TAB-SWITCH-COIN

| field | value |
|---|---|
| case_id | TC-INT-REMOVE-TAB-SWITCH-COIN |
| contract_ref | AR-011/AR-017 DOU+币 Tab 切换; Interaction:奖励投放/SubTab/剔除明细; active tab `1:12273` |
| positive_assertion_consumed | PASS: activeSubTab is `剔除明细`, table request is triggered, legacy tabs are visible/returnable, and `SubTab.REMOVE_DETAIL` renders only the DOU+币 work table |
| negative_assertion_consumed | PASS: legacy tabs are not hidden, DOU+券 table is not rendered, and no cross reward type residue is visible |
| evidence_required_consumed | PASS: before/action/after evidence, Network/mock hit, screenshot, active computed style, source evidence, and negative scan were consumed |
| closure_risk | none for design scope; real backend non-mock load timing remains a separate real verify note |

### Pre-Fix Evidence: TC-UI-COUPON-REMOVE-PAGE

| field | value |
|---|---|
| case_id | TC-UI-COUPON-REMOVE-PAGE |
| figma_source_type | FIGMA_NODE_DATA + FIGMA_SCREENSHOT |
| figma_source | node `1:12390`; node data `figma-cache/nodes/F4-get_figma_data-1_12390-d4.md`; screenshot `figma-cache/screenshots/1_12390-dou-coupon-removal-detail.png` |
| ui_evidence_mode | RUNTIME_BASELINE_ALLOWED |
| f2c_source | N/A; current case verifies existing EcopTable/coupon author renderer runtime baseline |
| consumed_contract | DOU+券剔除明细 first screen: config summary -> SubTab -> filters -> table -> pagination; filter placeholders `作者ID` = `支持批量输入，用逗号间隔`, `操作人` = `请选择`; table headers `作者信息 / 剔除发奖原因 / 剔除发奖时间 / 操作人`; no DOU+币 work columns |
| runtime_source | `screenshots/TC-UI-COUPON-REMOVE-PAGE--remove-detail-coupon-default--mock-hit.png`; runtime JSON `verify-logs/evidence/TC-UI-COUPON-REMOVE-PAGE--mock-hit-runtime.json`; fresh browser DOM/Network from design-checker |
| runtime_materialization_status | local_file for verify screenshot/runtime JSON; fresh browser screenshot was inline-only and not used as path evidence |
| semantic_grid_comparison | PASS_WITH_BLOCKER: page region order, tabs, author table, and pagination are present; filter placeholder text mismatches and extra T+2 prompt appears in SubTab row |
| structure_comparison | BLOCKER: runtime inserts `ugc内容标签存在T+2修正逻辑...` between SubTab and filters; Figma `1:12390` goes directly from SubTab to filters |
| style_comparison | BLOCKER: `作者ID` placeholder is `支持批量查询，用逗号隔开` instead of `支持批量输入，用逗号间隔`; `操作人` placeholder is `请输入姓名搜索` instead of `请选择` |
| negative_scan | PASS: no `作品内容`, `券数量`, `投放状态`, or DOU+币作品 column residue |
| mock_evidence | PASS: `apiGetDouPlusCouponRemoveRecord` hit `R-BAM-COUPON-REMOVE-DEFAULT` |
| result | AUTO_FIX_REQUIRED / DESIGN_AUTO_FIX |

### Visual Contract Consumption: TC-UI-COUPON-REMOVE-PAGE

| field | value |
|---|---|
| case_id | TC-UI-COUPON-REMOVE-PAGE |
| contract_ref | AR-013 DOU+券剔除明细首屏; Region:DOU+券剔除明细/SubTab/筛选区/表格/分页; Figma node `1:12390`, IMG6 |
| positive_assertion_consumed | PASS_WITH_BLOCKER: active `剔除明细`, three tabs, author table, pagination, and `apiGetDouPlusCouponRemoveRecord` request are present; visible filter and SubTab-row details do not match Figma |
| negative_assertion_consumed | PASS: legacy tabs are not hidden; no `作品内容`, `券数量`, `投放状态`, or DOU+币 work-column residue |
| evidence_required_consumed | PASS: Figma node/screenshot, local runtime screenshot, DOM/Network/mock hit, and negative scan were consumed |
| closure_risk | current case cannot be archived before pagination total/page-size blocker is fixed and rerun |

### Auto Fix Rerun Evidence: TC-UI-COUPON-REMOVE-PAGE

| field | value |
|---|---|
| case_id | TC-UI-COUPON-REMOVE-PAGE |
| figma_source_type | FIGMA_NODE_DATA + FIGMA_SCREENSHOT |
| figma_source | node `1:12390`; node data `figma-cache/nodes/F4-get_figma_data-1_12390-d4.md`; screenshot `figma-cache/screenshots/1_12390-dou-coupon-removal-detail.png` |
| ui_evidence_mode | RUNTIME_BASELINE_ALLOWED |
| f2c_source | N/A; current case verifies existing EcopTable/coupon author renderer runtime baseline |
| consumed_contract | 配置摘要 -> SubTab -> filters -> table -> pagination；filters 为 `作者ID` / `操作人`；placeholder 分别为 `支持批量输入，用逗号间隔` / `请选择`；表头为 `作者信息 / 剔除发奖原因 / 剔除发奖时间 / 操作人`；禁显 DOU+币作品列残留 |
| runtime_source | `screenshots/TC-UI-COUPON-REMOVE-PAGE--remove-detail-coupon-default--recheck-after-DESIGN-REWORK-005-v2.png` |
| runtime_materialization_status | local_file; PNG `1733 x 1523` |
| semantic_grid_comparison | PASS_WITH_BLOCKER: 配置摘要、SubTab、filters、table、pagination 区域顺序匹配，SubTab 后直接进入筛选区；pagination 子结构缺少 Figma/Plan 可见总数与 page-size 控件 |
| structure_comparison | BLOCKER: `剔除明细` active 后未插入 T+2 奖励下发提示且表格保留，但分页 DOM 仅显示 `1 2` 与翻页箭头，缺少 `共40条` / `20条/页` |
| style_comparison | PASS_WITH_BLOCKER: `作者ID` placeholder = `支持批量输入，用逗号间隔`；`操作人` placeholder = `请选择`；active tab color `rgb(25,102,255)`；pagination total/page-size visible controls absent |
| negative_scan | PASS: legacy tabs 未隐藏；remove-detail 区域无 `作品内容`、`券数量`、`投放状态`、DOU+币 cover/title/work-card 残留 |
| mock_evidence | PASS: `apiGetDouPlusCouponRemoveRecord` GET 命中 `R-BAM-COUPON-REMOVE-DEFAULT`；console `[BAM_MOCK_HIT]` logId `20260710002150952307488D91F40A9A6D` |
| result | AUTO_FIX_REQUIRED / DESIGN_AUTO_FIX |

### Auto Fix Pagination Rerun Evidence: TC-UI-COUPON-REMOVE-PAGE

| field | value |
|---|---|
| case_id | TC-UI-COUPON-REMOVE-PAGE |
| figma_source_type | FIGMA_NODE_DATA + FIGMA_SCREENSHOT |
| figma_source | node `1:12390`; pagination node `1:12401`; node data `figma-cache/nodes/F4-get_figma_data-1_12390-d4.md`; screenshot `figma-cache/screenshots/1_12390-dou-coupon-removal-detail.png` |
| ui_evidence_mode | RUNTIME_BASELINE_ALLOWED |
| f2c_source | N/A; current case verifies existing EcopTable/coupon author renderer runtime baseline |
| consumed_contract | 配置摘要 -> SubTab -> filters -> table -> pagination；pagination 含 `共40条`、页码、page-size control `20条/页`；禁显 DOU+币作品列残留 |
| runtime_source | `screenshots/TC-UI-COUPON-REMOVE-PAGE--design-rerun--pagination.png` |
| runtime_materialization_status | local_file; PNG `1733 x 1523` |
| semantic_grid_comparison | PASS: 配置摘要、SubTab、filters、table、pagination 区域顺序匹配，分页子结构可见 |
| structure_comparison | PASS: `剔除明细` active 后 SubTab -> filters -> table -> pagination；pagination DOM includes `共40条 1 2 20 条/页` |
| style_text_comparison | PASS: `共40条` exact；page-size raw DOM `20 条/页` normalized to Figma text `20条/页`; active tab color `rgb(25,102,255)` |
| regression_checks | PASS: `作者ID` placeholder `支持批量输入，用逗号间隔`; `操作人` placeholder `请选择`; T+2 prompt absent; headers `作者信息 / 剔除发奖原因 / 剔除发奖时间 / 操作人` |
| negative_scan | PASS: legacy tabs 未隐藏；remove-detail 区域无 `作品内容`、`券数量`、`投放状态`、`DOU+币`、cover/title/work-card 残留 |
| mock_evidence | PASS: `apiGetDouPlusCouponRemoveRecord` GET params include `page=1` / `page_num=20`; console `[BAM_MOCK_HIT]` rule `R-BAM-COUPON-REMOVE-DEFAULT`; response total=40 |
| result | FIXED_PASS |

### Current Evidence: TC-DATA-COUPON-COLUMNS

| field | value |
|---|---|
| case_id | TC-DATA-COUPON-COLUMNS |
| figma_source_type | FIGMA_NODE_DATA + FIGMA_SCREENSHOT |
| figma_source | node `1:12390`; header nodes `1:12561`, `1:12670`; node data `figma-cache/nodes/F4-get_figma_data-1_12390-d4.md`; screenshot `figma-cache/screenshots/1_12390-dou-coupon-removal-detail.png` |
| ui_evidence_mode | RUNTIME_BASELINE_ALLOWED |
| f2c_source | N/A; Task 4 / implementation log / current case mark this table-header region as runtime baseline allowed |
| consumed_contract | DOU+券剔除明细 table header columns: `作者信息 / 剔除发奖原因 / 剔除发奖时间 / 操作人`; source dataIndex order `candidate_ids / remove_reason / remove_time / operator_id`; no DOU+币 work-card columns or wrong extra columns |
| runtime_source | `screenshots/TC-UI-COUPON-REMOVE-PAGE--design-rerun--pagination.png`; runtime JSON `verify-logs/evidence/TC-UI-COUPON-REMOVE-PAGE--mock-hit-runtime.json`; source evidence `verify-logs/evidence/TC-DATA-COUPON-COLUMNS--source-evidence.md` |
| runtime_materialization_status | local_file; PNG `1733 x 1523`; screenshot includes loaded table header |
| semantic_grid_comparison | PASS: filters -> table header -> pagination order visible; table header has 4 DOU+券 columns |
| structure_comparison | PASS: Figma/runtime/source all show `作者信息 / 剔除发奖原因 / 剔除发奖时间 / 操作人` |
| style_comparison | PASS: EcopTable header shape matches current header contract; no style difference affecting this region-level table-header case |
| negative_scan | PASS: no `作品内容`, `券数量`, `投放状态`, `处罚原因`, `item_card`, `item_model`, DOU+币 cover/title residue |
| mock_evidence | PASS: `apiGetDouPlusCouponRemoveRecord` hit `R-BAM-COUPON-REMOVE-DEFAULT`; response recordsLength=1,total=40 |
| result | PASS |

### Visual Contract Consumption: TC-DATA-COUPON-COLUMNS

| field | value |
|---|---|
| case_id | TC-DATA-COUPON-COLUMNS |
| contract_ref | DOU+券剔除明细表格 / list style; Region:DOU+券剔除明细/表格 |
| positive_assertion_consumed | PASS: only DOU+券 author-dimension columns are visible, with order `作者信息 / 剔除发奖原因 / 剔除发奖时间 / 操作人` |
| negative_assertion_consumed | PASS: no `作品内容`, `券数量`, `投放状态`, `处罚原因`, DOU+币 work-card/cover/title residue or wrong extra columns |
| evidence_required_consumed | PASS: Figma node/screenshot, runtime screenshot/JSON, source evidence and source file order consumed |
| closure_risk | none for design scope; real backend empty/sort/pagination remains separate real-verify recheck |

### Current Evidence: TC-UI-CFG-PREFILLED-BASELINE

| field | value |
|---|---|
| case_id | TC-UI-CFG-PREFILLED-BASELINE |
| figma_source_type | FIGMA_NODE_DATA + FIGMA_SCREENSHOT |
| figma_source | node `1:10938`, text `1:11370`; `figma-cache/screenshots/1_10938-config-prefilled-after.png`; d2c archive `code-review/d2c-evidence/task-TASK-002/1_10938/` |
| ui_evidence_mode | F2C_REQUIRED |
| f2c_source | d2c manifest/xml/jpg under `code-review/d2c-evidence/task-TASK-002/1_10938/` |
| consumed_contract | `仅限预埋用户` selected; `预埋用户名单` row before prompt; text node `1:11370` uses `14px/20px`, grey copy, link `rgb(0,136,255)`, no default underline in d2c |
| runtime_source | `screenshots/TC-UI-CFG-PREFILLED-BASELINE--design--config-prefilled-user.png` |
| runtime_materialization_status | local_file; PNG `1733 x 1523` |
| semantic_grid_comparison | PASS: prefilled list row, combobox/empty hint, prompt, and `内容体裁要求` order match |
| structure_comparison | PASS: prompt belongs to prefilled-list form item extra; no icon/img; no standalone card |
| style_comparison | BLOCKER: runtime after DESIGN-REWORK-001 uses all-user prompt style `12px/#1966ff/underline`; active d2c `1:11370` requires `14px/#0088ff/no default underline` |
| negative_scan | PASS: no download list, appeal entry, non-incentive count, all-user-only container, prompt icon, or list-detail overwrite |
| result | AUTO_FIX_REQUIRED / DESIGN_AUTO_FIX |

### Auto Fix Rerun Evidence: TC-UI-CFG-PREFILLED-BASELINE

| field | value |
|---|---|
| case_id | TC-UI-CFG-PREFILLED-BASELINE |
| figma_source_type | FIGMA_NODE_DATA + FIGMA_SCREENSHOT |
| figma_source | node `1:10938`, text `1:11370`; `figma-cache/screenshots/1_10938-config-prefilled-after.png`; d2c archive `code-review/d2c-evidence/task-TASK-002/1_10938/` |
| ui_evidence_mode | F2C_REQUIRED |
| f2c_source | d2c manifest/xml/jpg under `code-review/d2c-evidence/task-TASK-002/1_10938/` |
| consumed_contract | `1:11370`: `14px/20px`, grey `rgb(188,189,192)`, link `rgb(0,136,255)`, no default underline; prompt below `预埋用户名单`; no icon |
| runtime_source | `screenshots/TC-UI-CFG-PREFILLED-BASELINE--design-rerun--config-prefilled-user--prompt-row.png` |
| runtime_materialization_status | local_file; PNG `1733 x 1523` |
| semantic_grid_comparison | PASS: prefilled state, prompt copy, link copy, row placement, and following form order match |
| structure_comparison | PASS: prompt has text span + anchor only; no svg/img/icon; participant selector not overwritten |
| style_comparison | PASS: prompt `14px/20px rgb(188,189,192)`; link `14px/20px rgb(0,136,255)`; default `text-decoration: none`; hover rule underlines |
| negative_scan | PASS: no download list, appeal entry, non-incentive count, all-user-only container, prompt icon/img, or list-detail overwrite |
| non_regression | `TC-UI-CFG-ALL-BASELINE` quick check PASS: default all-user prompt remains no icon, `12px/20px`, link `rgb(25,102,255)` underlined |
| result | FIXED_PASS |

## Design Evidence Debug Log

| field | value |
|---|---|
| case_id | TC-UI-CFG-ALL-BASELINE |
| case_scope | page-level / config prompt row |
| figma_scope | node `1:9770` / configured page state containing prompt row |
| scope_match | exact for current prompt-row closure inside page-level case |
| figma_source_status | found |
| figma_source_type | FIGMA_SCREENSHOT + FIGMA_NODE_DATA |
| figma_source | `figma-cache/screenshots/1_9770-config-all-user-after.png`; d2c `manifest.md/xml/jpg` |
| ui_evidence_mode | F2C_REQUIRED |
| f2c_required | yes |
| f2c_source_status | found |
| f2c_source | `code-review/d2c-evidence/task-TASK-001/1_9770/` |
| f2c_consumed_contract | text-only helper, grey copy, blue underlined link, below `活动参与资格` |
| figma_baseline_local_path | `figma-cache/screenshots/1_9770-config-all-user-after.png` |
| figma_baseline_materialization_status | local_file |
| semantic_grid_done | yes |
| semantic_grid_result | partial: placement/order/copy match; helper child structure mismatch |
| runtime_source_status | reused_verify |
| runtime_source | `screenshots/TC-UI-CFG-ALL-BASELINE--config-all-user--config-prompt-row.png` |
| verify_screenshot_key | cfg-all-user-prompt |
| runtime_materialization_status | local_file |
| figma_scope_coverage_reason | node `1:9770` covers the config page all-user prompt row and surrounding form sequence, not only an isolated text probe |
| figma_retrieval_attempted | no |
| figma_retrieval_action | none |
| figma_retrieval_result | not_needed |
| state_match | yes |
| comparison_done | structure=yes; style=yes; negative_scan=yes |
| decision | AUTO_FIX_REQUIRED |
| reason | executable design mismatch: leading icon has no Figma/d2c source, and prompt/link default style diverges from d2c |

### Auto Fix Rerun Debug Log: TC-UI-CFG-ALL-BASELINE

| field | value |
|---|---|
| rerun_case | TC-UI-CFG-ALL-BASELINE |
| runtime_url | edit page for activity `7649322835323650313` with `cjDebugSubApp=localhost:8083` and `externalLeadsDomainMock=1` |
| hmr_evidence | dev server 8083 listening; browser resources loaded from localhost; page rendered without SSO prompt |
| closure_screenshot_status | local_file |
| closure_screenshot | `screenshots/TC-UI-CFG-ALL-BASELINE--design-rerun--config-all-user.png` |
| console_checked | yes; no blank-screen/runtime crash |
| comparison_done | structure=yes; style=yes; negative_scan=yes |
| decision | FIXED_PASS |
| reason | DESIGN-REWORK-001 removed the no-source icon and aligned prompt/link style; closure screenshot and DOM/computed style pass |

### Design Evidence Debug Log: TC-UI-CFG-PREFILLED-BASELINE

| field | value |
|---|---|
| case_id | TC-UI-CFG-PREFILLED-BASELINE |
| case_scope | page-level / prefilled config prompt row |
| figma_scope | node `1:10938` / configured prefilled page state containing prompt row |
| scope_match | exact for current prompt-row closure inside page-level case |
| figma_source_status | found |
| figma_source_type | FIGMA_NODE_DATA + FIGMA_SCREENSHOT |
| figma_source | `figma-cache/screenshots/1_10938-config-prefilled-after.png`; d2c `manifest.md/xml/jpg` |
| ui_evidence_mode | F2C_REQUIRED |
| f2c_required | yes |
| f2c_source_status | found |
| f2c_source | `code-review/d2c-evidence/task-TASK-002/1_10938/` |
| f2c_consumed_contract | `预埋用户名单` row; prompt copy/link; `14px/20px`; link `rgb(0,136,255)` |
| runtime_source_status | new_capture |
| runtime_source | `screenshots/TC-UI-CFG-PREFILLED-BASELINE--design--config-prefilled-user.png` |
| runtime_materialization_status | local_file |
| verify_screenshot_key | cfg-prefilled-prompt; old verify screenshot used only as historical baseline because shared prompt code changed after verify |
| state_match | yes |
| comparison_done | structure=yes; style=yes; negative_scan=yes |
| decision | AUTO_FIX_REQUIRED |
| reason | executable style mismatch in prefilled prompt variant; no mock/API issue |

### Auto Fix Rerun Debug Log: TC-UI-CFG-PREFILLED-BASELINE

| field | value |
|---|---|
| rerun_case | TC-UI-CFG-PREFILLED-BASELINE |
| runtime_url | edit page for activity `7649322835323650313` with localhost `8083` subapp |
| hmr_evidence | console `[HMR] connected`; network hot-update requests from `http://localhost:8083` |
| closure_screenshot_status | local_file |
| closure_screenshot | `screenshots/TC-UI-CFG-PREFILLED-BASELINE--design-rerun--config-prefilled-user--prompt-row.png` |
| console_checked | yes; no blank-screen/runtime crash |
| comparison_done | structure=yes; style=yes; negative_scan=yes |
| decision | FIXED_PASS |
| reason | DESIGN-REWORK-002 added a prefilled-only prompt variant matching d2c `1:11370`; all-user quick non-regression passed |

### Design Evidence Debug Log: TC-UI-COIN-REMOVE-PAGE

| field | value |
|---|---|
| case_id | TC-UI-COIN-REMOVE-PAGE |
| case_scope | page-level / DOU+币剔除明细首屏 |
| figma_scope | node `1:12120` / DOU+币剔除明细 page region covering config summary, SubTab, filters, table, and pagination |
| scope_match | exact |
| figma_source_status | found |
| figma_source_type | FIGMA_SCREENSHOT + FIGMA_NODE_DATA |
| figma_source | `figma-cache/screenshots/1_12120-dou-coin-removal-detail.png`; `figma-cache/nodes/F3-get_figma_data-1_12120-d4.md` |
| ui_evidence_mode | RUNTIME_BASELINE_ALLOWED |
| f2c_required | no |
| f2c_source_status | not_applicable |
| f2c_source | N/A; existing UI local placeholder/style rework does not require d2c gate |
| f2c_consumed_contract | N/A; Figma screenshot/node data consumed directly |
| figma_baseline_local_path | `figma-cache/screenshots/1_12120-dou-coin-removal-detail.png` |
| figma_baseline_materialization_status | local_file |
| semantic_grid_done | yes |
| semantic_grid_result | partial before rework: page order/tabs/table/pagination matched; filter placeholder text mismatched |
| runtime_source_status | reused_verify |
| runtime_source | `screenshots/TC-UI-COIN-REMOVE-PAGE--remove-detail-coin-default--mock-hit.png` |
| verify_screenshot_key | coin-remove-page |
| runtime_materialization_status | local_file |
| figma_scope_coverage_reason | node `1:12120` covers the same DOU+币剔除明细 page-level state, not an isolated control probe |
| figma_retrieval_attempted | no |
| figma_retrieval_action | none |
| figma_retrieval_result | not_needed |
| state_match | yes |
| comparison_done | structure=yes; style=yes; negative_scan=yes |
| decision | AUTO_FIX_REQUIRED |
| reason | executable design mismatch: Figma placeholder copy for `作品ID` and `操作人` differed from runtime; no mock issue |

### Auto Fix Rerun Debug Log: TC-UI-COIN-REMOVE-PAGE

| field | value |
|---|---|
| rerun_case | TC-UI-COIN-REMOVE-PAGE |
| runtime_url | DOU+币奖励投放 page with `cjDebugSubApp=localhost:8083` and `externalLeadsDomainMock=1` |
| hmr_evidence | browser rerun used existing localhost `8083` subapp; console retained `[BAM_MOCK_HIT]` for `apiGetDouPlusCoinRemoveRecord` / `R-BAM-COIN-REMOVE-DEFAULT` |
| closure_screenshot_status | local_file |
| closure_screenshot | `screenshots/TC-UI-COIN-REMOVE-PAGE--design-rerun--remove-detail-coin-default--dom-capture.png` |
| closure_screenshot_file_check | PNG `1498 x 1317`, readable under workspace `screenshots/` |
| console_checked | yes; no blank-screen/runtime crash reported by design-checker |
| comparison_done | structure=yes; style=yes; negative_scan=yes |
| decision | FIXED_PASS |
| reason | DESIGN-REWORK-003 changed only the two Figma-mismatched placeholders; page structure, table, pagination, mock hit, and negative scan remained aligned |

### Design Evidence Debug Log: TC-DATA-COIN-COLUMNS

| field | value |
|---|---|
| case_id | TC-DATA-COIN-COLUMNS |
| case_scope | region-level / DOU+币剔除明细 table header |
| figma_scope | node `1:12120` table/header region |
| scope_match | exact |
| figma_source_status | found |
| figma_source_type | FIGMA_SCREENSHOT + FIGMA_NODE_DATA |
| figma_source | `figma-cache/screenshots/1_12120-dou-coin-removal-detail.png`; crop `figma-cache/crops/TC-DATA-COIN-COLUMNS--figma-table-header-wide-crop.png`; node data `figma-cache/nodes/F3-get_figma_data-1_12120-d4.md` |
| ui_evidence_mode | RUNTIME_BASELINE_ALLOWED |
| f2c_required | no |
| f2c_source_status | not_applicable |
| f2c_source | N/A |
| f2c_consumed_contract | N/A; consumed Figma screenshot/node data directly |
| figma_baseline_local_path | `figma-cache/crops/TC-DATA-COIN-COLUMNS--figma-table-header-wide-crop.png` |
| figma_baseline_materialization_status | cropped_from_atlas/local_file |
| semantic_grid_done | yes |
| semantic_grid_result | mismatch |
| runtime_source_status | reused_verify + closure screenshot consumed |
| runtime_source | `screenshots/TC-UI-COIN-REMOVE-PAGE--design-rerun--remove-detail-coin-default--dom-capture.png` |
| verify_screenshot_key | coin-remove-columns |
| runtime_materialization_status | local_file |
| figma_scope_coverage_reason | crop covers the full DOU+币 table header row for current region-level case |
| figma_retrieval_attempted | yes |
| figma_retrieval_action | screenshot_export/crop |
| figma_retrieval_result | success |
| state_match | yes |
| comparison_done | structure=yes; style=blocked_by_structure; negative_scan=yes |
| decision | AUTO_FIX_REQUIRED |
| reason | executable frontend visible mismatch: DOU+币 table has the correct column whitelist but swaps Figma order of `剔除发奖时间` and `剔除发奖原因` |

### Auto Fix Rerun Debug Log: TC-DATA-COIN-COLUMNS

| field | value |
|---|---|
| rerun_case | TC-DATA-COIN-COLUMNS |
| runtime_url | DOU+币奖励投放 / 剔除明细 loaded state with localhost `8083` subapp |
| hmr_evidence | console `[HMR] connected`; page reloaded with `_design_rerun=TC-DATA-COIN-COLUMNS-20260709` |
| closure_screenshot_status | local_file |
| closure_screenshot | `screenshots/TC-DATA-COIN-COLUMNS--design-rerun--coin-table-header.png` |
| closure_screenshot_file_check | PNG `1733 x 1523`, readable under workspace `screenshots/` |
| console_checked | yes; no table render crash; unrelated monitoring abort / React warning / findDOMNode warning only |
| comparison_done | structure=yes; style=yes for table-header scope; negative_scan=yes |
| decision | FIXED_PASS |
| reason | DESIGN-REWORK-004 moved `remove_time` before `remove_reason`; runtime DOM/source/header screenshot match Figma order and forbidden columns remain absent |

### Design Evidence Debug Log: TC-CELL-COIN-FIRST-ROW

| field | value |
|---|---|
| case_id | TC-CELL-COIN-FIRST-ROW |
| case_scope | cell-level / table-header-first-row |
| figma_scope | Figma node data for table first-row cells with broad screenshot supplemental |
| scope_match | exact |
| figma_source_status | found |
| figma_source_type | FIGMA_NODE_DATA + FIGMA_SCREENSHOT |
| figma_source | `figma-cache/nodes/F3-get_figma_data-1_12120-d4.md`; `figma-cache/screenshots/1_12120-dou-coin-removal-detail.png` |
| ui_evidence_mode | RUNTIME_BASELINE_ALLOWED |
| f2c_required | no |
| f2c_source_status | not_applicable |
| f2c_source | N/A |
| f2c_consumed_contract | N/A; consumed Figma node data and screenshot directly |
| figma_baseline_local_path | `figma-cache/screenshots/1_12120-dou-coin-removal-detail.png` |
| figma_baseline_materialization_status | local_file |
| semantic_grid_done | yes |
| semantic_grid_result | partial: Task 13 placeholder/T+2 blockers are closed, but pagination total/page-size controls are missing |
| runtime_source_status | reused latest closure screenshot + current browser DOM/computed style |
| runtime_source | `screenshots/TC-DATA-COIN-COLUMNS--design-rerun--coin-table-header.png` |
| verify_screenshot_key | coin-remove-first-row |
| runtime_materialization_status | local_file |
| figma_scope_coverage_reason | nodes `1:12278`, `1:12291`, `1:12281` and screenshot cover the first-row cell structures required by this cell-level case |
| figma_retrieval_attempted | no |
| figma_retrieval_action | none |
| figma_retrieval_result | not_needed |
| state_match | yes |
| computed_style_coverage | headers/cells/cover/title/id/operator avatar covered |
| comparison_done | structure=yes; style=yes; negative_scan=yes |
| decision | PASS |
| reason | first-row field/render structures and forbidden-residue scan satisfy the current cell-level design contract |

### Design Evidence Debug Log: TC-INT-REMOVE-TAB-SWITCH-COIN

| field | value |
|---|---|
| case_id | TC-INT-REMOVE-TAB-SWITCH-COIN |
| case_scope | interaction-level / SubTab + table |
| figma_scope | active tab `1:12273` with DOU+币 remove-detail region |
| scope_match | exact |
| figma_source_status | found |
| figma_source_type | FIGMA_NODE_DATA + FIGMA_SCREENSHOT |
| figma_source | `figma-cache/nodes/F3-get_figma_data-1_12120-d4.md`; `figma-cache/screenshots/1_12120-dou-coin-removal-detail.png` |
| ui_evidence_mode | RUNTIME_BASELINE_ALLOWED |
| f2c_required | no |
| f2c_source_status | not_applicable |
| f2c_source | N/A |
| f2c_consumed_contract | N/A; consumed Figma node data and screenshot directly |
| figma_baseline_local_path | `figma-cache/screenshots/1_12120-dou-coin-removal-detail.png` |
| figma_baseline_materialization_status | local_file |
| semantic_grid_done | yes |
| semantic_grid_result | match |
| runtime_source_status | reused latest closure screenshot + current browser bounded click |
| runtime_source | `screenshots/TC-DATA-COIN-COLUMNS--design-rerun--coin-table-header.png` |
| verify_screenshot_key | coin-remove-tab-switch |
| runtime_materialization_status | local_file |
| figma_scope_coverage_reason | active tab node and screenshot cover current interaction-level visible tab state and target table region |
| figma_retrieval_attempted | no |
| figma_retrieval_action | none |
| figma_retrieval_result | not_needed |
| state_match | yes |
| before_action_after | verify persisted natural click; design-checker bounded click `剔除明细 -> 投放明细 -> 剔除明细` |
| active_tab_computed_style | class includes `auxo-radio-button-wrapper-checked`; color `rgb(25,102,255)`; rect `90x32` |
| comparison_done | structure=yes; style=yes; negative_scan=yes |
| decision | PASS |
| reason | DOU+币 remove-detail tab active style, branch rendering, request, legacy tab return, and cross-type negative scan satisfy current interaction contract |

### Design Evidence Debug Log: TC-UI-COUPON-REMOVE-PAGE

| field | value |
|---|---|
| case_id | TC-UI-COUPON-REMOVE-PAGE |
| case_scope | page-level / DOU+券剔除明细首屏 |
| figma_scope | node `1:12390` DOU+券 remove-detail page-first-screen |
| scope_match | exact |
| figma_source_status | found |
| figma_source_type | FIGMA_NODE_DATA + FIGMA_SCREENSHOT |
| figma_source | `figma-cache/nodes/F4-get_figma_data-1_12390-d4.md`; `figma-cache/screenshots/1_12390-dou-coupon-removal-detail.png` |
| ui_evidence_mode | RUNTIME_BASELINE_ALLOWED |
| f2c_required | no |
| f2c_source_status | not_applicable |
| f2c_source | N/A |
| f2c_consumed_contract | N/A; consumed Figma node data and screenshot directly |
| figma_baseline_local_path | `figma-cache/screenshots/1_12390-dou-coupon-removal-detail.png` |
| figma_baseline_materialization_status | local_file |
| semantic_grid_done | yes |
| semantic_grid_result | partial: main page regions exist, but filter placeholders and extra T+2 prompt mismatch |
| runtime_source_status | reused_verify + fresh browser DOM/Network |
| runtime_source | `screenshots/TC-UI-COUPON-REMOVE-PAGE--remove-detail-coupon-default--mock-hit.png` |
| verify_screenshot_key | coupon-remove-page |
| runtime_materialization_status | local_file |
| figma_scope_coverage_reason | node `1:12390` covers the DOU+券 page-level first screen, not an isolated probe |
| figma_retrieval_attempted | no |
| figma_retrieval_action | none |
| figma_retrieval_result | not_needed |
| state_match | yes |
| comparison_done | structure=yes; style=yes; negative_scan=yes |
| decision | AUTO_FIX_REQUIRED |
| reason | executable frontend visible mismatch: two filter placeholders differ from Figma and remove-detail SubTab row displays a no-source T+2 prompt |

### Auto Fix Rerun Debug Log: TC-UI-COUPON-REMOVE-PAGE

| field | value |
|---|---|
| case_id | TC-UI-COUPON-REMOVE-PAGE |
| case_scope | page-level / DOU+券剔除明细首屏 |
| figma_scope | node `1:12390` DOU+券 remove-detail page baseline |
| scope_match | exact |
| figma_source_status | found |
| figma_source_type | FIGMA_NODE_DATA + FIGMA_SCREENSHOT |
| figma_source | `figma-cache/nodes/F4-get_figma_data-1_12390-d4.md`; `figma-cache/screenshots/1_12390-dou-coupon-removal-detail.png` |
| ui_evidence_mode | RUNTIME_BASELINE_ALLOWED |
| f2c_required | no |
| f2c_source_status | not_applicable |
| f2c_source | N/A |
| f2c_consumed_contract | N/A; consumed Figma node data and screenshot directly |
| figma_baseline_local_path | `figma-cache/screenshots/1_12390-dou-coupon-removal-detail.png` |
| figma_baseline_materialization_status | local_file |
| semantic_grid_done | yes |
| semantic_grid_result | match |
| runtime_source_status | new_capture |
| runtime_source | `screenshots/TC-UI-COUPON-REMOVE-PAGE--remove-detail-coupon-default--recheck-after-DESIGN-REWORK-005-v2.png` |
| verify_screenshot_key | coupon-remove-page |
| runtime_materialization_status | local_file |
| figma_scope_coverage_reason | node `1:12390` covers the DOU+券 page-level first screen, not an isolated probe |
| figma_retrieval_attempted | no |
| figma_retrieval_action | none |
| figma_retrieval_result | not_needed |
| state_match | yes: `remove-detail-coupon-default`, 配置二 / DOU+券 / 剔除明细 |
| comparison_done | structure=yes; style=yes; negative_scan=yes |
| console_checked | yes; no uncaught/chunk/hydration/runtime crash |
| decision | AUTO_FIX_REQUIRED |
| reason | placeholder copy and T+2 prompt blockers are closed; pagination DOM only shows page numbers and arrows, while Figma/Plan require `共40条` and `20条/页` controls |

### Auto Fix Pagination Rerun Debug Log: TC-UI-COUPON-REMOVE-PAGE

| field | value |
|---|---|
| case_id | TC-UI-COUPON-REMOVE-PAGE |
| case_scope | page-level / DOU+券剔除明细首屏 |
| figma_scope | node `1:12390` DOU+券 remove-detail page baseline; pagination node `1:12401` |
| scope_match | exact |
| figma_source_status | found |
| figma_source_type | FIGMA_NODE_DATA + FIGMA_SCREENSHOT |
| figma_source | `figma-cache/nodes/F4-get_figma_data-1_12390-d4.md`; `figma-cache/screenshots/1_12390-dou-coupon-removal-detail.png` |
| ui_evidence_mode | RUNTIME_BASELINE_ALLOWED |
| f2c_required | no |
| f2c_source_status | not_applicable |
| f2c_source | N/A |
| f2c_consumed_contract | N/A; consumed Figma node data and screenshot directly |
| figma_baseline_local_path | `figma-cache/screenshots/1_12390-dou-coupon-removal-detail.png` |
| figma_baseline_materialization_status | local_file |
| semantic_grid_done | yes |
| semantic_grid_result | match |
| runtime_source_status | new_capture |
| runtime_source | `screenshots/TC-UI-COUPON-REMOVE-PAGE--design-rerun--pagination.png` |
| verify_screenshot_key | coupon-remove-page |
| runtime_materialization_status | local_file |
| figma_scope_coverage_reason | node `1:12390` covers the DOU+券 page-level first screen, including pagination `1:12401` |
| figma_retrieval_attempted | no |
| figma_retrieval_action | none |
| figma_retrieval_result | not_needed |
| state_match | yes: `remove-detail-coupon-default`, 配置二 / DOU+券 / 剔除明细 |
| comparison_done | structure=yes; pagination=yes; style_text=yes; negative_scan=yes |
| console_checked | yes; no uncaught/chunk/hydration/runtime crash |
| decision | PASS / FIXED_PASS_ARCHIVE_CURRENT_CASE |
| reason | pagination blocker closed; placeholders/T+2/table/network/negative scan regressions remain PASS |

### Design Evidence Debug Log: TC-DATA-COUPON-COLUMNS

| field | value |
|---|---|
| case_id | TC-DATA-COUPON-COLUMNS |
| case_scope | region-level / DOU+券剔除明细表格表头 |
| figma_scope | node `1:12390` + header nodes `1:12561` / `1:12670` |
| scope_match | exact |
| figma_source_status | found |
| figma_source_type | FIGMA_NODE_DATA + FIGMA_SCREENSHOT |
| figma_source | `figma-cache/nodes/F4-get_figma_data-1_12390-d4.md`; `figma-cache/screenshots/1_12390-dou-coupon-removal-detail.png` |
| ui_evidence_mode | RUNTIME_BASELINE_ALLOWED |
| f2c_required | no |
| f2c_source_status | not_applicable |
| f2c_source | N/A |
| f2c_consumed_contract | N/A; consumed Figma node data and screenshot directly |
| figma_baseline_local_path | `figma-cache/screenshots/1_12390-dou-coupon-removal-detail.png` |
| figma_baseline_materialization_status | local_file |
| semantic_grid_done | yes |
| semantic_grid_result | match |
| runtime_source_status | reused_existing_design_rerun |
| runtime_source | `screenshots/TC-UI-COUPON-REMOVE-PAGE--design-rerun--pagination.png` |
| verify_screenshot_key | coupon-remove-columns |
| runtime_materialization_status | local_file |
| figma_scope_coverage_reason | node `1:12390` and loaded screenshot cover DOU+券 table header region |
| figma_retrieval_attempted | no |
| figma_retrieval_action | none |
| figma_retrieval_result | not_needed |
| state_match | yes: `coupon-table-loaded` |
| comparison_done | structure=yes; style=yes; negative_scan=yes |
| decision | PASS |
| reason | table header order, source order, first-column author renderer source, and negative scan all match current DOU+券 region contract |

### Current Evidence: TC-CELL-COUPON-FIRST-ROW

| field | value |
|---|---|
| case_id | TC-CELL-COUPON-FIRST-ROW |
| case_layer | cell-level |
| contract_ref | Cell:DOU+券剔除明细/作者信息/原因/时间/操作人 |
| figma_source_type | FIGMA_NODE_DATA + FIGMA_SCREENSHOT |
| figma_source | `figma-cache/nodes/F4-get_figma_data-1_12390-d4.md`; `figma-cache/screenshots/1_12390-dou-coupon-removal-detail.png`; consumed nodes `1:12561`, `1:12670`, `1:12574`, `1:12564`, `1:12671` |
| ui_evidence_mode | RUNTIME_BASELINE_ALLOWED |
| f2c_source | N/A; this is an existing table cell-level renderer check, and Figma node data/screenshot plus runtime baseline cover the active scope |
| runtime_source | `screenshots/TC-UI-COUPON-REMOVE-PAGE--design-rerun--pagination.png`; verify screenshot `screenshots/TC-UI-COUPON-REMOVE-PAGE--remove-detail-coupon-default--mock-hit.png`; runtime JSON `verify-logs/evidence/TC-UI-COUPON-REMOVE-PAGE--mock-hit-runtime.json`; computed style `verify-logs/evidence/TC-CELL-COUPON-FIRST-ROW--runtime-computed-style.json`; source evidence `verify-logs/evidence/TC-CELL-COUPON-FIRST-ROW--source-evidence.md` |
| positive_assertion | PASS: first row shows `券作者示例 ID: 900001`, `命中【不激励】规则`, `2026/07/08 20:40:40`, `陈相`; source maps `author_info/remove_reason/remove_time/operator_id` |
| negative_assertion | PASS: `work_content=false`, `delivery_status=false`, `coupon_count=false`, `raw_operator_id_in_row=false`, `work_title_structure=false`; no DOU+币 work cover/title structure |
| evidence_required | PASS: DOM/runtime JSON, local screenshots, computed style and source renderer evidence all materialized |
| result | PASS_ARCHIVED |

### Visual Contract Consumption: TC-CELL-COUPON-FIRST-ROW

| field | value |
|---|---|
| case_id | TC-CELL-COUPON-FIRST-ROW |
| consumed_contract | Figma/runtime cell contract: DOU+券剔除明细 first row must expose author compound cell, remove reason, remove time and operator; author cell uses avatar + nickname + ID; forbidden cells/legacy structures are absent |
| structure_comparison | PASS: Figma DOU+券 table/cell nodes and runtime first row both align to `作者信息 / 剔除发奖原因 / 剔除发奖时间 / 操作人`; runtime first row text is `券作者示例 ID: 900001 / 命中【不激励】规则 / 2026/07/08 20:40:40 / 陈相` |
| style_comparison | PASS: computed style records author image `40x40`; four cells visible as `table-cell`; text size `12px`; color `rgb(37, 41, 49)` |
| negative_scan | PASS: no work content, delivery status, coupon count, raw operator id, or work cover/title structure |
| pending_recheck_closure | `/delivery:design` recheck `TC-CELL-COUPON-FIRST-ROW__recheck__design_alignment` closed; real backend order recheck remains OPEN |
| gate | PASS; archive current case and continue to `TC-INT-REMOVE-TAB-SWITCH-COUPON` only |

### Design Evidence Debug Log: TC-CELL-COUPON-FIRST-ROW

| field | value |
|---|---|
| case_id | TC-CELL-COUPON-FIRST-ROW |
| case_scope | cell-level / DOU+券剔除明细首行作者信息、原因、时间、操作人 |
| figma_scope | node `1:12390` page baseline plus cell/header nodes `1:12561`, `1:12670`, `1:12574`, `1:12564`, `1:12671` |
| scope_match | exact |
| figma_source_status | found |
| figma_source_type | FIGMA_NODE_DATA + FIGMA_SCREENSHOT |
| figma_source | `figma-cache/nodes/F4-get_figma_data-1_12390-d4.md`; `figma-cache/screenshots/1_12390-dou-coupon-removal-detail.png` |
| ui_evidence_mode | RUNTIME_BASELINE_ALLOWED |
| f2c_required | no |
| f2c_source_status | not_applicable |
| f2c_source | N/A |
| f2c_consumed_contract | N/A; consumed Figma node data and screenshot directly |
| figma_baseline_local_path | `figma-cache/screenshots/1_12390-dou-coupon-removal-detail.png` |
| figma_baseline_materialization_status | local_file |
| semantic_grid_done | not_applicable |
| semantic_grid_result | not_applicable: table grid/header order was closed by `TC-DATA-COUPON-COLUMNS`; this case checks first-row cell renderers |
| runtime_source_status | reused_existing_design_rerun |
| runtime_source | `screenshots/TC-UI-COUPON-REMOVE-PAGE--design-rerun--pagination.png`; `verify-logs/evidence/TC-CELL-COUPON-FIRST-ROW--runtime-computed-style.json` |
| verify_screenshot_key | coupon-remove-first-row |
| runtime_materialization_status | local_file |
| figma_scope_coverage_reason | node `1:12390` and cell/header nodes cover the DOU+券 first-row cell renderer scope; current runtime screenshot is the same loaded coupon table state after coupon-page fixes |
| figma_retrieval_attempted | no |
| figma_retrieval_action | none |
| figma_retrieval_result | not_needed |
| state_match | yes: `coupon-table-loaded` |
| comparison_done | structure=yes; style=yes; negative_scan=yes |
| decision | PASS |
| reason | first-row author/reason/time/operator cells match Figma-backed cell contract and runtime/source evidence; negative scan has no legacy DOU+币 or extra cell residue |

### Current Evidence: TC-INT-REMOVE-TAB-SWITCH-COUPON

| field | value |
|---|---|
| case_id | TC-INT-REMOVE-TAB-SWITCH-COUPON |
| case_layer | interaction-level |
| contract_ref | Interaction:奖励投放/SubTab/剔除明细 |
| figma_source_type | FIGMA_NODE_DATA + FIGMA_SCREENSHOT |
| figma_source | `figma-cache/nodes/F4-get_figma_data-1_12390-d4.md`; active tab node `1:12560`; `figma-cache/screenshots/1_12390-dou-coupon-removal-detail.png` |
| ui_evidence_mode | RUNTIME_BASELINE_ALLOWED |
| f2c_source | N/A; this interaction-level reuse check is covered by Figma node/screenshot and before/action/after runtime evidence |
| runtime_source | fresh closure `screenshots/TC-INT-REMOVE-TAB-SWITCH-COUPON--coupon-tab-switch--design-recheck-stable.png`; persisted baseline `screenshots/TC-INT-REMOVE-TAB-SWITCH-COUPON--coupon-tab-switch--mock-hit.png`; `verify-logs/evidence/TC-INT-REMOVE-TAB-SWITCH-COUPON--runtime.json`; `verify-logs/evidence/TC-INT-REMOVE-TAB-SWITCH-COUPON--source-evidence.md` |
| positive_assertion | PASS: before state `奖励下发`; natural click `剔除明细`; after state active tab `剔除明细`; DOU+券作者表 rendered and GET `apiGetDouPlusCouponRemoveRecord` hits `R-BAM-COUPON-REMOVE-DEFAULT` |
| negative_assertion | PASS: legacy tabs remain visible and `投放明细` can return; DOU+币 table/work content/delivery status/coupon quantity are absent |
| evidence_required | PASS: before/action/after runtime JSON, Network/BAM hit, local screenshot and source evidence are materialized |
| result | PASS_ARCHIVED |

### Visual Contract Consumption: TC-INT-REMOVE-TAB-SWITCH-COUPON

| field | value |
|---|---|
| case_id | TC-INT-REMOVE-TAB-SWITCH-COUPON |
| consumed_contract | Figma active tab `1:12560` and interaction contract require `剔除明细` Radio Tab active state, DOU+券 remove-detail table render, and legacy tabs preserved |
| structure_comparison | PASS: Figma shows `奖励下发 / 投放明细 / 剔除明细` tabs with `剔除明细` active and DOU+券 remove-detail table; runtime after click shows the same active tab, filter area, author table and pagination |
| style_comparison | PASS: active runtime class `auxo-radio-button-wrapper auxo-radio-button-wrapper-checked`; active color `rgb(25, 102, 255)`; rect `498,516,90,32`; aligns with existing Tab/Radio token expected by the Figma node |
| negative_scan | PASS: `legacy_tabs_visible=true`, `coin_work_headers_visible=false`, `coin_work_sample_visible=false`, `coupon_quantity_visible=false`, `delivery_status_visible=false`, `work_content_visible=false` |
| pending_recheck_closure | `/delivery:design` recheck `TC-INT-REMOVE-TAB-SWITCH-COUPON__recheck__design_alignment` closed; real backend timing recheck remains OPEN |
| gate | PASS; archive current case and continue to `TC-UI-MANUAL-HIT-PAGE` only |

### Design Evidence Debug Log: TC-INT-REMOVE-TAB-SWITCH-COUPON

| field | value |
|---|---|
| case_id | TC-INT-REMOVE-TAB-SWITCH-COUPON |
| case_scope | interaction-level / DOU+券奖励投放 SubTab click to 剔除明细 |
| figma_scope | node `1:12390` page baseline plus active tab node `1:12560` |
| scope_match | exact |
| figma_source_status | found |
| figma_source_type | FIGMA_NODE_DATA + FIGMA_SCREENSHOT |
| figma_source | `figma-cache/nodes/F4-get_figma_data-1_12390-d4.md`; `figma-cache/screenshots/1_12390-dou-coupon-removal-detail.png` |
| ui_evidence_mode | RUNTIME_BASELINE_ALLOWED |
| f2c_required | no |
| f2c_source_status | not_applicable |
| f2c_source | N/A |
| f2c_consumed_contract | N/A; consumed Figma node data and screenshot directly |
| figma_baseline_local_path | `figma-cache/screenshots/1_12390-dou-coupon-removal-detail.png` |
| figma_baseline_materialization_status | local_file |
| semantic_grid_done | not_applicable |
| semantic_grid_result | not_applicable: interaction case checks before/action/after SubTab state and resulting table render |
| runtime_source_status | reused_verify |
| runtime_source | fresh closure `screenshots/TC-INT-REMOVE-TAB-SWITCH-COUPON--coupon-tab-switch--design-recheck-stable.png`; persisted baseline `screenshots/TC-INT-REMOVE-TAB-SWITCH-COUPON--coupon-tab-switch--mock-hit.png`; `verify-logs/evidence/TC-INT-REMOVE-TAB-SWITCH-COUPON--runtime.json` |
| verify_screenshot_key | coupon-remove-tab-switch |
| runtime_materialization_status | local_file |
| figma_scope_coverage_reason | active tab node `1:12560` and page screenshot cover the interaction target and after-state table region |
| figma_retrieval_attempted | no |
| figma_retrieval_action | none |
| figma_retrieval_result | not_needed |
| state_match | yes: `coupon-tab-switch` before/action/after |
| comparison_done | structure=yes; style=yes; negative_scan=yes |
| decision | PASS |
| reason | active tab, DOU+券 table render, Network/BAM hit, legacy tab return and cross reward-type negative scan all match the current interaction contract |

### Current Evidence: TC-UI-MANUAL-HIT-PAGE

| field | value |
|---|---|
| case_id | TC-UI-MANUAL-HIT-PAGE |
| case_layer | page-level |
| contract_ref | Region:人工提报命中态/Drawer/Summary/action/表格行态 |
| figma_source_type | FIGMA_SCREENSHOT + FIGMA_NODE_DATA + d2c |
| figma_source | `figma-cache/screenshots/25_13842-manual-submit-hit-state.png`; `figma-cache/nodes/F5-get_figma_data-25_13842-d5.md`; `figma-cache/nodes/F7-get_figma_data-87_7016-d6.md`; d2c manifest `code-review/d2c-evidence/task-TASK-005/manifest.md` |
| ui_evidence_mode | F2C_REQUIRED |
| f2c_source | d2c XML/JPG under `code-review/d2c-evidence/task-TASK-005/25_13842/`, `87_6973/`, `87_7016/` |
| runtime_source | closure `screenshots/TC-UI-MANUAL-HIT-PAGE--design-rerun--manual-drawer-hit-rework-007.png`; closure evidence `verify-logs/evidence/TC-UI-MANUAL-HIT-PAGE--design-rerun-rework-007-runtime.json`; baseline `screenshots/TC-UI-MANUAL-HIT-PAGE--manual-drawer-hit--mock-hit.png` |
| positive_assertion | PASS: Drawer title, manual input, summary, `一键移除`, `导出剔除明细`, hit labels, three retained rows, row remove, and footer `取消 -> 提交并投放` are visible |
| negative_assertion | PASS: no auto removal; hit rows remain; no `申诉` / `低质` / `编辑` / auto-removal prompt residue |
| evidence_required | PASS: d2c XML/JPG, Figma screenshot/node data, baseline runtime JSON, fresh closure DOM JSON, fresh closure screenshot, and rerun `[BAM_MOCK_HIT]` evidence exist |
| result | FIXED_PASS_ARCHIVED |

### Visual Contract Consumption: TC-UI-MANUAL-HIT-PAGE

| field | value |
|---|---|
| case_id | TC-UI-MANUAL-HIT-PAGE |
| consumed_contract | d2c `87:6973` and `87:7016`: Drawer title `提报视频`; radio `手动输入/批量上传`; summary template; action order `一键移除 -> 导出剔除明细`; table columns `序号 / 视频图文内容 / 投放金额 / 投放时长 / 转化目标偏好 / 投放生效时间 / 目标受众 / 提报理由 / 操作`; row red labels; footer `取消 -> 提交并投放` |
| semantic_grid_comparison | PASS: runtime visible table columns are `序号 / 视频/图文内容 / 投放金额（元） / 投放时长 / 转化目标偏好 / 投放生效时间 / 目标受众 / 提报理由 / 操作`; no standalone `性别` / `年龄`; order matches consumed d2c contract |
| structure_comparison | PASS: runtime footer left-to-right order is `取消 -> 提交并投放`; action toolbar remains `一键移除 -> 导出剔除明细`; Drawer summary/table/footer structure matches d2c `87:6973` |
| style_comparison | PASS: red hit labels use `rgb(245, 63, 63)` at `12px/18px`; footer primary button uses Auxo primary blue `rgb(25, 102, 255)` and secondary cancel is white |
| negative_scan | PASS: rows remain visible; no appeal/auto-removal/low-fidelity background residue; no standalone `性别` / `年龄` columns |
| mock_issues | N/A: `R-BAM-MANUAL-SEARCH-HIT` provides the required mixed rows and is not the root cause |
| gate | FIXED_PASS; archive current case and continue to `TC-CELL-MANUAL-HIT-STATUS` only |

### Design Evidence Debug Log: TC-UI-MANUAL-HIT-PAGE

| field | value |
|---|---|
| case_id | TC-UI-MANUAL-HIT-PAGE |
| case_scope | page-level / 人工提报命中态 Drawer first screen |
| figma_scope | nodes `25:13842`, `87:6973`, `87:7016`; d2c `TASK-005`; screenshot IMG7 |
| scope_match | exact |
| figma_source_status | found |
| figma_source_type | FIGMA_SCREENSHOT + FIGMA_NODE_DATA + d2c |
| figma_source | `figma-cache/screenshots/25_13842-manual-submit-hit-state.png`; `figma-cache/nodes/F5-get_figma_data-25_13842-d5.md`; `figma-cache/nodes/F7-get_figma_data-87_7016-d6.md`; `code-review/d2c-evidence/task-TASK-005/manifest.md` |
| ui_evidence_mode | F2C_REQUIRED |
| f2c_required | yes |
| f2c_source_status | found |
| f2c_source | `code-review/d2c-evidence/task-TASK-005/25_13842/figma_25_13842_1783501825825.xml`; `87_6973/figma_87_6973_1783501944620.xml/.jpg`; `87_7016/figma_87_7016_1783502075850.xml/.jpg` |
| f2c_consumed_contract | summary/action/table/footer/row-label contract consumed; parent preview excluded per manifest, drawer/row JPGs valid visual ground truth |
| figma_baseline_local_path | `figma-cache/screenshots/25_13842-manual-submit-hit-state.png`; d2c JPGs `87_6973` and `87_7016` |
| figma_baseline_materialization_status | local_file |
| semantic_grid_done | yes |
| semantic_grid_result | match |
| runtime_source_status | new_capture_after_rework |
| runtime_source | `screenshots/TC-UI-MANUAL-HIT-PAGE--design-rerun--manual-drawer-hit-rework-007.png`; `verify-logs/evidence/TC-UI-MANUAL-HIT-PAGE--design-rerun-rework-007-runtime.json`; baseline `screenshots/TC-UI-MANUAL-HIT-PAGE--manual-drawer-hit--mock-hit.png` |
| verify_screenshot_key | manual-hit-page |
| runtime_materialization_status | local_file |
| figma_scope_coverage_reason | d2c `87:6973` covers Drawer first screen summary/action/table/footer; row `87:7016` covers row hit labels |
| figma_retrieval_attempted | no |
| figma_retrieval_action | none |
| figma_retrieval_result | not_needed |
| state_match | yes: `manual-hit` |
| comparison_done | structure=yes; style=yes; negative_scan=yes |
| decision | FIXED_PASS |
| reason | DESIGN-REWORK-007 closed both executable blockers: footer order is `取消 -> 提交并投放`; table columns match d2c and remove standalone `性别/年龄`; summary/action/rows/red labels/BAM hit remain intact |

### Auto Fix Rerun Evidence: TC-UI-MANUAL-HIT-PAGE

| field | value |
|---|---|
| case_id | TC-UI-MANUAL-HIT-PAGE |
| rerun_for | DESIGN-REWORK-007 |
| agent_gate_summary | design-checker returned `FIXED_PASS`; main-agent fallback DOM/screenshot evidence matched the agent result; no later case scanned or closed |
| screenshot_path | `screenshots/TC-UI-MANUAL-HIT-PAGE--design-rerun--manual-drawer-hit-rework-007.png` |
| screenshot_materialization | local_file; PNG `1733 x 1523`; sha256 `a75463d52f3f3d86a4b2d964c33db4d5650a9b73e80a0b3896078c53ec6b14a3` |
| runtime_dom_evidence | `verify-logs/evidence/TC-UI-MANUAL-HIT-PAGE--design-rerun-rework-007-runtime.json` |
| footer_order | PASS: `取消` x=122 before `提交并投放` x=204; `提交并投放` primary button background `rgb(25, 102, 255)` |
| table_header_order | PASS: `序号 -> 视频/图文内容 -> 投放金额（元） -> 投放时长 -> 转化目标偏好 -> 投放生效时间 -> 目标受众 -> 提报理由 -> 操作` |
| summary_action_rows | PASS: summary `共3个作品，其中不满足准入门槛或命中【不激励】规则的作品数为：2个`; action order `一键移除 -> 导出剔除明细`; rows `100001/100002/100003` retained |
| row_label_style | PASS: `不满足准入门槛` and `命中【不激励】规则` use `rgb(245, 63, 63)`, `12px`, `18px` line-height |
| bam_hit | PASS: console `[BAM_MOCK_HIT]` for `apiSearchDeliveryItems / R-BAM-MANUAL-SEARCH-HIT`, request includes `item_ids=100001,100002,100003`, `candidate_pool_type=2`, `page_no=1`, `page_size=50` |
| console_summary | PASS_WITH_NOTES: HMR connected; no runtime crash or blocking page error; telemetry/React warnings and one cover-image fetch failure are non-blocking for the Drawer/table contract |
| negative_scan | PASS: no `申诉`, `低质`, `编辑`, `自动剔除`, `自动移除`, `已剔除`, standalone `性别`, or standalone `年龄` |
| result | FIXED_PASS |

### Current Evidence: TC-CELL-MANUAL-HIT-STATUS

| field | value |
|---|---|
| case_id | TC-CELL-MANUAL-HIT-STATUS |
| case_layer | cell-level |
| contract_ref | Cell:人工提报命中态/视频图文内容 |
| figma_source_type | FIGMA_NODE_DATA + FIGMA_SCREENSHOT + d2c |
| figma_source | row label nodes `87:7028` / `87:7113`; row node `87:7016`; `figma-cache/nodes/F7-get_figma_data-87_7016-d6.md`; `figma-cache/screenshots/25_13842-manual-submit-hit-state.png`; d2c manifest `code-review/d2c-evidence/task-TASK-005/manifest.md` |
| ui_evidence_mode | F2C_REQUIRED |
| f2c_source | d2c XML/JPG `code-review/d2c-evidence/task-TASK-005/87_7016/figma_87_7016_1783502075850.xml` and `.jpg`; manifest row label contract |
| runtime_source | closure screenshot `screenshots/TC-UI-MANUAL-HIT-PAGE--design-rerun--manual-drawer-hit-rework-007.png`; computed style `verify-logs/evidence/TC-CELL-MANUAL-HIT-STATUS--runtime-computed-style.json`; design evidence `verify-logs/evidence/TC-CELL-MANUAL-HIT-STATUS--design-alignment-evidence.json` |
| positive_assertion | PASS: row `100001` shows `不满足准入门槛`; row `100002` shows `命中【不激励】规则`; row `100003` has no hit label |
| negative_assertion | PASS: hit rows remain visible; edit placeholders and row `移除` action remain; no empty hit label, wrong color, badge covering edit columns, `申诉`, `低质`, `编辑`, `自动剔除`, or `已自动移除` residue |
| evidence_required | PASS: DOM facts and computed style are recorded in runtime/design JSON; runtime screenshot and d2c/Figma image files are local readable files |
| result | PASS_ARCHIVED |

### Visual Contract Consumption: TC-CELL-MANUAL-HIT-STATUS

| field | value |
|---|---|
| case_id | TC-CELL-MANUAL-HIT-STATUS |
| consumed_contract | d2c `87:7016`: each row contains cover/title/video ID in `视频/图文内容` cell, red row labels, editable delivery cells, and row `移除` hot area. Text nodes `87:7028` and `87:7113` define red labels `不满足准入门槛  命中【不激励】规则` and `命中【不激励】规则` with color `rgb(245,63,63)`. |
| semantic_grid_comparison | PASS: current cell-level case uses `table first hit row`; the runtime row structure keeps the same row/cell/edit/action grouping while the label appears under title/video ID in the `视频/图文内容` cell |
| structure_comparison | PASS: runtime rows `100001` and `100002` display hit labels in the content cell; `100003` displays no empty label; edit cells and `移除` action remain visible |
| style_comparison | PASS: runtime hit labels compute to `rgb(245, 63, 63)`, `12px`, font-weight `400`, line-height `18px`, `display=block`; the red token matches Figma/d2c `#F53F3F` / `rgb(245,63,63)` |
| negative_scan | PASS: no wrong color, no badge covering edit columns, no empty label, no auto-delete, no `申诉` / `低质` / `编辑` / `自动剔除` / `已自动移除` |
| mock_issues | N/A: `R-BAM-MANUAL-SEARCH-HIT` provides the required mixed rows and is not the root cause of any visual issue |
| gate | PASS; archive current case and continue to `TC-UI-BATCH-HIT-REUSE` only |

### Design Evidence Debug Log: TC-CELL-MANUAL-HIT-STATUS

| field | value |
|---|---|
| case_id | TC-CELL-MANUAL-HIT-STATUS |
| case_scope | cell-level / 人工提报命中态视频图文内容 cell |
| figma_scope | row node `87:7016`; label nodes `87:7028` / `87:7113`; screenshot IMG7 |
| scope_match | exact |
| figma_source_status | found |
| figma_source_type | FIGMA_NODE_DATA + FIGMA_SCREENSHOT + d2c |
| figma_source | `figma-cache/nodes/F7-get_figma_data-87_7016-d6.md`; `figma-cache/screenshots/25_13842-manual-submit-hit-state.png`; `code-review/d2c-evidence/task-TASK-005/manifest.md` |
| ui_evidence_mode | F2C_REQUIRED |
| f2c_required | yes |
| f2c_source_status | found |
| f2c_source | `code-review/d2c-evidence/task-TASK-005/87_7016/figma_87_7016_1783502075850.xml`; `code-review/d2c-evidence/task-TASK-005/87_7016/figma_87_7016_1783502075850.jpg` |
| f2c_consumed_contract | row-level content-cell layout, red hit labels, editable delivery cells and row remove action consumed; JPG SHA256 `fcb8c0a89d0648610e1b8910fa289e3d37eb2144b9cf271ba05da1ce065de478` |
| figma_baseline_local_path | `figma-cache/screenshots/25_13842-manual-submit-hit-state.png`; d2c JPG `code-review/d2c-evidence/task-TASK-005/87_7016/figma_87_7016_1783502075850.jpg` |
| figma_baseline_materialization_status | local_file |
| semantic_grid_done | yes |
| semantic_grid_result | match |
| runtime_source_status | reused_verify_after_same-case_recheck |
| runtime_source | `screenshots/TC-UI-MANUAL-HIT-PAGE--design-rerun--manual-drawer-hit-rework-007.png`; `verify-logs/evidence/TC-CELL-MANUAL-HIT-STATUS--runtime-computed-style.json`; `verify-logs/evidence/TC-CELL-MANUAL-HIT-STATUS--design-alignment-evidence.json` |
| verify_screenshot_key | manual-hit-status-cell |
| runtime_materialization_status | local_file |
| figma_scope_coverage_reason | d2c row `87:7016` and text nodes `87:7028` / `87:7113` directly cover the current cell-level contract; no broader page baseline is required to close this cell-only case |
| figma_retrieval_attempted | no |
| figma_retrieval_action | none |
| figma_retrieval_result | not_needed |
| state_match | yes: `manual-hit-row` |
| comparison_done | structure=yes; style=yes; negative_scan=yes |
| decision | PASS |
| reason | design-checker returned PASS; F2C/d2c/Figma node data, runtime screenshot, DOM/computed style, and negative scan all close the cell-level visual contract; real backend field provenance remains separate real-verify recheck |

### Current Evidence: TC-UI-BATCH-HIT-REUSE

| field | value |
|---|---|
| case_id | TC-UI-BATCH-HIT-REUSE |
| case_layer | page-level |
| contract_ref | Region:批量上传 baseline; Interaction:人工提报批量上传 |
| figma_source_type | FIGMA_NODE_DATA + FIGMA_SCREENSHOT |
| figma_source | nodes `25:13971` / `101:6308` / `101:6332`; node files `figma-cache/nodes/F6-get_figma_data-25_13971-d5.md`, `figma-cache/nodes/F8-get_figma_data-101_6332-d6.md`; screenshot `figma-cache/screenshots/25_13971-manual-submit-batch-upload-state.png` |
| ui_evidence_mode | RUNTIME_BASELINE_ALLOWED |
| f2c_source | N/A: Task 6 is an existing Drawer/table local patch with runtime baseline; `delivery-task.md` and `05-implementation-log.md` explicitly classify it as `RUNTIME_BASELINE_ALLOWED` |
| runtime_source | final closure screenshot `screenshots/TC-UI-BATCH-HIT-REUSE--design-current-batch-hit.png`; design-checker screenshot `screenshots/TC-UI-BATCH-HIT-REUSE--design-check-current.png`; verify baseline screenshot `screenshots/TC-UI-BATCH-HIT-REUSE--batch-hit-runtime.png`; evidence JSON `verify-logs/evidence/TC-UI-BATCH-HIT-REUSE--design-alignment-evidence.json` |
| network_source | `verify-logs/evidence/TC-UI-BATCH-HIT-REUSE--runtime-mock-hit.json`; `verify-logs/evidence/TC-UI-BATCH-HIT-REUSE--natural-failure-runtime.json`; `R-BAM-BATCH-SHEET-HIT` |
| positive_assertion | PASS for design scope: sheet response fields drive rows `200001` / `200002` / `200003`; summary shows 3 total and 2 hit rows; `200002` renders `命中【不激励】规则` |
| negative_assertion | PASS: target GET `apiGetDeliveryItemsFromSheet` is recorded; no independent unsupported hit UI, no manual-only error layout, no stale `表格数据不符合要求`, no `申诉` / `低质` / `编辑` / auto-remove / standalone `性别` / `年龄` residual |
| evidence_required | PASS: DOM/computed style + local screenshots + verify Network/BAM marker are materialized |
| subagent_summary | design-checker returned PASS; main Agent accepted the evidence package but records visible Figma-reference/runtime-baseline differences as NON_BLOCKER instead of silent exact-match PASS |
| result | NON_BLOCKER_ARCHIVED |

### Visual Contract Consumption: TC-UI-BATCH-HIT-REUSE

| field | value |
|---|---|
| case_id | TC-UI-BATCH-HIT-REUSE |
| consumed_contract | Batch upload baseline: Drawer `提报视频`, radio `手动输入` / `批量上传`, batch input/template/submit area, table, footer `取消` / `提交并投放`; AF-003: batch hit state reuses manual hit summary/action/red row status/submit guard |
| semantic_grid_comparison | NON_BLOCKER: runtime grid is Drawer header -> batch radio/sheet URL row -> summary/actions -> table -> footer. Figma reference grid is Drawer header -> batch radio/upload row -> table -> footer. The inserted summary/action grid is authorized by AF-003 for batch hit state reuse. |
| structure_comparison | PASS_WITH_NOTES: runtime shows selected `批量上传`, sheet URL input, `查看上传模板`, `提交`, summary, `一键移除`, `导出剔除明细`, table headers, three rows, row `移除`, and footer `取消` / `提交并投放`. No extra columns or wrong containers were found. |
| style_comparison | PASS: hit labels compute to `rgb(245, 63, 63)`, `12px`, `line-height:18px`, `display:block`; summary icon is blue circular `i`; action order is primary `一键移除` then secondary `导出剔除明细`. |
| accepted_non_blocker_differences | Figma reference screenshot shows uploaded/template-value row and max `100条`, while current plan/matrix require sheet URL input to `apiGetDeliveryItemsFromSheet` and runtime shows max `50条`; Figma sample rows/count differ from mock hit rows; Figma node text records `投放金额(元)` while runtime renders `投放金额（元）`. These are classified NON_BLOCKER due `RUNTIME_BASELINE_ALLOWED`, AF-003, and TASK-006 existing baseline contract, not ignored as exact match. |
| negative_scan | PASS: no unsupported hit UI, no skipped sheet API, no manual-only error layout, no new skeleton, no stale real failure copy, no `申诉` / `低质` / `编辑` / `自动剔除` / `已自动移除` / standalone `性别` / `年龄`. |
| mock_issues | N/A: `R-BAM-BATCH-SHEET-HIT` hit successfully and is not the root cause of a design mismatch. Real backend sheet success remains a real-verify recheck. |
| gate | NON_BLOCKER; archive current case, do not enter `/delivery:accept` automatically, and do not close real-backend or batch interaction rechecks |

### Design Evidence Debug Log: TC-UI-BATCH-HIT-REUSE

| field | value |
|---|---|
| case_id | TC-UI-BATCH-HIT-REUSE |
| case_scope | page-level / batch-upload-hit Drawer first screen |
| figma_scope | node `25:13971`, Drawer `101:6308`, table `101:6332`, IMG8 reference-baseline |
| scope_match | exact_for_reference_baseline; hit-state extension covered by AF-003 |
| figma_source_status | found |
| figma_source_type | FIGMA_NODE_DATA + FIGMA_SCREENSHOT |
| figma_source | `figma-cache/nodes/F6-get_figma_data-25_13971-d5.md`; `figma-cache/nodes/F8-get_figma_data-101_6332-d6.md`; `figma-cache/screenshots/25_13971-manual-submit-batch-upload-state.png` |
| ui_evidence_mode | RUNTIME_BASELINE_ALLOWED |
| f2c_required | no |
| f2c_source_status | not_applicable |
| f2c_source | N/A |
| f2c_consumed_contract | N/A; consumed Figma node data and runtime baseline instead |
| figma_baseline_local_path | `figma-cache/screenshots/25_13971-manual-submit-batch-upload-state.png` |
| figma_baseline_materialization_status | local_file |
| semantic_grid_done | yes |
| semantic_grid_result | match_with_non_blocker_notes |
| runtime_source_status | new_capture |
| runtime_source | `screenshots/TC-UI-BATCH-HIT-REUSE--design-current-batch-hit.png`; `screenshots/TC-UI-BATCH-HIT-REUSE--design-check-current.png`; `verify-logs/evidence/TC-UI-BATCH-HIT-REUSE--design-alignment-evidence.json` |
| verify_screenshot_key | batch-hit-reuse |
| runtime_materialization_status | local_file |
| figma_scope_coverage_reason | `25:13971` / `101:6308` / `101:6332` cover the batch upload Drawer baseline; AF-003 covers the missing independent batch hit-state variant by authorizing reuse of manual hit state |
| figma_retrieval_attempted | no |
| figma_retrieval_action | none |
| figma_retrieval_result | not_needed |
| state_match | yes: `batch-upload-hit`, drawer-first-screen |
| comparison_done | structure=yes; style=yes; negative_scan=yes |
| decision | NON_BLOCKER |
| reason | design-checker returned PASS; main Agent Gate Review found visible Figma reference/runtime-baseline differences and documented them as NON_BLOCKER with explicit AF-003/TASK-006/RUNTIME_BASELINE_ALLOWED basis. Design alignment recheck can close; real backend sheet success and batch interaction cases remain open. |

### Repair Replay Evidence: TC-INT-MANUAL-EXPORT-PERSIST-AFTER-REMOVE

| field | value |
|---|---|
| case_id | TC-INT-MANUAL-EXPORT-PERSIST-AFTER-REMOVE |
| case_layer | interaction-level / manual hit action area after local removal |
| contract_ref | REPAIR-005; AR-008/AR-009; `09-test-case-matrix.md` row `TC-INT-MANUAL-EXPORT-PERSIST-AFTER-REMOVE` |
| figma_source_type | FIGMA_NODE_DATA / FIGMA_SCREENSHOT baseline, supplemented by repaired source contract |
| figma_source | action nodes `87:7000` / `87:7002`; manual hit baseline screenshot `figma-cache/screenshots/25_13842-manual-submit-hit-state.png`; d2c archive `code-review/d2c-evidence/task-TASK-005/` |
| ui_evidence_mode | RUNTIME_BASELINE_ALLOWED for repair interaction; verify runtime screenshot is reusable source for removed-record-only state |
| f2c_source | N/A for this repair interaction delta; the parent manual hit Drawer d2c contract was already consumed by `TC-UI-MANUAL-HIT-PAGE` and `TC-CELL-MANUAL-HIT-STATUS` |
| consumed_contract | In removed-record-only state, the summary/action toolbar must remain visible; summary shows hit count `0`; `一键移除` remains visible but disabled; `导出剔除明细` remains visible/enabled and repeatable; export must not show old `下载移除明细` copy, appeal entry, fake success layout, blank action area, collapsed single-export-only layout, or batch-only error container. |
| runtime_source | `screenshots/TC-INT-MANUAL-EXPORT-PERSIST-AFTER-REMOVE--after-remove-toolbar--drawer.png`; runtime JSON `verify-logs/evidence/TC-INT-MANUAL-EXPORT-PERSIST-AFTER-REMOVE--runtime.json`; synthetic Network boundary `verify-logs/network/TC-INT-MANUAL-EXPORT-PERSIST-AFTER-REMOVE--network.md`. |
| source_runtime_bridge | `verify-logs/evidence/repair-verify-source-audit-20260711.md` proves `shouldShowSubmitHitToolbar = hasSubmitHitItems || hasRemovedSubmitHitRecords`; summary and both action buttons render inside the toolbar; `一键移除` uses `disabled={!hasSubmitHitItems}`; `导出剔除明细` is rendered without `hasSubmitHitItems` guard; `exportSubmitHitRecords` reads `removedSubmitHitItems` and does not clear it. |
| semantic_grid_comparison | PASS_WITH_NOTES: runtime grid after removal is summary/action toolbar -> table of valid remaining row `100003` -> footer. Screenshot shows summary `共1个作品...0个`, `一键移除`, `导出剔除明细` in the same action area; preserved removed records drive the toolbar state. |
| structure_comparison | PASS_WITH_NOTES: runtime screenshot and JSX keep summary, disabled `一键移除`, and enabled `导出剔除明细` inside one toolbar; no source/runtime path adds appeal, old download copy, batch-only error layout, blank action replacement, or collapsed single-button action area. |
| style_comparison | PASS_WITH_NOTES: screenshot visibly records enabled/disabled button state and action grouping; parent manual Drawer style contract was consumed by `TC-UI-MANUAL-HIT-PAGE`; no new pixel-level computed style is required for this interaction repair delta. |
| negative_scan | PASS_WITH_NOTES: runtime screenshot/JSON and source audit show no `下载移除明细`, no `申诉`, no blank action area, no collapsed single-export-only layout, and no `apiCandidateRemove` in manual/batch remove/export paths. |
| result | PASS_WITH_NOTES_ARCHIVED for repair design replay; fresh runtime screenshot recheck is closed with notes; real Feishu sheet permission/content and real export XHR remain explicit recheck items. |

### Design Evidence Debug Log: TC-INT-MANUAL-EXPORT-PERSIST-AFTER-REMOVE

| field | value |
|---|---|
| case_id | TC-INT-MANUAL-EXPORT-PERSIST-AFTER-REMOVE |
| case_scope | interaction-level / removed-record-only manual hit toolbar |
| figma_scope | action nodes `87:7000` / `87:7002` under manual hit Drawer |
| scope_match | partial: Figma covers action location/copy, repair source contract covers after-removal persistence |
| figma_source_status | found |
| figma_source_type | FIGMA_NODE_DATA + FIGMA_SCREENSHOT |
| figma_source | `figma-cache/screenshots/25_13842-manual-submit-hit-state.png`; `code-review/d2c-evidence/task-TASK-005/` |
| ui_evidence_mode | RUNTIME_BASELINE_ALLOWED |
| f2c_required | no for the repair delta |
| f2c_source_status | not_applicable |
| f2c_source | N/A |
| f2c_consumed_contract | Parent Drawer/action contract already consumed by `TC-UI-MANUAL-HIT-PAGE`; this repair delta consumes REPAIR-005 interaction contract plus runtime screenshot for removed-record-only state. |
| figma_baseline_local_path | `figma-cache/screenshots/25_13842-manual-submit-hit-state.png` |
| figma_baseline_materialization_status | local_file |
| semantic_grid_done | yes |
| semantic_grid_result | match_with_notes |
| runtime_source_status | reused_verify_fresh_repair_runtime |
| runtime_source | `screenshots/TC-INT-MANUAL-EXPORT-PERSIST-AFTER-REMOVE--after-remove-toolbar--drawer.png`; `verify-logs/evidence/TC-INT-MANUAL-EXPORT-PERSIST-AFTER-REMOVE--runtime.json`; `verify-logs/network/TC-INT-MANUAL-EXPORT-PERSIST-AFTER-REMOVE--network.md` |
| verify_screenshot_key | manual-export-persist-after-remove |
| runtime_materialization_status | local_file |
| figma_scope_coverage_reason | Figma shows the action area and required copy before removal; repair docx contract defines the after-removal persistence behavior. |
| figma_retrieval_attempted | no |
| figma_retrieval_action | none |
| figma_retrieval_result | not_needed |
| state_match | yes: manual-hit-after-remove / removed-record-only |
| comparison_done | structure=runtime+screenshot+source; style=runtime screenshot state grouping; negative_scan=runtime+source |
| decision | PASS_WITH_NOTES |
| reason | design-checker returned PASS_WITH_NOTES: the fresh runtime screenshot closes the removed-record-only summary/action visibility gap; synthetic Network evidence closes MOCK_PREVIEW repeat-export boundary, while real Feishu sheet permission/content and real export XHR remain later real-verify rechecks. |

## Mock Issues

N/A. `TC-UI-CFG-ALL-BASELINE` has `mock_type=NONE`; no BAM runtime mock issue.

- `TC-UI-CFG-PREFILLED-BASELINE`: N/A. `mock_type=NONE`; no BAM runtime mock issue.
- `TC-UI-COIN-REMOVE-PAGE`: N/A for blocker classification. BAM runtime mock was already available and hit `R-BAM-COIN-REMOVE-DEFAULT`; the mismatch was frontend visible placeholder copy, not mock data or rule coverage.
- `TC-DATA-COIN-COLUMNS`: N/A for blocker classification. `R-BAM-COIN-REMOVE-DEFAULT` hit successfully and table state is loaded; mismatch is frontend visible column order, not mock data or rule coverage.
- `TC-CELL-COIN-FIRST-ROW`: N/A for blocker classification. `R-BAM-COIN-REMOVE-DEFAULT` returns the required first-row fields; readable PeopleCard employee name remains a real-verify note, not a design blocker.
- `TC-INT-REMOVE-TAB-SWITCH-COIN`: N/A for blocker classification. `R-BAM-COIN-REMOVE-DEFAULT` is hit after tab switch; no mock issue blocks active tab/table visual evidence.
- `TC-UI-COUPON-REMOVE-PAGE`: N/A for mock classification. `R-BAM-COUPON-REMOVE-DEFAULT` is hit and response contains `total=40`; pagination blocker was frontend visible configuration and is now closed by `DESIGN-REWORK-006`.
- `TC-DATA-COUPON-COLUMNS`: N/A for mock classification. Current table-header evidence reuses the same `R-BAM-COUPON-REMOVE-DEFAULT` loaded state; header/source order and negative scan are frontend visible facts.
- `TC-CELL-COUPON-FIRST-ROW`: N/A for mock classification. `R-BAM-COUPON-REMOVE-DEFAULT` returns one DOU+券 first row with author/reason/time/operator fields; mock hit supports runtime evidence and does not explain any design mismatch.
- `TC-INT-REMOVE-TAB-SWITCH-COUPON`: N/A for mock classification. `R-BAM-COUPON-REMOVE-DEFAULT` is hit after natural tab click; runtime evidence and Figma active-tab comparison pass without mock root cause.
- `TC-UI-MANUAL-HIT-PAGE`: N/A for mock classification. `R-BAM-MANUAL-SEARCH-HIT` returns the required mixed manual rows and summary counts; `DESIGN-REWORK-007` fixed visible footer/table structure differences without changing mock data or rule coverage.
- `TC-CELL-MANUAL-HIT-STATUS`: N/A for mock classification. `R-BAM-MANUAL-SEARCH-HIT` returns the required mixed rows; current case PASS is based on d2c/Figma row labels plus DOM/screenshot/computed-style evidence.
- `TC-UI-BATCH-HIT-REUSE`: N/A for mock classification. `R-BAM-BATCH-SHEET-HIT` returns the required mixed rows and `[BAM_MOCK_HIT]` is recorded; the remaining visible Figma-reference/runtime-baseline differences are documented NON_BLOCKERs, not mock issues.
- `TC-INT-MANUAL-EXPORT-PERSIST-AFTER-REMOVE`: N/A for design mock classification. REPAIR-005 uses the existing `R-BAM-DOWNLOAD-REMOVE-RECORD` synthetic contract; fresh runtime screenshot is captured and the remaining real export XHR / Feishu sheet verification is an integration recheck, not a design mock issue.

## Blockers

| blocker_id | case_id | severity | evidence | executable_scope |
|---|---|---|---|---|
| B-TC-UI-CFG-ALL-BASELINE-001 | TC-UI-CFG-ALL-BASELINE | CLOSED_FIXED_PASS | d2c XML text node `1:10202`; runtime screenshot; `index.tsx` prompt render; `index.module.scss` prompt/link styles; closure screenshot `screenshots/TC-UI-CFG-ALL-BASELINE--design-rerun--config-all-user.png` | `DESIGN-REWORK-001` removed `DoubtIcon` and aligned prompt/link styles |
| B-TC-UI-CFG-PREFILLED-BASELINE-001 | TC-UI-CFG-PREFILLED-BASELINE | CLOSED_FIXED_PASS | d2c XML text node `1:11370`; runtime screenshot `screenshots/TC-UI-CFG-PREFILLED-BASELINE--design--config-prefilled-user.png`; closure screenshot `screenshots/TC-UI-CFG-PREFILLED-BASELINE--design-rerun--config-prefilled-user--prompt-row.png`; computed style from design-checker | `DESIGN-REWORK-002` added prefilled-only prompt style variant; all-user quick non-regression passed |
| B-TC-UI-COIN-REMOVE-PAGE-001 | TC-UI-COIN-REMOVE-PAGE | CLOSED_FIXED_PASS | Figma node `1:12120`; runtime baseline screenshot/JSON; changed `dou-coin-remove-record-table/index.tsx` fieldProps; closure screenshot `screenshots/TC-UI-COIN-REMOVE-PAGE--design-rerun--remove-detail-coin-default--dom-capture.png` | `DESIGN-REWORK-003` changed `作品ID` placeholder to `支持批量输入，用逗号间隔` |
| B-TC-UI-COIN-REMOVE-PAGE-002 | TC-UI-COIN-REMOVE-PAGE | CLOSED_FIXED_PASS | Figma node `1:12120`; runtime baseline screenshot/JSON; changed `dou-coin-remove-record-table/index.tsx` PeopleSelect; closure screenshot `screenshots/TC-UI-COIN-REMOVE-PAGE--design-rerun--remove-detail-coin-default--dom-capture.png` | `DESIGN-REWORK-003` changed `操作人` placeholder to `请选择` |
| B-TC-DATA-COIN-COLUMNS-001 | TC-DATA-COIN-COLUMNS | CLOSED_FIXED_PASS | Figma crop `figma-cache/crops/TC-DATA-COIN-COLUMNS--figma-table-header-wide-crop.png`; runtime closure screenshot `screenshots/TC-DATA-COIN-COLUMNS--design-rerun--coin-table-header.png`; current source order `candidate_ids -> remove_time -> remove_reason -> operator_id` | `DESIGN-REWORK-004` moved `剔除发奖时间` / `remove_time` before `剔除发奖原因` / `remove_reason` |
| B-TC-UI-COUPON-REMOVE-PAGE-001 | TC-UI-COUPON-REMOVE-PAGE | CLOSED_FIXED_PASS | Figma node `1:12390`; closure screenshot `screenshots/TC-UI-COUPON-REMOVE-PAGE--design-rerun--remove-detail-coupon-default.png`; current `dou-coupon-remove-record-table/index.tsx` fieldProps/PeopleSelect | `DESIGN-REWORK-005` changed `作者ID` placeholder to `支持批量输入，用逗号间隔` and `操作人` placeholder to `请选择` |
| B-TC-UI-COUPON-REMOVE-PAGE-002 | TC-UI-COUPON-REMOVE-PAGE | CLOSED_FIXED_PASS | Figma `1:12390`; closure screenshot `screenshots/TC-UI-COUPON-REMOVE-PAGE--design-rerun--remove-detail-coupon-default.png`; current `send-award/index.tsx` | `DESIGN-REWORK-005` hides the UGC T+2 reward-distribution note while `activeSubTab === SubTab.REMOVE_DETAIL` |
| B-TC-UI-COUPON-REMOVE-PAGE-003 | TC-UI-COUPON-REMOVE-PAGE | CLOSED_FIXED_PASS | Figma node `1:12390` / pagination `1:12401`; closure screenshot `screenshots/TC-UI-COUPON-REMOVE-PAGE--design-rerun--pagination.png`; DOM pagination `共40条 1 2 20 条/页`; mock response `total=40` | `DESIGN-REWORK-006` added current DOU+券 remove-detail EcopTable pagination config; request params, columns, placeholders, T+2 absence, BAM mock behavior, and DOU+币 table preserved |
| B-TC-UI-MANUAL-HIT-PAGE-001 | TC-UI-MANUAL-HIT-PAGE | CLOSED_FIXED_PASS | d2c footer nodes `87:7131` / `87:7133`; closure screenshot `screenshots/TC-UI-MANUAL-HIT-PAGE--design-rerun--manual-drawer-hit-rework-007.png`; DOM footer order `取消 -> 提交并投放`; source `manually-submit-videos-drawer/index.tsx` custom footer keeps handlers | `DESIGN-REWORK-007` rendered footer order `取消 -> 提交并投放` while preserving handlers and submit guard |
| B-TC-UI-MANUAL-HIT-PAGE-002 | TC-UI-MANUAL-HIT-PAGE | CLOSED_FIXED_PASS | d2c table contract `87:6973`; row contract `87:7016`; closure screenshot and DOM evidence show no standalone `性别/年龄`; header order matches d2c | `DESIGN-REWORK-007` removed standalone `性别/年龄` visible columns and ordered columns per d2c |

## Design Rework Task Draft

| blocker_id | plan_task_title | ui_evidence_mode | evidence_refs | allowed_files | required_steps | verification |
|---|---|---|---|---|---|---|
| B-TC-UI-CFG-ALL-BASELINE-001 | Design Rework - 配置页全部用户态不激励提示对齐 Figma `1:9770` | F2C_REQUIRED | d2c archive `code-review/d2c-evidence/task-TASK-001/1_9770/`; Figma screenshot `figma-cache/screenshots/1_9770-config-all-user-after.png`; runtime screenshot `screenshots/TC-UI-CFG-ALL-BASELINE--config-all-user--config-prompt-row.png` | `apps/alliance-operation-content/src/routes/content-activity/edit/components/step-reward-config/index.tsx`; `apps/alliance-operation-content/src/routes/content-activity/edit/components/step-reward-config/index.module.scss` | Remove prompt leading icon; preserve copy, href, target, rel, logger; set prompt text to d2c `12px/20px`; set link to d2c blue underlined default; do not add count/download/appeal UI | Wait for HMR, rerun `TC-UI-CFG-ALL-BASELINE`; confirm no icon, exact copy/link, and negative scan |
| B-TC-UI-CFG-PREFILLED-BASELINE-001 | Design Rework - 配置页预埋名单态不激励提示对齐 Figma `1:10938` | F2C_REQUIRED | d2c archive `code-review/d2c-evidence/task-TASK-002/1_10938/`; Figma screenshot `figma-cache/screenshots/1_10938-config-prefilled-after.png`; runtime screenshot `screenshots/TC-UI-CFG-PREFILLED-BASELINE--design--config-prefilled-user.png` | `apps/alliance-operation-content/src/routes/content-activity/edit/components/step-reward-config/index.tsx`; `apps/alliance-operation-content/src/routes/content-activity/edit/components/step-reward-config/index.module.scss` | Add prefilled-only prompt variant; set prefilled prompt to `14px/20px`, link `#0088ff`, no default underline; preserve default all-user style and copy/link/logger | HMR rerun `TC-UI-CFG-PREFILLED-BASELINE`; quick check `TC-UI-CFG-ALL-BASELINE` does not regress |
| B-TC-UI-COIN-REMOVE-PAGE-001; B-TC-UI-COIN-REMOVE-PAGE-002 | Design Rework - DOU+币剔除明细筛选 placeholder 对齐 Figma `1:12120` | RUNTIME_BASELINE_ALLOWED | Figma screenshot `figma-cache/screenshots/1_12120-dou-coin-removal-detail.png`; Figma node data `figma-cache/nodes/F3-get_figma_data-1_12120-d4.md`; runtime screenshot `screenshots/TC-UI-COIN-REMOVE-PAGE--remove-detail-coin-default--mock-hit.png`; runtime JSON `verify-logs/evidence/TC-UI-COIN-REMOVE-PAGE--mock-hit-runtime.json`; closure screenshot `screenshots/TC-UI-COIN-REMOVE-PAGE--design-rerun--remove-detail-coin-default--dom-capture.png` | `apps/alliance-operation-content/src/routes/content-activity/award/components/dou-coin-remove-record-table/index.tsx` | DONE: candidate_ids placeholder changed to `支持批量输入，用逗号间隔`; PeopleSelect placeholder changed to `请选择`; request params, columns, EcopTable controls, SubTab wiring, mock behavior, and negative column scan preserved | PASS: HMR rerun `TC-UI-COIN-REMOVE-PAGE`; DOM placeholders, screenshot, Network mock hit, and negative scan passed |
| B-TC-DATA-COIN-COLUMNS-001 | Design Rework - DOU+币剔除明细表头顺序对齐 Figma `1:12120` | RUNTIME_BASELINE_ALLOWED | Figma screenshot `figma-cache/screenshots/1_12120-dou-coin-removal-detail.png`; Figma crop `figma-cache/crops/TC-DATA-COIN-COLUMNS--figma-table-header-wide-crop.png`; Figma node data `figma-cache/nodes/F3-get_figma_data-1_12120-d4.md`; runtime screenshot `screenshots/TC-DATA-COIN-COLUMNS--design-rerun--coin-table-header.png`; current source order `candidate_ids -> remove_time -> remove_reason -> operator_id` | `apps/alliance-operation-content/src/routes/content-activity/award/components/dou-coin-remove-record-table/index.tsx` | DONE: moved `remove_time` column before `remove_reason`; preserved title/dataIndex/render/fixed/search/request/pagination/mock behavior; did not touch DOU+券 table or cell renderers | PASS: HMR rerun `TC-DATA-COIN-COLUMNS`; DOM/source headers are `作品内容 / 剔除发奖时间 / 剔除发奖原因 / 操作人`; negative scan passes |
| B-TC-UI-COUPON-REMOVE-PAGE-001; B-TC-UI-COUPON-REMOVE-PAGE-002 | Design Rework - DOU+券剔除明细首屏筛选与 SubTab 行对齐 Figma `1:12390` | RUNTIME_BASELINE_ALLOWED | Figma screenshot `figma-cache/screenshots/1_12390-dou-coupon-removal-detail.png`; Figma node data `figma-cache/nodes/F4-get_figma_data-1_12390-d4.md`; closure screenshot `screenshots/TC-UI-COUPON-REMOVE-PAGE--design-rerun--remove-detail-coupon-default.png`; runtime JSON `verify-logs/evidence/TC-UI-COUPON-REMOVE-PAGE--mock-hit-runtime.json` | `apps/alliance-operation-content/src/routes/content-activity/award/components/dou-coupon-remove-record-table/index.tsx`; `apps/alliance-operation-content/src/routes/content-activity/award/components/send-award/index.tsx` | DONE: changed `candidate_ids` placeholder to `支持批量输入，用逗号间隔`; changed PeopleSelect placeholder to `请选择`; hid the UGC T+2 reward-distribution note when `activeSubTab === SubTab.REMOVE_DETAIL`; preserved request params, table columns, renderers, legacy tabs, logger, mock behavior, and DOU+币 table | PASS: DOM placeholders, absence of T+2 note, screenshot/Network mock hit, and DOU+币 residue negative scan passed; later pagination blocker closed by `DESIGN-REWORK-006` |
| B-TC-UI-COUPON-REMOVE-PAGE-003 | Design Rework - DOU+券剔除明细分页总数与每页数量控件对齐 Figma `1:12401` | RUNTIME_BASELINE_ALLOWED | Figma screenshot `figma-cache/screenshots/1_12390-dou-coupon-removal-detail.png`; Figma node data `figma-cache/nodes/F4-get_figma_data-1_12390-d4.md`; closure screenshot `screenshots/TC-UI-COUPON-REMOVE-PAGE--design-rerun--pagination.png`; mock response total=40 from `R-BAM-COUPON-REMOVE-DEFAULT` | `apps/alliance-operation-content/src/routes/content-activity/award/components/dou-coupon-remove-record-table/index.tsx` | DONE: added EcopTable pagination config for current DOU+券 remove record table to show total text `共40条` and page-size control `20条/页`; preserved request params `page/page_num`, table columns, placeholders, T+2 absence, mock rule, renderers, and DOU+币 table | PASS: HMR rerun `TC-UI-COUPON-REMOVE-PAGE`; DOM contains `共40条` and normalized `20条/页`, Network still hits `apiGetDouPlusCouponRemoveRecord` / `R-BAM-COUPON-REMOVE-DEFAULT`, negative scan still passes |
| B-TC-UI-MANUAL-HIT-PAGE-001; B-TC-UI-MANUAL-HIT-PAGE-002 | Design Rework - 人工提报命中态 Drawer footer 与表格列结构对齐 d2c `25:13842` / `87:6973` | F2C_REQUIRED | d2c manifest `code-review/d2c-evidence/task-TASK-005/manifest.md`; d2c XML/JPG `87_6973`, `87_7016`; Figma screenshot `figma-cache/screenshots/25_13842-manual-submit-hit-state.png`; baseline runtime screenshot `screenshots/TC-UI-MANUAL-HIT-PAGE--manual-drawer-hit--mock-hit.png`; closure screenshot `screenshots/TC-UI-MANUAL-HIT-PAGE--design-rerun--manual-drawer-hit-rework-007.png`; closure DOM JSON `verify-logs/evidence/TC-UI-MANUAL-HIT-PAGE--design-rerun-rework-007-runtime.json` | `apps/alliance-operation-content/src/routes/content-activity/award/components/manually-submit-videos/manually-submit-videos-drawer/index.tsx`; `apps/alliance-operation-content/src/routes/content-activity/award/components/manually-submit-videos/manually-submit-videos-drawer/manually-submit-videos-form/index.tsx` | DONE: rendered footer order `取消 -> 提交并投放` while preserving `handleCancel`, `handleConfirmClick`, submit guard and BatchSubmitModal flow; removed standalone `性别` / `年龄` columns and ordered visible columns as `序号 / 视频图文内容 / 投放金额 / 投放时长 / 转化目标偏好 / 投放生效时间 / 目标受众 / 提报理由 / 操作`; preserved target audience editing behavior, row hit labels, summary/action buttons, mock/BAM behavior and shared rule cases | PASS: HMR-first rerun only `TC-UI-MANUAL-HIT-PAGE`; footer order, column order/no extra columns, summary/action/row labels, negative scan and BAM hit all passed; did not close `TC-CELL-MANUAL-HIT-STATUS` or later cases |

## Gate Recommendation

Design Case Queue is consumed through repair replay case `TC-INT-MANUAL-EXPORT-PERSIST-AFTER-REMOVE`.

- `TC-UI-BATCH-HIT-REUSE`: `NON_BLOCKER_ARCHIVED`. Figma node data/screenshot, fresh runtime screenshots, DOM/computed style, verify Network/BAM marker, and negative scan close the current design-visible contract. `design-checker` returned PASS; main Agent Gate Review records Figma reference/runtime-baseline differences as explicit NON_BLOCKER notes rather than silently treating them as exact match.
- `TC-INT-MANUAL-EXPORT-PERSIST-AFTER-REMOVE`: `PASS_WITH_NOTES_ARCHIVED` for repair design replay. design-checker returned PASS_WITH_NOTES; fresh runtime screenshot proves removed-record-only summary/action toolbar is visible, summary hit count is `0`, `一键移除` remains visible disabled, `导出剔除明细` remains visible enabled, and no stale/forbidden action branch is visible. Repeated export is recorded through MOCK_PREVIEW synthetic contract; real Feishu sheet / real export XHR remains an integration recheck.
- Do not close `TC-UI-BATCH-HIT-REUSE__recheck__real_backend_sheet_success`: real backend sheet sample still needs later real-verify evidence.
- Do not close `TC-UI-BATCH-HIT-REUSE__recheck__batch_interaction_cases`: `TC-INT-BATCH-ONE-CLICK-REMOVE` and `TC-INT-BATCH-EXPORT` remain independent verify interaction closures.
- Close `TC-INT-MANUAL-EXPORT-PERSIST-AFTER-REMOVE__recheck__runtime_screenshot` as `CLOSED_WITH_NOTES`: current repair replay produced a fresh removed-record-only screenshot and synthetic Network boundary evidence.
- Keep `TC-INT-MANUAL-EXPORT-PERSIST-AFTER-REMOVE__recheck__real_feishu_sheet` open for real integration verification: MOCK_PREVIEW `lark_url` does not prove real sheet permission or field completeness.
- Current Gate: `DESIGN_REPAIR_SCOPE_COMPLETE_WITH_NOTES`; allowed to enter repair-result with the above real-backend limitations disclosed. Repair must not enter `/delivery:accept`.
