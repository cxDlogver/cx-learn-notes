# TC-INT-AWARD-EMPTY-LIST Runtime Evidence

- Case: `TC-INT-AWARD-EMPTY-LIST`
- Captured at: `2026-07-09T18:35:42+08:00`
- Result: `PASS_WITH_NOTES`
- Runtime mode: `MOCK_PREVIEW`
- Evidence JSON: `TC-INT-AWARD-EMPTY-LIST--runtime.json`
- Network summary: `TC-INT-AWARD-EMPTY-LIST--browser-network-final.log`

## Natural UI Path

1. Reloaded the DOU+币 award page with `_verify_reload=award_empty_final_202607091910`.
2. Clicked `新增提报`, switched to `批量上传`, entered `https://bytedance.larkoffice.com/sheets/award-empty-list-7306602080`, and clicked ordinary `提交`.
3. `apiGetDeliveryItemsFromSheet / R-BAM-BATCH-SHEET-AWARD-EMPTY-LIST` hit and rendered one physical Drawer row: `item_id=700004`, `if_delivery=false`.
4. Clicked `提交并投放`; Modal showed `本次共投放 0 个作品，预计占用 0 元DOU+币`.
5. Selected charge record `周度-镇楼神贴奖-陈侯聪-40000` through combobox search.
6. `apiChargeAmountCheck / R-BAM-CHARGE-AMOUNT-CHECK-AWARD-EMPTY-LIST` hit with `delivery_from=2`, `resource_type=5`, and `delivery_list=[]`.
7. Clicked Modal `确定`.

## Assertions

| Assertion | Observed | Result |
|---|---|---|
| Empty effective list is reached naturally | Drawer had one physical row from batch upload; Modal text showed `本次共投放 0 个作品，预计占用 0 元DOU+币`. | PASS |
| Do not call final DOU+币 award API | Performance API and browser Network summary showed `delivery_dou_plus_coin: 0`; console had no `apiDeliveryDouPlusCoin` marker. | PASS |
| Do not use fake final success mock | No `apiDeliveryDouPlusCoin` `[BAM_MOCK_HIT]` or `[BAM_MOCK_SYNTHETIC_CONTRACT]` marker was observed. | PASS |
| Do not show success/fake-success UI | No success toast candidates and no success text (`发放成功` / `投放成功` / `下发成功` / `发送成功` / `提交成功`) were present after confirm. | PASS |
| UI resets cleanly | Modal and Drawer closed; page returned to empty state with `新增提报` visible. | PASS |

## Mock Boundary

This case used two non-final mocks:

- `apiGetDeliveryItemsFromSheet / R-BAM-BATCH-SHEET-AWARD-EMPTY-LIST` creates a natural Drawer setup row with `if_delivery=false`.
- `apiChargeAmountCheck / R-BAM-CHARGE-AMOUNT-CHECK-AWARD-EMPTY-LIST` only unblocks the Modal charge-validation precondition for `delivery_list=[]`.

No final `apiDeliveryDouPlusCoin` success mock was added or used. The final pass condition is no-call/no-success, and the runtime evidence matches that condition.

## Notes

- The final no-call behavior is also supported by code path evidence: `submitSendAwardVideos` returns before `apiDeliveryDouPlusCoin` when the effective submit list is empty, and the success toast is inside the API response branch.
- Screenshot capture returned an inline preview but did not materialize `verify-logs/screenshots/TC-INT-AWARD-EMPTY-LIST-final-no-call.png`. The case uses runtime JSON, DOM, console marker summary and sanitized Network evidence as persistent proof.
- No cookie, storage, authorization header or token values were read or persisted.
