# Verification Case Result

### Case: `TC-CELL-COIN-FIRST-ROW`

- `order`: 8
- `verification_stage`: verify+design
- `priority`: normal
- `contract_ref`: Cell:DOU+币剔除明细/作品内容/原因/时间/操作人
- `source_verify_report`: ../../06-debug-verification.md
- `updated_at`: 2026-07-17T00:00:00Z
- `verification_target`: DOU+币剔除明细默认列表首行的作品内容、剔除发奖原因、剔除发奖时间和操作人 cell renderer
- `acceptance_steps`:
  - DOU+币剔除明细默认请求返回至少一条记录
  - 对首行作品内容、原因、时间、操作人逐格比对
  - 期望：作品内容含封面/标题/ID，原因来自 `remove_reason`，时间由 `remove_time` 格式化，操作人为 PeopleCard 或 `-`
- `verification_process`:
  - 复用 `TC-UI-COIN-REMOVE-PAGE` 的默认列表运行态 source：自然 UI 点击 `剔除明细` 后命中 `R-BAM-COIN-REMOVE-DEFAULT`，mock response 返回一条 DOU+币剔除记录
  - 回读 runtime evidence 的 firstRow、headers、forbidden text absence、PeopleCard request fact 和 local screenshot
  - 新增 `TC-CELL-COIN-FIRST-ROW--source-evidence.md`，记录作品复合 cell、原因、时间、操作人 renderer 实现
  - 逐项对账 positive_assertion、negative_assertion、visual_assertion、negative_visual_assertion、evidence_required
- `ui_condition_completion`: not_triggered
- `write_interface_gate`: PASS；复用 `apiGetDouPlusCoinRemoveRecord` / `R-BAM-COIN-REMOVE-DEFAULT` 已通过 `patch.status=patched`、`rehydration.status=passed`、`finalVerification.status=passed`
- `fixture_fallback`: not_triggered
- `mock_handling`: effective_verify_mode=MOCK_PREVIEW; ruleId=`R-BAM-COIN-REMOVE-DEFAULT`; apiName=`apiGetDouPlusCoinRemoveRecord`; requestBody=`activity_id=7655304206886322458,config_id=7655304206886338842,page=1,page_num=20`; mockedResponse=`records.length=1,total=40,has_more=true`; detour result=`delivery-mock.md` PASS
- `auto_fix_handling`: N/A
- `final_result`: PASS_WITH_NOTES
- `evidence_summary`: Runtime mock-preview first-row title/id/reason/time are visible; source evidence confirms renderer wiring for cover/title/id, reason, formatted time and PeopleCard. 2026-07-17 `配置五` MTR adds a real non-empty first row with `ID: 7641951590119486066`, `2026/07/06 16:46:52`, `内容质量不佳`, and operator `陈相`, closing the previous real non-empty first-row and operator readable-text data gap.
- `residual_risk`: `/delivery:design` has already handled cell layout alignment. The `配置五` real sample uses normal `-` fallback for title/cover, so a rich title/cover real sample remains useful but non-blocking; multi-page pagination / interactive sort and broader real ordering are still unproven.
- `next_step`: continue verify queue with next non-terminal case `TC-INT-REMOVE-TAB-SWITCH-COIN`

#### Runbook Sync（Runbook 同步）

- `case_id`: TC-CELL-COIN-FIRST-ROW
- `runbook_ref`: verify-logs/browser-verify-runbook.json#TC-CELL-COIN-FIRST-ROW
- `runbook_status`: updated
- `entry_url`: https://ecop.bytedance.net/alliance-operation-content/content-activity/award?activity_id=7655304206886322458&cjDebugSubApp=alliance-operation-content%3Ahttp%3A%2F%2Flocalhost%3A8083%2Falliance-operation-content&externalLeadsDomainMock=1&cjSiteCode=St12502250000001
- `sample_params`: runtime_state=coin-table-loaded; capture_scope=table-header-first-row; ruleId=R-BAM-COIN-REMOVE-DEFAULT; activity_id=7655304206886322458; config_id=7655304206886338842
- `step_changes`: reused default-list runtime source captured by `TC-UI-COIN-REMOVE-PAGE`; added source evidence for cell renderers
- `assertion_changes`: positive/negative/visual/evidence_required records aligned to runtime JSON, reused screenshot and source evidence
- `evidence_alignment`: aligned_for_verify_runtime; design_alignment_closed; operator_readable_text_mtr_closed
- `notes`: Historical mock-preview capture did not render readable employee text, but 2026-07-17 `配置五` real DOM rendered operator `陈相`.

