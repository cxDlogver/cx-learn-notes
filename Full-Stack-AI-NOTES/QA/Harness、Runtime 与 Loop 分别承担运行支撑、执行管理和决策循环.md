# Harness、Runtime 与 Loop 分别承担运行支撑、执行管理和决策循环

**原问题：** Agent Harness、Agent Runtime 和 Agent Loop 三者是什么关系？

**回答要点：**

- Harness 是围绕模型装配上下文、工具、状态、权限和观测能力的支撑体系；Runtime 驱动一次任务实际执行；Loop 是其中反复决策、行动、观察的机制。
- 一次运行由 Harness 提供能力，Runtime 管理调用和状态，Loop 根据工具反馈继续推进或结束。
- 三者是职责抽象，不是行业统一的固定模块包含关系；Agent Loop 也不等于预先定义的业务 Workflow。

本题与[Agent System 研发知识梳理](<../A-Agent-System研发知识梳理.md>)与[Agent 完整学习教程](<../A-Agent学习教程.md>)相互参照。原问题及讲解来自[《Agent范式演进》原始资料](<../resource/Agent范式演进-原始资料.md>)，本文按问题视图完整整理；工程职责划分不冒充框架统一定义。

答辩时不建议从三个定义分别开始讲，而是按照：

**先讲结论 → 再讲三者关注的问题 → 用一次 Agent 执行串起来 → 最后说明术语边界。**

核心可以概括成：

> **Harness 强调 Agent 的整体运行支撑，Runtime 强调一次 Agent 任务如何被执行，Agent Loop 强调 Agent 在运行过程中如何持续决策和推进任务。**

---

我认为 Agent Harness、Agent Runtime 和 Agent Loop 描述的是 **Agent 系统的三个不同关注层面**，它们相互关联，但不能简单理解成三个完全并列的模块。

## 1. 三者按支撑体系、执行管理和循环机制划分职责

### 【Agent Harness：强调 Agent 的整体运行支撑体系】

一个模型本身只能进行推理，要真正完成复杂任务，还需要 Tool、Context、Memory、权限控制、状态管理、可观测性等一系列能力。Harness 的作用，就是把这些能力组织起来，形成一个能够让 Agent 持续工作的运行环境。

