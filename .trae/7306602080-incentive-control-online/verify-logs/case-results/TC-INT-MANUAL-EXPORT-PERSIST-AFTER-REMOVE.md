# Verification Case Result

### Case: `TC-INT-MANUAL-EXPORT-PERSIST-AFTER-REMOVE`

- `order`: 19.1
- `verification_stage`: verify+design
- `priority`: repair
- `contract_ref`: Interaction:导出剔除明细; REPAIR-005
- `source_verify_report`: ../../06-debug-verification.md
- `updated_at`: 2026-07-11T05:03:25+08:00
- `verification_target`: 一键移除后导出入口仍可见，重复导出使用 preserved removed records。
- `acceptance_steps`:
  - 手动命中态点击 `一键移除`。
  - 当前列表命中行消失但 `removedSubmitHitItems` 非空。
  - 连续点击 `导出剔除明细` 两次。
  - 期望两次都基于相同 preserved removed records 调用 `apiDownloadContentRemoveRecord` 并处理 `lark_url`。
- `verification_process`:
  - EXECUTED：source audit 确认 `shouldShowSubmitHitToolbar = hasSubmitHitItems || hasRemovedSubmitHitRecords`。
  - EXECUTED：source audit 确认 summary 和 action toolbar 在 removed-record-only 状态仍展示，`一键移除` 保留但 `disabled={!hasSubmitHitItems}`，`导出剔除明细` 无 `hasSubmitHitItems` 条件包裹。
  - EXECUTED：source audit 确认 `exportSubmitHitRecords` 每次都从 `removedSubmitHitItems` 构建 records，不消费或清空该集合。
  - EXECUTED：自然 UI 在 `activity_id=7629288371705643310` 中提交 `100001,100002,100003`，移除前 summary 为 `共3个作品...2个`，`一键移除` 和 `导出剔除明细` 均可见可点。
  - EXECUTED：点击 `一键移除` 后 runtime DOM 显示 summary `共1个作品...0个`，`一键移除` visible disabled，`导出剔除明细` visible enabled，`100001/100002` 消失且 `100003` 保留。
  - EXECUTED：移除后截图已保存为 `screenshots/TC-INT-MANUAL-EXPORT-PERSIST-AFTER-REMOVE--after-remove-toolbar--drawer.png`，文件校验为 PNG `2022 x 1222`。
  - EXECUTED_WITH_NOTES：连续多次点击 `导出剔除明细` 均打开 synthetic `lark_url=https://bytedance.larkoffice.com/sheets/mock_content_remove_record_7306602080`；MOCK_PREVIEW 下 generated BAM wrapper 可在真实 XHR 前返回 synthetic contract，因此 Network 证据记录为 BAM synthetic request/response artifact，而不宣称真实 Feishu 表格联调通过。
  - EXECUTED：app build PASS。
  - EXECUTED_WITH_NOTES：当前 repair verify 关闭 REPAIR-005 runtime UI 可见性、禁用态、重复导出入口和 preserved-record synthetic contract；真实 Feishu 表格权限/字段完整性保留为 real verify recheck。
- `ui_condition_completion`: not_triggered
- `write_interface_gate`: PASS_WITH_NOTES；移除后的导出调用 `apiDownloadContentRemoveRecord`，真实 Feishu 表格权限保留为 real verify。
- `fixture_fallback`: not_triggered
- `mock_handling`: effective_verify_mode=MOCK_PREVIEW; apiName=`apiDownloadContentRemoveRecord`; ruleId=`R-BAM-DOWNLOAD-REMOVE-RECORD`; runtime repeated export opened the synthetic `lark_url`; Network panel did not retain a real export XHR because the generated wrapper may return `BAM_MOCK_SYNTHETIC_CONTRACT` before sending fetch/XHR, so request/response proof uses persisted BAM synthetic artifacts.
- `auto_fix_handling`: N/A
- `final_result`: PASS_WITH_NOTES
- `evidence_summary`: runtime DOM/screenshot records post-removal summary/action persistence; source audit records disabled `一键移除`, removed-record-only export source, repeated-call stability, no candidate_remove boundary, synthetic request contract, and build PASS.
- `residual_risk`: 真实 Feishu 表格生成、权限和字段完整性仍需 real verify；当前 synthetic `lark_url` 打开到 `Docs - Page not found` 不代表真实表格可访问。
- `next_step`: repair verify can proceed to design replay with the captured runtime screenshot as reusable source.

