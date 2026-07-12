# 页面白屏时间计算方法及实践笔记

**一句话结论**：页面白屏时间一般指从用户发起进入页面，到页面第一次出现可感知内容之间的时间。实际工作中，不会仅依赖单一指标，通常结合 Performance API、FP/FCP、手动埋点、首屏元素监听、SPA 路由切换埋点等方式综合判断。

### 白屏时间的定义

白屏时间并非严格、唯一的浏览器标准字段，其本质是衡量用户体验的核心指标，工程上需结合浏览器性能指标与业务埋点共同衡量，常见口径主要有三种：

- 从页面开始加载，到浏览器第一次绘制内容（哪怕只是背景色变化）；

- 从页面开始加载，到首屏主要业务内容出现；

- 从 SPA 路由切换开始，到新页面内容出现（针对单页应用场景）。

**对应问题**：白屏时间的核心定义是什么？为什么它没有唯一的官方字段？工程上通常如何衡量？

### 白屏时间的计算方法（含实践细节）

#### 方法一：Performance API 粗略估算

这是最基础、易接入的方法，核心思路是以页面导航开始时间为起点，选取较早的渲染阶段作为终点，粗略反映白屏耗时。

##### 核心思路与代码

以 `navigationStart`（页面开始导航时间）为起点，`responseStart`（浏览器收到服务端首字节响应时间）为终点，计算两者差值：

```javascript
const timing = performance.timing;
const whiteScreenTime = timing.responseStart - timing.navigationStart;
console.log('白屏时间(粗略):', whiteScreenTime);
```

##### 核心API解析

- `performance.timing`：提供页面导航和资源加载的详细时间数据，包含多个关键时间节点；

- `navigationStart`：用户开始导航到当前页面的时间（如点击链接、输入URL后按下回车的时刻）；

- `responseStart`：浏览器成功接收服务器返回的第一个字节的时间，标志着网络请求阶段的结束。

##### 优缺点

- 优点：实现简单，无需复杂配置，老项目可快速接入，适合做全局粗略监控；

- 缺点：并非真正的“视觉白屏结束时间”，仅反映网络响应耗时，此时浏览器可能尚未开始渲染内容，用户无法看到任何可感知元素。

##### 面试核心表达

我用过 Navigation Timing 做白屏时间的粗略估算，比如用 `responseStart - navigationStart` 计算，但它更偏向网络响应时间，无法准确表示用户看到内容的时刻，因此仅作为基础监控手段，后续会结合更精准的指标。

**对应问题**：用 Performance API 粗略估算白屏时间的核心公式是什么？该方法的优缺点分别是什么？

#### 方法二：FP/FCP 计算（接近真实用户体验）

这是实际工作中最常用的方法，通过监听浏览器绘制指标，精准捕捉“用户首次看到内容”的时刻，其中 FCP 比 FP 更具参考价值。

##### 核心指标解析

- FP（First Paint，首次绘制）：浏览器第一次在页面上绘制像素的时间，可能只是背景色、边框等非业务内容，不代表用户能看到有效信息；

- FCP（First Contentful Paint，首次内容绘制）：浏览器第一次绘制文本、图片、canvas、SVG 等有效内容的时间，更接近用户“看到内容”的真实时刻，工程上通常用 FCP 近似表示白屏结束时间。

##### 核心代码（PerformanceObserver 监听）

```javascript
const observer = new PerformanceObserver((list) => {
  const entries = list.getEntries();
  for (const entry of entries) {
    if (entry.name === 'first-paint') {
      console.log('FP:', entry.startTime); // 首次绘制时间
    }
    if (entry.name === 'first-contentful-paint') {
      console.log('FCP:', entry.startTime); // 首次内容绘制时间（近似白屏结束时间）
    }
  }
});

observer.observe({ type: 'paint', buffered: true });
```

##### 核心API解析

- `PerformanceObserver`：用于监听浏览器各类性能指标（如绘制、导航、资源加载等）的API，可实时捕捉指标数据；

- `observe({ type: 'paint', buffered: true })`：`type: 'paint'` 表示监听绘制相关指标，`buffered: true` 表示即使监听器注册较晚，也能获取之前已产生的性能记录（避免错过早期绘制指标）。

##### 关键疑问：为什么 FCP 更适合表示白屏结束？

