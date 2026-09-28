import {
  AIMessage,
  HumanMessage,
  ToolMessage,
} from "@langchain/core/messages";
import type { ToolRuntime } from "@langchain/core/tools";
import {
  Command,
  END,
  entrypoint,
  getPreviousState,
  InMemoryStore,
  MemorySaver,
  MessagesValue,
  START,
  StateGraph,
  StateSchema,
  UntrackedValue,
} from "@langchain/langgraph";
import type { LangGraphRunnableConfig } from "@langchain/langgraph";
import { ToolNode } from "@langchain/langgraph/prebuilt";
import { createAgent, tool } from "langchain";
import { z } from "zod";

import { createModel } from "./shared/model.js";
import { printLastMessage } from "./shared/output.js";
import {
  functionalWorkflow,
  type IncidentInput,
  type IncidentResult,
} from "./07-langgraph-entrypoint.js";

const TENANT_ID = "tenant-demo";
const USER_ID = "user-001";

/**
 * State：同一 thread 内会变化、并由 Checkpointer 保存的数据。
 * MessagesValue 为 messages 提供消息合并 reducer；普通 Zod 字段默认由新值覆盖。
 */
const ConversationState = new StateSchema({
  messages: MessagesValue,
  turnCount: z.number().default(0),
});

const checkpointer = new MemorySaver();

const conversationGraph = new StateGraph(ConversationState)
  .addNode("reply", (state) => ({
    messages: [
      new AIMessage(`这是当前线程中的第 ${state.turnCount + 1} 轮对话。`),
    ],
    turnCount: state.turnCount + 1,
  }))
  .addEdge(START, "reply")
  .addEdge("reply", END)
  .compile({ checkpointer });

/**
 * UntrackedValue：可以在本次 Graph Run 的节点之间传递，但不写入 Checkpoint。
 * 它适合临时缓存等可重建数据，不适合需要在故障恢复后继续使用的数据。
 */
const TransientState = new StateSchema({
  persistedValue: z.string(),
  transientValue: new UntrackedValue(z.string()),
});

const transientCheckpointer = new MemorySaver();
const transientGraph = new StateGraph(TransientState)
  .addNode("complete", (state) => ({
    persistedValue: `${state.persistedValue}-completed`,
  }))
  .addEdge(START, "complete")
  .addEdge("complete", END)
  .compile({ checkpointer: transientCheckpointer });

async function runTransientStateExample(): Promise<void> {
  const config = { configurable: { thread_id: "transient-state-demo" } };
  const output = await transientGraph.invoke(
    {
      persistedValue: "checkpointed",
      transientValue: "current-run-only",
    },
    config,
  );
  const snapshot = await transientGraph.getState(config);

  console.log("current run:", output);
  console.log("checkpoint:", snapshot);
}

async function runShortTermMemoryExample(): Promise<void> {
  const threadA = { configurable: { thread_id: "conversation-a" } };
  const threadB = { configurable: { thread_id: "conversation-b" } };

  await conversationGraph.invoke(
    { messages: [new HumanMessage("第一轮：查询 ORDER-1001。")] },
    threadA,
  );
  await conversationGraph.invoke(
    { messages: [new HumanMessage("第二轮：它什么时候送达？")] },
    threadA,
  );
  await conversationGraph.invoke(
    { messages: [new HumanMessage("这是另一个线程。")] },
    threadB,
  );

  const stateA = await conversationGraph.getState(threadA);
  const stateB = await conversationGraph.getState(threadB);

  console.log("thread A:", stateA);
  console.log("thread B:", stateB);

  const recentCheckpoints = [];
  for await (const snapshot of conversationGraph.getStateHistory(threadA)) {
    recentCheckpoints.push({
      turnCount: snapshot.values.turnCount,
      next: snapshot.next,
    });
    console.log("=== checkpoint ===");
    console.log(snapshot);
    if (recentCheckpoints.length === 3) break;
  }
  console.log("thread A 最近的 checkpoints:", recentCheckpoints);
}

/**
 * Functional API 没有共享 State Schema。
 * 相同 thread_id 的后续调用通过 getPreviousState() 读取上一次保存的值；
 * entrypoint.final() 将对外输出 value 与供下一次调用读取的 save 分开。
 */
type IncidentStats = {
  total: number;
  urgent: number;
};

type PersistentWorkflowOutput = {
  incident: IncidentResult;
  previous: IncidentStats;
  current: IncidentStats;
};

const functionalCheckpointer = new MemorySaver();

const persistentFunctionalWorkflow = entrypoint(
  {
    name: "incident_functional_workflow_with_memory",
    checkpointer: functionalCheckpointer,
  },
  async (input: IncidentInput) => {
    const previous = getPreviousState<IncidentStats | undefined>() ?? {
      total: 0,
      urgent: 0,
    };
    const incident = await functionalWorkflow.invoke(input);
    const current: IncidentStats = {
      total: previous.total + 1,
      urgent:
        previous.urgent + Number(incident.valid && incident.route === "urgent"),
    };

    return entrypoint.final<PersistentWorkflowOutput, IncidentStats>({
      value: { incident, previous, current },
      save: current,
    });
  },
);

