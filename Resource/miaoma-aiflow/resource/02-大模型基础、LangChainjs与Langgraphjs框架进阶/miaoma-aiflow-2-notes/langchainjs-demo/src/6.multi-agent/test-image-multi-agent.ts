import { ChatOllama } from "@langchain/ollama";
import { createAgent } from "langchain";
import { tool } from "langchain";
import * as z from "zod";
import fs from "node:fs";
import path from "node:path";

const imageAgent = createAgent({
  model: new ChatOllama({
    model: "qwen3-vl:2b",
  }),
});

const imageDescription = tool(
  async (input) => {
    console.log("🚀 ~ input:", input);
    const res = await imageAgent.invoke({
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
                        "../../public/prompt.png"
                      )
                    )
                    .toString("base64"),
              },
            },
            {
              type: "text",
              text: "帮我看看图片里面有什么，请使用中文描述",
            },
          ],
        },
      ],
    });
    console.log("🚀 ~ res:", res);
    return res.messages[-1]?.text;
  },
  {
    name: "image_description",
    description: "获取给定图片的描述",
    schema: z.object({
      image_url: z.string().describe("要获取描述的图片的URL"),
    }),
  }
);

const agent = createAgent({
  model: new ChatOllama({
    model: "qwen3:0.6b",
    temperature: 0,
  }),
  tools: [imageDescription],
});

const invoke = async () => {
  const res = await agent.invoke({
    messages: [
      {
        role: "system",
        content:
          "你是一个图片描述助手，当用户传入一个图片地址时，你需要调用 image_description 工具来获取图片的描述",
      },
      {
        role: "user",
        content: [
          {
            type: "text",
            text: `你好啊，哥们儿，帮我看看这张图片里面有什么东西，图片地址是 https://example.com/image.jpg`,
          },
        ],
      },
    ],
  });
  console.log("主智能体====>", res);
};

invoke();
