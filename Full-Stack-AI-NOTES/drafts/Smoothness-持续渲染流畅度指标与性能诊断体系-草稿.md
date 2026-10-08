# Smoothness 持续渲染流畅度：帧稳定性指标与长帧诊断体系（草稿）

> 草稿状态：第四类用户体验独立讨论稿，暂不加入知识体系索引、QA 或正式知识正文；示例数值均不代表真实项目结果。
>
> 分析主线：持续视觉更新需求 → 帧预算与渲染调度 → 结果指标发现异常 → LoAF、Long Task、Trace 等诊断 → 定位渲染压力 → 优化 → 验证。
>
> 核心认识：Smoothness 没有与 LCP、INP、CLS 等价的统一 Core Web Vital。必须分别观察帧稳定性（结果）、数据更新是否追得上（过程）、为什么某帧超时（诊断）。

## 1. Smoothness 的体验目标与持续帧生产机制

### 【四类用户体验分别关注不同问题】

| 维度 | 核心问题 | 结果指标 |
| --- | --- | --- |
| Loading | 主要内容何时出现？ | LCP |
| Responsiveness | 操作后何时获得视觉反馈？ | INP |
| Visual Stability | 既有内容是否发生非预期位置变化？ | CLS |
| Smoothness | 重要画面变化能否连续、及时呈现？ | 场景化 Frame 稳定性指标集合 |

只有存在重要的连续视觉更新时，帧节奏才具有用户体验意义。静态文章没有每帧动画需求，即使 rAF 回调很少也不代表卡顿；地图移动、拖拽、实时轨迹、Canvas/WebGL 动画或持续更新图表则依赖稳定更新。

~~~text
用户操作 / 动画状态 / 实时数据
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

### 【实时展示还必须区分帧节奏和数据时效】

~~~text
数据产生 → 网络接收 → 待处理队列
                         ↓
                    分批消费与提交
                         ↓
                     更新视觉画面
~~~

页面可以持续 60 FPS，却因为队列延迟越来越大而显示旧数据；也可以很快消费所有数据，但单次巨大更新让画面不断卡顿。因此对于实时展示，要同时考核 Visual Continuity（视觉连续性）、Data Freshness（数据新鲜度）与 Interaction Quality（交互质量）。

## 2. Frame Budget 和 rAF 时间间隔提供基础测量尺度

### 【刷新率决定理论帧预算，不应硬编码 16.7ms】

刷新周期可近似表达为：Frame Interval = 1000 / Refresh Rate。

| 显示刷新率 | 理论间隔 |
| --- | ---: |
| 60Hz | 16.67ms |
| 90Hz | 11.11ms |
| 120Hz | 8.33ms |
| 144Hz | 6.94ms |

