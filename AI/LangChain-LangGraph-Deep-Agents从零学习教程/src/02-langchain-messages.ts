/**
 * LangChain Message 消息体系离线示例。
 *
 * 本文件只演示 Message 的建模、Tool Calling 协议与常用处理函数，
 * 不请求模型，也不读取 .env，因此可以稳定复现。
 */
import {
  AIMessage,
  AIMessageChunk,
  HumanMessage,
  SystemMessage,
  ToolMessage,
  coerceMessageLikeToMessage,
  filterMessages,
  getBufferString,
  mapChatMessagesToStoredMessages,
  mapStoredMessagesToChatMessages,
  mergeMessageRuns,
  trimMessages,
  type BaseMessage,
  type BaseMessageLike,
  type StandardMessageStructure,
} from "@langchain/core/messages";
import type { ChatOpenAI } from "@langchain/openai";
import { tool } from "langchain";
import { z } from "zod";

function printSection(title: string, value: unknown): void {
  console.log(`\n=== ${title} ===`);
  console.dir(value, { depth: null });
}

function summarizeBaseMessage(message: BaseMessage) {
  return {
    type: message.type,
    content: message.content,
    text: message.text,
    id: message.id,
    name: message.name,
    additional_kwargs: message.additional_kwargs,
    response_metadata: message.response_metadata,
  };
}

function summarize(messages: BaseMessage[]) {
  return messages.map((message) => ({
    type: message.type,
    id: message.id,
    name: message.name,
    text: message.text,
  }));
}

// 1. BaseMessage 是抽象基类，不直接 new BaseMessage()。
// 业务代码可以用 BaseMessage 类型统一读取所有子类的公共字段。
const baseMessageExample: BaseMessage = new HumanMessage({
  content: "请查询 ORDER-1001 的配送状态。",
  name: "customer",
  id: "msg-human-base-001",
  additional_kwargs: { scene: "order_status" },
});

printSection("BaseMessage 公共结构", summarizeBaseMessage(baseMessageExample));

// 2. 四种核心消息类共同继承 BaseMessage。
// SystemMessage 和 HumanMessage 主要固定 type 与语义；
// AIMessage 和 ToolMessage 还增加了 Tool Calling 和用量等专有字段。
const systemMessage = new SystemMessage({
  content: "你是订单查询助手；不得猜测订单状态。",
  id: "msg-system-001",
});

const humanMessage = new HumanMessage({
  content: "请查询 ORDER-1001 的配送状态。",
  name: "customer",
  id: "msg-human-001",
  additional_kwargs: {
    scene: "order_status",
  },
});

const textAIMessage = new AIMessage<StandardMessageStructure>({
  content: "我需要先查询订单系统。",
  id: "msg-ai-text-001",
  response_metadata: {
    model_name: "demo-model",
    finish_reason: "stop",
  },
  usage_metadata: {
    input_tokens: 18,
    output_tokens: 12,
    total_tokens: 30,
  },
});

const sampleToolMessage = new ToolMessage({
  content: JSON.stringify({ status: "shipped" }),
  name: "get_order_status",
  tool_call_id: "call-sample-001",
  status: "success",
  artifact: { traceId: "trace-sample-001" },
});

printSection("四种核心消息的类型与专有字段", [
  {
    className: "SystemMessage",
    ...summarizeBaseMessage(systemMessage),
  },
  {
    className: "HumanMessage",
    ...summarizeBaseMessage(humanMessage),
  },
  {
    className: "AIMessage",
    ...summarizeBaseMessage(textAIMessage),
    tool_calls: textAIMessage.tool_calls,
    invalid_tool_calls: textAIMessage.invalid_tool_calls,
    usage_metadata: textAIMessage.usage_metadata,
  },
  {
    className: "ToolMessage",
    ...summarizeBaseMessage(sampleToolMessage),
    tool_call_id: sampleToolMessage.tool_call_id,
    status: sampleToolMessage.status,
    artifact: sampleToolMessage.artifact,
  },
]);

// 3. Message-like 输入是便捷语法。
// 字典里使用模型服务接口常见的 role；转换为实例后读取 LangChain 的 type。
const messageLikes: BaseMessageLike[] = [
  ["system", "你是一名简洁的助手。"],
  { role: "user", content: "你好" },
  { role: "assistant", content: "你好，有什么可以帮你？" },
];
const normalizedMessages = messageLikes.map(coerceMessageLikeToMessage);
printSection("Message-like 输入归一化", summarize(normalizedMessages));

// 4. Message Content 的三种形态。
// 三组消息使用同一段文本和图像 URL，便于直接比较结构。
const prompt = "请描述这张物流截图。";
const imageUrl = "https://example.com/order-tracking.png";

// 形态一：纯文本字符串。
// content 保持字符串；contentBlocks 提供等价的单个 text 块。
const textContentMessage = new HumanMessage(prompt);

// 形态二：OpenAI 提供方原生 Content Block。
// content 保留 image_url 对象及其 url 字段；contentBlocks 将其转成标准 image.url。
const providerNativeMessage = new HumanMessage({
  content: [
    { type: "text", text: prompt },
    {
      type: "image_url",
      image_url: { url: imageUrl },
    },
  ],
});

// 形态三：LangChain 标准 Content Block。
// 使用 contentBlocks 构造，content 与 contentBlocks 都使用标准 text/image 结构。
const standardContentMessage = new HumanMessage({
  contentBlocks: [
    { type: "text", text: prompt },
    {
      type: "image",
      url: imageUrl,
      mimeType: "image/png",
    },
  ],
});