FP 可能仅完成页面背景色绘制，此时页面仍处于“视觉白屏”状态；而 FCP 标志着至少有一项有效内容（文本、图片等）被渲染，用户能明确感知到页面正在加载，因此更贴合白屏时间的核心定义。

##### 面试核心表达

我更常用 `PerformanceObserver` 监听 paint 类型指标，重点关注 FCP。因为 FP 可能只是首次像素绘制（如背景色），无法反映用户是否看到有效内容，而 FCP 能代表用户真正开始看到内容的时刻，因此通常用它作为白屏结束的近似时间。

**对应问题**：FP 和 FCP 的区别是什么？为什么工程上常用 FCP 近似表示白屏时间？如何用代码监听这两个指标？

#### 方法三：手动埋点（业务场景精准监控）

原生指标（FP/FCP）可能无法准确反映“业务真正可见”的时间（如 FCP 较早，但首屏核心内容需等待接口返回后才渲染），此时需结合业务场景手动埋点，捕捉真实的首屏内容出现时间。

##### 核心思路与基础代码

通过 `performance.mark()` 打时间标记，`performance.measure()` 计算两个标记的时间差，精准统计“页面开始加载”到“业务内容渲染完成”的耗时：

```javascript
// 页面初始化开始时，打开始标记
performance.mark('page-start');

// 首屏主内容渲染完成后（如接口返回数据、组件挂载完成），打结束标记
performance.mark('page-content-rendered');

// 计算两个标记之间的时间差（即业务白屏时间）
performance.measure(
  'white-screen',
  'page-start',
  'page-content-rendered'
);

// 获取计算结果
const measures = performance.getEntriesByName('white-screen');
console.log('业务白屏时间:', measures[0].duration);
```

##### 核心API解析

- `performance.mark(name)`：在当前时间点打一个自定义标记，`name` 为标记名称（可自定义，如 'page-start'）；

- `performance.measure(name, startMark, endMark)`：计算两个标记之间的时间差，`name` 为测量结果名称，`startMark` 为开始标记名称，`endMark` 为结束标记名称；

- `performance.getEntriesByName(name)`：获取指定名称的测量结果，返回一个数组，其中 `duration` 属性即为两个标记的时间差。

##### 常见打点时机（结合框架示例）

打点时机需结合业务场景，核心是“首屏核心内容真正渲染完成”，常见时机包括：页面初始化开始、首屏骨架屏出现、首屏主容器挂载、首条数据渲染完成、首张关键图片加载完成等，以下是 Vue 和 React 中的示例：

###### Vue 示例

```javascript
mounted() {
  // 组件挂载完成（首屏内容渲染完成），打结束标记
  performance.mark('page-content-rendered');
  // 计算业务白屏时间
  performance.measure('white-screen', 'page-start', 'page-content-rendered');
  // 获取并打印结果
  const result = performance.getEntriesByName('white-screen')[0];
  console.log('白屏时间:', result.duration);
}
```

###### React 示例

```javascript
useEffect(() => {
  // 组件挂载完成，打结束标记（依赖数组为空，仅执行一次）
  performance.mark('page-content-rendered');
  // 计算业务白屏时间
  performance.measure('white-screen', 'page-start', 'page-content-rendered');
  // 获取并打印结果
  const result = performance.getEntriesByName('white-screen')[0];
  console.log('白屏时间:', result.duration);
}, []);
```

##### 方法价值

解决原生指标的局限性，精准回答“用户什么时候看到业务内容”，而非“浏览器什么时候开始绘制”，更贴合业务场景的用户体验需求。

##### 面试核心表达

在实际项目里，我会结合手动埋点。比如进入页面时打一个开始点，首屏核心模块（如首页banner、商品列表）渲染完成后再打一个结束点，用 `performance.mark` + `performance.measure` 算出业务白屏时间。因为很多页面 FCP 很早，但用户真正关心的业务内容其实还没出来，手动埋点能更精准地反映真实体验。

**对应问题**：手动埋点计算白屏时间的核心API有哪些？Vue 和 React 中，常见的打点时机是什么？该方法的核心价值是什么？

#### 方法四：首屏关键元素监听

若页面首屏结构明确（如首页主标题、banner图、商品卡片等），可直接将关键 DOM 元素的出现作为白屏结束标志，精准捕捉“用户能看到核心内容”的时刻。

##### 常见实现方式

###### 方式1：元素渲染后打点（基础版，略晚）

