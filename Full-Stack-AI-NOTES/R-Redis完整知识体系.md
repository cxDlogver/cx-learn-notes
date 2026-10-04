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

## 1. Redis 首先是独立运行的共享状态服务，而不是应用进程里的“缓存对象”

理解 Redis 的第一步不是背 GET / SET，而是先建立系统位置。Redis 是独立运行的 Server Process，应用通过 Redis Client 与它通信。它最重要的系统价值是：**把原本局限在单个应用进程中的状态，提升成多个进程、多个实例都可以访问的共享状态。**

~~~text
Browser / Client
       ↓
Application API
       ↓
Redis Client
       ↓ TCP / RESP
Redis Server
       ↓
Keyspace / Dataset
~~~

### 【Redis Server 与 Redis Client 是两个不同运行角色】

#### <u>1. Redis Server 持有共享 Dataset</u>

Redis Server 负责：

~~~text
接收 Command
↓
解析 Key
↓
执行对应数据结构操作
↓
修改或读取 Dataset
↓
返回结果
~~~

应用进程并不直接操作 Redis 内存。它只是通过 Client 发送命令。

所以：

~~~text
new Map()
=
应用进程自己的内存状态

Redis Server
=
独立进程中的共享状态
~~~

当 API 横向扩容以后：

~~~text
Load Balancer
      │
 ┌────┼────┐
 ↓    ↓    ↓
API A API B API C
      |    /
      |   /
    Redis
~~~

三个 API Instance 可以访问同一个 Key，因此 Session、Rate Limit、Counter 等状态不会因为请求落到不同实例而割裂。

#### <u>2. Redis Client 负责连接、编码命令和接收结果</u>

Node.js、Java、Python、Go 等语言通常通过 Redis Client Library 建立连接。

Client 负责的事情包括：

~~~text
Connection Lifecycle
Command Serialization
Response Parsing
Retry
Ready Check
Pipeline
Transaction API
Lua / Function Invocation
~~~

因此：

> Redis 不是某个语言框架自带的数据结构；Redis Client 才是应用语言与 Redis Server 之间的适配层。

#### <u>3. Connection 应该按进程复用，而不是按 Request 创建</u>

不推荐：

~~~text
HTTP Request A
↓
new Redis()
↓
Command
↓
close

HTTP Request B
↓
new Redis()
↓
Command
↓
close
~~~

因为 TCP 建连、认证、TLS、Socket 和 Client State 都有成本。

更常见：

~~~text
Process Start
↓
Create Redis Client
↓
Request A / B / C 复用
↓
Process Shutdown
↓
Graceful Close
~~~

这也是后续 Connection Governance 的基础。

### 【Redis 的基础数据模型是 Keyspace → Key → Typed Value】

关系数据库常用：

~~~text
Database
↓
Table
↓
Row
↓
Column
~~~

Redis 则先建立：

~~~text
Redis Database
↓
Keyspace
↓
Key
↓
Typed Value
~~~

Redis 官方将 Redis 描述为 Data Structure Server，原因就在于一个 Key 的 Value 不只是字符串，还可以是 Hash、List、Set、Sorted Set、Stream 等结构。[1]

Keyspace 是当前 Redis Database 中全部 Key 组成的逻辑空间。Redis 并不知道：

~~~text
session 是一张表
cache 是一张表
rate-limit 是一张表
~~~

它看到的是：

~~~text
session:a
session:b
cache:product:1
rate:user:42
~~~

所以 Redis 的建模首先是：

~~~text
Key Identity
+
Value Type
+
Command Semantics
+
Lifecycle
~~~

### 【TTL 让生命周期直接成为状态模型的一部分】

TTL（Time To Live，生存时间）回答：

> 这份状态应该存在多久？

例如：

~~~text
Session
↓
30 分钟后自动失效

Cache
↓
60 秒后允许重新加载

Rate Limit Bucket
↓
长时间无人访问后自动清理
~~~

因此 Redis State Model 不应该只写：

~~~text
Key + Value
~~~

而应该写：

~~~text
State
├── Key
├── Value Type
├── Commands
├── TTL / Expiration
└── Recovery Semantics
~~~

Redis 官方 Key Expiration 文档也把过期能力作为 Key 生命周期的一部分，而不是单独的数据类型。[2]

### 【Redis 以内存为主要工作数据集，但“内存数据库”不等于“重启一定全部丢失”】

Redis 的工作数据主要驻留内存，这是低延迟的重要基础之一。

但：

~~~text
Memory-first
≠
No Persistence
~~~

Redis 可以选择：

~~~text
No Persistence
RDB Snapshot
AOF
RDB + AOF
~~~

因此需要分开理解：

~~~text
运行时数据主要在哪里？
→ Memory

重启后能不能恢复？
→ Persistence Strategy
~~~

“Redis 是内存数据库，所以断电数据一定全部丢失”是不准确的。

### 【Redis 与关系数据库的边界来自状态职责，而不是单纯速度差异】

Redis 常见状态具有：

~~~text
高频
低延迟
短生命周期
可自动过期
可重建
需要跨实例共享
访问模式明确
~~~

关系数据库更擅长：

~~~text
长期权威事实
复杂关系
Constraint
Join
多行多表事务
审计历史
复杂查询
~~~

所以不要把选择问题简化成：

~~~text
Redis 快
PostgreSQL 慢
~~~

更准确的是：

~~~text
什么是 Source of Truth？
什么只是 Derived State？
什么属于 Runtime State？
什么属于 Control State？
什么状态丢失后可以重建？
~~~

### 【同一个 Redis Instance 中的不同 Key 可以拥有完全不同的可靠性要求】

同一个 Redis 中可能同时存在：

~~~text
Query Cache
↓
丢失后可重新生成

Session
↓
丢失后用户可能需要重新登录

Rate Limit
↓
丢失后短时间预算重新初始化

Operational Counter
↓
丢失后统计可能不完整
~~~

因此：

> 不能因为“这些数据都在 Redis”，就假设它们具有相同的 Persistence、Eviction、HA 与 Recovery 要求。

这也是后续为什么必须按 State Model 分析 Redis，而不是只按“Redis 实例”整体讨论。

## 2. Redis 通过 Keyspace、数据类型与命令语义组织共享状态

Redis 数据结构不是“学会六种类型就结束”。真正需要建立的链路是：

~~~text
业务状态
↓
确定 Scope
↓
设计 Key
↓
确定访问模式
↓
选择 Data Type
↓
选择 Command
↓
定义 TTL
~~~

所以 Redis 数据结构的核心原则是：

> **不要只看数据长什么样，要看业务需要怎样访问和修改它。**

### 【Key 的第一职责是定义一份共享状态的身份和隔离范围】

#### <u>1. 冒号只是命名约定，不是 Redis 目录</u>

例如：

~~~text
session:user-1
cache:product:100
rate:tenant:t1
~~~

人可以把它理解成分层命名：

~~~text
domain:state-type:scope-id
~~~

但 Redis 内部并不存在真实目录。

~~~text
cache/
  product/
    100
~~~

并不存在；Redis 只保存完整 Key：

~~~text
cache:product:100
~~~

#### <u>2. Key Design 先回答“哪些请求应该访问同一份状态”</u>

例如：

~~~text
rate:user:<userId>
~~~

意味着同一个 userId 的请求竞争同一份预算。

而：

~~~text
rate:tenant:<tenantId>:ip:<ip>
~~~

意味着不同 IP 之间状态隔离。

因此 Key Design 本质上是：

~~~text
Business State
↓
Scope
↓
Identity
↓
Redis Key
~~~

#### <u>3. Key 命名还会影响 Hot Key、Cluster Slot 和权限边界</u>

Key 不只影响可读性。

它还影响：

- 是否大量请求集中到一个 Key；
- Redis Cluster 中 Key 落在哪个 Hash Slot；
- ACL 能否按 Key Pattern 限制访问；
- 是否方便按 Namespace 做监控、迁移和清理。

所以 Key Design 是性能、安全与分布式部署的共同基础。

### 【String 适合整体读写、整数 Counter 和简单状态标记】

#### <u>1. String 的逻辑模型是 Key → Bytes</u>

Redis String 不只表示文本，它可以保存：

~~~text
Text
JSON
Integer
Binary
Serialized State
~~~

Redis 并不理解 JSON 内部字段。对于它来说：

~~~text
Key
↓
一段 String / Bytes
~~~

#### <u>2. SET / GET 表达整体替换和整体读取</u>

~~~text
SET key value
↓
如果不存在则创建
如果存在则整体覆盖

GET key
↓
返回整个 String Value
~~~

如果业务模式是：

~~~text
整体写入对象
整体读取对象
很少字段级更新
~~~

序列化成 String 很自然。

例如：

~~~text
Object
↓
JSON.stringify
↓
SET

GET
↓
JSON.parse
↓
Object
~~~

#### <u>3. SET ... EX 把 Value 和生命周期一起定义</u>

~~~text
SET session:abc value EX 1800
~~~

同时建立：

~~~text
Type = String
Value = ...
TTL = 1800s
~~~

比：

~~~text
SET
↓
EXPIRE
~~~

分两步更能表达“创建状态时就定义生命周期”。

#### <u>4. DEL 删除的是整个 Key</u>

~~~text
DEL session:abc
~~~

会让：

~~~text
Key
Value
TTL
~~~

一起消失。

DEL 是 Key-level 操作，不是“删除 String 内某个字段”。

#### <u>5. INCR / DECR 把 String 当整数 Counter 使用</u>

~~~text
counter = 8
↓
INCR
↓
9
~~~

如果 Key 不存在，INCR 会把它按 0 开始处理。

因此 String 常见两类访问模型：

~~~text
整体值
→ SET / GET

整数计数
→ INCR / DECR
~~~

### 【Hash 适合一个 Key 下存在多个独立字段的状态对象】

#### <u>1. Hash 的逻辑模型是 Key → Field → Value</u>

~~~text
user:100
├── name → Alice
├── age → 20
└── score → 100
~~~

视觉上像“对象”，但它不是 SQL Row，因为 Redis Hash 没有 Schema、Foreign Key、Join 等关系能力。

