import { createDeepAgent } from "deepagents";
import { llm } from "../shared/llm";

console.log(123, process.env.NAME);

const invoke = async () => {
  //   const res = await llm.invoke("豆包，4123123123+4123123112 等于几？只给结果");
  //   console.log("🚀 ~ invoke ~ res:", res.content);
  const agent = createDeepAgent({
    model: llm,
    tools: [],
    systemPrompt: [
      "你是 DeepAgents 课程助教。",
      "先用计划拆解任务，再调用必要工具。",
      "最终输出要面向有经验的 TypeScript 开发者，避免空泛解释。",
    ].join("\n"),
  });

  //   invoke，Runnalbe 接口
  const res = await agent.invoke(
    {
      messages: [
        {
          role: "user",
          content:
            "请为 120 分钟 DeepAgents 课程生成一个 5 分钟开场讲解 brief，必须覆盖 core、backends、subagents，并引用订单指标说明课程受众。",
        },
      ],
    }
  );
//   const res = await agent.stream(
//     {
//       messages: [
//         {
//           role: "user",
//           content:
//             "请为 120 分钟 DeepAgents 课程生成一个 5 分钟开场讲解 brief，必须覆盖 core、backends、subagents，并引用订单指标说明课程受众。",
//         },
//       ],
//     },
//     {
//       streamMode: "updates",
//     },
//   );

//   for await (const c of res) {
//     console.log(c);
//   }

  console.log(res);
};

invoke();
