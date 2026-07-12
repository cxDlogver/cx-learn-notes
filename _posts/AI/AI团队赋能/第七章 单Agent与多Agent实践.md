## 第七章 单Agent与多Agent实践

Anthropic 在《Building Effective AI Agents》里给出的主线其实非常明确：**先从最简单的可行方案开始，只有当简单方案已经证明不够用时，再增加工作流和 Agent 复杂度**。它把能力形态大致分成三层：`增强型 LLM（加工具/检索/记忆）→ 工作流（链式、路由、并行、评审循环）→ 自主 Agent`。其核心原则不是“技术越复杂越先进”，而是“复杂度必须能换来可证明的效果提升”。

### 1. 先把概念摆正：单Agent和多Agent不是“先进/落后”的关系

很多人容易陷入“多Agent比单Agent高级”的误区，实则二者是适配不同场景的方案，核心差异在于“任务拆分与协作模式”，而非技术层级的高低。

#### 1.1 单Agent是什么

单Agent可以理解成：**一个主体在一个主循环里感知环境、规划、调用工具、根据结果继续调整，直到完成任务或触发停止条件**。Anthropic 对 Agent 的定义也强调这一点：任务明确后，Agent 会独立推进，并在执行过程中不断从工具结果、代码执行结果等环境反馈里获取“ground truth”，必要时在检查点回到人类这里确认。

更进一步说，很多你以为是“复杂 Agent”的系统，实际上可能还只是**单Agent + 工具 + 若干工作流模板**。Anthropic 明确列出的 prompt chaining、routing、parallelization、orchestrator-workers、evaluator-optimizer，本质上是从简单到复杂的组合模式，不必一上来就理解成“多智能体系统”。

#### 1.2 多Agent是什么

多Agent不是简单地“多开几个模型实例”，而是**把任务拆给多个具有独立上下文、独立职责、甚至可相互通信的执行单元**。在 Anthropic 当前文档体系里，至少能看到两类典型形态：

- **Subagents**：适合“主会话派一个专门工人去做侧任务，回来交总结”，它们有独立上下文、可受限工具、可选更便宜模型，但通常只向主 Agent 汇报。
- **Agent teams**：适合“多个成员并行工作、直接沟通、共享任务列表、自主协同”，但它是实验特性，默认关闭，而且官方明确提示它有已知限制、协调开销更大、token 消耗显著高于单会话。

所以，多Agent真正的价值不在“看起来更高级”，而在于：**任务本身是否天然需要并行探索、跨角色协作、相互质疑与综合**。如果没有这些需求，多Agent往往只是在制造协调成本。

### 2. 单Agent的最佳实践：绝大多数项目先从这里起步

Anthropic 的建议非常克制：先直接用 LLM API 和基本组件，很多模式几行代码就能实现；即便用了框架，也要理解底层，不要把抽象层当黑盒。单Agent的核心是“聚焦、可控”，具体实践可分为三步：

#### 2.1 推荐起点：增强型LLM，而非直接上多Agent

一个足够能打的单Agent，通常具备以下核心要素，能覆盖多数真实开发任务（如代码修复、需求拆解、文档生成、接口联调、轻量测试编排）：

- 一个主循环：理解任务 → 选工具 → 执行 → 读取结果 → 调整下一步
- 一组高质量工具：读文件、搜代码、运行命令、查文档、调用业务 API
- 明确停止条件：最大轮数、失败回退、人工审批点
- 基本可观测性：每一步 prompt、工具调用、输出摘要、失败原因、token/耗时统计

#### 2.2 先加Skill，再考虑加Agent

如果主Agent反复在某些领域做不好，第一反应不该是“再造一个Agent”，而应该是：**先把高频知识、流程、检查清单、工具调用规范沉淀成Skill**。

Anthropic 的 Claude Code 文档对 Skill 的定位非常清楚：Skill 适合承载重复粘贴的 playbook、checklist、多步流程，且是**按需加载**的，不用时几乎不占上下文成本。比如：

- 把代码评审流程封成 skill
- 把 Vue3 页面脚手架规范封成 skill
- 把接口联调 checklist 封成 skill
- 把安全扫描/发版步骤封成 skill

这和“碰到瓶颈先加skill”的实践高度一致，也是最经济、最可控的能力增强方式。

#### 2.3 单Agent不够时，先升级工作流，而非直接上多Agent

很多人误以为“单Agent能力不足，就该上多Agent”，实则Anthropic给出的第一批升级路径，是更便宜、更可控的**工作流模式**，而非直接升级为多Agent：

- **Prompt chaining**：固定多步，适合“先写提纲，再校验，再生成正文”这类顺序任务。
- **Routing**：先分类，再选择不同后续流程，适合把简单问题路由到小模型，难题交给强模型。
- **Parallelization**：并行处理多个独立维度，适合多角度评审或多路检查。
- **Evaluator-optimizer**：生成者和评估者形成闭环，适合“有明确评价标准”的优化任务。

