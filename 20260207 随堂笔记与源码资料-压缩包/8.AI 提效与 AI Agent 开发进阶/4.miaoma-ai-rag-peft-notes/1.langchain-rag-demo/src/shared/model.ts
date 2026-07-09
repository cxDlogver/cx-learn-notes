import { ChatOpenAI } from "@langchain/openai";

import { readModelConfig, type ModelConfig } from "./env";

type CreateChatModelOptions = {
  config?: ModelConfig;
  temperature?: number;
};

export const createChatModel = ({
  config = readModelConfig(),
  temperature = 0,
}: CreateChatModelOptions = {}) =>
  new ChatOpenAI({
    model: config.model,
    apiKey: config.apiKey,
    temperature,
    configuration: {
      apiKey: config.apiKey,
      baseURL: config.baseURL,
    },
  });
