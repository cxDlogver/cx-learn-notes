import { LLM, type Message } from "./llm.js";
import { defaultTools, type Tool } from "./tool.js";

export const REACT_SYSTEM_PROMPT = `
你是一个最小 ReAct 智能体。

你必须严格使用以下格式：

如果需要工具：
思考：说明你为什么需要工具
行动：工具名称({"参数名":"参数值"})

当你得到观察结果后，如果可以回答：
思考：我已经得到足够信息
Final Answer: 最终答案

可用工具：
{tools}

规则：
1. 每次最多调用一个工具
2. 当你输出行动后，必须立刻停止，等待观察结果
3. 不要自己编写“观察：...”，观察只能由程序返回
4. 行动参数必须是合法 JSON
5. 不要编造工具结果
6. 最终回答必须以 Final Answer: 开头
`;

export interface ToolCall {
  name: string;
  args: Record<string, unknown>;
}

export interface ReactAgentLLM {
  invoke(messages: Message[]): Promise<Message>;
}

export interface ReactAgentLogger {
  log(...args: unknown[]): void;
}

export interface ReactAgentOptions {
  llm?: ReactAgentLLM;
  logger?: ReactAgentLogger;
}

export function generateToolsDescription(tools: Tool[]): string {
  return tools
    .map((tool) => {
      return `- ${tool.name}: ${tool.description}\n  参数示例: ${tool.example}`;
    })
    .join("\n");
}

export function createSystemPrompt(tools: Tool[]): string {
  return REACT_SYSTEM_PROMPT.replace(
    "{tools}",
    generateToolsDescription(tools)
  );
}

export function parseToolCall(content: string): ToolCall | null {
  const actionLine = content
    .split(/\r?\n/)
    .find((line) => /^行动[:：]/.test(line.trim()));

  if (!actionLine) {
    return null;
  }

  const nameMatch = actionLine.match(/行动[:：]\s*([a-zA-Z_][\w-]*)\s*\(/);

  if (!nameMatch) {
    throw new Error("行动格式错误，应为：行动：工具名({...})");
  }

  const name = nameMatch[1];
  const openIndex = actionLine.indexOf("(", nameMatch.index);
  const closeIndex = actionLine.lastIndexOf(")");

  if (openIndex < 0 || closeIndex <= openIndex) {
    throw new Error("行动参数格式错误，缺少括号");
  }

  const rawArgs = actionLine.slice(openIndex + 1, closeIndex).trim();

  try {
    return {
      name,
      args: JSON.parse(rawArgs)
    };
  } catch {
    throw new Error(`行动参数不是合法 JSON：${rawArgs}`);
  }
}

export async function reactAgent(
  input: string,
  tools: Tool[] = defaultTools,
  maxIterations = 5,
  options: ReactAgentOptions = {}
): Promise<string> {
  const llm = options.llm ?? new LLM();
  const logger = options.logger ?? console;
  const systemPrompt = createSystemPrompt(tools);

  const messages: Message[] = [
    { role: "system", content: systemPrompt },
    { role: "user", content: input }
  ];

  for (let i = 0; i < maxIterations; i++) {
    logger.log(`\n--- 第 ${i + 1} 轮 Reason ---`);

    const response = await llm.invoke(messages);
    logger.log(response.content);
    messages.push(response);

    let toolCall: ToolCall | null = null;

    try {
      toolCall = parseToolCall(response.content);
    } catch (error) {
      messages.push({
        role: "user",
        content: `观察：行动解析失败，${(error as Error).message}，请重新按格式输出。`
      });
      continue;
    }

    if (toolCall) {
      const tool = tools.find((item) => item.name === toolCall.name);

      if (!tool) {
        messages.push({
          role: "user",
          content: `观察：未知工具 ${toolCall.name}`
        });
        continue;
      }

      const validation = tool.parameters.safeParse(toolCall.args);

      if (!validation.success) {
        messages.push({
          role: "user",
          content: `观察：参数错误，${validation.error.message}`
        });
        continue;
      }

      logger.log(`\n--- Act: ${toolCall.name} ---`);
      logger.log(toolCall.args);

      const toolResult = await tool.execute(validation.data);

      logger.log(`\n--- Observe ---`);
      logger.log(toolResult);

      messages.push({
        role: "user",
        content: `观察：${toolResult}`
      });
      continue;
    }

    if (response.content.includes("Final Answer:")) {
      return response.content.split("Final Answer:")[1].trim();
    }

    if (!toolCall) {
      messages.push({
        role: "user",
        content: "观察：你没有输出行动，也没有输出 Final Answer，请继续按 ReAct 格式输出。"
      });
      continue;
    }
  }

  return "达到最大推理轮数，Agent 已安全停止。";
}
