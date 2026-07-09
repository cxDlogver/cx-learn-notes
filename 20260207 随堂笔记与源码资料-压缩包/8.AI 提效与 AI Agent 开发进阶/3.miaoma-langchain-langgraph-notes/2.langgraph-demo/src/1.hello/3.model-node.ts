// 既然 langgraph 是图编排
// 1. node、2. edge
import { task } from "@langchain/langgraph";
import { modelWithTools } from "./2.model";
import { BaseMessage, SystemMessage } from "langchain";

export const callLLM = task(
  { name: "callLLM" },
  async (messages: BaseMessage[]) => {
    return modelWithTools.invoke([
      new SystemMessage("负责对一组数据进行算术运算"),
      ...messages,
    ]);
  },
);
