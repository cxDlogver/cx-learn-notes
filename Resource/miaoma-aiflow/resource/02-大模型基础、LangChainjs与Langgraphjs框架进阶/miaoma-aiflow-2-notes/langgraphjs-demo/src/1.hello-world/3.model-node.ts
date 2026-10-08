import { task } from "@langchain/langgraph";
import { BaseMessage, SystemMessage } from "langchain";
import { modelWithTools } from "./2.model.js";

export const callLLM = task(
  { name: "callLLM" },
  async (messages: BaseMessage[]) => {
    return modelWithTools.invoke([
      new SystemMessage("负责对一组输入数据进行算术运算。"),
      ...messages,
    ]);
  }
);
