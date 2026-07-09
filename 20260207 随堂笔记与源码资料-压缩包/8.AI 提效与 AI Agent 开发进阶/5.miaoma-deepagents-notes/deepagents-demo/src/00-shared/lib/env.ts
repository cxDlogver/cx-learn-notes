import "dotenv/config";
import { randomUUID } from "node:crypto";
import { resolve } from "node:path";

import { ChatOpenAI } from "@langchain/openai";

export const projectRoot = process.cwd();
const defaultModelName = "doubao-seed-2.0-mini";
const defaultOpenAIBaseURL = "https://ark.cn-beijing.volces.com/api/plan/v3";

export function getModelName(): string {
  return process.env.LLM_MODEL ?? defaultModelName;
}

function getOpenAIBaseURL(): string {
  return process.env.BASE_URL ?? defaultOpenAIBaseURL;
}

function getOpenAIApiKey(): string | undefined {
  return process.env.API_KEY ?? process.env.API_KEY ?? process.env.API_KEY;
}

export function ensureProviderEnv(model = getModelName()): void {
  const baseURL = getOpenAIBaseURL();
  if ((model.startsWith("openai:") || baseURL) && !getOpenAIApiKey()) {
    throw new Error(
      "缺少火山 Ark API key。请设置 API_KEY、API_KEY 或 API_KEY。",
    );
  }
}

export function getModel() {
  const modelName = getModelName();
  const baseURL = getOpenAIBaseURL();
  const timeout = Number(process.env.OPENAI_TIMEOUT_MS ?? 240_000);

  if (baseURL || modelName.startsWith("openai:")) {
    ensureProviderEnv(modelName);
    return new ChatOpenAI({
      model: modelName.replace(/^openai:/, ""),
      apiKey: getOpenAIApiKey(),
      maxRetries: 0,
      timeout,
      configuration: baseURL ? { baseURL } : undefined,
    });
  }

  return modelName;
}

export function getUserId(): string {
  return process.env.DEEPAGENTS_USER_ID ?? "course-user-001";
}

export function threadConfig(label: string) {
  return {
    recursionLimit: 80,
    configurable: {
      thread_id: `${label}-${randomUUID()}`,
    },
  };
}

export function workspacePath(...parts: string[]): string {
  return resolve(projectRoot, ...parts);
}