#### <u>2. HSET / HMGET / HGETALL 对应不同访问模式</u>

~~~text
HSET
→ 修改一个或多个 Field

HMGET
→ 只读取指定 Field

HGETALL
→ 读取整个 Hash
~~~

如果业务经常：

~~~text
只更新对象里的一个字段
只读取几个字段
~~~

Hash 比序列化整个 JSON String 更自然。

#### <u>3. HINCRBY 把字段级 Read-Modify-Write 收缩成单命令</u>

如果要：

~~~text
accepted += 5
~~~

客户端写：

~~~text
HGET
↓
+5
↓
HSET
~~~

会暴露并发窗口。

HINCRBY：

~~~text
HINCRBY stats accepted 5
~~~

直接把“读旧值 + 加法 + 写新值”表达成一个 Redis Command。

#### <u>4. 同样是 Hash，不代表业务状态模型相同</u>

例如：

~~~text
Hash A
├── accepted
├── rejected
└── duplicate

访问模式
→ HINCRBY / HGETALL
~~~

另一个：

~~~text
Hash B
├── tokens
└── updated

访问模式
→ HMGET
→ Compute
→ HSET
~~~

真正决定结构是否合适的是 Access Pattern，而不是“它们都有多个字段”。

### 【Sorted Set 用 Member + Score 表达唯一成员、排序和范围查询】

#### <u>1. Member 唯一，Score 决定顺序</u>

~~~text
member-A → 100
member-B → 120
member-C → 80
~~~

Redis 会按 Score 维护排序。

同一个 Member 再次 ZADD 时，默认更新 Score，而不是产生重复 Member。

#### <u>2. ZADD 把业务排序维度映射到 Score</u>

排行榜：

~~~text
Score = points
Member = userId
~~~

时间窗口：

~~~text
Score = timestamp
Member = requestId / eventId
~~~

Redis 不理解“积分”或“时间”。是应用把业务维度映射成 Score。

#### <u>3. ZRANGEBYSCORE / ZRANGE BYSCORE 进行范围查询</u>

如果：

~~~text
Score = timestamp
~~~

那么：

~~~text
score >= now - 60s
~~~

自然就是“最近 60 秒”。

#### <u>4. ZREMRANGEBYSCORE 可以清理窗口外数据</u>

滑动时间窗口常见组合：

~~~text
ZADD
↓
加入当前 Event

ZREMRANGEBYSCORE
↓
删除窗口外旧 Event

ZRANGE ... BYSCORE
↓
读取当前窗口
~~~

这是一种非常典型的：

~~~text
Time → Score
↓
Sorted Set
↓
Sliding Window
~~~

建模方式。

### 【TTL 与 Sorted Set Member Cleanup 解决的是两个层次的问题】

假设一个 Sorted Set 保存最近 60 秒的 Event。

~~~text
ZREMRANGEBYSCORE
↓
删除 Key 内已经离开窗口的 Member
~~~

而：

~~~text
EXPIRE
↓
整个 Key 长时间不再访问时自动删除
~~~

所以：

~~~text
Member Cleanup
=
内部集合生命周期

TTL
=
整个 Key 生命周期
~~~

这两个机制不能混为一谈。

### 【List、Set 与 Stream 应按访问语义理解，而不是按名称记忆】

#### <u>1. List 强调顺序和两端操作</u>

典型：

~~~text
LPUSH / RPUSH
LPOP / RPOP
LRANGE
~~~

适合：

- 简单工作列表；
- 最近记录；
- 两端队列。

但可靠消息消费还要继续考虑 ACK、重试、Consumer Group 等能力，不能因为 List 能 push/pop 就等同于完整消息系统。

#### <u>2. Set 强调成员唯一和集合运算</u>

典型：

~~~text
SADD
SREM
SISMEMBER
SINTER
SUNION
~~~

适合：

- 去重；
- Membership；
- 标签集合；
- 权限集合；
- 集合交并差。

#### <u>3. Stream 强调持续追加记录和 Consumer Group</u>

典型：

~~~text
XADD
XREAD
XREADGROUP
XACK
XPENDING
XAUTOCLAIM
~~~

Stream 更接近持久事件流：

~~~text
Producer
↓
Stream
↓
Consumer Group
↓
Consumer
↓
ACK
~~~

因此 Stream 已经跨入异步消息处理知识域，需要继续结合 Broker / Queue / Kafka 等模型比较。

### 【数据结构选择最终可以用“状态—操作—生命周期”判断】

面对一个新状态，不要先问“用 String 还是 Hash”。

先回答：

~~~text
这份状态是谁的？
↓
一个 Key 还是多个 Key？
↓
是整体读写还是字段级修改？
↓
需要排序吗？
↓
需要成员唯一吗？
↓
需要时间范围查询吗？
↓
需要 Consumer Group 吗？
↓
多久以后应该自动消失？
~~~

再映射到：

~~~text
String
Hash
List
Set
Sorted Set
Stream
TTL
~~~

这才是可迁移的数据建模方法。

## 3. Redis 通过命令原子性、事务与 Lua 控制并发状态修改

Redis 并发问题的核心不是“多个请求同时进入 Redis”，而是：

> **一个业务动作被拆成多条独立 Command 后，中间是否允许其他 Client 修改同一份状态。**

### 【一次业务操作不一定等于一条 Redis Command】

假设业务要：

~~~text
读取余额
↓
判断余额是否足够
↓
扣减余额
~~~

如果写成：

~~~text
GET
↓
Client Compute
↓
SET
~~~

那么 GET 和 SET 之间存在并发窗口。

#### <u>1. GET → Compute → SET 会产生 Lost Update</u>

假设：

~~~text
count = 10
~~~

两个请求：

~~~text
A GET → 10
B GET → 10

A +1 → SET 11
B +1 → SET 11
~~~

最终：

~~~text
count = 11
~~~

但实际上发生了两次 +1。

这就是 Lost Update（丢失更新）。

### 【单条原生命令是最优先的原子边界】

如果业务动作可以直接表达为：

~~~text
INCR
HINCRBY
SET NX
ZINCRBY
~~~

优先使用原生命令。

因为：

~~~text
Read
Compute
Write
~~~

已经被 Redis 命令本身封装。

所以设计优先级通常是：

~~~text
能否单 Command 完成？
↓
不能
↓
是否 MULTI / EXEC 足够？
↓
不能
↓
是否 WATCH + Retry？
↓
是否 Lua / Function？
~~~

### 【Pipeline 只减少网络往返，不自动提供原子性】

Pipeline 的主要问题是 RTT：

~~~text
Client → Redis Command A
Redis → Client Response A
Client → Redis Command B
Redis → Client Response B
...
~~~

Pipeline：

~~~text
Client
↓ 一批 Command
Redis
↓ 一批 Response
Client
~~~

可以显著降低大量小命令的 Network Round Trip。

但：

> Pipeline 不等于 Transaction。

多个命令能否被其他 Client 的命令穿插，取决于具体 Pipeline / Client 执行方式和是否包在事务中；不能把“批量发送”当成“事务原子执行”。

### 【MULTI / EXEC 把预先确定的命令组放进事务执行单元】

基本流程：

~~~text
MULTI
↓
Command A
Command B
Command C
↓
EXEC
~~~

MULTI 以后命令先排队，EXEC 时才真正执行。[18]

#### <u>1. MULTI / EXEC 适合“命令序列提前已知”</u>

例如：

~~~text
HINCRBY accepted 10
HINCRBY duplicate 2
EXPIRE stats 3600
~~~

这些命令在执行前已经全部确定，不需要先读取中间结果再决定下一步，因此非常适合 MULTI / EXEC。

#### <u>2. MULTI 内的读取结果不能直接在 Client 中立即参与后续分支</u>

如果写：

~~~text
MULTI
GET balance
???
SET balance ...
EXEC
~~~

问题是 GET 也只是排队，Client 在 EXEC 前拿不到真正 balance。

所以：

~~~text
Read
↓
根据结果 if/else
↓
Write
~~~

不是 MULTI / EXEC 最自然的模型。

### 【WATCH 通过乐观并发控制保护客户端 Read-Modify-Write】

WATCH：

~~~text
WATCH key
↓
GET key
↓
Client Compute
↓
MULTI
SET key newValue
↓
EXEC
~~~

如果 WATCH 以后、EXEC 之前 Key 被其他 Client 修改：

~~~text
EXEC
↓
失败 / 不执行
~~~

Client 可以重新读取再 Retry。

因此 WATCH 本质是：

~~~text
Optimistic Concurrency Control
~~~

适合：

- 冲突概率不是特别高；
- 计算必须在 Client 侧；
- 可以接受失败后重试。

高冲突场景下，反复 Retry 可能带来额外成本。

### 【Lua 把 Read → Compute → Conditional Write 移入 Redis Server】

Lua / EVAL 特别适合：

~~~text
Read State
↓
Compute
↓
if / else
↓
Write State
↓
Return Decision
~~~

因为整个脚本在 Redis Server 内执行。

#### <u>1. EVAL 通过 KEYS 和 ARGV 接收输入</u>

常见结构：

~~~lua
local key = KEYS[1]
local cost = tonumber(ARGV[1])

local value = redis.call('GET', key)

-- compute / decision

redis.call('SET', key, ...)
return ...
~~~

KEYS 用于声明脚本访问的 Redis Key；ARGV 用于普通参数。

这在 Redis Cluster 中尤其重要，因为多 Key Script 必须考虑 Key 所在 Hash Slot。

#### <u>2. Token Bucket 是典型 Read-Compute-Conditional-Write</u>

Token Bucket State：

~~~text
tokens
updated
~~~

请求到来：

~~~text
HMGET
↓
elapsed = now - updated
↓
refill = elapsed × rate
↓
tokens = min(burst, tokens + refill)
↓
tokens >= cost ?
├── No  → Reject
└── Yes → tokens -= cost
↓
HSET
↓
EXPIRE
↓
return 0 / 1
~~~

如果把 HMGET 和 HSET 放到 Node.js 中间计算，会暴露并发窗口。

