# AI 核心工具体系

> 核心结论：**Prompt、Skill、MCP、Tools、CLI 不是同一层级的概念**。它们分别负责“说清目标、沉淀方法、连接系统、调用动作、落地执行”。中间还需要一个关键角色：**Agent Runtime / Host**，也就是解析模型输出并真正调度工具的程序。
>
> 另外，CLI 在 AI Agent 里有两种语境：一种是 Tool 底层调用的命令行执行入口，另一种是 Codex、Claude Code 这类 AI 编程工具面向开发者提供的终端 / TUI 产品入口。

## 1. 整体分析

理解 AI Agent 的工具体系，要先抓住一个前提：大语言模型本身不直接执行操作。模型接收上下文，生成回答，或者生成一个结构化的工具调用意图。真正读文件、写文件、查数据库、打开浏览器、运行命令的，是模型外部的 Agent Runtime / Host。

更准确的链路是：

```text
用户入口：Web / IDE / CLI / TUI
  ↓
Prompt + Skill：把目标、流程、约束交给模型
  ↓
LLM：推理，并生成回答或工具调用意图
  ↓
Agent Runtime / Host：解析工具调用、校验权限、调度执行
  ↓
MCP / 本地工具注册：提供工具和上下文的连接方式
  ↓
Tools：封装可执行动作
  ↓
CLI / API / SDK：完成真实系统操作
```

所以，AI Agent 不是“大模型自己会操作电脑”，而是：

```text
模型负责判断和生成调用意图
程序负责解析意图并调用工具
工具负责封装动作
CLI / API / SDK 负责真正执行
```

对常见理解做一下校准：

| 说法 | 正确性 | 更准确的理解 |
|---|---|---|
| 大语言模型本质上接收输入并生成输出，模型本身无法执行操作 | 基本正确 | 模型可以生成自然语言回答，也可以生成结构化的工具调用意图；执行发生在模型外部 |
| Agent 根据模型输出调用相应工具 | 正确 | Agent Runtime / Host 会解析模型输出，做权限检查，再调用已注册的 Tool |
| Tool 可以是脚本或 function | 正确 | Tool 也可以是本地函数、远程服务、MCP Server 暴露的能力，或者对 CLI / API / SDK 的封装 |
| Tool 底层会调用 CLI、API 以及 MCP 协议 | 部分准确 | Tool 常调用 CLI / API / SDK；MCP 通常是暴露和连接 Tool 的协议，不是 Tool 的底层执行指令 |
| CLI 是直接操作系统的底层入口 | 基本正确 | CLI 是常见执行入口，但不是唯一入口；同一动作也可能通过语言运行时的文件 API、HTTP API 或 SDK 完成 |
| CLI / TUI 是 AI 接入开发工作流的重要形态 | 正确，但不宜绝对化 | 对开发者来说，终端离代码、Git、测试和部署最近，因此很多 AI 编程工具会把 CLI / TUI 作为核心入口 |
| MCP 是为了解决外部工具 API 不统一的问题 | 基本正确 | MCP 统一的是 AI 应用接入外部上下文和工具的方式；MCP Server 背后仍可能调用各系统原有 API |
| 用户最终通过 Prompt 发起操作 | 正确 | 用户通常通过自然语言 Prompt 表达目标；但 Prompt 只表达意图，不能自己执行工具 |
| 高频、标准化操作可以沉淀为 Skill | 正确 | Skill 是可复用的方法包，用来固化步骤、规则、检查清单和输出格式 |

这五个概念可以按职责分成五层：

| 层级 | 概念 | 核心职责 | 示例 |
|---|---|---|---|
| 意图层 | Prompt | 表达任务目标、规则和输出要求 | “帮我修复这个 bug，并补充单测” |
| 方法层 | Skill | 固化一类任务的标准做法 | Bug 修复流程、代码审查流程 |
| 连接层 | MCP | 用统一协议接入外部系统 | Filesystem MCP、GitHub MCP、Playwright MCP |
| 能力层 | Tools | 暴露 Agent Runtime 可以调度的具体动作 | `read_file`、`search_code`、`run_shell` |
| 执行层 | CLI / API / SDK | 真正执行命令或请求 | `git diff`、`pnpm test`、`npx playwright test` |

