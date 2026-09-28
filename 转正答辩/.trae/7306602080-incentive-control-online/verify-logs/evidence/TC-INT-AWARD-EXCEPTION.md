# TC-INT-AWARD-EXCEPTION Runtime Evidence

- Case: `TC-INT-AWARD-EXCEPTION`
- Captured at: `2026-07-09T17:20:20+08:00`
- Runtime mode: `MOCK_PREVIEW`
- Evidence JSON: `TC-INT-AWARD-EXCEPTION--runtime.json`
- Browser URL: `https://ecop.bytedance.net/alliance-operation-content/content-activity/award?activity_id=7655304206886322458&cjDebugSubApp=alliance-operation-content%3Ahttp%3A%2F%2Flocalhost%3A8083%2Falliance-operation-content&externalLeadsDomainMock=1&cjSiteCode=St12502250000001&_verify_reload=award_exception_final_202607091710`

## Natural UI Path

1. Reloaded DOU+ coupon award page with `_verify_reload=award_exception_final_202607091710`.
2. Clicked `配置二`.
3. Confirmed make-fail warning entry `点此查看并重新提交` with task `fail_coupon_exception_800003`.
4. Clicked the retry entry and opened `重新提交制券`.
5. Selected charge record `cc抖+券-程可歆-5000`; drawer showed `余额充足。剩余可用：3628元`.
6. Confirmed drawer row `制券失败作者800003 / UID：800003 / 满1减50 / 1张`.
7. Clicked `确认提交`.

## Mock Chain

| Step | API | Rule | Runtime Marker | Key Request | Key Response |
|---|---|---|---|---|---|
| make-fail setup | `apiGetDouPlusCouponMakeFailRecord` | `R-BAM-COUPON-MAKE-FAIL-EXCEPTION` | `[BAM_MOCK_HIT]` | `activity_id=7655304206886322458`, `config_id=7655304206886355226` | `delivery_task_id=fail_coupon_exception_800003` |
| delivery-record setup | `apiGetDouPlusCouponDeliveryRecord` | `R-BAM-COUPON-DELIVERY-RECORD-EXCEPTION` | `[BAM_MOCK_SYNTHETIC_CONTRACT]`, `[BAM_MOCK_HIT]` | `delivery_task_id=fail_coupon_exception_800003`, `page=1`, `page_num=20` | `author_id=800003`, `coupon_config.threshold=100`, `coupon_config.freeAmount=5000` |
| final award submit | `apiDeliveryDouPlusCoupon` | `R-BAM-AWARD-COUPON-EXCEPTION` | `[BAM_MOCK_SYNTHETIC_CONTRACT]`, `[BAM_MOCK_HIT]` | `delivery_from=2`, `delivery_list[0].item_id=800003`, `charge_code=LST12607070007003` | `{ "st": 1, "code": 500, "msg": "exception" }` |

## Assertions

| Assertion | Observed | Result |
|---|---|---|
| Exception fixed copy is shown | MutationObserver captured `治理校验异常，请联系管理员` twice after final submit. Toast is transient and was not present in delayed DOM reads. | PASS |
| Do not continue success flow | Drawer remained open after submit and no final-success reset/close was observed. | PASS |
| Do not show success toast | Observer did not capture `提交成功` or `发奖成功`; delayed DOM also had no success copy. | PASS |
| Final request is safe in MOCK_PREVIEW | `apiDeliveryDouPlusCoupon` emitted synthetic contract and hit markers; final page-level XHR/fetch capture recorded no real `delivery_dou_plus_coupon` transport. | PASS |

## Screenshot Materialization

The integrated browser returned inline screenshots for the before-submit drawer and post-submit attempt, but did not create local PNG files at the requested paths. This case uses runtime JSON and MutationObserver text evidence as the persistent source; screenshots are registered as `inline_only` and are not reusable for `/delivery:design`.
