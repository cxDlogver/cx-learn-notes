# 05 Implementation Log

> stage: `/delivery:code`
> workspace: `artifacts/7306602080-incentive-control-online`
> target_repo: `/Users/bytedance/cx/spec-2/meego-11/meego-7306602080/repos/alliance-operation-mono`
> execution_branch: `cx-3`
> implementation_mode: `MOCK_PREVIEW`

## Precheck Summary

| item | result | evidence |
|---|---|---|
| PRD analysis | PASS | `03-prd-analysis.md` status DONE; no P0 blocker |
| Plan readiness | PASS_WITH_APPROVED_PARTIAL | `04-tech-plan.md` Plan Readiness `PARTIAL_READY`; Implementation Mode `MOCK_PREVIEW`; user explicitly allowed `/delivery:code` |
| Task readiness | PASS | `delivery-task.md` Task Readiness PASS; 8 executable `### Task N` entries |
| Test coverage | PASS | `09-test-case-matrix.md` Coverage Result PASS |
| Mock-preview matrix | PASS | `Test Case Matrix`, `BAM Mock Response Field Coverage Matrix`, `Mock Preview Scope`, `Mock / Real Boundary` are present |
| Design blocker | PASS | no `07-design-alignment.md`; plan says no design rework handoff |
| Handoff mode | N/A | no `code-fix-handoff.md` |
| Execution workspace | PASS | `.trae/DELIVERY_STATE.md` Execution State ready; business repo branch `cx-3`; repo clean before implementation |

## 实现范围

本轮按 `delivery-task.md` 中既有 `TASK-001` 到 `TASK-008` 串行执行，不新增、不合并、不跳过任务，不因 BAM/IDL 字段差异压缩 PRD 范围。业务代码只走真实 page -> store -> service -> BAM wrapper；Code 阶段不生成或调整 mock runtime，不调用浏览器，不写 `delivery-mock.md`。

## 被排除或后置验证范围

| scope | reason | recovery |
|---|---|---|
| BAM runtime mock 生成/调整 | Code 阶段禁止 mock runtime 与 BAM marker patch | `/delivery:verify` 自然 UI 请求触发 `/delivery:mock` |
| 真实治理处罚状态与发奖事务一致性 | MOCK_PREVIEW 下只能验证前端 response branch | 后端 ready 后 real verify |
| 正式规则链接 URL/token | Ask First 确认可指向讨论材料，但最终 URL/token仍为 P1 review | verify/real review 中复核 |
| DA/UV 聚合口径 | Code 只复用现有 logger 模式 | 数据验收时与 DA 平台核对 |

## Requirement 到代码文件映射

| requirement_id | planned files |
|---|---|
| AR-001, AR-002, AR-015 | `apps/alliance-operation-content/src/routes/content-activity/edit/components/step-reward-config/index.tsx`; `index.module.scss` |
| AR-011, AR-012, AR-013, AR-014, AR-017 | `apps/alliance-operation-content/src/routes/content-activity/award/components/send-award/index.tsx`; new remove-record table components |
| AR-006, AR-007, AR-008, AR-009, AR-010, AR-016 | `manuallySubmitVideoStore.ts`; manual submit drawer/form files |
| AR-003, AR-004, AR-005 | award submit modal/stores around existing DOU+币/券 wrappers |

## Figma / UI 执行检查清单

| task_id | UI item | UI Evidence Mode | evidence_ref | execution_status | verify/browser recheck |
|---|---|---|---|---|---|
| TASK-001 | 配置页全部用户态提示与 link | F2C_REQUIRED | D2C XML/JPG for node `1:9770` retained in `code-review/d2c-evidence/task-TASK-001/1_9770/`; Figma MCP `1:10202`; screenshot `figma-cache/screenshots/1_9770-config-all-user-after.png` | CODE_IMPLEMENTED_REVIEW_PASS | `/delivery:verify` DOM exact text + screenshot + click |
| TASK-002 | 配置页预埋名单态提示与 link | F2C_REQUIRED | D2C XML/JPG for node `1:10938` retained in `code-review/d2c-evidence/task-TASK-002/1_10938/`; XML confirms selected `仅限预埋用户` and `预埋用户名单` before `内容体裁要求` | CODE_IMPLEMENTED | DOM exact text + screenshot + click |
| TASK-003 | DOU+币剔除明细 Tab/筛选/表格 | RUNTIME_BASELINE_ALLOWED | Figma/cache `1:12120`; existing EcopTable/coin renderer baseline | CODE_IMPLEMENTED_REVIEW_PASS | `/delivery:verify` Network + DOM + screenshot；code 阶段 build/diff/static scan PASS |
| TASK-004 | DOU+券剔除明细 Tab/筛选/表格 | RUNTIME_BASELINE_ALLOWED | Figma/cache `1:12390`; existing EcopTable/coupon renderer baseline | CODE_IMPLEMENTED_REVIEW_PASS | `/delivery:verify` Network + DOM + screenshot；code 阶段 build/diff/static scan PASS |
| TASK-005 | 人工提报命中态 summary/action/row/footer | F2C_REQUIRED | D2C XML/JPG retained in `code-review/d2c-evidence/task-TASK-005/`; XML confirms summary `87:6998`, action order `一键移除` -> `导出剔除明细`, red labels `87:7028`/`87:7113`, footer `取消` -> `提交并投放`; parent preview excluded | CODE_IMPLEMENTED_REVIEW_PASS | `/delivery:verify` interactions + DOM + screenshot + Network no-call |
| TASK-006 | 批量上传命中复用 | RUNTIME_BASELINE_ALLOWED | nodes `25:13971`, `101:6308`, `101:6332`; AF-003 | CODE_CONSUMED | batch upload case |
| TASK-007 | 发奖前剔除逻辑 | N/A | PRD 3.2; BAM wrappers; COPY-TIMEOUT/COPY-EXCEPTION | PARTIAL_VERIFIED_WITH_NOTES | coin/coupon penalty + relieved + timeout Network/message/no-success branches recorded；exception/empty-list pending |
| TASK-008 | 埋点 | N/A | PRD tracking table; existing operation-logger usage | CODE_IMPLEMENTED_REVIEW_PASS | logger spy/runtime event |

## PRD / Figma Semantic Alignment Matrix

详见 `code-review/context-index.md`。当前派发前结论：TASK-001..TASK-005/TASK-007 为 `MATCHED`；TASK-006/TASK-008 为 `MATCHED_WITH_LIMITATION`，限制项已由 AF-003 或 EX-RI-004 覆盖。

## Task Context Index

- `code-review/context-index.md`

## Task Review Packet 引用

| task_id | packet | status |
|---|---|---|
| TASK-001 | `code-review/task-TASK-001-review-packet.md` | DONE |
| TASK-002 | `code-review/task-TASK-002-review-packet.md` | DONE |
| TASK-003 | `code-review/task-TASK-003-review-packet.md` | DONE |
| TASK-004 | `code-review/task-TASK-004-review-packet.md` | DONE |
| TASK-005 | `code-review/task-TASK-005-review-packet.md`; independent review `code-review/task-TASK-005-independent-review.md` | DONE |
| TASK-006 | `code-review/task-TASK-006-review-packet.md`; independent review `code-review/task-TASK-006-independent-review.md` | DONE |
| TASK-007 | `code-review/task-TASK-007-review-packet.md`; independent review `code-review/task-TASK-007-independent-review.md`; review fix packet `code-review/task-TASK-007-review-fix-packet.md` | DONE |
| TASK-008 | `code-review/task-TASK-008-dispatch-packet.md`; review packet `code-review/task-TASK-008-review-packet.md`; independent review `code-review/task-TASK-008-independent-review.md` | DONE |

## Task Dispatch / Review Ledger

