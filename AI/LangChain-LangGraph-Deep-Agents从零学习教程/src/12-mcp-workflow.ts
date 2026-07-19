import assert from "node:assert/strict";

import {
  AIMessage,
  isAIMessage,
  isToolMessage,
  type BaseMessage,
} from "@langchain/core/messages";
import {
  END,
  MemorySaver,
  MessagesValue,
  START,
  StateGraph,
  StateSchema,
  type GraphNode,
} from "@langchain/langgraph";
import { ToolNode, toolsCondition } from "@langchain/langgraph/prebuilt";
import {
  createDeepAgent,
  filesValue,
  type FileData,
  type FilesystemPermission,
  type SubAgent,
} from "deepagents";
import { createAgent, FakeToolCallingModel, tool } from "langchain";
import { z } from "zod";

type McpTextContent = {
  type: "text";
  text: string;
};

type McpCallToolResult = {
  content: McpTextContent[];
  isError?: boolean;
};

type McpToolDescriptor = {
  server: "orders" | "tickets";
  remoteName: string;
  langChainName: string;
  description: string;
  inputSchema: Record<string, unknown>;
};

type Todo = {
  content: string;
  status: "pending" | "in_progress" | "completed";
};

type AgentResult = {
  messages: BaseMessage[];
  todos?: Todo[] | undefined;
  files?: Record<string, FileData> | undefined;
};

type RealMcpClient = {
  getTools(): Promise<
    Array<{ name: string; description?: string; schema?: unknown }>
  >;
  close(): Promise<void>;
};

type RealMcpAdapterModule = {
  MultiServerMCPClient: new (
    options: Record<string, unknown>,
  ) => RealMcpClient;
};

const OrderStatusInput = z.object({
  orderId: z.string().regex(/^ORDER-\d+$/),
});

const CreateTicketInput = z.object({
  title: z.string().min(1),
  severity: z.enum(["low", "medium", "high"]),
  evidence: z.string().min(1),
});

/**
 * MCP Server 的离线协议替身。
 *
 * 它保留 MCP Tool 最重要的两步：
 * 1. tools/list 返回名称、说明与 JSON Schema；
 * 2. tools/call 接收工具名和参数并返回 content blocks。
 *
 * 正式项目应使用 @modelcontextprotocol/sdk 创建 stdio 或 Streamable HTTP Server。
 */
const offlineMcpServers = {
  orders: {
    listTools(): McpToolDescriptor[] {
      return [
        {
          server: "orders",
          remoteName: "get_order_status",
          langChainName: "orders__get_order_status",
          description: "按订单号查询订单状态和预计送达日期",
          inputSchema: z.toJSONSchema(OrderStatusInput),
        },
      ];
    },
    async callTool(
      name: string,
      args: unknown,
    ): Promise<McpCallToolResult> {
      if (name !== "get_order_status") {
        return {
          content: [{ type: "text", text: `unknown_tool:${name}` }],
          isError: true,
        };
      }

      const parsed = OrderStatusInput.safeParse(args);
      if (!parsed.success) {
        return {
          content: [{ type: "text", text: "invalid_order_status_input" }],
          isError: true,
        };
      }

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              orderId: parsed.data.orderId,
              status: "shipped",
              estimatedDelivery: "2026-07-22",
              source: "orders-mcp-server",
            }),
          },
        ],
      };
    },
  },
  tickets: {
    listTools(): McpToolDescriptor[] {
      return [
        {
          server: "tickets",
          remoteName: "create_incident_ticket",
          langChainName: "tickets__create_incident_ticket",
          description: "根据标题、严重等级和证据创建故障工单",
          inputSchema: z.toJSONSchema(CreateTicketInput),
        },
      ];
    },
    async callTool(
      name: string,
      args: unknown,
    ): Promise<McpCallToolResult> {
      if (name !== "create_incident_ticket") {
        return {
          content: [{ type: "text", text: `unknown_tool:${name}` }],
          isError: true,
        };
      }

      const parsed = CreateTicketInput.safeParse(args);
      if (!parsed.success) {
        return {
          content: [{ type: "text", text: "invalid_ticket_input" }],
          isError: true,
        };
      }

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              ticketId: "INC-1001",
              ...parsed.data,
              source: "tickets-mcp-server",
            }),
          },
        ],
      };
    },
  },
};

function textFromMcpResult(result: McpCallToolResult): string {
  if (result.isError) {
    throw new Error(result.content.map(({ text }) => text).join("\n"));
  }
  return result.content.map(({ text }) => text).join("\n");
}

/**
 * 对应 MultiServerMCPClient.getTools() 的适配结果：
 * MCP Tool 被转换成 LangChain Structured Tool 后，三种运行外壳可以复用同一实例。
 */
