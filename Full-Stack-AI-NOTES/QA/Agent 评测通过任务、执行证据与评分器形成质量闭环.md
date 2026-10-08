# Agent 评测通过五层设计框架形成可重复的 Benchmark

## 【知识概述】

Agent Benchmark 面对的是一次完整 Task 的多轮执行，而不只是模型的一次文本输出。**评测的逻辑顺序应是：先定义什么算成功，再决定从哪里取得证据，再选择谁来评分，然后在多次 Trial 上计算指标，最后解释这些指标代表哪种能力。** 少了前面任何一层，后面的分数都可能失去业务含义。

为了避免混淆，本知识库把评测设计组织成“目标、角度、方法、指标、维度”五层。这是用于学习和面试的**工程组织框架，不是某个官方规定的唯一分类**。Anthropic 关于 Task、Trial、Outcome、Transcript 和 Grader 的说明，以及 OpenAI 关于 Agent Evals 与 Graders 的官方资料，可以用来核对其中具体机制。[[1]](https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents) [[2]](https://developers.openai.com/api/docs/guides/agent-evals) [[4]](https://developers.openai.com/api/docs/guides/graders)

## 【提问】

- 如果让你设计一套 Agent Benchmark，应该先解决哪些问题？
- Agent Task 的成功标准怎样定义，开放任务又怎样设计 Rubric？
- Outcome / Output 和 Trace 分别能证明什么，如何选择 Grader？
- 为什么不能只看单次成功率，pass@k、pass^k、Cost 等怎样解释？
- 如何将评测质量、可重复性和成本放进同一套设计？

## 【回答框架】

直接给出结论：Agent Eval 评估的是完成**完整任务目标**的能力，因此必须让“成功条件、执行事实、评分机制、统计指标”彼此可追溯。首先把任务目标拆成能够检查的 Exact Criteria 和需要语义判断的 Rubric；如果目标未定，任何评分方法都无从判断。随后沿任务执行获取最终 Outcome / Output 与过程 Trace，再按各 Criterion 的性质选择确定性、模型或人工 Grader。由于一次成功可能具有随机性，还要多次运行 Trial，计算成功率、稳定性和成本；最后将这些指标解释为有效性、可靠性、效率和安全能力。

~~~text
Task / Success Criteria（评测目标）
   ↓ 确定什么才算成功
Outcome / Output / Trace（证据角度）
   ↓ 取得客观结果和执行过程
Deterministic / Model / Human Grader（评测方法）
   ↓ 按标准评分
Success / Consistency / Cost / Safety Metrics（评测指标）
   ↓ 多次 Trial 汇总
Effectiveness / Reliability / Efficiency / Safety（能力维度）
~~~

Dataset、Suite、Evaluation Harness 与 Trial 等构成**实际运行这条链的工程系统**，不能与五层分析维度机械相加。给出项目实践时，还需区分调研报告和已落地的 Benchmark 平台。

## 【完整回答】

### 【一、从成功条件开始，而不是先选择模型评分器】

如果要设计 Agent Benchmark，我首先会判断这项评测具体想证明 Agent 有什么能力、任务结束后什么结果才算成功。Agent 可能经过多轮 Tool Call、重试和环境操作，因此“最后生成一句正确回答”并不能覆盖文件生成、数据库修改或业务流程执行类任务。

对于有明确结果的 Task，可以定义 Exact / Verifiable Criteria，例如生成指定文件、通过测试或把业务对象更新到目标状态；对于研究报告、技术方案等没有唯一标准答案的任务，则需要用 Rubric 把正确性、覆盖面、引用质量和约束满足等要求拆成多个 Criterion（单项评分条件）。

这里最容易混淆的是 Rubric 与 Grader：**Rubric 规定评什么，Grader 才规定由什么机制来判分**。一个 Criterion 可以由程序、模型或者人工判断，不能因为任务是开放的，就预设全部交给 LLM-as-Judge。Anthropic 的 Agent Evals 官方文章对 Task、Trial、Grader 和结果的职责作了区分。[[1]](https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents)

### 【二、有了成功标准，才知道应该采集哪一类执行证据】

接下来必须决定怎样从一次 Trial 中取证。对于修改数据库的任务，最直接的成功证据通常是执行结束后的真实数据状态；对于生成报告的任务，则需要检查交付 Output 的内容和结构。单看 Agent 的总结“我已完成”，不能代替对真实结果的检查。

但只有 Outcome / Output 也不一定能解释问题。Agent 可能得到了看似正确的最终结果，却绕过审批、使用禁止的工具或重复执行高风险动作。这类任务约束就需要读取 Trace / Trajectory，查看模型调用、工具执行、失败和权限控制等过程。

因此我会从两个相互补充的角度取得证据：**Outcome / Output 主要回答结果是否达到目标，Trace 主要回答过程怎样发生；当过程本身属于任务约束时，Trace 也直接进入判定。** OpenAI 的 Agent Evals 指南提供了通过执行 Trace 分析和评分工作流表现的方法，但 Trace 的丰富程度不能自动证明任务已成功。[[2]](https://developers.openai.com/api/docs/guides/agent-evals)

### 【三、评分方法必须匹配条件的可验证性】

有了任务标准与证据，才选择 Grader。能够精确判断的条件，例如文件存在、Schema 合法、数值匹配、测试退出码，可以采用 Deterministic / Code-based Grader；需要判断文字论证是否合理、信息是否充分的条件，可以采用 Model-based Grader；影响大、歧义高或需要校准评分器时，再加入 Human Review。

例如评测一份研究报告，不必把“是否存在要求的章节”“引用数量是否达到阈值”“文件格式是否有效”都交给模型判断。它们更适合脚本验证，而“结论是否被证据支持、是否完整回答问题”才需要更开放的评审。

OpenAI 的 [Graders](https://developers.openai.com/api/docs/guides/graders) 与 [Evaluation best practices](https://developers.openai.com/api/docs/guides/evaluation-best-practices) 都强调将评分准则与评测配置具体化。工程取舍是：**能够确定性判断的部分先确定化，把语义评分留给确实需要语义推断的地方**，降低模型评分波动与成本。但确定性并不意味着永远正确：检查规则若与真实目标错位，程序也会稳定地评错。因此需要对评分器本身做校准和错误样本回归。

### 【四、单次 Trial 只说明一次结果，多次运行才有可靠性判断】

接下来才进入统计指标。对于同一个 Task，Agent 可能一次成功、一次失败、下一次又成功。如果只展示最好的 Trial，就无法解释重复执行时是否可靠。

因此在固定任务、环境和评分条件下，应记录成功率与 Rubric 得分，并观察多次运行的分布。比如 `pass@k` 描述给定 k 次尝试时至少出现一次成功的机会，更适合衡量多次尝试能否找到可行解；`pass^k` 更关注连续 k 次都成功，反映重复执行的一致性。实际比较这些指标时必须说明采样协议、次数及统计口径，不能直接把一次观测当成稳定概率。

此外，成功率不应该掩盖资源代价。Latency（延迟）、Turns（执行轮数）、Tool Calls、Tokens、总成本和每次成功成本，解释为了达到相同质量花了多少资源；违规操作、审批绕过等指标则反映安全问题。**Metric 是可计算的量，而 Reliability、Efficiency 等是这些数字所服务的能力维度**，不能把它们放在同一层进行并列比较。

### 【五、指标只有进入能力维度和比较协议后，才构成有意义的 Benchmark】

最后我会将指标组织成几个能力方向：Effectiveness（有效性）看任务能否正确完成；Reliability（可靠性）看多次运行的一致性；Efficiency（效率）看实现同样结果的时间与成本；Safety（安全）看是否越过权限和行为约束。

这个划分不是为了凑四个对称名词，而是帮助回答不同决策问题。例如某个新版 Agent 成功率略高但成本增加数倍，结论就不能只写“能力提升”；又如平均分不错但关键操作经常违规，也不应该被称作整体质量良好。

只有在 Task、Dataset、环境、评分器和运行次数等核心条件可比时，不同版本的 Benchmark 数字才适合直接比较。改变了成功条件或评分规则，却继续沿用历史得分口径，会造成虚假的进步或退步。

### 【六、Evaluation Harness 负责稳定地运行评测，而不是另加一个维度】

到这里五层解决了“设计一套评测应该如何思考”。真正执行时，还需要 Dataset 保存任务样本，Suite 选择此次评测范围，Evaluation Harness 负责初始化环境、运行 Trial、收集 Evidence、调用 Grader 并聚合指标。Benchmark 则是在尽可能固定的协议下，让这些运行能够重复并进行版本比较。

例如日常小改动可以先运行相关增量和回归样本，大范围模型或 Harness 升级再提高覆盖范围；评分侧优先执行廉价的确定性检查，语义和高风险样本再用模型或人工复核。这样既控制评测开销，也不把所有测试都简化成脚本或一次模型 Judge。是否采用全量评测，应由发布风险和可用预算决定，不能为了降低成本暗中改变比较协议。

### 【七、收束：从任务标准追到能力结论，才是完整 Agent Eval】

所以，设计 Agent Benchmark 最重要的不是先选 Judge 模型或先计算一张指标表，而是**先明确任务成功条件，再从实际执行拿到适配的结果与过程证据，选择可校准的评分方法，经多 Trial 汇总后按有效性、可靠性、效率和安全性解释能力**。Dataset 与 Harness 让这个过程能重复运行，业务风险和成本约束则决定评测覆盖与人工介入的深度。

这个思路和单次软件交付验收有联系，但两者范围不同：一项研发需求的 Verify 要判断当前版本是否满足既定验收合同；Benchmark 要在多任务、多次运行条件下测量 Agent 整体能力。若验收合同本身出现误读，需要先处理“正确标准从哪里来”的问题，参见[AI Coding 错误验收的需求追溯与修复回流](./AI%20Coding%20错误验收通过需求追溯与修复回流形成质量闭环.md)。

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
