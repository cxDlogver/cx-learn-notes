# QA 索引连接提问方式、回答框架与继续学习路径

QA 是 `Full-Stack-AI-NOTES` 的“问题视图”，不是聊天记录，也不是第二套知识库。每条 QA 对应一套可以复用的回答知识框架：同一个知识点可以有不同提问方式，但只要核心分析路径一致，就归入同一条记录。

正式回答问题时仍遵循：

```text
知识体系索引.md
   ↓ 定位主题和前置知识
QA.md
   ↓ 找到已有回答框架与可继续追问方向
相关知识 Markdown
   ↓ 阅读完整正文
source/ / resource/
   ↓ 按需读取实现和附件
外部权威资料
   ↓ 核验变化事实和关键结论
```

QA.md 重点回答四件事：

```text
这个知识点可能怎样被问？
        ↓
应该沿什么框架分析和回答？
        ↓
完整标准回答在哪里？
        ↓
当前回答继续展开后会产生什么问题？
```

“继续展开”不是固定关联文档列表。只有从当前回答自然产生新的问题时才记录；只有某个知识正文或已有 QA 确实有助于回答该追问时才附链接。

## 1. Harness、Runtime 与 Loop 的职责和关系

### 【提问】

- Agent Harness、Agent Runtime 和 Agent Loop 分别是什么，它们有什么区别？
- 一次 Agent Run 到底是谁在驱动，Loop 和 Runtime 是什么关系？
- Harness 是否包含 Runtime，Runtime 是否等于 Agent Loop？

### 【回答框架】

**核心回答：** Loop、Runtime、Harness 是同一次 Agent 执行的三个不同观察层次：Loop 描述持续决策机制，Runtime 负责把机制实际执行起来，Harness 提供完整工程支撑。

**回答路径：**

```text
为什么需要区分三者？
一次模型调用无法持续完成动态任务
        ↓
Agent 首先需要“根据结果继续判断”
→ Loop：解决持续推进机制
        ↓
循环机制必须有人真正执行
→ Runtime：负责模型调用、Tool 执行、State 更新与生命周期
        ↓
Runtime 进入真实工程环境还缺少公共支撑
→ Harness：补充 Context、Tool、Memory、权限、Checkpoint、Trace 等能力
        ↓
放回一次 Agent Run 验证
Context → Model → Tool Call → Tool Result → State → 下一轮 / 结束
        ↓
回答三者关系
机制（Loop）→ 执行（Runtime）→ 工程支撑（Harness）
```

**必须补充的边界：** 这里表达的是职责关系，不是行业统一的代码包含关系；Loop 也不能与预定义业务 Workflow 等同。

**收束：** 回答时不要分别背三个定义，而要从“Agent 如何持续运行”切入，用一次 Agent Run 把机制、执行和工程支撑串起来。

### 【完整回答】

[查看完整回答](<./QA/Harness、Runtime 与 Loop 分别承担运行支撑、执行管理和决策循环.md>)

### 【继续展开】

- **追问：Agent 工程为什么会从 Prompt 优化继续扩展到 Context、Harness 和可靠运行？**
  - 可继续阅读：[Agent 研发重点从提示词技巧扩展到上下文组织与可靠运行](<./QA/Agent 研发重点从提示词技巧扩展到上下文组织与可靠运行.md>)。
- **追问：当一次 Agent Run 进入更大的业务流程时，代码和模型应该怎样分配控制权？**
  - 可继续阅读：[Agent 编排通过代码与模型分配不同范围的执行决策权](<./QA/Agent 编排通过代码与模型分配不同范围的执行决策权.md>)。

## 2. Agent 研发从 Prompt 扩展到 Context、Harness 与可靠运行

### 【提问】

- 为什么现在做 Agent 不能只关注 Prompt Engineering？
- Prompt、Context、Harness 分别解决什么问题？
- Agent 工程化相比单次 LLM 调用增加了哪些核心问题？

