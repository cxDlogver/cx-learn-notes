# Skills 从 0 到 1 完整指南

## 一、文档说明

本文基于当前项目中的课程文档、示例 Skills，以及本地 `skill-creator` 规范整理而成，目标不是简单复述课程，而是把这套内容整理成一份可以反复查阅、直接拿来落地的知识文档。

本文主要回答 3 个问题：

1. 这个项目整体在讲什么，核心脉络是什么？
2. Skills 到底是什么，和 Prompt、Tools、MCP、Subagents 有什么关系？
3. 如果从 0 开始写一个 Skill，应该怎么设计、怎么拆目录、怎么写 `SKILL.md`、怎么验证？

---

## 二、项目全景总结

这个仓库本质上是 DeepLearning.AI 与 Anthropic 的 `agent-skills-with-anthropic` 课程中文整理版。它不是单纯的翻译仓库，而是一个围绕 Agent Skills 展开的系统化学习资料。

从内容结构看，整个项目大致可以分成 4 个层次。

### 2.1 第一层：建立概念

- [README](./README.md)：说明项目定位、受众和课程结构。
- [1.Introduction（课程介绍）](./1.Introduction（课程介绍）.md)：定义 Skill 是什么，为什么它适合扩展 Agent 能力。
- [2.Why Use Skills 1（Skills的意义）](./2.Why%20Use%20Skills%201（Skills的意义）.md)：解释为什么重复工作流、领域知识和新能力适合做成 Skills。
- [3.Why Use Skills 2 - Agent and Skills（从Agent角度思考Skills）](./3.Why%20Use%20Skills%202%20-%20Agent%20and%20Skills（从Agent角度思考Skills）.md)：从 Agent 设计角度解释 Skill 是 Agent 的“武器”。

这一部分最核心的认知是：

- Skill 不是一次性 Prompt。
- Skill 是一种可复用、可迁移、可组合的能力封装。
- Skill 的价值在于把“反复解释的事情”变成“可调用的工作流”。

### 2.2 第二层：建立系统观

- [4.Skills vs Tools, MCP, and Subagents（技能 vs 工具、MCP 和子代理）](./4.Skills%20vs%20Tools,%20MCP,%20and%20Subagents（技能%20vs%20工具、MCP%20和子代理）.md)

这一章是全课程的架构中枢，解决的是“Skill 在 Agent 生态里到底处在什么位置”。

它强调：

- `Tools` 提供底层动作能力，比如读写文件、执行命令、调用接口。
- `MCP` 提供外部世界的数据和服务接入。
- `Skills` 定义可重复、可预测、可移植的工作流程。
- `Subagents` 提供上下文隔离、并行执行、专业化分工。

可以把它们理解成：

- Tool 像锤子、锯子、螺丝刀。
- Skill 像“如何搭一个书架”的方法论。
- MCP 像把木材、五金、仓库系统接进来。
- Subagent 像不同工种的协作工人。

### 2.3 第三层：建立实践能力

- [5.Exploring Pre-Built Skills（预设Skills探索）](./5.Exploring%20Pre-Built%20Skills%20（预设Skills探索）.md)
- [6.Creating Custom Skills（自定义skills）](./6.Creating%20Custom%20Skills（自定义skills）/6.Creating%20Custom%20Skills（自定义skills）.md)

这部分开始从“会用”进入“会拆”和“会写”。

其中第 5 章强调两件事：

1. 去看官方 `anthropics/skills` 仓库，学习成熟 Skill 的目录结构和设计习惯。
2. 学会通过 `Skill Creator` 一类工具在本地迭代和更新 skill。

第 6 章是整个仓库里最值得反复阅读的一章，因为它回答了创建自定义 Skill 时最关键的具体问题：

- `name` 应该怎么取？
- `description` 应该写多细？
- `SKILL.md` 正文应该写什么？
- 什么放 `scripts/`，什么放 `references/`，什么放 `assets/`？
- 如何根据任务脆弱度决定“自由度”高低？

### 2.4 第四层：建立工程落地能力

