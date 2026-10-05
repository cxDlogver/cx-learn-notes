# 服务端可靠性体系从故障假设到持续恢复建立完整工程框架

服务端可靠性（Reliability）不是“加 Retry”或者“服务不宕机”的单一能力，而是系统面对请求错误、依赖变慢、进程退出、流量突增、数据写入中断等故障时，仍然能够**保护关键事实、限制故障传播、恢复未完成工作，并用可观测证据证明系统处于可接受状态**的一整套工程约束。

可靠性属于服务端的横向能力。它不会只发生在 Worker、数据库或者部署层，而是同时作用于请求、状态、任务、依赖和运行环境：

~~~text
                    Service Reliability
                           │
       ┌───────────────────┼───────────────────┐
       ↓                   ↓                   ↓
 Request Path          State / Data         Async Work
 请求能否受控进入       已确认事实能否保住      离开请求后的工作能否完成
       │                   │                   │
       └──────────────┬────┴────┬──────────────┘
                      ↓         ↓
                 Dependency   Capacity
                 依赖故障隔离   过载保护
                      │         │
                      └────┬────┘
                           ↓
                    Runtime / Deployment
                    启停、健康与恢复
                           ↓
                    Observability / SLO
                    判断是否真的可靠
~~~

因此学习可靠性时，不应该把 Timeout、Retry、Outbox、Health Check、Restart、Backpressure 等机制平铺成名词，而应该沿着同一条因果链理解：

~~~text
先定义什么必须可靠
        ↓
识别哪些故障可能破坏它
        ↓
在故障进入系统前限制风险
        ↓
在状态提交时保护关键事实
        ↓
在跨边界执行时允许安全恢复
        ↓
在流量过载时保护有限资源
        ↓
在进程和依赖故障后恢复服务
        ↓
用指标、SLO 和演练验证结果
~~~

> **学习边界**：本文负责服务端 Reliability 的通用总框架。数据库事务、并发控制、Redis、异步任务、Docker 等专题仍由各自主文档深入；本文只解释它们为什么会在“可靠性”这一横向问题上重新发生联系。

## 1. 服务端可靠性先从业务承诺、失败模型和恢复目标开始设计

可靠性设计最容易犯的错误，是一开始就在问“要不要 Retry、Kafka、主从复制、Kubernetes”。这些都是方案，不是问题本身。真正的设计顺序应该先回答：系统对调用方承诺了什么、这个承诺允许怎样失败、失败以后多久必须恢复、已经产生的数据允许丢多少，以及哪些失败能够自动恢复、哪些必须转人工或降级。

### 【可靠性关注故障条件下的业务结果，而不是单纯的进程存活】

假设订单 API 的 Node.js Process 仍然运行，但数据库已经不可连接：

~~~text
POST /orders
      ↓
Application Process = Alive
      ↓
Database Connection Timeout
      ↓
订单无法创建
~~~

从操作系统角度看程序还“活着”，从用户角度看创建订单能力已经不可用。反过来，如果一个 Worker Crash，但任务已经写入 Durable Queue，Lease 超时后可以由其他 Worker 重新领取，那么 Process Failure 并不等于 Business Task Lost。

因此可靠性判断必须围绕业务能力、数据事实和任务结果，而不是只观察某个进程、容器或者端口是否存在。

### 【一次服务端操作通常包含多种独立可靠性承诺】

| 可靠性对象 | 真正要保护什么 | 典型失败 | 常见机制 |
| --- | --- | --- | --- |
| Request | 合法请求能否在预算时间内得到明确结果 | Timeout、5xx、慢依赖 | Deadline、Timeout、Retry、Fallback |
| State | 已确认成功的数据是否正确、持久、可恢复 | 半提交、Crash、磁盘损坏、误删 | Transaction、WAL、Replication、Backup |
| Task | 已接受的后台任务是否最终进入成功或明确失败 | Worker Crash、重复投递、毒任务 | Durable Queue、Lease、Idempotency、Retry、DLQ |
| Dependency | 下游异常是否会拖垮上游 | Slow、Unavailable、Unknown Result | Timeout、Circuit Breaker、Bulkhead |
| Capacity | 超过容量后是否仍然可控 | Queue Backlog、连接池耗尽、CPU 饱和 | Rate Limit、Backpressure、Load Shedding |
| Runtime | 实例故障、部署和重启时是否安全 | Bad Config、Crash、Shutdown During Work | Config Validation、Health、Restart、Graceful Shutdown |

