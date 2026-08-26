# Round 1 UI Coverage Evidence

- executed_at: `2026-07-16T19:01-19:03+08:00`
- browser_view_id: `288d7b9d-03fe-4006-9380-03810d4c957d`
- entry_url: `https://ecop.bytedance.net/alliance-operation-content/content-activity/award?activity_id=7629288371705643310&cjSiteCode=St12502250000001`
- target_config: `配置一（人工提报）`
- target_file: `apps/alliance-operation-content/src/routes/content-activity/award/components/manually-submit-videos/manually-submit-videos-drawer/manually-submit-videos-form/index.tsx`

## Real UI Read Request

- UI path: `配置一（人工提报） -> 奖励下发 -> 新增提报 -> 手动输入 -> 提交`
- input_item_ids: `1279271921656,28083207347,7634842254674947950`
- real_request: `GET /api/buyin/admin/content_activity/search_delivery_items`
- network_log: `round1-network-manual-hit.log`
- request evidence: line `[50]` in `round1-network-manual-hit.log`
- request query:
  - `activity_id=7629288371705643310`
  - `config_id=7629288371705659694`
  - `item_ids=1279271921656,28083207347,7634842254674947950`
  - `page_no=1`
  - `page_size=50`
  - `candidate_pool_type=2`
- read interception: `none`

## DOM / Screenshot Evidence

- screenshot_before_remove: `round1-manual-hit.png`
- screenshot_after_remove: `round1-after-one-click-remove.png`
- manual_hit_dom:
  - `共3个作品，其中不满足准入门槛或命中【不激励】规则的作品数为：3个`
  - `不满足准入门槛:true`
  - `命中【不激励】规则:true`
  - `导出剔除明细:true`
  - `一键移除:true`
  - `提交并投放:true`
- after_one_click_remove_dom:
  - `共0个作品，其中不满足准入门槛或命中【不激励】规则的作品数为：0个`
  - `一键移除` remained visible and disabled
  - `导出剔除明细` remained visible
  - table displayed `暂无数据`

## Submit Guard

- action: clicked `提交并投放` while hit rows were still present.
- observed result: Drawer remained open; no batch submit modal or success state appeared.
- network evidence: no `delivery_dou_plus_coin` / `delivery_dou_plus_coupon` request was present in captured network logs.

## Local Remove

- action: clicked `一键移除`.
- observed result: all three hit rows were removed locally; toolbar remained visible with disabled one-click button and enabled export button.
- network evidence: no `candidate_remove` request was present in captured network logs.

## Write Intercept

- target: `POST /api/buyin/admin/content_activity/download_content_remove_record`
- intercept method: page-local XHR/fetch patch installed before clicking `导出剔除明细`; only URLs containing `download_content_remove_record` were intercepted.
- intercepted: `true`
- intercepted request:

```json
{
  "type": "xhr",
  "method": "POST",
  "url": "/api/buyin/admin/content_activity/download_content_remove_record?__token=11e6b6d20e56b42e9acc315f68d3eef8",
  "body": "{\"records\":[{\"item_id\":\"1279271921656\",\"remove_reason\":\"手动移除\"},{\"item_id\":\"28083207347\",\"remove_reason\":\"手动移除\"},{\"author_id\":\"863575473923161\",\"item_id\":\"7634842254674947950\",\"remove_reason\":\"手动移除\"}]}"
}
```

- mock_response:

```json
{
  "st": 0,
  "code": 0,
  "msg": "success",
  "data": {
    "lark_url": "https://bytedance.larkoffice.com/sheets/mock_content_remove_record_7306602080"
  }
}
```

- frontend follow-up: new tab opened `https://bytedance.larkoffice.com/sheets/mock_content_remove_record_7306602080`, proving the UI consumed the intercepted response.
- backend_write: `not_sent`
- evidence:
  - `round1-network-after-remove.log` after returning to the business tab contains only telemetry / Huatuo coverage requests and no real `download_content_remove_record` request.
  - browser local intercept state recorded one XHR hit for the target endpoint.

## Coverage Targets Hit

- `hitStatusLabels` and row red labels.
- `shouldShowSubmitHitToolbar` toolbar branch.
- `sendModuleExposeLog` effect path when summary became visible.
- `getMergedDraftData` from local one-click removal.
- `handleRemoveSubmitHitItems`.
- `handleExportSubmitHitRecords` with browser-intercepted write response.
