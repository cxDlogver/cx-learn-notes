# Responsiveness 交互响应性能：INP 三阶段诊断与优化体系（草稿）

> **草稿状态**：独立讨论稿，尚未接入正式知识体系索引、QA、正式性能教程；后续可按四类用户体验的统一框架补全与复核。
>
> **讨论范围**：只讨论 Responsiveness（交互响应），以 INP（Interaction to Next Paint，交互到下一次绘制）为核心结果指标；按 Input Delay、Processing Duration、Presentation Delay 三阶段解释“交互为什么迟迟没有视觉反馈”，建立“异常阶段 → 上位问题类别 → 原始证据 → 可验证候选根因 → 优化方向 → 验收闭环”。
>
> **事实边界**：文中版本、耗时、页面和案例均是通用演示数据，不代表真实项目线上结论。浏览器支持与 web-vitals 库字段以对应版本和官方规范为准。

## 1. 交互响应需要从“用户操作到下一帧”建立完整诊断模型

### 【Responsiveness 衡量的是用户发起操作以后能否及时得到视觉反馈】

用户点击按钮、触摸屏幕或按下键盘按键以后，如果下一次视觉反馈迟迟没有出现，就可能觉得页面卡住了、按钮没有点击成功，甚至重复执行操作。交互响应能力要回答的是：**页面能否及时处理输入，并让浏览器有机会呈现下一帧？**

