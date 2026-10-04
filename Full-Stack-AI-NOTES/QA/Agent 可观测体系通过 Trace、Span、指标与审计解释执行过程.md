# Agent 可观测体系通过 Trace、Span、指标与审计解释执行过程

## 【知识概述】

**Agent 可观测性关注的是：把实际运行过程记录成相互关联的证据，让人能够排查一次任务，也能够观察大量任务的运行趋势。** Agent 的工具选择、执行轮数和重试路径可能随环境变化，因此仅有最终回答或零散错误日志，往往无法说明耗时在哪里、失败发生在哪一步，以及前后操作如何关联。

### 【用 Trace 关联一次任务，用 Span 拆开执行步骤】

假设“修复登录错误”的任务运行很久，最终仍未通过测试。我们需要知道它是否读取了正确文件、测试是否启动、是不是某次工具调用一直在等待。**Trace（执行追踪）**将相关调用关联成一条可查询的执行链；在 Agent 系统里，可以按任务或运行建立关联标识，跨进程时还需要传播相应的关联信息。

**Span（追踪片段）**描述这条链中的一个操作，例如一次模型请求、读取文件或运行测试，通常记录开始时间、结束时间、状态以及父子关系。Trace 像一份任务执行目录，Span 则是目录中的具体条目。查看每个片段的耗时，可以区分时间主要花在模型生成、工具执行还是等待外部服务。[[1]](https://opentelemetry.io/docs/concepts/observability-primer/)

```text
任务：修复登录错误
└─ 关联执行链 Trace
   ├─ 模型调用：决定先检查哪些文件
   ├─ 文件读取：取得相关代码
   ├─ 模型调用：根据代码提出修改
   ├─ 文件修改：写入变更
   └─ 测试执行：记录耗时、状态和结果
```

这张图表示一种记录方式，实际系统还可能包含并行分支、多个 Agent 或多条跨阶段追踪。关键在于能把相关操作连起来，不能假设所有任务都只有一条简单线性链路。

### 【关联关系之外，还需要具体事件和结果】

Span 能告诉我们“测试执行失败”，但失败原因还需要**日志（Log）**或事件补充，例如测试命令、退出状态和错误摘要。关键的工具参数、返回结果和状态变更，也应按排查需求关联到对应操作。这样才能知道是测试发现了业务错误，还是测试环境本身启动失败。

为了分析模型为什么选择某个工具，还可以在权限和脱敏边界内记录当时可见的上下文摘要、工具说明及返回信息。这些材料有助于重建决策环境，却不能直接证明模型内部推理的真实因果。例如，没有读取关键文件是一项可观察事实；断言模型完全因为某一句话才作出决定，则需要额外证据。

记录越多不一定越好。原始提示词、文件内容和工具结果可能含有凭证或业务数据，需要决定哪些字段记录、怎样脱敏、谁能查询以及保存多久。没有必要为了排查耗时而默认保存全部敏感内容。

### 【指标观察总体表现，审计保留治理证据】

单次 Trace 帮助解释一条执行路径；**指标（Metric）**则把大量运行汇总成可比较的数字，例如任务耗时、工具错误率、重试次数和模型用量。假设某一版工具上线后，许多任务的测试片段同时变慢，指标先暴露趋势，再通过具体 Trace 定位受影响的调用。成功率还需要明确的成功判定来源，不能把“没有抛异常”自动等同于任务完成。

**审计（Audit）**关注身份、授权、审批和关键操作，例如谁批准删除哪些文件、实际删除结果是什么。它可能与 Trace 关联，但通常有独立的记录内容、访问权限和保留要求。普通调试记录是否足以承担审计用途，取决于完整性和可信性设计，不能仅因为带有 Trace ID 就作出保证。

### 【从采集到查询，以及与其他机制的边界】

这些数据需要在模型调用、工具执行和状态变化等位置**埋点（Instrumentation）**采集，再通过相应的处理和导出机制送到可查询的存储或观测平台。追踪、日志、指标和审计可以共享关联标识，但具体采集和存储管道可能不同，应根据数据用途分别设计。

可观测性主要回答“实际发生了什么、哪里需要调查”；评测依据成功标准回答“任务完成得怎样”；检查点保存“执行从哪里恢复”。例如，一条 Trace 可以证明测试工具运行过，真正的测试证据和评分规则才能判定修复是否合格，而恢复执行还需要对应的持久化状态。明确这三个边界，才能正确理解正文中的追踪结构、事件采集、指标监控和审计用途。

## 1. 任务与步骤通过 Trace 和 Span 建立可检查的执行主线

### 【Agent Observability 的核心目标】

Agent Observability 本质上仍然属于软件系统 Observability。它的核心目标不是简单地“记录 Agent 日志”，而是：

> **通过记录 Agent 的真实运行过程，使系统能够在出现问题以后，还原发生了什么，并进一步定位为什么会发生。**

这一点对于 Agent 比普通确定性程序更加重要。

传统程序可能是：

```text
Request
  ↓
Service A
  ↓
Service B
  ↓
Database
  ↓
Response
```

而一次 Agent Task 可能是：

```text
User Request
      ↓
Agent
      ↓
Model
      ↓
search_code
      ↓
Model
      ↓
read_file
      ↓
Model
      ↓
write_file
      ↓
run_test
      ↓
Model
      ↓
Final Result
```

中间还可能发生 Retry、Handoff、Guardrail、HITL 或多个 Agent 协作，而且下一步 Action 通常由模型根据当前 Context 和环境反馈动态决定。

因此，当最后出现：

```text
Task = Failure
```

真正有价值的问题不是“任务失败了吗”，而是：

```text
模型第一次做了什么判断？

为什么调用 search_code？

search_code 返回了什么？

模型为什么随后选择 write_file？

写了哪个文件？

测试为什么失败？

失败以后为什么没有 Retry？

Agent 为什么最后仍然认为任务完成？
```

所以：

> **Agent Observability 最基础的能力，是能够完整还原一次 Agent Task 的执行路径。**

### 【观测体系的两个层次】

Agent 可观测体系可以先划分成两个层次。

#### <u>1. 单次 Task 的执行还原</u>

这一层解决：

> **这一次 Agent Task 到底发生了什么，以及问题发生在哪里。**

需要能够记录：

```text
Task
│
├─ Agent Run
├─ Model Call
├─ Tool Call
├─ Tool Result
├─ Handoff
├─ Guardrail
├─ HITL
├─ Retry
└─ Final Result
```

这部分主要通过 Trace、Span、Log 和业务事件完成。

#### <u>2. 大量 Task 的整体监控</u>

这一层解决：

> **整个 Agent 系统长期运行得怎么样。**

例如：

```text
Task Success Rate
P95 Task Latency
Average Tool Calls / Task
Tool Failure Rate
Retry Rate
Token / Task
Cost / Task
Approval Rate
```

这部分通常通过大量运行数据聚合成 Metric，再用于 Dashboard 和 Alert。

所以可以先形成一个清晰边界：

```text
单次 Task
→ Trace 分析

大量 Task
→ Metric 分析
```

### 【Trace：建立一次 Task 的执行主线】

为了能够还原一次 Task，需要先有一个统一的数据主线把整个执行过程串起来。

这个主线就是 Trace（追踪链路，即一次完整任务的端到端执行记录）。

例如：

```text
Task:
修复登录 Bug
```

对应：

```text
Trace: Fix Login Bug

├─ Agent Run
├─ Model Call
├─ search_code
├─ Model Call
├─ read_file
├─ Model Call
├─ write_file
├─ run_test
└─ Final Output
```

OpenAI Agents SDK 当前把 Trace 定义为一次逻辑 Workflow 的完整端到端执行，并由多个 Span 组成。Trace 具有唯一的 `trace_id`，还可以带 `workflow_name`、`group_id` 和 metadata。[[2]](https://openai.github.io/openai-agents-python/tracing/)

例如：

```text
trace_id = trace_0123456789abcdef0123456789abcdef
workflow_name = "Coding Agent"
```

后面这次任务中产生的所有 Model、Tool、Handoff 等记录，都可以通过同一个 `trace_id` 关联起来。

所以：

> **Trace 负责回答“这是哪一次完整任务”。**

### 【Span：把一次 Task 拆成可分析的执行步骤】

只有 Trace 还不够，因为出现问题以后，还需要知道具体是哪一步出现问题。

Span（跨度）表示 Trace 中一个具有开始和结束时间的具体执行操作。

例如：

```text
Trace: Fix Login Bug

├─ Span: Agent
├─ Span: Model Call #1
├─ Span: search_code
├─ Span: Model Call #2
├─ Span: read_file
├─ Span: Model Call #3
└─ Span: write_file
```

一个 Span 通常会保存：

```text
span_id
trace_id
parent_id

start_time
end_time

operation_type
status

input
output

attributes
error
```

于是可以形成：

```text
Trace
→ 哪一次任务

Span
→ 任务中的哪一步
```

OpenTelemetry 同样把 Span 定义为一次具体的 Operation（操作或工作单元），多个具有父子关系的 Span 共同组成 Trace。[[1]](https://opentelemetry.io/docs/concepts/observability-primer/)

## 2. 自动插桩、业务 Hooks 与数据采集协作记录执行事实

### 【Agent Runtime 自动产生 Trace 和 Span】

Agent Framework 与普通业务代码相比有一个重要优势：

> **Runtime 本身知道 Agent 正在执行什么。**

例如 OpenAI Agents SDK 的 Runner 本来就负责：

```text
执行 Agent
↓
调用 Model
↓
读取 Model Output
↓
执行 Tool
↓
把 Tool Result 交回 Model
↓
处理 Handoff
↓
运行 Guardrail
↓
进入下一轮 Agent Loop
```

因此 Runtime 天然知道 Model Call、Tool Call、Handoff、Guardrail 等操作什么时候开始、什么时候结束。

所以 SDK 可以直接在这些生命周期节点做 Instrumentation（插桩，即在程序关键执行位置自动加入观测逻辑）。

OpenAI Agents SDK 当前会对 Agent Run、Model Generation、Function Tool、Guardrail、Handoff 等关键运行节点建立 Trace / Span。[[2]](https://openai.github.io/openai-agents-python/tracing/)

因此执行：

```python
result = await Runner.run(
    agent,
    "修复登录 Bug"
)
```

不是等任务结束后再读取一批 Log 拼接 Trace，而是在任务实际运行过程中持续记录：

```text
Runner.run()
↓
进入 Trace

Model 开始
↓
Generation Span Start

Model 结束
↓
Generation Span End

Tool 开始
↓
Function Span Start

Tool 结束
↓
Function Span End
```

> **Trace / Span 是在执行过程中直接产生的原始观测数据，而不是运行结束以后由普通日志重新推导出来的。**

### 【Span 父子关系表达执行作用域的嵌套】

例如一次 Model Call 决定调用 `search_code`：

```text
Agent
  ↓
Turn
  ↓
Model
  ↓
Tool
```

最终可以形成：

```text
Trace
└─ Task / Agent Span
   └─ Turn
      ├─ Generation Span
      └─ Function Span
```

每个 Span 都带有 `trace_id` 和父级关系，因此系统可以判断：

```text
search_code

属于哪个 Task？
→ trace_id

当前操作归属于哪个执行作用域？
→ parent span

前面发生了什么？
→ 沿 Trace 向上追溯
```

这是根因分析的作用域线索。父子 Span 表示嵌套归属，不能单独证明模型为何调用某个工具；还要关联 Tool Call ID、模型输出、参数和事件时间。

### 【自动插桩与业务自定义插桩】

真正落地时，需要区分两类 Instrumentation。

#### <u>1. Framework Instrumentation：框架自动记录</u>

Agent Framework 能够自动记录的是它自己知道的 Runtime 生命周期，例如：

```text
Agent
Model Call
Tool Call
Guardrail
Handoff
```

这些信息可以由 SDK 自动创建对应 Span，业务开发者不需要对每一次基础 Model / Tool 调用重新手写监控代码。[[2]](https://openai.github.io/openai-agents-python/tracing/)

#### <u>2. Business Instrumentation：业务补充记录</u>

Framework 并不知道企业自己的业务语义，例如：

```text
作者风险等级计算
退款权限校验
订单状态修改
审批单创建
库存锁定
```

这些步骤如果需要参与问题定位，就必须由业务主动补充 Custom Span（自定义 Span）或者业务事件。

例如：

```python
with custom_span(
    "authorization_check",
    {
        "resource": "order_123",
        "policy": "refund_policy"
    }
):
    check_permission()
```

于是：

```text
Trace

├─ Agent Span
├─ Generation Span
├─ Function Span: refund_order
│   ├─ Custom Span: authorization
│   ├─ Custom Span: risk_check
│   └─ Custom Span: database_update
└─ Generation Span
```

OpenAI Agents SDK 当前提供 Custom Span 用于记录 SDK 默认不知道的业务步骤。[[2]](https://openai.github.io/openai-agents-python/tracing/)

因此可以形成一个清晰原则：

> **Framework Instrumentation 负责记录 Agent Runtime 的通用执行过程；Business Instrumentation 负责补充企业自己的业务过程。**

### 【Hooks：业务接入观测体系的生命周期入口】

除了 Custom Span，还可以通过 Hook（生命周期钩子，即 Runtime 执行到某个节点时触发的回调）接入业务自己的监控逻辑。

OpenAI Agents SDK 当前提供 Agent / Run 生命周期 Hook，例如 Agent 开始、结束，LLM 开始、结束，Tool 开始、结束，Handoff 等生命周期节点。[[3]](https://openai.github.io/openai-agents-python/ref/lifecycle/)

例如：

```python
class MonitoringHooks(RunHooks):

    async def on_tool_end(
        self,
        context,
        agent,
        tool,
        result
    ):
        logger.info({
            "event": "tool_finished",
            "tool": tool.name
        })
```

这里需要明确：

```text
Hook
≠
Trace
≠
Log
```

Hook 只是 Runtime 提供的事件入口。业务可以在 Hook 中记录 Log、更新 Metric、写 Audit Record 或调用企业监控 SDK。

因此：

```text
Runtime Event
      ↓
生命周期节点
      │
      ├─ SDK 内建 Tracing
      │      ↓
      │    Span
      │
      └─ Hook
             ↓
       Business Monitoring
       Log / Metric / Audit
```

### 【Log：补充某个执行节点发生的具体事件】

Trace 和 Span 主要建立一次 Task 的执行结构，但运行过程中还会出现一些离散事件，例如：

```text
Tool 执行失败
Retry 开始
权限校验失败
审批单创建成功
模型进入 Fallback
```

这类信息可以记录为 Log（日志，即某个时间点发生的结构化事件）。

例如：

```json
{
  "event": "tool_execution_failed",
  "tool": "run_test",
  "error": "timeout",
  "trace_id": "trace_0123456789abcdef0123456789abcdef",
  "span_id": "span_0123456789abcdef01234567"
}
```

Log 最重要的是与 `trace_id` / `span_id` 关联。这样一条错误日志就可以反查到：

```text
这是哪个 Task？

属于哪个 Agent？

是哪一次 Tool Call？

它之前发生了什么？
```

因此：

```text
Trace
→ 完整执行路径

Span
→ 一个具体执行步骤

Log
→ 这一步发生的某个具体事件
```

而不是三个互相独立的监控系统。

### 【Trace 数据经过采集、处理和批量上传】

Python SDK 默认处理器会将 Trace 导出到 OpenAI 后端。`add_trace_processor()` 增加处理器，`set_trace_processors()` 替换处理器列表；接入自有平台时要明确是否还保留默认目的地。`trace_include_sensitive_data` 默认开启，可能收集模型和函数输入输出；关闭它也不能替代对 metadata、error 和 Custom Span 的业务脱敏。[[2]](https://openai.github.io/openai-agents-python/tracing/)

产生 Trace / Span 以后，还需要把这些数据真正送入 Observability Backend。

OpenAI Agents SDK 当前的 Tracing 体系提供 Trace Provider、Tracing Processor 和默认的批处理 / 导出机制，也允许业务添加自己的 Trace Processor。[[4]](https://openai.github.io/openai-agents-python/ref/tracing/)

从架构上可以理解为：

```text
Runtime Instrumentation
        ↓
Trace / Span
        ↓
TraceProvider
        ↓
TracingProcessor
        ↓
Batch
        ↓
Exporter
        ↓
Observability Backend
```

#### <u>1. TraceProvider</u>

负责统一创建和管理 Trace / Span，可以理解为 Tracing 系统的入口。

#### <u>2. TracingProcessor</u>

Processor 可以接收 Trace / Span 生命周期事件，对数据进行处理、缓存或者转发。

#### <u>3. Batch</u>

为了避免每产生一个 Span 就立即发送一次网络请求，通常会先进行缓冲和批量上报：

```text
Span
Span
Span
Span
 ↓
Buffer
 ↓
Batch
 ↓
Upload
```

#### <u>4. Exporter / Backend</u>

最终由 Exporter 或对应的 Processor 把数据发送给 OpenAI Tracing Backend 或企业自己的 Observability Backend。

如果企业使用自己的监控体系，也可以形成：

```text
OpenAI Agents SDK
        ↓
Custom Trace Processor
        ↓
OpenTelemetry Collector
        ↓
企业 Observability Platform
```

OpenTelemetry Collector 本身就是通过 Receiver → Processor → Exporter 的方式接收、处理并导出 Trace、Metric 和 Log。[[5]](https://opentelemetry.io/docs/collector/)

### 【Agent Observability 与传统监控 SDK 的实现关系】

如果和传统前端监控 SDK 对照，两者实际上采用了非常相似的工程结构。

```text
前端监控

Browser Runtime
↓
PerformanceObserver / Error Hook / Event Hook
↓
Collector
↓
Processor
↓
Batch
↓
Reporter
↓
Monitoring Backend
```

Agent Observability 则可以理解为：

```text
Agent Runtime
↓
Instrumentation / Lifecycle Hook
↓
TraceProvider
↓
Processor
↓
Batch
↓
Exporter
↓
Observability Backend
```

所以底层思想是一致的：

> **系统首先在 Runtime 中产生原始观测数据，再经过采集、处理、批量上报，最后由监控平台存储、查询和分析。**

区别主要在于观测对象不同。

前端主要观察：

```text
页面
资源
请求
JS Error
用户事件
```

Agent 主要观察：

```text
Agent
Model
Tool
Handoff
Guardrail
HITL
Business Action
```

### 【Observability Backend 通过关联数据定位具体问题】

假设线上发现：

```text
Task #123
修复登录 Bug 失败
```

监控平台根据：

```text
trace_id = trace_0123456789abcdef0123456789abcdef
```

读取整个 Trace：

```text
Trace: trace_0123456789abcdef0123456789abcdef

Task
↓
Agent
↓
Turn 1
├─ Model
└─ search_code
↓
Turn 2
├─ Model
└─ read_file
↓
Turn 3
├─ Model
└─ write_file
↓
Turn 4
├─ Model
└─ run_test → ERROR
↓
Turn 5
└─ Model → Final Answer
```

然后进一步打开 `run_test` 对应 Span：

```text
Input
Output
Start Time
End Time
Error
Parent Span
```

再沿父级关系向上追溯：

```text
谁触发了 run_test？

前面的 Model Output 是什么？

当时模型可见的输入、产生的 Tool Call 和参数是什么？

Tool 前面读取了哪些文件？
```

这些记录为根因分析提供可检查的执行证据，不代表 Trace 自动揭示模型内部推理或保证找到唯一原因。

## 3. 指标、审计与后端查询把执行记录转成运行判断

### 【Metric：从单次执行提升到系统整体监控】

Trace 解决的是：

> **某一次为什么失败。**

生产监控还需要回答：

> **这个问题是不是正在大规模发生。**

这时需要 Metric（指标，即对大量运行数据进行统计后的数值）。

例如每个 Tool Span 只有：

```text
tool = run_test
duration = 2.3s
status = success
```

大量 Span 聚合以后可以得到：

```text
Tool Error Rate = 2.1%
P50 Latency = 0.8s
P95 Latency = 3.2s
```

Agent Task 同样可以聚合：

```text
Task Latency
Task Success Rate
Average Turns / Task
Average Tool Calls / Task
Retry Rate
Handoff Rate
Tokens / Task
Cost / Task
```

Metric 的来源并不只有 Trace 聚合。Runtime 本身也可以直接维护 Usage 或 Counter。

例如 OpenAI Agents SDK 当前会在 Run Context 中累计请求次数和 Token Usage，并可以读取 Request Usage。[[6]](https://openai.github.io/openai-agents-python/usage/)

因此更准确的是：

```text
Metric
来源一：
Runtime 直接采集

来源二：
Trace / Span / Log 聚合
```

### 【Audit：从观测数据中保留治理证据】

Audit（审计）关注具有治理和责任意义的关键操作。它可以复用 Runtime 事件，也可以由独立 Audit Service 保存；审计和调试 Trace 的访问权限、完整性与留存要求可能不同。

例如：

```text
user_id
agent_id
tool
resource
authorization_result
policy
approval_result
approver
execution_result
timestamp
trace_id
```

这些业务治理信息 Framework 并不一定全部知道，因此通常需要通过 RunContext、Runtime Policy、Custom Span、Hook 或独立 Audit Service 补充。

例如：

```text
Trace
→ Debug / 执行分析

Audit Record
→ 合规 / 权限 / 追责
```

两者可以通过同一个 `trace_id` 关联。

### 【Agent Observability 的完整实现链路】

下面是总体架构示意。SDK Trace Processor 主要处理 Trace / Span；Log、Usage 和 Metric 需要分别记录或聚合，再在后端关联。SDK 不会仅凭这一条导出链自动生成成本、业务成功率和审计指标。

```text
                    Agent Task
                        ↓
                   Agent Runtime
                        ↓
                 Instrumentation
                        │
            ┌───────────┴───────────┐
            ↓                       ↓
    Framework Instrumentation   Business Instrumentation
      SDK 自动插桩              Hook / Custom Span
            │                       │
            └───────────┬───────────┘
                        ↓
                 Telemetry Data
                        │
                 Trace / Span
                 Log / Usage
                        ↓
                   Processor
                        ↓
                     Batch
                        ↓
                    Exporter
                        ↓
              Observability Backend
                        │
          ┌─────────────┼─────────────┐
          ↓             ↓             ↓
      Trace View      Metric       Log Search
      单次还原        聚合监控       事件查询
          │             │
          ↓             ↓
    Root Cause       Dashboard
     Analysis         Alert
```

然后这些运行数据可以继续被其他系统消费：

```text
Observability Data
        │
        ├─ Debug
        │   为什么失败
        │
        ├─ Monitoring
        │   系统是否异常
        │
        ├─ Evaluation
        │   Agent 做得好不好
        │
        └─ Governance / Audit
            Agent 是否按规则执行
```

### 【与 Evaluation 和 Governance 的边界】

Observability、Evaluation 和 Governance 解决的问题不同。

```text
Governance
→ 定义“什么可以发生”

Agent Runtime
→ 实际执行

Observability
→ 记录“实际上发生了什么”

Evaluation
→ 判断“发生得好不好”
```

例如 Observability 可以记录：

```text
Agent 调用了 delete_file
path = /production/config
Policy Check = PASS
Approval = user_123
Execution = success
```

Governance 负责定义这类操作应该满足哪些权限和审批规则；Evaluation 则可以继续判断整个任务是否正确、安全、高效地完成。

因此 Observability 实际上为 Evaluation 和 Governance 提供了关键 Evidence（证据）。

**核心认识**

Agent Observability 不应该理解成 Trace、Span、Log、Metric 几个独立概念的集合，而应该理解成：

> **一套围绕 Agent Runtime 建立的数据生产、处理和分析体系。**

首先通过 Framework Instrumentation 和 Business Instrumentation，在 Agent、Model、Tool、Handoff、Guardrail 等关键执行节点产生 Trace、Span、Log 和 Usage 等 Telemetry（遥测数据）；然后通过 Processor、Batch 和 Exporter 将这些数据发送到 Observability Backend。

平台一方面根据 Trace 和 Span 还原某一次 Task 的完整执行路径，用于定位 Root Cause；另一方面对大量运行数据进行聚合，形成成功率、延迟、Tool Error Rate、Token 和 Cost 等 Metric，用于长期 Monitoring 和 Alert。最后这些运行证据还可以进一步服务 Evaluation、Governance 和 Audit。

整个体系可以最终收敛为：

```text
Agent Runtime
↓
Instrumentation
↓
Telemetry
↓
Processing
↓
Export
↓
Observability Backend
↓
Single-task Trace Analysis
+
System-level Metric Monitoring
↓
Debug / Alert / Evaluation / Governance
```

## 4. 参考文献

[1] OpenTelemetry. [Observability primer](<https://opentelemetry.io/docs/concepts/observability-primer/>)[EB/OL]. 核验日期：2026-10-04。

[2] OpenAI. [Tracing — OpenAI Agents SDK (Python)](<https://openai.github.io/openai-agents-python/tracing/>)[EB/OL]. 核验日期：2026-10-04。

[3] OpenAI. [Lifecycle — OpenAI Agents SDK (Python)](<https://openai.github.io/openai-agents-python/ref/lifecycle/>)[EB/OL]. 核验日期：2026-10-04。

[4] OpenAI. [Tracing module — OpenAI Agents SDK (Python)](<https://openai.github.io/openai-agents-python/ref/tracing/>)[EB/OL]. 核验日期：2026-10-04。

[5] OpenTelemetry. [Collector](<https://opentelemetry.io/docs/collector/>)[EB/OL]. 核验日期：2026-10-04。

[6] OpenAI. [Usage — OpenAI Agents SDK (Python)](<https://openai.github.io/openai-agents-python/usage/>)[EB/OL]. 核验日期：2026-10-04。