| task_id | dispatch | code-writer result | checkbox delta | independent review | verification/typecheck | BAM matrix check | main gate | checkpoint_commit |
|---|---|---|---|---|---|---|---|---|
| TASK-001 | BOUNDED_PACKET | PASS + D2C_MINOR_FIX_PASS | 6/6 TASK-001 checkboxes checked | PASS (`delivery_code_task_001_independent_review`) | `pnpm_config_verify_deps_before_run=false pnpm --dir .../apps/alliance-operation-content build` PASS after final diff; raw pnpm wrapper hit deps precheck install issue before build; `git diff --check` PASS; targeted debug scan PASS | N/A no runtime mock | PASS | `6724b377b` |
| TASK-002 | BOUNDED_PACKET | PASS | 5/5 TASK-002 checkboxes checked | PASS (`delivery_code_task_002_independent_review`) | `pnpm_config_verify_deps_before_run=false pnpm --dir .../apps/alliance-operation-content build` PASS after D2C verify and post-commit; `git diff --check` PASS; targeted debug/mock scan PASS | N/A no runtime mock | PASS | `8e2143f50` |
| TASK-003 | BOUNDED_PACKET | PASS | 6/6 TASK-003 checkboxes checked | PASS (`delivery_code_task_003_independent_review`) | `pnpm_config_verify_deps_before_run=false pnpm --dir .../apps/alliance-operation-content build` PASS by code-writer, main Agent pre-commit, and post-commit recheck; business repo `git diff --check` PASS; touched-file trailing whitespace scan PASS; targeted debug/mock scan PASS | Existing matrix rows for `R-BAM-COIN-REMOVE-DEFAULT/FILTER`; no `补充说明` update needed | PASS | `800d8bbd4` |
| TASK-004 | BOUNDED_PACKET | PASS | 6/6 TASK-004 checkboxes checked | PASS (`delivery_code_task_004_independent_review`) | `pnpm_config_verify_deps_before_run=false pnpm --dir .../apps/alliance-operation-content build` PASS by code-writer, main Agent pre-commit, and post-commit recheck; business repo `git diff --check` PASS; touched-file trailing whitespace scan PASS; targeted debug/mock scan PASS | Existing matrix rows for `R-BAM-COUPON-REMOVE-DEFAULT/FILTER`; no `补充说明` update needed | PASS | `cf6ca596b` |
| TASK-005 | BOUNDED_PACKET + REPAIR_REPLAY | PASS + REPAIR_PASS + REPAIR-005_PASS | 8/8 original TASK-005 checkboxes checked; REPAIR-002/003/004 checked after first repair replay; REPAIR-005 checked after second-round replay | PASS (`delivery_code_task_005_independent_review`); first repair reviewer `repair_code_review_scope_check` PASS; second-round read-only repair review PASS with runtime case left to verify | Repair replay: `pnpm_config_verify_deps_before_run=false pnpm --dir .../apps/alliance-operation-content build` PASS; scoped `git diff --check` PASS; REPAIR-005 static RED/GREEN check PASS; targeted `apiCandidateRemove` scan shows only post-success award modal path; debug/mock marker scan clean | Repair matrix: manual one-click uses `NONE/no candidate_remove`; export-after-remove uses `R-BAM-DOWNLOAD-REMOVE-RECORD` and now asserts visible summary, disabled `一键移除`, enabled export; no manual `R-BAM-CANDIDATE-REMOVE-SUCCESS` dependency remains | PASS | `dbab003d7` + repair replay; second-round completion commit pending repair-result |
| TASK-006 | BOUNDED_PACKET | PASS_BY_CODE_WRITER | 4/4 TASK-006 checkboxes checked | PASS (`delivery_code_task_006_independent_review`) | `pnpm_config_verify_deps_before_run=false pnpm --dir .../apps/alliance-operation-content build` PASS by code-writer, main Agent final-diff rerun, and post-commit recheck; first code-writer run failed on local JSX ternary syntax and was fixed in-scope, rerun PASS total `28765.3 kB (gzip: 6633.0 kB)`; business repo `git diff --check` PASS; targeted forbidden scan PASS | Existing matrix row for `R-BAM-BATCH-SHEET-HIT`; no `补充说明` update needed from code layer; runtime mock closure remains `/delivery:verify` dependency | PASS | `34df2301a` |
| TASK-007 | BOUNDED_PACKET + REVIEW_FIX_PACKET + REPAIR_REPLAY | PASS_BY_CODE_WRITER_AND_FIX + REPAIR_PASS | 5/5 original TASK-007 checkboxes checked; REPAIR-001 checked after repair replay | PASS (`delivery_code_task_007_final_independent_review`); repair reviewer `repair_code_review_scope_check` PASS after classifying upload-failure retry as non-blocking P2 under current contract | Repair replay: `pnpm_config_verify_deps_before_run=false pnpm --dir .../apps/alliance-operation-content build` PASS; scoped `git diff --check` PASS; targeted scan confirms `apiCandidateRemove` only in post-success upload helper | Existing award ruleIds remain; repair adds `TC-INT-AWARD-SUCCESS-UPLOAD-NO-AWARD-LIST/R-BAM-CANDIDATE-REMOVE-SUCCESS`; runtime mock closure remains `/delivery:verify` dependency | PASS_WITH_P2_RISK | `4de5257d5` + repair replay |
| TASK-008 | BOUNDED_PACKET | PASS_BY_CODE_WRITER | 5/5 TASK-008 checkboxes checked | PASS (`delivery_code_task_008_independent_review`); `element_type: 'link' as any` accepted as non-blocking P2/P1 follow-up pending DA/type enum review | `pnpm_config_verify_deps_before_run=false pnpm --dir .../apps/alliance-operation-content build` PASS by code-writer and post-commit recheck total `28784.2 kB (gzip: 6637.1 kB)`; business repo `git diff --check` PASS by code-writer and main Agent rerun; targeted forbidden marker scan PASS with exit code 1 and no output | Logger itself has no BAM runtime mock; visible states reuse existing manual-hit and remove-detail BAM rows; no `09-test-case-matrix.md` update needed | PASS | `a7e881ce3` |

### TASK-001 Execution Record

| item | result | evidence |
|---|---|---|
| F2C / D2C evidence | CONSUMED | XML `1:10202` spans show grey prompt `#BCBDC0`, blue link `#0088FF`, placement under audience target row before material requirements |
| Link target | RESOLVED | `prd-source/raw/lark_parser_strict.md:60` contains `https://bytedance.larkoffice.com/wiki/TraawmZfSi9dnlk25pBcKhRinUh?from=from_copylink` for【电商内容生态激励管控讨论】 |
| Implementation | DONE | `step-reward-config/index.tsx` adds reusable `NoIncentiveRulePrompt` and mounts it via `has_select_crowd === false` extra only |
| Scope guard | PASS | No API request, runtime mock, 不激励数量、下载名单、申诉入口, TASK-002 预埋名单 prompt, or tracking Task 8 changes added |
| Verification | PASS_WITH_ENV_NOTE | Raw `pnpm --dir ... build` failed in pnpm `verify-deps-before-run` install precheck due workspace package resolution; rerun with `pnpm_config_verify_deps_before_run=false` completed Eden build successfully |
| D2C verify | PASS_WITH_MINOR_FIXED | `d2c_verify_code` verdict Excellent; 0 critical / 0 moderate / 1 minor; redundant anchor `window.open` handler removed by targeted code-writer fix |
| Independent review | PASS | 独立只读 reviewer 确认 scope、PRD/Figma 语义、UI Evidence Mode、mock boundary、verification freshness 均通过；DOM/截图/click 留给 `/delivery:verify` / `/delivery:design` |
| D2C cleanup | DONE_WITH_DURABLE_ARCHIVE | 本次 TASK-001 必要 D2C XML/JPG 已重新获取并归档到 `code-review/d2c-evidence/task-TASK-001/1_9770/`；源 `.d2c_temp` 仅作为临时来源，可清理 |
| Checkpoint commit | DONE | business repo commit `6724b377b feat(content-activity): add all-user incentive rule prompt`; final checkpoint patch archived at `code-review/task-TASK-001-checkpoint-diff.patch` |

### TASK-002 Execution Record

| item | result | evidence |
|---|---|---|
| F2C / D2C evidence | RETAINED | D2C archive `code-review/d2c-evidence/task-TASK-002/1_10938/` shows selected `仅限预埋用户` and labels `预埋用户名单` before `内容体裁要求`; preview JPG confirms placement |
| Implementation | DONE | Reused existing `NoIncentiveRulePrompt` and mounted it as `extra` on visible `crowd_id` / `ParticipantSelector` form item when `has_select_crowd` is true |
| Scope guard | PASS | Did not alter TASK-001 全部用户态 branch, reward config data model, backend request, runtime mock, generated files, or browser state |
| Verification | PASS | `pnpm_config_verify_deps_before_run=false pnpm --dir .../apps/alliance-operation-content build` PASS; business repo `git diff --check` PASS |
| D2C verify | PASS | `d2c_verify_code` verdict Excellent; 0 issues |
| Independent review | PASS | 独立只读 reviewer 确认 scope、PRD/Figma 语义、UI Evidence Mode、mock boundary、verification freshness 均通过；DOM/截图/click 留给 `/delivery:verify` / `/delivery:design` |
| D2C cleanup | DONE_WITH_DURABLE_ARCHIVE | TASK-002 必要 D2C XML/JPG 已重新获取并归档到 `code-review/d2c-evidence/task-TASK-002/1_10938/`；源 `.d2c_temp` 已清理 |
| Checkpoint commit | DONE | business repo commit `8e2143f50 feat(content-activity): add prefilled incentive rule prompt`; final checkpoint patch archived at `code-review/task-TASK-002-checkpoint-diff.patch`; post-commit build PASS total `28708.7 kB (gzip: 6622.8 kB)` |
| Pending runtime evidence | PENDING | `/delivery:verify` / `/delivery:design` should confirm DOM exact copy, screenshot placement under 预埋用户名单, and native anchor click target |

### TASK-003 Execution Record

| item | result | evidence |
|---|---|---|
| Task scope | DONE | Only implemented `TASK-003` AR-011/AR-012; did not implement DOU+券 table, TASK-008 logging, mock runtime, BAM generated files, or fixture/fake success |
| SubTab wiring | DONE | `send-award/index.tsx` adds `SubTab.REMOVE_DETAIL = 剔除明细`, renders third Radio button, keeps `奖励下发`/`投放明细` clickable, and uses empty metadata for the new tab to avoid pre-implementing TASK-008 logger |
| Coin remove table | DONE | New `dou-coin-remove-record-table/index.tsx` uses EcopTable, imported `filterEmpty`, PeopleSelect/PeopleCard, SmallerImage, and dayjs patterns from existing DOU+币 delivery table |
| Columns / cells | DONE | Columns are limited to `作品内容` / `剔除发奖原因` / `剔除发奖时间` / `操作人`; `item_card` title/id/cover missing state renders `-`; `remove_time` uses `dayjs.unix(remove_time).format('YYYY/MM/DD HH:mm:ss')` |
| Request / pagination | DONE | Only calls `apiGetDouPlusCoinRemoveRecord`; maps EcopTable `current/pageSize` to `page/page_num` and forwards `activity_id/config_id/candidate_ids/operator_id`; no client-only pagination |
| Mock boundary | PASS_WITH_VERIFY_DEPENDENCY | BAM matrix already has `TC-UI-COIN-REMOVE-PAGE/R-BAM-COIN-REMOVE-DEFAULT` and `TC-DATA-COIN-FILTER-SCHEMA/R-BAM-COIN-REMOVE-FILTER`; mock runtime closure remains `/delivery:verify` dependency |
| Verification | PASS | `pnpm_config_verify_deps_before_run=false pnpm --dir /Users/bytedance/cx/spec-2/meego-11/meego-7306602080/repos/alliance-operation-mono/apps/alliance-operation-content build` PASS; `git -C .../alliance-operation-mono diff --check` PASS; targeted scan found no console/debugger/mock runtime/fixture/fake-success markers |
| Independent review | PASS | 独立只读 reviewer 确认 task scope、PRD/Figma 语义、UI Evidence Mode、真实 wrapper request、mock 边界均通过；P1 提醒 DOU+券 `剔除明细` 在 TASK-004 前为短暂空内容，必须按串行队列继续闭合 |
| Main gate | PASS | 主 Agent 复核 diff、TASK-003 checkbox、review packet、独立审查和构建；不压缩 TASK-004..TASK-008 范围，下一步 checkpoint 后继续 TASK-004 |
| Checkpoint commit | DONE | business repo commit `800d8bbd4 feat(content-activity): add coin removal detail table`; commit hook ran `emox prettier --write` and `emox eslint`; post-commit build PASS total `28721.3 kB (gzip: 6624.9 kB)` |
| Pending runtime evidence | PENDING | `/delivery:verify` should click DOU+币 `剔除明细`, assert Network request params, DOM table headers/cells, pagination request changes, and screenshot alignment to IMG5 |

