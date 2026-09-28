# BOM 详细学习笔记（含知识点对应问题）

BOM 是 JavaScript 与浏览器窗口交互的核心接口，与 DOM 分工明确，是前端开发中操作浏览器环境的基础，以下从定义、核心对象、细节用法、面试要点等方面，结合具体代码和场景，详细梳理 BOM 相关知识点。

### BOM 核心定义

BOM 全称 `Browser Object Model`（浏览器对象模型），是一套用于访问和操作浏览器窗口及相关功能的 API 集合，核心作用是让 JavaScript 能够与浏览器环境进行交互，实现窗口控制、地址栏操作、历史记录管理、设备信息获取等能力。

BOM 与 DOM 是前端开发中两个核心的对象模型，二者定位清晰、分工明确，可通过一句话快速区分记忆：`DOM 操作页面内容，BOM 操作浏览器本身`。

具体分工：

DOM（文档对象模型）主要操作范围：页面节点、元素结构、HTML 文档内容，聚焦于页面本身的结构和内容操作；

BOM 主要操作范围：浏览器窗口、地址栏、历史记录、屏幕信息、定时器、导航行为，聚焦于浏览器环境的控制和信息获取。

知识点对应问题：1. BOM 的全称是什么？核心作用是什么？2. BOM 与 DOM 的核心区别是什么？各自的操作范围有哪些？3. 如何用一句话快速区分 BOM 和 DOM？

### BOM 核心对象关系

BOM 并非孤立的对象集合，而是以 `window` 为顶层核心对象的层级结构，浏览器中绝大多数 BOM 相关对象，本质上都是 `window` 对象的属性，无需手动声明，可直接通过 `window` 访问，也可省略 `window` 前缀直接调用。

BOM 核心对象及层级关系：

顶层对象：`window`（代表当前浏览器窗口，是 BOM 的根对象）；

核心子对象（均为 `window` 的属性）：

- `window.location`：操作当前页面 URL 及页面跳转；

- `window.history`：管理浏览器历史记录；

- `window.navigator`：获取浏览器及设备相关信息；

- `window.screen`：获取用户屏幕相关信息；

- `window.document`：指向页面 DOM 文档（严格来说属于 DOM，但因挂载于 `window` 下，常与 BOM 一起讲解）。

典型示例（省略 `window` 前缀的用法）：

```javascript
// 省略 window 前缀，本质是 window.alert()
alert("hello");
// 省略 window 前缀，本质是 window.setTimeout()
setTimeout(() => {}, 1000);

```

知识点对应问题：1. BOM 的顶层核心对象是什么？2. BOM 中的核心子对象有哪些？它们与顶层对象的关系是什么？3. 为什么我们可以直接使用 alert()、setTimeout() 等方法，无需手动写 window 前缀？

### window 对象详解

`window` 是 BOM 的核心对象，代表当前浏览器窗口，每个浏览器窗口、标签页，都会对应一个独立的 `window` 对象，它提供了弹窗、窗口操作、尺寸控制、事件监听、定时器等基础且高频的能力。

#### 弹窗相关方法

`window` 提供了三种原生弹窗方法，均为阻塞式操作（执行时会暂停页面其他代码运行），用于实现简单的交互提示，适用于不同的交互场景。

1. 提示框：`window.alert(message)`

功能：弹出一个包含提示信息的弹窗，仅包含“确定”按钮，无返回值，仅用于展示信息，无法获取用户交互反馈。

代码示例：

```javascript
// 弹出提示信息
window.alert("操作成功，请继续下一步");

```

2. 确认框：`window.confirm(message)`

功能：弹出一个包含提示信息、“确定”和“取消”按钮的弹窗，返回值为布尔值——用户点击“确定”返回`true`，点击“取消”返回 `false`，可用于获取用户的确认操作。

代码示例：

```javascript
// 弹出确认框，获取用户操作反馈
const ok = window.confirm("确定删除这条数据吗？此操作不可恢复");
if (ok) {
  console.log("用户点击了确定，执行删除逻辑");
} else {
  console.log("用户点击了取消，终止删除操作");
}

```

3. 输入框：`window.prompt(message, defaultText)`

