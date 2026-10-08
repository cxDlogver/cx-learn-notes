import { addMessages, entrypoint } from "@langchain/langgraph";
import type { BaseMessage } from "langchain";
import { callLLM } from "./3.model-node";
import { callTool } from "./4.tool-node";

export const agent = entrypoint(
  { name: "miaoma-agent" },
  async (messages: BaseMessage[]) => {
    // 执行大模型
    let modelResponse = await callLLM(messages);

    while (true) {
      if (!modelResponse.tool_calls?.length) {
        break;
      }

      // 执行工具
      const toolResults = await Promise.all(
        modelResponse.tool_calls.map((toolCall) => callTool(toolCall))
      );
      const validToolResults = toolResults.filter(
        (result) => result !== undefined
      );
      messages = addMessages(messages, [modelResponse, ...validToolResults]);
      modelResponse = await callLLM(messages);
    }
    // 执行工具
    // 意图判断
    // 执行意图
    // 返回结果

    return messages;
  }
);