### 【回答框架】

**核心回答：** Agent 研发从 Prompt 扩展到 Context、Runtime / Harness 和可靠性，并不是概念升级替代，而是任务从“生成答案”走向“真实执行”后，工程问题逐层扩大。

**回答路径：**

```text
最初的问题：怎样让模型正确理解任务？
→ Prompt：表达目标、规则和约束
        ↓
为什么 Prompt 不够？
模型还需要获得完成当前任务所需的信息
→ Context：组织这一轮真正可见的信息
        ↓
为什么 Context 仍不够？
Agent 还要调用外部能力，并根据结果继续行动
→ Tool + Agent Loop
        ↓
谁承载动态执行？
→ Runtime / Harness：State、Tool、权限、恢复、Trace
        ↓
进入真实业务后还缺什么？
→ Workflow + 幂等 + 对账 + 持久化 + 验收
        ↓
最终目标
从“模型能回答”走向“系统能可靠完成任务”
```

**必须补充的边界：** 后一层不是对前一层的淘汰；简单任务可能只需要 Prompt + Model，工程能力应随任务复杂度和风险逐步增加。

**收束：** 这道题的主线不是解释一组 Agent 名词，而是说明随着系统目标扩大，每一层分别解决前一层暴露出的新问题。

### 【完整回答】

[查看完整回答](<./QA/Agent 研发重点从提示词技巧扩展到上下文组织与可靠运行.md>)

### 【继续展开】

- **追问：长任务如何跨多轮、多阶段持续执行并在中断后恢复？**
  - 可继续阅读：[Agent 长任务通过任务分解、持久化状态与验收实现持续推进和恢复](<./QA/Agent 长任务通过任务分解、持久化状态与验收实现持续推进和恢复.md>)。
- **追问：确定性 Workflow 和模型动态决策应该怎样组合？**
  - 可继续阅读：[Agent 编排通过代码与模型分配不同范围的执行决策权](<./QA/Agent 编排通过代码与模型分配不同范围的执行决策权.md>)。

## 3. Agent Eval 与 Benchmark 的任务质量评测框架

### 【提问】

- 一个 Agent 到底应该怎么评测，不能只看最终回答吗？
- Agent Eval 中 Task、Trial、Trace、Outcome 和 Grader 是什么关系？
- pass@k、pass^k 和普通成功率分别说明什么？

### 【回答框架】

**核心回答：** Agent Eval 要评的不是“回答像不像正确”，而是任务是否真实完成；因此核心链路必须从成功标准出发，经真实执行和证据采集，再进入评分与版本回归。

**回答路径：**

```text
第一步先问：什么叫完成？
→ Task + Success Criteria
        ↓
怎样产生可评测对象？
→ Trial：让 Agent 真实执行一次
        ↓
为什么不能直接相信最终回答？
→ 收集 Evidence
   Output + Outcome + Trace / Trajectory + Cost
        ↓
怎样根据证据判断成功？
→ Grader
   Code / Rubric Model / Human
        ↓
怎样从一次结果判断系统能力？
→ Metrics
   Success Rate / pass@k / pass^k / Cost / Stability
        ↓
怎样比较不同版本？
→ Eval Suite / Benchmark → Regression
```

**必须补充的边界：** Trace 是评测证据，不等于 Eval；Grader 是判定机制，不等于 Benchmark；指标选择必须服从任务成功标准。

**收束：** Agent Eval 的完整框架是“定义成功 → 执行 → 取证 → 评分 → 聚合 → 回归”，而不是从某个指标或模型自评开始。

### 【完整回答】

[查看完整回答](<./QA/Agent 评测通过任务、执行证据与评分器形成质量闭环.md>)

### 【继续展开】

- **追问：Trace 为什么只能提供证据，不能直接等于 Eval？**
  - 可继续阅读：[Agent 可观测体系通过 Trace、Span、指标与审计解释执行过程](<./QA/Agent 可观测体系通过 Trace、Span、指标与审计解释执行过程.md>)。
