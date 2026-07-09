import { mkdir, writeFile } from "node:fs/promises";

import {
  CompositeBackend,
  createDeepAgent,
  FilesystemBackend,
  StateBackend,
  StoreBackend,
  type FilesystemPermission,
} from "deepagents";
import { InMemoryStore } from "@langchain/langgraph";

import { createTextFileData } from "../00-shared/lib/files";
import { ensureProviderEnv, getModel, threadConfig, workspacePath } from "../00-shared/lib/env";
import { printFinal, printObject, printTitle } from "../00-shared/lib/output";
import { searchKnowledgeBase } from "../00-shared/tools/domain-tools";

async function seedWorkspace(): Promise<string> {
  const root = workspacePath("data", "workspace");
  await mkdir(root, { recursive: true });
  await writeFile(
    workspacePath("data", "workspace", "customer-notes.md"),
    [
      "# 客户访谈摘要",
      "",
      "- 目标用户：已有 LangChain 基础的工程师。",
      "- 关注点：如何把 agent 从 demo 推到可控生产流程。",
      "- 风险偏好：允许本地实验，但生产必须隔离执行环境。",
    ].join("\n"),
    "utf8",
  );
  return root;
}

export async function runBackendsDemo(): Promise<void> {
  ensureProviderEnv();
  printTitle("backends：CompositeBackend 路由");

  const workspaceRoot = await seedWorkspace();
  const store = new InMemoryStore();
  const memoryNamespace = ["course-demo", "backend-memory"];
  const principlesPath = "/backend-principles.md";
  const decisionPath = "/backend-decision.md";

  await store.put(
    memoryNamespace,
    principlesPath,
    createTextFileData(
      [
        "# Backend 决策原则",
        "",
        "- `/workspace/` 用于当前任务产物，适合本轮 agent 文件读写。",
        "- `/memories/` 用于跨线程、跨任务可复用的长期决策记录。",
        "- 生产环境涉及代码执行时，应优先选择隔离 sandbox backend。",
      ].join("\n"),
    ),
  );

  const backend = new CompositeBackend(new StateBackend(), {
    "/workspace/": new FilesystemBackend({
      rootDir: workspaceRoot,
      virtualMode: true,
    }),
    "/memories/": new StoreBackend({
      store,
      namespace: memoryNamespace,
    }),
  });

  const permissions: FilesystemPermission[] = [
    { operations: ["read"], paths: ["/"], mode: "allow" },
    { operations: ["read", "write"], paths: ["/workspace/**"], mode: "allow" },
    { operations: ["read", "write"], paths: ["/memories/**"], mode: "allow" },
    { operations: ["read", "write"], paths: ["/**"], mode: "deny" },
  ];

  const agent = createDeepAgent({
    model: getModel(),
    backend,
    store,
    permissions,
    tools: [searchKnowledgeBase],
    systemPrompt: [
      "你是 DeepAgents backend 讲师。",
      "只在 /workspace/ 下读写课堂文件。",
      "长期可复用的 backend 决策记录必须写入 /memories/。",
      "说明 StateBackend、FilesystemBackend、StoreBackend、CompositeBackend 的职责边界。",
    ].join("\n"),
  });

  const result = await agent.invoke(
    {
      messages: [
        {
          role: "user",
          content:
            [
              "请完成 backend 选型建议：",
              "1. 读取 /workspace/customer-notes.md。",
              "2. 读取 /memories/backend-principles.md，结合其中的长期决策原则。",
              "3. 检索 backends 知识库。",
              "4. 将面向本次客户的交付摘要写入 /workspace/backend-summary.md。",
              "5. 将可跨课程复用的 backend 选择规则写入 /memories/backend-decision.md。",
              "最终回复要分别说明 workspace 产物和 memory 产物的路径。",
            ].join("\n"),
        },
      ],
    },
    threadConfig("backends"),
  );

  printFinal(result);
  const storedDecision = await store.get(memoryNamespace, decisionPath);
  printObject("StoreBackend 记忆产物", storedDecision?.value ?? null);
}

await runBackendsDemo();
