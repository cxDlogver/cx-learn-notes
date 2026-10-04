# Agent 故障恢复通过失败分类、安全重试与业务对账保护执行一致性

## 【知识概述】

这篇知识点想解决的是：**Agent 调用模型、Tool 或外部服务失败以后，怎样判断真实世界到底发生了什么，并从不会破坏业务一致性的位置继续执行。**

最容易产生的问题是把“调用报错”直接理解成“动作没有执行”。例如支付请求超时，只能说明调用方没有收到确定 Response，并不能证明支付服务没有完成扣款。如果此时直接 Retry，就可能产生重复副作用。因此故障恢复的起点不是重试，而是先识别失败类型。

系统首先通过 Timeout、最大轮数、Retry Budget 等 **Execution Boundary** 判断一次执行何时应该停止等待。出现错误以后再进行 **Failure Classification**：临时网络异常、确定性参数错误、权限或业务拒绝、Unknown Outcome 的恢复方式完全不同。

```text
执行出现异常
        ↓
先判断失败属于什么类型
        ↓
再判断上一次动作能否安全重放
        ├─ 可以安全重放
        │   → Retry / Backoff
        │
        └─ 无法确认执行结果
            → Reconciliation
               查询真实业务状态
```

如果确认动作根本没有执行，可以安全重放；如果确认已经执行，就应该复用真实结果而不是再次调用；如果已经产生了需要撤销的业务副作用，则可能通过 **Compensation** 用新的业务动作进行抵消。对于写数据库、支付、发送消息等操作，**Idempotency Key / Operation Record** 又进一步降低重复执行风险。

State 和 Checkpoint 在这里解决的是“Agent 内部从哪里继续”，却不能单独保证外部系统 Exactly-once；这正是 Fault Recovery 与 Long-running Task 相交但不能完全合并的地方。与此同时，权限或风控拒绝属于业务决策，不能通过 Retry 或 Fallback 绕过；整个恢复过程又需要 Observability 记录失败、重试、对账和补偿结果。

因此这篇知识点的主线不是“有哪些重试策略”，而是 **失败识别 → 判断副作用状态 → 选择安全恢复方式 → 从可信状态继续**。

## 1. 执行预算与失败分类为故障处理建立边界

### 【可靠执行的目标：失败以后系统仍然保持可控】

Agent 系统天然依赖多个不稳定环节：

```text
Agent Run
│
├─ Model API
├─ Tool / MCP
├─ HTTP Service
├─ Database
├─ Human Approval
└─ Other Agent
```

任意一层都可能出现：

```text
Timeout
Network Error
429 / 5xx
参数错误
权限错误
Tool Crash
Process Crash
人工拒绝
返回结果丢失
```

因此生产系统不能把 Action 简单理解成：

```text
Action
↓
Success / Failure
```

而应该至少考虑三种结果：

```text
Action
↓
Success
Failure
Unknown Outcome
```

Unknown Outcome（结果未知）尤其重要。例如支付服务已经完成扣款，但 Response 在网络中丢失，Agent 只看到 Timeout。此时 Timeout 并不能证明支付失败，如果直接 Retry，就可能重复扣款。

所以可靠执行真正追求的是：

> **失败能够被及时发现，失败类型能够被明确判断，系统能够从正确的位置恢复，并且恢复过程不能破坏已经发生的真实业务状态。**

### 【第一层：Execution Boundary——先限制一次执行的边界】

Timeout（超时）负责把“无限等待”转换成一个明确的 Failure Signal（失败信号）。

例如 Model Call、Tool Call、Workflow Node 都应该有各自的执行边界：

```text
Model Call
→ Model Timeout

Tool Call
→ Tool Timeout

Workflow Node
→ Node Timeout / Budget
```

