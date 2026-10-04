# Redis 完整知识体系

> **定位**：这是一篇脱离具体项目也能成立的 Redis 通用主文档。它不从 GET / SET 命令列表出发，而是沿“系统位置 → 状态建模 → 原子执行 → 工程状态模式 → 数据一致性 → 持久化与高可用 → 规模化治理 → 生产安全”的主线建立完整框架。
>
> **学习边界**：本文负责 Redis 自身的通用知识。数据库事务与关系数据模型继续阅读 [数据库完整框架体系](./S-数据库完整框架体系.md)；异步任务与消息处理继续阅读 [服务端异步任务与消息处理体系](./F-服务端异步任务与消息处理体系.md)；身份与 Session 继续阅读 [Web 身份认证、会话控制与访问控制体系](./W-Web身份认证会话控制与访问控制体系.md)。
>
> **项目实践**：Browser Monitor 中 Session、Token Bucket、运行统计、Analytics Cache、Version Key 与 Redis 可靠性实践统一放在文末“项目实践入口”，不反向定义本文的通用知识结构。

Redis 的知识体系可以先压缩成一条长期主线：

~~~text
应用需要共享状态
        ↓
为什么不用进程内存 / 为什么不直接全部放关系数据库
        ↓
Redis Server 提供共享 Keyspace
        ↓
选择合适的数据结构 + TTL
        ↓
通过 Command / Transaction / Lua 保证状态变化边界
        ↓
组合成 Cache / Session / Counter / Rate Limit / Stream 等状态模型
        ↓
处理 Redis 与 Source of Truth 之间的一致性
        ↓
再解决 Persistence / Replication / Sentinel / Cluster
        ↓
最后进入 Memory / Hot Key / Security / Observability / Capacity Governance
~~~

只看目录时，应始终能回答三个问题：

~~~text
这份状态是什么？
↓
它为什么适合 Redis？
↓
Redis 故障、并发或扩容以后，这份状态怎样继续正确工作？
~~~

---

## 1. Redis 的核心定位是共享内存状态服务，而不只是“缓存”

### 【Redis 首先是独立 Redis Server，不是应用进程中的 Map】

Redis（Remote Dictionary Server，远程字典服务）首先是一个独立运行的服务器进程。应用通过 Redis Client 与它通信，因此多个 API、Worker 或其他服务可以访问同一份状态。

~~~text
API A ─┐
API B ─┼── Redis Server ── Keyspace
Worker ─┘
~~~

这与进程内 Map 的本质区别是状态作用域：

| 方案 | 状态作用域 | 进程重启 | 多实例共享 |
| --- | --- | --- | --- |
| JavaScript Map / Memory | 单进程 | 丢失 | 不共享 |
| Redis | 独立服务 | 取决于 Persistence | 共享 |
| PostgreSQL | 独立数据库 | 持久 | 共享 |

所以 Redis 的第一个工程价值不是“快”，而是：

> **把原本只能存在于单个应用进程中的运行状态提升成多实例共享状态。**

### 【Redis 适合高频、短生命周期、可派生或运行时共享状态】

一个状态是否适合 Redis，不应该只看“读写频繁”。更完整的判断维度是：

~~~text
状态是否需要多实例共享？
        ↓
是否高频读写？
        ↓
是否具有明确 TTL？
        ↓
丢失后能否重建？
        ↓
是否需要复杂关系约束与多表事务？
~~~

典型适合 Redis 的状态：

- Session / Login Runtime State；
- Cache；
- Rate Limit；
- Counter；
- Idempotency Window；
- 短期时间窗口；
- 分布式协调状态；
- Pub/Sub / Stream 场景中的运行数据。

典型更适合关系数据库的状态：

- 订单、支付、账户余额等权威业务事实；
- 复杂关系与 Foreign Key；
- 需要跨多行、多表事务保护的不变量；
- 长期审计历史。

因此：

