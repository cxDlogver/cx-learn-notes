import "dotenv/config";

import { tool } from "langchain";
import * as z from "zod";

import { ChatOpenAI } from "@langchain/openai";

const llm = new ChatOpenAI({
  model: process.env.LLM_MODEL,
  apiKey: process.env.API_KEY,
  configuration: {
    baseURL: process.env.BASE_URL,
  },
});

// 用户想查天气预报，我么那就需要有一个天气预报的工具让智能体用
const getWeather = tool((input) => `${input.location}天气很好，是晴天`, {
  name: "get_weather",
  description: "获取给定地点的天气",
  schema: z.object({
    location: z.string().describe("要获取天气的地点"),
  }),
});

// 用户检索邮件
const getEmail = tool(
  async (input) => {
    // 这里可以调用外部接口
    // 异步操作
    return `${input.from} 发来了邮件`;
  },
  {
    name: "get_email",
    description: "获取给定用户的邮件",
    schema: z.object({
      from: z.string().describe("哪个用户的邮件"),
    }),
  },
);

const tools = [getWeather, getEmail];

const modelWithTools = llm.bindTools(tools);

const invoke = async () => {
  const res = await modelWithTools.invoke(
    "北京明天天气怎么样？并且帮我看看合一发来的邮件",
  );

  console.log(res);

  // 如果不用 agent，我们需要解析 tool_call 字段，调用对应的函数
  if (res.tool_calls) {
    for (const tc of res.tool_calls) {
      // if (tc.name === getWeather.name) {
      //   const weather = await getWeather.invoke(tc);
      //   console.log("🚀 ~ invoke ~ weather:", weather);
      // }
      const tool_fn = tools.find((t) => t.name === tc.name);

      if (tool_fn) {
        const tool_res = await tool_fn.invoke(tc);
        console.log("🚀 ~ invoke ~ tool_res:", tool_res);
      }
    }
  }

  console.log(res);
};

invoke();
