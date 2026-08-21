# Verification Case Result

### Case: `TC-TRACK-REMOVE-DETAIL-TAB-COUPON`

- `order`: 32
- `verification_stage`: verify
- `priority`: normal
- `contract_ref`: Interaction:奖励投放/SubTab/剔除明细; PRD tracking table
- `source_verify_report`: ../../06-debug-verification.md
- `updated_at`: 2026-07-09T11:08:00.000Z
- `verification_target`: Interaction:奖励投放/SubTab/剔除明细; PRD tracking table
- `acceptance_steps`:
  - DOU+券奖励投放页可切 Tab
  - 点击 剔除明细 并等待内容曝光
  - 期望：上报点击 UV 与曝光 UV，extra 区分配置项和奖励类型=DOU+券
- `verification_process`:
  - EXECUTED：续跑时发现 8083 dev server 未运行，重新启动 `apps/alliance-operation-content` dev server，并落盘 `devserver-8083-resume-lsof.log` / `devserver-8083-resume-health.log`。
  - EXECUTED：通过自然 UI 加载 `activity_id=7655304206886322458`，点击 `配置二`，确认当前配置为 DOU+券上下文。
  - EXECUTED：安装临时 runtime probe 后点击可见 `剔除明细` Radio.Button；probe 结束后已恢复。
  - EXECUTED：业务 XHR `GET /api/buyin/admin/content_activity/get_dou_plus_coupon_remove_record` 返回 `200`，query 为 `activity_id=7655304206886322458, config_id=7655304206886355226, page=1, page_num=20`，console 观察到 `[BAM_MOCK_HIT]` / `R-BAM-COUPON-REMOVE-DEFAULT`。
  - EXECUTED_WITH_NOTES：临时 `collectEvent` wrapper 未直接收到业务 payload，但 React runtime handler/source/bundle 证明 click path 调用 `sendElementClickLog`，active module DOM 给出 `sendModuleExposeLog` 的 `remove_detail_data` payload，analytics transport flush 可见。
  - EXECUTED：负向检查未出现 DOU+币 remove-record 请求；active context 为 `reward_type=DOU+券` / `config_index=2`，表头为 DOU+券作者维度。
- `ui_condition_completion`: not_triggered
- `write_interface_gate`: PASS；目标接口为 read GET；`apiGetDouPlusCouponRemoveRecord` / `R-BAM-COUPON-REMOVE-DEFAULT` 已在 MOCK_PREVIEW 下命中并记录，不涉及写接口。
- `fixture_fallback`: not_triggered
- `mock_handling`: effective_verify_mode=MOCK_PREVIEW; ruleId=`R-BAM-COUPON-REMOVE-DEFAULT`; apiName=`apiGetDouPlusCouponRemoveRecord`; requestBody=`activity_id=7655304206886322458,config_id=7655304206886355226,page=1,page_num=20`; tracking case 独立记录 logger/runtime evidence。
- `auto_fix_handling`: N/A
- `final_result`: PASS_WITH_NOTES
- `evidence_summary`: Runtime evidence `verify-logs/evidence/TC-TRACK-REMOVE-DETAIL-TAB-COUPON--runtime.json` records natural config/tab click, before/after DOM, active module payload, DOU+券 request, BAM marker, analytics transport observation, negative DOU+币 checks and probe restore. `verify-logs/evidence/TC-TRACK-REMOVE-DETAIL-TAB-COUPON.md` provides readable summary. `verify-logs/evidence/TC-TRACK-REMOVE-DETAIL-TAB-COUPON--source-evidence.md` records source, bundle and React fiber binding evidence. Network summary is `verify-logs/evidence/TC-TRACK-REMOVE-DETAIL-TAB-COUPON--browser-network-final.log`.
- `residual_risk`: 本地 verify 可证明前端点击/曝光路径、上下文和请求触发；直接 collector business payload 未在 integrated_browser 中可见，DA UV 聚合仍需后续 analytics audit。
- `next_step`: sync global `06-debug-verification.md`; do not enter /delivery:design until gate is explicitly reviewed.

