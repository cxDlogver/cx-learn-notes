# Agent 评测通过五层设计框架形成可重复的 Benchmark

## 【知识概述】

Agent Benchmark 不能只回答“最终答案对不对”，因为 Agent Task 是一个多轮自主执行过程。设计评测体系时，需要先把五个不同层次分开：

~~~text
评测目标
→ 什么叫成功

评测角度
→ 从哪里取得证据

评测方法
→ 用什么机制判断

评测指标
→ 怎样量化结果

评测维度
→ 这些数字说明哪类 Agent 能力
~~~

与之平行的 Evaluation Harness、Dataset、Suite、Task、Trial、Grader 等概念属于**评测运行体系**，负责把五层设计真正执行起来，不应该和五层设计概念混成同一组层级。

这套五层是本知识库为了统一 Agent Eval 概念建立的工程框架，不是行业官方固定分类。Anthropic、OpenAI 的官方资料用于校准 Task、Trial、Outcome、Trace、Grader、Harness 等具体概念。[[1]](https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents) [[2]](https://developers.openai.com/api/docs/guides/agent-evals)

## 【提问】

- 如果让你设计一套 Agent Benchmark，你会从哪些层次考虑？
- 一个 Agent Task 到底怎样定义“成功”？
- 为什么不能只看最终回答，也不能只看 Trace？
- Rubric、Grader、Metric 和 Evaluation Dimension 分别是什么？
- 为什么 Agent Benchmark 不能只看任务完成率？
- 怎样在保证评测质量的同时控制 Benchmark 成本？

## 【回答框架】

核心主线：

~~~text
1. 评测目标
Task + Success Criteria
Exact Criteria / Rubric

        ↓

2. 评测角度
结果面：Outcome / Output
过程面：Trajectory / Trace

        ↓

3. 评测方法
Deterministic
Model-based
Human Review

        ↓

4. 评测指标
Success Rate
Rubric Score
pass@k / pass^k
Cost / Latency
Safety Metrics

        ↓

5. 评测维度
Effectiveness
Reliability
Efficiency
Safety
~~~

运行时再由：

~~~text
Dataset / Suite
→ Evaluation Harness
→ Task
→ Trial
→ Evidence
→ Grader
→ Aggregate
→ Benchmark
~~~

把它真正执行起来。

---

## 【完整回答】

如果让我设计一套 Agent Benchmark，我首先会把它看成**完整任务执行评测**，而不是单轮模型输出评分。

Agent 接收任务以后，可能经过多轮推理、Tool Call、环境修改、重试和恢复才完成目标，因此评测需要从五个层次依次设计。

### 【第一层：评测目标——先定义什么叫成功】

第一层是 Task 的 Success Criteria。

简单任务可能存在明确 Ground Truth：

~~~text
结果 == 42
数据库状态 == refunded
测试全部通过
~~~

这时可以直接定义精确成功条件。

开放任务没有唯一答案，例如研究报告、技术方案、客服回复，需要通过 Rubric 把成功拆成多个 Criterion：

~~~text
正确性
完整性
证据质量
需求覆盖
表达质量
~~~

这里最重要的边界是：

> **Rubric 解决“要判断哪些标准”，不是“由谁来判断”。**

Rubric 中的某个 Criterion 后续可以由程序、模型或人工执行。

因此第一层统一成：

~~~text
Task
→ Success Criteria
   ├─ Exact / Verifiable Criteria
   └─ Rubric Criteria
~~~

### 【第二层：评测角度——从结果和过程两个方向获取证据】

Agent 结束以后，不能相信它自己说“任务完成”。

结果面首先看 Outcome：

~~~text
真实环境最终是否达到目标状态
~~~

如果任务本身是内容生成，则 Output 也是直接评测对象。

过程面看 Trajectory / Trace：

~~~text
用了什么 Tool
经过什么 Handoff
是否 Retry
是否经过审批
为什么失败
~~~

所以：

~~~text
Outcome / Output
→ 主要证明“最后做对了吗”

Trace
→ 主要说明“怎么做的、为什么成功或失败”
~~~

只有当审批、权限、禁止 Tool 等执行过程本身就是 Task Constraint 时，Trace 才直接成为硬性评分对象。

因此 Outcome 和 Trace 不应该拆成两个体系层，它们都属于“评测角度”。

### 【第三层：评测方法——根据证据选择合适的 Grader】

拿到证据以后，再选择评分方式：

~~~text
能够客观判断
→ Deterministic / Code-based Grader

无法代码化但有明确 Rubric
→ Model-based Grader

高风险 / 高歧义 / Judge 校准
→ Human Review
~~~

原则是：

> **能够确定性评分的部分，不要优先再交给模型评分。**

原因不仅是稳定性，还有评测成本。

对于开放任务，也可以提前构造 Verifier，把一部分 Rubric 转成脚本可验证条件。

例如研究报告：

~~~text
是否存在指定章节
是否达到引用数量
是否包含一手来源
Claim 是否绑定 Citation
格式是否满足 Schema
~~~

这些都可以确定性检查；剩余的“分析是否合理”等开放判断再交给 Model / Human。

因此开放 Task 不等于必须全部 LLM-as-Judge。

### 【第四层：评测指标——通过多 Trial 量化实际表现】

一次 Trial 成功不能代表 Agent 稳定。

同一个 Task 可能：

~~~text
Trial 1 → Pass
Trial 2 → Fail
Trial 3 → Pass
~~~

因此指标至少包括：

~~~text
Success Rate
Rubric Score
Criterion Pass Rate
Failure Rate
~~~

以及稳定性相关：

~~~text
pass@1
pass@k
pass^k
Variance
Retry Rate
Recovery Rate
~~~

其中：

~~~text
pass@k
→ k 次尝试至少成功一次
→ 更偏能力上限 / 探索能力

pass^k
→ k 次全部成功
→ 更偏一致性 / 可靠性
~~~

另外还要记录：

~~~text
Latency
Turns
Tool Calls
Tokens
Cost per Task
Cost per Successful Task
Policy Violation Rate
~~~

Metric 只是具体数字。

所以需要明确：

~~~text
pass^k
→ 指标

Reliability
→ 维度

Cost
→ 指标

Efficiency
→ 维度
~~~

### 【第五层：评测维度——从不同能力方向理解指标】

最后才把指标组织成 Agent 能力维度：

| 维度 | 核心问题 | 典型指标 |
| --- | --- | --- |
| Effectiveness | 能不能做对 | Success Rate、Rubric Score |
| Reliability | 能不能稳定做对 | pass^k、Variance、Failure / Retry Rate |
| Efficiency | 做对需要多少资源 | Latency、Turns、Token、Cost |
| Safety | 是否在允许边界内完成 | Violation、Unauthorized Action、Approval Bypass |

这里不再把 Outcome、Trajectory 和 Reliability 并列：

~~~text
Outcome / Trajectory
→ 评测角度

Reliability / Efficiency / Safety
→ 评测维度
~~~

Trajectory 中产生的指标会根据业务意义映射到不同维度。例如重复 Loop 更偏 Efficiency / Reliability，Approval Bypass 属于 Safety。

### 【五层设计之外，还需要 Evaluation Harness 把评测跑起来】

五层回答的是“怎么设计评测”。

运行层负责：

~~~text
Dataset
→ 保存 Task Portfolio

Evaluation Suite
→ 按本轮目标选择 Task

Evaluation Harness
→ 初始化环境并运行 Trial

Trial
→ Agent 执行一次完整任务

Evidence
→ Outcome / Output / Trace

Grader
→ 执行具体评分

Metrics Aggregation
→ 汇总多 Trial 指标

Benchmark
→ 固定协议后做版本比较
~~~

所以 Task / Trial / Grader / Harness 不是第六、第七层评测维度，而是运行这套设计的工程对象。

### 【评测成本要同时在方法和指标层治理】

Benchmark 成本主要来自：

~~~text
运行多少 Task
每个 Task 跑多少 Trial
使用什么模型
Tool / 环境执行成本
Model Grader 调用
Human Review
~~~

因此降本可以沿两个方向：

第一，评分方法降本：

~~~text
能脚本评分
→ 不使用 Model Judge

能 Model Judge 稳定评分
→ 不把全部样本交给人工

人工
→ 重点用于高风险、低置信和校准
~~~

第二，运行范围降本：

~~~text
日常变更
→ Incremental / Regression Eval

重大模型、Prompt、Harness 变化
→ 扩大评测范围

正式发布 / 高风险变化
→ Full Benchmark
~~~

但任何降本都不能改变评测协议到失去可比性。

---

## 【项目实践映射】

当前仓库能够确认的 ByteDance 实习实践是：

1. 调研企业 Agent 任务评分，并整理《企业 Agent 任务评分思路》；
2. 调研 Agent Benchmark 的成本来源和降本方向，并形成《Agent 评测如何降低 Benchmark 运行成本》。

项目材料见 [陈相实习生转正答辩](../../bytedance/陈相实习生转正答辩.md)。

因此项目职责应表述为：

> **参与 Agent Benchmark 评测调研，围绕任务评分与评测成本梳理方法框架，为团队后续 Agent 评测体系建设提供参考。**

当前仓库没有证据证明已经独立实现完整 Evaluation Harness，因此不能扩大成“搭建完整 Benchmark 平台”。

---

## 【与相邻知识的关系】

- [Agent Eval 与 Benchmark](../A-Agent-Eval与Benchmark.md)：完整五层框架、运行体系、Dataset / Suite / Benchmark 和 Eval Validation。
- [Agent 可观测体系通过 Trace、Span、指标与审计解释执行过程](./Agent%20可观测体系通过%20Trace、Span、指标与审计解释执行过程.md)：解释 Trace 怎样产生运行证据，但 Trace 本身不等于 Eval。
- [Agent 通过结构化状态与确定性检查降低自然语言约束的不确定性](./Agent%20通过结构化状态与确定性检查降低自然语言约束的不确定性.md)：解释为什么能够客观判断的 Criterion 应尽量转成确定性检查。
- [AI Coding 如何保证 Agent 验收结论可信](../../bytedance/docs/AI-Coding如何保证Agent验收结论可信.md)：一次真实软件交付中的 Evidence / Gate 实践，不等于完整 Agent Benchmark。

---

## 【一句话总结】

> **Agent Benchmark 的设计可以统一成五层：先定义任务成功目标，再从 Outcome / Output 与 Trace 获取证据，选择确定性、模型或人工评分方法，通过多 Trial 指标量化表现，最后从 Effectiveness、Reliability、Efficiency、Safety 四个维度判断 Agent；Evaluation Harness 则负责把 Dataset、Task、Trial、Evidence、Grader 和指标聚合稳定地运行起来。**

---

## 【参考资料】

[1] Anthropic. [Demystifying evals for AI agents](https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents)[EB/OL]. 2026-01-09。

[2] OpenAI. [Evaluate agent workflows](https://developers.openai.com/api/docs/guides/agent-evals)[EB/OL]. 核验日期：2026-10-07。

[3] OpenAI. [Evaluation best practices](https://developers.openai.com/api/docs/guides/evaluation-best-practices)[EB/OL]. 核验日期：2026-10-07。

[4] OpenAI. [Graders](https://developers.openai.com/api/docs/guides/graders)[EB/OL]. 核验日期：2026-10-07。
