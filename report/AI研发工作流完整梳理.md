# AI 研发工作流

> 文档定位：AI 研发工作流方法论与工程实现分析  
> 本地依据：当前 **.trae** 规范、**report/AI**、**report/QA**、项目交付记录及阶段产物  
> 外部依据：官方工程文档、行业研究、标准与原始论文  
> 分析日期：2026-07-20  
> 案例范围：运营平台“内容活动激励管控线上化”

## 摘要

AI 研发真正需要解决的问题，是如何把模型生成代码的能力放进现有研发流程，并且保证需求有人确认、代码有人负责、结果能够验证、问题可以追溯。

本报告的结论是：

1. AI 研发工作流应采用 **确定性外壳 + 受限 Agent 内核**。模型负责需求理解、方案比较、局部路径选择和异常分析；程序、状态机、权限系统、测试与人工审批负责阶段顺序、真实执行、风险控制和完成判定。

2. 工作流的最小可信闭环不是“提示词 → 代码”，而是：

   **Spec → State → Plan/Task → Action/Tool → Observation → Artifact → Validation → Gate → Accept**

3. **Agent = Model + Harness**。模型只是局部决策器；真正决定交付可靠性的，是上下文、工具、状态、编排、权限、评估、持久化和可观测性组成的 Harness。

4. 当前 **.trae** 已将上述思想落成阶段化交付状态机：**Init → PRD → BAM → Plan → Task → Code → Verify → Design → Accept**，并以 Mock、Repair、MTR、BITS、Pause and Ask 等旁路处理现实研发中的依赖、返工、安全和证据缺口。

---

## 二、为什么需要 AI 研发工作流：Vibe Coding 在业务开发中的不足

### 2.1 先说清楚什么是 Vibe Coding

Andrej Karpathy 在 2025 年提出 Vibe Coding 时，描述了一种很具体的做法：告诉 AI 要做什么，运行生成结果，把报错贴回去，再继续提修改要求。他提到自己经常直接点击 “Accept All”，不再阅读代码差异，后来连整个项目是怎么实现的也很难说清楚。