- [7.Skill with the Claude API（在Claude API使用skills）](./7.Skill%20with%20the%20Claude%20API（在Claude%20API使用skills）.md)
- [8.Skill with Claude Code（在Claude Code使用skills）](./8.Skill%20with%20Claude%20Code（在Claude%20Code使用skills）.md)
- [9.Skills with the Claude Agent SDK（Claude Agent SDK 中的技能）](./9.Skills%20with%20the%20Claude%20Agent%20SDK（Claude%20Agent%20SDK%20中的技能）.md)
- [10.Conclusion（总结）](./10.Conclusion（总结）.md)

这部分把 Skill 从“文档形式的能力包”推进到“真实工程系统中的一等公民”。

重点包括：

- 在 API 环境里，Skill 依赖代码执行容器和文件系统能力。
- 在 Claude Code 里，Skill 是扩展层的一部分，和 `CLAUDE.md`、MCP、Hooks、Subagents 并列。
- 在 Agent SDK 里，SkillTool 可以和 TaskTool、MCP 一起构建完整的多智能体系统。

结论很明确：

Skill 的真正价值不在于 Markdown 本身，而在于它让你能把业务经验、规则、模板、流程，沉淀成 Agent 可重复消费的资产。

---

## 三、什么是 Skill

### 3.1 一句话定义

Skill 是一个以 `SKILL.md` 为核心入口、按需加载脚本、参考资料和资产文件的能力包，用来把某个领域知识或可重复工作流交给 Agent 使用。

### 3.2 Skill 的本质

Skill 的本质不是“更多 Prompt”，而是“结构化的能力描述”。

它至少解决了 4 个问题：

1. 把零散经验沉淀为稳定流程。
2. 把领域知识从对话临时注入，升级为可复用资产。
3. 把复杂输出格式、模板和脚本组织到统一目录里。
4. 让 Agent 在需要时自动触发，而不是每次都靠人工补上下文。

### 3.3 Skill 和 Prompt 的区别

Prompt 更像一次性交谈。

Skill 更像一份可以长期复用的工作手册，它包含：

- 触发条件
- 处理步骤
- 可执行脚本
- 参考资料
- 输出模板

也就是说：

- Prompt 解决一次性表达问题。
- Skill 解决长期复用和标准化交付问题。

### 3.4 Skill 最适合处理什么问题

最适合做成 Skill 的任务通常有这些特征：

- 高重复：同类任务会反复出现。
- 有稳定流程：大体步骤不会每次都变。
- 有专业门槛：存在领域规则、指标口径、格式规范、业务知识。
- 有稳定产出：输出的格式、结构或质量标准相对固定。
- 适合资产化：可以沉淀脚本、模板、参考资料。

典型例子包括：

- 营销数据分析
- 时间序列诊断
- 根据讲义生成习题
- 法务审核
- API 方案设计
- 前端项目脚手架生成
- 报告模板化输出

---

## 四、Skill 在 Agent 生态中的位置

### 4.1 Skill vs Tools

`Tools` 是底层能力。

例如：

- 读文件
- 写文件
- 执行 Shell
- 调用网页搜索
- 运行 Python

`Skills` 是工作流和方法论。

例如：

- 如何分析一份营销投放数据
- 如何生成一份高质量的练习题
- 如何对时间序列做诊断并给出解释

结论：

- Tool 负责“能做什么动作”。
- Skill 负责“按什么方法做事”。

### 4.2 Skill vs MCP

`MCP` 的作用是连接外部数据或外部系统。

例如：

- 数据库
- Google Drive
- Notion
- 内部服务

Skill 的作用则是教 Agent 如何消费这些数据并形成稳定输出。

结论：

- MCP 解决“数据从哪里来”。
- Skill 解决“拿到数据后怎么处理”。

### 4.3 Skill vs Subagent

Subagent 是隔离上下文、执行单一任务的专业工作者。

Skill 是可以被主 Agent 或子 Agent 使用的知识和流程包。

结论：

- Subagent 是执行单元。
- Skill 是执行知识。

