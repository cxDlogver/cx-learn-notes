# Coverage Optimization Plan Round 2

- Run ID: `20260716-232605-coverage-cx-3`
- Target file: `apps/alliance-operation-content/src/routes/content-activity/award/components/send-award/batch-submit-modal/index.tsx`
- File coverage version: `huatuo:0676324834683b2c`
- Current overall coverage: `95.11%`
- Threshold: `96%`

## Selection

`utils.ts` and `manuallySubmitVideoStore.ts` are skipped by active same-version entries. `batch-submit-modal/index.tsx` has a new Huatuo fileCoverageVersion compared with the previous active exclusion entry, so the old entry is superseded and this file is eligible again.

Uncovered rows:

| line | target |
|---:|---|
| 89-90 | missing activity/config guard for no-award upload |
| 99 | candidate_remove non-zero warning |
| 102 | candidate_remove exception warning |
| 126 | video submit empty-list success return |
| 150-151 | video submit exception message |
| 182 | author submit empty-list success return |
| 209-210 | author submit exception message |

## UI Plan

Use the real online entry only:

```text
https://ecop.bytedance.net/alliance-operation-content/content-activity/award?activity_id=7629288371705643310&cjSiteCode=St12502250000001
```

Primary path:

1. Switch to `配置五 / DOU+币 / 奖励下发`.
2. Select one visible video candidate.
3. Open `批量提交`.
4. Select a real charge record and allow the read-only balance check to hit the backend.
5. Intercept `/api/buyin/admin/content_activity/delivery_dou_plus_coin` in the browser before network.
6. Return a mocked envelope that triggers the `submitSendAwardVideos` exception branch through the browser-session `st` compatibility shim.
7. Record evidence that write backend was not hit.

Secondary path, if still needed before refresh:

1. Switch back to an author `DOU+券` config with candidates.
2. Select one author candidate.
3. Open `批量提交`.
4. Intercept `/api/buyin/admin/content_activity/delivery_dou_plus_coupon` similarly to trigger the author exception branch.

## Guardrails

- No source code edits.
- No localhost/dev server.
- Real read requests are allowed.
- All write/side-effect APIs must be intercepted and recorded as `backend_write = not_sent`.
- No commit, push, publish, or coverage review submission.