async function runFunctionalPreviousStateExample(): Promise<void> {
  const urgentInput: IncidentInput = {
    request: "生产支付服务大面积 5xx，开始时间 10:30",
  };
  const invalidInput: IncidentInput = { request: "报错" };
  const teamA = {
    configurable: { thread_id: "incident-team-a" },
  };
  const teamB = {
    configurable: { thread_id: "incident-team-b" },
  };

  const teamAFirst = await persistentFunctionalWorkflow.invoke(
    urgentInput,
    teamA,
  );
  const teamASecond = await persistentFunctionalWorkflow.invoke(
    invalidInput,
    teamA,
  );
  const teamBFirst = await persistentFunctionalWorkflow.invoke(
    invalidInput,
    teamB,
  );

  console.log({ teamAFirst, teamASecond, teamBFirst });
}

/**
 * Store：跨 thread 保存的数据。
 * namespace 负责隔离租户、用户和数据类别，key 标识 namespace 内的一条记录。
 */
const store = new InMemoryStore();

function preferenceNamespace(context: {
  tenantId: string;
  userId: string;
}): string[] {
  return [
    "tenants",
    context.tenantId,
    "users",
    context.userId,
    "preferences",
  ];
}

async function runLongTermMemoryExample(): Promise<void> {
  const namespace = preferenceNamespace({
    tenantId: TENANT_ID,
    userId: USER_ID,
  });

  await store.put(namespace, "communication", {
    language: "zh-CN",
    responseStyle: "concise",
  });

  const preference = await store.get(namespace, "communication");
  const allPreferences = await store.search(namespace);

  console.log("namespace:", namespace);
  console.log("get:", preference?.value);
  console.log(
    "search:",
    allPreferences.map((item) => ({ key: item.key, value: item.value })),
  );
  console.log("store:", preference);
}

/**
 * Runtime Context：调用期间只读的身份和依赖信息，不属于会话记忆。
 * userId 必须由应用鉴权结果传入，不应由模型从用户文本中自行决定。
 */
const RuntimeContextSchema = z.object({
  tenantId: z.string(),
  userId: z.string(),
});

/**
 * createAgent 的 stateSchema 仍是 LangGraph State Schema。
 * messages 使用消息 Reducer；memoryScope 是同一 thread 内可持久化的自定义 State。
 */
const PreferenceAgentState = new StateSchema({
  messages: MessagesValue,
  memoryScope: z.string().default("preferences"),
  currentOrderId: z.string().optional(),
  turnCount: z.number().default(0),
});

type PreferenceToolRuntime = ToolRuntime<
  typeof PreferenceAgentState.State,
  typeof RuntimeContextSchema
>;

type OrderToolRuntime = ToolRuntime<typeof PreferenceAgentState.State>;

/**
 * ToolRuntime 的第二个参数由 Runtime 注入，不属于模型可见的 Tool Schema。
 * read_current_order 只读取 State，普通字符串返回值会转换成 ToolMessage。
 */
const readCurrentOrder = tool(
  async (_input, runtime: OrderToolRuntime) =>
    runtime.state.currentOrderId ?? "当前没有选中的订单",
  {
    name: "read_current_order",
    description: "读取当前会话正在处理的订单号。",
    schema: z.object({}),
  },
);

/**
 * select_order 返回 Command.update，请求 Runtime 更新自定义字段和消息历史。
 * ToolMessage 使用本次 runtime.toolCallId 与 AIMessage 中的 Tool Call 对应。
 */
const selectOrder = tool(
  async ({ orderId }, runtime: OrderToolRuntime) =>
    new Command({
      update: {
        currentOrderId: orderId,
        messages: [
          new ToolMessage({
            tool_call_id: runtime.toolCallId,
            content: `已选择订单 ${orderId}`,
          }),
        ],
      },
    }),
  {
    name: "select_order",
    description: "选择当前会话要继续处理的订单。",
    schema: z.object({ orderId: z.string() }),
  },
);

const stateToolGraph = new StateGraph(PreferenceAgentState)
  .addNode("tools", new ToolNode([readCurrentOrder, selectOrder]))
  .addEdge(START, "tools")
  .addEdge("tools", END)
  .compile();

async function runToolStateExample(): Promise<void> {
  const selected = await stateToolGraph.invoke({
    messages: [
      new AIMessage({
        content: "",
        tool_calls: [
          {
            id: "call-select-order",
            name: "select_order",
            args: { orderId: "ORDER-1001" },
            type: "tool_call",
          },
        ],
      }),
    ],
  });

  const readBack = await stateToolGraph.invoke({
    ...selected,
    messages: [
      ...selected.messages,
      new AIMessage({
        content: "",
        tool_calls: [
          {
            id: "call-read-current-order",
            name: "read_current_order",
            args: {},
            type: "tool_call",
          },
        ],
      }),
    ],
  });

  const selectResult = selected.messages.at(-1);
  const readResult = readBack.messages.at(-1);

  console.log({
    afterSelect: {
      currentOrderId: selected.currentOrderId,
      toolResult: selectResult?.content,
      toolCallId: ToolMessage.isInstance(selectResult)
        ? selectResult.tool_call_id
        : undefined,
    },
    afterRead: {
      currentOrderId: readBack.currentOrderId,
      toolResult: readResult?.content,
      toolCallId: ToolMessage.isInstance(readResult)
        ? readResult.tool_call_id
        : undefined,
    },
  });
}

