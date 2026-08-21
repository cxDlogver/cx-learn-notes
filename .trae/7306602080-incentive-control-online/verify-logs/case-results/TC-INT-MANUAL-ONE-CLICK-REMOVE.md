# Verification Case Result

### Case: `TC-INT-MANUAL-ONE-CLICK-REMOVE`

- `order`: 18
- `verification_stage`: verify
- `priority`: repair
- `contract_ref`: Interaction:一键移除 / REPAIR-002
- `source_verify_report`: ../../06-debug-verification.md
- `updated_at`: 2026-07-11T01:13:06+08:00
- `verification_target`: 人工提报一键移除为 frontend-local，不调用 `apiCandidateRemove`，并保存 removed records 供导出。
- `acceptance_steps`:
  - 构造手动输入命中态。
  - 点击 `一键移除`。
  - 期望命中/不满足行从前端列表本地移除，合法行保留，`removedSubmitHitItems` 写入被移除行。
  - 期望 Network 不出现 `candidate_remove`，不打开 batch submit modal。
- `verification_process`:
  - EXECUTED：读取 repair 后业务代码，确认 `manuallySubmitVideoStore.ts` 不导入 `apiCandidateRemove`，`removeSubmitHitItems` 只更新 MobX 本地状态。
  - EXECUTED：执行 forbidden scan，manual submit store 与 manually-submit-videos 目录均无 `apiCandidateRemove` / `candidate_remove` / `R-BAM-CANDIDATE` 命中。
  - EXECUTED：执行 app build，`pnpm_config_verify_deps_before_run=false pnpm --dir apps/alliance-operation-content build` PASS。
  - EXECUTED_WITH_NOTES：本轮 repair verify 使用 source+build audit 关闭代码路径和 no-call 断言；新的自然 UI 截图与真实后端复检保留为 notes。
- `ui_condition_completion`: not_triggered
- `write_interface_gate`: N/A；当前合同禁止人工提报一键移除触发写接口。
- `fixture_fallback`: not_triggered
- `mock_handling`: N/A；`mock_type=NONE`，不需要 `apiCandidateRemove` mock。
- `auto_fix_handling`: N/A
- `final_result`: PASS_WITH_NOTES
- `evidence_summary`: `repair-verify-source-audit-20260711.md` 记录 no-call scan、local-only store update、preserved removed records 与 build PASS；旧 candidate_remove synthetic evidence 已作废，不再用于本 repair case closure。
- `residual_risk`: 尚未在当前 repair replay 中重新采集自然 UI before/action/after 截图；真实后端不涉及人工提报一键移除。
- `next_step`: repair verify 继续到 `TC-INT-MANUAL-EXPORT`

#### Runbook Sync（Runbook 同步）

- `case_id`: TC-INT-MANUAL-ONE-CLICK-REMOVE
- `runbook_ref`: verify-logs/browser-verify-runbook.json#TC-INT-MANUAL-ONE-CLICK-REMOVE
- `runbook_status`: stale_for_runtime; source_audit_updated
- `entry_url`: N/A in source audit
- `sample_params`: manual submit hit rows with mixed `if_satisfy_delivery_rules=false` / `if_not_incentive=true`
- `step_changes`: old candidate_remove success/failure path removed from this case; repair path is local-only no-call.
- `assertion_changes`: positive and negative assertions remapped to source/build/no-call audit.
- `evidence_alignment`: partial; source/build aligned, runtime screenshot pending.
- `notes`: natural UI replay remains a non-blocking recheck for design/accept evidence quality.

#### Evidence Reconciliation（证据对账）

##### Assertion（断言）：`positive_assertion`

- `case_id`: TC-INT-MANUAL-ONE-CLICK-REMOVE
- `evidence_requirement_id`: TC-INT-MANUAL-ONE-CLICK-REMOVE__positive_assertion
- `assertion_ref`: positive_assertion
- `verification_status`: EXECUTED
- `execution_ref`: source audit of `removeSubmitHitItems`
- `recording_status`: RECORDED
- `evidence_type`: source+command
- `coverage_result`: PASS_WITH_NOTES

| `acceptance_item` | `observed_value` | `evidence_ref` | `coverage_result` |
|---|---|---|---|
| 命中/不满足行本地移除 | `removeSubmitHitItems` merges hit rows into `removedSubmitHitItems` and filters hit rows out of `videoItems` inside `runInAction`; no backend call exists in the method. | verify-logs/evidence/repair-verify-source-audit-20260711.md | PASS_WITH_NOTES |
| 合法行保留 | `videoItems` is assigned from `latestItems.filter((item) => !this.isHitVideoItem(item))`, so non-hit rows remain. | verify-logs/evidence/repair-verify-source-audit-20260711.md | PASS_WITH_NOTES |
| removed records 被保存 | `removedSubmitHitItems = mergeRemovedSubmitHitItems(removedSubmitHitItems, hitItems)` executes before list filtering. | verify-logs/evidence/repair-verify-source-audit-20260711.md | PASS_WITH_NOTES |

##### Assertion（断言）：`negative_assertion`

- `case_id`: TC-INT-MANUAL-ONE-CLICK-REMOVE
- `evidence_requirement_id`: TC-INT-MANUAL-ONE-CLICK-REMOVE__negative_assertion
- `assertion_ref`: negative_assertion
- `verification_status`: EXECUTED
- `execution_ref`: forbidden scan over manual submit store/form/drawer paths
- `recording_status`: RECORDED
- `evidence_type`: command+source
- `coverage_result`: PASS

