# Harness、Runtime 与 Loop 分别承担运行支撑、执行管理和决策循环

## 回答要点

这组概念应该从“**一次 Agent 任务怎样从模型推理变成可持续、可控制的工程执行**”来理解，而不是分别背定义。

1. **Loop 解决持续推进问题。** 单次模型调用只能完成一次推理；任务需要调用 Tool、读取结果并继续判断时，就需要“Model 判断 → Action → Observation → 再判断”的循环。Loop 回答“任务为什么能够继续往下走”。
2. **Runtime 解决循环如何真正执行的问题。** Loop 只是机制描述，真正运行还需要构建 Context、调用 Model、解析 Tool Call、执行 Tool、更新 State，并处理超时、中断、恢复和停止条件。Runtime 是一次 Agent Run 的执行载体。
3. **Harness 解决 Runtime 如何进入完整工程环境的问题。** Runtime 稳定工作还依赖 Model Adapter、Context、Memory、Tool / Skill / MCP、Permission / HITL、Sandbox、Checkpoint、Trace 等公共能力。Harness 强调这些能力怎样被组织成运行支撑体系。
4. **三者最终要放回同一次 Agent Run 验证。** Runtime 从 Harness 获取模型、工具、上下文和治理能力，驱动 Model 与 Tool 执行；Tool Result 更新 State 后，Loop 决定是否进入下一轮，直到得到 Final Output 或触发停止条件。
5. **职责关系不等于固定代码包含关系。** 可以用“Loop 是循环机制、Runtime 是执行载体、Harness 是工程支撑”建立认知，但不同框架可能使用 Runner、Graph、Engine、Harness 等不同命名，也可能组合这些职责。
6. **Loop 不能与 Workflow 混淆。** Loop 解决 Agent 如何根据反馈持续决策；Workflow 解决业务步骤怎样组织和约束。确定性 Workflow 内部也可以运行 Agent Loop。

因此整篇正文的主线是：

```text
单次模型调用无法持续完成动态任务
        ↓
Loop：建立“判断—行动—观察—再判断”的持续推进机制
        ↓
Runtime：把模型调用、Tool 执行、State 与生命周期真正运行起来
        ↓
Harness：补齐 Context、Memory、Tool、权限、Checkpoint、Trace 等工程支撑
        ↓
放回一次 Agent Run 验证三者如何协作
        ↓
补充边界：职责抽象 ≠ 行业统一代码层级；Loop ≠ Workflow
```
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