它们不是互相替代的关系，而是从上到下逐层配合：

```text
Prompt 说明要做什么
Skill 说明怎样稳定地做
MCP 负责接入哪些系统
Tools 提供可以调用的动作
CLI / API / SDK 完成真实执行
```

一句话区分：

| 概念 | 核心定位 | 解决的问题 |
|---|---|---|
| Prompt | 任务指令 | 告诉 AI 当前要做什么、遵守什么规则 |
| Skill | 方法包 | 把一类任务的经验沉淀成可复用流程 |
| MCP | 连接协议 | 让 AI 标准化连接外部系统 |
| Tools | 可调用能力 | 让 Agent Runtime 能调度具体动作 |
| CLI | 执行入口 / 终端入口 | 既可以在系统中运行命令，也可以作为 AI 编程工具的交互界面 |

## 2. 详细分析

### 2.1 Prompt：任务意图和行为约束

Prompt 是给大模型的自然语言指令，用来说明当前任务、约束和输出要求。

一个好的 Prompt 通常包含：

- 任务目标：要完成什么
- 执行范围：只处理哪些内容，不碰哪些内容
- 行为约束：哪些操作允许，哪些操作禁止
- 验收标准：做到什么程度算完成
- 输出格式：最终结果如何呈现
- 不确定策略：信息缺失时是继续推断，还是先询问

示例：

```text
请分析当前分支的修改内容，判断是否可以合并到 master。
要求：
1. 先查看改动文件
2. 再分析冲突和回归风险
3. 最后输出合并建议
```

Prompt 的重点是“说清楚任务”。它不是工具，也不是执行入口。用户可以在 Prompt 里要求 AI 调用某个工具、读取某个文件或使用某个 MCP Server，但 Prompt 本身不会执行这些动作。

真实执行过程通常是：

```text
用户写 Prompt
  ↓
模型理解任务并判断是否需要工具
  ↓
模型生成工具调用意图
  ↓
Agent Runtime 调用工具
  ↓
工具返回结果给模型
```

当某类 Prompt 经常重复，而且背后有稳定流程时，就可以进一步沉淀成 Skill。

### 2.2 Skill：可复用的任务方法包

Skill 是一套封装好的任务执行方法，用来把团队经验变成可复用流程。它不是单个动作，而是一组规则、步骤、模板和质量标准。

一个 Skill 通常包含：

- 适用场景
- 执行步骤
- 禁用行为
- 可用工具
- 检查清单
- 输出模板
- 质量标准

例如，一个 `bug-fix` Skill 可以规定：

```text
1. 先复现问题
2. 定位根因和影响范围
3. 查找已有封装和相似实现
4. 修改代码
5. 补充或更新测试
6. 运行验证
7. 输出修改内容、验证结果和风险点
```

Skill 的价值在于减少执行漂移。它能避免 AI 一上来就改代码，也能让同类任务的结果更稳定、更容易检查。

适合沉淀为 Skill 的任务通常有两个特点：

- 高频重复：团队经常会做，比如代码审查、Bug 修复、发布检查
- 流程稳定：每次处理步骤相似，可以抽象成固定方法

Prompt 和 Skill 的区别：

| 对比项 | Prompt | Skill |
|---|---|---|
| 作用 | 描述当前任务 | 沉淀一类任务的做法 |
| 使用频率 | 单次或临时 | 多次复用 |
| 内容形态 | 一段指令 | 流程、规则、模板、脚本的组合 |
| 示例 | “帮我修复 bug” | “修复 bug 的标准工作流” |

### 2.3 MCP：连接外部系统的标准协议

MCP（Model Context Protocol）用于让 AI 应用用统一方式连接外部系统，例如：

- 文件系统
- Git 仓库
- 数据库
- 浏览器
- 搜索服务
- 代码知识图谱
- GitHub / GitLab
- Slack / 飞书
- 内部业务系统

