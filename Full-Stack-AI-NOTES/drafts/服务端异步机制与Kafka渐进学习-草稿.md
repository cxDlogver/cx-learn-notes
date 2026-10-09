# 服务端异步机制与 Kafka 渐进学习（草稿）

> **文档状态：讨论草稿，持续追加。** 本文用于记录以 AI 全栈开发面试为背景的逐题渐进式学习过程，不在一开始罗列整个 Kafka 或服务端异步体系。每一讲只围绕一个能够完整理解的核心问题展开，并保留面试追问、待讨论问题与前后逻辑。形成稳定知识后，再根据内容归入通用主文档。
>
> **学习方法**：问题 → 结论 → 原理及运行过程 → 最小代码与实际场景 → 常见误区 → 面试回答 → 下一讲追问。代码属于解释机制的示意例子，不代表本仓库项目源码。
>
> **通用知识入口**：[服务端异步任务与消息处理体系](../F-服务端异步任务与消息处理体系.md)。相关前置知识：[Node.js Runtime](../N-NodeJS核心总结.md)、[服务端可靠性体系](../F-服务端可靠性体系.md)、[Redis 完整知识体系](../R-Redis完整知识体系.md)。实际工程映射：[Browser Monitor 异步任务与 Worker 可靠消费](https://github.com/cxDlogver/browser-monitor/blob/main/docs/异步任务与Worker可靠消费体系源码学习.md)。

## 1. 为什么服务端有 async / await，还需要独立的异步任务机制

**本讲核心问题：** Node.js 已经支持异步非阻塞 I/O，为什么还需要 Queue（任务队列）与 Worker（后台工作进程）？更进一步地，HTTP 请求提前返回是不是就意味着任务具有可靠性？

**先给结论：** JavaScript 的异步编程解决进程内执行任务时如何利用等待时间；系统级异步任务解决一项业务工作怎样脱离 HTTP 请求生命周期。只有当任务被**可靠持久化交接**，并具备后续消费、失败恢复与状态管理时，才能称为可恢复的后台任务系统。二者不是替代关系。

### 【运行时异步解决等待期间怎样继续执行其他工作】

假设 AI 文档分析服务需要调用模型生成一份报告，耗时约两分钟。最直观的服务端实现：

~~~ts
app.post("/analyze", async (req, res) => {
  const report = await analyzeDocument(req.body.documentId);
  res.json(report);
});
~~~

这段代码确实使用了 async / await。当 analyzeDocument 主要等待异步网络 I/O 时，Node.js 一般可以让 Event Loop 继续处理其他已经就绪的工作，不需要一直同步阻塞主线程。但它**没有让当前 HTTP 请求提前结束**：业务必须等待 report 返回后，才能给本次请求回复最终结果。

这里首先建立两个独立的问题：

| 问题 | 作用层次 | 要求系统解决什么 |
| --- | --- | --- |
| 等待数据库、网络和文件 I/O 时，线程怎样不被空等占住？ | 运行时异步（Runtime-level Asynchrony） | 让当前进程能够在等待 I/O 时处理其他工作 |
| 用户不必在本次 HTTP 请求拿到最终结果时，任务如何继续运行？ | 系统级异步处理（System-level Asynchronous Processing） | 将任务生命周期从 Request 中分离，支持独立执行及后续查询 |

另一个容易混淆的细节：async 函数不自动意味着耗 CPU 的同步代码是非阻塞的。例如对超大文件执行同步解析或死循环，即使函数声明 async，也仍可能阻塞当前 JavaScript 线程。CPU 密集型工作需要另外考虑分批处理、Worker Threads、Child Process 或独立服务进程。详细原理见 [Node.js 官方 Event Loop 介绍](https://nodejs.org/en/learn/asynchronous-work/event-loop-timers-and-nexttick)。

**本节必须理解的边界：** await 影响的是“当前异步函数等待什么结果”；Request 什么时候结束，取决于代码在什么时候发送响应。异步 I/O 并不自动产生脱离 Request 的任务生命周期。

### 【系统级异步把 HTTP 请求结束与业务任务完成分开】

仍以文档分析为例，若希望用户提交后立即离开页面，稍后再回来查看结果，服务端不能要求一个 HTTP 请求持续等待两分钟。

更合适的系统职责链是：

~~~text
浏览器：用户点击开始分析
       ↓
API：鉴权、校验参数、创建任务
       ↓
持久化任务记录或可靠写入 Queue
       ↓
HTTP 202 Accepted：返回 taskId
       ↓
原 HTTP Request 生命周期结束
────────────────────────────────
后台 Worker：独立领取任务
       ↓
运行文档分析 Workflow
       ↓
保存分析报告
       ↓
持久化业务任务终态
       ↓
浏览器以后查询 taskId，获得状态和结果
~~~

这条链路里有两条不同的时间线：

**请求时间线**：接收、检查、可靠交接、返回任务标识。API 不必等模型生成报告以后才响应。

**任务时间线**：等待、领取、处理、保存产物、成功或失败以及必要时重试。任务可以继续存在，客户端不必维持原 HTTP 连接。

HTTP 202 Accepted 表示请求已被接受但处理尚未完成，并不保证后续任务最终成功。这只是协议层的一种表达，后台可靠性需要业务系统自行提供。[MDN：202 Accepted](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Status/202)。

这里也不要把后台工作的具体内容误称为 Agent：Worker 可以调用固定 DocumentAnalysisWorkflow（解析 → 提取 → LLM 分析 → 校验 → 保存）；只有任务需要模型动态自主决定工具和行动时，才考虑 Agent。**Worker 决定谁来执行任务，Workflow 决定任务按照怎样的业务步骤执行。**

### 【API 内 fire-and-forget Promise 能提前返回，但任务仍可能随进程崩溃丢失】

一个看似更简单的方案，是不等待异步函数执行：

~~~ts
app.post("/analyze", async (req, res) => {
  void analyzeDocument(req.body.documentId);
  res.status(202).json({ message: "任务已提交" });
});
~~~

这样确实可以让 HTTP 很快返回，但并没有自动获得可靠任务系统。

原因在于：analyzeDocument 仍由当前 API 进程发起。如果任务只存在于 Node.js 的内存或该进程尚未完成的异步调用中，发生进程退出、容器重建或机器崩溃时，系统可能丢失工作现场。

~~~text
API 进程收到请求
       ↓
启动尚未等待完成的分析 Promise
       ↓
HTTP 202 已经发送
       ↓
分析仍在同一 API Process 中
       ↓
进程异常退出
       ↓
未完成的 Promise 停止运行
       ↓
没有持久任务记录或恢复机制
       ↓
系统不知道需要重新处理哪一项工作
~~~

这里的关键问题不是 Promise 语法，而是**任务存在于哪里，谁在故障后负责发现并重新处理它**。换成 setTimeout、内部事件监听或其他进程内调度语法，也不会自动获得崩溃恢复。

因此需要从“代码是异步的”进一步转向“任务已被可靠交接”。

### 【可靠交接要求先保存可恢复的待办事实，再承诺任务已接收】

如果 API 已对客户端承诺“任务已接受”，那么随后 API 进程崩溃时，系统至少应该能够通过独立持久化的数据重新发现任务。

常见可靠交接位置可以是：

~~~text
API 创建任务
     ↓
可恢复的任务存储边界
     ├── PostgreSQL Job Table（任务保存为表中的一行）
     ├── Redis-backed Job Queue（如 BullMQ 默认 Redis Backend）
     └── Kafka Broker 持久化 Partition Log
     ↓
后台执行者从对应存储读取待办工作
~~~

本讲只理解这些系统为什么处于此位置，不展开 Kafka 的 Topic、Partition、Offset 或 BullMQ 的锁定细节。不同实现对持久化、确认和消费的保证并不完全一样；例如 Redis 是否恢复到最近一次提交，仍受 AOF/RDB、刷盘策略与部署卷影响。不能因为某个库叫 Queue，就直接假设任何故障下都不会丢消息。

特别注意两件事：

第一，**可靠保存任务是“接收完成”而不是“执行完成”**。Queue.add 成功或数据库事务提交成功，不等于报告已生成。

第二，**可恢复存储只是可靠处理的第一层**。进程崩溃后，系统还需要有运行中的 Worker、可查询的待办状态、任务领取机制、超时回收与有限重试策略。如果只有数据库中的任务行，却没有负责恢复执行的程序，任务同样可以一直停留在 pending。

### 【完整后台任务系统拥有独立于 Request 的生命周期】

从一项任务的角度看，至少要回答：

~~~text
任务已被可靠接收
       ↓
等待领取（PENDING）
       ↓
Worker 获取处理权
       ↓
执行中（RUNNING）
       │
       ├── 成功 → 持久化结果 → SUCCEEDED
       │
       └── 失败
            ├── 暂时性问题 → 等待重试
            └── 不可恢复 / 超出上限 → FAILED
~~~

任务的状态通常不只是“存在 / 不存在”。例如需要标记当前是否可领取、谁正在执行、已经尝试多少次、何时再次运行、执行结果保存在哪里，以及失败后如何判断是否能够重试。Worker Process 不一定要与 API 处于不同代码仓库，但如果要实现故障隔离和独立扩容，通常会作为不同运行进程或服务部署。

这条链路与 Kafka 等消息系统的连接点也由此出现：Kafka 首先负责消息的持久交接与消费位置，**不会因为消息写入了 Kafka，就自动记录业务 Workflow 的每个步骤状态**。这个区别后续学习 Kafka Offset 和业务 Checkpoint 时再展开。

### 【三种写法比较揭示“异步执行”和“可靠异步处理”的差别】

| 方案 | HTTP 能否快速返回 | 核心问题 | 崩溃后的恢复条件 |
| --- | --- | --- | --- |
| 直接 await 完整分析 | 通常需要等待业务完成 | I/O 等待不阻塞 Event Loop，但请求仍等待结果 | 原请求不自动重建，需客户端/服务端另外设计 |
| 直接启动不等待的 Promise | 可以 | Task 仍可能只依赖当前 API 进程 | 没有可靠状态时无法自动恢复 |
| 持久化 Job + Worker | 可以 | 请求与任务生命周期被拆开，需要维护后台任务机制 | 依靠已持久化任务、领取、重试与业务幂等恢复 |

第三种方案并不意味着必须部署 Kafka。对于较简单的后台任务，PostgreSQL 的任务表和定时 Worker 也可以实现可靠交接；任务更多、调度更复杂时，可以引入成熟的 Queue 工具；对多 Consumer Group、持久消息日志和事件回放等需求，才逐步讨论 Kafka 为什么适合。它们对应同一个上位问题的不同承载方式，而不是层次完全相同的替代品。

### 【面试题：Node.js 已经异步非阻塞，为什么仍需要消息队列？】

**标准回答：**

首先，Node.js 的异步 I/O 主要解决当前进程等待网络、文件或数据库时如何继续处理其他工作，不代表业务任务已经脱离当前 HTTP Request 生命周期。如果在接口中直接 await 耗时操作，虽然 I/O 等待通常不阻塞 Event Loop，客户端仍然要等整个业务结果返回。

其次，直接启动一个不等待的 Promise，只解决 HTTP 能否提前响应，并没有保证进程退出后任务仍然存在。如果任务没有进入持久化存储，进程崩溃就可能失去恢复依据。

所以，对于用户不需要立即得到最终结果、且具有耗时长、并发或失败重试需求的业务，可以先将 Job 持久化，API 返回 taskId，再交由后台 Worker 领取和执行。这样能够进一步建立任务状态、并发控制、失败重试、重复消费保护与故障恢复能力。

最后，消息队列不是唯一实现。数据库 Job Table 可以构建同样的基础机制；BullMQ 和 Kafka 提供不同的调度与事件消费模型。是否选用专业消息中间件，应按业务完成语义和实际规模判断，而不是把“使用了 async / await”视为充分条件。

**容易失分的回答：** “Node.js 是单线程，所以不能做耗时任务，必须用 Kafka。” 这将 CPU 同步阻塞、I/O 异步以及业务后台任务混成同一问题。Node.js 可以高效处理异步网络 I/O；真正引入独立任务机制的原因是业务完成边界、可靠交接与故障恢复，而不是所有耗时函数都无法在 Node.js 中运行。

## 2. 数据库保存任务只是可靠交接的起点，Worker 才让任务能够持续被执行

**本讲核心问题：** 如果任务先写入数据库，再由 API 启动一个不等待的分析函数并立刻返回 HTTP，算不算可靠的异步系统？

**核心结论：** 持久化任务记录只保证系统保留了“这项工作存在”的证据；要让工作在 API 或 Worker 崩溃后仍能恢复，需要有独立、持续的**任务发现 → 安全领取 → 执行 → 结果确认 → 超时恢复**机制。PostgreSQL 本身就可以支撑这一机制，不需要为了“可靠”这一单一目标必然引入 Kafka。

### 【只把 Job 写进数据库，再启动 API 内 Promise，仍会存在无人执行的任务】

先看一个比上一讲稍有改进的 API：

~~~ts
app.post("/analyze", async (req, res) => {
  const task = await db.createTask({
    documentId: req.body.documentId,
    status: "PENDING",
  });

  void analyzeDocument(task.id);

  res.status(202).json({ taskId: task.id });
});
~~~

这里的数据库写入已经成功，但并不等于系统具备可靠执行能力。至少有两个故障窗口：

~~~text
窗口 A：数据库写入完成、异步函数尚未真正启动
INSERT task → COMMIT
        ↓
API 进程崩溃
        ↓
分析函数未启动
        ↓
任务记录仍是 PENDING，但没有消费者发现它

窗口 B：异步函数已开始、业务还没有完成
API 创建 Job → analyzeDocument(taskId) 开始调用模型
        ↓
API 进程崩溃
        ↓
尚未完成的 Promise 消失
        ↓
Job 记录仍在，但未自动恢复处理
~~~

若 API 只是把任务置为 RUNNING，却没有失联检测，那么窗口 B 又会演变为“数据库永远显示 RUNNING”。**持久化记录不是执行程序，重启进程也不会自动恢复上次的 JavaScript 调用栈。**

所以“可恢复任务”的标准不是看表里有没有一行，而是看发生进程故障后，是否有**独立恢复循环**能够重新找到并处理这行任务。

### 【把生产者和消费者拆开，建立独立的任务生命周期】

将任务系统拆成三个职责：

~~~text
Producer（API：任务生产者）
  ↓ 校验请求 / 持久化任务行 / 返回 taskId
PostgreSQL Job Table（持久化的待办与任务状态）
  ↓ 独立 Worker 定期查找可以领取的任务
Worker（消费者：Claim → Execute → Confirm）
  ↓ 调用 DocumentAnalysisWorkflow
业务数据库或对象存储保存报告
  ↓ 持久化业务任务终态
前端通过 taskId 读取状态
~~~

API 的业务完成条件是“任务已经被可靠接受”，而非“报告已经生成”；Worker 的完成条件是“规定的业务处理结果被持久保存，并形成可以查询的明确终态”。

最简持久化状态模型：

~~~sql
CREATE TABLE analysis_tasks (
  id UUID PRIMARY KEY,
  document_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING',
  attempts INT NOT NULL DEFAULT 0,
  available_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  locked_at TIMESTAMPTZ,
  locked_by TEXT,
  lease_version BIGINT NOT NULL DEFAULT 0,
  result_ref TEXT,
  last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
~~~

这里的字段不是所有业务都必须照抄的固定标准，而是用来建立概念对应：

| 字段 | 回答的问题 |
| --- | --- |
| id / document_id | 这项任务是谁、需要处理哪份文档？ |
| status | 任务目前是等待、执行中、成功、失败还是等待重试？ |
| available_at | 现在是否允许执行，还是等待退避时间过去？ |
| attempts | 已经尝试过几次，是否超过重试上限？ |
| locked_at / locked_by | 哪个 Worker 在什么时候领取它？ |
| lease_version | 一次新领取的版本号，可用于拒绝旧持有者覆盖新结果 |
| result_ref / last_error | 成功时结果在哪里，失败时原因是什么？ |

常见生命周期：

~~~text
PENDING（等待）
  ↓ Worker 领取
RUNNING（执行中）
  ├─ 保存结果成功 → SUCCEEDED（成功）
  ├─ 可恢复失败 → RETRY_WAIT（等待下一次尝试）
  │                   ↓ 到时重新可领取
  └─ 不可恢复 / 重试耗尽 → FAILED（终态失败）
~~~

实际状态名与 Retry 是否单独建状态可以根据项目设计；核心在于**有可追踪的生命周期与领取资格规则**。

### 【Worker 通过持续轮询发现任务，而不是依赖 API 当时成功调用一个函数】

最简单的 Worker 可以是一个独立的 Node.js 进程：

~~~ts
async function startWorker() {
  while (true) {
    const task = await claimNextTask(); // 从数据库原子领取一项可执行工作

    if (!task) {
      await delay(1000); // 暂时没有任务，稍后再次检查
      continue;
    }

    try {
      const report = await analyzeDocumentWorkflow(task.document_id);
      await saveReportAndCompleteTask(task, report);
    } catch (error) {
      await recordFailureAndScheduleRetry(task, error);
    }
  }
}
~~~

上面是结构化伪代码，函数必须由应用实现，不代表数据库直接提供这些 JavaScript API。

它和 API 内 void Promise 的本质差别是：Worker 是一个专门寻找、领取任务的**长期运行消费者**。只要数据库里还有符合领取条件的任务，Worker 就可以重新发现它，而不依赖原先发起 HTTP 的进程或客户端连接。

例如：

~~~text
T1：API 把 Task A 写入 PostgreSQL
T2：API 崩溃，尚未启动任何后台函数
T3：新启动的 Worker 轮询 tasks 表
T4：发现 Task A 仍然 PENDING
T5：安全领取后开始执行
~~~

这条机制并不要求有独立的消息队列产品。**数据库任务表 + 持续工作的 Worker，本身已经是一种 Database-backed Job Queue。**

不过此时又出现了新问题：两个 Worker 如果同时查到同一条 PENDING 任务，会不会都开始处理？需要引入任务领取权。

### 【任务领取必须是原子操作，多个 Worker 不能只读状态然后自行执行】

不安全的写法：

~~~text
Worker A: SELECT ... WHERE status='PENDING' → 读到 Task A
Worker B: SELECT ... WHERE status='PENDING' → 也读到 Task A
Worker A: 开始分析
Worker B: 也开始分析
~~~

如果先 SELECT 再在应用中随意 UPDATE，两个请求之间就可能存在竞争窗口。需要让**选中候选任务和标记处理所有权成为一个受数据库并发控制保护的领取操作**。

PostgreSQL 可使用 FOR UPDATE SKIP LOCKED：

~~~sql
WITH candidate AS (
  SELECT id
  FROM analysis_tasks
  WHERE
    (status = 'PENDING' AND available_at <= now())
    OR
    (status = 'RETRY_WAIT' AND available_at <= now())
    OR
    (status = 'RUNNING' AND locked_at < now() - INTERVAL '5 minutes')
  ORDER BY available_at, created_at
  LIMIT 1
  FOR UPDATE SKIP LOCKED
)
UPDATE analysis_tasks AS task
SET status = 'RUNNING',
    attempts = attempts + 1,
    locked_at = now(),
    locked_by = $1,
    lease_version = lease_version + 1,
    updated_at = now()
FROM candidate
WHERE task.id = candidate.id
RETURNING task.*;
~~~

这段 SQL 是最小设计示例，不是当前 Browser Monitor 已经完整实现的任务 Schema。它展示了：

1. 查询符合资格的待执行或需要回收的任务。
2. FOR UPDATE 锁定候选行，SKIP LOCKED 避开别的事务已经锁住的候选行。
3. 将领取和更新执行所有权收在同一个原子 SQL 操作中，并返回本次任务和领取版本。
4. PostgreSQL 事务提交以后，其他 Worker 看到的已是 RUNNING 记录，正常情况下不会再按 PENDING 资格领取同一任务。

PostgreSQL 官方明确把 SKIP LOCKED 作为适合多个消费者访问 Queue-like Table 时减少锁等待的机制；它会跳过已经被锁定的行，因此不适合作为普通一致性查询的一般替代。[PostgreSQL SELECT：SKIP LOCKED](https://www.postgresql.org/docs/current/sql-select.html)。

**事务内的行锁与跨事务的业务租约必须分开。** 这里的 FOR UPDATE 行锁通常只维持到 Claim 事务结束，不能让数据库事务一直开着等待模型处理两分钟。后续用 locked_at / locked_by / lease_version 等已提交字段表达任务处理权，这属于应用层的 Lease / Owner 状态，不等于数据库行锁一直存在。官方也指出行级锁在事务结束时释放。[PostgreSQL Explicit Locking](https://www.postgresql.org/docs/current/explicit-locking.html)。

### 【Worker 崩溃后重新领取任务，需要识别失联而不是永远等待 RUNNING】

任务已经被标记 RUNNING，Worker 随后崩溃：

~~~text
Worker A 原子 Claim Task A
   ↓
task.status = RUNNING
task.locked_by = Worker A
task.locked_at = 10:00
   ↓
Worker A 崩溃
   ↓
数据库中的任务仍为 RUNNING
   ↓
10:05 以后，恢复扫描判定锁定时间超过阈值
   ↓
Worker B 有条件地重新 Claim
   ↓
Task A 开始重新执行
~~~

上例只是固定超时的示意策略。它**不代表任务超过五分钟就证明旧 Worker 已经死亡**：旧 Worker 可能只是执行很慢、网络暂时阻塞，甚至还在处理外部请求。如果 Worker B 提前重新领取，可能出现两个 Worker 同时操作同一业务任务。

因此，长任务应考虑：

- **Lease Renewal（续租）**：处理中的 Worker 定期更新自己的有效期；只有超过约定时间仍无法续租，才进入可回收范围。
- **Ownership Check（所有权校验）**：任务完成或写回任务状态时验证 locked_by 与 lease_version，拒绝失去所有权的旧 Worker 覆盖新 Worker 的状态。
- **Business Idempotency（业务幂等）**：即使同一任务重新执行，也不能重复创建不允许重复的业务结果。所有权校验只能保护数据库状态更新，无法天然撤销已经发生的外部 API 副作用。

这些机制为什么不能省略，要通过下一步的故障窗口来验证。

### 【恢复领取不等于只执行一次：报告已写入但成功状态未写时仍可能重复】

假设 Worker 调用 LLM 已经生成报告，并成功写入业务库，但尚未更新任务 SUCCEEDED 就崩溃：

~~~text
Worker A：已持久化 report
             ↓
        Worker A 崩溃
             ↓
      task.status 仍为 RUNNING
             ↓
  超时以后 Worker B 重新领取
             ↓
  需要判断 report 是否已经存在
             ↓
  已完成：确认终态，避免再次生成
  未完成：继续执行或安全重试
~~~

如果结果与任务状态都保存在同一个 PostgreSQL 数据库，可尽量把“报告写入 + 任务成功状态更新”纳入同一个数据库事务；如果报告在对象存储或模型调用发生在外部系统，则依靠 taskId、唯一键、结果引用和对账机制来处理非原子提交。即使有任务锁，外部 LLM 请求成功但结果未保存时崩溃，也可能再次调用并产生重复费用。

因此系统通常追求**任务至少有机会继续被处理，并让重复执行不会破坏最终业务结果**，而不是假设每个任务天生只会执行一次。

### 【数据库 Job Queue 与专业消息系统解决的是同一上位问题的不同部分】

至此可以形成一个判断：

~~~text
只用 Promise
  → 不等待 HTTP，但工作可能只存在于 API 进程

Promise 前先 INSERT Job
  → 保留任务事实，但未必有人在故障后恢复执行

PostgreSQL Job + 独立 Worker
  → 能扫描、领取、执行、重试和恢复；须自行维护调度可靠性

BullMQ / 专门的任务队列
  → 提供更成熟的 Job 处理与调度 API，业务仍需幂等

Kafka
  → 持久化事件日志与多组消费进度；业务 Job 终态和步骤 Checkpoint 仍需设计
~~~

**不要推导成“用了 Kafka 就更可靠”或“数据库任务表一定不适合高并发”**。可靠性还取决于持久化配置、处理协议、重试和业务保证；是否引入消息中间件要看任务吞吐、消费模型、成本与运维边界。

当前 [Browser Monitor 项目异步任务源码专题](https://github.com/cxDlogver/browser-monitor/blob/main/docs/异步任务与Worker可靠消费体系源码学习.md) 可作为本讲的真实实例：它在 PostgreSQL 的 outbox_tasks 中保存任务状态，通过 FOR UPDATE SKIP LOCKED 领取；Worker 崩溃时按超时条件重新领取，投影业务通过唯一键与事务处理重复执行风险。项目源码属于具体实现证据，而不是所有系统必须照搬的模板。

### 【面试回答：数据库有了任务记录，为什么仍需要独立 Worker】

可以按“已有保证 → 缺失能力 → 最小完整方案”回答：

第一，把 Job 写入数据库只完成持久化交接，表示系统有一份待执行工作记录，但数据库不会自动恢复原先 API 进程中的 Promise。

第二，需要一个独立 Worker 持续查询可执行任务，并通过数据库事务和行锁原子领取，避免多个 Worker 同时把同一个 PENDING Task 当作自己的工作。

第三，还需要在 Worker 崩溃时通过 Lease/超时回收重新开放执行权，并通过业务幂等和结果对账处理重复执行。任务报告及终态必须持久化，不能以“异步函数已经启动”作为业务成功。

最后，对于任务量和调度复杂度可控的场景，PostgreSQL Job Table + Worker 就是一套可行的可靠异步实现；BullMQ 或 Kafka 不是强制前提。业务发展到独立消息分发、复杂调度或多种消费者时，再根据工作模型决定是否引入专业消息基础设施。

## 3. 下一讲追问：多个 Worker 为什么还需要任务领取权与 Lease

> **思考题（此处暂不提供答案）：** Worker A 在 10:00 领取了一项需要十分钟才能完成的任务，数据库记录 locked_at=10:00。系统规定“超过五分钟未更新 locked_at 的 RUNNING 任务可以被重新领取”。10:06 时 Worker B 将同一任务重新领取，但 Worker A 实际上没有崩溃，仍在调用模型。此时可能出现什么问题？如何设计才更安全？

下一讲只围绕 Worker 的原子 Claim、数据库行锁、业务 Lease / Renewal、Owner/Fencing，以及它们与幂等的关系展开，先理解运行机制，再进入 BullMQ 与 Kafka 的对应实现。


## 4. 参考资料与主文档关联

1. [Node.js Learn：The Node.js Event Loop](https://nodejs.org/en/learn/asynchronous-work/event-loop-timers-and-nexttick)：运行时异步 I/O 和事件循环行为。
2. [MDN HTTP：202 Accepted](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Status/202)：HTTP 请求已接受但尚未完成。
3. [服务端异步任务与消息处理体系](../F-服务端异步任务与消息处理体系.md)：可靠交接、Task State、Claim、Lease、Retry 与 Kafka 的更完整通用知识，供后续章节按需展开。
4. [服务端可靠性体系](../F-服务端可靠性体系.md)：进程崩溃、可靠性承诺和恢复目标。
5. [Browser Monitor 数据库 Outbox 实现](https://github.com/cxDlogver/browser-monitor/blob/main/docs/异步任务与Worker可靠消费体系源码学习.md)：可对照 PostgreSQL Job Table 与独立 Worker 的实际工程机制。
6. [PostgreSQL SELECT / SKIP LOCKED](https://www.postgresql.org/docs/current/sql-select.html)：多 Worker 领取候选任务时的行级并发协调。
7. [PostgreSQL Explicit Locking](https://www.postgresql.org/docs/current/explicit-locking.html)：行级锁与事务生命周期边界。

> 本文为学习进程中的**独立草稿**，不覆盖正式通用文档，也不修改源代码。按逐节讨论方式继续追加，下一讲保留一个核心思考题供作答。
