import type { BaseMessage } from "@langchain/core/messages";
import { ToolMessage } from "@langchain/core/messages";
import {
  Command,
  MemorySaver,
  type Interrupt,
  type ProtocolEvent,
} from "@langchain/langgraph";
import {
  BaseSandbox,
  StateBackend,
  createDeepAgent,
  isSandboxBackend,
  type ExecuteResponse,
  type FileDownloadResponse,
  type FileUploadResponse,
  type FilesystemPermission,
} from "deepagents";
import {
  FakeToolCallingModel,
  tool,
  type HITLRequest,
  type HITLResponse,
} from "langchain";
import { z } from "zod";

type AgentResult = {
  messages?: BaseMessage[];
  files?: Record<string, unknown>;
  __interrupt__?: Interrupt<HITLRequest>[];
};

type TicketInput = {
  title: string;
  severity: "low" | "medium" | "high";
  evidence: string;
};

const workspacePermissions: FilesystemPermission[] = [
  {
    operations: ["read", "write"],
    paths: ["/workspace", "/workspace/**"],
    mode: "allow",
  },
  {
    operations: ["read", "write"],
    paths: ["/**"],
    mode: "deny",
  },
];

function messageText(message: BaseMessage | undefined): string | undefined {
  if (!message) {
    return undefined;
  }
  return typeof message.content === "string"
    ? message.content
    : JSON.stringify(message.content);
}

function toolMessages(messages: BaseMessage[] | undefined) {
  return (messages ?? [])
    .filter(ToolMessage.isInstance)
    .map((message) => ({
      name: message.name,
      status: message.status,
      content: messageText(message),
    }));
}

function fakeWriteModel(filePath: string) {
  return new FakeToolCallingModel({
    toolCalls: [
      [
        {
          id: `write-${filePath}`,
          name: "write_file",
          args: {
            file_path: filePath,
            content: "ORDER-1001: shipped",
          },
        },
      ],
      [],
    ],
  });
}

/**
 * 使用同一条 write_file Tool Call 对比允许路径与拒绝路径。
 * Permission 只改变内置文件 Tool 的执行结果，不改变模型已经提出的 Tool Call。
 */
async function runPermissionComparison(): Promise<void> {
  const invokeWrite = async (filePath: string) => {
    const agent = createDeepAgent({
      model: fakeWriteModel(filePath),
      permissions: workspacePermissions,
    });

    try {
      const result = (await agent.invoke({
        messages: [
          {
            role: "user",
            content: `将订单摘要写入 ${filePath}`,
          },
        ],
      })) as AgentResult;

      return {
        ok: true as const,
        toolMessages: toolMessages(result.messages),
        stateFilePaths: Object.keys(result.files ?? {}),
      };
    } catch (error) {
      return {
        ok: false as const,
        errorName: error instanceof Error ? error.name : typeof error,
        errorMessage: error instanceof Error ? error.message : String(error),
      };
    }
  };

  const [allowed, denied] = await Promise.all([
    invokeWrite("/workspace/order.md"),
    invokeWrite("/secrets/order.md"),
  ]);

  console.dir(
    {
      permissions: workspacePermissions,
      sameToolCallDifferentPath: {
        allowed: {
          path: "/workspace/order.md",
          result: allowed,
        },
        denied: {
          path: "/secrets/order.md",
          result: denied,
        },
      },
    },
    { depth: null },
  );
}

/**
 * 只实现 Sandbox Backend 协议的离线教学替身。
 * 它用内存 Map 表示 Sandbox 文件，并模拟固定命令的执行结果；
 * 不会启动真实进程，也不提供容器、网络或资源隔离。
 */
class ProtocolDemoSandbox extends BaseSandbox {
  readonly id = "protocol-demo-sandbox";
  readonly #files = new Map<string, Uint8Array>();
  readonly executionHistory: Array<{
    executionLocation: string;
    command: string;
    visibleSandboxFiles: string[];
  }> = [];

