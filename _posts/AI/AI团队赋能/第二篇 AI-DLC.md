## 第二篇 AI-DLC

### 1.1 先看结论：AI-DLC 是什么

AI-DLC，通常指 **AI-Driven Development Life Cycle**，是 AWS 在 2025 年公开提出的一套 **AI-native 软件研发生命周期方法**。它不是某一个 IDE、某一个模型、某一套插件，而是一种把 AI 放到研发流程中心、由 AI 主动推进工作、但由人保留关键判断权的方法论。

> 核心要点：AWS 官方概括为“AI 负责生成计划、提出澄清问题、执行方案；人类负责业务判断、关键决策和最终验证”，开源仓库将其定义为“根据项目复杂度自适应、同时保持质量和人工控制的软件开发工作流”。

开源仓库也把它定义为一种会根据项目复杂度自适应、同时保持质量和人工控制的软件开发工作流。

### 1.2 AI-DLC 的概念解读

#### 1.2.1 为什么会提出 AI-DLC

AI-DLC 的提出，直接来自对现有 AI 开发方式的不满。AWS 在首篇方法论文章里把当前常见做法归纳成两类：一类是 **AI-assisted development**，也就是 AI 只辅助某些局部任务，比如补全文档、生成代码片段、写测试；另一类是 **AI-autonomous development**，也就是把整套应用几乎完全交给 AI 自动生成。AWS 的判断是，这两类方式在速度和软件质量上都不够理想。

与此同时，传统 SDLC 又主要是为“人类驱动、周期较长、会议和流程较重”的开发方式设计的，因此只是把 AI 硬塞进旧流程里，既限制了 AI 的潜力，也保留了旧流程的低效。

AWS 在后续开源 AI-DLC 工作流时，又把问题说得更工程化了一层：团队在落地 AI 时，经常遇到三类系统性问题。第一是 **one-size-fits-all workflows**，也就是所有项目都被迫走同一条流程；第二是流程深度不灵活，要么过度设计，要么不够严谨；第三是工具过度自动化，把本来应该由人负责的验证和监督挤掉了。

> 核心要点：AI-DLC 的核心目标是让研发流程变得 **自适应、分层次、并且保留人工决策权**，解决现有 AI 开发方式的效率与质量痛点，适配 AI 原生的工作特性。

#### 1.2.2 AI-DLC 的核心思想

AI-DLC 的核心不是“AI 替代工程师”，而是 **AI 发起并推动执行，人类持续做关键校准**。AWS 官方把这个新心智模型写得非常明确：AI 先创建计划，再通过提问补足上下文，只有在人类验证之后才继续实现；这个模式会在每一个 SDLC 活动中反复出现。

> 核心要点：AI-DLC 不是“一次性把需求丢给 AI”，而是将 AI 作为流程主动推进者，人类作为关键节点控制者，形成“AI 推进+人类校准”的循环模式。

在这个模型下，AI-DLC 被划分为三个总阶段：**Inception、Construction、Operations**。AWS 官方定义中，Inception 负责把业务意图变成需求、故事和工作单元；Construction 负责把这些已验证的上下文转成架构、代码和测试；Operations 则负责把前面沉淀下来的上下文继续用于基础设施、部署和运维。每一阶段都会为下一阶段提供更丰富的上下文，而且这些计划、需求、设计工件会被持久化到代码仓库中，便于跨会话延续。

#### 1.2.3 AI-DLC 和传统 SDLC 的区别

如果把 AI-DLC 和传统 SDLC 放在一起看，最本质的区别不在“阶段名称”，而在 **谁主导流程、上下文如何传递、以及验证何时发生**。传统 SDLC 更像是人驱动的串行流程，AI 只是附加助手；AI-DLC 则把 AI 放到流程中心，让它主动提问、主动整理方案、主动推进实施，但在关键节点停下来等人确认。

AWS 还明确提出，AI-DLC 会引入新的节奏和术语：传统的 sprint 被更短、更密集的 **bolts** 替代，epic 则被 **units of work** 替代，强调的是更快的迭代和更直接的交付。