~~~text
Redis
≠ 更快的 PostgreSQL

Redis
= 为特定访问模式设计的共享状态基础设施
~~~

### 【Source of Truth 决定 Redis 故障后的恢复方向】

Source of Truth（权威数据源）：系统最终认定哪一份状态是真实业务事实。

例如：

~~~text
PostgreSQL
保存订单事实

Redis
保存订单查询 Cache
~~~

Redis Cache 丢失后：

~~~text
Redis Miss
↓
重新查询 PostgreSQL
↓
Rebuild Cache
~~~

恢复方向是：

~~~text
PostgreSQL → Redis
~~~

这与“Redis 是否开启 AOF”是两个不同问题。Persistence 可以提高 Redis Dataset 恢复能力，但不会自动把 Redis 提升成业务 Source of Truth。

---

## 2. Redis 通过 Keyspace、数据类型与 TTL 建模状态

### 【Key 定义状态身份，Value Type 定义状态内部操作】

Redis 的基础模型是：

~~~text
Key
↓
Value
~~~

Key 应该表达状态的 Scope（作用范围）和 Identity（身份），例如：

~~~text
session:<sessionId>
rate:user:<userId>
cache:product:<productId>
counter:tenant:<tenantId>
~~~

冒号只是应用层命名约定，不会真的创建目录。

Key Design（键设计）需要同时回答：

- 谁拥有这份状态；
- 哪些请求会访问同一个 Key；
- 这个 Key 是否可能成为 Hot Key；
- 是否需要 TTL；
- 如果迁移 Redis Cluster，相关 Key 是否需要处于同一 Hash Slot。

### 【String 适合整体值、计数器和简单锁状态】

String 是最基础的数据类型，可保存文本、二进制或数字语义。

常见命令：

~~~text
SET / GET
INCR / DECR
SET key value EX seconds
SET key value NX
~~~

典型场景：

~~~text
Cache Value
Counter
Version Number
Idempotency Marker
简单 Lock Token
~~~

重要的是访问模式，而不是 Value 看起来是不是“字符串”。

### 【Hash 适合一个状态对象下多个独立字段】

Hash 的模型：

~~~text
Key
↓
Field → Value
Field → Value
Field → Value
~~~

例如 Token Bucket：

~~~text
rate:user:42
├── tokens = 73.5
└── updated = 1700000000.5
~~~

常用命令：

~~~text
HSET
HGET
HMGET
HINCRBY
HGETALL
~~~

当多个字段属于同一个生命周期和 Scope，同时又需要独立修改时，Hash 比把每个字段拆成独立 Key 更自然。

### 【List、Set、Sorted Set 与 Stream 分别表达不同访问模式】

| 数据类型 | 关键语义 | 典型访问模式 |
| --- | --- | --- |
| List | 有顺序、左右端操作 | 简单队列、最近列表 |
| Set | 成员唯一、集合关系 | 去重、成员关系 |
| Sorted Set | Member 唯一 + Score 排序 | 排行榜、滑动时间窗口 |
| Stream | Append-only Record + Consumer Group | 事件流、消费进度 |

Sorted Set 特别适合 Sliding Window：

~~~text
timestamp → Score
requestId → Member
~~~

然后：

~~~text
ZADD
↓
ZRANGEBYSCORE / ZCOUNT
↓
ZREMRANGEBYSCORE
~~~

形成“最近 N 秒发生过什么”的时间窗口。

Stream 则已经进入消息与事件流语义。如果系统主要问题是可靠异步消费、ACK、Consumer Group 与 Replay，应继续结合 [服务端异步任务与消息处理体系](./F-服务端异步任务与消息处理体系.md) 判断 Redis Streams 与其他 Broker 的边界。

### 【TTL 是状态生命周期，不是 Value Type】

TTL（Time To Live，生存时间）定义 Key 还能存在多久。

~~~text
SET session:abc ... EX 3600
~~~

