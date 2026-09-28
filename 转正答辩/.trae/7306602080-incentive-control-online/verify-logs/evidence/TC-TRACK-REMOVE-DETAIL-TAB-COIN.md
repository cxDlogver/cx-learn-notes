# TC-TRACK-REMOVE-DETAIL-TAB-COIN Evidence

- captured_at: 2026-07-09 18:50 CST
- verification_method: natural UI click + temporary runtime probe + DOM `data-op-mod` + React bound handler inspection + source check
- runtime_json: `verify-logs/evidence/TC-TRACK-REMOVE-DETAIL-TAB-COIN--runtime.json`
- source_evidence: `verify-logs/evidence/TC-TRACK-REMOVE-DETAIL-TAB-COIN--source-evidence.md`
- business_view_id: `f56171fb-9ae8-4e99-8749-ecc9e4f68a5a`

## Runtime Path

1. Reloaded award page for `activity_id=7655304206886322458` with `_verify_reload=track_remove_coin_payload_202607092012`.
2. Confirmed selected top config is `配置一`, with `reward_type=DOU+币`.
3. Installed a temporary probe around `collectEvent`, `fetch`, XHR, `sendBeacon`, and console logging. The probe did not read cookies, storage, authorization headers, or raw tokens.
4. Clicked the visible `剔除明细` Radio.Button through integrated_browser.
5. Waited for the list request, analytics transport flush, and module exposure effect.
6. Restored the probe.

## Observed Runtime Facts

- Before click: active sub-tab was `奖励下发`; `剔除明细` control was visible.
- After click: active sub-tab became `剔除明细`.
- The visible remove-detail module payload was:
  - `module_id=remove_detail_data`
  - `module_name=内容活动剔除明细`
  - `parent_block_id=activity_reward_distribution`
  - `activity_id=7655304206886322458`
  - `config_id=7655304206886338842`
  - `config_index=1`
  - `config_name=配置一`
  - `reward_type=DOU+币`
- Table headers were `作品内容 / 剔除发奖原因 / 剔除发奖时间 / 操作人`, confirming the DOU+币 branch rather than DOU+券.

## Network Trigger Evidence

- Business XHR:
  - method: `GET`
  - path: `/api/buyin/admin/content_activity/get_dou_plus_coin_remove_record`
  - status: `200`
  - query: `activity_id=7655304206886322458`, `config_id=7655304206886338842`, `page=1`, `page_num=20`
- Browser console observed `[BAM_MOCK_HIT]`:
  - apiName: `apiGetDouPlusCoinRemoveRecord`
  - ruleId: `R-BAM-COIN-REMOVE-DEFAULT`
  - request body matched the query above.
- No DOU+券 remove-record request was observed in this DOU+币 case.

## Logger Evidence

Direct `collectEvent` business payload was not observable in the integrated browser runtime for this case: the temporary wrapper received `0` calls even though analytics transport requests to `mcs/snssdk/monitor` were observed. This matches the known limitation already recorded by `TC-TRACK-CFG-RULE-LINK`.

The local verify evidence therefore uses runtime/source binding rather than claiming a direct DA payload capture:

- Runtime React fiber for the active Radio.Group contains an `onChange` function that calls `sendElementClickLog` when `nextSubTab === SubTab.REMOVE_DETAIL`.
- The bound click payload contains `element_id=remove_detail_tab`, `module_id=remove_detail_data`, `module_name=内容活动剔除明细`, and spreads `currentConfigLogContext`.
- The same active runtime context resolves to `reward_type=DOU+币`, `config_id=7655304206886338842`, `config_index=1`, `config_name=配置一`.
- The active remove-detail module DOM exposes the exact payload passed to `sendModuleExposeLog` for exposure.

## Result

`PASS_WITH_NOTES` for local verify scope:

- PASS: natural click, active tab transition, DOU+币 remove-record request, BAM default rule hit, click handler binding, exposure payload, and DOU+券 negative checks are recorded.
- NOTES: direct collector payload and DA UV aggregation remain post-verify analytics rechecks.