这些模式能在不增加拓扑复杂度的前提下，解决单Agent的多数能力瓶颈。

### 3. 多Agent的最佳实践：不是不能用，而是要“有证据地用”

多Agent不是“高级选项”，而是“单Agent和工作流都证明不够用时的升级方案”。使用时需牢记“代价与价值对等”，核心实践围绕“场景适配、成本控制”展开。

#### 3.1 什么时候多Agent真有价值

Anthropic 对 agent teams 的说明很直接：它最适合**并行探索确实能带来价值**的任务，典型场景包括：

- 大范围代码改造：前端、后端、测试同时改
- 多假设调试：每个Agent验证一个root cause
- 多源研究：不同Agent查不同文档/仓库/接口行为
- 大型评审：架构、性能、安全、测试分别给意见

反之，对于顺序性强、同文件高冲突、依赖关系多的任务，单会话或subagent往往更合适。

#### 3.2 多Agent的真实代价（官方明确提示）

- autonomous agents 本身就有更高成本和复合错误风险；
- agent teams 需要共享任务表、消息通信、协调分工，token 消耗显著更高；
- 实验特性意味着仍有会话恢复、协调、关闭行为等限制。

工程上翻译过来就是：你会额外承担上下文同步、任务分配/收敛、重复搜索、文件冲突、调试难度增加等成本。

#### 3.3 多Agent最稳的落地方式（循序渐进）

不建议一步到位上agent team，最稳妥的升级顺序是：

**单 Agent → 单 Agent + Skill → 单 Agent + Workflow → 主 Agent + Subagents → Agent Team**

这个顺序和 Anthropic 的文档结构高度一致：先是增强型LLM，再到工作流，再到Agent；在 Claude Code 产品侧，也是先Skill、再Subagent、再Agent Teams。

其中，Subagents是过渡阶段的最佳选择——主Agent负责统筹，Subagents负责具体侧任务（如需求分析、UI生成、API映射、QA审查），各自有独立上下文，既解决了单Agent上下文过载问题，又避免了agent team的高协调成本。

### 4. 实用判断标准：到底该上单Agent还是多Agent

可直接套用以下逻辑，快速决策：

#### 4.1 适合单Agent的情况

- 目标比较集中，主任务链条清晰；
- 主要瓶颈在知识不足、工具调用不稳、步骤容易漏；
- 任务需要一个统一上下文持续推进；
- 更在意成本、可控性、易排查性。

这时优先做：**主 Agent + 工具 + Skill + 必要工作流**

#### 4.2 适合多Agent的情况

- 任务天然可以拆成几个相对独立的子问题；
- 各子问题需要不同视角或专业角色；
- 并行推进能明显缩短时间，且不会频繁争抢同一份上下文；
- 最终需要汇总、比较、交叉验证多个结论。

这时再考虑：**orchestrator-workers / subagents / agent teams**

### 5. “简单起步”与 Spec Kit 的互补关系（不冲突，反而是绝配）

很多人会疑惑：“强调简单起步，是不是就不需要Spec Kit了？”答案是：不冲突，二者关注的层级不同，反而能形成互补。

#### 5.1 核心区别：各自解决什么问题

- **简单起步**：管的是**运行时架构复杂度**，核心是“别一开始就搞复杂拓扑、别过度工程化”，解决“系统太复杂不好维护”的问题。
- **Spec Kit**：管的是**开发过程和意图管理**，核心是“先把what/why说清楚，再做how”，解决“需求模糊、实现跑偏”的问题。

#### 5.2 为什么互补：Spec Kit 会强化“简单起步”

Spec Kit 文档本身就带有很强的“反过度工程化”倾向，其核心原则包括 `simplicity over cleverness`、`start simple, add complexity only when proven necessary`，且强调：

- specify 阶段聚焦 what/why，不提前锁死技术栈；
- plan 阶段明确技术约束，避免过度设计；
- tasks 拆成可验证小步，避免一次性生成整个功能；
- checklist 和 analyze 阶段提前发现问题，避免后期返工。

#### 5.3 避免冲突：正确使用 Spec Kit 的关键

真正的冲突不是来自工具本身，而是误用：

- ❌ 错误：把Spec写成“提前锁死未来三年的复杂架构”；
- ❌ 错误：在plan阶段预埋大量“可能以后会用到”的抽象层；
- ✅ 正确：用Spec Kit把“简单起步”的原则写进constitution/plan，比如明确“MVP阶段只允许单Agent”“优先使用官方原生能力，不额外封装框架壳层”。

一句话总结：**Spec Kit 应该帮助你把“为什么要简单、简单到什么程度、什么时候再升级”写进规则，而不是帮你合理化过度工程化。**

### 6. 最推荐的落地姿势：Spec Kit + 简单起步 组合

把两者的优势结合起来，形成一套可复用的开发流程，既保证质量，又控制复杂度：

#### 6.1 第1步：用 Spec Kit 明确需求与约束（先做对）

