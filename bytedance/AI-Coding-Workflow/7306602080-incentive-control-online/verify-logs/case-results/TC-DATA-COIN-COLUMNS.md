# Verification Case Result

### Case: `TC-DATA-COIN-COLUMNS`

- `order`: 7
- `verification_stage`: verify+design
- `priority`: normal
- `contract_ref`: Region:DOU+币剔除明细/表格; list style:DOU+币剔除明细
- `source_verify_report`: ../../06-debug-verification.md
- `updated_at`: 2026-07-17T00:00:00Z
- `verification_target`: DOU+币剔除明细默认列表的表头顺序、列 key/dataIndex、固定列和列白名单
- `acceptance_steps`:
  - DOU+币剔除明细默认请求成功
  - 查看表头、列 key/dataIndex、固定列
  - 期望：仅显示 `作品内容`、`剔除发奖原因`、`剔除发奖时间`、`操作人`
- `verification_process`:
  - 复用 `TC-UI-COIN-REMOVE-PAGE` 的默认列表运行态 source：自然 UI 点击 `剔除明细` 后命中 `R-BAM-COIN-REMOVE-DEFAULT`，request 为 `page=1,page_num=20` 且无筛选字段
  - 回读 `TC-UI-COIN-REMOVE-PAGE--mock-hit-runtime.json` 的 DOM headers、forbidden text absence、local screenshot 和 mock-hit request
  - 新增 `TC-DATA-COIN-COLUMNS--source-evidence.md`，记录 column config 的 title、dataIndex、fixed、renderer 和 `EcopTable` 接线
  - 逐项对账 positive_assertion、negative_assertion、visual_assertion、negative_visual_assertion、evidence_required
- `ui_condition_completion`: not_triggered
- `write_interface_gate`: PASS；复用 `apiGetDouPlusCoinRemoveRecord` / `R-BAM-COIN-REMOVE-DEFAULT` 已通过 `patch.status=patched`、`rehydration.status=passed`、`finalVerification.status=passed`
- `fixture_fallback`: not_triggered
- `mock_handling`: effective_verify_mode=MOCK_PREVIEW; ruleId=`R-BAM-COIN-REMOVE-DEFAULT`; apiName=`apiGetDouPlusCoinRemoveRecord`; requestBody=`activity_id=7655304206886322458,config_id=7655304206886338842,page=1,page_num=20`; mockedResponse=`records.length=1,total=40,has_more=true`; detour result=`delivery-mock.md` PASS
- `auto_fix_handling`: N/A
- `final_result`: PASS_WITH_NOTES
- `evidence_summary`: Runtime table header / forbidden-column assertions are closed by reused mock-preview DOM / screenshot evidence and source evidence. 2026-07-17 `配置五` MTR additionally closed the real non-empty DOU+币 column DOM sample with 6 records and no DOU+券 / old投放列 residue. Verify does not claim Figma-vs-runtime alignment or multi-page sort behavior.
- `residual_risk`: `/delivery:design` has already handled Figma-vs-runtime alignment for IMG5/table style. Real backend verify still needs a multi-page or sortable sample to cover pagination / interactive sort; the previous “non-empty row” column-level data gap is closed by `配置五`.
- `next_step`: continue verify queue with next non-terminal case `TC-CELL-COIN-FIRST-ROW`

#### Runbook Sync（Runbook 同步）

- `case_id`: TC-DATA-COIN-COLUMNS
- `runbook_ref`: verify-logs/browser-verify-runbook.json#TC-DATA-COIN-COLUMNS
- `runbook_status`: updated
- `entry_url`: https://ecop.bytedance.net/alliance-operation-content/content-activity/award?activity_id=7655304206886322458&cjDebugSubApp=alliance-operation-content%3Ahttp%3A%2F%2Flocalhost%3A8083%2Falliance-operation-content&externalLeadsDomainMock=1&cjSiteCode=St12502250000001
- `sample_params`: runtime_state=coin-table-loaded; capture_scope=table header; ruleId=R-BAM-COIN-REMOVE-DEFAULT; activity_id=7655304206886322458; config_id=7655304206886338842
- `step_changes`: reused default-list runtime source captured by `TC-UI-COIN-REMOVE-PAGE`; added source evidence for column config
- `assertion_changes`: positive/negative/visual/evidence_required records aligned to runtime JSON, reused screenshot and source evidence
- `evidence_alignment`: aligned_for_verify_runtime; design_alignment_pending
- `notes`: Reuse is valid only for the default unfiltered DOU+币 remove table. It does not close row-level PeopleCard behavior in `TC-CELL-COIN-FIRST-ROW`.

#### Evidence Reconciliation（证据对账）

##### Assertion（断言）：`positive_assertion`

- `case_id`: TC-DATA-COIN-COLUMNS
- `evidence_requirement_id`: TC-DATA-COIN-COLUMNS__positive_assertion
- `assertion_ref`: positive_assertion
- `verification_status`: EXECUTED
- `execution_ref`: Reused natural UI default-list table state + source column config evidence
- `recording_status`: RECORDED
- `evidence_type`: UI/DOM+screenshot+source
- `coverage_result`: PASS