或：

~~~text
EXPIRE session:abc 3600
~~~

TTL 能直接表达：

~~~text
Session 过期
Cache 失效
Rate Limit Bucket 回收
Idempotency Window 结束
临时状态自动清理
~~~

设计 Redis State 时，TTL 不应该最后才补，而应该和 Key / Value 一起成为状态模型的一部分：

~~~text
State Model
├── Key
├── Value Type
├── Commands
└── TTL / Lifecycle
~~~

---

## 3. Redis 的正确并发语义来自原子命令、事务与 Server-side Script

### 【单条 Redis Command 是最基础的原子执行边界】

如果业务动作可以表达成一条 Redis Command，应优先使用原生命令：

~~~text
Counter +1
↓
INCR

Hash Field +1
↓
HINCRBY
~~~

比下面这种客户端 Read-Modify-Write 更安全：

~~~text
GET
↓
Node.js + 1
↓
SET
~~~

因为后者会暴露并发窗口。

### 【Pipeline 优化网络往返，不等于事务】

Pipeline（流水线）主要解决大量 RTT（Round Trip Time，网络往返）的问题。

~~~text
多次独立 Request / Response
↓
Pipeline
↓
批量发送 Command
↓
减少 Network Round Trip
~~~

Pipeline 本身不表示“这些 Command 必须作为一个事务不可穿插”。

所以：

~~~text
Pipeline
解决 Throughput / RTT

Atomicity
由具体 Command、Transaction 或 Script 决定
~~~

### 【MULTI / EXEC 适合执行顺序已经确定的命令组】

Redis Transaction 常见：

~~~text
MULTI
↓
Command A
Command B
Command C
↓
EXEC
~~~

它适合命令列表在执行前已经确定，执行过程中不需要先读取某个结果再临时决定下一条写入。

Redis Transaction 与关系数据库事务不要混同。它没有 SQL 数据库那种通用 Rollback 语义；EXEC 阶段某条命令运行时报错，并不会自动撤销前面已经成功的命令。

### 【WATCH 适合客户端乐观锁式 Read-Modify-Write】

WATCH 可以监控某些 Key：

~~~text
WATCH key
↓
GET
↓
Client Compute
↓
MULTI
SET ...
EXEC
~~~

如果期间 Key 被别人修改，EXEC 会失败，客户端可以 Retry。

这是一种 Optimistic Concurrency Control（乐观并发控制）。

### 【Lua 把 Read → Decide → Write 收进 Redis Server 内部】

当业务逻辑必须：

~~~text
读取状态
↓
执行计算
↓
根据结果做条件判断
↓
写回状态
~~~

如果这些动作拆成多条客户端命令，就会出现 Race Condition（竞态条件）。

Redis Lua / EVAL 的核心价值是：

> **把 Read + Compute + Conditional Write 作为一个 Server-side Execution Unit 在 Redis 内部执行。**

Redis 官方的 Rate Limiter 文档也把 Lua 描述为保证 read-decide-update 原子性的典型方式。[1]

#### <u>1. Token Bucket 是理解 Redis Lua 最直观的例子</u>

Token Bucket（令牌桶）包含：

~~~text
capacity = burst
tokens = 当前令牌
refillRate = 每秒补充多少令牌
updated = 上一次计算时间
~~~

请求到达：

~~~text
读取 tokens / updated
↓
elapsed = now - updated
↓
tokens = min(
  burst,
  tokens + elapsed × rate
)
↓
tokens >= cost ?
├── No  → Reject
└── Yes → tokens -= cost → Allow
↓
写回 tokens / updated
~~~

如果在应用侧实现：

~~~text
Request A 读 tokens = 10
Request B 读 tokens = 10
A 判断允许
B 判断允许
A 写 0
B 写 0
~~~

两个请求可能同时“花掉”同一份 Token。

Lua 后：

