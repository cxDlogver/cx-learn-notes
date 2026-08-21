# Verification Case Result

### Case: `TC-INT-REMOVE-TAB-SWITCH-COIN`

- `order`: 9
- `verification_stage`: verify+design
- `priority`: normal
- `contract_ref`: Interaction:奖励投放/SubTab/剔除明细
- `source_verify_report`: ../../06-debug-verification.md
- `updated_at`: 2026-07-08T12:08:25Z
- `verification_target`: DOU+币奖励投放页从 legacy 子 Tab 点击 `剔除明细` 后，activeSubTab 切换、触发 DOU+币剔除表请求、保留 legacy tabs 且不渲染 DOU+券表
- `acceptance_steps`:
  - DOU+币奖励投放默认在 `奖励下发` 或 `投放明细`
  - 点击 `剔除明细`
  - 期望：activeSubTab 变为 remove detail，触发表格 request，legacy tab 仍可返回
- `verification_process`:
  - 复用 `TC-UI-COIN-REMOVE-PAGE` 的自然 UI click evidence：reload 后从默认 `奖励下发` 点击 `剔除明细`
  - 回读 runtime evidence 的 before/action/after steps、target GET request、subTabs active state、headers、screenshot 和 mock hit
  - 新增 `TC-INT-REMOVE-TAB-SWITCH-COIN--source-evidence.md`，记录 `SubTab.REMOVE_DETAIL`、三 Radio button、coin/coupon reward 分支和互斥表格渲染条件
  - 逐项对账 positive_assertion、negative_assertion、visual_assertion、negative_visual_assertion、evidence_required
- `ui_condition_completion`: not_triggered
- `write_interface_gate`: PASS；复用 `apiGetDouPlusCoinRemoveRecord` / `R-BAM-COIN-REMOVE-DEFAULT` 已通过 `patch.status=patched`、`rehydration.status=passed`、`finalVerification.status=passed`
- `fixture_fallback`: not_triggered
- `mock_handling`: effective_verify_mode=MOCK_PREVIEW; ruleId=`R-BAM-COIN-REMOVE-DEFAULT`; apiName=`apiGetDouPlusCoinRemoveRecord`; requestBody=`activity_id=7655304206886322458,config_id=7655304206886338842,page=1,page_num=20`; mockedResponse=`records.length=1,total=40,has_more=true`; detour result=`delivery-mock.md` PASS
- `auto_fix_handling`: N/A
- `final_result`: PASS_WITH_NOTES
- `evidence_summary`: Natural click, target request, active tab state, legacy tab visibility, DOU+币 table headers and source render branch evidence close the verify runtime assertions. Verify does not claim Figma-vs-runtime active tab alignment or real backend load timing.
- `residual_risk`: `/delivery:design` still needs active tab style alignment against Figma. Real backend verify should later cover真实 tab load timing and non-mock request behavior. Tracking click/exposure remains a separate case `TC-TRACK-REMOVE-DETAIL-TAB-COIN`.
- `next_step`: continue verify queue with next non-terminal case `TC-UI-COUPON-REMOVE-PAGE`

#### Runbook Sync（Runbook 同步）

- `case_id`: TC-INT-REMOVE-TAB-SWITCH-COIN
- `runbook_ref`: verify-logs/browser-verify-runbook.json#TC-INT-REMOVE-TAB-SWITCH-COIN
- `runbook_status`: updated
- `entry_url`: https://ecop.bytedance.net/alliance-operation-content/content-activity/award?activity_id=7655304206886322458&cjDebugSubApp=alliance-operation-content%3Ahttp%3A%2F%2Flocalhost%3A8083%2Falliance-operation-content&externalLeadsDomainMock=1&cjSiteCode=St12502250000001
- `sample_params`: runtime_state=coin-tab-switch; capture_scope=SubTab+table; ruleId=R-BAM-COIN-REMOVE-DEFAULT; activity_id=7655304206886322458; config_id=7655304206886338842
- `step_changes`: reused natural UI click path captured by `TC-UI-COIN-REMOVE-PAGE`; added source evidence for SubTab and coin/coupon branch conditions
- `assertion_changes`: positive/negative/visual/evidence_required records aligned to runtime JSON, reused screenshot and source evidence
- `evidence_alignment`: aligned_for_verify_runtime; design_alignment_pending; tracking_payload_not_in_scope
- `notes`: This case closes tab-switch runtime behavior only; click/exposure logger payload is handled by `TC-TRACK-REMOVE-DETAIL-TAB-COIN`.

#### Evidence Reconciliation（证据对账）

##### Assertion（断言）：`positive_assertion`

