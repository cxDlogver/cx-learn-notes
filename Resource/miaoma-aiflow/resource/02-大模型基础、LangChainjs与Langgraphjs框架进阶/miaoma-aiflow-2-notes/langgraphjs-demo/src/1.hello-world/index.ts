import { BaseMessage, HumanMessage } from "langchain";
import { agent } from "./agent";

const invoke = async (messages: BaseMessage[]) => {
  const res = await agent.invoke(messages);
  console.log(res);
};

invoke([new HumanMessage({ content: "Add 3 and 4" })]);
