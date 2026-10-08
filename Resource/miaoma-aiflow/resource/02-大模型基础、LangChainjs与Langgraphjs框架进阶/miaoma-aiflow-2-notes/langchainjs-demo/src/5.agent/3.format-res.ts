// console.log("hello world");
import { ChatOllama } from "@langchain/ollama";
import { createAgent, HumanMessage, tool } from "langchain";
import * as z from "zod";

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

const WeatherFormat = z.object({
  location: z.string().describe("地点"),
  weather: z.string().describe("天气"),
});

const invoke = async () => {
  const llm = new ChatOllama({
    model: "qwen3:0.6b", // 模型名称
    // model: "qwen3-vl:2b", // 模型名称
    temperature: 0.7, // 温度参数，控制生成文本的随机性
  });

  const prompt = "海南天气咋样？";

  const agent = createAgent({
    model: llm,
    // tools: [getWeather],
    responseFormat: WeatherFormat,
  });

  const res = await agent.invoke({
    messages: [
      new HumanMessage({
        content: prompt,
      }),
    ],
  });
  console.log(res);
};

invoke();
