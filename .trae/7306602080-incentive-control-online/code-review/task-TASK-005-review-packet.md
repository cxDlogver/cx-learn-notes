# TASK-005 Review Packet

> stage: `/delivery:code`
> mode: `MOCK_PREVIEW`
> task_id: `TASK-005`
> packet_owner: Main Agent
> created_at: `2026-07-08`
> target_repo: `/Users/bytedance/cx/spec-2/meego-11/meego-7306602080/repos/alliance-operation-mono`

## Agent Gate Summary

- Stage: `/delivery:code` TASK-005 implementation gate, before independent read-only review
- Result: READY_FOR_INDEPENDENT_REVIEW
- Task Source: `delivery-task.md ### Task 5`
- Scope Fit: PASS, full TASK-005 scope retained; TASK-006/TASK-007/TASK-008 not implemented
- PRD / Figma Semantic Alignment: PASS, AR-006..AR-010, Figma nodes `25:13842` / `87:6973` / `87:7016`, task steps, and test cases are同义
- UI Evidence Mode: `F2C_REQUIRED`, D2C XML/JPG and Figma MCP evidence consumed before implementation
- Verification Freshness: PASS, current diff build rerun after targeted diff/check artifacts were generated
- Mock Boundary: PASS, business code calls real BAM wrappers only; no mock runtime / rule-map / manifest / `__mock__`
- Main Agent Ask For Reviewer: read packet + targeted diff first; expand only if packet or diff is insufficient

## Task Identity And Source

| field | value |
|---|---|
| requirement_id | AR-006, AR-007, AR-008, AR-009, AR-010 |
| test_case_id | TC-UI-MANUAL-HIT-PAGE, TC-CELL-MANUAL-HIT-STATUS, TC-INT-MANUAL-ONE-CLICK-REMOVE, TC-INT-MANUAL-EXPORT, TC-INT-MANUAL-SUBMIT-GUARD |
| ruleId | R-BAM-MANUAL-SEARCH-HIT, R-BAM-CANDIDATE-REMOVE-SUCCESS, R-BAM-DOWNLOAD-REMOVE-RECORD |
| apiName | apiSearchDeliveryItems, apiCandidateRemove, apiDownloadContentRemoveRecord |
| Task Context Index | `code-review/context-index.md`, row `TASK-005` and `PRD / Figma Semantic Alignment Matrix` |
| Dispatch Packet | `code-review/task-TASK-005-dispatch-packet.md` |
| Targeted Diff | `code-review/task-TASK-005-targeted-diff.patch` |

## PRD / Figma / Task / Test Alignment

| source | contract |
|---|---|
| PRD / AR | 手动输入提交后只提示命中项，不自动剔除；展示汇总、红字命中标签、一键移除、导出剔除明细；命中未移除前禁止提交发奖名单 |
| Figma | Drawer / summary / action / row / footer: nodes `25:13842`, `87:6973`, `87:7016`; summary `87:6998`; action order `87:7000` -> `87:7002`; row labels `87:7028` / `87:7113`; footer `87:7131` -> `87:7133` |
| delivery-task | TASK-005 eight steps all checked; UI Evidence Mode `F2C_REQUIRED`; expected result says hit rows remain, remove/export use real wrappers, submit guard blocks `BatchSubmitModal` |
| test matrix | manual hit page, row status, one-click remove, export, submit guard rows exist; BAM matrix rows cover the three API rules; Mock / Real Boundary rows exist for TASK-005 |
| semantic_result | MATCHED. No mismatch found that would require returning to `/delivery:plan` or `/delivery:task`. |

## UI Evidence Fit

| mode | evidence | consumed in implementation | status |
|---|---|---|---|
| F2C_REQUIRED | Durable d2c archive `code-review/d2c-evidence/task-TASK-005/manifest.md`; XML `25_13842/figma_25_13842_1783501825825.xml`, `87_6973/figma_87_6973_1783501944620.xml`, `87_7016/figma_87_7016_1783502075850.xml`; valid JPG previews for `87:6973` and `87:7016`; Figma MCP outputs listed in dispatch packet | Summary/action block, button order, exact labels, red row status color `#F53F3F`, footer submit guard are reflected in code | PASS |

Note: parent preview JPG for `25:13842` was excluded as visual ground truth because it appeared mismatched; its XML and Figma MCP facts were still used. Runtime DOM/screenshot verification remains `/delivery:verify` / `/delivery:design` scope.

## Implementation Report

| area | evidence |
|---|---|
| Store state | `manuallySubmitVideoStore.ts` keeps real `apiSearchDeliveryItems`; hit predicate is `if_satisfy_delivery_rules === false || if_not_incentive === true`; manual-input getters expose total/hit count and guard status |
| One-click remove | `removeManualInputHitItems` builds `remove_candidates` and calls real `apiCandidateRemove`; UI list updates only after success; failure returns false and keeps rows |
| Export | `exportManualInputHitRecords` calls real `apiDownloadContentRemoveRecord`; request records only current hit rows; `lark_url` opens with `noopener,noreferrer` |
| Form UI | `manually-submit-videos-form/index.tsx` renders summary/action only when manual-input hit rows exist; red labels render under item id while preserving cover/title/id, delivery-record hint, editable columns, and row-level `移除` |
| Drawer guard | `manually-submit-videos-drawer/index.tsx` checks `hasManualInputHitItems` before validation and before opening `BatchSubmitModal` |
| Constants | `MANUAL_SUBMIT_HIT_LABELS` and `MANUAL_SUBMIT_REMOVE_REASONS` centralize exact PRD/Figma strings |

