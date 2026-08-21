# TASK-008 Review Packet

> task_id: `TASK-008`
> stage: `/delivery:code`
> mode: `MOCK_PREVIEW`
> packet_created_at: `2026-07-08`
> dispatch_packet: `code-review/task-TASK-008-dispatch-packet.md`

## Agent Gate Summary

- Stage: Code / TASK-008 implementation review
- Result: READY_FOR_INDEPENDENT_REVIEW
- Readiness: PASS_BY_CODE_WRITER_PENDING_REVIEW
- Key Gate Tables: `delivery-task.md ### Task 8`; `04-tech-plan.md` AR-015/016/017 + UI-007 + EX-RI-004; `09-test-case-matrix.md` TC-TRACK rows + Mock / Real Boundary TASK-008; `05-implementation-log.md` TASK-008 sections
- Critical Decisions: Reuse existing `@ecom/operation-logger`; do not create logger SDK; keep final DA event name/element_id/UV aggregation as EX-RI-004 P1 follow-up
- P0 Blockers: none found by code-writer or main initial review
- P1 Risks: event naming / UV口径 real review; local implementation uses one `element_type: 'link' as any` because operation-logger type enum does not include `link`
- Main Agent Review Needed: independent read-only review of real diff, logger parameter fit, once-only exposure, mock boundary, and checkbox/log artifacts

## Task Summary

`TASK-008` implements logger-only tracking for:

- `AR-015`: configuration page `查看【不激励】规则` link click UV.
- `AR-016`: manual submit hit summary first exposure UV.
- `AR-017`: remove-detail SubTab click/exposure UV, with config and reward type parameters.

`ui_evidence_mode: N/A`; this is not a visual structure implementation task.

## Source Contract Excerpts

From `delivery-task.md ### Task 8`:

- code locator: existing `@ecom/operation-logger` usage; concrete call sites in `step-reward-config/index.tsx`, `manually-submit-videos-form/index.tsx`, `send-award/index.tsx`.
- excluded scope: no new logger SDK; no business state change to trigger tracking; do not reduce tracking because event name/UV口径 is P1; no fake success.
- mock boundary: logger itself has no runtime mock; visible states depend on BAM cases in the matrix.
- expected result: config rule link click UV, manual hit prompt exposure UV, remove-detail Tab exposure/click UV; remove-detail extra distinguishes config and DOU+币/DOU+券.

From `04-tech-plan.md`:

- AR-015: use existing `@ecom/operation-logger` click pattern.
- AR-016: report exposure when hit summary first appears.
- AR-017: extend `subTabModuleMetaMap` or add click/expose log, params contain config key and reward type.
- EX-RI-004: event name / element_id / UV aggregation remain P1 real-review risk.

From `09-test-case-matrix.md`:

- `TC-TRACK-CFG-RULE-LINK`: logger only, no BAM runtime mock.
- `TC-TRACK-MANUAL-HIT-EXPOSE`: depends on `R-BAM-MANUAL-SEARCH-HIT`; repeat render must not duplicate exposure.
- `TC-TRACK-REMOVE-DETAIL-TAB-COIN`: depends on `R-BAM-COIN-REMOVE-DEFAULT`; extra must contain DOU+币 and config.
- `TC-TRACK-REMOVE-DETAIL-TAB-COUPON`: depends on `R-BAM-COUPON-REMOVE-DEFAULT`; extra must contain DOU+券 and config.

PRD / Figma semantic alignment:

- `figma_ui_alignment: N/A`
- `prd_figma_semantic_alignment: MATCHED_WITH_LIMITATION`
- Limitation: final DA event names, element IDs and UV aggregation are EX-RI-004 P1 and must be reviewed later; this does not permit dropping any logger surface.

## Changed Files

Business repo:

- `apps/alliance-operation-content/src/routes/content-activity/edit/components/step-reward-config/index.tsx`
- `apps/alliance-operation-content/src/routes/content-activity/award/components/manually-submit-videos/manually-submit-videos-drawer/manually-submit-videos-form/index.tsx`
- `apps/alliance-operation-content/src/routes/content-activity/award/components/send-award/index.tsx`

Artifacts:

