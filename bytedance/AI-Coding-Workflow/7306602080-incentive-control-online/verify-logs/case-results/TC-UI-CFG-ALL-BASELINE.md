# Verification Case Result

### Case: `TC-UI-CFG-ALL-BASELINE`

- `order`: 1
- `verification_stage`: verify+design
- `priority`: normal
- `contract_ref`: Region:配置-全部用户/不激励提示; Cell:配置提示/规则入口
- `source_verify_report`: ../../06-debug-verification.md
- `updated_at`: 2026-07-08T10:23:30.000Z
- `verification_target`: Region:配置-全部用户/不激励提示; Cell:配置提示/规则入口
- `acceptance_steps`:
  - 进入奖励配置并选择活动参与资格=全部用户
  - 查看活动参与资格配置项下方提示
  - 期望：出现完整 PRD 文案与 clickable link
- `verification_process`:
  - PASS：从 content activity list 进入可编辑活动 `7649322835323650313`，点击 `下一步` 自然进入奖励配置。
  - PASS：全部用户 radio 选中，DOM 出现精确提示文案和独立 `<a>` 规则入口。
  - PASS：截图已保存并复制到 workspace `screenshots/TC-UI-CFG-ALL-BASELINE--config-all-user--config-prompt-row.png`。
  - PASS_WITH_NOTES：verify 仅提供 runtime source；Figma-vs-runtime 对齐留给 `/delivery:design`。
- `ui_condition_completion`: not_triggered
- `write_interface_gate`: N/A
- `fixture_fallback`: not_triggered
- `mock_handling`: N/A
- `auto_fix_handling`: N/A
- `final_result`: PASS_WITH_NOTES
- `evidence_summary`: DOM / computed style / screenshot 已落盘，支持全部用户态运行态事实；Figma diff 未在 verify 阶段关闭。
- `residual_risk`: `/delivery:design` 必须用本 case runtime screenshot 对比 Figma `node 1:9770`；verify 未声明设计对齐通过。
- `next_step`: next case

#### Runbook Sync（Runbook 同步）

- `case_id`: TC-UI-CFG-ALL-BASELINE
- `runbook_ref`: verify-logs/browser-verify-runbook.json#TC-UI-CFG-ALL-BASELINE
- `runbook_status`: updated
- `entry_url`: https://ecop.bytedance.net/alliance-operation-content/content-activity/list?cjDebugSubApp=alliance-operation-content:http://localhost:8083/alliance-operation-content&externalLeadsDomainMock=1
- `sample_params`: runtime_state=config-all-user; capture_scope=config prompt row; ruleId=N/A
- `step_changes`: list -> edit activity `7649322835323650313` -> next step -> reward config all-user prompt
- `assertion_changes`: none
- `evidence_alignment`: aligned_for_verify_runtime; design alignment pending
- `notes`: screenshot materialized for design reuse; no Figma-vs-runtime claim in verify

#### Evidence Reconciliation（证据对账）

##### Assertion（断言）：`positive_assertion`

- `case_id`: TC-UI-CFG-ALL-BASELINE
- `evidence_requirement_id`: TC-UI-CFG-ALL-BASELINE__positive_assertion
- `assertion_ref`: positive_assertion
- `verification_status`: EXECUTED
- `execution_ref`: natural UI edit activity `7649322835323650313` -> `下一步` -> reward config all-user prompt
- `recording_status`: RECORDED
- `evidence_type`: UI/DOM+screenshot
- `coverage_result`: PASS

| `acceptance_item` | `observed_value` | `evidence_ref` | `coverage_result` |
|---|---|---|---|
| 展示 奖励发放环节将进行账号校验...无法被发奖 | DOM 精确包含 `奖励发放环节将进行账号校验，命中【不激励】规则的账号无法被发奖`，且截图可见该文案 | verify-logs/evidence/TC-UI-CFG-ALL-BASELINE.md; screenshots/TC-UI-CFG-ALL-BASELINE--config-all-user--config-prompt-row.png | PASS |
| 查看【不激励】规则 | DOM 存在独立 `<a>`，文案为 `查看【不激励】规则`，href 指向 Lark wiki，target `_blank`，rel `noopener noreferrer` | verify-logs/evidence/TC-UI-CFG-ALL-BASELINE.md; screenshots/TC-UI-CFG-ALL-BASELINE--config-all-user--config-prompt-row.png | PASS |

##### Assertion（断言）：`negative_assertion`

- `case_id`: TC-UI-CFG-ALL-BASELINE
- `evidence_requirement_id`: TC-UI-CFG-ALL-BASELINE__negative_assertion
- `assertion_ref`: negative_assertion
- `verification_status`: EXECUTED
- `execution_ref`: natural UI reward config all-user prompt negative scan
- `recording_status`: RECORDED
- `evidence_type`: UI/DOM+screenshot
- `coverage_result`: PASS

