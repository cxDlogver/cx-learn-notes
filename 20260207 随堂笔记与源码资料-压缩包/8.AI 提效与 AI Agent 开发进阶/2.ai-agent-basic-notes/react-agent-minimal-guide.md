# 最小 ReAct Agent 实现指导手册

本文档指导你从 0 开始实现一个最小可运行的 ReAct Agent。你需要自己按步骤创建项目和代码；本文只提供实现手册、配置说明、代码片段和每一步在 ReAct Agent 中的作用。

目标不是一次性做出复杂 Agent，而是把 Agent 的核心框架跑通：

- 模型：负责推理和决策
- 工具：负责执行外部能力
- 状态：用消息历史保存上下文
- 循环：Reason -> Act -> Observe -> Reason
- 终止：模型输出最终答案，或达到最大轮数

模型 API 使用阿里云百炼 OpenAI 兼容接口。

## 0. 最终目录位置

在已有 `agent` 示例项目的同级目录下，新建独立项目：

```bash
cx-learn-notes/20260207 随堂笔记与源码资料-压缩包/8.AI 提效与 AI Agent 开发进阶/2.ai-agent-basic-notes/react-agent-minimal
```

最终建议目录结构：

```text
react-agent-minimal/
  package.json
  tsconfig.json
  .env
  src/
    llm.ts
    tool.ts
    agent.ts
    main.ts
    cli.ts
```

## 1. 新建独立项目

### 你要做什么

进入 `2.ai-agent-basic-notes` 目录，然后创建新项目：

```bash
mkdir react-agent-minimal
cd react-agent-minimal

pnpm init
pnpm add zod dotenv
pnpm add -D typescript tsx @types/node

mkdir src
```

### 配置 `package.json`

在 `package.json` 中配置脚本：

```json
{
  "scripts": {
    "dev": "tsx src/main.ts",
    "cli": "tsx src/cli.ts",
    "typecheck": "tsc --noEmit",
    "build": "tsc",
    "start": "node dist/main.js"
  }
}
```

如果你的 `package.json` 已经有其他字段，只需要把 `scripts` 合并进去。

### 创建 `tsconfig.json`

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "CommonJS",
    "moduleResolution": "Node",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "types": ["node"],
    "outDir": "dist"
  },
  "include": ["src"]
}
```

### 这一步在 ReAct Agent 中的作用

这一步还不是 Agent 逻辑。它的作用是准备运行环境，为后面的模型调用、工具系统和推理循环提供基础工程结构。

可以理解为：

```text
工程环境 = Agent 的容器
```

## 2. 配置阿里云百炼 API

### 你要做什么

在项目根目录创建 `.env`：

```bash
DASHSCOPE_API_KEY=你的百炼APIKey
DASHSCOPE_BASE_URL=https://{WorkspaceId}.cn-beijing.maas.aliyuncs.com/compatible-mode/v1
DASHSCOPE_MODEL=qwen-plus
```

说明：

- `DASHSCOPE_API_KEY`：阿里云百炼 API Key。
- `DASHSCOPE_BASE_URL`：百炼 OpenAI 兼容接口地址。
- `DASHSCOPE_MODEL`：模型名称，教学版本建议先用 `qwen-plus`。

阿里云百炼 OpenAI 兼容接口形态：

```text
POST {DASHSCOPE_BASE_URL}/chat/completions
```

请求头：

```text
Authorization: Bearer ${DASHSCOPE_API_KEY}
Content-Type: application/json
```

请求体核心字段：

```json
{
  "model": "qwen-plus",
  "messages": []
}
```

官方参考文档：

```text
https://help.aliyun.com/zh/model-studio/compatibility-of-openai-with-dashscope
```

### 这一步在 ReAct Agent 中的作用

模型是 ReAct Agent 的 Reason 来源。

在每一轮循环里，Agent 都会把当前状态发送给模型，让模型判断：

- 是否已经可以回答？
- 是否需要调用工具？
- 如果需要工具，应该调用哪个工具？
- 工具参数是什么？

可以理解为：

```text
百炼模型 API = Agent 的推理引擎
```

## 3. 实现模型调用层 `src/llm.ts`

### 你要做什么

创建 `src/llm.ts`。

这一层只负责一件事：把消息数组发送给模型，然后取回模型回复。

不要在这里写工具逻辑。
不要在这里写 ReAct 循环。
不要在这里解析 `行动：...`。

### 参考代码

```ts
import "dotenv/config";

export type MessageRole = "system" | "user" | "assistant";

export interface Message {
  role: MessageRole;
  content: string;
}

interface BailianResponse {
  choices?: Array<{
    message?: {
      role?: string;
      content?: string;
    };
  }>;
}

export class LLM {
  private apiKey = process.env.DASHSCOPE_API_KEY;
  private baseUrl = process.env.DASHSCOPE_BASE_URL;
  private model = process.env.DASHSCOPE_MODEL || "qwen-plus";

