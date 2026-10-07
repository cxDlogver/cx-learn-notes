# Agent Skill 适合沉淀重复且仍需语义判断的稳定任务方法

## 【知识概述】

Skill 不是“更长的 Prompt”，也不是所有重复工作的默认归宿。更准确的定位是：

> **Skill 用来沉淀一类可重复任务的稳定方法，并把自然语言判断、参考资料、模板、脚本和 Tool 组织成可复用的执行方式。**

OpenAI 当前将 Skill 定义为一组用于可重复工作流的 instructions 与 resources。Skill 以 `SKILL.md` 为核心，可以按需携带 `references/`、`scripts/`、`assets/` 等资源；MCP / Tool 负责提供实时数据和受控动作，Skill 则负责说明什么时候使用这些能力、按什么顺序执行、如何处理分支以及最终应该产出什么。[[1]](https://developers.openai.com/plugins/concepts/skills) [[2]](https://developers.openai.com/plugins/build/skills)

因此判断一个工作是否值得沉淀成 Skill，不能只看“是否重复”，还要继续判断：

~~~text
是否重复且有复用价值？
        ↓
是否已经形成相对稳定的方法？
        ↓
执行时是否仍需要结合上下文做语义判断？
        ↓
是
→ 适合 Skill

如果执行完全确定
→ 更适合 Script / Tool

如果只是一次性任务说明
→ Prompt / Context

如果只是供人或 Agent 阅读的固定流程说明
→ SOP / Reference
~~~

Skill 最适合处在“纯自然语言说明”和“完全确定性程序”之间：方法已经稳定，但其中仍存在需要 Agent 根据上下文选择、组合和判断的部分。

---

## 【提问】

- 什么样的工作值得沉淀成 Skill？
- Skill 和 Prompt、SOP、Script、Tool 分别是什么关系？
- 为什么高质量 Skill 不能只是把 Prompt 写得更长？
- Skill 里哪些内容应该保留自然语言，哪些应该下沉成 Script、Schema、Tool 或 Gate？
- Skill 应该怎样通过真实任务持续演进？

---

## 【回答框架】

核心判断可以压缩成：

~~~text
一次性说明
→ Prompt / Context

稳定流程说明
→ SOP / Reference

确定输入 → 确定执行 → 确定输出
→ Script / Tool

重复任务 + 稳定方法 + 仍需语义判断
→ Skill
~~~

判断 Skill 是否值得建设，至少看三件事：

1. **是否重复且有足够价值**：只解决一次的问题通常不值得单独维护 Skill；
2. **是否已经形成稳定方法**：每次任务都完全不同、没有可复用流程时，不适合过早抽象；
3. **是否仍需要 Agent 判断**：完全确定的执行逻辑应优先下沉到 Script / Tool，而不是让模型每次重新解释。

高质量 Skill 进一步需要：

~~~text
触发条件
→ 什么时候使用

任务边界
→ 输入、输出、停止条件

稳定主流程
→ 关键步骤与分支判断

Supporting Resources
→ references / assets / scripts

Tool / MCP
→ 执行真实外部动作

Verifier / Gate
→ 对不能遗漏的完成条件做确定性检查
~~~

---

## 【完整回答】

如果让我判断一个工作是否应该沉淀成 Skill，我不会先看任务复杂度，而会先判断它是否已经形成了一套**值得重复使用、相对稳定、但执行时仍需要 Agent 根据上下文做判断的方法**。

### 【Skill 沉淀的是任务方法，而不是单个动作】

Tool 更接近：

> **Agent 可以执行什么动作。**

例如：

~~~text
read_file
run_test
query_coverage
operate_browser
send_request
~~~

Skill 更接近：

> **面对某一类任务，应该怎样组合这些能力完成目标。**

OpenAI 当前明确区分了 Skill 与 MCP Tool：MCP Server 提供实时数据、认证、授权和受控动作；Skill 提供围绕这些能力的可复用 workflow，包括工具顺序、决策点、输出要求、模板和参考资料。[[1]](https://developers.openai.com/plugins/concepts/skills)

因此：

~~~text
Tool
→ Action

Skill
→ Method / Workflow around actions
~~~

一个 Skill 可以调用多个 Tool，也可以完全不依赖外部 Tool，只提供稳定的方法、模板和参考资料。

### 【判断一个工作是否值得沉淀成 Skill，至少看三个条件】

#### <u>第一，任务是否重复出现并且有复用价值</u>

如果只是一次性的临时问题：

~~~text
临时把一个文件改成某种格式
只执行一次的数据处理
一次性的业务排查
~~~

直接使用 Prompt、现有 Tool 或临时 Script 往往更合适。

Skill 需要额外维护 description、流程、资源、验证方式和版本，因此只有任务会持续重复、对团队或多个 Agent 都有复用价值时，维护成本才值得。

OpenAI 当前也将 Skill 定位在 repeatable workflow：适合跨 Prompt / Agent 复用、独立版本化和按需加载；真正一次性的工作不一定需要 Skill。[[3]](https://developers.openai.com/cookbook/examples/skills_in_api)

#### <u>第二，任务是否已经形成相对稳定的方法</u>

重复不等于适合 Skill。

如果每次遇到的问题都完全不同，连输入、判断步骤和完成标准都还没有稳定下来，过早抽象只会把大量例外写进 Skill。

更适合 Skill 的情况是：

~~~text
输入会变化
环境会变化
具体 Tool 参数会变化

但是：

问题识别方式相对稳定
主要步骤相对稳定
分支条件相对稳定
完成标准相对稳定
~~~

也就是说 Skill 沉淀的是“解决这一类问题的方法”，不是某一个具体任务的答案。

#### <u>第三，执行过程中是否仍需要 Agent 做语义判断</u>

这是 Skill 和 Script / Tool 最重要的边界。

如果任务已经可以完整表示成：

~~~text
固定输入
→ 固定算法
→ 固定输出
~~~

就应该优先使用 Script / Tool，而不是让模型每次重新理解和生成。

例如：

~~~text
检查文件是否存在
验证 JSON Schema
统计覆盖率是否达到阈值
检查必填字段
执行固定测试命令
~~~

这些都更适合确定性程序。

但如果问题是：

~~~text
当前未覆盖代码对应哪个业务场景？
应该操作哪个页面状态才能触发？
多个候选方案里哪一个适合当前上下文？
当前证据能不能真正支持业务断言？
~~~

就仍然需要模型理解上下文。

因此 Skill 更适合：

> **稳定方法已经存在，但方法内部仍然包含需要语义理解、动态选择或工具组合的部分。**

---

### 【Prompt、SOP、Skill、Script 和 Tool 应按职责区分】

可以把它们放在同一条自由度轴上理解：

| 形式 | 主要职责 | 适合场景 |
| --- | --- | --- |
| Prompt / Context | 当前任务的一次性目标、要求或上下文 | 临时任务、当前 Session |
| SOP / Reference | 描述固定方法、规范和背景知识 | 人或 Agent 按需阅读 |
| Skill | 可发现、可复用的任务方法与资源包 | 重复工作流、条件分支、跨 Tool 组合 |
| Script | 确定性计算、转换和检查 | 固定算法、文件处理、校验 |
| Tool / MCP | 对外部系统执行真实动作 | 查询、写入、浏览器、数据库、API |

它们不是互斥的。

一个高质量 Skill 往往会组合：

~~~text
SKILL.md
→ 任务方法和判断逻辑

references/
→ 详细领域知识、Schema、示例

assets/
→ 固定模板和产物骨架

scripts/
→ 重复且需要确定结果的程序

Tool / MCP
→ 外部真实动作
~~~

OpenAI 当前也建议保持 `SKILL.md` 聚焦，把详细资料放进 `references/`，把模板放进 `assets/`，只有需要 deterministic computation 或 file processing 时再使用 `scripts/`；如果已有 instructions 和 Tool 已经能够可靠完成任务，就不要为了形式额外增加脚本。[[2]](https://developers.openai.com/plugins/build/skills)

---

### 【高质量 Skill 的第一步是把触发条件写清楚】

Skill 要先被正确发现，才谈得上执行。

当前 OpenAI Skill Discovery 会先让模型看到 Skill 的 `name` 和 `description`，匹配当前任务以后再加载完整 `SKILL.md`。因此 description 既要说明“做什么”，也要说明“什么时候应该使用”。[[1]](https://developers.openai.com/plugins/concepts/skills) [[4]](https://developers.openai.com/api/docs/guides/tools-skills)

所以：

~~~text
不好：
coverage-helper
帮助处理覆盖率

更好：
用于前端代码修改后分析增量覆盖率缺口，
定位未覆盖代码并根据业务页面路径补充真实交互验证。
~~~

触发条件过宽会误调用，过窄则应该触发时找不到 Skill。

---

### 【主文件只保留稳定主流程，不把所有知识塞进 Prompt】

高质量 Skill 的 `SKILL.md` 应主要回答：

~~~text
目标是什么
输入是什么
执行主流程是什么
关键分支怎么判断
需要什么 Tool / Resource
输出是什么
什么时候停止
什么算完成
~~~

API 细节、案例、长篇背景资料不应该全部放在主文件。

原因不是单纯为了减少 Token，而是为了让 Skill 触发以后，Agent 第一时间看到真正影响行动选择的主流程。

OpenAI 当前也要求 Skill 明确输入、步骤、输出、不得推断的事实、何时询问 / 停止，以及应该读取哪些 supporting files。[[2]](https://developers.openai.com/plugins/build/skills)

---

### 【规则应根据确定程度分配不同自由度】

Skill 不应该把所有规则都写成“请务必”。

可以按可确定程度拆分：

~~~text
需要结合业务上下文判断
→ 自然语言规则

输入输出结构固定
→ Template / Schema

重复且结果确定
→ Script

需要操作真实系统
→ Tool / MCP

绝对不能绕过的完成条件
→ Verifier / Gate / Hook
~~~

例如：

~~~text
“证据是否真正支持当前业务断言”
→ Agent / Human

“evidence_ref 是否为空”
→ Deterministic Check

“证据文件是否存在”
→ Deterministic Check

“应该通过什么页面操作触发这一代码分支”
→ Agent + Browser Tool
~~~

核心原则是：

> **Agent 负责需要语义判断的不确定部分，工程机制负责已经能够确定表达和检查的部分。**

---

### 【Skill 中写了必须执行，不代表系统已经形成硬约束】

Skill 的自然语言 Instructions 本质上仍然需要模型读取、理解和遵守。

因此：

~~~text
Skill
→ 告诉 Agent 应该怎样做

Script / Verifier
→ 对客观条件做确定性执行或检查

Gate / Hook / Runtime Policy
→ 检查失败时真正阻止任务继续
~~~

这三个层次不能混淆。

如果测试是绝对不能省略的交付条件，仅在 Skill 中写：

~~~text
“代码修改后必须执行测试”
~~~

仍然可能被 Agent 跳过。

更可靠的方式是让 Test Result 成为结构化状态，并在结束前由确定性检查确认：

~~~text
test_executed == true
AND
test_result == PASS
~~~

失败时阻断完成。

因此一个可靠 Skill 不是“自然语言写得足够强硬”，而是知道哪些规则应该保留给 Agent 判断，哪些应该继续下沉到 Harness / Workflow 的确定性机制。

---

### 【Skill 需要通过真实 Case 持续演进】

Skill 不是写完一次就完成。

推荐的迭代闭环是：

~~~text
真实重复任务
        ↓
抽取稳定方法
        ↓
Skill V1
        ↓
真实 Case 执行
        ↓
观察 Failure
        ↓
失败归因
├─ 没有触发正确 Skill
├─ 主流程描述不清
├─ 缺少领域资料
├─ Tool 使用方式错误
├─ 确定性规则仍停留在自然语言
└─ 完成条件不可信
        ↓
修改 description / instructions
references / scripts / verifier
        ↓
代表性 Case / Regression 再验证
~~~

OpenAI 当前也建议同时测试：

- 应该直接触发 Skill 的请求；
- 间接表达相同目标的请求；
- 输入不完整的请求；
- 不应该触发 Skill 的请求；
- 容易出现误判断或不支持操作的边界 Case。[[2]](https://developers.openai.com/plugins/build/skills)

因此 Skill 的质量不能只通过“文档写得是否详细”判断，而应该看：

> **它能否在代表性的真实任务中正确触发、正确执行，并稳定地产生满足完成标准的结果。**

---

## 【与相邻知识的关系】

- [Agent 通过结构化状态与确定性检查降低自然语言约束的不确定性](./Agent%20通过结构化状态与确定性检查降低自然语言约束的不确定性.md)：继续解释为什么 Skill 中可以确定判断的规则应该下沉成结构化合同和程序检查。
- [Agent 编排通过代码与模型分配不同范围的执行决策权](./Agent%20编排通过代码与模型分配不同范围的执行决策权.md)：继续解释固定业务骨架、模型动态决策与 Skill 局部方法之间的关系。
- [Agent完整学习教程](../A-Agent学习教程.md)：从 Agent System 总体结构理解 Skill、Tool、Runtime 和 Harness 的位置。
- [项目面试回答：Skill 如何判断是否值得沉淀以及如何设计高质量 Skill](../../bytedance/docs/Skill如何判断是否值得沉淀以及如何设计高质量Skill.md)：结合 Mock Skill、前端增量覆盖率 Skill 和可靠 Skill 调研说明实际项目经验。

---

## 【继续展开】

- **追问：Skill 和 Tool 最大的区别是什么？**
  - Tool 表达“可以执行什么动作”，Skill 表达“面对一类任务应该怎样组织动作、知识和判断”。
- **追问：为什么 Skill 中明确写了规则，Agent 仍可能跳过？**
  - 可继续阅读：[Agent 通过结构化状态与确定性检查降低自然语言约束的不确定性](./Agent%20通过结构化状态与确定性检查降低自然语言约束的不确定性.md)。
- **追问：什么时候不应该做成 Skill？**
  - 一次性工作、方法尚未稳定、完全确定性流程或主要需求只是外部实时操作时，应优先使用 Prompt、探索实践、Script 或 Tool。

---

## 【参考资料】

[1] OpenAI. [Skills – Plugins](https://developers.openai.com/plugins/concepts/skills)[EB/OL]. 核验日期：2026-10-08。

[2] OpenAI. [Build skills – Plugins](https://developers.openai.com/plugins/build/skills)[EB/OL]. 核验日期：2026-10-08。

[3] OpenAI. [Skills in OpenAI API](https://developers.openai.com/cookbook/examples/skills_in_api)[EB/OL]. 2026-02-10。

[4] OpenAI. [Skills | OpenAI API](https://developers.openai.com/api/docs/guides/tools-skills)[EB/OL]. 核验日期：2026-10-08。
