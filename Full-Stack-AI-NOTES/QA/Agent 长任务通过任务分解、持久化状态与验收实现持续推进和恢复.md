# Agent 长任务通过任务分解、持久化状态与验收实现持续推进和恢复

## 【知识概述】

**Agent 长任务的难点，是在多轮调用、会话切换或进程中断之后，仍然知道已经完成什么、哪些结果可信，以及下一步应该从哪里继续。** “长”不仅指运行了多久，也包括任务超出一次模型调用或一个上下文窗口的承载范围。解决它需要把任务进度作为可保存、可验证的工程状态来管理。

### 【把长期目标组织成可推进、可验收的工作】

假设 Agent 要修复登录错误，还要补充测试、验证兼容性并整理交付说明。只保留一句“完成登录修复”，中断以后很难判断代码是否已经改过、测试有没有执行，以及文档是不是基于最新结果生成的。因此可以将目标组织为定位问题、修改代码、验证行为和整理说明等工作单元，并记录它们的依赖关系。

**任务分解（Task Decomposition）**的价值在于建立清楚的进度和验收边界，而不是固定拆成越多步骤越好。某些步骤可以提前定义，另一些需要根据排查结果调整。例如，测试发现问题出在配置以后，后续工作应据此更新，而不是继续照着最初计划修改无关代码。关于跨会话任务如何依靠进度记录和产物持续推进，Anthropic 的长任务实践提供了具体案例。[[1]](https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents)

### 【分别保存状态、产物和恢复位置】

**State（任务状态）**记录执行事实，例如当前阶段、已完成事项、失败结果和待确认操作；**Artifact（产物）**是实际生成或修改的代码、文档、报告等；**Checkpoint（检查点）**保存框架支持的恢复位置及相关状态。文件已经生成，不代表系统知道应从哪个节点恢复；只保存一个恢复位置，也不代表代码产物已经可靠落盘。

**Context（上下文）**是当前轮次送给模型的信息，可以根据持久化状态、必要产物和最新观察重新构建；**Memory（记忆）**保存可供后续调用或任务复用的信息，例如项目约定。它们能帮助模型继续理解任务，但简短记忆摘要不应独自承担“某个操作是否执行成功”的权威判断。

```text
目标：修复登录并交付说明
  → 建立工作单元和依赖关系
  → 执行修改，保存代码产物及实际状态
  → 检查测试证据，标记结果是否通过验收
  → 在支持的边界保存恢复状态
中断后
  → 读取进度和产物，核对当前环境
  → 重建本轮上下文，继续未完成工作
```

### 【把“做过”与“已经通过验收”分开记录】

模型调用修改工具成功，通常只说明文件修改操作完成；登录行为是否修复，还需要通过**Verification（验收验证）**检查。验证方式可以是测试、规则、专门的评估器或人工检查，取决于任务目标。后续阶段应基于相应的可信结果推进，例如交付说明应引用真正执行过的验证结果。

状态保存也不应只在成功时发生。测试失败、等待审批或外部操作结果未知，都需要持久记录，帮助恢复时识别真实处境。系统可以区分“修改已写入”“验证未完成”“验证通过”等状态，而不是把所有操作都混成一个“已完成”标记。检查点能恢复到哪里，则取决于具体框架、持久化策略及故障发生的位置。

### 【恢复前核对外部事实，避免重复执行】

中断后，外部环境可能已经变化。例如修复过程中创建了一个测试工单，服务已创建成功，但进程在保存返回结果前退出。如果只依据旧状态再次创建，就可能产生重复记录。**Reconciliation（对账）**是在恢复时查询实际环境，确认动作是否已经发生；**Idempotency（幂等性）**则让同一业务操作的安全重放不会造成重复效果，需要相应接口或存储机制支持。

这也说明保存 Checkpoint 不等于所有外部动作都只会执行一次。恢复时要同时考虑内部状态和外部事实；无法确认的写操作应保留为待核对事项，不能直接当作失败重做。如果权限、文件版本或审批条件发生变化，也需要重新核验当前是否仍允许执行。

