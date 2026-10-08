# Web 性能度量与诊断知识体系

> **定位**：以四类用户体验的结果指标为入口，建立“异常识别 → 指标内部归因 → 底层运行证据 → 技术根因 → 对应优化 → 效果验证”的完整体系。本篇是五篇诊断草稿的统一正式正文；技术机制按 [Web 性能优化工程体系](./W-Web性能优化工程体系.md) 的六大领域组织，性能采集、上报与 RUM 平台机制则在 [性能测量与真实用户监控专项](./X-性能测量与真实用户监控专项.md) 深入，不在此重新建设第二套优化技术分类。

> **资料与示例边界**：原稿中的时间线、版本、路由、代码及数值均用于机制演示，并非实际线上测量结果。浏览器 API、官方 attribution 字段与支持范围以目标环境和依赖版本为准。

~~~text
用户感到慢或指标出现回归
       ↓
Loading（主要内容晚出现）/ Responsiveness（交互反馈慢）
Visual Stability（意外位移）/ Smoothness（持续掉帧）
       ↓
分别使用 LCP 四段 / INP 三段 / CLS 位移窗口 / LoAF 帧归因
       ↓
Network、任务、JS、Layout、Paint、Raster、GPU、Memory 原始证据
       ↓
对应六大优化领域的实际运行成本与具体技术根因
       ↓
验证阶段变化、最终用户指标、跨指标副作用及正确性
~~~


## 1. 四类 Web 用户体验与统一指标诊断模型


### 【四类用户体验与结果指标区分加载、交互、稳定和持续画面】

Loading 关注主要内容出现，Responsiveness 关注操作后视觉反馈，Visual Stability 关注已显示内容的意外位置变化，Smoothness 关注持续更新是否稳定。三项 Core Web Vitals 为 LCP、INP、CLS；Smoothness 没有同等统一的 Core Web Vital。


#### <u>1. 先以视觉体验和结果指标确认恶化属于哪一维度</u>



**【四类用户体验分别回答四个不同问题】**


| 维度 | 视觉体验 | 主要结果指标 | 首要归因入口 |
| --- | --- | --- | --- |
| Loading（加载体验） | 页面主要内容迟迟无法出现 | LCP，辅以 FCP、业务关键内容时间 | TTFB / Resource Load Delay / Resource Load Duration / Element Render Delay |
| Responsiveness（响应体验） | 点击、触摸、按键后迟迟没有下一帧反馈 | INP | Input Delay / Processing Duration / Presentation Delay |
| Visual Stability（视觉稳定性） | 内容突然改变位置，阅读或点击位置受到干扰 | CLS（无单位分值） | Session Window / Layout Shift / Shift Sources |
| Smoothness（持续流畅度） | 动画、滚动、拖拽出现明显掉帧或停顿 | 活动窗口 Frame Interval P95、FPS、超预算比例等自定义组合 | LoAF / Long Task / Rendering / GPU Trace |

