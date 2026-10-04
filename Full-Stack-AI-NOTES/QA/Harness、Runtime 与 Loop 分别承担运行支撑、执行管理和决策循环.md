# Harness、Runtime 与 Loop 分别承担运行支撑、执行管理和决策循环

## 【知识概述】

这篇知识点想讲清楚的是：**模型的一次推理调用，怎样逐步变成一个能够持续决策、执行动作并被工程系统管理的 Agent 运行过程。** 理解这个问题时，不需要先把 Harness、Runtime、Loop 当成三个独立名词背诵，而应该从一次任务真正运行时缺少什么开始。

模型首先只能完成一次输入到输出的推理。如果任务需要调用 Tool，并根据 Tool Result 决定下一步，那么一次调用就不够了，系统需要不断重复“判断 → 行动 → 获得结果 → 再判断”。这就是 **Agent Loop** 解决的问题：它描述 Agent 持续推进任务的基本决策机制。

但 Loop 只说明“应该循环”，并不会自己完成模型调用和工具执行。真正运行时还要构建 Context、调用 Model、解析 Tool Call、执行 Tool、更新 State，并判断什么时候结束、什么时候中断或恢复。这些执行职责构成 **Agent Runtime**。因此可以先建立一个简单关系：

```text
Loop
描述 Agent 怎样持续决策
        ↓
Runtime
负责把这个决策循环真正执行起来
```

Runtime 进入真实工程环境后，又会继续遇到问题：模型从哪里接入，Context 和 Memory 怎样组织，Tool 怎样注册，权限怎样控制，代码在哪里隔离执行，任务怎样 Checkpoint，执行过程怎样 Trace。把这些运行所需的公共能力组织起来，就是这里所说的 **Agent Harness**。

```text
一次 Agent Run
        │
        ├─ Loop：持续决策
        │   Model → Action → Observation → Model ...
        │
        ├─ Runtime：执行管理
        │   Context → Model Call → Tool → State → Lifecycle
        │
        └─ Harness：运行支撑
            Model / Context / Memory / Tool
            Permission / Sandbox / Checkpoint / Trace ...
```

所以这篇正文真正建立的是一套“**持续决策—实际执行—工程支撑**”的理解方式。后面会分别解释三者职责，再把它们放回一次 Agent Run 中观察如何协作，并说明不同框架可能采用不同命名和代码组织，不能把这里的职责抽象误认为统一的行业代码层级。

这组概念也会自然连接到其他知识点：Context 是 Runtime 每轮调用模型时需要组织的输入；Tool / MCP 是 Runtime 可以调度的外部能力；State 和 Checkpoint 与执行状态和恢复有关；Permission、HITL、Sandbox 进一步进入 Agent Governance；Trace 进入 Observability；当一次 Run 扩展成长时间任务时，又会继续涉及持久化、故障恢复和 Workflow / Orchestration。**这些都是从当前知识点向外延伸的关系，不代表当前文档已经定义了完整的 Agent 工程体系。**

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