Lua 则把整个算法收进一个 Server-side Execution Unit。

#### <u>3. Lua 原子性的真正价值是“其他 Client 不能穿插”</u>

没有 Lua：

~~~text
A HMGET → 10
B HMGET → 10
A 判断允许
B 判断允许
A HSET → 0
B HSET → 0
~~~

有 Lua：

~~~text
A Script
Read → Compute → Write → Return
──────── 完整结束 ────────
B Script
Read A 更新后的 State
→ 再决定
~~~

所以 Lua 的核心价值是 Correctness；减少网络往返只是附加收益。[4]

#### <u>4. Lua 原子执行也意味着脚本必须短小</u>

脚本执行期间其他命令不能正常穿插。

所以：

~~~text
大循环
大 Key 全量扫描
复杂 CPU 运算
不可控递归
~~~

会直接扩大 Redis 延迟。

适合 Lua 的逻辑通常应当：

~~~text
Key 数量有限
数据量有限
计算简单
执行时间可预测
~~~

### 【WATCH 与 Lua 都能处理 Read-Modify-Write，但控制位置不同】

| 维度 | WATCH | Lua |
| --- | --- | --- |
| 计算位置 | Client | Redis Server |
| 冲突处理 | EXEC 失败后 Retry | Script 内直接串行执行 |
| 适合 | Client 侧复杂计算、低冲突 | 小而确定的服务器端状态逻辑 |
| 网络往返 | 通常更多 | 一次 EVAL 可完成 |
| 长计算风险 | Client 承担 | 会阻塞 Redis |

所以不是“Lua 永远比 WATCH 好”，而是看计算应该放在哪里。

### 【Redis Atomic Execution 与 SQL ACID Atomicity 不是同一层概念】

“原子”这个词容易混淆。

Redis 中常说：

~~~text
单 Command 原子
Lua Script 原子
MULTI / EXEC 执行不可穿插
~~~

重点是：

> 执行过程中不会被其他 Client 的命令插入。

SQL ACID 中 Atomicity 更强调：

~~~text
Transaction
要么全部成功
要么全部失败
~~~

并配合：

~~~text
Durability
Isolation
Consistency
Rollback / Recovery
~~~

所以不能把：

~~~text
Redis Lua 原子
~~~

直接理解成：

~~~text
等价 PostgreSQL ACID Transaction
~~~

#### <u>1. MULTI / EXEC 没有 SQL 式通用 Rollback</u>

Redis Transaction 中需要区分：

~~~text
排队阶段错误
↓
可能让 EXEC 整体不执行

EXEC 运行阶段错误
↓
已经成功的前面命令不会自动撤销
~~~

这也是 Redis 官方强调“不需要事务回滚”的设计语义之一。[23]

#### <u>2. Lua 也不等于 SQL Rollback</u>

Lua 可以避免并发穿插，但如果脚本执行过程中出现运行错误，不能把它简单理解成“像数据库事务一样自动回滚此前所有副作用”。

因此 Script 设计应该：

- 参数尽量提前校验；
- 避免容易在中途报错的命令组合；
- 保持逻辑简单；
- 明确失败后的状态语义。

### 【Redis 不等于不需要一致性，而是复杂不变量更多由数据模型和应用设计】

Redis 很擅长：

~~~text
Counter
TTL
Set Membership
Sorted Window
Cache
Rate Limit
Session
Coordination State
~~~

但复杂业务不变量如果涉及：

~~~text
多实体
长期事实
复杂关系
强审计
多表事务
~~~

通常更适合关系数据库承担 Source of Truth。

因此 Redis 并发设计最终要回到：

~~~text
状态是否应该在 Redis？
↓
需要什么原子边界？
↓
单 Command / MULTI / WATCH / Lua 哪个足够？
↓
失败后如何恢复？
~~~

而不是为了使用 Lua 或事务而强行把复杂业务状态搬进 Redis。

## 4. Redis 的工程价值来自状态模型组合，而不是单个数据结构或命令

前两章回答了“Redis 有什么结构”和“Redis 如何保证一次状态修改的并发边界”。真正进入工程以后，还要继续问：这些能力组合起来，到底形成什么样的状态模型？

一个完整 Redis State Model 至少要回答六个问题：

~~~text
1. Scope
   这份状态属于谁？

2. Identity
   哪些请求访问同一份状态？

3. Structure
   String / Hash / Set / ZSet / Stream？

4. Access Pattern
   整体读写、字段更新、计数、范围查询还是消费？

5. Concurrency
   单 Command、MULTI、WATCH、Lua 还是允许竞争？

6. Lifecycle / Recovery
   TTL 多久？丢失后如何恢复？是否需要 Persistence？
~~~

### 【Session State Model 把身份凭证映射成共享运行时状态】

典型 Session 链：

~~~text
Login
↓
验证账号
↓
生成 Session Token
↓
Redis 保存 Session State
↓
Browser 保存 Cookie / Token
↓
后续 Request
↓
Token → Redis Key
↓
GET Session
↓
恢复 Authenticated User
~~~

#### <u>1. Session 适合 Redis 的核心原因是跨实例共享 + 高频读取 + TTL</u>

如果 Session 只放 API A 内存：

~~~text
Request 1 → API A
登录成功

Request 2 → API B
查不到 Session
~~~

Redis 让多个 API Instance 都能访问同一个 Session Key。

#### <u>2. 固定 TTL 与 Sliding TTL 是两种不同会话模型</u>

固定 TTL：

~~~text
Login
↓
TTL = 30min
↓
期间请求不延长
↓
30min 到期
~~~

Sliding Session：

~~~text
每次活跃请求
↓
刷新 TTL
↓
只要持续活跃就继续延长
~~~

两者会影响安全、用户体验和 Redis 写入量，不能只写“Session 有 TTL”。

#### <u>3. Logout 本质是 Session Invalidation</u>

~~~text
DEL session:<token>
~~~

比等待 TTL 自然到期更及时。

但如果 Session 同时在数据库和 Redis 有记录，就会继续进入第五章的 Dual Write / Revocation Window 问题。

### 【Counter State Model 把高频增量压缩成原子数字变化】

Counter 至少可以分成两类：

~~~text
统计型 Counter
↓
accepted / rejected / requests / bytes

协调型 Counter
↓
version / generation / sequence
~~~

#### <u>1. 统计型 Counter 更关注累加结果</u>

INCR / HINCRBY 把：

~~~text
Read old
+
Add
+
Write new
~~~

收进单 Command。

#### <u>2. 协调型 Counter 更关注状态世代变化</u>

例如 Cache Version：

~~~text
version = 8
↓
数据变化
↓
INCR
↓
version = 9
~~~

这里 9 本身没有业务含义，它表达：之前基于 Version 8 构造的 Cache Namespace 已经过期。

因此 Counter 不只是统计工具，也可以是轻量 Coordination State。

### 【Rate Limit State Model 把共享预算映射成 Allow / Reject 决策】

限流回答：

~~~text
某个 Scope
在某段时间内
允许消耗多少 Resource？
~~~

Scope 可以是：

~~~text
IP
User
API Key
Tenant
Project
Endpoint
~~~

#### <u>1. Fixed Window、Sliding Window、Token Bucket、Leaky Bucket 解决不同流量形状</u>

Fixed Window：

~~~text
每分钟 100 次
~~~

优点是简单；缺点是两个窗口边界附近可能短时间集中放行接近两倍流量。

Sliding Window：

~~~text
现在往前 60 秒
最多 100 次
~~~

更平滑，但需要保存或近似统计时间窗口。

Token Bucket：

~~~text
持续补 Token
Request 消耗 Token
~~~

允许：

~~~text
长期平均受限
+
短时间 Burst
~~~

Leaky Bucket 更强调把输出速率平滑成稳定节奏。

#### <u>2. Token Bucket 的核心不是 DECR，而是四个状态步骤</u>

~~~text
State
├── tokens
├── updated
├── rate
└── burst
~~~

请求 cost 到达：

~~~text
elapsed = now - updated
↓
tokens = min(
  burst,
  tokens + elapsed × rate
)
↓
tokens >= cost ?
├── No → Reject
└── Yes → tokens -= cost
↓
保存 tokens / updated
~~~

这就是为什么 Token Bucket 常与 Hash + Lua 配合。

#### <u>3. Redis 适合分布式限流，不是因为 Redis 只服务限流</u>

而是因为它同时提供：

~~~text
共享 State
+
低延迟
+
TTL
+
原子 Command
+
Lua
+
Sorted Set / Hash / String
~~~

使不同限流算法都能映射成 Redis State Model。[28]

### 【Recent Time Window 保存“最近发生了什么”，不是长期历史】

滑动时间窗口也常用于观察：

~~~text
最近 1 分钟发生了哪些请求？
最近 5 分钟有哪些错误？
最近 10 分钟有哪些活跃用户？
~~~

Sorted Set：

~~~text
Score = timestamp
Member = event identity
~~~

写入：

~~~text
ZADD
↓
ZREMRANGEBYSCORE 清理旧成员
~~~

读取：

~~~text
ZRANGE / ZRANGEBYSCORE
~~~

Recent Window 是 Runtime / Operational State，不应该因为能保留最近数据就替代长期历史数据库。

### 【Cache State Model 保存可重新生成的 Derived State】

Cache-Aside：

~~~text
Request
↓
GET Cache
↓
Hit?
├── Yes → Return
└── No
      ↓
   Database Query
      ↓
   SET Cache + TTL
      ↓
   Return
~~~

Cache 最关键的属性是：

~~~text
可以没有
可以重新生成
不是 Source of Truth
~~~

#### <u>1. TTL 同时承担自动清理和有限陈旧上界</u>

如果 TTL = 15s，那么 Cache 即使失效通知漏掉，也不会无限期保持。

但 TTL 越短：

~~~text
Cache Miss 更多
Database Pressure 更高
~~~

TTL 越长：

~~~text
Hit Rate 更高
Staleness Window 更长
~~~

所以 TTL 是一致性与性能的 Trade-off。

### 【Versioned Invalidation 用 Generation 隔离大量旧 Cache】