```javascript
window.addEventListener('load', () => {
  // 选中首屏关键元素（如主内容容器）
  const el = document.querySelector('#main-content');
  if (el) {
    // 获取当前时间，作为白屏结束时间
    const time = performance.now();
    console.log('首屏关键元素出现时间:', time);
  }
});
```

注意：`window.load` 事件会等待页面所有资源（图片、脚本、样式等）加载完成后触发，因此该方式获取的时间偏晚，仅适合对精度要求不高的场景。

###### 方式2：元素挂载后立即打点（推荐版）

```javascript
// 自定义方法，用于上报关键元素出现时间
function reportMainContentReady() {
  const time = performance.now();
  console.log('首屏主内容出现:', time);
}

// 首屏接口数据渲染完成、关键元素挂载后，立即调用
renderMainContent(data); // 渲染首屏核心内容的方法
reportMainContentReady(); // 打点上报
```

###### 方式3：关键图片加载完成打点（针对图片为主的页面）

```javascript
const img = document.querySelector('#banner-img'); // 首屏关键图片

if (img) {
  // 若图片已缓存（complete为true），直接打点
  if (img.complete) {
    console.log('图片已加载完成:', performance.now());
  } else {
    // 图片未缓存，监听onload事件，加载完成后打点
    img.onload = () => {
      console.log('首屏关键图片加载完成:', performance.now());
    };
  }
}
```

##### 适用场景

官网首页、商品详情页、图文内容页、Banner 视觉占比高的页面，这类页面的关键元素出现，直接决定用户的视觉体验。

**对应问题**：监听首屏关键元素出现的常见方式有哪些？为什么不推荐用 `window.load` 事件打点？

#### 方法五：SPA 路由切换白屏时间监控

SPA（单页应用）的白屏问题，除了首次加载，更多出现在路由切换时（如异步路由组件加载慢、chunk 体积过大、首屏接口耗时久等），因此需单独监控路由切换时的白屏时间。

##### Vue Router 示例

```javascript
// 路由切换开始时，打开始标记
router.beforeEach((to, from, next) => {
  performance.mark('route-change-start');
  next();
});

// 路由切换完成后，打结束标记（需等待页面渲染）
router.afterEach(() => {
  // requestAnimationFrame：等待浏览器下一帧渲染完成，确保页面已显示
  requestAnimationFrame(() => {
    performance.mark('route-content-rendered');
    // 计算路由切换白屏时间
    performance.measure(
      'route-white-screen',
      'route-change-start',
      'route-content-rendered'
    );
    // 获取并打印结果
    const result = performance.getEntriesByName('route-white-screen').pop();
    console.log('路由切换白屏时间:', result.duration);
  });
});
```

##### 关键细节：为什么用 requestAnimationFrame？

`router.afterEach` 仅表示路由切换的逻辑流程完成（如路由守卫执行完毕、组件开始挂载），不代表页面已经真正渲染到屏幕上。`requestAnimationFrame` 会将回调函数放入浏览器的渲染队列，等待下一帧渲染完成后执行，此时能准确捕捉到“页面真正显示”的时刻，避免因渲染延迟导致的时间计算偏差。

##### React Router 思路

核心逻辑与 Vue Router 一致：路由变化时记录开始时间，新页面组件挂载完成后，用 `requestAnimationFrame` 记录结束时间，计算时间差：

```javascript
// 路由切换时（如点击路由链接、编程式导航），打开始标记
performance.mark('route-change-start');

// 新页面组件挂载完成后，打结束标记
useEffect(() => {
  requestAnimationFrame(() => {
    performance.mark('route-content-rendered');
    // 计算路由切换白屏时间
    performance.measure(
      'route-white-screen',
      'route-change-start',
      'route-content-rendered'
    );
    // 获取并打印结果
    const result = performance.getEntriesByName('route-white-screen').pop();
    console.log('路由白屏时间:', result.duration);
  });
}, []); // 依赖数组为空，仅在组件挂载时执行一次
```

##### 面试核心表达

在 SPA 项目里，我除了关注首次加载的白屏时间，还会重点监控路由切换白屏。通常会在路由开始切换时打点，在新页面首屏内容渲染完成后，用 `requestAnimationFrame` 再打结束点，计算出路由级白屏时间。因为实际用户更常遇到的是切页白屏，而非首次打开页面的白屏，这也是 SPA 性能优化的重点。

