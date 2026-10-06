# 数据库完整框架体系建立从业务状态到长期数据管理的整体认知

数据库学习不应该从某一种 SQL、某一个 ORM 或某一种数据库产品开始。对服务端工程来说，更稳定的学习顺序是先回答：**业务状态为什么需要数据库、数据怎样组织、应用怎样访问、数据库怎样保证正确性、查询为什么有快慢，以及数据结构怎样长期演进。**

~~~text
Business State
    ↓
Data Model
    ↓
Database / DBMS
    ↓
Application Data Access
    ↓
SQL / Query Execution
    ↓
Correctness
    ↓
Performance
    ↓
长期运行与恢复
（结构演进、数据恢复、运行维护）
~~~

本文只建立数据库的通用框架与知识边界。PostgreSQL、MySQL、Drizzle 等用于验证通用概念，具体项目源码只作为实践入口。

## 1. 数据库在服务端负责持久化和管理共享业务状态

### 【服务端状态先区分生命周期再选择存储位置】

一次请求执行时会产生很多状态，但这些状态并不都应该进入数据库。

~~~text
Server State
│
├── Process Memory
│   └── 生命周期通常跟随当前进程
├── Cache
│   └── 用更快访问换取额外的一致性与失效管理
├── Database
│   └── 保存需要长期存在、查询和维护一致性的结构化业务状态
└── Object / File Storage
    └── 更适合文件、图片、视频、归档对象等大对象
~~~

数据库的价值因此不是简单的“把变量保存到磁盘”，而是让多个请求、进程和服务可以围绕同一组长期数据进行查询、修改、约束和并发协作。

### 【Database、DBMS 与 Database Server 描述不同层级】

| 概念 | 直观含义 | 关注对象 |
| --- | --- | --- |
| Database | 被组织和保存的数据集合 | 数据本身及其结构 |
| DBMS（Database Management System，数据库管理系统） | 创建、查询、修改和管理数据库的软件系统 | 数据管理能力 |
| Database Server | 正在运行并向客户端提供数据库能力的服务实例 | 运行中的数据库服务 |

