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

## 4. 下一讲追问：结果已成功但 ACK 未提交时，为什么可能重复执行

> **思考题：** Worker 已成功把报告写入 PostgreSQL，但还没把任务标记 completed（或 Kafka Consumer 尚未提交对应 Offset），进程突然崩溃。任务重启以后是否可能再次执行？怎样避免再次调用昂贵的 LLM？反过来，把 ACK 提前到写报告之前，会有什么风险？

下一讲以这个故障窗口为起点，区分 At-most-once、At-least-once、Idempotency 和 Kafka Offset Commit，而不是提前铺开整个 Kafka 架构。


## 5. 参考资料与主文档关联

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

> 本文为学习进程中的**独立草稿**，不覆盖正式通用文档，也不修改源代码。按逐节讨论方式继续追加，下一讲保留一个核心思考题供作答。
