## 第六篇 Codex、AGENTS、Spec Kit 协同流程规范及实践

### 1 先定角色：Codex、AGENTS、Spec Kit 各自管什么

在本协同流程中，三者建议按以下方式明确分工，确保职责清晰、流程顺畅。

#### 1.1 Codex Plan 模式：解决“这次到底怎么做”

Plan mode 用于让 Codex 先收集上下文、提出澄清问题、形成执行方案，再进入编码环节。官方明确说明：复杂任务优先使用 Plan mode，可通过 ``/plan`` 或快捷键切换。([developers.openai.com](https://developers.openai.com/codex/learn/best-practices?utm_source=chatgpt.com))

因此，它适合处理以下场景：

- 本次功能的边界范围是什么
- 哪些需求存在模糊点，需要进一步澄清
- 优先实现 MVP（最小可行产品）还是全量功能
- 是否需要拆分阶段逐步实现

#### 1.2 ``AGENTS.md``：解决“这个仓库长期怎么做”

OpenAI 官方建议将 ``AGENTS.md`` 作为 agent 的 README 文件，用于记录仓库长期遵循的规则，包括：

- 仓库结构规范
- 启动、构建、测试、lint 等常用命令
- 项目工程约定
- 开发禁止事项
- 功能“完成”的定义及验证标准。([developers.openai.com](https://developers.openai.com/codex/learn/best-practices?utm_source=chatgpt.com))

同时，它支持分层加载，优先级从高到低依次为：``~/.codex/AGENTS.md``（全局级）、仓库根目录 ``AGENTS.md``（项目级）、更靠近当前目录的局部规则文件（局部级），越靠近当前工作目录的规则，优先级越高。([developers.openai.com](https://developers.openai.com/codex/guides/agents-md?utm_source=chatgpt.com))

#### 1.3 Spec Kit：解决“从需求到实现的规范化工件”

Spec Kit 的定位并非单纯“编写 prompt”，而是将项目推进拆分为多个标准化阶段，逐步产出 spec（规格）、plan（计划）、tasks（任务）等规范化工件。官方 quickstart 给出的标准流程如下：

- constitution：制定项目核心原则
- specify：定义功能规格，重点强调“做什么（what）”和“为什么做（why）”，不涉及技术栈
- clarify：澄清需求中的模糊点，减少后续返工
- plan：确定技术方案与架构设计
- tasks：拆解可执行的具体任务
- analyze：交叉分析各工件的一致性与覆盖度
- implement：按照任务清单执行实现。([github.github.com](https://github.github.com/spec-kit/quickstart.html?utm_source=chatgpt.com))

### 2 Figma URL 应该放哪里

Figma URL 的存放位置是本流程中易混淆的关键点，需根据其用途明确区分存放场景。

#### 2.1 推荐结论

> **长期稳定的 Figma 入口**，建议放入 ``AGENTS.md``；**当前 feature 的具体 frame / layer URL**，不建议放在仓库级 ``AGENTS.md``，应放在任务级上下文或功能级工件中。

具体说明：

- 放入 ``AGENTS.md`` 的内容（长期有效规则）：设计系统主文件链接、组件库链接、“前端实现以 Figma 为 UI 基准”的全局规则、使用 Figma MCP 的约定。这符合 OpenAI 对 ``AGENTS.md`` 作为“长期有效指导”的定义。([developers.openai.com](https://developers.openai.com/codex/learn/best-practices?utm_source=chatgpt.com))
- 不放入 ``AGENTS.md`` 的内容（一次性、任务级上下文）：当前 feature 的具体 frame / layer URL，更适合放在当前 Codex prompt、``/speckit.specify``、``/speckit.plan`` 或当前 feature 的 spec 文档中。这基于 OpenAI 对 ``AGENTS.md`` 作为“durable guidance”（持久化指导）的要求：一次性上下文不应长期污染仓库全局规则。([developers.openai.com](https://developers.openai.com/codex/learn/best-practices?utm_source=chatgpt.com))

#### 2.2 一个比较稳的写法

在 ``AGENTS.md`` 中仅保留长期有效的 Figma 相关规则，示例如下：

```markdown
## 设计参考
- 前端实现必须遵循Figma设计系统及交互模式。
- 主要设计系统文件：[稳定的Figma设计系统链接]
- 需要设计上下文时使用Figma MCP。
- 功能特定的框架链接应提供在当前任务提示或规格工件中，不永久存储于此。
```

### 3 完整流程：用“AI 学习计划助手”跑一遍

以下结合“AI 学习计划助手”项目，给出一套完整可执行的协同链路，明确各环节操作与规范。

#### 3.1 第 0 步：初始化仓库环境

先在项目目录中准备 Codex 和 Spec Kit 两类基础设施，确保流程可正常启动。

##### 3.1.1 Codex 侧

- 开启 **Plan mode**，复杂任务优先使用该模式
- 使用 ``/init`` 生成初始 ``AGENTS.md``，再根据项目实际需求手工完善。OpenAI 官方明确说明 ``/init`` 可快速生成 starter 版本的 ``AGENTS.md``。([developers.openai.com](https://developers.openai.com/codex/learn/best-practices?utm_source=chatgpt.com))

##### 3.1.2 Spec Kit 侧

Spec Kit 官方说明，大多数 agent 暴露的是 ``/speckit.*`` 系列命令；**Codex CLI 在 skills mode 下使用的是 ``$speckit-\*``**。([github.com](https://github.com/github/spec-kit?utm_source=chatgpt.com))

具体对应关系：

- Claude / 多数聊天 agent：``/speckit.constitution``、``/speckit.specify`` 等
- Codex skills mode：``$speckit-constitution``、``$speckit-specify`` 等

#### 3.2 第 1 步：先写 ``AGENTS.md``

``AGENTS.md`` 聚焦仓库长期规则，不包含具体业务需求，核心是明确“仓库如何长期稳定运行”。

##### 3.2.1 适合放进去的内容

- 技术栈：Vue 3 / Vite / Tailwind / local storage
- 常用命令：``npm run dev``、``npm run lint``、``npm run build``
- 工程约束：优先复用组件；不随意修改目录结构
- 验收标准：改动后必须运行 lint/build 检查
- 设计约束：严格遵守 Figma 交互和样式规范
- Figma 入口：设计系统主链接、组件库链接
- 数据约束：本地持久化，初始阶段不使用数据库

此类内容正是 OpenAI 官方建议放在 ``AGENTS.md`` 中的核心内容。([developers.openai.com](https://developers.openai.com/codex/learn/best-practices?utm_source=chatgpt.com))

##### 3.2.2 示例

```markdown
# AGENTS.md

## 项目概述
- 这是一个Vue 3 + Vite应用。
- 用户计划和进度本地持久化；除非明确要求，否则不引入数据库。

## 工作约定
- 非简单功能优先使用Plan模式。
- 优先进行最小化、针对性修改，而非大范围重构。
- 添加新的生产依赖前需询问确认。

## 设计规则
- 严格遵循Figma设计系统及交互模式。
- 设计系统文件：[Figma设计系统链接]
- 实现UI时，如需结构化设计上下文，使用Figma MCP。
- 功能特定的框架链接属于任务提示或规格工件，不存放于此。

## 必要检查
- 开发：`npm run dev`
- 代码检查：`npm run lint`
- 构建：`npm run build`

## 完成标准
- 实现所需功能
- UI与Figma设计意图一致
- 相关检查均通过
```

#### 3.3 第 2 步：``$speckit-constitution`` 建立宪法

这一步聚焦**全局研发原则**，不涉及具体功能实现，核心是定义项目的开发准则，指导后续所有开发环节。

Spec Kit 官方说明，constitution 用于创建项目的 governing principles（指导原则）和 development guidelines（开发指南），贯穿项目全生命周期。([github.com](https://github.com/github/spec-kit?utm_source=chatgpt.com))

##### 3.3.1 本项目适合的宪法内容

- **Figma-first UI fidelity**（UI 优先遵循 Figma 设计）
- **本地持久化优先**
- **需求先 clarify 再 plan**（先澄清需求再制定计划）
- **MVP 分阶段交付**
- **变更必须可验证**
- **前端交互一致性优先于炫技**

##### 3.3.2 示例 prompt

```markdown
$speckit-constitution
本项目遵循Figma优先原则。UI及交互行为必须与已确认的Figma设计保持一致。
所有数据持久化均以本地优先，初始阶段不使用数据库。
我们倾向于先交付可运行的MVP（最小可行产品），再开发次要功能。
每一项功能变更都必须通过明确的验证步骤进行验证。
优先选择简单架构和最少依赖。
```

#### 3.4 第 3 步：``$speckit-specify`` 只写 what 和 why

Spec Kit 官方明确强调：``/speckit.specify`` 需重点说明“要做什么（what）、为什么做（why）”，**不建议在该阶段讨论技术栈**，避免过早锁定实现方式。([github.github.com](https://github.github.com/spec-kit/quickstart.html?utm_source=chatgpt.com))

##### 3.4.1 正确写法建议

不建议写的内容（技术栈相关）：

- Vue3、localStorage、OpenAI API 等技术细节
- 组件拆分、代码实现方式

建议写的内容（需求相关）：

- 目标用户是谁
- 用户想解决什么核心问题
- 需要哪些核心功能
- MVP 包含的核心能力
- 这些功能对用户的价值（为什么重要）

##### 3.4.2 示例 prompt

```markdown
$speckit-specify
开发一款面向备考学生的AI学习计划助手。
该产品应帮助用户根据目标考试、可用时间、当前水平和偏好的学习强度创建学习计划。
用户应能够创建多个学习计划、查看进度并跟踪每日任务。
仪表盘应帮助用户快速了解整体进度和当前优先级。
此功能很重要，因为用户通常难以将模糊的学习目标转化为可执行的计划。
所有面向用户的界面均以已确认的Figma设计为UI参考。
当前框架参考：
- 仪表盘：[框架链接]
- 创建计划流程：[框架链接]
- 计划详情页：[框架链接]
```

注：此处放置具体 frame URL 是合理的，因为这属于当前 feature 的上下文，而非仓库级长期规则。

#### 3.5 第 4 步：``$speckit-clarify`` 把模糊点问透

Spec Kit 官方建议，在制定 plan 之前先运行 clarify 环节，明确需求模糊点，减少后续计划和实现阶段的返工。([github.github.com](https://github.github.com/spec-kit/quickstart.html?utm_source=chatgpt.com))

针对“AI 学习计划助手”项目，以下是典型的需求模糊点，需重点澄清：

##### 3.5.1 重点澄清方向

- 仪表盘默认显示视角（如默认显示所有计划、当前活跃计划等）
- 多计划并行时的优先级逻辑（如按创建时间、重要程度排序）
- AI 生成计划后，用户是否允许手动修改
- 学习任务的完成状态如何定义（如点击完成按钮、满足特定条件）
- 当 Figma 设计与文档说明冲突时，以哪个为准
- 是否支持离线使用，离线数据如何同步
- 用户首次使用是否需要引导流程

##### 3.5.2 主动补充澄清方向的示例

```markdown
$speckit-clarify
重点关注仪表盘默认显示规则、计划优先级、任务完成状态、AI计划可编辑性，以及Figma与书面规格的冲突解决方式。
```

该写法可引导 agent 聚焦核心模糊点，提升澄清效率。

#### 3.6 第 5 步：``$speckit-plan`` 进入技术实现

进入 plan 环节后，方可明确技术栈、架构设计等“如何实现（how）”的内容，这与 Spec Kit 官方流程要求一致。([github.github.com](https://github.github.com/spec-kit/quickstart.html?utm_source=chatgpt.com))

##### 3.6.1 本环节需明确的核心内容

- 前端技术栈：Vue 3 + Vite
- 模型调用：OpenAI API
- API key 来源：全局环境变量（避免硬编码）
- 本地持久化方案：localStorage / IndexedDB
- 页面路由设计
- 核心数据模型（如计划、任务、进度等）
- API 接口约定
- 是否使用 mock 数据，是否真实调用模型
- 状态管理方式（如 Pinia、Vuex 或简单响应式）
- 数据校验、异常处理方式

##### 3.6.2 示例 prompt

```markdown
$speckit-plan
前端使用Vue 3 + Vite开发。
模型调用必须使用OpenAI API，且API密钥需来自环境变量。
学习计划、任务和进度必须本地持久化，不使用数据库。
布局和交互严格遵循已确认的Figma设计。
当Figma设计与规格说明冲突时，实现细节以书面规格为准。
初始实现应包含：
- 创建学习计划流程
- 使用真实模型响应生成AI任务分解
- 仪表盘
- 计划详情与进度跟踪
- 优先采用简单架构，减少依赖。
```

##### 3.6.3 本环节常见产物

根据 Spec Kit 官方示例，feature 目录下通常会生成以下工件：

- ``spec.md``：功能规格文档
- ``plan.md``：技术实现计划
- ``research.md``：技术调研文档
- ``data-model.md``：数据模型文档
- ``quickstart.md``：快速启动说明
- ``contracts/``：接口约定目录（如 API 规范等）。([github.com](https://github.com/github/spec-kit/blob/main/README.md?utm_source=chatgpt.com))

注：原文中提到的 ``contracts/openapi.yaml`` 是常见的接口约定形态，但 Spec Kit 官方示例中展示的是 ``contracts/api-spec.json`` 及其他约定文件，因此更稳妥的表述是：**contracts 目录下会存放接口约定工件，具体格式取决于项目模板**。([github.com](https://github.com/github/spec-kit/blob/main/README.md?utm_source=chatgpt.com))

#### 3.7 第 6 步：``$speckit-checklist`` 检查 spec 是否完整

Spec Kit 官方对 checklist 的定义是：生成自定义质量清单，用于验证需求的完整性、清晰度和一致性，是“需求验收前检查”的关键环节。([github.com](https://github.com/github/spec-kit?utm_source=chatgpt.com))

##### 3.7.1 检查重点方向

- 所有功能点是否可测试、可验证
- 是否存在未澄清的术语或需求
- 是否有不可实现的隐含要求
- UI 各状态（正常态、空态、错误态等）是否完整
- 异常流程（如网络错误、数据异常）是否缺失

##### 3.7.2 示例 prompt

```markdown
$speckit-checklist
生成一份检查清单，用于验证本功能规格是否完整、可测试、可实现，且符合Figma驱动的UI需求。
```

#### 3.8 第 7 步：``$speckit-tasks`` 任务拆解

Spec Kit 官方说明，``/speckit.tasks`` 会根据 implementation plan（技术实现计划），生成可执行的任务清单，为后续 implement 环节提供明确依据。([github.github.com](https://github.github.com/spec-kit/quickstart.html?utm_source=chatgpt.com))

##### 3.8.1 本项目合理的任务拆解示例

1. 初始化 Vue3 项目和基础目录结构
2. 建立本地数据模型（定义计划、任务、进度等数据结构）
3. 实现“创建学习计划”表单（含用户输入、校验逻辑）
4. 集成 OpenAI API，实现 AI 生成任务规划功能
5. 开发计划详情页，展示任务列表及进度
6. 实现仪表盘聚合逻辑（展示全局进度、优先级任务等）
7. 集成本地持久化，实现数据存储与读取
8. 开发进度更新与回显功能（如任务完成状态切换）
9. 补充基础校验和异常态处理（如空输入、API 调用失败）
10. 运行 lint/build 检查，并进行手工验证

注：任务拆解是 implement 环节的核心前提，需确保任务有序、可执行，且覆盖所有 plan 中定义的实现内容。

#### 3.9 第 8 步：``$speckit-analyze`` 交叉分析

Spec Kit 官方将 analyze 定义为 **cross-artifact consistency & coverage analysis**（跨工件一致性与覆盖度分析），建议在 ``tasks`` 之后、``implement`` 之前运行，用于发现潜在问题。([github.com](https://github.com/github/spec-kit?utm_source=chatgpt.com))

##### 3.9.1 本环节适合发现的问题

- spec 中定义的需求，tasks 未覆盖
- plan 中设计的架构（如状态管理），tasks 未落地
- Figma 要求的空态、错误态，spec 中遗漏
- 数据结构与页面流程存在冲突

##### 3.9.2 示例 prompt

```markdown
$speckit-analyze
分析宪法、规格、计划、检查清单和任务之间的一致性和覆盖度。
重点关注缺失的状态、未覆盖的需求，以及数据模型、UI流程和实现任务之间的冲突。
```

#### 3.10 第 9 步：``$speckit-implement`` 实现前先清上下文

原文提到“先清空上下文”的做法，是合理的工程习惯。进入 implement 环节时，需确保 agent 基于最终确认的工件执行，避免前期探索性对话上下文干扰，提升执行准确性。

Spec Kit 官方对 ``implement`` 的说明如下：

- 检查 constitution、spec、plan、tasks 等前置工件是否齐全
- 解析 ``tasks.md`` 中的任务清单
- 按任务依赖顺序执行实现
- 遵循任务计划中的 TDD（测试驱动开发）思路
- 实时提供进度更新，处理执行过程中的错误。([github.com](https://github.com/github/spec-kit?utm_source=chatgpt.com))

##### 3.10.1 实施建议

在执行 ``$speckit-implement`` 前，仅保留以下核心上下文，确保 agent 聚焦执行：

- ``AGENTS.md``（仓库长期规则）
- constitution（项目研发原则）
- spec（功能规格）
- plan（技术实现计划）
- tasks（任务清单）
- 当前 feature 所需的 Figma frame URL

### 4 如果不用 Spec Kit，怎么轻量化

若项目规模较小、需求简单，无需使用 Spec Kit 的完整流程，可采用轻量化方案，更贴合小项目、快速原型的开发需求。OpenAI 官方对 Codex 的轻量化使用有明确建议：

- 复杂任务先用 Plan mode
- 把可复用约束写进 ``AGENTS.md``
- 把重复工作流升级成 Skills。([developers.openai.com](https://developers.openai.com/codex/learn/best-practices?utm_source=chatgpt.com))

#### 4.1 轻量流程

1. 使用 ``/init`` 生成初始 ``AGENTS.md``，并根据项目需求完善
2. 使用 ``/plan`` 和 Codex 澄清需求、明确边界、确认 Figma 入口
3. 让 Codex 直接生成一份 ``PLANS.md`` 或 feature plan（功能实现计划）
4. 将重复出现的工作流（如代码校验、测试）做成 Skills，提升复用效率
5. 进入编码环节，直接执行实现

#### 4.2 适合场景

- 小功能开发、快速原型验证
- 单人项目，无需复杂的工件管理
- 不想维护大量 spec 相关工件，追求高效迭代

#### 4.3 不足

- 需求可追踪性弱，后期难以追溯需求来源与实现逻辑
- 需求变更多时，容易出现需求漂移，难以保持一致性
- 团队协作时，缺乏统一的规范化工件，沟通成本较高

### 5 ``AGENTS`` 设计详解

> **“给 Codex 的项目级行为规范文件”**——它负责定义默认工作方式；写法上要**短、硬、可执行、可验证、可分层覆盖**；真正复杂的复用流程不要继续堆在这里，而应该交给 **Skills**。

#### 5.1 ``AGENTS.md`` 是什么

对 Codex 而言，``AGENTS.md`` 并非普通文档，而是**持久化项目指令**。Codex CLI 会自动发现这些文件，并将其注入到工作上下文；在官方 Prompting Guide 中，这些内容会以独立的 **user-role message**形式，出现在用户提示之前。

这意味着它最适合存放“**每次工作都应生效**”的规则，例如：

- 项目如何启动、构建、测试
- 修改代码后必须执行哪些检查
- 哪些目录、文件有特殊约束（如禁止修改）
- 哪些操作需要先确认再执行（如新增依赖）
- PR、文档、测试的最低要求

它不适合堆放一次性的任务说明（如“本次需修改某个页面的按钮样式”）。官方明确将 ``AGENTS.md`` 定义为**随仓库一起迭代的 durable project guidance**（持久化项目指导）；若需实现更复杂、可复用、带脚本/参考资料的流程，官方更推荐使用 **Skills**。此外，自定义 prompts 已被标记为**deprecated**（废弃），建议迁移到 Skills。

##### 5.1.1 明确 ``AGENTS.md`` 和 Spec-kit 各工件的职责分工

- ``AGENTS.md``：仅定义 Codex 的工作方式（仓库级长期规则）
- ``.specify/memory/constitution.md``：仅定义项目长期研发原则
- ``specs/.../spec.md``：定义某个具体功能“要做什么、为什么做”
- ``specs/.../plan.md``：定义该功能“如何实现”
- ``specs/.../tasks.md``：定义该功能的具体任务拆解清单

#### 5.2 Codex 如何发现并合并这些文件

Codex 启动时，会自动构建一条“指令链”，按以下规则加载并合并 ``AGENTS.md`` 相关文件：

1. **全局层**：优先读取 ``~/.codex/AGENTS.override.md``（全局临时覆盖规则），若不存在则读取 ``~/.codex/AGENTS.md``（全局长期规则）；若设置了 ``CODEX_HOME`` 环境变量，则从该变量指定的目录读取。
2. **项目层**：从仓库根目录开始，逐级遍历到当前工作目录；每一级目录都按“``AGENTS.override.md`` → ``AGENTS.md`` → ``project_doc_fallback_filenames`` 中定义的备用文件名”的顺序查找，每级目录最多加载一个文件。
3. **合并顺序**：按“全局层 → 项目根目录 → 子目录”的顺序拼接文件内容，**越靠近当前工作目录的规则，优先级越高**（后续规则会覆盖前置规则）。
4. **大小限制**：空文件会被自动忽略，所有合并文件的总字节数默认上限为 ``project_doc_max_bytes = 32 KiB``（可通过配置修改）。

官方补充细节：**每个被发现的文件都会作为一条单独的 user-role message 注入上下文**，消息头类似 ``# AGENTS.md instructions for <directory>``。这也是为什么分层编写规则，比将所有规则塞进根目录一个大文件更稳妥、更易维护。

#### 5.3 设计规范：一份好的 ``AGENTS.md`` 应该写什么

结合 OpenAI 官方文档、官方示例及 ``openai/codex`` 仓库自身的 ``AGENTS.md`` 实践，一份有效的 ``AGENTS.md`` 通常包含以下四类核心信息。

##### 5.3.1 环境与入口

告诉 Codex**从哪里开始工作**，明确项目的基础环境信息，例如：

- 使用的包管理器（如 pnpm、npm）
- 启动开发环境的具体命令
- monorepo 项目中，如何快速定位目标 package
- 哪个目录是核心开发模块（需重点关注）

官方示例中，这类内容通常归为“Dev environment tips”（开发环境提示），是 Codex 快速熟悉项目的关键。

##### 5.3.2 验证与测试

这是 ``AGENTS.md`` 最核心的内容之一，需明确“修改代码后如何验证正确性”，例如：

- 修改代码后，必须运行哪些检查（如 lint、typecheck、test）
- 哪些检查可自动执行，哪些需要先征求用户确认
- 全量测试与局部测试的边界（如修改共享模块需跑全量测试）
- lint、typecheck、snapshot 等检查与 CI（持续集成）的对齐方式

OpenAI 自身的 ``codex`` 仓库，就在 ``AGENTS.md`` 中明确写了 Rust 改动后需运行 ``just fmt``、项目级测试、何时跑全量测试、何时更新 schema / lockfile 等规则，可见 **“可执行的验证规则”是 AGENTS 的核心价值**。

##### 5.3.3 代码与架构约束

明确项目的代码规范与架构限制，避免 Codex 做出不符合项目规范的改动，例如：

- 哪些模块已饱和，不建议继续膨胀（需拆分新模块）
- 新功能优先放在新模块，避免污染原有核心代码
- 哪些 API 设计禁忌需要避免（如禁止暴露敏感接口）
- 哪些文件、环境变量、安全逻辑禁止修改（如密钥配置）

官方仓库示例甚至将“不要修改某些 sandbox 相关代码”“避免大模块”“新增 API 要同步 docs/”等规则写入，说明 ``AGENTS.md`` 不仅是代码风格说明，更是**把长期反复出现的 review 意见固化下来**，减少重复沟通成本。

##### 5.3.4 交付与协作约束

明确项目的交付标准与协作规范，确保团队协作顺畅，例如：

- PR（合并请求）标题、描述的格式要求
- 修改功能行为时，需同步更新相关文档
- 新增依赖是否需要先征求团队确认
- 涉及安全、密钥、生产配置时的沟通要求

官方全局示例和仓库示例都在强调这一层，可见 ``AGENTS.md`` 也是团队协作规范的重要载体。

#### 5.4 推荐写法原则

结合 OpenAI 官方材料抽象，编写 ``AGENTS.md`` 需遵守以下五条原则，确保规则实用、可执行：

1. **聚焦长期有效规则，不写一次性任务**：OpenAI 在 Codex best practices 中明确将 ``AGENTS.md`` 定义为 “durable guidance”（持久化指导），一次性任务（如“修复某个 bug”“开发某个页面”）应写在 prompt 中，而非 ``AGENTS.md``。
2. **短、准、可执行，拒绝空泛**：官方原话明确：一个“short, accurate ``AGENTS.md``”（简短、准确）比一份“long file full of vague rules”（冗长、空泛）更有用；建议先写基础规则，再在观察到 Codex 反复犯同类错误时，逐步补充。
3. **优先写可执行的约定**：例如明确“修改 JavaScript 后总是运行 ``npm test``”“优先用 ``pnpm``”“新增生产依赖前先确认”，而非“请写高质量代码”这类无约束力的表述。官方示例均采用“命令明确、动作明确、边界明确”的风格。
4. **通用规则与局部规则分层放置**：官方推荐将个人长期偏好放在 ``~/.codex/AGENTS.md``（全局级），团队共享规范放在仓库根目录（项目级），子目录有特殊规则则单独放置 ``AGENTS.override.md`` 或 ``AGENTS.md``（局部级），比单一大文件更易维护、优先级更清晰。
5. **重复流程升级为 Skills，不堆进 ``AGENTS.md``**：OpenAI 明确将 ``AGENTS.md`` 定位为持久化指导，而 Skills 定位为“可复用工作流”的载体。例如“发布流程”“数据库迁移流程”等多步骤 SOP，长期看更适合做成 Skills，避免 ``AGENTS.md`` 过于冗长。

#### 5.5 通用项目模板（可直接修改使用）

以下模板基于官方规范归纳，适用于 Vue / React / Node / monorepo 项目，可根据项目实际需求调整：

```markdown
# AGENTS.md

## 项目范围
- 本文件适用于整个仓库，除非更深层的AGENTS.md对其进行覆盖。

## 工作规则
- 优先进行最小化、局部化修改，而非大范围重构。
- 非必要不添加新依赖。
- 修改生产配置、密钥、CI或部署文件前需询问确认。

## 开发环境
- 包管理器：pnpm
- 主应用：apps/web
- 主API：apps/server
- 对于monorepo包查找，编辑前请先查看每个package.json的name字段。

## 常用命令
- 安装：pnpm install
- 开发：pnpm dev
- 代码检查：pnpm lint
- 类型检查：pnpm typecheck
- 测试：pnpm test

## 代码变更策略
- 优先复用现有模式，再引入新的抽象概念。
- 尽量减少公共API的变更，且变更需明确。
- 修改共享工具时，需检查所有受影响的调用者。

## 测试策略
- 代码变更后，需运行代码检查和类型检查。
- 功能行为变更时，需新增或更新测试用例。
- 优先运行针对性测试；仅当共享模块被修改时，才运行完整测试套件。

## 文档策略
- 若功能行为或公共API发生变更，需更新docs/目录下的文档。
- 若环境配置发生变更，需更新README或模块文档。

## 合并请求/交付要求
- 总结变更内容、变更原因及验证方式。
- 说明任何潜在风险、后续工作或有意跳过的检查项。

## 目录专项说明
- `apps/web`：重点关注UI响应式、可访问性及路由级性能。
- `apps/server`：除非明确要求，否则避免破坏schema的变更。
```

模板结构贴合官方示例与实践，涵盖：作用范围、工作规则、开发环境、常用命令、代码变更策略、测试策略、文档策略、交付策略、目录特化说明，可直接复用。

#### 5.6 如何使用 ``AGENTS.md``

##### 1）全局个人偏好（个人级）

将个人长期开发习惯写入全局 ``AGENTS.md``，适用于所有个人项目：

```bash
~/.codex/AGENTS.md
```

示例内容：总是先跑测试、偏好使用 ``pnpm``、新增依赖前先确认等。若需临时覆盖全局规则，可创建 ``~/.codex/AGENTS.override.md``，删除该文件即可恢复全局规则。

##### 2）项目团队规范（项目级）

在仓库根目录放置 ``AGENTS.md``，写入团队共享约定：

```bash
AGENTS.md
```

示例内容：团队开发命令、测试规则、PR 要求、代码规范等，确保所有团队成员（含 Codex）遵循统一标准。

##### 3）模块专项规则（局部级）

在子目录（如特定服务、模块）放置 ``AGENTS.override.md`` 或该目录自身的 ``AGENTS.md``，定义局部特殊规则：

```bash
services/payments/AGENTS.override.md
```

示例场景：支付模块的安全规则、后台管理模块的权限约束、前端应用的性能要求等，实现“全局统一、局部特殊”的规则管理。

##### 4）验证是否生效

官方推荐使用以下命令，验证 Codex 是否正确加载了 ``AGENTS.md`` 规则：

```bash
codex --ask-for-approval never "Summarize the current instructions."
codex --cd subdir --ask-for-approval never "Show which instruction files are active."
```

也可查看日志文件，确认加载情况：

```bash
~/.codex/log/codex-tui.log  # 或 session 日志文件（启用 session logging 后）
```

##### 5）已有项目不想改文件名

若项目已存在 ``TEAM_GUIDE.md`` 等类似规则文件，无需修改文件名，可在 ``~/.codex/config.toml`` 中配置备用文件名：

```toml
project_doc_fallback_filenames = ["TEAM_GUIDE.md", ".agents.md"]
project_doc_max_bytes = 65536  # 可选：调整合并文件大小上限
```

配置后，Codex 会将这些文件也视为项目指令文件，按优先级加载。

#### 5.7 `AGENTS.md` 和 Skills / Subagents 的区别

三者职责分工清晰，可简单总结为：

- **``AGENTS.md``**：项目级、长期有效、默认始终生效的规则，定义 Codex 的基础工作方式。
- **Skills**：某类任务的可复用工作流，可包含 ``SKILL.md``、脚本、参考资料，支持显式或隐式触发（如重复的测试、部署流程）。
- **Subagents**：任务复杂到需要并行执行、分角色分工、分模型配置时使用（如多模块并行开发、分角色负责测试与编码）。

实践建议流程：

1. 先用 ``AGENTS.md`` 固定仓库基础规则，确保 Codex 工作方式统一。
2. 再将重复出现的流程（如代码校验、文档更新）沉淀成 Skills，提升效率。
3. 任务复杂到需要分工协作时，再引入 Subagents。

#### 5.8 常见误区

结合官方规范与实践，编写和使用 ``AGENTS.md`` 需避免以下误区：

1）把它写成超长规范手册

- 官方有默认 32 KiB 上限；太长会被截断，更适合拆层或改成 Skills。

2）只写“请写高质量代码”

- 这类话几乎没约束力。要改成“改完跑什么、别改什么、何时更新 docs、哪些目录有特殊要求”。官方示例和官方仓库都偏向这种可执行规则。

3）把一次性任务说明塞进去

- 一次性需求应该写在 prompt 里；`AGENTS.md` 只放会反复使用的规则。官方把它定位为 durable guidance。

4）全项目只放一个根文件

- 更好的方式是：根目录写共性，子目录写特性。因为 Codex 的规则是**从根到当前目录逐级合并，近处覆盖远处**。

本文将AI代码审查相关问题拆分为质量保障、开发者审核方法、Spec Kit产出不达预期时的修正方案三部分，结合官方文档做法，落地一套可执行流程。

> **核心原则**：不要把“代码质量”寄托在最后一次code review上，而是把质量控制拆到“生成前、生成中、生成后”三段。

Spec Kit的价值，正是把这三段前移：先立原则，再写规格，再澄清，再做计划，再拆任务，最后才实现。GitHub官方流程就是 `constitution → specify → clarify → checklist → plan → tasks → analyze → implement`，并明确建议在 `plan` 前做 `clarify`，在 `implement` 前做 `analyze`，复杂项目分阶段实现。

### 6.1 如何保证 AI 生成代码的质量

最有效的方法，不是“让AI更聪明”，而是让它**在更清晰的边界内工作**。

#### 6.1.1 生成前：先把“源头”做对

如果源头是模糊的，后面的代码再努力也会跑偏。OpenAI的Codex最佳实践建议，给代理的默认任务上下文至少包含四类信息：**目标、上下文、约束、完成标准**；这样能减少假设，让结果更容易审核。Codex还建议复杂任务先进入Plan mode，让代理先收集上下文、提澄清问题，再实施。

放到Spec Kit里，对应就是：

- `constitution`：定义项目原则和硬约束
- `specify`：定义what / why
- `clarify`：消除歧义
- `checklist`：检查规格完整性
- `plan`：给出技术方案
- `tasks`：拆成可验证小步

GitHub官方明确说明，`/speckit.specify` 应聚焦what和why，而不是tech stack；`/speckit.clarify` 推荐在 `/speckit.plan` 前执行，以减少下游返工；`/speckit.checklist` 用于验证需求完整性、清晰度和一致性。

> **关键结论**：高质量AI代码的第一原则不是“写好实现prompt”，而是“把spec写对”。

#### 6.1.2 生成中：把实现拆小，不要一口气生成整个功能

Spec Kit官方建议复杂项目分阶段实现，先完成核心功能，再逐步增加特性，避免一次性把agent的上下文压得太满。Codex也建议困难任务先plan，再逐步执行。

工程上最有效的做法是：

- 先让AI只完成一个小任务，比如“封装localStorage service”，而不是“把整个习惯打卡项目全做完”。
- 然后立即跑最小验证：单测、lint、build、手动操作。
- 验证通过后，再推进下一个task。

这样做有两个直接好处：第一，错误更容易定位；第二，偏差不会滚雪球。

#### 6.1.3 生成后：用“验证链”而不是“主观感觉”判断质量

Spec Kit的 `tasks.md` 本身就会把任务拆成依赖顺序、文件路径、测试优先顺序和阶段检查点；`implement` 会先验证constitution/spec/plan/tasks是否齐全，再按任务顺序执行。官方还明确提醒，实现完成后要继续测试应用，并把浏览器控制台之类CLI看不到的错误再反馈给agent修复。

所以，AI代码质量要靠一条明确的验证链：

> **规格一致性 → 任务完成度 → 自动化测试 → 构建通过 → 运行态验证 → 人工评审**

这比“看起来写得挺像样”要可靠得多。

### 6.2 开发者做代码审核时，正确的思路是什么

开发者review AI代码时，最常见的错误是**只盯diff，不看spec**。AI代码审核更好的顺序应该是：

#### 6.2.1 第一步：先审“是不是做对了事”

先对照 `spec.md`、`plan.md`、`tasks.md` 看实现有没有偏题，而不是先看代码风格。因为在Spec-Driven Development里，spec是source of truth，GitHub官方博客也明确这么描述：spec是代码行为的契约，工具和AI会据此生成、测试和校验代码。

你先看四个问题：

1. 实现的是不是spec里的需求，而不是AI自己扩展出来的功能
2. 非功能约束有没有守住，比如“不要引入新依赖”“不要上状态管理库”
3. 边界条件有没有覆盖
4. 完成标准有没有达到

如果第一步没过，后面再看实现细节意义不大。

#### 6.2.2 第二步：再审“技术路线对不对”

这一步对照的是 `plan.md`。你主要看：

- 架构是否过度设计
- 组件边界是否合理
- 数据流是否清晰
- 有没有引入不必要的抽象
- 有没有违背仓库级约束

Codex官方建议把repo layout、build/test/lint命令、工程约定、限制项、done的定义都写进 `AGENTS.md`，而且 `AGENTS.md` 会在Codex工作前自动读入。也就是说，review时不光要看代码，还要看它有没有遵守仓库级agent规则。

#### 6.2.3 第三步：最后才审“代码本身写得好不好”

这一层才看具体实现：

- 命名是否清晰
- 逻辑是否容易理解
- 组件是否单一职责
- 错误处理是否完整
- 测试是否覆盖核心路径和边界情况
- 是否有明显重复代码
- 是否出现隐藏副作用

这里建议你把review分成三类问题：

- **A类：需求偏差** 实现不符合spec，这种不能直接patch代码，要回到spec/plan/tasks层修。
- **B类：设计偏差** 功能对了，但方案不合适，比如状态放错层、耦合太重、抽象过头。这种通常要回到plan层修。
- **C类：实现缺陷** 方案没问题，只是有bug、漏判、测试不全、命名差。这种可以直接定点修代码。

这种分层很重要，因为它决定你应该改哪里，而不是一股脑让AI“重新生成一版”。

#### 6.2.4 第四步：要求AI先解释，再改

如果你发现问题，不要直接说“重写”。更好的做法是先让AI回答三个问题：

1. 它是根据spec的哪一段做出当前实现的
2. 它为什么选这个方案
3. 哪个约束让它做了这个取舍

这样能快速判断问题出在spec、plan还是implement。OpenAI也强调，Codex更适合被当作“可持续配置和改进的队友”，而不是一次性助手。

#### 6.2.5 第五步：把重复错误沉淀回规则

Codex最佳实践里有一个很实用的建议：**`AGENTS.md`****如果Codex连续犯同样的错，就让它做retrospective，然后更新** 。官方还建议 `AGENTS.md` 保持简短、实用，规则应来自真实摩擦，而不是空泛口号。

这意味着开发者review不只是“发现问题”，还要做一件更重要的事：**把问题变成以后不会再犯的规则。**

### 6.3 如果 Spec Kit 生成的代码没达到预期，应该怎么改

> **核心原则**：不要一上来就改代码，先判断“错在spec、错在plan，还是只错在实现”。

#### 6.3.1 情况 1：功能方向就错了

比如你想要“每天最多打卡一次”，结果AI做成了“可无限次打卡”；或者你要“删除习惯时保留历史”，它却做成了级联删除。

这类问题通常不是实现能力问题，而是**spec没写清、clarify没补齐，或者checklist没卡住**。正确做法不是“把实现patch一下”，而是：

1. 回到 `specify` 或 `clarify`
2. 把缺失的业务规则补进去
3. 重新跑 `checklist`
4. 必要时重做 `plan` 和 `tasks`
5. 再让 `implement` 只重做受影响的任务

因为source of truth是spec；如果只修代码，不修spec，下次agent还会按旧规则继续偏。GitHub官方把spec明确称为source of truth；Spec Kit也明确把 `clarify` 放在 `plan` 之前，就是为了减少这种返工。

#### 6.3.2 情况 2：需求没错，但技术方案不合适

比如功能都对，但AI引入了没必要的抽象，或者用了不符合项目预期的状态管理方式。

这类问题通常出在 `plan.md`。正确做法是：

1. 修改 `constitution` 或 `AGENTS.md`，增加技术边界
2. 回到 `plan`，明确重写技术方案
3. 重新生成 `tasks`
4. 再实施受影响的任务

例如你可以明确写：

```markdown
请不要修改 spec。
当前问题不是业务需求，而是技术方案过度设计。
请重做 implementation plan，要求：
- 保持 Vue 组件简单
- 不引入额外状态管理
- localStorage 只放在 service 层
- 先修正 plan，再重建 tasks，不要直接改代码
```

这类提示比“重写一版”更有效，因为它把问题定位到了正确层级。

#### 6.3.3 情况 3：方案正确，只是代码实现有bug或质量差

这类问题最常见，比如：

- streak计算错一天
- localStorage没处理空值
- 某个组件职责混乱
- 测试漏了边界场景

这时就不需要回滚到spec。你可以直接针对具体task修：

```markdown
当前 spec 和 plan 不变。
只修复 T4 的实现问题：
- streak 计算在跨天边界时错误
- 增加对应 Vitest 测试
- 不改动其他任务
修复后运行测试并总结原因
```

Spec Kit README明确说，`tasks.md` 提供的是 `/speckit.implement` 的路线图；也就是说，**按task定点返修** 是最自然的修法。

### 6.4 一个最实用的“排障顺序”

如果Spec Kit产出不理想，你可以按下面顺序排查：

1. 先问：是spec不清，还是实现没跟上？

如果是“做了不该做的事”，先回`specify/clarify/checklist`。如果是“做法不对”，先回 `plan`。如果是“做得不够好”，直接修 `tasks/implement`。

2. 再问：规则够不够具体？

Codex官方建议把repo layout、运行方式、测试命令、工程约定、限制项、done的定义写进 `AGENTS.md`。如果AI老是在相同地方偏航，通常说明这些约束没有真正写进仓库级规则。

3. 再问：任务是不是太大了？

Spec Kit官方建议复杂项目分阶段实现；如果一次让agent同时改太多文件、太多层，质量通常会下降。

4. 再问：有没有做 `analyze`

Spec Kit README把 `/speckit.analyze` 定义为cross-artifact consistency & coverage analysis，并明确建议它放在`tasks` 之后、`implement` 之前。很多“代码没达到预期”的问题，其实在implement前就能在analyze阶段发现。

#### 6.4.5 最后才考虑重生成

只有当前面几层都确认修不动时，才适合大范围重生成功能。否则很容易把一个局部问题，变成一次更大的不确定改动。

### 6.5 实际开发里固定使用的审核模板

每次review AI代码，都可以按这套顺序问：

**第一组：对不对**

- 这次改动对应spec的哪一段
- 有没有违反constitution / AGENTS.md
- done的定义是否满足

**第二组：稳不稳**

- 测试是否覆盖主路径和边界
- lint/build是否通过
- 运行态是否正常，有没有浏览器控制台错误
- 有没有引入多余复杂度

**第三组：值不值得沉淀**

- 这次错误是偶发，还是会重复出现
- 是否应该把它写回AGENTS.md
- 是否应该拆成一个repo skill

Codex官方建议把重复工作变成skills，并且每个skill专注一个任务、写清输入输出、测试触发行为。
