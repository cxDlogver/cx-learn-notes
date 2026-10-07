# Agent 通过结构化状态与确定性检查降低自然语言约束的不确定性

## 【知识概述】

Agent 的可靠执行不能只依赖“把 Prompt / Skill 写得更详细”。自然语言规则仍然需要模型读取、理解、记忆和执行；当任务变长、状态增多或跨 Session 运行时，仅靠上下文中的规则更容易出现遗漏和状态漂移。

因此，一个重要的 Agent / Harness 工程原则是：

> **把可以明确表达、明确验证的部分，从模型自由判断中拿出来，转换成结构化状态和确定性检查；把真正需要语义理解、推理和动态规划的部分继续交给 Agent。**

~~~text
开放问题
→ Agent / LLM
→ 理解、推理、规划、探索、复杂判断

确定问题
→ Structured State / Schema / Script / Test / Lint
→ 状态记录、字段校验、规则计算、完成判断
~~~

OpenAI 当前的 Skill 机制本身就体现了这层边界：Skill 用 `SKILL.md` instructions 描述可复用流程，同时允许携带 scripts、templates 和 references；官方明确建议，当 workflow 需要 deterministic computation 或 file processing 时使用 `scripts/`。[[1]](https://developers.openai.com/plugins/concepts/skills) [[2]](https://developers.openai.com/plugins/build/skills)

## 【提问】

- Agent 本身具有不确定性，怎样通过工程机制提高长任务执行的可靠性？
- 为什么不能只靠 Prompt / Skill 中的“必须、禁止”来保证规范执行？
- 哪些规则应该继续使用自然语言，哪些应该下沉成结构化状态、Schema 或 Script？
- “用确定性约束包围不确定 Agent”应该怎样理解？

## 【回答框架】

先判断规则本身的性质：

~~~text
需要理解语义、依赖上下文、存在多种合理路径
→ 保留给 Agent 判断

存在明确状态、明确规则、明确 Ground Truth
→ 尽量确定化
~~~

再看确定化程度：

~~~text
自然语言规则
        ↓
结构化字段 / 固定状态
        ↓
Schema / 类型约束
        ↓
Script / Test / Lint / Static Check
        ↓
可执行的完成条件
~~~

核心不是“所有规则都必须写代码”，而是**不要让模型重复判断本来可以由程序稳定判断的事情**。

## 【完整回答】

Agent 的价值来自它能够面对开放环境进行理解、推理和动态决策，但可靠性建设首先要判断：**系统中哪些地方真的需要模型自由判断。**

### 【自然语言规则适合表达开放要求，但执行仍依赖模型】

Skill 和 Prompt 很适合表达任务目标、业务语义、处理原则和异常判断，但这些规则最终仍需要模型读取和执行。OpenAI Skills 文档说明，模型先根据 Skill metadata 发现 Skill，在任务匹配后加载完整 instructions；`SKILL.md` 因此首先是一套模型消费的工作流说明。[[1]](https://developers.openai.com/plugins/concepts/skills)

因此，即使写下：

~~~text
必须执行全部测试
不能遗漏任何必需产物
证据不完整时不能结束
~~~

如果系统没有其他检查机制，最终仍可能退化成模型自己判断“这些条件应该已经满足”。

### 【结构化状态把模型记忆转换成外部任务事实】

对于长任务，更稳定的做法是把关键执行状态从 Context 中拿出来。

例如一个任务有多个 Case，不只在对话里记录：

~~~text
Case A 完成了
Case B 还差一步
Case C 好像已经验证
~~~

而是保存：

~~~text
case_id
status
actual_result
evidence_ref
failure_reason
~~~

这样后续 Agent、恢复后的 Session 或人工 Reviewer 可以重新读取真实状态，而不是依赖模型对早期上下文的回忆。

Anthropic 在长任务 Agent 的工程实践中也使用 Feature List、Progress File 等外部产物保存跨 Session 的工作状态。[[3]](https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents)

结构化状态解决的核心问题是：

> **把“Agent 记得什么”变成“系统记录了什么”。**

### 【确定性检查把规则解释转换成状态计算】

状态结构化以后，可以继续把存在明确答案的条件下沉：

~~~text
required field 是否为空
文件是否存在
状态是否属于合法枚举
测试退出码是否为 0
所有任务是否已经闭合
coverage 是否达到阈值
改动文件是否越过允许范围
~~~

这些问题通常不需要 LLM 重新理解一次，可以通过 JSON Schema、类型系统、Script、Test、Lint、Static Analysis 或状态检查得到明确结果。

OpenAI 的 Skill 构建指南明确建议，在需要 deterministic computation 或 file processing 时使用 scripts；如果普通 instructions 已经能够可靠完成任务，则不需要为了形式额外增加脚本。[[2]](https://developers.openai.com/plugins/build/skills)

Anthropic 的 Skill Best Practices 也提出“appropriate degrees of freedom”：当多种路径都合理、判断依赖上下文时使用更高自由度文本说明；当操作脆弱、一致性重要、执行方式更固定时，应降低自由度并采用更明确的程序化方式。[[4]](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices)

因此核心不是“Script 比自然语言更高级”，而是：

> **判断规则的确定性，然后选择对应的执行机制。**

### 【可执行门禁把“应该停止”升级成“不能通过检查”】

只在 Prompt 中写“如果还有遗漏，请不要结束任务”，仍然需要 Agent 主动遵守。

如果系统维护：

~~~text
required_items
completed_items
failed_items
evidence_status
~~~

就可以让程序直接判断：

~~~text
required_items == completed_items
AND failed_items == 0
AND evidence_status == complete
~~~

从而得到明确的 PASS 或 BLOCKED / FAIL。

OpenAI 在 Harness Engineering 的实践中指出，Documentation alone 不能长期维持关键架构约束，因此会把重要 invariants 转换成 custom linters 和 structural tests 机械执行；同时强调 **enforce invariants, not micromanage implementations**，即固定真正重要的边界，而不是规定 Agent 的每一个实现动作。[[5]](https://openai.com/index/harness-engineering/)

### 【不要把所有问题都确定化】

结构化和程序化不是越多越好。

~~~text
测试进程是否成功
→ Script

为什么测试失败
→ Agent
~~~

~~~text
证据文件是否存在
→ Script

这些证据是否真的证明业务语义正确
→ Agent / Human
~~~

~~~text
字段是否满足 Schema
→ Program

需求本身是否存在歧义
→ Agent / Human
~~~

因此可以形成一个稳定判断：

> **让 Agent 负责不确定性，让工程系统负责确定性。**

Agent 保留对开放任务的自主性，Harness 通过外部状态、结构化合同、脚本和测试收紧那些不需要自由判断的区域。

## 【与相邻知识的关系】

这条原则和“代码编排 vs 模型编排”有关，但不是同一个问题。

[Agent 编排通过代码与模型分配不同范围的执行决策权](./Agent%20编排通过代码与模型分配不同范围的执行决策权.md)回答的是：**哪些下一步决策应该由代码决定，哪些应该交给模型。**

当前问题回答的是：**已经确定的规则，怎样进一步从自然语言约束下沉成可验证的工程约束。**

它也和长任务状态管理有关。[Agent 长任务通过任务分解、持久化状态与验收实现持续推进和恢复](./Agent%20长任务通过任务分解、持久化状态与验收实现持续推进和恢复.md)重点回答 State、Artifact、Checkpoint 和 Recovery；当前问题进一步解释为什么结构化状态还能成为确定性检查的输入。

## 【项目实践映射】

字节 AI Coding Workflow 中已经有多处对应实践：

- [AI Coding 如何通过确定性工程机制提高 Agent 可靠性](../../bytedance/docs/AI-Coding如何通过确定性工程机制提高Agent可靠性.md)：面试视角下的完整项目回答。
- [如何编写让 Agent 可靠执行的 Skill](../../bytedance/如何让Agent可靠执行Skill-汇报分享.md)：围绕结构化合同、脚本校验、增量记录和 Gate 回溯的专项调研。
- [浏览器运行合同静态检查脚本](../../bytedance/AI-Coding-Workflow/scripts/check_browser_runtime_contract.mjs)：把跨多个流程文件的重要 Browser Runtime Contract 下沉成真实可执行的静态检查。
- [静态回归记录](../../bytedance/AI-Coding-Workflow/flow-regression-runs/2026-06-30-coco-cli-headless-browser-static.md)：记录脚本执行后的 deterministic check 结果。

这些项目材料说明了一个通用原则怎样落地，但具体字段和目录属于项目实现，不应被当成所有 Agent 系统必须采用的标准。

## 【继续展开】

- **为什么结构化状态对长任务尤其重要？**
  - 继续阅读：[Agent 长任务通过任务分解、持久化状态与验收实现持续推进和恢复](./Agent%20长任务通过任务分解、持久化状态与验收实现持续推进和恢复.md)。
- **代码和模型应该分别拥有多少执行决策权？**
  - 继续阅读：[Agent 编排通过代码与模型分配不同范围的执行决策权](./Agent%20编排通过代码与模型分配不同范围的执行决策权.md)。

## 【参考资料】

[1] OpenAI. [Skills](https://developers.openai.com/plugins/concepts/skills)[EB/OL]. 核验日期：2026-10-07。

[2] OpenAI. [Build skills](https://developers.openai.com/plugins/build/skills)[EB/OL]. 核验日期：2026-10-07。

[3] Anthropic. [Effective harnesses for long-running agents](https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents)[EB/OL].

[4] Anthropic. [Skill authoring best practices](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices)[EB/OL]. 核验日期：2026-10-07。

[5] OpenAI. [Harness engineering: leveraging Codex in an agent-first world](https://openai.com/index/harness-engineering/)[EB/OL]. 2026-02-11。