- 用 `/speckit.constitution` 写清核心原则：MVP阶段只允许单Agent、优先Skill而非多Agent、不做过度抽象；
- 用 `/speckit.specify` 明确目标、上下文、完成标准，聚焦what/why，不提前定技术栈；
- 用 `/speckit.clarify` 消除歧义，避免后期跑偏；
- 用 `/speckit.checklist` 验证需求完整性。

#### 6.2 第2步：按简单起步原则搭建单Agent基础（先跑通）

- 搭建单Agent主循环，只接入最少必要工具；
- 把高频流程、规范封装成Skill，按需加载；
- 拆小任务，每完成一个就做最小验证（lint、build、简单测试）。

#### 6.3 第3步：逐步升级，按需增加复杂度（再优化）

- 先升级工作流（chaining、routing等），解决单Agent的瓶颈；
- 再根据需求，逐步引入Subagents，负责独立侧任务；
- 最后，只有在并行协作价值显著时，才考虑Agent Team。

### 7. 项目示例：AI Vue3 管理后台页面生成助手（落地演示）

以“前端团队内部使用的AI页面生成助手”为例，演示如何结合简单起步与Spec Kit，落地单Agent到多Agent的升级。

#### 7.1 项目定位（用 Spec Kit 明确需求）

核心目标：输入一段自然语言需求，自动生成Vue3管理后台页面基础实现，覆盖列表页、详情页、编辑弹窗，生成结果可预览、可编辑、可人工审核导出。

核心约束（写进constitution）：MVP阶段只允许单Agent，优先使用Vue3原生能力，不额外封装框架，生成结果需通过lint和基础测试。

#### 7.2 技术栈设计（简单起步，不过度工程化）

```markdown
frontend/  # Vue3前端（需求输入、结果预览、人工审核）
  src/
    api/、components/、composables/、router/、stores/、views/、utils/、types/
  mock/
  tests/

agent-backend/  # Node.js服务（调用模型、管理会话、执行工具）
  src/
    agents/、skills/、tools/、sessions/、eval/
```

前端：Vue3 + Vite + Pinia + Vue Router + Element Plus + Vitest + Playwright

Agent后端：Node.js + 模型API + 工具链（读模板、生成文件、执行校验）

#### 7.3 第一阶段：单Agent MVP（先跑通）

##### 7.3.1 单Agent职责

仅做一件事：**把“自然语言需求”转换成“可审核的Vue3页面草案”**，内部流程固定为：

```markdown
接收需求 → 解析业务意图 → 提取页面类型 → 调用模板与Skill → 生成代码 → 执行校验 → 输出草稿
```

##### 7.3.2 必要工具（最少化）

- `read_component_library`：读取组件规范和业务模板
- `load_page_template`：载入对应页面模板（列表/详情/表单）
- `generate_vue_files`：生成Vue文件草稿
- `run_lint_and_test`：执行静态检查和基础测试
- `save_draft_files`：保存生成结果
- `request_human_review`：提交人工审核

##### 7.3.3 核心Skill（补全能力，不拆Agent）

- `vue3-admin-patterns`：列表页布局、组件命名、Pinia使用规范等；
- `api-contract-checklist`：REST接口规范、字段映射、空状态处理等；
- `ui-review-checklist`：表单校验、三态处理、权限显隐等。

#### 7.4 第二阶段：升级为“主Agent + Subagents”（按需升级）

当单Agent出现上下文过载（如同时生成多页面、多模块），或需要多视角协作时，升级为：主Agent统筹 + 4个Subagents分工，各自独立上下文：

- `spec-analyst`：解析需求、生成页面schema，工具：Read/Grep，Skill：需求澄清、页面schema规范；
- `ui-generator`：生成Vue页面与组件，工具：Read/Write，Skill：vue3-admin-patterns；
- `api-mapper`：生成API层与类型定义，工具：Read/Write，Skill：api-contract-checklist；
- `qa-reviewer`：执行校验、生成测试建议，工具：Read/Bash，Skill：ui-review-checklist、qa-smoke-test。

运行链路：用户输入需求 → 主Agent拆任务 → 各Subagents并行执行 → 主Agent汇总结果 → 人工审核。

#### 7.5 升级判断标准

只有满足以下条件，才启动第二阶段升级：

- 单Agent上下文频繁过载，生成质量下降；
- 任务拆分后，各子任务可独立推进，并行能显著缩短时间；
- 需要多视角（需求/UI/API/QA）协同，单Agent难以覆盖。

### 8. 最终结论（浓缩为3句话）

> 1. 单Agent不是低级方案，而是所有AI Agent项目的默认起点，核心是“清晰边界 + 小步验证”；       2. 多Agent只在“并行协作能创造额外价值”时值得上，否则只会增加成本和调试难度；       3. 简单起步与Spec Kit互补，前者控架构复杂度，后者控需求与过程质量，结合使用是最稳的落地方式。