const getOrderStatusMcpTool = tool(
  async (input) =>
    textFromMcpResult(
      await offlineMcpServers.orders.callTool("get_order_status", input),
    ),
  {
    name: "orders__get_order_status",
    description: "按订单号查询订单状态和预计送达日期",
    schema: OrderStatusInput,
  },
);

const createIncidentTicketMcpTool = tool(
  async (input) =>
    textFromMcpResult(
      await offlineMcpServers.tickets.callTool(
        "create_incident_ticket",
        input,
      ),
    ),
  {
    name: "tickets__create_incident_ticket",
    description: "根据标题、严重等级和证据创建故障工单",
    schema: CreateTicketInput,
  },
);

const mcpTools = [getOrderStatusMcpTool, createIncidentTicketMcpTool];

function fakeOrderLookupModel() {
  return new FakeToolCallingModel({
    toolCalls: [
      [
        {
          id: "call-order-status-1",
          name: getOrderStatusMcpTool.name,
          args: { orderId: "ORDER-1001" },
        },
      ],
      [],
    ],
  });
}

function compactMessages(messages: BaseMessage[]) {
  return messages.map((message) => ({
    type: message.getType(),
    content:
      typeof message.content === "string"
        ? message.content
        : JSON.stringify(message.content),
    toolCalls:
      isAIMessage(message) && message.tool_calls
        ? message.tool_calls.map(({ id, name, args }) => ({
            id,
            name,
            args,
          }))
        : [],
    toolName: isToolMessage(message) ? message.name : undefined,
    toolCallId: isToolMessage(message)
      ? message.tool_call_id
      : undefined,
  }));
}

async function runLangChainAgent(): Promise<AgentResult> {
  const agent = createAgent({
    model: fakeOrderLookupModel(),
    tools: mcpTools,
    systemPrompt: "订单事实必须通过 orders MCP Tool 查询。",
  });

  return agent.invoke({
    messages: [
      {
        role: "user",
        content: "查询订单 ORDER-1001",
      },
    ],
  });
}

const GraphState = new StateSchema({
  messages: MessagesValue,
});

function createLangGraphWorkflow() {
  const model = fakeOrderLookupModel().bindTools(mcpTools);
  const callModel: GraphNode<typeof GraphState> = async (state) => ({
    messages: [await model.invoke(state.messages)],
  });

  return new StateGraph(GraphState)
    .addNode("model", callModel)
    .addNode("mcp_tools", new ToolNode(mcpTools))
    .addEdge(START, "model")
    .addConditionalEdges(
      "model",
      (state) =>
        toolsCondition(state) === "tools" ? "mcp_tools" : END,
      ["mcp_tools", END],
    )
    .addEdge("mcp_tools", "model")
    .compile();
}

async function runLangGraphWorkflow(): Promise<AgentResult> {
  const graph = createLangGraphWorkflow();
  return graph.invoke(
    {
      messages: [
        {
          role: "user",
          content: "查询订单 ORDER-1001",
        },
      ],
    },
    { recursionLimit: 6 },
  );
}

const DeepAgentInputState = new StateSchema({
  files: filesValue,
});

const deepAgentPermissions: FilesystemPermission[] = [
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
  description: "只查询并核对订单事实",
  systemPrompt: "必须使用 orders MCP Tool，禁止猜测订单状态。",
  tools: [getOrderStatusMcpTool],
  skills: ["/skills/order-research/"],
};

function createInitialFiles(): Record<string, FileData> {
  const now = new Date().toISOString();
  return {
    "/skills/order-research/SKILL.md": {
      content: [
        "---",
        "name: order-research",
        "description: 核对订单事实并标注数据来源",
        "---",
        "# 订单核对规则",
        "",
        "订单状态必须来自 orders MCP Server；报告中保留 orderId、状态和预计送达日期。",
      ].join("\n"),
      mimeType: "text/markdown",
      created_at: now,
      modified_at: now,
    },
  };
}

function fakeDeepAgentModel() {
  const plannedTodos: Todo[] = [
    { content: "查询订单事实", status: "in_progress" },
    { content: "生成报告文件", status: "pending" },
  ];
  const completedTodos: Todo[] = plannedTodos.map((todo) => ({
    ...todo,
    status: "completed",
  }));

  return new FakeToolCallingModel({
    toolCalls: [
      [
        {
          id: "todo-plan-1",
          name: "write_todos",
          args: { todos: plannedTodos },
        },
      ],
      [
        {
          id: "deep-order-status-1",
          name: getOrderStatusMcpTool.name,
          args: { orderId: "ORDER-1001" },
        },
      ],
      [
        {
          id: "write-report-1",
          name: "write_file",
          args: {
            file_path: "/workspace/order-report.md",
            content:
              "# 订单报告\n\nORDER-1001 已发货，预计 2026-07-22 送达。\n",
          },
        },
      ],
      [
        {
          id: "todo-complete-1",
          name: "write_todos",
          args: { todos: completedTodos },
        },
      ],
      [],
    ],
  });
}