#### Runbook Sync（Runbook 同步）

- `case_id`: TC-INT-MANUAL-EXPORT-PERSIST-AFTER-REMOVE
- `runbook_ref`: verify-logs/browser-verify-runbook.json#TC-INT-MANUAL-EXPORT-PERSIST-AFTER-REMOVE
- `runbook_status`: runtime_captured_with_mock_preview_boundary
- `entry_url`: `https://ecop.bytedance.net/alliance-operation-content/content-activity/award?activity_id=7629288371705643310&cjDebugSubApp=alliance-operation-content%3Ahttp%3A%2F%2Flocalhost%3A8083%2Falliance-operation-content&externalLeadsDomainMock=1&cjSiteCode=St12502250000001`
- `sample_params`: manual input `100001,100002,100003`; removed-record-only state after local one-click remove
- `step_changes`: new repair regression case added after task replay.
- `assertion_changes`: REPAIR-005 assertions now include visible summary, visible disabled `一键移除`, enabled repeated export, preserved records, and no collapsed toolbar.
- `evidence_alignment`: runtime source captured for verify+design; Figma/design alignment remains owned by `/delivery:design`.
- `notes`: This case is `verify+design`; verify screenshot is runtime source only and must not be written as Figma alignment PASS.

#### Evidence Reconciliation（证据对账）

##### Assertion（断言）：`positive_assertion`

- `case_id`: TC-INT-MANUAL-EXPORT-PERSIST-AFTER-REMOVE
- `evidence_requirement_id`: TC-INT-MANUAL-EXPORT-PERSIST-AFTER-REMOVE__positive_assertion
- `assertion_ref`: positive_assertion
- `verification_status`: EXECUTED
- `execution_ref`: natural UI post-removal DOM/screenshot plus source audit of toolbar getter and export method
- `recording_status`: RECORDED
- `evidence_type`: UI/DOM+screenshot+source+synthetic_network+command
- `coverage_result`: PASS_WITH_NOTES

