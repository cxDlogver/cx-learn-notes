import { ChatOllama } from "@langchain/ollama";
import { createAgent, tool } from "langchain";
import * as z from "zod";

const PersonInfo = z.object({
  name: z.string().describe("人物姓名"),
  age: z.number().describe("人物年龄"),
});

const getWeather = tool(
  async (input) => {
    // 模拟异步操作，例如调用天气 API
    const { location } = input;
    await new Promise((resolve) => setTimeout(resolve, 1000));
    return `根据地点${location}，${location}的天气是晴`;
  },
  {
    name: "get_weather",
    description: "用于获取指定地点的天气",
    schema: z.object({
      location: z.string().describe("指定的地点"),
    }),
  }
);

const agent = createAgent({
  model: new ChatOllama({
    model: "qwen3:0.6b",
    temperature: 0,
  }),
  tools: [getWeather],
  responseFormat: PersonInfo,
});

const invoke = async () => {
  const res = await agent.stream(
    {
      // messages: [{ role: "user", content: "我是合一，我今年18岁" }],
      messages: [{ role: "user", content: "北京天气怎么样？" }],
    },
    {
      streamMode: "values",
    }
  );
  for await (const chunk of res) {
    // Each chunk contains the full state at that point
    const latestMessage = chunk.messages.at(-1);
  
    console.log("🚀 ~ invoke ~ latestMessage:", latestMessage);
    console.log("🚀 ~ invoke ~ structuredResponse:", chunk.structuredResponse);
  }
};

invoke();
