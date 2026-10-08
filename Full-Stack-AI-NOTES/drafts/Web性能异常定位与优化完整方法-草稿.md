# Web 性能异常定位与优化：上下文、阶段诊断与根因验证完整方法（草稿）

> **状态**：四类 Web 用户体验共同适用的通用知识草稿，暂不纳入正式知识索引、QA 或正式知识正文。
>
> **分析主线**：性能结果异常 → 建立运行上下文 → 确认体验类别与指标口径 → 阶段/对象归因 → 结合底层证据及源码确认根因 → 对应层面优化 → 受控实验与真实用户数据验收。
>
> **边界**：本文说明普遍的性能分析方法，不以任何具体业务项目的实现机制组织知识。文中所有版本、路由、时间和指标数据均为演示，不代表真实项目已测得的结果。

## 1. 性能指标恶化后的第一目标是建立完整的因果分析路径

### 【指标恶化只证明结果异常，不能直接推出某个具体原因】

监控平台告诉我们页面 LCP 从 2.1 秒上升到 3.4 秒，或者持续动画的 Frame Interval P95 显著增长。这些数字首先意味着**某类用户体验的结果变差**，但无法立即说明是哪一段执行工作、哪种资源或哪一行代码导致恶化。

不能用“LCP 慢就压缩图片”“INP 慢就减少 JS”“FPS 低就批量渲染”等技术手段直接替代诊断。一个优化手段只有与被证明的瓶颈相匹配，才具有合理性。

~~~text
① 性能异常上下文
   版本 / 路由 / 设备 / 网络 / 时间与生命周期
           ↓ 确认异常真正发生在哪里
② 用户体验与结果指标
   Loading / Responsiveness / Visual Stability / Smoothness
           ↓ 判断是哪种体验发生回归
③ 阶段或对象归因
   LCP 四阶段 / INP 三阶段 / CLS 偏移窗口 / LoAF 长帧
           ↓ 找到异常集中发生在哪一段
④ 底层运行证据
   Network / Navigation Timing / JS Task / Rendering / GC
           ↓ 找到这段时间里实际发生的工作
⑤ 源码与配置
   请求、资源、脚本、组件、布局、绘制的具体实现
           ↓ 形成可验证的根因假设
⑥ 对应优化与验收
   修改已确认的瓶颈 → 受控对比 → 真实用户回归
~~~

其中第一步解决**异常归属**，第二步解决**体验定义**，第三步解决**搜索范围**，第四、五步解决**根因证据**，第六步才负责**改善和验收**。前面的判断条件不成立，就不应跳步宣布优化结论。

### 【一套共同方法之下应保留四类指标自己的机制】

通用诊断流程不代表四类体验都必须按“三个耗时”分段。LCP 与 INP 都有明确的阶段时间拆解；CLS 则依赖非预期布局偏移事件、窗口聚合和受影响元素；Smoothness 需要首先确认确实有连续视觉更新需求，再结合帧间隔、长帧与渲染 Trace。

**通用知识的稳定边界是分析方法，而不是所有业务画面的同一条渲染流水线。** 具体项目中选用哪些网络策略、数据结构、框架 API 和绘图技术，只有在第四、五步做源码诊断时才进入论证。

## 2. 性能上下文确定版本、路由、设备与具体异常窗口

### 【先建立 Context，才能判断“哪一类访问”真的变慢】

如果只知道“首页 LCP 很差”，无法区分是否所有用户、只有手机端、只有某个版本、只有第一次冷访问或者只有特定地区发生问题。

| 上下文分类 | 推荐字段 | 诊断价值 |
| --- | --- | --- |
| 应用和发布 | App、Environment、Version、Build、Release、Feature Flag | 将回归与代码发布、灰度开关对应 |
| 页面和导航 | URL 归一化 Route、Page Type、Navigation Type、View ID | 找到具体页面，区分硬导航、SPA 路由切换、恢复访问 |
| 设备和浏览器 | Mobile/Desktop、Browser、Browser Version、Viewport、Device Class（可得时） | 区分执行能力、浏览器差异和理论帧预算 |
| 网络与缓存 | 连接信息（可得时）、区域、缓存命中、CDN 访问条件 | 判断连接、响应与传输环境是否可比 |
| 时间与生命周期 | 采集时间、Navigation Start、Visibility、Page/Session ID | 确认异常属于哪次访问、是否发生在后台或页面恢复后 |
| 结果和归因 | Metric Name、Value、Metric ID、Attribution、Sampling Version | 保证定义、去重、分段口径、诊断证据一致 |

其中连接类型、设备等级、浏览器内部时间字段未必在全部客户端可获得，**不能假定每一种 Context 都由原生 Performance API 自动提供**。无法采集时要记录缺失情况，而不是填入推测值。

下例仅为 SDK 事件结构示意：

~~~json
{
  "name": "LCP",
  "valueMs": 3070,
  "context": {
    "app": "website",
    "version": "2.1.0",
    "route": "/",
    "deviceClass": "mobile",
    "navigationType": "navigate",
    "visibility": "visible",
    "viewId": "view-example"
  },
  "attribution": {
    "elementType": "image",
    "phase": "resource-load-delay"
  }
}
~~~

