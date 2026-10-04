# Agent 研发重点从提示词技巧扩展到上下文组织与可靠运行

Agent 研发从 Prompt 扩展到 Context、Runtime / Harness 与可靠运行，不是一个新概念替代旧概念的过程，而是**系统目标从“让模型生成合适答案”逐渐扩大到“让系统在真实环境中可靠完成任务”后，工程问题不断增加的结果。**

Prompt 首先解决目标和约束怎样表达；当任务需要更多信息时，问题转向这一轮模型应该看到什么，因此出现 Context Engineering；当模型还要调用 Tool 并根据结果继续执行时，又需要 Runtime / Harness 管理状态、能力、权限、恢复和观测；进入真实业务后，长期任务和外部副作用继续要求 Workflow、幂等、对账、持久化和验收。

```text
怎样让模型理解任务？
→ Prompt
        ↓
模型完成任务还缺哪些有效信息？
→ Context
        ↓
怎样让模型行动并根据结果继续判断？
→ Tool + Agent Loop
        ↓
谁承载状态、执行、权限、恢复和观测？
→ Runtime / Harness
        ↓
真实业务怎样长期可靠运行？
→ Workflow + Idempotency + Reconciliation + Persistence + Verification
```

因此后文重点不是追逐 Prompt Engineering、Context Engineering、Harness Engineering 等名称，而是分析每一层新增能力究竟解决了前一层无法解决的什么问题，以及这些能力在实际 Agent 系统中如何协作。
## 1. Prompt 清楚表达目标与约束并成为基础能力

Prompt Engineering 主要解决的是：

> **怎样通过合适的指令，让模型理解任务并产生期望的行为。**

在早期模型能力有限的时候，Prompt 的具体格式和写法会显著影响结果，因此会出现大量角色设定、步骤拆分、Few-shot（少样本示例）和格式约束等技巧。

但随着模型能力增强，这类具体格式的重要性正在下降。

Anthropic 在关于 Context Engineering 的文章中明确指出：

> “the exact formatting of prompts is likely becoming less important”

即：

> **Prompt 的具体格式正在变得没那么重要。** [[1]](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents)

这里描述的是格式影响可能随模型能力减弱，不表示 Markdown、XML、信息顺序和结构边界完全无关。原文仍建议使用分区与标签组织指令；是否改变格式，应根据具体模型和真实失败样例验证。

 另一方面，角色设定、任务拆分与 Few-shot（少样本示例）已成为常见手段，但是否使用仍取决于任务和模型。它们不是要求所有模型固定采用的模板。

因此 Prompt 逐渐收敛为更基础的工程原则：指令清晰、目标明确、边界明确，并根据真实失败案例补充必要约束。

## 2. Context 将提示词扩展为每轮模型可见信息

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

## 3. 上下文管理通过筛选、按需访问与压缩构建有效输入

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

