import type { BaseMessage } from "@langchain/core/messages";

function contentToText(content: BaseMessage["content"]): string {
  return typeof content === "string" ? content : JSON.stringify(content, null, 2);
}

export function printLastMessage(result: { messages?: BaseMessage[] }): void {
  const message = result.messages?.at(-1);
  if (!message) {
    console.log(JSON.stringify(result, null, 2));
    return;
  }
  console.log(contentToText(message.content));
}