  execute(command: string): ExecuteResponse {
    const executionRecord = {
      executionLocation: this.id,
      command,
      visibleSandboxFiles: this.filePaths(),
    };
    this.executionHistory.push(executionRecord);

    if (command !== "node /workspace/build-report.ts") {
      return {
        output: JSON.stringify({
          ...executionRecord,
          error: "protocol_demo_only_supports_build_report",
        }),
        exitCode: 127,
        truncated: false,
      };
    }

    const requiredPaths = [
      "/workspace/input.csv",
      "/workspace/build-report.ts",
    ];
    const missingPaths = requiredPaths.filter(
      (path) => !this.#files.has(path),
    );

    if (missingPaths.length > 0) {
      return {
        output: JSON.stringify({ ...executionRecord, missingPaths }),
        exitCode: 1,
        truncated: false,
      };
    }

    this.#files.set(
      "/workspace/output/report.md",
      new TextEncoder().encode("# 订单报告\n\nORDER-1001: shipped\n"),
    );

    return {
      output: JSON.stringify({
        ...executionRecord,
        createdFile: "/workspace/output/report.md",
      }),
      exitCode: 0,
      truncated: false,
    };
  }

  uploadFiles(files: Array<[string, Uint8Array]>): FileUploadResponse[] {
    return files.map(([path, content]) => {
      this.#files.set(path, content);
      return { path, error: null };
    });
  }

  downloadFiles(paths: string[]): FileDownloadResponse[] {
    return paths.map((path) => ({
      path,
      content: this.#files.get(path) ?? null,
      error: this.#files.has(path) ? null : "file_not_found",
    }));
  }

  filePaths(): string[] {
    return [...this.#files.keys()].sort();
  }
}

/**
 * 用同一个“生成订单报告”任务展示三个位置：
 * 1. 宿主机保留的应用文件；2. 应用主动上传的任务输入；3. Agent Tool 在 Sandbox 中生成的文件。
 * 所有命令都是协议模拟，没有在宿主机执行 child_process。
 */
async function runSandboxProtocolComparison(): Promise<void> {
  const stateBackend = new StateBackend();
  const sandbox = new ProtocolDemoSandbox();
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  const filesAfterCreate = sandbox.filePaths();
  const upload = await sandbox.uploadFiles([
    [
      "/workspace/input.csv",
      encoder.encode("order_id,status\nORDER-1001,shipped\n"),
    ],
  ]);
  const filesAfterApplicationUpload = sandbox.filePaths();

  const model = new FakeToolCallingModel({
    toolCalls: [
      [
        {
          id: "sandbox-write-1",
          name: "write_file",
          args: {
            file_path: "/workspace/build-report.ts",
            content:
              "// 教学脚本：读取 input.csv，生成 output/report.md",
          },
        },
      ],
      [
        {
          id: "sandbox-execute-1",
          name: "execute",
          args: { command: "node /workspace/build-report.ts" },
        },
      ],
      [],
    ],
  });

  const agent = createDeepAgent({ model, backend: sandbox });
  const result = (await agent.invoke({
    messages: [
      {
        role: "user",
        content: "读取 input.csv，生成并执行报告脚本。",
      },
    ],
  })) as AgentResult;

  const filesAfterAgentTools = sandbox.filePaths();
  const [download] = await sandbox.downloadFiles([
    "/workspace/output/report.md",
  ]);

  console.dir(
    {
      sameTaskTwoExecutionChoices: {
        directHostExecution: {
          executedInThisDemo: false,
          command: "node /workspace/build-report.ts",
          risk:
            "若使用 child_process，命令会共享应用进程能够访问的宿主机资源",
        },
        sandboxAsTool: {
          agentRuntimeLocation: "application-host",
          commandLocation: sandbox.id,
          hostFilesKeptOutsideSandbox: [".env", "src/server.ts"],
        },
      },
      backendCapability: {
        StateBackend: {
          filesystemTools: true,
          executeTool: isSandboxBackend(stateBackend),
        },
        ProtocolDemoSandbox: {
          filesystemTools: true,
          executeTool: isSandboxBackend(sandbox),
          productionIsolation: false,
        },
      },
      taskFlow: {
        step1CreateSandbox: {
          sandboxId: sandbox.id,
          files: filesAfterCreate,
        },
        step2ApplicationUploadsInput: {
          api: "uploadFiles",
          result: upload,
          files: filesAfterApplicationUpload,
        },
        step3And4ModelToolsRunInsideSandbox: {
          toolResults: toolMessages(result.messages),
          executionHistory: sandbox.executionHistory,
          files: filesAfterAgentTools,
        },
        step5ApplicationDownloadsArtifact: {
          api: "downloadFiles",
          path: download?.path,
          content: download?.content ? decoder.decode(download.content) : null,
          error: download?.error,
        },
      },
      securityBoundary: {
        demonstratedByThisClass:
          "Tool Call 路由、文件边界和输入输出数据结构",
        notDemonstratedByThisClass:
          "真实进程、容器、网络、凭据和资源隔离",
      },
    },
    { depth: null },
  );
}

