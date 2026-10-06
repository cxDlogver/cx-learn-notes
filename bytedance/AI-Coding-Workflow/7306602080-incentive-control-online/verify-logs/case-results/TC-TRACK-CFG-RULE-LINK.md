# Verification Case Result

### Case: `TC-TRACK-CFG-RULE-LINK`

- `order`: 4
- `verification_stage`: verify
- `priority`: normal
- `contract_ref`: Interaction:查看【不激励】规则; PRD tracking table
- `source_verify_report`: ../../06-debug-verification.md
- `updated_at`: 2026-07-08T10:39:30.000Z
- `verification_target`: Interaction:查看【不激励】规则; PRD tracking table
- `acceptance_steps`:
  - 配置提示已展示且 logger spy 可观测
  - 点击规则入口
  - 期望：上报点击 UV，参数含页面/模块与 activity/config context
- `verification_process`:
  - PASS：运行态 DOM 节点存在 React `onClick`，绑定函数源码包含且仅包含一次 `sendElementClickLog` 调用。
  - PASS：绑定函数参数包含 `content_activity_edit`、`reward_config_no_incentive_prompt`、`no_incentive_rule_link`、`activity_id`、`config_index`、`config_id`、`view_type`。
  - PASS：真实点击记录为 1 次，点击未阻断 Wiki 新 tab 打开。
  - PASS：组件源码使用既有 `@ecom/operation-logger` 的 `sendElementClickLog`，未新增新 logger SDK。
  - PASS_WITH_NOTES：integrated_browser 未暴露直接 DA payload；DA 平台口径保留为后续复验项。
- `ui_condition_completion`: not_triggered
- `write_interface_gate`: N/A
- `fixture_fallback`: not_triggered
- `mock_handling`: N/A
- `auto_fix_handling`: N/A
- `final_result`: PASS_WITH_NOTES
- `evidence_summary`: Runtime React props / click spy / source snippet / monitor transport evidence 已落盘，支持埋点接线和单次点击事实；直接 DA payload 未能在当前浏览器工具中读取。
- `residual_risk`: 需由 DA 平台或线上埋点查询复验真实 event payload 入库口径。
- `next_step`: next case

#### Runbook Sync（Runbook 同步）

- `case_id`: TC-TRACK-CFG-RULE-LINK
- `runbook_ref`: verify-logs/browser-verify-runbook.json#TC-TRACK-CFG-RULE-LINK
- `runbook_status`: updated
- `entry_url`: https://ecop.bytedance.net/alliance-operation-content/content-activity/list?cjDebugSubApp=alliance-operation-content:http://localhost:8083/alliance-operation-content&externalLeadsDomainMock=1
- `sample_params`: runtime_state=prompt-visible; capture_scope=logger call; ruleId=N/A
- `step_changes`: prompt visible -> install temporary logger/network spy -> click rule link -> inspect runtime-bound React onClick -> restore spy
- `assertion_changes`: none
- `evidence_alignment`: aligned_for_verify_runtime_with_da_recheck
- `notes`: Direct DA payload was not exposed by integrated_browser; runtime binding and source evidence prove sendElementClickLog wiring, DA platform recheck remains open.

#### Evidence Reconciliation（证据对账）

##### Assertion（断言）：`positive_assertion`

- `case_id`: TC-TRACK-CFG-RULE-LINK
- `evidence_requirement_id`: TC-TRACK-CFG-RULE-LINK__positive_assertion
- `assertion_ref`: positive_assertion
- `verification_status`: EXECUTED
- `execution_ref`: runtime React props inspection + natural UI click
- `recording_status`: RECORDED
- `evidence_type`: UI/DOM+log
- `coverage_result`: PASS_WITH_NOTES

| `acceptance_item` | `observed_value` | `evidence_ref` | `coverage_result` |
|---|---|---|---|
| logger 被调用一次且不阻断跳转 | Bound `onClick` contains exactly one `sendElementClickLog` call; runtime click record count is 1; click opened Lark Wiki tab and did not block navigation. Direct DA payload not readable in integrated_browser. | verify-logs/evidence/TC-TRACK-CFG-RULE-LINK.md | PASS_WITH_NOTES |

##### Assertion（断言）：`negative_assertion`

- `case_id`: TC-TRACK-CFG-RULE-LINK
- `evidence_requirement_id`: TC-TRACK-CFG-RULE-LINK__negative_assertion
- `assertion_ref`: negative_assertion
- `verification_status`: EXECUTED
- `execution_ref`: bound handler source count + source import scan
- `recording_status`: RECORDED
- `evidence_type`: UI/DOM+log
- `coverage_result`: PASS

| `acceptance_item` | `observed_value` | `evidence_ref` | `coverage_result` |
|---|---|---|---|
| 不重复上报 | Bound handler has `sendElementClickLogCallCountInBoundHandler=1`; runtime click record count is 1 for this case action | verify-logs/evidence/TC-TRACK-CFG-RULE-LINK.md | PASS |
| 不新增新 logger SDK | Component uses existing `import { sendElementClickLog } from '@ecom/operation-logger';`; no additional logger SDK introduced in the touched component | verify-logs/evidence/TC-TRACK-CFG-RULE-LINK.md; `apps/alliance-operation-content/src/routes/content-activity/edit/components/step-reward-config/index.tsx:42` | PASS |

