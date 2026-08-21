# Verification Case Result

### Case: `TC-INT-BATCH-ONE-CLICK-REMOVE`

- `order`: 22
- `verification_stage`: verify
- `priority`: repair
- `contract_ref`: Interaction:一键移除; Region:批量上传 baseline / REPAIR-002
- `source_verify_report`: ../../06-debug-verification.md
- `updated_at`: 2026-07-11T01:13:06+08:00
- `verification_target`: 批量上传复用人工提报命中态一键移除，行为为 local-only，不调用 `apiCandidateRemove`。
- `acceptance_steps`:
  - 批量上传命中态已加载且存在命中/不满足行。
  - 点击 `一键移除`。
  - 期望批量上传命中行本地移除，合法行保留，removed records 被保存用于导出。
  - 期望不出现 `candidate_remove` request，不打开 batch submit modal。
- `verification_process`:
  - EXECUTED：批量上传命中态共用 `ManuallySubmitVideoStore` 的 submit hit 派生状态与 `removeSubmitHitItems`。
  - EXECUTED：manual/batch shared store 与 manually-submit-videos 目录 forbidden scan 无 `apiCandidateRemove` / `candidate_remove` / `R-BAM-CANDIDATE` 命中。
  - EXECUTED：row-level preserve 与 toolbar rendering 均位于共用 form，因此 batch upload path 复用同一 local-only action。
  - EXECUTED：app build PASS。
  - EXECUTED_WITH_NOTES：当前 repair verify 使用 source+build audit；新的 batch natural UI screenshot/no-call Network capture 保留为 recheck。
- `ui_condition_completion`: not_triggered
- `write_interface_gate`: N/A；当前合同禁止批量上传一键移除触发写接口。
- `fixture_fallback`: not_triggered
- `mock_handling`: N/A；`mock_type=NONE`。
- `auto_fix_handling`: N/A
- `final_result`: PASS_WITH_NOTES
- `evidence_summary`: `repair-verify-source-audit-20260711.md` 记录 batch path 复用同一 no-call store/form action；旧 candidate_remove synthetic runtime 不再作为本 case 的 repair 证据。
- `residual_risk`: 未重新采集 batch upload 自然 UI截图和 Network no-call；真实后端不涉及本地移除。
- `next_step`: continue repair verify with `TC-INT-BATCH-EXPORT`

#### Runbook Sync（Runbook 同步）

- `case_id`: TC-INT-BATCH-ONE-CLICK-REMOVE
- `runbook_ref`: verify-logs/browser-verify-runbook.json#TC-INT-BATCH-ONE-CLICK-REMOVE
- `runbook_status`: stale_for_runtime; source_audit_updated
- `entry_url`: N/A in source audit
- `sample_params`: batch-upload hit rows sharing `ManuallySubmitVideoStore`
- `step_changes`: old candidate_remove success/failure path removed from this case; repair path is local-only no-call.
- `assertion_changes`: positive and negative assertions remapped to source/build/no-call audit.
- `evidence_alignment`: partial; source/build aligned, runtime screenshot pending.
- `notes`: Design/runtime screenshot recheck remains open.

#### Evidence Reconciliation（证据对账）

##### Assertion（断言）：`positive_assertion`

- `case_id`: TC-INT-BATCH-ONE-CLICK-REMOVE
- `evidence_requirement_id`: TC-INT-BATCH-ONE-CLICK-REMOVE__positive_assertion
- `assertion_ref`: positive_assertion
- `verification_status`: EXECUTED
- `execution_ref`: source audit of shared `removeSubmitHitItems` path
- `recording_status`: RECORDED
- `evidence_type`: source+command
- `coverage_result`: PASS_WITH_NOTES

| `acceptance_item` | `observed_value` | `evidence_ref` | `coverage_result` |
|---|---|---|---|
| batch hit rows reuse local-only action path | Batch upload uses the same `manuallySubmitVideoStore` and form action; `removeSubmitHitItems` updates local state and preserved records only. | verify-logs/evidence/repair-verify-source-audit-20260711.md | PASS_WITH_NOTES |
| 合法行保留 | Shared filtering keeps rows where `!isHitVideoItem(item)`. | verify-logs/evidence/repair-verify-source-audit-20260711.md | PASS_WITH_NOTES |
| removed records 被保存 | Shared action merges hit rows into `removedSubmitHitItems`, used later by export. | verify-logs/evidence/repair-verify-source-audit-20260711.md | PASS_WITH_NOTES |

##### Assertion（断言）：`negative_assertion`

- `case_id`: TC-INT-BATCH-ONE-CLICK-REMOVE
- `evidence_requirement_id`: TC-INT-BATCH-ONE-CLICK-REMOVE__negative_assertion
- `assertion_ref`: negative_assertion
- `verification_status`: EXECUTED
- `execution_ref`: forbidden scan over shared manual/batch paths
- `recording_status`: RECORDED
- `evidence_type`: command+source
- `coverage_result`: PASS

