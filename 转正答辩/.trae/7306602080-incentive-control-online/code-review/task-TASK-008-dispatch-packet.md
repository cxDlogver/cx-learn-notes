# TASK-008 Dispatch Packet

> task_id: `TASK-008`
> stage: `/delivery:code`
> mode: `MOCK_PREVIEW`
> created_at: `2026-07-08`
> executor: fresh `code-writer`

## Agent Gate Summary

- Stage: Code / TASK-008 dispatch
- Result: READY_FOR_CODE_WRITER
- Readiness: PASS
- Key Gate Tables: `delivery-task.md ### Task 8`; `04-tech-plan.md` AR-015/016/017, UI-007, TMI-E, EX-RI-004; `09-test-case-matrix.md` TC-TRACK rows and Mock / Real Boundary TASK-008
- Critical Decisions: 复用现有 `@ecom/operation-logger`；不新建 logger SDK；最终 DA 事件名/UV 聚合口径保留为 P1 real review，不削减埋点范围
- P0 Blockers: none
- P1 Risks: `EX-RI-004` 埋点事件名、element_id、UV 聚合口径需后续 DA/埋点平台核对
- Main Agent Review Needed: diff 范围、logger 参数、一次性曝光去重、mock 边界、TASK-008 checkbox 和 build 证据

## Scope

实现 `TASK-008: 配置页、人工提报、剔除明细埋点`。

Requirements:

- `AR-015`: 配置页 `查看【不激励】规则` 点击统计点击 UV。
- `AR-016`: 人工提报命中提示曝光统计曝光 UV。
- `AR-017`: 剔除明细 Tab 曝光/点击统计，参数区分配置项和奖励类型。

Test cases:

- `TC-TRACK-CFG-RULE-LINK`
- `TC-TRACK-MANUAL-HIT-EXPOSE`
- `TC-TRACK-REMOVE-DETAIL-TAB-COIN`
- `TC-TRACK-REMOVE-DETAIL-TAB-COUPON`

RuleIds:

- Logger itself: `N/A`
- Manual hit visible state reuses `R-BAM-MANUAL-SEARCH-HIT`
- Coin remove-detail visible state reuses `R-BAM-COIN-REMOVE-DEFAULT`
- Coupon remove-detail visible state reuses `R-BAM-COUPON-REMOVE-DEFAULT`

## Source Contracts

Plan excerpts:

- `04-tech-plan.md:53`: 配置页规则入口点击使用现有 `@ecom/operation-logger` 点击日志模式。
- `04-tech-plan.md:54`: 人工提报命中 summary 首次展示时上报曝光。
- `04-tech-plan.md:55`: 剔除明细 Tab 曝光/点击 extra 含配置项与奖励类型。
- `04-tech-plan.md:124`: UI-007 concrete reuse path: operation-logger click/expose.
- `04-tech-plan.md:270`: EX-RI-004 event name / element_id / UV 口径为 P1 real-review risk.

Task excerpts:

- `delivery-task.md ### Task 8` declares `ui_evidence_mode: N/A`.
- `mock_boundary`: logger has no runtime mock; hit/tab visible states depend on existing BAM cases.
- `expected_result`: 配置页规则入口 click UV、人工提报命中提示曝光 UV、剔除明细 Tab 曝光/点击 UV 均按现有 logger 模式上报，剔除明细 extra 可区分配置项与 DOU+币/券。

Matrix excerpts:

- `TC-TRACK-CFG-RULE-LINK`: logger only, no runtime mock.
- `TC-TRACK-MANUAL-HIT-EXPOSE`: summary first visible logs once; repeat render must not duplicate.
- `TC-TRACK-REMOVE-DETAIL-TAB-COIN`: click/expose logger extra distinguishes `DOU+币` and config.
- `TC-TRACK-REMOVE-DETAIL-TAB-COUPON`: click/expose logger extra distinguishes `DOU+券` and config.
- `Mock / Real Boundary` rows 105-108 keep DA UV aggregation as real-review follow-up.

PRD / Figma semantic alignment:

- Non-visual logger task; `figma_ui_alignment: N/A`.
- Visible states are already implemented by previous tasks and are only trigger surfaces here.
- Alignment result from `code-review/context-index.md`: `MATCHED_WITH_LIMITATION`; limitation is final DA event name / UV口径 review, not a code scope reduction.

## Existing Logger Patterns

Use only existing `@ecom/operation-logger` exports already present in the repo.

Observed patterns:

- Page show: `sendPageShowLog({ page_id, page_name, activity_id })` in `award/page.tsx`.
- Module expose: `sendModuleExposeLog(moduleMeta, {})` or `sendModuleExposeLog({ ...moduleMeta })`; `IModuleMeta` contains `module_id`, `module_name`, `module_type`, `parent_block_type`, `parent_block_id`, `extra`.
- Element click: `sendElementClickLog({ element_id, element_name, element_type, ...extra }, {})`.

