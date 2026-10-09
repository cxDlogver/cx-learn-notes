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

## 3. Worker 的 Claim、Lease、Renewal 与 ACK 决定任务能否安全恢复

**本讲核心问题：** Worker A 已领取任务但可能崩溃、暂停或网络断连，系统如何重新把任务交给 Worker B，同时避免两个 Worker 都认为自己拥有有效处理权？

**结论：** Claim（原子领取）决定谁最初获得处理权；Lease（租约）决定处理权的有效时间；Renewal（续租）让正常执行的长任务继续保持有效；Fencing（所有权世代隔离）拒绝旧执行者对状态和业务结果的非法写回；ACK（消费确认）则决定任务什么时候真正结束。它们不能互相替代。

### 【五分钟固定超时会产生错误接管，因为超时不意味着 Worker 已死亡】

沿用上一讲的十分钟文档分析任务。Worker A 在 10:00 领取任务，系统仅设置 locked_at=10:00，规定超过五分钟未更新即可回收：

~~~text
10:00  Worker A 领取 Task A（locked_by=A, locked_at=10:00）
  ↓
10:01  A 正在调用外部大模型，业务正常运行
  ↓
10:06  Worker B 查询：RUNNING 且锁定超过五分钟
  ↓
       B 重新领取并再次调用模型
  ↓
10:10  A、B 可能同时准备写入分析报告
~~~

此时任务可能带来重复模型费用、重复外部副作用和报告互相覆盖。事实上，只能确认 A 在这段时间没有更新数据库活跃状态，**无法由此证明 A 已经停止执行**。这就是引入有效期、续租和写入隔离的动机。

### 【只修改 RUNNING 无法避免重复领取，原因是 Worker 可能已在修改前读取到 PENDING】

本节将“多个 Worker 同时领取同一项任务”还原为具体命令顺序。需要先把目标定义清楚：

- **业务不变量**：在一次正常的 PENDING → RUNNING 领取竞争中，只能有一个 Worker 返回“领取成功”；其他 Worker 应得到“领取失败”，不得据此执行同一任务。
- **状态信息**：PENDING 表示可领取，RUNNING 表示当前已有执行者；还应保存 owner / token 等能识别领取者的信息。
- **判断依据**：不能只看 Redis 最终是否为 RUNNING，还要看哪个 Worker 真正成功完成了条件状态转换。两个 Worker 都执行 SET RUNNING、最终状态看起来正确，却可能已经同时开始执行业务。

**第一种时间线：只有一个 Worker，或者第二个 Worker 在修改后才读取，当然不会重复领取。**

~~~text
初始：task:A.status = PENDING
  ↓
A：HGET task:A status → PENDING
  ↓
A：HSET task:A status RUNNING
  ↓
B：HGET task:A status → RUNNING
  ↓
B：判断不可领取，放弃
~~~

这证明**RUNNING 状态是有作用的**，但这个顺序只是一种可能，并不是并发系统能普遍保证的顺序。

**第二种时间线：两个 Worker 都在任意一个修改发生之前读取，二者都会误判。**

~~~text
初始状态：task:A.status = PENDING

时间    Worker A                          Redis                 Worker B
T1      HGET status ────────────────────→ PENDING
T2                                                          HGET status ─→ PENDING
T3      本地判断“允许领取”
T4                                                          本地判断“允许领取”
T5      HSET status RUNNING ────────────→ OK
T6                                                          HSET status RUNNING ─→ OK
T7      开始 executeTask(A)                                  开始 executeTask(A)

结果：Redis 中 status = RUNNING，看起来正常；
      但 Worker A、B 都认为自己完成了领取，实际业务重复执行。
~~~

这种问题叫做 **Check-Then-Act Race（检查后执行竞态）**，即检查条件和执行状态修改之间存在其他执行者能够插入的窗口。

下面是**错误示例，不能用作可靠的领取代码**：

~~~ts
// Worker A / B 同时运行此代码。
const status = await redis.hGet("task:A", "status");

if (status === "PENDING") {
  // 这条修改命令本身是原子的，但不保证 status 仍为 PENDING。
  await redis.hSet("task:A", "status", "RUNNING");

  // 两个 Worker 都可能进入这里。
  await executeTask("A");
}
~~~

为什么 Redis 的“单条命令原子性”没有救这个问题？因为 Redis 确实**逐条**执行了四次请求：A.GET、B.GET、A.SET、B.SET，没有任何单条命令被同时执行或从内部被拆开。问题在于**客户端把一次业务领取拆成了两次以上彼此独立的 Redis 请求**，Redis 没有理由知道第二次 HSET 应该依赖第一次 HGET 的结果。

再进一步，即使把状态和 owner 改为两条命令，也可能暴露中间状态：

~~~text
A：HSET task:A status RUNNING     （成功）
B：HGET task:A status → RUNNING   （此时 B 不会领取）
B：HGET task:A owner → nil        （读取到未完成的状态）
A：HSET task:A owner worker-A     （成功）
~~~

这个例子说明两种不同风险：**检查与修改之间的竞态**，以及**多字段更新之间的中间状态**。后面不同机制要分别解决这些问题。

真正需要实现的领取规则不是“Worker 发现 PENDING 后执行 SET”，而是：

> **只有当任务在状态修改发生的那一刻仍是 PENDING，系统才把它转换为 RUNNING 并登记 owner；完成这一状态转换的执行者才得到成功响应。**

**状态表示的是业务事实；原子条件转换才是并发领取的正确边界。**

### 【PostgreSQL 的 FOR UPDATE 通过事务行锁协调多 Worker 的领取竞争】

在 Redis 中，Lua 能把“读取 → 判断 → 修改”放在一个不可穿插的执行单元内；在 PostgreSQL 中，也可以利用行锁让两个事务不能同时对同一条任务完成冲突性领取。这里最常见的语法就是 **SELECT ... FOR UPDATE**。

**1. 基本语法表示查询时对结果行加锁，而不是立刻修改数据**

~~~sql
BEGIN;

SELECT id, status
FROM analysis_tasks
WHERE id = 'task-a'
FOR UPDATE;

-- 在同一事务内判断 status，符合 PENDING 时修改。
UPDATE analysis_tasks
SET status = 'RUNNING', locked_by = 'worker-A'
WHERE id = 'task-a'
  AND status = 'PENDING';

COMMIT;
~~~

执行含义：

- SELECT 先查出所需数据；FOR UPDATE 请求对**命中的行**取得行级锁。它本身不会把 status 自动改为 RUNNING。
- 同一事务在判断状态并完成 UPDATE 之前持有该行锁；对相同行请求冲突行锁或尝试更新的事务，通常必须等锁释放。
- COMMIT 或 ROLLBACK 结束事务后，行锁随之释放。如果在自动提交模式下单独执行 SELECT ... FOR UPDATE，语句结束就释放锁，无法继续保护下一条独立的 UPDATE，因此领取时必须明确控制事务边界。
- PostgreSQL 普通 SELECT 通常仍可读取 MVCC 可见版本。**FOR UPDATE 并不意味着其他线程完全不能访问该行，也不等于关闭数据库读能力。**