~~~text
Request A
↓
EVAL
┌───────────────┐
│ READ          │
│ REFILL        │
│ CHECK         │
│ UPDATE        │
└───────────────┘
↓
完成

Request B
↓
才能读取 A 更新后的状态
~~~

Redis 官方说明 Lua Script 的执行具有原子性，脚本运行期间其他服务器活动不会穿插进脚本执行。[2]

#### <u>2. Lua 原子执行意味着脚本必须短小且可预测</u>

原子性的代价是：

~~~text
Script 执行时间过长
↓
其他命令等待
↓
Redis Latency 上升
~~~

因此 Lua 适合：

~~~text
少量 Key
简单计算
条件更新
有限循环
~~~

不适合：

~~~text
大规模数据扫描
复杂 CPU 计算
不受控循环
~~~

### 【Redis Functions 是服务端逻辑的另一种管理方式】

Redis Functions 从 Redis 7 开始提供服务器端函数管理能力，官方将其定位为相比反复发送 EVAL Script 更可管理的方案。[3]

入门阶段可以先建立：

~~~text
EVAL
适合应用直接执行 Lua Script

EVALSHA
先加载 Script，再按 SHA 调用，减少重复传输

Redis Functions
把服务端逻辑作为 Redis 中受管理的函数库
~~~

具体选型取决于部署版本、脚本复用程度和运维方式。无论使用哪一种，核心问题仍然是：

> 哪些状态变化必须在 Redis 内部形成一个不可被并发请求穿插的执行边界？

---

## 4. Redis 的工程价值通过一组状态模式体现出来

### 【Cache 保存可重新计算的读取结果】

最常见模式：

~~~text
Application
↓
GET Cache

Hit
↓
Return

Miss
↓
Read Database
↓
SET Cache + TTL
↓
Return
~~~

这就是 Cache-Aside（旁路缓存）。

核心特点：

~~~text
Database
= Source of Truth

Redis Cache
= Derived State
~~~

因此 Cache 设计必须继续回答：

- TTL 多久；
- Database 更新后如何 Invalidate；
- Cache Stampede 怎么控制；
- Redis 故障时能否直接回源；
- Value 是否可能成为 Big Key。

### 【Session 把认证状态变成多实例共享 Runtime State】

Session 模型：

~~~text
Browser
↓ Session ID
API A / API B
↓
Redis
↓
Session State
~~~

Redis 的价值不是“Session 一定要用 Redis”，而是当 API 横向扩容以后，Session 不能只放在某台 Node.js 进程内存中。

Session 还需要关注：

~~~text
TTL
Logout Invalidation
Password Reset / Account Revocation
Persistence Requirement
Redis Failure Behavior
~~~

具体身份链路继续阅读 [Web 身份认证、会话控制与访问控制体系](./W-Web身份认证会话控制与访问控制体系.md)。

### 【Counter 把高频增量状态收缩成原子数字】

Counter 典型：

~~~text
INCR page:view
HINCRBY stats accepted 1
~~~

适合运行统计、版本号、简单配额和增量信号。

Counter 是否能成为最终统计结果取决于是否允许丢失和是否需要审计。重要业务报表不能仅因为 Redis Counter 很方便，就把它直接当权威历史。

### 【Rate Limit 把共享预算转成 Allow / Reject 决策】

Rate Limit（限流）回答：

> 一个 Scope 在某个时间尺度内最多能够消耗多少资源？

常见 Scope：

~~~text
IP
User
API Key
Tenant
Project
~~~

常见算法：

| 算法 | 直观模型 | 特点 |
| --- | --- | --- |
| Fixed Window | 每分钟最多 N 次 | 简单，窗口边界可能突发 |
| Sliding Window | 当前时间往前 N 秒 | 更平滑，状态更多 |
| Token Bucket | 令牌持续补充、请求消耗 | 支持受控 Burst |
| Leaky Bucket | 以稳定速率泄出 | 更强调平滑输出 |

