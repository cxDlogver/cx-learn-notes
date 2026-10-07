# AI Coding 如何保证 Agent 验收结论可信

## 【提问】

在 Test Case 已经明确、准确的前提下，Agent 在 Verify 阶段仍然需要自主操作页面并判断结果。如何保证它最终给出的 PASS 结论可信，而不是“自己执行、自己宣布通过”？

## 【回答思路】

这道题只回答一个核心问题：**验收结论如何获得可信依据。**

回答主线是：

~~~text
Test Case 预先声明断言与证据要求
        ↓
Agent 在真实运行环境执行验收
        ↓
记录实际观察值并持久化对应证据
        ↓
Assertion 与 Evidence 逐项对账
        ↓
确定性 Gate 检查证据完整性与一致性
        ↓
必要时人工复核
        ↓
PASS / PASS_WITH_NOTES / NEEDS_TARGETED_REVIEW / BLOCKED
~~~

这里不再讨论 Test Case 如何从需求生成。Test Case 是否准确属于上一道问题；这一题只讨论：**当验收标准已经确定以后，怎样证明执行结果确实满足它。**

## 【标准回答】

我认为保证 AI 验收结论可信的核心，是**不能把 Agent 自己的自然语言判断当作验收依据，而是要求每一个 PASS 都能够被外部可观察的证据支撑。**

Agent 最终说“功能已经完成”“测试已经通过”，本质上仍然只是一次模型输出。它可以作为执行结果的说明，但不能直接证明真实页面、接口或者系统状态已经满足要求。

因此我们在 Verify 阶段主要做了三层控制。

### 【第一层：在执行验收之前就定义证据要求】

证据要求不是 Agent 执行到一半以后自己决定的，而是在前面的 Test Case Matrix 中已经声明。

一个 Case 会提前定义：

~~~text
positive_assertion
negative_assertion
visual_assertion
negative_visual_assertion
evidence_required
~~~

也就是说，我们不只定义“应该发生什么”，也定义“什么不能发生”，以及需要什么类型的证据才能关闭当前 Case。

例如“存在问题作品时禁止提交”这个 Case，不能只验证页面出现提示，还需要验证：

- 不应该打开后续确认流程；
- 不应该发送真实奖励请求；
- 不应该出现成功状态。

这样 Verify 阶段的 Agent 不能根据自己看到的局部现象重新定义“什么叫通过”，而是必须回到预先确定的断言逐项验证。

### 【第二层：把实际结果沉淀成可复核的 Evidence Mapping】

Agent 会按照 Test Case 操作真实运行页面，并为不同类型的断言采集相匹配的运行证据。

不同事实需要不同证据：

~~~text
页面状态
→ UI / DOM / Screenshot

请求是否发送、参数是否正确
→ Network Capture

样式和布局
→ DOM / BBox / Computed Style / Screenshot

构建、类型和测试结果
→ Command Output / Log

文件、数据库或服务端状态变化
→ 对应的真实状态检查
~~~

这里最重要的原则是：

> **证据类型必须和要证明的事实匹配。**

例如要证明“没有发送奖励请求”，只有一张页面截图是不够的，因为截图无法证明 Network 没有产生请求；反过来，要证明一个按钮的视觉样式是否符合要求，仅有 Network 记录也无法支撑结论。

所以每个 Assertion 最终会形成一条明确的对账关系：

~~~text
Assertion
    ↓
Observed Value
    ↓
Evidence Type
    ↓
Evidence Ref
    ↓
Coverage Result
~~~

当前工作流的 Case Result 中会记录：

~~~text
case_id
assertion_ref
evidence_requirement_id
verification_status
recording_status
evidence_type
observed_value
evidence_ref
coverage_result
~~~

其中：

- `observed_value` 表示实际观察到了什么；
- `evidence_ref` 指向已经持久化的截图、Network Capture、JSON、日志或命令输出等证据；
- `coverage_result` 才表示当前最小验收事实是否已经被证据闭合。