- `case_id`: TC-INT-REMOVE-TAB-SWITCH-COIN
- `evidence_requirement_id`: TC-INT-REMOVE-TAB-SWITCH-COIN__positive_assertion
- `assertion_ref`: positive_assertion
- `verification_status`: EXECUTED
- `execution_ref`: Reused natural UI click `剔除明细` + default-list Network/DOM evidence
- `recording_status`: RECORDED
- `evidence_type`: Network+UI/DOM+screenshot+source
- `coverage_result`: PASS

| `acceptance_item` | `observed_value` | `evidence_ref` | `coverage_result` |
|---|---|---|---|
| `SubTab.REMOVE_DETAIL` active | Runtime subTabs show `剔除明细` checked with class `auxo-radio-button-wrapper-checked` and computed color `rgb(25, 102, 255)` after natural click | verify-logs/evidence/TC-UI-COIN-REMOVE-PAGE--mock-hit-runtime.json; screenshots/TC-UI-COIN-REMOVE-PAGE--remove-detail-coin-default--mock-hit.png | PASS |
| 只渲染 DOU+币作品表 | Runtime headers are `作品内容 / 剔除发奖原因 / 剔除发奖时间 / 操作人`; source branch renders `DouPlusCoinRemoveRecordTable` only when remove-detail + coin reward | verify-logs/evidence/TC-UI-COIN-REMOVE-PAGE--mock-hit-runtime.json; verify-logs/evidence/TC-INT-REMOVE-TAB-SWITCH-COIN--source-evidence.md | PASS |
| 触发表格 request | Natural click triggers GET `/api/buyin/admin/content_activity/get_dou_plus_coin_remove_record` with `page=1,page_num=20` and `[BAM_MOCK_HIT]` ruleId=`R-BAM-COIN-REMOVE-DEFAULT` | verify-logs/evidence/TC-UI-COIN-REMOVE-PAGE--mock-hit-runtime.json; mock/apis/apiGetDouPlusCoinRemoveRecord/manifest.json | PASS |

##### Assertion（断言）：`negative_assertion`

- `case_id`: TC-INT-REMOVE-TAB-SWITCH-COIN
- `evidence_requirement_id`: TC-INT-REMOVE-TAB-SWITCH-COIN__negative_assertion
- `assertion_ref`: negative_assertion
- `verification_status`: EXECUTED
- `execution_ref`: Runtime tab and table state + source branch evidence
- `recording_status`: RECORDED
- `evidence_type`: Network+UI/DOM+screenshot+source
- `coverage_result`: PASS

| `acceptance_item` | `observed_value` | `evidence_ref` | `coverage_result` |
|---|---|---|---|
| 不隐藏 legacy tabs | Runtime subTabs show `奖励下发`, `投放明细`, `剔除明细` all found; source renders all three Radio buttons | verify-logs/evidence/TC-UI-COIN-REMOVE-PAGE--mock-hit-runtime.json; verify-logs/evidence/TC-INT-REMOVE-TAB-SWITCH-COIN--source-evidence.md | PASS |
| 不渲染 DOU+券表 | Runtime headers do not include DOU+券 author table labels; source branch renders coupon remove table only when `isCouponReward` | verify-logs/evidence/TC-UI-COIN-REMOVE-PAGE--mock-hit-runtime.json; verify-logs/evidence/TC-INT-REMOVE-TAB-SWITCH-COIN--source-evidence.md | PASS |

##### Assertion（断言）：`visual_assertion`

- `case_id`: TC-INT-REMOVE-TAB-SWITCH-COIN
- `evidence_requirement_id`: TC-INT-REMOVE-TAB-SWITCH-COIN__visual_assertion
- `assertion_ref`: visual_assertion
- `verification_status`: EXECUTED
- `execution_ref`: Runtime active tab DOM/computed color + local screenshot
- `recording_status`: RECORDED
- `evidence_type`: UI/DOM+screenshot+computed_style
- `coverage_result`: PASS_WITH_NOTES

| `acceptance_item` | `observed_value` | `evidence_ref` | `coverage_result` |
|---|---|---|---|
| active tab 样式沿用现有 Tab/Radio token | Runtime active tab uses Auxo radio checked class and computed color `rgb(25, 102, 255)`; verify records runtime style source only and leaves Figma-vs-runtime alignment to `/delivery:design` | verify-logs/evidence/TC-UI-COIN-REMOVE-PAGE--mock-hit-runtime.json; screenshots/TC-UI-COIN-REMOVE-PAGE--remove-detail-coin-default--mock-hit.png | PASS_WITH_NOTES |

##### Assertion（断言）：`negative_visual_assertion`

- `case_id`: TC-INT-REMOVE-TAB-SWITCH-COIN
- `evidence_requirement_id`: TC-INT-REMOVE-TAB-SWITCH-COIN__negative_visual_assertion
- `assertion_ref`: negative_visual_assertion
- `verification_status`: EXECUTED
- `execution_ref`: Runtime table state + source branch evidence
- `recording_status`: RECORDED
- `evidence_type`: UI/DOM+screenshot+source
- `coverage_result`: PASS