当一个业务查询可以产生非常多 Cache Key：

~~~text
overview:<filters>
routes:<filters>
performance:<filters>
~~~

逐个 DEL 很难。

可以增加：

~~~text
version = 8
~~~

Cache Key：

~~~text
analytics:v8:<query>
~~~

数据变化：

~~~text
INCR version
↓
9
~~~

新请求只访问：

~~~text
analytics:v9:<query>
~~~

旧 v8 Cache 仍然物理存在，但逻辑不可达，最终由 TTL 删除。

#### <u>1. Version Pattern 是 Logical Invalidation，不是 Physical Deletion</u>

它不是枚举并删除所有旧 Key，而是切换 Namespace。

#### <u>2. Version Pattern 还能隔离 Stale Write</u>

假设：

~~~text
Request A
读取 version = 8
↓
慢查询

期间数据更新
↓
version → 9

Request A 最后写回
↓
analytics:v8:...
~~~

虽然 A 写了旧结果，但它只能进入旧 Generation。

新请求读取 v9，不会命中 v8。

### 【Cache Stampede 是很多 Miss 同时回源的并发问题】

假设热门 Cache 同时过期：

~~~text
1000 Requests
↓
全部 GET Miss
↓
1000 次 Database Query
~~~

常见治理方向：

~~~text
Single Flight / Request Coalescing
Distributed Lock
Early Refresh
Stale-While-Revalidate
TTL Jitter
Prewarm
~~~

具体选择要看 Query 成本、是否允许短时旧数据、并发规模和锁失败策略。

### 【Redis 快不只是因为 Memory，而是整个执行路径更直接】

Redis 快的原因不只包括数据主要驻留内存，还包括：

~~~text
Key → Data Structure
↓
访问路径直接

大量常见操作
直接是原生命令
↓
INCR / HINCRBY / ZADD / EXPIRE

不承担通用关系模型全部成本
↓
没有 JOIN / FK / 通用 Query Planner
~~~

关系数据库即使命中 Buffer Cache，仍然需要承担 SQL Parser、Planner、MVCC、Index、Transaction、Constraint 等更完整语义。

所以 Redis 与关系数据库的性能差异来自数据位置、数据模型、执行语义和一致性能力共同决定的路径差异。

### 【判断一份数据是否适合 Redis，需要先看状态性质】

#### <u>1. 高频读写是信号，但不是充分条件</u>

高频订单余额依然可能必须留在事务数据库。

#### <u>2. 短生命周期和自动过期非常适合 Redis</u>

例如 Session、Verification Code、Rate Limit Bucket、Temporary Cache。

#### <u>3. 可重新计算的数据非常适合 Redis</u>

例如 Query Cache、Derived Ranking、Materialized Runtime View。

#### <u>4. 多实例共享 Runtime State 也适合 Redis</u>

例如 Session、Rate Limit、Coordination Counter、Distributed Presence。

#### <u>5. 复杂关系、强事务和长期权威历史更适合关系数据库</u>

所以正确问题不是“Redis 能不能存”，而是“Redis 应不应该成为这份状态的长期责任边界”。

### 【数据适合放 Redis 与 Redis 是否需要持久化是两个不同问题】

可以按丢失后果把 Redis State 分级：

~~~text
Derived Cache
↓
丢失可重建

Runtime State
↓
丢失影响体验或当前请求

Control State
↓
丢失会短暂重置控制逻辑

Operational State
↓
丢失可能让统计不完整

Critical Runtime State
↓
丢失可能直接影响认证或业务连续性
~~~

同一个 Redis Instance 可能同时承载这些不同级别 State，因此 Persistence 和 Eviction 不能只用“Redis 是缓存”来决定。

## 5. Redis 与数据库的一致性问题来自两套独立状态没有共同事务边界

只要系统同时有 Database 和 Redis，就必须先回答两个问题：

~~~text
哪一份是 Source of Truth？
↓
如果两边都要修改，但只成功一边怎么办？
~~~

### 【第一层先确定数据职责，再讨论一致性】

Source of Truth（权威数据源）表示系统最终认定哪一份状态是真实业务事实。

Derived State（派生状态）表示可以由权威事实重新计算出来的状态。

Runtime State（运行时状态）表示为了请求执行、身份恢复或节点协作临时维护的状态。

#### <u>1. Source of Truth 决定故障后的恢复方向</u>

如果：

~~~text
PostgreSQL
=
Source of Truth

Redis
=
Cache
~~~

恢复方向应该是：

~~~text
PostgreSQL
↓
Rebuild Redis
~~~

而不是 Redis 反向覆盖 PostgreSQL。

#### <u>2. Persistent Record 与 Runtime Read Authority 不是同一个概念</u>

有些系统可能由数据库保存持久 Session Record，但认证热路径真正读取 Redis Session。此时数据库负责持久记录，Redis 却可能是 Runtime Read Authority。

所以“数据库已经删除 Session”并不必然等于“下一次请求一定认证失败”，还要看实际读路径。

### 【第二层一次业务同时修改两个 Store 就形成 Dual Write】

典型：

~~~text
UPDATE Database
↓
DEL Redis Cache
~~~

或者：

~~~text
DELETE Database Session
↓
DEL Redis Session
~~~

这类操作属于 Dual Write（双写）。

#### <u>1. Database Transaction 不能自动把 Redis 包进去</u>

~~~text
BEGIN
UPDATE ...
COMMIT

Redis DEL
~~~

PostgreSQL COMMIT 不会自动回滚 Redis；反过来 Redis Lua 也不会自动回滚 PostgreSQL。

#### <u>2. Dual Write 真正危险的是 Partial Failure</u>

可能出现：

~~~text
Database ✓
Redis ✗
~~~

或者：

~~~text
Redis ✓
Database ✗
~~~

哪一种更严重，取决于状态语义。

#### <u>3. 调换顺序只能改变失败模式，不能消灭 Dual Write</u>

把“先 DB 后 Redis”改成“先 Redis 后 DB”，只会改变哪一边暂时领先，不会得到跨存储原子事务。

### 【第三层 Session 展示跨存储不一致为什么可能具有安全语义】

假设 Logout：

~~~text
DELETE Database Session
↓
DEL Redis Session
~~~

如果：

~~~text
Database DELETE ✓
Redis DEL ✗
~~~

而认证 Guard 只读取 Redis，则旧 Redis Session 仍可能继续通过认证，形成 Session Revocation Window（会话撤销窗口）。

同类问题还可能出现在：

~~~text
Password Reset
Account Disable
Permission Revocation
~~~

所以，同样是“几秒钟不一致”，Analytics Cache 可能只是显示旧统计，Session 却可能成为安全问题。

### 【第四层 Cache-Aside 的核心是 Source of Truth + Invalidation】

读链：

~~~text
Request
↓
GET Redis Cache
↓
Hit?
├── Yes → Return
└── No
      ↓
   Read Database
      ↓
   SET Cache
      ↓
   Return
~~~

写链更常见：

~~~text
Update Source of Truth
↓
Invalidate Cache
↓
Next Read Miss
↓
Reload Source of Truth
~~~

为什么不总是 UPDATE Database + UPDATE Cache？因为这仍然是 Dual Write。Cache 的核心特征是“可以没有、可以重新生成”，因此 Invalidation 通常比维护第二份权威值更自然。

### 【Version + TTL 可以形成两层 Cache Recovery】

Version 主要负责主动 Logical Invalidation；TTL 负责旧状态最终自动失效。

~~~text
Version
↓
快速切换 Generation

TTL
↓
即使 Version Update 漏掉
旧值也有时间上界
~~~

两者不是重复机制。

### 【Derived Cache 不是 Source of Truth，但仍可能成为 Runtime Dependency】

数据语义上：

~~~text
Cache 丢失
↓
可以从 Database Rebuild
~~~

但代码如果在 Redis Error 时直接抛错，那么 Redis 仍然是当前请求的同步依赖。

因此：

~~~text
Data Authority
≠
Runtime Availability Dependency
~~~

如果希望 Cache 真正 Fail-open，需要显式设计 Redis Error → Bypass Cache → Direct Database Query。

### 【第五层跨存储一致性真正依赖可恢复机制】

不一致发生后，关键问题是：

~~~text
系统知不知道还有什么没完成？
↓
能不能 Retry？
↓
Process Crash 后 Retry Intent 还在吗？
↓
最终能不能重新收敛？
~~~

这比追求“任何瞬间绝对一致”更符合分布式系统现实。

### 【Transactional Outbox 把后续动作不能丢变成持久待办】

假设业务状态已经写入数据库，但还必须 Publish Message、Delete Redis 或 Call External API。

直接：

~~~text
DB COMMIT
↓
External Action
~~~

在中间 Crash，会产生 DB 已成功但外部动作永久遗漏的窗口。

Outbox 改成：

~~~text
BEGIN Database Transaction

UPDATE Business Data

INSERT Outbox Task
status = pending

COMMIT
~~~

于是 Business Change 和 Need-to-do Action 被同一个数据库事务原子记录。

#### <u>1. Outbox 的核心是 Durable Retry Intent</u>

普通 retry() 依赖进程内存；Process Crash 后“还要重试”可能消失。Outbox 通过 pending row 让 Restart 后仍然知道要继续执行什么。

#### <u>2. Worker 将 Outbox 从 pending 推进到 completed / retry / failed</u>

~~~text
pending
↓
claim
↓
processing
↓
success → completed
failure → pending + backoff
repeated failure → failed / dead letter
~~~

#### <u>3. Outbox 解决 Reliable Eventual Consistency，不是 Distributed ACID</u>

在 DB COMMIT 到 Worker 完成之间，Database 可能是 New，而 Redis / Broker / External 仍是 Old。Outbox 保证的是“动作不会被忘记并最终收敛”，不是“同一瞬间全部成功”。

#### <u>4. Outbox Consumer 仍然需要 Idempotency</u>

典型窗口：

~~~text
External Action 已成功
↓
还没标记 Outbox completed
↓
Worker Crash
↓
重启后同一 Task 再执行
~~~

