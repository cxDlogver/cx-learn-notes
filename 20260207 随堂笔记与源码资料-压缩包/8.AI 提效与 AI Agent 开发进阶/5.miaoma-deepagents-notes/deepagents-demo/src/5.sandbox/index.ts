import { mkdir } from "node:fs/promises";

import { Command, MemorySaver } from "@langchain/langgraph";
import { createDeepAgent, LocalShellBackend } from "deepagents";

import { ensureProviderEnv, getModel, threadConfig, workspacePath } from "../00-shared/lib/env";
import { collectReviewDecisions, hasInterrupt } from "../00-shared/lib/hitl";
import { printFinal, printObject, printTitle } from "../00-shared/lib/output";

export async function runSandboxesDemo(): Promise<void> {
  ensureProviderEnv();
  printTitle("sandboxes：shell-capable backend 教学演示");

  const sandboxRoot = workspacePath("data", "sandbox");
  await mkdir(sandboxRoot, { recursive: true });

  const backend = await LocalShellBackend.create({
    rootDir: sandboxRoot,
    virtualMode: true,
    timeout: 10,
    maxOutputBytes: 20_000,
    inheritEnv: false,
    env: {
      PATH: process.env.PATH ?? "",
    },
    initialFiles: {
      "/README.md": "本目录用于课程 sandbox demo。生产环境请替换为远程隔离 sandbox backend。\n",
      "/README2.md": "本目录用于课程 sandbox demo。生产环境请替换为远程隔离 sandbox backend。\n",
      "/HEYI.md": "本目录用于课程 sandbox demo。生产环境请替换为远程隔离 sandbox backend。\n",
    },
  });

  try {
    const probe = await backend.execute("node -e 'console.log(\"sandbox probe: \" + (6 * 7))'");
    printObject("受控探针命令输出", probe);

    const agent = createDeepAgent({
      model: getModel(),
      backend,
      checkpointer: new MemorySaver(),
      interruptOn: {
        execute: { allowedDecisions: ["approve", "reject"] },
        write_file: { allowedDecisions: ["approve", "reject"] },
      },
      systemPrompt: [
        "你是 sandbox 课程演示代理。",
        "你可以在当前工作区写文件和运行非常小的验证命令。",
        "执行 shell 前必须说明命令目的；不要访问工作区外路径。",
      ].join("\n"),
    });

    const config = threadConfig("sandboxes");
    let result = await agent.invoke(
      {
        messages: [
          {
            role: "user",
            content:
              "请创建 heyi.js，内容输出 我是合一，今天给大家讲解 typescript hello，然后运行 node hello.js 验证。",
          },
        ],
      },
      config,
    );

    if (hasInterrupt(result)) {
      const decisions = await collectReviewDecisions(result);
      result = await agent.invoke(new Command({ resume: { decisions } }), config);
    }

    printFinal(result);
  } finally {
    await backend.close();
  }
}

await runSandboxesDemo();