以 PostgreSQL 为例，官方将 PostgreSQL 定义为数据库管理系统，并采用 Client / Server 模型：Server Process 管理数据库文件、接受 Client Connection 并执行数据库操作。[[1]](https://www.postgresql.org/docs/18/intro-whatis.html) [[2]](https://www.postgresql.org/docs/18/tutorial-arch.html)

~~~text
Application
    ↓
Database Client / Driver
    ↓
Database Server
    ↓
DBMS
    ↓
Database
~~~

因此不能把数据库文件、PostgreSQL Server、Driver 和 ORM 理解成同一个层级。

### 【关系型数据库只是数据库系统中的一种数据模型】

关系型数据库（Relational Database）使用表、行、列以及数据之间的关系组织结构化数据。PostgreSQL 官方文档说明，关系表由列和行构成，每个列具有数据类型。[[3]](https://www.postgresql.org/docs/18/ddl-basics.html)

后续主要使用关系型数据库建立服务端基础框架，是因为 SQL、Constraint、Transaction、Index 等能力能够形成一条清晰且可迁移的学习主线；Database 本身并不等于 Relational Database。

## 2. 数据模型决定业务事实怎样被组织和约束

### 【从业务实体到 Table 是一次数据建模过程】

业务代码中的对象不能机械地一一复制成数据库表。数据库首先需要确定哪些事实需要长期保存，以及这些事实之间存在什么关系。

~~~text
Business Concept
    ↓
Entity / Relation
    ↓
Logical Data Model
    ↓
Schema
    ↓
Table / Column / Constraint
~~~

例如订单系统中可以存在 User、Order、OrderItem、Product 等实体。真正重要的不是先记住 CREATE TABLE，而是先确定实体、字段、关系和约束。

### 【Schema 描述数据库结构而不是某个 schema.ts 文件】

Schema 在数据库语境中描述数据库对象及其结构关系。应用工程中的 schema.ts 则通常是数据库结构在代码侧的一种声明或映射。

以 Drizzle 为例，官方允许在 TypeScript 中声明 SQL Schema，并使用这些声明参与 Query 与 Migration。[[4]](https://orm.drizzle.team/docs/sql-schema-declaration)

~~~text
Database Schema
    ↓
Database Objects
│
├── Table
├── Column
├── Constraint
├── Index
└── Relation

Application Schema Declaration
    ↓
代码侧描述 / 映射
    ↓
ORM / Query Builder / Migration Tool
~~~

因此不能建立 schema.ts = Database Schema 本身的等价关系。

### 【Data Type 与 Constraint 共同定义数据的合法范围】

Data Type 先限制字段能够表达的基本值域，Constraint 再描述业务上哪些值和关系是合法的。

PostgreSQL 将 CHECK、NOT NULL、UNIQUE、PRIMARY KEY、FOREIGN KEY 等作为数据定义层的约束机制，其中 Foreign Key 用于维护关联数据之间的引用完整性。[[5]](https://www.postgresql.org/docs/18/ddl-constraints.html)

~~~text
Data Correctness
│
├── Data Type
│   └── 值属于什么基本范围
└── Constraint
    └── 值和关系还必须满足什么规则
~~~

数据库类型与具体编程语言之间的映射属于更下游的专题。MySQL → JDBC / Connector/J → Java 的具体映射见 [MySQL 数据类型与 Java 数据访问映射](./D-DATABASE.md)。

## 3. 应用通过数据访问链连接数据库

### 【数据访问链把业务逻辑与数据库通信分成不同职责】

典型服务端数据访问链可以表示为：

~~~text
Controller
    ↓
Service
    ↓
Repository / Data Access
    ↓
ORM / Query Builder
    ↓
Database Driver
    ↓
Connection Pool
    ↓
Connection
    ↓
DBMS
~~~

这些层并非每个项目都必须全部存在，但解决的问题不同。

| 层级 | 主要职责 |
| --- | --- |
| Service | 执行业务规则 |
| Repository / Data Access | 集中组织数据访问 |
| ORM / Query Builder | 构造查询、映射结果或管理模型 |
| Driver | 实现应用语言与数据库之间的协议/API适配 |
| Connection | 一条实际数据库会话/连接 |
| Connection Pool | 复用并限制 Connection |

### 【Driver 与 ORM 不是同一个抽象层】

~~~text
Business Code
    ↓
ORM / Query Builder
    ↓
Driver
    ↓
Database Protocol
    ↓
DBMS
~~~

因此 ORM ≠ Database Driver ≠ Database。即使不使用 ORM，应用仍然可以通过 Driver 执行 SQL。

### 【Connection Pool 解决连接复用和连接数量控制】

数据库连接不是零成本资源。以 node-postgres 为例，官方建议频繁查询的 Web Application 使用 Connection Pool，并指出建立新 Client 需要握手，数据库服务端同时可处理的 Client 数量也有限。[[6]](https://node-postgres.com/features/pooling)

~~~text
Request A ─┐
Request B ─┼─→ Connection Pool ─→ Limited Connections ─→ DBMS
Request C ─┘
~~~

Pool 的核心是复用 Connection、限制 Connection 数量并协调并发请求。具体 Pool Size 需要结合应用实例数量、数据库连接上限、查询时长和负载确定，不能脱离运行环境给出固定万能值。

## 4. SQL 将业务数据操作转换成数据库可以执行的操作

### 【SQL 同时覆盖结构定义、数据修改和数据查询】

入门阶段可以先按目的建立三类操作：

~~~text
Schema Definition
    ↓
CREATE / ALTER / DROP

Data Modification
    ↓
INSERT / UPDATE / DELETE

Data Query
    ↓
SELECT / JOIN / GROUP / Aggregate
~~~

真实 SQL 标准与不同 DBMS 的语法范围更广，但这一层已经足够建立服务端基础框架。

### 【SQL 从文本到结果需要经过数据库内部执行链】

~~~text
SQL
 ↓
Parse / Analyze
 ↓
Rewrite（取决于 DBMS）
 ↓
Plan / Optimize
 ↓
Execution Plan
 ↓
Executor
 ↓
Result
~~~

PostgreSQL 官方内部结构文档将查询处理链拆成 Parser、Transformation、Rule System、Planner / Optimizer 与 Executor 等阶段。[[7]](https://www.postgresql.org/docs/18/overview.html)

这条链很重要，因为后续的 Index、Statistics、Join Strategy 和 EXPLAIN 都是在影响或观察 Query Plan，而不是彼此孤立的技巧。

### 【ORM 不会替代 SQL 与数据库执行机制】

~~~text
Application API
    ↓
ORM / Query Builder
    ↓
SQL / Database Command
    ↓
DBMS
~~~

因此即使项目主要使用 ORM，仍然需要理解 SQL、Constraint、Transaction、Index 和 Execution Plan；否则只能理解调用方式，无法判断数据库实际执行了什么。

## 5. 数据正确性由业务不变量、约束、事务与并发控制共同维护

### 【业务不变量决定并发控制真正需要保护什么】

数据库并发正确性的起点不是先选择某个 Isolation Level，而是先明确：**多个请求同时修改长期业务状态时，哪些业务规则必须始终成立。**

~~~text
Business Rule
    ↓
Invariant
    ↓
并发执行后仍然必须成立
    ↓
选择数据库保护机制
~~~

例如：库存不能小于 0、用户名必须唯一、同一订单只能成功支付一次、状态只能沿允许路径转换。真正危险的不是“两个 Transaction 同时运行”本身，而是两个单独看起来合理的操作在并发组合后破坏了这些 Invariant。

### 【正确性保护优先从 Constraint 和原子操作开始】

不同业务规则不需要一开始就使用显式锁。更稳定的判断顺序是：

~~~text
需要保护一个 Invariant
        ↓
数据库能否直接声明这个规则？
        │
        ├── 能
        │    ↓
        │  Constraint
        │  UNIQUE / FOREIGN KEY / CHECK ...
        │
        └── 不能
             ↓
一次 SQL 能否原子完成？
        │
        ├── 能
        │    ↓
        │  Atomic INSERT / UPDATE / UPSERT
        │  Conditional Write
        │
        └── 不能
             ↓
需要读取后再决策
             ↓
Isolation / Lock / Conflict Detection
~~~

例如“用户名必须唯一”不应该只依赖应用层先 SELECT 再 INSERT。两个并发请求都可能先看到“不存在”，真正的最终裁决应由 UNIQUE Constraint 完成。PostgreSQL 的 UNIQUE Constraint 会确保一列或一组列中的值在表内唯一。[[5]](https://www.postgresql.org/docs/18/ddl-constraints.html)

因此：

~~~text
Application Validation
≠
Database Constraint

前者改善业务流程和错误提示
后者承担数据库并发下的数据保护边界之一
~~~

### 【Transaction 解决多个数据库操作需要作为一个整体成立的问题】

事务（Transaction）把一组相关数据库操作组织成一个执行单元。PostgreSQL 的 BEGIN 会启动 Transaction Block，直到 COMMIT 或 ROLLBACK；多个相关修改放在同一事务中可以避免其他 Session 观察到未完成的中间状态。[[8]](https://www.postgresql.org/docs/18/sql-begin.html)

~~~text
Business Operation
    ↓
Statement A
Statement B
Statement C
    ↓
COMMIT
or
ROLLBACK
~~~

Transaction 提供的是一组操作的原子边界，但它不会自动保证任意业务 Invariant 在并发场景下都成立。

### 【Isolation Level 描述并发可见性和允许提交的并发结果】

PostgreSQL 将 Transaction Isolation、Explicit Locking、Consistency Checks 与 Serialization Failure Handling 放在同一 Concurrency Control 体系中。[[9]](https://www.postgresql.org/docs/18/mvcc.html)

Isolation Level 不能只理解成“当前 Transaction 能看到哪些数据”，还要理解系统允许哪些并发执行结果最终 Commit：

~~~text
Isolation Level
│
├── Visibility
│   └── 当前 Transaction 能看到什么
│
└── Allowed Concurrent Behavior
    └── 哪些并发结果可以提交
~~~

具体 DBMS 的实现和保证并不完全相同，例如 PostgreSQL 的 Read Uncommitted 实际按 Read Committed 处理。[[10]](https://www.postgresql.org/docs/18/transaction-iso.html)

Serializable 也不等于把所有 Transaction 真正排队串行执行。PostgreSQL 会允许事务并发执行，并在检测到无法与某个串行执行顺序等价的依赖关系时中止其中一个事务，由应用处理 Serialization Failure。[[10]](https://www.postgresql.org/docs/18/transaction-iso.html)

~~~text
Concurrent Transactions
        ↓
Serializable Isolation
        ↓
检测不可序列化的并发依赖
        ↓
Abort Conflicting Transaction
        ↓
Application Retry
~~~

因此更高 Isolation 不是“永远更好”的等级升级，而是更强正确性约束与更多 Conflict / Retry / Coordination Cost 之间的工程选择。

### 【Isolation Requirement 与 MVCC、Snapshot、Lock 属于不同层级】

Isolation Level 更接近系统希望获得怎样的并发保证，MVCC、Snapshot、Lock 与 Conflict Detection 则是 DBMS 实现这些保证时使用的机制。

~~~text
Business Invariant
    ↓
Isolation Requirement
    ↓
DBMS Concurrency Control
│
├── MVCC / Snapshot
├── Atomic Operation
├── Lock
└── Conflict Detection
~~~

因此不能建立 `Serializable = Lock`、`Repeatable Read = MVCC` 这样的简单一一对应。以 PostgreSQL 为例，Repeatable Read 使用稳定 Snapshot，而 Serializable 在类似 Snapshot 基础上进一步检测可能导致 Serialization Anomaly 的并发关系。[[10]](https://www.postgresql.org/docs/18/transaction-iso.html)

### 【悲观控制和乐观冲突检测解决同一个并发更新问题】

~~~text
Concurrent Update Strategy
│
├── Pessimistic Control
│   └── 先限制其他并发修改
│       SELECT ... FOR UPDATE / Explicit Lock
│
└── Optimistic Control
    └── 先允许并发
        更新或提交时检测冲突
        Version / Conditional Update / Serialization Failure
~~~

悲观策略适合在冲突概率较高或必须先锁定当前状态再决策时使用；乐观策略允许更高并发，但必须接受 Conflict 并设计失败恢复。Lock 本身不是 Business Correctness，它只是实现并发协调的一种机制。

### 【Serialization Failure 需要重试完整 Transaction 而不是单条 SQL】

PostgreSQL 官方明确要求应用准备处理 `40001 serialization_failure`；正确的恢复方式是重新执行完整 Transaction，包括重新读取状态以及重新运行决定后续 SQL 和参数的业务逻辑。[[11]](https://www.postgresql.org/docs/18/mvcc-serialization-failure-handling.html)

~~~text
BEGIN
↓
Read Current State
↓
Business Decision
↓
Write
↓
COMMIT
   │
   ├── Success
   │
   └── Serialization Conflict
            ↓
         ROLLBACK
            ↓
         Retry
            ↓
   重新读取最新 State
            ↓
   重新执行 Business Decision
~~~

因此：

~~~text
Retry Statement
≠
Retry Transaction
~~~

数据库 Transaction Retry 与后台 Job Retry 也不是同一概念。前者恢复的是数据库并发冲突下的一整个事务决策过程；后者恢复的是异步任务执行。后台任务的 Retry、Redelivery 与 Idempotency 继续参考 [服务端异步任务与消息处理体系](./F-服务端异步任务与消息处理体系.md)。

### 【Lock 会引入 Blocking，并可能进一步形成 Deadlock】

当多个 Transaction 以不同顺序持有并等待资源时，可能形成等待环：

~~~text
Transaction A
持有 Resource 1
等待 Resource 2

Transaction B
持有 Resource 2
等待 Resource 1

        ↓
Wait Cycle
        ↓
Deadlock
        ↓
DBMS Abort One Transaction
        ↓
Application Recovery / Retry
~~~

PostgreSQL 会自动检测 Deadlock，并中止其中一个 Transaction；官方也建议多个 Transaction 以一致顺序获取对象上的 Lock 来降低 Deadlock 风险。[[12]](https://www.postgresql.org/docs/18/explicit-locking.html)

因此数据库并发正确性最终形成一条闭环：

~~~text
Business Invariant
↓
Constraint / Atomic Operation
↓
Transaction Boundary
↓
Isolation Requirement
↓
MVCC / Snapshot / Lock / Conflict Detection
↓
Conflict
├── Constraint Violation
├── Serialization Failure
└── Deadlock
↓
Rollback / Retry
↓
Invariant Maintained
~~~
## 6. 查询性能由数据组织、统计信息和执行计划共同决定

### 【Index 是 Planner 可以选择的访问路径而不是查询必经步骤】

~~~text
Query
    ↓
Planner / Optimizer
    ↓
Query + Statistics + Available Access Paths
    ↓
Execution Plan
│
├── Sequential Scan
├── Index Scan
├── Bitmap Scan
└── Join / Sort / Aggregate ...
~~~

PostgreSQL 的 EXPLAIN 文档说明，每个 Query 都会生成 Query Plan；Planner 可能选择 Sequential Scan、Index Scan、Bitmap Index Scan 等不同节点。[[13]](https://www.postgresql.org/docs/18/using-explain.html)

因此：

~~~text
有 Index
≠
Query 一定使用 Index
≠
Query 一定更快
~~~

### 【Statistics 帮助 Planner 估算不同执行方案的成本】

Planner 需要基于 Statistics、Query Conditions 和 Cost Model 估算候选计划。PostgreSQL 官方在检查 Index Usage 时建议先运行 ANALYZE，因为数据分布统计会影响 Planner 对行数和成本的估算。[[14]](https://www.postgresql.org/docs/18/indexes-examine.html)

~~~text
Workload / Query Pattern
    ↓
Data Layout / Index
    ↓
Statistics
    ↓
Planner
    ↓
Execution Plan
    ↓
EXPLAIN / Runtime Evidence
    ↓
Optimization
~~~

### 【性能优化同时存在读取收益与写入成本】

Index 等额外数据结构可能提升读取，但 Insert / Update / Delete 也需要维护这些结构，并占用额外 Storage。因此优化必须回到真实 Query Pattern 与测量结果，而不是把“索引越多越好”当成规则。

## 7. 数据库长期运行还需要结构演进、可靠性与运维能力

前六章解决了“数据怎样组织、访问、正确提交和高效查询”。数据库进入长期运行以后，还要继续回答另一组问题：

~~~text
Schema 怎样随版本演进
        ↓
已经 COMMIT 的状态为什么能在 Crash 后恢复
        ↓
历史正确状态怎样恢复
        ↓
主实例失效后谁继续提供服务
        ↓
超过单实例故障边界时怎样恢复业务
        ↓
正常运行期间怎样持续维护内部状态
        ↓
怎样观察这些机制是否仍然健康
~~~

因此数据库运行阶段不是一个“运维附录”，而是前面 Transaction、MVCC、Planner 等机制在长期运行环境中的继续。

### 【Schema Migration 让数据库结构随应用版本持续演进】

~~~text
Current Database State
    ↓
Ordered Schema Change
    ↓
Next Database State
~~~

应用侧 Schema Declaration 与 Migration 是相关但不同的概念。以 Drizzle 为例，官方同时支持 Database-first 与 Codebase-first Migration Flow；Codebase-first 可以从 TypeScript Schema 生成 SQL Migration，再应用到 Database。[[15]](https://orm.drizzle.team/docs/migrations)

因此修改 schema.ts 不等于数据库已经修改，还必须确认项目采用的 Migration / Push / Deployment 流程。

长期运行时，Migration 还需要考虑新旧应用版本是否会在一段时间内同时访问数据库。更稳妥的演进通常要求：

~~~text
先增加兼容结构
        ↓
新旧版本都能工作
        ↓
发布新应用
        ↓
完成数据迁移 / Backfill
        ↓
确认旧版本退出
        ↓
再删除旧结构
~~~

这把 Schema Evolution 与 Rolling Deployment 连接起来：数据库结构不是只在开发阶段设计一次，而是要在不停机或有限停机条件下持续演进。

### 【Durability 与 Recovery 让已提交状态在 Crash 后仍可恢复】

事务（Transaction）解决的是多个数据库操作如何形成一个正确提交边界；持久性（Durability）继续回答：

> Transaction 已经 COMMIT 以后，如果数据库进程或机器突然停止，怎样恢复这些已经确认成功的数据？

通用数据库通常不会要求每次修改都立刻把所有数据页同步写回最终数据文件，而会先记录足够的恢复信息，再允许数据页按更合适的时机落盘。不同 DBMS 的具体实现不同，例如 PostgreSQL 使用 Write-Ahead Log（WAL，预写日志），MySQL InnoDB 使用 Redo Log。

以 PostgreSQL 为例，WAL 的基本原则是：

~~~text
Transaction 修改数据
        ↓
生成 WAL Record
        ↓
提交所需 WAL 先持久化
        ↓
COMMIT 可以完成
        ↓
Data Page 可以随后写回
~~~

PostgreSQL 官方说明，WAL 的核心规则是“描述数据文件变化的日志记录必须先写入持久存储，数据页本身才可以随后写入”；发生 Crash 后，可以通过重放 WAL 恢复数据库状态。[[16]](https://www.postgresql.org/docs/18/wal-intro.html)

因此：

~~~text
Transaction Atomicity
→ 一次业务修改是否整体成立

Durability / Recovery Log
→ 已提交结果是否有可恢复依据
~~~

两者不能混为一件事。

数据库 Crash 后的恢复链可以概括为：

~~~text
Database Crash
        ↓
Restart
        ↓
读取 Checkpoint 之后的 Recovery Log
        ↓
Replay / Redo 必要变化
        ↓
恢复一致状态
        ↓
重新提供服务
~~~

这层主要解决数据库自身的 Crash Recovery。它并不能单独解决整块存储永久损坏、误删数据或整个故障域失效，因此还需要 Backup、Replication 与 Disaster Recovery。

### 【Backup 与 Point-in-Time Recovery 提供历史状态恢复能力】

Backup（备份）解决的是：

> 当前数据库已经损坏、误删或写入错误时，能否恢复到过去的正确状态？

这和 Crash Recovery 不同。Crash Recovery 假设数据库自己的持久化介质和恢复日志仍然可用；Backup 则为更大的故障和逻辑错误保留另一份恢复来源。

常见恢复来源可以分成：

~~~text
Logical Backup
→ 导出逻辑对象和数据

Physical / Base Backup
→ 保存数据库物理状态

Base Backup + Log Archive
→ 在基础备份以后继续保留恢复日志
→ 支持恢复到某个历史时间点
~~~

PostgreSQL 将 SQL Dump、File System Level Backup、Continuous Archiving 作为不同备份方式；Continuous Archiving 可以把 Base Backup 与持续归档的 WAL 组合起来。[[17]](https://www.postgresql.org/docs/18/backup.html)

时间点恢复（Point-in-Time Recovery，PITR）：从一个基础备份开始，继续重放后续恢复日志，直到目标时间点，而不是只能恢复到“备份创建时刻”。

例如：

~~~text
10:00 Base Backup
        ↓
10:00 ~ 15:29 持续归档 WAL
        ↓
15:30 误执行 DELETE
        ↓
恢复 Base Backup
        ↓
Replay WAL 到 15:29:59
        ↓
得到误删之前的数据库状态
~~~

PostgreSQL 官方的 Continuous Archiving / PITR 文档明确描述了这种 Base Backup + WAL Archive 的恢复模型。[[18]](https://www.postgresql.org/docs/18/continuous-archiving.html)

所以：

~~~text
Backup File Exists
≠
已经具备可验证的恢复能力
~~~

还必须定期执行 Restore Drill（恢复演练）：在隔离环境真正 Restore、应用必要日志、启动数据库、执行一致性检查和关键业务验证，并记录实际恢复时间。

### 【Replication、Failover 与 High Availability 解决在线实例故障】

Replication（复制）解决的是持续维护数据副本：

~~~text
Primary
        ↓
Replication Stream / WAL
        ↓
Standby / Replica
~~~

如果 Primary 故障，可以把某个 Replica 提升为新的 Primary，这个接管过程就是 Failover（故障切换）。

因此三个概念要分开：

~~~text
Replication
→ 有没有持续同步的数据副本

Failover
→ 主实例失败后由谁接管

High Availability
→ 发生目标范围内故障时，服务能否在可接受时间内继续
~~~

仅仅“存在 Replica”并不自动等于完整高可用。真正的 HA 还需要 Failure Detection、Promotion、Client Routing / Service Discovery，以及避免两个节点同时认为自己是 Primary 的冲突控制。

同样，Replica 不能替代 Backup。错误 DELETE、错误 UPDATE 或错误 Migration 也可能被正常复制到所有 Replica：

~~~text
Primary 误删
        ↓
Replication 正常工作
        ↓
Replica 同样完成误删
~~~

因此可以用一句边界记住：

> **Replication 主要保护“当前实例失效”，Backup 主要保护“正确历史丢失”。**

### 【RPO 与 RTO 把数据保护要求转换成可设计目标】

恢复点目标（Recovery Point Objective，RPO）：故障发生后最多允许丢失多长时间的数据。

恢复时间目标（Recovery Time Objective，RTO）：故障发生后最多允许多久恢复到可提供业务服务的状态。

它们分别约束：

~~~text
RPO
→ Backup Frequency
→ WAL / Log Archive
→ Replication Mode
→ 同步确认强度

RTO
→ Restore Automation
→ Standby Readiness
→ Failover Automation
→ Recovery Environment
~~~

例如：

~~~text
RPO = 5 min
RTO = 30 min
~~~

意味着不能仅凭“每天做一次备份”就认为满足要求。反过来，如果只是低价值内部工具，允许 RPO = 24h、RTO = 8h，也没有必要默认建设同步复制和跨区域自动切换。

因此数据库可靠性应从业务恢复目标倒推机制，而不是先选择“主从、备份、PITR”再寻找使用理由。

### 【Disaster Recovery 处理超过正常高可用边界的故障】

High Availability 通常围绕一个预先定义的故障范围设计，例如单进程、单实例、单主机或单可用区故障。

Disaster Recovery（灾难恢复，DR）继续处理更大的故障：

~~~text
整个 Region 不可用
多个副本同时损坏
账号 / 权限故障影响在线环境
备份介质和生产环境同时受影响
严重逻辑错误已经传播到所有在线副本
~~~

因此 DR 常需要：

~~~text
Off-site / Cross-region Copy
        +
Isolated Backup
        +
Recovery Runbook
        +
定期 Restore / Failover Drill
~~~

数据库正文只负责解释这些机制在数据生命周期中的位置；跨服务 Failure Domain、整体业务 Failover、SLO 和演练治理继续由 [服务端可靠性体系](./F-服务端可靠性体系.md) 作为横向总入口。

### 【数据库长期运行需要持续维护 Storage 与 Statistics】

数据库内部状态并不是写入以后永远不需要维护。

前面已经建立两条知识链：

~~~text
MVCC
→ 并发读写时保存不同可见版本

Statistics
→ Planner 估算候选 Query Plan
~~~

长期运行以后，两者都会产生持续维护需求。

以 PostgreSQL 为例，MVCC 更新和删除后会留下不再对任何活跃事务可见的旧 Row Version。VACUUM 用于回收这些版本可占用的空间，并防止 Transaction ID Wraparound 等问题；ANALYZE 负责采集表内容分布统计，供 Planner 估算 Query Cost。Autovacuum 会自动调度 VACUUM 和 ANALYZE。[[19]](https://www.postgresql.org/docs/18/routine-vacuuming.html)

因此可以形成两条长期运行链：

~~~text
MVCC
        ↓
旧版本持续产生
        ↓
Storage Maintenance
        ↓
Vacuum / Cleanup

Data Distribution 变化
        ↓
Statistics 逐渐过时
        ↓
Statistics Maintenance
        ↓
Analyze
        ↓
Planner 获得更准确估算
~~~

这里的关键不是记住 PostgreSQL 的命令，而是理解：

> 数据库的并发控制和查询优化机制，会反过来产生长期维护成本。

不同 DBMS 的实现名称不同，但都需要持续处理空间回收、统计更新、索引与存储增长等问题。

### 【Observability 与 Capacity Management 验证数据库是否仍然健康】

Monitoring 不是只看“Database Process Alive”，而是要观察数据库是否仍能在预期容量和延迟下完成工作。

至少可以按四组信号理解：

| 维度 | 典型信号 | 回答的问题 |
| --- | --- | --- |
| Workload | Connections、QPS、Read / Write Ratio | 当前进入多少数据库工作 |
| Query | Query Latency、Slow Query、Plan Change | 查询为什么变慢 |
| Concurrency | Lock Wait、Deadlock、Conflict、Pool Wait | 是否发生资源竞争 |
| Storage / Recovery | Storage Growth、Vacuum Lag、Replication Lag、Backup / Restore Result | 数据是否可持续保存和恢复 |

Capacity Management 继续回答：

~~~text
Connection 上限够不够
        ↓
CPU / Memory / I/O 是否接近饱和
        ↓
Storage Growth 是否可持续
        ↓
Index / Table 是否不断膨胀
        ↓
Replication Lag 是否扩大
        ↓
Backup Window 与 Restore Time 是否仍满足目标
~~~

最终数据库长期运行的主线可以收束为：

~~~text
Data Model
    ↓
Schema
    ↓
Application Access
    ↓
SQL / Query Execution
    ↓
Correctness
    ↓
Performance
    ↓
Schema Evolution
    ↓
Durability / Recovery
    ↓
Maintenance / Observability
~~~

### 【数据库知识继续连接具体专题与项目实践】

通用知识入口：

- [服务端完整框架体系](./F-服务端完整框架体系.md)：理解数据库为什么属于服务端状态与数据体系。
- [服务端可靠性体系](./F-服务端可靠性体系.md)：从数据库内部的 Transaction、WAL、Backup、Replication、PITR 继续进入系统级 Failure Model、RPO / RTO、Failover、HA、DR、SLO 与故障演练；数据库正文负责数据库内部机制，可靠性正文负责跨系统横向治理。
- [服务端异步任务与消息处理体系](./F-服务端异步任务与消息处理体系.md)：从 Database Transaction 继续进入 Dual Write Problem 与 Transactional Outbox，理解数据库状态变化怎样可靠地连接后台任务和消息发布。
- [MySQL 数据类型与 Java 数据访问映射](./D-DATABASE.md)：继续学习 MySQL Server Type → JDBC / Connector/J → Java Application Type。

项目实践入口：

- [Browser Monitor 服务端数据管理源码学习](../browser-monitor/docs/服务端数据管理源码学习.md)：PostgreSQL、Connection、SQL、Drizzle、Schema、Constraint、Index 的真实工程映射。
- [Browser Monitor 服务端数据管理源码学习-2](../browser-monitor/docs/服务端数据管理源码学习-2.md)：Transaction 与 Concurrency Control 的项目实践。
- [Browser Monitor 服务端数据管理源码学习-3](../browser-monitor/docs/服务端数据管理源码学习-3.md)：TimescaleDB 与 Time-Series Data Management 的进一步实践。

这些项目文档用于验证已经核实的数据库实践，不代表当前项目已经实现 Database HA、自动 Failover、PITR 或跨区域 DR；未在项目源码和部署配置中确认的能力只保留为通用知识。

## 8. 参考文献

[1] PostgreSQL Global Development Group. *What Is PostgreSQL?*. PostgreSQL 18 Documentation. https://www.postgresql.org/docs/18/intro-whatis.html

[2] PostgreSQL Global Development Group. *Architectural Fundamentals*. PostgreSQL 18 Documentation. https://www.postgresql.org/docs/18/tutorial-arch.html

[3] PostgreSQL Global Development Group. *Table Basics*. PostgreSQL 18 Documentation. https://www.postgresql.org/docs/18/ddl-basics.html

[4] Drizzle Team. *Drizzle schema*. Drizzle ORM Documentation. https://orm.drizzle.team/docs/sql-schema-declaration

[5] PostgreSQL Global Development Group. *Constraints*. PostgreSQL 18 Documentation. https://www.postgresql.org/docs/18/ddl-constraints.html

[6] node-postgres. *Pooling*. node-postgres Documentation. https://node-postgres.com/features/pooling

[7] PostgreSQL Global Development Group. *Overview of PostgreSQL Internals*. PostgreSQL 18 Documentation. https://www.postgresql.org/docs/18/overview.html

[8] PostgreSQL Global Development Group. *BEGIN*. PostgreSQL 18 Documentation. https://www.postgresql.org/docs/18/sql-begin.html

[9] PostgreSQL Global Development Group. *Concurrency Control*. PostgreSQL 18 Documentation. https://www.postgresql.org/docs/18/mvcc.html

[10] PostgreSQL Global Development Group. *Transaction Isolation*. PostgreSQL 18 Documentation. https://www.postgresql.org/docs/18/transaction-iso.html

[11] PostgreSQL Global Development Group. *Serialization Failure Handling*. PostgreSQL 18 Documentation. https://www.postgresql.org/docs/18/mvcc-serialization-failure-handling.html

[12] PostgreSQL Global Development Group. *Explicit Locking*. PostgreSQL 18 Documentation. https://www.postgresql.org/docs/18/explicit-locking.html

[13] PostgreSQL Global Development Group. *Using EXPLAIN*. PostgreSQL 18 Documentation. https://www.postgresql.org/docs/18/using-explain.html

[14] PostgreSQL Global Development Group. *Examining Index Usage*. PostgreSQL 18 Documentation. https://www.postgresql.org/docs/18/indexes-examine.html

[15] Drizzle Team. *Migrations*. Drizzle ORM Documentation. https://orm.drizzle.team/docs/migrations

[16] PostgreSQL Global Development Group. *Write-Ahead Logging*. PostgreSQL 18 Documentation. https://www.postgresql.org/docs/18/wal-intro.html

[17] PostgreSQL Global Development Group. *Backup and Restore*. PostgreSQL 18 Documentation. https://www.postgresql.org/docs/18/backup.html

[18] PostgreSQL Global Development Group. *Continuous Archiving and Point-in-Time Recovery*. PostgreSQL 18 Documentation. https://www.postgresql.org/docs/18/continuous-archiving.html

[19] PostgreSQL Global Development Group. *Routine Vacuuming*. PostgreSQL 18 Documentation. https://www.postgresql.org/docs/18/routine-vacuuming.html
