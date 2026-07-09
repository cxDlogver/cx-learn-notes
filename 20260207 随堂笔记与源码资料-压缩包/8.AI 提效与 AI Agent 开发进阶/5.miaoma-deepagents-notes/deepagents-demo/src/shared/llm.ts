import "dotenv/config";

// openai 统一协议
// ollama，@langchain/ollama
// anthropic
import { ChatOpenAI } from "@langchain/openai";

export const llm = new ChatOpenAI({
  model: process.env.LLM_MODEL,
  apiKey: process.env.API_KEY,
  configuration: {
    baseURL: process.env.BASE_URL,
  },
});
