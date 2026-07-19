import assert from "node:assert/strict";
import {
  AIMessage,
  HumanMessage,
  isAIMessage,
  isHumanMessage,
  isToolMessage,
  type BaseMessage,
} from "@langchain/core/messages";
import {
  Command,
  END,
  entrypoint,
  interrupt,
  isInterrupted,
  MemorySaver,
  MessagesValue,
  ReducedValue,
  START,
  StateGraph,
  StateSchema,
  task,
  type GraphNode,
} from "@langchain/langgraph";
import { ToolNode, toolsCondition } from "@langchain/langgraph/prebuilt";
import { z } from "zod";

import { getOrderStatus } from "./shared/tools.js";

/**
 * 1. Reducer 与并行 Fan-out / Fan-in
 */

const ServiceAnalysisSchema = z.object({
  service: z.string(),
  risk: z.enum(["low", "medium", "high"]),
});

type ServiceAnalysis = z.infer<typeof ServiceAnalysisSchema>;

type FanOutResult = {
  request: string;
  analyses: ServiceAnalysis[];
  summary: string;
};

const FanOutState = new StateSchema({
  request: z.string(),
  analyses: new ReducedValue(
    z.array(ServiceAnalysisSchema).default(() => []),
    {
      reducer: (current, update) => current.concat(update),
    },
  ),
  summary: z.string().default(""),
});

function analyzeService(
  service: string,
  request: string,
): ServiceAnalysis {
  if (service === "payment" && /生产|大面积|P0/i.test(request)) {
    return { service, risk: "high" };
  }
  if (service === "order") {
    return { service, risk: "medium" };
  }
  return { service, risk: "low" };
}

function summarizeAnalyses(analyses: ServiceAnalysis[]): string {
  return [...analyses]
    .sort((a, b) => a.service.localeCompare(b.service))
    .map(({ service, risk }) => `${service}:${risk}`)
    .join(" | ");
}

const checkPayment: GraphNode<typeof FanOutState> = (state) => ({
  analyses: [analyzeService("payment", state.request)],
});

const checkOrder: GraphNode<typeof FanOutState> = (state) => ({
  analyses: [analyzeService("order", state.request)],
});

const checkSearch: GraphNode<typeof FanOutState> = (state) => ({
  analyses: [analyzeService("search", state.request)],
});

const aggregateAnalyses: GraphNode<typeof FanOutState> = (state) => ({
  summary: summarizeAnalyses(state.analyses),
});

export const fanOutGraph = new StateGraph(FanOutState)
  .addNode("check_payment", checkPayment)
  .addNode("check_order", checkOrder)
  .addNode("check_search", checkSearch)
  .addNode("aggregate", aggregateAnalyses)
  .addEdge(START, "check_payment")
  .addEdge(START, "check_order")
  .addEdge(START, "check_search")
  .addEdge("check_payment", "aggregate")
  .addEdge("check_order", "aggregate")
  .addEdge("check_search", "aggregate")
  .addEdge("aggregate", END)
  .compile();

const analyzeServiceTask = task(
  "analyze_service",
  async (input: { service: string; request: string }) =>
    analyzeService(input.service, input.request),
);

export const fanOutFunctionalWorkflow = entrypoint(
  { name: "fanout_functional_workflow" },
  async (input: { request: string }): Promise<FanOutResult> => {
    const services = ["payment", "order", "search"];
    const analyses = await Promise.all(
      services.map((service) =>
        analyzeServiceTask({ service, request: input.request }),
      ),
    );

    return {
      request: input.request,
      analyses,
      summary: summarizeAnalyses(analyses),
    };
  },
);

function normalizeFanOutResult(result: FanOutResult): FanOutResult {
  return {
    ...result,
    analyses: [...result.analyses].sort((a, b) =>
      a.service.localeCompare(b.service),
    ),
  };
}

async function runFanOutExample(): Promise<void> {
  const input = { request: "生产支付服务大面积 5xx" };
  const [graphResult, functionalResult] = await Promise.all([
    fanOutGraph.invoke(input),
    fanOutFunctionalWorkflow.invoke(input),
  ]);
  const normalizedGraph = normalizeFanOutResult(graphResult);
  const normalizedFunctional = normalizeFanOutResult(functionalResult);

  assert.deepEqual(normalizedGraph, normalizedFunctional);
  console.log({
    graph: normalizedGraph,
    functional: normalizedFunctional,
    sameResult: true,
  });
}

/**
 * 2. ToolNode Agent Loop
 *
 * 为保证脚本离线可运行，agent 节点使用确定性函数模拟一次模型决策：
 * HumanMessage -> 生成 Tool Call；ToolMessage -> 生成不含 Tool Call 的最终回答。
 */

const AgentState = new StateSchema({
  messages: MessagesValue,
});

const orderToolNode = new ToolNode([getOrderStatus]);

