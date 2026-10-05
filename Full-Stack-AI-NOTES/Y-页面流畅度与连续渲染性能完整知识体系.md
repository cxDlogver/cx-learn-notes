# 页面流畅度与连续渲染性能完整知识体系

页面流畅度不是“FPS 越高越好”的单指标问题，而是一个持续视觉更新系统能否在有限的 Frame Budget（帧预算）内稳定完成必要工作的工程问题。

这篇文档只讨论 **Smoothness（连续渲染流畅度）**：滚动、拖拽、地图移动、Canvas / WebGL 动画、实时图表与持续数据可视化等场景，页面能否持续、及时地把重要视觉更新呈现给用户。

它不替代以下已有知识：

- [Web 性能优化完整知识体系](W-Web性能优化完整知识体系.md)：负责从 Loading / Responsiveness / Visual Stability / Smoothness 出发，把 Server / Network / Resource / JavaScript / Rendering / Runtime / RUM 串成端到端性能总框架；本文只继续深入 Continuous Rendering（连续渲染）分支；
- [性能专项优化](X-性能专项优化.md)：负责性能指标、监控采集与 RUM 体系；
- [基于 Chrome 浏览器渲染原理](J-基于Chrome浏览器渲染原理.md)：负责 JavaScript → Style → Layout → Paint → Composite 的浏览器渲染流水线；
- [Vue 应用级性能分析及优化](V-Vue应用级性能分析及优化.md)：负责 Vue 应用层的性能定位与框架实践；
- [WebSocket 完整知识体系](W-WebSocket完整知识体系.md)：负责实时连接、可靠恢复与 Backpressure 的通信侧知识。

本文建立另一条独立主线：**持续视觉更新怎样从“看起来卡”变成一个可测量、可定位、可优化、可验证的问题。**

---

## 1. 页面流畅度问题沿“视觉更新需求 → 帧生产 → 用户感知 → 诊断优化”形成完整闭环

连续渲染问题不能从某个工具或某个指标开始学习。首先要建立一条完整主线：

~~~text
业务或交互持续产生视觉更新需求
        ↓
数据 / 状态进入页面
        ↓
JavaScript 与框架执行
        ↓
Style / Layout / Paint / Raster / Composite
        ↓
浏览器尝试在下一次显示刷新截止时间前提交新 Frame
        ↓
用户看到连续、部分、延迟或重复的画面
        ↓
指标观察
        ↓
根因定位
        ↓
针对瓶颈优化
        ↓
同条件重新测量
~~~

这条主线可以进一步压缩为七个连续问题：

| 阶段 | 要回答的问题 |
| --- | --- |
| 体验目标 | 为什么这个页面必须持续流畅，而不是只要最终能画出来 |
| 帧模型 | 浏览器怎样把一次视觉变化变成屏幕上的 Frame |
| 度量模型 | “卡”具体应该用哪些指标描述 |
| 负载模型 | 哪些变量会让一帧赶不上截止时间 |
| 定位模型 | 怎样确定瓶颈到底发生在哪一层 |
| 优化模型 | 不同瓶颈分别应该减少什么工作 |
| 验证模型 | 怎样证明优化不是偶然，也没有牺牲正确性 |

### 【两条主线同时决定实时页面是否真正可用】

复杂可视化页面通常同时存在两条主线。

第一条是 Frame Production（帧生产）：

~~~text
Visual Update
   ↓
Main-thread Work
   ↓
Rendering Pipeline
   ↓
Frame Deadline
   ↓
Presented Frame
~~~

它决定：

> 画面能不能及时产生。

第二条是 Data Progress（数据进度）：

~~~text
Data Arrival
   ↓
Queue
   ↓
Consume
   ↓
State Commit
   ↓
Visual Update
~~~

它决定：

> 页面现在显示的是不是足够新的数据。

所以实时页面可能出现四种完全不同的状态：

| 帧表现 | 数据队列 | 实际问题 |
| --- | --- | --- |
| 流畅 | 稳定 | 正常 |
| 流畅 | 持续增长 | 看起来顺，但画面越来越“旧” |
| 卡顿 | 清空 | 吞吐追平了，但每次渲染太重 |
| 卡顿 | 持续增长 | 渲染成本和数据积压形成恶性循环 |

因此：

> **实时可视化的目标不是单纯追求 FPS，而是同时保证视觉连续性、数据新鲜度和交互可响应性。**

---

## 2. 流畅度关注“重要视觉更新是否按时呈现”，不能简单等同于平均 FPS