所以 At-least-once 与 Idempotent Consumer 仍然需要组合。[32]

#### <u>5. Outbox 与 Message Queue 不互斥</u>

完整链路可以是：

~~~text
Database Transaction
├── Business Data
└── Outbox Event
↓
Relay / Worker
↓
Kafka / RabbitMQ / SQS
↓
Consumers
~~~

Outbox 解决 Database → Broker 的可靠交接；Broker 解决 Message → Consumers 的可靠分发。

### 【Retry、TTL、Version、Outbox 与 Rebuild 解决不同 Failure Stage】

#### <u>1. Retry 解决暂时性执行失败</u>

前提是系统还记得要 Retry 什么。

#### <u>2. TTL 给遗漏失效动作一个时间上界</u>

适合 Cache、Session、Temporary State，但不能保证立即一致。

#### <u>3. Version 解决大量 Cache Key 的逻辑失效与旧写隔离</u>

它是 Cache Consistency Pattern，不是通用事务机制。

#### <u>4. Outbox 解决必须完成的外部动作不能被忘记</u>

核心是 Pending Work 被持久化。

#### <u>5. Rebuild 适合真正可派生状态</u>

Redis Cache 丢失后，从 Database 重新生成，通常比复杂双向同步更自然。

### 【强一致、有限陈旧与最终一致必须按 State Semantics 选择】

~~~text
Security Revocation
↓
更强 Immediate Consistency

Analytics Cache
↓
Bounded Staleness

Async Side Effect
↓
Reliable Eventual Consistency
~~~

所以设计链应该是：

~~~text
State Semantics
↓
Business Impact
↓
Allowed Staleness
↓
Recovery Ability
↓
Invalidate / TTL / Version / Retry / Outbox / Rebuild
~~~

## 6. Redis 的可靠运行需要同时解决 Durability、Memory Safety、Availability 与 Recovery

“Redis 要高可靠”至少应该拆成四层：

~~~text
Durability
Redis Restart 后数据还能不能恢复？

Memory Safety
运行过程中 Dataset 会不会无限增长？

Availability
Redis Node 故障后服务还能不能继续？

Recovery
面对不同 Failure Mode，怎样恢复到可接受状态？
~~~

### 【第一层 Durability 解决 Redis 重启以后 Dataset 能否恢复】

如果完全没有 Persistence：

~~~text
Memory Dataset
↓
Process Crash / Power Off
↓
Restart
↓
Dataset 消失
~~~

Redis 主要支持 RDB、AOF、RDB + AOF 和 No Persistence。[24]

### 【RDB 通过周期性 Snapshot 保存某个时间点的 Dataset】

~~~text
Redis Memory
↓ Snapshot
dump.rdb
~~~

假设 10:00 Snapshot，10:01 和 10:02 又发生写入，10:03 Crash，而之后没有新的 Snapshot，那么恢复只能依赖 10:00 的状态。

因此 RDB 的基本模型是 Point-in-time Snapshot。

优点包括文件相对紧凑、适合备份、大数据集恢复路径直接；代价是 Snapshot 之间存在数据丢失窗口，并且 fork / snapshot 会消耗 CPU、Memory、I/O。

### 【AOF 记录改变 Dataset 的写操作】

AOF（Append Only File）记录类似 SET、HSET、INCR、DEL 等改变 Dataset 的写操作。

Restart：

~~~text
AOF
↓
Replay Writes
↓
Rebuild Dataset
~~~

因此：

~~~text
RDB = Snapshot
AOF = Write Operation Log
~~~

#### <u>1. AOF 的可靠程度真正由 fsync 策略决定</u>

不能简单理解 appendonly yes 就意味着每条写已经永久落盘。

中间还有：

~~~text
Redis
↓
OS Buffer / Page Cache
↓
Disk
~~~

常见策略：

~~~text
appendfsync always
appendfsync everysec
appendfsync no
~~~

always 更偏 Durability，但增加写延迟；everysec 在性能与数据丢失窗口之间折中；no 更多依赖操作系统刷盘。

#### <u>2. AOF Rewrite 解决日志无限增长</u>

如果 INCR count 执行很多次，最终 Dataset 可能只需要 count = 1000000，但旧 AOF 包含大量历史操作。

Rewrite：

~~~text
Old AOF
大量历史命令
↓
Background Rewrite
↓
New AOF
只保留恢复当前 Dataset
真正需要的信息
~~~

所以 AOF 体系应理解成 Append + fsync + Rewrite + Replay。

### 【第二层 Memory Safety 解决 Dataset 增长到容量边界后的行为】

Persistence 解决 Restart 后能不能恢复，却不能解决运行中内存会不会不断增长。

如果持续 SET / HSET / ZADD，却没有 TTL、DEL、Range Cleanup 和 Capacity Limit，Dataset 会持续增长。

Memory Governance 至少包含：

~~~text
TTL / Cleanup
maxmemory
maxmemory-policy
Memory Observability
~~~

### 【maxmemory 定义内存上界，Eviction Policy 定义超过上界后牺牲谁】

maxmemory 定义 Dataset Capacity Boundary；maxmemory-policy 定义到达上限后的处理规则。[34]

#### <u>1. noeviction 更强调保留已有 Key</u>

达到上限后 Existing Keys 保留，需要增加内存的写操作可能返回 Error。

#### <u>2. allkeys-* 会从全部 Key 中选择驱逐对象</u>

例如 allkeys-lru、allkeys-lfu、allkeys-random，更接近 Pure Cache Instance，因为被驱逐的 Cache 可以 Rebuild。

#### <u>3. volatile-* 只从带 TTL 的 Key 中选择候选</u>

但带 TTL 的 Key 不一定都是 Cache。Session、Rate Limit、Temporary Control State 都可能有 TTL。

所以 volatile-* 也可能驱逐 Session 或 Control State。

因此：

> Eviction Policy 是 Redis Instance 级的数据治理策略，不是 Cache 的一个局部配置。

### 【第三层 Availability 解决 Redis Node 故障后服务是否继续】

即使 AOF 完整，Redis Process Crash → Restart → AOF Replay → Ready 期间 Redis 仍不可用。

所以：

~~~text
Persistence
≠
High Availability
~~~

### 【Replication 提供副本，但不自动等于 Failover】

基本结构：

~~~text
Primary
↓ Replication Stream
Replica
~~~

Replication 解决 Data Redundancy。[35]

如果 Primary Down，但 Replica 还在，仍然要回答：

~~~text
谁把 Replica 提升为 Primary？
Client 去哪里发现新 Primary？
其他 Replica 跟谁？
~~~

这才是 Failover。

### 【Sentinel 在非 Cluster 架构中提供监控和自动故障切换】

Sentinel 的核心职责：

~~~text
Monitoring
Notification
Failure Detection
Automatic Failover
Configuration Provider
~~~

典型：

~~~text
Primary Down
↓
Sentinel 判断故障
↓
选择 Replica
↓
Promote
↓
其他 Replica 跟随新 Primary
↓
Client 获取新 Primary
~~~

所以：

~~~text
RDB / AOF → Durability
Replication → Redundancy
Sentinel → Failure Detection + Failover
~~~

不是三种同义的“备份”。[36]

### 【第四层 Recovery 必须按 Failure Mode 选择机制】

| Failure Mode | 主要问题 | 常见机制 |
| --- | --- | --- |
| Process Crash | 内存 State 消失 | RDB / AOF |
| Power Loss | 最近写是否落盘 | fsync |
| AOF 过大 | 恢复和磁盘成本 | Rewrite |
| Memory Full | 删除谁 / 拒绝谁 | maxmemory + eviction |
| Redis Node Down | 服务是否继续 | Replica + Failover |
| Host Down | 单机全部失效 | Multi-node Replication |
| 误删 / 错写 | 错误可能同步副本 | Backup / Historical Recovery |

一个 Redis 配置不可能解决所有 Failure。

### 【Replication 与 Backup 解决的不是同一个问题】

如果 Primary 错误执行 DEL / FLUSH，错误可能同步到 Replica，所以 Replica 不能替代 Historical Backup。

Backup 更关注“能否恢复到过去某个正确时间点”；Replication 更关注“当前节点故障后有没有另一节点继续服务”。

### 【RPO 与 RTO 把高可靠拆成可回答目标】

RPO（Recovery Point Objective，恢复点目标）问：故障后最多允许丢失多久的数据？

它会影响 AOF fsync、Snapshot Frequency、Replication 与 Backup。

RTO（Recovery Time Objective，恢复时间目标）问：故障以后多久必须重新提供服务？

它会影响 Single-node Restart、Sentinel Failover、Cluster 和 Managed HA。

可以粗略理解：

~~~text
Persistence / fsync
↓
主要影响 Data Loss / RPO

Replication / Failover
↓
主要影响 Service Recovery / RTO
~~~

### 【不同 Redis State 应该分别评估 Failure Impact】

| State | 丢失后 | 暂时不可用时 | 一般敏感度 |
| --- | --- | --- | --- |
| Query Cache | 可重建 | 可考虑回源 DB | 低 |
| Rate Limit | 预算重置 | 限流链路受影响 | 中 |
| Session | 登录态丢失 | 认证不可用 | 高 |
| Version Counter | Cache Generation 重置 | Cache 路径受影响 | 中 |
| Operational Stats | 统计出现缺口 | 状态看板不完整 | 视业务要求 |

同一个 Redis Instance 可能混合不同 Reliability Class，因此未来可能需要 Instance Splitting、不同 Persistence、不同 Eviction、不同 HA 和不同 Access Control。

## 7. Redis 的水平扩展需要理解 Replication、Sharding、Cluster 与 Hash Slot

第 6 章已经从可靠性角度解释了 Replication 与 Sentinel。进入规模化以后，问题变成：

~~~text
单节点 CPU 到顶怎么办？
单节点 Memory 不够怎么办？
单节点 Network 饱和怎么办？
写入吞吐需要继续增加怎么办？
~~~

这时才进入 Horizontal Scaling（水平扩展）。

### 【Vertical Scaling 与 Horizontal Scaling 解决的层级不同】

