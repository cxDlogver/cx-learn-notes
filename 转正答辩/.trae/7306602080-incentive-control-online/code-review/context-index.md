# /delivery:code Task Context Index

> workspace: `artifacts/7306602080-incentive-control-online`
> stage: `/delivery:code`
> mode: `MOCK_PREVIEW`
> created_at: `2026-07-08`

## Gate Snapshot

| gate | result | evidence |
|---|---|---|
| PRD analysis | PASS | `03-prd-analysis.md` status DONE; no implementation-blocking P0 |
| Plan readiness | PASS_WITH_APPROVED_PARTIAL | `04-tech-plan.md` Plan Readiness `PARTIAL_READY`; allowed because Implementation Mode is `MOCK_PREVIEW` and no frontend preview P0 |
| Task readiness | PASS | `delivery-task.md` Task Readiness PASS |
| Test matrix | PASS | `09-test-case-matrix.md` Coverage Result PASS; includes Test Case Matrix, BAM Mock Response Field Coverage Matrix, Mock Preview Scope, Mock / Real Boundary |
| Design blocker | PASS | no `07-design-alignment.md`; plan records `TEMPLATE_ONLY; no design rework handoff` |
| Handoff | N/A | no `code-fix-handoff.md` |
| Execution workspace | PASS | `.trae/DELIVERY_STATE.md` Execution State ready; repo branch `cx-3`; target repo clean before code |

## Task Queue

| task_id | requirements | cases / rules | plan contract | UI Evidence Mode | code locator hints | mock / real boundary | required command | browser recheck |
|---|---|---|---|---|---|---|---|---|
| TASK-001 | AR-001 | TC-UI-CFG-ALL-BASELINE; TC-INT-CFG-RULE-LINK; rule N/A | UI-001; Region 配置-全部用户; COPY-CFG-PROMPT/COPY-CFG-LINK | F2C_REQUIRED | `step-reward-config/index.tsx`; `index.module.scss` | No runtime mock; link URL/token real review later | `pnpm --dir .../apps/alliance-operation-content build` | verify/design DOM + screenshot + click |
| TASK-002 | AR-002 | TC-UI-CFG-PREFILLED-BASELINE; TC-INT-CFG-RULE-LINK; rule N/A | UI-002; Region 配置-预埋名单; COPY-CFG-PROMPT/COPY-CFG-LINK | F2C_REQUIRED | same as TASK-001 | No runtime mock; link URL/token real review later | same build command | verify/design DOM + screenshot + click |
| TASK-003 | AR-011, AR-012 | TC-UI-COIN-REMOVE-PAGE; TC-DATA-COIN-FILTER-SCHEMA; TC-DATA-COIN-COLUMNS; TC-CELL-COIN-FIRST-ROW; TC-INT-REMOVE-TAB-SWITCH-COIN; R-BAM-COIN-REMOVE-DEFAULT/FILTER | UI-003; Region DOU+币剔除明细; list style DOU+币 | RUNTIME_BASELINE_ALLOWED | `send-award/index.tsx`; new `dou-coin-remove-record-table/index.tsx` | BAM runtime mock pending; code calls real wrapper | same build command | verify Network + DOM + screenshot |
| TASK-004 | AR-013, AR-014 | TC-UI-COUPON-REMOVE-PAGE; TC-DATA-COUPON-FILTER-SCHEMA; TC-DATA-COUPON-COLUMNS; TC-CELL-COUPON-FIRST-ROW; TC-INT-REMOVE-TAB-SWITCH-COUPON; R-BAM-COUPON-REMOVE-DEFAULT/FILTER | UI-004; Region DOU+券剔除明细; list style DOU+券 | RUNTIME_BASELINE_ALLOWED | `send-award/index.tsx`; new `dou-coupon-remove-record-table/index.tsx` | BAM runtime mock pending; code calls real wrapper | same build command | verify Network + DOM + screenshot |
| TASK-005 | AR-006..AR-010 | TC-UI-MANUAL-HIT-PAGE; TC-CELL-MANUAL-HIT-STATUS; TC-INT-MANUAL-ONE-CLICK-REMOVE; TC-INT-MANUAL-EXPORT; TC-INT-MANUAL-SUBMIT-GUARD; R-BAM-MANUAL-SEARCH-HIT/CANDIDATE-REMOVE/DOWNLOAD | UI-005; Region 人工提报命中态; Interaction 一键移除/导出/提交保护 | F2C_REQUIRED | `manuallySubmitVideoStore.ts`; manual drawer/form files; generated wrappers imported only | BAM runtime mock pending; no store fixture or fake success | same build command | verify interactions + Network |
| TASK-006 | AR-006, AR-007, AR-010 | TC-UI-BATCH-HIT-REUSE; R-BAM-BATCH-SHEET-HIT | UI-006; batch baseline + AF-003 reuse decision | RUNTIME_BASELINE_ALLOWED | manual store/form/drawer/submit-selector files | BAM runtime mock pending; sheet request remains real wrapper | same build command | verify batch upload case |
| TASK-007 | AR-003..AR-005 | award penalty/relieved/timeout/exception/empty cases; award ruleIds | PRD 3.2; COPY-TIMEOUT/COPY-EXCEPTION; EX-RI-001/002 | N/A | `batch-submit-modal/index.tsx`; award stores and submit handlers | BAM runtime mock pending; real governance/transaction recovered later | same build command | verify messages + no fake success |
| TASK-008 | AR-015..AR-017 | TC-TRACK-CFG-RULE-LINK; TC-TRACK-MANUAL-HIT-EXPOSE; TC-TRACK-REMOVE-DETAIL-TAB-COIN/COUPON | UI-007; PRD tracking table; EX-RI-004 | N/A | operation-logger call sites in config prompt, manual form, send-award | logger no runtime mock; visible states depend on related rules | same build command | verify logger spy/runtime event |

