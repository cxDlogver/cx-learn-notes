import "dotenv/config";

// 基于 langchain ReAct 模式智能体
import { createAgent, tool } from "langchain";
import * as z from "zod";

import { ChatOpenAI } from "@langchain/openai";

import fs from "node:fs";
import path from "node:path";

const llm = new ChatOpenAI({
  model: process.env.LLM_MODEL,
  apiKey: process.env.API_KEY,
  configuration: {
    baseURL: process.env.BASE_URL,
  },
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

// const modelWithTools = llm.bindTools([getWeather]);

const invoke = async () => {
  const agent = createAgent({
    model: llm,
    tools: [getEmail] // 丰富工具就是完善智能体
  });

  const res = await agent.invoke({
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image_url",
            image_url: {
              url:
                "data:image/jpeg;base64," +
                fs
                  .readFileSync(
                    path.resolve(
                      import.meta.dirname,
                      "../../public/miaoma-logo.png",
                    ),
                  )
                  .toString("base64"),
            },
          },
          {
            type: "text",
            text: "Hello, how are you? describe image,get heyi email",
          }
        ],
      },
    ],
  });
  console.log("🚀 ~ invoke ~ res:", res);
};

invoke();