Redis 适合 Distributed Rate Limiting（分布式限流）的原因可以压缩成三层：

~~~text
为什么不能只用进程内 Map？
↓
多 API Instance 需要共享同一预算

为什么 Redis 合适？
↓
高频、小状态、低延迟、TTL、原子操作

为什么复杂算法常用 Lua？
↓
Read → Compute → Decision → Write
必须形成原子边界
~~~

Redis 官方 Rate Limiter 文档明确将共享存储、原子计数、TTL、Hash / Sorted Set / String 与 Lua 原子 read-decide-update 作为其适配限流的关键能力。[1]

### 【Pub/Sub 与 Stream 分别服务瞬时广播和持久事件流】

Redis Pub/Sub：

~~~text
Publisher
↓
Channel
↓
Subscribers
~~~

更适合在线实例之间的瞬时通知、Cache Invalidation Signal、WebSocket Node Broadcast。

Subscriber 离线时不会天然获得历史消息，所以 Pub/Sub 不能等同于 Durable Event Log。

Redis Stream：

~~~text
XADD
↓
Stream
↓
Consumer Group
↓
XREADGROUP
↓
XACK
~~~

提供持久记录和 Consumer Group，因此更接近消息与事件流模型。是否应该使用 Redis Streams、RabbitMQ、Kafka 或 Database-backed Job Store，需要结合吞吐、Replay、消费组、路由与运维成本继续阅读 [服务端异步任务与消息处理体系](./F-服务端异步任务与消息处理体系.md)。

---

## 5. Redis 与数据库的一致性问题来自两套独立状态没有共同事务

### 【Cache 一致性的核心是 Source of Truth 与 Invalidation】

典型 Dual State：

~~~text
PostgreSQL
= 权威状态

Redis
= 派生状态
~~~

更新数据库以后：

~~~text
DB Commit
↓
Invalidate Redis
~~~

这两步不共享一个本地 ACID Transaction，因此中间可能 Crash。

工程上通常不追求“Redis 与数据库任何时刻每个字节都一致”，而是先定义：

- 哪一份是 Source of Truth；
- 可接受多久的 Staleness（陈旧）；
- Cache Miss 时怎样 Rebuild；
- Invalidation 失败时怎样恢复；
- 是否需要 Version Key / TTL / Event-driven Invalidation。

### 【TTL 是一致性恢复边界，不是完整一致性方案】

如果 Cache Invalidation 偶尔失败，而 TTL = 60s，那么错误 Cache 最迟会在 TTL 到期后失效。

但 TTL 不能替代：

~~~text
正确的更新顺序
失效策略
重试
事件通知
版本隔离
~~~

它只是“陈旧状态最多能存在多久”的一个恢复上界。

### 【Versioned Cache 通过命名空间隔离旧值】

一种常见方式：

~~~text
version = 42

cache key
=
analytics:v42:<query>
~~~

数据发生变化：

~~~text
INCR version
↓
43
~~~

新请求自然进入：

~~~text
analytics:v43:<query>
~~~

旧 v42 Cache 不需要立即枚举删除，由 TTL 最终回收。

这种模式适合 Query Key 很多、逐个 DEL 成本高的场景。

### 【跨存储关键副作用不能只靠“先写 A 再写 B”】

如果业务要求：

~~~text
Database 更新成功
↓
某个后续动作绝不能被忘记
~~~

仅靠：

~~~text
UPDATE DB
↓
PUBLISH / DEL / SET Redis
~~~

存在 Crash Window。

如果“后续动作不能丢”，可以考虑 Transactional Outbox：

~~~text
DB Transaction
├── Business Data
└── Outbox Intent
↓
COMMIT
↓
Worker
↓
外部 Redis / Broker / API Side Effect
~~~

Outbox 的完整机制继续阅读 [服务端异步任务与消息处理体系](./F-服务端异步任务与消息处理体系.md)。

