# Harness、Runtime 与 Loop 分别承担运行支撑、执行管理和决策循环

## 【知识概述】

**Agent Loop、Runtime 和 Harness 分别回答三个相连的问题：任务怎样根据反馈持续推进，谁把这些步骤真正执行起来，以及执行时有哪些公共能力提供支撑。** 三者可以用来分析同一次 Agent 运行，但它们描述的是不同职责。先理解一次任务实际怎样完成，再看这些名称，才容易分清它们的关系。

### 【从一次模型调用到持续完成任务】

假设用户要求“修复项目中登录失败的问题，并验证修复”。一次模型调用可以分析已经提供的代码，也可以输出修改建议，但模型输出一段建议，并不意味着项目文件已经改变。系统还需要提供读文件、修改文件和运行测试的**工具（Tool）**，让模型提出的操作能够由程序实际执行。

第一次读完文件以后，模型可能发现信息不足，需要继续查看接口；修改以后，测试又可能暴露另一个问题。这些信息在任务开始时并不全部已知，因此系统需要把行动结果交回模型，让它决定下一步。**Agent Loop（决策循环）**就是这种“判断 → 行动 → 观察结果 → 再判断”的持续推进机制。循环可能因完成任务、达到轮数或预算上限、需要用户补充信息等原因停止，并不意味着模型会无限自主运行。

### 【Runtime 负责把循环变成真实执行】

Loop 描述了循环规律，**Agent Runtime（运行时）**则负责实际调度。模型提出“读取登录文件”时，Runtime 需要识别工具名称和参数，调用对应程序，接收文件内容，把结果写入运行状态，再组织下一次模型调用。模型不会因为生成了工具调用文本，就自动获得操作文件的能力。

这里有两个容易混淆的概念：**Context（上下文）**是本轮实际送给模型的信息，例如用户目标、有关代码和最近的测试结果；**State（运行状态）**是系统保存的任务事实，例如当前阶段、已调用的工具和待处理操作。Runtime 可以从 State 中选取信息构建 Context，但模型每轮看到的 Context 不必包含全部 State。

```text
用户提出修复目标
  → Runtime 组织上下文并调用模型
  → 模型提出读取文件等动作
  → Runtime 调用工具，接收结果并更新状态
  → 结果成为下一轮判断的依据
  → 继续修复、测试，或按条件停止

反复判断和行动的机制：Loop
组织并执行每一轮的程序：Runtime
为整个过程提供公共能力的体系：Harness
```

### 【Harness 提供运行所需的支撑能力】

真实项目通常不只需要工具调度，还需要统一接入模型、管理可用工具、限制文件访问、保存中断位置、记录执行过程。**Agent Harness（运行支撑体系）**是对这些能力及其组织方式的较宽泛称呼：它把模型接入、上下文组织、工具、状态及执行控制等能力组合起来，使模型能够作为 Agent 完成工作。不同框架提供的能力和组合方式可能不同。[[1]](https://learn.microsoft.com/en-us/agent-framework/concepts/harness)

在登录修复任务中，权限机制决定允许修改哪些文件；**Sandbox（沙箱）**限制代码执行可影响的环境；**Checkpoint（检查点）**保存框架支持恢复的执行状态；**Trace（执行追踪）**把模型调用和工具操作关联成可查询的记录。这些机制都支持任务运行，但各自解决不同问题。例如，有 Trace 能帮助排查失败，不等于已经有可恢复的 Checkpoint。

### 【如何判断三者的边界】

判断一个模块属于哪种职责，可以看它主要回答什么问题：“下一步是否继续判断”偏向 Loop；“怎样发起调用、接收结果和推进状态”偏向 Runtime；“怎样统一提供工具、权限、存储和观测能力”偏向 Harness。同一模块可能同时承担多种职责，因此不能只按类名或文件夹名归类。

这里采用的是便于理解的工程职责划分。某个框架可能把 Runtime 直接组织在 Harness 中，也可能把循环设计成可替换组件，并不存在所有框架共同遵守的固定包含层级。掌握三者关系以后，再读正文中的运行流程和框架对应关系，就能把具体实现放回“持续决策、实际执行、运行支撑”这条主线上。

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
