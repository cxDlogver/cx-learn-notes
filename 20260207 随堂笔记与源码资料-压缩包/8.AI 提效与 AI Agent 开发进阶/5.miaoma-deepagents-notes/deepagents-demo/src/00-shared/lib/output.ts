export function printTitle(title: string): void {
  console.log(`\n=== ${title} ===`);
}

export function messageText(message: unknown): string {
  const content = (message as { content?: unknown; text?: unknown })?.content;
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .map((block) => {
        if (typeof block === "string") return block;
        if (block && typeof block === "object" && "text" in block) {
          return String((block as { text: unknown }).text);
        }
        return JSON.stringify(block);
      })
      .join("");
  }
  const text = (message as { text?: unknown })?.text;
  return typeof text === "string" ? text : JSON.stringify(message);
}

export function lastMessageText(result: unknown): string {
  const messages = (result as { messages?: unknown[] })?.messages ?? [];
  const last = messages.at(-1);
  return last ? messageText(last) : JSON.stringify(result, null, 2);
}

export function printFinal(result: unknown): void {
  printTitle("最终输出");
  console.log(lastMessageText(result));
}

export function printObject(label: string, value: unknown): void {
  printTitle(label);
  console.log(JSON.stringify(value, null, 2));
}