> **给 Agent 一张地图，而不是一本一千页的说明书。** [[2]](https://openai.com/index/harness-engineering/)

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

以 LangChain 当前的消息体系为例，主要包括四类：[[3]](https://docs.langchain.com/oss/python/langchain/messages)

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

## 4. 业务层准备任务输入而 Harness 构建每轮模型上下文

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

本文按最终消费者划分职责：业务层准备任务输入，Harness 负责组织每次模型调用的上下文。这是便于设计的工程划分，不是 Anthropic 定义对实现层位置的强制要求；业务层准备的信息也会影响上下文工程。

而业务 Workflow 在调用 Agent 之前进行的消息整理、状态准备、产物持久化等工作，更适合称为：

> **Business Context Preparation（业务上下文准备）**

或者：

> **Task Context Preparation（任务上下文准备）**

本文使用“业务上下文准备”说明这一层的职责，避免把内容整理、任务状态和权限边界混在一个含义不明的名称里。这只是本文的命名选择。

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

LangChain 的 Context Engineering 文档也区分了 Runtime Context 与真正进入 Model Context 的信息：运行时可以保存用户信息、权限、配置等状态，但只有在 Prompt、Message、Tool 或 Middleware 等环节中显式加入后，模型才会看到这些信息。[[4]](https://docs.langchain.com/oss/python/langchain/context-engineering)

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

OpenAI 的 Harness Engineering 实践也强调把代码库结构、工具、反馈机制和环境组织成 Agent 可以持续工作的运行环境，使 Agent 在明确边界内自主完成任务。[[2]](https://openai.com/index/harness-engineering/)

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

## 5. Harness 围绕长任务提供可靠运行能力并随模型能力调整

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

这就是 Context Reset（上下文重置）。[[6]](https://www.anthropic.com/engineering/harness-design-long-running-apps)

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

> **如何让 Agent 在多个 Context Window、多个执行阶段之间持续取得一致进展。** [[7]](https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents)

OpenAI 在 Harness Engineering 实践中也提到，其 Codex Agent 的单次任务已经可以持续工作数小时。[[2]](https://openai.com/index/harness-engineering/)

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

> Agent 在长时间任务中可能逐渐偏离最初目标。[[6]](https://www.anthropic.com/engineering/harness-design-long-running-apps)

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

> **设计 Agent 可以工作的环境、明确目标，并建立反馈循环。** [[2]](https://openai.com/index/harness-engineering/)

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

**第五节的核心认识**

因此，Harness Engineering 成为 Agent 研发重点，可以从两个相互关联的变化理解。

第一，**模型能力增强以后，Agent 不再需要依赖越来越复杂的 Prompt、Context 和固定 Workflow 来弥补所有能力不足。** Harness 应该持续重新评估自己的假设，把模型已经能够稳定完成的事情重新交给模型自主判断，而不是永久固化为工程流程。Anthropic 将这一原则概括为：Harness 中关于模型能力的假设会随着模型升级而失效。[[5]](https://www.anthropic.com/engineering/managed-agents)

第二，**模型能力提升让 Agent 开始进入更长、更复杂的任务，因此问题从“单次决策能否做对”进一步扩展成“整个任务能否长期稳定完成”。** 长任务天然需要状态持久化、Context 延续、Retry、中断恢复、执行环境恢复、结果验证、Trace 和人工介入等可靠性能力。[[6]](https://www.anthropic.com/engineering/harness-design-long-running-apps) [[7]](https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents)

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

## 6. Workflow 与 Harness 按不同粒度管理可靠性

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

LangGraph 当前支持在节点级配置 `RetryPolicy`，根据异常类型、最大尝试次数和退避策略重新执行失败节点。[[8]](https://docs.langchain.com/oss/python/langgraph/fault-tolerance)

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

OpenAI Agents SDK 当前就是这种设计：需要审批的 Tool Call 不会立即执行，而是产生 `interruptions`；当前 `RunState` 可以序列化保存，批准或拒绝以后，再从同一个状态恢复原 Run。[[9]](https://openai.github.io/openai-agents-python/human_in_the_loop/)

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

LangGraph 的 `interrupt()` 也是类似机制：Graph State 会通过 Checkpointer 持久化，并可以在之后使用相同 `thread_id` 重新加载状态继续执行。[[10]](https://docs.langchain.com/oss/python/langgraph/interrupts)

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

LangGraph 配置 Checkpointer 后可保存执行检查点。恢复能复用已持久保存的进度；节点内未单独提交的代码仍可能重放，外部副作用需要幂等或对账，不能仅凭“以前执行成功”就保证不会重跑。[[11]](https://docs.langchain.com/oss/python/langgraph/persistence)

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

OpenAI Agents SDK 的 `RunState` 可以保存 Agent 运行现场并序列化后恢复。这里特指 SDK 支持的恢复边界，不表示任意进程崩溃时都已自动持久化，也不表示所有业务对象和外部副作用都包含在快照中。[[12]](https://openai.github.io/openai-agents-python/ref/run_state/)

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

OpenAI Agents SDK 支持 Tool 级 `needs_approval`，既可以固定要求审批，也可以通过程序规则根据 Tool 参数动态判断是否需要暂停。[[9]](https://openai.github.io/openai-agents-python/human_in_the_loop/)

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

LangGraph 当前的 Fault Tolerance 文档也采用类似分类思路：Transient Failure 可以使用 Retry；模型可以处理的 Tool Error 可以重新反馈给 LLM；用户可以修复的问题可以暂停等待输入；无法恢复的异常则继续向上暴露。[[8]](https://docs.langchain.com/oss/python/langgraph/fault-tolerance)

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

LangGraph 在 Interrupt 文档中也明确要求：由于恢复时 Node 可能重新从头执行，`interrupt()` 之前发生的 Side Effect 应当设计为幂等操作。[[10]](https://docs.langchain.com/oss/python/langgraph/interrupts)

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

**第六节的核心认识**

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

## 7. Loop 与 Graph 分别控制持续循环与执行拓扑

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

> **Agent 重复执行一轮轮工作，直到满足停止条件。** [[14]](https://claude.com/blog/getting-started-with-loops)

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

[[15]](https://docs.langchain.com/oss/python/langgraph/graph-api)

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

**第七节的核心认识**

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

## 8. 参考文献

[1] Anthropic. [Effective context engineering for AI agents](<https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents>)[EB/OL]. 核验日期：2026-10-04。

[2] OpenAI. [Harness engineering: leveraging Codex in an agent-first world](<https://openai.com/index/harness-engineering/>)[EB/OL]. 核验日期：2026-10-04。

[3] LangChain. [Messages](<https://docs.langchain.com/oss/python/langchain/messages>)[EB/OL]. 核验日期：2026-10-04。

[4] LangChain. [Context engineering in agents](<https://docs.langchain.com/oss/python/langchain/context-engineering>)[EB/OL]. 核验日期：2026-10-04。

[5] Anthropic. [Scaling Managed Agents: Decoupling the brain from the hands](<https://www.anthropic.com/engineering/managed-agents>)[EB/OL]. 核验日期：2026-10-04。

[6] Anthropic. [Harness design for long-running application development](<https://www.anthropic.com/engineering/harness-design-long-running-apps>)[EB/OL]. 核验日期：2026-10-04。

[7] Anthropic. [Effective harnesses for long-running agents](<https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents>)[EB/OL]. 核验日期：2026-10-04。

[8] LangChain. [Fault tolerance](<https://docs.langchain.com/oss/python/langgraph/fault-tolerance>)[EB/OL]. 核验日期：2026-10-04。

[9] OpenAI. [Human-in-the-loop — OpenAI Agents SDK (Python)](<https://openai.github.io/openai-agents-python/human_in_the_loop/>)[EB/OL]. 核验日期：2026-10-04。

[10] LangChain. [Interrupts](<https://docs.langchain.com/oss/python/langgraph/interrupts>)[EB/OL]. 核验日期：2026-10-04。

[11] LangChain. [Persistence](<https://docs.langchain.com/oss/python/langgraph/persistence>)[EB/OL]. 核验日期：2026-10-04。

[12] OpenAI. [Run state — OpenAI Agents SDK (Python)](<https://openai.github.io/openai-agents-python/ref/run_state/>)[EB/OL]. 核验日期：2026-10-04。

[13] LangChain. [3 Years of Graph Engineering with LangGraph](<https://www.langchain.com/blog/3-years-of-graph-engineering-with-langgraph>)[EB/OL]. 核验日期：2026-10-04。

[14] Anthropic / Claude. [Loop engineering: Getting started with loops](<https://claude.com/blog/getting-started-with-loops>)[EB/OL]. 核验日期：2026-10-04。

[15] LangChain. [Graph API overview](<https://docs.langchain.com/oss/python/langgraph/graph-api>)[EB/OL]. 核验日期：2026-10-04。
