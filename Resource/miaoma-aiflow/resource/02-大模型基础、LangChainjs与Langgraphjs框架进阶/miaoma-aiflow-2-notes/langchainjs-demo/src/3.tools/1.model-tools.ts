import { ChatOllama } from "@langchain/ollama";
import { tool } from "langchain";
import * as z from "zod";

const getWeather = tool(
  (input) => `根据地点${input.location}，北京的天气是晴`,
  {
    name: "get_weather",
    description: "用于获取指定地点的天气",
    schema: z.object({
      location: z.string().describe("指定的地点"),
    }),
  }
);

const invoke = async () => {
  const llm = new ChatOllama({
    model: "qwen3:0.6b", // 模型名称
    // model: "llama3.2:1b", // 模型名称
    temperature: 0.7, // 温度参数，控制生成文本的随机性
    streaming: true,
  });

  const modelWithTools = llm.bindTools([getWeather]);

  const prompt = "北京的天气怎么样？";

  const res = await modelWithTools.invoke(prompt);

  // 手动执行工具调用
  if (res.tool_calls) {
    for (const tc of res.tool_calls) {
      if (tc.name === getWeather.name) {
        const weather = await getWeather.invoke(tc);
        console.log("🚀 ~ invoke ~ weather:", weather);
      }
    }
  }
  console.log(res);
};

invoke();
