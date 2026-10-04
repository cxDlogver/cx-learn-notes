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
Schema Evolution / Operations
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

数据库类型与具体编程语言之间的映射属于更下游的专题。MySQL → JDBC / Connector/J → Java 的具体映射见 [MySQL 数据类型与 Java 数据访问映射](./DATABASE.md)。

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

数据库 Transaction Retry 与后台 Job Retry 也不是同一概念。前者恢复的是数据库并发冲突下的一整个事务决策过程；后者恢复的是异步任务执行。后台任务的 Retry、Redelivery 与 Idempotency 继续参考 [服务端异步任务与消息处理体系](./服务端异步任务与消息处理体系.md)。

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

### 【Backup、Replication 与 High Availability 解决不同可靠性问题】

~~~text
Backup / Restore
    ↓
数据损坏或误操作以后如何恢复

Replication
    ↓
如何维护数据副本

High Availability
    ↓
实例故障后如何继续提供服务

Disaster Recovery
    ↓
严重故障后如何恢复业务
~~~

这些能力会继续涉及 RPO、RTO、WAL / Binlog、Failover 等更深知识。当前主文档只保留入口，不在入门阶段展开具体产品实现。

### 【Monitoring 与 Capacity Management 让数据库可以长期稳定运行】

长期运行至少需要继续观察 Connections、Query Latency、Slow Queries、Lock / Conflict、CPU / Memory / I/O、Storage Growth、Replication Lag 和 Backup Result。

完整数据库框架最终收敛为：

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
Reliability / Operations
~~~

### 【数据库知识继续连接具体专题与项目实践】

通用知识入口：

- [服务端完整框架体系](./服务端完整框架体系.md)：理解数据库为什么属于服务端状态与数据体系。
- [服务端异步任务与消息处理体系](./服务端异步任务与消息处理体系.md)：从 Database Transaction 继续进入 Dual Write Problem 与 Transactional Outbox，理解数据库状态变化怎样可靠地连接后台任务和消息发布。
- [MySQL 数据类型与 Java 数据访问映射](./DATABASE.md)：继续学习 MySQL Server Type → JDBC / Connector/J → Java Application Type。

项目实践入口：

- [Browser Monitor 服务端数据管理源码学习](../browser-monitor/docs/服务端数据管理源码学习.md)：PostgreSQL、Connection、SQL、Drizzle、Schema、Constraint、Index 的真实工程映射。
- [Browser Monitor 服务端数据管理源码学习-2](../browser-monitor/docs/服务端数据管理源码学习-2.md)：Transaction 与 Concurrency Control 的项目实践。
- [Browser Monitor 服务端数据管理源码学习-3](../browser-monitor/docs/服务端数据管理源码学习-3.md)：TimescaleDB 与 Time-Series Data Management 的进一步实践。

项目文档用于验证和扩展通用知识，不作为 Database、Transaction、Index 等概念的定义来源。

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