两者经常组合使用：

- 主 Agent 先基于 Skill 制定方法。
- 再把某些具体任务分发给子 Agent 并行执行。
- 子 Agent 也可以加载对应 Skill。

### 4.4 Skill vs CLAUDE.md

从 Claude Code 的扩展体系来看，`CLAUDE.md` 和 Skill 最大的区别是加载方式不同。

- `CLAUDE.md`：每次会话都会加载，适合放长期有效、全局适用的项目规范。
- `Skill`：只在需要时触发和加载，适合放专项知识和专项工作流。

一个简单判断方法：

- “每次都要知道”的规则，放 `CLAUDE.md`。
- “只有某类任务需要”的规则，放 Skill。

---

## 五、Skill 的底层设计原则

这部分非常重要，几乎决定了一个 Skill 后续是否真正好用。

### 5.1 渐进式披露

这是 Skill 设计的第一原则。

Skill 不是把所有内容一次性塞进上下文，而是分层加载：

1. 元数据层：`name` 和 `description` 始终在上下文中。
2. 正文层：`SKILL.md` 的 Markdown 正文在 Skill 被触发时加载。
3. 资源层：`scripts/`、`references/`、`assets/` 在需要时再读取或执行。

这意味着：

- `description` 决定能不能触发。
- `SKILL.md` 决定触发后怎么做。
- 资源目录决定复杂能力能不能真正落地。

### 5.2 上下文节约

本地 `skill-creator` 规范反复强调一件事：上下文窗口是公共资源。

所以：

- 不要把模型本来就知道的常识写太多。
- 不要把所有细节都堆进 `SKILL.md`。
- 不要把 `references/` 的内容复制一份进正文。

正确做法是：

- `SKILL.md` 只写核心流程、关键约束、资源导航。
- 详细规则、长文档、复杂案例放 `references/`。
- 稳定代码逻辑放 `scripts/`。
- 模板和输出骨架放 `assets/`。

### 5.3 合适的自由度

Skill 不是越细越好，也不是越抽象越好，而是要匹配任务脆弱度。

#### 高自由度

适合：

- 多种做法都成立
- 需要根据上下文灵活判断
- 主要提供方向和启发

形式：

- 文本说明
- 原则性建议
- 决策 heuristics

#### 中自由度

适合：

- 有首选模式
- 存在一定变化空间
- 需要示例、伪代码、固定框架

形式：

- 推荐步骤
- 样例命令
- 结构化模板

#### 低自由度

适合：

- 流程脆弱
- 一旦做错后果明显
- 需要强一致性和确定性

形式：

- 指定脚本
- 严格顺序
- 明确参数

一个很实用的判断标准是：

- 如果任务像“开阔草地”，就给高自由度。
- 如果任务像“悬崖边窄桥”，就给低自由度。

### 5.4 避免重复和污染

Skill 目录里只放直接支持任务的内容，不要额外堆很多“人类文档”。

本地规范明确不建议在 Skill 里放这些东西：

- `README.md`
- `INSTALLATION_GUIDE.md`
- `QUICK_REFERENCE.md`
- `CHANGELOG.md`

原因很简单：

- 对 Agent 没有直接帮助。
- 会制造额外上下文噪音。
- 让 Skill 的结构变得混乱。

---

## 六、一个 Skill 的标准结构

基于课程示例和本地 `skill-creator` 规范，一个 Skill 的推荐结构如下：

```text
skill-name/
├── SKILL.md
├── agents/
│   └── openai.yaml
├── scripts/
├── references/
└── assets/
```

其中：

- `SKILL.md`：必须有，是 Skill 的入口。
- `agents/openai.yaml`：推荐有，用于 UI 元数据。
- `scripts/`：可选，放可执行脚本。
- `references/`：可选，放按需阅读的参考材料。
- `assets/`：可选，放输出模板、图片、字体、样板文件。

---

## 七、`SKILL.md` 应该怎么写

### 7.1 Frontmatter 只写什么

当前本地 `skill-creator` 规范给出的最稳妥做法是：