换成更工程化的说法，AI-DLC 可以看成是对 SDLC 的一次 **AI-native 重写**。它不是把 AI 加在 SDLC 上，而是把 SDLC 改造成“AI 提出、AI 落实、人来校准”的模式。与此同时，它又不是完全放权给 AI，因为它明确要求每个关键阶段都经过人类确认，并且通过审计记录和阶段工件把全过程留痕。

#### 1.2.4 AI-DLC 的适应性特点

AI-DLC 还有一个很重要的特点，就是 **不是所有任务都走满全流程**。AWS 在 Amazon Q 的落地文章里明确说明，AI-DLC 会先分析请求、代码库和复杂度，再决定哪些阶段真正需要执行：简单的 bug fix 可能直接跳到代码生成；复杂特性则需要先经历需求分析、架构设计和详细测试。

> 核心要点：AI-DLC 具备自适应智能，会根据任务复杂度动态选择执行阶段，只保留对当前任务有价值的流程，避免冗余，提升效率。

开源仓库 README 也把这一点称为 **adaptive intelligence**：只执行对当前任务有价值的阶段。

### 1.3 与 AI-DLC 相关联的核心概念

AI-DLC 不是孤立存在的。它在落地时会和一系列概念互相配合。最值得梳理的是：**Spec、MCP、项目级规则文件、Skills/Workflows/Hooks，以及上下文记忆机制**。

#### 1.3.1 Spec：把“做什么”固定下来

**Spec**，尤其是 **Spec-Driven Development**，和 AI-DLC 的关系非常紧密，但两者不是同一件事。GitHub 的 Spec Kit 官方文档把 Spec-Driven Development 定义为：让 specification 从过去“写完就丢”的辅助文档，变成 **可以直接驱动实现的可执行工件**。官方还强调，spec 不再只是指导实现，而是成为 implementation 的 source of truth。

GitHub 博客进一步把这套流程拆成 **Specify、Plan、Tasks、Implement** 四步。

从 AI-DLC 的角度看，Spec 最适合承载的是 **Inception 和 Construction 之间的结构化中间产物**。比如需求、验收标准、设计约束、任务拆解，本来就是 AI-DLC 里需要不断生成、验证和持久化的东西。Kiro 的原生 specs 就很典型：它把 spec 固定成 ``requirements.md``、``design.md``、``tasks.md`` 三类文件，用来承载需求、设计和可追踪任务。

但也要看到，**AI-DLC 比 Spec 更大**。Spec 更偏向“把目标和约束写清楚”，而 AI-DLC 关心的是“从需求到实现到部署的整条流程怎么由 AI 驱动”。这一点在 AWS 的 Kiro 接入方式里也能看出来：开源 AI-DLC 仓库虽然支持 Kiro，但官方建议是通过 **steering files + Vibe mode** 运行 AI-DLC，而不是直接依赖 Kiro 的 native spec mode。这说明在 AWS 的实践里，Spec 是 AI-DLC 的重要相关能力，但不是唯一入口。

> 核心要点：Spec 负责明确“做什么”，是 AI-DLC 中连接需求与实现的关键结构化载体，但 AI-DLC 覆盖范围更广，聚焦整条研发流程的 AI 驱动，Spec 只是其重要组成部分而非唯一入口。

#### 1.3.2 MCP：把“能做什么”接进来

**MCP（Model Context Protocol）** 是 AI-DLC 非常关键的另一条支撑线。Anthropic 对 MCP 的定义是：一种开放标准，用来在数据源和 AI 工具之间建立安全的双向连接。GitHub 对 MCP 的定义也类似：它规定了应用如何把上下文分享给 LLM，并以标准化方式把 AI 连接到不同的数据源和工具上。

对 AI-DLC 来说，MCP 的价值不在“概念很新”，而在它承担了 **执行层和上下文接入层** 的角色。AI-DLC 既要让 AI 问问题，也要让 AI 读代码、查系统、跑工具、连外部服务。如果没有 MCP 或等价机制，这些工具接入只能一对一硬编码，无法形成统一可复用的能力层。

