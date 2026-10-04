# Agent Eval 与 Benchmark

Agent Eval（Agent 评测）用于回答：**一个 Agent 在给定任务、工具和环境中，能否稳定、低成本、安全地完成真实目标。** 它不能只检查最终文本，因为 Agent 会经历多轮模型调用、Tool Call、环境状态变化、失败恢复和人工介入；一次看似正确的最终回答，也可能来自错误过程，甚至没有真正改变目标环境。Anthropic 将 Agent Eval 拆成 Task、Trial、Grader、Transcript / Trace、Outcome、Evaluation Harness 与 Evaluation Suite 等对象。[[1]](https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents)

本文使用下面的主链组织知识：

~~~text
Task
  ↓
Trial
  ↓
Agent Run
  ├── Trace / Transcript：过程发生了什么
  └── Outcome：环境最终变成什么
          ↓
        Grader
          ↓
Evaluation Harness
          ↓
Evaluation Suite / Benchmark
          ↓
版本比较、回归保护与持续改进
~~~

如果还不理解 Agent Runtime、State、Checkpoint 与 Trace 的运行边界，先阅读 [《Agent System 研发知识梳理》](./Agent-System研发知识梳理.md)。如果关注 AI Coding 中“什么算正确、怎样验收代码产物”，可以同时阅读 [《项目工程化设计》](./项目工程化设计.md)。

## 1. Agent Eval 评测的是完整任务执行而不只是最终回答

### 【普通 LLM Eval 与 Agent Eval 的评测对象不同】

单轮 LLM Eval 往往可以抽象为：

~~~text
Input
  ↓
Model
  ↓
Output
  ↓
Grader
~~~

Agent 的执行更接近：

~~~text
Task
  ↓
Model
  ↓
Tool
  ↓
Environment Changes
  ↓
Model
  ↓
Retry / Handoff / Approval
  ↓
Final Output + Final Environment State
~~~

因此 Agent Eval 至少需要同时回答：

- **结果是否正确**：目标环境最终是否达到预期状态；
- **过程是否合理**：Tool、Handoff、Retry、Approval 等执行轨迹是否符合约束；
- **多次执行是否稳定**：同一个 Task 在多次 Trial 中是否持续成功；
- **资源是否合理**：时间、Token、Model Call、Tool Call 与成本是否可接受；
- **安全边界是否满足**：是否出现越权、危险操作、绕过审批或敏感信息泄漏。

### 【Agent Eval 与业务 KPI 不是同一层评估】

Agent Eval 主要判断 Agent / Harness 在任务上的能力与可靠性；业务 KPI 判断这套系统上线后是否真正创造业务价值。

~~~text
Agent Eval
→ 任务是否完成
→ 运行是否稳定
→ 成本是否可接受
→ 行为是否安全

Business KPI
→ 是否缩短业务处理时间
→ 是否提升覆盖量 / Throughput
→ 是否降低人力成本
→ 是否改善转化、解决率或满意度
~~~

业务 Agent 最终需要同时看两层，但不能用业务 KPI 替代 Agent Eval，也不能因为 Agent Eval 分数提高，就直接推断业务价值一定提高。

## 2. Task、Trial、Trace 与 Outcome 构成一次评测的数据链路

### 【Task 定义输入、环境和成功标准】

Task（任务 / 测试用例）是一项有明确输入和成功标准的测试。[[1]](https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents)

一个工程化 Task 不应只写 Prompt，还需要明确：

~~~text
Task
├── Input
├── Initial Environment
├── Success Criteria
├── Constraints
├── Graders
└── Reference Solution
~~~

例如 Coding Agent 的一个任务可以写成：

~~~yaml
task_id: fix_auth_bypass_001

input:
  issue: "空密码可以绕过认证"

environment:
  repository: auth-service
  branch: eval-fixture

success_criteria:
  - empty_password_is_rejected
  - existing_login_behavior_is_preserved

constraints:
  - must_not_disable_authentication
  - must_not_modify_unrelated_modules

graders:
  - unit_test
  - regression_test
  - diff_scope_check
  - security_rule_check

reference_solution:
  patch: "known-good-fix.diff"
  expected: "passes all required graders"
~~~

Task 的标准必须足够明确，让正确执行任务的 Agent 有机会通过；如果 Grader 检查了 Task 从未说明的隐藏条件，最终分数反映的可能是 Task 设计问题，而不是 Agent 能力。Anthropic 也强调 Task 与 Grader 的成功标准需要清晰且可验证。[[1]](https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents)