[Martin Fowler 对 Vibe Coding 的解释](https://martinfowler.com/bliki/VibeCoding.html)也把“不再关注生成的代码”视为这个概念的分界线。因此，下面两种情况要分开：

### 2.2 业务开发中的“完成”比页面能运行严格得多

一个业务需求通常同时受产品规则、接口合同、权限、历史数据、公共组件、监控和发布流程约束。以本项目的“问题作品未移除前禁止提交”为例，页面弹出提示只是其中一个现象。真正完成至少要确认：

1. 命中规则的作品被正确识别；
2. 页面给出正确的原因；
3. 抽屉面板没有被关闭；
4. 二次确认弹窗没有打开；
5. 发奖请求没有发送；
6. 移除问题作品后可以继续提交；
7. 币、券、人工提报等入口没有出现回归。

如果只给 AI 一句“有不激励作品时禁止提交并显示提示”，它很可能先实现一个前端判断。页面看起来已经好了，但请求是否仍在其他回调中发出、数据字段是否来自真实接口、其他入口是否复用了同一逻辑，都还没有答案。

这正是 Vibe Coding 和业务研发的差别：前者根据可见效果继续迭代，后者需要逐条证明业务规则成立。

### 2.3 Vibe Coding 在业务开发中的具体问题

| 研发环节 | Vibe Coding 的常见做法 | 放进业务项目后的问题 | 本项目中的对应场景 |
|---|---|---|---|
| 需求理解 | 把一句需求直接交给 AI 开始改代码 | 需求中的角色、例外、非目标和禁止行为没有展开，AI 会用自己的理解补空白 | “禁止提交”不能只显示提示，还要验证请求未发送、二次确认未打开 |
| 代码范围 | 根据搜索结果修改最像的组件 | 容易漏掉 Store、Service、公共组件和其他入口，也可能顺手重构无关文件 | DOU+币、DOU+券、人工提报和批量上传存在多条链路 |
| 接口和数据 | 根据页面字段猜类型，或先用一份 Mock 数据跑通 | 字段名、枚举、分页、空值和权限可能与真实接口不一致 | if_not_incentive、reward config、page/page_num 必须以 BAM 生成的接口定义和真实回包为准 |
| 测试 | 页面能打开、点击有反应就继续下一项 | 通常只覆盖正常路径，没有确认请求是否发送，也没有检查异常状态、旧功能和其他入口 | Mock 可以显示两页数据，但不能证明真实接口有多页和排序能力 |
| 设计还原 | 根据截图或口头描述反复调样式 | 缺少 Figma 基准和逐项对比，局部看着接近，表头顺序、视口适配和交互状态仍可能不对 | 剔除明细表头、占位文案和低分辨率操作列都经历过返修 |
| 线上环境 | 让 AI 自己运行命令、调用接口，报错后继续尝试 | 可能误用生产账号、扩大写权限、重复执行保存或发奖动作 | 发奖、导出、保存只能在明确授权和安全拦截下验证 |
| 验收 | AI 总结“功能已完成” | 总结来自代码和当前会话，不代表后端、数仓、埋点平台已经产生结果 | 前端调用日志方法不等于 DA 平台已经收到点击或曝光数据；页面拦截请求不等于真实事务成功 |
| 团队维护 | 只保留最终代码，不记录为什么这样改 | 评审者难以还原需求依据，后续 AI 也会重复猜测，返工成本逐步增加 | 需要保留需求、任务、用例、证据和未决风险之间的对应关系 |

这些问题有一个共同原因：AI 看到的是本轮对话和它读取到的局部代码，业务交付依赖的事实却分散在 PRD、设计稿、接口平台、仓库规范、测试环境和外部数据平台中。没有流程约束时，AI 会在缺信息的地方继续生成，而不会自动停下来等事实补齐。

NIST 指出，生成式 AI 可能用很确定的语气给出错误内容。[NIST AI 600-1](https://nvlpubs.nist.gov/nistpubs/ai/NIST.AI.600-1.pdf)列出的这一问题，在代码开发中常表现为猜错接口、误解旧逻辑，或者给出一套能编译但不符合业务规则的实现。代码能运行，只能排除一部分语法和运行错误。

### 2.4 代码生成越快，评审和返工越容易成为瓶颈

Vibe Coding 的即时反馈很有吸引力：一句话生成页面，看到问题再说一句，几轮后就能得到一个 Demo。但在已有业务仓库中，每轮修改都可能扩大代码差异。开发者没有同步理解代码时，后面通常会发生两件事：

- AI 为了修一个局部问题继续叠加判断，代码逐渐偏离仓库原有设计；
- 到评审或联调阶段，团队需要一次性理解大批生成代码，节省的编码时间转移成了审查和返工时间。

[DORA 的生成式 AI 软件开发研究](https://dora.dev/ai/gen-ai-report/report/)观察到了这种差异：AI 使用与个人主观生产力提升相关，但在其样本中，AI 采用率增加 25% 与交付吞吐下降 1.5%、交付稳定性下降 7.2% 相关。报告将较大的变更批次和更重的评审负担列为解释因素。这个结果是统计关联，不能直接套到每个团队；它至少说明，生成速度不能单独代表交付效率。

对业务团队更有用的指标是：需求到验收用了多久、第一次验证通过多少、返工几轮、线上是否出现逃逸问题，以及人工花了多少时间审查 AI 结果。

### 2.5 连接真实工具后，试错会产生真实后果

只在本地生成代码时，错误通常还能通过 Git 回退。AI 一旦可以调用数据库、发布平台、云服务或业务后台，连续试错就可能产生重复写入、错误发布、数据泄露和权限越界。

[OWASP LLM06:2025 Excessive Agency](https://genai.owasp.org/llmrisk/llm062025-excessive-agency/)把这类风险归因于工具功能过多、账号权限过大，以及高影响操作缺少人工确认。对研发工作流来说，对策很具体：

- 分析阶段默认只读；
- 每个任务只开放需要的工具和文件；
- 写操作记录目标、参数和执行人；
- 发布、删除、发奖等操作需要明确授权；
- 重试前先查询上一次操作是否已经成功；
- 线上证据不足时保留未完成状态。

这些限制不能只写在自然语言指令里。真正的权限检查要由执行工具的程序完成。

### 2.6 AI 研发工作流补上的内容

AI 研发工作流保留了 Vibe Coding 快速生成和即时反馈的优点，同时给业务开发补上交付所需的检查点：

| Vibe Coding 中容易省略的步骤 | 工作流中的处理 |
|---|---|
| 一句话需求直接改代码 | 先拆需求范围、例外、非目标和验收条件 |
| AI 猜接口字段 | 使用接口生成合同和真实回包 |
| 一次生成大批代码 | 按任务限定文件范围，分批实现和审查 |
| 页面看着正常 | 按测试用例检查页面、请求、DOM、日志，以及本不该发生的动作 |
| Mock 跑通即结束 | 写清 Mock 能证明什么，再用真实环境复测 |
| AI 说已经完成 | 验收报告只根据可定位证据给出结论 |
| 遇到问题继续随机尝试 | 记录问题所属阶段，修正上游需求、计划或用例 |
| 高风险操作直接执行 | 由权限、审批和安全拦截控制 |

[Thoughtworks 关于人和 Agent 研发循环的分析](https://martinfowler.com/articles/exploring-gen-ai/humans-and-agents.html)提出，生产软件还要考虑性能、稳定性、安全、成本和合规，人的工作重点可以从逐行编写代码转向设计和管理这套反馈过程。对于本报告所讨论的业务研发，这个过程就是后续章节展开的 AI 研发工作流。

---

## 三、核心思路：确定性外壳 + 受限 Agent 内核

### 3.1 概念边界

| 概念 | 定义 | 负责什么 | 不负责什么 |
|---|---|---|---|
| LLM | 基于上下文产生下一输出的概率模型 | 理解、生成、比较、局部决策 | 真实执行、持久状态、权限、安全和最终事实 |
| Tool | 对环境能力的结构化接口 | 读取、写入、运行、查询 | 自主规划和业务完成判定 |
| Runtime / Host | 接收 Tool Call 并执行的宿主 | Schema、权限、超时、隔离、日志、结果返回 | 代替业务 Spec |
| Workflow | 预定义阶段、路由和状态转换 | 可预测的流程和 Gate | 开放环境中的所有动态决策 |
| Agent | 模型在循环中动态选择动作和工具 | 处理路径未知、需要观察后再决策的任务 | 无边界自治 |
| Harness | 将模型、上下文、工具、状态、权限、反馈装配成系统 | 可靠运行、恢复、验证、审计 | 消除模型不确定性 |
| Spec | 目标、约束、非目标、验收和证据合同 | 定义“做什么”和“怎样算完成” | 替代实现方案与真实验证 |

[Anthropic 对 Workflow 与 Agent 的区分](https://www.anthropic.com/engineering/building-effective-agents)是：Workflow 通过预定义代码路径编排模型与工具；Agent 由模型动态决定过程和工具使用。对研发交付而言，两者不是二选一，而是嵌套关系：

> 主交付链使用确定性 Workflow；每个阶段内部仅把路径不确定的局部问题交给 Agent。

### 3.2 总体公式

~~~text
AI Agent = Model + Harness

Harness =
  Context Management
  + Tools & Execution Runtime
  + State & Orchestration
  + Memory & Skills
  + Permissions & Approvals
  + Validation & Evaluation
  + Persistence & Observability
~~~

进一步落到研发交付：

~~~text
可信交付 =
  明确 Spec
  × 可执行 Task
  × 受控 Action
  × 真实 Observation
  × 可定位 Artifact
  × 独立 Validation
  × 严格 Gate
~~~

这里使用乘法而不是加法，是为了表达短板效应：任何关键环节为零，都不能得出“已交付”。

### 3.3 五层架构

| 层级 | 核心职责 | 典型内容 | 主要失败模式 |
|---|---|---|---|
| 模型层 | 概率性判断和候选生成 | 需求分析、方案、下一动作、缺陷解释 | 幻觉、过早完成、路径漂移 |
| 上下文层 | 为当前决策组装最小高信号信息 | Spec 切片、当前 Task、相关代码、最近 Observation | 上下文污染、规则冲突、遗漏关键事实 |
| 执行层 | 与环境发生真实交互 | 文件、CLI、API、Browser、MCP、CI | 越权、副作用、超时、错误重试 |
| 编排层 | 管理生命周期、状态和路由 | 阶段、队列、Checkpoint、重试、恢复、预算 | 循环失控、重复执行、状态不一致 |
| 反馈与控制层 | 验证、评估、安全和完成判定 | Test、Validator、Evaluator、Guardrail、Approval、Trace | 自评代替证据、漏测、误放行 |

Harness 不是“第六层”，而是把五层横向装配起来的工程系统。

### 3.4 两层循环

~~~mermaid
flowchart TB
    S["Spec / Goal"] --> P["计划与阶段选择"]
    P --> C["组装当前上下文"]
    C --> M["模型判断下一 Action"]
    M --> R["Runtime 权限与参数检查"]
    R --> T["Tool 执行"]
    T --> O["Observation / Artifact"]
    O --> V{"局部验证通过？"}
    V -->|否，可修复| C
    V -->|否，需上游或人工| H["Repair / Pause and Ask"]
    H --> P
    V -->|是| G{"全局 Gate 通过？"}
    G -->|否，继续下一 Task| P
    G -->|是| A["Accept / Done"]
~~~

- **内循环**：Model → Action → Tool → Observation → Next Decision，解决单个步骤中“下一步做什么”的不确定性。
- **外循环**：Spec → Plan → Execute → Validate → Replan/Accept，维护长期目标、依赖、预算和完成条件。

[ReAct 原始论文](https://arxiv.org/abs/2210.03629)说明了推理、行动和环境观察交错的价值，但 ReAct 只解决 Action 粒度的动态决策，不能替代全局状态、权限和验收。

### 3.5 从最小机制开始

工作流不应默认堆叠复杂 Agent 范式，应按不确定性所在粒度选择：

| 问题 | 最小机制 | 使用条件 |
|---|---|---|
| 单次生成已足够 | Prompt + Retrieval + Validator | 任务短、输入稳定、无副作用 |
| 路径固定、节点中有判断 | Workflow | 阶段清晰、强调一致性 |
| 下一工具依赖最新 Observation | ReAct | 开放检索、调试、动态排障 |
| 多阶段、依赖和中间产物复杂 | Plan-and-Execute + State | 长任务、需要可恢复进度 |
| 一次完整尝试后需根据反馈重试 | Reflexion 类 Trial Loop | 有可靠 Evaluator，重试有价值 |
| 需要比较多个候选路径 | Tree of Thoughts 类搜索 | 方案选择价值高于额外成本 |
| 子问题独立且上下文可隔离 | 受控并行 / Subagent | 并行收益明确、合并规则确定 |

[Reflexion](https://arxiv.org/abs/2303.11366)通过语言反馈和情景记忆影响下一次 Trial；[Tree of Thoughts](https://arxiv.org/abs/2305.10601)通过候选路径、评价、前瞻和回溯处理搜索问题。它们是不同控制粒度的机制，不是每个研发任务都必须采用的固定套餐。

---

## 四、工作流的四个控制支点

### 4.1 Fact：事实优先

Agent 必须区分：

- 用户明确输入；
- 仓库和平台可读取事实；
- 合理推断；
- 尚未确认的假设。

执行前优先用只读工具获取事实。不能读取时，必须登记不确定性；会影响路径、业务口径或高风险操作时，进入 Pause and Ask，而不是自行补齐。

### 4.2 State：状态显式

State 不是完整聊天记录，而是驱动下一步执行所需的结构化状态。建议最小字段：

~~~yaml
task_id: "7306602080"
goal: "内容活动激励管控线上化"
current_phase: "accept"
mode: "MOCK_PREVIEW"
constraints:
  - "高风险写接口不得在真实环境直接执行"
plan:
  current_task: "TASK-008"
  completed_tasks: ["TASK-001", "TASK-002"]
evidence:
  verified_cases: []
  pending_real_assertions: []
gate:
  result: "BLOCKED"
  p0_blockers: []
  p1_risks: []
resume:
  command: "/delivery:accept"
  point: "补齐真实样本与 DA/UV 证据后"
budget:
  retry_count: 0
  max_retries: 2
~~~

消息历史、Checkpoint、长期 Memory、规则文件和 Artifact Store 必须分开：

| 载体 | 用途 |
|---|---|
| Messages | 当前对话与最近工具交互 |
| State / Checkpoint | 当前执行快照和恢复 |
| Store / Memory | 跨任务可复用的长期事实或经验 |
| Rule / Skill | 稳定行为规范和阶段协议 |
| Artifact | 需求、计划、代码、测试和证据的正式产物 |

### 4.3 Artifact：产物优先

阶段结论不能只存在于聊天中。每个正式结论应落到可定位、可版本化的产物，并具备：

- 来源；
- 创建或更新时间；
- 适用阶段；
- 状态；
- 结论；
- 证据链接；
- 未决项；
- 下一动作和恢复点。

GitHub [Spec-Driven Development](https://github.github.com/spec-kit/concepts/sdd.html)以 **Spec → Plan → Tasks → Implement** 的阶段产物传递结构化上下文；[Spec Persistence Models](https://github.github.com/spec-kit/concepts/spec-persistence.html)进一步区分 spec-first、spec-anchored 和 spec-as-source。它说明 Spec 可以成为持续上下文和变更基线，但不意味着 Spec 天然正确，也不意味着 SDD 是唯一可行方法。

### 4.4 Gate：门禁优先

Gate 的职责是回答“是否有足够证据进入下一阶段”，不是复述 Agent 的自我判断。

建议统一输出：

~~~text
Agent Gate Summary
- Phase:
- Result: PASS | AUTO_FIX_REQUIRED | NEEDS_TARGETED_REVIEW | BLOCKED
- Evidence Level: HIGH | MEDIUM | LOW
- Completed:
- P0 Blockers:
- P1 Risks:
- Low-confidence Conclusions:
- Artifact Links:
- Next Command:
- Resume Point:
~~~

风险分级：

- **P0_BLOCKER**：会改变需求、架构、真实写入、权限或验收结论；必须暂停。
- **P1_RISK**：不阻止当前步骤，但必须登记并在后续 Gate 回收。
- **P2_NOTE**：普通注意事项，写入阶段文档。

---

## 五、当前 .trae 工作流的完整实现

### 5.1 目录就是 Harness 的可执行架构

| 目录或文件 | 角色 | 工程意义 |
|---|---|---|
| **AGENTS.md** | 总原则和路由合同 | 稳定的系统级行为约束 |
| **commands/** | 薄路由层 | 解析入口，决定调用哪个阶段 Skill |
| **skills/** | 阶段权威协议 | 定义输入、步骤、产物、Gate 和失败路由 |
| **agents/** | 长上下文专业角色 | PRD、Plan、Design、Reviewer 等领域判断 |
| **scripts/** | 确定性检查 | 产物完整性、阶段门禁、静态或机械校验 |
| **artifacts/** | 交付事实源 | 保存阶段产物、证据和恢复信息 |
| **DELIVERY_STATE.md** | 显式状态 | 当前阶段、结果、风险、阻塞和下一动作 |

职责边界是：

- Command 不承载复杂业务逻辑；
- Skill 是阶段流程的唯一权威合同；
- Agent 负责专业判断，但不能自行放行；
- Script 负责可确定的机械判定；
- Artifact 负责可审计事实；
- State 负责跨阶段续跑。

### 5.2 主流程

~~~mermaid
flowchart LR
    I["Init"] --> P["PRD"]
    P --> B["BAM"]
    B --> L["Plan"]
    L --> T["Task"]
    T --> C["Code"]
    C --> V["Verify"]
    V --> D["Design"]
    D --> A["Accept"]

    T -. "接口未就绪" .-> M["Mock"]
    M -. "恢复原 Case" .-> V
    V -. "共同误读" .-> R["Repair"]
    D -. "可执行 UI 差异" .-> F["Design Auto Fix"]
    F -. "复跑原 Case" .-> D
    V -. "Mock → Real" .-> X["MTR"]
    C -. "评审 / 覆盖率" .-> Q["BITS"]
    A -. "证据不足" .-> H["Pause / 补证 / 重验"]
~~~

### 5.3 阶段合同

| 阶段 | 关键输入 | Agent / 程序动作 | 核心产物 | Gate 重点 | 失败路由 |
|---|---|---|---|---|---|
| Init | 需求链接或描述、仓库 | 建工作区、拉取需求源、记录输入 | prd-source、inputs、intake、task-space | 来源与工作区就绪 | 补输入或暂停 |
| PRD | 原始需求、设计源、已有代码 | 原子化需求、识别非目标、P0/P1、UI Source | PRD 分析、不确定性台账、UI Source Map | 无影响规划的 P0 | Pause and Ask |
| BAM | 分支证据、接口变更 | Preflight、接口同步、生成类型与方法、清理 | BAM evidence、sync report | 合同与生成结果闭合 | 回 PRD 或修接口配置 |
| Plan | PRD、BAM、设计、代码事实 | 定位模块、方案、依赖、验证策略、风险 | tech-plan | READY 或确认 PARTIAL_READY | 回 PRD/BAM |
| Task | Plan、原子需求、验收 | 拆可执行 Task 和 Test Case，建立映射 | delivery-task、test-case-matrix | 覆盖审计和可执行性 | 回 Plan |
| Code | 当前 Task、允许路径、验证命令 | 串行实现、静态检查、非浏览器测试、独立 Review | implementation-log、review packet | 每 Task 实现与审查通过 | code-fix 或回 Task |
| Verify | Test Case Matrix、运行环境 | 逐 Case 采集命令、Network、DOM、截图和负向证据 | debug-verification、case ledger | Case Evidence Coverage | Mock、code-fix、环境修复 |
| Design | Figma 源、运行截图、DOM | screenshot-first 对比，解释结构和样式差异，逐 Case 返修 | design-alignment、rework task | 每 Case 归档，无可执行 Blocker | Mock 或 Design Auto Fix |
| Accept | 全部阶段产物和遗留风险 | 独立 Reviewer 聚合需求覆盖、证据、设计与风险 | acceptance-report、MR 草稿 | 真实证据与风险全部闭合 | BLOCKED，补证后重跑 |

### 5.4 为什么 PRD 在 BAM 之前

当前流程采用 **PRD → BAM → Plan**，原因是：

1. PRD 先确认业务目标、范围、原子需求和不确定性；
2. BAM 再根据已确认需求生成或同步接口合同；
3. Plan 同时消费业务合同和接口合同，形成可执行技术方案。

如果先同步接口再理解需求，可能围绕错误范围生成无用合同；如果跳过 BAM 直接 Plan，则容易在代码阶段手写路径、字段或类型。

### 5.5 Task 与 Test Case 必须共同生成

Task 只回答“怎么实现”，Test Case 回答“怎样证明”。两者应共享 Requirement ID：

~~~yaml
requirement_id: "AR-013"
task_id: "TASK-006"
case_id: "TC-026"
preconditions:
  - "提报列表含不激励项"
steps:
  - "点击提交并投放"
positive_assertions:
  - "显示阻断原因"
negative_assertions:
  - "二次确认弹窗未打开"
  - "发奖请求未发送"
visual_assertions:
  - "Drawer 和候选行保持"
evidence_required:
  - "screenshot"
  - "network-no-call"
  - "dom-state"
real_boundary:
  - "不执行线上发奖写入"
~~~

这里最关键的是负向断言。对于“禁止提交”类需求，只证明 Toast 出现是不够的，还必须证明：

- 不进入下一状态；
- 不关闭当前容器；
- 不产生敏感请求；
- 不发生真实副作用。

### 5.6 Code 阶段：按 Task 串行、按边界授权

每个 Task 的执行包应包含：

- Requirement / Task / Case 映射；
- 允许与禁止修改路径；
- 相关 Spec、Plan、BAM、设计和代码切片；
- 必须运行的检查；
- 风险点；
- Targeted Diff；
- 独立 Reviewer 需要读取的 Review Packet。

代码 Agent 不应同时承担浏览器验收、Mock 生成和最终 Gate。把角色拆开，可以避免“实现者用自己的叙述证明自己的结果”。

### 5.7 Verify 阶段：逐 Case 建立证据账本

每个 Case 应至少记录：

| 字段 | 说明 |
|---|---|
| Case ID / Requirement ID | 可回溯到需求 |
| Preconditions | 环境、账号、数据和模式 |
| Action | 实际执行步骤 |
| Expected | Spec 中的预期 |
| Observation | 实际页面、Network、DOM、日志 |
| Evidence | 截图、命令、请求、文件定位 |
| Boundary | Mock、真实只读、真实写入或外部平台 |
| Result | PASS / PARTIAL / BLOCKED / N/A |
| Residual Risk | 尚不能证明的断言 |

完成判定必须检查 Outcome，而不是 Agent 的自然语言结论。[Anthropic 的 Agent Evals 指南](https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents)明确区分 transcript 和 outcome：Agent 说“预订成功”只是轨迹内容，真实数据库中存在预订才是结果。

### 5.8 Mock 与 MTR：并行开发和真实验收分层

Mock 的正确定位是解除依赖，不是替代后端：

| Mock 可以证明 | Mock 不能证明 |
|---|---|
| 前端请求参数、分支和消费逻辑 | 真实后端字段和权限 |
| 空态、异常态、分页和视觉状态 | 真实数据分布和跨系统事务 |
| UI 对合同数据的展示 | 数仓核算、DA/UV 入库 |
| 高风险写入前的前端行为 | 线上写入的真实副作用 |

MTR（Mock-to-Real）负责：

1. 清理 Mock 参数和拦截；
2. 使用真实 Request / Response；
3. 对比字段、页面和权限；
4. 回收 Mock 无法证明的真实断言；
5. 记录仍需外部系统证明的事项。

因此：

> MOCK_VERIFIED ≠ REAL_ENV_VERIFIED ≠ DELIVERY_ACCEPTED

### 5.9 Design：截图优先、解释随后、逐 Case 返修

Design Gate 的证据链应为：

1. Figma screenshot 或 node data 提取目标可见结构；
2. Runtime screenshot 记录实际状态；
3. screenshot-first 判断是否存在可见差异；
4. DOM、bbox、computed style 用于解释差异原因；
5. 当前 Case 物化 Design Rework Task；
6. 只修改允许范围；
7. HMR / Browser 复核原 Case；
8. 归档后进入下一 Case。

运行截图不能替代 Figma 基准；DOM 数值相似也不能替代视觉结果。每个 Case 严格串行，是为了防止多个 UI 问题批量修改后无法判断哪次变更解决了哪个差异。

### 5.10 Repair：回退到最早漂移点

当验收问题来自需求、计划和用例的共同误读时，只改代码会留下上游错误。Repair 应：

1. 定位最早出现漂移的阶段；
2. 修正对应 Spec / Plan / Task / Test Case；
3. 沿依赖链更新下游；
4. 重新执行受影响的 Code、Verify、Design；
5. 保存问题、根因、修复和回归断言。

这相当于把一次失败从“临时聊天经验”升级为可复用流程资产。

### 5.11 BITS：辅助质量闭环，不替代主 Gate

BITS 用于：

- 开发任务关联；
- Codebase Assistant / Aime / CodeGuard 评审问题处理；
- 覆盖率拉取与优化；
- 线上 UI 覆盖与报告刷新。

但评论全部关闭、检查全部通过或覆盖率达标，只能证明对应质量维度，不能替代 Verify、Design 和 Accept。对 AI 审查意见也必须独立判断：成立则修复，不成立则基于生成合同、代码事实或测试证据拒绝。

### 5.12 持久化、恢复与幂等

[LangGraph Persistence](https://docs.langchain.com/oss/javascript/langgraph/persistence)通过 Checkpoint 和 Thread 保存每一步状态，支持人机协作、记忆、时间旅行和容错；[LangGraph Interrupts](https://docs.langchain.com/oss/javascript/langgraph/interrupts)强调恢复时使用同一 thread_id，节点可能从头重放。

这对研发 Agent 有三个实现要求：

1. Interrupt 前的副作用必须幂等，或放到单独节点；
2. 写操作必须使用 idempotency key、执行记录或结果检查；
3. 恢复不能只依赖“上次执行到第几行”，而要判断动作是否已经真实完成。

建议工具合同至少包含：

~~~yaml
name: "update_work_item"
purpose: "更新指定工作项字段"
input_schema: {}
output_schema: {}
risk_level: "high"
side_effect: true
permission_scope: "current_user/current_project"
timeout_ms: 10000
idempotency_key: "task_id + operation_id"
retry_policy: "only_on_timeout_after_readback"
approval: "required"
audit_fields:
  - "actor"
  - "target"
  - "before"
  - "after"
~~~

### 5.13 MCP 的正确定位

[Model Context Protocol](https://modelcontextprotocol.io/docs/getting-started/intro)是连接 AI 应用与外部数据源、工具和工作流的开放标准。它解决连接和互操作问题，但不自动保证：

- 工具语义清晰；
- 权限最小；
- 返回数据真实；
- 调用安全；
- 业务结果正确。

因此，MCP Server 仍必须服从 Runtime 权限、Tool Schema、日志、Approval、Validator 和业务 Gate。

### 5.14 最小编排器实现

工作流不依赖某个特定框架。下面的伪代码展示了最小实现中哪些部分必须由程序控制，哪些部分可以交给模型：

~~~typescript
async function runDelivery(threadId: string) {
  let state = await checkpoint.load(threadId);

  while (!state.done) {
    // 1. 确定性：根据当前状态选择合法阶段
    const phase = routeByState(state);
    const contract = await loadSkillContract(phase);
    const specSlice = await loadRequiredArtifacts(contract.inputs);

    // 2. 确定性：校验前置产物与 P0
    const precheck = validatePrerequisites(state, contract, specSlice);
    if (precheck.blocked) {
      state = persistBlocker(state, precheck);
      await checkpoint.save(threadId, state);
      return interruptForHuman(state.resume);
    }

    // 3. 上下文工程：只加载当前阶段和 Task 的高信号信息
    const context = buildContext({
      goal: state.goal,
      constraints: state.constraints,
      contract,
      specSlice,
      currentTask: state.currentTask,
      recentObservations: state.recentObservations,
    });

    // 4. 概率性：模型提出候选动作，不直接执行
    const candidate = await model.decide(context);

    // 5. 确定性：Runtime 校验工具、参数、范围、预算和审批
    const decision = authorize(candidate, {
      toolAllowlist: contract.tools,
      writablePaths: contract.writablePaths,
      riskPolicy: contract.riskPolicy,
      budget: state.budget,
    });
    if (!decision.allowed) {
      state = recordRejectedAction(state, decision);
      continue;
    }

    // 6. 真实执行；写操作使用 operationId 保证幂等
    const observation = await runtime.execute(decision.action, {
      operationId: state.operationId,
      timeout: contract.timeout,
    });

    // 7. 先持久化事实，再让模型继续推理
    state = appendObservation(state, observation);
    await artifactStore.write(observation.artifacts);
    await checkpoint.save(threadId, state);

    // 8. 独立验证环境 Outcome，而不是采信模型自述
    const validation = await validators.run({
      spec: specSlice,
      state,
      observation,
    });
    state = applyValidation(state, validation);

    // 9. Gate 决定进入下一阶段、返修、暂停或完成
    state = applyGateTransition(state, contract.gate, validation);
    await checkpoint.save(threadId, state);
  }

  return buildAcceptanceReport(state);
}
~~~

实现中的关键顺序是：**授权先于执行，事实持久化先于下一轮推理，独立验证先于状态跃迁。**

### 5.15 Human-in-the-Loop：提问能力不等于持久等待

普通消息中的“请用户确认”只能表达交互意图；真正可恢复的 HITL 还需要：

1. 中断前保存 Checkpoint；
2. 保存 blocker、所需答案、推荐选项和影响；
3. 保存 thread_id、resume_command 和 resume_point；
4. 恢复时验证用户回答是否仍适用于当前代码和环境；
5. 从确定性节点重入，不依赖模型记住旧对话；
6. 中断前已经发生的副作用可识别、可回读、可幂等。

因此，Pause and Ask 的最小产物不是一句问题，而是：

~~~yaml
interrupt:
  reason: "缺少真实写接口授权"
  blocker_id: "P0-REAL-WRITE-001"
  question: "是否允许在隔离账号执行一次真实写入？"
  impact:
    approve: "可验证真实事务"
    reject: "维持 PARTIAL / BLOCKED"
  recommended: "reject"
  checkpoint_id: "accept-20260720-001"
  thread_id: "7306602080"
  resume_command: "/delivery:accept"
  resume_point: "REAL_WRITE_APPROVAL"
~~~

### 5.16 并行与多 Agent 的使用条件

并行不是默认优化。只有同时满足以下条件才适合 fan-out：

- 子任务相互独立；
- 输入切片明确；
- 不竞争同一文件、状态或浏览器会话；
- 结果有确定性 reducer；
- 失败可以单独重试；
- 合并成本低于并行收益。

适合并行的工作：

- 不同资料源的只读检索；
- 不同模块的影响分析；
- 互不重叠的测试执行；
- 独立 Reviewer 的多视角检查。

不适合直接并行的工作：

- 修改同一文件或同一状态；
- 共享浏览器 active case；
- 串行依赖的 PRD、Plan、Task；
- 有顺序要求的数据库写入；
- 发布、删除、发奖等高风险动作。

推荐拓扑是：

~~~mermaid
flowchart LR
    O["Orchestrator"] --> R1["只读分析 A"]
    O --> R2["只读分析 B"]
    O --> R3["独立 Reviewer"]
    R1 --> F["Deterministic Reducer / Fan-in"]
    R2 --> F
    R3 --> F
    F --> G{"冲突、证据和 Gate 检查"}
    G -->|通过| W["单一受权写节点"]
    G -->|不通过| H["人工或定向补证"]
~~~

高风险写入应放在 fan-in 和审批之后，由单一节点执行，避免多个 Agent 基于不同上下文同时产生不可逆副作用。

---

## 六、QA 与评估体系

### 6.1 六种机制不能混用

| 机制 | 回答的问题 | 示例 |
|---|---|---|
| Test | 已知输入下结果是否满足确定断言 | 单测、集成测试、E2E |
| Validator | 结构、格式、状态是否合规 | Artifact 完整性、Schema、Coverage |
| Evaluator / Grader | 复杂输出质量如何 | 方案质量、相关性、UI 语义 |
| Guardrail | 动作是否允许 | 路径白名单、敏感信息、命令限制 |
| Approval | 谁对高风险决策负责 | 发布、真实写入、删除、跨系统变更 |
| Trace / Observation | 实际发生了什么 | Tool Call、日志、Network、Screenshot |

“有 Trace”不等于“通过 Test”；“Evaluator 评分高”不等于“获得 Approval”；“工具返回 ok”不等于“业务 Outcome 成立”。

### 6.2 证据金字塔

从低到高，验证应逐层增加真实性：

1. 静态检查：格式、Lint、Typecheck；
2. 单元测试：函数与组件局部行为；
3. 构建与集成：模块和依赖可用；
4. 浏览器运行：页面、DOM、Network、Console；
5. 设计证据：Figma 与 Runtime 对齐；
6. 真实只读：真实接口、真实权限、非空样本；
7. 真实写入或事务：在授权和隔离条件下验证副作用；
8. 外部平台：数仓、DA/UV、审批或运营平台回收；
9. 交付验收：需求覆盖、证据、风险和遗留项整体判断。

高层证据不能总被低层证据替代。例如：

- 单测通过不能证明页面真实可用；
- Mock 多页不能证明真实接口有多页数据；
- 前端调用 logger 不能证明 DA 平台已入库；
- 请求被浏览器拦截不能证明后端事务成功。

### 6.3 Agent Eval 的最小单位

参考 [Anthropic Agent Evals](https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents/)，工作流评估应定义：

- **Task**：输入和成功标准；
- **Trial**：对同一 Task 的一次尝试；
- **Grader**：一个或多个评分器；
- **Assertion**：具体检查；
- **Transcript**：完整轨迹；
- **Outcome**：环境最终状态；
- **Evaluation Harness**：运行、记录、评分和汇总基础设施。

研发工作流不能只评估最终文档写得是否流畅，还要评估：

- 是否选择了正确工具；
- 是否遵守权限和路径；
- 是否在失败后回到正确阶段；
- 是否重复执行副作用；
- 是否准确识别证据边界；
- 是否在证据不足时停止；
- 多次 Trial 的成功率与方差。

### 6.4 建议的回归评估集

| 类别 | 典型用例 |
|---|---|
| 需求 | 模糊需求是否触发提问；非目标是否被误实现 |
| 计划 | 生成合同是否被手写覆盖；变更范围是否过宽 |
| 工具 | 越权路径、危险命令、超时、部分成功、重复执行 |
| Code | 正确修复、错误修复、测试缺失、生成文件误改 |
| Verify | 正向通过、负向 no-call、环境失败、Mock/Real 混淆 |
| Design | 缺 Figma 源、截图差异、DOM 数值误导、返修复跑 |
| Accept | 证据缺失但 Agent 声称完成；P0/P1 未闭合 |
| Recovery | Interrupt 后恢复、节点重放、幂等和重复副作用 |

---

## 七、案例：内容活动激励管控线上化

### 7.1 业务与工程难点

项目覆盖 DOU+币、DOU+券、人工提报、批量上传、剔除明细、规则跳转与埋点等多条链路。难点不只是页面开发，而是：

- 处罚作者或作品不能进入最终激励核算；
- 多种奖励类型的字段、筛选和分页合同不同；
- 异常项未移除前必须阻止提交；
- 后端、真实样本和外部平台证据非同步就绪；
- UI 必须与设计稿逐 Case 对齐；
- 发奖、导出、保存属于高风险真实写入；
- 最终结论涉及前端、后端、数仓和 DA/UV 多个系统。

### 7.2 可核验结果

| 维度 | 结果 | 可证明的价值 |
|---|---:|---|
| 需求工程 | 17 条原子需求建立实现与测试映射 | 降低需求遗漏 |
| 接口 | 4 个新增、1 个变更接口进入 BAM 合同 | 减少手写字段和路径漂移 |
| 任务执行 | 8 个主体 Task；历史记录 45/45 实施步骤完成 | 执行可追踪 |
| 测试设计 | 初版 32 个 Case，Repair 后当前矩阵 34 个 | 用例可随反馈演进 |
| 设计质量 | 13 个 Design Case 归档；7 组返修关闭 10 项 Blocker | UI 差异形成工程闭环 |
| 代码评审 | 38/38 评论线程关闭；9/9 检查通过 | 评审可对账 |
| 覆盖率 | 44.25% → 97.03%，提升 52.78 个百分点 | 可达分支验证增强 |
| 真实只读 | DOU+币返回 6 条，DOU+券返回 3 条 | 部分真实链路已回收 |
| 最终门禁 | BLOCKED / NOT_READY_FOR_DELIVERY | 证据不足时未错误放行 |

数字口径需要版本化说明：32 是 Task 初版 Case 基线，34 是 Repair 与补证后的当前总量；不能把二者当作同一时点的冲突统计。

### 7.3 代表性闭环一：把“禁止提交”转成负向证据

需求不是只验证提示文案，而是建立四项断言：

1. 出现阻断原因；
2. Drawer 保持；
3. 二次确认未打开；
4. 发奖请求未发送。

这比传统“页面点一下、看到 Toast 即通过”更接近业务风险，因为真正危险的是异常项仍触发发奖。

### 7.4 代表性闭环二：Mock 推进，但不冒充真实验收

在后端未完全就绪时，Mock 覆盖前端请求、消费、空态、异常态和多页状态；真实 MTR 回收 DOU+币 6 条、DOU+券 3 条只读数据。

但以下断言仍未被升级为 REAL_ENV_VERIFIED：

- DOU+币真实多页分页、交互排序；
- 人工提报真实 if_not_incentive 样本与完整 reward config；
- DA/UV 平台事件入库；
- 最终数仓核算和真实发奖事务。

工作流正确地将“可继续开发”和“可以宣告交付”分离。

### 7.5 代表性闭环三：Design Auto Fix

项目通过 13 个 Design Case、7 组返修关闭 10 项可执行 UI Blocker。典型问题包括：

- 表格操作列在低分辨率下被挤出视口；
- DOU+币剔除明细的输入提示和表头顺序与设计不一致。

每个问题都经历 Figma 基准、运行截图、原因定位、Task 物化、代码修改和原 Case 复跑，而不是由模型凭视觉印象一次性批量改动。

### 7.6 代表性闭环四：独立判断 AI Review

评审阶段没有把“清空 AI 评论”当作目标。例如，Aime 建议修改 DOU+券分页 IDL，但该类型来自 BAM 生成合同，实际字段为 page/page_num。处理方式是验证生成源和调用事实，不手改生成类型，并在调用点说明约定。

这证明 AI 研发中的专业能力不是“服从 AI”，而是：

- 能定位事实源；
- 能判断意见成立性；
- 能接受正确建议；
- 能基于合同和证据拒绝错误建议；
- 能将结论写入可复查产物。

### 7.7 为什么最终 BLOCKED 仍然体现价值

当前 [.trae/DELIVERY_STATE.md](../.trae/DELIVERY_STATE.md)记录：

- current_phase = accept；
- result = BLOCKED；
- readiness = NOT_READY_FOR_DELIVERY；
- 不能升级为 REAL_ENV_VERIFIED。

剩余阻塞主要是：

- 真实多页、排序和筛选样本；
- 人工提报真实不激励字段与阻断 Toast；
- DA/UV 平台核对；
- 部分后端、数仓或真实事务证据。

如果工作流把 Mock 通过、前端 logger 调用或覆盖率达标包装成“交付完成”，才是真正失败。当前 BLOCKED 表明 Gate 独立于实现者和模型的完成冲动，能够保护业务结论。

---

## 八、外部依据与本地设计的映射

| 外部依据 | 原始结论 | 本地工作流映射 | 适用边界 |
|---|---|---|---|
| OpenAI Harness Engineering | 工程重心转向环境、意图、反馈循环和仓库可读性 | AGENTS、Skills、Scripts、Artifacts、结构化 Gate | 单个内部案例不能代表通用生产率 |
| Anthropic Building Effective Agents | Workflow 可预测，Agent 灵活；从最简单方案开始 | 主链确定性，阶段内局部 Agent | 不应把所有任务 Agent 化 |
| Anthropic Context Engineering | 上下文有限，应高信号、按需检索、持续整理 | Skill 分层、Task Context、Artifact 索引 | 更长上下文不自动更可靠 |
| GitHub Spec Kit | Spec → Plan → Tasks → Implement | PRD、Plan、Task、Code | Spec 仍需验证和变更治理 |
| ReAct / Reflexion / ToT | 分别处理行动、跨 Trial 反馈、候选搜索 | Verify 调试、Repair、方案比较 | 都不能替代权限、状态和 Gate |
| MCP | 标准化连接数据、工具和工作流 | 外部系统 Tool 接入 | 协议本身不保证语义和安全 |
| LangGraph Persistence / Interrupts | Checkpoint、Thread、恢复与重放 | DELIVERY_STATE、resume point、幂等要求 | 重放副作用必须额外治理 |
| Anthropic Agent Evals | 同时评估轨迹和环境 Outcome | Case Ledger、Evidence Audit、Accept | 模型评分需人工校准 |
| OWASP Excessive Agency | 功能、权限、自治过度导致风险 | 最小工具、白名单、Approval、Pause | Prompt 约束不能替代系统权限 |
| NIST AI 600-1 | 生成错误、信息完整性、人机配置等风险需全生命周期治理 | Fact/Inference 分离、独立验证、人工责任 | 风险措施要按场景裁剪 |
| DORA GenAI Report | 个人生产力与交付效能可能分离 | 增加系统指标，而非只统计生成量 | 研究是相关性，不是单项目因果结论 |

交叉分析可以得到三项稳定结论：

1. **可靠性来自系统，而不是单次 Prompt。**
2. **完成必须由外部 Outcome 和验收证据定义。**
3. **自治等级应随可观测性、可逆性和风险控制能力逐步提升。**

---

## 九、如何证明工作流价值

### 9.1 不能只看这些指标

以下数字有展示价值，但单独不能证明研发效率：

- 生成代码行数；
- Agent 调用次数；
- Token 消耗；
- Task / Case 数量；
- 评论关闭数；
- 单次覆盖率；
- 自述节省时间。

它们容易受到任务规模、统计口径和“为了指标而增加产物”的影响。

### 9.2 建议建立四类指标

#### 效率

- Lead Time：需求确认到可交付的总周期；
- Touch Time：人工实际投入时间；
- 阶段等待时间：后端、设计、权限、样本等待；
- 首次通过率；
- 平均修复轮次；
- 每个合格交付的模型、工具和人工成本；
- AI 独立完成率与人工接管率。

#### 质量

- Requirement Coverage；
- Case 首次通过率；
- 返工率；
- 逃逸缺陷；
- 设计差异关闭率；
- 覆盖率变化与有效断言数量；
- 评审意见成立率；
- 上线后回滚或热修次数。

#### 安全与治理

- 越权尝试次数；
- 未经审批的高风险动作；
- 重复副作用；
- 敏感信息暴露；
- Mock/Real 结论混淆；
- P0 绕过；
- 无证据 PASS；
- Artifact 与 State 不一致。

#### 可观测性与可复用性

- 阶段产物完整率；
- Evidence Coverage；
- Requirement → Task → Case → Evidence 可追踪率；
- 失败恢复成功率；
- 回归用例沉淀率；
- Skill / Script 复用次数；
- 相同问题再次发生率。

### 9.3 评估设计

要证明工作流带来的增益，建议使用可比任务做前后或对照评估：

1. 选择规模、技术栈和风险相近的需求；
2. 固定完成定义；
3. 记录传统流程和 AI 工作流的全周期数据；
4. 区分开发时间、等待时间和返工时间；
5. 同时观察速度、质量、稳定性和人工负担；
6. 至少跨多个需求和多个团队成员；
7. 对模型版本、工具版本和流程版本做记录；
8. 不把单一成功项目外推为普遍结论。

本案例目前已经有较强的质量、覆盖、追踪和风险治理证据；若要进一步证明“提效”，需要补充传统基线、全周期耗时、人工介入和返工成本。

---

## 十、常见误区与反模式

| 反模式 | 问题 | 正确处理 |
|---|---|---|
| 一个超长 Prompt 承担全部流程 | 难维护、难恢复、难定位责任 | 分阶段 Skill + 显式 State |
| 把工具调用成功当作任务完成 | 工具 ok 不等于业务 Outcome | 独立 Validator 和 Gate |
| 把聊天记录当状态库 | 上下文会压缩、污染或丢失 | Checkpoint + Artifact |
| 给 Agent 全仓库和全工具 | 选择歧义、越权和高成本 | 按 Task 渐进披露、最小工具集 |
| 只测正向路径 | 无法证明禁止、无调用和无副作用 | 负向断言 + Network no-call |
| Mock 通过即真实通过 | 无法证明后端、权限和事务 | Mock/Real Boundary + MTR |
| AI Reviewer 说什么就改什么 | Reviewer 也会误判 | 合同、代码和测试三方校验 |
| 通过增加无效测试追覆盖率 | 指标漂亮但业务价值低 | 覆盖可达业务分支和风险断言 |
| 默认使用多 Agent | 合并复杂、上下文重复、成本增加 | 只在子问题独立且收益明确时并行 |
| Prompt 中写“不要越权” | 软约束无法阻止真实工具执行 | Runtime 权限、白名单和 Approval |
| Agent 自己宣布 done | 容易提前完成 | Spec 映射到外部证据后才能放行 |
| 把 SDD 当唯一正确方法 | 忽略任务差异和 Spec 维护成本 | 按风险、规模和变化频率选择 |

---

## 十一、下一版实现建议

### 11.1 统一机器可读 State

当前 Markdown 状态便于人读，但可增加 YAML/JSON 镜像，并通过脚本校验：

- phase 与 artifact 是否一致；
- BLOCKED 是否包含 blocker 和 resume point；
- PASS 是否有 evidence；
- Mock Case 是否声明 Real Boundary；
- Accept 是否仍存在未闭合 P0/P1。

### 11.2 建立统一 Evidence Ledger

将 Requirement、Task、Case、Artifact、Evidence、Environment、Result 和 Risk 建成可查询索引，自动生成：

- 覆盖矩阵；
- 缺证清单；
- Mock-to-Real 待办；
- 最终验收摘要；
- 版本化统计口径。

这可以自动解决“初版 32 Case、当前 34 Case”一类人工对账问题。

### 11.3 把 Tool Contract 与风险等级绑定

每个工具补齐：

- 读 / 写 / 删除分类；
- 目标范围；
- 权限主体；
- 是否可逆；
- 是否幂等；
- 超时和重试；
- Approval；
- 审计字段。

风险越高，工具越应细粒度，越不能只依赖 Prompt。

### 11.4 建立离线 Eval 与线上观测

离线：

- 固定需求、代码库和环境快照；
- 多 Trial；
- 代码 Grader、模型 Grader 和人工校准；
- 同时评估 Trajectory 与 Outcome。

线上：

- 阶段耗时；
- Tool 失败；
- 人工暂停点；
- 重试和回退；
- Gate 分布；
- 逃逸缺陷；
- 模型、Skill 和规则版本。

### 11.5 渐进式自治

| 等级 | Agent 权限 | 适用场景 |
|---|---|---|
| A0 建议 | 只输出分析，不执行 | 高风险、事实不足 |
| A1 只读 | 搜索、读取、分析 | 需求、代码和证据调查 |
| A2 沙箱写 | 受限目录修改、测试 | 普通实现和修复 |
| A3 受审写 | 创建变更，人工确认提交 | 跨模块或外部系统 |
| A4 条件自治 | 低风险动作自动，高风险审批 | 评估成熟、回滚充分 |

自治升级条件应是：成功率稳定、证据充分、权限最小、动作可逆、异常可观测、回归集覆盖，而不是模型版本更大。

---

## 十二、成熟度模型

| 级别 | 能力 | 主要特征 | 下一步 |
|---|---|---|---|
| L0 对话辅助 | 生成建议和代码片段 | 依赖人工复制和判断 | 引入只读工具 |
| L1 工具增强 | 能读仓库、执行命令 | 有 Action/Observation | 增加 Spec 和 State |
| L2 Spec 驱动 | PRD、Plan、Task 产物化 | 可追踪意图 | 增加阶段 Gate |
| L3 Harness 化 | 状态机、权限、Artifact、恢复 | 可靠长任务 | 增加 Eval 和真实证据 |
| L4 证据驱动 | Case Ledger、MTR、Design、Accept | 完成可审计 | 建立组织级指标 |
| L5 受控自治 | 按风险动态授权、稳定多 Agent | 高吞吐且可治理 | 持续校准与架构治理 |

当前 **.trae** 已具备 L3～L4 的主要结构：阶段状态机、产物、门禁、Mock/MTR、逐 Case 证据和最终验收；仍需加强机器可读 State、系统化 Eval、工具风险合同和组织级效能度量。

---

## 十三、结论

AI 研发工作流的专业价值，不在于把传统步骤机械地交给模型，而在于重新分配责任：

> 让模型负责不确定性判断，让程序负责确定性流程，让工具负责真实执行，让测试与规则负责验证，让人负责高风险决策，让 Harness 保证这些部分能够长期协作。

落地时应坚持：

1. 从业务问题和完成定义开始，而不是从模型或框架开始；
2. 用 Spec 固化意图，用 State 保持连续性，用 Artifact 保存证据；
3. 主流程确定性，Agent 自治局部化；
4. 工具最小化、权限最小化、高风险动作审批；
5. 正向、负向、视觉、真实环境和外部平台证据分层；
6. Mock 解决并行效率，MTR 解决真实性；
7. Outcome 和 Gate 决定完成，模型不能自我放行；
8. 用交付周期、质量、稳定性、安全和人工负担共同衡量价值。

本案例最有说服力的结果并不是 97.03% 覆盖率或 38 条评论关闭，而是：在核心代码和多层验证已经完成后，工作流仍因真实样本和外部平台证据不足保持 BLOCKED。它证明了这套系统既能推动执行，也能在不应交付时可靠地停下来。

---

## 参考资料

1. 本地现行规范：[.trae/AGENTS.md](../.trae/AGENTS.md)
2. 本地流程图与阶段合同：[.trae/docs/delivery-framework-flow.md](../.trae/docs/delivery-framework-flow.md)
3. 本地当前状态：[.trae/DELIVERY_STATE.md](../.trae/DELIVERY_STATE.md)
4. 本地教程：[AI Agent 架构学习教程](./AI/AI%20Agent架构学习教程/README.md)
5. 本地问答：[Agent 架构问答](./QA/Agent架构问答.md)
6. 本地案例：[AI 交付过程记录](./AI交付记录-运营平台内容活动激励管控线上化交付过程记录%20%28copy%29.md)
7. OpenAI：[Harness engineering: leveraging Codex in an agent-first world](https://openai.com/index/harness-engineering/)
8. Anthropic：[Building effective agents](https://www.anthropic.com/engineering/building-effective-agents)
9. Anthropic：[Effective context engineering for AI agents](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents)
10. Anthropic：[Effective harnesses for long-running agents](https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents)
11. Anthropic：[Demystifying evals for AI agents](https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents)
12. GitHub：[What is Spec-Driven Development?](https://github.github.com/spec-kit/concepts/sdd.html)
13. GitHub：[Spec Persistence Models](https://github.github.com/spec-kit/concepts/spec-persistence.html)
14. Model Context Protocol：[What is MCP?](https://modelcontextprotocol.io/docs/getting-started/intro)
15. LangChain：[LangGraph Persistence](https://docs.langchain.com/oss/javascript/langgraph/persistence)
16. LangChain：[LangGraph Interrupts](https://docs.langchain.com/oss/javascript/langgraph/interrupts)
17. Yao 等：[ReAct: Synergizing Reasoning and Acting in Language Models](https://arxiv.org/abs/2210.03629)
18. Shinn 等：[Reflexion: Language Agents with Verbal Reinforcement Learning](https://arxiv.org/abs/2303.11366)
19. Yao 等：[Tree of Thoughts: Deliberate Problem Solving with Large Language Models](https://arxiv.org/abs/2305.10601)
20. NIST：[Artificial Intelligence Risk Management Framework: Generative Artificial Intelligence Profile](https://nvlpubs.nist.gov/nistpubs/ai/NIST.AI.600-1.pdf)
21. OWASP：[LLM06:2025 Excessive Agency](https://genai.owasp.org/llmrisk/llm062025-excessive-agency/)
22. DORA：[Impact of Generative AI in Software Development](https://dora.dev/ai/gen-ai-report/report/)
23. Andrej Karpathy：[Vibe Coding 原始帖子](https://x.com/karpathy/status/1886192184808149383)
24. Martin Fowler：[Vibe Coding](https://martinfowler.com/bliki/VibeCoding.html)
25. Kief Morris：[Humans and Agents in Software Engineering Loops](https://martinfowler.com/articles/exploring-gen-ai/humans-and-agents.html)
