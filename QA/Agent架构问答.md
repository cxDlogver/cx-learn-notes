# Agent 架构问答

## AGENT-001：什么是 AI Agent？它与普通 LLM 应用、传统工作流自动化有什么本质区别？

### 问题

什么是 AI Agent？它与普通 LLM 应用、传统工作流自动化有什么本质区别？请从定义、核心能力、运行机制、适用场景和风险控制几个角度回答。

## 回答大纲

本题考察你是否真正理解 AI Agent 的本质，而不是只把它理解成“接了工具的大模型”或“更复杂的聊天机器人”。

核心思路是：

1. 先给出 Agent 的定义：它是能代表用户完成任务的目标驱动系统。
2. 区分三个概念：普通 LLM 应用、预定义工作流、AI Agent。
3. 说明 Agent 的关键能力：自主决策、工具使用、环境反馈、任务分解、状态管理、异常处理。
4. 解释 Agent 的运行机制：目标输入、规划、行动、观察、反思、继续执行或停止。
5. 说明什么时候该用 Agent，什么时候不该用。
6. 最后补充生产级 Agent 必须有边界、评估、可观测性和人工接管机制。

## 参考答案

AI Agent 是一种以大语言模型为核心、能够围绕目标自主决策并调用工具完成任务的软件系统。OpenAI 将 agent 描述为“能够代表用户独立完成任务的系统”，并强调如果一个应用只是调用 LLM 生成回答，而不是让 LLM 控制工作流执行，那么它并不算真正的 agent `https://openai.com/business/guides-and-resources/a-practical-guide-to-building-ai-agents/` 。

从本质上看，AI Agent 与普通 LLM 应用的区别在于“谁控制流程”。普通 LLM 应用通常是用户输入一次，模型输出一次，例如问答机器人、摘要工具、情感分类器；而 Agent 会根据目标判断下一步该做什么、是否需要调用工具、是否需要继续执行、何时停止或请求人工帮助。Anthropic 也区分了 workflow 和 agent：workflow 是 LLM 与工具沿着预定义代码路径运行，而 agent 是 LLM 动态决定自己的过程和工具使用方式 `https://www.anthropic.com/engineering/building-effective-agents` 。

可以用一张表来区分三者：

| 类型 | 控制流程者 | 特点 | 例子 |
|---|---|---|---|
| 普通 LLM 应用 | 用户或固定程序 | 单轮或少量多轮生成，模型主要负责回答 | 聊天机器人、摘要器、分类器 |
| 传统工作流自动化 | 人写好的规则和代码 | 路径固定、可预测、稳定性强 | 审批流、RPA、定时脚本 |
| AI Agent | LLM 或 LLM 驱动的调度器 | 可根据目标动态规划、调用工具、处理异常 | 自动研究助手、代码修复 Agent、客服处理 Agent |

一个典型 AI Agent 至少包含三个基础组件：模型、工具和指令。模型负责理解目标、推理和决策；工具让 Agent 能访问外部世界，例如搜索网页、查询数据库、读写文件、调用 API、发送邮件；指令则定义 Agent 的角色、边界、策略和安全约束。OpenAI 的 agent 设计基础也将其概括为 model、tools、instructions 三个核心部分 `https://openai.com/business/guides-and-resources/a-practical-guide-to-building-ai-agents/` 。

Agent 的运行机制通常是一个循环，而不是一次性生成。它会先接收用户目标，然后拆解任务，决定下一步行动，调用工具获得环境反馈，再根据反馈修正计划，继续行动，直到任务完成、达到停止条件、遇到错误，或需要交还给人类。Anthropic 指出，Agent 在执行过程中需要不断从环境获得“ground truth”，例如工具调用结果或代码执行结果，用这些反馈评估进展并决定下一步 `https://www.anthropic.com/engineering/building-effective-agents` 。

因此，Agent 的核心不是“会聊天”，而是“能闭环完成任务”。这个闭环可以概括为：

```text
目标理解 → 任务规划 → 工具调用 → 观察结果 → 调整策略 → 继续执行 → 完成或交接
```

例如，用户说“帮我调研某个行业并生成报告”，普通 LLM 可能直接根据已有知识生成一篇文章；检索增强应用可能先搜索资料再总结；而 Agent 会进一步决定搜索哪些关键词、筛选哪些来源、是否需要补充查询、如何组织结构、是否生成文件、是否检查引用完整性，最后在达到质量标准后交付结果。

什么时候应该使用 Agent？适合 Agent 的任务通常有几个特点：步骤数不确定、需要处理非结构化信息、需要跨多个系统行动、存在复杂判断、传统规则难以维护。例如客户服务中的退款判断、供应商安全审查、复杂资料研究、代码库修复等，都可能适合 Agent。OpenAI 建议优先考虑那些传统确定性方法难以处理的场景，例如复杂决策、规则过多难维护、严重依赖非结构化数据的流程 `https://openai.com/business/guides-and-resources/a-practical-guide-to-building-ai-agents/` 。

但并不是所有任务都应该做成 Agent。Anthropic 明确建议先寻找最简单的解决方案，只有当复杂性确实带来收益时才增加 agentic system，因为 Agent 往往会用更高成本和更高延迟换取更强的任务表现 `https://www.anthropic.com/engineering/building-effective-agents` 。如果任务路径固定、规则清晰、容错率低，用传统工作流、函数调用或简单 RAG 可能更可靠。

生产级 Agent 还必须考虑风险控制。Agent 拥有越多工具和自主权，越可能出现错误累积、误调用工具、越权操作、无限循环、幻觉决策、隐私泄露等问题。因此必须设计权限边界、工具白名单、最大执行步数、人工确认点、日志追踪、评估集、回滚机制和异常交接策略。

一个专业回答可以这样总结：

AI Agent 是由 LLM 驱动的目标执行系统。它区别于普通 LLM 应用的关键，不是是否接入了工具，而是 LLM 是否参与控制任务流程；它区别于传统自动化的关键，不是能否完成任务，而是能否在不完全预定义路径的情况下，根据环境反馈动态决定下一步。真正的 Agent 应具备目标理解、规划、工具调用、反馈观察、状态管理、异常处理和安全约束能力。它适合开放性强、路径不确定、需要判断和工具行动的任务，但不适合所有场景；在生产环境中，可靠性、可观测性、评估和人工接管机制与模型能力同样重要。

## AGENT-002：请解释 AI Agent 中常见的 Plan-Act-Observe-Reflect 闭环是什么？

### 问题

请解释 AI Agent 中常见的 `Plan-Act-Observe-Reflect` 闭环是什么？它解决了什么问题？在真实系统中应该如何设计这个闭环，才能避免 Agent 失控、低效或产生错误累积？

## 回答大纲

本题考察的是 Agent 的“执行机制”，也就是 Agent 如何从一个目标逐步推进到最终结果。

回答核心思路：

1. 先解释 `Plan-Act-Observe-Reflect` 四个阶段分别是什么。
2. 再说明它为什么比单次 LLM 调用更适合复杂任务。
3. 结合工具调用说明 Agent 如何通过环境反馈修正行为。
4. 分析闭环中的主要风险：无限循环、错误累积、无效工具调用、过度规划。
5. 最后说明工程上如何控制：停止条件、状态管理、工具约束、评估器、人工接管。

## 参考答案

`Plan-Act-Observe-Reflect` 是 AI Agent 中非常典型的任务执行闭环，可以理解为 Agent 的“认知-行动-反馈-修正”循环。它的核心思想是：Agent 不只是一次性生成答案，而是围绕目标不断规划下一步、执行动作、观察结果，并根据反馈调整策略。

四个阶段分别是：

| 阶段 | 含义 | 例子 |
|---|---|---|
| `Plan` | 根据目标制定当前计划或下一步策略 | 决定先搜索资料，再整理框架，最后生成报告 |
| `Act` | 执行某个动作，通常是调用工具 | 调用搜索工具、数据库、代码执行器、文件系统 |
| `Observe` | 获取动作结果，也就是环境反馈 | 搜索结果、API 返回值、测试结果、文件内容 |
| `Reflect` | 分析结果是否满足目标，并决定是否修正 | 发现资料不足，继续搜索；发现代码测试失败，定位原因 |

这个闭环解决的核心问题是：复杂任务无法靠一次模型输出稳定完成。普通 LLM 调用通常是“输入 → 输出”，适合问答、改写、摘要等相对静态任务；而 Agent 面对的是动态任务，例如调研、编程、客服处理、数据分析、系统运维等，这些任务往往需要多步执行、外部信息、工具调用和中途修正。

Anthropic 在解释 Agent 时强调，Agent 往往是在环境反馈中循环工作的系统：它通过工具调用、代码执行结果等“ground truth”判断当前进展，并在必要时暂停、继续或请求人工反馈 `https://www.anthropic.com/engineering/building-effective-agents` 。OpenAI 也指出，Agent 的一个关键特征是由 LLM 管理工作流执行和决策，能够判断工作流是否完成，并在失败时修正行动或把控制权交还给用户 `https://openai.com/business/guides-and-resources/a-practical-guide-to-building-ai-agents/` 。

可以把这个过程理解成下面的循环：

```text
用户目标
  ↓
Plan：拆解目标，决定下一步
  ↓
Act：调用工具或执行操作
  ↓
Observe：读取工具返回和环境变化
  ↓
Reflect：判断是否完成、是否出错、是否需要调整
  ↓
继续下一轮，直到完成或停止
```

例如，用户要求“帮我修复项目里的测试失败”。一个 Agent 不应该直接猜测答案，而应该先规划：读取错误日志、定位失败测试、查看相关源码、修改代码、运行测试、根据测试结果继续修正。每一次运行测试得到的结果就是 `Observe`，而根据测试结果决定下一步就是 `Reflect`。

在真实系统中，`Plan` 不一定意味着生成一个很长的完整计划。很多情况下，更可靠的做法是“短规划”，也就是只决定接下来一到三步。因为复杂任务中的信息会不断变化，过早制定完整计划可能导致 Agent 固执地执行错误路径。优秀的 Agent 不是一开始就把所有步骤写死，而是在每一轮根据新观察更新计划。

`Act` 阶段的关键是工具设计。Agent 能力的边界很大程度取决于工具，包括搜索、数据库查询、浏览器、代码执行、文件读写、业务 API 等。Anthropic 特别强调，工具定义需要像人机交互界面一样被认真设计，包括清晰的参数、边界、示例和错误提示，因为工具接口质量会直接影响 Agent 的可靠性 `https://www.anthropic.com/engineering/building-effective-agents` 。

`Observe` 阶段要求 Agent 不能只相信自己的推理，而要相信外部结果。例如代码是否正确，要看测试；资料是否可靠，要看来源；数据库更新是否成功，要看 API 返回；文件是否生成，要看文件系统结果。没有观察反馈的 Agent 很容易变成“自说自话”的生成器。

`Reflect` 阶段是 Agent 和普通工具链的重要区别。Agent 不只是机械执行下一步，而是要判断：当前结果是否满足目标？是否需要补充信息？是否出现异常？是否应该换一种方法？是否已经达到停止条件？这一阶段决定了 Agent 能否从错误中恢复。

不过，闭环也会带来风险。最常见的问题有：

| 风险 | 表现 | 后果 |
|---|---|---|
| 无限循环 | Agent 一直搜索、一直重试、一直修改 | 成本和时间失控 |
| 错误累积 | 前一步判断错误，后续不断建立在错误基础上 | 最终结果偏离目标 |
| 工具误用 | 调错 API、传错参数、重复调用无用工具 | 产生副作用或浪费资源 |
| 过度规划 | 花大量 token 写计划，但执行很少 | 低效、延迟高 |
| 过度自主 | 未经确认执行高风险操作 | 数据损坏、权限越界、安全事故 |

因此，生产级 Agent 不能只设计“循环”，还必须设计“控制循环”。至少应包括以下机制：

1. 明确停止条件：例如任务完成、达到最大轮数、达到最大成本、连续失败次数过多、需要用户确认。
2. 明确工具权限：哪些工具可读、哪些可写、哪些操作必须人工确认。
3. 保留状态记录：记录已完成步骤、已调用工具、关键观察结果和当前假设。
4. 设置验证机制：用测试、规则、评估器或另一个模型检查结果质量。
5. 设计异常处理：工具失败、信息不足、权限不足、结果冲突时要能降级或交接。
6. 引入人工检查点：涉及付款、删除、发送、发布、审批等高风险动作时必须确认。
7. 控制上下文污染：不要把所有历史无差别塞进上下文，而要保留关键状态和证据。

一个成熟的 Agent 闭环可以这样表达：

```text
目标输入
  ↓
任务状态初始化
  ↓
短期计划生成
  ↓
选择工具或直接回答
  ↓
执行动作
  ↓
读取环境反馈
  ↓
验证当前结果
  ↓
更新状态与计划
  ↓
判断停止、继续或请求人工介入
```

在工程实现上，`Reflect` 阶段通常不应完全依赖模型的自由发挥。更稳妥的做法是把一部分判断外置为程序规则，例如最大迭代次数、工具调用预算、是否命中危险操作、输出格式是否合规；另一部分交给模型判断，例如资料是否充分、代码修改是否符合意图、回答是否覆盖用户问题。

总结来说，`Plan-Act-Observe-Reflect` 是 AI Agent 从“生成文本”走向“完成任务”的关键机制。它让 Agent 能够把复杂目标拆成多步行动，并通过环境反馈不断修正。但这个闭环本身并不自动保证可靠，真正的工程重点在于控制闭环：限制行动范围、设计停止条件、记录状态、验证结果、处理异常，并在关键节点引入人工监督。只有这样，Agent 才能从一个会调用工具的 LLM，变成一个可控、可评估、可上线的任务执行系统。

## AGENT-003：为什么说“工具调用”只是 AI Agent 的能力入口，而不是 Agent 本身？

### 问题

为什么说“工具调用”只是 AI Agent 的能力入口，而不是 Agent 本身？一个可靠的 Agent 工具调用链路应该如何设计？

## 回答大纲

本题考察的是 AI Agent 从“会回答”走向“会执行”的关键机制：模型、Agent Runtime、Tool、MCP、CLI/API/SDK 之间到底是什么关系。

核心判断是：工具调用不是 Agent 的全部。真正可靠的 Agent 不是“模型直接操作外部世界”，而是由模型生成调用意图，再由 Runtime 校验权限、调度工具、接收反馈、验证结果，并把观察结果写回任务状态。

回答思路是：先区分模型与执行系统，再解释工具调用链路，接着说明 MCP、Tool、CLI/API/SDK 的分层关系，最后给出工程设计原则和常见误区。

## 参考答案

工具调用只是 AI Agent 从“生成文本”进入“执行动作”的入口，但它本身不等于 Agent。根据本地资料 `AI/AI 核心工具体系.md` 的分层，模型负责理解任务并生成工具调用意图，真正解析意图、检查权限、调度工具、执行动作的是模型外部的 `Agent Runtime / Host`。Anthropic 也把 Agent 描述为由 LLM 动态决定过程和工具使用方式的系统，而不是单纯“接了工具”的模型；它强调 Agent 在执行中需要从工具结果、代码执行结果等环境反馈中获得 ground truth，再判断下一步 `https://www.anthropic.com/engineering/building-effective-agents`。

可以把关系拆成一条链路：

```text
用户目标
  ↓
Prompt / Skill：表达目标、规则、方法
  ↓
LLM：理解任务，生成回答或工具调用意图
  ↓
Agent Runtime / Host：解析调用意图，做权限和风险检查
  ↓
Tool：封装一个可调用动作
  ↓
MCP / 本地注册 / 业务封装：提供工具连接方式
  ↓
CLI / API / SDK / 数据库驱动：真正执行外部操作
  ↓
Observation：返回执行结果、错误、环境变化
  ↓
Agent 更新状态，继续或停止
```

这条链路里最容易被误解的是“模型会调用工具”。更准确地说，模型通常只是根据上下文生成一个结构化的工具调用请求，例如“调用 `read_file`，参数是某个路径”；是否真的执行、怎么执行、是否需要审批、执行失败后如何反馈，都是 Runtime 和工具系统的职责。OpenAI 的工具文档也采用类似语义：开发者通过 `tools` 参数给模型配置工具能力，模型会根据输入决定是否使用已配置工具，同时开发者可以通过 `tool_choice` 控制或引导这种行为 `https://platform.openai.com/docs/guides/tools`。

所以，工具调用链路至少包含五个不同层次：

