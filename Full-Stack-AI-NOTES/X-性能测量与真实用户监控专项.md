# 性能测量与真实用户监控专项

本文现在承担 **Performance Measurement / RUM（性能测量与真实用户监控）专项**：重点解释性能结果指标与诊断指标怎样从 Browser Performance API 产生，怎样经过采集、标准化、上报、聚合和报告进入持续监控。它不再承担“整个 Web 性能优化体系”的总入口职责。

如果问题是“LCP、INP、CLS 或持续渲染的指标为什么恶化、应定位哪个阶段、怎样根据底层证据连接对应优化机制”，请先阅读 [Web 性能度量与诊断知识体系](./W-Web性能度量与诊断知识体系.md)；如果问题是“已定位的成本怎样通过网络、服务端、资源、JS、调度或渲染技术降低”，请阅读 [Web 性能优化工程体系](./W-Web性能优化工程体系.md)。本文保留 PerformanceObserver、web-vitals、指标采集、标准化、上报、RUM 聚合与监控平台的深入机制。

## 1. 从“定义指标”到“持续监控”

### 【功能验收与效果监控】

对于一个需求来说，开发完成只说明“功能已经实现”，并不能说明需求目标已经真正达成。一个完整的研发过程还需要回答两个问题：

- **功能有没有按照预期工作？**
- **需求上线以后，有没有产生预期的业务价值？**

因此，在需求分析阶段，除了明确“需要实现哪些功能”，还应该同步明确这个需求的**成功标准**：上线以后要观察什么现象、使用哪些指标判断效果，以及这些指标需要从哪里获得数据。

Google 在 HEART 用户体验度量框架中提出，需要建立一套把**产品目标映射为可度量指标**的方法。论文中的核心结论是，用户体验指标应该能够：

