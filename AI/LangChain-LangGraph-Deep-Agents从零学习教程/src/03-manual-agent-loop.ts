import {
  AIMessage,
  AIMessageChunk,
  HumanMessage,
  SystemMessage,
  ToolMessage,
  type BaseMessage,
} from "@langchain/core/messages";

import { createModel } from "./shared/model.js";
import { getOrderStatus } from "./shared/tools.js";

const MAX_STEPS = 6;
const QUESTION = "请帮我查询订单 ORDER-1001，并用一句中文告诉我何时送达。";
const tools = { [getOrderStatus.name]: getOrderStatus };

// bindTools 只把工具说明提供给模型，不会执行工具函数。
const modelWithTools = createModel().bindTools(Object.values(tools));

type RequestedToolCall = NonNullable<AIMessage["tool_calls"]>[number];

function createMessages(): BaseMessage[] {
  return [
    new SystemMessage("你是订单查询助手。查询具体订单时必须调用工具，不得猜测。"),
    new HumanMessage(QUESTION),
  ];
}

/**
 * 执行一轮模型请求中的全部 Tool Call，并把结果转换成 ToolMessage。
 */
async function appendToolResults(
  toolCalls: RequestedToolCall[],
  messages: BaseMessage[],
  step: number,
): Promise<void> {
  for (const call of toolCalls) {
    const selectedTool = tools[call.name as keyof typeof tools];

    if (!selectedTool) {
      messages.push(
        new ToolMessage({
          name: call.name,
          tool_call_id: call.id ?? `unknown-${step}`,
          status: "error",
          content: JSON.stringify({
            error: "unknown_tool",
            message: `未知工具：${call.name}`,
          }),
        }),
      );
      continue;
    }

    try {
      const parsedArgs = selectedTool.schema.parse(call.args);
      const observation = await selectedTool.invoke(parsedArgs);

      console.log(`[tool] ${call.name}`, parsedArgs);
      messages.push(
        new ToolMessage({
          name: call.name,
          tool_call_id: call.id ?? `${call.name}-${step}`,
          status: "success",
          content: String(observation),
        }),
      );
    } catch (error) {
      // Tool 失败也必须完成 Tool Call -> ToolMessage 配对，让下一轮模型决定如何恢复。
      messages.push(
        new ToolMessage({
          name: call.name,
          tool_call_id: call.id ?? `${call.name}-${step}`,
          status: "error",
          content: JSON.stringify({
            error: "tool_execution_failed",
            message: error instanceof Error ? error.message : String(error),
          }),
        }),
      );
    }
  }
}

/**
 * 非流式手写 Agent Loop：每一轮直接取得完整 AIMessage。
 */
async function runWithInvoke(): Promise<AIMessage> {
  const messages = createMessages();

  for (let step = 1; step <= MAX_STEPS; step += 1) {
    const aiMessage = await modelWithTools.invoke(messages);
    messages.push(aiMessage);

    if (!aiMessage.tool_calls?.length) {
      return aiMessage;
    }

    await appendToolResults(aiMessage.tool_calls, messages, step);
  }

  throw new Error(`超过最大执行步数 ${MAX_STEPS}，终止循环以防失控`);
}

/**
 * 取得一次模型调用的 Chunk，并合并成可以读取完整 Tool Call 的消息。
 */
async function streamOneModelCall(
  messages: BaseMessage[],
): Promise<AIMessageChunk> {
  let completeMessage: AIMessageChunk | undefined;

  for await (const chunk of await modelWithTools.stream(messages)) {
    process.stdout.write(chunk.text);
    completeMessage = completeMessage
      ? completeMessage.concat(chunk)
      : chunk;
  }

  if (!completeMessage) {
    throw new Error("模型没有返回任何消息 Chunk");
  }

  return completeMessage;
}

/**
 * 流式手写 Agent Loop：一边输出文本，一边合并 Chunk；
 * 每轮模型输出结束后，再读取完整 tool_calls 并执行工具。
 */
async function runWithStream(): Promise<AIMessageChunk> {
  const messages = createMessages();

  for (let step = 1; step <= MAX_STEPS; step += 1) {
    const aiMessage = await streamOneModelCall(messages);
    messages.push(aiMessage);

    if (!aiMessage.tool_calls?.length) {
      return aiMessage;
    }

    await appendToolResults(aiMessage.tool_calls, messages, step);
  }

  throw new Error(`超过最大执行步数 ${MAX_STEPS}，终止循环以防失控`);
}

const mode = process.argv[2] ?? "invoke";

if (mode === "invoke") {
  const answer = await runWithInvoke();
  console.log("[answer]", answer.text);
} else if (mode === "stream") {
  await runWithStream();
  process.stdout.write("\n");
} else {
  throw new Error("运行模式只能是 invoke 或 stream");
}