- `name`
- `description`

只写这两个字段。

例如：

```yaml
---
name: analyzing-time-series
description: Comprehensive diagnostic analysis of time series data. Use when users provide CSV time series data and want to understand its characteristics before forecasting - stationarity, seasonality, trend, forecastability, and transform recommendations.
---
```

### 7.2 `name` 的写法

`name` 是 Skill 的标识符，也是触发体系的一部分。

建议遵循这些规则：

- 全小写
- 只用字母、数字、连字符
- 用短语，不要句子
- 长度尽量短
- 优先体现动作
- 文件夹名与 `name` 一致

常见风格：

- `analyzing-time-series`
- `generating-practice-questions`
- `gh-address-comments`
- `frontend-webapp-builder`

不推荐：

- `timeSeriesAnalysisSkill`
- `skill_for_time_series_analysis`
- `my-awesome-skill`

因为这些名字要么触发词不清楚，要么不利于统一管理。

### 7.3 `description` 的写法

`description` 是触发最关键的字段。

它不能只写“做什么”，还要写：

- 什么场景下使用
- 用户会怎么说
- 输入是什么
- 期望解决什么问题

最好的 `description` 一般会同时包含：

1. 功能描述
2. 使用场景
3. 触发关键词
4. 输入或任务对象

例如：

```text
Generate educational practice questions from lecture notes to test student understanding. Use when users request practice questions, exam preparation materials, study guides, or assessment items based on lecture content.
```

这个写法好的原因是：

- 它说明了功能：生成练习题。
- 它说明了输入对象：lecture notes。
- 它说明了触发语义：practice questions、exam preparation、study guides、assessment items。

### 7.4 正文该写什么

正文只负责“触发后怎么做”，不负责“什么时候触发”。

正文通常应该包括：

- 输入要求
- 工作流
- 输出格式
- 资源读取指引
- 脚本调用方式
- 注意事项

一个稳定的正文骨架通常如下：

```md
# Skill Title

## Input
输入格式、字段、默认值、边界条件

## Workflow
步骤 1
步骤 2
步骤 3

## Output
输出结构、格式、表格、状态标记

## Resources
什么时候读取 references
什么时候使用 assets
什么时候执行 scripts
```

### 7.5 正文的写作原则

- 用祈使句或操作式表达。
- 先写主流程，再写条件分支。
- 复杂流程写成顺序步骤。
- 不要把长篇背景知识全塞正文。
- 正文尽量控制在 500 行以内。

---

## 八、`scripts`、`references`、`assets` 到底怎么分

这是很多人第一次写 Skill 时最容易混的地方。

### 8.1 `scripts/`

放“需要确定性执行的代码”。

适合放进 `scripts/` 的内容：

- 每次都要重写的程序逻辑
- 对正确性要求高的计算过程
- 文件处理逻辑
- 复杂格式转换逻辑
- 统计分析逻辑

例如本仓库中的 [analyzing-time-series](./6.Creating%20Custom%20Skills（自定义skills）/analyzing-time-series/SKILL.md)：

- `scripts/diagnose.py`
- `scripts/visualize.py`

这类工作之所以适合脚本，是因为：

- 逻辑稳定
- 结果可验证
- 运行成本低于反复让模型临时生成

### 8.2 `references/`

放“Agent 需要时再读的知识材料”。

适合放进 `references/` 的内容：

- 规则文档
- 指标口径
- 解释说明
- API 文档
- 领域规范
- 复杂判断标准

例如：

- [budget_reallocation_rules.md](./6.Creating%20Custom%20Skills（自定义skills）/analyzing-marketing-campaign/references/budget_reallocation_rules.md)
- [interpretation.md](./6.Creating%20Custom%20Skills（自定义skills）/analyzing-time-series/references/interpretation.md)
- [examples_by_topic.md](./6.Creating%20Custom%20Skills（自定义skills）/generating-practice-questions/references/examples_by_topic.md)

判断规则很简单：

- 如果是“要理解、要参考”的内容，放 `references/`。
- 如果是“要执行、要运行”的内容，放 `scripts/`。

