# Visual Stability 视觉稳定性：CLS 布局偏移诊断与优化体系（草稿）

> 草稿状态：独立讨论稿，暂不写入知识体系索引、QA 或正式知识正文。本稿所有时间、版本号、测试用例和数值仅用于解释方法，不代表某个项目已验证的结果。
>
> 主线：Visual Stability（视觉稳定性）→ CLS（Cumulative Layout Shift，累积布局偏移）→ 最大 Session Window（会话窗口）→ Layout Shift Entry（原始偏移记录）→ Shift Sources（受影响元素）→ Root Cause（布局变化根因）→ 优化方案与验证。
>
> 目标：保留指标机制、计算口径、问题分类、定位证据、工程取舍、API 与 RUM 设计，形成与 Loading/LCP、Responsiveness/INP 两篇草稿并列的完整知识结构。

> **统一性能异常诊断入口**：发现某项 Web 性能指标回归后，先按版本、页面、设备和时间建立上下文，再按结果→阶段→证据→根因→优化→验收进行分析。完整共用方法参见 [Web 性能异常定位与优化完整方法（草稿）](./Web性能异常定位与优化完整方法-草稿.md)；本文只负责Visual Stability 的偏移归因机制的深入解释。

## 1. 视觉稳定性应从用户看到的“位置突变”理解

### 【Visual Stability 与 Loading、Responsiveness 的关注对象不同】

页面打开以后，用户可能很快就看到主要内容，点击反馈也比较及时，但仍然遇到一种明显的体验问题：原本已经显示的标题、正文、图片和按钮突然改变位置，使阅读位置丢失，甚至使用户点击了错误目标。