官方原理：[PostgreSQL Explicit Locking — Row-level Locks](https://www.postgresql.org/docs/current/explicit-locking.html)。

**2. 两个 Worker 同时竞争同一任务时，锁具体怎样发挥作用**

假设初始状态 task-a.status=PENDING，Worker A 和 Worker B 都以 PostgreSQL 默认的 READ COMMITTED 隔离级别领取任务：

~~~text
时间           Worker A                              Worker B

T1             BEGIN                                 BEGIN
T2             SELECT ... WHERE status='PENDING'
               FOR UPDATE
               → 读取 task-a，获得行锁
T3                                                   SELECT ... WHERE status='PENDING'
                                                     FOR UPDATE
                                                     → 命中同一行，但无法取得锁，等待 A
T4             UPDATE status='RUNNING'
T5             COMMIT → 行锁释放
T6                                                   等待结束、重新判断查询条件
                                                     → 当前行已为 RUNNING
T7                                                   得不到符合 PENDING 的任务
                                                     → 不可领取
T8                                                   COMMIT
~~~

因此，Worker A 的事务不会因为 B 同时进行查询就被任意打断；B 的**冲突行锁/更新**需要等待 A。READ COMMITTED 下，B 等待事务结束后，会依据新的行版本重新检查查询条件，从而不会继续把该 RUNNING 任务当作 PENDING 来领取。在 REPEATABLE READ 或 SERIALIZABLE 等其他隔离级别下，冲突可能以需重试的序列化错误表现，不能把上面的等待后行为直接套用到所有隔离级别。

这里实现“只能领取一次”依赖**锁保护下的条件判断和更新**。如果 B 没有检查 status 就在锁释放后无条件执行自己的 UPDATE，它仍可能覆盖 owner；因此锁本身不会替业务决定哪些状态转换是合法的。

**3. FOR UPDATE、NOWAIT、SKIP LOCKED 解决的是不同的等待策略**

| 语法 | 遇到已被其他事务锁定的目标行 | 适用场景 |
| --- | --- | --- |
| FOR UPDATE | 默认等待冲突锁释放 | 必须处理特定记录，允许等待 |
| FOR UPDATE NOWAIT | 无法立刻获得行锁就报错，而不是排队等待 | 业务需要快速失败和自行重试 |
| FOR UPDATE SKIP LOCKED | 跳过已锁定的候选行，继续查找其他行 | 多 Worker 从待办列表领取下一项工作 |

~~~sql
SELECT id
FROM analysis_tasks
WHERE status = 'PENDING'
ORDER BY created_at
LIMIT 1
FOR UPDATE SKIP LOCKED;
~~~

例如队列已有 Task A、B、C：A 被 Worker 1 的领取事务行锁锁住时，Worker 2 使用 SKIP LOCKED 可以跳过 A，尝试领取 B，不必因 A 被占用就停下。这比多个 Worker 全都等待队首同一行更适合数据库 Job Queue。

注意 SKIP LOCKED 会故意跳过当前不可取得锁的候选，因此**不是普通数据查询所追求的一致性视图**；它适合队列竞争，不应无条件用来查询报表、统计所有待办任务。此外它解决的是行锁等待，不保证完全不会受到表级锁等其他锁冲突影响。

参考：[PostgreSQL SELECT — Locking Clause](https://www.postgresql.org/docs/current/sql-select.html)。

**4. 实际领取时把选中任务与更新状态组合成同一条 SQL**

只用 SELECT FOR UPDATE 取得行锁，接下来仍应在事务内执行 UPDATE 才算完成领取。对于一批待办任务，常用下一节的 WITH candidate ... FOR UPDATE SKIP LOCKED + UPDATE ... RETURNING，将“选择、协调并发和状态变更”合并到一条语句：

~~~sql
WITH candidate AS (
  SELECT id
  FROM analysis_tasks
  WHERE status = 'PENDING'
  ORDER BY created_at
  LIMIT 1
  FOR UPDATE SKIP LOCKED
)
UPDATE analysis_tasks t
SET status = 'RUNNING',
    locked_by = $1,
    locked_at = now()
FROM candidate
WHERE t.id = candidate.id
RETURNING t.id, t.locked_by;
~~~

这段示意仅领取初始 PENDING 任务；生产系统还要按需考虑 available_at、失败重试、停滞任务回收及 Lease。Worker 应当根据 RETURNING 是否返回任务来决定是否开始业务执行，而不是“发出 SQL 就认为一定领取成功”。

对于**已经明确知道 ID 的任务**，如果只需做一次条件状态转换，甚至可以直接：

~~~sql
UPDATE analysis_tasks
SET status = 'RUNNING',
    locked_by = $1
WHERE id = $2
  AND status = 'PENDING'
RETURNING id;
~~~

PostgreSQL UPDATE 自身就会参与必要的并发协调。只有成功从 PENDING 改成 RUNNING 的事务才能得到对应的 RETURNING 行。因此，**已知 ID 的条件领取不一定必须显式 SELECT FOR UPDATE；需要从大量待办任务中并发查找、分散领取时，SKIP LOCKED 更有价值。**

**5. 行锁只保护领取事务；不要用十分钟数据库事务包围整个 LLM 执行**

~~~text
BEGIN / SELECT FOR UPDATE / UPDATE / COMMIT
                 ↓
        Claim 阶段已完成
                 ↓
     数据库事务结束、行锁释放
                 ↓
     Worker 调用 LLM（可能耗时十分钟）
                 ↓
     根据持久化的 owner / Lease / 世代判断是否仍有写回权
                 ↓
     保存结果并确认业务完成
~~~

如果让数据库事务一直保持开启直到外部模型完成，会造成不必要的长时间锁持有、事务资源占用与其他维护成本。**行锁保证的是“领取时的并发安全”，不是“Worker 在未来十分钟内永远拥有任务”。** 因而本讲后面的 Lease（租约）、Renewal（续租）和 Fencing（旧执行者隔离）仍然不可省略。

**本节与 Redis 的对应关系：** PostgreSQL 用行锁、条件 UPDATE、事务控制领取阶段的竞态；Redis 用合适的原子命令、Lua 或 WATCH + MULTI/EXEC 实现同一业务目标。共同要求都是**只有完成合法的 PENDING → RUNNING 状态转换，才算领取成功**，而不是仅看到 RUNNING 就认为竞争安全。

### 【Claim 需要原子地选择和更新任务；数据库行锁不等于长任务租约】

不安全的领取过程是两个 Worker 分别 SELECT 出同一条 PENDING 记录，然后各自开始执行。PostgreSQL 可用行锁和条件更新，把查询候选和更新处理权合并：

~~~sql
WITH candidate AS (
  SELECT id
  FROM analysis_tasks
  WHERE status = 'PENDING'
  ORDER BY created_at
  LIMIT 1
  FOR UPDATE SKIP LOCKED
)
UPDATE analysis_tasks AS t
SET status = 'RUNNING',
    locked_by = $1,
    lease_version = lease_version + 1,
    locked_at = now()
FROM candidate
WHERE t.id = candidate.id
RETURNING t.*;
~~~

解释这一 SQL 的顺序：

1. 选择当前符合领取条件的候选 Job。
2. FOR UPDATE 对候选行加行锁；SKIP LOCKED 在另一个 Claim 事务已锁住该行时跳过它。
3. 在同一数据库语句中更新 status、owner、领取世代，返回领取到的任务。
4. Claim 事务提交，数据库行锁即告释放。

**数据库行锁只保护 Claim 事务的原子性，不会随着十分钟业务执行一直占有。** 实际执行阶段的归属，需要持久化 owner 和 Lease 字段继续维护。参考：[PostgreSQL SELECT](https://www.postgresql.org/docs/current/sql-select.html)、[Explicit Locking](https://www.postgresql.org/docs/current/explicit-locking.html)。

### 【PostgreSQL 与 Redis 的共同目标是原子条件转换，而不是禁止其他人读取】

在数据库中，针对**已知任务 ID**，甚至不一定需要先 SELECT 再 UPDATE：

~~~sql
UPDATE tasks
SET status = 'RUNNING',
    worker_id = $1
WHERE id = $2
  AND status = 'PENDING'
RETURNING id;
~~~

两个 Worker 同时执行时，数据库会协调同一行的冲突更新，只有成功改变 PENDING 状态的操作能够返回该任务；另一个更新因条件不再满足而无法领取。应用必须根据 RETURNING 是否有行判断成功。对于**从一批待办任务中寻找可领取记录**，上一节展示的 FOR UPDATE SKIP LOCKED 能帮助多 Worker 避免等待彼此正在锁定的候选行。

这里必须纠正一个误区：**FOR UPDATE 不是让其他 Worker 完全无法读取这条记录。** 在 PostgreSQL 常见的 MVCC 隔离级别下，普通 SELECT 仍可以读取某个可见版本；被约束的是相同行上相冲突的锁定与更新行为。我们要保证的是“只有一个人成功 Claim”，而不是“只有一个线程能访问数据”。

Redis 提供不同形式的条件原子操作。对只需要“Key 不存在才创建”的锁场景，可用：

~~~redis
SET task:A:claim worker-A NX PX 30000
~~~

- NX：只有锁 Key 当前不存在时才能写入成功。
- PX：指定有效期，避免执行者永久占用锁（例中三十秒仅为演示，实际租期要按业务设计）。
- 调用方只有收到成功响应才获得锁；其他 Worker 获得空响应不能执行业务。

不过，**抢到 task:A:claim 锁 Key 不自动等于成功把另一个 task:A Hash 从 PENDING 改为 RUNNING**。如果“创建锁”和“修改任务状态”又分成两个 Redis 请求，中间仍会出现故障窗口。复杂的队列领取必须把关联状态组合进一个正确的原子操作，或者将锁与任务状态维护为一致的协议。

另外，如果队列本身用 Redis List 保存待处理任务，可用单条 LMOVE 实现“从 waiting 移出 + 放入 active”：

~~~redis
LMOVE waiting active RIGHT LEFT
~~~

与先 RPOP waiting 再 LPUSH active 相比，LMOVE 在一条命令里实现原子移动，其他 Worker 正常消费时不能重复移出同一个列表元素。注意列表元素仍可能由于业务重复入队、超时回收或人工恢复再次出现；active 中的项目还需要完成确认和失联恢复。这是**数据结构层面的原子领取**，不是任何 Job 都必须在 Hash 中设置 RUNNING。官方依据：[Redis SET](https://redis.io/docs/latest/commands/set/)、[Redis LMOVE](https://redis.io/docs/latest/commands/lmove/)。

### 【MULTI/EXEC 保证提交后连续执行，却不能自动解决提交前读取旧状态的问题】

Redis MULTI/EXEC 的运行顺序：

~~~text
客户端发送 MULTI
    ↓
命令进入事务队列，但尚未真正执行
    ↓
客户端发送 EXEC
    ↓
Redis 按排队顺序执行事务内命令
    ↓
执行期间不插入其他客户端的普通命令
    ↓
EXEC 返回结果
~~~

这提供了**执行阶段的隔离**。例如 MULTI → HSET status RUNNING → HSET owner A → EXEC，会使两个 HSET 在 EXEC 阶段连续执行，其他客户端不会在这两条命令之间读取到中间状态。

但如果所有判断都发生在 MULTI 之前，两个 Worker 仍然能够各自基于旧值构造事务：

~~~text
初始：status = PENDING

A：HGET status → PENDING
B：HGET status → PENDING

A：MULTI
A：HSET task:A status RUNNING owner worker-A（QUEUED）
A：EXEC → 成功，返回更新行数

B：MULTI
B：HSET task:A status RUNNING owner worker-B（QUEUED）
B：EXEC → 同样执行成功

最终：owner = worker-B
但 A、B 都可能据此认为自己完成领取并进入业务。
~~~

**两个事务都不被穿插，不代表两个事务之间存在“检查 PENDING 才能改成 RUNNING”的业务约束。** MULTI/EXEC 不是自动的 Compare-And-Set；在 MULTI 内部排队 HGET 也只会收到 QUEUED，不能在客户端立即得到结果并据此决定下一条排队命令。

因此这里需要额外的条件机制：WATCH 乐观并发控制、Lua 脚本，或某些场景下可直接表达条件的原子命令。

### 【WATCH + MULTI/EXEC 让客户端先读取再修改，同时检测是否有人抢先修改】

WATCH 可以在客户端读取之前监视某个 Key；如果该 Key 在 EXEC 之前被其他执行者改动，Redis 会让 EXEC 取消整个事务，而不是执行其中的修改命令。

示意逻辑（同一连接中执行；实际代码必须使用能绑定同一连接的客户端 API）：

~~~text
A：WATCH task:A
A：HGET task:A status → PENDING

B：WATCH task:A
B：HGET task:A status → PENDING

A：MULTI
A：HSET task:A status RUNNING owner worker-A（QUEUED）
A：EXEC → 提交成功，status 已为 RUNNING

B：MULTI
B：HSET task:A status RUNNING owner worker-B（QUEUED）
B：EXEC → 返回空结果：监听的 Key 已被 A 修改，本次事务取消

B：不得开始处理；可重新读取状态并决定是否再尝试。
~~~

这里 B **不是在 A 执行事务时被阻止发送命令**；A 和 B 都可以发出 WATCH 和 GET。WATCH 的原理是**乐观冲突检测**：如果读后到提交前发生了相关修改，就不允许基于过期读取结果提交。

补充两个边界：
1. WATCH 必须发生在依赖该状态的读取**之前**，并且事务执行应使用同一 Redis 连接上下文；如果先 GET，后 WATCH，两者之间仍有竞态。
2. WATCH 检测的是监视 Key 的变化，并不能自动检查“status 是否为 PENDING”。客户端仍要正确判断状态，而且 EXEC 取消后要正确处理失败，不能当作领取成功。

官方依据：[Redis Transactions：Optimistic Locking Using Check-and-Set](https://redis.io/docs/latest/develop/using-commands/transactions/#optimistic-locking-using-check-and-set)。

### 【Redis MULTI/EXEC 的完整用法，以及 WATCH 为什么不能单独保证领取】

先通过 redis-cli 看清事务基本行为：

~~~redis
MULTI
HSET task:1001 status RUNNING
HSET task:1001 owner worker-A
EXEC
~~~

MULTI 返回 OK；两次 HSET 在提交之前返回 QUEUED，此时只是排队；EXEC 才执行队列中的命令并按顺序返回结果。**在 EXEC 内部两次 HSET 之间，Redis 不执行其他客户端的普通命令。** 但这份事务没有检查 PENDING，别的 Worker 也可以先后执行同一份事务，覆盖 owner，因此只依靠 MULTI/EXEC 不满足任务领取约束。

如果排队后不想执行，可用 DISCARD 清空事务队列；如果 EXEC 中某条命令发生运行时错误，其他命令仍可能成功，Redis 不做通用的 ACID 式回滚。注意 **Pipeline 不是 MULTI/EXEC**：Pipeline 主要用于将多条网络请求批量发送、减少往返，不能把普通流水线当成隔离事务。

要在客户端判断 PENDING，同时检测该判断是否因并发修改而过期，使用下列完整流程：

~~~text
WATCH task:1001                   # 在读取之前建立监视
HGET task:1001 status             # 假设返回 PENDING
[客户端 if 判断 status == PENDING]
MULTI
HSET task:1001 status RUNNING owner worker-A
EXEC                              # 未发生修改则执行；已发生修改则取消
~~~

其中客户端 if 判断是应用程序中的代码，不是 redis-cli 命令。可以在两个 redis-cli 窗口中重现实验：

~~~text
窗口 A                             窗口 B
HSET task:1001 status PENDING
WATCH task:1001
HGET task:1001 status → PENDING
                                   HSET task:1001 status RUNNING owner worker-B
MULTI
HSET task:1001 status RUNNING owner worker-A → QUEUED
EXEC → (nil) [RESP2 中取消事务]
HGETALL task:1001 → owner 仍为 worker-B
~~~

B 的无条件 HSET 只是用来模拟并发修改；生产 Worker B 同样必须采用安全领取。**WATCH 不阻止 B 修改，而是让 A 的 EXEC 发现修改并取消事务。**

WATCH 的关键边界：

- 它监视 Key 的变化，不是持续向客户端推送变化，也不是锁住 Key。Key 过期、被驱逐也可能使事务取消；WATCH 不自动检查 status 是否为 PENDING。
- 正确顺序是 WATCH → 读取 → 客户端 if → MULTI → EXEC。单独 WATCH 后直接 HSET，并不会自动拒绝这个普通 HSET；单独 if 则无法发现读取后的竞争。
- WATCH 与后续 EXEC 必须在**同一个 Redis 连接**中执行。EXEC 无论成功还是因冲突取消，都会解除监视；DISCARD、UNWATCH、连接关闭也会清除监视。
- WATCH 后若没有 EXEC 或 UNWATCH，连接仍在且没有发生其他清理操作，监视状态会保留，但 Redis 不会主动向应用推送通知。放弃领取时应主动 UNWATCH。
- 冲突时 EXEC 在 RESP2 下返回 Nil，在 RESP3 下返回 Null；应用必须视为领取失败，按需重新读取、有限次重试，不能开始执行业务。

因此 WATCH **通常与 MULTI/EXEC 配合才能实现乐观条件提交**：客户端 if 负责判断业务资格，WATCH 负责检查从开始监视到 EXEC 期间是否发生修改。资料：[Redis Transactions](https://redis.io/docs/latest/develop/using-commands/transactions/)、[WATCH](https://redis.io/docs/latest/commands/watch/)、[UNWATCH](https://redis.io/docs/latest/commands/unwatch/)。

### 【Lua 把判断和修改放到 Redis Server 内，直接封闭 Check-Then-Act 竞争窗口】

另一种实现是把状态检查、资格判断、写入与成功响应全部放进同一个 Lua 脚本，而不是让 Worker 各自先读出状态再修改。

~~~lua
-- KEYS[1] = task:A，ARGV[1] = 当前 Worker 的唯一领取标识
local status = redis.call("HGET", KEYS[1], "status")

if status ~= "PENDING" then
    return 0
end

redis.call(
    "HSET",
    KEYS[1],
    "status", "RUNNING",
    "owner", ARGV[1]
)

return 1
~~~

两位 Worker 同时提交相同脚本时：

~~~text
Redis 最初：task:A.status = PENDING

A：提交 Lua（请求可能与 B 同时到达）
B：提交 Lua

Redis 先执行 A：
    读取 PENDING
    判断可以领取
    写 status=RUNNING, owner=A
    返回 1

Redis 才执行 B：
    读取 RUNNING
    判断不能领取
    返回 0

A：根据返回值 1 开始任务
B：根据返回值 0 放弃任务
~~~

**保证发生在哪一步？** Redis 在脚本执行期间不会穿插其他客户端命令，所以 B 无法在 A 的 HGET 与 HSET 之间执行自己的 HGET。A 的脚本一旦成功结束，B 读到的就是更新后的状态。

这是 Lua **原子执行（Atomic Execution）**的含义，也是这里的并发隔离效果。它不需要将 Redis 全局锁住直到十分钟的文档分析完成；脚本通常很快返回，之后所有 Worker 都可以继续访问 Redis，任务处理权必须由后续锁和 Lease 维护。官方依据：[Redis Scripting with Lua](https://redis.io/docs/latest/develop/programmability/eval-intro/)。

也要明确：Redis 的 Lua 原子执行是**在一个 Redis 执行环境内**对脚本中相关命令的不可穿插保证，不意味着跨 PostgreSQL、外部模型和 Redis 的操作天然成为一个全局事务。Redis Cluster 中脚本访问 Key 也需要遵守集群的 Key/Hash Slot 约束。

**可复现实验（演示单任务竞争，按顺序模拟两个 Worker）：**

~~~redis
HSET task:A status PENDING
EVAL "local s=redis.call('HGET',KEYS[1],'status'); if s~='PENDING' then return 0 end; redis.call('HSET',KEYS[1],'status','RUNNING','owner',ARGV[1]); return 1" 1 task:A worker-A
EVAL "local s=redis.call('HGET',KEYS[1],'status'); if s~='PENDING' then return 0 end; redis.call('HSET',KEYS[1],'status','RUNNING','owner',ARGV[1]); return 1" 1 task:A worker-B
HGETALL task:A
~~~

预期：第一次 EVAL 返回 1，第二次返回 0；最终 status 为 RUNNING、owner 为 worker-A。串行演示验证的是**状态条件转换**；实际同时请求时，Redis 也会选择一个脚本先执行，**不保证一定是 A 胜出**，但应仍只有一个脚本返回成功。

### 【Lua 的实际调用：EVAL、KEYS、ARGV、redis.call 与返回值】

前面已经给出完整的 Lua 领取脚本；本节进一步解释如何让 Worker 真正调用脚本、参数在哪里传递，以及为什么必须根据返回值决定是否执行任务。

Redis 使用 EVAL 执行脚本，命令形式是：

~~~text
EVAL 脚本内容 Key的数量 Key1 Key2 ... 普通参数1 普通参数2 ...
~~~

~~~redis
EVAL "return {KEYS[1], ARGV[1]}" 1 task:1001 worker-A
~~~

这个例子里，数字 1 表示传入一个 Redis Key：task:1001 对应 KEYS[1]；worker-A 是普通参数，对应 ARGV[1]。因此 Lua 可以复用同一份脚本处理不同任务，**无需为每项任务拼接新的 Lua 源代码**。

用于任务领取的脚本可以保存为 claim-task.lua：

~~~lua
-- KEYS[1] = task:1001
-- ARGV[1] = worker-A
local status = redis.call("HGET", KEYS[1], "status")

if status ~= "PENDING" then
  return 0
end

redis.call(
  "HSET", KEYS[1],
  "status", "RUNNING",
  "owner", ARGV[1]
)

return 1
~~~

Lua 的 local 定义局部变量；~= 是不等于；redis.call 负责在 Redis 服务端调用真正的 HGET/HSET 命令。因为脚本运行期间没有其他客户端的 Redis 命令穿插，HGET 与 HSET 之间不存在另一个 Worker 插入读取旧状态、提前修改的窗口。

以 Redis CLI 演示两位 Worker 先后尝试：

~~~redis
HSET task:1001 status PENDING owner ""
EVAL "local s=redis.call('HGET',KEYS[1],'status'); if s~='PENDING' then return 0 end; redis.call('HSET',KEYS[1],'status','RUNNING','owner',ARGV[1]); return 1" 1 task:1001 worker-A
EVAL "local s=redis.call('HGET',KEYS[1],'status'); if s~='PENDING' then return 0 end; redis.call('HSET',KEYS[1],'status','RUNNING','owner',ARGV[1]); return 1" 1 task:1001 worker-B
HGETALL task:1001
~~~

第一条 EVAL 返回 1，第二条返回 0，最后 status 为 RUNNING 且 owner 为 worker-A。如果请求真正同时到达，**无法预先决定谁先执行**，但只要状态初始化正确、两个 Worker 使用同一条件领取逻辑，就只有一位领取成功。

Node.js 中常见的 node-redis 调用写法：

~~~javascript
// workerId 与任务 Key 都来自当前 Worker 的输入
const result = await redis.eval(claimScript, {
  keys: ["task:1001"],
  arguments: [workerId]
});

if (result !== 1) {
  // 返回 0：当前不是 PENDING；未取得领取资格
  return false;
}

await executeTask("1001");
return true;
~~~

注意只有 EVAL **成功返回 1** 才可以认为取得任务。请求超时或连接中断造成的“结果未知”不能简单等同于领取失败；脚本可能已在 Redis 执行成功而响应丢失，恢复时应核对 owner、任务状态及领取标识，避免盲目重试业务副作用。

**Lua 与 WATCH 的对照**：WATCH 允许客户端先读取、执行 if 判断，再由 EXEC 检测中途变化；Lua 则让 if 本身在服务端的不可穿插脚本内执行，所以不需要再对该脚本的读写使用 WATCH。并不是 Lua 语法中的 if 比 JavaScript if 更强，而是**读取、判断、写入处于同一执行边界**。

**实际使用边界**：

- EVAL 发送完整脚本；SCRIPT LOAD + EVALSHA 可以按脚本摘要复用，脚本缓存会因重启或故障切换而丢失，需要按需重新加载。
- 脚本应短小；不要把长时间的 LLM 调用、业务等待放进 Redis Lua。Redis Cluster 中访问多 Key 还要遵守 Key 传参和 Hash Slot 约束。
- redis.call 发生运行时错误可能中止脚本，redis.pcall 可以接收错误；**脚本先前已经成功的 Redis 写入不会自动回滚**。
- 原子领取解决的是正常并发竞争的**状态一致性**。长任务执行期间仍要通过 Lease、Renewal、Fencing、ACK 和业务幂等解决崩溃、超时接管、结果重复处理等问题。

资料：[Redis Scripting with Lua](https://redis.io/docs/latest/develop/programmability/eval-intro/)、[EVAL 命令](https://redis.io/docs/latest/commands/eval/)。

### 【区分原子执行、隔离性、一致性以及事务错误回滚，避免概念重新混淆】

之前容易产生误解，是因为“原子性”被用于两种不同的语境：

| 概念 | 在本次 Redis 领取示例中实际回答什么 |
| --- | --- |
| Redis Atomic Execution（原子执行） | 能否将一次领取的多步逻辑作为不可被其他客户端命令穿插的单元执行？ |
| Isolation（隔离性） | 并发 Worker 能否观察到或介入另一个执行单元的中间过程？在 Redis Lua / EXEC 场景中，这与不可穿插执行描述的是同一保证的不同侧面。 |
| Business Consistency（业务一致性） | 所有 Worker 并发竞争结束后，是否仍满足“一次 PENDING 领取最多一个成功者”的业务约束？需要正确的条件判断和状态写入。 |
| ACID Transaction Atomicity（事务原子性） | 多步修改运行中出错时，之前成功的所有修改能否整体回滚，避免半成品？这不是 Redis Lua / EXEC 的通用保证。 |
| Durability（持久性） | Redis 异常重启后，成功写入的状态能否恢复？受 AOF/RDB 与部署策略影响，不由脚本隔离性直接决定。 |

**更准确的关系不是“原子执行 + 隔离性 + 一致性都是三种领取方法”，而是：**

~~~text
业务一致性目标：
同一任务的 PENDING → RUNNING 领取只能产生一个成功者
                     ↓
业务状态转换：
检查状态 + 判断领取资格 + 写入状态 + 返回结果
                     ↓
选择并发控制机制：
- Redis 单条原子命令（如果能直接表达条件）
- WATCH + MULTI/EXEC（冲突检测 + 事务提交）
- Lua（服务端读取、判断和修改）
                     ↓
机制提供的执行性质：
原子执行或并发冲突检测、隔离效果
                     ↓
维护业务一致性

与上述并列但独立的另一个问题：
执行中途失败，是否支持事务整体回滚？
Redis Lua / MULTI-EXEC 不提供通用的 SQL 式回滚。
~~~

不能理解为“只要使用 Lua 或 MULTI/EXEC，就自动满足任何业务一致性”。例如，把 HSET 改成无条件覆盖状态，即使 Lua 不可穿插，A 和 B 仍可能先后成功执行错误的业务逻辑，系统仍然会重复消费。

**Redis 事务与 Lua 的实际区别是：** MULTI/EXEC 将预先排好的命令在 EXEC 时连续执行，但单纯在客户端进行读后判断存在竞争窗口；WATCH 为该读后修改提供乐观冲突检测。Lua 将条件读取、判断和修改直接放入 Redis Server 端，所以通常更直接地表达原子条件更新。

### 【执行期间不被穿插，不代表失败时自动回滚先前写入】

下面用实际错误说明两种性质不能混淆。假设 Redis 的 counter Key 最初是字符串 hello：

~~~redis
SET task:status PENDING
SET counter hello

MULTI
SET task:status RUNNING
INCR counter
SET task:owner worker-A
EXEC
~~~

在 EXEC 执行阶段，SET status 成功、INCR 因值不是整数而报错、后面的 SET owner 仍会执行。其他客户端不能在事务命令之间插入，但命令的**运行时错误不会回滚成功的写入**，因此最终可以是 RUNNING、owner=A、counter 仍为 hello。Redis 官方文档明确区分 EXEC 前的排队错误和 EXEC 期间的运行时错误，并说明后者不会取消其余已排队命令。[Redis Transactions：Errors and Rollbacks](https://redis.io/docs/latest/develop/using-commands/transactions/#errors-inside-a-transaction)。

Lua 也可能出现部分写入后报错：

~~~lua
redis.call("SET", "task:status", "RUNNING") -- 已成功
redis.call("INCR", "counter")              -- 运行时错误，脚本终止
redis.call("SET", "task:owner", "worker-A") -- 不再执行
~~~

在这个示例中，如果 counter 保存 hello，则第一项修改保留、第二项报错、第三项不执行。redis.call 会抛出脚本错误，redis.pcall 可以捕获错误，但**二者都不自动回滚之前的成功写入**。因此把前置条件检查好、把能够统一的数据更新收进合适的原子命令、校验执行结果，才是避免业务半成品的实际工程方法。

这也说明了为什么 BullMQ 的可靠性不可能只由一句“Redis Lua 是原子的”解释完：**原子执行保护正常并发领取，业务结果与队列状态如何正确维护，还取决于任务状态机、锁令牌、错误路径、续租、回收和幂等设计。**

### 【Browser Monitor 源码体现同一目标，但使用的是 PostgreSQL Claim】

当前项目不是用 Redis Lua 领取 Outbox Job，而是在 [browser-monitor 的 OutboxWorker](https://github.com/cxDlogver/browser-monitor/blob/main/platform/apps/worker/src/outbox-worker.ts) 通过 PostgreSQL 实现：

~~~sql
WITH candidates AS (
  SELECT id FROM outbox_tasks
  WHERE (
    status = 'pending' AND available_at <= now()
  ) OR (
    status = 'processing' AND locked_at < now() - INTERVAL '5 minutes'
  )
  ORDER BY available_at, created_at
  LIMIT $1
  FOR UPDATE SKIP LOCKED
)
UPDATE outbox_tasks o SET
  status = 'processing', locked_at = now(),
  locked_by = $2, attempts = attempts + 1
FROM candidates c WHERE o.id = c.id
RETURNING o.id, o.project_id, o.event_id, o.event, o.attempts;
~~~

这段代码用于证明：项目不会先在客户端查询一个 pending 任务，再把状态修改为 processing，而是用**同一 SQL**协调候选任务加锁与状态更新。它还允许 locked_at 超过五分钟的 processing 任务重新领取，因此“任务可能重新执行”的恢复机制与“正常同时竞争时最多一个领取”的安全机制必须分开理解。

在当前源码中，完成任务更新时使用 WHERE id = $1 AND locked_by = $2 进行持有者条件校验，但未在 handle() 期间定期续租，也没有单调递增的世代校验。它属于真实的当前实现边界，不能将本节 Lua、WATCH、Lease Renewal 的教学示例描述成项目已经实现的功能。

### 【本次讨论的面试回答要强调发生竞态的准确位置】

如果被问到“两个 Worker 都会设置 RUNNING，为什么还要 Redis 原子操作”，可以这样回答：

> RUNNING 能表达任务已经被领取，但它是一个状态值，不是独立的并发控制机制。如果两个 Worker 先后都读取到 PENDING，然后分别执行 HSET RUNNING，即使 Redis 单条命令是原子的，两个 Worker 仍然可能各自认为自己领取成功。
>
> 所以我们必须保证**任务资格检查与状态写入**属于同一个并发安全的条件转换。PostgreSQL 可以利用条件 UPDATE、事务和 FOR UPDATE SKIP LOCKED；Redis 则可以通过合适的单条条件命令、WATCH + MULTI/EXEC，或直接使用 Lua 在服务端读取、判断和修改。
>
> 原子执行强调命令不可被其他客户端穿插；在 Lua 与 EXEC 场景，这同时带来隔离执行效果。但它不等于 ACID 式运行时错误回滚；最终业务一致性仍取决于领取条件和状态转换是否写对。
>
> 正常并发领取只解决第一次的分配竞争。领取后 Worker 可能崩溃，任务还需要独立的租约、续租、超时恢复、ACK 和幂等机制，这属于下一阶段的可靠消费问题。

### 【Lease 的核心不是限制任务总时长，而是给处理权设置到期时间】

假设领取时设置 lease_until=10:05，Worker A 执行过程正常，可以在到期前定期续租：

~~~text
10:00  A 首次 Claim     lease_until = 10:05
10:02  A 第一次 Renewal lease_until = 10:07
10:04  A 第二次 Renewal lease_until = 10:09
10:06  A 第三次 Renewal lease_until = 10:11
...
10:10  A 正常完成任务，关闭该租约
~~~

这里的五分钟表示“如果长达五分钟没有成功续租，系统可认为原租约已经失效”，而不是“一项 Job 最多只允许运行五分钟”。续租必须在当前 Worker 仍拥有有效处理权时才能成功：

~~~sql
UPDATE analysis_tasks
SET lease_until = now() + INTERVAL '5 minutes'
WHERE id = $1
  AND status = 'RUNNING'
  AND locked_by = $2
  AND lease_version = $3
  AND lease_until > now()
RETURNING id, lease_until;
~~~

这段 SQL 是教学示例，不是当前 Browser Monitor 项目的现成实现。若返回零行，说明原所有权可能已过期或被接管，当前 Worker 不应再无条件写回任务结果。

实际系统还需要确定心跳频率、允许的网络抖动、超时时间、应用与数据库的时间基准，以及长时间 CPU 计算是否阻塞续租。**续租是处理权活跃证明，不等于任务内部步骤的 Checkpoint。**

### 【Lease 与 Renewal 区分的是执行权有效期和任务实际运行时长】

理解租约应当从最初的故障出发：Worker A 将任务改为 RUNNING 后突然崩溃，任务可能永久无法被其他消费者领取。**租约（Lease）不是最长业务执行时长，而是一次领取所获得的处理权在没有继续证明存活时可以持续多久。** 因此领取时不仅要写 RUNNING，还要记录 owner、lease_until（到期时间），通常还会记录 lease_version（领取世代）。

一项预计需要四十秒的报告生成任务，可以只持有三十秒租约，并每十秒续租一次：

~~~text
时间       Worker A 执行动作                 租约到期时间
 0s        领取成功，开始执行                    30s
10s        续租成功                             40s
20s        续租成功                             50s
30s        续租成功                             60s
40s        业务结果完成并确认                    任务结束
~~~

可见任务总时长可以超过初始租期；租约过期不代表业务结果必然失败，也不意味着旧 Worker 已经物理停止运行。**超时只是任务协调方撤销旧处理权、允许恢复领取的依据。**

Renewal（续租）的前提是：当前请求仍代表合法、有效的领取者。正常做法是在续租时原子检查 Job ID、status、owner、lease_version 与未过期租约，再延长 lease_until。不能只执行无条件的 UPDATE lease_until，否则失去处理权的旧 Worker 可能把过期处理权续活。

续租与任务进度检查不是同一个概念：一个卡死在 await 的 Worker 可能仍然能够定期发出续租心跳，却始终不能完成业务。因此除了 Lease，还应按需求设置**业务超时/取消策略、重试上限、监控告警**。Lease 负责处理权有效性；业务总超时负责工作本身允许耗费多少时间，两者需要分别设计。

### 【续租中断会引入新旧 Worker 并行执行，不能把过期当作旧 Worker 已死亡】

现在模拟一个长任务：Worker A 领取时租约为三十秒，每十秒续租一次，执行中发生长时间 Event Loop 阻塞、GC 暂停或系统调度停顿。

~~~text
0s    Worker A 领取 Task A，lease_version=1，lease_until=30s
10s   Worker A 续租成功，lease_until=40s
15s   Worker A 长时间暂停，暂时无法发送续租命令
40s   Worker A 的 Lease 过期
45s   Worker B 领取已过期任务，lease_version=2，开始处理
50s   Worker A 恢复运行，继续拿着 version=1 执行剩余步骤

            Worker A（旧版本 1）       Worker B（新版本 2）
                  ↓                         ↓
              继续执行业务              同时执行业务
                  └──────────┬──────────────┘
                             ↓
                 必须保护结果写入和副作用
~~~

这里即使所有 Claim、Renewal 都是原子的，也可能产生**两个 Worker 同时运行业务代码**。原因不是原子领取失效，而是 Worker 的实际运行状态与协调系统记录的租约所有权出现时间差。

例如在 Node.js 中，CPU 密集型同步任务会阻塞当前线程的 Event Loop，导致续租定时器无法及时运行；外部 LLM 的异步等待本身通常不阻塞 Event Loop，但网络断开、进程暂停等仍可能导致续租失败。BullMQ 文档将这类无法续锁的任务称为 stalled，并允许恢复到 waiting 后被另一 Worker 处理。

**因此前面的 Claim 解决“正常竞争时不能重复领取”；Lease + Renewal 解决“崩溃可恢复、正常长任务不会轻易误回收”；而过期后新旧执行者并存所带来的结果冲突，还需要 Fencing。** 参见 [BullMQ Stalled Jobs](https://docs.bullmq.io/guide/workers/stalled-jobs)。

### 【Fencing Token 在租约失效后拒绝旧 Worker 写入】

即使建立 Renewal，也无法排除如下竞态：

~~~text
Worker A 获得世代版本 1
        ↓
A 因网络或运行时暂停错过续租
        ↓
Lease 过期，Worker B 取得世代版本 2
        ↓
Worker A 恢复，继续按自己的旧状态写回
~~~

Fencing（隔离失效执行者）可以采用单调递增的 lease_version。每次成功重新领取增加版本；更新关键结果时必须验证当前版本与 owner：

~~~sql
UPDATE analysis_tasks
SET status = 'SUCCEEDED',
    result_ref = $1,
    updated_at = now()
WHERE id = $2
  AND status = 'RUNNING'
  AND locked_by = $3
  AND lease_version = $4
  AND lease_until > now()
RETURNING id;
~~~

A 持有版本 1，数据库当前是版本 2，A 的更新影响零行。B 持有有效版本 2 时才能确认完成。

**这个保护只作用于真实执行版本校验的地方。** 如果 Worker A 已经调用了外部 LLM 或未经条件校验写入另一张报告表，那么仅给任务状态行加版本条件仍然不能撤销外部副作用。若报告和任务状态同处一个 PostgreSQL，可在同一个事务中核验领取版本、写入结果和确认任务；对于外部服务则需要幂等键、结果查询或补偿机制。locked_by 也应与稳定的执行标识或版本配合，而不是单独信任一个可能被复用的 Worker 名称。

### 【Fencing 能否一定阻止旧 Worker 写入，取决于谁在写入时验证版本】

Fencing Token（隔离令牌）的直觉是：每次真正成功取得新的任务处理权时，分配单调递增的领取版本。旧 Worker A 持有版本 1，新 Worker B 接管后，任务当前版本变为 2。**版本号的价值在于下游能认出过期执行者，而不是给旧 Worker 发送了一条“请停止”的通知。**

以结果保存在同一张 PostgreSQL 任务表为例：

~~~sql
-- $1: 分析结果；$2: Job ID；$3: owner；$4: 本次领取得到的版本
UPDATE analysis_tasks
SET result_ref = $1,
    status = 'SUCCEEDED'
WHERE id = $2
  AND status = 'RUNNING'
  AND locked_by = $3
  AND lease_version = $4
  AND lease_until > now()
RETURNING id;
~~~

在当前拥有处理权的数据行上，条件检查与结果 UPDATE 是一个数据库原子条件更新。A 携带 version=1，但 B 已将任务世代更新为 2 时，A 的 UPDATE 返回零行，从而被拒绝；B 带着当前有效版本 2 才可能提交。注意这里的 lease_until 校验仍很重要：**租约已经过期但尚未被下一位 Worker 领取时，仅检查版本相等也可能放行过期写入。**

**重要前提：检查必须与真正的受保护写入形成原子边界。**

~~~text
危险的“检查完才写入”：
A 查询 Redis / Job 表 → 当前看起来 version=1
A 暂停
任务租约过期、B 成功接管 → 当前 version=2
A 恢复 → 不加条件地写入 Report 表
结果：A 的旧报告仍然可能落库
~~~

如果报告保存在另一张 PostgreSQL 表，可以在**同一个数据库事务**中锁定或条件更新权威任务行、核验当前 owner / version / Lease，再保存报告和完成状态，避免校验和写入之间产生新的竞争窗口。若写入直接发生在另一个数据库、对象存储、第三方支付平台或 LLM 接口，内部 Job 表的 WHERE 版本检查本身并不能限制那些外部系统；需要相应下游也能原子验证令牌或采用另外的幂等/补偿协议。

**另一种常见 Fencing 设计是“存储端拒绝低于已见最高版本的写入”。** Martin Kleppmann 的示例说明：存储端先收到新版 2 的写入，之后若旧版 1 才到达，就应拒绝 1。这个方案**仍有边界**：如果 B 虽已取得版本 2，却还没有把版本 2 送达该存储端，那么只看“该存储端已见过的最大版本”不一定立即拒绝旧版 1。它保证的是**不接受比已经处理过的最新版本更旧的请求**；如果业务要求“Lease 一旦失效，任何旧写入绝对不能再成功”，必须让真正的写入端能够原子验证权威租约状态或使用与所有权转移一致的协议。

所以“Fencing 能否一定阻止旧 Worker 写入”的准确回答是：

- **能够有条件地做到**：受保护资源支持可靠的令牌比较，而且比较与写入同步、原子；若还要求租约一过期就拒绝，即要校验权威的当前所有权与有效期限。
- **不能无条件推导**：只有 Worker 自己在写入前检查一次、只给任务分配一个 token、外部服务不支持 token 校验，均不能得出绝对不会写入。
- Fencing 可以拒绝不合法的**结果提交**，不能强制停止旧 Worker 的 CPU 计算或撤回已经完成的外部调用。

原始技术资料：[Martin Kleppmann：How to do distributed locking — Making the lock safe with fencing](https://martin.kleppmann.com/2016/02/08/how-to-do-distributed-locking.html)。

### 【幂等不是 Fencing 的重复实现，合法的新 Worker 也可能重复业务副作用】

在上述租约竞争中，我们关注“旧版本还有没有权利写入”，这由 Fencing 控制。但存在另一种**与过期版本写入无关**的重复处理：

~~~text
Task PAY-1001：对支付订单扣款 100 元

Worker A（lease_version = 1）：
  正常持有有效租约
  ↓
  调用支付接口 PAY-1001 → 扣款成功
  ↓
  尚未在任务队列 ACK / 标记 COMPLETED
  ↓
  Worker A 突然崩溃

系统认为任务尚未确认完成
  ↓
Lease 到期，允许恢复领取

Worker B（lease_version = 2）：
  合法领取；是当前有效执行者
  ↓
  如果直接再次调用扣款 API → 可能重复扣款
~~~

此处**两次操作都可能是在各自持有有效处理权的时候发出**。Worker B 不是旧执行者；所以 Fencing 不会仅因 B 的版本高就告诉它“PAY-1001 已在外部扣款成功”。

为此需要**幂等性（Idempotency）**：同一个业务意图无论被请求一次或重复请求多次，不应该重复产生额外的业务效果。它与“可逆性”不同：可逆性表示撤销已发生操作；幂等表示重复请求不应重复生效，不能依赖事后退款来替代幂等控制。

业务处理时需区分两个 ID：

| 标识 | 用来回答的问题 | 重试/重新领取时怎样变化 |
| --- | --- | --- |
| lease_version / attempt_id | 当前由哪个执行世代拥有处理权？ | **每次合法重新领取应更新** |
| business_operation_id / idempotency_key | 当前处理的是哪一笔需要恰好产生一次效果的业务？ | **同一业务操作的重试应保持稳定** |

如果把重试次数、Worker ID 或新的 Lease Token 当作每次扣款的幂等键，重试时 Key 改变，下游就可能当作一笔全新的业务操作，失去去重效果。

**例一：业务写入全部在同一个 PostgreSQL 内。**

可以为 business_operation_id 建立唯一约束，并在**同一事务**中处理去重记录与业务余额变化：

~~~text
BEGIN
  ↓
INSERT processed_operations(operation_id='PAY-1001')
ON CONFLICT DO NOTHING
RETURNING operation_id
  ├─ 插入成功 → 本次尚未处理，可继续执行余额更新
  └─ 没有返回行 → 已由其他事务完成/占有同一唯一键，按协议判定已有结果
  ↓
首次处理时在同一事务中完成业务数据更新、结果记录
  ↓
COMMIT
~~~

这里伪流程的前提是：去重记录与真正的数据库业务修改**同库同事务提交**，且并发调用采用唯一约束/事务安全处理，失败时一并回滚。如果先单独提交“已处理”标记，再执行扣款，崩溃反而会导致永远跳过尚未完成的操作。

**例二：真正副作用发生在外部服务。**

如果下游支付 API 支持幂等键，则对同一个 business_operation_id 的所有重试使用相同幂等键，并遵守平台对参数一致性、有效期和结果缓存的约束。比如 Stripe 的官方 Idempotent Requests 文档说明，它用请求幂等键支持安全重试，并不是通过你的内部 Lease Token 判断这笔款是否已经收取。[Stripe Idempotent Requests](https://docs.stripe.com/api/idempotent_requests)。

对邮件、LLM、外部通知等不支持可靠请求幂等的服务，仅有本地唯一约束也不一定能阻止**请求实际发出两次**。可以用稳定业务 ID、先查询已有结果、结果复用、任务 Checkpoint、独立去重表、Outbox / 补偿和人工对账等方式控制后果；但必须承认无法凭一个通用幂等术语保证所有外部调用永不重复。

**因此 Fencing 与幂等的关键区别：**

> Fencing 判断“**本次执行者现在还有权提交吗？**”
>
> Idempotency 判断“**这个业务操作以前是否已经产生过相同效果？**”

即使旧 Worker 被完全正确的 Fencing 拒绝，合法新 Worker 仍然可能再次请求已经成功过的业务；**因此 Fencing 永远不能作为业务幂等的直接替代品。**

### 【ACK 与幂等在两个故障窗口中相互补充，目标是可靠结果而非绝不重复运行】

完成确认（ACK）应发生在满足业务成功条件之后，典型的任务状态链路是：

~~~text
原子 Claim（唯一获得本次处理权）
      ↓
Lease / Renewal（维持处理权；异常时允许恢复）
      ↓
Fencing（写入时拒绝失效执行者）
      ↓
按业务 ID 幂等地执行并持久化结果
      ↓
ACK（队列确认任务完成，或数据库 Job 标记 COMPLETED）
~~~

要重点比较两个失败窗口：

| 故障点 | 系统后果 | 为什么仍需要可靠性机制 |
| --- | --- | --- |
| 业务结果尚未持久化，先 ACK 后崩溃 | 队列认为任务已完成，但业务结果可能根本没产生 | 不应贸然提前确认；防止任务丢失 |
| 业务结果或外部副作用已经成功，ACK 之前崩溃 | 任务未被确认，重试时可能再次执行 | 通过业务幂等识别已完成效果，不重复扣款/创建 |
| 旧 Worker 错过续租、新 Worker 已取得新世代 | 旧执行者和新执行者可能并行执行 | 写入端 Fencing + 业务幂等共同保护 |

**同一 PostgreSQL 数据库内的业务结果和任务 completed 状态**，有时可以放在同一事务中一起提交，避免这两项本地状态之间出现 ACK 间隙；这不代表已经调用的 LLM 或第三方支付会随数据库事务一起提交/回滚。

对 PostgreSQL Job Table，ACK 通常表现为任务状态提交成功；BullMQ 使用队列内部完成标记；Kafka 是提交某分区处理位点 Offset，其语义不能简单等同于一条 Job 的 completed。应用需要区分本地数据原子性、队列确认以及外部副作用这三类边界。

**可迁移的面试回答：**

> 多 Worker 异步任务首先靠原子 Claim 防止正常竞争时重复领取；领取后通过 Lease 避免崩溃者长期占有任务，通过 Renewal 支持正常长时间执行。暂停、CPU 阻塞或网络问题可能导致无法续租，因此在失效任务重新领取后，新旧 Worker 可能同时继续运行。为了防止旧执行者非法写回，使用 Fencing Token 并让实际写入端原子验证当前所有权。Fencing 不能保证旧 Worker 不再调用外部服务，也不能防止合法新 Worker 在 ACK 丢失后重复业务操作，所以仍然需要稳定业务 ID 的幂等机制。最后应在可靠持久化结果后 ACK，接受故障恢复中的重复执行可能，以保证业务结果正确。

### 【ACK 只在业务结果具备持久化保证后才能进行】

ACK（Acknowledgment，确认）描述的是“消费者认为这项工作已经满足完成条件，并将其从待完成状态中确认”的动作，并非 Fetch、Claim 或续租。

~~~text
Producer → Job 已持久化
             ↓
         Worker Claim
             ↓
         执行与续租
             ↓
         持久化业务结果
             ↓
         ACK / 确认成功
~~~

如果在执行业务之前就确认，之后崩溃可能造成任务被跳过；如果执行业务成功之后，确认前崩溃，则可能再次领取，因此需要幂等。

不同系统的对应关系：

| 系统 | 所有权或重投机制 | 任务处理成功如何确认 |
| --- | --- | --- |
| PostgreSQL Job Table | 原子 Claim + Lease / 超时回收 | 更新任务 status 为 SUCCEEDED，最好与同库业务结果事务提交 |
| BullMQ 默认 Redis Backend | Worker 持有 Job Lock、续租；stalled 时重新调度 | Processor 成功返回后由 BullMQ 更新 Job 为 completed |
| Kafka Consumer Group（传统模式） | 按分区分配 Consumer，重启后依靠持久化 Offset 恢复 | 提交 Committed Offset，表示下一次从该分区哪里继续消费；**不是对每条业务消息单独标记 completed** |

特别区分 Kafka：它不因某 Consumer 已经提交 Offset 而立即删除 Topic 中的原始消息，也不天然记录消息所对应的复杂 Workflow 执行步骤。Kafka 提交位点与队列产品的逐 Job ACK 只是在“确认处理进度”这个更高层问题上相似，不能直接视为相同实现。

BullMQ 官方说明 Worker 在 Job 处理中持有锁，并需要周期性更新活跃状态；Event Loop 被长时间 CPU 工作占用时，锁可能无法续租，Job 会进入 stalled 并重新被处理，达到最大停滞次数后可能失败。因此使用 BullMQ 也不能免除业务幂等。[BullMQ Stalled Jobs](https://docs.bullmq.io/guide/workers/stalled-jobs)。

### 【ACK 前后两个崩溃窗口决定必须接受重复处理的可能】

~~~text
故障窗口 A：
Claim → 开始分析 → 进程崩溃（尚无结果）
                         ↓
                   租约过期 / 消息重新交付
                         ↓
                       重新处理

故障窗口 B：
Claim → 分析并成功保存报告 → 进程崩溃（尚未 ACK）
                                      ↓
                                恢复后再次领取
                                      ↓
                                检查结果是否已存在
                                  ├─ 已存在：直接确认成功
                                  └─ 不存在：安全重试
~~~

如果任务处理过程中有不可撤销的外部副作用，仅靠 Claim/Lease/ACK 三者也不能保证“所有真实世界行为绝对只执行一次”。其组合通常更接近**至少一次执行机会 + 幂等保证最终业务结果**。

### 【Browser Monitor 的 Outbox Worker 有原子 Claim 与五分钟回收，但没有长任务续租】

真实源码：[OutboxWorker](https://github.com/cxDlogver/browser-monitor/blob/main/platform/apps/worker/src/outbox-worker.ts)。

项目 Claim 关键片段：

~~~sql
WITH candidates AS (
  SELECT id FROM outbox_tasks
  WHERE (
    status = 'pending' AND available_at <= now()
  ) OR (
    status = 'processing' AND locked_at < now() - INTERVAL '5 minutes'
  )
  ORDER BY available_at, created_at
  LIMIT $1
  FOR UPDATE SKIP LOCKED
)
UPDATE outbox_tasks o SET
  status = 'processing', locked_at = now(),
  locked_by = $2, attempts = attempts + 1
FROM candidates c WHERE o.id = c.id
RETURNING o.id, o.project_id, o.event_id, o.event, o.attempts;
~~~

它说明：当前项目确实可以在同一 SQL 中领取待办任务；如果处理超过五分钟而 locked_at 不再更新，后续消费者有机会重新领取。**当前代码并未在普通 handle() 执行期间定期 Renewal，也没有持久 lease_version Fencing**。任务完成时仅通过 id + locked_by 检查持有者，因此不能声称它能严格杜绝过期执行者对所有外部业务副作用的影响。

项目 EventProcessor 的业务投影与任务 completed 标记还分属不同的数据库提交，故投影提交后、任务确认前崩溃，会暴露重复投影窗口；必须结合业务幂等和唯一约束分析。参见 [项目异步任务源码专题](https://github.com/cxDlogver/browser-monitor/blob/main/docs/异步任务与Worker可靠消费体系源码学习.md)。

### 【面试回答要从领取安全、活跃证明、过期隔离和成功确认展开】

多个 Worker 正常并发领取时，首先通过原子 Claim 避免同时从 PENDING 状态抢到同一条任务。对于长任务，行锁不能一直持有，必须在数据库持久化任务所有权和租约，并由 Worker 周期性续租。

如果旧 Worker 因断连或暂停导致租约过期，而其他 Worker 重新接管，还要利用单调增加的领取版本、条件写入或真正受保护的下游 Fencing，拒绝旧执行者覆盖新任务结果。

任务真正完成时，应该先持久化关键业务结果，再更新完成状态或提交消费进度。不过业务成功之后、ACK 尚未提交时仍可能崩溃，因此恢复后重复处理是必须考虑的故障路径。通过业务幂等键、唯一约束、Checkpoint、结果对账和适当补偿，确保重复执行不造成错误结果。

## 4. BullMQ 如何存储任务、决定领取顺序并封装可靠 Worker 执行

**本讲核心问题：** 当我们已经理解 Claim、Lease、Renewal、Fencing、Idempotency 和 ACK 后，为什么实际项目还要使用 BullMQ？它如何保存任务和调度状态，多个 Worker 如何选择下一项 Job，优先级与延迟任务怎样排序，以及哪些可靠性已经封装、哪些仍需要业务自己保证？

**先给结论：** BullMQ 是任务队列与 Worker 调度框架。默认 Redis Backend 用任务数据 Hash、不同状态的 List / Sorted Set、Job Lock 及原子 Lua 脚本组合管理队列。它已经封装队列侧 Claim、续锁、停滞回收、重试和完成状态转换；但 Redis 队列状态与 PostgreSQL 业务结果、LLM 调用和外部支付不是同一个全局事务，仍需应用侧保证业务幂等和必要的下游处理权校验。

**版本边界：** 这里分析的是 BullMQ v6 默认 Redis Backend。v6 已增加可选 PostgreSQL Backend，后者用 PostgreSQL 表、事务和 SQL 函数实现相同的上层 API，不能用下文的 Redis List、ZSET、Lua 解释它的内部执行。Redis 仍为默认后端；官方说明 v6 Redis 的队列存取基本沿用 v5。[BullMQ v6 PostgreSQL 发布说明](https://bullmq.io/news/260927/bullmq-v6-postgresql/)。

### 【Producer 提交 Job，Queue 和 Worker 可以运行在不同进程】

以 AI 文档分析为例：HTTP API 接到文档分析请求后，将待分析的 documentId、version 写入 BullMQ；Worker 异步调用 LLM，最后将报告持久化。API 不应把十分钟的 LLM 调用维持在当前 HTTP 请求生命周期中。

~~~text
用户发起文档分析
        ↓
HTTP API / Producer（生产者）
  校验权限、计算业务 Job ID
  queue.add("analyze-document", data, options)
        ↓
BullMQ Redis Backend
  保存任务内容和对应的调度状态
        ↓
Worker A / B / C（消费者）
  在内部原子领取逻辑中竞争下一项可执行 Job
        ↓
获得 Job 与有效任务锁的 Worker
  执行 Processor（读取文档、调用 LLM）
        ↓
PostgreSQL 中幂等保存分析报告
        ↓
Processor 正常返回，BullMQ 确认 completed
~~~

Producer 与 Worker 不必处于同一个 Node.js 进程；同一个队列名称与 Redis 命名空间下的实例参与同一任务系统。Worker 断开时，已成功添加的 Job 可以留在 Redis 等待后续消费者上线，但这个能力仍以 Redis 可用、数据未丢失为前提。

基础安装：

~~~bash
npm install bullmq ioredis pg
~~~

使用 Node.js ESM（.mjs 文件）、本地 Redis 127.0.0.1:6379，以及通过 DATABASE_URL 配置的 PostgreSQL 连接。v6 中 ioredis 为可选 peer dependency，使用 Redis 后端时需要自行安装。

先为业务结果建表：

~~~sql
CREATE TABLE IF NOT EXISTS analysis_reports (
  job_id TEXT PRIMARY KEY,
  document_id TEXT NOT NULL,
  version INTEGER NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
~~~

上面的唯一主键保护的是**同一业务 Job 不会创建多条报告**，不能阻止两个 Worker 在重试或接管时都调用 LLM。

Producer 示例（producer.mjs）：

~~~javascript
import { Queue } from "bullmq";

const queue = new Queue("document-analysis", {
  connection: { host: "127.0.0.1", port: 6379 },
});

const documentId = "doc-1001";
const version = 1;
const jobId = "report-" + documentId + "-v" + version;

const job = await queue.add(
  "analyze-document",
  { documentId, version },
  {
    jobId,
    attempts: 3,
    backoff: { type: "exponential", delay: 1000 },
    removeOnComplete: false,
    removeOnFail: false,
  }
);

console.log("已提交 Job:", job.id);
await queue.close();
~~~

Queue.add 负责入队；jobId 是同一业务操作的稳定标识，attempts 表示最多尝试三次，backoff 表示失败后延迟重试。保留 completed / failed 记录便于教学观察，生产需要设计有限保留策略，否则 Redis 数据会持续增长。

Worker 示例（worker.mjs）：

~~~javascript
import { Worker } from "bullmq";
import pg from "pg";

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function generateReport(documentId, version) {
  // 教学示例用短延迟代替真正的外部 LLM 调用
  await new Promise(resolve => setTimeout(resolve, 2000));
  return "文档 " + documentId + " 第 " + version + " 版的分析结果";
}

const worker = new Worker(
  "document-analysis",
  async job => {
    const { documentId, version } = job.data;

    // 减少已经存在报告时的重复计算，但不具备并发互斥性
    const existing = await pool.query(
      "SELECT job_id FROM analysis_reports WHERE job_id = $1",
      [job.id]
    );

    if (existing.rowCount > 0) {
      return { reportId: job.id, reused: true };
    }

    const content = await generateReport(documentId, version);

    // 真正兜住重复插入的是数据库唯一约束
    await pool.query(
      "INSERT INTO analysis_reports (job_id, document_id, version, content) " +
      "VALUES ($1, $2, $3, $4) ON CONFLICT (job_id) DO NOTHING",
      [job.id, documentId, version, content]
    );

    return { reportId: job.id };
  },
  {
    connection: { host: "127.0.0.1", port: 6379 },
    concurrency: 2,
    lockDuration: 30000,
    maxStalledCount: 1,
  }
);

worker.on("completed", job => console.log("完成", job.id));
worker.on("failed", (job, err) => console.error("失败", job?.id, err));
worker.on("stalled", jobId => console.warn("失去锁，可能重试", jobId));
worker.on("error", console.error);
~~~

启动方式是一个终端运行 node producer.mjs，另两个终端各运行 node worker.mjs；生产者完成入队后退出，消费者进程继续运行。脚本中的 Processor 没有显式编写原子 Claim、租约续期或成功 ACK，因为这些已经由 BullMQ Worker 管理。

**代码的保证与不足**：报告唯一约束确保每个 job_id 最多保存一条记录，但两个重叠 Worker 可能都读到“报告尚不存在”并重复调用 LLM。这里也未实现强制禁止旧 Worker 写入最新结果的业务级 Fencing；后面会解释何时需要它。

### 【BullMQ 将 Job 内容与状态索引分开，而不是只改一个 status 字段】

对于名为 document-analysis 的业务 Queue，Redis 中常见的数据可按两层理解：

~~~text
逻辑业务队列：document-analysis
│
├── Job 数据：Hash
│   └── bull:document-analysis:report-doc-1001-v1
│       name / data / opts / timestamps / attempts / result 等
│
└── 执行状态与调度结构
    ├── wait         Redis List：普通等待任务 ID
    ├── active       Redis List：正在执行的任务 ID
    ├── prioritized  Sorted Set：带正数 priority 的可领取任务 ID
    ├── delayed      Sorted Set：尚未到期的任务 ID
    ├── completed    Sorted Set：已成功结束的任务 ID
    ├── failed       Sorted Set：失败终态的任务 ID
    ├── Job lock     带 TTL 的锁 Key：校验本次执行令牌
    └── events       Redis Stream：状态变化事件
~~~

这个图是**典型 Redis Backend 的概念与实现示意**，具体 Key 命名和内部状态字段不应被业务代码当作稳定的 Schema。Hash 承担 Job 的内容和执行元数据存储；不同 List、ZSET 主要承担调度、排序和查询索引。状态通常取决于任务 ID 在这些结构中的位置，而不是一个 status 字段。

普通任务经过的主要状态：

~~~text
queue.add()
    ↓
wait（可执行的普通任务）
    ↓
原子领取
    ↓
active + 执行锁
    ├─ Processor 成功 → completed
    ├─ 失败，可重试 → wait 或 delayed → 再次 active
    └─ 最终失败 → failed
~~~

另有两个特殊入口：

~~~text
priority > 0 → prioritized（按优先级排序）→ active
delay > 0    → delayed（等到到期）→ wait / prioritized → active
~~~

这里**没有固定的 stalled 状态**。stalled 表示 BullMQ 检测到 active Job 的锁失效，并可能将其放回 waiting 或置为 failed，是一个事件和恢复过程，不是持久的独立 Job 状态。[BullMQ Stalled](https://docs.bullmq.io/guide/jobs/stalled)。

查看业务任务时，应通过队列 API，而不是直接手改 Redis Key：

~~~javascript
const job = await queue.getJob("report-doc-1001-v1");
if (job) console.log(await job.getState());

console.log(await queue.getJobCounts(
  "waiting", "prioritized", "delayed", "active", "completed", "failed"
));

console.log(await queue.getPrioritized());
console.log(await queue.getDelayed());
~~~

这些查询能用于调试当前任务是否已经可领取、是否延迟中、完成后是否保留，以及是否存在任务积压。官方依据：[BullMQ Architecture](https://docs.bullmq.io/guide/architecture)、[Job Getters](https://docs.bullmq.io/guide/jobs/getters)。

### 【wait 与 prioritized 的实际领取顺序：普通任务先于正数优先级任务】

BullMQ 的 priority（优先级）决定**下一项应由哪个 Worker 领取**，不是决定 Job ID 大小，也不是允许高优先级任务强制停止已经执行中的 Job。

默认 Redis 后端中，未设置 priority 或设置 priority:0 的普通任务存放在 wait List；设置正数 priority 的任务由 prioritized Sorted Set 管理。官方有一个容易违反直觉的规则：

- **priority=0 表示没有显式优先级，但普通 wait 任务会先于所有正数优先级任务被领取。**
- 正数优先级合法范围是 1 到 2097151，**数值越小，优先级越高**；相同正数优先级按 FIFO。
- 普通 wait 默认 FIFO（也可通过 lifo 选项调整）；排序依据是可领取队列与相关调度结构，而非 jobId。自动生成的数字型 Job ID 只是识别任务和去重索引，不是通用调度规则。

例如先全部入队、暂不启动 Worker：

~~~javascript
await queue.add("analyze", { id: "A" }, { jobId: "job-A" }); // 默认 priority 0
await queue.add("analyze", { id: "B" }, { jobId: "job-B", priority: 5 });
await queue.add("analyze", { id: "C" }, { jobId: "job-C", priority: 1 });
~~~

~~~text
wait（普通任务）               prioritized（按优先级的有序集合）
  A，priority=0                 C，priority=1
                                B，priority=5

在三个任务都已经入队、且没有暂停/限流等约束时：
Worker 依次领取：A → C → B
~~~

这里的 A 首先执行并不是因为 ID 最小，而是因为**Redis Backend 的领取逻辑优先读取 wait List；取不到普通任务再从 prioritized 领取**。如果想让紧急、中等、普通三个等级严格按 1、5、10 排序，则所有待比较的任务都应设置正数 priority，不能让“普通任务”保留默认 0 后误以为它会排在最低优先级。

**内部实现证据：** BullMQ 的 [moveToActive-11.lua](https://github.com/taskforcesh/bullmq/blob/master/src/commands/moveToActive-11.lua) 先对 waitKey 执行 RPOPLPUSH(waitKey, activeKey)，只有没有取得 Job ID 才调用 moveJobFromPrioritizedToActive；后者通过 ZPOPMIN 取得 Sorted Set 中分数最小的 Job。[BullMQ Prioritized](https://docs.bullmq.io/guide/jobs/prioritized) 明确说明 priority=0 的特殊规则。

**注意这说明的是领取顺序，不是完成顺序。** 先领取的 A 如果执行十分钟，后领取的 C 可能只执行两秒就先完成；正在 active 的任务不会自动被更高优先级任务抢占。持续进入 wait 的 priority=0 任务也可能让正数优先级任务长期等待，应按业务量规划队列与调度策略。

### 【delayed 是尚未到期的调度状态，按执行时间而不是 Job ID 排序】

通过 delay 配置延迟：

~~~javascript
await queue.add(
  "analyze-document",
  { documentId: "doc-delayed" },
  { jobId: "report-doc-delayed", delay: 5000 }
);
~~~

delay 单位是毫秒，表示至少等待五秒后才具备被调度的资格。也可以在 Processor 执行失败后使用 attempts + backoff 配置，使同一 Job 等待一定时间再重新执行：

~~~javascript
{
  attempts: 3,
  backoff: { type: "exponential", delay: 1000 }
}
~~~

delayed 由 Sorted Set 按到期分数管理，而非放在 FIFO List 的尾部睡眠。到期后，由 BullMQ 的调度逻辑将其转为可领取：priority=0 的进入 wait List，有正数优先级的进入 prioritized。**到期不代表恰好开始执行**；Worker 可能忙碌，队列也可能暂停或存在其他限制。[BullMQ Delayed](https://docs.bullmq.io/guide/jobs/delayed)。

**纠正前面讨论中容易产生误导的排序示例：**

~~~text
A：10:00:00 提交，立即执行，进入 wait
B：10:00:01 提交，delay=5000，进入 delayed
C：10:00:02 提交，立即执行，进入 wait

10:00:03（无 Worker 消费）：
wait 的逻辑 FIFO 领取顺序：A → C
delayed：B 将在 10:00:06 到期

10:00:06：B 从 delayed 提升到 wait
在当前 Redis Backend 默认 FIFO、没有其他插队条件时：
wait 逻辑领取顺序：A → C → B
~~~

**不能笼统地说“到期的 delayed 任务永远会抢在此前 waiting 的普通任务之前”。** 上述结论有明确源码依据：BullMQ 的 [promoteDelayedJobs.lua](https://github.com/taskforcesh/bullmq/blob/master/src/commands/includes/promoteDelayedJobs.lua) 对到期且 priority=0 的 Job 使用 LPUSH(waitKey, jobId)；Worker 的 moveToActive 对 wait 使用 RPOPLPUSH(waitKey, activeKey)，即从右端领取。所以**新的到期任务加入 List 左端，先前排队任务位于更靠右的可消费端**。

Redis List 的“左端/右端”是底层存储方位，不能仅凭 LPUSH 就断言任务在逻辑上最先执行；必须和 Worker 实际从哪一端消费一起分析。如果某个 delayed Job 有 priority=1，它到期后进入 prioritized 而不是普通 wait，其领取顺序还受优先级集合与 wait 优先消费规则共同影响。

由此，三种排序规则应当分开：

| Job 类型 | 进入的调度结构 | 核心排序原则 |
| --- | --- | --- |
| 默认普通任务（priority=0，delay=0） | wait List | 默认 FIFO，已有任务先于后来进入 wait 的普通任务 |
| 显式优先级任务（priority>0，delay=0） | prioritized ZSET | 正数越小越优先；同级通常 FIFO；在没有普通 wait 任务时被领取 |
| 延迟任务（delay>0） | delayed ZSET，随后转入 wait/prioritized | 先按到期时间确定何时具备可执行资格，再由目标状态结构决定实际领取顺序 |

### 【BullMQ 的原子领取由内部 Lua 完成，业务侧不需要再写 WATCH】

从 Worker 获取 Job 的内部过程可以拆成如下阶段：

~~~text
Worker 准备领取下一项任务
     ↓
Redis 执行 BullMQ 内部 moveToActive 脚本
     ↓
先提升部分已经到期的 delayed Job
     ↓
检查队列是否暂停、全局并发或限流等调度约束
     ↓
尝试从 wait 移动一个 Job ID 到 active
     ├─ 有 Job：获得该任务
     └─ 没有：尝试从 prioritized 中提取优先级最高的 Job
     ↓
prepareJobForProcessing：为本次领取建立锁、记录开始执行信息等
     ↓
将 Job 内容及锁信息返回给 Worker
     ↓
Worker 调用 Processor
~~~

这里的领取与锁建立位于 Redis 后端的原子执行过程内，因此两个正常竞争的 Worker 不会同时把同一个等待 Job 当作自己成功领取的任务。**BullMQ 已实现状态转换协议，业务不需要再对其内部 Key 执行 WATCH、MULTI/EXEC 或手写 Lua 抢锁**，也不应该绕开 BullMQ API 去改 wait/active/prioritized 等结构。

而这并不表示 Redis 与外部数据库之间也存在同一个事务。Lua 的不可穿插范围是 Redis 内部的状态处理，不覆盖随后发生的 LLM、HTTP 和 PostgreSQL 操作。源码参考：[moveToActive-11.lua](https://github.com/taskforcesh/bullmq/blob/master/src/commands/moveToActive-11.lua)。

### 【BullMQ 自动维护任务锁、续租和停滞恢复，但不会停止已失去锁的旧代码】

Worker 领取成功后，BullMQ 在 Redis 中为这次 Job 执行维护带 TTL 的锁，处理期间周期性续锁。常见配置：

~~~javascript
const worker = new Worker("document-analysis", processor, {
  connection: { host: "127.0.0.1", port: 6379 },
  lockDuration: 30000,
  maxStalledCount: 1,
  concurrency: 2,
});
~~~

解释：

- lockDuration=30000：本次执行锁的有效期为三十秒，**不是 Job 最长只能运行三十秒**。长任务能够通过续锁持续运行；默认续锁时机通常相当于锁有效期的一半左右。
- concurrency=2：当前 Worker 最多并发处理两个 Job，主要适合 I/O 密集型，不等于自动启动两个 OS 线程。
- maxStalledCount=1：限制因失去锁而被恢复的次数，防止任务因持续阻塞而无限反复领取。

~~~text
A 领取 Job，取得 BullMQ 锁
       ↓
A 执行 LLM 调用，正常周期性续锁
       ↓
CPU 阻塞 / 进程暂停 / 崩溃，续锁没有成功
       ↓
锁 TTL 失效
       ↓
BullMQ 检查 Job 是否 stalled
       ├─ 未超限：返回 waiting，其他 Worker 可以领取
       └─ 超限：标记 failed
       ↓
B 合法接管
       ↓
A 可能又恢复运行，因此仍存在双执行者
~~~

关键边界：

1. BullMQ 能校验**自己队列内部**的执行锁与任务令牌，从而防止失效 Worker 合法完成队列的 completed 状态转换。
2. 它**不会强制杀死**执行中的旧 Node.js 函数，也不会自动撤销 LLM 请求、支付扣款、邮件发送或 PostgreSQL INSERT。
3. stalled 是事件/恢复动作，**不是一个独立的持久 Job 状态**。BullMQ v2 起常见的 stalled 和 delayed 调度已不要求另行运行旧式 QueueScheduler。[BullMQ Stalled Jobs](https://docs.bullmq.io/guide/workers/stalled-jobs)、[BullMQ Stalled](https://docs.bullmq.io/guide/jobs/stalled)。

### 【Processor 返回、抛错与 ACK 的关系，以及为什么业务幂等仍是必要的】

Worker 的 Processor 正常返回后，BullMQ 尝试把 active Job 转到 completed，并记录返回值；抛出错误后依据重试配置放回 waiting / delayed，或达到重试上限进入 failed。因此普通 Worker 不需要手动发送逐 Job ACK。

**业务错误不能被吞掉**：如果 LLM 或 PostgreSQL 写入失败，但 catch 之后直接正常 return，BullMQ 可能认为处理成功并更新 completed。对需要重试的错误应抛出；对确实不可重试的错误则采用清晰的永久失败策略。

最重要的两个故障窗口：

~~~text
窗口 1：业务尚未保存成功，Worker 崩溃
       ↓
     BullMQ 锁过期后可恢复 Job
       ↓
     不遗漏处理的机会

窗口 2：PostgreSQL 已经保存报告，BullMQ 尚未 completed
       ↓
     Worker 崩溃 / 失去锁
       ↓
     其他 Worker 可能再次运行相同 Job
       ↓
     必须利用业务幂等避免生成第二份结果
~~~

即使 BullMQ 通过 Job Lock 拒绝旧 Worker 对**队列状态**的非法更新，也不能阻止合法的新 Worker 把已经扣过款的业务再次扣款。正确区分：

| 可靠性能力 | BullMQ 已经封装 | 应用仍需保证 |
| --- | --- | --- |
| 正常多 Worker 安全领取 | 是：原子状态转换 | 不手改底层 Redis Key |
| 活跃 Job 的锁、续租、stalled 检测 | 是：由 Worker 和内部机制执行 | 避免长时间阻塞 Event Loop；监控停滞 |
| 失败重试与退避、任务状态变更 | 是：按配置调度 | 哪些错误可重试、重试是否安全 |
| completed / failed 任务确认 | 是：Processor 成功返回或失败后处理 | 返回之前业务结果应满足持久化条件 |
| 相同 Job ID 重复 add 去重 | 是：仍然存在的同队列 Job ID 不重复添加 | 业务 ID 设计；Job 删除后不再据此去重 |
| 阻止失效 Worker 写 PostgreSQL | 否；只保护自己的队列状态 | 对需要强所有权约束的业务写入做原子 Fencing 校验 |
| 同一支付/邮件/报告不重复产生业务结果 | 否 | 唯一约束、幂等键、外部副作用补偿或对账 |
| Redis 异常重启仍能恢复全部最近任务 | 不自动保证零数据丢失 | AOF / Redis 部署、备份、可靠性目标 |
| PostgreSQL 业务写入与 Redis queue.add 原子提交 | 否；二者不是同一个本地事务 | 需要时采用 Transactional Outbox 与可靠投递 |

注意 Job ID 去重与业务幂等不等价：BullMQ 对仍保留在同一 Queue 的 jobId 可以去重，但是完成后被清理的 Job 不再阻止同一个 jobId 重新加入。对于重复执行的同一个已入队 Job，BullMQ 也可能因租约恢复而再次调用 Processor。因此不能把 jobId、Lock、去重键与业务结果的数据库唯一约束混为同一个机制。[BullMQ Job IDs](https://docs.bullmq.io/guide/jobs/job-ids)。

### 【生产持久化、跨系统交接和真实项目映射构成最后的可靠性边界】

BullMQ 默认 Redis Backend 通过 Redis 保存任务，因此必须考虑 Redis 的持久化和容量边界：官方推荐开启 AOF，并将 maxmemory-policy 设置为 noeviction，避免用于队列的数据 Key 被 Redis 当作可淘汰缓存删除。AOF 每秒刷盘仍可能损失最近写入，并不意味着 queue.add 返回成功就达到了零丢失承诺。[BullMQ Going to production](https://docs.bullmq.io/guide/going-to-production)。

还有 Producer 的跨系统双写：

~~~text
HTTP API：PostgreSQL 中创建业务请求记录
             ↓
         Redis queue.add 提交 Job
             ↓
         两个持久化系统不共享本地事务

若 PostgreSQL 已提交、Redis 入队之前崩溃：
数据库里存在请求，但队列里没有对应 Job。
~~~

对不能漏投的关键请求，可通过 Transactional Outbox 在 PostgreSQL 业务事务内同时记录业务请求与待投递事件，由独立投递器将事件送入 BullMQ，并在 BullMQ / 下游以稳定事件 ID 实现去重；这样是**可靠交接和重试**，仍不等于“跨 Redis/PostgreSQL/LLM 自动恰好执行一次”。

**与 Browser Monitor 源码的边界**：当前 [OutboxWorker](https://github.com/cxDlogver/browser-monitor/blob/main/platform/apps/worker/src/outbox-worker.ts) 使用 PostgreSQL 的 FOR UPDATE SKIP LOCKED 领取 outbox_tasks，并在数据库中记录 processing / locked_at / locked_by；它不是 BullMQ Worker，不存在 BullMQ 内部 wait/prioritized List 或 BullMQ 自动续锁。因此不能把本讲的 BullMQ 特性直接描述成当前项目已经实现的功能，只能作为可比较的另一种任务调度方案。

**面试可以归纳为：**

> BullMQ 用 Queue.add 接收 Job，在默认 Redis 后端把任务内容保存到 Hash，把可调度状态组织在 wait、prioritized、delayed 等 Redis 结构中。Worker 通过内部原子脚本从 wait 或 prioritized 领取 Job，移动到 active 并建立有期限的锁；Worker 自动续锁，失联后通过 stalled 检测恢复任务，成功或失败则自动维护完成状态与重试。普通 wait 任务默认 FIFO 且优先于显式正数 priority 任务；delayed 到期只是重新获得调度资格，不能断言它会立即抢先执行。业务仍需负责报告/支付的幂等性、下游 Fencing 和跨系统持久化一致性，因此 BullMQ 提供的是队列运行可靠性，不是自动覆盖全部业务副作用的全局事务。

## 5. 业务结果已经保存，但 ACK 未提交时为什么仍然可能重复执行

**本讲核心问题：** AI 文档分析 Worker 已将报告保存到 PostgreSQL，却在 BullMQ 确认 completed 前崩溃。报告明明存在，为什么还会触发重新执行？若反过来先 ACK 后保存，会发生什么？怎样理解 At-most-once、At-least-once、业务幂等与 Kafka Offset Commit？

**先给结论：** 报告持久化和任务状态确认分别发生在业务数据库与队列系统中，没有天然的跨系统原子事务。为了尽量避免丢失工作，通常选择先持久化业务结果，再确认任务已完成，接受故障恢复时可能重新执行的事实，并用稳定业务 ID 与幂等约束保证最终结果。Kafka 也有类似故障窗口，但它提交的是某 Consumer Group 在某 Partition 的**下一次消费位置**，不是给一条消息标 completed。

### 【业务成功与队列确认成功是两个独立的事实】

~~~text
BullMQ / Redis                               PostgreSQL 业务数据库
Job: active                                  报告尚不存在
     │                                           │
     │ Worker A 调用 LLM                          │
     │                                           │
     └─────────── INSERT 报告提交成功 ────────────►│
                                                 报告已存在
     │
     │ Worker A 在 Processor 返回后、
     │ 或 BullMQ 更新 completed 前崩溃
     ▼
队列仍未确认 Job 完成
     │
     ├─ 锁失效 / stalled 检测 / 任务恢复
     ▼
Worker B 再次领取同一个 Job
     │
     └─ 可能再次调用 LLM、保存报告
~~~

一条完整的业务链路至少存在两个提交点：PostgreSQL 的 INSERT/COMMIT 与 BullMQ 在 Redis 中把 active Job 转为 completed。这两步由不同存储系统负责。即使代码上先 await saveReport()，再 return 让 BullMQ 标记 completed，也不等于 PostgreSQL 与 Redis 的写入被封装成同一个 ACID 事务。

**同一任务处理函数成功运行过一次，不等于队列已成功记录它完成；队列未记录完成，也不等于业务一定没有产生过结果。**

### 【先 ACK 与后 ACK 分别暴露业务遗漏和重复处理风险】

~~~text
方案一：先确认任务完成，再保存结果
Claim → ACK / completed → Worker 崩溃 → 结果未保存
                                          ↓
                                队列不再主动重新调度
                                          ↓
                                      业务遗漏

方案二：先保存结果，再确认任务完成
Claim → 报告 INSERT 成功 → Worker 崩溃 → ACK 尚未完成
                                          ↓
                                 恢复后重新领取 Job
                                          ↓
                                     业务重复执行
~~~

BullMQ 普通 Worker 默认由框架在 Processor 成功返回以后尝试确认 Job completed；开发者通常应该先等待重要业务结果持久化成功，再正常 return。对需要重试的失败应抛出异常，不能 catch 以后直接返回“成功”。

| 交付/处理语义 | 关注的保证 | 可能出现的后果 | 常见倾向 |
| --- | --- | --- | --- |
| At-most-once（至多一次） | 最多尝试交付或处理一次，可能完全没有成功执行 | 确认后崩溃，业务可能遗漏 | 处理前先确认，或禁止恢复重试 |
| At-least-once（至少一次） | 允许重复交付或处理，尽量不遗漏已经可靠接收的工作 | 同一任务可以执行多次 | 业务结果先持久化，随后确认；失败时重试 |
| Exactly-once Effect（业务效果恰好一次） | 同一业务意图最终只产生一次合法业务效果 | 需要业务唯一约束、幂等键、下游合作或范围受限的事务 | 至少一次交付配合幂等处理，或支持的同一事务边界 |

这些是抽象语义，不是“任何系统一定百分之百完成”的承诺：如果任务重试次数耗尽、进入死信、基础设施长期不可用，At-least-once 风格并不保证业务必然成功。At-most-once 也不是“恰好成功一次”，而是可能**零次或一次**。所谓 Exactly-once Effect 也通常不意味着处理函数绝对只被调用一次。

### 【用 PostgreSQL 唯一约束保证重复执行不会保存两份报告】

继续使用 AI 分析任务，约定相同文档版本对应稳定业务操作 ID：

~~~text
operation_id = report:doc-1001:v1
~~~

在 PostgreSQL 中为结果建立唯一键：

~~~sql
CREATE TABLE analysis_reports (
  operation_id TEXT PRIMARY KEY,
  document_id TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
~~~

下面是 BullMQ Processor 的关键业务逻辑：

~~~javascript
const worker = new Worker("document-analysis", async job => {
  const operationId = "report:" + job.data.documentId + ":v" + job.data.version;

  // 提前复用成功结果，降低普通重试的 LLM 成本
  const existing = await pool.query(
    "SELECT operation_id FROM analysis_reports WHERE operation_id = $1",
    [operationId]
  );
  if (existing.rowCount > 0) return { operationId, reused: true };

  const report = await generateReport(job.data.documentId);

  // 真正防止重复入库的约束位于 PostgreSQL
  await pool.query(
    "INSERT INTO analysis_reports (operation_id, document_id, content) " +
    "VALUES ($1, $2, $3) ON CONFLICT (operation_id) DO NOTHING",
    [operationId, job.data.documentId, report]
  );

  // 返回后 BullMQ 尝试更新自己的 completed；二者非同一事务
  return { operationId };
}, { connection });
~~~

代码要区分两种能力：

- **前置 SELECT 是结果复用优化，而不是并发锁。** 如果此前报告已经保存，Worker B 可以跳过重复调用 LLM。
- **数据库 PRIMARY KEY 与 ON CONFLICT 才提供重复插入时的业务写入保护。** 若 A 和 B 在报告尚不存在时同时开始执行，二者仍可能都调用 LLM；最终数据库允许同一 operation_id 只有一条报告。

因此幂等保护的是**业务最终效果**，而不自动保证外部 API/LLM 只执行一次、只产生一次费用。如果必须避免昂贵重复计算，需要进一步引入已完成阶段的 Checkpoint、结果缓存/复用、稳定请求幂等键、步骤状态和补偿策略。对于无法在响应丢失后查询最终结果、也不支持幂等键的外部服务，不应声称系统能够完全避免重复外部请求。

还要区分业务 operation_id 和执行世代 lease_version：相同业务重试应沿用**稳定操作 ID**，但任务重新领取应改变 owner / lease_version。若用每次变化的尝试 ID 作为业务幂等键，就失去了跨重试去重的能力。

### 【Fencing 与幂等分别约束执行者资格和重复业务效果】

同一任务可能由于锁过期而出现 A、B 两个重叠执行者。Fencing 能够在实际写入端校验 owner、lease_version 和租约有效性，使失去权限的旧 Worker 不得覆盖合法当前结果。但它不会告诉新 Worker：“你的版本虽然合法，但这笔业务已经成功执行过。”例如 A 在合法持锁期间成功扣款，却在 ACK 前崩溃；B 使用新版本合法领取，若重复向支付平台扣款，Fencing 不会自动阻止第二次合法发起的支付业务。

因此：**Fencing 判断谁还能写；幂等判断这一笔业务是否已经产生过效果。** 两者不同，不可替代。[BullMQ Idempotent Jobs](https://docs.bullmq.io/patterns/idempotent-jobs)。

### 【Kafka Offset Commit 同样有确认间隙，但不是逐 Job ACK】

Kafka 的最小模型是 Topic（主题）→ Partition（分区）→ Offset（分区内消息位置）。例如：

~~~text
Topic：analysis-events / Partition 0

Offset 40  doc-A
Offset 41  doc-B
Offset 42  doc-C ← 当前 Consumer 正在处理
Offset 43  doc-D
~~~

如果 Consumer 已经成功处理 offset=42，下一条应该从 offset=43 开始。因此针对这个分区，**提交的 committed offset 通常是 43（下一次消费的位置），不是 42**。

~~~text
Consumer 读取 offset 42
       ↓
保存业务结果成功
       ↓
提交该分区的 committed offset = 43
       ↓
恢复后从 43 继续
~~~

如果已保存 offset 42 的结果，但尚未提交 committed offset=43，Consumer 崩溃并发生分区重新分配后，新的 Consumer 仍可能再次读到 offset 42。这与 BullMQ “报告已保存，completed 未确认”属于同一类可靠性间隙，但实现方式不同。

反过来先提交 43、再保存 offset 42 的结果，则在两步之间崩溃时，offset 42 可能被跳过。实际使用 Kafka 还要考虑自动提交（Auto Commit）：如果它在业务结果可靠保存前提前提交，也会造成类似风险。为掌握明确的故障边界，可先学习手动提交与处理完成后的 Offset 推进。

多条消息并发处理时，**不能因为 Offset 42 已完成就直接提交 43，而不考虑 Offset 41 是否仍未完成**：同一 Partition 的 Committed Offset 表达可恢复的连续处理进度，前移过快会丢失尚未完成的处理机会。Offset 并非给每条业务消息附加一个已完成布尔值。

Kafka 的提交位点**不会删除 Topic 中的原始消息**；消息保留由 Kafka 的 Retention 等策略决定。Kafka 对 Kafka Topic → Kafka Topic 的事务式处理可以在特定边界内支持 Exactly-once 语义，但结果写入 PostgreSQL、支付或 LLM 时仍需要下游配合，不能由 Kafka 事务自动覆盖全部外部副作用。[Apache Kafka Design](https://kafka.apache.org/40/design/design/)。

### 【结果与确认都位于同一个 PostgreSQL 时，可以缩小本地事务间隙】

如果任务队列本身就是 PostgreSQL Job Table，而业务结果也存在同一数据库，则可在同一事务内核验有效 Job 所有权、保存业务结果、将任务更新为 completed：

~~~text
BEGIN
  检查 owner / lease_version / lease_until
  写入业务结果（必要时唯一约束去重）
  将 Job 标记 COMPLETED
COMMIT

要么一起提交，要么一起回滚
~~~

但这无法撤销此前已经完成的 LLM 调用，也不能把外部支付接口纳入这个数据库事务。

对照项目实践：[Browser Monitor OutboxWorker](https://github.com/cxDlogver/browser-monitor/blob/main/platform/apps/worker/src/outbox-worker.ts) 目前的投影处理与 completed 状态更新不是同一个数据库事务，所以依然存在“投影已成功、任务尚未确认”的重复处理窗口。不能因为用了 PostgreSQL 就默认避免了整个 ACK Gap。

### 【面试回答要先讲故障窗口，再解释处理语义和业务保护】

> 多 Worker 正常领取时可以通过原子 Claim 保证一个 waiting Job 只有一个成功领取者，但业务结果持久化与队列确认通常不属于同一个事务。比如报告已经成功写入 PostgreSQL，Worker 在 BullMQ 标记 completed 前崩溃，Job 可能被重新调度，导致业务重复执行。
>
> 如果为了避免重复而提前 ACK，又可能出现 ACK 后崩溃、结果没有保存的任务遗漏。因此关键业务通常倾向先可靠保存结果，再确认消费进度，即允许至少一次处理，并通过稳定业务 ID、唯一约束或下游幂等键确保重复执行不产生额外业务效果。
>
> Kafka 的 Offset Commit 也是确认消费进度，但它记录的是某 Consumer Group 在特定 Partition 下一条要处理的位置，并不把某条原始消息标记为 completed 或删除。读写外部数据库时仍然存在处理结果提交与位点提交之间的失败窗口。

## 6. 下一讲追问：Kafka 的 Topic、Partition、Offset 和 Consumer Group 如何共同完成分工与恢复

> **思考题：** BullMQ 通过 wait / active / completed 等集合维护任务生命周期；Kafka 为什么采用可保留的分区追加日志，并用 Consumer Group 的 committed offset 表示进度？如果 Consumer A 崩溃，Consumer B 如何接管分区、确定应该从哪条消息重新开始？

下一讲循序渐进地建立 Topic、Partition、Offset 和 Consumer Group 的关系，再展开故障接管；暂不铺开 Kafka Broker 副本、事务等更深层架构。

## 7. 参考资料与主文档关联

1. [Node.js Learn：The Node.js Event Loop](https://nodejs.org/en/learn/asynchronous-work/event-loop-timers-and-nexttick)：运行时异步 I/O 和事件循环行为。
2. [MDN HTTP：202 Accepted](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Status/202)：HTTP 请求已接受但尚未完成。
3. [服务端异步任务与消息处理体系](../F-服务端异步任务与消息处理体系.md)：可靠交接、Task State、Claim、Lease、Retry 与 Kafka 的更完整通用知识，供后续章节按需展开。
4. [服务端可靠性体系](../F-服务端可靠性体系.md)：进程崩溃、可靠性承诺和恢复目标。
5. [Browser Monitor 数据库 Outbox 实现](https://github.com/cxDlogver/browser-monitor/blob/main/docs/异步任务与Worker可靠消费体系源码学习.md)：可对照 PostgreSQL Job Table 与独立 Worker 的实际工程机制。
6. [PostgreSQL SELECT / SKIP LOCKED](https://www.postgresql.org/docs/current/sql-select.html)：多 Worker 领取候选任务时的行级并发协调。
7. [PostgreSQL Explicit Locking](https://www.postgresql.org/docs/current/explicit-locking.html)：行级锁与事务生命周期边界。
8. [Redis Transactions](https://redis.io/docs/latest/develop/using-commands/transactions/)：MULTI/EXEC 的隔离执行、WATCH 乐观锁、执行阶段错误及不支持通用回滚的边界。
9. [Redis Scripting with Lua](https://redis.io/docs/latest/develop/programmability/eval-intro/)：Lua 的原子执行语义、读取后判断与服务端条件更新。
10. [Redis SET](https://redis.io/docs/latest/commands/set/)：NX/PX 条件设置与带过期时间的最小锁。
11. [Redis LMOVE](https://redis.io/docs/latest/commands/lmove/)：从 waiting 到 active 的原子队列元素移动与恢复队列模式。
12. [BullMQ Stalled Jobs](https://docs.bullmq.io/guide/workers/stalled-jobs)：续租中断、Event Loop 阻塞和任务再次分配的实际机制。
13. [Martin Kleppmann：How to do distributed locking](https://martin.kleppmann.com/2016/02/08/how-to-do-distributed-locking.html)：Fencing Token 的背景、受保护存储必须主动验证令牌的前提。
14. [Stripe Idempotent Requests](https://docs.stripe.com/api/idempotent_requests)：业务幂等键与安全请求重试的实际例子。
15. [BullMQ Architecture](https://docs.bullmq.io/guide/architecture)：waiting、prioritized、delayed、active、completed、failed 的状态模型。
16. [BullMQ Prioritized](https://docs.bullmq.io/guide/jobs/prioritized)：priority=0 优先于正数 priority、较小正数优先、同级 FIFO。
17. [BullMQ Delayed](https://docs.bullmq.io/guide/jobs/delayed)：延迟资格、到期提升与不能保证准点执行。
18. [BullMQ moveToActive-11.lua 源码](https://github.com/taskforcesh/bullmq/blob/master/src/commands/moveToActive-11.lua)：先从 wait 领取，再从 prioritized 领取，以及锁准备入口。
19. [BullMQ promoteDelayedJobs.lua 源码](https://github.com/taskforcesh/bullmq/blob/master/src/commands/includes/promoteDelayedJobs.lua)：到期任务按 priority 转入 wait 或 prioritized，默认普通任务采用 LPUSH。
20. [BullMQ Job IDs](https://docs.bullmq.io/guide/jobs/job-ids)：Job ID 的队列内唯一性与删除后去重失效。
21. [BullMQ Going to production](https://docs.bullmq.io/guide/going-to-production)：Redis 持久化、noeviction、重连等生产环境条件。
22. [BullMQ v6 PostgreSQL Backend 公告](https://bullmq.io/news/260927/bullmq-v6-postgresql/)：v6 提供可选 PG 后端，Redis 仍为默认后端。
23. [BullMQ Stalled](https://docs.bullmq.io/guide/jobs/stalled)：stalled 属于失锁后的恢复事件，不是独立 Job 状态。
24. [BullMQ Idempotent Jobs](https://docs.bullmq.io/patterns/idempotent-jobs)：重试下的业务幂等与结果保护。
25. [BullMQ Workers](https://docs.bullmq.io/guide/workers)：Processor 返回/抛错与任务完成或失败状态转换。
26. [Apache Kafka 4.0 Design](https://kafka.apache.org/40/design/design/)：At-most-once、At-least-once、Offset 和跨系统 Exactly-once 边界。
27. [Apache KafkaConsumer API](https://kafka.apache.org/40/javadoc/org/apache/kafka/clients/consumer/KafkaConsumer.html)：提交的 Offset 表示下一条待消费记录的位置。


> 本文为学习进程中的**独立草稿**，不覆盖正式通用文档，也不修改源代码。按逐节讨论方式继续追加，下一讲保留一个核心思考题供作答。