功能：弹出一个包含提示信息、输入框、“确定”和“取消”按钮的弹窗，返回值为字符串——用户输入内容后点击“确定”，返回输入的字符串；点击“取消”，返回 `null`，可用于获取用户输入的简单信息。

参数说明：`message` 是提示信息，`defaultText` 是输入框的默认提示内容（可选）。

代码示例：

```javascript
// 弹出输入框，获取用户姓名
const userName = window.prompt("请输入你的姓名", "张三");
if (userName) {
  console.log(`用户输入的姓名是：${userName}`);
} else {
  console.log("用户取消了输入");
}

```

知识点对应问题：1. `window` 提供的三种弹窗方法分别是什么？各自的功能和返回值有何差异？2. 如何利用`confirm` 方法实现用户确认操作的逻辑？3.`prompt` 方法的第二个参数有什么作用？用户取消输入时返回什么？

#### 窗口操作方法

`window` 提供了打开、关闭浏览器窗口的方法，可用于实现页面跳转、新窗口打开等场景，核心方法为`window.open()` 和 `window.close()`。

1. 打开新窗口：`window.open(url, target, features)`

参数说明：

- `url`（可选）：要加载的页面 URL，默认值为空白页 `about:blank`；

- `target`（可选）：窗口打开目标，常用值有 `_blank`（新窗口打开）、`_self`（当前窗口打开）、`_parent`（父窗口打开）；

-`features`（可选）：窗口样式参数，用于设置新窗口的尺寸、位置、是否显示工具栏等，如 `width=500,height=400`（设置宽高）、`toolbar=no`（隐藏工具栏）。

代码示例：

```javascript
// 1. 新窗口打开指定页面（示例 URL：https://example.com）
window.open("https://example.com", "_blank");

// 2. 新窗口打开指定尺寸的页面，隐藏工具栏和地址栏
window.open(
  "https://example.com",
  "_blank",
  "width=500,height=400,toolbar=no,location=no"
);

// 3. 当前窗口打开页面（等价于 location.href 赋值）
window.open("https://www.baidu.com", "_self");

```

2. 关闭窗口：`window.close()`

注意事项：该方法仅能关闭由 `window.open()` 打开的窗口，或当前窗口本身；浏览器原生的主窗口（如首次打开的标签页）无法通过此方法关闭，会被浏览器拦截。

代码示例：

```javascript
// 打开新窗口并保存引用
const newWindow = window.open("https://example.com", "_blank");
// 3 秒后关闭新窗口
setTimeout(() => {
  newWindow.close();
}, 3000);

// 关闭当前窗口（仅对 window.open() 打开的窗口有效）
window.close();

```

知识点对应问题：1. `window.open()` 的三个参数分别是什么含义？2. 如何通过 `window.open()` 控制新窗口的尺寸和样式？3. `window.close()` 能否关闭浏览器原生的主标签页？为什么？

#### 窗口尺寸与位置控制

`window` 提供了获取窗口尺寸、滚动距离的属性，以及控制页面滚动的方法，是实现页面回到顶部、吸顶效果、懒加载等功能的核心。

1. 窗口尺寸相关属性

- `window.innerWidth` / `window.innerHeight`：获取浏览器窗口的可视区域尺寸（包含滚动条，不包含浏览器边框、工具栏）；

- `window.outerWidth` / `window.outerHeight`：获取浏览器窗口的整体尺寸（包含边框、工具栏、滚动条）。

2. 页面滚动相关属性与方法

- 滚动距离属性：`window.scrollX` / `window.pageXOffset`（水平滚动距离，二者等价）、`window.scrollY` / `window.pageYOffset`（垂直滚动距离，二者等价）；

- 滚动方法：

- `window.scrollTo(x, y)`：滚动到页面指定坐标（x 为水平坐标，y 为垂直坐标）；

- `window.scrollTo(options)`：支持配置滚动行为，如 `behavior: "smooth"` 实现平滑滚动；

- `window.scrollBy(dx, dy)`：按指定偏移量相对滚动（dx 为水平偏移，dy 为垂直偏移，正数向下/向右，负数向上/向左）。

代码示例：

