# Verification Case Result

### Case: `TC-INT-MANUAL-EXPORT`

- `order`: 19
- `verification_stage`: verify
- `priority`: repair
- `contract_ref`: Interaction:导出剔除明细 / REPAIR-003
- `source_verify_report`: ../../06-debug-verification.md
- `updated_at`: 2026-07-11T01:13:06+08:00
- `verification_target`: 移除前 preserved removed records 为空时，导出只提示且不调用 `download_content_remove_record`。
- `acceptance_steps`:
  - 手动命中态存在待剔除记录但尚未点击一键/行级移除。
  - 点击 `导出剔除明细`。
  - 期望提示 `暂无可导出的剔除明细`，不调用 `apiDownloadContentRemoveRecord`。
- `verification_process`:
  - EXECUTED：读取 `exportSubmitHitRecords`，确认其数据源只来自 `this.removedSubmitHitItems`。
  - EXECUTED：确认 `removedSubmitHitItems.length === 0` 时函数先 warning 并 return false，早于 `buildContentRemoveRecords` 与 `apiDownloadContentRemoveRecord`。
  - EXECUTED：app build PASS，说明 repair 后导出 guard 与调用链可编译。
  - EXECUTED_WITH_NOTES：本轮使用 source+build audit 关闭 pre-removal no-call guard；真实 UI toast/Network 面板截图保留为复检项。
- `ui_condition_completion`: not_triggered
- `write_interface_gate`: N/A for pre-removal guard；该路径不得触发下载接口。
- `fixture_fallback`: not_triggered
- `mock_handling`: N/A；pre-removal guard 不需要 download mock。
- `auto_fix_handling`: N/A
- `final_result`: PASS_WITH_NOTES
- `evidence_summary`: source audit 证明导出前置条件改为 preserved removed records，移除前不会直接导出当前命中行，也不会触发 download wrapper。
- `residual_risk`: 未重新采集自然 UI toast 与 Network no-call 截图；真实 Feishu 表格生成不属于本 guard case。
- `next_step`: repair verify 继续到 `TC-INT-MANUAL-EXPORT-PERSIST-AFTER-REMOVE`

#### Runbook Sync（Runbook 同步）

- `case_id`: TC-INT-MANUAL-EXPORT
- `runbook_ref`: verify-logs/browser-verify-runbook.json#TC-INT-MANUAL-EXPORT
- `runbook_status`: stale_for_runtime; source_audit_updated
- `entry_url`: N/A in source audit
- `sample_params`: manual hit state before any removal; `removedSubmitHitItems=[]`
- `step_changes`: old behavior exported current hit rows; repair behavior warns before any removal.
- `assertion_changes`: request/open assertions moved to `TC-INT-MANUAL-EXPORT-PERSIST-AFTER-REMOVE`; this case closes guard/no-call only.
- `evidence_alignment`: partial; source/build aligned, runtime toast/network capture pending.
- `notes`: `R-BAM-DOWNLOAD-REMOVE-RECORD` applies after preserved removed records exist, not to this pre-removal guard.

#### Evidence Reconciliation（证据对账）

##### Assertion（断言）：`positive_assertion`

- `case_id`: TC-INT-MANUAL-EXPORT
- `evidence_requirement_id`: TC-INT-MANUAL-EXPORT__positive_assertion
- `assertion_ref`: positive_assertion
- `verification_status`: EXECUTED
- `execution_ref`: source audit of `exportSubmitHitRecords`
- `recording_status`: RECORDED
- `evidence_type`: source+command
- `coverage_result`: PASS_WITH_NOTES

| `acceptance_item` | `observed_value` | `evidence_ref` | `coverage_result` |
|---|---|---|---|
| 只有 preserved removed records 可作为导出数据源 | `exportSubmitHitRecords` reads `const removedItems = this.fillIfDeliveryTrue(this.removedSubmitHitItems)` and never reads current hit rows. | verify-logs/evidence/repair-verify-source-audit-20260711.md | PASS_WITH_NOTES |
| 移除前提示暂无可导出明细 | When `removedItems.length === 0`, the method calls `message.warning('暂无可导出的剔除明细')` and returns false. | verify-logs/evidence/repair-verify-source-audit-20260711.md | PASS_WITH_NOTES |

##### Assertion（断言）：`negative_assertion`

- `case_id`: TC-INT-MANUAL-EXPORT
- `evidence_requirement_id`: TC-INT-MANUAL-EXPORT__negative_assertion
- `assertion_ref`: negative_assertion
- `verification_status`: EXECUTED
- `execution_ref`: source audit of early return before download wrapper
- `recording_status`: RECORDED
- `evidence_type`: source
- `coverage_result`: PASS_WITH_NOTES

