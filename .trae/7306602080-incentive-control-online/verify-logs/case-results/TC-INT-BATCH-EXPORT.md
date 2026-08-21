# Verification Case Result

### Case: `TC-INT-BATCH-EXPORT`

- `order`: 23
- `verification_stage`: verify
- `priority`: repair
- `contract_ref`: Interaction:导出剔除明细; Region:批量上传 baseline / REPAIR-003
- `source_verify_report`: ../../06-debug-verification.md
- `updated_at`: 2026-07-11T01:13:06+08:00
- `verification_target`: 批量上传命中态本地移除后，导出只使用 preserved removed records，不导出合法行。
- `acceptance_steps`:
  - 批量上传命中态执行本地移除。
  - 点击 `导出剔除明细`。
  - 期望调用 `apiDownloadContentRemoveRecord` 时 records 只来自批量上传 preserved removed records。
  - 期望不导出可发奖记录，不打开 batch submit modal。
- `verification_process`:
  - EXECUTED：批量上传与手动输入共用 `removedSubmitHitItems`、`removeSubmitHitItems` 和 `exportSubmitHitRecords`。
  - EXECUTED：`exportSubmitHitRecords` 只从 `removedSubmitHitItems` 构建 `ContentRemoveRecord[]`，不读取当前合法行。
  - EXECUTED：app build PASS。
  - EXECUTED_WITH_NOTES：当前 repair verify 使用 source+build audit；fresh batch upload runtime Network/open evidence 保留为 real/design recheck。
- `ui_condition_completion`: not_triggered
- `write_interface_gate`: PASS_WITH_NOTES；`download_content_remove_record` 会生成外部 Feishu 明细资源，真实权限和最终表格字段完整性保留为 real verify。
- `fixture_fallback`: not_triggered
- `mock_handling`: effective_verify_mode=MOCK_PREVIEW; apiName=`apiDownloadContentRemoveRecord`; ruleId=`R-BAM-DOWNLOAD-REMOVE-RECORD`; current evidence is source/build audit, not a fresh runtime mock hit.
- `auto_fix_handling`: N/A
- `final_result`: PASS_WITH_NOTES
- `evidence_summary`: `repair-verify-source-audit-20260711.md` 记录 batch shared export path、removed-record-only source、valid-row exclusion and build PASS。
- `residual_risk`: 未重新采集批量上传自然 UI export payload/open screenshot；真实 Feishu sheet 权限和字段完整性仍需 real verify。
- `next_step`: continue repair verify with `TC-INT-AWARD-SUCCESS-UPLOAD-NO-AWARD-LIST`

#### Runbook Sync（Runbook 同步）

- `case_id`: TC-INT-BATCH-EXPORT
- `runbook_ref`: verify-logs/browser-verify-runbook.json#TC-INT-BATCH-EXPORT
- `runbook_status`: stale_for_runtime; source_audit_updated
- `entry_url`: N/A in source audit
- `sample_params`: batch upload removed-record-only state
- `step_changes`: export current-hit behavior removed; batch export follows preserved records.
- `assertion_changes`: assertions remapped to source/build evidence; runtime payload/open evidence pending.
- `evidence_alignment`: partial
- `notes`: This case does not close real Feishu sheet creation.

#### Evidence Reconciliation（证据对账）

##### Assertion（断言）：`positive_assertion`

- `case_id`: TC-INT-BATCH-EXPORT
- `evidence_requirement_id`: TC-INT-BATCH-EXPORT__positive_assertion
- `assertion_ref`: positive_assertion
- `verification_status`: EXECUTED
- `execution_ref`: source audit of shared export path
- `recording_status`: RECORDED
- `evidence_type`: source+command
- `coverage_result`: PASS_WITH_NOTES

| `acceptance_item` | `observed_value` | `evidence_ref` | `coverage_result` |
|---|---|---|---|
| records 来自批量上传 preserved removed records | Batch upload uses the same `removedSubmitHitItems`; `exportSubmitHitRecords` builds records only from that collection. | verify-logs/evidence/repair-verify-source-audit-20260711.md | PASS_WITH_NOTES |
| 账号ID/视频ID/视频名称/移除原因/处罚原因字段来源 | `buildContentRemoveRecords` maps `author_id`, `item_id`, `item_name`, `remove_reason`, and latest `penalty_reason` from removed rows. | verify-logs/evidence/repair-verify-source-audit-20260711.md | PASS_WITH_NOTES |
| lark_url handling | After successful response, `window.open(larkUrl, '_blank', 'noopener,noreferrer')` and success message execute. | verify-logs/evidence/repair-verify-source-audit-20260711.md | PASS_WITH_NOTES |

##### Assertion（断言）：`negative_assertion`

- `case_id`: TC-INT-BATCH-EXPORT
- `evidence_requirement_id`: TC-INT-BATCH-EXPORT__negative_assertion
- `assertion_ref`: negative_assertion
- `verification_status`: EXECUTED
- `execution_ref`: source audit
- `recording_status`: RECORDED
- `evidence_type`: source
- `coverage_result`: PASS_WITH_NOTES