async function invokeOfflineAgentModel(
  messages: BaseMessage[],
): Promise<AIMessage> {
  const lastMessage = messages.at(-1);

  if (lastMessage && isHumanMessage(lastMessage)) {
    const orderId = String(lastMessage.content).match(/ORDER-\d+/)?.[0];
    if (!orderId) {
      return new AIMessage("请提供 ORDER- 开头的订单号。");
    }
    return new AIMessage({
      content: "",
      tool_calls: [
        {
          id: "call-order-status-1",
          name: "get_order_status",
          args: { orderId },
          type: "tool_call",
        },
      ],
    });
  }

  if (lastMessage && isToolMessage(lastMessage)) {
    return new AIMessage(`订单查询结果：${String(lastMessage.content)}`);
  }

  return new AIMessage("无法处理当前消息。");
}

const callAgentModel: GraphNode<typeof AgentState> = async (state) => ({
  messages: [await invokeOfflineAgentModel(state.messages)],
});

function routeByToolCalls(
  state: typeof AgentState.State,
): "tools" | typeof END {
  const lastMessage = state.messages.at(-1);
  const route =
    lastMessage &&
    isAIMessage(lastMessage) &&
    (lastMessage.tool_calls?.length ?? 0) > 0
      ? "tools"
      : END;

  // toolsCondition 是相同判断的预构建实现。
  assert.equal(toolsCondition(state), route);
  return route;
}

export const toolNodeAgentGraph = new StateGraph(AgentState)
  .addNode("agent", callAgentModel)
  .addNode("tools", orderToolNode)
  .addEdge(START, "agent")
  .addConditionalEdges("agent", routeByToolCalls, ["tools", END])
  .addEdge("tools", "agent")
  .compile();

const callAgentModelTask = task(
  "call_offline_agent_model",
  async (messages: BaseMessage[]) => invokeOfflineAgentModel(messages),
);

const executeToolNodeTask = task(
  "execute_order_tool_node",
  async (messages: BaseMessage[]): Promise<BaseMessage[]> => {
    const output = await orderToolNode.invoke({ messages });
    return output.messages;
  },
);

export const functionalAgentLoop = entrypoint(
  { name: "functional_agent_loop" },
  async (input: { question: string }): Promise<{ messages: BaseMessage[] }> => {
    let messages: BaseMessage[] = [new HumanMessage(input.question)];

    for (let step = 0; step < 6; step += 1) {
      const aiMessage = await callAgentModelTask(messages);
      messages = [...messages, aiMessage];

      if ((aiMessage.tool_calls?.length ?? 0) === 0) {
        return { messages };
      }

      const toolMessages = await executeToolNodeTask(messages);
      messages = [...messages, ...toolMessages];
    }

    throw new Error("Agent Loop 超过最大步数");
  },
);

function compactMessages(messages: BaseMessage[]) {
  return messages.map((message) => ({
    type: message.getType(),
    content: String(message.content),
    toolCalls:
      isAIMessage(message) && message.tool_calls
        ? message.tool_calls.map(({ name, args }) => ({ name, args }))
        : [],
  }));
}

async function runAgentLoopExample(): Promise<void> {
  const question = "请查询订单 ORDER-1001";
  const [graphResult, functionalResult] = await Promise.all([
    toolNodeAgentGraph.invoke(
      { messages: [new HumanMessage(question)] },
      { recursionLimit: 6 },
    ),
    functionalAgentLoop.invoke({ question }),
  ]);
  const graphMessages = compactMessages(graphResult.messages);
  const functionalMessages = compactMessages(functionalResult.messages);

  assert.deepEqual(graphMessages, functionalMessages);
  console.log({
    messages: graphMessages,
    sameResult: true,
  });
}

/**
 * 3. Subgraph
 */

const ReviewState = new StateSchema({
  request: z.string(),
  normalized: z.string().default(""),
  severity: z.enum(["low", "high"]).default("low"),
  recommendation: z.string().default(""),
  summary: z.string().default(""),
});

const normalizeRequest: GraphNode<typeof ReviewState> = (state) => ({
  normalized: state.request.trim(),
});

const assessRisk: GraphNode<typeof ReviewState> = (state) => {
  const severity = /生产|大面积|P0/i.test(state.normalized)
    ? "high"
    : "low";
  return {
    severity,
    recommendation:
      severity === "high" ? "立即升级并准备回滚" : "进入普通排查队列",
  };
};

export const incidentReviewSubgraph = new StateGraph(ReviewState)
  .addNode("normalize", normalizeRequest)
  .addNode("assess", assessRisk)
  .addEdge(START, "normalize")
  .addEdge("normalize", "assess")
  .addEdge("assess", END)
  .compile();

const finalizeReview: GraphNode<typeof ReviewState> = (state) => ({
  summary: `${state.severity}：${state.recommendation}`,
});