```javascript
// 获取窗口可视尺寸
console.log("窗口可视宽度：", window.innerWidth);
console.log("窗口可视高度：", window.innerHeight);

// 获取页面垂直滚动距离
console.log("当前垂直滚动距离：", window.scrollY);

// 平滑滚动到页面顶部（y=0）
window.scrollTo({
  top: 0,
  behavior: "smooth"
});

// 相对滚动：向下滚动 100px
window.scrollBy(0, 100);

// 监听页面滚动，实现吸顶效果（示例）
window.addEventListener("scroll", () => {
  const scrollTop = window.scrollY;
  const header = document.querySelector("header");
  if (scrollTop > 100) {
    header.style.position = "fixed";
  } else {
    header.style.position = "static";
  }
});

```

常见场景：页面回到顶部、监听页面滚动实现吸顶/懒加载、适配不同窗口尺寸的响应式布局。

知识点对应问题：1. `innerWidth` 与 `outerWidth` 的核心区别是什么？2. 如何实现页面的平滑滚动到指定位置？3. 监听 `window.scroll` 事件可以实现哪些常见的前端效果？

#### window 核心事件

`window` 提供了多个全局事件，用于监听浏览器窗口的状态变化，是前端适配、性能优化、用户交互的关键，常用事件及用法如下：

1. 页面加载事件：`load`

触发时机：页面所有资源（HTML、CSS、JS、图片、字体等）全部加载完成后触发；

作用：确保页面元素和资源完全加载后，再执行相关操作（如操作 DOM、初始化数据），避免因元素未加载导致的报错。

代码示例：

```javascript
// 页面所有资源加载完成后执行
window.addEventListener("load", () => {
  console.log("页面所有资源加载完成");
  // 操作 DOM 元素（确保元素已存在）
  document.getElementById("title").innerText = "BOM 学习笔记";
});

```

2. 窗口尺寸变化事件：`resize`

触发时机：浏览器窗口的宽度或高度发生变化时持续触发；

作用：适配响应式布局，根据窗口尺寸调整页面样式或内容。

代码示例：

```javascript
// 监听窗口尺寸变化
window.addEventListener("resize", () => {
  console.log("窗口宽度：", window.innerWidth);
  // 响应式适配：小于 768px 时调整字体大小
  if (window.innerWidth < 768) {
    document.body.style.fontSize = "14px";
  } else {
    document.body.style.fontSize = "16px";
  }
});

```

3. 页面滚动事件：`scroll`

触发时机：页面滚动时持续触发；

作用：实现滚动监听、吸顶效果、懒加载、滚动进度显示等。

4. 页面卸载事件：`beforeunload`

触发时机：页面即将卸载（关闭标签页、刷新页面、跳转页面）前触发；

作用：提示用户保存未提交的内容，避免数据丢失。

代码示例：

```javascript
// 页面卸载前提示用户
window.addEventListener("beforeunload", (e) => {
  // 阻止默认卸载行为（部分浏览器需要）
  e.preventDefault();
  // 设置提示信息（部分浏览器会忽略自定义信息，显示默认提示）
  e.returnValue = "你有未保存的内容，确定要离开吗？";
  return e.returnValue;
});

```

5. 网络状态事件：`online` / `offline`

触发时机：浏览器联网（online）或断网（offline）时触发；

作用：提示用户网络状态变化，适配离线操作场景。

代码示例：

```javascript
// 网络恢复时提示
window.addEventListener("online", () => {
  alert("网络已恢复，可正常操作");
});

// 网络断开时提示
window.addEventListener("offline", () => {
  alert("网络已断开，请检查网络连接");
});

```

注意事项：事件绑定推荐使用 `addEventListener` 方法，相比 `window.onload = function()` 等赋值式绑定，可绑定多个事件处理函数，且便于移除。

知识点对应问题：1. `window.load` 事件与 `DOMContentLoaded` 事件的区别是什么？2. 监听 `resize` 事件时，如何避免频繁触发导致的性能问题？3. `beforeunload` 事件的核心作用是什么？如何实现未保存内容的提示？

#### 定时器相关方法

定时器是前端异步编程的基础，本质上是 `window` 对象提供的方法，用于实现延迟执行、循环执行的逻辑，核心有两种：`setTimeout` 和`setInterval`，均需配合对应的取消方法使用，避免内存泄漏。

1. 延迟执行：`window.setTimeout(callback, delay)`

功能：延迟指定时间（单位：毫秒）后，执行一次回调函数；