#### Runbook Sync（Runbook 同步）

- `case_id`: TC-TRACK-REMOVE-DETAIL-TAB-COUPON
- `runbook_ref`: verify-logs/browser-verify-runbook.json#TC-TRACK-REMOVE-DETAIL-TAB-COUPON
- `runbook_status`: executed
- `entry_url`: https://ecop.bytedance.net/alliance-operation-content/content-activity/award?activity_id=7655304206886322458&cjDebugSubApp=alliance-operation-content%3Ahttp%3A%2F%2Flocalhost%3A8083%2Falliance-operation-content&externalLeadsDomainMock=1&cjSiteCode=St12502250000001&_verify_reload=track_remove_coupon_payload_202607092030b
- `sample_params`: runtime_state=coupon-tab-switch; capture_scope=tab+logger; ruleId=R-BAM-COUPON-REMOVE-DEFAULT; config_id=7655304206886355226; reward_type=DOU+券
- `step_changes`: active case executed by natural UI; 8083 dev server resumed; runtime probe installed/restored; React handler/source binding inspected because direct collectEvent payload was not observable.
- `assertion_changes`: positive/negative/evidence_required closed with notes for direct collector payload and DA UV aggregation.
- `evidence_alignment`: aligned_with_notes
- `notes`: local frontend tracking path verified; DA/direct collector payload remains recheck.

#### Evidence Reconciliation（证据对账）

##### Assertion（断言）：`positive_assertion`

- `case_id`: TC-TRACK-REMOVE-DETAIL-TAB-COUPON
- `evidence_requirement_id`: TC-TRACK-REMOVE-DETAIL-TAB-COUPON__positive_assertion
- `assertion_ref`: positive_assertion
- `verification_status`: EXECUTED
- `execution_ref`: natural UI `配置二/DOU+券` -> click `剔除明细` -> active module payload + DOU+券 remove-record request + React logger binding captured
- `recording_status`: RECORDED
- `evidence_type`: Network+UI/DOM+log+source
- `coverage_result`: PASS_WITH_NOTES

| `acceptance_item` | `observed_value` | `evidence_ref` | `coverage_result` |
|---|---|---|---|
| logger click/expose 可观测 | Direct collector payload was not exposed by integrated_browser, but runtime binding proves `sendElementClickLog` on `remove_detail_tab`; active visible module payload for exposure is `module_id=remove_detail_data`, `config_id=7655304206886355226`, `config_index=2`, `config_name=配置二`, `reward_type=DOU+券`; analytics transport requests observed. | verify-logs/evidence/TC-TRACK-REMOVE-DETAIL-TAB-COUPON--runtime.json; verify-logs/evidence/TC-TRACK-REMOVE-DETAIL-TAB-COUPON.md; verify-logs/evidence/TC-TRACK-REMOVE-DETAIL-TAB-COUPON--source-evidence.md | PASS_WITH_NOTES |
| Network trigger evidence | Business XHR `GET /api/buyin/admin/content_activity/get_dou_plus_coupon_remove_record` returned `200` with `activity_id=7655304206886322458`, `config_id=7655304206886355226`, `page=1`, `page_num=20`; console observed `[BAM_MOCK_HIT]` rule `R-BAM-COUPON-REMOVE-DEFAULT`. | verify-logs/evidence/TC-TRACK-REMOVE-DETAIL-TAB-COUPON--runtime.json; verify-logs/evidence/TC-TRACK-REMOVE-DETAIL-TAB-COUPON.md; verify-logs/evidence/TC-TRACK-REMOVE-DETAIL-TAB-COUPON--browser-network-final.log | PASS |

##### Assertion（断言）：`negative_assertion`

- `case_id`: TC-TRACK-REMOVE-DETAIL-TAB-COUPON
- `evidence_requirement_id`: TC-TRACK-REMOVE-DETAIL-TAB-COUPON__negative_assertion
- `assertion_ref`: negative_assertion
- `verification_status`: EXECUTED
- `execution_ref`: active runtime context and request stayed on DOU+券 branch; no coin remove-record trigger
- `recording_status`: RECORDED
- `evidence_type`: Network+log+DOM+source
- `coverage_result`: PASS_WITH_NOTES

