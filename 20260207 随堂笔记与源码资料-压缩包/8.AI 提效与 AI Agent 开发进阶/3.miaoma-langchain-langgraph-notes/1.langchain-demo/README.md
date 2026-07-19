# LangChain 基础使用：从实测脚本理解 Model、Tool、Agent 与 MCP

本文以 `src` 下的每个脚本为实验，通过“阅读源码、运行脚本、观察输出、分析对象结构”的方式，逐层讲清 LangChain 的基本使用。

```text
模型调用
  → Message 与多模态
  → Structured Output
  → Tool Calling
  → Agent 自动工具循环
  → Streaming
  → MCP 外部工具接入
```

## 如何阅读本文

每组脚本都按同一套结构展开：

1. **源码解读**：说明脚本做了什么，以及关键 API 的职责；
2. **运行命令**：给出构建后可直接执行的命令；
3. **实测输出**：保留能够说明调用链的真实输出结构；
4. **结构分析**：解释 `AIMessage`、`ToolMessage`、`tool_calls`、Agent state 等字段；
5. **知识总结**：把脚本现象上升为可以复用的 LangChain 使用原则。

文档中的模型回答、`id` 和 token 数会随每次执行变化。判断脚本行为时，应关注对象类型、消息顺序和字段之间的关系，而不是固定的回答内容。

为便于阅读，以下内容会使用 `...` 或 `[Object]` 省略：

- 图片 Base64；
- 很长的模型推理文本；
- 与知识点无关的生成内容；
- 每次调用都会变化的随机 ID。



## 脚本与核心知识对应关系

| 脚本 | 通过实测理解什么 |
| --- | --- |
| `src/1.hello/index.ts` | `ChatOpenAI.invoke()` 和完整 `AIMessage` |
| `src/1.hello/native-fetch.ts` | LangChain 封装与原生 OpenAI 兼容 JSON 的差异 |
| `src/2.model/1.basic.ts` | 只读取 `AIMessage.content` |
| `src/2.model/2.image.ts` | 图片与文本组成的多模态消息 |
| `src/2.model/3.structed-output.ts` | 模型层结构化输出 |
| `src/3.tools/1.basic.ts` | `bindTools()`、`tool_calls` 与手动工具执行 |
| `src/4.message/1.role.ts` | System、Human、AI、Tool 四种消息角色 |
| `src/4.message/2.type.ts` | 一条 Message 同时承载图片和文本 |
| `src/5.agent/1.basic.ts` | 无工具 Agent 的返回 state |
| `src/5.agent/2.tools.ts` | Agent 自动完成工具调用闭环 |
| `src/5.agent/3.format-res.ts` | Agent 结构化输出、校验与重试 |
| `src/5.agent/4.streaming-res.ts` | `streamMode: "values"` 状态快照 |
| `src/6.mcp/1.mcp-server-math.ts` | stdio MCP 工具服务 |
| `src/6.mcp/1.mcp-server-weather.ts` | Streamable HTTP MCP 工具服务 |
| `src/6.mcp/2.mcp-client.ts` | MCP Tool 转成 LangChain Tool 并交给 Agent |

本文重点回答：

1. LangChain 如何把普通字符串、多模态内容和工具结果转换成 Message？
2. `AIMessage`、`ToolMessage`、`HumanMessage`、`SystemMessage` 分别在什么时候出现？
3. `withStructuredOutput()` 如何把 Zod Schema 变成模型约束？
4. `bindTools()` 为什么不会自动执行工具？
5. Agent 为什么看起来可以“自己调用工具”？
6. Model、Tool、Agent 和 MCP 应该如何选择？

## 0. 环境准备

项目使用 pnpm、TypeScript 和 ESM。由于图片脚本使用 `import.meta.dirname`，建议使用 Node.js 20.11.0 及以上版本。

2026-07-13 复测环境：

- Node.js v26.5.0；
- pnpm v11.1.2；
- LangChain v1.4.5；
- `@langchain/openai` v1.4.7；
- OpenAI 兼容模型：`qwen3.6-35b-a3b`。

首次运行前先安装依赖：

```bash
pnpm install --frozen-lockfile
```

如果 pnpm 提示 `Ignored build scripts: esbuild`，执行：

```bash
pnpm approve-builds esbuild
```

项目根目录需要 `.env`，并提供以下变量：

```bash
LLM_MODEL=你的模型名称
BASE_URL=OpenAI 兼容接口地址
API_KEY=你的 API Key
```

进入项目目录：

```bash
cd "/Users/bytedance/cx/spec-2/cxdlogver/cx-learn-notes/20260207 随堂笔记与源码资料-压缩包/8.AI 提效与 AI Agent 开发进阶/3.miaoma-langchain-langgraph-notes/1.langchain-demo"
```

执行脚本前先构建：

```bash
pnpm build
```

构建后统一运行 `dist` 目录中的 JavaScript 文件，例如：

```bash
node dist/1.hello/index.js
```

本次执行 `pnpm build` 成功，`dist` 下的 15 个示例入口均已生成。涉及模型调用的脚本要求本机能够访问 `BASE_URL`；涉及图片的脚本还会把 `public/miaoma-logo.png` 作为 Base64 发送给模型服务。

## 1. Hello：LangChain 调用与原生 fetch 对照

源码位置：

- `src/1.hello/index.ts`
- `src/1.hello/native-fetch.ts`

### 脚本解读

`src/1.hello/index.ts` 是 LangChain 的最小入门示例，用来学习如何通过 `ChatOpenAI` 调用一个 OpenAI 兼容的模型服务。

脚本执行流程：

1. 通过 `import "dotenv/config"` 读取项目根目录的 `.env` 配置。
2. 使用 `process.env.LLM_MODEL`、`process.env.API_KEY`、`process.env.BASE_URL` 创建 `ChatOpenAI` 实例。
3. 调用 `llm.invoke()` 向模型发送文本问题：`豆包，10192039+1235231 等于几？`。
4. 通过 `console.log(res)` 打印 LangChain 返回的完整 `AIMessage` 对象。

这里的 `res` 不是模型 HTTP 接口返回的原生 JSON，而是 LangChain 封装后的消息对象。LangChain 会把 OpenAI 兼容接口返回的 `choices[0].message.content`、`choices[0].message.reasoning_content`、`usage`、`finish_reason` 等字段整理成 `AIMessage`、`additional_kwargs`、`response_metadata` 和 `usage_metadata`。

`src/1.hello/native-fetch.ts` 用原生 `fetch` 复现同一个请求，直接调用：

```text
${BASE_URL}/chat/completions
```

这个脚本用于观察模型服务返回的原始 OpenAI 兼容 JSON，并和 LangChain 的 `AIMessage` 输出做对比。

### 输入指令

先确保已经完成依赖安装和构建：

```bash
pnpm build
```

运行 LangChain 封装版本：

```bash
node dist/1.hello/index.js
```

运行原生 `fetch` 对照版本：

```bash
node dist/1.hello/native-fetch.js
```

### LangChain 输出结果

本次重新测试命令：

```bash
node dist/1.hello/index.js
```

以下为一次实测完整输出。模型是生成式服务，重新运行时 `id`、回答措辞和 token 数可能变化，但输出结构保持一致。

```text
AIMessage {
  "id": "chatcmpl-4bded443-b35f-979e-a3d2-6a97190e6964",
  "content": "我不是豆包哦，我是通义千问～不过这道数学题的答案是：\n\n**10192039 + 1235231 = 11427270**\n\n有其他问题随时告诉我！",
  "additional_kwargs": {
    "reasoning_content": "Here's a thinking process:\n\n1.  **Analyze User Input:**\n   - User says: \"豆包，10192039+1235231 等于几？\"\n   - The user is asking for the sum of two numbers: 10,192,039 + 1,235,231\n   - They address me as \"豆包\" (Doubao), which is another AI model by ByteDance. I should politely clarify that I'm not Doubao, but I can still help with the math.\n\n2.  **Identify Key Task:**\n   - Perform addition: 10192039 + 1235231\n   - Verify calculation carefully.\n\n3.  **Perform Calculation:**\n   Let's add step by step:\n     10,192,039\n   +  1,235,231\n   ------------\n   Start from the rightmost digit:\n   - 9 + 1 = 10 → write 0, carry 1\n   - 3 + 3 + 1 = 7\n   - 0 + 2 = 2\n   - 2 + 5 = 7\n   - 9 + 3 = 12 → write 2, carry 1\n   - 1 + 2 + 1 = 4\n   - 0 + 1 = 1\n   - 1 + 0 = 1\n   Result: 11,427,270\n\n   Let me double-check with a different method:\n   10,192,039 + 1,235,231\n   = 10,192,039 + 1,000,000 + 200,000 + 30,000 + 5,000 + 200 + 30 + 1\n   = 11,192,039 + 200,000 = 11,392,039\n   + 30,000 = 11,422,039\n   + 5,000 = 11,427,039\n   + 200 = 11,427,239\n   + 30 = 11,427,269\n   + 1 = 11,427,270\n   Matches.\n\n4.  **Formulate Response:**\n   - Acknowledge the name mix-up politely: \"我不是豆包哦，我是通义千问...\"\n   - Provide the answer clearly: \"10192039 + 1235231 = 11427270\"\n   - Keep it concise and helpful.\n\n   Draft: 我不是豆包哦，我是通义千问～不过这道题的答案是：10192039 + 1235231 = 11427270。有其他问题随时问我！\n\n5.  **Self-Correction/Verification:**\n   - Check calculation one more time: 10192039 + 1235231\n     10192039\n     +1235231\n     --------\n     11427270 ✓\n   - Tone: Polite, clear, corrects identity gently.\n   - Language: Chinese, matches user.\n   - All good.\n\n   Final output matches draft.✅"
  },
  "response_metadata": {
    "tokenUsage": {
      "promptTokens": 33,
      "completionTokens": 891,
      "totalTokens": 924
    },
    "finish_reason": "stop",
    "model_provider": "openai",
    "model_name": "qwen3.6-35b-a3b"
  },
  "tool_calls": [],
  "invalid_tool_calls": [],
  "usage_metadata": {
    "output_tokens": 891,
    "input_tokens": 33,
    "total_tokens": 924,
    "input_token_details": {},
    "output_token_details": {
      "reasoning": 832
    }
  }
}
```