| `acceptance_item` | `observed_value` | `evidence_ref` | `coverage_result` |
|---|---|---|---|
| 不出现不激励数量 | DOM negative scan: `不激励数量` 不存在 | verify-logs/evidence/TC-UI-CFG-ALL-BASELINE.md; screenshots/TC-UI-CFG-ALL-BASELINE--config-all-user--config-prompt-row.png | PASS |
| 下载名单 | DOM negative scan: `下载名单` 不存在 | verify-logs/evidence/TC-UI-CFG-ALL-BASELINE.md; screenshots/TC-UI-CFG-ALL-BASELINE--config-all-user--config-prompt-row.png | PASS |
| 申诉入口 | DOM negative scan: `申诉` 不存在 | verify-logs/evidence/TC-UI-CFG-ALL-BASELINE.md; screenshots/TC-UI-CFG-ALL-BASELINE--config-all-user--config-prompt-row.png | PASS |

##### Assertion（断言）：`visual_assertion`

- `case_id`: TC-UI-CFG-ALL-BASELINE
- `evidence_requirement_id`: TC-UI-CFG-ALL-BASELINE__visual_assertion
- `assertion_ref`: visual_assertion
- `verification_status`: EXECUTED
- `execution_ref`: computed style + screenshot for all-user prompt
- `recording_status`: RECORDED
- `evidence_type`: UI/DOM+screenshot+computed_style
- `coverage_result`: PASS_WITH_NOTES

| `acceptance_item` | `observed_value` | `evidence_ref` | `coverage_result` |
|---|---|---|---|
| prompt 位于原配置项下方 | `全部用户` radio label y=399，prompt rect y=430；截图显示 prompt 位于活动参与资格行下方 | verify-logs/evidence/TC-UI-CFG-ALL-BASELINE.md; screenshots/TC-UI-CFG-ALL-BASELINE--config-all-user--config-prompt-row.png | PASS |
| link 文案视觉分离 | prompt `inline-flex` gap 8px；link rect x=617/y=430/width=128/height=20，颜色 `rgb(0, 136, 255)`，独立于灰色提示文案 | verify-logs/evidence/TC-UI-CFG-ALL-BASELINE.md; screenshots/TC-UI-CFG-ALL-BASELINE--config-all-user--config-prompt-row.png | PASS |
| Figma-vs-runtime visual alignment | Verify 已物化 runtime screenshot source；不在 verify 阶段声明 Figma 对齐通过 | screenshots/TC-UI-CFG-ALL-BASELINE--config-all-user--config-prompt-row.png | PASS_WITH_NOTES |

##### Assertion（断言）：`negative_visual_assertion`

- `case_id`: TC-UI-CFG-ALL-BASELINE
- `evidence_requirement_id`: TC-UI-CFG-ALL-BASELINE__negative_visual_assertion
- `assertion_ref`: negative_visual_assertion
- `verification_status`: EXECUTED
- `execution_ref`: DOM negative scan + screenshot for all-user prompt
- `recording_status`: RECORDED
- `evidence_type`: UI/DOM+screenshot
- `coverage_result`: PASS

| `acceptance_item` | `observed_value` | `evidence_ref` | `coverage_result` |
|---|---|---|---|
| 不出现额外卡片 | 截图中 prompt 为活动参与资格下方 inline 提示，未新增独立卡片容器 | verify-logs/evidence/TC-UI-CFG-ALL-BASELINE.md; screenshots/TC-UI-CFG-ALL-BASELINE--config-all-user--config-prompt-row.png | PASS |
| 旧白板占位或下载按钮 | DOM negative scan: `旧白板` / `占位` / `下载` button/text 不存在于当前奖励配置视口 | verify-logs/evidence/TC-UI-CFG-ALL-BASELINE.md; screenshots/TC-UI-CFG-ALL-BASELINE--config-all-user--config-prompt-row.png | PASS |

##### Assertion（断言）：`evidence_required`

- `case_id`: TC-UI-CFG-ALL-BASELINE
- `evidence_requirement_id`: TC-UI-CFG-ALL-BASELINE__evidence_required
- `assertion_ref`: evidence_required
- `verification_status`: EXECUTED
- `execution_ref`: materialization check for DOM evidence and screenshot
- `recording_status`: RECORDED
- `evidence_type`: UI/DOM+screenshot
- `coverage_result`: PASS_WITH_NOTES