| `acceptance_item` | `observed_value` | `evidence_ref` | `coverage_result` |
|---|---|---|---|
| summary 和 action 区在移除后仍可见 | Runtime post-remove toolbar text contains `共1个作品...0个`、`一键移除`、`导出剔除明细`; `shouldShowSubmitHitToolbar` remains true when `hasRemovedSubmitHitRecords` is true. | verify-logs/evidence/TC-INT-MANUAL-EXPORT-PERSIST-AFTER-REMOVE--runtime.json; screenshots/TC-INT-MANUAL-EXPORT-PERSIST-AFTER-REMOVE--after-remove-toolbar--drawer.png; verify-logs/evidence/repair-verify-source-audit-20260711.md | PASS_WITH_NOTES |
| `一键移除` 移除后 visible disabled | Runtime records `one_click_remove.visible=true` and `disabled=true`; source renders the button under the toolbar with `disabled={!hasSubmitHitItems}`. | verify-logs/evidence/TC-INT-MANUAL-EXPORT-PERSIST-AFTER-REMOVE--runtime.json; screenshots/TC-INT-MANUAL-EXPORT-PERSIST-AFTER-REMOVE--after-remove-toolbar--drawer.png; verify-logs/evidence/repair-verify-source-audit-20260711.md | PASS |
| export entry 在移除后仍可见且可重复触发 | Runtime records `导出剔除明细` visible/enabled and four repeated open events to the synthetic `lark_url`; export button is rendered inside toolbar without a `hasSubmitHitItems` guard. | verify-logs/evidence/TC-INT-MANUAL-EXPORT-PERSIST-AFTER-REMOVE--runtime.json; verify-logs/network/TC-INT-MANUAL-EXPORT-PERSIST-AFTER-REMOVE--network.md; verify-logs/evidence/repair-verify-source-audit-20260711.md | PASS_WITH_NOTES |
| request records 来自 preserved removed records | `exportSubmitHitRecords` builds `records` only from `this.removedSubmitHitItems`; persisted synthetic request contains removed rows `100001/100002`. | verify-logs/evidence/repair-verify-source-audit-20260711.md; mock/real-connect/apiDownloadContentRemoveRecord/R-BAM-DOWNLOAD-REMOVE-RECORD/request.json; verify-logs/evidence/TC-INT-MANUAL-EXPORT-PERSIST-AFTER-REMOVE--runtime.json | PASS_WITH_NOTES |
| 重复导出稳定 | `exportSubmitHitRecords` does not clear `removedSubmitHitItems`; repeated clicks opened the same synthetic `lark_url`. | verify-logs/evidence/TC-INT-MANUAL-EXPORT-PERSIST-AFTER-REMOVE--runtime.json; verify-logs/network/TC-INT-MANUAL-EXPORT-PERSIST-AFTER-REMOVE--network.md | PASS_WITH_NOTES |

##### Assertion（断言）：`negative_assertion`

- `case_id`: TC-INT-MANUAL-EXPORT-PERSIST-AFTER-REMOVE
- `evidence_requirement_id`: TC-INT-MANUAL-EXPORT-PERSIST-AFTER-REMOVE__negative_assertion
- `assertion_ref`: negative_assertion
- `verification_status`: EXECUTED
- `execution_ref`: runtime post-removal row presence plus source audit
- `recording_status`: RECORDED
- `evidence_type`: UI/DOM+source+synthetic_network
- `coverage_result`: PASS_WITH_NOTES

| `acceptance_item` | `observed_value` | `evidence_ref` | `coverage_result` |
|---|---|---|---|
| 不导出当前合法行 | Runtime post-remove state keeps `100003=true` while `100001/100002=false`; synthetic request contract contains only `100001/100002`, and export reads only `removedSubmitHitItems`. | verify-logs/evidence/TC-INT-MANUAL-EXPORT-PERSIST-AFTER-REMOVE--runtime.json; mock/real-connect/apiDownloadContentRemoveRecord/R-BAM-DOWNLOAD-REMOVE-RECORD/request.json; verify-logs/evidence/repair-verify-source-audit-20260711.md | PASS_WITH_NOTES |
| 不因命中行消失隐藏 summary/action | Runtime post-remove toolbar remains visible with summary and both buttons after hit rows disappear. | verify-logs/evidence/TC-INT-MANUAL-EXPORT-PERSIST-AFTER-REMOVE--runtime.json; screenshots/TC-INT-MANUAL-EXPORT-PERSIST-AFTER-REMOVE--after-remove-toolbar--drawer.png | PASS |
| 不调用 candidate_remove | Manual removal path has no `apiCandidateRemove`; export path calls only `apiDownloadContentRemoveRecord`; runtime evidence did not surface candidate_remove for this case. | verify-logs/evidence/repair-verify-source-audit-20260711.md; verify-logs/evidence/TC-INT-MANUAL-EXPORT-PERSIST-AFTER-REMOVE--runtime.json | PASS |

##### Assertion（断言）：`visual_assertion`

- `case_id`: TC-INT-MANUAL-EXPORT-PERSIST-AFTER-REMOVE
- `evidence_requirement_id`: TC-INT-MANUAL-EXPORT-PERSIST-AFTER-REMOVE__visual_assertion
- `assertion_ref`: visual_assertion
- `verification_status`: EXECUTED
- `execution_ref`: runtime post-removal Drawer screenshot plus source audit of JSX render branch
- `recording_status`: RECORDED
- `evidence_type`: UI/DOM+screenshot+source
- `coverage_result`: PASS_WITH_NOTES