| `acceptance_item` | `observed_value` | `evidence_ref` | `coverage_result` |
|---|---|---|---|
| 不调用 `apiCandidateRemove` | Shared manual/batch path has no `apiCandidateRemove`, `candidate_remove`, or `R-BAM-CANDIDATE` reference. | verify-logs/evidence/repair-verify-source-audit-20260711.md | PASS |
| 不打开 batch submit modal | One-click remove handler is scoped to local videoItems/row forms and has no submit modal state transition. | verify-logs/evidence/repair-verify-source-audit-20260711.md | PASS_WITH_NOTES |

##### Assertion（断言）：`visual_assertion`

- `case_id`: TC-INT-BATCH-ONE-CLICK-REMOVE
- `evidence_requirement_id`: TC-INT-BATCH-ONE-CLICK-REMOVE__visual_assertion
- `assertion_ref`: visual_assertion
- `verification_status`: EXECUTED
- `execution_ref`: shared form render branch source audit
- `recording_status`: RECORDED
- `evidence_type`: source
- `coverage_result`: PASS_WITH_NOTES

| `acceptance_item` | `observed_value` | `evidence_ref` | `coverage_result` |
|---|---|---|---|
| 按钮位置复用 Task 5 summary action | Batch upload renders through the same manually submit form toolbar and action buttons as manual input. | verify-logs/evidence/repair-verify-source-audit-20260711.md | PASS_WITH_NOTES |

##### Assertion（断言）：`negative_visual_assertion`

- `case_id`: TC-INT-BATCH-ONE-CLICK-REMOVE
- `evidence_requirement_id`: TC-INT-BATCH-ONE-CLICK-REMOVE__negative_visual_assertion
- `assertion_ref`: negative_visual_assertion
- `verification_status`: EXECUTED
- `execution_ref`: source audit
- `recording_status`: RECORDED
- `evidence_type`: source
- `coverage_result`: PASS_WITH_NOTES

| `acceptance_item` | `observed_value` | `evidence_ref` | `coverage_result` |
|---|---|---|---|
| 不出现手动输入专属错误布局、申诉或批量成功假象 | Shared form action branch contains no appeal UI, manual-only error layout, or award-submit success wiring. | verify-logs/evidence/repair-verify-source-audit-20260711.md | PASS_WITH_NOTES |

##### Assertion（断言）：`evidence_required`

- `case_id`: TC-INT-BATCH-ONE-CLICK-REMOVE
- `evidence_requirement_id`: TC-INT-BATCH-ONE-CLICK-REMOVE__evidence_required
- `assertion_ref`: evidence_required
- `verification_status`: EXECUTED
- `execution_ref`: source audit + forbidden scan + build
- `recording_status`: RECORDED
- `evidence_type`: source+command+build-log
- `coverage_result`: PASS_WITH_NOTES

| `acceptance_item` | `observed_value` | `evidence_ref` | `coverage_result` |
|---|---|---|---|
| before/action/after state evidence | Source audit records shared state transition for both manual and batch submit modes. | verify-logs/evidence/repair-verify-source-audit-20260711.md | PASS_WITH_NOTES |
| Network no-call evidence | Forbidden scan proves no candidate_remove caller exists in shared batch/manual remove path. | verify-logs/evidence/repair-verify-source-audit-20260711.md; verify-logs/baseline/repair-verify-build.log | PASS_WITH_NOTES |

#### Pending Recheck Items（待复检项）

| `recheck_id` | `status` | `trigger_result` | `recheck_stage` | `target_assertion` | `reason` | `required_persistent_evidence` | `resume_point` | `owner` |
|---|---|---|---|---|---|---|---|---|
| TC-INT-BATCH-ONE-CLICK-REMOVE__recheck__natural_ui_runtime | OPEN | PASS_WITH_NOTES | /delivery:design or real verify | visual_assertion; evidence_required | 当前 repair replay 未重新采集 batch upload 自然 UI no-call 截图 | batch upload DOM/Network no-call capture and local screenshot showing local removal | TC-INT-BATCH-ONE-CLICK-REMOVE | main-agent |

#### MTR Real Test Result（真实复测追加）

| field | value |
|---|---|
| mtr_run | `2026-07-13 /delivery:verify --mtr` |
| mtr_boundary | `09-test-case-matrix.md#mock--real-boundary` 标记该 case 为 local UI state、无真实后端响应依赖；核心断言是批量上传命中行本地移除和 `candidate_remove` no-call。 |
| real_action | 本轮 MTR 没有重新形成真实批量 sheet 命中态并自然点击 `一键移除`，因此不关闭 `TC-INT-BATCH-ONE-CLICK-REMOVE__recheck__natural_ui_runtime`。 |
| safety_context | 高风险 `candidate_remove` 已在独立写接口 safety 探针中拦截为 `backend_write=not_sent`，但该安全探针不替代本 case 的批量上传自然 UI no-call 证据。 |
| mtr_evidence_ref | `verify-logs/evidence/mtr-real-recheck-20260713.md#high-risk-write-safety-intercept` |
| mtr_result | `MTR_LOCAL_ONLY_RECHECK_NOT_CLOSED` |
| pass_policy | 不因本轮 MTR 缩小范围：该 case 没有后端 real pass 要回收，但 fresh batch DOM/Network no-call 和截图仍保持 OPEN。 |