例如文章在第一帧就显示了正文，但 1 秒后顶部 Banner 加载完成，正文突然被向下推开；又例如用户正准备点击“取消”，顶部插入通知导致“取消”和“确认”的位置变化。这不是单纯的加载等待，也不是点击处理延迟，而是**已经可见的页面布局不稳定**。[[1]](https://web.dev/articles/cls)

| 用户体验 | 核心问题 | 结果指标 |
| --- | --- | --- |
| Loading | 用户何时看到主要内容？ | LCP |
| Responsiveness | 用户操作后何时获得下一帧响应？ | INP |
| Visual Stability | 已显示的内容是否发生用户未预期的位置变化？ | CLS |
| Smoothness | 动画、滚动和连续视觉更新是否稳定？ | 依业务定义 Frame/LoAF 等 |

CLS 专门衡量**非预期布局位移**，并不是所有视觉效果的稳定性统统由 CLS 覆盖。某些 transform 动画可能不会贡献 CLS，却仍可能令用户感觉突兀；这时要同时考虑视觉设计和连续渲染流畅度。

### 【CLS 是无单位的结果得分，不是布局处理耗时】

Google Core Web Vitals 的 CLS 评价区间：

- ≤0.1：良好；
- >0.1 且 ≤0.25：需要改进；
- >0.25：较差。

统计时以真实页面访问作为样本，通常观察移动端、桌面端分别计算的 P75。CLS 没有毫秒单位，值 0.15 不能读作“用了 0.15 秒完成布局”。[[1]](https://web.dev/articles/cls)

浏览器记录的布局偏移可以发生在整个页面生命周期中，加载结束后、滚动过程中、客户端路由切换后或长期运行时都可能出现。仅凭初始页面的 Lighthouse 测试，不能证明整个访问期间没有 CLS。

### 【两条主线共同形成完整诊断】

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

## 2. 单次 Layout Shift 以影响面积和移动距离共同计分

### 【渲染帧、视口与 Session Window 是三个不同的概念】

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

例如一个广告容器突然变高，将标题、正文和按钮一起向下推。在这次布局更新里，三个元素可能共同贡献到**一个** Layout Shift Score，不能把“文章标题移动 0.05、正文移动 0.08、按钮移动 0.04”简单当成三个独立 Shift 再相加。只有浏览器真正提供了不同的 Shift Entry，才按会话窗口规则累加每条 Entry.value。[[1]](https://web.dev/articles/cls)

因此用户所说的“每秒最大偏移量”不属于 CLS 的算法；真正的计算周期由**实际发生的布局变化**触发，而不是每秒定时扫描全页面。

### 【Layout Shift 的成立条件是已有可见元素的布局位置改变】

根据 Layout Instability API，某个元素在相邻两个渲染帧中，若它在视口内可见部分的起始位置发生变化，就可能成为 Unstable Element（不稳定元素），浏览器为该帧产生 Layout Shift 记录。[[1]](https://web.dev/articles/cls) [[3]](https://developer.mozilla.org/en-US/docs/Web/API/LayoutShift)

需要区分以下四种情况：

1. **原有元素移动**：页面正文原本从 y=200px 开始，后来变为 y=330px，属于候选布局偏移。
2. **新元素首次插入**：新 Banner 从无到有，不一定因为“它自己出现”就产生偏移；但是它把下方已有正文推开时，原有正文产生位移。
3. **元素尺寸变化但起始位置不变**：某个容器自己变高，不代表它自己改变了起始位置；如果下方元素跟着移动，下方元素可能成为 sources。
4. **纯 transform 视觉移动**：使用 translate 等方式移动显示位置通常不触发布局偏移计分，因为它不改变布局位置；但它依然可能不符合用户体验期待。

这一组边界决定了后续诊断最重要的认知：**Layout Shift Sources 很可能只是“被推动的元素”，而不是导致它移动的根因元素。**

### 【单次得分由 Impact Fraction 和 Distance Fraction 相乘】

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

一个元素只移动了少量像素，不代表最终分数一定很低；还要结合它影响的可见面积。反过来，用户主观感觉的“跳动很厉害”也不能直接折算成某个毫秒值。[[1]](https://web.dev/articles/cls)

### 【CLS 与 Layout / Paint 耗时不是同类数据】

Style、Layout、Paint 的耗时属于渲染执行成本，影响 LCP、INP 或连续渲染；CLS 关注的是**布局的位置结果**。页面可能执行了昂贵的 Layout 但没有改变可见元素起始位置，因此不一定产生高 CLS；也可能在一段很短的 DOM 更新中把一大块正文推开，产生高 CLS。

因此 Long Task、LoAF、Style/Layout Trace 是补充根因的证据，不直接参与 CLS 的数学公式。

## 3. Session Window 决定哪些 Shift 相加以及页面最终 CLS

### 【先过滤近期输入，再按连续时间聚合】

当前 CLS 使用 Session Window（会话窗口）：相邻有效偏移的间隔小于 **1 秒**，且当前窗口第一条到新偏移的跨度小于 **5 秒**，才归入同一窗口；否则开启下一个窗口。每个窗口将内部 Shift.value 累加，整次访问取**窗口分数最大值**。[[1]](https://web.dev/articles/cls) [[4]](https://github.com/GoogleChrome/web-vitals/blob/main/src/lib/LayoutShiftManager.ts)

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

### 【一秒是相邻偏移的分组间隔，不是固定采样周期】

假设浏览器在 0.20s、0.70s、1.30s 连续检测到三个有效 Layout Shift，这三个时刻可以进入同一窗口，因为相邻间隔分别是 0.50s 和 0.60s，且总时长不到 5 秒。假设下一个有效 Shift 在 4.00s，距离上一条已经超过 1 秒，则开始新的窗口。整个过程中并不存在“在 0～1 秒、1～2 秒分别求一次最大分数”的操作。[[1]](https://web.dev/articles/cls)

对于同一窗口，**既不是每秒保留最大的一条，也不是只计每次偏移中移动最远的那个元素**。移动最远的元素用于定义单条位移的 Distance Fraction，但一条 Shift 的影响区域还包括该帧其他不稳定元素的可见范围；窗口得分则需要累计**每一次有效 Shift Entry 的 value**。

窗口可以从任意时间点的 Shift 开始，不要求起点是 0s、1s、2s 的整数秒。1 秒和 5 秒是为了**判断是否续接当前窗口**的两个上限，不能被误当成测量 FPS、每秒位移峰值或页面截图周期。

### 【完整数字示例：选择最大窗口而不是全部求和】

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

### 【最大窗口不表示其他时间没有发生问题】

CLS 选最大累计窗口，是为了表征最严重的一组连续布局变化，对长驻 SPA 和无限滚动更合理。另一窗口的位移即使没有计入最终结果，也可能影响用户体验；需要业务专用的诊断明细时可以补充统计 Shift 分布，但不能把自定义总分冒充标准 CLS。

与 INP 候选可能因交互总数规则降低不同，**同一个普通 CLS 测量周期内，页面 CLS 是已经观察到的最大窗口分数，通常只会保持不变或上升**。某个新窗口较小不会把历史最大值覆盖掉。

## 4. hadRecentInput 是非预期布局偏移的计分排除规则

### 【离散用户输入后 500ms 内的 Shift 通常被排除】

用户主动点击“展开更多”并立即看到内容展开，一般能预期下面的内容发生变化。浏览器 LayoutShift Entry 通过 hadRecentInput 判断近期是否发生符合条件的离散输入；当其为 true 时，标准 CLS 计算跳过这条 Shift。官方规则使用大约 500ms 的近期输入窗口；点击、触摸和按键通常符合，滚动、拖拽和缩放等连续输入不自动获得同样的排除。[[1]](https://web.dev/articles/cls) [[5]](https://developer.mozilla.org/en-US/docs/Web/API/LayoutShift/hadRecentInput)

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

### 【异步网络请求之后才插入内容，仍然可能产生 CLS】

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

这说明 CLS 优化需要提前**建立空间预期**：点击后可以立即预留合适的列表区域、展示尺寸稳定的 Skeleton，或将新内容插入不会推动现有阅读位置的区域。若业务更适合让用户主动接受新内容，可以提示“有新内容”而不是直接把当前列表推开。[[2]](https://web.dev/articles/optimize-cls)

### 【指标豁免不等于用户必然能预期】

hadRecentInput 只是一条启发式时间规则：某次 Shift 恰好在点击后 500ms 内发生，并不证明这个偏移就是点击引起，也不证明用户觉得合理。不能故意依赖豁免制造布局跳动。同样，某个用户主动等待的结果超过 500ms 才出现，也可能进入 CLS。因此优化目标始终是稳定体验，而非只想办法避开计分。

另外，鼠标 hover、连续滚动时异步内容造成的偏移不能简单按“用户有操作”排除。

## 5. CLS 常见根因应先按空间约束与内容变化分类

### 【完整原因分类与技术治理关系】

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

## 6. 媒体资源与嵌入内容需要在加载之前确定布局空间

### 【图片缺少宽高，加载完成后才确定高度】

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

**优化方向**：按真实素材比例设置 width 和 height，或给媒体容器声明 aspect-ratio。在响应式布局中，图片实际宽度可以随容器缩放，浏览器仍可提前算出所需高度。[[2]](https://web.dev/articles/optimize-cls)

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

### 【广告、iframe 和第三方 Widget 没有确定高度】

第三方广告或外部嵌入在页面初始渲染时可能尚不知道最终大小。广告返回以后若把一个高度为 0 的容器扩展为 250px，下面已显示的内容就会被推开。嵌入式视频、地图和社交内容具有同样的机制。

**证据**：受影响元素都在第三方容器下方；Shift 与 iframe 插入、广告响应或容器尺寸变化对应。

**优化方向**：对第三方 Slot 建立合理的空间契约，例如固定尺寸、已知断点下的不同比例、min-height 或允许的尺寸档位；限制加载后反复扩张。未知尺寸时按实际业务权衡预留空间的范围，并处理广告最终未返回时如何回收空白。

**工程取舍**：过大预留空间可能影响内容密度和商业展示，第三方 iframe 内部的位移也未必能被父文档 SDK 完整观察。宿主通常需要优先保证宿主容器的几何稳定，再辅以第三方侧的排查。[[2]](https://web.dev/articles/optimize-cls)

## 7. 动态内容的插入和替换应保证用户当前阅读位置不突然变化

### 【顶部 Banner、公告、推荐内容晚插入】

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

### 【Skeleton 与真实内容高度不一致】

骨架屏不是天然的 CLS 优化。若骨架高度 120px，实际数据卡片高度 340px，最终替换时仍会把后续区域推开 220px。

**优化方向**：让骨架与真实内容的主要几何结构、图片比例、文本行数和响应式断点一致；无法准确预知时，可采用适当 min-height、尺寸区间、局部滚动容器、分块稳定更新或骨架内容渐进填充。

**边界**：min-height 只是最小高度，不是保证不会扩张；长文本、多语言和窄屏仍可能超出。不能通过粗暴隐藏业务内容来追求零 CLS。

### 【列表追加、刷新、排序或实时消息改变既有项位置】

例如无限滚动中，用户阅读第 20 条内容，前面突然插入 3 条未读消息；或者实时数据到达后重新排序排行榜。原有列表项下移，即使数据是正确的，也会打断阅读。

**优化方向**：稳定可视列表项的几何位置；动态插入采用确定时机、视口锚点策略或新内容提示；对可滚动区域进行合理隔离、列表行高约束和增量更新。

**边界**：浏览器 Scroll Anchoring 有助于减轻部分滚动位移，但不能作为整个列表没有布局变动的证明。实时页面还需将“新数据何时进来”和“什么时候改变当前用户的阅读位置”区分决策。

## 8. 字体、响应式样式与 Hydration 是文本及组件位置变化的另一条主线

### 【Web Font 替换导致文字宽度与换行变化】

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

**优化方向**：使用与 Web Font 度量更接近的 Fallback Font；可按需采用 size-adjust、ascent-override、descent-override、line-gap-override 缩小差异；评估 font-display: optional 或在合理情况下提前获取关键字体。[[2]](https://web.dev/articles/optimize-cls)

**取舍**：font-display: swap 有利于及时显示文字，却可能在换字体时重新排版；font-display: optional 可减少某些切换导致的 Shift，但会改变用户看到目标字体的机会。预加载字体也可能和首屏 LCP 资源竞争带宽。因此应同时验证 FCP/LCP、CLS 和品牌字体要求。

### 【文本内容与样式在首帧以后发生重大变化】

SSR HTML 先输出一种文本、样式或组件结构，Hydration 后客户端恢复真实业务状态时替换成不同内容，可能使页面发生位移。CSR 的异步数据到达、i18n 长短文本切换、响应式断点逻辑晚生效，也具有类似机制。

**证据**：Shift 与客户端数据回填、DOM 替换、动态 Class、生效的 CSS 或字体/语言切换时间相邻。需要检查旧/新内容的宽高与布局约束，而不是只用“Hydration 慢”概括。

**优化方向**：保证服务端和客户端首屏关键布局的几何一致；对 ClientOnly 或必须客户端计算的区域预留可预测空间；异步长文本避免突然推开用户正在阅读的内容。

**边界**：SSR 不自动保证低 CLS；服务端完整输出了内容也可能因为媒体尺寸、字体或水合后的更新而跳动。CSR 若一次性在首次绘制之前准备好稳定布局，也可能具有较低 CLS，但可能牺牲 LCP。

## 9. CSS 和动画问题应根据是否改变布局位置来处理

### 【直接更改布局相关属性可能推动其他已显示内容】

如果应用代码在非预期时修改 width、height、padding、margin、top、left、Grid/Flex 布局参数或动态增删类名，可能触发原有可见元素位置变化。

例如页面滚动后延迟改变导航栏高度，下面的主要内容突然下移。又例如侧边栏折叠时，整个主体区域被突然重新计算宽度。

**证据**：Chrome Performance Trace 中的 Layout Shift 与 CSS 更新、组件更新、Layout 对应；对比发生变化前后的 Computed Style 和 DOM 布局矩形。

**优化方向**：先确认布局本身是否有必要改变；对于需要改变宽高或内容高度的区域，保持预期的用户触发时机与空间契约；对纯视觉位移动画可考虑使用 transform 而不是持续修改布局位置。[[1]](https://web.dev/articles/cls)

### 【使用 transform 避免 CLS，不代表动画一定平稳】

CSS transform: translate()、scale() 等通常不会触发 Layout Shift 计分，因为它们不改变文档布局位置，但不意味着移动越剧烈用户越舒服，也不能证明高 FPS 或避免误触。视觉体验还需要考虑动画时长、遮挡、运动敏感性和 prefers-reduced-motion。

动画属性的选择也影响 Smoothness：布局属性动画可能重复触发 Style/Layout；transform/opacity 在符合条件时更容易让浏览器采用合成路径。但**是否产生 CLS**与**执行一帧用了多久**是两个不同问题。[[2]](https://web.dev/articles/optimize-cls)

## 10. Layout Shift Sources 提供受影响元素，Root Cause 需要继续回溯

### 【为什么不能见到 article-body 移动就修 article-body】

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

被观测的 h1 和 p **是受害者**。真正改变布局的是上游 banner-slot 的高度。优化的核心是让广告有稳定空间，而不是给正文补一个抵消位移的 transform。Chrome DevTools 的布局偏移洞察也提醒：工具给出的 culprit 可能只是推测，必须核对实际时序。[[2]](https://web.dev/articles/optimize-cls) [[6]](https://developer.chrome.com/docs/performance/insights/cls-culprit)

### 【API 的来源信息可以直接确定什么，不能直接确定什么】

浏览器 Layout Instability API、web-vitals 标准版、web-vitals Attribution 版分别提供不同深度的信息：

| 数据层级 | 数据对象 / API | 直接可知 | 无法直接保证 |
| --- | --- | --- | --- |
| 页面级结果 | onCLS 的 metric.value | 当前最大会话窗口累计分数 | 整个页面发生过哪些 DOM 改动 |
| 最大窗口 | metric.entries | 构成当前最大窗口的 LayoutShift Entries | 页面生命周期中所有窗口的 Shift 历史 |
| 单次布局偏移 | LayoutShift.value、startTime、hadRecentInput | 一次 Shift 的时间、得分及是否参与 CLS | 唯一 Root Cause 是哪个组件 |
| 受影响元素 | LayoutShift.sources | 受影响 DOM、移动前后位置（在支持范围内） | 所有移动元素的完整列表 |
| 最大单次偏移摘要 | attribution.largestShiftEntry / largestShiftSource / largestShiftTarget | 最大窗口中最有代表性的单次偏移和其受影响元素线索 | 该 Source 就是引发位移的元素 |
| 组件/代码根因 | DevTools Performance + DOM/CSS/Network + Framework Profiler + 实验 | 可形成并验证代码级根因 | 一次 onCLS 回调自动提供完整原因 |

**LayoutShift.sources 最多提供 5 个受影响元素。** 若一次布局偏移影响超过 5 个可见元素，浏览器通常仅返回影响最大的 5 个，不能仅凭 sources 缺少某个节点就断言该节点没有移动。[[11]](https://developer.mozilla.org/en-US/docs/Web/API/LayoutShift/sources)

这里还有一个容易误会的顺序差异：

- 原生 LayoutShift.sources 通常按受影响程度排序，sources[0] 可用于查看该条 Shift 最有影响的受影响元素；但它仍不是自动定位的根因。[[7]](https://developer.mozilla.org/en-US/docs/Web/API/LayoutShiftAttribution)
- 当前 web-vitals 的 largestShiftSource 默认选择**最大 Shift 的 sources 中按文档顺序最靠前的元素**，而 largestShiftTarget 是为这个元素生成的选择器；它们不保证是“影响最大的 source”，也不保证它们属于修改布局的组件。若使用 generateTarget，自定义目标生成方式还会影响返回的字符串。[[8]](https://github.com/GoogleChrome/web-vitals/blob/main/src/types/cls.ts)

因此，对于一次大的 CLS，正确分析顺序应该是：先从 metric.entries 找最大窗口，必要时检查窗口中的**多条** LayoutShift，再从每条 Entry 的 sources 看移动区域与方向。largestShiftTarget 适合作为问题入口和报告分组标签，不能作为已确认根因。

### 【从 Shift 到 Root Cause 建立五步证据链】

1. **定位时间**：最大 Session Window 何时发生？在加载期、阅读期、滚动懒加载还是路由切换期间？
2. **确认发生位置**：哪些 sources 在前后帧改变了 top/left？影响区域与位移方向是什么？
3. **追踪上游结构**：同方向移动的大批元素是否有共同祖先、前一个兄弟节点或新增内容？
4. **关联触发事件**：资源加载完成、字体切换、API 返回、组件挂载、CSS 变化是否和 Shift 同时发生？
5. **验证假设**：临时预留容器高度、限制组件插入、替换字体或冻结数据更新后，Shift 是否消失？

因果证据强度应分层：sources 证明**谁移动**；DOM / Trace / Network 说明**可能是谁导致**；受控实验才进一步证明**改变该因素会让位移改善**。不能把某段 Layout CPU 执行时间直接当成 CLS 根因。

### 【定位具体组件需要补充业务区域标识和代码执行证据】

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

## 11. 原生 Performance API 与 web-vitals 负责不同层次的采集计算

### 【Layout Instability API 提供原始 Entry】

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

这段代码只证明浏览器可以提供原始位移证据，不等于已经计算完整 CLS。LayoutShift API 在部分浏览器中并非全面支持，buffered 的可回溯数据也受浏览器缓冲区限制，生产 SDK 必须做兼容检测与采集缺失标记。[[3]](https://developer.mozilla.org/en-US/docs/Web/API/LayoutShift) [[7]](https://developer.mozilla.org/en-US/docs/Web/API/LayoutShiftAttribution)

### 【Session Window 的概念计算】

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

该代码对应官方 LayoutShiftManager 的核心窗口逻辑，但没有完整处理初始后台加载、BFCache 恢复、指标实例、跨源 iframe 和软导航等生产边界，**不应作为可直接替换 web-vitals 的完整指标实现**。[[4]](https://github.com/GoogleChrome/web-vitals/blob/main/src/lib/LayoutShiftManager.ts)

### 【推荐用 web-vitals/attribution 获取正式结果和最大 Shift 信息】

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

当一个窗口中是很多中等 Shift 累加造成大 CLS 时，**最大单条 Shift 的 Source 不能代表所有问题**；需要继续看 metric.entries 内其他 Entry。largestShiftTarget 也不保证就是 Root Cause。归因字段与行为可在 GoogleChrome/web-vitals 的类型定义及源码中查证。[[8]](https://github.com/GoogleChrome/web-vitals/blob/main/src/types/cls.ts) [[9]](https://github.com/GoogleChrome/web-vitals/blob/main/src/attribution/onCLS.ts)

## 12. 页面生命周期和 RUM 聚合必须保留 CLS 的测量边界

### 【reportAllChanges 不改变计算，只改变报告时机】

与 INP 类似，web-vitals 的 onCLS 默认持续监控 Layout Shift、维护当前最大窗口；reportAllChanges 为 false 时主要在页面 hidden 等报告节点回调。开启 true 可以在当前 CLS 值发生变化时更及时报告，适合本地诊断。无论是否开启，该页面内部的 Session Window 计算规则相同。[[10]](https://github.com/GoogleChrome/web-vitals/blob/main/src/onCLS.ts)

CLS 当前值在一个普通导航测量周期内通常不下降，因为它保留所有已看到窗口得分中的历史最大值。页面第一次 hidden 可能报告 0.12；用户恢复后新发生一个得分 0.19 的窗口，第二次 hidden 可以再次报告 0.19。**这不是两次独立页面访问**；后端应按 metric.id 与 Navigation / View 边界去重或更新，而不是把两条消息都当作两个用户贡献 P75。

### 【初始加载、长期运行和 SPA 路由具有不同风险】

- 初始加载 CLS：多由图片/字体尚未稳定、首屏样式或广告插入造成。
- Post-load CLS：真实用户滚动、阅读、使用页面时，异步内容、广告轮换或新数据插入造成；仅跑一次初始 Lighthouse 可能漏掉。
- 长驻 SPA：一个 Document 可持续多个客户端路由和交互周期，不应擅自把每次 Router change 都视为新的标准 Document CLS。
- 支持软导航的浏览器与 web-vitals 新口径，可以建立相应新测量周期；不支持时，自定义路由级 Shift 指标应保留单独名称与口径，不能直接混入标准 CLS。
- BFCache 恢复对用户是一次新的页面访问体验，CLS 应按照新的访问重新计量；后台未完成首次可见绘制的页面可能不应报告有效 CLS。
- 跨源 iframe 内 Shift 通常无法由父页面 JavaScript 直接读取，CrUX 与网站自身 RUM 可能因此不完全一致。[[1]](https://web.dev/articles/cls) [[10]](https://github.com/GoogleChrome/web-vitals/blob/main/src/onCLS.ts)

### 【RUM 上下文应关联到 Shift 发生时刻】

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

### 【RUM 的 P75 是页面访问级 CLS 的分位数】

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

## 13. 故障定位应从最大窗口逐层回溯布局原因

### 【诊断决策树】

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

### 【完整演示：真正根因在新插入的 Banner，而不是被推走的正文】

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

## 14. 防止 CLS 的工程规范应落在组件契约、动态更新和自动化验收

### 【工程原则是提前确定空间，而不是事后隐藏位移】

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

建议把规范分为**媒体占位、异步状态、动态插入、文字与字体、客户端接管、动画与布局、组件审查与验收**七个方面，而不是仅靠一个统一的 CSS 技巧。[[2]](https://web.dev/articles/optimize-cls)

### 【媒体组件：必须提供可确定的初始几何尺寸】

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

### 【异步组件：Loading、Empty、Error、Success 应具备稳定的容器策略】

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

### 【动态插入和实时数据：明确是否允许改变用户当前阅读位置】

**约束目标**：广告、公告、推荐列表、新消息、实时流等异步内容，不应默认在当前可见内容的前方插入并推动所有旧内容。

建议按业务场景建立不同契约：

- **顶栏公告和广告**：设计时明确是否预留空间、最大高度、是否允许缩放、关闭后怎样回收空间；广告平台返回空内容时也要有确定的回收时机。
- **通知与状态提醒**：判断是否必须进入正常文档流；对于允许覆盖的提示，做好遮挡检测、关闭操作和可访问性，不能只为了得分改为覆盖层。
- **异步列表或消息流**：新数据到达后，可以使用未读提示、用户主动加载、视口锚点或稳定行高，避免正在阅读的旧条目跳动。
- **实时图表和排行榜**：可以持续更新数值，但不要未经设计就反复改变图表容器高度、工具栏占位和外层布局。

这些规范不是限制业务必须异步或同步，而是把**数据何时到达**和**可见布局什么时候变化**分成两项明确决策。具体机制见第 7 节。

### 【字体与文本：首帧和最终呈现尽量保持几何一致】

**约束目标**：字体、语言和动态内容替换不应让原本已经显示的文本突然改变换行高度，进而移动下方按钮或正文。

建议规范：

- 自定义 Web Font 必须定义明确的 fallback 字体，并测试加载前后的字宽、行高、换行差异。
- 重要标题、按钮、导航和正文的 line-height、容器宽度与字体加载策略应一起设计；不要只在本机字体缓存命中条件下验收。
- 确有字体度量差异时，评估 size-adjust 和 ascent/descent/line-gap override 等字体度量工具。
- 若使用 font-display: swap / optional，应同时验收文字出现速度（FCP/LCP）与字体切换可能带来的 CLS；不能简单断言“swap 一定更快且更稳定”。
- i18n、长文案、用户字体放大和窄屏下的自然换行应参与测试；不应通过强制裁剪有效内容来伪造布局稳定。

重要区别：**字体文件快下载完成**与**前后两套字体占用的布局几何一致**是两个问题。前者偏 Loading，后者偏 Visual Stability。详见第 8 节。

### 【SSR、Hydration 与 ClientOnly：保证首次布局与接管后布局一致】

**约束目标**：服务端 HTML 已经显示的布局，不应因为客户端重新计算环境条件、状态或数据而无意义地变化。

规范要求：

1. 首屏 SSR 内容与客户端初始化后的主要结构、数据条件、断点和尺寸应尽可能一致，避免 Hydration 后突然替换为几何差异很大的组件。
2. 对必须使用 ClientOnly 的区域，设计有合理宽高的服务端 fallback / placeholder，尤其是首屏重要组件。
3. 避免等 mounted 才读取窗口尺寸然后把首屏从一套布局突变为另一套布局；可以优先使用 CSS 媒体查询、容器布局等浏览器本身可在首次布局时生效的机制。
4. 在异步业务数据准备完成前，保留稳定容器与真实的 Loading / Empty 状态，避免先删旧 DOM 再插入新 DOM。
5. 页面路由切换时明确容器与过渡机制；普通客户端 Router 切换不是 CLS 自动重新计时的凭据，但路由过程本身仍可能引起 Shift。

**边界**：SSR 不自动保证低 CLS，CSR 也不必然高 CLS。两者影响的是内容生成和显示路径；CLS 仍取决于用户可见之后的布局位置是否发生非预期变化。

### 【布局和动画：先问是否真的需要改变文档流】

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

### 【组件契约：让布局约束成为可审查的 API 和设计说明】

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

### 【自动化验收：完整覆盖冷加载、异步更新和真实用户流程】

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

### 【将规范落实到代码评审时的典型问题】

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

## 15. CLS 优化要同时验收 LCP、INP、动画与业务正确性

### 【一个方案改善 CLS 可能牺牲其他体验】

- 给首屏图片声明比例主要改善布局稳定性，但不会直接减少下载体积；仍需用 LCP 检查主要内容的实际到达。
- 等完整字体资源加载才显示文字可能减少切换偏移，却可能影响 FCP/LCP；度量相近的 fallback 常是更平衡的方向。
- 提前为动态区域预留空间可以减少布局跳动，但过大的永久留白会损伤页面信息密度。
- 通过 transform 移动 UI 可能减少 CLS，但动画遮挡、误触和运动不适仍需另行评估。
- 推迟非关键脚本可改善 INP，但若把关键组件延后挂载却不预留区域，可能引入 post-load CLS。
- 用户点击后立即使某区域展开可能满足 hadRecentInput 豁免，但也要确认用户真的能理解反馈及业务状态。

### 【Lab 证明根因与修复，Field 验证用户真实受益】

Lab：固定设备、视口、网络、缓存、数据和操作步骤，使用 Chrome Performance 的 Layout Shifts Track、动画回放、时间轴、Elements 与相关资源 / 框架事件，定位受影响元素和上游原因。不能只测试初次导航；对广告轮换、滚动懒加载、SPA 路由需要执行完整 User Flow。[[2]](https://web.dev/articles/optimize-cls)

Field：按同分群观察 CLS P75/P95、样本数、浏览器支持率、最大窗口出现时段及版本趋势。若真实用户指标与本地 Lighthouse 不一致，首先确认是否存在 post-load Shift、缓存差异、用户操作差异或跨源 iframe 计分差异，而不是直接否定任一结果。[[1]](https://web.dev/articles/cls)

最终标准不只是“CLS 降低”，还包括**页面内容可见、重要交互可以完成、布局不遮挡、加载和帧性能没有显著退化**。

## 16. 本草稿与现有通用知识文档的关系

本稿作为 Visual Stability 的独立讨论草稿，暂不接入知识索引，不新增 QA，不修改已有正式正文。相关稳定入口：

- [Web 性能优化完整知识体系](../W-Web性能优化完整知识体系.md)：用户体验四维模型与浏览器渲染成本。
- [性能专项优化](../X-性能专项优化.md)：Layout Shift 与 CLS 采集、指标聚合、监控 SDK、RUM。
- [浏览器主线程、Event Loop 与任务调度](../B-浏览器主线程Event Loop与任务调度完整知识体系.md)：Layout/Render 的浏览器调度背景。
- [Chrome 浏览器渲染原理](../J-基于Chrome浏览器渲染原理.md)：Style、Layout、Paint、Composite。
- [Web 渲染架构](../W-Web渲染架构.md)：SSR/CSR、客户端水合与可见 DOM。
- [Loading / LCP 诊断草稿](./Loading-LCP四阶段性能诊断与优化体系-草稿.md)：文档与关键资源时间成本。
- [Responsiveness / INP 诊断草稿](./Responsiveness-INP三阶段交互响应性能诊断与优化体系-草稿.md)：输入、事件处理与下一帧时延。
- [页面流畅度与连续渲染性能体系](../Y-页面流畅度与连续渲染性能完整知识体系.md)：连续视觉更新、Frame/LoAF 等。

统一理解：

~~~text
Loading → LCP → 四个加载耗时阶段 → 等待成本和资源链路
Responsiveness → INP → 三个交互耗时阶段 → 主线程处理与下一帧
Visual Stability → CLS → 最大窗口 / Shift / Source → 布局位置为什么改变
Smoothness → 自定义帧级结果 → 连续更新为何不稳定
~~~

CLS 不是耗时阶段拆分问题，而是**几何位移发生、何时集中发生以及被哪一种内容变化触发**的问题。

## 17. 参考文献

1. Google / web.dev. [Cumulative Layout Shift (CLS)](https://web.dev/articles/cls). CLS 定义、影响面积与距离计算、Session Window、输入排除、生命周期限制。
2. Google / web.dev. [Optimize Cumulative Layout Shift](https://web.dev/articles/optimize-cls). 典型 CLS 根因、资源尺寸、异步嵌入、字体与动画、加载后位移排查。
3. MDN. [LayoutShift](https://developer.mozilla.org/en-US/docs/Web/API/LayoutShift). Layout Shift Entry 的原始字段、计时与观察接口。
4. GoogleChrome / web-vitals. [LayoutShiftManager.ts](https://github.com/GoogleChrome/web-vitals/blob/main/src/lib/LayoutShiftManager.ts). 非预期位移过滤及 1s/5s Session Window 的计算实现。
5. MDN. [LayoutShift.hadRecentInput](https://developer.mozilla.org/en-US/docs/Web/API/LayoutShift/hadRecentInput). 近期离散用户输入的排除条件。
6. Chrome for Developers. [Layout shift culprits](https://developer.chrome.com/docs/performance/insights/cls-culprit). 布局位移受影响元素、DevTools 诊断与根因猜测限制。
7. MDN. [LayoutShiftAttribution](https://developer.mozilla.org/en-US/docs/Web/API/LayoutShiftAttribution). node、previousRect 和 currentRect 的位置归因。
8. GoogleChrome / web-vitals. [CLSAttribution](https://github.com/GoogleChrome/web-vitals/blob/main/src/types/cls.ts). 最大 Shift 的归因类型。
9. GoogleChrome / web-vitals. [attribution/onCLS.ts](https://github.com/GoogleChrome/web-vitals/blob/main/src/attribution/onCLS.ts). 最大单次 Shift、受影响元素和 Attribution 计算。
10. GoogleChrome / web-vitals. [onCLS.ts](https://github.com/GoogleChrome/web-vitals/blob/main/src/onCLS.ts). 指标更新、reportAllChanges、hidden、BFCache 和支持的 Soft Navigation。
11. MDN. [LayoutShift.sources](https://developer.mozilla.org/en-US/docs/Web/API/LayoutShift/sources). 单次 Layout Shift 最多暴露五个受影响元素的归因限制。