因此，Agent 写一句“已经验证通过”不能关闭 Case；全局 Summary、代码路径或者没有落盘的浏览器临时状态，也不能单独作为 PASS 依据。

### 【第三层：尽量让 Gate 使用确定性条件，而不是再做一次开放式模型判断】

如果最后仍然只是写一个 Prompt：

> 请判断这些证据是否充分，充分则 PASS。

那验收结论仍然高度依赖模型的自由判断。

所以我们设计 Verify Gate 时，会尽可能把可检查条件转换成结构化字段和脚本规则。

例如一个 Assertion 要 PASS，至少需要满足：

~~~text
verification_status = EXECUTED
        ↓
recording_status = RECORDED
        ↓
evidence_type 与 Test Case 要求匹配
        ↓
evidence_ref 指向真实、持久化的证据
        ↓
observed_value 能够支持当前验收事实
        ↓
所有必需 acceptance_item 均闭合
~~~

这比检查“Agent 有没有写 PASS”更加确定。

例如：

~~~text
EXECUTED + NOT_RECORDED
→ 实际执行了，但没有留下可审计证据
→ 不能 PASS
~~~

或者：

~~~text
Test Case 要求 Network
实际只有 Screenshot
→ 证据类型不匹配
→ NEEDS_TARGETED_REVIEW
~~~

再比如：

~~~text
证据已经存在
但 observed_value 与预期断言冲突
→ CODE_ISSUE / 对应问题分类
→ 修复后重新执行当前 Case
~~~

这也是我们设计 Skill 和 Gate 时比较重要的原则：

> **能通过结构化字段、代码或脚本确定性判断的条件，不继续交给模型做开放式判断。**

模型仍然负责操作、分析和处理复杂上下文，但“是否具备进入下一阶段的最小条件”尽可能交给确定性的工程约束。

### 【结果证据和执行轨迹需要区分职责】

验收过程中我们也会保留 Agent 的执行轨迹，例如阶段、Tool 调用、Case 执行和失败位置。

但轨迹和结果证据不是同一种东西。

~~~text
结果证据
→ 回答“当前功能到底满足断言了吗”

执行轨迹
→ 回答“Agent 做过什么、为什么成功或失败、问题发生在哪里”
~~~

例如一个 Agent 按照正确顺序执行了所有操作，但最终真实页面状态仍然错误，那么完整轨迹不能让 Case PASS。

反过来，在安全、权限或者强流程约束场景中，如果“必须经过审批”“禁止调用某个 Tool”本身就是验收条件，那么相应 Trace 也可以成为该约束的证据。

因此更准确的说法不是“Outcome 比 Trace 重要”，而是：

> **应该根据当前 Assertion 选择能够直接证明它的证据。Outcome 主要证明任务结果，Trace 主要解释执行过程；只有当执行过程本身就是合同约束时，Trace 才直接进入验收条件。**

### 【人工审查负责处理高判断和高风险边界】

确定性 Gate 主要解决可以机械判断的条件，例如字段是否完整、证据是否落盘、证据类型是否匹配、必需断言是否闭合。

对于视觉差异、复杂业务语义、高风险操作或者自动结果存在争议的情况，仍然可以由人工进一步复核：

~~~text
Test Case
    ↓
Observed Value
    ↓
Evidence
    ↓
Coverage Result
    ↓
Human Review
~~~

人工 Review 的重点不是重新从头执行整个任务，而是根据已经结构化沉淀的结果和证据，判断自动 Gate 无法完全覆盖的高判断问题。

### 【最终结论】

所以我会把这套机制总结成：

~~~text
不是让 AI “判断自己是否通过”
而是让 AI “提交能够证明通过的证据”

Test Case 定义断言和证据要求
        ↓
Agent 执行并采集真实结果
        ↓
Assertion → Observed Value → Evidence 对账
        ↓
确定性 Gate 检查完整性与一致性
        ↓