**对应问题**：SPA 路由切换白屏的常见原因有哪些？为什么需要用 `requestAnimationFrame` 记录结束时间？Vue Router 和 React Router 中如何实现路由切换白屏监控？

#### 方法六：MutationObserver 细粒度首屏检测（补充手段）

若想更精细地判断“页面什么时候不再是纯白”，可通过监听 DOM 结构变化，自动探测首屏内容是否出现，适合首屏内容由异步渲染产生的场景（如接口返回后渲染 DOM）。

##### 核心代码

```javascript
// 初始化 MutationObserver，监听 DOM 变化
const observer = new MutationObserver(() => {
  // 选中首屏核心内容容器
  const main = document.querySelector('#main-content');
  // 若容器存在且有非空内容，说明首屏已渲染，停止监听并打点
  if (main && main.innerText.trim()) {
    console.log('检测到首屏内容出现:', performance.now());
    observer.disconnect(); // 停止监听，避免重复触发
  }
});

// 监听 document.body 的子节点变化（包括子树）
observer.observe(document.body, {
  childList: true, // 监听子节点的增删
  subtree: true    // 监听整个子树的变化（而非仅直接子节点）
});
```

##### 核心API解析

- `MutationObserver`：用于监听 DOM 结构变化的 API，可监测节点增删、属性变化、文本内容变化等；

- `observe(target, options)`：`target` 为要监听的 DOM 节点，`options` 为监听配置，`childList: true` 表示监听子节点增删，`subtree: true` 表示监听整个子树的变化。

##### 优缺点

- 优点：可自动探测 DOM 变化，无需手动打点，适合做监控 SDK 或复杂异步渲染场景；

- 缺点：复杂度高，容易误判（如非首屏内容的 DOM 变化被当成首屏），线上使用需注意性能开销（频繁 DOM 变化会触发大量回调）。

注意：该方法仅作为补充手段，不推荐作为首选，通常结合 FCP 和手动埋点使用。

**对应问题**：MutationObserver 用于首屏检测的核心思路是什么？该方法的优缺点及适用场景是什么？

### 实际项目中的综合实践方案

实际工作中，不会依赖单一方法，而是结合多种方式，形成“统一监控+业务补充+专项监控”的方案，具体如下：

#### 方案一：全站统一监控用 FCP

通过 `PerformanceObserver` 监听 FCP 指标，作为全站白屏时间的统一监控标准，代码如下：

```javascript
new PerformanceObserver((list) => {
  for (const entry of list.getEntries()) {
    if (entry.name === 'first-contentful-paint') {
      console.log('FCP:', entry.startTime);
      // 可将 FCP 数据上报至监控平台，用于全局性能对比
    }
  }
}).observe({ type: 'paint', buffered: true });
```

选择 FCP 的原因：标准化程度高，易于全站横向对比，能快速发现性能异常页面（如某页面 FCP 远超平均值）。

#### 方案二：核心页面加业务埋点

对于首页、商品详情页、列表页等核心业务页面，在 FCP 监控的基础上，补充手动埋点，精准统计“业务内容可见时间”，避免 FCP 过早但业务内容未加载的误判。

核心逻辑：页面初始化时打 `page-start` 标记，首屏核心业务模块（如首条商品数据、banner图）渲染完成后打 `first-screen-ready` 标记，用 `performance.measure()` 计算时间差，上报至监控平台，用于分析业务层面的用户体验。

#### 方案三：SPA 路由切换单独监控

针对 SPA 项目，单独监控路由切换白屏时间，重点关注异步路由加载、chunk 体积、首屏接口耗时等问题，通过路由守卫+`requestAnimationFrame` 实现精准打点，及时发现切页白屏异常。

**对应问题**：实际项目中，你是如何综合多种方法监控白屏时间的？为什么要分“统一监控+业务补充+专项监控”？

### 核心 API 总结（附细节）

白屏时间计算涉及的核心 API 均来自 `performance` 相关接口，以下是详细总结，含适用场景和关键细节：

#### 1. performance.now()

作用：返回当前页面上下文中的高精度时间，单位为毫秒（精度高于 `Date.now()`），适合做局部代码耗时统计。

```javascript
const start = performance.now();
// 执行需要统计耗时的操作（如渲染组件、请求接口）
const end = performance.now();
console.log('操作耗时:', end - start); // 高精度耗时
```