返回值：定时器ID（数字类型），用于取消定时器；

取消方法：`window.clearTimeout(timerId)`。

代码示例：

```javascript
// 1 秒后执行一次回调
const timer = setTimeout(() => {
  console.log("1秒后执行");
}, 1000);

// 取消定时器（若未执行）
clearTimeout(timer);
```

2. 循环执行：`window.setInterval(callback, interval)`

功能：按指定时间间隔（单位：毫秒），循环执行回调函数，直到手动取消；

返回值：定时器ID，用于取消定时器；

取消方法：`window.clearInterval(timerId)`。

代码示例：

```javascript
// 每秒执行一次，计数到 5 后取消
let count = 0;
const timer = setInterval(() => {
  count++;
  console.log(`第 ${count} 次执行`);
  if (count === 5) {
    clearInterval(timer);
    console.log("定时器已取消");
  }
}, 1000);

```

常见场景：倒计时、轮播图、延迟执行操作（如按钮防抖）、轮询请求（如实时获取数据）。

注意事项：定时器的回调执行时间可能存在延迟，因为 JavaScript 是单线程，若主线程有其他任务阻塞，会延迟回调的执行。

知识点对应问题：1. `setTimeout` 和 `setInterval` 的核心区别是什么？2. 如何取消定时器？取消定时器的关键是什么？3. 为什么定时器的回调执行时间可能会延迟？

### location 对象详解

`window.location`（简称 `location`）是 BOM 中操作 URL 与页面跳转的核心对象，提供了 URL 各组成部分的属性访问，以及页面跳转、刷新的方法，是前端实现页面导航、参数获取的关键。

#### location 核心属性

以 URL `https://www.example.com:8080/path/index.html?id=1&name=tom#top` 为例，详解 `location` 的各属性含义：

- `location.href`：完整的 URL 地址，可读写（赋值可实现页面跳转）；示例值：`https://www.example.com:8080/path/index.html?id=1&name=tom#top`；

- `location.protocol`：网络协议，只读；示例值：`https:`；

- `location.host`：主机名 + 端口号，只读；示例值：`www.example.com:8080`；

- `location.hostname`：主机名（不含端口号），只读；示例值：`www.example.com`；

- `location.port`：端口号，只读；示例值：`8080`；

- `location.pathname`：URL 中的路径部分（域名后的部分），只读；示例值：`/path/index.html`；

- `location.search`：URL 中的查询参数部分（包含 `?`），只读；示例值：`?id=1&name=tom`；

-`location.hash`：URL 中的锚点部分（包含 `#`），只读；示例值：`#top`。

代码示例：

```javascript
// 打印 URL 各组成部分
console.log("完整 URL：", location.href);
console.log("协议：", location.protocol);
console.log("查询参数：", location.search);
console.log("锚点：", location.hash);

```

#### location 核心方法

1. 页面跳转：`location.href = "URL"`

功能：跳转到指定 URL 页面，会在浏览器历史记录中新增一条记录，可通过“后退”按钮返回上一页；

代码示例：`location.href = "https://www.baidu.com";`

2. 页面刷新：`location.reload(force)`

参数说明：`force` 为布尔值，默认 `false`（从缓存中刷新），`true` 表示强制刷新（从服务器重新获取资源）；

代码示例：`location.reload(); // 普通刷新`、`location.reload(true); // 强制刷新`。

3. 替换当前页面：`location.replace("URL")`

功能：跳转到指定 URL 页面，但会替换当前的历史记录，无法通过“后退”按钮返回上一页；

适用场景：登录后跳转、一次性跳转（无需返回上一页）；

代码示例：`location.replace("https://www.baidu.com");`

4. 重新赋值跳转：`location.assign("URL")`

功能：与 `location.href` 效果一致，跳转到指定 URL 页面，新增历史记录；

代码示例：`location.assign("https://www.baidu.com");`

#### 常见场景：获取 URL 查询参数

通过 `location.search` 获取查询参数后，可使用 `URLSearchParams` 解析参数，实现页面间的数据传递。

代码示例：

```javascript
// 假设当前 URL 为：https://www.example.com:8080/path/index.html?id=1&name=tom#top
const searchParams = new URLSearchParams(location.search);
// 获取单个参数
const id = searchParams.get("id"); // 输出：1
const name = searchParams.get("name"); // 输出：tom
// 获取所有参数
const allParams = Object.fromEntries(searchParams); // 输出：{id: "1", name: "tom"}

```

