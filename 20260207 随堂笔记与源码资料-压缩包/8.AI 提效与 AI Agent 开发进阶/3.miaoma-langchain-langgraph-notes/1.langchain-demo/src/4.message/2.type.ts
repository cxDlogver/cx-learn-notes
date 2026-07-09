import "dotenv/config";

import { SystemMessage, HumanMessage } from "langchain";
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

const systemMsg = new SystemMessage(
  "你是一个翻译官，接下来帮我将用户的英文翻译成中文",
);
const humanMsg = new HumanMessage({
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
      text: "Hello, how are you? describe image",
    },
  ],
});

const conversations = [systemMsg, humanMsg];

const invoke = async () => {
  const res = await llm.invoke(conversations);
  console.log("🚀 ~ invoke ~ res:", res);
};

invoke();