---

## 6. Redis Persistence 解决重启恢复，但不等于高可用

### 【RDB 与 AOF 解决的是 Dataset Durability】

Redis 官方当前主要提供：

~~~text
RDB
= Point-in-time Snapshot

AOF
= 记录写命令并在恢复时 Replay

RDB + AOF
= 两种方式组合

No Persistence
= 完全作为可丢失内存状态
~~~

官方 Persistence 文档明确区分这几种模式。[4]

#### <u>1. RDB 更像周期快照</u>

优点包括文件紧凑、备份和恢复路径直接；代价是两次 Snapshot 之间的数据可能丢失，而且 Snapshot 本身需要系统资源。

#### <u>2. AOF 更像写操作日志</u>

AOF 记录改变 Dataset 的写操作。AOF 的核心取舍来自 fsync：

~~~text
always
↓
更强 Durability
更高写入成本

everysec
↓
性能与数据丢失窗口之间折中

no
↓
更多依赖操作系统刷盘
~~~

Persistence 的选型应从 RPO（Recovery Point Objective，恢复点目标）出发，而不是默认“Redis 一定不需要持久化”。

### 【Persistence 与业务 Source of Truth 是两个问题】

即使 Redis 开启 AOF，也不能自动推出 Redis 是业务唯一 Source of Truth。

不同 State 的故障后果完全不同：

~~~text
Query Cache
丢了可以 Rebuild

Session
丢失会导致用户重新登录

Rate Limit
丢失会短暂重置配额

订单事实
丢失可能造成不可接受业务错误
~~~

可靠性要求必须按 State Class 分别决定。

---

## 7. Replication、Sentinel 与 Cluster 分别解决不同层级的问题

### 【Replication 先提供副本，不自动等于完整 Failover】

Redis Replication（复制）使用 Primary / Replica 模型，让 Replica 尽量保持 Primary Dataset 的副本。官方文档说明，Primary 会把 Dataset 变化传播给 Replica，断线后会尝试部分或完整重新同步。[5]

Replication 主要提供：

~~~text
数据副本
+
读取扩展的基础
+
高可用的前提
~~~

但“存在 Replica”不等于已经拥有完整自动 Failover。

### 【Sentinel 面向非 Cluster Redis 提供监控与自动故障转移】

Redis Sentinel 主要用于：

~~~text
Monitor
↓
Failure Detection
↓
Leader Election / Failover
↓
让 Replica 提升为新的 Primary
~~~

所以：

~~~text
Replication
解决“有没有副本”

Sentinel
解决“单主复制架构中主节点故障后谁接管”
~~~

### 【Redis Cluster 同时处理分片与节点故障】

Redis Cluster 通过 Hash Slot 将 Keyspace 分散到多个 Master：

~~~text
Key
↓
Hash Slot
↓
Shard / Master
~~~

核心价值：

~~~text
单机容量上限
↓
多个 Shard 分担 Keyspace

单机写吞吐上限
↓
不同 Slot 可以落到不同节点
~~~

但 Cluster 也会反过来约束多 Key Command、MULTI / EXEC、Lua Script、Key 命名与 Hash Tag。

如果一个 Script 需要访问多个 Key，在 Cluster 中必须考虑这些 Key 是否位于允许的 Slot 范围。Redis EVAL 官方文档要求脚本访问的 Key 必须显式通过 KEYS 参数声明。[6]

### 【Cluster 不能自动消灭 Hot Key】

即使很多 Key 被均匀分布到多个 Shard，某一个 Key 如果承担极高比例请求，它仍然只会落在某个具体 Shard。

因此：

~~~text
Sharding
解决 Keyspace / 总容量分布

Hot Key
是访问集中度问题
~~~

二者不能混为一谈。

---

## 8. Redis 的规模化运行需要同时治理 Memory、Hot Key、Big Key 与 Observability

