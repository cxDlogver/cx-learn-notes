import { LLM, type Message } from "./llm.js";

export const DEFAULT_SMOKE_TEST_PROMPT = "你好，今天天气怎么样， 1+1=？";

export interface SmokeTestLLM {
  invoke(messages: Message[]): Promise<Message>;
}

export interface SmokeTestOptions {
  llm?: SmokeTestLLM;
  prompt?: string;
}

export async function runSmokeTest(options: SmokeTestOptions = {}): Promise<string> {
  const llm = options.llm ?? new LLM();
  const prompt = options.prompt ?? DEFAULT_SMOKE_TEST_PROMPT;

  const response = await llm.invoke([
    {
      role: "user",
      content: prompt
    }
  ]);

  return response.content;
}

async function main(): Promise<void> {
  console.log("开始测试百炼模型调用...");
  console.log(`测试问题：${DEFAULT_SMOKE_TEST_PROMPT}`);

  const content = await runSmokeTest();

  console.log("模型回复：");
  console.log(content);
}

const isDirectRun = process.argv[1]?.includes("test-llm.ts") ?? false;

if (isDirectRun) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
