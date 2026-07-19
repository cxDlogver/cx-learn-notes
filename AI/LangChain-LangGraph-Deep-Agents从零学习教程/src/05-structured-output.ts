import { AIMessage } from "@langchain/core/messages";
import { createAgent, providerStrategy, toolStrategy } from "langchain";
import { z } from "zod";

import { createModel } from "./shared/model.js";
import {
  TicketAnalysis,
  ticketAnalysisInstructions,
  ticketAnalysisOutputOptions,
} from "./shared/ticket-analysis.js";

const TICKET =
  "用户反馈：ORDER-1001 显示已发货，但三天没有物流更新。请分类并判断优先级。";

type AgentStructuredOutputStrategy = "auto" | "provider" | "tool";

/** Zod 本地校验、错误结果和 JSON Schema 转换。 */
function demonstrateZod(): void {
  const validInput: unknown = {
    category: "delivery",
    urgency: "medium",
    summary: "订单已发货但三天没有物流更新",
    missingInformation: ["承运商名称", "最后一次物流更新时间"],
  };

  const parsed: TicketAnalysis = TicketAnalysis.parse(validInput);
  console.log("[zod:parsed]", parsed);

  const invalidResult = TicketAnalysis.safeParse({
    category: "delivery",
    urgency: "urgent",
    summary: "订单已发货但三天没有物流更新",
    missingInformation: [],
  });
  console.log(
    "[zod:invalid]",
    invalidResult.success
      ? invalidResult.data
      : invalidResult.error.issues.map(({ path, message }) => ({ path, message })),
  );

  console.dir(z.toJSONSchema(TicketAnalysis), { depth: null });
}

/** Model 层：返回原始 AIMessage 与通过 Zod 校验后的对象。 */
async function invokeStructuredModel(): Promise<void> {
  const structuredModel = createModel().withStructuredOutput(TicketAnalysis, {
    ...ticketAnalysisOutputOptions,
    includeRaw: true,
  });

  const result = await structuredModel.invoke(
    `${ticketAnalysisInstructions}\n\n${TICKET}`,
  );

  console.dir(
    {
      parsed: result.parsed,
      rawMessageType: result.raw.type,
      usageMetadata: AIMessage.isInstance(result.raw)
        ? result.raw.usage_metadata
        : undefined,
    },
    { depth: null },
  );

  if (result.parsed === null) {
    console.log("[model输出]", result);
    throw new Error("模型返回了消息，但内容没有通过 TicketAnalysis Schema 校验");
  }
}

/**
 * 展示同一份 JSON Schema 在两种协议中所在的位置。
 * 这是教学用的 OpenAI-compatible 最小结构，不会发起网络请求。
 */
function demonstrateStrategyProtocols(): void {
  const schema = z.toJSONSchema(TicketAnalysis);

  const providerProtocol = {
    request: {
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "ticket_analysis",
          strict: true,
          schema,
        },
      },
    },
    response: {
      content: JSON.stringify({
        category: "delivery",
        urgency: "medium",
        summary: "订单已发货但三天没有物流更新",
        missingInformation: ["承运商名称"],
      }),
      tool_calls: [],
    },
  };

  const toolCallingProtocol = {
    request: {
      tools: [
        {
          type: "function",
          function: {
            name: "ticket_analysis",
            description: "提交最终的工单分析结果",
            parameters: schema,
          },
        },
      ],
    },
    response: {
      content: "",
      tool_calls: [
        {
          id: "call-ticket-analysis-001",
          name: "ticket_analysis",
          args: {
            category: "delivery",
            urgency: "medium",
            summary: "订单已发货但三天没有物流更新",
            missingInformation: ["承运商名称"],
          },
        },
      ],
    },
  };

  console.dir({ providerProtocol, toolCallingProtocol }, { depth: null });
}

/** Agent 层：对比自动选择、Provider Strategy 和 Tool Strategy。 */
async function invokeStructuredAgent(
  strategy: AgentStructuredOutputStrategy,
): Promise<void> {
  const input = {
    messages: [{ role: "user" as const, content: TICKET }],
  };
  const config = { recursionLimit: 6 };

  if (strategy === "provider") {
    const agent = createAgent({
      model: createModel(),
      tools: [],
      systemPrompt: "你是客服工单分析助手。",
      responseFormat: providerStrategy(TicketAnalysis),
    });
    const result = await agent.invoke(input, config);
    printAgentResult(strategy, result.structuredResponse, result.messages);
    return;
  }

  if (strategy === "tool") {
    const agent = createAgent({
      model: createModel(),
      tools: [],
      systemPrompt: "你是客服工单分析助手。",
      responseFormat: toolStrategy(TicketAnalysis, { handleError: true }),
    });
    const result = await agent.invoke(input, config);
    printAgentResult(strategy, result.structuredResponse, result.messages);
    return;
  }

  const agent = createAgent({
    model: createModel(),
    tools: [],
    systemPrompt: "你是客服工单分析助手。",
    responseFormat: TicketAnalysis,
  });
  const result = await agent.invoke(input, config);
  printAgentResult(strategy, result.structuredResponse, result.messages);
}

function printAgentResult(
  strategy: AgentStructuredOutputStrategy,
  structuredResponse: unknown,
  messages: Array<{ type: string }>,
): void {
  const analysis = TicketAnalysis.parse(structuredResponse);
  console.dir(
    {
      strategy,
      structuredResponse: analysis,
      messageTypes: messages.map((message) => message.type),
    },
    { depth: null },
  );
}

const mode = process.argv[2] ?? "zod";

switch (mode) {
  case "zod":
    demonstrateZod();
    break;
  case "model":
    await invokeStructuredModel();
    break;
  case "protocols":
    demonstrateStrategyProtocols();
    break;
  case "agent-auto":
    await invokeStructuredAgent("auto");
    break;
  case "agent-provider":
    await invokeStructuredAgent("provider");
    break;
  case "agent-tool":
    await invokeStructuredAgent("tool");
    break;
  case "all":
    demonstrateZod();
    demonstrateStrategyProtocols();
    await invokeStructuredModel();
    await invokeStructuredAgent("tool");
    break;
  default:
    throw new Error(
      "可用模式：zod、protocols、model、agent-auto、agent-provider、agent-tool、all",
    );
}