知识点对应问题：1. `location` 对象的核心作用是什么？2. `location.href` 与 `location.replace()` 的区别是什么？3. 如何通过 `location` 对象获取 URL 中的查询参数？4.`location.reload()` 的 `force` 参数有什么作用？

### history 对象详解

`window.history`（简称 `history`）是 BOM 中用于操作浏览器历史记录的核心对象，提供了前进、后退、刷新等方法，以及 HTML5 新增的 History API，是前端单页应用（SPA）路由实现的核心。

#### history 核心属性

`history.length`：只读属性，返回当前浏览器会话中历史记录的数量（包含当前页面）；

代码示例：`console.log("历史记录数量：", history.length);`

#### history 核心方法（基础用法）

1. 后退一页：`history.back()`

功能：等价于浏览器的“后退”按钮，返回上一条历史记录；

代码示例：`history.back();`

2. 前进一页：`history.forward()`

功能：等价于浏览器的“前进”按钮，跳转到下一条历史记录；

代码示例：`history.forward();`

3. 前进/后退指定步数：`history.go(n)`

参数说明：`n` 为数字，`n=1` 前进一页，`n=-1` 后退一页，`n=0` 刷新当前页面；

代码示例：`history.go(-1); // 后退一页`、`history.go(1); // 前进一步`、`history.go(0); // 刷新页面`。

#### HTML5 History API（进阶用法）

HTML5 新增了 `pushState` 和 `replaceState` 方法，用于修改浏览器地址栏 URL，且不刷新页面，是 SPA 单页应用路由（如 Vue Router、React Router）的核心实现方式。

1. 新增历史记录：`history.pushState(state, title, url)`

参数说明：

- `state`：存储与当前历史记录关联的数据（可通过 `popstate` 事件获取）；

- `title`：历史记录的标题（多数浏览器忽略，可传空字符串）；

- `url`：新的 URL 地址（必须与当前页面同源，否则报错）。

核心作用：修改地址栏 URL，不刷新页面，新增一条历史记录。

2. 替换历史记录：`history.replaceState(state, title, url)`

参数与 `pushState` 一致，核心区别：替换当前历史记录，不新增记录，无法通过“后退”按钮返回修改前的 URL。

3. 监听历史记录变化：`popstate` 事件

触发时机：当用户点击“前进”“后退”按钮，或调用 `history.back()`、`history.forward()`、`history.go()` 方法时触发；

作用：监听路由变化，实现 SPA 页面的视图切换。

代码示例（SPA 路由核心逻辑）：

```javascript
// 新增历史记录，修改地址栏（不刷新页面）
history.pushState({ id: 1 }, "", "/user?id=1");

// 替换当前历史记录
history.replaceState({ id: 2 }, "", "/user?id=2");

// 监听历史记录变化，实现视图切换
window.addEventListener("popstate", (e) => {
  console.log("路由变化，关联数据：", e.state);
  // 根据 URL 变化，渲染对应页面视图
  renderPage(location.pathname);
});

// 自定义渲染页面函数（示例）
function renderPage(path) {
  switch (path) {
    case "/user?id=1":
      console.log("渲染用户1页面");
      break;
    case "/user?id=2":
      console.log("渲染用户2页面");
      break;
    default:
      console.log("渲染首页");
  }
}

```

常见场景：SPA 单页应用路由、地址栏无刷新切换页面、返回上一页/前进一页操作。

知识点对应问题：1. `history` 对象的核心作用是什么？2. `history.back()`、`history.forward()`、`history.go()` 的区别是什么？3. HTML5 History API 中的 `pushState` 和 `replaceState` 的核心区别是什么？4. 如何监听浏览器历史记录的变化？

### navigator 对象详解

`window.navigator`（简称 `navigator`）是 BOM 中用于获取浏览器和设备相关信息的核心对象，提供了浏览器类型、网络状态、地理位置等信息，可用于设备适配、网络状态判断等场景。

#### navigator 核心属性

- `navigator.userAgent`：浏览器的用户代理字符串（UA），包含浏览器类型、版本、操作系统等信息，可用于判断浏览器类型；

