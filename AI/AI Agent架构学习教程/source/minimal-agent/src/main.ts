import { MinimalAgent } from "./agent.ts";
import type { AgentSpec, ModelDecision } from "./contracts.ts";
import { InMemoryCheckpointStore, InMemoryLongTermMemoryStore } from "./memory.ts";
import { ScriptedModel } from "./models.ts";
import { defaultTools } from "./tools.ts";

/**
 * 离线演示入口。
 *
 * 这个文件不用真实 LLM，而是用 ScriptedModel 固定返回 3 个决策。
 * 这样可以稳定观察 Agent Runtime 如何执行：
 * 工具调用 → Observation → Evidence → 最终答案验证。
 */
const decisions: ModelDecision[] = [
  // 第 1 轮：模型请求查询天气工具，产生 weather Evidence。
  {
    type: "tool_call",
    summary: "先读取外部天气事实",
    call: { id: "weather-1", name: "get_weather", input: { city: "北京" } }
  },
  // 第 2 轮：模型基于天气温度请求计算器工具，产生 calculation Evidence。
  {
    type: "tool_call",
    summary: "根据天气观察计算升高 2°C 后的温度",
    call: {
      id: "calc-1",
      name: "calculator",
      input: { operation: "add", left: 25, right: 2 }
    }
  },
  // 第 3 轮：模型提交最终答案候选，并引用前两轮工具产生的 Evidence ID。
  {
    type: "final",
    summary: "天气事实与计算结果都已有工具证据",
    answer: "演示数据中北京为晴天、25°C；升高 2°C 后是 27°C。",
    evidenceIds: ["weather-1:e1", "calc-1:e1"]
  }
];

/**
 * AgentSpec 是用户目标和运行约束的结构化表达。
 *
 * allowedTools 决定本任务能用哪些工具；maxSteps 防止无限循环；
 * acceptance 决定最终答案必须引用哪些 Evidence tag。
 */
const spec: AgentSpec = {
  goal: "查询北京的演示天气，并计算温度升高 2°C 后是多少。",
  allowedTools: ["get_weather", "calculator"],
  maxSteps: 5,
  acceptance: [
    {
      id: "weather-fetched",
      description: "天气必须来自工具观察",
      requiredEvidenceTags: ["weather"]
    },
    {
      id: "calculation-completed",
      description: "温度变化必须由计算工具验证",
      requiredEvidenceTags: ["calculation"]
    }
  ]
};

// 内存 Checkpoint 让示例可以展示「状态保存」，但不会跨进程持久化。
const checkpoints = new InMemoryCheckpointStore();

// 长期记忆会在每轮上下文构造时被召回，提醒模型外部事实必须来自工具。
const longTermMemory = new InMemoryLongTermMemoryStore([
  {
    id: "rule-1",
    content: "涉及外部事实时必须先使用工具，不得根据模型记忆编造。",
    tags: ["天气", "weather", "工具"]
  }
]);

/**
 * 装配五层：
 * - ScriptedModel：模型层；
 * - defaultTools：执行层；
 * - checkpoints / longTermMemory：状态和记忆；
 * - MinimalAgent 内部默认创建上下文层和控制层。
 */
const agent = new MinimalAgent({
  model: new ScriptedModel(decisions),
  tools: defaultTools,
  checkpoints,
  longTermMemory
});

// 固定 runId 方便在教学输出里识别同一次运行。
const result = await agent.run(spec, "demo-run");

console.log(`状态：${result.state.status}`);
console.log(`答案：${result.answer ?? "无"}`);
console.log("\n执行轨迹：");
// Trace 展示编排层的每个关键事件，便于对照五层工作流。
for (const event of result.state.trace) {
  console.log(`${event.sequence}. step=${event.step} ${event.type}`, event.detail);
}