| `acceptance_item` | `observed_value` | `evidence_ref` | `coverage_result` |
|---|---|---|---|
| 不漏配置项参数 | active module/click context includes `activity_id=7655304206886322458`, `config_id=7655304206886355226`, `config_index=2`, `config_name=配置二`, `reward_type=DOU+券`; request includes same activity/config id. | verify-logs/evidence/TC-TRACK-REMOVE-DETAIL-TAB-COUPON--runtime.json; verify-logs/evidence/TC-TRACK-REMOVE-DETAIL-TAB-COUPON--source-evidence.md | PASS |
| 不误报 DOU+币 | runtime context reward_type is `DOU+券`; DOU+券 table headers are `作者信息/剔除发奖原因/剔除发奖时间/操作人`; `coin_remove_record_request_count=0`; no `reward_type=DOU+币` in active click/expose context. | verify-logs/evidence/TC-TRACK-REMOVE-DETAIL-TAB-COUPON--runtime.json; verify-logs/evidence/TC-TRACK-REMOVE-DETAIL-TAB-COUPON.md | PASS |
| direct collector payload limitation | `collectEvent` wrapper received 0 calls, so local verify does not claim direct DA payload capture. This limitation is recorded rather than weakening reward-type assertions that are proven by runtime handler/source and active module context. | verify-logs/evidence/TC-TRACK-REMOVE-DETAIL-TAB-COUPON--runtime.json; verify-logs/evidence/TC-TRACK-REMOVE-DETAIL-TAB-COUPON.md | PASS_WITH_NOTES |

##### Assertion（断言）：`visual_assertion`

- `case_id`: TC-TRACK-REMOVE-DETAIL-TAB-COUPON
- `evidence_requirement_id`: TC-TRACK-REMOVE-DETAIL-TAB-COUPON__visual_assertion
- `assertion_ref`: visual_assertion
- `verification_status`: EXECUTED
- `execution_ref`: N/A（矩阵字段不适用）
- `recording_status`: RECORDED
- `evidence_type`: N/A
- `coverage_result`: PASS

| `acceptance_item` | `observed_value` | `evidence_ref` | `coverage_result` |
|---|---|---|---|
| N/A（矩阵字段为 -） | N/A | N/A | PASS |

##### Assertion（断言）：`negative_visual_assertion`

- `case_id`: TC-TRACK-REMOVE-DETAIL-TAB-COUPON
- `evidence_requirement_id`: TC-TRACK-REMOVE-DETAIL-TAB-COUPON__negative_visual_assertion
- `assertion_ref`: negative_visual_assertion
- `verification_status`: EXECUTED
- `execution_ref`: N/A（矩阵字段不适用）
- `recording_status`: RECORDED
- `evidence_type`: N/A
- `coverage_result`: PASS

| `acceptance_item` | `observed_value` | `evidence_ref` | `coverage_result` |
|---|---|---|---|
| N/A（矩阵字段为 -） | N/A | N/A | PASS |

##### Assertion（断言）：`evidence_required`

- `case_id`: TC-TRACK-REMOVE-DETAIL-TAB-COUPON
- `evidence_requirement_id`: TC-TRACK-REMOVE-DETAIL-TAB-COUPON__evidence_required
- `assertion_ref`: evidence_required
- `verification_status`: EXECUTED
- `execution_ref`: runtime probe + DOM + React fiber/source + business XHR evidence captured
- `recording_status`: RECORDED
- `evidence_type`: Network+log+source
- `coverage_result`: PASS_WITH_NOTES

