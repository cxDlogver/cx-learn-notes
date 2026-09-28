import {
  AIMessageChunk,
  HumanMessage,
  SystemMessage,
} from "@langchain/core/messages";

import { createModel } from "./shared/model.js";

const model = createModel();

function summarizeMessage(message: Awaited<ReturnType<typeof model.invoke>>) {
  return {
    type: message.type,
    text: message.text,
    contentBlocks: message.contentBlocks,
    toolCalls: message.tool_calls,
    usageMetadata: message.usage_metadata,
    responseMetadata: message.response_metadata,
  };
}

/** 字符串会被归一化为一条 HumanMessage，返回值仍然是 AIMessage。 */
async function runInvokeString(): Promise<void> {
  const response = await model.invoke("用一句中文解释 Chat Model 的作用。");
  console.dir(summarizeMessage(response), { depth: null });
}

/** 消息数组可以同时提供 System 指令、多轮历史和当前用户输入。 */
async function runInvokeMessages(): Promise<void> {
  const response = await model.invoke([
    new SystemMessage("你是 TypeScript 教学助手，回答不超过两句话。"),
    new HumanMessage("model.invoke() 返回字符串还是 AIMessage？"),
  ]);
  console.dir(summarizeMessage(response), { depth: null });
}

/** stream() 返回 AIMessageChunk；合并后才能得到完整消息和完整 Tool Call。 */
async function runStream(): Promise<void> {
  let complete: AIMessageChunk | undefined;

  for await (const chunk of await model.stream(
    "用一句中文说明 AIMessageChunk 与 AIMessage 的区别。",
  )) {
    process.stdout.write(chunk.text);
    complete = complete ? complete.concat(chunk) : chunk;
  }

  process.stdout.write("\n");
  console.dir(
    {
      completeType: complete?.type,
      completeText: complete?.text,
      usageMetadata: complete?.usage_metadata,
    },
    { depth: null },
  );
}

/** batch() 处理互相独立的输入；maxConcurrency 限制同时进行的模型请求数。 */
async function runBatch(): Promise<void> {
  const responses = await model.batch(
    ["什么是 Model？", "什么是 Message？", "什么是 Tool？"],
    { maxConcurrency: 2 },
  );

  console.dir(responses.map(summarizeMessage), { depth: null });
}

const mode = process.argv[2] ?? "invoke";

switch (mode) {
  case "invoke":
    await runInvokeString();
    break;
  case "messages":
    await runInvokeMessages();
    break;
  case "stream":
    await runStream();
    break;
  case "batch":
    await runBatch();
    break;
  case "all":
    await runInvokeString();
    await runInvokeMessages();
    await runStream();
    await runBatch();
    break;
  default:
    throw new Error("可用模式：invoke、messages、stream、batch、all");
}
