# Verification Case Result

### Case: `TC-UI-COIN-REMOVE-PAGE`

- `order`: 5
- `verification_stage`: verify+design
- `priority`: normal
- `contract_ref`: Region:DOU+币剔除明细/SubTab/筛选区/表格/分页
- `source_verify_report`: ../../06-debug-verification.md
- `updated_at`: 2026-07-17T00:00:00Z
- `verification_target`: DOU+币奖励投放页点击 `剔除明细` 后，渲染剔除明细筛选区、作品维度表格、分页并请求 `apiGetDouPlusCoinRemoveRecord`
- `acceptance_steps`:
  - 进入 `测测不激励` 活动，保持 `配置一` / `DOU+币`
  - 从默认 `奖励下发` 子 Tab 自然点击 `剔除明细`
  - 触发 GET `/api/buyin/admin/content_activity/get_dou_plus_coin_remove_record`
  - 命中 BAM mock rule `R-BAM-COIN-REMOVE-DEFAULT`
  - 验证 `奖励下发 / 投放明细 / 剔除明细` 三 Tab、筛选区、表头、首行、分页和旧列禁显
- `verification_process`:
  - 执行 `/delivery:mock` detour，生成并验证 `apiGetDouPlusCoinRemoveRecord` manifest、runtime marker、`script.mjs`、`verify.mjs`、`delivery-mock.md`
  - 使用同一 vmok 页面 reload 后点击 `剔除明细`
  - 采集 `[BAM_MOCK_HIT]`、脱敏目标 request、DOM 表头 / 首行 / 分页、运行态截图
  - 逐项对账 positive_assertion、negative_assertion、visual_assertion、negative_visual_assertion、evidence_required
- `ui_condition_completion`: not_triggered
- `write_interface_gate`: PASS；`patch.status=patched`，`rehydration.status=passed`，`finalVerification.status=passed`，`verify-bam-mock.mjs` 通过
- `fixture_fallback`: not_triggered
- `mock_handling`: effective_verify_mode=MOCK_PREVIEW; ruleId=`R-BAM-COIN-REMOVE-DEFAULT`; apiName=`apiGetDouPlusCoinRemoveRecord`; requestBody=`activity_id=7655304206886322458,config_id=7655304206886338842,page=1,page_num=20`; mockedResponse=`records.length=1,total=40,has_more=true`; detour result=`delivery-mock.md` current scope PASS
- `auto_fix_handling`: N/A
- `final_result`: PASS_WITH_NOTES
- `evidence_summary`: Runtime page-level assertions are closed by redacted DOM / Network / `[BAM_MOCK_HIT]` evidence and local screenshot. Verify does not claim Figma-vs-runtime alignment. Shared rule cases remain open until executed individually.
- `residual_risk`: Design alignment already handled by `/delivery:design`; 2026-07-17 `配置五` MTR found a real non-empty DOU+币剔除明细 first page (`total=6`), so the previous non-empty default-list data gap is closed. Multi-page pagination / interactive sort remain unproven because this sample has only 6 records and `has_more=false`; row-level operator rendering is tracked by `TC-CELL-COIN-FIRST-ROW`.
- `next_step`: continue verify queue with next non-terminal case

#### Runbook Sync（Runbook 同步）

- `case_id`: TC-UI-COIN-REMOVE-PAGE
- `runbook_ref`: verify-logs/browser-verify-runbook.json#TC-UI-COIN-REMOVE-PAGE
- `runbook_status`: updated
- `entry_url`: https://ecop.bytedance.net/alliance-operation-content/content-activity/award?activity_id=7655304206886322458&cjDebugSubApp=alliance-operation-content%3Ahttp%3A%2F%2Flocalhost%3A8083%2Falliance-operation-content&externalLeadsDomainMock=1&cjSiteCode=St12502250000001
- `sample_params`: runtime_state=remove-detail-coin-default; capture_scope=mock-hit; ruleId=R-BAM-COIN-REMOVE-DEFAULT; activity_id=7655304206886322458; config_id=7655304206886338842
- `step_changes`: reloaded vmok page after BAM marker patch; clicked `剔除明细`; captured mock-hit runtime state
- `assertion_changes`: positive assertion expanded with BDD request/render requirements; visual assertion records runtime source only
- `evidence_alignment`: aligned_for_verify_runtime; design_alignment_pending
- `notes`: operator PeopleCard did not expose readable `operator_id` text in this capture; not used to close cell-level case