高风险或开放判断再进入人工复核
~~~

这样不能保证任何复杂系统都“绝对正确”，但可以把验收结论从模型的自我判断中独立出来。

更准确的工程目标是：

> **在当前可验证范围内，让每一个 PASS 都具有可复核、可追溯、可阻塞的证据基础；无法获得足够证据的部分，不允许被 Agent 自行解释成通过。**

## 【项目实现证据】

当前 AI Coding Workflow 已经把上述原则落实为具体合同：

- [Verify 命令](../AI-Coding-Workflow/commands/delivery/verify.md)：要求逐 Case 消费 Test Case Matrix，并对 positive、negative、visual 和 evidence_required 做 Evidence Mapping。
- [Verification Case Result 模板](../AI-Coding-Workflow/skills/06-debug-verification/debug-verification-case-result.template.md)：定义 `verification_status`、`recording_status`、`evidence_type`、`observed_value`、`evidence_ref` 与 `coverage_result`；禁止用 Summary 或一句自然语言结论作为唯一证据关闭 Case。
- [Harness 全局规则](../AI-Coding-Workflow/AGENTS.md)：阶段产物和 Gate 决定是否推进；Flow Log 只负责观察，不得替代正式 Gate 证据。
- [真实 Case：一键移除](../AI-Coding-Workflow/7306602080-incentive-control-online/verify-logs/case-results/TC-INT-MANUAL-ONE-CLICK-REMOVE.md)：可以继续查看一次真实 Case 如何保存断言、观察结果和证据引用。

## 【通用知识关联】

这道项目面试题不是一个孤立的“前端验收技巧”，它对应 Agent 工程中的一条通用质量链：

~~~text
Task / Success Criteria
        ↓
Agent Trial
        ↓
Outcome / Trace / Output
        ↓
Evidence
        ↓
Deterministic / Model / Human Grader
        ↓
Gate / Evaluation Result
~~~

建议从以下通用知识继续理解：

- [Agent Eval 与 Benchmark](../../Full-Stack-AI-NOTES/A-Agent-Eval与Benchmark.md)：理解 Task、Trial、Trace、Outcome、Grader、Evaluation Harness，以及为什么真实 Outcome 应优先于 Agent 自报完成。
- [Agent 评测通过任务、执行证据与评分器形成质量闭环](<../../Full-Stack-AI-NOTES/QA/Agent 评测通过任务、执行证据与评分器形成质量闭环.md>)：从面试问答角度理解“任务 → 证据 → 评分器 → Gate”的完整回答框架。
- [项目工程化设计](../../Full-Stack-AI-NOTES/X-项目工程化设计.md)：理解这套证据验收机制在 AI Native 软件交付生命周期中的位置。

这里要特别区分：

- **当前项目 Verify**：判断这一次研发需求能不能继续交付；
- **Agent Eval**：在固定 Task、环境和评价协议下，多次测量 Agent / Harness 的能力、稳定性、成本和安全性。

两者目的不同，但共享同一条核心思想：

> **模型声明不是事实；成功必须落到可以独立检查的结果、证据和评分规则上。**

## 【外部权威依据】

1. Anthropic, [Demystifying evals for AI agents](https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents)：区分 Task、Trial、Grader、Transcript / Trace、Outcome 和 Evaluation Harness；强调 Outcome 是 Trial 结束时真实环境中的最终状态，并建议能确定性判断时优先使用确定性 Grader。
2. OpenAI, [Evaluate agent workflows](https://developers.openai.com/api/docs/guides/agent-evals)：Trace 记录模型调用、Tool Call、Guardrail 和 Handoff，可通过 Trace Grading 定位 workflow-level 行为和失败模式。

## 【后续追问】

下一步可以继续单独讨论：

> 你提到“用确定性的规则约束不确定的 Agent”，这个原则在 AI Coding Harness 的 Command、Skill、Script 和 Gate 中分别是怎样落地的？
