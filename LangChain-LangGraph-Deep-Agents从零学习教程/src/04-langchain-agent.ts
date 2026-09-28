import {
  AIMessage,
  ToolMessage,
  type BaseMessage,
} from "@langchain/core/messages";
import { createAgent, tool } from "langchain";
import { z } from "zod";

import { createModel } from "./shared/model.js";

const orders = {
  "ORDER-1001": { status: "已发货", eta: "2026-07-18" },
  "ORDER-1002": { status: "待支付", eta: null },
} as const;

/**
 * Tool 由执行函数与工具说明组成。
 * 工具说明包含 name、description 和 schema。
 */
const getOrderStatus = tool(
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

const agent = createAgent({
  model: createModel(),
  tools: [getOrderStatus],
  systemPrompt: [
    "你是订单查询助手。",
    "查询具体订单时必须调用工具，不得猜测。",
    "回答应包含订单号、状态和预计送达日期。",
  ].join("\n"),
});

function createInput() {
  return {
    messages: [
      {
        role: "user" as const,
        content: "请帮我查询订单 ORDER-1001。",
      },
    ],
  };
}

function summarizeMessage(message: BaseMessage) {
  if (AIMessage.isInstance(message) && message.tool_calls?.length) {
    return {
      type: message.type,
      toolCalls: message.tool_calls.map(({ name, args, id }) => ({
        name,
        args,
        id,
      })),
    };
  }

  if (ToolMessage.isInstance(message)) {
    return {
      type: message.type,
      toolCallId: message.tool_call_id,
      content: message.text,
    };
  }

  return {
    type: message.type,
    content: message.text,
  };
}

/** 等待 Agent 完成整个循环，再返回最终状态。 */
async function invokeAgent(): Promise<void> {
  const result = await agent.invoke(createInput(), {
    recursionLimit: 8,
  });

  console.dir(result.messages.map(summarizeMessage), { depth: null });
}

/** 按 Agent 节点观察 model -> tools -> model 的步骤更新。 */
async function streamAgentUpdates(): Promise<void> {
  const stream = await agent.stream(createInput(), {
    streamMode: "updates",
    recursionLimit: 8,
  });

  for await (const update of stream) {
    for (const [node, state] of Object.entries(update)) {
      const messages = (state as { messages?: BaseMessage[] }).messages ?? [];
      const lastMessage = messages.at(-1);

      console.log(`\n[${node}]`);
      if (lastMessage) {
        console.dir(summarizeMessage(lastMessage), { depth: null });
      }
    }
  }
}

/** 使用 v3 Event Streaming 分别消费模型文本和工具执行生命周期。 */
async function streamAgentEvents(): Promise<void> {
  const run = await agent.streamEvents(createInput(), {
    version: "v3",
    recursionLimit: 8,
  });

  await Promise.all([
    (async () => {
      for await (const message of run.messages) {
        let hasText = false;
        for await (const delta of message.text) {
          if (!hasText) {
            process.stdout.write("\n[model:text] ");
            hasText = true;
          }
          process.stdout.write(delta);
        }
        if (hasText) {
          process.stdout.write("\n");
        }
      }
    })(),
    (async () => {
      for await (const call of run.toolCalls) {
        console.log(`\n[tool:start] ${call.name}`, call.input);
        const output = await call.output;
        console.log(`[tool:end] ${output}`);
      }
    })(),
  ]);

  const finalState = await run.output;
  const finalMessage = finalState.messages.at(-1);
  if (finalMessage) {
    console.log("\n[final]", finalMessage.text);
  }
}

const mode = process.argv[2] ?? "updates";

switch (mode) {
  case "invoke":
    await invokeAgent();
    break;
  case "updates":
    await streamAgentUpdates();
    break;
  case "events":
    await streamAgentEvents();
    break;
  default:
    throw new Error("可用模式：invoke、updates、events");
}