### TASK-004 Execution Record

| item | result | evidence |
|---|---|---|
| Task scope | DONE | Only implemented `TASK-004` AR-013/AR-014; did not implement TASK-005+ manual submit flows, TASK-008 logging, mock runtime, BAM generated files, fixture/fake success, preview service, or fallback store |
| SubTab wiring | DONE | `send-award/index.tsx` reuses `SubTab.REMOVE_DETAIL` and adds only the DOU+券 render branch for `DouPlusCouponRemoveRecordTable`, leaving the existing DOU+币 remove table condition unchanged |
| Coupon remove table | DONE | New `dou-coupon-remove-record-table/index.tsx` uses EcopTable, `filterEmpty`, PeopleSelect/PeopleCard, SmallerImage, Tooltip/Space, and dayjs patterns from the existing DOU+券投放明细 table |
| Filters / request schema | DONE | Search labels are `作者ID` and `操作人`; `作者ID` maps to IDL request field `candidate_ids` with an inline comment; request calls only `apiGetDouPlusCouponRemoveRecord` with `activity_id/config_id/page/page_num/candidate_ids/operator_id` |
| Columns / cells | DONE | Columns are limited to `作者信息` / `剔除发奖原因` / `剔除发奖时间` / `操作人`; `author_info` renders avatar/name/id with normal `-` empty state, `remove_time` uses `dayjs.unix(remove_time).format('YYYY/MM/DD HH:mm:ss')`, and `operator_id` uses PeopleCard |
| Request / pagination | DONE | EcopTable `current/pageSize` maps to real `page/page_num`; no client-only pagination or local filtering added |
| Mock boundary | PASS_WITH_VERIFY_DEPENDENCY | BAM matrix already has `TC-UI-COUPON-REMOVE-PAGE/R-BAM-COUPON-REMOVE-DEFAULT` and `TC-DATA-COUPON-FILTER-SCHEMA/R-BAM-COUPON-REMOVE-FILTER`; mock runtime closure remains `/delivery:verify` dependency |
| Verification | PASS | `pnpm_config_verify_deps_before_run=false pnpm --dir /Users/bytedance/cx/spec-2/meego-11/meego-7306602080/repos/alliance-operation-mono/apps/alliance-operation-content build` PASS; `git -C .../alliance-operation-mono diff --check` PASS; targeted scan found no console/debugger/mock runtime/fixture/fake-success markers; touched-file trailing whitespace scan PASS |
| Independent review | PASS | 独立只读 reviewer 确认 task scope、PRD/Figma 语义、UI Evidence Mode、`作者ID` -> `candidate_ids` 映射、真实 wrapper request、mock 边界均通过；运行态 `operator_id` 提交形态、分页和 rowKey 真实数据表现移交 `/delivery:verify` |
| Main gate | PASS | 主 Agent 复核 diff、TASK-004 checkbox、review packet、独立审查和构建；确认 TASK-003 的 DOU+券空 Tab 临时风险已由本 Task 闭合，不压缩 TASK-005..TASK-008 范围 |
| Checkpoint commit | DONE | business repo commit `cf6ca596b feat(content-activity): add coupon removal detail table`; commit hook ran `emox prettier --write` and `emox eslint`; post-commit build PASS total `28733.3 kB (gzip: 6626.0 kB)` |
| Pending runtime evidence | PENDING | `/delivery:verify` should click DOU+券 `剔除明细`, assert Network params include `candidate_ids` and not `author_ids`, verify DOM table headers/cells/pagination, and capture screenshot alignment to IMG6 |

### TASK-005 Execution Record

| item | result | evidence |
|---|---|---|
| Task scope | DONE | Only implemented `TASK-005` AR-006/AR-007/AR-008/AR-009/AR-010; did not implement TASK-006 batch upload reuse, TASK-007 award submit penalty logic, TASK-008 tracking, mock runtime, generated BAM wrapper/IDL, fixture/fake success, preview service, or fallback store |
| F2C / D2C evidence | CONSUMED | `figma_25_13842_1783489298664.xml`, `figma_87_6973_1783489409245.xml`, `figma_87_7016_1783489509991.xml`; preview JPGs for `87:6973` and `87:7016` consumed; parent `25:13842` preview not used as visual ground truth per dispatch |
| Derived hit state | DONE | `manuallySubmitVideoStore.ts` keeps `apiSearchDeliveryItems` with `CandidatePoolType.PassFilterRule`; reusable hit predicate is `if_satisfy_delivery_rules === false || if_not_incentive === true`; getters expose total/hit count, preserved removed-record state, toolbar visibility, and submit guard state without writing mock data |
| Summary/action UI | DONE | `manually-submit-videos-form/index.tsx` renders the summary whenever `shouldShowSubmitHitToolbar` is true, including the removed-record-only state after one-click removal. The copy remains `共{总数}个作品，其中不满足准入门槛或命中【不激励】规则的作品数为：{命中数}个`; after all current hit rows are removed the count shows `0`, `一键移除` remains visible but `disabled={!hasSubmitHitItems}`, and `导出剔除明细` remains visible/enabled while preserved removed records exist. |
| Row status UI | DONE | Item cell preserves cover/title/item id, existing delivery-record hint and row-level `移除`; manual-input hit rows render red `#F53F3F` labels `不满足准入门槛` and/or `命中【不激励】规则` under item id |
| One-click remove | DONE | `removeSubmitHitItems` is frontend-local: it writes hit rows into `removedSubmitHitItems`, filters them out of `videoItems`, deletes row forms in the form handler, and never calls `apiCandidateRemove`; scoped scan confirms `apiCandidateRemove` is absent from manual submit store/form/drawer paths |
| Export remove records | DONE | `exportSubmitHitRecords` reads only `removedSubmitHitItems`; before removal it warns `暂无可导出的剔除明细` and sends no download request; after removal it calls real `apiDownloadContentRemoveRecord` with `ContentRemoveRecord` fields `author_id/item_id/item_name/remove_reason/penalty_reason`, where `penalty_reason` uses the latest non-empty `not_incentive_reason`; returned `data.lark_url` opens via `window.open(..., '_blank', 'noopener,noreferrer')` |
| Submit guard | DONE | Drawer `onOk` checks reusable `hasSubmitHitItems` before validation and before opening `BatchSubmitModal`; blocking message prevents reward submit path while hit rows remain; existing invalid-item guard remains unchanged |
| Repair verification | PASS | `pnpm_config_verify_deps_before_run=false pnpm --dir /Users/bytedance/cx/spec-2/meego-11/meego-7306602080/repos/alliance-operation-mono/apps/alliance-operation-content build` PASS on repair replay, total `29197.2 kB (gzip: 6703.0 kB)`; scoped `git diff --check` PASS; targeted `apiCandidateRemove` scan shows only `batch-submit-modal/index.tsx` post-success path; debug/mock marker scan clean |
| Independent repair review | PASS_WITH_ADJUDICATED_P2 | `repair_code_review_scope_check` confirmed manual local-only removal, preserved-record export and post-success upload timing/payload. Initial upload-failure retry concern was reclassified from BLOCKED to non-blocking P2 because issue source and `TC-INT-AWARD-SUCCESS-UPLOAD-NO-AWARD-LIST` only require success-order/payload and leave real persistence to EX-RI-001. |
| Main repair gate | PASS | 主 Agent 复核 diff、REPAIR-002/003/004 checkboxes、独立复判、build、scoped diff check、targeted forbidden scan、BAM/mock boundary；generated BAM/mock and `.vmok` diffs were present in the repair snapshot and are not current repair code mutations |
| Checkpoint commit | DONE | business repo commit `dbab003d7 feat(content-activity): add manual submit hit controls`; commit hook ran `emox prettier --write` and `emox eslint`; post-commit build PASS total `28765.0 kB (gzip: 6632.9 kB)` |
| Pending runtime evidence | PENDING | `/delivery:verify` should assert manual search Network `candidate_pool_type=2`, summary/row DOM, one-click/row remove local-only no `candidate_remove` request, pre-removal export no-call warning, post-removal repeated export request payload and `lark_url` open, submit guard no modal/no reward-submit call, plus screenshot alignment to `87:6973`/`87:7016` |

### TASK-005 REPAIR-005 Second-Round Execution Record

| item | result | evidence |
|---|---|---|
| Issue source | CONFIRMED | 第二轮验收反馈要求点击 `一键移除` 后，`提报汇总` 栏和按钮继续保留展示；source evidence 为 `issue-source.md` 第二轮表格与 `Gygdb5m31owTWXxARDTcEwLYn4b.png`。 |
| Contract correction | DONE | `04-tech-plan.md`、`delivery-task.md`、`09-test-case-matrix.md` 已改为：removed records 存在时保留完整 summary/action 区；当前命中数为 0 时 `一键移除` 可见但 disabled；`导出剔除明细` enabled 且可重复导出 preserved removed records。 |
| Implementation | DONE | `manually-submit-videos-form/index.tsx` 去掉 `manualHitSummary` 和 `一键移除` 外层的 `hasSubmitHitItems` 显隐门控；两者跟随 `shouldShowSubmitHitToolbar` 展示，`一键移除` 改为 `disabled={!hasSubmitHitItems}`。 |
| Scope guard | PASS | 未修改 `manuallySubmitVideoStore.ts` 的 removed-record 保存、导出 payload、hit predicate、`apiCandidateRemove` 边界、BAM wrapper、mock runtime 或其他 Task 文件。 |
| Static RED/GREEN | PASS | 修改前静态检查命中 summary / `一键移除` 仍被 `hasSubmitHitItems` 隐藏；修改后检查通过：summary 不再被当前命中行门控，`一键移除` 可见且使用 `disabled={!hasSubmitHitItems}`。 |
| Verification | PASS | `git diff --check` PASS；`pnpm_config_verify_deps_before_run=false pnpm --dir apps/alliance-operation-content build` PASS；构建日志仅有既有无关 XSS warning，不影响当前 diff。 |
| Independent review | PASS_WITH_VERIFY_GAP | 独立只读 review 确认 REPAIR-005 代码、task 和 case 对齐；运行态 DOM、两次 `download_content_remove_record`、无 `candidate_remove` 仍由 verify 阶段闭合。 |
| Main repair gate | PASS | 主 Agent 复核目标 diff、REPAIR-005 checkbox、build、diff check、静态 RED/GREEN 和 closure code refs；code 阶段允许进入 verify。 |

