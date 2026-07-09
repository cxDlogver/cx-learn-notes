import "dotenv/config";

import { BaseMessage, HumanMessage } from "langchain";
import { agent } from "./agent";

// streaming
const invoke = async () => {
  for await (const [mode, chunk] of await agent.stream(
    [new HumanMessage("Add 3 and 4.")],
    {
      streamMode: ["updates", "custom"],
    },
  )) {
    const call = Object.values<BaseMessage>(chunk).map((value) => value);
    const firstCall = call[0];
    if (firstCall?.type) {
      console.log(`[${mode}-${firstCall?.type}]: ${firstCall?.content}\n`);
    }
  }
};

invoke();
