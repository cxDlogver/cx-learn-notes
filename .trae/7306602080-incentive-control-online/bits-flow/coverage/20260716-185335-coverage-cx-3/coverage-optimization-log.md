# Coverage Optimization Log

- mode: `/delivery:bits --coverage`
- run_id: `20260716-185335-coverage-cx-3`
- entry_url: `https://ecop.bytedance.net/alliance-operation-content/content-activity/award?activity_id=7629288371705643310&cjSiteCode=St12502250000001`
- threshold: `90`
- final_status: `PASS_WITH_NOTES`
- submit: `false`
- business_code_changed: `false`

## Coverage Summary

| 阶段 | Overall cover ratio | Effective uncovered inserted rows | 说明 |
|---|---:|---:|---|
| 初始 | 44.25% | 122+ | Round 1 计划记录的起点 |
| Round 1 后 | 74.62% | 约 246 | 人工提报命中态真实 UI 覆盖 |
| Round 2 后 | 82.18% | 173 | DOU+ 币批量提交真实 UI 覆盖 |
| Round 3 后 | 85.15% | 142 | DOU+ 币剔除明细真实 UI 覆盖 |

最终未达到阈值 90%，但三轮上限已完成。

## Rounds

### Round 1

- target_file: `apps/alliance-operation-content/src/routes/content-activity/award/components/manually-submit-videos/manually-submit-videos-drawer/manually-submit-videos-form/index.tsx`
- plan: `coverage-optimization-plan-round-1.md`
- evidence: `evidence/round1-ui-evidence.md`
- write_intercept: `POST /api/buyin/admin/content_activity/download_content_remove_record`，浏览器拦截，未真实命中后端。
- result: no code change; refreshed coverage moved overall ratio to 74.62%.

### Round 2

- target_file: `apps/alliance-operation-content/src/routes/content-activity/award/components/send-award/batch-submit-modal/index.tsx`
- plan: `coverage-optimization-plan-round-2.md`
- evidence: `evidence/round2-ui-evidence.md`, `evidence/round2-browser-intercept-summary.json`
- write_intercepts: `delivery_modify_save`, `delivery_dou_plus_coin`，均为浏览器拦截，未真实命中后端。
- result: file coverage 30.48% -> 55.24%; overall ratio 74.62% -> 82.18%.

### Round 3

- target_file: `apps/alliance-operation-content/src/routes/content-activity/award/components/dou-coin-remove-record-table/index.tsx`
- plan: `coverage-optimization-plan-round-3.md`
- evidence: `evidence/round3-ui-evidence.md`, `evidence/round3-dou-coin-remove-record-table.png`
- requests: `GET /api/buyin/admin/content_activity/get_dou_plus_coin_remove_record` real online read-only request; no write interface.
- result: target file cleared from final uncovered list; overall ratio 82.18% -> 85.15%.

## Final Remaining Candidates

| Rank | Effective uncovered | Cover ratio | Version | File |
|---:|---:|---|---|---|
| 1 | 47 | 55.24% | `huatuo:470be66717914175` | `apps/alliance-operation-content/src/routes/content-activity/award/components/send-award/batch-submit-modal/index.tsx` |
| 2 | 26 | 21.21% | `huatuo:a8063018ce0bb551` | `apps/alliance-operation-content/src/routes/content-activity/award/stores/sendAwardToAuthorStore.ts` |
| 3 | 22 | 57.69% | `huatuo:8f372a792f0f4739` | `apps/alliance-operation-content/src/routes/content-activity/award/utils.ts` |
| 4 | 17 | 88.67% | `huatuo:1863460942dab643` | `apps/alliance-operation-content/src/routes/content-activity/award/stores/manuallySubmitVideoStore.ts` |
| 5 | 11 | 0.00% | `huatuo:cfc02a49f01cbfeb` | `apps/alliance-operation-content/src/routes/content-activity/award/stores/couponDeliveryRecordStore.ts` |
| 6 | 9 | 92.68% | `huatuo:0990ffb244f2627f` | `apps/alliance-operation-content/src/routes/content-activity/award/components/manually-submit-videos/manually-submit-videos-drawer/manually-submit-videos-form/index.tsx` |
| 7 | 5 | 83.87% | `huatuo:f0083d66d467dd00` | `apps/alliance-operation-content/src/routes/content-activity/award/stores/sendAwardToVideoStore.ts` |
| 8 | 5 | 82.76% | `huatuo:53e1a455f6bbc38e` | `apps/alliance-operation-content/src/routes/content-activity/award/components/send-award/batch-operation-bar/index.tsx` |

## Verification

- Huatuo browser capture final refresh: PASS, generated at `2026-07-16T11:40:34.520Z`.
- Final report: `coverage/report.md`.
- Final latest JSON: `coverage/latest.json`.
- Business repo status: no code changes.
- No commit / push / remote writeback: `--submit` not provided.
