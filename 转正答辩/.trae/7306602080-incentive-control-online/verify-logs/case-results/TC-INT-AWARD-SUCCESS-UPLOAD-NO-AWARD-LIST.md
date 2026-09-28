# Verification Case Result

### Case: `TC-INT-AWARD-SUCCESS-UPLOAD-NO-AWARD-LIST`

- `order`: 30.1
- `verification_stage`: verify
- `priority`: repair
- `contract_ref`: AR-003/AR-004 发奖成功后上传不发奖名单 / REPAIR-001
- `source_verify_report`: ../../06-debug-verification.md
- `updated_at`: 2026-07-11T04:06:42+08:00
- `verification_target`: 奖励发放成功后才调用 `apiCandidateRemove`，payload 只包含本次 selected/pending 的 explicit no-award candidates。
- `acceptance_steps`:
  - 选中奖励候选，并将部分候选标记为 `if_delivery === false`。
  - 点击发奖并等待 reward wrapper 成功分支。
  - 期望先完成 `apiDeliveryDouPlusCoin` / `apiDeliveryDouPlusCoupon` 成功，再调用 `apiCandidateRemove` 上传 no-award list。
  - 期望失败、异常、取消和人工提报移除均不触发该接口。
- `verification_process`:
  - EXECUTED：source audit 确认 `batch-operation-bar/index.tsx` 将 selected award rows 与 `pendingNoAwardVideoItems` / `pendingNoAwardAuthorItems` 合并后传入 `BatchSubmitModal`。
  - EXECUTED：source audit 确认 video/author store 在配置更新时保存 explicit `if_delivery === false` rows，并在恢复为 `if_delivery === true` 时删除 pending。
  - EXECUTED：source audit 确认 `buildVideoNoAwardRemoveCandidates` / `buildAuthorNoAwardRemoveCandidates` 只保留 `if_delivery === false` rows。
  - EXECUTED：source audit 确认 `handleOkClick` 只在 `submitResult.resultCode === 0` 后 await `uploadNoAwardRemoveCandidates`；非成功只进入 error 分支。
  - EXECUTED：targeted scan 确认 `apiCandidateRemove` 只在 `batch-submit-modal/index.tsx` 发奖弹窗路径导入/调用。
  - EXECUTED：app build PASS。
  - EXECUTED_WITH_NOTES：当前 repair verify 关闭 source/build 层面的顺序与 payload 过滤；测试环境浏览器复测补充关闭 reward-success 后 `candidate_remove` 的 runtime 顺序和 payload 证据。
  - EXECUTED_WITH_NOTES：测试环境 URL `activity_id=7655304206886322458` + `cjDebugSubApp=alliance-operation-content:http://localhost:8083/alliance-operation-content` + `externalLeadsDomainMock=1`，Console 捕获到 `apiDeliveryDouPlusCoin / R-BAM-AWARD-COIN-RELIEVED` synthetic success 先出现，随后 `apiCandidateRemove / R-BAM-CANDIDATE-REMOVE-SUCCESS` synthetic success 出现。
  - EXECUTED_WITH_NOTES：`candidate_remove` payload 只包含 `7655364163166869874` 和 `repair-test-no-award-100002` 两条 explicit no-award candidates，不包含发奖候选 `700002`。
- `ui_condition_completion`: not_triggered
- `write_interface_gate`: PASS_WITH_NOTES；`apiCandidateRemove` 是写接口，当前 evidence 是 source/build/order audit，不发送真实后端写请求。
- `fixture_fallback`: not_triggered
- `mock_handling`: effective_verify_mode=MOCK_PREVIEW; apiName=`apiCandidateRemove`; ruleId=`R-BAM-CANDIDATE-REMOVE-SUCCESS`; source/build audit plus fresh test-env runtime synthetic mock hit.
- `auto_fix_handling`: N/A
- `final_result`: PASS_WITH_NOTES
- `evidence_summary`: `repair-verify-source-audit-20260711.md` 记录 pending no-award preservation, submit payload merge, explicit `if_delivery === false` filtering, reward-success ordering, allowed `apiCandidateRemove` path, and build PASS；`test-env-no-award-upload-retest-20260711.md` 记录测试环境 Console runtime 顺序和 `candidate_remove` payload。
- `residual_risk`: 上传失败当前只 warning 且 reward success flow 继续；真实持久化、失败重试/回滚和真实生产发奖仍需 real integration verify 风险登记。
- `next_step`: repair verify gate review

#### Runbook Sync（Runbook 同步）