#### Evidence Reconciliation（证据对账）

##### Assertion（断言）：`positive_assertion`

- `case_id`: TC-UI-COIN-REMOVE-PAGE
- `evidence_requirement_id`: TC-UI-COIN-REMOVE-PAGE__positive_assertion
- `assertion_ref`: positive_assertion
- `verification_status`: EXECUTED
- `execution_ref`: Natural UI reload + click `剔除明细`; `/delivery:mock` detour restored to verify
- `recording_status`: RECORDED
- `evidence_type`: Network+UI/DOM+screenshot
- `coverage_result`: PASS

| `acceptance_item` | `observed_value` | `evidence_ref` | `coverage_result` |
|---|---|---|---|
| 显示奖励下发 | `奖励下发` 子 Tab 可见，未被隐藏 | verify-logs/evidence/TC-UI-COIN-REMOVE-PAGE--mock-hit-runtime.json | PASS |
| 显示投放明细 | `投放明细` 子 Tab 可见，未被隐藏 | verify-logs/evidence/TC-UI-COIN-REMOVE-PAGE--mock-hit-runtime.json | PASS |
| 剔除明细三 Tab且剔除明细 active | `剔除明细` 可见且 class 包含 `auxo-radio-button-wrapper-checked`，computed color 为 `rgb(25, 102, 255)` | verify-logs/evidence/TC-UI-COIN-REMOVE-PAGE--mock-hit-runtime.json | PASS |
| 请求剔除记录接口 | 自然点击后发起 GET `/api/buyin/admin/content_activity/get_dou_plus_coin_remove_record`，query 为 `activity_id=7655304206886322458,config_id=7655304206886338842,page=1,page_num=20` | verify-logs/evidence/TC-UI-COIN-REMOVE-PAGE--mock-hit-runtime.json | PASS |
| 渲染作品维度剔除表 | 表头为 `作品内容 / 剔除发奖原因 / 剔除发奖时间 / 操作人`，首行含 `夏日穿搭短视频示例`、`ID: 100001`、`命中【不激励】规则`、`2026/07/08 18:56:57`，分页项为 `1`,`2` | verify-logs/evidence/TC-UI-COIN-REMOVE-PAGE--mock-hit-runtime.json; screenshots/TC-UI-COIN-REMOVE-PAGE--remove-detail-coin-default--mock-hit.png | PASS |
| BAM runtime mock 命中 | console 输出 `[BAM_MOCK_HIT]`，ruleId=`R-BAM-COIN-REMOVE-DEFAULT`，mockedResponse 含 `records.length=1,total=40,has_more=true` | verify-logs/evidence/TC-UI-COIN-REMOVE-PAGE--mock-hit-runtime.json; mock/apis/apiGetDouPlusCoinRemoveRecord/manifest.json | PASS |

##### Assertion（断言）：`negative_assertion`

- `case_id`: TC-UI-COIN-REMOVE-PAGE
- `evidence_requirement_id`: TC-UI-COIN-REMOVE-PAGE__negative_assertion
- `assertion_ref`: negative_assertion
- `verification_status`: EXECUTED
- `execution_ref`: Natural UI DOM text scan after mock-hit table render
- `recording_status`: RECORDED
- `evidence_type`: UI/DOM+screenshot
- `coverage_result`: PASS

| `acceptance_item` | `observed_value` | `evidence_ref` | `coverage_result` |
|---|---|---|---|
| 不隐藏 legacy Tab | `奖励下发`、`投放明细`、`剔除明细` 均可见 | verify-logs/evidence/TC-UI-COIN-REMOVE-PAGE--mock-hit-runtime.json | PASS |
| 不显示投放金额列 | DOM text 未出现 `投放金额` | verify-logs/evidence/TC-UI-COIN-REMOVE-PAGE--mock-hit-runtime.json | PASS |
| 不显示充值记录列 | DOM text 未出现 `充值记录` | verify-logs/evidence/TC-UI-COIN-REMOVE-PAGE--mock-hit-runtime.json | PASS |