function createDeepAgentWorkflow() {
  return createDeepAgent({
    model: fakeDeepAgentModel(),
    stateSchema: DeepAgentInputState,
    tools: mcpTools,
    subagents: [orderResearcher],
    skills: ["/skills/order-research/"],
    permissions: deepAgentPermissions,
    checkpointer: new MemorySaver(),
    interruptOn: {
      [createIncidentTicketMcpTool.name]: {
        allowedDecisions: ["approve", "edit", "reject"],
        description: "创建外部工单会产生业务副作用，需要人工确认。",
      },
    },
    systemPrompt: [
      "先用 write_todos 规划任务。",
      "订单事实使用 orders MCP Tool。",
      "把报告写入 /workspace/order-report.md。",
    ].join("\n"),
  });
}

async function runDeepAgentWorkflow(): Promise<AgentResult> {
  const agent = createDeepAgentWorkflow();
  return agent.invoke(
    {
      messages: [
        {
          role: "user",
          content: "查询 ORDER-1001，核对事实并生成报告",
        },
      ],
      files: createInitialFiles(),
    },
    {
      configurable: { thread_id: "mcp-deep-agent-demo" },
      recursionLimit: 30,
    },
  );
}

function printMcpAdapterBoundary(): void {
  const discoveredTools = [
    ...offlineMcpServers.orders.listTools(),
    ...offlineMcpServers.tickets.listTools(),
  ];

  console.dir(
    {
      mcpServerPrimitives: {
        tools: "模型可选择调用的动作",
        resources: "应用选择读取并放入上下文的数据",
        prompts: "用户选择使用的提示模板",
      },
      serverDevelopment: [
        "new McpServer({ name, version })",
        "registerTool(name, config, handler)",
        "connect(ServerTransport)",
      ],
      rawClientDevelopment: [
        "new Client({ name, version })",
        "connect(ClientTransport)",
        "listTools()",
        "callTool({ name, arguments })",
        "close()",
      ],
      langChainAdapter: [
        "new MultiServerMCPClient({ mcpServers })",
        "getTools() -> LangChain Tool[]",
        "tool.invoke(input) -> MCP tools/call",
        "close()",
      ],
      adapterResult: discoveredTools.map(
        ({ server, remoteName, langChainName, inputSchema }) => ({
          server,
          remoteName,
          langChainName,
          inputSchema,
        }),
      ),
      notProvidedByMcp: [
        "Agent Loop",
        "LangGraph State / Checkpoint",
        "write_todos",
        "Deep Agents virtual filesystem / Backend",
        "Permission / HITL",
        "Subagent / Skill",
      ],
    },
    { depth: null },
  );
}

/**
 * 逐层展示一次 MCP Tool 调用的数据变化。
 *
 * 这里用离线 Server 替身保留协议边界；真实网络模式下，这些对象会由
 * MCP SDK、Transport 和 @langchain/mcp-adapters 发送或生成。
 */
async function printCompleteMcpCallFlow(): Promise<void> {
  const descriptor = offlineMcpServers.orders.listTools()[0];
  assert.ok(descriptor);

  const input = { orderId: "ORDER-1001" };
  const modelToolCall = {
    id: "call-order-status-1",
    name: descriptor.langChainName,
    args: input,
  };
  const mcpJsonRpcRequest = {
    jsonrpc: "2.0",
    id: 3,
    method: "tools/call",
    params: {
      name: descriptor.remoteName,
      arguments: input,
    },
  } as const;
  const mcpResult = await offlineMcpServers.orders.callTool(
    mcpJsonRpcRequest.params.name,
    mcpJsonRpcRequest.params.arguments,
  );
  const agentResult = await runLangChainAgent();

  console.dir(
    {
      phase1ServerRegistration: {
        registerTool: {
          name: descriptor.remoteName,
          description: descriptor.description,
          inputSchema: descriptor.inputSchema,
          handler: "offlineMcpServers.orders.callTool",
        },
      },
      phase2InitializationAndDiscovery: {
        protocol: [
          "initialize",
          "initialize response",
          "notifications/initialized",
          "tools/list",
        ],
        toolsListResult: descriptor,
        adapterResult: {
          name: descriptor.langChainName,
          invoke: "调用 orders Server 的 get_order_status",
        },
      },
      phase3AgentExecution: {
        modelToolCall,
        mcpJsonRpcRequest,
        mcpJsonRpcResponse: {
          jsonrpc: "2.0",
          id: mcpJsonRpcRequest.id,
          result: mcpResult,
        },
        messages: compactMessages(agentResult.messages),
      },
      idBoundary: {
        modelToolCallId: modelToolCall.id,
        mcpJsonRpcRequestId: mcpJsonRpcRequest.id,
        explanation:
          "Tool Call ID 关联 AIMessage/ToolMessage；JSON-RPC ID 关联 MCP Request/Response。",
      },
    },
    { depth: null },
  );
}

