# TC-TRACK-MANUAL-HIT-EXPOSE Evidence

- captured_at: 2026-07-08T17:21:28Z
- verification_method: natural UI + sub-app `collectEvent` wrapper + XHR/network probe + source check
- business_view_id: `4d0d888f-c82d-42f5-9d8a-7ee4b8ec46ba`
- activity_id: `7653282555822653742`
- config_id: `7653282555822735662`
- ruleId: `R-BAM-MANUAL-SEARCH-HIT`
- apiName: `apiSearchDeliveryItems`
- runtime_json: `verify-logs/evidence/TC-TRACK-MANUAL-HIT-EXPOSE--runtime.json`
- source_evidence: `verify-logs/evidence/TC-TRACK-MANUAL-HIT-EXPOSE--source-evidence.md`

## Positive Evidence

Natural UI rebuilt the manual-hit Drawer through `新增提报` -> input `100001,100002,100003` -> `提交`.

Network trigger:

- `GET /api/buyin/admin/content_activity/search_delivery_items`
- `item_ids=100001,100002,100003`
- `candidate_pool_type=2`
- `page_no=1`
- `page_size=50`
- status `200`

Runtime summary after the request:

- Summary visible: `共3个作品，其中不满足准入门槛或命中【不激励】规则的作品数为：2个`
- Rows visible:
  - `100001`: `不满足准入门槛`
  - `100002`: `命中【不激励】规则`
  - `100003`: valid row
- `一键移除` and `导出剔除明细` visible.

Captured logger payload:

```json
{
  "eventName": "module_expose",
  "module_id": "manual_submit_hit_summary",
  "module_name": "人工提报命中提示",
  "page_id": "activity_reward_distribution",
  "page_name": "奖励投放页",
  "parent_block_id": "activity_reward_distribution",
  "parent_block_name": "奖励投放页",
  "activity_id": "7653282555822653742",
  "config_id": "7653282555822735662",
  "submitHitCount": "2",
  "submitHitTotalCount": "3",
  "submit_method": "videoIds",
  "session_unix_time": "1783529054"
}
```

Manual summary expose count after this valid-hit run: `1`.

## Duplicate Render Guard

After the summary was visible, I typed `verify duplicate render guard` into a row reason textarea to trigger a local rerender.

- Before: `manualExposeCount=1`, `collectCallCount=9`
- After: `manualExposeCount=1`, `moduleExposeCount=1`, `collectCallCount=9`

Result: repeated render did not duplicate `manual_submit_hit_summary`.

## No-Hit / No-Summary Evidence

The attempted `999999999999` sample is explicitly not used as no-hit proof:

- Request returned one row.
- The row had `if_satisfy_delivery_rules=false`.
- Runtime showed `共1个作品...作品数为：1个`.
- A second `manual_submit_hit_summary` exposure was captured with `submitHitCount=1` and `submitHitTotalCount=1`.

This is recorded as a failed no-hit sample attempt, not as negative evidence.

Then I used the visible row-level `移除` action and confirmed the Popconfirm:

- Before confirm: `manualExposeCount=2`, `hasSummaryActions=true`, `hitWordCount=1`
- After confirm: `manualExposeCount=2`, `hasSummaryActions=false`, `hitWordCount=0`, `noIncentiveWordCount=0`, table state `暂无数据`
- Final DOM check still had `hasSummaryActions=false` and expose count remained `2`.

Result: entering a no-summary/no-hit runtime state did not create another `manual_submit_hit_summary` exposure. Because this was produced by row removal rather than a fresh all-valid backend sample, the case remains `PASS_WITH_NOTES` and cites the source guard `if (!hasSubmitHitItems) return`.

## Logger Spy Scope

The direct export from `@ecom/operation-logger` could not be monkey-patched because the runtime export is a non-configurable getter. I did not force-mutate it.

Instead, the sub-app `collectEvent` function was wrapped because source evidence proves:

- `sendModuleExposeLog` is bound to `module_expose`.
- `sendModuleExposeLog` calls `sendTeaLog`.
- `sendTeaLog` calls `window.collectEvent`.

Temporary wrappers were restored:

- `collectRestore()` called.
- `restore()` called.
- Probe state after restore: `restored=true`.

## Network Panel Corroboration

The integrated browser network panel reported 98 requests in the active business tab. It included:

- target request index `18`: `GET https://ecop.bytedance.net/api/buyin/admin/content_activity/search_delivery_items?...item_ids=100001%2C100002%2C100003...candidate_pool_type=2`
- collector traffic:
  - `POST https://mcs.snssdk.com/v1/list`
  - `POST https://mcs.zijieapi.com/list`
  - `POST https://mon.zijieapi.com/monitor_browser/collect/batch/?biz_id=alliance_operation_content`
  - `POST https://mon.zijieapi.com/monitor_browser/collect/batch/?biz_id=ecop_platform`

The browser full network log path was temporary, so the persistent evidence is the summarized runtime JSON above.

## Result

`PASS_WITH_NOTES` for local verify:

- PASS: first valid manual-hit summary appearance reported exactly one `module_expose` payload with expected module and activity/config context.
- PASS: local rerender did not duplicate the payload.
- PASS_WITH_NOTES: no-summary/no-hit state after row removal did not report; a fresh all-valid backend no-hit sample was not available in this run.
- NOTE: DA UV aggregation and analytics ingestion remain real-review items.
