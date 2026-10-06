# TC-INT-AWARD-COUPON-RELIEVED Runtime Evidence

## 结论

- Result: `PASS_WITH_NOTES`
- Runtime: `integrated_browser` / `TRAE_DESKTOP`
- 页面: `activity_id=7655304206886322458`，`配置二`，奖励类型 `DOU+券`
- 证据主文件: `verify-logs/evidence/TC-INT-AWARD-COUPON-RELIEVED--runtime.json`
- Network 原始日志: `verify-logs/network/TC-INT-AWARD-COUPON-RELIEVED-network-2026-07-09T06-13-24-174Z.log`

## 执行路径

1. 进入 DOU+券 `配置二`，`apiSearchDeliveryAuthor / R-BAM-SEARCH-CANDIDATE-COUPON-PENALTY` 返回两位作者：`800001` 与 `800002`。
2. 选择解除态作者 `800002`。浏览器坐标点击未能触发自定义 checkbox 状态变化，随后使用 `label.click()` 触发组件 DOM click/change 事件链；未直接写 React/MobX state，未直接设置 `input.checked`。
3. 点击 `批量提交`，弹窗显示“本次共投放 1 位作者，预计占用 1 张满0减50的DOU+券”。
4. 使用 combobox 搜索选择充值记录 `cc抖+券-程可歆-5000`，确认按钮启用。
5. 点击弹窗 `确定`，触发 `apiDeliveryDouPlusCoupon / R-BAM-AWARD-COUPON-RELIEVED`。

## 关键证据

- SearchCandidate marker: `[BAM_MOCK_HIT]`，`apiName=apiSearchDeliveryAuthor`，`ruleId=R-BAM-SEARCH-CANDIDATE-COUPON-PENALTY`，`total_num=2`，`candidate_num=2`，包含 `800001` 与 `800002`。
- Final marker: `[BAM_MOCK_SYNTHETIC_CONTRACT]` + `[BAM_MOCK_HIT]`，`apiName=apiDeliveryDouPlusCoupon`，`ruleId=R-BAM-AWARD-COUPON-RELIEVED`。
- Final request: `delivery_from=1`，`delivery_authors[0].candidate_id=800002`，`delivery_authors[0].rank=2`，`charge_code=LST12607070007003`。
- Final response: `{ "st": 0, "code": 0, "msg": "success" }`。
- No-real-write: Network 原始日志中仅有 `search_delivery_author`、`get_charge_record`、`charge_amount_check` 等请求；未出现真实 `/api/buyin/admin/content_activity/delivery_dou_plus_coupon` XHR/fetch。
- Post-submit DOM: 投放弹窗关闭；`800001` 与 `800002` 仍可见；`800002` 仍为选中态；未观察到本 case 的 `提交作者奖励投放失败` 错误。

## Notes

- 截图工具返回 inline 预览，但未在 workspace 物化请求的 `screenshots/TC-INT-AWARD-COUPON-RELIEVED-final-page.png`，因此全局截图索引记录 `materialization_type=inline_only`，不可作为 `/delivery:design` 可复用本地截图。
- `MOCK_PREVIEW` 只能证明前端 success branch、request body、response predicate 与 write safety；真实后端治理解除状态、真实发奖事务、充值账户一致性仍保留 real verify recheck。