| 层次 | 负责什么 | 常见例子 | 容易误解 |
|---|---|---|---|
| `Prompt` | 表达当前任务目标和约束 | “帮我修复测试失败” | 误以为 prompt 自己能执行动作 |
| `Skill` | 固化一类任务的方法和检查标准 | bug 修复流程、代码审查流程 | 误以为 skill 是单个工具 |
| `Agent Runtime / Host` | 解析模型输出、校验权限、调度工具 | IDE Agent、CLI Agent、Web Agent | 误以为模型直接操作系统 |
| `Tool` | 封装可调用动作 | `read_file`、`run_test`、`search_web` | 误以为所有 tool 都来自 MCP |
| `CLI / API / SDK` | 真正执行底层操作 | `git diff`、HTTP API、数据库 SDK | 误以为 CLI 是唯一执行方式 |

MCP 在这里的定位是“连接协议”，不是工具本身，也不是底层执行命令。本地资料 `AI/AI 核心工具体系.md` 明确区分了 MCP、Tool 和 CLI：MCP 让 AI 应用用统一方式发现和连接外部能力；Tool 是 Runtime 可调度的动作接口；CLI/API/SDK 才是很多 Tool 背后的真实执行入口。OpenAI 工具文档也把远程 MCP 服务器列为工具接入方式之一，与 function calling、web search、file search、shell、computer use 等能力并列，说明 MCP 更像一种外部能力连接方式，而不是替代所有工具实现的唯一层 `https://platform.openai.com/docs/guides/tools`。

一个可靠的 Agent 工具调用链路，不能只关注“能不能调到工具”，还要关注“调得是否正确、是否安全、是否可验证”。Anthropic 在工具设计建议中强调，工具定义需要像人机交互界面一样被认真设计，也就是为模型设计清晰的 Agent-Computer Interface：包括明确的参数、边界、示例、错误提示和防误用设计 `https://www.anthropic.com/engineering/building-effective-agents`。这与本地资料 `AI/AI Agent架构.md` 中的观点一致：执行层产生的结果必须作为 observation 返回，再交给反馈与控制层验证，而不能把“工具调用成功”直接等同于“任务完成”。

例如，用户说“帮我修复一个测试失败”。一个不可靠的工具调用链路可能是：

```text
模型猜测原因
  ↓
直接改文件
  ↓
告诉用户已经修复
```

这个过程的问题是：没有确认失败现象，没有读取相关代码，没有运行测试，也没有验证修改是否真的满足目标。它只是“使用了工具”，但还不是可靠 Agent。

更可靠的链路应该是：

```text
读取测试失败日志
  ↓
定位失败用例和相关源码
  ↓
生成最小修改方案
  ↓
Runtime 检查写文件权限和风险
  ↓
调用文件编辑工具
  ↓
运行相关测试
  ↓
读取测试结果
  ↓
如果失败，回写错误并继续修正
  ↓
如果通过，再总结修改和验证结果
```

这里的关键区别是：工具调用被放进了闭环。每一次工具执行后都要产生观察结果，每一次观察结果都要进入下一轮判断。Anthropic 对 Agent 的描述也强调，Agent 通常是在环境反馈循环中使用工具，并且需要停止条件，例如最大迭代次数，以避免成本、延迟和错误累积失控 `https://www.anthropic.com/engineering/building-effective-agents`。

工程上，一个可靠工具应该至少具备这些要素：

| 设计要素 | 作用 | 例子 |
|---|---|---|
| 清晰名称 | 让模型知道何时使用 | `read_file` 比 `handle` 更明确 |
| 明确参数 | 降低模型传错参数概率 | 要求绝对路径、枚举操作类型 |
| 权限边界 | 防止越权或高风险动作 | 读操作默认允许，删除/发布需确认 |
| 结构化返回 | 方便模型继续推理 | 返回 `success`、`error`、`data`、`warnings` |
| 错误可恢复 | 让 Agent 知道下一步怎么补救 | 区分“文件不存在”“权限不足”“参数非法” |
| 可验证结果 | 不把执行成功误认为任务成功 | 写文件后跑测试，发请求后检查响应 |
| 观察回写 | 让下一轮决策基于真实反馈 | 把命令输出、错误日志写回上下文或状态 |

尤其要注意“工具调用成功”和“业务目标达成”不是一回事。文件写入成功，只能说明写入动作完成，不能证明代码正确；API 返回 200，只能说明请求被处理，不能证明业务状态符合预期；搜索工具返回结果，只能说明检索完成，不能证明资料充分可靠。这一点在本地 `AI/AI Agent架构.md` 中也被强调：执行结果必须经过测试、静态检查、规则校验、Eval 或人工验收，才能作为任务推进依据。

常见误区可以归纳为四类：

| 误区 | 为什么错 | 更准确的理解 |
|---|---|---|
| “接了工具就是 Agent” | 工具只是执行能力，没有规划、反馈和控制仍然只是增强型 LLM | Agent 要能围绕目标动态决策并闭环推进 |
| “模型直接调用工具” | 模型通常生成调用意图，执行由 Runtime 完成 | Runtime 承担解析、权限、调度和反馈职责 |
| “MCP 等于 Tool” | MCP 是连接协议，Tool 是可调用动作 | MCP Server 可以暴露 Tools，但 Tool 不一定来自 MCP |
| “命令成功就是任务完成” | 底层动作成功不代表业务目标满足 | 需要执行后验证和状态回写 |

因此，判断一个 Agent 工具系统是否成熟，不是看它注册了多少工具，而是看它是否形成了可控链路：模型是否知道何时用工具，Runtime 是否能约束工具调用，工具定义是否清晰，执行结果是否可观察，结果是否经过验证，失败是否能恢复，高风险动作是否需要人工确认。

总结来说，工具调用让 AI Agent 拥有“手和脚”，但 Agent 的可靠性来自完整的工程外壳。模型负责判断，Runtime 负责调度，Tool 负责封装动作，MCP 负责标准化连接，CLI/API/SDK 负责真实执行，反馈与控制层负责验证结果。只有这些层次组合起来，工具调用才会从一次孤立动作，变成一个可控、可恢复、可验证的 Agent 执行闭环。

## AGENT-004：MCP、Tool、Function Calling、CLI/API/SDK 分别处在 AI Agent 工具体系的哪一层？

### 问题

MCP、Tool、Function Calling、CLI/API/SDK 分别处在 AI Agent 工具体系的哪一层？它们之间是什么关系，为什么不能混为一谈？

## 回答大纲

本题考察的是 AI Agent 工具体系的分层理解。上一题已经说明“工具调用不是 Agent 本身”，这一题继续向下拆：一个工具能力从模型意图到真实执行，中间到底经过哪些层。

核心判断是：`MCP` 是连接协议，`Tool` 是 Agent Runtime 可调度的动作接口，`Function Calling` 是一种让模型输出结构化调用意图的机制，`CLI/API/SDK` 是很多工具背后的真实执行入口。它们协作完成一次行动，但不是同一个概念。

回答思路是：先给出整体链路，再逐个定义四个概念，接着用表格区分边界，最后说明工程设计中如何选型和避免误解。

## 参考答案

MCP、Tool、Function Calling、CLI/API/SDK 都和“让模型使用外部能力”有关，但它们处在不同层级。根据本地资料 `AI/AI 核心工具体系.md` 的分层，AI Agent 的完整执行链路大致是：模型生成调用意图，Agent Runtime 解析和校验，Tool 封装动作，MCP 或本地注册机制提供连接，最后由 CLI/API/SDK 执行真实操作。OpenAI 的工具文档也把 function calling、remote MCP、web search、file search、shell、computer use 等都放在“tools”能力体系下，说明它们是不同类型或不同接入方式的外部能力，而不是同一个东西 `https://platform.openai.com/docs/guides/tools`。

可以先用一条链路定位它们：

```text
用户目标
  ↓
LLM：理解任务，决定是否需要外部能力
  ↓
Function Calling / Tool Call：生成结构化调用意图
  ↓
Agent Runtime / Host：解析调用、检查权限、选择工具
  ↓
Tool：封装一个可调用动作
  ↓
MCP / 本地注册 / 业务注册：让 Host 发现和接入工具
  ↓
CLI / API / SDK / 数据库驱动：真实执行
  ↓
Observation：返回结果、错误、状态变化
```

在这条链路里，`Function Calling` 更偏“模型输出格式和调用机制”。它解决的是：模型不要只用自然语言说“我想查天气”，而是输出一个结构化调用，例如 `get_weather({ "location": "Paris" })`。OpenAI 文档中的 function calling 示例就是把函数名称、描述和参数 schema 提供给模型，模型在需要时生成对应的结构化函数调用请求 `https://platform.openai.com/docs/guides/tools`。所以 Function Calling 本身不是业务能力，它是一种把模型意图变成可解析调用的接口机制。

`Tool` 更偏“Agent 可以调度的动作能力”。本地资料 `AI/AI 核心工具体系.md` 把 Tool 定义为 Agent Runtime 可以代表模型调度的动作接口，例如 `read_file`、`write_file`、`run_shell`、`query_database`、`open_browser`。一个 Tool 通常有工具名称、参数 schema、权限限制、执行逻辑和返回结果。Function Calling 可以用来表达“调用某个 Tool 的意图”，但 Tool 还包含真实执行逻辑、权限约束和返回结构。

`MCP` 更偏“连接协议”。Anthropic 发布 MCP 时将其定义为连接 AI assistant 与数据所在系统的新标准，目标是用一个通用开放协议替代碎片化集成，让 AI 系统可以连接内容仓库、业务工具和开发环境等数据源 `https://www.anthropic.com/news/model-context-protocol`。这和本地资料中的说法一致：MCP 解决的是“AI 应用如何发现、读取和调用外部能力”的问题，它把外部系统封装成 MCP Server，让 MCP Host / Client 按统一协议接入。

`CLI/API/SDK` 则更偏“底层执行入口”。例如一个 `git_status()` Tool，表面上对 Agent 暴露的是结构化工具，但底层可能执行 `git status`；一个 `query_issue()` Tool，底层可能调用 GitHub API；一个 `copy_file()` Tool，底层可能用 Node.js `fs`、Python `shutil`，也可能调用系统命令。OpenAI 文档里也区分了 function tools、remote MCP、shell 等不同工具形态，并说明在 Agents SDK 中，工具语义保持一致，但接线方式会进入 agent 定义和 workflow 设计，而不是单次 API 请求 `https://platform.openai.com/docs/guides/tools`。

四者可以这样区分：

| 概念 | 所在层级 | 核心作用 | 典型形态 | 容易误解 |
|---|---|---|---|---|
| `Function Calling` | 模型调用表达层 | 让模型输出结构化调用意图 | 函数名 + JSON 参数 schema | 误以为它就是工具本身 |
| `Tool` | 能力封装层 | 封装 Agent 可调度动作 | `read_file(path)`、`run_test(scope)` | 误以为所有 Tool 都来自 MCP |
| `MCP` | 连接协议层 | 标准化连接外部系统和能力 | MCP Host、Client、Server | 误以为 MCP 是 CLI 或业务 API |
| `CLI/API/SDK` | 执行层 | 真正操作外部系统 | `git`、HTTP API、数据库 SDK | 误以为 Agent 直接调用底层命令 |

这几个概念之间不是互斥关系，而是经常组合出现。比如一个 AI 编程 Agent 想查询 GitHub issue，可能是：模型通过 function calling 生成 `get_issue({ "id": 123 })` 的调用意图；Runtime 发现这个能力来自 GitHub MCP Server；MCP Server 暴露了一个 Tool；这个 Tool 底层再调用 GitHub API；API 返回结果后，Tool 把结构化 observation 交回 Runtime，再进入下一轮模型决策。Anthropic 对 MCP 的说明也强调，开发者可以通过 MCP servers 暴露数据，或者构建 MCP clients 连接这些 servers，这是一种“连接 AI 工具和数据源”的架构，而不是替代所有底层系统 `https://www.anthropic.com/news/model-context-protocol`。

用一个具体例子看更清楚：

```text
用户：帮我看看当前分支有没有未提交变更

LLM：
  需要查询 Git 状态

Function Calling / Tool Call：
  git_status({ "repo": "current" })

Agent Runtime：
  检查该工具是否可用，当前任务是否允许读取 Git 状态

Tool：
  git_status

底层执行：
  可能调用 CLI：git status --short
  也可能调用 Git library / SDK

Observation：
  返回 changed files、untracked files、error 等结构化结果

LLM：
  基于 observation 总结给用户
```

这里 `git_status` 是 Tool，`git status --short` 是 CLI，模型输出结构化调用是 Function Calling，若这个 Git 能力由某个 MCP Server 暴露，则 MCP 是连接协议。它们共同完成了一次行动，但职责完全不同。

再看一个数据库例子：

```text
用户：查一下昨天新增用户数

Function Calling：
  query_database({ "sql": "..." })

Tool：
  query_database

MCP：
  如果数据库通过 MCP Server 暴露，则 Host 通过 MCP 连接这个工具

底层执行：
  PostgreSQL driver / SQL API

Observation：
  rows、columns、execution_time、error
```

如果把这些概念混在一起，工程设计会出现很多问题。比如把 MCP 当成 Tool，会导致你只关注“接入协议”，却忽略工具本身的参数设计、权限控制和错误返回。把 Tool 当成 CLI，会导致你直接让模型拼 shell 命令，增加注入、误删、路径错误等风险。把 Function Calling 当成真实执行，会忽略 Runtime 的权限校验、审批、日志和回滚。

一个专业的 Agent 工具设计，应该按层拆开思考：

1. 先问“模型应该看到什么能力”：这决定 Tool 的名称、描述和参数 schema。
2. 再问“这个能力从哪里接入”：本地内置、MCP Server、业务服务还是第三方平台。
3. 再问“底层怎么执行”：CLI、HTTP API、SDK、数据库驱动还是浏览器自动化。
4. 再问“执行前后如何控制”：权限、审批、sandbox、参数校验、结果验证、错误恢复。
5. 最后问“结果如何回写”：返回结构化 observation，而不是只返回一段不可解析文本。

这也是为什么本地资料 `AI/AI Agent架构.md` 会把 Agent 拆成模型层、上下文层、执行层、编排层、反馈与控制层。Function Calling 和 Tool 主要连接模型层与执行层；MCP 主要帮助执行层标准化接入外部系统；CLI/API/SDK 则负责真实动作；反馈与控制层负责判断动作是否安全、是否成功、是否满足业务目标。缺少这个分层，Agent 很容易变成“模型随意调用一堆接口”，而不是可控的软件系统。

在选型上，可以用下面的判断：

| 场景 | 更适合的方式 | 原因 |
|---|---|---|
| 只需要调用你自己代码里的一个函数 | Function Tool / 本地 Tool | 简单、低延迟、可直接控制逻辑 |
| 需要接入多个外部系统并复用连接方式 | MCP | 标准化连接，减少重复适配 |
| 需要执行本地开发命令 | Tool 封装 CLI | 保留命令能力，同时增加参数校验和权限控制 |
| 需要访问业务平台能力 | Tool 封装 API / SDK | 比直接拼命令更稳定、可审计 |
| 需要让模型动态决定用哪个能力 | Tool schema + Runtime 调度 | 让模型只负责决策，执行交给系统控制 |

总结来说，`Function Calling` 是模型表达调用意图的方式，`Tool` 是 Agent Runtime 可调度的动作封装，`MCP` 是连接外部能力的标准协议，`CLI/API/SDK` 是底层真实执行入口。它们不是四个互相替代的名词，而是一条执行链路上的不同环节。理解这层关系后，设计 Agent 时就不会停留在“给模型接工具”，而会进一步考虑工具发现、参数设计、权限控制、执行隔离、结果验证和错误恢复。

## AGENT-005：什么是 Agent Runtime / Host？它为什么是模型和真实工具之间最关键的安全边界？

### 问题

什么是 Agent Runtime / Host？它为什么是模型和真实工具之间最关键的安全边界？

## 回答大纲

本题考察的是 AI Agent 的“执行控制层”：模型生成工具调用意图之后，为什么不能直接让它操作文件、命令、API、浏览器或业务系统。

核心判断是：`Agent Runtime / Host` 是模型和真实世界之间的执行代理与安全闸门。模型负责理解目标、推理和生成调用意图；Runtime 负责解析意图、检查权限、选择工具、执行动作、记录过程、返回 observation，并在必要时拒绝、降级或请求人工确认。

回答思路是：先定义 Runtime / Host，再解释它在完整工具链路中的位置，然后拆解它的核心职责，最后说明如果缺少 Runtime，会出现哪些工程风险。

## 参考答案

`Agent Runtime / Host` 可以理解为 AI Agent 的“执行操作系统”。它不是大模型本身，也不是某一个 Tool，而是位于模型和真实工具之间的控制程序：它接收模型输出的工具调用意图，判断这个调用是否合法、是否安全、是否需要审批，然后再调度具体 Tool、MCP Server、CLI、API 或 SDK 去执行。OpenAI 的工具文档也说明，模型可以基于输入决定是否使用配置好的工具，开发者还可以通过 `tool_choice` 控制或引导这种行为；在 Agents SDK 中，工具语义保持一致，但工具接线进入 agent 定义和 workflow 设计，而不是模型自己直接执行底层动作 `https://platform.openai.com/docs/guides/tools`。

