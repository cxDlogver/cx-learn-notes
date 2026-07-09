import { InMemoryStore, MemorySaver } from "@langchain/langgraph";
import { createDeepAgent, StoreBackend } from "deepagents";

import { createTextFileData } from "../00-shared/lib/files";
import { ensureProviderEnv, getModel, getUserId, threadConfig } from "../00-shared/lib/env";
import { printFinal, printObject, printTitle } from "../00-shared/lib/output";
import { searchKnowledgeBase } from "../00-shared/tools/domain-tools";

export async function runMemoryDemo(): Promise<void> {
  ensureProviderEnv();
  printTitle("long-term-memory：StoreBackend 跨线程记忆");

  const userId = getUserId();
  const store = new InMemoryStore();
  const memoryPath = "/memories/preferences.md";

  await store.put(
    [userId],
    memoryPath,
    createTextFileData(
      [
        "## 用户偏好",
        "- 偏好简洁、结构化回答。",
        "- 示例代码优先使用 TypeScript。",
        "- 对生产安全边界敏感。",
      ].join("\n"),
    ),
  );

  const agent = createDeepAgent({
    model: getModel(),
    backend: new StoreBackend({ store, namespace: [userId] }),
    store,
    checkpointer: new MemorySaver(),
    memory: [memoryPath],
    tools: [searchKnowledgeBase],
    systemPrompt: [
      "你是带长期记忆的 DeepAgents 助教。",
      "回答前遵循 memory 文件中的用户偏好。",
      "当用户明确要求记住偏好时，可用文件工具更新 memory。",
    ].join("\n"),
  });

  const first = await agent.invoke(
    {
      messages: [
        {
          role: "user",
          content: "请记住：我后续希望你把合一分析风险点提示放在每个模块最后。并且我结尾是喜欢用一些语气词的（哈哈、记住没！）",
        },
      ],
    },
    threadConfig("memory-learn"),
  );
  printFinal(first);

  const second = await agent.invoke(
    {
      messages: [
        {
          role: "user",
          content: "请解释 DeepAgents memory 模块，保持符合我的偏好。",
        },
      ],
    },
    threadConfig("memory-apply"),
  );
  printFinal(second);

  const stored = await store.get([userId], memoryPath);
  printObject("当前记忆文件", stored?.value ?? null);
}

await runMemoryDemo();
