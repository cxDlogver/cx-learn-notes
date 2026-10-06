# TASK-006 Review Packet

> stage: `/delivery:code`
> mode: `MOCK_PREVIEW`
> task_id: `TASK-006`
> packet_owner: Main Agent
> created_at: `2026-07-08`
> target_repo: `/Users/bytedance/cx/spec-2/meego-11/meego-7306602080/repos/alliance-operation-mono`

## Agent Gate Summary

- Stage: `/delivery:code` TASK-006 implementation gate, before independent read-only review
- Result: READY_FOR_INDEPENDENT_REVIEW
- Task Source: `delivery-task.md ### Task 6`
- Scope Fit: PASS, only TASK-006 batch upload hit-state reuse implemented; TASK-007/TASK-008 not implemented
- PRD / Figma Semantic Alignment: PASS_WITH_APPROVED_LIMITATION, AR-006/AR-007/AR-010 + Figma batch baseline + AF-003 reuse decision are同义
- UI Evidence Mode: `RUNTIME_BASELINE_ALLOWED`, F6/F8/IMG8 + AF-003 consumed; runtime DOM/Network/screenshot remains verify/design scope
- Verification Freshness: PASS, main Agent reran build and diff check on current final diff
- Mock Boundary: PASS, business code still calls real BAM wrapper; no mock runtime / generated / fixture / preview service
- Main Agent Ask For Reviewer: read packet + current targeted diff first; expand only if packet or diff is insufficient

## Task Identity And Source

| field | value |
|---|---|
| requirement_id | AR-006, AR-007, AR-010 |
| test_case_id | TC-UI-BATCH-HIT-REUSE |
| ruleId | R-BAM-BATCH-SHEET-HIT |
| apiName | apiGetDeliveryItemsFromSheet |
| Task Context Index | `code-review/context-index.md`, row `TASK-006` and semantic matrix row |
| Dispatch Packet | `code-review/task-TASK-006-dispatch-packet.md` |
| Targeted Diff | Current business repo `git diff -- <changed files>`; summary below |

## PRD / Figma / Task / Test Alignment

| source | contract |
|---|---|
| PRD / AR | 人工提报提交后对作品/账号执行不激励校验；命中时只提示、不自动剔除；展示命中数；命中未移除前禁止提交。 |
| Figma baseline | 批量上传 baseline nodes `25:13971`, content `101:6308`, table `101:6332`；IMG8 确认批量上传 radio、sheet URL input、上传模板、table baseline 和 footer。 |
| User decision | `decision-log.md` AF-003 选择 A：批量上传命中项复用手动输入命中态，同一提示区、行态、按钮和提交限制。 |
| delivery-task | TASK-006 four steps checked; expected result says batch baseline remains and sheet response hit fields render same summary/status/guard. |
| test matrix | TC-UI-BATCH-HIT-REUSE / R-BAM-BATCH-SHEET-HIT covers `apiGetDeliveryItemsFromSheet` response `data.item_info[].if_not_incentive, not_incentive_reason` and requires no distinct unsupported hit UI. |
| semantic_result | MATCHED_WITH_APPROVED_LIMITATION. No mismatch found that would require returning to `/delivery:plan` or `/delivery:task`. |

## UI Evidence Fit

| mode | evidence | consumed in implementation | status |
|---|---|---|---|
| RUNTIME_BASELINE_ALLOWED | `figma-cache/nodes/F6-get_figma_data-25_13971-d5.md`; `figma-cache/nodes/F8-get_figma_data-101_6332-d6.md`; `figma-cache/screenshots/25_13971-manual-submit-batch-upload-state.png`; AF-003 | `SubmitSelector` untouched, so batch radio/input/template link baseline remains; shared submit hit state reuses TASK-005 summary/action/row/guard for sheet response rows | PASS |

Runtime DOM/screenshot/Network verification remains `/delivery:verify` / `/delivery:design` scope per Code stage boundary.

## Implementation Report