这条记录本身并不证明 resource-load-delay 导致恶化：还需要同类访问的基线和实际资源请求时间线。

### 【建立同口径比较，而不是误把流量变化当作代码回归】

分析顺序应为：

1. 检查监控采样、指标计算、SDK 版本及页面统计口径有没有发生变化。
2. 对比同 Route、相近设备与浏览器、相同导航类型的版本分群，查看结果分布。
3. 检查样本量与可代表性，保留访问量、P75、异常比例、相应发布时间。
4. 再与发布记录、灰度比例、功能开关及资源缓存变化做时间相关性匹配。

例如旧版移动端流量占 30%，新版占 70%，总体平均 LCP 上升未必是代码变慢，也可能是**用户组成变化**。反过来总体指标稳定，也可能掩盖某一低端设备群体的严重退化。

LCP、INP、CLS 常以页面访问级结果 P75 衡量，并按移动端与桌面端等合理分群；**一次访问的阶段耗时与聚合 P75 不属于同一种统计层次**。阶段分量的 P75 不能直接相加得到整体指标 P75。

### 【同一个路由下的硬导航与客户端导航不一定可以共用诊断起点】

导航开始时间和指标生命周期是上下文的一部分。一次硬导航有主 HTML 文档请求，TTFB 属于导航阶段；客户端 SPA 软导航则可能没有新的主 HTML 请求，不能无条件套用硬导航的 LCP 分段定义。

INP 可能在整个页面生命周期内某次晚发生的用户交互中恶化；CLS 可能发生在首屏加载后；Smoothness 需要给出真正连续更新的活动窗口和当前刷新目标。

因此应同时保留 Route、View、Navigation Type、Metric Instance 与 Event Time。它们的职责分别是**业务归属、界面状态、导航方式、测量身份和发生时刻**，不能相互替代。

## 3. 先以视觉体验和结果指标确认恶化属于哪一维度

### 【四类用户体验分别回答四个不同问题】

| 维度 | 视觉体验 | 主要结果指标 | 首要归因入口 |
| --- | --- | --- | --- |
| Loading（加载体验） | 页面主要内容迟迟无法出现 | LCP，辅以 FCP、业务关键内容时间 | TTFB / Resource Load Delay / Resource Load Duration / Element Render Delay |
| Responsiveness（响应体验） | 点击、触摸、按键后迟迟没有下一帧反馈 | INP | Input Delay / Processing Duration / Presentation Delay |
| Visual Stability（视觉稳定性） | 内容突然改变位置，阅读或点击位置受到干扰 | CLS（无单位分值） | Session Window / Layout Shift / Shift Sources |
| Smoothness（持续流畅度） | 动画、滚动、拖拽出现明显掉帧或停顿 | 活动窗口 Frame Interval P95、FPS、超预算比例等自定义组合 | LoAF / Long Task / Rendering / GPU Trace |