长任务机制主要保持跨时间的连续进度，故障恢复进一步决定遇到错误时怎样安全继续，编排则决定工作单元之间的推进关系。理解这些分工以后，正文中的任务分解、状态持久化、运行恢复和副作用处理，就可以沿着“记录真实进度 → 验证阶段结果 → 保存恢复依据 → 核对环境后继续”的主线阅读。

## 1. 任务分解与 State 让长任务进度可以独立推进和验收

### 【核心目标：运行可以中断，但任务进度不能丢失】

一个复杂 Agent Task 可能无法在一次模型调用或一次 Context Window 中完成，甚至可能跨多个 Session、多个进程和较长时间周期。

例如：

```text
需求分析
↓
代码分析
↓
技术方案
↓
代码修改
↓
测试
↓
人工审批
↓
发布
```

中间可能出现：

```text
Context Window 达到上限
进程重启
Tool Timeout
网络错误
等待人工数小时
执行节点被重新调度
```

如果任务的关键状态只存在当前进程内存中，一旦进程结束，就只能依赖模型重新理解历史，甚至重新从头执行。

因此长任务 Harness（运行支撑层）真正需要保证的是：

> **某一次 Agent Run 可以结束，某一个进程也可以失败，但已经完成并验证过的任务进度必须独立于运行进程被保存下来。**

这也是为什么长任务稳定性不能只依赖 Context Compaction（上下文压缩）。Anthropic 的长任务实验明确指出，仅仅压缩 Context 并不足以保证跨多个 Session 的工作连续性，因此需要把任务进度和关键产物写到模型上下文之外的持久化环境中。[[1]](https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents)

### 【第一层：先把长任务拆成可独立推进和验收的子任务】

