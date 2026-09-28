import type { BaseMessage } from "@langchain/core/messages";
import { StateSchema } from "@langchain/langgraph";
import {
  createDeepAgent,
  filesValue,
  type FileData,
  type FilesystemPermission,
  type SubAgent,
} from "deepagents";
import { createAgent } from "langchain";

import { createModel } from "./shared/model.js";
import { getOrderStatus } from "./shared/tools.js";

type Todo = {
  content: string;
  status: "pending" | "in_progress" | "completed";
};

type AgentStateSnapshot = {
  messages?: BaseMessage[];
  todos?: Todo[];
  files?: Record<string, FileData> | undefined;
};

type MiddlewareView = {
  name: string;
  tools?: readonly { name?: string }[];
};

const permissions: FilesystemPermission[] = [
  {
    operations: ["read"],
    paths: ["/skills", "/skills/**", "/workspace", "/workspace/**"],
    mode: "allow",
  },
  {
    operations: ["write"],
    paths: ["/workspace", "/workspace/**"],
    mode: "allow",
  },
  {
    operations: ["read", "write"],
    paths: ["/**"],
    mode: "deny",
  },
];

const orderResearcher: SubAgent = {
  name: "order_researcher",
  description: "查询订单事实并返回订单号、状态和预计送达日期，不编造工具未返回的信息",
  systemPrompt: [
    "你只负责查询并核对订单事实。",
    "必须调用 get_order_status，并在最终报告中区分工具事实与推断。",
  ].join("\n"),
  tools: [getOrderStatus],
  skills: ["/skills/"],
};

const model = createModel();

// 复用 Deep Agents 的 files Reducer，使调用方可以把初始 Skill 文件作为 State Input 传入。
const DeepAgentInputState = new StateSchema({
  files: filesValue,
});

/** 标准 Agent：只有消息循环、显式传入的 Tool，以及 createAgent 的基础 Middleware 能力。 */
const langChainAgent = createAgent({
  model,
  tools: [getOrderStatus],
  systemPrompt: "你是订单助手。具体订单必须通过工具查询，禁止猜测。",
});

/**
 * Deep Agent：核心循环仍由 createAgent 提供，但预装规划、文件、子代理、摘要等 Middleware。
 * skills 使用 StateBackend 中的虚拟路径；permissions 只允许读技能和读写工作区。
 */
const deepAgent = createDeepAgent({
  model,
  stateSchema: DeepAgentInputState,
  tools: [getOrderStatus],
  subagents: [orderResearcher],
  skills: ["/skills/"],
  permissions,
  systemPrompt: [
    "你是复杂订单任务的主协调 Agent。",
    "先用 write_todos 建立计划，并在完成步骤后及时更新状态。",
    "订单事实必须通过 task 委派给 order_researcher。",
    "结合 customer-service 技能生成建议。",
    "把最终报告写入 /workspace/order-report.md，再向用户概括结论和文件路径。",
  ].join("\n"),
});

function createInitialFiles(): Record<string, FileData> {
  const now = new Date().toISOString();

  return {
    "/skills/customer-service/SKILL.md": {
      content: [
        "---",
        "name: customer-service",
        "description: 为订单查询结果生成克制、可执行且不越权承诺的客服跟进建议",
        "---",
        "# 客服跟进规范",
        "",
        "1. 先复述工具确认的订单状态和预计送达日期。",
        "2. 建议必须是客服下一步动作，不得虚构赔付、改期或物流承诺。",
        "3. 当信息不足时，明确说明还需要核实什么。",
      ].join("\n"),
      mimeType: "text/markdown",
      created_at: now,
      modified_at: now,
    },
  };
}

function messageText(message: BaseMessage | undefined): string | undefined {
  if (!message) {
    return undefined;
  }
  return typeof message.content === "string"
    ? message.content
    : JSON.stringify(message.content);
}

function summarizeState(state: AgentStateSnapshot) {
  return {
    stateKeys: Object.keys(state),
    todos: state.todos ?? [],
    virtualFilePaths: Object.keys(state.files ?? {}),
    finalAnswer: messageText(state.messages?.at(-1)),
  };
}

/**
 * 不调用模型，直接观察两个构造函数产生的 Agent 外壳、Middleware 与 Graph 拓扑。
 */
async function inspectArchitecture(): Promise<void> {
  const baseMiddleware =
    (langChainAgent.options.middleware as readonly MiddlewareView[] | undefined) ?? [];
  const deepMiddleware =
    (deepAgent.options.middleware as readonly MiddlewareView[] | undefined) ?? [];

  console.dir(
    {
      createAgent: {
        runtimeType: langChainAgent.constructor.name,
        middleware: baseMiddleware.map(({ name }) => name),
        middlewareTools: baseMiddleware.flatMap(
          ({ tools = [] }) => tools.map(({ name }) => name).filter(Boolean),
        ),
      },
      createDeepAgent: {
        runtimeType: deepAgent.constructor.name,
        middleware: deepMiddleware.map(({ name }) => name),
        middlewareTools: deepMiddleware.flatMap(
          ({ tools = [] }) => tools.map(({ name }) => name).filter(Boolean),
        ),
      },
    },
    { depth: null },
  );

  console.log("\ncreateAgent Graph:\n", await langChainAgent.drawMermaid());
  console.log("\ncreateDeepAgent Graph:\n", await deepAgent.drawMermaid());
  console.log(
    "\n说明：execute 只有在 Backend 实现沙箱执行协议时才具备真实的命令执行环境。",
  );
}

async function runLangChainAgent(): Promise<AgentStateSnapshot> {
  return langChainAgent.invoke({
    messages: [
      {
        role: "user",
        content:
          "查询 ORDER-1001，给出状态、预计送达日期和两条客服跟进建议，并整理成报告。",
      },
    ],
  });
}

async function runDeepAgent(): Promise<AgentStateSnapshot> {
  const result = await deepAgent.invoke({
    messages: [
      {
        role: "user",
        content:
          "查询 ORDER-1001，给出状态、预计送达日期和两条客服跟进建议，并整理成报告。",
      },
    ],
    files: createInitialFiles(),
  });
  console.log(result);
  return result;
}

async function compareAgents(): Promise<void> {
  const baseResult = await runLangChainAgent();
  const deepResult = await runDeepAgent();

  console.log("\ncreateAgent 最终状态摘要：");
  console.dir(summarizeState(baseResult), { depth: null });

  console.log("\ncreateDeepAgent 最终状态摘要：");
  console.dir(summarizeState(deepResult), { depth: null });
}

const mode = process.argv[2] ?? "inspect";

switch (mode) {
  case "inspect":
    await inspectArchitecture();
    break;
  case "deep":
    console.dir(summarizeState(await runDeepAgent()), { depth: null });
    break;
  case "compare":
    await compareAgents();
    break;
  default:
    throw new Error("可用模式：inspect、deep、compare");
}