### TASK-005 UI Evidence Usage

| ui_evidence_mode | evidence_refs | consumed_contract | runtime_check | status |
|---|---|---|---|---|
| F2C_REQUIRED | D2C archive `code-review/d2c-evidence/task-TASK-005/manifest.md`; Figma MCP refs from dispatch packet | Summary node `87:6998`; action order `87:7000` -> `87:7002`; row labels `87:7028`/`87:7113` with red `#F53F3F`; footer order `87:7131` -> `87:7133`; parent preview excluded | Pending `/delivery:verify` DOM/screenshot/click/Network | CODE_CONSUMED |

### TASK-005 BAM Coverage Findings

| task_id | case_id | ruleId | apiName | matrix_update | code_location | evidence |
|---|---|---|---|---|---|---|
| TASK-005 | TC-UI-MANUAL-HIT-PAGE, TC-CELL-MANUAL-HIT-STATUS, TC-INT-MANUAL-SUBMIT-GUARD | R-BAM-MANUAL-SEARCH-HIT | apiSearchDeliveryItems | no update needed | `manuallySubmitVideoStore.ts`; manual form/drawer | `09-test-case-matrix.md` has rows for manual hit page/cell/guard and Mock / Real Boundary TASK-005; business code still calls real wrapper |
| TASK-005 | TC-INT-MANUAL-ONE-CLICK-REMOVE | N/A | no `candidate_remove` request | repair matrix updated | `manuallySubmitVideoStore.ts`; `manually-submit-videos-form/index.tsx` | Manual one-click and row-level removal are local-only, preserve removed records, and must produce Network no-call evidence in `/delivery:verify` |
| TASK-005 | TC-INT-MANUAL-EXPORT | N/A | no download before removal | repair matrix updated | `manuallySubmitVideoStore.ts` | Export before preserved records exist warns and sends no `download_content_remove_record` request |
| TASK-005 | TC-INT-MANUAL-EXPORT-PERSIST-AFTER-REMOVE | R-BAM-DOWNLOAD-REMOVE-RECORD | apiDownloadContentRemoveRecord | repair matrix updated for REPAIR-005 | `manuallySubmitVideoStore.ts`; `manually-submit-videos-form/index.tsx` | Export after local removal uses preserved removed records and remains visible/repeatable; summary remains visible, `一键移除` remains visible but disabled, and runtime mock closure remains `/delivery:verify` dependency |

### TASK-006 Execution Record

| item | result | evidence |
|---|---|---|
| Task scope | DONE | Only implemented `TASK-006` AR-006/AR-007/AR-010 batch upload hit-state reuse; did not implement TASK-007 award-submit governance/timeout/exception/empty-list logic, TASK-008 tracking, mock runtime, generated BAM wrapper/IDL, fixture/fake success, preview service, or fallback store |
| Sheet wrapper path | DONE | `fetchVideosBySheetUrl` still calls real `apiGetDeliveryItemsFromSheet` and keeps `this.videoItems = this.fillIfDeliveryTrue(response.data.item_info || [])`; no local sheet fixture or preview service added |
| Reusable derived hit state | DONE | Store renamed the manual-only gate to reusable submit hit getters/actions: `kSubmitMethod.videoIds` and `kSubmitMethod.url` both feed `submitHitItems/submitHitCount/submitHitTotalCount/hasSubmitHitItems`, preserving the hit predicate `if_satisfy_delivery_rules === false || if_not_incentive === true` |
| Summary/action/row reuse | DONE | `ManuallySubmitVideosForm` consumes reusable submit hit state for the existing summary copy, Auxo button actions, and red row status labels; no separate batch-upload hit UI skeleton was added |
| Submit guard reuse | DONE | Drawer `onOk` now checks `hasSubmitHitItems`, so manual input and batch upload both block before validation and before opening `BatchSubmitModal` while hit rows remain |
| Batch baseline | DONE | `SubmitSelector` was not modified; batch upload radio, sheet URL input placeholder, upload template link, table baseline, and footer `提交并投放` remain the existing baseline |
| Verification | PASS | Required build command PASS after one in-scope JSX syntax fix; total `28765.3 kB (gzip: 6633.0 kB)` |
| Independent review | PASS | Fresh read-only reviewer `delivery_code_task_006_independent_review` returned PASS; packet sufficiency `SUFFICIENT`; confirmed scope, AF-003 semantic alignment, runtime baseline evidence fit, real wrapper path, mock boundary, and verification freshness |
| Main gate | PASS | 主 Agent 复核 diff、TASK-006 checkbox、review packet、独立审查、build、diff check、targeted forbidden scan、BAM matrix 和 mock boundary；不压缩 TASK-007/TASK-008 范围，checkpoint 后继续串行 TASK-007 |
| Checkpoint commit | DONE | business repo commit `34df2301a feat(content-activity): reuse hit controls for batch submit`; commit hook ran `emox prettier --write` and `emox eslint`; post-commit build PASS total `28765.3 kB (gzip: 6633.0 kB)` |
| Pending runtime evidence | PENDING | `/delivery:verify` should select `批量上传`, input sheet URL, assert Network calls `apiGetDeliveryItemsFromSheet`, verify summary/row red labels/actions/submit guard reuse, and capture IMG8 baseline + hit-state screenshot/DOM |

### TASK-006 UI Evidence Usage

| ui_evidence_mode | evidence_refs | consumed_contract | runtime_check | status |
|---|---|---|---|---|
| RUNTIME_BASELINE_ALLOWED | Figma nodes `25:13971`, content `101:6308`, table `101:6332`; IMG8 batch-upload screenshot; AF-003 user decision | Preserved existing batch upload radio/input/template/table/footer baseline and reused Task 5 summary/action/row/guard contract for sheet-response hit rows | Pending `/delivery:verify` DOM/Network/screenshot/click; `/delivery:design` IMG8 baseline + reused hit-state visual alignment | CODE_CONSUMED |

### TASK-006 BAM Coverage Findings

| task_id | case_id | ruleId | apiName | matrix_update | code_location | evidence |
|---|---|---|---|---|---|---|
| TASK-006 | TC-UI-BATCH-HIT-REUSE | R-BAM-BATCH-SHEET-HIT | apiGetDeliveryItemsFromSheet | no update needed | `manuallySubmitVideoStore.ts`; manual submit drawer/form | `09-test-case-matrix.md` has rows for `TC-UI-BATCH-HIT-REUSE/R-BAM-BATCH-SHEET-HIT` with `data.item_info[].if_not_incentive,not_incentive_reason`; business code still calls real wrapper and consumes response through `fillIfDeliveryTrue` |

### TASK-007 Execution Record

| item | result | evidence |
|---|---|---|
| Task scope | DONE | Implemented `TASK-007` AR-003/AR-004/AR-005 award submit branch protection and REPAIR-001 post-success no-award upload; did not implement TASK-008 tracking, mock runtime, generated BAM wrapper/IDL, fixture/fake success, preview service, fallback store, candidate calculation, amount editing, sorting, charge-record validation, or config save logic |
| Real wrapper path | DONE | `batch-submit-modal/index.tsx` still calls real `apiDeliveryDouPlusCoin` / `apiDeliveryDouPlusCoupon`; post-success no-award upload calls real `apiCandidateRemove`; `couponDeliveryRecordStore.ts` still calls real `apiDeliveryDouPlusCoupon` for failed-coupon resubmit |
| Success / non-success branch | DONE | Shared helpers in `award/utils.ts` keep success strictly at `st === 0 && code === 0`; non-success responses, including `st != 0 && code = 0` or missing `code`, return non-zero / `undefined` so success toast and `onOk` success close are not triggered |
| Governance copy | DONE | `constants.ts` defines PRD fixed copies `治理校验失败，请稍后重试` and `治理校验异常，请联系管理员`; helper classifies timeout only from request timeout-like evidence or response `msg`, without backend error-code mapping |
| Empty list guard | DONE | Batch submit skips the reward wrapper before request when the effective `delivery_list` / `delivery_items` / `delivery_authors` is empty and closes/reset without success toast; failed-coupon resubmit store skips empty `deliveryList` wrapper and never returns a success response |
| Post-success no-award upload | DONE | `batch-operation-bar/index.tsx` merges selected award rows with pending no-award rows preserved by `sendAwardToVideoStore.ts` / `sendAwardToAuthorStore.ts`; `batch-submit-modal/index.tsx` builds `remove_candidates` only from explicit `if_delivery === false` rows and calls `apiCandidateRemove` only after `submitResult.resultCode === 0` |
| Mock boundary | PASS_WITH_VERIFY_DEPENDENCY | BAM matrix already has all TASK-007 ruleIds for coin/coupon penalty, relieved, timeout, exception, and empty-list cases; no matrix update or mock artifact edit was needed |
| Verification | PASS | Repair replay build `pnpm_config_verify_deps_before_run=false pnpm --dir /Users/bytedance/cx/spec-2/meego-11/meego-7306602080/repos/alliance-operation-mono/apps/alliance-operation-content build` PASS; total `29197.2 kB (gzip: 6703.0 kB)`; scoped `git diff --check` PASS; targeted scan confirms `apiCandidateRemove` appears only in `batch-submit-modal/index.tsx` post-success helper |
| Independent repair review | PASS_WITH_P2 | `repair_code_review_scope_check` confirmed REPAIR-001 timing/payload. Upload failure currently warns and success flow continues; reviewer reclassified this as non-blocking P2 because current repair source/test only require success-order/payload, while true persistence/retry semantics remain EX-RI-001 real-verify/accept risk. |
| Verify-stage micro code fix | DONE_WITH_NOTES | `TC-INT-AWARD-TIMEOUT` 首次命中 final synthetic timeout 后缺少稳定 Modal 文案 DOM；按 `code-fix-handoff.md` 增加 `SubmitAwardResult.errorMessage`、top-level `submitErrorMessage` state 和 `role="alert"` 持久错误文案；fixture PASS、targeted diff check PASS、build PASS；全量 diff check 仅命中既有 `.vmok` trailing whitespace |
| Pending runtime evidence | PARTIAL_PENDING | `/delivery:verify` 已记录 coin/coupon penalty + relieved branches 和 `TC-INT-AWARD-TIMEOUT` timeout fixed copy / no-success / no-real-write evidence；`TC-INT-AWARD-EXCEPTION` 与 `TC-INT-AWARD-EMPTY-LIST` 仍需继续逐 case 验证 |