| `acceptance_item` | `observed_value` | `evidence_ref` | `coverage_result` |
|---|---|---|---|
| 列顺序对齐 plan | Runtime DOM headers are exactly `作品内容 / 剔除发奖原因 / 剔除发奖时间 / 操作人` | verify-logs/evidence/TC-UI-COIN-REMOVE-PAGE--mock-hit-runtime.json; screenshots/TC-UI-COIN-REMOVE-PAGE--remove-detail-coin-default--mock-hit.png | PASS |
| 字段 key/dataIndex 对齐 plan | Source columns use `candidate_ids`, `remove_reason`, `remove_time`, `operator_id`; table receives this `columns` array directly | verify-logs/evidence/TC-DATA-COIN-COLUMNS--source-evidence.md | PASS |
| 固定列 | Source evidence records first column `作品内容` has `fixed='left'` | verify-logs/evidence/TC-DATA-COIN-COLUMNS--source-evidence.md | PASS |

##### Assertion（断言）：`negative_assertion`

- `case_id`: TC-DATA-COIN-COLUMNS
- `evidence_requirement_id`: TC-DATA-COIN-COLUMNS__negative_assertion
- `assertion_ref`: negative_assertion
- `verification_status`: EXECUTED
- `execution_ref`: Runtime header whitelist + source negative column scan
- `recording_status`: RECORDED
- `evidence_type`: UI/DOM+screenshot+source
- `coverage_result`: PASS

| `acceptance_item` | `observed_value` | `evidence_ref` | `coverage_result` |
|---|---|---|---|
| 不出现投放金额 | Runtime DOM records `投放金额` absent; source negative evidence contains no such column | verify-logs/evidence/TC-UI-COIN-REMOVE-PAGE--mock-hit-runtime.json; verify-logs/evidence/TC-DATA-COIN-COLUMNS--source-evidence.md | PASS |
| 不出现投放状态 | Runtime headers whitelist has no `投放状态`; source negative evidence contains no such column | verify-logs/evidence/TC-UI-COIN-REMOVE-PAGE--mock-hit-runtime.json; verify-logs/evidence/TC-DATA-COIN-COLUMNS--source-evidence.md | PASS |
| 不出现充值记录 | Runtime DOM records `充值记录` absent; source negative evidence contains no such column | verify-logs/evidence/TC-UI-COIN-REMOVE-PAGE--mock-hit-runtime.json; verify-logs/evidence/TC-DATA-COIN-COLUMNS--source-evidence.md | PASS |
| 不出现处罚原因列 | Runtime headers whitelist has no `处罚原因`; source negative evidence contains no such column | verify-logs/evidence/TC-UI-COIN-REMOVE-PAGE--mock-hit-runtime.json; verify-logs/evidence/TC-DATA-COIN-COLUMNS--source-evidence.md | PASS |

##### Assertion（断言）：`visual_assertion`

- `case_id`: TC-DATA-COIN-COLUMNS
- `evidence_requirement_id`: TC-DATA-COIN-COLUMNS__visual_assertion
- `assertion_ref`: visual_assertion
- `verification_status`: EXECUTED
- `execution_ref`: Runtime DOM header order + reused local screenshot
- `recording_status`: RECORDED
- `evidence_type`: UI/DOM+screenshot+source
- `coverage_result`: PASS_WITH_NOTES

| `acceptance_item` | `observed_value` | `evidence_ref` | `coverage_result` |
|---|---|---|---|
| 表头顺序与 IMG5 一致的 runtime source | Runtime source shows table header order `作品内容 / 剔除发奖原因 / 剔除发奖时间 / 操作人`; verify records runtime source only and leaves Figma-vs-runtime alignment to `/delivery:design` | verify-logs/evidence/TC-UI-COIN-REMOVE-PAGE--mock-hit-runtime.json; screenshots/TC-UI-COIN-REMOVE-PAGE--remove-detail-coin-default--mock-hit.png | PASS_WITH_NOTES |
| 首列为作品复合信息 | Source first column title is `作品内容`, fixed left, renderer uses cover/title/id; runtime first row contains title and `ID: 100001` | verify-logs/evidence/TC-DATA-COIN-COLUMNS--source-evidence.md; verify-logs/evidence/TC-UI-COIN-REMOVE-PAGE--mock-hit-runtime.json | PASS_WITH_NOTES |

##### Assertion（断言）：`negative_visual_assertion`

- `case_id`: TC-DATA-COIN-COLUMNS
- `evidence_requirement_id`: TC-DATA-COIN-COLUMNS__negative_visual_assertion
- `assertion_ref`: negative_visual_assertion
- `verification_status`: EXECUTED
- `execution_ref`: Runtime header whitelist + source negative column scan
- `recording_status`: RECORDED
- `evidence_type`: UI/DOM+screenshot+source
- `coverage_result`: PASS

| `acceptance_item` | `observed_value` | `evidence_ref` | `coverage_result` |
|---|---|---|---|
| 不出现 DOU+券作者信息列 | Runtime headers whitelist has no `作者信息`; source negative evidence contains no DOU+券 author column in the DOU+币 remove table | verify-logs/evidence/TC-UI-COIN-REMOVE-PAGE--mock-hit-runtime.json; verify-logs/evidence/TC-DATA-COIN-COLUMNS--source-evidence.md | PASS |

