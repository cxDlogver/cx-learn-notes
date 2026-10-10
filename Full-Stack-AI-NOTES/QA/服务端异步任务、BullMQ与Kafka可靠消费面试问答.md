# 服务端异步任务、BullMQ 与 Kafka 可靠消费面试问答

> 本文按照“运行时异步 → 任务可靠交接 → 多 Worker 并发与恢复 → BullMQ → ACK Gap → Kafka Consumer Group → KafkaJS 消费和并发”的学习依赖组织。每题包含【提问】【回答要点】【标准回答】。回答要点保留既有详解中的执行时间线、代码、SQL、Lua、表格、案例与错误边界；标准回答供面试时复述。第八章补充重试、死信和可靠投递机制；未实际执行的示例及版本相关行为均明确保留验证边界。

**阅读入口：** [服务端异步任务与消息处理体系](<../F-服务端异步任务与消息处理体系.md>) · [知识体系索引](<../知识体系索引.md>) · [QA 总索引](<../QA.md>)

**前置知识：** [Node.js Runtime](<../N-NodeJS核心总结.md>) · [服务端可靠性体系](<../F-服务端可靠性体系.md>) · [Redis 完整知识体系](<../R-Redis完整知识体系.md>)。与实际工程的对应实现可参考 [Browser Monitor 异步任务与 Worker 可靠消费分析](https://github.com/cxDlogver/browser-monitor/blob/main/docs/异步任务与Worker可靠消费体系源码学习.md)。上述代码示例用于解释机制，不应被视为本仓库项目的现成实现。

**回答组织：** 先给结论，再沿运行原理与执行时间线展开，结合代码及故障案例说明边界，最后形成可复述的面试回答。

## 目录与知识主线

- 第一章：Node.js 异步机制与服务端可靠任务体系（7 道主问题）
- 第二章：数据库任务队列与独立 Worker 的工程设计（8 道主问题）
- 第三章：Worker 并发控制、Lease、Fencing 与任务确认（25 道主问题）
- 第四章：BullMQ 的任务存储、调度与可靠执行（8 道主问题）
- 第五章：ACK Gap、重复消费与消息处理语义（7 道主问题）
- 第六章：Kafka 的分区日志、Consumer Group 与故障恢复（13 道主问题）
- 第七章：KafkaJS 的消息发送、消费执行与 Offset 提交（13 道主问题）
- 第八章：Kafka 重试、死信、延迟调度与生产可靠性（已补充，代码待集成验证）
- 第九章：参考资料与知识关联

## 第一章：Node.js 异步机制与服务端可靠任务体系

**通用知识衔接：** [服务端异步任务与消息处理体系](<../F-服务端异步任务与消息处理体系.md>)第 1 章解释进程内异步、系统级异步以及为什么必须建立持久化交接边界。此处聚焦面试提问、完整回答要点与标准回答；通用文档提供该机制在异步系统中的上位位置。

**本讲核心问题：** Node.js 已经支持异步非阻塞 I/O，为什么还需要 Queue（任务队列）与 Worker（后台工作进程）？更进一步地，HTTP 请求提前返回是不是就意味着任务具有可靠性？

**先给结论：** JavaScript 的异步编程解决进程内执行任务时如何利用等待时间；系统级异步任务解决一项业务工作怎样脱离 HTTP 请求生命周期。只有当任务被**可靠持久化交接**，并具备后续消费、失败恢复与状态管理时，才能称为可恢复的后台任务系统。二者不是替代关系。

### 【1.1】Node.js 已经支持异步非阻塞 I/O，为什么仍然需要服务端独立异步任务机制？

**【提问】**

Node.js 已经支持异步非阻塞 I/O，为什么仍然需要服务端独立异步任务机制？

**关联追问：** 运行时异步解决等待期间怎样继续执行其他工作？

**【回答要点】**

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

**【标准回答】**

Node.js 异步 I/O 只让当前进程在等待期间处理其他事件，并没有自动拆分 HTTP 请求与长任务的生命周期。请求直接 await 分析仍需等待结果；可靠的后台任务要持久化工作事实并由独立 Worker 执行，结合任务状态、恢复和幂等处理。

### 【1.2】如何把 HTTP 请求的完成与耗时业务任务的完成分离？

**【提问】**

如何把 HTTP 请求的完成与耗时业务任务的完成分离？

**关联追问：** 系统级异步把 HTTP 请求结束与业务任务完成分开？

**【回答要点】**

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

**【标准回答】**

系统级异步要拆分接受请求和真正执行业务：API 完成鉴权、参数校验与任务持久化后返回 taskId；后台 Worker 独立领取并执行，客户端另行查询任务进度。请求提前结束并不等于任务已经完成。

### 【1.3】为什么在 API 中直接发起不等待的 Promise 不能实现可靠的后台任务？

**【提问】**

为什么在 API 中直接发起不等待的 Promise 不能实现可靠的后台任务？

**关联追问：** API 内 fire-and-forget Promise 能提前返回，但任务仍可能随进程崩溃丢失？

**【回答要点】**

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

**【标准回答】**

fire-and-forget Promise 只能使 HTTP 提前返回，执行现场仍依赖 API 进程，进程崩溃或容器重建时可能丢失工作。可靠方案必须先把待办事实持久化到数据库或队列，再让独立消费者持续发现、恢复和处理。

### 【1.4】HTTP 202 Accepted 和可靠交接分别表示什么？什么时候可以承诺任务已接收？

**【提问】**

HTTP 202 Accepted 和可靠交接分别表示什么？什么时候可以承诺任务已接收？

**关联追问：** 可靠交接要求先保存可恢复的待办事实，再承诺任务已接收？

**【回答要点】**

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

**【标准回答】**

202 表示请求已被接受准备处理，并不保证最终执行成功。API 应在可恢复的任务记录或消息已达到所需持久化确认条件后，才返回接受信息与任务标识，避免已经对客户端承诺、服务却无从重新发现工作的故障窗口。

### 【1.5】完整的后台任务系统应具备怎样的组件和生命周期？

**【提问】**

完整的后台任务系统应具备怎样的组件和生命周期？

**关联追问：** 完整后台任务系统拥有独立于 Request 的生命周期？

**【回答要点】**

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

**【标准回答】**

至少区分生产者 API、持久任务存储与独立 Worker；任务经过待执行、原子领取、执行、成功或失败确认，失联后还应允许回收和重试。并发领取安全、幂等、可观测与对账是可靠性要求，而非仅有一个队列名称。

### 【1.6】普通 await、fire-and-forget Promise、数据库 Job Queue 与消息系统如何选择？

**【提问】**

普通 await、fire-and-forget Promise、数据库 Job Queue 与消息系统如何选择？

**关联追问：** 三种写法比较揭示“异步执行”和“可靠异步处理”的差别？

**【回答要点】**

| 方案 | HTTP 能否快速返回 | 核心问题 | 崩溃后的恢复条件 |
| --- | --- | --- | --- |
| 直接 await 完整分析 | 通常需要等待业务完成 | I/O 等待不阻塞 Event Loop，但请求仍等待结果 | 原请求不自动重建，需客户端/服务端另外设计 |
| 直接启动不等待的 Promise | 可以 | Task 仍可能只依赖当前 API 进程 | 没有可靠状态时无法自动恢复 |
| 持久化 Job + Worker | 可以 | 请求与任务生命周期被拆开，需要维护后台任务机制 | 依靠已持久化任务、领取、重试与业务幂等恢复 |

第三种方案并不意味着必须部署 Kafka。对于较简单的后台任务，PostgreSQL 的任务表和定时 Worker 也可以实现可靠交接；任务更多、调度更复杂时，可以引入成熟的 Queue 工具；对多 Consumer Group、持久消息日志和事件回放等需求，才逐步讨论 Kafka 为什么适合。它们对应同一个上位问题的不同承载方式，而不是层次完全相同的替代品。

**【标准回答】**

直接 await 适合需要即时返回结果的工作，不等待 Promise 只解决请求延迟；PostgreSQL Job Table 加独立 Worker 可以实现基础可靠交接与恢复。BullMQ 进一步封装逐 Job 调度和重试，Kafka 侧重保留事件日志、分区消费与多组订阅，选型取决于业务问题。

### 【1.7】面试时如何回答 Node.js 非阻塞与消息队列的关系？

**【提问】**

面试时如何回答 Node.js 非阻塞与消息队列的关系？

**关联追问：** 面试题：Node.js 已经异步非阻塞，为什么仍需要消息队列？

**【回答要点】**

**标准回答：**

首先，Node.js 的异步 I/O 主要解决当前进程等待网络、文件或数据库时如何继续处理其他工作，不代表业务任务已经脱离当前 HTTP Request 生命周期。如果在接口中直接 await 耗时操作，虽然 I/O 等待通常不阻塞 Event Loop，客户端仍然要等整个业务结果返回。

其次，直接启动一个不等待的 Promise，只解决 HTTP 能否提前响应，并没有保证进程退出后任务仍然存在。如果任务没有进入持久化存储，进程崩溃就可能失去恢复依据。

所以，对于用户不需要立即得到最终结果、且具有耗时长、并发或失败重试需求的业务，可以先将 Job 持久化，API 返回 taskId，再交由后台 Worker 领取和执行。这样能够进一步建立任务状态、并发控制、失败重试、重复消费保护与故障恢复能力。

最后，消息队列不是唯一实现。数据库 Job Table 可以构建同样的基础机制；BullMQ 和 Kafka 提供不同的调度与事件消费模型。是否选用专业消息中间件，应按业务完成语义和实际规模判断，而不是把“使用了 async / await”视为充分条件。

**容易失分的回答：** “Node.js 是单线程，所以不能做耗时任务，必须用 Kafka。” 这将 CPU 同步阻塞、I/O 异步以及业务后台任务混成同一问题。Node.js 可以高效处理异步网络 I/O；真正引入独立任务机制的原因是业务完成边界、可靠交接与故障恢复，而不是所有耗时函数都无法在 Node.js 中运行。

**【标准回答】**

先区分运行时异步和跨进程任务可靠性：异步 I/O 不阻塞等待，却不能保证长任务独立存活；fire-and-forget 不能抗进程崩溃。需要持久化工作和 Worker 接管时引入数据库任务队列或专业队列，具体产品取决于调度、消息分发和重放需求。

## 第二章：数据库任务队列与独立 Worker 的工程设计

**通用知识衔接：** [服务端异步任务与消息处理体系](<../F-服务端异步任务与消息处理体系.md>)第 2、3、4 章解释可靠交接、独立 Worker、原子 Claim 和数据库队列。此处聚焦面试提问、完整回答要点与标准回答；通用文档提供该机制在异步系统中的上位位置。

**本讲核心问题：** 如果任务先写入数据库，再由 API 启动一个不等待的分析函数并立刻返回 HTTP，算不算可靠的异步系统？

**核心结论：** 持久化任务记录只保证系统保留了“这项工作存在”的证据；要让工作在 API 或 Worker 崩溃后仍能恢复，需要有独立、持续的**任务发现 → 安全领取 → 执行 → 结果确认 → 超时恢复**机制。PostgreSQL 本身就可以支撑这一机制，不需要为了“可靠”这一单一目标必然引入 Kafka。

### 【2.1】数据库已有 Job 记录，为什么 API 内自行启动 Promise 仍可能造成任务无人执行？

**【提问】**

数据库已有 Job 记录，为什么 API 内自行启动 Promise 仍可能造成任务无人执行？

**关联追问：** 只把 Job 写进数据库，再启动 API 内 Promise，仍会存在无人执行的任务？

**【回答要点】**

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

**【标准回答】**

任务表只保存了需要处理的事实，并没有保证 API 进程中的异步函数崩溃后被重新启动。若没有另一个持续扫描并处理 PENDING 工作的执行者，记录可能永久留在库中。持久化交接必须与独立 Worker 的发现机制配合。

### 【2.2】Producer、Job Table、Worker 各自负责什么？为什么应分开？

**【提问】**

Producer、Job Table、Worker 各自负责什么？为什么应分开？

**关联追问：** 把生产者和消费者拆开，建立独立的任务生命周期？

**【回答要点】**

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

**【标准回答】**

Producer 负责请求校验、创建任务并返回 taskId；Job Table 负责可靠保存待办和执行状态；Worker 负责原子领取、实际执行、保存结果及确认。分离后 API 退出不会切断任务执行者的运行机制，恢复逻辑也可以独立部署。

### 【2.3】独立 Worker 怎样持续发现任务？为什么不能依赖 API 当时成功调用函数？

**【提问】**

独立 Worker 怎样持续发现任务？为什么不能依赖 API 当时成功调用函数？

**关联追问：** Worker 通过持续轮询发现任务，而不是依赖 API 当时成功调用一个函数？

**【回答要点】**

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

**【标准回答】**

最简单的 Worker 可以在独立进程中循环领取 PENDING 工作，没有任务时等待后再次检查；因此即使创建任务的 API 进程已退出，待办仍能被发现。轮询、通知或队列消费是发现策略，关键是执行入口不能只存在于原 HTTP 回调中。

### 【2.4】为什么多个 Worker 领取同一数据库任务时必须原子 Claim？

**【提问】**

为什么多个 Worker 领取同一数据库任务时必须原子 Claim？

**关联追问：** 任务领取必须是原子操作，多个 Worker 不能只读状态然后自行执行？

**【回答要点】**

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

**【标准回答】**

如果 A、B 分别 SELECT 得到同一个 PENDING，再各自执行，就会双重处理。原子 Claim 要把候选选择和状态变更放入受数据库并发控制保护的事务或条件更新中，使只有成功拿到处理权的 Worker 才能运行任务。

### 【2.5】Worker 已将 Job 标记 RUNNING 后崩溃，为什么任务可能永久卡住？

**【提问】**

Worker 已将 Job 标记 RUNNING 后崩溃，为什么任务可能永久卡住？

**关联追问：** Worker 崩溃后重新领取任务，需要识别失联而不是永远等待 RUNNING？

**【回答要点】**

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

**【标准回答】**

RUNNING 仅记录过去某次领取成功，不证明对应 Worker 仍然存活。如果没有租约到期、心跳或超时回收，任务会长期无法再次领取。应记录领取者和可恢复的有效期，并设计失联后重新开放处理权的规则。

### 【2.6】报告已保存但任务成功状态没写入，为什么恢复领取可能导致重复执行？

**【提问】**

报告已保存但任务成功状态没写入，为什么恢复领取可能导致重复执行？

**关联追问：** 恢复领取不等于只执行一次：报告已写入但成功状态未写时仍可能重复？

**【回答要点】**

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

**【标准回答】**

业务结果持久化和任务终态确认通常分属两个操作：报告写库成功后 Worker 崩溃，Job 仍是 RUNNING 或待确认，恢复后可重新调用模型。需要稳定业务键、数据库唯一约束或下游幂等机制，使重复执行不产生重复效果。

### 【2.7】什么时候 PostgreSQL Job Table 就够用，什么时候需要 BullMQ 或 Kafka？

**【提问】**

什么时候 PostgreSQL Job Table 就够用，什么时候需要 BullMQ 或 Kafka？

**关联追问：** 数据库 Job Queue 与专业消息系统解决的是同一上位问题的不同部分？

**【回答要点】**

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

**【标准回答】**

PostgreSQL Job Table 加独立 Worker 可以承担小到中等规模的持久化、原子领取、重试和恢复；但需要自行管理调度、锁和监控。BullMQ 提供成熟的逐 Job 生命周期，Kafka 更适合多 Consumer Group、可重放事件日志和分区吞吐，不应把三者简单视为性能高低排序。

### 【2.8】为什么任务持久化与独立 Worker 必须同时存在，才构成可靠异步执行？

**【提问】**

为什么任务持久化与独立 Worker 必须同时存在，才构成可靠异步执行？

**关联追问：** 面试回答：数据库有了任务记录，为什么仍需要独立 Worker？

**【回答要点】**

可以按“已有保证 → 缺失能力 → 最小完整方案”回答：

第一，把 Job 写入数据库只完成持久化交接，表示系统有一份待执行工作记录，但数据库不会自动恢复原先 API 进程中的 Promise。

第二，需要一个独立 Worker 持续查询可执行任务，并通过数据库事务和行锁原子领取，避免多个 Worker 同时把同一个 PENDING Task 当作自己的工作。

第三，还需要在 Worker 崩溃时通过 Lease/超时回收重新开放执行权，并通过业务幂等和结果对账处理重复执行。任务报告及终态必须持久化，不能以“异步函数已经启动”作为业务成功。

最后，对于任务量和调度复杂度可控的场景，PostgreSQL Job Table + Worker 就是一套可行的可靠异步实现；BullMQ 或 Kafka 不是强制前提。业务发展到独立消息分发、复杂调度或多种消费者时，再根据工作模型决定是否引入专业消息基础设施。

**【标准回答】**

数据库记录使任务在生产者退出后仍然存在，独立 Worker 使它能够被持续发现和执行；原子 Claim 避免正常领取冲突，租约和失败恢复避免永久卡住，业务幂等消除确认窗口中的重复影响。只有同时覆盖这些链路才具备可恢复性。

## 第三章：Worker 并发控制、Lease、Fencing 与任务确认

**通用知识衔接：** [服务端异步任务与消息处理体系](<../F-服务端异步任务与消息处理体系.md>)第 3、4、5 章解释 Claim、Lease、Renewal、Fencing 与重复处理风险，并给出 SQL/Redis 实现。此处聚焦面试提问、完整回答要点与标准回答；通用文档提供该机制在异步系统中的上位位置。

**本讲核心问题：** Worker A 已领取任务但可能崩溃、暂停或网络断连，系统如何重新把任务交给 Worker B，同时避免两个 Worker 都认为自己拥有有效处理权？

**结论：** Claim（原子领取）决定谁最初获得处理权；Lease（租约）决定处理权的有效时间；Renewal（续租）让正常执行的长任务继续保持有效；Fencing（所有权世代隔离）拒绝旧执行者对状态和业务结果的非法写回；ACK（消费确认）则决定任务什么时候真正结束。它们不能互相替代。

### 【3.1】任务领取与并发竞争

#### 【3.1.1】固定时间回收 RUNNING 任务为什么可能错误接管？

**【提问】**

固定时间回收 RUNNING 任务为什么可能错误接管？

**关联追问：** 五分钟固定超时会产生错误接管，因为超时不意味着 Worker 已死亡？

**【回答要点】**

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

**【标准回答】**

处理耗时长于固定阈值不意味着执行者已经死亡：A 正在合法调用 LLM 时，B 可能因五分钟回收机制误判而接管。超时回收必须结合活跃证明、租约与执行权隔离，不能把处理时长直接等同于 Worker 存活状态。

#### 【3.1.2】两个 Worker 都读到 PENDING 再写 RUNNING，为什么单条写命令原子仍会重复领取？

**【提问】**

两个 Worker 都读到 PENDING 再写 RUNNING，为什么单条写命令原子仍会重复领取？

**关联追问：** 只修改 RUNNING 无法避免重复领取，原因是 Worker 可能已在修改前读取到 PENDING？

**【回答要点】**

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

**【标准回答】**

竞争发生在读到旧状态到写入新状态的间隙。虽然每次 HSET 或 UPDATE 本身不可拆分，A、B 仍可能都根据之前的 PENDING 判断自己可以执行。必须把资格检查、状态转换和领取成功响应作为同一个并发安全的条件操作。

#### 【3.1.3】PostgreSQL SELECT FOR UPDATE 如何协调多个 Worker 对同一任务的领取？

**【提问】**

PostgreSQL SELECT FOR UPDATE 如何协调多个 Worker 对同一任务的领取？

**关联追问：** PostgreSQL 的 FOR UPDATE 通过事务行锁协调多 Worker 的领取竞争？

**【回答要点】**

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

**【标准回答】**

FOR UPDATE 为选中的行取得事务级行锁，使其他冲突事务不能同时成功完成同一记录的冲突性更新。只有持有锁的事务检查任务状态并完成条件更新后才能确认领取；锁在事务提交或回滚时释放，不应长期覆盖 LLM 调用。

#### 【3.1.4】FOR UPDATE SKIP LOCKED 如何支持多个 Worker 并行领取不同任务？

**【提问】**

FOR UPDATE SKIP LOCKED 如何支持多个 Worker 并行领取不同任务？

**关联追问：** Claim 需要原子地选择和更新任务；数据库行锁不等于长任务租约？

**【回答要点】**

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

**【标准回答】**

Worker 在事务内选择 PENDING 行并加锁，SKIP LOCKED 使另一个 Worker 跳过当前已锁行，继续选择其他候选，再条件更新为 RUNNING 并返回领取结果。关键是同一事务内完成选择、标记和返回，避免各自在客户端读取旧状态后直接执行。

### 【3.2】PostgreSQL 与 Redis 的原子状态转换

#### 【3.2.1】PostgreSQL 与 Redis 为什么都需要原子条件状态转换？

**【提问】**

PostgreSQL 与 Redis 为什么都需要原子条件状态转换？

**关联追问：** PostgreSQL 与 Redis 的共同目标是原子条件转换，而不是禁止其他人读取？

**【回答要点】**

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

**【标准回答】**

两者面对的是同一业务约束：同一个可领取任务只能有一个成功领取者。PostgreSQL 可以依靠条件 UPDATE、事务和行锁，Redis 可以用条件命令、WATCH 或 Lua 把检查与变更封闭为单次安全操作；不是禁止其他客户端读取，而是禁止都成功取得执行权。

#### 【3.2.2】Redis MULTI/EXEC 如何运行，为什么不自动解决事务前的状态检查竞争？

**【提问】**

Redis MULTI/EXEC 如何运行，为什么不自动解决事务前的状态检查竞争？

**关联追问：** MULTI/EXEC 保证提交后连续执行，却不能自动解决提交前读取旧状态的问题？

**【回答要点】**

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

**【标准回答】**

MULTI 只是排队后续命令，EXEC 才按顺序执行；这种连续执行不意味着 Redis 会验证此前客户端读取的状态。若 A、B 都在 MULTI 前读到 PENDING，分别 EXEC 写 RUNNING，仍可能依次覆盖领取者，因此需要 WATCH 或把条件判断放在服务端原子脚本里。

#### 【3.2.3】Redis WATCH + MULTI/EXEC 怎样实现乐观并发领取？

**【提问】**

Redis WATCH + MULTI/EXEC 怎样实现乐观并发领取？

**关联追问：** WATCH + MULTI/EXEC 让客户端先读取再修改，同时检测是否有人抢先修改？

**【回答要点】**

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

**【标准回答】**

WATCH 在客户端读取前监视有关 Key；如果到 EXEC 前 Key 已被别的 Worker 修改，本次 EXEC 取消，当前 Worker 不能宣布领取成功。读状态、决定是否 MULTI、提交和检查 EXEC 结果必须使用相应连接上下文并处理冲突重试。

#### 【3.2.4】Redis MULTI/EXEC、WATCH 与 Pipeline 有什么区别？事务失败会回滚吗？

**【提问】**

Redis MULTI/EXEC、WATCH 与 Pipeline 有什么区别？事务失败会回滚吗？

**关联追问：** Redis MULTI/EXEC 的完整用法，以及 WATCH 为什么不能单独保证领取？

**【回答要点】**

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

**【标准回答】**

Pipeline 主要减少网络往返，本身不提供 Redis 事务的隔离执行；MULTI/EXEC 把命令排队并在 EXEC 时连续执行；WATCH 为提交前读写引入冲突检测。Redis 不提供通用的 SQL 式执行时错误回滚，某条命令错误时其他命令可能已执行。

#### 【3.2.5】Redis Lua 如何消除读取判断与修改之间的竞争窗口？

**【提问】**

Redis Lua 如何消除读取判断与修改之间的竞争窗口？

**关联追问：** Lua 把判断和修改放到 Redis Server 内，直接封闭 Check-Then-Act 竞争窗口？

**【回答要点】**

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

**【标准回答】**

把 HGET、资格判断、HSET 和返回成功写入同一个 Redis Lua 脚本，可以避免不同客户端命令在这些步骤之间穿插。脚本只允许第一个满足 PENDING 条件的执行者成功；客户端必须以脚本返回值为准，而非仅看 Redis 最终状态。

#### 【3.2.6】怎样实际使用 EVAL、KEYS、ARGV 和 redis.call 调用 Lua Claim 脚本？

**【提问】**

怎样实际使用 EVAL、KEYS、ARGV 和 redis.call 调用 Lua Claim 脚本？

**关联追问：** Lua 的实际调用：EVAL、KEYS、ARGV、redis.call 与返回值？

**【回答要点】**

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

**【标准回答】**

通过 EVAL 发送脚本与 Key/普通参数，KEYS 指定任务存储位置，ARGV 传入 Worker 领取标识，redis.call 在服务端读取判断并更新状态。复用同一脚本处理不同任务，客户端只在返回成功时开始执行，避免因重复调用而重复领取。

#### 【3.2.7】原子执行、隔离性、业务一致性和回滚为什么不能混为一谈？

**【提问】**

原子执行、隔离性、业务一致性和回滚为什么不能混为一谈？

**关联追问：** 区分原子执行、隔离性、一致性以及事务错误回滚，避免概念重新混淆？

**【回答要点】**

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

**【标准回答】**

业务要求只有一个 Worker 领取成功；为了实现它，关键条件变更需要原子执行或合适的事务隔离。原子不被穿插并不自动说明业务判断正确，也不意味着执行中途的所有写入可以回滚，必须分别检查状态条件、失败语义和数据持久化。

#### 【3.2.8】为什么 Redis Lua 和 MULTI/EXEC 的不可穿插执行不等于运行时错误回滚？

**【提问】**

为什么 Redis Lua 和 MULTI/EXEC 的不可穿插执行不等于运行时错误回滚？

**关联追问：** 执行期间不被穿插，不代表失败时自动回滚先前写入？

**【回答要点】**

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

**【标准回答】**

两者能够避免其他客户端在命令执行中途插入，但内部某条 Redis 命令运行时失败，先前已执行的修改可能保留。设计领取脚本时要提前验证输入与类型，并尽量使关键业务状态转换逻辑在所有检查通过后再执行写入。

#### 【3.2.9】Browser Monitor OutboxWorker 如何通过 PostgreSQL 原子领取任务？

**【提问】**

Browser Monitor OutboxWorker 如何通过 PostgreSQL 原子领取任务？

**关联追问：** Browser Monitor 源码体现同一目标，但使用的是 PostgreSQL Claim？

**【回答要点】**

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

**【标准回答】**

真实 OutboxWorker 通过事务性候选选择、FOR UPDATE SKIP LOCKED 和更新领取字段防止正常竞争中重复 Claim。它的模型属于 PostgreSQL Job Table，而不是 Redis Lua 或 BullMQ；原子领取不能替代长期运行任务的续租和失效写入防护。

#### 【3.2.10】面试回答原子 Claim 时，应该怎样准确说明 Check-Then-Act 竞态？

**【提问】**

面试回答原子 Claim 时，应该怎样准确说明 Check-Then-Act 竞态？

**关联追问：** 本次讨论的面试回答要强调发生竞态的准确位置？

**【回答要点】**

如果被问到“两个 Worker 都会设置 RUNNING，为什么还要 Redis 原子操作”，可以这样回答：

> RUNNING 能表达任务已经被领取，但它是一个状态值，不是独立的并发控制机制。如果两个 Worker 先后都读取到 PENDING，然后分别执行 HSET RUNNING，即使 Redis 单条命令是原子的，两个 Worker 仍然可能各自认为自己领取成功。
>
> 所以我们必须保证**任务资格检查与状态写入**属于同一个并发安全的条件转换。PostgreSQL 可以利用条件 UPDATE、事务和 FOR UPDATE SKIP LOCKED；Redis 则可以通过合适的单条条件命令、WATCH + MULTI/EXEC，或直接使用 Lua 在服务端读取、判断和修改。
>
> 原子执行强调命令不可被其他客户端穿插；在 Lua 与 EXEC 场景，这同时带来隔离执行效果。但它不等于 ACID 式运行时错误回滚；最终业务一致性仍取决于领取条件和状态转换是否写对。
>
> 正常并发领取只解决第一次的分配竞争。领取后 Worker 可能崩溃，任务还需要独立的租约、续租、超时恢复、ACK 和幂等机制，这属于下一阶段的可靠消费问题。

**【标准回答】**

先画出 A、B 都在更新前读取到 PENDING 的时间线，再指出单条 HSET 原子无法保护应用层的多步判断。正确做法是让状态检查、处理权变更和成功返回形成不可分割的条件转换，PostgreSQL 用行锁与条件更新，Redis 用 WATCH 或 Lua。

### 【3.3】Lease、Renewal 与失效执行者隔离

#### 【3.3.1】Lease 为什么是执行权有效期，而不是任务最长执行时间？

**【提问】**

Lease 为什么是执行权有效期，而不是任务最长执行时间？

**关联追问：** Lease 的核心不是限制任务总时长，而是给处理权设置到期时间？

**【回答要点】**

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

**【标准回答】**

Lease 为一次 Claim 的处理权设置可到期的期限，用于失联后的恢复，而不是要求业务必须在此时间内完成。长任务可以在仍有权处理期间续租；超过有效期不再续租，其他 Worker 才可能合法重新领取。

#### 【3.3.2】Renewal 怎样让长任务持续持有 Lease？

**【提问】**

Renewal 怎样让长任务持续持有 Lease？

**关联追问：** Lease 与 Renewal 区分的是执行权有效期和任务实际运行时长？

**【回答要点】**

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

**【标准回答】**

Worker 周期性确认自己仍持有当前 owner 和执行世代，在租约到期之前把有效期向后延长。租约可以短于总任务耗时，只要续租持续成功；关键是续租必须验证当前领取身份，不能让旧 Worker 给别人接管后的任务延长租约。

#### 【3.3.3】为什么 Lease 过期后会出现新旧 Worker 同时运行？

**【提问】**

为什么 Lease 过期后会出现新旧 Worker 同时运行？

**关联追问：** 续租中断会引入新旧 Worker 并行执行，不能把过期当作旧 Worker 已死亡？

**【回答要点】**

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

**【标准回答】**

A 因暂停或网络故障错过续租、租约到期后 B 合法接管；A 的进程却可能恢复并继续之前启动的业务代码。租约过期只意味着旧处理权失效，不意味着旧进程已死亡，因此要用后续写入校验阻止旧执行者造成覆盖。

#### 【3.3.4】Fencing Token 如何识别任务接管前后的新旧执行世代？

**【提问】**

Fencing Token 如何识别任务接管前后的新旧执行世代？

**关联追问：** Fencing Token 在租约失效后拒绝旧 Worker 写入？

**【回答要点】**

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

**【标准回答】**

每次成功取得新的任务处理权时增加执行版本，A 使用旧版本，B 接管后获得更高版本。受保护的数据写入要拒绝比当前有效世代更旧的请求，从而避免恢复的旧 Worker 覆盖新结果；给 Worker 发一个版本值本身并不足以实现隔离。

#### 【3.3.5】为什么 Fencing 一定需要下游在实际写入时校验？

**【提问】**

为什么 Fencing 一定需要下游在实际写入时校验？

**关联追问：** Fencing 能否一定阻止旧 Worker 写入，取决于谁在写入时验证版本？

**【回答要点】**

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

**【标准回答】**

如果 A 先读到仍有权处理，再等待网络调用期间 B 接管，A 随后无条件 UPDATE 仍可能覆盖新结果。必须由真实持有数据的数据库或下游服务在写入时原子比较 owner、version、租约等权威状态，消除检查与写入之间的竞态。

#### 【3.3.6】Fencing 与 Idempotency 为什么需要同时考虑？

**【提问】**

Fencing 与 Idempotency 为什么需要同时考虑？

**关联追问：** 幂等不是 Fencing 的重复实现，合法的新 Worker 也可能重复业务副作用？

**【回答要点】**

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

**【标准回答】**

Fencing 判断当前执行者是否仍有权提交，用于阻止失去处理权的旧 Worker；幂等判断这一笔业务是否已成功产生过效果，用于阻止合法新 Worker 在 ACK Gap 后重复扣款、创建报告等。两者保护的故障窗口不同，不能互相替代。

### 【3.4】ACK 与任务完成确认

#### 【3.4.1】ACK、续租和业务幂等如何协同完成任务可靠执行？

**【提问】**

ACK、续租和业务幂等如何协同完成任务可靠执行？

**关联追问：** ACK 与幂等在两个故障窗口中相互补充，目标是可靠结果而非绝不重复运行？

**【回答要点】**

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

**【标准回答】**

先原子 Claim 获得本次处理权，再用 Lease 和 Renewal 保持资格，必要时通过 Fencing 拒绝旧执行者写入；业务结果可靠持久化之后 ACK。ACK 之前仍可能崩溃并再次执行，所以必须依靠稳定业务键和幂等处理确保重复尝试不产生错误效果。

#### 【3.4.2】ACK 与 Claim、Lease、Renewal 分别处在任务执行的什么阶段？

**【提问】**

ACK 与 Claim、Lease、Renewal 分别处在任务执行的什么阶段？

**关联追问：** ACK 只在业务结果具备持久化保证后才能进行？

**【回答要点】**

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

**【标准回答】**

Claim 解决谁能开始，Lease 与 Renewal 解决处理权何时仍有效，ACK 则是在达到业务完成条件后确认工作已处理。ACK 不是读取消息或获取锁，应发生在业务成功并可恢复的结果持久化以后，否则可能提前将未完成工作标记为完成。

#### 【3.4.3】为什么 ACK 前后崩溃会导致重复处理或业务遗漏？

**【提问】**

为什么 ACK 前后崩溃会导致重复处理或业务遗漏？

**关联追问：** ACK 前后两个崩溃窗口决定必须接受重复处理的可能？

**【回答要点】**

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

**【标准回答】**

在业务结果保存前先 ACK，若随后崩溃，系统可能认定任务完成而丢失结果；先保存结果再 ACK，若确认之前崩溃，任务可能重做。关键业务通常选择结果先成功再确认，并用幂等防重复，不能靠先后顺序消除所有跨系统故障窗口。

#### 【3.4.4】Browser Monitor 的 OutboxWorker 当前具备哪些恢复能力，有什么局限？

**【提问】**

Browser Monitor 的 OutboxWorker 当前具备哪些恢复能力，有什么局限？

**关联追问：** Browser Monitor 的 Outbox Worker 有原子 Claim 与五分钟回收，但没有长任务续租？

**【回答要点】**

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

**【标准回答】**

其数据库 Claim 能原子领取且根据 locked_at 回收长时间处理中的任务，但固定五分钟回收不等同于定期续租。若长任务持续运行或旧 Worker 恢复，存在处理权重叠；还需要结合真实耗时、续租、版本隔离和业务幂等改进。

#### 【3.4.5】如何从原子领取、活跃证明、过期隔离与完成确认四层解释 Worker 可靠性？

**【提问】**

如何从原子领取、活跃证明、过期隔离与完成确认四层解释 Worker 可靠性？

**关联追问：** 面试回答要从领取安全、活跃证明、过期隔离和成功确认展开？

**【回答要点】**

多个 Worker 正常并发领取时，首先通过原子 Claim 避免同时从 PENDING 状态抢到同一条任务。对于长任务，行锁不能一直持有，必须在数据库持久化任务所有权和租约，并由 Worker 周期性续租。

如果旧 Worker 因断连或暂停导致租约过期，而其他 Worker 重新接管，还要利用单调增加的领取版本、条件写入或真正受保护的下游 Fencing，拒绝旧执行者覆盖新任务结果。

任务真正完成时，应该先持久化关键业务结果，再更新完成状态或提交消费进度。不过业务成功之后、ACK 尚未提交时仍可能崩溃，因此恢复后重复处理是必须考虑的故障路径。通过业务幂等键、唯一约束、Checkpoint、结果对账和适当补偿，确保重复执行不造成错误结果。

**【标准回答】**

并发领取要原子 Claim，任务运行要用 Lease/Renewal 维护资格，接管后的旧执行者要由 Fencing 拒绝过期写入；最后确认之前必须先持久化业务结果，并用幂等处理 ACK Gap 的重复执行。四层分别解决不同阶段的问题。

## 第四章：BullMQ 的任务存储、调度与可靠执行

**通用知识衔接：** [服务端异步任务与消息处理体系](<../F-服务端异步任务与消息处理体系.md>)第 4 章中的 BullMQ 专题解释 Redis Job 状态、优先级、延迟、任务锁与完成确认。此处聚焦面试提问、完整回答要点与标准回答；通用文档提供该机制在异步系统中的上位位置。

**本讲核心问题：** 当我们已经理解 Claim、Lease、Renewal、Fencing、Idempotency 和 ACK 后，为什么实际项目还要使用 BullMQ？它如何保存任务和调度状态，多个 Worker 如何选择下一项 Job，优先级与延迟任务怎样排序，以及哪些可靠性已经封装、哪些仍需要业务自己保证？

**先给结论：** BullMQ 是任务队列与 Worker 调度框架。默认 Redis Backend 用任务数据 Hash、不同状态的 List / Sorted Set、Job Lock 及原子 Lua 脚本组合管理队列。它已经封装队列侧 Claim、续锁、停滞回收、重试和完成状态转换；但 Redis 队列状态与 PostgreSQL 业务结果、LLM 调用和外部支付不是同一个全局事务，仍需应用侧保证业务幂等和必要的下游处理权校验。

**版本边界：** 这里分析的是 BullMQ v6 默认 Redis Backend。v6 已增加可选 PostgreSQL Backend，后者用 PostgreSQL 表、事务和 SQL 函数实现相同的上层 API，不能用下文的 Redis List、ZSET、Lua 解释它的内部执行。Redis 仍为默认后端；官方说明 v6 Redis 的队列存取基本沿用 v5。[BullMQ v6 PostgreSQL 发布说明](https://bullmq.io/news/260927/bullmq-v6-postgresql/)。

### 【4.1】BullMQ 的 Producer、Queue 和 Worker 怎样在不同进程之间协作？

**【提问】**

BullMQ 的 Producer、Queue 和 Worker 怎样在不同进程之间协作？

**关联追问：** Producer 提交 Job，Queue 和 Worker 可以运行在不同进程？

**【回答要点】**

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

**【标准回答】**

Producer 把 Job 数据和业务标识写入 Queue，独立 Worker 从共享存储领取并执行业务，完成后更新 Job 状态。HTTP API 不必等待耗时的 LLM 工作；Worker 可扩容或重启，但业务结果与确认可靠性仍取决于幂等和存储配置。

### 【4.2】BullMQ 怎样利用 Redis 的数据结构分别保存 Job 内容和调度状态？

**【提问】**

BullMQ 怎样利用 Redis 的数据结构分别保存 Job 内容和调度状态？

**关联追问：** BullMQ 将 Job 内容与状态索引分开，而不是只改一个 status 字段？

**【回答要点】**

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

**【标准回答】**

BullMQ 默认 Redis 后端把 Job 属性等内容保存在 Hash，把等待、执行、延迟、优先级、完成等调度信息放在 List 或 Sorted Set 等结构中。状态变化不是仅修改一个 status 字段，而是由受控脚本在多个索引和锁之间协调移动。

### 【4.3】BullMQ 的 waiting、prioritized 与 priority 数值如何共同决定下一个 Job？

**【提问】**

BullMQ 的 waiting、prioritized 与 priority 数值如何共同决定下一个 Job？

**关联追问：** wait 与 prioritized 的实际领取顺序：普通任务先于正数优先级任务？

**【回答要点】**

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

**【标准回答】**

默认普通 priority=0 Job 在 wait List 中，优先于正数 priority Job 被领取；在显式正数优先级集合中数字越小优先级越高，同级通常 FIFO。优先级影响下一次领取而不是立即抢占正在执行的任务，不能根据 Job ID 判断顺序。

### 【4.4】BullMQ delayed Job 到期后如何进入可执行队列？

**【提问】**

BullMQ delayed Job 到期后如何进入可执行队列？

**关联追问：** delayed 是尚未到期的调度状态，按执行时间而不是 Job ID 排序？

**【回答要点】**

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

**【标准回答】**

延迟任务在到期之前按可执行时间保存在 delayed Sorted Set，不会提前被 Worker 领取。到期时内部调度把任务提升到普通 wait 或 prioritized；到期只代表符合领取资格，并非精确保证该毫秒开始执行，更不以 Job ID 排序。

### 【4.5】BullMQ 如何通过 Lua 完成 waiting 到 active 的原子领取？

**【提问】**

BullMQ 如何通过 Lua 完成 waiting 到 active 的原子领取？

**关联追问：** BullMQ 的原子领取由内部 Lua 完成，业务侧不需要再写 WATCH？

**【回答要点】**

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

**【标准回答】**

Worker 调用 BullMQ 内部 moveToActive 等脚本，使选择候选、状态索引移动、锁准备成为受保护的服务端状态转换。开发者使用 BullMQ Worker 接口即可，不需要再手写 WATCH 或多步 HGET/HSET，但仍须理解调度顺序和失败边界。

### 【4.6】BullMQ 自动续租与 stalled 恢复解决什么，为什么不能终止过期代码？

**【提问】**

BullMQ 自动续租与 stalled 恢复解决什么，为什么不能终止过期代码？

**关联追问：** BullMQ 自动维护任务锁、续租和停滞恢复，但不会停止已失去锁的旧代码？

**【回答要点】**

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

**【标准回答】**

Worker 为活跃 Job 持有带 TTL 的处理锁并定期续锁，锁丢失后可由 stalled 检测重新排队或按规则失败。但锁失效不能杀死旧进程及已经发出的外部调用，重叠执行仍可能出现，所以副作用需要幂等，严格写入权需隔离。

### 【4.7】BullMQ Processor 返回、抛错和 Job ACK 有怎样的关系？

**【提问】**

BullMQ Processor 返回、抛错和 Job ACK 有怎样的关系？

**关联追问：** Processor 返回、抛错与 ACK 的关系，以及为什么业务幂等仍是必要的？

**【回答要点】**

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

**【标准回答】**

Processor 正常返回后框架尝试更新 Job 为 completed，抛错后依据 attempts/backoff 等重试配置重新调度或最终失败。catch 后吞掉错误并正常 return 可能被误认为成功；完成状态与外部 PostgreSQL 结果不属于天然原子提交。

### 【4.8】BullMQ 上线时还要考虑哪些持久化、交接和一致性风险？

**【提问】**

BullMQ 上线时还要考虑哪些持久化、交接和一致性风险？

**关联追问：** 生产持久化、跨系统交接和真实项目映射构成最后的可靠性边界？

**【回答要点】**

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

**【标准回答】**

默认 Redis 后端需要恰当的持久化、内存淘汰和连接策略，queue.add 成功不能笼统视作绝对零丢失。API 同时写 PostgreSQL 和 Redis 时也可能发生双写间隙，可用 Outbox 等机制衔接；Job ID 去重只在保留窗口内生效，不能代替业务幂等。

## 第五章：ACK Gap、重复消费与消息处理语义

**通用知识衔接：** [服务端异步任务与消息处理体系](<../F-服务端异步任务与消息处理体系.md>)第 5 章解释 At-least-once、ACK Gap、幂等、下游 Fencing 与同库事务。此处聚焦面试提问、完整回答要点与标准回答；通用文档提供该机制在异步系统中的上位位置。

**本讲核心问题：** AI 文档分析 Worker 已将报告保存到 PostgreSQL，却在 BullMQ 确认 completed 前崩溃。报告明明存在，为什么还会触发重新执行？若反过来先 ACK 后保存，会发生什么？怎样理解 At-most-once、At-least-once、业务幂等与 Kafka Offset Commit？

**先给结论：** 报告持久化和任务状态确认分别发生在业务数据库与队列系统中，没有天然的跨系统原子事务。为了尽量避免丢失工作，通常选择先持久化业务结果，再确认任务已完成，接受故障恢复时可能重新执行的事实，并用稳定业务 ID 与幂等约束保证最终结果。Kafka 也有类似故障窗口，但它提交的是某 Consumer Group 在某 Partition 的**下一次消费位置**，不是给一条消息标 completed。

### 【5.1】业务结果与队列完成确认为什么是两个独立事实？

**【提问】**

业务结果与队列完成确认为什么是两个独立事实？

**关联追问：** 业务成功与队列确认成功是两个独立的事实？

**【回答要点】**

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

**【标准回答】**

Worker 可以先成功写入 PostgreSQL 报告，但 BullMQ Job 仍未变为 completed；两个系统不共享同一个事务。任务下一次恢复时无法仅由 Job 状态确认结果已存在，因此可能重复执行，需要以业务事实和幂等键保护结果。

### 【5.2】为什么先 ACK 可能丢任务，后 ACK 可能重复任务？

**【提问】**

为什么先 ACK 可能丢任务，后 ACK 可能重复任务？

**关联追问：** 先 ACK 与后 ACK 分别暴露业务遗漏和重复处理风险？

**【回答要点】**

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

**【标准回答】**

先 ACK 再保存结果，在崩溃窗口可能丢失尚未落库的工作；先保存结果后 ACK，则崩溃可能导致已成功业务被再次处理。系统必须结合业务重要性选择交付语义，关键业务通常接受至少一次处理并采取幂等保护。

### 【5.3】如何使用 PostgreSQL 的 operation_id 和唯一约束实现幂等？

**【提问】**

如何使用 PostgreSQL 的 operation_id 和唯一约束实现幂等？

**关联追问：** 用 PostgreSQL 唯一约束保证重复执行不会保存两份报告？

**【回答要点】**

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

**【标准回答】**

为相同业务操作定义稳定 operation_id，结果表把它设为 PRIMARY KEY 或 UNIQUE；重复处理时 INSERT ON CONFLICT DO NOTHING 或条件更新，避免保存两份报告。但这不保证 LLM 调用没有发生两次，幂等范围要按外部副作用分别定义。

### 【5.4】Fencing 和幂等为什么分别处理旧执行者与重复业务效果？

**【提问】**

Fencing 和幂等为什么分别处理旧执行者与重复业务效果？

**关联追问：** Fencing 与幂等分别约束执行者资格和重复业务效果？

**【回答要点】**

同一任务可能由于锁过期而出现 A、B 两个重叠执行者。Fencing 能够在实际写入端校验 owner、lease_version 和租约有效性，使失去权限的旧 Worker 不得覆盖合法当前结果。但它不会告诉新 Worker：“你的版本虽然合法，但这笔业务已经成功执行过。”例如 A 在合法持锁期间成功扣款，却在 ACK 前崩溃；B 使用新版本合法领取，若重复向支付平台扣款，Fencing 不会自动阻止第二次合法发起的支付业务。

因此：**Fencing 判断谁还能写；幂等判断这一笔业务是否已经产生过效果。** 两者不同，不可替代。[BullMQ Idempotent Jobs](https://docs.bullmq.io/patterns/idempotent-jobs)。

**【标准回答】**

Fencing 保护写入资格，阻止旧 Worker 在新世代接管后写入；幂等保护业务操作身份，阻止合法新 Worker 因确认丢失而再次产生效果。即使两个 Worker 都曾合法运行，同一操作也应使用稳定幂等键。

### 【5.5】Kafka 的 Offset Commit 为什么也存在 ACK Gap，却不是逐 Job ACK？

**【提问】**

Kafka 的 Offset Commit 为什么也存在 ACK Gap，却不是逐 Job ACK？

**关联追问：** Kafka Offset Commit 同样有确认间隙，但不是逐 Job ACK？

**【回答要点】**

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

**【标准回答】**

Kafka Consumer Group 为每个 Topic-Partition 保存下一条恢复的 Offset，而不是在原 Record 上写 completed。业务写库成功但 Offset 未提交时会重读；先提交 Offset 再写库则可能跳过未完成的业务。风险相同，确认粒度和内部模型不同。

### 【5.6】PostgreSQL 任务状态与业务结果位于同库时能否用本地事务缩小 ACK 间隙？

**【提问】**

PostgreSQL 任务状态与业务结果位于同库时能否用本地事务缩小 ACK 间隙？

**关联追问：** 结果与确认都位于同一个 PostgreSQL 时，可以缩小本地事务间隙？

**【回答要点】**

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

**【标准回答】**

若 Job 状态及业务结果均在同一 PostgreSQL，可在一个事务内检查当前 owner/版本、写入业务结果并标记 completed，使这两种本地状态一起提交或回滚。但 LLM、支付平台等外部副作用仍不在该数据库事务内。

### 【5.7】如何面试解释 At-most-once、At-least-once 与 Exactly-once 业务效果？

**【提问】**

如何面试解释 At-most-once、At-least-once 与 Exactly-once 业务效果？

**关联追问：** 面试回答要先讲故障窗口，再解释处理语义和业务保护？

**【回答要点】**

> 多 Worker 正常领取时可以通过原子 Claim 保证一个 waiting Job 只有一个成功领取者，但业务结果持久化与队列确认通常不属于同一个事务。比如报告已经成功写入 PostgreSQL，Worker 在 BullMQ 标记 completed 前崩溃，Job 可能被重新调度，导致业务重复执行。
>
> 如果为了避免重复而提前 ACK，又可能出现 ACK 后崩溃、结果没有保存的任务遗漏。因此关键业务通常倾向先可靠保存结果，再确认消费进度，即允许至少一次处理，并通过稳定业务 ID、唯一约束或下游幂等键确保重复执行不产生额外业务效果。
>
> Kafka 的 Offset Commit 也是确认消费进度，但它记录的是某 Consumer Group 在特定 Partition 下一条要处理的位置，并不把某条原始消息标记为 completed 或删除。读写外部数据库时仍然存在处理结果提交与位点提交之间的失败窗口。

**【标准回答】**

先用先确认/后确认两个崩溃窗口说明遗漏与重复：At-most-once 允许遗漏而偏向不重复，At-least-once 允许重放以减少遗漏；Exactly-once 需限定边界，不能因队列提供确认接口就宣称跨 Kafka、数据库和第三方服务无重复效果。

## 第六章：Kafka 的分区日志、Consumer Group 与故障恢复

**通用知识衔接：** [服务端异步任务与消息处理体系](<../F-服务端异步任务与消息处理体系.md>)第 4 章中的 Kafka 专题解释 Topic、Partition、Offset、Heartbeat、Rebalance 与失效 Consumer 写入边界。此处聚焦面试提问、完整回答要点与标准回答；通用文档提供该机制在异步系统中的上位位置。

**本讲核心问题：** 前一讲 BullMQ 把 waiting Job 移到 active，完成后确认 completed。Kafka 为什么使用 Topic、Partition 和 Offset 保存事件，Consumer Group 又如何让多个实例并行处理、故障后恢复？

**先给结论：** Kafka 把消息追加保存到 Topic 下的 Partition 日志中，消费后并不会因为某个 Consumer 完成处理而立即移除原记录。Consumer Group 代表一个逻辑订阅者：同组 Consumer 分摊 Partition，并按 Group + Topic + Partition 保存已确认消费位置；成员失联会触发 Partition 重新分配，新 Consumer 从该组已提交的 Offset 恢复。它解决的是**消息顺序、并行消费和消费进度恢复**，不是天然保证 PostgreSQL、支付、LLM 的外部效果绝对只产生一次。

### 【6.1】Kafka 分区日志与消费位置

#### 【6.1.1】Kafka 为什么使用 Topic 下可保留的 Partition 日志，而不是逐 Job 状态队列？

**【提问】**

Kafka 为什么使用 Topic 下可保留的 Partition 日志，而不是逐 Job 状态队列？

**关联追问：** Topic、Partition、Offset 共同构成可保留的有序消息日志？

**【回答要点】**

Topic（主题）表示一类业务事件流。Partition（分区）是 Topic 下独立追加和读取的一条有序日志。Offset（偏移量）表示记录在**某个 Partition 内部**的位置，而不是整个 Topic 的全局编号：

~~~text
Producer（发布 AI 文档分析事件）
        ↓
Topic：analysis-events
        ├── Partition 0： Offset 0: doc-A → 1: doc-C → 2: doc-F
        ├── Partition 1： Offset 0: doc-B → 1: doc-E → 2: doc-H
        └── Partition 2： Offset 0: doc-D → 1: doc-G → 2: doc-I
                     ↓
        每个分区独立按 Offset 顺序追加与读取
~~~

Partition 0 / Offset 2 与 Partition 1 / Offset 2 是不同的记录。Kafka 对单个 Partition 的日志顺序提供保证，却没有一个天然的整个 Topic 全局消息顺序。Producer 可用 documentId 作为 Message Key，让同一文档的事件在稳定的分区映射条件下进入同一 Partition，从而实现分区内的事件顺序。若未来增加 Partition 数量、调整分区器，Key 到 Partition 的映射可能改变，不能将其误写成永久不变的绝对保证。

Kafka 的日志记录不因为某个 Group 消费过就立即从原 Topic 删除。消息保留取决于 Topic 的 Retention、清理等策略。这使同一份事件能够供多个独立组消费，并允许在仍被保留的范围内重放。[Apache Kafka Introduction](https://kafka.apache.org/43/getting-started/introduction/)。

**【标准回答】**

Kafka 首先将事件追加到 Topic 的 Partition，使用分区内 Offset 定位记录，消息不因某个 Consumer 已处理就立即从日志删除。这样多组可以独立读取和重放，代价是它按分区和进度管理消费，而非给每个 Job 维护 waiting/active/completed。

#### 【6.1.2】Consumer Group 怎样实现组内分区分工和组间独立订阅？

**【提问】**

Consumer Group 怎样实现组内分区分工和组间独立订阅？

**关联追问：** Consumer Group 同时解决组内负载分担与组间独立订阅？

**【回答要点】**

Consumer（消费者）是实际读取与处理消息的进程或实例。Consumer Group（消费者组）通过 group.id 标识一组共同承担一个逻辑订阅任务的 Consumer。在常规 Consumer Group 的稳定分配中，一个 Partition 对同组中的某个 Consumer 独占分配，而一个 Consumer 可以负责多个 Partition。

例如 Topic 有三个 Partition，Group A 有两个 Consumer：

~~~text
Topic analysis-events
  Partition 0 ──────────► Group A / Consumer A1
  Partition 1 ──────────► Group A / Consumer A1
  Partition 2 ──────────► Group A / Consumer A2
~~~

这只是**一种可能的分配结果**，具体由 Group 的分配策略决定。同一 Topic 如果有 3 个 Partition、5 个同组 Consumer，则最多 3 个 Consumer 可以从这 3 个 Partition 获得分区分配，另外 2 个不会凭空把某 Partition 再拆给自己处理。分区数量因此影响该 Topic 在常规消费组中的最大独立消费实例并行度。

如果再新增 Group B（比如审计服务），它也能消费同一 Topic 的所有 Partition：

~~~text
                      Topic：analysis-events
                       Partition 0 / 1 / 2
                          │         │
                          ▼         ▼
                 Group A：报告分析   Group B：审计
                 A1、A2 分摊分区     B1 独立订阅
                 独立提交 Offset     独立提交 Offset
~~~

A 在 Partition 1 已提交 Offset 100，不意味着 B 的进度也变成 100。组间可以各自读取相同原始消息。**Kafka 的逻辑不是“一个消息被一个 Worker 删除”，而是“一个 Topic 允许不同逻辑订阅者维护独立进度”。**

版本说明：这里讲的是常规 Kafka Consumer Group。Kafka 4.2 提供另一种 Share Group 消费模式，支持按记录共享与确认，其机制不遵守传统的“每个 Partition 同组只分配给一个 Consumer”的上位规则；本节暂不延伸。[Kafka 4.2 Upgrading](https://kafka.apache.org/42/getting-started/upgrade/)。

**【标准回答】**

同一常规 Group 在稳定分配时把 Topic-Partition 分给一个成员负责，一个 Consumer 可以管理多个分区；不同 Group 各自维护 Offset，因而同一事件可被报告分析与审计等多套业务分别消费。有效分区消费并行度受 Partition 数量约束。

#### 【6.1.3】Record Offset、Consumer Position 与 Committed Offset 有何区别？

**【提问】**

Record Offset、Consumer Position 与 Committed Offset 有何区别？

**关联追问：** Offset 区分日志位置、读取位置和确认后的恢复位置？

**【回答要点】**

同一 Group + Topic + Partition 下，要区分：

- Record Offset：某条原始消息在 Partition 日志中的位置。
- Consumer Position：Consumer 下一次打算 Fetch 的位置。消息已经被 Fetch 或读入内存，**不证明业务处理完成**。
- Committed Offset：Consumer Group 持久记录的恢复位置，通常表示**下一条需要消费的 Offset**，不等于某条消息的已完成标记。

举例：

~~~text
Partition 1：
   Offset 100     Offset 101     Offset 102     Offset 103
      已完成         已完成          处理中          等待

Group A 的 committed offset = 102
                             ↑
                      崩溃后从 102 继续
~~~

只有 Offset 102 的业务成功保存，且此前必须完成的记录都已经处理，才能把该 Partition 的 Committed Offset 推进到 103。如果 Consumer 已经 Fetch 到 103，却尚未成功处理 102，不能仅凭“已读取”就提交 104；否则重启后 102 可能被跳过。

Kafka 并非给每条消息写 completed 字段，而是由 Group Coordinator（组协调者）管理成员与位点，Kafka Broker 使用内部 Topic __consumer_offsets 存储已提交位点等组协调信息。该 Topic 不等于业务原始 Topic。[Apache Kafka Distribution](https://kafka.apache.org/43/implementation/distribution/)。

**【标准回答】**

Record Offset 是某条记录在特定分区的位置；Consumer Position 是读取端预计下次读取的位置；Committed Offset 是某消费者组已持久保存的恢复位置，通常表示下一条需要消费的 Offset。Fetch 过消息不等于数据库处理成功，也不等于进度已提交。

### 【6.2】Consumer Group 的故障检测和接管

#### 【6.2.1】Consumer 失联以后如何通过 Rebalance 和 Committed Offset 恢复？

**【提问】**

Consumer 失联以后如何通过 Rebalance 和 Committed Offset 恢复？

**关联追问：** 失联后通过 Rebalance 重新分配 Partition，再用 Committed Offset 恢复？

**【回答要点】**

Rebalance（重新分配/重新平衡）是组成员变动时调整 Partition 归属的过程。Consumer 加入、正常退出、崩溃失联或订阅关系变化，都可能触发这一过程。

~~~text
10:00  Group A 稳定：
       Consumer A1 负责 Partition 0、1
       Consumer A2 负责 Partition 2

10:01  A1 处理 Partition 1 / Offset 102
       报告已经写入 PostgreSQL
       但 Group A 对 Partition 1 的 committed offset 仍是 102

10:02  A1 崩溃，无法维持成员身份

之后   Group Coordinator 检测失联
       发生 Rebalance（分区归属重新分配）
       A2 接管 Partition 1

恢复   A2 读取 Group A 已提交的位置 102
       因此 Offset 102 可能重复被处理
~~~

上述时间仅为演示事件次序，并非 Kafka 固定秒数。检测与恢复需要心跳、会话超时及协议协调，具体耗时不固定。Kafka 4.0 起提供新的 Consumer Rebalance Protocol（KIP-848），支持更增量的协调；旧的 Classic 协议仍可使用，不能统一声称每次重平衡都“全组停下来再分配”。[Kafka Consumer Rebalance Protocol](https://kafka.apache.org/43/operations/consumer-rebalance-protocol/)。

从此可知：**Partition Assignment 解决当前谁有权读取这条分区日志；Offset Commit 解决新负责人从哪里恢复；数据库幂等解决重复消费时外部业务效果不重复。** 它们与上一讲 BullMQ 的 Claim、Lease、ACK 对应的是相似的可靠性问题，但内部模型不同。

**【标准回答】**

Coordinator 判定成员失联或组变动后重新分配 Partition，接管者从该 Group、该分区的已提交 Offset 继续。若旧 Consumer 已写入业务但尚未提交进度，接管者会重读相同消息；Rebalance 迁移的是分区归属而不是内存中的业务现场。

#### 【6.2.2】Consumer 短暂断网、长时间失联和进程崩溃恢复行为为什么不同？

**【提问】**

Consumer 短暂断网、长时间失联和进程崩溃恢复行为为什么不同？

**关联追问：** Consumer 恢复后旧业务函数能否继续执行，要区分三种状态？

**【回答要点】**

**问题：** Consumer A 处理 Partition 0 / Offset 100 时中断，Kafka 已把分区交给 B。之后 A 网络恢复，它原先的异步函数会不会继续执行、是否仍有效、能不能处理后续 Offset 101/102？

**先给结论：** 必须把三个状态拆开判断：① Consumer 的进程/线程是否仍在运行；② 它现在是否还拥有这个 Partition 的有效分配；③ 下游数据库是否仍允许它的业务写入。**Kafka 撤销的是组内分区归属，并不会自动取消此前已经启动的 LLM/HTTP/数据库请求。** 一个旧 Consumer 可能不再合法提交该分区的消费进度，却仍有能力向外部系统写数据。

| 中断场景 | 进程与已经启动的业务函数 | Partition 归属与后续消费 |
| --- | --- | --- |
| 短暂断网，组尚未判定会话失效、也未调整分配 | 本地异步函数可能继续运行；Kafka 通信恢复后可正常推进 | 如果仍持有原分区，按正常消费流程继续 |
| 长时间失联，被移出 Group 并由 B 接管原分区 | 如果进程仍存活，先前启动的计算与外部请求可能继续 | A 的**旧成员资格/旧分配失效**，不能依赖它继续 Fetch 或提交原分区的 Offset；恢复后要重新加入组并接受新分配，甚至可能再次分到相同分区 |
| 进程真正崩溃并退出 | 原进程内未完成的 JavaScript/Java 函数不会“复活” | 新进程需重新加入 Group；按当前有效分配和已提交 Offset 恢复，原先外部请求是否已生效则要单独确认 |

这里“失去分区后不能继续消费”是消费协议的权限结论，而不是系统已经回滚、杀死旧业务代码。Consumer 客户端通常会按最新分区分配调整后续 Fetch；如果应用在丢失分区前**自行派生了异步队列、线程或 Promise**，这些后台逻辑可能不受 Kafka 客户端直接控制。Kafka 不会为它们自动实现跨系统取消。

**【标准回答】**

短暂断联若没有改变分区归属，旧 Consumer 仍可能继续；失联超时被撤销分区后，原执行者可能继续已经启动的业务代码，但旧成员资格不再有效；进程真正崩溃时原函数无法复活，只能由重新加入的消费者读取日志恢复。

#### 【6.2.3】Kafka 心跳与 BullMQ Lease/Renewal 为什么相似却不相同？

**【提问】**

Kafka 心跳与 BullMQ Lease/Renewal 为什么相似却不相同？

**关联追问：** 心跳维持的是 Consumer Group 成员资格，不是逐消息执行租约？

**【回答要点】**

把 BullMQ 的机制与 Kafka 按对应职责比较：

| BullMQ（Job 粒度） | Kafka 常规 Consumer Group（Partition 粒度） | 边界 |
| --- | --- | --- |
| Worker 领取 Job 的 Claim | Consumer Group 的 Partition Assignment | 后者分配的是分区，不是给每一条 Record 单独 Claim |
| Lease / Lock + Renewal | Group Membership、Heartbeat 与 Session Timeout | 心跳维持组成员存活；不等同于逐 Job 的锁 TTL |
| Lock 失效、stalled 恢复 | Consumer 失联、分区 Rebalance、按 Committed Offset 重读 | Kafka 不将某条消息移回 waiting 队列 |
| BullMQ 完成 Job 后更新 completed | Kafka Consumer 提交 Partition 的下一条 Offset | Offset 不等于单条消息 completed |
| 旧 Worker 的 Lock Token 失效 | Kafka 组成员世代 / 成员 Epoch 等协议校验失效提交 | 两者都**不自动保护外部 PostgreSQL / LLM 副作用** |

典型 Consumer 生命周期如下：

~~~text
A 加入 Group → 获得 Partition 0
                  ↓
             定期 Heartbeat（证明成员仍活跃）
                  ↓
             能否继续维持分配？
                ├─ 是：允许继续当前分区的消费流程
                └─ 否：超时被判失联，Group 重新分配分区
                                 ↓
                            B 可能接管
                                 ↓
                  从该 Group 已提交 Offset 恢复
~~~

经典 Consumer Group 使用 session.timeout.ms 等维持成员存活；Kafka 4.0 起的 Consumer 协议还涉及 Broker 控制的 group.consumer.session.timeout.ms 等设置，具体由客户端/协议决定。**消费进度与存活是两回事**：Apache Kafka Java Consumer 另有 max.poll.interval.ms，用来限制两次 poll() 之间的最长间隔，防止只是不断心跳却长期不推进处理。它属于 Java 客户端的消费循环约束，**不能直接套用给 KafkaJS**；KafkaJS 提供 sessionTimeout、heartbeatInterval，并允许长时间 eachMessage / eachBatch 处理时显式 heartbeat()。[Kafka Consumer Configs](https://kafka.apache.org/42/configuration/consumer-configs/)、[KafkaJS Consuming](https://kafka.js.org/docs/2.1.0/consuming)。

**【标准回答】**

两者都使用存活证明与超时识别失联，但 BullMQ 的锁与续租针对单个 Job，Kafka Heartbeat 维护的是 Consumer Group 成员资格和 Partition 分配。心跳存活不代表 LLM 业务正推进，客户端还可能需要 poll 间隔或长处理期间的心跳管理。

#### 【6.2.4】A 失联而 B 已接管，为什么 A 恢复后还能执行旧业务？

**【提问】**

A 失联而 B 已接管，为什么 A 恢复后还能执行旧业务？

**关联追问：** 长时间失联的 A 恢复后，可能和接管分区的 B 同时进行旧业务？

**【回答要点】**

~~~text
Consumer A（旧负责人）             Kafka Group              Consumer B（新负责人）
        │                               │                            │
        ├─ 读取 Partition 0 / 100       │                            │
        ├─ 开始调用 LLM                 │                            │
        ├─ 网络中断，心跳失败            │                            │
        │                               ├─ 会话超时、Rebalance        │
        │                               └─ Partition 0 交给 B ──────►│
        │                               │                            ├─ 读取 Offset 100
        │                               │                            ├─ 重新调用 LLM
        ├─ 网络恢复                     │                            │
        ├─ 原 LLM 请求返回               │                            │
        ├─ 旧异步函数继续尝试写 PostgreSQL                          │
        │                               │                            ├─ 也尝试写 PostgreSQL
        ▼                               ▼                            ▼
    两次业务调用可能重叠；提交 Offset 的合法性与数据库写入资格必须分开判断
~~~

前提是：A 的进程或业务线程在网络中断期间**没有被彻底杀死**，并且此前的外部请求仍可能完成。若进程已经崩溃，它自己的函数不会恢复，只有新进程重新消费。

A 的原成员世代已经失效后，对其原分区提交 Offset 可能失败。Java KafkaConsumer 的 CommitFailedException 官方文档就说明：重平衡完成且分区已经移交其他成员后，原消费者的 commitSync 可能无法成功提交，且不能靠无条件重试旧提交解决。[Kafka 4.2 CommitFailedException](https://kafka.apache.org/42/javadoc/org/apache/kafka/clients/consumer/CommitFailedException.html)。

但是 A 的旧代码可能仍然执行到：

~~~sql
-- 仅演示风险：数据库不会自动知道 Kafka 已撤销 A 的分区
INSERT INTO analysis_reports (operation_id, content)
VALUES ('analysis:doc-1001:v1', 'old-result');
~~~

**Kafka 拒绝旧 Consumer 的组协议操作，不代表这条 SQL 一定被拒绝。** 如果数据库直接接受写入，就可能与 B 的写入冲突。

另一个容易混淆的细节：如果 A 恢复后**重新加入** Consumer Group，并再次被合法分配 Partition 0，那么它可以以**新的**成员资格继续消费；不能说“失联一次就永久无权处理这个分区”。旧成员资格失效与新成员资格有效是两个不同的世代。

**【标准回答】**

Kafka 可以撤销 A 的分区分配，却不能自动中断 A 曾启动的 LLM/HTTP/SQL 副作用。A 恢复后可能与 B 同时写数据库，即使旧成员提交 Offset 失败。正确性要由消费者合作式停机和下游幂等、必要时 Fencing 共同保护。

#### 【6.2.5】失去分区归属的 Consumer 还能继续处理已 Fetch 的 Offset 101/102 吗？

**【提问】**

失去分区归属的 Consumer 还能继续处理已 Fetch 的 Offset 101/102 吗？

**关联追问：** Offset 101/102 是否继续处理取决于是否已经启动业务代码？

**【回答要点】**

~~~text
A 已经收到一批 Record：100、101、102
         ↓
应用方式一：顺序 await
  await process(100)
  await process(101)
  await process(102)

应用方式二：不等待，直接派生任务
  process(100)
  process(101)
  process(102)
  ↓
  这三个业务函数可能同时进行
~~~

- 顺序 await 且尚未开始 101/102：如果消费代码能及时感知分区已撤销、跳出当前循环，就能避免**继续启动**后续旧分区任务。具体取消/撤销回调依赖 Consumer 客户端实现，不能仅凭示意代码推断绝对停止。
- 如果 100、101、102 的业务函数已经由 Promise.all、线程池或应用自建队列发出，Kafka 的分区归属变更通常不会自动取消它们；它们可能仍继续写业务数据。
- 即使代码主动 AbortController 取消 HTTP 请求，取消只是尽力而为；外部服务可能已经处理请求。不能用“取消成功”代替业务幂等或对账。

例如 KafkaJS 的 eachBatch 提供 isRunning() 和 isStale()，可在每条处理之间检测是否应该退出当前批次，但**isStale() 的语义主要是判断批次是否因 seek 等原因失效，不是一个可靠的下游 Fencing Token**：

~~~javascript
await consumer.run({
  eachBatchAutoResolve: false,
  eachBatch: async ({ batch, resolveOffset, heartbeat, isRunning, isStale }) => {
    for (const message of batch.messages) {
      if (!isRunning() || isStale()) break;

      // 这里应 await 真正完成业务处理；不可 fire-and-forget
      await saveIdempotently(message);

      // 已确认业务效果成功后，才认为该 Offset 可完成
      resolveOffset(message.offset);
      await heartbeat();
    }
  },
});
~~~

该代码只展示顺序处理、合作式退出和 Offset 进度处理，不声明通过本地检查就阻止了所有旧执行者，更不代表 Redis/Kafka 与 PostgreSQL 形成一个事务。[KafkaJS Consuming](https://kafka.js.org/docs/2.1.0/consuming)。

**【标准回答】**

如果旧消息还在它派生的 Promise、线程池或应用内队列里，异步函数可能继续运行；正常 Kafka 客户端则应依新分配停止旧分区 Fetch。恢复后重新加入也可能合法地重新拿到同一分区，但新成员资格与此前已失效的执行世代不能混淆。

#### 【6.2.6】Kafka 为什么还需要业务幂等与下游 Fencing？

**【提问】**

Kafka 为什么还需要业务幂等与下游 Fencing？

**关联追问：** 恢复正确性需要业务幂等，严格所有权要求还需要下游 Fencing？

**【回答要点】**

消费组协议保护当前 Partition 的读取和 Offset 提交，但要防止两个重叠 Consumer 破坏业务结果，还需应用考虑：

1. **重复业务效果：** 为同一事件定义稳定的 operation_id（例如 eventId 或业务任务 ID），数据库通过唯一约束或下游幂等键确保重复处理不重复扣款/创建/通知。不能只用 Consumer ID 或递增 Offset 当作所有业务类型的幂等键；Offset 只有在 Topic + Partition 的范围内才唯一，使用 Offset 作为去重依据时要包含 Topic、Partition、Offset。
2. **失效执行者写入：** 对需要“只有现任处理者可以提交”的场景，在真正的数据库事务/条件 UPDATE 中校验权威所有权或执行版本；不能只在 SQL 执行前去查询一次 Kafka 当前分配，避免 Check-Then-Act 竞态。Kafka Group Generation / Member Epoch 不会自动成为外部数据库识别并拒绝旧结果的令牌。
3. **后续处理顺序：** 同一个 Partition 的消息按 Offset 有序读取，但如果应用自行并发执行这些消息的业务逻辑，就可能乱序提交。必要时顺序处理、按业务版本条件更新，且只推进已经连续可靠完成的 Offset。
4. **运行治理：** 结合优雅关闭、分区撤销回调/客户端状态、长任务心跳、Lag 监控、可取消任务和外部调用对账，减少失效任务长期存在和新旧执行重叠的概率。

**还应分清 Consumer 故障和业务消息失败：** 失联后 Kafka 可重新分配 Partition；但 Consumer 一直活着、某条消息只是在执行 LLM 时抛错，Kafka 常规 Consumer Group **不会像 BullMQ 一样自动把这条消息移给另一个消费者作为逐 Job Retry**。需要应用自己控制重试、暂停消费、DLQ / 重试 Topic、Offset 是否推进等。

**面试收束：**

> Kafka 心跳维护 Consumer Group 的成员资格，Session Timeout 负责判定成员失联，Rebalance 把 Partition 重新交给合法 Consumer，并根据 Committed Offset 恢复读取。这与 BullMQ 的 Job Lease、Renewal、Stalled Recovery 类似，但 Kafka 的处理权粒度是 Partition 而非单条 Job。Consumer A 失联后若仍存活，已启动的异步业务代码可能继续执行；它的旧 Partition 分配与 Offset 提交资格已经失效，却仍可能写入外部 PostgreSQL。应通过消费者侧停止旧分区的后续处理，以及业务幂等、必要的下游 Fencing 和连续 Offset 提交保证正确性。

**【标准回答】**

消费者组协议保护分区归属和 Offset 提交，不会让 PostgreSQL 自动拒绝失效 A 的 SQL。稳定 eventId/operationId 防止重复效果；严格所有权场景要在下游原子校验当前业务版本或执行世代，不能只在写入前检查一次 Kafka 状态。

### 【6.3】Kafka 的顺序、客户端与任务队列模型

#### 【6.3.1】为什么 Partition 日志有序不能确保开发者自行并发的业务完成顺序？

**【提问】**

为什么 Partition 日志有序不能确保开发者自行并发的业务完成顺序？

**关联追问：** Kafka 的分区顺序只保证日志消费顺序，不自动保证并行业务效果顺序？

**【回答要点】**

在前例中，Partition 0 依次追加 doc-1001 的分析开始、分析完成、报告更新三个事件。Kafka 可以让同一个 Consumer 按 Offset 顺序读取同一 Partition，但如果 Processor 在应用内部另外启动多个并行的异步函数，**先取出的记录仍可能较晚完成业务写入**。

~~~text
Partition 0：
Offset 10：文档创建
Offset 11：文档分析完成
Offset 12：报告更新
          ↓
消费读取顺序：10 → 11 → 12
          ↓
若业务代码自行并发处理：
Offset 12 可能先保存，Offset 11 反而后保存
~~~

因此按业务实体 Key 分区，是实现顺序处理的前提之一；消费端还需让需要先后依赖的步骤按约定顺序处理，或设计适合乱序消息的版本控制和幂等逻辑。分区数增加可以提升不同分区的独立消费空间，但单个热 Key 的消息仍会集中到某个 Partition，不能认为分区越多同一实体的处理就越快。

**【标准回答】**

Kafka 保存并按分区 Offset 提供有序记录，但应用如果发起未 await 的异步函数，后面的报告发送可能先于创建完成。保持同一 Key 的分区稳定只是顺序基础，真正有依赖的副作用仍需要顺序 await 或业务版本校验。

#### 【6.3.2】KafkaJS groupId、subscribe 和 eachMessage 的最小消费流程是什么？

**【提问】**

KafkaJS groupId、subscribe 和 eachMessage 的最小消费流程是什么？

**关联追问：** 最小 KafkaJS Consumer 例子说明 group.id、订阅与消息位置？

**【回答要点】**

使用 Node.js 的 KafkaJS 客户端，假设 Kafka Broker 已在 localhost:9092 运行，名为 analysis-events 的 Topic 已创建：

~~~bash
npm install kafkajs
~~~

~~~javascript
import { Kafka } from "kafkajs";

const kafka = new Kafka({
  clientId: "analysis-service",
  brokers: ["localhost:9092"],
});

const consumer = kafka.consumer({ groupId: "analysis-workers" });
await consumer.connect();
await consumer.subscribe({
  topics: ["analysis-events"],
  fromBeginning: true,
});

await consumer.run({
  eachMessage: async ({ topic, partition, message }) => {
    const event = JSON.parse(message.value.toString());

    console.log({
      topic,
      partition,
      offset: message.offset,
      key: message.key?.toString(),
    });

    // 应先可靠持久化业务结果，再让回调正常返回
    await saveIdempotently(event);
  },
});
~~~

从两个终端启动相同文件（两者使用相同 groupId=analysis-workers），它们加入**同一个逻辑消费者组**，由 Kafka 分配所订阅 Topic 的 Partition。将第二个实例改为 groupId=audit-workers，则它变成**另一个独立订阅者**，不会与 analysis-workers 分摊同一 Group 的进度。

这只是阅读模型的入门示例：KafkaJS 的 eachMessage 在默认 autoCommit=true 下由客户端根据批次/提交条件负责提交已完成的消费进度；它**不保证业务操作跨 Kafka 与 PostgreSQL 原子提交**。必须确保 saveIdempotently 成功才正常返回；若抛错，仍需要业务侧保证重试幂等、错误处理与运维恢复。长时间处理消息还涉及心跳和会话存活问题，下一讲会详细解释 eachMessage、eachBatch、自动提交与手动提交的区别。参见 [KafkaJS Consuming](https://github.com/tulios/kafkajs/blob/master/docs/Consuming.md)。

**【标准回答】**

Consumer 指定 groupId 加入逻辑订阅者，subscribe 订阅 Topic，run 的 eachMessage 逐条收到所属分区记录；同一 Group 多实例分摊分区，改 groupId 则成为独立订阅。业务应 await 可靠保存，autoCommit 不能自动让 Kafka 与 PostgreSQL 原子化。

#### 【6.3.3】Kafka 与 BullMQ 在存储、执行分工与确认方面最根本的差异是什么？

**【提问】**

Kafka 与 BullMQ 在存储、执行分工与确认方面最根本的差异是什么？

**关联追问：** Kafka 与 BullMQ 的差异是消费单位和确认模型，而不是简单更换存储？

**【回答要点】**

| 比较点 | BullMQ 默认 Redis Backend | Kafka 常规 Consumer Group |
| --- | --- | --- |
| 数据存储 | Job 内容与 wait/active/completed 等状态结构 | 可保留的 Partition 有序追加日志 |
| 领取/分工单位 | 单个待执行 Job | 以 Partition 为主要组内分配单位 |
| 处理状态 | Job 处于等待、执行、完成等状态 | Group 消费位置与消息原始记录分离 |
| 故障恢复 | Job Lock、stalled、重新领取与重试 | 成员失联检测、Rebalance、按 committed offset 重读 |
| 进度确认 | Job completed 等内部状态转换 | 按 Group + Topic + Partition 提交 Offset |
| 同一消息给不同业务使用 | 通常自行多播/使用独立队列 | 不同 Group 可以各自读取相同 Topic |
| 任务执行顺序 | 取决于队列 FIFO、优先级、并行 Processor | 同 Partition 的日志有序；业务完成是否有序还取决于处理方式 |

要避免两个混淆：第一，**Offset=102 已读取不意味着成功处理**，Committed Offset=103 才表达这个 Group 计划从 103 恢复，但提前提交仍可能造成遗漏；第二，Consumer Group 的 Partition 分配是 Broker/Group 的协调职责，不是像 BullMQ 一样对每条原始消息分别设置 Job Lock。两者都可能发生“业务结果成功但确认进度失败”而导致重复执行，所以仍需业务幂等。

**【标准回答】**

BullMQ 管理逐 Job 的调度状态、锁、完成和失败，Kafka 管理可保留的分区日志、Group 分工和各分区恢复位置。两者都可能发生业务成功但确认失败的重做，但 Kafka 不是逐消息 Job Lock/ACK 模型，场景侧重可重放事件流和多组独立消费。

#### 【6.3.4】怎样总结 Kafka Topic、Partition、Offset 和 Consumer Group 的协作关系？

**【提问】**

怎样总结 Kafka Topic、Partition、Offset 和 Consumer Group 的协作关系？

**关联追问：** 面试回答从数据存储、分区分工与故障恢复三层展开？

**【回答要点】**

> Kafka 把事件存储为 Topic 下的 Partition 追加日志，每条 Record 用分区内 Offset 标识；读取消息不会自动删除原记录。一个 Consumer Group 代表一个逻辑订阅者，组内 Consumer 分摊 Partition，同一个 Partition 正常情况下只由该组一个 Consumer 负责，因此可以获得分区内有序读取并实现多个分区的并行消费。
>
> Consumer Group 为每个 Topic-Partition 独立提交消费进度。Consumer 崩溃后，Kafka 通过成员检测和 Rebalance 将 Partition 重新分配给其他实例，新 Consumer 从该组已提交的 Offset 开始恢复。如果业务已经保存但 Offset 尚未提交，就可能再次处理相同 Record，需要业务幂等保证最终正确性。
>
> BullMQ 更直接地管理逐 Job 领取、执行锁和 completed；Kafka 则管理持久化事件日志、分区归属和消费进度，适合事件流、多组订阅与可重放处理，两者不能只按“都是队列”理解为相同内部模型。

**【标准回答】**

Topic 是事件类别，Partition 是可独立追加读取的日志与消费分工单位，Offset 定位该分区记录，Consumer Group 则把分区分配给成员并维护各分区消费进度。故障时经失联检测和 Rebalance 接管，从 Committed Offset 恢复，并依赖业务幂等防重复效果。

## 第七章：KafkaJS 的消息发送、消费执行与 Offset 提交

**通用知识衔接：** [服务端异步任务与消息处理体系](<../F-服务端异步任务与消息处理体系.md>)第 4、5 章中的 KafkaJS 专题解释自动／手动提交、eachBatch、分区并发与连续完成位点。此处聚焦面试提问、完整回答要点与标准回答；通用文档提供该机制在异步系统中的上位位置。

**本讲核心问题：** 向 Kafka 发送事件时是否必须明确指定 Partition？Producer、Broker、Consumer 谁负责什么？KafkaJS 的 eachMessage、eachBatch、autoCommit、manual commit 如何保证完成业务处理以后推进 Offset，同时避免提前确认和故障重复执行？

**先给结论：** Topic 必然包含 Partition；但 Producer 发布每条消息时通常只指定 Topic、Key 和 Value，由分区器按规则选择 Partition。Kafka Broker 为追加到对应 Partition 的记录分配 Offset；Consumer Group 分配 Partition 给 Consumer；Consumer 从日志读取消息，在业务结果成功保存之后将已完成进度提交。**消息被 Fetch、业务已成功、Offset 已 Commit 是三个不同事实**，不能混成一次操作。

### 【7.1】Producer 与 Partition 选择

#### 【7.1.1】Producer、Partitioner、Broker、Consumer 和 Offset Commit 的完整执行链路是什么？

**【提问】**

Producer、Partitioner、Broker、Consumer 和 Offset Commit 的完整执行链路是什么？

**关联追问：** 先用一条链路理解谁在什么时候做什么？

**【回答要点】**

~~~text
HTTP API / Producer
  1. 准备分析事件：eventId、documentId、type
  2. producer.send(topic, key, value)
                  ↓
Producer Partitioner（决定发送到哪个 Partition）
  3. 显式分区 > 根据 Key 哈希 > 无 Key 时的客户端默认选择规则
                  ↓
Kafka Broker / Topic / Partition
  4. 把记录追加进某条 Partition 日志
  5. 分配该 Partition 内独立的 Offset
                  ↓
Consumer Group / Partition Assignment
  6. Group 已将该 Partition 分给某个 Consumer
                  ↓
Consumer / Fetch 与 eachMessage 或 eachBatch
  7. 读取 Record（读取不等于完成）
  8. 在 PostgreSQL 幂等保存结果
                  ↓
Offset Commit
  9. 针对 Group + Topic + Partition 持久化下一次恢复位置
~~~

发送成功并不代表消费成功；同样，业务数据库提交成功也不等于 Kafka 已记录最新的 Committed Offset。如果在 8 与 9 之间崩溃，消息仍可能再次处理，这正是第五讲的 ACK Gap。

**【标准回答】**

Producer 发送 Topic、Key、Value，分区器决定目标 Partition，Broker 追加记录并赋 Offset；Consumer Group 分配分区，Consumer Fetch 后执行业务并保存结果，最终提交恢复位置。发送确认、业务成功和 Offset Commit 是三个独立事实，不应混为一谈。

#### 【7.1.2】发送消息时必须指定 Partition 吗？KafkaJS 怎样按显式 Partition、Key 和默认策略选分区？

**【提问】**

发送消息时必须指定 Partition 吗？KafkaJS 怎样按显式 Partition、Key 和默认策略选分区？

**关联追问：** 消息必须进入 Partition，但 Producer 不必每次手动指定它？

**【回答要点】**

Kafka Topic 创建时有 Partition 数量；如果创建时没有显式填写，服务端工具/管理接口可能使用 Broker 的默认分区配置，不意味着 Kafka 存在一个“没有 Partition 的 Topic”。

例如在本地已有 Kafka Broker 时创建三个分区的 Topic：

~~~bash
kafka-topics.sh --bootstrap-server localhost:9092 \
  --create --topic analysis-events \
  --partitions 3 --replication-factor 1
~~~

这里 replication-factor=1 只用于本地最小演示，不是生产高可用配置。

在 KafkaJS 中，发送 Record 时支持三种典型分区策略：

| 消息配置 | 如何选择目标分区 | 使用建议 |
| --- | --- | --- |
| 显式 partition:2 | 将消息发给 Partition 2 | 运维/分区策略特定需求，不推荐业务里普遍写死分区编号 |
| 不指定 partition，但有 key | 默认分区器将 Key 的哈希映射到当前有效分区 | 同一文档或订单希望按实体保持分区内事件顺序 |
| 不指定 partition，也无 key | 由分区器决定；KafkaJS 默认文档描述为 Round-robin | 无业务实体顺序要求的事件 |

**这里的 Round-robin 仅指当前 KafkaJS 文档所述的无 Key 策略，不是所有 Kafka Java/Go/其他客户端的统一保证。** 同样 Key 在当前分区数量和分区算法不变时通常进入同一 Partition；如果扩容分区、换分区算法或显式改发其他 Partition，则可能改变映射。Key 不影响 Kafka 消息是否可消费，只影响选择和业务局部顺序。

事件设计：

~~~javascript
const documentId = "doc-1001";

await producer.send({
  topic: "analysis-events",
  messages: [
    {
      key: documentId,
      value: JSON.stringify({
        eventId: "evt-1001-created",
        documentId,
        type: "analysis-started",
      }),
    },
    {
      key: documentId,
      value: JSON.stringify({
        eventId: "evt-1001-completed",
        documentId,
        type: "analysis-completed",
      }),
    },
  ],
  acks: -1,
});
~~~

acks=-1 表示等待所有 In-Sync Replicas（同步副本集合）达到确认条件。Producer.send 按这个确认策略返回不等于消费者业务完成，亦不保证跨 PostgreSQL、Kafka 的单一事务。发送过程中遇到超时，也不能仅根据“调用返回错误”就断言 Kafka 一定没收到消息；真正的失败可能发生在 Broker 处理成功、Producer 尚未收到确认的窗口。[KafkaJS Producing](https://kafka.js.org/docs/producing)。

**【标准回答】**

Topic 必然有 Partition，但每条发送的消息无需手写分区编号：显式 partition 优先；有 Key 时默认按 Key 哈希选分区；没有 Key 时使用客户端自身默认分区策略，KafkaJS 与其他客户端未必一致。Key 与分区映射随分区数、分区器调整可能变化。

#### 【7.1.3】如何在 Node.js 中使用 KafkaJS Producer 发送同一文档的连续事件？

**【提问】**

如何在 Node.js 中使用 KafkaJS Producer 发送同一文档的连续事件？

**关联追问：** Node.js 最小演示：Producer 发布三条事件？

**【回答要点】**

依赖：

~~~bash
npm install kafkajs pg
~~~

文件 producer.mjs（需提前启动 Kafka Broker、创建 Topic）：

~~~javascript
import { Kafka } from "kafkajs";

const kafka = new Kafka({
  clientId: "document-api",
  brokers: ["localhost:9092"],
});

const producer = kafka.producer({ allowAutoTopicCreation: false });
await producer.connect();

const id = "doc-1001";
const events = [
  { eventId: "evt-1001-1", documentId: id, type: "analysis-started" },
  { eventId: "evt-1001-2", documentId: id, type: "analysis-completed" },
  { eventId: "evt-1001-3", documentId: id, type: "report-updated" },
];

try {
  await producer.send({
    topic: "analysis-events",
    messages: events.map(event => ({
      key: event.documentId,
      value: JSON.stringify(event),
    })),
    acks: -1,
  });
  console.log("消息已按确认策略提交给 Kafka");
} finally {
  await producer.disconnect();
}
~~~

代码不手写 partition，由 KafkaJS 分区器根据相同 documentId 选择目标分区。在分区映射稳定的前提下，三个事件追加到同一分区日志。**这里示例是顺序形成业务事件后发送，不暗示任意并发发送者天然按业务发生时间全局有序。**

**【标准回答】**

建立 Producer 连接后 send 目标 Topic、同一 documentId Key 和序列化事件，Broker 为追加消息分配 Offset。相同 Key 在分区策略稳定时映射到相同分区，便于保留该文档的日志顺序；acks 决定生产者确认条件，不代表消费者已处理成功。

### 【7.2】eachMessage、Offset 与提交控制

#### 【7.2.1】KafkaJS eachMessage 如何逐条处理，autoCommit 怎样使用已完成进度？

**【提问】**

KafkaJS eachMessage 如何逐条处理，autoCommit 怎样使用已完成进度？

**关联追问：** Consumer 使用 eachMessage 逐条执行，正常返回后可以自动推进 Offset？

**【回答要点】**

KafkaJS 即使使用 eachMessage，底层仍然批量 Fetch 消息，但将它们逐条交给回调处理。KafkaJS 默认同一 Partition 中逐条顺序 await eachMessage；设置 partitionsConsumedConcurrently 可以让**不同** Partition 同时消费，并不等于同一个 Partition 可以不受控制地并发完成。

~~~text
Partition 0：100 → 101 → 102
                   ↓
eachMessage(100) await saveToPostgres
                   ↓
eachMessage(101) await saveToPostgres
                   ↓
eachMessage(102) await saveToPostgres

假如另一个 Partition 1：
Partition 1：200 → 201 → 202
可以和 Partition 0 的处理并行
~~~

为演示消费侧幂等，用 PostgreSQL 唯一键记录事件的业务处理结果：

~~~sql
CREATE TABLE IF NOT EXISTS processed_events (
  event_id TEXT PRIMARY KEY,
  document_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  processed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
~~~

文件 consumer-auto.mjs：

~~~javascript
import { Kafka } from "kafkajs";
import pg from "pg";

const kafka = new Kafka({
  clientId: "analysis-consumer",
  brokers: ["localhost:9092"],
});
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const consumer = kafka.consumer({ groupId: "analysis-auto-example" });

await consumer.connect();
await consumer.subscribe({ topics: ["analysis-events"], fromBeginning: true });

await consumer.run({
  autoCommit: true, // 默认 true；让 KafkaJS 管理已完成进度的提交
  partitionsConsumedConcurrently: 1,
  eachMessage: async ({ topic, partition, message }) => {
    const event = JSON.parse(message.value.toString());

    // 必须 await，不能启动后台 Promise 后立即 return
    await pool.query(
      "INSERT INTO processed_events (event_id, document_id, event_type) " +
      "VALUES ($1, $2, $3) ON CONFLICT (event_id) DO NOTHING",
      [event.eventId, event.documentId, event.type]
    );

    console.log("业务保存成功", { topic, partition, offset: message.offset });
    // 回调正常返回：表示本次消息处理函数完成；
    // 提交实际发生时间仍由 KafkaJS 的自动提交策略控制
  },
});
~~~

运行前设置 DATABASE_URL，启动 node consumer-auto.mjs；另外终端运行 node producer.mjs。为便于观察示例使用单分区处理并发数 1。真实业务处理失败需要抛错，不能 catch 后直接 return；数据库操作已经成功但 Offset 尚未提交时，后续依然可能收到相同 Record，需要 PRIMARY KEY 或业务幂等方案。

**autoCommit=true ≠ 每条消息回调返回就立即执行一次 Broker OffsetCommit 请求。** KafkaJS 根据消息/批次处理进度、配置的 autoCommitInterval / autoCommitThreshold、批次结束等条件持久化；它管理的是**已解析/完成消息的进度**，不是在业务进行中定时盲目确认后续尚未处理的消息。[KafkaJS 2.1 Consuming](https://kafka.js.org/docs/2.1.0/consuming)。

**【标准回答】**

KafkaJS 可以批量 Fetch 却逐条调用 eachMessage；默认同一分区顺序 await 回调，成功后内部推进已处理 Offset，并根据批次结束、时间或阈值规则提交给 Broker。autoCommit 不等于每条成功就立刻网络提交，也不能把正在运行的业务提前标记成功。

#### 【7.2.2】如何在 KafkaJS 中关闭自动提交并在业务保存后手动 commitOffsets？

**【提问】**

如何在 KafkaJS 中关闭自动提交并在业务保存后手动 commitOffsets？

**关联追问：** 手动提交通过 consumer.commitOffsets 显式控制确认点？

**【回答要点】**

手动提交不是 Kafka 自动帮业务做 ACK，而是应用在确认自己的业务完成后，调用 consumer.commitOffsets 把 Group 对该 Partition 的恢复位置更新到 Broker。开发者可以严格保证**代码中的提交调用在保存结果之后**，但依然无法让 PostgreSQL 和 Kafka 形成同一个事务。

文件 consumer-manual.mjs（与 consumer-auto.mjs 使用同一个 processed_events 表）：

~~~javascript
import { Kafka } from "kafkajs";
import pg from "pg";

const kafka = new Kafka({
  clientId: "analysis-consumer-manual",
  brokers: ["localhost:9092"],
});
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const consumer = kafka.consumer({ groupId: "analysis-manual-example" });

await consumer.connect();
await consumer.subscribe({ topics: ["analysis-events"], fromBeginning: true });

await consumer.run({
  autoCommit: false,
  partitionsConsumedConcurrently: 1,
  eachMessage: async ({ topic, partition, message }) => {
    const event = JSON.parse(message.value.toString());

    // 第一步：必须真正等待数据库操作成功返回
    await pool.query(
      "INSERT INTO processed_events (event_id, document_id, event_type) " +
      "VALUES ($1, $2, $3) ON CONFLICT (event_id) DO NOTHING",
      [event.eventId, event.documentId, event.type]
    );

    // 第二步：提交的是下一条要读取的 Offset，不是当前 Record Offset
    // 使用 BigInt 避免大型 Offset 超过 JS Number 安全整数范围
    await consumer.commitOffsets([{
      topic,
      partition,
      offset: (BigInt(message.offset) + 1n).toString(),
    }]);

    console.log("已保存业务并提交进度", { topic, partition, offset: message.offset });
  },
});
~~~

**这是两种不同的确认：**

~~~text
Consumer 获取 Partition 0 / Offset 102
             ↓
业务 INSERT 到 PostgreSQL
             ↓
数据库返回成功
             ↓
consumer.commitOffsets([{ partition:0, offset:"103" }])
             ↓
Kafka 中保存 Group 对 Partition 0 的恢复位置 103
~~~

- 若在数据库 INSERT 之前崩溃：没有提交 Offset 103，下一次消费仍有机会处理 Offset 102。
- 若数据库 INSERT 成功，但 commitOffsets() 之前崩溃：仍可能再次消费 Offset 102；唯一约束使第二次处理不会插入重复记录。
- 若 Offset 103 已成功提交以后 Consumer 崩溃：正常恢复将从 103 继续；并非 Topic 中的 102 被删除。
- 若 Group Rebalance 已经撤销该分区归属，旧 Consumer 的提交可能失败；数据库此前成功写入仍不会自动回滚。

尤其需要记住：**consumer.commitOffsets() 更新的是未来恢复用的 Committed Offset，它不会像 consumer.seek() 一样立即改变已启动的 Fetch / 回调消费位置。** 它的调用也不能代替 PostgreSQL 幂等保护。[KafkaJS Manual Committing](https://kafka.js.org/docs/2.1.0/consuming)。

文件中的 groupId 与自动示例不同，所以两组会**独立消费原始 Topic**；同一个数据库表仍以 event_id 幂等阻止重复入库。生产系统可以按职责划分 Group，并不代表应该为同一业务无意义地同时启动两个重复写入的服务。

**【标准回答】**

设置 autoCommit:false，回调先 await 数据库可靠保存，再对当前 Topic-Partition 提交 message.offset+1，表示下一条恢复位置。手动提交可控制确认时机，但数据库成功和 Kafka 提交仍非同一事务，ACK Gap 需要幂等保护，过期成员提交也可能失败。

#### 【7.2.3】KafkaJS eachBatch 和 eachMessage 的差别是什么？resolveOffset、heartbeat 如何工作？

**【提问】**

KafkaJS eachBatch 和 eachMessage 的差别是什么？resolveOffset、heartbeat 如何工作？

**关联追问：** eachMessage 与 eachBatch 的差别是消费回调粒度，而不是 Kafka 是否批量 Fetch？

**【回答要点】**

无论 KafkaJS 使用 eachMessage 还是 eachBatch，底层都可能批量从 Broker Fetch。两种回调的区别是：

| KafkaJS 回调 | 应用拿到什么 | 进度处理 |
| --- | --- | --- |
| eachMessage | 单条 Record，框架封装批次推进与默认心跳/自动提交处理 | 适合逐条顺序 await 业务逻辑 |
| eachBatch | 一组 Record + resolveOffset、heartbeat、commitOffsetsIfNecessary 等函数 | 应用精细控制一批记录中哪些已处理、何时请求提交 |

eachBatch 示例（消费者和数据库初始化复用上面的代码，仅展示 run 配置）：

~~~javascript
await consumer.run({
  autoCommit: true,
  eachBatchAutoResolve: false,
  eachBatch: async ({
    batch,
    resolveOffset,
    heartbeat,
    commitOffsetsIfNecessary,
    isRunning,
    isStale,
  }) => {
    for (const message of batch.messages) {
      if (!isRunning() || isStale()) break;

      const event = JSON.parse(message.value.toString());
      await saveIdempotently(event);

      // 标记“这条消息的业务处理已完成”
      resolveOffset(message.offset);

      // 长批次处理期间维持 Group 成员心跳
      await heartbeat();

      // 在自动提交策略允许时，尝试向 Kafka 提交已完成进度
      await commitOffsetsIfNecessary();
    }
  },
});
~~~

上面 saveIdempotently(event) 是业务持久化函数，应像前面 PostgreSQL 示例一样具备事件幂等保证。说明三类函数的严格边界：

- **resolveOffset(message.offset)**：告知 KafkaJS 这条 Record 的业务处理已完成；这一步不是每次都立即发送 OffsetCommit 请求。
- **commitOffsetsIfNecessary()**：遵循 autoCommit 配置的时机/阈值规则提交当前已完成进度；调用该函数不等于每次必然向 Broker 提交。
- **heartbeat()**：维持 Consumer Group 成员资格，不表示消息已经完成，也不进行 Offset Commit。

设置 eachBatchAutoResolve:false 的原因，是不希望回调仅仅“正常返回”就把整个批次的最后 Offset 自动视为已处理。复杂批次尤其要注意：**不能在 Offset 101 仍未成功处理时，贸然确认 Offset 102 已完成并把可恢复位置推进到 103。** Kafka 对一个 Partition 的消费进度是连续前缀位置，而不是按每条 Record 存一张完成位图。

这段批次代码是说明 API 机制，不是说必须使用 eachBatch 才能保证可靠性。逐条业务处理优先理解 eachMessage，确实需要批处理成本优化、明确批次进度控制时再引入 eachBatch。

**【标准回答】**

eachMessage 逐条把消息交给用户回调，eachBatch 将一个分区的批次和 resolveOffset、commitOffsetsIfNecessary、heartbeat 等控制函数交给应用自行遍历。resolveOffset 只是标记本地已处理，实际提交受配置控制，heartbeat 维持成员资格，不能代替业务成功确认。

### 【7.3】分区级并行和批次处理的顺序边界

#### 【7.3.1】为什么 Kafka 的分区日志有序却不能保证自行并发后的业务完成顺序？

**【提问】**

为什么 Kafka 的分区日志有序却不能保证自行并发后的业务完成顺序？

**关联追问：** 分区内消费有序，不意味着所有业务处理都自动有序完成？

**【回答要点】**

KafkaJS 默认 eachMessage 在单个 Partition 内逐条等待执行；配置 partitionsConsumedConcurrently 可以使**不同 Partition** 的处理回调并行：

~~~javascript
await consumer.run({
  partitionsConsumedConcurrently: 3,
  eachMessage: async ({ partition, message }) => {
    await saveIdempotently(JSON.parse(message.value.toString()));
  },
});
~~~

对于同一文档以 documentId 为 Key 的事件，在 Partition 映射稳定时可按 Offset 顺序进入同一 Partition。如果应用自己在回调内部执行不被 await 的 Promise、交给外部线程池或异步作业，则会绕过 KafkaJS 这一顺序完成边界，后续消息的副作用可能先于前一条发生。

此外，Consumer Group 中增加 Consumer 数量不会拆分某个单一 Partition 内的原始消费归属；常规 Consumer Group 的有效分区并行度受所订阅的 Partition 数量约束。高吞吐或严重倾斜时需要从 Key 分布、分区数量、处理资源和是否允许同一 Key 并行这几个维度一起分析。

**【标准回答】**

Kafka 保证分区内消息记录顺序；KafkaJS 默认 eachMessage 顺序 await，但应用可能自己用 Promise.all 或 fire-and-forget 并发发出外部请求，导致 Offset 102 的效果先于 100 完成。只有业务有依赖时保持顺序或引入状态版本控制，才能实现正确先后。

#### 【7.3.2】一个 Consumer 能否同时处理多个 Partition？partitionsConsumedConcurrently 是什么？

**【提问】**

一个 Consumer 能否同时处理多个 Partition？partitionsConsumedConcurrently 是什么？

**关联追问：** 一个 Consumer 可以并发处理多个 Partition，但默认按 Partition 内顺序 await？

**【回答要点】**

**追问：A、B、C 并行执行是什么意思？一个 Consumer 能否处理多个任务？一个 Partition 是否只能执行一个任务？**

首先要把“Consumer 数量”“Partition 归属”“业务函数并发数”三个层次分开：

1. **Consumer 是订阅与读取 Kafka 消息的运行实例**。同一常规 Consumer Group 稳定分配时，一个 Topic-Partition 归一个 Consumer 所有；一个 Consumer 则可以被分配多个 Partition。
2. **Partition 是组内分配和分区内日志顺序的基本单位**。单个 Partition 被一个 Consumer 负责，不意味着该 Consumer 整个进程同一时刻只能执行一项业务。
3. **业务函数并发是 Consumer 应用内部的执行方式**。KafkaJS 默认每个 Partition 的 eachMessage 顺序 await；不同 Partition 可以并发，开发者也能自己让同一 Partition 中已读取的 Record 同时执行业务，但需要承担顺序与 Offset 管理的责任。

示例：Group A 只有一个 Consumer C1，分配给它三个 Partition：

~~~text
Topic：analysis-events                  Consumer C1（只有一个进程）
Partition 0：A → B → C  ──────────────────► 顺序处理 A、B、C
Partition 1：D → E → F  ──────────────────► 顺序处理 D、E、F
Partition 2：G → H → I  ──────────────────► 顺序处理 G、H、I

C1 可以同时开始处理 A、D、G（分别属于不同 Partition）。
当 A 完成时，Partition 0 才继续处理 B；D、G 无需等待 A。
~~~

KafkaJS 的分区级并发配置：

~~~javascript
await consumer.run({
  partitionsConsumedConcurrently: 3,
  eachMessage: async ({ topic, partition, message }) => {
    // 对同一个 Partition：等待本条处理完成，再处理下一条
    // 对不同 Partition：最多可有 3 个处理回调同时处于进行中
    await processTask({ topic, partition, message });
  },
});
~~~

它的含义不是“开启三个 Consumer”，而是**允许这个 Consumer 同时处理最多三个不同分区的消息/批次**。KafkaJS 官方确认：同一 Partition 的 eachMessage 仍然顺序执行，不同 Partition 可以并发；eachBatch 也支持分区级并发。[KafkaJS Consuming：Partition-aware concurrency](https://kafka.js.org/docs/consuming)。

**【标准回答】**

常规 Group 中一个分区稳定分配给一个 Consumer，但单个 Consumer 可以负责多个 Partition。KafkaJS 的 partitionsConsumedConcurrently 允许同一个 Consumer 同时处理不同分区；每个分区的 eachMessage 仍按顺序 await，不等于启动三个独立 Consumer。

#### 【7.3.3】Node.js 中 A、B、C 并发执行究竟是什么意思？与 CPU 并行有何区别？

**【提问】**

Node.js 中 A、B、C 并发执行究竟是什么意思？与 CPU 并行有何区别？

**关联追问：** 并发执行是让多个异步操作重叠，不代表主线程同时跑三段 JavaScript？

**【回答要点】**

假设 A、B、C 分别调用外部 LLM/HTTP/数据库，耗时 5 秒、2 秒、1 秒：

~~~text
顺序执行（await A → await B → await C）：

时间 0s       5s   7s  8s
     A ───────┘
              B ──┘
                   C ┘
总耗时约 8 秒

并发执行（同时启动后 await Promise.all）：

时间 0s 1s  2s          5s
     A ─────────────────┘
     B ───────┘
     C ──┘
总耗时约 5 秒；完成顺序是 C、B、A
~~~

对于以异步 I/O 为主的 Node.js 程序，这种并发表示网络请求等待时间可以重叠；不能推断单一 JavaScript 主线程上 CPU 密集型代码真正三路同时运算。如果工作是同步 CPU 计算，单纯 Promise.all 不会使它获得多个 CPU 核并行计算。

**【标准回答】**

若 A、B、C 主要等待网络 I/O，分别执行需要 5、2、1 秒，顺序 await 约需 8 秒，同时发起并 await Promise.all 可让等待重叠，接近最长的一项。单线程 JavaScript 的同步 CPU 计算不会因 Promise.all 自动变成多核并行。

#### 【7.3.4】同一个 Partition 能否同时启动多条业务任务？为什么默认 eachMessage 不这样做？

**【提问】**

同一个 Partition 能否同时启动多条业务任务？为什么默认 eachMessage 不这样做？

**关联追问：** 同一个 Partition 也能自行启动多个任务，但 Kafka 不再保障业务完成顺序？

**【回答要点】**

假设 Partition 0 的日志顺序为：

~~~text
Offset 100：A（创建报告）
Offset 101：B（更新报告）
Offset 102：C（发送报告）
~~~

Kafka 保证这些记录在分区内按 Offset 顺序保存并读取。KafkaJS 默认 eachMessage 的正确用法是：

~~~javascript
await consumer.run({
  eachMessage: async ({ message }) => {
    await processTask(message); // 等到本条业务结束才正常返回
  },
});
~~~

如果开发者自己提前拿到这一批消息，并且业务允许各个任务独立处理，技术上可以：

~~~javascript
// 示意：A、B、C 已经属于当前 Consumer 收到的同一 Partition 的一批记录
await Promise.all([
  processTask(A),
  processTask(B),
  processTask(C),
]);
~~~

但此时 C 完成最快，可能在 A 创建报告之前就发送报告，导致**日志读取顺序有保证、业务副作用完成顺序没有保证**。Kafka 不会跨越应用代码强制 A 一定先完成。这种自主并发适合彼此独立的分析任务；创建 → 更新 → 发送等有依赖的业务操作不应随意这样做。

**尤其要避免 eachMessage 中的 fire-and-forget：**

~~~javascript
// 反例：KafkaJS 会看到回调很快成功返回，而业务可能仍未完成
await consumer.run({
  eachMessage: async ({ message }) => {
    processTask(message); // 没有 await！
  },
});
~~~

此时 KafkaJS 可能将当前 Offset 标记为已处理并进一步自动提交，导致业务尚未成功就推进消费位置，同时允许后续消息继续执行。它既可能破坏顺序，也可能造成崩溃后的消息遗漏。

**【标准回答】**

应用代码技术上可以并发处理已 Fetch 的多条消息，但 KafkaJS 默认 eachMessage 顺序 await 以保持分区内业务回调顺序。对于创建→更新→发送这类依赖，C 先于 A 完成会出错；自行并发仅适合互相独立且能应对乱序的业务。

#### 【7.3.5】同一 Partition 中 A、C 已完成但 B 失败，为什么最多只能提交连续完成的 Offset？

**【提问】**

同一 Partition 中 A、C 已完成但 B 失败，为什么最多只能提交连续完成的 Offset？

**关联追问：** 同一 Partition 并发时，Offset 必须按已完成的连续前缀提交？

**【回答要点】**

开发者即使手动提交，也**不能把最后完成的任务编号直接作为恢复位置**。Kafka 的 Committed Offset 是某 Group 在某 Partition 的单个恢复位置，不是对每条消息单独记录完成状态。

例如应用主动并发启动 A、B、C 后：

| Offset | 任务 | 实际状态 |
| --- | --- | --- |
| 100 | A | 已完成 |
| 101 | B | 尚未完成 |
| 102 | C | 已完成 |

这时最多只能提交 **Offset 101**：100 已完成，101 尚未完成。即使 102 已完成，也不能跳过 101 直接提交 103，否则故障恢复会从 103 开始，B 的业务可能永远没有成功执行。

~~~text
已完成集合：{100, 102}
已提交位置：101（下一条仍需保证处理的消息）
                      ↓
101 完成之后，检查 102 也已完成
                      ↓
可以一次提交 103
~~~

如果 100 本身尚未完成，无论 101、102 是否完成，当前最安全的连续进度仍停留在 100。**不同 Partition 的 Offset 彼此独立**，不要拿 Partition 0 的完成情况限制 Partition 1 的位点推进。

这也是为什么并发处理会增加实现复杂度：需要保存“进行中、已成功、失败”状态，持续检查最小未完成 Offset，并只对已完成的连续前缀提交位置。异常退出后已完成但尚未确认的记录仍可能被重新处理，因此必须保持幂等。

**【标准回答】**

Committed Offset 是分区下次恢复的单一连续位置，而不是已成功记录的位图。若 Offset 100、102 已成功但 101 未完成，最多安全提交 101；直接提交 103 会在崩溃恢复时跳过 101。只有连续前缀都已可靠完成才能继续推进。

#### 【7.3.6】eachBatch 如何安全地并发一批独立任务？Promise.all 失败有哪些边界？

**【提问】**

eachBatch 如何安全地并发一批独立任务？Promise.all 失败有哪些边界？

**关联追问：** 确实需要同一 Partition 并发时，应在整批成功后统一确认或设计连续进度跟踪？

**【回答要点】**

初学时最简单、清晰的策略是：**同一 Partition 顺序处理，不同 Partition 并发处理**，使用 partitionsConsumedConcurrently 即可。

如果同一 Partition 的 A、B、C 真正独立，且用户明确允许乱序完成，KafkaJS eachBatch 可以自行组织并发：

~~~javascript
await consumer.run({
  autoCommit: true,
  eachBatchAutoResolve: false,
  eachBatch: async ({
    batch,
    resolveOffset,
    heartbeat,
    isRunning,
    isStale,
  }) => {
    if (!isRunning() || isStale()) return;

    // 教学示例仅假设这一批消息数量很少，且每项业务相互独立
    // 必须 await 全部完成，不能仅启动 Promise 就返回
    await Promise.all(
      batch.messages.map(message => processIdempotently(message))
    );

    // 整批业务全部可靠成功后，按 Offset 顺序标记完成
    for (const message of batch.messages) {
      resolveOffset(message.offset);
    }

    await heartbeat();
    // KafkaJS 根据已完成进度与 autoCommit 规则进行后续提交
  },
});
~~~

此示例只有“整批都成功才确认本批”的简单策略：如果有任意一项失败，Promise.all 会拒绝，后面的 resolveOffset 循环不会运行。**但 Promise.all 的拒绝不会自动取消其他正在执行的任务**，它们仍可能产生数据库写入或外部副作用，因此必须具备幂等性。生产环境还必须限制批内同时运行的任务数、维护 Heartbeat、响应停止/Rebalance、处理长任务超时；不要直接对任意长度批次无限并发。

如果要在 A、C 已成功但 B 尚未完成时提前提交 A 的进度，就需要更复杂的连续完成进度计算，而不是简单 Promise.all 后一起确认。这里先认识到两种方案的能力边界，不在入门阶段实现完整乱序确认调度器。

**本讲面试回答：**

> Kafka 通过 Partition 兼顾分区内顺序和分区之间的并行。一个 Consumer 可以负责多个 Partition，KafkaJS 可以设置 partitionsConsumedConcurrently=3，同时处理三个不同分区的消息；但 eachMessage 默认保证同一 Partition 内逐条 await，因此同一 Partition 的业务回调顺序执行。开发者也可以在 eachBatch 或自建异步队列中自行并发处理同一 Partition 的多条消息，不过日志顺序并不代表业务完成顺序。为了避免并发后提前跳过尚未完成的记录，Offset 必须按照该 Partition 已可靠完成的连续前缀推进，而不是按照最后完成任务的 Offset 盲目提交。存在业务依赖时应顺序处理；任务互相独立并允许乱序时才考虑批内并发，并另外处理幂等、失败恢复和并发上限。

**【标准回答】**

同分区独立任务可以在 eachBatch 内有界并发，等整批处理可靠成功后才按 Offset 标记已解决，或维护连续完成前缀。Promise.all 拒绝并不会自动终止其他请求，提前 resolve/commit 仍可能遗漏；需要并发上限、业务幂等、心跳与 Rebalance 状态处理。

### 【7.4】运行演示与恢复验证

#### 【7.4.1】如何运行 KafkaJS Producer、两种 Consumer 和 PostgreSQL 幂等示例验证故障边界？

**【提问】**

如何运行 KafkaJS Producer、两种 Consumer 和 PostgreSQL 幂等示例验证故障边界？

**关联追问：** 运行演示与必须分清的状态？

**【回答要点】**

~~~text
第一步  建立 Topic（3 个 Partition）
第二步  准备 PostgreSQL processed_events 表
第三步  运行 node consumer-auto.mjs
第四步  运行 node producer.mjs
        └─ 事件按 Key 选择 Partition 并写入 Kafka
第五步  观察 Consumer 按 Topic / Partition / Offset 处理
第六步  停止 consumer-auto，改为 node consumer-manual.mjs
        └─ 新 Group 根据它自己的进度读取相同 Topic
第七步  再次运行 producer，并观察业务唯一约束如何去重
~~~

运行这两个消费者时建议分别测试，不应把另一个 Group 的进度与当前 Group 的提交结果混为一谈。fromBeginning:true 只在该组对应分区**没有可用 committed offset**时控制从最早可用记录开始；**不会在每次重启后强制清零消费位点**。若要重放历史，需要明确规划新 Group、位点重置或 seek，并在消息仍被保留的前提下进行。

| 观察到的事实 | 可以得出什么结论 | 不能直接得出什么结论 |
| --- | --- | --- |
| producer.send 返回成功 | Broker 达到了指定 acks 确认条件 | Consumer 已保存业务结果 |
| Consumer 打印 Offset 102 | Record 已交给 Consumer 处理 | 该 Record 业务已经成功 |
| PostgreSQL 中存在 evt-1001-2 | 业务结果至少一次成功持久化 | Kafka 已提交对应的 103 |
| committed offset=103 | 该 Group 正常恢复时从 103 开始 | Offset 102 已从 Topic 删除 |
| Consumer A 正常发送心跳 | Group 成员资格可被维持 | PostgreSQL 业务一直在正常推进 |

**最终面试回答：**

> Kafka 的 Producer 将 Topic、Key、Value 交给分区器；Topic 的消息最终存储在某个 Partition 中，由 Broker 分配 Partition 内的 Offset。Consumer Group 把分区分配给 Consumer，Consumer 读取数据并执行业务处理，最后按该组、Topic 和 Partition 提交恢复位置。KafkaJS 默认 eachMessage 便于逐条处理，autoCommit 管理已完成进度的提交；需要精确控制时，可以关闭 autoCommit，在 PostgreSQL 成功提交后调用 consumer.commitOffsets(当前 Offset + 1)。
>
> 核心可靠性边界不是采用自动还是手动提交，而是 Producer 发送确认、Consumer 业务持久化、Offset Commit 属于不同状态：先确认可能漏处理，后确认可能重复处理。因此通常选择业务成功后提交 Offset，并通过业务事件 ID 的唯一约束或幂等键防止重复效果。若批量消费，还需要正确区分 resolveOffset 的本地完成标记与真正的 Offset Commit，避免越过尚未完成的消息。

**【标准回答】**

先创建多分区 Topic 和 PostgreSQL 唯一键表，再启动不同 Group 的自动或手动提交 Consumer、使用 Producer 发送同 Key 事件；观察 Partition、Offset、结果行与已提交位点的差别。fromBeginning 只影响没有有效提交进度的分区，换 groupId 会产生独立消费位点。

## 第八章：Kafka 消息失败重试与可靠投递

**通用知识衔接：** [服务端异步任务与消息处理体系](<../F-服务端异步任务与消息处理体系.md>)第 4 章解释分区日志与故障接管，第 5 章解释 ACK Gap 和业务幂等，第 6 章解释原地重试、Retry Topic、Dead Letter、BullMQ 延迟调度。以下通过同一订单例子追问如何将这些机制连接起来；与第六、七章的基本定义不重复。

**本章核心结论：** Consumer 的业务失败不意味着 Group 成员失败；Kafka Broker 保存的是 Partition 日志而非逐 Job attempts。应用可在原消息的回调中进行有限次重试，也可将失败消息可靠转交 Retry Topic，或者交给 BullMQ 等调度器。关键在于业务完成或可靠交接**之后**才推进原 Offset，同时对重复执行、延迟阻塞和死信恢复建立明确边界。

**以下均是教学与面试推导示例**，并非在当前仓库部署的 Kafka 集群上完成的集成实验；KafkaJS 的具体错误重启、分区器、事务及配置应按实际版本与部署做故障注入验证。

### 【8.1】Kafka Consumer 仍能发送心跳，但处理某条消息持续失败时，会自动进行逐 Job 重试吗？

**【提问】**

Kafka Consumer 仍能发送心跳，但处理某条消息持续失败时，会自动进行逐 Job 重试吗？不提交 Offset 是否意味着 Broker 立即重发同一条消息？

**【回答要点】**

首先区分**消费组成员资格、业务调用结果、读取位置和提交位置**。Kafka 普通 Consumer Group 的 Heartbeat 用于保持成员资格；它不会检测一次 `processOrder()` 是否成功，更不会给每条 Record 自动维护 `attempts`、`delayed`、`completed` 等 Job 状态。

假设：

~~~text
orders / Partition 0
Offset 100：订单 A → 处理成功
Offset 101：订单 B → 正在处理，接口返回 503
Offset 102：订单 C → 后续等待

order-group 已提交 Committed Offset = 101
Consumer 本地可能已 Fetch 到 102 或更远
~~~

B 的业务调用抛出异常时，可能出现三种不同处理策略：

1. **回调内部重试**：当前 `eachMessage` 中再次调用 `processOrder(B)`；Kafka 无需追加新消息，也不一定再次 Fetch。
2. **关闭本次处理并以后重新读取**：保持已提交的恢复进度仍指向 101；之后实例重新启动、分区接管或显式调整读取位置时，可能重新 Fetch Offset 101。何时重新开始要看客户端运行器、消费状态与错误策略。
3. **成功交接 Retry Topic 后推进 Offset**：原分区不再等待 B 的处理完成；另一个 Retry Consumer 负责后续失败消息。

最重要的反例：

~~~text
Consumer 已 Fetch B
       ↓
processOrder(B) 抛错
       ↓
不调用 commitOffsets(102)
       ↓
不能推导为 Broker 立即再次主动 Push B
~~~

Kafka 常规消费使用 Consumer 主动 Fetch 的模型，`Consumer Position`（当前实例预计下次读取的位置）与 `Committed Offset`（Group 保存的恢复检查点）不等价。KafkaJS 的 `commitOffsets` 改变提交检查点，`seek` 可以显式改变当前消费位置；简单「没 Commit」不等于当前循环自动回到旧 Offset。

KafkaJS `eachMessage` 抛出异常后，客户端可能停止本次 Runner 并按具体可恢复性策略尝试重启；并非所有业务异常都能被保证立即自动恢复，也不是每次异常都必然触发 Group Rebalance。应监听消费者 `CRASH`、`STOP`、`GROUP_JOIN` 等事件并验证目标版本。

**【标准回答】**

Kafka 的 Consumer Group 只管理分区归属与消费进度，不会根据业务函数报错自动提供 BullMQ 式的逐消息有限次重试。原地重试要由应用或消费框架实现。不提交 Offset 只是没有推进持久化恢复位置，并不等于 Broker 会立即重发；重新读取发生在客户端恢复、重新分配或显式重置位置等路径中。

### 【8.2】单个 Offset 持续失败时，后续 Offset 应等待、跳过还是继续？怎样权衡分区顺序与系统吞吐？

**【提问】**

单个 Offset 持续失败时，后续 Offset 应等待、跳过还是继续？能否在原 Partition 中设置最多执行三次？

**【回答要点】**

假设订单 A、B、C 位于同一分区：

~~~text
orders / Partition 0
Offset 100：A → 成功，允许提交下一位置 101
Offset 101：B → 第一次失败
Offset 102：C → 尚未处理

策略：最多执行 3 次（含首次），依次等待 1 秒和 2 秒
~~~

**原地重试**只是在相同 `eachMessage` 回调里多次调用业务函数，不需要从 Kafka 再接收三条消息：

~~~js
import { setTimeout as sleep } from 'node:timers/promises';

// 放入已连接 Consumer 的 eachMessage 回调中
const MAX_ATTEMPTS = 3;
const order = JSON.parse(message.value.toString());
let lastError;

for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
  try {
    await processOrder(order);
    lastError = undefined;
    break;
  } catch (error) {
    lastError = error;
    if (attempt < MAX_ATTEMPTS) {
      await sleep(attempt * 1000);
      await heartbeat();
    }
  }
}
if (lastError) throw lastError;

// 和业务调用的 retry try/catch 分开，避免提交失败造成立即重做业务
await consumer.commitOffsets([{
  topic,
  partition,
  offset: (BigInt(message.offset) + 1n).toString(),
}]);
~~~

这段片段要求外层使用 `autoCommit: false`，变量来自 KafkaJS `eachMessage`，且 `processOrder` 的单次耗时与心跳策略可控。**不要把 `commitOffsets` 放进包围 `processOrder` 的重试捕获范围**：若业务执行成功、只有提交进度失败，不应因此立刻把业务再执行一次。

执行顺序：

~~~text
B Offset 101：第 1 次失败
  ↓ 等 1 秒
B Offset 101：第 2 次失败
  ↓ 等 2 秒
B Offset 101：第 3 次成功
  ↓ 提交下一位置 Offset 102
C Offset 102：才在同分区顺序回调中开始
~~~

`await sleep()` 不阻塞 Node.js 全局 Event Loop，却占用当前分区的逻辑处理回调；KafkaJS 常规 `eachMessage` 对同一 Partition 顺序等待回调完成。

如果三次全部失败，代码抛错且本轮不会提交越过 B 的 Offset；这**不等于该消息跨消费者重启总共只会执行三次**。假如新的 Consumer 后来重新 Fetch Offset 101，局部循环计数又从 1 开始，累计可能执行六次、九次。因此跨重启的上限需要持久化业务 `eventId + attempts` 状态、明确的最终失败转交或其他可靠调度状态。不能把 KafkaJS 客户端的 `retry: { retries: 3 }` 误认成业务消息最多执行三次：该配置主要用于客户端可重试的连接和协议操作。

**三种策略的取舍：**

| 策略 | 消费进度 | 代价/适用 |
| --- | --- | --- |
| 同分区短时间重试 | B 完成前不推进超过 B 的 Offset | 保留顺序；B 持续故障导致同分区 C 等待 |
| B 可靠写入 Retry Topic 后继续 | 可靠交接后提交原 Offset 102 | 主流量继续；B 与 C 的业务完成顺序可能变化 |
| 明确永久失败，可靠写入 DLT/DLQ 后继续 | 死信交接后推进原进度 | 允许人工修复与 Replay；不能无记录地直接跳过 B |

Kafka 的「分区日志有序」并不自动保证跨 Topic 转移后业务结果仍严格按订单发生顺序落库。若 B/C 存在强依赖，需要保留同一业务 Key 的顺序屏障、业务版本校验或选择继续阻塞。

**【标准回答】**

Kafka 可以在原 Partition 的当前回调内有限次重试。严格顺序下，失败消息未完成前不应提交超过它的 Offset，后续同分区消息需等待。短故障适合原地重试；长期失败可以先可靠转交 Retry Topic 或 DLQ，再推进原位点，但可能改变业务完成顺序。回调内计数不跨重启保存，整体重试上限必须另外持久化。

### 【8.3】如何设计 Retry Topic、退避和死信 Topic（DLT/DLQ），以及它们和 BullMQ attempts/backoff 的区别？

**【提问】**

如何设计 Retry Topic、退避和死信 Topic（DLT/DLQ），以及它们和 BullMQ attempts/backoff 的区别？一条订单消息从正常 Topic 到最终死信如何演化？

**【回答要点】**

**第一步：先区别消息原始记录与业务任务语义。**

Kafka 的 `orders`、`orders.retry.5s`、`orders.retry.30s`、`orders.dlq` 都是普通 Topic：各有 Partition 和 Offset，Record 中可以表达业务事件或「待执行重试指令」，但 Kafka 并没有两种物理 Topic 类型。写 Retry Topic 是**新增一条 Record**，不是物理移动或删除原 Topic 的消息。

~~~text
orders / P0 / Offset 101：订单 B 失败
           ↓ Producer 向另一 Topic 追加新 Record
orders.retry.5s / P0 / Offset 7：订单 B + eventId + retryAt
           ↓ 第一次重试失败
orders.retry.30s / P0 / Offset 2：订单 B + attempts=2
           ↓ 再次重试失败
orders.dlq / P0 / Offset 5：订单 B + 来源 + 最后错误
~~~

同一订单的 Offset 从 101、7、2 到 5 并不矛盾，Offset 在每个 Topic/Partition 内独立分配；数值仅为示例。

**第二步：先写重试消息，再推进当前 Topic 的 Offset。**

以下代码位于手动提交的原 Consumer 回调内：

~~~js
const order = JSON.parse(message.value.toString());

try {
  await processOrder(order);
} catch (error) {
  await producer.send({
    topic: 'orders.retry.5s',
    acks: -1,
    messages: [{
      key: message.key,
      value: message.value,
      headers: {
        eventId: String(order.eventId),
        attempts: '1',
        retryAt: String(Date.now() + 5000),
        sourceTopic: topic,
        sourcePartition: String(partition),
        sourceOffset: message.offset,
      },
    }],
  });
}

// 成功处理或成功写入下一条处理链路，才推进此 Topic 的恢复位点
await consumer.commitOffsets([{
  topic, partition,
  offset: (BigInt(message.offset) + 1n).toString(),
}]);
~~~

`producer.send()` 已返回仅意味着写入达到指定的 Kafka ACK 条件，不意味着重试业务已经执行成功；`acks: -1` 的持久化水平还受 ISR、`min.insync.replicas`、存储与部署条件约束。

三类故障窗口：

~~~text
① 先提交原 Offset 102 → Crash → B 尚未写重试 Topic：B 可能被漏处理
② 先发送 Retry Topic 成功 → Crash → 原 Offset 102 尚未提交：
   重启后 B 可能再次转交，Retry Topic 有两条相同 eventId
③ 业务成功 → Crash → 原 Offset 尚未提交：
   重启后重复执行业务，必须通过业务幂等吸收
~~~

**第三步：定义多级重试与最终死信。**

~~~text
orders → 业务失败 → orders.retry.5s（retryAt + 5 秒）
  → 再失败 → orders.retry.30s（retryAt + 30 秒）
  → 再失败 → orders.dlq
  → 人工/自动治理：Inspect → Repair → Replay / Discard
~~~

Consumer 可以用异常类别决定是否跳过某些重试：网络 503 适合有限次退避，字段永久缺失通常直接 DLT；响应丢失的扣款属于结果未知，需要先对账而非盲目再次调用。

**第四步：避免把 DLQ 当成普通 Retry Topic。** DLT 应保留稳定 `eventId`、原始来源 Topic/Partition/Offset、错误类别、尝试次数、故障时间与 Trace 上下文；要限制敏感信息、设置保留和重放权限。进入 DLT 表示**本轮自动重试终止**，并不意味着 Kafka 会自动修复消息或日后自动重放。

**第五步：与 BullMQ 区分。**

| 能力 | Kafka Retry Topic（应用方案） | BullMQ Delayed/Retry Job |
| --- | --- | --- |
| 存储 | Partition Log + Offset | 默认 Redis 后端的 Job 状态与调度索引 |
| 重试次数 | 应用通过字段/外部状态与可靠转交管理 | 框架原生 attempts/backoff 等配置 |
| 到期时间 | Header 中 `retryAt` 是普通数据 | 调度器识别 Job 到期条件 |
| 失败确认 | 当前 Consumer 提交 Offset | Worker 更新 Job 终态/重试状态 |
| 自动防重复业务效果 | 没有 | 也没有，仍需业务幂等 |

**【标准回答】**

Kafka Retry Topic 和 DLT 都是普通 Topic，Kafka 并不自动理解事件「重试三次、30 秒后执行」。应用在业务失败时先发送含稳定 eventId、attempts、retryAt 的新记录，确认后再提交原分区 Offset，防止提前提交造成漏处理；发送成功、提交前崩溃会产生重复转交，所以必须幂等。重试达到上限或属于永久错误则可靠进入 DLT，供排查修复和安全重放。BullMQ 则把重试和延迟组织成 Job 状态与调度机制，两者抽象不同。

### 【8.4】Producer 发送超时后，为什么不能立即断言消息不存在？幂等生产者与业务事件 ID 分别解决什么问题？

**【提问】**

Producer 发送超时后，为什么不能立即断言消息不存在？幂等生产者与业务事件 ID 分别解决什么问题？

**【回答要点】**

发送超时只说明**Producer 没在约定时间内观察到预期确认**，不说明 Broker 一定未接受消息。

~~~text
Producer send(event-B)
       ↓
Broker Leader 已追加 event-B
       ↓
Broker ACK 在网络中丢失/延迟
       ↓
Producer 观察到请求超时
       ↓
如果直接发送一条新的业务消息 event-B：
   Broker 可能已存在原 Record，造成重复
~~~

需要区分不同级别的保护：

1. **`acks`**：Producer 要等待的 Broker 确认条件，`acks=0` 不等待、`acks=1` 等 Leader 确认、`acks=all/-1` 等符合当前复制配置的 ISR 确认。ACK 强度不是业务处理完成，也不能脱离副本与 ISR 配置断言绝不丢失。
2. **Kafka 幂等 Producer**：在支持并正确配置幂等的客户端与 Broker 上，利用 Producer ID、Epoch 和分区序列号等信息，在相同生产者会话及受支持重试边界内抑制协议重试造成的重复追加；不是根据业务 `eventId` 做永久全局去重，也不保证进程重启后重新发布相同业务事件不重复。
3. **业务事件 ID**：应用为同一订单事件保留稳定 `eventId`，让下游数据库唯一键/状态机/下游幂等接口能够识别同一业务操作。**仅携带 eventId 本身不会自动去重**，需要消费端实际落实检查或唯一约束。
4. **Transactional Outbox**：如果 PostgreSQL 业务事实与 Kafka 事件需要一起保证「业务提交后最终发布」，应评估先在同一 PostgreSQL 事务内写业务行与 Outbox，再由投递者异步发布并保存进度；Outbox 发布自身可重复，下游仍需幂等。

KafkaJS `retry` 参数主要负责可重试客户端请求，`producer({ idempotent: true })` 的能力与约束应以所用 KafkaJS 版本官方文档为准，不应混淆成每条业务消息有「只执行一次」的配置。

**【标准回答】**

发送超时意味着确认结果未知：Broker 可能已写入，但 ACK 丢失。Kafka 幂等 Producer 可在协议支持的重试范围内消除一部分重复追加，业务 eventId 与消费端唯一约束防止业务副作用重复；`acks` 定义确认条件但不表示下游处理完成。业务数据库与 Kafka 跨系统发布还要考虑 Outbox、补发和对账。

### 【8.5】如何把投递确认、Consumer 重试、幂等、副作用、对账与故障补偿连接成可靠闭环？

**【提问】**

如何把投递确认、Consumer 重试、幂等、副作用、对账与故障补偿连接成可靠闭环？

**【回答要点】**

以「用户订单创建成功后，后台调用第三方服务生成发票」为例。完整系统不能只依赖 `producer.send()`、`processOrder()`、`commitOffsets()` 三行代码：

~~~text
HTTP 请求
  ↓
数据库事务：写 orders + outbox_events（同库原子提交）
  ↓
Outbox 投递者发送 eventId=E 到 Kafka
  ↓
Kafka 根据 acks / 副本配置确认记录
  ↓
Consumer Group 读取 Topic / Partition / Offset
  ↓
业务侧以 eventId 或 operationId 做幂等与完成状态判断
  ↓
调用发票下游服务（传递幂等键；结果未知时查询或对账）
  ├─ 成功 → 业务结果持久化 → 提交 Offset
  ├─ 临时失败 → 原地有限次重试或转移 Retry Topic
  ├─ 永久失败 → 可靠交给 DLQ/人工流程
  └─ 结果未知 → 先确认下游是否已成功，避免重复创建
  ↓
观测：Producer 错误、Consumer Lag、失败率、重试次数、DLQ、任务最老等待时间
  ↓
对账与补偿：找出已提交业务但未发布、已发布但未落下游结果的操作
~~~

逐个故障窗口推演：

| 故障窗口 | 可能的结果 | 保护机制 |
| --- | --- | --- |
| 业务库提交后 Kafka 发送之前崩溃 | 业务事实存在但事件还未发 | 同库 Outbox 记录与持续补发 |
| Broker 已追加但 ACK 丢失 | 发送端认为失败、可能再发 | 幂等 Producer 的有限协议保证 + 稳定 eventId |
| Consumer 外部副作用成功、Offset 未提交 | 恢复重读并重复操作 | 业务幂等和对账 |
| Retry Topic 已写入、原 Offset 未提交 | 同一事件重复进入重试链路 | 稳定事件键 + 最终业务幂等 |
| 抛出业务异常但 Consumer 仍活着 | Kafka 不会凭空将 Partition 迁给其他成员 | 当前 Consumer 的业务重试/死信策略 |
| DLQ 记录修复后重放 | 重新执行可能重复已有结果 | 重放权限、状态校验与幂等 |

Kafka 事务可在其支持的 Kafka 输入位点与输出 Topic 边界内协调原子提交，但**不能因此把第三方扣款、PostgreSQL 或 HTTP API 自动纳入该 Kafka 事务**。事务适用前还要根据客户端所支持的幂等生产与事务 API 设计和验证。

**【标准回答】**

可靠异步的关键不是某个队列宣称 Exactly-once，而是分清事件产生、Broker 确认、Consumer 业务副作用与 Offset 提交四个阶段。业务变更和 Outbox 可在同一数据库事务中提交；Kafka 发送超时视为结果未知；Consumer 在业务持久化或失败可靠转交后才提交进度。重复读取由 eventId 幂等吸收，持续失败进入有限重试与 DLQ，结果未知需对账补偿，并用 Lag、失败率与 DLQ 监控验证闭环。

## 第九章：参考资料与知识关联

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
28. [Apache Kafka 4.3 Introduction](https://kafka.apache.org/43/getting-started/introduction/)：Topic、Partition、消息 Key、Offset、消息保留与多消费者组。
29. [Apache Kafka 4.3 Distribution](https://kafka.apache.org/43/implementation/distribution/)：Group Coordinator 与 __consumer_offsets 等进度持久化机制。
30. [Apache Kafka 4.3 Consumer Rebalance Protocol](https://kafka.apache.org/43/operations/consumer-rebalance-protocol/)：Classic 与 Consumer 协议，KIP-848 增量重新分配。
31. [Apache Kafka 4.2 Upgrading](https://kafka.apache.org/42/getting-started/upgrade/)：普通 Consumer Group 与 Share Group 的重要语义区别。
32. [KafkaJS Consuming](https://github.com/tulios/kafkajs/blob/master/docs/Consuming.md)：KafkaJS eachMessage、eachBatch、并行消费、提交 Offset 与重试边界。
33. [Apache Kafka 4.2 Consumer Configs](https://kafka.apache.org/42/configuration/consumer-configs/)：Session Timeout、Heartbeat、Java Consumer 的 max.poll.interval.ms 以及经典与新组协议区别。
34. [Apache Kafka 4.2 CommitFailedException](https://kafka.apache.org/42/javadoc/org/apache/kafka/clients/consumer/CommitFailedException.html)：分区重新分配后原 Consumer 的 Offset Commit 可能失败。
35. [Apache Kafka 4.2 ConsumerRebalanceListener](https://kafka.apache.org/42/javadoc/org/apache/kafka/clients/consumer/ConsumerRebalanceListener.html)：消费分区被撤销与重新分配时的应用回调边界。
36. [KafkaJS 2.1 Consuming](https://kafka.js.org/docs/2.1.0/consuming)：eachMessage 的心跳/长任务时限、eachBatch 的 isRunning、isStale、resolveOffset 行为。
37. [KafkaJS Producing](https://kafka.js.org/docs/producing)：Producer.send 参数、Key/Partition 默认选择策略、acks 和自定义分区器。
38. [KafkaJS 2.1 Consuming：Auto Commit / Manual Committing](https://kafka.js.org/docs/2.1.0/consuming)：eachMessage 的自动处理进度、eachBatch 的 resolveOffset / commitOffsetsIfNecessary、手动 consumer.commitOffsets 与 fromBeginning 边界。
39. [KafkaJS 2.0 Migration](https://kafka.js.org/docs/migration-guide-v2.0.0)：默认分区器变化，Key 哈希兼容性及生产迁移注意事项。




> 本文是正式归档的系统性 QA 面试问答；第八章新增的机制示例和故障时间线属于教学推演，实际 KafkaJS/BullMQ 运行行为需按版本与集成故障注入确认。
