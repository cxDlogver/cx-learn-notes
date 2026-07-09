import "dotenv/config";

// 模型调用
import { ChatOpenAI } from "@langchain/openai";

const llm = new ChatOpenAI({
  model: process.env.LLM_MODEL,
  apiKey: process.env.API_KEY,
  configuration: {
    baseURL: process.env.BASE_URL,
  },
});

const invoke = async () => {
  const res = await llm.invoke(`你好，我要查一下合一的数学成绩`);

  console.log(res.content);
};

invoke();
