import { config as loadDotEnv } from "dotenv";
import path from "node:path";

export type ModelConfig = {
  model: string;
  baseURL: string;
  apiKey: string;
};

export type EmbeddingConfig = {
  model: string;
  baseURL: string;
  apiKey: string;
};

type EnvSource = Record<string, string | undefined>;

const DEFAULT_EMBEDDING_MODEL = "doubao-embedding-vision";
const ENV_FILE_PATH = path.resolve(import.meta.dirname, "../../.env");

loadDotEnv({ path: ENV_FILE_PATH });

const REQUIRED_MODEL_ENV_KEYS = [
  "LLM_MODEL",
  "BASE_URL",
  "API_KEY",
] as const;

export const readModelConfig = (env: EnvSource = process.env): ModelConfig => {
  const missingKeys = REQUIRED_MODEL_ENV_KEYS.filter((key) => {
    const value = env[key];
    return value === undefined || value.trim() === "";
  });

  if (missingKeys.length > 0) {
    throw new Error(`缺少环境变量: ${missingKeys.join(", ")}`);
  }

  return {
    model: env.LLM_MODEL!.trim(),
    baseURL: env.BASE_URL!.trim(),
    apiKey: env.API_KEY!.trim(),
  };
};

export const readEmbeddingConfig = (
  env: EnvSource = process.env
): EmbeddingConfig => {
  const modelConfig = readModelConfig(env);
  const embeddingModel = env.EMBEDDING_MODEL?.trim();

  return {
    model: embeddingModel === "" || embeddingModel === undefined
      ? DEFAULT_EMBEDDING_MODEL
      : embeddingModel,
    baseURL: modelConfig.baseURL,
    apiKey: modelConfig.apiKey,
  };
};
