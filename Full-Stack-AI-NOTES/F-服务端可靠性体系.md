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

这四层不是“越往下越高级”，而是保护不同失败。

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
