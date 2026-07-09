import "dotenv/config";

import { HumanMessage } from "langchain";

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

const invoke = async () => {
  const res = await llm.invoke([
    new HumanMessage([
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
        text: "帮我看看图片里面有什么，请使用中文描述，我现在想要基于这个图片开发 HTML，你给我一个符合 HTML DOM 格式的 JSON", // 为了后面我们做 Figma AI 设计图转代码
      },
    ]),
  ]);

  console.log(res.content);
};

invoke();
