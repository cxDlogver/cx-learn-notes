# Agent 评测通过任务、执行证据与评分器形成质量闭环

## 回答要点

完整的 Agent Eval 应围绕“**如何独立证明 Agent 完成了任务，并把这种能力稳定地量化和比较**”构建，而不是从某一个分数或 LLM Judge 开始。

1. **Task 与 Success Criteria 定义什么叫成功。** 任务需要提前明确目标、环境、约束和可验证结果，否则后续评分缺少稳定标准。
2. **Trial 表示一次真实执行样本。** Agent 具有非确定性，同一 Task 要通过多次 Trial 才能观察完成能力与稳定性。
3. **Evidence 证明 Trial 实际发生了什么。** Final Output 证明模型说了什么；Outcome 检查真实环境结果；Trajectory / Trace 记录执行过程；Cost、Latency 等补充效率证据。
4. **Grader 根据证据做单次判断。** 可确定条件优先 Code Grader；开放质量使用带 Rubric 的 Model Grader；高风险、争议场景再引入 Human Review。
5. **Rubric 把复杂质量拆成可检查标准。** 正确性、完整性、安全性、过程约束等可以分别判断，并区分必须通过的 Hard Gate 与可加权质量项。
6. **Metric 把大量 Trial 聚合成系统能力。** Success Rate、pass@k、pass^k 分别观察总体成功、探索成功和连续稳定性，同时结合 Cost、Latency、Safety 等指标。
7. **Suite / Benchmark 固定比较条件。** 固定任务集、环境、预算、评分规则和聚合口径后，不同模型、Prompt、Tool 或 Agent 版本才具有可比性。
8. **Regression 把 Eval 变成研发闭环。** 线上失败和新风险持续回流评测集，每次系统变更后重新执行，判断能力提升和回归。
9. **Trace 与 Eval 必须区分。** Trace 提供“发生了什么”的证据，Eval 判断“是否达到目标”；可观测性是评测输入之一，不等于评测本身。

```text
Task + Success Criteria → Trial → Evidence
→ Grader + Rubric → Metrics
→ Eval Suite / Benchmark → Regression
```
## 1. 评测以真实任务结果和执行证据为对象

### 【核心判断：Agent 的自我报告不能作为任务完成证明】

Agent 与传统确定性程序不同，它会根据当前 Context、Tool Result 和环境反馈动态决定下一步动作，因此同一个 Task 重复执行多次，可能得到不同结果。

例如：

```text
Task A

Trial 1 → Success
Trial 2 → Failure
Trial 3 → Success
Trial 4 → Agent 错误地认为自己已经完成
```

因此：

> **Agent 最终输出“任务已经完成”，只能被视为一次模型输出，不能直接作为任务真正完成的证据。**

Anthropic 在 Agent Eval 中也专门区分了 `Transcript / Trajectory（执行轨迹）` 与 `Outcome（最终环境状态）`：一个 Agent 可以声称某项操作已经完成，但真正的验收仍然应该检查任务执行之后真实环境是否达到了目标状态。[[1]](https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents)

所以，一个生产级 Agent 的评测体系应该建立在独立 Evidence（证据）之上，而不是依赖模型自己的判断：

```text
Task
 ↓
Agent Execution
 ↓
Outcome / Output / Trajectory
 ↓
Independent Evaluation
 ↓
判断任务是否真正完成
```

### 【评测对象：Outcome、Output 与 Trajectory】

Agent 不仅会生成文本，还可能调用 Tool、修改文件、更新数据库和改变外部环境，因此评测对象不能只看 Final Answer。

#### <u>1. Outcome：最终环境结果</u>

Outcome 关注：

> **任务执行结束以后，真实环境是否已经达到目标状态。**

例如任务是：

```text
把订单状态修改为 refunded
```

真正应该验收的是：

```text
database.order.status == "refunded"
```

而不是 Agent 最后回答：

```text
“退款已经完成。”
```

