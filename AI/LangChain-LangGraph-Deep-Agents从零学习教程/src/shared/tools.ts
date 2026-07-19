import { tool } from "langchain";
import { z } from "zod";

const orders = {
  "ORDER-1001": { status: "已发货", eta: "2026-07-18" },
  "ORDER-1002": { status: "待支付", eta: null },
} as const;

export const getOrderStatus = tool(
  ({ orderId }) => {
    const order = orders[orderId as keyof typeof orders];
    return order
      ? JSON.stringify({ orderId, ...order })
      : JSON.stringify({ orderId, error: "订单不存在" });
  },
  {
    name: "get_order_status",
    description: "根据订单号查询订单状态和预计送达日期",
    schema: z.object({
      orderId: z.string().describe("订单号，例如 ORDER-1001"),
    }),
  },
);

export const searchKnowledgeBase = tool(
  ({ query }) => {
    const items = [
      "支付成功但订单未更新：先核对支付回调，再检查消费队列积压。",
      "接口 5xx 突增：核对最近发布、依赖服务和数据库连接池。",
      "创建生产工单前必须附带证据、影响范围和回滚建议。",
    ];
    return JSON.stringify({ query, results: items });
  },
  {
    name: "search_knowledge_base",
    description: "检索内部故障处理知识库",
    schema: z.object({ query: z.string().min(2) }),
  },
);

export const createIncidentTicket = tool(
  ({ title, severity, evidence }) => {
    // 教学用 mock：不访问真实工单系统。
    return JSON.stringify({
      ticketId: `MOCK-${Date.now()}`,
      title,
      severity,
      evidence,
      status: "created",
    });
  },
  {
    name: "create_incident_ticket",
    description: "创建故障工单；这是敏感写操作，执行前必须审批",
    schema: z.object({
      title: z.string().min(4),
      severity: z.enum(["low", "medium", "high"]),
      evidence: z.string().min(10),
    }),
  },
);
