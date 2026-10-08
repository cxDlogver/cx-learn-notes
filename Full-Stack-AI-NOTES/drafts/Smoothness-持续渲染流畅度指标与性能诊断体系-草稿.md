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