INP 衡量用户一次页面访问中点击、触摸和按键交互的延迟，记录单次访问中最长或接近最长的交互延迟，作为该次页面的一个结果值。不是点击耗时的平均数，也不是所有交互累计之和。对交互次数很多的访问，为降低少量异常峰值的影响，INP 每 50 次交互可忽略一个最高延迟样本。线上对大量页面访问的 INP 再取第 75 百分位（移动端与桌面端分组），评估真实用户整体交互体验：≤200ms 良好，200～500ms 需要改进，>500ms 较差。[[1]](https://web.dev/articles/inp)

INP 与 FID（First Input Delay，首次输入延迟）的区别：FID 只测首次交互的输入等待；INP 观察整个页面生命周期内的交互，并包含等待、处理和下一帧呈现三个阶段，因此更能反映用户长期使用页面时是否会遇到慢交互。[[1]](https://web.dev/articles/inp)

INP 不统计所有交互方式：当前定义涵盖鼠标点击、触摸点击及键盘按键，但不直接以滚轮连续滚动、纯 Hover 或缩放作为 INP 样本。页面可能因这些操作卡顿，需要另外结合 Smoothness、Frame/LoAF 或具体业务埋点。没有发生符合条件的交互时，这次访问可能根本没有 INP 值；不能把“没有测得 INP”当成 0ms。[[1]](https://web.dev/articles/inp)

### 【主线一：用户输入经主线程和渲染流水线得到下一帧】

~~~text
用户发起点击 / 触摸 / 按键
       ↓
Input Delay（输入等待）
→ 主线程什么时候有机会开始处理？
       ↓
Processing Duration（事件处理耗时）
→ 交互关联的事件处理为什么需要这么久？
       ↓
Presentation Delay（呈现等待）
→ 事件处理结束以后，下一帧为什么还没有出来？
       ↓
Next Paint（下一次可呈现的画面）
       ↓
本次 Interaction Latency（交互延迟）

页面内记录多次 Interaction Latency
       ↓
选取最长或接近最长交互作为当前访问的 INP
       ↓
RUM 按版本、路由、设备、交互目标、加载阶段聚合 P75/P95
~~~

单次交互的时间拆分：

~~~text
Interaction Latency
= Input Delay
+ Processing Duration
+ Presentation Delay
~~~

这里三个阶段解释的是**一次被选中交互的总延迟**；INP 本身还涉及多事件分组与页面生命周期内选择最慢交互。直接计算“某个 click Event Handler 的执行时间”并不是完整 INP。

### 【主线二：用结果指标和原始证据追查问题】

~~~text
线上 INP P75 / P95 恶化
    ↓
定位受影响页面、版本、设备、网络与具体交互目标
    ↓
选出代表性的慢交互样本（Interaction ID / Target / Time）
    ↓
拆分 Input Delay / Processing Duration / Presentation Delay
    ↓
只进入新增耗时最大的阶段
    ├─ Input Delay：主线程任务竞争
    ├─ Processing Duration：事件回调与同步处理成本
    └─ Presentation Delay：状态更新、下一帧渲染与呈现
    ↓
关联 Event Timing / Long Task / LoAF / Trace / Framework Profiler
    ↓
形成候选根因并用同条件实验验证
    ↓
比较单次交互拆分和线上 INP 分位数
~~~

这条主线与 Loading → LCP 四阶段相对应，但不是同一个计时对象。Loading 以导航到主要元素绘制为主；Responsiveness 以一次用户交互到下一帧为主。

## 2. INP 三个阶段代表三类不同等待成本

### 【先确定每段的开始与结束条件】

| 阶段 | 起点 | 终点 | 主要问题 |
| --- | --- | --- | --- |
| Input Delay（输入等待） | 用户输入对应的交互时间 | 浏览器开始处理该交互关联的事件 | 输入已经发生，为什么事件迟迟不能开始处理？ |
| Processing Duration（事件处理时间） | 相关事件处理开始 | 关联事件回调处理结束 | 事件能够处理了，为什么处理链这么慢？ |
| Presentation Delay（呈现等待） | 事件处理结束 | 浏览器完成下一次可呈现的帧 | 处理结束，为什么用户还看不到更新？ |

例如某个很慢的交互：

| 阶段 | 假设耗时 | 该次交互占比 |
| --- | ---: | ---: |
| Input Delay | 420ms | 52.5% |
| Processing Duration | 80ms | 10% |
| Presentation Delay | 300ms | 37.5% |
| **Interaction Latency** | **800ms** | **100%** |

这里最主要的等待来自输入前的任务占用以及处理后的呈现等待，而不是点击函数本身。只有 80ms 的 Processing Duration 并不等于 80ms 的 INP。

**不能把这三段的 P75 加起来当成 INP P75。** 每次访问的交互可能不同、最慢交互也不同，分位数不可直接求和；应展示具体慢交互样本的三阶段拆分，或分别展示阶段分布，并明确口径。

### 【一次点击可能产生多个 Event，INP 的单位是 Interaction】

一个触摸点击通常可以对应 pointerdown、pointerup、click 等多个事件；按键可能对应 keydown、keyup 等事件。这些事件不是互不相关的独立“用户操作”：Event Timing 通过 interactionId 将属于同一个逻辑交互的相关事件联系起来。INP 所用的交互延迟涉及这组事件中最慢、决定响应完成时刻的过程，而不是只取一个 click 回调。[[1]](https://web.dev/articles/inp) [[2]](https://developer.mozilla.org/en-US/docs/Web/API/PerformanceEventTiming/interactionId)

因而在事件诊断时要区分：

~~~text
用户的一次操作（Interaction）
    ├─ pointerdown Event
    ├─ pointerup Event
    └─ click Event
    ↓
Event Timing Entries（按 interactionId 关联）
    ↓
浏览器下一次 Paint 时间
    ↓
Interaction Latency
~~~

如果这次交互所在的同一帧还处理了其他相关事件，单条 Entry 的处理时间和整个交互处理窗口也未必完全相同。这正是生产实现建议使用 Google 的 web-vitals Attribution、而不自行把某个事件的 processingEnd 减去 processingStart 当成整体 INP 的原因。[[3]](https://github.com/GoogleChrome/web-vitals)

### 【Event、Interaction 与 INP Metric 是三个不同的统计层次】

一个用户点击可以产生多个 DOM Event，但不意味着每次点击都产生一个独立的 INP 指标。必须先区分浏览器事件、逻辑用户交互和页面级结果：

~~~text
用户操作一次（例如点击按钮）
    ↓ 浏览器可能派发多个相关事件
pointerdown、pointerup、click
    ↓ 根据非零 interactionId 关联
一个 Interaction（逻辑用户交互）
    ↓ 从该交互相关的 Event Timing 记录确定响应延迟
一个 Interaction Latency（交互延迟）
    ↓ 页面生命周期内持续挑选最慢或接近最慢交互
一个页面导航测量周期的 INP Metric
    ↓ RUM 服务端按页面访问聚合
INP P75 / P95
~~~

**interactionId 是浏览器的事件关联 ID，而不是 web-vitals 生成的 INP 指标 ID。** 同一次鼠标点击所产生且可观察到的 pointerdown、pointerup、click 等相关事件，通常具有相同的非零 interactionId；用户之后再次点击，即使仍是同一按钮，也属于另一次逻辑交互，应使用另一个 ID。键盘交互也可能产生 keydown、keyup 等相关事件。实际输入事件序列、可观察的 Entry 数量因输入方式和浏览器实现而异。[[2]](https://developer.mozilla.org/en-US/docs/Web/API/PerformanceEventTiming/interactionId)

| 对象 | 标识 | 表达的含义 |
| --- | --- | --- |
| DOM Event | event.type、触发时间 | 浏览器派发的一个具体事件 |
| PerformanceEventTiming | name、startTime、duration 等 | 浏览器暴露的某个事件耗时记录 |
| Interaction | 非零 interactionId | 同一次用户操作关联的 Event Timing 记录 |
| INP Metric | metric.id | 一个导航测量周期内当前的 INP 结果实例 |
| RUM 页面访问样本 | Navigation / View / Session ID | 对多个用户页面访问进行统计的样本身份 |

示意：

~~~text
用户第一次点击 A：
pointerdown  interactionId=101
pointerup    interactionId=101
click        interactionId=101
        ↓
Interaction #101

用户第二次点击 A：
pointerdown  interactionId=108
pointerup    interactionId=108
click        interactionId=108
        ↓
Interaction #108
~~~

101、108 都只是假设数字。可靠的判断依据是浏览器返回的**非零 interactionId 相等**。不能通过两个事件时间接近、来自同一个 DOM 元素或事件名称相同自行合并。**interactionId 为 0 的事件不能统统归为同一次交互**；它不构成有效的交互归组键。对跨导航或跨浏览上下文的记录还必须结合 View / Navigation / 时间范围确定归属。

### 【同一个 Interaction 的多个事件时延不应相加】

对于一组同 ID 的 Event Timing，每条 Entry 可能具有自己的 startTime、processingStart、processingEnd 和 duration，且相关事件可能共享下一次绘制时机。

当前 web-vitals 的交互候选管理过程是：

1. 处理一个新的 Event Timing Entry，忽略无法成为交互候选的无效 interactionId；
2. 如果该 ID 对应已经存在的交互候选，则更新该交互，而不是创建另一次用户操作；
3. 如果新 Entry 的 duration 更大，则把该交互的代表延迟更新为更慢的值；等长且起点一致的相关 Entry 可一起保留以供归因；
4. 按交互延迟排序，仅维护最慢的一小组候选。

例如同一交互 ID=101 已观测到 80ms 的事件，后来又收到同 ID 的 160ms Entry，那么这次交互的候选延迟可能更新为 160ms。不能把 80+160 作为一次交互的耗时。当前实现使用 InteractionManager 以交互 ID 关联事件及其候选延迟。[[11]](https://github.com/GoogleChrome/web-vitals/blob/main/src/lib/InteractionManager.ts)

**并非每个 DOM Event 都会产生可通过 PerformanceObserver 读取的 Entry。** Event Timing 的默认观察门槛约为 104ms，可配置的最低 durationThreshold 为 16ms；web-vitals 当前默认观察阈值为 40ms，并对很快的首次交互作必要的兜底，避免低于阈值的页面完全没有数值。这些阈值是采集成本与精度的折中，不意味着短交互不存在。[[8]](https://developer.mozilla.org/en-US/docs/Web/API/PerformanceEventTiming) [[12]](https://github.com/GoogleChrome/web-vitals/blob/main/src/onINP.ts)

### 【页面 INP 从多次交互中挑选高位延迟，不计算所有事件的平均值】

假设一次页面访问发生如下交互：

| 交互 | 延迟 |
| --- | ---: |
| 点击菜单 | 45ms |
| 打开筛选 | 120ms |
| 输入关键词 | 60ms |
| 点击查询 | 650ms |
| 关闭弹窗 | 85ms |

由于交互次数较少，页面级 INP 通常为 650ms；不等于这些值的平均数，也不是五次之和。

当交互次数 N 较大时，为了避免极少数极端慢交互过度主导长时间使用的页面，INP 使用基于交互总次数的高位候选选择。当前 web-vitals 的估计索引（候选按延迟从高到低排列，索引从 0 开始）为：

~~~text
candidateIndex = floor(N / 50)

N=1～49    → 第 1 慢
N=50～99   → 第 2 慢
N=100～149 → 第 3 慢
~~~

这意味着第 50 次交互到来后，即使新的交互并不慢，代表值仍可能从第 1 慢变成第 2 慢，**INP 候选可能降低**。实际实现保留有限的最慢候选列表，但仍通过浏览器维护的交互总数决定选择哪一个，不需要把用户所有点击事件完整存储。[[1]](https://web.dev/articles/inp) [[11]](https://github.com/GoogleChrome/web-vitals/blob/main/src/lib/InteractionManager.ts)

最后还存在第二层聚合：每次有效页面导航测量周期产生一个页面级 INP 样本，服务器收集大量页面访问后再按 Version、Route、Device 等计算 INP P75 / P95。把不同用户每次点击的 Event Duration 全部混在一起求 P75，得到的并不是官方 Core Web Vitals INP。若需要每一个按钮的完整延迟分布，必须另建交互级的事件采样统计。

## 3. Input Delay 诊断的是输入发生时主线程为什么不能及时处理

### 【Input Delay 是处理开始前的等待，不是事件处理函数的成本】

用户已经发出输入，但浏览器还未能开始分发对应事件，此时发生 Input Delay。

~~~text
正在执行某个任务
    ↓
用户点击按钮
    ↓
该任务尚未结束，主线程不能及时处理新事件
    ↓
旧任务完成 / 调度获得机会
    ↓
Click 相关事件处理开始
~~~

输入等待异常时，优先关注**输入时刻正在占据主线程的工作**，而不是立即修改点击 Handler。Google 明确将脚本加载与执行、网络响应回调、定时器和其他交互产生的任务列为需要诊断的候选来源。[[4]](https://web.dev/articles/optimize-input-delay)

### 【Input Delay 异常的三个上位原因及工程方向】

#### <u>1. 页面初始化与非关键 JavaScript 占据主线程</u>

- **现象**：页面内容已经显示，但用户在页面刚打开后点击菜单时没有立即响应。
- **机制**：浏览器还在执行大型 JS Bundle 的解析/编译/求值、框架初始化、Hydration 或非关键模块初始化。视觉上“已经加载”并不代表主线程空闲。
- **证据**：INP 对应交互的 loadState 位于加载期间；Trace 在输入时间之前出现大型脚本 Task；同类页面加载期与空闲期的 Input Delay 明显不同。
- **优化方向**：减少初始不必要 JS，延迟非关键初始化，按需分包或动态加载，优先完成页面主要交互所需的代码。
- **取舍**：延迟关键业务脚本可能损伤功能可用性；减少 Bundle 字节数不必然等于执行成本下降，必须对照 Main Thread 工作量验证。

#### <u>2. 后台任务与第三方代码抢占主线程</u>

- **现象**：即使用户正在使用页面，Analytics、定时器、WebSocket 消息处理、批量数据转换或第三方 SDK 仍持续占用主线程。
- **机制**：浏览器在任务执行中通常不会自动打断同步 JS，输入只能等待当前工作完成；微任务链若持续追加工作，也可能推迟下一次事件处理或绘制机会。
- **证据**：Trace 同时间窗口的 Task 和 Call Tree、JS 脚本来源、定时器与消息回调；Long Task 作为初步阻塞信号；LoAF 可提供更细脚本证据。
- **优化方向**：减少与当前用户交互无关的持续工作、控制工作频率、把大计算拆成可让出主线程的批次，适当调度到空闲时段或 Worker。
- **取舍**：主线程让出后可能改善 Input Delay，但频繁切任务会增加总开销；必须保证关键任务进度、用户状态与消息顺序的正确性。

#### <u>3. 连续或重叠交互造成任务排队</u>

- **现象**：快速点击、连续输入或多个组件高频事件使事件处理不断排队。
- **机制**：前一次操作可能安排较重的状态提交，后一次输入到达时主线程仍在执行；或者多个交互在同一渲染帧中竞争。
- **证据**：Event Timing 的时间线、interactionId、连续输入间隔与 Event Handler 处理时间。
- **优化方向**：减少每次输入需要同步完成的工作；搜索联想等业务按需求引入 Debounce / Throttle、取消过期请求；关键反馈优先、非关键计算适度推迟。
- **取舍**：防抖/节流会改变业务触发频率和时效，不能无差别用于提交、确认等必须响应的操作；防抖也不意味着自动改善本次输入到下一帧的时延。

### 【Input Delay 阶段的判断】

若 INP=720ms，其中 Input Delay=510ms、Processing=40ms、Presentation=170ms，则首先应到 **点击发生时刻之前** 的 Main Thread 时间轴查被占用的任务，不应从“click Handler 仅执行 40ms”推导出没有交互性能问题。

Long Task（长任务）有助于识别单个持续约 50ms 或以上的主线程任务，但没有 Long Task 也不能证明不存在输入竞争，例如多个较短任务或调度时机同样可能导致等待。[[5]](https://developer.chrome.com/docs/web-platform/long-animation-frames)

## 4. Processing Duration 诊断的是事件处理本身的工作为什么过重

### 【处理时间不等于整个业务操作耗时】

Processing Duration 从相关事件处理开始到对应的回调处理完成。一个逻辑交互可能包含多个事件回调、多个监听器、同步计算与需要在当前任务内完成的微任务；不能只拿一个 handler 的单次函数 Self Time 代表全部处理时间。

~~~text
主线程开始处理交互
    ↓
事件分发与业务回调
    ↓
同步参数校验 / 数据计算
    ↓
更新业务状态与触发相关同步工作
    ↓
相关事件处理完成
~~~

它既不直接包含尚未完成的异步 HTTP 请求等待，也不等于浏览器之后完成布局、绘制的时间；后者属于 Presentation Delay 或其他业务完成时延。Google INP 归因明确使用 Processing Duration 作为事件处理阶段。[[6]](https://web.dev/articles/optimize-inp)

### 【Processing Duration 异常的四个上位原因及工程方向】

#### <u>1. 事件处理里同步计算过重</u>

- **现象**：点击筛选按钮后，Handler 同步遍历十万条记录、排序、格式化或汇总。
- **证据**：DevTools Performance 中点击函数及其子调用占主要耗时；CPU Profiling、Bottom-up / Call Tree 指向明确的计算函数。
- **优化类型**：业务计算治理。减少不必要的遍历与重复计算、缓存真正稳定的计算结果、优化算法与数据结构；可独立处理且不依赖 DOM 的重计算考虑 Worker。
- **边界**：不要因为存在循环就推断其很慢；必须以实际数据规模、调用次数与 Trace 证明。Worker 还涉及序列化与传输成本。

#### <u>2. 一次操作触发过宽的框架状态更新</u>

- **现象**：只修改一个筛选项，却触发大量无关组件响应式更新、Watcher 或昂贵计算。
- **证据**：Vue / React Profiler 指出更新组件范围；JS Trace 显示组件计算和 Render Work；DevTools Rendering 显示 DOM 更新。
- **优化类型**：组件与状态依赖治理。缩小状态影响范围、稳定 Props、精简无关订阅、避免无意义全量重算、列表虚拟化。
- **边界**：框架更新可能一部分发生在事件处理期间，一部分发生在后续渲染阶段。因此应看实际时间分布，而非预设所有响应式成本都归为 Processing。

#### <u>3. 强制同步布局混入事件处理</u>

- **现象**：Handler 修改 DOM 样式，立即读取 getBoundingClientRect / offsetHeight，循环多次迫使浏览器同步计算布局。
- **证据**：Trace 中 Forced Reflow / Layout 紧挨着脚本执行；LoAF scripts 中可能出现 forcedStyleAndLayoutDuration。
- **优化类型**：DOM 读写组织。先批量读取，再计算和写入；减少不必要的同步尺寸测量和布局依赖。
- **边界**：Style / Layout 并非天然只属于 Presentation Delay；如果被同步 JS 强制触发，也会体现在处理路径里。

#### <u>4. 多层事件回调或同步依赖链过长</u>

- **现象**：一次点击通过多个监听器、表单验证、同步存储、插件回调和多重状态派发持续占用当前处理窗口。
- **证据**：Event Timing 对应同一 Interaction 的多个 Event / Listener；Call Tree、火焰图与框架 Profiler。
- **优化类型**：事件链路治理。合并重复工作、移除无效监听器、把不影响第一帧反馈的后续操作推迟。
- **边界**：并不是越短越好。有些操作需要保持原子性或严格顺序，拆分任务不能破坏事务一致性和用户期望的即时状态。

### 【Promise 和 async/await 不能自动解决主线程阻塞】

await 真正未完成的异步任务时，JS 执行可以让出当前调用栈；但是以下两种情况仍可能阻塞绘制：

- 在 await 之前先做大量同步计算；
- 用持续的 Promise 微任务链立即执行大量后续计算，让浏览器迟迟没有机会绘制。

因此不能机械地把同步函数加上 async，或把工作移入 Promise.then，就宣称解决 INP。真正有价值的是减少当前必须完成的工作、适度让出主线程和保持视觉反馈及时。[[7]](https://web.dev/articles/optimize-long-tasks)

## 5. Presentation Delay 诊断的是事件处理后为什么迟迟不出现下一帧

### 【事件回调结束，并不代表画面已经更新】

Presentation Delay 从相关事件处理完成，到浏览器下一帧可以呈现为止。它可能包括仍需执行的微任务、requestAnimationFrame 回调、ResizeObserver 相关工作、框架更新、Style / Layout、Paint / Composite / Raster 等；并不只是 Paint 函数的单次耗时。官方 web-vitals Attribution 也将部分主线程外的呈现成本纳入 Presentation Delay。[[3]](https://github.com/GoogleChrome/web-vitals)

~~~text
事件处理结束
    ↓
微任务与待处理视觉更新
    ↓
rAF / 框架状态提交
    ↓
浏览器样式、布局与绘制工作
    ↓
合成 / 栅格化 / 呈现
    ↓
下一帧可以展示
~~~

**注意：requestAnimationFrame 在绘制前执行**。如果把很重的计算挪进 rAF，它仍然可能阻挡这一帧，并不一定改善 INP。

### 【Presentation Delay 异常的四个上位原因及工程方向】

#### <u>1. 状态变化触发了过大的 DOM 或组件渲染范围</u>

- **现象**：点击一个开关导致整页大型列表重绘；仅展开一个面板，却要处理数千个节点。
- **证据**：Framework Profiler 指向不必要的更新组件；DevTools Rendering 显示 DOM 数量、Layout / Paint 花费。
- **优化类型**：受影响工作集合治理。收窄组件更新范围、稳定状态依赖、虚拟化列表、拆分非首要更新。
- **边界**：Vue/React 的状态更新不保证立即产生绘制；组件渲染结束、DOM Mutation 完成和用户看到画面是不同时间点。

#### <u>2. 布局与绘制本身的计算量过大</u>

- **现象**：一次交互导致整页重排、复杂样式重计算或大面积 Paint。
- **证据**：Chrome Performance 的 Recalculate Style / Layout / Paint；DOM 规模；受影响元素范围、Paint 和 Layer 轨道。
- **优化类型**：浏览器渲染路径治理。缩小布局影响范围、控制 DOM 规模、减少不必要的复杂视觉效果和同步几何测量，按实际情况考虑 CSS containment 或内容可见性。
- **边界**：不能把所有 Layout / Paint 都归因于 DOM 太大；先确认热点是元素数量、样式依赖、几何关系还是绘制工作。[[6]](https://web.dev/articles/optimize-inp)

#### <u>3. 提交工作之前还有其他同步任务和微任务</u>

- **现象**：事件处理逻辑结束后，仍有 Promise 回调、Watcher、rAF、观察器或第三方脚本占据下一帧前的执行机会。
- **证据**：Performance Trace 的任务顺序、微任务、rAF 回调、LoAF script attribution。
- **优化类型**：绘制机会治理。让第一帧只完成必要、可感知的更新，把复杂后续工作放到不会阻塞首次反馈的时机；使用合理的 Scheduler / Task Yield 机制。
- **边界**：setTimeout 或 scheduler.yield 可以创造让步机会，但具体何时绘制取决于浏览器调度；把重要状态操作粗暴延迟可能让用户看到不一致状态。

#### <u>4. 合成、栅格化与复杂动画成本</u>

- **现象**：一次交互涉及 Canvas、大面积过滤效果、多层图层或复杂渲染区域，即使 JS Handler 较短仍迟迟不显示。
- **证据**：Performance Trace 的 Render / GPU / Compositor 相关记录；LoAF 的 renderStart、styleAndLayoutStart 与 Script Attribution。
- **优化类型**：渲染工作治理。减少一次更新影响的像素和元素，针对真实热点控制 Canvas 重绘量、避免昂贵的样式效果、验证合成策略。
- **边界**：LoAF 的存在表示长动画帧，并不直接说明一定是 Paint/Compositor 导致，必须继续区分脚本、样式布局和帧末等待。

### 【呈现阶段的关键反例】

~~~text
INP = 850ms
Input Delay = 80ms
Processing Duration = 70ms
Presentation Delay = 700ms
~~~

这一组数据无法用“click handler 很慢”解释。应该优先查处理结束到下一帧之间的任务和渲染更新，确认是组件树扩散、布局、绘制，还是 rAF/微任务阻塞。只有针对这一段减少成本才可能直接改善本次交互的延迟。

## 6. Long Task、LoAF、Event Timing 和 Trace 分别承担不同层次的证据

### 【Event Timing 帮助测量“哪个用户交互慢了”】

PerformanceEventTiming 是 Event Timing API 的主要原始记录。关键字段：

| 字段 | 含义 | 作用 |
| --- | --- | --- |
| startTime | 对应事件被记录的时间，近似输入发生时刻 | 测量输入起点 |
| processingStart | 浏览器开始分发该事件的时间 | 推断事件级 Input Delay |
| processingEnd | 该事件分发处理结束时间 | 推断事件级处理耗时 |
| duration | 事件到下次绘制机会的耗时（存在计时量化） | 事件级总延迟 |
| interactionId | 把同一用户操作的相关事件联系起来 | 构建交互级数据 |
| name | 事件类型（例如 click、keydown） | 判断输入种类 |

对单条 Event Timing Entry 可直观计算：

~~~text
eventInputDelay = processingStart - startTime
eventProcessing = processingEnd - processingStart
approxEventPresentation = startTime + duration - processingEnd
~~~

但是这只是**单个事件级的近似拆分**。duration 时间精度存在量化、一个交互可能涉及多条 Event Entry，最终 INP 也并不等于某一条事件的简单相减。生产环境应该优先使用规范实现。Event Timing 观察器默认只提供 duration 达到约 104ms 的事件，可以设置 durationThreshold，最小为 16ms；浏览器支持情况和 first-input 等兜底也需要处理。[[8]](https://developer.mozilla.org/en-US/docs/Web/API/PerformanceEventTiming) [[1]](https://web.dev/articles/inp)

~~~js
// 原始诊断示意：不是完整 INP 计算器。
const observer = new PerformanceObserver((list) => {
  for (const entry of list.getEntries()) {
    if (entry.interactionId > 0) {
      console.log({
        eventType: entry.name,
        interactionId: entry.interactionId,
        start: entry.startTime,
        inputDelay: entry.processingStart - entry.startTime,
        processing: entry.processingEnd - entry.processingStart,
        duration: entry.duration
      });
    }
  }
});

observer.observe({
  type: 'event',
  durationThreshold: 16,
  buffered: true
});
~~~

这段代码的主要价值在于理解数据来源：浏览器产生 Event Timing Entry → SDK 订阅 → 按 interactionId 关联。它不会自行还原完整 INP 的异常值处理、跨帧/多事件规则、页面隐藏结算及 iframe 边界。

### 【原生 Event Timing API 的三个阶段如何计算】

浏览器通过 PerformanceObserver 观察 event Entry 后，提供 PerformanceEventTiming 的下列时间字段：

| 字段 | 意义 | 诊断阶段 |
| --- | --- | --- |
| startTime | 输入事件发生时刻 | Input Delay 起点 |
| processingStart | 开始分发这条事件 | Input Delay 终点、Processing 起点 |
| processingEnd | 结束分发这条事件 | Processing 终点、Presentation 起点 |
| duration | 事件发生到下一次绘制的近似耗时（存在量化） | 估算 Presentation 终点 |
| interactionId | 浏览器给同一次用户操作的事件标识 | 关联 Event Entries |

对**单条 Event Timing Entry**，可以得到：

~~~text
eventInputDelay = processingStart - startTime
eventProcessing = processingEnd - processingStart
eventPresentation ≈ startTime + duration - processingEnd
~~~

假设 startTime=100ms、processingStart=180ms、processingEnd=250ms、duration=240ms，则单条事件的输入等待约 80ms、事件处理约 70ms、呈现等待约 90ms，合计近似 240ms。这里 duration 受到计时精度量化影响，因此必须明确是事件级近似值。

最小事件归组代码：

~~~js
// 仅用于理解原始数据和 interactionId，不能直接投产作为 INP 计算器。
const groups = new Map();

const observer = new PerformanceObserver((list) => {
  for (const entry of list.getEntries()) {
    const id = entry.interactionId;
    if (!id) continue;

    const sample = {
      eventType: entry.name,
      startTime: entry.startTime,
      duration: entry.duration,
      inputDelay: entry.processingStart - entry.startTime,
      processingDuration: entry.processingEnd - entry.processingStart,
      approximatePresentationDelay:
        entry.startTime + entry.duration - entry.processingEnd
    };

    if (!groups.has(id)) groups.set(id, []);
    groups.get(id).push(sample);
    console.log('Interaction', id, groups.get(id));
  }
});

observer.observe({
  type: 'event',
  buffered: true,
  durationThreshold: 16
});
~~~

这个演示直接说明如何以浏览器的 ID 而不是点击目标或事件时间进行归组。**线上 SDK 不能把不清理的 Map 一直保留在内存**；需要采样、容量控制和回收，还要处理页面生命周期与隐私。

**为什么它不等于最终 INP 三阶段？**

第一，一次 Interaction 可能包含多个 Entry，事件级公式无法直接决定整个交互的处理窗口。第二，当前 web-vitals 的 attribution 实现除了按 interactionId 确定候选，还可能按接近的呈现时刻把同一帧的 Event Timing 汇总起来，取该帧的最早处理起点和最晚处理终点来计算阶段。第三，浏览器 duration 有时间精度量化，可能出现不合理的边界，库还会作非负钳制和异常处理。因此一次交互的正式 Attribution 与单条 click Entry 直接相减不一定完全相同。[[13]](https://github.com/GoogleChrome/web-vitals/blob/main/src/attribution/onINP.ts)

**生产监控建议**：Event Timing 原生 Entry 用来解释事件归组与定位执行过程；正式 INP 及其 Input Delay、Processing Duration、Presentation Delay 优先使用 web-vitals/attribution，避免自己重复实现交互候选和帧级归因规则。

### 【Long Task 只描述“单段主线程工作长”，不能直接解释是哪段 INP】

Long Task API 检测到约 50ms 或以上的主线程长任务，可提供 startTime、duration 与有限 attribution。可以帮助判断 Input Delay 是否被已有任务阻塞，也可能与处理或呈现阶段重叠。

~~~text
用户输入恰好落在 Long Task 执行期间
→ Input Delay 有被阻塞的候选证据

点击 Handler 本身存在很长的同步 Task
→ Processing Duration 可能较高

事件处理结束后存在其他长任务
→ 下一帧呈现可能继续推迟
~~~

但“同一 View 存在 Long Task”不等于它就是这次 INP 的原因，必须核对时间是否重叠，以及具体 Task 是否处在交互关键路径上。[[5]](https://developer.chrome.com/docs/web-platform/long-animation-frames)

### 【LoAF 观察的是整个慢帧，更利于区分脚本和渲染】

Long Animation Frames API 对超过 50ms 的长帧产生 long-animation-frame Entry，可能提供：

- duration / blockingDuration：长帧总耗时、阻塞贡献；
- renderStart / styleAndLayoutStart：渲染、样式和布局的时间边界；
- scripts：脚本来源、执行时刻、关联函数、强制样式布局时间等。

LoAF 不等于 Long Task：一帧可能被多个短任务和渲染工作共同拖慢，没有任何单个 50ms Long Task 仍然可能产生长帧。LoAF 也不等于 INP；一个慢帧可以出现在无人交互的动画中，INP 关注与特定用户交互关联的下一帧响应。[[5]](https://developer.chrome.com/docs/web-platform/long-animation-frames)

浏览器支持不足、Entry 没有捕捉到或没有关联到 LoAF，并不意味着 INP 健康；还需要结合 Event Timing 与 DevTools Performance Trace 判断。

### 【Performance Trace 和框架 Profiler 用于确认具体工作】

- **Chrome Performance**：将 Interaction、Main Thread、JS、Microtask、Style、Layout、Paint 和帧绘制放在同一时间线上，解释具体阶段为何慢。
- **Bottom-up / Call Tree**：找到在相关时间窗口内消耗时间最多的函数，注意 Total Time 与 Self Time 的区别。
- **Vue / React Profiler**：检查某次状态变化具体更新了哪些组件、耗费了什么框架工作。
- **业务 Trace / User Timing**：补充自动浏览器指标无法解释的具体业务步骤，例如前端搜索计算、业务渲染启动等。

阶段归因从 Event Timing 定位交互开始，再用 LoAF / Trace 找函数、组件或渲染工作；后者不能代替前者直接给出标准 INP 值。

## 7. INP 的采集与 Attribution 应复用官方指标实现

### 【web-vitals/attribution 提供单次慢交互的三阶段结果】

GoogleChrome/web-vitals 的 Attribution 版本提供 onINP，可获得 INP metric.value 及 attribution 对象。主要诊断字段包括：

| 属性 | 说明 | 主要用途 |
| --- | --- | --- |
| inputDelay | 从交互到事件开始处理的等待 | 主线程是否被其他工作占据 |
| processingDuration | 本次交互的事件处理时间窗口 | Handler / Framework / 同步工作 |
| presentationDelay | 处理结束到下一帧呈现 | 渲染与帧提交 |
| interactionTarget | 被归因的交互目标 | 定位按钮/输入框/组件 |
| interactionType | Pointer 或 Keyboard 类型 | 判断输入类型 |
| interactionTime | 交互发生时间 | 与 Trace / Event 关联 |
| nextPaintTime | 下一次呈现的时间（可选） | 完整时间线 |
| loadState | 交互发生时的文档加载状态 | 区分加载期间和稳定运行期间 |
| longAnimationFrameEntries | 与交互重叠的 LoAF 数据（可能为空） | 长帧及脚本归因 |
| longestScript、totalStyleAndLayoutDuration 等 | 在可用时提供额外摘要 | 更细粒度脚本/渲染归因 |

部分字段可能不存在或随依赖版本变化；不能假设所有浏览器的 LoAF、sourceFunctionName 都可用。可选的 processedEventEntries 默认可能不会填充，以避免存储过多相关事件记录。[[3]](https://github.com/GoogleChrome/web-vitals)

~~~ts
import { onINP } from 'web-vitals/attribution';

// 仅演示指标拆分，不等于可直接投产的完整监控 SDK。
onINP((metric) => {
  const attribution = metric.attribution;

  const sample = {
    name: metric.name,
    value: metric.value,
    id: metric.id,
    phases: {
      inputDelay: attribution.inputDelay,
      processingDuration: attribution.processingDuration,
      presentationDelay: attribution.presentationDelay
    },
    interactionTarget: attribution.interactionTarget,
    interactionType: attribution.interactionType,
    interactionTime: attribution.interactionTime,
    loadState: attribution.loadState,
    // 上报前要做 URL / DOM Selector 隐私过滤和字段裁剪。
  };

  console.log(sample);
});
~~~

该代码解决了“一次页面访问的 INP 结果如何附带三段归因”的问题。还需要处理上下文关联、采样策略、事件重复报告、页面后台化结算和上报成本，不宜将回调触发次数直接当作新的页面访问数。

### 【为什么不建议手写完整 INP 计算】

手写从 Event Timing 到 INP 需要处理：

1. 一次交互含多个 Event Entry，需正确分组和选择候选；
2. 事件条目的 duration 存在精度量化和 durationThreshold 限制；
3. 极高交互次数的异常值规则；
4. 页面失去可见性、长时间停留和页面退出时如何结算；
5. 从 bfcache 恢复后按照新的页面访问处理；
6. 跨源 iframe 交互可能计入用户体验，但父文档 JS 无法直接读取其内部 Event Entry；
7. 浏览器和库版本差异，字段可能缺失。

官方 web.dev 明确建议利用 web-vitals 规避大多数这些边界；对于 iframe 的可观测限制仍需单独说明。[[1]](https://web.dev/articles/inp)

## 8. INP 与业务响应、加载期交互和持续流畅度存在重要边界

### 【INP 不是 API 请求完成时间，也不是业务任务成功时间】

例如用户点击“提交”：

~~~text
用户点击提交
    ↓ 事件与第一帧很快完成
按钮显示“提交中”（INP 可能已经结束）
    ↓
HTTP 请求 900ms 后返回
    ↓
页面显示最终成功
~~~

INP 测的是点击到下一帧可见反馈的等待，不包含所有随后异步结果。如果页面没有及时显示任何反馈，或者只让同步任务一直阻挡绘制，INP 就可能变差；但如果立即渲染了明确、真实的进行中状态，INP 可以很好，同时业务完成耗时仍需单独衡量。[[1]](https://web.dev/articles/inp)

建议分两类指标：

- 标准交互响应：INP、三阶段 Attribution、具体慢交互对象；
- 业务任务完成：用户提交 → 收到真实结果、首批搜索结果到达、AI 首个有效响应、最终任务成功等由业务定义的时延与正确性。

不能通过伪造“成功”来追求更低 INP；第一帧应该给出真实、清晰的进行中反馈，最终结果仍要正确验证。

### 【加载期间的交互与 Hydration 会相互影响】

用户可能在页面 LCP 已完成、Hydration 或非关键 JS 尚在运行时点击按钮。此时即使加载体验良好，Input Delay 仍然可能很高。

~~~text
HTML 与首屏内容已经可见
    ↓
大量 JS / Hydration 继续占据主线程
    ↓
用户点击某个按钮
    ↓
Input Delay 增大
~~~

因此 Loading / LCP 与 Responsiveness / INP 不能互相代替：SSR 提前显示首屏可以改善 LCP，却不自动证明客户端已经恢复良好交互。可对 INP 按 loadState / 导航后时间段分组，判断慢交互集中于加载期还是长期运行阶段。

### 【SPA 路由、标签页生命周期与 INP 数据归属】

在传统 SPA 中，客户端 Router 切换页面不会创建新的主 Document；没有特殊软导航测量能力时，页面访问级 INP 的生命周期不能简单按每一次路由 change 重新定义成标准 INP。监控可以把具体慢交互归属到其发生时的 Route / View，做业务路由级分析，但需要区分“文档访问级标准 INP”和“自定义单路由交互指标”。

Chrome 新的 Soft Navigation 支持及 web-vitals 对软导航的支持，会改变部分统计口径，应该按具体浏览器、库版本与能力标记，不应将硬导航与软导航样本直接混合。[[3]](https://github.com/GoogleChrome/web-vitals)

对于长驻页面，用户可能持续使用几十分钟甚至更久；不要只在 unload 时上报，页面隐藏/后台化时应及时结算当前测量值。若页面根本没有符合标准的交互，应保留“没有可报告 INP”的状态，而不是强制写入 0。

### 【INP 与持续渲染 Smoothness 的边界】

拖拽、滚动、地图动画等连续变化是否流畅，需要观察 Frame / LoAF / 队列等指标；一次点击是否快速给出下一帧反馈属于 INP。页面可能“FPS 稳定但点击卡”，也可能“点击响应快但连续轨迹掉帧”。两者相互关联，却不能互相替代。

这部分通用机制继续衔接 [页面流畅度与连续渲染性能完整知识体系](../Y-页面流畅度与连续渲染性能完整知识体系.md)，其 Frame / Queue / History 深度分析不在这篇交互响应稿重复。

## 9. 线上 RUM 的 Context 必须将 INP 关联到具体交互和执行证据

### 【仅有 INP 数值无法定位哪一个按钮或状态有问题】

单条 INP 上报至少需要能回答：

~~~text
在哪个 App / Version？
在哪个 Route / View？
发生在什么设备、浏览器、网络条件？
用户当时正在加载还是稳定使用？
是哪种操作，目标元素是什么？
交互发生在什么时候？
三阶段时间各是多少？
有没有关联 Long Task / LoAF / 代码 Trace？
~~~

通用的示意事件：

~~~json
{
  "type": "performance",
  "name": "INP",
  "value": 760,
  "unit": "ms",
  "context": {
    "app": "example-web",
    "version": "2.4.1",
    "route": "/dashboard",
    "viewId": "view-demo-1",
    "navigationType": "navigate",
    "deviceClass": "mobile",
    "sessionId": "session-demo-1"
  },
  "attribution": {
    "interactionType": "pointer",
    "interactionTarget": "button[data-action=apply-filter]",
    "inputDelay": 420,
    "processingDuration": 90,
    "presentationDelay": 250,
    "loadState": "complete"
  }
}
~~~

只是协议设计示例，不代表任何现有项目已经按这个格式实现。

**Privacy / Security**：不要未经处理上传输入值、用户账号、DOM 文本、包含 Token 的 URL、敏感 CSS Selector 或可以反推出隐私的业务参数。interactionTarget 推荐只保留预先允许的稳定语义标记或脱敏选择器。

**Context 时间一致性**：事件属于发生当时的路由与视图。SPA 路由可能在指标结算前已经改变，不能结算时才读取“当前路由”然后把过去交互错误归给新页面。应在原始事件产生时保存 Route / View / Timestamp 的归属信息。

**Sampling**：既要获得总体真实用户的代表性，又要能对慢交互做有限额的增强归因。若只上报异常用户、不记录正常样本，不能直接把该样本集合的 P75 当作所有用户的 P75。

**Aggregation**：每次 Document 访问的最终 INP 需要去重；对报告过的候选更新应处理 metric.id / delta / 终态，不应把同一访问的每一次候选提升当作独立访问样本。按 Route / Version / Device / Browser / Load State 聚合时，要明确对应的是“整次访问 INP”还是“某次特定交互延迟”。

## 10. 诊断决策树从三段耗时导向最有证据的优化类别

### 【交互异常先锁定哪个操作，再判断慢在哪个阶段】

~~~text
线上 INP 变差
    ↓
按 Version / Route / Device / 浏览器 / 样本量缩小范围
    ↓
识别慢交互
Interaction Target / Type / Time / Load State
    ↓
对这次交互拆分三个阶段
    │
    ├─ Input Delay 增大
    │   → 在输入之前找主线程任务竞争
    │   → Main Thread / Long Task / LoAF / 第三方脚本
    │   → 减少非关键同步任务，改善调度机会
    │
    ├─ Processing Duration 增大
    │   → 查事件 Handler 和同步工作
    │   → Call Tree / CPU Profile / Framework Profiler
    │   → 优化同步算法、数据规模、监听器、状态范围
    │
    └─ Presentation Delay 增大
        → 查处理后到下一帧的渲染机会与工作
        → Layout / Paint / rAF / LoAF / Component Commit
        → 减少每帧 DOM/Render 成本、先给必要反馈
    ↓
定位单个或一组可证伪的候选根因
    ↓
同条件只改变一个主要因素
    ↓
比较对应阶段、总交互时延以及其他体验指标
    ↓
回到真实用户 RUM P75 / P95 验证
~~~

阶段名称**只是指路标，不是根因证明**。例如 Input Delay 高，可能与图片加载完后的 JS 初始化有关，但不能因此把网络下载时间当成直接输入等待。必须看到实际主线程执行任务与输入时刻的重叠。

### 【同一个现象下的完整排查案例】

假设线上显示新版本某个筛选按钮的慢交互显著增加。单次代表样本（不是 P75 子指标）：

| 阶段 | 旧版样本 | 新版样本 | 增加 |
| --- | ---: | ---: | ---: |
| Input Delay | 40ms | 380ms | +340ms |
| Processing Duration | 65ms | 80ms | +15ms |
| Presentation Delay | 55ms | 260ms | +205ms |
| **Interaction Latency** | **160ms** | **720ms** | **+560ms** |

第一步，新增等待主要在 Input Delay，其次是 Presentation Delay，不能先断言筛选函数本身很慢。

第二步，结合交互发生时刻查询 Trace，假设发现一个同步数据预计算任务从点击之前就开始执行，持续约 400ms。此时它成为合理的 Input Delay 候选根因。

第三步，暂时关闭这段非关键计算或将其拆解并重新测量：如果点击等待显著下降，支持“主线程竞争造成大部分输入延迟”的因果解释。

第四步，Presentation Delay 也增加较多。继续看组件更新树和 Layout / Paint，假设发现筛选使全部结果行重新创建，适合检查更新范围、列表虚拟化或增量渲染。

第五步，在相同设备、网络、数据量和操作步骤下比较 INP 三阶段；再发布回真实用户，比较版本、设备、路由、交互目标的分布和总体 P75。这里的数字和根因均为方法演示，不能当成已验证的线上事故。

## 11. INP 优化需要同时保证用户反馈、业务正确性与执行成本

### 【先显示反馈，后处理非紧急工作，不等于掩盖业务时延】

对于确实需要几百毫秒甚至几秒的业务操作，可以在可保证正确性的前提下先显示明确的“处理中”或渐进反馈，随后继续处理耗时工作。例如：

~~~text
用户点击“执行分析”
    ↓
快速更新按钮状态为“运行中”
    ↓
浏览器获得绘制机会
    ↓
执行非紧急计算或等待接口
    ↓
收到真实结果
    ↓
显示成功 / 失败 / 重试入口
~~~

这样可能改善交互响应，但不能把 Loading 状态当作任务真正完成，业务操作时延和结果正确性仍需另行度量。

为了让第一帧真的出现，需要避免在修改状态后立刻继续执行同样漫长的同步任务或微任务链；仅调用 requestAnimationFrame、Promise.resolve 或给函数加 async 关键字，并不会自动保证浏览器已经完成 Paint。[[7]](https://web.dev/articles/optimize-long-tasks)

### 【优化方案要同时评估副作用】

- 任务拆分会引入让步与调度开销、并发状态变化；需要保持必要的计算顺序和数据一致性。
- Worker 可以转移独立计算，但不能直接更新 DOM，还需支付消息传递和数据复制/转移成本。
- 输入防抖可能降低重复请求，却可能使用户更晚看见最终结果；不能替代即时的真实视觉反馈。
- 虚拟列表改善渲染规模，但需要处理滚动定位、动态高度、键盘可访问性等边界。
- 代码延迟加载可能减少启动抢占，但若首次点击时才加载必要模块，可能使首次交互体验变差。
- 不必要的动画和占位更新可能改善某一次 INP，却造成 CLS、视觉闪烁或操作状态不可信。
- 监控 SDK 自身的事件监听、采样、序列化与上报也会使用主线程，不能增加显著的交互阻塞。

## 12. 交互响应优化最终形成可复现且可迁移的验收闭环

### 【Lab 用于确认因果，Field 用于评价实际用户改善】

**Lab 验证**先固定路由、版本、设备等级、CPU、数据规模、操作目标及加载/空闲阶段；用 Chrome Performance Trace 与 Web Vitals 判断三个阶段的变化。特别应模拟页面加载过程中点击的情况，因为此时可能存在大量初始化脚本，只有加载完成后再测试会漏掉真实问题。[[1]](https://web.dev/articles/inp)

**Field 验证**应观察同类真实访问中 INP P75 / P95、问题交互出现频率、不同设备分布、浏览器支持率和业务操作成功率；若交互目标样本结构改变，要明确统计口径，不把不同操作混合后产生的变化简单归因于某段代码。

~~~text
线上检测 INP 回归
    ↓
确定最慢交互和出现的上下文
    ↓
对该交互拆解三阶段
    ↓
用 Event Timing / Long Task / LoAF / Trace 定位候选瓶颈
    ↓
通过受控实验验证具体根因
    ↓
缩短高成本阶段，保留必要业务反馈
    ↓
Lab 三段耗时与总交互时延回归
    ↓
发布后 Field P75 / P95 + 业务结果回归
    ↓
设置长期性能预算和诊断反馈
~~~

### 【与 Loading 的统一结构】

| 体验维度 | 核心结果指标 | 诊断主线 | 典型上位问题 |
| --- | --- | --- | --- |
| Loading（加载体验） | LCP | TTFB → Load Delay → Load Duration → Render Delay | 文档交付、资源发现、资源获取、元素呈现 |
| Responsiveness（交互响应） | INP | Input Delay → Processing Duration → Presentation Delay | 主线程竞争、事件处理、下一帧呈现 |

**最终结论**：INP 高并不必然说明点击事件本身慢。先定位慢在哪一次交互、哪一个阶段，再把 Input Delay 对应到主线程调度、Processing Duration 对应到处理链与同步工作、Presentation Delay 对应到帧呈现与渲染工作。只有同时拿到时间关联、原始执行证据和实验结果，才能从“交互卡顿”推导到可行动的优化原因。

## 13. 本稿与现有知识正文的关系

本稿仅为独立草稿，不进入知识体系索引、不新增 QA、不修改现有主文档。正式通用知识入口仍是：

- [Web 性能优化完整知识体系](../W-Web性能优化完整知识体系.md)：用户体验分层、浏览器执行与优化总框架。
- [性能专项优化](../X-性能专项优化.md)：Web Vitals、PerformanceObserver、Event Timing、LoAF 和 RUM 数据采集专项。
- [浏览器主线程、Event Loop 与任务调度完整知识体系](../B-浏览器主线程Event Loop与任务调度完整知识体系.md)：Task、Microtask、Rendering Opportunity、Scheduler 等机制。
- [页面流畅度与连续渲染性能完整知识体系](../Y-页面流畅度与连续渲染性能完整知识体系.md)：持续视觉更新的 Frame、Queue、LoAF 与长期运行成本。
- [Loading-LCP 四阶段性能诊断与优化体系草稿](./Loading-LCP四阶段性能诊断与优化体系-草稿.md)：与本稿并列的加载体验草稿。

后续纳入正式知识体系时，应优先将通用机制补到现有主入口，在需要详细学习 INP 三阶段的位置建立交叉引用；不得直接复制成几篇平行的同义全文。

## 14. 参考文献

1. Google / web.dev. [Interaction to Next Paint (INP)](https://web.dev/articles/inp). INP 定义、交互规则、阈值与页面生命周期。
2. MDN. [PerformanceEventTiming.interactionId](https://developer.mozilla.org/en-US/docs/Web/API/PerformanceEventTiming/interactionId). 事件与逻辑交互的关联。
3. GoogleChrome. [web-vitals README](https://github.com/GoogleChrome/web-vitals). INP Attribution API、字段及测量限制。
4. Google / web.dev. [Optimize input delay](https://web.dev/articles/optimize-input-delay). 输入等待的主线程竞争原因与优化。
5. Chrome for Developers. [Long Animation Frames API](https://developer.chrome.com/docs/web-platform/long-animation-frames). LoAF、Long Task 与长帧 Attribution。
6. Google / web.dev. [Optimize Interaction to Next Paint](https://web.dev/articles/optimize-inp). Input Delay、Processing Duration、Presentation Delay 的诊断与优化。
7. Google / web.dev. [Optimize long tasks](https://web.dev/articles/optimize-long-tasks). 主线程长任务、任务拆分与调度让步。
8. MDN. [PerformanceEventTiming](https://developer.mozilla.org/en-US/docs/Web/API/PerformanceEventTiming). 原始 Event Timing 字段、观察阈值与计算示例。
9. Chrome for Developers. [INP breakdown](https://developer.chrome.com/docs/performance/insights/inp-breakdown). DevTools 三阶段诊断。
10. Google / web.dev. [Find slow interactions in the field](https://web.dev/articles/find-slow-interactions-in-the-field). 在线上收集慢交互归因。
