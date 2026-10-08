# Smoothness 持续渲染流畅度：帧稳定性指标与长帧诊断体系（草稿）

> 草稿状态：第四类用户体验独立讨论稿，暂不加入知识体系索引、QA 或正式知识正文；示例数值均不代表真实项目结果。
>
> 分析主线：用户视觉异常 → FPS / 帧间隔 / 帧预算的初步判断 → LoAF 分段归因 → JavaScript、样式布局、绘制合成与 GC 的证据分析 → 对应优化 → Lab 与 RUM 验收。
>
> 核心认识：Smoothness 没有与 LCP、INP、CLS 等价的统一 Core Web Vital。必须分别观察帧稳定性（结果）、数据更新是否追得上（过程）、为什么某帧超时（诊断）。

> **统一性能异常诊断入口**：发现某项 Web 性能指标回归后，先按版本、页面、设备和时间建立上下文，再按结果→阶段→证据→根因→优化→验收进行分析。完整共用方法参见 [Web 性能异常定位与优化完整方法（草稿）](./Web性能异常定位与优化完整方法-草稿.md)；本文只负责Smoothness 的帧生产和长帧诊断机制的深入解释。

## 1. 从视觉表现识别页面卡顿与持续渲染需求

### 【首先确认用户在哪个视觉场景感到不流畅】

流畅度分析应首先来自用户实际感知：滚动突然停顿、拖拽反馈不连贯、动画跳帧、持续视觉更新运行越久越慢。需要固定**页面、设备、刷新率、用户操作和具体发生时段**，区分偶发卡顿、持续掉帧和长期退化，并确认重要画面更新是否及时。静态页面没有连续更新需求时，低 rAF FPS 本身不是故障。

~~~text
用户感觉画面不流畅
    ↓
确认持续更新需求与可复现的活动窗口
    ↓
FPS / Frame Interval P95 / Long Gap 量化体验
    ↓
LoAF / Long Task / Trace 定位时间消耗
    ↓
脚本、渲染、GPU、内存、历史数据等证据确定根因
    ↓
选择对应优化 → 实验和线上验证
~~~

### 【四类用户体验分别关注不同问题】

| 维度 | 核心问题 | 结果指标 |
| --- | --- | --- |
| Loading | 主要内容何时出现？ | LCP |
| Responsiveness | 操作后何时获得视觉反馈？ | INP |
| Visual Stability | 既有内容是否发生非预期位置变化？ | CLS |
| Smoothness | 重要画面变化能否连续、及时呈现？ | 场景化 Frame 稳定性指标集合 |

只有存在重要的连续视觉更新时，帧节奏才具有用户体验意义。静态文章没有每帧动画需求，即使 rAF 回调很少也不代表卡顿；交互滚动、拖拽、过渡动画、Canvas/WebGL 或其他持续变化的视觉内容则需要按照业务目标检验更新节奏。

~~~text
用户输入 / 动画状态 / 需要更新的可视内容
     ↓
产生新的视觉更新需求
     ↓
主线程 JS / rAF / 框架状态处理
     ↓
Style（样式）/ Layout（布局）/ Paint（绘制）
     ↓
Raster（栅格化）/ Composite（合成）/ GPU
     ↓
在下一次显示刷新期限前提交重要视觉更新？
     ├─ 及时：产生连续的新画面
     └─ 超时：重复旧帧、部分更新或跳帧
     ↓
结果指标、阶段诊断、优化与验证
~~~