本地资料 `AI/AI 核心工具体系.md` 对这个链路说得很清楚：大语言模型本身不直接读文件、写文件、查数据库、打开浏览器或运行命令；模型接收上下文后生成自然语言回答或结构化工具调用意图，真正解析模型输出并调度工具的是外部的 `Agent Runtime / Host`。因此，更准确的链路是：

```text
用户入口：Web / IDE / CLI / TUI
  ↓
Prompt + Skill：表达目标、流程、约束
  ↓
LLM：推理，生成回答或工具调用意图
  ↓
Agent Runtime / Host：解析工具调用、校验权限、调度执行
  ↓
MCP / 本地工具注册：提供工具和上下文连接
  ↓
Tools：封装可执行动作
  ↓
CLI / API / SDK：完成真实系统操作
```

这意味着，Runtime / Host 的第一层价值是“把模型意图变成受控动作”。模型可以说“我想调用 `delete_file` 删除某个文件”，但 Runtime 必须判断这个工具是否存在、参数是否合规、路径是否在允许范围内、当前用户是否授权、是否属于高风险操作、是否需要人工确认。没有这一层，模型的工具调用就会从“建议动作”变成“直接操作真实世界”，风险会急剧上升。

可以把 Runtime / Host 的职责拆成七类：

| 职责 | 它要解决什么问题 | 例子 |
|---|---|---|
| 解析调用 | 把模型输出转成可执行请求 | 解析 `run_test({ "scope": "unit" })` |
| 工具路由 | 决定调用哪个工具或服务 | 本地 Tool、MCP Tool、业务 API |
| 参数校验 | 防止模型传错参数 | 路径必须是绝对路径，枚举值必须合法 |
| 权限控制 | 防止越权执行 | 只允许读文件，不允许删除或发布 |
| 风险审批 | 处理高风险动作 | 删除、付款、发消息、上线发布需确认 |
| 执行记录 | 保留可追踪日志 | 记录调用时间、参数、结果、错误 |
| 结果回写 | 把执行结果变成 observation | 将测试失败日志写回上下文供模型修正 |

这也是为什么 Runtime / Host 是“安全边界”，而不只是“工具转发器”。如果 Runtime 只负责把模型输出原样转发给工具，那么它只是一个危险的管道；如果 Runtime 能做权限、参数、审批、sandbox、日志和验证，它才是可托付 Agent 的控制层。Anthropic 在 Agent 实践中也强调，Agent 执行时必须从环境获得 ground truth，例如工具调用结果或代码执行结果，并且常见做法是加入停止条件、人工检查点、沙箱测试和 guardrails 来维持控制 `https://www.anthropic.com/engineering/building-effective-agents`。

在本地资料 `AI/AI Agent架构.md` 中，Runtime / Host 可以对应到“执行层 + 反馈与控制层 + 编排层”的交界处。模型负责提出“下一步做什么”，但不应该自行绕过权限边界改变外部环境；反馈与控制层先检查候选动作的权限、参数和风险，低风险动作可以放行，高风险动作需要拒绝、降级或请求人工审批；执行层调用工具后，结果要作为 observation 返回，而不能直接被视为任务成功。

一个典型的 Runtime / Host 执行过程可以写成：

```text
1. 接收模型输出
   模型生成工具调用意图，例如 read_file(path)

2. 解析工具调用
   Runtime 检查工具名称、参数结构、调用格式

3. 做权限与风险判断
   判断是否可读、是否可写、是否越界、是否需要人工确认

4. 路由到具体工具
   选择本地 Tool、MCP Tool、CLI 封装或业务 API

5. 执行动作
   调用文件系统、数据库、浏览器、shell、HTTP API 等

6. 收集结果
   拿到 stdout、stderr、返回值、状态码、异常、环境变化

7. 转成 observation
   结构化返回给模型和任务状态

8. 触发下一轮
   模型基于 observation 决定继续、修正、停止或请求帮助
```

关键点在于，Runtime / Host 管的不是“模型会不会聪明”，而是“模型的聪明能不能安全落地”。模型可能判断“需要运行测试”，但 Runtime 决定能否运行、用哪个命令运行、在哪个目录运行、是否允许访问网络、超时时间是多少、输出如何截断、失败后如何返回。模型可能判断“需要改文件”，但 Runtime 决定是否允许写入、写入哪个路径、是否需要 diff、是否要备份、是否要验证。

如果缺少 Runtime / Host，Agent 会出现几类严重问题：

| 问题 | 表现 | 后果 |
|---|---|---|
| 权限失控 | 模型可以直接删文件、发请求、改数据 | 数据损坏、越权操作、安全事故 |
| 参数失控 | 模型拼错路径、SQL、命令参数 | 误操作、执行失败、注入风险 |
| 状态失控 | 工具结果没有统一记录 | Agent 不知道做过什么，容易重复或跑偏 |
| 验证失控 | 执行成功被误认为任务完成 | 文件写入成功，但代码实际不正确 |
| 成本失控 | 无限调用工具或反复重试 | 延迟、费用和资源占用失控 |
| 审计缺失 | 没有调用日志和决策轨迹 | 出错后无法复盘和追责 |

例如，用户要求“帮我清理项目里的无用文件”。如果没有 Runtime，模型可能直接根据文件名猜测并删除文件；如果有 Runtime，流程应该变成：先列出候选文件，再检查是否被引用，再展示 diff 或待删除清单，再要求用户确认，最后执行删除，并运行测试验证。这里真正保护系统的不是模型的自觉，而是 Runtime 规定“删除是高风险动作，必须经过确认”。

在 coding agent 场景中，Runtime / Host 的价值尤其明显。Anthropic 提到，coding agents 之所以适合 Agent 模式，是因为代码结果可以通过自动化测试验证，Agent 可以使用测试结果迭代修正；但人类审查仍然重要，因为自动测试只能验证一部分功能，不能覆盖更广的系统意图 `https://www.anthropic.com/engineering/building-effective-agents`。这说明 Runtime 不仅要能执行测试，还要把测试结果、失败原因和人工检查点纳入任务闭环。

Runtime / Host 还承担“工具接口治理”的职责。Anthropic 在工具设计建议中强调，工具定义和规格需要像 prompt 一样被认真设计，好的工具定义应包含示例、边界、输入格式要求和错误提示；他们还提出要像设计人机界面一样设计 agent-computer interface，并通过测试观察模型如何使用工具 `https://www.anthropic.com/engineering/building-effective-agents`。这实际上就是 Runtime / Host 生态的一部分：工具不是随便暴露给模型，而是要以模型可理解、可约束、可恢复的方式暴露。

可以用“交通系统”来类比：

| 类比对象 | Agent 系统中对应什么 |
|---|---|
| 驾驶意图 | 模型生成的工具调用意图 |
| 交通规则 | Runtime 的权限、参数、审批规则 |
| 道路和闸口 | Tool、MCP、API、CLI 的可用边界 |
| 交警和红绿灯 | Runtime 的风险控制和人工确认 |
| 行车记录仪 | Runtime 的日志和审计 |
| 事故反馈 | observation、错误返回、测试失败日志 |

没有 Runtime，模型就像一个只会给方向盘打指令的人；有 Runtime，系统才知道哪些路能走、哪些动作要停车确认、出了问题怎么记录和恢复。

工程上设计 Runtime / Host 时，至少要考虑这些能力：

| 设计维度 | 推荐做法 |
|---|---|
| 工具注册 | 所有工具必须有名称、描述、参数 schema、权限级别和返回格式 |
| 权限模型 | 区分只读、写入、外发、删除、发布、付款等风险等级 |
| 执行隔离 | Shell、浏览器、文件系统、网络访问应有 sandbox 或范围限制 |
| 人工确认 | 对不可逆、高成本、高权限动作设置确认点 |
| 调用预算 | 限制最大轮数、最大工具调用次数、最大运行时间 |
| 结果结构化 | 返回 `success`、`data`、`error`、`warnings`、`next_hint` 等可解析字段 |
| 日志审计 | 记录模型请求、工具参数、执行结果、失败原因和人工确认 |
| 失败恢复 | 工具失败时返回可操作错误，而不是只给一段模糊报错 |
| 输出验证 | 用测试、静态检查、规则校验或人工验收确认任务是否真正完成 |

这里还要区分一个容易混淆的点：Runtime / Host 不是 MCP Host 的完全同义词。MCP 语境里的 Host 通常指正在使用 MCP 的 AI 应用，比如 Claude Desktop、IDE 或其他客户端应用；而 Agent Runtime / Host 更泛化，指整个 Agent 系统里负责承载模型、工具、上下文、权限、执行和反馈的运行外壳。二者经常重叠，但讨论范围不同：MCP Host 更强调协议连接角色，Agent Runtime / Host 更强调执行控制和系统治理。

判断一个 Runtime 是否成熟，可以看它是否回答得了这些问题：

1. 模型能调用哪些工具，不能调用哪些工具？
2. 每个工具的参数是否能被校验？
3. 哪些动作需要人工确认？
4. 工具执行失败时，错误如何返回给模型？
5. 工具调用是否有日志和审计记录？
6. 是否有最大迭代次数、超时和成本限制？
7. 是否能区分“调用成功”和“目标完成”？
8. 是否能把 observation 回写到状态中，驱动下一轮修正？
9. 是否能在权限不足、资料冲突、环境异常时安全降级？

如果这些问题答不上来，那么这个系统即使接了很多工具，也只是一个“会操作外部系统的聊天模型”，还不能算可靠的工程化 Agent。

### 专业回答总结：

`Agent Runtime / Host` 是 AI Agent 中连接模型和真实工具的执行控制层。模型负责理解目标并生成工具调用意图，但不应该直接操作文件、命令、API、数据库或浏览器；Runtime 负责解析意图、校验参数、控制权限、调度工具、记录日志、收集结果，并把 observation 写回上下文和任务状态。

它之所以是最关键的安全边界，是因为 Agent 的风险主要发生在“模型意图变成真实动作”的瞬间。没有 Runtime，工具调用会变成不可控的外部操作；有了 Runtime，系统才能把模型决策纳入权限、审批、sandbox、预算、日志、验证和人工接管机制中。

因此，工程化 Agent 的可靠性不只取决于模型能力，也取决于 Runtime / Host 是否足够成熟。一个可托付的 Agent，必须让模型负责判断，让 Runtime 负责控制，让 Tool 负责封装动作，让 CLI/API/SDK 负责真实执行，让反馈与验证机制负责判断任务是否真正完成。

## AGENT-006：在 AI 工程中，什么是 `Workflow`，什么是 `Agent`？为什么生产系统通常应以确定性 `Workflow` 承载业务主流程，只把 `Agent` 放在需要动态决策的局部？

### 问题

在 AI 工程中，什么是 `Workflow`，什么是 `Agent`？为什么生产系统通常应以确定性 `Workflow` 承载业务主流程，只把 `Agent` 放在需要动态决策的局部？

## 回答大纲

- **本题考察什么**：理解 AI 工程编排的基本边界，以及 LangChain、LangGraph、Deep Agents 的选型前提。
- **核心判断**：`Workflow` 负责预先定义的业务流程与治理边界；`Agent` 负责根据上下文和工具反馈动态决定下一步。二者不是替代关系。
- **回答思路**：先定义并对比二者，再解释“确定性外壳 + 受限 Agent 内核”的工程理由，最后映射到 LangChain、LangGraph 和 Deep Agents。

## 参考答案

### 1. 先给结论

`Workflow` 与 `Agent` 的核心区别不在于是否调用 LLM 或工具，而在于**谁决定执行路径**：

| 对比维度 | Workflow | Agent |
| --- | --- | --- |
| 执行路径 | 开发者预先定义 | 模型基于状态和观察动态决定 |
| 控制逻辑 | 代码、规则、状态机、路由条件 | 模型推理 + 工具调用 + 反馈循环 |
| 适合任务 | 稳定、合规、步骤明确 | 开放、信息不完整、路径不可预先穷举 |
| 主要风险 | 流程遗漏、规则写错 | 幻觉、错误决策、循环、成本与权限失控 |
| 主要治理手段 | 显式状态、条件分支、审批、幂等、重试 | 工具边界、预算、观察验证、停止条件、人工接管 |

