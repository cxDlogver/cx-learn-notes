# TC-TRACK-REMOVE-DETAIL-TAB-COUPON Evidence

## Scope

- Case: `TC-TRACK-REMOVE-DETAIL-TAB-COUPON`
- Runtime state: DOU+券 `配置二` -> click `剔除明细`
- Activity: `7655304206886322458`
- Config: `7655304206886355226`
- Rule: `R-BAM-COUPON-REMOVE-DEFAULT`
- API: `apiGetDouPlusCouponRemoveRecord`

## Runtime Steps

1. Resumed `alliance-operation-content` dev server on port `8083`.
2. Loaded award page with `_verify_reload=track_remove_coupon_payload_202607092030b`.
3. Clicked `配置二`, confirmed active config context is DOU+券.
4. Installed temporary runtime probe for `collectEvent`, XHR, fetch, sendBeacon and filtered console messages.
5. Clicked visible `剔除明细` Radio.Button via integrated browser click.
6. Captured DOM context, Network request, `[BAM_MOCK_HIT]`, React binding evidence and probe restore.

## Positive Evidence

The visible active module after click was:

```json
{
  "module_id": "remove_detail_data",
  "module_name": "内容活动剔除明细",
  "module_type": "tab_module",
  "parent_block_type": "page",
  "parent_block_id": "activity_reward_distribution",
  "extra": {
    "activity_id": "7655304206886322458",
    "config_id": "7655304206886355226",
    "config_index": "2",
    "config_name": "配置二",
    "reward_type": "DOU+券"
  }
}
```

The business request fired:

```text
GET /api/buyin/admin/content_activity/get_dou_plus_coupon_remove_record
query: activity_id=7655304206886322458, config_id=7655304206886355226, page=1, page_num=20
status: 200
```

Console observed:

```text
[BAM_MOCK_HIT]
apiName=apiGetDouPlusCouponRemoveRecord
ruleId=R-BAM-COUPON-REMOVE-DEFAULT
requestBody.activity_id=7655304206886322458
requestBody.config_id=7655304206886355226
requestBody.page=1
requestBody.page_num=20
```

Runtime table/header evidence after the click:

```text
作者信息 / 剔除发奖原因 / 剔除发奖时间 / 操作人
first visible row: 券作者示例 / ID: 900001 / 命中【不激励】规则 / 2026/07/08 20:40:40 / 陈相
```

## Negative Evidence

- No DOU+币 remove-record request was captured in the probe window.
- Active context was `reward_type=DOU+券`, `config_index=2`, `config_name=配置二`.
- Coupon branch headers were rendered; DOU+币 branch header `作品内容` was absent.
- Probe was restored after capture.

## Logger Evidence Notes

The temporary `window.collectEvent` wrapper received `0` direct business calls in this runtime. `window.collectEvent` was `undefined` when the probe was installed, while analytics transports were visible in browser Network (`mcs.zijieapi.com`, `mcs.snssdk.com`, `monitor_browser/collect/batch`).

This is treated as the same integrated-browser observability limitation recorded for the DOU+币 tracking case. The local verify conclusion relies on:

- TypeScript source path.
- Current local bundle path.
- Runtime React fiber `onChange -> sendElementClickLog` binding.
- Active DOM `data-op-mod` exposure payload.
- Network/BAM marker for the DOU+券 remove-record request.
- Negative DOU+币 isolation.

## Evidence Files

- Runtime JSON: `verify-logs/evidence/TC-TRACK-REMOVE-DETAIL-TAB-COUPON--runtime.json`
- Source/bundle evidence: `verify-logs/evidence/TC-TRACK-REMOVE-DETAIL-TAB-COUPON--source-evidence.md`
- Network summary: `verify-logs/evidence/TC-TRACK-REMOVE-DETAIL-TAB-COUPON--browser-network-final.log`