### TASK-007 Review Fix Record

| item | result | evidence |
|---|---|---|
| Independent review blocker | FIXED | `resubmit-award-author-drawer/index.tsx` no longer shows generic `提交失败，请稍后重试` when `couponDeliveryRecordStore.submitDelivery` resolves `undefined`; store-owned non-success / timeout / exception message remains the only toast for those paths |
| No fake success | PRESERVED | Drawer still returns before `message.success('提交成功')` when `submitDelivery` returns `undefined`, so non-success coupon failed-resubmit responses do not trigger success UI |
| Empty list warning | PRESERVED | Existing `awardList.length === 0` warning branch remains unchanged before calling `submitDelivery` |
| Verification | PASS | Review-fix rerun `pnpm_config_verify_deps_before_run=false pnpm --dir /Users/bytedance/cx/spec-2/meego-11/meego-7306602080/repos/alliance-operation-mono/apps/alliance-operation-content build` PASS, total `28774.7 kB (gzip: 6635.0 kB)`; `git -C /Users/bytedance/cx/spec-2/meego-11/meego-7306602080/repos/alliance-operation-mono diff --check` PASS |

### TASK-007 UI Evidence Usage

| ui_evidence_mode | evidence_refs | consumed_contract | runtime_check | status |
|---|---|---|---|---|
| N/A | N/A | Logic-only wrapper branch task; no Figma / DOM structure contract | Pending `/delivery:verify` Network/message/no-success runtime evidence | N/A |

### TASK-007 BAM Coverage Findings

| task_id | case_id | ruleId | apiName | matrix_update | code_location | evidence |
|---|---|---|---|---|---|---|
| TASK-007 | TC-INT-AWARD-COIN-PENALTY | R-BAM-AWARD-COIN-PENALTY | apiDeliveryDouPlusCoin | no update needed | `batch-submit-modal/index.tsx`; `award/utils.ts` | Matrix row covers non-success `code,st,msg`; business code blocks success toast and `onOk` close for non-success response |
| TASK-007 | TC-INT-AWARD-COIN-RELIEVED | R-BAM-AWARD-COIN-RELIEVED | apiDeliveryDouPlusCoin | no update needed | `batch-submit-modal/index.tsx`; `award/utils.ts` | Matrix row covers `code=0,st=0`; business code keeps strict success flow only for that response |
| TASK-007 | TC-INT-AWARD-COUPON-PENALTY | R-BAM-AWARD-COUPON-PENALTY | apiDeliveryDouPlusCoupon | no update needed | `batch-submit-modal/index.tsx`; `couponDeliveryRecordStore.ts`; `award/utils.ts` | Matrix row covers non-success `code,st,msg`; business code blocks success toast / success return for non-success response |
| TASK-007 | TC-INT-AWARD-COUPON-RELIEVED | R-BAM-AWARD-COUPON-RELIEVED | apiDeliveryDouPlusCoupon | no update needed | `batch-submit-modal/index.tsx`; `couponDeliveryRecordStore.ts`; `award/utils.ts` | Matrix row covers `code=0,st=0`; business code keeps existing success flow for strict success only |
| TASK-007 | TC-INT-AWARD-TIMEOUT | R-BAM-AWARD-COIN-TIMEOUT | apiDeliveryDouPlusCoin | verify-stage micro fix recorded | `batch-submit-modal/index.tsx`; `index.module.scss`; `award/utils.ts`; `constants.ts` | Matrix allows network timeout or `code,msg`; timeout-like error/message maps to fixed PRD copy；verify recheck recorded batch sheet mock hit、charge amount check mock hit、final synthetic timeout、`role="alert"` fixed copy、no success toast、Modal stayed open and no real final write |
| TASK-007 | TC-INT-AWARD-EXCEPTION | R-BAM-AWARD-COUPON-EXCEPTION | apiDeliveryDouPlusCoupon | no update needed | `batch-submit-modal/index.tsx`; `couponDeliveryRecordStore.ts`; `award/utils.ts`; `constants.ts` | Matrix covers non-0 exception response; exception-like response `msg` or request exception maps to fixed PRD copy |
| TASK-007 | TC-INT-AWARD-EMPTY-LIST | R-BAM-AWARD-COIN-EMPTY | apiDeliveryDouPlusCoin | no update needed | `batch-submit-modal/index.tsx`; `couponDeliveryRecordStore.ts` | Matrix row covers empty `delivery_list`; business code skips empty effective payload before wrapper and avoids reward success toast |
| TASK-007 | TC-INT-AWARD-SUCCESS-UPLOAD-NO-AWARD-LIST | R-BAM-CANDIDATE-REMOVE-SUCCESS | apiCandidateRemove | repair matrix updated | `batch-submit-modal/index.tsx`; `batch-operation-bar/index.tsx`; `sendAwardToVideoStore.ts`; `sendAwardToAuthorStore.ts` | Matrix row covers reward success followed by `candidate_remove` with only selected/pending explicit no-award candidates; upload failure retry/rollback is not in current repair contract and remains P2 real persistence risk |

### TASK-008 Execution Record

| item | result | evidence |
|---|---|---|
| Task scope | DONE | Only implemented `TASK-008` AR-015/AR-016/AR-017 tracking surfaces; did not change table rendering, BAM requests, hit predicate, submit guard, export/remove behavior, mock runtime, generated BAM wrapper/IDL, fixture/fake success, preview service, or fallback store |
| Config rule link click | DONE | `step-reward-config/index.tsx` reuses `sendElementClickLog` on `NoIncentiveRulePrompt` anchor click, keeps `href` / `target="_blank"` / `rel="noopener noreferrer"`, and logs page/module identity plus `activity_id`, `config_index`, `config_id`, and `view_type` when available |
| Manual hit summary expose | DONE | `manually-submit-videos-form/index.tsx` reuses `sendModuleExposeLog` when `hasSubmitHitItems` first becomes true for an `activity_id/config_id/session_unix_time/submitMethod` key, including `submitHitCount` and `submitHitTotalCount` without changing hit derivation |
| Remove detail SubTab click/expose | DONE | `send-award/index.tsx` adds `SubTab.REMOVE_DETAIL` metadata, logs remove-detail Radio click with `sendElementClickLog`, and changes subtab expose guard from module-only to module + `activity_id/config_id/config_index/reward_type`, allowing DOU+币/券 and config-specific exposure without duplicate render-loop logs |
| Verification | PASS | Required build PASS total `28784.2 kB (gzip: 6637.1 kB)`; business repo `git diff --check` PASS; targeted forbidden marker scan PASS with exit code 1 and no output |
| Pending runtime evidence | PENDING | `/delivery:verify` should capture logger spy/runtime events for `TC-TRACK-CFG-RULE-LINK`, `TC-TRACK-MANUAL-HIT-EXPOSE`, `TC-TRACK-REMOVE-DETAIL-TAB-COIN`, and `TC-TRACK-REMOVE-DETAIL-TAB-COUPON`; DA event name / element_id / UV aggregation remains EX-RI-004 P1 real-review risk |

### TASK-008 UI Evidence Usage

| ui_evidence_mode | evidence_refs | consumed_contract | runtime_check | status |
|---|---|---|---|---|
| N/A | PRD tracking table; `04-tech-plan.md:53-55`; `delivery-task.md ### Task 8`; existing `@ecom/operation-logger` patterns | Non-visual logger task; no Figma/DOM structure change; reused click/expose logger contracts only | Pending `/delivery:verify` logger spy/runtime event capture; no browser click of real side-effect paths in code stage | N/A |

### TASK-008 BAM Coverage Findings

| task_id | case_id | ruleId | apiName | matrix_update | code_location | evidence |
|---|---|---|---|---|---|---|
| TASK-008 | TC-TRACK-CFG-RULE-LINK | N/A | N/A | no update needed | `step-reward-config/index.tsx` | Logger-only click surface; no BAM runtime mock, wrapper, manifest, rule-map, or `__mock__` change needed |
| TASK-008 | TC-TRACK-MANUAL-HIT-EXPOSE | R-BAM-MANUAL-SEARCH-HIT | apiSearchDeliveryItems | no update needed | `manually-submit-videos-form/index.tsx`; `manuallySubmitVideoStore.ts` | Visible hit state reuses existing BAM search-hit response; code adds only logger exposure guard |
| TASK-008 | TC-TRACK-REMOVE-DETAIL-TAB-COIN | R-BAM-COIN-REMOVE-DEFAULT | apiGetDouPlusCoinRemoveRecord | no update needed | `send-award/index.tsx`; DOU+币 remove table | Remove-detail visible state reuses existing coin remove-detail table case; code adds only click/expose logger metadata |
| TASK-008 | TC-TRACK-REMOVE-DETAIL-TAB-COUPON | R-BAM-COUPON-REMOVE-DEFAULT | apiGetDouPlusCouponRemoveRecord | no update needed | `send-award/index.tsx`; DOU+券 remove table | Remove-detail visible state reuses existing coupon remove-detail table case; code adds only click/expose logger metadata |