##### Assertion（断言）：`evidence_required`

- `case_id`: TC-DATA-COIN-COLUMNS
- `evidence_requirement_id`: TC-DATA-COIN-COLUMNS__evidence_required
- `assertion_ref`: evidence_required
- `verification_status`: EXECUTED
- `execution_ref`: Evidence reuse and materialization check
- `recording_status`: RECORDED
- `evidence_type`: UI/DOM+screenshot+source
- `coverage_result`: PASS_WITH_NOTES

| `acceptance_item` | `observed_value` | `evidence_ref` | `coverage_result` |
|---|---|---|---|
| 证据类型：DOM | Runtime DOM headers, filters, first row and forbidden text absence are persisted in reused default-list evidence | verify-logs/evidence/TC-UI-COIN-REMOVE-PAGE--mock-hit-runtime.json | PASS |
| 证据类型：截图 | Reused runtime screenshot is materialized as a local PNG under workspace `screenshots/` and matches default DOU+币 remove table loaded state | screenshots/TC-UI-COIN-REMOVE-PAGE--remove-detail-coin-default--mock-hit.png | PASS |
| 证据类型：列配置检查 | Source evidence records title/dataIndex/fixed/renderer and negative column scan | verify-logs/evidence/TC-DATA-COIN-COLUMNS--source-evidence.md | PASS |
| 证据复用边界 | Reuse is valid for default unfiltered `R-BAM-COIN-REMOVE-DEFAULT`; it does not close Figma alignment, empty-state branch or row-level PeopleCard behavior | verify-logs/evidence/TC-DATA-COIN-COLUMNS--source-evidence.md; verify-logs/case-results/TC-UI-COIN-REMOVE-PAGE.md | PASS_WITH_NOTES |

#### Pending Recheck Items（待复检项）

| `recheck_id` | `status` | `trigger_result` | `recheck_stage` | `target_assertion` | `reason` | `required_persistent_evidence` | `resume_point` | `owner` |
|---|---|---|---|---|---|---|---|---|
| TC-DATA-COIN-COLUMNS__recheck__design_alignment | CLOSED_FIXED_PASS | PASS_WITH_NOTES | /delivery:design | visual_assertion | verify 阶段只保存 runtime source，不声明 Figma-vs-runtime 对齐通过 | `07-design-alignment.md` 已引用 Figma crop `figma-cache/crops/TC-DATA-COIN-COLUMNS--figma-table-header-wide-crop.png`、closure screenshot `screenshots/TC-DATA-COIN-COLUMNS--design-rerun--coin-table-header.png`、当前 source order 和 DOM header facts，并完成 same-case rework rerun | TC-DATA-COIN-COLUMNS | design-checker |
| TC-DATA-COIN-COLUMNS__recheck__real_backend_empty_sort | PARTIAL_CLOSED_WITH_NOTES | PASS_WITH_NOTES | real verify | evidence_required | 2026-07-13 已闭合真实空态与表头；2026-07-17 `配置五` 已闭合真实非空表头/行 DOM。排序协议、多页分页和 `has_more=true` 分支仍未覆盖 | `verify-logs/evidence/mtr-real-recheck-20260713.md#dou币剔除明细默认读取`; `verify-logs/evidence/mtr-real-recheck-config5-20260717.md`; `verify-logs/screenshots/mtr-coin-remove-config5-nonempty-20260717.png` | TC-DATA-COIN-COLUMNS | main-agent |

#### MTR Real Test Result（真实复测追加）

| field | value |
|---|---|
| mtr_run | `2026-07-13 /delivery:verify --mtr` baseline；`2026-07-17` follow-up for `配置五` real non-empty sample |
| real_action | 无 `externalLeadsDomainMock=1` 页面先切到 `配置一（人工提报）/剔除明细` 验证空态表头；2026-07-17 在 `配置五 / DOU+币 / 剔除明细` 自然 UI 点击 `查询`。 |
| real_dom | `配置一` 空态与 `配置五` 非空态均显示 DOU+币列白名单；`配置五` 表头为 `作品内容 / 剔除发奖时间 / 剔除发奖原因 / 操作人`，未出现 `作者信息`、`投放金额`、`充值记录` 或旧投放列。 |
| real_response | `GET /get_dou_plus_coin_remove_record` 在 `配置五` 返回 HTTP `200`, `st=0/code=0`, `total=6`, `recordCount=6`, `has_more=false`。 |
| mtr_evidence_ref | `verify-logs/evidence/mtr-real-recheck-20260713.md#dou币剔除明细默认读取`; `verify-logs/evidence/mtr-real-recheck-config5-20260717.md`; `verify-logs/screenshots/mtr-coin-remove-config5-nonempty-20260717.png` |
| mtr_result | `PASS_WITH_NOTES` |
| remaining_real_gap | 真实空态、表头和非空行已闭合；排序协议、多页分页和 `has_more=true` 仍需后端样本复验。 |
