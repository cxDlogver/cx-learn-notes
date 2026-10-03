# Agent 完整学习教程：从业务 Agent 化到 Harness、Workflow 与最小实现

## 0. 一篇文档建立 Agent 的完整学习地图

本文是 Full-Stack-AI-NOTES 中 **Agent 通用知识的单一主入口**。原 01～07 系列已经整合到本文，不再要求按七个文件来回跳转。

完整学习链压缩为：

~~~text
业务问题
↓
是否需要 Agent
↓
Prompt / Context / Tool
↓
Agent Loop
↓
State / Memory / Control
↓
五层架构
↓
Workflow / Orchestration / Runtime
↓
Framework / Runtime / Harness
↓
业务 Agent
↓
ReAct / Plan-and-Execute / Reflexion / ToT
↓
最小可运行实现
↓
Eval / Production Governance
~~~

原 01～07 的知识职责在本文中重新映射为：

| 原系列 | 整合后的知识职责 |
| --- | --- |
| 01 从 Prompt Engineer 到 Harness Engineer | 第 6 章：工程对象怎样从 Prompt 扩展到完整 Harness |
| 02 Agent 五层架构 | 第 7 章：模型、上下文、执行、编排、反馈与控制五类职责 |
| 03 Agent 完整工作流 | 第 8 章：State、内外双循环、Checkpoint、Recovery |
| 04 从 LangChain 到 Deep Agents | 第 9 章：Framework、Runtime、Harness 的框架映射 |
| 05 研发缺陷修复 Agent | 第 10 章：通用知识如何进入真实业务 Agent |
| 06 Agent 四种范式 | 第 11 章：不同粒度的动态决策与控制机制 |
| 07 Agent 核心原理与最小实现 | 第 12 章：七个组成与最小 Agent Run |

本文与 [Agent System 研发知识梳理](./Agent-System研发知识梳理.md) 的关系是：

~~~text
Agent 完整学习教程
→ 建立从业务到工程实现的完整学习链

Agent System 研发知识梳理
→ 对 Loop / Runtime / Harness / Context / Memory / Tool / Skill / MCP
  做概念校准和横向对比
~~~

Agent Eval 仍由 [Agent Eval 与 Benchmark](./Agent-Eval与Benchmark.md) 作为独立主入口，因为 Eval 本身已经形成独立知识域，不再重复塞入本文。

## 1. Agent 研发的两种语境

今天讨论“Agent 开发”，经常会混在一起说两件事：一件是把 Agent 用到业务流程里，另一件是开发 Agent 系统本身。两者有关联，但研发对象、要解决的问题和评价方式不同。

这里分的是两种研发语境，不是两种互斥的技术形态。同一个业务流程可以只接入一次模型调用，也可以使用固定编排的 Workflow，还可以接入一个完整的 Agent。

### 【第一类：业务流程 Agent 化】

这类研发从现有业务出发。通常是在已有的业务 SOP 或工程链路中，引入 Agent 处理依赖语言理解、判断或复杂操作的环节。研发对象仍然是业务流程，Agent 是其中新增的一项能力。

例如：

- 在研发流程中，让 Agent 读取需求、修改代码并执行测试；
- 在客服流程中，让 Agent 判断问题原因、查询订单或工单，整理证据并生成处理建议；
- 在运营流程中，让 Agent 分析数据、调用内部工具，生成或执行运营动作。

这类研发主要回答三个问题：Agent 放在哪个业务节点，能够创造什么业务价值，业务边界和风险怎样控制。

它通常有比较明确的流程边界和人工交接点。最终评价也落在业务结果上，例如处理时间是否缩短、解决率或覆盖量是否提高、人力成本是否下降。同时还要检查结果质量、错误率和返工量；如果只是处理得更快，却带来更多问题，就不能算真正提效。

### 【第二类：Agent System 开发】

