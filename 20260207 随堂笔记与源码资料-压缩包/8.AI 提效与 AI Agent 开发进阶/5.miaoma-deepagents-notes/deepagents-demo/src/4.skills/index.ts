import { createCodeInterpreterMiddleware } from "@langchain/quickjs";
import {
  CompositeBackend,
  createDeepAgent,
  FilesystemBackend,
  StateBackend,
} from "deepagents";
import { llm } from "../shared/llm";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const createSkillsDemoBackend = () =>
  new CompositeBackend(new StateBackend(), {
    "/data/": new FilesystemBackend({
      rootDir: path.resolve(import.meta.dirname, "../../data"),
      virtualMode: true,
    }),
    "/skills/": new FilesystemBackend({
      rootDir: path.resolve(import.meta.dirname, "../../skills"),
      virtualMode: true,
    }),
  });

const invoke = async () => {
  //   const res = await llm.invoke("豆包，4123123123+4123123112 等于几？只给结果");
  //   console.log("🚀 ~ invoke ~ res:", res.content);
  const backend = createSkillsDemoBackend();

  const agent = createDeepAgent({
    model: llm,
    backend,
    tools: [],
    skills: ["/skills/"/* , `${process.cwd()}/.codex/skills` */],
    middleware: [
      createCodeInterpreterMiddleware({
        skillsBackend: backend,
      }),
    ],
    systemPrompt: [
      "你是 DeepAgents 课程助教。",
      "当请求涉及课程 brief 时，优先使用 brief-writer skill。",
      "当请求涉及订单指标归纳时，优先使用 order-analysis skill 的 helper。",
      "本 demo 必须调用 write_file，把最终讲义写入 /data/workspace/skills-module-brief.md。",
      "不要写入 /docs、/skills 或其他源码目录。",
    ].join("\n"),
  });

  //   invoke，Runnalbe 接口
  // const res = await agent.invoke(
  //   {
  //     messages: [
  //       {
  //         role: "user",
  //         content:
  //           "请使用课程 brief skill 生成 skills 模块讲义，并用订单分析 helper 总结 course 产品线指标。必须将完整结果写入 /data/workspace/skills-module-brief.md，最终回复只说明写入路径和内容摘要。",
  //       },
  //     ],
  //   }
  // );
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

  console.log(res);
};

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  invoke();
}