MCP 的重点是标准化连接。过去接入外部系统时，通常要分别适配每个系统自己的 API：GitHub 有 GitHub 的 API，数据库有数据库的驱动，浏览器自动化有自己的 SDK，内部系统也有各自的接口规范。AI 应用如果逐个适配，成本会很高，也容易形成重复封装。

MCP 解决的是“AI 应用如何发现、读取和调用外部能力”的问题。它把外部系统封装成 MCP Server，让 AI 应用按统一协议接入。

MCP 的基本角色：

| 角色 | 含义 | 示例 |
|---|---|---|
| MCP Host | 用户正在使用的 AI 应用 | ChatGPT、Claude、Cursor、Trae |
| MCP Client | Host 内部连接某个 Server 的客户端 | 一个 Server 通常对应一个 Client |
| MCP Server | 对外暴露能力的服务 | Filesystem Server、GitHub Server、Playwright Server |

MCP Server 通常暴露三类能力：

| 类型 | 作用 | 示例 |
|---|---|---|
| Tools | 可执行动作 | 查询数据库、运行测试、搜索代码 |
| Resources | 只读上下文 | 文件内容、仓库结构、数据库 schema |
| Prompts | 预设提示模板 | 代码审查模板、发布检查模板 |

关键区别：

```text
MCP 是协议
Tools 是通过协议暴露出来的具体能力
```

MCP 不是 CLI，也不是业务 API 的完全替代品。更常见的情况是：MCP Server 对外用 MCP 协议提供统一接口，背后仍然调用原系统的 API、SDK、数据库驱动或 CLI。

```text
AI 应用
  ↓ MCP 协议
MCP Server
  ↓ API / SDK / CLI / 数据库驱动
外部系统
```

所以，不是所有 Tool 都来自 MCP，也不是所有 MCP 能力都是 Tool。

### 2.4 Tools：Agent 可以调度的具体能力

Tools 是 Agent Runtime 可以代表模型调度的动作接口。它们让 AI 从“只能回答”变成“可以执行”。

一个 Tool 通常具备：

- 工具名称
- 参数 schema
- 权限限制
- 执行逻辑
- 返回结果

常见 Tools：

```text
read_file(path)
write_file(path, content)
search_code(query)
run_shell(command)
git_status()
git_diff()
query_database(sql)
open_browser(url)
click(selector)
```

Tool 可以有不同来源：

| 来源 | 含义 | 示例 |
|---|---|---|
| 本地内置 Tool | Agent Runtime 直接提供的函数能力 | 读文件、写文件、运行 shell |
| MCP Tool | MCP Server 通过协议暴露的工具 | GitHub issue 查询、数据库查询、浏览器操作 |
| 业务封装 Tool | 团队把内部能力封装成工具 | 创建发布单、查询需求状态、触发流水线 |

Tool 的实现方式也不固定。它可以调用一个脚本，可以调用一个函数，可以请求一个 HTTP API，也可以执行一条 CLI 命令。

```text
AI 生成工具调用意图
  ↓
Agent Runtime 调用 Tool
  ↓
Tool 内部调用 CLI / API / SDK / 业务服务
  ↓
Tool 返回结构化结果
```

Tools 的价值在于把动作封装得清晰、可控、可检查。

| 用户需求 | 没有 Tool | 有 Tool |
|---|---|---|
| 检查分支状态 | 告诉用户运行 `git status` | 直接调用工具查看状态并总结 |
| 搜索字段引用 | 让用户自己搜索 | 调用 `search_code` 返回结果 |
| 验证 UI | 给出验证建议 | 打开浏览器并执行自动化检查 |

Prompt 和 Tools 的区别：

| 对比项 | Prompt | Tools |
|---|---|---|
| 本质 | 指令 | 动作能力 |
| 作用 | 告诉 AI 要做什么 | 让 Agent Runtime 真正调度动作 |
| 参数 | 通常是自然语言 | 通常是结构化参数 |
| 示例 | “请查看 Git 状态” | `git_status()` |

