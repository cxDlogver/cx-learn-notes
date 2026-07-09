import "dotenv/config";

import { HumanMessage } from "langchain";
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

const Res = z.object({
  dom: z.object().describe("dom json 描述信息"),
});

// 结构输出
// const modelWithStrcture = llm.withStructuredOutput(Res, {
//   method: "functionCalling",
//   includeRaw: true,
// });

const invoke = async () => {
  const res = await llm.invoke([
    new HumanMessage([
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
        text: "帮我看看图片里面有什么，请使用中文描述，我现在想要基于这个图片开发 HTML，你给我一个符合 HTML DOM 格式的 JSON", // 为了后面我们做 Figma AI 设计图转代码
      },
    ]),
  ]);

  const rawContent = res.content as string;
  // 尝试匹配最后一个 JSON 对象
  const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    try {
      const jsonStr = jsonMatch[0];
      // 因为模型输出的是嵌套在 "arguments" 里的，可能还需要进一步提取
      const parsed = JSON.parse(jsonStr);
      console.log("手动解析尝试:", parsed.arguments || parsed);
    } catch (e) {
      console.error("手动解析失败", e);
    }
  }

  console.log(res);
};

invoke();