## Changed Files

Business repo changed files:

- `apps/alliance-operation-content/src/routes/content-activity/award/stores/manuallySubmitVideoStore.ts`
- `apps/alliance-operation-content/src/routes/content-activity/award/components/manually-submit-videos/manually-submit-videos-drawer/index.tsx`
- `apps/alliance-operation-content/src/routes/content-activity/award/components/manually-submit-videos/manually-submit-videos-drawer/manually-submit-videos-form/index.tsx`
- `apps/alliance-operation-content/src/routes/content-activity/award/components/manually-submit-videos/manually-submit-videos-drawer/manually-submit-videos-form/index.module.scss`
- `apps/alliance-operation-content/src/routes/content-activity/award/constants.ts`

Artifact files for review:

- `code-review/task-TASK-005-targeted-diff.patch`
- `code-review/task-TASK-005-changed-files.md`
- `code-review/task-TASK-005-debug-code-scan.md`
- `code-review/task-TASK-005-targeted-forbidden-scan.md`

## Mechanical Checks

| check | result | evidence |
|---|---|---|
| build | PASS | `pnpm_config_verify_deps_before_run=false pnpm --dir /Users/bytedance/cx/spec-2/meego-11/meego-7306602080/repos/alliance-operation-mono/apps/alliance-operation-content build`; exit 0; total `28765.0 kB (gzip: 6632.9 kB)` |
| whitespace | PASS | business repo `git diff --check`; exit 0 |
| changed files | PASS | `code-review/task-TASK-005-changed-files.md` lists only the five TASK-005 business files |
| full repo debug script | FOUND_PREEXISTING | `code-review/task-TASK-005-debug-code-scan.md` finds legacy console logs outside TASK-005 touched files; not introduced by this diff |
| targeted forbidden scan | PASS | `code-review/task-TASK-005-targeted-forbidden-scan.md` covers only the five TASK-005 touched files and finds no console/debugger/mock/fake-success markers |

## BAM Matrix And Mock Boundary

| case_id | ruleId | apiName | code behavior | matrix fit |
|---|---|---|---|---|
| TC-UI-MANUAL-HIT-PAGE / TC-CELL-MANUAL-HIT-STATUS / TC-INT-MANUAL-SUBMIT-GUARD | R-BAM-MANUAL-SEARCH-HIT | apiSearchDeliveryItems | Real wrapper request, no store fixture; consumes `if_satisfy_delivery_rules`, `if_not_incentive`, `not_incentive_reason` | PASS |
| TC-INT-MANUAL-ONE-CLICK-REMOVE | R-BAM-CANDIDATE-REMOVE-SUCCESS | apiCandidateRemove | Real wrapper request with `activity_id`, `config_id`, `remove_candidates` | PASS |
| TC-INT-MANUAL-EXPORT | R-BAM-DOWNLOAD-REMOVE-RECORD | apiDownloadContentRemoveRecord | Real wrapper request with `ContentRemoveRecord[]`; handles `data.lark_url` | PASS |

Forbidden in Code and not observed: generated BAM wrapper edits, IDL edits, mock runtime, BAM marker, rule-map, manifest, `__mock__`, fallback store, preview service, local fixture, fake success, browser state.

## Known P1 / Verify Follow-Up

| item | status |
|---|---|
| candidate id | Uses `item_card.item_model.item_id` because `delivery_item_info` has no separate candidate id field; verify/real integration must confirm this is accepted by `candidate_remove`. |
| export operator field | PRD mentions 操作人, but generated `ContentRemoveRecord` only exposes `author_id`, `item_id`, `item_name`, `remove_reason`, `penalty_reason`; code does not invent an unsupported field. Real verify must confirm backend fills operator or update IDL/BAM if required. |
| runtime UI evidence | DOM, screenshot, computed style, Network, one-click failure behavior, export `lark_url`, and no-call submit guard remain `/delivery:verify` / `/delivery:design` evidence. |
| TASK-006 scope | Batch upload reuse is not implemented here by design; `manualInputHitItems` is intentionally gated by manual input mode. TASK-006 must extend/reuse logic without reducing its own scope. |

## Reviewer Instructions

Please perform read-only review only. Do not edit code.

Required output fields:

- `Agent Gate Summary`
- `review_result: PASS / BLOCKED / NEEDS_TARGETED_REVIEW`
- `packet_sufficiency: SUFFICIENT / EXPANDED_CONTEXT_REQUIRED`
- `expanded_context_reason`
- `task_scope_fit`
- `contract_fit`
- `figma_ui_alignment`
- `prd_figma_semantic_alignment`
- `ui_evidence_fit`
- `mock_boundary_fit`
- `verification_freshness`
- `code_quality_risks`
- `missing_verification`
- `required_followup`

Expand context only if this packet or targeted diff is insufficient, self-contradictory, stale, or reveals high-risk scope drift.
