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

单层 Retry 之外，还要继续考虑分布式调用链中的 **Retry Amplification（重试放大）**。假设一次用户请求形成五层服务调用，每层都把一次失败操作最多尝试三次，最下游在极端情况下可能面对 `3^5 = 243` 次尝试。AWS Builders Library 用这个例子说明：每层都独立 Retry 会把局部故障放大成更严重的下游负载，因此低成本控制面和数据面操作通常只在调用栈中的一个合适位置承担 Retry。[[4]](https://aws.amazon.com/builders-library/timeouts-retries-and-backoff-with-jitter/)

~~~text
Client
  ↓ Retry?
Service A
  ↓ Retry?
Service B
  ↓ Retry?
Service C
  ↓ Retry?
Database

每层都 Retry
→ Attempt 沿调用链乘法放大
→ 故障依赖收到更多压力
→ Recovery 更困难
~~~

因此还需要明确 **Retry Ownership（重试责任）**：调用链中由哪一层负责把一次可恢复失败重新尝试。选择位置时要权衡两类成本——越靠下重试，重复工作通常越少；越靠上重试，更容易掌握完整业务 Deadline 和最终结果。关键不是机械规定“永远在最高层”或“永远在最低层”，而是避免多个层级对同一个失败同时进行无协调 Retry。

Retry Budget（重试预算）进一步限制故障期间允许产生多少额外尝试。Token Bucket（令牌桶）可以作为一种实现：每次 Retry 消耗有限 Token，Token 按既定策略恢复或补充；预算耗尽后停止无界重试，或只允许受控速率继续尝试。它与 Exponential Backoff / Jitter 解决的问题不同：Backoff 与 Jitter 调整重试发生的时间，Retry Budget 限制重试总量或速率。AWS 也使用 Token Bucket 对客户端 Retry 进行本地限速。[[4]](https://aws.amazon.com/builders-library/timeouts-retries-and-backoff-with-jitter/)

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

Circuit Breaker 不是“持续失败就必须开启”的固定答案。它会给系统引入 Closed / Open / Half-Open 等额外运行模式，需要继续设计错误阈值、Open 时间、Half-Open 探测量和恢复条件；这些状态也增加测试与故障恢复的复杂度。AWS Builders Library 特别指出，这类 modal behavior 可能延长恢复时间，因此某些场景会优先使用 Token Bucket 限制 Retry 流量，而不是只依赖熔断。[[4]](https://aws.amazon.com/builders-library/timeouts-retries-and-backoff-with-jitter/)

~~~text
持续失败
   ↓
是否需要阻止真实调用继续触达依赖？
   │
   ├── Yes
   │    → Circuit Breaker
   │       → 需要管理 Open / Half-Open / Recovery
   │
   └── 主要问题是 Retry 流量继续放大
        → Retry Budget / Token Bucket
           → 限制故障期间额外尝试
~~~

因此 Circuit Breaker 与 Retry Budget 可以组合，也可以根据 Failure Model 单独使用。前者控制“是否继续真实调用故障依赖”，后者控制“允许产生多少额外 Retry”；两者不能互相替代。

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

## 3. 状态与数据可靠性从事务正确性继续扩展到崩溃恢复、副本和灾难恢复

请求失败后可以重新发送，但已经向用户确认成功的数据还要面对更复杂的问题：进程 Crash、机器断电、主数据库整机损坏、误执行 DELETE、错误程序批量覆盖、整个故障域不可用、备份文件本身损坏。这些故障不是同一个层次，因此 Transaction、WAL、Replication、Backup、PITR 不能互相替代。

### 【Transaction 先保证一个业务状态变化不会只完成一半】

假设“创建订单”需要：

~~~text
INSERT orders
UPDATE inventory
INSERT payment_record
~~~

如果三条 SQL 分别自动提交，可能出现 orders 成功、inventory 成功、payment_record 失败。每一条 SQL 单独都合法，但业务整体已经不完整。

Transaction Boundary 应该来自业务原子性：

~~~text
BEGIN

INSERT orders
UPDATE inventory
INSERT payment_record

COMMIT
~~~

任何一步失败则 ROLLBACK。PostgreSQL 官方把事务描述为把多个步骤捆绑成一个 all-or-nothing 操作。[[5]](https://www.postgresql.org/docs/current/tutorial-transactions.html)

这里需要特别区分：Transaction Atomicity 解决“一次业务写入是否半完成”，并不直接解决“整台数据库机器永久损坏以后怎么办”。所以事务只是数据可靠性的第一层。

### 【Constraint 与并发控制保证成功提交的数据仍然满足业务不变量】

即使所有 SQL 都 COMMIT，也可能因为并发写出错误状态。例如两个请求同时扣最后 1 件库存，或者同一个业务单号被并发创建两次。于是还需要 Unique Constraint、Foreign Key、Check Constraint、Isolation、Lock 或 Optimistic Concurrency 等机制。

这些机制解决的是：多个操作交叉执行时，最终提交的数据仍然满足业务不变量。完整的 Isolation Level、MVCC、Row Lock、Advisory Lock、Deadlock 与 Transaction Retry 继续进入 [数据库完整框架体系](./S-数据库完整框架体系.md)。

### 【跨系统写入形成 Dual Write，单数据库事务不能替其他系统回滚】

假设业务同时要完成两件事：写订单数据库、发布 order.created 消息。

如果先写库：

~~~text
BEGIN
INSERT order
COMMIT
        ↓
Process Crash
        ↓
Message 没发
~~~

订单存在，但下游永远不知道。

如果先发消息：

~~~text
Publish order.created
        ↓
Database COMMIT 失败
~~~

下游已经处理一个数据库中不存在的订单。

问题根源是 Database Transaction 只能控制 Database；Message Broker、Redis、External API 都有各自状态和提交语义。所以不能靠把 publish 塞进 BEGIN / COMMIT 就让它变成数据库事务的一部分。

Transactional Outbox 的关键是把跨系统动作先转换成本地可事务化的“待执行意图”：

~~~text
BEGIN
    INSERT order
    INSERT outbox_event(order.created)
COMMIT
        ↓
业务事实 + 待发送意图一起持久化
        ↓
Relay / Worker 读取 outbox
        ↓
Publish
        ↓
标记已发送
~~~

这样即使 Process 在 COMMIT 后立刻 Crash，Outbox Event 仍在数据库，恢复后可以继续发送。AWS Transactional Outbox Pattern 也明确指出，后续消息可能重复，因此 Consumer 仍然需要 Idempotency。[[6]](https://docs.aws.amazon.com/prescriptive-guidance/latest/cloud-design-patterns/transactional-outbox.html)

### 【Durability 要按故障类型拆成 Crash、Instance、Logical 与 Disaster 四层】

Durability（持久性）最容易被一句“COMMIT 后数据不会丢”过度简化。工程上更有用的问题是：**你准备保护哪一种故障？**

~~~text
第一层：Process / OS Crash
数据库进程或机器突然停止
        ↓
WAL / Crash Recovery

第二层：Database Instance / Host Failure
主机、磁盘或实例不可继续提供服务
        ↓
Replication / Standby / Failover

第三层：Logical Error
误删、错误 UPDATE、错误程序写坏数据
        ↓
Backup / WAL Archive / PITR

第四层：Large-scale Disaster
机房、区域、账号或备份介质同时受影响
        ↓
Off-site / Cross-region / Isolated Backup
+
Restore Plan
~~~

这四层不是“越往下越高级”，而是保护不同失败。数据库内部的 WAL / Crash Recovery、Backup / PITR、Replication 与运行维护机制由 [数据库完整框架体系](./S-数据库完整框架体系.md) 继续深入；本文保留它们在系统级 Failure Model、RPO / RTO、HA / DR 与恢复演练中的横向关系。

#### <u>1. COMMIT 与 WAL 主要解决数据库崩溃后的状态恢复</u>

PostgreSQL 使用 Write-Ahead Log（WAL，预写日志）：数据页真正写回数据文件之前，相关变化先记录到 WAL。发生系统 Crash 后，数据库可以从 Checkpoint 之后重放 WAL，把数据文件恢复到一致状态。PostgreSQL 官方把 WAL 放在 Reliability 章节中，并明确说明其首要用途是 Crash Safety。[[7]](https://www.postgresql.org/docs/current/wal.html) [[8]](https://www.postgresql.org/docs/current/continuous-archiving.html)

可以简化理解成：

~~~text
Transaction 修改内存中的数据页
        ↓
先产生 WAL Record
        ↓
满足提交持久化条件
        ↓
COMMIT 返回成功
        ↓
数据页可以稍后再刷盘
~~~

Crash 后：

~~~text
Database Restart
      ↓
读取持久化 WAL
      ↓
Replay
      ↓
恢复到一致状态
~~~

WAL 让“数据库进程突然停止”不必退化成“应用重新执行所有最近请求”。但 WAL 仍位于数据库自己的存储体系中；如果整块存储永久损坏，只靠同一机器上的 WAL 仍不足以完成灾难恢复。

#### <u>2. Replication 主要缩短实例故障后的恢复时间，但不等同于 Backup</u>

Replication（复制）让 Primary 的数据变化传播到 Standby / Replica：

~~~text
Primary
   ↓ WAL / Replication Stream
Standby
~~~

Primary 故障时，可以 Promote Standby 并让应用切换到新 Primary。它主要改善的是单实例故障时的 Availability 与 RTO。

PostgreSQL Streaming Replication 默认是异步的。官方文档明确说明，如果 Primary 在某些已 COMMIT 的 WAL 还没复制到 Standby 前永久故障，Failover 后可能丢掉这一小段事务。[[9]](https://www.postgresql.org/docs/current/warm-standby.html)

故障窗口可以表示为：

~~~text
Primary COMMIT 成功
        ↓
Client 已收到成功
        ↓
Standby 尚未收到对应 WAL
        ↓
Primary 永久损坏
        ↓
Failover
        ↓
最后一小段事务可能不存在于新 Primary
~~~

Synchronous Replication 可以要求 COMMIT 等待指定 Standby 确认，从而缩小 RPO，但会增加写入延迟，而且 Standby / Network 故障可能反过来影响提交可用性。所以它是“更低 RPO 换取更高延迟和更强依赖”，不是默认更优。

#### <u>3. Replica 不能替代 Backup，因为逻辑错误也会被复制</u>

假设管理员误执行 DELETE FROM orders。Replication 会忠实地把 DELETE 也同步到 Standby。此时 Replica 完全健康，但正确历史已经一起消失。

同理，错误程序批量 UPDATE、错误 Schema Migration、恶意操作、逻辑层 Corruption 都可能快速复制过去。

> **Replica 主要保护“实例没了”，Backup 主要保护“正确历史没了”。**

这也是为什么高可用和灾难恢复不能用一套机制代替。

#### <u>4. Backup 需要根据恢复方式选择 Logical、Physical 或 Continuous Archiving</u>

PostgreSQL 官方把 Backup / Restore 分成 SQL Dump、File-system-level Backup 和 Continuous Archiving 等方法。[[10]](https://www.postgresql.org/docs/current/backup.html)

| 方式 | 更适合解决什么 | 典型特点 |
| --- | --- | --- |
| Logical Dump | 按数据库 / 对象导出、迁移、长期逻辑备份 | 可读性高，大库恢复可能慢 |
| Physical / Base Backup | 恢复完整 Cluster、构建 Standby | 接近数据库物理状态 |
| Base Backup + WAL Archive | Point-in-Time Recovery | 可以回到历史时间点 |

不要把“每天有一个备份文件”直接等同于完整恢复能力。真正要问的是备份频率、保存位置、保留时间、权限隔离、加密、恢复粒度、恢复耗时，以及是否依赖完整 WAL 链。

#### <u>5. PITR 解决需要回到事故发生前某一时刻的问题</u>

Point-in-Time Recovery（PITR，时间点恢复）通常基于 Base Backup + Continuous WAL Archive。PostgreSQL 官方说明，Continuous Archiving 可以通过恢复 Base Backup 并重放 WAL 回到备份之后的特定时间点。[[8]](https://www.postgresql.org/docs/current/continuous-archiving.html)

例如：

~~~text
10:00 Base Backup
10:00 ~ 15:29 WAL 持续归档
15:30 错误 DELETE
        ↓
Recovery Target = 15:29:59
        ↓
恢复到误删之前
~~~

这正是 Replica 无法直接解决、PITR 可以解决的故障类型。

#### <u>6. Restore Drill 才能证明 Backup 真正可用</u>

Backup Job 成功只证明某个文件或对象被生成，不能证明文件没有损坏、权限仍可访问、解密密钥存在、WAL 连续完整、团队知道恢复流程，也不能证明实际恢复时间满足 RTO。

真正的恢复验证应该执行：

~~~text
选择隔离环境
      ↓
拿真实 Backup Restore
      ↓
应用必要 WAL / PITR
      ↓
启动 Database
      ↓
执行一致性检查 / 关键查询
      ↓
启动 Application Smoke Test
      ↓
记录真实 Restore Time
      ↓
与 RPO / RTO 比较
~~~

> **没有定期 Restore Drill 的 Backup，只能证明“保存过副本”，不能证明“拥有恢复能力”。**

### 【RPO 与 RTO 应反过来驱动数据保护方案】

不要先问“每天备份一次够不够”，而应先从业务目标倒推。

例如业务要求 RPO ≤ 5 min、RTO ≤ 30 min，只做每天 02:00 的 pg_dump 显然不满足：最坏可能丢接近 24 小时，且大库恢复时间可能远超 30 分钟。

这时可以组合：

~~~text
Primary + Standby
→ 实例故障时快速 Failover，降低 RTO

Base Backup + Continuous WAL Archive
→ 把逻辑事故恢复点压到更小窗口

Automated Restore Procedure + 定期 Drill
→ 验证真实 RTO
~~~

如果只是内部低价值工具，RPO = 24h、RTO = 8h，那么简单每日 Backup 可能已经足够，没有必要一开始就建设复杂同步复制和跨 Region Failover。

数据可靠性最终可以用以下决策链检查：

~~~text
数据库 Crash？
→ WAL / Crash Recovery

主实例永久不可用？
→ Replica / Standby / Failover

误删 / 错写？
→ Backup / PITR

整个故障域失效？
→ Off-site / Cross-region Copy

有备份但不确定能不能恢复？
→ Restore Drill

恢复点和恢复速度是否满足业务？
→ RPO / RTO 验证
~~~

## 4. 异步任务可靠性保证离开 Request 的工作最终进入明确终态

当工作仍在当前 HTTP Request 中时，请求本身提供一个同步边界；一旦改成 Request → Create Task → 202 Accepted，再由 Worker 稍后处理，请求生命周期已经结束，但业务工作还没有结束。

可靠性问题因此从“请求有没有成功”变成：任务会不会丢、谁负责执行、Worker Crash 怎么办、同一个任务执行两次怎么办、永远失败怎么办。

### 【Durable Handoff 先保证 Producer 退出后任务仍然存在】

最危险的实现是把任务只放在进程内存：

~~~text
Request
  ↓
setTimeout / in-memory queue
  ↓
return 202
~~~

如果 Process 在 Response 后立刻退出，202 已经返回，但任务直接消失。所以可靠任务首先需要 Durable Boundary：Database Job Table、Durable Message Queue、Broker 或 Transactional Outbox。

真正可以把“任务已接受”告诉调用方的边界应该是：

~~~text
Task 已经进入可恢复的持久化介质
而不是
Task 已经被某个函数放进内存
~~~

### 【Task State Machine 让系统知道任务现在处于什么阶段】

一个实际任务至少需要明确：

~~~text
Pending
   ↓
Processing
   ↓
Completed

或

Processing
   ↓
Retry Waiting
   ↓
Pending

或

Processing
   ↓
Terminal Failed / Dead Letter
~~~

如果系统只知道“Queue 里有 / 没有”，就很难回答任务是否已经被某个 Worker 拿走、处理多久、Worker 是否 Crash、尝试过几次、为什么失败、是否应该重新领取。所以任务状态本身就是可靠性数据。

### 【Claim、ACK 与 Lease 解决 Consumer 所有权和 Crash Recovery】

多个 Worker 并发时不能只 SELECT 第一个 pending task，否则两个 Worker 可能同时拿到同一任务。常见协调方式包括 Database Row Lock、Broker Delivery + ACK、Visibility Timeout、Lease / locked_until。

Lease 模型可以表示为：

~~~text
Worker A Claim
        ↓
task.owner = A
task.lease_until = 10:05
        ↓
A 正常完成
        ↓
Completed

如果 A Crash
        ↓
10:05 Lease Expired
        ↓
Worker B Reclaim
~~~

Lease 过短会让正常长任务被误判失联并重复执行；Lease 过长会让 Crash 后恢复过慢。长任务因此通常需要 Heartbeat / Lease Renewal。

### 【At-least-once 要求业务接受任务可能再次执行】

典型 Crash Window：

~~~text
Worker 执行业务写入
      ↓
Database COMMIT 成功
      ↓
Worker Crash
      ↓
还没 ACK / 标记 Completed
~~~

恢复以后系统看到任务没有完成确认，于是 Redelivery / Reclaim，同一任务再次执行。因此“不丢任务”往往意味着“允许重复投递”。

Consumer 需要通过 Idempotency Key、Unique Constraint、ON CONFLICT、Version / Sequence、State Transition Check 等机制保证重复执行不会重复产生副作用。

Exactly-once 不能只从 Broker 的 Delivery Feature 判断，而必须把 Task Delivery、Consumer Side Effect、Database Commit 和 ACK Boundary 一起看。

### 【Retry Policy 要先区分可恢复、确定失败和结果未知】

Task Failure 至少分三类：

| 类型 | 示例 | 处理 |
| --- | --- | --- |
| Transient | 网络抖动、短暂 503、DB Connection Failure | Retry + Backoff |
| Permanent / Deterministic | Payload 非法、任务类型不支持、业务条件永久不满足 | Fail Fast / Dead Letter |
| Unknown Result | 外部副作用可能已成功但响应丢失 | Reconciliation / Idempotent Retry |

如果所有 Error 都统一“Retry 8 次”，只是延迟发现永久问题，还持续浪费 CPU、Connection 和 Queue Capacity。

任务记录通常需要保留 attempts、last_error、next_available_at、status、first_failed_at、last_failed_at 等状态。Backoff 可以使用指数增长并加入 Jitter，避免大量失败任务在同一时间一起回潮。

### 【Dead Letter 是人工恢复边界，不是失败垃圾桶】

任务达到最大重试次数以后应该进入可观察终态：

~~~text
Retry Exhausted
      ↓
Dead Letter
      ↓
保留 Task / Error / Attempts / Context / Failed At
      ↓
人工判断
      ├─ 修复数据后 Replay
      ├─ 修复代码后 Replay
      ├─ 标记无需执行
      └─ 执行 Compensation
~~~

Dead Letter 的真正价值，是把“系统无法自动恢复”变成“可审计、可修复、可人工决定下一步”的明确边界。

### 【任务可靠性必须用 Lag、Wait、Attempts 与终态分布验证】

只看 Worker Process Alive 不够。至少要观察：

~~~text
Enqueue Rate
Processing Rate
Pending Count
Oldest Pending Age
Queue Wait Duration
Processing Duration
Retry Rate
Attempts Distribution
Dead Letter Count
~~~

例如 Pending = 1000 可能完全正常，如果最老任务只等待 1 秒；Pending = 50 也可能严重失控，如果最老任务已经等待 30 分钟。完整的 Queue、Broker、Delivery、Claim / Lease、Idempotency、Retry、Dead Letter 与 Backpressure 模型继续阅读 [服务端异步任务与消息处理体系](./F-服务端异步任务与消息处理体系.md)。

## 5. 容量与过载可靠性保证生产速度超过处理能力时系统仍然受控

很多系统在正常流量下完全正确，真正的问题只在 Peak Traffic（流量高峰）或下游变慢时出现。可靠性因此不仅是“失败后恢复”，还包括“当工作进入速度超过处理能力时，不让系统进入不可逆失控”。

### 【Queue 能吸收短时 Burst，但不能创造处理能力】

假设：

~~~text
Arrival Rate λ = 10,000 / s
Processing Capacity μ = 6,000 / s
~~~

每秒都会多出：

~~~text
Backlog Growth = λ - μ = 4,000 / s
~~~

一分钟以后理论上就会新增约 240,000 个等待工作。Queue 可以把同步失败转成时间缓冲，但只要 λ 长期大于 μ，积压就一定持续增加。

短时 Burst 的典型价值是：

~~~text
正常 Capacity = 1000 / s

突然 5 秒进入 1500 / s
        ↓
Queue 暂存 2500
        ↓
流量恢复到 800 / s
        ↓
Consumer 使用剩余能力逐渐追平
~~~

如果 Producer 长期维持 1500 / s、Consumer 只能 1000 / s，Queue 最终会遇到磁盘 / 内存上限、消息 Age 超过业务 Deadline、历史积压反过来拖慢数据库等问题。所以 Queue 是缓冲，不是无限容量。

### 【Queue Depth 只能说明多少任务在等，Age 才说明业务等了多久】

容量可靠性至少观察：

| 指标 | 回答的问题 |
| --- | --- |
| Arrival Rate | 每秒新增多少工作 |
| Processing Rate | 每秒真正完成多少 |
| Queue Depth | 当前积压多少 |
| Oldest Item Age | 最老任务已经等待多久 |
| Queue Wait Duration | 一条任务从入队到开始执行等多久 |
| Processing Duration | 真正业务处理本身多慢 |
| Saturation | CPU、DB Pool、Thread、Disk、External Quota 是否接近上限 |

例如：

~~~text
Queue A
10,000 tasks
Oldest = 2s

Queue B
200 tasks
Oldest = 30min
~~~

如果业务 SLO 是 5 分钟内处理，真正已经违约的是 B。只看 Depth 很容易误判。

### 【Backpressure 的本质是把下游处理能力反向传回上游】

当 Consumer 已经追不上，不能只继续扩 Queue。Backpressure（背压）要求上游感知下游容量，并减少进入系统的工作。

~~~text
Client
  ↓
Rate Limit / Quota
  ↓
API
  ↓
Bounded Concurrency
  ↓
Queue
  ↓
Bounded Queue / Admission Control
  ↓
Worker
  ↓
Consumer Concurrency
  ↓
Database / External Service
~~~

不同手段保护的位置不同。这里的 Retry Budget 与第 2 章 Retry Policy 属于同一控制链：第 2 章决定“哪些失败值得重试以及由哪一层负责重试”，容量治理进一步限制“系统在故障期间最多还能承受多少额外 Retry 流量”。

| 手段 | 主要解决的问题 |
| --- | --- |
| Rate Limit | 限制入口总流量，防止所有请求同时进入 |
| Retry Budget / Token Bucket | 限制故障期间由 Retry 产生的额外流量，避免恢复阶段继续放大下游压力 |
| Bounded Queue | 队列达到容量后明确拒绝或降级，而不是无限增长 |
| Concurrency Limit | 防止同时执行太多任务压垮共享依赖 |
| Batch | 降低每条任务的固定网络 / SQL 开销 |
| Load Shedding | 过载时主动放弃低优先级或过期工作 |
| Consumer Scaling | 在下游仍有容量时提高处理能力 |
| Priority Queue | 让关键任务优先于低价值任务 |

### 【Scale Out 前先确认瓶颈不是共享依赖】

单 Worker 每秒能处理 100 个 Task，不代表 10 个 Worker 一定能达到 1000 / s。假设所有 Worker 共用 50 个 Database Connection：

~~~text
Worker 1..10
      ↓
全部竞争同一个 DB Pool
      ↓
Connection Wait / Lock Contention
      ↓
Throughput 不再增加
Latency 反而继续上升
~~~

所以 Backlog 增长时应该先定位：Processing Duration 是不是变慢、CPU 是否饱和、DB Pool 是否等待、Lock 是否增加、Storage I/O 是否到顶、外部 API 是否有限额，然后再决定增加 Worker、优化 Query、Batch、提高资源配额还是限流。

### 【Load Shedding 用明确拒绝替代全系统慢性崩溃】

当系统已经超过设计容量，有些工作应该主动拒绝或丢弃：

~~~text
可重试写请求
→ 429 / 503 + Retry-After

低优先级异步任务
→ 延迟 / 丢弃 / 降采样

已经过期的实时任务
→ 不再消费旧任务
~~~

这不是“系统不可靠”，而是为了保护更重要的承诺。可靠性真正关心的是：过载时失败是否有边界、是否可预测、是否优先保护关键业务。

### 【容量设计要从目标吞吐、峰值、恢复速度和资源上限共同计算】

实践中可以先列一张 Capacity Sheet：

| 项目 | 示例 |
| --- | --- |
| 平均输入 | 2,000 events/s |
| 峰值输入 | 8,000 events/s，持续 3 分钟 |
| 单 Worker 稳态能力 | 1,500 events/s |
| 最大 Worker 数 | 8 |
| DB 最大安全写入 | 10,000 events/s |
| 可接受 Queue Age | 2 分钟 |
| Queue Storage 上限 | 2 小时峰值 |

然后验证：峰值期间积压增长多少、峰值结束后多久追平、扩容是否会先撞到数据库上限、Queue Age 是否会违反业务 SLO。这样 Capacity Reliability 才从“加机器”变成可计算的工程设计。

## 6. 运行与部署可靠性让进程从能启动变成能安全加入和退出服务

源码编译成功并不代表服务已经可用。一个完整运行生命周期更接近：

~~~text
Load Config
      ↓
Initialize Dependencies
      ↓
Process Started
      ↓
Startup Complete
      ↓
Ready
      ↓
Receive Traffic / Task
      ↓
Running
      ↓
Not Ready / Draining
      ↓
Graceful Shutdown
      ↓
Stopped
~~~

可靠性必须覆盖启动、运行、故障、退出和重新加入，而不只是“进程能否启动”。

### 【Config Validation 把配置错误提前到 Startup 阶段】

如果生产缺少 DATABASE_URL、Secret 或关键外部地址，但程序仍然启动，问题可能直到某个用户请求才暴露。更可靠的做法是：

~~~text
Process Start
      ↓
Parse Config
      ↓
Schema Validation
      ↓
Invalid
  → Fail Fast

Valid
  → Continue Bootstrap
~~~

Startup Failure 是明确失败，可以直接阻止坏实例加入服务；“容器 Running 但部分功能随机报错”反而更危险。

### 【Startup、Liveness 与 Readiness 判断三个不同生命周期状态】

Kubernetes 官方明确区分 Startup Probe、Liveness Probe 与 Readiness Probe：Startup 判断应用是否完成启动；Liveness 判断实例是否需要被重启；Readiness 判断是否应该继续接收流量。[[11]](https://kubernetes.io/docs/concepts/workloads/pods/probes/)

可以用三个问题理解：

~~~text
Startup
应用是否已经启动完成？

Liveness
这个实例是否已经坏到需要重启？

Readiness
这个实例现在是否能正确服务请求？
~~~

例如 Process 正常，但 Database 暂时不可用，可能应该是：

~~~text
Liveness = true
Readiness = false
~~~

此时实例继续运行等待依赖恢复，但 Load Balancer 暂停给它流量，而不是不断 Restart。

Kubernetes 官方也特别警告错误 Liveness Probe 会在高负载下制造级联重启：某个实例因为负载高暂时响应慢，被误判为“死掉”后重启，剩余实例承受更多流量，又继续被重启。[[11]](https://kubernetes.io/docs/concepts/workloads/pods/probes/)

因此 Health Endpoint 不能只是一个固定 return 200 的 /health，而要明确每个 Endpoint 的业务语义。

### 【Readiness 依赖检查不能把所有下游都机械设成关键依赖】

如果一个 API 核心写入依赖 Database，但推荐列表依赖某个可选缓存，那么：

~~~text
Database Down
→ 核心请求无法正确执行
→ Readiness 可能应该失败

Optional Cache Down
→ 可以退化为 Database Query
→ 不一定要把整个实例摘流量
~~~

Health Check 本质也是 Dependency Classification：Hard Dependency 才影响 Ready；Soft Dependency 更适合降级并暴露独立指标。

### 【Restart 只重新创建 Runtime Instance，不自动恢复业务状态】

Process Manager 或 Container Runtime 可以把 Crash 的进程重新启动，但 Restart 不会自动回答：Crash 前领取的 Task 怎么办、内存 Session 怎么办、正在执行的外部支付怎么办、Database 自身损坏怎么办。

所以必须区分：

~~~text
Restart
→ 恢复 Runtime Instance

Task Recovery
→ Durable State / Lease / Redelivery

Data Recovery
→ WAL / Replica / Backup

External Side Effect Recovery
→ Idempotency / Reconciliation
~~~

这也是为什么设置 restart: always 或 always-on supervisor 不能等同于系统可靠。

### 【Graceful Shutdown 在正常退出路径上减少主动制造的半执行状态】

部署、扩容和节点维护都会主动终止实例。如果直接 Kill，正在接收的 Request、正在执行的 Task 和 Buffer 都可能突然中断。

完整 Shutdown 流程通常是：

~~~text
收到 SIGTERM
      ↓
Readiness = false
停止接收新 Traffic / 新 Task
      ↓
等待 In-flight Work
      ↓
到达 Drain Deadline？
      ├─ No → 正常完成
      └─ Yes → 中止，但状态必须可恢复
      ↓
Flush 必要 Buffer
      ↓
Close DB / Redis / Network
      ↓
Exit
~~~

关键边界是：Graceful Shutdown 不是无限等待，而是在平台提供的终止预算内尽量落到可恢复状态。所以 Task 系统仍然必须能够处理 Grace Period 到期后的强制终止。

### 【Rolling Deployment 需要把 Readiness、Drain 与版本兼容一起考虑】

多实例滚动发布时：

~~~text
Old Version A
Old Version B
      ↓
Start New Version C
      ↓
C Startup Ready
      ↓
开始接流量
      ↓
A Readiness false + Drain
      ↓
A Exit
~~~

此时还要检查新旧版本是否可以同时访问同一 Database Schema、Queue Payload 或 Cache Key。如果 Schema Migration 只兼容新代码，却在所有旧实例退出前执行，就可能让 Rolling Deployment 变成跨版本故障。

所以 Deployment Reliability 不只是 Container Restart，还包括 backward-compatible migration、readiness gate、drain 和 rollback。

### 【多实例高可用要求状态从单实例内存迁移到共享或可恢复边界】

当系统扩成 API A / B / C，多实例只能解决单实例失效后的流量承接；Session、Task、Lock、业务状态如果仍只存在某个实例 Memory，Failover 后仍然丢失。

因此高可用设计还必须判断 State Placement：哪些状态允许 Local Ephemeral，哪些必须进入 Shared Cache、Database、Durable Queue 或其他可恢复存储。多开实例不是高可用的全部，只是其中的计算实例冗余。

## 7. 可观测性、SLO 与故障演练把可靠性从设计方案变成可验证结果

可靠性机制存在于代码里，并不等于它真的有效。已经写了 Retry，但每次都失败；已经做了 Backup，但 Restore 不出来；已经有 Worker，但 Queue 积压了三小时；已经有 Readiness，但它永远返回 200——这些都属于“实现存在、可靠性能力不存在”。

因此可靠性的最后一层不是再增加机制，而是建立证据。

### 【用户结果指标和内部机制指标必须同时存在】

第一类指标观察用户真正感受到什么：

~~~text
Availability
Request Success Rate
Latency
Task Completion SLO
Data Freshness
~~~

第二类指标观察为什么会变成这样：

~~~text
Dependency Timeout Rate
Retry Rate
Circuit Open Count
Queue Depth
Oldest Task Age
Dead Letter Count
Replication Lag
Restart Count
DB Pool Saturation
~~~

两者的关系是：Internal Signal 用来解释 User-facing SLI。只看 HTTP 200 无法证明后台任务没有积压；只看 CPU 也无法证明用户操作成功。

### 【Golden Signals 是监控入口，不是最终业务指标】

Google SRE 常用 Latency、Traffic、Errors、Saturation 四类信号作为生产服务观察入口。[[1]](https://sre.google/sre-book/service-best-practices/)

同步 API 可以映射成：

| Signal | 示例 |
| --- | --- |
| Latency | HTTP P50 / P95 / P99 |
| Traffic | Requests / s |
| Errors | 5xx、Timeout、业务拒绝 |
| Saturation | CPU、DB Connection Pool、Thread Pool |

Worker 则需要重新定义：

| Signal | 示例 |
| --- | --- |
| Latency | Queue Wait + Processing Duration |
| Traffic | Enqueue Rate / Processing Rate |
| Errors | Retry / Failed / Dead Letter |
| Saturation | Worker Concurrency、DB Pool、CPU |

因此“所有服务统一看 QPS、CPU、5xx”不够。可靠性指标必须跟运行模型和业务完成语义对应。

### 【SLO 应表达业务承诺，资源指标主要用于解释原因】

CPU < 80%、Memory < 70% 可以作为 Saturation Signal，但通常不是用户真正关心的 SLO。

更接近业务承诺的目标是：

~~~text
30 天窗口内
99.9% 的有效 API 请求成功

99% 的已接受异步任务
在 2 分钟内进入 Completed / 明确 Failed 终态

关键数据恢复演练中
RPO ≤ 5min
RTO ≤ 30min
~~~

SLO 还需要对应操作策略。否则“99.9%”只是报表数字。

例如：

~~~text
Error Budget 消耗过快
        ↓
暂停高风险发布
        ↓
优先修复可靠性缺陷
        ↓
恢复预算后再继续快速迭代
~~~

### 【告警要从需要行动的问题出发，而不是所有指标都设阈值】

一个好的 Alert 应该回答：现在是否需要人采取行动？

例如：

~~~text
CPU 82%
但请求 SLO 正常
Queue Age 正常
→ 可能只需要观察

Oldest Task Age > 20min
而 Task SLO = 5min
→ 明确业务违约，应告警
~~~

因此可靠性告警更适合围绕：

~~~text
SLO Burn Rate
持续错误率
持续 Queue Lag
Dead Letter 增量
Replication Lag
Readiness 大面积失败
Restore / Backup Job Failure
~~~

而不是把每个瞬时指标都做成 Pager。

### 【可靠性测试必须主动制造故障，而不只验证 Happy Path】

正常 E2E：Request → 200，只证明正常环境工作。可靠性验证应该覆盖：

~~~text
Dependency Slow / Down
Network Timeout
Process Crash
Worker Crash
Duplicate Delivery
Retry Exhausted
Queue Backlog
Database Failover
Redis Unavailable
Bad Config
SIGTERM During Work
Backup Restore
PITR
~~~

每个测试都检查四类结果：

~~~text
1. 故障前已经确认成功的数据有没有丢？
2. 未完成工作能不能恢复或进入明确失败？
3. 恢复以后是否产生重复副作用？
4. Metrics / Logs / Alerts 能不能发现这次故障？
~~~

例如 Worker Crash Test：

~~~text
准备 1000 tasks
      ↓
Worker Processing 中强制 Kill
      ↓
Restart / Other Worker 接管
      ↓
等待任务进入终态
      ↓
验证
completed + failed = accepted
无重复业务副作用
stale / redelivery 可观察
恢复时间满足 Task SLO
~~~

这才是在验证 Crash Recovery，而不是只确认 Worker 又启动了。

### 【Recovery Drill 要验证完整操作链和真实 RPO / RTO】

真实事故时恢复失败，经常不是因为“完全没有备份”，而是因为最新 Backup 找不到、权限过期、Secret 丢失、Runbook 过时、DNS / Traffic 切换顺序不清楚、恢复后没有一致性校验。

因此 Recovery Runbook 至少写清：

| 项目 | 内容 |
| --- | --- |
| Trigger | 什么条件触发恢复 / Failover |
| Owner | 谁负责决策和执行 |
| Steps | 恢复、切换、验证的顺序 |
| Validation | 哪些 Query / Smoke Test 证明结果正确 |
| Rollback | 恢复流程本身失败时怎么办 |
| Evidence | 记录实际 RPO、RTO、Timeline |

一次 Restore Drill 应从真实备份开始，到应用 Smoke Test 结束，而不是只运行数据库恢复命令。最终记录实际丢失窗口和实际恢复耗时，再与目标 RPO / RTO 比较。

因此可靠性形成真正闭环：

~~~text
Design
   ↓
Implementation
   ↓
Failure Injection
   ↓
Observation
   ↓
Recovery
   ↓
Verification
~~~

## 8. 服务端可靠性设计沿保护、隔离、恢复和证明四步落到具体方案

前面的机制很多，但实际做系统设计时不应该从名词清单重新开始。可以固定使用“画链路 → 找失败边界 → 选择控制 → 定义验证”这一套方法。

### 【第一步先画业务主链并标出真正的完成边界】

例如：

~~~text
Client
  ↓
API
  ↓
Database
  ↓
Outbox
  ↓
Worker
  ↓
External Service
~~~

不要只写组件名称，要为每个节点标出：

~~~text
输入是什么？
成功是什么？
状态保存在哪里？
失败后调用方知道吗？
结果会不会 Unknown？
Process Crash 后还能不能恢复？
是否可能重复执行？
容量上限在哪里？
~~~

例如“API 返回 202”如果只表示 Task 已进入内存，那么它不是可靠接受；如果表示 Durable Task 已 COMMIT，那么才有明确恢复基础。

### 【第二步把每个 Failure 映射到 Protect、Isolate、Recover】

| Failure | Protect | Isolate | Recover |
| --- | --- | --- | --- |
| Invalid Request | Validation | — | Fail Fast |
| Traffic Spike | Rate Limit | Bounded Concurrency | Scale / Shed Load |
| Slow Dependency | — | Timeout / Circuit Breaker | Retry / Fallback |
| Duplicate Request | Idempotency Key | — | Return Existing Result |
| Partial DB Write | Constraint / Transaction | Transaction Boundary | Rollback |
| Process Crash | Durable State | Instance Boundary | Restart |
| Worker Crash | Durable Queue | Lease | Redelivery |
| Duplicate Delivery | Idempotency | Consumer Boundary | Safe Re-execution |
| Permanent Task Error | Validation | Retry Limit | Dead Letter / Repair |
| Primary DB Failure | Replication | Fault Domain | Failover |
| Accidental DELETE | Backup / PITR | Backup Isolation | Restore |
| Region Failure | Cross-region Copy | Region Boundary | DR Failover |

这张表的价值是把机制重新挂回 Failure，而不是让“Retry、Backup、Health、Queue”成为互相没有关系的名词。

### 【第三步给每个机制写清代价和不适用边界】

可靠性机制都有成本：

~~~text
Synchronous Replication
→ RPO 更低
→ Write Latency / Availability Cost 更高

Retry
→ 瞬态恢复概率更高
→ 下游压力更大

Circuit Breaker
→ 防止持续拖垮上游
→ 故障期间会产生更多快速失败

Backup Retention
→ 可恢复历史更长
→ Storage / Compliance Cost 更高

More Replicas
→ Instance Availability 更高
→ 运维、成本、一致性和 Failover 复杂度更高
~~~

所以一个好的设计不仅要说明“为什么用”，还要说明“为什么当前复杂度值得”。

### 【第四步给每一个可靠性声明绑定最小验证证据】

不要只写“支持 Retry”“做了 HA”“有 Backup”。每个声明都应该有对应测试：

| 声明 | 最低验证证据 |
| --- | --- |
| Retry 有效 | 注入 Retryable Failure，观察 Attempt、Backoff 和最终结果 |
| Idempotency 有效 | 同一 Operation 重放多次，只产生一次业务副作用 |
| Worker Crash 可恢复 | Processing 中 Kill Worker，任务最终被 Reclaim |
| Readiness 有效 | 关键依赖断开后实例停止接流量，恢复后重新加入 |
| Backup 可恢复 | 隔离环境 Restore + Data Check + Application Smoke Test |
| PITR 有效 | 制造误删并恢复到误删前 Recovery Target |
| Failover 满足 RTO | 主实例故障演练并记录服务恢复耗时 |
| RPO 达标 | 比较故障前最后提交点与恢复后的最后可用事务 |

这把“可靠性设计”变成可验收工程。

### 【一套通用可靠性评审可以按八个问题执行】

对一个新的 Service、Job 或数据链路，可以连续问：

1. 这个能力向调用方承诺的成功边界是什么？
2. 关键状态保存在哪里，Process Crash 后还存在吗？
3. 哪些依赖可能 Slow / Down，等待上限是多少？
4. 哪些操作可能被重复调用，副作用是否幂等？
5. 异步任务如何 Claim、Recover、Retry，并最终进入终态？
6. 流量超过处理能力时在哪里限流、背压或丢弃？
7. 实例、数据库或整个故障域失效时分别如何恢复？
8. 用哪些 SLI、Failure Test、Restore Drill 证明以上方案成立？

如果这八个问题都能沿真实数据流回答，可靠性方案通常已经从“组件堆积”进入“系统设计”。

### 【服务端可靠性最终形成四类长期控制】

~~~text
Protect
在非法输入、重复操作和过载进入核心资源前保护系统

Isolate
用 Timeout、Circuit、Bulkhead、Fault Domain 限制故障传播

Recover
用 Transaction、Idempotency、Retry、Replay、Failover、Restore
把系统带回可信状态

Prove
用 SLI / SLO、Metrics、Failure Injection、Restore Drill
证明可靠性目标真的成立
~~~

对应回服务端主线：

| 服务端主线 | 可靠性重点 |
| --- | --- |
| Request Processing | Validation、Idempotency、Deadline、Timeout、Rate Limit |
| State & Data | Constraint、Transaction、WAL、Replication、Backup、PITR |
| Async Processing | Durable Task、Claim、Lease、Idempotency、Retry、Dead Letter |
| Runtime & Deployment | Config Validation、Startup、Readiness、Restart、Graceful Shutdown、Failover |
| Cross-cutting | Dependency Isolation、Capacity、Observability、SLO、Recovery Drill |

> **不要先问“应该加什么可靠性组件”，而要先沿请求、状态、任务和运行四条链找失败边界，再决定每个边界保护什么、允许怎样失败、怎样恢复，以及用什么证据证明恢复真的发生。**

相关专题继续阅读：

- [服务端完整框架体系](./F-服务端完整框架体系.md)：定位 Reliability 在服务端整体架构中的横向位置。
- [数据库完整框架体系](./S-数据库完整框架体系.md)：深入 Transaction、Concurrency、WAL 与数据库内部机制。
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

[7] PostgreSQL Global Development Group. Reliability and the Write-Ahead Log. PostgreSQL Documentation. https://www.postgresql.org/docs/current/wal.html

[8] PostgreSQL Global Development Group. Continuous Archiving and Point-in-Time Recovery. PostgreSQL Documentation. https://www.postgresql.org/docs/current/continuous-archiving.html

[9] PostgreSQL Global Development Group. Log-Shipping Standby Servers / Streaming Replication. PostgreSQL Documentation. https://www.postgresql.org/docs/current/warm-standby.html

[10] PostgreSQL Global Development Group. Backup and Restore. PostgreSQL Documentation. https://www.postgresql.org/docs/current/backup.html

[11] Kubernetes. Liveness, Readiness, and Startup Probes. https://kubernetes.io/docs/concepts/workloads/pods/probes/