- `case_id`: TC-INT-AWARD-SUCCESS-UPLOAD-NO-AWARD-LIST
- `runbook_ref`: verify-logs/browser-verify-runbook.json#TC-INT-AWARD-SUCCESS-UPLOAD-NO-AWARD-LIST
- `runbook_status`: test_env_runtime_rechecked_with_notes
- `entry_url`: `https://ecop.bytedance.net/alliance-operation-content/content-activity/award?activity_id=7655304206886322458&cjDebugSubApp=alliance-operation-content:http://localhost:8083/alliance-operation-content&externalLeadsDomainMock=1&cjSiteCode=St12502250000001`
- `sample_params`: selected award candidate `700002` plus pending explicit no-award rows `7655364163166869874` and `repair-test-no-award-100002`
- `step_changes`: new repair regression case added after task replay.
- `assertion_changes`: all assertions initialized and mapped to source/build evidence, runtime Network order pending.
- `evidence_alignment`: aligned for source/build and test-env runtime ordering; real backend persistence remains out of scope.
- `notes`: Upload failure retry/rollback is outside the current success-case repair contract and remains P2 real verify risk.

#### Evidence Reconciliation（证据对账）

##### Assertion（断言）：`positive_assertion`

- `case_id`: TC-INT-AWARD-SUCCESS-UPLOAD-NO-AWARD-LIST
- `evidence_requirement_id`: TC-INT-AWARD-SUCCESS-UPLOAD-NO-AWARD-LIST__positive_assertion
- `assertion_ref`: positive_assertion
- `verification_status`: EXECUTED
- `execution_ref`: source audit of `BatchSubmitModal.handleOkClick`
- `recording_status`: RECORDED
- `evidence_type`: source+command
- `coverage_result`: PASS_WITH_NOTES

| `acceptance_item` | `observed_value` | `evidence_ref` | `coverage_result` |
|---|---|---|---|
| `apiCandidateRemove` 发生在 reward success 之后 | Source audit shows `handleOkClick` awaits reward submit first; test-env Console captured `apiDeliveryDouPlusCoin / R-BAM-AWARD-COIN-RELIEVED` synthetic success before `apiCandidateRemove / R-BAM-CANDIDATE-REMOVE-SUCCESS`. | verify-logs/evidence/repair-verify-source-audit-20260711.md; artifacts/repair/7306602080-incentive-control-online/20260710-162521-docx-NQxTdRPP/evidence/test-env-no-award-upload-retest-20260711.md | PASS_WITH_NOTES |
| payload 只包含 selected/pending no-award candidates | Test-env `candidate_remove` payload contained only `7655364163166869874` and `repair-test-no-award-100002`; it did not contain reward candidate `700002`. | artifacts/repair/7306602080-incentive-control-online/20260710-162521-docx-NQxTdRPP/evidence/test-env-no-award-upload-retest-20260711.md | PASS_WITH_NOTES |
| remove_reason 映射正确 | Test-env payload used `手动移除` for `7655364163166869874` and `命中【不激励】规则` for `repair-test-no-award-100002`. | artifacts/repair/7306602080-incentive-control-online/20260710-162521-docx-NQxTdRPP/evidence/test-env-no-award-upload-retest-20260711.md | PASS_WITH_NOTES |

##### Assertion（断言）：`negative_assertion`

- `case_id`: TC-INT-AWARD-SUCCESS-UPLOAD-NO-AWARD-LIST
- `evidence_requirement_id`: TC-INT-AWARD-SUCCESS-UPLOAD-NO-AWARD-LIST__negative_assertion
- `assertion_ref`: negative_assertion
- `verification_status`: EXECUTED
- `execution_ref`: source audit and targeted allowed-path scan
- `recording_status`: RECORDED
- `evidence_type`: source+command
- `coverage_result`: PASS_WITH_NOTES

| `acceptance_item` | `observed_value` | `evidence_ref` | `coverage_result` |
|---|---|---|---|
| 发奖失败/异常不触发 `apiCandidateRemove` | Non-zero reward result goes to `else if (submitResult.errorMessage)` and does not call `uploadNoAwardRemoveCandidates`; exceptions are converted to non-zero result by submit helpers. | verify-logs/evidence/repair-verify-source-audit-20260711.md | PASS_WITH_NOTES |
| 取消不触发 `apiCandidateRemove` | Cancel handler only resets Modal/charge state and never calls upload helper. | verify-logs/evidence/repair-verify-source-audit-20260711.md | PASS_WITH_NOTES |
| 人工提报移除不触发该接口 | Targeted scan found no `apiCandidateRemove` reference in manual submit store/form/drawer paths. | verify-logs/evidence/repair-verify-source-audit-20260711.md | PASS |
| 不上传未选中候选 | Pending state only records rows explicitly updated through selected batch edit; merge helper dedupes by item/author id and modal builders filter explicit no-award rows only. | verify-logs/evidence/repair-verify-source-audit-20260711.md | PASS_WITH_NOTES |

##### Assertion（断言）：`visual_assertion`

- `case_id`: TC-INT-AWARD-SUCCESS-UPLOAD-NO-AWARD-LIST
- `evidence_requirement_id`: TC-INT-AWARD-SUCCESS-UPLOAD-NO-AWARD-LIST__visual_assertion
- `assertion_ref`: visual_assertion
- `verification_status`: EXECUTED
- `execution_ref`: N/A; matrix visual assertion is `-`
- `recording_status`: RECORDED
- `evidence_type`: N/A
- `coverage_result`: PASS

