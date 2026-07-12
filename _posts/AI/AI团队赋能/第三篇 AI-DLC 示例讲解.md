## 第三篇 AI-DLC 示例讲解（Habit Board项目）

本次AI-DLC实践以轻量前端项目为载体，项目名设定为：**Habit Board（习惯打卡板）**。该项目为典型的轻量前端应用，不接入后端，仅基于 **Vue3 + Vite** 开发单页应用（SPA），复杂度适中，可聚焦于AI-DLC流程本身，而非业务难度。Vue官方目前推荐新项目优先使用Vite，`create-vue` 生成的项目默认基于Vite，并可按需勾选Router、Pinia、Vitest、E2E、ESLint、Prettier等功能。

项目核心功能共四类，简洁明确：

1. 新增习惯
2. 每日打卡
3. 查看连续打卡天数
4. 本地持久化保存

### 1.1 先把 AI-DLC 和 Codex 对齐

AI-DLC 的核心并非“让AI直接写代码”，而是让AI **先建计划、再提澄清问题、再在人工确认后执行**。AWS对AI-DLC的描述明确：其工作模式为 **AI创建计划、主动澄清上下文、仅在人类验证后实施**；整个方法分为 **Inception、Construction、Operations** 三个阶段，且流程会根据项目复杂度自适应——简单改动可跳过不必要阶段，复杂需求则会执行更完整的分析和测试。

Codex方面，官方将Codex CLI定义为可在本地终端运行的coding agent，能够**读取、修改并运行当前目录下的代码**。Codex在工作前会读取 `AGENTS.md` 文件，并支持Skills、Subagents、sandbox和approvals等功能。AWS开源AI-DLC仓库明确说明，AI-DLC可用于**任何支持项目级规则或steering files的coding agent**。

综上可得出结论：**虽然AI-DLC最初并非围绕Codex设计，但完全可以用Codex承载AI-DLC流程**。

> 核心要点：AI-DLC的核心是“计划-澄清-验证-执行”的循环，Codex的规则读取、代码操作能力，可完美适配AI-DLC的流程要求，成为其落地载体。

### 1.2 Vue3 + Codex 的起步方式

实践第一步为搭建项目脚手架与安装Codex CLI，均遵循官方标准流程，确保环境合规、可复用。

#### 1.2.1 搭建Vue3 + Vite项目脚手架

Vue官方推荐使用 `create-vue` 生成基于Vite的Vue应用，Vite官方也提供了直接创建Vue模板的命令。需注意，Vite当前文档要求Node.js版本至少为 `20.19+` 或 `22.12+`。

实用起步方式（推荐）：

```bash
npm create vue@latest habit-board
cd habit-board
npm install
npm run dev
```

无提示快速创建方式（直接使用Vite模板）：

```bash
npm create vite@latest habit-board -- --template vue
cd habit-board
npm install
npm run dev
```

上述脚手架命令与启动方式均来自Vue、Vite官方文档，确保兼容性和规范性。

#### 1.2.2 安装Codex CLI

通过npm全局安装Codex CLI，安装完成后启动即可，首次运行需完成登录验证。

```bash
npm i -g @openai/codex
codex
```

根据OpenAI官方文档说明，Codex CLI可本地运行，支持读取、修改、运行代码，登录后即可正常使用。

### 1.3 用 Codex 承载 AI-DLC：先搭“规则层”

AI-DLC要稳定运行，不能依赖单次prompt，需先建立**项目级规则层**。对Codex而言，规则层的最佳入口是 `AGENTS.md` 文件——官方明确说明：**Codex在执行任何工作前，都会先读取 `AGENTS.md`**。

因此，Vue3项目落地AI-DLC的第一步，并非让Codex直接编写页面，而是在仓库根目录创建 `AGENTS.md` 文件。该文件的核心作用的：

- 固定项目目标
- 固定技术边界
- 固定开发顺序
- 固定验证标准
- 固定“先问再做”的行为模式

以下为适配Habit Board项目的实用 `AGENTS.md` 示例：