| `acceptance_item` | `observed_value` | `evidence_ref` | `coverage_result` |
|---|---|---|---|
| 证据类型：logger spy | Temporary wrapper could not observe direct collector payload (`collectEventCalls=0`); runtime React handler binding, source transport chain, active exposure payload and analytics transport requests were recorded. | verify-logs/evidence/TC-TRACK-REMOVE-DETAIL-TAB-COUPON--runtime.json; verify-logs/evidence/TC-TRACK-REMOVE-DETAIL-TAB-COUPON--source-evidence.md | PASS_WITH_NOTES |
| 证据类型：Network trigger evidence | DOU+券 remove-record XHR and `[BAM_MOCK_HIT] / R-BAM-COUPON-REMOVE-DEFAULT` observed for the natural click. | verify-logs/evidence/TC-TRACK-REMOVE-DETAIL-TAB-COUPON--runtime.json; verify-logs/evidence/TC-TRACK-REMOVE-DETAIL-TAB-COUPON.md; verify-logs/evidence/TC-TRACK-REMOVE-DETAIL-TAB-COUPON--browser-network-final.log | PASS |

#### Pending Recheck Items（待复检项）

| `recheck_id` | `status` | `trigger_result` | `recheck_stage` | `target_assertion` | `reason` | `required_persistent_evidence` | `resume_point` | `owner` |
|---|---|---|---|---|---|---|---|---|
| TC-TRACK-REMOVE-DETAIL-TAB-COUPON__recheck__current_verify | CLOSED | PASS_WITH_NOTES | /delivery:verify | all required assertions | local frontend click/expose path, DOU+券 context, Network trigger, BAM marker, negative coin checks and probe restore evidence recorded | verify-logs/evidence/TC-TRACK-REMOVE-DETAIL-TAB-COUPON--runtime.json; verify-logs/evidence/TC-TRACK-REMOVE-DETAIL-TAB-COUPON.md; verify-logs/evidence/TC-TRACK-REMOVE-DETAIL-TAB-COUPON--source-evidence.md; verify-logs/evidence/TC-TRACK-REMOVE-DETAIL-TAB-COUPON--browser-network-final.log | 06-debug-verification.md sync | main-agent |
| TC-TRACK-REMOVE-DETAIL-TAB-COUPON__recheck__direct_collector_payload | OPEN | PASS_WITH_NOTES | DA platform / post-verify analytics audit | positive_assertion / evidence_required | integrated_browser did not expose direct collector payload for this tab click; local verify records source/runtime binding instead of claiming DA payload capture | DA or analytics debug evidence for `element_id=remove_detail_tab`, `module_id=remove_detail_data`, `reward_type=DOU+券`, `config_id=7655304206886355226` | TC-TRACK-REMOVE-DETAIL-TAB-COUPON | delivery-reviewer |
| TC-TRACK-REMOVE-DETAIL-TAB-COUPON__recheck__da_uv | OPEN | PASS_WITH_NOTES | DA platform / post-verify analytics audit | positive_assertion / evidence_required | 本地 verify 只能证明 frontend click/expose path 和 runtime context，不能证明 UV 聚合入库口径 | DA 平台事件查询，需包含 click/expose UV、activity/config context、reward_type=DOU+券 | TC-TRACK-REMOVE-DETAIL-TAB-COUPON | delivery-reviewer |

#### MTR Real Test Result（真实复测追加）

| field | value |
|---|---|
| mtr_run | `2026-07-13 /delivery:verify --mtr` |
| real_action | 无 mock 参数页面读取 DOU+券 `剔除明细`，真实 remove-record GET 返回 3 条作者记录；作者 ID 筛选请求也返回 3 条。 |
| local_observation | 页面运行中可见通用 `mcs.zijieapi.com/list` / `mon.zijieapi.com` 采集请求，但 integrated_browser 未暴露 DA 业务 payload。 |
| mtr_evidence_ref | `verify-logs/evidence/mtr-real-recheck-20260713.md#dou券剔除明细默认读取`; `verify-logs/evidence/mtr-real-recheck-20260713.md#mtr-real-recheck-queue-and-result` |
| mtr_result | `OPEN_EXTERNAL_SYSTEM` |
| remaining_real_gap | 需要 DA 平台或 collector 明细证明 `reward_type=DOU+券` 的 click/expose UV 入库。 |