| `acceptance_item` | `observed_value` | `evidence_ref` | `coverage_result` |
|---|---|---|---|
| 证据类型：DOM | DOM / computed style facts written to case evidence markdown | verify-logs/evidence/TC-UI-CFG-ALL-BASELINE.md | PASS |
| 证据类型：截图 | Browser screenshot copied from tool temp path to workspace; `file` reports PNG 1474 x 1285 | screenshots/TC-UI-CFG-ALL-BASELINE--config-all-user--config-prompt-row.png | PASS |
| 证据类型：Figma screenshot diff | Runtime screenshot is materialized for design reuse; verify does not perform or claim Figma diff | screenshots/TC-UI-CFG-ALL-BASELINE--config-all-user--config-prompt-row.png | PASS_WITH_NOTES |

#### Pending Recheck Items（待复检项）

| `recheck_id` | `status` | `trigger_result` | `recheck_stage` | `target_assertion` | `reason` | `required_persistent_evidence` | `resume_point` | `owner` |
|---|---|---|---|---|---|---|---|---|
| TC-UI-CFG-ALL-BASELINE__recheck__design_alignment | OPEN | PASS_WITH_NOTES | /delivery:design | visual_assertion / evidence_required | verify 已物化 runtime source，但不得声明 Figma-vs-runtime 对齐通过 | Figma baseline for node `1:9770` + runtime screenshot `screenshots/TC-UI-CFG-ALL-BASELINE--config-all-user--config-prompt-row.png` 的设计对齐记录 | TC-UI-CFG-ALL-BASELINE | design-checker |

#### MTR Real Test Result（真实复测追加）

| field | value |
|---|---|
| mtr_run | `2026-07-13 /delivery:verify --mtr` |
| mtr_boundary | `09-test-case-matrix.md#mock--real-boundary` 标记该 case 无后端响应、无数据 mock 依赖；既有 verify 证据证明前端配置页文案与 link 渲染。 |
| real_action | 本轮用户提供的入口是奖励投放页 `/content-activity/award`，不是配置编辑页；未进入全部用户配置页 fresh rerun。 |
| mtr_evidence_ref | `verify-logs/evidence/mtr-real-recheck-20260713.md#mtr-real-recheck-queue-and-result` |
| mtr_result | `OPEN_REAL_URL_GAP_FOR_FRESH_RERUN` |
| pass_policy | 不用 award 页证据替代配置页 fresh rerun；历史 verify runtime / screenshot 证据保留，设计对齐仍按原 `design_alignment` recheck 处理。 |
| remaining_real_gap | 若要做 MTR fresh rerun，需要提供真实配置编辑页 URL/token 并重新采集 DOM 与截图。 |

#### MTR Config Page Fresh Rerun（真实配置页补验追加）

| field | value |
|---|---|
| mtr_run | `2026-07-13 /delivery:verify --mtr` follow-up：`将所有可以进行验证的配置页上进行验证` |
| real_action | 打开无 `externalLeadsDomainMock=1` 的当前 MTR activity 编辑页 `activity_id=7629288371705643310`，自然点击 `下一步` 进入 `奖励配置`。历史样本 `7649322835323650313` 因结束日期 `2026-07-09` 触发 `结束时间支持最早选到明天`，未计为通过。 |
| mtr_evidence_ref | `verify-logs/evidence/mtr-config-pages-20260713.md#reward-config-dom-evidence`; `verify-logs/evidence/mtr-rerun-activity-7629288371705643310-20260713.md#config-page-fresh-rerun` |
| observed_value | 页面包含 `配置1` 到 `配置6`；提示文案 `奖励发放环节将进行账号校验，命中【不激励】规则的账号无法被发奖` 出现 6 次；`查看【不激励】规则` 链接出现 6 次且 href 均指向 `https://bytedance.larkoffice.com/wiki/TraawmZfSi9dnlk25pBcKhRinUh`；其中 4 个 sections 为全部用户类配置。 |
| negative_observed_value | `不激励数量=false`、`下载名单=false`、`申诉入口=false`、`旧白板占位=false`；`保存草稿` 禁用；浏览器安全捕获 `blockedWrites=[]`。 |
| screenshot_materialization | `verify-logs/screenshots/mtr-rerun-config-7629288371705643310-20260713.png`；activity rerun 已从 Trae temp 目录复制到 workspace，`file` 校验为 `PNG image data, 2022 x 1715, 8-bit/color RGB, non-interlaced`，本 case 可在 Runtime Screenshot Evidence Index 登记为 `materialization_type=local_file`。 |
| mtr_result | `PASS_WITH_NOTES` |
| pass_policy | 关闭此前配置页 `OPEN_REAL_URL_GAP_FOR_FRESH_RERUN` 中本 case 的浏览器可验证部分；设计对齐仍沿用原 `design_alignment` 待复检，且本轮不声明 Figma-vs-runtime 对齐通过。 |
| remaining_real_gap | 无后端 real verify 依赖；仅保留设计对齐和全局 DA/真实写链路等非本 case blocker。 |