Claude Code、GitHub Copilot、Kiro、Cline 都把 MCP 放在自己扩展能力的重要位置：Claude Code 明确支持通过 MCP 连接数据库、API 和外部工具；Copilot 官方把 MCP 定义成扩展 Copilot 能力的协议；Kiro 也把 steering 与 MCP 结合，作为让 IDE 理解私有库和私有 DSL 的方法。

所以，从 AI-DLC 的视角看，**Spec 负责约束目标，MCP 负责接入能力**。前者解决“做什么”，后者解决“凭什么做”。

> 核心要点：MCP 承担 AI-DLC 的执行层和上下文接入层角色，解决“凭什么做”的问题，通过标准化连接，让 AI 能够接入外部工具、数据源，为流程执行提供能力支撑。

#### 1.3.3 项目级规则文件：把“怎么做”固化下来

AI-DLC 的开源工作流有一个非常鲜明的特点：它不是只靠一条 prompt，而是靠 **核心规则文件 + 详细阶段规则** 来驱动。AWS 在 Amazon Q 的实操文章里专门解释过：一个核心 ``core-workflow.md`` 会常驻进入上下文，而更细的阶段性规则文件则按需动态加载，这样既能保持流程框架稳定，又能节省上下文窗口。

不同工具承载这套规则的方式不同，但本质是一致的：