- **追问：长任务中的阶段验收怎样进入 Agent Eval？**
  - 可继续阅读：[Agent 长任务通过任务分解、持久化状态与验收实现持续推进和恢复](<./QA/Agent 长任务通过任务分解、持久化状态与验收实现持续推进和恢复.md>)。

## 4. Agent 工具执行的身份、授权、审批与隔离

### 【提问】

- Agent 调用 Tool 时，权限到底应该在哪里控制？
- Prompt、Skill、Tool 权限和业务后端授权有什么区别？
- Human-in-the-loop、Guardrail 和 Sandbox 分别解决什么安全问题？

### 【回答框架】

**核心回答：** Agent 安全的根本边界是“模型可以提出动作，但不能决定真实动作是否有权执行”；安全控制必须沿动作落地链路逐层实施。

**回答路径：**

```text
模型准备调用 Tool
        ↓
先确认是谁发起
→ Authentication
        ↓
这个 Agent 应该看到哪些能力？
→ Tool Exposure / Filtering
        ↓
该身份能否对该资源执行该动作？
→ Authorization
        ↓
高风险动作是否还需要人工确认？
→ Human Approval
        ↓
执行时允许访问哪些环境和资源？
→ Sandbox / Resource Boundary
        ↓
真正产生业务副作用前
→ Backend Revalidation + Execution
        ↓
事后如何证明执行过程？
→ Trace / Audit
```

**必须补充的边界：** Prompt / Skill 是行为指导，不是安全边界；Tool 可见不代表有权执行；人工审批不能替代后端最终授权；恢复任务时关键权限需要重新校验。

**收束：** 回答安全问题时要沿“意图 → 权限 → 执行 → 审计”讲完整链路，而不是笼统地说增加权限、Guardrail 或 HITL。

### 【完整回答】

[查看完整回答](<./QA/Agent 治理通过身份、授权、审批与隔离约束工具执行.md>)

### 【继续展开】

- **追问：一次 Tool 执行失败后，重试怎样避免重复副作用或绕过业务拒绝？**
  - 可继续阅读：[Agent 故障恢复通过失败分类、安全重试与业务对账保护执行一致性](<./QA/Agent 故障恢复通过失败分类、安全重试与业务对账保护执行一致性.md>)。
- **追问：怎样证明审批、授权和真实执行过程确实按预期发生？**
  - 可继续阅读：[Agent 可观测体系通过 Trace、Span、指标与审计解释执行过程](<./QA/Agent 可观测体系通过 Trace、Span、指标与审计解释执行过程.md>)。

## 5. Agent 可观测性通过 Trace、Span、Metric 与 Audit 解释执行过程

### 【提问】

- Agent 系统为什么需要 Trace，仅有日志够不够？
- Trace、Span、Log、Metric 和 Audit 分别解决什么问题？
- 如何观察一次 Agent 从模型判断到 Tool 执行的完整链路？

### 【回答框架】

**核心回答：** Agent 可观测性需要同时解决“单次执行发生了什么”和“大量执行整体表现怎样”，因此 Trace、Span、Log、Metric、Audit 是不同观察粒度，而不是互相替代的记录方式。

**回答路径：**

```text
先想回答什么问题？

一次 Agent Run 整体经过了什么？
→ Trace
        ↓
内部具体有哪些模型、Tool、Agent、业务步骤？
→ Span
        ↓
某一步到底发生了什么错误或事件？
→ Log
        ↓
大量 Run 的延迟、成功率、Token、错误率怎样？
→ Metric
        ↓
谁批准、谁执行了敏感动作？
→ Audit
        ↓
怎样统一查询和分析？
→ Exporter / Observability Backend
```

**必须补充的边界：** Trace 只能证明执行过程，不证明任务成功，因此不能替代 Eval；Trace 也不是恢复状态，不能替代 Checkpoint。