Coding Agent 也是一样。任务是“修复登录 Bug”时，更有价值的 Evidence 是：

```text
代码是否真正修改
+
对应测试是否通过
+
原有功能是否发生回归
```

因此，只要任务存在可观察的环境状态，**Outcome 通常应该作为最主要的验收依据。** Anthropic 当前也强调，Agent Eval 应尽量评价实际 Outcome，而不是过度强制某一条固定执行路径，因为 Agent 可能通过不同但同样有效的路径完成任务。[[1]](https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents)

#### <u>2. Output：最终交付结果</u>

有些 Agent 的任务本身就是生成内容，例如：

```text
Research Agent → 研究报告
Analysis Agent → 分析结论
Customer Service Agent → 用户回复
```

这时 Final Output 本身就是需要验收的 Artifact，可以评价：

```text
Correctness
Completeness
Groundedness
Instruction Following
Format
Overall Quality
```

因此不能简单地说 Final Answer 不应该评，而应该区分：

> **如果任务存在可验证的外部状态，应优先评价 Outcome；如果 Final Output 本身就是任务产物，则 Output 本身必须作为独立评测对象。**

LangSmith 当前也将 Final Response、Single Step 和整个 Agent Trajectory 区分为不同的 Agent 评测对象。[[2]](https://docs.langchain.com/langsmith/evaluation-approaches)

#### <u>3. Trajectory：执行轨迹</u>

Trajectory / Transcript 记录 Agent 执行过程中发生的事情，例如：

```text
Model Call
Tool Call
Tool Arguments
Tool Result
State Change
Handoff
Intermediate Output
```

Trajectory 最主要有两个作用。

第一，用于 **Failure Analysis（失败分析）**。如果最终 Outcome 失败，可以沿执行轨迹定位问题到底发生在哪一步：

```text
错误检索文件
 ↓
得到错误信息
 ↓
模型做出错误判断
 ↓
调用错误 Tool
 ↓
最终任务失败
```

第二，在安全、合规或强流程约束场景中，**执行过程本身也是验收条件**。例如：

```text
退款前必须 verify_identity
生产部署必须经过 Approval
禁止调用某类 Tool
禁止读取敏感文件
```

即使最终 Outcome 正确，如果 Agent 绕过了必要流程，也不能认为任务合格。

LangChain 当前的 Trajectory Evaluation 也支持对 Tool 序列进行 `strict`、`unordered`、`subset`、`superset` 等确定性匹配，也可以使用 LLM-as-Judge 对整个执行轨迹进行语义评价。[[3]](https://docs.langchain.com/langsmith/trajectory-evals)

因此可以形成一个比较稳定的判断：

> **Outcome / Output 主要回答“任务最后做对了吗”；Trajectory 主要回答“任务是怎么完成的、为什么失败”，而在安全、合规和强流程约束场景中，Trajectory 本身也会成为硬性验收对象。**

## 2. 评分器与 Rubric 共同定义任务验收方式

### 【评测方式：Code-based、Model-based 与 Human Review】

确定评测对象以后，需要进一步决定使用什么 Grader（评分器）进行判断。

#### <u>1. Code-based Grader：确定性评分</u>

只要能够通过程序明确判断，就应该优先使用确定性方式，例如：

```text
Exact Match
Regex
Unit Test
Integration Test
Static Analysis
Database State Check
File State Check
Threshold Check
Tool Call Check
```

例如：

```python
assert result == 42
```

或者：

```python
assert order.status == "refunded"
```

这种方式的特点是：

```text
确定
快速
成本低
可重复
容易定位问题
```

Anthropic 当前把 Code-based、Model-based 和 Human 作为 Agent Grader 的三种主要形式，并强调确定性 Grader 在适用场景下通常具有稳定、低成本和易调试的优势。[[1]](https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents)

因此可以形成一个基本原则：

> **能够通过确定性规则客观判断的问题，不应该优先交给另一个模型判断。**

#### <u>2. Model-based Grader：模型评分</u>

很多任务没有唯一确定答案，例如：

```text
研究报告是否完整？
方案是否合理？
回答是否真正解决用户问题？
客服回复是否清晰并符合语气要求？
```

这类任务无法通过一个固定 `expected_answer` 判断，因此需要使用：

```text
LLM-as-Judge
Rubric-based Evaluation
Reference-based Evaluation
Pairwise Comparison
```

Model Grader 主要用于：

> **评价无法通过确定性代码直接判断的语义质量。**

但 Model Grader 本身同样具有不确定性，所以不能把它理解成绝对 Ground Truth。实际使用时需要通过清晰 Rubric、标准样本和人工校准来提高评分一致性。[[1]](https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents)

#### <u>3. Human Review：人工评审</u>

人工主要用于：

```text
高风险任务
高歧义任务
强主观判断
Model Judge 低置信结果
Model Grader 校准
生产抽样审计
```

因此整个评测方式可以收敛成：

```text
能够确定性判断
→ Code-based Grader

无法确定性判断但可语义评估
→ Model-based Grader

高风险 / 高歧义 / Judge 校准
→ Human Review
```

核心原则是：

> **尽可能提高确定性评测比例，模型评分负责补足开放问题，人工主要承担高风险判断和评测校准。**

### 【Rubric：用明确维度定义复杂任务验收标准】

Grader 解决的是：

> **怎么判断。**

Rubric 解决的是：

> **具体要判断哪些标准。**

简单任务可能只需要一个条件，例如：

```text
1 + 1
Expected = 2
```

但复杂 Agent Task 很难用一个 Boolean 条件完整描述。

例如一个 Research Agent：

```text
Task:
分析某行业的发展趋势并给出建议
```

可以拆成：

```text
Rubric

Criterion 1
关键事实正确

Criterion 2
关键结论有可靠来源

Criterion 3
覆盖指定分析维度

Criterion 4
没有明显事实冲突

Criterion 5
最终建议与证据一致
```

因此：

```text
Task
 ↓
Rubric
 ├─ Criterion A
 ├─ Criterion B
 ├─ Criterion C
 └─ Criterion D
```

不同 Criterion 还可以使用不同 Grader：

```text
事实是否正确
→ Code / Reference Check

来源是否存在
→ Code

分析是否合理
→ Model Grader

高风险判断是否合规
→ Human
```

#### <u>1. Hard Gate</u>

某些条件必须全部通过：

```text
Functionality = PASS
AND
Security = PASS
AND
No Data Leakage = PASS
```

只要其中一项失败：

```text
Overall = FAIL
```

这种方式特别适合：

```text
安全
权限
合规
核心功能
关键业务约束
```

#### <u>2. Weighted Score</u>

一些质量标准可以通过加权聚合：

```text
Correctness       40%
Completeness      25%
Evidence Quality  20%
Clarity           15%
```

最终：

```text
Overall Score
=
Σ Weight_i × Score_i
```

#### <u>3. Hybrid</u>

真实业务通常更适合：

```text
Hard Gate
+
Weighted Score
```

例如：

```text
Security = PASS
AND
Compliance = PASS
AND
Quality Score >= 80
```

这可以避免出现：

```text
安全 = 0
内容质量 = 100
```

最后通过平均分仍然判定合格的问题。

所以 Rubric 设计的原则应该是：

> **高风险和不可妥协的要求通过 Hard Gate 控制，一般质量要求再通过 Weighted Score 聚合。**

## 3. 多次试验、指标与回归套件形成质量闭环

### 【Metrics：把多次 Trial 转换为可比较的结果】

Agent 的概率性意味着一次运行不能代表真实能力。Anthropic 将一个测试问题称为 `Task`，同一个 Task 的一次实际执行称为 `Trial`，并建议对同一任务进行多次 Trial，以获得更可靠的评测结果。[[1]](https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents)

例如：

```text
Task A

Trial 1 → Pass
Trial 2 → Pass
Trial 3 → Fail
Trial 4 → Pass
Trial 5 → Pass
```

常见指标可以按用途简单整理为几组。

#### <u>1. 任务成功与质量指标</u>

```text
Trial Success Rate
固定评测协议下通过的 Trial 数 / 总 Trial 数

Task Success Rate
按明确的任务通过规则统计成功 Task 数 / 总 Task 数
任务通过规则需声明：单次通过、k 次至少一次通过，或 k 次全部通过

Average Rubric Score
平均 Rubric 得分

Median Score
中位得分

Criterion Pass Rate
某一 Criterion 的通过率

Failure Rate
失败任务比例
```

跨 Task 聚合时还要说明口径：先求各 Task 成功率再平均是宏平均，汇总所有 Trial 再计算是微平均；两者在每题 Trial 数不同时可能产生不同结果。

这些指标主要回答：

> **Agent 完成任务的整体效果怎么样。**

#### <u>2. 稳定性与重复运行指标</u>

`pass@1` 表示单次运行直接成功的能力。

`pass@k` 表示：

> **同一个 Task 运行 k 次，只要至少一次成功，就算成功。**

它更适合允许多次探索、生成多个候选或多次尝试的问题，反映的是：

> **给 Agent 多次机会，它是否有能力最终找到正确解。**

`pass^k` 表示：

> **同一个 Task 连续运行 k 次，全部成功。**

它更加关注 `Consistency / Reliability（稳定性 / 可靠性）`。

例如，在各次 Trial 相互独立且每次成功率均为 90% 的假设下，连续 5 次全部成功的概率只有：

```text
0.9^5 ≈ 59%
```

因此：

```text
一次成功率较高
≠
能够长期稳定重复成功
```

除了这三个指标，还可以关注：

```text
Score Variance
多次 Trial 得分波动

Retry Rate
需要 Retry 的比例

Recovery Rate
失败后成功恢复比例

Escalation Rate
升级人工比例

Timeout Rate
超时比例

Tool Failure Rate
Tool 调用失败比例
```

#### <u>3. 效率和成本指标</u>

Agent 即使成功，也可能运行效率很低，因此还需要记录：

```text
Latency
P50 / P95 Latency
Number of Turns
Tool Calls
Input Tokens
Output Tokens
Total Tokens
Cost per Task
Cost per Successful Task
```

其中 `Cost per Successful Task` 往往比单纯的平均 Cost 更能体现真实效率，因为失败任务同样消耗资源。

#### <u>4. 安全与治理指标</u>

还可以持续统计：

```text
Policy Violation Rate
Unauthorized Tool Call Rate
Approval Bypass Rate
Sensitive Data Exposure Rate
Unsafe Action Rate
Human Intervention Rate
Guardrail Trigger Rate
```

这些指标通常不仅用于离线 Eval，也适合生产环境持续监控。

### 【Agent 的综合评价维度】

Agent 的最终能力不能只用一个 Task Success Rate 表示。

更适合至少从下面四个维度综合判断：

| 维度 | 核心问题 | 常见指标 |
|---|---|---|
| Effectiveness | Agent 能不能把事情做对 | Success Rate、Rubric Score、Criterion Pass Rate |
| Reliability | Agent 能不能持续稳定做对 | pass^k、Variance、Failure Rate、Retry Rate |
| Efficiency | 完成任务需要多少资源 | Latency、Turns、Tokens、Cost |
| Safety | 是否在允许的边界内完成 | Violation Rate、Unsafe Action、Approval Bypass |

需要进一步区分：

```text
Agent Technical Evaluation
```

和：

```text
Business Value Evaluation
```

例如一个 Agent 的 Success Rate 很高，但如果：

```text
Cost per Task > Human Cost per Task
```

同时没有显著提升：

```text
速度
规模
质量
覆盖率
```

那么它虽然技术指标不错，业务价值仍然可能不足。

因此：

> **Agent Eval 判断 Agent 是否具备可用能力；业务评估则进一步判断这种能力是否值得部署。**

### 【Evaluation Suite 与持续质量闭环】

把前面的概念组合起来，一个完整 Evaluation Suite 可以表示为：

```text
Evaluation Suite
│
├─ Task 1
├─ Task 2
├─ Task 3
└─ ...
      ↓
每个 Task
      ↓
多次 Trial
      ↓
运行 Agent
      ↓
收集 Evidence
│
├─ Outcome
├─ Output
└─ Trajectory
      ↓
Rubric
│
├─ Criterion A
├─ Criterion B
└─ Criterion C
      ↓
Graders
│
├─ Code
├─ Model
└─ Human
      ↓
Rubric Aggregation
│
├─ Hard Gate
├─ Weighted Score
└─ Hybrid
      ↓
Metrics
│
├─ Success Rate
├─ Rubric Score
├─ pass@1 / pass@k / pass^k
├─ Failure / Retry / Variance
├─ Latency / Cost
└─ Safety Metrics
      ↓
Agent Evaluation
│
├─ Effectiveness
├─ Reliability
├─ Efficiency
└─ Safety
```

Anthropic 当前对 Agent Eval 的基本组成也包括 `Task`、`Trial`、`Grader`、`Transcript`、`Outcome` 和完整 Evaluation Harness。[[1]](https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents)

同时，评测不能只发生在上线之前。

LangSmith 当前将 Evaluation 分成 Offline Evaluation 和 Online Evaluation：上线前通过 Dataset 对不同 Agent 版本进行 Benchmark、Regression 和对比；上线后则在真实生产 Trace 上持续运行 Evaluator，发现质量、安全和异常问题，并把失败样本重新加入离线 Dataset。[[4]](https://docs.langchain.com/langsmith/evaluation)

最终形成：

```text
Define Criteria
      ↓
Offline Evaluation
      ↓
Deploy
      ↓
Production Trace / Feedback
      ↓
发现 Failure
      ↓
转成新的 Eval Task
      ↓
加入 Evaluation Suite
      ↓
修改 Model / Prompt / Context / Tool / Harness / Workflow
      ↓
Regression Eval
      ↓
再次 Deploy
      ↺
```

因此 Eval 的价值不是得到一个静态分数，而是：

> **持续发现 Agent 的 Failure Mode，并保证后续 Model、Prompt、Context、Tool、Harness 或 Workflow 的变化不会让已有能力发生回退。**

**一句话总结**

> **Agent 评测体系的核心，是把“任务是否完成”从模型的自我判断中独立出来：先明确可验证的 Outcome、Output 和必要的执行轨迹，再通过 Rubric 将复杂任务拆成可验收标准，并根据标准选择确定性代码、模型评分或人工审查；随后通过多次 Trial 计算成功率、Rubric Score、pass@k、pass^k、失败率、成本、性能和安全等指标，从 Effectiveness、Reliability、Efficiency 和 Safety 多个维度判断 Agent 的真实能力，并将线上 Failure 持续回流 Evaluation Suite，形成长期质量闭环。**

## 4. 参考文献

[1] Anthropic. [Demystifying evals for AI agents](<https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents>)[EB/OL]. 核验日期：2026-10-04。

[2] LangChain. [Application-specific evaluation approaches](<https://docs.langchain.com/langsmith/evaluation-approaches>)[EB/OL]. 核验日期：2026-10-04。

[3] LangChain. [How to evaluate your agent with trajectory evaluations](<https://docs.langchain.com/langsmith/trajectory-evals>)[EB/OL]. 核验日期：2026-10-04。

[4] LangChain. [LangSmith Evaluation](<https://docs.langchain.com/langsmith/evaluation>)[EB/OL]. 核验日期：2026-10-04。
