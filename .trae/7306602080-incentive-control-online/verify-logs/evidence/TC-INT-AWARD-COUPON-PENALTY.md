# TC-INT-AWARD-COUPON-PENALTY Runtime Evidence

## 结论

- 当前 verify scope 结论：`PASS_WITH_NOTES`。
- DOU+券 `配置二` 作者候选已恢复：`apiSearchDeliveryAuthor / R-BAM-SEARCH-CANDIDATE-COUPON-PENALTY` 命中，console marker 返回 `author_id=800001`、`if_delivery=true`、`rank=1`，页面显示 `券候选作者800001 / UID: 800001`。
- 通过页面 `一键全选` 选中唯一作者候选，按钮变为 `取消全选`。
- 充值记录选择 `cc抖+券-程可歆-5000`，对应 `charge_code=LST12607070007003`；由于自定义 combobox 的隐藏 input / overlay 限制，使用 focus + ArrowDown + Enter 的键盘路径选择第一条可见 option，未修改 store/state。
- 最终发奖通过 Modal `确定` 触发：console 捕获 `apiDeliveryDouPlusCoupon / R-BAM-AWARD-COUPON-PENALTY` 的 `[BAM_MOCK_SYNTHETIC_CONTRACT]` 与 `[BAM_MOCK_HIT]`，request 命中 `delivery_from=1`、`delivery_authors[0].candidate_id=800001`、`rank=1`、`charge_code=LST12607070007003`，响应 `{st:1,code:10017001,msg:"命中自然处罚，无法发奖"}`。
- Network 脱敏摘要未观察到真实 `delivery_dou_plus_coupon` XHR/fetch；仅观察到前置 `charge_amount_check`，符合 `MOCK_PREVIEW` 写接口 safety。
- 非成功响应后页面出现可见错误提示 `提交作者奖励投放失败: 10017001, 命中自然处罚，无法发奖`，未出现成功文案；Modal 保持打开，券作者表仍展示 DOU+券字段，没有作品字段误塞入。

## 持久证据

| 类型 | 路径 | 说明 |
|---|---|---|
| runtime JSON | `verify-logs/evidence/TC-INT-AWARD-COUPON-PENALTY--runtime.json` | SearchCandidate author restore、作者选择、充值记录选择、final synthetic markers、DOM/Network 观察 |
| final network | `verify-logs/evidence/TC-INT-AWARD-COUPON-PENALTY--browser-network-final.log` | 脱敏 Network 摘要；仅观察到 `charge_amount_check` 业务 XHR，无真实 `delivery_dou_plus_coupon` |
| screenshot attempt | `screenshots/TC-INT-AWARD-COUPON-PENALTY--final.png` | integrated_browser 返回 inline screenshot，但未创建本地文件；不作为已物化截图证据 |

## SearchCandidate 事实

console marker 记录：

```json
{
  "apiName": "apiSearchDeliveryAuthor",
  "ruleId": "R-BAM-SEARCH-CANDIDATE-COUPON-PENALTY",
  "requestBody": {
    "activity_id": "7655304206886322458",
    "config_id": "7655304206886355226",
    "publish_start_time": 1783440000,
    "publish_end_time": 1783526399,
    "page_no": 1,
    "page_size": 50,
    "session_unix_time": 1783575127,
    "candidate_pool_type": 1,
    "award_period": 1
  },
  "mockedResponseSummary": {
    "total_num": 1,
    "candidate_num": 1,
    "author_id": "800001",
    "author_name": "券候选作者800001",
    "if_delivery": true,
    "rank": 1
  }
}
```

运行态观察：

- 页面显示 `共1位满足准入门槛的作者，当前合计1位作者`。
- 页面显示 `券候选作者800001` 和 `UID：800001`。
- 券字段可见：`券类型`、`奖励金额`、`券数量`、`领取有效期`、`使用有效期类型`、`使用有效期`。
- 作品字段未出现：`作品ID`、`作品名称`、`投放金额（元）`、`投放时长`、`转化目标偏好`、`目标受众`。

## Final Award 事实

console marker 记录：

```json
{
  "apiName": "apiDeliveryDouPlusCoupon",
  "ruleId": "R-BAM-AWARD-COUPON-PENALTY",
  "requestBody": {
    "activity_id": "7655304206886322458",
    "config_id": "7655304206886355226",
    "charge_code": "LST12607070007003",
    "delivery_authors": [
      {
        "candidate_id": "800001",
        "rank": 1
      }
    ],
    "session_unix_time": 1783575127,
    "publish_start_time": 1783440000,
    "publish_end_time": 1783526399,
    "award_period": 1,
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

- 点击 Modal `确定` 后，Network 脱敏摘要中没有真实 `delivery_dou_plus_coupon`。
- 页面显示错误提示 `提交作者奖励投放失败: 10017001, 命中自然处罚，无法发奖`。
- 未出现 `提交成功`、`发奖成功` 或 `投放成功`。
- Modal 保持打开，充值记录显示 `cc抖+券-程可歆-5000`，余额提示仍可见。
- 作者行仍显示 `券候选作者800001`，未进入成功发奖关闭 / reset。

## Verify Notes

- `MOCK_PREVIEW` 仅证明前端 non-success response branch 和写接口 synthetic safety，不证明真实治理处罚状态、真实券账户余额一致性或最终发奖事务。
- 真实治理处罚状态、真实发奖事务和券充值记录一致性保留 real verify / post-verify recheck。
- 本 case 没有声明 Figma-vs-runtime 设计对齐通过；截图工具只返回 inline 图像，未物化到本地文件。