Vertical Scaling：

~~~text
更大的 CPU
更多 Memory
更快 Network
更快 Disk
~~~

优点是简单，不改变 Key Distribution。

但单机总有上限。

Horizontal Scaling：

~~~text
多个 Redis Node
↓
把 Keyspace 分散
~~~

需要新的问题：

~~~text
一个 Key 应该去哪台 Node？
多 Key Command 怎么办？
Transaction 怎么办？
Lua Script 怎么办？
Node 加减以后 Key 如何迁移？
~~~

### 【Replica 可以扩展部分读取，但不能分散全部写入】

Primary / Replica：

~~~text
Writes
↓
Primary

Reads
↓
Primary / Replica
~~~

在允许读副本、允许一定复制延迟的场景，Replica 可以承担部分 Read Traffic。

但所有 Writes 仍然集中到 Primary，因此 Replica 不是通用 Write Scaling 方案。

### 【Redis Cluster 通过 Hash Slot 把 Keyspace 分片到多个 Master】

Redis Cluster 引入固定数量的 Hash Slot：

~~~text
Key
↓
CRC16
↓
Hash Slot
↓
负责该 Slot 的 Master
~~~

Redis Cluster Specification 定义 16384 个 Slot。[38]

逻辑：

~~~text
Cluster
├── Master A
│   └── Slots 0 ... 5000
├── Master B
│   └── Slots 5001 ... 10000
└── Master C
    └── Slots 10001 ... 16383
~~~

当扩容时，迁移的是 Slot Responsibility，而不是简单修改所有 Client 的取模公式。

### 【Cluster 解决 Keyspace 分片，但不能自动解决 Hot Key】

假设很多 Key 已经均匀分布到多个 Master，但其中一个 Key 每秒承担极高访问量，它仍然只属于一个 Slot，也只落在一个 Master。

所以：

~~~text
Sharding
=
分散大量 Key 的整体负载

Hot Key
=
单个 Key 的访问集中问题
~~~

不能混为一谈。

### 【Cluster 会反过来约束多 Key Command、Transaction 与 Lua】

单节点 Redis 中：

~~~text
MGET keyA keyB
MULTI 操作 keyA / keyB
Lua 访问 keyA / keyB
~~~

只要都在同一个 Server，执行边界比较直接。

Cluster 中：

~~~text
keyA → Slot 100
keyB → Slot 9000
~~~

可能位于不同 Node。

很多需要同时操作多个 Key 的能力要求相关 Key 位于同一个 Slot，否则会遇到 Cross-slot 限制。

### 【Hash Tag 用花括号显式控制相关 Key 落到同一 Slot】

例如：

~~~text
user:{42}:profile
user:{42}:session
user:{42}:counter
~~~

Cluster 计算 Slot 时只使用：

~~~text
{42}
~~~

因此这些 Key 会落到相同 Slot。

Hash Tag 适合真正需要一起执行 Multi-key Command / Transaction / Script 的相关 Key。

但不能滥用。

如果大量 Key 都使用同一个 Tag：

~~~text
{global}:...
~~~

就会把很多流量重新压回同一个 Slot，形成 Hot Slot。

### 【Lua Script 在 Cluster 中必须显式声明 Key，并考虑 Slot】

EVAL：

~~~text
EVAL script numkeys key1 key2 ... arg1 arg2 ...
~~~

脚本访问的 Redis Key 应通过 KEYS 声明。[6]

在 Cluster 下，多 Key Script 还要考虑这些 Key 是否可在同一个执行节点完成。

所以从单机迁移 Cluster 前，应重新审查：

~~~text
Multi-key Commands
MULTI / EXEC
Lua
Pipeline
Key Naming
Hash Tag
~~~

而不是只改 Redis Connection String。

### 【Cluster 与 Sentinel 不是同一个维度】

可以先建立：

~~~text
Sentinel
↓
主要围绕一组 Primary / Replica
做 High Availability

Cluster
↓
主要解决 Keyspace Sharding
同时也包含分片节点的故障转移机制
~~~

如果单节点容量足够但需要更短 Failover，可以使用 Sentinel / Managed HA。

如果单节点容量和吞吐本身不够，才需要 Sharding / Cluster。

不要因为“生产要高可用”就自动得出“必须上 Cluster”。

## 8. Redis 的规模化运行需要同时治理 Key 分布、命令成本、内存与可观测性

很多 Redis 性能问题不是“Redis 整体太慢”，而是某一类 Key、某一条 Command 或某一种访问模式出现了结构性问题。

治理可以拆成四层：

~~~text
Keyspace Governance
↓
Execution Efficiency
↓
Capacity / Memory
↓
Observability
~~~

### 【第一层 Keyspace Governance 先区分 Cardinality、Big Key 与 Hot Key】

#### <u>1. Key 很多不等于 Big Key</u>

假设：

~~~text
session:user1
session:user2
...
100 万个 Key
~~~

每个只有几百 Bytes。

这里主要问题是：

~~~text
High Cardinality
+
Total Memory
~~~

而不是 Big Key。

#### <u>2. Big Key 指单个 Key 内部承载数据过大</u>

例如：

~~~text
one-hash
↓
500 万 Fields

one-zset
↓
1000 万 Members

one-string
↓
几十 MB
~~~

Big Key 风险不只是占内存。

某些 Command：

~~~text
HGETALL
LRANGE 0 -1
ZRANGE 0 -1
DEL huge-key
~~~

都可能一次处理大量元素，带来 CPU、Network、Latency 和删除成本。

#### <u>3. Hot Key 指单个 Key 被访问得过于频繁</u>

一个 Value 只有几个字节，也可能因为每秒极高访问量成为 Hot Key。

所以：

~~~text
Big Key
=
Data Size Problem

Hot Key
=
Access Frequency Problem

High Cardinality
=
Key Count Problem
~~~

三者可能独立，也可能同时存在。

### 【Key Design 会决定流量集中还是自然分散】

例如：

~~~text
session:<sessionId>
~~~

天然按 Session 分散。

而：

~~~text
counter:global
~~~

所有请求都写同一个 Key，更容易成为 Hot Key。

所以在设计 Key 时就应该问：

~~~text
这个 Scope 会不会让所有请求集中？
有没有必要按 Tenant / User / Shard 拆分？
拆分后还能不能满足业务查询？
~~~

### 【第二层 Execution Efficiency 关注 Command 成本和结果规模】

不能只记：

~~~text
Redis Command 很快
~~~

Command Complexity 必须和数据规模一起看。

例如：

~~~text
HGET 一个 Field
~~~

和：

~~~text
HGETALL 一个拥有 500 万 Field 的 Hash
~~~

虽然都访问 Hash，但实际成本完全不同。

范围查询也一样：

~~~text
ZRANGE 返回 10 个 Member
~~~

和：

~~~text
ZRANGE 返回 100 万 Member
~~~

Network Payload 和 Client Parsing 成本差异巨大。

### 【Pipeline 优化大量独立 Command 的 RTT】

如果应用需要连续发送很多独立命令：

~~~text
Command 1
RTT
Command 2
RTT
Command 3
RTT
~~~

Pipeline 可以：

~~~text
一次发送多条
↓
Redis 顺序执行
↓
批量返回 Response
~~~

主要收益是减少 Network Round Trip。[37]

但仍然要记住：

~~~text
Pipeline
=
Performance Tool

MULTI / Lua
=
Correctness / Atomicity Tool
~~~

### 【Connection Reuse 避免把建连成本放进每个业务请求】

每个 Redis Connection 都需要：

~~~text
TCP Socket
File Descriptor
Client State
Input Buffer
Output Buffer
可能的 TLS / AUTH
~~~

所以典型应用应复用进程级 Client。

Connection 数量也必须纳入容量：

~~~text
Application Instances
×
Connections per Instance
+
Workers
+
Admin
+
Monitoring
+
Replication / Sentinel
~~~

不能无限增长。

### 【第三层 Memory Governance 不只看 used_memory】

内存问题至少包括：

~~~text
Dataset Memory
Allocator Overhead
Fragmentation
Client Buffers
Replication Buffers
AOF Rewrite / Fork Headroom
Temporary Growth
~~~

因此：

~~~text
当前 used_memory = 4GB
↓
机器就配置 4GB
~~~

是不安全的。

需要保留 Headroom 给 Traffic Spike、Fragmentation、Fork、Rewrite 与 Replication。

### 【第四层 Observability 让性能治理从猜测变成定位】

#### <u>1. INFO 是 Redis Runtime 的基础入口</u>

INFO 可以观察：

~~~text
Server
Clients
Memory
Persistence
Stats
Replication
CPU
Keyspace
Commandstats
Latencystats
~~~

它不只是版本查询，而是运行状态总入口。[40]

#### <u>2. MEMORY STATS 用于理解内存组成</u>

MEMORY STATS 可以帮助区分：

~~~text
Dataset
Overhead
Peak
Fragmentation
Allocator
~~~

从而判断内存上涨到底来自数据还是运行开销。[41]

#### <u>3. SLOWLOG 定位 Redis Server 内部执行时间过长的 Command</u>

SLOWLOG 记录超过阈值的 Server-side Command Execution。[42]

要注意：

~~~text
SLOWLOG Time
≠
Client End-to-end Latency
~~~

如果 Client 感知 100ms，但 SLOWLOG 没记录慢命令，问题可能在：

~~~text
Network
Connection Establishment
Client Scheduling
Queueing
~~~

而不是 Redis Command 自身。

#### <u>4. LATENCY Monitoring 观察 Redis 内部延迟事件</u>

Redis 提供：

~~~text
LATENCY LATEST
LATENCY HISTORY
LATENCY GRAPH
LATENCY DOCTOR
~~~

用于分析 Fork、AOF、Command Spike、Eviction 等内部延迟事件。[43]

### 【Big Key、Hot Key 需要专门进入日常诊断】

常见：

~~~text
redis-cli --bigkeys
redis-cli --memkeys
redis-cli --hotkeys
~~~

分别帮助观察大型结构、高内存 Key 和高频 Key。