```markdown
# Habit Board AI-DLC Rules

## Project Goal
Build a lightweight Vue 3 + Vite SPA for habit tracking with local persistence.

## Stack
- Vue 3
- Vite
- Composition API
- localStorage
- No backend in v1
- Minimal dependencies

## AI-DLC Workflow
1. Always start with clarification and planning before editing code.
2. Create or update docs in `docs/aidlc/` first.
3. Implement only one approved task at a time.
4. After each code task, run validation commands.
5. Summarize changes, risks, and next step after every implementation turn.

## Definition of Done
- App can create, check in, and persist habits
- Empty / loading / error-like edge states are handled
- `npm run build` passes
- Unit tests for core state logic pass
- Code stays simple and component boundaries are clear
```

> 核心要点：`AGENTS.md` 是AI-DLC工作流的长期约束入口，并非补充说明，其作用是规范AI行为，确保流程稳定、不偏离项目目标。

### 1.4 第一阶段：Inception —— 先决定做什么、为什么做

根据AWS对AI-DLC的定义，Inception阶段负责明确 **WHAT to build and WHY**，核心工作包括需求分析、用户故事、应用设计、风险和复杂度评估。该阶段会根据项目复杂度自适应调整——简单项目会简化流程，复杂项目则会展开更细致的分析。

对于Habit Board这个轻量Vue3项目，Inception阶段的核心原则是“不直接写组件”，而是让Codex先完成三件事：

1. 问清需求（澄清歧义，不做假设）
2. 生成结构化规格文档
3. 输出可执行的任务计划

可向Codex下达如下指令，启动Inception阶段：

```text
先只做 AI-DLC 的 Inception，不要修改代码。
请基于当前 Vue3 项目，为 Habit Board 生成：
1. 需求澄清问题
2. docs/aidlc/requirements.md
3. docs/aidlc/design.md
4. docs/aidlc/tasks.md
如果信息不足，先向我提问，不要假设。
```

该指令完全契合AI-DLC的核心模式：**AI先出计划、先问澄清问题、等人确认后才执行**。AWS在Amazon Q的AI-DLC实践文章中也强调，工作流会先进入Workspace Detection，再进入Requirements Analysis；在需求阶段，规则会刻意要求模型**避免替用户做假设，而是主动提出澄清问题**。

对于本项目，Inception阶段的最终产物应包含：

- `requirements.md`：明确功能范围、非目标、边界条件
- `design.md`：确定组件划分、状态流、数据结构、持久化方式
- `tasks.md`：将开发工作拆分为可分步执行、可验收的小任务

此阶段的人工职责非常明确：**不修改代码，只审核规格文档**。重点关注以下四点：

- 功能范围是否清晰，是否符合项目目标
- v1版本范围是否足够精简，无过度扩展
- 设计方案是否简洁，无过度设计
- 任务拆分是否合理，可逐项验收

> 核心要点：AI-DLC在前端项目中的第一个关键落地点，是“先把‘做什么’定死，再进入实现阶段”，通过Inception阶段的规格审核，避免后续开发偏离方向、出现返工。

### 1.5 第二阶段：Construction —— 决定怎么实现，并逐步编码

AWS对Construction阶段的定义是明确**HOW to build it**，核心工作包括详细组件设计、代码生成、构建配置、测试策略、质量验证。

对于Habit Board项目，该阶段的核心原则是“不一次性完成所有开发”，而是严格按照 `tasks.md` 中的任务，逐项推进、逐项验证。结合项目特点，合理的任务拆法如下：

1. T1：定义habit数据模型与localStorage持久化服务
2. T2：实现habit列表与新增表单组件
3. T3：实现每日打卡逻辑与连续打卡天数（streak）计算
4. T4：补充边界处理（空状态、重复名称校验、日期边界）
5. T5：补充Vitest单测（核心状态逻辑）
6. T6：构建检查与交付说明生成

Vue官方脚手架支持在创建项目时，直接勾选Vitest、ESLint、Prettier等功能，可将“测试与代码规范”同步纳入Construction阶段，确保开发质量。

可向Codex下达逐任务推进指令，示例如下（以T1为例）：

```text
现在进入 Construction。
只实现 tasks.md 中的 T1：
- 定义 Habit 类型/数据结构
- 封装 localStorage persistence
- 不处理 UI
完成后运行测试或最小验证，并总结改动。
```

完成T1后，再下达T2指令，依次推进，示例如下：

```text
继续 T2：
- 实现 HabitForm 和 HabitList
- 保持组件职责清晰
- 不引入 UI 组件库
- 完成后运行可用性验证
```