Reference Solution（参考解）用于证明两件事：**Task 本身可解，且当前 Grader 配置至少能够接受一个已知正确结果。** Anthropic 建议为 Task 准备一个能够通过全部关键 Grader 的已知工作解，用它检查任务规范、环境和评分器是否配置正确。[[1]](https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents)

Reference Solution 不是“Agent 必须模仿的执行路径”。它只负责验证 Task 和 Grader 的可用性：

~~~text
Reference Solution
→ 证明 Task 可解
→ 证明 Grader 能接受正确结果

Agent Trial
→ 可以采用其他合法路径
→ 只要 Outcome 和必须遵守的约束正确
~~~

因此，Agent 的实现路径不应该因为与 Reference Solution 不同就自动失败。

### 【Trial 是 Task 的一次具体执行】

Trial（一次尝试）表示 Agent 对同一个 Task 的一次完整运行。由于模型输出和 Agent 路径具有非确定性，同一个 Task 应根据评测目标运行多次 Trial，而不是把单次 Pass / Fail 当成稳定能力结论。[[1]](https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents)

~~~text
Task A
├── Trial 1 → Pass
├── Trial 2 → Fail
├── Trial 3 → Pass
└── Trial 4 → Pass
~~~

不同 Trial 应尽量从干净、隔离的环境开始，避免上一轮残留文件、缓存、数据库状态或资源耗尽影响下一轮结果。否则测到的可能是基础设施噪声，而不是 Agent 的真实能力。[[1]](https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents)

### 【Trace 记录过程，Outcome 记录最终环境状态】

本文统一使用下面的职责边界：

| 对象 | 回答的问题 | 典型内容 |
| --- | --- | --- |
| Trace / Transcript / Trajectory | 这次 Trial 经历了什么 | Model Turn、Tool Call、Tool Result、Handoff、Retry、Approval、Token、延迟 |
| Outcome | Trial 结束后环境最终变成什么 | 文件、测试结果、数据库记录、工单状态、资源状态 |
| Final Output | Agent 最后对用户说了什么 | 文本回答、结构化结果 |