### 2.5 CLI：底层执行入口，也是终端交互入口

CLI（Command Line Interface）是命令行接口，不是 AI 特有概念，但在 AI Agent 中有两种常见语境。

第一种是执行型 CLI：Tool 底层真正调用的命令行程序。

常见命令：

```bash
git status
git diff
pnpm test
npm run build
npx playwright test
cp source.txt target.txt
```

Tool 和 CLI 的关系可以理解为：

```text
Agent Runtime 调用 Tool：run_test({ "scope": "render-value" })
Tool 底层执行 CLI：pnpm test render-value
```

不过 CLI 不是唯一的底层方式。同样是复制文件，Tool 可以调用 `cp` 命令，也可以调用 Node.js 的 `fs.copyFile`、Python 的 `shutil.copyfile`，或者请求一个远程文件服务。选择 CLI、API 还是 SDK，取决于场景、权限、稳定性和可解析性。

第二种是产品型 CLI / TUI：AI 编程工具面向开发者提供的终端入口。

Codex、Claude Code 这类工具并不只是“执行一条命令”。它们通常会在终端里提供一个交互式界面，让用户直接用自然语言描述任务，然后由 Agent Runtime 读取仓库、调用工具、运行测试、展示 diff、继续追问或提交结果。

这里的 TUI（Text User Interface）可以理解为“运行在终端里的文本用户界面”。它比一次性命令更适合长任务，因为开发者可以在同一个上下文里查看模型计划、批准工具调用、观察命令输出、继续补充需求。

CLI / TUI 会成为 AI 编程工具的重要形态，原因很直接：

- 开发者原本就在终端里运行 Git、测试、构建和部署命令
- 终端天然贴近项目目录、环境变量、依赖和本地权限
- AI Agent 可以在终端里把“对话、工具调用、命令执行、结果反馈”放到同一条工作流里
- 相比纯 Web 页面，CLI / TUI 更容易接入已有开发流程和自动化脚本

所以，CLI 在 AI Agent 体系里要分开看：

| CLI 语境 | 所在层级 | 含义 | 示例 |
|---|---|---|---|
| 执行型 CLI | 执行层 | Tool 底层调用的命令行程序 | `git diff`、`pnpm test`、`cp` |
| 产品型 CLI / TUI | 用户入口 / Host 层 | 开发者访问 AI Agent 能力的终端界面 | Codex、Claude Code 一类终端工具 |

Tools 和执行型 CLI 的区别：

| 对比项 | Tools | CLI |
|---|---|---|
| 面向对象 | AI 模型 / Agent Runtime | 人或程序 |
| 调用形式 | 结构化函数调用 | 命令行字符串 |
| 参数形式 | JSON / Schema | Shell 参数 |
| 安全控制 | 可在工具层做权限和校验 | 依赖执行环境 |
| 示例 | `git_diff()` | `git diff` |

执行型 CLI 层要关注命令是否存在、依赖是否安装、运行环境是否一致、测试脚本是否稳定，以及输出是否适合被工具解析。产品型 CLI / TUI 则要关注交互体验、权限确认、上下文展示、工具调用透明度和长任务可恢复性。

## 3. 完整示例

下面用一次代码修改任务串起这五个概念。

需求：

```text
修改达人详情页 settle_gmv 字段展示逻辑：
当接口返回 ****999 时，页面展示“继续查看”；
不走协作人申请链路；
补充单测并输出修改报告。
```

执行链路：

| 环节 | 发生了什么 |
|---|---|
| Prompt | 用户描述字段、规则、限制和验收要求 |
| Skill | AI 匹配“敏感字段展示改造”流程 |
| LLM | 模型分析任务，判断需要搜索代码、修改文件、运行测试 |
| Agent Runtime | 解析模型的工具调用意图，校验权限并调度工具 |
| MCP / 本地工具注册 | 提供文件系统、Git、代码搜索、浏览器等能力的连接方式 |
| Tools | 搜索 `settle_gmv`、读文件、改代码、跑测试、看 diff |
| CLI / API / SDK | 底层执行 `rg`、`pnpm test`、`git diff` 等命令或对应接口 |
| AI 输出 | 汇总修改内容、验证结果和风险点 |

