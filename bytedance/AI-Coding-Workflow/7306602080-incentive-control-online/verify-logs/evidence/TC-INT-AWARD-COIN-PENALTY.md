# TC-INT-AWARD-COIN-PENALTY Runtime Evidence

## 结论

- 当前 verify scope 结论：`PASS_WITH_NOTES`。
- SearchCandidate 样本已恢复：`apiSearchDeliveryItems / R-BAM-SEARCH-CANDIDATE-COIN-PENALTY` 命中，返回候选 `7655364163166869874`，`if_delivery=true`，`rank=1`，且初始未带 `delivery_config.effective_time`。
- 前置 setup save 已通过真实 UI `修改配置/保存` 重跑：console 捕获 `apiDeliveryModifySave / R-BAM-DELIVERY-MODIFY-SAVE-FIRST-CANDIDATE` 的 `[BAM_MOCK_SYNTHETIC_CONTRACT]` 与 `[BAM_MOCK_HIT]`，request 命中 `candidate_ids[0]=7655364163166869874`、`if_delivery=true`，响应 `{st:0,code:0,msg:"success"}`。
- 最终发奖已通过真实 UI `批量提交` -> 选择充值记录 -> Modal `确定` 重跑：console 捕获 `apiDeliveryDouPlusCoin / R-BAM-AWARD-COIN-PENALTY` 的 `[BAM_MOCK_SYNTHETIC_CONTRACT]` 与 `[BAM_MOCK_HIT]`，request 命中 `delivery_from=1`、`delivery_items[0].candidate_id=7655364163166869874`、`charge_code=LST12604160004204`，响应 `{st:1,code:10017001,msg:"命中自然处罚，无法发奖"}`。
- Network 脱敏摘要未观察到真实 `delivery_modify_save` 或 `delivery_dou_plus_coin` XHR；符合 `MOCK_PREVIEW` 写接口 safety。
- 非成功响应后未观察到成功 toast、成功关闭/reset 或候选重排；Modal 仍保留，候选行仍显示 `投放生效时间 2026-07-09 12:05:00`。

## 持久证据

| 类型 | 路径 | 说明 |
|---|---|---|
| runtime JSON | `verify-logs/evidence/TC-INT-AWARD-COIN-PENALTY--runtime.json` | SearchCandidate restore、setup save synthetic marker、final award synthetic marker、DOM/Network 负向观察 |
| setup network | `verify-logs/evidence/TC-INT-AWARD-COIN-PENALTY--browser-network-setup.log` | 脱敏记录 SearchCandidate request；无真实 setup/final 写 XHR |
| final network | `verify-logs/evidence/TC-INT-AWARD-COIN-PENALTY--browser-network-final.log` | 脱敏记录充值记录/余额检查；无真实 final/setup 写 XHR |
| setup 截图 | `screenshots/TC-INT-AWARD-COIN-PENALTY--setup-effective-time-echo.png` | setup 保存后候选回显投放生效时间 |
| final 截图 | `screenshots/TC-INT-AWARD-COIN-PENALTY--final-award-non-success.png` | final non-success 后 Modal 未成功关闭/reset，候选仍选中 |

## Setup Save 事实

console marker 记录：

```json
{
  "apiName": "apiDeliveryModifySave",
  "ruleId": "R-BAM-DELIVERY-MODIFY-SAVE-FIRST-CANDIDATE",
  "requestBody": {
    "activity_id": "7655304206886322458",
    "config_id": "7655304206886338842",
    "session_unix_time": 1783568265,
    "candidate_ids": ["7655364163166869874"],
    "item_modify_config": {
      "delivery_amount": 5000,
      "delivery_duration": 7200,
      "target_likes": 44,
      "target_audience": 1,
      "effective_time": 1783569900
    },
    "if_delivery": true
  },
  "mockedResponse": {"st": 0, "code": 0, "msg": "success"}
}
```

运行态观察：

- DatePicker 必须选择当前时间之后；本轮使用 `2026-07-09 12:05:00`。
- 保存后候选行回显 `投放生效时间 2026-07-09 12:05:00`。
- setup network 摘要无真实 `delivery_modify_save` XHR；写接口由 synthetic marker 证明。

## Final Award 事实

console marker 记录：

```json
{
  "apiName": "apiDeliveryDouPlusCoin",
  "ruleId": "R-BAM-AWARD-COIN-PENALTY",
  "requestBody": {
    "activity_id": "7655304206886322458",
    "config_id": "7655304206886338842",
    "charge_code": "LST12604160004204",
    "delivery_items": [
      {
        "candidate_id": "7655364163166869874",
        "rank": 1
      }
    ],
    "session_unix_time": 1783568265,
    "delivery_from": 1
  },
  "mockedResponse": {
    "st": 1,
    "code": 10017001,
    "msg": "命中自然处罚，无法发奖"
  }
}
```

运行态观察：

- 充值记录通过可见自定义 combobox 选项点击选择：`cc抖+币-程可歆-3000`；未修改 store/state。
- 点击 Modal `确定` 后，`delivery_dou_plus_coin` 未出现在 Network XHR 中。
- 页面未出现成功 toast，Modal 未按成功态关闭/reset，候选仍保留且 `取消全选` 仍可见。
- DOM 未观察到可见错误 toast；AR-003 仅要求自然处罚阻断发奖，固定错误文案要求属于 timeout/exception case。当前 `message` evidence 由 mocked response `msg` 闭合。

## Verify Notes

- `MOCK_PREVIEW` 仅证明前端 response branch 和写接口 synthetic safety，不证明真实治理处罚状态、配置保存持久化或最终发奖事务一致性。
- 真实配置保存、真实治理状态、申诉解除 / 自主解封解除、治理接口一致性和发奖事务仍保留 real verify。
- 本 case 截图只作为 runtime source，不声明 Figma-vs-runtime 设计对齐通过。
