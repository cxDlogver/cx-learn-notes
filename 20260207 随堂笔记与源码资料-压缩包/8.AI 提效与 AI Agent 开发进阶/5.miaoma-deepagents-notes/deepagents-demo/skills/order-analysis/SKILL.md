---
name: order-analysis
description: Use this skill when analyzing simulated course order metrics or converting order metrics into concise business implications.
module: scripts/index.ts
---

# order-analysis

## 使用场景

当用户要求分析 `get_order_metrics` 返回的订单指标，或把课程、workshop、consulting 产品线数据转成课程运营建议时，使用本 skill。

## 分析要求

- 不要臆造工具结果之外的数字。
- 先解释订单量，再解释退款率，最后解释平均席位数。
- 输出应包含一个简短业务含义和一个工程化行动建议。

## 可导入 helper

```typescript
const { summarizeOrderMetrics } = await import("@/skills/order-analysis/scripts");
summarizeOrderMetrics({
  productLine: "course",
  metrics: { orders: 128, refundRate: 0.023, avgSeatCount: 2.4 }
});
```
