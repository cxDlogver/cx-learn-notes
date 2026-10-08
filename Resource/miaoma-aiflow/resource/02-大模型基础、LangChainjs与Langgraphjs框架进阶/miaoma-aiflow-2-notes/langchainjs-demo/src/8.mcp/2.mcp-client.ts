import { MultiServerMCPClient } from "@langchain/mcp-adapters";
import { ChatOllama } from "@langchain/ollama";
import { createAgent, HumanMessage } from "langchain";
import path from "node:path";

const client = new MultiServerMCPClient({
  mcpServers: {
    math: {
      transport: "stdio", // 子进程方式来通信
      command: "node",
      args: [
        path.resolve(
          import.meta.dirname,
          "../../dist/8.mcp",
          "./1.mcp-server-math.js"
        ),
      ],
    },
    weather: {
      url: "http://localhost:8000/mcp",
    },
  },
});

const llm = new ChatOllama({
  model: "qwen3:0.6b", // 模型名称
  // model: "qwen3-vl:2b", // 模型名称
  temperature: 0.7, // 温度参数，控制生成文本的随机性
});

const invoke = async () => {
  // 先初始化客户端链接
  await client.initializeConnections();

  const tools = await client.getTools();

  const agent = createAgent({
    model: llm,
    tools,
  });

  //   询问算数运算，讲解 mcp 控制台工具的调用
  //   const res = await agent.invoke({
  //     messages: [
  //       new HumanMessage({
  //         content: "1 + 1 等于几？",
  //       }),
  //     ],
  //   });
  //   console.log(res);

  //   询问天气，讲解 mcp http 服务的调用
  const res = await agent.invoke({
    messages: [
      new HumanMessage({
        content: "请问北京天气怎么样？",
      }),
    ],
  });
  console.log(res);
};

invoke();
