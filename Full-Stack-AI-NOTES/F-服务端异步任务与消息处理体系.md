# 服务端异步任务与消息处理体系建立从请求解耦到可靠消费与容量治理的完整认知

服务端异步处理解决的不是“怎样写 async / await”，而是一个系统级问题：**一项业务工作是否必须跟随当前 Request 生命周期完成，以及当工作离开当前请求以后，系统怎样保证它能够被可靠交接、安全领取、正确重复执行、失败恢复并长期稳定运行。**

> **知识边界**：本文只负责异步任务与消息处理这一子系统。Request / Dependency、State / Data、Capacity、Runtime / Deployment 等其他可靠性边界统一由 [服务端可靠性体系](./F-服务端可靠性体系.md) 作为总入口；不要把 Task Reliability 等同于全部 Server Reliability。

因此完整的异步任务体系不能从 Queue、Worker、Retry 等名词平铺展开，而应该沿着问题产生的顺序建立：

~~~text
同步请求职责过重
        ↓
一部分工作需要离开 Request 生命周期
        ↓
异步边界与业务语义
        ↓
任务必须可靠交接和持久化
        ↓
Queue / Job Store / Transactional Outbox
        ↓
Worker 必须安全领取并拥有任务
        ↓
State Machine / ACK / Lease / Claim
        ↓
Crash 与 Redelivery 会带来重复执行
        ↓
At-least-once / Idempotency / Ordering
        ↓
失败需要受控恢复
        ↓
Retry / Backoff / Jitter / Dead Letter
        ↓
生产环境还会出现吞吐与积压问题
        ↓
Backpressure / Scaling / Graceful Shutdown / Observability
~~~

这条链可以进一步压缩成七个阶段：

~~~text
1. 异步边界
   决定什么工作应该离开当前请求

2. 可靠交接
   保证任务离开 Producer 后不会因为进程退出而直接丢失

3. 安全消费
   保证多个 Worker 能协调领取、处理和恢复任务

4. 承载与分发基础设施
   决定使用 Database Job Store、Message Broker 还是 Event Stream，并选择 Pull / Push 等分发方式

5. 重复执行正确性
   接受 Redelivery 可能存在，并通过 Idempotency 保护业务结果

6. 失败恢复
   区分可恢复故障和终止故障，建立 Retry → Dead Letter 闭环

7. 容量与运行治理
   保证 Producer、Queue、Worker 和下游依赖长期保持可控
~~~

理解这七层以后，RabbitMQ、SQS、Cloud Tasks、Redis Streams、Kafka 或 PostgreSQL Job Table 都只是不同实现选择，不再是彼此孤立的技术名词。

这里还要区分 Redis Pub/Sub：它面向当前在线 Subscriber 做即时广播，默认不提供离线历史、ACK、Pending 与 Replay，因此不能直接承担本文所说的 Durable Acceptance Boundary。Redis Pub/Sub 与 Streams 的完整状态模型继续阅读 [Redis 完整知识体系](./R-Redis完整知识体系.md)。

## 1. 异步边界决定一项业务工作是否离开当前 Request 生命周期

### 【Runtime-level Asynchrony 与 System-level Asynchronous Processing 属于不同层级】

异步 I/O（Asynchronous I/O）解决的是：当前进程等待网络、文件或数据库 I/O 时，Runtime 怎样继续推进其他工作。

后台任务（Background Job）解决的是：某项业务工作是否还需要在当前 Request 返回之前完成。

~~~text
Runtime-level Asynchrony
│
├── Event Loop
├── Promise
└── Async I/O
        ↓
当前 Process 等待 I/O 时
怎样继续推进其他工作

System-level Asynchronous Processing
│
├── Task / Event
├── Queue / Job Store
└── Worker
        ↓
业务工作是否需要
脱离当前 Request 生命周期
~~~

例如：

~~~text
Request
↓
await Database Query
↓
Response
~~~

虽然使用了异步 I/O，但数据库查询仍然属于当前 Request。

而：

~~~text
Request
↓
Create Export Task
↓
202 / Job ID
↓
Response

随后

Worker
↓
Generate Export
~~~

才真正把业务完成时间从当前 Request 中拆开。

因此：

~~~text
Async I/O
≠
Background Job
~~~

Node.js Event Loop、异步 I/O、Worker Thread 与 Process 的运行时边界继续阅读 [NodeJS 核心总结](./N-NodeJS核心总结.md)。本文只负责系统级异步任务。

### 【是否异步首先由业务完成语义决定，而不是只看执行时间】

一项工作适合进入后台任务，通常意味着调用方不必在当前请求中立即拿到最终结果，并且系统能够定义后续状态查询、失败处理或通知方式。

可以沿下面的判断链决策：

~~~text
调用方是否必须立即得到最终结果？
        │
        ├── Yes → 优先同步完成
        │
        └── No
             ↓
工作是否可能显著拖长请求、依赖不稳定外部系统，
或适合独立重试 / 限流 / 批处理？
             │
             ├── No → 没有必要为了“异步”强行拆分
             │
             └── Yes
                  ↓
是否能够定义任务状态、失败反馈和最终一致性边界？
                  │
                  └── Yes → 适合进入后台任务体系
~~~

发送通知、生成报表、视频转码、数据导出、批处理等都常见于异步场景，但“耗时长”不是唯一判断标准。把工作移出请求链以后，会引入状态管理、重复执行、故障恢复和可观测性成本，因此异步是一种系统边界取舍，不是默认优化。

### 【Task、Command、Event 与 Schedule 先表达业务语义，再选择传递方式】

先想清楚“要表达什么”，再决定“怎么传”。Task / Command、Event、Schedule 描述的是**业务语义**（你想表达的内容），而 Durable Job Store、Task Queue、Message Broker、Pub/Sub 描述的是**传递/执行方式**（你怎么送达）。两者是正交的：同一种语义可以用不同方式传递，不要一上来就把语义和某个中间件绑定。

| 业务语义 | 表达的含义 | 典型例子 | 常用传递方式 |
| --- | --- | --- | --- |
| Task / Command | “请执行某项工作”（发指令，期待被执行） | GenerateReport、SendEmail、ResizeImage | Task Queue / Durable Job Store，由指定执行者消费 |
| Event | “某个事实已经发生”（只通知，不要求谁处理） | OrderCreated、PaymentSucceeded | Message Broker / Pub/Sub，多个独立 Consumer 各自响应 |
| Schedule | “在何时 / 周期触发工作”（决定触发时机） | 每日报表、定时清理 | 定时器；触发后通常再生成一个 Task/Command 进入 Queue |

关键区分：

- **Task/Command vs Event**：前者是“指令”——有明确的执行目标和预期；后者是“事实”——发布者不在乎谁来处理，多个 Consumer 可基于同一 Event 做各自职责内的事（计费、审计、通知等）。
- **Schedule 不是一种新的消息类型**：它只是“触发器”。被触发后产生的工作，依然会以 Task/Command 的形式进入 Queue / Job Store 去执行，所以 Schedule 与 Queue 不在同一层，不要混为一谈。

~~~text
业务语义（表达什么）
  Task/Command ─┐
  Event        ├─ 通过 ─→ 传递/执行方式（怎么送达，可任意组合）
  Schedule  ───┘            Durable Job Store / Task Queue / Message Broker / Pub/Sub
~~~