- `artifacts/7306602080-incentive-control-online/delivery-task.md`
- `artifacts/7306602080-incentive-control-online/05-implementation-log.md`
- `artifacts/7306602080-incentive-control-online/code-review/task-TASK-008-dispatch-packet.md`
- `artifacts/7306602080-incentive-control-online/code-review/task-TASK-008-review-packet.md`

## Targeted Diff Access

Reviewer should inspect the real current diff directly:

```bash
git -C /Users/bytedance/cx/spec-2/meego-11/meego-7306602080/repos/alliance-operation-mono diff -- \
  apps/alliance-operation-content/src/routes/content-activity/edit/components/step-reward-config/index.tsx \
  apps/alliance-operation-content/src/routes/content-activity/award/components/manually-submit-videos/manually-submit-videos-drawer/manually-submit-videos-form/index.tsx \
  apps/alliance-operation-content/src/routes/content-activity/award/components/send-award/index.tsx
```

Main initial diff summary:

- `step-reward-config/index.tsx`: imports `sendElementClickLog`; changes `NoIncentiveRulePrompt` to accept `activityId/configIndex/configId/viewType`; logs link click and keeps native anchor navigation.
- `manually-submit-videos-form/index.tsx`: imports `sendModuleExposeLog`; adds keyed `useRef<Set<string>>` guard; reports when `hasSubmitHitItems` first becomes true per `activity_id/config_id/session_unix_time/submitMethod`.
- `send-award/index.tsx`: imports `sendElementClickLog`; adds `REMOVE_DETAIL` module meta; expands exposure dedupe key to module + activity/config/reward type; logs remove-detail radio click with config/reward context.

## Code Writer Gate Summary

- Result: PASS.
- Build: `pnpm_config_verify_deps_before_run=false pnpm --dir /Users/bytedance/cx/spec-2/meego-11/meego-7306602080/repos/alliance-operation-mono/apps/alliance-operation-content build` PASS, exit 0, total `28784.2 kB (gzip: 6637.1 kB)`.
- Diff check: `git -C .../alliance-operation-mono diff --check` PASS, exit 0.
- Forbidden marker scan: PASS, exit 1 with no output.
- Mock boundary: no generated wrapper / IDL / mock runtime / manifest / rule-map / `__mock__` / `delivery-mock.md` changes.

## Main Initial Review Notes

- Diff scope matches TASK-008 business files.
- `delivery-task.md` marks exactly TASK-008 5/5 steps checked.
- `05-implementation-log.md` has TASK-008 execution record, UI Evidence Usage `N/A`, BAM Coverage Findings, and pending runtime verification.
- Main Agent corrected artifact-only BAM API names in `05-implementation-log.md` from generic `apiQueryContentRemoveRecord` to `apiGetDouPlusCoinRemoveRecord` / `apiGetDouPlusCouponRemoveRecord`.
- Potential code-quality point for reviewer: `step-reward-config/index.tsx` uses `element_type: 'link' as any` because `packages/operation-logger/src/index.ts` currently defines `IElementType` without `link`. Please judge whether this is acceptable under the existing logger contract or should block for targeted cleanup.

## Mechanical Checks

Code-writer reported:

```text
build: PASS exit 0
diff --check: PASS exit 0
forbidden marker scan: PASS exit 1 no output
```

Main Agent has not rerun build after artifact-only corrections because business diff did not change. Reviewer should mark command freshness acceptable unless it finds later business changes.

## Review Requirements

Please produce read-only review output with:

- `Agent Gate Summary`
- `review_result: PASS / BLOCKED / NEEDS_TARGETED_REVIEW`
- `packet_sufficiency: SUFFICIENT / EXPANDED_CONTEXT_REQUIRED`
- `task_scope_fit`
- `figma_ui_alignment` (`N/A` expected)
- `prd_figma_semantic_alignment`
- `ui_evidence_fit` (`N/A` expected)
- `code_quality_risks`
- `missing_verification`
- `required_followup`

Must check:

- Real diff strictly matches AR-015/016/017 and TASK-008 only.
- No mock runtime, fixture, fake success, generated wrapper, or BAM contract guess.
- Logger calls preserve existing navigation / UI behavior.
- Manual summary exposure cannot duplicate on render loops.
- Remove-detail click/expose includes config and reward type for both DOU+币/券.
- Event naming / UV口径 P1 is recorded and does not reduce tracking scope.