展开来看：

```text
1. Prompt
   用户说明要改 settle_gmv 的展示逻辑，并要求补充单测。

2. Skill
   AI 选择代码修改类流程：
   先定位字段来源，再分析展示链路，然后修改逻辑、补测试、跑验证。

3. LLM
   模型根据 Prompt 和 Skill 进行推理，
   判断下一步需要搜索代码、读取文件、修改实现和运行测试。

4. Agent Runtime
   Runtime 解析模型输出的工具调用意图，
   确认权限和参数后，调用对应 Tool。

5. MCP / 本地工具注册
   如果工具来自 MCP Server，Runtime 通过 MCP 协议调用；
   如果工具是本地内置能力，Runtime 直接调用本地 Tool。

6. Tools
   Runtime 按模型意图调用 search_code 搜索 settle_gmv，
   调用 read_file 读取相关组件和测试文件，
   调用 write_file / edit_file 修改实现，
   调用 run_shell 运行测试，
   调用 git_diff 查看最终改动。

7. CLI / API / SDK
   Tool 底层执行 rg、pnpm test、git diff 等命令，
   或调用对应系统的 API / SDK。
```

简化成链路图：

```text
用户 Prompt
  ↓
Skill：敏感字段展示改造流程
  ↓
LLM：生成工具调用意图
  ↓
Agent Runtime：解析、校验、调度
  ↓
MCP / 本地工具注册：连接外部能力或本地能力
  ↓
Tools：search_code / read_file / write_file / run_shell / git_diff
  ↓
CLI / API / SDK：rg / pnpm test / git diff / 业务接口
  ↓
AI：根据执行结果继续推理，并输出报告
```

这个例子里，Prompt 决定任务方向，Skill 保证流程稳定，LLM 负责推理和生成工具调用意图，Agent Runtime 负责真正调度，MCP 提供标准连接方式，Tools 负责具体动作，CLI / API / SDK 完成真实执行。少了执行层，模型只能停留在建议；少了 Prompt 和 Skill，执行又容易失焦。

## 4. 总结

可以用这句话记住 AI 核心工具体系：

```text
说目标：Prompt
定流程：Skill
接系统：MCP
调动作：Tools
跑命令 / 进终端：CLI
```

再补上一句执行机制：

```text
模型不直接执行；Agent Runtime 根据模型输出调用工具。
```

常见混淆点：

| 容易混淆 | 正确理解 |
|---|---|
| LLM vs Agent Runtime | LLM 生成回答或工具调用意图；Runtime 解析意图并执行工具 |
| Prompt vs Skill | Prompt 是单次任务指令；Skill 是可复用工作流 |
| Prompt vs Tools | Prompt 表达意图；Tools 执行动作 |
| Skill vs Tools | Skill 是方法；Tools 是动作 |
| MCP vs Tools | MCP 是协议；Tools 是具体能力 |
| MCP vs CLI | MCP 是连接协议；CLI 是命令行执行入口 |
| MCP vs API | MCP 统一 AI 应用的接入方式；API 是外部系统原有接口 |
| Tools vs CLI | Tools 是 Agent Runtime 可调度接口；CLI 是 Tool 可能使用的底层执行方式之一 |
| 执行型 CLI vs 产品型 CLI / TUI | 前者是 Tool 底层调用的命令；后者是开发者访问 AI Agent 的终端交互入口 |

构建 AI 辅助开发体系时，不应该只写 Prompt，也不应该只堆 Tools。更稳妥的方式是：

- 用 Prompt 表达任务和边界
- 用 Skill 沉淀可复用流程
- 用 MCP 接入上下文和外部系统
- 用 Tools 封装清晰、安全的动作
- 用执行型 CLI / API / SDK 保证最终可执行
- 用产品型 CLI / TUI 把 AI Agent 接入开发者日常工作流

这样 AI 才能从“会回答问题”进一步变成“能稳定参与项目执行”的工程化助手。