前三者都有官方 Core Web Vitals 口径；Smoothness 目前没有一个能直接与三者并列的统一 Core Web Vital，必须根据重要连续视觉更新是否存在，以及设备目标刷新率选择采样和评价方式。[[1]](https://web.dev/articles/smoothness)


**【结果值、阶段归因、原始证据必须分层解释】**


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


### 【性能结果、阶段归因、运行证据与根因验证形成逐层分析链】

一项指标发生恶化并不直接指向一段代码；先区分结果、异常阶段或对象、底层时间线，再找到具体的请求、计算、布局或图形工作。


#### <u>1. 性能指标恶化后的第一目标是建立完整的因果分析路径</u>



**【指标恶化只证明结果异常，不能直接推出某个具体原因】**


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


**【一套共同方法之下应保留四类指标自己的机制】**


通用诊断流程不代表四类体验都必须按“三个耗时”分段。LCP 与 INP 都有明确的阶段时间拆解；CLS 则依赖非预期布局偏移事件、窗口聚合和受影响元素；Smoothness 需要首先确认确实有连续视觉更新需求，再结合帧间隔、长帧与渲染 Trace。

**通用知识的稳定边界是分析方法，而不是所有业务画面的同一条渲染流水线。** 具体项目中选用哪些网络策略、数据结构、框架 API 和绘图技术，只有在第四、五步做源码诊断时才进入论证。


### 【六大优化领域提供从技术根因到方案机制的统一坐标】

这六项是技术成本层，不是把四个结果指标重新分类为六个结果。一个异常可能同时涉及多个技术领域，必须按证据决定主导因素。


| 技术领域 | 主要成本对象 | 典型指标关联 |
| --- | --- | --- |

| [① 网络传输优化](./W-Web性能优化工程体系.md#2-网络传输优化降低连接往返和重复传输成本) | 请求、连接和 HTTP 缓存 | 常用于 LCP 的文档等待与资源下载 |

| [② 服务端与数据交付优化](./W-Web性能优化工程体系.md#3-服务端与数据交付优化缩短内容生成和必要数据依赖) | HTML/接口生产、数据查询及流式交付 | 主要影响 LCP |

| [③ 资源加载优化](./W-Web性能优化工程体系.md#4-资源加载优化改变资源体积发现顺序和必要下载范围) | 资源字节、发现与加载优先级 | 关联 LCP 与 CLS |

| [④ JavaScript 与状态优化](./W-Web性能优化工程体系.md#5-javascript-与状态优化降低实际执行与对象管理成本) | JS 解析执行、状态更新和内存 GC | 关联 LCP、INP、CLS、Smoothness |

| [⑤ 任务调度与更新优化](./W-Web性能优化工程体系.md#6-任务调度与更新优化控制执行顺序更新频率和单次峰值) | 主动让步、优先级、合批和背压 | 关联 INP、LCP、Smoothness |

| [⑥ 浏览器渲染优化](./W-Web性能优化工程体系.md#7-浏览器渲染优化减少样式布局绘制合成与图形资源成本) | Layout、Paint、Raster、Composite 与 GPU | 关联四类体验 |


## 2. 性能异常通过分群上下文、生命周期与同口径基线确立


### 【版本、路由、设备和异常窗口决定性能回归的真实性】

比较性能数据前，应固定用户访问环境、浏览器和设备能力、硬导航/软导航、版本、时间、缓存条件及样本分布；否则 P75 变化不一定是代码退化。


#### <u>1. 性能上下文确定版本、路由、设备与具体异常窗口</u>



**【先建立 Context，才能判断“哪一类访问”真的变慢】**


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


**【建立同口径比较，而不是误把流量变化当作代码回归】**


分析顺序应为：

1. 检查监控采样、指标计算、SDK 版本及页面统计口径有没有发生变化。
2. 对比同 Route、相近设备与浏览器、相同导航类型的版本分群，查看结果分布。
3. 检查样本量与可代表性，保留访问量、P75、异常比例、相应发布时间。
4. 再与发布记录、灰度比例、功能开关及资源缓存变化做时间相关性匹配。

例如旧版移动端流量占 30%，新版占 70%，总体平均 LCP 上升未必是代码变慢，也可能是**用户组成变化**。反过来总体指标稳定，也可能掩盖某一低端设备群体的严重退化。

LCP、INP、CLS 常以页面访问级结果 P75 衡量，并按移动端与桌面端等合理分群；**一次访问的阶段耗时与聚合 P75 不属于同一种统计层次**。阶段分量的 P75 不能直接相加得到整体指标 P75。


**【同一个路由下的硬导航与客户端导航不一定可以共用诊断起点】**


导航开始时间和指标生命周期是上下文的一部分。一次硬导航有主 HTML 文档请求，TTFB 属于导航阶段；客户端 SPA 软导航则可能没有新的主 HTML 请求，不能无条件套用硬导航的 LCP 分段定义。

INP 可能在整个页面生命周期内某次晚发生的用户交互中恶化；CLS 可能发生在首屏加载后；Smoothness 需要给出真正连续更新的活动窗口和当前刷新目标。

因此应同时保留 Route、View、Navigation Type、Metric Instance 与 Event Time。它们的职责分别是**业务归属、界面状态、导航方式、测量身份和发生时刻**，不能相互替代。


### 【实验室复现与真实用户度量属于不同证据层】

Lab 有助于验证某项技术原因是否可重复；Field/RUM 判断真实访问分群是否变好。两者的技术证据和完整实验案例在第 7 章统一说明。


## 3. Loading 通过 LCP 四阶段归因定位关键内容出现延迟


### 【LCP 指标定义、四阶段边界和不同导航模型】

LCP 不等于页面 load、全部资源完成或业务 Hydration 完成。先确定候选元素、Navigation 起点、四段边界和与 FCP、业务关键内容的区别。


#### <u>1. Loading 性能分析先从用户体验建立整体诊断模型</u>



**【页面加载快不快，首先取决于用户什么时候看到主要内容】**


Loading（加载体验）回答的是：从发起导航到主要内容可见，用户等待了多久。这与接口是否已经返回、代码是否已经执行、组件是否已经挂载不完全相同。

LCP 是当前 Core Web Vitals 中用于反映主要内容加载速度的结果指标：浏览器记录符合 LCP 规则的最大可见图片或文本块何时完成绘制。它测量浏览器感知的可见内容，而不理解该内容在业务上是否最重要。按照 web.dev 的评价口径，以移动端和桌面端分别统计的实际页面访问 P75 衡量：LCP ≤ 2.5s 为良好；2.5s～4s 为需要改善；超过 4s 为较差。[[2]](https://web.dev/articles/lcp)

LCP 不等于页面全部资源下载完成，不等于 DOMContentLoaded / load，不等于 Hydration 完成，也不等于业务数据准备就绪。对于不同页面，LCP 元素可能是首屏主图、文章标题、大块文本或其他符合规则的元素。LCP 元素可以随加载过程改变：早期绘制的文本是候选值，之后更大的图片完成绘制后可能成为最终候选值。实际记录需要遵循页面生命周期和浏览器 API 规则，而不是把最早收到的一条 Entry 当成最终 LCP。

监控平台的诊断应当遵循两条相互配合的主线：

~~~text
体验与决策主线：
线上发现 LCP 回归
    ↓ 按 Route / Version / Device / Network / Navigation Type 缩小范围
确认受影响的访问群体
    ↓ 对具体访问做 LCP 四段耗时拆解
判断哪一个阶段新增耗时最多
    ↓ 读取对应的网络、资源、执行、绘制证据
形成可证伪的候选根因
    ↓ 同条件实验排除伴随现象
实施有针对性的优化
    ↓ 本地实验与线上相同分群对比
确认 LCP 和实际业务体验是否改善

浏览器加载主线（需要独立 LCP 资源的完整文档导航）：
发起文档导航
    ↓ TTFB：获得 HTML 首字节
浏览器开始接收并解析主文档
    ↓ Resource Load Delay：发现、调度关键资源
LCP 资源开始加载
    ↓ Resource Load Duration：获取关键资源
LCP 资源完成加载
    ↓ Element Render Delay：满足 DOM / CSS / JS / 绘制条件
浏览器完成 LCP 元素绘制
~~~

第一条是定位步骤，第二条是用于解释等待成本的资源生命周期。两者并非同一件事：监控应该先确认发生了什么体验问题，再根据浏览器阶段找证据，而不是见到 LCP 高便直接使用图片压缩、CDN 或 SSR。

性能异常诊断采用两级体系：

- **结果指标（Result Metric）**：LCP，判断页面主要内容显示是否过慢；FCP 可以补充最早内容显示的时机，但不替代 LCP。
- **诊断指标与证据（Diagnostic Data）**：TTFB、Resource Load Delay / Duration、Element Render Delay，以及更底层的 Navigation Timing、Resource Timing、Long Task、Performance Trace、Server Timing 等，负责解释“为什么慢”。

四阶段模型来自 web.dev 的 Optimize LCP。它是一套时间归因模型，四段无重叠、无缺口，合计为 LCP；浏览器不直接提供四个同名的独立标准 Performance Entry。[[3]](https://web.dev/articles/optimize-lcp)


**【先处理三种容易误导性能结论的差异】**


**访问场景差异**：首次冷导航、刷新、返回前进缓存恢复、客户端路由切换、预渲染激活不是完全相同的测量过程。尤其 SPA 软导航没有新 HTML 请求，不能把原始文档的 TTFB 搬到每次客户端路由中。

**样本群体差异**：同一个页面在高端桌面、低端手机、弱网、不同地区的性能差异很大。因此线上首先应保留版本、路由、设备、网络、导航类型和样本数量，必要时加入缓存命中、地区、实验分组。

**指标语义差异**：LCP 元素大小不代表业务价值。一个占据半屏的装饰图片可能成为 LCP；用户真正需要的数据表格还没出现。监控不能因此丢弃 LCP，但应另行测量业务关键内容的可见或可用时间。


#### <u>2. LCP 四阶段把“页面慢”拆为四种不同等待成本</u>



**【四个阶段分别回答四个问题】**


对有独立资源的 LCP 元素，可以把导航到最终绘制的时间划分为：

| 阶段 | 英文名称 | 该阶段结束时浏览器获得了什么 | 主要诊断问题 |
| --- | --- | --- | --- |
| ① 主文档交付 | TTFB（Time to First Byte，首字节时间） | HTML 第一个字节 | HTML 为什么迟迟没有到达？ |
| ② 关键资源发现与调度 | Resource Load Delay（资源加载前等待） | 浏览器开始加载 LCP 资源 | 资源为什么迟迟没有开始加载？ |
| ③ 关键资源获取 | Resource Load Duration（资源加载耗时） | LCP 资源已加载完成 | 资源已经开始加载，为什么需要这么久？ |
| ④ 关键元素呈现 | Element Render Delay（元素渲染等待） | LCP 元素完成绘制 | 资源就绪以后，为什么元素还没显示？ |

计算关系：

~~~text
LCP
= TTFB
+ Resource Load Delay
+ Resource Load Duration
+ Element Render Delay
~~~

直观时间点模型（同一次完整文档导航，图片资源的常规非重叠情况）：

~~~text
t0 = 导航时间原点
t1 = 主 HTML 响应首字节时间
t2 = 最终 LCP 资源加载起点
t3 = 最终 LCP 资源加载终点
t4 = 最终 LCP 元素绘制时刻

TTFB                 = t1 - t0
Resource Load Delay  = t2 - t1
Resource Load Duration = t3 - t2
Element Render Delay = t4 - t3
LCP                  = t4 - t0
~~~

上述表达是**概念级计算**。实际资源可能被预加载、从缓存读取或不存在独立 Resource Entry；某些资源计时字段还有重定向与浏览器安全限制。真实 SDK 应使用与 web-vitals 相同的规范化归因口径，避免时间重叠、负值、错误 URL 匹配。特别是**无需独立资源的系统字体文本 LCP**，两个 Resource 阶段按官方定义都为零，剩余时间归入 TTFB 与 Element Render Delay。[[3]](https://web.dev/articles/optimize-lcp) [[4]](https://github.com/GoogleChrome/web-vitals)


**【结果需要同时看绝对耗时、变化量和阶段占比】**


例如某一组有代表性的单次访问：

| 阶段 | 耗时 | 对 LCP 的贡献 |
| --- | ---: | ---: |
| TTFB | 800ms | 20% |
| Resource Load Delay | 1200ms | 30% |
| Resource Load Duration | 600ms | 15% |
| Element Render Delay | 1400ms | 35% |
| **LCP** | **4000ms** | **100%** |

这表示真正需要优先关注的是“关键资源为什么晚开始”和“资源就绪为什么晚呈现”，不能先认定“图片过大”。

对版本回归，优先比较**同等条件、可匹配样本上的阶段新增耗时**，而不是机械地选择当前绝对值最大的阶段。因为一个阶段可能原本就存在不可避免的网络成本，新增问题反而在另一个阶段。同时检查优化后的整体 LCP：某阶段缩短以后，节省的时间可能转移到后续等待环节，最终 LCP 未变。[[3]](https://web.dev/articles/optimize-lcp)

web.dev 提供的约 40% TTFB、少于 10% 资源发现等待、约 40% 资源加载、少于 10% 渲染等待，只是示意良好页面的相对结构，不是四项指标的强制阈值；尤其两个 Delay 阶段通常应尽可能减少无效等待。[[3]](https://web.dev/articles/optimize-lcp)


#### <u>3. 不同导航与渲染架构决定 LCP 四阶段适用边界</u>



**【硬导航与 SPA 软导航不能直接共用 TTFB 口径】**


**硬导航（Hard Navigation）**：用户输入 URL、刷新，或其他造成新 Document 导航的场景。浏览器重新获取主文档，通常存在主 HTML TTFB，可使用 Navigation Timing 和 LCP 四段进行归因。

**软导航（Soft Navigation）**：SPA 中通过 Router 改变 URL 和页面内容、但不重新加载主 HTML 文档的导航。它可能发生数据请求、JS Chunk 下载和组件渲染，却不存在一次新的主文档响应首字节，因此不能把最初 HTML 的 TTFB 复用于后续每次路由切换，也不能把路由后第一个 API 请求的等待直接改名为 TTFB。

截至本章核验，Chrome 从 151 版本起提供 Soft Navigations 和交互驱动的导航测量能力，官方浏览器端识别与用户交互、URL 变化、页面实际绘制等条件相关。GoogleChrome/web-vitals 文档指出：支持软导航的模式下，软导航 TTFB 记为 0；FCP/LCP 对应软导航之后的新内容绘制，而不是继续使用原始文档的 LCP。不同浏览器的支持与采集口径存在差异，不能把所有 Router 事件自动等同于浏览器认可的 Soft Navigation。[[5]](https://developer.chrome.com/docs/web-platform/soft-navigations) [[4]](https://github.com/GoogleChrome/web-vitals)

因此建议区分：

~~~text
Hard Navigation
→ Navigation Timing（主文档 TTFB）
→ LCP / Attribution（完整文档级）
→ 版本、路由与访问环境分群

Soft Navigation
→ 路由开始时刻
→ Route Data Fetch / Chunk Load / Component Update
→ 浏览器支持时的 Soft Navigation LCP
→ 不支持时使用自定义路由内容就绪指标并保留来源标记

对外报表必须按 Navigation Type 区分口径
~~~

Browser RUM 平台还需要对后退前进缓存恢复、预渲染等独立打标签，避免把它们混成普通冷导航。传统硬导航 LCP 与软导航 LCP 的候选元素、时间基准和页面生命周期不同，不能未经验证直接合并比较。


**【SSR、CSR、SSG 影响的是内容产生在哪里，而不是 LCP 定义】**


LCP 衡量实际绘制时刻，不要求主要内容由服务端生成。对于硬导航，SSR 或 CSR 都可能产生 LCP，只是关键内容可见的路径不同：

~~~text
SSR：
服务端获取数据 / 生成 HTML
→ 浏览器收到 HTML
→ 浏览器解析并绘制 SSR 内容
→ 客户端 Hydration 恢复交互
（LCP 可以发生在 Hydration 之前）

CSR：
浏览器收到初始 HTML
→ 下载和执行 JS
→ 客户端获取数据并创建 DOM
→ 浏览器绘制主要内容
（LCP 可能等待 JS / API / 组件）
~~~

SSR 能通过 HTML 提前暴露关键内容和 LCP 资源，但也可能使服务端生成成本进入 TTFB。SSG 能减少请求时生成 HTML 的成本，但会引入内容更新与缓存失效约束。Hybrid Rendering 则需要按具体路由的实际渲染方式判断。

Nuxt ClientOnly 是特定边界：默认插槽只在客户端渲染，服务端可输出 fallback，因此不能把默认插槽当作普通 SSR 内容。若 ClientOnly 中放置 LCP 元素，可能增加 DOM 建立和最终绘制的等待。[[6]](https://nuxt.com/docs/4.x/api/components/client-only)


**【LCP、FCP、业务关键内容指标关注不同完成条件】**


| 指标 | 回答的问题 | 限制 |
| --- | --- | --- |
| FCP（First Contentful Paint，首次内容绘制） | 页面是否开始呈现可见内容 | Loading 文本或无关元素也可能触发，不证明主体可用 |
| LCP | 视口内最大符合规则的内容何时绘制 | 不保证该元素是业务最重要内容 |
| 自定义关键内容可见时间 | 业务需要的指定内容何时出现 | 需要业务定义和埋点口径 |
| 自定义业务可用时间 | 用户何时能真正完成主要任务 | 还涉及数据状态、交互、权限和功能验收 |

例如数据分析页 FCP 可能来自“加载中”，LCP 可能来自装饰 Banner，但用户真正关心的图表在两秒以后才出现。正确做法是保留可标准化比较的 FCP / LCP，并补充“首批有效数据展示”或“主要图表可用”的业务指标，而不是因某张图片不重要就机械地用 FCP 替换 LCP。[[7]](https://web.dev/articles/user-centric-performance-metrics)

业务可见时间也不能简单以 API resolve、组件 mounted 或 performance.mark 调用时刻充当“已经完成屏幕绘制”；若需要确切观察特定元素呈现，应结合 Element Timing 等能力的支持范围，或将业务埋点定义为可重现的近似口径并明确误差。


### 【四个 LCP 耗时阶段分别关联内容交付、资源发现、下载和渲染】


| LCP 阶段 | 需要回答的问题 | 候选优化领域 |
| --- | --- | --- |
| TTFB | 文档首字节为什么迟到？ | [① 网络传输优化](./W-Web性能优化工程体系.md#2-网络传输优化降低连接往返和重复传输成本)、[② 服务端与数据交付优化](./W-Web性能优化工程体系.md#3-服务端与数据交付优化缩短内容生成和必要数据依赖) |
| Resource Load Delay | 关键请求为什么迟迟未发起？ | [③ 资源加载优化](./W-Web性能优化工程体系.md#4-资源加载优化改变资源体积发现顺序和必要下载范围)、[④ JavaScript 与状态优化](./W-Web性能优化工程体系.md#5-javascript-与状态优化降低实际执行与对象管理成本) |
| Resource Load Duration | 请求已发起，资源为什么还没到？ | [① 网络传输优化](./W-Web性能优化工程体系.md#2-网络传输优化降低连接往返和重复传输成本)、[③ 资源加载优化](./W-Web性能优化工程体系.md#4-资源加载优化改变资源体积发现顺序和必要下载范围) |
| Element Render Delay | 资源具备后，关键内容为什么还未呈现？ | [④ JavaScript 与状态优化](./W-Web性能优化工程体系.md#5-javascript-与状态优化降低实际执行与对象管理成本)、[⑤ 任务调度与更新优化](./W-Web性能优化工程体系.md#6-任务调度与更新优化控制执行顺序更新频率和单次峰值)、[⑥ 浏览器渲染优化](./W-Web性能优化工程体系.md#7-浏览器渲染优化减少样式布局绘制合成与图形资源成本) |

归因时必须比较绝对耗时和优化前后的阶段差值，不能仅比较四段占比。


#### <u>1. TTFB 诊断的是主 HTML 文档交付成本</u>


> **阶段归因 → 六大优化领域**：[① 网络传输优化](./W-Web性能优化工程体系.md#2-网络传输优化降低连接往返和重复传输成本)、[② 服务端与数据交付优化](./W-Web性能优化工程体系.md#3-服务端与数据交付优化缩短内容生成和必要数据依赖)。**证据与问题分类**：结合 Navigation Timing 分离连接与传输、文档首字节等待、服务端计算和缓存，不能仅据 TTFB 高推断数据库查询慢。 **方案选择条件**：以下原文保留阶段定义、上位原因、API、具体优化、风险与验证；技术领域链接是待证实的候选方向，而不是指标异常的自动结论。



**【TTFB 高不等于服务端代码一定慢】**


TTFB 从文档导航开始到主 HTML 首字节到达，可能包括重定向、域名解析、连接建立、TLS 协商、请求往返、缓存查找与服务端生成 HTML。它和 Resource Load Duration 都可能受网络与服务端影响，但**对象不同**：TTFB 关注主文档首字节，后者关注 LCP 资源的获取。

~~~text
开始文档导航
    ↓ 浏览器与导航前置处理
重定向 / DNS / Connection / TLS（可能被复用或省略）
    ↓ 请求抵达服务端或缓存节点
CDN / 网关 / 后端 / SSR / 数据依赖
    ↓
主 HTML 第一个字节抵达浏览器 → TTFB 结束
~~~

导航缓慢时，可从 Navigation Timing 的时间轴读取 responseStart、requestStart、domainLookupStart / End、connectStart / End、redirectStart / End 等数据；但各字段可能因缓存、连接复用、重定向跨源、Service Worker 和协议差异呈现零值或特殊行为。它们不能都简单相减后当成各项恒定存在的成本。服务端实际处理细节应结合 Server-Timing 或后端 Trace，而不是仅靠浏览器 TTFB 推断。[[8]](https://developer.mozilla.org/en-US/docs/Web/API/PerformanceNavigationTiming) [[9]](https://developer.mozilla.org/en-US/docs/Web/API/PerformanceResourceTiming/serverTiming)


**【TTFB 异常的三个上位原因及工程方向】**


**【1. 导航和网络连接成本】**

- **现象**：用户尚未到达真正的文档服务，就经历多次重定向、域名解析或网络往返。
- **例子**：访问 example.com → 跳到 www.example.com → 再跳语言页面；每次跳转可能增加额外往返。
- **证据**：Network Waterfall 里存在重定向链；Navigation Timing 的相关字段或网络跟踪显示耗时集中于请求前。
- **优化类型**：导航入口治理。直接使用最终规范 URL、缩短重定向链、合理利用连接复用和适当的资源交付地域。
- **不能直接推出**：TTFB 高就一定应该加 CDN；若异常实际上发生在服务端数据库，网络分发并不能根治。

**【2. 服务端生成与业务依赖成本】**

- **现象**：网络已到达服务端，但首字节需要等接口、数据库、模板渲染或 SSR 工作。
- **例子**：SSR 请求必须先查询列表、再请求第三方服务，最后才能生成首段 HTML。
- **证据**：服务器端分阶段 Trace、Server-Timing、数据库慢查询、SSR 处理时间与主文档请求时序相关。
- **优化类型**：服务端关键路径治理。减少串行依赖，优化数据库查询、数据缓存、HTML 生成；允许的场景可以使用流式响应，把可以提前发出的内容先交付。
- **架构取舍**：SSR 会让 HTML 更早包含关键内容，但如果服务端必须等待慢接口，TTFB 可能上升。不能因为“SSR”就断言首屏一定更快。

**【3. 文档缓存与边缘交付成本】**

- **现象**：大量相同的可公开缓存页面每次都回源生成，或缓存因 URL 参数、规则和失效机制没有命中。
- **证据**：CDN Cache Hit / Miss、响应缓存头、回源比例、服务端请求数量。
- **优化类型**：内容交付策略。对于更新相对稳定的公开页面，评估 SSG、预渲染、CDN 缓存或分层缓存；对于个性化或敏感 HTML，先保证权限与缓存键隔离，不能为了 TTFB 直接共享页面响应。
- **边界**：页面是否允许缓存取决于内容一致性、权限和更新约束。SSG 可能提高交付效率，但需要解决数据更新与重新生成、缓存失效的问题。


**【TTFB 的排查判断】**


假设 LCP 4.0s，TTFB 2.3s：浏览器收到 HTML 之前已消耗大部分预算。应先比较重定向/连接与后端处理所占的时间，再决定是网络入口、服务端依赖还是缓存策略的问题。只有客户端 TTFB，不足以证明具体函数、SQL 或第三方服务是根因。


#### <u>2. Resource Load Delay 诊断的是 LCP 资源发现和调度是否及时</u>


> **阶段归因 → 六大优化领域**：[③ 资源加载优化](./W-Web性能优化工程体系.md#4-资源加载优化改变资源体积发现顺序和必要下载范围)、[④ JavaScript 与状态优化](./W-Web性能优化工程体系.md#5-javascript-与状态优化降低实际执行与对象管理成本)。**证据与问题分类**：在 Network 中核对 LCP 资源的请求发起时机、Initiator 与 Priority，判断是 HTML 可发现性、CSS/JS 依赖、懒加载还是优先级。 **方案选择条件**：以下原文保留阶段定义、上位原因、API、具体优化、风险与验证；技术领域链接是待证实的候选方向，而不是指标异常的自动结论。



**【这一阶段不是下载慢，而是下载尚未开始】**


Resource Load Delay 从主 HTML 首字节已到达、到 LCP 对应资源开始加载。浏览器通常需要从 HTML、CSS、JS 或业务数据中发现资源地址，之后再按网络调度与优先级发起加载。因而这段时间主要反映**关键资源被发现或真正调度得太晚**。[[3]](https://web.dev/articles/optimize-lcp)

例如：

~~~text
HTML 400ms 已收到首字节
    ↓ 加载和执行 JS
JS 在 1000ms 完成
    ↓ 等待接口返回图片 URL
图片在 1600ms 开始加载
    ↓
Resource Load Delay 约 1200ms
~~~

这里即使图片只有 100KB，也已经损失了超过一秒的等待。提前压缩图片只作用于下一阶段；应该先考虑是否能更早向浏览器暴露图片 URL。


**【Resource Load Delay 异常的三个上位原因及工程方向】**


**【1. 资源发现过晚：HTML 中没有暴露关键地址】**

- **现象**：初始 HTML 不包含 LCP 图片；必须等待客户端 JS、组件创建、CSS 解析或数据接口才出现图片 URL。
- **典型机制**：CSR 的根节点没有主视觉 DOM；JS 启动 → Fetch 业务数据 → 组件渲染 → 才创建 img；CSS background-image 也可能比直接在 HTML 中的 img 晚被发现。
- **证据**：查看初始 HTML 能否直接定位最终 LCP 资源；Network Waterfall 中其开始时间明显晚于 HTML、JS 或数据请求；Initiator 与请求依赖链指向 JS / CSS。
- **优化类型**：关键资源可发现性治理。在满足渲染需求的前提下让首屏关键 img 尽量直接出现在初始 HTML；SSR、SSG 可帮助输出资源 URL。若资源无法从标记直接发现但 URL 已知，评估适当 Preload。
- **边界**：Preload 并不是资源下载之后再“提前渲染”；它是向浏览器提前声明需要获取的关键资源。不能为大量资源滥用 Preload，避免抢占更关键请求。

**【2. 调度优先级不合理：资源已知却被延后请求】**

- **现象**：首屏 LCP 图片被设置为 loading=lazy，或关键图片未被给予足够的网络优先级。
- **证据**：检查 img 属性、DevTools Network Priority / Waterfall；LCP 图片是否明显晚于其他非关键资源开始。
- **优化类型**：首屏与非首屏资源分级。首屏 LCP 图片应避免懒加载；合理考虑 loading=eager、fetchpriority=high，非首屏图片与次要模块才考虑 Lazy Load。[[3]](https://web.dev/articles/optimize-lcp)
- **边界**：提高 Priority 是提示浏览器，不保证任意环境下绝对顺序；全部资源都设高优先级会使优先级策略失去意义。

示例：

~~~html
<!-- 首屏确定为 LCP 的图片：不要用 loading="lazy" 延后 -->
<img
  src="/hero.webp"
  width="1200"
  height="600"
  loading="eager"
  fetchpriority="high"
  alt="页面主要内容图片"
/>

<!-- 次要、首屏以外的图片：适合按需加载 -->
<img src="/gallery-20.webp" loading="lazy" alt="其他图片" />
~~~

width 与 height 用于提前占位、改善布局稳定性，不能代替资源压缩；fetchpriority 用于请求优先级，不直接减少资源字节数。

**【3. 业务前置依赖过多：必须等多个结果才能确定图片】**

- **现象**：需要先获得配置、活动详情或鉴权后的数据，才能知道最终 LCP 图片是什么。
- **证据**：API 请求结束时间与图片请求开始时间紧密衔接；查看业务代码可以确认 URL 的生产链路。
- **优化类型**：缩短首屏关键数据依赖链。能预先确定的配置直接放入 HTML 或缓存，非关键数据异步补齐，可并行的请求不串行等待。
- **边界**：若资源 URL 受权限或实时业务状态控制，不能为了加速而泄露给未授权用户；需要根据实际业务允许的最早时机加载。


**【这一阶段应该怎样决定下一步】**


若 TTFB = 400ms，图片资源直到 1800ms 才开始，加载只要 300ms：优先回答“为什么 1400ms 没有开始加载”，不要先把 300ms 下载时间当成主因。依次核验初始 HTML → Initiator → Lazy/Fetch Priority → 依赖接口顺序。仅凭 Load Delay 较高不能证明一定是“错误配置”，也可能是 CSR / 数据依赖设计带来的时间成本。


#### <u>3. Resource Load Duration 诊断的是关键资源获取的真实成本</u>


> **阶段归因 → 六大优化领域**：[① 网络传输优化](./W-Web性能优化工程体系.md#2-网络传输优化降低连接往返和重复传输成本)、[③ 资源加载优化](./W-Web性能优化工程体系.md#4-资源加载优化改变资源体积发现顺序和必要下载范围)。**证据与问题分类**：已开始加载后，再比较资源真实字节、传输时间、图片格式和编码、缓存状态以及链路争用。 **方案选择条件**：以下原文保留阶段定义、上位原因、API、具体优化、风险与验证；技术领域链接是待证实的候选方向，而不是指标异常的自动结论。



**【资源已经开始加载，接下来才讨论文件体积与传输】**


Resource Load Duration 是 LCP 资源从加载起点到加载完成的持续时间。它可能涉及请求排队、连接/重定向、服务器响应、传输与缓存，并非严格等于“开始接收正文到最后一个字节”的纯下载时间。可以通过对应 Resource Timing Entry 的 startTime、fetchStart、responseStart、responseEnd、duration、transferSize、encodedBodySize 等字段辅助拆解。startTime 与 fetchStart 的区别涉及重定向等场景，因此生产计算应保持统一口径。[[10]](https://developer.mozilla.org/en-US/docs/Web/API/PerformanceResourceTiming) [[11]](https://developer.mozilla.org/en-US/docs/Web/API/PerformanceResourceTiming/fetchStart)


**【Resource Load Duration 异常的四个上位原因及工程方向】**


**【1. 文件体积过大：加载了远超实际需要的字节】**

- **现象**：页面只需要显示 600px 主图，却发送 4000px 原始图；或下载体积很大的字体、图片。
- **证据**：资源 Transfer Size、Encoded Body Size、尺寸与实际 CSS 展示大小，结合同等网络条件下下载时间变化；跨源 Timing 可能受安全限制。
- **优化类型**：资源内容治理。根据实际显示尺寸生成响应式资源，使用 srcset / sizes、WebP / AVIF、压缩、合理裁切；必要时治理字体加载与字体子集。
- **边界**：图片体积减小会降低传输成本，但**未必降低 LCP**。若图片原本已提前加载完成，页面仍被 JS 或样式等待阻塞，节省的时间可能转移到 Element Render Delay。[[3]](https://web.dev/articles/optimize-lcp)

**【2. 资源服务器或网络连接成本高：小文件仍然来得慢】**

- **现象**：图片源站距离用户较远、跨多个域名建立连接、服务端资源响应慢。
- **证据**：Resource Timing 的连接/请求/响应阶段、目标域名与 CDN 命中情况、地域及网络分群。
- **优化类型**：分发和连接策略。合适的 CDN、资源就近交付、避免无意义跨域拆分、关键连接的预连接（preconnect），或优化资源服务器本身。
- **边界**：预连接不是对所有域名都有效；连接已复用时，再加预连接可能收益很小。服务端处理与网络 RTT 需要进一步区分。

**【3. 非关键资源竞争：关键资源被其他下载占用带宽】**

- **现象**：首屏同时加载大量列表图片、第三方脚本和非关键 JS，使 LCP 图片获取变慢。
- **证据**：Network Waterfall、资源并发数、优先级与传输时序。
- **优化类型**：加载顺序治理。关键资源优先，非关键图片懒加载，非关键模块适当 Code Splitting / Dynamic Import，推迟第三方脚本或其他非必需传输。
- **边界**：Code Splitting 不会直接缩小 LCP 图片，也不保证整体加载更快；若关键模块又被拆成需要串行下载的 Chunk，还可能增加发现等待和往返。

**【4. 缓存没有复用：重复支付本可避免的网络成本】**

- **现象**：多次访问相同资源仍然重新完整下载；CDN 回源率高。
- **证据**：Cache-Control、ETag/304、Cache Hit、Resource Timing 字节数、DevTools Network。
- **优化类型**：浏览器与 CDN 缓存。静态资源可采用内容哈希文件名和合适的长缓存策略；动态内容按更新和权限要求配置缓存。
- **边界**：transferSize=0 不能无条件断言“命中缓存”，因为跨域缺少 Timing-Allow-Origin 时也可能无法暴露该字段。[[12]](https://developer.mozilla.org/en-US/docs/Web/API/PerformanceResourceTiming/transferSize)


**【这一阶段的排查判断】**


若 HTML 及时到达、LCP 图片也及时开始加载，但资源阶段持续 2100ms，应先读取 Resource Timing：体积是否不合理、连接与响应是否慢、是否存在带宽竞争、缓存是否命中。只有确认真正慢在传输/获取阶段，才优先实施图片体积治理、CDN 或加载竞争优化。


#### <u>4. Element Render Delay 诊断的是关键资源就绪后仍未呈现的原因</u>


> **阶段归因 → 六大优化领域**：[④ JavaScript 与状态优化](./W-Web性能优化工程体系.md#5-javascript-与状态优化降低实际执行与对象管理成本)、[⑤ 任务调度与更新优化](./W-Web性能优化工程体系.md#6-任务调度与更新优化控制执行顺序更新频率和单次峰值)、[⑥ 浏览器渲染优化](./W-Web性能优化工程体系.md#7-浏览器渲染优化减少样式布局绘制合成与图形资源成本)。**证据与问题分类**：图片或文本具备渲染条件之后，分别检查脚本初始化、Hydration、后续任务、图像解码、样式布局与最终 Paint。 **方案选择条件**：以下原文保留阶段定义、上位原因、API、具体优化、风险与验证；技术领域链接是待证实的候选方向，而不是指标异常的自动结论。



**【下载完成，不代表 LCP 已经可以绘制】**


Element Render Delay 从最终 LCP 资源完成加载到浏览器完成该元素绘制。下载文件只是呈现的一个条件，页面还要满足 DOM 存在、样式与可见性、主线程可调度和浏览器完成必要渲染工作。对于无需独立资源的文本 LCP，该阶段还包括 TTFB 之后直到文本完成绘制的剩余等待。

核心误区是把 Render Delay 简化成 Style / Layout / Paint 的执行耗时。事实上它可能包含大量**尚未开始绘制之前的等待**，例如图片已经预加载完成，但 JS 还没有创建 img，或者 A/B 实验代码把整个应用隐藏了。[[3]](https://web.dev/articles/optimize-lcp)


**【Element Render Delay 异常的四个上位原因及工程方向】**


**【1. 渲染依赖尚未就绪：样式或同步脚本阻塞页面】**

- **现象**：图片早已下载，但渲染所需的 CSS 或同步 JS 尚未完成。
- **证据**：Network 中关键样式表或同步脚本结束较晚；Chrome Performance / Coverage 显示关键路径依赖。
- **优化类型**：关键渲染路径治理。优化关键 CSS 与阻塞脚本，把非关键样式或 JS 安排到不会阻碍首屏的时机。
- **边界**：延后 CSS/JS 必须保证样式正确性和业务行为；不能通过简单移除样式造成新的 CLS 或功能异常。

**【2. 关键 DOM 或显示条件准备晚：资源先到，内容后建】**

- **现象**：已经预加载了 hero.webp，但客户端路由初始化、组件动态 import 或接口完成后才创建 img；也可能图片元素被设置为隐藏状态，等待业务或实验规则。
- **证据**：Resource responseEnd 较早，但 DOM 创建、元素显示状态或相关业务 API 时间较晚；LCP Entry 的最终元素与这些事件同一时间窗口。
- **优化类型**：关键内容生成与展示治理。针对允许在服务端呈现的内容使用 SSR/SSG，避免主视觉被无关业务状态阻塞；如果必须客户端生成，缩短先决依赖，并保持占位与明确的可见条件。
- **架构边界**：Nuxt 的 ClientOnly 默认插槽只在客户端渲染，服务端通常只能输出 fallback；如果首屏 LCP 元素放在这里，可能推迟其绘制。SSR 输出的内容**可以在 Hydration 之前成为 LCP**，不需要先完成水合。[[6]](https://nuxt.com/docs/4.x/api/components/client-only)

**【3. 主线程被占用：内容本可绘制，但浏览器得不到渲染机会】**

- **现象**：图片已到，但同步计算、第三方脚本、复杂框架初始化或长任务占据主线程。
- **证据**：Chrome Performance Trace 的 Main Thread、Long Task、脚本耗时与 LCP 前时间窗口重叠；仅看一次 Long Task 仍无法直接确认因果。
- **优化类型**：JavaScript 执行成本治理。减少首屏非必需代码、合适的代码拆分、拆解长同步任务、后移非关键初始化；纯计算可视情况移到 Worker。
- **边界**：Worker 不直接执行主线程 DOM / Layout 工作；代码拆分必须真的减少关键路径上的执行，而不是把同量代码变成更多串行请求。

**【4. 浏览器绘制工作过重：布局、绘制或图片处理过重】**

- **现象**：DOM 已存在、资源已就绪，浏览器仍要进行昂贵的图片处理、Style / Layout / Paint / Composite。
- **证据**：Chrome Trace 的 Rendering、图片解码、Layout、Paint、强制同步布局记录，及对应元素参与的渲染范围。
- **优化类型**：浏览器渲染成本治理。减少无效布局读写、复杂 DOM 范围、非必要的绘制效果；选用合理解码和展示尺寸。
- **边界**：图片“过大”可能同时增加下载量和解码成本，需要看 Resource Load Duration 与 Element Render Delay 的实际贡献再分别归因。


**【子阶段减少，最终 LCP 不一定减少】**


假设原始情况：

~~~text
LCP 图片下载结束：1000ms
JS 初始化结束：1800ms
LCP 绘制：1900ms
~~~

压缩图片后下载结束提前至 700ms，但 JS 初始化仍要到 1800ms 才允许元素出现，那么 LCP 仍可能是 1900ms。变化只是：

~~~text
Resource Load Duration 减少约 300ms
Element Render Delay 增加约 300ms
最终 LCP 无明显变化
~~~

因此诊断不能只看“Resource 已经更快”，而应关注哪个条件最后阻碍 LCP 绘制。[[3]](https://web.dev/articles/optimize-lcp) [[13]](https://web.dev/blog/common-misconceptions-lcp)


### 【Performance API、Attribution 和 RUM 提供同一加载实例的证据】


#### <u>1. Performance API 与 web-vitals 将四段诊断落到可采集证据</u>



**【先区分浏览器原始 Entry 和已经计算的四阶段字段】**


浏览器提供的是原始 Performance Timing 数据，而不是名为 Resource Load Delay、Element Render Delay 的四个独立原生指标。

| 需要的数据 | 主要来源 | 诊断用途 |
| --- | --- | --- |
| 主 HTML 导航时间 | PerformanceNavigationTiming | TTFB、重定向、连接与文档请求时序 |
| LCP 最终候选的元素与时间 | LargestContentfulPaint / web-vitals LCP | 识别主要内容绘制结果 |
| 对应 LCP 资源时序 | PerformanceResourceTiming | 资源起点、终点、字节数、缓存、请求阶段 |
| 四段统一归因值 | web-vitals/attribution | 已计算的 TTFB、Load Delay、Load Duration、Render Delay |
| 页面执行与绘制诊断 | Chrome Performance Trace、Long Task、LoAF | 分析 JS 和浏览器渲染等待 |
| 业务数据与组件显示节点 | User Timing、业务事件与服务端 Trace | 补足 API 和组件关键路径证据 |

web-vitals attribution build 的 LCPAttribution 包含：

- timeToFirstByte：主文档首字节阶段；
- resourceLoadDelay：关键资源开始加载前的等待；
- resourceLoadDuration：关键资源加载持续时间；
- elementRenderDelay：关键元素渲染等待；
- target：目标元素选择器/描述；
- url：相关 LCP 图片资源 URL（如果有）；
- navigationEntry、lcpResourceEntry、lcpEntry：可选的原始归因 Entry。

这套字段定义来自 GoogleChrome/web-vitals 官方 README 的 Attribution 接口，不应将 LCPEntry 与 ResourceEntry 混为同一个对象。[[4]](https://github.com/GoogleChrome/web-vitals)


**【推荐最小接入示例：使用官方归因库】**


~~~ts
import { onLCP } from 'web-vitals/attribution';

// 这是通用示例，不代表某个项目已有的 SDK 源码。
// 真实上报时还需采样、脱敏、路由归属、数据有效性和队列控制。
onLCP((metric) => {
  const a = metric.attribution;

  const sample = {
    metric: 'LCP',
    value: metric.value,
    metricId: metric.id,

    phases: {
      ttfb: a.timeToFirstByte,
      resourceLoadDelay: a.resourceLoadDelay,
      resourceLoadDuration: a.resourceLoadDuration,
      elementRenderDelay: a.elementRenderDelay,
    },

    target: a.target,
    resourceUrl: a.url,
    // 实际上报前需要标准化和脱敏，不应直接序列化 DOM 对象。
  };

  console.log(sample);
});
~~~

这段代码证明：LCP 可以作为一个结果值上报，四个阶段可以作为同一个 LCP Sample 的诊断维度。它**不证明**网络上报端、Session 关联或服务器聚合已经接通。

对于通常只需要最终值的 RUM，不应默认将所有中间 LCP 候选上报成独立访问；如果打开 reportAllChanges，需要按 Metric ID 和终态处理更新，避免重复计数。采集版本和浏览器支持能力应记录在平台元信息中。[[4]](https://github.com/GoogleChrome/web-vitals)


**【原生 API 示意：原始记录可获取，但生产计算不能机械相减】**


~~~js
const navigation = performance.getEntriesByType('navigation')[0];

if (navigation) {
  const ttfb = navigation.responseStart - navigation.startTime;
  console.log('主 HTML TTFB', ttfb);
}

const resources = performance.getEntriesByType('resource');
console.log('已记录资源数量', resources.length);

const observer = new PerformanceObserver((list) => {
  for (const entry of list.getEntries()) {
    console.log('LCP 候选', entry.startTime, entry.url, entry.element);
  }
});

observer.observe({
  type: 'largest-contentful-paint',
  buffered: true,
});
~~~

这一段只演示三类原始证据的位置：主文档 Navigation、资源 Timing、LCP 候选。还不构成完整的正确 LCP 归因实现。原因包括：

1. LCP 候选可能变化，最终 LCP 需按浏览器和库的生命周期规则确定。
2. 图片可能是 CSS background，Resource Timing 可能存在同 URL 多次请求、重定向、预加载或资源复用，不宜只按 URL 做第一个匹配。
3. 无独立资源的文本 LCP，两段 Resource 时间按定义为 0。
4. Resource startTime / fetchStart / responseEnd 的具体口径与重定向不同，不能混搭产生负数或重复计算。
5. 跨源资源可能缺少 Timing-Allow-Origin，部分详细网络时间与大小不可见或返回 0；不能无条件把 transferSize=0 当缓存命中。[[10]](https://developer.mozilla.org/en-US/docs/Web/API/PerformanceResourceTiming) [[12]](https://developer.mozilla.org/en-US/docs/Web/API/PerformanceResourceTiming/transferSize)
6. 软导航不应拿原文档 NavigationTiming 的 TTFB 和新路由 LCP 混用。

为采集初始化之前产生的记录，PerformanceObserver 可以使用 observe({type: '...', buffered: true})；buffered 必须与单个 type 搭配，不能和 entryTypes 混写；缓冲区有容量限制，采集时间较晚不意味着能完整恢复所有历史 Entry。[[14]](https://developer.mozilla.org/en-US/docs/Web/API/PerformanceObserver/observe)


**【TTFB 还能进一步拆分，但 Waiting Duration 不是第四个 LCP 阶段】**


当第一阶段 TTFB 明显异常时，可进一步使用 Navigation Timing 或 web-vitals 的 TTFB Attribution：

~~~text
一级：LCP 四阶段
├─ TTFB
│   ├─ waitingDuration：请求处理开始前的等待
│   ├─ cacheDuration：缓存检查阶段
│   ├─ dnsDuration：域名解析
│   ├─ connectionDuration：连接建立
│   └─ requestDuration：请求至首字节的阶段
├─ Resource Load Delay
├─ Resource Load Duration
└─ Element Render Delay
~~~

waitingDuration、cacheDuration 等名字来自 TTFBAttribution，属于 TTFB 的二级拆解，不是与 Element Render Delay 并列的另一种一级 LCP 阶段。不同版本的字段命名可能变化，例如 web-vitals v4 对一些 Attribution 字段做过重命名，使用前按实际依赖版本核对。[[4]](https://github.com/GoogleChrome/web-vitals)


#### <u>2. 线上 RUM 必须使结果指标、阶段归因与诊断证据属于同一次访问</u>



**【Context 的职责是建立归属，而不是在异常以后才临时补齐】**


建议将结果和诊断数据关联到统一的页面访问上下文：

~~~text
App / Environment
    ↓
Release Version / Build
    ↓
Navigation Type（硬导航或软导航）
    ↓
Route / View ID
    ↓
Session / Navigation ID
    ↓
设备、浏览器、网络、地区
    ↓
Metric Timestamp / Resource Timestamp
~~~

这样可以从某个 LCP 异常样本反查同一 View 的资源、接口、脚本和渲染证据。

一个通用的示意数据结构：

~~~json
{
  "type": "performance",
  "name": "LCP",
  "value": 3200,
  "unit": "ms",
  "navigationType": "navigate",
  "context": {
    "route": "/dashboard",
    "version": "2.4.1",
    "deviceClass": "mobile",
    "viewId": "view-demo-1",
    "sessionId": "session-demo-1"
  },
  "attribution": {
    "timeToFirstByte": 350,
    "resourceLoadDelay": 1200,
    "resourceLoadDuration": 500,
    "elementRenderDelay": 1150
  }
}
~~~

这里只是事件结构示意，并非某个 Browser Monitor 项目的已实现协议。生产设计还需处理隐私脱敏：不要把用户 Token、查询参数中的敏感信息、完整 DOM 或未授权内容直接作为监控字段上传。


**【聚合结果与单次诊断不能混淆】**


线上评价可以对每个真实页面访问形成一个有效的 LCP 值，再按 Version、Route、Device 和 Network 分群，计算 P50、P75、P95、样本数与趋势。Core Web Vitals 的主要评价口径是 P75；P95 主要作为尾部体验的补充，不应以一次本机点击代替真实用户分布。[[2]](https://web.dev/articles/lcp)

需要注意数学关系：

~~~text
单次访问成立：
LCP_i = TTFB_i + LoadDelay_i + LoadDuration_i + RenderDelay_i

但分位数通常不满足：
P75(LCP) ≠ P75(TTFB) + P75(LoadDelay)
          + P75(LoadDuration) + P75(RenderDelay)
~~~

因此如果展示“一个页面 LCP P75 的四阶段组成”，应该明确定义做法：例如选择接近该群体 LCP P75 的代表性真实样本，再展示该样本四段；或者直接分别显示四段的分布与版本变化，并标明这些分位数不能直接相加。不能把各阶段的 P75 生硬拼成一条总时长。

线上需要同时监控样本量、采样率、上报缺失率、浏览器支持和发布前后流量构成；否则“某版本 P75 变坏”可能混入设备结构变化、弱网用户比例变化或采集口径改变。页面性能观测只是关联证据，确认实际根因还需受控实验。[[15]](https://web.dev/articles/vitals-field-measurement-best-practices)


### 【阶段决策树、完整案例与优化后 LCP 验证】


#### <u>1. LCP 诊断决策树应从异常阶段导向具体优化类别</u>



**【从四阶段选方向，而不是从优化技术反推问题】**


~~~text
发现 LCP 性能回归
    ↓
确认比较对象一致
Route / Version / Device / Network / Navigation Type
    ↓
拆分代表性样本的 LCP 四阶段
    ↓
哪一段相对基线新增的耗时最大？
    │
    ├─ TTFB
    │    → 导航、网络、服务端与 HTML 缓存
    │    → Navigation / Server-Timing / Backend Trace
    │
    ├─ Resource Load Delay
    │    → 资源发现、调度优先级、前置依赖
    │    → 初始 HTML / Initiator / Network Waterfall
    │
    ├─ Resource Load Duration
    │    → 资源体积、请求响应、传输、竞争、缓存
    │    → Resource Timing / Size / Priority / Cache
    │
    └─ Element Render Delay
         → DOM 显示条件、CSS/JS 阻塞、主线程与绘制
         → Performance Trace / DOM / Long Task / Rendering
    ↓
只改变一个有根据的因素
    ↓
观察四个阶段以及最终 LCP 是否同步改善
    ↓
线上原分群比较 P75 / P95 / 样本数
~~~

一个“诊断现象 → 处理方向”映射：

| 可观察的异常组合 | 下一步优先检查 | 对应策略，不宜直接跳结论 |
| --- | --- | --- |
| TTFB 与服务端 Trace 同时高 | SSR、接口、数据库与缓存 | 缩短关键服务端依赖 |
| TTFB 高但服务端耗时正常 | 重定向、连接、CDN 路径 | 入口及网络交付治理 |
| HTML 到达早，LCP 图片请求开始晚 | 初始 HTML、JS 依赖、lazy、priority | 提前发现和调度首屏关键资源 |
| 图片开始早但耗时久、体积大 | 显示尺寸、压缩、实际网络吞吐 | 图片及资源内容治理 |
| 图片不大但加载久 | 服务器、连接、带宽竞争、缓存 | 资源分发与并发策略 |
| 图片很早下载完成，但 LCP 晚 | DOM 创建、隐藏、CSS、JS 长任务 | 页面呈现和主线程成本治理 |
| Resource Load 变短但 LCP 不变 | Render Delay 是否同步变长 | 找出最终阻塞显示的另一条件 |


**【一次完整的演示：如何根据数据逐步缩小根因】**


假设 /dashboard 的版本 2.4.1 上线后，Mobile 弱网样本的 LCP P75 从 1.8s 变为 3.5s。

以下是两条具有演示性质的、分别来自旧版与新版的代表性访问，**不是两组 P75 子指标的分解**：

| 耗时阶段 | 旧版样本 | 新版样本 | 新增耗时 |
| --- | ---: | ---: | ---: |
| TTFB | 350ms | 400ms | +50ms |
| Resource Load Delay | 150ms | 1350ms | +1200ms |
| Resource Load Duration | 400ms | 450ms | +50ms |
| Element Render Delay | 900ms | 1300ms | +400ms |
| **LCP** | **1800ms** | **3500ms** | **+1700ms** |

第一步：主要新增成本集中在 Resource Load Delay，因此先查资源发现，而不是先怀疑服务端或图片压缩。

第二步：在同场景 DevTools Waterfall 中查最终 LCP 图片的 Initiator。如果新版必须等待应用 JS 初始化和数据请求以后才创建图片 URL，则构成合理的候选解释。

第三步：调整关键资源发现方式，例如通过 SSR HTML 提前暴露主图；同条件测试资源开始加载时刻是否前移，观察最终 LCP 是否同步缩短。

第四步：新版的 Element Render Delay 也多了 400ms，继续排查关键 DOM 是否隐藏、CSS 是否阻塞、是否有新的主线程工作。这部分如果不处理，单独提前下载图片可能无法取得预期 LCP 收益。

第五步：发布以后按相同版本、路由、设备、网络与导航类型观察真实访问 P75、P95、样本数，并对比业务关键内容的显示或可用时间。

这条链最重要的是“指标异常 → 形成假设 → 找证据 → 改动验证 → 回归结果”，而不是按某个阶段的名称直接执行固定优化清单。


#### <u>2. Loading 优化需要同时维护效果证据、风险边界和迭代口径</u>



**【Lab 和 Field 验证的是不同层面的结论】**


Lab Verification（实验室验证）：控制设备、网络、CPU、缓存、数据、访问方式和操作步骤；通过 Chrome DevTools、Lighthouse、Trace 验证某项变更确实减少目标耗时。重点在**因果与可复现**。

Field Verification（线上真实用户验证）：发布后收集真实访问，按同样的分群对比整体 LCP P75 / P95 与受影响用户比例。重点在**真实用户是否最终受益**。

只看到新版本的 Lighthouse 分数提高，不足以证明线上用户体验改善；只看到线上 LCP 下降、却没有基线与实验，也无法确定一定是某次优化的因果作用。


**【优化的负面影响也应进入验收】**


- 把更多资源提前加载，可能增加带宽竞争和服务器压力。
- 把 JS 后移，可能改善 LCP，但让主要交互迟迟不可用。
- SSR 能更早输出内容，却可能增加请求时服务端处理与 TTFB。
- 过于激进的缓存可能带来内容过时，错误的共享缓存可能造成用户数据泄露。
- 提前移除占位或延后样式可能改善一个加载时点，却带来 CLS（布局偏移）。
- 业务“数据可用”与“元素可见”是不同条件，要分别验证。
- 监控 SDK 本身要控制额外 CPU、内存和上报量，不能为诊断而明显恶化页面表现。

因此 Loading 优化不能单指标孤立决策，需要保留交互、安全、稳定性与业务就绪作为横向约束。


**【最终应沉淀成一套稳定、可迁移的诊断方法】**


~~~text
LCP 发现异常
    ↓
排除导航类型、版本、设备与采集口径造成的误判
    ↓
按每次访问拆成 TTFB / Load Delay / Load Duration / Render Delay
    ↓
只进入异常成本对应的技术层
    ↓
原始 Timing / Trace / 业务事件支持候选解释
    ↓
同条件实验确认因果
    ↓
上线后比较 Field LCP 与业务关键内容指标
    ↓
更新性能预算与回归测试
~~~

这也解释了为什么 LCP 四阶段的技术分类有助于避免术语堆积：图片压缩属于资源体积治理；Preload 与首屏图片的正确加载优先级属于资源发现和调度；SSR / CSR 属于关键内容生成位置的架构选择；任务拆分和代码延迟执行属于 JS 关键路径治理；浏览器 Style / Layout / Paint 优化属于最终呈现成本治理。**同一技术可能影响多个阶段，但每一次应用都必须明确对应的具体等待成本、证据与代价。**


### 【LCP 与正式通用文档的知识衔接】


#### <u>1. 与现有知识正文的关系</u>


本章仅作为 Loading / LCP 专项讨论记录，**不直接进入正式知识索引，也不新建 QA 记录**。现有正式主入口保持不变：

- [Web 性能优化完整知识体系](./W-Web性能优化完整知识体系.md)：Web 性能整体用户体验、从文档交付到连续渲染的技术主线。
- [性能测量与真实用户监控专项](./X-性能测量与真实用户监控专项.md)：性能数据自动采集、结果指标、原始 Performance Entry、标准化和 RUM。
- [Web 渲染架构](./W-Web渲染架构.md)：CSR / SSR / SSG / Hybrid 的内容生成策略与取舍。
- [服务端渲染完整链路](./F-服务端渲染完整链路.md)：服务端生成与浏览器 Hydration 的具体过程。
- [HTTP 缓存机制](./H-HTTP缓存机制知识体系.md)：缓存与网络复用机制。
- [浏览器主线程、Event Loop 与任务调度](./B-浏览器主线程Event Loop与任务调度完整知识体系.md)：主线程阻塞与任务调度。
- [浏览器渲染原理](./J-基于Chrome浏览器渲染原理.md)：Style、Layout、Paint 和 Composite 过程。

本节整理完成后，正式并入知识体系时应优先检查可合并到上述既有主文档的部分，避免同一知识出现两个独立主入口。


## 4. Responsiveness 通过 INP 三阶段归因定位交互反馈延迟


### 【INP 的 Interaction、Event、Metric 与业务语义边界】

INP 不是所有事件处理耗时求和，也不是 API 请求完成时间。先明确 Interaction 的统计单位和选择规则，再进入三段具体成本。


#### <u>1. 交互响应需要从“用户操作到下一帧”建立完整诊断模型</u>



**【Responsiveness 衡量的是用户发起操作以后能否及时得到视觉反馈】**


用户点击按钮、触摸屏幕或按下键盘按键以后，如果下一次视觉反馈迟迟没有出现，就可能觉得页面卡住了、按钮没有点击成功，甚至重复执行操作。交互响应能力要回答的是：**页面能否及时处理输入，并让浏览器有机会呈现下一帧？**

INP 衡量用户一次页面访问中点击、触摸和按键交互的延迟，记录单次访问中最长或接近最长的交互延迟，作为该次页面的一个结果值。不是点击耗时的平均数，也不是所有交互累计之和。对交互次数很多的访问，为降低少量异常峰值的影响，INP 每 50 次交互可忽略一个最高延迟样本。线上对大量页面访问的 INP 再取第 75 百分位（移动端与桌面端分组），评估真实用户整体交互体验：≤200ms 良好，200～500ms 需要改进，>500ms 较差。[[16]](https://web.dev/articles/inp)

INP 与 FID（First Input Delay，首次输入延迟）的区别：FID 只测首次交互的输入等待；INP 观察整个页面生命周期内的交互，并包含等待、处理和下一帧呈现三个阶段，因此更能反映用户长期使用页面时是否会遇到慢交互。[[16]](https://web.dev/articles/inp)

INP 不统计所有交互方式：当前定义涵盖鼠标点击、触摸点击及键盘按键，但不直接以滚轮连续滚动、纯 Hover 或缩放作为 INP 样本。页面可能因这些操作卡顿，需要另外结合 Smoothness、Frame/LoAF 或具体业务埋点。没有发生符合条件的交互时，这次访问可能根本没有 INP 值；不能把“没有测得 INP”当成 0ms。[[16]](https://web.dev/articles/inp)


**【主线一：用户输入经主线程和渲染流水线得到下一帧】**


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


**【主线二：用结果指标和原始证据追查问题】**


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


#### <u>2. INP 三个阶段代表三类不同等待成本</u>



**【先确定每段的开始与结束条件】**


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


**【一次点击可能产生多个 Event，INP 的单位是 Interaction】**


一个触摸点击通常可以对应 pointerdown、pointerup、click 等多个事件；按键可能对应 keydown、keyup 等事件。这些事件不是互不相关的独立“用户操作”：Event Timing 通过 interactionId 将属于同一个逻辑交互的相关事件联系起来。INP 所用的交互延迟涉及这组事件中最慢、决定响应完成时刻的过程，而不是只取一个 click 回调。[[16]](https://web.dev/articles/inp) [[17]](https://developer.mozilla.org/en-US/docs/Web/API/PerformanceEventTiming/interactionId)

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

如果这次交互所在的同一帧还处理了其他相关事件，单条 Entry 的处理时间和整个交互处理窗口也未必完全相同。这正是生产实现建议使用 Google 的 web-vitals Attribution、而不自行把某个事件的 processingEnd 减去 processingStart 当成整体 INP 的原因。[[4]](https://github.com/GoogleChrome/web-vitals)


**【Event、Interaction 与 INP Metric 是三个不同的统计层次】**


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

**interactionId 是浏览器的事件关联 ID，而不是 web-vitals 生成的 INP 指标 ID。** 同一次鼠标点击所产生且可观察到的 pointerdown、pointerup、click 等相关事件，通常具有相同的非零 interactionId；用户之后再次点击，即使仍是同一按钮，也属于另一次逻辑交互，应使用另一个 ID。键盘交互也可能产生 keydown、keyup 等相关事件。实际输入事件序列、可观察的 Entry 数量因输入方式和浏览器实现而异。[[17]](https://developer.mozilla.org/en-US/docs/Web/API/PerformanceEventTiming/interactionId)

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


**【同一个 Interaction 的多个事件时延不应相加】**


对于一组同 ID 的 Event Timing，每条 Entry 可能具有自己的 startTime、processingStart、processingEnd 和 duration，且相关事件可能共享下一次绘制时机。

当前 web-vitals 的交互候选管理过程是：

1. 处理一个新的 Event Timing Entry，忽略无法成为交互候选的无效 interactionId；
2. 如果该 ID 对应已经存在的交互候选，则更新该交互，而不是创建另一次用户操作；
3. 如果新 Entry 的 duration 更大，则把该交互的代表延迟更新为更慢的值；等长且起点一致的相关 Entry 可一起保留以供归因；
4. 按交互延迟排序，仅维护最慢的一小组候选。

例如同一交互 ID=101 已观测到 80ms 的事件，后来又收到同 ID 的 160ms Entry，那么这次交互的候选延迟可能更新为 160ms。不能把 80+160 作为一次交互的耗时。当前实现使用 InteractionManager 以交互 ID 关联事件及其候选延迟。[[18]](https://github.com/GoogleChrome/web-vitals/blob/main/src/lib/InteractionManager.ts)

**并非每个 DOM Event 都会产生可通过 PerformanceObserver 读取的 Entry。** Event Timing 的默认观察门槛约为 104ms，可配置的最低 durationThreshold 为 16ms；web-vitals 当前默认观察阈值为 40ms，并对很快的首次交互作必要的兜底，避免低于阈值的页面完全没有数值。这些阈值是采集成本与精度的折中，不意味着短交互不存在。[[19]](https://developer.mozilla.org/en-US/docs/Web/API/PerformanceEventTiming) [[20]](https://github.com/GoogleChrome/web-vitals/blob/main/src/onINP.ts)


**【页面 INP 从多次交互中挑选高位延迟，不计算所有事件的平均值】**


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

这意味着第 50 次交互到来后，即使新的交互并不慢，代表值仍可能从第 1 慢变成第 2 慢，**INP 候选可能降低**。实际实现保留有限的最慢候选列表，但仍通过浏览器维护的交互总数决定选择哪一个，不需要把用户所有点击事件完整存储。[[16]](https://web.dev/articles/inp) [[18]](https://github.com/GoogleChrome/web-vitals/blob/main/src/lib/InteractionManager.ts)

最后还存在第二层聚合：每次有效页面导航测量周期产生一个页面级 INP 样本，服务器收集大量页面访问后再按 Version、Route、Device 等计算 INP P75 / P95。把不同用户每次点击的 Event Duration 全部混在一起求 P75，得到的并不是官方 Core Web Vitals INP。若需要每一个按钮的完整延迟分布，必须另建交互级的事件采样统计。


#### <u>3. INP 与业务响应、加载期交互和持续流畅度存在重要边界</u>



**【INP 不是 API 请求完成时间，也不是业务任务成功时间】**


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

INP 测的是点击到下一帧可见反馈的等待，不包含所有随后异步结果。如果页面没有及时显示任何反馈，或者只让同步任务一直阻挡绘制，INP 就可能变差；但如果立即渲染了明确、真实的进行中状态，INP 可以很好，同时业务完成耗时仍需单独衡量。[[16]](https://web.dev/articles/inp)

建议分两类指标：

- 标准交互响应：INP、三阶段 Attribution、具体慢交互对象；
- 业务任务完成：用户提交 → 收到真实结果、首批搜索结果到达、AI 首个有效响应、最终任务成功等由业务定义的时延与正确性。

不能通过伪造“成功”来追求更低 INP；第一帧应该给出真实、清晰的进行中反馈，最终结果仍要正确验证。


**【加载期间的交互与 Hydration 会相互影响】**


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


**【SPA 路由、标签页生命周期与 INP 数据归属】**


在传统 SPA 中，客户端 Router 切换页面不会创建新的主 Document；没有特殊软导航测量能力时，页面访问级 INP 的生命周期不能简单按每一次路由 change 重新定义成标准 INP。监控可以把具体慢交互归属到其发生时的 Route / View，做业务路由级分析，但需要区分“文档访问级标准 INP”和“自定义单路由交互指标”。

Chrome 新的 Soft Navigation 支持及 web-vitals 对软导航的支持，会改变部分统计口径，应该按具体浏览器、库版本与能力标记，不应将硬导航与软导航样本直接混合。[[4]](https://github.com/GoogleChrome/web-vitals)

对于长驻页面，用户可能持续使用几十分钟甚至更久；不要只在 unload 时上报，页面隐藏/后台化时应及时结算当前测量值。若页面根本没有符合标准的交互，应保留“没有可报告 INP”的状态，而不是强制写入 0。


**【INP 与持续渲染 Smoothness 的边界】**


拖拽、滚动、地图动画等连续变化是否流畅，需要观察 Frame / LoAF / 队列等指标；一次点击是否快速给出下一帧反馈属于 INP。页面可能“FPS 稳定但点击卡”，也可能“点击响应快但连续轨迹掉帧”。两者相互关联，却不能互相替代。

这部分通用机制继续衔接 [页面流畅度与连续渲染性能完整知识体系](./Y-页面流畅度与连续渲染性能完整知识体系.md)，其 Frame / Queue / History 深度分析不在这篇交互响应稿重复。


### 【Input Delay、Processing Duration 与 Presentation Delay 对应不同成本】


| INP 阶段 | 首要问题 | 候选优化领域 |
| --- | --- | --- |
| Input Delay | 为什么事件还没开始处理？ | [④ JavaScript 与状态优化](./W-Web性能优化工程体系.md#5-javascript-与状态优化降低实际执行与对象管理成本)、[⑤ 任务调度与更新优化](./W-Web性能优化工程体系.md#6-任务调度与更新优化控制执行顺序更新频率和单次峰值) |
| Processing Duration | 相关事件回调为什么执行太久？ | [④ JavaScript 与状态优化](./W-Web性能优化工程体系.md#5-javascript-与状态优化降低实际执行与对象管理成本)、[⑤ 任务调度与更新优化](./W-Web性能优化工程体系.md#6-任务调度与更新优化控制执行顺序更新频率和单次峰值) |
| Presentation Delay | 处理完成后为什么迟迟看不到下一次反馈？ | [④ JavaScript 与状态优化](./W-Web性能优化工程体系.md#5-javascript-与状态优化降低实际执行与对象管理成本)、[⑤ 任务调度与更新优化](./W-Web性能优化工程体系.md#6-任务调度与更新优化控制执行顺序更新频率和单次峰值)、[⑥ 浏览器渲染优化](./W-Web性能优化工程体系.md#7-浏览器渲染优化减少样式布局绘制合成与图形资源成本) |


#### <u>1. Input Delay 诊断的是输入发生时主线程为什么不能及时处理</u>


> **阶段归因 → 六大优化领域**：[④ JavaScript 与状态优化](./W-Web性能优化工程体系.md#5-javascript-与状态优化降低实际执行与对象管理成本)、[⑤ 任务调度与更新优化](./W-Web性能优化工程体系.md#6-任务调度与更新优化控制执行顺序更新频率和单次峰值)。**证据与问题分类**：从 Input Delay 前的 Main Thread 任务、第三方脚本和微任务执行查找输入为何未及时获得处理机会。 **方案选择条件**：以下原文保留阶段定义、上位原因、API、具体优化、风险与验证；技术领域链接是待证实的候选方向，而不是指标异常的自动结论。



**【Input Delay 是处理开始前的等待，不是事件处理函数的成本】**


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

输入等待异常时，优先关注**输入时刻正在占据主线程的工作**，而不是立即修改点击 Handler。Google 明确将脚本加载与执行、网络响应回调、定时器和其他交互产生的任务列为需要诊断的候选来源。[[21]](https://web.dev/articles/optimize-input-delay)


**【Input Delay 异常的三个上位原因及工程方向】**


**【1. 页面初始化与非关键 JavaScript 占据主线程】**

- **现象**：页面内容已经显示，但用户在页面刚打开后点击菜单时没有立即响应。
- **机制**：浏览器还在执行大型 JS Bundle 的解析/编译/求值、框架初始化、Hydration 或非关键模块初始化。视觉上“已经加载”并不代表主线程空闲。
- **证据**：INP 对应交互的 loadState 位于加载期间；Trace 在输入时间之前出现大型脚本 Task；同类页面加载期与空闲期的 Input Delay 明显不同。
- **优化方向**：减少初始不必要 JS，延迟非关键初始化，按需分包或动态加载，优先完成页面主要交互所需的代码。
- **取舍**：延迟关键业务脚本可能损伤功能可用性；减少 Bundle 字节数不必然等于执行成本下降，必须对照 Main Thread 工作量验证。

**【2. 后台任务与第三方代码抢占主线程】**

- **现象**：即使用户正在使用页面，Analytics、定时器、WebSocket 消息处理、批量数据转换或第三方 SDK 仍持续占用主线程。
- **机制**：浏览器在任务执行中通常不会自动打断同步 JS，输入只能等待当前工作完成；微任务链若持续追加工作，也可能推迟下一次事件处理或绘制机会。
- **证据**：Trace 同时间窗口的 Task 和 Call Tree、JS 脚本来源、定时器与消息回调；Long Task 作为初步阻塞信号；LoAF 可提供更细脚本证据。
- **优化方向**：减少与当前用户交互无关的持续工作、控制工作频率、把大计算拆成可让出主线程的批次，适当调度到空闲时段或 Worker。
- **取舍**：主线程让出后可能改善 Input Delay，但频繁切任务会增加总开销；必须保证关键任务进度、用户状态与消息顺序的正确性。

**【3. 连续或重叠交互造成任务排队】**

- **现象**：快速点击、连续输入或多个组件高频事件使事件处理不断排队。
- **机制**：前一次操作可能安排较重的状态提交，后一次输入到达时主线程仍在执行；或者多个交互在同一渲染帧中竞争。
- **证据**：Event Timing 的时间线、interactionId、连续输入间隔与 Event Handler 处理时间。
- **优化方向**：减少每次输入需要同步完成的工作；搜索联想等业务按需求引入 Debounce / Throttle、取消过期请求；关键反馈优先、非关键计算适度推迟。
- **取舍**：防抖/节流会改变业务触发频率和时效，不能无差别用于提交、确认等必须响应的操作；防抖也不意味着自动改善本次输入到下一帧的时延。


**【Input Delay 阶段的判断】**


若 INP=720ms，其中 Input Delay=510ms、Processing=40ms、Presentation=170ms，则首先应到 **点击发生时刻之前** 的 Main Thread 时间轴查被占用的任务，不应从“click Handler 仅执行 40ms”推导出没有交互性能问题。

Long Task（长任务）有助于识别单个持续约 50ms 或以上的主线程任务，但没有 Long Task 也不能证明不存在输入竞争，例如多个较短任务或调度时机同样可能导致等待。[[22]](https://developer.chrome.com/docs/web-platform/long-animation-frames)


#### <u>2. Processing Duration 诊断的是事件处理本身的工作为什么过重</u>


> **阶段归因 → 六大优化领域**：[④ JavaScript 与状态优化](./W-Web性能优化工程体系.md#5-javascript-与状态优化降低实际执行与对象管理成本)、[⑤ 任务调度与更新优化](./W-Web性能优化工程体系.md#6-任务调度与更新优化控制执行顺序更新频率和单次峰值)。**证据与问题分类**：用 Event Timing 和调用栈确认事件回调、业务计算、框架渲染与同步监听器的实际执行量。 **方案选择条件**：以下原文保留阶段定义、上位原因、API、具体优化、风险与验证；技术领域链接是待证实的候选方向，而不是指标异常的自动结论。



**【处理时间不等于整个业务操作耗时】**


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

它既不直接包含尚未完成的异步 HTTP 请求等待，也不等于浏览器之后完成布局、绘制的时间；后者属于 Presentation Delay 或其他业务完成时延。Google INP 归因明确使用 Processing Duration 作为事件处理阶段。[[23]](https://web.dev/articles/optimize-inp)


**【Processing Duration 异常的四个上位原因及工程方向】**


**【1. 事件处理里同步计算过重】**

- **现象**：点击筛选按钮后，Handler 同步遍历十万条记录、排序、格式化或汇总。
- **证据**：DevTools Performance 中点击函数及其子调用占主要耗时；CPU Profiling、Bottom-up / Call Tree 指向明确的计算函数。
- **优化类型**：业务计算治理。减少不必要的遍历与重复计算、缓存真正稳定的计算结果、优化算法与数据结构；可独立处理且不依赖 DOM 的重计算考虑 Worker。
- **边界**：不要因为存在循环就推断其很慢；必须以实际数据规模、调用次数与 Trace 证明。Worker 还涉及序列化与传输成本。

**【2. 一次操作触发过宽的框架状态更新】**

- **现象**：只修改一个筛选项，却触发大量无关组件响应式更新、Watcher 或昂贵计算。
- **证据**：Vue / React Profiler 指出更新组件范围；JS Trace 显示组件计算和 Render Work；DevTools Rendering 显示 DOM 更新。
- **优化类型**：组件与状态依赖治理。缩小状态影响范围、稳定 Props、精简无关订阅、避免无意义全量重算、列表虚拟化。
- **边界**：框架更新可能一部分发生在事件处理期间，一部分发生在后续渲染阶段。因此应看实际时间分布，而非预设所有响应式成本都归为 Processing。

**【3. 强制同步布局混入事件处理】**

- **现象**：Handler 修改 DOM 样式，立即读取 getBoundingClientRect / offsetHeight，循环多次迫使浏览器同步计算布局。
- **证据**：Trace 中 Forced Reflow / Layout 紧挨着脚本执行；LoAF scripts 中可能出现 forcedStyleAndLayoutDuration。
- **优化类型**：DOM 读写组织。先批量读取，再计算和写入；减少不必要的同步尺寸测量和布局依赖。
- **边界**：Style / Layout 并非天然只属于 Presentation Delay；如果被同步 JS 强制触发，也会体现在处理路径里。

**【4. 多层事件回调或同步依赖链过长】**

- **现象**：一次点击通过多个监听器、表单验证、同步存储、插件回调和多重状态派发持续占用当前处理窗口。
- **证据**：Event Timing 对应同一 Interaction 的多个 Event / Listener；Call Tree、火焰图与框架 Profiler。
- **优化类型**：事件链路治理。合并重复工作、移除无效监听器、把不影响第一帧反馈的后续操作推迟。
- **边界**：并不是越短越好。有些操作需要保持原子性或严格顺序，拆分任务不能破坏事务一致性和用户期望的即时状态。


**【Promise 和 async/await 不能自动解决主线程阻塞】**


await 真正未完成的异步任务时，JS 执行可以让出当前调用栈；但是以下两种情况仍可能阻塞绘制：

- 在 await 之前先做大量同步计算；
- 用持续的 Promise 微任务链立即执行大量后续计算，让浏览器迟迟没有机会绘制。

因此不能机械地把同步函数加上 async，或把工作移入 Promise.then，就宣称解决 INP。真正有价值的是减少当前必须完成的工作、适度让出主线程和保持视觉反馈及时。[[24]](https://web.dev/articles/optimize-long-tasks)


#### <u>3. Presentation Delay 诊断的是事件处理后为什么迟迟不出现下一帧</u>


> **阶段归因 → 六大优化领域**：[④ JavaScript 与状态优化](./W-Web性能优化工程体系.md#5-javascript-与状态优化降低实际执行与对象管理成本)、[⑤ 任务调度与更新优化](./W-Web性能优化工程体系.md#6-任务调度与更新优化控制执行顺序更新频率和单次峰值)、[⑥ 浏览器渲染优化](./W-Web性能优化工程体系.md#7-浏览器渲染优化减少样式布局绘制合成与图形资源成本)。**证据与问题分类**：检查处理之后的 JS、框架提交与浏览器 Layout/Paint/Composite，不能把事件回调结束视为已视觉呈现。 **方案选择条件**：以下原文保留阶段定义、上位原因、API、具体优化、风险与验证；技术领域链接是待证实的候选方向，而不是指标异常的自动结论。



**【事件回调结束，并不代表画面已经更新】**


Presentation Delay 从相关事件处理完成，到浏览器下一帧可以呈现为止。它可能包括仍需执行的微任务、requestAnimationFrame 回调、ResizeObserver 相关工作、框架更新、Style / Layout、Paint / Composite / Raster 等；并不只是 Paint 函数的单次耗时。官方 web-vitals Attribution 也将部分主线程外的呈现成本纳入 Presentation Delay。[[4]](https://github.com/GoogleChrome/web-vitals)

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


**【Presentation Delay 异常的四个上位原因及工程方向】**


**【1. 状态变化触发了过大的 DOM 或组件渲染范围】**

- **现象**：点击一个开关导致整页大型列表重绘；仅展开一个面板，却要处理数千个节点。
- **证据**：Framework Profiler 指向不必要的更新组件；DevTools Rendering 显示 DOM 数量、Layout / Paint 花费。
- **优化类型**：受影响工作集合治理。收窄组件更新范围、稳定状态依赖、虚拟化列表、拆分非首要更新。
- **边界**：Vue/React 的状态更新不保证立即产生绘制；组件渲染结束、DOM Mutation 完成和用户看到画面是不同时间点。

**【2. 布局与绘制本身的计算量过大】**

- **现象**：一次交互导致整页重排、复杂样式重计算或大面积 Paint。
- **证据**：Chrome Performance 的 Recalculate Style / Layout / Paint；DOM 规模；受影响元素范围、Paint 和 Layer 轨道。
- **优化类型**：浏览器渲染路径治理。缩小布局影响范围、控制 DOM 规模、减少不必要的复杂视觉效果和同步几何测量，按实际情况考虑 CSS containment 或内容可见性。
- **边界**：不能把所有 Layout / Paint 都归因于 DOM 太大；先确认热点是元素数量、样式依赖、几何关系还是绘制工作。[[23]](https://web.dev/articles/optimize-inp)

**【3. 提交工作之前还有其他同步任务和微任务】**

- **现象**：事件处理逻辑结束后，仍有 Promise 回调、Watcher、rAF、观察器或第三方脚本占据下一帧前的执行机会。
- **证据**：Performance Trace 的任务顺序、微任务、rAF 回调、LoAF script attribution。
- **优化类型**：绘制机会治理。让第一帧只完成必要、可感知的更新，把复杂后续工作放到不会阻塞首次反馈的时机；使用合理的 Scheduler / Task Yield 机制。
- **边界**：setTimeout 或 scheduler.yield 可以创造让步机会，但具体何时绘制取决于浏览器调度；把重要状态操作粗暴延迟可能让用户看到不一致状态。

**【4. 合成、栅格化与复杂动画成本】**

- **现象**：一次交互涉及 Canvas、大面积过滤效果、多层图层或复杂渲染区域，即使 JS Handler 较短仍迟迟不显示。
- **证据**：Performance Trace 的 Render / GPU / Compositor 相关记录；LoAF 的 renderStart、styleAndLayoutStart 与 Script Attribution。
- **优化类型**：渲染工作治理。减少一次更新影响的像素和元素，针对真实热点控制 Canvas 重绘量、避免昂贵的样式效果、验证合成策略。
- **边界**：LoAF 的存在表示长动画帧，并不直接说明一定是 Paint/Compositor 导致，必须继续区分脚本、样式布局和帧末等待。


**【呈现阶段的关键反例】**


~~~text
INP = 850ms
Input Delay = 80ms
Processing Duration = 70ms
Presentation Delay = 700ms
~~~

这一组数据无法用“click handler 很慢”解释。应该优先查处理结束到下一帧之间的任务和渲染更新，确认是组件树扩散、布局、绘制，还是 rAF/微任务阻塞。只有针对这一段减少成本才可能直接改善本次交互的延迟。


### 【Event Timing、Long Task、LoAF 和 web-vitals Attribution 形成归因证据】


#### <u>1. Long Task、LoAF、Event Timing 和 Trace 分别承担不同层次的证据</u>



**【Event Timing 帮助测量“哪个用户交互慢了”】**


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

但是这只是**单个事件级的近似拆分**。duration 时间精度存在量化、一个交互可能涉及多条 Event Entry，最终 INP 也并不等于某一条事件的简单相减。生产环境应该优先使用规范实现。Event Timing 观察器默认只提供 duration 达到约 104ms 的事件，可以设置 durationThreshold，最小为 16ms；浏览器支持情况和 first-input 等兜底也需要处理。[[19]](https://developer.mozilla.org/en-US/docs/Web/API/PerformanceEventTiming) [[16]](https://web.dev/articles/inp)

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


**【原生 Event Timing API 的三个阶段如何计算】**


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

第一，一次 Interaction 可能包含多个 Entry，事件级公式无法直接决定整个交互的处理窗口。第二，当前 web-vitals 的 attribution 实现除了按 interactionId 确定候选，还可能按接近的呈现时刻把同一帧的 Event Timing 汇总起来，取该帧的最早处理起点和最晚处理终点来计算阶段。第三，浏览器 duration 有时间精度量化，可能出现不合理的边界，库还会作非负钳制和异常处理。因此一次交互的正式 Attribution 与单条 click Entry 直接相减不一定完全相同。[[25]](https://github.com/GoogleChrome/web-vitals/blob/main/src/attribution/onINP.ts)

**生产监控建议**：Event Timing 原生 Entry 用来解释事件归组与定位执行过程；正式 INP 及其 Input Delay、Processing Duration、Presentation Delay 优先使用 web-vitals/attribution，避免自己重复实现交互候选和帧级归因规则。


**【Long Task 只描述“单段主线程工作长”，不能直接解释是哪段 INP】**


Long Task API 检测到约 50ms 或以上的主线程长任务，可提供 startTime、duration 与有限 attribution。可以帮助判断 Input Delay 是否被已有任务阻塞，也可能与处理或呈现阶段重叠。

~~~text
用户输入恰好落在 Long Task 执行期间
→ Input Delay 有被阻塞的候选证据

点击 Handler 本身存在很长的同步 Task
→ Processing Duration 可能较高

事件处理结束后存在其他长任务
→ 下一帧呈现可能继续推迟
~~~

但“同一 View 存在 Long Task”不等于它就是这次 INP 的原因，必须核对时间是否重叠，以及具体 Task 是否处在交互关键路径上。[[22]](https://developer.chrome.com/docs/web-platform/long-animation-frames)


**【LoAF 观察的是整个慢帧，更利于区分脚本和渲染】**


Long Animation Frames API 对超过 50ms 的长帧产生 long-animation-frame Entry，可能提供：

- duration / blockingDuration：长帧总耗时、阻塞贡献；
- renderStart / styleAndLayoutStart：渲染、样式和布局的时间边界；
- scripts：脚本来源、执行时刻、关联函数、强制样式布局时间等。

LoAF 不等于 Long Task：一帧可能被多个短任务和渲染工作共同拖慢，没有任何单个 50ms Long Task 仍然可能产生长帧。LoAF 也不等于 INP；一个慢帧可以出现在无人交互的动画中，INP 关注与特定用户交互关联的下一帧响应。[[22]](https://developer.chrome.com/docs/web-platform/long-animation-frames)

浏览器支持不足、Entry 没有捕捉到或没有关联到 LoAF，并不意味着 INP 健康；还需要结合 Event Timing 与 DevTools Performance Trace 判断。


**【Performance Trace 和框架 Profiler 用于确认具体工作】**


- **Chrome Performance**：将 Interaction、Main Thread、JS、Microtask、Style、Layout、Paint 和帧绘制放在同一时间线上，解释具体阶段为何慢。
- **Bottom-up / Call Tree**：找到在相关时间窗口内消耗时间最多的函数，注意 Total Time 与 Self Time 的区别。
- **Vue / React Profiler**：检查某次状态变化具体更新了哪些组件、耗费了什么框架工作。
- **业务 Trace / User Timing**：补充自动浏览器指标无法解释的具体业务步骤，例如前端搜索计算、业务渲染启动等。

阶段归因从 Event Timing 定位交互开始，再用 LoAF / Trace 找函数、组件或渲染工作；后者不能代替前者直接给出标准 INP 值。


#### <u>2. INP 的采集与 Attribution 应复用官方指标实现</u>



**【web-vitals/attribution 提供单次慢交互的三阶段结果】**


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

部分字段可能不存在或随依赖版本变化；不能假设所有浏览器的 LoAF、sourceFunctionName 都可用。可选的 processedEventEntries 默认可能不会填充，以避免存储过多相关事件记录。[[4]](https://github.com/GoogleChrome/web-vitals)

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


**【reportAllChanges 只决定什么时候报告，不决定如何计算 INP】**


web-vitals 的 onINP 在注册后持续通过浏览器 Event Timing 观察用户交互，将 Event Entry 按 interactionId 关联、更新最慢候选，并根据当前交互总数估计页面 INP。**reportAllChanges 为 false，不意味着只有页面隐藏才开始计算。** false 和 true 的内部计算逻辑相同，区别是是否在候选值变化时立即执行用户的 callback。[[20]](https://github.com/GoogleChrome/web-vitals/blob/main/src/onINP.ts)

| 行为 | reportAllChanges=false（默认） | reportAllChanges=true |
| --- | --- | --- |
| 持续监听 Event Timing | 是 | 是 |
| 维护每个交互与当前 INP 候选 | 是 | 是 |
| 第一次形成有效候选便报告 | 通常不 | 是 |
| 候选变化便尝试报告 | 不立即报告 | 是 |
| 页面变为 hidden | 强制尝试报告最新值 | 强制尝试报告最新值 |
| 支持的 Soft Navigation 边界 | 可强制结算上一导航 | 可强制结算上一导航 |
| 每次点击都回调 | 否 | 否 |
| 候选排名及三阶段归因算法 | 相同 | 相同 |

其内部逻辑可抽象为：

~~~text
接收新的 Event Timing 记录
         ↓
处理已有 interactionId，维护最慢交互列表
         ↓
依据当前交互总数计算代表性交互
         ↓
INP 候选值是否发生变化？
    ├─ 否 → 不必产生候选更新报告
    └─ 是 → 更新 metric.value 和 metric.entries
                ↓
             reportAllChanges=true？
             ├─ 是 → 尝试立即调用 callback
             └─ 否 → 保留新值但不立即通知
                              ↓
                       页面变为 hidden
                              ↓
                 处理缓冲记录并强制尝试报告
~~~

真实源码中，onINP 的更新逻辑和 bindReporter 报告逻辑是分开的：前者每次处理 Entry 后更新 Metric，后者在强制报告或 reportAllChanges 开启时，根据新旧值决定是否真正调用 callback；相同值可被去重，metric.delta 表示相较上次报告值的变化量。[[20]](https://github.com/GoogleChrome/web-vitals/blob/main/src/onINP.ts) [[26]](https://github.com/GoogleChrome/web-vitals/blob/main/src/lib/bindReporter.ts)


**【false 并不严格保证一个页面访问只上报一次】**


例如交互较少的一次页面访问：

| 时刻 | 发生的交互或生命周期事件 | 页面当前 INP 候选 | 默认 false 是否通知 |
| --- | --- | ---: | --- |
| 1s | 点击 A：80ms | 80ms | 不立即回调 |
| 3s | 点击 B：160ms | 160ms | 不立即回调 |
| 5s | 点击 C：100ms | 160ms | 不立即回调 |
| 7s | 点击 D：320ms | 320ms | 不立即回调 |
| 9s | 用户切换到其他标签页，页面 hidden | 320ms | 报告当前值 |
| 12s | 用户重新返回页面 | 320ms | 不立即回调 |
| 15s | 点击 E：450ms | 450ms | 不立即回调 |
| 20s | 页面再次 hidden | 450ms | 更新报告 |

页面第一次 hidden 并不意味着这次浏览生命周期永远终止。浏览器可能恢复执行，因此需要持续观察。如果下一次 hidden 时指标与上次报告相同，则 bindReporter 通常会抑制重复回调。另一方面，支持的软导航边界或从 bfcache 恢复可能建立新的指标测量周期，不能一概当成同一个页面 INP 实例。[[20]](https://github.com/GoogleChrome/web-vitals/blob/main/src/onINP.ts)


**【导致 INP 候选值变化的三个核心场景】**


**第一类：出现比当前候选更慢的交互。**

~~~text
交互 A：100ms → INP 候选 100ms
交互 B：80ms  → 仍为 100ms
交互 C：300ms → 更新为 300ms
交互 D：150ms → 仍为 300ms
~~~

在交互数不足 50 的情况下，这种情况最直观。reportAllChanges=true 也不会为交互 B、D 的每一次点击都报告一次，因为当前指标没有变化。

**第二类：同一 interactionId 的后续 Event Entry 更慢。**

~~~text
Interaction #101
  pointerdown：80ms
      ↓ 已经建立候选
  click：160ms
      ↓ 同一个 Interaction 的代表延迟更新
Interaction #101：160ms
~~~

这是同一次用户操作的事件记录逐步到达并完善候选，不代表又发生一次点击；web-vitals 的处理过程中允许已有 interactionId 的候选更新。[[18]](https://github.com/GoogleChrome/web-vitals/blob/main/src/lib/InteractionManager.ts)

**第三类：交互总数改变导致所选排名变化。**

~~~text
交互累计 49 次
→ 选第 1 慢交互

交互累计到 50 次
→ 选第 2 慢交互

因此即使没有更慢点击，
INP 候选也可能下降。
~~~

类似地，达到 100 次交互时可以改选第 3 慢。这意味着 INP 不必随着页面使用时间单调升高；reportAllChanges=true 下的 metric.delta 也**可能为负数**。这是指标算法本身的允许现象，并不自动说明性能突然改善。[[18]](https://github.com/GoogleChrome/web-vitals/blob/main/src/lib/InteractionManager.ts)


**【metric.id 与 interactionId 的关系决定如何理解多次回调】**


~~~text
当前 Navigation 的 INP Metric
    ├─ metric.id → 标识本次指标实例
    ├─ metric.value → 本次最新 INP 结果
    ├─ metric.delta → 相对上次 callback 报告值的变化
    └─ metric.entries → 当前选中慢交互关联的 Event Timing
          └─ entry.interactionId → 标识那次用户交互
~~~

一次页面生命周期内，Metric 对象及 metric.id 可以保持不变，当前最慢交互却可能从 interactionId=101 更新为 interactionId=108。**不能用交互 ID 当作当前页面 INP 指标的主键**；反过来，Metric ID 也不能拿来判断两个 Event 是否属于同一次操作。

下面示例可在开发环境观察这种关系：

~~~ts
import { onINP } from 'web-vitals/attribution';

onINP((metric) => {
  const a = metric.attribution;

  console.log({
    metricId: metric.id,
    inp: metric.value,
    delta: metric.delta,
    relatedEvents: metric.entries.map((entry) => ({
      name: entry.name,
      interactionId: entry.interactionId,
      duration: entry.duration,
      startTime: entry.startTime
    })),
    inputDelay: a.inputDelay,
    processingDuration: a.processingDuration,
    presentationDelay: a.presentationDelay
  });
}, {
  reportAllChanges: true
});
~~~

**开启 true 是观察 INP 候选变化，不是记录页面每一个交互。** 如果需要按钮级交互分布，需要独立、受控、可脱敏的事件采样。线上正式评价使用默认 false 通常足够，但后台仍需正确处理同一次访问的更新报告。


**【为什么不建议手写完整 INP 计算】**


手写从 Event Timing 到 INP 需要处理：

1. 一次交互含多个 Event Entry，需正确分组和选择候选；
2. 事件条目的 duration 存在精度量化和 durationThreshold 限制；
3. 极高交互次数的异常值规则；
4. 页面失去可见性、长时间停留和页面退出时如何结算；
5. 从 bfcache 恢复后按照新的页面访问处理；
6. 跨源 iframe 交互可能计入用户体验，但父文档 JS 无法直接读取其内部 Event Entry；
7. 浏览器和库版本差异，字段可能缺失。

官方 web.dev 明确建议利用 web-vitals 规避大多数这些边界；对于 iframe 的可观测限制仍需单独说明。[[16]](https://web.dev/articles/inp)


#### <u>3. 线上 RUM 的 Context 必须将 INP 关联到具体交互和执行证据</u>



**【仅有 INP 数值无法定位哪一个按钮或状态有问题】**


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


**【一次页面可能多次上报 INP，必须以指标实例更新而不是累加】**


对于 Browser RUM 服务端，最容易出现的数据问题是把同一页面访问的多个 INP 回调都当作独立用户样本。例如：

~~~text
同一次页面访问
metric.id = A

第一次 hidden：
metric.value = 320ms

返回页面继续使用

第二次 hidden：
metric.value = 450ms
~~~

这仍然是同一 Metric A 的更新；正确做法是按 Navigation / Metric 实例去重或覆盖，只让一个有效的页面级 INP 值进入最终线上分布，而不是把 320ms 和 450ms 都当作两次访问参与 P75。若使用 reportAllChanges=true，这种更新可能更加频繁。

| 标识 | 用于识别什么 | 禁止的用法 |
| --- | --- | --- |
| interactionId | 同一次用户操作的相关 Event Entry | 不能当作一次页面访问的 INP 样本主键 |
| metric.id | 当前 INP 指标实例的报告身份 | 不表示所有事件都拥有同一交互 ID |
| metric.entries | 被选中的慢交互 Event Timing 记录 | 不能当作全部用户交互历史 |
| metric.value | 当前 INP 结果值 | 不应该把多次报告求和 |
| metric.delta | 与上一次报告值的差值 | 可能为负，不能无条件当成性能收益 |
| View / Navigation / Session | 页面与用户会话归属 | 不能简单以 Session ID 聚合所有软导航成一次访问 |

实际数据链应为：**Metric 在同一测量周期内更新 → SDK 携带 Metric ID、Navigation / View 和上报时间 → 后端更新同一指标实例 → 形成每次访问一个有效 INP → 计算版本/设备/路由分群 P75**。软导航、bfcache 等触发的新测量周期要按实际库的规范重新确定边界，不能混合计算。

另外，metric.entries 往往只保留当前慢交互有关的 Event Entry，且记录可能受观察门槛与浏览器支持限制；不能误认为它们就是页面里所有 click 事件的完整列表。


### 【INP 决策树与交互正确性的优化验证】


#### <u>1. 诊断决策树从三段耗时导向最有证据的优化类别</u>



**【交互异常先锁定哪个操作，再判断慢在哪个阶段】**


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


**【同一个现象下的完整排查案例】**


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


#### <u>2. INP 优化需要同时保证用户反馈、业务正确性与执行成本</u>



**【先显示反馈，后处理非紧急工作，不等于掩盖业务时延】**


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

为了让第一帧真的出现，需要避免在修改状态后立刻继续执行同样漫长的同步任务或微任务链；仅调用 requestAnimationFrame、Promise.resolve 或给函数加 async 关键字，并不会自动保证浏览器已经完成 Paint。[[24]](https://web.dev/articles/optimize-long-tasks)


**【优化方案要同时评估副作用】**


- 任务拆分会引入让步与调度开销、并发状态变化；需要保持必要的计算顺序和数据一致性。
- Worker 可以转移独立计算，但不能直接更新 DOM，还需支付消息传递和数据复制/转移成本。
- 输入防抖可能降低重复请求，却可能使用户更晚看见最终结果；不能替代即时的真实视觉反馈。
- 虚拟列表改善渲染规模，但需要处理滚动定位、动态高度、键盘可访问性等边界。
- 代码延迟加载可能减少启动抢占，但若首次点击时才加载必要模块，可能使首次交互体验变差。
- 不必要的动画和占位更新可能改善某一次 INP，却造成 CLS、视觉闪烁或操作状态不可信。
- 监控 SDK 自身的事件监听、采样、序列化与上报也会使用主线程，不能增加显著的交互阻塞。


#### <u>3. 交互响应优化最终形成可复现且可迁移的验收闭环</u>



**【Lab 用于确认因果，Field 用于评价实际用户改善】**


**Lab 验证**先固定路由、版本、设备等级、CPU、数据规模、操作目标及加载/空闲阶段；用 Chrome Performance Trace 与 Web Vitals 判断三个阶段的变化。特别应模拟页面加载过程中点击的情况，因为此时可能存在大量初始化脚本，只有加载完成后再测试会漏掉真实问题。[[16]](https://web.dev/articles/inp)

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


**【与 Loading 的统一结构】**


| 体验维度 | 核心结果指标 | 诊断主线 | 典型上位问题 |
| --- | --- | --- | --- |
| Loading（加载体验） | LCP | TTFB → Load Delay → Load Duration → Render Delay | 文档交付、资源发现、资源获取、元素呈现 |
| Responsiveness（交互响应） | INP | Input Delay → Processing Duration → Presentation Delay | 主线程竞争、事件处理、下一帧呈现 |

**最终结论**：INP 高并不必然说明点击事件本身慢。先定位慢在哪一次交互、哪一个阶段，再把 Input Delay 对应到主线程调度、Processing Duration 对应到处理链与同步工作、Presentation Delay 对应到帧呈现与渲染工作。只有同时拿到时间关联、原始执行证据和实验结果，才能从“交互卡顿”推导到可行动的优化原因。


### 【INP 与加载体验、持续流畅度的知识边界】


#### <u>1. 本章与现有知识正文的关系</u>


本篇已将交互响应诊断正式整合至第 4 章；以下通用文档分别承担全景架构、监控采集、主线程执行和持续流畅度的机制深入：

- [Web 性能优化完整知识体系](./W-Web性能优化完整知识体系.md)：用户体验分层、浏览器执行与优化总框架。
- [性能测量与真实用户监控专项](./X-性能测量与真实用户监控专项.md)：Web Vitals、PerformanceObserver、Event Timing、LoAF 和 RUM 数据采集专项。
- [浏览器主线程、Event Loop 与任务调度完整知识体系](./B-浏览器主线程Event Loop与任务调度完整知识体系.md)：Task、Microtask、Rendering Opportunity、Scheduler 等机制。
- [页面流畅度与连续渲染性能完整知识体系](./Y-页面流畅度与连续渲染性能完整知识体系.md)：持续视觉更新的 Frame、Queue、LoAF 与长期运行成本。
- [Loading / LCP 四阶段诊断章节](#3-loading-通过-lcp-四阶段归因定位关键内容出现延迟)：本篇第 3 章的加载体验完整分析。

INP 三阶段的归因机制、指标语义、原始 API 与完整示例在本章保留；跨领域优化技术统一通过《Web 性能优化工程体系》深入，不建立另一套平行的技术定义。


## 5. Visual Stability 通过 CLS 计分与布局根因定位页面跳动


### 【Layout Shift、Session Window 和近期输入规则组成 CLS 计算机制】

CLS 不是耗时指标，不应生造 LCP 式的固定四阶段。保留 Impact Fraction、Distance Fraction、最大会话窗口、500ms 近期输入排除的公式与算例。


#### <u>1. 视觉稳定性应从用户看到的“位置突变”理解</u>



**【Visual Stability 与 Loading、Responsiveness 的关注对象不同】**


页面打开以后，用户可能很快就看到主要内容，点击反馈也比较及时，但仍然遇到一种明显的体验问题：原本已经显示的标题、正文、图片和按钮突然改变位置，使阅读位置丢失，甚至使用户点击了错误目标。

例如文章在第一帧就显示了正文，但 1 秒后顶部 Banner 加载完成，正文突然被向下推开；又例如用户正准备点击“取消”，顶部插入通知导致“取消”和“确认”的位置变化。这不是单纯的加载等待，也不是点击处理延迟，而是**已经可见的页面布局不稳定**。[[27]](https://web.dev/articles/cls)

| 用户体验 | 核心问题 | 结果指标 |
| --- | --- | --- |
| Loading | 用户何时看到主要内容？ | LCP |
| Responsiveness | 用户操作后何时获得下一帧响应？ | INP |
| Visual Stability | 已显示的内容是否发生用户未预期的位置变化？ | CLS |
| Smoothness | 动画、滚动和连续视觉更新是否稳定？ | 依业务定义 Frame/LoAF 等 |

CLS 专门衡量**非预期布局位移**，并不是所有视觉效果的稳定性统统由 CLS 覆盖。某些 transform 动画可能不会贡献 CLS，却仍可能令用户感觉突兀；这时要同时考虑视觉设计和连续渲染流畅度。


**【CLS 是无单位的结果得分，不是布局处理耗时】**


Google Core Web Vitals 的 CLS 评价区间：

- ≤0.1：良好；
- >0.1 且 ≤0.25：需要改进；
- >0.25：较差。

统计时以真实页面访问作为样本，通常观察移动端、桌面端分别计算的 P75。CLS 没有毫秒单位，值 0.15 不能读作“用了 0.15 秒完成布局”。[[27]](https://web.dev/articles/cls)

浏览器记录的布局偏移可以发生在整个页面生命周期中，加载结束后、滚动过程中、客户端路由切换后或长期运行时都可能出现。仅凭初始页面的 Lighthouse 测试，不能证明整个访问期间没有 CLS。


**【两条主线共同形成完整诊断】**


~~~text
浏览器布局主线：
初始 HTML / SSR / CSR 生成并展示可见内容
  ↓ 资源逐步到达、业务数据返回、组件更新
页面的内容/宽高/样式可能变化
  ↓ 浏览器重新计算并绘制布局
已有可见元素的位置可能改变
  ↓
Layout Shift Entry（原始位移证据）
  ↓
Session Window（按连续时间聚组）
  ↓
CLS（最严重的一组位移得分）

问题定位主线：
线上 CLS P75 回归
  ↓ 确认版本、路由、设备、视口和导航类型
找到最大 Session Window 及发生阶段
  ↓
查看该窗口内各 LayoutShift Entry
  ↓
从 sources 判断哪些元素移动、移动多少
  ↓
查找真正改变上游布局的资源/DOM/样式操作
  ↓
按问题类别优化并通过实验验证
  ↓
线上 RUM 同分群验收
~~~

与 LCP 的四个耗时阶段、INP 的三个耗时阶段不同，**CLS 没有四段或三段固定时间成本**。它是多条布局位移得分经过会话窗口规则汇总而成的结果。


#### <u>2. 单次 Layout Shift 以影响面积和移动距离共同计分</u>



**【渲染帧、视口与 Session Window 是三个不同的概念】**


CLS 的完整计算需要区分三种完全不同的尺度。它们的前后关系是：**浏览器在渲染帧之间发现位移，借助视口衡量单次位移，再按照 Session Window 汇总多次位移。**

| 概念 | 解决的问题 | 具体含义 | 常见误解 |
| --- | --- | --- | --- |
| Rendering Frame（渲染帧） | 是否真的移动？ | 对比相邻渲染帧中已有可见元素的布局位置 | 每帧都必须产生 Shift |
| Viewport（视口） | 这次移动的影响程度有多大？ | 作为 Impact Fraction 和 Distance Fraction 的空间基准 | 视口就是 Session Window |
| LayoutShift Entry（位移记录） | 某次位置变化的总影响是多少？ | 浏览器将该次位移中的多个不稳定元素共同计算为一个 value | 每个元素分别生成一个得分，再自行求和 |
| Session Window（会话窗口） | 哪些连续位移算成一组？ | 按 1 秒间隔、最长 5 秒将连续有效 Shift 分组并累加 | 每一秒采样一次最大值 |

图示：

~~~text
浏览器上一帧的可见布局
          ↓ 与下一渲染帧比较
浏览器发现多个已有元素改变起始位置
          ↓
视口内的受影响面积 × 最大位移比例
          ↓
一个 LayoutShift Entry（可能包含多个受影响元素）
          ↓ 持续有新 Shift 记录
每个有效 Shift 按时间进入 Session Window
          ↓
窗口内每条 Entry.value 相加
          ↓
从多个 Session Window 中选最高得分
          ↓
页面当前 CLS
~~~

例如一个广告容器突然变高，将标题、正文和按钮一起向下推。在这次布局更新里，三个元素可能共同贡献到**一个** Layout Shift Score，不能把“文章标题移动 0.05、正文移动 0.08、按钮移动 0.04”简单当成三个独立 Shift 再相加。只有浏览器真正提供了不同的 Shift Entry，才按会话窗口规则累加每条 Entry.value。[[27]](https://web.dev/articles/cls)

因此用户所说的“每秒最大偏移量”不属于 CLS 的算法；真正的计算周期由**实际发生的布局变化**触发，而不是每秒定时扫描全页面。


**【Layout Shift 的成立条件是已有可见元素的布局位置改变】**


根据 Layout Instability API，某个元素在相邻两个渲染帧中，若它在视口内可见部分的起始位置发生变化，就可能成为 Unstable Element（不稳定元素），浏览器为该帧产生 Layout Shift 记录。[[27]](https://web.dev/articles/cls) [[28]](https://developer.mozilla.org/en-US/docs/Web/API/LayoutShift)

需要区分以下四种情况：

1. **原有元素移动**：页面正文原本从 y=200px 开始，后来变为 y=330px，属于候选布局偏移。
2. **新元素首次插入**：新 Banner 从无到有，不一定因为“它自己出现”就产生偏移；但是它把下方已有正文推开时，原有正文产生位移。
3. **元素尺寸变化但起始位置不变**：某个容器自己变高，不代表它自己改变了起始位置；如果下方元素跟着移动，下方元素可能成为 sources。
4. **纯 transform 视觉移动**：使用 translate 等方式移动显示位置通常不触发布局偏移计分，因为它不改变布局位置；但它依然可能不符合用户体验期待。

这一组边界决定了后续诊断最重要的认知：**Layout Shift Sources 很可能只是“被推动的元素”，而不是导致它移动的根因元素。**


**【单次得分由 Impact Fraction 和 Distance Fraction 相乘】**


~~~text
Layout Shift Score
= Impact Fraction × Distance Fraction
~~~

**Impact Fraction（影响面积占比）**：该帧发生位置变化的可见元素，在变化前后所覆盖的视口区域的**并集**占视口总面积的比例。只观察可见区域，不把屏幕外元素面积简单计入。

**Distance Fraction（移动距离占比）**：该帧所有不稳定元素在水平或垂直方向上的最大位移，除以视口宽、高中较大的一个尺寸。它不是移动时间，也不是固定以视口高度为分母。

例如：一个元素原先占视口高度一半，随后向下移动视口高度的四分之一；假设视口最大维度正好是高度，则：

~~~text
移动前面积占比：50%
移动后两帧区域并集：75%
Impact Fraction = 0.75

最大移动距离 = 视口最大维度的 25%
Distance Fraction = 0.25

单次 Shift Score = 0.75 × 0.25 = 0.1875
~~~

一个元素只移动了少量像素，不代表最终分数一定很低；还要结合它影响的可见面积。反过来，用户主观感觉的“跳动很厉害”也不能直接折算成某个毫秒值。[[27]](https://web.dev/articles/cls)


**【CLS 与 Layout / Paint 耗时不是同类数据】**


Style、Layout、Paint 的耗时属于渲染执行成本，影响 LCP、INP 或连续渲染；CLS 关注的是**布局的位置结果**。页面可能执行了昂贵的 Layout 但没有改变可见元素起始位置，因此不一定产生高 CLS；也可能在一段很短的 DOM 更新中把一大块正文推开，产生高 CLS。

因此 Long Task、LoAF、Style/Layout Trace 是补充根因的证据，不直接参与 CLS 的数学公式。


#### <u>3. Session Window 决定哪些 Shift 相加以及页面最终 CLS</u>



**【先过滤近期输入，再按连续时间聚合】**


当前 CLS 使用 Session Window（会话窗口）：相邻有效偏移的间隔小于 **1 秒**，且当前窗口第一条到新偏移的跨度小于 **5 秒**，才归入同一窗口；否则开启下一个窗口。每个窗口将内部 Shift.value 累加，整次访问取**窗口分数最大值**。[[27]](https://web.dev/articles/cls) [[29]](https://github.com/GoogleChrome/web-vitals/blob/main/src/lib/LayoutShiftManager.ts)

~~~text
过滤 hadRecentInput = true 的 Shift
  ↓
按照 startTime 排序处理有效 Shift
  ↓
是否与上一条相隔 <1000ms 且与窗口首条相隔 <5000ms？
  ├─ 是：加入当前窗口，累加 value
  └─ 否：新建窗口，从该 Shift 的 value 开始
  ↓
CLS = max(所有窗口的累计 value)
~~~

不能仅依据相邻两次偏移小于 1 秒就无限累加；5 秒上限是另外一条同时生效的限制。不能把整个页面生命周期内所有 Shift 直接求和作为 CLS；那是已经被调整过的旧指标口径。


**【一秒是相邻偏移的分组间隔，不是固定采样周期】**


假设浏览器在 0.20s、0.70s、1.30s 连续检测到三个有效 Layout Shift，这三个时刻可以进入同一窗口，因为相邻间隔分别是 0.50s 和 0.60s，且总时长不到 5 秒。假设下一个有效 Shift 在 4.00s，距离上一条已经超过 1 秒，则开始新的窗口。整个过程中并不存在“在 0～1 秒、1～2 秒分别求一次最大分数”的操作。[[27]](https://web.dev/articles/cls)

对于同一窗口，**既不是每秒保留最大的一条，也不是只计每次偏移中移动最远的那个元素**。移动最远的元素用于定义单条位移的 Distance Fraction，但一条 Shift 的影响区域还包括该帧其他不稳定元素的可见范围；窗口得分则需要累计**每一次有效 Shift Entry 的 value**。

窗口可以从任意时间点的 Shift 开始，不要求起点是 0s、1s、2s 的整数秒。1 秒和 5 秒是为了**判断是否续接当前窗口**的两个上限，不能被误当成测量 FPS、每秒位移峰值或页面截图周期。


**【完整数字示例：选择最大窗口而不是全部求和】**


假设以下都属于没有近期输入的有效 Shift：

| 时刻 | 单次得分 | 窗口 |
| --- | ---: | --- |
| 0.5s | 0.04 | A |
| 1.1s | 0.03 | A |
| 1.7s | 0.05 | A |
| 8.0s | 0.08 | B |
| 8.4s | 0.11 | B |
| 15.0s | 0.06 | C |

窗口 A 得分：0.04+0.03+0.05=0.12。

窗口 B 得分：0.08+0.11=0.19。

窗口 C 得分：0.06。

**最终 CLS = max(0.12, 0.19, 0.06)=0.19**，不是全部窗口的 0.37，也不是最大单次 Shift 的 0.11。


**【最大窗口不表示其他时间没有发生问题】**


CLS 选最大累计窗口，是为了表征最严重的一组连续布局变化，对长驻 SPA 和无限滚动更合理。另一窗口的位移即使没有计入最终结果，也可能影响用户体验；需要业务专用的诊断明细时可以补充统计 Shift 分布，但不能把自定义总分冒充标准 CLS。

与 INP 候选可能因交互总数规则降低不同，**同一个普通 CLS 测量周期内，页面 CLS 是已经观察到的最大窗口分数，通常只会保持不变或上升**。某个新窗口较小不会把历史最大值覆盖掉。


#### <u>4. hadRecentInput 是非预期布局偏移的计分排除规则</u>



**【离散用户输入后 500ms 内的 Shift 通常被排除】**


用户主动点击“展开更多”并立即看到内容展开，一般能预期下面的内容发生变化。浏览器 LayoutShift Entry 通过 hadRecentInput 判断近期是否发生符合条件的离散输入；当其为 true 时，标准 CLS 计算跳过这条 Shift。官方规则使用大约 500ms 的近期输入窗口；点击、触摸和按键通常符合，滚动、拖拽和缩放等连续输入不自动获得同样的排除。[[27]](https://web.dev/articles/cls) [[30]](https://developer.mozilla.org/en-US/docs/Web/API/LayoutShift/hadRecentInput)

例如：

~~~text
用户点击“展开详情”
  ↓
100ms 内内容开始展开
  ↓
hadRecentInput=true
  ↓
这一条 Shift 通常不计入 CLS
~~~


**【异步网络请求之后才插入内容，仍然可能产生 CLS】**


~~~text
用户点击“加载更多”
  ↓
前端发起请求，等待 900ms
  ↓
数据返回并在当前阅读区域前插入内容
  ↓
原内容突然向下移动
  ↓
超过 500ms → Shift 可能参与 CLS
~~~

这说明 CLS 优化需要提前**建立空间预期**：点击后可以立即预留合适的列表区域、展示尺寸稳定的 Skeleton，或将新内容插入不会推动现有阅读位置的区域。若业务更适合让用户主动接受新内容，可以提示“有新内容”而不是直接把当前列表推开。[[31]](https://web.dev/articles/optimize-cls)


**【指标豁免不等于用户必然能预期】**


hadRecentInput 只是一条启发式时间规则：某次 Shift 恰好在点击后 500ms 内发生，并不证明这个偏移就是点击引起，也不证明用户觉得合理。不能故意依赖豁免制造布局跳动。同样，某个用户主动等待的结果超过 500ms 才出现，也可能进入 CLS。因此优化目标始终是稳定体验，而非只想办法避开计分。

另外，鼠标 hover、连续滚动时异步内容造成的偏移不能简单按“用户有操作”排除。


### 【CLS 根因按照空间缺失、异步变化、字体激活与动画语义分类】


| 布局位移根因 | 应查证的几何变化 | 候选优化领域 |
| --- | --- | --- |
| 未预留媒体、广告和 iframe 尺寸 | 资源加载前后占位 | [③ 资源加载优化](./W-Web性能优化工程体系.md#4-资源加载优化改变资源体积发现顺序和必要下载范围)、[⑥ 浏览器渲染优化](./W-Web性能优化工程体系.md#7-浏览器渲染优化减少样式布局绘制合成与图形资源成本) |
| 异步 Banner/Skeleton/实时消息 | 动态 DOM 与滚动锚定 | [④ JavaScript 与状态优化](./W-Web性能优化工程体系.md#5-javascript-与状态优化降低实际执行与对象管理成本)、[⑤ 任务调度与更新优化](./W-Web性能优化工程体系.md#6-任务调度与更新优化控制执行顺序更新频率和单次峰值)、[⑥ 浏览器渲染优化](./W-Web性能优化工程体系.md#7-浏览器渲染优化减少样式布局绘制合成与图形资源成本) |
| 字体、CSS、Hydration 不一致 | 文本换行和首次布局 | [③ 资源加载优化](./W-Web性能优化工程体系.md#4-资源加载优化改变资源体积发现顺序和必要下载范围)、[④ JavaScript 与状态优化](./W-Web性能优化工程体系.md#5-javascript-与状态优化降低实际执行与对象管理成本)、[⑥ 浏览器渲染优化](./W-Web性能优化工程体系.md#7-浏览器渲染优化减少样式布局绘制合成与图形资源成本) |
| 属性动画和布局变更 | 真实布局位置与视觉变换 | [⑥ 浏览器渲染优化](./W-Web性能优化工程体系.md#7-浏览器渲染优化减少样式布局绘制合成与图形资源成本) |

被移动元素不必然是触发者；必须从 Layout Shift Sources 继续追溯 DOM 和状态更新。


#### <u>1. CLS 常见根因应先按空间约束与内容变化分类</u>


> **阶段归因 → 六大优化领域**：[③ 资源加载优化](./W-Web性能优化工程体系.md#4-资源加载优化改变资源体积发现顺序和必要下载范围)、[④ JavaScript 与状态优化](./W-Web性能优化工程体系.md#5-javascript-与状态优化降低实际执行与对象管理成本)、[⑥ 浏览器渲染优化](./W-Web性能优化工程体系.md#7-浏览器渲染优化减少样式布局绘制合成与图形资源成本)。**证据与问题分类**：按初始尺寸、资源/字体、异步插入、Hydration 和几何动画分类，再回溯是谁触发布局变化。 **方案选择条件**：以下原文保留阶段定义、上位原因、API、具体优化、风险与验证；技术领域链接是待证实的候选方向，而不是指标异常的自动结论。



**【完整原因分类与技术治理关系】**


~~~text
非预期 Layout Shift
│
├─ A. 初始空间不明确
│   ├─ 图片和视频没有明确比例
│   └─ iframe / 广告 / 嵌入内容没有稳定容器
│      → 媒体几何占位治理
│
├─ B. 动态内容改变文档流
│   ├─ 顶部通知 / 广告 / 推荐模块突然出现
│   ├─ Skeleton 与真实内容几何尺寸不一致
│   └─ 列表插入 / 删除 / 排序 / 实时消息
│      → 动态内容空间预留与更新位置治理
│
├─ C. 字体与文本几何发生变化
│   ├─ Fallback Font 切换为 Web Font
│   └─ 异步文本、换行、行高变化
│      → 字体度量与文本布局一致性治理
│
└─ D. 客户端样式与布局规则改变
    ├─ 宽高 / margin / position / 动态 CSS 修改
    ├─ Hydration / ClientOnly / 响应式状态差异
    └─ 布局属性动画
       → 更新范围、布局约束与动画机制治理
~~~

这个框架按**为什么原本的内容位置会被改变**划分，而不是把图片压缩、Code Splitting、SSR、font-display、transform 等技术词语无序堆叠。每个原因必须继续解释现象、机制、证据、修复以及副作用。


#### <u>2. 媒体资源与嵌入内容需要在加载之前确定布局空间</u>


> **阶段归因 → 六大优化领域**：[③ 资源加载优化](./W-Web性能优化工程体系.md#4-资源加载优化改变资源体积发现顺序和必要下载范围)、[⑥ 浏览器渲染优化](./W-Web性能优化工程体系.md#7-浏览器渲染优化减少样式布局绘制合成与图形资源成本)。**证据与问题分类**：先确认加载前媒体与嵌入区域是否已经有稳定的宽高、比例或占位。 **方案选择条件**：以下原文保留阶段定义、上位原因、API、具体优化、风险与验证；技术领域链接是待证实的候选方向，而不是指标异常的自动结论。



**【图片缺少宽高，加载完成后才确定高度】**


典型过程：

~~~text
HTML 中存在图片，但浏览器缺少稳定的尺寸信息
  ↓
图片尚未下载，正文先显示在图片下方附近
  ↓
图片加载后确定真实宽高和占位
  ↓
下面已显示的正文整体向下移动
  ↓
LayoutShift Entry 产生
~~~

这首先是**布局空间预留不足**，不是“图片文件太大”。较大的图片可能让 Shift 发生得更晚，但压缩图片不保证彻底消除偏移；如果下载完成仍需突然新增高度，CLS 依然可能较差。

**诊断证据**：Shift Sources 可能主要是图片下面的标题/正文；图片资源完成加载或布局解码与 Shift 时刻接近；查看 img 是否有 width、height 或稳定的 CSS aspect-ratio。

**优化方向**：按真实素材比例设置 width 和 height，或给媒体容器声明 aspect-ratio。在响应式布局中，图片实际宽度可以随容器缩放，浏览器仍可提前算出所需高度。[[31]](https://web.dev/articles/optimize-cls)

~~~html
<img
  src="/hero.webp"
  width="1200"
  height="675"
  alt="页面主视觉"
/>
~~~

~~~css
.hero-image {
  width: 100%;
  height: auto;
  display: block;
}
.media-slot {
  aspect-ratio: 16 / 9;
}
~~~

width=1200、height=675 代表 16:9 的原始几何比例，不强制页面最终显示 1200px 宽。使用 picture/srcset 提供不同移动端裁切时，应保证每个候选实际比例与所声明的尺寸契合；比例写错仍可能引入资源到达后的尺寸修正。

**与 LCP 的边界**：图片压缩、Preload、Fetch Priority 主要改变资源获取和最终显示时机；width/height、aspect-ratio 主要解决几何占位。优化目标不同，但在首屏大图上常需要协同使用。


**【广告、iframe 和第三方 Widget 没有确定高度】**


第三方广告或外部嵌入在页面初始渲染时可能尚不知道最终大小。广告返回以后若把一个高度为 0 的容器扩展为 250px，下面已显示的内容就会被推开。嵌入式视频、地图和社交内容具有同样的机制。

**证据**：受影响元素都在第三方容器下方；Shift 与 iframe 插入、广告响应或容器尺寸变化对应。

**优化方向**：对第三方 Slot 建立合理的空间契约，例如固定尺寸、已知断点下的不同比例、min-height 或允许的尺寸档位；限制加载后反复扩张。未知尺寸时按实际业务权衡预留空间的范围，并处理广告最终未返回时如何回收空白。

**工程取舍**：过大预留空间可能影响内容密度和商业展示，第三方 iframe 内部的位移也未必能被父文档 SDK 完整观察。宿主通常需要优先保证宿主容器的几何稳定，再辅以第三方侧的排查。[[31]](https://web.dev/articles/optimize-cls)


#### <u>3. 动态内容的插入和替换应保证用户当前阅读位置不突然变化</u>


> **阶段归因 → 六大优化领域**：[④ JavaScript 与状态优化](./W-Web性能优化工程体系.md#5-javascript-与状态优化降低实际执行与对象管理成本)、[⑤ 任务调度与更新优化](./W-Web性能优化工程体系.md#6-任务调度与更新优化控制执行顺序更新频率和单次峰值)、[⑥ 浏览器渲染优化](./W-Web性能优化工程体系.md#7-浏览器渲染优化减少样式布局绘制合成与图形资源成本)。**证据与问题分类**：确认异步状态、Banner/Skeleton 和列表变化怎样推动已有元素与用户阅读位置。 **方案选择条件**：以下原文保留阶段定义、上位原因、API、具体优化、风险与验证；技术领域链接是待证实的候选方向，而不是指标异常的自动结论。



**【顶部 Banner、公告、推荐内容晚插入】**


~~~text
页面导航和正文已完成首屏显示
  ↓
活动配置或公告 API 返回
  ↓
在文章标题前插入一个 100px Banner
  ↓
标题、正文和按钮被整体下推
  ↓
CLS 增大
~~~

这里受影响的是文章标题和正文，**导致位移的是上方新插入的 Banner**。因此正确问题不是“如何优化 article-title 的 CSS 动画”，而是“为什么在没有预留空间的情况下修改了文章上方的文档流”。

**优化方向**：可预测的 Banner 预留位置；把不确定内容安排到不会推动重要正文的位置；非关键通知可以采用不会重排正文的覆盖展示方式，但应避免遮挡、误操作和可访问性问题。

**诊断证据**：Shift Source 的 previousRect/currentRect 同方向下移；在相近时刻出现 Banner 的 DOM Mutation、组件 Mounted 或上游配置接口返回。


**【Skeleton 与真实内容高度不一致】**


骨架屏不是天然的 CLS 优化。若骨架高度 120px，实际数据卡片高度 340px，最终替换时仍会把后续区域推开 220px。

**优化方向**：让骨架与真实内容的主要几何结构、图片比例、文本行数和响应式断点一致；无法准确预知时，可采用适当 min-height、尺寸区间、局部滚动容器、分块稳定更新或骨架内容渐进填充。

**边界**：min-height 只是最小高度，不是保证不会扩张；长文本、多语言和窄屏仍可能超出。不能通过粗暴隐藏业务内容来追求零 CLS。


**【列表追加、刷新、排序或实时消息改变既有项位置】**


例如无限滚动中，用户阅读第 20 条内容，前面突然插入 3 条未读消息；或者实时数据到达后重新排序排行榜。原有列表项下移，即使数据是正确的，也会打断阅读。

**优化方向**：稳定可视列表项的几何位置；动态插入采用确定时机、视口锚点策略或新内容提示；对可滚动区域进行合理隔离、列表行高约束和增量更新。

**边界**：浏览器 Scroll Anchoring 有助于减轻部分滚动位移，但不能作为整个列表没有布局变动的证明。实时页面还需将“新数据何时进来”和“什么时候改变当前用户的阅读位置”区分决策。


#### <u>4. 字体、响应式样式与 Hydration 是文本及组件位置变化的另一条主线</u>


> **阶段归因 → 六大优化领域**：[③ 资源加载优化](./W-Web性能优化工程体系.md#4-资源加载优化改变资源体积发现顺序和必要下载范围)、[④ JavaScript 与状态优化](./W-Web性能优化工程体系.md#5-javascript-与状态优化降低实际执行与对象管理成本)、[⑥ 浏览器渲染优化](./W-Web性能优化工程体系.md#7-浏览器渲染优化减少样式布局绘制合成与图形资源成本)。**证据与问题分类**：核对字体回退指标、客户端接管结构和响应式样式在首次渲染前后的几何差异。 **方案选择条件**：以下原文保留阶段定义、上位原因、API、具体优化、风险与验证；技术领域链接是待证实的候选方向，而不是指标异常的自动结论。



**【Web Font 替换导致文字宽度与换行变化】**


~~~text
网页先使用 Fallback Font 显示文章标题
  ↓
Web Font 网络加载完成
  ↓
浏览器替换字体
  ↓
文字宽度、上升下降度量或行高发生变化
  ↓
标题可能由一行变两行
  ↓
下方正文或按钮整体移动
~~~

这种问题本质是**首次显示和最终显示的文字几何尺寸不一致**。字体资源加载慢可能增加晚切换概率，但单纯提高字体下载速度不一定完全消除差异。

**证据**：Shift 发生在字体资源就绪或字体替换时；布局矩形显示文本高度变化；CSS font-family / font-display / line-height 和字体度量存在差异。

**优化方向**：使用与 Web Font 度量更接近的 Fallback Font；可按需采用 size-adjust、ascent-override、descent-override、line-gap-override 缩小差异；评估 font-display: optional 或在合理情况下提前获取关键字体。[[31]](https://web.dev/articles/optimize-cls)

**取舍**：font-display: swap 有利于及时显示文字，却可能在换字体时重新排版；font-display: optional 可减少某些切换导致的 Shift，但会改变用户看到目标字体的机会。预加载字体也可能和首屏 LCP 资源竞争带宽。因此应同时验证 FCP/LCP、CLS 和品牌字体要求。


**【文本内容与样式在首帧以后发生重大变化】**


SSR HTML 先输出一种文本、样式或组件结构，Hydration 后客户端恢复真实业务状态时替换成不同内容，可能使页面发生位移。CSR 的异步数据到达、i18n 长短文本切换、响应式断点逻辑晚生效，也具有类似机制。

**证据**：Shift 与客户端数据回填、DOM 替换、动态 Class、生效的 CSS 或字体/语言切换时间相邻。需要检查旧/新内容的宽高与布局约束，而不是只用“Hydration 慢”概括。

**优化方向**：保证服务端和客户端首屏关键布局的几何一致；对 ClientOnly 或必须客户端计算的区域预留可预测空间；异步长文本避免突然推开用户正在阅读的内容。

**边界**：SSR 不自动保证低 CLS；服务端完整输出了内容也可能因为媒体尺寸、字体或水合后的更新而跳动。CSR 若一次性在首次绘制之前准备好稳定布局，也可能具有较低 CLS，但可能牺牲 LCP。


#### <u>5. CSS 和动画问题应根据是否改变布局位置来处理</u>


> **阶段归因 → 六大优化领域**：[⑥ 浏览器渲染优化](./W-Web性能优化工程体系.md#7-浏览器渲染优化减少样式布局绘制合成与图形资源成本)。**证据与问题分类**：区分真实布局位置变更和仅改变视觉变换的动画，同时独立检验 CLS 与帧稳定性。 **方案选择条件**：以下原文保留阶段定义、上位原因、API、具体优化、风险与验证；技术领域链接是待证实的候选方向，而不是指标异常的自动结论。



**【直接更改布局相关属性可能推动其他已显示内容】**


如果应用代码在非预期时修改 width、height、padding、margin、top、left、Grid/Flex 布局参数或动态增删类名，可能触发原有可见元素位置变化。

例如页面滚动后延迟改变导航栏高度，下面的主要内容突然下移。又例如侧边栏折叠时，整个主体区域被突然重新计算宽度。

**证据**：Chrome Performance Trace 中的 Layout Shift 与 CSS 更新、组件更新、Layout 对应；对比发生变化前后的 Computed Style 和 DOM 布局矩形。

**优化方向**：先确认布局本身是否有必要改变；对于需要改变宽高或内容高度的区域，保持预期的用户触发时机与空间契约；对纯视觉位移动画可考虑使用 transform 而不是持续修改布局位置。[[27]](https://web.dev/articles/cls)


**【使用 transform 避免 CLS，不代表动画一定平稳】**


CSS transform: translate()、scale() 等通常不会触发 Layout Shift 计分，因为它们不改变文档布局位置，但不意味着移动越剧烈用户越舒服，也不能证明高 FPS 或避免误触。视觉体验还需要考虑动画时长、遮挡、运动敏感性和 prefers-reduced-motion。

动画属性的选择也影响 Smoothness：布局属性动画可能重复触发 Style/Layout；transform/opacity 在符合条件时更容易让浏览器采用合成路径。但**是否产生 CLS**与**执行一帧用了多久**是两个不同问题。[[31]](https://web.dev/articles/optimize-cls)


### 【Layout Shift Sources、Performance API 与 RUM 形成完整归因证据】


#### <u>1. Layout Shift Sources 提供受影响元素，Root Cause 需要继续回溯</u>



**【为什么不能见到 article-body 移动就修 article-body】**


例如初始结构：

~~~html
<header>导航栏</header>
<div id="banner-slot"></div>
<h1>文章标题</h1>
<p>正文...</p>
<button>阅读下一篇</button>
~~~

页面最初绘制时 banner-slot 高度为 0，后来广告数据返回并给它设置 120px 高度。标题、正文、按钮整体向下移动。

此时 LayoutShift.sources 可能记录：

~~~text
h1.previousRect.top = 120
h1.currentRect.top  = 240

p.previousRect.top  = 200
p.currentRect.top   = 320
~~~

被观测的 h1 和 p **是受害者**。真正改变布局的是上游 banner-slot 的高度。优化的核心是让广告有稳定空间，而不是给正文补一个抵消位移的 transform。Chrome DevTools 的布局偏移洞察也提醒：工具给出的 culprit 可能只是推测，必须核对实际时序。[[31]](https://web.dev/articles/optimize-cls) [[32]](https://developer.chrome.com/docs/performance/insights/cls-culprit)


**【API 的来源信息可以直接确定什么，不能直接确定什么】**


浏览器 Layout Instability API、web-vitals 标准版、web-vitals Attribution 版分别提供不同深度的信息：

| 数据层级 | 数据对象 / API | 直接可知 | 无法直接保证 |
| --- | --- | --- | --- |
| 页面级结果 | onCLS 的 metric.value | 当前最大会话窗口累计分数 | 整个页面发生过哪些 DOM 改动 |
| 最大窗口 | metric.entries | 构成当前最大窗口的 LayoutShift Entries | 页面生命周期中所有窗口的 Shift 历史 |
| 单次布局偏移 | LayoutShift.value、startTime、hadRecentInput | 一次 Shift 的时间、得分及是否参与 CLS | 唯一 Root Cause 是哪个组件 |
| 受影响元素 | LayoutShift.sources | 受影响 DOM、移动前后位置（在支持范围内） | 所有移动元素的完整列表 |
| 最大单次偏移摘要 | attribution.largestShiftEntry / largestShiftSource / largestShiftTarget | 最大窗口中最有代表性的单次偏移和其受影响元素线索 | 该 Source 就是引发位移的元素 |
| 组件/代码根因 | DevTools Performance + DOM/CSS/Network + Framework Profiler + 实验 | 可形成并验证代码级根因 | 一次 onCLS 回调自动提供完整原因 |

**LayoutShift.sources 最多提供 5 个受影响元素。** 若一次布局偏移影响超过 5 个可见元素，浏览器通常仅返回影响最大的 5 个，不能仅凭 sources 缺少某个节点就断言该节点没有移动。[[33]](https://developer.mozilla.org/en-US/docs/Web/API/LayoutShift/sources)

这里还有一个容易误会的顺序差异：

- 原生 LayoutShift.sources 通常按受影响程度排序，sources[0] 可用于查看该条 Shift 最有影响的受影响元素；但它仍不是自动定位的根因。[[34]](https://developer.mozilla.org/en-US/docs/Web/API/LayoutShiftAttribution)
- 当前 web-vitals 的 largestShiftSource 默认选择**最大 Shift 的 sources 中按文档顺序最靠前的元素**，而 largestShiftTarget 是为这个元素生成的选择器；它们不保证是“影响最大的 source”，也不保证它们属于修改布局的组件。若使用 generateTarget，自定义目标生成方式还会影响返回的字符串。[[35]](https://github.com/GoogleChrome/web-vitals/blob/main/src/types/cls.ts)

因此，对于一次大的 CLS，正确分析顺序应该是：先从 metric.entries 找最大窗口，必要时检查窗口中的**多条** LayoutShift，再从每条 Entry 的 sources 看移动区域与方向。largestShiftTarget 适合作为问题入口和报告分组标签，不能作为已确认根因。


**【从 Shift 到 Root Cause 建立五步证据链】**


1. **定位时间**：最大 Session Window 何时发生？在加载期、阅读期、滚动懒加载还是路由切换期间？
2. **确认发生位置**：哪些 sources 在前后帧改变了 top/left？影响区域与位移方向是什么？
3. **追踪上游结构**：同方向移动的大批元素是否有共同祖先、前一个兄弟节点或新增内容？
4. **关联触发事件**：资源加载完成、字体切换、API 返回、组件挂载、CSS 变化是否和 Shift 同时发生？
5. **验证假设**：临时预留容器高度、限制组件插入、替换字体或冻结数据更新后，Shift 是否消失？

因果证据强度应分层：sources 证明**谁移动**；DOM / Trace / Network 说明**可能是谁导致**；受控实验才进一步证明**改变该因素会让位移改善**。不能把某段 Layout CPU 执行时间直接当成 CLS 根因。


**【定位具体组件需要补充业务区域标识和代码执行证据】**


即便通过 sources[].node 拿到 DOM 节点，也只能确定这个节点发生过移动，**不能自动知道哪个 Vue 组件、哪条状态更新或哪次接口响应使它移动**。浏览器 Layout Shift API 不会提供“责任组件路径”和“触发代码行号”。

如果需要在监控平台中实现组件级诊断，可由业务组件在关键容器上加稳定的区域标识：

~~~html
<section data-perf-region="dashboard-summary">
  <!-- 仪表盘汇总区域 -->
</section>
~~~

在支持来源节点的浏览器中，从受影响元素向上寻找最近的受控区域：

~~~js
// 仅用于前端运行时记录受影响区域，不是自动根因识别。
function getAffectedRegion(node) {
  if (!(node instanceof Element)) return 'unknown';

  return node
    .closest('[data-perf-region]')
    ?.getAttribute('data-perf-region') ?? 'unknown';
}

// 从 entry.sources 获得 source.node 后，可调用：
// getAffectedRegion(source.node)
~~~

这里的返回值只能命名为 **Affected Region（受影响区域）**，不能命名为 Root Cause Component。

后续应按时间戳关联其他证据：

~~~text
LayoutShift Source → 被移动的 DOM 和受影响区域
        ↓
previousRect / currentRect → 位移方向、距离与共同模式
        ↓
检查父级/前序兄弟容器 → 谁新占用了文档流空间？
        ↓
Network / Resource / 字体可用时刻 → 是否刚有内容到达？
        ↓
Vue / React Profiler / DOM Mutation / CSS 变化
        ↓
锁定哪一次组件更新或样式应用改变布局约束
        ↓
禁用或调整候选逻辑，复现实验验证
~~~

例如 shift sources 指向 article-body、article-heading，不等于这两个组件出错；真正让它们整体下移的原因可能是 Banner 的高度、字体替换或同一个父容器插入内容。对线上样本做脱敏、限制数据量，不得直接上报 DOM 节点、用户文本、敏感业务属性或完整调用栈。


#### <u>2. 原生 Performance API 与 web-vitals 负责不同层次的采集计算</u>



**【Layout Instability API 提供原始 Entry】**


浏览器通过 PerformanceObserver 监听 layout-shift 类型返回 LayoutShift Entry。重要字段：

| 字段 | 含义 |
| --- | --- |
| startTime | 该次 Shift 的时间 |
| value | 单次 Shift Score，不带单位 |
| hadRecentInput | 是否具备近期离散输入 |
| lastInputTime | 最近一次符合豁免条件的输入时刻 |
| sources | 发生位移的元素归因信息 |
| sources[].node | 受影响节点，可能不可用 |
| sources[].previousRect | 之前一帧的矩形位置 |
| sources[].currentRect | 当前帧的矩形位置 |
| duration | 对 Layout Shift 恒为 0，不代表布局执行成本 |

原始监听示例：

~~~js
const observer = new PerformanceObserver((list) => {
  for (const entry of list.getEntries()) {
    console.log({
      time: entry.startTime,
      score: entry.value,
      excludedByInput: entry.hadRecentInput,
      sources: entry.sources?.map((s) => ({
        // DOM 节点仅供本地调试，不上传原始 node。
        node: s.node,
        before: s.previousRect,
        after: s.currentRect,
      })),
    });
  }
});

observer.observe({
  type: 'layout-shift',
  buffered: true,
});
~~~

这段代码只证明浏览器可以提供原始位移证据，不等于已经计算完整 CLS。LayoutShift API 在部分浏览器中并非全面支持，buffered 的可回溯数据也受浏览器缓冲区限制，生产 SDK 必须做兼容检测与采集缺失标记。[[28]](https://developer.mozilla.org/en-US/docs/Web/API/LayoutShift) [[34]](https://developer.mozilla.org/en-US/docs/Web/API/LayoutShiftAttribution)


**【Session Window 的概念计算】**


~~~js
// 教学用核心算法：未覆盖 BFCache、Soft Navigation 和后台页面等边界。
let entries = [];
let windowScore = 0;
let cls = 0;

new PerformanceObserver((list) => {
  for (const entry of list.getEntries()) {
    if (entry.hadRecentInput) continue;

    const first = entries[0];
    const last = entries[entries.length - 1];

    const sameSession =
      first &&
      last &&
      entry.startTime - last.startTime < 1000 &&
      entry.startTime - first.startTime < 5000;

    if (sameSession) {
      entries.push(entry);
      windowScore += entry.value;
    } else {
      entries = [entry];
      windowScore = entry.value;
    }

    cls = Math.max(cls, windowScore);
    console.log('当前最大窗口 CLS:', cls);
  }
}).observe({type: 'layout-shift', buffered: true});
~~~

该代码对应官方 LayoutShiftManager 的核心窗口逻辑，但没有完整处理初始后台加载、BFCache 恢复、指标实例、跨源 iframe 和软导航等生产边界，**不应作为可直接替换 web-vitals 的完整指标实现**。[[29]](https://github.com/GoogleChrome/web-vitals/blob/main/src/lib/LayoutShiftManager.ts)


**【推荐用 web-vitals/attribution 获取正式结果和最大 Shift 信息】**


~~~ts
import { onCLS } from 'web-vitals/attribution';

onCLS((metric) => {
  const a = metric.attribution;

  console.log({
    cls: metric.value,
    id: metric.id,
    delta: metric.delta,

    // 构成当前最大 Session Window 的 Entries
    entries: metric.entries,

    // 最大窗口中贡献最大的一条 Shift
    largestShiftTime: a.largestShiftTime,
    largestShiftValue: a.largestShiftValue,
    largestShiftTarget: a.largestShiftTarget,
    largestShiftEntry: a.largestShiftEntry,
    largestShiftSource: a.largestShiftSource,
    loadState: a.loadState,
  });
});
~~~

需要理解三层数据的区别：

~~~text
metric.value
→ 页面访问当前最大 Session Window 的累计得分

metric.entries
→ 当前构成最大 Session Window 的有效 LayoutShift Entries

metric.attribution.largestShiftEntry
→ 最大窗口中得分最高的一条 Shift
→ largestShiftTarget / largestShiftSource 提供受影响元素线索
~~~

当一个窗口中是很多中等 Shift 累加造成大 CLS 时，**最大单条 Shift 的 Source 不能代表所有问题**；需要继续看 metric.entries 内其他 Entry。largestShiftTarget 也不保证就是 Root Cause。归因字段与行为可在 GoogleChrome/web-vitals 的类型定义及源码中查证。[[35]](https://github.com/GoogleChrome/web-vitals/blob/main/src/types/cls.ts) [[36]](https://github.com/GoogleChrome/web-vitals/blob/main/src/attribution/onCLS.ts)


#### <u>3. 页面生命周期和 RUM 聚合必须保留 CLS 的测量边界</u>



**【reportAllChanges 不改变计算，只改变报告时机】**


与 INP 类似，web-vitals 的 onCLS 默认持续监控 Layout Shift、维护当前最大窗口；reportAllChanges 为 false 时主要在页面 hidden 等报告节点回调。开启 true 可以在当前 CLS 值发生变化时更及时报告，适合本地诊断。无论是否开启，该页面内部的 Session Window 计算规则相同。[[37]](https://github.com/GoogleChrome/web-vitals/blob/main/src/onCLS.ts)

CLS 当前值在一个普通导航测量周期内通常不下降，因为它保留所有已看到窗口得分中的历史最大值。页面第一次 hidden 可能报告 0.12；用户恢复后新发生一个得分 0.19 的窗口，第二次 hidden 可以再次报告 0.19。**这不是两次独立页面访问**；后端应按 metric.id 与 Navigation / View 边界去重或更新，而不是把两条消息都当作两个用户贡献 P75。


**【初始加载、长期运行和 SPA 路由具有不同风险】**


- 初始加载 CLS：多由图片/字体尚未稳定、首屏样式或广告插入造成。
- Post-load CLS：真实用户滚动、阅读、使用页面时，异步内容、广告轮换或新数据插入造成；仅跑一次初始 Lighthouse 可能漏掉。
- 长驻 SPA：一个 Document 可持续多个客户端路由和交互周期，不应擅自把每次 Router change 都视为新的标准 Document CLS。
- 支持软导航的浏览器与 web-vitals 新口径，可以建立相应新测量周期；不支持时，自定义路由级 Shift 指标应保留单独名称与口径，不能直接混入标准 CLS。
- BFCache 恢复对用户是一次新的页面访问体验，CLS 应按照新的访问重新计量；后台未完成首次可见绘制的页面可能不应报告有效 CLS。
- 跨源 iframe 内 Shift 通常无法由父页面 JavaScript 直接读取，CrUX 与网站自身 RUM 可能因此不完全一致。[[27]](https://web.dev/articles/cls) [[37]](https://github.com/GoogleChrome/web-vitals/blob/main/src/onCLS.ts)


**【RUM 上下文应关联到 Shift 发生时刻】**


建议在监控 SDK 中保留：

~~~text
App / Environment / Build Version
    ↓
Navigation Type / Document Navigation ID
    ↓
Route / View ID / Session ID
    ↓
Viewport / Device / Browser / Timestamp
    ↓
CLS Metric ID / 当前 CLS 值
    ↓
最大 Session Window
    ↓
构成窗口的 Shift Entries
    ↓
稳定、脱敏的受影响区域标记和矩形变化摘要
~~~

例如一个可序列化的示意事件（不代表现有项目已实现的协议）：

~~~json
{
  "type": "performance",
  "name": "CLS",
  "unit": "score",
  "value": 0.19,
  "metricId": "cls-demo-01",
  "context": {
    "route": "/article",
    "version": "2.4.1",
    "deviceClass": "mobile",
    "navigationType": "navigate",
    "viewId": "view-demo",
    "sessionId": "session-demo"
  },
  "attribution": {
    "largestShiftTime": 8400,
    "largestShiftValue": 0.11,
    "largestShiftTarget": "[data-monitor=article-body]",
    "loadState": "complete"
  },
  "window": {
    "shiftCount": 2,
    "windowValue": 0.19
  }
}
~~~

这里 largestShiftValue=0.11 只表示最大单次 Shift，windowValue=0.19 才等于本次最大窗口累计得分。不能把 sources[].node、用户输入文字、完整 DOM、敏感业务 URL 或账号信息直接上传；要在 SDK 中先转换为受控字段、脱敏、限量采样。

如果等到页面 hidden 才从“当前路由”读取 Context，可能把旧路由发生的 Shift 归给新路由。应在 Entry 产生时保留正确的 View / Timestamp，并在最终报告时关联同一导航测量周期。


**【RUM 的 P75 是页面访问级 CLS 的分位数】**


~~~text
一次访问：多个 Layout Shift → Session Window → 一个 CLS
另一访问：多个 Layout Shift → Session Window → 一个 CLS
                         ↓
            相同版本、页面、设备、浏览器的访问集合
                         ↓
                   CLS P75 / P95
~~~

错误统计包括：把所有 Shift.value 累加、把最大的单条 Shift 当整个 CLS、把多次 onCLS 回调算成多个页面访问，或把所有 Shift.value 的 P75 误称为 CLS P75。

要区分没有发生 Shift 的有效零值、浏览器不支持、页面初始在后台和采集失败。不能把所有“没有上报”自动补成 CLS=0。


### 【最大偏移窗口案例与组件空间契约构成稳定性验证】


#### <u>1. 故障定位应从最大窗口逐层回溯布局原因</u>



**【诊断决策树】**


~~~text
发现 CLS P75 恶化
  ↓
确认 Route / Version / Device / Viewport / Browser / Navigation Type
  ↓
查询代表性页面访问的最大 Session Window
  ↓
该窗口出现在什么阶段？
  ├─ 首屏加载 / 资源到达
  ├─ 字体替换
  ├─ SSR → Hydration / 异步组件加载
  ├─ 滚动与列表更新
  └─ 广告轮换 / 路由切换 / 长时间运行
  ↓
分析 LayoutShift Entries 和 previousRect / currentRect
  ↓
被移动元素的共同位置、方向和幅度是什么？
  ↓
回溯上游空间变化的来源
  ├─ 图片/视频/iframe 无尺寸 → 设置比例与稳定容器
  ├─ 新增内容占位不足 → 预留空间、合理控制插入位置
  ├─ 字体文本几何改变 → 优化后备字体和度量
  └─ CSS/组件状态/布局动画 → 减少非预期几何变化
  ↓
固定条件开展单变量实验
  ↓
Shift 来源和最大 Session Window 是否改善？
  ↓
线上同分群 CLS P75 + LCP / INP / 可用性回归
~~~


**【完整演示：真正根因在新插入的 Banner，而不是被推走的正文】**


假设新版文章页移动端 CLS P75 从 0.04 增至 0.22；某次代表访问的窗口为：

| 窗口 | 时间 | 累计 Shift 得分 |
| --- | --- | ---: |
| A：初始加载 | 0.5s～1.4s | 0.08 |
| B：阅读期间广告加载 | 8.0s～8.4s | 0.22 |

窗口 B 内两次 Shift 分别为 0.12 和 0.10，CLS 因而是 0.22。初次加载的 Lighthouse 若仅检测到窗口 A 的 0.08，就会低估真实使用期间的 CLS。

第一步，看窗口 B 的 sources，发现文章标题和正文共同下移，时间集中在 8 秒左右。

第二步，查询 Network / Performance 与 DOM 变化，假设发现页面顶部广告容器从 0 扩张至 100px，然后在新素材回传时再次变为 180px。

第三步，形成候选根因：广告容器**没有在初始布局预留空间，并且广告到达后仍然二次扩张**，推动下方文章。

第四步，按真实广告尺寸设计稳定容器，限制投放后的非预期尺寸变化，或选择不会推动主要阅读内容的展示位置。

第五步，在固定数据与操作条件下重现，确认窗口 B 中的高分 Shift 消失；同时核对广告内容可见性、页面密度和其他体验指标。

第六步，重新上线按同类手机、网络、文章页面查看 CLS P75 / P95 与最大窗口出现位置。只有这样才能从“正文发生偏移”走到“广告布局约束导致偏移”的可靠因果结论。


#### <u>2. 防止 CLS 的工程规范应落在组件契约、动态更新和自动化验收</u>


> **阶段归因 → 六大优化领域**：[③ 资源加载优化](./W-Web性能优化工程体系.md#4-资源加载优化改变资源体积发现顺序和必要下载范围)、[④ JavaScript 与状态优化](./W-Web性能优化工程体系.md#5-javascript-与状态优化降低实际执行与对象管理成本)、[⑤ 任务调度与更新优化](./W-Web性能优化工程体系.md#6-任务调度与更新优化控制执行顺序更新频率和单次峰值)、[⑥ 浏览器渲染优化](./W-Web性能优化工程体系.md#7-浏览器渲染优化减少样式布局绘制合成与图形资源成本)。**证据与问题分类**：建立媒体尺寸、异步状态容器、SSR/Hydration 和动态列表的空间契约，并验收加载与运行中的变化。 **方案选择条件**：以下原文保留阶段定义、上位原因、API、具体优化、风险与验证；技术领域链接是待证实的候选方向，而不是指标异常的自动结论。



**【工程原则是提前确定空间，而不是事后隐藏位移】**


CLS 优化应沉淀成可执行的日常开发规范，而不是只在指标回归以后再逐项修补。上面各章节已经说明“媒体、动态内容、字体、Hydration、CSS”为什么会改变布局；本节进一步回答：**在新建组件、编写业务逻辑、Code Review 和测试验收时，应该怎样从源头减少这些问题？**

统一原则：

> 会参与正常文档流的内容，必须尽可能在首次可见之前确定合理的空间约束；如果内容只能在运行时确定，则要设计用户可预期的占位、插入位置和状态切换过程。

它不要求页面尺寸永远不变，也不要求所有内容都渲染成固定高度。相反，它强调：布局的变化应该**有明确来源、有可预测的空间、有符合用户行为的时机**。

~~~text
工程设计阶段
  ↓ 识别哪些区域将异步出现、尺寸会发生变化
组件 API 与布局契约
  ↓ 提供明确尺寸、占位、状态和更新规则
业务开发和页面组装
  ↓ 服务端、客户端、资源与动态数据遵守统一约束
Code Review / 自动化测试
  ↓ 检查潜在的非预期空间变化与实测 Shift
线上 CLS + Attribution
  ↓ 验证真实用户是否仍遇到布局跳动
回到组件规范和测试用例
~~~

建议把规范分为**媒体占位、异步状态、动态插入、文字与字体、客户端接管、动画与布局、组件审查与验收**七个方面，而不是仅靠一个统一的 CSS 技巧。[[31]](https://web.dev/articles/optimize-cls)


**【媒体组件：必须提供可确定的初始几何尺寸】**


**约束目标**：浏览器即使还没有下载图片、视频或 iframe，也能在初始布局中确定它需要占用的空间。

**建议规范**：

1. 图片必须提供与实际素材一致的 width/height，或者使用能推导出尺寸的容器 aspect-ratio；对视频和第三方媒体提供等价的空间契约。
2. 响应式媒体如果使用不同裁切比例，必须覆盖不同断点下实际展示的几何比例，而不是让移动端沿用错误比例。
3. 列表、卡片和文章中不允许以“媒体加载完成后再自动撑开布局”作为默认设计；确有需求应说明原因并对位移做体验验证。
4. 媒体加载失败、空数据、骨架占位和成功显示也应有稳定的空间策略。

示例：

~~~html
<!-- width / height 声明宽高比，并不强迫按原始分辨率显示 -->
<img
  class="article-cover"
  src="/cover.webp"
  width="1200"
  height="675"
  alt="文章封面"
/>
~~~

~~~css
.article-cover {
  display: block;
  width: 100%;
  height: auto;
}

.video-slot {
  width: 100%;
  aspect-ratio: 16 / 9;
}
~~~

**需要避免的误解**：图片压缩、WebP、预加载、CDN 属于传输与加载策略，主要影响 LCP 的相关阶段；这里的尺寸属性主要用于 CLS 的空间稳定。两种策略可以同时采用，但不能互相替代。媒体细节见第 6 节。


**【异步组件：Loading、Empty、Error、Success 应具备稳定的容器策略】**


**约束目标**：网络返回与状态变化不应该使页面重要内容在没有准备的情况下突然上移或下移。

在 AsyncPanel、Skeleton、Card、DataWidget 等可复用组件中，建议首先定义：

| 状态 | 布局契约 | 设计重点 |
| --- | --- | --- |
| Loading | 与主要成功态尽可能一致的尺寸或比例 | Skeleton 反映真实几何结构，而不只是画一个动画 |
| Success | 根据真实业务数据占据内容区域 | 优先在既有容器中填充内容 |
| Empty | 有明确的内容缺省与最小高度规则 | 不要突然把后面的区域拉到不合理位置 |
| Error | 错误提示与重试按钮的占位可预测 | 避免状态切换反复推开周围组件 |
| Updating / Refreshing | 尽可能复用已有内容位置 | 非必要不清空整个区域再重新挂载 |

例如某类固定规格的卡片可以为加载容器提供合理的下限：

~~~css
.summary-card {
  min-height: 280px;
}
~~~

这是对**真实成功态高度有明确预期**时的示例，不是要求所有卡片都固定 280px。对于长文本、国际化、多语言、动态表格等高度不确定的场景，单一 min-height 可能不足，需要用更适合的容器约束、滚动区、内容分块或渐进替换策略。

**Code Review 问题**：接口慢 2 秒时页面首先显示多高？接口返回大量数据后这块区域会增加多少高度？加载失败后空间又会怎样变化？只检查成功态截图是不够的。


**【动态插入和实时数据：明确是否允许改变用户当前阅读位置】**


**约束目标**：广告、公告、推荐列表、新消息、实时流等异步内容，不应默认在当前可见内容的前方插入并推动所有旧内容。

建议按业务场景建立不同契约：

- **顶栏公告和广告**：设计时明确是否预留空间、最大高度、是否允许缩放、关闭后怎样回收空间；广告平台返回空内容时也要有确定的回收时机。
- **通知与状态提醒**：判断是否必须进入正常文档流；对于允许覆盖的提示，做好遮挡检测、关闭操作和可访问性，不能只为了得分改为覆盖层。
- **异步列表或消息流**：新数据到达后，可以使用未读提示、用户主动加载、视口锚点或稳定行高，避免正在阅读的旧条目跳动。
- **实时图表和排行榜**：可以持续更新数值，但不要未经设计就反复改变图表容器高度、工具栏占位和外层布局。

这些规范不是限制业务必须异步或同步，而是把**数据何时到达**和**可见布局什么时候变化**分成两项明确决策。具体机制见第 7 节。


**【字体与文本：首帧和最终呈现尽量保持几何一致】**


**约束目标**：字体、语言和动态内容替换不应让原本已经显示的文本突然改变换行高度，进而移动下方按钮或正文。

建议规范：

- 自定义 Web Font 必须定义明确的 fallback 字体，并测试加载前后的字宽、行高、换行差异。
- 重要标题、按钮、导航和正文的 line-height、容器宽度与字体加载策略应一起设计；不要只在本机字体缓存命中条件下验收。
- 确有字体度量差异时，评估 size-adjust 和 ascent/descent/line-gap override 等字体度量工具。
- 若使用 font-display: swap / optional，应同时验收文字出现速度（FCP/LCP）与字体切换可能带来的 CLS；不能简单断言“swap 一定更快且更稳定”。
- i18n、长文案、用户字体放大和窄屏下的自然换行应参与测试；不应通过强制裁剪有效内容来伪造布局稳定。

重要区别：**字体文件快下载完成**与**前后两套字体占用的布局几何一致**是两个问题。前者偏 Loading，后者偏 Visual Stability。详见第 8 节。


**【SSR、Hydration 与 ClientOnly：保证首次布局与接管后布局一致】**


**约束目标**：服务端 HTML 已经显示的布局，不应因为客户端重新计算环境条件、状态或数据而无意义地变化。

规范要求：

1. 首屏 SSR 内容与客户端初始化后的主要结构、数据条件、断点和尺寸应尽可能一致，避免 Hydration 后突然替换为几何差异很大的组件。
2. 对必须使用 ClientOnly 的区域，设计有合理宽高的服务端 fallback / placeholder，尤其是首屏重要组件。
3. 避免等 mounted 才读取窗口尺寸然后把首屏从一套布局突变为另一套布局；可以优先使用 CSS 媒体查询、容器布局等浏览器本身可在首次布局时生效的机制。
4. 在异步业务数据准备完成前，保留稳定容器与真实的 Loading / Empty 状态，避免先删旧 DOM 再插入新 DOM。
5. 页面路由切换时明确容器与过渡机制；普通客户端 Router 切换不是 CLS 自动重新计时的凭据，但路由过程本身仍可能引起 Shift。

**边界**：SSR 不自动保证低 CLS，CSR 也不必然高 CLS。两者影响的是内容生成和显示路径；CLS 仍取决于用户可见之后的布局位置是否发生非预期变化。


**【布局和动画：先问是否真的需要改变文档流】**


**约束目标**：避免因为纯视觉效果使用会推动周围内容的布局属性，或者因为无关组件状态变化导致整页重新排列。

- 对纯视觉位移，优先评估 transform / opacity 等不直接改变原布局位置的方案，而不是频繁调整 top、left、width、height。
- 真实的折叠展开、内容尺寸变化可以使用布局属性，但应对应明确用户操作、合理空间与时机，并避免挤压用户当前最关键的内容。
- 对固定定位、浮动层、Popover、Modal 和通知，要兼顾覆盖位置、点击目标、键盘访问和用户减少动画的偏好。
- 任何一个优化后“CLS=0”的动画，也不能由此推出 FPS 稳定、没有闪烁或不存在遮挡。其连续更新成本需要另行看 Frame/LoAF。

~~~css
/* 如果只想让一个面板视觉上水平进入，
   可优先考虑 transform，而不是持续改变文档流位置。 */
.drawer {
  transform: translateX(100%);
  transition: transform 240ms ease;
}
.drawer.is-open {
  transform: translateX(0);
}
~~~

**边界**：这只是选择动画属性的通用示意。面板是否是覆盖层、是否占据原布局、是否需要焦点管理由组件设计决定；不要把所有布局相关动画一律视为错误。详见第 9 节。


**【组件契约：让布局约束成为可审查的 API 和设计说明】**


为了避免每个业务页面重复解决同一个问题，可以将稳定空间要求沉淀到公共组件契约。建议按组件类型明确：

| 组件类型 | 应提供的设计或 API 契约 | Review 时重点核验 |
| --- | --- | --- |
| Image / Video / Embed | 固定比例、实际尺寸、资源失败占位 | 首次显示前能否确定高度 |
| AsyncPanel / Skeleton | Loading、Empty、Error、Success 的布局约束 | 状态切换是否推动其他内容 |
| Banner / Notice / Ad | 预留区域、尺寸范围、关闭与空内容规则 | 延迟插入、撤销是否引起跳动 |
| List / Feed / Live Data | 新内容插入方式、视口锚点、行高策略 | 阅读中的旧内容是否无故移动 |
| Text / Font | fallback、度量与换行规范 | 字体晚到与长文本是否改变布局 |
| SSR / ClientOnly | 服务端 fallback、Hydration 几何一致性 | 组件挂载后是否发生二次尺寸变化 |
| Modal / Drawer / Animation | 是否参与文档流、进入/退出过渡与焦点策略 | 动效是否遮挡、误触或造成重排 |

设计图和组件接口应回答“在**还没有数据或资源**时页面空间是什么样”，而不是只设计网络返回后的理想成功态。


**【自动化验收：完整覆盖冷加载、异步更新和真实用户流程】**


不能仅凭代码静态审查证明 CLS 达标。建议建立三个层次的验收：

**代码评审（预防）**：新增媒体是否缺乏比例？是否在用户正在阅读的上方插入内容？Skeleton 与真实布局是否明显不一致？Web Font 切换、Hydration、路由加载是否可能改变已有内容位置？

**实验室自动化（复现）**：使用 Playwright 或其他浏览器自动化执行关键页面流程，结合 LayoutShift PerformanceObserver 与截图/录屏识别非预期位移。重点测试冷缓存、弱网、较慢 API、字体晚到、空数据/超长数据、移动端断点、加载后滚动、实时推送、SPA 路由切换。

例如在自动化测试脚本里，在页面业务脚本执行前注册采集器，再触发完整 User Flow：

~~~js
// Playwright 测试中的思路示意：在打开页面之前安装采集。
await page.addInitScript(() => {
  window.__layoutShiftSamples = [];

  if (!PerformanceObserver.supportedEntryTypes?.includes('layout-shift')) {
    return;
  }

  const observer = new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      if (entry.hadRecentInput) continue;

      window.__layoutShiftSamples.push({
        time: entry.startTime,
        value: entry.value,
        // 原始 DOM Source 仅本地调试，勿直接发往服务端。
      });
    }
  });

  observer.observe({ type: 'layout-shift', buffered: true });
});

await page.goto(targetUrl);
// 在这里执行：等待关键图片、模拟慢接口、滚动、路由跳转等。
// 然后读取 window.__layoutShiftSamples，分析 Shift 与操作时序。
~~~

这段代码**只采集原始 Shift**，还未按 Session Window 计算完整 CLS，也没有断言、设备/网络模拟与异常报告，因此不是可以直接复制投产的完整 Playwright 测试。真正作为自动化门禁时，应使用与目标浏览器一致的 CLS 口径、合理阈值和可复现的场景；对于被 hadRecentInput 排除的位移，仍可针对关键 UI 单独设计截图或交互稳定性验收。

**线上 RUM（效果验证）**：发布后按 Route / Version / Device / Browser 分群，观察页面级 CLS P75、最大窗口出现时段、来源区域与样本量，同时排除采集缺失、跨源 iframe 和流量结构差异。实验室里“没有记录 Shift”不等于真实用户长期使用绝不会抖动。


**【将规范落实到代码评审时的典型问题】**


| 提交变更 | Review 要追问的问题 | 可验证证据 |
| --- | --- | --- |
| 新增一张主图 | 图片实际比例是否已在 HTML/CSS 中声明？移动端是否不同裁切？ | 禁用缓存、慢网加载前后布局 |
| 新增异步卡片 | Loading 与 Success 的高度变化是否可控？ | 慢 API、空数据和长数据测试 |
| 新增顶栏公告 | 内容何时到达？是否在已显示正文前新增空间？ | LayoutShift.sources 与 DOM 时序 |
| 调整字体 | fallback 替换后是否会改变标题换行？ | 字体晚到、窄屏、长文案 |
| 新增 ClientOnly | 服务端是否有稳定占位，水合后是否变化？ | SSR HTML 与客户端渲染对照 |
| 添加列表实时更新 | 新内容是否将用户当前阅读项往下推？ | 长驻滚动、消息追加测试 |
| 新增动画 | 是否需要改变 width/height/position？ | Trace Layout、Shift 与动画回放 |

**治理结论**：把上述问题沉淀为组件默认值、Code Review 规则、测试场景和线上回归指标，比每次看到 CLS 差就临时打补丁更可持续。用户体验标准仍需和 LCP、INP、可访问性、信息完整性和实际业务任务结合。


#### <u>3. CLS 优化要同时验收 LCP、INP、动画与业务正确性</u>



**【一个方案改善 CLS 可能牺牲其他体验】**


- 给首屏图片声明比例主要改善布局稳定性，但不会直接减少下载体积；仍需用 LCP 检查主要内容的实际到达。
- 等完整字体资源加载才显示文字可能减少切换偏移，却可能影响 FCP/LCP；度量相近的 fallback 常是更平衡的方向。
- 提前为动态区域预留空间可以减少布局跳动，但过大的永久留白会损伤页面信息密度。
- 通过 transform 移动 UI 可能减少 CLS，但动画遮挡、误触和运动不适仍需另行评估。
- 推迟非关键脚本可改善 INP，但若把关键组件延后挂载却不预留区域，可能引入 post-load CLS。
- 用户点击后立即使某区域展开可能满足 hadRecentInput 豁免，但也要确认用户真的能理解反馈及业务状态。


**【Lab 证明根因与修复，Field 验证用户真实受益】**


Lab：固定设备、视口、网络、缓存、数据和操作步骤，使用 Chrome Performance 的 Layout Shifts Track、动画回放、时间轴、Elements 与相关资源 / 框架事件，定位受影响元素和上游原因。不能只测试初次导航；对广告轮换、滚动懒加载、SPA 路由需要执行完整 User Flow。[[31]](https://web.dev/articles/optimize-cls)

Field：按同分群观察 CLS P75/P95、样本数、浏览器支持率、最大窗口出现时段及版本趋势。若真实用户指标与本地 Lighthouse 不一致，首先确认是否存在 post-load Shift、缓存差异、用户操作差异或跨源 iframe 计分差异，而不是直接否定任一结果。[[27]](https://web.dev/articles/cls)

最终标准不只是“CLS 降低”，还包括**页面内容可见、重要交互可以完成、布局不遮挡、加载和帧性能没有显著退化**。


### 【CLS 与加载、交互和浏览器布局知识的关联】


#### <u>1. 本章与现有通用知识文档的关系</u>


Visual Stability 已作为本篇第 5 章正式纳入统一指标诊断体系；下列文档提供渲染原理、监控采集和其他专项的深入机制：

- [Web 性能优化完整知识体系](./W-Web性能优化完整知识体系.md)：用户体验四维模型与浏览器渲染成本。
- [性能测量与真实用户监控专项](./X-性能测量与真实用户监控专项.md)：Layout Shift 与 CLS 采集、指标聚合、监控 SDK、RUM。
- [浏览器主线程、Event Loop 与任务调度](./B-浏览器主线程Event Loop与任务调度完整知识体系.md)：Layout/Render 的浏览器调度背景。
- [Chrome 浏览器渲染原理](./J-基于Chrome浏览器渲染原理.md)：Style、Layout、Paint、Composite。
- [Web 渲染架构](./W-Web渲染架构.md)：SSR/CSR、客户端水合与可见 DOM。
- [Loading / LCP 诊断章节](#3-loading-通过-lcp-四阶段归因定位关键内容出现延迟)：文档与关键资源时间成本。
- [Responsiveness / INP 诊断章节](#4-responsiveness-通过-inp-三阶段归因定位交互反馈延迟)：输入、事件处理与下一帧时延。
- [页面流畅度与连续渲染性能体系](./Y-页面流畅度与连续渲染性能完整知识体系.md)：连续视觉更新、Frame/LoAF 等。

统一理解：

~~~text
Loading → LCP → 四个加载耗时阶段 → 等待成本和资源链路
Responsiveness → INP → 三个交互耗时阶段 → 主线程处理与下一帧
Visual Stability → CLS → 最大窗口 / Shift / Source → 布局位置为什么改变
Smoothness → 自定义帧级结果 → 连续更新为何不稳定
~~~

CLS 不是耗时阶段拆分问题，而是**几何位移发生、何时集中发生以及被哪一种内容变化触发**的问题。


## 6. Smoothness 通过帧稳定性和 LoAF 归因定位持续卡顿


### 【FPS、Frame Interval 与刷新预算构成持续体验度量基础】

仅看平均 FPS 无法证明动画完整呈现；还应区分帧间隔、重要视觉更新、页面是否持续活动，以及数据队列是否追得上。


#### <u>1. 从视觉表现识别页面卡顿与持续渲染需求</u>



**【首先确认用户在哪个视觉场景感到不流畅】**


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


**【四类用户体验分别关注不同问题】**


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


#### <u>2. 用 FPS、帧间隔和刷新预算建立初步流畅度判断</u>



**【FPS 只能反映更新频率，帧节奏与重要画面更新同样重要】**


**平均 FPS 高仍可能有卡顿**：大量正常间隔夹杂一次 100ms 停顿，平均值会掩盖异常；**FPS 低也不一定不流畅**：静态内容没有持续更新要求，或者业务只需要较低频率改变视觉结果。rAF 回调频率也不是显示器实际呈现的新帧数量，合成线程动画和 WebGL/GPU 工作可能与主线程回调节奏不同。[[1]](https://web.dev/articles/smoothness)

所以初步判断需要结合：有无活跃视觉更新、目标刷新周期、rAF FPS、Frame Interval P95/P99、超预算比例、Longest Gap，并在真实视觉录制中验证异常，而不能仅检查一个全站平均 FPS。


**【结果指标异常后才进入阶段诊断】**


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

注意 **rAF Frame Interval 不是每帧实际 Layout/Paint 耗时**；LoAF.duration 只覆盖超过 50ms 的长帧，并非全部帧的精确绘制时长，低于 50ms 的超预算帧也应继续追查。[[22]](https://developer.chrome.com/docs/web-platform/long-animation-frames)


**【刷新率决定理论帧预算，不应硬编码 16.7ms】**


刷新周期可近似表达为：Frame Interval = 1000 / Refresh Rate。

| 显示刷新率 | 理论间隔 |
| --- | ---: |
| 60Hz | 16.67ms |
| 90Hz | 11.11ms |
| 120Hz | 8.33ms |
| 144Hz | 6.94ms |

这是显示刷新机会间隔，不等于 JS 可以独占的执行预算；浏览器内部工作需要时间，设备可能出现可变刷新率或节能限频。一个 20ms 的视觉工作，在 60Hz 和 120Hz 条件下造成的超预算程度不同。[[38]](https://web.dev/articles/rendering-performance)


**【rAF 提供的是下一次绘制前的调度机会】**


requestAnimationFrame 会在浏览器下次重绘之前尝试调用传入的函数；持续注册可形成相邻回调时间戳之差 ΔrAF。浏览器通常按刷新率调度，但后台标签或隐藏 iframe 会暂停或降低频率。[[39]](https://developer.mozilla.org/en-US/docs/Web/API/Window/requestAnimationFrame)

必须区分：

| 术语 | 含义 | 注意事项 |
| --- | --- | --- |
| rAF Frame Interval | 相邻 rAF 时间戳之差 | 不是实际的一帧 Paint 耗时 |
| rAF FPS | 单位时间 rAF 回调次数 | 不是显示器最终 Presented FPS |
| rAF Callback Duration | 回调内部同步执行时间 | 不包含全部布局、绘制和 GPU 工作 |
| Application Commit Duration | 框架或图库一次提交工作时间 | 部分 API 只是排队，不保证画面已呈现 |
| Chrome Frame / Compositor Trace | 更靠近真实帧生成和呈现 | 通常需要实验室录制 |

Frame Budget 不满足时可能出现显示更新延后或旧帧重复，但不能仅凭一次 ΔrAF 超预算就断言精确丢了几帧，因为浏览器还有合成路径、屏幕刷新与可变调度。[[1]](https://web.dev/articles/smoothness)


**【结果指标描述连续视觉更新的稳定程度】**


| 指标 | 计算口径 | 主要价值 | 限制 |
| --- | --- | --- | --- |
| Active rAF FPS | 活跃观察窗口内 rAF 回调频率 | 调度吞吐的辅助信号 | 不等于屏幕真实帧率 |
| Frame Interval P50/P95/P99 | 活跃有效 ΔrAF 的分位数 | 捕捉尾部尖峰 | 非真实渲染执行时间 |
| Budget Hit Rate | 未超过当前目标间隔的样本占比 | 观察期限达标情况 | 自定义，依赖刷新率与目标 |
| Long Gap / Jank Ratio | 超过 1.5 或 2 倍预算等阈值的样本比例 | 检出间歇性卡顿 | 阈值需要自行定义 |
| Longest Consecutive Stall | 连续视觉更新迟滞或最长停顿 | 避免平均值掩盖严重尖峰 | 必须排除后台与空闲 |
| Important Update Latency | 业务状态变化到可见更新的时间 | 衡量业务真正关心的视觉更新 | 需要业务埋点与呈现口径 |

这些不是官方统一 Core Web Vitals 分项，不应把 2 倍预算或某个自设 Jank Ratio 阈值写成 Google 官方标准。评估时必须明确 Active（有持续更新需求）的判断条件、可见性、基线刷新率和样本数。Google 对动画平滑度的研究也倾向于进一步区分重要动画更新、实际视觉内容与 Frame 的完整程度，而不只是平均 FPS。[[1]](https://web.dev/articles/smoothness)


**【原生 rAF 时间戳能够测到什么】**


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


**【真正的生产设计要规定采样窗口和有效状态】**


建议明确以下四类采集上下文：

1. **更新需求**：业务当前是否真的处于连续视觉更新中？静态页面没有连续动画需求，不应用同一目标 FPS 判定故障。
2. **页面可见性**：document.visibilityState 不是 visible 时应暂停采样，恢复时清空上一次时间戳，避免把后台停留时间作为一个长 Frame。
3. **设备基线**：60Hz、120Hz 与可变刷新率下 rAF 期望频率不同。可以结合短时空闲基线和业务目标建立当前的 Budget，而不是一律按 16.7ms。
4. **窗口与限量**：只在必要活动时间内采集有限样本，先保存低成本数字，结束时再计算 P95、超预算比例、极端间隔和连续卡顿长度。

Google 对 rAF FPS 测量的研究明确提醒：常驻轮询会干扰浏览器的空闲机会，在可变刷新率下产生误报，而且无法覆盖所有合成线程的视觉更新。应把 rAF 采样设计为**受控的辅助观察**。[[1]](https://web.dev/articles/smoothness)


**【Frame Interval P95 如何理解】**


假设某个活跃持续动画窗口采集到 100 个有效 ΔrAF 样本，大多数是 16.7ms，少量是 33ms、50ms。平均 FPS 可能仍接近 60，但 Frame Interval P95 会显示尾部延迟明显增长。

因此，帧间隔的尾部分位数比只取平均 FPS 更适合发现间歇性卡顿；同时应检查最长间隔、卡顿出现时的业务阶段和是否存在连续多次超预算。需要注意各统计窗口独立：**某窗口的 P95 不能直接拼成整次访问的 P95**，应保留采样方法和统计分布口径。


### 【Long Task 与 LoAF 时间结构定位长帧发生的阶段】

保留 Work、Pre-layout、Style/Layout 三段解释、原始 renderStart/styleAndLayoutStart 字段、blockingDuration 与完整时间数字算例。


#### <u>1. 以 LoAF 和 Long Task 作为异常帧的诊断入口</u>



**【50ms 是长帧或长任务的识别阈值，不是流畅帧预算】**


Long Task 观察单个主线程任务，LoAF 观察一次长帧相关的多个任务、rAF 和渲染工作，因此**没有超过 50ms 的单个 Task，也可能出现总耗时超过 50ms 的 LoAF**。若画面在 120Hz 下每帧用 20ms，虽然可能不断超出 8.3ms 刷新周期，却不达到 LoAF 50ms 记录阈值。

LoAF.duration 表示长帧整体工作时间，blockingDuration 表示与高优先级输入阻塞相关的估计，不应混为一谈。[[22]](https://developer.chrome.com/docs/web-platform/long-animation-frames)


**【诊断指标查明具体成本】**


Long Task（单个主线程长任务）提供任务级阻塞线索；LoAF（Long Animation Frame，长动画帧）提供帧级时间归因；Chrome Performance Trace、LoAF Script Attribution、强制同步布局、GC、Paint / GPU 和组件 Profiler 用于进一步定位具体原因。**LoAF 的 50ms 不是流畅度预算，也不是 Long Task 的计数。**[[22]](https://developer.chrome.com/docs/web-platform/long-animation-frames)


**【Long Task 是任务级证据，LoAF 是长帧级证据】**


Long Tasks API 面向主线程 Task。一个持续执行超过 50ms 的任务可能阻碍新输入、rAF 和页面渲染。LoAF 则从帧更新角度记录总计超过 50ms 的工作，即使它由多个较短 Task、rAF 回调和布局工作累积而成。

| 假设情况 | Long Task | LoAF | 判断意义 |
| --- | --- | --- | --- |
| 单个同步计算 90ms | 可能记录 | 也可能记录 | 主线程被长时间占用 |
| 三个 20ms Task 加 10ms 渲染 | 单个 Task 未超过 50ms | 可能记录 | 累积帧成本过高 |
| 120Hz 下 20ms 的帧更新 | 通常没有 | 不达到 50ms 阈值 | 仍可能严重超出 8.3ms 的刷新周期 |
| 总计 >50ms 但最终无需渲染 | 可能记录 | 可能记录，renderStart=0 | 不能假设存在样式布局阶段 |
| compositor 线程滚动 | 主线程可能很忙 | LoAF 可能有 | 用户可见滚动仍可能流畅 |

这是解释 LoAF 和 Long Task 为什么应联合使用的关键。**LoAF 数量不是 Long Task 数量，二者不是一一对应，也都不是标准掉帧数。**[[22]](https://developer.chrome.com/docs/web-platform/long-animation-frames)


**【LoAF 的 duration 与 blockingDuration 不同】**


LoAF.duration 是一次长帧记录的总持续时间，而 blockingDuration 是其对输入或其他高优先级任务的阻塞贡献，并非 duration - 50 的简单差值。官方算法会按组成帧的 Task 和最终渲染工作的相对时间计算。[[22]](https://developer.chrome.com/docs/web-platform/long-animation-frames)

**LoAF.duration 很高而 blockingDuration 低**，仍可能因为多个可让步的较短任务积累而使画面迟迟不更新；但它对输入的压力可能不同于单个 120ms 不让步的任务。

**LoAF.duration 与 blockingDuration 都很高**，不仅是 Smoothness 的风险，还应该联查 INP 的 Input Delay、Processing Duration 和 Presentation Delay。

LoAF 的 50ms 是记录门槛，不代表帧只有超过 50ms 才算掉帧。相关字段与记录机制亦可对照 W3C 工作草案。[[40]](https://www.w3.org/TR/long-animation-frames/)尤其在 90Hz/120Hz 下，远低于 50ms 的帧也可能错过重要更新。


#### <u>2. 按 LoAF 的 Work、Pre-layout 与 Style/Layout 区间定位耗时阶段</u>



**【先找主要耗时区间，再查执行的具体工作】**


~~~text
startTime：长帧工作起点
     ↓ Work Duration：渲染周期开始前的主线程工作
renderStart：渲染周期开始
     ↓ Pre-layout：rAF、视觉数据处理及布局前工作
styleAndLayoutStart：浏览器正式样式布局阶段开始
     ↓ Style/Layout 开始后的后续渲染相关工作
endTime = startTime + duration
~~~

官方第一层先拆 Work 和 Render；在有有效字段的 LoAF 中，再把 Render 拆为 Pre-layout 与 Style/Layout 开始后的区间。**Work 高**先看 JS/任务/GC；**Pre-layout 高**先看 rAF 回调、动画和组件提交及强制同步布局；**第三段高**再深入 Style、Layout、Paint 等 Trace。第三段不能直接认定为纯 Layout 时间，也不覆盖完整屏幕最终呈现；无 renderStart 的记录不能机械做三段减法。[[22]](https://developer.chrome.com/docs/web-platform/long-animation-frames)


**【原生字段和边界】**


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

注意 renderStart 可能为 0（该次工作没有进入渲染周期）；styleAndLayoutStart 在某些情况下也不可用。不要假设每条 LoAF 都可以无条件减出完整的三个阶段。[[22]](https://developer.chrome.com/docs/web-platform/long-animation-frames)


**【官方的两级结构与方便定位的三段解释】**


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

第三段虽然有时被称为 Style and Layout Duration，但从一个时间区间不能直接确定全部毫秒都是 Layout 计算，它还可能包含相关后续工作；若想分别确认 Style、Layout、Paint、Compositor、GPU，必须进一步查看 DevTools Performance Trace。LoAF 的 duration 也不能视为显示器最终 Presented Frame Latency。[[22]](https://developer.chrome.com/docs/web-platform/long-animation-frames)


**【Pre-layout 的主要工作是帧回调和布局前的同步状态更新】**


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

**不是所有视觉更新准备都算 Pre-layout。** 某个数据转换操作若发生在普通任务里、位于 renderStart 之前，就应看 Work；被 Worker 执行的计算不直接计入页面主线程 LoAF；某个 UI API 同步返回也不代表异步的渲染和屏幕呈现已经完成。[[22]](https://developer.chrome.com/docs/web-platform/long-animation-frames)

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


**【完整算例】**


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


**【Long Animation Frame Entry 的三阶段拆解代码】**


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

这段代码通过原生 LoAF Entry 读取长帧对应的 Work、Pre-layout 和 Layout 开始后的三个时间区间。字段缺失时必须用 null 表示不可用，不能强行算出负数或虚构渲染阶段。该 API 只上报严重长帧，不能直接据此得到**全部正常帧**的三阶段分布；浏览器支持和缓冲区也限制了数据完整性。[[22]](https://developer.chrome.com/docs/web-platform/long-animation-frames)


**【Script Attribution 可以定位哪些函数参与长帧】**


LoAF.scripts 在满足浏览器归因条件时，可能包含 startTime、duration、executionStart、sourceURL、sourceFunctionName、sourceCharPosition、invokerType、forcedStyleAndLayoutDuration 和 pauseDuration。

这些字段可以回答：

- 哪个主线程脚本、事件处理器或 rAF 回调参与了长帧；
- 脚本执行多长时间，是否存在强制同步布局；
- 哪些脚本工作集中在 Render Start 之前或之后；
- 是否需要使用 Chrome Trace 进一步排查具体算法、框架更新或复杂布局。

但它不是完整 CPU Profile：跨源 iframe、Worker、Service Worker 或某些独立执行环境未必有 Script Attribution；GPU 工作、浏览器合成或部分渲染成本也不能被这些脚本字段全面解释。[[22]](https://developer.chrome.com/docs/web-platform/long-animation-frames)


### 【JS、Task、GPU、GC 与历史数据规模共同决定持续退化原因】

结合 N（规模）、K（次数）、C（单次成本）、H（历史增长）等分析，不将普通内存增长直接断言为内存泄漏，也不把掉帧自动归给 GPU。


#### <u>1. 结合 JS、浏览器渲染、GC 与设备信号确定卡顿根因</u>


> **阶段归因 → 六大优化领域**：[④ JavaScript 与状态优化](./W-Web性能优化工程体系.md#5-javascript-与状态优化降低实际执行与对象管理成本)、[⑤ 任务调度与更新优化](./W-Web性能优化工程体系.md#6-任务调度与更新优化控制执行顺序更新频率和单次峰值)、[⑥ 浏览器渲染优化](./W-Web性能优化工程体系.md#7-浏览器渲染优化减少样式布局绘制合成与图形资源成本)。**证据与问题分类**：通过 LoAF、Trace、Frame Interval 和 Memory 证据区分 JS 计算、渲染提交、GC、GPU 或历史规模增长。 **方案选择条件**：以下原文保留阶段定义、上位原因、API、具体优化、风险与验证；技术领域链接是待证实的候选方向，而不是指标异常的自动结论。



**【从阶段耗时映射到需要进一步检查的证据】**


| 阶段或异常 | 常见现象 | 下一步证据 | 候选原因 |
| --- | --- | --- | --- |
| Work 高 | rAF 回调被推迟、长任务多 | Main Thread、Long Task、GC、LoAF scripts | 同步计算或消息回调占用 |
| Pre-layout 高 | rAF 回调与视图状态提交时间长 | JS Profile、Framework Profiler、Forced Layout | 动画逻辑、过量单帧工作、状态更新 |
| Style/Layout 后区间高 | 帧内渲染相关成本高 | Style、Layout、Paint、Rendering Trace | DOM/Canvas 更新范围过大 |
| JS 时间正常但视觉仍卡 | 复杂动画或图形场景不顺 | Raster、Compositor、GPU | 图形调用、纹理和合成成本 |
| 运行越久越卡 | Heap、存活对象或 GC 尖峰增长 | Heap Snapshot、Allocation Sampling、长期性能对照 | 内存保留、持续分配或重复更新 |

LoAF 时间位置只能提供候选方向，不能自动给出具体代码根因；需要相同时间范围的多种证据和受控实验。


**【主线程渲染前工作过重】**


**现象**：Frame Interval P95 增大、LoAF Work Duration 高、长任务与页面数据预处理时刻重叠。

**常见原因**：同步 JSON 解析、排序、批量数据转换、复杂循环、第三方脚本、GC、持续事件或定时任务占用主线程。

**诊断证据**：Long Task、LoAF.scripts、Main Thread、业务 User Timing、数据量和内存分配。

**优化方向**：减少重复工作、将大任务拆为可让出主线程的批次、控制消息频率，适合并行的非 DOM 计算可以考虑 Worker。

**边界**：Worker 不是 DOM 渲染优化器，还要支付数据传输和序列化成本。


**【rAF 与框架视图提交过重】**


**现象**：Render Pre-layout 区间高，每次 rAF 一次性处理过大数据，组件提交耗时持续增加。

**常见原因**：一次执行大量待更新任务、重复创建完整视图、过多组件同时提交，或响应式依赖影响范围过大。

**诊断证据**：LoAF Script Attribution、框架 Profiler、业务同步提交时长与更新次数。

**优化方向**：合并重复更新、减少每次提交的工作、把不紧急的更新分散到其他执行机会，并避免无意义的中间状态重复提交。

**边界**：requestAnimationFrame 只提供调度时机，不会自动把 100ms 同步任务切碎。


**【Style、Layout、Paint 与像素更新成本】**


**现象**：LoAF styleAndLayoutStart 后的时间较高，Trace 里存在大量 Layout / Paint。

**常见原因**：大 DOM、反复读写尺寸触发强制布局、复杂 CSS、Canvas 全量绘制、图层持续重新生成。

**诊断证据**：Chrome Rendering Track、Forced Style/Layout、Paint 区域、框架组件更新范围、可视对象数量。

**优化方向**：缩小 Layout 和 Paint 影响区域、虚拟化、批量 DOM 读写、增量更新、缓存静态图层。

**边界**：LoAF 第三个时间区间不能证明全部消耗都是 Layout；需要 Trace 判断具体瓶颈。


**【Compositor、Raster、GPU 或刷新状态造成的瓶颈】**


**现象**：主线程和业务 Callback 耗时不明显，实际 Canvas/WebGL 或页面滚动仍出现不连续。

**常见原因**：Draw Call、纹理上传、Raster 负荷、GPU 内存、图层复杂、变动的屏幕刷新率。

**诊断证据**：Chrome Frames、Raster、Compositor、GPU Tracks 和真实设备录制。

**优化方向**：减少图层和对象、控制像素更新区域、纹理复用、画质分级或按需渲染。

**边界**：rAF 和 LoAF 都不能完整测量最终屏幕呈现链路。[[1]](https://web.dev/articles/smoothness)


**【GC 与对象分配压力：周期性停顿和长期内存增长是两类问题】**


持续渲染中，GC（Garbage Collection，垃圾回收）并不是应用显式调用的业务任务，而是 JS 引擎为回收不可达对象付出的运行时成本。部分 GC 阶段会暂停主线程 JS，因此如果暂停与下一帧工作竞争，就可能推迟 rAF、状态提交和渲染准备，形成 Frame Interval 尖峰。V8 已采用分代、并发、并行和增量回收减轻暂停，但不能认为 GC 对主线程没有任何影响。[[41]](https://v8.dev/blog/trash-talk)

要区分两类表现：

| 问题 | 常见现象 | 需要验证的证据 | 优化方向 |
| --- | --- | --- | --- |
| Allocation Churn（频繁短生命周期分配） | Heap 频繁上涨/回落，间歇性掉帧 | GC Trace、Allocation Sampling、尖峰与帧时刻相关性 | 减少高频路径中不必要的临时数组、对象和复制 |
| Retained Memory（长期存活对象增加） | 页面运行越久占用越高，可能出现回收或重复计算成本增加 | Heap Snapshot、Retainers、存活对象和提交耗时 | 清理无效引用、减少不必要的长期驻留对象 |

例如一个动画更新函数每帧创建大量临时数组、转换全部可见对象数据，即使最终只改变少量视觉元素，也会产生多余的 CPU 工作与内存分配。减少不必要的中间对象有助于降低 GC 压力；但在 React/Vue 等框架中仍须遵守状态更新语义，不能为了避免分配而随意原地修改状态。

**“Heap 大”并不等于“GC 导致掉帧”。** 需要在 DevTools Performance 中证明 GC 事件与长帧或 rAF 尖峰重叠，再使用 Memory 的 Allocation Sampling、Heap Snapshot 找高分配函数和被持续保留的对象。Heap 锯齿是线索而非充分证据；合法保留的历史数据也不一定是泄漏。[[42]](https://developer.chrome.com/docs/devtools/memory-problems)

最后注意：LoAF 脚本归因里的 pauseDuration 不等于 GC Duration，它主要用于同步对话框、同步 XHR 等暂停时段；GC 归因依赖更具体的性能或内存记录，不能用该字段替代。[[22]](https://developer.chrome.com/docs/web-platform/long-animation-frames)


**【内存问题需要从占用量、分配速率与存活对象三个维度理解】**


页面卡顿与内存相关，但**内存占用量本身不是掉帧原因**。要把问题落到实际的帧生产过程，需要区分三个量：

| 观察维度 | 它实际上描述什么 | 与帧超时可能怎样相关 |
| --- | --- | --- |
| Heap Used / Live Set（堆使用量与存活对象集合） | 当前 JS Heap 已使用空间，以及 GC 后仍然可达、必须保留的对象 | 存活对象图扩大，可能增加标记、复制、引用更新的工作；也可能带来更多业务计算 |
| Allocation Rate（内存分配速率） | 单位时间新分配多少数组、对象、字符串等 | 年轻代可用空间更快被消耗，可能提高 Minor GC 的触发频率；对象创建本身也占 CPU |
| Heap Capacity / Available Space（堆容量与可用空间） | V8 为托管堆提供的容量以及还可继续分配的空间 | 影响 GC 与扩容的时机；空间紧张时可能需要更频繁的内存管理 |

其中 Live Set 需要结合 GC 后的存活对象与引用关系判断，不能直接把一次 Performance Memory 曲线的 Heap Used 当成“全部存活对象的精确数量”。浏览器整体内存还包括 DOM、图像、GPU 资源与其他原生分配，并不都能在 JS Heap 中看到。[[42]](https://developer.chrome.com/docs/devtools/memory-problems)

**高内存占用、频繁回收、内存泄漏、页面越来越卡**也不是同义词：

- 页面长时间稳定保留一批数据，只要设备内存充足、不增加关键帧的计算或绘制成本，可能依然流畅。
- 页面长期占用不大，但每帧创建大量短期对象，可能出现持续分配与周期性回收成本。
- 页面对象规模持续增长，导致每次要处理的内容越来越多，即使 GC 没有明显暂停，也可能造成单帧耗时增长。
- 系统或图形内存真正不足时，可能出现额外资源管理开销，且不一定反映在 JS Heap 曲线上。

因此分析内存问题要同时记录：分配、保留、回收与每帧实际工作量，而非只看一个 Heap Used 数字。


**【GC 的可达性分析和分代回收决定其 CPU 与暂停成本】**


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

这些步骤不是“每次 GC 都严格串行执行全部四步”。年轻代和老年代采用不同策略，一些任务可增量、并发或并行执行，具体实现也会随 V8 版本演进。它们的共同点是仍然需要计算资源，并且某些阶段会与主线程同步或暂停 JS。[[41]](https://v8.dev/blog/trash-talk)

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

年轻代回收的部分工作与**存活对象需要复制和追踪的规模**有关，因此不能把每次 Minor GC 的耗时简单理解为年轻代分配过的所有垃圾大小；老年代回收则可能包含更广范围的对象标记、整理与引用更新。V8 对这些阶段采用并行 Scavenger、并发标记与增量工作，以减少主线程停顿。[[43]](https://v8.dev/blog/orinoco-parallel-scavenger) [[44]](https://v8.dev/blog/concurrent-marking)

由此理解“为什么存活对象增多可能让回收变贵”：假如一个长期驻留的对象图包含更多仍然可达的节点与引用关系，在其他条件相近时，需要标记、复制或更新的对象可能更多。但**Heap 扩大一倍不意味着 GC 必然耗时翻倍**，还受代际分布、存活率、碎片化、回收时机、堆容量及并发策略影响。[[41]](https://v8.dev/blog/trash-talk)


**【高频分配会带来年轻代回收压力，但短生命周期对象本身并非错误】**


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

一个常见线索是 Heap Used 随分配持续上升，GC 后又下降，形成锯齿曲线；但锯齿是自动内存管理的正常表现之一，**并不意味着每一次回落都发生了用户可见的掉帧**。只有 GC 的暂停时刻与异常帧相关，且减少分配/回收后帧结果实际改善，才能判断它是显著的流畅度瓶颈。[[42]](https://developer.chrome.com/docs/devtools/memory-problems)

**不要把 Array.map、临时对象或不可变状态更新一概当成低性能代码。** V8 对短生命周期对象的回收已有针对性优化；如果没有实测证据，强行改成复杂对象池，可能增加长期驻留对象与状态错误的风险。[[43]](https://v8.dev/blog/orinoco-parallel-scavenger)


**【长期存活对象增多与真正的内存泄漏属于不同问题】**


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

相反，一批业务仍需访问的缓存对象可能本来就应该存活，此时高 Heap 不等于泄漏。对持续运行后增长的对象，应通过 Heap Snapshot / Retainers 找到具体保留路径，判断对象是否仍具业务用途，而不能只把图表中向上的内存曲线称为泄漏。Chrome DevTools 明确区分 Leak、Bloat 和 Frequent Garbage Collections 这些不同的内存性能问题。[[42]](https://developer.chrome.com/docs/devtools/memory-problems)

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


**【非 JS Heap 的内存与设备内存压力也可能损害画面更新】**


网页的内存占用不只来自 JavaScript 托管堆。DOM 与浏览器内部对象、图片解码缓存、ArrayBuffer 等二进制数据，以及图形纹理和缓冲资源，都可能占用额外内存；其统计归属与可观察方式因浏览器和 API 而异。

| 资源类别 | 典型资源 | 与流畅度的关系 |
| --- | --- | --- |
| JS Heap | 普通对象、数组、部分缓存 | 对象分配、GC、同步数据处理 |
| DOM 与浏览器原生资源 | 节点、布局结构、部分图像资源 | 可能扩大 Style/Layout/渲染工作或浏览器内存占用 |
| ArrayBuffer / TypedArray 等 | 大块二进制数据 | 可能带来额外内存、复制、数据转换与资源管理成本 |
| 图形与 GPU 资源 | 纹理、图形缓冲、Frame Buffer 等 | 可能增加上传、重建、栅格化或显存压力 |

如果某页面同时拥有越来越多 DOM 元素或图形资源，内存增长可能是页面结构扩张的结果，而真实帧瓶颈来自每次要管理、布局或绘制的对象数量。不能看到 Heap Used 没明显增加就排除浏览器原生资源或 GPU 方面的性能问题。

当设备的可用物理内存真正紧张时，操作系统也可能进行更频繁的内存回收、压缩或换入换出等工作，给 CPU 和内存访问带来额外等待。并不是页面一达到某个固定 MB 数字就必然发生这些行为：不同设备、操作系统、浏览器进程结构、可用内存和其他应用负载都有影响。因此无统一的“超过 X MB 一定卡顿”阈值，需要在目标设备上复现和测量。[[42]](https://developer.chrome.com/docs/devtools/memory-problems)


**【内存相关开销最终如何进入 Frame Budget 与 LoAF 时间轴】**


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

尤其要注意：LoAF 的 scripts[].pauseDuration **不是 GC Duration**。它主要关联同步暂停场景，不能直接把这一字段当作垃圾回收时间。判断 GC 是否引发卡顿，需要从 Performance Trace 中查找相应的 GC 工作以及对应的帧异常。[[22]](https://developer.chrome.com/docs/web-platform/long-animation-frames)


**【从内存增长到掉帧必须依靠完整的证据链】**


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



**【测量条件不成立引起误判】**


后台标签 rAF 可能暂停；静态页面并不需要持续更新；低功耗或可变刷新率模式可能改变采样间隔。这些都要求先确认页面有重要的持续视觉更新需求，再评价目标 FPS。


### 【对证据确定的瓶颈优化并验证帧稳定和数据时效】


#### <u>1. 根据已定位的瓶颈选择渲染与运行时优化策略</u>


> **阶段归因 → 六大优化领域**：[④ JavaScript 与状态优化](./W-Web性能优化工程体系.md#5-javascript-与状态优化降低实际执行与对象管理成本)、[⑤ 任务调度与更新优化](./W-Web性能优化工程体系.md#6-任务调度与更新优化控制执行顺序更新频率和单次峰值)、[⑥ 浏览器渲染优化](./W-Web性能优化工程体系.md#7-浏览器渲染优化减少样式布局绘制合成与图形资源成本)。**证据与问题分类**：把 N（处理规模）、K（频率）、C（提交成本）、H（历史规模）、B（预算）分别测量，再决定是否合批、增量或调度。 **方案选择条件**：以下原文保留阶段定义、上位原因、API、具体优化、风险与验证；技术领域链接是待证实的候选方向，而不是指标异常的自动结论。



**【优化的目标是减少必要工作的成本，而不是机械提高 FPS】**


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


**【长任务调度优化应兼顾交互响应和连续视觉更新】**


当 Work 阶段以 CPU 密集计算为主时，单纯把计算放进 rAF 不会使任务变轻；它只改变执行时机。如果 70ms 计算不需要在当前帧同步完成，可将其拆为能够让出主线程的非紧急片段，或者在数据边界允许时转移到 Worker。

但如果拆得太细、每段都带来调度开销，也可能损害总体吞吐；如果使用 setTimeout 而没有优先级策略，非关键任务仍可能占用关键交互与动画时刻。所以优化时应同时测量 Long Task、INP、Frame Interval P95 与完成必要业务工作的总时间。


**【动画和绘制优化应遵循最小必要视觉更新】**


Pre-layout 中的工作可以通过减少每次 rAF 中的计算、避免对没有变化的元素提交更新来降低；Style/Layout 中可以通过缩小 DOM 影响范围来降低；Paint 与合成中则应考虑变化像素区域、图层复用和 GPU 工作。

渲染代码采用 transform/opacity 不必然让所有视觉效果都无成本，依然应关注合成图层内存、动画时长以及是否发生 GPU 压力。只有监测到对应瓶颈，才能说明某项缓存、隔离或动画属性调整是否有效。[[38]](https://web.dev/articles/rendering-performance)


**【内存和 GC 优化需要先证明造成了可见卡顿】**


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

高 Heap 或锯齿曲线不能直接证明 GC 导致掉帧。应先确认 GC 与帧异常重叠，再定位高分配函数和无效引用，最后通过受控实验比较 GC、Frame Interval 与用户感知；如果没有对应改善，要继续检查渲染路径。[[41]](https://v8.dev/blog/trash-talk) [[42]](https://developer.chrome.com/docs/devtools/memory-problems)


**【减少高频无意义分配要兼顾状态正确性和总工作量】**


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


**【清理引用与控制缓存规模要区分泄漏和合理驻留】**


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


**【内存、GC 和每帧工作量的优化效果必须分别验收】**


| 优化动作 | 优先验证的过程证据 | 最终必须改善的用户结果 |
| --- | --- | --- |
| 降低临时对象分配 | Allocation Rate、Minor GC 频率、相关 CPU 工作 | 异常帧频次、Frame Interval 尾部 |
| 清理错误引用 | Heap Snapshot、Retainers、GC 后基线 | 长期运行稳定性，不出现持续退化 |
| 控制无上限缓存 | 资源驻留规模、缓存命中与重新计算成本 | 帧稳定性、内存稳定性及功能正确性 |
| 对变化数据做增量计算 | 每次更新的处理对象量与同步执行时间 | 实际视觉更新时延与 FPS 稳定性 |
| 释放图形资源 | 原生/GPU 资源占用、Raster/Compositor 数据 | 图形场景下的真实画面稳定性 |

一个优化即使降低了内存使用量，也不必然提高页面 FPS；反过来，即使 Heap Used 几乎不变，减少重复计算也可能显著改善 Frame Interval。性能结论需要沿“根因证据 → 操作 → 相同条件结果”的因果链闭环。

当诊断涉及特定图形引擎的增量资源更新时，可以参考[实时轨迹持续渲染的项目专项分析（草稿）](./drafts/项目分析-实时轨迹持续渲染与历史数据性能-草稿.md)查看实现粒度与测量边界；案例不构成本节优化原则的定义依据。


#### <u>2. 通过实验和真实用户数据验证流畅度优化效果</u>



**【从观测结果建立可复现、可证伪的原因假设】**


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


**【实验应按所怀疑的瓶颈改变一个关键条件】**


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


**【DevTools 应按现象进入分配、存活对象与 GC 时间归因】**


Chrome DevTools 提供不同视角的证据，必须根据当前问题选择正确工具，而不是只打开 Heap Snapshot 找最大的对象。

**【1. 先用 Performance 证明内存事件与异常帧有关】**

在能重现问题的设备和场景中，同时记录视觉异常发生的时间与 Performance 时间线：

- 比较相同活动窗口下的 Frame Interval P95、最长停顿与 LoAF 分布。
- 在异常区间查看 JS Task、GC 相关事件、主线程调用与 Rendering Track。
- 如果 GC 与 rAF 停顿时间重叠，形成合理的候选假设；如果 GC 没有明显参与，则优先查同步计算、布局或图形工作。
- 不把一次 LoAF 的 pauseDuration 直接当成 GC Duration，也不以 LoAF 缺失排除低于 50ms 的 GC 影响。

这里只证明**时间相关性**，随后还要用具体分配来源或受控调整证明因果。[[22]](https://developer.chrome.com/docs/web-platform/long-animation-frames)

**【2. 用 Memory Allocation Sampling 确认是谁大量分配】**

Memory 面板的 Allocation Sampling 可以按函数统计分配情况。先确定需要观察的活动操作与采样时长，再重点寻找：

- 是否有高频函数不断创建新的大型集合；
- 哪些计算结果本可以按需复用却每次都重新生成；
- 是否有初始化、订阅或渲染更新函数反复分配相同类别对象。

这只能说明“谁在分配”，并不保证这些分配会被长期保留或造成卡顿。需要同时查看 Performance 中的 GC 与帧变化。[[42]](https://developer.chrome.com/docs/devtools/memory-problems)

**【3. 用 Heap Snapshot 与 Retainers 判断对象为什么还活着】**

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

不能假设 GC 后 Heap Used 必须回到页面初始化时的数值；正常缓存、惰性初始化以及浏览器运行时本身就可能保留必要对象。Heap Snapshot 也具有测量开销，调查时应尽可能避免把其开销与用户正常帧指标混在一起。[[42]](https://developer.chrome.com/docs/devtools/memory-problems)

**【4. 区分高分配、长期驻留和每帧计算成本三种结果】**

| 检查结果 | 优先假设 | 下一步对照 |
| --- | --- | --- |
| 分配速率高、Heap 回落明显、GC 与帧尖峰重叠 | 高频短生命周期对象 + 回收压力 | 减少一处高分配工作，比较 GC 与 Frame P95 |
| GC 后 Heap 基线持续升高，异常引用路径明确 | 多余长期存活对象或泄漏 | 清理引用并比较对象数和长期帧结果 |
| GC 不突出，但 JS/布局/绘制成本随对象量增长 | 重复处理的数据/视图工作集合扩大 | 限制更新范围，比较单帧 CPU 与 Rendering 时间 |
| JS Heap 不高但设备仍存在图形卡顿 | 原生、图形资源或设备内存压力 | 检查 GPU/Compositor 和目标设备条件 |

必须保留**没有内存问题、只是其他工作超帧预算**这一分支。只有当优化前后的证据同时支持内存相关成本与流畅度改善时，才在文档中将其表述为原因。



**【RUM 需要分清结果指标与异常诊断明细】**


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


**【监控 SDK 不能因为观测本身引入新的长帧】**


采样时应有界、按需：仅对需要连续更新的活动窗口使用短时 rAF 测量，页面 hidden 时暂停并重置上一帧时间戳；避免逐帧触发网络请求、打印日志、读取布局或做昂贵统计。LoAF 诊断可以低成本收集异常帧，但也需要限制采样量、过滤 URL/函数来源中的敏感信息、标识浏览器不支持和缓冲数据缺失。


**【最终必须回到用户视觉体验与跨指标验证】**


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


### 【持续渲染与其他体验指标及业务场景的知识边界】


#### <u>1. 与其他用户体验和现有知识文档建立关系</u>



**【四类体验指标分别回答不同的问题】**


| 体验维度 | 主要结果与诊断 |
| --- | --- |
| Loading | LCP 与文档、资源、渲染延迟 |
| Responsiveness | INP 与输入等待、处理、呈现延迟 |
| Visual Stability | CLS 与 Layout Shift、Session Window、根因 |
| Smoothness | 重要视觉更新需求、Frame Interval、LoAF 与帧阶段归因 |

LoAF 有助于分析交互的长帧贡献，但不能将它直接当成 INP；Smoothness 自定义 rAF 指标也不属于既有 Core Web Vitals。[[4]](https://github.com/GoogleChrome/web-vitals)


**【通用知识入口与专项分析边界】**


Smoothness 已作为本篇第 6 章正式纳入四类用户体验诊断体系，但仍保留独立的帧时序、LoAF、内存与数据新鲜度分析；相关资料如下：

- [Loading / LCP 诊断章节](#3-loading-通过-lcp-四阶段归因定位关键内容出现延迟)：加载时延与阶段归因。
- [Responsiveness / INP 诊断章节](#4-responsiveness-通过-inp-三阶段归因定位交互反馈延迟)：交互延迟的分段与诊断。
- [Visual Stability / CLS 诊断章节](#5-visual-stability-通过-cls-计分与布局根因定位页面跳动)：布局偏移的计算、来源与真正根因。
- [Web 性能优化完整知识体系](./W-Web性能优化完整知识体系.md)：整个 Web 页面性能框架。
- [性能测量与真实用户监控专项](./X-性能测量与真实用户监控专项.md)：监控 SDK、PerformanceObserver 和 RUM。
- [页面流畅度与连续渲染性能完整知识体系](./Y-页面流畅度与连续渲染性能完整知识体系.md)：现有相关知识积累，其中偏向实时可视化的项目性方法不应被当作本章的通用主线。

专项场景只在机制对应位置提供必要链接，**不以项目中的参数、代码组织或优化结果反向定义通用知识框架**。


## 7. 性能技术根因通过原始证据与对应优化形成验证闭环


### 【四类指标归因需要进一步落实到真实任务、请求和图形工作】

统一复用底层证据分析逻辑，但四种指标的特有计算、Attribution 和数字算例全部保留在前面各自章节。


#### <u>1. 四维指标各自进入对应的阶段或事件归因模型</u>


> **阶段归因 → 六大优化领域**：[① 网络传输优化](./W-Web性能优化工程体系.md#2-网络传输优化降低连接往返和重复传输成本)、[② 服务端与数据交付优化](./W-Web性能优化工程体系.md#3-服务端与数据交付优化缩短内容生成和必要数据依赖)、[③ 资源加载优化](./W-Web性能优化工程体系.md#4-资源加载优化改变资源体积发现顺序和必要下载范围)、[④ JavaScript 与状态优化](./W-Web性能优化工程体系.md#5-javascript-与状态优化降低实际执行与对象管理成本)、[⑤ 任务调度与更新优化](./W-Web性能优化工程体系.md#6-任务调度与更新优化控制执行顺序更新频率和单次峰值)、[⑥ 浏览器渲染优化](./W-Web性能优化工程体系.md#7-浏览器渲染优化减少样式布局绘制合成与图形资源成本)。**证据与问题分类**：对 LCP 四段、INP 三段、CLS 位移窗口、Smoothness 帧结构分别寻找客观阶段证据。 **方案选择条件**：以下原文保留阶段定义、上位原因、API、具体优化、风险与验证；技术领域链接是待证实的候选方向，而不是指标异常的自动结论。



**【LCP 通过四段归因找到加载等待的实际位置】**


标准的可归因 LCP 四段为：[[3]](https://web.dev/articles/optimize-lcp)

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

详细的字段、导航边界与优化路径见 [Loading / LCP 四阶段诊断草稿](#3-loading-通过-lcp-四阶段归因定位关键内容出现延迟)。


**【INP 将一次交互分成输入等待、事件处理和画面呈现】**


INP 衡量特定交互到其后续下一帧的响应时延，而不是该次交互涉及的全部异步业务流程。三个分段为：[[23]](https://web.dev/articles/optimize-inp)

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

详细机制见 [Responsiveness / INP 三阶段诊断草稿](#4-responsiveness-通过-inp-三阶段归因定位交互反馈延迟)。


**【CLS 不按毫秒分段，而按最大偏移窗口和布局因果关系定位】**


CLS 是对非预期布局位移的量化，通常选取页面中得分最高的 Session Window，而不是将页面生命周期所有 Shift 分数无限累加。Session Window 的相邻 Shift 间隔小于 1 秒、单个窗口最长 5 秒。[[27]](https://web.dev/articles/cls)

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

LayoutShift.sources 记录的通常是**位置发生改变的受影响元素**，而不是天然的 Root Cause。例如正文被顶部新插入的模块推开，受影响者可能是正文，根因却是未预留空间的顶部模块。[[45]](https://web.dev/articles/debug-layout-shifts)

见 [Visual Stability / CLS 诊断章节](#5-visual-stability-通过-cls-计分与布局根因定位页面跳动)。


**【Smoothness 用帧结果识别异常，再结合 LoAF 三个时间区间】**


先在有连续视觉更新的有效采样窗口里确认 Frame Interval P95/P99、Longest Gap 与 Budget Hit Rate；平均 FPS 是辅助信息，不是唯一结果。对于严重长帧，LoAF 提供长帧级别的时间区间归因：[[22]](https://developer.chrome.com/docs/web-platform/long-animation-frames)

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

因此 Work 高先查任务、同步计算、GC；Pre-layout 高先查 rAF 回调与同步提交；第三段高继续查浏览器 Style/Layout/Paint；主线程证据不足时查 GPU、合成和设备。详情见 [Smoothness 诊断章节](#6-smoothness-通过帧稳定性和-loaf-归因定位持续卡顿)。


#### <u>2. 根据异常阶段查找底层证据，才能从“慢在哪里”走到“为什么慢”</u>


> **阶段归因 → 六大优化领域**：[① 网络传输优化](./W-Web性能优化工程体系.md#2-网络传输优化降低连接往返和重复传输成本)、[② 服务端与数据交付优化](./W-Web性能优化工程体系.md#3-服务端与数据交付优化缩短内容生成和必要数据依赖)、[③ 资源加载优化](./W-Web性能优化工程体系.md#4-资源加载优化改变资源体积发现顺序和必要下载范围)、[④ JavaScript 与状态优化](./W-Web性能优化工程体系.md#5-javascript-与状态优化降低实际执行与对象管理成本)、[⑤ 任务调度与更新优化](./W-Web性能优化工程体系.md#6-任务调度与更新优化控制执行顺序更新频率和单次峰值)、[⑥ 浏览器渲染优化](./W-Web性能优化工程体系.md#7-浏览器渲染优化减少样式布局绘制合成与图形资源成本)。**证据与问题分类**：明确 Network、Task、Layout、Raster、GPU、GC 各自能证明什么，回到调用栈、组件或资源对象核验。 **方案选择条件**：以下原文保留阶段定义、上位原因、API、具体优化、风险与验证；技术领域链接是待证实的候选方向，而不是指标异常的自动结论。



**【阶段归因必须继续落到真实工作与执行主体】**


把 LCP、INP 或 LoAF 拆成多个阶段，解决的是**主要等待发生在哪一段**；真正根因则需要回答：这一段工作由什么触发、由谁执行、执行了多久、有哪些不必要的依赖或重复工作。

| 阶段现象 | 下一步最关键的证据 | 候选根因 | 当前不能直接推出的结论 |
| --- | --- | --- | --- |
| LCP TTFB 高 | Document Timing、重定向/连接/等待、服务端 Trace | CDN、网络 RTT、服务端渲染或数据查询 | TTFB 高不等于数据库查询慢 |
| LCP Resource Load Delay 高 | 请求 Start、Initiator、Resource Priority、HTML 资源发现 | 图片晚发现、客户端插入、优先级错配 | 不能断言图片文件过大 |
| LCP Resource Load Duration 高 | Response/Waiting、Transfer Size、下载耗时和 Cache | 带宽、文件尺寸、压缩、缓存或资源服务慢 | 不能断言所有时间都用在下载 |
| LCP Element Render Delay 高 | Main Thread、DOM 插入、CSS、Layout/Paint、Hydration | 资源已就绪但内容晚渲染 | 不能仅凭此阶段推断服务端慢 |
| INP Input Delay 高 | 输入时间线与同期 Main Thread Task | 页面其他 JS 抢占主线程 | 不能断言按钮事件函数执行慢 |
| INP Processing Duration 高 | Event Callback、Framework Profiler、JS Call Tree | 同步计算、重复更新、复杂事件处理 | 不能直接归因于 CSS Paint |
| INP Presentation Delay 高 | rAF、LoAF、Style/Layout/Paint | 组件提交/重布局/绘制成本 | 不能直接归因于 API 请求 |
| CLS 最大 Shift 窗口 | LayoutShift Entries、Sources、DOM/Style Mutation | 图片尺寸不确定、内容插入、字体替换 | 受影响元素未必就是根因 |
| Smoothness Work/Pre-layout 高 | LoAF、Task、Script Attribution、User Timing | 同步计算、rAF 更新、GC、框架提交 | 不能只凭 LoAF 证明具体函数有问题 |
| Paint/Composite/GPU 问题 | Rendering/Raster/GPU Track、帧录像 | 大量重绘、纹理传输、复杂图层 | 不能用 rAF FPS 精确衡量实际呈现 |

需要**同一时间窗口、同一页面实例**中的原始数据来支持归因。不同用户、不同页面状态的堆栈或网络请求只能提供候选规律，不能与单次异常简单拼接成同一条证据链。


**【网络分析需要区分请求发起晚、首字节等待和内容下载慢】**


Network Waterfall 不是只看请求的 Total Duration。至少检查：资源请求什么时候发起、是否存在 Redirect、连接建立与 TLS、Waiting (TTFB)、Content Download、是否命中缓存，以及资源的 Initiator 和 Priority。Chrome DevTools 的 Performance 和 Network 工具提供请求时间、优先级和执行时间的对应关系。[[46]](https://developer.chrome.com/docs/devtools/performance/reference/)

~~~text
发现关键资源获取较慢
      ↓
首先区分：请求开始时间是否晚？
  ├─ 是 → 请求发现/执行依赖/优先级/预加载时机
  └─ 否 → 已经及时发起
           ↓
       哪段网络工作耗时？
         ├─ Redirect / DNS / Connect / TLS → 路由与连接问题
         ├─ Waiting / First Byte → 服务器、CDN 与网络往返
         └─ Content Download → 实际字节量、带宽、传输与缓存
~~~

例如资源实际传输体积较大时，可以进一步比较浏览器提供的 transferSize、encodedBodySize 等（可得时）、资源格式、Content Download 与压缩策略；如果下载阶段并不慢，但请求要等较长时间才被发现，那么压缩这张图未必是主要优化方向。

“连接不稳定”也应有对应证据，如重复请求、错误、重新建连、超时或不同网络环境差异，不能从一条长请求的总耗时直接下结论。是否是服务器耗时，需要服务端相关日志或 Trace 与客户端时序结合验证。


**【主线程问题要落实到 Task、函数和组件更新范围】**


Input Delay 高、LoAF Work 高或 rAF Pre-layout 高时，先查看该时间段是否有 Long Task，或是否由多段较短 Task、框架提交与浏览器渲染工作共同造成长帧。之后进入 Call Tree、Bottom-up、LoAF Script Attribution、Source Map 和必要的业务 User Timing。

~~~text
结果指标异常
     ↓
定位主线程忙碌或长帧的时间范围
     ↓
定位对应 Task / Event Callback / rAF Callback
     ↓
归因到可解释的代码与组件
     ↓
判断同步工作是否真的必要？
   ├─ 非必要：删除、缓存、合并、取消过期任务
   ├─ 有必要但不紧急：异步调度、让出主线程、Worker（若适用）
   └─ 必须同帧完成：减少计算量、组件树和视觉更新范围
     ↓
重新观察该阶段时间及最终交互和帧结果
~~~

**减少 Long Task 是调度与主线程占用的优化，不等于所有渲染问题都必须先减少 Long Task。** Paint 或 GPU 很重时，JS 函数已经很短也可能掉帧；同样，拆分一个必须同步提交的图形更新，若改变内容一致性或不能实际让出执行机会，也未必有效。


**【浏览器渲染工作需要细分样式、布局、绘制和合成】**


在浏览器中，状态计算与 DOM 更新只是画面变化的上游。浏览器之后可能还要执行 Recalculate Style、Layout、Paint、Raster 和 Composite 等工作，其中部分可以按不同情况由不同线程承担。

| Trace 显示热点 | 重点检查的工作 | 对应的通用优化思路 |
| --- | --- | --- |
| Recalculate Style | 样式匹配与受影响节点范围 | 减少无意义样式变化、控制作用范围 |
| Layout / Forced Reflow | 几何重算、DOM 尺寸读写交错、复杂布局依赖 | 批量 DOM 读写、减少布局影响树 |
| Paint | 绘制区域、复杂阴影和效果、重复像素生成 | 缩小变化区域、缓存不会变化的内容 |
| Raster / Compositor / GPU | 图层、纹理、上传、复合与图形处理 | 合理复用资源、减少过度图层和无效绘制 |
| Framework Commit | 单次状态更新影响的组件数量 | 避免未变化的组件或数据反复更新 |

浏览器渲染阶段并非每帧都要完整执行。仅修改符合合成条件的 transform、opacity 等属性可能避免某些 Layout/Paint 工作，但过量图层仍可能占内存及合成预算。[[38]](https://web.dev/articles/rendering-performance)


**【内存问题还要区分高分配、无效保留与对象规模增长】**


“内存越来越大”不等于“GC 一定造成页面卡顿”。至少要考虑：

1. **Allocation Rate 过高**：高频创建临时对象，增加分配成本与可能的年轻代 GC 频率。
2. **Live Set 持续扩大**：大量对象一直被引用，GC 标记、复制、整理及引用维护可能更复杂。
3. **对象工作集合扩大**：每次更新都处理更多对象，使 JS、Style/Layout、Paint 成本增加，即使 GC 不明显也会卡顿。
4. **非 JS Heap 或设备内存压力**：DOM、图像、图形资源与系统内存管理可能参与性能退化。

Chrome 的 Memory 工具可使用 Allocation Sampling、Heap Snapshot 和 Retainers，结合 Performance Trace 中的 GC 工作与异常帧时间确定候选原因。没有 GC 与帧结果的相关证据时，不能因为 Heap Used 上升便宣布“GC 导致掉帧”。[[42]](https://developer.chrome.com/docs/devtools/memory-problems)

这一知识点的内存和 GC 机制详见 [Smoothness 的内存诊断章节](#6-smoothness-通过帧稳定性和-loaf-归因定位持续卡顿)。


### 【已证实的成本对应六大领域中的针对性优化技术】

优化前先明确减少的是等待、执行量、更新次数、传输字节还是图形工作。具体 API 机理就近转入六大领域正式通用文档，不用技术清单代替根因判断。


#### <u>1. 根因确认以后，按网络、资源、执行与渲染等层面选择优化措施</u>


> **阶段归因 → 六大优化领域**：[① 网络传输优化](./W-Web性能优化工程体系.md#2-网络传输优化降低连接往返和重复传输成本)、[② 服务端与数据交付优化](./W-Web性能优化工程体系.md#3-服务端与数据交付优化缩短内容生成和必要数据依赖)、[③ 资源加载优化](./W-Web性能优化工程体系.md#4-资源加载优化改变资源体积发现顺序和必要下载范围)、[④ JavaScript 与状态优化](./W-Web性能优化工程体系.md#5-javascript-与状态优化降低实际执行与对象管理成本)、[⑤ 任务调度与更新优化](./W-Web性能优化工程体系.md#6-任务调度与更新优化控制执行顺序更新频率和单次峰值)、[⑥ 浏览器渲染优化](./W-Web性能优化工程体系.md#7-浏览器渲染优化减少样式布局绘制合成与图形资源成本)。**证据与问题分类**：仅在证实主要成本之后进入优化领域，区分降低真实工作与仅推迟工作或转移成本。 **方案选择条件**：以下原文保留阶段定义、上位原因、API、具体优化、风险与验证；技术领域链接是待证实的候选方向，而不是指标异常的自动结论。



**【每一种优化都应明确改变哪个成本】**


| 已确认的瓶颈 | 对应优化 | 应该改善的直接证据 | 需检查的副作用 |
| --- | --- | --- | --- |
| 文档首字节交付慢 | 减少重定向、适当缓存、优化 CDN/服务器和 HTML 生成 | TTFB 及对应 Navigation Timing | 缓存一致性、个性化内容和资源开销 |
| LCP 资源发现晚 | 让关键资源在 HTML 中可发现、合适的 preload / priority | Resource Load Delay 和请求 Start | 过度抢占其他关键资源 |
| 资源传输过大 | 图片尺寸、编码格式、压缩、响应式资源、缓存与连接优化 | 资源传输字节、下载时间、LCP | 清晰度、解码成本和兼容性 |
| LCP 元素资源就绪但晚呈现 | 减少阻塞 CSS/JS、尽早生成关键内容、优化 Hydration | Element Render Delay、实际 LCP | SSR/CSR 复杂度与其他交互 |
| 输入等待长 | 减少无关长任务、合理调度工作、主线程让步 | Input Delay、Long Task、INP | 任务总完成时间、优先级公平 |
| 事件处理长 | 缩短同步处理、减少重复状态更新、取消无效任务 | Processing Duration、INP | 反馈和业务状态正确性 |
| 下一帧等待长 | 缩小 DOM/组件提交范围、优化 Layout/Paint | Presentation Delay、INP | 布局行为和视觉完整性 |
| CLS 大偏移 | 提前确定媒体尺寸、预留异步内容空间、稳定字体与动态插入 | 最大 Shift Window、CLS | 初始占位与真实内容差异 |
| 动画回调或单次同步更新过重 | 删除重复计算、缓存、控制每次处理量、适当合并更新 | Pre-layout、Frame Interval P95 | 合并过多会增加单次峰值 |
| Paint / GPU 成本高 | 缩小重绘范围、按需处理、复用资源、合理图层与画质 | Paint/Raster/GPU 与真实帧结果 | 显存、视觉质量和管理复杂度 |
| GC 或长期对象增长 | 减少无必要分配、及时清理引用、控制驻留与工作集合 | GC、Allocation、CPU、Frame P95 | 不可变状态与资源生命周期约束 |

例如：拆分一个 100ms 的长任务能让主线程在任务间隙处理更高优先级工作，但不一定降低总 CPU 使用量；增量更新能减少反复处理未变化数据的成本，但必须由对应框架和图形 API 支持；批处理能减少固定更新开销，却可能放大单次工作峰值。应同时关注**总成本、单次峰值和重要视觉更新截止时间**，不能简单地认为某个优化手段越多越好。


**【优化的终点不是某个诊断指标下降，而是用户结果改善】**


性能成本可能从一个阶段转移到另一个阶段。例如主图提前下载后，若页面仍等客户端脚本执行后才创建 DOM，原本的 Resource Load Delay 下降了，Element Render Delay 却可能增加；LCP 总结果不一定变好。

类似地：减少同步 JS 处理却引入很多额外异步提交，INP 的 Processing Duration 可能缩短，但 Presentation Delay 可能增长；缩小 Paint 成本却创建过多 GPU 图层，则可能带来其他图形资源压力。

因此选定优化以后，必须同时验证：
- 对应原始瓶颈是否真的下降；
- 最终 LCP/INP/CLS/Frame 结果是否改善；
- 是否造成其他体验、功能和资源使用回归。


### 【完整 LCP 回归实例证明如何从结果走到资源发现问题】


#### <u>1. 通过完整案例验证从 LCP 回归到资源优化的判断过程</u>



**【第一步：确认新版移动端首页发生了可比的 LCP 回归】**


假设监控发现一次网站发布后，首页移动端 LCP P75 明显变慢（以下为虚构数据）：

| 维度 | 基线版本 | 新版本 |
| --- | --- | --- |
| Route | 首页 / | 首页 / |
| 设备 | Mobile | Mobile |
| 导航 | 硬导航 | 硬导航 |
| LCP P75 | 1.95s | 3.07s |
| 回归幅度 | — | +1.12s |

必须先核对两组访问的采集规则、浏览器分布、网络和缓存条件、样本量以及发布时间。如果新版本的移动端访问大部分来自更慢的网络，那么“版本导致回归”的假设还不能成立。

在确认归因口径一致、环境具有可比性后，再筛选新版和基线版中具有代表性的具体访问与时间线。


**【第二步：按 LCP 四阶段寻找主要变化，而不是直接开始改图片大小】**


假设两次具有可比条件的代表性访问，其四段耗时如下：

| LCP 阶段 | 基线访问示例 | 新版访问示例 | 变化 |
| --- | ---: | ---: | ---: |
| TTFB | 0.50s | 0.52s | +0.02s |
| Resource Load Delay | 0.15s | 1.25s | +1.10s |
| Resource Load Duration | 0.85s | 0.84s | -0.01s |
| Element Render Delay | 0.45s | 0.46s | +0.01s |
| **单次四段合计** | **1.95s** | **3.07s** | **+1.12s** |

**注意统计口径：**此表是单次访问或具体可比样本的示意分解，不能将四个阶段各自的 P75 相加声称得到整体 LCP P75。上一个表的版本聚合 P75 与这里的具体访问时间分段，是两个需要区分的数据层级；相同数字只是便于演示。

在这一示例中，主要增加的时间集中在 **Resource Load Delay**，说明浏览器并未及时开始加载最终 LCP 资源。当前最优先的调查方向不是文件下载带宽，而是**资源发现与请求调度**。


**【第三步：在 Network 中确认请求为什么晚发起，并回到源码】**


需要找出新版真正的 LCP 元素和对应请求，检查：

~~~text
主 HTML 首字节到达时刻：两版本相近
                  ↓
最终 LCP 资源请求开始时刻：新版明显更晚
                  ↓
Network Initiator：谁触发了关键资源请求？
                  ↓
主 HTML 中能否发现该资源？是否需要等待 JS 执行？
                  ↓
资源的 Priority、是否被 CSS/框架状态延后？
                  ↓
检查与该请求相关的本次发布代码
                  ↓
形成候选根因：新版改变了关键资源的发现时机
~~~

例如基线版在 HTML 中就有关键图片，新版本改为客户端组件执行一段逻辑后才插入该图片。若 Network Initiator、HTML 结构与源码变更都支持这一时序，便可以形成“图片请求发现太晚”的候选根因。

但如果请求实际上很早发起，且 Time Waiting/Content Download 的结果与分段报告不一致，那么应先检查资源归因或测量条件，而不是为维护最初猜测而强行修改代码。


**【第四步：选择资源发现优化，而不是从无关技术手段入手】**


假设根因得到确认，可考虑使必要关键资源在初始 HTML 中更早可被浏览器发现、避免不必要的客户端计算依赖，并为确实重要的资源设置适当加载优先级或预加载策略。

本例并不首先支持“压缩图片解决回归”，因为 Resource Load Duration 基本稳定；也不支持“优化服务端 SQL 解决回归”，因为 TTFB 基本稳定。它们可以有其他价值，但不是本次回归的首要证据支持方向。


**【第五步：复测资源时间线与最终 LCP，并防止成本转移】**


优化后，应比较：

1. 关键图片请求 Start Time 是否前移，Initiator 是否符合预期。
2. Resource Load Delay 是否明显下降。
3. LCP 的单次测试和同群体 RUM 是否同步改善。
4. 图片质量、缓存行为、其他资源优先级以及 INP/CLS 是否受损。
5. 灰度与正式发布后回归幅度是否持续稳定。

如果资源提前下载了，但页面依然在客户端 Hydration 完成后才将元素插入 DOM，那么 Resource Load Delay 的改善可能被 Element Render Delay 增长抵消。**最终验收对象仍然是用户看到主要内容的时刻，而不是某个子阶段单独下降。**[[3]](https://web.dev/articles/optimize-lcp)


**【同一套方法对 INP、CLS 和 Smoothness 也成立】**


下面三个案例只展示**如何迁移通用判断流程**，具体机制由专项文档维护：

| 用户结果异常 | 第一层归因 | 继续确认的执行证据 | 对应优化与验证 |
| --- | --- | --- | --- |
| 某路由上的特定点击 INP 增长 | Processing Duration 占主要增量 | Call Tree 显示事件处理同步执行重复筛选与大范围组件更新 | 缩短事件路径、减少重复更新，复测 Processing Duration 与最终 INP |
| 某版本 CLS 上升 | 最大 Session Window 中正文被向下推移 | Shift Sources 指向被推动的正文；DOM Trace 显示顶部新内容未预留空间 | 给上游异步模块稳定的占位，复测窗口 Score 与最终 CLS |
| 某设备的连续动画顿挫 | Frame Interval P95 和 LoAF Pre-layout 明显增加 | rAF 内重复计算和同步视图提交占用时间；排除 GPU/GC 其他候选 | 减少单帧同步工作或重复提交，复测长帧分段和真实视觉效果 |

这里的三条是典型**假设和证据的组合**，不代表看到某个阶段变长就能直接宣布根因。所有优化仍要通过目标设备与相同工作负载下的对照证实。


### 【受控实验、真实用户验证与监控数据归属】


#### <u>1. 实验室定位与线上真实用户验收共同构成优化闭环</u>



**【Lab 负责证明原因，Field 负责确认用户受益】**


| 层次 | 解决的问题 | 推荐数据和方法 |
| --- | --- | --- |
| Lab（实验室） | 某一段工作到底为什么慢？ | 固定设备、网络、缓存、页面操作，录制 Network、Performance、Memory、画面 |
| 控制实验或灰度 | 改动是否确实降低既定瓶颈，而非环境变化？ | 同样条件对照、单变量变化、记录可重复结果 |
| Field（真实用户） | 真实用户的异常比例和 P75 是否改善？ | Version / Route / Device / Browser 等同口径分群 |
| 功能与体验验收 | 更快是否影响操作、画质与业务正确性？ | 交互回归、视觉验证、错误率、其他 CWV 和业务行为 |

Lighthouse 或一次本地 Trace 只能帮助寻找候选原因，不应代替持续的真实访问分布监控。Field 数据也不能替代 Trace 中的函数调用和网络请求细节；它们作用不同但应能通过上下文衔接。


**【每一次优化必须明确可证伪的假设】**


适合沉淀的记录不是“使用了懒加载，性能提升”，而是：

~~~text
异常身份：
  Version + Route + Device + Navigation / Interaction + 时间窗口

现象：
  LCP / INP / CLS / Frame 的哪个结果恶化？幅度与样本量是多少？

阶段：
  哪一段增长？哪一个偏移窗口、交互或长帧受影响？

证据：
  对应 Network / Task / Layout / Paint / GC 发生了什么？

根因假设：
  为什么这项工作会导致这次异常？有哪些备选原因？

操作：
  修改哪一项工作？预期哪个阶段成本下降？

验证：
  相同条件的阶段、最终指标、功能及其他指标如何变化？

结论：
  因果得到支持 / 暂无充分证据 / 继续调查其他分支
~~~

比如减少 Resource Load Delay 后发现 LCP 并未变化，就不能只引用“Request Start 变早”宣布成功，应继续检查 Element Render Delay。与此类似，单纯降低 Heap 或提升 FPS 平均值，也不一定解决用户真正感到的停顿。


**【监控 SDK 的角色是贯穿上下文与证据，而不是重做全部测量算法】**


采集层建议分离：

~~~text
Metric Result：最终或更新中的指标结果
      +
Attribution：对应的阶段、关键资源、交互或长帧
      +
Context：发布、路由、设备、生命周期、采样能力
      +
Correlation：页面实例 / 指标实例 / 事件时间 / Trace 或操作标识
      ↓
过滤、采样、脱敏、组批上报
      ↓
服务端按访问与指标实例聚合，不重复累计回调
      ↓
按版本和页面维度发现与复盘性能回归
~~~

浏览器原始 Entry、官方 web-vitals 指标实现与业务埋点不是同一层。LCP/INP/CLS 的页面级计算要遵循相应生命周期，不能把每次归因回调当成一位独立用户；LoAF 是长帧事件而不是页面唯一指标，rAF Frame Interval 则是窗口统计。业务 SDK 负责规范数据格式与上下文、时间关联，不应重新发明不必要的官方指标计算。

同时还要注意采集行为本身可能占用主线程：不要每帧序列化大型对象、打印日志、读取布局或立即发送网络请求；对敏感 URL、脚本归因、选择器和用户相关字段做过滤或脱敏，对 API 不支持与样本缺失显式记录。[[4]](https://github.com/GoogleChrome/web-vitals)


**【发布回归检测不能只盯一个结果指标】**


若某项修复改善 LCP，却令 INP 变差，可能只是将开销从初次加载转移到了后续交互。若减少主线程 Paint，却增加 GPU 内存和合成压力，也可能在其他设备引发新问题。

因此必须明确：

- **主结果指标**：本次异常的目标是否改善？
- **阶段证据**：此前定位到的瓶颈是否降低？
- **用户群体**：目标设备、路由与版本分群是否改善？
- **交叉回归**：其他三类体验、功能正确性、资源和内存是否保持可接受？
- **持续监控**：下一次发布是否能够更早发现同类回归？

性能优化的工程目标是获得**可解释、可复现、可验证的用户体验改善**，而不是积累一组不指向根因的技术清单。


### 【现有用户体验和监控专项的衔接边界】


#### <u>1. 本章作为四类性能专项的统一诊断入口</u>


本篇第 3～6 章已分别保留四类专项的计算细节、诊断证据与完整案例；本章只抽取它们共同的证据判断与因果验证机制，回答“指标恶化后如何确认技术根因，并连接优化方案”。

- [Loading / LCP 四阶段性能诊断与优化体系](#3-loading-通过-lcp-四阶段归因定位关键内容出现延迟)：加载期四段与关键资源证据。
- [Responsiveness / INP 三阶段交互响应性能诊断与优化体系](#4-responsiveness-通过-inp-三阶段归因定位交互反馈延迟)：输入、处理、呈现与交互对象归因。
- [Visual Stability / CLS 视觉稳定性诊断与优化体系](#5-visual-stability-通过-cls-计分与布局根因定位页面跳动)：最大 Session Window、Shift Sources 与根因。
- [Smoothness 持续渲染流畅度诊断体系](#6-smoothness-通过帧稳定性和-loaf-归因定位持续卡顿)：Frame Interval、LoAF 时间区间、GC 与渲染瓶颈。

本篇承担四类性能指标的正式诊断主入口；[Web 性能优化完整知识体系](./W-Web性能优化完整知识体系.md) 保留端到端性能背景，[Web 性能优化工程体系](./W-Web性能优化工程体系.md) 承担六大优化技术机制主入口，[性能测量与真实用户监控专项](./X-性能测量与真实用户监控专项.md) 承担测量采集与 RUM 数据体系。


## 8. 参考文献


1. Google / web.dev. [Towards an animation smoothness metric](https://web.dev/articles/smoothness). FPS、帧节奏与持续视觉更新边界。
2. Google / web.dev. [Largest Contentful Paint (LCP)](https://web.dev/articles/lcp). Core Web Vitals 的 LCP 含义、阈值与测量边界。
3. Google / web.dev. [Optimize Largest Contentful Paint](https://web.dev/articles/optimize-lcp). LCP 四阶段与资源发现、获取、渲染的关系。
4. GoogleChrome. [web-vitals](https://github.com/GoogleChrome/web-vitals). 指标实现与原始 Entry/Attribution 的关系。
5. Chrome for Developers. [Measuring soft navigations](https://developer.chrome.com/docs/web-platform/soft-navigations). Chrome 151 以后的 SPA 软导航测量。
6. Nuxt. [ClientOnly](https://nuxt.com/docs/4.x/api/components/client-only). 客户端专用组件与服务端 fallback。
7. Google / web.dev. [User-centric performance metrics](https://web.dev/articles/user-centric-performance-metrics). 用户体验维度与 FCP、LCP 的含义。
8. MDN. [PerformanceNavigationTiming](https://developer.mozilla.org/en-US/docs/Web/API/PerformanceNavigationTiming). 主文档导航计时与字段。
9. MDN. [PerformanceResourceTiming.serverTiming](https://developer.mozilla.org/en-US/docs/Web/API/PerformanceResourceTiming/serverTiming). 服务端计时信息的浏览器入口。
10. MDN. [PerformanceResourceTiming](https://developer.mozilla.org/en-US/docs/Web/API/PerformanceResourceTiming). 资源时序、大小和跨源限制。
11. MDN. [PerformanceResourceTiming.fetchStart](https://developer.mozilla.org/en-US/docs/Web/API/PerformanceResourceTiming/fetchStart). 资源获取起点与 startTime 的区别。
12. MDN. [PerformanceResourceTiming.transferSize](https://developer.mozilla.org/en-US/docs/Web/API/PerformanceResourceTiming/transferSize). 字节数、缓存和跨源限制。
13. Google / web.dev. [Common misconceptions about optimizing LCP](https://web.dev/blog/common-misconceptions-lcp). 图片下载并非唯一瓶颈与阶段成本转移。
14. MDN. [PerformanceObserver.observe](https://developer.mozilla.org/en-US/docs/Web/API/PerformanceObserver/observe). Buffered 与观察器配置。
15. Google / web.dev. [Web Vitals field measurement best practices](https://web.dev/articles/vitals-field-measurement-best-practices). 线上真实用户采集、分群、归因与验证。
16. Google / web.dev. [Interaction to Next Paint (INP)](https://web.dev/articles/inp). INP 定义、交互规则、阈值与页面生命周期。
17. MDN. [PerformanceEventTiming.interactionId](https://developer.mozilla.org/en-US/docs/Web/API/PerformanceEventTiming/interactionId). 事件与逻辑交互的关联。
18. GoogleChrome. [InteractionManager.ts](https://github.com/GoogleChrome/web-vitals/blob/main/src/lib/InteractionManager.ts). interactionId 归组、慢交互候选与按交互总数选择 INP。
19. MDN. [PerformanceEventTiming](https://developer.mozilla.org/en-US/docs/Web/API/PerformanceEventTiming). 原始 Event Timing 字段、观察阈值与计算示例。
20. GoogleChrome. [onINP.ts](https://github.com/GoogleChrome/web-vitals/blob/main/src/onINP.ts). Event Timing 观察阈值、候选更新、hidden 与软导航报告时机。
21. Google / web.dev. [Optimize input delay](https://web.dev/articles/optimize-input-delay). 输入等待的主线程竞争原因与优化。
22. Chrome for Developers. [Long Animation Frames API](https://developer.chrome.com/docs/web-platform/long-animation-frames). Work/Render/Pre-layout、Script Attribution 和 50ms 门槛。
23. Google / web.dev. [Optimize Interaction to Next Paint](https://web.dev/articles/optimize-inp). Input Delay、Processing Duration、Presentation Delay。
24. Google / web.dev. [Optimize long tasks](https://web.dev/articles/optimize-long-tasks). 主线程长任务、任务拆分与调度让步。
25. GoogleChrome. [attribution/onINP.ts](https://github.com/GoogleChrome/web-vitals/blob/main/src/attribution/onINP.ts). INP 的帧级 Event 关联、三阶段归因和计时边界。
26. GoogleChrome. [bindReporter.ts](https://github.com/GoogleChrome/web-vitals/blob/main/src/lib/bindReporter.ts). reportAllChanges、forceReport、delta 与去重机制。
27. Google / web.dev. [Cumulative Layout Shift](https://web.dev/articles/cls). Session Window、CLS 和用户输入边界。
28. MDN. [LayoutShift](https://developer.mozilla.org/en-US/docs/Web/API/LayoutShift). Layout Shift Entry 的原始字段、计时与观察接口。
29. GoogleChrome / web-vitals. [LayoutShiftManager.ts](https://github.com/GoogleChrome/web-vitals/blob/main/src/lib/LayoutShiftManager.ts). 非预期位移过滤及 1s/5s Session Window 的计算实现。
30. MDN. [LayoutShift.hadRecentInput](https://developer.mozilla.org/en-US/docs/Web/API/LayoutShift/hadRecentInput). 近期离散用户输入的排除条件。
31. Google / web.dev. [Optimize Cumulative Layout Shift](https://web.dev/articles/optimize-cls). 典型 CLS 根因、资源尺寸、异步嵌入、字体与动画、加载后位移排查。
32. Chrome for Developers. [Layout shift culprits](https://developer.chrome.com/docs/performance/insights/cls-culprit). 布局位移受影响元素、DevTools 诊断与根因猜测限制。
33. MDN. [LayoutShift.sources](https://developer.mozilla.org/en-US/docs/Web/API/LayoutShift/sources). 单次 Layout Shift 最多暴露五个受影响元素的归因限制。
34. MDN. [LayoutShiftAttribution](https://developer.mozilla.org/en-US/docs/Web/API/LayoutShiftAttribution). node、previousRect 和 currentRect 的位置归因。
35. GoogleChrome / web-vitals. [CLSAttribution](https://github.com/GoogleChrome/web-vitals/blob/main/src/types/cls.ts). 最大 Shift 的归因类型。
36. GoogleChrome / web-vitals. [attribution/onCLS.ts](https://github.com/GoogleChrome/web-vitals/blob/main/src/attribution/onCLS.ts). 最大单次 Shift、受影响元素和 Attribution 计算。
37. GoogleChrome / web-vitals. [onCLS.ts](https://github.com/GoogleChrome/web-vitals/blob/main/src/onCLS.ts). 指标更新、reportAllChanges、hidden、BFCache 和支持的 Soft Navigation。
38. Google / web.dev. [Rendering performance](https://web.dev/articles/rendering-performance). Frame Budget、Style/Layout/Paint/Composite。
39. MDN. [requestAnimationFrame](https://developer.mozilla.org/en-US/docs/Web/API/Window/requestAnimationFrame). rAF 时间戳、刷新率与后台暂停。
40. W3C. [Long Animation Frames API Working Draft](https://www.w3.org/TR/long-animation-frames/). Long Animation Frames 标准草案。
41. V8. [Trash talk: the Orinoco garbage collector](https://v8.dev/blog/trash-talk). 分代、增量、并发 GC 与主线程暂停。
42. Chrome for Developers. [Fix memory problems](https://developer.chrome.com/docs/devtools/memory-problems). Heap、Allocation Sampling、Retainers。
43. V8. [Orinoco: young generation garbage collection](https://v8.dev/blog/orinoco-parallel-scavenger). Young Generation、Scavenger、存活对象复制与回收。
44. V8. [Concurrent marking in V8](https://v8.dev/blog/concurrent-marking). 增量和并发标记、主线程暂停与内存压力。
45. Google / web.dev. [Debug layout shifts](https://web.dev/articles/debug-layout-shifts). LayoutShift.sources 与真正的上游原因。
46. Chrome for Developers. [Performance panel reference](https://developer.chrome.com/docs/devtools/performance/reference/). Network、Task、Rendering 和执行证据。
47. Chrome for Developers. [INP breakdown](https://developer.chrome.com/docs/performance/insights/inp-breakdown). DevTools 三阶段诊断。
48. Google / web.dev. [Find slow interactions in the field](https://web.dev/articles/find-slow-interactions-in-the-field). 在线上收集慢交互归因。