function requireLongTermStore(
  runtime: PreferenceToolRuntime,
): InMemoryStore {
  if (!runtime.store) throw new Error("Agent 未配置 Store");

  // createAgent 在运行时注入的是 LangGraph Store；转换后使用 namespace/key API。
  return runtime.store as unknown as InMemoryStore;
}

const savePreference = tool(
  async (
    { key, value },
    runtime: PreferenceToolRuntime,
  ) => {
    const longTermStore = requireLongTermStore(runtime);
    const namespace = preferenceNamespace(runtime.context);
    await longTermStore.put(namespace, key, { value });
    return `已保存偏好：${key}=${value}`;
  },
  {
    name: "save_preference",
    description: "保存当前登录用户明确要求长期记住的偏好。",
    schema: z.object({
      key: z.enum(["language", "responseStyle"]),
      value: z.string(),
    }),
  },
);

const readPreference = tool(
  async (
    { key },
    runtime: PreferenceToolRuntime,
  ) => {
    const longTermStore = requireLongTermStore(runtime);
    const namespace = preferenceNamespace(runtime.context);
    const item = await longTermStore.get(namespace, key);
    return item ? JSON.stringify(item.value) : "尚未保存该偏好";
  },
  {
    name: "read_preference",
    description: "读取当前登录用户以前保存的长期偏好。",
    schema: z.object({
      key: z.enum(["language", "responseStyle"]),
    }),
  },
);

async function runToolRuntimeExample(): Promise<void> {
  const runtimeStore = new InMemoryStore();
  const toolNode = new ToolNode([savePreference, readPreference]);
  const runtimeConfig: LangGraphRunnableConfig = {
    context: { tenantId: TENANT_ID, userId: USER_ID },
    store: runtimeStore,
  };

  const saved = await toolNode.invoke(
    {
      messages: [
        new AIMessage({
          content: "",
          tool_calls: [
            {
              id: "call-save-preference",
              name: "save_preference",
              args: { key: "responseStyle", value: "concise" },
              type: "tool_call",
            },
          ],
        }),
      ],
    },
    runtimeConfig,
  );

  const recalled = await toolNode.invoke(
    {
      messages: [
        new AIMessage({
          content: "",
          tool_calls: [
            {
              id: "call-read-preference",
              name: "read_preference",
              args: { key: "responseStyle" },
              type: "tool_call",
            },
          ],
        }),
      ],
    },
    runtimeConfig,
  );

  console.log("ToolRuntime save:", saved.messages[0]?.content);
  console.log("ToolRuntime read:", recalled.messages[0]?.content);
}

async function runAgentMemoryExample(): Promise<void> {
  const agent = createAgent({
    model: createModel(),
    tools: [savePreference, readPreference],
    checkpointer: new MemorySaver(),
    store: new InMemoryStore(),
    stateSchema: PreferenceAgentState,
    contextSchema: RuntimeContextSchema,
    systemPrompt: [
      "你是用户偏好助手。",
      "用户要求记住偏好时必须调用 save_preference。",
      "用户询问历史偏好时必须调用 read_preference。",
    ].join("\n"),
  });

  const context = { tenantId: TENANT_ID, userId: USER_ID };

  const saved = await agent.invoke(
    { messages: [{ role: "user", content: "记住：以后回答尽量简短。" }] },
    {
      configurable: { thread_id: "conversation-a" },
      context,
    },
  );
  printLastMessage(saved);

  // thread_id 已改变，所以短期消息历史隔离；userId 不变，所以长期偏好仍可读取。
  const recalled = await agent.invoke(
    { messages: [{ role: "user", content: "我偏好怎样的回答风格？" }] },
    {
      configurable: { thread_id: "conversation-b" },
      context,
    },
  );
  printLastMessage(recalled);
}

const mode = process.argv[2] ?? "local";

switch (mode) {
  case "state":
    await runShortTermMemoryExample();
    break;
  case "store":
    await runLongTermMemoryExample();
    break;
  case "transient":
    await runTransientStateExample();
    break;
  case "functional":
    await runFunctionalPreviousStateExample();
    break;
  case "agent":
    await runAgentMemoryExample();
    break;
  case "runtime":
    await runToolRuntimeExample();
    break;
  case "tool-state":
    await runToolStateExample();
    break;
  case "local":
    await runShortTermMemoryExample();
    await runFunctionalPreviousStateExample();
    await runTransientStateExample();
    await runToolStateExample();
    await runLongTermMemoryExample();
    await runToolRuntimeExample();
    break;
  default:
    throw new Error(
      "可用模式：local、state、functional、transient、tool-state、store、runtime、agent",
    );
}