**收束：** 用 Trace/Span 还原链路，用 Log 解释局部事件，用 Metric 看整体趋势，用 Audit 保存治理证据，组合起来才能解释 Agent 的运行。

### 【完整回答】

[查看完整回答](<./QA/Agent 可观测体系通过 Trace、Span、指标与审计解释执行过程.md>)

### 【继续展开】

- **追问：有了完整 Trace 后，怎样进一步判断 Agent 做得对不对？**
  - 可继续阅读：[Agent 评测通过任务、执行证据与评分器形成质量闭环](<./QA/Agent 评测通过任务、执行证据与评分器形成质量闭环.md>)。
- **追问：Trace 与 Checkpoint 为什么不能互相替代？**
  - 可继续阅读：[Agent 长任务通过任务分解、持久化状态与验收实现持续推进和恢复](<./QA/Agent 长任务通过任务分解、持久化状态与验收实现持续推进和恢复.md>)。

## 6. Agent 长任务的任务分解、状态持久化、验收与恢复

### 【提问】

- Agent 怎样执行几个小时甚至几天的长任务？
- Context、Memory、State、Checkpoint 和 Artifact 在长任务中分别负责什么？
- Agent 中断后如何继续，而不是重新从头执行？

### 【回答框架】

**核心回答：** 长任务能力的关键不是让模型运行更久，而是把长期目标转化为可分解、可验收、可持久化、可恢复的执行过程。

**回答路径：**

```text
为什么长任务不能直接持续运行？
中断、错误累积、外部状态变化不可避免
        ↓
先让任务具有恢复边界
→ Task Decomposition
   拆成可独立推进和验收的单元
        ↓
执行过程中如何知道做到哪里？
→ State
        ↓
阶段结果什么时候可以继续向后使用？
→ Verification
        ↓
中断后靠什么恢复？
→ Checkpoint：恢复状态
→ Artifact：保存产物
→ Memory：保存未来可复用信息
        ↓
为什么加载 Checkpoint 还不够？
外部动作可能已经发生
→ Reconciliation
        ↓
确认可信边界后
→ Resume
```

**必须补充的边界：** Context、State、Checkpoint、Artifact、Memory 职责不同；Checkpoint 能恢复 Agent 状态，但不能自动保证外部副作用的一致性。

**收束：** 长任务要回答的不是“如何保持一次调用不断开”，而是“如何让任务随时可以在可信阶段停止、验证、保存并继续”。

### 【完整回答】

[查看完整回答](<./QA/Agent 长任务通过任务分解、持久化状态与验收实现持续推进和恢复.md>)

### 【继续展开】

- **追问：恢复后重新执行某一步时，怎样避免重复调用真实业务动作？**
  - 可继续阅读：[Agent 故障恢复通过失败分类、安全重试与业务对账保护执行一致性](<./QA/Agent 故障恢复通过失败分类、安全重试与业务对账保护执行一致性.md>)。
- **追问：长任务中的固定阶段和动态子任务应该由谁控制？**
  - 可继续阅读：[Agent 编排通过代码与模型分配不同范围的执行决策权](<./QA/Agent 编排通过代码与模型分配不同范围的执行决策权.md>)。

## 7. Agent 故障恢复通过失败分类、幂等、对账与补偿保证一致性

### 【提问】

- Agent Tool 调用失败以后是不是直接 Retry 就可以？
- Agent 如何避免重试造成重复扣款、重复发消息或重复写数据？
- Checkpoint、Retry、Idempotency、Reconciliation 和 Compensation 分别解决什么问题？

### 【回答框架】

**核心回答：** 故障恢复不能从 Retry 开始，因为“调用失败”与“业务动作未执行”不是同一件事；必须先确定失败类型和副作用状态，再选择恢复策略。

**回答路径：**

