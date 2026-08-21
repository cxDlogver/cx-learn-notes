# MTR Real Recheck 2026-07-17

## Scope

- Entry URL: `https://ecop.bytedance.net/alliance-operation-content/content-activity/award?activity_id=7629288371705643310&cjSiteCode=St12502250000001`
- Browser runtime: `TRAE_DESKTOP` / `integrated_browser`
- Page title: `内容生态运营｜橙蕉`
- Active context: `配置一（人工提报）` / `奖励下发` / `剔除明细`
- Cases covered: `TC-DATA-COIN-FILTER-SCHEMA`, `TC-CELL-COIN-FIRST-ROW`
- Token handling: raw `__token` was not persisted. All URLs below are redacted.
- Mock boundary: URL did not contain `externalLeadsDomainMock=1`; no `[BAM_MOCK_HIT]` evidence was used as MTR real pass.

## DOU+币 剔除明细 Default / Empty State

DOM inspection before filter confirmed the real page was on DOU+币 remove detail:

| field | observed |
|---|---|
| location | `https://ecop.bytedance.net/alliance-operation-content/content-activity/award?activity_id=7629288371705643310&cjSiteCode=St12502250000001` |
| visible labels | `配置一（人工提报）`, `奖励下发`, `投放明细`, `剔除明细`, `作品ID`, `操作人` |
| table headers | `作品内容`, `剔除发奖时间`, `剔除发奖原因`, `操作人` |
| table rows | measure row + placeholder `暂无数据` |
| loading text | `false` by `document.body.innerText` |

This keeps `TC-CELL-COIN-FIRST-ROW` open as a data gap: the real activity still has no DOU+币 remove-record row to compare title / ID / reason / time / operator renderer.

## Natural UI Filter Retest

An in-page request monitor captured only summary data for `get_dou_plus_coin_remove_record` requests. It redacted `__token` and did not persist response body.

### Candidate IDs

Natural UI steps:

1. Clicked `作品ID` input.
2. Typed `1279271921656`.
3. Clicked `查询`.

Captured request summary:

| field | observed |
|---|---|
| transport | `xhr` |
| method | `GET` |
| status | `200` |
| path | `/api/buyin/admin/content_activity/get_dou_plus_coin_remove_record` |
| params | `activity_id=7629288371705643310`, `config_id=7629288371705659694`, `page=1`, `page_num=20`, `candidate_ids=1279271921656`, `__token=<redacted>` |
| response summary | `st=0`, `code=0`, `msg=""`, `dataKeys=["total","has_more"]`, `total=0`, `has_more=false`, `recordCount=null` |

### Candidate IDs + Operator

Natural UI steps:

1. Clicked `操作人` PeopleSelect.
2. Typed `陈相`.
3. Candidate list loaded; selected the first candidate with Enter.
4. UI selected text became `陈相`.
5. Clicked `查询`.

Captured request summary:

| field | observed |
|---|---|
| transport | `xhr` |
| method | `GET` |
| status | `200` |
| path | `/api/buyin/admin/content_activity/get_dou_plus_coin_remove_record` |
| params | `activity_id=7629288371705643310`, `config_id=7629288371705659694`, `page=1`, `page_num=20`, `candidate_ids=1279271921656`, `operator_id=2317029`, `__token=<redacted>` |
| response summary | `st=0`, `code=0`, `msg=""`, `dataKeys=["total","has_more"]`, `total=0`, `has_more=false`, `recordCount=null` |
| DOM after query | `作品ID=1279271921656`; PeopleSelect selected text `陈相`; table headers unchanged; placeholder `暂无数据`; loading text absent |

The browser Network panel also showed the target business GET. The raw tool log was not copied into artifacts because it contains an unredacted `__token`; the persisted evidence is the sanitized monitor summary above.

## Screenshot

- Workspace screenshot: `verify-logs/screenshots/mtr-coin-remove-filter-20260717.png`
- Materialization check: local PNG exists and `file` reports `PNG image data, 2388 x 1493, 8-bit/color RGB, non-interlaced`.
- Runtime state: DOU+币 remove detail filter row with `作品ID=1279271921656`, operator `陈相`, and table empty state `暂无数据`.

## Console / Environment Notes

Console messages did not show a business runtime crash. Observed errors were monitor / collector / coverage noise:

- `mcs.zijieapi.com/list` timeout / abort / network-changed
- `mon.zijieapi.com/monitor_browser/collect/batch` timeout / network-changed
- `huatuo.cn.goofy.app/api/coverage` failed
- watermark warning `建议配置tenantId`

These are classified as environment / monitoring noise for this MTR retest because the business XHR returned HTTP 200 with `st=0/code=0`, and the page DOM remained stable.

## Result By Case

| case_id | result | evidence | remaining_real_gap |
|---|---|---|---|
| `TC-DATA-COIN-FILTER-SCHEMA` | `PASS_WITH_NOTES` | Natural UI sent real `candidate_ids` and `operator_id` on the page-token XHR; backend returned HTTP 200 and `st=0/code=0`; DOM kept the selected filters and rendered stable empty table. | Filter request schema and prior `95271007` direct-probe blocker are closed. Real non-empty filtered result, pagination, sorting, and row renderer under filtered data remain unproven because `total=0`. |
| `TC-CELL-COIN-FIRST-ROW` | `OPEN_DATA_GAP` | Current real default/filter states both render `暂无数据`; no first row exists. | Requires a real non-empty DOU+币 remove-record sample to verify title / ID / reason / time / operator cell renderer and ordering. |

## Gate Impact

This retest closes the DOU+币 filter `OPEN_ENV_ISSUE` caused by the old direct probe. The workspace still cannot upgrade to `REAL_ENV_VERIFIED` because non-write real gaps remain, including DOU+币 non-empty first row / pagination / sorting and external DA / UV platform evidence.