function createTicketReviewAgent(actualToolExecutions: TicketInput[]) {
  const createTicket = tool(
    (input: TicketInput) => {
      actualToolExecutions.push(input);
      return JSON.stringify({
        ticketId: "DEMO-TICKET-001",
        ...input,
        status: "created",
      });
    },
    {
      name: "create_incident_ticket",
      description: "创建故障工单；演示中属于必须审批的敏感写操作",
      schema: z.object({
        title: z.string(),
        severity: z.enum(["low", "medium", "high"]),
        evidence: z.string(),
      }),
    },
  );

  const model = new FakeToolCallingModel({
    toolCalls: [
      [
        {
          id: "ticket-call-1",
          name: "create_incident_ticket",
          args: {
            title: "Order API error spike",
            severity: "high",
            evidence: "5xx rate reached 18% for ten minutes",
          },
        },
      ],
      [],
    ],
  });

  return createDeepAgent({
    model,
    tools: [createTicket],
    checkpointer: new MemorySaver(),
    interruptOn: {
      create_incident_ticket: {
        allowedDecisions: ["approve", "edit", "reject"],
        description: "工单将写入业务系统，请核对严重等级与证据。",
      },
    },
  });
}

function createDecision(
  decision: "approve" | "edit" | "reject",
  request: HITLRequest,
): HITLResponse {
  const action = request.actionRequests[0];
  if (!action) {
    throw new Error("审批请求中没有待处理的 actionRequest");
  }

  switch (decision) {
    case "approve":
      return { decisions: [{ type: "approve" }] };
    case "edit":
      return {
        decisions: [
          {
            type: "edit",
            editedAction: {
              name: action.name,
              args: {
                ...action.args,
                severity: "medium",
                evidence:
                  "Reviewer verified a 6% error rate; downgrade to medium.",
              },
            },
          },
        ],
      };
    case "reject":
      return {
        decisions: [
          {
            type: "reject",
            message:
              "证据不足，未创建工单；请先补充持续时间与影响范围。",
          },
        ],
      };
  }
}

/**
 * 展示 HITL 的两段式协议：先返回待审批动作，再用同一 thread_id 恢复。
 */
async function runHitlDecision(
  decision: "approve" | "edit" | "reject",
): Promise<void> {
  const actualToolExecutions: TicketInput[] = [];
  const agent = createTicketReviewAgent(actualToolExecutions);
  const threadId = `advanced-hitl-${decision}`;
  const config = {
    configurable: { thread_id: threadId },
  };

  const interrupted = (await agent.invoke(
    {
      messages: [
        {
          role: "user",
          content: "检测到订单接口异常，请创建故障工单。",
        },
      ],
    },
    config,
  )) as AgentResult;

  const request = interrupted.__interrupt__?.[0]?.value;
  if (!request) {
    throw new Error("未收到 HITL interrupt，请检查 interruptOn 与 Checkpointer");
  }

  const toolExecutionsBeforeReview = [...actualToolExecutions];
  const response = createDecision(decision, request);
  const resumed = (await agent.invoke(
    new Command({ resume: response }),
    config,
  )) as AgentResult;

  console.dir(
    {
      phase0ReviewPolicy: {
        toolName: "create_incident_ticket",
        allowedDecisions: ["approve", "edit", "reject"],
        checkpointer: "MemorySaver",
        threadId,
      },
      phase1FirstInvokeReturnsInterrupt: {
        actionRequests: request.actionRequests,
        reviewConfigs: request.reviewConfigs,
        actualToolExecutions: toolExecutionsBeforeReview,
      },
      phase2HumanDecision: {
        decisions: response.decisions,
      },
      phase3SecondInvokeResumesCheckpoint: {
        resumeInput: {
          command: "Command",
          resume: response,
        },
        threadId,
        sameThreadId: true,
        actualToolExecutions,
        toolMessages: toolMessages(resumed.messages),
      },
    },
    { depth: null },
  );
}