##### Assertion（断言）：`visual_assertion`

- `case_id`: TC-UI-COIN-REMOVE-PAGE
- `evidence_requirement_id`: TC-UI-COIN-REMOVE-PAGE__visual_assertion
- `assertion_ref`: visual_assertion
- `verification_status`: EXECUTED
- `execution_ref`: Runtime DOM order + local screenshot captured after mock-hit render
- `recording_status`: RECORDED
- `evidence_type`: UI/DOM+screenshot
- `coverage_result`: PASS_WITH_NOTES

| `acceptance_item` | `observed_value` | `evidence_ref` | `coverage_result` |
|---|---|---|---|
| 运行态区域顺序为配置摘要 -> SubTab -> filters -> table -> pagination | 截图和 DOM 文本顺序显示：活动/配置摘要在上，随后是 `奖励下发/投放明细/剔除明细`，再是 `作品ID/操作人/查询/重置`，下方为表格和分页 `1/2` | screenshots/TC-UI-COIN-REMOVE-PAGE--remove-detail-coin-default--mock-hit.png; verify-logs/evidence/TC-UI-COIN-REMOVE-PAGE--mock-hit-runtime.json | PASS_WITH_NOTES |
| Figma 对齐结论 | Verify 只提供 runtime source，不声明 Figma-vs-runtime 对齐通过 | screenshots/TC-UI-COIN-REMOVE-PAGE--remove-detail-coin-default--mock-hit.png | PASS_WITH_NOTES |

##### Assertion（断言）：`negative_visual_assertion`

- `case_id`: TC-UI-COIN-REMOVE-PAGE
- `evidence_requirement_id`: TC-UI-COIN-REMOVE-PAGE__negative_visual_assertion
- `assertion_ref`: negative_visual_assertion
- `verification_status`: EXECUTED
- `execution_ref`: Runtime DOM text scan + screenshot after `剔除明细` active
- `recording_status`: RECORDED
- `evidence_type`: UI/DOM+screenshot
- `coverage_result`: PASS

| `acceptance_item` | `observed_value` | `evidence_ref` | `coverage_result` |
|---|---|---|---|
| 不出现旧投放明细表 | 当前表头为剔除明细白名单列，未出现 `投放金额`、`充值记录` | verify-logs/evidence/TC-UI-COIN-REMOVE-PAGE--mock-hit-runtime.json; screenshots/TC-UI-COIN-REMOVE-PAGE--remove-detail-coin-default--mock-hit.png | PASS |
| 不出现跨 Tab 列残留 | 当前 DOU+币剔除明细表未出现投放明细旧列或 DOU+券作者列 | verify-logs/evidence/TC-UI-COIN-REMOVE-PAGE--mock-hit-runtime.json | PASS |

##### Assertion（断言）：`evidence_required`

- `case_id`: TC-UI-COIN-REMOVE-PAGE
- `evidence_requirement_id`: TC-UI-COIN-REMOVE-PAGE__evidence_required
- `assertion_ref`: evidence_required
- `verification_status`: EXECUTED
- `execution_ref`: Evidence materialization check after runtime capture
- `recording_status`: RECORDED
- `evidence_type`: DOM+screenshot+Network+mock-log
- `coverage_result`: PASS