### 8.3 `assets/`

放“最终输出会直接使用的资源”。

适合放进 `assets/` 的内容：

- Markdown 模板
- LaTeX 模板
- 文档模板
- Logo、图标、图片
- 字体
- 样板工程

例如 [generating-practice-questions](./6.Creating%20Custom%20Skills（自定义skills）/generating-practice-questions/SKILL.md) 里的：

- `assets/markdown_template.md`
- `assets/questions_template.tex`

判断规则：

- 如果文件是给 Agent 当“参考说明”的，放 `references/`。
- 如果文件是给最终产物“直接拿来用”的，放 `assets/`。

---

## 九、项目中的 3 个示例 Skill 是怎么设计的

这 3 个示例几乎可以当成你写 Skill 时的对照组。

### 9.1 `analyzing-marketing-campaign`

入口文件：

- [SKILL.md](./6.Creating%20Custom%20Skills（自定义skills）/analyzing-marketing-campaign/SKILL.md)

特点：

- 以说明型工作流为主
- 强调输入字段定义
- 强调指标公式
- 强调表格化输出
- 把预算调配规则放在 `references/`

适用范式：

- 数据分析型 Skill
- 规则驱动型 Skill
- 输出结构强约束型 Skill

设计亮点：

- `description` 非常清楚地写了 CTR、CVR、ROAS、CPA、预算重分配等触发语义。
- 正文只保留主流程和核心公式。
- 复杂决策规则下沉到 `references/budget_reallocation_rules.md`。

### 9.2 `generating-practice-questions`

入口文件：

- [SKILL.md](./6.Creating%20Custom%20Skills（自定义skills）/generating-practice-questions/SKILL.md)

特点：

- 输入处理规则很详细
- 输出结构高度标准化
- 模板显式拆到 `assets/`
- 参考示例放在 `references/`

适用范式：

- 内容生成型 Skill
- 模板驱动型 Skill
- 教育评测型 Skill

设计亮点：

- 把问题类型拆成 True/False、Explanatory、Coding、Use Case 四层。
- 每层都给了质量标准，而不是只说“生成一些题”。
- 输出格式没有全部写死在正文，而是借助 `assets/` 模板完成。

### 9.3 `analyzing-time-series`

入口文件：

- [SKILL.md](./6.Creating%20Custom%20Skills（自定义skills）/analyzing-time-series/SKILL.md)

特点：

- 是脚本驱动型 Skill 的典型代表
- 主流程非常清晰：诊断 -> 可视化 -> 汇报
- 解释逻辑下沉到 `references/`
- 复杂统计运算交给脚本

适用范式：

- 分析计算型 Skill
- 命令式工作流 Skill
- 低自由度稳定流程 Skill

设计亮点：

- 直接把命令写进工作流，让 Skill 可执行而不是纯描述。
- 输出目录结构写得很清楚，便于 Agent 和人类同时理解。
- 把“如何解释统计结果”从主文件剥离出去，控制上下文长度。

---

## 十、从 0 到 1 写一个 Skill 的完整流程

这部分是整篇文档最核心的内容。

下面给的是一套可以直接落地的流程，不是抽象建议。

### 10.1 第 0 步：先判断这件事值不值得做成 Skill

不是所有任务都值得做成 Skill。

适合做 Skill 的任务：

- 你已经重复做过 3 次以上
- 每次都要补类似背景
- 输出格式或方法比较稳定
- 存在专门知识或固定工具链

不太适合一开始就做 Skill 的任务：

- 一次性问题
- 目标本身还不清楚
- 工作流频繁变化
- 根本没有沉淀价值

如果只是一次性对话，Prompt 就够了。

如果已经是重复、标准化、可复用的任务，再上 Skill。

### 10.2 第 1 步：收集真实使用样例

本地 `skill-creator` 规范非常强调 concrete examples。

在动手写任何文件前，先整理 3 到 5 个真实请求示例。

例如你要写一个前端答疑 Skill，先写出：