## PRD / Figma Semantic Alignment Matrix

| task_id | prd_contract | figma_contract | task_contract | test_contract | match_result | required_rework |
|---|---|---|---|---|---|---|
| TASK-001 | 全部用户态配置项下展示不激励提示和规则入口 | node `1:9770`, text `1:10202` shows prompt after 活动参与资格=全部用户 | exact prompt/link under all-users branch | DOM exact text, clickable link, no download/appeal | MATCHED | N/A |
| TASK-002 | 预埋名单态展示同款提示和规则入口 | node `1:10938`, text `1:11370` under prefilled context | reuse prompt renderer under prefilled list config | DOM exact text, clickable link | MATCHED | N/A |
| TASK-003 | DOU+币剔除明细 Tab、作品ID/操作人筛选、作品维度表格分页 | node `1:12120` active remove detail, coin list | new SubTab and coin remove table using `candidate_ids` / `operator_id` | table columns, request params, pagination, no old columns | MATCHED | N/A |
| TASK-004 | DOU+券剔除明细 Tab、作者ID/操作人筛选、作者维度表格分页 | node `1:12390` active remove detail, coupon list | coupon remove table; 作者ID maps to `candidate_ids` with comment | columns/request/no work-column residue | MATCHED | N/A |
| TASK-005 | 手动输入命中仅提示不自动剔除，可移除/导出，未移除禁止提交 | nodes `25:13842`, `87:6973`, rows `87:7016` show summary/actions/red status/footer | extend store/form/drawer around real wrappers | summary, row status, one-click remove, export, submit guard | MATCHED | N/A |
| TASK-006 | 批量上传命中复用手动输入命中态 | batch baseline nodes `25:13971`, `101:6308`, `101:6332`; AF-003 reuse decision | route sheet response through shared hit logic, keep baseline | batch baseline plus same summary/status/guard | MATCHED_WITH_LIMITATION | no separate batch hit Figma; limitation approved by AF-003 |
| TASK-007 | 发奖前处罚/解除/timeout/exception/empty-list分支 | non-Figma functional PRD; fixed copies | logic-only wrapper response handling, no frontend punishment calculation | Network/message/no-success assertions | MATCHED | N/A |
| TASK-008 | 配置页/人工提报/剔除明细点击与曝光埋点 | PRD tracking table; UI visibility from related nodes | reuse operation-logger patterns | logger spy/runtime events | MATCHED_WITH_LIMITATION | final DA naming/UV口径 real review |

## F2C / Figma Evidence Index

| task_id | evidence |
|---|---|
| TASK-001 | Durable d2c archive `code-review/d2c-evidence/task-TASK-001/1_9770/manifest.md`; XML `code-review/d2c-evidence/task-TASK-001/1_9770/figma_1_9770_1783501270027.xml`; preview `code-review/d2c-evidence/task-TASK-001/1_9770/figma_1_9770_1783501270027.jpg`; Figma MCP node `1:10202` text style PingFang SC 14px, grey `#BCBDC0`, link span blue `rgb(0,136,255)`; durable screenshot `figma-cache/screenshots/1_9770-config-all-user-after.png`; summary in `code-review/task-TASK-001-review-packet.md` |
| TASK-002 | Durable d2c archive `code-review/d2c-evidence/task-TASK-002/1_10938/manifest.md`; XML `code-review/d2c-evidence/task-TASK-002/1_10938/figma_1_10938_1783501653492.xml`; preview `code-review/d2c-evidence/task-TASK-002/1_10938/figma_1_10938_1783501653492.jpg`; summary in `code-review/task-TASK-002-review-packet.md` |
| TASK-005 | Durable d2c archive `code-review/d2c-evidence/task-TASK-005/manifest.md`; XML `25_13842/figma_25_13842_1783501825825.xml`, `87_6973/figma_87_6973_1783501944620.xml`, `87_7016/figma_87_7016_1783502075850.xml`; valid previews `87_6973/figma_87_6973_1783501944620.jpg`, `87_7016/figma_87_7016_1783502075850.jpg`; parent node `25:13842` preview mismatched and excluded from visual ground truth; Figma MCP outputs saved under `/var/folders/g3/gkh9674s19x35p641jykwjbw0000gn/T/trae/toolcall-output/` (`a5914404...`, `2074c50a...`, `f0b709eb...`). |

## Stop Conditions

- Do not reduce PRD page, field, export, validation, tracking, or remove-detail scope because BAM/IDL differs.
- Do not write inline business mock, fallback store, preview service, adapter fixtures, mock runtime, BAM marker patch, or `delivery-mock.md` in Code.
- If a Task needs unplanned files or product/design/API decisions, stop current Task and return `NEEDS_TARGETED_REVIEW`.
- Each Task must update only its own checkbox delta in `delivery-task.md`.