| `acceptance_item` | `observed_value` | `evidence_ref` | `coverage_result` |
|---|---|---|---|
| 不导出可发奖记录 | Current legal rows remain in `videoItems` after local removal, but export reads only `removedSubmitHitItems`. | verify-logs/evidence/repair-verify-source-audit-20260711.md | PASS_WITH_NOTES |
| 不创建本地文件 | Source path opens returned `lark_url` in a new tab and does not create a local file. | verify-logs/evidence/repair-verify-source-audit-20260711.md | PASS_WITH_NOTES |
| 不打开 batch submit modal | Export handler only calls `exportSubmitHitRecords`; no submit modal setter is invoked. | verify-logs/evidence/repair-verify-source-audit-20260711.md | PASS_WITH_NOTES |

##### Assertion（断言）：`visual_assertion`

- `case_id`: TC-INT-BATCH-EXPORT
- `evidence_requirement_id`: TC-INT-BATCH-EXPORT__visual_assertion
- `assertion_ref`: visual_assertion
- `verification_status`: EXECUTED
- `execution_ref`: source audit
- `recording_status`: RECORDED
- `evidence_type`: source
- `coverage_result`: PASS_WITH_NOTES

| `acceptance_item` | `observed_value` | `evidence_ref` | `coverage_result` |
|---|---|---|---|
| 按钮文案精确且 batch baseline 不变 | Shared form JSX renders `导出剔除明细`; batch upload does not introduce a separate export UI branch. | verify-logs/evidence/repair-verify-source-audit-20260711.md | PASS_WITH_NOTES |

##### Assertion（断言）：`negative_visual_assertion`

- `case_id`: TC-INT-BATCH-EXPORT
- `evidence_requirement_id`: TC-INT-BATCH-EXPORT__negative_visual_assertion
- `assertion_ref`: negative_visual_assertion
- `verification_status`: EXECUTED
- `execution_ref`: source audit
- `recording_status`: RECORDED
- `evidence_type`: source
- `coverage_result`: PASS_WITH_NOTES

| `acceptance_item` | `observed_value` | `evidence_ref` | `coverage_result` |
|---|---|---|---|
| 不出现旧文案、申诉入口或手动输入专属错误布局 | Shared export branch has exact copy `导出剔除明细` and no appeal/manual-only error/modal side effect. | verify-logs/evidence/repair-verify-source-audit-20260711.md | PASS_WITH_NOTES |

##### Assertion（断言）：`evidence_required`

- `case_id`: TC-INT-BATCH-EXPORT
- `evidence_requirement_id`: TC-INT-BATCH-EXPORT__evidence_required
- `assertion_ref`: evidence_required
- `verification_status`: EXECUTED
- `execution_ref`: source audit + build
- `recording_status`: RECORDED
- `evidence_type`: source+build-log
- `coverage_result`: PASS_WITH_NOTES

| `acceptance_item` | `observed_value` | `evidence_ref` | `coverage_result` |
|---|---|---|---|
| Network/open evidence | Not freshly captured in repair verify; source audit proves download wrapper call source and open behavior. | verify-logs/evidence/repair-verify-source-audit-20260711.md | PASS_WITH_NOTES |
| Build | Repair verify build exited 0. | verify-logs/baseline/repair-verify-build.log | PASS |

#### Pending Recheck Items（待复检项）

| `recheck_id` | `status` | `trigger_result` | `recheck_stage` | `target_assertion` | `reason` | `required_persistent_evidence` | `resume_point` | `owner` |
|---|---|---|---|---|---|---|---|---|
| TC-INT-BATCH-EXPORT__recheck__natural_ui_runtime | OPEN | PASS_WITH_NOTES | /delivery:design or real verify | evidence_required | 当前 repair replay 未重新采集 batch export Network/open evidence | batch upload export payload with removed records only; valid-row exclusion; opened lark_url; local screenshot | TC-INT-BATCH-EXPORT | main-agent |
| TC-INT-BATCH-EXPORT__recheck__real_export_sheet_output | OPEN | PASS_WITH_NOTES | real verify | positive_assertion | 输入 sheet 解析前置已由 2026-07-13 12:04 MTR 自然 UI 关闭；真实导出表格生成属于 `download_content_remove_record` 写接口副作用，因安全拦截未真实写入，只能作为 non-blocking `remaining_real_gap` | authorized real `download_content_remove_record` response and opened generated sheet field verification, or explicit backend audit evidence | real integration verify after authorized write test data is available | main-agent/integration |

#### MTR Real Test Result（真实复测追加）

