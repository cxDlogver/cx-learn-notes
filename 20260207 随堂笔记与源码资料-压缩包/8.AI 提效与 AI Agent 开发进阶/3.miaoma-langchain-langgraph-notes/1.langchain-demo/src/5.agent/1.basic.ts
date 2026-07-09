import "dotenv/config";

// 基于 langchain ReAct 模式智能体
import { createAgent } from "langchain";

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
  const agent = createAgent({
    model: llm,
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
          },
        ],
      },
    ],
  });
  console.log("🚀 ~ invoke ~ res:", res);
};

invoke();