LangGraph 官方文档对这一区分很直接：**Workflow 有预定代码路径并按既定顺序运行；Agent 是动态的，会自行决定过程和工具使用方式。**见 [LangGraph Workflows and Agents](https://docs.langchain.com/oss/python/langgraph/workflows-agents)。

因此，生产 AI 系统的常见合理结构不是“所有步骤都交给 Agent”，而是：

```text
确定性业务流程（Workflow）
  ├── 身份、权限、输入校验
  ├── 固定业务阶段与审批门禁
  ├── 数据写入、发布、付款等高风险动作
  ├── 状态持久化、超时、重试、审计
  └── 在需要判断、探索、规划的位置
          ↓
       受限 Agent
          ├── 可调用的 Tool 白名单
          ├── 最大步数 / 时间 / 成本预算
          ├── 外部结果验证
          └── 无法确认时升级人工处理
```

这是一条工程推论，而非任何框架的强制架构：**把确定性的责任交给代码，把不确定性的探索交给 Agent。**

### 2. 什么是 Workflow

`Workflow` 是由应用明确规定状态、步骤和迁移条件的执行过程。它可以包含模型调用，但模型通常不拥有整个流程的最终控制权。

例如，“处理用户退款申请”的可靠流程往往是：

```text
接收申请
  ↓
校验用户身份与订单归属
  ↓
查询退款资格
  ↓
需要分析异常原因？
  ├── 否：按规则进入审批或退款
  └── 是：调用 Agent 归纳对话、订单和物流证据
                ↓
           输出结构化建议
  ↓
根据业务规则与审批结果执行退款
  ↓
记录审计日志并通知用户
```

这里的“校验资格”“执行退款”“记录审计”不能由模型自由决定，因为它们有明确的业务规则、权限要求与不可逆后果。Agent 可以参与证据整理和异常解释，但不应绕过状态机直接退款。

在 LangGraph 中，`State`、`Node` 与 `Edge` 正是这种显式编排的基本单元：

- `State`：保存任务数据、阶段结果、重试次数和审批结果。
- `Node`：执行确定性代码、调用模型、调用工具或等待人工输入。
- `Edge`：定义顺序、分支、循环与汇合。
- `Checkpoint` / `Interrupt`：让长任务能够持久化、暂停、恢复并接受人工干预。

LangGraph 官方将自身定位为面向长时间、有状态 Agent 的低层编排框架和 Runtime，重点能力包括持久化、流式执行、人工介入与恢复；它不规定你的 Prompt 或业务架构。见 [LangGraph Overview](https://docs.langchain.com/oss/python/langgraph/overview)。

### 3. 什么是 Agent

`Agent` 是模型在目标、上下文、工具定义和环境反馈的约束下，动态决定下一步行动的系统。

它的典型循环是：

```text
目标 / 当前状态
  ↓
模型判断下一步
  ↓
调用 Tool 或生成结果
  ↓
获得环境 Observation
  ↓
检查是否达成目标、失败或需要调整
  ↓
继续、停止或请求人工接管
```

例如，“定位一个代码缺陷的根因”很难完全写成固定路径：

- 有时先读错误日志；
- 有时先找相关代码；
- 有时需要搜索历史变更；
- 有时需要运行测试验证猜测；
- 有时测试失败后还需要重新诊断。

这类任务的步骤集合可以预先设计，但**具体走哪条路径、何时停止探索、何时更换假设**，需要根据实时观察动态决定，因此适合 Agent。

不过，Agent 的动态性不等于可以无边界自主行动。模型的工具调用只是一种意图；真正执行前，Runtime 仍应完成权限检查、参数校验、风险分类与结果回写。你已学习的 `Agent Runtime / Host` 正是这条边界的执行控制层。

### 4. 为什么不能把所有业务都做成 Agent

把全部流程交给 Agent，表面上减少了编排代码，实际会放大四类问题。

| 问题 | 纯 Agent 的风险 | Workflow 提供的约束 |
| --- | --- | --- |
| 可预测性 | 同一请求可能多次走不同路径 | 固定关键阶段和明确路由 |
| 安全与合规 | 模型可能选择不应执行的工具或顺序 | 权限、审批、白名单、不可逆操作门禁 |
| 可测试性 | 很难断言模型每次的完整执行轨迹 | 可对节点、分支和状态迁移分别测试 |
| 成本与时延 | 重复搜索、无效循环、过度调用工具 | 超时、重试上限、预算和停止条件 |
| 可观测性 | 很难区分模型推理问题与业务流程问题 | 每个状态迁移和节点都有审计语义 |

一个常见误区是：既然 Agent 能够调用工具、规划任务，就应该让它端到端处理业务。这个判断忽略了两件事：

1. **业务流程中的大部分约束不是智能问题，而是责任问题。**例如支付、发布、删除、权限变更、合规审批，正确做法通常不是“让模型更聪明”，而是让代码保证它不能越界。
2. **Agent 的优势来自处理不确定性，不来自替代确定性。**如果某一步的输入、规则、输出和失败恢复方式都明确，普通代码或 Workflow 通常更便宜、更稳定、更容易审计。

因此，是否采用 Agent 的判断标准应是：

```text
执行路径是否必须依赖运行时新信息而动态变化？
  ├── 否：优先使用普通代码 / Workflow
  └── 是：引入受限 Agent，并给它明确目标、工具边界和验证机制
```

### 5. “Workflow 外壳 + Agent 内核”如何落地

以“研发缺陷修复助手”为例，推荐将系统切成两层。

```text
外层 Workflow：定义不可绕过的工程阶段
  1. 接收缺陷单并校验权限
  2. 获取仓库、分支、测试命令和验收标准
  3. 调用诊断 Agent
  4. 检查 Agent 的结构化诊断结果
  5. 需要修改时创建隔离工作区
  6. 调用实现 Agent
  7. 强制运行测试、静态检查与安全扫描
  8. 需要人工审批则中断
  9. 生成报告或创建 PR

内层 Agent：处理开放性探索
  - 搜索相关代码和文档
  - 形成或修正故障假设
  - 选择只读工具收集证据
  - 在授权范围内修改文件
  - 根据测试输出迭代
```

这不是把 Agent “降级”为简单函数，而是给它更清晰的工作合同：

| Agent 必须知道 | Workflow 必须保证 |
| --- | --- |
| 当前目标和验收标准 | 哪些阶段允许进入 |
| 可用工具及参数语义 | 哪些工具和路径有权限 |
| 上一步的真实 Observation | 最大重试、时间和成本预算 |
| 何时产出结构化结果 | 高风险动作的人审门禁 |
| 失败时如何说明证据不足 | 结果写入状态、日志和审计系统 |

这种结构的关键收益是：外层 Workflow 让系统**可治理**，内层 Agent 让系统在开放任务中仍有**适应性**。

### 6. 这与 LangChain、LangGraph、Deep Agents 的关系

这三个项目不是简单的“初级、中级、高级”替代品，而是处在不同控制层次的开发入口。

| 工具 | 更适合解决什么 | 与本题的关系 |
| --- | --- | --- |
| LangChain | 快速组合模型、工具、Prompt、Middleware 与常见 Agent Loop | 适合构造受限的标准 Agent |
| LangGraph | 显式定义 State、Node、Edge、持久化、分支、循环与人工中断 | 适合实现外层 Workflow 或精细控制 Agent 执行 |
| Deep Agents | 提供规划、文件系统、上下文压缩、子 Agent 等预装能力 | 适合复杂、长时、开放任务中的 Agent 内核 |

当前 LangChain 官方文档指出：

- LangChain 的 `create_agent` 提供由模型、工具、Prompt 和 Middleware 组成的可配置 Agent Harness，并构建在 LangGraph 之上。见 [LangChain Overview](https://docs.langchain.com/oss/python/langchain/overview)。
- LangGraph 用于需要混合确定性与 Agentic Workflow 的低层编排。
- Deep Agents 在 LangGraph 之上增加规划、子 Agent、文件系统与上下文管理等复杂任务能力。见 [Deep Agents Overview](https://docs.langchain.com/oss/python/deepagents/overview)。

对应到选型：

```text
任务路径固定，只需要抽取、分类、转换
  → 普通代码或 Workflow

模型需要在少量工具间动态选择
  → LangChain create_agent

业务有多阶段、审批、恢复、并行或显式状态机
  → LangGraph

任务长、开放、需规划、文件中间产物、上下文治理或子任务委派
  → Deep Agents
  → 但仍应被业务 Workflow 的权限和验收边界包住
```

本地资料 `AI/LangChain-LangGraph-Deep-Agents从零学习教程/核心教程.md` 与 `AI/AI Agent架构学习教程/04-从LangChain到Deep-Agents.md` 在这一点上与当前官方文档一致：LangChain 负责高层 Agent 组件与入口，LangGraph 负责有状态编排和运行时能力，Deep Agents 则提供面向复杂任务的预装 Harness。未发现需要修正的明显冲突。

### 7. 常见误区

| 误区 | 正确理解 |
| --- | --- |
| Workflow 就是不使用 LLM | Workflow 可以调用模型；区别在于关键路径是否由代码预定义 |
| Agent 就是会调用工具的 LLM | 工具调用只是行动入口；Agent 还需要状态、反馈、控制和停止条件 |
| LangGraph 只能做固定流程 | LangGraph 既可编排确定性 Workflow，也可承载 Agent Loop |
| Deep Agents 能取代业务流程设计 | 它提供通用复杂任务能力，不能替代领域权限、审批、验收和 SLA |
| Agent 越自主越先进 | 自主性应与任务风险匹配；高风险任务往往需要更强的确定性约束 |
| 工具调用成功就代表任务完成 | 工具成功仅是 Observation；是否完成仍需测试、规则校验或人工验收 |

### 专业回答总结：

`Workflow` 是开发者预先定义的业务执行路径，擅长承载权限、状态机、审批、审计、重试和不可逆操作；`Agent` 是模型依据上下文、工具与环境反馈动态决定下一步的执行单元，擅长处理探索、判断、规划和信息不完整的开放任务。

生产级 AI 工程不应在二者中二选一，而应采用“确定性 Workflow 外壳 + 受限 Agent 内核”：让 Workflow 控制业务阶段、权限边界、预算、验证和人工接管，让 Agent 在被授权的局部完成动态探索与决策。LangChain 适合快速构造标准 Agent，LangGraph 适合显式编排复杂有状态流程，Deep Agents 适合复杂长任务的 Agent Harness；选型的根本标准始终是任务需要多少动态决策，以及哪些责任必须由确定性系统承担。

## AGENT-007：如何用 LangChain 的 `createAgent` 构建一个最小但受控的 Tool-Calling Agent？它内部如何完成“模型—工具—观察—再决策”循环，何时又应把它嵌入 LangGraph Workflow？

### 问题

如何用 LangChain 的 `createAgent` 构建一个最小但受控的 Tool-Calling Agent？它内部如何完成“模型—工具—观察—再决策”循环，何时又应把它嵌入 LangGraph Workflow？

## 回答大纲

- **本题考察什么**：把 Agent、Tool、Runtime、Workflow 的抽象落到 LangChain TypeScript API。
- **核心判断**：`createAgent` 创建的是包含模型、Prompt、Tool、Middleware 的 Agent Harness，而不是一次模型调用；它持续执行“模型选择工具 → 工具返回 Observation → 模型再决策”，直至模型不再请求工具。
- **回答思路**：先实现最小只读 Agent，再对照手写循环理解运行原理，最后说明 Middleware 和 LangGraph 的职责边界。

## 参考答案

### 1. `createAgent` 创建的不是“聊天函数”

LangChain 官方把 Agent 定义为：**模型在循环中调用工具，直到任务完成**。`createAgent` 将这一循环及其运行环境封装成一个可调用对象。

```text
createAgent(...)
  │
  ├── Model：理解当前消息，决定回答或发起 Tool Call
  ├── System Prompt：定义目标、事实来源、禁止行为与完成标准
  ├── Tools：给模型展示可执行动作的名称、描述、输入 Schema
  ├── Middleware：插入重试、限制、日志、审批、脱敏等控制
  └── LangGraph Runtime：维护 State，调度 model <-> tools 循环
```

| 工程概念 | TypeScript 中的实现 |
| --- | --- |
| 模型决策 | `model` |
| 工具调用意图 | `AIMessage.tool_calls` |
| 工具定义 | `tool(handler, { name, description, schema })` |
| Observation | `ToolMessage`，即工具执行结果 |
| Agent Loop | `createAgent()` 内部的 `model -> tools -> model` |
| 安全与治理 | Tool 实现、Middleware、宿主 Runtime、业务 API |
| 复杂业务编排 | 在 LangGraph `StateGraph` 中组合 Agent 节点 |

LangChain 的 TypeScript 文档说明：Agent Harness 包含模型循环周围的 Prompt、Tools 和 Middleware；当前 Agent 构建在 LangGraph Runtime 之上，因此能够复用持久化、流式输出与人工介入能力。见 [LangChain Agents](https://docs.langchain.com/oss/javascript/langchain/agents)。

### 2. 最小可用的 TypeScript Agent

下面实现一个只读的订单查询 Agent。它只有一个能力：根据订单号查询状态，避免一开始暴露任何会造成副作用的写操作。

```ts
import { createAgent, tool } from "langchain";
import { z } from "zod";

const orders = {
  "ORDER-1001": {
    status: "delayed",
    eta: "2026-07-22",
    reason: "warehouse_stock_checking",
  },
  "ORDER-1002": {
    status: "shipped",
    eta: "2026-07-21",
    reason: null,
  },
} as const;

const getOrderStatus = tool(
  async ({ orderId }) => {
    const order = orders[orderId as keyof typeof orders];

    if (!order) {
      return JSON.stringify({
        success: false,
        error: {
          code: "ORDER_NOT_FOUND",
          message: `订单 ${orderId} 不存在`,
        },
      });
    }

    return JSON.stringify({
      success: true,
      data: { orderId, ...order },
    });
  },
  {
    name: "get_order_status",
    description: "根据订单号查询订单状态、预计送达时间和延迟原因。仅允许读取。",
    schema: z.object({
      orderId: z.string().regex(/^ORDER-\d+$/).describe("订单号，例如 ORDER-1001"),
    }),
  },
);

const agent = createAgent({
  model: "openai:gpt-4.1-mini",
  tools: [getOrderStatus],
  systemPrompt: [
    "你是订单查询助手。",
    "订单状态、预计送达时间和异常原因必须调用 get_order_status 获取。",
    "工具返回 success=false 时，说明无法查询，绝不能猜测订单状态。",
    "你只有查询权限；不得承诺退款、补偿或修改订单。",
  ].join("\n"),
});

const result = await agent.invoke({
  messages: [{
    role: "user",
    content: "请帮我查询 ORDER-1001 为什么还没有送到？",
  }],
});

console.log(result.messages.at(-1)?.text);
```

```text
Agent 可以：调用 get_order_status，并根据工具返回组织答复。
Agent 不可以：直接读数据库、调用任意 API、修改订单，或在缺乏工具事实时猜测结果。
```

Tool 不是“把任意函数提供给模型”，而是将底层能力包装为**模型可理解、业务语义清晰、权限可收缩**的接口。

### 3. Tool 的组成和边界

```ts
const getOrderStatus = tool(
  async ({ orderId }) => {
    // 1. 真实执行逻辑
  },
  {
    // 2. 稳定工具标识
    name: "get_order_status",
    // 3. 模型可见的能力说明
    description: "根据订单号查询订单状态，仅允许读取。",
    // 4. 调用参数的结构化校验
    schema: z.object({
      orderId: z.string().regex(/^ORDER-\d+$/),
    }),
  },
);
```

| 部分 | 作用 | 缺失的后果 |
| --- | --- | --- |
| `handler` | 真正调用业务服务或执行受控动作 | Tool 只有声明，没有能力 |
| `name` | 让模型稳定引用具体能力 | Middleware、日志和路由难以定位 |
| `description` | 告诉模型何时应使用、不应使用此 Tool | 模型易误用或漏用 |
| `schema` | 校验参数结构与范围 | 错误参数进入底层系统，风险扩大 |

`description` 是提示信息，`schema` 可拦截格式错误，二者都不是最终权限控制。最终边界仍需由 Tool 实现和下游业务 API 保证。

不推荐暴露过宽的技术接口：

```ts
const runSql = tool(
  async ({ sql }) => database.execute(sql),
  {
    name: "run_sql",
    description: "执行任意 SQL",
    schema: z.object({ sql: z.string() }),
  },
);
```

更合理的是暴露窄语义接口：

```ts
const listOrderEvents = tool(
  async ({ orderId, limit }) => {
    return orderService.listEvents({ orderId, limit, actor: "agent" });
  },
  {
    name: "list_order_events",
    description: "查询指定订单最近的状态流转事件，仅允许读取。",
    schema: z.object({
      orderId: z.string().regex(/^ORDER-\d+$/),
      limit: z.number().int().min(1).max(20).default(10),
    }),
  },
);
```

### 4. `createAgent` 内部的消息循环

```text
HumanMessage
  "请帮我查询 ORDER-1001 为什么还没有送到？"
  ↓
Model 读取 Prompt、用户消息、Tool name/description/schema
  ↓
AIMessage
  tool_calls = [{
    id: "call_1",
    name: "get_order_status",
    args: { orderId: "ORDER-1001" }
  }]
  ↓
Runtime 校验参数并执行 Tool
  ↓
ToolMessage
  tool_call_id = "call_1"
  content = { success: true, data: { status: "delayed", ... } }
  ↓
Model 基于工具事实生成最终答复
  ↓
AIMessage 不再包含 tool_calls
  ↓
结束
```

关键消息配对关系是：

```ts
AIMessage.tool_calls[i].id === ToolMessage.tool_call_id;
```

Tool Result 不是最终答案，而是 Agent 的 `Observation`。模型必须根据 Observation 决定继续调用工具、请求用户补充信息，还是生成最终答复。

### 5. 用手写循环理解 `createAgent`

`createAgent` 封装了循环；手写版本能直观看到模型、工具和 Observation 怎样交替：

```ts
import {
  AIMessage,
  SystemMessage,
  ToolMessage,
  type BaseMessage,
} from "@langchain/core/messages";

const MAX_STEPS = 6;
const tools = { [getOrderStatus.name]: getOrderStatus };
const modelWithTools = model.bindTools(Object.values(tools));

type ToolCall = NonNullable<AIMessage["tool_calls"]>[number];

async function executeToolCall(call: ToolCall): Promise<ToolMessage> {
  const selectedTool = tools[call.name as keyof typeof tools];

  if (!selectedTool) {
    return new ToolMessage({
      name: call.name,
      tool_call_id: call.id ?? "unknown-tool-call",
      status: "error",
      content: JSON.stringify({ error: "UNKNOWN_TOOL" }),
    });
  }

  try {
    const args = selectedTool.schema.parse(call.args);
    const output = await selectedTool.invoke(args);

    return new ToolMessage({
      name: call.name,
      tool_call_id: call.id ?? "missing-call-id",
      status: "success",
      content: String(output),
    });
  } catch (error) {
    return new ToolMessage({
      name: call.name,
      tool_call_id: call.id ?? "failed-call-id",
      status: "error",
      content: JSON.stringify({
        error: "TOOL_EXECUTION_FAILED",
        message: error instanceof Error ? error.message : String(error),
      }),
    });
  }
}

async function runManualAgent(question: string): Promise<AIMessage> {
  const messages: BaseMessage[] = [
    new SystemMessage("订单事实必须通过工具查询，不得猜测。"),
    { role: "user", content: question },
  ];

  for (let step = 1; step <= MAX_STEPS; step += 1) {
    const aiMessage = await modelWithTools.invoke(messages);
    messages.push(aiMessage);

    if (!aiMessage.tool_calls?.length) {
      return aiMessage;
    }

    for (const toolCall of aiMessage.tool_calls) {
      messages.push(await executeToolCall(toolCall));
    }
  }

  throw new Error(`超过最大步骤数 ${MAX_STEPS}，主动终止以防循环失控`);
}
```

| 手写循环步骤 | `createAgent` 的封装职责 |
| --- | --- |
| 绑定 Tool Schema 到模型 | 向模型提供可用 Tool 定义 |
| 读取 `AIMessage.tool_calls` | 判断模型是否希望执行动作 |
| 根据 name 路由 Tool | 调度已注册的 Tool |
| 校验 `args` | 防止不合法参数进入 Tool 实现 |
| 生成 `ToolMessage` | 将真实结果回写为 Observation |
| 重复调用模型 | 让模型根据新事实决定下一步 |
| 限制最大步数 | 防止重复调用与成本失控 |

无论使用自定义循环还是框架，都应设置最大调用次数、超时与成本限制；“模型不再请求 Tool Call”是正常停止条件，“超过预算”是防失控停止条件。

### 6. Tool 结果应结构化

不推荐：

```ts
return "查到了，但有点异常";
```

推荐返回可区分成功、业务错误与系统错误的结构：

```ts
type ToolResult<T> =
  | { success: true; data: T; warnings?: string[] }
  | {
      success: false;
      error: {
        code: "ORDER_NOT_FOUND" | "FORBIDDEN" | "UPSTREAM_TIMEOUT";
        message: string;
        retryable: boolean;
      };
    };
```

结构化结果让模型区分业务失败与暂时故障，也让 Runtime、Workflow、日志和评估系统能以错误码进行确定性处理。

### 7. Middleware：把控制放进模型外部

Prompt 不能作为安全边界。只要高风险 Tool 可用，就应在模型外部实施审批、预算和审计。

```ts
import {
  createAgent,
  humanInTheLoopMiddleware,
  tool,
} from "langchain";
import { z } from "zod";

const createIncidentTicket = tool(
  async ({ title, severity, evidence }) => {
    return incidentApi.create({ title, severity, evidence });
  },
  {
    name: "create_incident_ticket",
    description: "创建故障工单，会产生外部业务副作用。",
    schema: z.object({
      title: z.string().min(4),
      severity: z.enum(["low", "medium", "high"]),
      evidence: z.string().min(10),
    }),
  },
);

const incidentAgent = createAgent({
  model,
  tools: [searchIncidentEvidence, createIncidentTicket],
  middleware: [
    humanInTheLoopMiddleware({
      interruptOn: { create_incident_ticket: true },
    }),
  ],
  systemPrompt: "必须先检索证据，再决定是否建议创建工单；不要编造证据。",
});
```

```text
模型请求只读检索 Tool
  ↓
获得证据
  ↓
模型请求 create_incident_ticket
  ↓
Middleware 触发 Interrupt
  ↓
人工拒绝：返回拒绝结果并转人工
人工批准：才真正执行创建工单
```

Middleware 可用于日志、重试、限流、脱敏、提前终止和人工审批。它不替代业务 API 的权限、幂等、审批令牌和审计校验。见 [LangChain Middleware](https://docs.langchain.com/oss/javascript/langchain/middleware/overview)。

### 8. 何时嵌入 LangGraph

`createAgent` 的默认拓扑是：

```text
Model
  ├── 有 tool_calls → Tools → Model
  └── 无 tool_calls → END
```

当主要问题是“下一步查什么”，且仅需少量工具、单轮内完成查询或诊断时，直接用 `createAgent`。当出现固定业务阶段、多 Agent 路由、并行、长任务恢复、审批或高风险操作时，用 LangGraph 在外层编排。

```ts
import { StateGraph, START, END, StateSchema } from "@langchain/langgraph";
import { z } from "zod";

const IncidentState = new StateSchema({
  request: z.string(),
  validated: z.boolean().default(false),
  diagnosis: z.string().default(""),
  approvalGranted: z.boolean().default(false),
  result: z.string().default(""),
});

const validateRequest = (state: typeof IncidentState.State) => ({
  validated: state.request.trim().length >= 10,
});

const routeAfterValidation = (state: typeof IncidentState.State) =>
  state.validated ? "diagnosisAgent" : "reject";

const diagnosisAgentNode = async (state: typeof IncidentState.State) => {
  const output = await incidentAgent.invoke({
    messages: [{ role: "user", content: state.request }],
  });

  return { diagnosis: output.messages.at(-1)?.text ?? "未获得诊断结果" };
};

const requestApproval = async (state: typeof IncidentState.State) => ({
  approvalGranted: await approvalService.request({ reason: state.diagnosis }),
});

const finalize = (state: typeof IncidentState.State) => ({
  result: state.approvalGranted
    ? "审批通过，进入后续执行流程。"
    : "审批未通过，已转人工处理。",
});

const reject = () => ({
  result: "信息不足，请补充故障现象、影响范围和发生时间。",
});

const workflow = new StateGraph(IncidentState)
  .addNode("validate", validateRequest)
  .addNode("diagnosisAgent", diagnosisAgentNode)
  .addNode("approval", requestApproval)
  .addNode("finalize", finalize)
  .addNode("reject", reject)
  .addEdge(START, "validate")
  .addConditionalEdges("validate", routeAfterValidation, [
    "diagnosisAgent",
    "reject",
  ])
  .addEdge("diagnosisAgent", "approval")
  .addEdge("approval", "finalize")
  .addEdge("finalize", END)
  .addEdge("reject", END)
  .compile();
```

| LangGraph 外层 Workflow | `createAgent` 内层 |
| --- | --- |
| 校验输入和身份 | 理解开放式请求 |
| 固定业务阶段 | 选择只读 Tool |
| 人工审批与中断恢复 | 收集和归纳证据 |
| 幂等、审计、预算、最终执行 | 基于 Observation 调整查询路径 |
| 最终验收与状态写入 | 生成诊断结论或请求更多信息 |

LangChain 官方说明，`createAgent` 返回的已编译图可直接作为更大 `StateGraph` 的节点或子图，且 Middleware 会继续生效。见 [LangGraph Subgraphs](https://docs.langchain.com/oss/javascript/langgraph/use-subgraphs)。

### 9. 常见误区

| 误区 | 正确理解 |
| --- | --- |
| `createAgent` 等于调用一次模型 | 它会维护模型与 Tool 的循环，直到没有新的 Tool Call |
| Tool 返回成功就等于业务完成 | Tool 成功只是 Observation，仍需模型、规则、测试或人工验收判断 |
| Prompt 禁止写操作就足够安全 | 安全边界必须在 Tool、Middleware、Runtime 和业务 API 中实现 |
| Tool 越多 Agent 越强 | 过宽的 Tool 会提高误调用和越权风险；优先设计窄语义、最小权限接口 |
| Tool 只返回自然语言字符串即可 | 结构化结果更便于模型恢复、状态机路由、审计与评估 |
| `createAgent` 与 LangGraph 二选一 | 标准 Tool Loop 用 `createAgent`；复杂业务流程将 Agent 嵌入 LangGraph |

### 专业回答总结：

LangChain 的 `createAgent` 是一个标准 Agent Harness：它将模型、Prompt、Tools 和 Middleware 组合起来，并在底层 LangGraph Runtime 中执行“模型发起 Tool Call → Tool 产生 Observation → 模型基于 Observation 再决策”的循环，直到模型不再请求工具或系统达到预算、超时等停止条件。

可靠的 TypeScript Agent 不取决于注册了多少工具，而取决于 Tool 是否具有清晰业务语义、最小权限、严格 Schema 和结构化错误；更取决于权限、审批、审计、幂等和验收是否仍由模型外部的 Runtime、Middleware、业务 API 与 LangGraph Workflow 控制。`createAgent` 负责局部动态决策，LangGraph 负责跨阶段、可治理的业务编排。

## AGENT-008：如何用 LangGraph 的 `StateGraph` 将一个“故障分流 Workflow”建模为可控、可测试的 TypeScript 状态图？`State`、`Node`、`Edge`、条件路由和 reducer 分别负责什么，为什么 Node 应返回 State Update 而不是直接修改 State？

### 问题

如何用 LangGraph 的 `StateGraph` 将一个“故障分流 Workflow”建模为可控、可测试的 TypeScript 状态图？`State`、`Node`、`Edge`、条件路由和 reducer 分别负责什么，为什么 Node 应返回 State Update 而不是直接修改 State？

## 回答大纲

- **本题考察什么**：LangGraph Graph API 的最小建模单位，以及它如何承载确定性 Workflow。
- **核心判断**：`State` 定义共享运行数据及更新规则，`Node` 执行一个独立步骤并返回局部更新，`Edge` 决定控制流；Runtime 负责调度节点和合并更新。
- **回答思路**：先实现最小状态图，再引入分支与 reducer，最后解释 State 设计原则、测试方式与常见误区。

## 参考答案

### 1. 为什么需要 `StateGraph`

上一题的 `createAgent` 适合标准的模型—工具循环：

```text
Model -> Tool -> Model -> ... -> Final Answer
```

但当业务要求明确经历若干阶段时，例如：

```text
校验告警信息
  ↓
判断是否紧急
  ├── 信息不足 -> 拒绝并要求补充
  ├── 普通告警 -> 普通处理队列
  └── 紧急告警 -> 紧急响应队列
```

就不应把“是否校验”“如何分流”完全交给模型。此时更适合使用 LangGraph 的 `StateGraph`，由代码明确控制阶段、分支、状态和结束条件。

LangGraph 官方将其定位为面向长时间、有状态 Agent 和 Workflow 的低层编排框架与 Runtime，重点提供状态、持久化、流式执行、人工介入和恢复能力；但不替应用决定 Prompt、工具列表或业务策略。见 [LangGraph Overview](https://docs.langchain.com/oss/javascript/langgraph/overview)。

```text
State：描述“任务当前知道什么”，并定义字段如何更新
Node：读取当前 State，执行一步业务逻辑，返回局部 State Update
Edge：固定跳转，或根据 State 条件路由
Runtime：调度 Node、合并 Update，并处理持久化、流式输出、中断和恢复
```

### 2. 最小 `StateGraph`

```ts
import {
  END,
  START,
  StateGraph,
  StateSchema,
  type GraphNode,
} from "@langchain/langgraph";
import { z } from "zod";

const RequestState = new StateSchema({
  request: z.string(),
  normalizedRequest: z.string().default(""),
});

const normalize: GraphNode<typeof RequestState> = (state) => {
  return {
    normalizedRequest: state.request.trim(),
  };
};

const graph = new StateGraph(RequestState)
  .addNode("normalize", normalize)
  .addEdge(START, "normalize")
  .addEdge("normalize", END)
  .compile();

const result = await graph.invoke({
  request: "  生产支付服务大面积 5xx  ",
});

console.log(result);
// {
//   request: "  生产支付服务大面积 5xx  ",
//   normalizedRequest: "生产支付服务大面积 5xx"
// }
```

```text
START -> normalize -> END
```

| 代码 | 含义 |
| --- | --- |
| `StateSchema` | 声明 State 字段、类型、默认值与更新语义 |
| `normalize` | 一个 Node：读取输入，返回局部更新 |
| `START` / `END` | LangGraph 提供的虚拟起点和终点 |
| `.addNode()` | 为业务步骤命名并注册实现 |
| `.addEdge()` | 声明固定控制流 |
| `.compile()` | 验证图结构并生成可执行 Runtime |
| `.invoke()` | 用一次输入运行完整图 |

Node 不直接调用下一个 Node，而是由 Edge 和 Runtime 决定下一步。

### 3. 构建带分支的故障分流 Workflow

```text
START
  ↓
validate
  ├── 信息不足 -> reject -> END
  └── 信息有效 -> classify
                    ├── 普通 -> normal -> END
                    └── 紧急 -> urgent -> END
```

```ts
import {
  END,
  START,
  ReducedValue,
  StateGraph,
  StateSchema,
  type ConditionalEdgeRouter,
  type GraphNode,
} from "@langchain/langgraph";
import { z } from "zod";

const IncidentState = new StateSchema({
  request: z.string(),
  valid: z.boolean().default(false),
  route: z.enum(["normal", "urgent"]).default("normal"),
  result: z.string().default(""),
  trace: new ReducedValue(z.array(z.string()).default(() => []), {
    inputSchema: z.string(),
    reducer: (current, next) => [...current, next],
  }),
});

const validate: GraphNode<typeof IncidentState> = (state) => ({
  valid: state.request.trim().length >= 8,
  trace: "validate",
});

const classify: GraphNode<typeof IncidentState> = (state) => ({
  route: /生产|宕机|大面积|P0/i.test(state.request) ? "urgent" : "normal",
  trace: "classify",
});

const reject: GraphNode<typeof IncidentState> = () => ({
  result: "信息不足：请补充故障现象、影响范围和发生时间。",
  trace: "reject",
});

const normal: GraphNode<typeof IncidentState> = (state) => ({
  result: `已进入普通处理队列：${state.request}`,
  trace: "normal",
});

const urgent: GraphNode<typeof IncidentState> = (state) => ({
  result: `已进入紧急响应队列：${state.request}`,
  trace: "urgent",
});

const routeAfterValidation: ConditionalEdgeRouter<
  typeof IncidentState,
  Record<string, unknown>,
  "classify" | "reject"
> = (state) => (state.valid ? "classify" : "reject");

const routeAfterClassification: ConditionalEdgeRouter<
  typeof IncidentState,
  Record<string, unknown>,
  "normal" | "urgent"
> = (state) => state.route;

const incidentWorkflow = new StateGraph(IncidentState)
  .addNode("validate", validate)
  .addNode("classify", classify)
  .addNode("reject", reject)
  .addNode("normal", normal)
  .addNode("urgent", urgent)
  .addEdge(START, "validate")
  .addConditionalEdges("validate", routeAfterValidation, [
    "classify",
    "reject",
  ])
  .addConditionalEdges("classify", routeAfterClassification, [
    "normal",
    "urgent",
  ])
  .addEdge("reject", END)
  .addEdge("normal", END)
  .addEdge("urgent", END)
  .compile();
```

运行示例：

```ts
const urgentResult = await incidentWorkflow.invoke({
  request: "生产支付服务大面积 5xx，开始时间 10:30",
});

console.log(urgentResult.trace);
// ["validate", "classify", "urgent"]

const rejectedResult = await incidentWorkflow.invoke({
  request: "报错",
});

console.log(rejectedResult.trace);
// ["validate", "reject"]
```

### 4. `State` 不只是 TypeScript 类型

`State` 除了类型，还需要表达“多个 Node 对同一字段返回更新时，Runtime 如何合并”。

普通字段默认为后写覆盖：

```ts
valid: z.boolean().default(false),
route: z.enum(["normal", "urgent"]).default("normal"),
result: z.string().default(""),
```

例如 `validate` 返回 `{ valid: true }` 后，Runtime 用新值覆盖旧值。

`trace` 使用 reducer 累积执行轨迹：

```ts
trace: new ReducedValue(z.array(z.string()).default(() => []), {
  inputSchema: z.string(),
  reducer: (current, next) => [...current, next],
}),
```

```text
[] + "validate" -> ["validate"]
["validate"] + "classify" -> ["validate", "classify"]
```

| 字段类型 | 典型 reducer |
| --- | --- |
| 执行轨迹 | 追加字符串或结构化事件 |
| 消息历史 | 合并新消息，并处理同 ID 消息更新 |
| 检索证据 | 追加文档、去重、限制最大数量 |
| 错误列表 | 累积异常及其来源 |
| 并行分支结果 | 合并多个 Worker 返回结果 |

### 5. 为什么 Node 应返回 Update，而不是直接修改 State

不推荐：

```ts
const badValidate = (state: typeof IncidentState.State) => {
  state.valid = state.request.trim().length >= 8;
  state.trace.push("validate");
  return state;
};
```

推荐：

```ts
const validate: GraphNode<typeof IncidentState> = (state) => ({
  valid: state.request.trim().length >= 8,
  trace: "validate",
});
```

| 直接修改 State | 返回 State Update |
| --- | --- |
| 修改隐藏在函数内部 | 变更是显式、可观察的返回值 |
| 容易污染其他 Node 看到的状态 | Runtime 统一合并更新 |
| 并行 Node 下易产生竞态和覆盖 | reducer 可定义并行更新合并语义 |
| 不利于日志、Checkpoint 和重放 | 每一步状态迁移可记录和恢复 |
| 测试时需比较完整可变对象 | 可断言输入与局部输出 |

Node 可以调用数据库、Tool、模型或人工审批，但它应将对共享 State 的影响明确返回给 Runtime。

### 6. Edge 决定控制流

固定 Edge：

```ts
.addEdge("classify", "normal")
```

条件 Edge：

```ts
.addConditionalEdges("validate", routeAfterValidation, [
  "classify",
  "reject",
])
```

职责应拆开：

```text
validate Node：输入是否满足最小要求？返回 { valid: true / false }
Router：根据 valid 字段决定下一跳，返回 "classify" / "reject"
```

将写 State 与根据 State 路由分离，可以独立测试路由规则、复用 Node，并让状态迁移可审计。

### 7. 将 `createAgent` 放进 StateGraph

Agent 适合在 Node 内完成局部动态任务，例如根据告警内容查询知识库和形成诊断意见：

```ts
const analyzeIncident: GraphNode<typeof IncidentState> = async (state) => {
  const output = await diagnosisAgent.invoke({
    messages: [{
      role: "user",
      content: [
        "请分析以下告警，并输出可能原因、待补充证据和是否建议升级。",
        `告警内容：${state.request}`,
      ].join("\n"),
    }],
  });

  return {
    result: output.messages.at(-1)?.text ?? "诊断 Agent 没有返回结论。",
    trace: "analyze_incident",
  };
};

const workflowWithAgent = new StateGraph(IncidentState)
  .addNode("validate", validate)
  .addNode("classify", classify)
  .addNode("analyzeIncident", analyzeIncident)
  .addNode("reject", reject)
  .addEdge(START, "validate")
  .addConditionalEdges("validate", routeAfterValidation, [
    "classify",
    "reject",
  ])
  .addEdge("classify", "analyzeIncident")
  .addEdge("analyzeIncident", END)
  .addEdge("reject", END)
  .compile();
```

```text
LangGraph Workflow：输入校验、固定阶段、路由、审批和最终状态写入
createAgent：在授权 Node 内动态选择 Tool，并基于 Observation 形成诊断结论
```

### 8. 如何测试状态图

```ts
import { expect, test } from "vitest";

test("validate 应拒绝过短告警", () => {
  const update = validate({
    request: "报错",
    valid: false,
    route: "normal",
    result: "",
    trace: [],
  });

  expect(update).toEqual({
    valid: false,
    trace: "validate",
  });
});

test("有效输入应路由到 classify", () => {
  const next = routeAfterValidation({
    request: "生产服务异常",
    valid: true,
    route: "normal",
    result: "",
    trace: ["validate"],
  });

  expect(next).toBe("classify");
});

test("P0 告警应流入紧急队列", async () => {
  const output = await incidentWorkflow.invoke({
    request: "生产支付服务大面积 5xx，开始时间 10:30",
  });

  expect(output.route).toBe("urgent");
  expect(output.trace).toEqual(["validate", "classify", "urgent"]);
});
```

| 测试层级 | 主要验证什么 |
| --- | --- |
| Node 单测 | 输入到局部 Update 的规则 |
| Router 单测 | State 到下一跳的分支 |
| 图集成测试 | State、Node、Edge 是否正确组合 |
| Agent 集成测试 | Tool 调用、模型结果和失败恢复 |
| 端到端测试 | 权限、外部系统、审批和验收闭环 |

### 9. 常见误区

| 误区 | 正确理解 |
| --- | --- |
| Node 必须是 LLM | Node 可以是 TypeScript 函数、业务规则、Tool、Agent、审批或子图 |
| State 只是类型声明 | State 还定义默认值、更新和 reducer 合并语义 |
| Node 可以随意修改 State | 应返回局部 Update，由 Runtime 合并 |
| 条件判断都写在 Node 里 | Node 写状态，Router 根据 State 决定下一跳 |
| reducer 只是数组拼接 | reducer 是并行、历史、消息合并和冲突控制机制 |
| 使用 LangGraph 后不需要 `createAgent` | Agent 可作为处理局部动态任务的 Node |
| Graph 越大越好 | 应按业务边界拆分 Node、子图和 Agent |

### 专业回答总结：

LangGraph 的 `StateGraph` 将 Workflow 拆分为四种职责：`State` 保存共享任务数据并定义更新语义，`Node` 完成一个独立步骤并返回局部 Update，`Edge` 表达固定或条件控制流，Runtime 则负责调度、合并、持久化和恢复。其核心价值不在于画图，而在于将业务阶段、状态迁移与错误处理从模型自由决策中拿回到可审计的代码中。

在 TypeScript 实践中，应让 State 字段具有清晰责任，让 Node 返回显式 Update，让 Router 专职决定下一跳；对轨迹、消息、证据等累积数据使用 reducer。需要动态探索时，将 `createAgent` 作为某个 Node 嵌入图中；让 Agent 决定局部工具调用，让 LangGraph 保证整个业务流程的权限、阶段、审批和最终验收边界。

## AGENT-009：如何在 LangGraph 的 TypeScript `StateGraph` 中使用 `Checkpointer`、`interrupt` 和 `Command` 实现“人工审批后恢复”的可持久化 Workflow？恢复执行时，为什么必须使用同一个 `thread_id`，又该如何避免重复执行副作用？

### 问题

如何在 LangGraph 的 TypeScript `StateGraph` 中使用 `Checkpointer`、`interrupt` 和 `Command` 实现“人工审批后恢复”的可持久化 Workflow？恢复执行时，为什么必须使用同一个 `thread_id`，又该如何避免重复执行副作用？

## 回答大纲

- **本题考察什么**：LangGraph 的线程级状态持久化、Human-in-the-loop 中断与恢复机制。
- **核心判断**：`Checkpointer` 保存某个 `thread_id` 的图状态快照；`interrupt()` 暂停当前执行并交出审批数据；`Command({ resume })` 携带人工结果，用同一线程恢复。
- **回答思路**：用“创建生产故障工单”实现审批图，走读暂停和恢复流程，再说明幂等、副作用、`Checkpointer` 与长期 `Store` 的边界。

## 参考答案

### 1. 为什么普通 `await` 不够

假设一个 Agent 已分析完事故，准备执行“创建生产工单”。这个动作可能需要等待人工数分钟、数小时甚至数天。

普通函数无法可靠地表达这种等待：

```ts
const approved = await waitForHumanApproval();
await createIncidentTicket();
```

问题在于：

- 进程重启后，内存中的执行状态丢失。
- 审批不是一次短暂异步操作，可能跨服务实例或跨天。
- 无法可靠定位“应该从哪一步继续”。
- 很容易在恢复时重复执行前面的外部调用。
- 审批人无法审查并修改 Workflow 当时的 State。

LangGraph 的持久化与中断机制将这个过程拆为两次独立调用：

```text
第一次 invoke：
执行到 interrupt()
  ↓
保存当前线程 State 和暂停位置
  ↓
返回审批请求给调用方

人工审批：
查看请求
  ↓
批准 / 拒绝 / 修改输入

第二次 invoke：
Command({ resume: 审批结果 })
  ↓
用同一 thread_id 找到 Checkpoint
  ↓
从暂停点恢复
  ↓
继续执行后续 Node
```

LangGraph 官方文档将这种能力称为 Durable Execution：Workflow 在关键点保存进度，发生故障、长时间等待或人工介入后，能从保存的位置继续。见 [Durable Execution](https://docs.langchain.com/oss/javascript/langgraph/durable-execution)。

### 2. `Checkpointer`、`thread_id`、`Store` 的职责

先区分三个容易混淆的概念：

| 概念 | 保存什么 | 生命周期 | 典型用途 |
| --- | --- | --- | --- |
| `State` | 当前一次图执行的业务数据 | 当前运行过程 | 告警内容、诊断结论、审批结果 |
| `Checkpointer` | 某个线程的 State 快照与执行位置 | 同一 `thread_id` 的多次调用 | 中断恢复、会话连续、故障恢复 |
| `Store` | 图外的应用长期数据 | 跨线程、跨会话 | 用户偏好、共享知识、项目事实 |
| `thread_id` | 一条 Workflow 实例的身份标识 | 由应用管理 | 工单处理实例、用户会话、审批流程 |

官方定义中，Checkpointer 提供线程范围的短期记忆和状态快照；Store 保存跨线程的长期数据。见 [LangGraph Persistence](https://docs.langchain.com/oss/javascript/langgraph/persistence)。

```text
thread_id = "incident-INC-20260720-001"

Checkpointer：
  保存这条事故处理流程走到哪一步
  保存当时 State 是什么
  保存它在等待哪个 interrupt

Store：
  保存“这个团队的值班规则”
  保存“该用户偏好中文告警摘要”
  保存“某服务的长期知识”
```

`thread_id` 不是用户 ID，也不应该随机地在恢复时重新生成；它是**同一条可恢复执行链路的唯一标识**。

### 3. 最小人工审批图

下面实现一个“创建生产故障工单前必须审批”的 TypeScript Workflow。

```ts
import {
  Command,
  END,
  interrupt,
  MemorySaver,
  START,
  StateGraph,
  StateSchema,
  type GraphNode,
} from "@langchain/langgraph";
import { z } from "zod";

const ApprovalState = new StateSchema({
  // 待审批的动作。真实系统还应包含目标资源、操作者、风险等级等。
  action: z.string(),

  // 审批 Node 根据人工恢复值更新。
  approved: z.boolean().default(false),

  // 后续执行结果。
  result: z.string().default(""),
});

type ApprovalDecision = {
  approved: boolean;
  reason: string;
};

const reviewAction: GraphNode<typeof ApprovalState> = (state) => {
  // 第一次运行到这里会暂停，并把对象返回给调用方。
  // 恢复时，interrupt() 的返回值是 Command.resume 中的值。
  const decision = interrupt({
    type: "approval_request",
    action: state.action,
    message: "该操作会创建生产故障工单，请确认。",
  }) as ApprovalDecision;

  return {
    approved: decision.approved,
  };
};

const executeAction: GraphNode<typeof ApprovalState> = async (state) => {
  if (!state.approved) {
    return {
      result: `审批未通过，未执行：${state.action}`,
    };
  }

  // 真实实现应调用业务 API，并携带幂等键。
  return {
    result: `审批通过，已执行：${state.action}`,
  };
};

const checkpointer = new MemorySaver();

const approvalGraph = new StateGraph(ApprovalState)
  .addNode("review", reviewAction)
  .addNode("execute", executeAction)
  .addEdge(START, "review")
  .addEdge("review", "execute")
  .addEdge("execute", END)
  .compile({ checkpointer });
```

```text
START
  ↓
review
  └── interrupt：等待人工审批
        ↓
      同线程恢复
        ↓
execute
  ↓
END
```

`MemorySaver` 只适合本地学习与测试：它将 Checkpoint 存在内存中，进程重启后数据会丢失。官方文档建议生产环境使用持久化 Checkpointer，例如 PostgreSQL 或本地开发时的 SQLite。见 [LangGraph Persistence](https://docs.langchain.com/oss/javascript/langgraph/persistence)。

### 4. 第一次调用：执行到暂停点

调用方需要为这条审批流程分配稳定的线程 ID：

```ts
const config = {
  configurable: {
    thread_id: "incident-INC-20260720-001",
  },
};

const paused = await approvalGraph.invoke(
  {
    action: "创建生产故障工单 INC-20260720-001",
  },
  config,
);

console.log(paused);
```

运行到 `reviewAction` 时：

```ts
const decision = interrupt({
  type: "approval_request",
  action: state.action,
});
```

不会继续向下执行，而是暂停，并返回类似这样的中断信息：

```ts
{
  __interrupt__: [
    {
      value: {
        type: "approval_request",
        action: "创建生产故障工单 INC-20260720-001",
        message: "该操作会创建生产故障工单，请确认。"
      }
    }
  ]
}
```

调用方通常将这段数据转换为 Web 审批页面、IM 卡片或通知、CLI 确认提示、工单系统待办事项，或内部审批服务请求。

重点是：`interrupt()` 返回的是**让外部系统理解当前暂停原因和所需输入的数据**，不是业务动作已经执行的证明。

### 5. 第二次调用：用 `Command` 恢复

人工完成审批后，应用必须使用**同一个 `thread_id`**恢复：

```ts
const approval: ApprovalDecision = {
  approved: true,
  reason: "证据充分，符合 P1 事故处理规范。",
};

const resumed = await approvalGraph.invoke(
  new Command({
    resume: approval,
  }),
  {
    configurable: {
      thread_id: "incident-INC-20260720-001",
    },
  },
);

console.log(resumed);
// {
//   action: "创建生产故障工单 INC-20260720-001",
//   approved: true,
//   result: "审批通过，已执行：创建生产故障工单 INC-20260720-001"
// }
```

恢复语义如下：

```text
Command({ resume: approval })
  ↓
Runtime 根据 thread_id 找到对应 Checkpoint
  ↓
回到触发 interrupt 的 review Node
  ↓
interrupt(...) 返回 approval 对象
  ↓
review Node 返回 { approved: true }
  ↓
Runtime 合并 State Update
  ↓
execute Node 根据 state.approved 执行或取消动作
```

`interrupt()` 在恢复时看起来像一个“同步返回值”：

```ts
const decision = interrupt(...) as ApprovalDecision;
```

但第一次调用时它会暂停；第二次调用时才将 `Command.resume` 的值返回给 `decision`。

### 6. 为什么必须使用同一个 `thread_id`

错误示例：

```ts
await approvalGraph.invoke(
  new Command({ resume: { approved: true, reason: "批准" } }),
  {
    configurable: {
      thread_id: "another-random-thread",
    },
  },
);
```

这会使 Runtime 找不到原来中断流程的 Checkpoint。新的线程没有“暂停在 `review` 节点”的历史，自然也没有可以恢复的位置。

正确做法是让应用层保存映射关系：

```ts
type ApprovalRequest = {
  approvalId: string;
  threadId: string;
  incidentId: string;
  status: "pending" | "approved" | "rejected";
};

// 创建审批请求时，保存 threadId。
const pendingApproval: ApprovalRequest = {
  approvalId: "APR-001",
  threadId: "incident-INC-20260720-001",
  incidentId: "INC-20260720-001",
  status: "pending",
};

// 审批回调时读取原 threadId，而不是重新生成。
async function handleApprovalCallback(
  approvalId: string,
  decision: ApprovalDecision,
) {
  const approval = await approvalRepository.findById(approvalId);

  return approvalGraph.invoke(
    new Command({ resume: decision }),
    {
      configurable: {
        thread_id: approval.threadId,
      },
    },
  );
}
```

| 系统 | 负责什么 |
| --- | --- |
| LangGraph Checkpointer | 保存 State、执行位置和中断信息 |
| 应用数据库 | 保存审批单、审批人与 `thread_id` 的映射 |
| 审批系统 | 给出批准、拒绝或修改后的输入 |
| 业务 API | 执行真实动作并保证权限、幂等与审计 |

不要把所有业务审批数据仅存于 Checkpointer。Checkpointer 解决 Workflow 恢复；审批域本身仍需要自己的持久化模型、状态机与审计记录。

### 7. 恢复执行为什么可能重复运行 Node

这是最重要的工程边界。

LangGraph 官方中断规则指出：恢复执行时，触发 `interrupt()` 的 Node 会从开头重新运行。因此，**`interrupt()` 之前的代码可能再次执行**。

危险写法：

```ts
const badReview: GraphNode<typeof ApprovalState> = async (state) => {
  // 第一次运行发了一条通知。
  await notificationApi.send({
    text: `请审批：${state.action}`,
  });

  // 恢复时该 Node 会重新从头运行，通知可能再次发送。
  const decision = interrupt({
    action: state.action,
  }) as ApprovalDecision;

  return {
    approved: decision.approved,
  };
};
```

恢复时可能发生：

```text
第一次运行：
发送审批通知
  ↓
interrupt 暂停

第二次运行：
再次发送审批通知
  ↓
interrupt 返回人工 decision
```

有三种常见修复策略。

#### 策略一：将副作用放在 `interrupt()` 之后

只适用于副作用本来就应在审批后发生：

```ts
const reviewThenExecute: GraphNode<typeof ApprovalState> = async (state) => {
  const decision = interrupt({
    action: state.action,
  }) as ApprovalDecision;

  if (decision.approved) {
    await incidentApi.create({
      action: state.action,
    });
  }

  return {
    approved: decision.approved,
  };
};
```

但这仍需要业务 API 自身具备幂等性，以防网络重试或其他故障。

#### 策略二：将副作用拆到独立 Node

这是更清晰的 Graph 设计：

```text
review Node：
  只准备审批数据并 interrupt
  不执行副作用

execute Node：
  只在 approved=true 后执行写操作
```

这正是前面 `reviewAction -> executeAction` 的设计。其优点是审批逻辑与执行逻辑分离，也更易测试、审计和重试。

#### 策略三：业务 API 使用幂等键

即使副作用在 `interrupt` 之后，也必须防止“请求已到服务端，但响应丢失后被重试”。

```ts
const executeAction: GraphNode<typeof ApprovalState> = async (state) => {
  if (!state.approved) {
    return {
      result: "审批未通过",
    };
  }

  const ticket = await incidentApi.create({
    title: state.action,
    // 通常用业务实体 ID 或 Workflow ID 作为幂等键。
    idempotencyKey: `incident-ticket:${state.action}`,
  });

  return {
    result: `已创建工单：${ticket.id}`,
  };
};
```

```text
interrupt 前：尽量只做纯计算、读取和准备审批数据
interrupt 后：副作用应放在独立 Node 中
真实业务 API：始终提供幂等、防重和审计能力
```

### 8. `interrupt()` 的使用规则

| 规则 | 原因 |
| --- | --- |
| 必须配置 Checkpointer | 否则无法保存暂停位置并恢复 |
| 恢复时使用同一 `thread_id` | Runtime 依赖它查找对应的线程快照 |
| 不要用 `try/catch` 包住 `interrupt()` | 可能错误吞掉控制流信号 |
| 不要在同一 Node 内随意重排多个 `interrupt()` | 恢复依赖调用顺序与对应关系 |
| 返回简单、JSON 可序列化数据 | 审批信息需要跨进程、跨网络传输与持久化 |
| `interrupt` 前的副作用必须幂等 | Node 恢复时会从头执行 |

不推荐：

```ts
try {
  const decision = interrupt({ action: "创建工单" });
  return { approved: decision.approved };
} catch {
  return { approved: false };
}
```

推荐让 `interrupt()` 位于清晰的业务暂停点：

```ts
const reviewAction: GraphNode<typeof ApprovalState> = (state) => {
  const decision = interrupt({
    type: "approval_request",
    action: state.action,
    risk: "high",
  }) as ApprovalDecision;

  return {
    approved: decision.approved,
  };
};
```

完整规则见 [LangGraph Interrupts](https://docs.langchain.com/oss/javascript/langgraph/interrupts)。

### 9. `MemorySaver` 何时可用，生产如何选择

本地学习代码通常使用：

```ts
const graph = builder.compile({
  checkpointer: new MemorySaver(),
});
```

优点是零配置、适合单元测试和本地 Demo；缺点是数据只在当前进程内存中：

```text
Node 进程重启
  ↓
MemorySaver 中的所有 Checkpoint 丢失
  ↓
无法恢复等待中的审批流程
```

生产系统应该选择可持久化的 Checkpointer：

| 场景 | 建议 |
| --- | --- |
| 单元测试、教学 Demo | `MemorySaver` |
| 本地开发、单机调试 | SQLite Checkpointer |
| 多实例服务、跨重启恢复 | PostgreSQL Checkpointer 或托管 Agent Runtime |
| 企业级长任务 | 持久化数据库 + 保留策略 + 监控与审计 |

另外，Checkpoint 会随对话和执行次数累积。生产环境还要定义：

- 保留周期与清理策略。
- 线程终态后的归档策略。
- 敏感 State 的脱敏、加密与访问控制。
- `thread_id` 的格式、长度与不可预测性。
- Checkpoint 与业务审计数据的职责边界。

### 专业回答总结：

`Checkpointer` 让 LangGraph 将某个 `thread_id` 的 State 和执行位置保存为 Checkpoint；`interrupt()` 让 Workflow 在可控位置暂停并把审批请求交给外部系统；人工结果通过 `Command({ resume })` 携带，并使用同一 `thread_id` 恢复原流程。它们共同使长时间任务、人工审批和故障恢复成为可实现的工程能力，而不是依赖内存中 `await` 的脆弱流程。

生产实现的关键不只是会调用 `interrupt()`：必须将审批请求与 `thread_id` 建立持久映射，使用持久化 Checkpointer，并假设恢复时中断 Node 会从头运行。因此，`interrupt()` 前的副作用必须避免或保证幂等；写操作应尽量放在审批后的独立 Node 中，同时由真实业务 API 提供幂等键、权限校验和审计。

## AGENT-010：如何用 LangGraph 的 `Send` 实现动态 Fan-out / Fan-in：根据输入动态创建多个并行 Worker，并用 reducer 安全汇总结果？它与“一个 Node 配置多个固定出边”有什么区别，为什么并行分支不能直接覆盖同一个 State 字段？

### 问题

如何用 LangGraph 的 `Send` 实现动态 Fan-out / Fan-in：根据输入动态创建多个并行 Worker，并用 reducer 安全汇总结果？它与“一个 Node 配置多个固定出边”有什么区别，为什么并行分支不能直接覆盖同一个 State 字段？

## 回答大纲

- **本题考察什么**：LangGraph 的动态并行编排、`Send`、Fan-out / Fan-in 和 reducer 合并策略。
- **核心判断**：`Send` 用于由运行时输入决定 Worker 数量的动态 Fan-out；每个 Worker 应接收独立任务输入，结果必须通过 reducer 或专属汇总 Node 合并。
- **回答思路**：以“多服务故障并行排查”为例，先建模静态并行与动态并行的边界，再实现 `Send -> worker -> reducer -> summarize` 的 TypeScript 状态图。

## 参考答案

### 1. 为什么需要并行 Worker

部分故障排查任务包含互相独立的检查项，例如支付、订单、库存和搜索服务。若串行检查，总耗时近似为各步骤耗时之和：

```text
T_serial = T_payment + T_order + T_inventory + T_search
```

如果检查之间没有前后依赖，可使用 Fan-out 并行执行，再 Fan-in 汇总：

```text
dispatch
  ├── checkPayment
  ├── checkOrder
  ├── checkInventory
  └── checkSearch
          ↓
      summarize
```

理想情况下，总耗时约为最慢分支加汇总时间：

```text
T_parallel ≈ max(T_payment, T_order, T_inventory, T_search) + T_merge
```

并行不是默认优化。它会带来配额竞争、结果合并、失败处理、完成顺序不稳定和调用成本放大等问题，应仅用于真正独立的工作。

### 2. 固定并行和动态 Fan-out

固定分支数在写图时已知，可配置多个固定 Edge：

```ts
const graph = new StateGraph(State)
  .addNode("fetchLogs", fetchLogs)
  .addNode("fetchMetrics", fetchMetrics)
  .addNode("fetchDeployments", fetchDeployments)
  .addNode("summarize", summarize)
  .addEdge(START, "fetchLogs")
  .addEdge(START, "fetchMetrics")
  .addEdge(START, "fetchDeployments")
  .addEdge("fetchLogs", "summarize")
  .addEdge("fetchMetrics", "summarize")
  .addEdge("fetchDeployments", "summarize")
  .addEdge("summarize", END)
  .compile();
```

若输入在运行时决定检查哪些服务或产生多少子任务，固定 Edge 不够灵活：

```ts
{
  services: ["payment", "order", "inventory"]
}
```

此时由路由函数返回多个 `Send`：

```text
dispatch
  ↓
读取 state.services
  ↓
Send("checkService", { service: "payment" })
Send("checkService", { service: "order" })
Send("checkService", { service: "inventory" })
  ↓
Worker 并行执行并返回局部结果
  ↓
Reducer 合并
  ↓
summarize
```

| 方式 | 分支数 | 适合场景 |
| --- | --- | --- |
| 固定多个 Edge | 编译图时确定 | 固定检查清单、固定流水线 |
| 条件路由 | 有限分支中选择 | 根据风险进入不同固定路径 |
| `Send` | 运行时动态确定 | Map-Reduce、按文档批处理、动态子任务 |

本地资料 `AI/LangChain-LangGraph-Deep-Agents从零学习教程/核心教程.md` 将 `Send` 描述为“为动态数量的并行 Node 分别传入不同 State”；官方 [LangGraph Graph API](https://docs.langchain.com/oss/javascript/langgraph/graph-api) 也将其作为动态 Worker 的控制流能力。

### 3. 并行覆盖同一字段为什么错误

若多个 Worker 都写入普通字段：

```ts
const BadState = new StateSchema({
  diagnosis: z.string().default(""),
});
```

```text
payment Worker   -> { diagnosis: "支付服务连接超时" }
order Worker     -> { diagnosis: "订单服务写入延迟" }
inventory Worker -> { diagnosis: "库存锁等待升高" }
```

普通 State 字段默认采取后写覆盖。并发完成顺序不保证，最终结果既会丢失前面的诊断，也可能在不同执行中不稳定。

因此，并行 Worker 共享一个结果字段时，必须使用 reducer 显式定义追加、去重、覆盖优先级或排序策略。

### 4. 完整示例：动态服务排查

```ts
import {
  END,
  START,
  ReducedValue,
  Send,
  StateGraph,
  StateSchema,
  type ConditionalEdgeRouter,
  type GraphNode,
} from "@langchain/langgraph";
import { z } from "zod";

const ServiceNameSchema = z.enum([
  "payment",
  "order",
  "inventory",
  "search",
]);

const CheckResultSchema = z.object({
  service: ServiceNameSchema,
  healthy: z.boolean(),
  evidence: z.array(z.string()),
  checkedAt: z.string(),
});

type CheckResult = z.infer<typeof CheckResultSchema>;

const IncidentState = new StateSchema({
  services: z.array(ServiceNameSchema).min(1),
  service: ServiceNameSchema.optional(),

  // Worker 结果按服务名去重；重试时用最新结果替换。
  checks: new ReducedValue(z.array(CheckResultSchema).default(() => []), {
    inputSchema: CheckResultSchema,
    reducer: (current, next) => {
      const existingIndex = current.findIndex(
        (item) => item.service === next.service,
      );

      if (existingIndex >= 0) {
        return current.map((item, index) =>
          index === existingIndex ? next : item,
        );
      }

      return [...current, next];
    },
  }),

  report: z.string().default(""),
});

const dispatch: GraphNode<typeof IncidentState> = () => ({});

const routeToWorkers: ConditionalEdgeRouter<
  typeof IncidentState,
  Record<string, unknown>,
  Send
> = (state) => {
  return state.services.map(
    (service) => new Send("checkService", { service }),
  );
};

const checkService: GraphNode<typeof IncidentState> = async (state) => {
  if (!state.service) {
    throw new Error("checkService 必须获得 service 输入");
  }

  return {
    checks: await inspectService(state.service),
  };
};

const summarize: GraphNode<typeof IncidentState> = (state) => {
  // 不能依赖并行完成顺序，汇总前显式排序。
  const sortedChecks = [...state.checks].sort((left, right) =>
    left.service.localeCompare(right.service),
  );
  const unhealthy = sortedChecks.filter((item) => !item.healthy);

  if (unhealthy.length === 0) {
    return {
      report: "已完成检查：所有目标服务均未发现明显异常。",
    };
  }

  return {
    report: [
      `发现 ${unhealthy.length} 个异常服务：`,
      ...unhealthy.map(
        (item) => `- ${item.service}: ${item.evidence.join("；")}`,
      ),
      "建议根据证据确认根因，并按风险等级决定是否升级。",
    ].join("\n"),
  };
};

const incidentGraph = new StateGraph(IncidentState)
  .addNode("dispatch", dispatch)
  .addNode("checkService", checkService)
  .addNode("summarize", summarize)
  .addEdge(START, "dispatch")
  .addConditionalEdges("dispatch", routeToWorkers, ["checkService"])
  .addEdge("checkService", "summarize")
  .addEdge("summarize", END)
  .compile();
```

示例中的受控检查函数：

```ts
async function inspectService(
  service: z.infer<typeof ServiceNameSchema>,
): Promise<CheckResult> {
  const fakeResults: Record<
    z.infer<typeof ServiceNameSchema>,
    Omit<CheckResult, "service" | "checkedAt">
  > = {
    payment: {
      healthy: false,
      evidence: [
        "过去 5 分钟 5xx 比例为 8.2%",
        "数据库连接池等待时间升高",
      ],
    },
    order: {
      healthy: true,
      evidence: ["P95 延迟处于正常阈值内"],
    },
    inventory: {
      healthy: false,
      evidence: ["锁等待数量高于基线 4 倍"],
    },
    search: {
      healthy: true,
      evidence: ["检索错误率正常"],
    },
  };

  return {
    service,
    ...fakeResults[service],
    checkedAt: new Date().toISOString(),
  };
}
```

运行：

```ts
const output = await incidentGraph.invoke({
  services: ["payment", "order", "inventory"],
});

console.log(output.checks);
console.log(output.report);
```

### 5. `Send` 和 reducer 的职责边界

```ts
new Send("checkService", {
  service: "payment",
});
```

不是直接执行 `checkService()`，而是向 Runtime 声明创建一个动态任务，并为其提供局部 State 输入。

```text
Send 决定：
  创建哪些动态任务，并分别提供什么输入

Reducer 决定：
  并发任务返回的更新如何合并到共享 State
```

Worker 应只返回自己负责的局部结果：

```ts
return {
  checks: {
    service: "payment",
    healthy: false,
    evidence: ["过去 5 分钟 5xx 比例为 8.2%"],
    checkedAt: new Date().toISOString(),
  },
};
```

`Send` 本身不修改 State，也不会自动替你合并多个 Worker 结果。

### 6. Fan-in 和 Map-Reduce

图中的：

```ts
.addEdge("checkService", "summarize")
```

形成 Fan-in。汇总 Node 读取 reducer 合并后的 `checks`，负责检查结果完整性、失败项、风险判断和最终报告。

| 阶段 | LangGraph 对应物 | 职责 |
| --- | --- | --- |
| Map | `Send` + `checkService` | 拆分独立子任务并并行执行 |
| Reduce | `checks` reducer | 合并 Worker 局部更新 |
| Finalize | `summarize` Node | 基于完整结果做业务判断 |

汇总 Node 不应再次逐个检查服务；它应专注于消费合并结果，并决定下一步结束、升级、重试或进入人工审批。

### 7. Worker 是否应该是 Agent

不一定。确定性检查优先使用普通 Node：

```ts
const checkService: GraphNode<typeof IncidentState> = async (state) => ({
  checks: await inspectService(state.service!),
});
```

只有单个子任务需要动态选择多个只读 Tool、搜索知识库或根据 Observation 修正假设时，才在 Worker 内调用受限 Agent：

```ts
const checkService: GraphNode<typeof IncidentState> = async (state) => {
  const output = await diagnosisAgent.invoke({
    messages: [{
      role: "user",
      content: [
        `请排查 ${state.service} 服务。`,
        "只允许调用只读诊断工具。",
        "返回 healthy、evidence、confidence。",
      ].join("\n"),
    }],
  });

  return {
    checks: parseDiagnosisResult(state.service!, output),
  };
};
```

职责边界不变：

```text
LangGraph：创建 Worker、聚合结果、汇总和升级
Worker Agent：在一个 service 范围内选择受限 Tool
Tool / 业务 API：强制权限、租户隔离、校验、配额和审计
```

并行 Worker 默认不应执行写操作。多个 Worker 的错误会放大为多份并发副作用；写操作应留给汇总、审批后的单一受控 Node。

### 8. 并发上限和失败策略

输入可能直接决定 Fan-out 数量，因此必须做限制：

```ts
const MAX_SERVICES_PER_RUN = 20;

const routeToWorkers: ConditionalEdgeRouter<
  typeof IncidentState,
  Record<string, unknown>,
  Send
> = (state) => {
  const uniqueServices = [...new Set(state.services)];

  if (uniqueServices.length > MAX_SERVICES_PER_RUN) {
    throw new Error(
      `单次最多检查 ${MAX_SERVICES_PER_RUN} 个服务，当前为 ${uniqueServices.length}`,
    );
  }

  return uniqueServices.map(
    (service) => new Send("checkService", { service }),
  );
};
```

| 风险 | 应对方式 |
| --- | --- |
| 分支数量失控 | 输入限制、分批处理、任务队列 |
| Worker 超时 | Tool / API 超时、重试分类、结构化失败结果 |
| 部分 Worker 失败 | 保留失败结果，由汇总 Node 决定降级或终止 |
| 下游限流 | 并发上限、指数退避、全局配额 |
| 结果不稳定 | 汇总前显式排序，不依赖完成顺序 |
| 成本不可预测 | 记录每个 Worker 的模型和 Tool 调用，设定预算 |
| 写副作用 | 证据并行收集，汇总后审批，再由单一 Node 执行 |

### 9. 如何测试

测试不应依赖 Worker 返回顺序，而应验证 Worker 数量、合并策略和最终报告。

```ts
import { expect, test } from "vitest";

test("应为每个唯一服务生成一个 Send", () => {
  const sends = routeToWorkers({
    services: ["payment", "order", "payment"],
    service: undefined,
    checks: [],
    report: "",
  });

  expect(sends).toHaveLength(2);
});

test("异常服务应出现在汇总报告中", async () => {
  const output = await incidentGraph.invoke({
    services: ["payment", "order", "inventory"],
  });

  expect(output.checks).toHaveLength(3);
  expect(output.report).toContain("payment");
  expect(output.report).toContain("inventory");
});
```

还应为 reducer 断言重复服务的替换策略、超出并发上限、空输入、超时和部分失败等边界。

### 10. 常见误区

| 误区 | 正确理解 |
| --- | --- |
| 配置多个 Edge 等于动态 Fan-out | 固定 Edge 的分支数编译时已知；`Send` 才能运行时创建分支 |
| `Send` 自动合并结果 | `Send` 只创建任务；共享字段由 reducer 合并 |
| 并行 Worker 可覆盖同一字段 | 普通字段会覆盖冲突；必须使用 reducer 或专属汇总结构 |
| 并发越多越快 | 下游容量、限流和成本可能让吞吐反而下降 |
| 每个 Worker 都应该是 Agent | 确定性检查优先普通 Node；需要探索时才使用 Agent |
| Worker 可以并行写生产系统 | 高风险副作用应在汇总、审批后的单一 Node 执行 |

### 专业回答总结：

LangGraph 的 `Send` 用于动态 Fan-out：路由函数按运行时输入返回多个 `Send`，Runtime 为每个任务创建 Worker。它适合服务、文档、检索主题或子任务数量动态变化的 Map-Reduce 与 Orchestrator-Worker 场景；分支数固定时应优先使用普通 Edge。

并行编排的难点在于共享 State 的正确合并。多个 Worker 不能直接覆盖同一字段，而应使用 reducer 明确处理追加、去重、最新结果覆盖与排序；Fan-in 汇总 Node 则基于完整结果输出判断。生产中还必须限制 Fan-out 数量、处理超时与部分失败、控制下游配额和成本，并将写副作用放在汇总与审批之后的单一受控执行节点。

## AGENT-011：`createAgent` 中具备 Agent 自主判断是否需要向用户提问的能力吗？

### 问题

`createAgent` 中具备 Agent 自主判断是否需要向用户提问的能力吗？

## 回答大纲

- **本题考察什么**：`createAgent` 的 Agent Loop 能力边界，以及“向用户提问”到底属于模型输出、工具调用还是 Human-in-the-loop 中断。
- **核心判断**：`createAgent` 本身具备让模型基于上下文“决定下一步”的能力，因此可以让模型选择直接向用户追问；但它并不天然等于“可持久化等待用户回复”。如果要安全暂停、等待、恢复，需要结合 LangGraph 持久化、`interrupt` / `Command.resume`，或 LangChain 的 `humanInTheLoopMiddleware`。
- **回答思路**：先回答“有，但分层”，再拆成三种实现：直接追问、`ask_user` Tool、HITL Middleware，最后说明工程选型和底层消息流。

## 参考答案

### 1. 结论：有“判断能力”，但不自动等于“等待恢复能力”

`createAgent` 具备一定的 Agent 自主判断能力，因为它的核心就是：

```text
Model
  ↓
根据当前 messages、systemPrompt、tools 判断下一步
  ↓
要么输出最终回答
要么调用 Tool
要么继续基于 ToolMessage 再决策
```

LangChain 官方文档对 Agent 的定义是：**Agent 是模型在循环中调用工具，直到任务完成**；`createAgent` 创建的是包含模型、Prompt、Tools 和 Middleware 的 Agent Harness。也就是说，模型确实可以根据上下文判断：

- 信息是否足够；
- 是否需要调用工具；
- 是否需要继续追问用户；
- 是否应该输出最终答案；
- 是否遇到无法继续的歧义或风险。

但要注意一个关键边界：

```text
createAgent 具备“让模型决定是否问用户”的能力
≠
createAgent 默认具备“像工作流一样暂停、持久化、等待用户、再从原处恢复”的完整能力
```

更准确地说：

| 能力 | `createAgent` 默认是否具备 | 说明 |
| --- | --- | --- |
| 模型判断信息不足并直接问用户 | 具备 | 通过 Prompt 和模型推理产生普通 `AIMessage` |
| 模型选择调用一个 `ask_user` Tool | 可配置后具备 | 需要你注册这个 Tool，并定义 Runtime 如何处理 |
| 高风险 Tool 执行前自动请求人工审查 | 可通过 Middleware 具备 | 使用 `humanInTheLoopMiddleware` 或自定义 Middleware |
| 暂停执行、保存状态、等待用户后恢复 | 依赖 LangGraph 持久化 / interrupt | 需要 Checkpointer、`thread_id`、`Command.resume` |
| 用户回复后作为 Tool Observation 继续 Agent Loop | 可实现 | 需要把回复包装为 `ToolMessage` 或中断恢复值 |

所以答案是：**`createAgent` 可以让 Agent 自主判断“该不该问用户”，但是否能工程化地“暂停并等待用户回复”，取决于你有没有把提问建模成普通对话、Tool、Middleware 中断或 LangGraph Workflow。**

### 2. 情况一：模型直接输出问题

这是最基础的能力，`createAgent` 默认就能做到。

```ts
import { createAgent } from "langchain";

const agent = createAgent({
  model: "openai:gpt-4.1-mini",
  tools: [],
  systemPrompt: [
    "你是部署助手。",
    "如果用户没有说明部署环境，必须先询问用户。",
    "不要猜测 dev、staging 或 prod。",
  ].join("\n"),
});

const result = await agent.invoke({
  messages: [
    {
      role: "user",
      content: "帮我生成部署方案",
    },
  ],
});

console.log(result.messages.at(-1)?.text);
// 可能输出：请问你要部署到 dev、staging 还是 prod？
```

这个过程的底层逻辑是：

```text
HumanMessage:
  "帮我生成部署方案"

Model:
  读取 systemPrompt，发现缺少部署环境

AIMessage:
  "请问你要部署到 dev、staging 还是 prod？"
```

这种方式的特点是简单，但它只是普通多轮对话：

```text
用户下一轮回复：
"prod"

应用再次调用 agent.invoke(...)
模型基于新的 messages 继续
```

适合场景：

- 缺少普通参数；
- 风险不高；
- 不需要保存复杂执行位置；
- 不涉及已经运行到一半的长任务；
- 不需要审批单、超时、恢复和审计。

局限是：它没有明确的“暂停点”。如果 Agent 已经执行了一部分工具、生成了计划、准备进入高风险动作，仅靠模型问一句话并不够稳。

### 3. 情况二：把“问用户”建模成 `ask_user` Tool

如果你希望模型不只是自然语言追问，而是结构化地表达“我需要用户输入”，可以注册一个特殊 Tool。

```ts
import { createAgent, tool } from "langchain";
import { z } from "zod";

const askUser = tool(
  async ({ question, choices, reason }) => {
    return JSON.stringify({
      type: "ask_user",
      question,
      choices,
      reason,
    });
  },
  {
    name: "ask_user",
    description:
      "当继续任务前缺少关键用户信息、存在歧义或需要用户选择方案时调用。",
    schema: z.object({
      question: z.string().describe("要问用户的明确问题"),
      choices: z.array(z.string()).optional().describe("可选项"),
      reason: z.string().describe("为什么必须询问用户"),
    }),
  },
);

const agent = createAgent({
  model: "openai:gpt-4.1-mini",
  tools: [askUser],
  systemPrompt: [
    "你是部署助手。",
    "当部署环境、风险偏好或执行范围不明确时，调用 ask_user。",
    "不要猜测用户意图。",
  ].join("\n"),
});
```

模型可能产生：

```text
AIMessage(tool_calls):
  ask_user({
    question: "请确认要部署到哪个环境？",
    choices: ["dev", "staging", "prod"],
    reason: "部署环境会影响审批、配置和执行命令。"
  })
```

但这里有个关键点：**普通 Tool 函数不应该真的在内部阻塞等待用户。**

不推荐：

```ts
const askUser = tool(async ({ question }) => {
  // 不推荐：让 Tool 在这里长时间等待用户输入
  const answer = await waitUserForever(question);
  return answer;
});
```

更合理的 Runtime 设计是：

```text
模型调用 ask_user Tool
  ↓
Runtime 识别这是特殊 Tool
  ↓
触发 interrupt / 返回 waiting_user 状态
  ↓
用户回复后恢复
  ↓
Runtime 构造 ToolMessage
  ↓
模型继续读取用户回复
```

伪代码：

```ts
async function executeToolCall(call: ToolCall) {
  if (call.name === "ask_user") {
    const userReply = interrupt({
      type: "ask_user",
      question: call.args.question,
      choices: call.args.choices,
      reason: call.args.reason,
    }) as { answer: string };

    return new ToolMessage({
      tool_call_id: call.id,
      name: "ask_user",
      content: JSON.stringify({
        answer: userReply.answer,
      }),
    });
  }

  return executeNormalTool(call);
}
```

消息链路是：

```text
HumanMessage
  "帮我生成部署方案"

AIMessage(tool_calls)
  ask_user({ question, choices, reason })

Runtime
  interrupt(...) 暂停

用户回复
  "prod"

Runtime 恢复并构造 ToolMessage
  {
    tool_call_id: ask_user_call_id,
    content: { answer: "prod" }
  }

Model
  读取 ToolMessage，继续生成部署计划
```

这种方式更适合复杂 Agent，因为“问用户”变成了一个可观测、可审计、可结构化的动作。

### 4. 情况三：通过 `humanInTheLoopMiddleware` 审查 Tool Call

如果问题是“Agent 自主判断要不要审查高风险动作”，要更精确地区分：

```text
模型自主判断是否问用户
```

和：

```text
系统强制判断某个 Tool Call 是否必须人工审查
```

在生产系统中，高风险动作通常不应完全交给模型自主决定。比如：

- 发邮件；
- 删除文件；
- 执行 SQL；
- 创建工单；
- 发布上线；
- 扣款退款；
- 修改权限；
- 部署生产环境。

LangChain 的 `humanInTheLoopMiddleware` 可以按 Tool 名称拦截。官方 Human-in-the-loop 文档说明：当模型提出一个需要审查的 Tool Call 时，HITL Middleware 会根据配置策略检查该 Tool Call，如果需要干预，就发出 `interrupt` 暂停执行；状态由 LangGraph 持久化保存，之后由人工决定继续、拒绝或修改。

示例：

```ts
import {
  createAgent,
  humanInTheLoopMiddleware,
  tool,
} from "langchain";
import { z } from "zod";

const deployService = tool(
  async ({ service, env }) => {
    return JSON.stringify({
      success: true,
      message: `已部署 ${service} 到 ${env}`,
    });
  },
  {
    name: "deploy_service",
    description: "部署指定服务。生产环境部署属于高风险操作。",
    schema: z.object({
      service: z.string(),
      env: z.enum(["dev", "staging", "prod"]),
    }),
  },
);

const agent = createAgent({
  model: "openai:gpt-4.1-mini",
  tools: [deployService],
  middleware: [
    humanInTheLoopMiddleware({
      interruptOn: {
        deploy_service: true,
      },
    }),
  ],
  systemPrompt: "你是部署助手。生产相关操作必须遵守审批要求。",
});
```

底层流程是：

```text
用户：部署 payment 到 prod
  ↓
模型：决定调用 deploy_service({ service: "payment", env: "prod" })
  ↓
Middleware：看到 deploy_service 命中 interruptOn
  ↓
Runtime：interrupt，暂停执行
  ↓
用户 / 审批人：批准、拒绝或修改参数
  ↓
Runtime：恢复
  ↓
批准：执行 Tool
拒绝：返回拒绝结果给模型
修改：用修改后的参数执行或继续
```

这里的判断分工是：

| 判断项 | 谁负责 |
| --- | --- |
| 是否需要部署 | 模型可判断 |
| 是否调用 `deploy_service` | 模型可判断 |
| `deploy_service` 是否必须人工审查 | Middleware / Runtime 应强制判断 |
| 审查通过后是否真正执行 | Runtime / Tool / 业务 API 负责 |
| 执行是否有权限和幂等 | 业务 API 负责 |

这比让模型自己决定“是否需要审批”更安全。

### 5. `createAgent` 默认的能力边界

根据本地资料 `AI/LangChain-LangGraph-Deep-Agents从零学习教程/核心教程.md` 和官方 Agents 文档，`createAgent` 主要封装的是：

```text
Model -> Tools -> Model
```

也就是：

```text
1. 调用模型
2. 让模型决定是否产生 Tool Call
3. 如果有 Tool Call，则执行 Tool
4. 把 Tool 结果变成 ToolMessage
5. 再调用模型
6. 直到模型不再请求工具或达到执行上限
```

它本身不是一个“业务审批系统”，也不是一个“用户待办系统”。

| 问题 | `createAgent` 默认能力 |
| --- | --- |
| 模型能否根据 Prompt 问用户问题 | 可以 |
| 模型能否选择调用 `ask_user` Tool | 可以，前提是你注册了这个 Tool |
| Tool 调用结果能否作为 `ToolMessage` 回给模型 | 可以，Agent Loop 会处理 |
| 能否对某些 Tool Call 加人工审查 | 可以，通过 Middleware |
| 能否跨进程、跨时间等待用户回复 | 需要 Checkpointer / LangGraph persistence |
| 能否保存审批单、超时、通知和审计 | 需要应用系统自己实现 |
| 能否保证高风险动作一定不绕过审批 | 需要 Runtime / Middleware / 业务 API 强制控制 |

所以，`createAgent` 更像是一个标准 Agent Harness，不是完整的人机协作业务平台。

### 6. 三种实现的选择标准

| 需求 | 推荐做法 |
| --- | --- |
| 只是普通缺参 | 让模型直接输出问题 |
| 希望模型结构化表达“我要问用户” | 注册 `ask_user` Tool，并在 Runtime 特殊处理 |
| 需要中断长任务并恢复 | 使用 LangGraph `interrupt` + Checkpointer + `Command.resume` |
| 高风险 Tool 必须审查 | 使用 `humanInTheLoopMiddleware` 或外层 LangGraph 审批节点 |
| 需要审批单、通知、超时、审计 | 应用层持久化待办，并保存 `thread_id` 映射 |
| 生产写操作 | 不只靠模型判断，必须由 Runtime / API 强制审批和幂等 |

可以这样总结：

```text
简单追问：
  createAgent + Prompt

结构化追问：
  createAgent + ask_user Tool

可恢复等待：
  createAgent 运行在 LangGraph 上 + interrupt + Checkpointer

高风险审查：
  createAgent + humanInTheLoopMiddleware
  或外层 StateGraph 审批节点
```

### 7. 一个较完整的 TypeScript 伪实现

下面示例展示：`createAgent` 让模型自主决定是否调用 `ask_user`，Runtime 将其转成可恢复等待。

```ts
import { createAgent, tool } from "langchain";
import {
  Command,
  interrupt,
  MemorySaver,
  StateGraph,
} from "@langchain/langgraph";
import { z } from "zod";

const askUser = tool(
  async () => {
    // 实际不会执行到这里；Runtime 会拦截 ask_user。
    throw new Error("ask_user should be handled by runtime interrupt");
  },
  {
    name: "ask_user",
    description:
      "当继续任务前缺少关键用户信息时，向用户提出一个问题。",
    schema: z.object({
      question: z.string(),
      choices: z.array(z.string()).optional(),
      reason: z.string(),
    }),
  },
);

const agent = createAgent({
  model: "openai:gpt-4.1-mini",
  tools: [askUser, deployService],
  systemPrompt: [
    "你是部署助手。",
    "如果缺少部署环境，必须调用 ask_user。",
    "不要猜测用户没有明确给出的环境。",
  ].join("\n"),
});
```

概念性 Runtime 处理：

```ts
async function runToolCall(call: ToolCall) {
  if (call.name === "ask_user") {
    const reply = interrupt({
      type: "ask_user",
      question: call.args.question,
      choices: call.args.choices,
      reason: call.args.reason,
    }) as { answer: string };

    return new ToolMessage({
      tool_call_id: call.id,
      name: "ask_user",
      content: JSON.stringify(reply),
    });
  }

  return runNormalTool(call);
}
```

恢复：

```ts
await graph.invoke(
  new Command({
    resume: {
      answer: "prod",
    },
  }),
  {
    configurable: {
      thread_id: "deploy-task-001",
    },
  },
);
```

这个实现中：

```text
模型负责：
  判断是否缺少信息，以及要问什么

createAgent 负责：
  组织 Agent Loop，让模型可调用 Tool

Runtime / LangGraph 负责：
  把 ask_user 转成 interrupt，并支持恢复

应用层负责：
  展示问题、接收用户回复、保存 thread_id、处理超时和审计
```

### 8. 关键误区

| 误区 | 正确理解 |
| --- | --- |
| `createAgent` 自动内置“问用户并等待” | 它能让模型问问题，但可恢复等待需要 Runtime / interrupt |
| 模型直接问一句话就是 HITL | 这只是普通多轮对话，不一定有暂停点和持久化 |
| 注册 `ask_user` Tool 后就会自动弹窗 | Tool 只是能力声明，UI 展示和等待由应用层实现 |
| Tool 内部应该 `await userInput` | 不推荐长时间阻塞 Tool，应转成中断或待办 |
| 让模型自己决定审批就够了 | 高风险动作应由 Middleware / Runtime / API 强制审查 |
| 用户回复只能作为新 HumanMessage | 也可以作为 `Command.resume` 或对应 Tool Call 的 `ToolMessage` |
| `createAgent` 不需要 LangGraph | LangChain Agent 本身构建在 LangGraph Runtime 之上，但复杂恢复要显式使用持久化能力 |

### 专业回答总结：

`createAgent` 具备让模型基于上下文自主判断“是否需要向用户提问”的能力：它可以通过 Prompt 直接输出追问，也可以在注册了 `ask_user` 这类 Tool 后，让模型选择调用该 Tool 来结构化表达“我需要用户输入”。但这只是 Agent 决策层能力，不等于自动拥有生产级“暂停、等待、恢复、审计”的完整人机协作能力。

如果只是普通缺参，`createAgent + Prompt` 足够；如果要结构化追问，可以使用 `createAgent + ask_user Tool`；如果要在长任务中安全等待用户回复，需要结合 LangGraph `interrupt`、Checkpointer、同一个 `thread_id` 和 `Command.resume`；如果是高风险工具审查，应使用 `humanInTheLoopMiddleware` 或外层 `StateGraph` 强制中断，而不是完全依赖模型自觉询问。