function createEventAgent() {
  const inspectOrder = tool(
    ({ orderId }: { orderId: string }) =>
      JSON.stringify({ orderId, status: "shipped", eta: "2026-07-21" }),
    {
      name: "inspect_order",
      description: "查询订单状态",
      schema: z.object({ orderId: z.string() }),
    },
  );

  const model = new FakeToolCallingModel({
    toolCalls: [
      [
        {
          id: "inspect-call-1",
          name: "inspect_order",
          args: { orderId: "ORDER-1001" },
        },
      ],
      [],
    ],
  });

  return createDeepAgent({ model, tools: [inspectOrder] });
}

/**
 * 同时消费类型化投影与原始协议事件：前者适合 UI，后者保留全局到达顺序。
 */
async function runEventStreamComparison(): Promise<void> {
  const agent = createEventAgent();
  const run = await agent.streamEvents(
    {
      messages: [
        {
          role: "user",
          content: "查询 ORDER-1001 并回答状态。",
        },
      ],
    },
    { version: "v3" },
  );

  const messages: Array<{
    node: string | undefined;
    textLength: number;
    textPreview: string;
  }> = [];
  const calls: Array<{
    name: string;
    input: unknown;
    status: string;
    output: unknown | undefined;
    error: string | undefined;
  }> = [];
  const stateSnapshots: string[][] = [];
  const rawOrder: Array<Pick<ProtocolEvent, "seq" | "method"> & {
    namespace: string[];
  }> = [];

  const finalStatePromise = run.output;

  await Promise.all([
    (async () => {
      for await (const message of run.messages) {
        const text = await message.text;
        messages.push({
          node: message.node,
          textLength: text.length,
          textPreview: text.slice(0, 80),
        });
      }
    })(),
    (async () => {
      for await (const call of run.toolCalls) {
        const status = await call.status;
        calls.push({
          name: call.name,
          input: call.input,
          status,
          output: status === "finished" ? await call.output : undefined,
          error: status === "error" ? await call.error : undefined,
        });
      }
    })(),
    (async () => {
      for await (const values of run.values) {
        stateSnapshots.push(Object.keys(values as Record<string, unknown>));
      }
    })(),
    (async () => {
      for await (const event of run) {
        rawOrder.push({
          seq: event.seq,
          method: event.method,
          namespace: [...event.params.namespace],
        });
      }
    })(),
  ]);

  const finalState = await finalStatePromise;

  const methodCounts = rawOrder.reduce<Record<string, number>>(
    (counts, { method }) => ({
      ...counts,
      [method]: (counts[method] ?? 0) + 1,
    }),
    {},
  );
  const uniqueStateKeySets = [
    ...new Set(stateSnapshots.map((keys) => JSON.stringify(keys))),
  ].map((keys) => JSON.parse(keys) as string[]);

  console.dir(
    {
      typedProjections: {
        messages,
        toolCalls: calls,
        stateSnapshotCount: stateSnapshots.length,
        uniqueStateKeySets,
        finalStateKeys: Object.keys(finalState as Record<string, unknown>),
      },
      rawProtocolOrder: {
        eventCount: rawOrder.length,
        methodCounts,
        firstEvents: rawOrder.slice(0, 20).map((event) => ({
          ...event,
          namespace: event.namespace.map((segment) => segment.split(":")[0]),
        })),
      },
      observabilityBoundary: {
        eventStream: "当前运行的实时 UI / 控制数据",
        trace: "跨运行保存的 Model / Tool / Subagent 调用树",
      },
    },
    { depth: null },
  );
}

const mode = process.argv[2] ?? "all";

switch (mode) {
  case "permissions":
    await runPermissionComparison();
    break;
  case "sandbox":
    await runSandboxProtocolComparison();
    break;
  case "hitl-approve":
    await runHitlDecision("approve");
    break;
  case "hitl-edit":
    await runHitlDecision("edit");
    break;
  case "hitl-reject":
    await runHitlDecision("reject");
    break;
  case "events":
    await runEventStreamComparison();
    break;
  case "all":
    await runPermissionComparison();
    await runSandboxProtocolComparison();
    await runHitlDecision("approve");
    await runHitlDecision("edit");
    await runHitlDecision("reject");
    await runEventStreamComparison();
    break;
  default:
    throw new Error(
      "可用模式：permissions、sandbox、hitl-approve、hitl-edit、hitl-reject、events、all",
    );
}