- Kiro 用的是 **steering files**，并且有 ``product.md``、``tech.md``、``structure.md`` 这三类基础 steering 文件，默认参与每次交互；它也支持 ``AGENTS.md``，以及 always、fileMatch、manual 三种 inclusion 模式。
- Cline 用的是 **Rules**，可以常驻，也可以按路径条件加载；
- Claude Code 用的是 **CLAUDE.md + auto memory**，两者都会在会话开始时载入；
- Copilot 则用 ``.github/copilot-instructions.md`` 和 ``.github/instructions/*.instructions.md`` 承载仓库级和路径级指令。

AWS 的 AI-DLC 仓库也正是沿着这条线提供接入方式：Kiro 放进 ``.kiro/steering/``，Cline 放进 ``.clinerules/`` 或 ``AGENTS.md``，Claude Code 放进 ``CLAUDE.md``，Copilot 放进 ``.github/copilot-instructions.md``。

> 核心要点：项目级规则文件是 AI-DLC 方法论的核心载体，而非辅助说明，它固化“怎么做”的标准，保证流程一致性，避免 AI-DLC 退化为普通 agent 聊天。

#### 1.3.4 Skills、Workflows、Hooks、Subagents：把流程变成可执行模块

当规则文件解决了“长期约束”之后，下一步就是把可重复的经验进一步做成 **模块化流程能力**。这就是 Skills、Workflows、Hooks、Subagents 的价值。

各类工具的具体实现的：

- Kiro 的 **skills** 采用 progressive disclosure：启动时只加载 skill 的名称和描述，请求匹配时才加载完整说明，再按需读取脚本和参考资料；**hooks** 则能在保存文件、工具调用前后、spec 任务执行前后等事件自动触发 shell 命令或 agent prompt。
- Cline 的官方定位也很清楚：它有五套定制系统——Rules、Skills、Workflows、Hooks、``.clineignore``；其中 skills 只在相关请求时加载，workflows 用 Markdown 文件把多步任务封成 ``/workflow.md`` 命令，hooks 用于在关键事件注入自定义逻辑。
- Claude Code 则提供了 **skills、hooks、subagents**：skills 通过 ``SKILL.md`` 扩展能力，hooks 可以在生命周期关键点自动运行命令或注入上下文，subagents 内置 Explore、Plan、General-purpose 等不同角色。
- GitHub Copilot 的对应物是 **custom agents**，官方文档说明它们通过 agent profile 定义 prompts、tools 和 MCP servers。

#### 1.3.5 记忆与上下文管理：把流程跨会话接起来

AI-DLC 强调全过程留痕和跨阶段连续性，所以它天然依赖 **上下文持久化**。AWS 官方说得很清楚：AI-DLC 会把计划、需求和设计工件保存在仓库里，以便跨多个 session 继续工作。

不同工具在这方面的实现也不一样：

- Claude Code 有 **CLAUDE.md 和 auto memory** 两套记忆系统，都会在每次会话开始时加载；
- Cline 提供 **Memory Bank**，把项目背景、当前进度、架构模式、技术上下文等拆成结构化 Markdown 文件保存，还配合 **Checkpoints** 和 **Auto Compact** 管理上下文和回滚；
- Kiro 更依赖 steering、specs 和规则文件的组合来维持长期上下文；
- Copilot 则更多依赖仓库内的 instructions、custom agents 和 GitHub 平台环境。

> 核心要点：上下文持久化是 AI-DLC 实现“生命周期”的基础，而非锦上添花，它保证跨会话、跨阶段的连续性，避免流程断裂，让 AI 能够持续推进研发工作。

### 1.4 与 AI-DLC 相关的工具：Kiro、Cline、Claude Code、Copilot 到底有什么区别

这四类工具都能承载 AI-DLC，但它们的重心不同。比较它们时，最有价值的角度不是“谁更强”，而是 **谁更像哪一种 AI-DLC 载体**。

#### 1.4.1 Kiro：更偏“Spec / Steering 原生”的 AI IDE

Kiro 官方把自己定义为 **agentic IDE**，核心能力是 **specs、steering、hooks**。官网首页直接把“spec-driven development”和“advanced steering”摆在最前面；文档里又把 specs 定义成把高层想法变成结构化实现计划的工件，并且固定生成 ``requirements.md``、``design.md``、``tasks.md`` 三类文件。

与此同时，Kiro 的 steering 机制还提供 product、tech、structure 三份基础上下文，并支持 ``AGENTS.md`` 与按模式加载。

从 AI-DLC 适配度看，Kiro 的优势在于它很自然地承接 **Inception 阶段的结构化产物**。如果团队希望在 IDE 内直接把需求、设计、任务分解和长期规则放在同一套界面里，Kiro 会很顺手。AWS 的开源 AI-DLC 也给出了 Kiro 的专门接入方式：把 AI-DLC 的核心规则放进 ``.kiro/steering/``，并在 Kiro 里用 Vibe mode 运行该流程。

#### 1.4.2 Cline：更偏“可组合、可控、可回滚”的执行代理

Cline 官方文档最突出的特点，是把定制能力拆得非常细：**Rules、Skills、Workflows、Hooks、``.clineignore``** 五套系统，再加上 **Plan & Act、Memory Bank、Checkpoints、Auto Compact**。Plan mode 明确只允许读代码和做策略讨论，不允许改文件或跑命令；Checkpoints 用 shadow Git repo 为每一步保存快照；Memory Bank 则用结构化 Markdown 维护跨会话知识。

从 AI-DLC 的角度看，Cline 最突出的长处不是 spec 原生，而是 **执行层和控制层做得很细**。它很适合承载那种需要大量本地文件操作、频繁命令执行、强上下文清理、强回滚能力的 AI-DLC 落地方式。AWS 也正是基于这一点，让 AI-DLC 在 Cline 中通过 ``.clinerules/`` 或 ``AGENTS.md`` 来实现。

> 核心定位：Cline 更像高可定制的 agent runtime / 执行外壳，长处在于执行层和控制层的精细化设计，适合需要大量本地文件操作、强过程控制和回滚能力的 AI-DLC 落地场景。

#### 1.4.3 Claude Code：更偏“内建 agent 架构完整”的 coding agent

Claude Code 官方定位是：一个能读代码库、改文件、跑命令、连开发工具的 **agentic coding tool**，可运行在 terminal、IDE、desktop app 和 browser。它内建了很多 agent 级能力：``CLAUDE.md`` 和 auto memory 用来保存持久上下文；hooks 在生命周期关键点自动运行；skills 用 ``SKILL.md`` 扩展能力；subagents 则提供 Explore、Plan、General-purpose 等角色化代理。它还直接支持通过 MCP 连接外部工具。

从 AI-DLC 的映射看，Claude Code 更像一个 **能力比较均衡的通用 agent 平台**：既有长期记忆入口，又有技能和钩子，又有子代理和 MCP，所以很适合用来承接 AI-DLC 这种“既要流程、又要执行、还要扩展”的方法。AWS 的开源仓库在 Claude Code 上的实现方式也很直接：把 AI-DLC 的核心规则放进 ``CLAUDE.md``，把阶段细节放到 ``.aidlc-rule-details/``。

#### 1.4.4 GitHub Copilot：更偏“GitHub 平台内工作流”的云端代理

Copilot 的官方文档现在已经不只是“补全代码”了。GitHub 对 **Copilot cloud agent** 的描述是：所有编码和迭代都可以发生在 GitHub 上，用户可以让 Copilot 先研究仓库、创建计划、在分支上改代码，再决定是否开 PR；它还会自动建分支、写 commit message、push 代码。

与此同时，Copilot 还支持 ``.github/copilot-instructions.md``、路径级 instructions、custom agents 和 MCP。custom agents 通过 agent profile 定义 prompts、tools 和 MCP servers。

这意味着 Copilot 的最大特色，在于它和 **GitHub 原生工作流** 结合得最紧。它更适合那种 issue、branch、PR、review、GitHub Actions 都已经是团队主流程的场景。AWS 的 AI-DLC 仓库也正是借助这一点，把核心 workflow 放进 ``.github/copilot-instructions.md``，从而把 AI-DLC 接入 Copilot。

#### 1.4.5 四类工具核心定位总结

如果把这四类工具放到 AI-DLC 的方法论里，比较清晰的定位是：

- Kiro 更强在 **规格表达和项目上下文显式化**；
- Cline 更强在 **流程自定义、执行控制和回滚**；
- Claude Code 更强在 **agent 组件完整度和平衡性**；
- Copilot 更强在 **GitHub 平台集成和云端工作流闭环**。

这个结论不是某家官方直接说的话，而是基于它们各自文档和 AWS 的 AI-DLC 接入方式做出的工程归纳。

### 1.5 AI-DLC 在实际软件开发生命周期中的落地过程

下面把 AI-DLC 真正落回“软件是怎么一步一步做出来的”，按流程拆解为八个关键步骤，明确每一步的核心动作和要求。

#### 1.5.1 第一步：先把 AI-DLC 工作流装进你的工具里

AI-DLC 的开源实现不是“下载一个 CLI 就自动完成”，而是把 **核心工作流规则文件** 和 **阶段详细规则文件** 接入你使用的代理工具。AWS 的仓库已经给出了不同工具的具体放置方式：

- Kiro 放到 ``.kiro/steering/``；
- Cline 放到 ``.clinerules/`` 或 ``AGENTS.md``；
- Claude Code 放到 ``CLAUDE.md``；
- Copilot 放到 ``.github/copilot-instructions.md``。

详细阶段规则则以 ``.aidlc-rule-details/`` 或工具特定目录形式放在旁边。

> 核心要点：这一步的核心价值是让 AI 被稳定的工作流规则驱动，而非依赖当前聊天上下文猜测流程，同时通过“核心规则常驻+阶段规则按需加载”，降低上下文消耗。

AWS 在 Amazon Q 的实践文章里还特别解释过，核心 workflow 会长期进入上下文，而详细阶段规则只会按需动态加载，从而降低上下文消耗。

#### 1.5.2 第二步：用一个高层问题陈述启动 AI-DLC

AWS 的实践示例里，启动方式非常简单：在对话里以 **“Using AI-DLC, ...”** 开头输入你的问题陈述，工作流就会被触发。仓库 README 也把这一点写成标准用法：先表达 intent，再由 AI-DLC 自动接管后续流程，提出结构化问题，生成并要求你审核执行计划。

#### 1.5.3 第三步：进入 Inception，相当于“先把问题真正说清楚”

在 AI-DLC 里，**Inception** 是最关键的起步阶段。开源仓库把它概括成“决定 WHAT to build and WHY”，包括需求分析与验证、必要时的用户故事、应用设计、并行开发单元划分，以及风险和复杂度评估。

在 Amazon Q 的实际演示里，Inception 的核心动作的：

- **Workspace Detection**：AI 会判断当前是 greenfield（新项目）还是 brownfield（已有项目），新项目直接走 Requirements Analysis，已有项目先做 Reverse Engineering 再澄清需求；
- 创建 ``aidlc-docs`` 目录：生成状态与审计文件，记录过程、支持恢复；
- **Requirements Analysis**：AI 主动提出结构化澄清问题，避免擅自假设，待矛盾、歧义解决后再推进，简单应用可建议跳过 User Stories，支持人工覆盖判断。

> 核心要点：Inception 阶段的核心不是写需求文档，而是让 AI 与人对目标形成统一理解，为后续 Construction 阶段奠定基础，避免方向跑偏。

#### 1.5.4 第四步：进入 Construction，把已经确认的意图变成代码和测试

**Construction** 是 AI-DLC 的第二大阶段。仓库把它概括成“决定 HOW to build it”，包括详细组件设计、代码生成、构建配置、测试策略和质量验证。AWS 在方法介绍里则说得更直白：Construction 会基于 Inception 中已经验证过的上下文，让 AI 提出逻辑架构、领域模型、代码方案和测试，再由团队在关键技术点上做实时澄清。

在实际 workflow 中，Construction 并不是一次性“吐出所有代码”。AWS 的实操文章指出，AI-DLC 会根据复杂度决定是否需要额外的功能设计、非功能需求设计、基础设施设计等步骤；但无论如何，**Code Generation** 和 **Build/Test** 都是构造阶段的核心闭环，而且会针对每个 unit of work 循环执行。简单任务可以减少前置设计，复杂任务则会增加设计和测试强度。

> 核心要点：Construction 与普通“AI 写代码”的根本区别，在于它先验证目标理解，再逐步推进实现，通过 Build/Test 接收反馈，而非盲目产出代码。

#### 1.5.5 第五步：进入 Operations，把交付和运行纳入方法论

AI-DLC 的第三阶段是 **Operations**。AWS 在方法总览里明确把它定义为“部署和监控”，包括基础设施自动化、监控与可观测性、生产就绪性验证。

不过要注意一个现实细节：在 AWS 开源仓库当前的 README 里，Operations 仍被标注为 **Deployment and monitoring (future)**。这说明 Operations 在方法框架里已经被纳入，但在开源 workflow 的成熟度上仍在继续演进。也就是说，AI-DLC 不是只停留在“写代码”，但它在公开实现里，对运维阶段的支持还没有像 Inception 和 Construction 那么完整。

> 核心要点：Operations 是 AI-DLC 生命周期的重要组成部分，虽已纳入方法论框架，但当前开源 workflow 中，其成熟度仍在演进，暂未达到 Inception 和 Construction 阶段的完整度。

#### 1.5.6 第六步：全过程都要“人审人批”，而不是最后一次性验收

AI-DLC 最重要的落地原则之一，就是 **人工监督不是终点动作，而是贯穿动作**。AWS 在 AI-DLC 总体介绍里反复强调，AI 会先生成计划、提出澄清问题、等待批准后再实现；在 Amazon Q 实操文里也明确说明，工作流在每个阶段都会要求审阅、批准，并保留审计痕迹。开源仓库的用法说明同样要求你认真审核每个 plan、每个阶段产物和执行方案。

这意味着，AI-DLC 的正确使用方式不是“让 AI 自己跑完，再统一检查”，而是 **阶段性 gating**。你要在需求确认、设计确认、执行计划确认、构建与测试结果确认这些节点不断校准方向。这样做虽然看起来比“全自动”更慢，但它恰恰是 AI-DLC 把速度和质量同时做起来的关键。

> 核心要点：AI-DLC 采用“阶段性 gating”模式，人工验证贯穿需求确认、设计确认、执行计划确认等关键节点，而非终点一次性验收，这是兼顾速度与质量的关键。

#### 1.5.7 第七步：把工件留在仓库里，让下一个阶段和下一个会话都能接上

AI-DLC 之所以是 lifecycle，而不是一次性 workflow，很大程度上依赖于它会把过程工件保存下来。AWS 说明这些 artifacts 会进入仓库，保证跨会话连续性；在 Amazon Q 示例里，这些工件会进入 ``aidlc-docs/``，其中包括状态文件和审计文件。仓库 README 也明确写了：所有 artifacts 都会生成在 ``aidlc-docs/`` 目录下。

> 核心要点：过程工件持久化到仓库，是 AI-DLC 实现跨阶段、跨会话连续性的基础，与 Spec、Memory Bank 等共同构成 AI-DLC 的“长期记忆面”，避免流程断裂。

#### 1.5.8 第八步：在真实团队里，先补齐环境和约束，避免 AI 反复猜

AI-DLC 的实战经验还说明了一件很重要的事：如果团队的技术环境、约束、非功能需求没有事先写清楚，AI 就会不停补问，甚至做出会导致返工的假设。AWS 的 ``technical-environment-guide.md`` 直接说明，这类环境文档的作用就是让代码生成、基础设施设计和非功能需求决策与组织标准保持一致；如果没有它，AI-DLC 阶段要么会提出大量澄清问题，要么会做出错误假设。

> 核心要点：AI-DLC 虽由 AI 驱动，但需要团队前置明确业务目标、技术边界、合规要求等约束，让 AI 聚焦于流程推进，而非猜测边界，提升效率、减少返工。

### 1.6 把整套关系压缩成一张方法论地图

把全文收束起来，可以得到这样一张清晰的 AI-DLC 方法论分层关系图，各层级职责明确、相互支撑：

- **AI-DLC**：上位方法论，定义“AI 如何主导研发流程”；
- **Spec / SDD**：结构化工件层，定义“目标、约束和任务如何被写清楚”；
- **MCP**：工具连接层，定义“AI 如何接外部系统和能力”；
- **Steering / Rules / CLAUDE.md / copilot-instructions**：长期规则层，定义“AI 每轮都该遵守什么”；
- **Skills / Workflows / Hooks / Subagents / Custom Agents**：流程执行层，定义“复杂经验如何被模块化复用”；
- **Kiro、Cline、Claude Code、Copilot**：工具承载层，是上述所有能力的具体落地载体，各有偏重。

这个分层理解，和 AWS 的 AI-DLC 工作流仓库、Kiro/Cline/Claude/Copilot 官方文档的组合是吻合的。

### 1.7 最后的总结

AI-DLC 不是“AI 帮忙写代码”的别名，而是把 AI 放到软件生命周期中心、由 AI 主动推进、由人类持续校准的一套研发方法。它提出的背景，是传统 SDLC 对 AI 不够友好，而单纯的 AI-assisted 或 AI-autonomous 又都难以兼顾速度与质量。

它的关键不只是三个阶段，而是那条反复出现的主线：**AI 先提计划，AI 再问清楚，AI 再执行；人类在关键节点不断验证**。

落到工程实践里，AI-DLC 需要的不只是一个“更会写代码的模型”，而是一整套配套能力：用 Spec 固定目标，用 MCP 接入能力，用 Rules/Steering/Instructions 固化长期约束，用 Skills/Workflows/Hooks/Subagents 组织执行，用仓库工件和记忆机制维持跨阶段连续性。Kiro、Cline、Claude Code、Copilot 的差异，本质上也就是它们各自在这几层里的偏重不同。