MONITOR 虽然可以实时看到命令流，但会带来明显额外开销，不适合当长期生产监控方案。

### 【完整 Redis Observability 至少覆盖六类信号】

~~~text
Availability
├── Up / Ping
└── Failover State

Traffic
├── Ops/sec
├── Command Calls
└── Network

Latency
├── Command Latency
├── SLOWLOG
└── LATENCY Events

Memory
├── used_memory
├── maxmemory
├── fragmentation
└── evicted_keys

Persistence
├── RDB / AOF Status
├── Last Save
└── Rewrite

Keyspace
├── Key Count
├── Big Key
└── Hot Key
~~~

所以 PING = PONG 只能证明 Redis 当前能响应，不能证明 Redis 运行健康。

## 9. Redis 的生产治理需要同时控制网络、身份权限、连接资源和变更风险

生产安全不是“给 Redis 加一个密码”就结束。

应该按层建立：

~~~text
Network Boundary
↓
Encryption in Transit
↓
Authentication
↓
Authorization / ACL
↓
Connection Governance
↓
Configuration / Secret Governance
↓
Upgrade / Capacity Governance
~~~

### 【第一层 Network Boundary 决定谁能够真正到达 Redis】

典型生产链：

~~~text
Browser / User
↓
HTTP API
↓
Application Network
↓
Redis
~~~

而不是：

~~~text
Internet
↓
Redis :6379
~~~

常见手段：

~~~text
Private Subnet
Firewall
Security Group
Container Network
Kubernetes Network Policy
Redis bind
~~~

目标是：即使攻击者知道 Redis 地址和端口，也不应该在网络层直接到达 Redis。

### 【Protected Mode 是安全兜底，不应该替代正式网络隔离】

Protected Mode 更像：

~~~text
默认配置误暴露时
减少直接远程访问风险
~~~

它不能替代：

~~~text
Private Network
Firewall
Authentication
ACL
TLS
~~~

应该把它理解成 Safety Guardrail，而不是完整 Security Architecture。[44]

### 【TLS 解决传输过程中是否加密】

三个问题要分开：

~~~text
Authentication
→ 你是谁？

Authorization
→ 你能做什么？

TLS
→ 你和 Redis 之间的通信是否加密？
~~~

Redis 支持 TLS 用于 Client Connection、Replication Link 等通信。[46]

网络私有化也不能自动等于完全不需要 TLS，是否启用取决于威胁模型、合规和部署环境。

### 【第二层 ACL 把身份认证继续细化到 Command 与 Key 权限】

Redis ACL 可以把连接绑定到 User，并限制：

~~~text
Commands
Keys
Pub/Sub Channels
~~~

#### <u>1. Authentication 只回答你是谁</u>

AUTH 成功后，还要继续问：

~~~text
这个 User
可以执行哪些 Command？
可以访问哪些 Key？
~~~

#### <u>2. 普通业务用户不应该默认拥有管理命令</u>

业务应用通常不需要：

~~~text
CONFIG
SHUTDOWN
DEBUG
FLUSHALL
REPLICAOF
ACL SETUSER
~~~

权限应遵循 Least Privilege。[45]

#### <u>3. ACL Key Pattern 可以隔离不同服务 Namespace</u>

例如：

~~~text
Analytics Service
只需要 analytics:*
~~~

可以限制其只访问对应 Key Pattern，而不能访问：

~~~text
session:*
~~~

这样即使某个服务被攻破，也能降低横向读取其他 Redis State 的范围。

### 【危险命令治理应该依靠 Server-side Authorization，而不只是团队约定】

“开发人员不要调用 FLUSHALL”不是安全边界。

真正边界应该是：

~~~text
即使代码尝试调用
Redis Server 也拒绝
~~~

这就是 ACL 的价值。

### 【第三层 Connection Governance 控制 Client 自身不能成为资源风险】

每个 Client 都需要：

~~~text
Socket
File Descriptor
Client State
Input Buffer
Output Buffer
~~~

Redis maxclients 用于限制最大 Client 数。[47]

容量应该估算：

~~~text
API Instances
×
Connections per Instance
+
Workers
+
Admin
+
Monitoring
+
Replication / Sentinel
~~~

不能无限增长。

### 【Client Retry 必须和业务 Timeout 放在同一个时间预算里】

假设：

~~~text
HTTP Timeout = 3s
~~~

Redis Client 如果无限重试：

~~~text
Request 已经没有业务价值
↓
底层仍不断 Retry
↓
请求 / 内存 / 连接继续堆积
~~~

所以需要统一考虑：

~~~text
Connect Timeout
Command Timeout
Retry Count
Retry Backoff
Business Deadline
~~~

Retry 既是 Reliability 机制，也是 Resource Governance。

### 【Application Shutdown 也是 Connection Lifecycle 的一部分】

优雅关闭：

~~~text
Stop accepting new work
↓
Finish / cancel in-flight work
↓
QUIT / close Redis Client
↓
Process Exit
~~~

比直接依赖进程被杀更可控。

### 【第四层 Operational Governance 控制运行参数和基础设施变更风险】

Redis 配置：

~~~text
appendonly
appendfsync
maxmemory
maxmemory-policy
timeout
maxclients
ACL
TLS
~~~

会直接影响：

~~~text
Durability
Availability
Performance
Security
~~~

生产环境不应该依赖某个人临时 CONFIG SET 后没有记录。

更合理：

~~~text
Configuration
↓
Version Control / IaC
↓
Review
↓
Deploy
↓
Verify
~~~

### 【Secret 应拥有独立生命周期】

Redis Credential、Certificate、Private Key 属于 Secret，不应与 Host、Port、Timeout 一样管理。

应该考虑：

~~~text
Generate
Store
Distribute
Rotate
Revoke
Audit
~~~

常见承载：

~~~text
Secret Manager
Kubernetes Secret
Cloud Secret Service
Runtime Environment Injection
~~~

### 【升级 Redis 不是单纯替换 Image Tag】

版本升级前至少检查：

~~~text
Command Compatibility
Persistence Compatibility
ACL / Security Changes
Client Compatibility
Cluster Behavior
Memory Behavior
Performance Regression
~~~

再经过：

~~~text
Test
↓
Staging
↓
Backup / Rollback Plan
↓
Production Rollout
~~~

### 【Capacity Planning 把前面所有治理能力连接起来】

Capacity Planning 不只是“需要多少 GB RAM”。

至少包括：

~~~text
Key Count
Average Key Size
Peak Key Size
Ops / second
Read / Write Ratio
Hot Key Distribution
Connected Clients
Network Throughput
Persistence I/O
Growth Rate
~~~

Memory 还要留 Headroom：

~~~text
Traffic Spike
AOF Rewrite
Fork
Replication
Fragmentation
Temporary Growth
~~~

所以：

~~~text
当前 used_memory = 4GB
↓
机器配置 4GB
~~~

不是合理容量规划。

真正需要的是：

~~~text
Peak Requirement
+
Growth
+
Failure / Maintenance Headroom
~~~

### 【生产治理最终是一套分层检查表】

| 维度 | 需要回答 |
| --- | --- |
| Network | 谁能访问 Redis Port？ |
| TLS | 数据传输是否需要加密？ |
| Auth | 使用什么 Redis User / Credential？ |
| ACL | 允许哪些 Command / Key Pattern？ |
| Client | 连接是否复用？Timeout / Retry 如何？ |
| Memory | maxmemory / eviction 是否匹配 State？ |
| Persistence | RDB / AOF / fsync 是否匹配 RPO？ |
| HA | Replica / Sentinel / Cluster 是否匹配 RTO？ |
| Observability | 是否能定位 Latency / Memory / Hot Key？ |
| Operations | 配置、Secret、升级、备份是否受控？ |

## 10. Redis 设计最终回到“状态—结构—并发—生命周期—一致性—恢复”六个问题

前面所有知识最终都要收敛到一个工程判断：

> 面对一份新的服务端状态，怎样判断它是否应该进入 Redis，以及进入以后该怎样设计？

不要从“Redis 能不能做”出发，而要按六层决策。

### 【第一问：State——这到底是什么状态，谁是 Source of Truth】

先分类：

~~~text
Authoritative Business State
Derived State
Runtime State
Control State
Operational State
~~~

如果它是订单、余额、支付结果等长期权威事实，通常不应该只依赖 Redis。

如果它是：

~~~text
Cache
Session
Rate Limit
Counter
Temporary Coordination
Recent Window
~~~

Redis 才进入候选。

### 【第二问：Structure / Access——Key 怎样设计，访问模式是什么】

依次问：

~~~text
Scope 是什么？
↓
哪些请求应该访问同一份状态？
↓
整体读写还是字段级修改？
↓
需要唯一成员、排序、范围查询还是消费？
~~~

映射：

~~~text
整体值 / Counter
→ String

对象字段
→ Hash

顺序队列
→ List

唯一成员
→ Set

排序 / 时间窗口
→ Sorted Set

持久记录流
→ Stream
~~~

再检查：

~~~text
Key 是否会成为 Hot Key？
Value 是否会成为 Big Key？
Key 数量是否会爆炸？
~~~

### 【第三问：Concurrency——并发修改需要什么原子边界】

决策顺序：

~~~text
单 Command 能完成？
├── Yes
│   → 优先原生命令
│
└── No
    ↓
命令序列是否预先确定？
├── Yes
│   → MULTI / EXEC
│
└── No
    ↓
是否需要 Client 读取后计算？
├── Yes
│   → WATCH + Retry
│
└── No / 适合 Server-side
    → Lua / Function
~~~

同时区分：

~~~text
Pipeline
=
性能优化

Atomic Command / MULTI / WATCH / Lua
=
并发正确性
~~~

### 【第四问：Lifecycle——这份状态应该存在多久】

需要明确：

~~~text
TTL 多久？
↓
TTL 是否刷新？
↓
固定 TTL 还是 Sliding TTL？
↓
内部 Member 是否还要单独清理？
↓
Key 会不会无限增长？
~~~

例如 Sorted Set 时间窗口：

~~~text
Member Cleanup
+
Key TTL
~~~

是两层不同生命周期。