| `acceptance_item` | `observed_value` | `evidence_ref` | `coverage_result` |
|---|---|---|---|
| 不出现跨 reward type 残留 | Runtime reward type is `DOU+币`, headers are DOU+币作品 table, and source remove-detail render branches are mutually gated by `isCoinReward/isCouponReward` | verify-logs/evidence/TC-UI-COIN-REMOVE-PAGE--mock-hit-runtime.json; verify-logs/evidence/TC-INT-REMOVE-TAB-SWITCH-COIN--source-evidence.md | PASS |

##### Assertion（断言）：`evidence_required`

- `case_id`: TC-INT-REMOVE-TAB-SWITCH-COIN
- `evidence_requirement_id`: TC-INT-REMOVE-TAB-SWITCH-COIN__evidence_required
- `assertion_ref`: evidence_required
- `verification_status`: EXECUTED
- `execution_ref`: Evidence reuse and materialization check
- `recording_status`: RECORDED
- `evidence_type`: before/action/after+Network+screenshot+source
- `coverage_result`: PASS

| `acceptance_item` | `observed_value` | `evidence_ref` | `coverage_result` |
|---|---|---|---|
| 证据类型：before/action/after | Runtime evidence records reload, click `剔除明细` from default `奖励下发`, and after-state table render | verify-logs/evidence/TC-UI-COIN-REMOVE-PAGE--mock-hit-runtime.json | PASS |
| 证据类型：Network | Target GET request and mock hit are persisted in redacted evidence | verify-logs/evidence/TC-UI-COIN-REMOVE-PAGE--mock-hit-runtime.json; mock/apis/apiGetDouPlusCoinRemoveRecord/manifest.json | PASS |
| 证据类型：截图 | Reused runtime screenshot is materialized as a local PNG under workspace `screenshots/` | screenshots/TC-UI-COIN-REMOVE-PAGE--remove-detail-coin-default--mock-hit.png | PASS |
| 证据复用边界 | Reuse is valid for default unfiltered `R-BAM-COIN-REMOVE-DEFAULT` tab switch; it does not close DOU+券 tab switch or tracking case | verify-logs/evidence/TC-INT-REMOVE-TAB-SWITCH-COIN--source-evidence.md; verify-logs/case-results/TC-UI-COIN-REMOVE-PAGE.md | PASS |

#### Pending Recheck Items（待复检项）

| `recheck_id` | `status` | `trigger_result` | `recheck_stage` | `target_assertion` | `reason` | `required_persistent_evidence` | `resume_point` | `owner` |
|---|---|---|---|---|---|---|---|---|
| TC-INT-REMOVE-TAB-SWITCH-COIN__recheck__design_alignment | CLOSED_PASS | PASS_WITH_NOTES | /delivery:design | visual_assertion | verify 阶段只保存 runtime active tab style source，不声明 Figma-vs-runtime 对齐通过 | `07-design-alignment.md` 已引用 active tab node `1:12273`、runtime screenshot `screenshots/TC-DATA-COIN-COLUMNS--design-rerun--coin-table-header.png`、current bounded click/Network/active computed style，并完成 Figma-vs-runtime active tab style 对比 | TC-INT-REMOVE-TAB-SWITCH-COIN | design-checker |
| TC-INT-REMOVE-TAB-SWITCH-COIN__recheck__real_backend_timing | OPEN | PASS_WITH_NOTES | real verify | positive_assertion / evidence_required | MOCK_PREVIEW 证明前端 click/request/render；真实后端加载时序和非 mock response 仍需复验 | 真实后端 Network、DOM before/action/after 和截图 | TC-INT-REMOVE-TAB-SWITCH-COIN | main-agent |

#### MTR Real Test Result（真实复测追加）

| field | value |
|---|---|
| mtr_run | `2026-07-13 /delivery:verify --mtr` |
| real_action | 从 DOU+券状态自然点击 `配置一（人工提报）`，页面保留 `剔除明细` 子 Tab 并触发 DOU+币真实读取。 |
| real_dom | `配置一（人工提报）` selected；`剔除明细` selected；表头 `作品内容 / 剔除发奖原因 / 剔除发奖时间 / 操作人`；无 `作者信息`。 |
| real_request | `GET /get_dou_plus_coin_remove_record?...page=1&page_num=20` 返回 `st=0/code=0,total=0,has_more=false`。 |
| mtr_evidence_ref | `verify-logs/evidence/mtr-real-recheck-20260713.md#dou币剔除明细默认读取` |
| mtr_result | `PASS_WITH_NOTES` |
| remaining_real_gap | 真实非空加载时序、排序和多页分页仍待后端样本复测。 |
