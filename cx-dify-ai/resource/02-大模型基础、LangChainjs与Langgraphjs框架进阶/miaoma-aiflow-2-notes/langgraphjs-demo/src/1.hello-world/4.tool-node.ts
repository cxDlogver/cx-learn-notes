import { task } from "@langchain/langgraph";
import { ToolCall } from "langchain";
import { toolsByName } from "./1.tools";

export const callTool = task(
  { name: "callTool" },
  async (toolCall: ToolCall) => {
    const tool = toolsByName[toolCall.name];

    return tool?.invoke(toolCall);
  }
);
