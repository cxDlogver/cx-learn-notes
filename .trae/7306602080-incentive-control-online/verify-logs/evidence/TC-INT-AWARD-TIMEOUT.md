# TC-INT-AWARD-TIMEOUT Runtime Evidence

## 结论

- Result: `PASS_WITH_NOTES`
- Runtime: `integrated_browser` / `TRAE_DESKTOP`
- 页面: `activity_id=7653282555822653742`，`配置一（人工提报）`，批量上传，奖励类型 `DOU+币`
- 主证据: `verify-logs/evidence/TC-INT-AWARD-TIMEOUT--runtime.json`
- Network 摘要: `verify-logs/evidence/TC-INT-AWARD-TIMEOUT--browser-network-final.log`
- Code-fix 验证摘要: `verify-logs/baseline/award-timeout-code-fix-verification.md`

## 执行路径

1. 在批量上传输入 `https://bytedance.larkoffice.com/sheets/award-timeout-7306602080` 后点击 `提交`。
2. `apiGetDeliveryItemsFromSheet / R-BAM-BATCH-SHEET-AWARD-TIMEOUT` 命中，返回一条可投放作品 `700003`，金额 `30000` 分。
3. 点击 `提交并投放`，选择充值记录 `周度-镇楼神贴奖-陈侯聪-40000`。
4. `apiChargeAmountCheck / R-BAM-CHARGE-AMOUNT-CHECK-AWARD-TIMEOUT` 命中，request 包含 `delivery_from=2`、`resource_type=5`、`delivery_list[0].amount=30000`；DOM 显示 `余额充足。剩余可用：19000元，本期预计消耗300元`。
5. 点击 Modal `确定`，触发 `apiDeliveryDouPlusCoin / R-BAM-AWARD-COIN-TIMEOUT` synthetic timeout 合同。

## 关键证据

- Batch sheet marker: `[BAM_MOCK_HIT]`，`apiName=apiGetDeliveryItemsFromSheet`，`ruleId=R-BAM-BATCH-SHEET-AWARD-TIMEOUT`，返回 `item_id=700003`。
- Charge check marker: `[BAM_MOCK_HIT]`，`apiName=apiChargeAmountCheck`，`ruleId=R-BAM-CHARGE-AMOUNT-CHECK-AWARD-TIMEOUT`，返回 `can_delivery=true`。
- Final marker: `[BAM_MOCK_SYNTHETIC_CONTRACT]` + `[BAM_MOCK_HIT]`，`apiName=apiDeliveryDouPlusCoin`，`ruleId=R-BAM-AWARD-COIN-TIMEOUT`。
- Final response: `{ "st": 1, "code": 504, "msg": "timeout" }`。
- DOM: Modal 保持打开，`role="alert"` 可见，文本为 `治理校验失败，请稍后重试`。
- Negative evidence: 未观察到 `提交成功`；浏览器 Network 输出中无真实 `/api/buyin/admin/content_activity/delivery_dou_plus_coin` XHR/fetch，final write 只由 synthetic console marker 表示。

## Code Fix Evidence

`TC-INT-AWARD-TIMEOUT` 首次运行已经命中 final synthetic timeout，但 DOM / message 层没有稳定展示 PRD 文案。按 `code-fix-handoff.md` 进入 `MICRO_CODE_FIX` 后，`BatchSubmitModal` 保留原 toast，同时把非成功 submit result 的 error message 持久化为 Modal 内 `role="alert"` 节点。

目标验证已完成：

- `node artifacts/7306602080-incentive-control-online/verify-logs/test-fixtures/award-timeout-visible-feedback.mjs`: PASS。
- `git diff --check -- apps/alliance-operation-content/src/routes/content-activity/award/components/send-award/batch-submit-modal/index.tsx apps/alliance-operation-content/src/routes/content-activity/award/components/send-award/batch-submit-modal/index.module.scss`: PASS。
- `pnpm_config_verify_deps_before_run=false pnpm --dir /Users/bytedance/cx/spec-2/meego-11/meego-7306602080/repos/alliance-operation-mono/apps/alliance-operation-content build`: PASS，exit 0，`Built in 13.6 s (web)`。
- 全量 `git diff --check` 仍命中既有 `.vmok` 生成类型文件 trailing whitespace：`apps/alliance-operation-content/.vmok/@types/@alliance-operation/content/index.d.ts:1`，未归因到本次 Modal 修复。

## Notes

- `MOCK_PREVIEW` 只能证明前端 timeout response branch、PRD 文案展示和 write-interface synthetic safety；不证明真实后端 timeout、治理事务或真实发奖事务。
- Console 中保留一次 React Refresh/HMR hook-order warning。源码确认 `submitErrorMessage` hook 位于组件顶层且早于条件分支，生产 build PASS；该 warning 分类为 HMR hot-update noise，不作为稳定代码缺陷关闭本 case。
- 截图工具返回 inline 预览，但未在 workspace 物化请求的 `screenshots/TC-INT-AWARD-TIMEOUT--final-timeout-fixed.png`，因此全局截图索引记录 `materialization_type=inline_only`，不可作为 `/delivery:design` 可复用本地截图。