Google Cloud 对 Cloud Tasks 与 Pub/Sub 的比较也体现了这层差异：Cloud Tasks 更关注显式任务调用和执行控制，Pub/Sub 更关注把消息交付给解耦 Subscriber。[[1]](https://cloud.google.com/tasks/docs/comp-pub-sub)

### 【Worker Process 与 Worker Thread 解决的不是同一个问题】

Worker Process / Worker Service 是系统中的后台任务执行角色，可以独立部署、独立扩容，并从 Queue / Job Store 获取业务任务。

Worker Thread 是同一个 Process 内的并行执行机制，常用于 CPU-intensive JavaScript 等运行时问题。

~~~text
Worker Service
    ↓
系统级任务消费者
    ↓
内部必要时仍可以使用
Worker Thread
~~~

因此不能因为两者都叫 Worker 就把它们理解成同一个抽象层。

## 2. 可靠交接保证任务离开 Producer 后仍然存在

### 【可靠异步首先要求任务进入 Durable Boundary 后才能承诺已接收】

最脆弱的做法是：

~~~text
Request
↓
把 Task 放入 Process Memory
↓
Response Success
↓
Process Crash
↓
Task 消失
~~~

如果接口已经向调用方承诺“任务已接受”，任务就必须进入一个能够在进程退出后继续恢复的 Durable Boundary（持久化边界）。

这个边界可能是：

~~~text
Database Job Table      （数据库任务表：任务作为一行记录落库，靠事务保证持久化，典型如 outbox 模式）
Message Broker          （消息中间件：发布即写入 Broker 并持久化，如 Kafka / RabbitMQ，再异步投递消费者）
Managed Task Service    （托管任务服务：由云平台托管的任务队列与调度，如 Cloud Tasks、托管的 BullMQ）
Persistent Stream       （持久化流：追加式日志流，如 Kafka topic、Kinesis，消息可持久化并重放）
~~~

AWS 关于异步通信的工程指导同样强调，在返回“已接收、稍后处理”的 acknowledgement 前，应先让对象被可靠持久化，例如数据库写入或进入 Queue。[[2]](https://docs.aws.amazon.com/prescriptive-guidance/latest/modernization-integrating-microservices/asynchronous.html)

所以：

~~~text
Enqueue Function 返回
≠
业务任务已经完成

但如果系统要承诺
“任务已经可靠接收”

至少应先满足
Durable Acceptance Boundary（持久化接收边界 / 可靠接收边界）
~~~

### 【Producer → Broker 与 Broker → Consumer 是两个独立可靠性边界】

使用 Message Broker 时，一条任务会经过：

~~~text
Producer
↓
Publish
↓
Broker 接收并确认
↓
Durable Storage
↓
Deliver / Claim
↓
Consumer
↓
Business Side Effect
↓
ACK / Commit Success
~~~

这里至少存在两个确认问题：

| 边界 | 需要确认什么 |
| --- | --- |
| Producer → Broker | Broker 是否真正接收并承担后续交付责任 |
| Broker → Consumer | Consumer 是否真正完成处理，可以结束本次交付 |

RabbitMQ 把 Publisher Confirms 与 Consumer Acknowledgements 分开定义，就是因为可靠发布与可靠消费属于两个不同阶段。[[3]](https://www.rabbitmq.com/docs/confirms)

因此不能把：

~~~text
publish() 没报错
~~~

直接理解成：

~~~text
任务已经可靠执行完成
~~~

### 【Transactional Outbox 解决数据库状态变化与异步任务产生之间的 Dual Write】

很多业务操作同时需要：

~~~text
① 修改 Database Business State
② 产生一个后续 Task / Event
~~~

如果先提交数据库、再发布消息：

~~~text
Database COMMIT
↓
Process Crash
↓
Message 没有发布
~~~

如果先发布消息、再提交数据库：

~~~text
Message 已被下游看到
↓
Database ROLLBACK
~~~

两种顺序都会产生 Dual Write Problem（双写一致性问题）：一个业务动作跨两个独立系统修改状态，却没有共同原子提交边界。

Transactional Outbox（事务性发件箱）的核心是先把业务状态和“待发送 / 待处理事实”写入同一个本地数据库事务：

~~~text
BEGIN
│
├── Business Data
└── Outbox Record
        ↓
      COMMIT

随后

Outbox Processor
↓
Publish / Execute
↓
Mark Processed
~~~

AWS Transactional Outbox Pattern 同样把业务对象与 Event / Message 放在同一个 Transaction 中保存，用来避免 Database Write 与 Event Notification 之间的 Dual Write 不一致。[[4]](https://docs.aws.amazon.com/prescriptive-guidance/latest/cloud-design-patterns/transactional-outbox.html)

数据库 Transaction 的完整前置知识见 [数据库完整框架体系](./S-数据库完整框架体系.md)。

### 【Outbox 是一致性模式，不是 Queue 产品】

Outbox 解决的是：

~~~text
业务状态变化
+
待异步处理事实
怎样可靠地一起产生
~~~

它并不规定后续必须使用 Kafka、RabbitMQ 或其他 Broker。

Outbox Record（发件箱记录）后续可以通过：

~~~text
Polling Worker        （轮询工作进程：定时扫 Outbox 表，取出尚未发送的已提交记录）
CDC                   （变更数据捕获 Change Data Capture：监听数据库日志，捕获已提交的 Outbox 行）
Broker Publisher      （消息代理发布者：把 Outbox 记录发布到 Kafka / RabbitMQ 等 Broker）
其他 Relay            （其他中继方式：如直连下游 HTTP、写别的存储等转发途径）
~~~

继续处理。

因此：

~~~text
Transactional Outbox
≠
Message Broker
≠
完整异步系统
~~~

它只解决“任务怎样可靠产生”这一段；任务怎样领取、重复执行、失败恢复和扩展，仍然要继续设计。


### 【跨 PostgreSQL 与 Redis 的双写需要治理，但不必机械地使用 Outbox】

双写指一次业务操作修改两个独立状态系统，其中一个成功、另一个失败会形成 Partial Failure。是否需要 Outbox 必须继续判断两份数据的权威关系与一致性时限：

| 场景 | 优先机制 | 为什么 |
| --- | --- | --- |
| DB 权威、Redis 是可重建 Cache | Cache-Aside / Invalidation / TTL / Version | 缓存可能短时陈旧，不要求每次写都传播一条持久事件 |
| Raw Event 成功存库后必须触发后台加工 | 同事务 Outbox / DB Job | API 承诺接受后，待加工任务不能因进程退出而被忘记 |
| 业务状态改变后必须可靠通知异构下游 | Outbox + Relay / Broker + Consumer 幂等 | 保证待通知意图持久，并能最终重试 |
| Session Logout 必须立即阻止旧 Token | 明确在线授权权威 + 同步撤销 / fail-closed | 异步 Outbox 只能最终重试 Redis 删除，不能保证即时撤销 |

如果 Session 在线校验仅信任 Redis，则即便数据库先删除会话行，Redis DEL 失败仍可能让旧 Token 被接受。Outbox 可作为后台修复，**不能把“最终删除”冒充“用户退出立刻生效”**。反之若 PostgreSQL 是权威，也不能允许不经权威失效检查的旧 Redis 缓存继续放行。应从谁有最终判断权、失效时限、错误时拒绝还是回源、审计与清理路径推导方案。见 [会话与访问控制通用文档](./W-Web身份认证会话控制与访问控制体系.md) 和 [Browser Monitor Session 源码](https://github.com/cxDlogver/browser-monitor/blob/main/docs/账号认证Session与CSRF源码实战分析.md)。


## 3. 安全消费通过任务状态、Claim 与 Lease 管理处理所有权

### 【Task State Machine 把异步任务从一条记录变成可恢复生命周期】

可靠任务不能只有“存在 / 不存在”两种状态，而要能够表达当前工作进行到哪里。

通用状态可以抽象为：

~~~text
Queued / Ready
      ↓ claim
Running / Processing
      ↓
  ┌───┴───────────────┐
  │                   │
Success              Failure
  │                   │
  ▼                   ▼
Succeeded        Retryable?
                  │       │
                 Yes      No
                  │       │
                  ▼       ▼
              Backoff   Terminal Failure
                  │
                  ▼
                Ready
~~~

不同系统字段名不同，但核心问题相同：

~~~text
任务现在能不能被领取？
谁正在拥有处理权？
任务什么时候算成功？
失败以后还能不能再执行？
什么时候结束自动处理？
~~~

状态机是 Retry、Crash Recovery、Dead Letter 和 Observability 的共同基础。

### 【ACK 与 Lease 都在回答任务处理所有权什么时候结束】

ACK（Acknowledgement，确认）常见于 Broker：Consumer 完成处理后显式确认，Broker 才结束这次交付；如果连接关闭前没有确认，消息可能重新交付。

Lease / Visibility Timeout（租约 / 可见性超时）常见于 Task Service 或数据库 Job：Worker 领取任务后只在一段时间内拥有处理权，超时未完成则任务重新可领取。

~~~text
Claim Task
↓
Worker 获得临时处理权
↓
Processing
├── Success → ACK / Mark Succeeded → 所有权结束
└── Worker Lost / Timeout
        ↓
   Lease Expired / Redelivery
        ↓
   其他 Worker 可再次处理
~~~

RabbitMQ Work Queue 文档说明，未确认消息在 Consumer 退出后可以重新投递，这正是“处理权没有正常结束 → 重新交付”的典型机制。[[5]](https://www.rabbitmq.com/tutorials/tutorial-two-javascript)

### 【多 Worker 并发消费需要协调领取，而不是让所有 Worker 抢同一任务】

当系统增加多个 Worker：

~~~text
Ready Jobs
   ↓
Claim Coordination
   ↓
Worker A
Worker B
Worker C
~~~

协调至少要保证：

1. 一个 Worker 正在处理的任务不会让其他 Worker 长时间无意义等待；
2. 同一时刻尽量避免多个 Worker 同时拥有同一份处理权；
3. Worker 崩溃后任务最终能够重新进入可处理状态；
4. 并发度不会突破数据库、第三方 API、CPU 或其他下游依赖的承载能力。

不同产品可能使用 Broker Delivery、Partition、Visibility Timeout、Distributed Lease、Database Row Lock 等实现。机制不同，问题相同。


### 【Lease、Renewal 与 Fencing 区分执行权有效期和下游写入资格】

原子 Claim 只能说明**本次哪个 Worker 成功领取任务**。长任务还要解决“原处理者失联怎么办”“旧执行者恢复时是否仍能写入”两个问题：

~~~text
Claim：本次谁有资格开始
   ↓
Lease：失去存活证明以后，这次处理权何时到期
   ↓
Renewal：在 owner 与版本仍有效时周期性延长租约
   ↓
租约过期：允许其他 Worker 取得新执行世代
   ↓
Fencing：下游在实际写入时拒绝失效的旧执行世代
~~~

**Lease 不等于最长任务时长**。30 秒租约、每 10 秒续租可以支撑十分钟的任务，前提是续租在到期前持续成功：

~~~text
 0s  A 领取任务：version=1，lease_until=30s
10s  A 续租成功：lease_until=40s
15s  A 因网络故障或暂停，无法继续续租
40s  旧租约过期
45s  B 合法接管：version=2，开始执行
50s  A 恢复：原先启动的异步请求仍可能完成
~~~

**租约到期不证明旧进程已经死亡。** Renewal 必须核验当前 owner、version 和租约是否仍有效，不能允许 A 在 B 接管后为旧执行世代续租。Fencing 也不是通知旧进程自行退出：必须由真正接受业务结果的数据库或下游系统，在写入点原子校验最新执行世代。

例如任务表已经扩展 lease_version 与 result_ref 字段时，可通过条件 UPDATE 实现一种本地写入保护：

~~~sql
UPDATE jobs
SET status = 'completed', result_ref = $1
WHERE id = $2
  AND status = 'processing'
  AND owner = $3
  AND lease_version = $4
  AND locked_until > now()
RETURNING id;
~~~

只有 RETURNING 得到记录，才说明该 Worker 在当前权威状态下成功提交。若结果存于另一张表或外部服务，版本约束需要移到真正的副作用提交点；先 SELECT 查询版本，再无条件写入仍有 Check-Then-Act 竞态。

**Fencing 与幂等不是同一功能**：Fencing 阻止失效世代写入；幂等阻止合法新执行者对已经成功的相同业务操作重复产生效果。详见[面试问答第三章：Lease、Renewal 与 Fencing](./QA/服务端异步任务、BullMQ与Kafka可靠消费面试问答.md)。

### 【Crash Recovery 说明任务安全领取不等于只执行一次】

考虑下面的时间窗口：

~~~text
Worker Claim
↓
Business Processing 成功
↓
              ← Worker Crash
↓
Mark Succeeded / ACK
~~~

任务的业务 Side Effect 已经发生，但 Queue / Job Store 还不知道它成功。

Lease 过期或 Broker Redelivery 后：

~~~text
同一 Task
↓
再次执行
~~~

因此安全消费的下一层问题不是“怎样彻底避免 Redelivery”，而是“Redelivery 发生时怎样仍然保持业务正确”。

## 4. Database-backed Job Store 与 Message Broker 决定任务如何承载、分发与扩展

前面三章先回答了三个问题：**为什么要异步、任务怎样可靠产生、Worker 怎样安全拥有处理权。** 下一步才进入基础设施选择：这些 Task / Event 到底由业务数据库自己承载，还是交给独立 Message Broker（消息代理）或 Event Streaming Platform（事件流平台）。

这一章不按 Kafka、RabbitMQ、SQS 逐个平铺，而是先建立上位关系：

~~~text
异步工作已经产生
        ↓
需要一个 Durable Delivery Infrastructure
        ↓
任务 / 事件放在哪里？
        │
        ├── Database-backed Job Store
        │      ↓
        │   Database 保存 Task State
        │   Application 实现 Claim / Lease / Retry / Replay 等语义
        │
        └── Message Broker / Stream Platform
               ↓
            独立消息基础设施
               ↓
            再根据消息模型分成
            Queue-oriented
            和
            Log / Stream-oriented
~~~

这里最重要的不是“哪个产品更高级”，而是理解三层问题：

~~~text
第一层：承载在哪里？
Database 还是独立 Broker

第二层：怎样把工作交给 Consumer？
Pull / Long Poll / Broker Delivery / Scheduler Dispatch

第三层：消费的核心对象是什么？
Task State 还是 Event Log + Consumer Position
~~~

把这三层分开以后，Database Job Table、RabbitMQ、SQS、Kafka、Redis Streams 才不会混成一组产品名。

### 【Database-backed Job Store 直接用数据库承载 Durable Task】

Database-backed Job Store（基于数据库的任务存储）把“待执行工作”直接保存成数据库记录。Queue 并不是一个额外产品，而是一张带状态、调度时间、领取者和重试信息的普通表。

最小模型：

~~~text
Producer / API
      ↓
INSERT jobs
      ↓
Database
      ↓
Worker Poll / Claim
      ↓
Processing
      ↓
Succeeded / Retry / Failed
~~~

一个典型任务表：

~~~sql
CREATE TABLE jobs (
  id            BIGSERIAL PRIMARY KEY,
  type          TEXT NOT NULL,
  payload       JSONB NOT NULL,
  status        TEXT NOT NULL DEFAULT 'pending',
  owner         TEXT,
  attempt       INT NOT NULL DEFAULT 0,
  max_attempts  INT NOT NULL DEFAULT 3,
  run_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  locked_until  TIMESTAMPTZ,
  last_error    TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
~~~

它的核心状态是：

~~~text
pending
   ↓ claim
processing
   ├── success → completed
   └── failure
         ├── retry → pending
         └── terminal → failed
~~~

所以 Database-backed Job Store 的本质是：

> **Database Durable Storage + Task State Machine + Concurrency Control。**

#### <u>1. Row Lock、SKIP LOCKED 与 Lease 共同解决多 Worker Claim</u>

多个 Worker 同时查询同一张 Job Table 时，需要避免所有 Worker 等待同一行或同时认为自己拥有同一 Task。PostgreSQL 可以利用 FOR UPDATE SKIP LOCKED：

~~~sql
SELECT id
FROM jobs
WHERE status = 'pending'
  AND run_at <= now()
ORDER BY run_at
LIMIT 100
FOR UPDATE SKIP LOCKED;
~~~

然后在同一事务内把领取结果改成：

~~~text
status = processing
owner = worker-A
locked_until = ...
~~~

PostgreSQL 官方明确指出，SKIP LOCKED 会跳过不能立即取得锁的行；它不适合普通一致性查询，但适合多个 Consumer 访问 queue-like table 时避免锁竞争。[[6]](https://www.postgresql.org/docs/18/sql-select.html)

这里三种机制承担不同职责：

~~~text
Row Lock
↓
避免 Claim 瞬间多个 Worker 同时修改同一候选行

SKIP LOCKED
↓
其他 Worker 不必等待已被领取候选行

Lease / locked_until
↓
Worker Crash 后允许其他 Worker 最终重新领取
~~~

**原子 Claim 的完整含义是条件判断和处理权更新不能分离。** 如果 A、B 都先查询到 pending，再分别无条件标记 processing，两人都有可能启动任务：

~~~text
A：SELECT → pending
B：SELECT → pending
A：UPDATE status=processing
B：UPDATE status=processing
A、B 都开始执行：重复领取
~~~

对于已知任务 ID，可用单条条件更新与 RETURNING 决定是否真正领取成功：

~~~sql
UPDATE jobs
SET status = 'processing', owner = $1
WHERE id = $2 AND status = 'pending'
RETURNING id;
~~~

对于从待办任务池领取下一个任务，可将选择和更新合并到同一事务控制下：

~~~sql
WITH candidate AS (
  SELECT id
  FROM jobs
  WHERE status = 'pending' AND run_at <= now()
  ORDER BY run_at, id
  FOR UPDATE SKIP LOCKED
  LIMIT 1
)
UPDATE jobs AS j
SET status = 'processing',
    owner = $1,
    locked_until = now() + INTERVAL '30 seconds'
FROM candidate
WHERE j.id = candidate.id
RETURNING j.id, j.owner, j.locked_until;
~~~

这个查询一次性取得一个可领取候选、修改持久化处理权、返回成功领取结果。**FOR UPDATE 的行锁在事务结束时释放，并不会替 Worker 持续持锁 30 秒**；后续运行依赖 locked_until 和独立的租约续期、世代隔离机制。SKIP LOCKED 适用于队列型领取，不适用于期待完整一致结果的普通业务查询。[PostgreSQL SELECT 官方说明](https://www.postgresql.org/docs/current/sql-select.html)。具体两 Worker 并发时序与对应 SQL 详见[面试问答第三章：原子 Claim](./QA/服务端异步任务、BullMQ与Kafka可靠消费面试问答.md)。

#### <u>2. Polling 让 Worker 主动决定什么时候继续领取</u>

数据库不会天然知道“哪个 Worker 当前最空闲”。常见模式是 Worker 主动循环：

~~~text
claim()
↓
有任务 → process
↓
处理完成
↓
再次 claim()

没有任务
↓
sleep / delay
↓
再次 claim()
~~~

这种 Short Polling（短轮询）的优点是简单，而且处理快的 Worker 会更早回来再次 Claim，自然领取更多任务；处理慢的 Worker 更晚回来，不需要中央 Scheduler 维护 CPU、内存或 Available Slot。

代价是 Queue 为空时仍然存在 Empty Poll。Poll Interval 越短，任务发现延迟越低，但数据库空查询越多；Interval 越长，数据库压力越低，但任务等待时间增加。

#### <u>3. 数据库可以继续模拟 Offset、Consumer Group 与 Replay，但复杂度会转移到应用</u>

数据库并非只能实现简单 Task Queue。继续增加：

~~~text
events
├── sequence
├── topic
├── partition_key
├── payload
└── created_at

consumer_offsets
├── consumer_group
├── partition
└── next_offset
~~~

Consumer 再按 Offset 查询：

~~~sql
SELECT *
FROM events
WHERE sequence >= :nextOffset
ORDER BY sequence
LIMIT 100;
~~~

就已经有 Persistent Log（持久日志）、Consumer Position（消费者位置）和 Replay（重放）的雏形。

但如果继续增加：

~~~text
Partition
Group Membership
Rebalance
Retention
Replication
Flow Control
Batch Fetch
多 Consumer Group
~~~

系统会逐渐变成“在业务数据库上自己实现消息平台”。

因此正确结论不是：

~~~text
Database 做不到
Kafka 才做得到
~~~

而是：

~~~text
Database
提供 Transaction / Lock / Index / Durable Storage
↓
Application 自己组合消息语义

专业 Broker / Stream Platform
↓
把消息存储、分发、消费协调和运行治理
做成基础设施原生能力
~~~

### 【Message Broker 将消息交付和消费协调从业务数据库中拆出来】

Message Broker（消息代理）把 Producer 与 Consumer 之间的消息持久化、分发、确认和重新交付交给独立基础设施。

基础链路：

~~~text
Producer
   ↓ publish
Broker
   ↓ durable store / route / deliver
Consumer
   ↓ process
ACK / Commit
~~~

Producer 不需要知道具体哪个 Worker 正在运行，Consumer 也不需要直接扫描业务数据库寻找待处理行。

但 Message Broker 内部仍然至少存在两种不同思想：

~~~text
Message Infrastructure
│
├── Queue-oriented
│   │
│   ├── RabbitMQ
│   └── SQS
│   │
│   └── 更强调：
│       这条 Message / Task 是否完成
│
└── Log / Stream-oriented
    │
    ├── Kafka
    └── Redis Streams
        │
        └── 更强调：
            Event 保持在持久流中
            Consumer 自己读到哪里
~~~

因此不能因为都叫“消息中间件”，就把 RabbitMQ 的 Queue / ACK 模型和 Kafka 的 Partition / Offset 模型理解成同一种内部机制。

#### <u>1. Queue-oriented Broker 更自然地承载一次性 Task / Command</u>

如果语义是 SendEmail、GenerateReport、ResizeImage，系统通常最关心“这条任务有没有被处理完成”。

RabbitMQ 的典型模型：

~~~text
Producer
↓
Exchange
↓ Routing
Queue
↓ Delivery
Consumer
↓
ACK
~~~

SQS 更接近：

~~~text
Producer
↓
Queue
↓
Consumer ReceiveMessage
↓
Visibility Timeout
↓
Process
↓
DeleteMessage
~~~

两者实现不同，但都更接近“一项待完成工作”的 Queue 思维。

#### <u>2. Log / Stream-oriented Broker 更自然地承载可以被反复读取的 Event</u>

如果语义是 OrderPaid、UserRegistered、PageViewed、LogProduced，这些事情在发布时已经发生。系统真正需要回答的是：

~~~text
哪些独立下游已经处理到哪里？
是否需要新的下游以后再读取？
是否需要 Replay 历史？
~~~

这时 Persistent Event Log 比“单一 Task Completed 状态”更自然，Kafka 正是这一分支的典型代表。

### 【任务分发方式是承载基础设施之上的第二个维度】

“任务存在哪里”和“任务怎样到 Worker”不是同一个问题。

~~~text
Durable Queue / Store
        ↓
怎样到达 Worker？
        │
        ├── Pull
        │   ├── Short Polling
        │   ├── Long Polling
        │   └── Batch Fetch
        │
        ├── Broker Push / Delivery
        │   └── ACK / Prefetch / Credit 控制投递
        │
        └── Scheduler Dispatch
            └── Heartbeat / Capacity / Resource
                决定具体 Task → Worker
~~~

| 模式 | 谁主动 | Worker 容量如何体现 | 典型实现 |
| --- | --- | --- | --- |
| Short Polling Pull | Worker | 处理完以后再次 Poll | Database Job Table |
| Long Polling Pull | Worker | Receive 请求等待消息到达 | Amazon SQS |
| Batch Fetch Pull | Consumer | Consumer 控制 Fetch / Batch 节奏 | Kafka |
| Broker Push / Delivery | Broker | ACK + Prefetch / Credit 限制未确认消息 | RabbitMQ |
| Scheduler Dispatch | Scheduler | Heartbeat、Slot、CPU / Memory / GPU | 分布式计算 / 资源调度 |

SQS 的 ReceiveMessage 可以通过 WaitTimeSeconds 实现 Long Polling，减少 Queue 为空时的空请求。[[9]](https://docs.aws.amazon.com/AWSSimpleQueueService/latest/APIReference/API_ReceiveMessage.html)

RabbitMQ 注册 Consumer 后由 Broker Delivery，但它通常不是实时读取 Worker CPU 后寻找“最空闲机器”，而是通过 Consumer ACK 和 Prefetch 控制 Consumer 当前允许持有的未确认消息数量。[[10]](https://www.rabbitmq.com/docs/consumer-prefetch)

真正的 Scheduler Dispatch 则会维护 Worker Membership、Heartbeat、Available Slot、资源标签和 Placement，更适合 GPU 训练、分布式计算、构建等异构资源任务。

### 【Kafka 用“持久化分区日志 + Consumer Position”组织 Event Stream】

Kafka 不应该继续平铺成 Topic、Partition、Offset、Consumer Group 一串孤立术语。它们属于同一条因果链：

~~~text
Event 需要长期保留并支持多个独立下游
        ↓
Topic 表示一类 Event Stream
        ↓
单条 Log 无法无限并行
        ↓
Topic 拆成多个 Partition
        ↓
每个 Partition 内用 Offset 标识位置
        ↓
Consumer Group 表示一个逻辑订阅者
        ↓
Group 内 Consumer 分摊 Partition
        ↓
每个 Group 独立保存消费位置
        ↓
形成 Lag、Crash Recovery 与 Replay
~~~

#### <u>1. Topic → Partition → Offset 先解决存储、顺序与并行</u>

Topic（主题）表示一类 Event Stream；Partition（分区）把 Topic 拆成多个可以独立追加和读取的有序日志；Offset（偏移量）表示 Record 在某个 Partition 内的位置。

~~~text
Topic: order-events
│
├── Partition 0
│   0 → 1 → 2 → 3 → ...
│
├── Partition 1
│   0 → 1 → 2 → 3 → ...
│
└── Partition 2
    0 → 1 → 2 → 3 → ...
~~~

Offset 只在单个 Partition 内有意义，不是整个 Topic 的全局编号。

Kafka 只保证 Partition 内顺序，所以 Producer 常把具有顺序要求的业务实体 ID 作为 Message Key：

~~~text
key = orderId = 10001

OrderCreated(10001)
OrderPaid(10001)
OrderShipped(10001)
        ↓
稳定进入同一 Partition
        ↓
保持该订单事件的相对顺序
~~~

Partition 同时决定一个 Consumer Group 的主要并行单位，因此增加 Partition 本质是在扩大可并行处理空间，而不是简单增加一个配置数字。

#### <u>2. Consumer Group 同时实现 Group 间订阅与 Group 内分工</u>

假设 Topic 有三个 Partition：

~~~text
order-events
├── P0
├── P1
└── P2
~~~

库存系统建立：

~~~text
group.id = inventory-group
~~~

并启动三个 Consumer：

~~~text
inventory-group
├── Consumer A ← P0
├── Consumer B ← P1
└── Consumer C ← P2
~~~

同一个 Consumer Group 内，一个 Partition 同一时刻只由该 Group 中一个 Consumer 负责，所以多个 Consumer 是在共同完成**同一个逻辑订阅者**的工作。

再建立 analytics-group、risk-group，并都订阅 order-events：

~~~text
                         order-events
                              │
          ┌───────────────────┼───────────────────┐
          ↓                   ↓                   ↓
 inventory-group       analytics-group        risk-group
       │                    │                    │
   A / B / C              D / E                  F
~~~

这时关系可以压缩成：

~~~text
不同 Consumer Group
=
Publish / Subscribe

同一个 Consumer Group 内多个 Consumer
=
Partition Load Balance
~~~

Kafka 官方把 Consumer Group 作为一个逻辑 Subscriber：同 Group 内实例分摊 Partition，不同 Group 可以各自订阅同一 Topic。[[11]](https://kafka.apache.org/documentation/)

#### <u>3. Offset Commit 把“处理状态”从 Event 转移到 Consumer Group</u>

传统 Queue 更关心：

~~~text
Task
pending
↓
processing
↓
completed / failed
~~~

状态绑定在 Task 本身。

Kafka 中 Event 本身保持不变：

~~~text
Partition 1

104  OrderCreated
105  OrderPaid
106  OrderShipped
~~~

真正变化的是：

~~~text
inventory-group
P1 → 106

analytics-group
P1 → 103
~~~

所以：

~~~text
Commit Offset
≠
Delete Event
~~~

它表达的是：这个 Consumer Group 对这个 Partition 已经推进到哪个位置。

由此自然得到：

~~~text
Crash Recovery
↓
从已提交 Offset 附近继续

Consumer Lag
↓
Log End Offset - Consumer Position

Replay
↓
把 Consumer Position 调回更早位置重新读取
~~~

这也是“传统 Queue 更关心任务做完没有，而 Kafka 更关心 Consumer 读到哪里”的真正工程意义：**Event 的生命周期和每个 Consumer 的处理进度被解耦了。**

#### <u>4. Producer 发布到 Topic，Consumer Group 订阅 Topic</u>

以订单支付事件为例：

~~~text
Order Service
    ↓
publish OrderPaid
    ↓
Topic: order-events
    ↓
Partition 1
Offset 105
    │
    ├──────────────────┬──────────────────┐
    ↓                  ↓                  ↓
inventory-group   analytics-group      risk-group
    ↓                  ↓                  ↓
库存处理            GMV 统计            风控判断
~~~

Producer 发布时只需要 Topic、Key、Value，它不需要知道库存、分析、风控系统是否存在，也不需要知道每个下游有几个 Consumer。

未来增加 recommendation-group 时，只要它订阅相同 Topic；在 Retention 允许的历史范围内，新 Group 可以从需要的位置开始读取，并且不会修改其他 Group 的消费位置。

因此 Kafka 更适合：**一份 Event Stream 会被多个彼此独立的业务下游以不同速度处理，并且需要新增订阅者、Retention、Replay、独立 Lag 和 Partition 级扩展的场景。**

#### <u>5. KafkaJS 的 TypeScript API 将发布订阅链映射到代码</u>

Node.js / TypeScript 可以使用 KafkaJS 观察最小发布链。

Producer：

~~~ts
import { Kafka } from 'kafkajs';

const kafka = new Kafka({
  clientId: 'order-service',
  brokers: ['localhost:9092'],
});

const producer = kafka.producer();

await producer.connect();

const event = {
  type: 'OrderPaid',
  orderId: '10001',
  amount: 299,
};

await producer.send({
  topic: 'order-events',
  messages: [
    {
      key: event.orderId,
      value: JSON.stringify(event),
    },
  ],
});
~~~

对应：

~~~text
producer.send()
↓
Topic = order-events
↓
Message Key = orderId
↓
Partition Selection
↓
Append Record
↓
产生 Partition 内 Offset
~~~

KafkaJS 官方 producer.send() 用于向 Topic 发布 Message；Message Key 会参与 Partition 选择。[[13]](https://kafka.js.org/docs/producing)

Consumer：

~~~ts
const consumer = kafka.consumer({
  groupId: 'inventory-group',
});

await consumer.connect();

await consumer.subscribe({
  topics: ['order-events'],
});

await consumer.run({
  eachMessage: async ({ topic, partition, message }) => {
    if (!message.value) return;

    const event = JSON.parse(message.value.toString());

    await updateInventory(event);

    console.log({
      topic,
      partition,
      offset: message.offset,
    });
  },
});
~~~

对应：

~~~text
kafka.consumer({ groupId })
↓
确定逻辑订阅者

subscribe()
↓
声明订阅 Topic

run()
↓
启动持续消费循环

内部 Batch Fetch
↓
eachMessage()
↓
业务处理
↓
推进 / 提交 Offset
~~~

KafkaJS 的 eachMessage 建立在批量消费机制之上；底层仍由 Consumer 主动 Fetch，只是库封装了持续 Fetch、Heartbeat 与常规 Offset 管理。[[14]](https://kafka.js.org/docs/consuming)

学习可靠消费时，可以关闭自动 Commit：

~~~ts
await consumer.run({
  autoCommit: false,

  eachMessage: async ({ topic, partition, message }) => {
    if (!message.value) return;

    await updateInventory(
      JSON.parse(message.value.toString()),
    );

    await consumer.commitOffsets([
      {
        topic,
        partition,
        offset: (BigInt(message.offset) + 1n).toString(),
      },
    ]);
  },
});
~~~

offset + 1 表示下一次恢复时从下一条开始，但手工 Commit 仍然不能消除：

~~~text
业务数据库写成功
↓
Process Crash
↓
Offset 尚未 Commit
↓
同一 Record 再次处理
~~~

因此 Kafka Consumer 仍然要继续进入下一章的 At-least-once 与 Idempotency。


### 【Redis 的 WATCH、MULTI/EXEC 与 Lua 解决不同范围的并发领取问题】

若用 Redis 自建 Job Queue，最容易误解的是：每条 HSET 命令原子，并不意味着客户端此前的 HGET 检查仍然有效。

~~~text
Worker A：HGET status → pending
Worker B：HGET status → pending
Worker A：HSET status processing → 成功
Worker B：HSET status processing → 也成功
两者可能都启动业务
~~~

**MULTI/EXEC** 在 EXEC 阶段连续执行已排队命令，其他 Redis 客户端命令不会插入；但若读状态发生在 MULTI 前，它不会自动发现检查时的数据已经过期。应考虑两种并发安全实现：

1. **WATCH + MULTI/EXEC：** 先监视任务 Key，再读取状态；若到 EXEC 前其他 Worker 修改该 Key，EXEC 取消本次事务，当前 Worker 必须视为领取失败并重新判断。
2. **Lua Script：** 将状态读取、资格判断、变更以及成功返回放在 Redis 服务端单次执行，中间不允许其他客户端命令穿插。

~~~lua
-- KEYS[1]：任务 Hash；ARGV[1]：当前 Worker ID
if redis.call("HGET", KEYS[1], "status") ~= "pending" then
  return 0
end
redis.call("HSET", KEYS[1], "status", "processing", "owner", ARGV[1])
return 1
~~~

例如用 EVAL 将 task:1 传入 KEYS[1]，worker-A 传入 ARGV[1]：

~~~redis
EVAL "if redis.call('HGET',KEYS[1],'status') ~= 'pending' then return 0 end redis.call('HSET',KEYS[1],'status','processing','owner',ARGV[1]); return 1" 1 task:1 worker-A
~~~

客户端只有收到 1 才能执行业务。**原子执行／隔离执行并不等于运行时错误自动回滚**：Redis 的 MULTI/EXEC 与 Lua 都不提供传统 SQL 事务意义上的通用运行时错误回滚；Pipeline 只是批量发命令、减少网络往返，也不是上述事务保护。参考 [Redis Transactions](https://redis.io/docs/latest/develop/using-commands/transactions/)、[Redis Lua Scripting](https://redis.io/docs/latest/develop/programmability/eval-intro/)。更多竞争时间线见[面试问答第三章：Redis 原子条件转换](./QA/服务端异步任务、BullMQ与Kafka可靠消费面试问答.md)。

### 【KafkaJS 将读取、处理、已解决位点与真正提交拆成四个动作】

KafkaJS 即使使用 eachMessage，也可能先从 Broker 批量 Fetch 多条 Record，只是库会在**同一个 Partition 内**依次 await 开发者提供的回调；不同 Partition 可设置独立的回调并发：

~~~text
Fetch：[Offset 100=A, 101=B, 102=C]
       ↓
eachMessage(A) → await 业务成功 → 已解决 100
       ↓
eachMessage(B) → await 业务成功 → 已解决 101
       ↓
eachMessage(C) → await 业务成功 → 已解决 102
       ↓
满足自动提交条件时 Commit 103
~~~

需要区分两个状态：**Resolved Offset** 是客户端已确认业务回调成功后的处理进度；**Committed Offset** 是 Broker 上保存的、供当前 Group 恢复用的下一条记录位置。两者不必在每一时刻都相等。

KafkaJS 的 autoCommit 默认启用，通常在成功处理批次之后提交进度；还可以通过 autoCommitInterval（经过设定时间且到达相应检查点）或 autoCommitThreshold（累计完成设定数量）触发中途提交。比如阈值为 2、此前 committed offset 为 100：

~~~text
A/100 成功：已解决到 100，未必立即提交
B/101 成功：达到阈值 2，可提交下一位置 102
C/102 成功：批次结束，可提交下一位置 103
~~~

**autoCommit 不是周期性无条件地把 Fetch Position 当作已成功位置提交。** 业务回调必须 await 真正完成的数据库写入；若仅 fire-and-forget 后立即 return，客户端可能错误地把未完成业务视为完成。

需要精确选择提交时机时，可关闭自动提交，等业务结果落库成功以后手动提交当前 Offset + 1：

~~~ts
await consumer.run({
  autoCommit: false,
  eachMessage: async ({ topic, partition, message }) => {
    await saveIdempotently(message);
    await consumer.commitOffsets([{
      topic,
      partition,
      offset: (BigInt(message.offset) + 1n).toString(),
    }]);
  },
});
~~~

这里 BigInt 避免大型 Offset 超出 JavaScript 安全整数范围。**手动提交不是任务执行 API**，而是覆盖 Consumer Group 在 Topic-Partition 上的恢复位置；开发者可以设置提交值，但 Kafka 不会检查你的 PostgreSQL 是否真正完成，因此提交过早可能跳过未完成业务。

### 【eachBatch 允许应用控制批内执行与进度标记，但必须维护连续完成前缀】

eachMessage 主要让开发者编写“收到一条消息怎样处理”；eachBatch 将来自一个 Topic-Partition 的 Batch 和一组进度／状态函数交给应用决定循环、暂停及处理方式：

| 批次函数 | 负责什么 | 不能误认为 |
| --- | --- | --- |
| batch.messages | 当前批次的记录 | 整个 Topic 的全部消息 |
| resolveOffset(offset) | 在 KafkaJS 内部标记该 Record 已处理 | 立即向 Broker Commit |
| commitOffsetsIfNecessary() | 按 autoCommitInterval / Threshold 检查是否应提交 | 每次调用都一定发 OffsetCommit |
| heartbeat() | 维持 Consumer Group 成员资格 | 证明数据库业务已完成 |
| isRunning() / isStale() | 帮助停止当前消费或丢弃因 seek 等操作失效的 Batch | 下游数据库的 Fencing Token |

~~~ts
await consumer.run({
  autoCommit: true,
  eachBatchAutoResolve: false,
  eachBatch: async ({ batch, resolveOffset, heartbeat, commitOffsetsIfNecessary, isRunning, isStale }) => {
    for (const message of batch.messages) {
      if (!isRunning() || isStale()) break;
      await saveIdempotently(message);
      resolveOffset(message.offset);
      await heartbeat();
      await commitOffsetsIfNecessary();
    }
  },
});
~~~

设置 eachBatchAutoResolve=false，是为了避免批次回调正常返回时自动把末尾记录视为已解决，应用才能明确控制部分成功的进度。开发者还可以自行以 Promise.all 并发一批彼此独立的消息，但**并发完成顺序不一定等于分区日志顺序**，而且 Promise.all 某项失败不会自动取消其余已启动的 I/O。

例如同一 Partition 的 Offset 100、102 已处理成功、101 失败，当前最多安全提交 101（100 之后的下一位置）；**不能提交 103**，否则重启后会跳过 101。这里的“已完成连续前缀”是应用并发策略必须维护的条件，不是把最后完成的记录直接提交。一个 Consumer 可以配置 partitionsConsumedConcurrently 同时处理多个**不同 Partition**，每个 Partition 的 Offset 独立核算；这不是一个 Partition 自动并行的意思。

参考 [KafkaJS Consuming](https://kafka.js.org/docs/consuming)。可运行 Producer/Consumer、手动提交、批次并行和故障时间线见[面试问答第七章：KafkaJS 的读取、提交与并发](./QA/服务端异步任务、BullMQ与Kafka可靠消费面试问答.md)。

### 【BullMQ 把 Job 调度与业务 Workflow 分开，Worker 不一定需要调用 Agent】

Node.js 后台任务的职责链应先区分三层：Producer 接收并交接 Job，Queue Backend 保存调度与重试状态，Worker 领取并执行 Processor。Processor 可以调用普通函数、固定 Workflow、LLM Tool Chain，或确实需要自主决策时才使用 Agent。把一个固定的“解析文档 → 提取信息 → 生成报告 → 校验结果”称为 LLM Workflow 往往比称为 Agent 更准确。

~~~text
POST /analysis-tasks
      ↓
API：创建业务 task_id，完成身份和输入校验
      ↓ Queue.add("analyze", { taskId, documentId })
Job Store：保存等待 Job、重试参数、锁与状态
      ↓
Worker：取得 Job 并调用 Processor
      ↓
固定 Workflow：parse → extract → generate → validate
      ↓
Database / Object Storage：保存报告与业务任务终态
      ↓
GET /analysis-tasks/{id}：前端查询持久状态
~~~

以传统 Redis Backend 的 BullMQ 为例：

~~~ts
import { Queue, Worker } from "bullmq";
const connection = { host: "127.0.0.1", port: 6379 };

const queue = new Queue("document-analysis", { connection });
const job = await queue.add(
  "analyze",
  { taskId: "task-1001", documentId: "doc-1001" },
  { jobId: "task-1001", attempts: 3,
    backoff: { type: "exponential", delay: 1000 } },
);
// API 返回 HTTP 202 / taskId，而不是等待 Worker 完成

const worker = new Worker(
  "document-analysis",
  async job => {
    const report = await runFixedAnalysisWorkflow(job.data.documentId);
    await saveReportIdempotently(job.data.taskId, report);
    return { saved: true };
  },
  { connection, concurrency: 2 },
);
~~~

Queue.add 只代表 Job 已被提交给队列，执行过程由 Worker 开始；处理函数正常返回时可进入 completed，抛异常则按 attempts/backoff 重试或进入 failed。多个 Worker 进程可竞争同一 Queue，而 Worker 的 concurrency 控制该实例内同时处理 Job 的数量。对模型调用等 I/O 工作可提升并发；CPU 密集型工作还应考虑隔离进程或线程。Job 领取和锁续租避免正常情况下并发重复处理，但 Worker 处理已产生副作用后、确认完成前崩溃，仍可能重新执行：必须用业务 taskId、唯一键、阶段产物对账保护最终结果。

**版本边界：** BullMQ 的默认、较成熟的 Backend 是 Redis，但当前官方文档也提供可选 PostgreSQL Backend（需核对实际使用版本与功能支持）。不要写成“BullMQ 在任何版本下必须依赖 Redis”。这里的对比聚焦最常见的 Redis Backend；使用 PostgreSQL Backend 也不自动意味着业务双写语义无需设计。

参考：[BullMQ Workers](https://docs.bullmq.io/guide/workers)、[Retrying failing jobs](https://docs.bullmq.io/guide/retrying-failing-jobs)、[Stalled Jobs](https://docs.bullmq.io/guide/workers/stalled-jobs)、[PostgreSQL backend](https://docs.bullmq.io/guide/postgresql)。

### 【BullMQ 默认 Redis 后端用多种状态索引完成领取、延迟和优先级调度】

BullMQ 的 Job 内容与“下一项应该领取谁”并不靠一个 status 字段完成。默认 Redis Backend 中常见的内部结构包括：

| 职责 | 典型 Redis 结构 | 表达什么 |
| --- | --- | --- |
| Job 数据 | Hash | Job ID、输入、选项、执行元信息 |
| 普通等待任务 | wait List | 未设置显式正数 priority 的可领取任务 |
| 正数优先级 | prioritized Sorted Set | 数值越小优先级越高，相同优先级遵循 FIFO 规则 |
| 定时就绪 | delayed Sorted Set | 按将来到期时间组织尚未到期的 Job |
| 进行中与终态 | active List；completed、failed 等有序集合 | Job 的调度归属和终态索引 |
| 当前执行权 | 带 TTL 的 Job Lock | 防止正常情况下其他 Worker 同时完成此 Job |

一个容易误答的规则是：**priority=0 代表未设置显式优先级，在 BullMQ 的该调度规则中会先于 positive priority 的 Job 被领取**；对正数优先级，1 比 5 更先被选择，但不会中断当前正在运行的 Job。Job ID 不是任务出队先后顺序。延迟任务到期意味着进入可领取状态，不意味着指定毫秒必然执行。

~~~text
Queue.add() 保存 Job 和调度索引
           ↓
Worker 请求下一项
           ↓
BullMQ 内部 Lua 原子执行状态转换
           ├─ 提升已到期 delayed Job
           ├─ 先考虑普通 wait Job
           ├─ 没有普通任务时从 prioritized 中取优先任务
           └─ 进入 active，设置本次处理锁
           ↓
Processor 正常返回 → 尝试标记 completed
Processor 抛错     → 根据 attempts/backoff 重试或进入 failed
~~~

内部 Lua 解决领取瞬间的一致性，**不能保证长任务执行中的外部副作用只发生一次**。Worker 周期性续锁；锁失效后 stalled 检测可能将任务重新调度，旧处理代码却可能仍在运行。应用若 catch 业务异常后正常 return，框架会把它当作成功处理；应正确抛出需重试的错误。

Job ID 的队列内去重通常依赖相应 Job 仍被保留，不等同于稳定业务操作的永久幂等键。官方资料：[BullMQ Prioritized](https://docs.bullmq.io/guide/jobs/prioritized)、[Delayed](https://docs.bullmq.io/guide/jobs/delayed)、[Stalled Jobs](https://docs.bullmq.io/guide/workers/stalled-jobs)。完整存储结构、出队优先级与 Lua 调用顺序见[面试问答第四章：BullMQ 调度与可靠执行](./QA/服务端异步任务、BullMQ与Kafka可靠消费面试问答.md)。

### 【Redis 内的队列任务是共享状态，是否能重启恢复取决于 Persistence 与存储部署】

API Process、Worker Process 和 Redis Server 是不同的运行实体。API 或 Worker 停止，不会自动抹除已经写进独立 Redis Server 的 Job；Redis 自身断电、磁盘卷丢失或 Key 被淘汰时，则是另一类问题。

| 事件 | 对 Job 的影响 |
| --- | --- |
| API Process 退出 | 已经成功写入 Redis 的 Job 仍可由其他 Worker 消费 |
| Worker Process 崩溃 | active Job 可能因锁失效进入 stalled 并被重新调度；不是严格一次执行 |
| Redis 正常重启，文件与卷保留 | 可从有效 RDB/AOF 恢复已持久化状态 |
| Redis 突然断电 | 可能丢失最近尚未持久化的一段变更 |
| Redis 无持久化或永久卷被删除 | 队列历史可能不可恢复 |
| Redis maxmemory 任意淘汰队列 Key | 可能破坏 Job 数据与调度索引，不应把任务队列视为普通易失 Cache |
| Job 主动删除、自动清理或过期 | 对应数据可能按业务配置消失，与系统崩溃无关 |

Redis 以内存保存工作集，但提供 RDB（定期 Snapshot）、AOF（追加写命令并在重启时重放）以及组合方案。AOF 的 appendfsync everysec 平衡性能和持久性，却仍可能在故障时损失最近尚未 fsync 的数据；appendfsync always 刷盘更积极，成本更高。Redis 命令已经返回、AOF 已追加、操作系统已经 fsync、其他副本已经收到，是不同的确认边界，不能合并称作“完全持久化”。

~~~ini
appendonly yes
appendfsync everysec
maxmemory-policy noeviction
~~~

这些只是典型配置：还需要保存 AOF 的持久化数据卷、内存与磁盘容量治理、备份和恢复演练。BullMQ 官方建议 AOF 和 noeviction，并区别 Producer 的快速失败与 Worker 的自动重连策略。Redis 的 Replication 可以提高故障可用性，却不等于无损备份；自动 Failover 也可能存在复制延迟。Job 写入成功 ≠ 已执行业务成功 ≠ 在所有故障下绝不丢失。

参考：[Redis Persistence](https://redis.io/docs/latest/operate/oss_and_stack/management/persistence/)、[BullMQ Going to production](https://docs.bullmq.io/guide/going-to-production)。

### 【PostgreSQL Job Table 与 BullMQ 的区别在于谁实现调度和恢复机制】

Database-backed Job Store 将 Job 作为一条 PostgreSQL 记录，应用 Worker 自己实现 Poll、Claim、Lease、Retry、Dead Letter；BullMQ 以库和 Backend 提供任务状态机、Worker 消费、失败重试等能力。二者都需要业务级幂等。

| 对比维度 | PostgreSQL Job Table | BullMQ 默认 Redis Backend |
| --- | --- | --- |
| 数据位置 | PostgreSQL Row / WAL | Redis Key 与数据结构 / RDB / AOF |
| 业务事实同库事务 | 可直接一次事务写入业务行和 Job | PostgreSQL + Redis 是两个独立系统，存在双写窗口 |
| Worker 领取 | 行锁、FOR UPDATE SKIP LOCKED、状态字段 | 内置领取、锁、续租和 stalled 检测 |
| 失败重试 | 应用设计 attempts、available_at、Dead Letter | 库内置 attempts、backoff 与失败状态 |
| 核心成本 | 数据库轮询/索引压力，自行维护 Claim/Lease | Redis 运维、队列存储与连接、跨存储边界 |
| 适用倾向 | 任务与关系数据紧密耦合、任务规模可控 | 异构任务和调度需求增多，需要复用队列工具 |

**不能用“Redis 不持久、PostgreSQL 持久”选择方案。** 应比较实际持久化策略、数据语义、运行成本、吞吐与故障恢复。Worker 在两种模式下都可能重复执行外部副作用。

### 【Raw Event 与 Job State 可以单表合并，也可以双表分离，还可以用引用减少冗余】

每一条监控事件包含两类不同信息：Raw Event 表达已发生的业务事实；Job State 表达它是否已被后台投影，谁持有处理权，何时重试。

**单表：** telemetry_jobs 同时保存 event JSONB、status、attempts、available_at、locked_at 等。API 只写一行，Worker 直接更新该行。无需为一个业务事实额外写 Outbox；适合 Raw Payload 只作为一次处理输入、且任务和原始数据查询生命周期可以合并的系统。但时序范围查询、历史压缩、任务状态频繁更新、失败任务延长保留会争用一张表的索引和物理生命周期。

**双表并复制 Payload：** telemetry_events 是时序事实表，outbox_tasks 另保存相同 event JSONB 和任务状态。两张表同事务写入，任务无需回表即可投影；代价是 JSON 重复和写入量更高。两张表可分别配置读写索引、清理时间与权限。

**双表但 Outbox 只保存 Reference：** telemetry_events 保存 Payload；outbox_tasks 保存 project_id / event_id / occurred_at 等定位键及 Job 状态。它减少内容冗余，但每次领取任务需要额外回表，并要求原始事件在所有相关任务完成、人工处理或永久失败前不能被保留策略清除。

~~~text
选择前先回答：
原始事件处理成功后是否仍需检索、统计、审计与重放？
原始事件与 Job 的清理时间、索引和更新频率是否相同？
是否允许 Worker 每次回表读取 Raw Payload？
失败任务是否可能留存得比原始事件更久？
业务事实与待处理任务必须以何种事务语义一起产生？
~~~

没有所谓“必须两张表”的规则。当前 Browser Monitor 对 Raw Event 提供明细查询、连续聚合和独立 30 天保留，对已完成 Outbox 另有更短清理策略，所以不能只删除 Raw 表而不改所有业务接口与数据治理。项目证据见 [Browser Monitor 异步任务专项](https://github.com/cxDlogver/browser-monitor/blob/main/docs/异步任务与Worker可靠消费体系源码学习.md)。


### 【Kafka Topic 由 Broker 自己持久化为 Partition Log，而不是存入 Redis 或 PostgreSQL】

Kafka Producer 将消息追加到 Kafka Broker 管理的分区日志中；一个 Topic 分为多个 Partition，各有独立递增 Offset 和日志段文件（Log Segment、Offset Index、Time Index 等），由 Kafka 自己管理磁盘、复制和保留策略。默认将数据存到 Broker 的本地持久化目录；若明确启用并配置 Tiered Storage，旧 Segment 可以转到外部存储。Page Cache 与内存提高吞吐，但消息日志不是仅存在 Kafka 进程堆内存。Kafka 的 KRaft 元数据管理与存放业务 Partition Log 的职责也不同。

~~~text
Producer
   ↓ topic=telemetry-events
Kafka Broker Cluster
   ├─ Partition 0：offset 0 → 1 → 2 → ...
   ├─ Partition 1：offset 0 → 1 → 2 → ...
   └─ 副本 Replica / Log Segment / Retention
          ├─ Consumer Group A：性能投影
          ├─ Consumer Group B：异常分析
          └─ Consumer Group C：原始事件归档
~~~

Offset 只在对应 Partition 内有意义。多个 Group 可以独立处理同一批消息，一个 Group 已读完并不删除其他 Group 仍可能消费的消息；删除由 retention.ms、retention.bytes、log compaction 等保留策略决定。Broker 进程重启而日志卷仍可读取时，可恢复记录；实际故障保证还依赖副本数、acks、min.insync.replicas、备份与存储系统。Kafka 的优势是一个可多次读取的持久事件日志，不是自动完成每条 Job 内部步骤。

参考：[Apache Kafka Design](https://kafka.apache.org/41/design/design/)、[Kafka Tiered Storage](https://kafka.apache.org/41/operations/tiered-storage/)。

### 【Kafka 可以持久化不同 Consumer Group 的 Offset，但不自动保存业务 Step 状态】

经典 Consumer Group 使用组名区分独立消费进度；每个组对每个 Topic Partition 有自己的 Committed Offset：

~~~text
Group performance + telemetry-events + Partition 0 → next offset 120
Group performance + telemetry-events + Partition 1 → next offset 80

Group error       + telemetry-events + Partition 0 → next offset 95
Group error       + telemetry-events + Partition 1 → next offset 70
~~~

经典 Consumer Group 的 Group Coordinator 将 Offset Commit 记录写入 Kafka 内部 Compact Topic：__consumer_offsets。这是 Broker 自身管理和持久化的进度，不需要另建 Redis / PostgreSQL 来保存。提交 Offset 5 的含义是下次从第 5 条读取（如 0～4 业务已处理完成）。同一 Group 内不同 Consumer Instance 分担 Partition，Rebalance 后新实例继承组在分区上的已提交位置，而非继承旧实例本地内存位置。

要区分四个层级：

| 层级 | 含义 | 谁持有 |
| --- | --- | --- |
| Record Offset | 消息在某个 Partition 中的持久位置 | Kafka Log |
| Current Position | 当前实例 Fetch 到哪里，可能领先业务处理 | Consumer 内存 |
| Committed Offset | 重启/分区重新分配后从哪里读 | Group Coordinator + __consumer_offsets |
| Task Checkpoint | 一条消息内部解析、调用模型、存报告进行到哪一步 | 应用数据库或专门状态存储 |

Committed Offset 不是永久存储，长期不活跃组可能按保留策略过期；源 Topic 自身消息也可能因 retention 删除。恢复是否成功需同时看位点与原始消息是否存在。消费实例正在运行的任务位置，更不能仅凭已提交水位判断。

参考：[Kafka Consumer Offset Tracking](https://kafka.apache.org/41/implementation/distribution/)、[KafkaConsumer commitSync](https://kafka.apache.org/41/javadoc/org/apache/kafka/clients/consumer/KafkaConsumer.html)。

### 【Kafka 心跳、Rebalance 与 Offset 恢复只接管分区，不接管旧代码的执行现场】

Kafka 常规 Consumer Group 中，稳定状态下一个 Partition 被分配给组内一个 Consumer。Consumer 向 Group Coordinator 发送 Heartbeat 维护成员资格；失联超时后，协调机制通过 Rebalance 调整 Partition 归属，接管者从该组提交的 Offset 恢复。

~~~text
Consumer A 负责 Partition 0 / Offset 100
     ↓
A 调用外部 LLM，尚未提交 Offset 101
     ↓
A 网络中断，Kafka 心跳无法成功
     ↓
Session Timeout → Group 撤销 A 的成员资格
     ↓
Rebalance → Partition 0 交给 Consumer B
     ↓
B 从 Committed Offset 100 重新读取并执行
     ↓
A 网络恢复：旧 LLM 请求可能已返回
     ↓
A 与 B 可能同时尝试向外部数据库写入
~~~

这里要区分**进程状态、分区归属和业务副作用**：

1. 短暂断联但尚未改变分配时，A 仍可能恢复原分区的正常消费。
2. A 已被移出 Group 时，**旧分配**的 Offset Commit 可能失败；如果 A 恢复并重新加入 Group，则必须按新分配重新取得合法消费资格，可能仍被分到同一 Partition。
3. 旧代码中已经启动的 Promise、线程任务、HTTP/LLM 请求不会被 Kafka 自动杀死。即使它已不能合法提交旧位点，数据库若不检查业务处理权仍可能接受结果。
4. 真正崩溃退出的原进程不会继续运行原先的函数；恢复来自新的 Consumer 实例重读消息，而不是恢复内存执行栈。

**Heartbeat 不是逐消息 Job Lease。** Kafka 判定的是组成员是否有效，分配单位是 Partition；BullMQ 的 Lease/Lock 以单项 Job 为边界。Kafka Java Consumer 的 max.poll.interval.ms 还限制两次 poll 之间的最长间隔，它不能被直接当作 KafkaJS 的相同配置；采用不同 Consumer Rebalance 协议时 Session Timeout 和心跳参数的归属也可能不同。[Kafka Consumer Configs](https://kafka.apache.org/42/configuration/consumer-configs/)。

恢复正确性仍靠应用：失去分区后停止启动新工作，尽可能取消可取消请求，并以稳定 eventId/operationId 保护重复业务效果；严格写入资格还应让下游原子校验当前业务版本或 Fencing Token。见[面试问答第六章：失联 Consumer 恢复后旧业务是否仍有效](./QA/服务端异步任务、BullMQ与Kafka可靠消费面试问答.md)。

### 【Kafka 重读消息只恢复消费边界，长任务需要业务 Checkpoint 续跑】

假设 offset 100 对应文档分析 Task T，内部步骤是：①解析文档 ②提取信息 ③调用 LLM ④保存报告。Consumer 在完成步骤 ②、调用 LLM 时崩溃，Kafka 若未提交 offset 101，则可能从 offset 100 重新消费，但无法自动知道步骤 ①②已完成。

业务可以建立持久检查点：

~~~sql
CREATE TABLE analysis_tasks (
  task_id UUID PRIMARY KEY,
  status TEXT NOT NULL,
  current_step TEXT,
  checkpoint JSONB NOT NULL DEFAULT '{}'::jsonb,
  result_ref TEXT,
  attempt_count INT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
~~~

~~~json
{
  "status": "RUNNING",
  "current_step": "generate_report",
  "checkpoint": {
    "parse": { "status": "COMPLETED", "resultRef": "parsed/doc-1001" },
    "extract": { "status": "COMPLETED", "resultRef": "facts/doc-1001" },
    "generate": { "status": "RUNNING" }
  }
}
~~~

重启顺序：

~~~text
Consumer 接管 Partition → 重读 Offset 100
    ↓
根据 task_id 查业务任务
    ↓
若 SUCCEEDED：幂等跳过
否则读取 Checkpoint，核实中间产物真正持久且仍可用
    ↓
跳过可确认完成的步骤，从不确定步骤恢复/对账
    ↓
先持久化最终业务结果及终态
    ↓
在正确分区上提交 Offset 101
~~~

单有 Checkpoint 不足以保证绝对只执行一次。**模型调用已成功，但 Worker 在保存返回结果前崩溃**，下次仍可能再次调用；需要外部幂等键、operation ID、结果对账，无法查询时要接受重复费用的可能。若业务结果已经提交但 Offset 还未提交，下次必须识别完成任务并直接跳过副作用。若业务未完成却先提交 Offset，就可能永久跳过任务。

| 时刻 | Kafka 恢复行为 | 业务应对 |
| --- | --- | --- |
| Fetch 后、执行业务前崩溃 | 从上次 Committed Offset 重读 | 重新开始 |
| Step 1、2 产物与 Checkpoint 已持久化 | 重读原 Job | 核实结果、跳过已完成步骤 |
| 外部服务成功但本地 Checkpoint 还没写 | 重读 Job | 查询外部结果，否则可能重复 |
| 写入业务终态成功、Offset Commit 失败 | 重读 Job | SUCCEEDED 幂等跳过 |
| Offset 已 Commit、业务尚未成功 | 不会自动重读该记录 | 数据丢失风险，应避免 |

**分区位点提交必须维护连续完成前缀。** Offset 10 未完成，不能因并发处理的 11、12 已成功，就提交 13；否则 10 会被跳过。处理持续数分钟时还要管理 poll、max.poll.interval、Rebalance、分区所有权和任务执行服务的分离，避免长任务卡住消费者心跳/轮询。Kafka 为异步事件传输而设计，业务长任务未必适合始终占着同一个 Consumer 消费调用栈；可以先可靠入库 Job，然后确认 Kafka Offset，让独立 Worker 执行。

Kafka 的 Exactly-once 事务语义能够覆盖 Kafka 输入位点与 Kafka 输出 Topic 的事务性写入（Kafka Streams 还组织状态恢复），**不自动覆盖外部 PostgreSQL、对象存储或 LLM API 的副作用**。跨系统仍需幂等键、Inbox/Checkpoint、结果校验与必要补偿。参考：[Kafka Delivery Semantics](https://kafka.apache.org/41/design/design/)、[Kafka Streams Core Concepts](https://kafka.apache.org/41/documentation/streams/core-concepts/)。


### 【Database Job Store、RabbitMQ、SQS、Kafka 应从工作语义和消费模型选择】

| 方案 | 核心抽象 | 典型分发 | 强项 | 更自然的场景 |
| --- | --- | --- | --- | --- |
| Database Job Store | Task Row + State | Poll / Claim | 本地事务简单、组件少 | 后台 Job、与业务 DB 强关联 |
| RabbitMQ | Queue + Exchange | Broker Delivery + ACK / Prefetch | Routing、Work Queue | 业务任务、复杂路由 |
| SQS | Managed Queue | Long Poll + Visibility Timeout | 托管 Queue、部署治理简单 | 云上后台任务 |
| Redis Streams | Stream + Consumer Group | Blocking Read / Claim / ACK | 已有 Redis 时的轻量流式消费 | 中等规模 Stream / Worker |
| Kafka | Partitioned Event Log | Batch Fetch + Consumer Group | 多订阅者、Retention、Replay、高吞吐 | Event Pipeline、CDC、日志、多个独立下游 |

演进判断：

~~~text
现在解决的是一次性 Task
还是长期复用的 Event Stream？
        ↓
是否需要多个独立 Consumer Group？
        ↓
是否需要 Retention / Replay？
        ↓
是否需要 Partition 级高吞吐并行？
        ↓
Database Polling / Queue State Update
是否已经成为真实热点？
        ↓
再决定是否从 Database Job Store
演进到专业 Broker / Stream Platform
~~~

如果业务状态写库和 Broker Publish 同时发生，即使最终引入 Kafka / RabbitMQ，Producer 侧仍可能继续保留 Transactional Outbox：

~~~text
Business Transaction
├── Business Data
└── Outbox Event
↓
COMMIT
↓
Relay / CDC
↓
Broker
~~~

因此 Outbox 与 Broker 不是互斥替代关系：**Outbox 解决 Database → Broker 的可靠交接，Broker 解决 Message / Event → Consumers 的可靠分发。**

## 5. 重复执行正确性依靠 Delivery Semantics 与 Idempotency 共同建立

### 【消息交付语义与业务 Side Effect（副作用）的执行语义必须分层】

常见 Delivery Semantics（交付语义）有三种，它们**只描述「消息系统」这一层如何投递**，并不保证业务副作用只发生一次：

| 语义 | 直观含义 | 主要风险 |
| --- | --- | --- |
| At-most-once（最多一次） | 最多投递一次，发送失败就直接丢弃，不再重试 | Lost Work（工作丢失） |
| At-least-once（至少一次） | 至少尝试投递一次，失败会重试，可能多次送达 | Duplicate Processing（重复处理） |
| Exactly-once Capability（精确一次能力） | 某些系统在「特定边界内」提供一次性处理能力 | 不能自动外推到所有外部 Side Effect（副作用） |

逐条展开，看清每种语义下风险到底是怎么产生的：

- **At-most-once（最多一次）**：生产者发出后若 ack 丢失、或 Broker 在持久化前宕机，这条消息就直接被丢弃，且不再重试。后果是任务**可能永远不执行（Lost Work）**。它适合「丢了也无所谓」的场景，例如指标打点、非关键日志；但绝不能用在扣款、发券这类不能丢失的业务上。

- **At-least-once（至少一次）**：Broker 先持久化再向生产者确认，消费者处理完后回 ack；若消费者在「处理成功」与「回 ack」之间崩溃，Broker 会认为没收到确认而重新投递，于是**同一条消息被处理了多次（Duplicate Processing）**。这是 Kafka / RabbitMQ 等绝大多数 Broker 的默认（也是唯一能在不加分布式事务前提下稳定实现）的语义。

- **Exactly-once Capability（精确一次能力）**：以 Kafka 为例，靠「幂等生产者 + 事务 + 流处理事务」做到在 **Kafka 自己管辖的边界内**读—处理—写是原子的，对外表现为「恰好一次」。但关键点在于——这个边界**只覆盖 Broker 拥有事务的那一段**；一旦你的处理逻辑要写另一个数据库、调支付网关、发邮件，这个保证就**到此为止**，因为 Broker 无法跨系统协调提交。

  场景：用户注册后，发一封欢迎邮件。

  - **情况一（在边界内）**：处理逻辑是「从 `user-registered` 主题读 → 往 `email-queued` 主题写」。这两步都在 Kafka 里，Kafka 可以把它们放进**同一个事务**。中途崩溃，Kafka 把读和写一起回滚，事件既不丢也不重，看起来就是「恰好一次」。

  - **情况二（出了边界）**：处理逻辑改成「从 `user-registered` 主题读 → **调用外部邮件 API 发信**」。这时候「发邮件」这一步已经不在 Kafka 的事务里了，因为 Kafka 管不了别人的系统。于是两种尴尬都会发生：
    - 先提交了 Kafka 事务（不会再重投），再去调邮件 API，结果 API 调完、记录「已发」前崩溃 → 重启后 Kafka 不重投 → **邮件永远没发出（丢失）**；
    - 先调邮件 API 且成功了，但提交 Kafka 事务前崩溃 → 重启后 Kafka 重投这条事件 → **邮件 API 又被调了一次（用户收到两封）**。

真正容易产生误解的正是最后一项：它说的是**消息层的能力边界**，而不是整条业务链路。把上面三层叠起来看：

~~~text
Messaging Layer（消息层）
↓
某种 Delivery Guarantee（交付保证：at-most / at-least / exactly-once）

Application Layer（应用层）
↓
Database / Payment / Email / External API Side Effect（数据库/支付/邮件/外部 API 副作用）
↓
仍然存在 Transaction Boundary（事务边界）、Crash Window（崩溃窗口）和外部系统自身语义
~~~

为什么叠起来之后「精确一次」会破功，核心有两处断点：

1. **Crash Window（崩溃窗口）**：从「Broker 把消息交给消费者」到「副作用真正提交」之间，进程随时可能崩溃。恢复后消息被重投，副作用就跑了第二次。消息层的交付保证管不到这个窗口。
2. **外部系统自身语义**：支付扣款、邮件发送这类外部 Side Effect 由对方系统决定成败与可重入性，Broker 既不知道、也无法回滚。即便消息只投了一次，外部调用也可能因超时重试而执行多次。

因此「消息系统支持 Exactly Once（精确一次）」**不能直接推导为**「整个分布式业务的副作用绝对只发生一次」。工程上的正确结论见下一节：既然重复交付无法从根上消除，就应当把**消费端设计成幂等（Idempotent）**，用业务主键或消息去重表来吸收重复，而不是寄希望于端到端的恰好一次。

在通用工程设计中，更稳妥的模型通常是：

~~~text
任务可能重复交付
        ↓
Consumer 接受 Redelivery
        ↓
业务操作设计为 Idempotent
        ↓
重复尝试不产生额外错误副作用
~~~

AWS Transactional Outbox 文档也明确提醒 Outbox Processor 可能发送重复消息，并建议 Consumer 设计为 Idempotent。[[4]](https://docs.aws.amazon.com/prescriptive-guidance/latest/cloud-design-patterns/transactional-outbox.html)

### 【Idempotency 保护的是业务结果，不只是“代码没有报错”】

幂等（Idempotency）：同一个逻辑操作重复执行多次，不应该因为重复执行产生额外的业务结果。

例如：

~~~text
Task: charge order-123

第一次执行
↓
已经成功扣款

Worker Crash
↓
Task Redelivery

第二次执行
↓
不能再次扣款
~~~

常见实现手段包括：

| 方法 | 适用思想 |
| --- | --- |
| Idempotency Key | 同一个逻辑请求共享稳定标识 |
| Unique Constraint | 由数据库阻止重复业务记录 |
| Processed Message Record | 记录某个 Message / Task 是否已处理 |
| State Check | 只允许合法状态转换，例如 pending → paid |
| Version / Sequence | 只接受更新版本，拒绝旧结果覆盖新状态 |

这些手段可以组合。真正需要判断的是：

~~~text
如果同一个 Task 在任何时间再次出现
它可能重复产生哪些 Side Effect？
系统在哪一层阻止重复结果？
~~~

### 【并发与顺序要求会限制 Worker 并行度】

异步系统还可能面对：

~~~text
Task A: Order 1 version 1
Task B: Order 1 version 2
~~~

如果 B 先完成、A 后完成，旧结果可能覆盖新状态。

因此某些业务需要：

~~~text
Per-key Ordering
Sequence Check
Version Check
Partition by Business Key
~~~

而不是简单把 Worker Concurrency 无限增大。

顺序保证通常只应该缩小到真正需要的业务 Key 范围，否则全局串行会直接牺牲吞吐。

## 6. 失败恢复通过 Retry、Backoff 与 Dead Letter 建立受控闭环

### 【Retry 之前先区分 Transient Failure 与 Permanent Failure】

并不是所有失败都值得重试。

~~~text
Failure
│
├── Transient Failure
│   ├── Network Timeout
│   ├── Temporary Unavailable
│   ├── Rate Limit
│   └── Short-lived Dependency Failure
│
└── Permanent / Business Failure
    ├── Invalid Input
    ├── Permission Denied
    ├── Unsupported State
    └── Permanent Conflict
~~~

Transient Failure 通常适合 Retry。

Permanent Failure 如果不改变输入、代码或业务状态，重复执行往往只会重复失败，应尽早进入 Terminal Failure、人工处理或明确的业务冲突流程。

因此：

~~~text
Retry
不是
catch 后再执行一次

而是
Failure Classification
+
Retry Policy
~~~

### 【Retry Policy 同时决定次数、持续时间与下一次执行时间】

完整 Retry Policy 至少需要回答：

~~~text
什么错误可以 Retry？
最多尝试多少次？
总共允许重试多久？
下一次什么时候执行？
最大等待多久？
服务端是否提供 Retry-After？
最终失败去哪里？
~~~

Google Cloud Tasks 的 RetryConfig 也把 maxAttempts、maxRetryDuration、minBackoff、maxBackoff、maxDoublings 等作为独立配置，说明 Retry 本身就是一套策略，而不是一个固定循环。[[7]](https://cloud.google.com/tasks/docs/reference/rest/v2/RetryConfig)

### 【Exponential Backoff 与 Jitter 防止故障期间形成 Retry Storm】

如果下游已经故障，而大量 Worker 立即重复请求：

~~~text
Dependency Failure
↓
Immediate Retry
↓
More Load
↓
Dependency 更难恢复
↓
More Failure
↓
More Retry
~~~

就会形成 Retry Storm。

Exponential Backoff（指数退避）通过逐渐拉大重试间隔降低持续压力。

Jitter（抖动）再给等待时间加入随机性，避免大量任务在完全相同的时间点一起恢复请求。

~~~text
Retry Delay
=
Backoff
+
Jitter
+
Maximum Delay Boundary
~~~

AWS Builders' Library 的 Timeouts, retries, and backoff with jitter 也强调 Retry 会放大下游负载，并使用 Backoff 与 Jitter 降低同步重试和过载风险。[[8]](https://aws.amazon.com/builders-library/timeouts-retries-and-backoff-with-jitter/)

### 【Dead Letter 是自动恢复失败后的终止状态与人工入口】

自动 Retry 不能无限持续。

~~~text
Task
↓
Retry
↓
Retry Budget Exhausted
↓
Dead Letter / Terminal Failed
↓
Inspect
↓
Repair
↓
Replay / Discard
~~~

Dead Letter Queue / Dead Letter State 不只是“另一个 Retry Queue”，它表示：

> 当前自动恢复策略已经无法继续，需要保存失败事实并进入诊断或人工决策。

至少应该保留能够定位问题的信息：

~~~text
Task / Message ID
Attempt Count
Last Failure Reason
Failed At
Correlation / Trace Context
必要的 Payload Reference
~~~

Replay 之前必须先确认导致失败的代码、数据或依赖已经被修复；否则人工 Replay 只是在重新制造同一个失败。

## 7. 容量与运行治理决定异步系统能否长期稳定工作

### 【Producer Rate 与 Consumer Throughput 决定 Queue 是否持续积压】

可靠不等于健康。

设：

~~~text
λ = Producer Arrival Rate
μ = Consumer Processing Rate
~~~

如果长期：

~~~text
λ > μ
~~~

即使每个 Task 都被可靠保存，Backlog 仍然会持续增长。

所以：

~~~text
Durability
只保证任务不容易丢

Capacity
决定任务能不能及时完成
~~~

异步系统必须同时观察“进入多少任务”和“处理多少任务”，而不能只确认 Worker Process 还活着。

### 【Concurrency、Batch Size 与 Worker Replicas 是不同容量控制旋钮】

常见扩容手段包括：

~~~text
提高单 Worker Concurrency
扩大 Claim / Fetch Batch
增加 Worker Replicas
优化单 Task Processing Time
拆分热点业务 Key / Partition
~~~

它们并不等价。

提高 Concurrency 可能同时增加：

~~~text
Database Connections
Lock Contention
CPU / Memory
Remote API QPS
Network I/O
~~~

因此最佳并发不是“越高越好”，而是受最窄下游资源约束。

### 【Backpressure 在 Producer 快于 Consumer 时主动控制系统压力】

Backpressure（背压）：当下游已经无法按当前速度消费时，上游需要感知并降低继续施加的压力。

可能的控制手段包括：

~~~text
Producer Rate Limit        （生产者限速）
Queue Admission Control     （入队准入控制）
Worker Concurrency Limit    （Worker 并发上限）
Priority Queue              （优先级队列）
Batching                    （批量处理）
Load Shedding               （负载卸载 / 过载丢弃）
暂时拒绝低优先级任务           （显式拒绝低优任务）
~~~

逐项说明：

- **Producer Rate Limit（生产者限速）**：在流量源头限制单位时间内的入队速率（常用令牌桶）。防止突发流量一口气压垮队列与下游，是最前置的一道闸。常见于 SDK / 网关 / 采集端侧。

- **Queue Admission Control（入队准入控制）**：队列在「接收任务」这一步就判断自身水位，超过阈值直接拒绝入队（返回 429 或暂存失败）。它把压力挡在系统边界之外，而不是让任务无限制堆积、把内存和延迟拖爆。

- **Worker Concurrency Limit（Worker 并发上限）**：限制单个 Worker 同时处理的任务数。这直接对应上一节提到的——并发一高，Database Connections、Lock Contention、CPU/内存、Remote API QPS、Network I/O 会**同时被放大**。并发上限要按「最窄的那条下游资源」来定，而非越高越好。

- **Priority Queue（优先级队列）**：按优先级调度，高优任务先消费，低优任务在拥塞时被推迟。保证在过载时关键链路（如交易、告警）仍可用，非关键链路（如报表统计）自觉让路。

- **Batching（批量处理）**：把多条任务合并成一批处理（如批量写库、批量发消息）。用更少的往返摊销固定开销，降低单位任务的资源消耗，从而提升吞吐、缓解压力——属于「少次数、多批量」的减压思路。

- **Load Shedding（负载卸载）**：当系统明确感知自己已过载，主动丢弃或拒绝一部分请求/任务，保住核心能力，而不是被流量拖垮。本质是「宁可少做、不能全崩」的兜底策略。

- **暂时拒绝低优先级任务**：Load Shedding 的一种具体形态——过载时直接拒绝报表类、统计类等非关键任务，把腾出的容量优先给关键路径，等水位回落再恢复。

Backpressure 与 Retry 需要一起考虑。如果系统已经积压严重，再让失败任务高频 Retry，会同时扩大新任务压力和旧任务压力。

### 【Queue Depth 与 Queue Lag 必须同时观察】

只看 Queue Depth（队列长度）容易误判。

~~~text
System A
Queue Depth = 10,000
Oldest Ready Task Age = 2s

System B
Queue Depth = 300
Oldest Ready Task Age = 20min
~~~

A 的瞬时吞吐可能很高，而 B 已经出现明显处理延迟。

因此更完整的异步系统信号包括：

| 维度 | 典型指标 | 回答的问题 |
| --- | --- | --- |
| Arrival | Enqueue Rate | 每秒进入多少任务 |
| Backlog | Queue Depth | 当前积压多少 |
| Lag | Oldest Ready Age / Queue Wait P95 | 任务等待多久 |
| Throughput | Completed Rate | 每秒真正完成多少 |
| Processing | Processing Duration P95 / P99 | 单任务本身有多慢 |
| Reliability | Failure / Retry Rate | 是否频繁失败 |
| Terminal Failure | Dead Letter Count / Rate | 是否存在持续失败 |
| Ownership | Lease Timeout / Redelivery | Worker 是否频繁失联或超时 |
| Runtime | Active Workers / Concurrency | 当前实际消费能力 |
| Traceability | Task ID / Correlation ID / Trace | 单个任务怎样跨系统定位 |

最终需要回答的不是：

~~~text
Worker 活着吗？
~~~

而是：

~~~text
任务是否在可接受时间内
持续、正确地完成？
~~~

### 【Graceful Shutdown 避免部署和缩容主动制造异常交付窗口】

Worker 在发布、重启或缩容时，不能只考虑“退出进程”。

更稳妥的关闭顺序通常是：

~~~text
收到 Shutdown Signal
↓
停止领取新任务
↓
等待正在处理的任务完成
或安全放弃当前 Lease
↓
停止 Timer / Scheduler
↓
关闭 Database / Broker / Redis Connection
↓
Process Exit
~~~

如果无法等待当前任务完成，也应保证 Lease / Visibility Timeout 最终能够让其他 Worker 重新领取，而不是永久留下 Running Task。

这把异步任务与运行部署连接起来：Container / Service 的生命周期继续阅读 [Docker 工程体系](./D-Docker工程体系.md)。

## 8. 异步任务体系通过上下游知识和项目实践形成完整学习路径

### 【通用知识先连接 Runtime、Database 与 Deployment】

这篇文档承担“系统级异步处理”的主要通用入口，其他知识只保留自己的边界：

~~~text
Node.js Runtime
Event Loop / Async I/O / Process
        ↓
服务端完整框架体系
        ↓
Database Transaction / Concurrency
        ↓
服务端异步任务与消息处理体系
        ↓
Queue / Worker / Reliability / Capacity
        ↓
Docker / Service Runtime / Observability
~~~

建议按下面的关系阅读：

- [服务端完整框架体系](./F-服务端完整框架体系.md)：先确定异步任务位于完整 Server Architecture 的哪条链路。
- [NodeJS 核心总结](./N-NodeJS核心总结.md)：理解 Event Loop、Async I/O、Process 与 Worker Thread 等 Runtime 概念。
- [数据库完整框架体系](./S-数据库完整框架体系.md)：理解 Transaction、Concurrency Control，以及 Transactional Outbox 为什么需要本地事务。
- [Docker 工程体系](./D-Docker工程体系.md)：理解 API Process、Worker Process、Scheduler 怎样进入长期运行的 Container / Service Runtime。
- [邮件传输与邮件系统完整框架](./Y-邮件传输与邮件系统完整框架.md)：观察 Email Queue、Retry、Outbox 如何作为本体系在具体业务域中的应用。

### 【项目实践只承担真实实现验证，不反向定义通用知识】

项目实践入口首先连接到对应的专项源码学习，再由专项文档继续进入更细的数据库、Redis 与端到端链路：

- [Browser Monitor 服务端可靠性体系源码学习](https://github.com/cxDlogver/browser-monitor/blob/main/docs/%E6%9C%8D%E5%8A%A1%E7%AB%AF%E5%8F%AF%E9%9D%A0%E6%80%A7%E4%BD%93%E7%B3%BB%E6%BA%90%E7%A0%81%E5%AD%A6%E4%B9%A0.md)：项目可靠性总入口，用于把 Request、Transaction、Worker、Redis、Capacity、Health 与 Runtime Recovery 放回同一故障模型；本专项只继续深入其中的 Async Task 分支。

- [Browser Monitor 异步任务与 Worker 可靠消费体系源码学习](../browser-monitor/docs/异步任务与Worker可靠消费体系源码学习.md)：本体系的主要项目映射。沿 API 202 异步边界 → Transactional Outbox → FOR UPDATE SKIP LOCKED → Lease / Reclaim → At-least-once + Idempotent Projection → Retry / Dead Letter → Queue Observability 对照真实源码。
- [Browser Monitor 服务端数据管理源码学习-2](../browser-monitor/docs/服务端数据管理源码学习-2.md)：补充 Database Transaction、Concurrency Control、Advisory Lock 与 Transactional Outbox 的数据库前置知识。
- [Browser Monitor Redis 体系源码学习](../browser-monitor/docs/Redis体系源码学习.md)：补充 Analytics Version Cache、Runtime State 与 Worker / Redis 的边界。
- [Browser Monitor 服务端全链路](../browser-monitor/docs/浏览器监控平台-服务端全链路.md)：把 Worker 专题重新放回 SDK → API → Storage → Worker → Analytics → Web 的完整数据生命周期。
- [计划打卡 iOS Worker](../ios-plan-checkin/apps/worker/src/planReminders.ts)：PostgreSQL-backed Job Queue 的另一类代码实践入口。
- [计划打卡 Mobile Outbox Runner](../ios-plan-checkin/apps/mobile/src/data/outboxRunner.ts)：客户端 Durable Outbox、Retry、Backoff 与 Jitter 的代码实践入口。

Browser Monitor 专题与本文七阶段主线对应如下：

| 通用知识阶段 | Browser Monitor 专题对应位置 |
| --- | --- |
| 异步边界 | 第 1 章：API 202、API / Worker Process 分离 |
| 可靠交接 | 第 2 章：telemetry_events + outbox_tasks 同事务 |
| 安全消费 | 第 3 章：Task State、SKIP LOCKED、Lease、Graceful Shutdown |
| 承载与分发基础设施 | 第 8 章：当前 Database-backed Job Store + Polling Pull，以及 Kafka 演进边界 |
| 重复执行正确性 | 第 4 章：At-least-once、Unique Key、Advisory Lock、sequence |
| 失败恢复 | 第 5 章：Retry、Exponential Backoff、Dead Letter、Manual Replay |
| 容量与运行治理 | 第 6～7 章：Cache Version、后台维护、Batch / Concurrency、Service Status、Metrics 与 Queue Lag 演进 |

这里保持明确边界：

~~~text
Full-Stack-AI-NOTES
负责
通用定义 / 机制 / 判断方法 / 方案边界

Browser Monitor 专题
负责
真实表结构 / 代码路径 / 参数 / 故障窗口 / 项目取舍 / 演进复盘
~~~

这些项目实现用于验证通用模型，不代表所有异步系统都应该采用相同状态字段、重试次数、Lease 时长或基础设施。

### 【面试与答辩应该沿问题演化说明设计，而不是罗列组件】

一段完整的异步系统回答应该能够沿下面的因果链展开：

~~~text
为什么不能全部放在 Request 中？
↓
为什么任务必须 Durable？
↓
业务数据和 Task 怎样避免 Dual Write？
↓
多个 Worker 怎样安全领取？
↓
Worker Crash 为什么会 Redelivery？
↓
为什么需要 Idempotency？
↓
哪些失败值得 Retry？
↓
什么时候进入 Dead Letter？
↓
积压以后怎样判断是扩容、限流还是优化单任务？
↓
怎样用 Queue Lag / Failure / Retry / DLQ 证明系统健康？
~~~

只要能够把这条链讲清楚，就已经从“会使用 Queue / Worker”进入了“能够设计和解释可靠异步系统”的层级。

## 9. 参考文献

[1] Google Cloud. Cloud Tasks compared to Pub/Sub. https://cloud.google.com/tasks/docs/comp-pub-sub

[2] Amazon Web Services. Asynchronous communication. AWS Prescriptive Guidance. https://docs.aws.amazon.com/prescriptive-guidance/latest/modernization-integrating-microservices/asynchronous.html

[3] RabbitMQ. Consumer Acknowledgements and Publisher Confirms. https://www.rabbitmq.com/docs/confirms

[4] Amazon Web Services. Transactional outbox pattern. AWS Prescriptive Guidance. https://docs.aws.amazon.com/prescriptive-guidance/latest/cloud-design-patterns/transactional-outbox.html

[5] RabbitMQ. RabbitMQ tutorial - Work Queues. https://www.rabbitmq.com/tutorials/tutorial-two-javascript

[6] PostgreSQL Global Development Group. SELECT - Locking Clause / SKIP LOCKED. PostgreSQL 18 Documentation. https://www.postgresql.org/docs/18/sql-select.html

[7] Google Cloud. RetryConfig. Cloud Tasks API v2. https://cloud.google.com/tasks/docs/reference/rest/v2/RetryConfig

[8] Amazon Web Services. Timeouts, retries, and backoff with jitter. Amazon Builders' Library. https://aws.amazon.com/builders-library/timeouts-retries-and-backoff-with-jitter/

[9] Amazon Web Services. ReceiveMessage - Amazon Simple Queue Service API Reference. https://docs.aws.amazon.com/AWSSimpleQueueService/latest/APIReference/API_ReceiveMessage.html

[10] RabbitMQ. Consumer Prefetch. https://www.rabbitmq.com/docs/consumer-prefetch

[11] Apache Kafka. Documentation - Topics, Partitions, Producers and Consumers. https://kafka.apache.org/documentation/

[12] Apache Kafka. Distribution - Consumer Offset Tracking. https://kafka.apache.org/41/implementation/distribution/

[13] KafkaJS. Producing Messages. https://kafka.js.org/docs/producing

[14] KafkaJS. Consuming Messages. https://kafka.js.org/docs/consuming