> 核心要点：这种逐任务推进的方式，契合AI-DLC的“阶段性gating”原则——人工每轮只批准一个小任务，AI每轮只推进一个清晰目标，既保证开发节奏，又便于及时发现问题、校准方向。

### 1.6 在 Codex 里，Construction 阶段最适合用的三个能力

Construction阶段是代码实现的核心阶段，合理运用Codex的三个核心能力，可提升开发规范性和效率，更好地承载AI-DLC流程。

#### 1.6.1 AGENTS.md：固定工程边界

`AGENTS.md` 适合存放项目的长期工程规则，无需频繁修改，确保AI在开发过程中始终遵循统一标准，例如：

- 组件拆分原则（单一职责）
- 状态管理原则（优先Composition API）
- 样式约束（不引入复杂UI库）
- 测试门槛（核心逻辑必须覆盖单测）
- 依赖约束（不引入不必要的第三方依赖）

由于Codex每次工作前都会读取该文件，因此它是承载“项目长期约束”的最佳载体，确保AI开发行为不偏离工程规范。

#### 1.6.2 Skills：封装可复用工作流

根据Codex官方定义，Skill可打包指令、资源和可选脚本，让Codex更稳定地遵循某类工作流；且Skill采用 **progressive disclosure** 机制，仅在命中相关任务时才加载完整的 `SKILL.md`，可有效节省上下文资源。Codex会自动从仓库的 `.agents/skills` 等路径扫描Skill。

针对Habit Board Vue3项目，推荐配置3个仓库级Skill，覆盖组件开发、前端测试、发布检查三大核心场景，目录结构如下：

```text
.agents/
  skills/
    vue-component-skill/
      SKILL.md
    frontend-test-skill/
      SKILL.md
    release-check-skill/
      SKILL.md
```

以 `vue-component-skill/SKILL.md` 为例，可写入如下约束，规范Vue组件开发：