### 【maxmemory 与 Eviction Policy 定义内存耗尽后的行为】

Redis 是内存优先系统，因此必须回答：

~~~text
Dataset 不断增长
↓
达到可用内存上限以后怎么办？
~~~

maxmemory 定义内存上界；Eviction Policy 决定到达上限后的行为。

常见方向：

~~~text
noeviction
↓
不主动删旧 Key，新的内存增长写入可能失败

allkeys-*
↓
可以从所有 Key 选择驱逐

volatile-*
↓
只从设置 TTL 的 Key 中选择驱逐
~~~

选哪一种必须先看 Redis 中混合了哪些 State。一个同时保存 Session、Rate Limit、Cache 的 Redis，不能简单按“反正 Redis 就是缓存”选择激进驱逐策略。

### 【Big Key、Hot Key 与 Key Explosion 是三个不同问题】

~~~text
Big Key
= 单个 Key 本身太大

Hot Key
= 单个 Key 请求量过高

Key Explosion
= Key 数量本身失控
~~~

三者处理方式不同。

Big Key 可能导致单命令耗时变长、网络返回巨大、删除或序列化成本增加。

Hot Key 可能导致单个 Shard CPU / Network 集中。

Key Explosion 可能导致 Metadata / Memory overhead 增长以及扫描和管理困难。

### 【Connection Reuse 与 Pipeline 是 Client 侧基础性能能力】

应用不应每个 HTTP 请求重新创建 Redis TCP Connection。

~~~text
Process Start
↓
Create Redis Client
↓
Reuse Connection
↓
Process Shutdown
↓
Graceful Close
~~~

大量独立 Command 时，可以根据场景使用 Pipeline 降低 RTT，但仍然要区分：

~~~text
Pipeline = Performance Optimization
Transaction / Lua = Correctness Boundary
~~~

### 【Redis Observability 需要覆盖 Server、Command、Memory 与 Client】

至少要观察：

~~~text
INFO
↓
Memory / CPU / Connections / Replication

SLOWLOG
↓
执行过慢的 Command

LATENCY
↓
Redis 内部延迟事件

MEMORY STATS
↓
内存构成

Key / Command Metrics
↓
Hot Key / Big Key / Error / Throughput
~~~

生产问题不能只看 PING = PONG，因为“Redis 活着”并不能证明 Latency、Memory、Eviction、Replication 和 Client 数量都正常。

---

## 9. Redis 的生产安全与治理从网络边界开始

### 【Redis 不应该直接暴露在不可信网络】

生产安全顺序可以理解为：

~~~text
Network Isolation
↓
TLS
↓
Authentication
↓
ACL
↓
Command / Key Permission
↓
Secret Rotation
↓
Audit / Monitoring
~~~

Redis 应优先部署在受控私网 / Service Network 中，而不是依赖“密码足够复杂”来承担全部边界。

### 【ACL 把“能连接”继续拆成“能执行什么”】

ACL（Access Control List，访问控制列表）允许定义 Redis User，并限制：

~~~text
Command
Key Pattern
Channel
~~~

例如业务 API 并不一定需要：

~~~text
CONFIG
FLUSHALL
SHUTDOWN
~~~

所以权限治理应该从最小权限原则出发，而不是所有服务共享管理员级 Redis 账号。

### 【Client Retry、Timeout 与 Connection Lifecycle 同样属于生产治理】

Redis Client 应明确：

- Connect Timeout；
- Command Timeout；
- Retry 策略；
- Max Retries；
- Ready Check；
- Shutdown；
- Redis 不可用时业务是 Fail-open 还是 Fail-closed。

不同 State 的故障策略可能不同：

~~~text
Cache Redis 故障
→ 可以尝试回源 Database

Rate Limit Redis 故障
→ 要明确安全优先还是可用性优先

Session Redis 故障
→ 可能无法认证现有 Session
~~~

所以“Redis 挂了怎么办”没有一个统一答案，必须回到 State Semantics。