这是显示刷新机会间隔，不等于 JS 可以独占的执行预算；浏览器内部工作需要时间，设备可能出现可变刷新率或节能限频。一个 20ms 的视觉工作，在 60Hz 和 120Hz 条件下造成的超预算程度不同。[[2]](https://web.dev/articles/rendering-performance)

### 【rAF 提供的是下一次绘制前的调度机会】

requestAnimationFrame 会在浏览器下次重绘之前尝试调用传入的函数；持续注册可形成相邻回调时间戳之差 ΔrAF。浏览器通常按刷新率调度，但后台标签或隐藏 iframe 会暂停或降低频率。[[3]](https://developer.mozilla.org/en-US/docs/Web/API/Window/requestAnimationFrame)

必须区分：

| 术语 | 含义 | 注意事项 |
| --- | --- | --- |
| rAF Frame Interval | 相邻 rAF 时间戳之差 | 不是实际的一帧 Paint 耗时 |
| rAF FPS | 单位时间 rAF 回调次数 | 不是显示器最终 Presented FPS |
| rAF Callback Duration | 回调内部同步执行时间 | 不包含全部布局、绘制和 GPU 工作 |
| Application Commit Duration | 框架或图库一次提交工作时间 | 部分 API 只是排队，不保证画面已呈现 |
| Chrome Frame / Compositor Trace | 更靠近真实帧生成和呈现 | 通常需要实验室录制 |

Frame Budget 不满足时可能出现显示更新延后或旧帧重复，但不能仅凭一次 ΔrAF 超预算就断言精确丢了几帧，因为浏览器还有合成路径、屏幕刷新与可变调度。[[1]](https://web.dev/articles/smoothness)

## 3. Smoothness 的指标体系必须分为结果、过程和诊断

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

### 【过程指标反映能否追上业务视觉更新需求】

| 过程指标 | 诊断目的 |
| --- | --- |
| Data Arrival Rate | 数据有多快进入系统 |
| Consume / Commit Rate | 页面单位时间真正处理或提交多少工作 |
| Queue Length / Oldest Queue Age | 数据是否持续积压，画面是否越来越旧 |
| Batch Size | 每次渲染提交多少点或元素 |
| Commit Duration P95 | 业务视图提交是否在超出安全预算 |
| Visual State Age | 当前画面相对业务最新状态落后多久 |
| Render Request Rate | 每秒需要或实际请求多少次视觉更新 |
| Historical Visible Object Count | 有多少历史对象仍参与绘制 |

结果帧节奏正常、Queue Age 持续增长并不是健康实时页面。过程指标应与帧结果指标同时查看。

### 【诊断指标查明具体成本】

Long Task（单个主线程长任务）提供任务级阻塞线索；LoAF（Long Animation Frame，长动画帧）提供帧级时间归因；Chrome Performance Trace、LoAF Script Attribution、强制同步布局、GC、Paint / GPU 和组件 Profiler 用于进一步定位具体原因。**LoAF 的 50ms 不是流畅度预算，也不是 Long Task 的计数。**[[4]](https://developer.chrome.com/docs/web-platform/long-animation-frames)



## 4. rAF 的采集和统计必须避免把调度间隔误读成渲染耗时

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

## 5. Long Task 与 LoAF 是两种不同观察范围的 50ms 诊断信号

### 【Long Task 是任务级证据，LoAF 是长帧级证据】

Long Tasks API 面向主线程 Task。一个持续执行超过 50ms 的任务可能阻碍新输入、rAF 和页面渲染。LoAF 则从帧更新角度记录总计超过 50ms 的工作，即使它由多个较短 Task、rAF 回调和布局工作累积而成。

| 假设情况 | Long Task | LoAF | 判断意义 |
| --- | --- | --- | --- |
| 单个同步计算 90ms | 可能记录 | 也可能记录 | 主线程被长时间占用 |
| 三个 20ms Task 加 10ms 渲染 | 单个 Task 未超过 50ms | 可能记录 | 累积帧成本过高 |
| 120Hz 下 20ms 的帧更新 | 通常没有 | 不达到 50ms 阈值 | 仍可能严重超出 8.3ms 的刷新周期 |
| 总计 >50ms 但最终无需渲染 | 可能记录 | 可能记录，renderStart=0 | 不能假设存在样式布局阶段 |
| compositor 线程滚动 | 主线程可能很忙 | LoAF 可能有 | 用户可见滚动仍可能流畅 |

这是解释 LoAF 和 Long Task 为什么应联合使用的关键。**LoAF 数量不是 Long Task 数量，二者不是一一对应，也都不是标准掉帧数。**[[4]](https://developer.chrome.com/docs/web-platform/long-animation-frames)

### 【LoAF 的 duration 与 blockingDuration 不同】

LoAF.duration 是一次长帧记录的总持续时间，而 blockingDuration 是其对输入或其他高优先级任务的阻塞贡献，并非 duration - 50 的简单差值。官方算法会按组成帧的 Task 和最终渲染工作的相对时间计算。[[4]](https://developer.chrome.com/docs/web-platform/long-animation-frames)

**LoAF.duration 很高而 blockingDuration 低**，仍可能因为多个可让步的较短任务积累而使画面迟迟不更新；但它对输入的压力可能不同于单个 120ms 不让步的任务。

**LoAF.duration 与 blockingDuration 都很高**，不仅是 Smoothness 的风险，还应该联查 INP 的 Input Delay、Processing Duration 和 Presentation Delay。

LoAF 的 50ms 是记录门槛，不代表帧只有超过 50ms 才算掉帧。尤其在 90Hz/120Hz 下，远低于 50ms 的帧也可能错过重要更新。

## 6. LoAF 的时间归因可在完整字段时形成三个分析区间

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

注意 renderStart 可能为 0（该次工作没有进入渲染周期）；styleAndLayoutStart 在某些情况下也不可用。不要假设每条 LoAF 都可以无条件减出完整的三个阶段。[[4]](https://developer.chrome.com/docs/web-platform/long-animation-frames)

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

第三段虽然有时被称为 Style and Layout Duration，但从一个时间区间不能直接确定全部毫秒都是 Layout 计算，它还可能包含相关后续工作；若想分别确认 Style、Layout、Paint、Compositor、GPU，必须进一步查看 DevTools Performance Trace。LoAF 的 duration 也不能视为显示器最终 Presented Frame Latency。[[4]](https://developer.chrome.com/docs/web-platform/long-animation-frames)

### 【Pre-layout 具体执行什么，地图的“渲染准备”是否都属于这一阶段】

LoAF 的三个区间必须以**实际执行时间**分类，而不能简单按业务函数名分类。Pre-layout 是本次 LoAF 的渲染周期已经开始、正式样式与布局阶段尚未开始的时间窗口，即：

~~~text
LoAF startTime
   ↓ Work：进入渲染周期之前的主线程工作
renderStart
   ↓ Pre-layout：渲染周期已开始，但未到正式 Style/Layout
styleAndLayoutStart
   ↓ Style/Layout 及后续相关工作
LoAF endTime
~~~

其中 Pre-layout 可能包括：

1. **rAF 回调**：读取当批队列、动画插值、轨迹点转换、更新摄像机或图层状态；
2. **业务同步计算**：在 rAF 中执行的坐标转换、路径拼接、排序、Geometry 构建；
3. **框架或地图库的同步提交**：在这一时间窗口里执行的组件状态提交、数据源调用、Canvas 2D 绘图命令或 WebGL 指令提交；
4. **与本次渲染周期对齐的其他回调工作**：具体以浏览器实际调度和 Trace 为准。

**并非所有地图数据处理都算 Pre-layout。** 例如 WebSocket onmessage 中解析和入队，如果发生在 renderStart 前，它们属于 Work；若数据处理被安排到 Worker，不会直接计入页面主线程 LoAF 的脚本阶段；若地图库把 Geometry 处理放到后台 Worker，rAF 中的同步 API 返回耗时可能很小，真正几何生成成本却在异步阶段。

~~~js
socket.onmessage = (event) => {
  // 通常由普通消息任务驱动；落在 renderStart 前则属于 Work。
  pending.push(...JSON.parse(event.data));
};

function tick() {
  // 以下同步代码若执行于 renderStart 与 styleAndLayoutStart 之间，
  // 则属于 LoAF 的 Pre-layout 时间区间。
  const batch = pending.splice(0, 100);
  const positions = batch.map(convertPoint);
  mapLayer.update(positions);
  requestAnimationFrame(tick);
}
requestAnimationFrame(tick);
~~~

这不是“地图渲染框架每一帧都会严格这样执行”的规范流程。地图 API 的同步调用可能只是安排后续 Worker 或 GPU 工作，不能凭 mapLayer.update 的函数名认定完整图形绘制都在 Pre-layout。

**Pre-layout 中也可能发生 Forced Style/Layout。** 例如 rAF 回调先修改 DOM 样式，再立刻读取 offsetHeight，浏览器可能被迫提前计算布局。Pre-layout 是一个**时间区间**，并不保证其中绝对没有样式和布局计算。LoAF 的 scripts[].forcedStyleAndLayoutDuration 可提示脚本中的强制布局，具体工作还需 Chrome Trace 核验。[[4]](https://developer.chrome.com/docs/web-platform/long-animation-frames)

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

## 7. LoAF Observer 与 Script Attribution 负责严重长帧的证据采集

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

这段代码通过原生 LoAF Entry 读取长帧对应的 Work、Pre-layout 和 Layout 开始后的三个时间区间。字段缺失时必须用 null 表示不可用，不能强行算出负数或虚构渲染阶段。该 API 只上报严重长帧，不能直接据此得到**全部正常帧**的三阶段分布；浏览器支持和缓冲区也限制了数据完整性。[[4]](https://developer.chrome.com/docs/web-platform/long-animation-frames)

### 【Script Attribution 可以定位哪些函数参与长帧】

LoAF.scripts 在满足浏览器归因条件时，可能包含 startTime、duration、executionStart、sourceURL、sourceFunctionName、sourceCharPosition、invokerType、forcedStyleAndLayoutDuration 和 pauseDuration。

这些字段可以回答：

- 哪个主线程脚本、事件处理器或 rAF 回调参与了长帧；
- 脚本执行多长时间，是否存在强制同步布局；
- 哪些脚本工作集中在 Render Start 之前或之后；
- 是否需要使用 Chrome Trace 进一步排查具体算法、框架更新或复杂布局。

但它不是完整 CPU Profile：跨源 iframe、Worker、Service Worker 或某些独立执行环境未必有 Script Attribution；GPU 工作、浏览器合成或部分渲染成本也不能被这些脚本字段全面解释。[[4]](https://developer.chrome.com/docs/web-platform/long-animation-frames)

## 8. 流畅度异常要按任务、渲染、合成与监控环境分类

### 【主线程渲染前工作过重】

**现象**：Frame Interval P95 增大、LoAF Work Duration 高、长任务与页面数据预处理时刻重叠。

**常见原因**：同步 JSON 解析、排序、批量数据转换、复杂循环、第三方脚本、GC、持续 WebSocket 消息回调占用主线程。

**诊断证据**：Long Task、LoAF.scripts、Main Thread、业务 User Timing、数据量和内存分配。

**优化方向**：减少重复工作、将大任务拆为可让出主线程的批次、控制消息频率，适合并行的非 DOM 计算可以考虑 Worker。

**边界**：Worker 不是 DOM 渲染优化器，还要支付数据传输和序列化成本。

### 【rAF 与框架视图提交过重】

**现象**：Render Pre-layout 区间高，每次 rAF 一次性处理过大数据，组件提交耗时持续增加。

**常见原因**：一次消费全部队列、超大 batch、每新增一个点都引发全图刷新、图表状态或响应式依赖更新范围大。

**诊断证据**：LoAF Script Attribution、业务 Commit Duration、框架 Profiler、Batch Size 与更新次数。

**优化方向**：合并重复更新、减少每次提交的工作、限制单帧 batch、及时丢弃无意义的重复中间状态。

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

持续渲染中，GC（Garbage Collection，垃圾回收）并不是应用显式调用的业务任务，而是 JS 引擎为回收不可达对象付出的运行时成本。部分 GC 阶段会暂停主线程 JS，因此如果暂停与下一帧工作竞争，就可能推迟 rAF、状态提交和渲染准备，形成 Frame Interval 尖峰。V8 已采用分代、并发、并行和增量回收减轻暂停，但不能认为 GC 对主线程没有任何影响。[[7]](https://v8.dev/blog/trash-talk)

要区分两类表现：

| 问题 | 常见现象 | 需要验证的证据 | 优化方向 |
| --- | --- | --- | --- |
| Allocation Churn（频繁短生命周期分配） | Heap 频繁上涨/回落，间歇性掉帧 | GC Trace、Allocation Sampling、尖峰与帧时刻相关性 | 减少高频路径中不必要的临时数组、对象和复制 |
| Retained Memory（长期存活对象增加） | 页面运行越久占用越高，可能出现更贵的回收或重绘 | Heap Snapshot、Retainers、History Size、Commit Duration | 清理无效引用；将完整业务历史与活动渲染对象解耦 |

举例：每新增轨迹点都执行 history = [...history, point]，并对全量 history 进行 map 转换。随着历史 H 增加，每次都分配新数组和大量中间对象；不仅应用计算时间随 H 增大，还可能引入越来越多 GC 压力。相反，合理的追加或增量更新减少无必要分配，但不能为了减少对象创建而破坏 React/Vue 的状态正确性。

**“Heap 大”并不等于“GC 导致掉帧”。** 需要在 DevTools Performance 中证明 GC 事件与长帧或 rAF 尖峰重叠，再使用 Memory 的 Allocation Sampling、Heap Snapshot 找高分配函数和被持续保留的对象。Heap 锯齿是线索而非充分证据；合法保留的历史数据也不一定是泄漏。[[8]](https://developer.chrome.com/docs/devtools/memory-problems)

最后注意：LoAF 脚本归因里的 pauseDuration 不等于 GC Duration，它主要用于同步对话框、同步 XHR 等暂停时段；GC 归因依赖更具体的性能或内存记录，不能用该字段替代。[[4]](https://developer.chrome.com/docs/web-platform/long-animation-frames)

### 【测量条件不成立引起误判】

后台标签 rAF 可能暂停；静态页面并不需要持续更新；低功耗或可变刷新率模式可能改变采样间隔。这些都要求先确认页面有重要的持续视觉更新需求，再评价目标 FPS。

## 9. 持续运行负载模型解释为什么页面越使用越卡

### 【N、K、C、H、B 分别代表五个不同层面的压力】

对于持续渲染场景，可以抽象五个变量来分析成本：

| 变量 | 中文含义 | 主要风险 |
| --- | --- | --- |
| N | 单位时间进入并需要可视化的数据数量 | 输入量超过系统处理容量 |
| K | 单位时间触发状态提交、重绘的次数 | 重复支付固定更新成本 |
| C | 每次状态提交、计算和绘制的成本 | 单次工作突破帧预算 |
| H | 已积累的历史数据或可视对象规模 | 新增一个点仍要处理全部历史 |
| B | 设备、刷新率与浏览器实际可用预算 | 不同设备或场景容量不同 |

这不是标准浏览器公式，而是一套分析工程瓶颈的抽象。一个简单说明模型：

~~~text
Cost Per Update
≈ Fixed Cost + Per-item Cost × Current Batch + History-dependent Cost(H)

每秒整体更新工作量
≈ K × Cost Per Update

期望同时满足：
每次重要更新的工作量 < 可用帧预算
数据消费速度 >= 数据到达速度
~~~

模型用来回答“为什么卡”，不是保证所有浏览器 Rendering 和 GPU 工作都呈线性增长。真实数据必须通过 Profiling 证明。

### 【N 过高：视觉数据需求超过设备容量】

高频 WebSocket 轨迹、数万行表格、多个高密度地图图层或复杂 Canvas 粒子场景，单位时间新增可视化对象过多。

对应优化是降低无意义的数据绘制工作：Sampling（采样）、Aggregation（聚合）、Level of Detail（细节层级）、可视区域过滤、降低远处/非重点对象精度。业务数据的完整存储与实时绘制量可以分离，不能为了流畅度盲目丢失异常点、峰值或轨迹关键转折。

### 【K 过高：同样总数据量被反复提交】

假设每秒新增 20 个点。方案一每新增一点就重新触发整个地图视图更新，共 20 次；方案二合并成 4 次、每次 5 个点，可能减少重复的固定框架与绘图成本。

但是 batch 不是越大越好。若每次 batch 太大，即使 K 降低，单次 C 仍可能超帧预算。优化应结合“提交次数减少了多少”和“每次提交的尾部耗时增加了多少”分析。

### 【C 和 H 相互放大：历史轨迹成为持续成本】

例如新收到 1 个点，却在每次地图更新时重新复制历史数组、重新构建全部 Polyline Geometry、重建所有 Feature 或重新计算可视对象样式。这些操作会让新增点的代价受 H 影响。

~~~text
时间推进 / 历史 H 增长
    ↓
每新增一个点都扫描或重建历史 H
    ↓
单次 Commit Duration 增大
    ↓
开始超过 Frame Budget
    ↓
LoAF 增加、Frame Interval P95 上升
    ↓
数据队列可能进一步积压
~~~

优先考虑增量更新、分段轨迹、Geometry 缓存、只重绘有变化的块、视口裁剪、减少 Scene Graph 对象数量。业务历史可以长期在服务端保留，但不应要求所有历史数据在客户端每一帧重新参与绘制。

### 【B 变化：不能在单一开发机上决定固定最优值】

同一个批量更新方案，在低端移动设备、高刷新率屏幕、后台任务繁忙与空闲环境下，最大可安全处理的数据量不同。对自适应系统，目标不是找到永久固定 batch，而是根据实际 Frame Pressure 与队列状态选择安全的吞吐和质量水平。

## 10. 实时数据链路必须把帧表现和数据积压一起衡量

### 【输入 rate 和更新 batch 是两条不同的控制线】

~~~text
服务端 rate：每秒发送多少点
          ↓
WebSocket
          ↓
客户端待渲染 Queue
          ↓
rAF 调度
  每次取 batch 个点
          ↓
更新图表、地图或 Canvas
          ↓
浏览器实际准备和显示新画面
~~~

rate 改变输入量 N；batch 改变一次更新的工作量和单位时间更新次数 K；队列连接两条控制线，反映处理进度是否跟得上。

| Frame Interval | Queue / Queue Age | 代表性问题 |
| --- | --- | --- |
| 稳定 | 稳定且很低 | 画面连续、数据及时 |
| 稳定 | 持续增长 | FPS 尚可，但内容越来越旧 |
| 频繁超预算 | 队列已消化 | 吞吐够快，但单次更新造成顿挫 |
| 频繁超预算 | 持续增长 | 既不流畅，也越来越落后 |

因此需要同时观察 Arrival Rate、Consume Rate、Queue Length、Oldest Queue Age、Commit Duration P95、Frame Interval P95。高 FPS 不是可以忽略 Queue Age 的理由。

### 【自适应调节的三个基本场景】

~~~text
Queue Growing + Frame Budget Healthy
→ 可逐步增大 batch，尝试提高消费吞吐

Queue Growing + Frame Budget Exceeded
→ 不应继续盲目增大 batch
→ 应减少无意义数据绘制、提高增量能力、降低输入/画质

Queue Empty + Frame Healthy
→ 在观察稳定性后谨慎恢复质量或输出速率
~~~

这属于离散反馈控制思路。为避免不断在档位间来回跳，应设计 Hysteresis（滞回）、Cooldown（冷却期）和渐进恢复。控制器不应只根据一秒内平均 FPS 调节，否则偶发尖峰和历史成本会被掩盖。

### 【诊断历史 H 是否构成根因的最小对照实验】

先固定输入 rate、batch、视口和数据生成方式，分别在 H=1千、1万、5万等不同历史规模下测量单次提交时长、LoAF 与 Frame P95。

再做两个实验：

1. **No-op / Empty Render**：保留相同 rAF 调度与数据输入，但不执行实际地图重绘，判断调度本身是否昂贵。
2. **Incremental vs Full Rebuild**：保留相同新增点规模，只改变更新策略，比较 Commit Duration 是否仍随 H 线性上升。

如果只有真实重绘随 H 明显变慢，则应进入 Geometry/Scene 的历史依赖分析，而不是继续提高 batch 试图掩盖成本。这个框架也适用于 Canvas、WebGL、图表以及响应式列表。

### 【实时地图新增一个点涉及四层工作，而不是一次“渲染”操作】

以已经存在 10,000 个历史轨迹点、服务端又推送 P10001 为例，整个链路可以分成四个长期有效的层次：

~~~text
① 数据接收与逻辑状态更新（管理业务数据）
   WebSocket 收到 P10001
       ↓ 校验经纬度 / 解析时间 / 规范化结构
   将 P10001 加入历史数据与待渲染队列
       ↓
② 图形数据准备与资源更新（生成可供地图引擎使用的数据）
   rAF 取出 batch
       ↓ 坐标投影、连接末尾线段或更新 Feature
   Geometry / 图层数据源 / GPU Buffer 更新
       ↓
③ 地图图形绘制（生成这一帧的图形内容）
   引擎提交 Draw Commands
       ↓ GPU 执行、Raster、Compositor
   与底图及其他图层合成
       ↓
④ 屏幕呈现（最终用户看见）
   显示链路在刷新机会提交新画面
~~~

四层只是**按职责划分**，不表示所有地图引擎把工作固定安排到四个连续的主线程任务。地图引擎可能利用 Worker 解析数据或构建 Geometry，Canvas2D 的绘图则可能与应用 JS 在同一任务中执行；WebGL 调用主要提交命令，GPU 真正绘制的时间不一定包含在调用耗时里。

对于新增点，从几何语义看只需要添加末尾线段：

~~~text
已有：P1 — P2 — … — P9999 — P10000
新增：P1 — P2 — … — P9999 — P10000 — P10001
                                    ↑ 新线段
~~~

但是**“只需要新增一条线段”是几何语义上的最小变更，不是所有地图 API 都保证做到的最小计算量**。

### 【历史数据重处理、Geometry 重建和地图画面重绘是三种不同的“全量”】

| 层次 | “全量”的具体含义 | 增量优化重点 |
| --- | --- | --- |
| 业务数据处理 | 新增一个点就遍历或复制所有历史点 | 追加、增量坐标转换、少创建临时对象 |
| 图形数据源与 Geometry | 新增一个点就重新解析全部 LineString、构造所有顶点、上传全部缓冲 | 分块、增量 Feature 或顶点、复用 GPU Buffer |
| 画面绘制与合成 | 新画面需要重新提交当前视口内的部分/全部 Draw Call | 图层缓存、可视范围过滤、按需绘制、减少 GPU 工作 |

**即使每次更新都重新绘制当前视口，也不代表之前的经纬度、线段 Geometry、纹理与 GPU Buffer 全部被重新计算。** 某些引擎会每帧绘制可见图层，但持续复用不变的图形资源；真正要防范的是“新点触发所有历史资源再次处理”的成本随着 H 增长。

反过来，即使应用代码只是 history.push(newPoint)，如果随后调用的是包含全部历史轨迹的 source.setData(fullGeoJSON)，地图内部仍可能按整套 Source 更新。Mapbox GL JS 官方性能模型把 Source Update Time 与该 Source 的顶点数、引用层数等联系起来，并建议将频繁变动的数据与大型静态数据源分离。[[9]](https://docs.mapbox.com/help/troubleshooting/mapbox-gl-js-performance/)

### 【Canvas 2D、WebGL 和 GeoJSON 地图库有不同的更新策略】

**Canvas 2D：固定视图可以只追加末尾像素。**

~~~js
// lastPoint 和 newPoint 已经是同一张 Canvas 的像素坐标。
// 仅适合旧图像可以保留、视图没有整体变化的情况。
function appendSegment(ctx, lastPoint, newPoint) {
  ctx.beginPath();
  ctx.moveTo(lastPoint.x, lastPoint.y);
  ctx.lineTo(newPoint.x, newPoint.y);
  ctx.stroke();
}
~~~

如果地图可以复用旧像素，新增点只需绘制末尾线段。但是一旦地图缩放、平移、改变投影、样式、需要擦除轨迹或恢复遮挡内容，先前像素可能不再正确，需要重绘受影响区域、分层缓存或重绘全部必要画面。MDN 也建议针对复杂 Canvas 场景预渲染静态区域、采用分层 Canvas 和减少无谓重绘。[[12]](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API/Tutorial/Optimizing_canvas)

**WebGL：可以重用已构建的 GPU Geometry。**

~~~text
历史点 → 已有 Vertex Buffer（GPU 顶点缓冲）
                        ↓
新增点 → 构建最后一段线的新增顶点
                        ↓
若引擎具备可追加/局部更新的 Buffer 管理
  → 只上传相关新数据，旧 Geometry 保持复用
                        ↓
GPU 重新绘制所需的可见线段或图层
~~~

WebGL 具备局部 Buffer 更新能力，但**某个地图库的 Polyline API 是否提供顶点级追加，是另一个问题**。对于仅暴露“替换整条线”接口的图库，应用即便只更新一个点，也可能触发整个线的 Geometry 重新构建。

**GeoJSON 数据源：差量到 Feature，不一定差量到顶点。**

例如：

~~~js
// 通用 GeoJSON Source 更新示意：向引擎提交完整历史轨迹。
history.push(newPoint);
source.setData({
  type: 'Feature',
  properties: {},
  geometry: {
    type: 'LineString',
    coordinates: history
  }
});
~~~

这里 history.push 本身是追加，但 setData 仍传入整个历史数组。是否重新解析、重建和重绘、在哪个 Worker 中完成，要按具体图库实现和 Profile 确认。对于 MapLibre GL JS，GeoJSONSource.updateData() 支持按唯一 Feature ID 做差量增删改，前提是数据源里的 Feature 有可用且唯一的 ID。[[10]](https://maplibre.org/maplibre-gl-js/docs/API/classes/GeoJSONSource/)

然而 MapLibre 的 GeoJSONFeatureDiff 用 newGeometry **替换一个 Feature 的完整 Geometry**，而不是提供向同一个 LineString 的末尾追加一个坐标的通用方法。若整条 10,000 点轨迹只有一个 Feature，更新该 Feature 的 Geometry 仍可能涉及它的所有顶点。[[11]](https://maplibre.org/maplibre-gl-js/docs/API/type-aliases/GeoJSONFeatureDiff/)

因此可以探索把历史轨迹拆为稳定 Chunk 与一个活动 Chunk：

~~~text
完整业务历史轨迹
  ├─ Chunk 1：P1～P1000       已封存
  ├─ Chunk 2：P1000～P2000    已封存
  ├─ ...
  └─ Active Chunk：当前新增点继续追加
       ├─ P10000
       └─ P10001
~~~

只有活动 Chunk 接受新的坐标；封存的 Chunk 尽可能复用已有 Feature、Geometry 与缓存。实现需处理块边界线段重叠、连线连续性、样式匹配，以及过多 Chunk 带来的 Source/Layer/Draw Call 成本，不能把 Chunk 无限拆细。**Feature 级增量、Geometry 级增量和最终 Draw Call 是否减少，分别验证。**

### 【业务“渲染前”与 LoAF Pre-layout 的分类边界】

LoAF 的阶段基于时间位置，而不是地图函数的业务职责，因此还要重新映射：

| 地图工作 | 常见执行位置 | LoAF 中的可能归属 |
| --- | --- | --- |
| WebSocket 消息解析与历史入队 | 普通消息 Task | 若在 renderStart 之前，属于 Work |
| 地理坐标转换与预处理 | 主线程消息 Task / rAF / Worker | 取决于时机；Worker 不直接计入主线程 LoAF |
| rAF 取出 batch 并提交地图更新 | rAF 同步回调 | 通常属于 Pre-layout |
| rAF 中同步生成 Geometry 或绘制 Canvas | rAF 回调 | 可处于 Pre-layout，即使函数名叫 render |
| WebGL 画图命令的 CPU 提交 | 地图渲染回调 | JS 提交可能属于 Pre-layout |
| 浏览器 CSS Style / Layout | 渲染更新阶段 | 与 LoAF 的 styleAndLayoutStart 相关 |
| 地图库 Worker / GPU 绘制与合成 | 异步线程或设备 | 普通 LoAF 分段不提供完整 GPU/呈现时间 |

**地图 WebGL 绘制不等于浏览器 CSS Layout。** 渲染引擎可能在 rAF 期间提交 WebGL 命令，使同步提交时间计入 Pre-layout，但 GPU 的真正绘制与最终屏幕呈现不一定体现在这里。所以 mapLayer.update() 同步返回很快，不能说明新轨迹已经完成屏幕呈现。[[4]](https://developer.chrome.com/docs/web-platform/long-animation-frames)

### 【通过 History Sweep 和受控插桩判断当前到底是哪种全量】

要证明“历史越多越卡”到底发生在业务数据、Geometry 还是最终绘制层，必须分别测量；示意：

~~~js
function updateTrajectory(batch) {
  const t0 = performance.now();
  appendToBusinessHistory(batch);
  const t1 = performance.now();
  submitToMapSource(batch);
  const t2 = performance.now();

  record({
    historyUpdateMs: t1 - t0,
    sourceCallMs: t2 - t1
  });
}
~~~

代码解释：

- historyUpdateMs 只代表业务历史数据更新的同步耗时；
- sourceCallMs 只代表地图 Source API 的同步返回成本；
- **不能把 sourceCallMs 当成完整 Geometry 构建、Worker 执行、Raster、GPU 或屏幕呈现耗时**。需要结合地图 Source 加载完成信号、引擎事件和 Chrome Trace 分析后续异步成本。

建议固定输入 rate、batch、地图视口、设备与数据内容，仅改变历史规模 H，采集 Frame Interval P95、LoAF Work/Pre-layout、业务提交耗时、地图更新相关 Trace、Memory 与 GC。再做三个对照：

1. **No-op Update**：保留同样的数据到达与 rAF 调度，但不提交地图图层。若帧稳定，说明真正地图更新链路有明显压力。
2. **Full Source vs Chunk / Incremental**：相同轨迹和视口，分别整体 setData 与分段/差量更新，比较 Geometry 处理和真正画面成本。
3. **Fixed Camera vs Pan/Zoom**：固定视口时是否能复用旧像素、几何和资源？缩放、平移、变更样式时是否仍然需要更多重绘？

结果解释：如果随着 H 增加，JS historyUpdateMs 变长，优先检查历史遍历与对象分配；如果同步 API 很快、但 LoAF/地图 Worker 或 GPU Trace 随 H 变长，优先分析图库的数据源、Geometry 与绘制方式；如果增量更新只改善 CPU 解析，GPU 仍随可见顶点数明显增加，就需要考虑视口裁剪、LOD、分层和可见对象规模控制。

这套三层区分是实时轨迹之外同样可迁移的性能判断方法：**追加业务状态 ≠ 增量更新几何 ≠ 局部重绘画面**。

## 11. 性能定位从异常结果逐层进入函数和场景级证据

### 【先定位哪个可见更新窗口不符合预期】

~~~text
用户报告滚动不顺、动画停顿或实时轨迹卡顿
    ↓
这段时间是否有重要的持续视觉更新？
    ├─ 否 → 不直接使用 FPS 解释用户体验
    └─ 是 → 确定目标刷新节奏与设备基线
                 ↓
             rAF Frame Interval P95 / Budget Hit Rate / Longest Gap
                 ↓
             与 Queue Age、Commit Duration、Memory 同时对比
                 ↓
             是否有 LoAF / Long Task？
             ├─ 有 → 拆 Work / Pre-layout / Layout-and-later
             │        ↓
             │      Script Attribution / Trace 证据
             └─ 没有 → 检查 <50ms 的超预算帧、Compositor/GPU、
                         实际视觉变化、浏览器限频与测量能力
                 ↓
             候选瓶颈来自数据量 N、更新次数 K、
             单次成本 C、历史 H，还是设备预算 B？
                 ↓
             单变量实验复现与验证
                 ↓
             整体流畅度、数据新鲜度和交互质量共同改善？
~~~

必须按次序从可观察异常收敛到候选根因。发现 LoAF 不意味着主线程某一个函数一定很慢；rAF FPS 较低不意味着一定是掉了同样数量的屏幕帧；GPU 负担重也不能简单用减少 JS Bundle 字节数来解决。

### 【五组实验逐步确认根因】

| 实验 | 固定条件 | 变化条件 | 主要判断 |
| --- | --- | --- | --- |
| Idle Baseline | 设备、视口和应用 | 暂停持续负载 | 页面本身与浏览器基线开销 |
| Empty rAF / No-op | 相同 rAF 采样和输入 | 执行空提交 | 是否是真正渲染成本造成恶化 |
| Batch Sweep | rate、H、数据内容 | 逐档调整 batch | 更新次数 K 与单次成本 C 的权衡 |
| Rate Sweep | batch、H、画质 | 逐步调整 rate | N 是否超过可持续处理容量 |
| History Sweep | rate、batch、设备 | 改变历史 H | 是否存在随 H 增长的重复工作 |
| Feature / Scene Off | 其他数据与业务条件 | 禁用一个图层或绘制模块 | 是否是特定渲染路径瓶颈 |

用同一台机器、同等网络、相同数据和足够重复的测试对比，才能避免把缓存差异、设备限频、浏览器版本变化误认成某项优化的效果。

### 【真实例子：批次减少了更新次数，FPS 却下降】

假设原本每帧只处理 1 点，后来提高 batch 至 100，地图更新次数减少，但单次渲染提交时间从几毫秒上升到 70ms，LoAF 显著增加。

这说明“减少重复更新次数”确实优化了 K，但单次 C 又突破了 Frame Budget。应该寻找**使单次 C 不超预算的合理批量**，而不是认定 batch 越大越好。

假设 batch=10 时较稳定，但页面运行 30 分钟后又变慢；如果 History Sweep 显示单次提交耗时随历史 H 增长，则根因可能在全量轨迹更新或 Scene Object 扩张，需要增量 Geometry、分块或可见对象裁剪，而不能只依靠动态降 rate 维持表面的 FPS。

## 12. RUM 采集、结果指标验收与监控开销边界

### 【一个采样窗口需有自己的上下文与数据口径】

建议在每个有效活跃视觉窗口记录：

~~~text
App / Version / Route / View
        ↓
Device / Browser / Visibility / Refresh Baseline
        ↓
Active Visual Update Window（有实际画面更新需求）
        ↓
Result：rAF FPS、Frame Interval P95、Budget Hit、Longest Gap
        ↓
Progress：Queue、Arrival / Consume、Batch、Commit Duration
        ↓
Diagnostics：LoAF Duration / Blocking / Stages / Scripts、Long Task
        ↓
采样量、采样时长、能力支持、统计版本
~~~

示例监控数据结构（仅供理解设计）：

~~~json
{
  "type": "performance",
  "name": "smoothness",
  "context": {
    "route": "/live",
    "version": "2.4.1",
    "viewId": "view-example",
    "deviceClass": "mobile",
    "visibility": "visible",
    "samplingWindowMs": 10000,
    "refreshBaselineHz": 60
  },
  "result": {
    "rafFps": 48,
    "frameIntervalP95Ms": 34,
    "budgetHitRate": 0.72,
    "longestGapMs": 110
  },
  "progress": {
    "arrivalRate": 600,
    "consumeRate": 580,
    "queueLength": 150,
    "oldestQueueAgeMs": 900,
    "commitDurationP95Ms": 24
  },
  "diagnostics": {
    "loafCount": 5,
    "loafMaxDurationMs": 115,
    "longTaskCount": 4
  }
}
~~~

其中 rafFps、Frame Interval P95 与 Budget Hit Rate 是**rAF 观测口径**而非真正显示器最终帧率。LoAF Count 与 Long Task Count 是同一个采样窗口内两种不同类型的记录数，不能直接相加称为掉帧数。Long Gap、Jank、LoAF Rate 都需要明确分母（例如每活跃分钟、每采样窗口），不能把一条业务自定义数值称为官方 Core Web Vital。

### 【观测系统不能成为新的卡顿来源】

在线上：
- 不应对所有页面永久运行高成本 rAF Polling。
- 只有存在连续视觉更新需求时才进行短时、有限采样；页面 hidden 立即暂停，恢复时重置上次时刻。
- 避免每帧打印日志、做复杂统计、序列化大型数据、触发 DOM 几何读取或直接发网络请求。
- LoAF 天然只记录严重长帧，适合异常抽样；scripts 要按采样率与权限过滤，避免上传敏感 URL、路径和用户数据。
- 浏览器不支持 LoAF、Entry 过早丢失或无归因数据时要明确标记，不能把“无法测得”写为“没有问题”。
- 不应把不同刷新率、不同可见性和不同业务目标帧率的样本混为一个无解释的全站 FPS 达标率。

### 【Lab 与 Field 各有不同目标】

**Lab（实验室）**：固定数据负载、设备、刷新率、视口、历史规模、网络和 CPU 条件，通过 Chrome Performance Trace 观察 Main、Frames、Rendering、Raster、Compositor、GPU，并与 LoAF、业务 Commit 和 Queue 数据建立时间关联。对实时/长期运行问题需要覆盖历史状态增长后的表现。

**Field（真实用户）**：按 Route、Version、Device、目标刷新基线和活跃视觉场景分群，比较 rAF Interval P95、Long Gap、预算命中率、LoAF 频次、Queue Age 和业务可用性，同时关注 INP，防止为了流畅度将用户操作变得迟缓。

验收应保留两项同时成立的约束：

~~~text
视觉结果
重要连续更新在当前场景预算内尽量稳定呈现
         +
过程正确性
数据处理持续追得上，用户看到足够新的状态
~~~

结果指标改善但业务数据越来越旧，不构成完整成功；业务吞吐提高但画面持续严重卡顿，也不构成完整成功。

## 13. 与前面三篇草稿及正式知识体系的关系

本稿只作为第四类用户体验 Smoothness 的独立草稿，**暂不加入 GitHub 知识体系索引、不新增 QA、不改正式知识正文**。

- [Loading / LCP 四阶段诊断草稿](./Loading-LCP四阶段性能诊断与优化体系-草稿.md)：文档、资源与最终绘制等待。
- [Responsiveness / INP 三阶段诊断草稿](./Responsiveness-INP三阶段交互响应性能诊断与优化体系-草稿.md)：输入、事件处理、下一次绘制等待。
- [Visual Stability / CLS 诊断草稿](./Visual-Stability-CLS视觉稳定性诊断与优化体系-草稿.md)：布局偏移、最大会话窗口与造成位置变化的原因。
- [Web 性能优化完整知识体系](../W-Web性能优化完整知识体系.md)：四类用户体验与端到端性能优化。
- [性能专项优化](../X-性能专项优化.md)：指标采集、PerformanceObserver、LoAF、Long Task 和 RUM。
- [页面流畅度与连续渲染性能完整知识体系](../Y-页面流畅度与连续渲染性能完整知识体系.md)：N/K/C/H/B、可视化对象、批量渲染与控制器的深入专项。

最终四类体验的诊断路径：

~~~text
Loading → LCP → TTFB / Resource Delay / Duration / Render Delay
Responsiveness → INP → Input Delay / Processing / Presentation Delay
Visual Stability → CLS → 最大 Session Window / Shift / Source / Root Cause
Smoothness → 自定义 Frame 结果体系
              ├─ rAF Frame Interval / FPS / Budget Hit
              ├─ LoAF / Long Task / Trace
              └─ 数据新鲜度 / Queue / Commit / History
~~~

### 【参考文献】

1. Google / web.dev. [Towards an animation smoothness metric](https://web.dev/articles/smoothness). 重要视觉更新、合成线程、FPS 局限、帧完整性与动画性能研究。
2. Google / web.dev. [Rendering performance](https://web.dev/articles/rendering-performance). 显示刷新预算、Style/Layout/Paint/Composite 与优化原则。
3. MDN. [requestAnimationFrame](https://developer.mozilla.org/en-US/docs/Web/API/Window/requestAnimationFrame). rAF 时间戳、回调调用条件、前后台与不同刷新率。
4. Chrome for Developers. [Long Animation Frames API](https://developer.chrome.com/docs/web-platform/long-animation-frames). LoAF 50ms 门槛、时间拆分、blockingDuration、scripts、特殊无渲染记录。
5. W3C. [Long Animation Frames API Working Draft](https://www.w3.org/TR/long-animation-frames/). Long Animation Frames API 的工作草案。
6. GoogleChrome / web-vitals. [官方实现与 Attribution 文档](https://github.com/GoogleChrome/web-vitals). 标准 Web Vitals 与 INP 长帧归因的关系。
7. V8. [Trash talk: the Orinoco garbage collector](https://v8.dev/blog/trash-talk). 分代垃圾回收、主线程暂停与并发/并行/增量优化。
8. Chrome for Developers. [Fix memory problems](https://developer.chrome.com/docs/devtools/memory-problems). Allocation Sampling、Heap Snapshot 与 GC 排查。
9. Mapbox. [Improve the performance of Mapbox GL JS maps](https://docs.mapbox.com/help/troubleshooting/mapbox-gl-js-performance/). Source/Layer/Vertex 成本模型和高频变化数据源拆分。
10. MapLibre GL JS. [GeoJSONSource](https://maplibre.org/maplibre-gl-js/docs/API/classes/GeoJSONSource/). setData 与按 Feature ID 差量更新的 API 和前置条件。
11. MapLibre GL JS. [GeoJSONFeatureDiff](https://maplibre.org/maplibre-gl-js/docs/API/type-aliases/GeoJSONFeatureDiff/). Feature Geometry 的整体替换语义。
12. MDN. [Optimizing canvas](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API/Tutorial/Optimizing_canvas). Canvas 预渲染、分层与减少重绘的优化方法。