拆分是为了让进度和验收可检查，具体粒度应由任务与模型能力决定。Anthropic 的长任务实验也曾随模型升级移除 sprint 分解，把每阶段评测改为最终评测；因此 Planner / Generator / Evaluator 是一种可选组织方式，不能当作所有长任务的固定标准。[[2]](https://www.anthropic.com/engineering/harness-design-long-running-apps)

长任务稳定执行的第一步不是 Checkpoint，而是 Task Decomposition（任务拆分）。

一个过大的目标：

```text
“完成整个系统开发”
```

应该被拆成：

```text
Long Task
│
├─ Subtask 1
│  Goal
│  Input
│  Acceptance Criteria
│  Expected Artifact
│
├─ Subtask 2
│  Goal
│  Input
│  Acceptance Criteria
│  Expected Artifact
│
└─ Subtask N
   Goal
   Input
   Acceptance Criteria
   Expected Artifact
```

每个 Subtask（子任务）最好具有独立的：

```text
Goal
明确目标

Input
执行输入

Acceptance Criteria
验收标准

Artifact
阶段产物

Evidence
验收证据

Status
执行状态
```

这样系统就能建立一个明确的提交边界：

```text
Subtask
↓
Agent 执行
↓
Evaluation
验收
↓
Pass
↓
持久化 Artifact
↓
更新 State = Completed
↓
进入下一 Subtask
```

Anthropic 2026 年的长任务 Harness 实践进一步采用 Planner / Generator / Evaluator 结构，把复杂应用拆成可处理的工作块，并通过结构化 Artifact 在不同执行阶段之间传递上下文。[[2]](https://www.anthropic.com/engineering/harness-design-long-running-apps)

所以长任务不是依赖一个模型一直“记住全部历史”，而是依赖：

> **一系列已经被执行、验收并持久化提交的工作单元。**

### 【第二层：State Management 记录任务当前真实执行状态】

State（状态）并不是 Agent 特有概念。前端 Redux / Pinia、Workflow Engine、数据库事务都需要状态管理。

它最基本的含义是：

> **保存能够描述系统当前真实运行状态的数据。**

在长任务 Agent 中，State 最好进一步区分为两个层级。

#### <u>1. Workflow State：记录整个长任务推进到哪里</u>

Workflow State（工作流状态）回答：

> **整个长任务当前执行到哪个阶段、哪个子任务。**

例如：

```ts
type WorkflowState = {
  taskId: string;

  status:
    | "running"
    | "waiting"
    | "failed"
    | "completed";

  currentStage: string;
  currentSubtaskId: string;

  completedSubtasks: string[];
  pendingSubtasks: string[];

  artifactRefs: string[];
};
```

某一时刻可能是：

```text
Task = task_123

currentStage = testing

completedSubtasks =
- requirement-analysis
- implementation

currentSubtask = run-tests

pendingSubtasks =
- review
- release
```

发生中断以后，上层 Workflow 可以根据这份状态判断：

```text
需求分析已经完成
开发已经完成
当前应该从 Testing 继续
```

而不是重新执行整个任务。

#### <u>2. Agent RunState：记录一个子任务内部执行到哪里</u>

进入一个 Subtask 以后，Agent Runtime 内部还有更细粒度的运行状态。

例如：

```text
Subtask：修复登录问题

已经读取 auth.ts
已经执行 search_code
已经生成一次 Model Response
已经完成 write_file
当前等待 run_test
```

这一层可能包含：

```text
Current Agent
Model Responses
Generated Items
Tool Calls
Tool Results
Usage
Approval State
Interruptions
Runtime Context
```

OpenAI Agents SDK 当前的 `RunState` 就属于这一层。官方将其定义为：

> **“Serializable snapshot of an agent run.”**
>
> 即：一次 Agent Run 的可序列化快照。[[3]](https://openai.github.io/openai-agents-python/ref/run_state/)

它保存足够的信息，使一次被暂停的 Agent Run 可以继续执行，包括 Context、Usage、Model Responses、Generated Items、Approval State 和 Interruptions 等。[[3]](https://openai.github.io/openai-agents-python/ref/run_state/)

因此层级应该理解成：

```text
Long Task
│
└─ Workflow State
   整个任务推进到哪个 Subtask
        │
        ↓
   Current Subtask
        │
        └─ Agent RunState
           当前 Agent Loop 执行到哪一步
```

这两个 State 不能混为同一个层级。

## 2. 持久化状态与产物为上下文构建和恢复提供依据

### 【第三层：Persistence 把关键状态从进程内存中解耦出来】

State 描述“当前是什么状态”，但 State 本身并不天然等于持久化数据。

例如：

```ts
let currentStage = "testing";
```

它也是 State，只是存在当前 Process Memory（进程内存）中。

长任务需要进一步做 Persistence（持久化）：

> **把任务的重要状态保存到进程生命周期之外的存储中，使新的进程、Session 或 Agent Run 能够重新读取。**

例如：

```text
Runtime State
        ↓
Serialize
序列化
        ↓
Database / File / Git / Object Store
        ↓
Process Exit
        ↓
Load
        ↓
恢复 State
```

所以要区分：

```text
State
→ 要保存哪些运行事实

Persistence
→ 这些事实怎样跨进程长期保存
```

在持久化层中，又可以进一步区分 Artifact、Checkpoint 和 Memory。

#### <u>1. Artifact：保存任务已经产生的长期结果</u>

Artifact（产物）可以理解成：

> **一个阶段或子任务执行后产生，并且后续阶段还需要读取、验证或交付的持久化结果。**

例如 Coding Agent：

```text
requirements.md
implementation-plan.md
Git Commit
patch.diff
test-report.json
screenshot.png
review-result.json
```

Workflow State 可以只保存：

```json
{
  "subtask": "login",
  "status": "completed",
  "artifactRefs": [
    "commit-a8d012",
    "test-report-18"
  ]
}
```

而真正的代码、Commit、测试报告本身才是 Artifact。

所以：

```text
State
→ “登录功能已经完成，产物是 artifact_001”

Artifact
→ artifact_001 对应的代码、文档或测试结果本身
```

Anthropic 的长期 Agent 实践使用进度文件、Feature List 和 Git History 来保存这种外部事实，使新的 Session 可以先读取这些 Artifact，再继续工作。[[1]](https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents)

Artifact 的核心价值是：

> **任务进度不再依赖模型自己“记住”，而是拥有可以重新读取和检查的外部事实依据。**

#### <u>2. Checkpoint：保存一个可恢复时刻的运行状态</u>

Checkpoint（检查点）解决的是：

> **如果系统现在中断，以后应该从哪个状态重新开始。**

它本质上是某一个安全执行位置上的状态快照。

例如：

```text
Subtask 1 完成
↓
Checkpoint A

Subtask 2 执行到 Tool Approval
↓
Checkpoint B
```

Checkpoint A 可能只需要保存：

```text
completed = [subtask1]
current = subtask2
artifactRefs = [...]
```

而 Checkpoint B 可能还需要保存更完整的 Agent RunState：

```text
Model Responses
Generated Items
Pending Approval
Current Agent
Context
Usage
```

OpenAI Agents SDK 的 Human-in-the-loop（人工介入）就是一个非常典型的 Checkpoint / Resume 场景：工具需要审批时，Run 会产生 Interruption；应用可以把 `RunState` 序列化到数据库或队列中，进程退出以后再重新加载该 State，批准或拒绝操作，并继续原来的 Run。官方支持将 `RunState` 序列化后持久保存，并在后续进程中恢复运行；数据库、审批授权和可信快照存储仍由应用负责。[[5]](https://openai.github.io/openai-agents-python/human_in_the_loop/)

伪代码可以理解成：

```python
result = await Runner.run(agent, input)

if result.interruptions:
    state = result.to_state()

    # 持久化到数据库
    save(state.to_json())
```

未来恢复：

```python
state = await RunState.from_json(agent, saved_state)

# 服务端需先验证审批者身份、资源权限及批准的适用范围。
# approved_by_server 是应用根据已验证审批记录实现的匹配函数。
for interruption in state.get_interruptions():
    if approved_by_server(interruption):
        state.approve(interruption)

result = await Runner.run(
    agent,
    state
)
```

这里真正保存的是：

```text
“当前 Run 如何继续”
```

而不是整个企业业务 Workflow 的全部状态。

#### <u>3. Memory：保存未来交互仍需要使用的信息</u>

Memory（记忆）解决的问题和 State 不完全相同。

可以用一个简单判断来区分：

```text
State
→ 现在任务处于什么状态

Memory
→ 未来的交互还需要记住哪些过去的信息
```

工程上通常继续区分：

```text
Short-term Memory
短期记忆
→ 当前 Thread / Task 连续执行所需要的信息

Long-term Memory
长期记忆
→ 跨 Task / Session 仍然值得复用的信息
```

短期记忆可能包括：

```text
Conversation History
当前任务已经确认的事实
最近几轮模型结果
当前 Thread 的必要历史
```

OpenAI Agents SDK 的 `Session` 就属于这种持久化 Conversation History 的能力。官方将 Sessions 描述为 persistent memory layer，用于在多次 Agent Run 之间维护 working context。[[6]](https://openai.github.io/openai-agents-python/)

长期记忆则更适合保存：

```text
用户长期偏好
企业长期规则
已经确认的长期事实
历史任务总结出的经验
```

因此 OpenAI SDK 中也要特别区分：

```text
Session
→ Conversation History

RunState
→ 当前 Agent Run 的可恢复运行状态

Workflow State
→ 整个业务长任务的执行进度
```

三者不能统一叫成“Memory”。

### 【第四层：Context Management 是从持久化状态中构造当前模型输入】

Context 和 State 的边界也非常重要。

假设系统已经保存：

```text
Workflow State
20 个 Subtask

RunState
几十次 Tool Call

Conversation History
几百条 Message

Artifacts
大量文件和报告

Long-term Memory
大量历史记录
```

这些信息不能全部进入 Model Context。

Context Management（上下文管理）的职责是：

> **从系统拥有的完整状态、产物和记忆中，筛选、检索、压缩当前这一轮模型真正需要的信息。**

所以关系应该是：

```text
Workflow State
        │
RunState
        │
Artifact
        │
Short-term Memory
        │
Long-term Memory
        ↓
Context Builder
        ↓
Filter / Retrieve / Summarize / Compact
        ↓
Model Context
```

例如 Testing Agent 当前可能只需要：

```text
Task Goal
Current Stage = Testing
Acceptance Criteria
Current Code Artifact
Latest Test Result
Pending Issues
Next Step
```

而不需要读取需求阶段所有 Model Message。

因此一个很重要的结论是：

> **State 是系统知道什么，Context 是这一轮模型看到什么。Context 必然是对 State、Artifact 和 Memory 的选择与提炼，而不是把所有状态原样塞给模型。**

## 3. 子任务通过执行、验收和提交形成可信进展

### 【第五层：子任务按执行、验收与提交建立可信进展】

生产系统中，一个 Subtask 可以理解成一个“小型提交事务”。

完整过程建议是：

```text
Load Workflow State
        ↓
确定 Current Subtask
        ↓
Load Required Artifacts
        ↓
Load Relevant Memory
        ↓
Build Context
        ↓
Runner.run()
        ↓
Agent Loop
Model → Tool → Model
        ↓
产生 Result / Artifact
        ↓
Evaluation
按 Acceptance Criteria 验收
        ↓
     ┌──┴──┐
     ↓     ↓
    Fail   Pass
     ↓     ↓
 Retry /  Persist Artifact
 Repair       ↓
          Update Workflow State
               ↓
          Create Checkpoint
               ↓
          Next Subtask
```

伪代码可以写成：

```ts
async function executeTask(taskId: string) {
  let workflow = await stateStore.load(taskId);

  while (!workflow.completed) {
    const subtask = workflow.currentSubtask;

    const context = await buildContext({
      workflowState: workflow,
      artifacts: await artifactStore.getRelevant(subtask),
      memory: await memoryStore.retrieve(subtask),
    });

    const result = await runner.run(agent, context);

    const evaluation = await evaluate(
      result,
      subtask.acceptanceCriteria
    );

    if (!evaluation.passed) {
      workflow = await handleFailure(
        workflow,
        result,
        evaluation
      );

      await stateStore.save(workflow);
      continue;
    }

    const artifacts =
      await persistArtifacts(result);

    workflow.completeSubtask(
      subtask.id,
      artifacts
    );

    await stateStore.save(workflow);

    await checkpointStore.save({
      taskId,
      workflowState: workflow
    });
  }
}
```

这里最重要的顺序是：

```text
执行
↓
验收
↓
持久化 Artifact
↓
更新 Workflow State
↓
提交 Checkpoint
```

只有经过验收并成功持久化以后，一个 Subtask 才应该真正进入：

```text
Completed
```

## 4. 恢复在可信状态与副作用核对之后继续执行

### 【第六层：中断恢复不能只做 Retry，还必须处理副作用和幂等性】

如果 Agent 只读取 Checkpoint 然后重新执行，并不能保证一定安全。

例如：

```text
Tool: createOrder()
↓
订单已经创建成功
↓
Process Crash
↓
Workflow State 尚未写入 Completed
```

系统重启以后如果直接：

```text
Retry createOrder()
```

就可能产生第二个订单。

这是因为 `createOrder()` 产生了 Side Effect（副作用）：

> **Agent 的操作改变了外部真实系统状态。**

例如：

```text
写数据库
创建订单
发送邮件
转账
部署
删除文件
```

因此真正的 Recovery（故障恢复）需要：

```text
Load Latest Checkpoint
        ↓
Restore Workflow State
        ↓
Restore RunState（如果需要）
        ↓
检查已产生的外部 Side Effect
        ↓
Reconcile
确认真实世界状态
        ↓
决定：
Continue / Skip / Retry
```

这里还必须引入 Idempotency（幂等性）：

> **同一个业务操作因为恢复或 Retry 被重复调用时，最终业务效果仍然等价于执行一次。**

例如：

```ts
await createOrder({
  idempotencyKey:
    `${taskId}:${subtaskId}:create-order`
});
```

Backend 需要在实际写入端提供幂等保障。下面是机制示意，`withTransaction`、操作表和订单表由应用实现；同一事务中的唯一约束保证并发不会重复提交：

```ts
// 同库操作的机制伪代码；不能只做“查询 → 创建 → 保存”。
async function createOrder(input) {
  return database.withTransaction(async (tx) => {
    // key 必须绑定租户、动作与规范化参数；参数不一致应拒绝复用。
    const old = await tx.operations.find(input.idempotencyKey);
    if (old) return verifyPayloadAndReturn(old, input);
    // operation.key 有 UNIQUE 约束；并发冲突回滚后重读已提交结果。
    await tx.operations.claim(input.idempotencyKey, input);
    const order = await tx.orders.create(input.order);
    await tx.operations.complete(input.idempotencyKey, order);
    return order;
  });
}
```

创建和记录结果必须由同一事务提交，不能在两者之间留下崩溃窗口。涉及外部服务时，本地事务无法包住远端副作用，应复用下游原生幂等键并保存操作状态，超时后按键查询或对账；不能把“查询旧结果后再创建”的普通代码当作幂等保证。

恢复以后：

```text
Retry createOrder
↓
检查 idempotencyKey
↓
发现之前已经执行成功
↓
复用原 Result
↓
不重复产生 Side Effect
```

所以需要明确：

```text
Checkpoint
→ 解决“计算从哪里继续”

Idempotency
→ 解决“外部真实操作不能被重复执行”
```

两者解决的是不同层次的问题。

### 【OpenAI Agents SDK 在整个长任务体系中的位置】

OpenAI Agents SDK 主要解决的是 Agent Runtime 层：

```text
Current Subtask
        ↓
Runner
        ↓
Agent Loop
        ↓
Model
        ↓
Tool / Handoff / Guardrail
        ↓
下一轮 Model
```

官方当前的 Runner 会循环调用 Model、执行 Tool、处理 Handoff，直到得到 Final Output；当传入 `RunState` 时，也可以继续一个被暂停的 Run。[[4]](https://openai.github.io/openai-agents-python/running_agents/)

但是如果任务要跨：

```text
长时间等待
多次 Retry
Process Restart
Durable Workflow
```

官方当前进一步提供 Dapr、Temporal、Restate、DBOS 等 Durable Execution 集成。[[4]](https://openai.github.io/openai-agents-python/running_agents/)

因此更准确的层级是：

```text
Business Long-running Task
        │
        ↓
Workflow / Durable Orchestrator
        │
        ├─ Workflow State
        ├─ Subtask State
        ├─ Artifact
        ├─ Checkpoint
        └─ Retry / Recovery
        │
        ↓
OpenAI Agents SDK
        │
        ├─ Runner
        ├─ Agent Loop
        ├─ Session
        └─ RunState
```

所以不能简单认为：

```text
Runner.run()
= 完整长任务调度系统
```

更准确的是：

> **Agents SDK 负责一个 Agent Run 内部的执行和可恢复状态；更长生命周期的业务 Workflow、子任务进度和 Durable Execution，需要由外层 Workflow / Orchestrator 负责。**

### 【完整的长任务执行框架】

最终可以把整个体系组织成：

```text
                     Complex Long Task
                            │
                            ↓
                  Task Planning Layer
             Goal / Subtasks / Acceptance
                            │
                            ↓
                 Workflow State Layer
        completed / current / pending / failed
                            │
                            ↓
                    Current Subtask
                            │
                            ↓
                 Agent Runtime Layer
                      Runner / Loop
                            │
                       RunState
                            │
              Model → Tool → Model
                            │
                            ↓
                       Evaluation
                            │
               ┌────────────┴────────────┐
               ↓                         ↓
             Fail                       Pass
               ↓                         ↓
        Retry / Repair               Artifact
                                         ↓
                                  Persist Result
                                         ↓
                                Update Workflow State
                                         ↓
                                   Checkpoint
                                         ↓
                                   Next Subtask
```

如果运行中断：

```text
Process Failure / Pause
        ↓
Load Latest Checkpoint
        ↓
Restore Workflow State
        ↓
Restore RunState if needed
        ↓
Check Artifact
        ↓
Reconcile External Side Effects
        ↓
Rebuild Context
        ↓
Resume Current Subtask
        ↓
Continue Workflow
```

而每次重新进入模型之前：

```text
Workflow State
+
RunState
+
Relevant Artifact
+
Relevant Memory
        ↓
Context Builder
        ↓
Model Context
```

这样任务进度、持久化数据和模型上下文才真正被分离开来。

**核心认识**

Agent 执行长任务，关键不是让一个 Model Call 或一个 Agent Session 无限持续，而是：

> **把长任务转化成一系列可独立执行、可独立验收、可持久化提交的子任务，并让任务状态独立于模型 Context 和运行进程存在。**

其中：

```text
Workflow State
→ 整个任务已经推进到哪里

Agent RunState
→ 当前子任务内部 Agent Loop 执行到哪里

Artifact
→ 已经真正产生了什么可复用、可验证的结果

Checkpoint
→ 系统中断以后可以从哪里恢复

Memory
→ 未来交互还需要记住哪些过去的信息

Context
→ 当前这一轮模型真正需要看到什么
```

因此长任务真正的主线应该记成：

```text
Long Task
    ↓
Task Decomposition
    ↓
Workflow State
    ↓
Agent RunState
    ↓
Execution + Evaluation
    ↓
Persistence
├─ Artifact
├─ Checkpoint
└─ Memory
    ↓
Context Reconstruction
    ↓
Resume
```

同时，涉及数据库写入、订单创建、发送消息、部署等外部副作用时，还必须通过 Idempotency（幂等性）和 Side-effect Reconciliation（副作用对账）保证恢复和 Retry 不会造成重复业务结果。

最终可以将长任务稳定性概括为：

> **运行可以失败，进程可以退出，Context 可以重建，但已经完成并验证过的任务进度、产物和外部业务事实不能丢失。**

### 【结构化状态还能成为确定性检查的输入】

结构化状态不仅服务于恢复。只要某些字段存在明确语义，它们还可以进一步成为 Schema、Script、Test 或 Gate 的输入，把“Agent 记得规则并自行判断”转换成程序能够重复执行的检查。

例如：

~~~text
Workflow State / Artifact
        ↓
required fields / status / evidence refs
        ↓
deterministic validation
        ↓
PASS / FAIL / BLOCKED
~~~

这一层讨论的是“已经确定的规则怎样从自然语言软约束下沉成可验证的工程约束”，与本章的 State / Artifact / Checkpoint 职责不同。完整回答见 [Agent 通过结构化状态与确定性检查降低自然语言约束的不确定性](./Agent%20通过结构化状态与确定性检查降低自然语言约束的不确定性.md)。

## 5. 参考文献

[1] Anthropic. [Effective harnesses for long-running agents](<https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents>)[EB/OL]. 核验日期：2026-10-04。

[2] Anthropic. [Harness design for long-running application development](<https://www.anthropic.com/engineering/harness-design-long-running-apps>)[EB/OL]. 核验日期：2026-10-04。

[3] OpenAI. [Run state — OpenAI Agents SDK (Python)](<https://openai.github.io/openai-agents-python/ref/run_state/>)[EB/OL]. 核验日期：2026-10-04。

[4] OpenAI. [Running agents — OpenAI Agents SDK (Python)](<https://openai.github.io/openai-agents-python/running_agents/>)[EB/OL]. 核验日期：2026-10-04。

[5] OpenAI. [Human-in-the-loop — OpenAI Agents SDK (Python)](<https://openai.github.io/openai-agents-python/human_in_the_loop/>)[EB/OL]. 核验日期：2026-10-04。

[6] OpenAI. [OpenAI Agents SDK — OpenAI Agents SDK (Python)](<https://openai.github.io/openai-agents-python/>)[EB/OL]. 核验日期：2026-10-04。
