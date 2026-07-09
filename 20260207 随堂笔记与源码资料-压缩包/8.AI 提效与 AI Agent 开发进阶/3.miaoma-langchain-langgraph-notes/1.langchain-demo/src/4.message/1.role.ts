import "dotenv/config";

import { tool } from "langchain";
import * as z from "zod";
// 角色
import { HumanMessage, SystemMessage, ToolMessage, AIMessage } from "langchain";

import { ChatOpenAI } from "@langchain/openai";

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

// 人写的输入、系统提示词、工具调用之后消息、模型调用返回

const systemMsg = new SystemMessage("你是一个翻译官，将用户的英文翻译为中文");

const humanMsg = new HumanMessage("Hello, my name is heyi, get heyi email");

const modelWithTools = llm.bindTools([getEmail]);

const invoke = async () => {
  const res = await modelWithTools.invoke([systemMsg, humanMsg]);
  console.log("🚀 ~ invoke ~ res:", res);

  if (res.tool_calls) {
    for (const tc of res.tool_calls) {
      if (tc.name === getEmail.name) {
        const weather = await getEmail.invoke(tc);
        console.log("🚀 ~ invoke ~ email:", weather);
      }
    }
  }
};

invoke();
