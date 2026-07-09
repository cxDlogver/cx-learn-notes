import "dotenv/config";

import { ChatOpenAI } from "@langchain/openai";
import { createAgent } from "langchain";
import * as z from "zod";

import fs from "node:fs";
import path from "node:path";

const PersonInfo = z.object({
  dom: z.object().describe("描述 DOM 的 json"),
});

const llm = new ChatOpenAI({
  model: process.env.LLM_MODEL,
  apiKey: process.env.API_KEY,
  configuration: {
    baseURL: process.env.BASE_URL,
  },
});

const agent = createAgent({
  model: llm,
  responseFormat: PersonInfo,
});

const invoke = async () => {
  const res = await agent.invoke({
    // messages: [{ role: "user", content: "我是合一，我今年18岁" }],
    messages: [{ role: "user", content: [
          // {
          //   type: "text",
          //   text: "我是合一，年龄是25岁，性别是男",
          // },
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
            text: "帮我看看图片里面有什么，请使用中文描述，我现在想要基于这个图片开发 HTML，你给我一个符合 HTML DOM 格式", // 为了后面我们做 Figma AI 设计图转代码
          },
        ] }],

  });
  console.log("messages ====>", res.messages);
  console.log("structuredResponse ====>", res.structuredResponse);
};

invoke();