OpenAI Agents SDK 当前允许在 Model Settings 中设置模型调用的超时和重试策略，也允许 Function Tool 定义执行超时。Tool 超时后可以把错误作为 Tool Result 返回模型，也可以直接抛出异常终止当前 Run。[[1]](https://openai.github.io/openai-agents-python/models/) [[2]](https://openai.github.io/openai-agents-python/ref/tool/)

因此 Timeout 本身不是 Recovery，而只是：

> **让一次执行在超过合理时间以后结束，并把“卡住”转换成后续系统能够处理的失败状态。**

### 【第二层：Failure Classification——失败以后先分类，而不是立即 Retry】

下列四类是本文建议的工程分类，不是框架统一枚举。401 / 403 / 404 等通常意味着在凭据、参数与资源条件不变时，原样重试不能解决问题；条件修复后可按新的授权方案继续。未知结果不应无保护重放，应先查询操作状态，或仅在服务端可靠幂等且复用同一操作键时按策略重放。

#### <u>1. Transient Failure：临时性失败</u>

例如：

```text
Network Timeout
429 Too Many Requests
502 / 503
短暂数据库连接失败
服务暂时不可用
```

这类错误的特点是：

> **相同请求经过一段时间后重新执行，有较大概率成功。**

因此通常可以进入：

```text
Retry
+
Backoff
```

#### <u>2. Permanent Failure：确定性失败</u>

例如：

```text
401 Unauthorized
403 Forbidden
404 Resource Not Found
参数结构错误
业务数据非法
确定性的代码错误
```

这类问题通常不会因为等待几秒再执行一次而消失，因此不应该盲目 Retry，而应该进入：

```text
Repair
Fallback
Human Escalation
Stop
```

#### <u>3. Business Rejection：业务主动拒绝</u>

例如：

```text
Guardrail Reject
Authorization DENY
Human Approval Reject
```

这不是系统故障，而是系统按照治理规则明确拒绝当前 Action。

因此：

```text
Reject
≠
Retryable Error
```

如果人工已经拒绝高风险操作，Agent 不应该简单重新发起相同操作来绕过治理逻辑。

#### <u>4. Unknown Outcome：执行结果未知</u>

例如：

```text
Tool Call
↓
外部服务已经开始处理
↓
网络 Timeout
```

系统无法确定：

```text
根本没有执行
还是
已经执行，只是结果没有返回
```

缺少可靠幂等保护时，这类情况不能直接 Retry，应先执行 Reconciliation（状态核对）；具备下游原生幂等保护时，可复用同一操作键按策略重放：

```text
payment(transaction_id)
↓
Timeout
↓
queryPayment(transaction_id)
↓
确认真实状态
↓
Retry / Skip / Resume
```

## 2. 安全重试、降级与状态恢复按最小范围推进

### 【第三层：Retry——只重新执行允许安全重放的操作】

模型重试策略也应检查 HTTP 状态、`retry-after`、响应是否已经开始，以及当前请求能否安全重放。普通 retry 许可不绕过重放保护；模型调用 timeout 通常只限制一次 attempt，不同时限制整个 Run、Tool 和退避等待，需要分别设预算。[[1]](https://openai.github.io/openai-agents-python/models/)

Retry（重试）不是“发生错误就再来一次”，而是：

> **确认错误具有临时性，并且这个 Action 可以安全重复执行以后，再重新执行。**

一个完整 Retry Policy（重试策略）至少需要定义：

```text
哪些异常允许 Retry
最多 Retry 几次
每次 Retry 等多久
什么情况下立即停止
```

常见策略包括：

```text
Max Attempts
Initial Delay
Backoff Factor
Max Interval
Jitter
Retryable Errors
```

其中 Exponential Backoff（指数退避）表示失败次数越多，下一次 Retry 等待时间越长；Jitter（随机抖动）是在等待时间中增加随机量，避免大量任务同时失败后再次同时请求。

LangGraph 当前的 `RetryPolicy` 就包含 `initial_interval`、`backoff_factor`、`max_interval`、`max_attempts`、`jitter` 和 `retry_on` 等配置。[[3]](https://docs.langchain.com/oss/python/langgraph/fault-tolerance)

OpenAI Agents SDK 当前的模型级 Retry 同样允许根据 Error、HTTP Status、Network Error、Timeout 和 Replay Safety（重放安全性）决定是否继续重试。[[1]](https://openai.github.io/openai-agents-python/models/)

这里最重要的判断是：

```text
Retryable Error
≠
一定可以 Retry
```

还必须满足：

```text
Replay Safe
```

也就是：

> **即使执行过程被重复一遍，也不会产生不可接受的重复副作用。**

### 【Retry 应该按照最小恢复范围分层】

LangGraph 可将节点 `RetryPolicy` 与 `error_handler` 组合：异常发生后先判断是否重试，不可重试或次数耗尽时再进入已配置的恢复处理器。当前文档说明节点超时与节点错误处理器要求 `langgraph>=1.2`；人工 `interrupt()` 使用暂停路径，不走普通重试或错误处理器。[[3]](https://docs.langchain.com/oss/python/langgraph/fault-tolerance)

一次 Agent Task 内部可能同时存在多层 Retry：

```text
Workflow
│
├─ Task Retry
├─ Agent / Node Retry
├─ Model Retry
├─ Tool Retry
└─ External API Retry
```

原则应该是：

> **失败能够在越小的局部范围内恢复，就越不要扩大到更高层重新执行。**

例如：

```text
Model API 503
↓
Retry Model Call
```

而不是：

```text
Model API 503
↓
重新执行整个 Coding Task
```

因为 Retry 范围越大：

```text
重复计算越多
成本越高
恢复时间越长
重复副作用风险越大
```

### 【第四层：Fallback——原执行路径无法恢复时切换备用路径】

Fallback（备用路径或降级）与 Retry 不同：

```text
Retry
→ 同一种执行方式再执行一次

Fallback
→ 换一种仍然可以完成目标的执行方式
```

例如：

```text
Primary Model 长时间不可用
→ Fallback Model

Tool A 不可用
→ Tool B

自动修改代码风险过高
→ 只生成 Patch，交给人工确认
```

因此 Fallback 应由 Workflow 或 Harness 显式设计，而不能默认把所有恢复决策都交给模型临时判断。

### 【第五层：Recovery——恢复整个任务到可以继续执行的状态】

Retry 解决的是：

> **某一步重新执行。**

Recovery（故障恢复）解决的是：

> **系统已经发生故障以后，怎样恢复到一个一致、能够继续运行的状态。**

例如：

```text
Process Crash
↓
Worker Restart
↓
Load Checkpoint
↓
Restore Workflow State
↓
Restore RunState if needed
↓
Reconcile Side Effect
↓
Resume
```

因此 Recovery 是一个更大的过程：

```text
Recovery
│
├─ Restore State
├─ Reconcile
├─ Retry
├─ Resume
├─ Fallback
└─ Compensation
```

OpenAI Agents SDK 可以通过 `RunState` 保存一次 Agent Run 的可序列化状态，并在 HITL 等暂停场景中重新加载后继续 `Runner.run(agent, state)`；对于跨长等待、Retry 和进程重启的 Durable Execution（持久执行），OpenAI 当前则提供与更上层持久化编排系统组合的方式。[[4]](https://openai.github.io/openai-agents-python/running_agents/) [[5]](https://openai.github.io/openai-agents-python/human_in_the_loop/)

### 【Checkpoint 的意义：复用已经确认成功的工作】

恢复时不能简单理解为“重新执行全部步骤”。

例如同一个并行阶段：

```text
Node A
成功

Node B
成功

Node C
失败
```

如果 A、B 的结果已经被 Checkpoint 或 Pending Writes（待提交写入）记录，恢复时应尽可能复用这些已经成功的结果，而不是把 A、B、C 全部重新执行。

LangGraph 在同一 super-step 中保存已成功节点的 Pending Writes，恢复时可复用这些结果，避免重跑已持久写入的成功节点。Pending Writes 是该轮的节点输出，不等于完整的 StateSnapshot；尚未可靠保存的工作和节点内代码仍可能重放。[[6]](https://docs.langchain.com/oss/python/langgraph/checkpointers)

这体现了一个重要原则：

> **恢复不是简单重跑，而是从最近一个可信状态继续。**

---

## 3. 幂等、对账与补偿保护外部业务一致性

### 【第六层：Idempotency——保证重复执行不会产生重复业务结果】

Checkpoint 能解决：

```text
中断以后从哪里继续
```

但不能自动解决：

```text
外部操作到底有没有已经执行成功
```

例如：

```text
chargeCard()
↓
银行已经扣款成功
↓
Process Crash
↓
成功结果还没有写入 Checkpoint
```

恢复以后如果直接 Retry，就可能再次扣款。

因此具有真实 Side Effect（副作用）的 Action 通常需要设计 Idempotency（幂等性）：

> **同一个业务操作即使因为 Retry 被执行多次，最终业务效果仍然等价于执行一次。**

典型方法是为每个业务操作建立稳定的 `operation_id / idempotency_key`：

```text
task_id
+
subtask_id
+
operation_name
↓
idempotency_key
```

例如：

```ts
await charge({
  idempotencyKey:
    "task123:payment:charge"
});
```

Backend 可以先查询这个 Key 是否已经完成：

```text
收到 operation_id
↓
之前执行过？
├─ Yes
│   ↓
│ 返回之前保存的结果
│
└─ No
    ↓
执行真实业务
    ↓
保存 Operation Result
```

Temporal 官方长期强调：Activity 可能由于失败而重新执行，因此具有 Side Effect 的 Activity 应尽量设计成幂等，否则自动 Retry 可能产生重复扣款、重复发送等结果。[[7]](https://docs.temporal.io/activity-definition)

### 【第七层：Reconciliation——结果未知时先核对真实世界状态】

Idempotency 能降低重复执行风险，但对于 Unknown Outcome，系统仍然应该有 Reconciliation（状态核对）能力。

例如：

```text
createOrder(operation_id)
↓
Timeout
↓
queryOperation(operation_id)
```

然后：

```text
SUCCESS
→ 复用已有结果

FAILED
→ 判断是否 Retry

UNKNOWN
→ 继续查询 / 升级人工
```

所以：

> **Timeout 只能证明调用方没有及时拿到结果，不能证明外部操作没有发生。**

因此对于具有真实 Side Effect 的操作，正确链路应该是：

```text
Timeout
↓
Reconcile
↓
确认真实状态
↓
Retry / Skip / Resume
```

### 【第八层：Compensation——无法直接回滚时用反向业务操作恢复一致性】

补偿目标是恢复可接受的业务一致性，不保证抹去所有历史影响或回到物理上的原始状态。例如邮件已经送达，补偿只能更正或通知。Saga 参与者需要支持幂等；同一业务操作的键、参数和执行结果应持久记录。[[8]](https://docs.aws.amazon.com/prescriptive-guidance/latest/cloud-design-patterns/saga-orchestration.html)

如果任务包含多个外部业务步骤：

```text
Create Order
↓
Lock Inventory
↓
Charge Payment
```

而 Payment 最终失败，此时前两步可能已经在不同系统中真正提交。

它们通常无法像单数据库事务一样：

```text
ROLLBACK
```

这时需要 Compensation（补偿操作）：

```text
Create Order
→ Cancel Order

Lock Inventory
→ Release Inventory

Charge Payment
→ Refund Payment
```

这就是 Saga Pattern（Saga 模式）中的核心思想：当后续步骤失败时，通过 Compensating Transaction（补偿事务）抵消前面已经提交的业务影响。AWS 的 Saga 指南明确把 Compensation 和 Idempotency 作为分布式长事务恢复的重要机制。[[8]](https://docs.aws.amazon.com/prescriptive-guidance/latest/cloud-design-patterns/saga-orchestration.html)

需要注意：

```text
Compensation
≠
Rollback
```

Rollback 是撤销一个尚未提交完成的事务；Compensation 则是执行一个新的业务动作，抵消之前已经发生的业务结果。

因此补偿动作本身也需要：

```text
Retry
Idempotency
Observability
```

## 4. 分层故障决策把局部处理连接到整个任务恢复

### 【统一的 Failure Decision Chain】

把前面的机制串起来以后，一次失败可以按照下面的方式处理：

```text
Action Failure → Failure Classification
├─ Transient（临时异常）
│  ├─ 已确认可安全重放 → 有限 Retry + Backoff → 成功则继续
│  └─ 不可安全重放或预算耗尽 → Reconcile / 授权的 Fallback / Stop
├─ Permanent（当前条件下的确定错误）
│  └─ 修正条件 / 人工处理 / 获授权的替代方案 / Stop
├─ Business Rejection（业务拒绝）
│  └─ 保存拒绝原因 → 停止原操作；不能借 Fallback 绕过规则
└─ Unknown Outcome（结果未知）
   ├─ 对账确认已成功 → 复用结果 → Resume
   ├─ 对账确认未生效且可安全重放 → 按策略 Retry
   ├─ 下游提供可靠幂等 → 复用同一操作键按策略重放
   └─ 仍无法确认且缺少幂等保障 → 保留待处理状态 / 人工处理

Recovery：恢复可信 State → 核对副作用 → Resume
已提交副作用无法直接回滚时：按业务规则 Compensation
全过程：Trace / Operation Record / Audit
```

这比简单的：

```text
失败
↓
Retry 3 次
```

更接近生产级可靠执行。

### 【可靠执行体系的分层】

最终可以把整个可靠执行体系分成四个主要层级，并由 Observability 横向贯穿。

#### <u>1. Operation Reliability：单次操作可靠性</u>

解决一次 Model / Tool 调用：

```text
Timeout
Retry
Backoff
Replay Safety
```

#### <u>2. Agent / Node Reliability：局部执行单元可靠性</u>

解决一个 Agent 或 Workflow Node：

```text
Retry Policy
Fallback
Error Handler
HITL
```

#### <u>3. Workflow Reliability：长任务可靠性</u>

解决整个长任务：

```text
State
Checkpoint
Recovery
Resume
```

#### <u>4. Business Consistency：真实业务状态一致性</u>

解决已经影响外部世界的操作：

```text
Idempotency
Operation Record
Reconciliation
Compensation
```

而 Observability（可观测性）横向记录：

```text
失败发生在哪一步
Retry 了多少次
为什么触发 Fallback
是否发生 Reconciliation
是否执行 Compensation
最终状态是什么
```

因此整体框架可以表示为：

```text
                  Agent Workflow
                        │
                        ↓
                Agent / Node Runtime
                        │
                        ↓
                 Model / Tool Action
                        │
               ┌────────┴────────┐
               ↓                 ↓
            Success           Failure
               │                 │
               │                 ↓
               │        Timeout + Classification
               │                 ↓
               │          Replay Safety
               │                 ↓
               │      Retry / Fallback / Stop
               │                 ↓
               │          Recovery Layer
               │                 ↓
               │      State / Checkpoint / Resume
               │                 ↓
               │       Business Consistency
               │                 ↓
               │  Idempotency / Reconcile /
               │       Compensation
               │                 │
               └────────┬────────┘
                        ↓
                   Continue Task
                        ↓
                  Observability
```

### 【与长任务状态管理的关系】

关联的[长任务持续推进与恢复](<./Agent 长任务通过任务分解、持久化状态与验收实现持续推进和恢复.md>)问题解决的是：

```text
任务如何保存有效进度
以及
中断以后从哪里恢复
```

这一题进一步解决：

```text
恢复以后
怎样保证继续执行本身是安全的
```

两者合起来才形成完整长任务可靠性：

```text
Long-running Agent
        ↓
Task Decomposition
        ↓
State / Artifact
        ↓
Checkpoint
        ↓
Failure
        ↓
Failure Classification
        ↓
Retry / Fallback / Reconcile
        ↓
Recovery / Resume
        ↓
Idempotency / Compensation
        ↓
Continue
```

**核心认识**

Agent Reliable Execution（可靠执行）的核心不是“自动 Retry”，而是：

> **先为 Model、Tool 和 Workflow Node 建立明确的执行边界；发生失败以后，由确定性规则判断它属于临时异常、永久错误、业务拒绝还是结果未知，再决定是否允许 Retry。对于可以重试的操作，需要同时控制 Retry 次数、Backoff 和 Replay Safety；对于跨进程或长任务失败，需要依赖 State 和 Checkpoint 恢复，并从最近的有效位置 Resume；对于已经影响外部真实系统的 Tool Call，则必须通过 Idempotency、Operation Record 和 Reconciliation 确认真实状态，在无法直接回滚时再通过 Compensation 恢复业务一致性。**

因此真正应该记住的是：

```text
Execute
↓
Detect Failure
↓
Classify
↓
Check Replay Safety
↓
Retry / Fallback / Reconcile
↓
Recover State
↓
Resume
↓
Protect Side Effects
↓
Compensate if Needed
↓
Continue
```

它说明 Agent 从“能够执行任务”走向“能够可靠执行生产任务”，关键不在于增加更多 Retry，而在于建立一套完整的**失败分类、局部恢复、状态恢复和真实业务一致性机制**。

## 5. 参考文献

[1] OpenAI. [Models — OpenAI Agents SDK (Python)](<https://openai.github.io/openai-agents-python/models/>)[EB/OL]. 核验日期：2026-10-04。

[2] OpenAI. [Tools — OpenAI Agents SDK (Python)](<https://openai.github.io/openai-agents-python/ref/tool/>)[EB/OL]. 核验日期：2026-10-04。

[3] LangChain. [Fault tolerance](<https://docs.langchain.com/oss/python/langgraph/fault-tolerance>)[EB/OL]. 核验日期：2026-10-04。

[4] OpenAI. [Running agents — OpenAI Agents SDK (Python)](<https://openai.github.io/openai-agents-python/running_agents/>)[EB/OL]. 核验日期：2026-10-04。

[5] OpenAI. [Human-in-the-loop — OpenAI Agents SDK (Python)](<https://openai.github.io/openai-agents-python/human_in_the_loop/>)[EB/OL]. 核验日期：2026-10-04。

[6] LangChain. [Checkpointers](<https://docs.langchain.com/oss/python/langgraph/checkpointers>)[EB/OL]. 核验日期：2026-10-04。

[7] Temporal Technologies. [Activity Definition](<https://docs.temporal.io/activity-definition>)[EB/OL]. 核验日期：2026-10-04。

[8] Amazon Web Services. [Saga orchestration pattern](<https://docs.aws.amazon.com/prescriptive-guidance/latest/cloud-design-patterns/saga-orchestration.html>)[EB/OL]. 核验日期：2026-10-04。