##### Assertion（断言）：`visual_assertion`

- `case_id`: TC-TRACK-CFG-RULE-LINK
- `evidence_requirement_id`: TC-TRACK-CFG-RULE-LINK__visual_assertion
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

- `case_id`: TC-TRACK-CFG-RULE-LINK
- `evidence_requirement_id`: TC-TRACK-CFG-RULE-LINK__negative_visual_assertion
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

- `case_id`: TC-TRACK-CFG-RULE-LINK
- `evidence_requirement_id`: TC-TRACK-CFG-RULE-LINK__evidence_required
- `assertion_ref`: evidence_required
- `verification_status`: EXECUTED
- `execution_ref`: logger binding spy + click evidence + source snippet
- `recording_status`: RECORDED
- `evidence_type`: UI/DOM+log
- `coverage_result`: PASS_WITH_NOTES

| `acceptance_item` | `observed_value` | `evidence_ref` | `coverage_result` |
|---|---|---|---|
| 证据类型：logger spy | Runtime React props inspection confirms the live DOM node's bound `onClick` calls `sendElementClickLog` once with expected context; direct DA payload not exposed | verify-logs/evidence/TC-TRACK-CFG-RULE-LINK.md | PASS_WITH_NOTES |
| 证据类型：click evidence | Natural click record count 1 and Wiki new tab opened | verify-logs/evidence/TC-TRACK-CFG-RULE-LINK.md | PASS |

#### Pending Recheck Items（待复检项）

| `recheck_id` | `status` | `trigger_result` | `recheck_stage` | `target_assertion` | `reason` | `required_persistent_evidence` | `resume_point` | `owner` |
|---|---|---|---|---|---|---|---|---|
| TC-TRACK-CFG-RULE-LINK__recheck__da_payload | OPEN | PASS_WITH_NOTES | DA platform / post-verify analytics audit | positive_assertion / evidence_required | integrated_browser 未暴露真实 DA event payload，只能证明 runtime handler 接线与点击触发链路 | DA 平台事件查询，需包含 `no_incentive_rule_link`、`reward_config_no_incentive_prompt`、activity/config context | TC-TRACK-CFG-RULE-LINK | delivery-reviewer |

#### MTR Real Test Result（真实复测追加）

| field | value |
|---|---|
| mtr_run | `2026-07-13 /delivery:verify --mtr` |
| real_action | 本轮 MTR 聚焦奖励投放页读链路和写接口安全拦截，未重新点击配置页规则 link。 |
| da_status | 未查询 DA 平台；不能证明点击 UV 聚合。 |
| mtr_evidence_ref | `verify-logs/evidence/mtr-real-recheck-20260713.md#mtr-real-recheck-queue-and-result` |
| mtr_result | `OPEN_EXTERNAL_SYSTEM` |
| remaining_real_gap | 需 DA 平台事件查询覆盖 `no_incentive_rule_link` / activity / config context。 |

#### MTR Config Page Fresh Rerun（真实配置页补验追加）

| field | value |
|---|---|
| mtr_run | `2026-07-13 /delivery:verify --mtr` follow-up：`将所有可以进行验证的配置页上进行验证` |
| real_action | 在无 `externalLeadsDomainMock=1` 的 `activity_id=7629288371705643310` 配置编辑页自然点击 `查看【不激励】规则`。 |
| mtr_evidence_ref | `verify-logs/evidence/mtr-config-pages-20260713.md#rule-link-click-evidence`; `verify-logs/evidence/mtr-config-pages-20260713.md#result-by-case`; `verify-logs/evidence/mtr-rerun-activity-7629288371705643310-20260713.md#config-page-fresh-rerun` |
| browser_observed_value | 浏览器捕获到 1 次 `查看【不激励】规则` 自然点击；点击未阻断 Wiki 新 tab 打开；交互后出现 `mcs.zijieapi.com/list` 与 `mon.zijieapi.com` 监控请求。 |
| negative_observed_value | 未观察到重复业务点击记录；未观察到 content-activity save/export/remove/award 写接口；`blockedWrites=[]`。 |
| screenshot_materialization | `verify-logs/screenshots/mtr-rerun-config-7629288371705643310-20260713.png` 已作为配置页 runtime source 落盘；本 tracking case 不用该截图关闭 DA/UV，只用于定位点击前配置页状态。 |
| mtr_result | `OPEN_EXTERNAL_SYSTEM` |
| pass_policy | 浏览器可验证点击链路已补跑；但 integrated browser 未提供 DA 明细 payload / UV 聚合查询，本 case 不能升级为真实 DA pass。 |
| remaining_real_gap | 仍需 DA 平台事件查询覆盖 `no_incentive_rule_link`、`reward_config_no_incentive_prompt`、activity/config context 和 UV 聚合。 |
