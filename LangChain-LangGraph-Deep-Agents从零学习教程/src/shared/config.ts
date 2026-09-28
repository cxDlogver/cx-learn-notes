import { config as loadDotenv } from "dotenv";
import { fileURLToPath } from "node:url";
import { z } from "zod";

// 无论从哪个工作目录启动，都固定读取教程根目录的 .env。
export const projectRoot = fileURLToPath(new URL("../../", import.meta.url));
export const envPath = fileURLToPath(new URL("../../.env", import.meta.url));
loadDotenv({ path: envPath, quiet: true });

const EnvSchema = z.object({
  API_KEY: z.string().min(1, "API_KEY 不能为空"),
  BASE_URL: z.url("BASE_URL 必须是完整 URL"),
  LLM_MODEL: z.string().min(1, "LLM_MODEL 不能为空"),
  MODEL_TIMEOUT_MS: z.coerce.number().int().positive().default(120_000),
  HITL_AUTO_DECISION: z.enum(["approve", "reject"]).default("reject"),
});

export type AppEnv = z.infer<typeof EnvSchema>;

export function getEnv(): AppEnv {
  const parsed = EnvSchema.safeParse(process.env);
  if (!parsed.success) {
    const details = z.prettifyError(parsed.error);
    throw new Error(`.env 配置无效：\n${details}`);
  }
  if (parsed.data.API_KEY === "replace-with-your-api-key") {
    throw new Error(`请先在 ${envPath} 中填写真实 API_KEY`);
  }
  return parsed.data;
}