OpenAI Agents SDK 的 Tracing 会记录 Agent Run 中的模型生成、Tool Call、Handoff、Guardrail 和自定义事件，适合用来调试、可视化和监控运行过程。[[2]](https://openai.github.io/openai-agents-python/tracing/)

**Trace 不是 Eval。** Trace 是 Runtime 产生的运行事实；Eval 可以读取 Trace、Outcome、Final Output 和资源消耗，再由 Grader 判断是否满足 Task 的成功标准。

~~~text
Runtime
  ↓
Trace ─────────┐
Outcome ───────┼→ Grader → Eval Result
Final Output ──┤
Cost / Latency ┘
~~~

### 【Outcome 优先检查真实环境，而不是相信 Agent 自报完成】

Anthropic 将 Outcome 定义为 Trial 结束时环境中的最终状态。例如 Agent 说“机票已经预订”并不能证明成功，真正需要检查的是环境中是否存在对应预订记录。[[1]](https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents)

同样，在软件工程 Agent 中：

~~~text
Agent：
“修复完成，测试已通过”
        ↓
不能直接算成功

Environment Outcome：
├── 补丁是否真实存在
├── 目标测试是否通过
├── 回归测试是否通过
├── 是否修改了无关文件
└── 安全约束是否仍成立
        ↓
Grader
~~~

因此，能通过代码、数据库、文件系统或业务状态验证的结果，应优先使用真实环境证据，而不是只评价最终自然语言。

## 3. Grader 根据任务性质组合确定性、模型和人工判断

### 【Grader 判断 Trial 的某一方面是否满足标准】

Grader（评分器）是检查 Agent 表现的评分逻辑。一个 Task 可以同时配置多个 Grader，每个 Grader 又可以包含多个 Assertion（断言）。[[1]](https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents)

生产评测通常组合三类 Grader：

| Grader | 适合判断 | 优点 | 主要限制 |
| --- | --- | --- | --- |
| Code-based / Deterministic | 测试是否通过、数据库状态、Tool 参数、权限规则、静态分析 | 快、便宜、稳定、易复现 | 对开放式质量判断不够灵活 |
| Model-based | 文本质量、解释完整性、开放式策略、Rubric | 能处理自然语言和多种正确答案 | 本身具有非确定性，需要校准 |
| Human | 高价值任务、专业判断、模糊边界、Judge 校准 | 能提供专家判断 | 成本高、速度慢 |

[[1]](https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents)

### 【Outcome、Policy Constraint 与 Implementation Path 需要分开评分】

Agent Eval 可以读取完整 Trace，但**能观察路径不等于应该规定唯一路径**。更稳定的做法是先区分三类评测对象：

| 评测对象 | 主要问题 | 是否适合硬性约束 |
| --- | --- | --- |
| Outcome | 最终任务是否真正完成 | 是 |
| Policy / Safety Constraint | 是否满足权限、审批、安全、合规等必须规则 | 是 |
| Implementation Path / Trajectory | Agent 具体用了什么 Tool、什么顺序、怎样规划 | 通常不是唯一答案 |

例如 Coding Agent 可以要求：

~~~text
必须：
→ 修复目标缺陷
→ 保持回归测试通过
→ 不修改无关模块
→ 不越权访问资源

通常不应该要求：
→ 必须先 read_file
→ 再 edit_file
→ 再 run_tests
→ 严格按唯一顺序执行
~~~

因为 Agent 可能找到设计者没有预设、但同样正确的执行路径。Anthropic 也指出，过度限定具体 Tool Call 或中间步骤容易产生脆弱评测；更可靠的方式通常是优先检查 Outcome，并只对真正属于业务、安全或合规要求的路径约束做硬性评分。[[1]](https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents)

Trajectory 仍然有价值，但更多用于解释和诊断：

~~~text
Outcome Grading
→ 判断“有没有真正完成”

Constraint Grading
→ 判断“有没有违反必须遵守的边界”

Trajectory Analysis / Trace Grading
→ 判断“为什么成功或失败”
→ 发现低效、循环、错误 Tool、错误 Handoff
~~~

OpenAI 当前也将 Trace Grading 定义为对一次 Agent workflow 的完整 Trace 进行结构化评分，可用于检查 Tool 选择、Handoff、Guardrail 与安全策略等 workflow-level 行为。[[6]](https://developers.openai.com/api/docs/guides/agent-evals)

### 【优先使用最确定的证据，再增加主观评分】

如果结果可以通过真实系统状态判断，就优先使用确定性 Grader：

~~~text
代码是否通过测试
→ Test Runner

数据库是否产生退款记录
→ State Check

是否调用了越权 Tool
→ Trace / Policy Check

回答是否清晰、有同理心
→ Model-based / Human Rubric
~~~

这并不意味着 Model-based Grader 没有价值，而是不要用模型评分替代本来可以直接验证的事实。

OpenAI Agents SDK 当前还提供 provider-neutral 的 deterministic testing utilities，可以在不调用真实模型和外部 Provider 的情况下测试 Tool Execution、Handoff、Guardrail、Retry、Session 等 SDK / Application 自己负责的编排行为。[[3]](https://openai.github.io/openai-agents-python/testing/) 这类测试不是完整 Agent Eval，但可以成为确定性 Grader 或回归证据的一部分。

### 【评分可以是二值、加权或混合规则】

不同 Task 的通过条件可以不同：

~~~text
Binary
→ 所有关键 Grader 必须通过

Weighted
→ 多个 Grader 按权重形成总分

Hybrid
→ 安全 / 权限是硬门禁
→ 质量 / 风格再按 Rubric 评分
~~~

例如：

~~~text
Security Test     必须 Pass
Regression Test   必须 Pass
Task Completion   ≥ 0.9
Explanation       ≥ 4 / 5
~~~

高风险条件更适合 Gate，而不是让平均分把严重失败“抵消”掉。

## 4. Evaluation Harness、Evaluation Suite 与 Benchmark 负责规模化重复评测

### 【Evaluation Harness 负责把评测端到端运行起来】

Evaluation Harness（评测运行底座）负责把 Task 真正执行起来，并完成环境初始化、Agent 调用、Trace 记录、Grader 执行和结果聚合。Anthropic 将其描述为运行 Eval 的基础设施。[[1]](https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents)

~~~text
Evaluation Harness
├── Load Task
├── Reset Environment
├── Run Trial
├── Collect Trace / Outcome
├── Run Graders
└── Aggregate Results
~~~

它和 Agent Harness 不是同一个概念：

~~~text
Agent Harness
→ 让 Model 能够作为 Agent 运行

Evaluation Harness
→ 运行、观察、评分 Agent
~~~

### 【Evaluation Suite 组织一组具有共同目标的 Task】

Evaluation Suite 是为某类能力或行为组织的一组 Task。[[1]](https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents)

例如 Coding Agent 可以分别维护：

~~~text
Capability Suite
├── bug fix
├── feature implementation
├── refactor
└── repository exploration

Safety Suite
├── secret access
├── destructive command
└── permission boundary

Regression Suite
├── historical badcase 001
├── historical badcase 002
└── production failure 003
~~~

Anthropic 区分 Capability Eval 与 Regression Eval：前者用于探索 Agent 能做到什么以及提升空间，后者用于保护过去已经能稳定完成的能力，避免版本升级后退化。[[1]](https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents)

两者不是永远平行的集合。一个困难 Task 可以先进入 Capability Suite，用来推动能力提升；当 Agent 对这类 Task 已经能够稳定通过后，可以把它“毕业”到 Regression Suite，持续防止后续版本退化：

~~~text
New Difficult Task
  ↓
Capability Suite
  ↓
Agent / Prompt / Tool / Harness 改进
  ↓
多次 Trial 稳定通过
  ↓
Regression Suite
  ↓
持续回归保护
~~~

Anthropic 将这种从 capability eval 向 regression suite 的迁移作为长期维护 Eval 的重要方式。[[1]](https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents)

### 【Benchmark 是更稳定、可重复的比较基准】

行业并不存在唯一统一的 Benchmark 定义。本文把 Benchmark 作为一种工程组织方式理解：**固定 Task 集、环境、运行协议和评分规则，用于重复比较模型、Harness、Prompt、Tool 或版本变化。**

**下面的 Public / Domain / Regression 三类只是本文为了工程理解建立的组织模型，不是行业统一标准。** 它们分别强调“外部比较、内部领域能力、历史能力保护”三个目标。

可以分三层：

| 层级 | 作用 | 示例 |
| --- | --- | --- |
| Public Benchmark | 与外部公开任务和其他系统比较基础能力 | SWE-bench [[4]](https://www.swebench.com/)、GAIA [[5]](https://arxiv.org/abs/2311.12983) 等 |
| Domain Benchmark / Eval Suite | 用企业真实任务评估领域能力 | 客服退款、研发缺陷修复、运营诊断 |
| Regression Suite | 用历史失败和关键成功场景保护已获得能力 | Production Badcase、重大事故、关键权限场景 |

公共 Benchmark 可以提供外部可比性，但生产 Agent 最终仍需要 Domain Task 和 Regression Suite，因为企业自己的 Tool、环境、规则、权限和成功标准无法被公共数据集完整覆盖。

## 5. Agent 的非确定性要求通过多 Trial 区分能力上限与稳定性

### 【单次成功不能代表稳定能力】

Agent 每次运行可能选择不同 Tool、不同路径和不同中间决策，因此同一个 Task 可能出现：

~~~text
Trial 1 → Pass
Trial 2 → Pass
Trial 3 → Fail
Trial 4 → Pass
~~~

这时只报告“这个 Task 通过了”会隐藏稳定性问题。[[1]](https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents)

### 【pass@k 关注多次尝试中至少成功一次】

pass@k 适合回答：

> 给 Agent k 次机会，是否有能力至少找到一次正确解？

随着 k 增加，至少成功一次的机会通常会提高。它更适合“一次找到可用解即可”的任务，例如候选方案搜索、某些代码解题或探索型任务。[[1]](https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents)

### 【pass^k 关注连续多次都成功】

pass^k 适合回答：

> 同一个任务连续执行 k 次，是否每次都可靠成功？

如果把每次 Trial 的成功率简化为独立的 p，那么连续 k 次全部成功可以直观写成：

~~~text
pass^k ≈ p^k
~~~

例如单次成功率为 75%，连续三次都成功约为：

~~~text
0.75³ ≈ 42%
~~~

这类指标更适合客服、支付、权限操作等用户期望“每次都可靠”的场景。[[1]](https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents)

**pass@k 与 pass^k 回答的是两个不同问题，不应选一个作为所有 Agent 的统一指标。** 是否使用哪一个，要根据产品允许“多试几次找到一个答案”还是要求“每次都稳定成功”来决定。具体 Benchmark 的统计估计方式也可能不同，本文不把上述直观关系当成所有 Benchmark 的唯一计算实现。

## 6. Agent Eval 指标需要同时覆盖结果、稳定性、过程、成本和安全

### 【指标分层比堆叠单一总分更容易定位问题】

可以把 Agent Eval 指标分成五个技术维度，再把业务价值作为独立一层：

| 维度 | 典型指标 | 主要回答 |
| --- | --- | --- |
| Outcome / Capability | Task Success、Goal Completion、Correct Outcome | 任务能不能做对 |
| Reliability | Pass@1、pass@k、pass^k、Trial Variance、Crash / Recovery Rate | 是否稳定 |
| Trajectory Quality | Invalid Tool Call、Repeated Loop、Wrong Delegation、Policy Violation | 过程是否合理 |
| Efficiency | Token / Task、Model Calls、Tool Calls、Latency、Cost / Successful Task | 成本是否合理 |
| Safety | Unauthorized Action、Approval Bypass、Secret Leakage、Prompt Injection Success | 是否安全 |
| Business Value | Time Saving、Throughput、Coverage、Human Cost、Satisfaction | 上线后是否创造价值 |

一个 Agent 从 80% 成功率提升到 82%，如果 Cost / Successful Task 增加十倍，不一定是更好的生产方案。反过来，成本很低但 Outcome 不正确也没有价值。因此指标需要围绕具体产品目标一起看。

### 【Trajectory 指标用于解释为什么成功或失败】

最终 Outcome 相同的两次 Trial，过程质量可能完全不同：

~~~text
Trial A
→ 2 次 Tool Call
→ 正确完成

Trial B
→ 17 次重复查询
→ 3 次无效 Tool
→ 2 次 Retry
→ 最终也完成
~~~

Outcome 都是 Pass，但 Trial B 的成本、稳定性和未来失败风险更高。Trace 可以提供这类过程证据，但是否算“好”仍需要 Grader 或指标规则判断。

## 7. Agent Eval 应进入持续开发与回归闭环

### 【Success Criteria 应在开发前定义，而不是失败后倒推】

Agent Eval 与软件工程中的验证前置有相同思想：先定义“什么算正确”，再实现和评测。

~~~text
Agent Goal
  ↓
Success Criteria
  ↓
Task / Eval Case
  ↓
Trial
  ↓
Trace + Outcome + Evidence
  ↓
Grader
  ↓
Pass / Fail / Score
  ↓
Regression Suite
~~~

这与 [《项目工程化设计》](./项目工程化设计.md) 中：

~~~text
Requirement
→ Acceptance Criteria
→ Test Case
→ Actual Result
→ Evidence
→ Pass / Fail
~~~

存在明确对应关系，但两者评测对象不同：

| 软件工程验收 | Agent Eval |
| --- | --- |
| 证明软件产物是否满足 Requirement | 证明 Agent / Harness 是否能稳定完成 Task |
| Test Case 针对产品功能 | Eval Task 针对 Agent 行为与环境 Outcome |
| Unit / Integration / E2E 可作为证据 | Test Result 也可以成为 Agent Grader 的输入 |
| 一次确定性测试通常有稳定结果 | 同一 Agent Task 往往需要多个 Trial |

因此 AI Coding 场景可以复用 Requirement / Acceptance Criteria / Test Case 作为 Outcome Grader 的重要输入，但**不能把软件 Test Case 直接等同于完整的 Agent Eval Task**。Agent Eval 还需要明确 Initial Repository State、Allowed Tools、Permissions、Environment Reset、Trial Count、时间 / Token Budget 以及 Agent-level Safety Constraints，再评测 Agent 是否能够稳定、安全、低成本地产生正确的软件交付。

### 【Eval 自身也需要验证，失败不能直接归因给 Agent】

Eval Result 不是天然正确的测量结果。一次失败可能来自 Agent，也可能来自 Task、Grader、Environment 或 Evaluation Harness 本身。

~~~text
Eval Failure
  ↓
Failure Analysis
  ├── Agent Failure
  ├── Task Ambiguity
  ├── Grader Error
  ├── Environment Instability
  └── Harness / Infrastructure Problem
  ↓
确认归因
  ↓
Agent Fix / Eval Fix
~~~

因此当某个 Task 在大量 Trial 中持续失败时，不应该立即得出“Agent 没有能力”的结论。Anthropic 特别指出，如果前沿模型在大量 Trial 中仍然是 0% 成功，通常应先重新检查 Task 规范和 Grader；Reference Solution 也用于验证这把“尺子”本身是否可用。[[1]](https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents)

Eval Validation 至少可以包含：

- **Reference Solution**：证明 Task 可解、关键 Grader 可以通过；
- **Transcript Review**：人工抽查 Trial，确认失败归因是否公平；
- **Grader Calibration**：对 Model-based Grader 与人工判断做一致性检查；
- **Environment Validation**：确认环境初始化、依赖、权限和资源状态稳定；
- **Dataset Review**：检查 Task 是否过度单一、失衡或已经饱和。

Anthropic 建议持续阅读失败 Trial 的 Transcript，因为它能区分“Agent 真正做错”与“Grader 拒绝了合法方案”。Capability Eval 接近 100% 后也会逐渐失去继续衡量能力增长的信号，需要增加更困难的 Task 或将已稳定任务迁入 Regression Suite。[[1]](https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents)

### 【生产失败应该沉淀为 Regression Case】

一个可持续 Eval 体系应该形成：

~~~text
Production Failure
  ↓
Root Cause
  ↓
New Eval Task
  ↓
Regression Suite
  ↓
Next Version
  ↓
Re-run
~~~

这样 Eval 不只是上线前的一次考试，而是持续积累系统真实失败经验。

## 8. 项目中的 Agent Benchmark 调研属于实践映射而不是已实现 Eval 系统

### 【仓库项目材料能够确认的是调研和方法总结】

仓库的 [转正答辩材料](../转正答辩/实习生转正答辩.md) 能确认两项相关实践：

1. 调研企业 Agent 的任务评分问题，并整理《企业 Agent 任务评分思路》；
2. 调研 Agent Benchmark 的成本来源和可行降本方向，并形成《Agent 评测如何降低 Benchmark 运行成本》报告。

相关可视化材料还记录了“保存输出、Trace 与终态以支持增量运行和重新评分”“正式发布或重大变更仍运行 Full Benchmark”“高风险、低置信度或评分冲突进入人工复核”等方法边界。[Benchmark 降本调研图](../转正答辩/assets/team-contribution/03-benchmark-cost-reduction-summary.svg)

这些内容可以映射到本章：

~~~text
运行成本
→ 控制 Task / Trial 范围

评分成本
→ 优先确定性 Grader
→ 必要时 Model / Human

重复执行成本
→ 保存 Trace / Outcome
→ 支持重新评分

发布风险
→ 增量 Eval + Full Benchmark 边界
~~~

### 【当前证据不能证明已经实现 Evaluation Harness】

上述内容属于**项目调研和方法总结**。当前 Full-Stack-AI-NOTES/source/ 中没有能够证明已经实现完整 Evaluation Harness、自动增量 Benchmark Runner 或统一 Grader Runtime 的对应源码，因此不能把这些方法写成已经落地的系统能力。

如果未来真正实现 Eval Harness，应再补：

~~~text
Task Schema
Trial Runner
Environment Reset
Trace Collector
Grader Runtime
Result Aggregator
Regression Store
~~~

并用 source/ 中的可运行实现和测试作为证据。

## 9. 参考文献

[1] ANTHROPIC. [Demystifying evals for AI agents](https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents)[EB/OL]. 2026-01-09[2026-09-30].

[2] OPENAI. [Tracing - OpenAI Agents SDK](https://openai.github.io/openai-agents-python/tracing/)[EB/OL]. [2026-09-30].

[3] OPENAI. [Testing - OpenAI Agents SDK](https://openai.github.io/openai-agents-python/testing/)[EB/OL]. [2026-09-30].

[4] SWE-BENCH. [SWE-bench](https://www.swebench.com/)[EB/OL]. [2026-09-30].

[5] MIALON, Grégoire; FOURRIER, Clémentine; SWIFT, Craig; WOLF, Thomas; LECUN, Yann; SCIALOM, Thomas. [GAIA: a benchmark for General AI Assistants](https://arxiv.org/abs/2311.12983)[EB/OL]. 2023-11-21[2026-09-30].

[6] OPENAI. [Evaluate agent workflows](https://developers.openai.com/api/docs/guides/agent-evals)[EB/OL]. [2026-09-30].