- “帮我根据一段 React 面试题生成标准回答”
- “把这份前端知识点整理成 1 分钟回答模板”
- “根据项目经历提炼易追问点”

为什么这一步重要？

因为 Skill 的结构不是拍脑袋决定的，而是从真实使用方式中倒推出来的。

这一步要想清楚：

- 用户会怎么说？
- 输入通常是什么？
- 输出希望是什么？
- 有哪些共性步骤？
- 有没有高频术语需要写进 `description`？

### 10.3 第 2 步：从样例倒推复用资产

拿着样例，问自己几个问题：

1. 哪些步骤每次都会重复？
2. 哪些知识每次都要重新说明？
3. 哪些输出格式每次都类似？
4. 哪些代码每次都要重写？

然后开始拆资源：

- 重复代码 -> `scripts/`
- 重复规则/知识 -> `references/`
- 重复模板 -> `assets/`

这是 Skill 设计里最关键的一步，因为它决定你的 Skill 是“只有一份说明文档”，还是“真正可复用的能力包”。

### 10.4 第 3 步：设计触发机制

Skill 是否好用，首先看能不能被正确触发。

#### 先定 `name`

建议：

- 用动作短语
- 尽量动词导向
- 用连字符
- 控制在较短长度

例如：

- `reviewing-prs`
- `writing-meeting-summary`
- `analyzing-sales-funnel`

#### 再定 `description`

`description` 是真正的触发入口。

写的时候尽量覆盖：

- 做什么
- 处理什么输入
- 解决什么问题
- 在什么语义下触发

推荐句式：

```text
<核心能力>. Use when users <典型请求1>, <典型请求2>, or need <典型输出/目标>.
```

例如：

```text
Analyze customer support chat logs and produce structured incident summaries. Use when users provide exported chat transcripts, request support issue clustering, root cause summaries, or want action items extracted from service conversations.
```

### 10.5 第 4 步：初始化 Skill 目录

如果你在 Codex 的 Skill 体系里开发，优先使用 `skill-creator` 推荐的初始化脚本，而不是手动新建所有目录。

典型命令：

```bash
scripts/init_skill.py my-skill --path "${CODEX_HOME:-$HOME/.codex}/skills"
```

如果你已经知道需要哪些资源目录：

```bash
scripts/init_skill.py my-skill --path "${CODEX_HOME:-$HOME/.codex}/skills" --resources scripts,references,assets
```

初始化完成后，一般会生成：

- `SKILL.md`
- `agents/openai.yaml`
- 可选资源目录

如果不是在 Codex 的技能目录下开发，仍然建议遵循相同结构手工创建。

### 10.6 第 5 步：先写资源，再写 `SKILL.md`

这一点很反直觉，但很重要。

很多人会先狂写 `SKILL.md`，最后发现：

- 模板没准备好
- 脚本还没写
- 参考文档太乱
- 主文档和资源互相重复

更稳妥的方式是：

1. 先把 `scripts/`、`references/`、`assets/` 草稿搭起来。
2. 再让 `SKILL.md` 只负责调度和导航。

这样可以保证 Skill 结构清晰，不会把所有信息都堆到一个文件里。

### 10.7 第 6 步：写 `SKILL.md`

推荐顺序如下。

#### 先写输入

说明：

- 支持的格式
- 必填字段
- 默认值
- 自动推断逻辑
- 异常情况

#### 再写工作流

把主流程拆成步骤。

例如：

1. 校验输入
2. 运行脚本
3. 加载参考规则
4. 组织输出

如果需要跑命令，直接写命令。

#### 再写输出

说明：

- 输出结构
- 输出顺序
- 表格格式
- 状态标记
- 文件产物

#### 最后写资源导航

明确说明：

- 用户问到预算重分配时，去读哪个 `references/`
- 用户需要 LaTeX 输出时，用哪个 `assets/`
- 需要统计计算时，执行哪个 `scripts/`

### 10.8 第 7 步：控制正文长度与层次

写 Skill 的常见误区是“怕 Agent 不懂，于是什么都写进去”。

正确做法是：