  async invoke(messages: Message[]): Promise<Message> {
    if (!this.apiKey) {
      throw new Error("缺少 DASHSCOPE_API_KEY");
    }

    if (!this.baseUrl) {
      throw new Error("缺少 DASHSCOPE_BASE_URL");
    }

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`
      },
      body: JSON.stringify({
        model: this.model,
        messages,
        temperature: 0.2
      })
    });

    if (!response.ok) {
      const detail = await response.text();
      throw new Error(`模型调用失败：${response.status} ${detail}`);
    }

    const data = (await response.json()) as BailianResponse;
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error(`模型响应为空：${JSON.stringify(data)}`);
    }

    return {
      role: "assistant",
      content
    };
  }
}
```

### 这一步在 ReAct Agent 中的作用

`LLM.invoke()` 对应 ReAct 中的 Reason。

它接收当前 Agent 状态：

```ts
messages
```

然后返回模型的下一步判断：

```text
思考：...
行动：...
```

或者：

```text
Final Answer: ...
```

可以理解为：

```text
src/llm.ts = Reason 层
```

## 4. 实现工具系统 `src/tool.ts`

### 你要做什么

创建 `src/tool.ts`。

工具系统让 Agent 具备外部能力。没有工具时，模型只能生成文本；有工具时，模型可以决定让程序执行某个动作。

先实现两个最小工具：

- `calculator`：执行数学计算
- `get_weather`：返回模拟天气

### 工具接口设计

每个工具包含四个核心部分：

```ts
export interface Tool {
  name: string;
  description: string;
  parameters: z.ZodTypeAny;
  example: string;
  execute(args: unknown): Promise<string>;
}
```

字段说明：

- `name`：工具名，模型通过它选择工具。
- `description`：工具说明，影响模型是否会正确调用。
- `parameters`：参数结构，用 `zod` 做运行时校验。
- `example`：参数示例，会放进提示词，帮助模型按格式输出。
- `execute`：真正执行工具逻辑。

### 参考代码

```ts
import { z } from "zod";

export interface Tool {
  name: string;
  description: string;
  parameters: z.ZodTypeAny;
  example: string;
  execute(args: unknown): Promise<string>;
}

const calculatorSchema = z.object({
  expression: z.string().describe("数学表达式，例如：(3 + 5) * 12")
});

export const calculatorTool: Tool = {
  name: "calculator",
  description: "执行数学计算，支持数字、括号、加减乘除",
  parameters: calculatorSchema,
  example: `{"expression":"(3 + 5) * 12"}`,
  async execute(args) {
    const { expression } = calculatorSchema.parse(args);

    if (!/^[0-9+\-*/().\s]+$/.test(expression)) {
      return "计算错误：表达式只能包含数字、括号和 + - * /";
    }

    try {
      const result = Function(`"use strict"; return (${expression})`)();
      return String(result);
    } catch (error) {
      return `计算错误：${(error as Error).message}`;
    }
  }
};

const weatherSchema = z.object({
  city: z.string().describe("城市名称，例如：北京、上海、广州")
});

export const weatherTool: Tool = {
  name: "get_weather",
  description: "查询指定城市的模拟天气",
  parameters: weatherSchema,
  example: `{"city":"北京"}`,
  async execute(args) {
    const { city } = weatherSchema.parse(args);

    const data: Record<string, string> = {
      北京: "晴天，25度，微风",
      上海: "多云，28度，东南风3级",
      广州: "小雨，22度，东北风2级"
    };

    return data[city] || `暂无${city}的天气信息`;
  }
};

export const defaultTools = [calculatorTool, weatherTool];
```

### 这一步在 ReAct Agent 中的作用

工具系统对应 ReAct 中的 Act。

模型不会直接执行代码。模型只会输出：

```text
行动：calculator({"expression":"(3 + 5) * 12"})
```

程序解析这段文本后，找到 `calculatorTool`，再调用：

```ts
tool.execute(args)
```

可以理解为：

```text
src/tool.ts = Act 层
```

## 5. 设计 ReAct 系统提示词

### 你要做什么

在 `src/agent.ts` 中定义系统提示词。

提示词的目标是约束模型输出固定格式。否则模型可能会自由发挥，程序就很难解析它到底想调用哪个工具。

### 推荐提示词

```ts
const REACT_SYSTEM_PROMPT = `
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
1. 行动参数必须是合法 JSON
2. 不要编造工具结果
3. 最终回答必须以 Final Answer: 开头
`;
```

### 这一步在 ReAct Agent 中的作用

提示词是 Reason 和 Act 之间的协议。

它告诉模型：

- 思考要写在 `思考：` 后面。
- 要调用工具时必须写 `行动：工具名(JSON参数)`。
- 最终回答必须写 `Final Answer:`。

可以理解为：

```text
系统提示词 = Agent 与模型之间的通信协议
```

## 6. 实现工具描述生成器

### 你要做什么

在 `src/agent.ts` 中实现 `generateToolsDescription`。

它的作用是把当前可用工具写进系统提示词，让模型知道自己能调用什么。

### 参考代码

```ts
import { Tool } from "./tool";

function generateToolsDescription(tools: Tool[]): string {
  return tools
    .map((tool) => {
      return `- ${tool.name}: ${tool.description}\n  参数示例: ${tool.example}`;
    })
    .join("\n");
}
```

系统提示词使用时：

```ts
const systemPrompt = REACT_SYSTEM_PROMPT.replace(
  "{tools}",
  generateToolsDescription(tools)
);
```

### 这一步在 ReAct Agent 中的作用

这一步帮助模型完成工具选择。

模型只有看到工具名称、描述和参数示例，才知道应该输出：

```text
行动：calculator({"expression":"1 + 1"})
```

而不是输出不存在的工具。

可以理解为：

```text
工具描述 = 模型的工具说明书
```

## 7. 实现工具调用解析器

### 你要做什么

在 `src/agent.ts` 中实现 `parseToolCall`。

它负责把模型输出的文本行动，转换成程序可执行的数据结构。

### 参考代码

```ts
interface ToolCall {
  name: string;
  args: Record<string, unknown>;
}

function parseToolCall(content: string): ToolCall | null {
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
```

### 这一步在 ReAct Agent 中的作用

这是 Reason 到 Act 的桥梁。

模型输出的是文本：

```text
行动：get_weather({"city":"北京"})
```

程序需要把它解析成结构化数据：

```ts
{
  name: "get_weather",
  args: {
    city: "北京"
  }
}
```

可以理解为：

```text
parseToolCall = 把模型意图变成程序动作
```

## 8. 实现 ReAct 主循环 `src/agent.ts`

### 你要做什么

在 `src/agent.ts` 中实现 `reactAgent`。

这是整个项目最核心的部分。

完整流程是：

1. 用户输入进入 `messages`。
2. 调用 `LLM.invoke(messages)`。
3. 保存模型回复。
4. 如果模型输出 `Final Answer:`，结束。
5. 否则解析 `行动：工具名(JSON参数)`。
6. 查找工具。
7. 校验参数。
8. 执行工具。
9. 把 `观察：工具结果` 追加进 `messages`。
10. 进入下一轮。

### 参考代码

```ts
import { LLM, Message } from "./llm";
import { defaultTools, Tool } from "./tool";

const REACT_SYSTEM_PROMPT = `
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
2. 行动参数必须是合法 JSON
3. 不要编造工具结果
4. 最终回答必须以 Final Answer: 开头
`;

interface ToolCall {
  name: string;
  args: Record<string, unknown>;
}

function generateToolsDescription(tools: Tool[]): string {
  return tools
    .map((tool) => {
      return `- ${tool.name}: ${tool.description}\n  参数示例: ${tool.example}`;
    })
    .join("\n");
}

function parseToolCall(content: string): ToolCall | null {
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
  maxIterations = 5
): Promise<string> {
  const llm = new LLM();
  const systemPrompt = REACT_SYSTEM_PROMPT.replace(
    "{tools}",
    generateToolsDescription(tools)
  );

  const messages: Message[] = [
    { role: "system", content: systemPrompt },
    { role: "user", content: input }
  ];

  for (let i = 0; i < maxIterations; i++) {
    console.log(`\n--- 第 ${i + 1} 轮 Reason ---`);

    const response = await llm.invoke(messages);
    console.log(response.content);
    messages.push(response);

    if (response.content.includes("Final Answer:")) {
      return response.content.split("Final Answer:")[1].trim();
    }

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

    if (!toolCall) {
      messages.push({
        role: "user",
        content: "观察：你没有输出行动，也没有输出 Final Answer，请继续按 ReAct 格式输出。"
      });
      continue;
    }

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

    console.log(`\n--- Act: ${toolCall.name} ---`);
    console.log(toolCall.args);

    const toolResult = await tool.execute(validation.data);

    console.log(`\n--- Observe ---`);
    console.log(toolResult);

    messages.push({
      role: "user",
      content: `观察：${toolResult}`
    });
  }

  return "达到最大推理轮数，Agent 已安全停止。";
}
```

### 这一步在 ReAct Agent 中的作用

这是 Agent 的核心框架。

代码与 ReAct 概念的对应关系：

| 代码 | ReAct 作用 |
| --- | --- |
| `messages` | State，保存 Agent 当前状态 |
| `llm.invoke(messages)` | Reason，让模型思考 |
| `parseToolCall(response.content)` | 解析模型行动意图 |
| `tool.parameters.safeParse(...)` | 行动参数校验 |
| `tool.execute(...)` | Act，执行工具 |
| `观察：${toolResult}` | Observe，把环境反馈给模型 |
| `Final Answer:` | Stop，终止条件 |
| `maxIterations` | Safety，防止无限循环 |

可以理解为：

```text
src/agent.ts = Agent 的大脑和调度器
```

## 9. 实现固定测试入口 `src/main.ts`

### 你要做什么

创建 `src/main.ts`。

先不要急着做命令行交互。先用固定问题验证核心 ReAct 循环是否能跑通。

### 参考代码

```ts
import { reactAgent } from "./agent";

async function main() {
  const questions = [
    "你好，介绍一下你自己",
    "计算 (3 + 5) * 12 等于多少",
    "北京今天天气怎么样"
  ];

  for (const question of questions) {
    console.log("\n==============================");
    console.log("用户问题：", question);

    const answer = await reactAgent(question);

    console.log("\n最终答案：", answer);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
```

运行：

```bash
pnpm dev
```

### 这一步在 ReAct Agent 中的作用

这一步用于验证完整闭环：

```text
用户问题 -> Reason -> Act -> Observe -> Final Answer
```

三个问题分别验证：

- 普通问答：模型能直接回答。
- 数学计算：模型会调用 `calculator`。
- 天气查询：模型会调用 `get_weather`。

## 10. 实现命令行交互 `src/cli.ts`

### 你要做什么

创建 `src/cli.ts`。

这一步不是 Agent 核心，只是让你可以连续输入问题，观察每轮推理过程。

### 参考代码

```ts
import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { reactAgent } from "./agent";

async function main() {
  const rl = createInterface({ input, output });

  console.log("最小 ReAct Agent");
  console.log("输入 exit 退出\n");

  while (true) {
    const question = await rl.question("你：");

    if (question.trim().toLowerCase() === "exit") {
      rl.close();
      break;
    }

    const answer = await reactAgent(question);
    console.log("\n助手：", answer);
    console.log();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
```

运行：

```bash
pnpm cli
```

### 这一步在 ReAct Agent 中的作用

命令行交互让你能够观察 Agent 的执行轨迹：

```text
第 1 轮 Reason
Act: calculator
Observe
第 2 轮 Reason
Final Answer
```

可以理解为：

```text
src/cli.ts = Agent 的交互入口
```

## 11. 验收标准

### 类型检查

```bash
pnpm typecheck
```

预期：

```text
没有 TypeScript 类型错误
```

### 固定问题测试

```bash
pnpm dev
```

你应该看到：

```text
用户问题：计算 (3 + 5) * 12 等于多少

--- 第 1 轮 Reason ---
思考：我需要计算这个表达式的值。
行动：calculator({"expression":"(3 + 5) * 12"})

--- Act: calculator ---
{ expression: "(3 + 5) * 12" }

--- Observe ---
96

--- 第 2 轮 Reason ---
思考：我已经得到足够信息
Final Answer: (3 + 5) * 12 = 96
```

实际输出可能略有差异，但必须体现：

- 模型先思考。
- 模型输出行动。
- 程序执行工具。
- 程序把观察结果返回给模型。
- 模型输出最终答案。

### 命令行测试

```bash
pnpm cli
```

输入：

```text
计算 100 / 4 + 6 等于多少
```

预期：

- 调用 `calculator`
- 输出最终答案 `31`

输入：

```text
北京天气怎么样
```

预期：

- 调用 `get_weather`
- 使用模拟天气数据回答

## 12. 最终核心框架总结

这个最小项目完成后，你得到的是一个真正的 Agent 框架雏形：

```text
用户输入
  |
  v
messages 状态
  |
  v
LLM Reason
  |
  +-- Final Answer -> 结束
  |
  +-- 行动：tool(args)
          |
          v
      parseToolCall
          |
          v
      tool.execute
          |
          v
      观察：result
          |
          v
      回到 messages
          |
          v
      下一轮 Reason
```

文件职责总结：

| 文件 | 职责 | ReAct 对应 |
| --- | --- | --- |
| `src/llm.ts` | 调用百炼模型 | Reason |
| `src/tool.ts` | 定义和执行工具 | Act |
| `src/agent.ts` | 推理循环和状态调度 | Loop |
| `src/main.ts` | 固定测试入口 | 验证闭环 |
| `src/cli.ts` | 命令行交互 | 观察运行轨迹 |

你后续可以在这个最小框架上继续扩展：

- 增加短期记忆
- 增加流式输出
- 增加真实搜索工具
- 增加文件读取工具
- 替换为百炼原生 function calling
- 接入 Web 页面或服务端 API

但这些都不是第一版重点。第一版重点只有一个：理解并跑通 ReAct Agent 的核心闭环。