### 【第五问：Consistency——Redis 与其他 Store 怎样保持可接受一致】

先确定：

~~~text
Redis 是 Source of Truth？
还是 Derived State？
还是 Runtime Read Authority？
~~~

然后识别：

~~~text
Database + Redis
↓
是否形成 Dual Write？
~~~

按状态语义选择：

~~~text
Cache
→ Invalidation / TTL / Version / Rebuild

Session Revocation
→ 更强失败处理 / Retry / Durable Intent

必须完成的外部 Side Effect
→ Transactional Outbox
~~~

不能把所有场景统一成“写完数据库后 DEL Redis”。

### 【第六问：Recovery——Redis 丢失、变慢、重启或节点故障后怎么办】

继续拆：

~~~text
Dataset 丢失
→ RDB / AOF / Rebuild

Memory 满
→ Cleanup / maxmemory / Eviction

Node Down
→ Replica / Sentinel / Cluster / Managed HA

误删
→ Backup / Point-in-time Recovery

Redis 不可用
→ Fail-open / Fail-closed / Graceful Degradation
~~~

最后再用 RPO / RTO 判断需要多强的 Persistence 与 HA。

### 【单机设计完成以后，再进入规模化和生产治理】

~~~text
State Model 正确
↓
单机容量够不够？
↓
是否出现 Hot Key / Big Key？
↓
是否需要 Replica？
↓
是否需要 Sentinel？
↓
是否需要 Cluster？
↓
Multi-key / Lua 是否受 Slot 约束？
↓
Observability 是否能定位问题？
↓
ACL / TLS / Secret / Config 是否受控？
~~~

### 【常见场景可以用状态职责快速判断】

| 场景 | Redis 是否适合 | 核心原因 | 需要额外注意 |
| --- | --- | --- | --- |
| 查询 Cache | 很适合 | 可派生 + TTL + 高频读取 | Stampede、Invalidation |
| Session | 常见 | 多实例共享 + TTL | Revocation、HA、Eviction |
| Rate Limit | 很适合 | 高频小状态 + 原子操作 | Hot Key、Fail-open / closed |
| Counter | 常见 | INCR / HINCRBY | 是否允许统计丢失 |
| 排行榜 | 很适合 | Sorted Set | Big Key、范围查询规模 |
| Sliding Window | 很适合 | Score = Time | Member Cleanup + TTL |
| 瞬时广播 | 可用 Pub/Sub | 简单低延迟 | 无离线历史 |
| 轻量持久流 | 可用 Streams | Consumer Group + ACK | 与 Broker 的边界 |
| 复杂订单事实 | 通常不应只放 Redis | 强事务、长期权威历史 | Database Source of Truth |
| 跨表复杂查询 | 不适合 | Redis 非关系查询模型 | 关系数据库 / Analytics Store |

### 【面试和答辩回答 Redis 选型时不要只说“因为快”】

更完整的回答路径：

~~~text
先说明状态职责
↓
为什么需要跨实例共享 / 高频访问
↓
为什么选择某个 Data Type
↓
怎样保证并发正确
↓
TTL / Persistence / Recovery 怎么设计
↓
Redis 与 Database 谁是 Source of Truth
↓
规模上来后 Hot Key / Cluster / HA 怎么处理
~~~

例如 Rate Limit：

> 限流预算属于高频、短生命周期、需要跨 API 实例共享的 Control State，所以适合 Redis；Bucket 内 tokens 与 updated 可以用 Hash 表达，请求需要 Read → Refill → Check → Deduct → Write，因此用 Lua 收进 Redis Server 原子执行；Bucket 长时间不活跃后通过 TTL 清理；如果 Redis 故障，还需要根据业务选择 Fail-open 或 Fail-closed，并评估 Project Scope 是否会形成 Hot Key。

这比“Redis 快，所以用 Redis 做限流”完整得多。

### 【项目实践只负责验证通用知识，不承担通用定义】

Browser Monitor 是这套 Redis 体系的一个真实工程映射：

- [Browser Monitor · Redis 体系源码学习](../browser-monitor/docs/Redis体系源码学习.md)：逐层验证 Redis Server / Client、String / Hash / Sorted Set、TTL、Lua、Session、Rate Limit、Recent Window、Cache、Version Key、AOF、Eviction、Sentinel / Cluster 边界、Hot Key、Observability 与生产治理。
- [Browser Monitor · 服务端全链路](../browser-monitor/docs/浏览器监控平台-服务端全链路.md)：查看 Redis Token Bucket 在“采集请求 → Project / Origin → 限流 → Event 校验 → PostgreSQL Transaction → 202”中的真实位置。
- [服务端异步任务与消息处理体系](./F-服务端异步任务与消息处理体系.md)：继续区分 Redis Stream、Database Job Store、RabbitMQ、SQS 与 Kafka。
- [数据库完整框架体系](./S-数据库完整框架体系.md)：继续理解 Redis 与关系数据库在 Source of Truth、Transaction、Constraint 与 Concurrency Control 上的职责边界。

## 11. 参考资料

[1] Redis. Redis Data Types. https://redis.io/docs/latest/develop/data-types/

[2] Redis. Keys and values / Key expiration. https://redis.io/docs/latest/develop/use/keyspace/

[3] Redis. Redis Persistence. https://redis.io/docs/latest/operate/oss_and_stack/management/persistence/

[4] Redis. Scripting with Lua. https://redis.io/docs/latest/develop/programmability/eval-intro/

[5] Redis/ioredis. RedisOptions.ts. https://github.com/redis/ioredis/blob/main/lib/redis/RedisOptions.ts

[6] Redis. EVAL command. https://redis.io/docs/latest/commands/eval/

[7] Redis. Compare data types. https://redis.io/docs/latest/develop/data-types/compare-data-types/

[8] Redis. Redis Strings. https://redis.io/docs/latest/develop/data-types/strings/

[9] Redis. Redis Hashes. https://redis.io/docs/latest/develop/data-types/hashes/

[10] Redis. Redis Sorted Sets. https://redis.io/docs/latest/develop/data-types/sorted-sets/

[11] Redis. HINCRBY Command. https://redis.io/docs/latest/commands/hincrby/

[12] Redis. ZADD Command. https://redis.io/docs/latest/commands/zadd/

[13] Redis. ZRANGEBYSCORE Command. https://redis.io/docs/latest/commands/zrangebyscore/

[14] Redis. ZREMRANGEBYSCORE Command. https://redis.io/docs/latest/commands/zremrangebyscore/

[15] Redis. Redis Lists. https://redis.io/docs/latest/develop/data-types/lists/

[16] Redis. Redis Sets. https://redis.io/docs/latest/develop/data-types/sets/

[17] Redis. Redis Streams. https://redis.io/docs/latest/develop/data-types/streams/

[18] Redis. Transactions. https://redis.io/docs/latest/interact/transactions/

[19] Redis. EXEC Command. https://redis.io/docs/latest/commands/exec/

[20] Redis. Redis Pipelining. https://redis.io/docs/latest/develop/using-commands/pipelining/

[21] Redis. Scripting with Lua. https://redis.io/docs/latest/develop/programmability/eval-intro/

[22] Redis. Redis Lua API Reference. https://redis.io/docs/latest/develop/interact/programmability/lua-api/

[23] Redis. You Don’t Need Transaction Rollbacks in Redis. https://redis.io/blog/you-dont-need-transaction-rollbacks-in-redis/

[24] Redis. Persistence. https://redis.io/docs/latest/operate/oss_and_stack/management/persistence/

[25] Redis. RDB Persistence. https://redis.io/docs/latest/operate/oss_and_stack/management/persistence/#rdb-advantages

[26] Redis. AOF Persistence. https://redis.io/docs/latest/operate/oss_and_stack/management/persistence/#aof-advantages

[27] Redis. Session Store. https://redis.io/docs/latest/develop/use-cases/session-store/

[28] Redis. Rate Limiting. https://redis.io/docs/latest/develop/use-cases/rate-limiter/

[29] Redis. Cache-Aside. https://redis.io/docs/latest/develop/use-cases/cache-aside/

[30] PostgreSQL. Database Physical Storage. https://www.postgresql.org/docs/current/storage.html

[31] PostgreSQL. Write-Ahead Logging. https://www.postgresql.org/docs/current/wal-intro.html

[32] AWS. Transactional Outbox Pattern. https://docs.aws.amazon.com/prescriptive-guidance/latest/cloud-design-patterns/transactional-outbox.html

[33] Redis. Persistence. https://redis.io/docs/latest/management/persistence/

[34] Redis. Key Eviction. https://redis.io/docs/latest/reference/eviction/

[35] Redis. Replication. https://redis.io/docs/latest/operate/oss_and_stack/management/replication/

[36] Redis. High Availability with Sentinel. https://redis.io/docs/latest/operate/oss_and_stack/management/sentinel/

[37] Redis. Pipelining. https://redis.io/docs/latest/develop/using-commands/pipelining/

[38] Redis. Redis Cluster Specification. https://redis.io/docs/latest/operate/oss_and_stack/reference/cluster-spec/

[39] Redis. CLUSTER KEYSLOT. https://redis.io/docs/latest/commands/cluster-keyslot/

[40] Redis. INFO. https://redis.io/docs/latest/commands/info/

[41] Redis. MEMORY STATS. https://redis.io/docs/latest/commands/memory-stats/

[42] Redis. SLOWLOG. https://redis.io/docs/latest/commands/slowlog/

[43] Redis. Latency Monitoring. https://redis.io/docs/latest/operate/oss_and_stack/management/optimization/latency-monitor/

[44] Redis. Security. https://redis.io/docs/latest/operate/oss_and_stack/management/security/

[45] Redis. Access Control List. https://redis.io/docs/latest/operate/oss_and_stack/management/security/acl/

[46] Redis. TLS. https://redis.io/docs/latest/operate/oss_and_stack/management/security/encryption/

[47] Redis. Client Handling and maxclients. https://redis.io/docs/latest/develop/reference/clients/

[48] Redis. ACL SETUSER. https://redis.io/docs/latest/commands/acl-setuser/