- 核心流程放正文
- 复杂细节放 `references/`
- 长示例放 `references/`
- 复杂逻辑放脚本

如果 `SKILL.md` 越写越长，通常说明你还没把资源拆对。

### 10.9 第 8 步：验证与跑通最小闭环

如果你在 `skill-creator` 工作流里，先做静态校验：

```bash
scripts/quick_validate.py <path/to/skill-folder>
```

它会检查：

- YAML 是否合法
- `name` / `description` 是否存在
- 命名是否符合规则

但静态校验还不够。

你还需要做动态验证：

- 是否真的能触发？
- 脚本是否真能运行？
- 模板是否能被正确使用？
- 输出是否符合预期？
- 边界情况是否会报清楚错误？

### 10.10 第 9 步：做真实任务前测

这是最能拉开 Skill 质量差距的一步。

不要只看文件写得像不像样，要真的拿真实任务跑。

检查这些问题：

- 用户只给一句模糊话时，Skill 能否正确触发？
- 用户给非标准输入时，会不会直接失败？
- 输出是否过散、过空、过长？
- 哪些内容应该拆到 `references/` 但还留在正文里？
- 哪些逻辑应该沉淀成脚本？

本地 `skill-creator` 还特别强调 forward-testing：

- 用真实任务去测 Skill
- 尽量让测试方只看到 Skill 和任务，而不是你的“标准答案”
- 通过真实使用暴露设计缺陷

### 10.11 第 10 步：迭代，而不是一次写完

高质量 Skill 几乎都不是第一次写出来的。

它通常会经历这样的演化路径：

1. 第 1 版：只有最小流程
2. 第 2 版：补输入输出约束
3. 第 3 版：把重复逻辑下沉到脚本
4. 第 4 版：把长规则拆到 `references/`
5. 第 5 版：增加模板、错误处理、边界样例

所以写 Skill 的正确预期不是“一次写完”，而是“先能用，再变稳”。

---

## 十一、写 Skill 时最常见的错误

### 11.1 `description` 写得太泛

例如：

```text
Help with documents.
```

这种描述几乎没有触发价值。

Agent 不知道：

- 是读文档、改文档，还是生成文档
- 是处理 PDF、DOCX，还是 Markdown
- 什么语义下该用它

### 11.2 把“什么时候用”写在正文里

这是最常见误区之一。

因为正文只有触发后才加载，所以“何时使用这个 Skill”应该写在 `description`，而不是正文里的 “When to Use” 小节。

### 11.3 所有内容都塞进 `SKILL.md`

后果是：

- 上下文膨胀
- 难维护
- 难复用
- Agent 不容易定位重点

### 11.4 脚本该抽不抽

如果同一段代码已经反复写了很多次，继续让模型临时生成，通常意味着：

- 不稳定
- 浪费上下文
- 难以验证

这时应该抽成脚本。

### 11.5 没有错误处理

高质量 Skill 不是只考虑“理想输入”，还要考虑：

- 字段缺失怎么办
- 格式错误怎么办
- 数据为空怎么办
- 命令失败怎么办

### 11.6 模板和参考材料不分

如果一个文件是供输出直接复用的，应该放 `assets/`。

如果一个文件是供 Agent 学习和参考的，应该放 `references/`。

这两者混在一起，后续会很难维护。

### 11.7 没有真实任务测试

写得再漂亮，如果没有真实任务测试，Skill 很可能只是“看上去合理”。

---

## 十二、一个通用的 Skill 编写模板

下面给一个可直接改写的通用模板。

```md
---
name: your-skill-name
description: Describe what this skill does and when to use it. Include concrete triggers, input types, and the user intents that should activate it.
---

# Skill Title

Briefly state the purpose of the skill.

## Input

Describe supported input formats, required fields, optional parameters, defaults, and edge cases.

## Workflow

### Step 1

Describe the first action.

### Step 2

Describe the second action.

### Step 3

Describe how to assemble or present the result.

## Output

Describe the expected output structure, formatting, files, tables, or status labels.

## Resources

- Read `references/...` when ...
- Use `assets/...` when ...
- Run `scripts/...` when ...

## Notes

Include only critical operational constraints.
```