## 已修改文件

| file | reason | task |
|---|---|---|
| `artifacts/7306602080-incentive-control-online/05-implementation-log.md` | code 阶段总账与 Gate 记录 | stage |
| `artifacts/7306602080-incentive-control-online/code-review/context-index.md` | Task Context Index | stage |
| `artifacts/7306602080-incentive-control-online/delivery-task.md` | 勾选 TASK-001 已完成 steps | TASK-001 |
| `artifacts/7306602080-incentive-control-online/delivery-task.md` | 勾选 TASK-002 已完成 steps | TASK-002 |
| `artifacts/7306602080-incentive-control-online/delivery-task.md` | 勾选 TASK-003 已完成 steps | TASK-003 |
| `artifacts/7306602080-incentive-control-online/05-implementation-log.md` | 记录 TASK-003 实现、验证和待复核点 | TASK-003 |
| `artifacts/7306602080-incentive-control-online/delivery-task.md` | 勾选 TASK-004 已完成 steps | TASK-004 |
| `artifacts/7306602080-incentive-control-online/05-implementation-log.md` | 记录 TASK-004 实现、验证和待复核点 | TASK-004 |
| `artifacts/7306602080-incentive-control-online/delivery-task.md` | 勾选 TASK-005 已完成 steps | TASK-005 |
| `artifacts/7306602080-incentive-control-online/05-implementation-log.md` | 记录 TASK-005 实现、UI evidence、BAM coverage、验证和待复核点 | TASK-005 |
| `artifacts/7306602080-incentive-control-online/delivery-task.md` | 勾选 TASK-006 已完成 steps | TASK-006 |
| `artifacts/7306602080-incentive-control-online/05-implementation-log.md` | 记录 TASK-006 实现、UI evidence、BAM coverage、验证和待复核点 | TASK-006 |
| `artifacts/7306602080-incentive-control-online/delivery-task.md` | 勾选 TASK-007 已完成 steps | TASK-007 |
| `artifacts/7306602080-incentive-control-online/05-implementation-log.md` | 记录 TASK-007 实现、BAM coverage、验证和待复核点 | TASK-007 |
| `artifacts/7306602080-incentive-control-online/code-review/task-TASK-003-review-packet.md` | TASK-003 独立审查输入包 | TASK-003 |
| `artifacts/7306602080-incentive-control-online/code-review/task-TASK-004-review-packet.md` | TASK-004 独立审查输入包 | TASK-004 |
| `artifacts/7306602080-incentive-control-online/code-review/task-TASK-005-review-packet.md` | TASK-005 独立审查输入包 | TASK-005 |
| `artifacts/7306602080-incentive-control-online/code-review/task-TASK-005-independent-review.md` | TASK-005 独立只读审查结论 | TASK-005 |
| `artifacts/7306602080-incentive-control-online/code-review/task-TASK-008-dispatch-packet.md` | TASK-008 派发输入包 | TASK-008 |
| `artifacts/7306602080-incentive-control-online/code-review/task-TASK-008-review-packet.md` | TASK-008 独立审查输入包 | TASK-008 |
| `artifacts/7306602080-incentive-control-online/code-review/task-TASK-008-independent-review.md` | TASK-008 独立只读审查结论 | TASK-008 |
| `apps/alliance-operation-content/src/routes/content-activity/edit/components/step-reward-config/index.tsx` | 全部用户态不激励提示、规则 link 与真实材料跳转 | TASK-001 |
| `apps/alliance-operation-content/src/routes/content-activity/edit/components/step-reward-config/index.tsx` | 预埋名单态复用不激励提示、规则 link 与真实材料跳转 | TASK-002 |
| `apps/alliance-operation-content/src/routes/content-activity/edit/components/step-reward-config/index.module.scss` | Figma 文案/链接颜色、字号、行高与间距样式 | TASK-001 |
| `apps/alliance-operation-content/src/routes/content-activity/award/components/send-award/index.tsx` | 新增 DOU+币剔除明细 SubTab 渲染入口，保留旧 Tab 行为并避免提前接入 TASK-008 logger | TASK-003 |
| `apps/alliance-operation-content/src/routes/content-activity/award/components/send-award/index.tsx` | 在 DOU+券 reward type 下复用 `剔除明细` SubTab 渲染 DOU+券剔除表，不改变 DOU+币条件 | TASK-004 |
| `apps/alliance-operation-content/src/routes/content-activity/award/components/dou-coin-remove-record-table/index.tsx` | 新增 DOU+币剔除明细 EcopTable、筛选、真实 BAM wrapper 请求与分页映射 | TASK-003 |
| `apps/alliance-operation-content/src/routes/content-activity/award/components/dou-coupon-remove-record-table/index.tsx` | 新增 DOU+券剔除明细 EcopTable、作者ID/操作人筛选、真实 BAM wrapper 请求与分页映射 | TASK-004 |
| `apps/alliance-operation-content/src/routes/content-activity/award/constants.ts` | 新增人工提报命中标签和剔除原因常量，避免 UI/请求文案分散 | TASK-005 |
| `apps/alliance-operation-content/src/routes/content-activity/award/stores/manuallySubmitVideoStore.ts` | 增加 submit hit 派生状态、preserved removed records、一键本地移除、移除前导出 guard 和移除后真实下载 wrapper 调用链 | TASK-005 / REPAIR-002 / REPAIR-003 / REPAIR-004 |
| `apps/alliance-operation-content/src/routes/content-activity/award/components/manually-submit-videos/manually-submit-videos-drawer/index.tsx` | 增加命中项提交保护，阻断 `BatchSubmitModal` 打开 | TASK-005 |
| `apps/alliance-operation-content/src/routes/content-activity/award/components/manually-submit-videos/manually-submit-videos-drawer/manually-submit-videos-form/index.tsx` | 渲染 summary/action、红字行态，行级移除前保存命中 removed records，并在当前命中行消失后保留完整 summary/action 区、disabled `一键移除` 和 enabled 导出入口 | TASK-005 / REPAIR-002 / REPAIR-004 / REPAIR-005 |
| `apps/alliance-operation-content/src/routes/content-activity/award/components/manually-submit-videos/manually-submit-videos-drawer/manually-submit-videos-form/index.module.scss` | 增加 summary/action 和红字状态样式 | TASK-005 |
| `apps/alliance-operation-content/src/routes/content-activity/award/stores/manuallySubmitVideoStore.ts` | 将手动输入命中派生扩展为手动输入/批量上传共用的 submit hit 状态和 actions，保留 sheet wrapper 调用链 | TASK-006 |
| `apps/alliance-operation-content/src/routes/content-activity/award/components/manually-submit-videos/manually-submit-videos-drawer/index.tsx` | 将提交保护从 manual-only 改为 submit hit 共用，阻断批量上传命中项提交 | TASK-006 |
| `apps/alliance-operation-content/src/routes/content-activity/award/components/manually-submit-videos/manually-submit-videos-drawer/manually-submit-videos-form/index.tsx` | 复用既有 summary/action/红字行态渲染批量上传命中项，不新增骨架 | TASK-006 |
| `apps/alliance-operation-content/src/routes/content-activity/award/components/send-award/batch-submit-modal/index.tsx` | 增加发奖 wrapper 空名单保护、严格成功分支、非成功/timeout/exception 文案处理，并在 reward success 后上传 selected/pending no-award candidates | TASK-007 / REPAIR-001 |
| `apps/alliance-operation-content/src/routes/content-activity/award/components/send-award/batch-operation-bar/index.tsx` | 将 selected award rows 与 pending no-award rows 合并传入发奖弹窗，成功回调后清理 pending no-award state | REPAIR-001 |
| `apps/alliance-operation-content/src/routes/content-activity/award/stores/sendAwardToVideoStore.ts` | 保存显式 `if_delivery === false` 的 pending no-award video rows，供发奖成功后上传 | REPAIR-001 |
| `apps/alliance-operation-content/src/routes/content-activity/award/stores/sendAwardToAuthorStore.ts` | 保存显式 `if_delivery === false` 的 pending no-award author rows，供发奖成功后上传 | REPAIR-001 |
| `apps/alliance-operation-content/src/routes/content-activity/award/components/send-award/batch-submit-modal/index.module.scss` | verify-stage micro fix：增加 Modal 内持久 timeout/error alert 样式 | TASK-007 / TC-INT-AWARD-TIMEOUT |
| `apps/alliance-operation-content/src/routes/content-activity/award/components/send-award/award-authors/resubmit-award-author-drawer/index.tsx` | 券失败补发 `submitDelivery` 返回 `undefined` 时不追加通用失败 toast，避免污染 TASK-007 固定文案且不触发成功 toast | TASK-007 |
| `apps/alliance-operation-content/src/routes/content-activity/award/stores/couponDeliveryRecordStore.ts` | 券失败补发路径复用严格成功分支、空 `deliveryList` 保护和固定治理错误文案 | TASK-007 |
| `apps/alliance-operation-content/src/routes/content-activity/award/constants.ts` | 新增 TASK-007 PRD 固定治理 timeout / exception 文案常量 | TASK-007 |
| `apps/alliance-operation-content/src/routes/content-activity/award/utils.ts` | 新增发奖 response 成功判定、result code、timeout/exception 文案分类 helper | TASK-007 |
| `artifacts/7306602080-incentive-control-online/code-fix-handoff.md` | verify-stage `TC-INT-AWARD-TIMEOUT` micro code fix handoff and root-cause record | TASK-007 / TC-INT-AWARD-TIMEOUT |
| `artifacts/7306602080-incentive-control-online/verify-logs/test-fixtures/award-timeout-visible-feedback.mjs` | verify-stage minimal fixture for persistent timeout/error Modal DOM | TASK-007 / TC-INT-AWARD-TIMEOUT |
| `apps/alliance-operation-content/src/routes/content-activity/edit/components/step-reward-config/index.tsx` | 配置页 `查看【不激励】规则` link click 接入现有 `sendElementClickLog`，保留原跳转行为 | TASK-008 |
| `apps/alliance-operation-content/src/routes/content-activity/award/components/manually-submit-videos/manually-submit-videos-drawer/manually-submit-videos-form/index.tsx` | 人工提报命中 summary 首次可见接入 `sendModuleExposeLog` 和 keyed 去重 | TASK-008 |
| `apps/alliance-operation-content/src/routes/content-activity/award/components/send-award/index.tsx` | 剔除明细 SubTab click/expose 接入现有 logger，并按配置项与 DOU+币/券区分 metadata | TASK-008 |
| `artifacts/7306602080-incentive-control-online/delivery-task.md` | 勾选 TASK-008 已完成 steps | TASK-008 |
| `artifacts/7306602080-incentive-control-online/05-implementation-log.md` | 记录 TASK-008 实现、UI evidence N/A、BAM/mock boundary、验证和待复核点 | TASK-008 |
| `apps/alliance-operation-content/src/routes/content-activity/edit/components/step-reward-config/index.tsx` | design-stage rework：移除全部用户态不激励提示前无 Figma/d2c 来源的 `DoubtIcon`，保留 copy/link/logger | DESIGN-REWORK-001 |
| `apps/alliance-operation-content/src/routes/content-activity/edit/components/step-reward-config/index.module.scss` | design-stage rework：对齐 d2c `1:10202` 的 `12px/20px`、灰色文案、蓝色下划线 link | DESIGN-REWORK-001 |
| `apps/alliance-operation-content/src/routes/content-activity/edit/components/step-reward-config/index.tsx` | design-stage rework：为预埋名单态 `NoIncentiveRulePrompt` 增加样式变体，默认样式保持 all-user 归档态 | DESIGN-REWORK-002 |
| `apps/alliance-operation-content/src/routes/content-activity/edit/components/step-reward-config/index.module.scss` | design-stage rework：增加预埋名单态 `14px/20px`、`#0088ff`、默认不下划线的 link 样式覆盖 | DESIGN-REWORK-002 |
| `apps/alliance-operation-content/src/routes/content-activity/award/components/dou-coin-remove-record-table/index.tsx` | design-stage rework：对齐 DOU+币剔除明细 `作品ID` 与 `操作人` 筛选 placeholder | DESIGN-REWORK-003 |
| `apps/alliance-operation-content/src/routes/content-activity/award/components/manually-submit-videos/manually-submit-videos-drawer/index.tsx` | design-stage rework：人工提报 Drawer 自定义 footer，显式对齐 d2c 顺序 `取消 -> 提交并投放`，保留提交保护与确认流程 | DESIGN-REWORK-007 |
| `apps/alliance-operation-content/src/routes/content-activity/award/components/manually-submit-videos/manually-submit-videos-drawer/manually-submit-videos-form/index.tsx` | design-stage rework：人工提报命中态表格列顺序对齐 d2c，移除 standalone `性别/年龄` 可见列 | DESIGN-REWORK-007 |

