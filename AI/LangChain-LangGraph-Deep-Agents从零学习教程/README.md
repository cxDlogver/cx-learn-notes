# LangChain / LangGraph / Deep Agents 从零学习教程

本项目面向 TypeScript / Node.js 开发者，沿着下面的顺序讲解 Agent 的组成、运行原理和生产边界：

```text
Chat Model 与 Message
        ↓
手写 Model ↔ Tool Loop
        ↓
LangChain createAgent
        ↓
LangGraph StateGraph / Functional API
        ↓
State、Checkpoint、Store 与 Context
        ↓
Deep Agents Harness
        ↓
Sandbox、Permission、HITL 与可观测性
        ↓
MCP Server、Adapter 与三层工作流集成
        ↓
综合实战
```

完整知识正文、代码摘要、知识点问答、综合案例和参考文献统一维护在 [核心教程.md](./核心教程.md)。

## 学习目标

完成教程后应能够：

- 解释 Model、Message、Tool、State、Memory、Runtime 和 Harness 的职责边界。
- 手写具有 Tool 分发、异常回填、停止条件和最大步数的 Agent Loop。
- 使用 LangChain 的 Chat Model、结构化输出、Tool、`createAgent()` 和 Streaming。
- 使用 LangGraph 的 StateSchema、Node、Edge、Reducer、并行、循环、Checkpoint 和 Interrupt。
- 使用 Deep Agents 的 Todo、虚拟文件、Backend、Skill、Subagent、Permission、Sandbox 和 HITL。
- 将同一组 MCP Tool 接入 LangChain Agent、LangGraph ToolNode 和 Deep Agents Harness，并说明各层职责边界。
- 通过确定性测试、轨迹评估、故障注入和业务校验验证 Agent。
- 根据任务的自主程度与确定性要求选择 Model、LangChain、LangGraph 或 Deep Agents。

## 环境配置

要求 Node.js 20 或更高版本。在项目目录安装依赖：

```bash
pnpm install
```

在 `.env` 中配置模型服务：

```dotenv
API_KEY=你的密钥
BASE_URL=https://你的模型服务/v1
LLM_MODEL=支持所需能力的模型名称
MODEL_TIMEOUT_MS=120000
HITL_AUTO_DECISION=reject
```

密钥只能来自环境变量或 Secret Manager，不能写入源码、教程、日志或提交到 Git。

## 配套脚本

脚本编号与《核心教程》的知识顺序一致：

| 顺序 | 命令 | 源码 | 主要内容 | 默认是否调用模型 |
|---:|---|---|---|---:|
| 01 | `pnpm lesson:model -- invoke` | [01-chat-model.ts](./src/01-chat-model.ts) | `invoke()`、`stream()`、`batch()` 与 AIMessage | 是 |
| 02 | `pnpm lesson:messages` | [02-langchain-messages.ts](./src/02-langchain-messages.ts) | Message 结构、Content Block、Tool Calling 消息 | 否 |
| 03 | `pnpm lesson:manual-agent -- invoke` | [03-manual-agent-loop.ts](./src/03-manual-agent-loop.ts) | 手写 Agent Loop、异常 ToolMessage、最大步数 | 是 |
| 04 | `pnpm lesson:agent -- updates` | [04-langchain-agent.ts](./src/04-langchain-agent.ts) | `createAgent()`、步骤流和 Event Streaming | 是 |
| 05 | `pnpm lesson:structured-output -- zod` | [05-structured-output.ts](./src/05-structured-output.ts) | Zod、Model 与 Agent 结构化输出 | `zod` 模式否 |
| 06 | `pnpm lesson:langgraph-stategraph` | [06-langgraph-stategraph.ts](./src/06-langgraph-stategraph.ts) | StateSchema、Node、Edge、Reducer 与条件路由 | 否 |
| 07 | `pnpm lesson:langgraph-entrypoint -- all` | [07-langgraph-entrypoint.ts](./src/07-langgraph-entrypoint.ts) | Functional API、`entrypoint()` 与 `task()` | 否 |
| 08 | `pnpm lesson:langgraph-advanced -- all` | [08-langgraph-advanced.ts](./src/08-langgraph-advanced.ts) | 并行、ToolNode、Subgraph、Interrupt | 否 |
| 09 | `pnpm lesson:state-memory -- local` | [09-state-memory.ts](./src/09-state-memory.ts) | State、Checkpoint、Store、Context 与 ToolRuntime | 否 |
| 10 | `pnpm lesson:deepagents-workflow -- inspect` | [10-deepagents-workflow.ts](./src/10-deepagents-workflow.ts) | Todo、虚拟文件、Skill、Subagent 与 Harness | `inspect` 模式否 |
| 11 | `pnpm lesson:deepagents-advanced -- all` | [11-deepagents-advanced.ts](./src/11-deepagents-advanced.ts) | Sandbox、Permission、HITL 与事件流 | 否 |
| 12 | `pnpm lesson:mcp -- all` | [12-mcp-workflow.ts](./src/12-mcp-workflow.ts) | MCP 协议边界及 LangChain、LangGraph、Deep Agents 接入对比 | 否 |

各脚本支持的子模式、输入输出结构与知识解释见 [核心教程.md](./核心教程.md)。

## 验证

先运行不调用真实模型的检查：

```bash
pnpm typecheck
pnpm test:offline
pnpm test:structured-output
pnpm lesson:langgraph-stategraph
pnpm lesson:langgraph-advanced -- all
pnpm lesson:deepagents-advanced -- all
pnpm lesson:mcp -- all
```

再按需运行需要模型服务的示例。模型输出具有随机性，验收重点不是逐字一致，而是 Message 序列、Tool 参数、State 更新、权限、审批和事实引用是否满足约束。

## 目录结构

```text
.
├── README.md
├── 核心教程.md
├── src/
│   ├── 01-...ts 至 12-...ts
│   └── shared/          公共模型、环境、Tool 和输出函数
├── tests/               离线确定性验证
├── package.json
└── tsconfig.json
```
