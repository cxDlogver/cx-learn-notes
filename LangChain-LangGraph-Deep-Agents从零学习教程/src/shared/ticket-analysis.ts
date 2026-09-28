import { z } from "zod";

/**
 * 工单分析的唯一数据契约，同时提供运行时校验与 TypeScript 类型推导。
 */
export const TicketAnalysis = z
  .object({
    category: z
      .enum(["payment", "delivery", "account", "other"])
      .describe("工单分类"),
    urgency: z.enum(["low", "medium", "high"]).describe("紧急程度"),
    summary: z.string().min(1).describe("一句话问题摘要"),
    missingInformation: z
      .array(z.string())
      .describe("继续处理前仍需补充的信息；没有则返回空数组"),
  })
  .strict()
  .meta({
    title: "ticket_analysis",
    description: "客服工单的结构化分析结果",
  });

export type TicketAnalysis = z.infer<typeof TicketAnalysis>;

export const ticketAnalysisInstructions = [
  '请只返回一个 JSON 对象，不要返回 Markdown 或额外解释。JSON 对象必须包含 "category"、"urgency"、"summary"、"missingInformation" 四个字段。"category" 只能是 "payment"、"delivery"、"account"、"other" 之一。"urgency" 只能是 "low"、"medium"、"high" 之一。"missingInformation" 必须是字符串数组；没有缺失信息时返回空数组 []。'
].join("\n");

export const ticketAnalysisOutputOptions = {
  name: "ticket_analysis",
  method: "jsonMode",
} as const;