### 原生 fetch 输出结果

本次重新测试命令：

```bash
node dist/1.hello/native-fetch.js
```

以下为一次实测完整输出。模型是生成式服务，重新运行时 `id`、`created`、回答措辞和 token 数可能变化，但输出结构保持一致。

```text
原生 fetch 请求地址:
https://llm-surdacfiqa0jb8cc.cn-beijing.maas.aliyuncs.com/compatible-mode/v1/chat/completions

原生 fetch 请求体:
{
  "model": "qwen3.6-35b-a3b",
  "messages": [
    {
      "role": "user",
      "content": "豆包，10192039+1235231 等于几？"
    }
  ]
}

原生 fetch 完整响应:
{
  "id": "chatcmpl-9d525cd7-63cb-9daf-8af1-747a13a97e10",
  "object": "chat.completion",
  "created": 1783851227,
  "model": "qwen3.6-35b-a3b",
  "choices": [
    {
      "index": 0,
      "message": {
        "role": "assistant",
        "reasoning_content": "Here's a thinking process:\n\n1.  **Analyze User Input:**\n   - User says: \"豆包，10192039+1235231 等于几？\" (Note: The user mistakenly calls me \"豆包\" (Doubao), but I should politely clarify or just answer the question directly while acknowledging my identity if necessary. Actually, it's better to just answer correctly and maybe briefly note that I'm Qwen, but it's not strictly necessary unless it causes confusion. I'll stick to answering the math question accurately.)\n   - The math problem: 10192039 + 1235231 = ?\n\n2.  **Perform Calculation:**\n   Let's add the numbers step by step:\n     10192039\n   +  1235231\n   ----------\n   Align digits:\n     10,192,039\n   +  1,235,231\n   ------------\n   Let's add from right to left:\n   Units: 9 + 1 = 10 → write 0, carry 1\n   Tens: 3 + 3 + 1(carry) = 7\n   Hundreds: 0 + 2 = 2\n   Thousands: 2 + 5 = 7\n   Ten thousands: 9 + 3 = 12 → write 2, carry 1\n   Hundred thousands: 1 + 2 + 1(carry) = 4\n   Millions: 0 + 1 = 1\n   Ten millions: 1 + 0 = 1\n\n   Let's double-check with standard addition:\n     10192039\n   +  1235231\n   ----------\n     11427270\n\n   Wait, let's verify carefully:\n   10192039\n   +1235231\n   --------\n   Start from right:\n   9+1=10 (0, carry 1)\n   3+3+1=7\n   0+2=2\n   2+5=7\n   9+3=12 (2, carry 1)\n   1+2+1=4\n   0+1=1\n   1+0=1\n   Result: 11427270\n\n   Let's verify with another method:\n   10,192,039 + 1,235,231\n   10,192,039 + 1,000,000 = 11,192,039\n   11,192,039 + 200,000 = 11,392,039\n   11,392,039 + 30,000 = 11,422,039\n   11,422,039 + 5,000 = 11,427,039\n   11,427,039 + 200 = 11,427,239\n   11,427,239 + 30 = 11,427,269\n   11,427,269 + 1 = 11,427,270\n   Matches perfectly.\n\n3.  **Formulate Response:**\n   - Acknowledge the question.\n   - Provide the correct answer clearly.\n   - Optionally, politely clarify the name mix-up (I'm Qwen, not Doubao), but keep it friendly and concise.\n   - Structure: Direct answer first, then brief clarification if needed.\n\n   Draft: \n   10192039 + 1235231 = 11427270。\n   （温馨提示：我是通义千问（Qwen），不是豆包哦～有任何问题随时叫我！）\n\n4.  **Self-Correction/Verification:**\n   - Math is correct: 10192039 + 1235231 = 11427270 ✓\n   - Tone is polite and helpful ✓\n   - Identity clarification is light and non-intrusive ✓\n   - Language matches user's Chinese ✓\n\n   All good. Ready to output.✅",
        "content": "10192039 + 1235231 = **11427270**\n\n（小提示：我是通义千问 Qwen，不是豆包哦～有数学题或其他问题随时告诉我！）"
      },
      "finish_reason": "stop",
      "logprobs": null
    }
  ],
  "usage": {
    "prompt_tokens": 33,
    "total_tokens": 1122,
    "completion_tokens": 1089,
    "completion_tokens_details": {
      "reasoning_tokens": 1030,
      "text_tokens": 1089
    }
  }
}

原生 fetch 最终回答 content:
10192039 + 1235231 = **11427270**

（小提示：我是通义千问 Qwen，不是豆包哦～有数学题或其他问题随时告诉我！）
```

### 输出结构对比

两种方式调用的是同一个 OpenAI 兼容模型接口，但输出层级不同：

| 对比项 | LangChain `index.ts` | 原生 `fetch` |
| --- | --- | --- |
| 调用方式 | `llm.invoke(prompt)` | `fetch("${BASE_URL}/chat/completions", options)` |
| 输出对象 | `AIMessage` | 原始 JSON 对象 |
| 最终回答 | `res.content` | `rawResponse.choices[0].message.content` |
| 推理内容 | `res.additional_kwargs.reasoning_content` | `rawResponse.choices[0].message.reasoning_content` |
| 结束原因 | `res.response_metadata.finish_reason` | `rawResponse.choices[0].finish_reason` |
| token 用量 | `res.usage_metadata` 和 `res.response_metadata.tokenUsage` | `rawResponse.usage` |
| 工具调用 | `res.tool_calls`、`res.invalid_tool_calls` | 原始响应里有工具调用时通常在 `choices[0].message.tool_calls` |

结论：`index.ts` 里的 `res` 不是模型服务的原生输出。它是 LangChain 在收到原始 JSON 后转换出来的 `AIMessage`，更适合在 LangChain 的 message、tool calling、agent 等流程中继续传递。`native-fetch.ts` 打印的是 OpenAI 兼容接口直接返回的原始响应，更适合理解模型服务本身的 HTTP 请求和响应结构。


## 2. Model：文本、多模态与结构化输出

pnpm build && node dist/2.model/1.basic.js && node dist/2.model/2.image.js && node dist/2.model/3.structed-output.js

源码位置：

- `src/2.model/1.basic.ts`
- `src/2.model/2.image.ts`
- `src/2.model/3.structed-output.ts`

### 脚本解读

`2.model` 这一组脚本用于学习 LangChain 模型调用的 3 个层次：基础文本调用、多模态 Message 调用、结构化输出调用。

#### 1.basic.ts

pnpm build && node dist/2.model/1.basic.js && node dist/2.model/2.image.js && node dist/2.model/3.structed-output.js
这个脚本直接调用：

```ts
llm.invoke("豆包，10192039+1235231 等于几？直接输出结果")
```

输入是普通字符串。对 `ChatOpenAI` 来说，LangChain 会把这个字符串视为一条用户消息，相当于转换成：

```json
{
  "role": "user",
  "content": "豆包，10192039+1235231 等于几？直接输出结果"
}
```

脚本最后打印 `res.content`，所以终端只看到模型最终回答文本，不会看到完整的 `AIMessage` 对象。

#### 2.image.ts

这个脚本使用 `HumanMessage` 传入多模态内容：

```ts
new HumanMessage([
  {
    type: "image_url",
    image_url: {
      url: "data:image/jpeg;base64,...",
    },
  },
  {
    type: "text",
    text: "帮我看看图片里面有什么，请使用中文描述，我现在想要基于这个图片开发 HTML，你给我一个符合 HTML DOM 格式的 JSON",
  },
])
```

这里的 `HumanMessage` 表示用户消息。消息内容不是普通字符串，而是一个 content block 数组：第一段是图片，第二段是文本。LangChain 会把它转换成 OpenAI 兼容接口的多模态输入格式。

脚本最后打印完整 `res`，因此输出是 `AIMessage` 对象，里面包含：

- `content`：模型最终回答。本脚本中通常是图片描述和 HTML DOM JSON。
- `additional_kwargs.reasoning_content`：模型服务额外返回的推理内容，是否存在取决于模型和服务端配置。
- `response_metadata`：模型名、结束原因、token 统计等响应元信息。
- `tool_calls` / `invalid_tool_calls`：工具调用信息。本脚本没有绑定工具，所以通常是空数组。
- `usage_metadata`：LangChain 标准化后的 token 用量。

#### 3.structed-output.ts

这个脚本先用 Zod 定义结构：

```ts
const DomNode = z.object({
  tagName: z.string(),
  attributes: z.record(z.any()).optional(),
  text: z.string().optional(),
  children: z.array(z.any()).optional(),
});

const Res = z.object({
  dom: DomNode,
});
```

然后通过 `withStructuredOutput()` 创建结构化模型：

```ts
const modelWithStructure = llm.withStructuredOutput(Res, {
  method: "functionCalling",
});
```

这里需要注意：`modelWithStructure.invoke()` 默认返回的是解析后的结构化对象，不再是普通 `AIMessage`。

也就是说，当前脚本打印：

```ts
console.log("结构化输出:", res);
```

这里的 `res` 是：

```ts
{
  dom: {
    tagName: "...",
    attributes: { ... },
    children: [...]
  }
}
```

如果要同时查看原始 `AIMessage` 和解析后的结果，可以增加 `includeRaw: true`：

```ts
const modelWithStructure = llm.withStructuredOutput(Res, {
  method: "functionCalling",
  includeRaw: true,
});
```

此时返回结构会变成：

```ts
{
  raw: AIMessage,
  parsed: {
    dom: ...
  }
}
```

### 输入指令

先构建：

```bash
pnpm build
```

