import { MinimalAgent } from "./agent.ts";
import type { AgentSpec } from "./contracts.ts";
import { InMemoryCheckpointStore, InMemoryLongTermMemoryStore } from "./memory.ts";
import { OpenAICompatibleModel } from "./models.ts";
import { defaultTools } from "./tools.ts";

/**
 * 真实模型联调入口。
 *
 * 与 main.ts 的区别是：这里把 ScriptedModel 换成 OpenAICompatibleModel，
 * 模型决策来自真实 /chat/completions 服务。运行方式见 package.json 的 demo:api，
 * 环境变量从当前项目目录的 .env 加载。
 */
const spec: AgentSpec = {
  goal: "查询北京的演示天气，并计算温度升高 2°C 后是多少。",
  allowedTools: ["get_weather", "calculator"],
  maxSteps: 8,
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

/**
 * 装配真实模型版本的 Agent。
 *
 * 即使使用真实模型，工具白名单、参数校验、Evidence 验证和最大步数仍由
 * MinimalAgent 内部的编排层与控制层负责，模型不能直接绕过这些规则。
 */
const agent = new MinimalAgent({
  model: OpenAICompatibleModel.fromEnv(),
  tools: defaultTools,
  checkpoints: new InMemoryCheckpointStore(),
  longTermMemory: new InMemoryLongTermMemoryStore([
    {
      id: "rule-1",
      content: "涉及外部事实时必须先使用工具，不得根据模型记忆编造。",
      tags: ["天气", "weather", "工具"]
    }
  ])
});

// 每次真实模型联调用时间戳生成 runId，方便从 Trace 中区分多次运行。
const result = await agent.run(spec, `api-demo-${Date.now()}`);

console.log(`状态：${result.state.status}`);
console.log(`答案：${result.answer ?? "无"}`);
console.log("\n执行轨迹：");
// 输出 Trace 可以检查真实模型是否按协议先调用工具，再提交带证据的最终答案。
for (const event of result.state.trace) {
  console.log(`${event.sequence}. step=${event.step} ${event.type}`, event.detail);
}

if (result.state.status !== "completed") {
  // 非 completed 时返回失败码，便于 CI 或命令行脚本识别联调没有通过。
  process.exitCode = 1;
}
