// src/shared/model.ts
import { ChatOpenAI } from "@langchain/openai";

// src/shared/env.ts
import { config as loadDotEnv } from "dotenv";
import path from "node:path";
var ENV_FILE_PATH = path.resolve(import.meta.dirname, "../../.env");
loadDotEnv({ path: ENV_FILE_PATH });
var REQUIRED_MODEL_ENV_KEYS = [
  "LLM_MODEL",
  "BASE_URL",
  "API_KEY"
];
var readModelConfig = (env = process.env) => {
  const missingKeys = REQUIRED_MODEL_ENV_KEYS.filter((key) => {
    const value = env[key];
    return value === void 0 || value.trim() === "";
  });
  if (missingKeys.length > 0) {
    throw new Error(`\u7F3A\u5C11\u73AF\u5883\u53D8\u91CF: ${missingKeys.join(", ")}`);
  }
  return {
    model: env.LLM_MODEL.trim(),
    baseURL: env.BASE_URL.trim(),
    apiKey: env.API_KEY.trim()
  };
};

// src/shared/model.ts
var createChatModel = ({
  config = readModelConfig(),
  temperature = 0
} = {}) => new ChatOpenAI({
  model: config.model,
  apiKey: config.apiKey,
  temperature,
  configuration: {
    apiKey: config.apiKey,
    baseURL: config.baseURL
  }
});
export {
  createChatModel
};