/**
 * 真实 Adapter 连接入口。
 *
 * 先安装 @langchain/mcp-adapters，再通过环境变量选择 HTTP 或 stdio Server：
 * - MCP_SERVER_URL=https://example.com/mcp
 * - MCP_SERVER_COMMAND=node MCP_SERVER_ARGS='["/absolute/server.js"]'
 */
async function inspectOfficialAdapter(): Promise<void> {
  const packageName = "@langchain/mcp-adapters";
  let adapter: RealMcpAdapterModule;

  try {
    adapter = (await import(packageName)) as RealMcpAdapterModule;
  } catch (error) {
    throw new Error(
      "official 模式需要先安装：pnpm add @langchain/mcp-adapters",
      { cause: error },
    );
  }

  const url = process.env.MCP_SERVER_URL;
  const command = process.env.MCP_SERVER_COMMAND;
  if (!url && !command) {
    throw new Error("请设置 MCP_SERVER_URL 或 MCP_SERVER_COMMAND");
  }

  const serverConfig = url
    ? { transport: "http", url }
    : {
        transport: "stdio",
        command,
        args: JSON.parse(process.env.MCP_SERVER_ARGS ?? "[]") as string[],
      };

  const client = new adapter.MultiServerMCPClient({
    throwOnLoadError: true,
    prefixToolNameWithServerName: true,
    useStandardContentBlocks: true,
    defaultToolTimeout: 20_000,
    mcpServers: { demo: serverConfig },
  });

  try {
    const tools = await client.getTools();
    console.dir(
      tools.map(({ name, description, schema }) => ({
        name,
        description,
        schema,
      })),
      { depth: null },
    );
  } finally {
    await client.close();
  }
}

async function runComparison(): Promise<void> {
  const [langChainResult, langGraphResult, deepAgentResult] =
    await Promise.all([
      runLangChainAgent(),
      runLangGraphWorkflow(),
      runDeepAgentWorkflow(),
    ]);

  const langChainToolMessage = langChainResult.messages.find(isToolMessage);
  const langGraphToolMessage = langGraphResult.messages.find(isToolMessage);
  assert.equal(langChainToolMessage?.content, langGraphToolMessage?.content);
  assert.equal(
    deepAgentResult.todos?.every(({ status }) => status === "completed"),
    true,
  );
  assert.ok(deepAgentResult.files?.["/workspace/order-report.md"]);

  console.dir(
    {
      sharedAdapterOutput: {
        toolNames: mcpTools.map(({ name }) => name),
        sameOrderFact:
          langChainToolMessage?.content === langGraphToolMessage?.content,
      },
      langChain: {
        owns: ["Model ↔ Tool Loop", "Middleware"],
        messages: compactMessages(langChainResult.messages),
      },
      langGraph: {
        owns: ["State", "Node", "Edge", "ToolNode", "Checkpoint"],
        messages: compactMessages(langGraphResult.messages),
      },
      deepAgents: {
        owns: [
          "write_todos",
          "virtual filesystem / Backend",
          "Permission / HITL",
          "Subagent / Skill",
        ],
        todos: deepAgentResult.todos,
        files: Object.keys(deepAgentResult.files ?? {}),
        mcpToolMessages: compactMessages(deepAgentResult.messages).filter(
          ({ toolName }) => toolName?.includes("__"),
        ),
      },
    },
    { depth: null },
  );
}

const mode = process.argv[2] ?? "all";

switch (mode) {
  case "boundary":
    printMcpAdapterBoundary();
    break;
  case "protocol":
    await printCompleteMcpCallFlow();
    break;
  case "langchain":
    console.dir(compactMessages((await runLangChainAgent()).messages), {
      depth: null,
    });
    break;
  case "langgraph":
    console.dir(compactMessages((await runLangGraphWorkflow()).messages), {
      depth: null,
    });
    break;
  case "deepagent": {
    const result = await runDeepAgentWorkflow();
    console.dir(
      {
        todos: result.todos,
        files: Object.keys(result.files ?? {}),
        messages: compactMessages(result.messages),
      },
      { depth: null },
    );
    break;
  }
  case "official":
    await inspectOfficialAdapter();
    break;
  case "all":
    printMcpAdapterBoundary();
    await printCompleteMcpCallFlow();
    await runComparison();
    break;
  default:
    throw new Error(
      "可用模式：boundary、protocol、langchain、langgraph、deepagent、official、all",
    );
}