| area | evidence |
|---|---|
| Store shared hit state | `manuallySubmitVideoStore.ts` replaces manual-only `kManualHitSubmitMethod` with `kReusableHitSubmitMethods = [videoIds, url]`; exposes `submitHitItems`, `submitHitCount`, `submitHitTotalCount`, `hasSubmitHitItems`. |
| Sheet wrapper path | `fetchVideosBySheetUrl` still calls real `apiGetDeliveryItemsFromSheet`, and still writes `fillIfDeliveryTrue(response.data.item_info || [])` into `videoItems`. |
| Remove / export reuse | `removeSubmitHitItems` and `exportSubmitHitRecords` keep TASK-005 real wrapper behavior and now allow both manual and batch submit modes. |
| Form UI reuse | `ManuallySubmitVideosForm` consumes shared submit hit state; existing summary/action/row status UI is reused without a new batch-specific skeleton. |
| Drawer guard | Drawer `onOk` uses `hasSubmitHitItems`, blocking before validation and before `BatchSubmitModal` for manual or batch hit rows. |
| Baseline preservation | `SubmitSelector` was not modified; radio/upload/template/table/footer baseline remains. |

## Changed Files

Business repo changed files:

- `apps/alliance-operation-content/src/routes/content-activity/award/stores/manuallySubmitVideoStore.ts`
- `apps/alliance-operation-content/src/routes/content-activity/award/components/manually-submit-videos/manually-submit-videos-drawer/index.tsx`
- `apps/alliance-operation-content/src/routes/content-activity/award/components/manually-submit-videos/manually-submit-videos-drawer/manually-submit-videos-form/index.tsx`

Artifact files changed by code-writer/main Agent:

- `artifacts/7306602080-incentive-control-online/delivery-task.md`
- `artifacts/7306602080-incentive-control-online/05-implementation-log.md`
- `artifacts/7306602080-incentive-control-online/code-review/task-TASK-006-dispatch-packet.md`
- `artifacts/7306602080-incentive-control-online/code-review/task-TASK-006-review-packet.md`

## Targeted Diff Summary

- Store diff renames manual-only hit getters/actions to shared submit hit getters/actions and gates them by `kSubmitMethod.videoIds` or `kSubmitMethod.url`.
- Drawer diff replaces `hasManualInputHitItems` with `hasSubmitHitItems`.
- Form diff replaces manual-only prop/variables/handlers with shared submit hit names; rendered UI structure and copy remain from TASK-005.
- No `SubmitSelector` diff, confirming batch upload radio/input/template baseline was not changed.

## Mechanical Checks

| check | result | evidence |
|---|---|---|
| build | PASS | Main Agent rerun: `pnpm_config_verify_deps_before_run=false pnpm --dir /Users/bytedance/cx/spec-2/meego-11/meego-7306602080/repos/alliance-operation-mono/apps/alliance-operation-content build`; exit 0; total `28765.3 kB (gzip: 6633.0 kB)` |
| whitespace | PASS | business repo `git diff --check`; exit 0 |
| changed files | PASS | `git diff --name-only` lists only the three TASK-006 business files |
| targeted forbidden scan | PASS | explicit-path `rg` for `console`, `debugger`, `__mock__`, `fixture`, `preview service`, `fallback store`, `mock runtime`, `fake success`, `TODO`, `.only(` returned no matches; exit 1 treated as no-match PASS |

## BAM Matrix And Mock Boundary

| case_id | ruleId | apiName | code behavior | matrix fit |
|---|---|---|---|---|
| TC-UI-BATCH-HIT-REUSE | R-BAM-BATCH-SHEET-HIT | apiGetDeliveryItemsFromSheet | Real wrapper request preserved; response item_info fields flow through shared hit state; no store fixture | PASS |

Forbidden in Code and not observed: generated BAM wrapper edits, IDL edits, mock runtime, BAM marker, rule-map, manifest, `__mock__`, fallback store, preview service, local fixture, fake success, browser state.

## Known P1 / Verify Follow-Up

| item | status |
|---|---|
| runtime UI evidence | `/delivery:verify` must choose batch upload, input sheet URL, assert Network call to `apiGetDeliveryItemsFromSheet`, DOM summary/row labels/actions, and submit guard no-modal/no-reward-submit. |
| visual alignment | `/delivery:design` must compare IMG8 baseline plus reused TASK-005 hit-state visual contract against runtime screenshot/DOM/computed style. |
| real sheet permissions | Real sheet access and backend governance fields remain real integration verification, not Code stage. |

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