Chrome 团队把 Smoothness 讨论为连续视觉更新是否稳定的问题。显示器会按照固定或可变的 Refresh Rate（刷新率）提供展示机会，应用需要在截止时间前准备好新的视觉结果；如果没有及时完成，用户可能看到重复帧、部分更新或掉帧。[[1]](https://web.dev/articles/smoothness)

### 【流畅度与 Loading、Responsiveness、Visual Stability 是不同体验维度】

前端性能至少要区分：

| 体验维度 | 核心问题 | 常见指标 |
| --- | --- | --- |
| Loading | 内容多久出现 | LCP、FCP |
| Responsiveness | 用户操作多久看到反馈 | INP |
| Visual Stability | 内容会不会意外跳动 | CLS |
| Smoothness | 连续视觉变化是否稳定 | Frame Time、长帧、掉帧 / Jank、场景自定义指标 |

Smoothness 目前没有一个等价于 LCP / INP / CLS 的统一 Core Web Vital。Chrome 对 Smoothness 的研究也明确指出，简单统计 FPS 不能完整代表用户看到的动画质量，因为主线程和 Compositor Thread（合成线程）可能产生不同的更新，Frame 还可能只部分呈现。[[1]](https://web.dev/articles/smoothness)

所以：

~~~text
FPS 高
≠ 一定没有偶发卡顿

FPS 低
≠ 静态页面一定体验差

rAF 回调少
≠ 用户一定看到了同样数量的屏幕掉帧
~~~

只有在**存在重要连续视觉更新**时，Frame Throughput（帧吞吐）才真正成为核心体验。

### 【帧预算来自显示刷新周期，而不是固定写死 16.7ms】

60 Hz 显示器理论刷新周期：

~~~text
1000 / 60
≈ 16.67 ms
~~~

120 Hz：

~~~text
1000 / 120
≈ 8.33 ms
~~~

web.dev 的 Rendering Performance 指南指出，60 Hz 场景下一次屏幕刷新大约每 16.66ms 发生一次，但浏览器本身还需要留出内部工作时间，所以业务代码可用预算通常更小。[[2]](https://web.dev/articles/rendering-performance)

因此不要把 16.7ms 当成所有设备、所有页面的固定常量。

更通用的做法是：

~~~text
Frame Interval
≈ 1000 / 当前可观察 Refresh Rate

Frame Budget
< Frame Interval
~~~

在高刷新率、可变刷新率、后台页面、Headless 环境中，都应该重新测量基线。

### 【requestAnimationFrame 反映调度机会，但不等同于最终屏幕呈现 FPS】

requestAnimationFrame（rAF，动画帧回调）会请求浏览器在下一次 Repaint（重绘）之前执行 callback，其调用频率通常与显示刷新率接近；后台标签页通常会暂停或显著降频。[[3]](https://developer.mozilla.org/en-US/docs/Web/API/Window/requestAnimationFrame)

可以通过连续时间戳观察：

~~~ts
let previous = 0;

function tick(now) {
  if (previous) {
    const frameInterval = now - previous;
    record(frameInterval);
  }

  previous = now;
  requestAnimationFrame(tick);
}

requestAnimationFrame(tick);
~~~

但应准确描述结果：

> 这是 **rAF scheduling cadence（rAF 调度节奏）** 的观测，不是显卡最终实际 Presented Frame（呈现帧）的精确计数。

Chrome 的 Smoothness 研究专门提醒：主线程 rAF 可能下降，但 Compositor Thread 仍能保持平滑滚动；反过来，rAF 被调用也不意味着一定产生了新的重要视觉更新。[[1]](https://web.dev/articles/smoothness)

因此 rAF FPS 适合作为**辅助结果指标和调度能力信号**，不能单独作为最终结论。

---

## 3. 流畅度需要“结果指标 + 数据进度指标 + 诊断指标”三组数据共同判断

单一 FPS 会把不同问题混在一起。更完整的指标体系应该从三个问题出发。

### 【结果指标回答页面连续视觉体验怎么样】

建议关注：

| 指标 | 解释 |
| --- | --- |
| rAF FPS / Baseline Ratio | 当前 rAF 调度能力相对页面自身基线下降多少 |
| Frame Interval P50 / P95 / Max | 帧间隔是否稳定，尾部是否出现明显尖峰 |
| 超预算帧比例 | 有多少 Frame Interval 超过目标 Frame Budget |
| Long Frame Count / Rate | 是否频繁出现明显卡顿 |
| Worst Window | 最差 1s / 5s 时间窗口是否出现连续抖动 |

这里 **P95 和 Worst Window 通常比平均值更重要**。

例如：

~~~text
绝大多数时间 120 FPS
+
每 5 秒卡住 500ms
~~~

平均 FPS 仍可能看起来很好，但用户会明显感知周期性冻结。

Chrome Smoothness 研究也更倾向于关注一段时间内重要视觉更新未及时呈现的比例，而不是只看平均 FPS。[[1]](https://web.dev/articles/smoothness)

### 【数据进度指标回答页面是否正在越来越落后】

持续数据页面还必须观察 Producer–Consumer（生产者—消费者）关系：

~~~text
Arrival Rate λ
数据进入速度

Consume Rate μ
页面实际消费速度
~~~

若长期：

~~~text
λ > μ
~~~

则：

~~~text
pending ↑
oldestPendingMs ↑
screen data freshness ↓
~~~

建议同时采集：

| 指标 | 作用 |
| --- | --- |
| arrivalRate | 每秒进入多少数据 |
| consumeRate | 每秒真正消费多少数据 |
| pending | 队列还有多少未消费数据 |
| oldestPendingMs | 最老数据已经等了多久 |
| queueSlope | 队列是在增长、稳定还是下降 |
| arrival → view latency | 数据从到达到进入视图状态用了多久 |

这组指标可以识别一个很重要的假象：

> **页面“看起来还顺”不代表它仍然实时。**

如果 Queue 每秒都在增长，用户看到的只是越来越滞后的历史数据。

标准 WebSocket API 本身不会自动提供接收端 Backpressure（背压）；如果消息进入速度长期高于应用处理速度，就可能产生内存增长、CPU 占满或页面无响应。[[4]](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket)

### 【LoAF 比单纯 Long Task 更接近“这一帧为什么这么慢”】

Long Task 关注：

~~~text
某一个 Main Thread Task
是否持续 ≥ 50ms
~~~

但一帧可能由多个低于 50ms 的 Task 加上 Rendering 工作共同组成，因此没有单个 Long Task，并不代表这一帧一定及时完成。

LoAF（Long Animation Frame，长动画帧）关注的是**整次 Animation Frame 更新**。Long Animation Frames API 会记录超过 50ms 的长动画帧，并提供 duration、blockingDuration、renderStart、styleAndLayoutStart、scripts 等信息。[[5]](https://developer.mozilla.org/en-US/docs/Web/API/Performance_API/Long_animation_frame_timing)

最小监听：

~~~ts
const observer =
  new PerformanceObserver(list => {
    for (
      const entry
      of list.getEntries()
    ) {
      recordLongFrame(entry);
    }
  });

observer.observe({
  type: "long-animation-frame",
  buffered: true
});
~~~

LoAF 可以进一步拆解：

~~~text
Frame Start
    ↓
JS / Task Work
    ↓ renderStart
rAF / Rendering Work
    ↓ styleAndLayoutStart
Style / Layout
    ↓
Frame End
~~~

Chrome 官方 LoAF 文档说明，从 Frame 角度观察可以覆盖“多个小 Task 累计拖慢一帧”的情况，并能通过 script attribution 定位参与长帧的脚本。[[6]](https://developer.chrome.com/docs/web-platform/long-animation-frames)

但也要注意：

> LoAF 的 50ms 门槛不是“流畅帧预算”。

例如 120 Hz 屏幕约 8.3ms 一个刷新周期，一帧 20ms 已经可能错过多个展示机会，却不会进入 LoAF。

所以：

~~~text
Frame Time / rAF
适合观察连续节奏

LoAF
适合抓严重长帧并做归因
~~~

两者应结合，而不是互相替代。

### 【交互卡顿还要单独看 INP 或交互 Trace】

Smoothness 关注连续视觉更新，INP 关注用户 Interaction（交互）到下一次 Paint（绘制）的响应延迟。

一个地图可能：

~~~text
自动轨迹动画很流畅
但拖拽 / 点击时非常迟钝
~~~

也可能：

~~~text
点击反馈很快
但实时轨迹每隔几秒抖一下
~~~

因此拖拽、缩放、点击等关键交互应额外使用 INP、Event Timing 或 DevTools Interaction Track 分析，不应该用 FPS 代替 Responsiveness。

---

## 4. 掉帧根因可以抽象成 N、K、C、H、B 五个变量，而不是零散优化技巧

持续渲染的压力可以用一个工程模型理解：

~~~text
N = 单位时间进入可视化的数据量
K = 单位时间触发视图提交 / 绘制的次数
C = 一次更新自身的计算与绘制成本
H = 页面已经积累的历史状态 / 可视对象规模
B = 当前设备和刷新率提供的单帧预算
~~~

一次更新的成本可以粗略理解为：

~~~text
Cost Per Update
≈ Fixed Cost
+ Per-item Cost × Batch Size
+ History-dependent Cost(H)
~~~

单位时间总压力则与：

~~~text
K × Cost Per Update
~~~

相关。

如果每次新增一点都要重新遍历 H 个历史对象，那么：

~~~text
History-dependent Cost(H)
可能持续变大
~~~

于是即使 N 不变，页面仍会“越跑越慢”。

### 【N 过高：进入页面的数据总量超过可视化真正需要的规模】

常见现象：

~~~text
数据生产速度持续很高
↓
每秒需要新建大量点、线、柱体、图表样本
↓
CPU / GPU / Scene Object 持续增加
~~~

这类问题主要优化：

- Sampling（采样）；
- Aggregation（聚合）；
- Level of Detail，简称 LOD（细节层级）；
- 视口过滤；
- 服务端按客户端能力限流；
- 只保留影响视觉语义的关键点。

这里优化的是 **N**。

### 【K 过高：相同数据量被拆成太多次更新】

假设每秒 20 个点。

方案 A：

~~~text
20 次更新
×
每次 1 点
~~~

方案 B：

~~~text
4 次更新
×
每次 5 点
~~~

如果一次视图更新存在明显 Fixed Cost（固定成本），B 能通过 Batching（批处理）摊薄固定成本。

例如每次：

- Vue 响应式更新；
- Watcher 触发；
- ECharts setOption；
- 地图图层更新；
- Canvas / WebGL 提交；

都可能产生固定成本。

这里优化的是 **K**。

### 【C 过高：每次视图更新做了过多无效工作】

常见模式：

~~~text
新增 1 个点
↓
复制完整大数组
↓
深度 Watch
↓
重新遍历全部历史
↓
重建整条轨迹
↓
刷新整个图表 / 地图
~~~

这不是输入速度问题，而是一次 Commit（提交）的成本太高。

典型优化：

- Incremental Update（增量更新）；
- 避免全量重建；
- 复用 Style / Material / Geometry；
- 只更新发生变化的 Series / Layer / Entity；
- 减少深度响应式依赖；
- 减少临时对象和大数组复制；
- 把纯计算从绘制路径中移出。

这里优化的是 **C**。

### 【H 过高：历史状态改变了“新增一个点”的成本】

H 不只是内存大小。

在地图、图表、DOM、Canvas、WebGL 场景中，历史增长可能意味着：

- DOM Node 更多；
- Vector Feature 更多；
- WebGL Entity / Primitive 更多；
- Draw Call 更多；
- Dynamic Property 更多；
- Scene Traversal 更复杂；
- 每次 diff / watcher 遍历的数据更大；
- GC（垃圾回收）压力更高。

最危险的模式是：

~~~text
每次新增数据的复杂度
从 O(1)
逐渐变成
O(H)
~~~

因此诊断实时页面时必须主动问：

> **相同输入速率下，运行 30 秒和运行 30 分钟，一次更新的成本还是一样吗？**

### 【B 不足：设备、刷新率和浏览器环境决定系统实际容量】

同一份代码在：

- 60 Hz 与 120 Hz；
- 高性能桌面 CPU 与低端移动设备；
- 独显与集显；
- 前台与后台；
- 普通浏览器与 Headless；

上可用预算完全不同。

因此不存在一个脱离设备的绝对：

~~~text
batch = 5
一定最好
~~~

或者：

~~~text
FPS >= 60
一定达标
~~~

更可靠的方式是建立**当前页面自己的空闲 Baseline（基线）**，再衡量持续负载使它下降了多少。

---

## 5. 流畅度问题必须先做“宏观分类”，再进入函数级 Profiling

最常见的错误是页面一掉帧就立即打开 Performance Panel，在海量 Flame Chart 中找最慢函数。

更高效的顺序应该是：

~~~text
复现条件固定
    ↓
建立 Idle Baseline
    ↓
同时看 Frame + Queue
    ↓
先判断是吞吐问题还是单帧成本问题
    ↓
做变量隔离实验
    ↓
最后进入 Trace / LoAF / Call Tree 找具体函数
~~~

### 【第一步：把“卡”变成稳定可复现的工作负载】

测试至少要固定：

| 条件 | 示例 |
| --- | --- |
| Device / CPU | 同一设备或固定 CPU Throttling |
| Browser | 同一 Chrome 版本 |
| Viewport | 固定窗口大小 |
| Scene | 同一个页面、地图类型、缩放和视口 |
| Input Rate | 固定每秒数据量 |
| Batch | 固定每次消费数量 |
| History Size | 固定起始历史规模 |
| Duration | 固定采样时长 |
| Warm-up | 明确冷启动还是预热后测量 |

Chrome DevTools 官方也建议在受控条件下记录 Runtime Performance，并在需要时使用 CPU Throttling 模拟较弱设备。[[7]](https://developer.chrome.com/docs/devtools/performance)

如果实验条件每次变化，性能数字之间不能直接比较。

### 【第二步：先测 Idle Baseline，再打开持续负载】

先关闭实时更新或动画：

~~~text
No Incoming Update
↓
Baseline FPS
Baseline Frame Time
Baseline LoAF
~~~

再打开数据：

~~~text
Realtime Workload
↓
Loaded FPS
Loaded Frame Time
Queue
~~~

如果 Idle 就很差：

~~~text
问题更可能来自
页面 / 渲染引擎自身基线成本
~~~

如果 Idle 很好，一打开数据立刻恶化：

~~~text
问题更可能来自
数据驱动的更新链
~~~

这个对比能非常快地缩小搜索范围。

### 【第三步：Frame 与 Queue 必须一起判断】

一个非常实用的四象限：

| Frame | Queue | 优先判断 |
| --- | --- | --- |
| 稳定 | 稳定 | 当前容量足够 |
| 稳定 | 增长 | 渲染看似流畅，但消费吞吐不足 |
| 变差 | 稳定 | 单次 Rendering / Scene 成本过高 |
| 变差 | 增长 | 容量不足并出现正反馈退化 |

尤其是：

~~~text
FPS ↓
→ rAF 调度机会减少
→ Consume Rate ↓
→ Queue ↑
→ 后续每次需要处理更多状态
→ FPS 进一步 ↓
~~~

可能形成 Performance Collapse（性能塌缩）正反馈。

### 【第四步：用受控实验分别修改 N、K、H 和 C】

#### <u>1. Batch Sweep 用于判断 K 是否是主因</u>

固定：

~~~text
N = 固定输入速率
H = 固定历史规模
~~~

只改变：

~~~text
batch = 1 / 2 / 5 / 10 / ...
~~~

如果增大 batch 后：

~~~text
Queue 明显下降
+
Frame 成本没有恶化
~~~

说明 Fixed Cost 较高，降低 K 有收益。

如果：

~~~text
Queue 清空
但 Frame Time / LoAF 明显变差
~~~

说明只是用更重的单帧换取吞吐，不代表页面真正变流畅。

#### <u>2. Rate Sweep 用于判断 N 是否是主因</u>

最好固定 batch，只改变：

~~~text
Input Rate
~~~

如果输入量下降后：

- Frame Time 明显下降；
- LoAF 下降；
- FPS 接近 Baseline；
- Queue 归零；

说明数据规模 N 是强瓶颈变量。

#### <u>3. History Sweep 用于判断 H 是否在放大单次成本</u>

固定实时输入，只改变：

~~~text
History Size
0
200
500
1000
3000
...
~~~

如果 FPS、Frame P95 或函数耗时随 H 增长持续恶化，就需要继续寻找：

- 全量重建；
- 全量遍历；
- 动态属性；
- 对象数量；
- Scene Traversal；
- GC / Memory；
- Draw Call。

#### <u>4. Empty Render / No-op Callback 用于区分调度成本和真实绘制成本</u>

让 Queue 正常出队，但临时把真正的视图更新替换成空函数：

~~~text
Queue / rAF 保留
Rendering Callback = no-op
~~~

如果此时吞吐完全正常：

> Queue 和 rAF 调度本身不是主瓶颈，问题在后面的状态提交、框架更新、地图或图表绘制。

这是非常有效的“切链路”实验。

### 【第五步：确定宏观瓶颈后，再用 DevTools 和 LoAF 做函数级归因】

Chrome Performance Panel 可以同时观察 FPS、CPU、Frames、Main Thread、Bottom-up、Call Tree 等信息，用于从“哪一段时间卡”深入到“哪个函数占用了时间”。[[7]](https://developer.chrome.com/docs/devtools/performance)

推荐路径：

~~~text
找到 FPS / Frame 异常窗口
    ↓
看 Main Thread 是否忙
    ↓
看 Task / rAF / Rendering
    ↓
Bottom-up 找累计热点
    ↓
Call Tree 找调用路径
    ↓
LoAF scripts 做长帧脚本归因
~~~

不要看到一个慢函数就立即优化。还要确认：

> 它是否真的处于用户发生卡顿的 Frame 中，并且是否占据足够大的总成本。

---

## 6. 优化必须对应 N、K、C、H 的具体根因，不能用同一种“分帧”解决所有问题

### 【接收与渲染解耦解决的是输入节奏直接控制视图的问题】

错误链路：

~~~text
Data Arrives
   ↓
立即更新 State
   ↓
立即 Map / Chart Render
~~~

意味着：

~~~text
Input Frequency
=
Render Commit Frequency
~~~

更合理：

~~~text
Data Arrives
   ↓
Normalize / Validate
   ↓
Queue
   ↓
Visual Scheduler
   ↓
Batch
   ↓
View Commit
~~~

requestAnimationFrame 适合作为视觉更新调度点，因为它在下一次 Repaint 前运行，并通常跟随显示刷新节奏。[[3]](https://developer.mozilla.org/en-US/docs/Web/API/Window/requestAnimationFrame)

但：

> rAF 只决定“什么时候开始这一批工作”，不会自动让一段 100ms 的工作变成 8ms。

如果 rAF callback 内仍然进行巨大计算和全量重建，一样会掉帧。

### 【Batching 优化 K，但 batch 不能无限增大】

Batching 的收益：

~~~text
多个数据点
↓
一次状态提交
↓
一次地图 / 图表更新
~~~

减少重复 Fixed Cost。

但 batch 越大：

~~~text
Per-frame Work ↑
~~~

所以存在一个约束：

~~~text
需要足够大的 batch
让 Consume Rate >= Arrival Rate

同时需要足够小的 batch
让 Render Cost 不突破 Frame Budget
~~~

这也是为什么固定 batch 很难适配所有设备和负载。

### 【Sampling、Aggregation 和 LOD 优化 N】

如果可视化真正无法消费全部原始点，继续调 batch 并不能改变总工作量。

应该减少进入 Rendering System 的数据：

~~~text
Raw Data
   ↓
Sampling / Aggregation / LOD
   ↓
Visual Data
~~~

但 Sampling 不能只做：

~~~text
每 N 条随便取 1 条
~~~

还要保护业务语义，例如：

- 时间连续性；
- 空间轨迹形态；
- 峰值 / 异常值；
- 最大等待时间；
- 用户当前视口；
- 告警点不能被采掉。

### 【增量更新优化 C，并阻止 H 放大每次提交成本】

优先追求：

~~~text
新增 1 个点
→ 只处理新增部分
~~~

而不是：

~~~text
新增 1 个点
→ 重建全部历史
~~~

常见做法：

- 轨迹按 Chunk（分段）维护；
- 图表只追加或更新变化 Series；
- Geometry 增量追加；
- 静态对象不要长期使用 Dynamic Callback；
- 缓存 Style / Material；
- 避免重复创建完全相同对象；
- 避免全数组复制后触发深 Watch。

### 【控制 H 不是简单删数据，而是控制“同时参与绘制的状态”】

业务数据可以长期存在服务端，但浏览器当前 Scene 不一定要持有全部可视对象。

可以分别设计：

~~~text
Business History
完整保存

Client Logical History
按交互需要保留

Visible Render Objects
只保存当前视觉需要的规模
~~~

常见策略：

- Sliding Window；
- Viewport Culling；
- LOD；
- Virtualization；
- 聚合；
- Chunk；
- Object Pool；
- Tile / Spatial Index；
- 远距离减少细节。

### 【Canvas / WebGL / 地图库还要控制 Scene Graph 和 Draw Work】

连续渲染不只发生在 DOM。

对于地图和 3D：

- Entity 数量；
- Feature 数量；
- Dynamic Property；
- Material / Style 切换；
- Geometry 重建；
- Camera 更新；
- Terrain / Imagery；
- Draw Call；

都会改变单帧成本。

当场景空闲时，如果画面本身没有变化，可以考虑 On-demand Rendering（按需渲染）：

~~~text
State Changed
   ↓
requestRender()

No Change
   ↓
不持续产生 Scene Frame
~~~

这是减少**固定 Scene 基线成本**的一类方案。

### 【Web Worker 只能转移可并行计算，不能替代主线程渲染优化】

Worker 适合：

- 大量数据解析；
- 排序；
- 聚合；
- 数学计算；
- 空间计算；
- 部分采样算法。

但通常不能直接解决：

- Vue / React 状态提交；
- DOM Layout；
- 大多数地图组件主线程 API；
- 主线程 Canvas / WebGL Scene 更新。

所以：

~~~text
Long CPU Preprocess
→ Worker 可能有效

Rendering / Layout / Framework Commit 很重
→ Worker 通常不能直接解决
~~~

需要先用 Profile 判断瓶颈在哪，再决定是否拆 Worker。

### 【自适应控制解决负载和设备能力动态变化的问题】

真实页面的容量会随着：

- Device；
- History Size；
- Map Mode；
- 用户交互；
- 浏览器负载；

发生变化。

可以构建 Feedback Controller（反馈控制）：

~~~text
Observe
FPS / Frame P95 / Queue / Queue Age
        ↓
Evaluate
当前是健康、积压还是突破 Frame Budget
        ↓
Act
调整 batch
必要时降低 input rate
        ↓
Observe Again
~~~

一个通用决策：

~~~text
Queue Growing
+
Render Within Budget
→ 适当增加 batch

Queue Growing
+
Render Already Over Budget
→ 不能继续增 batch
→ 减少 input / quality

Queue Empty
+
Frame Healthy
→ 可以逐步恢复质量
~~~

需要 Hysteresis（滞回）、Cooldown（冷却时间）和慢恢复，避免控制器在两个档位之间来回震荡。

#### <u>反馈控制的核心不是“找固定最优参数”，而是同时比较需求吞吐与安全容量</u>

连续渲染中的自适应控制可以抽象成两个量：

~~~text
Required Capacity
为了跟上新输入并在目标时间内消化积压
理论上每次至少要处理多少工作

Safe Capacity
在当前 Frame Budget 内
已经被运行结果证明可以安全承担多少工作
~~~

例如一个通用的批量需求估算可以写成：

~~~text
requiredBatch
≈
(
  arrivalRate
  + pending / catchUpWindow
)
/
availableFrameRate
~~~

其中：

- `arrivalRate` 表示新的工作进入速度；
- `pending / catchUpWindow` 表示为了在目标窗口内追平积压，需要额外提供的消费能力；
- `availableFrameRate` 表示当前真正还能获得多少次帧级处理机会。

但这个公式只回答：

> **从吞吐角度希望 batch 至少有多大。**

它不能直接决定最终 batch。最终还必须受 Frame Budget 约束：

~~~text
requiredBatch
告诉控制器“想处理多快”
        ↓
safeBatch / Frame Budget
限制控制器“最多敢处理多重”
        ↓
actualBatch
在吞吐需求和渲染安全之间取可接受值
~~~

因此更稳定的控制器通常不会直接从小 batch 跳到理论 requiredBatch，而是采用 Conservative Probe（保守探测）：

~~~text
当前安全容量 = S
理论需求 = R

下一轮最多尝试
min(R, S + smallStep)
~~~

每次试探后重新观察 Frame Time、Queue 和 FPS。如果仍在预算内，再把新的容量记为安全边界；如果超预算，则立即停止继续上探。

#### <u>为什么 Queue 与 Frame Pressure 必须同时进入控制器</u>

只看 Queue 会得到：

~~~text
Queue ↑
→ 不断增加 batch
~~~

但 batch 过大可能让单帧成本突破预算，导致 FPS 下降、每秒消费机会减少，反过来让 Queue 更严重。

只看 FPS 又会得到：

~~~text
FPS ↓
→ 不断减 batch
~~~

但 batch 太小又可能让 Consume Rate 长期低于 Arrival Rate，页面虽然单帧变轻，却越来越不实时。

所以反馈控制至少要同时观察：

~~~text
Data Pressure
Arrival / Consume / Pending / Queue Age
        +
Frame Pressure
Frame Time / FPS / Render Cost / Budget
~~~

只有这两类信号结合，才能区分：

~~~text
消费能力不足但单帧还有余量
→ 提高单次消费能力

单帧已经达到容量上限
→ 停止加重单帧
→ 必要时降低输入或视觉质量
~~~

#### <u>这类控制器通常属于离散规则反馈控制，不一定需要 PID</u>

页面性能控制常常具有这些特点：

- 控制量是离散的 batch、采样档位、质量级别；
- 页面负载关系高度非线性；
- 地图模式、历史规模和设备差异会改变容量；
- 安全边界比理论收敛速度更重要。

因此工程上常采用 Rule-based Adaptive Feedback Controller（基于规则的自适应反馈控制器），配合：

- Threshold（阈值）；
- Hysteresis（滞回）；
- Cooldown（冷却）；
- Conservative Probe（保守探测）；
- Slow Recovery（慢恢复）。

PID 更适合有连续误差、连续控制量且系统动力学相对稳定的场景；如果控制动作本身就是几个离散档位，规则反馈往往更容易解释、测试和设置安全上限。

---

## 7. 一个完整定位决策树应该从“现象”一路走到“可验证根因”

~~~text
页面感觉不流畅
        ↓
是否存在持续视觉更新？
        ├─ No
        │   → 更可能是 Responsiveness / Long Task / INP 问题
        │
        └─ Yes
             ↓
建立 Idle Baseline
             ↓
负载后 Frame 是否明显恶化？
        ├─ No
        │    ↓
        │  Queue 是否持续增长？
        │    ├─ Yes → 吞吐不足 / 数据越来越旧
        │    └─ No  → 当前流畅度基本健康
        │
        └─ Yes
             ↓
             Queue 是否增长？
        ├─ Yes → λ > μ，先做 N / K / C 隔离
        └─ No  → 单帧成本 / Scene 固有成本问题
             ↓
平均 FPS 高但偶发明显卡顿？
        ├─ Yes → 看 Frame P95 / Max / LoAF
        └─ No
             ↓
性能是否随 History Size 增长而退化？
        ├─ Yes → 查 O(H) 重建 / 对象规模 / GC / Scene Traversal
        └─ No
             ↓
Empty Render 是否恢复？
        ├─ Yes → 瓶颈在真实状态提交 / Map / Chart Rendering
        └─ No  → 查 Scheduler / 其他 Main-thread Work / Browser Baseline
             ↓
Performance Trace + LoAF Attribution
             ↓
确认具体函数和渲染阶段
~~~

这个决策树的目的不是代替工具，而是决定：

> **下一次实验应该改变哪个变量。**

---

## 8. 验收流畅度不能只写“FPS 达到 60”，而要验证稳定、实时、交互和长期运行

没有一个适用于所有页面的统一 Smoothness Good / Poor 数字。

验收目标应该从场景反推。

### 【结果验收至少同时看四组信号】

#### <u>1. Frame Stability</u>

关注：

- rAF FPS 相对页面自身 Baseline；
- Frame Interval P95；
- Worst Frame；
- 超预算帧率；
- LoAF P95 / Max。

不要只看平均值。

#### <u>2. Data Freshness</u>

持续数据页面要求：

~~~text
consumeRate
长期能够追上
arrivalRate
~~~

同时：

~~~text
pending
不能长期单调增长

oldestPendingMs
不能持续扩大
~~~

否则虽然 Frame 看起来正常，实时语义已经失效。

#### <u>3. Interaction Quality</u>

在持续更新期间仍要验证：

- Drag；
- Zoom；
- Click；
- Hover；
- Input；

是否保持可响应。

必要时记录 INP / Interaction Trace。

#### <u>4. Resource Stability</u>

短时间 60 秒跑得很好，不代表长时间稳定。

Soak Test（浸泡测试 / 长时间运行测试）还应观察：

- Heap；
- GC；
- DOM / Feature / Entity 数量；
- GPU / Scene 对象；
- CPU；
- Queue；
- FPS / Frame P95 随运行时间是否退化。

### 【A/B 性能实验必须保证比较条件一致】

一次可靠的优化验证应固定：

~~~text
Same Device
Same Browser
Same Viewport
Same Scene
Same Input
Same History
Same Duration
Same Warm-up Policy
~~~

然后：

~~~text
Before
vs
After
~~~

最好重复多轮并使用 Median / P95，而不是只拿一次最好结果。

还要同步做功能正确性验证：

~~~text
性能优化
不能通过
漏数据、断轨迹、少画对象、降低业务正确性
来“获得”更高 FPS
~~~

所以最终验收应该是：

~~~text
Functional Correctness
        +
Smoothness
        +
Data Freshness
        +
Interaction Responsiveness
        +
Long-running Stability
~~~

---

## 9. 页面流畅度最终形成“测量 → 分类 → 实验 → 优化 → 验证”的工程方法

整套知识可以收束成下面一条可复用方法。

~~~text
1. Define
明确什么场景需要连续更新，以及为什么流畅重要
        ↓
2. Baseline
测空闲帧率、Frame Time 和资源基线
        ↓
3. Observe
同时记录 Frame、LoAF、Queue、Input、History、Render Cost
        ↓
4. Classify
判断问题来自 N / K / C / H / B 哪个变量
        ↓
5. Isolate
Batch Sweep / Rate Sweep / History Sweep / Empty Render
        ↓
6. Profile
Performance Panel + LoAF + Call Tree 定位具体代码
        ↓
7. Optimize
降低数据量、提交频率、单次成本、历史场景成本
        ↓
8. Control
必要时做 Backpressure / Adaptive Degradation
        ↓
9. Verify
同条件 A/B + 多轮 + 功能正确性 + Soak
~~~

如果用于面试或答辩，可以收束成：

> 页面流畅度不是简单追求一个 FPS 数值。我会先把连续渲染看成“数据生产 → 队列 → 按帧消费 → 状态提交 → 浏览器/地图绘制 → 屏幕呈现”的生产消费系统，同时用 Frame Pipeline 判断每帧是否赶上预算。指标上不会只看平均 FPS，而会结合 Frame Time P95、LoAF、队列长度和最老等待时间判断“画得顺不顺”和“数据是否越来越滞后”。定位时先建立空闲基线，再通过 batch、input rate、history size 和 empty render 等受控实验分别隔离更新次数 K、数据量 N、单次成本 C 和历史规模 H，最后才进入 DevTools / LoAF 做函数级归因。优化也按根因分别处理：批量合并减少 K，采样和限流减少 N，增量更新降低 C，窗口化、分段和按需渲染控制 H，并在相同条件下重新测量和做长时间运行验证。

---

## 10. 相关知识与实战分析入口

### 【前置与延伸知识】

建议阅读关系：

~~~text
浏览器渲染原理
    ↓
页面流畅度与连续渲染性能
    ├─ 性能专项优化：监控和指标采集
    ├─ Vue 应用性能：框架更新和 DevTools
    ├─ WebSocket：输入流、背压和实时连接
    └─ Canvas / WebGL / 地图 / 图表专项
~~~

相关文档：

- [基于 Chrome 浏览器渲染原理](J-基于Chrome浏览器渲染原理.md)
- [性能专项优化](X-性能专项优化.md)
- [Vue 应用级性能分析及优化](V-Vue应用级性能分析及优化.md)
- [WebSocket 完整知识体系](W-WebSocket完整知识体系.md)
- [二维地图绘制](E-二维地图绘制.md)
- [ECharts 从 0 到 1](E-ECharts从0到1.md)

### 【实战分析入口】

通用知识只负责解释页面连续渲染的框架、指标、根因模型、定位方法与优化边界；具体项目如何把这些机制落到源码、实验和验收中，由项目自己的正式实践文档负责。

- [QHZHC：页面连续渲染流畅度与掉帧优化](https://github.com/cxDlogver/qhzhc-realtime-platform/blob/main/docs/%E9%A1%B5%E9%9D%A2%E8%BF%9E%E7%BB%AD%E6%B8%B2%E6%9F%93%E6%B5%81%E7%95%85%E5%BA%A6%E4%B8%8E%E6%8E%89%E5%B8%A7%E4%BC%98%E5%8C%96.md)

项目文档进一步提供：

~~~text
真实实时数据链路
        ↓
基线 / Batch / Rate / History / Empty Render 实验
        ↓
N / K / C / H / B 在当前代码中的具体映射
        ↓
Vue / ECharts / OpenLayers / Cesium 优化实现
        ↓
Adaptive Controller
        ↓
当前验证结果与尚未完成的 Soak 边界
~~~

这样保持：

~~~text
Full-Stack-AI-NOTES
维护可迁移的通用知识

Project docs
维护真实源码、实验、取舍和验证结果
~~~

---

## 11. 参考文献

1. [web.dev — Towards an animation smoothness metric](https://web.dev/articles/smoothness)
2. [web.dev — Rendering performance](https://web.dev/articles/rendering-performance)
3. [MDN — Window: requestAnimationFrame()](https://developer.mozilla.org/en-US/docs/Web/API/Window/requestAnimationFrame)
4. [MDN — WebSocket](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket)
5. [MDN — Long animation frame timing](https://developer.mozilla.org/en-US/docs/Web/API/Performance_API/Long_animation_frame_timing)
6. [Chrome for Developers — Long Animation Frames API](https://developer.chrome.com/docs/web-platform/long-animation-frames)
7. [Chrome for Developers — Analyze runtime performance](https://developer.chrome.com/docs/devtools/performance)