这些目标不是同一件事。例如：

~~~text
HTTP 202 Accepted
≠
后台任务完成

Database COMMIT
≠
已经拥有灾难恢复能力

Container Restart
≠
业务状态已经恢复

Replica 存在
≠
误删数据能够恢复
~~~

可靠性设计的核心，就是不断把这些“看起来像成功”的状态拆开，明确每个边界到底承诺了什么。

### 【Failure Model 先描述失败，再选择机制】

一个可执行的 Failure Model 至少写清四个维度：

| 维度 | 需要回答的问题 |
| --- | --- |
| Failure Source | 谁失败：Client、Application、Database、Cache、Worker、Network、External Service |
| Failure Type | 怎样失败：Slow、Timeout、Crash、Duplicate、Partial Failure、Corruption、Overload |
| Business Impact | 会破坏什么：请求结果、业务事实、任务进度、容量、可用性 |
| Recovery Strategy | 怎样恢复：Fail Fast、Retry、Replay、Fallback、Restart、Restore、Manual Repair |

例如“支付调用超时”不能只归类为一个 Timeout：

~~~text
Failure Source
第三方支付服务

Failure Type
Client 收到 Timeout，但不知道对方是否已扣款

Business Impact
直接重试可能重复扣款

Recovery Strategy
Idempotency Key
+
查询真实支付状态 Reconciliation
+
确认未执行以后再决定是否 Retry
~~~

同样是 Timeout，不同业务副作用会产生完全不同的恢复方案。这也是后面所有可靠性机制都必须回到 Failure Model 的原因。

### 【SLO、RPO 与 RTO分别约束服务、数据和恢复】

