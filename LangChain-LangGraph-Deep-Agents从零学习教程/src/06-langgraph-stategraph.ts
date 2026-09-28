import {
  Annotation,
  END,
  ReducedValue,
  START,
  StateGraph,
  StateSchema,
  type ConditionalEdgeRouter,
  type GraphNode,
} from "@langchain/langgraph";
import { z } from "zod";

/**
 * StateGraph 支持三种 State Schema。
 * 三个最小图使用相同的输入和节点逻辑，便于比较定义方式的差异。
 */
const StateSchemaExample = new StateSchema({
  request: z.string(),
  result: z.string().default(""),
});

const stateSchemaNode: GraphNode<typeof StateSchemaExample> = (state) => ({
  result: state.request.trim(),
});

export const stateSchemaGraph = new StateGraph(StateSchemaExample)
  .addNode("normalize", stateSchemaNode)
  .addEdge(START, "normalize")
  .addEdge("normalize", END)
  .compile();

const AnnotationState = Annotation.Root({
  request: Annotation<string>(),
  result: Annotation<string>(),
});

const annotationNode: GraphNode<typeof AnnotationState> = (state) => ({
  result: state.request.trim(),
});

export const annotationGraph = new StateGraph(AnnotationState)
  .addNode("normalize", annotationNode)
  .addEdge(START, "normalize")
  .addEdge("normalize", END)
  .compile();

const ZodObjectState = z.object({
  request: z.string(),
  result: z.string().default(""),
});

const zodObjectNode: GraphNode<typeof ZodObjectState> = (state) => ({
  result: state.request.trim(),
});

export const zodObjectGraph = new StateGraph(ZodObjectState)
  .addNode("normalize", zodObjectNode)
  .addEdge(START, "normalize")
  .addEdge("normalize", END)
  .compile();

async function runSchemaExamples(): Promise<void> {
  const input = { request: "  生产支付服务大面积 5xx  " };

  const [stateSchemaOutput, annotationOutput, zodObjectOutput] =
    await Promise.all([
      stateSchemaGraph.invoke(input),
      annotationGraph.invoke(input),
      zodObjectGraph.invoke(input),
    ]);

  console.log("StateSchema:", stateSchemaOutput);
  console.log("Annotation.Root:", annotationOutput);
  console.log("Zod object:", zodObjectOutput);
}

/**
 * State 中的普通 Schema 字段使用“新值覆盖旧值”的更新语义。
 * trace 是本例自定义的节点执行轨迹。每个节点只返回自己的名称，Reducer 接收
 * 当前 string[] 和本次 string Update，将名称追加后再保存为新的 string[]。
 */
export const WorkflowState = new StateSchema({
  request: z.string(),
  valid: z.boolean().default(false),
  route: z.enum(["normal", "urgent"]).default("normal"),
  result: z.string().default(""),
  trace: new ReducedValue(z.array(z.string()).default(() => []), {
    inputSchema: z.string(),
    reducer: (current, next) => [...current, next],
  }),
});

const validate: GraphNode<typeof WorkflowState> = (state) => ({
  valid: state.request.trim().length >= 8,
  trace: "validate",
});

const classify: GraphNode<typeof WorkflowState> = (state) => ({
  route: /生产|宕机|大面积|P0/i.test(state.request) ? "urgent" : "normal",
  trace: "classify",
});

const reject: GraphNode<typeof WorkflowState> = () => ({
  result: "信息不足：请补充现象、影响范围和时间。",
  trace: "reject",
});

const normal: GraphNode<typeof WorkflowState> = (state) => ({
  result: `普通队列：${state.request}`,
  trace: "normal",
});

const urgent: GraphNode<typeof WorkflowState> = (state) => ({
  result: `紧急队列：${state.request}`,
  trace: "urgent",
});

const afterValidation: ConditionalEdgeRouter<
  typeof WorkflowState,
  Record<string, unknown>,
  "classify" | "reject"
> = (state) => (state.valid ? "classify" : "reject");

const afterClassification: ConditionalEdgeRouter<
  typeof WorkflowState,
  Record<string, unknown>,
  "normal" | "urgent"
> = (state) => state.route;

/**
 * START / END 是虚拟节点；普通 Edge 表示固定跳转，Conditional Edge 根据 State 选择目标。
 */
export const workflow = new StateGraph(WorkflowState)
  .addNode("validate", validate)
  .addNode("classify", classify)
  .addNode("reject", reject)
  .addNode("normal", normal)
  .addNode("urgent", urgent)
  .addEdge(START, "validate")
  .addConditionalEdges("validate", afterValidation, ["classify", "reject"])
  .addConditionalEdges("classify", afterClassification, ["normal", "urgent"])
  .addEdge("reject", END)
  .addEdge("normal", END)
  .addEdge("urgent", END)
  .compile();

async function runWorkflowExample(): Promise<void> {
  const inputs = [
    { request: "生产支付服务大面积 5xx，开始时间 10:30" },
    { request: "报错" },
  ];

  for (const input of inputs) {
    const output = await workflow.invoke(input);
    console.log({
      request: output.request,
      valid: output.valid,
      route: output.route,
      result: output.result,
      trace: output.trace,
    });
  }
}

async function main(): Promise<void> {
  const mode = process.argv[2] ?? "all";

  switch (mode) {
    case "schemas":
      await runSchemaExamples();
      break;
    case "workflow":
      await runWorkflowExample();
      break;
    case "all":
      await runSchemaExamples();
      await runWorkflowExample();
      break;
    default:
      throw new Error(
        `未知模式：${mode}。可用模式：all、schemas、workflow`,
      );
  }
}

if (process.argv[1]?.endsWith("06-langgraph-stategraph.ts")) {
  await main();
}