#### Evidence Reconciliation（证据对账）

##### Assertion（断言）：`positive_assertion`

- `case_id`: TC-CELL-COIN-FIRST-ROW
- `evidence_requirement_id`: TC-CELL-COIN-FIRST-ROW__positive_assertion
- `assertion_ref`: positive_assertion
- `verification_status`: EXECUTED
- `execution_ref`: Reused natural UI default-list first row + source renderer evidence
- `recording_status`: RECORDED
- `evidence_type`: UI/DOM+screenshot+source
- `coverage_result`: PASS_WITH_NOTES

| `acceptance_item` | `observed_value` | `evidence_ref` | `coverage_result` |
|---|---|---|---|
| 作品内容含标题/ID | Runtime first row text contains `夏日穿搭短视频示例` and `ID: 100001`; source renderer reads title/id from `item_card` | verify-logs/evidence/TC-UI-COIN-REMOVE-PAGE--mock-hit-runtime.json; verify-logs/evidence/TC-CELL-COIN-FIRST-ROW--source-evidence.md | PASS |
| 作品内容封面 renderer | Source renderer uses `SmallerImage` with 40x60 cover when `cover.url_list[0]` exists; screenshot records first-column composite cell runtime source | verify-logs/evidence/TC-CELL-COIN-FIRST-ROW--source-evidence.md; screenshots/TC-UI-COIN-REMOVE-PAGE--remove-detail-coin-default--mock-hit.png | PASS_WITH_NOTES |
| 原因来自 `remove_reason` | Runtime first row contains `命中【不激励】规则`; source renderer reads `record.remove_reason || '-'` | verify-logs/evidence/TC-UI-COIN-REMOVE-PAGE--mock-hit-runtime.json; verify-logs/evidence/TC-CELL-COIN-FIRST-ROW--source-evidence.md | PASS |
| 时间由 `remove_time` 格式化 | Runtime first row contains `2026/07/08 18:56:57`; source renderer uses `dayjs.unix(remove_time).format('YYYY/MM/DD HH:mm:ss')` | verify-logs/evidence/TC-UI-COIN-REMOVE-PAGE--mock-hit-runtime.json; verify-logs/evidence/TC-CELL-COIN-FIRST-ROW--source-evidence.md | PASS |
| 操作为 PeopleCard 或 `-` | Source renderer uses `PeopleCard` when `operator_id` exists and `-` when absent; runtime evidence observed PeopleCard default image resource request, but readable employee text did not appear | verify-logs/evidence/TC-UI-COIN-REMOVE-PAGE--mock-hit-runtime.json; verify-logs/evidence/TC-CELL-COIN-FIRST-ROW--source-evidence.md | PASS_WITH_NOTES |

##### Assertion（断言）：`negative_assertion`

- `case_id`: TC-CELL-COIN-FIRST-ROW
- `evidence_requirement_id`: TC-CELL-COIN-FIRST-ROW__negative_assertion
- `assertion_ref`: negative_assertion
- `verification_status`: EXECUTED
- `execution_ref`: Runtime first-row/header scan + source renderer evidence
- `recording_status`: RECORDED
- `evidence_type`: UI/DOM+screenshot+source
- `coverage_result`: PASS

| `acceptance_item` | `observed_value` | `evidence_ref` | `coverage_result` |
|---|---|---|---|
| 不展示充值记录 | Runtime forbidden text absence includes `充值记录`; cell source contains no recharge renderer | verify-logs/evidence/TC-UI-COIN-REMOVE-PAGE--mock-hit-runtime.json; verify-logs/evidence/TC-CELL-COIN-FIRST-ROW--source-evidence.md | PASS |
| 不展示投放状态 | Runtime headers whitelist has no `投放状态`; cell source contains no delivery status renderer | verify-logs/evidence/TC-UI-COIN-REMOVE-PAGE--mock-hit-runtime.json; verify-logs/evidence/TC-CELL-COIN-FIRST-ROW--source-evidence.md | PASS |
| 不展示处罚原因 | Runtime headers whitelist has no `处罚原因`; source reason column uses `remove_reason`, not penalty reason | verify-logs/evidence/TC-UI-COIN-REMOVE-PAGE--mock-hit-runtime.json; verify-logs/evidence/TC-CELL-COIN-FIRST-ROW--source-evidence.md | PASS |
| 不展示裸 operator_id | Runtime `operatorIdTextVisible=false`; source operator renderer uses `PeopleCard` or `-` and does not render raw `operator_id` text | verify-logs/evidence/TC-UI-COIN-REMOVE-PAGE--mock-hit-runtime.json; verify-logs/evidence/TC-CELL-COIN-FIRST-ROW--source-evidence.md | PASS |