---

## 10. Redis 选型最终回到“状态—访问—并发—生命周期—恢复”五个问题

### 【一份状态进入 Redis 前先回答五个问题】

| 问题 | 需要回答什么 |
| --- | --- |
| State | 这是什么状态？谁是 Source of Truth？ |
| Access | Key 怎么设计？用什么 Data Type？读写模式是什么？ |
| Concurrency | 单命令够不够？需要 MULTI / WATCH / Lua 吗？ |
| Lifecycle | TTL 多久？什么时候失效？会不会无限增长？ |
| Recovery | Redis 丢失、重启、Failover 后怎么恢复？ |

然后再进入第二层：

~~~text
单机够不够？
↓
Persistence 需要多强？
↓
是否需要 Replica / Sentinel？
↓
是否需要 Cluster？
↓
Hot Key / Big Key 风险在哪里？
↓
如何监控和压测？
~~~

### 【常见场景可以用状态职责快速判断】

| 场景 | Redis 是否适合 | 核心原因 |
| --- | --- | --- |
| 查询 Cache | 很适合 | 可派生 + TTL + 高频读取 |
| Session | 常见 | 多实例共享 + TTL |
| Rate Limit | 很适合 | 高频小状态 + 原子操作 + TTL |
| Counter | 常见 | INCR / HINCRBY 原子增量 |
| 排行榜 | 很适合 | Sorted Set |
| 瞬时广播 | 可用 Pub/Sub | 简单低延迟，但无历史 |
| 轻量持久流 | 可用 Streams | Consumer Group + ACK |
| 复杂订单事实 | 通常不应只放 Redis | 强事务、长期权威历史 |
| 跨表复杂查询 | 不适合 | 不是 Redis 的数据模型优势 |

### 【项目实践只负责验证通用知识，不承担通用定义】

Browser Monitor 是这套 Redis 体系的一个真实工程映射：

- [Browser Monitor · Redis 体系源码学习](../browser-monitor/docs/Redis体系源码学习.md)：从 Redis Server / Client、Hash、Sorted Set、TTL、Lua、Session、Rate Limit、Cache、Version Key、AOF、Hot Key、Cluster 与生产治理逐层映射当前源码。
- [Browser Monitor · 服务端全链路](../browser-monitor/docs/浏览器监控平台-服务端全链路.md)：查看 Redis Token Bucket 在“采集请求 → 限流 → 逐条校验 → PostgreSQL Transaction → 202”中的真实位置。
- [服务端异步任务与消息处理体系](./F-服务端异步任务与消息处理体系.md)：继续区分 Redis Stream、Database Job Store、RabbitMQ、SQS 与 Kafka。
- [数据库完整框架体系](./S-数据库完整框架体系.md)：继续理解 Redis 与关系数据库在 Source of Truth、Transaction 与 Concurrency Control 上的边界。

---

## 11. 参考资料

[1] Redis. Rate limiter. https://redis.io/docs/latest/develop/use-cases/rate-limiter/

[2] Redis. Scripting with Lua. https://redis.io/docs/latest/develop/programmability/eval-intro/

[3] Redis. Redis Functions. https://redis.io/docs/latest/develop/programmability/functions-intro/

[4] Redis. Redis persistence. https://redis.io/docs/latest/management/persistence/

[5] Redis. Redis replication. https://redis.io/docs/latest/manual/replication/

[6] Redis. EVAL command. https://redis.io/docs/latest/commands/eval/

[7] Redis. Data types. https://redis.io/docs/latest/develop/data-types/

[8] Redis. Transactions. https://redis.io/docs/latest/develop/using-commands/transactions/

[9] Redis. Redis Cluster specification. https://redis.io/docs/latest/operate/oss_and_stack/reference/cluster-spec/

[10] Redis. Redis security. https://redis.io/docs/latest/operate/oss_and_stack/management/security/