Chrome 的 Smoothness 研究指出，主线程和合成线程可能分别提供视觉更新，所以 rAF 回调频率既不是用户可见新帧的完整数量，也不是实际显示器呈现帧率。主线程被阻塞但合成滚动仍然流畅，就是一个反例。[[1]](https://web.dev/articles/smoothness)

## 2. 用 FPS、帧间隔和刷新预算建立初步流畅度判断

### 【FPS 只能反映更新频率，帧节奏与重要画面更新同样重要】

**平均 FPS 高仍可能有卡顿**：大量正常间隔夹杂一次 100ms 停顿，平均值会掩盖异常；**FPS 低也不一定不流畅**：静态内容没有持续更新要求，或者业务只需要较低频率改变视觉结果。rAF 回调频率也不是显示器实际呈现的新帧数量，合成线程动画和 WebGL/GPU 工作可能与主线程回调节奏不同。[[1]](https://web.dev/articles/smoothness)

所以初步判断需要结合：有无活跃视觉更新、目标刷新周期、rAF FPS、Frame Interval P95/P99、超预算比例、Longest Gap，并在真实视觉录制中验证异常，而不能仅检查一个全站平均 FPS。

### 【结果指标异常后才进入阶段诊断】

~~~text
有持续画面更新需求
    ↓
根据刷新率和目标更新频率选择有效采样窗口
    ↓
FPS（更新频率） + Frame Interval P95（尾部间隔）
    + Budget Hit Rate（满足预算的比例）
    ↓
帧是否呈现不均匀、连续超预算或严重停顿？
    ├─ 否 → 检查画面是否真正更新、业务状态是否积压
    └─ 是 → 进入 LoAF / Long Task / Performance Trace
~~~

注意 **rAF Frame Interval 不是每帧实际 Layout/Paint 耗时**；LoAF.duration 只覆盖超过 50ms 的长帧，并非全部帧的精确绘制时长，低于 50ms 的超预算帧也应继续追查。[[2]](https://developer.chrome.com/docs/web-platform/long-animation-frames)

### 【刷新率决定理论帧预算，不应硬编码 16.7ms】

刷新周期可近似表达为：Frame Interval = 1000 / Refresh Rate。

| 显示刷新率 | 理论间隔 |
| --- | ---: |
| 60Hz | 16.67ms |
| 90Hz | 11.11ms |
| 120Hz | 8.33ms |
| 144Hz | 6.94ms |

这是显示刷新机会间隔，不等于 JS 可以独占的执行预算；浏览器内部工作需要时间，设备可能出现可变刷新率或节能限频。一个 20ms 的视觉工作，在 60Hz 和 120Hz 条件下造成的超预算程度不同。[[3]](https://web.dev/articles/rendering-performance)

### 【rAF 提供的是下一次绘制前的调度机会】

requestAnimationFrame 会在浏览器下次重绘之前尝试调用传入的函数；持续注册可形成相邻回调时间戳之差 ΔrAF。浏览器通常按刷新率调度，但后台标签或隐藏 iframe 会暂停或降低频率。[[4]](https://developer.mozilla.org/en-US/docs/Web/API/Window/requestAnimationFrame)

必须区分：

| 术语 | 含义 | 注意事项 |
| --- | --- | --- |
| rAF Frame Interval | 相邻 rAF 时间戳之差 | 不是实际的一帧 Paint 耗时 |
| rAF FPS | 单位时间 rAF 回调次数 | 不是显示器最终 Presented FPS |
| rAF Callback Duration | 回调内部同步执行时间 | 不包含全部布局、绘制和 GPU 工作 |
| Application Commit Duration | 框架或图库一次提交工作时间 | 部分 API 只是排队，不保证画面已呈现 |
| Chrome Frame / Compositor Trace | 更靠近真实帧生成和呈现 | 通常需要实验室录制 |

Frame Budget 不满足时可能出现显示更新延后或旧帧重复，但不能仅凭一次 ΔrAF 超预算就断言精确丢了几帧，因为浏览器还有合成路径、屏幕刷新与可变调度。[[1]](https://web.dev/articles/smoothness)

### 【结果指标描述连续视觉更新的稳定程度】

| 指标 | 计算口径 | 主要价值 | 限制 |
| --- | --- | --- | --- |
| Active rAF FPS | 活跃观察窗口内 rAF 回调频率 | 调度吞吐的辅助信号 | 不等于屏幕真实帧率 |
| Frame Interval P50/P95/P99 | 活跃有效 ΔrAF 的分位数 | 捕捉尾部尖峰 | 非真实渲染执行时间 |
| Budget Hit Rate | 未超过当前目标间隔的样本占比 | 观察期限达标情况 | 自定义，依赖刷新率与目标 |
| Long Gap / Jank Ratio | 超过 1.5 或 2 倍预算等阈值的样本比例 | 检出间歇性卡顿 | 阈值需要自行定义 |
| Longest Consecutive Stall | 连续视觉更新迟滞或最长停顿 | 避免平均值掩盖严重尖峰 | 必须排除后台与空闲 |
| Important Update Latency | 业务状态变化到可见更新的时间 | 衡量业务真正关心的视觉更新 | 需要业务埋点与呈现口径 |

这些不是官方统一 Core Web Vitals 分项，不应把 2 倍预算或某个自设 Jank Ratio 阈值写成 Google 官方标准。评估时必须明确 Active（有持续更新需求）的判断条件、可见性、基线刷新率和样本数。Google 对动画平滑度的研究也倾向于进一步区分重要动画更新、实际视觉内容与 Frame 的完整程度，而不只是平均 FPS。[[1]](https://web.dev/articles/smoothness)

### 【原生 rAF 时间戳能够测到什么】

每一次 requestAnimationFrame 的回调都得到浏览器提供的时间戳，连续两个回调时间戳相减得到一次观察到的 Frame Interval：

~~~js
let previous = null;
let rafId = 0;
const intervals = [];

function sample(timestamp) {
  if (previous !== null) {
    intervals.push(timestamp - previous);
  }
  previous = timestamp;
  rafId = requestAnimationFrame(sample);
}

rafId = requestAnimationFrame(sample);

// 结束采样时取消回调，并及时统计和清理。
function stopSampling() {
  cancelAnimationFrame(rafId);
}
~~~

这段代码只用于说明时间来源，不能直接部署到所有页面的线上监控：数组无上限增长、后台恢复可能产生异常间隔、永远运行会占用调度资源，每帧计算百分位数或 Console.log 更可能干扰页面。[[1]](https://web.dev/articles/smoothness)

### 【真正的生产设计要规定采样窗口和有效状态】

建议明确以下四类采集上下文：

1. **更新需求**：业务当前是否真的处于连续视觉更新中？静态页面没有连续动画需求，不应用同一目标 FPS 判定故障。
2. **页面可见性**：document.visibilityState 不是 visible 时应暂停采样，恢复时清空上一次时间戳，避免把后台停留时间作为一个长 Frame。
3. **设备基线**：60Hz、120Hz 与可变刷新率下 rAF 期望频率不同。可以结合短时空闲基线和业务目标建立当前的 Budget，而不是一律按 16.7ms。
4. **窗口与限量**：只在必要活动时间内采集有限样本，先保存低成本数字，结束时再计算 P95、超预算比例、极端间隔和连续卡顿长度。

Google 对 rAF FPS 测量的研究明确提醒：常驻轮询会干扰浏览器的空闲机会，在可变刷新率下产生误报，而且无法覆盖所有合成线程的视觉更新。应把 rAF 采样设计为**受控的辅助观察**。[[1]](https://web.dev/articles/smoothness)

### 【Frame Interval P95 如何理解】

假设某个活跃持续动画窗口采集到 100 个有效 ΔrAF 样本，大多数是 16.7ms，少量是 33ms、50ms。平均 FPS 可能仍接近 60，但 Frame Interval P95 会显示尾部延迟明显增长。

因此，帧间隔的尾部分位数比只取平均 FPS 更适合发现间歇性卡顿；同时应检查最长间隔、卡顿出现时的业务阶段和是否存在连续多次超预算。需要注意各统计窗口独立：**某窗口的 P95 不能直接拼成整次访问的 P95**，应保留采样方法和统计分布口径。

## 3. 以 LoAF 和 Long Task 作为异常帧的诊断入口

### 【50ms 是长帧或长任务的识别阈值，不是流畅帧预算】

Long Task 观察单个主线程任务，LoAF 观察一次长帧相关的多个任务、rAF 和渲染工作，因此**没有超过 50ms 的单个 Task，也可能出现总耗时超过 50ms 的 LoAF**。若画面在 120Hz 下每帧用 20ms，虽然可能不断超出 8.3ms 刷新周期，却不达到 LoAF 50ms 记录阈值。

LoAF.duration 表示长帧整体工作时间，blockingDuration 表示与高优先级输入阻塞相关的估计，不应混为一谈。[[2]](https://developer.chrome.com/docs/web-platform/long-animation-frames)

### 【诊断指标查明具体成本】

Long Task（单个主线程长任务）提供任务级阻塞线索；LoAF（Long Animation Frame，长动画帧）提供帧级时间归因；Chrome Performance Trace、LoAF Script Attribution、强制同步布局、GC、Paint / GPU 和组件 Profiler 用于进一步定位具体原因。**LoAF 的 50ms 不是流畅度预算，也不是 Long Task 的计数。**[[2]](https://developer.chrome.com/docs/web-platform/long-animation-frames)

### 【Long Task 是任务级证据，LoAF 是长帧级证据】

Long Tasks API 面向主线程 Task。一个持续执行超过 50ms 的任务可能阻碍新输入、rAF 和页面渲染。LoAF 则从帧更新角度记录总计超过 50ms 的工作，即使它由多个较短 Task、rAF 回调和布局工作累积而成。

| 假设情况 | Long Task | LoAF | 判断意义 |
| --- | --- | --- | --- |
| 单个同步计算 90ms | 可能记录 | 也可能记录 | 主线程被长时间占用 |
| 三个 20ms Task 加 10ms 渲染 | 单个 Task 未超过 50ms | 可能记录 | 累积帧成本过高 |
| 120Hz 下 20ms 的帧更新 | 通常没有 | 不达到 50ms 阈值 | 仍可能严重超出 8.3ms 的刷新周期 |
| 总计 >50ms 但最终无需渲染 | 可能记录 | 可能记录，renderStart=0 | 不能假设存在样式布局阶段 |
| compositor 线程滚动 | 主线程可能很忙 | LoAF 可能有 | 用户可见滚动仍可能流畅 |

这是解释 LoAF 和 Long Task 为什么应联合使用的关键。**LoAF 数量不是 Long Task 数量，二者不是一一对应，也都不是标准掉帧数。**[[2]](https://developer.chrome.com/docs/web-platform/long-animation-frames)

### 【LoAF 的 duration 与 blockingDuration 不同】

LoAF.duration 是一次长帧记录的总持续时间，而 blockingDuration 是其对输入或其他高优先级任务的阻塞贡献，并非 duration - 50 的简单差值。官方算法会按组成帧的 Task 和最终渲染工作的相对时间计算。[[2]](https://developer.chrome.com/docs/web-platform/long-animation-frames)

**LoAF.duration 很高而 blockingDuration 低**，仍可能因为多个可让步的较短任务积累而使画面迟迟不更新；但它对输入的压力可能不同于单个 120ms 不让步的任务。

**LoAF.duration 与 blockingDuration 都很高**，不仅是 Smoothness 的风险，还应该联查 INP 的 Input Delay、Processing Duration 和 Presentation Delay。

LoAF 的 50ms 是记录门槛，不代表帧只有超过 50ms 才算掉帧。相关字段与记录机制亦可对照 W3C 工作草案。[[5]](https://www.w3.org/TR/long-animation-frames/)尤其在 90Hz/120Hz 下，远低于 50ms 的帧也可能错过重要更新。

## 4. 按 LoAF 的 Work、Pre-layout 与 Style/Layout 区间定位耗时阶段

### 【先找主要耗时区间，再查执行的具体工作】

~~~text
startTime：长帧工作起点
     ↓ Work Duration：渲染周期开始前的主线程工作
renderStart：渲染周期开始
     ↓ Pre-layout：rAF、视觉数据处理及布局前工作
styleAndLayoutStart：浏览器正式样式布局阶段开始
     ↓ Style/Layout 开始后的后续渲染相关工作
endTime = startTime + duration
~~~

官方第一层先拆 Work 和 Render；在有有效字段的 LoAF 中，再把 Render 拆为 Pre-layout 与 Style/Layout 开始后的区间。**Work 高**先看 JS/任务/GC；**Pre-layout 高**先看 rAF 回调、动画和组件提交及强制同步布局；**第三段高**再深入 Style、Layout、Paint 等 Trace。第三段不能直接认定为纯 Layout 时间，也不覆盖完整屏幕最终呈现；无 renderStart 的记录不能机械做三段减法。[[2]](https://developer.chrome.com/docs/web-platform/long-animation-frames)

### 【原生字段和边界】

Long Animation Frames API 提供的关键字段包括：

| 字段 | 含义 |
| --- | --- |
| startTime | 本次长帧相关工作起点 |
| duration | 长帧总时长，不含最终呈现时间 |
| renderStart | 渲染周期开始，包含 rAF 回调 |
| styleAndLayoutStart | 样式与布局计算开始 |
| blockingDuration | 对高优先级任务的阻塞贡献 |
| firstUIEventTimestamp | 与该帧关联的首个 UI 输入时刻 |
| scripts | 浏览器能够归因到的脚本信息 |

注意 renderStart 可能为 0（该次工作没有进入渲染周期）；styleAndLayoutStart 在某些情况下也不可用。不要假设每条 LoAF 都可以无条件减出完整的三个阶段。[[2]](https://developer.chrome.com/docs/web-platform/long-animation-frames)

### 【官方的两级结构与方便定位的三段解释】

定义：

~~~text
t0 = startTime
t1 = renderStart
t2 = styleAndLayoutStart
t3 = startTime + duration
~~~

官方第一层分解：

~~~text
有渲染周期时：
Work Duration   = t1 - t0
Render Duration = t3 - t1

没有渲染周期时：
Work Duration   = duration
Render Duration = 0
~~~

在 t1 和 t2 均有效且时序正常时，可以进一步形成：

~~~text
t0
 ↓ ① 渲染前的 Task/JS 等工作
t1 = renderStart
 ↓ ② 进入渲染周期后的布局前工作：rAF 回调等
t2 = styleAndLayoutStart
 ↓ ③ 样式布局开始后的剩余渲染相关工作
t3 = endTime
~~~

对应：

~~~text
① Pre-render Work       = t1 - t0
② Render Pre-layout     = t2 - t1
③ Style/Layout and Later = t3 - t2
LoAF Duration           = ① + ② + ③
~~~

第三段虽然有时被称为 Style and Layout Duration，但从一个时间区间不能直接确定全部毫秒都是 Layout 计算，它还可能包含相关后续工作；若想分别确认 Style、Layout、Paint、Compositor、GPU，必须进一步查看 DevTools Performance Trace。LoAF 的 duration 也不能视为显示器最终 Presented Frame Latency。[[2]](https://developer.chrome.com/docs/web-platform/long-animation-frames)

### 【Pre-layout 的主要工作是帧回调和布局前的同步状态更新】

LoAF 的三个区间必须根据**实际执行时间**分类，而不是根据业务函数名称判断。Pre-layout 指本次帧的渲染周期已经开始、正式样式布局阶段尚未开始的时间窗口：

~~~text
LoAF startTime
    ↓ Work：普通 JS Task 与渲染周期前的工作
renderStart
    ↓ Pre-layout：rAF 回调、动画数据更新、同步提交
styleAndLayoutStart
    ↓ Style/Layout 及后续相关工作
LoAF endTime
~~~

这一时间区间可能出现：

1. **rAF 回调执行**：根据当前时间计算动画状态、选择本帧需要执行的更新，以及少量同步数据计算。
2. **视觉状态准备**：动画插值、组件状态计算、根据变化集合更新相关数据。
3. **同步视图提交**：DOM 样式与结构修改、框架的同步工作、Canvas 或 WebGL API 的同步调用等。是否计入这一区间取决于它们何时执行。
4. **强制同步样式与布局**：如果在同一个 JS 回调里先写布局属性又立即读取 offsetWidth / getBoundingClientRect，可能使浏览器提前计算 Style/Layout，即使正式的 styleAndLayoutStart 尚未到达。

**不是所有视觉更新准备都算 Pre-layout。** 某个数据转换操作若发生在普通任务里、位于 renderStart 之前，就应看 Work；被 Worker 执行的计算不直接计入页面主线程 LoAF；某个 UI API 同步返回也不代表异步的渲染和屏幕呈现已经完成。[[2]](https://developer.chrome.com/docs/web-platform/long-animation-frames)

~~~js
const pendingChanges = [];

// 假设输入回调作为普通 Task 执行。
// 若它发生在 renderStart 之前，就属于 Work 区间。
function onUpdate(nextState) {
  pendingChanges.push(nextState);
}

function frame() {
  // 这里的同步执行若发生在正式 Style/Layout 之前，
  // 通常归入 Pre-layout 时间区间。
  const updates = pendingChanges.splice(0, 20);
  applyVisibleUpdates(updates);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
~~~

这只是用于说明任务时序的代码：实际工程不应在没有更新需求时无限循环 rAF，也不能假定 applyVisibleUpdates 的同步返回代表屏幕已经完成绘制。对于长帧中真正昂贵的函数，要继续查看 scripts 和 Performance Trace，而不是只凭 Pre-layout 数值做结论。

### 【完整算例】

假设：

~~~text
startTime = 1000ms
renderStart = 1065ms
styleAndLayoutStart = 1085ms
duration = 115ms
endTime = 1115ms
~~~

| 区间 | 计算 | 耗时 |
| --- | --- | ---: |
| 渲染前工作 | 1065 - 1000 | 65ms |
| 渲染周期布局前工作 | 1085 - 1065 | 20ms |
| 样式布局开始后的工作 | 1115 - 1085 | 30ms |
| 总 LoAF Duration | 1115 - 1000 | 115ms |

该例优先怀疑渲染前 Task 或 JavaScript 工作；还需 LoAF scripts、Long Task、Main Thread 调用树证明具体函数和工作量。单独凭 65ms 不能认定某一个函数一定是根因。

### 【Long Animation Frame Entry 的三阶段拆解代码】

~~~js
// 教学示例，不能直接在生产环境逐帧 console.log。
const observer = new PerformanceObserver((list) => {
  for (const e of list.getEntries()) {
    const end = e.startTime + e.duration;
    const hasRender = e.renderStart > 0;
    const hasLayout = hasRender && e.styleAndLayoutStart > 0;

    const work = hasRender
      ? Math.max(0, e.renderStart - e.startTime)
      : e.duration;

    const beforeLayout = hasLayout
      ? Math.max(0, e.styleAndLayoutStart - e.renderStart)
      : null;

    const afterLayoutStart = hasLayout
      ? Math.max(0, end - e.styleAndLayoutStart)
      : null;

    console.log({
      duration: e.duration,
      blockingDuration: e.blockingDuration,
      work, beforeLayout, afterLayoutStart,
      scripts: e.scripts
    });
  }
});

if (PerformanceObserver.supportedEntryTypes?.includes(
  'long-animation-frame'
)) {
  observer.observe({
    type: 'long-animation-frame',
    buffered: true
  });
}
~~~

这段代码通过原生 LoAF Entry 读取长帧对应的 Work、Pre-layout 和 Layout 开始后的三个时间区间。字段缺失时必须用 null 表示不可用，不能强行算出负数或虚构渲染阶段。该 API 只上报严重长帧，不能直接据此得到**全部正常帧**的三阶段分布；浏览器支持和缓冲区也限制了数据完整性。[[2]](https://developer.chrome.com/docs/web-platform/long-animation-frames)

### 【Script Attribution 可以定位哪些函数参与长帧】

LoAF.scripts 在满足浏览器归因条件时，可能包含 startTime、duration、executionStart、sourceURL、sourceFunctionName、sourceCharPosition、invokerType、forcedStyleAndLayoutDuration 和 pauseDuration。

这些字段可以回答：

- 哪个主线程脚本、事件处理器或 rAF 回调参与了长帧；
- 脚本执行多长时间，是否存在强制同步布局；
- 哪些脚本工作集中在 Render Start 之前或之后；
- 是否需要使用 Chrome Trace 进一步排查具体算法、框架更新或复杂布局。

但它不是完整 CPU Profile：跨源 iframe、Worker、Service Worker 或某些独立执行环境未必有 Script Attribution；GPU 工作、浏览器合成或部分渲染成本也不能被这些脚本字段全面解释。[[2]](https://developer.chrome.com/docs/web-platform/long-animation-frames)

## 5. 结合 JS、浏览器渲染、GC 与设备信号确定卡顿根因

### 【从阶段耗时映射到需要进一步检查的证据】

| 阶段或异常 | 常见现象 | 下一步证据 | 候选原因 |
| --- | --- | --- | --- |
| Work 高 | rAF 回调被推迟、长任务多 | Main Thread、Long Task、GC、LoAF scripts | 同步计算或消息回调占用 |
| Pre-layout 高 | rAF 回调与视图状态提交时间长 | JS Profile、Framework Profiler、Forced Layout | 动画逻辑、过量单帧工作、状态更新 |
| Style/Layout 后区间高 | 帧内渲染相关成本高 | Style、Layout、Paint、Rendering Trace | DOM/Canvas 更新范围过大 |
| JS 时间正常但视觉仍卡 | 复杂动画或图形场景不顺 | Raster、Compositor、GPU | 图形调用、纹理和合成成本 |
| 运行越久越卡 | Heap、存活对象或 GC 尖峰增长 | Heap Snapshot、Allocation Sampling、长期性能对照 | 内存保留、持续分配或重复更新 |

LoAF 时间位置只能提供候选方向，不能自动给出具体代码根因；需要相同时间范围的多种证据和受控实验。

### 【主线程渲染前工作过重】

**现象**：Frame Interval P95 增大、LoAF Work Duration 高、长任务与页面数据预处理时刻重叠。

**常见原因**：同步 JSON 解析、排序、批量数据转换、复杂循环、第三方脚本、GC、持续事件或定时任务占用主线程。

**诊断证据**：Long Task、LoAF.scripts、Main Thread、业务 User Timing、数据量和内存分配。

**优化方向**：减少重复工作、将大任务拆为可让出主线程的批次、控制消息频率，适合并行的非 DOM 计算可以考虑 Worker。

**边界**：Worker 不是 DOM 渲染优化器，还要支付数据传输和序列化成本。

### 【rAF 与框架视图提交过重】

**现象**：Render Pre-layout 区间高，每次 rAF 一次性处理过大数据，组件提交耗时持续增加。

**常见原因**：一次执行大量待更新任务、重复创建完整视图、过多组件同时提交，或响应式依赖影响范围过大。

**诊断证据**：LoAF Script Attribution、框架 Profiler、业务同步提交时长与更新次数。

**优化方向**：合并重复更新、减少每次提交的工作、把不紧急的更新分散到其他执行机会，并避免无意义的中间状态重复提交。

**边界**：requestAnimationFrame 只提供调度时机，不会自动把 100ms 同步任务切碎。

### 【Style、Layout、Paint 与像素更新成本】

**现象**：LoAF styleAndLayoutStart 后的时间较高，Trace 里存在大量 Layout / Paint。

**常见原因**：大 DOM、反复读写尺寸触发强制布局、复杂 CSS、Canvas 全量绘制、图层持续重新生成。

**诊断证据**：Chrome Rendering Track、Forced Style/Layout、Paint 区域、框架组件更新范围、可视对象数量。

**优化方向**：缩小 Layout 和 Paint 影响区域、虚拟化、批量 DOM 读写、增量更新、缓存静态图层。

**边界**：LoAF 第三个时间区间不能证明全部消耗都是 Layout；需要 Trace 判断具体瓶颈。

### 【Compositor、Raster、GPU 或刷新状态造成的瓶颈】

**现象**：主线程和业务 Callback 耗时不明显，实际 Canvas/WebGL 或页面滚动仍出现不连续。

**常见原因**：Draw Call、纹理上传、Raster 负荷、GPU 内存、图层复杂、变动的屏幕刷新率。

**诊断证据**：Chrome Frames、Raster、Compositor、GPU Tracks 和真实设备录制。

**优化方向**：减少图层和对象、控制像素更新区域、纹理复用、画质分级或按需渲染。

**边界**：rAF 和 LoAF 都不能完整测量最终屏幕呈现链路。[[1]](https://web.dev/articles/smoothness)

### 【GC 与对象分配压力：周期性停顿和长期内存增长是两类问题】

持续渲染中，GC（Garbage Collection，垃圾回收）并不是应用显式调用的业务任务，而是 JS 引擎为回收不可达对象付出的运行时成本。部分 GC 阶段会暂停主线程 JS，因此如果暂停与下一帧工作竞争，就可能推迟 rAF、状态提交和渲染准备，形成 Frame Interval 尖峰。V8 已采用分代、并发、并行和增量回收减轻暂停，但不能认为 GC 对主线程没有任何影响。[[6]](https://v8.dev/blog/trash-talk)

要区分两类表现：

| 问题 | 常见现象 | 需要验证的证据 | 优化方向 |
| --- | --- | --- | --- |
| Allocation Churn（频繁短生命周期分配） | Heap 频繁上涨/回落，间歇性掉帧 | GC Trace、Allocation Sampling、尖峰与帧时刻相关性 | 减少高频路径中不必要的临时数组、对象和复制 |
| Retained Memory（长期存活对象增加） | 页面运行越久占用越高，可能出现回收或重复计算成本增加 | Heap Snapshot、Retainers、存活对象和提交耗时 | 清理无效引用、减少不必要的长期驻留对象 |

例如一个动画更新函数每帧创建大量临时数组、转换全部可见对象数据，即使最终只改变少量视觉元素，也会产生多余的 CPU 工作与内存分配。减少不必要的中间对象有助于降低 GC 压力；但在 React/Vue 等框架中仍须遵守状态更新语义，不能为了避免分配而随意原地修改状态。

**“Heap 大”并不等于“GC 导致掉帧”。** 需要在 DevTools Performance 中证明 GC 事件与长帧或 rAF 尖峰重叠，再使用 Memory 的 Allocation Sampling、Heap Snapshot 找高分配函数和被持续保留的对象。Heap 锯齿是线索而非充分证据；合法保留的历史数据也不一定是泄漏。[[7]](https://developer.chrome.com/docs/devtools/memory-problems)

最后注意：LoAF 脚本归因里的 pauseDuration 不等于 GC Duration，它主要用于同步对话框、同步 XHR 等暂停时段；GC 归因依赖更具体的性能或内存记录，不能用该字段替代。[[2]](https://developer.chrome.com/docs/web-platform/long-animation-frames)

### 【内存问题需要从占用量、分配速率与存活对象三个维度理解】

页面卡顿与内存相关，但**内存占用量本身不是掉帧原因**。要把问题落到实际的帧生产过程，需要区分三个量：

| 观察维度 | 它实际上描述什么 | 与帧超时可能怎样相关 |
| --- | --- | --- |
| Heap Used / Live Set（堆使用量与存活对象集合） | 当前 JS Heap 已使用空间，以及 GC 后仍然可达、必须保留的对象 | 存活对象图扩大，可能增加标记、复制、引用更新的工作；也可能带来更多业务计算 |
| Allocation Rate（内存分配速率） | 单位时间新分配多少数组、对象、字符串等 | 年轻代可用空间更快被消耗，可能提高 Minor GC 的触发频率；对象创建本身也占 CPU |
| Heap Capacity / Available Space（堆容量与可用空间） | V8 为托管堆提供的容量以及还可继续分配的空间 | 影响 GC 与扩容的时机；空间紧张时可能需要更频繁的内存管理 |

其中 Live Set 需要结合 GC 后的存活对象与引用关系判断，不能直接把一次 Performance Memory 曲线的 Heap Used 当成“全部存活对象的精确数量”。浏览器整体内存还包括 DOM、图像、GPU 资源与其他原生分配，并不都能在 JS Heap 中看到。[[7]](https://developer.chrome.com/docs/devtools/memory-problems)

**高内存占用、频繁回收、内存泄漏、页面越来越卡**也不是同义词：

- 页面长时间稳定保留一批数据，只要设备内存充足、不增加关键帧的计算或绘制成本，可能依然流畅。
- 页面长期占用不大，但每帧创建大量短期对象，可能出现持续分配与周期性回收成本。
- 页面对象规模持续增长，导致每次要处理的内容越来越多，即使 GC 没有明显暂停，也可能造成单帧耗时增长。
- 系统或图形内存真正不足时，可能出现额外资源管理开销，且不一定反映在 JS Heap 曲线上。

因此分析内存问题要同时记录：分配、保留、回收与每帧实际工作量，而非只看一个 Heap Used 数字。

### 【GC 的可达性分析和分代回收决定其 CPU 与暂停成本】

GC 不能简单理解为“页面用过的对象都会被立即删除”。JavaScript 引擎从 GC Roots（根引用）出发，沿对象之间的引用关系识别仍然可达的对象；仍然可达的对象需要保留，已经不可达的对象才有资格回收。

~~~text
GC Roots（根引用）
   ├─ 当前调用栈与运行时持有的引用
   ├─ 全局应用状态及其嵌套引用
   └─ 仍处于有效状态的其他根引用
            ↓
       遍历可达对象图
            ↓
      ┌─────┴─────────┐
      ▼               ▼
  可达对象          不可达对象
  继续存活          可成为回收对象
      │               │
      └─────┬─────────┘
            ↓
  根据空间与回收策略执行清扫、复制或压缩整理
~~~

从实现机制看，常见的核心工作包括：

1. **Marking（标记）**：找到根引用能够到达的对象，识别存活集合。
2. **Sweeping（清扫）**：释放不可达对象占用的空间，使空闲区域可供后续分配。
3. **Copying / Evacuation（复制或迁移）**：某些回收阶段将存活对象移动到新区域。
4. **Compaction / Pointer Updating（整理与引用更新）**：在需要整理内存布局时移动对象，并维护有效引用。

这些步骤不是“每次 GC 都严格串行执行全部四步”。年轻代和老年代采用不同策略，一些任务可增量、并发或并行执行，具体实现也会随 V8 版本演进。它们的共同点是仍然需要计算资源，并且某些阶段会与主线程同步或暂停 JS。[[6]](https://v8.dev/blog/trash-talk)

V8 使用分代回收，主要基于大量新对象生命周期较短这一观察：

~~~text
新建数组和对象
      ↓
Young Generation（年轻代）
      ↓
Minor GC（较频繁地回收年轻代）
      ├─ 已不可达 → 释放所占空间
      └─ 仍存活 → 在年轻代保留或迁移
                         ↓ 经历多次回收后可能晋升
                  Old Generation（老年代）
                         ↓
                  Major GC（涉及更广的对象图）
~~~

年轻代回收的部分工作与**存活对象需要复制和追踪的规模**有关，因此不能把每次 Minor GC 的耗时简单理解为年轻代分配过的所有垃圾大小；老年代回收则可能包含更广范围的对象标记、整理与引用更新。V8 对这些阶段采用并行 Scavenger、并发标记与增量工作，以减少主线程停顿。[[8]](https://v8.dev/blog/orinoco-parallel-scavenger) [[9]](https://v8.dev/blog/concurrent-marking)

由此理解“为什么存活对象增多可能让回收变贵”：假如一个长期驻留的对象图包含更多仍然可达的节点与引用关系，在其他条件相近时，需要标记、复制或更新的对象可能更多。但**Heap 扩大一倍不意味着 GC 必然耗时翻倍**，还受代际分布、存活率、碎片化、回收时机、堆容量及并发策略影响。[[6]](https://v8.dev/blog/trash-talk)

### 【高频分配会带来年轻代回收压力，但短生命周期对象本身并非错误】

持续动画中经常需要计算新的状态。下面这段教学代码每次执行都会生成新数组及一批新对象：

~~~js
function updateAnimation(items) {
  const transformed = items.map(item => ({
    x: item.x + 1,
    y: item.y
  }));
  draw(transformed);
}
~~~

如果这段逻辑以较高频率运行，那么每次调用都包含两个独立成本：

- **立即发生的应用成本**：对象与数组分配、属性初始化、遍历及坐标运算。
- **之后可能发生的 GC 成本**：这些中间对象不再可达时，年轻代空间在持续分配下逐渐被填满，触发 Minor GC 处理仍然存活和需要回收的对象。

~~~text
高频视觉更新
    ↓ 每次分配大量临时数据
Young Generation 的可用空间快速减少
    ↓
更频繁触发 Minor GC 的可能性上升
    ↓
执行存活对象追踪、复制与引用维护等工作
    ↓
继续运行下一次视觉更新
    ↓
重复分配与回收
~~~

如果 GC 的同步暂停与动画更新竞争，会表现为 Frame Interval 的周期性尖峰；如果只是分配和对象转换本身太重，也可能在完全没有明显 GC 暂停时，令 rAF 回调或其他 JS 工作变慢。

一个常见线索是 Heap Used 随分配持续上升，GC 后又下降，形成锯齿曲线；但锯齿是自动内存管理的正常表现之一，**并不意味着每一次回落都发生了用户可见的掉帧**。只有 GC 的暂停时刻与异常帧相关，且减少分配/回收后帧结果实际改善，才能判断它是显著的流畅度瓶颈。[[7]](https://developer.chrome.com/docs/devtools/memory-problems)

**不要把 Array.map、临时对象或不可变状态更新一概当成低性能代码。** V8 对短生命周期对象的回收已有针对性优化；如果没有实测证据，强行改成复杂对象池，可能增加长期驻留对象与状态错误的风险。[[8]](https://v8.dev/blog/orinoco-parallel-scavenger)

### 【长期存活对象增多与真正的内存泄漏属于不同问题】

当对象仍能从 GC Roots 到达时，即使应用已经很少使用它，GC 仍无法自动判断其业务意义。必须区分三种状态：

| 状态 | 说明 | 需要怎样处理 |
| --- | --- | --- |
| 合理的长期存活数据 | 正在使用的状态、受控缓存或必要资源 | 正常保留，按场景测量成本 |
| Memory Bloat（不必要的内存膨胀） | 资源仍被合法引用，但数量或容量超过场景所需 | 缓存上限、按需加载、缩减驻留集合 |
| Memory Leak（内存泄漏） | 已无业务用途的对象仍被错误引用而不能释放 | 通过 Retainers 找到引用并清理 |

例如组件销毁后，如果其事件监听器仍挂在一个长期存在的全局对象上，并通过闭包持有较大的组件状态，原组件即使不再显示，仍然可能存活：

~~~text
Window / 持续存在的事件源
              ↓
         监听器函数
              ↓
        闭包中的引用
              ↓
     已不再使用的组件状态
              ↓
 相关 DOM、对象和其他资源可能继续保留
~~~

相反，一批业务仍需访问的缓存对象可能本来就应该存活，此时高 Heap 不等于泄漏。对持续运行后增长的对象，应通过 Heap Snapshot / Retainers 找到具体保留路径，判断对象是否仍具业务用途，而不能只把图表中向上的内存曲线称为泄漏。Chrome DevTools 明确区分 Leak、Bloat 和 Frequent Garbage Collections 这些不同的内存性能问题。[[7]](https://developer.chrome.com/docs/devtools/memory-problems)

长期存活对象增多可能通过两条不同路径影响流畅度：

~~~text
路径 A：回收管理成本
存活对象和引用关系扩大
    ↓
相关 GC 阶段的扫描、复制或整理成本可能增加
    ↓
部分暂停与画面更新竞争
    ↓
帧间隔尖峰

路径 B：应用每次更新的工作量
存活数据规模扩大
    ↓
业务计算/组件树/可视对象每次都要处理更多内容
    ↓
JS / Style / Layout / Paint 成本升高
    ↓
单帧更新更容易超出预算
~~~

**第二条即使完全没有 GC 暂停也可能成立。** 因此持续运行后 FPS 降低、Heap 同时增长，只能说明值得调查，不能直接证明是 GC 导致掉帧。

### 【非 JS Heap 的内存与设备内存压力也可能损害画面更新】

网页的内存占用不只来自 JavaScript 托管堆。DOM 与浏览器内部对象、图片解码缓存、ArrayBuffer 等二进制数据，以及图形纹理和缓冲资源，都可能占用额外内存；其统计归属与可观察方式因浏览器和 API 而异。

| 资源类别 | 典型资源 | 与流畅度的关系 |
| --- | --- | --- |
| JS Heap | 普通对象、数组、部分缓存 | 对象分配、GC、同步数据处理 |
| DOM 与浏览器原生资源 | 节点、布局结构、部分图像资源 | 可能扩大 Style/Layout/渲染工作或浏览器内存占用 |
| ArrayBuffer / TypedArray 等 | 大块二进制数据 | 可能带来额外内存、复制、数据转换与资源管理成本 |
| 图形与 GPU 资源 | 纹理、图形缓冲、Frame Buffer 等 | 可能增加上传、重建、栅格化或显存压力 |

如果某页面同时拥有越来越多 DOM 元素或图形资源，内存增长可能是页面结构扩张的结果，而真实帧瓶颈来自每次要管理、布局或绘制的对象数量。不能看到 Heap Used 没明显增加就排除浏览器原生资源或 GPU 方面的性能问题。

当设备的可用物理内存真正紧张时，操作系统也可能进行更频繁的内存回收、压缩或换入换出等工作，给 CPU 和内存访问带来额外等待。并不是页面一达到某个固定 MB 数字就必然发生这些行为：不同设备、操作系统、浏览器进程结构、可用内存和其他应用负载都有影响。因此无统一的“超过 X MB 一定卡顿”阈值，需要在目标设备上复现和测量。[[7]](https://developer.chrome.com/docs/devtools/memory-problems)

### 【内存相关开销最终如何进入 Frame Budget 与 LoAF 时间轴】

以目标 60Hz 的连续动画为例，理论显示刷新周期约 16.7ms，业务每帧需要完成必要工作才能按期呈现。

假设某一帧的相关同步工作原本是：

~~~text
JS 动画状态更新             5ms
样式、布局和相关渲染工作     6ms
-------------------------------
示意合计                   11ms
~~~

如果这时发生一个需要主线程暂停 12ms 的 GC 阶段，示意工作量变成：

~~~text
JS 动画状态更新             5ms
GC 同步暂停                12ms
样式、布局和相关渲染工作     6ms
-------------------------------
示意合计                   23ms
~~~

这已经超过约 16.7ms 的显示刷新周期，新的重要视觉更新**可能**无法赶上预期刷新机会。这里的数字只是用于理解竞争关系，实际浏览器工作可能跨线程重叠、由异步引擎继续执行，不能直接用所有 API 耗时相加计算最终屏幕 Presentation。

更重要的是：**12ms 的 GC 暂停没有达到 50ms，但仍可能使一帧超预算。** 因此不存在 LoAF 记录不代表 GC 不影响持续动画；需要结合 rAF Frame Interval 和性能跟踪调查。

GC 并不“固定属于 LoAF 三阶段中的某一阶段”，位置取决于实际执行时刻：

| 异常阶段 | 可能的 GC 关系 | 验证方式 |
| --- | --- | --- |
| Work Duration 高 | 普通 Task 内的 GC 工作与渲染周期前工作重叠 | Main Thread、GC 事件、任务调用链 |
| Pre-layout 高 | rAF 期间的应用计算和内存分配，可能伴随 GC 暂停 | LoAF Script、GC Trace、业务 rAF 时间 |
| Style/Layout 开始后异常 | 渲染管线或其周边出现其他工作竞争；不能凭区间判断是 GC | Rendering Trace、GC Event、线程时间轴 |
| LoAF 不存在但 Frame Interval 异常 | 未达到 50ms 的暂停或多段短工作仍可能超预算 | rAF 与 Chrome Frames/CPU Trace |

尤其要注意：LoAF 的 scripts[].pauseDuration **不是 GC Duration**。它主要关联同步暂停场景，不能直接把这一字段当作垃圾回收时间。判断 GC 是否引发卡顿，需要从 Performance Trace 中查找相应的 GC 工作以及对应的帧异常。[[2]](https://developer.chrome.com/docs/web-platform/long-animation-frames)

### 【从内存增长到掉帧必须依靠完整的证据链】

可以按照以下顺序判断问题类型：

~~~text
用户在持续动画中观察到卡顿、偶发停顿或长期退化
                    ↓
Frame Interval P95 / Longest Gap 是否异常？
                    ↓
Chrome Performance 的同一时间范围发生了什么？
          ├─ GC 暂停或内存回收热点明显
          │      ↓
          │  Allocation Sampling：哪些函数大量分配？
          │      ↓
          │  Heap Snapshot / Retainers：哪些对象持续存活？
          │      ↓
          │  减少候选分配或释放无效引用并复测
          │
          ├─ GC 不明显，JS/Style/Layout/Paint 却越来越重
          │      ↓
          │  检查每次更新处理的对象量和可视元素范围
          │      ↓
          │  减少重复处理或更新范围并复测
          │
          └─ 主线程无法解释全部视觉异常
                 ↓
             检查 GPU/Compositor、设备内存压力
                    ↓
比较 Frame P95、GC 时间、CPU/渲染耗时和最终体验
~~~

诊断时应区分四类证据：

| 证据 | 能说明什么 | 不能单独证明什么 |
| --- | --- | --- |
| Heap Used 曲线及 GC 后基线 | 当前堆使用量和可能的长期驻留变化 | 不能单独证明内存泄漏 |
| Allocation Sampling | 哪些 JS 函数产生了大量分配 | 不能直接证明这些分配使用户卡顿 |
| Heap Snapshot / Retainers | 对象为何仍然可达、谁保留引用 | 不能直接给出每帧 Rendering Duration |
| GC Event 与 Frame Trace 时间重合 | GC 是异常帧的合理候选因素 | 仍需排除同期其他耗时工作并做对照 |
| CPU / Layout / Paint / GPU Trace | 是否因数据或可视对象规模造成更大的更新成本 | 不等于一切退化都来自 GC |

在实验中可以分别尝试减少高频临时分配、释放不再需要的对象、降低单次更新所需的数据处理规模。其它工作负载保持可比后，若 GC 活动下降、帧间隔尖峰也改善，才能更有把握确认 GC 是主要瓶颈；如果分配下降了却没有改善帧稳定性，则要继续调查同步计算、渲染或设备瓶颈。


### 【测量条件不成立引起误判】

后台标签 rAF 可能暂停；静态页面并不需要持续更新；低功耗或可变刷新率模式可能改变采样间隔。这些都要求先确认页面有重要的持续视觉更新需求，再评价目标 FPS。

## 6. 根据已定位的瓶颈选择渲染与运行时优化策略

### 【优化的目标是减少必要工作的成本，而不是机械提高 FPS】

分析从视觉异常进入了 rAF 与 LoAF 时间阶段，完成 JS、渲染、合成或内存证据的验证以后，才能合理选择优化。不同瓶颈的优化目标不同：有的要减少**任务总量**，有的要减少**单次执行峰值**，有的要减少**不必要的重复渲染**，还有的要控制**长期内存和对象生命周期**。

| 根因类型 | 典型问题 | 对应的优化方式 | 验证指标与副作用 |
| --- | --- | --- | --- |
| Work：同步任务阻塞 | 大计算或第三方脚本连续占用主线程 | 删除重复计算、缩短同步路径、拆分非紧急任务；适用时使用 Worker | Long Task、Work、INP；Worker 有传输成本 |
| Pre-layout：动画回调过重 | 每次 rAF 都做大量计算与组件更新 | 只处理变化数据、缓存可复用结果、合并更新、限制每次同步处理量 | Pre-layout、回调耗时、Frame Interval；过度拆分也有成本 |
| 强制同步 Style/Layout | DOM 写后立即读取布局，反复触发计算 | 集中读取几何信息、批量修改样式、减少反复读写 | Forced Style/Layout、Trace；确保状态一致 |
| Style/Layout 成本 | DOM 规模或样式依赖范围过大 | 减少同时参与布局的节点、虚拟化、调整隔离边界 | Style/Layout 耗时；注意滚动与可访问性 |
| Paint/Raster/Composite 成本 | 像素变化区域大、图层与视觉效果复杂 | 缓存静态内容、减少绘制区域、恰当使用合成动画、控制图层数量 | Paint/Raster/GPU 和真实回放；缓存可能增加内存 |
| GC / 内存成本 | 高频临时对象、无效长期引用 | 降低不必要的 Allocation、及时清理监听器/资源、控制对象生存期 | GC/Allocation/Heap 与帧尖峰相关性 |
| 频繁视觉更新 | 相同结果在短时间内重复提交 | 合并非必要更新、按视觉变化需求调度、减少冗余提交 | 视觉时效与单次成本；不要牺牲交互响应 |
| 长期运行成本增长 | 可见对象和保留状态持续扩大 | 按需管理活跃对象、增量处理、减少重复计算与绘制 | 长时间样本中的 Frame P95、Heap 与 CPU 趋势 |

这些是从浏览器运行时机制中抽取的通用问题类别。不同业务的输入形式、数据结构和图形引擎接口不同，不能以某个项目的参数模型代替通用诊断过程。

### 【长任务调度优化应兼顾交互响应和连续视觉更新】

当 Work 阶段以 CPU 密集计算为主时，单纯把计算放进 rAF 不会使任务变轻；它只改变执行时机。如果 70ms 计算不需要在当前帧同步完成，可将其拆为能够让出主线程的非紧急片段，或者在数据边界允许时转移到 Worker。

但如果拆得太细、每段都带来调度开销，也可能损害总体吞吐；如果使用 setTimeout 而没有优先级策略，非关键任务仍可能占用关键交互与动画时刻。所以优化时应同时测量 Long Task、INP、Frame Interval P95 与完成必要业务工作的总时间。

### 【动画和绘制优化应遵循最小必要视觉更新】

Pre-layout 中的工作可以通过减少每次 rAF 中的计算、避免对没有变化的元素提交更新来降低；Style/Layout 中可以通过缩小 DOM 影响范围来降低；Paint 与合成中则应考虑变化像素区域、图层复用和 GPU 工作。

渲染代码采用 transform/opacity 不必然让所有视觉效果都无成本，依然应关注合成图层内存、动画时长以及是否发生 GPU 压力。只有监测到对应瓶颈，才能说明某项缓存、隔离或动画属性调整是否有效。[[3]](https://web.dev/articles/rendering-performance)

### 【内存和 GC 优化需要先证明造成了可见卡顿】

内存优化不能简单用“尽可能降低 Heap Used”作为唯一目标，而要对应具体成本：

~~~text
Allocation Rate 过高
    → 减少高频执行路径里的无意义临时分配
    → 验证 GC 压力及同步任务成本是否下降

Live Set 过大 / 被错误引用
    → 找出无效保留路径、释放不再需要的引用
    → 验证 GC 后基线、Major GC 与长期运行是否改善

对象总量持续扩大导致计算变重
    → 优化每次更新的处理范围或采用增量计算
    → 验证单次更新的 CPU / Style / Layout / Paint 时间是否下降

浏览器原生或 GPU 资源压力
    → 清理资源、复用可复用内容、降低不必要驻留
    → 验证对应资源占用与真实图形帧是否改善
~~~

高 Heap 或锯齿曲线不能直接证明 GC 导致掉帧。应先确认 GC 与帧异常重叠，再定位高分配函数和无效引用，最后通过受控实验比较 GC、Frame Interval 与用户感知；如果没有对应改善，要继续检查渲染路径。[[6]](https://v8.dev/blog/trash-talk) [[7]](https://developer.chrome.com/docs/devtools/memory-problems)

### 【减少高频无意义分配要兼顾状态正确性和总工作量】

优先检查高频执行路径内重复创建大型临时集合、进行多次数据格式转换、反复复制不变的数据和重新构建无变化的计算结果：

~~~js
// 对当前全部输入多次产生中间集合：有可能造成高频分配。
function computeFrame(items) {
  const filtered = items.filter(item => item.visible);
  const mapped = filtered.map(item => calculate(item));
  return mapped;
}
~~~

当 Profile 证明这里是瓶颈后，可考虑根据变化集合进行计算、缓存稳定结果、减少多余中间数据传递，或将计算移动到较少占用关键帧的时机。**优化不是把所有 filter/map 改成 for 循环，也不是禁止创建临时对象**：两种写法都可能分配必要的结果数组，性能还取决于数据规模、引擎优化与更新频率。

如果部分处理结果被框架、组件或其他代码视为不可变对象，直接把原数组原地修改可能破坏变更检测和状态共享语义。应先检查当前数据的所有权、生命周期和 API 契约，再决定是否通过复用对象、增量结果或合并更新来降低分配。

### 【清理引用与控制缓存规模要区分泄漏和合理驻留】

真正的资源泄漏，应在组件或功能生命周期结束时释放其不再需要的引用：

~~~js
function setupFeature(target) {
  const onResize = () => updateLayout(target);
  window.addEventListener('resize', onResize);

  // 当使用者销毁功能时，应显式执行清理。
  return () => {
    window.removeEventListener('resize', onResize);
  };
}
~~~

这段代码强调的是监听器的生命周期必须与功能生命周期对应，而不是断言所有监听器都会泄漏。类似原则适用于已经结束的订阅、定时器、长时间存在的缓存、Observer、DOM 引用及特定 API 的显式销毁函数。

缓存则要区分**正确的缓存复用**与**没有生命周期或容量边界的无限增长**：只有当缓存持续增长且导致不必要驻留、额外计算或设备压力，才有理由引入有界缓存、按需淘汰、懒加载或工作集收缩。单纯清空缓存可能使数据重复计算与重新下载更频繁，反而增加 CPU、网络或帧负担。

对象池同样不是通用解法：它可能减少频繁创建大型对象的成本，但也会使更多对象保持存活。需要比较分配节省、对象重置复杂度、长期占用、GC 与整体 Frame Stability，再决定是否采用。

### 【内存、GC 和每帧工作量的优化效果必须分别验收】

| 优化动作 | 优先验证的过程证据 | 最终必须改善的用户结果 |
| --- | --- | --- |
| 降低临时对象分配 | Allocation Rate、Minor GC 频率、相关 CPU 工作 | 异常帧频次、Frame Interval 尾部 |
| 清理错误引用 | Heap Snapshot、Retainers、GC 后基线 | 长期运行稳定性，不出现持续退化 |
| 控制无上限缓存 | 资源驻留规模、缓存命中与重新计算成本 | 帧稳定性、内存稳定性及功能正确性 |
| 对变化数据做增量计算 | 每次更新的处理对象量与同步执行时间 | 实际视觉更新时延与 FPS 稳定性 |
| 释放图形资源 | 原生/GPU 资源占用、Raster/Compositor 数据 | 图形场景下的真实画面稳定性 |

一个优化即使降低了内存使用量，也不必然提高页面 FPS；反过来，即使 Heap Used 几乎不变，减少重复计算也可能显著改善 Frame Interval。性能结论需要沿“根因证据 → 操作 → 相同条件结果”的因果链闭环。

当诊断涉及特定图形引擎的增量资源更新时，可以参考[实时轨迹持续渲染的项目专项分析（草稿）](./项目分析-实时轨迹持续渲染与历史数据性能-草稿.md)查看实现粒度与测量边界；案例不构成本节优化原则的定义依据。


## 7. 通过实验和真实用户数据验证流畅度优化效果

### 【从观测结果建立可复现、可证伪的原因假设】

完成阶段归因后，必须将诊断表达为明确的因果假设，例如：

~~~text
观察到：活动动画窗口的 Frame Interval P95 明显上升
    ↓
记录 LoAF：多数长帧集中在 Work 或 Pre-layout
    ↓
定位到某类同步执行工作与异常时间段重叠
    ↓
假设：该类工作导致关键视觉更新超过截止时间
    ↓
固定设备、页面和视觉变化，减少或移除这类工作
    ↓
比较 LoAF 阶段耗时、Frame Interval、视觉录制和交互响应
    ↓
判断假设得到支持，或继续调查其他原因
~~~

如果仅仅做完某个优化动作却没有对比原始问题，是无法证明方案真实提升了用户视觉体验的。GC、强制布局、绘制、合成等原因，也应按同一套实验逻辑验证。

### 【实验应按所怀疑的瓶颈改变一个关键条件】

| 对照实验 | 适用诊断方向 | 主要判断 |
| --- | --- | --- |
| 空闲基线与持续视觉变化对照 | 浏览器基础成本与动画需求 | 是否是持续视觉更新带来的压力 |
| 业务回调空执行 / 实际执行对照 | rAF 或业务同步计算 | JS 本身是否占据了主要帧预算 |
| 原始 DOM 更新 / 限制影响范围 | Style / Layout | 布局范围是否放大耗时 |
| 保留/关闭复杂视觉效果 | Paint / Composite / GPU | 视觉渲染效果是否主导瓶颈 |
| 正常分配 / 减少临时对象 | GC / 分配压力 | GC 次数、暂停与帧尖峰是否下降 |
| 新开页面 / 长期运行 | 资源生命周期与内存 | 是否存在随运行时长加重的问题 |
| 低端/高刷新率设备对照 | 设备预算差异 | 优化是否覆盖目标使用环境 |

实验必须固定其他条件，记录浏览器版本、设备负载、页面可见性、视口、网络与交互序列。对每个候选根因，也应该能描述“如果这个假设正确，哪一个诊断指标应显著变化”。

### 【DevTools 应按现象进入分配、存活对象与 GC 时间归因】

Chrome DevTools 提供不同视角的证据，必须根据当前问题选择正确工具，而不是只打开 Heap Snapshot 找最大的对象。

#### <u>1. 先用 Performance 证明内存事件与异常帧有关</u>

在能重现问题的设备和场景中，同时记录视觉异常发生的时间与 Performance 时间线：

- 比较相同活动窗口下的 Frame Interval P95、最长停顿与 LoAF 分布。
- 在异常区间查看 JS Task、GC 相关事件、主线程调用与 Rendering Track。
- 如果 GC 与 rAF 停顿时间重叠，形成合理的候选假设；如果 GC 没有明显参与，则优先查同步计算、布局或图形工作。
- 不把一次 LoAF 的 pauseDuration 直接当成 GC Duration，也不以 LoAF 缺失排除低于 50ms 的 GC 影响。

这里只证明**时间相关性**，随后还要用具体分配来源或受控调整证明因果。[[2]](https://developer.chrome.com/docs/web-platform/long-animation-frames)

#### <u>2. 用 Memory Allocation Sampling 确认是谁大量分配</u>

Memory 面板的 Allocation Sampling 可以按函数统计分配情况。先确定需要观察的活动操作与采样时长，再重点寻找：

- 是否有高频函数不断创建新的大型集合；
- 哪些计算结果本可以按需复用却每次都重新生成；
- 是否有初始化、订阅或渲染更新函数反复分配相同类别对象。

这只能说明“谁在分配”，并不保证这些分配会被长期保留或造成卡顿。需要同时查看 Performance 中的 GC 与帧变化。[[7]](https://developer.chrome.com/docs/devtools/memory-problems)

#### <u>3. 用 Heap Snapshot 与 Retainers 判断对象为什么还活着</u>

对于长期运行内存持续增长，需要在相似的页面状态、相似的浏览器条件下比较快照，并追踪异常对象的 Retaining Path：

~~~text
长期运行后 Heap Used 基线增加
        ↓
某一类对象数量持续增长
        ↓
Heap Snapshot / Retainers 检查引用
        ↓
是否仍有业务需要？
  ├─ 是：判断缓存容量和每次更新成本是否合理
  └─ 否：定位未解除的监听、订阅、闭包或其他引用
        ↓
释放无效引用，重复同样操作与回收对照
~~~

不能假设 GC 后 Heap Used 必须回到页面初始化时的数值；正常缓存、惰性初始化以及浏览器运行时本身就可能保留必要对象。Heap Snapshot 也具有测量开销，调查时应尽可能避免把其开销与用户正常帧指标混在一起。[[7]](https://developer.chrome.com/docs/devtools/memory-problems)

#### <u>4. 区分高分配、长期驻留和每帧计算成本三种结果</u>

| 检查结果 | 优先假设 | 下一步对照 |
| --- | --- | --- |
| 分配速率高、Heap 回落明显、GC 与帧尖峰重叠 | 高频短生命周期对象 + 回收压力 | 减少一处高分配工作，比较 GC 与 Frame P95 |
| GC 后 Heap 基线持续升高，异常引用路径明确 | 多余长期存活对象或泄漏 | 清理引用并比较对象数和长期帧结果 |
| GC 不突出，但 JS/布局/绘制成本随对象量增长 | 重复处理的数据/视图工作集合扩大 | 限制更新范围，比较单帧 CPU 与 Rendering 时间 |
| JS Heap 不高但设备仍存在图形卡顿 | 原生、图形资源或设备内存压力 | 检查 GPU/Compositor 和目标设备条件 |

必须保留**没有内存问题、只是其他工作超帧预算**这一分支。只有当优化前后的证据同时支持内存相关成本与流畅度改善时，才在文档中将其表述为原因。


### 【RUM 需要分清结果指标与异常诊断明细】

Smoothness 目前没有统一 Core Web Vital。线上可以保留受控活动窗口的观察数据：

~~~text
Context：App / Version / Route / View / Device / Browser
     ↓
Sampling Context：是否有重要连续更新、Visibility、目标刷新周期
     ↓
Result：rAF FPS、Frame Interval P95、Longest Gap、超预算比例
     ↓
Diagnosis：LoAF Count / Duration / Blocking / Work / Pre-layout
           Long Task / Scripts Attribution、可用时的用户计时信息
     ↓
可选业务语义：关键视觉更新延迟（只有业务明确需要时才采集）
~~~

结果中的 rAF FPS 只是主线程动画回调密度，不能冒充真实 Presented FPS；LoAF 只代表超过 50ms 的长帧，缺乏 LoAF 不等于未发生超过刷新预算的更新延迟。LoAF Rate 等自定义频次必须说明分母和采样窗口，不能混算不同刷新率和有/无动画需求的用户。

### 【监控 SDK 不能因为观测本身引入新的长帧】

采样时应有界、按需：仅对需要连续更新的活动窗口使用短时 rAF 测量，页面 hidden 时暂停并重置上一帧时间戳；避免逐帧触发网络请求、打印日志、读取布局或做昂贵统计。LoAF 诊断可以低成本收集异常帧，但也需要限制采样量、过滤 URL/函数来源中的敏感信息、标识浏览器不支持和缓冲数据缺失。

### 【最终必须回到用户视觉体验与跨指标验证】

**Lab** 使用 Chrome Performance 录制 Main、Frames、Rendering、Raster、Compositor、GPU、Memory，结合场景录像和复现实验验证哪种工作消耗了预算。

**Field** 按浏览器、设备、路由、刷新目标与视觉活动窗口分群，验证 Frame Interval P95、Jank、Longest Gap 等是否改善，同时关注 INP、页面可用性和业务正确性；如果视觉节奏改善但用户交互变慢，不能认定为完整成功。

~~~text
视觉异常是否减少？
    +
导致异常的具体阶段时间是否下降？
    +
交互与功能是否依旧正确？
    ↓
三者一致才形成可靠的流畅度优化结论
~~~

## 8. 与其他用户体验和现有知识文档建立关系

### 【四类体验指标分别回答不同的问题】

| 体验维度 | 主要结果与诊断 |
| --- | --- |
| Loading | LCP 与文档、资源、渲染延迟 |
| Responsiveness | INP 与输入等待、处理、呈现延迟 |
| Visual Stability | CLS 与 Layout Shift、Session Window、根因 |
| Smoothness | 重要视觉更新需求、Frame Interval、LoAF 与帧阶段归因 |

LoAF 有助于分析交互的长帧贡献，但不能将它直接当成 INP；Smoothness 自定义 rAF 指标也不属于既有 Core Web Vitals。[[10]](https://github.com/GoogleChrome/web-vitals)

### 【通用知识入口与专项分析边界】

本稿是第四类用户体验的通用知识草稿，暂不写入知识体系索引、QA 或正式正文。

- [Loading / LCP 诊断草稿](./Loading-LCP四阶段性能诊断与优化体系-草稿.md)：加载时延与阶段归因。
- [Responsiveness / INP 诊断草稿](./Responsiveness-INP三阶段交互响应性能诊断与优化体系-草稿.md)：交互延迟的分段与诊断。
- [Visual Stability / CLS 诊断草稿](./Visual-Stability-CLS视觉稳定性诊断与优化体系-草稿.md)：布局偏移的计算、来源与真正根因。
- [Web 性能优化完整知识体系](../W-Web性能优化完整知识体系.md)：整个 Web 页面性能框架。
- [性能测量与真实用户监控专项](../X-性能测量与真实用户监控专项.md)：监控 SDK、PerformanceObserver 和 RUM。
- [页面流畅度与连续渲染性能完整知识体系](../Y-页面流畅度与连续渲染性能完整知识体系.md)：现有相关知识积累，其中偏向实时可视化的项目性方法不应被当作本稿的通用主线。

专项场景只在机制对应位置提供必要链接，**不以项目中的参数、代码组织或优化结果反向定义通用知识框架**。

## 9. 参考文献

1. Google / web.dev. [Towards an animation smoothness metric](https://web.dev/articles/smoothness). 动画流畅度、重要视觉更新、合成线程与 FPS 局限。
2. Chrome for Developers. [Long Animation Frames API](https://developer.chrome.com/docs/web-platform/long-animation-frames). LoAF 50ms 记录门槛、Work / Render 分解、Pre-layout、Scripts 与 Blocking Duration。
3. Google / web.dev. [Rendering performance](https://web.dev/articles/rendering-performance). Frame Budget、渲染阶段与主线程更新成本。
4. MDN. [requestAnimationFrame](https://developer.mozilla.org/en-US/docs/Web/API/Window/requestAnimationFrame). rAF 时间戳、刷新率与后台暂停。
5. W3C. [Long Animation Frames API Working Draft](https://www.w3.org/TR/long-animation-frames/). Long Animation Frames 标准草案。
6. V8. [Trash talk: the Orinoco garbage collector](https://v8.dev/blog/trash-talk). 分代、增量、并发 GC 与主线程暂停。
7. Chrome for Developers. [Fix memory problems](https://developer.chrome.com/docs/devtools/memory-problems). Heap、Allocation、Retainers 和 GC 的诊断。
8. V8. [Orinoco: young generation garbage collection](https://v8.dev/blog/orinoco-parallel-scavenger). Young Generation、Scavenger、存活对象复制与回收。
9. V8. [Concurrent marking in V8](https://v8.dev/blog/concurrent-marking). 增量和并发标记、主线程暂停与内存压力。
10. GoogleChrome / web-vitals. [Official project and attribution information](https://github.com/GoogleChrome/web-vitals). Web Vitals 和性能归因的边界。