Do not use or create a new SDK.

## Target Code Locations

Allowed business files:

- `apps/alliance-operation-content/src/routes/content-activity/edit/components/step-reward-config/index.tsx`
- `apps/alliance-operation-content/src/routes/content-activity/award/components/manually-submit-videos/manually-submit-videos-drawer/manually-submit-videos-form/index.tsx`
- `apps/alliance-operation-content/src/routes/content-activity/award/components/send-award/index.tsx`
- Optional shared constants/helper under existing award/content-activity constants only if it reduces duplication and remains TASK-008-only.

Artifact files to update:

- `artifacts/7306602080-incentive-control-online/delivery-task.md`
- `artifacts/7306602080-incentive-control-online/05-implementation-log.md`

Do not modify:

- BAM generated wrappers or IDL files.
- Mock runtime, BAM marker, manifest, rule-map, `__mock__`, `delivery-mock.md`.
- Unrelated UI layout, table renderers, stores, services, or previous task behavior unless strictly required for logger context propagation.

## Required Implementation

1. Config rule link click:
   - Import and call `sendElementClickLog` from `@ecom/operation-logger`.
   - Add an `onClick` handler to `NoIncentiveRulePrompt` link.
   - Preserve native anchor navigation: do not prevent default unless impossible; keep `href`, `target="_blank"`, `rel="noopener noreferrer"`.
   - Include context at least: page/module identity, `activity_id` when available, and config context when available (`config_index` or config id if safely available).
   - Recommended element shape:
     - `element_id`: stable snake-case string for no-incentive rule link.
     - `element_name`: `查看【不激励】规则`.
     - `element_type`: `link`.

2. Manual submit hit summary exposure:
   - In `manually-submit-videos-form/index.tsx`, report once when `hasSubmitHitItems` first becomes true.
   - Use a `useRef` guard keyed by current `activity_id/config_id` or hit session if necessary; do not duplicate on render loops.
   - Include context: manual submit module, `activity_id`, `config_id`, `submitHitCount`, `submitHitTotalCount`.
   - Do not change hit predicate, list data, remove/export behavior, or submit guard.

3. Remove detail SubTab click and exposure:
   - Extend `send-award/index.tsx` logger metadata for `SubTab.REMOVE_DETAIL`.
   - Extra must include `activity_id`, current config context, and `reward_type` as `DOU+币` / `DOU+券`.
   - Existing expose guard must still prevent duplicate exposure for the same meaningful tab/config/reward combination. If the existing guard is keyed only by `module_id`, adjust the key safely so switching config or reward type can expose the correct context without global duplicates.
   - Add click logging when selecting `SubTab.REMOVE_DETAIL`; do not log unrelated SubTabs unless required by existing API shape. If logging all SubTabs is simpler, ensure remove-detail click is covered and existing behavior is not regressed.
   - Do not alter tab rendering, table request behavior, or active tab semantics.

## Stop Conditions

Stop and return `NEEDS_TARGETED_REVIEW` if:

- Existing `@ecom/operation-logger` APIs are not importable or signatures are incompatible.
- Implementing context requires broad store or routing refactors.
- Correct event id/UV aggregation cannot be determined and would require deleting or deferring an entire required logger call.
- Runtime mock / BAM wrapper edits appear necessary.
- You need to change previous task business behavior to make logger fire.

## Verification

Required commands:

```bash
pnpm_config_verify_deps_before_run=false pnpm --dir /Users/bytedance/cx/spec-2/meego-11/meego-7306602080/repos/alliance-operation-mono/apps/alliance-operation-content build
git -C /Users/bytedance/cx/spec-2/meego-11/meego-7306602080/repos/alliance-operation-mono diff --check
```

Recommended mechanical checks:

```bash
rg -n "console\\.log|debugger|TODO|__mock__|fixture|preview service|fake success" \
  /Users/bytedance/cx/spec-2/meego-11/meego-7306602080/repos/alliance-operation-mono/apps/alliance-operation-content/src/routes/content-activity/edit/components/step-reward-config/index.tsx \
  /Users/bytedance/cx/spec-2/meego-11/meego-7306602080/repos/alliance-operation-mono/apps/alliance-operation-content/src/routes/content-activity/award/components/manually-submit-videos/manually-submit-videos-drawer/manually-submit-videos-form/index.tsx \
  /Users/bytedance/cx/spec-2/meego-11/meego-7306602080/repos/alliance-operation-mono/apps/alliance-operation-content/src/routes/content-activity/award/components/send-award/index.tsx
```

`rg` exit code `1` with no output means no forbidden matches.

## Expected Report From Code Writer

Return:

- Agent Gate Summary.
- Changed files.
- Implementation details for each required logger surface.
- Exact verification commands and results.
- `delivery-task.md` checkbox delta for TASK-008 only.
- `05-implementation-log.md` updates.
- Any remaining DA/event naming risk under EX-RI-004.
