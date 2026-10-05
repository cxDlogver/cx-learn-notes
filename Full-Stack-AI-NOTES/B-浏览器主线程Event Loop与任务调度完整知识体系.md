# 浏览器主线程、Event Loop 与任务调度完整知识体系

浏览器里的异步、动画、用户交互和页面性能，本质上都绕不开一个共同问题：

> **有限的执行资源应该在什么时候执行哪一类工作，怎样避免某一段 JavaScript 长时间占住主线程，让输入处理和页面更新失去机会。**

因此这篇文档不把 Event Loop、Promise、requestAnimationFrame、Long Task、Worker 当成互不相关的 API，而是沿一条完整运行链理解：

~~~text
Renderer / Window Agent
        ↓
Main-thread Work
        ↓
Event Loop
        ↓
Task / Microtask
        ↓
Rendering Opportunity
        ↓
Scheduling API
        ↓
Main-thread Blocking
        ↓
Yield / Chunking / Worker
        ↓
Responsiveness / Smoothness
~~~

本文负责建立浏览器运行时调度的上位框架。具体专项继续进入：

- [浏览器事件循环、任务、微任务与渲染时机](./QA/浏览器事件循环、任务、微任务与渲染时机.md)
- [主线程长任务、任务拆分与 Worker 优化](./QA/主线程长任务、任务拆分与 Worker 优化.md)
- [前端异步编程](./Q-前端异步编程.md)
- [基于 Chrome 浏览器渲染原理](./J-基于Chrome浏览器渲染原理.md)
- [页面流畅度与连续渲染性能完整知识体系](./Y-页面流畅度与连续渲染性能完整知识体系.md)

---

## 1. 浏览器运行时调度从主线程竞争问题开始

### 【主线程竞争构成浏览器任务调度的起点】

#### <u>主线程问题来自多类工作竞争有限执行时间</u>

在浏览器页面中，需要推进的工作不只有业务 JavaScript：

~~~text
JavaScript
用户输入事件
Timer Callback
Network / WebSocket Event
Framework Update
Style / Layout
Paint Preparation
Animation Callback
GC
...
~~~

这些工作并不是“各跑各的”。从页面开发者视角看，大量关键工作最终都要与 Renderer Main Thread 上的 JavaScript 和渲染准备争夺时间。

因此前端卡顿可以先抽象成：

~~~text
某项工作长时间占用执行机会
        ↓
后续 Task 延迟
        ↓
用户输入延迟
        +
Rendering Opportunity 延迟
        ↓
Responsiveness 变差
Smoothness 变差
~~~

这也是为什么同一个 Long Task 既可能让按钮“点不动”，也可能让动画掉帧。

#### <u>规范中的 Event Loop 与实现线程不能简单画等号</u>

WHATWG HTML Standard 使用 Agent 和 Event Loop 描述任务、事件、脚本和渲染的协调关系。规范还明确提醒：Event Loop 不必与某一个实现线程一一对应。

工程上常说“浏览器主线程 Event Loop”，是为了描述 Chromium 等浏览器中页面 JavaScript、DOM 和大量渲染准备工作集中在 Renderer Main Thread 上这一实现事实；理解规范时仍应区分：

~~~text
规范模型
Agent / Event Loop / Task Queue

实现模型
Process / Main Thread / Compositor Thread / Raster Thread
~~~

二者互相对应，但不是同一个抽象层。