Microsoft Agent Framework 将 Agent Harness 描述为围绕 Agent 构建的一套运行支撑结构，用于组合 Agent、Provider、Middleware、Tools、Loops 以及 Operational Capabilities。Harness 不只关心模型调用，还会涉及工具调用、会话状态、上下文、审批策略以及多步骤任务推进。[[1]](https://learn.microsoft.com/en-us/agent-framework/concepts/harness)

DeepSeek Harness 的设计也能说明这一点。它采用微内核加插件化架构，Model Adapter、Tool Registry、Session、Sandbox、Storage、Agent Loop、Scheduling 等都可以作为 Harness 中的可组合能力。[[2]](https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/architecture.md)

因此，Harness 主要回答的问题是：

> **Agent 依靠什么运行，它具备哪些能力和运行环境？**

结合本地[Agent System 研发知识梳理](<../A-Agent-System研发知识梳理.md>)，可以把 Harness 理解为以下工程抽象：

```text
Agent Harness
├── Runtime / Agent 执行能力
├── Model Access
├── Context Management
├── Memory
├── Tool / Skill / MCP
├── Permission / HITL
├── Sandbox
├── Checkpoint
└── Trace / Observability
```

也就是说，Harness 更关注的是 **能力和运行环境的组织**。

---

### 【Agent Runtime：管理一次任务的实际执行】

Runtime 关注的不是 Agent “拥有什么能力”，而是这些能力在某一次任务运行过程中怎样真正被调度和执行起来。

例如一次 Agent 任务开始以后，通常需要经历：

```text
接收输入
   ↓
初始化并维护 State
   ↓
构建 Context
   ↓
调用 Model
   ↓
解析模型输出
   ↓
执行 Tool
   ↓
写入 Tool Result
   ↓
处理中断 / 恢复 / 超时 / 结束条件
```

这些都是运行时执行问题。

OpenAI Agents SDK 虽然主要使用 `Runner` 这一术语，而不是统一把它称作 `Agent Runtime`，但它承担的是典型的 Runtime 职责：调用当前 Agent 的模型、处理 Tool Call、处理 Handoff、判断 Final Output，以及通过最大轮数等机制控制运行边界。[[3]](https://openai.github.io/openai-agents-python/running_agents/)

因此 Runtime 主要回答：

> **Agent 的这一次任务到底怎样被运行、调度和控制？**

可以把它理解成 Agent 的 **运行执行层**。

---

### 【Agent Loop：强调 Agent 自主执行时的核心循环机制】

Agent Loop 描述的不是一个具体业务流程，而是 Agent 在一次运行过程中，怎样根据当前状态持续推进任务。

它的核心过程可以表示为：

```text
当前 Context / State
        ↓
Model 判断当前情况
        ↓
决定下一步 Action
        ↓
调用 Tool / 执行动作
        ↓
获得 Observation
        ↓
更新 State / Context
        ↓
再次调用 Model
        ↺
```

也就是：

> **决策 → 行动 → 观察 → 再决策。**

OpenAI Agents SDK 的 Runner 就体现了这一循环：模型如果产生 Tool Call，Runtime 执行工具，把 Tool Result 加回输入，再调用模型；如果模型产生 Final Output，则结束当前运行。[[3]](https://openai.github.io/openai-agents-python/running_agents/)

因此 Agent Loop 主要回答：

> **Agent 在任务运行过程中，按照什么机制不断判断下一步、执行动作，并根据反馈继续推进？**

需要特别注意，Agent Loop 不等于业务 Workflow。本地[Agent 完整学习教程](<../A-Agent学习教程.md>)通过决策权、执行拓扑和控制权归属区分这些概念。

Workflow 往往强调：

```text
Step A → Step B → 条件判断 → Step C / Step D
```

也就是开发者预先定义任务的流程结构。

而 Agent Loop 更强调：

```text
判断 → 行动 → 观察 → 再判断
```

它并不提前规定每一轮具体必须做什么，而是提供 Agent 动态推进任务的基本运行机制。

---

## 2. 一次 Agent 运行把支撑体系、执行管理与决策循环串起来

如果把三者放到一次完整 Agent 执行中，可以理解成：

```text
Agent Harness
提供完整的运行支撑和能力
Tool / Context / Memory / Permission / Trace / Sandbox ...
             ↓
Agent Runtime
启动并管理一次 Agent Run
State / Model Call / Tool Dispatch / Interrupt / Resume ...
             ↓
Agent Loop
作为核心循环持续推进任务
             ↓
Model → Action → Tool → Observation
  ↑                             │
  └─────────────────────────────┘
```

因此可以把三者的侧重点概括为：

> **Harness 关注“Agent 靠什么工作”，Runtime 关注“Agent 怎么被运行”，Agent Loop 关注“运行过程中 Agent 怎么持续推进”。**

---

## 3. 框架命名差异使三者不能被视为固定模块树

在工程理解上，可以使用：

```text
Harness
   ↓
Runtime
   ↓
Agent Loop
```

来帮助建立层级关系。

但更严谨地说，不能把它当成所有 Agent Framework 都严格遵循的固定模块包含关系。

不同框架对这些概念的命名和拆分方式并不完全相同。

例如：

- OpenAI Agents SDK 更常使用 `Runner` 来描述 Agent 的运行执行机制，而不是强制定义一个独立的 `Agent Runtime` 模块。[[3]](https://openai.github.io/openai-agents-python/running_agents/)
- Microsoft Agent Framework 的 Harness 是通过 Agent、Middleware、Tools、Loops 等 building blocks 组合形成的。[[1]](https://learn.microsoft.com/en-us/agent-framework/concepts/harness)
- DeepSeek Harness 则采用更彻底的插件化设计，连 Agent Loop 本身都可以作为插件进行替换。[[2]](https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/architecture.md)

因此更专业的说法应该是：

> **从职责抽象上，可以把 Harness、Runtime 和 Agent Loop 理解为“运行支撑体系—运行执行层—核心循环机制”三个层次；具体在代码中怎样拆分、是否严格包含，由具体 Agent Framework 的架构决定。**

---

**一句话总结**

> **Agent Harness 决定 Agent 有哪些支撑能力和运行环境，Agent Runtime 负责把一次任务真正执行起来，而 Agent Loop 是任务运行过程中驱动模型不断根据环境反馈进行“决策—行动—观察—再决策”的核心机制；三者是职责层次上的关系，而不是所有框架都必须遵循的固定模块包含关系。**

## 4. 参考文献

[1] Microsoft. [Agent Harness](<https://learn.microsoft.com/en-us/agent-framework/concepts/harness>)[EB/OL]. 核验日期：2026-10-04。

[2] DeepSeek. [DeepSeek Harness Architecture](<https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/architecture.md>)[EB/OL]. 核验日期：2026-10-04。

[3] OpenAI. [Running agents — OpenAI Agents SDK (Python)](<https://openai.github.io/openai-agents-python/running_agents/>)[EB/OL]. 核验日期：2026-10-04。
