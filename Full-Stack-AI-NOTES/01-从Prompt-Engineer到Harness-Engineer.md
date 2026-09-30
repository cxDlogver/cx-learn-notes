# 01 从 Prompt Engineer 到 Harness Engineer

这一章解释 Agent 工程为什么从“写好一段指令”逐步演化为“围绕模型设计完整运行环境”。它不是职业名称的简单替换，而是问题边界从单次生成扩展到了长时间、跨系统、带副作用的任务执行。

### 【从模型本体的边界出发】

大语言模型首先是一个条件生成模型：给定当前可见的 Token，生成后续内容。OpenAI 的 [《Prompt engineering》](https://developers.openai.com/api/docs/guides/prompt-engineering) 指南把工程重点放在如何提供指令、上下文和示例，以获得更稳定的模型输出；这也意味着模型调用本身不等于一个完整执行系统。

模型可以理解、推理、分类、生成计划，也可以产生结构化的工具调用，但它本身通常不会天然地：

- 持久保存任务状态；
- 读取真实文件或数据库；
- 确认某条命令是否执行成功；
- 保证写操作幂等；
- 在进程中无限期运行；
- 自动遵守权限和审批边界；
- 用真实测试证明自己的答案正确。

因此应该先区分两个概念：

```text
模型输出“应该运行测试”
≠
系统真的运行了测试并获得退出码
```

模型适合处理不确定性判断，程序、工具和测试适合处理确定性执行与验证。Agent 工程正是把这两类能力组合起来。

### 【Prompt Engineering 解决表达问题】

早期 LLM 应用大多是单轮分类、提取、改写或问答。此时系统的主要变量是一段 Prompt，于是工程重点是把任务说清楚：

```text
角色 + 目标 + 背景 + 约束 + 示例 + 输出格式
```

例如，与其只写：

```text
分析这段代码。
```

不如明确：

```text
目标：识别权限绕过风险。
范围：只分析给定函数及直接调用者。
约束：不要假设未提供的运行环境。
输出：按严重程度列出问题、证据和修复建议。
```

Prompt Engineering 的价值没有消失。OpenAI 的 [《Prompt engineering》](https://developers.openai.com/api/docs/guides/prompt-engineering) 仍将它作为提高输出质量、稳定性和可控性的基本方法。它决定系统指令、工具描述、结构化输出和评估标准是否清晰，但主要解决“怎样表达当前任务”，无法独立处理信息召回、环境执行、状态持久化和失败恢复。

#### 适用边界

如果任务具备以下特征，Prompt 往往就是主要工程对象：

- 单次调用可以完成；
- 输入材料可以完整放进上下文；
- 不需要跨轮保存进度。

一旦这些条件被打破，问题就从 Prompt 扩大为 Context、Tool、State 和 Control。

### 【Context Engineering 解决供给问题】

当任务从单轮问答变成多轮开发、调试、搜索、改代码时，只优化 Prompt 已经不够了。Anthropic 在 [《Effective context engineering for AI agents》](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents) 中把 Context Engineering 称为 Prompt Engineering 的自然演进，并把 Context 定义为模型采样时可见的 Token 集合。因此，在 Agent 系统里真正需要管理的不是一段 Prompt，而是**模型在当前时刻能够看到的全部 Token 集合**：系统规则、用户目标、历史消息、工具说明、MCP、工具结果、项目规范、检索片段、当前状态和外部环境事实都会竞争有限的上下文窗口。

Prompt Engineering 问：

> 这句话怎样写得更有效？

Context Engineering 问：

> 为了让模型在当前步骤做出正确判断，此刻最应该给它哪些 Token？

一个实用的上下文处理流程是：

```text
召回 Retrieve
→ 过滤 Filter
→ 压缩 Compact
→ 排序 Rank
→ 组装 Assemble
→ 使用结果更新下一轮
```

以代码修改为例，可靠上下文通常不是整个仓库，而是：

```text
当前目标
+ 验收条件
+ 项目规则
+ 相关入口与调用链
+ 现有测试
+ 当前 Git 状态
+ 最近一次工具结果
+ 尚未解决的问题
```

上下文不是越多越好。Anthropic 的 [《Effective context engineering for AI agents》](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents) 将 Context 描述为有限资源，并指出上下文增长可能带来注意力和召回质量下降；无关文件、重复日志和过期结论都会消耗注意力预算。判断标准是：在不遗漏关键约束的前提下，保留最小的高信号信息集合。

#### 静态与动态上下文

| 类型 | 示例 | 装载策略 |
| --- | --- | --- |
| 稳定规则 | 安全策略、编码规范、工具 Schema | 启动时加载或按作用域继承 |
| 当前任务状态 | 目标、计划、已完成步骤、失败次数 | 每轮更新 |
| 外部事实 | 代码、数据库结果、网页、测试日志 | Just-in-time 检索 |
| 长期记忆 | 用户偏好、历史决策、项目知识 | 按身份和任务召回 |
| 大型中间产物 | 搜索结果、报告、构建日志 | 存文件，只把摘要和引用留在上下文 |

### 【工具让模型从“会说”走向“会做”】

模型只能产生行动意图，==执行层==才会改变真实世界。Anthropic 的 [《Writing effective tools for AI agents》](https://www.anthropic.com/engineering/writing-tools-for-agents) 强调：工具应具有清晰的用途、无歧义的参数和尽量互不重叠的能力边界。

一个工具至少需要定义：

- 清晰、互斥的用途；
- 明确的输入 Schema；
- 可检查的返回 Schema；
- 权限等级与副作用；
- 超时、错误类型和重试策略；
- 幂等性或补偿方式。

```yaml
name: run_tests
description: 运行指定测试目标并返回真实退出码；不负责修改代码
input:
  target: string
output:
  exit_code: integer
  stdout: string
  stderr: string
side_effect: low
retryable: true
timeout_seconds: 300
```

Tool 是面向模型的能力接口；Function、API、CLI、Script 或浏览器操作是实现方式。Model Context Protocol 的 [《What is MCP?》](https://modelcontextprotocol.io/docs/getting-started/intro) 将 MCP 定义为一种把外部 Tools、Resources 和 Prompts 标准化接入 AI 应用的开放协议。不要把 Tool 和 Agent 混为一谈：Tool 只负责一个动作，Agent 还要决定何时调用、如何使用结果以及何时停止。

### 【ReAct 把推理和行动连成循环】

有了工具，系统仍需把模型决策和环境观察连接起来。Yao 等人在 [《ReAct: Synergizing Reasoning and Acting in Language Models》](https://arxiv.org/abs/2210.03629) 中提出让模型交错生成 reasoning traces 和 task-specific actions：推理用于生成、跟踪和更新行动计划，行动则从外部环境取得新信息。

经典 ReAct 心智模型是：

```text
Reason：根据目标与当前状态判断下一步
  ↓
Act：选择并调用工具
  ↓
Observe：获得真实返回值或环境变化
  ↓
Update：把观察写回状态与上下文
  ↓
Reason again
```

代码 Agent 的局部循环可能是：

```text
搜索符号 → 阅读文件 → 检查调用者 → 修改代码 → 运行测试 → 根据错误修复
```

Agent 的基本能力因此不再是“一次生成完整答案”，而是根据新证据不断修正下一步。自动纠错并不是模型突然拥有了确定性，而是环境把错误转化为下一轮可消费的反馈。

### 【为什么还需要“记忆层”】

ReAct 让模型能够不断“思考—行动—观察—再思考”，但循环次数越多，历史消息、文件内容、工具结果、错误日志和中间结论就越多，**上下文必然膨胀**。Context Engineering 可以决定当前一轮保留、压缩和召回什么，却无法把所有历史永久留在有限的 Context Window 里；会话结束或上下文压缩之后，只存在于聊天记录中的规则还可能消失。

Anthropic 的 Claude Code 文档 [《How Claude remembers your project》](https://code.claude.com/docs/en/memory) 明确说明，每个会话都从一个新的 Context Window 开始，跨会话知识依靠两种机制携带：由人维护的 `CLAUDE.md` 和由 Claude 积累的 auto memory。前者适合保存编码规范、常用命令、项目架构和工作流，后者适合保存 Claude 在工作中积累的调试经验、偏好和项目模式。

OpenAI 的 Codex 文档 [《Custom instructions with AGENTS.md》](https://learn.chatgpt.com/docs/agent-configuration/agents-md) 采用了相似思路：Codex 在开始工作前读取 `AGENTS.md`，并从全局范围到项目根目录、当前工作目录逐层组合指导，使 Agent 每次进入仓库时都能重新获得一致的规则和预期。

因此，AI Agent 中的“记忆”不能只理解成聊天历史。它更重要的作用是把以下内容外置保存，并在需要时重新注入：

- 长期稳定的规则与安全策略说明；
- 用户偏好与团队工作约定；
- 项目架构、构建命令和环境知识；
- 经过验证的历史决策与故障经验；
- 可以跨会话复用的流程说明。

规则文件提供的是**指导**，不是不可绕过的技术强制。`AGENTS.md`、`CLAUDE.md` 和 Memory 可以告诉 Agent “应该怎样做”，但高风险动作能否真正执行，仍要由 Sandbox、文件与网络权限、工具参数校验和 Approval 决定。OpenAI 的 Codex 文档 [《Sandboxing》](https://learn.chatgpt.com/docs/sandboxing) 将 Sandbox 定义为技术访问边界，[《Agent approvals & security》](https://learn.chatgpt.com/docs/agent-approvals-security) 则说明越界或高风险动作何时需要暂停并请求许可。不能把“写了一条禁止规则”误认为系统已经完成安全隔离。

本教程把 Memory 视为**上下文层中的持久化子能力**，而不是五层之外的第六层。它解决的是：即使当前上下文被裁剪、压缩或重新创建，系统仍然有办法找回关键约束。

### 【规则文件为什么不能无限膨胀】

规则文件解决了“关键约束会随会话消失”的问题，但它立刻带来下一个瓶颈：**规则一多，就会挤占上下文**。每次启动都加载一份巨大的 `AGENTS.md` 或 `CLAUDE.md`，会减少任务、代码和工具结果能够使用的 Token；当所有规则都被标成重要时，模型反而更难识别当前任务真正相关的部分。

OpenAI 在 [《Harness engineering: leveraging Codex in an agent-first world》](https://openai.com/index/harness-engineering/) 中复盘了 “one big `AGENTS.md`” 的失败：巨型规则文件会挤占稀缺上下文，使指导失去重点、快速过期且难以校验。因此其实践不是把 `AGENTS.md` 当百科全书，而是把它做成一张简短的“目录地图”，再把详细知识放进结构化文档中按路径查找。Claude Code 的 [《How Claude remembers your project》](https://code.claude.com/docs/en/memory) 也建议让 `CLAUDE.md` 保持具体、简洁；只在局部生效的规则使用 path-scoped rules，多步骤且特定于任务的流程则移入 Skill。

这就引出了 Skills。OpenAI 的 Codex 文档 [《Build skills》](https://learn.chatgpt.com/docs/build-skills) 将 Skill 定义为把 instructions、resources 和可选 scripts 打包起来的任务能力单元，使 Codex 可以可靠复用一类工作流。它采用 Progressive Disclosure：启动时只把 Skill 的名称、描述和路径放入上下文，只有确定要使用该 Skill 时，才加载完整 `SKILL.md`。

因此，规则文件和 Skills 不是两种互相替代的格式，而是解决不同生命周期的问题：

| 机制 | 适合保存 | 典型加载方式 |
| --- | --- | --- |
| `AGENTS.md` / `CLAUDE.md` | 几乎每个任务都需要的稳定规则、项目地图和工作约定 | 启动时或进入对应作用域时加载 |
| Path-scoped rules | 只对某类文件或目录成立的局部规则 | 读取匹配路径时加载 |
| Skills | 特定任务才需要的步骤、判断标准、脚本、模板和参考资料 | 先暴露摘要，任务命中后加载全文 |
| 外部文档与 Memory | 大型项目知识、历史决策、调试经验 | 通过索引或检索按需读取 |

```text
始终相关的少量规则 → 常驻上下文
与路径相关的规则   → 进入作用域时加载
与任务相关的流程   → 命中 Skill 时加载
大型知识与历史     → Just-in-time 检索
```

这一步把记忆管理从“静态大文档”升级为“**规则文件 + 技能路由 + 按需装配**”。Memory 解决“信息不能丢”，Skills 进一步解决“信息不必一直占着当前上下文”。

### 【从记忆管理走向任务编排】

即使有了记忆层和执行层，一个复杂任务仍然可能跑偏，因为模型未必天然会把大任务拆得足够清楚。Memory 能告诉 Agent 应该遵守什么，Tools 能让 Agent 执行动作，ReAct 能让它根据局部观察继续行动；但这三者都没有单独回答：整个任务现在进行到哪一步、步骤之间有什么依赖、失败后回到哪里，以及满足什么条件才算真正完成。

模型完全可能连续做出“局部合理”的动作，却在全局上反复搜索、跳过前置条件、过早结束，或者在测试失败后不知道应该重试、回滚还是请求人工介入。Anthropic 在 [《Building effective agents》](https://www.anthropic.com/engineering/building-effective-agents) 中强调，应从简单、可组合的模式开始，并区分由预定义代码路径控制的 Workflow 与由模型动态控制过程和工具使用的 Agent。

这就引出了**编排层**。编排层不是为了让模型“更聪明”，而是把复杂任务拆成更稳定、可观察、可验证的小步骤，让模型的自主决策发生在明确边界内。一个 Coding Agent 的全局流程通常是：

```text
理解需求
→ 确认项目规范与验收标准
→ 探索代码并形成方案
→ 实施修改
→ 补充和运行测试
→ 根据失败结果修复或重规划
→ 验证最终结果
→ 整理交付与剩余风险
```

ReAct 与编排层解决的是不同尺度的问题：

| 尺度 | 回答的问题 | 典型状态 |
| --- | --- | --- |
| ReAct 局部循环 | 根据当前观察，下一步做什么？ | 当前工具、最近观察、局部假设 |
| 编排层全局流程 | 整个任务如何分阶段推进、恢复和结束？ | 阶段、依赖、计划、重试、审批、完成条件 |

因此，编排层需要显式回答：

- 当前处于哪个阶段？
- 哪些步骤存在依赖，哪些路径可以并行？
- 失败后应该重试、重规划、回滚还是终止？
- 什么时候必须等待人工审批？
- 哪些证据出现后才算完成？

生产系统通常采用“确定性外壳 + Agent 自主内核”的混合方式：

```text
固定阶段：理解需求 → 方案审批 → 自动验证 → 发布审批
动态阶段：代码探索、故障定位、修复尝试
```

在更复杂的系统里，编排层还会演化为多 Agent 协作。Claude Code 的 [《Create custom subagents》](https://code.claude.com/docs/en/sub-agents) 把任务专门化、上下文隔离和并行处理列为 Subagent 的典型用途；Anthropic 的 [《How we built our multi-agent research system》](https://www.anthropic.com/engineering/multi-agent-research-system) 则展示了 Lead Agent 如何协调多个专业 Subagents。此时编排不只是“列任务清单”，还包括“把不同子任务交给不同上下文，在明确接口处汇总结果”。

### 【反馈与控制让执行形成闭环】

工具返回 `success: true` 只能证明调用完成，不能证明业务目标达成。Agent 需要多种独立证据：

| 反馈 | 示例 | 主要用途 |
| --- | --- | --- |
| 环境反馈 | Shell 退出码、API 返回、文件 Diff | 确认真实发生了什么 |
| 规则反馈 | Schema、静态检查、目录白名单 | 确定性约束 |
| 测试反馈 | 单元测试、集成测试、端到端测试 | 验证功能行为 |
| 模型评估 | 完整度、相关性、风险评审 | 评价非确定性质量 |
| 人工反馈 | 方案选择、发布审批、敏感操作确认 | 承担高风险判断 |
| 运行反馈 | Token、延迟、循环次数、失败率 | 运营和优化系统 |

Anthropic 的 [《Demystifying evals for AI agents》](https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents) 把 transcript 与最终 outcome 分开，并建议根据任务组合代码规则、模型评分和人工评审；Agent 自己声称成功并不等于外部状态真的满足目标。

一般情况下，证据优先级是本教程给出的工程判断：

```text
真实环境结果
> 自动化测试
> 确定性规则
> 独立模型评估
> 当前模型的自我判断
```

控制层还需要最大步数、超时、成本上限、重试阈值、熔断、回滚和审批机制，防止 Agent 无限循环或扩大副作用。

### 【Spec 把上下文、编排和验证连接起来】

Agent 能直接执行之后，模糊需求的代价会被放大。GitHub 的 [《Spec Kit》](https://github.github.com/spec-kit/index.html) 把 Spec-Driven Development 的基础流程组织为 `Spec → Plan → Tasks → Implement`，让每一阶段生成的结构化产物继续驱动下一阶段。在本教程中，Spec 不再只是写给人看的前置文档，而是 Agent 的执行合同，至少应包含：

- 目标与非目标；
- 允许和禁止的操作范围；
- 输入、输出与关键约束；
- 可用工具和权限；
- 验收标准；
- 需要人工决策的节点。

Spec 同时承担三个角色：第一，它是可以跨节点、跨上下文窗口反复读取的**持久任务上下文**，保存目标、边界和关键约束；第二，它是编排层拆任务、排序和路由的**执行合同**；第三，它是反馈与控制层判断是否完成的**验收基准**。三者连起来后，Spec 才不只是一份前置文档，而是贯穿任务生命周期的稳定事实；没有验收条件时，Agent 很容易把“已经产生输出”误认为“已经完成目标”。

### 【Harness Engineering 是总装工程】

Harness 不是五层之外的第六种业务能力，而是包住并连接五层的工程外壳。它负责让模型在每一轮都获得合适信息，在受控环境中行动，根据证据修正，并在满足条件时安全结束。

```text
Harness Engineering
= 指令与上下文装配
+ 工具注册与执行环境
+ 状态与任务编排
+ Memory 与 Skills
+ 测试、Eval 与完成判定
+ Sandbox、权限与审批
+ Trace、成本和故障恢复
```

OpenAI 在 [《Harness engineering: leveraging Codex in an agent-first world》](https://openai.com/index/harness-engineering/) 中用“Humans steer. Agents execute.”概括这种工作方式，并强调团队工作的重心转向设计环境、表达意图和构建反馈循环；Anthropic 的 [《Effective harnesses for long-running agents》](https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents) 也表明，仅有高层 Prompt 和模型循环不足以稳定完成跨上下文窗口的复杂任务，需要外部 Harness 管理状态、交接和验证。

这里的关键变化是，工程师不再只优化模型的一次回答，而是优化“模型能够怎样工作”。

### 【工程角色发生了什么变化】

| 阶段 | 主要交付物 | 核心判断 |
| --- | --- | --- |
| Prompt Engineer | Prompt、Few-shot、输出 Schema | 模型是否理解当前任务 |
| Context Engineer | 检索、压缩、记忆、上下文装配策略 | 模型此刻是否看到正确事实 |
| Tool Engineer | Tool Schema、API、沙箱、错误协议 | 模型能否安全、确定地行动 |
| Workflow Engineer | 状态、节点、路由、重试、恢复 | 长任务是否能持续推进 |
| Eval / Control Engineer | 测试、Guardrail、审批、Trace | 结果是否正确、安全、可审计 |
| Harness Engineer | 连接上述所有部分的整体系统 | Agent 是否长期可靠、可复用、可运营 |

这些角色不是互相取代，而是逐层包含。优秀的 Harness 仍然需要清晰的 Prompt，只是 Prompt 已不再是系统的全部。

### 【从轻到重的建设顺序】

不要从第一天就构建复杂多 Agent 系统。更稳妥的演化顺序是：

1. 先用明确 Prompt 和结构化输出解决单轮任务；
2. 接入一个或少量高质量工具，形成最小 Agent Loop；
3. 增加按需检索和上下文压缩，避免历史无限堆积；
4. 把稳定规则和偏好外置为 Memory，把特定任务流程封装为按需加载的 Skills；
5. 为任务建立显式 State、完成条件和失败路径；
6. 把关键阶段固化为 Workflow，并加入测试和审批门禁；
7. 只有在上下文隔离、专业分工或并行收益明确时才使用子 Agent；
8. 最后补齐 Trace、Eval、成本、权限和生产运营能力。

判断是否应该升级复杂度，不看“框架是否流行”，而看当前失败是否已经无法由更简单的方案解决。

### 【本章结论】

从 Prompt Engineer 到 Harness Engineer 的本质，是从优化一段输入，走向设计一个可持续运行的系统：

```text
Prompt 负责把话说清楚
Context 负责给出正确依据
Model 负责不确定性决策
Tools 负责真实执行
Memory 负责跨轮找回稳定知识
Skills 负责按需加载特定任务方法
Workflow 负责全局推进
Feedback 负责验证和纠偏
Harness 负责把一切装配成可托付的 Agent
```

这篇文档采用的是**工程演进视角**：解释为什么工程对象会从 Prompt 逐步扩展到 Context、Tool、Workflow 与 Harness。如果需要从“当前一个 Agent System 由哪些运行机制组成”的**系统组成视角**重新梳理这些能力，继续阅读 [《Agent System 研发知识梳理》](./Agent-System研发知识梳理.md)。

下一章会把这些职责收敛成五层架构，并解释每一层的边界、输入、输出和工程检查点。

### 【本章引用证据】

| 主题 | 引用文献 | 支撑的观点 |
| --- | --- | --- |
| Prompt Engineering | [OpenAI《Prompt engineering》](https://developers.openai.com/api/docs/guides/prompt-engineering) | 清晰指令、上下文和示例仍是稳定输出的基础 |
| Context Engineering | [Anthropic《Effective context engineering for AI agents》](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents) | Context 是完整可见 Token 集合；Context Engineering 是 Prompt Engineering 的自然演进 |
| Tool 设计 | [Anthropic《Writing effective tools for AI agents》](https://www.anthropic.com/engineering/writing-tools-for-agents) | 工具用途、参数和能力边界要清晰 |
| 工具接入协议 | [MCP《What is MCP?》](https://modelcontextprotocol.io/docs/getting-started/intro) | MCP 标准化连接外部数据、工具和工作流 |
| 推理—行动循环 | [ReAct 论文](https://arxiv.org/abs/2210.03629) | 推理与行动交错，并利用环境观察更新计划 |
| 跨会话记忆 | [Claude Code《Memory》](https://code.claude.com/docs/en/memory)、[OpenAI `AGENTS.md`](https://learn.chatgpt.com/docs/agent-configuration/agents-md) | 新 Context Window 中通过外置规则、偏好和项目知识恢复关键约束 |
| 规则膨胀与 Skills | [OpenAI《Harness engineering》](https://openai.com/index/harness-engineering/)、[OpenAI《Build skills》](https://learn.chatgpt.com/docs/build-skills) | 大型常驻规则挤占上下文；Skills 通过 Progressive Disclosure 按需加载任务方法 |
| 指导与强制边界 | [OpenAI《Sandboxing》](https://learn.chatgpt.com/docs/sandboxing)、[OpenAI《Agent approvals & security》](https://learn.chatgpt.com/docs/agent-approvals-security) | 规则文件提供上下文指导，Sandbox、权限和 Approval 提供技术强制 |
| Workflow 与 Agent | [Anthropic《Building effective agents》](https://www.anthropic.com/engineering/building-effective-agents) | 预定义流程与模型动态决策的区别，以及简单优先原则 |
| 多 Agent 编排 | [Claude Code《Subagents》](https://code.claude.com/docs/en/sub-agents)、[Anthropic《Multi-agent research system》](https://www.anthropic.com/engineering/multi-agent-research-system) | 任务专门化、上下文隔离、并行处理和 orchestrator-worker 协作 |
| Agent 评估 | [Anthropic《Demystifying evals for AI agents》](https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents) | Transcript、Outcome 与多类 Grader 的边界 |
| Spec 驱动 | [GitHub《Spec Kit》](https://github.github.com/spec-kit/index.html) | `Spec → Plan → Tasks → Implement` 的结构化流程 |
| Harness Engineering | [OpenAI《Harness engineering》](https://openai.com/index/harness-engineering/)、[Anthropic《Effective harnesses for long-running agents》](https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents) | 通过环境、状态和反馈循环支撑 Agent 长时程执行 |