| `acceptance_item` | `observed_value` | `evidence_ref` | `coverage_result` |
|---|---|---|---|
| 证据类型：DOM | DOM facts are persisted with subTab state, headers, first row, pagination and forbidden text absence | verify-logs/evidence/TC-UI-COIN-REMOVE-PAGE--mock-hit-runtime.json | PASS |
| 证据类型：截图 | Runtime screenshot is materialized as a local PNG under workspace `screenshots/` | screenshots/TC-UI-COIN-REMOVE-PAGE--remove-detail-coin-default--mock-hit.png | PASS |
| 证据类型：Network | Target GET method/path/query and XHR initiator are persisted in redacted evidence; raw token-bearing browser network output was not persisted | verify-logs/evidence/TC-UI-COIN-REMOVE-PAGE--mock-hit-runtime.json | PASS |
| 证据类型：Mock hit | `[BAM_MOCK_HIT]` marker, ruleId and mocked response summary are persisted | verify-logs/evidence/TC-UI-COIN-REMOVE-PAGE--mock-hit-runtime.json; mock/apis/apiGetDouPlusCoinRemoveRecord/manifest.json | PASS |
| 证据类型：BAM final audit | Standard BAM mock final verification audit passed | delivery-mock.md; mock/apis/apiGetDouPlusCoinRemoveRecord/manifest.json | PASS |

#### Pending Recheck Items（待复检项）

| `recheck_id` | `status` | `trigger_result` | `recheck_stage` | `target_assertion` | `reason` | `required_persistent_evidence` | `resume_point` | `owner` |
|---|---|---|---|---|---|---|---|---|
| TC-UI-COIN-REMOVE-PAGE__recheck__design_alignment | CLOSED_FIXED_PASS | PASS_WITH_NOTES | /delivery:design | visual_assertion | verify 阶段只保存 runtime source，不声明 Figma-vs-runtime 对齐通过 | `07-design-alignment.md` 已引用 Figma node/screenshot、runtime baseline、closure screenshot `screenshots/TC-UI-COIN-REMOVE-PAGE--design-rerun--remove-detail-coin-default--dom-capture.png`，并完成 Figma-vs-runtime 对比、placeholder rework 复验和 negative scan | TC-UI-COIN-REMOVE-PAGE | design-checker |
| TC-UI-COIN-REMOVE-PAGE__recheck__real_backend | PARTIAL_CLOSED_WITH_NOTES | PASS_WITH_NOTES | real verify | positive_assertion / evidence_required | 2026-07-17 `配置五` 真实默认读返回 `total=6/recordCount=6/has_more=false`，已关闭默认非空列表和 page-level DOM 缺口；多页分页、交互排序和 `has_more=true` 分支仍未覆盖 | `verify-logs/evidence/mtr-real-recheck-config5-20260717.md`; `verify-logs/screenshots/mtr-coin-remove-config5-nonempty-20260717.png` | TC-UI-COIN-REMOVE-PAGE | main-agent |

#### MTR Real Test Result（真实复测追加）

| field | value |
|---|---|
| mtr_run | `2026-07-13 /delivery:verify --mtr` baseline；`2026-07-17` follow-up for `配置五` real non-empty sample |
| real_action | 无 `externalLeadsDomainMock=1` 页面先验证 `配置一` 默认空态；2026-07-17 在用户指定入口切到 `配置五 / DOU+币 / 剔除明细`，自然 UI 点击 `查询` 触发真实 GET。 |
| real_request | `GET /api/buyin/admin/content_activity/get_dou_plus_coin_remove_record?activity_id=7629288371705643310&config_id=7629288371705725230&page=1&page_num=20` |
| real_response | HTTP `200`, `st=0`, `code=0`, `data.total=6`, `data.has_more=false`, `records.length=6` |
| real_dom | `配置五` / DOU+币 / `剔除明细` active；表头 `作品内容 / 剔除发奖时间 / 剔除发奖原因 / 操作人`；6 行真实记录和页码 `1` 可见。 |
| source_mock_evidence_ref | `verify-logs/evidence/TC-UI-COIN-REMOVE-PAGE--mock-hit-runtime.json`（仅历史 mock-preview 证据，不作为 MTR real pass） |
| mtr_evidence_ref | `verify-logs/evidence/mtr-real-recheck-20260713.md#dou币剔除明细默认读取`; `verify-logs/evidence/mtr-real-recheck-config5-20260717.md`; `verify-logs/screenshots/mtr-coin-remove-config5-nonempty-20260717.png` |
| mtr_result | `PASS_WITH_NOTES` |
| remaining_real_gap | 非空默认列表已闭合；仍需真实多页样本或可排序交互样本复验分页、排序和 `has_more=true` 分支。 |