| `acceptance_item` | `observed_value` | `evidence_ref` | `coverage_result` |
|---|---|---|---|
| 不把当前命中/准入失败行直接导出 | Current hit rows are not used by `exportSubmitHitRecords`; pre-removal `removedSubmitHitItems` is empty and returns before record building. | verify-logs/evidence/repair-verify-source-audit-20260711.md | PASS_WITH_NOTES |
| 不调用下载接口 | `apiDownloadContentRemoveRecord({ records })` is below the empty-removed-items guard and unreachable before removal. | verify-logs/evidence/repair-verify-source-audit-20260711.md | PASS_WITH_NOTES |

##### Assertion（断言）：`visual_assertion`

- `case_id`: TC-INT-MANUAL-EXPORT
- `evidence_requirement_id`: TC-INT-MANUAL-EXPORT__visual_assertion
- `assertion_ref`: visual_assertion
- `verification_status`: EXECUTED
- `execution_ref`: source audit of button copy
- `recording_status`: RECORDED
- `evidence_type`: source
- `coverage_result`: PASS_WITH_NOTES

| `acceptance_item` | `observed_value` | `evidence_ref` | `coverage_result` |
|---|---|---|---|
| 按钮文案为导出剔除明细 | Form JSX renders `<Button ...>导出剔除明细</Button>`. | verify-logs/evidence/repair-verify-source-audit-20260711.md | PASS_WITH_NOTES |

##### Assertion（断言）：`negative_visual_assertion`

- `case_id`: TC-INT-MANUAL-EXPORT
- `evidence_requirement_id`: TC-INT-MANUAL-EXPORT__negative_visual_assertion
- `assertion_ref`: negative_visual_assertion
- `verification_status`: EXECUTED
- `execution_ref`: source audit
- `recording_status`: RECORDED
- `evidence_type`: source
- `coverage_result`: PASS_WITH_NOTES

| `acceptance_item` | `observed_value` | `evidence_ref` | `coverage_result` |
|---|---|---|---|
| 不出现旧文案或申诉入口 | Repair touched export action renders only `导出剔除明细`; source audit found no appeal/export-old-copy wiring in this path. | verify-logs/evidence/repair-verify-source-audit-20260711.md | PASS_WITH_NOTES |

##### Assertion（断言）：`evidence_required`

- `case_id`: TC-INT-MANUAL-EXPORT
- `evidence_requirement_id`: TC-INT-MANUAL-EXPORT__evidence_required
- `assertion_ref`: evidence_required
- `verification_status`: EXECUTED
- `execution_ref`: source audit + build
- `recording_status`: RECORDED
- `evidence_type`: source+build-log
- `coverage_result`: PASS_WITH_NOTES

| `acceptance_item` | `observed_value` | `evidence_ref` | `coverage_result` |
|---|---|---|---|
| before/action/after no-call evidence | Source audit records before state `removedSubmitHitItems=[]`, action path early return, and no download call. | verify-logs/evidence/repair-verify-source-audit-20260711.md | PASS_WITH_NOTES |
| build evidence | Repair verify build exited 0. | verify-logs/baseline/repair-verify-build.log | PASS |

#### Pending Recheck Items（待复检项）

| `recheck_id` | `status` | `trigger_result` | `recheck_stage` | `target_assertion` | `reason` | `required_persistent_evidence` | `resume_point` | `owner` |
|---|---|---|---|---|---|---|---|---|
| TC-INT-MANUAL-EXPORT__recheck__natural_ui_guard | OPEN | PASS_WITH_NOTES | /delivery:design or real verify | evidence_required | 当前 repair replay 未重新采集自然 UI toast 与 Network no-call | DOM/toast capture showing `暂无可导出的剔除明细`; Network capture with no `download_content_remove_record` request | TC-INT-MANUAL-EXPORT | main-agent |

#### MTR Real Test Result（真实复测追加）

| field | value |
|---|---|
| mtr_run | `2026-07-13 /delivery:verify --mtr` |
| real_action | 该 case 的真实边界是导出前置 guard no-call；本轮未重新形成真实人工提报命中态，因此未自然点击此 guard。 |
| related_safety_probe | 危险导出写接口 `download_content_remove_record` 在独立 safety 探针中被浏览器层拦截，`backend_write=not_sent`。 |
| mtr_evidence_ref | `verify-logs/evidence/mtr-real-recheck-20260713.md#high-risk-write-safety-intercept` |
| mtr_result | `OPEN_ENV_ISSUE / SAFETY_BOUNDARY_RECORDED` |
| remaining_real_gap | 需真实人工提报命中态下自然点击导出前 guard，证明 no-call toast；真实导出由 `TC-INT-MANUAL-EXPORT-PERSIST-AFTER-REMOVE` 继续回收。 |
