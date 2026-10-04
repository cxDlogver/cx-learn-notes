# 问题：Agent Harness、Agent Runtime 和 Agent Loop 三者是什么关系？

## 回答思路

答辩时不建议从三个定义分别开始讲，而是按照：

**先讲结论 → 再讲三者关注的问题 → 用一次 Agent 执行串起来 → 最后说明术语边界。**

核心可以概括成：

> **Harness 强调 Agent 的整体运行支撑，Runtime 强调一次 Agent 任务如何被执行，Agent Loop 强调 Agent 在运行过程中如何持续决策和推进任务。**

---

## 标准回答

我认为 Agent Harness、Agent Runtime 和 Agent Loop 描述的是 **Agent 系统的三个不同关注层面**，它们相互关联，但不能简单理解成三个完全并列的模块。

### 1. Agent Harness：强调 Agent 的整体运行支撑体系

一个模型本身只能进行推理，要真正完成复杂任务，还需要 Tool、Context、Memory、权限控制、状态管理、可观测性等一系列能力。Harness 的作用，就是把这些能力组织起来，形成一个能够让 Agent 持续工作的运行环境。

Microsoft Agent Framework 将 Agent Harness 描述为围绕 Agent 构建的一套运行支撑结构，用于组合 Agent、Provider、Middleware、Tools、Loops 以及 Operational Capabilities。Harness 不只关心模型调用，还会涉及工具调用、会话状态、上下文、审批策略以及多步骤任务推进。[[1]](https://learn.microsoft.com/en-us/agent-framework/)

DeepSeek Harness 的设计也能说明这一点。它采用微内核加插件化架构，Model Adapter、Tool Registry、Session、Sandbox、Storage、Agent Loop、Scheduling 等都可以作为 Harness 中的可组合能力。[[2]](https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/architecture.md)

因此，Harness 主要回答的问题是：

> **Agent 依靠什么运行，它具备哪些能力和运行环境？**

从工程抽象上，可以把 Harness 理解为以下结构；这一抽象与材料《agent_development_two_contexts_2026.md》中的 Agent System 划分一致。[[4]](#参考文献)

从工程抽象上，可以把 Harness 理解为：

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

### 2. Agent Runtime：强调一次 Agent Run 怎样真正被执行

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

### 3. Agent Loop：强调 Agent 自主执行时的核心循环机制

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

需要特别注意，Agent Loop 不等于业务 Workflow。材料《Agent学习教程.md》也通过 Workflow、Single-Agent 和 Multi-Agent 的控制权差异对这一点进行了区分。[[5]](#参考文献)

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

## 三者之间的关系

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

## 术语边界：不要把三者理解成行业统一的固定模块树

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
- Microsoft Agent Framework 的 Harness 是通过 Agent、Middleware、Tools、Loops 等 building blocks 组合形成的。[[1]](https://learn.microsoft.com/en-us/agent-framework/)
- DeepSeek Harness 则采用更彻底的插件化设计，连 Agent Loop 本身都可以作为插件进行替换。[[2]](https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/architecture.md)

因此更专业的说法应该是：

> **从职责抽象上，可以把 Harness、Runtime 和 Agent Loop 理解为“运行支撑体系—运行执行层—核心循环机制”三个层次；具体在代码中怎样拆分、是否严格包含，由具体 Agent Framework 的架构决定。**

---

### 一句话总结

> **Agent Harness 决定 Agent 有哪些支撑能力和运行环境，Agent Runtime 负责把一次任务真正执行起来，而 Agent Loop 是任务运行过程中驱动模型不断根据环境反馈进行“决策—行动—观察—再决策”的核心机制；三者是职责层次上的关系，而不是所有框架都必须遵循的固定模块包含关系。**

# 问题：Agent 范式逐渐成熟后，研发重点正在发生什么变化？

我们在学习Agent的时候， 还是要更多的考虑Agent的底层原理和设计， 而不要被层出不穷的概念限制。 

当前Agent正处于快速发展和高速迭代的环境， 不断有新的概念被提出来， 但是新的概念并不一定是新的技术， 很多时候是对当前Agent研究重点的一种概括， 在模型能力不足时， 为了能够稳定高效的完成任务而考虑研究设计一些方法， 随着基础模型能力的提升和目标的不断深入，一些范式逐渐成熟， 一些特定环境下所设计的方法也不再成为研究的重点， 因此AGent 的研发重点也不断的再变化。

比如 可以先把这个变化理解成：

```
Prompt Engineering
重点：怎样把指令写清楚
        ↓
Context Engineering
重点：这一轮模型应该看到什么
        ↓
Harness Engineering
重点：怎样组织环境、工具、状态和反馈，
      让 Agent 能够持续完成任务
```

## 1. Prompt Engineering 正在从“核心技巧”变成基础能力

Prompt Engineering 主要解决的是：

> **怎样通过合适的指令，让模型理解任务并产生期望的行为。**

在早期模型能力有限的时候，Prompt 的具体格式和写法会显著影响结果，因此会出现大量角色设定、步骤拆分、Few-shot（少样本示例）和格式约束等技巧。

但随着模型能力增强，这类具体格式的重要性正在下降。

Anthropic 在关于 Context Engineering 的文章中明确指出：

> “the exact formatting of prompts is likely becoming less important”

即：

> **Prompt 的具体格式正在变得没那么重要。** [[1]](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents)

也就是 Markdown 格式还是 XML格式， 或者写法顺序不再重要，模型完全可以从输入中识别信息。

 另一方面，各种Prompt的范式逐渐成熟固定下来，比如 角色设定、步骤拆分、Few-shot（少样本示例）， 思维链等等。



因此 Prompt 逐渐收敛为更基础的工程原则：指令清晰、目标明确、边界明确，并根据真实失败案例补充必要约束。

## 2. Context Engineering 是 Prompt Engineering 的进一步扩展

当 Agent 开始执行多轮任务以后，仅仅设计 Prompt 已经不够。

模型在一次决策中看到的不只有 System Prompt（系统提示词），还可能包括：

```text
System Instructions
用户输入
历史消息
Tool 描述
Tool Result
Memory
检索结果
业务数据
当前任务状态
```

因此真正的问题变成：

> **这一轮模型应该看到什么信息？**

Anthropic 将 Context Engineering（上下文工程）描述为：

> “the set of strategies for curating and maintaining the optimal set of tokens”

即：

> **在模型推理过程中，选择和维护最合适的一组信息。** [[1]](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents)

Anthropic 也把 Context Engineering 称为 Prompt Engineering 的：

> “natural progression”

即 **自然演进**。[[1]](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents)

Prompt 本身只是 Context 的一部分。

```text
Context Engineering
      │
      ├── Prompt / Instructions
      ├── Message History
      ├── Tool
      ├── Memory
      ├── Retrieval
      ├── State
      └── External Data
```

## 3. Context Engineering 与上下文管理体系

### 【Context Engineering 的背景与目标】

Agent 在多轮执行任务时，模型每一轮需要看到的信息已经不只是当前的 User Prompt（用户输入）。

为了让模型理解当前任务，需要同时补充多种信息，例如：

```text
System Instructions
系统指令

User Prompt
当前用户输入

Message History
历史消息

State
当前任务状态

Memory
历史记忆

Tool Result
工具执行结果

Retrieved Information
检索得到的信息

Available Tools
当前可用工具
```

因此，Agent 的模型输入本质上是一个**动态构建的 Context（上下文）**，而不是单独的一条 Prompt。

另一方面，Context 并不是越多越好。Anthropic 将随着 Context 增长、模型利用关键信息能力下降的现象称为 `context rot`。即使 Context Window（上下文窗口）越来越大，模型仍然存在有限的 Attention Budget（注意力预算）。

因此，Context Engineering 的目标不是尽可能扩大 Context，而是：

> **在有限的 Context Window 中，把当前决策真正需要的信息提供给模型，同时减少无关、重复和过时的信息。**

Anthropic 将这一原则概括为：

> “the smallest possible set of high-signal tokens”

即：

> **尽可能使用最少、但信息价值最高的一组 Token。** [[1]](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents)

### 【从 User Prompt 到 Model Context 的构建链路】

可以把一次模型调用前的 Context 构建过程抽象为：

```text
User Prompt
     ↓
Runtime 接收任务
     ↓
Candidate Context
候选上下文
     │
     ├─ Instructions
     ├─ History
     ├─ State
     ├─ Memory
     ├─ Tool Result
     ├─ Files / Knowledge
     └─ Available Tools
     ↓
Context Management
     ↓
Select / Retrieve / Filter
Trim / Compact / Tool Selection
     ↓
Model Context
     ↓
Model
     ↓
Decision / Tool Call
     ↓
Tool Result
     ↓
Update State
     ↓
下一轮重新构建 Context
```

这里的 `Context Management` 并不是一种单一算法，而是一组上下文处理机制。

核心问题是：

> **哪些信息应该直接进入 Context，哪些应该筛选，哪些应该让模型按需获取。**

### 【Context 的三类构建机制】

Context Builder 在实际工程中通常不会完全依赖规则，也不会完全依赖模型，而是采用：

```text
确定性代码
+
规则 / 检索
+
模型自主判断
```

三种方式共同构建 Context。

#### <u>1. 固定必要信息由代码直接加入</u>

有些信息是否进入 Context 不存在歧义，例如：

```text
System Instructions
当前 User Prompt
安全规则
关键业务约束
当前任务核心状态
```

这些通常由 Runtime 或 Context Builder 直接加入。

例如：

```text
Model Context
=
System Instructions
+
Current User Input
+
Required Task State
```

这一类适合处理：

> **模型每一轮都必须知道的信息。**

它们通常由代码、配置或 Policy（策略规则）决定，而不应该让模型自己选择。

#### <u>2. 可明确判断的信息由规则和检索处理</u>

第二类信息是否进入 Context，可以通过明确规则判断。

例如：

```text
只保留最近 N 条消息

历史 Token 超过阈值
→ 压缩旧消息

Memory 已过期
→ 不再加载

用户没有权限
→ 不暴露对应 Tool

当前进入测试阶段
→ 加载测试相关 Tool
```

这类机制本质上是：

```text
Candidate Context
      ↓
Rule / Policy / Retrieval
      ↓
Relevant Context
```

其中 Retrieval（检索）可以是：

- 关键词搜索；
- 向量检索；
- 文件搜索；
- 数据库查询；
- RAG（Retrieval-Augmented Generation，检索增强生成）。

这一层适合处理：

> **能够提前定义筛选条件的信息。**

#### <u>3. 无法提前判断的信息由模型按需获取</u>

还有一类信息，开发者无法提前判断模型到底需要什么。

例如用户要求：

```text
定位登录 Bug。
```

系统并不知道 Agent 下一步一定需要：

```text
login.ts
session.ts
auth.ts
login.test.ts
```

如果提前把所有相关文件全部加载到 Context，会快速造成信息膨胀。

因此更常见的方式是：

```text
先给模型信息入口
        ↓
模型判断缺什么
        ↓
调用 Search / Read Tool
        ↓
Runtime 获取信息
        ↓
Tool Result 加入下一轮 Context
```

这就是 Anthropic 所说的：

> **Just-in-time Context（即时上下文）**

即：

> **只有真正需要某项信息时，再把它加载进 Context。** [[1]](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents)

例如：

```text
User:
定位登录失败的问题
     ↓
Model:
需要先找到登录相关代码
     ↓
search_code("login")
     ↓
Tool Result:
src/auth/login.ts
src/auth/session.ts
     ↓
Model:
继续读取 session.ts
     ↓
read_file("src/auth/session.ts")
```

所以这里不是 Context Builder 提前预测所有信息，而是：

> **Context Builder 提供访问能力，模型根据任务状态自主决定需要获取什么。**

### 【渐进式上下文展开】

Just-in-time Context 通常会和 Progressive Disclosure（渐进式展开）一起使用。

核心思想不是：

```text
一开始把完整资料全部告诉 Agent
```

而是：

```text
先告诉 Agent：
有哪些资料
资料在哪里

真正需要时：
再继续读取具体内容
```

OpenAI 在 Codex Harness Engineering 中将这个原则概括为：

> “give Codex a map, not a 1,000-page instruction manual”

即：

> **给 Agent 一张地图，而不是一本一千页的说明书。** [[4]](https://openai.com/index/harness-engineering/)

这里的“Map（地图）”不是一种特殊的数据结构，而是**信息导航入口**。

例如：

```text
AGENTS.md

Architecture
→ ARCHITECTURE.md

Frontend
→ docs/FRONTEND.md

Security
→ docs/SECURITY.md

Current Plans
→ docs/exec-plans/active/
```

Agent 一开始只需要知道：

```text
有哪些信息
+
信息在哪里
```

真正处理前端任务时再读取：

```text
docs/FRONTEND.md
```

处理安全问题时再读取：

```text
docs/SECURITY.md
```

因此，Map 的核心作用是：

> **把“详细知识”留在外部，把“知识入口和结构”放进 Context。**

### 【长上下文的裁剪与压缩】

随着 Agent Loop 不断执行，历史消息、Tool Result 和检索结果会持续增加。

因此还需要解决：

> **哪些内容继续保留，哪些内容可以移除或压缩。**

这一部分通常采用“规则 + 模型”结合的方式。

#### <u>1. 规则裁剪低价值信息</u>

比较容易判断的低价值内容，可以通过规则直接删除，例如：

```text
重复消息
重复检索结果
已经失效的状态
很久以前的大型 Tool Result
无关日志
已经完成的临时步骤
```

例如：

```text
Tool Result:
3000 行源码
```

如果 Agent 已经从中确认：

```text
login() 缺少 session 校验
```

后续就未必需要继续保留完整 3000 行源码，只需要保留这个关键结论。

因此：

```text
Raw Evidence
大量原始信息
      ↓
提取关键结论
      ↓
删除低价值原文
```

#### <u>2. 模型压缩复杂历史</u>

如果历史内容复杂，无法通过简单规则判断重要性，就可以使用模型进行 Summarization / Compaction（摘要 / 上下文压缩）。

压缩时主要保留：

```text
Current Goal
当前目标

Constraints
关键约束

Confirmed Facts
已经确认的事实

Important Decisions
关键决定

Completed Work
已经完成的工作

Current State
当前执行状态

Open Issues
未解决的问题

Next Step
下一步
```

而减少：

```text
重复讨论
中间过程
已经失效的数据
大量原始 Tool Result
```

因此 Compaction 的本质并不是：

> **把文本简单缩短。**

而是：

> **在减少 Token 的同时，尽可能保持任务继续执行所需要的信息。**

### 【Tool 作为 Context 的一部分】

Context Management 还需要管理 Tool。

模型能够看到的：

```text
Tool Name
Tool Description
Parameter Schema
```

本身也会占用 Context。

因此：

```text
Agent 拥有 100 个 Tool
```

并不意味着：

```text
每一轮都应该向 Model 暴露 100 个 Tool
```

更合理的是：

```text
All Tools
   ↓
根据：
用户权限
当前任务
任务阶段
当前 State
   ↓
Tool Filtering
   ↓
Selected Tools
```

因此 Tool Management 本身也是 Context Engineering 的一部分。

### 【Model Context 的最终消息结构】

经过前面的选择、检索、裁剪和压缩以后，信息最终需要变成模型可以接收的消息。

以 LangChain 当前的消息体系为例，主要包括四类：[[5]](https://docs.langchain.com/oss/python/langchain/messages)

```text
SystemMessage
系统指令

HumanMessage
用户消息

AIMessage
模型之前的输出，
也可以包含 Tool Call

ToolMessage
Tool 执行结果
```

例如：

```text
SystemMessage
"你是 Coding Agent，需要先确认原因再修改代码。"

HumanMessage
"定位登录失败的问题。"

AIMessage
tool_call: search_code("login")

ToolMessage
"src/auth/login.ts
 src/auth/session.ts"

AIMessage
tool_call: read_file("src/auth/session.ts")

ToolMessage
"<相关源码>"

AIMessage
"已经定位到 session 校验问题。"
```

需要注意：

> **State、Memory、Retrieval 并不是新的 Message 类型。**

它们是信息来源。

这些信息经过 Context Builder 处理以后，最终才会转成：

```text
SystemMessage
HumanMessage
AIMessage
ToolMessage
```

进入 Model Context。

### 【Context Management 的统一模型】

因此，可以把整个 Context Engineering 收敛成下面这个结构：

```text
                         User Prompt
                              ↓
                       Runtime / State
                              ↓
                    Candidate Context
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
        ↓                     ↓                     ↓
  固定必要信息           可规则判断的信息        不确定的信息
 Instructions           History / State        Files / Knowledge
 Current Input          Tool / Memory          External Data
        │                     │                     │
        ↓                     ↓                     ↓
      Code             Rule / Retrieval         Model + Tool
        │                     │                     │
        └─────────────────────┼─────────────────────┘
                              ↓
                     Context Management
                  Select / Retrieve / Filter
                     Trim / Compact
                              ↓
                       Model Context
                              ↓
               System / Human / AI / Tool
                              ↓
                            Model
                              ↓
                      Decision / Tool Call
                              ↓
                         Tool Result
                              ↓
                         Update State
                              ↓
                     下一轮重新构建 Context
```

这套体系最核心的设计原则可以压缩成一句话：

> **确定的信息交给代码，能够明确判断的信息交给规则和检索，无法提前判断的信息交给模型通过 Tool 按需探索；随着 Context 增长，再通过裁剪和压缩保留继续完成任务真正需要的信息。**

### 参考资料补充

[[4]] OpenAI. *Harness engineering: leveraging Codex in an agent-first world* [EB/OL].  
https://openai.com/index/harness-engineering/

[[5]] LangChain. *Messages* [EB/OL].  
https://docs.langchain.com/oss/python/langchain/messages

## 4. 业务上下文准备与 Agent 内部 Context Engineering

### 【两层架构的基本边界】

前面把 Agent 开发分成业务工作流层和 Agent 层以后，还需要进一步区分两类“上下文处理”问题：

```text
业务工作流层
解决：
“要把什么任务、什么业务信息交给 Agent？”

                ↓

Agent Harness 层
解决：
“Agent 在这一轮调用模型时，
到底应该让模型看到什么？”
```

这两个问题相关，但并不是同一个问题。

Anthropic 对 Context Engineering（上下文工程）的定义是：

> “curating and maintaining the optimal set of tokens (information) during LLM inference”

即：

> **在模型推理过程中，选择和维护最合适的一组信息。** [[1]](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents)

因此，从这个定义出发，严格意义上的 Context Engineering 更适合放在 Agent Harness 内部：它最终决定每一次 Model Call（模型调用）中，哪些信息真正进入模型的 Context Window。

而业务 Workflow 在调用 Agent 之前进行的消息整理、状态准备、产物持久化等工作，更适合称为：

> **Business Context Preparation（业务上下文准备）**

或者：

> **Task Context Preparation（任务上下文准备）**

不建议把这一整层直接称为 `Content Engineering`。`Content Engineering` 目前并不是 Anthropic、OpenAI、LangChain 等主流 Agent 框架对这一层的统一术语，而且 “Content” 更容易被理解为文档、知识和内容本身的结构化，难以完整覆盖任务状态、权限、Workflow State（工作流状态）等运行信息。

### 【业务工作流层的任务输入准备】

业务工作流层首先面对的是一个业务任务，而不是一次模型调用。

例如：

```text
用户提交需求
        ↓
业务 Workflow
        ↓
Requirement Agent
        ↓
Coding Agent
        ↓
Testing Agent
```

当 Workflow 要调用 Coding Agent 时，不能只传递：

```text
“帮我开发这个需求”
```

Coding Agent 还可能需要：

```text
原始需求
前一个 Agent 的分析结果
技术方案
当前 Workflow 状态
相关文件或文档入口
业务规则
用户权限
验收标准
需要产出的结果类型
```

因此，在调用 Agent 之前，需要由业务层把相关信息整理成一个相对完整的任务输入。

可以抽象为：

```text
Business Event / User Request
            ↓
      Workflow Processing
            ↓
Business Context Preparation
            │
            ├─ 当前任务目标
            ├─ 用户原始输入
            ├─ Workflow State
            ├─ 上游任务结果
            ├─ Artifact References
            ├─ 业务规则 / 权限
            ├─ 输出要求
            └─ 其他任务元数据
            ↓
        Agent Input
```

这里可以引入一个用于工程理解的抽象：

> **Task Package（任务包）**

它不是行业规定的标准对象，而是用于表示：

> **业务 Workflow 为某个 Agent 准备的一组完整任务输入。**

例如：

```text
Task Package

Goal
→ 完成登录模块开发

User Request
→ 用户原始需求

Workflow State
→ 当前处于 Coding 阶段

Artifacts
→ requirement.md
→ technical-design.md

Constraints
→ 不允许修改认证协议

Acceptance Criteria
→ login.test.ts 全部通过

Output Contract
→ 代码修改 + 测试结果
```

### 【持久化产物与跨阶段信息传递】

业务工作流层还有一个重要职责：

> **把跨阶段需要继续使用的信息沉淀为 Artifact（持久化产物）。**

例如：

```text
Requirement Agent
        ↓
requirement.md
        ↓
Technical Agent
        ↓
technical-design.md
        ↓
Coding Agent
        ↓
code changes
        ↓
Testing Agent
        ↓
test-report.md
```

Workflow 不应该依赖：

```text
Agent A 的完整对话历史
        ↓
全部复制给 Agent B
```

更合理的是把关键结果沉淀成：

```text
Document
File
Structured State
Database Record
Artifact
```

再把这些内容的引用或入口传递给下一个 Agent。

例如：

```text
Coding Agent Input

goal:
完成需求实现

artifacts:
- requirement.md
- technical-design.md

state:
coding

acceptance:
- login test must pass
```

这里需要明确：

> **Task Package 中存在的信息，并不意味着这些信息全部进入 Model Context。**

这正是业务工作流层和 Agent Harness 层之间的重要边界。

### 【Agent Harness 层的 Model Context 构建】

当 Task Package 被交给 Agent 后，进入 Agent Harness 层。

此时 Agent 面临的问题从：

> “我要执行什么任务？”

进一步变成：

> **“为了完成这个任务，这一轮模型真正需要看到什么？”**

例如 Workflow 交给 Coding Agent：

```text
Task Package
│
├─ requirement.md
├─ technical-design.md
├─ 100 个代码文件
├─ 用户权限
├─ Workflow State
├─ 历史测试记录
└─ Acceptance Criteria
```

Agent 不应该把所有内容一次全部塞进 Model Context。

而应该通过 Harness 内部的 Context Engineering 进行进一步处理：

```text
Task Package
      +
Agent State
      +
Memory
      +
Tools
      +
Tool Results
      +
Retrieved Information
          ↓
     Context Builder
          ↓
Select / Retrieve / Filter
Trim / Compact
          ↓
      Model Context
          ↓
         Model
```

例如第一轮可能只需要：

```text
System Instructions
+
当前 Goal
+
Requirement Summary
+
Technical Design
+
Acceptance Criteria
+
代码搜索 Tool
```

模型判断需要查看登录相关代码后，再通过：

```text
search_code("login")
```

获取对应文件，相关代码才进入下一轮 Model Context。

这就是前一节讨论的 Context Engineering。

### 【业务 Context、Runtime Context 与 Model Context】

这两层架构中，可以进一步区分三个不同范围：

| 层级                        | 保存 / 处理的内容                      | 主要目标               |
| --------------------------- | -------------------------------------- | ---------------------- |
| Business / Workflow Context | 完整业务任务信息                       | 保证任务能够跨阶段传递 |
| Agent Runtime Context       | Agent 执行所需的状态、权限、配置和引用 | 支撑 Agent 运行        |
| Model Context               | 当前这一轮模型真正看到的信息           | 支撑当前决策           |

LangChain 的 Context Engineering 文档也区分了 Runtime Context 与真正进入 Model Context 的信息：运行时可以保存用户信息、权限、配置等状态，但只有在 Prompt、Message、Tool 或 Middleware 等环节中显式加入后，模型才会看到这些信息。[[6]](https://docs.langchain.com/oss/python/langchain/context-engineering)

因此：

```text
系统中存在的信息
        ≠
Agent Runtime 保存的信息
        ≠
Model 当前看到的信息
```

### 【两层之间的 Agent 调用契约】

为了让业务工作流层和 Agent 层保持清晰边界，两层之间最好通过稳定的调用接口连接。

可以抽象为：

> **Agent Invocation Contract（Agent 调用契约）**

业务 Workflow 不需要知道 Agent 内部的 Agent Loop、Context Builder、Memory 和 Tool 如何工作，只负责：

```text
Agent.execute(task)
```

其中 `task` 可以包含：

```text
AgentTask

goal
input
constraints
artifact_refs
workflow_state
permissions
output_contract
```

Agent 内部则负责：

```text
读取 Task
    ↓
初始化 Runtime State
    ↓
构建 Context
    ↓
Model 推理
    ↓
Tool Call
    ↓
更新 Context / State
    ↓
继续 Agent Loop
    ↓
输出 Result
```

最后返回：

```text
AgentResult

status
result
artifacts
evidence
next_action
```

业务 Workflow 再决定：

```text
持久化哪些结果
        ↓
下一步调用哪个 Agent
        ↓
是否进入人工审批
        ↓
是否结束 Workflow
```

### 【两层 Agent 架构的统一模型】

可以将整体结构统一为：

```text
                     Business Workflow Layer
┌────────────────────────────────────────────────────┐
│                                                    │
│ User Request / Business Event                      │
│                ↓                                   │
│ Workflow Orchestration                             │
│                ↓                                   │
│ Business Context Preparation                       │
│                                                    │
│ ├─ 整理任务目标                                    │
│ ├─ 获取 Workflow State                            │
│ ├─ 获取上游 Agent 结果                             │
│ ├─ 持久化 / 获取 Artifact                         │
│ ├─ 补充权限和业务约束                              │
│ └─ 定义 Output Contract                           │
│                ↓                                   │
│            Task Package                            │
│                                                    │
└───────────────────────┬────────────────────────────┘
                        │
                 Agent Invocation
                        │
                        ↓
                     Agent Layer
┌────────────────────────────────────────────────────┐
│                  Agent Harness                     │
│                                                    │
│ Task Package                                       │
│      +                                             │
│ Runtime State                                      │
│ Memory / Store                                     │
│ Tools                                              │
│ External Data                                      │
│      ↓                                             │
│ Context Engineering                                │
│                                                    │
│ Select / Retrieve / Filter                         │
│ Trim / Compact / Tool Selection                    │
│      ↓                                             │
│ Model Context                                      │
│      ↓                                             │
│ Model                                              │
│      ↓                                             │
│ Decision / Tool Call                               │
│      ↓                                             │
│ Agent Loop                                         │
│      ↓                                             │
│ Result / Artifact / Evidence                       │
│                                                    │
└───────────────────────┬────────────────────────────┘
                        │
                        ↓
                 Business Workflow
                        │
               持久化结果 / 下一阶段
```

### 【两层职责的最终边界】

可以把两个层次分别概括为：

#### <u>1. Business Context Preparation</u>

解决：

> **“这个 Agent 要执行什么任务，以及完成这个任务可以使用哪些业务信息？”**

主要关注：

```text
任务定义
业务状态
上下游产物
数据准备
Artifact 持久化
权限
Agent 之间的数据交接
```

#### <u>2. Agent Context Engineering</u>

解决：

> **“对于已经交给我的这个任务，这一轮 Model 应该看到什么？”**

主要关注：

```text
Context Selection
Retrieval
Memory
History
Tool Result
Compaction
Tool Selection
Model Input
```

Anthropic 所定义的 Context Engineering，主要对应这一层。[[1]](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents)

因此可以形成一条比较稳定的职责边界：

> **业务 Workflow 不应该过度干预 Agent 内部怎样推理；Agent 也不应该负责维护整个业务 Workflow 的长期状态。**

即：

```text
Business Workflow

负责：
任务之间怎么衔接
产物怎么沉淀
业务状态怎么流转


Agent Harness

负责：
单个任务内部怎么执行
这一轮需要什么 Context
什么时候调用 Tool
什么时候结束任务
```

OpenAI 的 Harness Engineering 实践也强调把代码库结构、工具、反馈机制和环境组织成 Agent 可以持续工作的运行环境，使 Agent 在明确边界内自主完成任务。[[4]](https://openai.com/index/harness-engineering/)

最终可以形成下面的统一理解：

```text
Business Workflow
关注 Task

“我要把什么任务交给 Agent？”
        ↓
Business Context Preparation
        ↓
Task Package
        ↓
Agent Harness
        ↓
Context Engineering
关注 Model Call

“这一轮模型应该看到什么？”
        ↓
Model Context
        ↓
Agent Loop
        ↓
Agent Result
        ↓
Business Workflow
```

> **业务 Workflow 层负责 Business Context Preparation：将用户请求、业务状态、上游结果和持久化 Artifact 整理成 Agent 可以执行的 Task Package；Agent Harness 接收到任务以后，再通过 Context Engineering 从 Task Package、Runtime State、Memory、Tool 和外部信息中选择当前这一轮真正需要的信息，构建 Model Context。**

两层共同解决的是两个不同粒度的问题：

> **上层保证任务交接完整，下层保证模型输入有效。**

### 参考资料补充

[[6]] LangChain. *Context engineering in agents* [EB/OL].  
https://docs.langchain.com/oss/python/langchain/context-engineering

## 5. Harness Engineering 与长任务 Agent 的可靠运行

### 【Harness Engineering 成为研发重点的背景】

Harness 并不是因为某一个新技术突然出现才产生的概念。更准确地说，随着 Agent 能力和任务形态变化，**模型之外的运行环境、状态管理、反馈和恢复机制开始成为影响 Agent 能否稳定完成任务的重要因素，因此 Harness Engineering 逐渐成为研发重点。**

可以从两个变化理解这一过程：

```text
模型能力持续增强
        +
Agent 承担的任务越来越长、越来越复杂
        ↓
研发重点发生变化
        ↓
不再只是：
“怎么让模型完成下一步”

而是进一步考虑：
“怎样让 Agent 在较长时间内
持续、稳定、可恢复地完成整个任务”
```

### 【模型能力提升推动 Harness 持续简化】

Harness 中很多机制，本质上都在弥补当前模型的能力不足。

Anthropic 在 Managed Agents 的研究中将这一点概括为：

> “harnesses encode assumptions about what Claude can’t do on its own”

即：

> **Harness 中会隐含一些关于“模型自己还做不好什么”的假设。** [[5]](https://www.anthropic.com/engineering/managed-agents)

例如，Anthropic 在早期长任务实验中发现，模型接近 Context Window（上下文窗口）上限时，可能出现 `context anxiety`，即因为“感知”到上下文即将耗尽而提前收尾。

为了补偿这个问题，Harness 会设计：

```text
当前 Context 接近上限
        ↓
整理当前任务状态
        ↓
生成结构化 Handoff
        ↓
清空原 Context
        ↓
创建新的 Agent Session
        ↓
读取 Handoff
        ↓
继续任务
```

这就是 Context Reset（上下文重置）。[[4]](https://www.anthropic.com/engineering/harness-design-long-running-apps)

但当模型能力提升以后，Anthropic 在后续模型上发现这种提前结束行为已经明显减弱，因此原来的 Context Reset 机制反而成为额外负担，可以直接删除。[[5]](https://www.anthropic.com/engineering/managed-agents)

因此：

```text
Harness Mechanism
        ↓
通常对应一个假设

“模型现在无法稳定完成 X”
        ↓
模型升级
        ↓
重新 Evaluation
        ↓
模型已经能够完成 X？
      /            \
    否              是
继续保留机制      删除或简化机制
```

所以 Harness Engineering 的一个重要原则不是：

> **给 Agent 增加越多机制越好。**

而是：

> **只在模型能力边界之外增加必要的工程补偿，并随着模型能力变化持续重新评估这些机制。**

这也意味着 Agent 架构不应该把某一代模型的能力缺陷永久固化进去。

可以概括为：

> **不要把当前模型做不好的事情，永久写成系统架构。**

### 【长任务扩展带来的工程问题】

另一方面，模型能力增强以后，Agent 能够承担的任务也在不断变长。

早期 Agent 更接近：

```text
Input
  ↓
Model
  ↓
Tool
  ↓
Result
```

一个任务可能很快就可以完成。

但现在的 Agent 开始执行：

```text
需求分析
   ↓
代码检索
   ↓
实现
   ↓
测试
   ↓
发现失败
   ↓
重新定位
   ↓
修改
   ↓
再次测试
   ↓
代码审查
   ↓
继续修改
   ↓
最终交付
```

整个任务可能运行几个小时，甚至跨越多个 Context Window。

Anthropic 对 Long-running Agent（长任务 Agent）的研究指出，真正困难的问题已经变成：

> **如何让 Agent 在多个 Context Window、多个执行阶段之间持续取得一致进展。** [[6]](https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents)

OpenAI 在 Harness Engineering 实践中也提到，其 Codex Agent 的单次任务已经可以持续工作数小时。[[3]](https://openai.com/index/harness-engineering/)

任务时间一旦变长，系统就不能只考虑：

```text
模型下一步应该做什么？
```

而必须进一步考虑：

```text
执行过程中失败怎么办？

进程中断怎么办？

Sandbox 挂掉怎么办？

Context 满了怎么办？

任务已经完成到哪里？

重新启动以后怎么继续？

Tool 调用失败以后是否重试？

执行结果怎么验证？

模型误判“完成”怎么办？

什么时候需要人工介入？
```

这就是 Harness Engineering 在 Long-horizon Task（长周期任务）中真正要解决的问题。

### 【长任务 Harness 的核心目标】

如果 Prompt Engineering 解决的是：

> **怎样把任务告诉模型。**

Context Engineering 解决的是：

> **这一轮应该让模型看到什么。**

那么 Harness Engineering 进一步解决的是：

> **怎样给 Agent 提供一个能够长期运行、持续获得反馈，并在失败后恢复的执行环境。**

可以简单表示为：

```text
                 Agent Harness
                      │
        ┌─────────────┼─────────────┐
        ↓             ↓             ↓
   Execution       State        Feedback
   执行环境         状态           反馈
        │             │             │
        ↓             ↓             ↓
 Tool / Sandbox   Checkpoint      Test / Eval
 Permission       Session         Review
 Runtime          Artifact        Observation
        │             │             │
        └─────────────┼─────────────┘
                      ↓
              Reliable Agent Loop
                  可靠执行循环
```

因此，Harness 的重点不只是“让 Agent 能调用 Tool”。

而是保证：

> **Agent 能够在环境中持续执行，并且执行过程可观察、可验证、可恢复。**

### 【状态持久化与中断恢复】

长任务首先需要解决的是：

> **运行过程不能只存在于当前模型 Context 或当前进程内存里。**

例如 Agent 已经工作很久：

```text
已经完成需求分析
已经修改 8 个文件
完成 15 个 Test Case
还有 2 个测试失败
```

此时如果 Harness 进程异常退出，不能重新开始以后：

```text
“我是谁？”
“任务是什么？”
“之前做了什么？”
```

因此需要把任务的重要状态持久化到 Agent 运行之外，例如：

```text
Session Log
完整执行事件

State
当前任务状态

Artifact
已经产生的文件、代码、报告

Checkpoint
关键执行节点

Execution Plan
当前计划和进度
```

Anthropic 的 Managed Agents 进一步把：

```text
Session
Harness
Sandbox
```

拆成独立组件。

其中 Session 是独立保存的执行记录，因此即使 Harness 本身发生 Crash（崩溃），也不需要依赖原来的 Harness 进程继续存在。新的 Harness 可以重新读取 Session 后继续运行。[[5]](https://www.anthropic.com/engineering/managed-agents)

这意味着：

```text
Harness Crash
      ↓
Harness 重启
      ↓
读取 Session / State
      ↓
恢复当前任务
      ↓
继续 Agent Loop
```

所以 Long-running Agent 的状态原则可以概括为：

> **运行进程可以失败，但任务状态不能跟着失败。**

### 【Retry 与 Failure Recovery】

长任务运行时间越长，发生临时失败越常见。

例如：

```text
Tool Timeout
网络失败

API Error
接口调用失败

Sandbox Crash
执行环境崩溃

Test Flake
测试偶发失败

Model Call Error
模型调用失败
```

因此 Harness 需要 Failure Recovery（失败恢复）机制。

其中最基础的是 Retry（重试）。

例如：

```text
Tool Call
   ↓
Timeout
   ↓
Retry Policy
   ↓
重新调用
```

但 Retry 不能简单理解成：

```text
失败
↓
无限重新执行
```

而应该根据失败类型决定：

```text
Failure
   ↓
错误分类
   │
   ├─ 临时错误
   │      ↓
   │    Retry
   │
   ├─ 环境异常
   │      ↓
   │    Re-provision Sandbox
   │
   ├─ 任务状态异常
   │      ↓
   │    Restore Checkpoint
   │
   └─ 无法自动处理
          ↓
        Human Escalation
```

Anthropic 在 Managed Agents 中就采用了类似的解耦思路：Sandbox 如果失败，Harness 可以把它视为 Tool Error；必要时重新创建标准执行环境，而不是依赖原来的容器长期存活。[[5]](https://www.anthropic.com/engineering/managed-agents)

因此 Harness 的恢复能力可以理解成三个层次：

```text
Retry
重新执行失败操作

Recovery
恢复运行环境

Resume
恢复整个任务执行
```

三者不是完全相同的问题。

### 【持续反馈与结果验证】

Agent 能够持续工作，并不意味着它会持续**正确**地工作。

Anthropic 在长任务实验中发现另一个典型问题：

> Agent 在长时间任务中可能逐渐偏离最初目标。[[4]](https://www.anthropic.com/engineering/harness-design-long-running-apps)

因此 Harness 不能只有：

```text
Model
 ↓
Action
 ↓
Model
 ↓
Action
```

而需要建立：

```text
Model
 ↓
Action
 ↓
Environment
 ↓
Verification
 ↓
Feedback
 ↓
Model
```

OpenAI 将这种研发方式概括成：

> “design environments, specify intent, and build feedback loops”

即：

> **设计 Agent 可以工作的环境、明确目标，并建立反馈循环。** [[3]](https://openai.com/index/harness-engineering/)

例如 Coding Agent 的 Feedback Loop 可以是：

```text
修改代码
   ↓
Lint
   ↓
Unit Test
   ↓
Integration Test
   ↓
Agent Review
   ↓
发现问题
   ↓
反馈给 Agent
   ↓
重新修改
```

这样 Agent 判断“任务是否完成”的依据不再只是：

```text
模型觉得已经完成
```

而是：

```text
测试通过
+
验收条件满足
+
Review 通过
```

因此 Harness Engineering 的另一个核心目标是：

> **把任务结果变成能够被环境验证的结果。**

### 【Harness 稳定机制与模型自主性的边界】

从前面的讨论可以看到，Harness 中存在两类机制。

第一类是：

```text
为了弥补当前模型能力不足
而设计的机制
```

例如某一代模型需要的：

```text
Context Reset
强制 Sprint 拆分
额外 Planner
强制任务分段
```

这类机制可能随着模型增强而被删除。

第二类则是：

```text
由长任务和真实系统本身决定的
基础可靠性机制
```

例如：

```text
Session 持久化
Sandbox 隔离
Permission
Tool Error
Checkpoint
Trace
Evaluation
Human Approval
```

这些机制不会仅仅因为模型“更聪明”就自然消失。

因为：

```text
模型能力提升
≠
服务器不会宕机

模型能力提升
≠
网络永远不会失败

模型能力提升
≠
高风险操作可以没有权限控制

模型能力提升
≠
业务不需要审计

模型能力提升
≠
任务状态不需要持久化
```

因此 Harness Engineering 一个很重要的判断就是：

> **区分哪些机制是在补偿模型能力，哪些机制是在解决真实软件系统本身的可靠性问题。**

前者应该随着模型能力提升持续简化；后者则属于长期稳定的工程基础设施。

### 【Harness Engineering 的整体研发重点】

这样就可以把 Harness Engineering 当前的研发重点整理成：

```text
                   Harness Engineering
                           │
          ┌────────────────┴────────────────┐
          ↓                                 ↓
  适配模型能力变化                    支撑长任务可靠运行
          │                                 │
   删除过时补偿机制                   State 持久化
   减少过度 Prompt                   Retry
   减少强制流程                       Recovery
   增加模型自主性                     Resume
                                      Sandbox
                                      Feedback Loop
                                      Evaluation
                                      Trace
                                      HITL
```

两边最终汇聚到同一个目标：

> **在不过度限制模型能力的前提下，为 Agent 提供足够稳定、可验证和可恢复的运行环境。**

### 【第五节的核心认识】

因此，Harness Engineering 成为 Agent 研发重点，可以从两个相互关联的变化理解。

第一，**模型能力增强以后，Agent 不再需要依赖越来越复杂的 Prompt、Context 和固定 Workflow 来弥补所有能力不足。** Harness 应该持续重新评估自己的假设，把模型已经能够稳定完成的事情重新交给模型自主判断，而不是永久固化为工程流程。Anthropic 将这一原则概括为：Harness 中关于模型能力的假设会随着模型升级而失效。[[5]](https://www.anthropic.com/engineering/managed-agents)

第二，**模型能力提升让 Agent 开始进入更长、更复杂的任务，因此问题从“单次决策能否做对”进一步扩展成“整个任务能否长期稳定完成”。** 长任务天然需要状态持久化、Context 延续、Retry、中断恢复、执行环境恢复、结果验证、Trace 和人工介入等可靠性能力。[[4]](https://www.anthropic.com/engineering/harness-design-long-running-apps) [[6]](https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents)

所以可以把前面整个范式演进进一步补完整：

```text
Prompt Engineering
关注：
怎样把任务表达清楚
        ↓
Context Engineering
关注：
这一轮模型应该看到什么
        ↓
Harness Engineering
关注：
怎样组织模型之外的环境、状态、工具和反馈，
让 Agent 能够长期、稳定、可恢复地完成任务
```

其中最重要的一点是：

> **Harness Engineering 不是通过增加更多机制来控制模型，而是在“模型自主能力”和“系统可靠性”之间寻找边界：模型能够自己解决的问题尽量交给模型；状态、权限、恢复、验证等必须由系统保证的问题，则通过 Harness 提供稳定的工程保障。**

### 参考资料补充

[[3]] OpenAI. *Harness engineering: leveraging Codex in an agent-first world* [EB/OL]. 2026-02-11.  
https://openai.com/index/harness-engineering/

[[4]] Anthropic. *Harness design for long-running application development* [EB/OL]. 2026-03-24.  
https://www.anthropic.com/engineering/harness-design-long-running-apps

[[5]] Anthropic. *Scaling Managed Agents: Decoupling the brain from the hands* [EB/OL]. 2026-04-08.  
https://www.anthropic.com/engineering/managed-agents

[[6]] Anthropic. *Effective harnesses for long-running agents* [EB/OL]. 2025-11-26.  
https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents

## 6. 业务 Workflow 与 Agent Harness 的双层可靠性控制

### 【双层可靠性控制的基本边界】

前面已经把 Agent 系统分成两个主要层次：

```text
Business Workflow
负责跨任务、跨 Agent 的业务流程编排

        ↓ Agent Invocation

Agent Harness
负责单个 Agent Task 内部的自主执行
```

当 Agent 开始执行长任务以后，这两个层次都需要考虑：

```text
Retry
失败后的重试

Interrupt
执行过程中的暂停

Recovery / Resume
失败或暂停后的恢复

Permission
任务和操作的权限控制
```

但两层虽然使用相同的概念，**控制对象和恢复粒度并不相同**。

可以先形成一个统一判断：

> **Business Workflow 负责保证“任务之间能够可靠流转”，Agent Harness 负责保证“单个 Agent Task 内部能够可靠执行”。**

整体结构可以理解为：

```text
                 Business Workflow
                        │
                 Workflow State
                        │
       ┌────────────────┼────────────────┐
       ↓                ↓                ↓
     Retry          Interrupt        Permission
   Task 级           流程级           业务级
       │                │                │
       └────────────────┼────────────────┘
                        ↓
              Agent Invocation Contract
                        ↓
                  Agent Harness
                        │
                    RunState
                        │
       ┌────────────────┼────────────────┐
       ↓                ↓                ↓
     Retry          Interrupt        Permission
 Action 级           Run 级            操作级
       │                │                │
       └────────────────┼────────────────┘
                        ↓
              Model / Tool / Sandbox
```

因此，两层可靠性机制不是重复建设，而是形成：

> **局部执行可靠性 + 全局业务流程可靠性**

两个层次。

### 【Retry 的分层控制】

Retry（重试）的核心问题是：

> **失败以后，应该从多大的范围重新执行。**

#### <u>1. Harness 内部的局部重试</u>

Agent Harness 首先处理 Task 内部的局部失败，例如：

```text
Model API Timeout

Tool Timeout

临时网络错误

Sandbox 命令执行失败

Tool 参数错误

偶发测试失败
```

这类问题通常没有必要让整个 Agent Task 重新开始。

例如：

```text
Coding Agent
     ↓
Model
     ↓
run_test
     ↓
Timeout
     ↓
Harness Retry
     ↓
run_test
     ↓
成功
     ↓
Agent Loop 继续
```

LangGraph 当前支持在节点级配置 `RetryPolicy`，根据异常类型、最大尝试次数和退避策略重新执行失败节点。[[9]](https://docs.langchain.com/oss/python/langgraph/fault-tolerance)

因此 Harness Retry 的主要粒度是：

```text
Model Call
Tool Call
Node
Action
```

目标是：

> **尽可能在当前 Agent 内部消化局部错误，不把不必要的失败扩大到整个业务流程。**

#### <u>2. Workflow 层的 Task 重试</u>

只有当 Harness 已经无法恢复时，失败才应该向上暴露。

例如：

```text
Tool Retry
失败
   ↓
更换策略
仍然失败
   ↓
Agent 无法继续任务
   ↓
AgentResult = FAILED / RETRYABLE
```

外层 Workflow 再决定：

```text
重新执行整个 Agent Task

等待一段时间后重新执行

更换 Agent / Model

走人工处理

结束 Workflow
```

所以 Workflow Retry 的粒度通常是：

```text
Task
Agent Invocation
Workflow Node
Business Step
```

而不是某一次 Tool Call。

整个错误传播关系应该是：

```text
Local Failure
     ↓
Harness 尝试恢复
     ↓
无法恢复
     ↓
Task Failure
     ↓
Workflow Retry / Compensation / Escalation
```

这形成一个重要原则：

> **局部错误优先局部恢复，只有超出 Agent 自身恢复能力以后，才升级到 Workflow。**

### 【Interrupt 与 Resume 的分层控制】

Interrupt（中断）并不一定代表异常。

很多情况下，它表示：

> **当前执行暂时缺少继续运行所必须的外部条件。**

例如等待：

```text
人工审批
用户补充信息
外部系统结果
安全确认
业务事件
```

#### <u>1. Agent Harness 的 Run 级暂停</u>

假设 Agent 准备执行：

```text
deploy_production()
```

Harness 判断该 Tool 属于高风险操作：

```text
Model
  ↓
Tool Call: deploy
  ↓
Permission / Approval Check
  ↓
需要人工批准
  ↓
Interrupt Agent Run
```

此时暂停的是：

> **当前 Agent Run。**

OpenAI Agents SDK 当前就是这种设计：需要审批的 Tool Call 不会立即执行，而是产生 `interruptions`；当前 `RunState` 可以序列化保存，批准或拒绝以后，再从同一个状态恢复原 Run。[[10]](https://openai.github.io/openai-agents-python/human_in_the_loop/)

可以表示为：

```text
Agent Run
    ↓
Sensitive Tool Call
    ↓
Interrupt
    ↓
Serialize RunState
    ↓
Approve / Reject
    ↓
Resume RunState
    ↓
Agent Loop 继续
```

因此 Harness Resume 恢复的是：

> **单个 Agent Task 内部的执行现场。**

#### <u>2. Workflow 的流程级暂停</u>

如果人工审批可能需要较长时间，就不应该让业务 Workflow 一直占用运行进程。

更合理的是：

```text
Agent 返回：
WAITING_APPROVAL
       ↓
Workflow 持久化状态
       ↓
Workflow 进入 WAITING
       ↓
释放运行资源
       ↓
收到外部审批事件
       ↓
Workflow Resume
       ↓
恢复原 Agent Run
```

LangGraph 的 `interrupt()` 也是类似机制：Graph State 会通过 Checkpointer 持久化，并可以在之后使用相同 `thread_id` 重新加载状态继续执行。[[7]](https://docs.langchain.com/oss/python/langgraph/interrupts)

因此可能出现：

```text
Agent Interrupt
       ↓
向上冒泡
       ↓
Workflow Interrupt
```

这里需要注意：

> **Agent 负责指出“我为什么不能继续”，Workflow 负责管理“这个业务流程什么时候重新启动”。**

### 【Recovery 的两级状态恢复】

Recovery（恢复）真正依赖的基础不是 Retry，而是：

> **Durable State（持久化状态）。**

没有状态持久化，就无法可靠地判断应该从哪里继续。

#### <u>1. Workflow State</u>

Workflow 需要保存：

```text
当前执行节点
各 Task 状态
Task Result
Artifact Reference
审批状态
Retry Count
业务状态
```

例如：

```text
Requirement      DONE
Technical Design DONE
Coding           DONE
Testing          RUNNING
Release          PENDING
```

如果 Workflow 进程崩溃：

```text
Process Crash
      ↓
重新读取 Workflow State
      ↓
Requirement / Design / Coding 不再重跑
      ↓
从 Testing 继续
```

LangGraph 的 Persistence（持久化）机制会在执行过程中保存 Checkpoint；当某个节点失败时，可以从最近的成功状态恢复，已经成功的步骤不需要重新计算。[[8]](https://docs.langchain.com/oss/python/langgraph/persistence)

#### <u>2. Agent RunState</u>

Agent Harness 则需要保存更加细粒度的运行状态：

```text
Goal
Current Plan
Messages
Tool Results
Current Context
Artifacts
Pending Action
Approval State
```

例如：

```text
Goal:
修复登录测试

Completed:
- 已定位 session.ts
- 已修改 session 校验

Current:
执行 login.test.ts

Pending:
还有两个失败测试
```

Agent 进程失败以后：

```text
Harness Crash
      ↓
读取 RunState / Session
      ↓
恢复 Agent Task
      ↓
重新构建 Context
      ↓
继续 Agent Loop
```

OpenAI Agents SDK 的 `RunState` 就是一个可序列化的 Agent Run 快照，其中包括 Context、生成内容和 interruption 等运行信息，可以作为暂停和恢复的边界。[[11]](https://openai.github.io/openai-agents-python/ref/run_state/)

所以两种恢复需要明确区分：

```text
Workflow Recovery
回答：
“整个业务流程执行到哪一步？”

Agent Recovery
回答：
“当前这个 Agent Task 内部执行到哪一步？”
```

### 【Permission 的双层边界】

权限控制也需要分成两个层次。

#### <u>1. Workflow 层的业务权限</u>

Workflow 判断的是：

> **当前用户或业务主体有没有资格发起这个任务。**

例如：

```text
普通运营人员
允许：
查看达人
创建运营任务

不允许：
修改结算
发布正式策略
```

因此：

```text
User
 ↓
Business Authorization
 ↓
是否允许创建 Task
 ↓
是否允许调用某类 Agent
```

这是业务权限边界。

#### <u>2. Harness 层的 Action 权限</u>

即使业务上允许启动一个 Coding Agent，也不意味着 Agent 内部的所有操作都允许执行。

例如：

```text
Coding Agent

read_file
→ 自动允许

edit_file
→ 自动允许

delete_file
→ 需要审批

deploy_production
→ 需要管理员审批
```

所以 Harness Permission 控制的是：

> **当前 Agent Run 可以调用哪些 Tool，以及某一次具体 Action 是否允许执行。**

OpenAI Agents SDK 支持 Tool 级 `needs_approval`，既可以固定要求审批，也可以通过程序规则根据 Tool 参数动态判断是否需要暂停。[[10]](https://openai.github.io/openai-agents-python/human_in_the_loop/)

因此两层权限的关系可以理解成：

```text
Business Permission
决定：
“这个任务能不能做？”

        ↓

Agent Permission
决定：
“这个任务执行过程中，
具体这个动作能不能做？”
```

两层不能互相替代。

尤其不能使用：

```text
System Prompt:
“你没有权限时不要调用 deploy”
```

来代替真正的权限机制。

权限应该由代码、Policy 和执行环境强制保证。

### 【跨层错误升级与恢复路径】

前面的四类能力不能分别孤立理解。

真正运行时，它们会组合成一条完整的故障处理路径：

```text
Agent Action
     ↓
发生 Failure
     ↓
Harness 判断 Failure Type
     │
     ├─ Transient Error
     │      ↓
     │    Retry
     │
     ├─ Model / Tool 可自行修复
     │      ↓
     │    把 Error 返回 Model
     │      ↓
     │    Agent 调整方案
     │
     ├─ 需要人工决策
     │      ↓
     │    Interrupt
     │      ↓
     │    WAITING_APPROVAL
     │
     └─ Harness 无法恢复
            ↓
         Task Failed
            ↓
      Workflow Error Handling
            │
        ┌───┼────────────┐
        ↓   ↓            ↓
      Retry Pause    Compensation
```

LangGraph 当前的 Fault Tolerance 文档也采用类似分类思路：Transient Failure 可以使用 Retry；模型可以处理的 Tool Error 可以重新反馈给 LLM；用户可以修复的问题可以暂停等待输入；无法恢复的异常则继续向上暴露。[[9]](https://docs.langchain.com/oss/python/langgraph/fault-tolerance)

因此最重要的不是“有没有 Retry”，而是：

> **错误发生以后，由哪一层处理，以及什么时候应该向上一层升级。**

### 【Agent Invocation Contract 的可靠性状态】

为了让 Workflow 和 Agent Harness 真正解耦，两层之间还需要一个稳定的状态协议。

Workflow 不应该知道：

```text
Harness 内部调用了多少次 Model
Tool Retry 了多少次
Context 压缩了多少次
```

它只需要知道 Agent Task 当前的最终状态。

例如可以抽象为：

```text
AgentExecutionResult

status:
  SUCCEEDED
  FAILED
  RETRYABLE
  WAITING_APPROVAL
  PAUSED
  CANCELLED

output

artifacts

error:
  type
  retryable

checkpoint:
  resume_token

pending_action:
  tool
  arguments
  approval_type
```

于是：

```text
Tool Timeout
    ↓
Harness 自动 Retry
    ↓
成功
    ↓
Workflow 无感知
```

只有当：

```text
Harness Retry Exhausted
        ↓
AgentResult = RETRYABLE
```

Workflow 才需要介入。

或者：

```text
Agent 请求生产部署
       ↓
AgentResult = WAITING_APPROVAL
       ↓
Workflow 持久化任务
       ↓
等待人工审批
       ↓
重新传入 resume_token
       ↓
恢复 Agent Run
```

这种设计可以让两层分别演进，而不相互侵入。

### 【幂等性作为 Retry 与 Recovery 的基础保障】

Retry 和 Recovery 还隐含一个非常重要的问题：

> **重新执行以后，会不会重复产生副作用？**

例如：

```text
transfer_money(100)
       ↓
请求超时
```

客户端无法确定：

```text
请求根本没有执行

还是

已经转账成功，只是 Response 丢失
```

如果直接 Retry：

```text
transfer_money(100)
```

就可能再次转账。

因此对具有 Side Effect（副作用）的操作，例如：

```text
支付
创建订单
删除数据
发送消息
发布内容
部署
```

必须考虑 Idempotency（幂等性），即：

> **同一个操作重复执行多次，也不会产生额外的业务结果。**

通常需要：

```text
Idempotency Key
操作唯一 ID

Execution Record
执行记录

Check-before-retry
Retry 前查询操作状态
```

LangGraph 在 Interrupt 文档中也明确要求：由于恢复时 Node 可能重新从头执行，`interrupt()` 之前发生的 Side Effect 应当设计为幂等操作。[[7]](https://docs.langchain.com/oss/python/langgraph/interrupts)

因此幂等同样存在两个粒度：

```text
Workflow Idempotency
保证：
Business Task 不被重复执行

Harness Idempotency
保证：
Tool / Action 不因 Retry
重复产生副作用
```

### 【双层可靠性体系的统一模型】

最终，可以把 Business Workflow 与 Agent Harness 的可靠性设计统一为：

```text
                    Business Workflow
                           │
                  Workflow State
                           │
          ┌────────────────┼────────────────┐
          │                │                │
       Task Retry     Workflow Pause    Authorization
          │                │                │
          │          Workflow Resume        │
          │                │                │
          └────────────────┼────────────────┘
                           ↓
                 Agent Invocation Contract
                           ↓
                      Agent Harness
                           │
                       RunState
                           │
       ┌───────────────────┼───────────────────┐
       │                   │                   │
 Action Retry       Run Interrupt         Tool Permission
       │                   │                   │
       │             Run Resume                 │
       │                   │                   │
       └───────────────────┼───────────────────┘
                           ↓
                 Model / Tool / Sandbox
                           ↓
                Result / Failure / Event
                           ↓
              Harness 优先进行局部处理
                           ↓
                  无法处理时向上冒泡
                           ↓
                    Business Workflow
```

其中 Recovery 建立在两套持久化状态之上：

```text
Workflow State
负责恢复业务流程

RunState
负责恢复 Agent 内部执行
```

而 Idempotency 贯穿两层，保证 Retry 与 Resume 不会产生重复副作用。

### 【第六节的核心认识】

Business Workflow 和 Agent Harness 中都会出现 Retry、Interrupt、Recovery、Permission，但它们不应该被理解成两套重复能力。

更准确的分工是：

| 能力        | Business Workflow          | Agent Harness            |
| ----------- | -------------------------- | ------------------------ |
| Retry       | Task / Agent Invocation 级 | Model / Tool / Action 级 |
| Interrupt   | 整个业务流程暂停           | 当前 Agent Run 暂停      |
| Recovery    | 恢复到正确的 Workflow Task | 恢复 Task 内部 RunState  |
| Permission  | 用户 / 业务任务权限        | Tool / Action 执行权限   |
| State       | Workflow State             | Agent RunState           |
| Idempotency | 防止业务 Task 重复         | 防止具体 Tool 副作用重复 |

整个体系遵循的核心原则是：

> **局部问题优先由 Agent Harness 局部解决；只有 Harness 无法恢复、需要外部业务判断，或者涉及跨任务流程控制时，才将状态和错误向 Business Workflow 冒泡。**

因此两层可靠性最终形成的是：

```text
Agent Harness
保证：
“当前任务内部能够稳定执行”

          +

Business Workflow
保证：
“整个业务流程能够稳定推进”

          ↓

Long-running Agent System
长期、可恢复、可控制地完成业务任务
```

这也可以和第五节的 Harness Engineering 形成完整衔接：

> **Harness Engineering 解决单个 Agent 的可靠执行，而 Workflow Engineering 在此基础上进一步解决多个任务、Agent 和人工节点之间的可靠协作。**

### 参考资料补充

[[7]] LangChain. *Interrupts — LangGraph* [EB/OL].  
https://docs.langchain.com/oss/python/langgraph/interrupts

[[8]] LangChain. *Persistence — LangGraph* [EB/OL].  
https://docs.langchain.com/oss/python/langgraph/persistence

[[9]] LangChain. *Fault tolerance — LangGraph* [EB/OL].  
https://docs.langchain.com/oss/python/langgraph/fault-tolerance

[[10]] OpenAI. *Human-in-the-loop — OpenAI Agents SDK* [EB/OL].  
https://openai.github.io/openai-agents-python/human_in_the_loop/

[[11]] OpenAI. *Run State — OpenAI Agents SDK* [EB/OL].  
https://openai.github.io/openai-agents-python/ref/run_state/

## 7. Loop Engineering 与 Graph Engineering

### 【概念定位】

当前出现的 Loop Engineering、Graph Engineering 等术语，不宜简单理解为继 Prompt Engineering、Context Engineering、Harness Engineering 之后的下一代技术范式。

更准确地说，它们是在 Agent 能力增强、任务持续时间变长、系统规模扩大以后，对不同工程问题的进一步抽象。

因此不能简单理解成：

```text
Prompt Engineering
        ↓
Context Engineering
        ↓
Harness Engineering
        ↓
Loop Engineering
        ↓
Graph Engineering
```

更适合按照**研究对象**理解：

```text
Prompt Engineering
→ 模型指令

Context Engineering
→ 模型输入

Harness Engineering
→ 单个 Agent 的运行环境

Loop Engineering
→ 持续任务的循环控制

Graph Engineering
→ 多个执行单元之间的组织关系
```

LangChain 在讨论 Graph Engineering 时也指出，这类名称虽然具有一定的 “buzzword（流行术语）”性质，但背后对应的工程设计问题是真实存在的。[[13]](https://www.langchain.com/blog/3-years-of-graph-engineering-with-langgraph)

因此，面对新的 `X Engineering`，重点不是记住名称，而是判断：

> **它控制的对象是什么，它解决的具体问题是什么，以及它与现有 Agent 架构的边界在哪里。**

### 【Loop Engineering：持续任务的循环控制】

Loop Engineering（循环工程）主要关注：

> **如何让 Agent 围绕一个目标持续执行、获得反馈、再次执行，并在满足条件以后停止。**

Claude 对 Loop 的描述是：

> “agents repeating cycles of work until a stop condition is met”

即：

> **Agent 重复执行一轮轮工作，直到满足停止条件。** [[12]](https://claude.com/blog/getting-started-with-loops)

#### <u>1. Agent 内部的 Agent Loop</u>

首先需要区分前面已经讨论过的 Agent Loop：

```text
Model
  ↓
Decision
  ↓
Tool Call
  ↓
Observation
  ↓
Model
  ↓
...
```

它解决的是：

> **单个 Agent Run 内部，模型怎样根据环境反馈持续决定下一步。**

这一层通常已经由 Agent Harness 提供。

例如：

```text
修复 Bug
   ↓
读取代码
   ↓
模型判断
   ↓
修改代码
   ↓
运行测试
   ↓
模型继续判断
   ↓
完成
```

因此，Agent Loop 是 Agent Runtime 内部最基础的执行循环。

#### <u>2. 外层的 Execution Loop</u>

Loop Engineering 当前更值得关注的是 Agent 外部更高一层的循环。

例如：

```text
启动 Agent
   ↓
执行任务
   ↓
验证结果
   ↓
满足目标？
 /       \
是        否
↓          ↓
结束     Feedback
           ↓
       再次运行 Agent
```

它需要设计的不只是 Agent 内部如何调用 Tool，还包括：

```text
Trigger
什么时候启动

Goal
当前目标是什么

Verification
结果怎么验证

Feedback
失败信息怎样重新提供给 Agent

Stop Condition
什么时候结束

Budget
最多运行多少轮 / 消耗多少资源

Escalation
什么时候升级给人工
```

因此 Loop Engineering 更准确地说是在研究：

> **如何把原来依赖人工不断推动 Agent 的过程，转换成一个能够自动持续执行和自我验证的循环。**

#### <u>3. Loop Engineering 出现的原因</u>

过去很多所谓的 Agent Loop，实际上是由人在外部完成的：

```text
Human
  ↓
Agent
  ↓
Result
  ↓
Human 检查
  ↓
再给 Agent 新 Prompt
```

例如：

```text
用户：修复这个 Bug
Agent：完成

用户：测试还没过，继续修
Agent：继续修改

用户：还有问题，再继续
```

真正的循环是：

```text
Human → Agent → Human → Agent
```

Loop Engineering 的目标就是将这部分人工驱动显式化：

```text
Goal
 ↓
Agent
 ↓
Test / Evaluation
 ↓
Failure
 ↓
Feedback
 ↓
Agent
 ↓
Pass
 ↓
Stop
```

所以它并不是发明了一种新的 Agent 底层机制，而是：

> **随着 Agent 自主执行能力提升，把“持续推进任务”本身变成新的工程控制对象。**

### 【Graph Engineering：复杂 Agent System 的执行拓扑】

当一个任务不仅需要反复执行，还出现多个 Agent、Tool、Validator（验证器）、人工节点和并行任务以后，仅靠一个 Loop 就很难描述整个系统。

例如：

```text
                    Requirement
                         ↓
                 Technical Analysis
                         ↓
             ┌───────────┴───────────┐
             ↓                       ↓
        Frontend Agent          Backend Agent
             ↓                       ↓
             └───────────┬───────────┘
                         ↓
                    Integration
                         ↓
                      Testing
                    /         \
                 Pass          Fail
                  ↓             ↓
               Review        Coding
```

这时真正需要设计的是：

> **多个执行单元之间如何连接、依赖、分支、并行以及回流。**

这就是 Graph Engineering 所关注的问题。

#### <u>1. Graph 的基本组成</u>

LangGraph 将 Graph 的基本结构概括为：

```text
State
系统共享和保存的状态

Nodes
执行具体工作的节点

Edges
决定节点之间怎样流转
```

[[14]](https://docs.langchain.com/oss/python/langgraph/graph-api)

其中 Node 不一定是 Agent。

可以是：

```text
Agent
LLM Call
Tool
普通代码
Validator
Human Approval
Database Operation
```

Edge 则可以表达：

```text
固定顺序
条件分支
并行
结果汇合
失败回退
循环
```

因此 Graph Engineering 主要设计的是：

> **Execution Topology（执行拓扑），也就是系统有哪些执行节点，以及这些节点之间如何流转。**

#### <u>2. Graph Engineering 与 Workflow Engineering</u>

Graph Engineering 并不是从零产生的一套新技术。

传统的软件系统中早已经存在：

```text
Workflow Engine
State Machine
DAG
Scheduler
Node / Edge
Checkpoint
```

Graph Engineering 的变化在于：

> **现在 Graph 中越来越多的节点变成了具有自主决策能力的 Agent。**

传统 Workflow 中：

```text
Node A
↓
Node B
↓
Node C
```

执行逻辑通常比较确定。

Agent Graph 中则可能出现：

```text
Manager Agent
      ↓
判断任务
   /      \
Agent A   Agent B
   ↓        ↓
Validator
   ↓
失败？
  / \
是   否
↓     ↓
返回   Done
```

因此需要重新考虑：

```text
哪些路径交给代码决定
哪些路径交给模型决定
哪些状态应该共享
失败以后返回哪个节点
哪些任务能够并行
哪些节点需要人工审批
```

所以 Graph Engineering 可以理解为：

> **Workflow / Orchestration 在 Agent 场景下的进一步工程化。**

### 【Loop 与 Graph 的组合关系】

Loop Engineering 和 Graph Engineering 不是前后替代关系。

一个 Graph 中完全可以包含多个 Loop。

例如：

```text
                       Graph
                         │
          ┌──────────────┴──────────────┐
          ↓                             ↓
     Coding Loop                  Research Loop

 Agent → Test                  Agent → Search
   ↑      ↓                       ↑      ↓
   └─Fail─┘                       └─More─┘

          └──────────────┬──────────────┘
                         ↓
                       Review
```

因此两者更适合这样区分：

#### <u>1. Loop 关注重复执行</u>

Loop 主要解决：

```text
什么时候启动
什么时候继续
怎样反馈
什么时候结束
```

所以：

> **Loop 描述一个目标如何不断向前推进。**

#### <u>2. Graph 关注执行单元之间的关系</u>

Graph 主要解决：

```text
有哪些节点
谁依赖谁
哪里分支
哪里并行
哪里汇合
失败返回哪里
```

所以：

> **Graph 描述多个执行单元如何共同组成一个系统。**

Graph 可以包含 Loop，而 Loop 也可以用 Graph 表达。

因此它们不是两个互斥的架构模式。

### 【Graph Engineering 与 Multi-Agent 的边界】

Graph 也不等于 Multi-Agent。

例如：

```text
Load Data
   ↓
Agent
   ↓
Validator
   ↓
Human Approval
   ↓
Save Result
```

这是一个 Graph，但只有一个 Agent。

反过来：

```text
Manager Agent
      ↓
动态调用
Agent A / Agent B / Agent C
```

属于 Multi-Agent，但不一定需要开发者显式写出固定 Graph。

因此：

```text
Graph Engineering
≠
Multi-Agent Engineering
```

更准确地说：

> **Graph 是一种组织 Agent、Tool、普通代码、Validator 和人工节点的显式 Orchestration 方式。**

### 【Loop、Graph 与现有 Agent 架构的统一关系】

把这一节放回前面已经建立的体系，可以得到：

```text
                     Business Goal
                          ↓
                  Business Workflow
                          ↓
               Graph / Orchestration
            多个执行单元怎样组织
                          ↓
          ┌───────────────┼───────────────┐
          ↓               ↓               ↓
       Agent A          Agent B        Validator
          │
          ↓
     Agent Harness
          │
     ┌────┼────┐
     ↓    ↓    ↓
 Context Tool State
          │
          ↓
     Internal Agent Loop
          │
 Model → Action → Observation
    ↑                 ↓
    └─────────────────┘
```

如果存在长期重复执行，还可以在 Agent 外层增加：

```text
External Execution Loop

Trigger
   ↓
Agent Run
   ↓
Verify
   ↓
Feedback
   ↓
再次 Agent Run
   ↓
Stop
```

所以实际上可以同时存在：

```text
Graph / Workflow
      ↓
External Loop
      ↓
Agent Harness
      ↓
Internal Agent Loop
```

这里每一层控制的粒度都不同。

### 【Agent Engineering 概念的统一框架】

到这里，可以把前面讨论过的多个 Engineering 概念放到一个统一体系里：

| 工程方向            | 控制对象           | 核心问题                           |
| ------------------- | ------------------ | ---------------------------------- |
| Prompt Engineering  | Instruction        | 怎样把目标和要求表达清楚           |
| Context Engineering | Model Context      | 当前这一轮模型应该看到什么         |
| Harness Engineering | Agent Runtime      | 单个 Agent 怎样可靠运行            |
| Loop Engineering    | Repeated Execution | 一个目标怎样被持续执行、验证和停止 |
| Graph Engineering   | Execution Topology | 多个执行单元怎样连接和协同         |

因此不要理解为：

```text
Prompt
↓
Context
↓
Harness
↓
Loop
↓
Graph
```

这种严格的技术升级路径。

更加准确的是：

```text
Model Call 层
├─ Prompt
└─ Context

Agent 层
├─ Harness
└─ Internal Loop

持续任务层
└─ External Loop

Agent System / Workflow 层
└─ Graph / Orchestration
```

这形成了真正的层级关系。

### 【第七节的核心认识】

Loop Engineering 和 Graph Engineering 可以看作当前 Agent 研发正在形成的新**工程关注方向**，但现阶段不应把它们理解成出现了全新的底层技术范式。

它们背后的基础机制——循环、状态机、Workflow、Graph、DAG、Retry、Validator——很多早已存在。

真正发生变化的是：

> **模型正在从一个被调用的能力，逐渐变成系统中的自主执行节点，因此原有的软件工程问题需要重新围绕 Agent 的非确定性、自主性和长任务能力进行设计。**

其中：

```text
Loop Engineering
关注：
怎样持续驱动一个目标执行

Graph Engineering
关注：
怎样组织整个 Agent System 的执行关系
```

所以面对不断出现的 Agent 新概念，更稳定的学习方式不是继续记忆名称，而是判断：

> **它处于哪一层？控制什么对象？解决什么问题？与已有架构有什么关系？**

这样才能把不断变化的 Agent 概念重新放回一个稳定的工程体系中。

### 参考资料补充

[[12]] Anthropic / Claude. *Loop engineering: Getting started with loops* [EB/OL]. 2026-06-30.  
https://claude.com/blog/getting-started-with-loops

[[13]] LangChain. *3 Years of Graph Engineering with LangGraph* [EB/OL]. 2026-07-22.  
https://www.langchain.com/blog/3-years-of-graph-engineering-with-langgraph

[[14]] LangChain. *Graph API overview — LangGraph* [EB/OL].  
https://docs.langchain.com/oss/python/langgraph/graph-api

# 问题：如何构建一个完整的 Agent 评测体系？

## 回答思路

这个问题不适合从某一个具体指标或某一种评分器开始讲，而应该先回答一个更基础的问题：**Agent 的执行具有非确定性，因此不能把 Agent 自己输出的“任务已完成”当成任务真正完成的证明。**

一个完整的 Agent 评测体系，需要依次解决下面几个问题：

```text
为什么需要独立评测
        ↓
评测什么
        ↓
Outcome / Output / Trajectory
        ↓
怎么评
        ↓
Code / Model / Human
        ↓
复杂任务按什么标准评
        ↓
Rubric
        ↓
多条标准如何组合
        ↓
Hard Gate / Weighted Score / Hybrid
        ↓
怎样把多次 Trial 转成指标
        ↓
Success Rate / Rubric Score / pass@k / pass^k / Cost / Latency / Safety ...
        ↓
最终从哪些维度衡量 Agent
        ↓
Effectiveness / Reliability / Efficiency / Safety
        ↓
线上 Failure 回流 Evaluation Suite
```

其中最重要的边界是：

> **评测对象、评分方式、Rubric 和 Metric 不是同一个概念。评测对象回答“评什么”，Grader 回答“怎么判断”，Rubric 回答“什么叫做对”，Metric 回答“怎样把大量 Trial 的结果量化和比较”。**

## 标准回答

### 【核心判断：Agent 的自我报告不能作为任务完成证明】

Agent 与传统确定性程序不同，它会根据当前 Context、Tool Result 和环境反馈动态决定下一步动作，因此同一个 Task 重复执行多次，可能得到不同结果。

例如：

```text
Task A

Trial 1 → Success
Trial 2 → Failure
Trial 3 → Success
Trial 4 → Agent 错误地认为自己已经完成
```

因此：

> **Agent 最终输出“任务已经完成”，只能被视为一次模型输出，不能直接作为任务真正完成的证据。**

Anthropic 在 Agent Eval 中也专门区分了 `Transcript / Trajectory（执行轨迹）` 与 `Outcome（最终环境状态）`：一个 Agent 可以声称某项操作已经完成，但真正的验收仍然应该检查任务执行之后真实环境是否达到了目标状态。[[15]](https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents)

所以，一个生产级 Agent 的评测体系应该建立在独立 Evidence（证据）之上，而不是依赖模型自己的判断：

```text
Task
 ↓
Agent Execution
 ↓
Outcome / Output / Trajectory
 ↓
Independent Evaluation
 ↓
判断任务是否真正完成
```

### 【评测对象：Outcome、Output 与 Trajectory】

Agent 不仅会生成文本，还可能调用 Tool、修改文件、更新数据库和改变外部环境，因此评测对象不能只看 Final Answer。

#### <u>1. Outcome：最终环境结果</u>

Outcome 关注：

> **任务执行结束以后，真实环境是否已经达到目标状态。**

例如任务是：

```text
把订单状态修改为 refunded
```

真正应该验收的是：

```text
database.order.status == "refunded"
```

而不是 Agent 最后回答：

```text
“退款已经完成。”
```

Coding Agent 也是一样。任务是“修复登录 Bug”时，更有价值的 Evidence 是：

```text
代码是否真正修改
+
对应测试是否通过
+
原有功能是否发生回归
```

因此，只要任务存在可观察的环境状态，**Outcome 通常应该作为最主要的验收依据。** Anthropic 当前也强调，Agent Eval 应尽量评价实际 Outcome，而不是过度强制某一条固定执行路径，因为 Agent 可能通过不同但同样有效的路径完成任务。[[15]](https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents)

#### <u>2. Output：最终交付结果</u>

有些 Agent 的任务本身就是生成内容，例如：

```text
Research Agent → 研究报告
Analysis Agent → 分析结论
Customer Service Agent → 用户回复
```

这时 Final Output 本身就是需要验收的 Artifact，可以评价：

```text
Correctness
Completeness
Groundedness
Instruction Following
Format
Overall Quality
```

因此不能简单地说 Final Answer 不应该评，而应该区分：

> **如果任务存在可验证的外部状态，应优先评价 Outcome；如果 Final Output 本身就是任务产物，则 Output 本身必须作为独立评测对象。**

LangSmith 当前也将 Final Response、Single Step 和整个 Agent Trajectory 区分为不同的 Agent 评测对象。[[16]](https://docs.langchain.com/langsmith/evaluation-approaches)

#### <u>3. Trajectory：执行轨迹</u>

Trajectory / Transcript 记录 Agent 执行过程中发生的事情，例如：

```text
Model Call
Tool Call
Tool Arguments
Tool Result
State Change
Handoff
Intermediate Output
```

Trajectory 最主要有两个作用。

第一，用于 **Failure Analysis（失败分析）**。如果最终 Outcome 失败，可以沿执行轨迹定位问题到底发生在哪一步：

```text
错误检索文件
 ↓
得到错误信息
 ↓
模型做出错误判断
 ↓
调用错误 Tool
 ↓
最终任务失败
```

第二，在安全、合规或强流程约束场景中，**执行过程本身也是验收条件**。例如：

```text
退款前必须 verify_identity
生产部署必须经过 Approval
禁止调用某类 Tool
禁止读取敏感文件
```

即使最终 Outcome 正确，如果 Agent 绕过了必要流程，也不能认为任务合格。

LangChain 当前的 Trajectory Evaluation 也支持对 Tool 序列进行 `strict`、`unordered`、`subset`、`superset` 等确定性匹配，也可以使用 LLM-as-Judge 对整个执行轨迹进行语义评价。[[17]](https://docs.langchain.com/langsmith/trajectory-evals)

因此可以形成一个比较稳定的判断：

> **Outcome / Output 主要回答“任务最后做对了吗”；Trajectory 主要回答“任务是怎么完成的、为什么失败”，而在安全、合规和强流程约束场景中，Trajectory 本身也会成为硬性验收对象。**

### 【评测方式：Code-based、Model-based 与 Human Review】

确定评测对象以后，需要进一步决定使用什么 Grader（评分器）进行判断。

#### <u>1. Code-based Grader：确定性评分</u>

只要能够通过程序明确判断，就应该优先使用确定性方式，例如：

```text
Exact Match
Regex
Unit Test
Integration Test
Static Analysis
Database State Check
File State Check
Threshold Check
Tool Call Check
```

例如：

```python
assert result == 42
```

或者：

```python
assert order.status == "refunded"
```

这种方式的特点是：

```text
确定
快速
成本低
可重复
容易定位问题
```

Anthropic 当前把 Code-based、Model-based 和 Human 作为 Agent Grader 的三种主要形式，并强调确定性 Grader 在适用场景下通常具有稳定、低成本和易调试的优势。[[15]](https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents)

因此可以形成一个基本原则：

> **能够通过确定性规则客观判断的问题，不应该优先交给另一个模型判断。**

#### <u>2. Model-based Grader：模型评分</u>

很多任务没有唯一确定答案，例如：

```text
研究报告是否完整？
方案是否合理？
回答是否真正解决用户问题？
客服回复是否清晰并符合语气要求？
```

这类任务无法通过一个固定 `expected_answer` 判断，因此需要使用：

```text
LLM-as-Judge
Rubric-based Evaluation
Reference-based Evaluation
Pairwise Comparison
```

Model Grader 主要用于：

> **评价无法通过确定性代码直接判断的语义质量。**

但 Model Grader 本身同样具有不确定性，所以不能把它理解成绝对 Ground Truth。实际使用时需要通过清晰 Rubric、标准样本和人工校准来提高评分一致性。[[15]](https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents)

#### <u>3. Human Review：人工评审</u>

人工主要用于：

```text
高风险任务
高歧义任务
强主观判断
Model Judge 低置信结果
Model Grader 校准
生产抽样审计
```

因此整个评测方式可以收敛成：

```text
能够确定性判断
→ Code-based Grader

无法确定性判断但可语义评估
→ Model-based Grader

高风险 / 高歧义 / Judge 校准
→ Human Review
```

核心原则是：

> **尽可能提高确定性评测比例，模型评分负责补足开放问题，人工主要承担高风险判断和评测校准。**

### 【Rubric：复杂任务如何定义验收标准】

Grader 解决的是：

> **怎么判断。**

Rubric 解决的是：

> **具体要判断哪些标准。**

简单任务可能只需要一个条件，例如：

```text
1 + 1
Expected = 2
```

但复杂 Agent Task 很难用一个 Boolean 条件完整描述。

例如一个 Research Agent：

```text
Task:
分析某行业的发展趋势并给出建议
```

可以拆成：

```text
Rubric

Criterion 1
关键事实正确

Criterion 2
关键结论有可靠来源

Criterion 3
覆盖指定分析维度

Criterion 4
没有明显事实冲突

Criterion 5
最终建议与证据一致
```

因此：

```text
Task
 ↓
Rubric
 ├─ Criterion A
 ├─ Criterion B
 ├─ Criterion C
 └─ Criterion D
```

不同 Criterion 还可以使用不同 Grader：

```text
事实是否正确
→ Code / Reference Check

来源是否存在
→ Code

分析是否合理
→ Model Grader

高风险判断是否合规
→ Human
```

#### <u>1. Hard Gate</u>

某些条件必须全部通过：

```text
Functionality = PASS
AND
Security = PASS
AND
No Data Leakage = PASS
```

只要其中一项失败：

```text
Overall = FAIL
```

这种方式特别适合：

```text
安全
权限
合规
核心功能
关键业务约束
```

#### <u>2. Weighted Score</u>

一些质量标准可以通过加权聚合：

```text
Correctness       40%
Completeness      25%
Evidence Quality  20%
Clarity           15%
```

最终：

```text
Overall Score
=
Σ Weight_i × Score_i
```

#### <u>3. Hybrid</u>

真实业务通常更适合：

```text
Hard Gate
+
Weighted Score
```

例如：

```text
Security = PASS
AND
Compliance = PASS
AND
Quality Score >= 80
```

这可以避免出现：

```text
安全 = 0
内容质量 = 100
```

最后通过平均分仍然判定合格的问题。

所以 Rubric 设计的原则应该是：

> **高风险和不可妥协的要求通过 Hard Gate 控制，一般质量要求再通过 Weighted Score 聚合。**

### 【Metrics：怎样把多次 Trial 转换成可比较结果】

Agent 的概率性意味着一次运行不能代表真实能力。Anthropic 将一个测试问题称为 `Task`，同一个 Task 的一次实际执行称为 `Trial`，并建议对同一任务进行多次 Trial，以获得更可靠的评测结果。[[15]](https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents)

例如：

```text
Task A

Trial 1 → Pass
Trial 2 → Pass
Trial 3 → Fail
Trial 4 → Pass
Trial 5 → Pass
```

常见指标可以按用途简单整理为几组。

#### <u>1. 任务成功与质量指标</u>

```text
Task Success Rate
成功 Task 数 / 总 Task 数

Average Rubric Score
平均 Rubric 得分

Median Score
中位得分

Criterion Pass Rate
某一 Criterion 的通过率

Failure Rate
失败任务比例
```

这些指标主要回答：

> **Agent 完成任务的整体效果怎么样。**

#### <u>2. 稳定性与重复运行指标</u>

`pass@1` 表示单次运行直接成功的能力。

`pass@k` 表示：

> **同一个 Task 运行 k 次，只要至少一次成功，就算成功。**

它更适合允许多次探索、生成多个候选或多次尝试的问题，反映的是：

> **给 Agent 多次机会，它是否有能力最终找到正确解。**

`pass^k` 表示：

> **同一个 Task 连续运行 k 次，全部成功。**

它更加关注 `Consistency / Reliability（稳定性 / 可靠性）`。

例如单次成功率为 90%，连续 5 次全部成功的概率只有：

```text
0.9^5 ≈ 59%
```

因此：

```text
一次成功率较高
≠
能够长期稳定重复成功
```

除了这三个指标，还可以关注：

```text
Score Variance
多次 Trial 得分波动

Retry Rate
需要 Retry 的比例

Recovery Rate
失败后成功恢复比例

Escalation Rate
升级人工比例

Timeout Rate
超时比例

Tool Failure Rate
Tool 调用失败比例
```

#### <u>3. 效率和成本指标</u>

Agent 即使成功，也可能运行效率很低，因此还需要记录：

```text
Latency
P50 / P95 Latency
Number of Turns
Tool Calls
Input Tokens
Output Tokens
Total Tokens
Cost per Task
Cost per Successful Task
```

其中 `Cost per Successful Task` 往往比单纯的平均 Cost 更能体现真实效率，因为失败任务同样消耗资源。

#### <u>4. 安全与治理指标</u>

还可以持续统计：

```text
Policy Violation Rate
Unauthorized Tool Call Rate
Approval Bypass Rate
Sensitive Data Exposure Rate
Unsafe Action Rate
Human Intervention Rate
Guardrail Trigger Rate
```

这些指标通常不仅用于离线 Eval，也适合生产环境持续监控。

### 【Agent 的综合评价维度】

Agent 的最终能力不能只用一个 Task Success Rate 表示。

更适合至少从下面四个维度综合判断：

| 维度 | 核心问题 | 常见指标 |
|---|---|---|
| Effectiveness | Agent 能不能把事情做对 | Success Rate、Rubric Score、Criterion Pass Rate |
| Reliability | Agent 能不能持续稳定做对 | pass^k、Variance、Failure Rate、Retry Rate |
| Efficiency | 完成任务需要多少资源 | Latency、Turns、Tokens、Cost |
| Safety | 是否在允许的边界内完成 | Violation Rate、Unsafe Action、Approval Bypass |

需要进一步区分：

```text
Agent Technical Evaluation
```

和：

```text
Business Value Evaluation
```

例如一个 Agent 的 Success Rate 很高，但如果：

```text
Cost per Task > Human Cost per Task
```

同时没有显著提升：

```text
速度
规模
质量
覆盖率
```

那么它虽然技术指标不错，业务价值仍然可能不足。

因此：

> **Agent Eval 判断 Agent 是否具备可用能力；业务评估则进一步判断这种能力是否值得部署。**

### 【Evaluation Suite 与持续质量闭环】

把前面的概念组合起来，一个完整 Evaluation Suite 可以表示为：

```text
Evaluation Suite
│
├─ Task 1
├─ Task 2
├─ Task 3
└─ ...
      ↓
每个 Task
      ↓
多次 Trial
      ↓
运行 Agent
      ↓
收集 Evidence
│
├─ Outcome
├─ Output
└─ Trajectory
      ↓
Rubric
│
├─ Criterion A
├─ Criterion B
└─ Criterion C
      ↓
Graders
│
├─ Code
├─ Model
└─ Human
      ↓
Rubric Aggregation
│
├─ Hard Gate
├─ Weighted Score
└─ Hybrid
      ↓
Metrics
│
├─ Success Rate
├─ Rubric Score
├─ pass@1 / pass@k / pass^k
├─ Failure / Retry / Variance
├─ Latency / Cost
└─ Safety Metrics
      ↓
Agent Evaluation
│
├─ Effectiveness
├─ Reliability
├─ Efficiency
└─ Safety
```

Anthropic 当前对 Agent Eval 的基本组成也包括 `Task`、`Trial`、`Grader`、`Transcript`、`Outcome` 和完整 Evaluation Harness。[[15]](https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents)

同时，评测不能只发生在上线之前。

LangSmith 当前将 Evaluation 分成 Offline Evaluation 和 Online Evaluation：上线前通过 Dataset 对不同 Agent 版本进行 Benchmark、Regression 和对比；上线后则在真实生产 Trace 上持续运行 Evaluator，发现质量、安全和异常问题，并把失败样本重新加入离线 Dataset。[[18]](https://docs.langchain.com/langsmith/evaluation)

最终形成：

```text
Define Criteria
      ↓
Offline Evaluation
      ↓
Deploy
      ↓
Production Trace / Feedback
      ↓
发现 Failure
      ↓
转成新的 Eval Task
      ↓
加入 Evaluation Suite
      ↓
修改 Model / Prompt / Context / Tool / Harness / Workflow
      ↓
Regression Eval
      ↓
再次 Deploy
      ↺
```

因此 Eval 的价值不是得到一个静态分数，而是：

> **持续发现 Agent 的 Failure Mode，并保证后续 Model、Prompt、Context、Tool、Harness 或 Workflow 的变化不会让已有能力发生回退。**

### 【一句话总结】

> **Agent 评测体系的核心，是把“任务是否完成”从模型的自我判断中独立出来：先明确可验证的 Outcome、Output 和必要的执行轨迹，再通过 Rubric 将复杂任务拆成可验收标准，并根据标准选择确定性代码、模型评分或人工审查；随后通过多次 Trial 计算成功率、Rubric Score、pass@k、pass^k、失败率、成本、性能和安全等指标，从 Effectiveness、Reliability、Efficiency 和 Safety 多个维度判断 Agent 的真实能力，并将线上 Failure 持续回流 Evaluation Suite，形成长期质量闭环。**

### 参考资料补充

[[15]] Anthropic. *Demystifying evals for AI agents* [EB/OL]. 2026-01-09.  
https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents

[[16]] LangChain. *Application-specific evaluation approaches — LangSmith* [EB/OL].  
https://docs.langchain.com/langsmith/evaluation-approaches

[[17]] LangChain. *How to evaluate your agent with trajectory evaluations — LangSmith* [EB/OL].  
https://docs.langchain.com/langsmith/trajectory-evals

[[18]] LangChain. *LangSmith Evaluation* [EB/OL].  
https://docs.langchain.com/langsmith/evaluation


# 问题：Agent 中的治理规则体系应该如何设计？治理规则应该放在哪里，一条 Tool Call 又应该经过怎样的控制链路？

## 回答思路

这个问题不适合从 Prompt、Guardrail 或 HITL 某一个具体机制开始讲，而应该先回答两个更基础的问题。

第一，**Agent Governance（Agent 治理）到底要治理什么。**

传统软件系统本身就存在 Authentication（身份认证）、Authorization（权限校验）、风险控制和 Audit（审计）。Agent 出现以后，这些机制没有消失，而是因为执行主体从“用户直接操作系统”变成了“用户委托 Agent 操作系统”，又增加了 Agent 自主决策和非确定性带来的风险。

因此 Agent Governance 主要解决两类问题：

```text
用户身份与权限问题
谁在使用 Agent？
Agent 能代表这个用户做什么？

            +

Agent 自身的不确定性问题
即使有权限，
Agent 会不会因为错误判断执行高风险 Action？
```

第二，**治理规则不能全部放在一个位置。**

更合理的设计是：

```text
Governance Policy
统一定义治理规则
        ↓
不同控制点分别执行

Prompt / Skill
→ 行为软约束

Tool Registry / Workflow
→ 控制当前暴露哪些能力

Runtime Policy
→ 判断当前具体 Tool Call 是否允许

Guardrail / HITL
→ 控制风险行为

Business Backend
→ 最终资源权限校验

Sandbox
→ 限制执行影响范围

Trace / Audit
→ 保存完整治理证据
```

所以整个回答可以沿着下面这条主线展开：

```text
治理目标
   ↓
治理规则放在哪里
   ↓
软约束与硬约束的边界
   ↓
能力可见性与权限控制的边界
   ↓
Tool Call 产生以后怎样做动态判断
   ↓
高风险操作怎样通过 HITL 控制
   ↓
最终 Backend 和 Sandbox 怎样兜底
   ↓
形成完整 Tool Call 治理链路
```

## 标准回答

### 【Agent Governance 的定位与治理目标】

Agent Governance（Agent 治理）并不是 Agent 出现以后才产生的新问题。

传统软件系统本身就需要解决：

```text
Authentication
身份认证
确认当前用户是谁

Authorization
权限校验
确认当前用户允许做什么

Risk Control
风险控制
防止恶意或危险操作

Audit
审计
记录谁在什么时候做了什么
```

NIST AI Risk Management Framework（AI 风险管理框架）把 `GOVERN` 定义为贯穿整个 AI 风险管理体系的 **cross-cutting function（横向能力）**，强调治理需要贯穿 AI 系统生命周期，并通过组织政策、责任机制和技术控制落实。[[19]](https://airc.nist.gov/airmf-resources/airmf/5-sec-core/)

Agent 出现以后，这些传统治理机制仍然存在，但治理对象发生了变化：

```text
传统系统

User
 ↓
Application
 ↓
Backend
```

逐渐变成：

```text
Agent System

User
 ↓
Agent
 ↓
Tool
 ↓
Backend / Environment
```

用户不再直接完成所有操作，而是把部分决策权和执行权交给 Agent。

#### <u>1. Agent 必须继承用户真实的权限边界</u>

例如用户只能读取某一个项目：

```text
User A

project:read
project:123
```

那么不能因为 Agent 本身拥有：

```text
read_project
```

这个 Tool，就允许它读取所有项目。

真正的权限仍然应该是：

```text
User Identity
+
Agent
+
Tool
+
Target Resource
        ↓
Authorization
```

也就是说：

> **Agent 的能力不能突破委托它执行任务的用户本身所拥有的权限边界。**

#### <u>2. Agent 自身的不确定性需要额外治理</u>

即使用户确实拥有某项权限，也不能说明 Agent 的每一次 Action 都应该自动执行。

例如用户有删除文件权限，Agent 却因为错误判断生成：

```text
delete_file(
  "/project/config/production.json"
)
```

此时问题已经不再是：

```text
用户有没有 delete 权限？
```

而是：

```text
这一次具体删除是否合理？
风险是否过高？
是否需要人工确认？
```

所以 Agent Governance 最终需要同时控制：

> **用户有没有资格做，以及 Agent 这一次是否应该做。**

### 【治理规则的整体放置原则】

Agent Governance 不应该把所有规则都塞进 Prompt，也不应该只依靠 Tool 层的一次校验。

更合理的结构是：

```text
                    Governance Policy
                     企业治理规则
                           │
        ┌──────────────────┼──────────────────┐
        ↓                  ↓                  ↓
 Prompt / Skill      Tool / Workflow      Runtime
 行为规范             能力边界            动态决策
        │                  │                  │
        └──────────────────┼──────────────────┘
                           ↓
                    Business Backend
                      最终权限边界
                           ↓
                       Sandbox
                      执行影响范围

Trace / Audit 贯穿整个过程
```

这里可以形成一个重要的工程原则：

> **治理规则可以集中设计，但治理规则的执行必须分布在真正拥有控制能力的位置。**

也就是：

```text
Policy
规则是什么

        ≠

Enforcement
规则在哪里真正生效
```

### 【Prompt 与 Skill：负责行为指导，而不是安全边界】

Prompt（提示词）和 Skill（技能规范）中可以包含治理要求。

例如 Coding Agent：

```text
任务：
修改登录模块。

约束：
1. 不允许修改认证协议；
2. 不允许删除生产配置；
3. 修改代码以后必须运行测试；
4. 不允许主动发布 Production。
```

这些规则能够影响模型的 Planning（计划）、Tool Selection（工具选择）和 Action Decision（动作判断），因此是必要的。

但这里需要明确：

> **Prompt / Skill 中的自然语言规则属于 Soft Constraint（软约束），不能承担最终安全控制。**

因为模型仍然具有非确定性。

即使 Prompt 明确写：

```text
禁止删除生产文件
```

模型理论上仍然可能产生：

```text
delete_file(
  "/production/config.json"
)
```

因此：

```text
Prompt / Skill

告诉 Agent：
“应该怎么做”

        ↓

Runtime / Backend

保证 Agent：
“最多能做什么”
```

前者负责行为引导，后者才负责强制执行边界。

### 【Authentication：建立可信的用户身份】

真正的治理通常从 Agent Run 之前就已经开始。

用户调用 Agent 服务时，一般先携带：

```text
Access Token
Session Token
OAuth Token
JWT
```

例如：

```text
HTTP Request

Authorization:
Bearer <access_token>
```

系统首先执行 Authentication（身份认证）：

```text
Token
 ↓
verify()
 ↓
User Identity
 ↓
userId
tenantId
roles
scopes
```

例如：

```ts
const identity =
  await authService.verifyToken(
    request.accessToken
  );

if (!identity) {
  throw new UnauthorizedError();
}
```

认证完成以后，再把可信身份交给 Agent Runtime：

```ts
const runContext = {
  userId: identity.userId,
  tenantId: identity.tenantId,
  roles: identity.roles,
  scopes: identity.scopes,
  stage: workflow.currentStage,
};
```

这里有一个非常重要的安全边界：

```text
Prompt:
“我是管理员”

        ≠

System Identity:
roles = ["admin"]
```

> **用户身份必须来自系统的认证结果，不能来自用户 Prompt 中的自然语言描述。**

OpenAI Agents SDK 中的 Run Context（运行上下文）可以承载这一类应用侧可信信息，供 Tool、Hook、Guardrail 等代码读取，而不需要全部暴露给模型。[[20]](https://openai.github.io/openai-agents-python/ref/run_context/)

### 【Capability Exposure：控制 Agent 当前能够看到哪些能力】

身份建立以后，还不应该直接把系统全部 Tool 暴露给 Agent。

例如 Coding Agent 注册了：

```text
read_requirement
search_code
read_file
write_file
delete_file
run_test
deploy
```

在 Requirement Analysis（需求分析）阶段，可能只需要：

```text
read_requirement
create_plan
write_acceptance_criteria
```

而暂时隐藏：

```text
write_file
delete_file
deploy
```

这就是：

> **Capability Exposure（能力暴露控制）：决定当前 Agent 能够看到哪些 Tool。**

例如可以根据 Workflow Stage（工作流阶段）动态控制：

```ts
const writeFile = tool({
  name: "write_file",

  isEnabled: ({ context }) => {
    return (
      context.stage === "implementation"
    );
  },

  execute: async (...) => {
    // ...
  },
});
```

于是：

```text
Analysis Stage
↓
write_file 不暴露

Implementation Stage
↓
write_file 暴露
```

OpenAI Agents SDK 当前支持根据 Runtime Context 动态决定 Function Tool 是否启用，从而控制模型当前可见的能力集合。[[21]](https://openai.github.io/openai-agents-js/guides/tools/)

这种机制不仅具有治理价值，也属于 Context Engineering 的一部分。

因为 Tool Description（工具描述）和 Tool Schema（工具参数结构）本身也会进入 Model Context。

如果一次暴露大量无关 Tool：

```text
几十甚至上百个 Tool
        ↓
大量无关 Tool Description
        ↓
Context Noise（上下文噪声）
        ↓
Tool Selection 更困难
```

因此：

```text
Workflow Stage
      ↓
动态选择当前需要的能力
      ↓
只暴露相关 Tool
```

同时解决：

```text
治理问题
减少不应该出现的能力

        +

Context 问题
减少无关 Tool 对模型决策的干扰
```

### 【Tool 可见性不能代替 Authorization】

这是整个治理体系中最重要的边界之一。

Tool 是否可见回答的是：

> **模型有没有机会选择这个 Tool？**

Authorization（权限校验）回答的是：

> **模型真正生成参数以后，这一次具体调用到底有没有权限执行？**

两者完全不同。

假设用户拥有：

```text
refund_order
```

这个能力，因此它可以暴露给模型。

模型随后生成：

```text
refund_order({
  orderId: 123,
  amount: 100000
})
```

只有到了这个时候，系统才知道：

```text
是哪一个订单
属于哪个 Tenant
退款金额是多少
目标资源是谁的
```

因此真正的权限判断可能是：

```text
User
+
Tool
+
Arguments
+
Target Resource
        ↓
Authorization
```

例如：

```ts
async function refundOrder(
  ctx,
  { orderId, amount }
) {
  const order =
    await orderService.get(orderId);

  if (
    order.tenantId !== ctx.tenantId
  ) {
    throw new ForbiddenError();
  }

  if (
    !ctx.scopes.includes(
      "order:refund"
    )
  ) {
    throw new ForbiddenError();
  }

  if (
    amount > ctx.refundLimit
  ) {
    throw new ForbiddenError();
  }

  return orderService.refund(
    orderId,
    amount
  );
}
```

这里本质上依然是非常普通的：

```text
if / else
+
Policy Check
```

因此应该明确区分：

```text
Tool Visibility

“能不能让模型看到？”

        ≠

Authorization

“这次具体调用有没有权限？”
```

工具不可见可以降低风险，但不能成为真正的权限边界。

### 【Runtime Policy：对具体 Tool Call 做动态决策】

当 Model 真正输出：

```text
Tool Call
+
Arguments
```

以后，就进入 Agent Governance 最重要的动态控制阶段。

Runtime Policy（运行时策略）需要结合：

```text
User Identity
Agent
Workflow Stage
Tool
Tool Arguments
Target Resource
Current State
```

判断：

```text
ALLOW
DENY
REQUIRE_APPROVAL
```

例如：

```ts
function evaluateToolPolicy({
  user,
  stage,
  tool,
  args,
}) {
  if (
    !user.scopes.includes(
      tool.requiredScope
    )
  ) {
    return "DENY";
  }

  if (
    tool.name === "deploy" &&
    args.environment === "production"
  ) {
    return "REQUIRE_APPROVAL";
  }

  return "ALLOW";
}
```

这里需要注意：

> **Runtime Policy 并不是一个必须使用 AI 判断的模块。多数权限、阶段和风险规则反而应该优先使用确定性代码。**

因为安全规则、权限规则和审批规则本身应该尽量具有确定性。

### 【Guardrail：检查具体 Action 是否符合安全规范】

即使 Authorization 已经通过，这一次 Tool Call 仍然可能存在内容风险。

例如用户确实有：

```text
send_email
```

权限。

但是 Agent 生成：

```text
send_email({
  content:
  "API KEY = sk-xxxx"
})
```

这时候：

```text
Authorization = PASS
```

仍然不应该直接执行。

因此还需要 Guardrail（护栏，即对输入、输出或 Tool 参数进行安全检查）。

可以理解成：

```text
Authorization

判断：
“你有没有资格做？”

        ↓

Guardrail

判断：
“你这一次准备怎么做，
内容本身是否符合规则？”
```

例如 Tool Input Guardrail：

```ts
if (
  args.content.includes("sk-")
) {
  return REJECT;
}

return ALLOW;
```

OpenAI Agents SDK 当前把 Guardrail 区分为 Agent Input、Agent Output 以及 Tool Input / Tool Output Guardrail，其中 Tool Input Guardrail 会在 Tool 真正执行之前检查参数。[[22]](https://openai.github.io/openai-agents-python/guardrails/)

因此：

> **Guardrail 是行为内容检查，不应该替代真正的权限系统。**

### 【HITL：把高风险决策升级给人工】

还有一类情况：

```text
Authorization = PASS
Guardrail = PASS
```

但仍然不应该让 Agent 自动执行。

例如：

```text
生产发布
删除核心文件
大额退款
权限变更
资金转移
```

这里问题不是操作违法，而是：

> **操作本身风险过高，不能把最终决策完全交给非确定性的 Agent。**

因此使用 Human-in-the-loop（HITL，人在回路，即 Agent 在关键 Action 前暂停执行，由人工批准或拒绝）。

例如：

```ts
const deploy = tool({
  name: "deploy",

  needsApproval: async (
    ctx,
    { environment }
  ) => {
    return (
      environment === "production"
    );
  },

  execute: async (...) => {
    // deploy
  },
});
```

于是：

```text
deploy("staging")
↓
自动执行


deploy("production")
↓
Interrupt
↓
保存 RunState
↓
Human Approval
↓
Approve / Reject
↓
Resume
```

OpenAI Agents SDK 当前 HITL 的运行模型就是敏感 Tool Call 触发暂停，保存运行状态，在人工 approve / reject 后再恢复执行。[[23]](https://openai.github.io/openai-agents-python/human_in_the_loop/)

需要进一步明确一点：

> **HITL 并不是 AI 独有的治理机制，传统业务系统本来就存在人工审批；但由于 Agent 能自主产生 Action，HITL 在 Agent System 中变得更加重要。**

### 【人工批准以后仍然需要重新校验】

人工批准并不意味着可以：

```text
Approve
↓
直接执行
```

因为：

```text
Agent 提出 Action
        ↓
等待审批
        ↓
可能几分钟 / 几小时以后
        ↓
真正执行
```

期间可能发生：

```text
用户权限变化
资源状态变化
订单状态变化
Policy 更新
审批对象失效
```

所以更安全的过程是：

```text
Human Approve
      ↓
Revalidate（重新校验）
      ↓
Authorization
Guardrail
Business State Check
      ↓
Execute
```

也就是说：

> **Approval 是风险决策，不应该成为绕过后续安全校验的通行证。**

### 【Business Backend：真实资源的最终权限边界】

Runtime 已经做过权限判断以后，真正的业务 Backend 仍然必须保留最终 Authorization。

例如：

```text
Agent Runtime

refund_order(123)
       ↓
Order Service
```

Order Service 仍然需要检查：

```text
调用身份是否合法
订单是否属于当前 Tenant
当前用户是否允许退款
订单状态是否允许退款
退款金额是否超过范围
```

不能设计成：

```text
Agent Runtime 说可以
        ↓
Backend 无条件相信
```

更合理的是：

```text
Runtime Authorization

提前过滤无效调用

        +

Backend Authorization

保护真实业务资源
```

这里可以形成一个稳定的工程原则：

> **谁真正拥有资源，谁就必须保留最终权限控制。**

因此：

```text
Agent Runtime
不是
Backend Security Boundary
```

Runtime 可以提高治理效率，但业务后端仍然是实际资源的最终安全边界。

### 【Sandbox：限制 Agent 做错以后能够影响多大范围】

前面的 Authorization、Guardrail 和 HITL 主要判断的是：

> **能不能执行。**

Sandbox（沙箱，即隔离执行环境）解决的是：

> **即使执行出了问题，最多允许影响到哪里。**

例如 Coding Agent 可能需要：

```text
Shell
Python
npm
Filesystem
Browser
```

如果所有命令直接运行在：

```text
Developer Laptop
Production Server
Entire Company Network
```

风险很高。

更合理的是：

```text
Agent
 ↓
Sandbox
 │
 ├─ 独立 Workspace
 ├─ File System Boundary
 ├─ Network Allowlist
 ├─ CPU / Memory Limit
 ├─ Secret Isolation
 └─ Temporary Environment
```

因此可以把两者区分为：

```text
Authorization

控制：
“Agent 可以做什么”

        ↓

Sandbox

控制：
“即使 Agent 做错，
最多能影响什么”
```

也就是控制 Blast Radius（影响范围）。

### 【Trace 与 Audit：治理体系必须能够被追溯】

Governance 不只是阻止危险 Action。

企业还必须能够回答：

```text
谁发起了任务？
哪个 Agent 执行？
使用什么 Agent / Model 版本？
模型看到哪些 Tool？
模型请求调用什么 Tool？
Tool Arguments 是什么？
哪个 Policy 做出了判断？
为什么要求人工审批？
谁批准了操作？
Backend 最终执行了什么？
任务最后修改了什么资源？
```

因此 Trace（执行轨迹）和 Audit（审计记录）应该贯穿整个链路，而不是只在最后记录一句：

```text
Task Success
```

在 Governance 场景中，可以进一步区分：

```text
Trace
→ 发生了什么

Audit
→ 谁做的、为什么允许、谁批准的
```

### 【一条 Tool Call 的完整治理链路】

把前面的机制放在一起，一条生产级 Tool Call 可以整理成：

```text
User Request
      ↓
Authentication
验证 Token / Session
      ↓
Trusted User Context
user / tenant / role / scope
      ↓
Workflow
确定当前 Stage
      ↓
Capability Filtering
根据 User / Stage / Policy
过滤当前可见 Tool
      ↓
Model Context
只向模型暴露当前允许的 Tool
      ↓
Model
      ↓
Proposed Tool Call
tool + arguments
      ↓
Schema Validation
参数结构是否合法
      ↓
Runtime Authorization
User + Agent + Stage
+ Tool + Arguments + Resource
      ↓
Tool Input Guardrail
参数 / 内容是否违反安全规则
      ↓
Risk Evaluation
      ↓
是否需要 HITL？
   ┌─────────┴─────────┐
   ↓                   ↓
  Yes                  No
   ↓                    │
Interrupt               │
   ↓                    │
Human Review            │
   ↓                    │
Approve / Reject        │
   ↓                    │
Revalidate              │
   └──────────┬─────────┘
              ↓
     Backend Authorization
       最终资源权限校验
              ↓
      Sandbox / Executor
       限制执行影响范围
              ↓
          Real Action
              ↓
     Tool Output Guardrail
              ↓
          Tool Result
              ↓
       Trace / Audit
              ↓
          Agent Loop
```

这条链路中最重要的是：

```text
模型负责提出 Action

系统负责决定：
这个 Action
能不能执行
是否需要审批
在哪里执行
最多影响什么
```

### 【OpenAI Agents SDK 中的实现映射】

如果把这一套结构映射到实际代码，可以简化为：

```ts
// 1. Authentication
const identity =
  await authService.verifyToken(
    request.accessToken
  );

if (!identity) {
  throw new UnauthorizedError();
}


// 2. Trusted Runtime Context
const context = {
  userId: identity.userId,
  tenantId: identity.tenantId,
  scopes: identity.scopes,
  stage: workflow.currentStage,
};


// 3. Tool
const deleteFile = tool({
  name: "delete_file",

  parameters: z.object({
    path: z.string(),
  }),

  // Capability Exposure
  isEnabled: ({ context }) => {
    return (
      context.stage === "implementation"
    );
  },

  // HITL
  needsApproval: async (
    ctx,
    { path }
  ) => {
    return (
      path.startsWith(
        "/important/"
      )
    );
  },

  execute: async (
    { path },
    ctx
  ) => {

    // Authorization
    if (
      !ctx.context.scopes.includes(
        "file:delete"
      )
    ) {
      throw new ForbiddenError();
    }

    // Resource Authorization
    if (
      !policy.canDelete(
        ctx.context.userId,
        path
      )
    ) {
      throw new ForbiddenError();
    }

    // Business Safety Rule
    if (
      isProtectedFile(path)
    ) {
      throw new ForbiddenError();
    }

    // Execute inside Sandbox
    return sandbox.deleteFile(path);
  },
});
```

这段代码中每一层的职责不同：

```text
verifyToken
→ 谁在调用

RunContext
→ 当前可信用户和业务状态

isEnabled
→ 模型当前能不能看到 Tool

needsApproval
→ 这次 Action 是否需要人工确认

execute 中的 Authorization
→ 具体参数和资源是否允许

sandbox
→ 实际执行的影响范围
```

因此不要把 `isEnabled` 误解成真正的权限校验，也不要把 `needsApproval` 误解成 Authorization。

它们只是治理链路中不同位置的控制点。

### 【Agent Governance 的整体框架】

最终可以把整个治理体系压缩成四类控制。

#### <u>1. Soft Guidance：行为软约束</u>

```text
Prompt
Skill
Instructions
```

作用：

> **告诉 Agent 应该怎样做。**

#### <u>2. Capability Boundary：能力边界</u>

```text
Tool Registry
Workflow Stage
Dynamic Tool Filtering
```

作用：

> **决定 Agent 当前能够看到和选择哪些能力。**

#### <u>3. Action Control：具体操作控制</u>

```text
Authorization
Guardrail
Risk Policy
HITL
```

作用：

> **决定模型提出的这一笔具体 Action 是否真的能够执行。**

#### <u>4. Execution Boundary：真实执行边界</u>

```text
Backend Authorization
Sandbox
Resource Isolation
```

作用：

> **保护真实业务资源，并限制错误 Action 的实际影响范围。**

而：

```text
Trace / Audit
```

贯穿所有层，提供完整的治理证据。

### 【核心认识】

整个 Agent Governance 最重要的不是增加尽可能多的限制，而是把**模型自主决策**和**确定性安全边界**分开。

可以形成一条稳定原则：

> **不确定的任务判断可以交给模型，确定性的身份、权限、安全、审批和资源边界必须交给代码和系统。**

因此 Agent Governance 最终可以概括为：

> **传统系统治理主要解决“用户是谁、用户能做什么”；Agent Governance 在此基础上进一步解决“Agent 代表这个用户能够看到什么能力、模型产生的这一次 Action 是否允许、是否需要人工确认，以及真实执行最多能够影响什么”。系统先通过 Authentication 建立可信用户身份，再根据用户和 Workflow Stage 动态控制 Tool 可见性；模型产生具体 Tool Call 后，再根据 Tool Arguments 和目标资源进行 Authorization、Guardrail 和风险判断，高风险操作通过 HITL 升级给人工；真正执行时，业务 Backend 仍保留最终权限校验，并通过 Sandbox 限制影响范围，最后使用 Trace 和 Audit 保存完整治理证据。**

### 参考资料补充

[[19]] NIST. *AI Risk Management Framework: Govern* [EB/OL].  
https://airc.nist.gov/airmf-resources/airmf/5-sec-core/

[[20]] OpenAI. *Run Context — OpenAI Agents SDK* [EB/OL].  
https://openai.github.io/openai-agents-python/ref/run_context/

[[21]] OpenAI. *Tools — OpenAI Agents SDK* [EB/OL].  
https://openai.github.io/openai-agents-js/guides/tools/

[[22]] OpenAI. *Guardrails — OpenAI Agents SDK* [EB/OL].  
https://openai.github.io/openai-agents-python/guardrails/

[[23]] OpenAI. *Human-in-the-loop — OpenAI Agents SDK* [EB/OL].  
https://openai.github.io/openai-agents-python/human_in_the_loop/


# 问题：Agent Observability（可观测体系）应该如何构建？

## 回答思路

Agent Observability（Agent 可观测性）不应该从 Trace、Span、Log、Metric 等概念分别解释，而应该先回答一个更基础的问题：

> **当一个 Agent Task 执行失败、结果异常或者成本突然升高时，系统能不能还原这次任务到底经历了什么，并进一步定位“问题为什么发生”。**

OpenTelemetry 对 Observability 的一个核心描述就是帮助系统回答：

> **“Why is this happening?”——为什么会发生这种情况？** [[24]](https://opentelemetry.io/docs/concepts/observability-primer/)

因此 Agent 可观测体系需要同时解决两个层次的问题：

```text
单次任务
Agent 这一次到底经历了什么？
为什么失败？
        ↓
Trace / Span / Log
用于还原执行过程

大量任务
整个 Agent 系统运行得怎么样？
哪些问题正在增加？
        ↓
Metric / Alert
用于监控整体状态
```

整个体系可以按照下面的链路理解：

```text
观测目标
   ↓
确定需要观测的执行过程
   ↓
Runtime Instrumentation
运行时插桩
   ↓
形成 Trace / Span 等原始运行数据
   ↓
Processor / Exporter
采集、处理、上传
   ↓
Observability Backend
存储、查询、聚合
   ↓
单次任务分析 + 系统指标监控
   ↓
Debug / Alert / Evaluation / Audit
```

## 标准回答

### 【Agent Observability 的核心目标】

Agent Observability 本质上仍然属于软件系统 Observability。它的核心目标不是简单地“记录 Agent 日志”，而是：

> **通过记录 Agent 的真实运行过程，使系统能够在出现问题以后，还原发生了什么，并进一步定位为什么会发生。**

这一点对于 Agent 比普通确定性程序更加重要。

传统程序可能是：

```text
Request
  ↓
Service A
  ↓
Service B
  ↓
Database
  ↓
Response
```

而一次 Agent Task 可能是：

```text
User Request
      ↓
Agent
      ↓
Model
      ↓
search_code
      ↓
Model
      ↓
read_file
      ↓
Model
      ↓
write_file
      ↓
run_test
      ↓
Model
      ↓
Final Result
```

中间还可能发生 Retry、Handoff、Guardrail、HITL 或多个 Agent 协作，而且下一步 Action 通常由模型根据当前 Context 和环境反馈动态决定。

因此，当最后出现：

```text
Task = Failure
```

真正有价值的问题不是“任务失败了吗”，而是：

```text
模型第一次做了什么判断？

为什么调用 search_code？

search_code 返回了什么？

模型为什么随后选择 write_file？

写了哪个文件？

测试为什么失败？

失败以后为什么没有 Retry？

Agent 为什么最后仍然认为任务完成？
```

所以：

> **Agent Observability 最基础的能力，是能够完整还原一次 Agent Task 的执行路径。**

### 【观测体系的两个层次】

Agent 可观测体系可以先划分成两个层次。

#### <u>1. 单次 Task 的执行还原</u>

这一层解决：

> **这一次 Agent Task 到底发生了什么，以及问题发生在哪里。**

需要能够记录：

```text
Task
│
├─ Agent Run
├─ Model Call
├─ Tool Call
├─ Tool Result
├─ Handoff
├─ Guardrail
├─ HITL
├─ Retry
└─ Final Result
```

这部分主要通过 Trace、Span、Log 和业务事件完成。

#### <u>2. 大量 Task 的整体监控</u>

这一层解决：

> **整个 Agent 系统长期运行得怎么样。**

例如：

```text
Task Success Rate
P95 Task Latency
Average Tool Calls / Task
Tool Failure Rate
Retry Rate
Token / Task
Cost / Task
Approval Rate
```

这部分通常通过大量运行数据聚合成 Metric，再用于 Dashboard 和 Alert。

所以可以先形成一个清晰边界：

```text
单次 Task
→ Trace 分析

大量 Task
→ Metric 分析
```

### 【Trace：建立一次 Task 的执行主线】

为了能够还原一次 Task，需要先有一个统一的数据主线把整个执行过程串起来。

这个主线就是 Trace（追踪链路，即一次完整任务的端到端执行记录）。

例如：

```text
Task:
修复登录 Bug
```

对应：

```text
Trace: Fix Login Bug

├─ Agent Run
├─ Model Call
├─ search_code
├─ Model Call
├─ read_file
├─ Model Call
├─ write_file
├─ run_test
└─ Final Output
```

OpenAI Agents SDK 当前把 Trace 定义为一次逻辑 Workflow 的完整端到端执行，并由多个 Span 组成。Trace 具有唯一的 `trace_id`，还可以带 `workflow_name`、`group_id` 和 metadata。[[25]](https://openai.github.io/openai-agents-python/tracing/)

例如：

```text
trace_id = trace_123
workflow_name = "Coding Agent"
```

后面这次任务中产生的所有 Model、Tool、Handoff 等记录，都可以通过同一个 `trace_id` 关联起来。

所以：

> **Trace 负责回答“这是哪一次完整任务”。**

### 【Span：把一次 Task 拆成可分析的执行步骤】

只有 Trace 还不够，因为出现问题以后，还需要知道具体是哪一步出现问题。

Span（跨度）表示 Trace 中一个具有开始和结束时间的具体执行操作。

例如：

```text
Trace: Fix Login Bug

├─ Span: Agent
├─ Span: Model Call #1
├─ Span: search_code
├─ Span: Model Call #2
├─ Span: read_file
├─ Span: Model Call #3
└─ Span: write_file
```

一个 Span 通常会保存：

```text
span_id
trace_id
parent_id

start_time
end_time

operation_type
status

input
output

attributes
error
```

于是可以形成：

```text
Trace
→ 哪一次任务

Span
→ 任务中的哪一步
```

OpenTelemetry 同样把 Span 定义为一次具体的 Operation（操作或工作单元），多个具有父子关系的 Span 共同组成 Trace。[[24]](https://opentelemetry.io/docs/concepts/observability-primer/)

### 【Agent Runtime 如何自动产生 Trace 和 Span】

Agent Framework 与普通业务代码相比有一个重要优势：

> **Runtime 本身知道 Agent 正在执行什么。**

例如 OpenAI Agents SDK 的 Runner 本来就负责：

```text
执行 Agent
↓
调用 Model
↓
读取 Model Output
↓
执行 Tool
↓
把 Tool Result 交回 Model
↓
处理 Handoff
↓
运行 Guardrail
↓
进入下一轮 Agent Loop
```

因此 Runtime 天然知道 Model Call、Tool Call、Handoff、Guardrail 等操作什么时候开始、什么时候结束。

所以 SDK 可以直接在这些生命周期节点做 Instrumentation（插桩，即在程序关键执行位置自动加入观测逻辑）。

OpenAI Agents SDK 当前会对 Agent Run、Model Generation、Function Tool、Guardrail、Handoff 等关键运行节点建立 Trace / Span。[[25]](https://openai.github.io/openai-agents-python/tracing/)

因此执行：

```python
result = await Runner.run(
    agent,
    "修复登录 Bug"
)
```

不是等任务结束后再读取一批 Log 拼接 Trace，而是在任务实际运行过程中持续记录：

```text
Runner.run()
↓
进入 Trace

Model 开始
↓
Generation Span Start

Model 结束
↓
Generation Span End

Tool 开始
↓
Function Span Start

Tool 结束
↓
Function Span End
```

> **Trace / Span 是在执行过程中直接产生的原始观测数据，而不是运行结束以后由普通日志重新推导出来的。**

### 【Span 的父子关系如何形成完整执行树】

例如一次 Model Call 决定调用 `search_code`：

```text
Agent
  ↓
Turn
  ↓
Model
  ↓
Tool
```

最终可以形成：

```text
Trace
└─ Task / Agent Span
   └─ Turn
      ├─ Generation Span
      └─ Function Span
```

每个 Span 都带有 `trace_id` 和父级关系，因此系统可以判断：

```text
search_code

属于哪个 Task？
→ trace_id

由哪一步触发？
→ parent span

前面发生了什么？
→ 沿 Trace 向上追溯
```

这也是后续 Root Cause Analysis（根因分析）的基础。

### 【自动插桩与业务自定义插桩】

真正落地时，需要区分两类 Instrumentation。

#### <u>1. Framework Instrumentation：框架自动记录</u>

Agent Framework 能够自动记录的是它自己知道的 Runtime 生命周期，例如：

```text
Agent
Model Call
Tool Call
Guardrail
Handoff
```

这些信息可以由 SDK 自动创建对应 Span，业务开发者不需要对每一次基础 Model / Tool 调用重新手写监控代码。[[25]](https://openai.github.io/openai-agents-python/tracing/)

#### <u>2. Business Instrumentation：业务补充记录</u>

Framework 并不知道企业自己的业务语义，例如：

```text
作者风险等级计算
退款权限校验
订单状态修改
审批单创建
库存锁定
```

这些步骤如果需要参与问题定位，就必须由业务主动补充 Custom Span（自定义 Span）或者业务事件。

例如：

```python
with custom_span(
    "authorization_check",
    {
        "resource": "order_123",
        "policy": "refund_policy"
    }
):
    check_permission()
```

于是：

```text
Trace

├─ Agent Span
├─ Generation Span
├─ Function Span: refund_order
│   ├─ Custom Span: authorization
│   ├─ Custom Span: risk_check
│   └─ Custom Span: database_update
└─ Generation Span
```

OpenAI Agents SDK 当前提供 Custom Span 用于记录 SDK 默认不知道的业务步骤。[[25]](https://openai.github.io/openai-agents-python/tracing/)

因此可以形成一个清晰原则：

> **Framework Instrumentation 负责记录 Agent Runtime 的通用执行过程；Business Instrumentation 负责补充企业自己的业务过程。**

### 【Hooks：业务接入观测体系的生命周期入口】

除了 Custom Span，还可以通过 Hook（生命周期钩子，即 Runtime 执行到某个节点时触发的回调）接入业务自己的监控逻辑。

OpenAI Agents SDK 当前提供 Agent / Run 生命周期 Hook，例如 Agent 开始、结束，LLM 开始、结束，Tool 开始、结束，Handoff 等生命周期节点。[[26]](https://openai.github.io/openai-agents-python/ref/lifecycle/)

例如：

```python
class MonitoringHooks(RunHooks):

    async def on_tool_end(
        self,
        context,
        agent,
        tool,
        result
    ):
        logger.info({
            "event": "tool_finished",
            "tool": tool.name
        })
```

这里需要明确：

```text
Hook
≠
Trace
≠
Log
```

Hook 只是 Runtime 提供的事件入口。业务可以在 Hook 中记录 Log、更新 Metric、写 Audit Record 或调用企业监控 SDK。

因此：

```text
Runtime Event
      ↓
生命周期节点
      │
      ├─ SDK 内建 Tracing
      │      ↓
      │    Span
      │
      └─ Hook
             ↓
       Business Monitoring
       Log / Metric / Audit
```

### 【Log：补充某个执行节点发生的具体事件】

Trace 和 Span 主要建立一次 Task 的执行结构，但运行过程中还会出现一些离散事件，例如：

```text
Tool 执行失败
Retry 开始
权限校验失败
审批单创建成功
模型进入 Fallback
```

这类信息可以记录为 Log（日志，即某个时间点发生的结构化事件）。

例如：

```json
{
  "event": "tool_execution_failed",
  "tool": "run_test",
  "error": "timeout",
  "trace_id": "trace_123",
  "span_id": "span_456"
}
```

Log 最重要的是与 `trace_id` / `span_id` 关联。这样一条错误日志就可以反查到：

```text
这是哪个 Task？

属于哪个 Agent？

是哪一次 Tool Call？

它之前发生了什么？
```

因此：

```text
Trace
→ 完整执行路径

Span
→ 一个具体执行步骤

Log
→ 这一步发生的某个具体事件
```

而不是三个互相独立的监控系统。

### 【Trace 数据如何被采集、处理和上传】

产生 Trace / Span 以后，还需要把这些数据真正送入 Observability Backend。

OpenAI Agents SDK 当前的 Tracing 体系提供 Trace Provider、Tracing Processor 和默认的批处理 / 导出机制，也允许业务添加自己的 Trace Processor。[[27]](https://openai.github.io/openai-agents-python/ref/tracing/)

从架构上可以理解为：

```text
Runtime Instrumentation
        ↓
Trace / Span
        ↓
TraceProvider
        ↓
TracingProcessor
        ↓
Batch
        ↓
Exporter
        ↓
Observability Backend
```

#### <u>1. TraceProvider</u>

负责统一创建和管理 Trace / Span，可以理解为 Tracing 系统的入口。

#### <u>2. TracingProcessor</u>

Processor 可以接收 Trace / Span 生命周期事件，对数据进行处理、缓存或者转发。

#### <u>3. Batch</u>

为了避免每产生一个 Span 就立即发送一次网络请求，通常会先进行缓冲和批量上报：

```text
Span
Span
Span
Span
 ↓
Buffer
 ↓
Batch
 ↓
Upload
```

#### <u>4. Exporter / Backend</u>

最终由 Exporter 或对应的 Processor 把数据发送给 OpenAI Tracing Backend 或企业自己的 Observability Backend。

如果企业使用自己的监控体系，也可以形成：

```text
OpenAI Agents SDK
        ↓
Custom Trace Processor
        ↓
OpenTelemetry Collector
        ↓
企业 Observability Platform
```

OpenTelemetry Collector 本身就是通过 Receiver → Processor → Exporter 的方式接收、处理并导出 Trace、Metric 和 Log。[[28]](https://opentelemetry.io/docs/collector/)

### 【Agent Observability 与传统监控 SDK 的实现关系】

如果和传统前端监控 SDK 对照，两者实际上采用了非常相似的工程结构。

```text
前端监控

Browser Runtime
↓
PerformanceObserver / Error Hook / Event Hook
↓
Collector
↓
Processor
↓
Batch
↓
Reporter
↓
Monitoring Backend
```

Agent Observability 则可以理解为：

```text
Agent Runtime
↓
Instrumentation / Lifecycle Hook
↓
TraceProvider
↓
Processor
↓
Batch
↓
Exporter
↓
Observability Backend
```

所以底层思想是一致的：

> **系统首先在 Runtime 中产生原始观测数据，再经过采集、处理、批量上报，最后由监控平台存储、查询和分析。**

区别主要在于观测对象不同。

前端主要观察：

```text
页面
资源
请求
JS Error
用户事件
```

Agent 主要观察：

```text
Agent
Model
Tool
Handoff
Guardrail
HITL
Business Action
```

### 【Observability Backend 如何定位一次具体问题】

假设线上发现：

```text
Task #123
修复登录 Bug 失败
```

监控平台根据：

```text
trace_id = trace_123
```

读取整个 Trace：

```text
Trace: trace_123

Task
↓
Agent
↓
Turn 1
├─ Model
└─ search_code
↓
Turn 2
├─ Model
└─ read_file
↓
Turn 3
├─ Model
└─ write_file
↓
Turn 4
├─ Model
└─ run_test → ERROR
↓
Turn 5
└─ Model → Final Answer
```

然后进一步打开 `run_test` 对应 Span：

```text
Input
Output
Start Time
End Time
Error
Parent Span
```

再沿父级关系向上追溯：

```text
谁触发了 run_test？

前面的 Model Output 是什么？

模型为什么选择这个 Tool？

Tool 前面读取了哪些文件？
```

这就是 Trace 真正实现 Root Cause Analysis（根因分析）的方式。

### 【Metric：从单次执行提升到系统整体监控】

Trace 解决的是：

> **某一次为什么失败。**

生产监控还需要回答：

> **这个问题是不是正在大规模发生。**

这时需要 Metric（指标，即对大量运行数据进行统计后的数值）。

例如每个 Tool Span 只有：

```text
tool = run_test
duration = 2.3s
status = success
```

大量 Span 聚合以后可以得到：

```text
Tool Error Rate = 2.1%
P50 Latency = 0.8s
P95 Latency = 3.2s
```

Agent Task 同样可以聚合：

```text
Task Latency
Task Success Rate
Average Turns / Task
Average Tool Calls / Task
Retry Rate
Handoff Rate
Tokens / Task
Cost / Task
```

Metric 的来源并不只有 Trace 聚合。Runtime 本身也可以直接维护 Usage 或 Counter。

例如 OpenAI Agents SDK 当前会在 Run Context 中累计请求次数和 Token Usage，并可以读取 Request Usage。[[29]](https://openai.github.io/openai-agents-python/usage/)

因此更准确的是：

```text
Metric
来源一：
Runtime 直接采集

来源二：
Trace / Span / Log 聚合
```

### 【Audit：从观测数据中保留治理证据】

Audit（审计）并不是另一套独立运行体系，它主要关注具有治理和责任意义的关键操作。

例如：

```text
user_id
agent_id
tool
resource
authorization_result
policy
approval_result
approver
execution_result
timestamp
trace_id
```

这些业务治理信息 Framework 并不一定全部知道，因此通常需要通过 RunContext、Runtime Policy、Custom Span、Hook 或独立 Audit Service 补充。

例如：

```text
Trace
→ Debug / 执行分析

Audit Record
→ 合规 / 权限 / 追责
```

两者可以通过同一个 `trace_id` 关联。

### 【Agent Observability 的完整实现链路】

把前面的机制组合起来，可以形成一套完整的可观测架构：

```text
                    Agent Task
                        ↓
                   Agent Runtime
                        ↓
                 Instrumentation
                        │
            ┌───────────┴───────────┐
            ↓                       ↓
    Framework Instrumentation   Business Instrumentation
      SDK 自动插桩              Hook / Custom Span
            │                       │
            └───────────┬───────────┘
                        ↓
                 Telemetry Data
                        │
                 Trace / Span
                 Log / Usage
                        ↓
                   Processor
                        ↓
                     Batch
                        ↓
                    Exporter
                        ↓
              Observability Backend
                        │
          ┌─────────────┼─────────────┐
          ↓             ↓             ↓
      Trace View      Metric       Log Search
      单次还原        聚合监控       事件查询
          │             │
          ↓             ↓
    Root Cause       Dashboard
     Analysis         Alert
```

然后这些运行数据可以继续被其他系统消费：

```text
Observability Data
        │
        ├─ Debug
        │   为什么失败
        │
        ├─ Monitoring
        │   系统是否异常
        │
        ├─ Evaluation
        │   Agent 做得好不好
        │
        └─ Governance / Audit
            Agent 是否按规则执行
```

### 【与 Evaluation 和 Governance 的边界】

Observability、Evaluation 和 Governance 解决的问题不同。

```text
Governance
→ 定义“什么可以发生”

Agent Runtime
→ 实际执行

Observability
→ 记录“实际上发生了什么”

Evaluation
→ 判断“发生得好不好”
```

例如 Observability 可以记录：

```text
Agent 调用了 delete_file
path = /production/config
Policy Check = PASS
Approval = user_123
Execution = success
```

Governance 负责定义这类操作应该满足哪些权限和审批规则；Evaluation 则可以继续判断整个任务是否正确、安全、高效地完成。

因此 Observability 实际上为 Evaluation 和 Governance 提供了关键 Evidence（证据）。

### 【核心认识】

Agent Observability 不应该理解成 Trace、Span、Log、Metric 几个独立概念的集合，而应该理解成：

> **一套围绕 Agent Runtime 建立的数据生产、处理和分析体系。**

首先通过 Framework Instrumentation 和 Business Instrumentation，在 Agent、Model、Tool、Handoff、Guardrail 等关键执行节点产生 Trace、Span、Log 和 Usage 等 Telemetry（遥测数据）；然后通过 Processor、Batch 和 Exporter 将这些数据发送到 Observability Backend。

平台一方面根据 Trace 和 Span 还原某一次 Task 的完整执行路径，用于定位 Root Cause；另一方面对大量运行数据进行聚合，形成成功率、延迟、Tool Error Rate、Token 和 Cost 等 Metric，用于长期 Monitoring 和 Alert。最后这些运行证据还可以进一步服务 Evaluation、Governance 和 Audit。

整个体系可以最终收敛为：

```text
Agent Runtime
↓
Instrumentation
↓
Telemetry
↓
Processing
↓
Export
↓
Observability Backend
↓
Single-task Trace Analysis
+
System-level Metric Monitoring
↓
Debug / Alert / Evaluation / Governance
```

### 参考资料补充

[[24]] OpenTelemetry. *Observability Primer* [EB/OL].  
https://opentelemetry.io/docs/concepts/observability-primer/

[[25]] OpenAI. *Tracing — OpenAI Agents SDK* [EB/OL].  
https://openai.github.io/openai-agents-python/tracing/

[[26]] OpenAI. *Lifecycle — OpenAI Agents SDK* [EB/OL].  
https://openai.github.io/openai-agents-python/ref/lifecycle/

[[27]] OpenAI. *Tracing Reference — OpenAI Agents SDK* [EB/OL].  
https://openai.github.io/openai-agents-python/ref/tracing/

[[28]] OpenTelemetry. *Collector* [EB/OL].  
https://opentelemetry.io/docs/collector/

[[29]] OpenAI. *Usage — OpenAI Agents SDK* [EB/OL].  
https://openai.github.io/openai-agents-python/usage/

# 问题：Agent 在执行复杂长任务时，如何保证任务能够持续推进，并在中断后可靠恢复？

## 回答思路

这个问题的起点不是分别解释 State、Memory、Artifact、Checkpoint，而是先回答一个更基础的问题：

> **当一个 Agent Task 需要持续数小时甚至数天，跨越多个 Context Window、多个 Agent Run，甚至多个进程生命周期时，系统怎样保证任务不会因为一次上下文耗尽、局部失败或进程重启而丢失进度，并能够从正确的位置继续执行。**

长任务真正需要解决的不是“让同一个 Agent 一直运行”，而是两个更稳定的工程目标：

```text
Progress Continuity
进度连续性

+

Recoverability
可恢复性
```

Anthropic 在长任务 Agent 的实践中发现，复杂任务如果只依赖一个长 Context，很容易出现一次做得过多、上下文耗尽后留下半完成状态、下一次 Session 不知道之前做了什么等问题。因此其主流做法是先将长任务拆成可逐步完成的工作单元，每次只推进一部分，并通过结构化 Artifact、进度文件、Git History 等持久化产物，把已经完成的工作交接给后续 Session。[[30]](https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents) [[31]](https://www.anthropic.com/engineering/harness-design-long-running-apps)

OpenAI Agents SDK 当前也把 Runtime 内部状态和更上层的长任务编排分开：`RunState` 用于保存一次 Agent Run 的可序列化状态并支持 Pause / Resume；如果任务需要跨长时间等待、重试或进程重启，则官方建议结合 Durable Execution（持久执行）系统来管理更长生命周期的 Workflow。[[32]](https://openai.github.io/openai-agents-python/ref/run_state/) [[33]](https://openai.github.io/openai-agents-python/running_agents/)

因此整个长任务体系可以先理解成：

```text
Long-running Task
        ↓
Task Decomposition
把长任务拆成可独立推进、可独立验收的子任务
        ↓
Workflow State
记录整个任务已经推进到哪里
        ↓
Current Subtask
        ↓
Agent Runtime / RunState
记录当前子任务内部执行到哪里
        ↓
Execution + Evaluation
执行并验收
        ↓
Persistence
沉淀 Artifact / Checkpoint / Memory
        ↓
Context Reconstruction
下一次运行重新构造模型需要的 Context
        ↓
Next Subtask / Resume
```

这里 State、Artifact、Checkpoint、Memory、Context 并不是五个平铺概念，而是长任务持续执行链路中不同层级的机制。

## 标准回答

### 【核心目标：运行可以中断，但任务进度不能丢失】

一个复杂 Agent Task 可能无法在一次模型调用或一次 Context Window 中完成，甚至可能跨多个 Session、多个进程和较长时间周期。

例如：

```text
需求分析
↓
代码分析
↓
技术方案
↓
代码修改
↓
测试
↓
人工审批
↓
发布
```

中间可能出现：

```text
Context Window 达到上限
进程重启
Tool Timeout
网络错误
等待人工数小时
执行节点被重新调度
```

如果任务的关键状态只存在当前进程内存中，一旦进程结束，就只能依赖模型重新理解历史，甚至重新从头执行。

因此长任务 Harness（运行支撑层）真正需要保证的是：

> **某一次 Agent Run 可以结束，某一个进程也可以失败，但已经完成并验证过的任务进度必须独立于运行进程被保存下来。**

这也是为什么长任务稳定性不能只依赖 Context Compaction（上下文压缩）。Anthropic 的长任务实验明确指出，仅仅压缩 Context 并不足以保证跨多个 Session 的工作连续性，因此需要把任务进度和关键产物写到模型上下文之外的持久化环境中。[[30]](https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents)

### 【第一层：先把长任务拆成可独立推进和验收的子任务】

长任务稳定执行的第一步不是 Checkpoint，而是 Task Decomposition（任务拆分）。

一个过大的目标：

```text
“完成整个系统开发”
```

应该被拆成：

```text
Long Task
│
├─ Subtask 1
│  Goal
│  Input
│  Acceptance Criteria
│  Expected Artifact
│
├─ Subtask 2
│  Goal
│  Input
│  Acceptance Criteria
│  Expected Artifact
│
└─ Subtask N
   Goal
   Input
   Acceptance Criteria
   Expected Artifact
```

每个 Subtask（子任务）最好具有独立的：

```text
Goal
明确目标

Input
执行输入

Acceptance Criteria
验收标准

Artifact
阶段产物

Evidence
验收证据

Status
执行状态
```

这样系统就能建立一个明确的提交边界：

```text
Subtask
↓
Agent 执行
↓
Evaluation
验收
↓
Pass
↓
持久化 Artifact
↓
更新 State = Completed
↓
进入下一 Subtask
```

Anthropic 2026 年的长任务 Harness 实践进一步采用 Planner / Generator / Evaluator 结构，把复杂应用拆成可处理的工作块，并通过结构化 Artifact 在不同执行阶段之间传递上下文。[[31]](https://www.anthropic.com/engineering/harness-design-long-running-apps)

所以长任务不是依赖一个模型一直“记住全部历史”，而是依赖：

> **一系列已经被执行、验收并持久化提交的工作单元。**

### 【第二层：State Management 记录任务当前真实执行状态】

State（状态）并不是 Agent 特有概念。前端 Redux / Pinia、Workflow Engine、数据库事务都需要状态管理。

它最基本的含义是：

> **保存能够描述系统当前真实运行状态的数据。**

在长任务 Agent 中，State 最好进一步区分为两个层级。

#### <u>1. Workflow State：记录整个长任务推进到哪里</u>

Workflow State（工作流状态）回答：

> **整个长任务当前执行到哪个阶段、哪个子任务。**

例如：

```ts
type WorkflowState = {
  taskId: string;

  status:
    | "running"
    | "waiting"
    | "failed"
    | "completed";

  currentStage: string;
  currentSubtaskId: string;

  completedSubtasks: string[];
  pendingSubtasks: string[];

  artifactRefs: string[];
};
```

某一时刻可能是：

```text
Task = task_123

currentStage = testing

completedSubtasks =
- requirement-analysis
- implementation

currentSubtask = run-tests

pendingSubtasks =
- review
- release
```

发生中断以后，上层 Workflow 可以根据这份状态判断：

```text
需求分析已经完成
开发已经完成
当前应该从 Testing 继续
```

而不是重新执行整个任务。

#### <u>2. Agent RunState：记录一个子任务内部执行到哪里</u>

进入一个 Subtask 以后，Agent Runtime 内部还有更细粒度的运行状态。

例如：

```text
Subtask：修复登录问题

已经读取 auth.ts
已经执行 search_code
已经生成一次 Model Response
已经完成 write_file
当前等待 run_test
```

这一层可能包含：

```text
Current Agent
Model Responses
Generated Items
Tool Calls
Tool Results
Usage
Approval State
Interruptions
Runtime Context
```

OpenAI Agents SDK 当前的 `RunState` 就属于这一层。官方将其定义为：

> **“Serializable snapshot of an agent run.”**
>
> 即：一次 Agent Run 的可序列化快照。[[32]](https://openai.github.io/openai-agents-python/ref/run_state/)

它保存足够的信息，使一次被暂停的 Agent Run 可以继续执行，包括 Context、Usage、Model Responses、Generated Items、Approval State 和 Interruptions 等。[[32]](https://openai.github.io/openai-agents-python/ref/run_state/)

因此层级应该理解成：

```text
Long Task
│
└─ Workflow State
   整个任务推进到哪个 Subtask
        │
        ↓
   Current Subtask
        │
        └─ Agent RunState
           当前 Agent Loop 执行到哪一步
```

这两个 State 不能混为同一个层级。

### 【第三层：Persistence 把关键状态从进程内存中解耦出来】

State 描述“当前是什么状态”，但 State 本身并不天然等于持久化数据。

例如：

```ts
let currentStage = "testing";
```

它也是 State，只是存在当前 Process Memory（进程内存）中。

长任务需要进一步做 Persistence（持久化）：

> **把任务的重要状态保存到进程生命周期之外的存储中，使新的进程、Session 或 Agent Run 能够重新读取。**

例如：

```text
Runtime State
        ↓
Serialize
序列化
        ↓
Database / File / Git / Object Store
        ↓
Process Exit
        ↓
Load
        ↓
恢复 State
```

所以要区分：

```text
State
→ 要保存哪些运行事实

Persistence
→ 这些事实怎样跨进程长期保存
```

在持久化层中，又可以进一步区分 Artifact、Checkpoint 和 Memory。

#### <u>1. Artifact：保存任务已经产生的长期结果</u>

Artifact（产物）可以理解成：

> **一个阶段或子任务执行后产生，并且后续阶段还需要读取、验证或交付的持久化结果。**

例如 Coding Agent：

```text
requirements.md
implementation-plan.md
Git Commit
patch.diff
test-report.json
screenshot.png
review-result.json
```

Workflow State 可以只保存：

```json
{
  "subtask": "login",
  "status": "completed",
  "artifactRefs": [
    "commit-a8d012",
    "test-report-18"
  ]
}
```

而真正的代码、Commit、测试报告本身才是 Artifact。

所以：

```text
State
→ “登录功能已经完成，产物是 artifact_001”

Artifact
→ artifact_001 对应的代码、文档或测试结果本身
```

Anthropic 的长期 Agent 实践使用进度文件、Feature List 和 Git History 来保存这种外部事实，使新的 Session 可以先读取这些 Artifact，再继续工作。[[30]](https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents)

Artifact 的核心价值是：

> **任务进度不再依赖模型自己“记住”，而是拥有可以重新读取和检查的外部事实依据。**

#### <u>2. Checkpoint：保存一个可恢复时刻的运行状态</u>

Checkpoint（检查点）解决的是：

> **如果系统现在中断，以后应该从哪个状态重新开始。**

它本质上是某一个安全执行位置上的状态快照。

例如：

```text
Subtask 1 完成
↓
Checkpoint A

Subtask 2 执行到 Tool Approval
↓
Checkpoint B
```

Checkpoint A 可能只需要保存：

```text
completed = [subtask1]
current = subtask2
artifactRefs = [...]
```

而 Checkpoint B 可能还需要保存更完整的 Agent RunState：

```text
Model Responses
Generated Items
Pending Approval
Current Agent
Context
Usage
```

OpenAI Agents SDK 的 Human-in-the-loop（人工介入）就是一个非常典型的 Checkpoint / Resume 场景：工具需要审批时，Run 会产生 Interruption；应用可以把 `RunState` 序列化到数据库或队列中，进程退出以后再重新加载该 State，批准或拒绝操作，并继续原来的 Run。官方明确把 `RunState` 称为 HITL 的 durable pause/resume boundary（持久暂停/恢复边界）。[[34]](https://openai.github.io/openai-agents-python/human_in_the_loop/)

伪代码可以理解成：

```python
result = await Runner.run(agent, input)

if result.interruptions:
    state = result.to_state()

    # 持久化到数据库
    save(state.to_json())
```

未来恢复：

```python
state = RunState.from_json(saved_state)

state.approve(interruption)

result = await Runner.run(
    agent,
    state
)
```

这里真正保存的是：

```text
“当前 Run 如何继续”
```

而不是整个企业业务 Workflow 的全部状态。

#### <u>3. Memory：保存未来交互仍需要使用的信息</u>

Memory（记忆）解决的问题和 State 不完全相同。

可以用一个简单判断来区分：

```text
State
→ 现在任务处于什么状态

Memory
→ 未来的交互还需要记住哪些过去的信息
```

工程上通常继续区分：

```text
Short-term Memory
短期记忆
→ 当前 Thread / Task 连续执行所需要的信息

Long-term Memory
长期记忆
→ 跨 Task / Session 仍然值得复用的信息
```

短期记忆可能包括：

```text
Conversation History
当前任务已经确认的事实
最近几轮模型结果
当前 Thread 的必要历史
```

OpenAI Agents SDK 的 `Session` 就属于这种持久化 Conversation History 的能力。官方将 Sessions 描述为 persistent memory layer，用于在多次 Agent Run 之间维护 working context。[[35]](https://openai.github.io/openai-agents-python/)

长期记忆则更适合保存：

```text
用户长期偏好
企业长期规则
已经确认的长期事实
历史任务总结出的经验
```

因此 OpenAI SDK 中也要特别区分：

```text
Session
→ Conversation History

RunState
→ 当前 Agent Run 的可恢复运行状态

Workflow State
→ 整个业务长任务的执行进度
```

三者不能统一叫成“Memory”。

### 【第四层：Context Management 是从持久化状态中构造当前模型输入】

Context 和 State 的边界也非常重要。

假设系统已经保存：

```text
Workflow State
20 个 Subtask

RunState
几十次 Tool Call

Conversation History
几百条 Message

Artifacts
大量文件和报告

Long-term Memory
大量历史记录
```

这些信息不能全部进入 Model Context。

Context Management（上下文管理）的职责是：

> **从系统拥有的完整状态、产物和记忆中，筛选、检索、压缩当前这一轮模型真正需要的信息。**

所以关系应该是：

```text
Workflow State
        │
RunState
        │
Artifact
        │
Short-term Memory
        │
Long-term Memory
        ↓
Context Builder
        ↓
Filter / Retrieve / Summarize / Compact
        ↓
Model Context
```

例如 Testing Agent 当前可能只需要：

```text
Task Goal
Current Stage = Testing
Acceptance Criteria
Current Code Artifact
Latest Test Result
Pending Issues
Next Step
```

而不需要读取需求阶段所有 Model Message。

因此一个很重要的结论是：

> **State 是系统知道什么，Context 是这一轮模型看到什么。Context 必然是对 State、Artifact 和 Memory 的选择与提炼，而不是把所有状态原样塞给模型。**

### 【第五层：一个子任务应该怎样执行、验收和提交】

生产系统中，一个 Subtask 可以理解成一个“小型提交事务”。

完整过程建议是：

```text
Load Workflow State
        ↓
确定 Current Subtask
        ↓
Load Required Artifacts
        ↓
Load Relevant Memory
        ↓
Build Context
        ↓
Runner.run()
        ↓
Agent Loop
Model → Tool → Model
        ↓
产生 Result / Artifact
        ↓
Evaluation
按 Acceptance Criteria 验收
        ↓
     ┌──┴──┐
     ↓     ↓
    Fail   Pass
     ↓     ↓
 Retry /  Persist Artifact
 Repair       ↓
          Update Workflow State
               ↓
          Create Checkpoint
               ↓
          Next Subtask
```

伪代码可以写成：

```ts
async function executeTask(taskId: string) {
  let workflow = await stateStore.load(taskId);

  while (!workflow.completed) {
    const subtask = workflow.currentSubtask;

    const context = await buildContext({
      workflowState: workflow,
      artifacts: await artifactStore.getRelevant(subtask),
      memory: await memoryStore.retrieve(subtask),
    });

    const result = await runner.run(agent, context);

    const evaluation = await evaluate(
      result,
      subtask.acceptanceCriteria
    );

    if (!evaluation.passed) {
      workflow = await handleFailure(
        workflow,
        result,
        evaluation
      );

      await stateStore.save(workflow);
      continue;
    }

    const artifacts =
      await persistArtifacts(result);

    workflow.completeSubtask(
      subtask.id,
      artifacts
    );

    await stateStore.save(workflow);

    await checkpointStore.save({
      taskId,
      workflowState: workflow
    });
  }
}
```

这里最重要的顺序是：

```text
执行
↓
验收
↓
持久化 Artifact
↓
更新 Workflow State
↓
提交 Checkpoint
```

只有经过验收并成功持久化以后，一个 Subtask 才应该真正进入：

```text
Completed
```

### 【第六层：中断恢复不能只做 Retry，还必须处理副作用和幂等性】

如果 Agent 只读取 Checkpoint 然后重新执行，并不能保证一定安全。

例如：

```text
Tool: createOrder()
↓
订单已经创建成功
↓
Process Crash
↓
Workflow State 尚未写入 Completed
```

系统重启以后如果直接：

```text
Retry createOrder()
```

就可能产生第二个订单。

这是因为 `createOrder()` 产生了 Side Effect（副作用）：

> **Agent 的操作改变了外部真实系统状态。**

例如：

```text
写数据库
创建订单
发送邮件
转账
部署
删除文件
```

因此真正的 Recovery（故障恢复）需要：

```text
Load Latest Checkpoint
        ↓
Restore Workflow State
        ↓
Restore RunState（如果需要）
        ↓
检查已产生的外部 Side Effect
        ↓
Reconcile
确认真实世界状态
        ↓
决定：
Continue / Skip / Retry
```

这里还必须引入 Idempotency（幂等性）：

> **同一个业务操作因为恢复或 Retry 被重复调用时，最终业务效果仍然等价于执行一次。**

例如：

```ts
await createOrder({
  idempotencyKey:
    `${taskId}:${subtaskId}:create-order`
});
```

Backend 可以：

```ts
async function createOrder(input) {
  const oldResult =
    await operationStore.find(
      input.idempotencyKey
    );

  if (oldResult) {
    return oldResult;
  }

  const result =
    await reallyCreateOrder();

  await operationStore.save(
    input.idempotencyKey,
    result
  );

  return result;
}
```

恢复以后：

```text
Retry createOrder
↓
检查 idempotencyKey
↓
发现之前已经执行成功
↓
复用原 Result
↓
不重复产生 Side Effect
```

所以需要明确：

```text
Checkpoint
→ 解决“计算从哪里继续”

Idempotency
→ 解决“外部真实操作不能被重复执行”
```

两者解决的是不同层次的问题。

### 【OpenAI Agents SDK 在整个长任务体系中的位置】

OpenAI Agents SDK 主要解决的是 Agent Runtime 层：

```text
Current Subtask
        ↓
Runner
        ↓
Agent Loop
        ↓
Model
        ↓
Tool / Handoff / Guardrail
        ↓
下一轮 Model
```

官方当前的 Runner 会循环调用 Model、执行 Tool、处理 Handoff，直到得到 Final Output；当传入 `RunState` 时，也可以继续一个被暂停的 Run。[[33]](https://openai.github.io/openai-agents-python/running_agents/)

但是如果任务要跨：

```text
长时间等待
多次 Retry
Process Restart
Durable Workflow
```

官方当前进一步提供 Dapr、Temporal、Restate、DBOS 等 Durable Execution 集成。[[33]](https://openai.github.io/openai-agents-python/running_agents/)

因此更准确的层级是：

```text
Business Long-running Task
        │
        ↓
Workflow / Durable Orchestrator
        │
        ├─ Workflow State
        ├─ Subtask State
        ├─ Artifact
        ├─ Checkpoint
        └─ Retry / Recovery
        │
        ↓
OpenAI Agents SDK
        │
        ├─ Runner
        ├─ Agent Loop
        ├─ Session
        └─ RunState
```

所以不能简单认为：

```text
Runner.run()
= 完整长任务调度系统
```

更准确的是：

> **Agents SDK 负责一个 Agent Run 内部的执行和可恢复状态；更长生命周期的业务 Workflow、子任务进度和 Durable Execution，需要由外层 Workflow / Orchestrator 负责。**

### 【完整的长任务执行框架】

最终可以把整个体系组织成：

```text
                     Complex Long Task
                            │
                            ↓
                  Task Planning Layer
             Goal / Subtasks / Acceptance
                            │
                            ↓
                 Workflow State Layer
        completed / current / pending / failed
                            │
                            ↓
                    Current Subtask
                            │
                            ↓
                 Agent Runtime Layer
                      Runner / Loop
                            │
                       RunState
                            │
              Model → Tool → Model
                            │
                            ↓
                       Evaluation
                            │
               ┌────────────┴────────────┐
               ↓                         ↓
             Fail                       Pass
               ↓                         ↓
        Retry / Repair               Artifact
                                         ↓
                                  Persist Result
                                         ↓
                                Update Workflow State
                                         ↓
                                   Checkpoint
                                         ↓
                                   Next Subtask
```

如果运行中断：

```text
Process Failure / Pause
        ↓
Load Latest Checkpoint
        ↓
Restore Workflow State
        ↓
Restore RunState if needed
        ↓
Check Artifact
        ↓
Reconcile External Side Effects
        ↓
Rebuild Context
        ↓
Resume Current Subtask
        ↓
Continue Workflow
```

而每次重新进入模型之前：

```text
Workflow State
+
RunState
+
Relevant Artifact
+
Relevant Memory
        ↓
Context Builder
        ↓
Model Context
```

这样任务进度、持久化数据和模型上下文才真正被分离开来。

### 【核心认识】

Agent 执行长任务，关键不是让一个 Model Call 或一个 Agent Session 无限持续，而是：

> **把长任务转化成一系列可独立执行、可独立验收、可持久化提交的子任务，并让任务状态独立于模型 Context 和运行进程存在。**

其中：

```text
Workflow State
→ 整个任务已经推进到哪里

Agent RunState
→ 当前子任务内部 Agent Loop 执行到哪里

Artifact
→ 已经真正产生了什么可复用、可验证的结果

Checkpoint
→ 系统中断以后可以从哪里恢复

Memory
→ 未来交互还需要记住哪些过去的信息

Context
→ 当前这一轮模型真正需要看到什么
```

因此长任务真正的主线应该记成：

```text
Long Task
    ↓
Task Decomposition
    ↓
Workflow State
    ↓
Agent RunState
    ↓
Execution + Evaluation
    ↓
Persistence
├─ Artifact
├─ Checkpoint
└─ Memory
    ↓
Context Reconstruction
    ↓
Resume
```

同时，涉及数据库写入、订单创建、发送消息、部署等外部副作用时，还必须通过 Idempotency（幂等性）和 Side-effect Reconciliation（副作用对账）保证恢复和 Retry 不会造成重复业务结果。

最终可以将长任务稳定性概括为：

> **运行可以失败，进程可以退出，Context 可以重建，但已经完成并验证过的任务进度、产物和外部业务事实不能丢失。**

### 参考资料补充

[[30]] Anthropic. *Effective harnesses for long-running agents* [EB/OL]. 2025-11-26.  
https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents

[[31]] Anthropic. *Harness design for long-running application development* [EB/OL]. 2026-03-24.  
https://www.anthropic.com/engineering/harness-design-long-running-apps

[[32]] OpenAI. *Run State — OpenAI Agents SDK* [EB/OL].  
https://openai.github.io/openai-agents-python/ref/run_state/

[[33]] OpenAI. *Running agents — OpenAI Agents SDK* [EB/OL].  
https://openai.github.io/openai-agents-python/running_agents/

[[34]] OpenAI. *Human-in-the-loop — OpenAI Agents SDK* [EB/OL].  
https://openai.github.io/openai-agents-python/human_in_the_loop/

[[35]] OpenAI. *OpenAI Agents SDK* [EB/OL].  
https://openai.github.io/openai-agents-python/

# 问题：Agent 在执行过程中发生失败时，应该如何构建可靠执行与故障恢复体系？

## 回答思路

这个问题不能只理解成“Agent 失败以后重试几次”。真正需要解决的是：

> **当 Model、Tool、Workflow 或外部系统发生异常时，系统怎样判断失败是什么性质、是否可以安全重试、任务应该从哪里继续，以及怎样保证已经发生的真实业务操作不会因为恢复过程被重复执行。**

因此，Agent Reliable Execution（可靠执行）应该按照下面这条链路理解：

```text
Action
执行一个步骤
   ↓
Execution Boundary
Timeout / Budget
   ↓
Error / Timeout / Unknown Result
   ↓
Failure Classification
判断失败性质
   ↓
Recovery Decision
Retry / Fallback / Resume /
Reconcile / Compensation / Stop
   ↓
State & Checkpoint
保存或恢复执行状态
   ↓
Side-effect Safety
Idempotency / Operation Record
   ↓
继续后续 Workflow
```

整个体系的核心不是 Retry，而是：

```text
Detect
↓
Classify
↓
Decide
↓
Recover
↓
Reconcile
```

## 标准回答

### 【可靠执行的目标：失败以后系统仍然保持可控】

Agent 系统天然依赖多个不稳定环节：

```text
Agent Run
│
├─ Model API
├─ Tool / MCP
├─ HTTP Service
├─ Database
├─ Human Approval
└─ Other Agent
```

任意一层都可能出现：

```text
Timeout
Network Error
429 / 5xx
参数错误
权限错误
Tool Crash
Process Crash
人工拒绝
返回结果丢失
```

因此生产系统不能把 Action 简单理解成：

```text
Action
↓
Success / Failure
```

而应该至少考虑三种结果：

```text
Action
↓
Success
Failure
Unknown Outcome
```

Unknown Outcome（结果未知）尤其重要。例如支付服务已经完成扣款，但 Response 在网络中丢失，Agent 只看到 Timeout。此时 Timeout 并不能证明支付失败，如果直接 Retry，就可能重复扣款。

所以可靠执行真正追求的是：

> **失败能够被及时发现，失败类型能够被明确判断，系统能够从正确的位置恢复，并且恢复过程不能破坏已经发生的真实业务状态。**

### 【第一层：Execution Boundary——先限制一次执行的边界】

Timeout（超时）负责把“无限等待”转换成一个明确的 Failure Signal（失败信号）。

例如 Model Call、Tool Call、Workflow Node 都应该有各自的执行边界：

```text
Model Call
→ Model Timeout

Tool Call
→ Tool Timeout

Workflow Node
→ Node Timeout / Budget
```

OpenAI Agents SDK 当前允许在 Model Settings 中设置模型调用的超时和重试策略，也允许 Function Tool 定义执行超时。Tool 超时后可以把错误作为 Tool Result 返回模型，也可以直接抛出异常终止当前 Run。[[36]](https://openai.github.io/openai-agents-python/models/) [[37]](https://openai.github.io/openai-agents-python/ref/tool/)

因此 Timeout 本身不是 Recovery，而只是：

> **让一次执行在超过合理时间以后结束，并把“卡住”转换成后续系统能够处理的失败状态。**

### 【第二层：Failure Classification——失败以后先分类，而不是立即 Retry】

#### <u>1. Transient Failure：临时性失败</u>

例如：

```text
Network Timeout
429 Too Many Requests
502 / 503
短暂数据库连接失败
服务暂时不可用
```

这类错误的特点是：

> **相同请求经过一段时间后重新执行，有较大概率成功。**

因此通常可以进入：

```text
Retry
+
Backoff
```

#### <u>2. Permanent Failure：确定性失败</u>

例如：

```text
401 Unauthorized
403 Forbidden
404 Resource Not Found
参数结构错误
业务数据非法
确定性的代码错误
```

这类问题通常不会因为等待几秒再执行一次而消失，因此不应该盲目 Retry，而应该进入：

```text
Repair
Fallback
Human Escalation
Stop
```

#### <u>3. Business Rejection：业务主动拒绝</u>

例如：

```text
Guardrail Reject
Authorization DENY
Human Approval Reject
```

这不是系统故障，而是系统按照治理规则明确拒绝当前 Action。

因此：

```text
Reject
≠
Retryable Error
```

如果人工已经拒绝高风险操作，Agent 不应该简单重新发起相同操作来绕过治理逻辑。

#### <u>4. Unknown Outcome：执行结果未知</u>

例如：

```text
Tool Call
↓
外部服务已经开始处理
↓
网络 Timeout
```

系统无法确定：

```text
根本没有执行
还是
已经执行，只是结果没有返回
```

这类情况不能直接 Retry，而应该先执行 Reconciliation（状态核对）：

```text
payment(transaction_id)
↓
Timeout
↓
queryPayment(transaction_id)
↓
确认真实状态
↓
Retry / Skip / Resume
```

### 【第三层：Retry——只重新执行允许安全重放的操作】

Retry（重试）不是“发生错误就再来一次”，而是：

> **确认错误具有临时性，并且这个 Action 可以安全重复执行以后，再重新执行。**

一个完整 Retry Policy（重试策略）至少需要定义：

```text
哪些异常允许 Retry
最多 Retry 几次
每次 Retry 等多久
什么情况下立即停止
```

常见策略包括：

```text
Max Attempts
Initial Delay
Backoff Factor
Max Interval
Jitter
Retryable Errors
```

其中 Exponential Backoff（指数退避）表示失败次数越多，下一次 Retry 等待时间越长；Jitter（随机抖动）是在等待时间中增加随机量，避免大量任务同时失败后再次同时请求。

LangGraph 当前的 `RetryPolicy` 就包含 `initial_interval`、`backoff_factor`、`max_interval`、`max_attempts`、`jitter` 和 `retry_on` 等配置。[[38]](https://reference.langchain.com/python/langgraph/types/RetryPolicy)

OpenAI Agents SDK 当前的模型级 Retry 同样允许根据 Error、HTTP Status、Network Error、Timeout 和 Replay Safety（重放安全性）决定是否继续重试。[[36]](https://openai.github.io/openai-agents-python/models/)

这里最重要的判断是：

```text
Retryable Error
≠
一定可以 Retry
```

还必须满足：

```text
Replay Safe
```

也就是：

> **即使执行过程被重复一遍，也不会产生不可接受的重复副作用。**

### 【Retry 应该按照最小恢复范围分层】

一次 Agent Task 内部可能同时存在多层 Retry：

```text
Workflow
│
├─ Task Retry
├─ Agent / Node Retry
├─ Model Retry
├─ Tool Retry
└─ External API Retry
```

原则应该是：

> **失败能够在越小的局部范围内恢复，就越不要扩大到更高层重新执行。**

例如：

```text
Model API 503
↓
Retry Model Call
```

而不是：

```text
Model API 503
↓
重新执行整个 Coding Task
```

因为 Retry 范围越大：

```text
重复计算越多
成本越高
恢复时间越长
重复副作用风险越大
```

### 【第四层：Fallback——原执行路径无法恢复时切换备用路径】

Fallback（备用路径或降级）与 Retry 不同：

```text
Retry
→ 同一种执行方式再执行一次

Fallback
→ 换一种仍然可以完成目标的执行方式
```

例如：

```text
Primary Model 长时间不可用
→ Fallback Model

Tool A 不可用
→ Tool B

自动修改代码风险过高
→ 只生成 Patch，交给人工确认
```

因此 Fallback 应由 Workflow 或 Harness 显式设计，而不能默认把所有恢复决策都交给模型临时判断。

### 【第五层：Recovery——恢复整个任务到可以继续执行的状态】

Retry 解决的是：

> **某一步重新执行。**

Recovery（故障恢复）解决的是：

> **系统已经发生故障以后，怎样恢复到一个一致、能够继续运行的状态。**

例如：

```text
Process Crash
↓
Worker Restart
↓
Load Checkpoint
↓
Restore Workflow State
↓
Restore RunState if needed
↓
Reconcile Side Effect
↓
Resume
```

因此 Recovery 是一个更大的过程：

```text
Recovery
│
├─ Restore State
├─ Reconcile
├─ Retry
├─ Resume
├─ Fallback
└─ Compensation
```

OpenAI Agents SDK 可以通过 `RunState` 保存一次 Agent Run 的可序列化状态，并在 HITL 等暂停场景中重新加载后继续 `Runner.run(agent, state)`；对于跨长等待、Retry 和进程重启的 Durable Execution（持久执行），OpenAI 当前则提供与更上层持久化编排系统组合的方式。[[39]](https://openai.github.io/openai-agents-python/running_agents/) [[40]](https://openai.github.io/openai-agents-python/human_in_the_loop/)

### 【第六层：Idempotency——保证重复执行不会产生重复业务结果】

Checkpoint 能解决：

```text
中断以后从哪里继续
```

但不能自动解决：

```text
外部操作到底有没有已经执行成功
```

例如：

```text
chargeCard()
↓
银行已经扣款成功
↓
Process Crash
↓
成功结果还没有写入 Checkpoint
```

恢复以后如果直接 Retry，就可能再次扣款。

因此具有真实 Side Effect（副作用）的 Action 通常需要设计 Idempotency（幂等性）：

> **同一个业务操作即使因为 Retry 被执行多次，最终业务效果仍然等价于执行一次。**

典型方法是为每个业务操作建立稳定的 `operation_id / idempotency_key`：

```text
task_id
+
subtask_id
+
operation_name
↓
idempotency_key
```

例如：

```ts
await charge({
  idempotencyKey:
    "task123:payment:charge"
});
```

Backend 可以先查询这个 Key 是否已经完成：

```text
收到 operation_id
↓
之前执行过？
├─ Yes
│   ↓
│ 返回之前保存的结果
│
└─ No
    ↓
执行真实业务
    ↓
保存 Operation Result
```

Temporal 官方长期强调：Activity 可能由于失败而重新执行，因此具有 Side Effect 的 Activity 应尽量设计成幂等，否则自动 Retry 可能产生重复扣款、重复发送等结果。[[41]](https://docs.temporal.io/activity-definition)

### 【第七层：Reconciliation——结果未知时先核对真实世界状态】

Idempotency 能降低重复执行风险，但对于 Unknown Outcome，系统仍然应该有 Reconciliation（状态核对）能力。

例如：

```text
createOrder(operation_id)
↓
Timeout
↓
queryOperation(operation_id)
```

然后：

```text
SUCCESS
→ 复用已有结果

FAILED
→ 判断是否 Retry

UNKNOWN
→ 继续查询 / 升级人工
```

所以：

> **Timeout 只能证明调用方没有及时拿到结果，不能证明外部操作没有发生。**

因此对于具有真实 Side Effect 的操作，正确链路应该是：

```text
Timeout
↓
Reconcile
↓
确认真实状态
↓
Retry / Skip / Resume
```

### 【第八层：Compensation——无法直接回滚时用反向业务操作恢复一致性】

如果任务包含多个外部业务步骤：

```text
Create Order
↓
Lock Inventory
↓
Charge Payment
```

而 Payment 最终失败，此时前两步可能已经在不同系统中真正提交。

它们通常无法像单数据库事务一样：

```text
ROLLBACK
```

这时需要 Compensation（补偿操作）：

```text
Create Order
→ Cancel Order

Lock Inventory
→ Release Inventory

Charge Payment
→ Refund Payment
```

这就是 Saga Pattern（Saga 模式）中的核心思想：当后续步骤失败时，通过 Compensating Transaction（补偿事务）抵消前面已经提交的业务影响。AWS 的 Saga 指南明确把 Compensation 和 Idempotency 作为分布式长事务恢复的重要机制。[[42]](https://docs.aws.amazon.com/prescriptive-guidance/latest/cloud-design-patterns/saga.html)

需要注意：

```text
Compensation
≠
Rollback
```

Rollback 是撤销一个尚未提交完成的事务；Compensation 则是执行一个新的业务动作，抵消之前已经发生的业务结果。

因此补偿动作本身也需要：

```text
Retry
Idempotency
Observability
```

### 【统一的 Failure Decision Chain】

把前面的机制串起来以后，一次失败可以按照下面的方式处理：

```text
                    Action Failure
                         │
                         ↓
                 Failure Classifier
                         │
       ┌─────────────────┼──────────────────┐
       ↓                 ↓                  ↓
 Transient          Permanent        Unknown Outcome
 临时异常            确定错误           结果未知
       │                 │                  │
       ↓                 ↓                  ↓
 Replay Safe?        Fallback /          Reconcile
       │             Human / Stop           │
   ┌───┴────┐                              ↓
   ↓        ↓                         External State
  Yes       No                         已执行？
   ↓        │                         ┌───┴────┐
 Retry      │                         ↓        ↓
   ↓        │                        Yes       No
Backoff     │                         ↓        ↓
   │        │                       Skip      Retry
   ↓        │                         │
 Success?   │                         ↓
   │        └───────────────→   Resume Workflow
   │
   ├─ Yes → Continue
   │
   └─ No
       ↓
  Retries Exhausted
       ↓
  Fallback / Recovery
       ↓
是否已经产生不可回滚 Side Effect？
       │
   ┌───┴────┐
   ↓        ↓
  Yes       No
   ↓        ↓
Compensate  Stop / Resume
```

这比简单的：

```text
失败
↓
Retry 3 次
```

更接近生产级可靠执行。

### 【可靠执行体系的分层】

最终可以把整个可靠执行体系分成四个主要层级，并由 Observability 横向贯穿。

#### <u>1. Operation Reliability：单次操作可靠性</u>

解决一次 Model / Tool 调用：

```text
Timeout
Retry
Backoff
Replay Safety
```

#### <u>2. Agent / Node Reliability：局部执行单元可靠性</u>

解决一个 Agent 或 Workflow Node：

```text
Retry Policy
Fallback
Error Handler
HITL
```

#### <u>3. Workflow Reliability：长任务可靠性</u>

解决整个长任务：

```text
State
Checkpoint
Recovery
Resume
```

#### <u>4. Business Consistency：真实业务状态一致性</u>

解决已经影响外部世界的操作：

```text
Idempotency
Operation Record
Reconciliation
Compensation
```

而 Observability（可观测性）横向记录：

```text
失败发生在哪一步
Retry 了多少次
为什么触发 Fallback
是否发生 Reconciliation
是否执行 Compensation
最终状态是什么
```

因此整体框架可以表示为：

```text
                  Agent Workflow
                        │
                        ↓
                Agent / Node Runtime
                        │
                        ↓
                 Model / Tool Action
                        │
               ┌────────┴────────┐
               ↓                 ↓
            Success           Failure
               │                 │
               │                 ↓
               │        Timeout + Classification
               │                 ↓
               │          Replay Safety
               │                 ↓
               │      Retry / Fallback / Stop
               │                 ↓
               │          Recovery Layer
               │                 ↓
               │      State / Checkpoint / Resume
               │                 ↓
               │       Business Consistency
               │                 ↓
               │  Idempotency / Reconcile /
               │       Compensation
               │                 │
               └────────┬────────┘
                        ↓
                   Continue Task
                        ↓
                  Observability
```

### 【与长任务状态管理的关系】

上一题解决的是：

```text
任务如何保存有效进度
以及
中断以后从哪里恢复
```

这一题进一步解决：

```text
恢复以后
怎样保证继续执行本身是安全的
```

两者合起来才形成完整长任务可靠性：

```text
Long-running Agent
        ↓
Task Decomposition
        ↓
State / Artifact
        ↓
Checkpoint
        ↓
Failure
        ↓
Failure Classification
        ↓
Retry / Fallback / Reconcile
        ↓
Recovery / Resume
        ↓
Idempotency / Compensation
        ↓
Continue
```

### 【核心认识】

Agent Reliable Execution（可靠执行）的核心不是“自动 Retry”，而是：

> **先为 Model、Tool 和 Workflow Node 建立明确的执行边界；发生失败以后，由确定性规则判断它属于临时异常、永久错误、业务拒绝还是结果未知，再决定是否允许 Retry。对于可以重试的操作，需要同时控制 Retry 次数、Backoff 和 Replay Safety；对于跨进程或长任务失败，需要依赖 State 和 Checkpoint 恢复，并从最近的有效位置 Resume；对于已经影响外部真实系统的 Tool Call，则必须通过 Idempotency、Operation Record 和 Reconciliation 确认真实状态，在无法直接回滚时再通过 Compensation 恢复业务一致性。**

因此真正应该记住的是：

```text
Execute
↓
Detect Failure
↓
Classify
↓
Check Replay Safety
↓
Retry / Fallback / Reconcile
↓
Recover State
↓
Resume
↓
Protect Side Effects
↓
Compensate if Needed
↓
Continue
```

它说明 Agent 从“能够执行任务”走向“能够可靠执行生产任务”，关键不在于增加更多 Retry，而在于建立一套完整的**失败分类、局部恢复、状态恢复和真实业务一致性机制**。

### 参考资料补充

[[36]] OpenAI. *Models — OpenAI Agents SDK* [EB/OL]. 访问日期：2026-09-18.  
https://openai.github.io/openai-agents-python/models/

[[37]] OpenAI. *Tool reference — OpenAI Agents SDK* [EB/OL]. 访问日期：2026-09-18.  
https://openai.github.io/openai-agents-python/ref/tool/

[[38]] LangChain. *RetryPolicy — LangGraph Reference* [EB/OL]. 访问日期：2026-09-18.  
https://reference.langchain.com/python/langgraph/types/RetryPolicy

[[39]] OpenAI. *Running agents — OpenAI Agents SDK* [EB/OL]. 访问日期：2026-09-18.  
https://openai.github.io/openai-agents-python/running_agents/

[[40]] OpenAI. *Human-in-the-loop — OpenAI Agents SDK* [EB/OL]. 访问日期：2026-09-18.  
https://openai.github.io/openai-agents-python/human_in_the_loop/

[[41]] Temporal Technologies. *Activity Definition — Temporal Documentation* [EB/OL]. 访问日期：2026-09-18.  
https://docs.temporal.io/activity-definition

[[42]] Amazon Web Services. *Saga orchestration pattern — AWS Prescriptive Guidance* [EB/OL]. 访问日期：2026-09-18.  
https://docs.aws.amazon.com/prescriptive-guidance/latest/cloud-design-patterns/saga.html

# 问题：Agent 在执行过程中发生失败时，应该如何构建可靠执行与故障恢复体系？

## 回答思路

这个问题的核心不是“Agent 失败以后 Retry 几次”，而是：

> 当 Model、Tool、Workflow 或外部系统发生异常时，系统怎样判断失败是什么性质、是否可以安全重试、任务应该从哪里继续，以及怎样保证已经发生的真实业务操作不会因为恢复过程被重复执行。

因此，一个生产级 Agent 的可靠执行体系应该按照下面的逻辑理解：

```text
Action
执行一个步骤
   ↓
Execution Boundary
Timeout / Budget
   ↓
出现 Error / Timeout / Unknown Result
   ↓
Failure Classification
判断失败性质
   ↓
Recovery Decision
Retry / Fallback / Resume /
Reconcile / Compensation / Stop
   ↓
State & Checkpoint
保存或恢复执行状态
   ↓
Side-effect Safety
Idempotency / Operation Record
   ↓
继续后续 Workflow
```

也就是说，核心不是 Retry，而是：

> **Detect → Classify → Decide → Recover → Reconcile。**

---

## 标准回答

### 【可靠执行的目标：不是避免失败，而是让失败可控】

Agent 系统天然包含大量不稳定环节：

```text
Agent Run
│
├─ Model API
├─ MCP / Tool
├─ HTTP Service
├─ Database
├─ Human Approval
└─ Other Agent
```

其中任意一步都可能出现 Timeout、Network Error、429 / 5xx、参数错误、权限错误、Tool Crash、进程 Crash、返回结果丢失或人工拒绝。

因此生产系统不能假设：

```text
Action
↓
一定成功
```

而应该默认：

```text
Action
↓
Success / Failure / Unknown
```

尤其需要注意 **Unknown Result（结果未知）**。例如 Agent 调用支付接口，服务端已经扣款成功，但响应在网络中丢失，Agent 最终只看到了 Timeout。这个 Timeout 不能直接等价为“支付失败”。

所以可靠执行真正要保证的是：

> **失败能够被发现，失败类型能够被判断，系统能够安全恢复，并且恢复不能破坏真实业务状态。**

---

### 【第一层：Execution Boundary——先限制一次执行的边界】

#### <u>1. Timeout：把无限等待变成明确失败信号</u>

Timeout（超时）解决的是：

> 一次 Model Call、Tool Call 或 Workflow Node 最多允许执行多久。

否则某一步一直阻塞，就会让整个任务无法继续。

OpenAI Agents SDK 当前允许为模型调用配置超时，也允许 Function Tool 配置 `timeout` 与超时后的处理方式。Tool 超时后，可以把超时作为错误结果返回给模型，也可以直接抛出异常。[[1]](https://openai.github.io/openai-agents-python/models/) [[2]](https://openai.github.io/openai-agents-python/ref/tool/)

因此 Timeout 本身不是 Recovery（恢复），它只是：

> **把“无限等待”转换成可被后续策略处理的 Failure Signal（失败信号）。**

---

### 【第二层：Failure Classification——失败以后先分类，而不是立即 Retry】

#### <u>1. Transient Failure：临时性失败</u>

例如：

```text
Network Timeout
429 Too Many Requests
502 / 503
短暂数据库连接失败
服务暂时不可用
```

特点是：同样的请求稍后再次执行，有较高概率成功。

这类错误通常适合：

```text
Retry
+
Backoff
```

#### <u>2. Permanent Failure：确定性失败</u>

例如：

```text
401 Unauthorized
403 Forbidden
404 Resource Not Found
参数结构错误
业务数据非法
代码逻辑错误
```

这类错误通常不会因为等待几秒以后重新调用而自动消失。

因此应该进入：

```text
Fallback
Repair
Human Escalation
Stop
```

而不是继续机械 Retry。

#### <u>3. Business Rejection：业务主动拒绝</u>

例如：

```text
Guardrail Reject
Authorization DENY
Human Approval Reject
```

这并不是系统异常，而是系统正常执行治理规则后明确拒绝当前 Action。

这种情况下通常不能对原操作直接 Retry，否则可能绕过治理逻辑。

#### <u>4. Unknown Outcome：执行结果未知</u>

这是最需要单独处理的一类。

例如：

```text
Tool Call
↓
外部服务执行
↓
网络 Timeout
```

此时无法确定操作到底没有执行，还是已经执行但响应没有回来。

因此：

> **Unknown Result 不能直接当作普通 Failure Retry，而应该先做 Reconciliation（状态核对）。**

例如：

```text
payment(transaction_id)
↓
Timeout
↓
queryPayment(transaction_id)
↓
如果已支付
    → 复用成功结果
否则
    → 再决定是否 Retry
```

---

### 【第三层：Retry——只重新执行“允许重放”的操作】

Retry（重试）的含义不是“失败就再来一次”，而是：

> **确认当前操作适合重复执行以后，再重新执行相同操作。**

一个完整的 Retry Policy（重试策略）至少应该定义：

```text
哪些异常允许 Retry
最多 Retry 几次
每次 Retry 之间等待多久
```

常见配置包括：

```text
Max Attempts
Initial Delay
Backoff Factor
Jitter
```

其中：

- Exponential Backoff（指数退避）：每次失败以后逐步增加等待时间。
- Jitter（随机抖动）：在等待时间中加入随机量，避免大量任务同时失败后又同时重试。

LangGraph 当前的 `RetryPolicy` 包含 `initial_interval`、`backoff_factor`、`max_interval`、`max_attempts`、`jitter`、`retry_on` 等配置，并允许根据异常类型或回调函数决定是否重试。[[3]](https://reference.langchain.com/python/langgraph/types/RetryPolicy)

OpenAI Agents SDK 当前的 Model Retry 也允许根据 `status_code`、`retry_after`、`is_network_error`、`is_timeout`、`response_started`、`replay_safety` 等信息判断是否重试。[[4]](https://openai.github.io/openai-agents-python/zh/models/)

这里最重要的原则是：

> **Retryable Error（可重试错误）不等于一定可以 Retry，还必须判断 Replay Safety（重放安全性）。**

---

### 【Retry 需要分层：尽量在最小范围内恢复】

生产 Agent 中通常存在多层 Retry：

```text
Workflow
│
├─ Agent Run
├─ Model Call
├─ Tool Call
└─ External API
```

因此更合理的分层是：

```text
Model Retry
→ 网络 / Provider 临时异常

Tool Retry
→ Tool 内部临时异常

Node Retry
→ 一个 Workflow Node 整体重新执行

Task Retry
→ 整个子任务重新执行
```

基本原则是：

> **失败能够在越小的局部范围恢复，就越不要扩大 Retry 范围。**

例如 Model API 返回 503，只需要 Retry Model Call，不应该重新执行整个 Coding Task。

LangGraph 当前把 Timeout、Retry 和 Error Handling 组合为 Node-level Fault Tolerance（节点级容错），即一个 Node 先尝试执行，再按 Retry Policy 重试，重试耗尽以后才进入 Error Handler。[[5]](https://github.com/langchain-ai/docs/blob/main/src/oss/langgraph/fault-tolerance.mdx)

---

### 【第四层：Fallback——原路径失效以后切换到备用路径】

Fallback（降级或备用路径）和 Retry 不同：

```text
Retry
→ 同一执行方式再执行一次

Fallback
→ 换一种执行方式继续完成目标
```

例如：

```text
Primary Model 连续失败
→ Fallback Model

Tool A 不可用
→ Tool B

自动代码修改失败
→ 输出 Patch 建议交给人工
```

Fallback 应该由 Workflow / Harness 显式设计，而不是默认依赖模型自行找到替代方案。

---

### 【第五层：Recovery——恢复整个任务，而不是只重试某一步】

Retry 关注的是：

> 某一步重新执行。

Recovery（故障恢复）关注的是：

> 系统发生故障以后，怎样重新恢复到一个可以继续工作的状态。

例如：

```text
Process Crash
↓
Worker Restart
↓
Load Checkpoint
↓
恢复 Workflow State
↓
确定当前 Task
↓
Resume
```

所以 Recovery 是一个更上位的概念：

```text
Recovery
│
├─ Restore State
├─ Reconcile
├─ Retry
├─ Resume
└─ Fallback / Compensation
```

OpenAI Agents SDK 当前可以通过 `RunState` 保存被 Interrupt 的 Agent Run，再序列化并通过 `Runner.run(agent, state)` 继续执行；对于跨长等待、Retry 或 Process Restart 的完整 Durable Execution（持久执行），官方则建议结合更上层的持久化编排系统。[[6]](https://openai.github.io/openai-agents-python/running_agents/)

---

### 【Checkpoint 的意义：复用已经确认成功的工作】

恢复时不能简单理解为“重新执行全部步骤”。

例如同一个并行阶段：

```text
Node A
成功

Node B
成功

Node C
失败
```

如果 A、B 的结果已经被 Checkpoint 或 Pending Writes（待提交写入）记录，恢复时应尽可能复用这些已经成功的结果，而不是把 A、B、C 全部重新执行。

LangGraph 的 Checkpoint 机制会保存 Graph State，并支持保存已经完成的写入，从而减少恢复时不必要的重复工作。[[7]](https://reference.langchain.com/python/langgraph.checkpoint)

这体现了一个重要原则：

> **恢复不是简单重跑，而是从最近一个可信状态继续。**

---

### 【第六层：Idempotency——解决重复执行带来的真实副作用】

Checkpoint 仍然不能自动解决所有问题。

例如：

```text
Tool
↓
真实业务操作已经成功
↓
Process Crash
↓
Checkpoint 还没写成功
```

如果系统恢复以后再次执行这个 Tool，就可能重复产生业务结果。

因此具有真实 Side Effect（副作用）的 Action 最好具备 Idempotency（幂等性）：

> **同一个业务操作重复请求多次，最终业务效果仍然等价于只执行一次。**

例如：

```text
task_id
+
subtask_id
+
operation_name
↓
idempotency_key
```

调用：

```ts
charge({
  idempotencyKey: "task123:payment:charge"
})
```

Backend 先检查：

```text
这个 idempotencyKey 是否已经执行？

Yes
→ 返回之前的结果

No
→ 执行业务操作
→ 保存结果
```

Temporal 官方明确指出，Activity 可能因为故障被重新执行，因此应尽量设计为幂等；如果操作本身不是幂等的，例如重复扣款或重复发送邮件，自动 Retry 就可能产生副作用。[[8]](https://docs.temporal.io/encyclopedia/retry-policies)

AWS 的 Saga 指南同样要求 Saga Participant 尽量具有幂等性，以允许 Crash 或 Orchestrator Failure 后安全地重新执行。[[9]](https://docs.aws.amazon.com/prescriptive-guidance/latest/cloud-design-patterns/saga-orchestration.html)

---

### 【Unknown Outcome 需要 Reconciliation，而不是直接 Retry】

例如：

```text
createOrder()
↓
Timeout
```

更稳妥的流程不是立即重新创建订单，而是：

```text
operation_id = xxx

createOrder(operation_id)
↓
Timeout
↓
queryOperation(operation_id)
```

然后：

```text
Result = SUCCESS
→ 使用已有结果

Result = FAILED
→ 判断是否 Retry

Result = UNKNOWN
→ 继续查询 / 人工介入
```

这个过程称为 Reconciliation（状态核对）：

> **通过查询外部真实状态，重新确认系统记录和真实业务结果是否一致。**

所以：

```text
Timeout
↓
不是直接 Retry
↓
Reconcile
↓
确认真实状态
↓
Retry / Skip / Resume
```

---

### 【第七层：Compensation——真实副作用已经发生时进行业务补偿】

如果前面的业务操作已经成功，但后面的步骤失败：

```text
Order Created
↓
Inventory Locked
↓
Payment Failed
```

此时 Order 和 Inventory 已经产生真实变化，通常无法通过一个跨服务数据库 Rollback 直接恢复。

因此需要 Compensation（补偿操作）：

```text
Create Order
→ Cancel Order

Lock Inventory
→ Release Inventory

Charge Payment
→ Refund Payment
```

这就是 Saga Pattern（Saga 模式）的基本思想：一个 Saga 由多个本地事务组成，如果后续事务失败，则通过 Compensating Transaction（补偿事务）抵消之前已经完成的业务操作。[[10]](https://docs.aws.amazon.com/prescriptive-guidance/latest/cloud-design-patterns/saga-patterns.html)

需要特别区分：

```text
Rollback
→ 撤销同一个事务中的修改

Compensation
→ 新执行一个业务动作，抵消之前动作的业务影响
```

例如支付通常无法真正“回滚”，只能进一步执行退款。

而 Compensation 本身也是新的 Action，因此它同样需要：

```text
Retry
Idempotency
Observability
```

---

### 【统一 Failure Decision：一次失败应该怎样被处理】

整个可靠执行体系可以形成统一的 Failure Decision Engine（失败决策逻辑）：

```text
                    Action Failure
                         │
                         ↓
                 Failure Classifier
                         │
       ┌─────────────────┼──────────────────┐
       ↓                 ↓                  ↓
 Transient          Permanent        Unknown Outcome
 临时异常            确定错误           结果未知
       │                 │                  │
       ↓                 ↓                  ↓
 Replay Safe?        Fallback /          Reconcile
       │             Human / Stop           │
   ┌───┴────┐                              ↓
   ↓        ↓                         External State
  Yes       No                         已执行？
   ↓        │                         ┌───┴────┐
 Retry      │                         ↓        ↓
   ↓        │                        Yes       No
Backoff     │                         ↓        ↓
   │        │                       Skip      Retry
   ↓        │                         │
 Success?   │                         ↓
   │        └───────────────→   Resume Workflow
   │
   ├─ Yes → Continue
   │
   └─ No
       ↓
  Retries Exhausted
       ↓
  Fallback / Recovery
       ↓
是否已产生不可回滚 Side Effect？
       │
   ┌───┴────┐
   ↓        ↓
  Yes       No
   ↓        ↓
Compensate  Stop / Resume
```

这个框架比“失败以后 Retry 三次”完整得多。

---

### 【可靠执行应该按恢复范围分层】

#### <u>1. Operation Reliability（单次操作可靠性）</u>

解决一次 Model / Tool 调用：

```text
Timeout
Retry
Backoff
Replay Safety
```

#### <u>2. Node / Agent Reliability（节点或 Agent 可靠性）</u>

解决一个 Agent 或 Workflow Node：

```text
Retry Policy
Fallback
Error Handler
HITL
```

#### <u>3. Workflow Reliability（工作流可靠性）</u>

解决整个长任务：

```text
State
Checkpoint
Resume
Recovery
```

#### <u>4. Business Consistency（业务一致性）</u>

保护外部真实业务状态：

```text
Idempotency
Operation Record
Reconciliation
Compensation
```

#### <u>5. Observability（可观测性）</u>

记录：

```text
失败发生在哪一步
Retry 了多少次
哪一个 Fallback 被启用
是否执行 Compensation
最终恢复结果是什么
```

因此整体可靠执行框架可以表示为：

```text
                  Agent Workflow
                        │
                        ↓
                Agent / Node Runtime
                        │
                        ↓
                 Model / Tool Action
                        │
               ┌────────┴────────┐
               ↓                 ↓
            Success           Failure
               │                 │
               │                 ↓
               │        Timeout + Classification
               │                 ↓
               │          Replay Safety
               │                 ↓
               │      Retry / Fallback / Stop
               │                 ↓
               │          Recovery Layer
               │                 ↓
               │      State / Checkpoint / Resume
               │                 ↓
               │       Business Consistency
               │                 ↓
               │  Idempotency / Reconcile /
               │       Compensation
               │                 │
               └────────┬────────┘
                        ↓
                   Continue Task
                        ↓
                  Observability
```

---

### 【与长任务状态管理的关系】

上一层长任务框架解决的是：

```text
任务如何保存进度
以及
中断以后从哪里继续
```

可靠执行进一步解决的是：

```text
恢复以后
怎样保证继续执行本身是安全的
```

所以完整关系是：

```text
Long-running Agent
        ↓
Task Decomposition
        ↓
State / Artifact
        ↓
Checkpoint
        ↓
Failure
        ↓
Failure Classification
        ↓
Retry / Fallback / Reconcile
        ↓
Resume
        ↓
Idempotency / Compensation
        ↓
继续执行
```

---

### 【核心认识】

Agent Reliable Execution（可靠执行）的核心不是“自动 Retry”，而是：

> **先为 Model、Tool 和 Workflow Node 建立明确的执行边界；失败以后用确定性规则判断失败属于临时异常、永久错误、业务拒绝还是结果未知，再决定是否允许 Retry。对于能够重试的操作，需要控制次数、退避时间以及 Replay Safety；对于跨进程或长任务失败，需要依赖 State 和 Checkpoint 恢复，并从最近的有效位置 Resume；对于已经影响外部真实系统的 Tool Call，则必须通过 Idempotency、Operation Record 和 Reconciliation 确认真实执行状态，在无法直接回滚时通过 Compensation 恢复业务一致性。**

因此整个可靠执行体系最值得记住的不是几个平铺的术语，而是这一条完整链路：

```text
Execute
↓
Detect Failure
↓
Classify
↓
Check Replay Safety
↓
Retry / Fallback / Reconcile
↓
Recover State
↓
Resume
↓
Protect Side Effects
↓
Compensate if Needed
↓
Continue
```

这才是 Agent 从“能够执行任务”走向“能够可靠执行生产任务”的核心工程框架。

---

# 问题：Agent 的 Orchestration（编排）应该如何设计？什么时候使用代码编排，什么时候使用模型编排？

## 回答思路

Orchestration（编排）解决的不是“怎样调用多个 Agent”，而是：

> **一个复杂任务由哪些执行单元完成、它们按照什么关系执行，以及当前步骤结束后，由谁决定下一步。**

因此，编排设计首先判断的不是使用 Manager 还是 Handoff，而是：

```text
Business Goal → 执行路径能否提前确定？ → 能：Code Orchestration ｜ 不能：LLM Orchestration
```

Anthropic 对 Workflow 和 Agent 的区分建立在这一控制权边界上：Workflow 中，LLM 和 Tool 按照预定义的代码路径运行；Agent 中，则由 LLM 动态控制自己的执行过程和 Tool 使用。[[11]](https://www.anthropic.com/engineering/building-effective-agents)

OpenAI Agents SDK 对 Orchestration 的划分也基本一致：一种是由代码决定 Agent Flow，另一种是让 LLM 根据当前任务进行 Planning、Reasoning 和下一步决策，两种方式可以组合。[[12]](https://openai.github.io/openai-agents-python/multi_agent/)

因此整个问题可以按照下面的层次理解：

```text
Business Workflow
├─ 路径可以预先定义 → Code Orchestration
└─ 局部路径无法预先定义 → LLM Orchestration
                           ├─ Planning / Replanning
                           └─ 需要多个 Agent 时
                              ├─ Manager
                              └─ Handoff
```

最终在生产系统中，两种方式通常不是二选一，而是形成 Hybrid Orchestration（混合编排）：

> **外层尽量确定，内层按需自主。**

## 标准回答

### 【Orchestration 的核心：分配执行控制权】

Agent Orchestration（Agent 编排）本质上是在管理两件事情：

```text
Execution Structure（执行结构） + Decision Right（下一步决策权）
```

例如一个研发任务：

```text
需求分析 → 技术方案 → 代码实现 → 测试 → Review → Release
```

这里需要分别判断这些阶段是不是业务上必须存在、阶段之间的顺序能不能提前确定、进入某个阶段以后具体需要执行哪些动作能不能提前确定，以及如果不能确定，应该由哪个 Agent 根据当前结果动态决定下一步。

所以，**Orchestration 的核心不是提高 Agent 自主性，而是确定“哪些决策应该由代码控制，哪些决策才值得交给模型”。**

### 【确定性 Workflow：能够提前定义的执行关系优先由代码编排】

Anthropic 将 Workflow 定义为 LLM 和 Tool 沿着预定义代码路径运行的系统；同时建议从能够解决问题的最简单方案开始，只在确有需要时增加 Agent 自主性，因为 Agent 往往会用更高的延迟和成本换取更强的任务适应能力。[[11]](https://www.anthropic.com/engineering/building-effective-agents)

因此，如果一个业务已经存在比较稳定的 SOP（标准操作流程），最外层通常应该优先采用 Code Orchestration（代码编排）。例如：

```text
研发：需求分析 → 技术方案 → 开发 → 测试 → Review → Release
会议预约：理解预约要求 → 查询共同空闲时间 → 查询会议室 → 创建会议 → 发送通知
```

这些流程的核心执行关系并不存在太大不确定性。例如“创建会议之前需要找到有效时间”“开发完成以后需要经过测试”，这些是业务约束，而不是模型需要重新推理的问题。

因此代码可以直接控制阶段顺序、条件分支、并行关系和停止条件。即使每个阶段内部都调用 Agent，只要 Agent 之间的执行关系由程序提前定义，本质上仍然属于 Code Orchestration，而不是模型编排。

OpenAI Agents SDK 也明确指出，代码编排可以让 Agent Flow 在速度、成本和行为上更加 deterministic and predictable（确定、可预测），并给出了结构化输出后由代码路由、串联多个 Agent、Evaluator 循环以及并行运行多个独立 Agent 等典型方式。[[12]](https://openai.github.io/openai-agents-python/multi_agent/)

因此可以建立一个贯穿 Agent Engineering 的原则：

> **能够通过确定性机制可靠解决的问题，不应该额外引入模型重新做一次判断。**

例如 `test.exitCode === 0` 已经能够判断测试通过，就不需要再让 LLM 判断“测试是不是通过”。类似地：

```text
确定的流程 → Code Orchestration
确定的权限 → Authorization Policy
确定的验收条件 → Test / Rule
确定的失败策略 → Timeout / Retry Policy
```

模型应该主要承担无法提前穷举、需要理解当前环境，并且必须根据执行结果实时调整的决策。

### 【模型编排：只有无法提前确定的局部执行路径才交给模型】

即使一个任务整体很复杂，也通常不意味着需要把整个 Workflow 都交给模型。更常见的是在确定性 Business Workflow 中，把局部无法提前确定的复杂阶段交给模型：

```text
需求分析 → 【代码实现】 → 测试 → Review → Release
                  ↓
            内部路径不确定
                  ↓
          LLM Orchestration
```

例如进入“代码实现”阶段以后，系统可能无法提前知道需要查看哪些文件、问题位于哪个模块、需要什么 Tool，以及修改一次以后是否还要继续调整。这些决策必须依赖运行过程中获得的新信息，因此才适合由模型负责。

OpenAI 将这种情况描述为 Open-ended Task（开放任务）：模型可以根据当前任务自主进行 Planning（规划）、使用 Tool 获取信息并采取行动，再根据结果继续决定后续步骤。[[12]](https://openai.github.io/openai-agents-python/multi_agent/)

#### <u>Planning 与 Replanning 是模型编排的基础</u>

模型编排首先解决的不是“调用哪个 Agent”，而是“当前任务应该怎样完成”。一个长任务可以按照下面的循环持续推进：

```text
Goal → Plan → Execute → Observe / Evaluate → Plan 仍有效？ → Continue / Replan
```

例如一个 Coding Agent 开始时可能形成 `Plan V1：定位性能问题 → 找到相关代码 → 修改 → 测试`。执行后发现真正的问题来自数据库访问层，后续就可以调整为 `Plan V2：分析 DB Adapter → 修改 Transaction → 调整 Cache → Integration Test`。

因此，模型拥有的是**执行方案调整权**，而不是无限制修改任务本身的权力。比较清楚的边界是：

```text
固定：Goal / Business Constraints / Security Policy / Acceptance Criteria
动态：Plan / Subtasks / Execution Order / Tool Selection / Agent Selection
```

这样既保留模型面对未知问题时的适应能力，又不让任务目标随着 Agent 的推理过程发生漂移。

#### <u>只有任务需要多个专业 Agent 时，才进一步进入 Multi-Agent Orchestration</u>

Planning 可能发现任务需要 Research Agent、Frontend Agent、Backend Agent、Test Agent 等不同专业能力，这时才需要进一步设计多个 Agent 之间的控制关系。

也就是说，逻辑层级应该是：

```text
LLM Orchestration
├─ Planning / Replanning
└─ Multi-Agent Orchestration（按需）
   ├─ Manager
   └─ Handoff
```

而不是把 Planning、Manager、Handoff 当成三个并列的编排方式。

#### <u>Manager：中央 Agent 保留控制权</u>

OpenAI Agents SDK 中对应的是 Agents as tools（Agent 作为工具）模式：Manager Agent 把专业 Agent 暴露成 Tool 调用，专业 Agent 完成任务后把结果返回 Manager，Manager 继续负责后续决策和最终输出。[[12]](https://openai.github.io/openai-agents-python/multi_agent/)

```text
                    Manager
            ┌─────────┼─────────┐
            ↓         ↓         ↓
        Research    Coding     Testing
            └─────────┼─────────┘
                      ↓
              Result → Manager → Evaluate / Replan
```

因此 Manager 的关键不是“主 Agent 调用了子 Agent”，而是 Planning、Task Allocation、Result Aggregation 和 Next-step Decision 始终集中在同一个中央决策单元。

Anthropic 的 Orchestrator-workers 也属于相近思想：中央 LLM 根据当前任务动态拆分 Subtask、分配给 Worker，再综合 Worker 的结果；它特别适用于无法提前知道具体需要哪些子任务的复杂问题。[[11]](https://www.anthropic.com/engineering/building-effective-agents)

需要注意，Manager 和 Parallelism（并行）不是同一个概念。Manager 可以串行调用 Worker，也可以并行分发多个互不依赖的任务；Manager 描述的是**控制权集中在哪里**，Parallelism 描述的是**多少任务同时执行**。[[12]](https://openai.github.io/openai-agents-python/multi_agent/)

#### <u>Handoff：当前 Agent 将控制权交给另一个 Agent</u>

Handoff（控制权转移）采用另一种关系：当前 Agent 判断另一个 Agent 更适合继续处理，就把后续任务的控制权直接交给它。例如：

```text
Triage Agent → Handoff → Refund Agent → 后续由 Refund Agent 接管
```

OpenAI 当前文档说明，发生 Handoff 后，目标 Specialist Agent 会接管当前运行中的后续处理，而不是像 Manager 模式那样完成后把结果返回中央 Agent。[[13]](https://openai.github.io/openai-agents-python/handoffs/)

所以 Manager 与 Handoff 最核心的区别是：

```text
Manager：Manager → Worker → Result → Manager
Handoff：Agent A → Agent B → Agent C
```

也就是：**Manager 是集中式控制；Handoff 是控制权发生转移。**

Handoff 的一条控制链通常表现为单一 Active Agent 的连续切换，但这不意味着整个 Agent System 不能并行。外层 Workflow 仍然可以启动多个执行分支，Handoff 后的 Agent 也可以继续把其他 Agent 作为 Tool 使用。OpenAI 官方明确说明 Manager 和 Handoff 两种模式可以组合。[[12]](https://openai.github.io/openai-agents-python/multi_agent/)

### 【Hybrid Orchestration：外层保持确定性，内层按需释放模型自主性】

生产环境中的 Agent System 通常既不会全部由代码固定，也不会把整个任务完全交给模型自由决定。OpenAI 官方明确指出 Code Orchestration 与 LLM Orchestration 可以混合使用。[[12]](https://openai.github.io/openai-agents-python/multi_agent/)

一个更完整的结构是：

```text
Business Goal
↓
Business Workflow（确定性代码骨架）
├─ 可预定义 Stage → Code / Rule
└─ 动态复杂 Stage
   ↓
   LLM Orchestration
   ├─ Planning / Replanning
   └─ Multi-Agent（按需）
      ├─ Manager
      └─ Handoff
   ↓
   Agent Runtime → Agent Loop → Model / Tool
↓
Evaluation / State Update / Checkpoint → Back to Business Workflow
```

这里需要特别区分三个控制层次。

Business Workflow 管整个任务的业务阶段，业务约束最强，因此确定性要求最高；Dynamic Orchestration 管某一个不确定任务如何被规划、拆分和调度，如果需要多个 Agent，再选择 Manager 或 Handoff；Agent Runtime / Agent Loop 管已经被选中的 Agent 怎样完成当前 Task。

因此它们不是并列概念，而是逐层收缩任务控制范围：

```text
Business Workflow
└─ Dynamic Agent Task
   ├─ Planning / Replanning
   └─ Multi-Agent Orchestration
      ├─ Manager
      └─ Handoff
   ↓
   Agent Runtime → Agent Loop → Model / Tool
```

### 【核心认识】

Agent Orchestration 最终可以归结为一个问题：

> **系统应该把多少执行决策权交给模型。**

Anthropic 建议从能够完成任务的最简单方案开始，只有在任务确实需要灵活决策时再增加 Agent 自主性；OpenAI Agents SDK 也明确把编排分为代码控制与 LLM 控制，并支持两者组合。[[11]](https://www.anthropic.com/engineering/building-effective-agents) [[12]](https://openai.github.io/openai-agents-python/multi_agent/)

因此更稳定的工程原则是：

```text
能确定 → Code / Rule ｜ 无法提前确定 → Model
```

落到完整 Agent System 中，就是：

> **外层 Business Workflow 尽量保持确定性，用代码固定业务阶段、约束和验收边界；只有 Workflow 内部无法提前确定的复杂任务，才交给模型进行 Planning 和 Replanning；只有当这些动态任务确实需要多个专业 Agent 时，再进一步使用 Manager 或 Handoff 组织 Multi-Agent。**

最终形成的控制规律是：

```text
越靠外层 → 业务约束越强、确定性要求越高
越靠内层 → 任务粒度越小、允许的模型自主性越高
```

这比简单讨论“应该用 Workflow、Manager 还是 Handoff”更准确，因为它真正解释了这些机制分别处在哪一层，以及为什么会出现在这一层。

---

## 参考文献

[1] OpenAI. *Models - OpenAI Agents SDK* [EB/OL]. OpenAI Agents SDK Documentation. 访问日期：2026-09-18. https://openai.github.io/openai-agents-python/models/

[2] OpenAI. *Tool Reference - OpenAI Agents SDK* [EB/OL]. OpenAI Agents SDK Documentation. 访问日期：2026-09-18. https://openai.github.io/openai-agents-python/ref/tool/

[3] LangChain. *RetryPolicy - LangGraph Reference* [EB/OL]. LangGraph Documentation. 访问日期：2026-09-18. https://reference.langchain.com/python/langgraph/types/RetryPolicy

[4] OpenAI. *Models（中文）- OpenAI Agents SDK* [EB/OL]. OpenAI Agents SDK Documentation. 访问日期：2026-09-18. https://openai.github.io/openai-agents-python/zh/models/

[5] LangChain. *Fault Tolerance - LangGraph* [EB/OL]. LangGraph Documentation. 访问日期：2026-09-18. https://github.com/langchain-ai/docs/blob/main/src/oss/langgraph/fault-tolerance.mdx

[6] OpenAI. *Running Agents - OpenAI Agents SDK* [EB/OL]. OpenAI Agents SDK Documentation. 访问日期：2026-09-18. https://openai.github.io/openai-agents-python/running_agents/

[7] LangChain. *LangGraph Checkpoint Reference* [EB/OL]. LangGraph Documentation. 访问日期：2026-09-18. https://reference.langchain.com/python/langgraph.checkpoint

[8] Temporal Technologies. *Retry Policies* [EB/OL]. Temporal Documentation. 访问日期：2026-09-18. https://docs.temporal.io/encyclopedia/retry-policies

[9] Amazon Web Services. *Saga Orchestration Pattern* [EB/OL]. AWS Prescriptive Guidance. 访问日期：2026-09-18. https://docs.aws.amazon.com/prescriptive-guidance/latest/cloud-design-patterns/saga-orchestration.html

[10] Amazon Web Services. *Saga Patterns* [EB/OL]. AWS Prescriptive Guidance. 访问日期：2026-09-18. https://docs.aws.amazon.com/prescriptive-guidance/latest/cloud-design-patterns/saga-patterns.html

[11] Anthropic. *Building Effective Agents* [EB/OL]. Anthropic Engineering. 访问日期：2026-09-19. https://www.anthropic.com/engineering/building-effective-agents

[12] OpenAI. *Multi-agent orchestration - OpenAI Agents SDK* [EB/OL]. OpenAI Agents SDK Documentation. 访问日期：2026-09-19. https://openai.github.io/openai-agents-python/multi_agent/

[13] OpenAI. *Handoffs - OpenAI Agents SDK* [EB/OL]. OpenAI Agents SDK Documentation. 访问日期：2026-09-19. https://openai.github.io/openai-agents-python/handoffs/