| `acceptance_item` | `observed_value` | `evidence_ref` | `coverage_result` |
|---|---|---|---|
| summary 文案在移除后保留 | Runtime screenshot/DOM shows summary `共1个作品，其中不满足准入门槛或命中【不激励】规则的作品数为：0个`. | verify-logs/evidence/TC-INT-MANUAL-EXPORT-PERSIST-AFTER-REMOVE--runtime.json; screenshots/TC-INT-MANUAL-EXPORT-PERSIST-AFTER-REMOVE--after-remove-toolbar--drawer.png | PASS_WITH_NOTES |
| `一键移除` 在 action 区保留并禁用 | Runtime screenshot/DOM shows `一键移除`; runtime state records `disabled=true`; source uses `disabled={!hasSubmitHitItems}`. | verify-logs/evidence/TC-INT-MANUAL-EXPORT-PERSIST-AFTER-REMOVE--runtime.json; screenshots/TC-INT-MANUAL-EXPORT-PERSIST-AFTER-REMOVE--after-remove-toolbar--drawer.png; verify-logs/evidence/repair-verify-source-audit-20260711.md | PASS |
| 导出按钮在 action 区保留 | Runtime screenshot/DOM shows `导出剔除明细` still visible/enabled; JSX keeps `<Button ...>导出剔除明细</Button>` under `shouldShowSubmitHitToolbar`. | verify-logs/evidence/TC-INT-MANUAL-EXPORT-PERSIST-AFTER-REMOVE--runtime.json; screenshots/TC-INT-MANUAL-EXPORT-PERSIST-AFTER-REMOVE--after-remove-toolbar--drawer.png; verify-logs/evidence/repair-verify-source-audit-20260711.md | PASS_WITH_NOTES |

##### Assertion（断言）：`negative_visual_assertion`

- `case_id`: TC-INT-MANUAL-EXPORT-PERSIST-AFTER-REMOVE
- `evidence_requirement_id`: TC-INT-MANUAL-EXPORT-PERSIST-AFTER-REMOVE__negative_visual_assertion
- `assertion_ref`: negative_visual_assertion
- `verification_status`: EXECUTED
- `execution_ref`: runtime screenshot negative scan plus source audit
- `recording_status`: RECORDED
- `evidence_type`: UI/DOM+screenshot+source
- `coverage_result`: PASS_WITH_NOTES

| `acceptance_item` | `observed_value` | `evidence_ref` | `coverage_result` |
|---|---|---|---|
| 不出现旧文案、申诉入口或空白操作区 | Runtime post-remove toolbar shows summary plus both action buttons; no collapsed/blank action region is recorded. Repair source renders exact copy and no appeal UI in this action branch. | verify-logs/evidence/TC-INT-MANUAL-EXPORT-PERSIST-AFTER-REMOVE--runtime.json; screenshots/TC-INT-MANUAL-EXPORT-PERSIST-AFTER-REMOVE--after-remove-toolbar--drawer.png; verify-logs/evidence/repair-verify-source-audit-20260711.md | PASS_WITH_NOTES |

##### Assertion（断言）：`evidence_required`

- `case_id`: TC-INT-MANUAL-EXPORT-PERSIST-AFTER-REMOVE
- `evidence_requirement_id`: TC-INT-MANUAL-EXPORT-PERSIST-AFTER-REMOVE__evidence_required
- `assertion_ref`: evidence_required
- `verification_status`: EXECUTED
- `execution_ref`: natural UI before/action/after + screenshot + synthetic BAM network boundary + source audit + build
- `recording_status`: RECORDED
- `evidence_type`: UI/DOM+screenshot+synthetic_network+source+build-log
- `coverage_result`: PASS_WITH_NOTES

