// src/1.base-rag/index.ts
import "dotenv/config";
import { ChatOpenAI } from "@langchain/openai";
var llm = new ChatOpenAI({
  model: process.env.LLM_MODEL,
  apiKey: process.env.API_KEY,
  configuration: {
    baseURL: process.env.BASE_URL
  }
});
var invoke = async () => {
  const res = await llm.invoke(`\u4F60\u597D\uFF0C\u6211\u8981\u67E5\u4E00\u4E0B\u5408\u4E00\u7684\u6570\u5B66\u6210\u7EE9`);
  console.log(res.content);
};
invoke();
