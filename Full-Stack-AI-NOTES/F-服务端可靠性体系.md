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

## 1. 服务端可靠性从目标、失败模型和可靠性边界开始设计

### 【可靠性首先回答系统在故障发生时还需要保证什么】

可靠性设计的第一步不是选择技术，而是确定系统最重要的承诺。

一个服务可能需要分别保证：

| 可靠性目标 | 需要回答的问题 | 常见证据 |
| --- | --- | --- |
| Request Reliability | 合法请求能否在可接受时间内得到明确结果 | 成功率、延迟、超时率 |
| State Reliability | 已确认成功的数据是否保持正确并可恢复 | Transaction、Durability、Backup |
| Task Reliability | 已接受的后台工作是否最终完成或进入明确终态 | Queue Lag、Retry、Dead Letter |
| Dependency Reliability | 下游故障是否会无限拖垮上游 | Timeout、Circuit Breaker、Fallback |
| Runtime Reliability | 进程或实例故障后服务能否恢复 | Health、Restart、Failover |
| Capacity Reliability | 流量超过容量时是否仍然受控 | Rate Limit、Backpressure、Load Shedding |

这些目标并不等价。例如进程仍然存活，不代表数据库可访问；HTTP 202 已经返回，也不代表后台任务已经完成；数据库事务已经提交，也不代表下游缓存一定刷新成功。

因此可靠性必须先明确**完成语义和承诺边界**。

### 【失败模型决定可靠性机制应该放在哪里】

**<u>可靠性不是消灭所有故障，而是假设故障一定会发生，再决定系统怎样处理。</u>**

典型故障可以沿边界分类：

~~~text
Client / Traffic
├── 非法输入
├── 重复请求
└── 突发流量

Application
├── Exception              （异常：未捕获 / 业务异常）
├── Timeout                （处理超时）
└── Process Crash          （进程崩溃）

Database / Cache
├── Connection Failure     （连接失败 / 连接池耗尽）
├── Transaction Conflict   （事务冲突：死锁 / 序列化失败）
├── Slow Query             （慢查询）
└── Data Loss Risk         （数据丢失风险：持久化 / 备份不足）

Async Work
├── Worker Crash           （消费者崩溃）
├── Duplicate Delivery     （重复投递：At-least-once 的必然产物）
├── Poison Task            （毒任务：反复失败、永远处理不成功的任务）
└── Queue Backlog          （队列积压）

External Dependency
├── Slow Response          （下游响应慢）
├── Partial Failure        （部分失败：一次调用里部分子操作成功、部分失败）
└── Unknown Result         （结果未知：超时后不知对方到底成功没有）

Deployment
├── Bad Config             （配置错误）
├── Startup Failure        （启动失败）
└── Shutdown During Work   （运行中关停：还有任务在处理时退出）
~~~

同一个 Retry 不能解决所有失败。例如参数错误原样重试没有价值；结果未知的有副作用请求如果直接重放，反而可能制造重复写入。

所以可靠性设计应遵循：

~~~text
Failure
  ↓
先分类
  ↓
判断是否可恢复
  ↓
选择保护 / 隔离 / 重试 / 补偿 / 终止
~~~

### 【SLO 把“稳定”转换成可以判断的工程目标】

Google SRE 将 Service Level Objective（SLO，服务级目标）作为衡量服务可靠性的重要方式，并强调目标应从用户体验出发，而不是简单要求 100% 可用。Error Budget（错误预算）则把允许失败的空间显式化，用来平衡可靠性与功能迭代。[[1]](https://sre.google/sre-book/service-best-practices/) [[2]](https://sre.google/sre-book/embracing-risk/)

因此：

~~~text
可靠性目标
≠
“永不失败”

更合理的是

什么指标代表用户可用
+
允许多少失败
+
超过边界后怎样响应
~~~

## 2. 请求与依赖可靠性限制一次调用把局部故障放大成系统故障

请求链路的可靠性首先解决两个问题：**不应该进入系统的工作要尽早拒绝；已经进入系统的工作不能因为依赖异常无限占用资源。**

### 【请求准入把非法输入、重复操作和过量流量挡在昂贵资源之前】

典型请求入口可以先建立：

~~~text
Request
  ↓
Protocol / Schema Validation
  ↓
Authentication / Authorization
  ↓
Idempotency / Duplicate Control
  ↓
Rate Limit / Quota
  ↓
Business Logic
  ↓
Database / External Dependency
~~~

越靠前拒绝无效请求，越少消耗数据库连接、线程、CPU 和外部配额。

Rate Limit（限流）不是只为了防攻击，它也是可靠性保护：当系统容量有限时，宁可让部分请求得到明确的 429 / overload 结果，也不要让所有请求同时进入下游后一起超时。

### 【Timeout 为依赖调用建立有限等待边界】

如果一个服务调用下游时没有 Timeout（超时边界），下游变慢就可能让上游请求长时间占用连接、内存和并发槽位。

因此依赖调用至少需要明确：

~~~text
Request Deadline
      ↓
单次 Dependency Timeout
      ↓
是否允许 Retry
      ↓
总重试预算
~~~

AWS 关于 Timeout 的工程建议同样强调：调用远程服务时应设置连接和请求超时；超时过长会使资源长时间被占用，过短又会制造不必要的失败。[[3]](https://docs.aws.amazon.com/wellarchitected/latest/framework/rel_mitigate_interaction_failure_client_timeouts.html)

### 【Retry 只适用于有机会通过再次执行恢复的失败】

Retry（重试）会把一次失败变成多次请求，因此它既可能恢复服务，也可能放大故障。

~~~text
Dependency 已经过载
      ↓
大量调用失败
      ↓
所有上游立即 Retry
      ↓
流量再次放大
      ↓
依赖更难恢复
~~~

因此重试通常需要和以下机制组合：

- Backoff（退避）：逐步拉开重试时间；
- Jitter（随机抖动）：避免大量客户端在相同时间再次请求；
- Retry Limit：限制总次数；
- Deadline：限制整个操作最多等待多久；
- Idempotency：有副作用操作必须先保证重复执行安全。

对于明显不可恢复的输入错误、权限拒绝和确定性业务错误，应 Fail Fast（快速失败），而不是不断重试。AWS Builders Library 对 Timeout、Retry、Backoff 和 Jitter 的讨论也强调了这一点。[[4]](https://aws.amazon.com/builders-library/timeouts-retries-and-backoff-with-jitter/)

### 【Circuit Breaking 与隔离用于阻止持续失败向上游传播】

当某个依赖持续不可用时，每次调用都等待 Timeout 再失败会持续消耗资源。Circuit Breaker（熔断）是一种常见故障隔离策略：在失败率达到阈值后暂时停止正常调用，让依赖有恢复空间，再通过受控探测决定是否恢复。

它不是所有系统都必须使用的固定组件。是否值得引入，应根据：

~~~text
依赖故障是否频繁
调用成本是否高
是否存在替代结果
是否允许短时间快速失败
恢复探测怎样完成
~~~

共同判断。

举例来说：订单服务调用下游的「库存查询」API。当库存服务因数据库故障持续超时或返回 5xx 时，如果不熔断，每次下单都要等满 Timeout（例如 3 秒）才失败——不仅下单变慢，等待中的线程 / 连接还被长期占用，故障于是沿调用链向订单服务、网关乃至前端传播。Circuit Breaker 在失败率达到阈值后直接快速失败（不再真正发起调用），既给下游留出恢复空间，也保护了调用方资源；随后进入 Half-Open，放行少量探测请求，成功则关闭熔断、恢复正常调用。

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