这类研发直接以 Agent 本身为对象。Agent 是一套以模型推理为核心、配合工具完成任务的智能体系统。它会根据目标和当前上下文判断下一步，调用工具执行，再根据结果继续处理。[[1]](https://www.anthropic.com/engineering/building-effective-agents) [[2]](https://openai.com/business/guides-and-resources/a-practical-guide-to-building-ai-agents/)

| 研发语境          | 研发对象                | 核心问题                                         | 评价重点               |
| ----------------- | ----------------------- | ------------------------------------------------ | ---------------------- |
| 业务流程 Agent 化 | 已有业务 SOP 或工程链路 | Agent 应该放在哪里，能解决什么问题，风险如何控制 | 业务价值，以及结果质量 |
| Agent System 开发 | Agent 系统本身          | 怎样让模型配合工具完成目标                       | 任务完成能力           |

## 2. `Agents in Workflows` -- 在现有业务流程中引入 Agent

### 【`Agents in Workflows` 的定义】

第一类 Agent 研发，可以概括为 **Agents in Workflows（工作流中的 Agent）**：保留已有业务流程作为整体执行框架，在其中需要模型进行复杂理解、推理和动态决策的环节，引入 Agent 作为执行单元。

这是 Microsoft Agent Framework 当前明确使用的官方表述。Microsoft 将 `Agents in workflows` 定义为：

> “Use agents as workflow participants and executors.” [[3]](https://learn.microsoft.com/en-us/agent-framework/workflows/)
>
> 即：**让 Agent 作为工作流中的参与者和执行单元。**

Microsoft 进一步指出，现实生产系统通常不会完全依赖 Agent，也不会完全依赖固定程序，而是把两者组合起来：

> “A workflow defines the high-level process, and individual executors within that workflow use agents for the steps that benefit from LLM reasoning.” [[4]](https://learn.microsoft.com/en-us/agent-framework/journey/workflows)

明确指出：

> “Most real-world applications live somewhere in the middle.” **即大多数真实系统都会采用这种混合方式。** [[4]](https://learn.microsoft.com/en-us/agent-framework/journey/workflows)

因此，这类研发真正关注的不是“如何重新开发一套 Agent Harness”，而是：

> **业务流程里哪些节点值得 Agent 化、为什么需要 Agent、Agent 如何接入现有流程，以及最终如何证明它产生了业务价值。**

---

### 【如何判断一个节点是否值得接入 Agent 能力】

判断一个节点是否值得引入 Agent 的能力，通常分为三步：

1. 是否产生明确的业务价值？
2. 问题是否真的需要Agent的能力？
3. 价值能不能被指标验证？

#### <u>1.判断有没有明确的业务价值</u>

一个节点是否应该 Agent 化，第一步不是判断“AI 能不能做”，而是判断：

> **Agent 接入以后，到底改善了什么业务结果？**

通常可以归纳为两类价值。

第一类是**效率价值**，例如减少人工投入、缩短任务处理周期、降低单任务成本、提高团队单位时间能够处理的任务数量。

例如在研发流程中引入 Coding Agent，如果它能够减少需求分析、代码修改、测试验证等环节中的人工投入，并最终缩短需求从开发到交付的周期，那么它产生的是明确的效率价值。

第二类是**问题解决价值**。有些任务过去无法很好自动化，并不是因为执行速度慢，而是因为其中存在大量人工判断，例如需要综合多个信息源、处理大量异常情况、理解文档或自然语言、根据执行结果不断调整处理方案。Agent 如果能让这些过去依赖人工的工作实现自动化，就产生了新的业务能力。

因此第一层判断应该是：

> **这个 Agent 是在降低成本、提升效率，还是解决过去传统系统无法很好解决的问题？**

如果这两个问题都无法明确回答，那么即使技术上可以使用 Agent，也不应该因为“Agent 是新技术”就投入建设。

Microsoft 最新的 Agent 价值衡量指南也强调，Agent 的价值最终要落在可观察的业务结果上，例如节省时间、降低成本、减少错误、提高质量，而不是只看调用量或使用人数。 [[5]](https://learn.microsoft.com/en-us/agents/center-of-excellence/measure-report-value)

#### <u>2.问题是否真的需要 Agent 能力</u>

**有业务价值，不代表一定需要 Agent。**

这是业务 Agent 研发中非常重要的一层筛选。

OpenAI 在官方《A Practical Guide to Building Agents》中提出，在判断哪些场景值得建设 Agent 时，应优先关注过去传统自动化比较难处理的三类任务：[[2]](https://openai.com/business/guides-and-resources/a-practical-guide-to-building-ai-agents/)

1. **Complex decision-making（复杂决策）**：存在大量例外情况，需要结合上下文进行判断；
2. **Difficult-to-maintain rules（难以维护的复杂规则）**：如果使用传统程序，需要维护大量复杂的 `if/else` 或规则；
3. **Heavy reliance on unstructured data（高度依赖非结构化信息）**：需要理解自然语言、文档、用户表达等信息。

OpenAI 随后给出了一个非常明确的结论：

> “Otherwise, a deterministic solution may suffice.” [[2]](https://openai.com/business/guides-and-resources/a-practical-guide-to-building-ai-agents/)
>
> 也就是:
>
> **如果问题并不具备这些特点，一个确定性的传统方案可能已经足够。** 

例如：

```text
输入 → 字段校验 → 调用固定 API → 数据转换 → 保存结果
```

这种任务即使有十几个步骤，本质上仍然是确定性的。

使用普通代码、脚本或者 Workflow 通常更加：

- 稳定；可预测；成本更低；更容易测试。

没有必要为了使用 Agent 而使用 Agent。

而另一类任务是：

```text
给定目标 → 读取当前环境 → 模型判断：现在缺什么信息？ → 选择工具 → 获得结果 → 根据结果重新判断下一步 → 调整方案 → 直到任务完成
```

这种任务才真正体现 Agent 的价值。

因此第二层可以总结成一句话：

> **不是复杂任务都需要 Agent；只有复杂性来自“决策和执行路径的不确定性”时，Agent 才真正有必要。**

#### <u>3. 判断价值能不能被指标验证</u>

第三个条件是：

> **在建设 Agent 之前，就应该知道以后用什么数据证明它有效。**

不能等上线以后才说：

**<u>“感觉好像提效了。”</u>**

Microsoft 最新 Agent 价值衡量指南明确要求，在 Agent 上线之前建立 **Baseline（基准数据，即没有 Agent 时原流程的数据）**。[[5]](https://learn.microsoft.com/en-us/agents/center-of-excellence/measure-report-value)

例如先记录：

- 原来一次任务平均需要多长时间；
- 原来需要多少人工时间；
- 原来的错误率；
- 原来的处理成本；
- 原来的任务成功率。

然后才能比较 Agent 上线之后：

```text
Before Agent → After Agent
```

到底发生了什么变化。

Microsoft 明确指出：**如果没有上线前的基准数据，后续的价值判断基本只能算猜测。** [[5]](https://learn.microsoft.com/en-us/agents/center-of-excellence/measure-report-value)

这里的指标最好分成两层。

第一层是**Agent 自己有没有把任务做好**，例如：

- 任务成功率； 验收通过率； 准确率； 错误率； 人工接管率； 重试率。

它回答：

**<u>Agent 能不能完成这件事？</u>**

第二层是**它有没有真正改善业务结果**，例如：

- 人工投入减少多少；
- 交付周期缩短多少；
- 单任务成本降低多少；
- 错误率下降多少；
- 业务问题解决率提高多少。

它回答：

**<u>即使 Agent 能做，它是否值得做？</u>**

Microsoft 当前把 Agent 的业务价值主要归纳为四类：Efficiency（效率）、Quality（质量）、Revenue（收入）和 Strategic Value（战略价值），并强调指标最终应该能够对应到业务关心的结果，而不是停留在 Agent 的调用次数上。[[6]](https://learn.microsoft.com/en-us/microsoft-copilot-studio/guidance/agent-business-value-measure-impact)

---

因此，可以把“一个业务节点是否值得 Agent 化”收敛成三个判断

```
业务节点
   ↓
1. 有没有明确的业务价值？
   ↓
提效 / 降本 / 提质 / 解决原来无法自动化的问题
   ↓
2. 这个问题真的需要 Agent 吗？
   ↓
确定性问题 → 优先代码 / 脚本 / Workflow
不确定性问题 → 考虑 Agent
   ↓
3. 价值能不能量化验证？
   ↓
任务质量指标 + 业务结果指标
   ↓
三个条件成立
   ↓
再进入 Agent 方案设计
```

## 3. Agentic System 的三类执行与编排形态

今天我们通常会比较宽泛地把“接收一个任务，经过模型推理、工具调用或流程处理，最终返回结果”的系统都称为 Agent。但从系统内部的执行方式来看，它们其实并不相同。

Anthropic 在《Building Effective Agents》中明确指出，业界对 Agent 的定义并不统一：有些团队把长期自主运行的系统称为 Agent，也有一些团队会把按照预定义 Workflow 运行的系统称为 Agent。Anthropic 将这些不同实现统一归入更宽泛的 `Agentic Systems（智能体式系统）`。[[1]](https://www.anthropic.com/engineering/building-effective-agents)

因此，如果我们关注的是：

> **一个任务交给系统以后，从输入到最终输出，中间究竟是怎样执行和编排的？**

可以先从三种常见形态理解：

```
Agentic System
│
├─ 1. Workflow
│    模型 + 工具按照预定义流程执行
│    流程控制权主要在 Code / Workflow
│
├─ 2. Single-Agent
│    一个 Agent 自主完成任务
│    模型动态决定 Tool / Action / Stop
│    核心运行机制 = Agent Loop
│
└─ 3. Multi-Agent
     多个 Agent 共同完成任务
     每个 Agent 内部运行自己的 Agent Loop
     Agent 之间通过 Orchestration 协调
```

其中最关键的两条判断标准是：

> **第一，执行路径主要由代码决定，还是由模型动态决定。**
>
> **第二，系统里有一个 Agent 决策主体，还是存在多个 Agent 共同完成任务。**

### 【Workflow：模型和工具按照预定义流程执行】

第一类是 **Workflow（工作流）**。

**<u>注意：这里说的 Workflow 是 Anthropic 2024《Building Effective Agents》中的严格含义。</u>**

Anthropic 对 Workflow 的原始定义是：

> “LLMs and tools are orchestrated through predefined code paths.” [[1]](https://www.anthropic.com/engineering/building-effective-agents)
>
> 也就是：
>
> **模型和工具按照开发者预先定义的代码路径进行编排。**

例如：

```text
Input → Model → Search Tool → Model → Database Tool → Output
```

如果开发者已经提前规定：

```text
Model 之后一定调用 Search → Search 完成后一定再次调用 Model → 之后一定调用 Database → 最后输出结果
```

那么即使整个过程存在：

- 多次模型调用；
- 多个工具；
- 条件判断；
- 循环；
- 复杂的数据处理；

它仍然可以只是 Workflow。

这里的“预定义代码路径”描述的是**流程结构和控制规则由开发者显式定义**，不等于 Workflow 中所有节点都必须按照单线程串行方式运行。Microsoft Agent Framework 当前既提供 Sequential Orchestration，也提供 Concurrent Orchestration，因此一个显式 Workflow 仍然可以包含并行执行、条件分支和 Agent Executor；关键区别仍然是整体控制边界由 Workflow 明确，而不是把全部流程决策交给模型。[[9]](https://learn.microsoft.com/en-us/agent-framework/workflows/orchestrations/sequential) [[10]](https://learn.microsoft.com/en-us/agent-framework/workflows/orchestrations/concurrent)

判断它是不是 Agent 的关键，不是：**“有没有使用 LLM？”**而是：**“LLM 有没有获得执行过程的决策权？”**

Anthropic 对 Agent 的定义正好形成对应关系：

> “LLMs dynamically direct their own processes and tool usage.” [[1]](https://www.anthropic.com/engineering/building-effective-agents)
>
> 即：
>
> **模型动态控制自己的执行过程以及工具使用方式。** 

因此：

```text
Model → 固定 Search → Model → 固定 Database
```

和：

```
Model
 ↓
模型自己判断
├─ Search
├─ Database
├─ Read File
└─ Final
```

虽然表面上都有“模型 + 工具”，但本质不同。

前者：

```
控制权 = Workflow / Code
```

属于 Workflow。

后者：

```
控制权 = Model
```

才开始进入 Agent。

所以这一类可以概括为：

> 开发者提前规定任务执行结构，由程序负责控制模型、工具和节点之间如何流转。模型可以在某个节点中进行推理，但并不负责决定整个执行过程中下一步应该做什么。因此，使用了 LLM 和 Tool 并不意味着系统就已经成为 Agent。

### 【Single-Agent：一个 Agent 通过 Agent Loop 自主推进任务】

第二类是真正的 **Single-Agent System（单 Agent 系统）**。

Single-Agent 的核心特点是：

> **整个任务中只有一个 Agent 决策主体，它根据目标、上下文以及环境反馈，持续判断下一步应该做什么。**

例如：

```text
Goal
 ↓
Agent
 ↓
Model
 ↓
判断当前状态
 ↓
决定下一步
├─ Search
├─ Read File
├─ Write File
├─ Run Test
└─ Final
```

#### <u>Agent Loop：单 Agent 的核心运行机制</u>

实际执行路径是在任务运行过程中逐步形成的，这种持续执行机制就是：

**<u>Agent Loop（Agent 执行循环）</u>**。

OpenAI Agents SDK 当前官方 Runner 的运行过程就是一个明确的 Agent Loop：

1. 调用当前 Agent 的模型；
2. 模型产生结果；
3. 如果结果已经是 Final Output，则结束；
4. 如果模型产生 Tool Call，则执行工具；
5. 把 Tool Result 加入输入；
6. 再次调用模型；
7. 如果发生 Handoff，则切换当前 Agent并继续循环。[[7]](https://openai.github.io/openai-agents-python/running_agents/)

单 Agent 情况下，可以简化成：

```text
                 ┌────────────────────┐
                 ↓                    │
Goal → Context → Model                 │
                   ↓                   │
                Decision               │
             ┌─────┴─────┐             │
             ↓           ↓             │
         Tool Call      Final           │
             ↓                         │
        Execute Tool                    │
             ↓                         │
       Tool Result                      │
             ↓                         │
      Update Context ──────────────────┘
```

因此 Agent Loop 的核心不是 “存在一个 while 循环。”

而是：

> **每一轮由模型根据当前状态决定下一步动作。**

模型通常需要决定：

```text
要不要继续？ → 现在应该做什么？ → 调用哪个 Tool？ → Tool 参数是什么？ → 结果是否足够？ → 是否需要调整计划？ → 任务是否已经完成？
```

这才是 Agent Loop 的关键。它的伪代码可以表述为：

```javascript
function runAgent(userInput) {
  let context = [userInput];

  while (true) {
    // 1. 模型根据当前上下文决定下一步
    const response = model.generate({
      context,
      tools: availableTools
    });

    // 2. 如果模型认为任务已经完成，则结束
    if (response.type === "final") {
      return response.output;
    }

    // 3. 如果模型决定调用工具
    if (response.type === "tool_call") {
      const tool = availableTools[response.toolName];

      // 执行工具
      const result = tool.execute(response.args);

      // 4. 把工具调用和结果写回上下文
      context.push({
        type: "tool_call",
        name: response.toolName,
        args: response.args
      });

      context.push({
        type: "tool_result",
        result
      });

      // 5. 继续下一轮，让模型根据新结果再次判断
      continue;
    }
  }
}
```

### 【Multi-Agent：多个 Agent 通过 Orchestration 共同完成任务】

第三类是：

**<u>Multi-Agent System（多 Agent 系统）</u>**。

它意味着一个任务不是只由一个 Agent 完成，而是由多个具有不同职责的 Agent 共同完成。

例如：

```text
Research Agent
Coding Agent
Testing Agent
Review Agent
```

每个 Agent 本身都可以有：

```text
Model + Instructions + Tools + Agent Loop
```

但是一旦出现多个 Agent，系统就多了一个单 Agent 没有的问题：

> **这些 Agent 之间到底怎么协作？**

例如：

```text
谁先执行？ → 谁后执行？ → 是否并行？ → 当前 Agent 的结果给谁？ → 下一个 Agent 是谁？ → 失败以后回到哪个 Agent？ → 什么时候整个任务结束？
```

解决这个问题的就是：

**<u>Orchestration（编排）</u>**。

OpenAI 对 Agent Orchestration 有非常直接的官方定义：

> “Orchestration refers to the flow of agents in your app.” [[8]](https://openai.github.io/openai-agents-js/guides/multi-agent/)

并进一步提出三个问题：

**<u>哪些 Agent 运行、按照什么顺序运行，以及下一步如何决定。</u>**

因此可以把 Orchestration 简单理解为：

> **Orchestration 是协调多个 Agent 执行关系的机制，它决定哪些 Agent 参与、它们按照什么关系执行以及下一步如何流转。**

这里要区分两个词：

```text
Orchestration
= 编排机制 / 控制关系

Orchestrator
= 承担编排职责的控制主体
```

因此 Multi-Agent：

> **一定需要 Orchestration。**

但是：

> **不一定需要一个独立的 Orchestrator Agent。**

### 【编排必须拆成 Decision Authority、Execution Topology 与 Control Ownership】

过去最容易混淆的一点，是把 Code / LLM、Sequential / Concurrent、Manager / Handoff 全部放进同一棵“编排模式”分类树。它们实际上回答三个不同问题。

| 维度 | 回答的问题 | 常见取值 |
| --- | --- | --- |
| Decision Authority | 谁决定下一步 | Code-controlled / Model-controlled / Hybrid |
| Execution Topology | 多个执行单元怎样连接 | Sequential / Concurrent / Group Collaboration |
| Control Ownership | 当前任务控制权由谁持有 | Centralized Manager / Handoff Transfer |

因此同一个系统可以同时是：

~~~text
Hybrid Decision Authority
+
Concurrent Execution
+
Centralized Manager
~~~

也可以是：

~~~text
Code-controlled Workflow
+
Sequential Execution
+
没有独立 Orchestrator Agent
~~~

这三个维度是可组合的，不是互斥选项。

OpenAI 当前明确说明 Agent 可以通过 LLM 决策或代码编排，而且两者可以混合使用。[[11]](https://openai.github.io/openai-agents-python/multi_agent/) Microsoft Agent Framework 则把 Sequential、Concurrent、Handoff、Group Chat、Magentic 分别作为不同协作拓扑提供。[[21]](https://learn.microsoft.com/en-us/agent-framework/workflows/orchestrations/)

所以后文的 Code Orchestration / Model Orchestration 只是在解释 **Decision Authority**；Manager / Handoff 主要解释 **Control Ownership**；Sequential / Concurrent / Group Chat 主要解释 **Execution Topology**。


因为编排职责既可以由程序承担，也可以由模型 Agent 承担。它可以有两种典型实现：

```text
Orchestrator
│
├─ Code / Workflow Engine
│    → Code Orchestration
│
└─ Manager / Supervisor Agent
     → LLM Orchestration
```

#### <u>1. Code-controlled：由代码承担主要路由决策</u>

第一类 Multi-Agent 编排方式是：

> **Code Orchestration（代码编排，即由代码决定 Agent 的执行关系）**。

OpenAI 当前明确把 Agent Orchestration 分成两个主要方向，其中一个就是：

> “Orchestrating via code” [[8]](https://openai.github.io/openai-agents-js/guides/multi-agent/)
>
> 即：
>
> **通过代码决定 Agent 的执行流。**

例如：

```text
Analysis Agent → Coding Agent → Testing Agent → Review Agent
```

开发者已经提前规定：

```text
Analysis 完成 → Coding；Coding 完成 → Testing；Testing 通过 → Review
```

或者：

```text
Testing Agent
      ↓
PASS ─────→ Review Agent

FAIL ─────→ Coding Agent
```

虽然存在多个 Agent，但是：

```text
PASS → Review
FAIL → Coding
```

这种映射关系是在系统设计阶段提前定义的。

因此属于：

> **Code-orchestrated Multi-Agent（代码编排的多 Agent 系统）**。

Microsoft Agent Framework 当前也直接提供了这种模式。例如：

> **Sequential Orchestration（顺序编排）**：多个 Agent 按照定义好的顺序依次执行，每个 Agent 的输出传递给下一个 Agent。[[9]](https://learn.microsoft.com/en-us/agent-framework/workflows/orchestrations/sequential)

Microsoft 还提供：

> **Concurrent Orchestration（并行编排）**：多个 Agent 同时独立处理任务，然后收集和汇总它们的结果。[[10]](https://learn.microsoft.com/en-us/agent-framework/workflows/orchestrations/concurrent)

因此：

```text
Agent A → Agent B → Agent C
```

即使没有 Supervisor，也仍然属于 Multi-Agent。

这说明：

> **Multi-Agent 不等于 Supervisor，也不等于模型动态调度。**

一个最简单的 **Code / Workflow Engine（代码驱动的工作流引擎）** 伪代码可以写成这样：

```js
function runWorkflow(input) {
  let state = {
    data: input,
    currentStep: "prepare"
  };

  while (state.currentStep) {
    switch (state.currentStep) {
      case "prepare":
        state.data = prepareData(state.data);
        state.currentStep = "agent";
        break;

      case "agent":
        // 调用一个 Agent 节点
        const agentResult = runAgent(state.data);
        state.data = agentResult;
        state.currentStep = "check";
        break;

      case "check":
        // 根据预定义规则决定下一个节点
        if (state.data.passed) {
          state.currentStep = "save";
        } else {
          state.currentStep = "retry";
        }
        break;

      case "retry":
        state.data = retryProcess(state.data);
        state.currentStep = "agent";
        break;

      case "save":
        saveResult(state.data);
        state.currentStep = null;
        break;
    }
  }

  return state.data;
}
```

它对应的流程是：

```
Input
  ↓
Prepare
  ↓
Agent
  ↓
Check
 ├─ PASS → Save → End
 └─ FAIL → Retry → Agent
```

这里最关键的是：

> **节点之间怎么流转，是由 Code / Workflow Engine 预先写好的规则决定的。**

#### <u>2. Model-controlled：由模型承担主要动态路由决策</u>

另一类是：

> **LLM Orchestration（模型编排，即模型根据当前任务状态动态决定下一步由哪个 Agent 执行）**。

OpenAI 对这一方式的定义是：

> 让 LLM 利用自己的智能进行 planning、reasoning，并决定下一步采取什么步骤。[[8]](https://openai.github.io/openai-agents-js/guides/multi-agent/)

例如：

```text
Current Task
     ↓
Manager Agent
     ↓
Model 判断当前需要什么能力
     ↓
 ┌───────┼────────┐
 ↓       ↓        ↓
Research Coding  Review
 Agent    Agent    Agent
```

这里 Agent 的调用顺序不一定提前确定。

同一个任务可能是：

```text
Research → Coding → Review
```

另一个任务可能变成：

```text
Research → Research → Review → Coding → Testing
```

真正决定执行轨迹的是运行时模型。

因此这类系统属于：

**<u>LLM-orchestrated Multi-Agent（模型编排的多 Agent 系统）</u>**。

生产系统通常采用 **Hybrid Orchestration**：

~~~text
Code / Workflow
→ 固定 Stage、Budget、Permission、Gate

Model
→ 处理开放式判断、Routing、Planning

Runtime
→ 校验 Policy、State、Checkpoint、Retry

Human
→ 处理高风险审批
~~~

因此“代码编排”和“模型编排”不是必须全局二选一。更稳定的原则是：**让代码固定必须确定的边界，让模型处理真正不确定的决策。**

##### ==模型编排的第一种典型模式：Manager==

OpenAI 当前最常见的一种 Multi-Agent 模式是：

> **Agents as Tools（把其他 Agent 作为工具调用）**。

结构可以表示为：

```text
Manager Agent → Model 判断 → 调用 Research Agent → Research Agent 执行 → Result → Manager Agent → 继续判断下一步
```

OpenAI 官方的定义非常清楚：

> “A manager agent keeps control ... and calls specialist agents through `Agent.as_tool()`.” [[11]](https://openai.github.io/openai-agents-python/multi_agent/)
>
> 也就是：
>
> **Manager Agent 始终保留整个任务的控制权，把其他专业 Agent 作为子任务执行者调用。**

例如：

```text
                    Manager
                       │
          ┌────────────┼───────────┐
          ↓            ↓           ↓
      Research      Coding       Review
       Agent         Agent        Agent
          ↓            ↓           ↓
        Result       Result      Result
          └────────────┼───────────┘
                       ↓
                    Manager
```

因此它的控制关系是：

```text
Manager → 调用 Specialist → Specialist 完成任务 → 结果返回 Manager → Manager 再决定下一步
```

关键特点就是：

> **控制权没有转移。**

所以 Manager / Supervisor 可以理解为一种：

**<u>中心化的模型编排方式。</u>**

OpenAI 的 Manager 模式核心 API 是：

```python
research_agent = Agent(
    name="Research Agent",
    instructions="负责完成研究任务"
)

manager_agent = Agent(
    name="Manager Agent",
    instructions="负责拆解任务并调用专业 Agent",
    tools=[
        research_agent.as_tool(
            tool_name="research",
            tool_description="研究指定主题并返回结果"
        )
    ]
)

result = await Runner.run(
    manager_agent,
    input="研究这个问题并给出结论"
)
```

这里最关键的是：

这里最关键的是：

```python
research_agent.as_tool(...)
```

OpenAI SDK 会把 `Research Agent` 包装成一个 **FunctionTool（函数工具）**，然后放进 Manager 的 `tools` 中。模型看到的仍然是标准 Tool 信息：

```text
name        = research
description = 研究指定主题并返回结果
parameters  = { input: ... }
```

因此对 Manager Model 来说：

```text
Research Agent
```

和：

```text
Search Tool
Database Tool
```

在“选择能力”这一层非常类似。`Agent.as_tool()` 就是把一个 Agent 暴露成其他 Agent 可以调用的 Tool。[[12]](https://openai.github.io/openai-agents-python/zh/tools/)

SDK 内部可以简化理解成

```ts
while (true) {
  // Manager 自己的 Agent Loop
  const response = managerModel.generate(
    managerContext,
    managerTools
  );

  if (response.type === "final") {
    return response.output;
  }

  if (response.type === "tool_call") {

    // research 实际对应 researchAgent.as_tool()
    const tool = toolRegistry[response.toolName];

    const result = await tool.execute(response.args);

    // Agent as Tool 最终仍产生 Tool Result
    managerContext.add({
      type: "tool_result",
      result
    });

    // Manager 继续下一轮
  }
}
```

重点在 `Agent.as_tool()` 的 `execute()`。

可以进一步简化成：

```ts
async function executeAgentTool(args) {

  // 1. 把 Manager 生成的参数，
  //    转成子 Agent 的输入
  const childInput = buildInput(args);

  // 2. 启动一个新的子 Agent Run
  const childResult = await Runner.run(
    researchAgent,
    childInput
  );

  // 3. 取得子 Agent 最终结果
  return childResult.finalOutput;
}
```

所以整体控制流是：

```text
Manager Agent Loop
        ↓
Manager Model
        ↓
tool_call("research")
        ↓
research_agent.as_tool()
        ↓
启动 Nested Agent Run
        ↓
Research Agent
        ↓
Research Agent 自己的 Agent Loop
Model → Tool → Observation → Model
        ↓
Final Result
        ↓
包装成 Tool Result
        ↓
返回 Manager
        ↓
Manager 继续自己的 Agent Loop
```

这就是为什么：

<u>**Manager 的控制权始终没有真正转移。**</u>

它只是“暂停一下”，调用子 Agent 完成一个子任务，拿回结果以后继续。OpenAI 官方正是这样描述 Manager 模式：Manager 保持控制，并通过 `Agent.as_tool()` 调用专业 Agent。[[11]](https://openai.github.io/openai-agents-python/multi_agent/)

**<u>Manage 子 Agent 默认可以隔离对话 Context</u>**

这也是 `Agent.as_tool()` 很重要的一点。

默认情况下，Parent Manager 的完整 Conversation History **不会自动复制给子 Agent**。OpenAI 官方明确说明：

> `Agent.as_tool()` 启动的是 nested agent run，父级 Run 的 conversation state 不会自动继承。[[12]](https://openai.github.io/openai-agents-python/zh/tools/)

所以默认更像：

```text
Manager Context
────────────────────────
User: 帮我研究 A
Manager: ...
Tool Call: research({
   input: "研究 A 的市场情况"
})
────────────────────────
            ↓

Research Agent Context
────────────────────────
"研究 A 的市场情况"
────────────────────────
```

而不是：

```text
Research Agent
自动获得 Manager 所有历史消息
```

这给 Specialist Agent 很好的上下文隔离：

- Research Agent 只看到它需要处理的子任务；
- 不必加载 Manager 的全部历史；
- Prompt 更聚焦；
- Token 更少；
- 不容易被无关历史干扰。

如果确实需要共享对话历史，可以显式给父 Run 和 nested Run 使用同一个 `session`。OpenAI 文档明确提供了这种方式。[[12]](https://openai.github.io/openai-agents-python/zh/tools/)

但是注意，**Application Context（程序运行上下文）默认并没有因此被复制隔离**。例如：

```python
context = {
    "user_id": "...",
    "db": db,
    "logger": logger
}
```

在同一运行体系中，nested `Agent.as_tool()` 可以共享底层 application context；隔离的主要是模型看到的 Conversation Context。[[13]](https://openai.github.io/openai-agents-python/context/)

##### ==模型编排的第二种典型模式：Handoff==

另一种典型模式是：

**<u>Handoff（控制权交接）</u>**。

例如：

```text
Triage Agent → 判断当前属于退款问题 → Handoff → Refund Agent
```

OpenAI 当前明确指出：

> Handoff 时，前一个 Agent 将任务路由给 Specialist，而 Specialist 成为新的 active agent。[[11]](https://openai.github.io/openai-agents-python/multi_agent/)

所以 Handoff 不同于 Manager：

```text
Manager：Agent A → 调用 Agent B → B 完成子任务 → 结果返回 A
```

而 Handoff：

```text
Agent A → handoff → Agent B → B 接管后续任务
```

也就是：

<u>**Manager 是“我让你帮我完成一个子任务”；Handoff 是“这个任务接下来由你负责”。**</u>

Microsoft Agent Framework 对 Handoff 也给出了非常清楚的解释：

> Handoff orchestration 中 Agent 可以把控制权转给另一个 Agent，并且不存在一个中央 Orchestrator 始终控制整个流程。[[14]](https://learn.microsoft.com/en-us/agent-framework/workflows/orchestrations/handoff)

这个例子也进一步说明：

> **Multi-Agent 需要 Orchestration，但并不意味着一定存在一个中心 Orchestrator。**

Handoff 的 OpenAI API 不放在：

```python
tools=[...]
```

而放在：

```python
handoffs=[...]
```

例如：

```python
refund_agent = Agent(
    name="Refund Agent",
    instructions="负责退款问题"
)

triage_agent = Agent(
    name="Triage Agent",
    instructions="判断用户问题应该交给哪个 Agent",
    handoffs=[
        refund_agent
    ]
)

result = await Runner.run(
    triage_agent,
    input="我要申请退款"
)
```

也可以显式使用：

```python
from agents import handoff

triage_agent = Agent(
    name="Triage Agent",
    handoffs=[
        handoff(refund_agent)
    ]
)
```

OpenAI 明确指出：

> **Handoffs are represented as tools to the LLM.** [[15]](https://openai.github.io/openai-agents-python/handoffs/)

也就是说，对模型来说，SDK 可能把它转换成类似：

```text
transfer_to_refund_agent(...)
```

这样的 Tool。[[15]](https://openai.github.io/openai-agents-python/handoffs/)

因此模型侧仍然可以理解成：

```text
name + description + arguments
```

与普通 Tool 的选择形式很接近。

SDK Runtime 内部真正不同的地方

可以简化成：

```ts
while (true) {
  const response = await currentAgent.model.generate(...);

  if (response.type === "handoff_call") {
    const handoff = handoffRegistry[response.name];

    // 1. 执行 handoff 自己的回调
    // 日志、鉴权、预取数据……
    await handoff.onHandoff(context, response.args);

    // 2. Runner 处理 Handoff 的控制语义
    const nextAgent = handoff.targetAgent;

    // 3. Runner 处理下一 Agent 要看到的上下文
    context = applyHandoffInputFilter(
      context,
      handoff.inputFilter
    );

    // 4. 切换 active agent
    currentAgent = nextAgent;

    continue;
  }
}
```

所以 Handoff 的核心是：

```ts
currentAgent = refundAgent
```

也就是：

```text
Triage Agent
     ↓
Model
     ↓
调用 transfer_to_refund_agent
     ↓
Runtime 识别为 Handoff
     ↓
currentAgent =
Refund Agent
     ↓
下一轮 Model Call
由 Refund Agent 执行
```

整个 Run 没有结束，也没有启动一个“执行完以后返回 Triage”的 nested run。

OpenAI 明确说明：

> **Handoff stays within a single run.** [[15]](https://openai.github.io/openai-agents-python/handoffs/)

Active Agent 发生变化，但仍然是同一个 top-level Run 和 turn loop。[[15]](https://openai.github.io/openai-agents-python/handoffs/)

> Handoff 发生后，就像新的 Agent 接管了当前 conversation，因此默认会看到之前的 conversation history。[[15]](https://openai.github.io/openai-agents-python/handoffs/)

所以：

```text
Shared Conversation Context
────────────────────────────
User:
我要退款

Triage Agent:
我来判断问题类型

Tool:
查到订单 123

Handoff:
transfer_to_refund_agent
────────────────────────────
             ↓

Refund Agent
继续看到前面的 Conversation
```

如果不希望全部共享，OpenAI 提供：

```python
handoff(
    refund_agent,
    input_filter=...
)
```

`input_filter` 可以修改真正交给目标 Agent 的历史，例如：

- 去掉 Tool Call；
- 去掉某些旧消息；
- 只保留摘要；
- 重新组织历史。

官方的 `HandoffInputData` 甚至明确区分了 `input_history`、`pre_handoff_items`、`new_items` 等历史组成部分。[[15]](https://openai.github.io/openai-agents-python/handoffs/)

##### ==Manager vs Handoff==

```javascript
                         Agent
                           │
              ┌────────────┴────────────┐
              │                         │
           tools=[]                 handoffs=[]
              │                         │
              ↓                         ↓
      agent.as_tool()               handoff()
              │                         │
              ↓                         ↓
         FunctionTool                 Handoff
              │                         │
模型看到：      │                         │
          tool-shaped call       tool-shaped call
              │                         │
Runtime：      ↓                         ↓
       Nested Agent Run          Switch Active Agent
              │                         │
              ↓                         ↓
         Final Result           Same Run Continues
              │                         │
              ↓                         ↓
        Tool Result            New Agent takes over
              │
              ↓
        Parent Manager
```

###### **Handoff：适合“连续接管”的多 Agent 协作**

**Handoff 的核心是：**

> 当前 Agent 判断后续任务应该由另一个 Agent 负责，于是把控制权直接交给它。

比如：

```text
Incident Agent → 发现问题进入数据库领域 → Handoff → Database Agent → 继续处理
```

它的优势主要有两个。

第一，**任务流转更直接**。不需要每完成一步都回到 Manager 再重新分配：

```text
Handoff：A → B → C
```

而不是：

```text
Manager：Manager → A → Manager → B → Manager → C
```

所以对于天然就是串行接力的任务，Handoff 可以减少中央 Agent 的中转。

第二，**很适合上下文连续的任务**。例如故障排查中，Database Agent 需要知道前面已经查了什么、排除了什么、为什么怀疑数据库。这时让它继承前序 Context，可以直接继续，而不是重新收集信息。

它的主要局限是：

> **Handoff 本身不是并行机制。**

一次 Handoff 本质是：

```
A → B
```

而不是：

```
   → B
A
   → C
```

所以如果一个任务需要同时启动多个独立 Agent，Handoff 并不是最自然的模式。

因此，Handoff 更适合：

> **串行、职责明确、前后 Agent 强依赖同一任务上下文的连续协作。**

###### Manager：适合“集中调度”的多 Agent 协作

Manager 模式不同。

它的核心是：

> Manager 始终负责整个任务，其他 Agent 只是被它调用来完成某个子任务，完成以后结果返回 Manager。

它最大的优势是**全局控制比较强**。

Manager 可以统一决定：

- 任务怎么拆；
- 哪些 Agent 参与；
- 哪些任务串行；
- 哪些任务并行；
- 哪个阶段需要验收；
- 最终如何汇总。

因此它天然比较适合组织并行任务：

```
                 Manager
             ┌─────┼─────┐
             ↓     ↓     ↓
             A     B     C
             │     │     │
             └─────┼─────┘
                   ↓
                 汇总
```

还有一个很重要的使用场景，就是**阶段验收和审查**。

例如：

```text
Manager → Implementation Agent → 代码产物 → Manager → Review Agent → PASS / FAIL
```

这里甚至可以故意让 Implementation Agent 和 Review Agent 的 Context 隔离。

Review Agent 只看到：

```text
需求 + 验收标准 + 最终代码
```

而不看到 Implementation Agent 前面的完整分析和自我解释。

这样可以减少前一个 Agent 的判断对 Review Agent 的干扰，更适合做独立验收。

Manager 的主要缺点也很明显：

**<u>容易形成中心瓶颈。</u>**

如果所有 Agent 都不断：

```
Agent → Manager → Agent → Manager
```

那么：

- Manager 的 Context 会越来越大；
- 汇总成本增加；
- Token 成本增加；
- 整体吞吐量可能受 Manager 限制。

所以 Manager 更适合：

> **需要集中控制、并行调度、结果汇总、阶段门禁或者独立 Review 的任务。**

### 【Group Collaboration 解决多 Agent 的共享协作】

Sequential、Concurrent、Manager 和 Handoff 之外，还存在一类需要多轮共享讨论和反复改进的协作拓扑。

~~~text
Writer
  ↓
Shared Conversation
  ↑        ↓
Reviewer  Fact Checker
  \        /
    Coordinator
~~~

Microsoft Agent Framework 当前把 Group Chat 作为正式 Orchestration Pattern：多个 Agent 围绕同一 Conversation History 协作，由 Orchestrator 根据策略选择下一位参与者，并在轮次之间同步上下文。[[22]](https://learn.microsoft.com/en-us/agent-framework/workflows/orchestrations/group-chat)

它适合 Writer ↔ Reviewer 的多轮改稿、多角色共同分析，以及需要相互看到其他 Agent 观点的协作任务。它和 Concurrent 的区别是：Concurrent 更强调独立并行后汇总；Group Collaboration 强调共享上下文和多轮互动。

~~~text
Execution Topology
≠
Decision Authority
≠
Control Ownership
~~~

### 【Orchestration vs Agent Loop】

Multi-Agent 并不是用 Orchestration 替代 Agent Loop。

实际上，两者处在不同层级。

例如：

```text
                    Orchestration
              “哪个 Agent 执行？”
                       │
        ┌──────────────┼──────────────┐
        ↓              ↓              ↓
 Research Agent    Coding Agent   Testing Agent
        │              │              │
        ↓              ↓              ↓
   Agent Loop      Agent Loop      Agent Loop
        │              │              │
        ↓              ↓              ↓
      Tools           Tools           Tools
```

Orchestration 解决：

> **多个 Agent 之间怎么协作。**

Agent Loop 解决：

> **某一个 Agent 接到任务以后自己怎么完成。**

例如 Orchestrator 决定：

```text
下一步运行 Coding Agent
```

随后 Coding Agent 内部可能执行：

```text
Model → Read File → Model → Edit File → Model → Run Test → 发现失败 → Model Replan → Edit → Run Test → Final
```

这些过程仍然属于 Coding Agent 自己的 Agent Loop。

所以：

> **Orchestration 管 Agent 之间的关系，Agent Loop 管一个 Agent 内部的执行过程。**

这是这套体系中最重要的边界之一。

### 【整体体系整理】

最终可以把整个框架统一成：

```text
                    Agentic System
                          │
          ┌───────────────┼────────────────┐
          ↓               ↓                ↓
      Workflow       Single-Agent      Multi-Agent
          │               │                │
          │               │                │
     Code 控制路径     Model 控制路径    多个 Agent
          │               │                │
     Model + Tool       Agent Loop      Orchestration
     固定编排              │                │
                          │       ┌────────┴────────┐
                          │       ↓                 ↓
                          │ Code Orchestration  LLM Orchestration
                          │ 代码决定 Agent       模型决定 Agent
                          │   的流转              的流转
                          │                         │
                          │                ┌────────┴────────┐
                          │                ↓                 ↓
                          │        Manager / Supervisor   Handoff
                          │        控制权保留             控制权转移
                          │
                          ↓
                    Tool / Skill / MCP
```

还可以进一步用“控制权”来理解：

| 系统形态                         | 有几个 Agent | 谁决定下一步    | 核心机制                        |
| -------------------------------- | -----------: | --------------- | ------------------------------- |
| Workflow                         |            0 | Code / Workflow | 预定义流程                      |
| Single-Agent                     |            1 | Model           | Agent Loop                      |
| Multi-Agent + Code Orchestration |         多个 | Code / Workflow | Orchestration + 多个 Agent Loop |
| Multi-Agent + LLM Orchestration  |         多个 | Model / Agent   | Orchestration + 多个 Agent Loop |

Microsoft 当前的 Workflow 能力体系也很好地印证了这种组合关系：它既支持 **Agents in workflows（把 Agent 作为 Workflow 执行单元）**，又单独提供 Sequential、Concurrent、Handoff、Group Chat、Magentic 等多 Agent 编排模式。[[3]](https://learn.microsoft.com/en-us/agent-framework/workflows/)

这套知识可以最终收敛为：

> 第一类是 Workflow：模型和工具虽然参与执行，但沿开发者预定义的代码路径运行，模型没有获得整体执行过程的控制权，因此严格来说并不是 Agent。Anthropic 早期对 Workflow 与 Agent 的核心区分就是“预定义代码路径”与“模型动态控制过程和工具使用”。 [[1]](https://www.anthropic.com/engineering/building-effective-agents)
>
> 第二类是 Single-Agent：系统只有一个 Agent 决策主体，模型根据目标、上下文和工具返回结果持续判断下一步动作、工具调用和结束条件。这种 Model → Tool → Observation → Model 的持续运行机制就是 Agent Loop。OpenAI Agents SDK 的 Runner 就按照这一循环执行 Agent。 [[7]](https://openai.github.io/openai-agents-python/running_agents/)
>
> 第三类是 Multi-Agent：多个 Agent 共同完成一个任务，每个 Agent 内部仍然具有自己的 Agent Loop，而 Agent 之间还需要 Orchestration 来管理执行关系。OpenAI 将 Agent Orchestration 定义为决定哪些 Agent 运行、按照什么顺序运行以及下一步如何决定，并把编排主要分为 Code Orchestration 和 LLM Orchestration。模型编排中又可以采用 Manager / Agents-as-Tools 或 Handoff 等典型方式。 [[8]](https://openai.github.io/openai-agents-js/guides/multi-agent/)

## 4. Workflow 从固定编排到 Agents in Workflows

在 Agent 体系的发展过程中，`Workflow` 这个词的使用范围发生了明显变化。

### 【早期的严格区分：Workflow 和 Agent 是两种不同的执行方式】

Anthropic 在 2024 年发布的《Building Effective Agents》中，对 Workflow 和 Agent 给出了一套影响很大的区分。Anthropic 先指出，业界对 `Agent` 本身并没有完全统一的定义，因此把这些不同形态统一归入更宽泛的 **Agentic Systems（智能体式系统）**，然后再区分 Workflow 和 Agent：[[1]](https://www.anthropic.com/engineering/building-effective-agents)

> “Workflows are systems where LLMs and tools are orchestrated through predefined code paths.”
>
> **Workflow 是模型和工具按照预先定义好的代码路径执行任务。**

而 Agent：

> “LLMs dynamically direct their own processes and tool usage.”
>
> **Agent 由模型动态决定自己的执行过程以及工具使用方式。**

即：

因此，这套分类真正关注的是：

**<u>谁决定下一步做什么？</u>**

如果是开发者提前通过代码和规则决定：

```text
Step A
  ↓
Step B
  ↓
条件判断
├─→ Step C
└─→ Step D
```

那么它属于 Anthropic 当时所说的 Workflow。

即使某个节点里面调用了 LLM：

Code → 调用 LLM → Code 决定下一步

它仍然不是严格意义上的 Agent，因为模型只是完成一个被指定的任务，并没有控制整个任务的执行过程。

OpenAI 现在也给出了非常相近的判断标准：

> “Applications that integrate LLMs but don’t use them to control workflow execution … are not agents.” [[2]](https://openai.com/business/guides-and-resources/a-practical-guide-to-building-ai-agents/)

也就是说：

> **使用了 LLM，并不等于使用了 Agent；关键是模型是否参与了工作流执行过程中的决策。**

相反，如果执行过程是：

```text
Goal
  ↓
Model 判断当前状态
  ↓
决定下一步 → Tool / Action → 获得结果
    ↑                            ↓
    └─────── Model 再判断 ←──────┘
                   ↓
                  ...
                   ↓
                 Final
```

那么执行路径不是开发者事先完全写死，而是由模型根据目标和当前环境动态决定。

这就是 Agent 的基本执行方式，而这个反复进行：**<u>推理 → 行动 → 获得结果 → 再推理</u>**的运行机制，就是我们通常所说的 **Agent Loop（智能体循环）**。

Anthropic 对 Agent 的总结也非常直接：

> Agent 通常就是 LLM 根据环境反馈，在一个循环中不断使用工具。[[1]](https://www.anthropic.com/engineering/building-effective-agents)

所以，在这个最基础的层面，可以先形成一个很简单的判断：

```text
完成一个任务
├─ 路径基本确定
│  └─→ Code / Rule 决定下一步
│          ↓
│      Deterministic Execution
│      确定性执行
│
└─ 路径无法提前确定
   └─→ Model 根据目标和状态决定下一步
             ↓
           Agent
             ↓
         Agent Loop
```

OpenAI 也明确建议：如果问题不需要复杂决策、不需要处理难以维护的规则或大量非结构化信息，那么 **“a deterministic solution may suffice”**，即使用确定性的解决方案可能已经足够。

---

### 【Workflow 概念的扩展：从单层流程到 Agents in Workflows】

随着 Agent 开始处理更复杂、更长时间运行的任务，`Workflow（工作流，即完成一个目标所需要经过的一组执行步骤）` 在不同框架中的使用范围逐渐变得更宽。这里需要先明确：**并不是 Agent Harness 的出现重新定义了 Workflow，而是不同厂商开始在不同抽象层使用 Workflow 这个词。** 因此，今天讨论 Workflow 时，需要先明确它描述的是“整个任务的执行结构”，还是某个 Agent 内部的执行过程。

OpenAI 当前对 Workflow 使用了一个非常宽泛的定义：

> “A workflow is a sequence of steps that must be executed to meet the user’s goal.”
>
> 也就是：
>
> **Workflow 是为了完成用户目标而需要执行的一系列步骤。** [[2]](https://openai.com/business/guides-and-resources/a-practical-guide-to-building-ai-agents/)

这个定义只说明“任务由一系列步骤组成”，并没有规定这些步骤一定由固定代码执行，也没有规定一定由 Agent 动态执行。[[2]](https://openai.com/business/guides-and-resources/a-practical-guide-to-building-ai-agents/)

Microsoft Agent Framework 对 Workflow 的工程定义更加明确：

> “explicit, inspectable execution paths for coordinating code, agents, state, events, and human input.”
>
> 也就是：
>
> **Workflow 是一条明确、可以检查的执行路径，可以同时协调代码、Agent、状态、事件以及人工输入。** [[16]](https://learn.microsoft.com/en-us/agent-framework/concepts/workflows/)

因此，在当前的工程语境中，更适合把 Workflow 理解成**<u>完成一个任务的外层执行结构</u>**。它的节点既可以由普通代码执行，也可以由 Agent 执行，可以**<u>包括确定性代码，Agent Loop 和多 Agent 之间的编排</u>**。[[16]](https://learn.microsoft.com/en-us/agent-framework/concepts/workflows/)

Microsoft 官方称为 **Agents in Workflows（工作流中的智能体，即让 Agent 成为 Workflow 中的执行节点）**。官方示例就是把多个专业 Agent 接入一个 Workflow，再通过明确的节点关系让它们依次完成内容生成、翻译、Review 等任务。[[17]](https://learn.microsoft.com/en-us/agent-framework/workflows/agents-in-workflows)

#### <u>1. 节点的执行方式</u>

根据 Agent System 的三类执行和编程形态，在 Workflow 中，不同节点面对的任务性质不同，因此不应该统一使用 Agent。更合理的方式是：**<u>先判断这个节点的问题是“规则明确”还是“需要动态判断”，再决定采用代码、单 Agent 或多 Agent。</u>**

Microsoft Agent Framework 对这一点给出了非常清晰的工程判断：对于 Workflow 中的每一步，应该分别决定——**由模型判断下一步，就使用 Agent Executor（智能体执行器）；由代码确定结果，就使用 Deterministic Executor（确定性执行器，即普通业务代码）；如果需要人工判断，则设置 Human-in-the-loop Gate（人工介入门禁）。**

因此，一个节点首先可以按任务性质分成两类：

```text
当前 Workflow Node
        ↓
是否能够通过明确规则稳定执行？
        │
   ┌────┴────────┐
   ↓             ↓
 可以           不可以
   ↓             ↓
Code / API / Script   Agent
```

对于**规则明确、输入输出稳定、执行路径可以提前确定**的任务，例如固定的数据转换、调用接口、执行测试命令，直接使用代码或脚本即可。Microsoft 的 Workflow Executor（工作流执行器）本身就同时支持“自定义业务逻辑”和“AI Agent”两种执行单元。

对于**需要结合上下文判断、存在较多例外、需要理解非结构化信息，或者具体执行步骤无法提前写死**的任务，更适合交给 Agent。OpenAI 在《A Practical Guide to Building Agents》中给出的判断标准也基本一致：Agent 更适合复杂决策、难以维护的大量规则，以及高度依赖自然语言、文档等非结构化数据的场景；如果不满足这些条件，**“a deterministic solution may suffice”——确定性的解决方案可能已经足够。** [[2]](https://openai.com/business/guides-and-resources/a-practical-guide-to-building-ai-agents/)

如果一个 Agent 已经能够稳定完成当前节点，就没有必要继续拆分；只有当这个节点进一步涉及**多个独立职责、不同专业能力、并行处理或者独立审查**时，才进一步考虑 Multi-Agent（多智能体协作）。

所以节点的选择可以简单归纳为：

```text
Business Goal
  ↓
Business Workflow（定义高层任务阶段）
  ↓
Workflow Node
  ↓
判断节点如何执行
├─ 执行路径明确
│  └─→ Code / API / Script
│
└─ 需要模型动态判断
   └─→ Agent
       ├─ 一个 Agent 足够
       │  └─→ Agent Loop
       │
       └─ 需要多个 Agent
          └─→ Multi-Agent Orchestration
              ├─ Code Orchestration（代码决定执行关系）
              └─ LLM Orchestration（模型动态决定）
                 ├─ Manager
                 └─ Handoff
```

核心原则就是：

> Workflow 不要求每个节点都使用 Agent，而是根据每个阶段的问题特点选择最合适的执行方式：确定性的任务尽量交给代码，需要推理的任务才交给 Agent，只有出现真实的多角色协作需求时再引入 Multi-Agent。

#### <u>2. Workflow 的作用</u>

为什么今天 Workflow、Agent Loop、Multi-Agent 会形成这样一种多层结构，一个很重要的推动因素就是**长任务**。

Agent 在处理几分钟的任务时，可以较多依赖当前 Context。

但是任务如果持续：

几个小时甚至几天；跨多个 Context Window；跨多个 Session。

单纯依赖一个 Agent Loop 就会出现很多工程问题：

Context 不断增长 → 需要 Compression（上下文压缩） → 早期细节可能丢失；Session 中断 → 新的 Agent 不知道之前做过什么；执行失败 → 不知道应该从哪里重新开始。

Anthropic 在 2025 年的长任务研究中明确指出：

> 长任务需要跨多个 Context Window 工作，而新的 Session 并不会天然拥有之前 Session 的记忆。[[18]](https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents)

因此 Anthropic 使用：

`Feature List（功能清单）`；`Progress File（进度文件）`；`Git History（代码历史）`。

让新的 Agent Session 能快速恢复当前工作状态。[[18]](https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents)

到 2026 年，Anthropic 在《Harness design for long-running application development》中进一步总结了两个重要经验：

> 把大型任务拆成可以处理的小块；通过 Structured Artifacts（结构化产物）在不同 Session 之间传递 Context。[[19]](https://www.anthropic.com/engineering/harness-design-long-running-apps)

因此，一个长任务通常会逐渐形成：

Long-running Task → Planning → Task 1 → Artifact + Evaluation → Task 2 → Artifact + Evaluation → Task 3

每个阶段拥有相对明确的：

Goal（目标）；Input（输入）；Output（输出）；Acceptance Criteria（验收标准）。

这样做的意义并不只是“把任务拆小”。

更重要的是，每一个阶段都形成了一个独立的执行和失败边界：

Task 1 已完成 → 保存 Artifact / Checkpoint → Task 2 执行失败

系统可以重新执行 Task 2，而不需要把整个长任务从头执行。

`Checkpoint（检查点，即保存某个阶段已经完成的运行状态）`也已经成为 Microsoft Workflow 的正式能力，用来支持工作流暂停以后继续执行，以及进程重启后的任务恢复。[[20]](https://learn.microsoft.com/en-us/agent-framework/workflows/checkpoints)

因此，对于长任务，更稳定的设计通常是：

```text
阶段内部
├─ 使用 Context
└─ 保证当前任务连续执行

阶段之间
├─ 使用 Artifact / Structured State
└─ 保存稳定结果

关键阶段完成
├─ 保存 Checkpoint
└─ 保证失败后能够恢复
```

这可以总结成一句很重要的工程原则：

> Context 更适合保存短期的工作状态；Artifact 和 Checkpoint 更适合保存长期的任务状态。

而在这些执行结构之外，还需要一层负责长期稳定运行的工程能力，例如：

State Management（状态管理）；Checkpoint（中断恢复）；Artifact（产物管理）；Context Management（上下文管理）；Evaluation（结果验收）；Human-in-the-loop（人工介入）；Tracing / Observability（运行追踪和监控）。

这些能力更适合归到 **Agent Harness（智能体运行框架，即围绕模型和 Agent 提供长期运行、状态管理、工具执行、恢复、评测等工程能力的执行层）** 或 Workflow Runtime（工作流运行时）中。Anthropic 当前更常使用 `Harness` 来讨论这些让 Agent 能够长时间、可靠运行的工程机制。[[19]](https://www.anthropic.com/engineering/harness-design-long-running-apps)

> Workflow 已经不适合只理解成“固定代码流程”，它更适合作为任务的执行结构。外层 Workflow 可以定义稳定的业务阶段；每个节点内部再根据任务特点选择确定性代码、Single Agent 或 Multi-Agent。Single Agent 内部通过 Agent Loop 动态完成目标；Multi-Agent 再通过代码编排或模型编排协调多个 Agent。
>
> 对于长任务，则进一步通过 Harness 提供任务拆分、Artifact、Checkpoint、Context 管理和恢复能力，从而让整个任务不仅能够完成，而且能够稳定、可检查、可恢复地完成。

#### <u>3. 两种状态管理</u>

无论一个 Workflow 是**<u>复用同一个 Agent 完成多个阶段</u>**，还是为**<u>不同阶段配置多个 Agent</u>**，在阶段之间都需要解决一个共同问题：

> **前一个阶段已经获得的信息、执行结果和当前任务状态，怎样传递给下一个阶段？**

这里主要有两种方式：**共享 Context（上下文共享）**和**Structured Artifact（结构化产物，即把阶段结果以文件、结构化数据或其他可持久化形式保存下来）**。

##### 1）共享 Context：适合强依赖前序执行过程的连续任务

`Context（上下文）`这里主要指模型当前能够看到的任务历史，包括用户输入、前序 Agent 的结果、工具调用结果以及已经完成的判断。

共享 Context 的优势是：

> **后一个阶段可以直接理解前面发生了什么，不需要重新整理和传递信息。**

例如一个线上故障处理任务：

Incident Agent → 检查应用日志 → 确认 CPU 正常 → 发现数据库连接等待异常 → Handoff → Database Agent

Database Agent 不仅需要知道结论“数据库可能有问题”，还需要知道：

为什么怀疑数据库；前面已经检查过什么；哪些可能性已经被排除；工具返回过哪些结果。

这类任务中，**前面的执行过程本身就是后续判断的重要信息**，所以共享 Context 更自然。

OpenAI 的 `Handoff（任务转交）`默认就是这种方式：新的 Agent 接管任务时，可以看到之前的完整 Conversation History（对话历史）；如果不希望全部传递，还可以通过 `input_filter（输入过滤器）`裁剪下一 Agent 能看到的内容。[[15]](https://openai.github.io/openai-agents-python/handoffs/)

因此，共享 Context 更适合：

> **同一个任务连续向后推进，并且后一个阶段强依赖前面执行细节的场景。**

例如故障排查、复杂客服工单、连续诊断等。

它的局限也比较明显：任务越长，Context 就越容易持续增长，最终增加模型处理成本，也会混入越来越多对当前阶段没有价值的信息。

##### 2）结构化产物：适合阶段相对独立、需要稳定交接的任务

另一种方式不是把前一个阶段的完整执行历史交给后一个阶段，而是提前定义每个阶段的：

Input（输入）；Goal（目标）；Output（输出）；Acceptance Criteria（验收标准）。

阶段完成以后，将关键结果沉淀成稳定的产物，再交给下一阶段。

例如研发任务：

```text
Planning Agent
  └─→ 输出 spec.md
             ↓
Implementation Agent
  └─→ 输出代码 + implementation_result.json
                         ↓
Review Agent
  └─→ 读取需求 + 代码 + 验收标准
```

Review Agent 没有必要看到 Implementation Agent 前面几十轮：

搜索过哪些文件；尝试过哪些错误方案；如何一步步修改；怎样解释自己的实现。

它真正需要的是：

> **需求是什么、最终产物是什么、验收标准是什么。**

这种方式最大的优势是：

> **把“执行过程”和“稳定结果”分开。**

每个阶段可以拥有更干净、更独立的 Context，也更容易做到独立 Review、并行处理和失败重试。

OpenAI 的 `Agent.as_tool()` 其实体现了类似思想：当 Manager 调用一个子 Agent 时，父级 Run 的完整 Conversation State **不会自动继承给子 Agent**；子 Agent 默认拿到的是为当前子任务构造的输入。如果确实需要共享历史，则需要显式配置相同的 Session。[[12]](https://openai.github.io/openai-agents-python/zh/tools/)

因此，结构化产物更适合：

> **阶段职责相对独立，只需要传递明确结果，而不需要继承完整执行过程的场景。**

例如：

Planner → Developer → Reviewer；Research Agent → Report Agent；多个并行 Research Agent → Manager 汇总。

##### 3）长任务通常更偏向结构化产物

这一点在 Anthropic 2026 年的长任务 Harness 研究中非常明确。

Anthropic 总结了之前长任务实践中的两个关键经验：

> “decomposing the build into tractable chunks”
>
> 即 **把大型任务拆分成可以独立处理的小任务。**

以及：

> “using structured artifacts to hand off context between sessions”
>
> 即 **通过结构化产物在不同 Session 之间传递任务状态。** [[19]](https://www.anthropic.com/engineering/harness-design-long-running-apps)

在长任务执行过程中，阶段之间当然可以通过共享 Context（上下文，即模型当前能够看到的任务历史）来传递信息，但**越是长时间、跨阶段、跨 Session（会话）的任务，越应该把关键状态沉淀成 Structured Artifact（结构化产物，即可被后续阶段重新读取、检查和复用的文件或状态数据）**。

Anthropic 在长任务 Harness 的工程实践中明确指出：长任务通常会跨越多个 Context Window（上下文窗口），而新的 Session 并不会天然知道前一个 Session 做过什么。虽然可以通过 Compaction（上下文压缩，即把过长历史压缩成摘要）延长执行时间，但 Anthropic 的结论是：

> **“compaction isn’t sufficient.”** [[18]](https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents)

也就是：

> **仅靠上下文压缩不足以可靠完成长任务。**

因此，长任务更常采用：

Task 1 → 沉淀 Artifact → Task 2 → 沉淀 Artifact → Task 3

而不是一直依赖：

Task 1 Context → 继续累积 → Task 2 Context → 继续累积 → 不断压缩

这样做主要有三个目的。

**第一，避免长会话不断压缩导致细节逐渐丢失。**

如果一个任务持续几十轮甚至跨多个 Session，Context 会不断增长。为了不超过上下文窗口，系统通常需要做摘要或压缩，但多次压缩之后，一些早期但重要的细节可能逐渐被省略。

如果把每个阶段的关键结果直接保存下来，例如：

`plan.md`；`requirements.json`；`code/`；`test-result.json`；`review-result.json`；`progress.json`。

后续 Agent 可以重新读取原始产物，而不需要依赖一份已经被多次压缩的对话摘要。

**第二，结构化产物配合 Checkpoint，是长任务可恢复性的基础。**

长任务真正困难的地方，不只是“怎么继续执行”，还包括：

执行几个小时 → 环境异常 → 进程退出 → Agent Session 结束 → 如何继续？

如果当前状态只存在于模型 Context 中，那么一旦 Session 丢失，恢复会非常困难。

更稳定的做法是：

阶段执行完成 → 保存 Artifact → 保存 Checkpoint → 进入下一阶段

`Checkpoint（检查点，即保存某一时刻完整工作流状态）`负责记录“任务执行到哪里”，而 Artifact 负责记录“已经产生了什么结果”。

Microsoft Agent Framework 对 Checkpoint 的定义非常明确：

> **“Checkpoints allow you to save the state of a workflow at specific points during its execution, and resume from those points later.”**
>
> 即：**检查点允许系统在工作流执行过程中保存状态，并在以后从该状态继续执行。** [[20]](https://learn.microsoft.com/en-us/agent-framework/workflows/checkpoints)

Microsoft 还明确指出，它特别适合：

长时间运行的 Workflow；发生故障时避免丢失进度；暂停后继续执行；审计和合规；跨环境恢复任务。

因此：

Artifact = 已经完成了什么；Checkpoint = 当前执行到哪里。

两者结合以后：

```text
Task 1
  ↓
Artifact + Checkpoint
  ↓
Task 2 ──发生异常──→ Restore Checkpoint
  ↑                        ↓
  └──────继续 Task 2 ← 重新读取 Artifact
```

不需要把完整任务重新执行一遍。

这也是为什么对于长任务来说，**结构化产物不是单纯的信息传递方式，而是整个任务稳定性和可恢复性的重要基础。**

**第三，结构化产物为后续 Review 和人工验收提供稳定依据。**

长任务通常会把一个大目标拆成多个阶段，每个阶段都有相对明确的：

Goal（目标）；Output（输出）；Acceptance Criteria（验收标准）。

那么阶段完成以后，后续的 Reviewer Agent（审查智能体）或者人工审核人员，不需要阅读前一个 Agent 的完整执行历史。

例如：

Implementation Agent → 输出代码 → test-result.json → Review Agent

Review Agent 可以只根据：

需求 + 验收标准 + 最终代码 + 测试结果

进行独立审查。

这种方式比直接把 Implementation Agent 的完整 Context 交给 Review Agent 更稳定，因为 Review Agent 不会被前一个 Agent 的大量解释、尝试过程和自身判断干扰。

Microsoft 当前也把 Checkpoint 用于审计、状态保存和恢复；而 Anthropic 的长任务 Harness 则明确要求 **<u>Agent 在不同 Session 之间留下清晰的产物，使后续 Agent 能够重新理解和继续任务</u>**。

因此，在长任务中可以形成一个比较清晰的原则：

```text
阶段内部
├─ Context
└─ 保存当前执行过程中的临时信息

阶段结束
├─ Structured Artifact
└─ 保存当前阶段的稳定结果

关键阶段
├─ Checkpoint
└─ 保存整个任务当前的执行状态
```

例如：

```text
Planning       → plan.md                           → Checkpoint
Implementation → code + implementation-result.json → Checkpoint
Testing        → test-report.json                  → Checkpoint
Review         → review-result.json
```

这样即使中间发生：

Context Window 用尽；Session 重启；模型调用失败；环境异常；人工暂停。

后续 Agent 仍然能够重新读取这些状态，从最近一次有效阶段继续。

所以这一点可以最终总结为：

> 长任务中使用结构化产物，首先是为了避免任务长期依赖不断增长和压缩的 Context，从而减少重要细节在多轮压缩中的损失；更重要的是，结构化产物配合 Checkpoint，把任务状态从模型的临时上下文中外部化，使系统能够在发生中断后恢复到最近的有效状态继续执行。同时，这些稳定产物也为后续 Agent 或人工 Review 提供明确的验收依据。因此，结构化产物不仅用于阶段之间传递信息，更是长任务实现稳定执行、可恢复、可审查和可持续迭代的重要基础。

---

### 【Workflow 示例：AI Coding Workflow 伪代码】

完整 TypeScript 示例草案保存在 [ai-coding-workflow.ts](./Agent学习教程.source/ai-coding-workflow.ts)。

```ts
// TypeScript 风格伪代码：只展示 Workflow 的关键控制点。
//
// 三层状态各司其职：
// - WorkflowState / Checkpoint：记录整个任务执行到哪里；
// - Structured Artifact：记录每个阶段最终确认了什么；
// - Agent Session / RunContext：支持当前阶段如何完成任务。
//
// runCurrentStage 的六个关键步骤：
// 1. 恢复阶段上下文；2. 保存运行中 Checkpoint；3. 执行 Agent Loop；
// 4. 校验结构化输出；5. 保存 Artifact；6. 推进状态并保存 Checkpoint。
//
// runWorkflow 的四个关键步骤：
// 1. 恢复或创建状态；2. 构造 Runtime Context；
// 3. 调度当前阶段；4. 根据重试次数继续或终止。

// Workflow 只允许在四个稳定阶段之间迁移。
type StageName =
  | 'requirement'
  | 'planning'
  | 'implementation'
  | 'testing';

type StageStatus =
  | 'pending'
  | 'running'
  | 'completed'
  | 'failed';

// 可持久化的 WorkflowState 是恢复依据；
// 即使 Agent Session 丢失，也能从最近的 Checkpoint 继续。
interface WorkflowState {
  runId: string;
  originalRequirement: string;
  currentStage: StageName;
  status: 'running' | 'completed' | 'failed';
  stageStatus: Record<StageName, StageStatus>;
  artifacts: Partial<Record<StageName, string>>;
  retryCount: Partial<Record<StageName, number>>;
}

// AppContext 保存 Tool 和 Runtime 使用的本地资源；
// 这些字段不会自动拼接到模型输入中。
interface AppContext {
  state: WorkflowState;
  workspace: string;
  artifactDir: string;
}

// 执行一个阶段：
// 恢复阶段上下文 → 运行 Agent → 校验输出 → 保存 Artifact → 推进状态。
async function runCurrentStage(
  appContext: AppContext,
): Promise<boolean> {
  const state = appContext.state;
  const stage = state.currentStage;
  const agent = AGENTS[stage];

  // 阶段步骤 1/6：恢复当前阶段的执行上下文。
  // Session 只保存当前阶段的 Conversation；
  // buildStageInput() 从已确认 Artifact 构造本阶段输入，
  // 避免下游阶段继承全部上游执行历史。
  const session = getStageSession(state.runId, stage);
  const stageInput = await buildStageInput(state);

  // 阶段步骤 2/6：先标记 running 并保存 Checkpoint。
  // 如果此后中断，Runtime 才知道哪个阶段尚未完成。
  state.stageStatus[stage] = 'running';
  await saveCheckpoint(state);

  try {
    // 阶段步骤 3/6：执行当前节点内部的 Agent Loop。
    // run() 负责模型推理、工具调用和结果回传；
    // 外层 Workflow 只提供本地 Context、阶段 Session 和最大轮次。
    const result = await run(agent, stageInput, {
      context: appContext,
      session,
      maxTurns: 30,
    });

    // 阶段步骤 4/6：解析结构化输出，并执行业务验收 Gate。
    // outputType 约束模型输出结构；
    // Runtime 再用同一 Zod Schema 做一次确定性校验。
    const artifact =
      OUTPUT_SCHEMAS[stage].parse(result.finalOutput);

    // Gate 判断结果是否满足当前阶段的业务验收条件；
    // 未通过时增加重试次数，并把失败状态写入 Checkpoint。
    if (!validateStage(stage, artifact)) {
      state.stageStatus[stage] = 'failed';
      state.retryCount[stage] =
        (state.retryCount[stage] ?? 0) + 1;
      await saveCheckpoint(state);
      return false;
    }

    // 阶段步骤 5/6：持久化当前阶段的稳定 Artifact。
    // Gate 通过后先保存产物，再推进阶段状态；
    // 避免出现“状态已完成，但产物尚未落盘”的不一致。
    const artifactPath = await saveArtifact(
      state.runId,
      stage,
      artifact,
    );

    state.stageStatus[stage] = 'completed';
    state.artifacts[stage] = artifactPath;

    // 阶段步骤 6/6：推进 Workflow 状态，并保存恢复边界。
    // 当前阶段完成后再决定下一阶段；
    // 没有下一阶段时，整个 Workflow 才结束。
    const nextStage = getNextStage(stage);
    if (nextStage) {
      state.currentStage = nextStage;
    } else {
      state.status = 'completed';
    }

    // 将 Artifact 路径和最新阶段写入 Checkpoint，
    // 形成下一次恢复时可以直接读取的稳定边界。
    await saveCheckpoint(state);
    return true;
  } catch (error) {
    // 异常分支：与 Gate 失败使用同一套失败状态；
    // 外层 Runtime 统一决定继续重试还是终止。
    state.stageStatus[stage] = 'failed';
    state.retryCount[stage] =
      (state.retryCount[stage] ?? 0) + 1;
    await saveCheckpoint(state);
    return false;
  }
}

async function runWorkflow(params: {
  runId: string;
  requirement: string;
  workspace: string;
}) {
  // Runtime 步骤 1/4：恢复已有状态，或创建首次运行状态。
  // 启动时优先恢复已有 Checkpoint；
  // 只有首次运行时才创建初始状态。
  let state = await loadCheckpoint(params.runId);

  if (!state) {
    state = createInitialState(
      params.runId,
      params.requirement,
    );
    await saveCheckpoint(state);
  }

  // Runtime 步骤 2/4：构造 Tool 和 Workflow 使用的本地 Context。
  // Runtime Context 供 Tool / Workflow 使用，
  // 不等于模型能够看到的 Conversation。
  const appContext: AppContext = {
    state,
    workspace: resolveWorkspace(params.workspace),
    artifactDir: getArtifactDir(params.runId),
  };

  // Runtime 步骤 3/4：循环调度当前阶段。
  // Workflow Runtime Loop 只负责阶段调度、重试与终止，
  // 不接管 Agent 内部的推理和工具调用循环。
  while (state.status === 'running') {
    const success = await runCurrentStage(appContext);

    if (!success) {
      const stage = state.currentStage;
      const retries = state.retryCount[stage] ?? 0;

      // Runtime 步骤 4/4：根据重试次数决定继续或终止。
      // 阶段失败可以重试；达到上限后保存终止状态，
      // 防止同一阶段无限循环。
      // 生产系统还可以在这里执行 rollback、human review、
      // 返回上一阶段或修改 Plan。
      if (retries >= 3) {
        state.status = 'failed';
        await saveCheckpoint(state);
        throw new Error(
          `${stage} 连续失败 ${retries} 次`,
        );
      }
    }
  }

  return state;
}
```

这段代码里最重要的不是四个 Agent，而是三个不同的状态层次：

```text
┌─────────────────────────────────────────┐
│ WorkflowState / Checkpoint              │
│ current_stage = implementation          │
│ planning = completed                    │
│ retry_count = ...                       │
│ 回答：整个任务现在执行到哪里？           │
└─────────────────────────────────────────┘
                     │
                     ↓
┌─────────────────────────────────────────┐
│ Structured Artifact                     │
│ requirement.json                        │
│ planning.json                           │
│ implementation.json                     │
│ testing.json                            │
│ 回答：每个阶段最终确认了什么？           │
└─────────────────────────────────────────┘
                     │
                     ↓
┌─────────────────────────────────────────┐
│ MemorySession / Agent Context           │
│ Tool Call                               │
│ Tool Result                             │
│ 当前分析                                │
│ 最近几轮交互                            │
│ 回答：当前 Agent 正在怎么完成这个阶段？ │
└─────────────────────────────────────────┘
```

对应到一次真正的运行过程，就是：

```text
用户需求
  ↓
Workflow Runtime
  │
  ├─ current_stage = requirement
  │  └─→ Requirement Agent → Agent Loop → RequirementArtifact
  │                                    ↓
  │                         保存 requirement.json
  │                                    ↓
  │                         更新 WorkflowState → Checkpoint
  │
  ├─ current_stage = planning
  │  └─→ Planning Agent → 读取 requirement.json
  │                           ↓
  │                       Agent Loop
  │                           ↓
  │                      PlanArtifact
  │                           ↓
  │                  保存 planning.json → Checkpoint
  │
  ├─ current_stage = implementation
  │  └─→ Coding Agent → 读取 requirement + planning
  │                         ↓
  │                  自己的 MemorySession
  │                         ↓
  │              Read File / Edit File / Run Tests / ...
  │                         ↓
  │                ImplementationArtifact
  │                         ↓
  │              保存 implementation.json → Checkpoint
  │
  └─ Testing Agent
     ├─ 只读取稳定 Artifact
     ├─ 而不是 Coding Agent 完整聊天记录
     └─→ 独立验收 → TestArtifact → Workflow completed
```

这里 `MemorySession` 是 OpenAI Agents SDK TypeScript 草案中使用的会话历史机制，可以在多次 `run()` 之间持续保存 Conversation；而 `RunContext` 中的本地 Context 不会自动发送给模型。`outputType` 则可以通过 Zod Schema 要求 Agent 直接生成结构化结果。

所以这套实现最核心的职责边界就是：

> **Agent Context 管“当前阶段正在怎么做”；Artifact 管“当前阶段最终做成了什么”；WorkflowState / Checkpoint 管“整个需求交付任务现在执行到哪里”。**

这三层一旦拆开，即使 Coding Agent 的 Session 被清空、模型切换或者 Runtime 中断，外层 Workflow 仍然可以根据 Checkpoint 和已经沉淀的 Artifact 恢复执行。

## 5. `Agents in Workflows` —— 业务 Agent 的研发重点

企业在已有业务流程中引入 Agent 时，研发目标通常不是重新建设一套通用的 Agent System（智能体系统，即模型调用、Agent Loop、工具调用、会话管理、Handoff、Tracing 等底层运行机制），而是**基于成熟的 Agent SDK、Agent Framework 或企业 Agent Platform，完成具体业务智能体的建设**。

OpenAI 当前对 Agents SDK 的定位已经体现了这种分工。官方明确说明：

> “Use the Agents SDK when you want the runtime to manage turns, tool execution, guardrails, handoffs, or sessions.”

即：

> 如果希望 Runtime 帮助管理模型运行轮次、工具执行、安全检查、Agent 转交以及 Session，就可以直接使用 Agents SDK。

相反，只有当开发者希望自己掌控 Agent Loop、Tool Dispatch（工具调度）和 State Handling（状态处理）时，才需要下降到更底层的 Responses API。

因此，在企业业务 Agent 开发中，更合理的研发边界是：

```text
Agent Framework / Platform   → 提供通用 Agent 运行能力
              ↓
Business Capability          → 建设企业自己的业务能力
              ↓
Business Workflow            → 把能力组织成完整业务流程
              ↓
Runtime & Governance Policy  → 配置运行、恢复、安全和人工治理策略
```

也就是说，业务团队需要**理解底层 Agent System 的机制和边界，但通常不需要重新实现它**。研发资源应该更多投入到企业真正具有差异化价值的业务能力和业务流程上。

### 【用 Foundation、Capability、Application 划分企业 Agent 责任边界】

前面的“Framework / Platform → Business Capability → Business Workflow → Runtime & Governance”描述的是建设链路。换一个组织职责视角，还可以把企业 Agent 系统拆成 Foundation、Capability、Application 三层。

**这是一套用于本文的工程责任模型，不是行业统一标准。** 它的作用不是增加三个新术语，而是避免把“底层运行机制、可复用能力、具体业务流程”长期混在同一层维护。

![企业 Agent 三层架构](assets/agent-tutorial-企业三层架构.svg)

| 层级 | 回答的问题 | 主要内容 | 不负责什么 |
| --- | --- | --- | --- |
| Foundation | Agent 怎样被稳定地构建、执行和运营 | Runtime、State、Checkpoint、权限、Sandbox、Tracing、发布与治理机制 | 不决定某个具体业务失败后应该走哪条业务分支 |
| Capability | 哪些能力可以被多个 Agent 或 Workflow 复用 | Skill、Tool、API / MCP、Knowledge、可复用 Memory | 不编排完整业务流程 |
| Application | 一个业务目标怎样被拆成可执行、可验收的任务 | Business Workflow、Stage、Gate、Artifact、人工节点和业务规则 | 不重新实现底层 Runtime |

三层可以沿着一条依赖关系理解：

```text
Foundation
  → 提供“任务能够怎样可靠运行”的通用机制

Capability
  → 提供“Agent 能够使用什么”的可复用能力

Application
  → 定义“这些能力为了什么业务目标、按什么流程被使用”
```

例如“测试失败以后回到代码实现阶段”属于 Application 的业务流程规则；“保存 Checkpoint 并从中断位置恢复”属于 Foundation 的通用运行机制；“修改代码”则属于 Capability 中可被多个 Agent 复用的 Tool 能力。

因此，**三层不是三套彼此隔离的技术栈，而是三种不同的责任边界。** 后续讨论 Business Capability 时主要落在 Capability 层；讨论 Business Workflow 时主要落在 Application 层；Runtime、权限、恢复和 Trace 等机制则主要由 Foundation 提供。

### 【建设 Business Capability，让 Agent 真正具备业务能力】

Agent Framework 解决的是“Agent 怎么运行”，但它并不知道：

- 企业有哪些业务规则；
- 一个运营任务应该怎么分析；
- 哪些内部系统可以查询；
- 怎样修改企业代码；
- 怎样完成业务审核。

这些才是业务 Agent 最核心的建设内容。

OpenAI 在《A practical guide to building agents》中把 Agent 的基础组成概括为：

> **Model + Tools + Instructions** [[2]](https://openai.com/business/guides-and-resources/a-practical-guide-to-building-ai-agents/)

但从企业工程建设的角度，还需要进一步把这些基础组成沉淀成可以被不同 Agent 重复使用的业务资产。结合当前 OpenAI Agents SDK、Sandbox Agent、MCP 和 File Search 的能力，可以把 Business Capability 主要整理成下面四类：

```text
Business Capability
├─ Skill                  → 一类任务应该怎么做
├─ Tool / API / SDK / MCP → Agent 可以执行什么动作
├─ Knowledge Base / RAG   → Agent 从哪里获得业务事实
└─ Memory                 → 哪些过去的经验需要被后续任务继续使用
```

这里有一个边界需要先说明：

> **MCP 本身并不是一种新的业务能力，它主要是一种能力接入方式。**

例如“查询订单”是一个业务能力，它可以直接封装成 Function Tool，也可以调用现有 API，还可以通过 MCP Server 暴露给 Agent。

#### <u>1. Tool / API / SDK / MCP —— 给 Agent 提供真正可以执行的动作</u>

`Tool（工具，即 Agent 可以直接调用的确定性动作）`解决的是：

> **“Agent 实际能够做什么？”**

OpenAI 当前对 Tool 的描述是：

> “Tools let an Agent take actions – fetch data, call external APIs, execute code, or even use a computer.”
>
> 即：**Tool 让 Agent 能获取数据、调用外部 API、执行代码，甚至操作计算机。**

企业中的 Tool 通常来自已有业务能力：

已有函数 → Function Tool；已有 HTTP API → Function Tool；已有 SDK → Function Tool；已有 MCP Server → MCP Tool。

所以企业通常不需要为了 Agent 重写已有系统，而是把现有系统转换成 Agent 可以调用的能力。

**<u>自己创建的 Tool 怎么接入 Agent</u>**

例如企业已经有一个订单系统：

```ts
async function queryOrder(orderId: string) {
  return orderService.getOrder(orderId);
}
```

使用 OpenAI Agents SDK 时，可以通过 `tool()` 把它封装成 Agent Tool：

```ts
import {
  Agent,
  tool,
} from '@openai/agents';

import { z } from 'zod';

const queryOrderTool = tool({
  name: 'query_order',
  description: '根据订单 ID 查询订单信息',
  parameters: z.object({
    orderId: z.string(),
  }),
  execute: async ({ orderId }) => {
    // 调用企业已有 API / SDK
    return orderService.getOrder(orderId);
  },
});
```

然后直接交给 Agent：

```ts
const agent = new Agent({
  name: 'Customer Service Agent',
  instructions: `
    负责处理订单问题。
    必要时查询订单信息。
  `,
  tools: [queryOrderTool],
});
```

OpenAI 官方当前的接口就是：

自己的 Function / API / SDK → `tool(...)` → `Agent.tools`

SDK 官方也明确写道：

> “You can turn any function into a tool with the `tool()` helper.”
>
> 即：
>
> **任何函数都可以通过 `tool()` 封装成 Agent Tool。**

业务团队真正需要建设的是：

`query_order`；`run_tests`；`search_code`；`send_message`；`create_ticket`；`query_author_data`。

这些有稳定输入、输出、权限和错误定义的业务 Tool。

**<u>MCP 怎么接入</u>**

如果一个能力需要被多个不同 Agent、IDE 或 Agent Framework 共同复用，就可以进一步把它暴露成 **MCP Server（Model Context Protocol Server，即通过标准协议统一提供工具和资源的服务）**。

例如企业已经建设：

```text
CRM MCP Server
├─ Tools
│  ├─ query_customer
│  ├─ query_order
│  └─ update_customer
└─ Resources
   ├─ customer_policy
   └─ product_information
```

OpenAI Agents SDK 可以直接连接这个 Server：

```ts
import {
  Agent,
  MCPServerStdio,
} from '@openai/agents';

const crmServer =
  new MCPServerStdio({
    fullCommand:
      'node ./mcp/crm-server.js',
  });

await crmServer.connect();

const agent = new Agent({
  name: 'Operations Agent',
  instructions:
    '处理用户和订单相关问题。',
  mcpServers: [crmServer],
});
```

接入关系变成：

企业 CRM / 数据库 / API → MCP Server → OpenAI Agents SDK → Agent

OpenAI 当前官方文档明确支持：

> “You can expose tools via Model Context Protocol (MCP) servers and attach them to an agent.”
>
> **即：可以通过 MCP Server 暴露工具，然后直接连接到 Agent。**

因此在企业中可以简单判断：

```text
能力复用范围
├─ 只服务当前应用                → Function Tool 往往已经足够
└─ 多个 Agent / 客户端共同复用   → 可以建设 MCP Server
```

#### <u>2. Skill —— 沉淀可复用的工作经验</u>

`Skill（技能，即完成某一类任务的可复用方法）`解决的是：

> **“这类任务应该怎么做？”**

例如研发 Agent 中可以沉淀：

`requirement-analysis`（需求分析 Skill）；`code-review`（代码审查 Skill）；`bug-root-cause-analysis`（问题根因分析 Skill）；`frontend-test`（前端测试验收 Skill）。

一个 Skill 通常不是单纯的一句话 Prompt，而应该包含这类任务相对稳定的：

什么时候使用这个 Skill → 任务目标是什么 → 应该按照什么方法执行 → 允许使用哪些 Tool → 需要遵守什么约束 → 最终输出什么 → 怎样判断任务完成

例如：

```text
code-review Skill
├─ 目标：检查当前代码修改是否符合需求
├─ 执行方法
│  1. 阅读 Requirement Artifact
│  2. 阅读代码 diff
│  3. 检查关键业务逻辑
│  4. 检查异常处理
│  5. 检查测试覆盖
├─ 可以使用：read_file / search_code / run_tests
├─ 输出：review-result.json
└─ 验收：必须给出结论、问题、风险和证据位置
```

这样 Skill 沉淀的实际上就是：

> **企业过去依赖人工掌握的 SOP、检查方法和专业经验。**

对于普通的 `Agent`，核心抽象仍然是：

```ts
new Agent({
  instructions,
  tools
})
```

也就是说，普通 Agent 当前并没有一个独立的、通用的 `skills: []` 配置项。Skill 可以通过 Instructions、Tool 等方式由应用自己组织。

但 OpenAI 在最新的 **Sandbox Agent（沙盒智能体，目前仍处于 Beta）**中，已经正式加入了 `skills()` Capability（技能能力），用于 Skill 的发现和加载。官方在 [Sandbox Agent concepts](https://openai.github.io/openai-agents-js/guides/sandbox-agents/concepts/) 中将它描述为：

> `skills()` — “You want skill discovery and materialization in the sandbox.”

即：

> **当希望 Agent 能够发现并加载 Skill 时，可以给 SandboxAgent 增加 `skills()` 能力。**

例如我们自己维护：

```text
skills/
├─ requirement-analysis/
│   └─ SKILL.md
├─ code-review/
│   └─ SKILL.md
└─ frontend-testing/
    └─ SKILL.md
```

然后把这个 Skill 目录接入 Agent：

```ts
import {
  Capabilities,
  SandboxAgent,
  skills,
} from '@openai/agents/sandbox';

import {
  localDirLazySkillSource,
} from '@openai/agents/sandbox/local';

const agent = new SandboxAgent({
  name: 'Coding Agent',
  model: 'gpt-5.6-sol',
  instructions: `
    根据当前任务选择合适的 Skill。
    进行代码审查时加载 code-review Skill。
  `,

  capabilities: [
    ...Capabilities.default(),
    skills({
      // 将我们自己维护的 Skill 目录
      // 接入当前 Agent。
      lazyFrom: localDirLazySkillSource({
        src: './skills',
      }),
    }),
  ],
});
```

这就是业务团队最需要关注的接入关系：

我们维护的 Skill（SKILL.md）→ Skill Source → `skills(...)` → SandboxAgent → Agent 根据当前任务加载对应 Skill

OpenAI 官方当前的 Sandbox Agent 示例就是通过 `localDirLazySkillSource()` 把本地 Skill 目录接入，再通过 `skills()` 注册到 `SandboxAgent.capabilities` 中。

因此，从企业 Capability 建设角度，可以把 Skill 看成：

> 业务团队负责创建、版本管理和评测 Skill；Agent Framework 负责让 Agent 能发现和加载这些 Skill。

**<u>Skill 也可以做成 Tool</u>**

`load_skill("code-review")`

例如：

```js
const loadSkillTool = tool({
  name: "load_skill",
  description:
    "根据 Skill 名称读取对应的任务执行规范",
  parameters: z.object({
    name: z.string(),
  }),
  execute: async ({ name }) => {
    return loadSkill(
      `./skills/${name}/SKILL.md`
    );
  },
});
```

然后：

```ts
const agent = new Agent({
  instructions: `
    当任务需要专业方法时，
    先通过 load_skill 读取对应 Skill。
  `,
  tools: [loadSkillTool, readFileTool, runTestsTool],
});
```

这样 Agent 可以：

模型判断需要 Code Review → `load_skill("code-review")` → 返回 SKILL.md 内容 → Agent 按 Skill 执行

这种模式适合：

> **Skill 很多，无法提前全部塞进 Context，需要 Agent 在运行时按需发现和加载。**

这实际上已经非常接近现在 OpenAI `SandboxAgent` 的 `skills()` 能力。

#### <u>3. Knowledge Base / RAG —— 给 Agent 提供可信的业务知识</u>

Tool 解决的是“执行动作”，但很多 Agent 任务首先需要获得企业知识。

例如：

```text
客服 Agent   → 售后制度 / 商品资料 / 退款规则
运营 Agent   → 作者规则 / 活动规则 / 经营方法
Coding Agent → 架构文档 / API 文档 / Coding Guideline
```

因此还需要建设 **Knowledge Base（知识库，即经过整理、能够被 Agent 查询的企业知识）**。

知识库解决的是：

> **“Agent 做判断时，从哪里获取可信的事实？”**

常见方式是：

企业文档 → 清洗 / 切分 → 建立索引 → Vector Store（向量存储）→ Retrieval（检索）→ Agent

这里通常会使用 **RAG（Retrieval-Augmented Generation，检索增强生成，即先检索相关资料，再让模型基于资料回答）**。

**<u>自己建设的知识库怎么接入 OpenAI Agent</u>**

如果使用 OpenAI 的 Vector Store（向量存储），业务侧首先把自己的资料放入 Vector Store：

```text
业务规则 / 产品文档 / 技术规范 / FAQ
                  ↓
             Vector Store
                  ↓
        得到：vs_xxxxxxxxx
```

然后在 Agents SDK 中只需要把这个 Vector Store 接给 `fileSearchTool()`：

```ts
import {
  Agent,
  fileSearchTool,
} from '@openai/agents';

const knowledgeSearch =
  fileSearchTool(
    'vs_enterprise_knowledge',
    {
      maxNumResults: 5,
    },
  );

const agent = new Agent({
  name: 'Operations Agent',
  instructions: `
    回答业务问题时，
    优先查询企业知识库。
  `,
  tools: [knowledgeSearch],
});
```

OpenAI 当前的 `fileSearchTool` 接口就是：

> ```ts
> fileSearchTool(vectorStoreIds, options?)
> ```

它的作用被官方定义为：

> **“Adds file search abilities to your agent.”**

并且底层查询的是 OpenAI 托管的 Vector Store。

所以企业知识库的接入关系很清楚：

企业资料 → 建立 Knowledge Base → Vector Store → 拿到 `vectorStoreId` → `fileSearchTool(vectorStoreId)` → Agent

如果企业已经有自己的 Elasticsearch、向量数据库或者 RAG Service，也不必迁移到 OpenAI Vector Store。

可以直接封装自己的检索接口：

```ts
const searchKnowledge = tool({
  name: 'search_knowledge',
  description: '搜索企业内部知识库',
  parameters: z.object({
    query: z.string(),
  }),
  execute: async ({ query }) => {
    return companyRagService.search(
      query,
    );
  },
});
```

然后：

```ts
new Agent({
  tools: [searchKnowledge],
});
```

因此：

> **Knowledge Base 是业务资产，File Search / Tool / MCP 只是把知识库接入 Agent 的方式。**

这一点非常重要。

#### <u>4. Memory —— 沉淀跨任务仍然有价值的经验</u>

最后一类是 `Memory（记忆）`。

这里一定要先区分：

Session ≠ Long-term Memory

OpenAI 当前对 Sessions 的定义是：

> “Sessions give the Agents SDK a persistent memory layer.”

但它保存的主要是：

> **Conversation History（会话历史）**。

Runner 会在下一轮运行前读取历史消息，并在运行结束后继续保存新的输入和输出。

因此 Session 更适合：

```text
用户第一轮：帮我分析订单
第二轮：刚才那个订单为什么失败？
第三轮：帮我申请退款
```

需要保持同一段 Conversation 连续性的场景。

例如：

```ts
import {
  Agent,
  OpenAIConversationsSession,
  run,
} from '@openai/agents';

const session =
  new OpenAIConversationsSession();

await run(
  agent,
  '分析订单 123',
  { session },
);

await run(
  agent,
  '继续分析刚才的问题',
  { session },
);
```

真正的 **Long-term Memory（长期记忆，即从过去任务中提炼、未来任务仍然值得使用的经验）**解决的则是另一个问题：

例如：

这个项目统一使用 pnpm；这个团队不允许直接修改 generated 文件；这个用户倾向于先给诊断结果再执行修改；过去已经发现，某类测试失败通常与 Mock 配置有关。

这些内容即使新的 Session 开始，也可能仍然有价值。

OpenAI 当前 Sandbox Agent 已经提供了 Beta 的 `memory()` Capability。

官方对它的定义非常明确：

> “Memory lets future sandbox-agent runs learn from prior runs.”
>
> 即：**Memory 让未来的 Agent Run 能够从过去的 Run 中学习。**

而且官方特别强调：

> **它和保存 Conversation History 的 Session Memory 是分开的。**

接入方式非常简单：

```ts
import {
  SandboxAgent,
  filesystem,
  shell,
  memory,
} from '@openai/agents/sandbox';

const agent =
  new SandboxAgent({
    name: 'Coding Agent',
    model: 'gpt-5.6-sol',
    instructions: `
      完成代码任务。
      如果过去任务中存在相关经验，
      优先参考这些经验。
    `,
    capabilities: [
      filesystem(),
      shell(),
      // 开启长期 Memory
      memory(),
    ],
  });
```

OpenAI 当前的 Memory 会把过去 Run 中提炼出的经验保存到 Sandbox Workspace 中，例如：

```text
memories/
├─ MEMORY.md
└─ rollout_summaries/
```

**<u>可以通过配置告诉 Memory“重点记什么？”</u>**

这正是 OpenAI 当前提供的 `extraPrompt`。

官方示例：

```ts
import {
  memory,
} from "@openai/agents/sandbox";

const memoryCapability = memory({
  generate: {
    maxRawMemoriesForConsolidation: 128,
    phaseOneModel: "gpt-5.4-mini",
    phaseTwoModel: "gpt-5.4",
    extraPrompt: `
      Prioritize workflow corrections,
      verification commands,
      and user preferences.
    `,
  },
});
```

OpenAI 对 `extraPrompt` 的说明非常明确：

> **“Use `extraPrompt` to tell the memory generator which signals matter most for your use case.”**

即：

> **可以通过 `extraPrompt` 告诉 Memory Generator（记忆生成器），对于当前业务来说，哪些信息最值得关注和保存。**

所以企业完全可以定义自己的 Memory Policy（记忆策略）。

例如 Coding Agent：

```ts
const codingMemory = memory({
  generate: {
    extraPrompt: `
只保留未来 Coding 任务仍然具有复用价值的信息。

优先提炼：
1. 用户明确确认过的开发偏好；
2. 项目长期有效的工程约束；
3. 已经验证有效的问题定位方法；
4. 反复出现的测试或构建问题及解决方式；
5. 用户对 Agent 错误行为的明确纠正。

不要保存：
1. 当前任务临时文件路径；
2. 一次性的工具调用结果；
3. 未验证的推测；
4. 已经被后续结论否定的判断；
5. 密钥、Token 或其他敏感信息。
    `,
  },
});
```

那么你实际上是在给 Memory 系统定义：

什么值得长期记住 + 什么明确不能进入长期记忆

这就是企业 Memory 能力中非常重要的一层。

下一次运行开始时，SDK 先给 Agent 一个简短的 Memory Summary（记忆摘要）；如果发现当前任务与过去经验有关，再继续读取更详细的 Memory。

因此逻辑就是：

```text
首次运行：Run 1 → 执行任务 → 产生经验 → Memory Generation（记忆提炼）→ Memory Store
                                                                    ↓
后续运行：下一次 Run → 读取 Memory Summary → 发现相关经验 → 读取具体 Memory → 继续当前任务
```

这也是比较合理的长期记忆机制：

> **不是把过去所有 Conversation 永久塞进 Context，而是从历史任务中提炼真正值得复用的信息。**

如果企业不用 Sandbox Agent，也可以自己实现同样的结构：

```text
Agent Run → 任务结束 → Memory Extractor（提取有长期价值的信息）→ 企业 Memory Store
                                                                  ↓
下一次任务 → 根据 user / project / team 检索相关 Memory → 加入 Agent Input
```

例如：

```ts
const memories =
  await memoryStore.search({
    projectId,
    query: currentTask,
  });

await run(
  agent,
  `
当前任务：
${currentTask}

可能相关的历史经验：
${JSON.stringify(memories)}
  `,
);
```

所以：

> Memory Store 是业务资产；OpenAI `memory()`、检索 Tool 或自定义 Context 注入，只是把这些记忆提供给 Agent 的方式。

#### <u>5. 整体总结</u>

一个企业业务 Agent 最终看到的能力可以理解成：

```text
Business Agent
├─ Skill —— “怎么完成任务”
│  ├─ SKILL.md
│  ├─ 业务方法
│  └─ 工作规范
├─ Tool —— “可以执行什么”
│  ├─ Function Tool
│  ├─ API / SDK
│  └─ MCP Tool
├─ Knowledge —— “知道什么”
│  ├─ Vector Store
│  ├─ RAG
│  └─ File Search
└─ Memory —— “过去学到了什么”
```

以一个 Coding Agent 为例：

```text
Coding Agent
├─ Skill
│   ├─ requirement-analysis
│   ├─ safe-code-change
│   └─ code-review
├─ Tool
│   ├─ read_file
│   ├─ write_file
│   ├─ search_code
│   └─ run_tests
├─ MCP
│   ├─ GitLab MCP
│   └─ Jira MCP
├─ Knowledge
│   ├─ 项目架构文档
│   ├─ Coding Guideline
│   └─ 业务规则
│
└─ Memory
    ├─ 项目历史决策
    ├─ 用户确认过的偏好
    └─ 过去任务沉淀出的经验
```

如果用当前 OpenAI Agents SDK 表达这些能力的接入关系，可以简单记成：

```text
自己建设的 Capability
             ↓
┌─────────────────────────────────┐
│ Skill                           │
│ → SandboxAgent + skills()       │
│ Function / API / SDK            │
│ → tool() → Agent.tools          │
│ MCP Server                      │
│ → Agent.mcpServers              │
│ Knowledge Base                  │
│ → fileSearchTool(vectorStoreId) │
│   或自定义 search Tool           │
│ Session                         │
│ → run(..., { session })         │
│ Long-term Memory                │
│ → SandboxAgent + memory()       │
│   或企业自己的 Memory Store      │
└─────────────────────────────────┘
```

所以 Business Capability 的核心并不是研究 SDK 内部怎样把 Tool Schema 暴露给模型，而是：

> 企业先把自己的工作方法沉淀成 Skill，把已有系统能力封装成 Tool / API / MCP，把业务资料建设成可检索的 Knowledge Base，再把跨任务真正值得保留的经验沉淀成 Long-term Memory；随后利用 Agent Framework 提供的接入接口，把这些能力组合到不同的业务 Agent 中。

这也正是当前 OpenAI Agents SDK 的发展方向：SDK 本身提供的是 Agent、Tools、MCP、Sessions，以及正在 Beta 中发展的 Sandbox Skills 和 Memory 等通用接入机制；**真正属于企业自身的，是 Skill 内容、Tool 实现、Knowledge 数据和 Memory 内容。**

---

### 【设计 Business Workflow，并配置 Runtime 与治理策略】

Business Capability 解决的是：

> **Agent 有哪些能力可以使用。**

当 Tool、Skill、Memory、Knowledge Base 等能力沉淀完成以后，下一步并不是继续扩充 Agent 本身，而是要回答另一个问题：

> **这些能力怎样围绕一个业务目标，被组织成一条能够稳定执行、失败可恢复、风险可控制的业务流程？**

这部分可以统一理解为 **Business Workflow + Runtime & Governance（业务工作流 + 运行与治理）**。

#### <u>1. Workflow Design —— 把业务目标拆成可以执行和验收的阶段</u>

首先要把一个完整业务目标拆成若干相对稳定的 Stage（阶段）。

例如 AI Coding：

需求分析 → 任务规划 → 代码实现 → 测试验收 → 人工审批

每个 Stage 最好明确四件事情：

`Stage = Input + Executor + Output + Acceptance Criteria`

分别表示：

- **Input（输入）**：当前阶段需要哪些前序信息；
- **Executor（执行者）**：由代码、Agent 还是人工执行；
- **Output（输出）**：必须留下什么结构化结果或 Artifact（产物）；
- **Acceptance Criteria（验收标准）**：达到什么条件才可以进入下一阶段。

例如：

| Stage    | Executor       | Output                     | 验收             |
| -------- | -------------- | -------------------------- | ---------------- |
| 需求分析 | Agent          | requirement.json           | 需求和验收项完整 |
| 代码实现 | Coding Agent   | Code + implementation.json | 计划任务完成     |
| 测试     | Script / Agent | test-report.json           | 测试通过         |
| 发布     | Tool + Human   | release record             | 人工批准         |

Microsoft 当前明确建议，对于 Workflow 中的每一步分别判断：

> 如果需要模型判断，就使用 Agent；
>
> 如果结果可以由代码确定，就使用确定性执行器；
>
> 如果应该由人决定，就使用 Human-in-the-loop。 ([微软学习](https://learn.microsoft.com/en-us/agent-framework/journey/workflows))

所以 Business Workflow 的核心不是“每个节点都 Agent 化”，而是：

> **根据每个阶段的问题特点选择最合适的执行方式。**

#### <u>2. Orchestration —— 决定任务怎样从一个阶段推进到下一个阶段</u>

有了 Stage 以后，需要定义 **Orchestration（编排，即当前阶段完成后怎样决定下一步）**。

对于企业已有 SOP 的流程，更常见的是由 Workflow 明确控制业务主干：

```text
Implementation
  ↓
Testing
├─ 失败 → 返回实现
└─ 通过 → Review
```

这里需要定义：

- 正常情况下进入哪个 Stage；
- 哪些条件会走分支；
- 哪些任务可以并行；
- 质量失败是否返回前一阶段；
- 什么情况下结束任务；
- 什么情况下转人工。

这里最好保持一个重要边界：

> **业务流程的主干如果已经明确，就优先由 Workflow Rule（工作流规则）控制；只有某个阶段本身无法提前确定执行路径时，再让 Agent 或 Supervisor 在该阶段内部动态决策。**

Microsoft 当前也把这个区别总结成一个问题：

> **“Who should decide what happens next?”**

如果下一步由 Developer（开发者预定义的规则）决定，就使用 Workflow；如果由 Model（模型）决定，则可以使用 Agents as Tools 等模型驱动方式。 ([微软学习](https://learn.microsoft.com/en-us/agent-framework/journey/workflows))

#### <u>3. Runtime State & Recovery —— 让长任务能够持续执行和恢复</u>

Workflow 定义了“业务应该怎么走”，真正运行时则需要 **Runtime（运行时，即负责实际执行工作流和保存运行状态的系统）**。

Runtime 至少需要知道：

当前执行到哪个 Stage；哪些 Stage 已经完成；当前 Stage 是第几次执行；已经产生了哪些 Artifact；是否正在等待人工批准；下一步应该执行什么。

这些信息应该保存在结构化的 Workflow State 中，而不是依赖模型 Conversation 自己记住。

例如：

```text
currentStage = testing

requirement      = completed
planning         = completed
implementation   = completed
testing          = running
```

对于长任务，还需要 **Checkpoint（检查点，即保存某一时刻可恢复的 Workflow 状态）**。

Microsoft 当前的官方定义是：

> “Checkpoints allow you to save the state of a workflow at specific points during its execution, and resume from those points later.”

即：

> **Checkpoint 可以保存 Workflow 在某个位置的状态，并在以后从这个位置继续执行。** ([微软学习](https://learn.microsoft.com/en-us/agent-framework/workflows/checkpoints))

例如：

```text
Planning ✓ → Implementation ✓ → Checkpoint → Testing → Crash
                                      │                 ↓
                                      └─→ Restore Checkpoint
                                                   ↓
                                           从 Testing 继续
```

因此长任务通常形成：

```text
Context          → 当前 Stage 的临时执行信息
Artifact         → Stage 已经产生的稳定结果
Workflow State   → 整个任务执行到哪里
Checkpoint       → 可以从哪里恢复
```

OpenAI Agents SDK 当前也提供可序列化的 `RunState`，能够保存暂停状态、审批状态和 Runtime Metadata，并在之后恢复运行。对于需要跨长时间等待、重试或者进程重启的任务，官方还提供 Temporal、Dapr、Restate、DBOS 等 Durable Execution（持久执行）集成。 ([OpenAI GitHub](https://openai.github.io/openai-agents-python/running_agents/))

#### <u>4. Retry 与恢复策略 —— Runtime 提供机制，业务定义规则</u>

这里非常容易把两层责任混在一起。

例如 Runtime 可以提供：

`retry()`；`checkpoint()`；`resume()`；`pause()`。

但它并不知道：

> 测试失败以后应该重新测试，还是应该返回代码实现？

所以需要区分：

Runtime → 提供运行机制；Business Workflow → 定义业务策略。

例如模型 API Timeout：

`MODEL_TIMEOUT` → 最多自动 Retry 3 次

这是技术失败。

但是：

Test Failed → 返回 Implementation → 修改代码 → 再次 Testing

这是业务流程回退，不应该简单理解成一次 Retry。

因此业务侧需要明确：

- 什么错误允许自动重试；
- 最大重试次数；
- 重试是否需要等待；
- 是否继续当前 Context；
- 是否重新启动 Agent；
- 质量失败返回哪个 Stage；
- 超过多少次失败转人工。

Runtime 负责按照这些规则执行，而不是自己决定业务策略。

#### <u>5. Governance —— 控制 Agent 在什么情况下能够做什么</u>

企业 Agent 一旦开始调用真实系统，Workflow 就不能只关心“任务有没有完成”，还必须控制：

> **当前用户、当前 Agent、当前 Stage 到底允许调用哪些能力。**

OpenAI Agents SDK 提供治理机制的执行接口，并不会直接读取企业的一份 YAML/JSON 权限配置然后自动生效。企业通常需要增加一层 Policy（策略）配置，把业务配置映射到 SDK 的 `isEnabled`、Guardrail、`needsApproval` 等接口上。

整体关系可以理解为：

```text
企业 Governance Config → Policy Resolver（策略解析）
                           ↓
          RunContext（当前用户 / Stage / 权限）
                           ↓
OpenAI Agents SDK
├─ isEnabled       → 当前能看到哪些能力
├─ Guardrails      → 当前调用是否安全
├─ needsApproval   → 是否需要人工审批
└─ execute         → 最终真实权限校验
```

OpenAI 当前 TypeScript Agents SDK 已经直接提供了这些接口：Function Tool 支持 `isEnabled`、`needsApproval`、`inputGuardrails` 和 `outputGuardrails`。

**<u>因此 Governance（治理）通常包括三部分。</u>**

##### 1）Authentication / Authorization（身份认证与权限校验）

例如：

User Identity + Agent + Current Stage + Tool + Target Resource → Authorization → Allow / Deny

Coding Agent 在“分析”阶段可能只能读代码：

`read_file ✓`；`search_code ✓`；`write_file ✗`；`release ✗`。

进入 Implementation：

`read_file ✓`；`write_file ✓`；`run_tests ✓`；`release ✗`。

进入 Release：

`release` → 仍然需要人工批准

所以权限不是简单绑定在 Agent 名称上，而通常需要结合当前业务阶段动态控制。

业务侧可以先维护一份配置：

```ts
const governanceConfig = {
  analysis: {
    tools: {
      read_file: { enabled: true, approval: "never" },
      write_file: { enabled: false, approval: "never" },
      release: { enabled: false, approval: "always" },
    },
  },

  implementation: {
    tools: {
      read_file: { enabled: true, approval: "never" },
      write_file: { enabled: true, approval: "never" },
      release: { enabled: false, approval: "always" },
    },
  },

  release: {
    tools: {
      read_file: { enabled: true, approval: "never" },
      write_file: { enabled: false, approval: "never" },
      release: { enabled: true, approval: "always" },
    },
  },
} as const;
```

然后把当前 Stage（阶段）和用户身份放进 `RunContext（运行上下文，即程序侧保存的当前任务状态）`：

```ts
interface AppContext {
  stage: "analysis" | "implementation" | "release";
  user: {
    id: string;
    roles: string[];
  };
}
```

Tool 再通过 `isEnabled` 读取当前配置：

```ts
const writeFileTool = tool({
  name: "write_file",
  description: "修改代码文件",
  parameters: z.object({
    path: z.string(),
    content: z.string(),
  }),
  isEnabled: ({ runContext }) => {
    const stage = runContext.context.stage;
    return governanceConfig[
      stage
    ].tools.write_file.enabled;
  },

  execute: async ({ path, content }, runContext) => {
    // 真正执行修改
    return writeFile(path, content);
  },
});
```

于是同一个 Agent：

```text
analysis         → 看不到 write_file
implementation   → 可以看到 write_file
release          → 再次看不到 write_file
```

OpenAI 官方把 `isEnabled` 定义为：

> **“Conditionally expose the tool per run.”**
>
> 也就是：
>
> **根据当前 Run 的状态，决定这个 Tool 是否向模型暴露。**

它非常适合做 Stage、Role、Environment、Feature Flag 等动态能力控制。

**<u>但 `isEnabled` 不是最终的权限校验</u>**

这一点非常重要。

OpenAI 官方明确指出：

> `isEnabled` **“does not replace authorization”**
>
> 即：**`isEnabled` 不能替代真正的 Authorization（授权校验）。**

原因是 `isEnabled` 在模型真正生成 Tool 参数之前就执行了，它只能判断：**<u>“这个 Tool 当前能不能出现。”</u>**但无法完整判断：“这个用户到底有没有权限操作具体这个订单 / 文件 / 数据库资源。” 也就是说，权限可能需要根据当前模型的输出来判断。

所以企业权限最好分成两层：

```text
权限控制
├─ 第一层：Capability Visibility
│  └─ isEnabled → Agent 当前能不能看到这个能力
└─ 第二层：Authorization
   └─ execute / Backend API → 当前用户到底有没有权限执行这次具体操作
```

例如：

```ts
const deleteOrderTool = tool({
  name: "delete_order",
  parameters: z.object({
    orderId: z.string(),
  }),

  // 第一层：
  // 当前 Stage 是否允许出现 delete_order
  isEnabled: ({ runContext }) => {
    return runContext.context.stage === "order_admin";
  },
  execute: async ({ orderId }, runContext) => {
    const user =
      runContext.context.user;
    // 第二层：
    // 对这个具体 orderId 做真实权限校验
    const allowed =
      await permissionService.canDeleteOrder({
        userId: user.id,
        orderId,
      });
    if (!allowed) {
      throw new Error("Permission denied");
    }
    return orderService.delete(orderId);
  },
});
```

所以：

> **“模型看不到 Tool”是一种能力限制，“后端拒绝非法调用”才是真正的安全边界。**

对于 MCP 也是一样，OpenAI 官方特别说明：受保护的 MCP 操作仍然应该由 MCP Server 自己完成授权。

OpenAI Agents SDK 当前对 `isEnabled` 的官方说明就是：

> “The runner evaluates the predicate while preparing the model-visible tool set for the current turn.”
>
> **Runner 在准备“当前轮模型可见的工具集合”时，会先判断这个 Tool 是否启用。**

如果：

`isEnabled: false`

那么这个 Tool 会从当前轮的 Tool Definitions（工具定义集合）里被过滤掉。官方也明确说：

> **“Disabled tools are hidden from the LLM at runtime.”**
>
> **被禁用的 Tool 在运行时对模型隐藏。**

当前这一轮真正发送给模型的 Tool Set 已经没有 `write_file`：

```text
History：曾经调用过 write_file
Current Tools：read_file / run_tests
```

所以正常情况下，模型会根据当前 Tool Set 选择工具。

**<u>模型误调用一个当前不存在的 Tool，Runtime 会不会拦住？</u>**

**会。当前 OpenAI Agents SDK 已经有明确的 `toolNotFoundBehavior` 机制。**

官方定义：

> `toolNotFoundBehavior` “Controls unresolved function tool calls emitted by the model.”
>
> 也就是：
>
> **控制模型生成了一个 Runtime 无法解析的 Function Tool Call 时应该怎么办。**

当前有两种处理方式。

默认：

`toolNotFoundBehavior: "raise_error"`

如果模型输出：

`call write_file(...)`

但当前 Runtime 的有效 Tool Set 中没有 `write_file`，SDK 会：

Tool Call → Runtime 查找当前可执行 Tool → 找不到 `write_file` → 抛出 `ModelBehaviorError`

也就是：

> **不会因为模型输出了这个名字，就真的找到以前那个 Tool 并执行。**

另一种方式：

```ts
toolNotFoundBehavior:
  "return_error_to_model"
```

这时 Runtime 会把错误重新告诉模型：

```text
Agent：call write_file(...)
  ↓
Runtime：write_file 当前不可用
  ↓
Agent：收到错误 → 重新选择 read_file / run_tests
```

官方说明这种模式会：

> 返回一个 model-visible tool error，并让 Run 继续。

所以完整链路实际上是：

```text
当前 Stage → 计算 isEnabled → 得到 Current Tool Set
                         ↓
发送给 LLM → LLM 产生 Tool Call → Runtime 解析 Tool Name
                         ↓
当前 Tool Set 中是否存在？
├─ 是 → 继续参数校验 / Guardrail / Approval / execute
└─ 否 → toolNotFoundBehavior
         ├─ raise_error
         └─ return_error_to_model
```

##### 2）Guardrail（安全约束，即在 Agent 输入、输出或 Tool 调用前后做检查）

OpenAI 当前的 Agents SDK 明确区分：

- Input Guardrail：检查输入；
- Output Guardrail：检查最终输出；
- Tool Guardrail：检查 Tool 调用前后的输入和结果。 ([OpenAI GitHub](https://openai.github.io/openai-agents-python/guardrails/))

例如：

```text
用户输入           → Input Guardrail  → Agent
Agent              → Tool Guardrail   → Tool
Agent Final Output → Output Guardrail
```

但 Guardrail 不能代替真正的系统权限。

也就是说：

```text
安全边界
├─ Guardrail     → 判断“这个调用是否符合约束”
└─ Authorization → 判断“这个调用到底有没有权限执行”
```

两者是不同层次。

**<u>可以定义 Tool Input Guardrail：</u>**

```ts
const blockSecrets =
  defineToolInputGuardrail({
    name: "block_secrets",
    run: async ({ toolCall }) => {
      const args =
        JSON.parse(toolCall.arguments);

      if (
        String(args.content ?? "")
          .includes("sk-")
      ) {
        return ToolGuardrailFunctionOutputFactory
          .rejectContent(
            "禁止发送密钥信息"
          );
      }
      return ToolGuardrailFunctionOutputFactory
        .allow();
    },
  });
```

然后配置到 Tool：

```ts
const sendMessageTool = tool({
  name: "send_message",
  parameters: z.object({
    content: z.string(),
  }),
  inputGuardrails: [blockSecrets],
  execute: async ({ content }) => {
    return messageService.send(content);
  },
});
```

于是执行链就是：

```text
Agent 决定调用 send_message
             ↓
Tool Input Guardrail
├─ Allow  → 执行 Tool
└─ Reject → 拒绝本次调用
```

OpenAI 当前 Tool Guardrail 可以返回：

`allow` → 允许执行；`rejectContent` → 拒绝本次 Tool 调用；`throwException` → 直接终止。

并且 Tool Guardrail 会在每次 Function Tool 调用时执行。

##### 3）Human-in-the-loop（HITL，人工介入，即流程暂停等待人工判断）

OpenAI 当前的官方定义是：

> “Use the human-in-the-loop (HITL) flow to pause agent execution until a person approves or rejects sensitive tool calls.”
>
> 即：**对于敏感 Tool Call，可以暂停 Agent，等待人工批准或拒绝以后再继续。** ([OpenAI GitHub](https://openai.github.io/openai-agents-python/human_in_the_loop/))

因此企业需要自己定义哪些条件触发人工介入，例如：

```text
高风险操作       → Human Approval
连续失败 3 次    → Human Review
模型无法判断     → Manual Triage
资金操作         → Human Approval
生产发布         → Human Approval
权限修改         → Human Approval
```

Microsoft Workflow 的 HITL 也采用同样的暂停-响应-恢复模型，而且 Pending Request（待处理请求）可以和 Checkpoint 一起保存，恢复 Workflow 后继续等待或接收人工结果。 ([微软学习](https://learn.microsoft.com/en-us/agent-framework/workflows/human-in-the-loop))

**<u>这是 OpenAI Agents SDK 已经直接支持的正式能力</u>**。最简单的配置：

```ts
const releaseTool = tool({
  name: "release",
  parameters: z.object({
    environment: z.enum([
      "test",
      "production",
    ]),
  }),
  // 所有发布都需要审批
  needsApproval: true,
  execute: async ({ environment }) => {
    return releaseService.release(environment);
  },
});
```

也可以动态判断：

```ts
needsApproval: async (
  runContext,
  { environment },
) => {
  return environment === "production";
}
```

于是：

```text
release
├─ test       → 自动执行
└─ production → Pause → Human Approval → Resume
```

OpenAI 官方明确支持 `needsApproval: true`，也支持传入异步函数根据 Tool 参数动态判断。

**<u>`needsApproval` 也可以直接读取企业配置</u>**

比如：

```ts
const releaseTool = tool({
  name: "release",
  parameters: z.object({
    environment: z.string(),
  }),
  isEnabled: ({ runContext }) => {
    const stage =
      runContext.context.stage;
    return governanceConfig[
      stage
    ].tools.release.enabled;
  },

  needsApproval: async (
    runContext,
    _args,
  ) => {
    const stage =
      runContext.context.stage;
    return governanceConfig[
      stage
    ].tools.release.approval
      === "always";
  },

  execute: async (
    { environment },
    runContext,
  ) => {
    // 最终依然执行真实权限校验
    await permissionService.check({
      user: runContext.context.user,
      action: "release",
      resource: environment,
    });
    return releaseService.release(
      environment,
    );
  },
});
```

这就形成了真正的：

```text
Governance Config + Current Stage + User
├─ isEnabled     → 能力可见性
├─ Guardrails    → 安全检查
└─ needsApproval → 人工审批
          ↓
Tool execute → Backend Authorization
```

因此可以让同一个 Tool 在不同阶段表现完全不同。

例如：

| Stage          | `write_file` | `release`          |
| -------------- | ------------ | ------------------ |
| Analysis       | 禁止         | 禁止               |
| Implementation | 自动允许     | 禁止               |
| Review         | 只读         | 禁止               |
| Release        | 禁止修改     | **人工审批后允许** |

而不需要为四个 Stage 分别重新开发四套 Tool。

人工审批以后，Runtime 怎么继续？

假设 Agent 请求：

`release("production")`

因为 `needsApproval = true`：

```ts
let result = await run(
  agent,
  userInput,
  { context: appContext },
);
```

SDK 不会立即执行 `release`，而是返回：

`result.interruptions`

业务系统可以：

```ts
for (const interruption of result.interruptions) {
  // 把审批请求发到企业审批系统
  const approved =
    await approvalService.request({
      tool: interruption.name,
      arguments: interruption.arguments,
    });
  if (approved) {
    result.state.approve(interruption);
  } else {
    result.state.reject(interruption);
  }
}
```

然后：

```ts
result = await run(
  agent,
  result.state,
);
```

SDK 会：

```text
暂停阶段：之前的 Agent Run → 敏感 Tool → Pause → 保存 RunState
恢复阶段：人工 Approval → 恢复 RunState → 继续 Tool → Agent 继续执行
```

OpenAI 官方当前就是按照这个流程定义 HITL：`interruptions → state.approve()/reject() → resume RunState`。

而且 `RunState` 可以序列化，所以审批持续几个小时甚至几天，也不需要一直保持当前服务器进程。

#### <u>6. Observability —— 让整个 Workflow 可以被追踪和审查</u>

最后一项是 Observability（可观测性，即知道系统实际执行了什么）。

企业 Workflow 最终至少应该能够回答：

- 谁发起了任务？
- 使用了哪个 Agent 版本？
- 执行了哪些 Stage？
- 调用了哪些 Tool？
- 每一步耗时多久？
- 发生过哪些失败？
- 产生了哪些 Artifact？
- 谁批准了高风险操作？
- 最终结果是什么？

Microsoft 当前把 Observability 正式列为 Workflow Capability，并提供 Workflow Span、日志、Metrics（指标）、Events（事件）以及 Delivery Status 等信息，用来监控和调试 Workflow。 ([微软学习](https://learn.microsoft.com/en-us/agent-framework/workflows/))

OpenAI Agents SDK 也把 Tracing（链路追踪）作为内置能力，用于查看 Agent Run、Tool Call、Handoff 和其他执行过程。 ([OpenAI GitHub](https://openai.github.io/openai-agents-python/))

因此可观测性不仅用于排错，也是：

> **质量评估、成本分析、风险审计以及问题追责的基础。**

OpenAI Agents SDK 官方定义是：

> “The Agents SDK includes built-in tracing, collecting a comprehensive record of events during an agent run: LLM generations, tool calls, handoffs, guardrails, and even custom events that occur.”
>
> 也就是：
>
> **Agents SDK 内置 Tracing，会记录 Agent Run 中的重要事件，包括模型生成、Tool 调用、Handoff、Guardrail，以及业务自己增加的自定义事件。**

它采用两层结构：

Trace = 一次完整任务执行；Span = Trace 中的一次具体操作。

例如一次 Coding Agent：

```text
Trace: feature-login-001
├─ Span: Requirement Agent
├─ Span: LLM Generation
├─ Span: search_code
├─ Span: Planning Agent
├─ Span: Coding Agent
│   ├─ Span: read_file
│   ├─ Span: write_file
│   └─ Span: run_tests
├─ Span: Review Agent
└─ Span: Human Approval
```

`Trace（追踪记录）`代表一次端到端 Workflow 执行；`Span（跨度，即其中一次有开始和结束时间的操作）`记录某个具体步骤。官方 Trace 还带有 `trace_id`、`workflow_name`、`group_id`、metadata 等信息，用于关联一次业务执行。

所以 Tracing 最主要解决：

> **这次 Agent 任务到底经历了什么。**

**<u>Trace 最终保存在哪里？</u>**

OpenAI Agents SDK 默认可以把 Trace 导出到 OpenAI 的 Traces 后端，在 Traces Dashboard 中查看，用于开发和生产环境的调试、可视化和监控。

同时 SDK 提供 `TracingExporter`：

> “Exports traces and spans. For example, could log them or send them to a backend.”

也就是可以把 Trace / Span：

```text
Agent SDK → TracingExporter
             ├─ OpenAI Tracing
             ├─ 企业日志平台
             ├─ Observability Platform
             └─ 自建 Audit Backend
```

导出到自己的系统。

完整链路：

```text
Business Goal
  ↓
① Workflow Design → Stage / Input / Output / Acceptance Criteria
  ↓
② Orchestration   → 顺序 / 分支 / 并行 / 回退 / Agent 调度
  ↓
③ Runtime         → State / Artifact / Checkpoint / Resume / Retry
  ↓
④ Governance      → Authentication / Authorization / Guardrail / HITL
  ↓
⑤ Observability   → Trace / Log / Metrics / Audit
```

如果和前一部分 Business Capability 连起来，整个企业业务 Agent 的研发重点就很清楚：

```text
Business Capability → Tool / Skill / Memory / Knowledge  → “Agent 可以使用什么能力”
        ↓
Business Workflow   → Stage / Gate / Transition          → “这些能力怎样组成业务任务”
        ↓
Runtime             → State / Retry / Checkpoint / Resume → “任务怎样稳定运行”
        ↓
Governance          → Permission / Guardrail / HITL      → “任务怎样安全可控”
        ↓
Observability       → Trace / Audit / Metrics            → “整个过程怎样被检查和运营”
```

因此这一部分最核心的知识点可以收敛为：

> 沉淀 Business Capability 之后，企业还需要围绕业务目标设计 Business Workflow，把任务拆成明确的 Stage，并为每个 Stage 定义执行者、输入、结构化产物和验收标准；再利用 Agent Framework 或 Workflow Runtime 提供的 State、Retry、Checkpoint、Resume、Human-in-the-loop 和 Observability 等通用机制，配置符合业务要求的调度、失败恢复、权限控制、人工审批和审计策略。Runtime 负责提供“能够怎么运行”的机制，而 Business Workflow 负责定义“业务上什么时候使用这些机制以及下一步应该去哪里”。

**<u>OpenAI SDK 怎么创建自定义 Span</u>**

当前 TypeScript SDK 提供：

> ```ts
> createCustomSpan()
> ```

官方定义就是：

> **“A `createCustomSpan()` function is available for tracking custom span information.”**

也就是：

> **通过 `createCustomSpan()` 记录业务自己的 Span 数据。** 

概念上可以写成：

```ts
import {
  createCustomSpan,
} from "@openai/agents";

const span = createCustomSpan({
  name: "implementation_stage",

  data: {
    workflowId: "feature-login-001",
    stage: "implementation",
    attempt: 1,
  },
});

span.start();

try {
  await executeImplementation();

  span.spanData.data.status = "success";

} catch (error) {
  span.spanData.data.status = "failed";

  throw error;

} finally {
  span.end();
}
```

这里：

```
name
→ 这个 Span 是什么

data
→ 业务希望附带什么信息

start / end
→ 操作什么时候开始、什么时候结束
```

SDK 会自动让它属于当前 Trace，并挂在当前最近的父 Span 下。OpenAI 当前通过 `AsyncLocalStorage` 管理这种父子关系，因此正常异步调用一般不需要手动传 `parent_id`。

### 【用 Adapter 把 Business Workflow 与具体 Agent 产品解耦】

当同一条 Business Workflow 可能调用不同 Agent 产品或执行器时，不应该让 Workflow 直接依赖某个 SDK、CLI 或 Provider 的返回结构。更稳定的方式是在 Workflow 与具体 Agent 产品之间增加一层 Adapter（适配器）：**Workflow 只依赖统一的 Stage 输入输出契约，Adapter 负责把不同 Agent 的调用方式和结果转换成这个内部契约。**

![Agent 接入 Business Workflow](assets/agent-tutorial-agent接入业务工作流.svg)

完整调用链可以收敛为：

```text
Business Workflow
        ↓
Agent Stage
        ↓
AgentStageExecutor
        ↓
Adapter Registry
   ├─ Codex Adapter
   ├─ Claude Code Adapter
   └─ Trae Agent Adapter
        ↓
统一 StageResult
        ↓
Gate / Transition
        ↓
下一 Stage
```

#### <u>1. Workflow 只依赖稳定的 Stage 契约</u>

Workflow 需要关心的是“当前阶段要完成什么、输入是什么、必须交付什么、怎样验收”，而不是不同 Agent 产品怎样发请求。

可以把内部接口抽象成：

```ts
interface AgentStageAdapter {
  provider: string;

  execute(input: StageContext): Promise<StageResult>;
}

interface StageContext {
  workflowId: string;
  stageId: string;
  goal: string;
  artifacts: ArtifactRef[];
  permissions: string[];
}

interface StageResult {
  status: "completed" | "failed" | "blocked";
  artifacts: ArtifactRef[];
  summary: string;
  evidence?: Evidence[];
}
```

这样 Workflow 的主干只依赖 `StageResult`。某个 Provider 更换 SDK、CLI 参数或者输出格式时，只需要修改对应 Adapter，不需要把 Provider 差异扩散到 Orchestrator、Gate 和后续 Stage。

#### <u>2. Adapter 只处理产品差异，不接管业务流程</u>

Adapter 的职责是：

- 把统一的 `StageContext` 转换成具体 Agent 产品需要的输入；
- 调用对应 SDK、CLI 或服务接口；
- 把原始结果转换成统一 `StageResult`；
- 把产品级错误转换成 Runtime 可以识别的错误类型。

Adapter **不应该**自己决定“测试失败后回实现阶段”“风险过高时转人工”等业务流转。这些仍然属于 Application 层的 Workflow / Gate 规则。

因此边界是：

```text
Adapter
→ 解决“怎样调用这个 Agent 产品”

Workflow / Gate
→ 解决“业务上下一步应该去哪里”
```

#### <u>3. BUG-42 用一条缺陷修复流程串起这些边界</u>

BUG-42 案例保留其稳定知识结构，用一条缺陷修复流程把 Stage、Agent、Skill、Gate、权限和人工审批串起来，同时避免重复展开前文已经说明的底层机制。

![BUG-42 执行结构](assets/agent-tutorial-BUG42执行结构.svg)

```text
collect_context
      ↓
diagnose        → Agent + 根因分析 Skill + read-only
      ↓
implement       → Agent + 改码 Skill + workspace-write
      ↓
verify
   ├─ pass  → risk_review
   └─ fail  → implement
                 ↓
risk_review     → 独立只读 Agent
      ↓
approve         → Human
   ├─ approve → release
   └─ reject  → closed
```

这个案例同时说明三件事：

1. **同一个 Agent 执行器可以在不同 Stage 加载不同 Skill 和权限。** `diagnose` 与 `implement` 不需要复制成两套底层 Runtime。
2. **不是所有 Stage 都应该 Agent 化。** `verify` 可以由确定性 Test Runner 执行，`approve` 由人工执行，`release` 由确定性 Tool 执行。
3. **Orchestrator 只推进流程，不承载根因分析或改码逻辑。** Agent 产出 Artifact，Gate 检查结果，Workflow 决定下一阶段。

#### <u>4. 技术重试与业务回退必须分开记录</u>

BUG-42 中最值得保留的边界，是“模型调用失败”和“补丁质量不合格”不能统一叫 Retry。

```text
模型 API Timeout
→ 技术故障
→ Runtime 按 Retry Policy 重试同一个 Stage
→ attempt + 1

测试失败
→ 产物没有通过 Gate
→ Workflow 回到 implement
→ repairRound + 1
```

`attempt` 表示同一 Stage 因超时、网络错误、临时服务异常等技术原因被重新执行的次数；`repairRound` 表示业务产物因为质量问题被退回修改的次数。两者分开以后，才能正确统计系统稳定性、业务质量、成本以及人工介入时机。

这层 Adapter 设计与前面的三层责任模型可以对应起来：

```text
Foundation
→ 提供 Executor、Runtime、Retry、State 等通用机制

Capability
→ 提供 Tool、Skill、Agent Provider 等可复用能力

Application
→ 通过 Workflow / Stage / Gate 决定具体业务怎样推进

Adapter
→ 位于 Application 调用 Agent Capability 的接缝处，
  隔离具体 Agent 产品的调用差异
```

从这里继续向底层理解 Agent 的实际运行机制，直接阅读本文第 12 章“七个组成与最小可运行实现”；继续看 Runtime 与 Harness 的概念边界，可以阅读 [《Agent System 研发知识梳理》](./Agent-System研发知识梳理.md)。

## 6. 从 Prompt Engineering 到 Harness Engineering 是工程对象逐层扩大的过程

### 【Prompt Engineering 解决单轮表达，Context Engineering 解决本轮信息供给】

Agent 工程最早往往从 Prompt 开始：

~~~text
Goal
↓
Prompt
↓
Model
↓
Output
~~~

Prompt Engineering 关注怎样把任务、约束、示例和输出格式表达清楚；当任务开始依赖动态文件、历史状态、工具结果和外部知识时，问题会升级成 Context Engineering：

~~~text
Model Context
=
Instructions
+ User Input
+ Relevant History
+ Retrieved Knowledge
+ Tool Definitions
+ Current State
+ Recent Observations
~~~

Context 的关键不是“越多越好”，而是让模型在当前 Step 看到足够、相关、可信且不过载的信息。Anthropic 将 Context Engineering 作为 Agent 在有限 Context Window 下选择、组织和维护信息的工程问题。[[23]](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents)

### 【Tool Calling 让模型从生成内容走向真实行动】

只有 Model 时，系统主要产生文本或结构化候选结果。接入 Tool 后形成：

~~~text
Model
→ Tool Call
→ Runtime 校验
→ Tool 执行
→ Observation
→ Model
~~~

Tool 应被理解为受控行动接口，而不是“模型自己执行代码”。真正的 API、文件、数据库、浏览器或命令执行仍然发生在外部 Runtime。

MCP 则进一步标准化 Agent 与外部 Tools、Resources、Prompts 等能力之间的连接方式。[[24]](https://modelcontextprotocol.io/docs/getting-started/intro)

### 【Memory、Skills、Artifact 与 State 解决不同连续性问题】

随着任务变长，只依赖当前 Context 会遇到上下文窗口和跨 Session 连续性问题，需要把信息外置：

| 对象 | 主要职责 |
| --- | --- |
| Context | 当前这一轮真正进入模型的信息 |
| Memory | 跨步骤或跨任务仍值得找回的信息 |
| Skill | 某类任务可复用的方法、步骤和资源 |
| Artifact | 当前任务已经产生的稳定结果 |
| State | 当前 Run 的执行快照 |

它们不应全部塞进永久 System Prompt。Skills 更适合按任务逐步披露；Memory 也需要召回、准入、作用域和失效策略。

### 【Spec 把目标、执行和验证连接成稳定任务合同】

Agent 不应该只知道“做什么”，还要知道：

~~~text
Goal
Scope
Constraints
Inputs
Expected Artifacts
Acceptance Criteria
Risk / Approval Boundary
~~~

Spec 同时为上下文、编排和验证提供稳定事实：

~~~text
Spec
├── Context Source
├── Planning Contract
├── Stage Input
└── Completion Criteria
~~~

因此输出已经生成，不等于任务已经完成；是否完成必须回到 Acceptance Criteria 和 Evidence。

### 【Harness Engineering 是包住五层的总装工程】

Harness 不是一个新的业务能力层，而是让 Agent 能长期可靠工作的工程外壳：

~~~text
Harness
=
Context Assembly
+ Tool Runtime
+ State / Workflow
+ Memory / Skills
+ Sandbox / Permission / Approval
+ Checkpoint / Recovery
+ Eval / Completion
+ Trace / Cost / Operations
~~~

工程对象因此从一次模型输入逐渐扩大到整个运行环境。OpenAI 当前也用 Harness Engineering 描述围绕 Agent 设计环境、意图和反馈循环的工程方式。[[25]](https://openai.com/index/harness-engineering/)

更稳妥的建设顺序是：

1. 先用明确 Prompt 和结构化输出验证任务；
2. 接入少量高质量 Tool，形成最小 Agent Loop；
3. 增加 Context Retrieval 和压缩；
4. 把稳定知识外置成 Memory，把特定任务方法沉淀为 Skill；
5. 建立显式 State、完成条件和失败路径；
6. 把关键阶段固化成 Workflow；
7. 只有上下文隔离、专业分工或并行收益明确时再使用 Subagent / Multi-Agent；
8. 最后补齐 Trace、Eval、成本、权限和生产运营。

## 7. 五层架构把 Agent System 拆成稳定职责域

### 【五层架构解决职责归属，而不是运行顺序】

~~~text
Agent System
│
├── Model Layer
├── Context Layer
├── Execution Layer
├── Orchestration Layer
└── Feedback & Control Layer
~~~

五层不是一次从上到下执行的调用栈，而是任务运行过程中反复协作的职责域。

| 层 | 核心职责 | 典型对象 |
| --- | --- | --- |
| Model | 处理不确定性决策 | LLM、Structured Output |
| Context | 决定本轮看见什么 | Prompt、RAG、Memory、State Projection |
| Execution | 连接真实环境 | Tool、API、CLI、MCP、Sandbox |
| Orchestration | 管理全局阶段与路由 | Workflow、State Machine、Scheduler |
| Feedback & Control | 判断能否执行、是否完成 | Guardrail、Validator、Eval、Approval |

### 【Model 只负责候选决策，不承担系统全部职责】

稳定边界是：

~~~text
Model
→ 提议下一步

Runtime / Control
→ 判断能不能执行

Tool
→ 执行真实动作

State
→ 记录结果

Validator
→ 判断结果是否满足要求
~~~

模型能力不能替代权限、状态、恢复和验证。

### 【Context 与 Memory 不能等价】

Context 是当前模型输入；Memory 是未来 Step 或 Run 可以召回的信息来源。Memory 只有被检索、筛选并装入当前 Context 后，才真正影响这一轮 Model Decision。

### 【Execution Layer 必须把 Tool Contract 和真实副作用写清楚】

每个 Tool 至少需要明确：

~~~text
Name
Description
Input Schema
Output / Error
Permission
Side Effect
Idempotency
Timeout / Retry Boundary
~~~

高风险 Tool 还需要连接 Sandbox、Authentication / Authorization 和 Human Approval。

### 【Orchestration Layer 管全局推进，Agent Loop 管局部探索】

~~~text
Outer Workflow
↓
Agent Node
↓
Agent Loop
Model → Action → Observation → Model
↓
Node Result
↓
Outer Workflow
~~~

Workflow、Orchestration 与 Agent Loop 可以嵌套，不是三选一。

### 【Feedback & Control 把概率执行变成可验证执行】

这一层主要负责：

~~~text
Pre-action Control
→ Permission / Guardrail / Budget

Post-action Validation
→ Test / Rule / Evaluator / Human Review

Completion Control
→ Acceptance Criteria + Evidence
~~~

没有反馈和完成条件，Agent Loop 容易无限重试、过早结束，或者把“已经产生输出”误判成“已经完成任务”。

## 8. 完整 Agent Workflow 用 State、双循环和恢复机制持续收敛

### 【完整任务从显式 State 开始，而不是只依赖聊天记录】

长任务至少需要：

~~~text
TaskState
├── Goal / Spec
├── Current Stage
├── Artifacts
├── Evidence
├── Attempts
├── Errors
├── Approval State
└── Completion Status
~~~

Conversation History 可以是 Context 来源，但不能替代整个任务 State。

### 【完整执行可以压缩成四个稳定动作】

真实实现可以细分成接收目标、初始化 State、选择步骤、组装 Context、模型决策、执行前控制、Tool Execution、执行后验证、State 回写。

入门先记住：

~~~text
定义目标
↓
决定下一步
↓
执行动作
↓
验证结果
↓
State 更新
↓
继续 / 结束
~~~

### 【内循环负责局部探索，外循环负责全局收敛】

内循环：

~~~text
Model
↓
Action
↓
Observation
↓
Model
~~~

解决“当前这一步接下来做什么”。

外循环：

~~~text
Spec
↓
Stage
↓
Artifact
↓
Validation
↓
Next Stage / Repair / Complete
~~~

解决“整个任务是否正在朝目标收敛”。

### 【确定性外壳和自主内核是更稳定的生产结构】

~~~text
Deterministic Shell
├── Stage
├── Permission
├── Budget
├── Acceptance
├── Retry / Recovery
└── Human Gate

Agentic Core
├── Search
├── Reason
├── Select Tool
├── Generate Candidate
└── Adapt from Observation
~~~

生产 Agent 通常不是 Code Orchestration 与 Model Orchestration 的二选一，而是 Hybrid：确定性外壳控制必须稳定的边界，Agent 自主内核处理不可预先写死的部分。

### 【Checkpoint、Artifact 和 Context 分别承担不同连续性】

~~~text
Context
→ 当前 Step 的短期工作信息

Artifact
→ Stage 已产生的稳定交付物

Checkpoint
→ Runtime 可以恢复的执行状态
~~~

任务跨度越长，越不能只依赖 Conversation History。

### 【失败恢复要先分类再决定下一步】

~~~text
Technical Failure
API Timeout / Temporary Error
→ Retry same Stage

Business Validation Failure
Tests Failed / Artifact Invalid
→ Return to producing Stage

Permission / Risk Block
→ Human Approval / Blocked

Irrecoverable Failure
→ Failed / Escalation
~~~

技术重试次数与业务返工轮次应分开记录。

## 9. Framework、Runtime 与 Harness 解决不同抽象层的问题

### 【LangChain、LangGraph、Deep Agents 不按“谁更高级”排序】

稳定判断应先看抽象层：

~~~text
Framework / Components
→ Model、Tool、Prompt、Retriever、Agent API

Runtime / Orchestration
→ State、Graph、Checkpoint、Interrupt、Durable Execution

Harness
→ Planning、Filesystem、Context Offloading、Skills、Memory、
   Subagents、Sandbox、Approval 等长任务能力
~~~

LangChain 当前提供模型、工具与高层 Agent 组件；LangGraph 提供低层有状态编排和 Durable Execution；Deep Agents 则在 Runtime 之上预装更多长任务 Harness 能力。[[26]](https://docs.langchain.com/oss/python/langchain/agents) [[27]](https://docs.langchain.com/oss/python/langgraph/overview) [[28]](https://docs.langchain.com/oss/python/deepagents/overview)

### 【选型从失败模式和控制需求出发】

| 当前需求 | 更轻的起点 |
| --- | --- |
| 固定转换、分类、抽取 | 普通代码 / Runnable |
| 少量 Tools、开放式局部任务 | 通用 Agent Loop |
| 多阶段、State、循环、审批、恢复 | LangGraph 一类 Runtime |
| 长任务、多产物、上下文卸载、Subagent | Harness / Deep Agents 类能力 |

升级信号应该是当前方案出现了明确失败，而不是“更复杂的框架更先进”。

### 【框架 API 会变化，职责模型才是稳定知识】

学习任何框架时持续回到：

~~~text
Model 在哪里？
Context 怎样构建？
Tool 谁执行？
State 保存什么？
Loop 谁驱动？
Memory 怎样召回？
Control 怎样验收？
Checkpoint 怎样恢复？
~~~

这样框架升级时，知识体系不会跟着 API 名称一起失效。

## 10. 业务 Agent 把通用运行能力落到领域事实、工具和验收标准

### 【先定义业务问题，而不是先选 Agent 框架】

以研发缺陷修复为例，真正业务目标不是“运行一个 Coding Agent”，而是：

~~~text
Bug / Requirement
↓
收集上下文
↓
诊断
↓
最小修改
↓
测试
↓
独立 Review
↓
Approval
↓
PR / Release
~~~

不同 Stage 不应全部 Agent 化：

~~~text
Diagnose
→ Agent

Implement
→ Agent

Verify
→ Deterministic Test Runner

Risk Review
→ Independent Agent / Rule

Release
→ Tool + Human Gate
~~~

### 【业务 Agent 至少需要五类业务补充】

~~~text
Generic Agent Runtime
+
Domain Tools
+
Domain Skills / Knowledge
+
Explicit Business State / Workflow
+
Acceptance / Permission / Eval
~~~

框架只能提供通用能力，不能替业务定义“什么是正确修复”“谁有权限发布”“测试失败后回哪里”。

### 【从 MVP 到 Production 应由失败数据推动升级】

~~~text
MVP 0
确定性脚本 / 人工流程

MVP 1
只读 Agent

MVP 2
受控修改 + Test Gate

MVP 3
State / Checkpoint / Long-task Harness

Production
Permission / Eval / Trace / SLA / Human Takeover
~~~

没有证明单 Agent 的价值之前，不应直接建设庞大的 Multi-Agent 平台。

### 【业务案例最终回到一个稳定公式】

~~~text
Business Agent
=
通用决策和运行能力
+ 领域事实
+ 受控行动接口
+ 显式流程
+ 可验证完成条件
+ 与风险匹配的治理
~~~

## 11. Agent 控制范式与 Multi-Agent Orchestration 是两条正交维度

### 【ReAct、Plan-and-Execute、Reflexion、Tree of Thoughts 控制不同粒度】

| 范式 | 主要控制粒度 | 核心问题 |
| --- | --- | --- |
| ReAct | Action | 下一步做什么 |
| Plan-and-Execute | Task / Step | 多阶段任务怎样拆和推进 |
| Reflexion | Trial | 一次完整尝试失败后怎样改进下一次 |
| Tree of Thoughts | Candidate | 多个候选路径怎样生成、评价和搜索 |

ReAct 的核心来自推理、行动、环境观察的交错循环。[[29]](https://arxiv.org/abs/2210.03629) Reflexion 使用语言反馈和 episodic memory 改进后续 Trial，而不是直接更新模型权重。[[30]](https://arxiv.org/abs/2303.11366) Tree of Thoughts 把候选 Thought State 显式化并进行搜索。[[31]](https://arxiv.org/abs/2305.10601)

### 【四种范式不是四套互斥 Agent 架构】

一个系统完全可以：

~~~text
Outer Workflow
↓
Plan-and-Execute
↓
某个开放 Step
↓
ReAct
↓
Outcome Validator
↓
失败后新 Trial
↓
Reflexion
~~~

ToT 还可以只嵌在某个高价值规划节点，用来比较多个候选方案。

### 【Reasoning Pattern 与 Multi-Agent Pattern 可以组合】

~~~text
Reasoning / Control Pattern
├── ReAct
├── Plan-and-Execute
├── Reflexion
└── Tree of Thoughts

Multi-Agent Orchestration
├── Sequential
├── Concurrent
├── Manager
├── Handoff
└── Group Collaboration
~~~

两条轴彼此正交。例如 Manager Agent 内部可以使用 Plan-and-Execute，Specialist Agent 内部可以使用 ReAct；多 Agent 并不自动说明内部采用哪种推理范式。

### 【从最小机制开始而不是默认叠满所有范式】

~~~text
路径未知且需要 Tool Feedback
→ ReAct

存在清晰阶段和依赖
→ Plan-and-Execute

完整 Trial 有可靠失败反馈
→ Reflexion

多个候选都值得探索且能评价
→ ToT
~~~

复杂度只在当前失败需要时增加。

## 12. 七个组成把 Agent 核心原理落成最小可运行实现

### 【最小 Agent 可以拆成七个组成】

~~~text
Model
→ 决定候选下一步

Context
→ 构造本轮模型可见信息

Tools
→ 执行真实动作

State
→ 保存任务运行快照

Loop
→ 持续推进 Step

Memory
→ 跨步骤 / 跨 Run 召回信息

Control
→ 校验行动、预算、权限和完成条件
~~~

七个组成与五层不是一一对应：

~~~text
五层
→ 职责架构视角

七个组成
→ 一次 Agent Run 的运行组件视角
~~~

### 【最小 Run 展示七个组成怎样连续协作】

~~~text
Task
↓
Initialize State
↓
Build Context
↓
Model Decision
├── Tool Call
│    ↓
│ Control Check
│    ↓
│ Tool
│    ↓
│ Observation + Evidence
│    ↓
│ Update State
│    ↓
│ Next Loop
│
└── Final Candidate
     ↓
   Completion Check
     ├── Pass → Completed
     └── Fail → Continue / Blocked
~~~

最小实现最重要的不是得到一个漂亮答案，而是把“谁决策、谁执行、谁记状态、谁判断完成”拆开。

### 【Control 必须能够拒绝行动和拒绝过早完成】

至少需要：

~~~text
Unknown Tool
→ Reject

Invalid Arguments
→ Reject

Permission Denied
→ Reject / Approval

No Evidence
→ Completion Rejected

Max Steps
→ Blocked
~~~

这样才能证明 Loop 是受控执行，而不是无限 Tool Calling。

### 【最小源码继续作为教程的可运行证据】

原 07 章对应的可运行代码继续保留在：

[Minimal Agent 源码](./source/minimal-agent/)

建议按 State → Context Builder → Model Adapter → Tool Registry → Control → Loop → Tests / Trace 的顺序阅读源码，并用测试确认边界，而不是只看最终输出。

### 【从最小实现继续进入完整 Agent System】

最小 Agent 解决“一条 Agent Loop 怎样真实运行”，完整生产系统还需要：

~~~text
Workflow
Checkpoint
Long-term Memory
Skills
Subagents
Sandbox
Permission
Human Approval
Observability
Eval
Cost / SLA
~~~

这些能力分别回到前面的五层、Workflow、Harness 与治理模型中。

## 13. 参考文献

[1] ANTHROPIC. [Building effective agents](https://www.anthropic.com/engineering/building-effective-agents)[EB/OL]. 2024-12-19[2026-08-29].

[2] OPENAI. [A practical guide to building agents](https://openai.com/business/guides-and-resources/a-practical-guide-to-building-ai-agents/)[EB/OL]. [2026-08-29].

[3] MICROSOFT. [Workflow capabilities](https://learn.microsoft.com/en-us/agent-framework/workflows/)[EB/OL]. 2026-08-25[2026-08-29].

[4] MICROSOFT. [Workflows](https://learn.microsoft.com/en-us/agent-framework/journey/workflows)[EB/OL]. 2026-08-25[2026-08-29].

[5] MICROSOFT. [Monitor, measure, and report value](https://learn.microsoft.com/en-us/agents/center-of-excellence/measure-report-value)[EB/OL]. 2026-07-14[2026-08-29].

[6] MICROSOFT. [Measure the impact of your agents](https://learn.microsoft.com/en-us/microsoft-copilot-studio/guidance/agent-business-value-measure-impact)[EB/OL]. 2026-06-04[2026-08-29].

[7] OPENAI. [Running agents](https://openai.github.io/openai-agents-python/running_agents/)[EB/OL]. [2026-08-29].

[8] OPENAI. [Agent Orchestration](https://openai.github.io/openai-agents-js/guides/multi-agent/)[EB/OL]. [2026-08-29].

[9] MICROSOFT. [Microsoft Agent Framework Workflows Orchestrations - Sequential](https://learn.microsoft.com/en-us/agent-framework/workflows/orchestrations/sequential)[EB/OL]. 2026-08-25[2026-08-29].

[10] MICROSOFT. [Microsoft Agent Framework Workflows Orchestrations - Concurrent](https://learn.microsoft.com/en-us/agent-framework/workflows/orchestrations/concurrent)[EB/OL]. 2026-08-25[2026-08-29].

[11] OPENAI. [Agent orchestration](https://openai.github.io/openai-agents-python/multi_agent/)[EB/OL]. [2026-08-29].

[12] OPENAI. [工具](https://openai.github.io/openai-agents-python/zh/tools/)[EB/OL]. [2026-08-29].

[13] OPENAI. [Context management](https://openai.github.io/openai-agents-python/context/)[EB/OL]. [2026-08-29].

[14] MICROSOFT. [Microsoft Agent Framework Workflows Orchestrations - Handoff](https://learn.microsoft.com/en-us/agent-framework/workflows/orchestrations/handoff)[EB/OL]. 2026-08-25[2026-08-29].

[15] OPENAI. [Handoffs](https://openai.github.io/openai-agents-python/handoffs/)[EB/OL]. [2026-08-29].

[16] MICROSOFT. [Workflow concepts](https://learn.microsoft.com/en-us/agent-framework/concepts/workflows/)[EB/OL]. 2026-08-25[2026-08-30].

[17] MICROSOFT. [Agents in Workflows](https://learn.microsoft.com/en-us/agent-framework/workflows/agents-in-workflows)[EB/OL]. 2026-08-25[2026-08-30].

[18] ANTHROPIC. [Effective harnesses for long-running agents](https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents)[EB/OL]. 2025-11-26[2026-08-30].

[19] ANTHROPIC. [Harness design for long-running application development](https://www.anthropic.com/engineering/harness-design-long-running-apps)[EB/OL]. 2026-03-24[2026-08-30].

[20] MICROSOFT. [Microsoft Agent Framework Workflows - Checkpoints](https://learn.microsoft.com/en-us/agent-framework/workflows/checkpoints)[EB/OL]. 2026-08-25[2026-08-30].


[21] MICROSOFT. [Workflow orchestrations](https://learn.microsoft.com/en-us/agent-framework/workflows/orchestrations/)[EB/OL]. [2026-10-03].

[22] MICROSOFT. [Group chat orchestration](https://learn.microsoft.com/en-us/agent-framework/workflows/orchestrations/group-chat)[EB/OL]. [2026-10-03].

[23] ANTHROPIC. [Effective context engineering for AI agents](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents)[EB/OL].

[24] MODEL CONTEXT PROTOCOL. [What is MCP?](https://modelcontextprotocol.io/docs/getting-started/intro)[EB/OL].

[25] OPENAI. [Harness engineering](https://openai.com/index/harness-engineering/)[EB/OL].

[26] LANGCHAIN. [Agents](https://docs.langchain.com/oss/python/langchain/agents)[EB/OL].

[27] LANGCHAIN. [LangGraph overview](https://docs.langchain.com/oss/python/langgraph/overview)[EB/OL].

[28] LANGCHAIN. [Deep Agents overview](https://docs.langchain.com/oss/python/deepagents/overview)[EB/OL].

[29] YAO, S. et al. [ReAct: Synergizing Reasoning and Acting in Language Models](https://arxiv.org/abs/2210.03629). 2022.

[30] SHINN, N. et al. [Reflexion: Language Agents with Verbal Reinforcement Learning](https://arxiv.org/abs/2303.11366). 2023.

[31] YAO, S. et al. [Tree of Thoughts: Deliberate Problem Solving with Large Language Models](https://arxiv.org/abs/2305.10601). 2023.
