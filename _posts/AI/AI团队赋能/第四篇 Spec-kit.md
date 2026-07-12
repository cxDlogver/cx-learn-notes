### 1.1 Spec Kit 使用报告

参考资料：

\- [这才是AI编程的正确姿势：Spec Kit 实战开发演示！7条命令跑通规格驱动开发+强制TDD，从需求到代码全自动！支持 Claude Code、Cursor_哔哩哔哩_bilibili](https://www.bilibili.com/video/BV1aKxEzHEy9/?spm_id_from=333.337.search-card.all.click&vd_source=ff414aaf189e3a685358d2a984fd4742)

\- [(29 封私信 / 80 条消息) 从零理解 GitHub Spec Kit：开发者必看的入门指南 - 知乎](https://zhuanlan.zhihu.com/p/1981659360842249886)

\- [Spec Kit - AI-Powered Specification-Driven Development Toolkit](https://speckit.org/)

#### 1.1.1 Spec Kit 是什么

> https://github.com/github/spec-kit

**Spec Kit** 是 GitHub 在 2025 年推出的开源工具包，用于帮助开发者借助自选 AI 工具落地 **Spec-Driven Development（规范驱动开发）**。GitHub 官方博客将其描述为：开发者可通过自己偏好的 AI 工具，围绕 spec 组织开发；官方文档则将其实现为一套 `specify` CLI + 一组标准命令。

它并非 IDE、模型，也不是某一agent的专属功能，更像是一个 **“规范优先”的流程脚手架**：先建立项目原则，再撰写规格，接着澄清歧义，然后制定技术方案，拆分任务，最后执行实现。Spec Kit 官方Quick Start的标准流程顺序如下：

- `/speckit.constitution`
- `/speckit.specify`
- `/speckit.clarify`
- `/speckit.plan`
- `/speckit.tasks`
- `/speckit.implement`

官方还提供可选命令 `/speckit.analyze` 和 `/speckit.checklist`，用于补充一致性分析和质量检查。

#### 1.1.2 Spec Kit 解决的核心问题

Spec Kit 本质上解决的核心问题是：**避免AI一上来直接写代码，先将需求、原则、技术边界和任务拆分固定下来**。官方文档明确要求，`/speckit.specify` 阶段需重点描述 **what（做什么）和 why（为什么做）**，而非技术栈；技术栈、架构选择等内容，需留到 `/speckit.plan` 阶段再明确。

这一设计天然将“需求定义”与“技术设计”拆分开来。对AI开发而言，这至关重要——很多返工并非源于代码实现本身，而是因为**需求未明确，就过早进入实现阶段**。Spec Kit 的流程正是通过强制拆分这两个阶段，减少此类返工。

#### 1.1.3 Spec Kit 的安装与初始化方式

Spec Kit 官方推荐通过 `specify` CLI 初始化项目，Quick Start 给出的启动命令如下：

```bash
uvx --from git+https://github.com/github/spec-kit.git specify init <PROJECT_NAME>
```

或在当前目录初始化：

```bash
uvx --from git+https://github.com/github/spec-kit.git specify init .
```

官方仓库README说明，初始化时可直接指定适配的AI agent，例如 `--ai claude`、`--ai copilot`、`--ai kiro-cli`，以及 **`--ai codex --ai-skills`**。此外，Spec Kit 支持通用模式，可将模板对接官方列表外的agent。

这表明 Spec Kit 的定位从一开始就是 **agent-agnostic（与agent无关）**：它不是某一AI工具的附属插件，而是一套可适配多个agent的SDD流程层。官方README中的支持列表已覆盖Claude Code、Codex CLI、GitHub Copilot、Kiro CLI、Cursor、Gemini CLI、Generic等多种agent。

#### 1.1.4 Spec Kit 在 Codex 中怎么工作

若使用 **Codex CLI**，官方提供了两条关键信息：

第一，初始化命令为：

```bash
specify init . --ai codex --ai-skills
# 完整指令
uv tool install specify-cli --from git+https://github.com/github/spec-kit.git@v0.6.0
specify init --here --ai codex --ai-skills
```

第二，Spec Kit 在Codex中并非传统slash command形式，而是以 **agent skills** 方式安装，调用形式变为：

- `$speckit-constitution`
- `$speckit-specify`
- `$speckit-plan`
- `$speckit-tasks`
- `$speckit-implement`

这是Spec Kit README明确写出的Codex适配方式；同时OpenAI的Codex文档说明，Codex的技能通过 `SKILL.md` 打包指令、资源和可选脚本，并采用渐进式披露（progressive disclosure）机制，仅在命中相关任务时加载完整技能内容。([github.com](https://github.com/github/spec-kit?utm_source=chatgpt.com) ; [developers.openai.com](https://developers.openai.com/codex/skills?utm_source=chatgpt.com) )

因此，**Spec Kit + Codex** 的关系并非“Codex内置了Spec Kit”，而是 **Spec Kit 将一套SDD流程封装为Codex的技能包**。

#### 1.1.5 Spec Kit 会生成什么

Spec Kit README清晰描述了生成过程：

执行 `constitution` 后，会创建或更新：

```bash
.specify/memory/constitution.md
```

执行 `specify` 后，会为当前功能新建一个编号目录，例如：

```bash
.specify/specs/001-create-taskify/spec.md
```

README还展示了完整的生成结构，包括：

- `.specify/memory/constitution.md`
- `.specify/specs/<feature>/spec.md`
- `plan.md`
- `research.md`
- `quickstart.md`
- `contracts/`
- `tasks.md`

也就是说，Spec Kit的输出并非仅一份PRD，而是一整套 **从原则到规格、计划再到任务** 的结构化工件。

#### 1.1.6 Spec Kit 的核心流程应该怎么理解

用最简单的话概括，Spec Kit的标准节奏是：

**先立规矩，再写规格，再补清楚，再定技术方案，再拆任务，最后实现。** 这并非改写总结，而是GitHub官方文档和README的实际流程映射。

其中几个关键要点需重点关注：

- `/speckit.clarify` 官方建议放在 `/speckit.plan` 之前，README明确说明此举是为了减少下游返工。
- `/speckit.tasks` 会生成按用户故事组织的任务，包含依赖顺序、并行标记 `[P]`、具体文件路径、测试优先顺序和阶段检查点。
- `/speckit.implement` 会先验证constitution/spec/plan/tasks等前置条件是否齐全，再按任务顺序执行实现。

因此，Spec Kit 并非“帮你写一份spec”，而是**把spec变成后续实现的入口工件**。

### 1.2 把 Vue3 示例改写成 Spec Kit 流程

以下将轻量Vue3项目，直接改造成 **Spec Kit + Codex** 的标准落地方式。

项目仍沿用此前示例：

**Habit Board（习惯打卡板）**

目标功能不变：

- 新增习惯
- 每日打卡
- 查看连续打卡天数
- localStorage 本地持久化

为保持示例简洁，仍使用 **Vue 3 + Vite**。Vue官方Quick Start说明，`npm create vue@latest` 会调用 `create-vue`，并可按需勾选Router、Pinia、Vitest、ESLint、Prettier等功能；Vite官方文档说明，当前Vite要求Node.js版本为 `20.19+` 或 `22.12+`。

#### 1.2.1 第一步：搭建 Vue3 项目

```bash
npm create vue@latest habit-board
cd habit-board
npm install
npm run dev
```

若需最轻量版本，初始化时可勾选：

- Vue Router：否
- Pinia：否
- Vitest：是
- ESLint：是
- Prettier：可选

本示例为本地单页应用，无需提前增加复杂度。Vue官方脚手架支持创建时灵活选择这些选项。

#### 1.2.2 第二步：初始化 Spec Kit 到仓库

若配合Codex使用，最直接的初始化方式为：

```bash
uvx --from git+https://github.com/github/spec-kit.git specify init . --ai codex --ai-skills
```

此步骤完成后，Spec Kit会将适配Codex的技能和流程模板装入项目；官方README说明，Codex模式下会通过skills方式调用Spec Kit，而非普通slash commands。

#### 1.2.3 第三步：编写 constitution，明确项目原则

进入Codex后，不要立即生成Vue组件，先执行第一条命令：

```text
$speckit-constitution
为这个项目建立原则：
- Vue 3 + Vite，优先简单实现
- v1 不引入后端
- 状态尽量局部化，先不用 Pinia
- UI 保持最小依赖
- 关键逻辑必须有 Vitest 单测
- 所有实现以可读性和可维护性优先
```

此步骤用于**定义项目的长期原则和治理规则**，即“所有功能都需遵守的总规则”。

根据Spec Kit官方文档，此步骤的结果会写入 `.specify/memory/constitution.md`，并作为后续specification、planning、implementation的基础约束。

constitution中适合写入：

- 产品原则
- 体验原则
- 工程原则
- 测试与质量门槛
- 性能要求
- 不允许做的事

此步骤对应AI-DLC的 **Inception阶段最开始的“先立原则”**。

#### 1.2.4 第四步：用 specify 明确“做什么”，不涉及“怎么做”

下一步执行：

```text
$speckit-specify
构建一个 Habit Board Web 应用，帮助用户维护日常习惯。
用户可以新增习惯、每天打卡、查看连续打卡天数，并且刷新页面后数据仍然保留。
这个版本只面向单用户、本地浏览器使用，不需要账号系统，不需要云同步。
重点是清晰、稳定、易维护，而不是功能全面。
```

Spec Kit官方明确要求：`specify` 阶段聚焦 **what（做什么）和 why（为什么做）**，不提前灌入技术栈细节。

specify阶段适合写入：

- 用户是谁
- 要解决什么问题
- 核心场景
- 需要哪些功能
- 验收标准

不适合写入：

- Next.js、Supabase、Tailwind等技术细节

此步骤结束后，按默认模板，仓库中通常会生成一个编号功能目录，例如：

```bash
.specify/specs/001-habit-board/spec.md
```

README中的Taskify示例即采用这种编号分支+编号spec目录的模式。

#### 1.2.5 第五步：用 clarify 澄清模糊点

不要急于执行plan，先让Codex运行：

```text
$speckit-clarify
重点澄清以下问题：
- 连续打卡天数的计算规则
- 是否允许一天多次打卡
- 删除习惯后历史是否保留
- 习惯名称是否允许重复
- 空状态、首次使用状态如何展示
```

Spec Kit README明确建议：`clarify` 需在 `plan` 前执行，通过结构化方式减少后续返工，**补充和消除specification中的歧义**。

此步骤非常接近AI-DLC的 **Requirements Analysis（需求分析）**：不直接做假设，而是补齐需求中的空白处。

> 可以不输入prompt， AI自动判断模糊点

#### 1.2.6 第六步：用 plan 引入 Vue3 / Vite 技术方案

需求明确后，执行：

```text
$speckit-plan
技术方案如下：
- 前端框架：Vue 3
- 构建工具：Vite
- 使用 Composition API 和 <script setup>
- 不引入 UI 组件库
- 持久化：localStorage
- 测试：Vitest
- 首版不使用 Vue Router 和 Pinia
请生成最小但完整的实现计划，并避免过度设计。
```

Spec Kit官方文档明确将此步骤定义为“Create a Technical Implementation Plan（制定技术实现计划）”，即在此阶段提供技术栈和架构选择。

README说明，plan阶段通常会生成：

- `plan.md`
- `research.md`
- `quickstart.md`
- 可能的 `contracts/`
- 更新后的功能目录内容

也就是说，此步骤并非“简单撰写技术说明”，而是正式生成 **技术实现工件**。

plan阶段适合写入：

- 前端框架
- 状态管理
- 数据持久化
- API方案
- 目录结构
- 组件边界
- 测试策略

`/speckit.plan` 的核心职责，是将 `spec.md` 中的“要做什么”翻译为“准备怎么实现”，并同步产出一组配套文档。Spec Kit官方对该阶段的描述是：读取功能spec，检查是否符合constitution，将需求转化为技术方案，并生成数据模型、API契约和关键验证场景等支持性文档。`/speckit.tasks` 后续会基于这些文件拆分任务。

##### plan阶段生成的5类核心文件说明

1. `/plan.md`：**主技术方案文档**，用于明确“MVP准备怎么做”，通常包含技术栈、架构选择、页面/模块划分、实现边界、阶段性策略及选择依据。对本项目而言，它相当于“AI学习计划助手MVP的总施工图”，开发时可作为整体方向指引，评审时可判断方案是否过度工程化，也是生成`tasks.md`的核心输入。
2. `/research.md`：**技术调研与关键决策说明**，用于明确“为什么这么选”，解决不确定项、比较方案、记录取舍依据。对本项目而言，会回答“为什么用Next.js而非纯Vite”“为什么先用mock+localStorage”等问题，是后续解释技术选型的核心参考。
3. `/data-model.md`：**数据模型文档**，用于明确“系统核心对象的结构与关联”，定义`UserGoal`、`StudyPlan`等实体的字段、约束、状态枚举及关系。前端编写TypeScript类型时可直接参考，后续对接后端或数据库时可作为数据结构基础，`tasks.md`也会基于这些实体拆分实现任务。
4. `/quickstart.md`：**快速验证与上手文档**，聚焦“关键场景如何快速跑通、如何验证功能有效性”，包含项目启动、核心场景操作、功能验证路径等内容。既是开发者的“最快自测脚本”，也是评审者的“最短验收路径”，为后续implement阶段提供关键流程指引。
5. `/openapi.yaml`：**接口契约文档**，用于明确“前后端通信规则及输入输出结构”，即使当前仅做前端MVP，也能提前固定“AI计划生成”“任务状态更新”等接口的请求/响应结构，为前端mock编写、后端后续实现及联调提供统一依据。

总结：5类文件可简化为“总方案（plan.md）、决策原因（research.md）、数据结构（data-model.md）、关键验证路径（quickstart.md）、接口约定（contracts/openapi.yaml）”。

#### 1.2.7 第七步：用 tasks 拆分可执行小任务

完成plan后，执行：

```text
$speckit-tasks
```

根据Spec Kit官方说明，此步骤会生成 `tasks.md`，任务包含以下要素：

- 按用户故事分阶段组织
- 依赖顺序
- 可并行标记 `[P]`
- 具体文件路径
- 测试优先顺序
- 每个阶段的checkpoint（检查点）

对Habit Board项目，合理的任务拆分如下：

- T1：定义Habit数据结构与storage模块
- T2：实现HabitForm组件
- T3：实现HabitList组件
- T4：实现打卡逻辑与连续打卡天数（streak）计算
- T5：处理重复名称与空状态
- T6：为核心逻辑补充Vitest单测
- T7：构建与交付检查

上述任务名为基于项目需求的合理重组，而“tasks.md需包含依赖、路径、测试顺序、检查点”是官方文档明确要求的。

#### 1.2.8 第八步：用 analyze / checklist 审核前置条件

若需提升流程稳定性，建议在implement前执行：

```text
$speckit-analyze
$speckit-checklist
```

官方README将 `analyze` 定义为 **Cross-artifact consistency & coverage analysis（跨工件一致性与覆盖度分析）**，`checklist` 用于检查需求完整性、清晰度和一致性。

对本Vue3项目而言，这两步可重点发现三类问题：

- spec中已定义，但tasks中遗漏的功能
- plan中技术复杂度过高的设计
- 测试范围未覆盖streak、persistence等核心逻辑的情况

#### 1.2.9 第九步：用 implement 正式进入编码

前置步骤确认无误后，执行：

```text
$speckit-implement
```

Spec Kit官方说明，`implement` 会先验证constitution/spec/plan/tasks是否齐全，再按任务顺序执行。同时提醒：agent会实际运行本地CLI（如`npm`），需确保本地依赖已准备就绪。

对Habit Board项目，不建议一次性“全部实现”，推荐遵循Quick Start建议：**复杂项目分阶段实现，先完成核心功能再叠加细节**（此建议为GitHub官方文档明确写出）。

更稳妥的分阶段实现方式：

第一轮实现：

- 数据结构定义
- localStorage封装
- HabitForm组件
- HabitList组件

第二轮实现：

- 打卡逻辑
- streak计算
- 边界条件处理
- 测试与构建

#### 1.2.10 第十步：将 Spec Kit 流程映射回 AI-DLC

将Spec Kit流程与AI-DLC三阶段对应，如下：

**Inception（启动阶段）**

- constitution（立原则）
- specify（定需求）
- clarify（澄清歧义）
- checklist（验证需求）
- plan（定技术方案）
- tasks（拆任务）

**Construction（构建阶段）**

- analyze（质量闸门，验证方案）
- implement（编码实现）
- 本地测试/构建修复

**Operations（运营阶段，轻量前端项目最小版本）**

- `npm run build`（生产构建）
- 生成简要部署说明
- 发布检查清单

AWS对AI-DLC的定义为：Inception负责规划与架构，Construction聚焦设计与实现，Operations覆盖部署与监控；这与Spec Kit“先规范、澄清、计划、任务，再实现”的流程可顺利对齐。

### 1.3 最终结论

核心总结：

> **Spec Kit 是一套agent无关的SDD流程脚手架；它最适合放在AI agent之上，负责把“立原则 → 写规格 → 澄清 → 计划 → 任务 → 实现”变成标准路径。** 

对Vue3轻量项目而言，最自然的落地方式为：

**Vue3/Vite搭建项目 → Spec Kit初始化为Codex模式 → constitution → specify → clarify → plan → tasks → analyze/checklist → implement → build/release**。

该流程既符合Spec Kit官方工作流，也能与AI-DLC的Inception/Construction/Operations三阶段顺利对齐。

### 1.4 推荐使用顺序

实际落地时，可直接按以下顺序执行Spec Kit相关命令，确保流程规范、落地高效：

```plaintext
/speckit.constitution
/speckit.specify
/speckit.clarify
/speckit.plan
/speckit.tasks
/speckit.analyze
/speckit.implement
```

说明：大多数AI助手可直接使用 `/speckit.*` 格式命令；若使用Codex CLI的skills模式，官方规范格式为 `$speckit-*`。

### 1.5 整套 Prompt 模板

#### 1.5.1 `/speckit.constitution`

此阶段核心是定义**项目宪法**，而非具体功能。官方建议在此明确代码质量、测试标准、体验一致性等核心原则，后续所有spec、plan、implement操作均需遵循这些原则。推荐直接使用以下模板：

```plaintext
/speckit.constitution
本项目是一个 Vue3 后台页面生成助手，必须遵循以下原则：

1. 简单起步原则
- MVP 阶段只允许单 Agent 架构。
- 不允许在第一阶段引入多 Agent 协作网络。
- 如果能力不足，优先新增 Skill、模板、检查清单或固定工作流，而不是新增 Agent。

2. 工程简洁原则
- 项目总拆分控制在最小必要范围内，优先保持 ≤3 个主要项目或模块边界。
- 不做未来预埋，不为了“可能以后会用”提前引入复杂抽象。
- 优先直接使用 Vue3、Vite、Vue Router、Pinia、Element Plus 官方能力。

3. 规范一致性原则
- 所有生成页面必须遵守统一的后台页面结构规范：
  搜索区、表格区、分页区、详情抽屉、编辑弹窗、空态、错误态、加载态。
- 组件命名、路由命名、接口命名、类型命名必须一致。

4. 测试与验证原则
- 所有生成结果至少通过 lint、type-check 和最小 smoke test。
- 先有验收标准，再开始实现。
- 输出必须包含人工审核点，不允许直接自动提交生产代码。

5. 可观测性原则
- 记录需求输入、页面 schema、模板选择依据、工具调用记录、生成结果摘要、错误信息。
- 能够定位失败发生在需求理解、模板选择、接口映射还是代码生成阶段。

6. 安全与稳定性原则
- 所有表单输入要有基本校验。
- 所有异步请求要有 loading、error、empty 三态。
- 不生成不透明的“魔法层”代码，优先可读、可改、可维护。

7. 演进原则
- 只有当单 Agent 在上下文长度、并行效率、角色隔离方面被证明确实不足时，才允许升级到多 Agent。
- 升级顺序必须为：单 Agent → 单 Agent + Skill → 单 Agent + Workflow → 主 Agent + Subagents → 多 Agent。
```

#### 1.5.2 `/speckit.specify`

官方建议此阶段仅聚焦**what（做什么）/ why（为什么做）**，不提前明确技术栈。推荐直接使用以下模板：

```plaintext
/speckit.specify
构建一个面向前端团队内部使用的 AI 页面生成助手。

目标：
用户输入一段后台需求描述后，系统能够自动生成一个 Vue3 管理后台页面的初始实现草稿，帮助减少重复搭建页面的工作量。

第一阶段要解决的问题：
- 后台列表页、详情页、编辑弹窗页面经常重复开发
- 页面结构相似，但字段、接口、交互细节不同
- 需求文档到页面骨架之间存在大量机械性劳动
- 团队希望先提升页面脚手架生成效率，而不是一次性全自动完成整个项目

核心用户：
- 前端工程师
- 低年级开发同学
- 需要快速搭建后台页面原型的业务开发者

第一阶段范围：
- 支持列表页、详情抽屉、编辑弹窗三种常见后台模式
- 支持搜索、筛选、分页、表格列展示、表单字段生成
- 输出 Vue3 页面草稿、组件草稿、API 草稿、类型定义草稿、验收清单
- 生成结果必须可预览、可人工调整、可审核后导出

非目标：
- 第一阶段不做设计稿自动解析
- 第一阶段不做全项目级代码生成
- 第一阶段不直接自动提交代码到业务仓库
- 第一阶段不引入多 Agent 协作网络

成功标准：
- 输入典型后台页面需求后，能生成结构正确、可运行的页面草稿
- 生成功能覆盖主流后台页面骨架
- 人工修改量明显低于从零开发
- 页面基础结构、命名和交互状态保持一致
```

#### 1.5.3 `/speckit.clarify`

该命令的核心作用是澄清需求歧义，可传入重点关注的澄清领域。建议分两轮执行，分别聚焦业务边界和工程实现，确保需求无模糊点。

##### 第一轮：业务边界澄清

```plaintext
/speckit.clarify
请重点澄清以下业务边界与验收问题：

1. 第一阶段支持哪些页面类型，明确不支持哪些页面类型？
2. 需求输入是自然语言描述、结构化字段配置，还是二者兼容？
3. 页面草稿生成的最小可交付单位是什么：单页面、单模块，还是页面 + API + 类型定义？
4. 表单字段规则是否需要覆盖必填、长度、枚举、日期、数字范围等常见校验？
5. 列表页是否必须包含搜索、筛选、分页、批量操作、详情查看这些能力中的全部，还是按需生成？
6. 详情展示与编辑弹窗是否必须共存？
7. 用户对生成结果的后续操作是什么：预览、编辑、复制、导出、落盘？
8. 验收指标如何定义：可运行率、生成成功率、人工修改率、页面一致性、生成耗时？
9. 第一阶段是否需要权限显隐、按钮级权限控制？
10. 页面是否必须兼容移动端，还是只面向桌面后台系统？
```

##### 第二轮：工程与数据澄清

```plaintext
/speckit.clarify
请重点澄清以下工程实现问题：

1. API 规范是否默认为 REST 风格？
2. 分页参数和返回结构是否需要统一约定？
3. 类型定义由系统自动推断，还是允许用户补充字段类型？
4. 是否需要 mock 数据输出？
5. 是否需要生成 Pinia store 与 composables？
6. 是否需要自动生成路由配置与菜单元信息？
7. 页面是否必须具备 loading、empty、error 三态？
8. 是否要求输出测试骨架？
9. 生成代码是否以项目内文件树形式输出？
10. 第一阶段是否只生成草稿文件，不直接写入真实业务仓库？
```

#### 1.5.4 `/speckit.plan`

此阶段核心是制定技术实现方案，官方明确要求在此步骤确定具体技术细节。提供两版模板，优先使用单Agent MVP版，仅在单Agent无法满足需求时考虑升级。

##### 版本 A：单 Agent MVP 版（优先使用）

```plaintext
/speckit.plan
请为该项目生成一个以“单 Agent MVP”为核心的技术实现方案，要求如下：

前端技术栈：
- Vue 3
- Vite
- TypeScript
- Vue Router
- Pinia
- Element Plus

后端/Agent 服务：
- Node.js
- 提供一个简单 API 服务，负责接收需求、调用模型、执行工具、输出草稿结果

运行时架构要求：
- 第一阶段必须采用单 Agent
- 单 Agent 负责：需求解析、页面 schema 提取、模板选择、代码草稿生成、结果自检、输出审核材料
- 不允许多 Agent 协作网络
- 如果能力不足，优先通过 Skill、模板库、规则清单和固定工作流增强

建议能力模块：
- vue3-admin-patterns skill：后台列表页/详情页/弹窗规范
- api-contract-checklist skill：接口命名、分页、字段、错误处理规范
- ui-review-checklist skill：loading、empty、error、校验、交互反馈检查清单

工具设计要求：
- read_component_library
- load_page_template
- generate_vue_files
- generate_api_contracts
- run_lint_and_typecheck
- run_smoke_test
- save_draft_files
- request_human_review

输出物要求：
- 页面 schema
- Vue 页面草稿
- 组件草稿
- API 层草稿
- 类型定义草稿
- mock 数据草稿
- 验收清单
- 风险提示

工程约束：
- 保持最小项目数量，避免过度拆分
- 不做未来预埋
- 不额外封装框架壳层
- 先有 contracts / tests / 验收标准，再进入实现
- 必须考虑可观测性：记录 prompt、模板选择、工具调用、错误归因、耗时与成本

请在 plan 中明确：
1. 系统上下游边界
2. 前后端目录结构
3. Agent 主循环
4. Skill 的职责边界
5. 工具调用链路
6. 页面生成数据流
7. 失败回退策略
8. 人工审核点
9. 后续升级到 Subagent / 多 Agent 的触发条件
```

##### 版本 B：多 Agent 升级版（单Agent不足时使用）

```plaintext
/speckit.plan
请基于现有单 Agent MVP，生成一个“第二阶段升级方案”，目标是评估是否有必要升级为多 Agent。要求如下：

现状：
- 已有单 Agent 页面生成链路
- 已有页面模板、Skill、工具调用链路
- 已有基础可观测性和人工审核流程

请重点评估以下升级条件：
1. 单 Agent 是否存在上下文过载？
2. 是否存在天然可并行的子任务？
3. 是否需要不同角色视角拆分？
4. 是否有明确指标证明多 Agent 的收益大于协调成本？

如果升级，请优先输出：
- 主 Agent + Subagents 方案
而不是直接输出完全自由协作的多 Agent 网络

候选子角色：
- spec-analyst：负责需求结构化与页面 schema
- ui-generator：负责 Vue 页面和组件代码草稿
- api-mapper：负责接口层与类型映射
- qa-reviewer：负责验收检查与测试建议

请明确：
- 每个子 Agent 的输入输出
- 各自工具权限
- 各自 Skill 依赖
- 聚合与回收机制
- 任务冲突与文件冲突如何处理
- 何时不应该升级为多 Agent
- 升级后的成本、调试复杂度和收益评估方法
```

#### 1.5.5 `/speckit.tasks`

官方定义此命令用于将技术方案拆解为可执行任务，核心是确保任务具体、可落地。推荐使用以下模板，避免任务拆分过粗或过虚：

```plaintext
/speckit.tasks
请基于当前 spec 和 plan，输出一个可执行的任务清单，要求如下：

1. 任务要按阶段组织：
- Phase 1：项目初始化
- Phase 2：需求输入与结果预览
- Phase 3：单 Agent 主链路
- Phase 4：Skill 与模板库接入
- Phase 5：代码草稿生成
- Phase 6：校验与可观测性
- Phase 7：人工审核与导出
- Phase 8：评估与迭代

2. 每个任务必须包含：
- 任务编号
- 任务标题
- 目标说明
- 涉及文件/目录
- 前置依赖
- 完成标准

3. 优先拆成小步任务，不要把“大而全”的任务放在一起

4. 对可以并行的任务标记 [P]

5. 必须体现 test-first / contract-first 思路：
- 先 schema / contracts
- 再 smoke test / type-check
- 再生成实现

6. 必须体现简单起步原则：
- 第一阶段只做单 Agent
- Skill 优先于多 Agent
- 多 Agent 相关任务只能以“未来升级条件”形式保留，不能进入 MVP 主任务流

7. 请在任务清单最后补充：
- MVP 完成定义
- 评估指标采集任务
- 失败样本归因任务
```

#### 1.5.6 `/speckit.analyze`

该命令为可选的方案校验步骤，核心是检查方案是否存在过度工程化等问题，确保方案简洁、可落地。推荐使用以下模板，重点聚焦MVP阶段的合理性：

```plaintext
/speckit.analyze
请重点分析当前 spec、plan、tasks 是否存在以下问题：

1. 是否过度工程化？
2. 是否在 MVP 阶段引入了不必要的多 Agent 复杂度？
3. 是否存在 future-proofing 和过早抽象？
4. 是否违反“先 Skill、后 Agent”的原则？
5. 是否存在任务拆分过粗、不可执行的问题？
6. 是否缺少 contracts、测试、验收标准或人工审核点？
7. 是否缺少必要的可观测性设计？
8. 是否存在 Vue3 工程层面的不必要封装？

请按“问题 - 风险 - 建议修改”的格式输出。
```

#### 1.5.7 `/speckit.implement`

此阶段为方案落地执行，核心是严格按照任务清单生成可运行的代码草稿，避免失控。推荐使用以下模板，添加约束确保生成结果符合预期：

```plaintext
/speckit.implement
请严格按照 tasks.md 执行实现，要求如下：

1. 按任务顺序逐步实现，不要跳过阶段
2. 一次只处理一个或一组强相关的小任务
3. 每完成一组任务后，先总结变更，再继续下一组
4. 先创建或完善 contracts、schema、tests，再实现源码
5. 严格遵守 constitution 中的简单起步原则
6. MVP 阶段禁止擅自引入多 Agent 结构
7. 如果发现单 Agent 能力不足，先提出：
   - 应新增什么 Skill
   - 应新增什么模板
   - 应新增什么检查清单
   而不是直接改成多 Agent
8. 所有生成结果必须保持 Vue3 + TypeScript + Vite 工程一致性
9. 所有页面都要考虑 loading、empty、error 三态
10. 输出每一步的修改摘要、风险点和待人工确认项
```

### 1.6 迭代时的补充模板

Spec Kit官方主流程主要覆盖新特性从constitution到implement的完整链路，实际项目中常存在需求变更、方案调整、范围收缩等场景。官方社区实践表明，可继续使用plan、tasks等命令更新现有内容，

其中 **`/speckit.constitution`** 作为项目原则层，需谨慎修改、尽量少改，其余命令可在每轮迭代中灵活调整。

补充3个高频迭代场景的模板，覆盖需求变更、方案收缩、多Agent升级评估：

#### 1.6.1 需求变更模板

```plaintext
/speckit.specify
请在当前功能范围内追加以下需求，并保持 MVP 边界不失控：

新增需求：
- 支持列表页的批量操作栏
- 支持表格列自定义显隐
- 支持详情页中的操作日志区域

要求：
- 不要扩大到设计稿自动解析
- 不要引入多 Agent
- 明确哪些是本次新增范围，哪些仍然是非目标
- 更新成功标准与验收边界
```

#### 1.6.2 方案收缩模板

```plaintext
/speckit.plan
请收缩当前实现方案，目标是降低复杂度并保证 MVP 可落地：

要求：
- 删除非必要抽象层
- 删除未来预埋设计
- 合并职责重复的模块
- 保持单 Agent
- 用 Skill 和模板替代复杂编排
- 明确哪些内容延期到第二阶段
```

#### 1.6.3 从单 Agent 升级评估模板

```plaintext
/speckit.analyze
请评估当前项目是否已经满足升级到主 Agent + Subagents 的条件。

请重点判断：
1. 单 Agent 是否已经成为瓶颈？
2. 哪些子任务天然适合隔离上下文？
3. 是否存在可观测的收益，例如更高成功率、更低修改率、更短耗时？
4. 多 Agent 带来的协调成本是否可接受？

请输出：
- 结论：暂不升级 / 可以升级
- 证据
- 推荐架构
- 不推荐直接升级的原因
```

### 1.7 最实用的使用建议

结合官方Quick Start建议和实际落地经验，最推荐的执行流程如下：

首先执行以下命令，完成需求澄清、方案制定和任务拆解，并校验方案合理性：

```plaintext
/speckit.constitution
/speckit.specify
/speckit.clarify
/speckit.plan
/speckit.tasks
/speckit.analyze
```

确认技术方案无过度工程化、符合MVP原则后，再执行实现命令：

```plaintext
/speckit.implement
```

核心提示：官方明确建议，复杂项目需分阶段实现，优先完成核心能力搭建，再逐步新增功能，避免一次性开发导致的失控和冗余。

