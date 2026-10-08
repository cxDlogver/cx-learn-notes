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