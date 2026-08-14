import { ChatOllama } from "@langchain/ollama";
import { tools } from "./1.tools";

const model = new ChatOllama({
  model: "qwen3:0.6b",
});

export const modelWithTools = model.bindTools(tools);