```text
观察到调用失败
        ↓
先问：失败属于哪一类？
临时异常 / 确定错误 / 业务拒绝 / 结果未知
        ↓
再问：上一次动作能否确认安全重放？
        ├─ 能
        │   → Retry + Backoff
        │
        └─ 不能确认
            → Reconciliation 查询真实业务状态
                  ↓
             实际未执行？
             → 安全重放
                  ↓
             实际已执行？
             → 复用结果 / Compensation
        ↓
更新可信 State / Checkpoint
        ↓
继续任务
```

**必须补充的边界：** Retry 不是通用恢复方案；Idempotency 应由真正产生副作用的一侧保证；Checkpoint 不等于 Exactly-once；业务或权限拒绝不能靠重试绕过。

**收束：** 正确顺序是“失败分类 → 判断副作用 → 判断可重放性 → 重试或对账 → 必要时补偿 → 从可信状态继续”。

### 【完整回答】

[查看完整回答](<./QA/Agent 故障恢复通过失败分类、安全重试与业务对账保护执行一致性.md>)

### 【继续展开】

- **追问：为什么 Checkpoint 能恢复 Agent State，却不能保证业务 Exactly-once？**
  - 可继续阅读：[Agent 长任务通过任务分解、持久化状态与验收实现持续推进和恢复](<./QA/Agent 长任务通过任务分解、持久化状态与验收实现持续推进和恢复.md>)。
- **追问：怎样从运行记录中判断失败发生在哪一步、恢复是否正确？**
  - 可继续阅读：[Agent 可观测体系通过 Trace、Span、指标与审计解释执行过程](<./QA/Agent 可观测体系通过 Trace、Span、指标与审计解释执行过程.md>)。

## 8. Agent 编排通过执行结构和决策权分配组织复杂任务

### 【提问】

- Workflow、Supervisor、Manager、Handoff、多 Agent 到底是什么关系？
- 什么步骤应该由代码控制，什么步骤可以交给模型动态决定？
- 多 Agent 是否一定意味着模型拥有更大的流程控制权？

### 【回答框架】

**核心回答：** Agent 编排首先是“决策权如何分配”的问题，其次才是 Workflow、Manager、Handoff、Multi-Agent 等执行拓扑的选择。

**回答路径：**

```text
面对复杂任务先不要选框架
        ↓
先判断哪些业务阶段是确定的
固定顺序 / 明确规则 / 高风险节点
→ Code 持有决策权
        ↓
再判断哪些步骤必须运行时动态决定
Planning / Tool Selection / Agent Selection
→ Model 获得局部决策权
        ↓
决策权划分以后
再决定任务怎样组织执行
→ Single Agent
→ Manager + Specialists
→ Handoff
→ Parallel / Graph
        ↓
模型能自主到什么程度？
→ Goal / Permission / Budget / Verification / Human Gate
        ↓
形成混合编排
确定性骨架 + 局部动态决策
```

**必须补充的边界：** Multi-Agent 不等于模型拥有更大控制权；Manager、Handoff、Parallel 描述不同协作方式；确定性 Workflow 与 Agent 动态决策可以同时存在。

**收束：** 回答编排题应先讲“谁决定下一步”，再讲“多个执行单元怎样组织”，最后说明自主权如何被业务边界限制。

### 【完整回答】

[查看完整回答](<./QA/Agent 编排通过代码与模型分配不同范围的执行决策权.md>)

### 【继续展开】

- **追问：当模型只负责一个局部动态节点时，Agent Loop 与外层 Workflow 怎样分工？**
  - 可继续阅读：[Harness、Runtime 与 Loop 分别承担运行支撑、执行管理和决策循环](<./QA/Harness、Runtime 与 Loop 分别承担运行支撑、执行管理和决策循环.md>)。
- **追问：复杂编排跨越多个阶段后，怎样保存进度并支持中断恢复？**
  - 可继续阅读：[Agent 长任务通过任务分解、持久化状态与验收实现持续推进和恢复](<./QA/Agent 长任务通过任务分解、持久化状态与验收实现持续推进和恢复.md>)。