| `acceptance_item` | `observed_value` | `evidence_ref` | `coverage_result` |
|---|---|---|---|
| 不调用 `apiCandidateRemove` | `rg` over `manuallySubmitVideoStore.ts` and `components/manually-submit-videos` returned no `apiCandidateRemove`, `candidate_remove`, or `R-BAM-CANDIDATE` matches. | verify-logs/evidence/repair-verify-source-audit-20260711.md | PASS |
| 不打开 batch submit modal | Manual one-click handler only awaits `removeSubmitHitItems` and deletes row forms; it does not call submit modal state setters. | verify-logs/evidence/repair-verify-source-audit-20260711.md | PASS_WITH_NOTES |

##### Assertion（断言）：`visual_assertion`

- `case_id`: TC-INT-MANUAL-ONE-CLICK-REMOVE
- `evidence_requirement_id`: TC-INT-MANUAL-ONE-CLICK-REMOVE__visual_assertion
- `assertion_ref`: visual_assertion
- `verification_status`: EXECUTED
- `execution_ref`: source audit of toolbar rendering branch
- `recording_status`: RECORDED
- `evidence_type`: source
- `coverage_result`: PASS_WITH_NOTES

| `acceptance_item` | `observed_value` | `evidence_ref` | `coverage_result` |
|---|---|---|---|
| 一键移除按钮只在当前命中行存在时展示 | Form JSX renders `一键移除` only under `hasSubmitHitItems`; after local removal it disappears while export can remain. | verify-logs/evidence/repair-verify-source-audit-20260711.md | PASS_WITH_NOTES |

##### Assertion（断言）：`negative_visual_assertion`

- `case_id`: TC-INT-MANUAL-ONE-CLICK-REMOVE
- `evidence_requirement_id`: TC-INT-MANUAL-ONE-CLICK-REMOVE__negative_visual_assertion
- `assertion_ref`: negative_visual_assertion
- `verification_status`: EXECUTED
- `execution_ref`: source audit
- `recording_status`: RECORDED
- `evidence_type`: source
- `coverage_result`: PASS_WITH_NOTES

| `acceptance_item` | `observed_value` | `evidence_ref` | `coverage_result` |
|---|---|---|---|
| 不出现申诉或批量成功假象 | Repair touched one-click code path has no appeal UI, award submit modal, or success flow wiring. | verify-logs/evidence/repair-verify-source-audit-20260711.md | PASS_WITH_NOTES |

##### Assertion（断言）：`evidence_required`

- `case_id`: TC-INT-MANUAL-ONE-CLICK-REMOVE
- `evidence_requirement_id`: TC-INT-MANUAL-ONE-CLICK-REMOVE__evidence_required
- `assertion_ref`: evidence_required
- `verification_status`: EXECUTED
- `execution_ref`: source audit + build + forbidden scan
- `recording_status`: RECORDED
- `evidence_type`: source+command+build-log
- `coverage_result`: PASS_WITH_NOTES

| `acceptance_item` | `observed_value` | `evidence_ref` | `coverage_result` |
|---|---|---|---|
| before/action/after state evidence | Source audit records pre/post state transition: hit rows are copied to `removedSubmitHitItems`, then filtered from `videoItems`. | verify-logs/evidence/repair-verify-source-audit-20260711.md | PASS_WITH_NOTES |
| Network no-call evidence | Forbidden scan proves the manual path has no candidate_remove caller; build verifies compiled path remains valid. | verify-logs/evidence/repair-verify-source-audit-20260711.md; verify-logs/baseline/repair-verify-build.log | PASS_WITH_NOTES |

#### Pending Recheck Items（待复检项）

| `recheck_id` | `status` | `trigger_result` | `recheck_stage` | `target_assertion` | `reason` | `required_persistent_evidence` | `resume_point` | `owner` |
|---|---|---|---|---|---|---|---|---|
| TC-INT-MANUAL-ONE-CLICK-REMOVE__recheck__natural_ui_runtime | OPEN | PASS_WITH_NOTES | /delivery:design or real verify | visual_assertion; evidence_required | 当前 repair replay 未重新采集自然 UI before/action/after 截图 | runtime DOM/Network no-call capture and local screenshot showing local removal | TC-INT-MANUAL-ONE-CLICK-REMOVE | main-agent |

#### MTR Real Test Result（真实复测追加）

| field | value |
|---|---|
| mtr_run | `2026-07-13 /delivery:verify --mtr` |
| mtr_boundary | `09-test-case-matrix.md#mock--real-boundary` 标记该 case 为 local UI state、无真实后端响应依赖；核心断言是本地移除和 `candidate_remove` no-call。 |
| real_action | 本轮 MTR 没有重新形成真实人工命中态并自然点击 `一键移除`，因此不关闭 `TC-INT-MANUAL-ONE-CLICK-REMOVE__recheck__natural_ui_runtime`。 |
| safety_context | 高风险 `candidate_remove` 已在独立写接口 safety 探针中拦截为 `backend_write=not_sent`，但该安全探针不替代本 case 的自然 UI no-call 证据。 |
| mtr_evidence_ref | `verify-logs/evidence/mtr-real-recheck-20260713.md#high-risk-write-safety-intercept` |
| mtr_result | `MTR_LOCAL_ONLY_RECHECK_NOT_CLOSED` |
| pass_policy | 不因本轮 MTR 缩小范围：该 case 没有后端 real pass 要回收，但 fresh 自然 UI before/action/after、DOM/Network no-call 和截图仍保持 OPEN。 |