- `navigator.language`：浏览器的默认语言（如 `zh-CN` 表示中文简体）；

- `navigator.onLine`：布尔值，表示浏览器当前是否联网（`true` 联网，`false` 断网）；

- `navigator.platform`：浏览器运行的操作系统平台（如 `Win32`、`MacIntel`）。

代码示例：

```javascript
console.log("浏览器 UA：", navigator.userAgent);
console.log("浏览器语言：", navigator.language);
console.log("是否联网：", navigator.onLine);
console.log("操作系统平台：", navigator.platform);

```

#### navigator 核心用法

1. 判断网络状态

结合 `navigator.onLine` 和 `online`/`offline` 事件，可实时监听网络状态变化，提示用户或执行对应逻辑。

代码示例：

```javascript
// 初始网络状态
console.log("初始网络状态：", navigator.onLine);

// 监听网络状态变化
window.addEventListener("online", () => {
  console.log("网络已恢复，可正常加载数据");
});

window.addEventListener("offline", () => {
  console.log("网络已断开，切换至离线模式");
});

```

2. 获取地理位置

通过 `navigator.geolocation` 对象，可获取用户的地理位置（经纬度），需用户授权，适用于地图、定位相关场景。

代码示例：

```javascript
// 获取用户地理位置
navigator.geolocation.getCurrentPosition(
  // 成功回调：获取到地理位置
  (position) => {
    const latitude = position.coords.latitude; // 纬度
    const longitude = position.coords.longitude; // 经度
    console.log("用户纬度：", latitude);
    console.log("用户经度：", longitude);
  },
  // 失败回调：获取失败（如用户拒绝授权）
  (err) => {
    console.log("获取地理位置失败：", err.message);
  }
);

```

3. 操作剪贴板

通过 `navigator.clipboard` 对象，可实现复制、粘贴文本的功能，需在安全上下文（HTTPS）中使用。

代码示例：

```javascript
// 复制文本到剪贴板
async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    console.log("复制成功");
  } catch (err) {
    console.log("复制失败：", err);
  }
}

// 从剪贴板读取文本
async function readText() {
  try {
    const text = await navigator.clipboard.readText();
    console.log("剪贴板内容：", text);
    return text;
  } catch (err) {
    console.log("读取剪贴板失败：", err);
  }
}

// 调用复制函数
copyText("BOM 学习笔记");

```

常见场景：网络状态提示、用户定位、剪贴板操作、浏览器/设备类型判断。

知识点对应问题：1. `navigator` 对象的核心作用是什么？2. 如何通过 `navigator` 判断浏览器是否联网？3. 如何获取用户的地理位置？需要注意什么？4.`navigator.clipboard` 的使用有什么限制？

### screen 对象详解

`window.screen`（简称 `screen`）是 BOM 中用于获取用户屏幕相关信息的核心对象，提供了屏幕尺寸、可用尺寸等属性，可用于页面适配、新窗口尺寸设置等场景。

#### screen 核心属性

- `screen.width`：屏幕的整体宽度（像素），只读；

- `screen.height`：屏幕的整体高度（像素），只读；

- `screen.availWidth`：屏幕的可用宽度（像素），排除任务栏、边框等区域，只读；

- `screen.availHeight`：屏幕的可用高度（像素），排除任务栏、边框等区域，只读。

代码示例：

```javascript
console.log("屏幕整体宽度：", screen.width);
console.log("屏幕整体高度：", screen.height);
console.log("屏幕可用宽度：", screen.availWidth);
console.log("屏幕可用高度：", screen.availHeight);

```

常见场景：

1. 适配大屏展示：根据屏幕尺寸调整页面布局，实现响应式适配；

2. 打开新窗口时设置尺寸：结合 `window.open()`，设置新窗口尺寸与屏幕尺寸适配；

3. 获取设备分辨率参考：用于统计设备类型（如大屏、小屏设备）。

知识点对应问题：1. `screen` 对象的核心作用是什么？2. `screen.width` 与 `screen.availWidth` 的区别是什么？3. `screen` 对象的常见应用场景有哪些？

### document 对象（与 BOM 的关联）

严格来说，`document` 对象属于 DOM（文档对象模型），并非 BOM 的核心对象，但因为它是 `window.document`（`window` 的属性），且常与 BOM 一起使用，因此很多资料会将其与 BOM 同步讲解。

