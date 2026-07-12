# AI Agent 开发基础

## AI大模型技术基础——Transformer 架构

整体结构呈左右对称，左侧是编码器（Encoder），右侧是解码器（Decoder） 。
6层相同的子结构堆叠而成

## AI Agent 基础认知与发展史

模型 vs Agent

AI Agent 是一种能够自主感知环境状态、基于目标进行推理决策、通过工具执行行动并从结果中持续迭代优化的智能系统。其核心本质是目标导向的自主执行系统，而非被动响应输入的文本生成器。

Agent = LLM + Tools（tools、mcp、skill、cli） + Loop
Agent = LLM + Harness

### AI Agent 技术演进史

### 主流 Agent 推理范式：核心思想与对比

- ReAct
- Plan-and-Execute
- Reflexion
- Tree of Thoughts


### AI Agent 业务分类与全栈应用场景

AI 大前端全栈

- 固定工作流：工作流型智能体（固定流程 智能客服 -> 1. 用户输入 -> 2. 意图识别 -> 3. RAG 知识库 -> 4. LLM -> 5. 优化 -> 6. 返回）
- 垂类智能体，垂直业务 AI 集成
- 通用型智能体，Codex、Claude Code、OpenClaw、Hermes、Manus
    - tools 体系
    - core
    - skills
    - 沙箱


## AI Agent 核心原理拆解

Agent 的本质：状态驱动的循环执行系统

### 核心数据结构：统一消息（Message）体系

不管是用户输入的，还是模型输出的，都是作为消息

- 系统消息，SystemMessage
- 用户消息，HumanMessage
- AI 消息，AIMessage
- 工具消息，ToolMessage

### 工具（Tool）系统：Agent 的能力延伸

执行模型决策出来的动作，模型不能创建文件、模型可以分析出来调用创建文件 writeFile 的工具

### 状态（State）管理：全链路数据载体

状态是Agent执行过程中所有数据的集合，是连接各个组件的纽带。LangGraph引入了声明式状态管理系统，是其与LangChain最核心的区别之一。

### 推理循环：Agent 的核心执行逻辑

### 记忆（Memory）：跨会话的状态持久化

- 短期记忆
    - 内存
- 长期记忆
    - 数据库（结构化 postgres、向量 pgvector）
    - 文档存储

### 智能体工程化：三大核心工程方向

- Prompt Engineering（提示词工程）
- Context Engineering（上下文工程）
- Harness Engineering（执行环境工程）


## 从零实现纯 TypeScript 原生 Agent

### 如何去构建一个基础的 ReAct 范式 Agent？
构建基础 ReAct Agent 的重点不是先做复杂框架，而是先跑通“模型推理 -> 工具执行 -> 观察反馈 -> 再推理”的最小闭环。可以按以下步骤实现：
1. 实现模型调用层，把 `messages` 发送给模型 API 并返回 assistant 消息。该层对应 ReAct 中的 Reason，只处理模型输入输出，不混入工具执行、行动解析或循环控制。
2. 设计工具接口，每个工具至少包含 `name`、`description`、`parameters`、`example`、`execute`。`description` 和 `example` 帮助模型正确选择工具，`parameters` 用 zod 等 schema 做运行时参数校验，`execute` 负责真正执行外部动作并返回字符串化结果。
3. 编写 ReAct 系统提示词，明确约束模型输出协议：需要工具时输出 `思考：...` 和 `行动：工具名({"参数名":"参数值"})`；可以回答时输出 `Final Answer: ...`。这是模型推理结果与程序调度逻辑之间的通信协议。
4. 生成工具描述并注入系统提示词，把可用工具的名称、说明和参数示例提供给模型。否则模型容易调用不存在的工具，或生成不符合工具 schema 的参数。
5. 实现工具调用解析器 `parseToolCall`，从模型回复中提取 `行动：` 行，解析出工具名和 JSON 参数，形成 `{ name, args }` 结构。解析失败时不要直接中断，应把错误作为 `观察：行动解析失败...` 写回上下文，让模型按协议重新输出。
6. 实现 ReAct 主循环：初始化 `messages`，调用模型获得推理结果；如果包含 `Final Answer:` 则结束；否则解析工具调用，查找工具，校验参数，执行 `tool.execute`，再把 `观察：工具结果` 追加回 `messages`，进入下一轮 Reason。
7. 加入安全终止条件，包括最大迭代轮数、未知工具处理、参数校验失败处理、模型未输出行动也未输出最终答案时的纠偏提示。这样可以避免 Agent 陷入无限循环或执行不可控动作。
8. 用固定问题验证闭环，例如普通问答应直接输出最终答案，数学问题应调用 `calculator`，天气问题应调用 `get_weather`。验收标准是能清楚看到 Reason、Act、Observe、Final Answer 的完整执行轨迹。



## 主流 AI Agent 开发框架生态

langchain.js、langgraph.js、deepagents.js

### AI Agent 全栈技术架构形态

- Next/Nuxt
    类 Dify
- Nodejs/Nestjs
    类 Dify
- Electron
    类剪映 Vue3


## 多智能体系统与未来展望

### 常见多智能体架构模式

- 监督者模式（Supervisor-Worker）
- 协作模式（Collaboration）
- 竞争模式（Competition）
