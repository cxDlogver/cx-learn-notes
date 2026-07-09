type OrderMetricPayload = {
  productLine: string;
  metrics: {
    orders: number;
    refundRate: number;
    avgSeatCount: number;
  };
};

export function summarizeOrderMetrics(payload: OrderMetricPayload) {
  const { productLine, metrics } = payload;
  const refundPercent = `${(metrics.refundRate * 100).toFixed(1)}%`;
  return {
    productLine,
    summary: `${productLine} 有 ${metrics.orders} 笔订单，退款率 ${refundPercent}，平均席位数 ${metrics.avgSeatCount}。`,
    implication:
      metrics.avgSeatCount >= 5
        ? "更适合团队型采购，需要强调协作和落地流程。"
        : "更偏个人学习路径，需要强调上手速度和低风险试错。",
  };
}
