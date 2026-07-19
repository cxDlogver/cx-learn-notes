// 入门的实例，怎么调用模型生成内容

// 1. 有模型服务，本地基于 Ollama、模型服务（火山引擎、阿里百炼），基本上没有特殊的说明的话，都是基于 OpenAI 协议的使用方式
// 2. 接入开发

// 1. baseURL:https://ark.cn-beijing.volces.com/api/plan/v3
// 2. apiKey:ark-f743305f-fcf3-42fb-adaf-7b92a7395d88-0fcf8
// 3. 参数配置
import "dotenv/config"
// require('dotenv').config()

import { ChatOpenAI } from "@langchain/openai";
// import { ChatOllama } from "@langchain/ollama";

// const llm = new ChatOllama({
//     model: "qwen3.5:0.8b"
// })

// const llm = new ChatOpenAI({
//   model: "doubao-seed-2.0-mini",
//   apiKey: "ark-f743305f-fcf3-42fb-adaf-7b92a7395d88-0fcf8",
//   configuration: {
//     baseURL: "https://ark.cn-beijing.volces.com/api/plan/v3",
//   },
// });
const llm = new ChatOpenAI({
  model: process.env.LLM_MODEL,
  apiKey: process.env.API_KEY,
  configuration: {
    baseURL: process.env.BASE_URL,
  },
});

const invoke = async () => {
  const res = await llm.invoke("豆包，10192039+1235231 等于几？");

  console.log(res);
};

invoke();