## 临时代码登记

当前无临时代码。TASK-001 / TASK-002 / TASK-005 的必要 D2C 证据已按最新规则归档到 `code-review/d2c-evidence/`；业务仓库 `.d2c_temp` 仅允许作为工具临时目录，不作为最终证据路径。Code 阶段 TASK-003/TASK-004/TASK-006/TASK-007/TASK-008 未新增 mock、preview service、fallback store、本地造数或 fake success；verify-stage 仅为 `TC-INT-AWARD-TIMEOUT` 增加一个受限 fixture 证明持久 timeout/error Modal DOM。Design-stage `DESIGN-REWORK-001` 至 `DESIGN-REWORK-007` 仅修改可见 UI 结构/样式/copy/列顺序/分页展示，不新增 mock、preview service、fallback store、本地造数或 fake success。

## Design-stage Rework Log

### DESIGN-REWORK-001 / TC-UI-CFG-ALL-BASELINE

- source_blocker: `B-TC-UI-CFG-ALL-BASELINE-001`
- source_report: `07-design-alignment.md`
- evidence_mode: `F2C_REQUIRED`
- consumed_evidence: `code-review/d2c-evidence/task-TASK-001/1_9770/manifest.md`; `figma-cache/screenshots/1_9770-config-all-user-after.png`; `screenshots/TC-UI-CFG-ALL-BASELINE--config-all-user--config-prompt-row.png`
- changed_files: `step-reward-config/index.tsx`; `step-reward-config/index.module.scss`
- implementation_summary: removed the prompt leading `DoubtIcon`; preserved copy, href, target, rel, and click logger; aligned prompt/link default style to d2c text node `1:10202`.
- static_check: `git diff --check -- apps/alliance-operation-content/src/routes/content-activity/edit/components/step-reward-config/index.tsx apps/alliance-operation-content/src/routes/content-activity/edit/components/step-reward-config/index.module.scss` PASS.
- design_recheck: `TC-UI-CFG-ALL-BASELINE` FIXED_PASS; closure screenshot `screenshots/TC-UI-CFG-ALL-BASELINE--design-rerun--config-all-user.png`; DOM/computed style and negative scan pass.

### DESIGN-REWORK-002 / TC-UI-CFG-PREFILLED-BASELINE

- source_blocker: `B-TC-UI-CFG-PREFILLED-BASELINE-001`
- source_report: `07-design-alignment.md`
- evidence_mode: `F2C_REQUIRED`
- consumed_evidence: `code-review/d2c-evidence/task-TASK-002/1_10938/manifest.md`; `figma-cache/screenshots/1_10938-config-prefilled-after.png`; `screenshots/TC-UI-CFG-PREFILLED-BASELINE--design--config-prefilled-user.png`
- changed_files: `step-reward-config/index.tsx`; `step-reward-config/index.module.scss`
- implementation_summary: added a `prefilled` variant for `NoIncentiveRulePrompt`; only the `预埋用户名单` extra opts into it; default all-user style remains unchanged.
- static_check: `git diff --check -- apps/alliance-operation-content/src/routes/content-activity/edit/components/step-reward-config/index.tsx apps/alliance-operation-content/src/routes/content-activity/edit/components/step-reward-config/index.module.scss` PASS.
- design_recheck: `TC-UI-CFG-PREFILLED-BASELINE` FIXED_PASS; closure screenshot `screenshots/TC-UI-CFG-PREFILLED-BASELINE--design-rerun--config-prefilled-user--prompt-row.png`; quick `TC-UI-CFG-ALL-BASELINE` non-regression PASS.

### DESIGN-REWORK-003 / TC-UI-COIN-REMOVE-PAGE

- source_blockers: `B-TC-UI-COIN-REMOVE-PAGE-001`, `B-TC-UI-COIN-REMOVE-PAGE-002`
- source_report: `07-design-alignment.md`
- evidence_mode: `RUNTIME_BASELINE_ALLOWED`
- consumed_evidence: `figma-cache/screenshots/1_12120-dou-coin-removal-detail.png`; `figma-cache/nodes/F3-get_figma_data-1_12120-d4.md`; `screenshots/TC-UI-COIN-REMOVE-PAGE--remove-detail-coin-default--mock-hit.png`; `verify-logs/evidence/TC-UI-COIN-REMOVE-PAGE--mock-hit-runtime.json`
- changed_files: `dou-coin-remove-record-table/index.tsx`
- implementation_summary: changed only two filter placeholders: `作品ID` -> `支持批量输入，用逗号间隔`; `操作人` -> `请选择`.
- static_check: `git diff --check -- apps/alliance-operation-content/src/routes/content-activity/award/components/dou-coin-remove-record-table/index.tsx` PASS.
- design_recheck: `TC-UI-COIN-REMOVE-PAGE` FIXED_PASS; closure screenshot `screenshots/TC-UI-COIN-REMOVE-PAGE--design-rerun--remove-detail-coin-default--dom-capture.png`; DOM placeholders, Network mock hit, and negative scan PASS.

### DESIGN-REWORK-004 / TC-DATA-COIN-COLUMNS

- source_blocker: `B-TC-DATA-COIN-COLUMNS-001`
- source_report: `07-design-alignment.md`
- evidence_mode: `RUNTIME_BASELINE_ALLOWED`
- consumed_evidence: `figma-cache/screenshots/1_12120-dou-coin-removal-detail.png`; `figma-cache/crops/TC-DATA-COIN-COLUMNS--figma-table-header-wide-crop.png`; `figma-cache/nodes/F3-get_figma_data-1_12120-d4.md`; `screenshots/TC-UI-COIN-REMOVE-PAGE--design-rerun--remove-detail-coin-default--dom-capture.png`; `verify-logs/evidence/TC-DATA-COIN-COLUMNS--source-evidence.md`
- changed_files: `dou-coin-remove-record-table/index.tsx`
- implementation_summary: moved the DOU+币 `remove_time` / `剔除发奖时间` column before `remove_reason` / `剔除发奖原因`; preserved both column objects' title, dataIndex, width, hideInSearch and render logic.
- code_writer_result: returned `BLOCKED` due patch context/read-tool limitation; main agent re-read the target file, audited the resulting diff, and confirmed the intended single-file column-order change is present.
- static_check: `git diff --check -- apps/alliance-operation-content/src/routes/content-activity/award/components/dou-coin-remove-record-table/index.tsx` PASS.
- design_recheck: `TC-DATA-COIN-COLUMNS` FIXED_PASS; closure screenshot `screenshots/TC-DATA-COIN-COLUMNS--design-rerun--coin-table-header.png`; DOM/source header order, Network mock hit, and negative scan PASS.

### DESIGN-REWORK-005 / TC-UI-COUPON-REMOVE-PAGE

