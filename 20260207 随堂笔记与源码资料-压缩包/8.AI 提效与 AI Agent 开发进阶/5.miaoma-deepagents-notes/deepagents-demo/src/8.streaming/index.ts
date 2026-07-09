import { createDeepAgent, type SubAgent } from "deepagents";

import { ensureProviderEnv, getModel } from "../00-shared/lib/env";
import { printTitle } from "../00-shared/lib/output";
import { searchKnowledgeBase } from "../00-shared/tools/domain-tools";

type StreamingMessageLike = {
  text?: AsyncIterable<string> | PromiseLike<string> | string;
};

type StreamingToolCallLike = {
  name: string;
  callId?: string;
  input?: unknown;
  output?: PromiseLike<unknown>;
  status?: PromiseLike<string>;
  error?: PromiseLike<string | undefined>;
};

type StreamingSubagentLike = {
  name: string;
  taskInput?: PromiseLike<string>;
  output?: PromiseLike<unknown>;
  messages?: AsyncIterable<unknown>;
  toolCalls?: AsyncIterable<unknown>;
  subagents?: AsyncIterable<unknown>;
};

async function consumeMessage(prefix: string, message: StreamingMessageLike) {
  const text =
    typeof message.text === "string"
      ? message.text
      : isAsyncIterable(message.text)
        ? await collectAsyncText(message.text)
        : await message.text;
  if (text) process.stdout.write(`${prefix}${text}\n`);
}

function isAsyncIterable(value: unknown): value is AsyncIterable<string> {
  return Boolean(value && typeof value === "object" && Symbol.asyncIterator in value);
}

async function collectAsyncText(chunks: AsyncIterable<string>): Promise<string> {
  let text = "";
  for await (const chunk of chunks) text += chunk;
  return text;
}

function formatValue(value: unknown): string {
  const normalized = normalizeLogValue(value);
  const text = typeof normalized === "string" ? normalized : JSON.stringify(normalized, null, 2);
  if (!text) return "";
  return text.length > 1_500 ? `${text.slice(0, 1_500)}...<truncated>` : text;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function normalizeLogValue(value: unknown): unknown {
  if (!isRecord(value)) return value;

  const toJSON = value.toJSON;
  if (typeof toJSON === "function") {
    const serialized = toJSON.call(value) as unknown;
    if (serialized !== value) return normalizeLogValue(serialized);
  }

  const kwargs = value.kwargs;
  if (isRecord(kwargs) && "content" in kwargs) {
    return {
      name: kwargs.name,
      status: kwargs.status,
      content: kwargs.content,
    };
  }

  const messages = value.messages;
  if (Array.isArray(messages)) {
    const last = messages.at(-1);
    return {
      messageCount: messages.length,
      finalMessage: normalizeLogValue(last),
      todos: value.todos,
      filePaths: isRecord(value.files) ? Object.keys(value.files) : undefined,
    };
  }

  return value;
}

async function consumeToolCall(prefix: string, toolCall: StreamingToolCallLike): Promise<void> {
  const id = toolCall.callId ? `#${toolCall.callId}` : "";
  console.log(`${prefix}[tool start] ${toolCall.name}${id}`);
  console.log(`${prefix}[tool input] ${formatValue(toolCall.input)}`);

  const [status, output, error] = await Promise.all([
    toolCall.status ?? Promise.resolve("unknown"),
    toolCall.output
      ? Promise.resolve(toolCall.output).catch((caught: unknown) => ({ error: String(caught) }))
      : Promise.resolve(undefined),
    toolCall.error ?? Promise.resolve(undefined),
  ]);

  console.log(`${prefix}[tool status] ${toolCall.name} -> ${status}`);
  if (error) console.log(`${prefix}[tool error] ${error}`);
  if (output !== undefined) console.log(`${prefix}[tool output] ${formatValue(output)}`);
}

function watchSubagent(subagent: StreamingSubagentLike, depth = 0): Promise<void> {
  const prefix = `${"  ".repeat(depth)}[subagent:${subagent.name}] `;
  return (async () => {
    console.log(`${prefix}started`);
    if (subagent.taskInput) {
      console.log(`${prefix}task input: ${formatValue(await subagent.taskInput)}`);
    }

    const nestedWatchers: Array<Promise<void>> = [];
    await Promise.all([
      (async () => {
        if (!subagent.messages) return;
        for await (const message of subagent.messages) {
          await consumeMessage(`${prefix}[message] `, message as StreamingMessageLike);
        }
      })(),
      (async () => {
        if (!subagent.toolCalls) return;
        for await (const toolCall of subagent.toolCalls) {
          await consumeToolCall(prefix, toolCall as StreamingToolCallLike);
        }
      })(),
      (async () => {
        if (!subagent.subagents) return;
        for await (const nested of subagent.subagents) {
          nestedWatchers.push(watchSubagent(nested as StreamingSubagentLike, depth + 1));
        }
      })(),
    ]);

    await Promise.all(nestedWatchers);
    if (subagent.output) {
      console.log(`${prefix}output: ${formatValue(await subagent.output)}`);
    }
    console.log(`${prefix}completed`);
  })();
}

export async function runStreamingDemo(): Promise<void> {
  ensureProviderEnv();
  printTitle("streaming：主代理、子代理和工具调用实时输出");

  const researcher: SubAgent = {
    name: "stream-researcher",
    description: "负责检索 DeepAgents streaming 主题并输出短摘要。",
    systemPrompt: "你是 streaming 研究子代理。输出不超过 5 条 bullet。",
    tools: [searchKnowledgeBase],
  };

  const agent = createDeepAgent({
    model: getModel(),
    tools: [searchKnowledgeBase],
    subagents: [researcher],
    systemPrompt: [
      "你是 DeepAgents streaming 讲师。",
      "必须把资料检索委派给 stream-researcher。",
      "最终用 3 条 bullet 总结 UI 应如何消费事件。",
    ].join("\n"),
  });

  const stream = await agent.streamEvents(
    {
      messages: [
        {
          role: "user",
          content: "请讲解 DeepAgents event streaming 与 subagent streaming 的 UI 映射方式。",
        },
      ],
    },
    { version: "v3" },
  );

  const subagentWatchers: Array<Promise<void>> = [];

  await Promise.all([
    (async () => {
      for await (const message of stream.messages) {
        await consumeMessage("[coordinator] ", message as unknown as StreamingMessageLike);
      }
    })(),
    (async () => {
      for await (const toolCall of stream.toolCalls) {
        await consumeToolCall("[coordinator] ", toolCall as StreamingToolCallLike);
      }
    })(),
    (async () => {
      for await (const subagent of stream.subagents) {
        subagentWatchers.push(watchSubagent(subagent as StreamingSubagentLike));
      }
    })(),
  ]);

  await Promise.all(subagentWatchers);
}

await runStreamingDemo();
