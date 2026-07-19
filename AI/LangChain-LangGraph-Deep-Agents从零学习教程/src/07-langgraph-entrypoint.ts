import assert from "node:assert/strict";
import { entrypoint, task } from "@langchain/langgraph";
import { workflow as stateGraphWorkflow } from "./06-langgraph-stategraph.js";

type Route = "normal" | "urgent";

export type IncidentInput = {
  request: string;
};

export type IncidentResult = {
  request: string;
  valid: boolean;
  route: Route;
  result: string;
  trace: string[];
};

/**
 * task 把一个普通异步函数变成可被 LangGraph Runtime 单独追踪、重试和保存结果的工作单元。
 * 真实项目中的模型调用、网络请求、文件写入和随机值生成尤其适合放进 task。
 */
const validateIncident = task(
  "validate_incident",
  async (request: string): Promise<boolean> => request.trim().length >= 8,
);

const classifyIncident = task(
  "classify_incident",
  async (request: string): Promise<Route> =>
    /生产|宕机|大面积|P0/i.test(request) ? "urgent" : "normal",
);

const formatQueueResult = task(
  "format_queue_result",
  async (input: { request: string; route: Route }): Promise<string> =>
    input.route === "urgent"
      ? `紧急队列：${input.request}`
      : `普通队列：${input.request}`,
);

/**
 * entrypoint 把一个普通异步函数包装为可 invoke/stream 的 LangGraph 工作流。
 * if、局部变量和数组 push 都是普通 TypeScript；不需要 StateSchema、Node、Edge 或 Reducer。
 */
export const functionalWorkflow = entrypoint(
  { name: "incident_functional_workflow" },
  async (input: IncidentInput): Promise<IncidentResult> => {
    const trace: string[] = [];

    const valid = await validateIncident(input.request);
    trace.push("validate");

    if (!valid) {
      trace.push("reject");
      return {
        request: input.request,
        valid: false,
        route: "normal",
        result: "信息不足：请补充现象、影响范围和时间。",
        trace,
      };
    }

    const route = await classifyIncident(input.request);
    trace.push("classify");

    const result = await formatQueueResult({
      request: input.request,
      route,
    });
    trace.push(route);

    return {
      request: input.request,
      valid: true,
      route,
      result,
      trace,
    };
  },
);

const urgentInput: IncidentInput = {
  request: "生产支付服务大面积 5xx，开始时间 10:30",
};
const invalidInput: IncidentInput = { request: "报错" };
const inputs: IncidentInput[] = [urgentInput, invalidInput];

async function runFunctionalExample(): Promise<void> {
  for (const input of inputs) {
    console.log(await functionalWorkflow.invoke(input));
  }
}

async function runComparison(): Promise<void> {
  for (const input of inputs) {
    const [stateGraphResult, entrypointResult] = await Promise.all([
      stateGraphWorkflow.invoke(input),
      functionalWorkflow.invoke(input),
    ]);

    assert.deepEqual(entrypointResult, stateGraphResult);
    console.log({
      request: input.request,
      sameResult: true,
      trace: entrypointResult.trace,
    });
  }
}

async function main(): Promise<void> {
  const mode = process.argv[2] ?? "all";

  switch (mode) {
    case "functional":
      await runFunctionalExample();
      break;
    case "compare":
      await runComparison();
      break;
    case "all":
      await runFunctionalExample();
      await runComparison();
      break;
    default:
      throw new Error(
        `未知模式：${mode}。可用模式：all、functional、compare`,
      );
  }
}

if (process.argv[1]?.endsWith("07-langgraph-entrypoint.ts")) {
  await main();
}
