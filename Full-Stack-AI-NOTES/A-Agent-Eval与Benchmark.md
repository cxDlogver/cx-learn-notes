# Agent Eval 与 Benchmark

Agent Eval（Agent 评测）以完整任务执行为对象，评测设计规定成功标准、证据、评分与指标；评测运行则负责在可比较的环境中重复执行、收集证据和汇总结果。

## 1. Agent 评测的对象与总体框架

Agent Eval（Agent 评测）解决的核心问题不是“模型最后回答得像不像正确答案”，而是：

> **在给定任务、环境和约束下，Agent 能否稳定、有效、安全，并以可接受的成本完成真实任务。**

Agent 与单轮 LLM 不同。一次 Agent Task 往往包含多轮 Model Call、Tool Call、环境状态变化、重试、Handoff、审批与恢复，因此评测对象是一次完整任务执行，而不是某一次模型调用。Anthropic 将 Task、Trial、Grader、Transcript / Trace、Outcome、Evaluation Harness 与 Evaluation Suite 作为 Agent Eval 的基本运行对象；OpenAI 也以 Trace、Grader、Dataset 和 Eval Run 组织 Agent 工作流评测。[[1]](https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents) [[2]](https://developers.openai.com/api/docs/guides/agent-evals)

为了避免把“评什么”“怎么跑”“怎么算”混在一起，本文使用两套互补框架：

~~~text
一、评测设计体系
回答：一套 Agent Benchmark 应该怎样设计？

评测目标
→ 评测角度
→ 评测方法
→ 评测指标
→ 评测维度


二、评测运行体系
回答：这套评测怎样真正运行起来？

任务集：选择有明确成功条件的测试任务
→ 评测执行器：为每次尝试准备环境并记录过程
→ 单次尝试：Agent 在受控条件下完成任务
→ 结果与过程证据：收集环境状态、输出和轨迹
→ 评分器：根据成功条件判断是否通过
→ 统计汇总：按固定口径比较版本表现
~~~

这里的“五层评测设计体系”是本文为了工程理解建立的统一框架，不是 Anthropic、OpenAI 或其他机构规定的行业标准术语。外部资料用于校准每一层中的 Task、Outcome、Trace、Grader、Metric 等概念边界。

---

## 2. Agent Benchmark 的任务单元与比较协议

### 【Task 是一次完整任务的评测单元】

Anthropic 将 Task 定义为具有明确输入和成功标准的一次测试，将 Agent 对同一个 Task 的一次完整尝试称为 Trial。由于 Agent 运行具有非确定性，同一个 Task 往往需要多个 Trial 才能判断稳定性。[[1]](https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents)

因此：

~~~text
Model Call
→ 一次模型推理

Agent Run / Trial
→ 模型通过多轮推理和工具调用完成一次任务尝试

Task
→ 被重复评测的任务定义
~~~

例如：

~~~text
Task：修复认证绕过问题

Agent Trial：
读取代码
→ 定位问题
→ 修改实现
→ 运行测试
→ 根据失败继续修复
→ 最终结束
~~~

评测的是整条 Trial，而不是其中某一次 Model Response。

### 【Benchmark 是固定评测协议，不只是一个成功率】

本文把 Benchmark 理解为：

> **固定任务集、环境、运行预算、执行协议、评分规则和指标口径，用于重复比较不同 Agent、Model、Prompt、Tool 或 Harness 版本。**

所以“Agent 能否稳定完成任务”是 Benchmark 想回答的重要问题，但 Benchmark 本身还需要保证：

~~~text
Task Set 固定或版本可追踪
Environment 可复现
Budget 可比较
Grader 口径稳定
Metric 定义明确
~~~

否则两个版本即使得到不同分数，也无法判断差异来自 Agent 能力还是评测条件变化。

---

## 3. 五层评测设计体系

~~~text
1. 评测目标
   什么叫成功？

        ↓

2. 评测角度
   从哪里取得判断成功与失败的证据？

        ↓

3. 评测方法
   用什么机制根据证据做判断？

        ↓

4. 评测指标
   怎样把一次或多次 Trial 结果量化？

        ↓

5. 评测维度
   这些指标最终说明 Agent 哪方面能力？
~~~

五层不是五组平行名词，而是一个逐层收敛的设计过程。

---

## 4. 评测目标与成功标准

### 【Success Criteria 必须先于 Agent 执行定义】

第一层回答：

> **这个 Task 满足什么条件，才算真正完成？**

一个工程化 Task 至少应明确：

~~~text
Input
Initial Environment
Success Criteria
Constraints
Allowed Tools / Permissions
Budget
~~~

例如：

~~~yaml
task:
  goal: 修复空密码认证绕过

success_criteria:
  - 空密码必须被拒绝
  - 正常登录保持可用
  - 回归测试通过

constraints:
  - 不得关闭认证
  - 不得修改无关模块
~~~

如果执行结束以后才临时决定“什么算成功”，评测结果就会随着 Reviewer 的解释变化。

OpenAI 的 Evaluation Best Practices 也强调设计 task-specific eval，并让测试贴近真实生产分布，而不是使用过于泛化的指标。[[3]](https://developers.openai.com/api/docs/guides/evaluation-best-practices)

### 【明确结果使用 Exact Criteria，开放任务使用 Rubric 拆解】

不同 Task 的成功标准形式不同。

#### <u>1. 明确结果</u>

例如：

~~~text
计算结果必须等于 42
订单状态必须变成 refunded
指定测试必须通过
文件必须存在
~~~

Success Criteria 可以直接表达成精确条件。

#### <u>2. 开放结果</u>

例如：

~~~text
撰写研究报告
生成技术方案
完成客服沟通
输出代码 Review
~~~

不存在唯一 expected answer，需要通过 Rubric（评分细则）把“好”拆成具体 Criterion：

~~~text
Rubric
├─ 事实正确性
├─ 需求覆盖度
├─ 引用可靠性
├─ 分析逻辑
└─ 输出格式
~~~

需要特别区分：

> **Rubric 属于“评什么”的标准定义，不等于“怎么评分”。**

同一个 Rubric Criterion 后续既可以由代码判断，也可以由 Model Grader 或 Human Review 判断。

例如：

~~~text
Criterion：必须包含 3 个一手来源
→ 可以由程序检查引用数量和来源类型

Criterion：结论是否真正由证据支持
→ 可能需要 Model / Human 判断
~~~

因此：

~~~text
评测目标
→ Success Criteria
   ├─ Exact / Verifiable Criteria
   └─ Rubric Criteria
~~~

而不是把“Rubric”和“确定性评分”当成同一层的两种方法。

### 【Reference Solution 用于验证评测标准本身可用】

对于重要 Task，可以准备已知正确的 Reference Solution。

它主要证明：

~~~text
Task 本身可解
+
当前 Grader 能接受一个已知正确结果
~~~

Reference Solution 不是要求 Agent 模仿唯一执行路径。Anthropic 明确建议使用已知可通过所有关键 Grader 的参考解验证 Task 与 Grader 配置。[[1]](https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents)

---

## 5. 评测证据与结果、过程观察

第二层回答：

> **Agent 执行完成以后，我们从哪里判断它做得怎么样？**

Agent Eval 的评测角度可以统一成：

~~~text
结果面
├─ Outcome
└─ Output

过程面
└─ Trajectory / Trace
~~~

### 【Outcome：真实环境最终变成什么】

Outcome 是 Trial 结束时目标环境的最终状态。

例如 Agent 说：

~~~text
“退款已经完成。”
~~~

并不能证明任务成功。真正的 Outcome 可能是：

~~~text
database.order.status == refunded
refund_record exists
refund_amount == expected
~~~

Anthropic 也用订票场景说明：Agent 声称“已经订票”不等于成功，真正需要检查环境中是否存在对应 Reservation。[[1]](https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents)

因此只要 Task 存在可以观察的外部状态，应优先验证 Outcome。

### 【Output：最终交付物本身就是任务结果】

部分任务没有明显外部环境变化，最终 Output 本身就是主要产物：

~~~text
Research Agent → 研究报告
Analysis Agent → 分析结论
Customer Service Agent → 最终回复
~~~

这时 Output 需要根据 Task Success Criteria 和 Rubric 直接评测。

### 【Trajectory / Trace：Agent 是怎样完成任务的】

Trace 记录一次 Trial 的完整执行过程，例如：

~~~text
Model Turn
Tool Call
Tool Result
Handoff
Retry
Approval
Guardrail
Intermediate Result
~~~

OpenAI 将 Trace 定义为 Agent workflow 的端到端运行记录，并支持通过 Trace Grading 检查 Tool、Handoff、Guardrail 和 workflow-level 行为。[[2]](https://developers.openai.com/api/docs/guides/agent-evals)

Trace 主要有两个作用：

1. **解释成功或失败原因**；
2. **检查过程本身是否违反硬约束**。

因此：

~~~text
Outcome / Output
→ 主要回答“最后做对了吗？”

Trace / Trajectory
→ 主要回答“怎么做的、为什么成功或失败？”

当审批、权限、禁止行为、Tool 使用本身是 Task Constraint
→ Trace 也成为直接验收对象
~~~

这里不能把 Outcome 和 Trace 拆成两个体系层级，它们属于同一个“评测角度”问题。

---

## 6. 评测方法与评分器

第三层回答：

> **已经拿到 Outcome、Output 和 Trace 以后，具体通过什么机制判断它们是否满足 Success Criteria？**

Agent Eval 常见三类 Grader：

| 评测方法 | 适合判断 | 优点 | 主要限制 |
| --- | --- | --- | --- |
| Deterministic / Code-based | Exact Match、Test、Schema、数据库状态、文件状态、Tool 参数、静态规则 | 快、便宜、稳定、可重复 | 难处理开放语义 |
| Model-based | 开放式内容质量、复杂 Rubric、语义一致性 | 灵活、可规模化 | 本身非确定，需要校准 |
| Human Review | 高风险、高歧义、专家判断、Judge 校准 | 判断质量高 | 成本高、速度慢 |

Anthropic 推荐尽可能使用 deterministic graders，在代码不足以判断时使用 model graders，并谨慎使用 human graders；OpenAI 同样提供 string check、code execution、model grader 等不同评分机制。[[1]](https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents) [[4]](https://developers.openai.com/api/docs/guides/graders)

### 【方法选择遵循“能确定就不要再次引入模型不确定性”】

推荐顺序：

~~~text
Criterion 存在明确 Ground Truth
→ Deterministic Grader

无法代码化，但可以通过明确 Rubric 判断
→ Model-based Grader

高风险 / 高歧义 / Model Judge 低置信 / 校准场景
→ Human Review
~~~

这同时降低两个成本：

~~~text
评测不确定性
+
评测运行成本
~~~

### 【Verifier 可以把开放任务的一部分转成确定性评分】

“开放任务”不代表整个任务必须全部交给 Model Judge。

例如：

~~~text
Task：撰写一份研究报告
~~~

原本可能直接让另一个模型判断“这篇报告好不好”。

更稳定的做法是先拆 Rubric：

~~~text
必须存在结论章节
必须包含至少 5 个来源
至少 2 个一手来源
每个核心 Claim 必须绑定 Citation
引用 URL 必须可解析
指定格式必须满足 Schema
分析质量需要语义判断
~~~

其中前五项都可以提前构造 Verifier，通过 Script / Rule / Schema 自动验收；只有最后的开放质量判断再交给模型或人工。

因此：

~~~text
Open-ended Task
        ↓
Rubric / Criteria 分解
        ↓
能够客观验证的部分
→ Verifier / Deterministic Grader

仍然需要语义判断的部分
→ Model / Human
~~~

这不是把开放任务“变成完全确定”，而是尽可能提高确定性评测比例。

项目实践映射：[企业 Agent 任务评分调研](../bytedance/陈相实习生转正答辩.md)涉及评分方法研究；该材料是调研记录，不构成已实现自动评分平台的证据。

### 【Grader 与 Rubric 不同】

必须保持：

~~~text
Rubric
→ 判断标准是什么

Grader
→ 用什么机制执行判断
~~~

例如：

~~~text
Rubric Criterion：事实必须有一手来源
        ↓
Grader A：程序检查 Citation Mapping
Grader B：模型判断 Claim 是否真的被来源支持
~~~

一个 Criterion 可以组合多个 Grader，一个 Task 也可以同时存在 Hard Gate 和 Weighted Score。

---

## 7. 评测指标与多次执行统计

第四层回答：

> **完成一次或多次 Trial 后，用什么数字描述表现？**

Metric（指标）是具体可计算的量，不等于能力维度。

### 【任务效果指标】

~~~text
Trial Success Rate
Task Success Rate
Rubric Score
Criterion Pass Rate
Failure Rate
~~~

跨 Task 聚合时还需要明确 Macro / Micro 等统计口径，避免因为不同 Task 的 Trial 数不同而产生误导。

### 【非确定性与稳定性指标】

Agent 同一个 Task 多次运行可能不同：

~~~text
Trial 1 → Pass
Trial 2 → Fail
Trial 3 → Pass
Trial 4 → Pass
~~~

因此需要多 Trial 指标。

#### <u>1. pass@k</u>

回答：

> 给 Agent k 次机会，是否至少能够成功一次？

适合候选方案生成、搜索、探索型 Coding 等允许多次尝试的任务。

#### <u>2. pass^k</u>

回答：

> 同一个任务连续执行 k 次，是否每次都成功？

它更强调 Consistency / Reliability。

如果简化假设每次独立且单次成功率为 p：

~~~text
pass^k ≈ p^k
~~~

Anthropic 明确区分 pass@k 和 pass^k：前者关注多次机会中至少一次成功，后者关注连续成功的一致性。[[1]](https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents)

还可以记录：

~~~text
Score Variance
Retry Rate
Recovery Rate
Timeout Rate
Tool Failure Rate
Escalation Rate
~~~

### 【效率指标】

~~~text
Latency
P50 / P95 Latency
Turns
Model Calls
Tool Calls
Input / Output Tokens
Cost per Trial
Cost per Task
Cost per Successful Task
~~~

其中 Cost per Successful Task 往往比单纯平均 Cost 更能体现真实生产效率，因为失败 Trial 同样消耗资源。

项目实践映射：[Agent Benchmark 成本调研](../bytedance/陈相实习生转正答辩.md)涉及评测成本与降本思路；不能据此认定已建成统一 Benchmark Runner。

### 【安全指标】

~~~text
Policy Violation Rate
Unauthorized Action Rate
Approval Bypass Rate
Sensitive Data Exposure Rate
Unsafe Tool Call Rate
Guardrail Trigger Rate
~~~

需要特别区分：

> **Cost 是指标，不是上位能力维度；pass^k 是指标，Reliability 才是维度。**

---

## 8. Agent 能力评测维度

第五层回答：

> **这些分数最终是在评价 Agent 的哪一类能力？**

本文将 Agent Technical Evaluation 收敛为四个核心维度：

| 评测维度 | 核心问题 | 典型指标 |
| --- | --- | --- |
| Effectiveness（有效性） | 能不能把任务做对 | Success Rate、Rubric Score、Criterion Pass Rate |
| Reliability（可靠性） | 能不能持续稳定做对 | pass^k、Variance、Failure / Retry / Recovery Rate |
| Efficiency（效率） | 完成任务消耗多少时间和资源 | Latency、Turns、Token、Tool Call、Cost / Successful Task |
| Safety（安全性） | 是否在允许边界内完成 | Violation、Unauthorized Action、Approval Bypass、Leakage |

维度是对指标的语义归类，因此不能再把下面这些概念并列：

~~~text
Outcome
Reliability
Trajectory
Efficiency
Safety
~~~

因为它们不在同一个抽象层：

~~~text
Outcome / Trajectory
→ 评测角度

Reliability / Efficiency / Safety
→ 评测维度
~~~

### 【Trajectory Quality 不单独作为固定一级维度】

Trace 中可以产生很多指标，例如 Invalid Tool Call、Repeated Loop、Wrong Delegation、Approval Bypass、Turns、Tool Calls。

这些指标最终可以根据业务含义映射到不同维度：

~~~text
Repeated Loop / Excessive Turns
→ Efficiency / Reliability

Wrong Delegation
→ Effectiveness / Reliability

Approval Bypass
→ Safety
~~~

因此 Trajectory 本身更适合作为评测角度和证据来源，而不是与 Reliability、Efficiency、Safety 并列的固定能力维度。

### 【Business Value 与 Agent Technical Evaluation 分开】

Agent 技术评测回答：

~~~text
Agent 能不能正确、稳定、高效、安全地完成任务？
~~~

业务价值评估回答：

~~~text
这套 Agent 是否真的值得部署？
~~~

业务指标可能包括 Time Saving、Throughput、Human Cost、Coverage、Resolution Rate、User Satisfaction 和 Business Conversion。

Agent Eval 分数提高不等于业务 ROI 一定提高；业务 KPI 改善也不能证明 Agent 的技术执行机制已经可靠。

---

## 9. Evaluation Harness 与评测运行机制

五层评测设计说明“怎么设计评测”，Evaluation Harness 说明“怎么把评测跑起来”。

~~~text
真实任务空间
        ↓
Dataset
保存候选 Task

        ↓ 按评测目标组织

Evaluation Suite
选择本轮要评的 Task

        ↓

Evaluation Harness
初始化环境、执行 Trial、收集证据、运行 Grader

        ↓

Task
定义 Input + Success Criteria + Constraints

        ↓

Multiple Trials
Agent 真实运行

        ↓

Evidence
Outcome / Output / Trace + Usage / Latency

        ↓

Graders
Deterministic / Model / Human

        ↓

Metrics Aggregation
Success / pass@k / pass^k / Cost / Safety ...

        ↓

Evaluation Dimensions
Effectiveness / Reliability / Efficiency / Safety

        ↓

Benchmark Result
版本比较 / Regression / 发布判断
~~~

Anthropic 将 Evaluation Harness 定义为运行 Eval 的基础设施，包括运行 Task、记录过程、评分和聚合结果。[[1]](https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents)

OpenAI 的 Agent 工作流评测资料也介绍了 Trace、Dataset 与评分机制；涉及具体托管平台或 API 的使用时，应另外核对其当前产品生命周期与可用版本。[[2]](https://developers.openai.com/api/docs/guides/agent-evals)

### 【单次 Trial 从环境准备到结果归档形成完整闭环】

Evaluation Harness（评测执行器）不替 Agent 决策，而是控制评测的外部条件。一次 Trial（任务尝试）的输入包括任务定义、Agent 版本、初始环境快照和运行预算；输出包括最终环境状态、交付物、执行轨迹、资源消耗和评分结果。多次 Trial 必须尽可能从相同的初始状态开始，否则第一次运行留下的文件、数据库记录或缓存可能影响第二次结果。

~~~text
任务定义与环境快照
    ↓ 为本次尝试恢复初始文件、数据、权限与工具配置
环境准备和校验
    ↓ 提供相同输入与预算
Agent 执行一次完整任务
    ↓ 记录工具调用、状态变化和终止原因
结果及过程证据归档
    ↓ 按任务成功标准执行评分
单次 Trial 评分
    ↓ 清理或重新创建环境，避免影响后续尝试
下一次 Trial / 指标汇总
~~~

环境准备以任务定义为输入，产出一个可运行且已校验的初始状态；Agent 在这个状态中完成任务，留下真实结果和轨迹；评分器以成功标准与这些证据为输入，输出通过与否及评分细节；归档后再恢复环境，才能比较下一次执行。超时、工具不可用和环境启动失败需要分别记录，不能全部直接归因为 Agent 能力不足。

下面是**用于解释控制关系的伪代码**，并非特定评测平台的真实 API：

~~~python
for task in evaluation_suite:
    for trial_index in range(repetitions):
        env = restore_environment(task.initial_snapshot)
        try:
            validate_environment(env)
            run = execute_agent(
                task.input, env,
                budget=task.budget,
                agent_version=version,
            )
            evidence = collect_evidence(run, env)
            grade = grade_task(task.success_criteria, evidence)
            save_trial(task.id, trial_index, version, evidence, grade)
        except EnvironmentError as error:
            save_infrastructure_failure(task.id, trial_index, error)
        finally:
            dispose_environment(env)
~~~

这里的 `restore_environment` 保证每次尝试拥有可比较的起点；`collect_evidence` 保留 Outcome、Output 与 Trace；`grade_task` 只执行事先确定的评分标准。实际工程还应记录任务集版本、模型及工具版本、评分器版本、随机性配置和运行时间；这些信息用于解释版本差异，不意味着模型输出本身可以完全确定地复现。[[1]](https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents)

### 【Dataset 与 Evaluation Suite 不同】

~~~text
Dataset
→ 保存和维护可以被评测的 Task Portfolio

Evaluation Suite
→ 根据某个目标选取并组织 Task
~~~

例如：

~~~text
Dataset
├─ 普通功能 Task
├─ Edge Case
├─ Production Failure
├─ Safety Case
└─ Challenge Case

Evaluation Suite
├─ Capability Suite
├─ Safety Suite
└─ Regression Suite
~~~

### 【Evaluation Harness 与 Agent Harness 不同】

~~~text
Agent Harness
→ 让 Model 能够执行任务

Evaluation Harness
→ 运行、观察和评分 Agent
~~~

评测的对象实际上是 Model + Agent Harness 在给定 Task 和环境中的整体表现。

---

## 10. Benchmark 可信性与持续维护

Agent Eval 的失败不一定来自 Agent，也可能来自 Task Ambiguity、Grader Error、Environment Instability、Harness Bug 或 Dataset Bias。

因此需要验证 Eval 本身：

~~~text
Reference Solution
→ 证明 Task 可解、Grader 可接受正确结果

Transcript Review
→ 检查失败是否公平

Grader Calibration
→ 对齐 Model Grader 与 Human Judgment

Environment Validation
→ 保证 Trial 从稳定、隔离环境开始
~~~

### 【能力评测与回归评测服务于不同决策】

能力评测（Capability Evaluation）使用仍有挑战性的任务，判断 Agent 在哪些能力上存在提升空间；回归评测（Regression Evaluation）使用已能稳定完成的任务，检查模型、工具、提示词或 Harness 变化是否导致退化。两者都需要明确任务版本与评分口径，但不能用回归集的高通过率直接证明新场景能力。[[1]](https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents)

| 评测集 | 核心问题 | 典型使用时机 |
| --- | --- | --- |
| 能力评测集 | 尚有哪些任务难以完成 | 探索模型或工作流改进 |
| 回归评测集 | 原本能够完成的任务是否退化 | 版本更新、发布前验证 |

### 【评测集需要控制代表性、泄漏与评分漂移】

评测集的输入可以来自真实任务、失败案例、边界条件和安全场景，但应标记来源、版本与适用范围。持续针对固定公开题目优化可能使分数上涨而真实能力不变；任务描述、参考答案或评分细则泄漏到 Agent 上下文，也会使结果失去独立性。

评分器同样需要维护：先用已知正确的参考解检查可通过性，再抽样复核失败轨迹；模型评分器应与人工标注样本比较，检查评分漂移与不同任务群体之间的偏差。评测失败还应区分任务歧义、环境故障、评分器错误和 Agent 真实失败，避免将基础设施问题计入能力下降。[[1]](https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents) [[3]](https://developers.openai.com/api/docs/guides/evaluation-best-practices)

Anthropic 强调，Task 说明必须和 Grader 真正检查的条件一致；如果强模型大量 Trial 仍然 0% 通过，应先检查 Task 或 Grader 是否有问题。[[1]](https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents)

OpenAI 也把 Vibe-based evals、数据集不能反映真实生产分布、不校准自动评分等列为评测反模式。[[3]](https://developers.openai.com/api/docs/guides/evaluation-best-practices)

---

## 11. 评测设计与运行对象的对应关系

| 层级 | 解决的问题 | 核心对象 |
| --- | --- | --- |
| 评测目标 | 什么叫任务成功 | Task、Success Criteria、Rubric、Constraints |
| 评测角度 | 从哪里取得判断证据 | Outcome、Output、Trajectory / Trace |
| 评测方法 | 怎样做出判断 | Deterministic Grader、Model Grader、Human Review、Verifier |
| 评测指标 | 怎样量化单次和多次表现 | Success Rate、Rubric Score、pass@k、pass^k、Cost、Latency、Violation Rate |
| 评测维度 | 最终说明哪类 Agent 能力 | Effectiveness、Reliability、Efficiency、Safety |

运行体系负责：

~~~text
Dataset / Suite
→ Harness
→ Task
→ Trial
→ Evidence
→ Grader
→ Metric
→ Benchmark
~~~

一句话收束：

> **先用评测目标定义什么叫成功，再从结果和轨迹获取证据，用合适的评分方法判断证据，通过多 Trial 指标量化表现，最后从有效性、可靠性、效率和安全四个维度评价 Agent；Evaluation Harness 则负责把这一整套设计稳定、可重复地跑起来。**

---

## 12. 参考文献

[1] Anthropic. [Demystifying evals for AI agents](https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents)[EB/OL]. 2026-01-09。

[2] OpenAI. [Evaluate agent workflows](https://developers.openai.com/api/docs/guides/agent-evals)[EB/OL]. 核验日期：2026-10-07。

[3] OpenAI. [Evaluation best practices](https://developers.openai.com/api/docs/guides/evaluation-best-practices)[EB/OL]. 核验日期：2026-10-07。

[4] OpenAI. [Graders](https://developers.openai.com/api/docs/guides/graders)[EB/OL]. 核验日期：2026-10-07。
