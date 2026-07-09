import "dotenv/config";

import { ChatOpenAI } from "@langchain/openai";
import { createAgent, ToolCall } from "langchain";
import * as z from "zod";

const PersonInfo = z.object({
  name: z.string().describe("人物姓名"),
  age: z.number().describe("人物年龄"),
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
  const res = await agent.stream(
    {
      messages: [{ role: "user", content: "我是合一，我今年18岁" }],
    },
    {
      streamMode: "values",
    },
  );
  for await (const chunk of res) {
    // Each chunk contains the full state at that point
    console.log(chunk)
    // const latestMessage = chunk.messages.at(-1);
    // if (latestMessage?.content) {
    //   console.log(`Agent: ${latestMessage.content}`);
    // } else if (latestMessage?.tool_calls) {
    //   const toolCallNames = latestMessage.tool_calls.map(
    //     (tc: ToolCall) => tc.name,
    //   );
    //   console.log(`Calling tools: ${toolCallNames.join(", ")}`);
    // }
  }
};

invoke();