printSection("Message Content 三种形态", [
  {
    shape: "纯文本字符串",
    content: textContentMessage.content,
    contentBlocks: textContentMessage.contentBlocks,
    text: textContentMessage.text,
  },
  {
    shape: "OpenAI 提供方原生 Content Block",
    content: providerNativeMessage.content,
    contentBlocks: providerNativeMessage.contentBlocks,
    text: providerNativeMessage.text,
  },
  {
    shape: "LangChain 标准 Content Block",
    content: standardContentMessage.content,
    contentBlocks: standardContentMessage.contentBlocks,
    text: standardContentMessage.text,
  },
]);

// 5. Tool 由名称、描述、参数 Schema 和执行函数组成。
// bindTools() 只把工具说明提供给模型；这个离线脚本不调用模型。
const orders = {
  "ORDER-1001": { status: "shipped", eta: "2026-07-18" },
} as const;

function findOrder(orderId: string) {
  const order = orders[orderId as keyof typeof orders];
  return order
    ? { orderId, ...order }
    : { orderId, error: "order_not_found" };
}

const getOrderStatus = tool(
  ({ orderId }) => JSON.stringify(findOrder(orderId)),
  {
    name: "get_order_status",
    description: "根据订单号查询配送状态和预计送达日期",
    schema: z.object({
      orderId: z.string().describe("订单号，例如 ORDER-1001"),
    }),
  },
);

export function bindOrderStatusTool(model: ChatOpenAI) {
  return model.bindTools([getOrderStatus]);
}

// 6. Tool Calling 是严格的消息配对协议：
// AIMessage.tool_calls[i].id === ToolMessage.tool_call_id。
const toolRequest = new AIMessage({
  content: "",
  id: "msg-ai-tool-request-001",
  tool_calls: [
    {
      id: "call-order-status-001",
      name: "get_order_status",
      args: { orderId: "ORDER-1001" },
    },
  ],
});

const toolResult = new ToolMessage({
  content: JSON.stringify({ status: "shipped", eta: "2026-07-18" }),
  name: "get_order_status",
  id: "msg-tool-001",
  tool_call_id: "call-order-status-001",
  status: "success",
  // artifact 供程序下游使用，不会作为消息正文发给模型。
  artifact: {
    source: "order-service",
    traceId: "trace-001",
  },
});

const finalAnswer = new AIMessage({
  content: "ORDER-1001 已发货，预计 2026-07-18 送达。",
  id: "msg-ai-final-001",
});

const toolCallingTrace: BaseMessage[] = [
  systemMessage,
  humanMessage,
  toolRequest,
  toolResult,
  finalAnswer,
];
printSection("Tool Calling 消息序列", summarize(toolCallingTrace));
printSection("Tool 结果的程序专用 artifact", toolResult.artifact);

// 7. 使用类上的 isInstance 做类型收窄，再访问专有字段。
const aiMessages = [
  textAIMessage,
  ...toolCallingTrace.filter(AIMessage.isInstance),
];
printSection(
  "AIMessage 专有字段",
  aiMessages.map((message) => ({
    text: message.text,
    toolCalls: message.tool_calls ?? [],
    usage: message.usage_metadata,
  })),
);

// 8. stream() 返回 AIMessageChunk；完整结果由 chunk.concat(...) 累积。
const chunk1 = new AIMessageChunk({ content: "预计" });
const chunk2 = new AIMessageChunk({ content: "明天送达。" });
const completeChunk = chunk1.concat(chunk2);
printSection("合并后的流式消息", completeChunk.text);

// 9. 常用消息处理函数。这里的 tokenCounter 只为离线演示：
// 实际应用应换成与目标模型分词规则一致的计数器或模型实例。
const history: BaseMessage[] = [
  new SystemMessage({ content: "你是客服助手。", id: "history-system" }),
  new HumanMessage({ content: "查订单 A", id: "history-human-1", name: "customer" }),
  new AIMessage({ content: "订单 A 已发货。", id: "history-ai-1" }),
  new HumanMessage({ content: "再查订单 B", id: "history-human-2", name: "customer" }),
  new AIMessage({ content: "订单 B 待出库。", id: "history-ai-2" }),
];

const filtered = filterMessages(history, {
  includeTypes: [SystemMessage, HumanMessage],
});

const merged = mergeMessageRuns([
  new HumanMessage("第一段要求。"),
  new HumanMessage("第二段要求。"),
  new AIMessage("已收到。"),
]);

const trimmed = await trimMessages(history, {
  maxTokens: 4,
  tokenCounter: (messages) => messages.length,
  strategy: "last",
  includeSystem: true,
  startOn: "human",
});

printSection("只保留 System/Human", summarize(filtered));
printSection("合并连续同类消息", summarize(merged));
printSection("保留 System 与最近对话", summarize(trimmed));

// 10. 持久化时存储结构化数据，恢复时重建消息实例。
const storedMessages = mapChatMessagesToStoredMessages(toolCallingTrace);
const restoredMessages = mapStoredMessagesToChatMessages(storedMessages);
printSection("序列化格式", storedMessages);
printSection("反序列化后的类型", restoredMessages.map((message) => message.type));

// getBufferString 适合生成人类可读的紧凑对话，不是无损序列化格式。
printSection("紧凑对话文本", getBufferString(toolCallingTrace));