Service Level Indicator（SLI，服务级指标）描述实际测量值，例如成功请求比例、请求 P95 / P99、任务在 5 分钟内完成的比例；Service Level Objective（SLO，服务级目标）规定这些指标应该达到什么水平。Google SRE 使用 SLO 与 Error Budget（错误预算）明确“多可靠才足够”，而不是无限追求 100%。[[1]](https://sre.google/sre-book/service-best-practices/) [[2]](https://sre.google/sre-book/embracing-risk/)

例如：

~~~text
30 天窗口内 99.9% 的有效请求成功

99% 的已接受任务在 2 分钟内完成
~~~

数据恢复还需要两个不同目标：

~~~text
RPO
Recovery Point Objective（恢复点目标）
→ 最多允许丢失多长时间的数据

RTO
Recovery Time Objective（恢复时间目标）
→ 故障发生后最多允许多久恢复服务
~~~

例如 RPO = 5 min，表示最坏情况下希望恢复到故障前 5 分钟以内的数据点；RTO = 30 min，表示从灾难发生到业务重新可用的目标不超过 30 分钟。

RPO 决定 Backup、WAL Archive、Replication 等数据保护策略；RTO 决定是否需要 Standby、自动 Failover、预热恢复环境和自动化 Runbook。它们应该先由业务风险确定，再倒推基础设施，而不是先选组件再为组件寻找理由。

## 2. 请求与依赖可靠性通过有限等待、安全重试和故障隔离保护调用链

一次 HTTP Request 往往会继续访问 Database、Redis、内部 Service 或第三方 API。只要其中一个依赖变慢，上游就可能一起变慢。因此请求可靠性的核心不是“失败后多试几次”，而是给整条调用链建立时间预算、重试边界和故障传播边界。

### 【请求准入先把无效和过量工作挡在昂贵资源之前】

一个典型入口可以按成本从低到高组织：

~~~text
Request
  ↓
Protocol / Schema Validation
  ↓
Authentication / Authorization
  ↓
Duplicate / Idempotency Check
  ↓
Rate Limit / Quota
  ↓
Business Logic
  ↓
Database / External Service
~~~

越靠后的资源通常越昂贵。一个明显缺少必要字段的请求，如果直到执行 SQL 后才失败，已经浪费 HTTP Connection、Application CPU、Database Connection，甚至可能产生 Lock。

Rate Limit（限流）同样属于可靠性而不只是安全防刷。当系统容量有限时，“所有请求都进入系统然后一起 Timeout”通常比“超预算请求尽早得到 429 / overload，保护仍在容量内的请求”更糟。

### 【Deadline 是一次业务操作的总预算，Timeout 是其中单次等待边界】

Timeout 不应该只是随手设置一个 3 秒常量。更完整的模型是：

~~~text
Client Deadline = 5s
       ↓
API 自己处理消耗 300ms
       ↓
Database 最多 800ms
       ↓
External API 最多 1.5s
       ↓
必要 Retry 仍必须落在剩余 Deadline 内
~~~

如果调用方总 Deadline 只有 3 秒，而下游单次 Timeout 设置成 5 秒，这个 Timeout 实际上没有意义：调用方早已经放弃。AWS Well-Architected 对远程依赖明确建议设置连接和请求 Timeout，以避免等待时间无限增长。[[3]](https://docs.aws.amazon.com/wellarchitected/latest/framework/rel_mitigate_interaction_failure_client_timeouts.html)

设计 Timeout 时至少回答：

| 问题 | 设计含义 |
| --- | --- |
| 正常 P99 延迟是多少 | Timeout 不能低于正常长尾，否则制造大量假失败 |
| 调用方总 Deadline 是多少 | 单次 Timeout 必须服从整体时间预算 |
| 请求失败能否 Retry | 要为 Retry 留出时间 |
| 调用占用什么资源 | Connection / Thread / Memory 长时间等待是否会放大故障 |
| Timeout 后结果是否未知 | 有副作用调用可能需要 Reconciliation |

### 【Retry 只有在失败可能通过再次执行恢复时才有价值】

Retry 适合短暂网络抖动、临时连接失败、短时 503、可安全重放的并发冲突等情况。参数非法、权限拒绝、业务规则明确拒绝、同样输入必然再次失败的确定性错误，不应该原样 Retry。

Retry 自身会增加流量。如果 1000 个调用同时失败并立即重试三次，下游得到的是新的流量冲击。因此完整 Retry Policy 通常由 Retryable Error Classification、Attempt Limit、Exponential Backoff、Jitter 和 Overall Deadline / Retry Budget 共同组成。AWS Builders Library 也把 Timeout、Retry、Backoff 与 Jitter 放在同一可靠性问题中讨论。[[4]](https://aws.amazon.com/builders-library/timeouts-retries-and-backoff-with-jitter/)

最小执行逻辑可以表示为：

~~~text
deadline = now + 3s

for attempt in 1..3
    remaining = deadline - now
    remaining <= 0 → stop

    call dependency with bounded timeout

    success → return
    non-retryable error → fail fast

    sleep(backoff + jitter)

finally → return failure
~~~

真正关键的是：Retry 不是无限循环；每次等待有限；总执行服从 Deadline；只有 Retryable Failure 才继续。

### 【有副作用请求必须先解决幂等和结果未知，再谈 Retry】

假设支付服务实际扣款成功，但 Response 在网络中丢失，调用方看到 Timeout。此时“请求失败”不等于“业务动作没发生”。直接再次 POST /pay 可能重复扣款。

因此这类操作通常需要 Operation / Idempotency Key：服务端用同一 Key 识别同一个业务操作，重复请求返回已经存在的结果。如果对方不提供可靠幂等，Timeout 后应该先 Query Operation Status：已经成功则复用结果；确定未执行才重新发起；仍无法确认则进入人工或补偿流程。

> **Retry 的前提不是“上一次报错”，而是“再次执行是安全的”。**

### 【Circuit Breaker 与 Bulkhead分别限制持续失败和资源互相拖累】

Timeout 解决一次调用最多等多久，但如果下游持续失败，每个请求仍然会真实访问故障依赖并等到 Timeout。Circuit Breaker（熔断）进一步用 Closed → Open → Half-Open → Closed 状态阻止持续调用，在 Open 状态快速失败，恢复窗口后只放少量探测流量。

Bulkhead（舱壁隔离）解决的是另一类传播：一个慢依赖不能占满所有共享连接或并发槽位。例如把第三方 A、B、C 的最大并发分别限制，而不是共享一个无限竞争的全局池。

| 现象 | 优先机制 |
| --- | --- |
| 单次等待无限拖长 | Timeout / Deadline |
| 短暂失败偶尔可恢复 | Retry + Backoff + Jitter |
| 重复调用可能产生副作用 | Idempotency / Reconciliation |
| 依赖持续失败，每次调用都慢失败 | Circuit Breaker |
| 一个依赖占满全部连接或线程 | Bulkhead / Concurrency Limit |
| 下游不可用但允许返回旧数据 | Fallback / Cache / Degradation |

这些机制是组合工具，不是固定套餐。是否引入必须由 Failure Model、业务副作用和资源模型决定。

## 3. 状态与数据可靠性保证已经确认的业务事实不会处于半完成状态

### 【Transaction 解决单个数据库边界内的一组状态原子变化】

当一次业务操作需要修改多条数据时，可靠性首先要求确定 Transaction Boundary（事务边界）：

~~~text
Business Operation
      ↓
必须共同成立的状态变化
      ↓
BEGIN
      ↓
Write A
Write B
Write C
      ↓
COMMIT / ROLLBACK
~~~

Transaction（事务）解决的是：同一个数据库事务边界中的状态变化要么共同提交，要么共同回滚。PostgreSQL 官方事务教程明确说明，事务把多个步骤捆绑成一个 all-or-nothing 操作。[[5]](https://www.postgresql.org/docs/current/tutorial-transactions.html)

数据库内部的 Isolation、MVCC、Lock、Deadlock 和 Transaction Retry 继续进入 [数据库完整框架体系](./S-数据库完整框架体系.md)。

### 【跨系统写入需要重新识别一致性边界】

**事务原子性只属于单个数据库引擎。** `BEGIN … COMMIT` 的 all-or-nothing 是某一个数据库给自己的多条写入提供的保证；而 Message Broker、Redis、外部 API 是另外的系统，各有各自的提交语义。数据库既无法“回滚”一条已经发出的消息，也无法撤销一次已经成功的外部调用。因此，当一次业务需要同时写多个系统时，事务这道原子锁就在边界上断开了——单个数据库事务不能自动覆盖：

~~~text
Database
+
Message Broker
+
Redis
+
External API
~~~

只用一个库的事务去包住跨系统写入，就形成 Dual Write（双写）：两个系统各写各的，没有任何事务能同时包住它们，于是中间一旦失败就会“只成功一半”。例如“先写库、再发消息”：

~~~text
INSERT business_record
      ↓
COMMIT
      ↓
Process Crash
      ↓
Publish Message 没执行
~~~

数据库这边已经提交（业务事实落库），但进程在“提交成功之后、发消息之前”崩溃，导致消息永远没发出去——下游永远收不到它本该收到的事件。

双写其实两个方向都会坏，而且无法靠调整顺序根治：

~~~text
先写库、后发消息
  库提交了、消息没发
  → 下游永远不知道（丢事件）

先发消息、后写库
  消息发了、库提交失败
  → 下游处理了一个库里并不存在的事实
~~~

只要两步之间存在哪怕一个可能失败的时刻（崩溃、网络中断、超时），就一定存在这个“半成功”窗口。

Transactional Outbox（事务发件箱）正是为此而设：把业务记录和待发布任务 / 事件放进**同一个本地数据库事务**，让原子部分始终落在一个库内部、问题退化成单库事务能管的范围——业务记录与待发事件要么一起提交、要么一起回滚，不会丢；随后再由独立 Consumer 或 Relay 从“发件箱”表读出并投递。这样先保证 Producer 侧可靠交接，跨系统部分则退化为“至少一次”投递。AWS 对这一模式的说明同时指出，后续消息可能重复，因此 Consumer 仍然需要幂等。[[6]](https://docs.aws.amazon.com/prescriptive-guidance/latest/cloud-design-patterns/transactional-outbox.html)

**注意：Outbox 和普通双写都用事务，区别不在“用不用 BEGIN / COMMIT”，而在于事务包住了什么。**

~~~text
普通双写
  BEGIN
    INSERT business_record
  COMMIT                ← 事务只包住“写库”这一件事
  publish(message)      ← 跨系统动作，在事务之外
  崩溃 → “要不要发消息”这个意图没被持久化 → 永久丢失

Transactional Outbox
  BEGIN
    INSERT business_record
    INSERT outbox_task   ← 把“要发消息”也写成本库的一条记录，同事务提交
  COMMIT                 ← 事务包住“写库 + 待发意图”
  （之后）Relay 读 outbox → publish → 标记完成
  崩溃 → 意图仍在库里 → Relay 重新读到并补发
~~~

差别在于：普通双写只把业务记录持久化，“要发消息”只存在于内存，COMMIT 后崩溃就再也无法重建；Outbox 把“要发消息”也变成一条已提交的记录，于是发消息这一步虽然仍在事务之外，却可以由这条持久记录反复重试，直到成功。

**为什么不能直接把 publish 塞进事务（`BEGIN; INSERT; publish; COMMIT`）？** 因为 publish 是别的系统的动作，数据库无法回滚它：一旦 publish 成功而 COMMIT 失败，就会发出一个库里不存在的消息；而且在一个事务里做网络调用会长时间持有锁。这正是“跨系统动作天生无法被单库事务原子化”的体现——Outbox 不是让 publish 变成事务性的，而是把“发消息”这个跨系统动作**替换成“写一行发件箱记录”这个同库动作**，把真正的发送推迟到 COMMIT 之后、由记录驱动。

因此：

~~~text
Local Transaction
解决
同一持久化边界内的原子提交

Outbox / Saga / Compensation
解决
跨边界后的可靠协调
~~~

它们不是同一层能力：不能用“再加一个事务”去解决跨系统问题，跨边界后的协调需要 Outbox、Saga 或 Compensation 这类模式单独承担。

### 【Durability 还需要备份、复制和恢复验证】

事务 COMMIT 只是数据可靠性的一部分。真正的生产数据还需要继续考虑：

- 持久化介质是否可靠；
- 是否需要 Replication；
- Backup 是否存在；
- Restore 是否真实演练过；
- RPO（Recovery Point Objective，恢复点目标）允许丢失多少数据；
- RTO（Recovery Time Objective，恢复时间目标）允许多久恢复。

不能因为“使用了数据库”就默认具备完整灾难恢复能力。

## 4. 异步任务可靠性保证离开请求生命周期的工作拥有明确终态

一项工作离开当前 Request 以后，可靠性问题会从“请求是否成功”转成“任务是否最终完成”。

### 【可靠任务体系需要完整生命周期而不是一个 Queue 名称】

一个最小可靠任务生命周期可以表示为：

~~~text
Producer
   ↓
Durable Task
   ↓
Queued / Pending
   ↓
Claim / Delivery
   ↓
Processing
   ↓
┌───────────────┐
↓               ↓
Success       Failure
                ↓
          Retry / Backoff
                ↓
         Terminal Failure
                ↓
           Dead Letter
~~~

每个节点分别解决：

| 节点 | 可靠性问题 |
| --- | --- |
| Durable Task | Producer 退出后任务是否仍存在 |
| Claim / ACK / Lease | 多 Consumer 如何确定处理所有权 |
| Idempotency | 重复投递是否产生重复副作用 |
| Retry | 瞬态故障是否能够恢复 |
| Backoff / Jitter | 重试是否会再次压垮下游 |
| Dead Letter | 永久失败是否会无限消耗资源 |
| Replay / Repair | 人工修复后是否可以重新进入处理链 |

### 【At-least-once 语义要求 Consumer 把重复执行当成正常情况处理】

很多任务系统为了避免任务静默丢失，会允许 Redelivery（重新投递）。这意味着：

~~~text
“至少处理一次”
可能表现为
同一任务实际执行多次
~~~

因此业务效果需要通过 Idempotency Key、Unique Constraint、Version / Sequence、状态机等机制保证重复执行不会产生错误结果。

不能仅凭 Queue 或 Broker 声称 Exactly Once。真正需要判断的是：

~~~text
Delivery Guarantee
+
Consumer Side Effect
+
Database Commit Boundary
+
ACK / Completion Boundary
~~~

共同形成的最终业务语义。

完整的 Task、Queue、Job Store、Transactional Outbox、Broker、Worker、Claim、Lease、ACK、At-least-once、Retry、Dead Letter 和 Backpressure 模型继续阅读 [服务端异步任务与消息处理体系](./F-服务端异步任务与消息处理体系.md)。

## 5. 容量与过载可靠性保证系统在生产速度超过处理能力时仍然受控

### 【异步化只能缓冲流量差异，不能创造处理能力】

如果：

~~~text
Arrival Rate = 10000 / s
Processing Rate = 6000 / s
~~~

那么积压仍然会持续增加：

~~~text
Queue Backlog
0 → 4000 → 8000 → 12000 → ...
~~~

Queue 把同步失败转成了时间缓冲，但如果长期生产速度高于消费速度，最终仍然会耗尽存储、延迟预算或下游能力。

因此容量可靠性需要同时观察：

~~~text
Arrival Rate
Processing Rate
Queue Depth
Oldest Item Age
Processing Latency
Resource Saturation
~~~

其中 Oldest Item Age（最老任务年龄）往往比单独 Queue Depth 更能说明“用户工作已经等待多久”。AWS 关于 Queue Backlog 的可靠性实践也强调监控积压和消息年龄，并对无法处理的消息使用 Dead Letter Queue。[[7]](https://docs.aws.amazon.com/wellarchitected/latest/framework/rel_mitigate_interaction_failure_fail_fast.html)

### 【Backpressure 把下游处理能力反向变成上游约束】

Backpressure（背压）的核心是：当下游已经处理不过来时，上游不能继续无限生产。

常见手段包括：

~~~text
Rate Limit
Bounded Queue
Batch
Concurrency Limit
Consumer Scaling
Load Shedding
Admission Control
~~~

这些机制解决的是不同位置的容量问题。增加 Worker 并发也不是永远有效，因为真正瓶颈可能已经位于 Database Connection、Lock、CPU、Storage I/O 或外部服务。

所以扩容之前必须先定位 Saturation Point（饱和点）。

## 6. 进程与部署可靠性保证服务实例能够安全启动、停止和恢复

### 【Liveness、Readiness 与 Startup 分别回答不同生命周期问题】

一个 Process 已经存在，不代表它能够正常接收流量。

Kubernetes Probe 模型区分：

- Liveness：实例是否仍然活着，失败时可以触发重启；
- Readiness：实例当前是否能够接收请求，失败时应该停止给它分配流量；
- Startup：慢启动程序是否已经完成启动，在此之前避免过早执行其他 Probe。[[8]](https://kubernetes.io/docs/concepts/configuration/liveness-readiness-startup-probes/)

即使不使用 Kubernetes，这三个问题仍然是通用的运行判断：

~~~text
Process Alive?
      ↓
Dependencies Ready?
      ↓
Can Receive Traffic?
~~~

### 【Restart 能恢复进程但不能替代业务恢复机制】

容器或进程管理器可以在应用退出后重新启动实例。Docker 提供 no、on-failure、always、unless-stopped 等 Restart Policy。[[9]](https://docs.docker.com/engine/containers/start-containers-automatically/)

但：

~~~text
Process Restart
≠
Task Recovery
≠
Data Recovery
≠
Dependency Failover
~~~

如果任务状态只存在内存里，Restart 后任务依然可能丢失；如果数据库已经损坏，重启应用也无法恢复数据。

### 【Graceful Shutdown 避免正常部署主动制造半执行状态】

部署、扩容和节点维护都会主动终止进程。可靠服务需要在收到终止信号后：

~~~text
停止接收新工作
      ↓
等待或转移 In-flight Work
      ↓
Flush / Commit 必要状态
      ↓
关闭 Database / Redis / Network Connection
      ↓
退出 Process
~~~

Node.js 会向进程暴露 SIGINT、SIGTERM 等 Signal Event，应用可以据此执行清理逻辑。[[10]](https://nodejs.org/api/process.html#signal-events)

Graceful Shutdown 的目标不是永远等待，而是在平台提供的终止时间预算内，尽量把运行状态收束到可恢复边界。

## 7. 可观测性与验证把可靠性从设计目标变成可证明结果

### 【可靠性指标必须覆盖用户结果和内部故障链路】

可靠系统至少需要两类信号：

~~~text
User-facing SLI
请求成功率 / 延迟 / 可用性
        +
Internal Reliability Signal
Queue Lag / Retry / Dead Letter / Dependency Error / Restart
~~~

只看 HTTP 200 比例，无法证明后台任务没有积压；只看 CPU，也无法证明用户请求成功。

可以围绕四类 Golden Signals 建立基础观察：

- Latency：请求和任务处理多慢；
- Traffic：系统正在处理多少负载；
- Errors：失败和拒绝多少；
- Saturation：容量是否接近极限。

Google SRE 将监控和 SLO 作为生产服务可靠性的重要基础。[[1]](https://sre.google/sre-book/service-best-practices/)

### 【可靠性验证需要故障场景而不只是正常流程测试】

正常路径测试只能证明“没有故障时能够工作”。

可靠性还需要验证：

~~~text
Dependency Timeout
Process Crash
Duplicate Request
Worker Crash
Retry Exhausted
Queue Backlog
Database / Cache Unavailable
Graceful Shutdown
Restart / Recovery
~~~

验证时应该关注：

~~~text
故障前的已确认事实是否还在
+
未完成工作是否能够恢复
+
错误是否被限制在预期边界
+
恢复后是否产生重复副作用
+
指标是否能够发现问题
~~~

这形成从设计到验证的闭环。

## 8. 服务端可靠性最终收敛为保护、隔离、恢复和证明四类控制

前面的机制很多，但可以收敛成四类长期问题：

~~~text
1. Protect
   在无效输入、重复请求和过载进入核心资源前进行保护

2. Isolate
   用 Timeout、资源边界和失败策略限制局部故障传播

3. Recover
   用 Transaction、Idempotency、Retry、Task State、Restart 和 Data Recovery
   把系统带回可信状态

4. Prove
   用 SLI / SLO、Metrics、Logs、Trace、Load Test 和 Failure Test
   证明可靠性目标是否成立
~~~

对应到服务端四条主要链路：

| 服务端主线 | 可靠性重点 |
| --- | --- |
| Request Processing | Validation、Idempotency、Timeout、Rate Limit |
| State & Data | Transaction、Constraint、Durability、Backup / Restore |
| Async Processing | Durable Task、Claim、Lease、Retry、Dead Letter |
| Runtime & Deployment | Config Validation、Health、Restart、Graceful Shutdown |
| Cross-cutting | Dependency Isolation、Capacity、Observability、SLO |

这也是可靠性最重要的设计方法：

> **不要先问“应该加什么可靠性组件”，而要先沿请求、状态、任务和运行四条链找失败边界，再决定每个边界应该保护什么、允许怎样失败、怎样恢复，以及用什么指标证明恢复确实发生。**

相关专题继续阅读：

- [服务端完整框架体系](./F-服务端完整框架体系.md)：定位 Reliability 在服务端整体架构中的横向位置。
- [数据库完整框架体系](./S-数据库完整框架体系.md)：深入 Transaction、Concurrency、Durability 与数据库恢复。
- [服务端异步任务与消息处理体系](./F-服务端异步任务与消息处理体系.md)：深入 Durable Task、Outbox、Worker、Delivery、Idempotency、Retry 与 Backpressure。
- [Redis 完整知识体系](./R-Redis完整知识体系.md)：深入 Cache、Runtime State、Persistence、Replication 与 Redis 自身可靠性。
- [Docker 工程体系](./D-Docker工程体系.md)：深入 Container Lifecycle、Health、Restart、Storage 与 Compose。

## 9. 实战分析入口

需要查看一套真实监控服务如何把请求准入、事务提交、Transactional Outbox、Worker Claim / Lease、幂等投影、Retry / Dead Letter、Redis 依赖、Health Check、Restart、Graceful Shutdown 与可靠性指标连接成完整控制链时，进入：

[Browser Monitor 服务端可靠性体系源码学习](https://github.com/cxDlogver/browser-monitor/blob/main/docs/%E6%9C%8D%E5%8A%A1%E7%AB%AF%E5%8F%AF%E9%9D%A0%E6%80%A7%E4%BD%93%E7%B3%BB%E6%BA%90%E7%A0%81%E5%AD%A6%E4%B9%A0.md)

项目文档负责验证“这些可靠性机制在真实源码中如何落地、当前边界在哪里”；本文只维护可以迁移到其他服务端系统的通用知识。

## 10. 参考文献

[1] Google. Site Reliability Engineering — Production Services Best Practices. https://sre.google/sre-book/service-best-practices/

[2] Google. Site Reliability Engineering — Embracing Risk. https://sre.google/sre-book/embracing-risk/

[3] Amazon Web Services. REL05-BP05 Set client timeouts. AWS Well-Architected Framework. https://docs.aws.amazon.com/wellarchitected/latest/framework/rel_mitigate_interaction_failure_client_timeouts.html

[4] Amazon Web Services. Timeouts, retries, and backoff with jitter. AWS Builders Library. https://aws.amazon.com/builders-library/timeouts-retries-and-backoff-with-jitter/

[5] PostgreSQL Global Development Group. Transactions. PostgreSQL Documentation. https://www.postgresql.org/docs/current/tutorial-transactions.html

[6] Amazon Web Services. Transactional outbox pattern. AWS Prescriptive Guidance. https://docs.aws.amazon.com/prescriptive-guidance/latest/cloud-design-patterns/transactional-outbox.html

[7] Amazon Web Services. REL05-BP04 Fail fast and limit queues. AWS Well-Architected Framework. https://docs.aws.amazon.com/wellarchitected/latest/framework/rel_mitigate_interaction_failure_fail_fast.html

[8] Kubernetes. Liveness, Readiness, and Startup Probes. https://kubernetes.io/docs/concepts/configuration/liveness-readiness-startup-probes/

[9] Docker. Start containers automatically — Restart policies. https://docs.docker.com/engine/containers/start-containers-automatically/

[10] Node.js. Process — Signal Events. https://nodejs.org/api/process.html#signal-events

[11] Resilience4j. CircuitBreaker. https://resilience4j.readme.io/docs/circuitbreaker
