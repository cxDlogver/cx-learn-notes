import "dotenv/config"

import { ChatOpenAI } from "@langchain/openai";

const llm = new ChatOpenAI({
  model: process.env.LLM_MODEL,
  apiKey: process.env.API_KEY,
  configuration: {
    baseURL: process.env.BASE_URL,
  },
});

const invoke = async () => {
  const res = await llm.invoke("豆包，10192039+1235231 等于几？直接输出结果");

  console.log(res.content);
};

invoke();
