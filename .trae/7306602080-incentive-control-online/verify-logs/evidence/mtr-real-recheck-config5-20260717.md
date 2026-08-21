# MTR Real Recheck Config Five 2026-07-17

## Scope

- Entry URL: `https://ecop.bytedance.net/alliance-operation-content/content-activity/award?activity_id=7629288371705643310&cjSiteCode=St12502250000001`
- Browser runtime: `TRAE_DESKTOP` / `integrated_browser`
- Page title: `内容生态运营｜橙蕉`
- Active context: `配置五` / `DOU+币` / `剔除明细`
- Cases covered: `TC-UI-COIN-REMOVE-PAGE`, `TC-DATA-COIN-COLUMNS`, `TC-CELL-COIN-FIRST-ROW`
- Token handling: raw `__token` was not persisted. The target URL below is redacted.
- Mock boundary: URL did not contain `externalLeadsDomainMock=1`; no `[BAM_MOCK_HIT]` evidence was used as MTR real pass.

## Natural UI Retest

The page was already on `配置五` and `剔除明细`. A page-local request monitor was installed before clicking `查询`; it captured only sanitized summaries for DOU+币 / DOU+券 remove-record APIs.

| field | observed |
|---|---|
| action | natural UI click `查询` in `配置五` / `剔除明细` |
| transport | `xhr` |
| method | `GET` |
| status | `200` |
| path | `/api/buyin/admin/content_activity/get_dou_plus_coin_remove_record` |
| params | `activity_id=7629288371705643310`, `config_id=7629288371705725230`, `page=1`, `page_num=20`, `__token=<redacted>` |
| response summary | `st=0`, `code=0`, `msg=""`, `dataKeys=["records","total","has_more"]`, `total=6`, `has_more=false`, `recordCount=6`, `firstRecordKeys=["record_id","item_card","remove_reason","operator_id","remove_time"]` |

## Runtime DOM Facts

| field | observed |
|---|---|
| visible config tab | `配置五` selected |
| reward type | `DOU+币` |
| remove detail state | `剔除明细` active, `奖励下发` and `投放明细` still visible |
| filters | `作品ID`, `操作人`, `查询`, `重置` |
| table headers | `作品内容`, `剔除发奖时间`, `剔除发奖原因`, `操作人` |
| table row count | `6` |
| empty state | `false` (`暂无数据` absent) |
| loading text | `false` by `document.body.innerText` |
| pagination visible state | current page `1`; no multi-page state because `total=6` and `has_more=false` |

## First Rows

| row | 作品内容 | 剔除发奖时间 | 剔除发奖原因 | 操作人 |
|---:|---|---|---|---|
| 1 | `-- ID: 7641951590119486066` | `2026/07/06 16:46:52` | `内容质量不佳` | `陈相` |
| 2 | `-- ID: 7641951590119486066` | `2026/07/04 17:25:34` | `内容相关性低` | `陈相` |
| 3 | `-- ID: 7641631136396987699` | `2026/07/04 17:14:51` | `内容相关性低` | `陈相` |
| 4 | `-- ID: 7641631136396987699` | `2026/06/24 21:05:17` | `内容相关性低` | `陈相` |
| 5 | `-- ID: 738100000000001002` | `2026/06/24 15:57:22` | `内容相关性低` | `陈相` |
| 6 | `-- ID: 738100000000001002` | `2026/06/24 15:21:04` | `内容质量不佳` | `陈相` |

Notes:

- The real sample closes the previous `total=0` data gap for DOU+币 default remove-record rows.
- The first row proves ID / remove time / remove reason / operator display under real data. The title / cover fields rendered as normal `-` fallbacks for this sample, so a real row with non-empty title / cover remains a non-blocking sample coverage note.
- The six rows are already in descending remove-time order in the default response. This does not prove multi-page pagination or interactive sort behavior because `total=6` and `has_more=false`.

## Screenshot

- Workspace screenshot: `verify-logs/screenshots/mtr-coin-remove-config5-nonempty-20260717.png`
- Materialization check: local PNG exists and `file` reports `PNG image data, 2388 x 1493, 8-bit/color RGB, non-interlaced`.
- Runtime state: `配置五` DOU+币 remove detail with 6 visible rows and operator `陈相`.

## Result By Case

| case_id | result | evidence | remaining_real_gap |
|---|---|---|---|
| `TC-UI-COIN-REMOVE-PAGE` | `PASS_WITH_NOTES` | Real `配置五` DOU+币 remove-detail GET returned HTTP 200 / `st=0/code=0,total=6,recordCount=6`; DOM showed active remove-detail table with filters, headers, 6 rows and no empty state. | Multi-page pagination and interactive sort are still unproven because `total=6` / `has_more=false`. |
| `TC-DATA-COIN-COLUMNS` | `PASS_WITH_NOTES` | Real DOM headers were `作品内容 / 剔除发奖时间 / 剔除发奖原因 / 操作人`; no DOU+券 author column or old delivery columns were visible. | Same pagination / interactive sort gap; note that design-stage column order already fixed and closed separately. |
| `TC-CELL-COIN-FIRST-ROW` | `PASS_WITH_NOTES` | Real first row rendered item ID `7641951590119486066`, remove time `2026/07/06 16:46:52`, reason `内容质量不佳`, and operator `陈相`. | Real title / cover non-empty sample and multi-page pagination remain unproven; not a blocker for the previous non-empty first-row data gap. |

## Gate Impact

This follow-up closes the previous DOU+币 real non-empty remove-record sample blocker for the default list and first-row renderer. The workspace still cannot upgrade to `REAL_ENV_VERIFIED` because non-write real gaps remain: DOU+币 multi-page pagination / interactive sort, real manual `if_not_incentive=true/not_incentive_reason` sample, full reward-config blocking toast, and DA / UV platform evidence.
