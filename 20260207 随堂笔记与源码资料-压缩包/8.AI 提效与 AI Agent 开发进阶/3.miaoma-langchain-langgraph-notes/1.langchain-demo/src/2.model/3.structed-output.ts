import "dotenv/config";

import { HumanMessage } from "langchain";
import * as z from "zod";

import { ChatOpenAI } from "@langchain/openai";
import fs from "node:fs";
import path from "node:path";

const llm = new ChatOpenAI({
  model: process.env.LLM_MODEL,
  apiKey: process.env.API_KEY,
  maxTokens: 1200,
  configuration: {
    baseURL: process.env.BASE_URL,
  },
});

const DomNode = z.object({
  tagName: z.string().describe("HTML 标签名，例如 div、img、h1、p"),
  attributes: z.record(z.any()).optional().describe("HTML 属性，例如 class、style、src"),
  text: z.string().optional().describe("文本节点内容"),
  children: z.array(z.any()).optional().describe("子节点列表"),
});

const Res = z.object({
  dom: DomNode.describe("DOM JSON 描述信息"),
});

// 结构输出
const modelWithStructure = llm.withStructuredOutput(Res, {
  method: "functionCalling",
});

const invoke = async () => {
  const res = await modelWithStructure.invoke([
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
        text: "请根据图片生成一个简洁的 HTML DOM JSON，只保留 logo 容器、图形占位、中文标题和英文标题。", // 为了后面我们做 Figma AI 设计图转代码
      },
    ]),
  ]);

  console.log("结构化输出:", res);
};

invoke();