| field | value |
|---|---|
| mtr_run | `2026-07-13 /delivery:verify --mtr` |
| real_action | 针对 `download_content_remove_record` 执行浏览器层安全拦截探针。 |
| safety_evidence | `POST /api/buyin/admin/content_activity/download_content_remove_record` 被拦截，`safety_intercept=true`, `backend_write=not_sent`, local status `499`。 |
| mtr_evidence_ref | `verify-logs/evidence/mtr-real-recheck-20260713.md#high-risk-write-safety-intercept` |
| mtr_result | `PASS_WITH_NOTES` |
| remaining_real_gap | 安全策略导致未真实写入，不证明真实 Feishu 表格生成、权限或字段完整性；该 gap 为 non-blocking note，不阻塞继续交付，也不允许宣称真实导出已通过。 |

#### MTR Batch Sheet Precondition Retest 2026-07-13 11:34-11:35

| field | value |
|---|---|
| real_action | 为 batch export 的真实前置 sheet 解析链路复测 `get_delivery_items_from_sheet`；先在 no-mock award page 直接探测一次，再 reload 同一 no-mock URL 并等待业务 tabs 后再探测一次。 |
| request | `GET /api/buyin/admin/content_activity/get_delivery_items_from_sheet?sheet_url=https%3A%2F%2Fbytedance.larkoffice.com%2Fsheets%2Fbatch-hit-7306602080&activity_id=7653282555822653742&config_id=7653282555822735662` |
| real_response | 两次 HTTP `200`，业务 JSON 均为 `st=95271007`, `code=95271007`, `msg=页面长时间未操作已自动断开连接，请刷新后重试~`, `data=null`, `total=0`。 |
| mtr_evidence_ref | `verify-logs/evidence/mtr-real-recheck-20260713.md#batch-sheet-retest-2026-07-13-1134-1135` |
| mtr_result | `OPEN_ENV_ISSUE` for sheet precondition; export write safety remains `PASS_WITH_NOTES` due browser intercept. |
| remaining_real_gap | 真实 sheet 权限、字段解析、rows 返回和真实导出生成均未证明；sheet precondition 是环境缺口，导出写接口副作用是 safety intercept 的 non-blocking note。 |

#### MTR Batch Sheet Precondition Retest 2026-07-13 11:53

| field | value |
|---|---|
| real_action | 在 freshly navigated no-mock award page 上分别使用历史 batch 参数与当前 MTR 页面参数探测 `get_delivery_items_from_sheet`。 |
| request_1 | historical batch params: `sheet_url=https://bytedance.larkoffice.com/sheets/batch-hit-7306602080`, `activity_id=7653282555822653742`, `config_id=7653282555822735662`。 |
| request_2 | current page params: `sheet_url=https://bytedance.larkoffice.com/sheets/batch-hit-7306602080`, `activity_id=7629288371705643310`, `config_id=7629288371705659694`。 |
| real_response | 两次 HTTP `200`，业务 JSON 均为 `st=95271007`, `code=95271007`, `msg=页面长时间未操作已自动断开连接，请刷新后重试~`, `data=null`, `total=0`。 |
| mtr_evidence_ref | `verify-logs/evidence/mtr-real-recheck-20260713.md#batch-sheet-retest-2026-07-13-1153` |
| mtr_result | `OPEN_ENV_ISSUE` for sheet precondition; export write safety remains `PASS_WITH_NOTES` due browser intercept. |
| remaining_real_gap | 真实 sheet 权限、字段解析、rows 返回和真实导出生成均未证明；sheet precondition 是环境缺口，导出写接口副作用是 safety intercept 的 non-blocking note。 |

#### MTR Batch Sheet Precondition Natural UI Retest 2026-07-13 12:02-12:04

| field | value |
|---|---|
| real_action | 对 batch export 的真实前置 sheet 解析链路改走自然 UI：`批量上传` -> 页面 token XHR `get_delivery_items_from_sheet` -> DOM rows。未点击 `导出移除明细`，未触发真实导出写接口。 |
| direct_probe_result | online subapp 与 local debug subapp 上，历史 batch 参数和当前 activity/config 参数 direct probe 均仍返回 `st/code=95271007`, `data=null`；这些 direct probe 仍不能作为 real pass。 |
| natural_ui_response | HTTP `200`; response starts with `st=0`, `code=0`, `msg=""`, `data.item_info=[...]`, log_id `2026071320043290E396E75EBBF17ED266`。 |
| dom_evidence | Summary `共3个作品，其中不满足准入门槛或命中【不激励】规则的作品数为：3个`; `导出移除明细` button visible; 3 rows rendered with `不满足发奖条件` labels. |
| mtr_evidence_ref | `verify-logs/evidence/mtr-real-recheck-20260713.md#batch-sheet-natural-ui-retest-2026-07-13-1202-1204` |
| mtr_result | `PASS_WITH_NOTES` for sheet precondition; export write safety remains `PASS_WITH_NOTES` due browser intercept. |
| remaining_real_gap | Sheet precondition is closed by natural UI real evidence. 真实导出文件生成、权限和字段完整性仍因导出写接口安全拦截未证明，作为 non-blocking `remaining_real_gap`，不阻塞继续交付。 |