| `acceptance_item` | `observed_value` | `evidence_ref` | `coverage_result` |
|---|---|---|---|
| DOM/截图 | Runtime post-removal DOM and screenshot captured: summary remains visible with count `0`, `一键移除` visible disabled, `导出剔除明细` visible enabled, `100003` remains. | verify-logs/evidence/TC-INT-MANUAL-EXPORT-PERSIST-AFTER-REMOVE--runtime.json; screenshots/TC-INT-MANUAL-EXPORT-PERSIST-AFTER-REMOVE--after-remove-toolbar--drawer.png | PASS_WITH_NOTES |
| Network | Repeated export opens synthetic `lark_url`; no real export XHR is expected under MOCK_PREVIEW synthetic wrapper. Request/response contract is persisted under BAM synthetic artifacts. | verify-logs/network/TC-INT-MANUAL-EXPORT-PERSIST-AFTER-REMOVE--network.md; mock/real-connect/apiDownloadContentRemoveRecord/R-BAM-DOWNLOAD-REMOVE-RECORD/request.json; mock/real-connect/apiDownloadContentRemoveRecord/R-BAM-DOWNLOAD-REMOVE-RECORD/response.json; verify-logs/evidence/TC-INT-MANUAL-EXPORT-PERSIST-AFTER-REMOVE--runtime.json | PASS_WITH_NOTES |
| Build | Repair verify build exited 0. | verify-logs/baseline/repair-verify-build.log | PASS |

#### Pending Recheck Items（待复检项）

| `recheck_id` | `status` | `trigger_result` | `recheck_stage` | `target_assertion` | `reason` | `required_persistent_evidence` | `resume_point` | `owner` |
|---|---|---|---|---|---|---|---|---|
| TC-INT-MANUAL-EXPORT-PERSIST-AFTER-REMOVE__recheck__runtime_screenshot | CLOSED_WITH_NOTES | PASS_WITH_NOTES | /delivery:verify | visual_assertion; evidence_required | verify 已采集 removed-record-only toolbar screenshot；连续导出 Network 在 MOCK_PREVIEW 下以 BAM synthetic contract 记录，不宣称真实 XHR | `screenshots/TC-INT-MANUAL-EXPORT-PERSIST-AFTER-REMOVE--after-remove-toolbar--drawer.png`; `verify-logs/evidence/TC-INT-MANUAL-EXPORT-PERSIST-AFTER-REMOVE--runtime.json`; `verify-logs/network/TC-INT-MANUAL-EXPORT-PERSIST-AFTER-REMOVE--network.md` | TC-INT-MANUAL-EXPORT-PERSIST-AFTER-REMOVE | main-agent |
| TC-INT-MANUAL-EXPORT-PERSIST-AFTER-REMOVE__recheck__real_feishu_sheet | OPEN | PASS_WITH_NOTES | real verify | positive_assertion | MOCK_PREVIEW/source audit 不能证明真实 Feishu 表格权限和字段完整性 | real download response, opened sheet evidence, field/content verification | real integration verify after backend ready | main-agent/integration |

#### MTR Real Test Result（真实复测追加）

| field | value |
|---|---|
| mtr_run | `2026-07-13 /delivery:verify --mtr` |
| real_action | 针对 `download_content_remove_record` 执行浏览器层安全拦截探针。 |
| safety_evidence | `POST /api/buyin/admin/content_activity/download_content_remove_record` 被拦截，`safety_intercept=true`, `backend_write=not_sent`, local status `499`。 |
| mtr_evidence_ref | `verify-logs/evidence/mtr-real-recheck-20260713.md#high-risk-write-safety-intercept` |
| mtr_result | `PASS_WITH_NOTES` |
| remaining_real_gap | 安全策略导致未真实写入，不证明真实 Feishu 表格生成、权限或字段完整性；该 gap 为 non-blocking note，不阻塞继续交付，也不允许宣称真实导出已通过。 |
