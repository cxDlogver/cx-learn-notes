import { ChatOpenAI } from "@langchain/openai";

import { getEnv } from "./config.js";

/**
 * 全部案例共用同一模型工厂，模型密钥、地址和名称只从教程根目录 .env 读取。
 */
export function createModel(temperature = 0): ChatOpenAI {
  const env = getEnv();
  return new ChatOpenAI({
    model: env.LLM_MODEL,
    apiKey: env.API_KEY,
    temperature,
    timeout: env.MODEL_TIMEOUT_MS,
    maxRetries: 2,
    configuration: {
      baseURL: env.BASE_URL,
    },
    modelKwargs: {
      enable_thinking: false,
    },
  });
}