关键细节：`performance.now()` 的时间起点是页面导航开始（`navigationStart`），而非系统时间，避免系统时间偏差导致的统计错误。

#### 2. performance.mark(name)

作用：在当前时间点打一个自定义时间标记，用于后续 `performance.measure()` 计算时间差，`name` 为标记名称（唯一，可自定义）。

```javascript
performance.mark('start-render'); // 开始标记
// 执行渲染操作
performance.mark('end-render'); // 结束标记
```

#### 3. performance.measure(name, startMark, endMark)

作用：计算两个自定义标记（`startMark` 和 `endMark`）之间的时间差，生成一个测量结果，`name` 为测量结果的名称。

```javascript
performance.measure('render-time', 'start-render', 'end-render');
const result = performance.getEntriesByName('render-time')[0];
console.log('渲染耗时:', result.duration);
```

#### 4. PerformanceObserver

作用：监听浏览器各类性能指标（如 paint、navigation、resource 等），实时捕捉指标数据，适合监控 FP、FCP 等原生性能指标。

关键细节：`buffered: true` 配置是重点，可确保监听器注册较晚时，仍能获取之前已产生的性能记录，避免错过早期指标。

#### 5. MutationObserver

作用：监听 DOM 结构变化，可用于细粒度首屏检测，捕捉异步渲染的 DOM 出现时刻。

关键细节：监听完成后需调用 `observer.disconnect()` 停止监听，避免频繁触发回调，造成性能开销。

#### 6. requestAnimationFrame(callback)

作用：将回调函数放入浏览器的渲染队列，等待下一帧渲染完成后执行，适合“等待页面真正渲染后再打点”的场景（如 SPA 路由切换）。

关键细节：回调函数的执行时机与浏览器渲染节奏一致，能确保获取的时间是页面真正显示在屏幕上的时刻，避免渲染延迟导致的时间偏差。

**对应问题**：`performance.now()` 与 `Date.now()` 的区别是什么？`PerformanceObserver` 的 `buffered: true` 有什么作用？

### 面试高频回答（可直接使用）

页面白屏时间通常指从用户发起页面访问，到页面第一次出现可感知内容之间的时间。这个指标本身没有唯一的官方字段，所以工程上我一般会结合浏览器原生性能指标和业务埋点一起看。

我用过几种方法。第一种是用 Navigation Timing 做粗略估算，比如 `responseStart - navigationStart`，但这个更偏网络响应时间，不够准确。第二种是用 `PerformanceObserver` 监听 paint 指标，重点看 FCP，因为 FCP 更接近用户真正看到内容的时刻。第三种是做业务埋点，比如在页面开始时 `performance.mark('page-start')`，在首屏主内容渲染完成后再打一个点，然后用 `performance.measure()` 算首屏内容出现时间。

如果是 SPA，我还会单独监控路由切换白屏时间，比如在 `router.beforeEach` 记录开始时间，在新页面渲染完成后用 `requestAnimationFrame` 再打结束点。因为很多白屏其实不是首屏加载，而是切页时异步组件、chunk 或接口加载过慢导致的。

所以实际项目里我的做法一般是：用 FCP 做统一监控，用业务埋点补充真实首屏体验，再对 SPA 的路由切换做专项监控。

### 常见坑点（避坑指南）

#### 坑点1：直接用 window.load 计算白屏时间

`window.load` 事件会等待页面所有资源（图片、脚本、样式、字体等）全部加载完成后才触发，此时页面早已完成渲染，获取的时间远晚于真实白屏结束时间，完全不适合表示白屏时间。

#### 坑点2：将 DOMContentLoaded 等同于白屏结束

`DOMContentLoaded` 事件仅表示页面 DOM 解析完成，不代表页面已经渲染出可感知内容（可能 DOM 解析完，但 CSS 未加载完成、接口未返回，页面仍为白屏），因此不能作为白屏结束的标志。

#### 坑点3：认为 FCP 一定等于真正首屏完成

FCP 仅表示“首次内容绘制”，可能只是页面中的一个小文本、一个图标，而非首屏核心业务内容（如骨架屏渲染完成后 FCP 已触发，但真实商品数据尚未加载），因此需结合业务埋点补充验证。

**对应问题**：计算白屏时间时，常见的坑点有哪些？为什么不能用 `window.load` 和 `DOMContentLoaded` 作为白屏结束标志？
> （注：文档部分内容可能由 AI 生成）