> “measure progress towards key goals, and drive product decisions”，也就是**衡量关键目标的进展，并支持产品决策**。[[1]](https://research.google/pubs/measuring-the-user-experience-on-a-large-scale-user-centered-metrics-for-web-applications)

换句话说，不应该因为“这个指标方便采集”就去监控它，而应该从需求目标反向推导：

**Goal（目标） → Signal（信号，可观察到的现象） → Metric（指标，可以持续统计的数据）**。

例如，一个需求的目标是“优化商品搜索体验”，真正需要回答的可能是：用户能不能成功完成搜索；结果多久能够展示；搜索过程中有没有异常；新搜索能力有没有被使用；最终点击率或转化率有没有变化。

在 AI Native 的工程模式下，这个要求会更加明显，Anthropic 在 2026 年关于 Agent Evaluation（智能体评测）的工程实践中也强调，早期建立 Eval（评测）能够迫使产品团队明确“success means what”，即提前把预期行为和成功标准表达清楚，而不是等到生产环境出现问题以后再反向判断。[[2]](https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents)

因此，一个比较完整的需求度量过程可以概括为：

需求目标 → 定义成功标准 → 确定核心指标 → 确定数据来源与采集方式 → 测试和上线观察 → 判断需求效果 → 持续优化

**<u>这里需要把测试验收和持续监控区分开。</u>**

功能是否正确，主要通过 Test Case（测试用例）、单元测试、接口测试、自动化测试、端到端测试等方式进行验证。例如点击“提交”以后数据是否真的保存、没有权限的用户是否真的无法访问，这些问题需要明确的输入和预期结果来判断。

而另外一些问题具有持续性，例如：页面是否变慢；线上异常率是否增加；真实用户是否开始使用新功能；低性能设备是否出现卡顿；业务转化是否发生变化。这些问题仅靠发布前执行一次测试无法回答，需要依赖上线后的真实运行数据。

Google 对 Web Performance（Web 性能）的资料也明确区分了 Lab Data（实验室数据）和 Field Data（真实用户数据）：发布前可以通过受控环境发现性能回退，但真实用户的设备、网络和行为存在很大差异，因此上线以后仍然需要 Real User Monitoring，简称 RUM（真实用户监控）。[[3]](https://web.dev/articles/user-centric-performance-metrics)

Google 进一步指出：

> **如果没有真实用户数据，就无法确定网站所做的改动是否真正取得了预期效果。** [[4]](https://web.dev/articles/vitals-field-measurement-best-practices)

因此，**<u>监控数据可以成为验收和效果评估的重要证据，但不能替代功能测试本身。</u>**

---

### 【企业监控平台的作用】

当我们希望持续获得项目运行过程中的数据时，就进入 Monitoring（监控）的范围。

Google SRE 对 Monitoring 给出的经典定义是：

> “Collecting, processing, aggregating, and displaying real-time quantitative data about a system.”

也就是：**持续采集、处理、聚合并展示系统运行过程中产生的实时量化数据。** [[5]](https://sre.google/sre-book/monitoring-distributed-systems)

因此，企业中的监控平台通常承担的是一条完整的数据链路：

**项目运行 → SDK / 日志产生数据 → 数据上报 → 服务端聚合 → Dashboard（仪表盘）展示 → 告警 / 分析 → 定位与优化**

它解决的不只是“系统有没有挂”。

监控数据还可以用于观察性能趋势、发现异常增长、比较不同版本、分析真实用户体验，以及判断一次需求上线以后是否产生预期变化。真实用户性能监控中，Google 也建议把应用版本或者实验分组一起上报，这样才能比较一次发布前后的性能变化，而不是简单按照发布时间切割数据。[[4]](https://web.dev/articles/vitals-field-measurement-best-practices)

这里还需要区分 Monitoring（监控）和 Observability（可观测性）。

OpenTelemetry 将 Observability 定义为：

> **通过系统对外产生的数据理解系统内部状态的能力。** [[6]](https://opentelemetry.io/docs/what-is-opentelemetry)

因此二者不是完全相同的概念。**监控更强调“持续采集和观察数据”，可观测性进一步强调“能不能利用这些数据回答系统为什么会出现某种状态”。**

**<u>Monitoring SDK（监控软件开发工具包）是应用与监控平台之间的数据采集层。</u>**

它的职责并不是决定“业务应该关注什么指标”，而是在指标确定以后，负责从页面运行过程中**采集、整理、补充上下文并上报相应数据**。

OpenTelemetry 将 Instrumentation（插桩，即让应用产生可观测数据的代码接入过程）定义为：为了让系统可以被观察，应用必须产生 Trace（调用链）、Metric（指标）、Log（日志）等 Telemetry Data（遥测数据，系统运行过程中自动产生并上报的数据）。同时，OpenTelemetry 明确区分 Code-based Instrumentation（代码方式接入）和 Zero-code Instrumentation（零代码或自动接入）。[[7]](https://opentelemetry.io/docs/concepts/instrumentation)

因此，整个关系更准确地说是：

**需求决定要观察什么 → 指标体系定义需要什么数据 → SDK 负责采集和上报 → 监控平台负责聚合、展示和分析。**

---

### 【指标体系设计】

如果从**一个前端需求上线以后需要回答什么问题**出发，可以把监控数据收敛成三条主要分析主线：

```text
前端监控
│
├─ Performance（性能）
│  └─ 页面运行得怎么样：快不快、稳不稳、卡不卡
│
├─ Error / Reliability（异常与可靠性）
│  └─ 页面运行是否失败：哪里出错、影响范围多大
│
└─ Event（事件与过程）
   └─ 运行过程中发生了什么：用户操作、请求、业务流程
```

**<u>需要注意：这是为了组织前端监控数据形成的工程分类，而不是某个标准组织规定的三类 Telemetry 标准。</u>** OpenTelemetry 本身按照 Trace、Metric、Log 等 Signal（信号）组织数据，而 Datadog 等 Browser RUM（浏览器真实用户监控）产品则按照 View、Resource、Long Task、Error、Action 等事件组织数据。不同体系的数据模型并不相同。[[8]](https://opentelemetry.io/docs/concepts/signals)

#### <u>1. Performance：性能数据</u>

Performance（性能）主要回答：

> **页面运行得怎么样，真实用户使用时快不快、稳不稳、卡不卡？**

其中既包括用户最终感受到的结果指标，也包括帮助定位问题的诊断数据。

其中比较常见的指标可以按作用理解：

- **加载体验**：LCP（Largest Contentful Paint，最大内容绘制时间）；FCP（First Contentful Paint，首次内容绘制时间）；TTFB（Time to First Byte，首字节时间）。
- **交互体验**：INP（Interaction to Next Paint，交互到下一次绘制时间）。
- **页面稳定性**：CLS（Cumulative Layout Shift，累计布局偏移）。
- **性能诊断**：Resource Timing（资源加载耗时）；Long Animation Frame，简称 LoAF（长动画帧，用于发现页面卡顿）。

其中，LCP、INP、CLS 属于 Core Web Vitals（核心 Web 体验指标），主要用于判断用户最终体验；Resource Timing、LoAF 等数据则更适合解释**为什么某个性能指标会变差**。

Google 官方维护的 `web-vitals` 库当前将 LCP、INP、CLS 作为 Core Web Vitals（核心 Web 体验指标），并额外提供 FCP、TTFB 等真实用户性能指标。[[9]](https://github.com/GoogleChrome/web-vitals)

浏览器本身也会自动生成大量 Performance Entry（性能记录），例如 Navigation、Resource、Paint、Event、Long Task 等。开发者可以使用 `PerformanceObserver` 监听这些记录，而不需要在每个业务函数中主动计算。[[10]](https://developer.mozilla.org/en-US/docs/Web/API/Performance_API/index.html)

因此这一类数据主要解决：

**<u>发现性能变化 → 判断影响范围 → 找到性能瓶颈 → 验证优化结果。</u>**

#### <u>2. Error / Reliability：异常与可靠性数据</u>

这一类数据主要回答：

> **页面或者业务运行过程中有没有失败，失败发生在哪里，是否正在影响用户。**

前端浏览器本身就提供了一部分异常入口。例如同步 JavaScript 执行异常和部分资源加载异常会触发 `error` 事件，而没有被业务代码处理的 Promise 异常可以通过 `unhandledrejection` 获得。[[11]](https://developer.mozilla.org/en-US/docs/Web/API/Window/error_event)

实际监控 SDK 通常还会继续采集：接口请求失败；资源加载失败；业务主动上报的异常；错误堆栈；页面版本；路由；浏览器和设备等上下文。

这一类监控的价值并不仅是统计一个 Error Count（错误数量），更重要的是**及时发现线上问题并判断它影响了哪些页面、哪些版本和哪些用户**。

因此它通常还会与 Alert（告警）结合：

**<u>异常发生 → 数据上报 → 异常率聚合 → 超过阈值 → 触发告警 → 定位问题 → 修复并观察恢复情况</u>**

它主要承担的是需求上线以后的**稳定性保障**。

#### <u>3. Event：事件与过程数据</u>

Event（事件）主要回答：

> **运行过程中到底发生了什么。**

例如：用户进入页面；点击搜索按钮；发生路由切换；发起请求；搜索结果展示；点击商品；提交订单；任务执行成功。

因此 Event 与前面两类数据的区别在于，它主要记录的是**过程事实**。

事件数据有三个非常重要的用途。

- 衡量功能使用情况。例如有多少用户使用了新功能、某个入口的点击率是多少、一个业务流程完成了多少次。
- 给性能和异常提供上下文。例如仅知道“某个页面发生了异常”往往不够，如果能够看到异常前用户点击了什么、触发了什么请求、经历了什么页面，就更容易定位问题。
- 记录关键业务过程，为后续问题分析、效果评估以及部分业务审查提供依据。

这不是单纯的理论设计。Datadog Browser RUM 会自动收集用户交互，并明确把这些 Action（用户动作）用于分析关键交互性能、Feature Adoption（功能采用情况），以及寻找导致浏览器异常之前发生的操作步骤；无法自动识别的业务动作，则可以**通过 Custom Action（自定义事件）主动上报**。[[12]](https://docs.datadoghq.com/real_user_monitoring/application_monitoring/browser/tracking_user_actions)

**<u>但是，前端 Event 不能直接等同于权威 Audit Log（审计日志）。</u>** 如果涉及权限修改、资金操作或其他敏感行为，安全审计要求日志完整并防止被篡改，因此最终的权威操作结果应该由可信的服务端记录。OWASP 也把完整 Audit Trail（审计轨迹）和 Log Integrity（日志完整性保护）作为安全监控要求。[[13]](https://cheatsheetseries.owasp.org/cheatsheets/Secure_Code_Review_Cheat_Sheet.html)

---

所以三类数据可以理解为：

> **性能数据回答“运行得怎么样”；异常数据回答“哪里失败了”；事件数据回答“过程中发生了什么”。**

三者并不是互相隔绝的。例如一次用户点击是 Event，它可能产生一次 800ms 的交互延迟，从而形成 Performance 数据；如果请求最终失败，又会产生 Error 数据。

---

### 【监控数据的采集方式】

从“监控什么”切换到“数据怎么获得”，又是另外一个维度：**这些数据到底是怎样从浏览器运行过程进入监控平台的？**

从前端工程实现看，可以根据**业务代码需要参与到什么程度**，把采集方式归纳为三层：

```text
                 页面运行
                    │
                    ↓
      浏览器 / SDK 能否直接观察？
          ┌─────────┴─────────┐
          │                   │
         能                  不能
          │                   │
          ↓                   ↓
    Automatic          Manual Instrumentation
     自动采集               主动埋点
          │
          ↓
自动采集后是否缺少业务语义？
     ┌────┴────┐
     │         │
    否        是
     │         │
     ↓         ↓
  直接上报   Declarative
            声明式配置
```

因此，这三种方式并不是三套彼此独立的采集机制，而是代表了**业务代码参与程度逐渐增加**：

> **浏览器和 SDK 已经能够完整观察的数据，直接自动采集；能够观察行为但无法理解业务含义的数据，通过声明式配置补充；只有业务代码自己才能判断的数据，再通过主动埋点产生。**

**<u>需要注意：Automatic → Declarative → Manual 是一种便于描述 Browser Monitoring SDK（浏览器监控 SDK）接入方式的工程归纳，并不是 OpenTelemetry 官方定义的三档标准。</u>** OpenTelemetry 官方主要区分 Zero-code Instrumentation（零代码插桩）和 Code-based Instrumentation（代码插桩）；零代码方式通过 Agent、Instrumentation Library（插桩库）等机制自动产生数据，而应用内部特有的业务数据则需要代码接入。[[7]](https://opentelemetry.io/docs/concepts/instrumentation)

#### <u>1. 自动插桩：SDK 为什么只初始化一次就能持续获得数据</u>

自动插桩首先要理解一个关键点：

> **很多性能数据并不是监控 SDK 自己“计算出来”的，而是浏览器在运行页面的过程中已经自动测量并产生了记录；SDK 负责监听和读取这些记录。**

以性能数据为例，浏览器内部提供了一套 Performance Timeline（性能时间线）模型。

页面运行过程中，浏览器本身就知道什么时候开始导航、什么时候请求资源、什么时候完成响应、什么时候发生绘制、什么时候出现用户交互等。因此浏览器可以在这些过程发生时产生对应的 `PerformanceEntry`（性能记录）。W3C 的 Performance Timeline 标准正是用统一的 `PerformanceEntry` 模型描述这些性能数据。[[14]](https://www.w3.org/TR/performance-timeline)

整个底层链路可以理解为：

```text
页面运行
   ↓
浏览器执行并测量页面运行过程
   ↓
产生不同类型的 PerformanceEntry
   ↓
写入 Performance Timeline
   ↓
PerformanceObserver 监听新的 Entry
   ↓
监控 SDK Collector 接收并处理
   ↓
计算 / 整理性能指标
   ↓
补充 Route / Version / Device / Session
   ↓
进入统一上报队列
   ↓
监控服务端
```

其中浏览器自动产生的记录并不是只有一种：

```text
Performance Timeline
│
├─ navigation
│  └─→ 页面导航、HTML 加载过程
│
├─ resource
│  └─→ JS / CSS / Image / Fetch 等资源加载
│
├─ paint
│  └─→ FP / FCP 等绘制节点
│
├─ largest-contentful-paint
│  └─→ LCP 相关记录
│
├─ event
│  └─→ 用户交互耗时，INP 的基础数据
│
├─ layout-shift
│  └─→ CLS 的基础数据
│
└─ long-animation-frame
   └─→ LoAF 长动画帧
```

`PerformanceObserver` 的作用，就是**订阅这些 Performance Entry，并在浏览器产生新的记录时得到通知**。MDN 对它的定义也是：用于观察浏览器 Performance Timeline 中的性能测量事件，并在新的 Performance Entry 被记录时收到通知。[[15]](https://developer.mozilla.org/en-US/docs/Web/API/PerformanceObserver)

所以监控 SDK 初始化时，本质上会做类似下面的事情：

```ts
// 示例目标：初始化一次 SDK，注册全局性能采集器。
// 后续浏览器只要产生新的 PerformanceEntry，Collector 就会自动收到数据。

function initPerformanceCollector() {
  const observer = new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      // 1. 浏览器已经产生 PerformanceEntry
      // 2. Collector 将原始 Entry 转成监控平台需要的数据
      const metric = normalizePerformanceEntry(entry);

      // 3. 补充页面、版本、设备等上下文
      reportQueue.push({
        ...metric,
        ...getCurrentContext(),
      });
    }
  });

  // 注册 SDK 关心的性能类型
  observer.observe({
    entryTypes: [
      'navigation',
      'resource',
      'paint',
      'largest-contentful-paint',
      'event',
    ],
  });
}
```

因此，在应用入口只需要执行一次：

```ts
monitor.init();
```

`monitor.init()` 内部实际做的不是“开始一个死循环不断查询页面”，而是**一次性注册不同类型的 Collector（采集器）和 Listener（监听器）**：

```text
monitor.init()
│
├─ PerformanceCollector
│  └─→ PerformanceObserver
│
├─ ErrorCollector
│  └─→ error / unhandledrejection
│
├─ NetworkCollector
│  └─→ Fetch / XMLHttpRequest Instrumentation
│
├─ ActionCollector
│  └─→ click / input 等 DOM Event Listener
│
└─ RouterCollector
   └─→ History / Router Listener
```

后面页面继续运行，真正驱动采集的是**浏览器事件或被插桩 API 自身的调用**：

```text
浏览器产生性能 Entry ──────→ PerformanceObserver Callback
JavaScript 发生异常 ──────→ error Callback
用户发生 Click ───────────→ DOM Event Callback
代码调用 fetch() ─────────→ SDK 包装后的 fetch Hook
路由发生变化 ─────────────→ Router / History Callback
                                  │
                                  ↓
                              Collector
                                  ↓
                             Unified Event
                                  ↓
                              Report Queue
                                  ↓
                           Monitoring Server
```

New Relic Browser Agent 的实现也体现了这类机制：Browser Agent 注入页面以后，会使用 Resource Timing API 获取资源性能，通过对 `XMLHttpRequest` 等对象进行 Instrumentation 获取请求信息，并通过事件监听采集 SPA 和其他浏览器数据。[[16]](https://docs.newrelic.com/docs/browser/new-relic-browser/page-load-timing-resources/instrumentation-browser-monitoring)

因此：

> **所谓“自动采集”，不是浏览器把所有监控数据统一存好让 SDK 一次取走，而是 SDK 初始化时注册一组长期存在的 Observer、Listener 和 Hook；之后由浏览器运行过程中产生的 Performance Entry、事件和 API 调用不断触发这些采集器。**

**<u>`PerformanceObserver` 只是性能数据的一条采集入口，并不是整个监控 SDK 唯一的自动采集 API。</u>**

**<u>1. Observer：监听浏览器已经产生的数据</u>**

第一种方式不是去修改原有 API，而是直接监听浏览器已经产生的运行记录。

Performance API 就属于这种情况。浏览器在页面运行过程中会自动产生 `PerformanceEntry`，SDK 只需要注册 `PerformanceObserver`：

页面运行 → Browser 自动测量 → PerformanceEntry → Performance Timeline → PerformanceObserver → PerformanceCollector → 监控平台

例如：

```js
function initPerformanceInstrumentation() {
  const observer = new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      collectPerformance(entry);
    }
  });

  observer.observe({
    entryTypes: ['navigation', 'resource', 'paint'],
  });
}
```

这种方式的特点是：

> **数据已经由浏览器产生，SDK 只负责订阅和读取，并不需要修改业务 API。**

因此从实现机制上看，它更接近 **Observer-based Instrumentation（基于观察器的自动采集）**。

**<u>2. Event Listener：监听浏览器已经暴露的事件</u>**

第二种方式是利用浏览器已经提供的事件机制。

例如 JavaScript 异常、Promise 异常、用户点击等，本身都会通过浏览器 Event（事件）暴露出来。

SDK 初始化时统一注册：

```js
function initEventInstrumentation() {
  window.addEventListener('error', handleError);

  window.addEventListener(
    'unhandledrejection',
    handlePromiseError,
  );

  document.addEventListener(
    'click',
    handleClick,
  );
}
```

运行链路是：

monitor.init() → 注册全局 Event Listener → 页面正常运行 → Browser 产生 Event → 自动触发 SDK Callback → Collector → Report Queue

这里同样不需要每个业务页面分别写：

```js
monitor.trackClick();
monitor.trackError();
```

而是**注册一次，后续所有符合条件的浏览器事件都自动进入统一采集链路**。

**<u>3. Wrap / Monkey Patch：包装原有 API</u>**

有一些 API 本身没有提供足够完整的 Observer 或 Event 来满足监控需要。

这时 SDK 可以把原 API 包装一层，在调用前后插入监控逻辑。

例如原来的业务代码：

```js
fetch('/api/products');
```

SDK 初始化时先保存原始函数：

```js
const originalFetch = window.fetch;
```

再替换为包装后的实现：

```js
window.fetch = async function (...args) {
  const start = performance.now();

  try {
    const response = await originalFetch.apply(this, args);

    collectRequest({
      url: args[0],
      duration: performance.now() - start,
      status: response.status,
    });

    return response;
  } catch (error) {
    collectRequestError(error);
    throw error;
  }
};
```

于是调用链从：

Business Code → fetch() → Browser

变成：

```text
Business Code
     ↓
SDK Wrapped Fetch
     │
     ├─ 记录开始
     ↓
Original Fetch
     ↓
Browser
     ↓
Response / Error
     ↓
SDK Wrapped Fetch
     │
     ├─ 记录耗时
     ├─ 记录状态
     └─ 生成监控数据
     ↓
返回原结果
```

这种技术通常称为 **Wrapping（函数包装）** 或 **Monkey Patching（运行时替换原函数）**。

OpenTelemetry 官方说明，Instrumentation Library（插桩库）可以通过 **wrapping interfaces（包装接口）** 等方式把观测逻辑注入现有库中。[[17]](https://opentelemetry.io/docs/languages/js/libraries)

**<u>关键要求是：Wrapper 只能增加观测逻辑，不能改变原 API 的参数、返回值和异常语义，否则监控逻辑本身就可能影响业务。</u>**

**<u>4. Framework / Library Hook：订阅框架已经提供的生命周期</u>**

还有一种情况，框架或者第三方库本身已经提供了 Lifecycle（生命周期）、Callback（回调）或 Hook（钩子）。

例如一个 Router 可能已经提供：

routeChangeStart；routeChangeEnd

那么 SDK 不需要重新包装 `router.push()`，只需要在初始化阶段统一订阅：

```js
function initRouterInstrumentation(router) {
  router.on('routeChangeStart', handleRouteStart);
  router.on('routeChangeEnd', handleRouteEnd);
}
```

链路是：

monitor.init() → SDK 注册 Framework Hook → 业务正常使用 Router → Framework 生命周期发生 → Framework 主动调用 Hook → Instrumentation Callback → Collector

也就是说：

> **框架已经提供了“某个阶段发生时通知我”的入口，监控 SDK 直接注册 Callback 即可。**

OpenTelemetry JavaScript 官方也明确指出，Instrumentation Library 可以通过 **subscribing to library-specific callbacks（订阅库提供的回调）** 实现自动插桩。[[17]](https://opentelemetry.io/docs/languages/js/libraries)

这里要特别注意它和业务主动埋点的区别：

SDK 在框架层统一注册 Hook → 后续所有相关行为自动触发 → 自动插桩

而不是：

每个业务组件 → 自己注册一个 monitor callback → 主动埋点

只有当**某个局部生命周期的业务意义只有业务代码自己知道**时，才需要业务主动参与。

**<u>5. 四种方式的关系</u>**

浏览器侧的自动插桩可以统一理解成：

```text
                    Automatic Instrumentation
                              │
          ┌───────────────────┼───────────────────┐
          │                   │                   │
       Observer            Listener            Wrapper
          │                   │                   │
PerformanceObserver      DOM / Error Event    fetch / XHR
          │                   │                   │
          └───────────────────┼───────────────────┘
                              │
                              ↓
                    Framework / Library Hook
                              │
                              ↓
                           Collector
                              ↓
                      Unified Event Model
                              ↓
                         Report Queue
```

四种方式实际上对应四种不同情况：

- **Observer**：浏览器已经产生结构化记录，SDK 直接观察。
- **Listener**：浏览器已经发出事件，SDK 直接监听。
- **Wrap / Monkey Patch**：没有合适的观察入口，SDK 包装原 API，在调用前后插入逻辑。
- **Framework / Library Hook**：框架已经提供生命周期或回调，SDK 直接订阅。

#### <u>2. 声明式配置：采集过程已经自动完成，只补充业务语义</u>

第二种情况并不是“换了一种采集机制”，而是在**自动采集链路上增加一层配置**。

例如 SDK 已经注册了全局 Click Listener：

```text
用户点击按钮
    ↓
浏览器产生 click Event
    ↓
SDK 全局 ActionCollector 捕获
    ↓
得到：
type = click
element = button
    ↓
但 SDK 不知道：
“这是提交退款申请”
```

也就是说，**技术事件已经可以自动采集，缺少的只是业务名称。**

因此，可以通过 HTML Attribute（HTML 属性）或 SDK Configuration（SDK 配置）补充信息：

```html
<button data-dd-action-name="提交退款申请">
  提交
</button>
```

完整链路变成：

```text
用户 Click
   ↓
浏览器派发 DOM Event
   ↓
SDK 全局 Listener 自动捕获
   ↓
读取 Element
   ↓
读取 data-dd-action-name
   ↓
技术事件 + 业务名称
   ↓
生成 Action Event
   ↓
统一 Report Queue
   ↓
监控平台

最终数据：

type        = click
actionName  = 提交退款申请
route       = /refund
timestamp   = ...
```

Datadog Browser RUM 就提供了这一类机制：当开启 User Interaction Tracking（用户交互采集）后，SDK 自动收集 Click Action；如果希望明确指定行为名称，可以使用 `data-dd-action-name` 属性，也可以通过初始化参数指定自定义名称属性。[[12]](https://docs.datadoghq.com/real_user_monitoring/application_monitoring/browser/tracking_user_actions)

所以声明式配置的链路可以浓缩成：

```text
Automatic Collection
SDK 已经能自动发现事件
          ↓
Declarative Configuration
业务补充 Name / Tag / Rule
          ↓
完整监控事件
```

> **声明式配置不是业务主动创建一条事件，而是给 SDK 已经能够自动采集的数据补充“这条数据在业务中是什么意思”。**

#### <u>3. 代码插桩：业务必须主动产生浏览器无法推断的数据</u>

有些数据并不是“SDK不知道名字”，而是**浏览器根本无法判断这个业务状态什么时候成立**。

例如要监控：

> “用户点击搜索以后，到搜索结果真正可见用了多久。”

浏览器能够分别观察到 Click、Fetch、DOM Render 等技术过程：

Click → Fetch → Response → JavaScript Processing → Render

但浏览器并不知道：

哪一个节点 = 业务定义的“搜索真正完成”

所以这个边界必须由业务代码主动告诉监控系统。

**<u>1. 主动定义业务性能指标</u>**

对于业务性能，可以使用 User Timing API：

```ts
// 示例目标：主动定义“搜索体验”的开始和结束。
// 浏览器无法自行知道哪个业务节点代表 Search Complete。

async function onSearch() {
  // 业务定义：从这里开始计算“搜索体验耗时”
  performance.mark('search-start');

  const data = await fetchSearchResult();
  const result = processData(data);

  await renderResult(result);

  // 业务定义：到这里认为搜索结果已经完成展示
  performance.mark('search-result-visible');

  // 根据两个时间点计算完整耗时
  performance.measure(
    'search-result-duration',
    'search-start',
    'search-result-visible',
  );
}
```

这里非常关键的一点是：`performance.mark()` 和 `performance.measure()` 创建的 `PerformanceMark`、`PerformanceMeasure` **本身也是 PerformanceEntry**，并且会进入同一条 Performance Timeline。[[18]](https://developer.mozilla.org/en-US/docs/Web/API/Performance_API/User_timing)

浏览器会把它们转成标准的 Performance Entry：

```text
performance.mark()
      ↓
PerformanceMark
      ↓
PerformanceEntry

performance.measure()
      ↓
PerformanceMeasure
      ↓
PerformanceEntry
```

所以主动定义的业务性能数据，又可以重新接回自动采集链：

```text
                    页面启动
                       ↓
                 monitor.init()
                       ↓
           注册 PerformanceObserver
                       ↓
              监听 measure Entry
                       │
                       │
───────────────────────┼──────────────────────
                       │
                 用户点击搜索
                       ↓
                 onSearch()
                       ↓
          mark('search-start')
                       ↓
        Fetch → Process → Render
                       ↓
    mark('search-result-visible')
                       ↓
 measure('search-result-duration')
                       ↓
       浏览器生成 PerformanceMeasure
                       ↓
              Performance Timeline
                       ↓
         已注册的 PerformanceObserver
                       ↓
             PerformanceCollector
                       ↓
                Report Queue
                       ↓
                 监控平台
```

这使得 SDK 不需要为每个业务指标重新设计一套上报链路：

```text
浏览器自动指标 ─────────────┐
                           │
LCP / Resource / Event ────┤
                           ↓
                    PerformanceObserver
                           ↓
                       SDK 上报

业务自定义指标 ─────────────┐
                           │
mark + measure ────────────┤
                           ↓
                    PerformanceObserver
                           ↓
                       SDK 上报
```

**<u>2. 主动定义业务事件</u>**

如果需要记录的不是性能，而是“支付成功”“审批完成”“任务完成”这样的 Business Event（业务事件），就不适合使用 Performance Timeline，而是直接调用 SDK 的 Custom Event API（自定义事件接口）：

```ts
// 只有业务逻辑才能确认支付是否真正成功。

async function submitPayment() {
  const result = await payment();

  if (result.success) {
    monitor.trackEvent('payment_success', {
      paymentType: result.type,
    });
  }
}
```

对应链路是：

```text
业务逻辑执行
   ↓
业务代码判断
“Payment Success 已经发生”
   ↓
monitor.trackEvent()
   ↓
Custom Event
   ↓
SDK Unified Event Model
   ↓
Context
   ↓
Report Queue
   ↓
Monitoring Platform
```

这种方式就是最典型的**主动埋点**。

也就是说：

> **主动埋点通常属于代码插桩的一种。**
>
> **浏览器和通用 SDK 无法仅通过技术现象判断某个业务状态是否成立，需要业务代码主动定义“什么时候发生、发生了什么”。**

**<u>3. 主动创建 Trace / Span</u>**

如果想记录一个业务操作经过了哪些阶段，可以主动创建 Span（调用链中的一个执行片段）。

OpenTelemetry Code-based Instrumentation 官方就是通过 `Tracer` 创建 Span。

例如：

```js
const tracer = trace.getTracer('checkout');

async function submitOrder() {
  const span = tracer.startSpan('submit-order');

  try {
    const result = await createOrder();

    span.setAttribute(
      'order.success',
      result.success,
    );

    return result;
  } catch (error) {
    span.recordException(error);
    throw error;
  } finally {
    span.end();
  }
}
```

链路是：

```text
submitOrder()
      ↓
startSpan('submit-order')
      ↓
执行订单业务
      ↓
记录 Attribute / Error
      ↓
span.end()
      ↓
OpenTelemetry SDK
      ↓
Exporter
      ↓
Observability Platform
```

可以把：

```js
const span = tracer.startSpan('submit-order');
```

理解成：

```text
创建一个 Span 对象
      ↓
记录：
name = submit-order
startTime = 当前时间
traceId = 当前 Trace
spanId = 新 Span ID
parentSpanId = 父 Span
```

执行过程中还可以追加信息：

```js
span.setAttribute('order.type', 'normal');
span.addEvent('payment-start');
```

最后：

```js
span.end();
```

相当于：

记录 endTime → 计算 duration → Span 完整结束 → 交给 OpenTelemetry SDK → Exporter → Observability Platform

**<u>一个 Span 一般会记录几类信息：</u>**

```text
Span
│
├─ name
│  └─ submit-order
│
├─ startTime / endTime
│  └─ 计算 Duration
│
├─ status
│  └─ success / error
│
├─ attributes
│  └─ order.type = "normal"
│     payment.method = "card"
│
├─ events
│  └─ validation-failed
│     payment-retry
│
└─ parentSpan
   └─ 表示它属于哪个上层执行过程
```

最关键的是两个东西：

> **时间边界 + 父子关系。**

假设你创建：

```js
const orderSpan = tracer.startSpan('submit-order');
```

然后整个订单过程中又有：

create-order；payment；render-result

那么可以形成：

```text
submit-order
│
├─ create-order
│  └─ HTTP POST /orders
│
├─ payment
│  └─ HTTP POST /payment
│
└─ render-result
```

这里：

- `submit-order` 是 Parent Span（父 Span）
- `create-order`、`payment`、`render-result` 是 Child Span（子 Span）

这样监控平台最终展示的就不再是几条没有关系的数据：

POST /orders 300ms；POST /payment 500ms；render 100ms

而是：

```text
submit-order                     1000ms
├─ create-order                   300ms
│  └─ POST /orders                280ms
├─ payment                        500ms
│  └─ POST /payment               470ms
└─ render-result                  100ms
```

这样才能回答：

> **这一次提交订单为什么用了 1 秒？时间到底花在哪一步？**

Event 更像一个**时间点**：

payment_success；发生在 10:20:31

Span 更像一个**时间段**：

```text
payment
10:20:30.200
    ↓
10:20:31.000

duration = 800ms
```

所以：

```text
Event = 一个点
Span  = 一段过程
Trace = 多段过程组成的一条完整链路
```

> **Span 就是给一次“有明确开始和结束的工作”建立一个观测区间；多个 Span 通过父子关系连接起来，就形成 Trace，从而能够看到一次业务操作到底经过了哪些阶段、每一步花了多久、哪里失败了。**

```text
Trace: Checkout

10:00.000 ───────────────────────────── 10:02.000
│
├─ Span: create-order
│  10:00.100 ───── 10:00.500
│
├─ Span: payment
│  10:00.500 ─────────── 10:01.500
│
└─ Span: render
   10:01.500 ─── 10:01.800
```

#### <u>4. 三种方式最终如何进入同一套监控链路</u>

把三类采集方式放在一起以后，完整结构其实非常清楚：

```text
                         Page Runtime
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
        ↓                     ↓                     ↓
 Browser Native Data     Observable Action      Business State
 浏览器原生数据           可自动观察行为          业务状态
        │                     │                     │
        ↓                     ↓                     ↓
PerformanceEntry        SDK Listener / Hook     Business Code
        │                     │                     │
        ↓                     ↓                     ↓
PerformanceObserver      Declarative Config     Manual API
自动读取                  补充 Name / Tag        主动产生数据
        │                     │                     │
        └─────────────────────┼─────────────────────┘
                              ↓
                         Collector Layer
                              ↓
                      Unified Event Model
                              ↓
             Context：Route / Version / Session
                              ↓
               Sampling / Filter / Batch
                              ↓
                    sendBeacon / fetch
                              ↓
                     Monitoring Server
                              ↓
                  Dashboard / Alert / Analysis
```

因此，从项目接入监控 SDK 的角度，可以按照下面的顺序判断：

```text
需要一个监控数据
      ↓
浏览器或 SDK 能不能直接观察？
      │
      ├─ 能，并且语义已经足够
      │       → Automatic / Zero-code（零代码 / 自动插桩）
      │
      ├─ 能，但缺少业务名称 / 标签
      │       → Automatic + Declarative
      │
      └─ 不能，只有业务代码知道
              → Manual Instrumentation /  Code-based（代码插桩）
```

最终三种方式的区别不是“用了哪个 API”，而是**数据产生权在哪里**：

> - **Automatic：数据主要由浏览器运行机制产生，SDK 自动观察。**
> - **Declarative：数据仍然由 SDK 自动观察，业务只补充语义。**
> - **Manual Instrumentation：数据的业务含义或发生时机只能由业务代码判断，因此由业务主动产生。**

这也解释了为什么成熟的监控 SDK 通常会尽量采用：

**自动采集优先 → 配置补充其次 → 主动埋点兜底。**

目的是把代码插桩限制在**真正只有业务自己能够定义的数据**上。

---

## 2. Performance：性能数据的采集与计算

### 【性能指标体系】

前端 Performance（性能）监控的目标，是用**<u>可持续采集的数据描述真实用户实际感受到的页面性能</u>**。它关注页面加载速度，交互响应、页面布局稳定以及连续动画或滚动是否流畅。

Google 在 User-centric Performance Metrics（以用户为中心的性能指标）中明确指出：

> “No single metric is sufficient to capture all the performance characteristics of a page.”

即：**不存在一个单一指标能够完整描述页面的全部性能特征。** Google 将感知加载速度、运行时响应、视觉稳定性和流畅度分别作为不同的用户体验维度。[[3]](https://web.dev/articles/user-centric-performance-metrics)

因此，在前端监控中，可以基于用户实际感知，将 Performance 组织为以下四个主要维度：

| 性能维度 | 主要衡量内容 | 结果指标 | 标准化程度 |
| ---------------------------------- | -------------------------------------------- | ------------------------------- | ------------------------ |
| **Loading（加载性能）** | 页面主要内容展示得是否足够快 | **LCP** | Core Web Vitals 标准指标 |
| **Responsiveness（交互响应）** | 点击、输入等操作后页面是否能够及时反馈 | **INP** | Core Web Vitals 标准指标 |
| **Visual Stability（视觉稳定性）** | 页面内容是否发生用户没有预期的跳动 | **CLS** | Core Web Vitals 标准指标 |
| **Smoothness（连续渲染流畅度）** | 滚动、动画、拖拽、地图等连续视觉更新是否流畅 | Frame Time、掉帧/卡顿等场景指标 | 暂无统一 Core Web Vital |

其中前三项已经形成当前的 Core Web Vitals（核心网页指标）。Google 对 Core Web Vitals 的定位是：**每一个指标代表用户体验中的一个关键方面，能够在真实用户环境中测量，并反映以用户为中心的重要体验结果。** [[19]](https://web.dev/articles/vitals)

Smoothness（流畅度）同样属于正式讨论的用户体验维度，但目前还没有形成类似 LCP、INP、CLS 的统一 Core Web Vital。Chrome 对流畅度的研究也表明，简单使用平均 FPS（Frames Per Second，每秒帧数）并不能完整表示用户感受到的流畅程度，因为浏览器还存在主线程、合成线程、部分帧更新和掉帧等情况。[[20]](https://web.dev/articles/smoothness)

因此，这四个维度的关系更准确地理解为：

> **LCP、INP、CLS 是已经标准化的通用结果指标；Smoothness 是需要补充监控的重要体验维度，但具体指标和阈值仍需要结合业务场景定义。**

#### <u>1. 结果指标与诊断指标</u>

性能监控中的数据按照作用，可以分成两类：

| 类型 | 核心作用 | 典型数据 |
| --------------------------------- | -------------------------------------------------- | ------------------------------------------------------------ |
| **Result Metric（结果指标）** | 直接判断用户最终体验是否达到目标 | LCP、INP、CLS，以及企业定义的流畅度结果指标 |
| **Diagnostic Metric（诊断指标）** | 在结果异常后分析耗时发生在哪个阶段、由什么原因造成 | TTFB、FCP、Resource Timing、Long Task、LoAF、Layout Shift 等 |

**结果指标的特点，是可以通过明确的数值阈值或评价区间判断当前体验是否达到目标。**

Core Web Vitals 已经提供了成熟的统一阈值：[[21]](https://web.dev/articles/defining-core-web-vitals-thresholds)

| 结果指标 | 衡量内容 | Good（良好） | Needs Improvement（需要改进） | Poor（较差） |
| -------- | ---------------- | -----------: | ----------------------------: | -----------: |
| **LCP** | 主要内容加载速度 | ≤ 2.5s | 2.5～4s | > 4s |
| **INP** | 页面交互响应速度 | ≤ 200ms | 200～500ms | > 500ms |
| **CLS** | 页面视觉稳定性 | ≤ 0.1 | 0.1～0.25 | > 0.25 |

Google 对三项指标分别给出了明确含义：**LCP 衡量用户感知到的加载速度，INP 衡量页面响应用户交互的能力，CLS 衡量可见内容发生非预期布局变化的程度。** [[21]](https://web.dev/articles/defining-core-web-vitals-thresholds)

对于 Smoothness，目前不存在一组等价的官方 Good / Poor 阈值。实际项目可以根据业务场景建立 Performance Budget（性能预算），例如对地图拖拽、Canvas 动画、图表更新等连续渲染过程定义 Frame Time P95、超预算帧比例或卡顿率等结果指标。**这类阈值属于企业工程标准，而不是 Core Web Vitals 标准。**

Smoothness 的完整学习不应该继续在本综合性能文档中展开成另一套渲染诊断体系。关于 **Frame Production（帧生产）+ Data Progress（数据进度）双主线、FPS / Frame Time / LoAF / Queue 指标组合、N / K / C / H / B 根因模型、Batch / Rate / History / Empty Render 受控实验，以及从定位到优化再到 Soak 验收的完整闭环**，统一进入 [页面流畅度与连续渲染性能完整知识体系](Y-页面流畅度与连续渲染性能完整知识体系.md)。本文继续承担性能指标、监控采集与 RUM 的上位入口。

结果指标负责描述**最终体验**，诊断数据负责描述**产生这个结果的运行过程**。

| 性能维度 | 结果指标 | 主要诊断数据 | 诊断重点 |
| -------------------- | ---------------------------------- | ------------------------------------------------------------ | ---------------------------------------- |
| **Loading** | LCP | TTFB、FCP、Resource Timing、LCP Breakdown | 服务端响应、资源发现、资源下载、最终渲染 |
| **Responsiveness** | INP | Input Delay、Processing Duration、Presentation Delay、Long Task、LoAF | 主线程等待、事件处理、下一帧呈现 |
| **Visual Stability** | CLS | Layout Shift、Shift Source、Session Window | 哪些元素发生位移以及位移如何累积 |
| **Smoothness** | 企业定义的 Frame / Jank 类结果指标 | LoAF、Long Task、JS 执行、Style / Layout 等 | 长帧、主线程阻塞和渲染开销 |

例如，LCP 超过 2.5 秒能够直接说明加载体验没有达到 Good 标准，但 **LCP 本身并不能说明具体原因**。进一步分析时，需要结合 TTFB（Time to First Byte，首字节时间）、Resource Timing（资源加载时间）以及 LCP Breakdown（LCP 阶段拆分），判断耗时来自服务端响应、关键资源发现、资源下载还是元素最终渲染。

INP 也是相同的关系。INP 高说明交互响应较慢，诊断时可以继续拆分为 Input Delay（输入等待）、Processing Duration（事件处理时间）和 Presentation Delay（呈现等待），从而确定交互延迟具体发生在哪一阶段。Google 对 INP 的定义本身也是基于页面生命周期内真实发生的交互延迟来评价整体响应能力。[[22]](https://web.dev/articles/inp)

因此整个性能指标体系可以收敛为一条简单关系：

> **体验维度定义需要衡量什么 → 结果指标判断体验是否达标 → 诊断指标解释结果为什么异常 → 进一步定位到网络、资源、JavaScript 或渲染过程。**

这也是后续 Performance SDK 进行数据采集时的基本依据：**不是把浏览器能够获得的所有性能数据都当成同一级指标，而是先形成稳定的结果指标，再为每一类结果指标保留对应的诊断数据。**

#### <u>2. 结果指标的聚合方式</u>

单次用户访问会产生一个具体的性能值，例如某次页面访问：

`LCP = 1.8s`、`INP = 160ms`、`CLS = 0.05`。

但线上性能监控需要面对大量用户、设备和网络环境，因此不能只看单次数据，也不适合只看平均值。

Google 对 Core Web Vitals 推荐使用 **<u>P75（75th Percentile，第 75 百分位）</u>** 进行评价，并分别统计移动端和桌面端。[[19]](https://web.dev/articles/vitals)

例如：

| 页面访问 | LCP |
| ---------- | -------: |
| 较快用户 | 1.2s |
| 一般用户 | 1.8s |
| 较慢用户 | 2.3s |
| **P75** | **2.4s** |
| 尾部慢用户 | 4.5s |

`LCP P75 = 2.4s` 表示大约 **75% 的页面访问可以在 2.4 秒以内完成 LCP**。由于 2.4 秒仍处于官方 `≤ 2.5s` 的 Good 区间，因此该页面的 LCP 可以评价为良好。

Google 对选择 P75 的解释是：它既能够保证“大多数用户”达到目标，又不会像 P95、P99 那样过度受到少量异常值影响。[[21]](https://web.dev/articles/defining-core-web-vitals-thresholds)

因此线上结果指标通常形成这样的评价关系：

**真实用户样本 → P75 / P95 等分位数聚合 → 与目标阈值比较 → 判断当前性能是否达标**

其中 Core Web Vitals 主要使用 P75；企业自定义的流畅度、业务性能等指标，可以根据目标同时观察 P75、P95 或 P99。

---

### 【Performance SDK 的完整采集链路】

Performance SDK（性能监控软件开发工具包）的核心职责，是把浏览器运行过程中产生的原始性能数据，转换成能够持续统计、比较和诊断的性能指标。

从数据产生到最终进入监控平台，可以概括为：

```text
页面运行
│
│ 浏览器执行页面加载、资源请求、绘制、用户交互和布局变化
↓
浏览器产生原始性能数据
│
│ 例如：
│ navigation：页面导航过程
│ resource：JS / CSS / 图片 / 接口等资源加载过程
│ paint：页面绘制过程
│ event：用户点击、输入等交互过程
│ layout-shift：页面元素发生位置变化
│ long-animation-frame：一次渲染更新时间过长
↓
PerformanceEntry
│
│ 浏览器把上面的性能行为整理成统一的“性能记录”
│ 每一条记录都包含发生时间、持续时间以及该类型特有的信息
↓
SDK 获取原始数据
│
├─ PerformanceObserver
│  └─ 监听浏览器新产生的 PerformanceEntry
│
└─ 其他浏览器 API
   └─ 例如 requestAnimationFrame 获取连续帧之间的时间间隔
↓
SDK 处理性能数据
│
├─ 结果指标计算
│  │
│  ├─ LCP
│  │  └─ 根据 largest-contentful-paint 数据计算主要内容加载体验
│  │
│  ├─ INP
│  │  └─ 根据 event 数据计算用户交互响应时间
│  │
│  ├─ CLS
│  │  └─ 根据多次 layout-shift 数据计算页面布局稳定性
│  │
│  └─ 流畅度指标
│     └─ 根据帧间隔计算 Frame Time P95、帧预算命中率等
│
└─ 诊断数据整理
   │
   ├─ Resource Timing
   │  └─ 分析资源加载是否过慢
   │
   ├─ Navigation Timing
   │  └─ 分析页面导航、请求和响应阶段耗时
   │
   ├─ Long Task
   │  └─ 分析主线程是否被长时间占用
   │
   └─ LoAF
      └─ 分析是否存在严重长帧，以及长帧由什么工作造成
↓
统一监控数据格式
│
│ 无论数据来自 LCP、INP、Resource 还是 LoAF，
│ 都转换成 SDK 内部统一的数据结构
↓
补充运行上下文
│
│ 增加 Route、Version、Device、Browser、
│ Network、Session、Timestamp 等信息
│ 用于后续判断问题发生在哪个页面、版本和用户环境
↓
数据发送前处理
│
├─ Filter
│  └─ 过滤不需要的数据
│
├─ Sampling
│  └─ 对高频数据进行采样，控制监控成本
│
├─ Queue / Batch
│  └─ 先进入队列，再将多条数据批量发送
│
└─ sendBeacon / fetch
   └─ 将数据发送到监控服务端
↓
监控服务端
│
│ 接收大量真实用户产生的性能数据
↓
聚合统计
│
│ 按页面、版本、设备、浏览器等维度统计
│ 并计算 P50 / P75 / P95 等分位数
↓
性能分析与治理
│
├─ Dashboard：查看性能趋势
├─ Alert：指标超过阈值时告警
└─ Analysis：结合诊断数据定位性能问题
```

其中，

- 浏览器主要负责**测量页面运行过程**；
- SDK 负责**采集、计算、组织和发送数据**；
- 服务端再负责**聚合、统计和分析**。

#### <u>1. 浏览器是性能数据的主要来源</u>

浏览器本身参与了页面从加载到渲染、再到交互的完整执行过程，因此能够直接记录很多运行时信息。例如页面什么时候开始导航、资源什么时候发起请求、什么时候发生绘制、用户交互处理了多久，以及页面是否发生布局变化。

W3C 的 Performance Timeline（性能时间线）为这些记录定义了一套统一的数据模型：

> **页面运行过程中产生的性能信息，可以通过 `PerformanceEntry`（性能记录）进行表示，并按照发生时间组织在 Performance Timeline 中。** [[14]](https://www.w3.org/TR/performance-timeline)

可以把 `PerformanceEntry` 理解成浏览器记录的一条**结构化性能事实**。它描述某个性能行为在什么时候发生、持续了多久，以及与这个行为相关的详细信息。

所有 Performance Entry 都具有一组基础字段：

```ts
interface PerformanceEntry {
  name: string;
  entryType: string;
  startTime: number;
  duration: number;
}
```

其中：

- `name`：这条记录的名称，具体含义由 Entry 类型决定。
- `entryType`：表示这条记录属于哪一种性能数据，例如 `resource`、`event`、`layout-shift`。
- `startTime`：相对于当前页面时间原点，这个行为什么时候开始。
- `duration`：这个行为持续了多长时间。

不同类型的性能记录，会在这些基础字段之外增加自己的专有信息。

例如，一个图片资源加载时，浏览器可以产生 `PerformanceResourceTiming`：

```json
{
  name: 'https://example.com/hero.jpg',
  entryType: 'resource',
  startTime: 320,
  duration: 480,

  initiatorType: 'img',
  requestStart: 350,
  responseStart: 520,
  responseEnd: 800,
  transferSize: 120000
}
```

这条数据表达的不是“页面性能好还是不好”，而是一个事实：

> `hero.jpg` 在页面运行到约 320ms 时开始进入资源加载过程，总耗时约 480ms，并且还可以继续看到请求、响应以及传输大小等信息。

用户交互也是类似的。用户点击按钮后，浏览器可以通过 `PerformanceEventTiming` 记录这次事件：

```json
{
  name: 'click',
  entryType: 'event',
  startTime: 2200,
  duration: 180,

  processingStart: 2250,
  processingEnd: 2320,
  interactionId: 17
}
```

它表示一次真实发生的交互过程，并记录输入发生、事件开始处理、处理结束等时间。后续 INP（Interaction to Next Paint，交互到下一次绘制）就是建立在这类 Event Timing 数据之上的。

页面布局发生变化时，浏览器又会产生 `layout-shift` Entry，其中会记录本次位移的分值、是否由近期用户操作触发，以及哪些元素发生了移动。

因此，不同 Performance Entry 本质上是在描述页面运行过程中的不同事实：

```text
页面运行
    │
    ├─ 加载一个资源
    │    → resource Entry
    │
    ├─ 完成一次绘制
    │    → paint Entry
    │
    ├─ 出现新的最大内容元素
    │    → largest-contentful-paint Entry
    │
    ├─ 用户发生一次交互
    │    → event Entry
    │
    ├─ 页面元素发生非预期移动
    │    → layout-shift Entry
    │
    └─ 一次渲染更新耗时过长
         → long-animation-frame Entry
```

这些 Entry 最终按照时间进入 Performance Timeline，SDK 可以通过 `PerformanceObserver`（性能观察器）监听指定类型的数据。

页面运行 → 浏览器自动测量 → 产生不同类型的 PerformanceEntry → Performance Timeline → PerformanceObserver → 监控 SDK

这里需要进一步区分 **PerformanceEntry** 和 **Performance Metric（性能指标）**。

`PerformanceEntry` 是浏览器产生的原始记录，而 LCP、INP、CLS 这类指标通常是在一条或多条 Entry 的基础上，按照对应规则进一步计算得到的结果。

以 LCP 为例，页面加载过程中并不是只产生一条固定的 LCP 数据。随着更大的内容出现，浏览器可能依次产生多条 `largest-contentful-paint` Entry：

```text
LCP Candidate 1
标题
startTime = 500ms

        ↓

LCP Candidate 2
Banner
startTime = 900ms

        ↓

LCP Candidate 3
商品主图
startTime = 1800ms
```

这些 Entry 表示的是：

> **在不同时间点，浏览器观察到新的 LCP 候选内容。**

监控侧还需要按照 LCP 的规则处理这些候选记录，最终得到本次页面访问的 LCP Metric，例如：

LCP = 1800ms

CLS 的情况更加明显。

浏览器运行过程中可能连续产生多次 `layout-shift`：

```text
Layout Shift A
score = 0.03

Layout Shift B
score = 0.04

Layout Shift C
score = 0.02
```

这些只是三次独立的布局变化。CLS 并不是简单选择其中某一个值，而是按照 CLS 的 Session Window（会话窗口）规则对相关 Layout Shift Entry 进行组合，最终得到一个页面级结果指标。

例如 `PerformanceResourceTiming` 本身就包含 DNS、连接、请求、响应和资源传输等详细时间，它的主要价值是用于分析资源为什么加载缓慢。因此这类数据通常可以直接作为 Diagnostic Data（诊断数据）保存。

最终可以形成两条数据用途：

```text
PerformanceEntry
      │
      ├─ 按指标规则进一步计算
      │        ↓
      │   Result Metric
      │   LCP / INP / CLS 等
      │
      └─ 保留运行过程信息
               ↓
          Diagnostic Data
          Resource Timing
          Long Task
          LoAF 等
```

因此，浏览器 Performance API 提供的是整个性能监控体系的**底层数据基础**。

> **浏览器负责记录页面运行过程中发生了什么；PerformanceEntry 将这些运行事实结构化；SDK 再根据不同用途，把 Entry 计算成结果指标，或者保留为后续性能诊断所需要的原始数据。**

#### <u>2. PerformanceObserver 完成自动采集</u>

Performance SDK 初始化时，通常不会不断执行定时器查询浏览器性能数据，而是一次性注册相应的 Observer（观察器）。

`PerformanceObserver.observe()` 可以指定要监听的 Entry 类型。当匹配的 Performance Entry 被浏览器记录后，Observer 的回调函数会自动执行。[[23]](https://developer.mozilla.org/en-US/docs/Web/API/PerformanceObserver/observe)

例如监听 LCP：

```js
const observer = new PerformanceObserver((list) => {
  for (const entry of list.getEntries()) {
    collectPerformanceEntry(entry);
  }
});

observer.observe({
  type: 'largest-contentful-paint',
  buffered: true,
});
```

运行过程是：

```text
调用 observe()
   ↓
注册：我要监听某种 PerformanceEntry
   ↓
如果 buffered: true 且已有历史 Entry
   ↓
把这些 Entry 放进 Observer 的待处理队列
   ↓
浏览器安排一次 PerformanceObserver 通知任务
   ↓
之后异步执行 callback(list)

// 如果没有历史 Entry：

调用 observe()
   ↓
只完成监听注册
   ↓
此时没有待处理 Entry
   ↓
不会因为 observe() 本身执行 callback
   ↓
后续浏览器产生新的 Entry
   ↓
Entry 加入 Observer 待处理队列
   ↓
浏览器安排异步通知
   ↓
执行 callback(list)
```

所以所谓 Performance 自动插桩，本质上是：

> **SDK 初始化阶段注册长期存在的性能采集器，后续由浏览器运行过程自动驱动数据产生和回调触发。**

这也是为什么业务代码通常只需要：

```js
monitor.init();
```

而不需要在每个组件中反复调用：

```js
monitor.collectLCP();
monitor.collectResource();
monitor.collectLayoutShift();
```

**<u>`buffered` 解决 SDK 初始化较晚的问题</u>**

在调用 `observe()` 时，浏览器会把**性能缓冲区中已经存在、并且符合 `type` 的历史 Entry 加入这个 Observer 的待处理队列**；与此同时，这个 Observer 会正式注册，继续接收之后产生的新 Entry。MDN 对这一行为的描述是：`buffered` 用于将已经缓冲的 Entry 加入 Observer 的 buffer，同时继续订阅新的事件。[[23]](https://developer.mozilla.org/en-US/docs/Web/API/PerformanceObserver/observe)

因此从 SDK 的角度，数据来源实际上有两部分：

```text
                 Performance Timeline

注册 Observer 之前                     注册 Observer 之后
       │                                      │
       │ 已经记录                              │ 新产生
       ↓                                      ↓
 Entry A / Entry B                       Entry C / Entry D
       │                                      │
       │ buffered: true                       │ 正常 Observer 通知
       └─────────────────┬────────────────────┘
                         ↓
                PerformanceObserver
                         ↓
                   Callback
                         ↓
                     Collector
```

也就是说，`buffered: true` 并不是让 Observer 以后把数据“缓存起来”，而是解决 **Observer 注册之前已经发生过性能事件** 的问题。这里还有一个重要细节：**历史 Entry 和新 Entry 最终进入的是同一个 Observer 回调，并没有两套不同的 Callback。**

**<u>callback中的 `list` 是什么？</u>**

MDN 对 `PerformanceObserverEntryList` 的定义是：它包含**这次显式观察到的 Performance Entry**，`list.getEntries()` 返回当前这次回调中的那批记录。

假设：

```text
500ms   Entry A 已经产生
900ms   Entry B 已经产生

1500ms  observer.observe({
          type: 'largest-contentful-paint',
          buffered: true
        })

1600ms  Entry C 又产生

稍后浏览器执行 Observer callback
```

调用 `observe()` 时，规范要求把符合条件的 **buffered entries 加入 Observer 的队列**。与此同时，Observer 已经开始监听后续新产生的 Entry。

所以第一次 callback 中的 `list` 可能是：

```text
list
├─ Entry A   ← 注册前已经存在
├─ Entry B   ← 注册前已经存在
└─ Entry C   ← 注册后、callback 执行前新产生
```

> **第一次回调会包含通过 `buffered: true` 补进来的历史 Entry；如果回调真正执行之前又产生了新 Entry，这些新 Entry 也可能一起出现在这一批里。**

后续每次回调通常**不会再次重放那批历史 Entry**。

例如：

```text
第一次 callback
list = A、B、C

之后产生 Entry D、E
        ↓
第二次 callback
list = D、E

之后产生 Entry F
        ↓
第三次 callback
list = F
```

也就是说：

```text
buffered 历史数据
        ↓
主要在开始观察时补一次

之后
        ↓
Observer 持续接收新产生的 Entry
```

**<u>`list` 每次都会被重新生成可以把它理解成一个“批次”：</u>**

```js
const observer = new PerformanceObserver((list) => {
  // list 只代表这一次通知里的 Entry
  const entries = list.getEntries();
});
```

它不是：

```text
list1 = [A, B]
list2 = [A, B, C, D]
list3 = [A, B, C, D, E]
```

#### <u>3. Performance SDK 的性能数据采集框架</u>

前端性能监控的核心任务，是把页面运行过程中产生的不同性能数据转化为**可统一上报、聚合和分析的性能数据**。

```text
性能数据产生
    │
    ├─ 浏览器自动记录：PerformanceEntry
    ├─ SDK 主动测量：requestAnimationFrame 等运行时 API
    └─ 业务代码插桩：mark / measure / record
    │
    ↓
对应指标的数据采集与处理
    │ 获取原始数据
    │ 过滤、关联或聚合数据
    │ 按指标规则计算结果
    ↓
标准化
    │ 转换成统一 Performance Data
    ↓
SDK 公共链路
    │ Context：补充页面、版本、设备、Session
    │ Sampling：过滤与采样
    │ Queue / Batch：缓存与批量处理
    ↓
Reporter：发送到监控服务端
```

其中，**数据获取和指标计算具有指标差异，标准化以及之后的 Context、Sampling、Queue、Reporter 则可以统一复用。**

这些性能数据的来源并不相同：浏览器能够直接观察到的只是浏览器运行行为，而前端性能监控同时还需要覆盖**浏览器标准性能、连续运行状态和业务自定义性能**。

因此可以形成三类数据入口。

| 数据来源 | 适合的数据 | 核心方式 |
| -------------- | ------------------------------------------------ | ------------------------------------------ |
| 浏览器自动记录 | LCP、INP、CLS、Resource Timing、LoAF 等 | `PerformanceEntry` + `PerformanceObserver` |
| SDK 运行时测量 | 帧间隔、流畅度等需要连续计算的数据 | `requestAnimationFrame` 等运行时 API |
| 业务代码插桩 | 编辑器初始化、图表渲染、业务流程耗时、自定义指标 | User Timing、`measure()`、`record()` |

这三种方式的区别主要发生在**数据产生阶段**，得到数据以后都可以进入相同的“处理 → 计算 → 标准化”流程。

**<u>1. 浏览器自动记录：从 Performance Timeline 获取性能数据</u>**

浏览器本身参与页面导航、资源加载、布局、绘制和用户交互，因此能够直接记录这些过程。

W3C Performance Timeline（性能时间线）定义了统一的 `PerformanceEntry`（性能记录）模型，并提供 `PerformanceObserver`（性能观察器）监听新的性能记录。规范中明确指出，`PerformanceObserver` 可以用于观察 Performance Timeline，在新的 Performance Entry 被记录时收到通知，也可以获取已经缓冲的记录。[[14]](https://www.w3.org/TR/performance-timeline)

例如直接采集 LCP 的底层记录：

```js
const observer = new PerformanceObserver((list) => {
  const entries = list.getEntries();

  for (const entry of entries) {
    handleLCPEntry(entry);
  }
});

observer.observe({
  type: 'largest-contentful-paint',
  buffered: true
});
```

这里可以分成两层理解：

```text
浏览器
产生 largest-contentful-paint Entry

PerformanceObserver
负责把这些 Entry 交给监控逻辑

LCP 处理逻辑
继续根据 Entry 形成 LCP 指标
```

`PerformanceObserver` 得到的是浏览器记录，而不一定已经是最终性能指标。

例如 CLS 的输入是多条 `layout-shift` Entry，INP 的输入来自 `PerformanceEventTiming`，它们都需要进一步按照自己的指标定义进行处理。

**<u>`web-vitals`：直接复用标准 Web Vitals 的计算逻辑</u>**

对于 LCP、INP、CLS，实际项目通常不需要自行维护完整的 Entry 处理算法。

Google 官方 `web-vitals` 已经封装了底层 Performance API，并直接提供：

```js
import {
  onLCP,
  onINP,
  onCLS
} from 'web-vitals';

onLCP(handleMetric);
onINP(handleMetric);
onCLS(handleMetric);
```

`web-vitals` 官方说明，每个 Web Vital 都对应一个函数，当指标值准备好报告时调用传入的 callback；库内部还使用 `PerformanceObserver` 的 `buffered` 能力，以获取库加载前已经发生的 Performance Entry。[[9]](https://github.com/GoogleChrome/web-vitals)

因此企业 Performance SDK 更常见的接入可以是：

```js
import { onLCP } from 'web-vitals';

function startLCPCollection() {
  onLCP((metric) => {
    emitPerformance({
      type: 'performance',
      name: metric.name,
      value: metric.value,
      unit: 'ms',
      source: 'auto'
    });
  });
}
```

这里的职责已经发生变化：

```text
web-vitals
负责：
浏览器数据获取 + Web Vital 指标计算

Performance SDK
负责：
接收结果 + 转换成自己的统一数据结构
```

所以对于标准 Web Vitals，监控 SDK 更适合**复用成熟指标实现，而不是重新实现一套 LCP、INP、CLS 算法**。

---

**<u>2. SDK 运行时主动测量：从运行过程构造性能数据</u>**

有些性能数据浏览器不会直接产生一个现成的结果指标。

页面流畅度就是典型情况。

`requestAnimationFrame()`，简称 rAF（动画帧回调），会在浏览器准备进行下一次绘制之前执行 callback。SDK 可以持续记录这些 callback 的时间戳，从而观察相邻帧之间的时间间隔。

例如：

```js
function startFrameCollection() {
  let lastTime = null;
  const samples = [];

  function collect(currentTime) {
    if (lastTime !== null) {
      const interval = currentTime - lastTime;
      samples.push(interval);
    }

    lastTime = currentTime;
    requestAnimationFrame(collect);
  }

  requestAnimationFrame(collect);
}
```

假设记录到：

rAF 时间戳：100ms、116ms、133ms、170ms；对应间隔：16ms、17ms、37ms

SDK 可以在一段时间内保存这些样本，然后计算自己的工程指标，例如：

- Frame Interval P95：95% 的帧间隔不超过多少；
- Frame Budget Hit Rate：满足目标帧预算的比例；
- FPS：作为整体帧率的辅助观察指标。

因此这类数据和 LCP 不同：

| LCP | Frame |
| ------------------------ | ------------------------ |
| 浏览器已经产生性能 Entry | SDK 通过 rAF 连续采样 |
| 重点是处理浏览器记录 | 重点是根据时间戳构造样本 |
| 最终形成 LCP | 最终形成流畅度工程指标 |

但最终仍然可以转换成相同的 Performance Data。

**<u>3. 业务代码插桩：测量浏览器无法理解的业务过程</u>**

浏览器知道一个函数执行了、请求发生了、页面绘制了，但它不知道：

> “这段过程代表编辑器初始化。”

因此业务性能需要开发者主动给运行过程增加业务语义。

W3C User Timing（用户自定义计时）就是为这种场景设计的。规范提供 `performance.mark()` 和 `performance.measure()`，用于以高精度时间戳测量应用自己的代码过程；生成的 `PerformanceMark` 和 `PerformanceMeasure` 同样属于 Performance Timeline 中的 Performance Entry。[[24]](https://www.w3.org/TR/user-timing)

例如：

```js
performance.mark('editor-start');

await initEditor();

performance.mark('editor-end');

performance.measure(
  'editor-init',
  'editor-start',
  'editor-end'
);
```

浏览器会形成：

```js
{
  name: 'editor-init',
  entryType: 'measure',
  startTime: ...,
  duration: ...
}
```

监控 SDK 通常会再把这类 API 包装得更简单。

例如：

```js
await performance.measure(
  'editor-init',
  async () => {
    await initEditor();
  }
);
```

SDK 内部可以实现为：

```js
async function measure(name, callback) {
  const start = performance.now();

  await callback();

  const duration = performance.now() - start;

  emitPerformance({
    type: 'performance',
    name,
    value: duration,
    unit: 'ms',
    source: 'manual'
  });
}
```

这种 API 解决的是：

> **业务告诉 SDK“哪一段过程需要测量”，SDK 负责得到耗时并进入监控体系。**

**<u>代码插桩也不一定只用于计算 duration。</u>**

如果业务已经计算出了一个指标值，可以直接记录：

```js
const renderEfficiency =
  renderedCount / renderDuration;

performance.record(
  'render-efficiency',
  renderEfficiency,
  {
    scene: 'large-table'
  }
);
```

这类 API 可以理解为：

```js
function record(name, value, attributes) {
  emitPerformance({
    type: 'performance',
    name,
    value,
    source: 'manual',
    attributes
  });
}
```

OpenTelemetry Metrics 也采用这种模式：业务可以直接向同步 Metric Instrument 提交 Measurement（测量值），例如 `record(value)`；指标值由调用方产生，Telemetry SDK 负责后续记录、聚合和导出。[[25]](https://opentelemetry.io/docs/specs/otel/metrics/api)

因此业务代码插桩实际上覆盖两种需求：

| 需求 | API 形式 | 示例 |
| -------------------------- | ------------------------- | -------------------------- |
| 测量一段业务过程耗时 | `measure()` / `start-end` | 编辑器初始化耗时 |
| 记录业务已经计算好的性能值 | `record(name, value)` | 渲染效率、业务自定义 Score |

---

**<u>单个性能指标的数据处理单元</u>**

数据进入 SDK 后，不同指标不能直接使用完全相同的处理算法。

LCP、CLS、Frame 和 Resource Timing 的数据结构与计算规则都不同，因此更适合把**某一种性能数据的特有逻辑集中管理**。

一个完整的数据处理单元通常包含四项职责：

| 阶段 | 作用 | LCP 示例 | Frame 示例 |
| ---------- | -------------------------- | ------------------------ | ----------------- |
| 数据获取 | 获得当前指标需要的原始数据 | `web-vitals` / LCP Entry | rAF 时间戳 |
| 数据处理 | 整理指标特有的数据关系 | 处理 LCP Candidate | 计算相邻 rAF 间隔 |
| 指标计算 | 在需要时形成最终 Metric | 得到 LCP | 计算 Frame P95 |
| 数据标准化 | 转换成统一 SDK 协议 | `PerformanceData` | `PerformanceData` |

因此 LCP 可以实现为：

```js
function startLCP() {
  onLCP((metric) => {
    const data = normalizePerformance({
      name: 'LCP',
      value: metric.value,
      unit: 'ms',
      kind: 'metric',
      source: 'auto'
    });

    emit(data);
  });
}
```

Frame 则可以实现为：

```js
function startFrame() {
  const samples = [];

  observeFrameInterval((interval) => {
    samples.push(interval);
  });

  // 在约定的统计窗口结束后计算
  const value = percentile(samples, 95);

  emit(
    normalizePerformance({
      name: 'frame-interval-p95',
      value,
      unit: 'ms',
      kind: 'metric',
      source: 'auto'
    })
  );
}
```

Manual Timing：

```js
async function measure(name, callback) {
  const start = performance.now();

  await callback();

  const duration = performance.now() - start;

  emit(
    normalizePerformance({
      name,
      value: duration,
      unit: 'ms',
      kind: 'custom',
      source: 'manual'
    })
  );
}
```

三种实现完全不同，但是最终都调用：

```js
emit(performanceData);
```

这就是性能采集架构中真正需要统一的边界。

**<u>标准化：统一的是数据协议，而不是指标算法</u>**

标准化之前，不同性能数据可能长这样：

```js
// web-vitals Metric
{
  name: 'LCP',
  value: 2180,
  id: 'v4-...'
}
```

```js
// Frame Metric
{
  p95: 28.6,
  samples: 320
}
```

```js
// Resource Timing
{
  name: '/app.js',
  duration: 360,
  transferSize: 180000
}
```

进入 SDK 公共链路以后，可以约定统一基础结构：

```ts
interface PerformanceData {
  type: 'performance';

  name: string;
  value?: number;
  unit?: string;

  kind: 'metric' | 'diagnostic' | 'custom';
  source: 'auto' | 'manual';

  detail?: Record<string, unknown>;
  attributes?: Record<string, string | number>;

  timestamp: number;
}
```

LCP：

```js
{
  type: 'performance',
  name: 'LCP',
  value: 2180,
  unit: 'ms',
  kind: 'metric',
  source: 'auto',
  timestamp: ...
}
```

业务 Timing：

```js
{
  type: 'performance',
  name: 'editor-init',
  value: 420,
  unit: 'ms',
  kind: 'custom',
  source: 'manual',
  timestamp: ...
}
```

Resource Timing：

```js
{
  type: 'performance',
  name: 'resource',
  value: 360,
  unit: 'ms',
  kind: 'diagnostic',
  source: 'auto',

  detail: {
    url: '/app.js',
    transferSize: 180000
  },

  timestamp: ...
}
```

标准化完成后，SDK 后面的模块不需要再知道：

- LCP 是通过 `web-vitals` 还是自己监听 Entry；
- Frame 数据来自 rAF；
- `editor-init` 来自 User Timing 还是 `measure()`；
- Resource Timing 有哪些浏览器专属字段。

它们统一面对 `PerformanceData`。

**<u>Performance SDK 的接入 API</u>**

SDK 的接入方式可以按照“自动采集”和“业务主动插桩”分别设计，而不是让所有场景都使用一个万能函数。

性能指标之间真正不同的是**数据来源和指标算法**，因此内部更适合按照指标或数据类型拆分：

```text
Performance
│
├─ LCP
│  使用 web-vitals / Performance API，形成 LCP 数据
│
├─ INP
│  使用 web-vitals / Event Timing，形成 INP 数据
│
├─ CLS
│  使用 web-vitals / Layout Shift，形成 CLS 数据
│
├─ Resource
│  获取 Resource Timing，形成资源诊断数据
│
├─ Frame
│  通过 rAF 采样并计算流畅度数据
│
└─ Manual
   接收 measure / record 产生的业务性能数据

所有模块最终：
→ normalizePerformance()
→ emit(PerformanceData)
```

这种组织方式的关键是：

> **指标特有逻辑按指标隔离，公共数据协议和后续处理统一。**

**<u>自动指标通过初始化配置开启。</u>**

例如：

```js
monitor.init({
  performance: {
    lcp: true,
    inp: true,
    cls: true,
    resource: true,
    frame: true
  }
});
```

SDK 初始化以后，根据配置启动对应的性能采集模块：

```js
const performanceModules = {
  lcp: startLCP,
  inp: startINP,
  cls: startCLS,
  resource: startResource,
  frame: startFrame
};
```

这种指标不需要业务在每次页面运行时主动调用 API。

**<u>业务性能则通过代码插桩 API 接入。</u>**

测量某一段业务过程：

```js
performance.measure(
  'editor-init',
  () => initEditor()
);
```

记录已经计算好的业务指标：

```js
performance.record(
  'render-efficiency',
  0.86,
  {
    scene: 'large-table'
  }
);
```

因此 API 语义可以保持非常简单：

| API | 用途 |
| --------------------------------- | ------------------------------ |
| `init({ performance })` | 开启浏览器和运行时自动性能采集 |
| `measure(name, callback)` | 测量某段业务过程的耗时 |
| `record(name, value, attributes)` | 记录业务已经得到的自定义性能值 |

---

最终，整个 Performance SDK 的性能采集框架可以归纳为：

```text
┌──────────────────── 性能数据产生 ────────────────────┐
│                                                     │
│ 浏览器自动记录            SDK 运行时测量      业务代码插桩 │
│ PerformanceEntry          rAF 等 API          User Timing │
│ web-vitals                                  measure/record │
└──────────┬─────────────────┬────────────────┬──────────────┘
           │                 │                │
           ↓                 ↓                ↓
      对应指标的数据获取与处理模块
      每种指标维护自己的数据来源和计算规则
                          │
                          ↓
              normalizePerformance()
              转换成统一 PerformanceData
                          │
                          ↓
       Context → Sampling → Queue / Batch → Reporter
                          │
                          ↓
                    Monitoring Server
```

#### <u>4. Performance Data 的公共处理与上报链路</u>

性能数据在前面的采集阶段完成指标计算和标准化以后，已经形成统一的 `Performance Data`。从这个阶段开始，SDK 不再关心这条数据原本来自 `PerformanceObserver`、`web-vitals`、rAF，还是业务代码插桩，而是进入一套公共的数据处理与上报链路。

这部分主要解决四个问题：

| 阶段 | 解决的问题 |
| ----------------------------------- | ------------------------------------------------------ |
| **Context（上下文补充）** | 这条性能数据发生在什么页面、版本、设备和会话中 |
| **Filter / Sampling（过滤与采样）** | 哪些数据需要保留，哪些数据没有必要全部上传 |
| **Queue / Batch（队列与批量处理）** | 数据什么时候发送，以及如何避免一条数据发一次请求 |
| **Reporter（上报器）** | 在合适的页面生命周期中，通过什么方式把数据发送到服务端 |

因此 Performance SDK 从统一数据形成到真正上报，可以组织成：

```text
Collector 输出统一 Performance Data
        │
        │ 例如：
        │ { name: 'LCP', value: 2180, type: 'performance' }
        ↓
Context Processor
补充当前页面运行环境
        ↓
Filter / Sampling
决定这条数据是否继续进入上报链路
        ↓
Report Queue
暂存等待发送的数据
        ↓
Batch
把多条数据组合成一次发送批次
        ↓
Reporter
根据定时、数量或页面生命周期触发发送
        ↓
sendBeacon / fetch
        ↓
Monitoring Server
```

从这里开始，LCP、CLS、Resource Timing 或业务自定义 Metric 都可以复用同一条链路。

**<u>1. Context：让单独的 Metric 具有分析意义</u>**

Collector 最初产生的数据通常只能说明：

```js
{
  name: 'LCP',
  value: 2180
}
```

这能够说明“这一次 LCP 是 2180ms”，但单独一条数据并不能回答：

- 哪个页面发生的；
- 哪个前端版本发生的；
- 用户使用什么设备；
- 是移动端还是桌面端；
- 当前网络环境如何；
- 是否属于同一次页面访问。

因此在数据进入上报链路后，通常首先补充 **Context（上下文）**。

例如：

```js
{
  type: 'performance',
  name: 'LCP',
  value: 2180,
  unit: 'ms',

  context: {
    route: '/home',
    version: '2.4.1',
    browser: 'Chrome',
    deviceType: 'mobile',
    networkType: '4g',
    sessionId: 'xxx'
  },

  timestamp: 1710000000000
}
```

Context 的作用不是改变 LCP，而是给这条 LCP 增加**分析维度**。

例如服务端之后就可以比较：

```text
/home 页面：
移动端 LCP P75
vs
桌面端 LCP P75

版本 2.4.0
vs
版本 2.4.1

4G 网络
vs
Wi-Fi 网络
```

OpenTelemetry 同样把 Resource（资源属性）和 Context（上下文传播）作为遥测数据的重要组成部分，用于描述数据产生的环境，而不是把所有环境信息写进具体的指标采集逻辑。[[26]](https://opentelemetry.io/docs/languages/js)

因此这一层的核心职责是：

> **把“一个数值”转换成“发生在明确运行环境中的一次性能样本”。**

**<u>2. Filter 与 Sampling：控制进入上报链路的数据量</u>**

完成 Context 补充以后，并不意味着所有 Performance Data 都必须发送到服务器。

原因是不同性能数据的数据量差别非常大。

例如一次页面访问通常只有少量：

LCP；INP；CLS

但是可能同时产生：

200 条 Resource Timing；几十条 Long Task；多条 LoAF；数百甚至数千个 Frame 样本

如果每一条原始诊断数据都进入网络上报，会同时增加：

- 浏览器网络请求开销；
- SDK 内存占用；
- 服务端写入量；
- 数据库存储量；
- 查询和聚合成本。

因此这里通常有两种不同的控制手段。

**Filter（过滤）**负责判断：

> **这条数据本身有没有必要上报。**

例如 Resource Timing 可以只保留：

```js
if (entry.duration > 500) {
  keep(entry);
}
```

或者过滤监控系统自身请求：

```js
if (!isMonitoringRequest(entry.name)) {
  keep(entry);
}
```

因此 Filter 更像是：

```text
100 条 Resource Timing
        ↓
过滤：
监控自身请求
无关资源
不需要关注的数据
        ↓
剩余 25 条
```

---

**Sampling（采样）**解决的是另一件事情：

> **这类有效数据很多，但没有必要 100% 全部保留。**

例如只采集 10% 的诊断会话：

```js
const sampled = Math.random() < 0.1;

if (sampled) {
  collectDiagnostics();
}
```

也可以根据不同数据类型设置不同策略：

```text
Core Web Vitals
LCP / INP / CLS
→ 数据量低、价值高
→ 可以采用较高采集率

Resource / Long Task / LoAF
→ 数据量高
→ 可以降低采集率

Frame Samples
→ 数据非常密集
→ 通常先在浏览器聚合
→ 只上传 P95、命中率等结果
```

这里尤其需要区分：

> **Frame Collector 通常不会把每一次 rAF 的时间间隔全部发送到服务器，而是在浏览器中先聚合成少量指标再发送。**

例如 SDK 内部记录了：

```js
[
  16, 17, 16, 18, 42,
  16, 71, 17, 16, ...
]
```

最终可能只上传：

```js
{
  name: 'frame-interval',
  p95: 31,
  budgetHitRate: 0.92
}
```

因此控制数据量并不只有 Sampling，也包括**在客户端提前聚合**。

OpenTelemetry 将 Sampling 明确定义为减少产生或保留的遥测数据量的一种机制，例如按比例只保留部分 Trace。虽然前端 Performance SDK 的具体采样策略需要自行设计，但“通过采样控制遥测规模”是通用的可观测性工程方法。[[27]](https://opentelemetry.io/docs/languages/js/sampling)

**<u>3. Queue 与 Batch：避免一条 Metric 发送一次请求</u>**

经过 Filter 和 Sampling 后的数据已经确定需要上报，但仍然不适合立即执行：

```js
fetch('/monitor', data);
```

如果每产生一条数据就发送一次请求：

```text
LCP → Request 1
CLS → Request 2
Resource → Request 3
Long Task → Request 4
LoAF → Request 5
...
```

大量小请求本身就会产生额外网络开销。

因此通常会先建立 **Report Queue（上报队列）**。

例如：

```js
const queue = [];

function enqueue(data) {
  queue.push(data);
}
```

LCP、CLS、Resource 等产生以后只负责：

```js
enqueue(performanceData);
```

此时：

```text
Queue
────────────────────────────
LCP
CLS
Resource A
Resource B
Long Task
Custom Metric
────────────────────────────
```

Queue 解决的是：

> **数据先暂存在哪里。**

而 Batch（批量处理）解决的是：

> **一次从 Queue 中取多少条数据发送。**

例如：

```js
function flush() {
  const batch = queue.splice(0, queue.length);

  reporter.send(batch);
}
```

最终一次请求可能发送：

```js
[
  { name: 'LCP', value: 2180 },
  { name: 'CLS', value: 0.08 },
  { name: 'editor-init', value: 420 }
]
```

因此：

```text
Queue = 数据等待区

Batch = 从等待区中组织一个发送批次
```

这两个概念不能完全等同。

Google 官方 `web-vitals` 文档也专门给出了 Batch Reporting（批量上报）的例子：多个 Web Vitals Metric 先进入一个 `Set` 队列，再在合适的时机统一序列化并通过一次 `sendBeacon()` 发送，从而减少网络请求数量。[[9]](https://github.com/GoogleChrome/web-vitals)

**<u>4. Reporter：决定什么时候发送、使用什么方式发送</u>**

Reporter（上报器）负责的已经不是性能指标计算，而是：

> **把 Queue 中已经准备好的 Performance Data 真正发送到监控服务端。**

因此 Reporter 主要需要解决两个问题：

| 问题 | 典型策略 |
| ------------ | ---------------------------------- |
| 什么时候发送 | 定时、Queue 达到阈值、页面进入后台 |
| 怎么发送 | `sendBeacon()`、`fetch()` |

页面运行过程中可以按一定策略主动 flush，例如：

```js
if (queue.length >= 20) {
  flush();
}
```

或者定时处理：

```js
setInterval(() => {
  flush();
}, 5000);
```

这里具体选择多少条、多少秒属于 SDK 自己的成本和实时性权衡，并不存在统一的 Web 标准值。

---

**<u>Reporter 的发送方式：`sendBeacon()` 与 `fetch()`</u>**

Reporter（上报器）接收到的已经不是一条单独的 LCP、CLS 或 Resource 数据，而是前面经过 Queue（队列）和 Batch（批量处理）整理好的一批监控数据。

例如：

```js
const batch = [
  { name: 'LCP', value: 2180 },
  { name: 'CLS', value: 0.08 },
  { name: 'editor-init', value: 420 }
];
```

Reporter 此时只需要解决一个问题：

> **这批数据现在应该通过什么方式发送给监控服务端。**

浏览器端常见有两种发送方式：普通的 `fetch()`，以及更适合页面生命周期结束阶段的 `navigator.sendBeacon()`。

**<u>1. 页面正常运行时，可以直接使用 `fetch()`</u>**

当页面仍然正常运行时，例如 Queue 达到一定数量，或者到了定时上报时间，可以直接使用 `fetch()`：

```js
function sendByFetch(batch) {
  return fetch('/performance', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(batch)
  });
}
```

它的特点是请求能力完整：

可以指定 GET / POST 等 Method；可以设置 Header；可以读取服务端 Response；可以进行较复杂的请求控制

因此正常运行期间，例如：

Queue 已经累计 20 条数据 → 组成一个 Batch → Reporter 使用 fetch() → Monitoring Server

`fetch()` 就足够。

**<u>2. 页面即将进入后台时，普通请求存在丢失风险</u>**

页面运行期间还有一个特殊场景。

假设 Queue 中还有一批没有发送的数据：

LCP；CLS；Resource Timing；Custom Metric

此时用户突然：

切换到其他页面；关闭当前页面；切换 Tab；切换到其他 App

页面可能很快进入 `hidden` 状态，甚至被浏览器停止或销毁。

如果此时只是普通地执行：

```js
fetch('/performance', {
  method: 'POST',
  body: JSON.stringify(batch)
});
```

页面生命周期结束后，请求不一定能够继续可靠执行。

因此监控 SDK 通常会监听页面的 `visibilitychange`：

```js
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') {
    flush();
  }
});
```

这里的意思是：

> **当页面即将离开用户视野时，不再继续等待下一次定时上报，而是立即把 Queue 中的数据发送出去。**

MDN 也推荐使用页面进入 `hidden` 作为发送 Analytics（分析数据）的重要生命周期时机。[[28]](https://developer.mozilla.org/en-US/docs/Web/API/Document/visibilitychange_event)

**<u>3. `sendBeacon()` 解决的是“页面结束时仍然要发送数据”</u>**

Beacon API 就是针对这种场景设计的。

```js
navigator.sendBeacon(
  '/performance',
  JSON.stringify(batch)
);
```

调用 `sendBeacon()` 时，浏览器并不是等待请求完成以后再让页面结束。

它更接近：

Reporter → 把这批数据交给浏览器 → 浏览器把数据加入发送队列 → sendBeacon() 很快返回 → 页面可以继续进入 hidden / 被卸载 → 浏览器负责尝试把数据发送出去

因此它适合：

> **页面即将进入后台或结束时，把最后一批监控、埋点、分析数据尽快交给浏览器发送。**

例如：

```js
function flush() {
  const batch = queue.splice(0);

  navigator.sendBeacon(
    '/performance',
    JSON.stringify(batch)
  );
}
```

完整过程就是：

Queue 中还有监控数据 → 页面变成 hidden → 触发 flush() → 取出 Queue 中的数据形成 Batch → sendBeacon() → 把 Batch 交给浏览器发送

这也是 `sendBeacon()` 在 RUM（Real User Monitoring，真实用户监控）和埋点系统中很常见的原因。

**<u>4. `sendBeacon()` 和 `fetch()` 的区别不在“发送什么数据”，而在“需要什么请求能力”</u>**

两者都可以用来发送性能数据。

区别主要在发送场景和请求控制能力：

| 场景 | 更适合 |
| ------------------------------------------ | -------------- |
| 页面正常运行，普通批量上报 | `fetch()` |
| 页面进入后台，需要尽快提交最后一批数据 | `sendBeacon()` |
| 需要自定义 Method、Header | `fetch()` |
| 需要读取服务端响应 | `fetch()` |
| 只需要把少量分析数据交给服务端，不关心响应 | `sendBeacon()` |

`sendBeacon()` 的功能比较受限。

例如：

```js
navigator.sendBeacon(url, data);
```

主要只能提供：

发送地址 + 发送数据

它不会像 `fetch()` 一样返回服务器 Response 给业务处理。

因此它非常适合监控场景：

“把数据发出去即可，不需要服务端返回结果影响当前页面。”

MDN 对 Beacon API 的定位也是用于异步发送少量 Analytics 和 Diagnostics（诊断）数据。[[29]](https://developer.mozilla.org/en-US/docs/Web/API/Navigator/sendBeacon)

**<u>5. `fetch({ keepalive: true })` 是另一种生命周期发送方案</u>**

如果页面即将结束，但又需要 `fetch()` 更完整的请求能力，可以使用：

```js
fetch('/performance', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(batch),
  keepalive: true
});
```

`keepalive: true` 的含义是：

> **即使发起请求的页面正在卸载，也允许浏览器继续处理这个请求。**

因此生命周期阶段实际上有两个选择：

```text
只需要简单发送监控数据
→ sendBeacon()

需要 Header / Method / Response 等 fetch 能力
→ fetch({ keepalive: true })
```

MDN 也明确指出，如果需要更强的请求控制能力，可以使用带 `keepalive` 的 `fetch()`。[[29]](https://developer.mozilla.org/en-US/docs/Web/API/Navigator/sendBeacon)

---

Reporter 并不是：

LCP 用 sendBeacon；CLS 用 fetch；Resource 用另一种方式

这些性能指标在进入 Reporter 之前已经被统一处理。

Reporter 面对的是：

```js
batch = [
  PerformanceData,
  PerformanceData,
  PerformanceData
];
```

它真正判断的是**当前发送场景**。

例如：

```js
function report(batch, reason) {
  const body = JSON.stringify(batch);

  // 页面即将进入后台
  if (reason === 'page-hidden') {
    navigator.sendBeacon('/performance', body);
    return;
  }

  // 页面正常运行
  fetch('/performance', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body
  });
}
```

因此 Reporter 的整体逻辑是：

```text
Queue
已经积累待发送数据
        ↓
Batch
整理成一个发送批次
        ↓
Reporter
判断当前发送时机
        │
        ├─ 页面正常运行
        │      → fetch()
        │
        └─ 页面进入 hidden
               → sendBeacon()
               或 fetch({ keepalive: true })
        ↓
Monitoring Server
```

**<u>5. 从单次 Performance Data 到线上性能指标</u>**

到 Reporter 为止，浏览器侧处理的是**单次真实用户访问产生的性能样本**。

例如一次访问上报：

```js
{
  route: '/home',
  version: '2.4.1',
  deviceType: 'mobile',

  name: 'LCP',
  value: 2180
}
```

另一名用户可能上报：

```js
{
  route: '/home',
  version: '2.4.1',
  deviceType: 'mobile',

  name: 'LCP',
  value: 4100
}
```

随着线上访问增加，服务端会收到大量：

```text
/home + mobile + 2.4.1

LCP = 1400ms
LCP = 1900ms
LCP = 2200ms
LCP = 3600ms
LCP = 5100ms
...
```

此时才进入 Aggregation（聚合）。

服务端可以按照 Context 中携带的维度进行分组：

Route；Version；Device；Browser；Network；Region

再计算：

P50；P75；P95；Good / Needs Improvement / Poor 占比；版本变化趋势；异常页面排名

因此浏览器里的：

LCP = 2180ms

表示的是：

> **某一次真实页面访问的 LCP。**

服务端的：

/home Mobile LCP P75 = 2.6s

表示的才是：

> **大量真实用户样本聚合以后，这个页面当前整体的线上性能水平。**

这也是为什么 Context 在公共链路的第一步非常重要--没有 Route、Version、Device 等维度，服务端就只能得到一堆孤立的数值，很难定位问题属于哪个页面和环境。

---

这部分可以概括为：

> **性能采集模块负责产生统一的 Performance Data；之后 SDK 通过 Context 为数据补充分析维度，通过 Filter 和 Sampling 控制数据规模，通过 Queue 和 Batch 控制发送频率，再由 Reporter 根据正常运行和页面生命周期选择合适的发送时机与传输方式。服务端收到大量真实用户样本以后，再按照页面、版本、设备等维度进行聚合，最终形成 P75、P95、趋势、告警等线上性能结论。**

这样，前半段解决的是**“性能数据怎么算出来”**，后半段解决的就是**“算出来的数据如何低成本、可靠地进入监控平台，并最终变成可分析的线上指标”**。

---

### 【结果指标的采集链路】

Performance SDK 在采集具体性能指标时，不能只理解成“监听一个 `PerformanceEntry`，然后读取 `duration`”。不同指标对应的浏览器记录不同，记录产生时机不同，最终形成指标的方式也不同。

一项性能数据从浏览器运行过程到形成监控指标，可以统一理解为：

```text
页面发生具体运行行为
        ↓
浏览器产生对应 PerformanceEntry
或 SDK 通过运行时 API 获得采样数据
        ↓
PerformanceObserver / web-vitals / rAF 获取数据
        ↓
按照该指标自己的规则处理
        ↓
形成一次页面访问中的 Metric 或 Diagnostic Data
        ↓
标准化并上报
```

这里还需要先区分两个不同层次的“聚合”。

**页面内计算**发生在一次用户访问中。例如多条 LCP Candidate 形成一个 LCP，多条 Event Timing 形成一个 INP，多条 Layout Shift 形成一个 CLS。这是在定义“本次页面访问的指标值”。

**服务端统计聚合**发生在大量用户访问之间。例如服务器收到 10 万次访问的 LCP，再计算 `LCP P75 / P95`。LCP、INP、CLS 都可以计算 P75/P95。Google 对 Core Web Vitals 的线上评价使用页面访问样本的第 75 百分位。[[21]](https://web.dev/articles/defining-core-web-vitals-thresholds)

因此：

```text
一次访问：
LCP = 2.1s
INP = 180ms
CLS = 0.08

大量访问：
LCP P75 = 2.4s
INP P75 = 190ms
CLS P75 = 0.09
```

而下面提到的 `Frame Interval P95` 是另一回事：它通常是**在一次采样窗口内部，对大量帧间隔进行统计得到的自定义工程指标**，不是与 LCP、INP、CLS 并列的 Web 标准指标。

#### <u>1. FCP：浏览器第一次绘制实际内容时产生 Paint Entry</u>

FCP（First Contentful Paint，首次内容绘制）表示页面第一次绘制 DOM 文本、图片等实际内容的时间。

浏览器第一次完成 Contentful Paint（内容绘制）时，会产生一条 `PerformancePaintTiming`。W3C Paint Timing 规定，这条记录的 `entryType` 为 `paint`，`name` 为 `first-contentful-paint`，`startTime` 表示该次绘制发生的时间，`duration` 固定为 `0`。[[30]](https://www.w3.org/TR/paint-timing)

一条记录大致是：

```js
{
  name: 'first-contentful-paint',
  entryType: 'paint',

  // 相对于页面时间原点，第一次内容绘制发生的时间
  startTime: 732.4,

  // Paint Timing 是一个时间点，不是一段持续过程
  duration: 0
}
```

SDK 可以直接监听：

```js
const observer = new PerformanceObserver((list) => {
  for (const entry of list.getEntries()) {
    if (entry.name === 'first-contentful-paint') {
      const fcp = entry.startTime;

      report({
        name: 'FCP',
        value: fcp
      });
    }
  }
});

observer.observe({
  type: 'paint',
  buffered: true
});
```

因此 FCP 的形成非常直接：

> **第一次内容绘制发生 → 浏览器产生一条 `first-contentful-paint` Entry → SDK 读取 `startTime` → 得到本次页面的 FCP。**

它通常不需要像 INP、CLS 那样在页面内聚合很多 Entry。

#### <u>2. LCP：每出现新的最大内容候选，都可能产生新的 LCP Entry</u>

LCP（Largest Contentful Paint，最大内容绘制）关注的是视口内最大文本块或图片什么时候完成呈现。

LCP 和 FCP 最大的区别在于：**“最大内容”可能随着页面加载不断变化。**

例如页面运行：

500ms 标题完成绘制，当前最大元素是标题；900ms Banner 完成绘制，Banner 比标题更大；1800ms Hero 图片完成绘制，Hero 比 Banner 更大

当浏览器发现一个新的、符合 LCP 条件并且大于当前候选的内容元素完成呈现时，会产生新的 `LargestContentfulPaint` Entry。页面后续又出现更大的元素，就会继续产生新的 Entry。用户开始通过点击、滚动或按键与页面交互后，浏览器会停止报告新的 LCP Entry。[[31]](https://www.w3.org/TR/largest-contentful-paint) [[32]](https://web.dev/articles/lcp)

一条 LCP Entry 大致包含：

```js
{
  entryType: 'largest-contentful-paint',

  // 规范中 LCP Entry 的 name 为空字符串
  name: '',

  // 当前候选内容真正呈现的时间
  startTime: 1820.4,
  renderTime: 1820.4,

  // 如果候选是图片，可以记录资源加载完成时间
  loadTime: 1680.2,

  // 当前候选元素用于 LCP 比较的大小
  size: 356000,

  // 元素自身信息
  id: 'hero-image',
  url: 'https://example.com/hero.jpg',
  element: /* 对应 DOM Element */,

  duration: 0
}
```

`LargestContentfulPaint` 标准接口明确包含 `renderTime`、`loadTime`、`size`、`id`、`url`、`element`；其 `startTime` 返回当前 Entry 的绘制时间。[[31]](https://www.w3.org/TR/largest-contentful-paint)

SDK 可以直接监听：

```js
let latestLCPEntry;

const observer = new PerformanceObserver((list) => {
  for (const entry of list.getEntries()) {
    // 每产生一个新的候选，更新当前 LCP Candidate
    latestLCPEntry = entry;
  }
});

observer.observe({
  type: 'largest-contentful-paint',
  buffered: true
});
```

假设 SDK 依次收到：

```js
// 标题
{
  startTime: 500,
  size: 42000,
  element: /* h1 */
}

// Banner
{
  startTime: 900,
  size: 180000,
  element: /* banner */
}

// Hero Image
{
  startTime: 1800,
  size: 356000,
  element: /* img */
}
```

这里不是：

500 + 900 + 1800

也不是求平均值。

而是浏览器已经按照 LCP Candidate 规则不断产生当前候选，指标计算最终需要确定**最后一个有效的候选记录**：

```text
Candidate A：标题
        ↓
出现更大的 Banner

Candidate B：Banner
        ↓
出现更大的 Hero

Candidate C：Hero
        ↓
LCP 观察结束
        ↓
本次页面 LCP ≈ Candidate C 的呈现时间
```

不过直接使用 Performance API 测量 LCP 还涉及后台 Tab、BFCache、Prerender 等生命周期差异，因此 Google 推荐生产环境直接使用 `web-vitals`。[[32]](https://web.dev/articles/lcp)

```js
import { onLCP } from 'web-vitals';

onLCP((metric) => {
  report({
    name: 'LCP',
    value: metric.value
  });
});
```

这时链路变成：

> **浏览器产生 LCP Candidate Entry → `web-vitals` 处理 Candidate 和页面生命周期 → 输出本次页面的 LCP Metric → SDK 标准化并上报。**

同时，LCP Entry 中的 `element`、`url`、`size`、`loadTime` 等字段还能作为后续加载诊断的基础。

#### <u>3. INP：一次用户操作会产生多个 Event Timing，再通过 `interactionId` 组成一次 Interaction</u>

INP（Interaction to Next Paint，交互到下一次绘制）不能简单理解成“click 事件执行了多久”。

一次用户操作通常会触发多个 DOM Event。

例如一次鼠标点击可能产生：

pointerdown；pointerup；click

一次键盘操作可能涉及：

keydown；keyup

Event Timing API 会针对其中符合条件的事件产生 `PerformanceEventTiming`。连续型事件，例如 `pointermove`、`mousemove`、`wheel` 等，目前不属于 INP 使用的这类 Interaction。[[33]](https://www.w3.org/TR/event-timing)

一条 Event Timing 大致如下：

```js
{
  // 当前是哪一个 DOM Event
  name: 'click',

  entryType: 'event',

  // 用户物理输入发生的大致时间
  startTime: 5200.2,

  // 从输入发生，到浏览器下一次可以完成相关绘制的完整延迟
  duration: 184,

  // 浏览器真正准备开始派发事件处理函数
  processingStart: 5240.1,

  // 所有相关事件处理函数执行结束
  processingEnd: 5310.5,

  // 当前事件属于哪一次逻辑用户交互
  interactionId: 347,

  target: /* button element */,
  targetSelector: '#submit',

  cancelable: true
}
```

W3C Event Timing 对这些字段有明确规定：`startTime` 来自事件时间戳，`processingStart` 表示事件处理开始，`processingEnd` 表示事件分发结束，`duration` 一直延伸到处理完成后的下一次 Rendering Update（渲染更新）。[[33]](https://www.w3.org/TR/event-timing)

因此一条 Event Timing 可以拆成：

```text
用户产生输入
startTime
    │
    │ Input Delay
    │ = processingStart - startTime
    ↓
processingStart
    │
    │ Processing Duration
    │ = processingEnd - processingStart
    ↓
processingEnd
    │
    │ Presentation Delay
    ↓
下一次画面能够呈现
```

这三部分共同构成用户感觉到的交互延迟。[[34]](https://web.dev/articles/optimize-inp)

---

**<u>`interactionId` 如何把多个 Event 组成一次交互</u>**

假设用户点击一个按钮。

浏览器可能记录：

```js
{
  name: 'pointerdown',
  interactionId: 347,
  duration: 80
}

{
  name: 'pointerup',
  interactionId: 347,
  duration: 96
}

{
  name: 'click',
  interactionId: 347,
  duration: 184
}
```

三条 Entry 的：

interactionId = 347

相同，因此它们属于**同一次用户 Interaction（交互）**。

这个 ID 并不是 SDK 自己生成的。

Event Timing 标准内部会维护交互关系。对于 Pointer Interaction（指针交互），`pointerdown` 出现后先处于待确定状态；当对应的 `pointerup` 到来时，浏览器给二者分配同一个新的 `interactionId`，后续对应的 `click` 也会尽量匹配到这个 ID。对于键盘操作，`keydown` 与后续匹配的 `keyup` 会获得相同的 Interaction ID。[[33]](https://www.w3.org/TR/event-timing)

因此 SDK 不需要自己根据时间猜：

pointerdown 和 click 是不是一次操作？

而是：

```js
const interactions = new Map();

function handleEntry(entry) {
  if (!entry.interactionId) return;

  const entries =
    interactions.get(entry.interactionId) || [];

  entries.push(entry);

  interactions.set(entry.interactionId, entries);
}
```

这样得到：

```text
Interaction 347
├─ pointerdown  80ms
├─ pointerup    96ms
└─ click       184ms
```

一次 Interaction 的 Latency（交互延迟）取这一组相关 Event 中**持续时间最长的 Event**：

```text
Interaction 347
= max(80ms, 96ms, 184ms)
= 184ms
```

Google 对 INP 的说明也明确指出：一个 Interaction 可以包含多个 Event，其中持续时间最长的 Event 决定该 Interaction 的延迟。[[22]](https://web.dev/articles/inp)

---

**<u>多个 Interaction 如何形成 INP</u>**

页面生命周期中继续发生：

```text
Interaction 347 = 184ms
Interaction 351 = 92ms
Interaction 355 = 420ms
Interaction 362 = 130ms
```

INP 观察的是**整个页面访问期间所有有效 Interaction**。

对于绝大多数交互次数较少的页面，最慢的 Interaction 就是本次页面访问的 INP；对于交互次数非常多的页面，为降低偶发异常值影响，每 50 次 Interaction 会忽略一个最高值。[[22]](https://web.dev/articles/inp)

因此：

```text
DOM Event
        ↓
PerformanceEventTiming
        ↓
interactionId 相同的 Event
组成一次 Interaction
        ↓
取该 Interaction 中最长 Event duration
        ↓
得到每一次 Interaction Latency
        ↓
比较整次页面访问中的 Interaction
        ↓
按 INP 规则处理离群值
        ↓
得到本次访问的 INP
```

生产监控中同样更适合：

```js
import { onINP } from 'web-vitals';

onINP((metric) => {
  report({
    name: 'INP',
    value: metric.value
  });
});
```

而 Event Timing 的 `processingStart`、`processingEnd` 等原始记录，则主要用于进一步解释这次慢交互到底慢在 Input Delay、JavaScript 处理还是后续呈现。

#### <u>4. CLS：每一次可见元素发生非预期位移都会形成 LayoutShift Entry</u>

CLS（Cumulative Layout Shift，累计布局偏移）衡量的是页面视觉稳定性。

当一个**已经可见的元素在相邻两帧之间改变位置**时，浏览器可以产生一个 `LayoutShift` Entry。[[35]](https://developer.mozilla.org/en-US/docs/Web/API/LayoutShift)

一条记录大致是：

```js
{
  entryType: 'layout-shift',

  // 这次位移发生的时间
  startTime: 11317.9,

  // 单次 Layout Shift Score
  value: 0.175,

  // 是否发生在近期用户输入之后
  hadRecentInput: false,

  lastInputTime: 0,

  // 哪些 DOM 元素发生了移动
  sources: [
    {
      node: /* #banner */,

      previousRect: {
        x: 311,
        y: 76,
        width: 400,
        height: 100
      },

      currentRect: {
        x: 311,
        y: 246,
        width: 400,
        height: 100
      }
    }
  ],

  duration: 0
}
```

`value` 是这一次布局位移本身的分值；`sources` 保存发生位移的 DOM 元素以及移动前后的矩形位置。浏览器最多报告影响最大的 5 个 Source。[[36]](https://web.dev/articles/debug-layout-shifts)

SDK 可以直接获取：

```js
const observer = new PerformanceObserver((list) => {
  for (const entry of list.getEntries()) {
    if (!entry.hadRecentInput) {
      handleLayoutShift(entry);
    }
  }
});

observer.observe({
  type: 'layout-shift',
  buffered: true
});
```

这里需要过滤：

```js
entry.hadRecentInput === true
```

因为用户自己点击展开面板等操作导致的预期布局变化通常不应该计入 CLS。`hadRecentInput` 表示最近 500ms 内是否存在相应用户输入。[[37]](https://developer.mozilla.org/en-US/docs/Web/API/LayoutShift/hadRecentInput)

**<u>多条 LayoutShift 如何形成 CLS</u>**

假设页面运行过程中产生：

```text
1000ms   LayoutShift = 0.03
1500ms   LayoutShift = 0.04
2100ms   LayoutShift = 0.02

8000ms   LayoutShift = 0.08
8500ms   LayoutShift = 0.07
```

CLS 不再把整个页面所有 Shift 永久累加，而是按照 Session Window（会话窗口）聚合：

- 相邻 Layout Shift 间隔小于 1 秒；
- 整个窗口最长不超过 5 秒；
- 每个窗口内部累加 `entry.value`；
- 最终取累计分数最高的窗口。[[38]](https://web.dev/articles/cls)

因此：

```text
Window A
0.03 + 0.04 + 0.02
= 0.09

Window B
0.08 + 0.07
= 0.15

最终 CLS
= max(0.09, 0.15)
= 0.15
```

完整链路就是：

> **元素发生位移 → LayoutShift Entry → 过滤近期用户输入导致的 Shift → 按时间组织 Session Window → 窗口内累加 value → 取最大窗口 → 得到本次页面的 CLS。**

而 `sources` 不参与最终 CLS 数值计算，它承担的是**诊断归因**：

CLS = 0.28 → 找到贡献最大的 Layout Shift → 查看 entry.sources → 定位 #banner / .product-list 等具体移动元素

#### <u>5. 连续渲染：rAF 提供的是连续 Frame Interval 样本，而不是一个标准 Frame Metric</u>

连续渲染不能和 LCP、INP、CLS 采用完全相同的理解方式。

浏览器没有标准定义：

```text
PerformanceEntry {
  entryType: 'frame-time',
  value: ...
}
```

也没有一个标准 Core Web Vital 叫做：

Frame Time P95

SDK 在线上持续监控页面帧节奏时，通常可以利用 `requestAnimationFrame()`，简称 rAF（动画帧回调）。

MDN 对它的定义是：开发者请求浏览器在**下一次重绘之前**调用指定 callback；callback 参数提供时间戳。rAF 调用频率通常与显示器刷新率接近，而且页面进入后台时通常会暂停。[[39]](https://developer.mozilla.org/en-US/docs/Web/API/Window/requestAnimationFrame)

例如：

```js
let previousTime;
const frameIntervals = [];

function onFrame(timestamp) {
  if (previousTime !== undefined) {
    frameIntervals.push(
      timestamp - previousTime
    );
  }

  previousTime = timestamp;

  requestAnimationFrame(onFrame);
}

requestAnimationFrame(onFrame);
```

假设得到：

```js
[
  16.5,
  16.7,
  16.4,
  48.2,
  16.8,
  72.1,
  16.6
]
```

这里每个值更准确应该叫：

> **rAF Frame Interval（rAF 帧间隔）**

即：

当前 rAF callback timestamp - 上一次 rAF callback timestamp

它反映连续帧调度节奏，但**不能直接等同于 GPU 实际把一帧渲染出来所消耗的 Frame Rendering Time**。

因此连续渲染的数据形成方式是：

rAF Callback → 连续得到 timestamp → 计算相邻 timestamp 的差 → 得到大量 Frame Interval Sample → SDK 根据自己的性能预算进行统计

例如企业可以定义：

```js
{
  frameIntervalP95: 31.2,
  budgetHitRate: 0.91
}
```

这里：

**`Frame Interval P95` 是“本次采样窗口内部”的统计结果。**

它和：

LCP P95；INP P95；CLS P95

不是同一种统计层次。

例如：

```text
一次页面访问内部：

1000 个 Frame Interval
→ 计算一个 Frame Interval P95 = 31ms
```

而：

```text
10000 次页面访问：

10000 个 LCP
→ 服务端计算 LCP P75 / P95

10000 个 INP
→ 服务端计算 INP P75 / P95
```

当然，如果每次访问都上传自己的 `frameIntervalP95`，服务端仍然可以再次统计这些页面级指标的分布，但这是第二层聚合。

---

### 【诊断数据的采集链路】

结果指标回答的是：

> **用户最终感觉怎么样。**

诊断数据进一步回答：

> **为什么会得到这个结果。**

它们很多时候不需要像 CLS、INP 一样聚合成一个标准页面指标，而是直接保留浏览器产生的运行记录。

---

#### <u>1. Navigation Timing / TTFB：记录主文档导航过程</u>

浏览器会为当前文档导航产生一个 `PerformanceNavigationTiming`。

它大致包含：

```js
{
  entryType: 'navigation',

  startTime: 0,

  domainLookupStart: ...,
  domainLookupEnd: ...,

  connectStart: ...,
  connectEnd: ...,

  requestStart: ...,

  // 收到响应第一个字节
  responseStart: ...,

  // 收到响应最后一个字节
  responseEnd: ...,

  domInteractive: ...,
  domContentLoadedEventEnd: ...,
  loadEventEnd: ...,

  duration: ...
}
```

SDK 可以读取：

```js
const navigation =
  performance.getEntriesByType('navigation')[0];
```

或者使用 `PerformanceObserver`：

```js
new PerformanceObserver((list) => {
  for (const entry of list.getEntries()) {
    handleNavigation(entry);
  }
}).observe({
  type: 'navigation',
  buffered: true
});
```

TTFB 可以由导航时间线计算：

```js
const ttfb =
  navigation.responseStart -
  navigation.startTime;
```

因此 TTFB 的数据形成方式是：

> **一次主文档导航 → 一个 Navigation Timing Entry → 根据导航时间字段计算 TTFB。**

它通常作为加载性能的诊断指标，用于判断：

```text
LCP 很慢
        ↓
TTFB 是否已经很高？
        ↓
如果是
说明主文档最开始的响应阶段已经消耗大量时间
```

---

#### <u>2. Resource Timing：每个资源请求形成一条独立诊断记录</u>

页面加载 JS、CSS、图片、字体等资源时，浏览器会为资源请求生成 `PerformanceResourceTiming`。

例如：

```js
{
  entryType: 'resource',

  // 资源 URL
  name: 'https://example.com/hero.jpg',

  initiatorType: 'img',

  startTime: 320,

  fetchStart: 320,

  domainLookupStart: 321,
  domainLookupEnd: 330,

  connectStart: 330,
  connectEnd: 350,

  requestStart: 351,

  responseStart: 520,
  responseEnd: 800,

  duration: 480,

  transferSize: 120000
}
```

`requestStart` 表示浏览器即将开始请求资源，`responseStart` 表示第一个响应字节到达，`responseEnd` 表示最后一个字节接收完成。[[40]](https://developer.mozilla.org/en-US/docs/Web/API/PerformanceResourceTiming) [[41]](https://developer.mozilla.org/en-US/docs/Web/API/PerformanceResourceTiming/requestStart)

SDK 监听：

```js
new PerformanceObserver((list) => {
  for (const entry of list.getEntries()) {
    handleResourceTiming(entry);
  }
}).observe({
  type: 'resource',
  buffered: true
});
```

Resource Timing 通常不会在客户端把：

200 条 Resource Entry

强行聚合成一个“Resource Score”。

更常见的是：

Resource Entry → 过滤静态资源 / 慢资源 / 关键资源 → 保留 URL、类型、duration、size、网络阶段 → 作为 Diagnostic Data 上报

服务端再统计：

hero.jpg P75 / P95；某类 image 平均加载时间；慢资源比例；特定版本资源异常率

---

#### <u>3. Long Task：主线程连续繁忙超过 50ms 时产生一条 Long Task Entry</u>

Long Task（长任务）关注的是**主 UI 线程是否被一段连续工作长时间占用**。

当主 UI 线程出现一个连续不间断、持续 **50ms 或以上**的任务时，浏览器可以产生 `PerformanceLongTaskTiming`。常见原因包括长时间 JavaScript Event Handler、昂贵的 Reflow（回流）或其他主线程工作。[[42]](https://developer.mozilla.org/en-US/docs/Web/API/PerformanceLongTaskTiming)

一条 Long Task Entry 大致是：

```js
{
  entryType: 'longtask',

  // 长任务开始时间
  startTime: 5200.3,

  // 例如主线程连续被占用 183ms
  duration: 183,

  // 表示任务对应的 browsing context
  name: 'self',

  attribution: [
    {
      containerId: '',
      containerName: '',
      containerSrc: ''
    }
  ]
}
```

`name` 主要用于描述任务所属的 Browsing Context（浏览上下文），而 `attribution` 可以提供 iframe 等容器层面的归因。[[42]](https://developer.mozilla.org/en-US/docs/Web/API/PerformanceLongTaskTiming)

SDK 获取方式非常直接：

```js
const observer = new PerformanceObserver((list) => {
  for (const entry of list.getEntries()) {
    reportLongTask({
      startTime: entry.startTime,
      duration: entry.duration,
      attribution: entry.attribution
    });
  }
});

observer.observe({
  type: 'longtask',
  buffered: true
});
```

因此 Long Task 本身不是通过 SDK 计算：

“这个任务是不是超过了 50ms？”

而是：

> **浏览器检测到主线程连续任务达到 Long Task 条件 → 自动生成 `longtask` Entry → SDK 通过 PerformanceObserver 接收。**

它最常用于解释：

```text
INP 的 Input Delay 很大
        ↓
查看同一时间附近是否存在 Long Task
        ↓
如果存在
说明用户输入发生时主线程可能正在忙
```

单条 Long Task 就已经是诊断记录。需要统计时，服务端还可以计算 Long Task Count、Duration P95、长任务率等，但这些属于监控平台进一步构造的诊断统计。

---

#### <u>4. LoAF：一次渲染更新超过 50ms 时产生 Long Animation Frame Entry</u>

LoAF（Long Animation Frame，长动画帧）与 Long Task 观察的对象不同。

Long Task 关注：

> **一段主线程 Task 是否执行太久。**

LoAF 关注：

> **一次完整的页面 Rendering Update（渲染更新）是否被拖得太久。**

Chrome 的 Long Animation Frames API 将超过 **50ms** 的长动画帧记录为 `long-animation-frame` Entry。一个 LoAF 内部可以包含多个 Task，再加上 rAF、Style、Layout 等 Rendering 工作，因此它比 Long Task 更适合分析“这一帧为什么迟迟没有完成”。[[43]](https://developer.chrome.com/docs/web-platform/long-animation-frames)

一条 LoAF Entry 大致是：

```js
{
  entryType: 'long-animation-frame',

  startTime: 11802.4,

  // 整个长帧持续时间
  duration: 60,

  // 其中真正造成输入阻塞的部分
  blockingDuration: 10,

  // Rendering 阶段从哪里开始
  renderStart: 11858.8,

  // Style / Layout 从哪里开始
  styleAndLayoutStart: 11859.3,

  // 该帧处理的第一个 UI Event 时间
  firstUIEventTimestamp: 11801.1,

  scripts: [
    {
      duration: 45,
      executionStart: 11803.2,

      invoker: 'DOMWindow.onclick',
      invokerType: 'event-listener',

      sourceURL: '/app.js',
      sourceFunctionName: 'handleClick',

      forcedStyleAndLayoutDuration: 8
    }
  ]
}
```

Chrome 官方 LoAF 文档明确提供 `blockingDuration`、`renderStart`、`styleAndLayoutStart`、`firstUIEventTimestamp` 和 `scripts` 等字段，并给出了近似上述结构的完整 Entry 示例。[[43]](https://developer.chrome.com/docs/web-platform/long-animation-frames)

SDK 获取：

```js
const observer = new PerformanceObserver((list) => {
  for (const entry of list.getEntries()) {
    handleLoAF(entry);
  }
});

observer.observe({
  type: 'long-animation-frame',
  buffered: true
});
```

因此 LoAF 可以直接帮助回答：

```text
这一帧为什么超过 50ms？

是 JavaScript 太长？
→ scripts

是输入被阻塞？
→ blockingDuration

是 Style / Layout 很重？
→ styleAndLayoutStart

是哪一个函数？
→ sourceURL / sourceFunctionName
```

它和 INP 之间也存在自然关联。

如果一个慢 Interaction 所在的 Rendering Frame 同时是一条 LoAF，就可以进一步使用 LoAF Attribution（归因信息）解释 INP 的 Presentation Delay 或 Processing 问题。Chrome 官方也明确推荐利用与 INP 相关的 LoAF 来诊断慢交互。[[43]](https://developer.chrome.com/docs/web-platform/long-animation-frames)

## 3. Error / Reliability：异常数据的采集与处理

### 【异常监控的分类与采集框架】

Error / Reliability（异常与可靠性）监控主要回答：

> **页面运行过程中发生了哪些失败，失败发生在哪一层、为什么发生，以及影响了哪些页面、版本和用户。**

这里的 Error 不能只理解成 JavaScript 中显式抛出的 `Error` 对象。

OpenTelemetry 对 Error 的定义更接近“**一次操作最终没有按照预期成功完成**”：既包括执行过程中抛出 Exception（异常），也包括没有抛异常、但通过 Error Code（错误码）等方式返回失败。[[44]](https://opentelemetry.io/docs/specs/semconv/general/recording-errors)

因此，在浏览器运行环境中，下面这些情况都可能成为异常数据：

```text
JavaScript 执行失败
Promise 没有正常完成

JS / CSS / Image 加载失败
HTTP 请求失败
WebSocket 异常断开

React / Vue 组件运行失败

CSP 阻止资源
浏览器权限或环境限制

HTTP 正常返回
但业务结果失败
```

从**失败发生在哪一层**出发，可以把前端异常整理成五类：

| 异常类型 | 主要描述 | 典型情况 | 主要采集入口 |
| ------------------------------- | -------------------------------------- | ------------------------------------- | ----------------------------- |
| **Runtime Error** | JavaScript 运行失败 | JS Error、Unhandled Promise Rejection | Global Listener |
| **Resource / Network Error** | 资源或通信过程失败 | JS/CSS/Image、Fetch/XHR、WebSocket | Listener / API Wrapper |
| **Framework / Library Error** | 框架或库内部执行失败 | React Render、Vue Lifecycle | Framework Hook |
| **Browser / Environment Error** | 浏览器能力、安全策略和运行环境导致失败 | CSP、Permission、Browser Policy | Browser Event / API Hook |
| **Business Error** | 技术过程正常，但业务结果失败 | 业务错误码、业务流程失败 | Rule / Manual Instrumentation |

**<u>这里的五类是为了组织前端异常形成的工程分类，不是 W3C 或 OpenTelemetry 规定的五种 Error 标准。</u>**

同时还需要区分另一个维度：

```text
异常分类
回答：
“错误发生在哪一层？”

采集方式
回答：
“SDK 怎么知道错误发生了？”
```

因此，应该对每一种异常继续判断：

```text
发生失败
    ↓
哪一层最先能够可靠知道
“这个操作已经失败”？
    │
    ├─ Browser 已经产生 Event
    │      → Listener
    │
    ├─ Browser API 可以返回失败状态
    │      → Wrapper
    │
    ├─ Framework / Library 自己知道
    │      → Framework Hook
    │
    ├─ 统一业务规则能够判断
    │      → Automatic + Declarative Rule
    │
    └─ 只有具体业务代码知道
           → Manual Instrumentation
```

所以异常采集继续遵循前面已经建立的原则：

> **浏览器、网络 API 或框架能够识别的异常优先自动采集；能够通过统一业务规则判断的异常通过配置补充；只有具体业务流程才能判断的失败，才通过代码插桩主动产生异常数据。**

---

#### <u>1. Runtime Error：通过浏览器全局异常入口自动采集</u>

Runtime Error（运行时异常）主要描述 JavaScript 执行过程本身发生失败。

浏览器已经为其中最常见的两类异常提供了全局入口：

```text
同步 JavaScript 未处理异常
→ error Event

Promise 未处理 Reject
→ unhandledrejection Event
```

MDN 明确区分了两者：脚本同步执行产生的未处理错误会触发 `error`；没有注册 Reject Handler 的 Promise 被拒绝时，会触发 `unhandledrejection`。[[11]](https://developer.mozilla.org/en-US/docs/Web/API/Window/error_event) [[45]](https://developer.mozilla.org/en-US/docs/Web/API/Window/unhandledrejection_event)

例如：

```js
function renderUser(user) {
  return user.profile.name;
}

renderUser(undefined);
```

执行：

user.profile

时产生 `TypeError`：

JavaScript 执行 → TypeError → 没有 try / catch 处理 → Browser 派发 error Event → SDK Global Listener

SDK 可以在初始化时统一注册：

```js
window.addEventListener('error', (event) => {
  collectError({
    category: 'runtime',

    name: event.error?.name,
    message: event.message,

    filename: event.filename,
    line: event.lineno,
    column: event.colno,

    stack: event.error?.stack
  });
});
```

得到的原始异常大致为：

```js
{
  category: 'runtime',

  name: 'TypeError',
  message:
    'Cannot read properties of undefined',

  filename: '/app.js',
  line: 128,
  column: 15,

  stack: 'TypeError: ...'
}
```

Promise 也是类似：

```js
async function loadUser() {
  throw new Error('Load user failed');
}

loadUser();
```

如果最终没有 `.catch()`：

Promise Reject → 没有 Reject Handler → unhandledrejection → SDK Listener → Runtime Error

所以 Runtime Error 的完整链路是：

JavaScript / Promise → 运行失败 → Browser Runtime → error / unhandledrejection → Runtime Error Collector → ErrorData

这一类属于典型的 **Automatic Instrumentation（自动插桩）**：

> **SDK 初始化时注册一次 Global Listener，后续整个页面中的未处理 JavaScript 异常自动进入采集链路，不需要每个业务函数单独调用 `reportError()`。**

---

#### <u>2. Resource / Network Error：通过资源事件和通信 API 包装自动采集</u>

Resource / Network Error（资源与网络异常）关注的是：

> **页面依赖的资源或者通信链路有没有正常完成。**

其中包括：

```text
Script / CSS / Image 加载失败

Fetch / XMLHttpRequest 请求失败

HTTP 4xx / 5xx

WebSocket 建连失败或异常断开
```

它们共同特点是：

> **资源加载器或者通信 API 自己就知道请求有没有正常完成，因此通常不需要业务代码主动产生异常。**

但不同 API 暴露失败状态的方式不同，因此 SDK 会采用不同的自动插桩机制。

**静态资源加载失败**通常通过浏览器 `error` Event 获取。

例如：

```html
<script src="/missing.js"></script>
<img src="/missing.png">
```

浏览器加载失败：

Browser Resource Loader → 资源加载失败 → error Event → SDK Capture Listener → Resource Error

形成：

```js
{
  category: 'resource',

  resourceType: 'script',
  url: '/missing.js'
}
```

因此资源异常主要属于：

```text
Browser Event
→ Listener-based Automatic Instrumentation
```

---

Fetch / XHR 则更适合使用前面已经介绍过的 **Wrapper / Monkey Patch（API 包装）**。

例如业务正常调用：

```js
fetch('/api/order');
```

SDK 初始化阶段包装：

```js
const rawFetch = window.fetch;

window.fetch = async function (...args) {
  try {
    const response =
      await rawFetch.apply(this, args);

    if (!response.ok) {
      collectError({
        category: 'network',
        mechanism: 'fetch.http',
        url: String(args[0]),
        status: response.status
      });
    }

    return response;
  } catch (error) {
    collectError({
      category: 'network',
      mechanism: 'fetch.network',
      url: String(args[0]),
      error
    });

    throw error;
  }
};
```

因此实际调用关系变成：

```text
Business Code
     ↓
fetch()
     ↓
SDK Fetch Wrapper
     ↓
Original Fetch
     │
     ├─ Network Failure
     │      ↓
     │   Promise Reject
     │
     └─ HTTP Response
            ↓
       检查 Status
```

这里还必须区分：

```text
Network Failure
连接本身失败
→ Promise Reject

HTTP Failure
服务器已经返回 Response
但 HTTP 4xx / 5xx
→ 检查 response.status
```

也就是说：

> **HTTP 500 并不会因为它是“错误状态”就天然成为 JavaScript Exception，网络插桩需要按照 HTTP 语义判断 Response 状态。**

OpenTelemetry 对 HTTP Error 也明确区分：网络失败、Timeout 等会阻止请求正常完成，而非成功 HTTP Status 本身不应该被简单人工制造成 Exception。[[46]](https://opentelemetry.io/docs/specs/semconv/http/http-exceptions)

**<u>WebSocket 也属于这一类，而不是独立的一种异常分类。</u>**

WebSocket 自身提供：

open；message；error；close

因此 SDK 可以和 Fetch 使用相同的**全局 Wrapper 思想**：

```text
Fetch
→ 包装 fetch()

WebSocket
→ 包装 WebSocket Constructor
```

例如：

```js
const RawWebSocket = window.WebSocket;

window.WebSocket = function (...args) {
  const socket =
    new RawWebSocket(...args);

  socket.addEventListener(
    'error',
    () => {
      collectError({
        category: 'network',
        mechanism: 'websocket.error',
        url: socket.url
      });
    }
  );

  socket.addEventListener(
    'close',
    (event) => {
      if (!event.wasClean) {
        collectError({
          category: 'network',
          mechanism: 'websocket.close',

          url: socket.url,

          code: event.code,
          reason: event.reason,

          detail: {
            wasClean: event.wasClean
          }
        });
      }
    }
  );

  return socket;
};
```

业务仍然正常调用：

```js
const socket =
  new WebSocket('wss://example.com');
```

实际链路：

```text
Business Code
      ↓
new WebSocket()
      ↓
SDK Wrapped Constructor
      ↓
Original WebSocket
      ↓
得到 WebSocket Instance
      ↓
SDK 自动注册
error / close Listener
      ↓
连接生命周期运行
      ↓
异常断开
      ↓
Network Error Collector
```

WebSocket 的 `close` Event 是 `CloseEvent`，可以提供关闭 Code、Reason 等连接结束信息。[[47]](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket/close_event)

所以 WebSocket 在这里承担的只是一个完整示例：

> 它和 Fetch 一样属于 Network Error；SDK 可以通过全局 API Wrapper 自动插装，而不是要求每个业务 WebSocket 在 `onerror` 中主动调用监控 API。

Resource / Network Error 最终可以总结为：

| 数据 | 浏览器提供的失败入口 | SDK 采集方式 |
| -------------------- | ---------------------------- | ------------------------------ |
| Script / CSS / Image | `error` Event | Listener |
| Fetch | Reject / Response | Function Wrapper |
| XHR | `error` / `timeout` / Status | XHR Wrapper + Listener |
| WebSocket | `error` / `close` | Constructor Wrapper + Listener |

因此这一类总体属于：

> **资源或通信状态本身可以被 SDK 观察，主要采用 Automatic Instrumentation。**

---

#### <u>3. Framework / Library Error：通过框架错误 Hook 集中采集</u>

Framework / Library Error（框架与库异常）关注的是：

> **异常发生在 React、Vue 等框架管理的执行过程中，并且框架本身掌握比浏览器更多的错误上下文。**

这一类不能简单只依赖：

window.error

因为 Browser Runtime 通常只能告诉你：

JavaScript 抛出了 TypeError

而 Framework Runtime 还知道：

```text
哪个 Component 发生异常

发生在 Render 还是 Lifecycle

组件处于哪棵 Component Tree 中

这个异常是否被 Framework Recovery 机制处理
```

因此原则是：

> **如果 Framework 已经提供统一 Error Hook，监控 SDK 应优先接入 Framework Hook，而不是等错误逃逸到浏览器全局层再采集。**

---

以 React 为例。

假设：

```jsx
function ProductPrice({ product }) {
  return (
    <span>
      {product.price.toFixed(2)}
    </span>
  );
}
```

某一次：

```js
product.price === undefined
```

于是：

React Render ProductPrice → price.toFixed() → TypeError → React Runtime 捕获异常

当前 React 的 `createRoot()` 提供：

```text
onCaughtError
→ 被 Error Boundary 捕获的错误

onUncaughtError
→ 没有被 Error Boundary 捕获的错误

onRecoverableError
→ React 能够自动恢复的错误
```

并且 Error Callback 可以获得 `errorInfo.componentStack`。[[48]](https://react.dev/reference/react-dom/client/createRoot)

因此应用在创建 Root 时可以做一次框架级接入：

```jsx
const root = createRoot(
  document.getElementById('root'),
  {
    onCaughtError(error, errorInfo) {
      collectError({
        category: 'framework',
        framework: 'react',

        mechanism:
          'react.onCaughtError',

        name: error.name,
        message: error.message,
        stack: error.stack,

        detail: {
          componentStack:
            errorInfo.componentStack
        }
      });
    },

    onUncaughtError(error, errorInfo) {
      collectError({
        category: 'framework',
        framework: 'react',

        mechanism:
          'react.onUncaughtError',

        name: error.name,
        message: error.message,
        stack: error.stack,

        detail: {
          componentStack:
            errorInfo.componentStack
        }
      });
    }
  }
);
```

运行链路：

React Component → Render / Lifecycle 执行失败 → React Runtime → React Error Hook → React Monitoring Adapter → Framework Error Collector

最终数据可能包含：

```js
{
  category: 'framework',

  framework: 'react',

  name: 'TypeError',

  message:
    'Cannot read properties of undefined',

  stack: 'JavaScript Stack',

  detail: {
    componentStack: `
      at ProductPrice
      at ProductCard
      at ProductList
      at App
    `
  }
}
```

这里：

```text
JavaScript Stack
→ 哪些函数执行导致错误

Component Stack
→ 错误发生在哪棵 React Component Tree 中
```

两者解决的问题不同。

---

Vue 同样存在框架级统一入口：

```js
app.config.errorHandler
```

Vue 官方说明，它能够获得：

```text
err
→ 原始 Error

instance
→ 发生错误的 Component Instance

info
→ 错误来自哪个运行阶段
```

并且可以捕获 Component Render、Event Handler、Lifecycle Hook、`setup()`、Watcher、Directive、Transition 等多个框架执行过程。[[49]](https://vuejs.org/api/application.html)

例如：

```js
const app = createApp(App);

app.config.errorHandler =
  (error, instance, info) => {

    collectError({
      category: 'framework',
      framework: 'vue',

      mechanism:
        'vue.errorHandler',

      name: error.name,
      message: error.message,
      stack: error.stack,

      detail: {
        component:
          instance?.$options?.name,

        lifecycle: info
      }
    });
  };
```

假设一个 Vue Component 在 Render 中：

```js
user.name
```

而 `user` 为 `undefined`：

Vue Component Render → TypeError → Vue Runtime → app.config.errorHandler → Vue Monitoring Adapter → Framework ErrorData

Vue 生产构建中还会把部分 Error Source 转换成短 Code，例如 Render Function、Watcher Callback、Component Event Handler 等，可以再通过官方 Production Error Code Reference 映射回来。[[50]](https://vuejs.org/error-reference)

因此 Framework / Library Error 的采集原则是：

```text
Framework 已经提供 Error Hook
        ↓
SDK 在 Framework Root / Adapter
统一接入一次
        ↓
后续 Framework Error
自动进入监控链路
```

这里更准确的称呼是：

> **Framework-level Instrumentation（框架级集中插装）。**

它和 Runtime Error 的“完全浏览器自动监听”存在一点区别：

- Runtime Error：SDK 初始化后直接监听 Browser Global Event。
- Framework Error：通常需要在 React Root、Vue App 等框架入口做一次 Adapter 接入。
- 但它也不是每发生一次错误都要求业务主动 `captureError()`。

#### <u>4. Browser / Environment Error：通过浏览器策略与运行环境信号采集</u>

Browser / Environment Error（浏览器与环境异常）描述的是：

> **应用本身可能没有执行错误，但是浏览器因为安全策略、权限、API 能力或者运行环境限制，阻止了某项操作正常完成。**

这一类的典型例子是 CSP（Content Security Policy，内容安全策略）违规。

假设页面配置：

```http
Content-Security-Policy:
script-src 'self'
```

但页面尝试加载：

```html
<script
  src="https://third-party.com/sdk.js">
</script>
```

浏览器判断：

```text
Policy
只允许 self

Resource
third-party.com
```

于是：

Browser Security Policy → 检测到 CSP Violation → 阻止资源加载 → 产生 securitypolicyviolation → SDK Listener

`securitypolicyviolation` 是浏览器提供的标准事件，当页面违反 CSP 时触发。[[51]](https://developer.mozilla.org/en-US/docs/Web/API/Document/securitypolicyviolation_event)

SDK 可以：

```js
document.addEventListener(
  'securitypolicyviolation',
  (event) => {

    collectError({
      category: 'browser',

      name:
        'SecurityPolicyViolation',

      mechanism:
        'securitypolicyviolation',

      detail: {
        blockedURI:
          event.blockedURI,

        effectiveDirective:
          event.effectiveDirective,

        sourceFile:
          event.sourceFile,

        lineNumber:
          event.lineNumber,

        disposition:
          event.disposition
      }
    });
  }
);
```

得到：

```js
{
  category: 'browser',

  name:
    'SecurityPolicyViolation',

  detail: {
    blockedURI:
      'https://third-party.com/sdk.js',

    effectiveDirective:
      'script-src-elem'
  }
}
```

这一类就是：

```text
Browser 已经产生 Event
→ SDK Listener
→ Automatic Instrumentation
```

但 Browser / Environment Error 并不是所有情况都有统一 Global Event。

例如：

```js
navigator.mediaDevices.getUserMedia({
  video: true
});
```

如果用户拒绝摄像头权限，API 可能通过 Promise Reject 返回：

NotAllowedError

这时候：

Browser Permission Check → 用户拒绝 → getUserMedia Promise Reject → DOMException

浏览器并不存在一个能够覆盖所有 API 的：

window.onBrowserEnvironmentError

因此 SDK 如果希望自动采集这类能力，需要针对具体 Browser API 插装：

```text
getUserMedia
Geolocation
Clipboard
Storage
...
        ↓
API Wrapper
        ↓
观察 Resolve / Reject
```

所以 Browser / Environment Error 的统一原则不是：

所有异常都用 Global Listener

而是：

> **浏览器提供 Event 就监听 Event；浏览器只通过具体 API 返回失败，就包装相应 API；如果浏览器没有任何可观察信号，则需要业务补充检测。**

因此第四类内部仍然可以复用前面的自动插桩体系：

```text
Browser Event
→ Listener

Browser API Failure
→ Wrapper

Browser Report
→ Reporting API / Observer
```

#### <u>5. Business Error：通过业务规则或代码插桩判断失败</u>

Business Error（业务异常）和前四类最大的区别是：

> **浏览器、JavaScript Runtime、网络层和 Framework 可能都认为这次操作“技术上正常完成”，但按照业务规则，它最终失败了。**

例如接口返回：

```http
HTTP/1.1 200 OK
```

Body：

```json
{
  "code": 10013,
  "message": "库存不足",
  "data": null
}
```

从 Network Collector 看：

Fetch 正常完成；HTTP 200；Response 正常解析

所以：

Network Error = false

但是业务协议规定：

```text
code === 0
→ Success

code !== 0
→ Business Error
```

这时：

HTTP Response → Network 正常 → 解析 Response Body → Business Protocol Rule → code = 10013 → Business Error

如果整个企业接口遵循统一协议，就不需要每一个业务页面：

```js
if (response.code !== 0) {
  monitor.captureError(...);
}
```

可以在统一 Request Layer 设置规则：

```js
function isBusinessError(response) {
  return response.code !== 0;
}
```

例如：

```js
request.interceptors.response.use(
  response => {

    if (
      isBusinessError(response.data)
    ) {
      collectError({
        category: 'business',

        mechanism:
          'business-response-rule',

        code:
          response.data.code,

        message:
          response.data.message,

        detail: {
          url:
            response.config.url
        }
      });
    }

    return response;
  }
);
```

因此：

Network Wrapper → Response → Declarative Business Rule → Business Error Collector

这一类属于：

> **Automatic Collection + Declarative Rule（自动采集 + 声明式业务规则）。**

---

还有一类业务失败不存在这样的统一规则。

例如一个“提交订单”操作：

Create Order → Payment → Lock Stock → Render Result

业务定义：

> 只有订单创建、支付、库存锁定全部成功，才算 Submit Order 成功。

假设：

```text
Create Order
Success

Payment
Success

Lock Stock
Failed
```

浏览器只能分别观察：

请求 A 正常；请求 B 正常；请求 C 返回了某个结果

但浏览器不知道：

```text
“库存锁定失败”
=
“整个订单提交失败”
```

这个语义只有业务流程知道。

因此才需要主动：

```js
async function submitOrder() {
  const order =
    await createOrder();

  const payment =
    await pay(order);

  const stock =
    await lockStock(order);

  if (!stock.success) {
    monitor.captureError({
      category: 'business',

      name:
        'SubmitOrderFailed',

      code:
        'STOCK_LOCK_FAILED',

      message:
        '订单提交失败',

      detail: {
        stage: 'lock-stock'
      }
    });
  }
}
```

完整链路：

```text
多个技术步骤执行
        ↓
Browser / SDK
分别能够观察技术过程
        ↓
Business Logic
根据多个结果判断整体状态
        ↓
业务失败成立
        ↓
monitor.captureError()
        ↓
Business Error
```

因此 Business Error 需要再区分两种：

```text
存在统一规则
例如：
code !== 0

        ↓

Declarative Rule
统一自动识别

只有具体业务流程知道
例如：
整条订单流程失败

        ↓

Manual Instrumentation
业务主动上报
```

所以不是：

> “业务错误 = 必须手动埋点”。

而是：

> **能够提炼成公共业务协议的错误继续自动化；只有无法从公共协议和技术运行状态推断的业务失败，才使用代码插桩。**

---

把五类异常放在一起以后，整个异常采集框架可以收敛成：

```text
                 Page Runtime
                      │
     ┌────────────────┼────────────────┐
     │                │                │
     ↓                ↓                ↓
Runtime Error    Resource / Network   Framework
     │                │                │
Browser Event    Listener / Wrapper  Framework Hook
     │                │                │
     └────────────────┼────────────────┘
                      │
            Browser / Environment
                      │
              Event / API Hook
                      │
                      │
               Business Error
                      │
                Rule / Manual
                      │
                      ↓
                 ErrorCollector
```

其中真正需要业务主动参与的范围已经非常有限：

> **只有“失败成立的业务语义”无法由 Browser、API、Framework 或统一 Rule 判断时，才进入 Manual Instrumentation。**

---

### 【异常数据的标准化、归组与上报】

到这里以后，不同 Error Collector 获得的原始数据结构完全不同。

Runtime Error：

```js
{
  message,
  filename,
  line,
  column,
  stack
}
```

HTTP Error：

```js
{
  url,
  method,
  status
}
```

React：

```js
{
  error,
  componentStack
}
```

CSP：

```js
{
  blockedURI,
  effectiveDirective
}
```

和 Performance 一样：

> **不同异常的数据产生方式和诊断字段可以不同，但进入 SDK 公共处理链路之前应该统一成 ErrorData。**

OpenTelemetry 的 Exception Semantic Convention（异常语义约定）中，稳定的核心异常字段包括 `exception.type`、`exception.message` 和 `exception.stacktrace`；同时 `error.type` 用于表示操作失败的错误类型。[[52]](https://opentelemetry.io/docs/specs/semconv/exceptions) [[53]](https://opentelemetry.io/docs/specs/otel/semantic-conventions)

浏览器监控 SDK 可以在这个基础上再增加自身需要的分类和上下文字段。例如：

```ts
interface ErrorData {
  type: 'error';

  category:
    | 'runtime'
    | 'resource'
    | 'network'
    | 'framework'
    | 'browser'
    | 'business';

  name?: string;

  message?: string;
  code?: string | number;

  stack?: string;

  mechanism: string;

  detail?: Record<string, unknown>;

  timestamp: number;
}
```

它可以理解成四部分：

```text
ErrorData
│
├─ Error Identity
│  category
│  name
│  code
│  message
│
│  发生了什么错误
│
├─ Diagnostic Detail
│  stack
│  url
│  HTTP status
│  WebSocket closeCode
│  componentStack
│  blockedURI
│
│  错误发生在哪里、为什么发生
│
├─ Mechanism
│  window.error
│  unhandledrejection
│  fetch
│  websocket
│  react
│  vue
│  csp
│  manual
│
│  SDK 是怎么发现这个错误的
│
└─ Context
   route
   version
   browser
   device
   session
   traceId

   错误发生在什么运行环境
```

例如 Runtime Error：

```js
{
  type: 'error',

  category: 'runtime',

  name: 'TypeError',

  message:
    'Cannot read properties of undefined',

  stack: '...',

  mechanism:
    'window.error',

  timestamp: ...
}
```

React Error：

```js
{
  type: 'error',

  category: 'framework',

  name: 'TypeError',

  message:
    'Cannot read properties of undefined',

  stack: '...',

  mechanism:
    'react.onCaughtError',

  detail: {
    componentStack: '...'
  },

  timestamp: ...
}
```

WebSocket：

```js
{
  type: 'error',

  category: 'network',

  code: 1006,

  message:
    'WebSocket abnormal close',

  mechanism:
    'websocket.close',

  detail: {
    url: 'wss://...',
    wasClean: false
  },

  timestamp: ...
}
```

异常数据在标准化以后，还比普通 Performance Data 多两个比较重要的处理过程：

```text
Deduplication
去重

Issue Grouping / Fingerprint
异常归组
```

#### <u>1. Deduplication：避免同一次异常通过多个采集入口被重复上报</u>

异常监控中的 Deduplication（去重）主要解决的是：

> **同一次真实失败，可能被 SDK 的多个 Collector 同时观察到，如果不进行去重，就会把一次异常错误地统计成多次异常。**

例如一次请求失败：

```js
async function loadUser() {
  const response =
    await fetch('/api/user');

  if (!response.ok) {
    throw new Error('Load user failed');
  }
}

loadUser();
```

可能形成下面的链路：

```text
fetch('/api/user')
        ↓
HTTP 500
        ↓
Fetch Wrapper
检测 status = 500
        ↓
产生 Network Error A
        ↓
业务代码继续 throw Error
        ↓
Promise Reject
        ↓
没有 catch
        ↓
window unhandledrejection
        ↓
产生 Runtime Error B
```

从采集入口看，这是两条不同的数据：

```text
A：
mechanism = fetch.http
status = 500

B：
mechanism = unhandledrejection
Error = Load user failed
```

但是从用户实际经历来看：

> **它们可能都来自同一次“加载用户失败”。**

如果直接上报：

```text
一次真实失败
↓
Network Error +1
Runtime Error +1
```

异常数量就会被重复放大。

因此 SDK 通常会在 `ErrorData` 进入上报队列之前增加一层短期 Deduplication。

```text
是否属于同一次异常
        ↓
综合比较

Error Object Identity
+
时间接近程度
+
Request / Operation ID
+
Stack / Source Location
+
Error Type / Message
```

其中不同字段的作用并不相同。

**<u>1. Error Object：优先判断是不是同一个异常对象</u>**

如果同一个 JavaScript `Error` 对象经过多个采集入口传播，这是最强的去重信号。

例如：

```js
const error =
  new Error('Load user failed');

monitor.captureException(error);

throw error;
```

随后它又进入：

unhandledrejection

SDK 两次收到的可能实际上都是：

event.reason === error

因此可以利用对象引用进行短期记录。

例如使用 `WeakSet`：

```js
const capturedErrors = new WeakSet();

function captureError(error) {
  if (
    error &&
    typeof error === 'object'
  ) {
    if (capturedErrors.has(error)) {
      return;
    }

    capturedErrors.add(error);
  }

  emitError(error);
}
```

链路就是：

```text
Error Object A
     ↓
Collector 1
     ↓
WeakSet 中不存在
     ↓
记录并上报

同一个 Error Object A
     ↓
Collector 2
     ↓
WeakSet 已存在
     ↓
认为是重复采集
     ↓
不再次上报
```

这种方法的准确度最高，因为它判断的是：

> **“是不是同一个 Error 实例。”**

但它只能解决 JavaScript 对象能够在采集链路中继续传播的情况。

例如 HTTP 500：

Fetch Wrapper

和后续业务重新：

```js
throw new Error(...)
```

产生的是两个不同对象，仅靠对象引用就无法判断。

**<u>2. Request / Operation ID：判断是否属于同一次操作</u>**

因此第二个非常重要的信号是：

Request ID；Operation ID；Trace ID；Span ID

也就是给一次操作建立关联标识。

例如 SDK 包装 Fetch 时：

```js
requestId = 'req-123';
```

产生网络异常：

```js
{
  category: 'network',
  requestId: 'req-123',
  status: 500
}
```

业务 Request Layer 在处理这个请求时，又产生：

```js
{
  category: 'business',
  requestId: 'req-123',
  code: 'USER_LOAD_FAILED'
}
```

此时：

```text
Network Error
requestId = req-123

Business Error
requestId = req-123
```

SDK 就知道：

> **两条 Error 虽然类型不同，但是来自同一次 HTTP Operation。**

但这里不能简单地：

```text
requestId 相同
→ 删除其中一个
```

因为一次 Request 完全可能同时包含多个不同层次的有效错误。

例如：

HTTP 500 + 业务 Retry 最终失败

它们可能都值得保留。

所以 Request ID 更多是一个**关联信号**：

```text
Request ID 相同
+
时间非常接近
+
错误 Cause 相同
+
上下游 Error 存在明确传播关系
        ↓
才判断是否属于重复采集
```

如果企业已经接入 Trace，那么 `traceId / spanId` 也可以承担类似作用。

**<u>3. Timestamp：限定去重只发生在很短的时间窗口</u>**

时间也是重要条件。

假设同一个错误：

TypeError；ProductList.ts:128

在：

10:00:00

发生一次。

用户重新操作以后：

10:05:00

又发生一次。

这显然应该统计为：

2 次 Error Occurrence

而不能因为：

message 相同；stack 相同

就永久去重。

所以客户端 Dedup 通常只维护一个很短的 Recent Error Cache（近期异常缓存）：

```text
Error A
发生 10:00:00.100

Error B
发生 10:00:00.105

相差 5ms
+
其他特征高度一致
→ 很可能是同一次传播
```

而：

```text
Error C
发生 10:00:05

即使 Stack 完全相同
→ 更可能是新的 Error Occurrence
```

概念上可以是：

```js
const DEDUP_WINDOW = 1000;

if (
  current.timestamp -
    previous.timestamp
      < DEDUP_WINDOW
) {
  // 再继续比较其他特征
}
```

这里的 `1000ms` 只是示意，**不是浏览器或 OpenTelemetry 规定的统一标准值**。实际窗口需要根据 SDK 的采集链路设计。

Timestamp 本身不能证明相同，只负责回答：

> **“这两条异常有没有可能来自同一次传播过程？”**

---

**<u>4. Stack：判断异常是否来自相同代码位置和调用路径</u>**

对于 JavaScript Runtime Error，Stack Trace 是非常重要的判断依据。

例如：

```text
TypeError:
Cannot read properties of undefined

at renderPrice
  ProductList.ts:128

at ProductCard
  ProductCard.ts:45
```

SDK 可以对 Stack 进行 Normalize（标准化）：

删除动态 URL 参数；删除 webpack hash；统一行列号格式；过滤 SDK 自己的调用栈

然后提取关键 Stack Frame：

errorType + top application frame

例如：

TypeError + ProductList.ts + renderPrice

作为一个短期错误特征。

于是：

```text
Error A

TypeError
ProductList.ts:128
renderPrice

发生时间：1000ms
```

和：

```text
Error B

TypeError
ProductList.ts:128
renderPrice

发生时间：1004ms
```

如果同时：

Request / Operation 也相同

就很可能是同一次异常被两个 Collector 重复捕获。

但是：

```text
Error A
ProductList.ts:128

Error B
UserPanel.ts:76
```

即使 Message 都是：

Cannot read properties of undefined

也应该认为不是同一次错误。

---

因此，实践中通常不是计算一个绝对的：

```text
dedupKey =
ErrorObject +
Timestamp +
RequestId +
Stack
```

因为这些字段不一定全部存在。

更准确的是：

> **按照信号可靠程度分层判断。**

可以组织成：

```text
收到新的 Error
      ↓
① 是否是同一个 Error Object？
      │
      ├─ 是
      │   → 高置信度重复
      │
      └─ 否
          ↓
② 是否存在相同 Request /
   Operation / Trace ID？
          │
          ├─ 是
          │   ↓
          │ 比较 Error Type /
          │ Stack / Cause /
          │ Timestamp
          │
          └─ 否
              ↓
③ 比较短时间窗口内：
   Error Type
   + Normalized Message
   + Key Stack Frame
   + Route
              ↓
④ 高度一致
      → 判断为重复采集

   存在明显差异
      → 保留为新的 Error Occurrence
```

可以简单实现一个短期 Dedup Signature：

```js
function buildErrorSignature(error) {
  return [
    error.category,
    error.name,
    normalizeMessage(
      error.message
    ),
    getTopFrame(error.stack),
    error.requestId ?? '',
    error.operationId ?? ''
  ].join('|');
}
```

再维护近期缓存：

```js
const recentErrors = new Map();

function shouldDropDuplicate(error) {
  const signature =
    buildErrorSignature(error);

  const now = Date.now();

  const previous =
    recentErrors.get(signature);

  recentErrors.set(
    signature,
    now
  );

  if (!previous) {
    return false;
  }

  return (
    now - previous <
    DEDUP_WINDOW
  );
}
```

不过这种 Signature 方法要谨慎：**它是一种工程近似，不应该把窗口设置得太大，否则会误删真实的重复发生。**

#### <u>2. Fingerprint / Issue Grouping：把大量同类异常聚合成可处理的问题</u>

前面的 Deduplication（去重）解决的是：

> **同一次异常是否被多个采集入口重复记录。**

Fingerprint / Issue Grouping（异常指纹 / 问题归组）解决的是：

> **不同用户、不同时间真实发生的多条 Error Event，是否实际上来自同一个代码问题。**

例如不同用户都产生：

```json
{
  type: 'error',
  category: 'runtime',

  name: 'TypeError',
  message: 'Cannot read properties of undefined',

  stack: `
    TypeError: Cannot read properties of undefined
      at renderPrice (/assets/app-a82f91.js:1:18203)
      at ProductCard (/assets/app-a82f91.js:1:19420)
  `,

  route: '/products',
  version: '2.4.1',
  userId: 'user-123',
  sessionId: 'session-001',

  timestamp: 1710000000000
}
```

对于另外一个用户，可能只有下面这些字段不同：

userId；sessionId；timestamp；version；构建文件 hash

它们显然不应该因此被认为是不同问题。

所以 Fingerprint 不能直接：

```js
hash(JSON.stringify(error));
```

否则几乎每一次 Error Event 都可能形成一个新的 Fingerprint。

更合理的方式是只提取**能够代表错误根因的稳定特征**：

Error Type + Normalized Message + 关键 Stack Frame

其中还需要先进行一次 Normalization（标准化）。

例如业务错误：

Order 12345 not found；Order 92831 not found

虽然具体 Message 不一样，但实际上都是同一个问题。

可以先处理动态值：

```js
function normalizeMessage(message) {
  return message
    // 示例：将数字 ID 替换成占位符
    .replace(/\b\d+\b/g, '<id>')
    // 合并多余空格
    .replace(/\s+/g, ' ')
    .trim();
}
```

于是：

```js
normalizeMessage(
  'Order 12345 not found'
);

// Order <id> not found
```

**Stack 也不能直接使用完整字符串。**

例如：

/assets/app-a82f91.js；/assets/app-b719df.js

其中 `a82f91`、`b719df` 只是不同版本构建产生的 Hash。如果把完整文件名作为 Fingerprint，同一个源代码问题可能因为重新发版被拆成两个 Issue。

因此通常需要解析 Stack，提取关键 Application Frame（应用代码栈帧）：

```js
function getKeyStackFrame(stack) {
  if (!stack) return '';

  const lines = stack.split('\n');

  // 实际 SDK 中通常还会过滤：
  // monitor-sdk、node_modules、浏览器内部代码等
  const applicationFrame =
    lines.find(line =>
      !line.includes('monitor-sdk')
      && !line.includes('node_modules')
    );

  if (!applicationFrame) {
    return '';
  }

  // 示例：去掉 bundle hash
  return applicationFrame.replace(
    /app-[a-zA-Z0-9]+\.js/,
    'app.js'
  );
}
```

最终可以构造一个稳定的 Fingerprint Material：

```js
function buildFingerprintMaterial(error) {
  return [
    error.name,
    normalizeMessage(error.message ?? ''),
    getKeyStackFrame(error.stack)
  ].join('|');
}
```

例如：

```js
buildFingerprintMaterial(error);
```

得到：

TypeError | Cannot read properties of undefined | at renderPrice (/assets/app.js:1:18203)

再对它计算 Hash：

```js
function buildFingerprint(error) {
  const material =
    buildFingerprintMaterial(error);

  return hash(material);
}
```

因此完整过程实际上是：

```text
Raw Error Event
       ↓
提取 Error Type
       ↓
Normalize Message
去除 ID / 参数等动态内容
       ↓
Parse Stack
提取关键 Application Frame
       ↓
构造稳定特征
       ↓
Hash
       ↓
Fingerprint
```

服务端就可以按照 Fingerprint 归组：

```js
const issues = new Map();

function handleErrorEvent(event) {
  const fingerprint =
    event.fingerprint;

  let issue =
    issues.get(fingerprint);

  if (!issue) {
    issue = {
      fingerprint,

      name: event.name,
      message: event.message,

      occurrences: 0,

      users: new Set(),
      sessions: new Set(),

      versions: new Map(),
      routes: new Map(),

      firstSeen: event.timestamp,
      lastSeen: event.timestamp
    };

    issues.set(
      fingerprint,
      issue
    );
  }

  issue.occurrences++;

  issue.users.add(
    event.userId
  );

  issue.sessions.add(
    event.sessionId
  );

  issue.lastSeen =
    event.timestamp;

  increment(
    issue.versions,
    event.version
  );

  increment(
    issue.routes,
    event.route
  );
}
```

5000 条 Error Event 最终可能形成：

```js
{
  fingerprint: 'fp_8ac31',

  name: 'TypeError',

  occurrences: 5000,

  affectedUsers: 2800,

  affectedSessions: 3200,

  firstSeen: '...',
  lastSeen: '...',

  versions: {
    '2.4.1': 4700,
    '2.4.2': 300
  },

  routes: {
    '/products': 4500,
    '/search': 500
  }
}
```

也就是监控平台最终展示的：

```text
Issue #1842

TypeError
renderPrice @ ProductList

Occurrences       5000
Affected Users    2800
Affected Sessions 3200

主要版本：
2.4.1

主要页面：
/products
```

因此这里需要明确三个层次：

```text
Error Event / Occurrence
某一次用户真实发生的错误
        ↓
Fingerprint
判断这些错误是否属于同一个问题
        ↓
Issue
大量根因相同的 Error Event 聚合后的问题
```

Issue 形成以后，异常监控也不能只看 `Error Count`。

例如：

```text
场景 A：
1 个用户循环重试 5000 次
→ Error Count = 5000

场景 B：
5000 个用户各失败 1 次
→ Error Count = 5000
```

错误次数一样，但影响范围完全不同。

因此 Issue 通常至少需要统计：

| 指标 | 含义 |
| ------------------------ | ------------------------------------------ |
| **Occurrences** | 该 Issue 实际发生多少次 |
| **Affected Users** | 有多少去重用户遇到问题 |
| **Affected Sessions** | 有多少次用户会话受到影响 |
| **Error Rate** | 发生异常的 View / Session / Operation 占比 |
| **Version Distribution** | 问题主要集中在哪个版本 |
| **Route Distribution** | 问题主要集中在哪个页面 |
| **Trend** | 异常是在增长还是恢复 |

对于 Business Error，不一定适合按照 Stack 生成 Fingerprint。

例如：

```js
{
  code: 'PAYMENT_FAILED',
  message:
    'Payment failed for order 12345'
}
```

业务本身已经知道：

PAYMENT_FAILED

才是真正稳定的错误类别，因此可以直接提供 Custom Fingerprint：

```js
monitor.captureError({
  category: 'business',

  code: 'PAYMENT_FAILED',

  message:
    'Payment failed for order 12345',

  fingerprint:
    'checkout:payment-failed'
});
```

这样不同订单：

order 12345；order 92831；order 78126

都可以归入：

Issue：checkout:payment-failed

因此 Fingerprint 的核心不是简单 Hash Error，而是：

> **先从 Error Event 中提取能够稳定代表问题根因的特征，再生成 Fingerprint；服务端依据 Fingerprint 将不同用户、不同时间真实发生的 Error Event 聚合成 Issue，并在 Issue 层继续统计 Occurrences、Affected Users、Affected Sessions、Version、Route 和 Trend，从而把“几千条错误日志”转换成“几个真正需要研发处理的问题”。**

---

最终，整个 Error SDK 可以组织成：

```text
┌──────────────────── Error Source ────────────────────┐
│                                                      │
│ Runtime           Resource / Network                 │
│ JS / Promise      Resource / Fetch / XHR / WS        │
│                                                      │
│ Framework         Browser / Environment              │
│ React / Vue       CSP / Permission / Policy          │
│                                                      │
│ Business                                             │
│ Rule / Business Logic                               │
└────────┬───────────────┬───────────────┬──────────────┘
         │               │               │
         ↓               ↓               ↓
 Listener / Wrapper / Framework Hook / Rule / Manual
                         │
                         ↓
                    ErrorCollector
                         │
                         ↓
                  normalizeError()
                         │
                         ↓
                     ErrorData
                         │
                         ↓
               Deduplication
                         │
                         ↓
             Fingerprint / Grouping
                         │
                         ↓
                      Context
                         │
                         ↓
                Filter / Sampling
                         │
                         ↓
                  Queue / Batch
                         │
                         ↓
                     Reporter
                         │
                         ↓
                Monitoring Server
                         │
                         ↓
            Issue Grouping / Aggregate
                         │
                         ↓
          Error Rate / Affected Users
          Route / Version / Trend
                         │
                         ↓
                Dashboard / Alert
```

其中前半部分和 Performance 最大的区别是：

```text
Performance

PerformanceEntry / web-vitals / rAF
        ↓
指标自己的计算逻辑
        ↓
PerformanceData

Error

Error Event / API Failure /
Framework Hook / Business Rule
        ↓
异常标准化 + 去重 / 归组
        ↓
ErrorData
```

但是从：

```text
Context
→ Filter / Sampling
→ Queue / Batch
→ Reporter
```

开始，就可以继续复用同一套 Monitoring SDK 公共基础设施。

> 异常监控先按照 Runtime、Resource / Network、Framework / Library、Browser / Environment 和 Business 五个失败层次组织数据，再根据“哪一层最先知道失败发生”选择 Listener、Wrapper、Framework Hook、声明式规则或手动插桩；不同来源的数据进入 SDK 后统一转换成 ErrorData，并经过异常去重、指纹归组、Context 补充以及公共 Queue / Reporter 链路进入监控平台，最终形成 Error Rate、Affected Users、版本趋势和告警等稳定性指标。

## 4. Event：事件数据的采集与处理

### 【事件数据的分类与采集框架】

Event（事件）记录的是：

> **某一个有意义的行为、状态变化或者业务结果，在某个时间点发生了。**

OpenTelemetry 对 Event 的定义也是类似的：Event 用于表示一个有名称的、发生在特定时间点的事件，适合描述 User Interaction（用户交互）、State Transition（状态变化）、Lifecycle Moment（生命周期节点）以及一个操作过程中的 Checkpoint（检查点）或 Outcome（结果）。[[54]](https://opentelemetry.io/docs/specs/semconv/general/events)

所以 Event 与 Performance、Error 的关系可以理解为：

```text
用户点击“提交”
      ↓
Event
发生了一次 submit_order

      ↓
交互用了 600ms
Performance
INP / Business Timing

      ↓
请求最终失败
Error
order_submit_failed
```

三类数据可能描述的是同一次运行过程，但观察角度不同。

从前端监控的实际采集来看，Event 可以按照**事件语义从技术层到业务层**整理为四层：

| 类型 | 典型事件 | 主要采集方式 |
| --------------------------------- | -------------------------------- | ------------------------------------------ |
| **Technical / Lifecycle Event** | Page View、Route Change、Request | Listener / Hook / Wrapper 自动采集 |
| **User Action Event** | Click、Submit、Input | Global Listener 自动采集 + 声明式命名 |
| **Business Event** | 搜索结果展示、支付完成、任务完成 | Rule 或 Manual Instrumentation |
| **Audit-related Operation Event** | 修改权限、删除数据、审批操作 | 前端记录行为上下文，服务端记录权威审计结果 |

它们的区别仍然遵循前面建立的原则：

```text
SDK 已经知道发生了什么
→ Automatic

SDK 知道发生了 Click
但不知道“这个 Click 是什么业务动作”
→ Automatic + Declarative

只有业务代码知道
“支付已经完成”
→ Manual Instrumentation
```

所以 Event 监控最重要的不是“把浏览器所有 Event 都上传”，而是：

> **从大量技术事件中选择真正有分析价值的事件，并为它们建立稳定、明确的业务语义。**

---

### 【技术过程与用户交互事件】

#### <u>1. Technical / Lifecycle Event：复用已有自动插桩能力</u>

页面本身就存在很多可以自动观察的过程事件，例如：

Page View；Route Change；Page Hidden / Visible；Request Start / End；Resource Load

这一部分和前面网络、自动插桩已经存在大量重复，因此不需要重新展开。

例如 Request Event：

Business Code → fetch() → SDK Fetch Wrapper → Request Start → Response → Request End → 生成 Request Event

最终可以形成：

```json
{
  type: 'event',

  category: 'technical',
  name: 'http.request',

  attributes: {
    method: 'GET',
    url: '/api/products',
    status: 200
  },

  timestamp: ...
}
```

重点不是再次解释怎么 Wrap Fetch，而是：

> **Performance、Error 和 Event 可以共享同一个网络 Instrumentation，只是从同一次请求中生成不同用途的数据。**

例如：

```text
一次 Fetch

├─ duration = 800ms
│  → Performance / Diagnostic
│
├─ status = 500
│  → Error
│
└─ GET /api/products completed
   → Event
```

是否真的需要同时保存三份数据，则由监控平台的数据模型决定，不应该为了分类而机械复制数据。

#### <u>2. User Action Event：自动采集行为，再补充业务语义</u>

User Action（用户动作）是 Event 监控中更需要重点处理的一类。

浏览器本身已经知道：

click；submit；change；keydown

所以 SDK 可以在初始化时采用 Event Delegation（事件委托），只注册一个全局 Listener：

```js
document.addEventListener(
  'click',
  handleClick,
  true
);
```

这样所有按钮点击都可以自动捕获：

用户 Click → Browser click Event → Global Action Listener → Action Collector

问题在于，浏览器只能告诉 SDK：

```js
{
  type: 'click',
  target: button
}
```

却不知道：

> **这个按钮在业务上表示“提交退款申请”。**

因此用户动作通常是最典型的：

**Automatic Collection + Declarative Configuration。**

例如约定：

```html
<button
  data-monitor-action="refund.submit"
>
  提交退款
</button>
```

全局 Collector：

```js
function handleClick(event) {
  const element =
    event.target.closest(
      '[data-monitor-action]'
    );

  if (!element) return;

  emitEvent({
    category: 'action',

    name:
      element.dataset.monitorAction,

    action: 'click',

    timestamp: Date.now()
  });
}
```

于是：

普通 DOM Click → Global Listener → 找到 data-monitor-action → click + refund.submit → 得到有业务语义的 Action Event

最终不是：

```json
{
  name: 'click',
  text: '提交'
}
```

而是：

```json
{
  category: 'action',

  name: 'refund.submit',

  action: 'click',

  route: '/refund',

  timestamp: ...
}
```

Datadog Browser RUM 也是这一思路：Browser SDK 可以自动采集用户 Click，同时允许通过 `data-dd-action-name` 为自动采集的 Action 指定稳定的业务名称；不能自动表达的动作，则可以通过 Custom Action API 主动产生。[[12]](https://docs.datadoghq.com/real_user_monitoring/application_monitoring/browser/tracking_user_actions)

所以这里一个非常重要的设计原则是：

> **不要要求每个按钮都写 `monitor.trackClick()`；能够通过全局 Listener 自动发现的行为，应由 SDK 自动采集，需要业务参与的只是“这个行为叫什么”。**

---

### 【业务事件与操作审计】

#### <u>1. Business Event：记录浏览器无法自行理解的业务节点</u>

User Action 记录的是：

> “用户做了什么。”

Business Event 进一步记录：

> **“业务上真正发生了什么。”**

两者不能直接等同。

例如：

```text
Click：点击支付按钮

Business Event：
payment_success
```

中间可能经历：

点击支付 → 请求支付接口 → 等待支付结果 → 服务端确认成功 → 页面更新

因此不能因为：

用户 Click “支付”

就直接产生：

payment_success

如果业务代码最终拿到支付成功结果，可以主动记录：

```js
async function pay() {
  const result =
    await submitPayment();

  if (result.success) {
    monitor.trackEvent(
      'payment.success',
      {
        paymentMethod:
          result.method
      }
    );
  }
}
```

链路就是：

Business Logic → 业务状态真正成立 → trackEvent() → Business Event

同样：

```js
monitor.trackEvent(
  'search.result_shown',
  {
    resultCount: 20
  }
);

monitor.trackEvent(
  'task.completed',
  {
    taskType: 'batch_import'
  }
);
```

都属于典型的 Manual Instrumentation。

所以业务事件的边界是：

> **只有业务代码能够确认某个业务状态已经成立时，由业务主动产生 Event。**

如果企业存在统一协议，也可以进一步自动化。例如所有异步任务都返回：

```js
{
  status: 'SUCCESS'
}
```

那么可以在公共 Request / Task Adapter 中按照 Rule 自动转换成：

task.completed

而不必每个业务页面重复埋点。

#### <u>2. 单个按钮记录：区分行为埋点与审计记录</u>

这里需要特别区分一个很常见的需求：

> “我要记录某个用户点击了某个按钮。”

它实际上可能对应两个完全不同的目标。

如果只是为了分析：

有多少用户点击“申请权限”；点击率是多少；异常发生前用户是否点击过它

那么它属于普通 User Action。

直接使用声明式配置即可：

```html
<button
  data-monitor-action="permission.apply"
>
  申请权限
</button>
```

SDK 自动产生：

```js
{
  category: 'action',

  name: 'permission.apply',

  action: 'click',

  route: '/permission',

  timestamp: ...
}
```

这已经足够。

---

但如果需求是：

> **“需要审计某个用户是否真正执行了修改权限操作。”**

那么只记录按钮 Click 就不够。

例如：

```text
用户 Click “删除权限”
      ↓
前端 Event 已经产生
      ↓
请求发送失败

或者：

用户 Click
      ↓
后端权限校验失败
      ↓
操作没有真正执行
```

如果只看前端 Click，就可能错误地认为：

用户已经删除权限

所以需要区分三个状态：

```text
Intent
用户尝试执行操作

Execution
服务端收到并执行操作

Outcome
操作最终 Success / Fail
```

前端可以记录：

```js
{
  name: 'permission.remove.clicked',
  operationId: 'op-123'
}
```

同时请求携带：

```js
await removePermission({
  operationId: 'op-123',
  targetUserId
});
```

服务端真正完成权限校验和数据修改以后，再记录：

```js
{
  event: 'permission.remove',

  operationId: 'op-123',

  actor: 'user-A',

  target: 'user-B',

  result: 'success',

  timestamp: ...
}
```

最终可以通过：

operationId

关联：

```text
Frontend Action
用户发起操作
       ↓
Request
       ↓
Backend Operation
       ↓
Audit Result
```

OWASP 对应用日志建议记录 `when / where / who / what`，并进一步记录 Action、Object、Result Status 和 Reason；同时强调来自不同 Trust Zone 的 Event Data 可能被篡改、伪造或重放，需要按照可信程度处理。[[55]](https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html)

因此：

> **前端 Event 可以作为用户操作轨迹和审计上下文，但不能单独作为敏感操作的权威 Audit Log。权限修改、资金操作、数据删除等最终结果应该由可信服务端在完成鉴权和实际操作后记录。**

这和前文已经提出的“前端 Event 不能直接等同于权威 Audit Log”是一致的。

---

### 【EventData 的统一结构与采集重点】

不同事件最后仍然需要进入统一的数据模型。

可以定义：

```ts
interface EventData {
  type: 'event';

  category:
    | 'technical'
    | 'action'
    | 'business'
    | 'audit';

  name: string;

  action?: string;
  target?: string;

  outcome?:
    | 'success'
    | 'failure'
    | 'unknown';

  attributes?:
    Record<string, unknown>;

  interactionId?: string;
  operationId?: string;
  requestId?: string;
  traceId?: string;

  timestamp: number;
}
```

例如一个按钮：

```js
{
  type: 'event',

  category: 'action',

  name: 'permission.apply',

  action: 'click',

  timestamp: ...
}
```

一个业务结果：

```js
{
  type: 'event',

  category: 'business',

  name: 'permission.apply.completed',

  outcome: 'success',

  operationId: 'op-123',

  timestamp: ...
}
```

Event 数据设计时需要重点控制几个问题。

**第一，Event Name 要稳定，不要把动态数据写进名称。**

推荐：

```js
name = 'order.submit'

attributes = {
  orderType: 'normal'
}
```

而不是：

```js
name =
  'order_938271_submit'
```

OpenTelemetry 对 Event 也建议使用低基数（Low-cardinality）的稳定 Event Name，把具体变化的数据放进 Attributes。[[54]](https://opentelemetry.io/docs/specs/semconv/general/events)

**第二，自动 Click 不应该无差别全部上传。**

页面可能每分钟产生大量 DOM Event。真正值得监控的通常是：

关键入口；关键操作；核心流程节点；需要关联异常 / 性能的动作

因此可以通过：

```html
data-monitor-action
```

明确哪些元素需要形成业务 Action，而不是把每个普通 Click 都长期保存。

**第三，Event 要注意隐私和敏感字段。**

不要直接把：

input.value；完整 innerText；Token；密码；身份证；用户填写的自由文本

作为 Event Attribute 上传。

Datadog 的用户动作采集本身也专门提供 Action Name Privacy / Masking 能力，说明自动采集 DOM 内容时必须考虑隐私边界。[[12]](https://docs.datadoghq.com/real_user_monitoring/application_monitoring/browser/tracking_user_actions)

**第四，关键事件要建立 Correlation ID（关联 ID）。**

例如：

```text
User Action
actionId = A1
      ↓
Business Operation
operationId = O1
      ↓
HTTP Request
requestId = R1
      ↓
Error / Performance
```

这样才能在异常发生以后回答：

> **用户之前做了什么 → 触发了哪个业务操作 → 发出了哪个请求 → 最后在哪里失败。**

Datadog RUM 的 Action 本身也具有独立的 `action.id`，并可以把该 Action 期间产生的 Resource、Error、Long Task 等数据关联起来。[[12]](https://docs.datadoghq.com/real_user_monitoring/application_monitoring/browser/tracking_user_actions)

---

最终，Event SDK 不需要另外建立一套完全不同的上报基础设施，可以继续复用前面的公共链路：

```text
             Event Source
                  │
 ┌────────────────┼─────────────────┐
 │                │                 │
Technical      User Action      Business
 │                │                 │
Hook / Wrapper   Listener         Manual / Rule
 │                │                 │
 └────────────────┼─────────────────┘
                  ↓
             EventCollector
                  ↓
        Semantic Enrichment
     Name / Action / Target
                  ↓
           normalizeEvent()
                  ↓
              EventData
                  ↓
       Context / Correlation
                  ↓
       Privacy / Filter
                  ↓
          Sampling Policy
                  ↓
       Queue / Batch / Reporter
                  ↓
          Monitoring Server
                  ↓
       Count / Funnel / Trend
       Action → Error Analysis
       Business Effect Analysis
```

这里和 Performance、Error 最大的不同在前半段：

```text
Performance
重点：
指标怎么计算

Error
重点：
异常怎么识别、去重和归组

Event
重点：
事件有没有稳定、准确的业务语义，
以及多个事件如何关联成一段真实业务过程
```

因此第四章可以最终收束为：

> Event 监控不是简单记录所有浏览器事件，而是从技术过程、用户操作和业务状态中选择有分析价值的关键节点。Route、Request 等技术事件可以通过已有 Hook / Wrapper 自动采集；Click 等用户操作适合通过全局 Listener 自动发现，再用声明式属性补充业务名称；只有业务逻辑才能确认的状态变化，则通过 `trackEvent()` 主动产生。对于权限修改、删除、资金等审计场景，前端 Action 只能记录用户的操作意图和上下文，最终权威的操作结果必须由服务端在完成鉴权和实际执行后记录，并通过 Operation ID 与前端事件关联。

## 5. 参考文献

[1] RODDEN K, HUTCHINSON H, FU X. [Measuring the User Experience on a Large Scale: User-Centered Metrics for Web Applications](https://research.google/pubs/measuring-the-user-experience-on-a-large-scale-user-centered-metrics-for-web-applications)[C/OL]. 2010[2026-09-10].

[2] ANTHROPIC. [Demystifying evals for AI agents](https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents)[EB/OL]. 2026-01-09[2026-09-10].

[3] WALTON P. [User-centric performance metrics](https://web.dev/articles/user-centric-performance-metrics)[EB/OL]. 2023-08-02[2026-09-10].

[4] WALTON P. [Best practices for measuring Web Vitals in the field](https://web.dev/articles/vitals-field-measurement-best-practices)[EB/OL]. 2022-05-11[2026-09-10].

[5] EWASCHUK R. [Monitoring Distributed Systems](https://sre.google/sre-book/monitoring-distributed-systems)[EB/OL]. [2026-09-10].

[6] OPENTELEMETRY. [What is OpenTelemetry?](https://opentelemetry.io/docs/what-is-opentelemetry)[EB/OL]. [2026-09-10].

[7] OPENTELEMETRY. [Instrumentation](https://opentelemetry.io/docs/concepts/instrumentation)[EB/OL]. [2026-09-10].

[8] OPENTELEMETRY. [Signals](https://opentelemetry.io/docs/concepts/signals)[EB/OL]. [2026-09-10].

[9] GOOGLECHROME. [web-vitals: Essential metrics for a healthy site](https://github.com/GoogleChrome/web-vitals)[EB/OL]. [2026-09-10].

[10] MDN CONTRIBUTORS. [Performance APIs](https://developer.mozilla.org/en-US/docs/Web/API/Performance_API/index.html)[EB/OL]. [2026-09-10].

[11] MDN CONTRIBUTORS. [Window: error event](https://developer.mozilla.org/en-US/docs/Web/API/Window/error_event)[EB/OL]. [2026-09-10].

[12] DATADOG. [Tracking User Actions](https://docs.datadoghq.com/real_user_monitoring/application_monitoring/browser/tracking_user_actions)[EB/OL]. [2026-09-10].

[13] OWASP FOUNDATION. [Secure Code Review](https://cheatsheetseries.owasp.org/cheatsheets/Secure_Code_Review_Cheat_Sheet.html)[EB/OL]. [2026-09-10].

[14] W3C. [Performance Timeline](https://www.w3.org/TR/performance-timeline)[S/OL]. 2025-05-21[2026-09-10].

[15] MDN CONTRIBUTORS. [PerformanceObserver](https://developer.mozilla.org/en-US/docs/Web/API/PerformanceObserver)[EB/OL]. [2026-09-10].

[16] NEW RELIC. [Instrumentation for browser monitoring](https://docs.newrelic.com/docs/browser/new-relic-browser/page-load-timing-resources/instrumentation-browser-monitoring)[EB/OL]. [2026-09-10].

[17] OPENTELEMETRY. [Using instrumentation libraries](https://opentelemetry.io/docs/languages/js/libraries)[EB/OL]. [2026-09-10].

[18] MDN CONTRIBUTORS. [User timing](https://developer.mozilla.org/en-US/docs/Web/API/Performance_API/User_timing)[EB/OL]. [2026-09-10].

[19] WALTON P. [Web Vitals](https://web.dev/articles/vitals)[EB/OL]. 2024-10-31[2026-09-10].

[20] BAKHSHINATEGH B, ROSS J, MOCNY M. [Towards an animation smoothness metric](https://web.dev/articles/smoothness)[EB/OL]. [2026-09-10].

[21] MCQUADE B, POLLARD B. [How the Core Web Vitals metrics thresholds were defined](https://web.dev/articles/defining-core-web-vitals-thresholds)[EB/OL]. 2025-05-07[2026-09-10].

[22] WAGNER J, POLLARD B. [Interaction to Next Paint (INP)](https://web.dev/articles/inp)[EB/OL]. 2025-09-02[2026-09-10].

[23] MDN CONTRIBUTORS. [PerformanceObserver: observe() method](https://developer.mozilla.org/en-US/docs/Web/API/PerformanceObserver/observe)[EB/OL]. [2026-09-10].

[24] W3C. [User Timing](https://www.w3.org/TR/user-timing)[S/OL]. 2026-03-11[2026-09-10].

[25] OPENTELEMETRY. [Metrics API](https://opentelemetry.io/docs/specs/otel/metrics/api)[S/OL]. [2026-09-10].

[26] OPENTELEMETRY. [JavaScript](https://opentelemetry.io/docs/languages/js)[EB/OL]. [2026-09-10].

[27] OPENTELEMETRY. [Sampling](https://opentelemetry.io/docs/languages/js/sampling)[EB/OL]. [2026-09-10].

[28] MDN CONTRIBUTORS. [Document: visibilitychange event](https://developer.mozilla.org/en-US/docs/Web/API/Document/visibilitychange_event)[EB/OL]. [2026-09-10].

[29] MDN CONTRIBUTORS. [Navigator: sendBeacon() method](https://developer.mozilla.org/en-US/docs/Web/API/Navigator/sendBeacon)[EB/OL]. [2026-09-10].

[30] W3C. [Paint Timing](https://www.w3.org/TR/paint-timing)[S/OL]. 2026-09-02[2026-09-10].

[31] W3C. [Largest Contentful Paint](https://www.w3.org/TR/largest-contentful-paint)[S/OL]. 2026-08-26[2026-09-10].

[32] WALTON P, POLLARD B. [Largest Contentful Paint (LCP)](https://web.dev/articles/lcp)[EB/OL]. 2025-09-04[2026-09-10].

[33] W3C. [Event Timing API](https://www.w3.org/TR/event-timing)[S/OL]. 2026-03-19[2026-09-10].

[34] WAGNER J, WALTON P, POLLARD B. [Optimize Interaction to Next Paint](https://web.dev/articles/optimize-inp)[EB/OL]. 2025-09-02[2026-09-10].

[35] MDN CONTRIBUTORS. [LayoutShift](https://developer.mozilla.org/en-US/docs/Web/API/LayoutShift)[EB/OL]. [2026-09-10].

[36] HEMPENIUS K, POLLARD B. [Debug layout shifts](https://web.dev/articles/debug-layout-shifts)[EB/OL]. 2025-02-07[2026-09-10].

[37] MDN CONTRIBUTORS. [LayoutShift: hadRecentInput property](https://developer.mozilla.org/en-US/docs/Web/API/LayoutShift/hadRecentInput)[EB/OL]. [2026-09-10].

[38] MIHAJLIJA M, WALTON P. [Cumulative Layout Shift (CLS)](https://web.dev/articles/cls)[EB/OL]. [2026-09-10].

[39] MDN CONTRIBUTORS. [Window: requestAnimationFrame() method](https://developer.mozilla.org/en-US/docs/Web/API/Window/requestAnimationFrame)[EB/OL]. [2026-09-10].

[40] MDN CONTRIBUTORS. [PerformanceResourceTiming](https://developer.mozilla.org/en-US/docs/Web/API/PerformanceResourceTiming)[EB/OL]. [2026-09-10].

[41] MDN CONTRIBUTORS. [PerformanceResourceTiming: requestStart property](https://developer.mozilla.org/en-US/docs/Web/API/PerformanceResourceTiming/requestStart)[EB/OL]. [2026-09-10].

[42] MDN CONTRIBUTORS. [PerformanceLongTaskTiming](https://developer.mozilla.org/en-US/docs/Web/API/PerformanceLongTaskTiming)[EB/OL]. [2026-09-10].

[43] POLLARD B, ROSENTHAL N. [Long Animation Frames API](https://developer.chrome.com/docs/web-platform/long-animation-frames)[EB/OL]. [2026-09-10].

[44] OPENTELEMETRY. [Recording errors](https://opentelemetry.io/docs/specs/semconv/general/recording-errors)[S/OL]. [2026-09-10].

[45] MDN CONTRIBUTORS. [Window: unhandledrejection event](https://developer.mozilla.org/en-US/docs/Web/API/Window/unhandledrejection_event)[EB/OL]. [2026-09-10].

[46] OPENTELEMETRY. [Semantic conventions for HTTP exceptions](https://opentelemetry.io/docs/specs/semconv/http/http-exceptions)[S/OL]. [2026-09-10].

[47] MDN CONTRIBUTORS. [WebSocket: close event](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket/close_event)[EB/OL]. [2026-09-10].

[48] REACT TEAM. [createRoot](https://react.dev/reference/react-dom/client/createRoot)[EB/OL]. [2026-09-10].

[49] VUE.JS TEAM. [Application API](https://vuejs.org/api/application.html)[EB/OL]. [2026-09-10].

[50] VUE.JS TEAM. [Production Error Code Reference](https://vuejs.org/error-reference)[EB/OL]. [2026-09-10].

[51] MDN CONTRIBUTORS. [Document: securitypolicyviolation event](https://developer.mozilla.org/en-US/docs/Web/API/Document/securitypolicyviolation_event)[EB/OL]. [2026-09-10].

[52] OPENTELEMETRY. [Semantic conventions for exceptions](https://opentelemetry.io/docs/specs/semconv/exceptions)[S/OL]. [2026-09-10].

[53] OPENTELEMETRY. [Semantic Conventions](https://opentelemetry.io/docs/specs/otel/semantic-conventions)[S/OL]. [2026-09-10].

[54] OPENTELEMETRY. [Semantic conventions for events](https://opentelemetry.io/docs/specs/semconv/general/events)[S/OL]. [2026-09-10].

[55] OWASP FOUNDATION. [Logging](https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html)[EB/OL]. [2026-09-10].
