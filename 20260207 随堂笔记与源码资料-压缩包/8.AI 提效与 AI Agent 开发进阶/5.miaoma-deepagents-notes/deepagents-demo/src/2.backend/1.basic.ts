import {
  CompositeBackend,
  createDeepAgent,
  FilesystemBackend,
  FilesystemPermission,
  StateBackend,
  StoreBackend,
} from "deepagents";
import path from "node:path";
import { InMemoryStore } from "@langchain/langgraph";
import { llm } from "../shared/llm";

// state
// store
// fileSystem
// composite
const fileSystemBackend = new FilesystemBackend({
  rootDir: path.resolve(import.meta.dirname, "../../data"),
  virtualMode: true,
});
console.log("🚀 ~ fileSystemBackend:", fileSystemBackend);

const permissions: FilesystemPermission[] = [
  {
    operations: ["read"],
    paths: ["/"],
    mode: "allow",
  },
  { operations: ["read", "write"], paths: ["/**"], mode: "deny" },
];

const invoke = async () => {
  const agent = createDeepAgent({
    model: llm,
    tools: [],
    systemPrompt: [
      "你是 Typescript 课程助教。",
      "先用计划拆解任务，再调用必要工具。",
    ].join("\n"),
    backend: fileSystemBackend,
    // permissions,
  });

  const res = await agent.invoke({
    messages: [
      {
        role: "user",
        content:
          "请为 120 分钟 Typescript 课程生成一个 5 分钟开场讲解 brief，一定要讲解清楚 type 和 interface 的区别，输出到 md 中",
      },
    ],
  });
};

invoke();
