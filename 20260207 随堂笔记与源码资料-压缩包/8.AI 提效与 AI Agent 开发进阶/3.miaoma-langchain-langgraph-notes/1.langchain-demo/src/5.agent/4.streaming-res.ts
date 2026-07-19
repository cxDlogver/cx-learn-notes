import "dotenv/config";

import { ChatOpenAI } from "@langchain/openai";
import { createAgent } from "langchain";

const llm = new ChatOpenAI({
  model: process.env.LLM_MODEL,
  apiKey: process.env.API_KEY,
  configuration: {
    baseURL: process.env.BASE_URL,
  },
});

const agent = createAgent({
  model: llm,
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
    console.log(chunk);
    // const latestMessage = chunk.messages.at(-1);
    // if (latestMessage?.content) {
    //   console.log(`Agent: ${latestMessage.content}`);
    // } else if (latestMessage?.tool_calls) {
    //   const toolCallNames = latestMessage.tool_calls.map(
    //     (tc) => tc.name,
    //   );
    //   console.log(`Calling tools: ${toolCallNames.join(", ")}`);
    // }
  }
};

invoke();