```markdown
---
name: vue-component-skill
description: Use when implementing or refactoring Vue SFC components in this repository.
---

1. Prefer Composition API and `核心要点：Skill的核心价值是将团队的前端开发经验，从临时prompt中抽离出来，变成仓库内可复用、可维护的规范，确保AI开发的组件符合团队标准。2.6.3 Subagents：并行做“查、写、审”Codex官方说明，Subagents适合将复杂任务拆分为多个并行的专门agent，分别处理不同环节，例如代码探索、多步骤功能计划、并行审查等；其内置了 `default`、`worker`、`explorer` 三类agent，可按需调用。对于Habit Board这类轻量项目，Subagents无需全程使用，但在两个场景下价值显著：场景1：并行审查当某一功能模块开发完成后，可启动多个Subagents并行审查，提升问题发现效率，示例指令如下：请并行启动 3 个 subagents：
1. 检查 Vue 组件边界是否合理
2. 检查 localStorage 与日期逻辑是否有 bug
3. 检查测试遗漏
等全部完成后汇总问题与修改建议。
```

##### 场景2：先探索再实现

若操作的是已有Vue项目（非全新创建），可先让 `explorer` 类型的Subagents读取现有代码、梳理项目结构，再让 `worker` 类型的Subagents进行开发改动，降低修改风险。

### 1.7 AI-DLC 在前端实现里的“人机分工”应该怎么划

落地AI-DLC最容易踩的坑，是将其误解为“Codex全自动开发”。实际上，AI-DLC更强调 **AI主动推进，人类把控关键关口**。AWS明确描述：AI会在每个阶段提出问题、编写计划、等待人工审批；人工验证不是最后一次性验收，而是在每个阶段进行“小批准”，确保方向正确。

结合Habit Board Vue3项目，人机分工可明确如下：

#### 人工（开发者）负责：

- 决定v1版本的功能范围，避免过度扩展
- 审批Inception阶段的需求和设计方案
- 拦截过度设计，确保项目轻量化
- 决定是否引入Router、Pinia、E2E等额外功能
- 决定项目的上线方式和交付标准

#### Codex负责：

- 生成需求、设计、任务等规格草案
- 将开发工作拆分为可分步执行的小任务
- 按人工批准的任务，逐一项实现代码
- 运行构建、测试命令，验证代码可用性
- 总结每轮改动的内容、潜在风险和下一步计划
- 生成部署说明、验收清单等交付文档

> 核心要点：AI-DLC在前端项目中的正确姿势是——AI负责流程推进和具体实现，工程师负责把控方向、界定边界和审批关键节点，二者协同兼顾效率与质量。

### 1.8 第三阶段：Operations —— 轻量项目也要有交付闭环

AWS将AI-DLC的Operations阶段定义为部署和监控；在开源workflow中，该阶段目前仍处于持续演进中，但框架上已包含部署自动化、监控和生产就绪性验证三大核心内容。

对于Habit Board这类轻量Vue3项目，Operations阶段无需复杂配置，但必须形成交付闭环，最小化闭环至少应包含：

- 生产环境构建（生成可部署的静态文件）
- 静态部署说明（明确部署方式和步骤）
- 环境变量说明（若有）
- 简单回滚方式（应对部署异常）
- 基础验收清单（验证部署后功能正常）

根据Vite官方文档，生产打包可直接运行 `vite build` 命令，默认生成适合静态托管服务部署的应用包（dist目录）。

可向Codex下达如下指令，启动Operations阶段：

```text
现在进入 Operations。
请完成：
1. 运行生产构建
2. 生成 docs/aidlc/deploy.md
3. 生成 docs/aidlc/release-checklist.md
4. 说明这个 Vue3 SPA 适合怎样的静态托管方式
不要引入复杂云服务配置，只做轻量交付。
```

该阶段完成后，应得到以下产物，确保项目从“本地可跑”升级为“可交付”：

- `dist/`：生产构建后的静态文件目录
- `docs/aidlc/deploy.md`：静态部署说明文档
- `docs/aidlc/release-checklist.md`：发布验收清单

> 核心要点：Operations阶段的价值的为AI-DLC流程闭环，即使是轻量前端项目，也需通过该阶段确保项目可交付、可部署，避免停留在开发阶段。

### 1.9 Codex 在 AI-DLC 里的安全使用方式

根据Codex官方安全文档说明，默认情况下，本地agent处于**网络关闭**状态；本地运行时会使用 **OS级sandbox**，通常将写权限限制在当前工作区，同时通过 **approval policy** 控制哪些动作需先请求人工批准。

官方提供的实用建议：若仅需进行需求分析、计划制定等聊天或规划类操作，无需修改代码，可将Codex切换到 `read-only` 模式，进一步提升安全性。

这种安全机制与AI-DLC的阶段控制天然契合，推荐实践如下：

- **Inception阶段**：尽量使用read-only模式，仅进行分析、文档生成，不修改代码
- **Construction阶段**：切换到workspace-write模式，按任务批准代码修改，避免误操作
- **Operations阶段**：允许运行构建命令，谨慎放开网络权限（如无需网络则保持关闭）

> 核心要点：将Codex的sandbox、approval机制与AI-DLC的阶段控制结合，可实现“先思考、再批准、后执行”的安全流程，避免AI误操作影响项目。

### 1.10 把整个流程压成一条实际可执行链路

结合上述所有内容，可提炼出一条最实用、可直接落地的Vue3 + Codex + AI-DLC执行链路，共6个步骤，简洁清晰、可复用：

#### 步骤1：脚手架启动

使用 `create-vue` 搭建Vue3 + Vite项目，安装依赖并启动dev server，确保项目基础环境可正常运行。

#### 步骤2：建规则层

在仓库根目录创建 `AGENTS.md` 文件，固定项目目标、技术边界、开发流程和验收标准（Definition of Done），Codex会在执行工作前自动读取该文件。

#### 步骤3：做Inception

让Codex仅产出需求澄清问题、设计草案、任务拆解，不修改业务代码；人工负责审核并批准规格文档，明确“做什么”和“为什么做”。

#### 步骤4：做Construction

按 `tasks.md` 中的任务，逐项推进代码实现，依次完成数据层、组件层、交互层、测试层开发。必要时使用Skills固定Vue组件规范，用Subagents进行并行评审，确保开发质量。

#### 步骤5：做Operations

运行 `vite build` 生成生产包，让Codex生成部署说明（deploy.md）和发布清单（release-checklist.md），完成项目交付闭环。

#### 步骤6：全程保留docs/aidlc工件

将 `requirements.md`、`design.md`、`tasks.md`、`deploy.md` 等所有阶段工件提交到仓库，确保下一次继续开发时，Codex可基于项目历史和约束继续推进，无需从零开始。这也契合AI-DLC官方强调的“阶段产物留痕、支持连续执行”的要求。

### 1.11 前端视角下的最终理解

用Codex落地AI-DLC，核心价值不是“让AI写代码更快”，而是将前端项目的开发模式，从传统的“一句需求→直接生成代码”，升级为更规范、更可控的流程：

**高层问题 → 规格澄清 → 设计确认 → 小任务实现 → 构建验证 → 交付说明**

在这条流程链条中，各组件的作用清晰明确：

- `AGENTS.md`：负责承载项目长期规则，规范AI行为
- `docs/aidlc/*.md`：负责记录各阶段工件，确保流程可追溯
- `.agents/skills`：负责封装可复用的前端开发经验，提升开发规范性
- Subagents：负责并行探索、审查，提升开发效率和质量
- sandbox + approvals：负责安全控制和节奏把控，避免误操作

综上，Codex版本的AI-DLC落地，并非复刻AWS专属工具链，而是将AI-DLC的“计划-澄清-验证-执行”方法论，映射到Codex提供的规则、技能、子代理和安全机制上，实现前端项目的规范、高效开发。

### 1.12 Spec在AI-DLC中的阶段定位及Spec Kit的落地方式

结合AI-DLC的阶段定义与Spec Kit的官方流程，可明确Spec的阶段定位及Spec Kit的落地路径，核心结论先明确：

**Spec主要属于AI-DLC的Inception阶段，是Inception阶段的核心工件；而Spec Kit中的`plan`和`tasks`处于Inception后半段，作为进入Construction阶段的桥梁。**

具体拆解如下：

AWS对AI-DLC的定义明确：Inception阶段负责将业务意图转化为详细需求、用户故事和工作单元；Construction阶段则基于Inception已验证的上下文，开展架构设计、代码实现和测试。简言之，**“先把要做什么说明白”属于Inception，“开始按任务实现”才进入Construction**。

将AI-DLC与Spec Kit的流程对齐，对应关系如下：

- `constitution`：放在 **Inception最开始**，相当于项目原则和护栏，用于明确团队约束、工程原则、质量标准，与AI-DLC的“规则层”呼应。Spec Kit官方Quick Start也明确，需先创建 `/speckit.constitution`。
- `specify` + `clarify` + `checklist`：放在**Inception核心阶段**，用于定义需求、澄清歧义、验证规格完整性，对应AI-DLC Inception阶段“问清需求、生成结构化规格”的核心目标。Spec Kit官方明确，`/speckit.specify` 聚焦于“做什么（what）”和“为什么做（why）”，不涉及具体技术栈。
- `plan` + `tasks`：放在 **Inception后半段**，此时需求已稳定，需将其转化为技术实现方案和任务拆分，为进入Construction阶段做准备。Spec Kit的流程顺序也符合这一逻辑——先 `/speckit.plan`，再 `/speckit.tasks`，最后才是 `/speckit.implement`。
- `implement`：放在 **Construction阶段**，此时已完成需求澄清和计划确认，进入具体代码实现环节，对应AI-DLC Construction阶段“怎么实现（how）”的核心目标。

结合Habit Board项目，Spec Kit的落地建议如下：

1. **以AI-DLC为总流程框架**：遵循“先澄清、再计划、再实现、再验证”的节奏，AWS开源仓库的核心逻辑也是将AI-DLC作为三阶段总流程。
2. **将Spec Kit作为Inception阶段的“规格工作台”**：需求启动后，先不直接让AI写代码，而是在Inception阶段内运行 `constitution → specify → clarify → checklist → plan → tasks` 流程，生成完整的规格文档。
3. **将Spec Kit产物提交到仓库**：将Spec Kit生成的spec、plan、tasks等文档，作为Construction阶段的输入，契合AI-DLC“阶段产物持久化、支持跨阶段延续”的要求。

完整流程链路可总结为：

**业务意图 → AI-DLC Inception阶段 → 在其中运行Spec Kit（constitution/specify/clarify/checklist/plan/tasks）→ 人工确认规格 → AI-DLC Construction阶段 → implement/编码/测试 → AI-DLC Operations阶段 → 交付**

> 核心要点：Spec是AI-DLC Inception阶段的核心载体，用于明确“做什么”；Spec Kit则是Inception阶段的“规格工具”，其流程需嵌入Inception阶段，为后续开发提供清晰、可验证的输入。