##### Assertion（断言）：`visual_assertion`

- `case_id`: TC-CELL-COIN-FIRST-ROW
- `evidence_requirement_id`: TC-CELL-COIN-FIRST-ROW__visual_assertion
- `assertion_ref`: visual_assertion
- `verification_status`: EXECUTED
- `execution_ref`: Runtime first-row screenshot + source renderer evidence
- `recording_status`: RECORDED
- `evidence_type`: UI/DOM+screenshot+source
- `coverage_result`: PASS_WITH_NOTES

| `acceptance_item` | `observed_value` | `evidence_ref` | `coverage_result` |
|---|---|---|---|
| 作品复合 cell 采用 existing coin delivery renderer 风格的 runtime source | Source uses `SmallerImage` + title/id vertical layout; screenshot records first-column composite cell. Verify records runtime/source facts only and leaves Figma-vs-runtime alignment to `/delivery:design` | verify-logs/evidence/TC-CELL-COIN-FIRST-ROW--source-evidence.md; screenshots/TC-UI-COIN-REMOVE-PAGE--remove-detail-coin-default--mock-hit.png | PASS_WITH_NOTES |

##### Assertion（断言）：`negative_visual_assertion`

- `case_id`: TC-CELL-COIN-FIRST-ROW
- `evidence_requirement_id`: TC-CELL-COIN-FIRST-ROW__negative_visual_assertion
- `assertion_ref`: negative_visual_assertion
- `verification_status`: EXECUTED
- `execution_ref`: Runtime/source negative scan for author-style structures
- `recording_status`: RECORDED
- `evidence_type`: UI/DOM+screenshot+source
- `coverage_result`: PASS

| `acceptance_item` | `observed_value` | `evidence_ref` | `coverage_result` |
|---|---|---|---|
| 不出现作者头像/昵称结构 | Source first cell uses item cover/title/id, not `author_info`; runtime headers and first row are DOU+币作品 content, not DOU+券作者信息 | verify-logs/evidence/TC-CELL-COIN-FIRST-ROW--source-evidence.md; verify-logs/evidence/TC-UI-COIN-REMOVE-PAGE--mock-hit-runtime.json | PASS |

##### Assertion（断言）：`evidence_required`

- `case_id`: TC-CELL-COIN-FIRST-ROW
- `evidence_requirement_id`: TC-CELL-COIN-FIRST-ROW__evidence_required
- `assertion_ref`: evidence_required
- `verification_status`: EXECUTED
- `execution_ref`: Evidence reuse and materialization check
- `recording_status`: RECORDED
- `evidence_type`: UI/DOM+screenshot+source
- `coverage_result`: PASS_WITH_NOTES

| `acceptance_item` | `observed_value` | `evidence_ref` | `coverage_result` |
|---|---|---|---|
| 证据类型：DOM | Runtime DOM firstRow, headers, forbidden text absence and PeopleCard request facts are persisted in reused default-list evidence | verify-logs/evidence/TC-UI-COIN-REMOVE-PAGE--mock-hit-runtime.json | PASS |
| 证据类型：截图 | Reused runtime screenshot is materialized as a local PNG under workspace `screenshots/` and shows default DOU+币 remove table first row | screenshots/TC-UI-COIN-REMOVE-PAGE--remove-detail-coin-default--mock-hit.png | PASS |
| 证据类型：computed style | Direct computed-style probe for each cell was not separately captured; source + screenshot cover renderer structure, while design-grade spacing/alignment remains `/delivery:design` | verify-logs/evidence/TC-CELL-COIN-FIRST-ROW--source-evidence.md; screenshots/TC-UI-COIN-REMOVE-PAGE--remove-detail-coin-default--mock-hit.png | PASS_WITH_NOTES |
| 证据复用边界 | Reuse is valid for default unfiltered `R-BAM-COIN-REMOVE-DEFAULT`; it does not close readable PeopleCard text/avatar, Figma alignment or real backend ordering | verify-logs/evidence/TC-CELL-COIN-FIRST-ROW--source-evidence.md; verify-logs/case-results/TC-UI-COIN-REMOVE-PAGE.md | PASS_WITH_NOTES |