`document` 的核心作用是操作页面的 HTML 文档内容，常用用法如下：

1. 修改网页标题：`document.title`（可读写）；

代码示例：`document.title = "BOM 详细学习笔记"; // 修改网页标题`；

2. 操作 Cookie：`document.cookie`（可读写），用于存储少量会话信息；

代码示例：`document.cookie = "username=tom"; // 设置 Cookie`、`console.log(document.cookie); // 获取所有 Cookie`；

3. 操作页面元素：如 `document.getElementById()`、`document.querySelector()` 等，用于获取、修改页面元素。

知识点对应问题：1. `document` 对象属于 BOM 还是 DOM？为什么常与 BOM 一起讲解？2. `document` 的常见用法有哪些？3. 如何通过 `document` 修改网页标题和操作 Cookie？

### BOM 中的其他常用能力

以下能力虽不属于 BOM 核心对象，但前端开发中常将其归为浏览器对象的能力，与 BOM 一起记忆，主要包括本地存储和 Cookie 相关操作。

#### 本地存储

本地存储用于在浏览器中存储少量数据，无需与服务器交互，分为 `localStorage` 和 `sessionStorage`，均为 `window` 的属性。

1. `localStorage`（长期存储）

核心特点：长期存储，除非手动删除，否则不会过期；存储容量约 5MB；同一域名下的所有页面可共享数据。

常用方法：

- `localStorage.setItem(key, value)`：存储数据（key 和 value 均为字符串）；

- `localStorage.getItem(key)`：获取指定 key 对应的 value；

- `localStorage.removeItem(key)`：删除指定 key 的数据；

- `localStorage.clear()`：删除所有存储的数据。

代码示例：

```javascript
// 存储数据
localStorage.setItem("token", "123456");
localStorage.setItem("username", "tom");

// 获取数据
const token = localStorage.getItem("token");
console.log("token：", token);

// 删除指定数据
localStorage.removeItem("username");

// 删除所有数据
// localStorage.clear();

```

2.`sessionStorage`（会话级存储）

核心特点：会话级存储，关闭当前标签页或浏览器后，数据自动失效；存储容量约 5MB；仅当前标签页可访问数据，同一域名下的其他标签页无法共享。

常用方法：与 `localStorage` 一致，仅存储范围和有效期不同。

代码示例：

```javascript
// 存储会话级数据
sessionStorage.setItem("name", "jerry");

// 获取数据
const name = sessionStorage.getItem("name");
console.log("name：", name);

```

#### Cookie

Cookie 用于存储少量会话信息，由服务器发送给浏览器，浏览器存储后，每次请求服务器时会自动携带，可用于登录态保持、会话跟踪等场景。

常用用法：通过 `document.cookie` 读写 Cookie，格式为 `key=value; expires=过期时间; path=路径; domain=域名`。

代码示例：

```javascript
// 设置 Cookie（有效期为 1 天）
const date = new Date();
date.setTime(date.getTime() + 24 * 60 * 60 * 1000);
document.cookie = `username=tom; expires=${date.toUTCString()}; path=/`;

// 获取所有 Cookie
console.log("所有 Cookie：", document.cookie);

```

常见场景：登录态保持、会话信息存储、与服务端配合实现身份验证。

知识点对应问题：1.`localStorage` 与 `sessionStorage` 的核心区别是什么？2. 两者的存储容量和有效期分别是怎样的？3. Cookie 的核心作用是什么？与本地存储有什么区别？

### BOM 与 DOM 的高频区分点

BOM 和 DOM 是前端开发中最易混淆的两个对象模型，核心区别集中在操作对象、定位和作用上，具体区分如下：

1. 操作对象不同

- BOM：操作浏览器本身，包括窗口、地址栏、历史记录、屏幕、浏览器信息等；

- DOM：操作页面内容，包括 HTML 元素、节点、文本、属性等。

2. 核心定位不同

- BOM：聚焦于浏览器环境的控制和交互，是 JavaScript 与浏览器通信的桥梁；

- DOM：聚焦于页面结构的操作和渲染，是 JavaScript 与 HTML 文档通信的桥梁。
> （注：文档部分内容可能由 AI 生成）