import { createDeepAgent, SubAgent } from "deepagents";
import { llm } from "../shared/llm";

  const researcher: SubAgent = {
    name: 'researcher',
    description: "检索并归纳 DeepAgents 指定主题，输出 3-5 条高信号结论。",
    systemPrompt:
      "你是研究子代理。只负责资料归纳，不做最终课程设计。必须指出信息来源和适用边界。",
  }

  const qaReviewer: SubAgent = {
    name: 'qa-reviewer',
    description: "审查课程方案是否覆盖工程风险、测试验证、安全边界和生产化注意事项。",
    systemPrompt:
      "你是质量审查子代理。输出缺口、风险、改进建议三部分。不要重写完整方案。",
  }


const invoke = async () => {
  const agent = createDeepAgent({
    model: llm,
    tools: [],
    subagents: [researcher, qaReviewer],
    systemPrompt: [
      "你是 DeepAgents 课程助教。",
      "先用计划拆解任务，再调用必要工具。",
      "遇到资料归纳必须委派 researcher。", // 子智能体
      "最终定稿前必须委派 qa-reviewer 审查。", // 子智能体
      "最终输出要面向有经验的 TypeScript 开发者，避免空泛解释。",
    ].join("\n"),
  });
  //   invoke，Runnalbe 接口
//   const res = await agent.invoke({
//     messages: [
//       {
//         role: "user",
//         content:
//           "请为 120 分钟 DeepAgents 课程生成一个 5 分钟开场讲解 brief，必须覆盖 core、backends、subagents，并引用订单指标说明课程受众。",
//       },
//     ],
//   });

  const res = await agent.stream(
    {
      messages: [
        {
          role: "user",
          content:
            "请为 120 分钟 DeepAgents 课程生成一个 5 分钟开场讲解 brief，必须覆盖 core、backends、subagents，并引用订单指标说明课程受众。",
        },
      ],
    },
    {
      streamMode: "updates",
    },
  );

  for await (const c of res) {
    console.log(c);
  }
};

invoke();