如果是脚本驱动型 Skill，可以再具体一点：

````md
---
name: analyzing-xxx
description: Analyze xxx data. Use when users provide yyy files and want zzz diagnostics, summaries, or recommendations.
---

# XXX Analysis

## Input

- Supported format: CSV
- Required columns: ...
- Optional args: ...

## Workflow

### Step 1: Validate input

Check required columns and report missing fields.

### Step 2: Run diagnostics

```bash
python scripts/diagnose.py input.csv --output-dir results/
```
### Step 3: Interpret results

Read `references/interpretation.md` when explaining metrics and thresholds.

### Step 4: Report

Present a structured summary and attach relevant files if requested.

## Output

- Executive summary
- Key metrics table
- Findings
- Recommendations
````

## 十三、一个通用的 Skill 目录模板

```text
my-skill/
├── SKILL.md
├── agents/
│   └── openai.yaml
├── scripts/
│   └── run_task.py
├── references/
│   └── rules.md
└── assets/
    └── output_template.md
```

每个目录的职责可以简单记成：

- `SKILL.md`：入口
- `agents/`：UI 元数据
- `scripts/`：执行
- `references/`：知识
- `assets/`：模板

---

## 十四、Skill 编写检查清单

写完一个 Skill 之后，可以按下面这份清单自查。

### 14.1 触发层

- `name` 是否短、清晰、规范？
- `description` 是否同时覆盖功能和触发场景？
- 是否包含用户可能使用的关键词？
- 文件夹名是否与 `name` 一致？

### 14.2 正文层

- 是否清楚写了输入要求？
- 是否按步骤写清主流程？
- 是否说明输出结构？
- 是否用简洁操作式语言表达？
- 是否避免把“何时使用”写进正文？

### 14.3 资源层

- 重复代码是否抽到了 `scripts/`？
- 长规则是否拆到了 `references/`？
- 输出模板是否拆到了 `assets/`？
- 是否避免在正文和资源之间重复内容？

### 14.4 质量层

- 是否校验了异常输入？
- 是否测试了至少一个真实样例？
- 脚本是否真的运行过？
- 模板是否真的被使用过？
- 是否能处理边界情况？

### 14.5 上下文层

- `SKILL.md` 是否足够精炼？
- 是否有不必要的背景大段说明？
- 是否存在和任务无关的附加文档？

---

## 十五、如何判断一个 Skill 已经“能上线”

可以用下面 5 个标准判断。

### 15.1 能触发

用户用自然语言表达需求时，Agent 能较稳定地联想到这个 Skill。

### 15.2 能执行

触发后不会卡在“知道该做什么，但没有资源做”。

### 15.3 能输出

输出结构清晰，不是零散段落拼接。

### 15.4 能解释

关键判断依据、指标口径、规则来源能说清楚。

### 15.5 能迭代

后续增加规则、换模板、换脚本时，不会牵一发动全身。

如果这 5 点都成立，这个 Skill 基本就已经具备工程价值。

---

## 十六、最终结论

学习 Skill，不应只停留在“会写一个 `SKILL.md` 文件”。

真正应该掌握的是下面这套工程化思维：

1. 先识别哪些任务值得资产化。
2. 再把重复流程拆成可复用资源。
3. 用 `description` 设计触发，用 `SKILL.md` 设计执行。
4. 用 `scripts/`、`references/`、`assets/` 降低上下文负担。
5. 通过真实任务测试，不断迭代。

换句话说，Skill 的本质不是一种格式，而是一种把经验沉淀为 Agent 可调用能力的工程方法。

如果你后续要自己写 Skill，建议直接按照本文的顺序走：

1. 先写真实样例
2. 再拆资源目录
3. 再写 `name` / `description`
4. 再写 `SKILL.md`
5. 最后做真实任务验证

这样比一上来就写长篇说明文档，稳定得多，也更容易写出真正能用的 Skill。