分别运行 3 个脚本：

```bash
node dist/2.model/1.basic.js
node dist/2.model/2.image.js
node dist/2.model/3.structed-output.js
```

也可以一次性执行：

```bash
pnpm build && node dist/2.model/1.basic.js && node dist/2.model/2.image.js && node dist/2.model/3.structed-output.js
```

### 本次测试结果

本次重新测试命令：

```bash
pnpm build && node dist/2.model/1.basic.js && node dist/2.model/2.image.js && node dist/2.model/3.structed-output.js
```

测试结果：构建成功，3 个脚本均正常退出，退出码为 `0`。

#### 1.basic.ts 输出

```text
11427270
```

输出说明：脚本打印的是 `res.content`，所以只显示模型回答文本。当前模型按要求直接输出了加法结果。

#### 2.image.ts 输出结构

`2.image.ts` 输出较长，下面保留本次输出的关键结构。模型的 `id`、回答措辞、推理内容和 token 数每次可能变化，但结构一致。

```text
AIMessage {
  "id": "chatcmpl-8ee8bd2c-b33c-9ec2-87de-1402c2be2998",
  "content": "```json\n{\n  \"tag\": \"div\",\n  \"properties\": {\n    \"class\": \"logo-container\"\n  },\n  \"children\": [ ... ]\n}\n```",
  "additional_kwargs": {
    "reasoning_content": "首先，我仔细观察了提供的图片..."
  },
  "response_metadata": {
    "tokenUsage": {
      "promptTokens": 506,
      "completionTokens": 2073,
      "totalTokens": 2579
    },
    "finish_reason": "stop",
    "model_provider": "openai",
    "model_name": "qwen3.6-35b-a3b"
  },
  "tool_calls": [],
  "invalid_tool_calls": [],
  "usage_metadata": {
    "output_tokens": 2073,
    "input_tokens": 506,
    "total_tokens": 2579,
    "output_token_details": {
      "reasoning": 1201
    }
  }
}
```

输出说明：这里是普通 `llm.invoke()` 的结果，所以返回值仍然是 `AIMessage`。多模态图片和文本只是输入内容更复杂，输出对象类型没有改变。

#### 3.structed-output.ts 输出

```text
结构化输出: { dom: { tagName: 'div', children: [ [Object], [Object] ] } }
```

输出说明：这里使用了 `withStructuredOutput()`，默认输出是解析后的对象本身，不是 `AIMessage`。因此不能从 `res.structuredResponse` 取值，也不能把它当作普通 `AIMessage` 读取 `res.content`。

### Message 相关内容

LangChain 里常见的 Message 类型如下：

| LangChain Message | 语义 | OpenAI 兼容输入中的 role |
| --- | --- | --- |
| `HumanMessage` | 用户消息 | `user` |
| `AIMessage` | 模型回复 | `assistant` |
| `SystemMessage` | 系统提示词 | `system` |
| `ToolMessage` | 工具执行结果 | `tool` |
| `FunctionMessage` | 旧版 function calling 消息 | `function` |
| `ChatMessage` | 自定义角色消息 | 自定义 role |

`ChatOpenAI.invoke()` 可以接收以下几类输入：

```ts
await llm.invoke("你好");
```

普通字符串会被当作一条用户消息。

```ts
await llm.invoke([
  new HumanMessage("你好"),
]);
```

可以直接传 `BaseMessage` 实例数组。

```ts
await llm.invoke([
  { role: "user", content: "你好" },
]);
```

也可以传 Message-like 对象，LangChain 会把它转换成内部 Message。

```ts
await llm.invoke([
  ["human", "你好"],
]);
```

还支持 tuple 形式。

#### ToolMessage 在流程中的位置

`ToolMessage` 通常不是模型直接输出的内容，而是工具执行完成后，由程序包装出来的下一轮模型输入。

典型流程如下：

1. 用户输入 `HumanMessage`。
2. 模型返回 `AIMessage`。
3. 如果模型需要调用工具，工具调用请求会出现在 `AIMessage.tool_calls` 中。
4. 程序根据 `tool_calls` 执行本地工具或远程工具。
5. 工具执行结果被包装成 `ToolMessage`。
6. 程序把 `ToolMessage` 追加到 messages 中，再次传给模型。
7. 模型读取工具结果后，生成最终自然语言回答。

示例：

```ts
[
  new HumanMessage("北京天气怎么样？"),
  new AIMessage({
    content: "",
    tool_calls: [
      {
        name: "get_weather",
        args: { location: "北京" },
        id: "call_123",
      },
    ],
  }),
  new ToolMessage({
    content: "北京天气晴朗，25 度",
    tool_call_id: "call_123",
  }),
]
```

这段消息历史发给 OpenAI 兼容接口时，`ToolMessage` 会变成：

```json
{
  "role": "tool",
  "tool_call_id": "call_123",
  "content": "北京天气晴朗，25 度"
}
```

因此可以这样理解：

- 模型输出工具调用请求：`AIMessage.tool_calls`
- 程序执行工具后的结果：`ToolMessage`
- `ToolMessage` 的作用：作为下一轮模型输入，让模型基于工具结果继续生成回答

### 最终模型输入格式

#### 文本输入

`1.basic.ts` 中的字符串输入最终会变成类似：

```json
{
  "model": "qwen3.6-35b-a3b",
  "messages": [
    {
      "role": "user",
      "content": "豆包，10192039+1235231 等于几？直接输出结果"
    }
  ]
}
```

#### 多模态输入

`2.image.ts` 和 `3.structed-output.ts` 中的 `HumanMessage([...])` 最终会变成类似：

```json
{
  "model": "qwen3.6-35b-a3b",
  "messages": [
    {
      "role": "user",
      "content": [
        {
          "type": "image_url",
          "image_url": {
            "url": "data:image/jpeg;base64,..."
          }
        },
        {
          "type": "text",
          "text": "帮我看看图片里面有什么，请使用中文描述..."
        }
      ]
    }
  ]
}
```

#### 结构化输出输入

`3.structed-output.ts` 额外使用 `withStructuredOutput(Res, { method: "functionCalling" })`。LangChain 会在请求中追加一个函数工具定义，并强制模型按这个函数参数返回结构化数据。概念上类似：

```json
{
  "model": "qwen3.6-35b-a3b",
  "messages": [
    {
      "role": "user",
      "content": [
        {
          "type": "image_url",
          "image_url": {
            "url": "data:image/jpeg;base64,..."
          }
        },
        {
          "type": "text",
          "text": "请根据图片生成一个简洁的 HTML DOM JSON..."
        }
      ]
    }
  ],
  "tools": [
    {
      "type": "function",
      "function": {
        "name": "extract",
        "parameters": {
          "type": "object",
          "properties": {
            "dom": {
              "type": "object"
            }
          },
          "required": ["dom"]
        }
      }
    }
  ],
  "tool_choice": {
    "type": "function",
    "function": {
      "name": "extract"
    }
  }
}
```

因此 `3.structed-output.ts` 的模型原始返回通常是一次 tool/function call；LangChain 再把 tool call 的参数解析成 `{ dom: ... }` 返回给脚本。


## 3. Tools：手动理解 Tool Calling

源码位置：

- `src/3.tools/1.basic.ts`

### 脚本解读

这个脚本演示 LangChain 的 Tool Calling 基础流程：先用 `tool()` 定义工具，再用 `llm.bindTools(tools)` 把工具定义绑定到模型请求中，最后手动解析模型返回的 `tool_calls` 并执行本地工具。

脚本中定义了两个工具：

```ts
const getWeather = tool((input) => `${input.location}天气很好，是晴天`, {
  name: "get_weather",
  description: "获取给定地点的天气",
  schema: z.object({
    location: z.string().describe("要获取天气的地点"),
  }),
});
```

`get_weather` 用于查询天气。它的入参 schema 是一个 Zod 对象，要求模型提供 `location` 字段。

```ts
const getEmail = tool(
  async (input) => {
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
```

`get_email` 用于查询邮件。它的入参 schema 要求模型提供 `from` 字段。

然后脚本把两个工具绑定到模型：

```ts
const tools = [getWeather, getEmail];
const modelWithTools = llm.bindTools(tools);
```

这里的 `bindTools()` 不是执行工具，而是把工具定义放进模型请求，让模型知道“可以调用哪些工具、每个工具需要什么参数”。

模型调用：

```ts
const res = await modelWithTools.invoke(
  "北京明天天气怎么样？并且帮我看看合一发来的邮件",
);
```

如果模型决定调用工具，返回的 `AIMessage` 中会包含非空的 `tool_calls`：

```ts
if (res.tool_calls) {
  for (const tc of res.tool_calls) {
    const tool_fn = tools.find((t) => t.name === tc.name);

    if (tool_fn) {
      const tool_res = await tool_fn.invoke(tc);
      console.log("🚀 ~ invoke ~ tool_res:", tool_res);
    }
  }
}
```

这段代码是手动工具执行流程。它根据 `tc.name` 找到对应工具，再把模型生成的 `tc.args` 交给工具执行。

### 输入指令

先构建：

```bash
pnpm build
```

执行脚本：

```bash
node dist/3.tools/1.basic.js
```

也可以一次性执行：

```bash
pnpm build && node dist/3.tools/1.basic.js
```

### 本次测试结果

本次重新测试命令：

```bash
pnpm build && node dist/3.tools/1.basic.js
```

测试结果：构建成功，脚本正常退出，退出码为 `0`。

#### 模型返回的 AIMessage

本次模型没有直接返回自然语言内容，而是返回了工具调用请求：

```text
AIMessage {
  "id": "chatcmpl-d0105756-88d5-9417-887e-4dfba2aa4877",
  "content": "",
  "response_metadata": {
    "finish_reason": "tool_calls",
    "model_provider": "openai",
    "model_name": "qwen3.6-35b-a3b"
  },
  "tool_calls": [
    {
      "name": "get_weather",
      "args": {
        "location": "北京"
      },
      "type": "tool_call",
      "id": "call_f55e0b911497435eaff057ef"
    },
    {
      "name": "get_email",
      "args": {
        "from": "合一"
      },
      "type": "tool_call",
      "id": "call_d8b5de5eceb545ec8375da86"
    }
  ],
  "invalid_tool_calls": []
}
```

输出说明：

- `content` 为空字符串，表示模型这一轮主要动作不是直接回答，而是请求调用工具。
- `finish_reason` 是 `tool_calls`，表示模型以工具调用请求结束这一轮输出。
- `tool_calls` 中有两个调用请求：`get_weather` 和 `get_email`。
- `args` 是模型根据用户输入和工具 schema 自动生成的参数。
- `invalid_tool_calls` 是空数组，表示工具调用参数解析没有失败。

#### 本地工具执行结果

脚本随后根据 `tool_calls` 手动执行本地工具，输出两个 `ToolMessage`：

```text
🚀 ~ invoke ~ tool_res: ToolMessage {
  "content": "北京天气很好，是晴天",
  "name": "get_weather",
  "additional_kwargs": {},
  "response_metadata": {},
  "tool_call_id": "call_f55e0b911497435eaff057ef"
}
```

```text
🚀 ~ invoke ~ tool_res: ToolMessage {
  "content": "合一 发来了邮件",
  "name": "get_email",
  "additional_kwargs": {},
  "response_metadata": {},
  "tool_call_id": "call_d8b5de5eceb545ec8375da86"
}
```

这里的 `ToolMessage` 是工具执行结果。它通过 `tool_call_id` 和模型上一轮返回的 `tool_calls[].id` 对齐。

注意：当前脚本只演示“模型生成工具调用 → 程序执行工具”。它没有把两个 `ToolMessage` 追加回 messages 再调用模型，所以不会生成“根据天气和邮件结果整理后的最终自然语言回答”。如果要完整闭环，需要再发起第二轮模型调用。

### 相关问题记录

#### 1. 没有使用 bindTools，为什么 AIMessage 里也有 tool_calls？

`tool_calls` 字段存在，不代表一定使用了 `bindTools()`，也不代表一定发生了工具调用。

LangChain 的 `AIMessage` 是统一消息结构，默认会包含：

```ts
tool_calls: []
invalid_tool_calls: []
```

所以在 `2.model/2.image.ts` 这类没有绑定工具的脚本中，打印完整 `AIMessage` 也可能看到：

```json
"tool_calls": [],
"invalid_tool_calls": []
```

这只表示没有工具调用。判断是否真的发生工具调用，要看：

```ts
res.tool_calls.length > 0
```

本脚本使用了 `bindTools()`，并且本次输出中 `tool_calls` 是非空数组，所以确实发生了工具调用请求。

#### 2. 模型输入结构中会有工具定义吗？

会，但前提是使用了 `bindTools()` 或等价方式把工具绑定到模型请求里。

概念上，LangChain 最终会向 OpenAI 兼容接口发送类似这样的请求：

```json
{
  "model": "qwen3.6-35b-a3b",
  "messages": [
    {
      "role": "user",
      "content": "北京的天气怎么样？"
    }
  ],
  "tools": [
    {
      "type": "function",
      "function": {
        "name": "get_weather",
        "description": "获取给定地点的天气",
        "parameters": {
          "type": "object",
          "properties": {
            "location": {
              "type": "string",
              "description": "要获取天气的地点"
            }
          },
          "required": ["location"]
        }
      }
    }
  ]
}
```

这里的 `tools` 来自 `tool()` 定义和 `bindTools()` 绑定。模型读取这个工具定义后，才知道可以返回 `tool_calls`。

#### 3. 模型输出和 ToolMessage 的关系是什么？

模型输出工具调用请求时，返回的是 `AIMessage.tool_calls`，例如：

```ts
[
  {
    name: "get_weather",
    args: { location: "北京" },
    id: "call_f55e0b911497435eaff057ef",
  },
]
```

程序执行工具后，会得到 `ToolMessage`：

```ts
new ToolMessage({
  content: "北京天气很好，是晴天",
  tool_call_id: "call_f55e0b911497435eaff057ef",
});
```

`ToolMessage` 通常作为下一轮模型输入，而不是模型直接输出。完整流程是：

1. 用户输入 `HumanMessage`。
2. 模型返回 `AIMessage.tool_calls`。
3. 程序执行工具。
4. 工具结果包装成 `ToolMessage`。
5. 程序把 `ToolMessage` 追加到 messages。
6. 再次调用模型，让模型基于工具结果生成最终回答。

#### 4. bindTools 和 withStructuredOutput 可以直接链式叠加吗？

不建议直接叠加。

`bindTools()` 返回的是绑定了工具配置的新可调用对象，调用后通常仍返回 `AIMessage`。`withStructuredOutput()` 返回的是“模型调用 + 输出解析器”的 Runnable 管道，默认返回结构化对象，不再是普通 `AIMessage`。

并且 `withStructuredOutput({ method: "functionCalling" })` 内部本身也会使用 tool/function calling 机制生成结构化输出专用工具。因此要实现“过程中调用业务工具，最终按 schema 输出”，更推荐使用 Agent：

```ts
const agent = createAgent({
  model: llm,
  tools,
  responseFormat: schema,
});
```

或者拆成两步：

```ts
const modelWithTools = llm.bindTools(tools);
const toolCallMessage = await modelWithTools.invoke(input);

// 执行工具并整理上下文后，再结构化输出
const modelWithStructure = llm.withStructuredOutput(schema);
const finalResult = await modelWithStructure.invoke(finalPrompt);
```

### 源码证据

#### 项目代码证据

`src/3.tools/1.basic.ts` 中定义了工具名、工具描述和 Zod schema：

```ts
const getWeather = tool((input) => `${input.location}天气很好，是晴天`, {
  name: "get_weather",
  description: "获取给定地点的天气",
  schema: z.object({
    location: z.string().describe("要获取天气的地点"),
  }),
});
```

同文件中调用 `bindTools()`：

```ts
const tools = [getWeather, getEmail];
const modelWithTools = llm.bindTools(tools);
```

#### LangChain 源码证据

本项目安装的 `@langchain/openai` 中，`bindTools()` 会把工具转换后写入 `tools` 配置：

```js
return this.withConfig({
  tools: tools.map((tool) => {
    const converted = this._convertChatOpenAIToolToCompletionsTool(tool, { strict });
    return converted;
  }),
  ...kwargs
});
```

对应文件：

```text
node_modules/.pnpm/@langchain+openai@1.4.7_.../node_modules/@langchain/openai/dist/chat_models/base.js
```

`invocationParams()` 会把 `options.tools` 放进最终请求参数：

```js
const params = {
  model: this.model,
  tools: options?.tools?.length
    ? options.tools.map((tool) => this._convertChatOpenAIToolToCompletionsTool(tool, { strict }))
    : void 0,
  tool_choice: formatToOpenAIToolChoice(options?.tool_choice),
};
```

对应文件：

```text
node_modules/.pnpm/@langchain+openai@1.4.7_.../node_modules/@langchain/openai/dist/chat_models/completions.js
```

发送请求时，LangChain 会把 `params` 和转换后的 `messages` 合并：

```js
const data = await this.completionWithRetry({
  ...params,
  stream: false,
  messages: messagesMapped
}, ...);
```

因此，`model`、`messages`、`tools` 同时出现在最终 OpenAI 兼容请求结构中是有源码依据的。


## 4. Message：角色与多模态内容

源码位置：

- `src/4.message/1.role.ts`
- `src/4.message/2.type.ts`

### 脚本解读

`4.message` 这一组脚本用于学习 LangChain 中的 Message 写法。重点是两件事：

- Message 角色：`SystemMessage`、`HumanMessage`、`AIMessage`、`ToolMessage` 各自表达什么。
- Message 内容类型：`content` 可以是普通字符串，也可以是多模态 content block 数组。

#### 1.role.ts

这个脚本演示“角色消息”和“工具绑定”同时存在时，模型如何根据上下文决定是否调用工具。

脚本先定义邮件工具：

```ts
const getEmail = tool(
  async (input) => {
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
```

然后定义两条消息：

```ts
const systemMsg = new SystemMessage("你是一个翻译官，将用户的英文翻译为中文");

const humanMsg = new HumanMessage("Hello, my name is heyi, get heyi email");
```

这里的关键点是：

- `SystemMessage` 是系统级指令，优先级高，用来约束模型角色。
- `HumanMessage` 是用户输入。
- 用户输入里出现了 `get heyi email`，看起来像邮件查询意图。
- 但系统消息要求模型做“翻译官”，所以模型本次优先执行翻译任务，没有调用 `get_email` 工具。

脚本仍然把工具绑定到模型：

```ts
const modelWithTools = llm.bindTools([getEmail]);
```

这说明：绑定工具只是告诉模型“可以使用这个工具”，不等于强制模型必须调用工具。是否调用工具由模型根据消息上下文、系统指令和用户输入共同决定。

#### 2.type.ts

这个脚本演示 Message 的 content 类型。`SystemMessage` 仍然是翻译官指令：

```ts
const systemMsg = new SystemMessage(
  "你是一个翻译官，接下来帮我将用户的英文翻译成中文",
);
```

`HumanMessage` 不是普通字符串，而是对象形式，里面的 `content` 是数组：

```ts
const humanMsg = new HumanMessage({
  content: [
    {
      type: "image_url",
      image_url: {
        url: "data:image/jpeg;base64,...",
      },
    },
    {
      type: "text",
      text: "Hello, how are you? describe image",
    },
  ],
});
```

这表示一条用户消息中同时包含图片和文本。LangChain 最终会把它转换成 OpenAI 兼容的多模态消息格式：

```json
{
  "role": "user",
  "content": [
    {
      "type": "image_url",
      "image_url": {
        "url": "data:image/jpeg;base64,..."
      }
    },
    {
      "type": "text",
      "text": "Hello, how are you? describe image"
    }
  ]
}
```

模型会同时读取系统提示、文本内容和图片内容，最终返回翻译结果和图片描述。

### 输入指令

先构建：

```bash
pnpm build
```

分别执行两个脚本：

```bash
node dist/4.message/1.role.js
node dist/4.message/2.type.js
```

也可以一次性执行：

```bash
pnpm build && node dist/4.message/1.role.js && node dist/4.message/2.type.js
```

### 本次测试结果

本次重新测试命令：

```bash
pnpm build && node dist/4.message/1.role.js && node dist/4.message/2.type.js
```

测试结果：构建成功，两个脚本均正常退出，退出码为 `0`。

#### 1.role.ts 输出

本次输出的关键结构如下：

```text
🚀 ~ invoke ~ res: AIMessage {
  "id": "chatcmpl-90a06de7-869c-9276-aeac-ae7e4e5837b9",
  "content": "你好，我叫heyi，获取heyi的邮件。",
  "response_metadata": {
    "finish_reason": "stop",
    "model_provider": "openai",
    "model_name": "qwen3.6-35b-a3b"
  },
  "tool_calls": [],
  "invalid_tool_calls": [],
  "usage_metadata": {
    "output_tokens": 1381,
    "input_tokens": 320,
    "total_tokens": 1701
  }
}
```

输出说明：

- 返回值是 `AIMessage`。
- `content` 是英文输入的中文翻译。
- `tool_calls` 是空数组，说明本次没有触发 `get_email` 工具调用。
- 这验证了一个重要点：即使使用了 `bindTools()`，模型也不一定调用工具。
- 本例中，`SystemMessage` 的“翻译官”角色约束强于用户文本里的邮件查询意图。

#### 2.type.ts 输出

本次输出的关键结构如下：

```text
🚀 ~ invoke ~ res: AIMessage {
  "id": "chatcmpl-cb8622de-239e-9198-bdb9-984e19ca279b",
  "content": "你好，你怎么样？图片展示的是“妙码学院”的标志，左侧为紫色的图形标识（内部包含类似代码相关的造型元素），右侧上方是黑色艺术字体的“妙码学院”，下方是黑色的大写英文字母“MIAOMAEDU”。",
  "response_metadata": {
    "finish_reason": "stop",
    "model_provider": "openai",
    "model_name": "qwen3.6-35b-a3b"
  },
  "tool_calls": [],
  "invalid_tool_calls": [],
  "usage_metadata": {
    "output_tokens": 151,
    "input_tokens": 504,
    "total_tokens": 655
  }
}
```

输出说明：

- 返回值同样是 `AIMessage`。
- `content` 同时包含英文文本翻译和图片描述。
- `tool_calls` 是空数组，因为这个脚本没有绑定工具。
- 输入中的图片和文本同属于一条 `HumanMessage`，不是两轮对话。

### Message 类型总结

| Message 类型 | 常见来源 | 主要作用 |
| --- | --- | --- |
| `SystemMessage` | 开发者或系统设置 | 约束模型身份、任务边界和输出风格 |
| `HumanMessage` | 用户输入 | 表示用户发给模型的消息 |
| `AIMessage` | 模型返回 | 表示模型生成的回复，也可能包含 `tool_calls` |
| `ToolMessage` | 程序执行工具后生成 | 表示工具执行结果，通常作为下一轮模型输入 |

这两个脚本最重要的学习点是：Message 不只是文本包装。它同时承载角色、内容类型和对话上下文。模型最终行为不只由用户输入决定，也会受 `SystemMessage` 和已绑定能力影响。


## 5. Agent：自动工具循环、结构化结果与 Streaming

源码位置：

- `src/5.agent/1.basic.ts`
- `src/5.agent/2.tools.ts`
- `src/5.agent/3.format-res.ts`
- `src/5.agent/4.streaming-res.ts`

这一组脚本用于学习 LangChain Agent 的基本工作方式。前面的 `3.tools` 示例中，模型只负责返回 `tool_calls`，工具执行需要我们手动写循环；到了 Agent，LangChain 会把“模型判断是否调用工具、执行工具、把工具结果放回对话、继续调用模型”这条链路封装起来。

### 脚本解读

#### 1.basic.ts

这个脚本创建了一个最基础的 Agent：

```ts
const agent = createAgent({
  model: llm,
});
```

这里没有传入 `tools`，所以 Agent 只有模型能力。调用时传入一条多模态用户消息：

```ts
const res = await agent.invoke({
  messages: [
    {
      role: "user",
      content: [
        {
          type: "image_url",
          image_url: {
            url: "data:image/jpeg;base64,...",
          },
        },
        {
          type: "text",
          text: "Hello, how are you? describe image,get heyi email",
        },
      ],
    },
  ],
});
```

注意：这里虽然用户文本里写了 `get heyi email`，但脚本没有注册邮件工具。模型只能基于已有上下文回答，不能真正执行邮件查询。

#### 2.tools.ts

这个脚本在 Agent 中注册了一个工具：

```ts
const getEmail = tool(
  async (input) => {
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
```

然后把工具交给 Agent：

```ts
const agent = createAgent({
  model: llm,
  tools: [getEmail],
});
```

这里的核心变化是：工具执行不再由业务代码手写循环完成，而是由 Agent 自动管理。执行链路是：

1. 用户输入图片和文本。
2. 模型判断需要调用 `get_email`。
3. Agent 执行 `getEmail`。
4. Agent 把执行结果包装成 `ToolMessage`。
5. 模型读取 `ToolMessage` 后生成最终回答。

这就是 Agent 和单纯 `llm.bindTools()` 的主要区别：

- `bindTools()` 只是让模型“知道工具存在”，模型返回 `tool_calls` 后还要自己执行工具。
- `createAgent({ tools })` 会托管工具调用循环，自动把工具结果放回对话上下文。

#### 3.format-res.ts

这个脚本演示 Agent 的结构化输出。它先定义 DOM 节点结构：

```ts
const DomNode = z.object({
  tagName: z.string().describe("HTML 标签名，例如 div、img、h1、p"),
  attributes: z.record(z.any()).optional().describe("HTML 属性，例如 class、style、src"),
  text: z.string().optional().describe("文本节点内容"),
  children: z.array(z.any()).optional().describe("子节点列表"),
});

const PersonInfo = z.object({
  dom: DomNode.describe("描述 DOM 的 JSON"),
});
```

然后通过 `responseFormat` 交给 Agent：

```ts
const agent = createAgent({
  model: llm,
  responseFormat: PersonInfo,
});
```

这里和 `llm.withStructuredOutput()` 的返回结构不同：

- `withStructuredOutput().invoke()` 默认直接返回解析后的结构化对象。
- `createAgent({ responseFormat })` 返回 Agent state，结构化结果在 `res.structuredResponse` 字段里。

不过，`structuredResponse` 不是把 `AIMessage.content` 里的 Markdown JSON 自动解析出来。Agent 内部会把 schema 转成结构化输出策略，本例中表现为 `extract-*` 工具调用。只有当模型按这个结构化工具调用路径返回，并且参数通过 schema 校验时，`structuredResponse` 才会被填充。

#### 4.streaming-res.ts

这个脚本演示 Agent 流式输出：

```ts
const res = await agent.stream(
  {
    messages: [{ role: "user", content: "我是合一，我今年18岁" }],
  },
  {
    streamMode: "values",
  },
);

for await (const chunk of res) {
  console.log(chunk);
}
```

`streamMode: "values"` 输出的是 Agent state 快照，不是逐 token 文本。每个 `chunk` 都是当前完整状态：第一块通常只有用户消息，后续块会包含模型新增的 `AIMessage`。

### 输入指令

先构建：

```bash
pnpm build
```

分别执行 4 个脚本：

```bash
node dist/5.agent/1.basic.js
node dist/5.agent/2.tools.js
node dist/5.agent/3.format-res.js
node dist/5.agent/4.streaming-res.js
```

也可以按顺序一次性执行：

```bash
pnpm build && node dist/5.agent/1.basic.js && node dist/5.agent/2.tools.js && node dist/5.agent/3.format-res.js && node dist/5.agent/4.streaming-res.js
```

### 本次测试结果

本次重新测试先执行：

```bash
pnpm build
```

构建成功，`dist/5.agent/*.js` 均已生成。随后分别执行 4 个脚本，均正常退出，退出码为 `0`。

#### 1.basic.ts 输出

本次输出结构如下。图片 base64 很长，文档中用 `...` 省略：

```text
🚀 ~ invoke ~ res: {
  messages: [
    HumanMessage {
      "content": [
        {
          "type": "image_url",
          "image_url": {
            "url": "data:image/jpeg;base64,..."
          }
        },
        {
          "type": "text",
          "text": "Hello, how are you? describe image,get heyi email"
        }
      ]
    },
    AIMessage {
      "content": "### Description of the Image\nThe image features a logo design...\n\n### Regarding the “Heyi email” Request\nThis image is associated with 妙码学院 (MIAOMAEDU), not “Heyi.” ...",
      "response_metadata": {
        "finish_reason": "stop",
        "model_provider": "openai",
        "model_name": "qwen3.6-35b-a3b"
      },
      "tool_calls": [],
      "invalid_tool_calls": []
    }
  ]
}
```

输出说明：

- `agent.invoke()` 返回的是 Agent state 对象，不是单个 `AIMessage`。
- `messages` 中保留了输入的 `HumanMessage` 和模型返回的 `AIMessage`。
- `HumanMessage.content` 是多模态数组，包含图片和文本。
- `tool_calls` 是空数组，因为这个 Agent 没有注册任何工具。
- 邮件相关内容只是模型基于文本进行解释，并没有真实工具查询。

#### 2.tools.ts 输出

本次输出的关键结构如下：

```text
🚀 ~ invoke ~ res: {
  messages: [
    HumanMessage { ... },
    AIMessage {
      "content": "",
      "response_metadata": {
        "finish_reason": "tool_calls",
        "model_provider": "openai",
        "model_name": "qwen3.6-35b-a3b"
      },
      "tool_calls": [
        {
          "name": "get_email",
          "args": {
            "from": "heyi"
          },
          "type": "tool_call",
          "id": "call_954f43e5be424e1780eea753"
        }
      ]
    },
    ToolMessage {
      "content": "heyi 发来了邮件",
      "name": "get_email",
      "tool_call_id": "call_954f43e5be424e1780eea753"
    },
    AIMessage {
      "content": "Based on the image provided and your request, here is the information: ...",
      "response_metadata": {
        "finish_reason": "stop",
        "model_provider": "openai",
        "model_name": "qwen3.6-35b-a3b"
      },
      "tool_calls": []
    }
  ]
}
```

输出说明：

- 第一条 `AIMessage` 的 `finish_reason` 是 `tool_calls`，表示模型本轮不是最终回答，而是在请求调用工具。
- `tool_calls[0].name` 是 `get_email`，参数是 `{ from: "heyi" }`。
- `ToolMessage.tool_call_id` 和前一条 `AIMessage.tool_calls[0].id` 对应，用来告诉模型这条工具结果属于哪次工具调用。
- 最后一条 `AIMessage` 才是模型结合图片描述和工具结果生成的最终回答。

#### 3.format-res.ts 输出

本次输出比较能说明结构化输出的真实流程。第一次结构化工具调用没有通过 schema 校验：

```text
AIMessage {
  "content": "",
  "response_metadata": {
    "finish_reason": "tool_calls"
  },
  "tool_calls": [
    {
      "name": "extract-1",
      "args": {
        "dom": "[Object]"
      },
      "type": "tool_call",
      "id": "call_5bc6ec3f7d16412ea0d737fa"
    }
  ]
}

ToolMessage {
  "content": "Failed to parse structured output for tool 'extract-1':\n  - Property \"dom\" does not match schema.\n  - Property \"text\" does not match schema.\n  - Instance type \"null\" is invalid. Expected \"string\"..",
  "tool_call_id": "call_5bc6ec3f7d16412ea0d737fa"
}
```

失败原因是 schema 中 `text` 定义为 `z.string().optional()`。这表示 `text` 可以不存在，但如果存在就必须是字符串；模型第一次返回了 `null`，所以校验失败。

随后 Agent 继续把错误信息交给模型，模型第二次调用结构化工具成功：

```text
AIMessage {
  "tool_calls": [
    {
      "name": "extract-2",
      "args": {
        "dom": "[Object]"
      },
      "type": "tool_call",
      "id": "call_94af8c790f444e97be2f46d8"
    }
  ]
}

ToolMessage {
  "content": "{\"dom\":{\"tagName\":\"div\",\"children\":[{\"tagName\":\"div\",\"text\":\"\",\"attributes\":{\"class\":\"logo-icon\"},\"children\":[]},{\"tagName\":\"div\",\"children\":[{\"tagName\":\"h1\",\"text\":\"妙码学院\",\"attributes\":{\"class\":\"chinese-name\"}},{\"tagName\":\"p\",\"text\":\"MIAOMAEEDU\",\"attributes\":{\"class\":\"english-name\"}}],\"attributes\":{\"class\":\"logo-text\"}}],\"attributes\":{\"class\":\"container\"}}}",
  "name": "extract-2",
  "tool_call_id": "call_94af8c790f444e97be2f46d8"
}

AIMessage {
  "content": "Returning structured response: {\"dom\":{\"tagName\":\"div\",...}}",
  "tool_calls": []
}
```

最终脚本打印出 `structuredResponse`：

```text
structuredResponse ====> {
  dom: {
    tagName: 'div',
    children: [ [Object], [Object] ],
    attributes: { class: 'container' }
  }
}
```

输出说明：

- `responseFormat` 会让 Agent 多维护一个 `structuredResponse` 字段。
- 本例中结构化输出通过 `extract-*` 工具调用完成。
- 如果模型返回普通 Markdown JSON，或者结构化工具参数一直无法通过 schema 校验，`structuredResponse` 可能是 `undefined`。
- 当前脚本的本次执行中，Agent 先收到一次解析失败的 `ToolMessage`，再自动重试并成功填充 `structuredResponse`。

#### 4.streaming-res.ts 输出

本次流式输出有两个 state 快照：

```text
{
  messages: [
    HumanMessage {
      "content": "我是合一，我今年18岁"
    }
  ]
}
```

第二个快照包含模型回复：

```text
{
  messages: [
    HumanMessage {
      "content": "我是合一，我今年18岁"
    },
    AIMessage {
      "content": "你好，合一！很高兴认识你。18岁是个很特别的年纪，既是法律意义上的成年起点，也是人生方向开始自主选择的阶段。...",
      "response_metadata": {
        "finish_reason": "stop",
        "model_provider": "openai",
        "model_name": "qwen3.6-35b-a3b"
      },
      "tool_calls": []
    }
  ]
}
```

输出说明：

- `streamMode: "values"` 输出的是完整 state 快照。
- 第一块只有用户输入。
- 第二块包含用户输入和模型回复。
- 如果想只显示新增文本，可以在循环中取 `chunk.messages.at(-1)`，脚本里已经保留了这段注释示例。

### Agent 输出结构总结

| 字段 | 出现位置 | 含义 |
| --- | --- | --- |
| `messages` | `agent.invoke()` 和 `agent.stream()` 的返回 state | 当前对话状态，包含用户消息、模型消息、工具消息 |
| `HumanMessage` | `messages` | 用户输入，支持普通文本和多模态 content block |
| `AIMessage` | `messages` | 模型回复，也可能携带 `tool_calls` |
| `ToolMessage` | `messages` | 工具执行结果，由 Agent 自动追加 |
| `tool_calls` | `AIMessage` | 模型请求调用的工具列表 |
| `tool_call_id` | `ToolMessage` | 对应某一次工具调用的 ID |
| `structuredResponse` | Agent state | `responseFormat` 校验成功后的结构化结果 |

这一组脚本的学习重点是：Agent 返回的是“状态”，不是单条模型消息。工具调用和结构化输出都表现为对 `messages` 状态的增量更新。

### 源码依据

`responseFormat` 的处理逻辑在 LangChain 的 Agent 源码中可以看到。`transformResponseFormat()` 的注释明确说明：Zod schema 默认会走 tool calling 风格的结构化输出。

对应文件：

```text
node_modules/.pnpm/langchain@1.4.5_.../node_modules/langchain/dist/agents/responses.js
```

关键源码：

```js
function transformResponseFormat(responseFormat, options, model) {
  if (!responseFormat) return [];
  ...
  if (isInteropZodObject(responseFormat)) {
    return useProviderStrategy
      ? [ProviderStrategy.fromSchema(responseFormat)]
      : [ToolStrategy.fromSchema(responseFormat, options)];
  }
}
```

AgentNode 会把结构化输出 schema 转成内部结构化工具：

```js
const strategies = transformResponseFormat(responseFormat, void 0, resolvedModel);

if (!strategies.every((format) => format instanceof ProviderStrategy)) return {
  type: "tool",
  tools: strategies
    .filter((format) => format instanceof ToolStrategy)
    .reduce((acc, format) => {
      acc[format.name] = format;
      return acc;
    }, {})
};
```

对应文件：

```text
node_modules/.pnpm/langchain@1.4.5_.../node_modules/langchain/dist/agents/nodes/AgentNode.js
```

Agent 绑定工具时，会把用户传入的工具和结构化输出工具合并：

```js
const structuredTools = Object.values(
  structuredResponseFormat && "tools" in structuredResponseFormat
    ? structuredResponseFormat.tools
    : {}
);

const allTools = [
  ...preparedOptions?.tools ?? this.#options.toolClasses,
  ...structuredTools.map((toolStrategy) => toolStrategy.tool)
];
```

当模型返回结构化工具调用时，Agent 会解析参数，生成 `structuredResponse`，并把工具结果和最终 `AIMessage` 一起写回 `messages`：

```js
const structuredResponse = tool.parse(toolCall.args);

return {
  structuredResponse,
  messages: [
    response,
    new ToolMessage({
      tool_call_id: toolCall.id ?? "",
      content: JSON.stringify(structuredResponse),
      name: toolCall.name
    }),
    new AIMessage(
      lastMessage ?? `Returning structured response: ${JSON.stringify(structuredResponse)}`
    )
  ]
};
```

因此，`3.format-res.ts` 中看到的 `extract-1`、`extract-2`、`ToolMessage` 和 `structuredResponse` 都不是额外打印出来的临时逻辑，而是 Agent structured output 机制的一部分。

### 核心问题梳理

#### 1. Agent 为什么看起来可以“自己调用工具”？

Agent 并不是让模型直接执行本地函数。真实流程是：模型根据工具定义生成工具调用请求，Agent 运行时负责执行工具函数，并把工具结果作为 `ToolMessage` 追加回对话上下文。

完整工作流：

```text
用户输入
  ↓
Agent 带着工具定义调用模型
  ↓
模型返回 AIMessage.tool_calls
  ↓
Agent 根据工具名找到真实工具函数并执行
  ↓
Agent 把执行结果包装成 ToolMessage
  ↓
Agent 再次调用模型
  ↓
模型基于工具结果生成最终 AIMessage
```

因此，`bindTools()` 和 `createAgent({ tools })` 的主要差异是：

| 对比项 | `llm.bindTools(tools)` | `createAgent({ tools })` |
| --- | --- | --- |
| 工具定义 | 会传给模型 | 会传给模型 |
| 工具调用请求 | 模型返回 `AIMessage.tool_calls` | 模型返回 `AIMessage.tool_calls` |
| 工具执行 | 需要业务代码手动执行 | Agent 自动执行 |
| 工具结果回填 | 需要手动构造 `ToolMessage` 再调用模型 | Agent 自动追加 `ToolMessage` |
| 最终回答 | 需要手动发起第二轮模型调用 | Agent 自动继续工作流 |

#### 2. 模型层结构化输出和 Agent 层结构化输出有什么区别？

模型层结构化输出约束的是“一次模型调用的返回值”。典型 API 是：

```ts
const modelWithStructure = llm.withStructuredOutput(schema);
const res = await modelWithStructure.invoke(input);
```

默认情况下，`res` 直接是解析后的结构化对象，不再是普通 `AIMessage`。

Agent 层结构化输出约束的是“整个 Agent 工作流结束后的最终结果”。典型 API 是：

```ts
const agent = createAgent({
  model: llm,
  tools,
  responseFormat: schema,
});

const res = await agent.invoke({ messages });
```

这里 `res` 是 Agent state，结构化结果放在：

```ts
res.structuredResponse
```

对比关系：

| 对比项 | 模型层结构化输出 | Agent 层结构化输出 |
| --- | --- | --- |
| 典型 API | `llm.withStructuredOutput(schema)` | `createAgent({ responseFormat: schema })` |
| 作用范围 | 单次模型调用 | 整个 Agent 工作流 |
| 返回结构 | 默认直接返回结构化对象 | 返回 Agent state |
| 结构化结果位置 | `res` 本身 | `res.structuredResponse` |
| 工具调用循环 | 不负责管理业务工具循环 | 可以先调用工具，再生成结构化结果 |
| 失败处理 | 通常直接抛解析或校验错误 | 可以把错误作为 `ToolMessage` 交给模型重试 |

#### 3. `withStructuredOutput()` 一定能让模型输出结构化数据吗？

不一定。`withStructuredOutput()` 能显著提高结构化输出的稳定性，但不能保证任何模型、任何 provider、任何 schema 下都 100% 成功。

它真正保证的是：LangChain 只会把“能被解析并通过 schema 校验”的内容当成结构化结果返回。如果模型没有按要求返回，可能出现以下情况：

- 模型返回普通文本或 Markdown JSON。
- 模型没有正确走 tool calling 或 `response_format`。
- 工具调用参数不是合法 JSON。
- 返回字段不符合 Zod schema。
- 当前模型或 OpenAI 兼容接口不完整支持 `tool_choice`、`response_format` 等参数。

所以关键链路建议加 `try/catch`，调试时可以使用：

```ts
const modelWithStructure = llm.withStructuredOutput(schema, {
  includeRaw: true,
});
```

这样可以同时观察原始 `AIMessage` 和解析后的结构化结果。

#### 4. 模型层如何“按 schema 输出”？

`withStructuredOutput()` 的原理不是在模型输出之后强行改写文本，而是先把 schema 转成模型能理解的约束，再对返回结果做解析校验。

核心流程：

```text
Zod schema
  ↓
LangChain 转成 JSON Schema
  ↓
作为 tools/function parameters 或 response_format 传给模型
  ↓
模型按约束返回 tool_calls 或 JSON
  ↓
LangChain 解析返回值
  ↓
用 schema 校验
  ↓
返回结构化对象
```

当使用：

```ts
llm.withStructuredOutput(schema, {
  method: "functionCalling",
});
```

LangChain 通常会把 schema 包装成一个结构化输出专用工具，并通过 `tool_choice` 要求模型调用这个工具。概念上类似：

```json
{
  "tools": [
    {
      "type": "function",
      "function": {
        "name": "extract",
        "description": "结构化输出工具",
        "parameters": {
          "type": "object",
          "properties": {}
        }
      }
    }
  ],
  "tool_choice": {
    "type": "function",
    "function": {
      "name": "extract"
    }
  }
}
```

模型返回时，结构化数据通常出现在 `tool_calls.arguments` 中。LangChain 再把这部分参数取出来，用 Zod 校验，校验成功后才返回结构化对象。

#### 5. Agent 层结构化输出的原理是否相同？

底层原理相同：Agent 仍然需要把 schema 转成工具参数 schema 或模型原生 `response_format`，再让模型按约束输出。

不同点是 Agent 会把结构化输出放进多轮工作流中：

```text
用户输入
  ↓
模型判断是否需要普通工具
  ↓
Agent 执行普通工具并追加 ToolMessage
  ↓
模型继续推理
  ↓
模型按 responseFormat 生成结构化输出
  ↓
Agent 解析并校验
  ↓
写入 structuredResponse
```

因此，Agent 层结构化输出可以理解为：在模型层结构化输出能力之上，增加了工具调用循环、状态管理、失败反馈和最终结果收口。

#### 6. Agent 层的工具调用和结构化输出会调用 LLM 层能力吗？

会，但要区分“复用同一套底层能力”和“直接调用同一个封装方法”。

Agent 层工具调用一定依赖 LLM 层的 tool calling 能力。创建 Agent 时传入：

```ts
const agent = createAgent({
  model: llm,
  tools: [getEmail],
});
```

Agent 内部会把这些工具绑定到模型调用上，效果类似：

```ts
llm.bindTools([getEmail]);
```

最终进入模型请求时，仍然是 OpenAI 兼容的工具调用结构：

```json
{
  "messages": [],
  "tools": [],
  "tool_choice": "auto"
}
```

模型并不会直接执行 `getEmail` 函数。它只会返回工具调用请求：

```ts
AIMessage {
  tool_calls: [
    {
      name: "get_email",
      args: { from: "heyi" }
    }
  ]
}
```

随后由 Agent 根据 `tool_calls.name` 找到真实工具函数，执行后把结果包装成 `ToolMessage`，再追加回 `messages`。

Agent 层结构化输出也依赖 LLM 层的结构化输出通道。创建 Agent 时传入：

```ts
const agent = createAgent({
  model: llm,
  responseFormat: PersonInfo,
});
```

Agent 会把 `responseFormat` 转成两类策略之一：

| 策略 | 底层机制 | 对应模型层能力 |
| --- | --- | --- |
| `ToolStrategy` | 把 schema 转成结构化输出工具，例如 `extract-*` | 类似 `withStructuredOutput({ method: "functionCalling" })` |
| `ProviderStrategy` | 把 schema 转成模型原生 `response_format` | 类似 `withStructuredOutput({ method: "jsonSchema" })` |

在本项目的 `src/5.agent/3.format-res.ts` 中，实测看到的 `extract-1`、`extract-2` 就属于 `ToolStrategy` 路径。它说明 Agent 把结构化输出 schema 包装成了一个特殊工具，然后让模型通过 `tool_calls` 返回结构化参数。

整体关系可以理解为：

```text
Agent tools
  ↓
LLM bindTools / tools 请求参数
  ↓
模型返回业务工具 tool_calls
  ↓
Agent 执行业务工具并追加 ToolMessage

Agent responseFormat
  ↓
ToolStrategy / ProviderStrategy
  ↓
LLM tools 或 response_format 请求参数
  ↓
模型返回结构化 tool_calls 或 JSON
  ↓
Agent 解析校验并写入 structuredResponse
```

所以结论是：Agent 层工具调用和结构化输出都复用了 LLM 层的工具调用、`response_format` 等底层能力；但 Agent 通常不是简单调用 `llm.withStructuredOutput()`，而是把这些底层能力整合进 Agent 的多轮工作流、工具执行、状态管理和失败重试中。


## 6. MCP：把外部工具服务接入 Agent

源码位置：

- `src/6.mcp/1.mcp-server-math.ts`
- `src/6.mcp/1.mcp-server-weather.ts`
- `src/6.mcp/2.mcp-client.ts`

前面的 `tool()` 示例把工具函数直接写在 LangChain 应用中。MCP 解决的是另一类问题：工具能力需要跨进程、跨项目或跨语言复用时，如何用统一协议声明和调用。

这三个脚本组成一套完整实验：

```text
Math MCP Server（stdio）─────────┐
                                ├─ MultiServerMCPClient
Weather MCP Server（HTTP）──────┘
                                         ↓
                                LangChain Tools
                                         ↓
                                  createAgent()
                                         ↓
                                      Model
```

### 6.1 1.mcp-server-math.ts：stdio MCP Server

这个脚本使用底层 `Server` 和 `StdioServerTransport` 创建数学工具服务。

#### 工具声明

`ListToolsRequestSchema` 处理器返回两个工具：

```ts
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "add",
        description: "求两个数的和",
        inputSchema: {
          type: "object",
          properties: {
            a: { type: "number" },
            b: { type: "number" },
          },
          required: ["a", "b"],
        },
      },
      {
        name: "multiply",
        description: "求两个数的积",
        inputSchema: {
          type: "object",
          properties: {
            a: { type: "number" },
            b: { type: "number" },
          },
          required: ["a", "b"],
        },
      },
    ],
  };
});
```

这里的 `inputSchema` 和 LangChain `tool({ schema })` 作用相同：向 Client 和模型描述工具需要什么参数。

#### 工具执行

`CallToolRequestSchema` 处理器根据工具名执行真实逻辑：

```ts
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  switch (request.params.name) {
    case "add": {
      const { a, b } = request.params.arguments as {
        a: number;
        b: number;
      };
      return {
        content: [{ type: "text", text: String(a + b) }],
      };
    }
    case "multiply": {
      const { a, b } = request.params.arguments as {
        a: number;
        b: number;
      };
      return {
        content: [{ type: "text", text: String(a * b) }],
      };
    }
  }
});
```

最后连接 stdio transport：

```ts
const transport = new StdioServerTransport();
await server.connect(transport);
```

stdio 模式下，Server 通常不需要手动启动。Client 会根据 `command` 和 `args` 创建子进程。

需要注意：stdout 用于传输 MCP 协议消息。生产代码中的调试日志应输出到 stderr，例如使用 `console.error()`，避免干扰协议。

### 6.2 1.mcp-server-weather.ts：Streamable HTTP MCP Server

这个脚本使用高级 `McpServer` 注册天气工具：

```ts
server.registerTool(
  "fetch-weather",
  {
    description: "获取城市的天气",
    inputSchema: { city: z.string() },
    outputSchema: {
      temperature: z.number(),
      conditions: z.string(),
    },
  },
  async ({ city }) => {
    const temperature = 25;
    const conditions = "晴朗";

    return {
      content: [
        {
          type: "text",
          text: `${city}的天气还不错，温度${temperature}度，${conditions}`,
        },
      ],
      structuredContent: {
        temperature,
        conditions,
      },
    };
  },
);
```

工具同时返回两种结果：

| 字段 | 作用 |
| --- | --- |
| `content` | 给模型读取的文本结果 |
| `structuredContent` | 给支持结构化结果的 Client 使用 |

HTTP Server 暴露：

- `POST /mcp`：初始化会话和处理请求；
- `GET /mcp`：已有会话接收服务端消息；
- `DELETE /mcp`：关闭会话；
- `/sse`、`/messages`：兼容旧版 SSE Client。

运行命令：

```bash
node dist/6.mcp/1.mcp-server-weather.js
```

正常启动时输出：

```text
Weather MCP server running on port 8000
```

这个进程必须保持运行，MCP Client 才能连接 `http://localhost:8000/mcp`。

直接用浏览器访问 `/mcp` 不能验证服务是否可用，因为 MCP 初始化需要符合协议的 POST 请求和会话头。

### 6.3 2.mcp-client.ts：获取 MCP Tools 并创建 Agent

Client 同时配置两个 Server：

```ts
const client = new MultiServerMCPClient({
  mcpServers: {
    math: {
      transport: "stdio",
      command: "node",
      args: [mathServerPath],
    },
    weather: {
      url: "http://localhost:8000/mcp",
    },
  },
});
```

连接并获取工具：

```ts
await client.initializeConnections();

const tools = await client.getTools();
const agent = createAgent({
  model: llm,
  tools,
});
```

`client.getTools()` 会把 MCP 工具定义转换成 LangChain Tool。进入 Agent 以后，模型不需要区分工具来自：

- 本地 `tool()`；
- stdio MCP Server；
- HTTP MCP Server；
- 其他远程 API 适配器。

Agent 看到的仍然是工具名、描述和参数 Schema。

Client 使用 `try/finally` 关闭连接：

```ts
try {
  await client.initializeConnections();
  // 获取工具并运行 Agent
} finally {
  await client.close();
}
```

这一步很重要，否则 stdio 子进程或 HTTP 会话可能无法正常释放。

### 6.4 输入指令

先构建：

```bash
pnpm build
```

终端 A 启动 Weather Server：

```bash
node dist/6.mcp/1.mcp-server-weather.js
```

终端 B 运行 Client：

```bash
node dist/6.mcp/2.mcp-client.js
```

Math Server 不需要单独启动。Client 会自动执行：

```text
node dist/6.mcp/1.mcp-server-math.js
```

### 6.5 2026-07-13 实测结果

本次测试中：

- Weather Server 成功监听 8000 端口；
- MCP Client 成功初始化 stdio 与 HTTP 两个连接；
- Client 成功获取 `add`、`multiply`、`fetch-weather` 三个工具；
- 两个 Agent 请求均正常结束；
- `client.close()` 正常关闭连接。

#### 数学请求：工具存在，但模型直接回答

输入：

```text
计算(3 + 5) x 12 等于多少
```

本次关键输出：

```text
mathResponse: {
  messages: [
    HumanMessage {
      "content": "计算(3 + 5) x 12 等于多少"
    },
    AIMessage {
      "content": "计算结果为 **96**。...",
      "response_metadata": {
        "finish_reason": "stop",
        "model_name": "qwen3.6-35b-a3b"
      },
      "tool_calls": []
    }
  ]
}
```

这次没有出现 `ToolMessage`，也没有调用 `add` 或 `multiply`。

这不是 MCP 连接失败，而是模型认为这个算式足够简单，可以直接回答。它验证了前面 `bindTools()` 和 Agent 章节中的结论：

> 工具可用，不等于模型必须调用工具。

判断工具是否真正执行，不能只看 Agent 配置里的 `tools`，而要看消息历史中是否出现：

1. 非空的 `AIMessage.tool_calls`；
2. 对应的 `ToolMessage`。

#### 天气请求：完整 MCP 工具调用闭环

输入：

```text
我的城市是：北京，请获取天气
```

本次输出的关键结构：

```text
weatherResponse: {
  messages: [
    HumanMessage {
      "content": "我的城市是：北京，请获取天气"
    },
    AIMessage {
      "content": "",
      "response_metadata": {
        "finish_reason": "tool_calls"
      },
      "tool_calls": [
        {
          "name": "fetch-weather",
          "args": {
            "city": "北京"
          },
          "id": "call_c162..."
        }
      ]
    },
    ToolMessage {
      "content": "北京的天气还不错，温度25度，晴朗",
      "name": "fetch-weather",
      "tool_call_id": "call_c162..."
    },
    AIMessage {
      "content": "北京的天气目前还不错哦，气温为25℃，天气晴朗~",
      "response_metadata": {
        "finish_reason": "stop"
      },
      "tool_calls": []
    }
  ]
}
```

消息顺序可以直接还原 Agent 内部行为：

1. `HumanMessage` 保存用户请求；
2. 第一条 `AIMessage` 选择 `fetch-weather`，生成参数 `{ city: "北京" }`；
3. Agent 通过 MCP Client 调用 Weather Server；
4. MCP 返回的内容被包装成 `ToolMessage`；
5. `tool_call_id` 与上一条 `tool_calls[].id` 对齐；
6. 第二条 `AIMessage` 读取工具结果，生成面向用户的最终回答。

完整链路：

```text
HumanMessage
  → AIMessage.tool_calls
  → MCP Client
  → Weather MCP Server
  → ToolMessage
  → AIMessage 最终回答
```

### 6.6 MCP 实测结论

| 观察结果 | 对应知识 |
| --- | --- |
| Math Server 由 Client 自动启动 | stdio MCP 适合本地子进程工具 |
| Weather Server 需要提前启动 | HTTP MCP Server 有独立生命周期 |
| `client.getTools()` 返回 LangChain Tools | MCP 负责工具发现与协议适配 |
| 数学任务没有调用工具 | 工具绑定不等于强制调用 |
| 天气任务出现四条消息 | Agent 自动管理 MCP 工具调用闭环 |
| MCP 工具也产生 `ToolMessage` | 进入 Agent 后与本地 Tool 的消息语义一致 |

MCP 改变的是工具的来源和通信方式，不改变模型与 Agent 的职责：

- 模型仍然只负责选择工具和生成参数；
- Agent 仍然负责执行工具、维护消息和继续调用模型；
- MCP Client 负责把 Agent 的工具调用转换成远程协议请求；
- MCP Server 负责执行真实能力并返回结果。


## 7. 从全部脚本总结 LangChain 基本使用

### 7.1 四种常见返回结构

#### 直接调用模型

```ts
const res = await llm.invoke(input);
```

返回：

```text
AIMessage {
  content,
  response_metadata,
  tool_calls,
  usage_metadata
}
```

对应脚本：

- `1.hello/index.ts`
- `2.model/1.basic.ts`
- `2.model/2.image.ts`
- `4.message/1.role.ts`
- `4.message/2.type.ts`

#### 模型层结构化输出

```ts
const result = await llm
  .withStructuredOutput(schema)
  .invoke(input);
```

返回解析后的对象：

```text
{
  dom: { ... }
}
```

对应脚本：`2.model/3.structed-output.ts`。

#### 手动 Tool Calling

```ts
const res = await llm.bindTools(tools).invoke(input);
```

模型先返回：

```text
AIMessage {
  content: "",
  tool_calls: [...]
}
```

程序执行工具后得到 `ToolMessage`。是否再次把它传给模型，由业务代码决定。

对应脚本：`3.tools/1.basic.ts`。

#### Agent

```ts
const state = await agent.invoke({ messages });
```

返回：

```text
{
  messages: [
    HumanMessage,
    AIMessage,
    ToolMessage,
    AIMessage
  ],
  structuredResponse?: { ... }
}
```

对应脚本：

- `5.agent/*.ts`；
- `6.mcp/2.mcp-client.ts`。

### 7.2 Model、Tool、Agent、MCP 如何选择

| 需求 | 推荐方式 | 原因 |
| --- | --- | --- |
| 翻译、总结、生成文本 | `llm.invoke()` | 单次模型调用足够 |
| 图片理解 | 多模态 `HumanMessage` | 一条消息可同时包含图片与文本 |
| 固定字段的数据抽取 | `withStructuredOutput()` | 一次调用直接得到 Schema 对象 |
| 完全控制工具审批和执行顺序 | `bindTools()` | 业务代码手动处理 `tool_calls` |
| 自动选择并执行多个工具 | `createAgent({ tools })` | Agent 管理工具循环 |
| Agent 最终结果必须结构化 | `createAgent({ responseFormat })` | 结果写入 `structuredResponse` |
| 工具跨进程或跨项目复用 | MCP | 工具实现与 Agent 应用解耦 |
| 需要显式分支、循环、持久化和人工确认 | LangGraph | 用状态图控制复杂工作流 |

### 7.3 最重要的职责边界

```text
Model
  负责：理解输入、生成文本、选择工具、生成工具参数
  不负责：执行本地函数、访问真实系统

Tool / MCP Server
  负责：执行真实能力并返回结果
  不负责：决定整个任务何时结束

Agent
  负责：维护 messages、执行工具、回填 ToolMessage、继续调用模型
  不负责：替代模型推理或替代工具实现

MCP Client
  负责：发现远程工具、协议转换、连接管理
  不负责：决定模型是否调用工具
```

贯穿全部实测脚本，可以得到一句最核心的结论：

> LangChain 的主线不是“调用一个模型”，而是用统一的 Message 和 Runnable 接口，把模型、结构化输出、工具执行、Agent 状态与外部 MCP 能力组织成可观察的调用链。