| `acceptance_item` | `observed_value` | `evidence_ref` | `coverage_result` |
|---|---|---|---|
| N/A | No visual assertion is required by matrix for this mixed award/network case. | verify-logs/evidence/repair-verify-source-audit-20260711.md | PASS |

##### Assertion（断言）：`negative_visual_assertion`

- `case_id`: TC-INT-AWARD-SUCCESS-UPLOAD-NO-AWARD-LIST
- `evidence_requirement_id`: TC-INT-AWARD-SUCCESS-UPLOAD-NO-AWARD-LIST__negative_visual_assertion
- `assertion_ref`: negative_visual_assertion
- `verification_status`: EXECUTED
- `execution_ref`: N/A; matrix negative visual assertion is `-`
- `recording_status`: RECORDED
- `evidence_type`: N/A
- `coverage_result`: PASS

| `acceptance_item` | `observed_value` | `evidence_ref` | `coverage_result` |
|---|---|---|---|
| N/A | No negative visual assertion is required by matrix for this mixed award/network case. | verify-logs/evidence/repair-verify-source-audit-20260711.md | PASS |

##### Assertion（断言）：`evidence_required`

- `case_id`: TC-INT-AWARD-SUCCESS-UPLOAD-NO-AWARD-LIST
- `evidence_requirement_id`: TC-INT-AWARD-SUCCESS-UPLOAD-NO-AWARD-LIST__evidence_required
- `assertion_ref`: evidence_required
- `verification_status`: EXECUTED
- `execution_ref`: source audit + targeted scan + build
- `recording_status`: RECORDED
- `evidence_type`: source+command+build-log
- `coverage_result`: PASS_WITH_NOTES

| `acceptance_item` | `observed_value` | `evidence_ref` | `coverage_result` |
|---|---|---|---|
| Network order evidence | Browser Console in the test environment captured reward synthetic success before candidate remove synthetic success; Network did not show real final write XHR because both write APIs returned synthetic contract responses. | artifacts/repair/7306602080-incentive-control-online/20260710-162521-docx-NQxTdRPP/evidence/test-env-no-award-upload-retest-20260711.md | PASS_WITH_NOTES |
| payload evidence | Test-env payload captured only explicit no-award rows and excluded reward candidate `700002`; source audit also proves payload builders filter explicit no-award rows and preserve pending no-award rows after selection clearing. | artifacts/repair/7306602080-incentive-control-online/20260710-162521-docx-NQxTdRPP/evidence/test-env-no-award-upload-retest-20260711.md; verify-logs/evidence/repair-verify-source-audit-20260711.md | PASS_WITH_NOTES |
| build evidence | Repair verify build exited 0. | verify-logs/baseline/repair-verify-build.log | PASS |

#### Pending Recheck Items（待复检项）

| `recheck_id` | `status` | `trigger_result` | `recheck_stage` | `target_assertion` | `reason` | `required_persistent_evidence` | `resume_point` | `owner` |
|---|---|---|---|---|---|---|---|---|
| TC-INT-AWARD-SUCCESS-UPLOAD-NO-AWARD-LIST__recheck__runtime_network_order | CLOSED_WITH_NOTES | TEST_ENV_PASS_WITH_NOTES | /delivery:repair test-env retest | positive_assertion; negative_assertion; evidence_required | 测试环境 Console 已采集 reward synthetic success 后 `candidate_remove` synthetic success 的 runtime 顺序和 request body；写接口 synthetic contract 未发送真实后端 XHR | `apiDeliveryDouPlusCoin / R-BAM-AWARD-COIN-RELIEVED` followed by `apiCandidateRemove / R-BAM-CANDIDATE-REMOVE-SUCCESS`; payload only contains `7655364163166869874` and `repair-test-no-award-100002`; excludes `700002` | TC-INT-AWARD-SUCCESS-UPLOAD-NO-AWARD-LIST | main-agent |
| TC-INT-AWARD-SUCCESS-UPLOAD-NO-AWARD-LIST__recheck__real_persistence | OPEN | PASS_WITH_NOTES | real verify | positive_assertion | source/build audit 不能证明真实 candidate_remove 持久化、失败码、重试或回滚语义 | real request/response and backend persistence/audit evidence | real integration verify after backend ready | main-agent/integration |

#### MTR Real Test Result（真实复测追加）

| field | value |
|---|---|
| mtr_run | `2026-07-13 /delivery:verify --mtr` |
| real_action | 针对 no-award 上传持久化写接口执行浏览器层安全拦截探针。 |
| safety_evidence | `POST /api/buyin/admin/content_activity/candidate_remove` 被拦截，`safety_intercept=true`, `backend_write=not_sent`, local status `499`。 |
| mtr_evidence_ref | `verify-logs/evidence/mtr-real-recheck-20260713.md#high-risk-write-safety-intercept` |
| mtr_result | `PASS_WITH_NOTES` |
| remaining_real_gap | 安全策略导致未真实写入，不证明真实 candidate_remove 持久化、失败码、重试、回滚或后端审计记录；该 gap 为 non-blocking note，不阻塞继续交付，也不允许宣称真实后端副作用已通过。 |