前三者都有官方 Core Web Vitals 口径；Smoothness 目前没有一个能直接与三者并列的统一 Core Web Vital，必须根据重要连续视觉更新是否存在，以及设备目标刷新率选择采样和评价方式。[[1]](https://web.dev/articles/smoothness)

### 【结果值、阶段归因、原始证据必须分层解释】

~~~text
结果指标 Outcome：用户是否遇到体验问题？
       ↓
阶段归因 Attribution：问题集中在什么时段或对象？
       ↓
底层证据 Evidence：具体工作在哪里、为什么产生额外成本？
       ↓
根因 Hypothesis：如何通过实验反证或支持这一解释？
       ↓
优化 Fix：移除被证明多余或过重的工作
~~~

例如 LCP 变为 3.07 秒是结果；Resource Load Delay 增长到 1.25 秒是阶段归因；Network 中主图直到脚本执行后才发起请求是运行证据；源码中主图改成由脚本插入是候选根因。只有最后两个层次联合受控实验，才能对优化方向建立足够信心。

不要把 FCP 误认为 LCP 四段中的第五个阶段；不要把 CLS 的 0.2 分数误读成 200ms；不要把 rAF 平均帧率直接当成用户看到的 GPU 呈现帧率。

## 4. 四维指标各自进入对应的阶段或事件归因模型

### 【LCP 通过四段归因找到加载等待的实际位置】

标准的可归因 LCP 四段为：[[2]](https://web.dev/articles/optimize-lcp)

~~~text
发起主文档导航
    ↓ ① TTFB：等待主 HTML 响应的首字节
收到主 HTML 首字节
    ↓ ② Resource Load Delay：LCP 资源尚未开始请求的等待
LCP 资源开始请求
    ↓ ③ Resource Load Duration：LCP 资源的实际获取
LCP 资源就绪
    ↓ ④ Element Render Delay：就绪到 LCP 元素完成绘制
主要可见内容完成 LCP
~~~

| 显著增长的阶段 | 优先怀疑的类别 | 第一批诊断证据 |
| --- | --- | --- |
| TTFB | 重定向、连接、CDN、服务端 HTML 生成及响应 | 主文档 Network Timing、导航数据、服务端 Trace |
| Resource Load Delay | 资源晚发现、迟发起或优先级不正确 | LCP 请求 Start、Initiator、HTML/CSS 与资源优先级 |
| Resource Load Duration | 文件体积、下载带宽、缓存、源站资源响应 | Transfer Size、Waiting、Content Download、Cache |
| Element Render Delay | CSS 阻塞、JS/Hydration、DOM 未及时生成、布局和绘制 | LCP Element、Main Thread、Style/Layout/Paint |

没有独立资源请求的 LCP 文本等场景，资源相关阶段可以为零。TTFB 高不等于服务器计算一定慢；Resource Load Delay 高不等于网络下载慢；Resource Load Duration 高也不等于资源一定过大。

详细的字段、导航边界与优化路径见 [Loading / LCP 四阶段诊断草稿](./Loading-LCP四阶段性能诊断与优化体系-草稿.md)。

### 【INP 将一次交互分成输入等待、事件处理和画面呈现】

INP 衡量特定交互到其后续下一帧的响应时延，而不是该次交互涉及的全部异步业务流程。三个分段为：[[3]](https://web.dev/articles/optimize-inp)

~~~text
用户发生点击、触摸或键盘输入
    ↓ ① Input Delay：主线程什么时候开始处理？
事件处理开始
    ↓ ② Processing Duration：关联事件回调执行了多久？
事件回调结束
    ↓ ③ Presentation Delay：后续画面什么时候能被呈现？
下一帧能够呈现
~~~

| 显著增长的阶段 | 候选原因 | 下一步查什么 |
| --- | --- | --- |
| Input Delay | 同时运行的长任务、其他 Task、加载期脚本 | Main Thread / Long Task / 输入时间线 |
| Processing Duration | 复杂事件函数、重复计算、框架同步状态更新 | Event Timing、Handler Call Tree、Profiler |
| Presentation Delay | rAF、组件提交、Style/Layout/Paint 工作过多 | LoAF、Rendering Trace、DOM 更新范围 |

需要先确定哪一次 Interaction 出现慢响应，不能简单把多个 Event Timing 的 duration 求和作为 INP。用户业务请求 3 秒后成功，也不能直接声称该次 INP 就是 3000ms。

详细机制见 [Responsiveness / INP 三阶段诊断草稿](./Responsiveness-INP三阶段交互响应性能诊断与优化体系-草稿.md)。

### 【CLS 不按毫秒分段，而按最大偏移窗口和布局因果关系定位】

CLS 是对非预期布局位移的量化，通常选取页面中得分最高的 Session Window，而不是将页面生命周期所有 Shift 分数无限累加。Session Window 的相邻 Shift 间隔小于 1 秒、单个窗口最长 5 秒。[[4]](https://web.dev/articles/cls)

~~~text
发现 CLS 结果异常
        ↓
找到贡献最大的 Session Window
        ↓
定位窗口中得分高的 Layout Shift
        ↓
查看 startTime、score、hadRecentInput、sources
        ↓
根据 DOM 更新、媒体尺寸、字体与样式找布局变化源头
        ↓
验证真正导致其他元素移动的上游原因
~~~

LayoutShift.sources 记录的通常是**位置发生改变的受影响元素**，而不是天然的 Root Cause。例如正文被顶部新插入的模块推开，受影响者可能是正文，根因却是未预留空间的顶部模块。[[5]](https://web.dev/articles/debug-layout-shifts)

见 [Visual Stability / CLS 诊断草稿](./Visual-Stability-CLS视觉稳定性诊断与优化体系-草稿.md)。

### 【Smoothness 用帧结果识别异常，再结合 LoAF 三个时间区间】

先在有连续视觉更新的有效采样窗口里确认 Frame Interval P95/P99、Longest Gap 与 Budget Hit Rate；平均 FPS 是辅助信息，不是唯一结果。对于严重长帧，LoAF 提供长帧级别的时间区间归因：[[6]](https://developer.chrome.com/docs/web-platform/long-animation-frames)

~~~text
LoAF startTime
    ↓ ① Work Duration：渲染周期开始前的 Task / JS 等工作
renderStart
    ↓ ② Pre-layout：rAF 和正式样式布局前的同步工作
styleAndLayoutStart
    ↓ ③ Style/Layout 及后续区间：需借助 Trace 继续细分
LoAF 结束
~~~

LoAF 的第三段**不是纯 Layout 时间**，LoAF 也不能完整测量 GPU 最终呈现成本；没有有效 renderStart 的 Entry 不应生硬拆三段。LoAF 记录阈值为 50ms，而 60Hz 刷新周期约 16.7ms，**达不到 LoAF 记录门槛的工作仍可能引起掉帧**。

因此 Work 高先查任务、同步计算、GC；Pre-layout 高先查 rAF 回调与同步提交；第三段高继续查浏览器 Style/Layout/Paint；主线程证据不足时查 GPU、合成和设备。详情见 [Smoothness 诊断草稿](./Smoothness-持续渲染流畅度指标与性能诊断体系-草稿.md)。

