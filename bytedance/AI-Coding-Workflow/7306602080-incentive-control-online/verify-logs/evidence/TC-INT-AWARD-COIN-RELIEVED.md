# TC-INT-AWARD-COIN-RELIEVED Runtime Evidence

## 结论

- 当前 verify scope 结论：`PASS_WITH_NOTES`。
- SearchCandidate 样本已恢复：`apiSearchDeliveryItems / R-BAM-SEARCH-CANDIDATE-COIN-PENALTY` 命中，返回两条 DOU+币候选；其中解除态候选 `700002` 为 `rank=2`，带 `delivery_config.effective_time=1783656000`。
- 通过页面批量提交路径选择解除态候选 `700002`；受 integrated_browser 坐标/浮层点击限制影响，checkbox 使用 label DOM click fallback，后续由 checkbox checked state 和 final request payload 复核，未改 store/state。
- 充值记录选择 `cc抖+币-程可歆-15000`；因下拉 option 的 `browser_click` 被 overlay 拦截，使用 option 节点鼠标事件序列 fallback，随后 DOM 显示该 option selected 且 `确定` 解锁，未改 store/state。
- 最终发奖通过 Modal `确定` 触发：console 捕获 `apiDeliveryDouPlusCoin / R-BAM-AWARD-COIN-RELIEVED` 的 `[BAM_MOCK_SYNTHETIC_CONTRACT]` 与 `[BAM_MOCK_HIT]`，request 命中 `delivery_from=1`、`delivery_items[0].candidate_id=700002`、`rank=2`、`charge_code=LST12604140006412`，响应 `{st:0,code:0,msg:"success"}`。
- Network 脱敏摘要和临时 XHR/fetch 捕获器均未观察到真实 `delivery_dou_plus_coin` 请求；符合 `MOCK_PREVIEW` 写接口 safety。
- 成功响应后观察到 `提交成功`，弹窗随后关闭；未出现 `命中自然处罚` / `无法发奖` 等治理失败文案，两个候选标题仍保留，未观察到候选删除。

## 持久证据

| 类型 | 路径 | 说明 |
|---|---|---|
| runtime JSON | `verify-logs/evidence/TC-INT-AWARD-COIN-RELIEVED--runtime.json` | SearchCandidate restore、解除候选选择、充值记录选择、final synthetic markers、DOM/Network 观察 |
| final network | `verify-logs/evidence/TC-INT-AWARD-COIN-RELIEVED--browser-network-final.log` | 99 行脱敏 Network 摘要；仅观察到 `charge_amount_check` 业务 XHR，无真实 `delivery_dou_plus_coin` |
| success 截图 | `screenshots/TC-INT-AWARD-COIN-RELIEVED-success-toast.png` | 点击 `确定` 后的成功提示/运行态截图 |
| final 截图 | `screenshots/TC-INT-AWARD-COIN-RELIEVED-final-page.png` | Modal 收起后的页面稳定态；第二个候选仍选中且候选未删除 |

## SearchCandidate 事实

console marker 记录：

```json
{
  "apiName": "apiSearchDeliveryItems",
  "ruleId": "R-BAM-SEARCH-CANDIDATE-COIN-PENALTY",
  "requestBody": {
    "activity_id": "7655304206886322458",
    "config_id": "7655304206886338842",
    "page_no": 1,
    "page_size": 50,
    "session_unix_time": 1783571101,
    "candidate_pool_type": 1
  },
  "mockedResponseSummary": {
    "total_num": 2,
    "candidate_num": 2,
    "items": [
      {"item_id": "7655364163166869874", "rank": 1},
      {"item_id": "700002", "rank": 2, "delivery_config.effective_time": 1783656000}
    ]
  }
}
```

运行态观察：

- 页面展示 `DOU+币 SearchCandidate 可投放作品` 与 `DOU+币解除状态可投放作品`。
- 提交前 checkbox 状态为：第 1 个候选 `checked=false`，第 2 个候选 `checked=true`。
- 第 2 个候选展示 `投放生效时间 2026-07-10 12:00:00`。

## Final Award 事实

console marker 记录：

```json
{
  "apiName": "apiDeliveryDouPlusCoin",
  "ruleId": "R-BAM-AWARD-COIN-RELIEVED",
  "requestBody": {
    "activity_id": "7655304206886322458",
    "config_id": "7655304206886338842",
    "charge_code": "LST12604140006412",
    "delivery_items": [
      {
        "candidate_id": "700002",
        "rank": 2
      }
    ],
    "session_unix_time": 1783571101,
    "delivery_from": 1
  },
  "mockedResponse": {
    "st": 0,
    "code": 0,
    "msg": "success"
  }
}
```

运行态观察：

- 充值记录选中 `cc抖+币-程可歆-15000`，对应 `charge_code=LST12604140006412`。
- 点击 Modal `确定` 后，临时捕获器记录 `xhr=[]`、`fetch=[]`，未观察到真实 `delivery_dou_plus_coin`。
- 浏览器 Network 摘要中仅有 `charge_amount_check` 业务 XHR；`delivery_dou_plus_coin` 不存在。
- 成功响应后曾出现 `提交成功`；稳定态 Modal 已关闭。
- 未出现 `命中自然处罚` / `无法发奖` 文案；两个候选标题仍可见，未观察到候选删除。

## Verify Notes

- `MOCK_PREVIEW` 仅证明前端 success response branch 和写接口 synthetic safety，不证明真实治理解除状态、真实 status 1/2 后端语义、充值账户一致性或最终发奖事务。
- 真实治理解除状态、真实发奖事务和充值记录一致性保留 real verify / post-verify recheck。
- 本 case 截图只作为 runtime source，不声明 Figma-vs-runtime 设计对齐通过。
