# Agent 编排通过代码与模型分配不同范围的执行决策权

**原问题：** Agent 的 Orchestration（编排）应该如何设计？什么时候使用代码编排，什么时候使用模型编排？

**回答要点：**

- 编排同时设计执行结构和下一步决策权：可以预先定义的业务阶段优先由代码控制，无法预先确定的局部任务交给模型。
- Planning 与 Replanning 调整方案、子任务和工具选择，同时保持目标、业务约束、权限与验收标准。
- Manager 把专业 Agent 作为工具调用并收回结果；Handoff 将后续处理控制权转交给目标 Agent。
- 多 Agent、并行、Graph 和模型控制是不同维度，不能因为用了其中一个就推断其余维度。
- 混合编排以确定性业务骨架约束动态任务；允许模型自主性的范围由实际任务边界决定。

本题与[Agent 完整学习教程](<../A-Agent学习教程.md>)中的控制权、执行拓扑与编排模型相互参照。原问题及讲解来自[《Agent范式演进》原始资料](<../resource/Agent范式演进-原始资料.md>)，本文按问题视图完整整理；工程职责划分不冒充框架统一定义。

Orchestration（编排）解决的不是“怎样调用多个 Agent”，而是：

> **一个复杂任务由哪些执行单元完成、它们按照什么关系执行，以及当前步骤结束后，由谁决定下一步。**

因此，编排设计首先判断的不是使用 Manager 还是 Handoff，而是：

```text
Business Goal → 执行路径能否提前确定？ → 能：Code Orchestration ｜ 不能：LLM Orchestration
```