#### Pending Recheck Items（待复检项）

| `recheck_id` | `status` | `trigger_result` | `recheck_stage` | `target_assertion` | `reason` | `required_persistent_evidence` | `resume_point` | `owner` |
|---|---|---|---|---|---|---|---|---|
| TC-CELL-COIN-FIRST-ROW__recheck__design_alignment | CLOSED_PASS | PASS_WITH_NOTES | /delivery:design | visual_assertion / evidence_required | verify 阶段只保存 runtime source，不声明 Figma-vs-runtime 对齐通过；direct computed style 未单独采集 | `07-design-alignment.md` 已引用 Figma node data、runtime screenshot `screenshots/TC-DATA-COIN-COLUMNS--design-rerun--coin-table-header.png`、current browser DOM/computed style and source renderer evidence，并完成 cell-level Figma-vs-runtime 对比 | TC-CELL-COIN-FIRST-ROW | design-checker |
| TC-CELL-COIN-FIRST-ROW__recheck__operator_peoplecard_text | CLOSED_MTR_PASS_WITH_NOTES | PASS_WITH_NOTES | real verify | positive_assertion | 2026-07-17 `配置五` 真实首行 operator 渲染为 `陈相`，已关闭可读操作人文本缺口；该样本未证明头像 hover / PeopleCard 展开态 | `verify-logs/evidence/mtr-real-recheck-config5-20260717.md`; `verify-logs/screenshots/mtr-coin-remove-config5-nonempty-20260717.png` | TC-CELL-COIN-FIRST-ROW | main-agent |
| TC-CELL-COIN-FIRST-ROW__recheck__real_backend_order | PARTIAL_CLOSED_WITH_NOTES | PASS_WITH_NOTES | real verify | positive_assertion / evidence_required | 2026-07-17 `配置五` 已闭合真实非空首行 ID / 时间 / 原因 / 操作人；该样本 `has_more=false` 且仅 6 行，不能证明多页排序，title/cover 也为正常 fallback | `verify-logs/evidence/mtr-real-recheck-config5-20260717.md`; `verify-logs/screenshots/mtr-coin-remove-config5-nonempty-20260717.png` | TC-CELL-COIN-FIRST-ROW | main-agent |

#### MTR Real Test Result（真实复测追加）

| field | value |
|---|---|
| mtr_run | `2026-07-17 /delivery:verify --mtr` follow-up（基线 MTR 为 `2026-07-13`；同日追加 `配置五` 非空样本） |
| real_action | 无 `externalLeadsDomainMock=1` 页面先验证 `配置一` 空态与筛选请求；随后在用户指定入口切到 `配置五 / DOU+币 / 剔除明细`，自然 UI 点击 `查询`。 |
| real_response | `配置五` 默认读 response summary 为 HTTP `200`、`st=0`、`code=0`、`total=6`, `recordCount=6`, `has_more=false`。 |
| real_dom | 首行显示 `ID: 7641951590119486066`、`2026/07/06 16:46:52`、`内容质量不佳`、操作人 `陈相`；作品 title/cover 为该真实样本的正常 `-` fallback。 |
| mtr_evidence_ref | `verify-logs/evidence/mtr-real-recheck-20260713.md#dou币剔除明细默认读取`; `verify-logs/evidence/mtr-real-recheck-20260717.md#result-by-case`; `verify-logs/evidence/mtr-real-recheck-config5-20260717.md`; `verify-logs/screenshots/mtr-coin-remove-config5-nonempty-20260717.png` |
| mtr_result | `PASS_WITH_NOTES` |
| remaining_real_gap | 真实非空首行 ID / 时间 / 原因 / 操作人已闭合；title/cover 非空样本、PeopleCard hover/头像、多页分页和交互排序仍未覆盖。 |
