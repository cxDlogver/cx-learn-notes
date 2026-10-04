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
