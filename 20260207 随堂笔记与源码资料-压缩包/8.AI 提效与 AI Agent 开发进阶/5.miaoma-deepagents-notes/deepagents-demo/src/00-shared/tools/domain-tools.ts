import { tool } from "langchain";
import { z } from "zod";

const knowledgeBase: Record<string, string> = {
  core:
    "DeepAgents 是基于 LangChain / LangGraph 的 agent harness，内置计划、虚拟文件系统、上下文压缩、子代理和默认提示词。",
  backends:
    "Backends 为 ls/read_file/write_file/edit_file/glob/grep 等文件工具提供存储实现。常见选择包括 StateBackend、FilesystemBackend、StoreBackend、CompositeBackend 和 sandbox backend。",
  subagents:
    "Subagents 通过 task 工具执行隔离任务，适合上下文隔离、专业角色和不同模型/工具/权限组合。",
  skills:
    "Skills 使用 SKILL.md 描述可复用能力，先读取 frontmatter 匹配任务，再按需读取完整说明、脚本和参考资料。",
  sandboxes:
    "Sandbox backend 在文件工具之外提供 execute 工具，用隔离环境执行代码，生产中应避免直接暴露本机 shell。",
  hitl:
    "Human-in-the-loop 通过 interruptOn 配置敏感工具审批，依赖 checkpointer 暂停和恢复。",
  memory:
    "长期记忆是 filesystem-backed memory，通常由 StoreBackend 持久化，并通过 namespace 做用户、agent 或组织级隔离。",
  streaming:
    "DeepAgents 支持 LangGraph streaming，也提供 streamEvents 的 subagents/messages/toolCalls projections，适合构建实时 UI。",
};

const searchSchema = z.object({
  topic: z.string().describe("要检索的 DeepAgents 主题，例如 core、backends、skills"),
  audience: z
    .enum(["developer", "architect", "operator"])
    .optional()
    .describe("目标读者角色"),
});

export const searchKnowledgeBase = tool(
  async ({ topic, audience = "developer" }: z.infer<typeof searchSchema>) => {
    const key = topic.toLowerCase();
    const matched = Object.entries(knowledgeBase).find(([name]) => key.includes(name));
    const summary = matched?.[1] ?? `没有命中精确主题，相关主题包括：${Object.keys(knowledgeBase).join(", ")}。`;
    return JSON.stringify(
      {
        audience,
        topic,
        summary,
        source: "local-course-knowledge-base",
      },
      null,
      2,
    );
  },
  {
    name: "search_knowledge_base",
    description: "查询本课程内置 DeepAgents 知识库，适合生成课程讲义、模块说明和对比总结。",
    schema: searchSchema,
  },
);

const metricsSchema = z.object({
  productLine: z
    .enum(["course", "workshop", "consulting"])
    .describe("产品线"),
});

export const getOrderMetrics = tool(
  async ({ productLine }: z.infer<typeof metricsSchema>) => {
    const metrics = {
      course: { orders: 128, refundRate: 0.023, avgSeatCount: 2.4 },
      workshop: { orders: 42, refundRate: 0.012, avgSeatCount: 9.8 },
      consulting: { orders: 17, refundRate: 0, avgSeatCount: 1 },
    } satisfies Record<string, unknown>;
    return JSON.stringify({ productLine, metrics: metrics[productLine] }, null, 2);
  },
  {
    name: "get_order_metrics",
    description: "读取课程产品线的模拟订单指标，用于演示工具调用和 skill 中的确定性分析。",
    schema: metricsSchema,
  },
);

const ticketSchema = z.object({
  title: z.string().describe("工单标题"),
  severity: z.enum(["low", "medium", "high"]).describe("严重程度"),
  body: z.string().describe("工单正文"),
});

export const writeReleaseTicket = tool(
  async ({ title, severity, body }: z.infer<typeof ticketSchema>) => {
    return JSON.stringify(
      {
        ticketId: `REL-${Date.now()}`,
        title,
        severity,
        body,
        status: "created",
      },
      null,
      2,
    );
  },
  {
    name: "write_release_ticket",
    description: "创建模拟发布工单。该操作代表外部系统写入，应在 demo 中配置人工审批。",
    schema: ticketSchema,
  },
);

const emailSchema = z.object({
  to: z.string().email().describe("收件人"),
  subject: z.string().describe("邮件标题"),
  body: z.string().describe("邮件正文"),
});

export const sendCourseEmail = tool(
  async ({ to, subject, body }: z.infer<typeof emailSchema>) => {
    return JSON.stringify({ to, subject, body, status: "sent" }, null, 2);
    // 真正的调用 email api 发邮件...
  },
  {
    name: "send_course_email",
    description: "发送模拟课程通知邮件。该操作代表对外发送，应在 demo 中配置人工审批。",
    schema: emailSchema,
  },
);