- source_blockers: `B-TC-UI-COUPON-REMOVE-PAGE-001`, `B-TC-UI-COUPON-REMOVE-PAGE-002`
- source_report: `07-design-alignment.md`
- evidence_mode: `RUNTIME_BASELINE_ALLOWED`
- consumed_evidence: `figma-cache/screenshots/1_12390-dou-coupon-removal-detail.png`; `figma-cache/nodes/F4-get_figma_data-1_12390-d4.md`; `screenshots/TC-UI-COUPON-REMOVE-PAGE--remove-detail-coupon-default--mock-hit.png`; `verify-logs/evidence/TC-UI-COUPON-REMOVE-PAGE--mock-hit-runtime.json`
- changed_files: `dou-coupon-remove-record-table/index.tsx`; `send-award/index.tsx`
- implementation_summary: changed DOU+券 filter placeholders to Figma text (`作者ID` search placeholder `支持批量输入，用逗号间隔`; `操作人` placeholder `请选择`) and hid the UGC T+2 reward-distribution prompt only while `activeSubTab === SubTab.REMOVE_DETAIL`.
- code_writer_result: returned PASS; main agent audited the diff, corrected TSX indentation only, and confirmed no changes to request params, table columns, pagination, renderers, BAM mock rule, logger semantics, DOU+币 table, or non-active design cases.
- static_check: `git diff --check -- apps/alliance-operation-content/src/routes/content-activity/award/components/dou-coupon-remove-record-table/index.tsx apps/alliance-operation-content/src/routes/content-activity/award/components/send-award/index.tsx` PASS.
- design_recheck: Task 13 assertions PASS; screenshot `screenshots/TC-UI-COUPON-REMOVE-PAGE--remove-detail-coupon-default--recheck-after-DESIGN-REWORK-005-v2.png`; DOM placeholders, T+2 absence, Network mock hit, table headers, and DOU+币 residue negative scan PASS. Current case remains OPEN because `B-TC-UI-COUPON-REMOVE-PAGE-003` found missing pagination total/page-size controls (`共40条` / `20条/页`).

### DESIGN-REWORK-006 / TC-UI-COUPON-REMOVE-PAGE

- source_blocker: `B-TC-UI-COUPON-REMOVE-PAGE-003`
- source_report: `07-design-alignment.md`
- evidence_mode: `RUNTIME_BASELINE_ALLOWED`
- consumed_evidence: `figma-cache/screenshots/1_12390-dou-coupon-removal-detail.png`; `figma-cache/nodes/F4-get_figma_data-1_12390-d4.md`; pagination node `1:12401`; `screenshots/TC-UI-COUPON-REMOVE-PAGE--remove-detail-coupon-default--recheck-after-DESIGN-REWORK-005-v2.png`; `R-BAM-COUPON-REMOVE-DEFAULT` response total=40
- changed_files: `dou-coupon-remove-record-table/index.tsx`
- implementation_summary: added explicit EcopTable pagination config for DOU+券 remove-detail table: `defaultPageSize=20`, `pageSizeOptions=['20']`, `showSizeChanger=true`, and `showTotal={(total) => \`共${total}条\`}`.
- code_writer_result: returned PASS; main agent audited diff and confirmed only the allowed DOU+券 table file changed for this slice.
- static_check: `git diff --check -- apps/alliance-operation-content/src/routes/content-activity/award/components/dou-coupon-remove-record-table/index.tsx` PASS.
- design_recheck: `TC-UI-COUPON-REMOVE-PAGE` FIXED_PASS; closure screenshot `screenshots/TC-UI-COUPON-REMOVE-PAGE--design-rerun--pagination.png`; pagination DOM shows `共40条` and normalized `20条/页`; placeholder/T+2 regression, table headers, Network mock hit, and DOU+币 residue negative scan PASS.

### DESIGN-REWORK-007 / TC-UI-MANUAL-HIT-PAGE

- source_blockers: `B-TC-UI-MANUAL-HIT-PAGE-001`, `B-TC-UI-MANUAL-HIT-PAGE-002`
- source_report: `07-design-alignment.md`
- evidence_mode: `F2C_REQUIRED`
- consumed_evidence: `code-review/d2c-evidence/task-TASK-005/manifest.md`; d2c XML/JPG `87_6973` and `87_7016`; Figma screenshot `figma-cache/screenshots/25_13842-manual-submit-hit-state.png`; baseline screenshot `screenshots/TC-UI-MANUAL-HIT-PAGE--manual-drawer-hit--mock-hit.png`; closure screenshot `screenshots/TC-UI-MANUAL-HIT-PAGE--design-rerun--manual-drawer-hit-rework-007.png`
- changed_files: `manually-submit-videos-drawer/index.tsx`; `manually-submit-videos-drawer/manually-submit-videos-form/index.tsx`
- implementation_summary: replaced the Drawer default ok/cancel footer with an explicit `取消 -> 提交并投放` footer while preserving `handleCancel`, `handleConfirmClick`, submit guard and BatchSubmitModal flow; removed standalone `性别` / `年龄` visible columns and moved `投放生效时间` before `目标受众`.
- code_writer_result: returned PASS; main agent audited the diff and confirmed the change stayed within Task 15 allowed files and did not touch mock/BAM, batch upload, DOU+币/券 remove-detail files, shared rule contracts, or non-active cases.
- static_check: `git diff --check -- apps/alliance-operation-content/src/routes/content-activity/award/components/manually-submit-videos/manually-submit-videos-drawer/index.tsx apps/alliance-operation-content/src/routes/content-activity/award/components/manually-submit-videos/manually-submit-videos-drawer/manually-submit-videos-form/index.tsx` PASS.
- design_recheck: `TC-UI-MANUAL-HIT-PAGE` FIXED_PASS; closure screenshot `screenshots/TC-UI-MANUAL-HIT-PAGE--design-rerun--manual-drawer-hit-rework-007.png`; DOM evidence `verify-logs/evidence/TC-UI-MANUAL-HIT-PAGE--design-rerun-rework-007-runtime.json`; footer order, table header order, summary/action/row labels, negative scan and `R-BAM-MANUAL-SEARCH-HIT` all PASS.

## 未完成项

- TASK-001/TASK-002 仍待 verify/design 做 DOM、截图、click 运行态复核；TASK-003/TASK-004 仍待 verify/design 做 Network、DOM、分页和截图运行态复核；TASK-005 仍待 verify/design 做 manual hit Network、DOM、local-only no-call、preserved export、移除后 summary/action 保留、disabled `一键移除` 和截图运行态复核；TASK-006 仍待 verify/design 做 batch upload Network、DOM、交互 no-call 和截图运行态复核；TASK-007 已闭合 coin/coupon penalty + relieved 与 timeout 当前 verify scope，仍待 verify 做 exception 固定文案、empty-list no-call/no success、reward success 后 no-award upload 顺序/payload 复核；TASK-008 仍待 verify 做 logger spy/runtime event 复核。
- BAM mock runtime 已随 `/delivery:verify` 逐 case 生成/验证一部分；剩余 exception / empty-list / remove-detail tracking case 继续按 MOCK_PREVIEW 规则在 `/delivery:verify` / `/delivery:mock` 中闭合。

## 待验证项

| task_id | verification_item | status |
|---|---|---|
| TASK-001 | 全部用户态 DOM exact text、link click、截图；build/typecheck evidence | CODE_DONE_BUILD_PASS；RUNTIME_DOM_CLICK_PENDING |
| TASK-002 | 预埋名单态 DOM exact text、link click、截图；build/typecheck evidence | CODE_DONE_BUILD_PASS；RUNTIME_DOM_CLICK_PENDING |
| TASK-003 | DOU+币剔除明细 Tab click、Network params、表头/首行 DOM、分页请求、IMG5 screenshot | CODE_DONE_BUILD_DIFF_PASS；RUNTIME_NETWORK_DOM_SCREENSHOT_PENDING |
| TASK-004 | DOU+券剔除明细 Tab click、Network params、表头/首行 DOM、分页请求、IMG6 screenshot | CODE_DONE_BUILD_DIFF_PASS；RUNTIME_NETWORK_DOM_SCREENSHOT_PENDING |
| TASK-005 | 手动输入命中态 summary/action/红字 row DOM、一键/行级移除 local-only + no `candidate_remove` request、preserved removed records、移除前导出 no-call warning、移除后 summary/action 仍显示、`一键移除` visible disabled、重复导出 `records` payload + `lark_url` open、提交保护 no modal/no reward submit、IMG7 row screenshot | CODE_DONE_BUILD_PASS；REPAIR-005_STATIC_GREEN；RUNTIME_NETWORK_DOM_SCREENSHOT_PENDING |
| TASK-006 | 批量上传 sheet URL Network `apiGetDeliveryItemsFromSheet`、summary/action/红字 row DOM 复用、一键移除/导出复用、提交保护 no modal/no reward submit、IMG8 baseline screenshot | CODE_DONE_BUILD_PASS；RUNTIME_NETWORK_DOM_SCREENSHOT_PENDING |
| TASK-007 | DOU+币/券发奖 wrapper `st=0/code=0` 成功、自然处罚/非成功 no success/no close、timeout/exception 固定文案、空名单 no-call/no success、reward success 后 no-award `apiCandidateRemove` 顺序与 payload | PARTIAL_RUNTIME_VERIFIED_WITH_NOTES；TIMEOUT_MICRO_CODE_FIX_PASS；EXCEPTION_EMPTY_LIST_AND_NO_AWARD_UPLOAD_PENDING；UPLOAD_FAILURE_RETRY_P2_REAL_VERIFY |
| TASK-008 | 配置页规则 link click logger、人工提报命中 summary expose once、剔除明细 Tab click/expose logger extra 区分配置项和 DOU+币/券 | CODE_DONE_BUILD_DIFF_SCAN_PASS；RUNTIME_LOGGER_EVENT_PENDING；EX-RI-004_DA_REVIEW_PENDING |

## 下一步验证命令

- Task 级命令以 `delivery-task.md` / dispatch packet 为准：`pnpm_config_verify_deps_before_run=false pnpm --dir /Users/bytedance/cx/spec-2/meego-11/meego-7306602080/repos/alliance-operation-mono/apps/alliance-operation-content build`
