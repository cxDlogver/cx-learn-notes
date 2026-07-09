# AI Agent 开发基础

## AI大模型技术基础——Transformer 架构

整体结构呈左右对称，左侧是编码器（Encoder），右侧是解码器（Decoder） 。
6层相同的子结构堆叠而成

## AI Agent 基础认知与发展史

模型 vs Agent

doubao-2-pro、doubao-2-mini /   豆包 App
gpt-5.5                     /   Codex
claude 4.7 opus             /   claude code


AI Agent 是一种能够自主感知环境状态、基于目标进行推理决策、通过工具执行行动并从结果中持续迭代优化的智能系统。其核心本质是目标导向的自主执行系统，而非被动响应输入的文本生成器。

Agent = LLM + Tools（tools、mcp、skill、cli） + Loop

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

### 模型选择

2. 定义工具
3. 模型知道工具
4. 模型根据问题选择工具
5. 开发 agent loop 执行工具


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