官方资料：[HTML Standard — Event loops](https://html.spec.whatwg.org/multipage/webappapis.html#event-loops)。

---

## 2. Event Loop 把 Task、Microtask、Rendering Opportunity 与框架更新连接成运行链

这一层回答：一段工作怎样获得执行机会、什么时候处理 Microtask、什么时候进入视觉更新，以及框架调度为什么还位于浏览器调度之上。

### 【Event Loop 协调 Task、Microtask 与 Rendering Opportunity】

#### <u>Task 是浏览器安排一段工作的基本调度单位之一</u>

HTML Standard 使用 task，而不是把“宏任务”作为正式术语。

典型来源可以包括：

- Timer 到期后的处理；
- 用户事件；
- 网络或其他 Web API 产生的事件；
- MessageChannel / postMessage 等消息事件；
- 页面和资源处理相关工作。

一个简化模型是：

~~~text
Event Loop
   ↓
选择一个可运行 Task
   ↓
执行 Task 中的 JavaScript
   ↓
Microtask Checkpoint
   ↓
可能进入 Rendering Opportunity
   ↓
继续选择后续工作
~~~

“宏任务”可以用于面试交流，但文档默认使用规范术语 Task。

#### <u>Microtask 用于当前工作结束后的高优先级延续</u>

常见 Microtask 来源包括：

- Promise reaction：then / catch / finally；
- queueMicrotask()；
- MutationObserver 的相关通知。

HTML Standard 的 Microtask Checkpoint 会持续处理 Microtask Queue，直到队列为空。

因此：

~~~js
queueMicrotask(function loop() {
  queueMicrotask(loop);
});
~~~

会不断生成新的 Microtask。

问题不是“Microtask 优先级高所以更快”，而是：

~~~text
当前 Task 结束
        ↓
Microtask Checkpoint
        ↓
队列一直产生新 Microtask
        ↓
Checkpoint 很久不能结束
        ↓
后续 Task / Rendering Opportunity
长时间得不到机会
~~~

这就是 Microtask Starvation（微任务饥饿）。

HTML Standard 也明确提醒，大量 Microtask 与大量同步代码一样，会阻止浏览器推进 Rendering 等自身工作。

官方资料：[HTML Standard — Timers and microtasks](https://html.spec.whatwg.org/multipage/timers-and-user-prompts.html)。

#### <u>Rendering Opportunity 是独立的调度阶段，不是每个 Task 后必然 Paint</u>

常见口诀：

~~~text
宏任务
→ 微任务
→ 渲染
→ 下一个宏任务
~~~

只能作为入门近似。

更准确的关系是：

~~~text
Task
↓
Microtask Checkpoint
↓
如果当前存在合适的 Rendering Opportunity
↓
更新 Rendering
↓
后续 Event Loop 工作
~~~

浏览器可以根据页面是否可见、当前刷新率、页面是否真的需要更新和当前负载决定什么时候给页面新的 Rendering Opportunity。

因此：

> **Event Loop 决定工作如何推进；显示刷新周期决定浏览器何时有视觉更新机会；二者相关，但不能简化成“一次 Task 对应一次 Frame”。**

---

### 【requestAnimationFrame 属于 Rendering Scheduling】

#### <u>rAF 表达的是“下一次合适的绘制前执行”</u>

requestAnimationFrame(callback) 的语义是请求浏览器在下一次 Repaint 前执行 callback。

~~~js
requestAnimationFrame((timestamp) => {
  updateVisualState(timestamp);
});
~~~

它具有几个关键边界：

1. callback 是一次性的，持续动画需要再次调用 rAF；
2. 调用频率通常接近显示器刷新率，但不是固定 60Hz；
3. 后台标签页通常会暂停或显著降低调用频率；
4. rAF callback 内的代码仍然需要占用页面执行资源，重计算不会因为放进 rAF 就自动变轻。

官方资料：[MDN — requestAnimationFrame](https://developer.mozilla.org/en-US/docs/Web/API/Window/requestAnimationFrame)。

#### <u>rAF 解决“什么时候做视觉工作”，不解决“工作本身太重”</u>

错误理解：

~~~text
100ms Heavy Work
↓
放进 requestAnimationFrame
↓
自动变流畅
~~~

实际仍然是：

~~~text
rAF callback
↓
执行 100ms Heavy Work
↓
连续占用执行机会
↓
错过多个 Rendering Opportunity
~~~

所以：

> **rAF 是 Scheduling Mechanism（调度机制），不是 Parallelism（并行）或性能加速器。**

它适合把“收到数据”与“提交视觉更新”解耦，但每次提交的工作量仍必须控制。

---

## 3. 不同 Scheduling API 表达不同的执行意图

这一层不再按“宏任务 / 微任务”简单二分，而是根据工作是否与视觉更新、延迟、优先级或后台执行相关来选择 API。

### 【Promise、Timer、rAF、Idle 与 Scheduler API 的调度语义】

#### <u>调度 API 不能只按“宏任务 / 微任务”二分</u>

实际工程选型更应该问：

> **我希望这段工作在什么时机执行，它和下一次 Paint 的关系是什么，它是否可以延后，它是否必须让出主线程？**

| 机制 | 调度语义 | 适合的问题 | 主要边界 |
| --- | --- | --- | --- |
| Promise / queueMicrotask | 当前 Task 后的 Microtask Checkpoint | 很小的状态延续、顺序一致性 | 大量 Microtask 会延迟 Task 和 Rendering |
| setTimeout | 满足时间条件后进入后续 Task 调度 | 延迟、粗粒度任务拆分、重试 | 时间不是精确执行时间 |
| MessageChannel / postMessage | 通过消息事件产生后续 Task | Task 级让出和调度 | 不与视觉刷新天然对齐 |
| requestAnimationFrame | 下一次合适 Repaint 前 | 视觉状态、动画、按帧提交 | callback 过重仍掉帧 |
| requestIdleCallback | 浏览器认为主线程有空闲时 | 可延后的后台工作 | 当前不是 Baseline，必要任务应考虑 timeout / fallback |
| scheduler.postTask | 按粗粒度 Priority 调度 Task | 有优先级的用户可见 / 后台工作 | 当前兼容性仍需检查 |
| scheduler.yield | 当前长工作主动让出执行权，后续以 Task 继续 | 长任务 Chunking | 当前兼容性仍需 feature detection |
| Web Worker | 让另一 Worker Agent 执行 JavaScript | CPU 密集且可脱离 DOM 的工作 | 消息传递和序列化也有成本 |

截至当前 MDN，requestIdleCallback 和 Prioritized Task Scheduling API 仍需注意兼容性；生产代码不能默认所有浏览器都可用。

官方资料：

- [MDN — requestIdleCallback](https://developer.mozilla.org/en-US/docs/Web/API/Window/requestIdleCallback)
- [MDN — Prioritized Task Scheduling API](https://developer.mozilla.org/en-US/docs/Web/API/Prioritized_Task_Scheduling_API)
- [MDN — scheduler.yield](https://developer.mozilla.org/en-US/docs/Web/API/Scheduler/yield)

#### <u>setTimeout 的 delay 是最早可调度时间，不是执行承诺</u>

~~~js
setTimeout(callback, 100);
~~~

不能理解为：

~~~text
100ms 时 callback 必定开始执行
~~~

而是：

~~~text
满足 Timer 时间条件
        ↓
相关工作成为后续可运行 Task
        ↓
仍要等待当前 JavaScript、
Microtask 和其他 Event Loop 工作
        ↓
真正执行 callback
~~~

因此 Main Thread 繁忙时 Timer 会明显延迟。

---

### 【Framework Scheduling 位于浏览器调度之上】

Vue、React 等框架还会在浏览器 Event Loop 之上维护自己的 Update Queue。

以 Vue 的概念为例：

~~~text
State Changed
        ↓
Framework 收集需要更新的组件
        ↓
批量 Flush Update
        ↓
DOM Patch 完成
        ↓
nextTick callback
~~~

因此：

> **Framework nextTick 的“下一次”是框架 Update Flush 边界，不应直接等同于下一次屏幕 Paint。**

如果需要确认视觉更新时机，仍应继续考虑 Rendering Opportunity / requestAnimationFrame。

这也是为什么工程测量经常要区分：

~~~text
State Commit Duration
        ≠
DOM Patch Completed
        ≠
Next Paint / Presented Frame
~~~

框架调度和浏览器调度属于上下两层。

---

## 4. Long Task 与 Starvation 解释主线程为什么长期没有归还执行权

### 【Long Task 与 Microtask Starvation 的阻塞模型】

#### <u>一个长 Task 会同时推迟输入和渲染</u>

假设主线程执行：

~~~text
0ms ───────────────────────── 120ms
        Heavy JavaScript
██████████████████████████████
~~~

这段时间里，等待的可能包括：

~~~text
Click Event
Timer Callback
WebSocket Message
rAF Callback
Style / Layout
下一次 Frame
~~~

因此同一个 Main-thread Blocking 可以向两个用户体验维度传播：

~~~text
Main-thread Blocking
        ↓
┌────────────────────┐
↓                    ↓
Input delayed       Rendering delayed
↓                    ↓
Responsiveness      Smoothness
↓                    ↓
INP                  Frame Time / Jank
~~~

Long Tasks API 通常把主线程中持续 50ms 以上的 Task 作为需要关注的长任务，但 50ms 不是“60Hz 流畅帧预算”。一个 20ms 的工作在高刷新率场景已经可能造成掉帧，却不会成为 Long Task。

所以 Long Task 是诊断信号，不是完整的 Frame 指标。

进一步阅读：[主线程长任务、任务拆分与 Worker 优化](./QA/主线程长任务、任务拆分与 Worker 优化.md)。

#### <u>Microtask Starvation 也能形成类似长期占用</u>

并不是只有单个大 Task 才会阻止浏览器工作。

~~~text
Task 结束
↓
Microtask A
↓
创建 Microtask B
↓
Microtask B
↓
继续创建...
~~~

Microtask Checkpoint 长时间无法结束时，同样会让后续 Rendering 和 Task 得不到机会。

因此优化主线程时要同时检查：

- 单个 Long Task；
- 连续大量 Microtask；
- 高频 Timer / Message Task；
- rAF callback 自身过重；
- Framework Update 批次过重。

---

## 5. 主线程优化依次采用减少工作、主动 Yield 与 Worker Offload

### 【减少工作、主动让出与 Worker Offload 三类优化路径】

#### <u>第一条是 Reduce Work：先问这项工作是否必须做</u>

最高收益通常不是换调度 API，而是减少工作量：

~~~text
全量遍历
→ 增量处理

每次重建
→ 复用对象

所有数据都响应式
→ 只让 UI 必需状态进入响应式系统

每条消息都提交视图
→ Batch / Coalesce
~~~

如果一段计算从 100ms 降到 5ms，就不需要靠复杂调度“救场”。

#### <u>第二条是 Cooperative Scheduling：任务还在主线程，但主动 Yield</u>

一个可拆分的长任务：

~~~text
300ms Work
~~~

可以改成：

~~~text
30ms Work
↓
Yield
↓
浏览器处理 Input / Rendering / Other Task
↓
30ms Work
↓
Yield
...
~~~

这是 Cooperative Scheduling（协作式调度）。

现代 API 可以在支持环境使用：

~~~js
async function processInChunks(items) {
  for (const item of items) {
    process(item);

    if (globalThis.scheduler?.yield) {
      await scheduler.yield();
    }
  }
}
~~~

MDN 对 scheduler.yield() 的定义就是把主线程控制权暂时交回浏览器，后续继续当前异步函数。

兼容性不足时可以根据场景使用 Task 级 fallback，例如 setTimeout；但 Microtask 不是真正的“让浏览器获得下一轮 Task / Rendering 机会”的替代品。

#### <u>第三条是 Parallelize / Offload：把可并行 CPU 工作移到 Worker</u>

适合 Worker 的典型工作：

- 大数组计算；
- 解析与转换；
- 排序 / 聚合；
- 图像或空间算法；
- 与 DOM 无关的 CPU-heavy 工作。

不适合直接搬 Worker 的工作：

- DOM API；
- Vue / React DOM Commit；
- 大多数依赖 Window / Document 的 UI API；
- 必须同步操作页面元素的逻辑。

因此决策不是：

~~~text
页面卡
→ 上 Worker
~~~

而是：

~~~text
任务为什么慢？
        ↓
纯 CPU 且可以脱离 DOM？
   ├─ Yes → Worker 候选
   └─ No
        ↓
    能否减少工作？
        ↓
    能否拆成多个 Task / Frame？
~~~

Worker 自己也拥有 Event Loop；它解决的是把计算从 Window Main Thread 的竞争中移走，不是消灭计算成本。

---

## 6. 调度选型与性能定位必须从任务语义和主线程证据出发

### 【调度 API 的任务语义选型】

#### <u>一个通用决策树</u>

~~~text
有一段待执行工作
        ↓
是否只是当前状态变化后的极小顺序收尾？
        ├─ Yes
        │    → Promise / queueMicrotask
        │
        └─ No
             ↓
        是否必须与下一次视觉更新同步？
             ├─ Yes
             │    → requestAnimationFrame
             │
             └─ No
                  ↓
        是否 CPU 密集且可以脱离 DOM？
             ├─ Yes
             │    → Web Worker
             │
             └─ No
                  ↓
        是否属于低优先级、可以等浏览器空闲？
             ├─ Yes
             │    → idle / background scheduling
             │      （先检查兼容性）
             │
             └─ No
                  ↓
        是否一段较长但可以拆分的主线程工作？
             ├─ Yes
             │    → Chunk + Yield / 后续 Task
             │
             └─ No
                  ↓
             先减少工作本身
~~~

#### <u>不同机制的常见误用</u>

| 错误做法 | 为什么错 |
| --- | --- |
| 用 Microtask 拆 300ms 工作 | Microtask Checkpoint 可能连续清空，浏览器仍拿不到 Rendering / 后续 Task 机会 |
| 用 rAF 包住重计算就认为会流畅 | rAF 只改变执行时机，不减少 callback 成本 |
| 用 setTimeout 当精确定时器 | Main Thread 忙时实际执行会延迟 |
| 用 nextTick 判断已经 Paint | 它首先是 Framework Update Flush 边界 |
| 所有后台工作都放 requestIdleCallback | 兼容性和任务饥饿风险都要处理 |
| 页面卡就上 Worker | DOM / Framework Commit / Rendering API 可能才是真瓶颈 |

---

### 【性能定位先判断主线程为什么没有及时让出】

#### <u>Performance Trace 的观察顺序</u>

遇到：

~~~text
点击迟钝
滚动卡顿
动画掉帧
Timer 延迟
实时数据积压
~~~

不要直接从某个 API 开始优化。

先判断：

~~~text
Main Thread Timeline
        ↓
是否存在长 Task？
        ↓
Task 内部主要时间在哪里？
        ├─ JavaScript
        ├─ Framework
        ├─ Style / Layout
        ├─ Paint
        └─ 第三方 Library
        ↓
是否存在大量 Microtask？
        ↓
rAF callback 是否过重？
        ↓
任务是否可以减少 / 拆分 / 搬 Worker？
~~~

页面流畅度的完整 Frame / LoAF / Queue 诊断继续阅读：[页面流畅度与连续渲染性能完整知识体系](./Y-页面流畅度与连续渲染性能完整知识体系.md)。

#### <u>“FPS 低”只是结果，任务调度解释的是原因之一</u>

FPS 下降可能来自：

- JavaScript Long Task；
- rAF callback 太重；
- Style / Layout / Paint；
- 图形引擎 Scene 成本；
- GPU / Raster；
- 浏览器后台策略。

所以：

> **Event Loop / Main Thread Scheduling 是流畅度的重要原因层，但不能替代完整 Rendering Pipeline 分析。**

---

## 7. 浏览器调度连接异步、框架、渲染与性能四个前端知识域

### 【异步、框架、渲染与性能的知识连接】

~~~text
JavaScript Async Control Flow
Promise / async-await
        │
        ▼
Browser Scheduling
Task / Microtask / Event Loop
        │
        ├───────────────┐
        ▼               ▼
Framework Update      Rendering Opportunity
nextTick / batch      rAF / Style / Layout / Paint
        │               │
        └───────┬───────┘
                ▼
          Main-thread Cost
                ↓
       Long Task / Starvation
                ↓
     Chunk / Yield / Worker
                ↓
Responsiveness + Smoothness
~~~

对应知识入口：

- Promise / async-await：[前端异步编程](./Q-前端异步编程.md)
- Event Loop 单题：[浏览器事件循环、任务、微任务与渲染时机](./QA/浏览器事件循环、任务、微任务与渲染时机.md)
- Long Task / Worker：[主线程长任务、任务拆分与 Worker 优化](./QA/主线程长任务、任务拆分与 Worker 优化.md)
- Rendering Pipeline：[基于 Chrome 浏览器渲染原理](./J-基于Chrome浏览器渲染原理.md)
- Smoothness：[页面流畅度与连续渲染性能完整知识体系](./Y-页面流畅度与连续渲染性能完整知识体系.md)

---

### 【面试回答从调度目标而不是执行口诀展开】

如果面试官问：

> Event Loop、Promise、setTimeout、rAF、Worker 之间怎么理解？

可以收束为：

> 浏览器需要协调 JavaScript、用户事件、网络事件和页面更新，因此使用 Event Loop 推进可运行的 Task，并在规定的 Microtask Checkpoint 处理 Promise 等 Microtask；页面渲染则发生在合适的 Rendering Opportunity，而不是每个 Task 后固定 Paint。不同 API 表达不同调度意图：Promise / queueMicrotask 适合当前 Task 后的小型状态延续，Timer 把工作放到后续 Task，requestAnimationFrame 用于下一次视觉更新前的工作，长任务则要通过减少工作、Task Chunking 或 scheduler.yield 主动让出主线程；如果是与 DOM 无关的 CPU 密集计算，再考虑 Worker。核心不是背“宏任务、微任务谁先”，而是理解什么工作正在竞争主线程，以及浏览器什么时候能重新获得推进输入和渲染的机会。

---

## 8. 项目实践与权威资料验证通用调度模型

### 【QHZHC 实时可视化验证浏览器调度模型】

QHZHC 实时可视化项目把这些抽象机制落到了同一条运行链：

~~~text
WebSocket Message Event
        ↓
只做校验 / 入 Queue
        ↓
requestAnimationFrame
        ↓
按帧消费 Telemetry
        ↓
Vue State Commit
        ↓
Framework Update / nextTick
        ↓
ECharts / OpenLayers / Cesium
        ↓
Rendering
~~~

同时：

~~~text
setInterval
→ Heartbeat / Watchdog / Stats Sampling

setTimeout
→ Reconnect Backoff / Chart Coalescing

requestAnimationFrame
→ Realtime Queue / FPS Sampling / Visual Chunk

PerformanceObserver
→ Long Animation Frame Diagnosis
~~~

完整项目分析见：

[QHZHC：浏览器主线程与实时任务调度](https://github.com/cxDlogver/qhzhc-realtime-platform/blob/main/docs/%E6%B5%8F%E8%A7%88%E5%99%A8%E4%B8%BB%E7%BA%BF%E7%A8%8B%E4%B8%8E%E5%AE%9E%E6%97%B6%E4%BB%BB%E5%8A%A1%E8%B0%83%E5%BA%A6.md)

项目文档负责展示当前真实源码、不同调度边界的代码证据和项目取舍；本文保持通用知识独立。

---

### 【参考文献】

1. [WHATWG HTML Standard — Event loops](https://html.spec.whatwg.org/multipage/webappapis.html#event-loops)
2. [WHATWG HTML Standard — Timers and user prompts](https://html.spec.whatwg.org/multipage/timers-and-user-prompts.html)
3. [MDN — Window.requestAnimationFrame()](https://developer.mozilla.org/en-US/docs/Web/API/Window/requestAnimationFrame)
4. [MDN — Window.requestIdleCallback()](https://developer.mozilla.org/en-US/docs/Web/API/Window/requestIdleCallback)
5. [MDN — Prioritized Task Scheduling API](https://developer.mozilla.org/en-US/docs/Web/API/Prioritized_Task_Scheduling_API)
6. [MDN — Scheduler.yield()](https://developer.mozilla.org/en-US/docs/Web/API/Scheduler/yield)
7. [MDN — Web Workers API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API)
8. [W3C — Long Tasks API](https://www.w3.org/TR/longtasks-1/)
