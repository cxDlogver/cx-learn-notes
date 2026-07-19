import "dotenv/config";

import { MultiServerMCPClient } from "@langchain/mcp-adapters";
import { ChatOpenAI } from "@langchain/openai";
import path from "node:path";
import { createAgent } from "langchain";

const client = new MultiServerMCPClient({
  mcpServers: {
    math: {
      transport: "stdio",
      command: "node",
      args: [
        path.resolve(
          import.meta.dirname,
          "../../dist/6.mcp",
          "./1.mcp-server-math.js",
        ),
      ],
    },
    weather: {
      url: "http://localhost:8000/mcp",
    },
  },
});

const llm = new ChatOpenAI({
  model: process.env.LLM_MODEL,
  apiKey: process.env.API_KEY,
  configuration: {
    baseURL: process.env.BASE_URL,
  },
});

const invoke = async () => {
  try {
    await client.initializeConnections();

    const tools = await client.getTools();
    const agent = createAgent({
      model: llm,
      tools,
    });

    const mathResponse = await agent.invoke({
      messages: [{ role: "user", content: "计算(3 + 5) x 12 等于多少" }],
    });
    console.log("🚀 ~ invoke ~ mathResponse:", mathResponse);

    const weatherResponse = await agent.invoke({
      messages: [{ role: "user", content: "我的城市是：北京，请获取天气" }],
    });
    console.log("🚀 ~ invoke ~ weatherResponse:", weatherResponse);
  } finally {
    await client.close();
  }
};

invoke();