export const parentGraphWithSubgraph = new StateGraph(ReviewState)
  .addNode("specialist_review", incidentReviewSubgraph)
  .addNode("finalize", finalizeReview)
  .addEdge(START, "specialist_review")
  .addEdge("specialist_review", "finalize")
  .addEdge("finalize", END)
  .compile();

export const functionalWorkflowWithSubgraph = entrypoint(
  { name: "functional_workflow_with_subgraph" },
  async (input: { request: string }) => {
    const reviewed = await incidentReviewSubgraph.invoke(input);
    return {
      ...reviewed,
      summary: `${reviewed.severity}：${reviewed.recommendation}`,
    };
  },
);

async function runSubgraphExample(): Promise<void> {
  const input = { request: "  生产支付服务大面积 5xx  " };
  const [graphResult, functionalResult] = await Promise.all([
    parentGraphWithSubgraph.invoke(input),
    functionalWorkflowWithSubgraph.invoke(input),
  ]);

  assert.deepEqual(graphResult, functionalResult);
  console.log({
    graph: graphResult,
    functional: functionalResult,
    sameResult: true,
  });
}

/**
 * 4. Checkpoint、Interrupt 与恢复
 */

const ApprovalState = new StateSchema({
  action: z.string(),
  approved: z.boolean().default(false),
  result: z.string().default(""),
});

type Approval = {
  approved: boolean;
  reason: string;
};

const reviewAction: GraphNode<typeof ApprovalState> = (state) => {
  const decision = interrupt({
    type: "approval_request",
    action: state.action,
  }) as Approval;
  return { approved: decision.approved };
};

const executeAction: GraphNode<typeof ApprovalState> = (state) => ({
  result: state.approved ? `已执行：${state.action}` : `已取消：${state.action}`,
});

export const approvalGraph = new StateGraph(ApprovalState)
  .addNode("review", reviewAction)
  .addNode("execute", executeAction)
  .addEdge(START, "review")
  .addEdge("review", "execute")
  .addEdge("execute", END)
  .compile({ checkpointer: new MemorySaver() });

const reviewActionTask = task(
  "review_action",
  async (action: string): Promise<Approval> =>
    interrupt({ type: "approval_request", action }) as Approval,
);

const executeActionTask = task(
  "execute_approved_action",
  async (input: { action: string; approved: boolean }) =>
    input.approved
      ? `已执行：${input.action}`
      : `已取消：${input.action}`,
);

export const approvalFunctionalWorkflow = entrypoint(
  {
    name: "approval_functional_workflow",
    checkpointer: new MemorySaver(),
  },
  async (input: { action: string }) => {
    const decision = await reviewActionTask(input.action);
    const result = await executeActionTask({
      action: input.action,
      approved: decision.approved,
    });
    return {
      action: input.action,
      approved: decision.approved,
      result,
    };
  },
);

async function runInterruptExample(): Promise<void> {
  const input = { action: "创建生产故障工单" };
  const graphConfig = {
    configurable: { thread_id: "advanced-graph-approval" },
  };
  const functionalConfig = {
    configurable: { thread_id: "advanced-functional-approval" },
  };

  const [graphPaused, functionalPaused] = await Promise.all([
    approvalGraph.invoke(input, graphConfig),
    approvalFunctionalWorkflow.invoke(input, functionalConfig),
  ]);
  assert.equal(isInterrupted(graphPaused), true);
  assert.equal(isInterrupted(functionalPaused), true);

  const readInterrupts = (value: unknown): unknown =>
    value && typeof value === "object" && "__interrupt__" in value
      ? value.__interrupt__
      : [];

  const approval = { approved: true, reason: "证据充分" };
  const [graphResumed, functionalResumed] = await Promise.all([
    approvalGraph.invoke(new Command({ resume: approval }), graphConfig),
    approvalFunctionalWorkflow.invoke(
      new Command({ resume: approval }),
      functionalConfig,
    ),
  ]);

  const normalizedGraph = {
    action: graphResumed.action,
    approved: graphResumed.approved,
    result: graphResumed.result,
  };
  assert.deepEqual(normalizedGraph, functionalResumed);
  console.log({
    paused: {
      graph: readInterrupts(graphPaused),
      functional: readInterrupts(functionalPaused),
    },
    resumed: normalizedGraph,
    sameResult: true,
  });
}

async function main(): Promise<void> {
  const mode = process.argv[2] ?? "all";

  switch (mode) {
    case "fanout":
      await runFanOutExample();
      break;
    case "agent-loop":
      await runAgentLoopExample();
      break;
    case "subgraph":
      await runSubgraphExample();
      break;
    case "interrupt":
      await runInterruptExample();
      break;
    case "all":
      await runFanOutExample();
      await runAgentLoopExample();
      await runSubgraphExample();
      await runInterruptExample();
      break;
    default:
      throw new Error(
        `未知模式：${mode}。可用模式：all、fanout、agent-loop、subgraph、interrupt`,
      );
  }
}

if (process.argv[1]?.endsWith("08-langgraph-advanced.ts")) {
  await main();
}