Anthropic 对 Workflow 和 Agent 的区分建立在这一控制权边界上：Workflow 中，LLM 和 Tool 按照预定义的代码路径运行；Agent 中，则由 LLM 动态控制自己的执行过程和 Tool 使用。[[1]](https://www.anthropic.com/engineering/building-effective-agents)

OpenAI Agents SDK 对 Orchestration 的划分也基本一致：一种是由代码决定 Agent Flow，另一种是让 LLM 根据当前任务进行 Planning、Reasoning 和下一步决策，两种方式可以组合。[[2]](https://openai.github.io/openai-agents-python/multi_agent/)

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

## 1. 编排先划分执行结构与下一步决策权

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

Anthropic 将 Workflow 定义为 LLM 和 Tool 沿着预定义代码路径运行的系统；同时建议从能够解决问题的最简单方案开始，只在确有需要时增加 Agent 自主性，因为 Agent 往往会用更高的延迟和成本换取更强的任务适应能力。[[1]](https://www.anthropic.com/engineering/building-effective-agents)

因此，如果一个业务已经存在比较稳定的 SOP（标准操作流程），最外层通常应该优先采用 Code Orchestration（代码编排）。例如：

```text
研发：需求分析 → 技术方案 → 开发 → 测试 → Review → Release
会议预约：理解预约要求 → 查询共同空闲时间 → 查询会议室 → 创建会议 → 发送通知
```

这些流程的核心执行关系并不存在太大不确定性。例如“创建会议之前需要找到有效时间”“开发完成以后需要经过测试”，这些是业务约束，而不是模型需要重新推理的问题。

因此代码可以直接控制阶段顺序、条件分支、并行关系和停止条件。即使每个阶段内部都调用 Agent，只要 Agent 之间的执行关系由程序提前定义，本质上仍然属于 Code Orchestration，而不是模型编排。

OpenAI Agents SDK 也明确指出，代码编排可以让 Agent Flow 在速度、成本和行为上更加 deterministic and predictable（确定、可预测），并给出了结构化输出后由代码路由、串联多个 Agent、Evaluator 循环以及并行运行多个独立 Agent 等典型方式。[[2]](https://openai.github.io/openai-agents-python/multi_agent/)

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

## 2. 模型在约束范围内规划动态任务并按需组织多个 Agent

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

OpenAI 将这种情况描述为 Open-ended Task（开放任务）：模型可以根据当前任务自主进行 Planning（规划）、使用 Tool 获取信息并采取行动，再根据结果继续决定后续步骤。[[2]](https://openai.github.io/openai-agents-python/multi_agent/)

#### <u>1. Planning 与 Replanning 是模型编排的基础</u>

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

#### <u>2. 只有任务需要多个专业 Agent 时，才进一步进入 Multi-Agent Orchestration</u>

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

#### <u>3. Manager：中央 Agent 保留控制权</u>

OpenAI Agents SDK 中对应的是 Agents as tools（Agent 作为工具）模式：Manager Agent 把专业 Agent 暴露成 Tool 调用，专业 Agent 完成任务后把结果返回 Manager，Manager 继续负责后续决策和最终输出。[[2]](https://openai.github.io/openai-agents-python/multi_agent/)

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

Anthropic 的 Orchestrator-workers 也属于相近思想：中央 LLM 根据当前任务动态拆分 Subtask、分配给 Worker，再综合 Worker 的结果；它特别适用于无法提前知道具体需要哪些子任务的复杂问题。[[1]](https://www.anthropic.com/engineering/building-effective-agents)

需要注意，Manager 和 Parallelism（并行）不是同一个概念。Manager 可以串行调用 Worker，也可以并行分发多个互不依赖的任务；Manager 描述的是**控制权集中在哪里**，Parallelism 描述的是**多少任务同时执行**。[[2]](https://openai.github.io/openai-agents-python/multi_agent/)

#### <u>4. Handoff：当前 Agent 将控制权交给另一个 Agent</u>

Handoff（控制权转移）采用另一种关系：当前 Agent 判断另一个 Agent 更适合继续处理，就把后续任务的控制权直接交给它。例如：

```text
Triage Agent → Handoff → Refund Agent → 后续由 Refund Agent 接管
```

OpenAI 当前文档说明，发生 Handoff 后，目标 Specialist Agent 会接管当前运行中的后续处理，而不是像 Manager 模式那样完成后把结果返回中央 Agent。[[3]](https://openai.github.io/openai-agents-python/handoffs/)

所以 Manager 与 Handoff 最核心的区别是：

```text
Manager：Manager → Worker → Result → Manager
Handoff：Agent A → Agent B → Agent C
```

也就是：**Manager 是集中式控制；Handoff 是控制权发生转移。**

Handoff 的一条控制链通常表现为单一 Active Agent 的连续切换，但这不意味着整个 Agent System 不能并行。外层 Workflow 仍然可以启动多个执行分支，Handoff 后的 Agent 也可以继续把其他 Agent 作为 Tool 使用。OpenAI 官方明确说明 Manager 和 Handoff 两种模式可以组合。[[2]](https://openai.github.io/openai-agents-python/multi_agent/)

## 3. 混合编排用确定性业务阶段约束动态执行

### 【Hybrid Orchestration：外层保持确定性，内层按需释放模型自主性】

生产环境中的 Agent System 通常既不会全部由代码固定，也不会把整个任务完全交给模型自由决定。OpenAI 官方明确指出 Code Orchestration 与 LLM Orchestration 可以混合使用。[[2]](https://openai.github.io/openai-agents-python/multi_agent/)

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

**核心认识**

Agent Orchestration 最终可以归结为一个问题：

> **系统应该把多少执行决策权交给模型。**

Anthropic 建议从能够完成任务的最简单方案开始，只有在任务确实需要灵活决策时再增加 Agent 自主性；OpenAI Agents SDK 也明确把编排分为代码控制与 LLM 控制，并支持两者组合。[[1]](https://www.anthropic.com/engineering/building-effective-agents) [[2]](https://openai.github.io/openai-agents-python/multi_agent/)

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

## 4. 参考文献

[1] Anthropic. [Building Effective AI Agents](<https://www.anthropic.com/engineering/building-effective-agents>)[EB/OL]. 核验日期：2026-10-04。

[2] OpenAI. [Agent orchestration — OpenAI Agents SDK (Python)](<https://openai.github.io/openai-agents-python/multi_agent/>)[EB/OL]. 核验日期：2026-10-04。

[3] OpenAI. [Handoffs — OpenAI Agents SDK (Python)](<https://openai.github.io/openai-agents-python/handoffs/>)[EB/OL]. 核验日期：2026-10-04。
