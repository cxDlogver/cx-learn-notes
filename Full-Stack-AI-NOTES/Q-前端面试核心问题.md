# 答题整理

## 第1题 从输入 URL 到页面最终展示，浏览器经历了哪些过程？

### 题目

从输入 URL 到页面最终展示，浏览器经历了哪些过程？

### 问题

假设面试官问你：

**“在 Chrome 浏览器地址栏输入 `https://www.baidu.com` 并回车，到最终看到页面，中间完整经历了哪些过程？”**

请你先自己回答。

要求不用特别细，但最好能够把整个过程分成几个阶段，并把 **DNS、TCP/TLS、HTTP、DOM/CSSOM、Layout、Paint、Composite** 串起来。文档将这条链路作为最核心的综合问题之一。`基于Chrome浏览器渲染原理.md`

### 回答要点

建议按照 **“网络请求 → 页面渲染”** 两个阶段回答：
#### 1. URL 解析

- 解析协议、域名、端口、路径、查询参数。
#### 2. DNS 解析

- 先检查浏览器/系统/本地 DNS 缓存。
- 未命中时，本地 DNS 服务器通过根 DNS → 顶级 DNS → 权威 DNS 逐级查询。
- 最终得到服务器 IP 地址。
#### 3. 建立连接

- HTTP/1.1、HTTP/2 通常先建立 TCP 连接，经过三次握手。
- HTTPS 还需要进行 TLS 握手，完成服务器身份认证、证书校验和会话密钥协商。
#### 4. HTTP 请求与响应

- 浏览器发送 HTTP 请求。
- 服务器处理请求并返回 HTML 等资源。
#### 5. 解析 HTML / CSS / JS

- HTML 解析生成 DOM。
- CSS 解析生成 CSSOM。
- 普通同步 JS 可能阻塞 HTML 解析；`async`、`defer`具有不同的加载和执行机制。
#### 6. 生成渲染树

- DOM + CSSOM → Render Tree。
#### 7. Layout

- 计算元素尺寸和位置。
#### 8. Paint

- 生成颜色、文字、边框、图片等绘制指令。
#### 9. 分层、栅格化与合成

- 浏览器根据页面情况进行分层。
- 图层经过栅格化后交给合成线程/GPU进行组合。
- 最终提交到屏幕显示。

这基本对应文档给出的完整链路。`基于Chrome浏览器渲染原理.md`

---

### 标准回答

在 Chrome 浏览器中，从输入 URL 到最终看到页面，整体可以分成两个大的阶段：**网络请求阶段和页面渲染阶段**。

首先是网络请求阶段。

用户在地址栏输入 URL 并回车以后，浏览器首先会解析 URL，从中获取协议、域名、端口号、路径以及查询参数等信息。

接下来需要根据域名获取目标服务器的 IP 地址，也就是进行 DNS 解析。浏览器首先会检查已有的 DNS 缓存，例如浏览器相关缓存、操作系统 DNS 缓存以及本地 DNS 服务器缓存。如果缓存命中，就可以直接得到 IP 地址；如果没有命中，则本地 DNS 服务器会继续向根域名服务器、顶级域名服务器以及权威域名服务器逐级查询，最终获得域名对应的 IP 地址并返回给浏览器。`基于Chrome浏览器渲染原理.md`

浏览器获取服务器 IP 后，需要建立网络连接。对于基于 TCP 的 HTTP 通信，客户端和服务器会通过三次握手建立 TCP 连接：客户端发送 SYN，服务器返回 SYN+ACK，客户端再返回 ACK。

如果访问的是 HTTPS，还需要在 TCP 连接之上进行 TLS 握手。TLS 握手主要完成三件事情：**验证服务器身份、校验服务器数字证书以及协商后续通信使用的会话密钥**。客户端会依据本地信任的 CA 证书链对服务器证书进行验证，从而确认当前通信对象确实是目标服务器。`基于Chrome浏览器渲染原理.md`

连接建立后，浏览器向服务器发送 HTTP 请求。服务器接收到请求后，根据 URL 和业务逻辑进行处理，并返回 HTTP 响应。对于普通网页访问，初始响应通常包含 HTML 内容，之后页面中的 CSS、JavaScript、图片、字体等资源还会继续产生新的网络请求。

拿到 HTML 数据以后，就进入页面渲染阶段。

浏览器会逐步解析 HTML，构建 DOM 树；与此同时，页面中的 CSS 会被下载并解析形成 CSSOM 树。浏览器还会利用预加载扫描器提前发现 CSS、JavaScript、图片等外部资源并发起下载。`基于Chrome浏览器渲染原理.md`

如果 HTML 解析过程中遇到普通的同步 `<script>`，即没有设置 `async` 或 `defer`，浏览器会暂停当前 HTML 的解析，先下载并执行 JavaScript，脚本执行完成后再继续解析 HTML。

当浏览器获得 DOM 和 CSSOM 后，会结合两者计算页面需要显示的节点和样式，生成 Render Tree，也就是渲染树。

随后进入 **Layout** 阶段。浏览器根据渲染树计算各个元素的具体尺寸和位置，例如宽度、高度以及页面中的坐标。

Layout 完成后进入 **Paint** 阶段，浏览器根据布局结果生成文字、背景、边框、图片、阴影等内容对应的绘制指令。

之后浏览器还会根据元素特性进行分层，并将图层内容进行栅格化，转换为 GPU 可以处理的纹理。最后由合成线程和 GPU 根据图层顺序、`transform`、`opacity`等信息完成 Composite，也就是图层合成，并将最终生成的一帧画面提交给屏幕显示。`基于Chrome浏览器渲染原理.md`

因此可以把整个过程概括为：

**URL 解析 → DNS 解析 → 建立 TCP/TLS 连接 → HTTP 请求/响应 → HTML/CSS/JS 解析 → DOM + CSSOM → Render Tree → Layout → Paint → Raster → Composite → 页面显示。**

---

## 第2题 CSS 会不会阻塞 HTML 解析和页面渲染？

### 题目

CSS 会不会阻塞 HTML 解析和页面渲染？

### 问题

文档中明确提到：**CSS 不阻塞 DOM 构建，但会阻塞 Render Tree 的形成和页面绘制。**`基于Chrome浏览器渲染原理.md`

假设页面如下：

```html
<head>
  <link rel="stylesheet" href="index.css">
</head>

<body>
  <div>Hello</div>
</body>
```

现在 `index.css` 下载非常慢。

请回答：

**1. 浏览器还能不能继续解析下面的 HTML，构建 DOM？**

**2. 此时能不能直接把 `Hello` 显示到屏幕上？**

**3. 为什么 CSS 不阻塞 DOM 解析，却会阻塞页面渲染？**

### 回答要点

按照下面三个层次回答最清楚：
#### 1. CSS 不会阻塞 DOM 构建

- HTML 解析器仍然可以继续解析 HTML、构建 DOM。
- CSS 的下载和解析可以与 HTML 解析并行进行。
#### 2. CSS 会阻塞页面渲染

- CSS 需要先解析形成 CSSOM。
- Render Tree 的生成依赖 **DOM + CSSOM**。
- CSSOM 没有准备好时，浏览器无法确定元素最终样式，因此不能完成 Render Tree 和后续绘制。
#### 3. 核心关系

- CSS 不阻塞：`HTML → DOM`
- CSS 会阻塞：`DOM + CSSOM → Render Tree → Paint`

这与文档中的结论一致：CSS 不阻塞 DOM 构建，但会阻塞 Render Tree 和页面绘制。`基于Chrome浏览器渲染原理.md`

### 标准回答

CSS **不会阻塞 DOM 树的构建，但是会阻塞页面渲染**。

浏览器解析 HTML 时，如果遇到外部 CSS，会同时下载并解析 CSS，因此 HTML 解析本身仍然可以继续进行，DOM 树也可以继续构建。

但是 CSS 需要解析形成 CSSOM，而后续的 Render Tree 是由 **DOM 和 CSSOM 共同生成的**。在 CSSOM 没有构建完成之前，浏览器还无法确定 DOM 节点最终应该应用什么样式，因此无法完成 Render Tree 的构建，也就不能继续进行后面的 Layout、Paint 等渲染过程。`基于Chrome浏览器渲染原理.md`

所以可以总结为一句话：

**CSS 不阻塞 HTML 解析和 DOM 构建，但会阻塞 Render Tree 的生成以及页面绘制。**

例如：

```html
<head>
  <link rel="stylesheet" href="index.css">
</head>
<body>
  <div>Hello</div>
</body>
```

即使 `index.css` 下载得很慢，浏览器仍然可以继续解析 `<body>` 和 `<div>`，构建 DOM；但是此时浏览器还不能确定 `Hello` 最终的颜色、字体、大小、布局等样式，因此需要等待 CSSOM 准备好，再结合 DOM 生成 Render Tree，之后才能完成后续渲染。`基于Chrome浏览器渲染原理.md`

你刚才的回答中只有最后一句需要纠正：

> “页面渲染会不阻塞”

应该改成：

> **CSS 会阻塞页面渲染，但不会阻塞 DOM 树的解析和构建。**

---

## 第3题 JavaScript 为什么会阻塞 HTML 解析？普通 `script`、`async` 和 `defer` 有什么区别？

### 题目

JavaScript 为什么会阻塞 HTML 解析？普通 `script`、`async` 和 `defer` 有什么区别？

### 问题

文档中提到，普通 `<script>` 会暂停 HTML 解析，而 `async` 和 `defer` 可以改变脚本的加载和执行方式。`基于Chrome浏览器渲染原理.md`

假设有下面三个脚本：

```html
<script src="a.js"></script>

<script async src="b.js"></script>

<script defer src="c.js"></script>
```

请回答：

1. 普通 `<script>` 为什么会阻塞 HTML 解析？
2. `async` 脚本什么时候下载、什么时候执行？
3. `defer` 脚本什么时候下载、什么时候执行？
4. 如果有多个 `async` 或多个 `defer` 脚本，它们的执行顺序应该如何理解？

### 回答要点

按照 **“JS 为什么阻塞 DOM → CSSOM 与 JS 的关系 → 三类脚本区别 → 使用场景”** 的顺序回答。
#### 1. JavaScript 为什么会阻塞 DOM 解析

- JavaScript 可以读取和修改 DOM、CSSOM。
- HTML 解析与 JavaScript 执行都涉及渲染进程主线程。
- 因此普通脚本执行时，HTML 解析器会暂停，等 JS 执行结束后再继续构建 DOM。文档也明确指出，普通 `<script>` 会暂停 HTML 解析。`基于Chrome浏览器渲染原理.md`
#### 2. CSSOM 与 JavaScript 的阻塞关系

- CSS 的下载和 CSSOM 构建本身不会阻塞 HTML 继续解析。
- 但是对于前面已经发现、会阻塞脚本执行的样式表，普通解析阻塞脚本通常需要等待相关 CSS 样式准备好再执行，因为 JS 可能读取元素的计算样式。
- 因此常见依赖链可以理解为：  
  **CSSOM 未准备好 → JS 等待执行 → JS 未执行完 → DOM 解析继续等待。**  
  MDN 也明确说明，CSS 不阻塞 HTML 解析，但会阻塞需要依赖它的 JavaScript 执行。([MDN Web Docs](https://developer.mozilla.org/en-US/docs/Web/Performance/Guides/How_browsers_work?utm_source=chatgpt.com))
#### 3. 普通 `<script>`

- 浏览器解析到脚本时暂停 HTML 解析。
- 等脚本资源准备好，并等待前面阻塞脚本执行的 CSS。
- 执行 JS。
- JS 执行结束后继续解析 HTML。
- 因此普通脚本是典型的 **解析阻塞脚本**。([HTML Living Standard](https://html.spec.whatwg.org/multipage/scripting.html?utm_source=chatgpt.com))
#### 4. `async`

- JS 文件与 HTML 解析并行下载。
- 下载期间不阻塞 DOM 构建，也不会停止 CSSOM 自己的构建过程。
- 文件准备好后尽快执行，执行时可能打断当前 HTML 解析。
- 多个 `async` 不保证执行顺序。([HTML Living Standard](https://html.spec.whatwg.org/dev/scripting.html?utm_source=chatgpt.com))
- 因此更适合**不依赖完整 DOM、不依赖其他脚本执行顺序**的独立脚本，例如统计、埋点、广告等。
#### 5. `defer`

- JS 文件与 HTML 解析并行下载。
- 下载期间不阻塞 DOM 构建。
- 等整个 HTML 解析完成后再执行。
- 多个 `defer` 脚本按照文档中的顺序执行。
- 并且在 `DOMContentLoaded` 事件之前执行。`基于Chrome浏览器渲染原理.md` ([HTML Living Standard](https://html.spec.whatwg.org/multipage/parsing.html?utm_source=chatgpt.com))
- 因此更适合**依赖 DOM 结构、并且要求脚本执行顺序**的业务代码。

---

### 标准回答

JavaScript 会影响 HTML 的解析，核心原因是 **JavaScript 可以直接读取和修改 DOM 和 CSSOM，而 HTML 解析和 JavaScript 执行又都需要渲染进程主线程参与**。

所以浏览器在解析 HTML 时，如果遇到一个没有设置 `async` 或 `defer` 的普通 `<script>`：

```html
<script src="app.js"></script>
```

会暂停当前 HTML 的解析，等待 JavaScript 准备并执行完成以后，再继续向后解析 HTML、构建 DOM。文档对此的描述也是：普通阻塞脚本会“暂停 HTML 解析，等待脚本下载并执行完成后，再继续解析 HTML”。`基于Chrome浏览器渲染原理.md`

这里还需要把 **CSSOM、JavaScript 和 DOM 三者之间的关系**说清楚。

CSS 本身不会阻塞 HTML 解析，所以浏览器可以一边继续解析 HTML、构建 DOM，一边下载和解析 CSS、构建 CSSOM。但是 CSS 会影响 JavaScript 的执行，因为 JavaScript 可能读取元素最终的计算样式。如果在一个普通脚本之前已经存在尚未加载完成、会阻塞脚本的样式表，那么浏览器需要等待相关样式表准备好，再执行这个普通脚本。HTML 标准专门定义了“script-blocking style sheet”这一机制。([HTML Living Standard](https://html.spec.whatwg.org/multipage/semantics.html?utm_source=chatgpt.com))

因此对于普通脚本，可以形成这样一条典型的阻塞链：

**等待 CSS → CSSOM/样式准备完成 → 执行 JavaScript → JavaScript 执行结束 → HTML 继续解析 → DOM 继续构建。**

也就是说：

**CSS 通常不直接阻塞 DOM 解析，但它可以通过阻塞普通 JS 的执行，间接延长 DOM 解析被暂停的时间。** ([MDN Web Docs](https://developer.mozilla.org/en-US/docs/Web/Performance/Guides/How_browsers_work?utm_source=chatgpt.com))

对于三种脚本，可以分别理解。

普通 `script`：

```html
<script src="a.js"></script>
```

浏览器遇到它以后会暂停 HTML 解析。脚本准备好并满足执行条件后立即执行，执行完成以后再继续解析 HTML。所以它会直接阻塞 DOM 树的继续构建。([HTML Living Standard](https://html.spec.whatwg.org/dev/scripting.html?utm_source=chatgpt.com))

`async`：

```html
<script async src="b.js"></script>
```

`async` 脚本的**下载过程与 HTML 解析并行进行**，因此下载期间不会阻塞 DOM 的构建；CSS 也可以继续独立下载和构建 CSSOM。

但 `async` 脚本一旦准备好，就会尽快执行，因此可能在 DOM 还没有解析完成时执行，并打断当前 HTML 解析过程。`基于Chrome浏览器渲染原理.md`

这意味着，如果一个 `async` 脚本直接依赖页面后面尚未解析出来的 DOM 元素，或者依赖其他脚本已经执行，就可能出现问题。

因此不能简单说“操作 DOM 就绝对不能用 async”，更准确的说法是：

**如果脚本依赖完整 DOM、特定 DOM 节点已经存在，或者依赖其他脚本的执行顺序，一般不适合使用 `async`。**

`async` 更适合相对独立的脚本，例如统计、埋点、广告等。多个 `async` 脚本也是谁先准备好谁就可能先执行，不保证 HTML 中的声明顺序。([HTML Living Standard](https://html.spec.whatwg.org/dev/scripting.html?utm_source=chatgpt.com))

而 `defer`：

```html
<script defer src="c.js"></script>
```

同样会和 HTML 解析并行下载，因此下载过程不会阻塞 DOM 构建。但是它不会在下载完成后立即执行，而是等 **HTML 文档解析完成以后再执行**。多个 `defer` 脚本按照文档顺序执行，并且都会在 `DOMContentLoaded` 触发之前完成。`基于Chrome浏览器渲染原理.md` ([HTML Living Standard](https://html.spec.whatwg.org/multipage/parsing.html?utm_source=chatgpt.com))

因此三者可以最终收敛为：

**普通 script：下载/执行会造成解析阻塞，执行前还可能等待前面的阻塞样式表。**

**async：并行下载，准备好就尽快执行，执行时可能打断 DOM 解析，不保证脚本顺序，适合独立脚本。**

**defer：并行下载，DOM 解析完成后按顺序执行，DOMContentLoaded 之前执行，适合依赖 DOM 和执行顺序的业务脚本。**

---

**Sources:**

- [Populating the page: how browsers work - Performance | MDN](https://developer.mozilla.org/en-US/docs/Web/Performance/Guides/How_browsers_work?utm_source=chatgpt.com)
- [HTML Standard](https://html.spec.whatwg.org/multipage/scripting.html?utm_source=chatgpt.com)

## 第4题 `DOMContentLoaded` 和 `load` 有什么区别？

### 题目

`DOMContentLoaded` 和 `load` 有什么区别？
#### 回答分析

你的整体理解是对的，已经抓住了最核心的区别：

- `DOMContentLoaded` 关注的是 **HTML 解析完成、DOM 构建完成**。
- `load` 关注的是 **整个页面资源加载完成**。
- `DOMContentLoaded` 不需要等待图片、iframe 等外部资源。`基于Chrome浏览器渲染原理.md`

有三个地方需要收紧。

第一，不能简单说：

> `DOMContentLoaded` 触发时所有 JS 都已经执行完成。

更准确的说法应该是：

**DOMContentLoaded 触发时，DOM 已经构建完成，与 DOM 解析流程相关、需要在其之前完成的脚本已经按照对应规则处理；文档明确指出 `defer` 脚本会在 DOM 解析完成后、DOMContentLoaded 触发前执行。**

文档并没有支持“页面中所有 JavaScript 都一定已经执行完成”这个结论。`基于Chrome浏览器渲染原理.md`

第二，不能说：

> DOMContentLoaded 触发时 Render Tree 肯定还没有生成。

`DOMContentLoaded` 判断的是 **DOM 是否准备完成**，它并不是 Render Tree 的完成标志。

文档只说明此时不保证 CSS、字体等资源全部加载完成，因此不能根据 `DOMContentLoaded` 推导出 Render Tree “一定生成”或者“一定没有生成”。`基于Chrome浏览器渲染原理.md`

第三，最后一个事件名称应该是：

**`load`**

而不是 `unload`。`unload` 是另一个生命周期事件，这一题讨论的是 `DOMContentLoaded` 和 `load`。

---

### 问题

现在沿着 `defer` 继续往下问。

假设页面里包含：

```html
<link rel="stylesheet" href="index.css">
<script defer src="app.js"></script>
<img src="large-image.jpg">
<iframe src="child.html"></iframe>
```

请回答：

1. **`DOMContentLoaded` 在什么时候触发？**
2. **`load` 在什么时候触发？**
3. 图片还没有加载完成时，`DOMContentLoaded` 能不能触发？
4. `defer` 脚本和 `DOMContentLoaded` 谁先执行？
5. 如果你只是想在 DOM 构建完成后绑定事件，应该关注哪个事件？

文档专门把二者作为两个关键浏览器事件进行区分。`基于Chrome浏览器渲染原理.md`

### 回答要点

按照 **“DOMContentLoaded → JavaScript关系 → 不等待的资源 → load → 使用场景”** 回答。
#### 1. DOMContentLoaded

- HTML 文档解析完成。
- DOM 树构建完成。
- DOM 节点已经可以安全访问和操作。
#### 2. 与 JavaScript 的关系

- 普通阻塞脚本会影响 HTML 解析，因此需要按照解析规则执行完成后，HTML 才能继续向后解析。
- `defer` 脚本会在 DOM 解析完成后执行，并且在 `DOMContentLoaded` 触发之前完成。
- 不能简单表述为“所有 JS 都已经执行完成”。
#### 3. DOMContentLoaded 不等待所有资源

- 不等待图片。
- 不等待 iframe。
- 不等待视频、音频等资源。
- 不保证所有 CSS、字体等资源都已经加载完成。`基于Chrome浏览器渲染原理.md`
#### 4. DOMContentLoaded 与渲染的关系

- 它表示 DOM 已就绪。
- 它不是 CSSOM、Render Tree、Paint 或整个页面渲染完成的标志。
#### 5. load

- 页面所有资源加载完成后触发。
- 包括 HTML、CSS、JavaScript、图片、字体、iframe、视频、音频等。`基于Chrome浏览器渲染原理.md`
#### 6. 典型使用场景

- `DOMContentLoaded`：DOM 初始化、事件绑定、DOM 操作、框架挂载。
- `load`：依赖图片尺寸、iframe 或全部页面资源的逻辑。

一句话收敛：

**DOMContentLoaded 表示 DOM 已准备完成；load 表示整个页面资源已经加载完成。**

---

### 标准回答

`DOMContentLoaded` 和 `load` 的核心区别，在于它们代表页面加载过程中的不同完成阶段。

首先是 `DOMContentLoaded`。

当浏览器已经完成 **HTML 文档的解析并构建完成 DOM 树**之后，会触发 `DOMContentLoaded`。

此时 DOM 已经准备完成，因此可以安全地访问 DOM 节点，可以使用 `document.querySelector` 等 DOM API，也可以执行事件绑定、修改 DOM、初始化页面以及 Vue、React 等框架的挂载操作。`基于Chrome浏览器渲染原理.md`

在 JavaScript 方面，需要结合不同脚本的执行规则理解。

普通阻塞脚本会暂停 HTML 解析，因此浏览器需要按照脚本解析和执行规则处理完相关脚本以后，才能继续完成后续 HTML 解析。

对于 `defer` 脚本，它的下载不会阻塞 HTML 解析，但会在 **DOM 解析完成以后、DOMContentLoaded 事件触发之前执行**。`基于Chrome浏览器渲染原理.md`

所以更准确的表述是：

**DOMContentLoaded 表示 DOM 已经构建完成，并且需要在该事件之前完成的脚本已经按照相应规则处理；但不能简单理解为页面中的所有 JavaScript 都已经全部执行完成。**

同时，`DOMContentLoaded` 并不要求页面所有外部资源都已经加载完成。

例如图片、iframe、视频和音频等资源，此时可能仍然处于加载过程中；文档也说明，此时不保证所有 CSS 和字体资源都已经全部加载完成。`基于Chrome浏览器渲染原理.md`

因此：

**DOMContentLoaded 主要表示“DOM 已就绪”，而不是“整个页面已经全部加载完成”。**

同时它也不能直接作为 CSSOM、Render Tree 或整个渲染流程是否完成的判断标准。它关注的是 HTML 解析和 DOM 构建这一阶段。

而 `load` 事件触发得更晚。

当页面中的 **所有资源都已经加载完成以后**，浏览器才会触发 `load`。根据文档，其中包括 HTML、CSS、JavaScript、图片、字体、iframe，以及视频、音频等资源。`基于Chrome浏览器渲染原理.md`

因此二者的典型使用场景也不同。

如果只是需要访问 DOM、绑定事件或者初始化页面逻辑，一般关注 `DOMContentLoaded`。

如果逻辑依赖图片真实尺寸、iframe 内容或者整个页面的所有资源都已经准备完成，则更适合使用 `load`。`基于Chrome浏览器渲染原理.md` `基于Chrome浏览器渲染原理.md`

最终可以总结为：

**`DOMContentLoaded`：HTML 解析完成，DOM 树构建完成，可以安全操作 DOM，但不等待图片、iframe 等全部外部资源。**

**`load`：DOM 已经完成，并且页面中的 CSS、JavaScript、图片、字体、iframe 等所有资源都已经加载完成。**

面试时最简洁的一句话就是：

> **DOMContentLoaded 看 DOM 是否就绪，load 看整个页面资源是否全部加载完成。**

## 第5题 什么是重排（Reflow）、重绘（Repaint）和合成（Composite）？它们有什么区别？

### 题目

什么是重排（Reflow）、重绘（Repaint）和合成（Composite）？它们有什么区别？
#### 回答分析

你的整体回答是正确的，已经抓住了三者最重要的性能关系。

第一，**重排的定义正确**。当元素的位置、尺寸、间距等几何信息变化，或者页面布局结构变化时，浏览器需要重新计算受影响元素的位置和大小，这就是 Reflow/Layout。文档也是这样定义的。`基于Chrome浏览器渲染原理.md`

第二，**重绘的定义和与重排的关系也正确**。如果只是颜色、背景、阴影等视觉外观发生变化，而几何布局没有变化，就不需要重新计算布局，只需要重新绘制。按照文档的表述：

**重排一定会继续触发重绘，而重绘不一定触发重排。** `基于Chrome浏览器渲染原理.md`

第三，你对 `transform` 的理解基本正确，但表达上建议稍微调整：

不要直接说：

> `transform` 是合成层。

更准确的是：

> **`transform` 是适合走合成阶段的 CSS 属性；在相应的分层条件下，它的变化可以直接由合成线程处理，而不需要重新进行 Layout 和 Paint。**

文档明确把 `transform` 和 `opacity` 作为“只触发合成、不触发重排和重绘”的典型优化属性。`基于Chrome浏览器渲染原理.md`

第四，你还可以把性能差异再说完整一点。不是简单因为“重排比重绘多一个步骤”，而是：

- **重排需要重新计算元素几何信息，而且可能影响父元素、子元素、兄弟元素。**
- 重排之后还要继续进入 Paint 和 Composite。
- 重绘不需要重新计算布局。
- 只合成则可以跳过 Layout 和 Paint。

所以三者性能开销可以按文档的思路理解为：

**重排 + 重绘 + 合成 > 重绘 + 合成 > 仅合成。**

---

### 问题

假设页面中有一个元素：

```javascript
const box = document.querySelector('.box');
```

现在分别执行：

```javascript
box.style.width = '500px';
box.style.backgroundColor = 'red';
box.style.transform = 'translateX(100px)';
```

请回答：

1. 修改 `width` 为什么可能触发重排？
2. 修改 `backgroundColor` 为什么通常只需要重绘？
3. 为什么重排通常比重绘开销更大？
4. `transform` 为什么通常比直接修改 `left`、`top` 更适合做动画？
5. **重排、重绘、合成三者之间是什么关系？**

### 回答要点

按照 **“重排 → 重绘 → 二者关系 → 合成 → transform 优化”** 的顺序回答。
#### 1. 重排（Reflow / Layout）

- 元素几何属性或布局结构发生变化。
- 浏览器重新计算元素的位置和尺寸。
- 常见属性：`width`、`height`、`margin`、`padding`、`display` 等。
- DOM 结构变化也可能触发重排。
#### 2. 重绘（Repaint）

- 元素外观发生变化，但尺寸和位置没有变化。
- 不需要重新计算布局，只需要重新绘制像素。
- 常见属性：`color`、`background-color`、`box-shadow` 等。
#### 3. 重排与重绘的关系

- 重排会继续触发后续重绘和合成。
- 重绘不一定触发重排。
- 所以重排通常比单纯重绘开销更大。`基于Chrome浏览器渲染原理.md`
#### 4. 合成（Composite）

- 浏览器将不同图层按照正确的层级和位置组合成最终页面。
- 某些属性变化可以跳过 Layout 和 Paint，直接进行合成。
- 文档中以 `transform`、`opacity` 为典型例子。`基于Chrome浏览器渲染原理.md`
#### 5. 为什么动画推荐 transform

- 修改 `left`、`top` 等布局属性可能触发重排。
- `transform` 不需要改变正常布局中的几何关系。
- 可以直接由合成线程处理相关图层。
- 因此可以减少主线程上的 Layout 和 Paint 工作，更适合高频动画。

一句话收敛：

**改变布局 → 重排；只改变外观 → 重绘；只改变图层位置或透明度等合成属性 → 尽量只做合成。**

---

### 标准回答

重排、重绘和合成代表浏览器页面更新时不同级别的渲染工作。

首先是 **重排，也叫 Reflow 或 Layout**。

当页面元素的几何信息发生变化，例如元素的宽度、高度、位置、边距、内边距发生改变，或者增加、删除 DOM 节点导致页面布局结构变化时，浏览器原来计算好的布局信息就可能失效，因此需要重新计算受影响元素的位置和尺寸。

例如：

```javascript
box.style.width = '500px';
```

`width` 发生变化以后，元素自身的尺寸发生变化，同时还可能影响周围其他元素的位置，因此浏览器需要重新执行 Layout，这就是重排。`基于Chrome浏览器渲染原理.md`

其次是 **重绘，也叫 Repaint**。

如果元素的几何位置和尺寸没有发生变化，只是视觉外观发生了变化，例如修改：

```javascript
box.style.backgroundColor = 'red';
```

此时浏览器不需要重新计算元素的位置和尺寸，只需要重新绘制元素的视觉内容，因此会进入 Paint，而不需要重新 Layout。

按照文档的渲染关系，**重排会继续触发后面的重绘和合成，而单纯的重绘不一定需要重新进行重排**。`基于Chrome浏览器渲染原理.md`

因此，如果按照页面更新的工作量理解，可以概括为：

**重排：Layout → Paint → Composite**

**重绘：Paint → Composite**

而浏览器还有一种更轻量的更新方式，就是 **只进行 Composite，也就是图层合成**。

浏览器可以将页面中的部分内容放入不同的图层，然后由合成线程按照图层的位置、顺序和变换关系组合成最终画面。

像 `transform`、`opacity` 这样的属性，在文档描述的优化场景下，可以直接修改图层的变换或透明度，而不需要重新计算 DOM 布局，也不需要重新绘制元素内容，因此可以跳过 Layout 和 Paint，直接进入 Composite。`基于Chrome浏览器渲染原理.md`

例如：

```javascript
box.style.transform = 'translateX(100px)';
```

这里改变的是元素图层最终显示时的变换，而不是通过重新修改正常文档流中的元素坐标来重新计算布局。

这也是为什么动画通常更推荐：

```css
transform: translateX(...);
```

而不是频繁修改：

```css
left: ...;
top: ...;
```

因为 `left`、`top` 等布局属性的变化可能需要重新计算布局，而 `transform` 更适合直接在合成阶段处理。

因此，从性能开销上可以按照下面这条链路理解：

**重排 + 重绘 + 合成 > 重绘 + 合成 > 仅合成。**

所以前端渲染性能优化的核心思路之一就是：

> **尽量减少 Layout 和 Paint，高频动画尽可能使用 `transform`、`opacity` 等适合走合成阶段的属性。**

文档也明确将 `transform`、`opacity` 作为减少重排和重绘、利用合成线程进行性能优化的典型方式。`基于Chrome浏览器渲染原理.md`

---

## 第6题 什么是浏览器的合成层？为什么合成层能够提升动画性能？

### 题目

什么是浏览器的合成层（Compositing Layer）？浏览器为什么要将页面划分成多个图层？主线程、合成线程以及 GPU / 栅格线程分别负责什么？`transform`、`opacity` 为什么适合在合成阶段处理？图层是不是越多越好？

### 问题

回答时需要说明：

1. 什么是合成层？
2. 浏览器为什么需要分层？
3. 主线程、合成线程、GPU / 栅格线程分别负责什么？
4. 图层树、属性树、Draw Quads 分别是什么？
5. 栅格化由谁完成，主要做什么？
6. `transform`、`opacity` 为什么能够提高动画性能？
7. 为什么不能创建过多合成层？

---

### 回答要点

按照 **“合成层 → 分层目的 → 三类角色职责 → 合成核心结构 → 栅格化 → transform/opacity → 图层代价”** 的顺序回答。
#### 1. 什么是合成层

- 浏览器不会始终把整个页面作为一个整体处理。
- 会根据元素特性和性能需求，把部分页面内容划分成独立图层。
- 各个图层可以独立保存绘制结果，最后再按照层级关系合成为完整页面。
- 浏览器不会为每个 DOM 元素都创建图层，而会进行分层决策，以平衡性能和内存开销。`基于Chrome浏览器渲染原理.md`
#### 2. 为什么要分层

- 当页面局部发生适合合成处理的变化时，可以复用已有图层内容。
- 不需要因为一个图层的位置、透明度等变化重新处理整个页面。
- 可以减少 Layout 和 Paint。
- 特别适合滚动、动画等高频更新场景。
- 但独立图层中的元素如果修改了布局或像素内容，仍然可能触发重排或重绘。
#### 3. 三类角色职责

##### 主线程：负责页面内容的计算和准备。

主要包括：

- 执行 JavaScript；
- 样式计算；
- Layout；
- Paint；
- 生成绘制列表；
- 进行分层决策并生成图层相关信息。

可以理解为：

> **主线程负责决定“页面是什么、应该画什么”。**
##### 合成线程：负责组织和调度图层。

主要包括：

- 管理图层之间的层级和位置关系；
- 维护合成相关结构；
- 处理部分滚动和合成动画；
- 判断哪些区域需要更新；
- 调度栅格化任务；
- 组织最终需要提交给 GPU 的合成信息。`基于Chrome浏览器渲染原理.md`

可以理解为：

> **合成线程负责决定“这些图层怎么组织、怎么更新、怎么组合”。**
##### GPU / 栅格线程：负责把内容真正转换成可显示画面。

- 栅格线程或 GPU 将绘制列表转换成像素位图或纹理。
- GPU 再根据图层的位置、层级、变换、透明度等信息，把多个图层合成为最终帧并提交显示。

可以理解为：

> **GPU / 栅格线程负责“变成像素，并形成最终画面”。**
#### 4. 合成阶段三个核心结构

- **Layer Tree（图层树）**：记录独立图层以及图层之间的层级关系。
- **Property Trees（属性树）**：保存 `transform`、`opacity`、`clip` 等可以独立更新的图层属性。
- **Draw Quads（绘制四边形）**：将图层纹理组织成 GPU 可以处理的数据，描述纹理应该在什么位置、以什么大小和变换进行绘制。`基于Chrome浏览器渲染原理.md`
#### 5. 栅格化

- 栅格化就是把图层的绘制列表转换成 GPU 可以使用的位图或纹理。
- 合成线程主要负责调度，真正的栅格化由栅格线程或 GPU 完成。
- 常见优化：
  - Tiling：大图层切成多个 Tile；
  - Occlusion Culling：跳过完全被遮挡区域；
  - Partial Raster：只重新栅格化发生变化的区域。`基于Chrome浏览器渲染原理.md`
#### 6. 为什么 `transform`、`opacity` 适合做动画

- `transform` 主要改变图层的平移、缩放、旋转等变换。
- `opacity` 主要改变图层透明度。
- 在满足合成条件时，只需要修改属性树中的相关参数。
- 不需要重新执行 Layout 和 Paint。
- 因此可以直接进入 Composite，由合成线程配合 GPU 处理，更适合高频动画。`基于Chrome浏览器渲染原理.md`
#### 7. 为什么图层不能过多

- 每个图层都会占用额外内存和 GPU 纹理资源。
- 图层过多会增加图层维护和最终合成的成本。
- 过度使用 `will-change`、`translateZ(0)` 等方式强制分层，可能造成图层数量过多，反而降低性能。`基于Chrome浏览器渲染原理.md`

一句话收敛：

> **合成层通过把页面拆成可以独立处理的图层，让部分变化复用已有绘制结果；主线程负责“画什么”，合成线程负责“图层怎么组织和更新”，栅格线程负责“变成纹理”，GPU 最终把这些纹理合成为一帧。**

---

### 标准回答

合成层是浏览器为了提高页面渲染效率，将页面中的部分内容划分成独立图层，然后在最终阶段再将这些图层按照正确的层级和位置组合成完整页面。

浏览器不会给每一个 DOM 元素都创建独立图层，因为每个图层都需要占用额外的内存和 GPU 资源。因此浏览器会根据元素特性以及性能收益进行**分层决策**，只将适合独立处理的内容划分为独立图层。`基于Chrome浏览器渲染原理.md`

分层的主要作用是**复用已有的绘制结果，并减少页面局部变化带来的重复工作**。

例如，一个元素已经形成独立图层，后续只是修改它的 `transform`，图层内部的文字、背景、图片等内容本身并没有改变，那么浏览器可以继续使用已经生成的图层内容，只修改这个图层的位置或变换信息，然后重新进行合成，而不需要重新处理整个页面。

不过，成为独立图层并不意味着这个元素的所有变化都不会触发重排和重绘。

如果修改 `width`、`height`、`margin`、`left`、`top` 等影响布局的属性，仍然需要执行 Layout；如果修改背景颜色、阴影等实际像素内容，仍然可能需要重新 Paint。因此，合成层主要优化的是**能够直接在合成阶段处理的变化**。`基于Chrome浏览器渲染原理.md`

整个合成过程中，可以将职责分成三个部分。

首先是 **主线程**。

主线程负责页面内容的计算和准备，包括执行 JavaScript、进行样式计算、Layout、Paint、生成绘制列表，同时根据页面内容进行分层决策，生成相应的图层信息。

因此，主线程可以理解为负责：

> **决定页面是什么，以及应该画什么。**

其次是 **合成线程**。

合成线程负责组织主线程产生的图层信息，维护图层之间的位置和层级关系，处理能够独立于主线程完成的滚动和部分动画，并判断哪些区域需要更新、哪些内容需要重新栅格化，最终组织这一帧的合成信息。`基于Chrome浏览器渲染原理.md`

因此，合成线程主要负责：

> **决定图层怎么组织、怎么更新以及最后怎么组合。**

合成阶段还会使用几个重要的数据结构。

首先是 **Layer Tree，也就是图层树**，用于记录各个独立图层及它们之间的上下层级关系。

其次是 **Property Trees，也就是属性树**，用于保存 `transform`、`opacity`、`clip` 等可以独立变化的属性。当这些属性发生改变时，可以只修改对应的属性信息，而不需要重新执行 Layout 和 Paint。

最后是 **Draw Quads，也就是绘制四边形**，它会把已经栅格化的图层纹理组织成 GPU 能够处理的数据，用来描述每一块纹理最终应该在什么位置、以什么大小和变换方式进行绘制。`基于Chrome浏览器渲染原理.md`

接下来是 **栅格化**。

图层和绘制列表本身还不能直接显示到屏幕上，需要把绘制列表中的文字、图片、背景、边框等内容转换成像素位图或 GPU 可以使用的纹理，这个过程就是 Rasterization。

合成线程主要负责调度栅格化，而真正将绘制指令转换成纹理的工作由栅格线程或者 GPU 完成。

为了提高栅格化效率，浏览器还会采用 Tiling、遮挡剔除和局部重栅格化等优化方式。例如，大图层可以被切分成多个 Tile，当页面只有局部发生变化时，只重新处理发生变化的区域，而不用重新栅格化整个图层。`基于Chrome浏览器渲染原理.md`

最后是 **GPU**。

GPU 会根据合成线程提供的图层位置、层级关系、`transform`、`opacity` 以及 Draw Quads 等信息，把已经准备好的多个纹理进行变换、混合和叠加，生成最终的一帧画面并提交显示。

因此三类角色可以概括为：

> **主线程负责决定“画什么”，合成线程负责决定“图层怎么组织和更新”，栅格线程负责“把绘制内容变成纹理”，GPU 最后把这些纹理合成为最终画面。**

这也是为什么 `transform` 和 `opacity` 特别适合做动画。

`transform` 主要修改图层的平移、缩放和旋转，`opacity` 主要修改图层的透明度。在满足合成条件时，它们可以只更新属性树中的相关信息，而不需要重新执行 Layout 和 Paint，随后直接进入 Composite，因此能够减少主线程工作，提高动画流畅度。`基于Chrome浏览器渲染原理.md`

但需要注意，并不是使用 `transform` 就一定会产生独立图层，浏览器仍然会根据内存成本和性能收益进行判断。

同时，合成层也不是越多越好。每个独立图层都需要占用额外的内存、纹理和 GPU 资源，图层数量过多还会增加浏览器维护图层树以及最终合成的成本。因此，大量使用：

```css
will-change: transform;
transform: translateZ(0);
```

强制创建独立图层，反而可能造成图层数量过多、GPU 内存占用增加，最终降低页面性能。`基于Chrome浏览器渲染原理.md`

最终可以收敛为：

> **合成层的核心价值，是让适合独立处理的页面内容复用已有绘制结果，使 `transform`、`opacity` 等变化尽量跳过 Layout 和 Paint，再通过合成线程组织图层、栅格线程生成纹理、GPU 完成最终合成，从而提升滚动和动画的流畅度。**

## 第7题 Chrome 为什么采用多进程架构？从输入 URL 到页面展示，各进程和线程如何协作？

### 题目

Chrome 为什么采用多进程架构？从输入 URL 到页面展示，各进程和线程如何协作？

### 问题

Chrome 为什么采用多进程架构？浏览器主要有哪些进程，各自负责什么？

请从**进程视角**说明用户输入 URL 到最终页面显示的完整流水线，并解释：

1. 浏览器主进程、网络进程、渲染进程、GPU 进程分别负责什么？
2. 这些进程之间如何进行调度和协作？
3. IPC 是什么，为什么进程之间需要 IPC？
4. IPC 如何在保证进程隔离的同时完成数据通信？
5. Chrome 的多进程架构为什么能够提高安全性和稳定性？

---

### 回答要点

按照 **“为什么采用多进程 → 进程和线程怎么分 → URL 到页面展示的完整流水线 → 页面和渲染进程的关系 → IPC → 隔离和安全”** 的顺序回答。
#### 1. 为什么 Chrome 采用多进程架构

Chrome 采用多进程架构，核心目的是实现**进程隔离，提高稳定性和安全性**。

不同进程拥有独立的资源和内存空间，因此：

- 某一个网页或组件出现异常，不容易直接拖垮整个浏览器；
- 不同页面、不同站点之间的数据可以进行隔离；
- 网络、页面渲染、GPU 合成等工作被拆分到不同进程中，职责更加独立；
- 再配合 Site Isolation、沙箱和权限控制，提高浏览器整体安全性。

文档将这一点概括为：

> **进程管资源，线程做执行；隔离保安全，IPC 传消息。** `基于Chrome浏览器渲染原理.md`

---
#### 2. Chrome 中主要有哪些进程？和线程是什么关系？

与页面加载最相关的核心进程主要包括：

- **Browser Process**：浏览器主进程，负责整体调度、导航、进程管理和权限管理；
- **Network Process**：网络进程，负责整个网络请求过程；
- **Renderer Process**：渲染进程，负责把 HTML、CSS、JavaScript 等资源变成页面；
- **GPU Process**：GPU 进程，负责配合图层和纹理完成最终画面合成与显示。`基于Chrome浏览器渲染原理.md` `基于Chrome浏览器渲染原理.md`

这里一定要区分：

> **Browser、Network、Renderer、GPU 是不同的进程；Main Thread、Compositor Thread、Raster Thread 是 Renderer Process 内部的线程。**

也就是说，结构上应该理解成：

```text
Chrome
├─ Browser Process
├─ Network Process
├─ Renderer Process
│  ├─ Main Thread
│  ├─ Compositor Thread
│  └─ Raster Threads
└─ GPU Process
```

渲染进程内部的核心线程，文档列出的是**主线程、合成线程和栅格线程**，并不是把网络线程作为渲染进程的核心线程。真正的网络请求由独立的 Network Process 负责。`基于Chrome浏览器渲染原理.md`

其中：

- **Main Thread**：负责 JS、DOM/CSS、样式计算、Layout、Paint 等页面主要逻辑；
- **Compositor Thread**：负责组织图层和合成调度；
- **Raster Thread**：负责图层栅格化；
- **GPU Process** 则不是 Renderer 里面的线程，而是独立进程，负责最终图层合成和画面呈现。`基于Chrome浏览器渲染原理.md`

---
#### 3. 从输入 URL 到页面展示的完整进程流水线

整个过程最好不要分开背每个进程，而要理解成一条连续流水线：

> **输入 URL → 浏览器调度 → 网络请求 → 页面渲染 → 图层合成 → 页面显示**
##### 用户输入 URL，Browser Process 接管

用户在地址栏输入 URL 后，首先由 **Browser Process** 接收到这个操作。

它负责判断这是一次什么导航、目标 URL 是什么，以及应该使用哪个 Renderer Process 来承载这个页面。

如果需要，它还会创建新的 Renderer Process；如果满足条件，也可能复用已有的 Renderer Process。

所以这一阶段可以简单理解为：

> **Browser Process 负责接收用户操作和总调度。**

它自己并不负责真正下载 HTML，也不负责解析 DOM。`基于Chrome浏览器渲染原理.md`

---
##### 进入网络请求，Network Process 获取资源

确定导航以后，Browser Process 会协调 **Network Process** 发起网络请求。

Network Process 负责整个网络请求过程，包括：

缓存检查、DNS、建立 TCP 或 QUIC 连接、HTTPS 下的 TLS 握手、发送 HTTP 请求、接收 HTTP 响应，以及缓存、Cookie、连接复用等网络相关工作。`基于Chrome浏览器渲染原理.md`

这些内容不需要拆散理解，本质上就是一句话：

> **Network Process 负责根据 URL 把网页需要的资源从服务器拿回来。**

---
##### 收到 HTML 后，Renderer Process 开始把资源变成页面

服务器响应开始返回以后，HTML 等数据会交给对应的 **Renderer Process**。

从这里开始进入真正的页面渲染逻辑。

Renderer Process 会完成：

- HTML 解析形成 DOM；
- CSS 解析形成 CSSOM；
- JavaScript 执行；
- 形成渲染树；
- Layout；
- Paint；
- 分层；
- 合成前准备。`基于Chrome浏览器渲染原理.md`

所以这一阶段最简单的理解是：

> **Network Process 负责把资源拿回来，Renderer Process 负责把这些资源变成页面。**

Renderer Process 内部又由多个线程合作。

首先是 **Main Thread** 完成主要页面逻辑，包括 JavaScript、DOM/CSS、Layout 和 Paint。

之后 **Compositor Thread** 负责组织图层和合成相关信息。

再由 **Raster Thread** 负责将需要绘制的图层进行栅格化。`基于Chrome浏览器渲染原理.md`

也就是：

```text
Renderer Process

Main Thread
   ↓
页面解析 / JS / Layout / Paint
   ↓
Compositor Thread
   ↓
图层组织 / 合成调度
   ↓
Raster Thread
   ↓
栅格化
```

---
##### GPU Process 完成最终画面

Renderer Process 完成图层以及合成相关准备以后，会将相关图层和合成信息提交给 **GPU Process**。

GPU Process 主要负责配合纹理和图层完成最终合成，例如处理图层的层级、位置、`transform`、`opacity` 等，然后形成最终的一帧画面并提交给系统显示管线。`基于Chrome浏览器渲染原理.md`

所以整个过程最终可以概括成：

> **Browser Process 负责调度 → Network Process 负责获取资源 → Renderer Process 负责生成页面 → GPU Process 负责最终合成并上屏。**

---
#### 4. 一个页面一定对应一个 Renderer Process 吗？

**不一定。**

不能简单理解成：

> 一个页面 = 一个 Renderer Process。

文档中的表述是：

> **通常每个页面，或者同一站点的多个页面，会分配一个 Renderer Process。** `基于Chrome浏览器渲染原理.md`

也就是说，页面与 Renderer Process 不是严格的一对一关系。

Browser Process 在导航过程中会根据页面关系、站点隔离以及进程分配策略决定：

- 是复用已有 Renderer Process；
- 还是创建新的 Renderer Process。

因此更准确的说法是：

> **每个页面都会由某个 Renderer Process 承载，但并不意味着每个页面都一定独占一个 Renderer Process。**

Chrome 还会通过 Site Isolation，将需要隔离的不同站点内容分配到不同 Renderer Process 中，从而提高安全性。`基于Chrome浏览器渲染原理.md`

---
#### 5. Renderer Process 里的线程，和 Network Process、GPU Process 有什么区别？

这是第 7 题非常容易混淆的地方。

**进程是资源和隔离的单位，而线程是一个进程内部真正执行任务的单位。**

例如：

Renderer Process 是一个完整的进程，它有自己独立的内存空间。

但是这个进程内部又有：

- Main Thread；
- Compositor Thread；
- Raster Thread。

这些线程属于同一个 Renderer Process，因此共享该进程内部的资源。`基于Chrome浏览器渲染原理.md`

而：

- Network Process；
- GPU Process；

是另外两个独立进程，和 Renderer Process 的内存空间相互隔离。

所以不能把：

> Compositor Thread 和 GPU Process

理解成同一层级。

更准确的是：

> **Compositor Thread 是 Renderer Process 内部负责“怎么组织图层”的线程；GPU Process 是独立进程，负责将准备好的图层和纹理最终组合成画面。**

同样，也不能把 Raster Thread 和 Network Process 混为一谈。

Raster Thread 属于 Renderer Process，负责图层栅格化。

Network Process 是独立进程，负责整个浏览器的网络请求。

所以最简单的区别就是：

> **进程负责划分职责和资源边界，线程负责在某个进程内部具体执行任务。**

---
#### 6. 不同进程之间怎么通信？-- IPC

由于 Browser、Network、Renderer、GPU 是不同进程，所以它们拥有独立的内存空间。

也就是说，Renderer Process 不能直接读取 Network Process 内存中的变量，也不能像同一个进程里的函数调用一样直接进入 Network Process 执行代码。

因此不同进程之间需要使用：

> **IPC，Inter-Process Communication，进程间通信。**

IPC 的核心可以非常简单地理解成：

> **一个进程把数据包装成结构化消息发送出去，另一个进程收到消息后解析并执行，再把结果作为消息返回。**

`基于Chrome浏览器渲染原理.md`

例如网页执行：

```javascript
fetch("/api/user")
```

Renderer Process 自己不会直接完成整个网络请求。

它会通过 IPC 向 Network Process 发送一条网络请求消息。

Network Process 收到以后，真正执行 DNS、建连、HTTP 请求等工作。

拿到结果之后，再通过 IPC 把响应数据返回给 Renderer Process。

整个过程可以理解为：

```text
Renderer Process
      ↓
发送结构化 IPC 消息
      ↓
Network Process
      ↓
执行真正的网络请求
      ↓
返回 IPC 消息
      ↓
Renderer Process
```

文档中的 `fetch` 示例就是这一流程。`基于Chrome浏览器渲染原理.md`

---
#### 7. Chrome 的 IPC 和操作系统 IPC 有什么区别？

两者不是完全不同的东西，而是**上下层关系**。

操作系统本身提供了基础的进程间通信能力，例如：

- Named Pipe；
- socketpair；
- 共享内存等。

这些机制主要解决：

> **如何把数据从一个进程传到另一个进程。**

Chrome 在这些操作系统能力之上，又使用 **Mojo** 对 IPC 进行进一步封装。`基于Chrome浏览器渲染原理.md`

Mojo 主要负责：

- 定义进程之间可以调用哪些接口；
- 规定消息的数据结构；
- 将数据进行序列化和反序列化；
- 将消息发送给正确的服务。

所以可以非常直白地理解为：

> **操作系统 IPC 解决“消息怎么送过去”，Mojo 解决“发送什么消息、消息是什么格式、谁允许调用什么能力”。**

因此 Chrome 所说的结构化消息 IPC，本质上还是建立在操作系统的进程通信机制之上的，只不过 Chrome 又在上层定义了一套统一的通信规则。`基于Chrome浏览器渲染原理.md`

---
#### 8. IPC 为什么不会破坏进程隔离？

这里最关键的一点是：

> **不是 IPC 产生了进程隔离，而是进程本身已经具有独立内存空间，IPC 只是提供了一个受控的通信通道。**

例如 Renderer Process 想访问网络。

它不能直接进入 Network Process 的内存，也不能直接使用 Network Process 的内部对象。

它只能按照浏览器允许的 IPC 接口发送：

> “我要请求这个 URL。”

然后由 Network Process 自己执行。

因此：

> **进程隔离负责“不让你直接访问我的内存”，IPC 负责“允许你按照规定给我发消息”。**

同时，Chrome 还会配合：

- Renderer Process 沙箱；
- Browser Process 权限裁决；
- Site Isolation；
- Mojo 接口限制；
- IPC 参数校验。

文档将其概括成：

> **可信进程负责裁决，不可信进程受到限制。** `基于Chrome浏览器渲染原理.md`

可以用一个直白的比喻理解：

> **Renderer Process 被放在一个独立房间里，它不能直接跑进 Network Process 或 Browser Process 的房间。如果需要某种能力，只能通过 IPC 窗口提出请求，由有权限的进程决定怎么处理。**

---

### 标准回答

Chrome 采用多进程架构，核心目的是通过**进程隔离提高浏览器的稳定性和安全性**。不同进程拥有独立的内存空间，因此一个网页或组件出现异常时，不容易直接影响整个浏览器；同时配合 Site Isolation 和沙箱，可以进一步隔离不同站点以及限制网页直接访问系统资源。`基于Chrome浏览器渲染原理.md`

和页面加载最相关的主要有 Browser Process、Network Process、Renderer Process 和 GPU Process，但这些进程最好放到一次完整的 URL 访问流程中理解。

用户输入 URL 后，首先由 **Browser Process** 接收。它相当于浏览器的总调度中心，负责导航管理、进程管理和权限管理，同时判断当前页面应该使用已有 Renderer Process，还是创建新的 Renderer Process。`基于Chrome浏览器渲染原理.md`

之后进入网络请求阶段。Browser Process 会协调 **Network Process** 获取页面资源。Network Process 负责完整的网络请求过程，包括缓存、DNS、连接建立、TLS、HTTP 请求和响应等，因此可以简单理解成：

> **Network Process 负责根据 URL 把网页资源从服务器拿回来。**

`基于Chrome浏览器渲染原理.md`

HTML 数据返回之后，就进入 **Renderer Process**。Renderer Process 负责把 HTML、CSS 和 JavaScript 等资源真正变成页面，包括 HTML 到 DOM、CSS 到 CSSOM、JavaScript 执行、Render Tree、Layout、Paint 和分层等整个渲染逻辑。`基于Chrome浏览器渲染原理.md`

Renderer Process 本身又包含多个线程，其中 **Main Thread** 负责页面主要计算和执行，**Compositor Thread** 负责图层组织和合成调度，**Raster Thread** 负责栅格化。

所以要特别注意：

> **Renderer Process 是一个进程，而 Main Thread、Compositor Thread 和 Raster Thread 是这个进程内部的线程。**

Network Process 和 GPU Process 则都是 Renderer Process 之外的独立进程。

渲染完成以后，图层和合成相关信息会交给 **GPU Process**。GPU Process 负责配合纹理、图层位置、层级、`transform`、`opacity` 等信息完成最终图层合成，并生成最终一帧画面提交给显示系统。`基于Chrome浏览器渲染原理.md`

因此从进程视角看，整个页面加载流程可以总结为：

> **Browser Process 负责调度 → Network Process 负责获取资源 → Renderer Process 负责生成页面 → GPU Process 负责最终合成和显示。**

另外，一个页面并不一定严格对应一个 Renderer Process。文档中的表述是，通常每个页面或者同一站点的多个页面会分配一个 Renderer Process。具体是否复用或创建新的 Renderer Process，由 Browser Process 根据站点隔离和进程分配策略决定。`基于Chrome浏览器渲染原理.md`

由于这些进程拥有独立的内存空间，所以不同进程之间不能像同一进程内部的线程那样直接共享对象和调用函数，而必须通过 **IPC** 进行通信。

IPC 本质上就是：

> **发送结构化消息 → 对方接收并解析 → 执行任务 → 返回结果。**

例如 Renderer Process 中的 JavaScript 调用 `fetch` 时，Renderer 并不会自己完成 DNS、TCP 和 HTTP，而是通过 IPC 向 Network Process 发送网络请求信息，由 Network Process 真正完成请求，然后再通过 IPC 返回结果。`基于Chrome浏览器渲染原理.md`

Chrome 的 IPC 和操作系统 IPC 并不是两套完全不同的机制。操作系统提供 Named Pipe、socketpair、共享内存等底层通信能力，解决“数据怎样从一个进程传到另一个进程”；Chrome 则通过 Mojo 在这些能力之上定义接口、消息结构和服务，解决“进程之间允许发送什么消息以及应该怎样处理”。`基于Chrome浏览器渲染原理.md`

最后，IPC 并不会破坏进程隔离。

进程本身仍然拥有独立的内存空间，Renderer Process 不能直接访问 Browser、Network 或 GPU Process 的内部资源，只能够通过预定义的 IPC 接口提出请求。同时 Renderer Process 运行在沙箱中，Browser Process 负责重要权限的裁决，并且 IPC 接口还会对调用和参数进行限制。`基于Chrome浏览器渲染原理.md`

所以整个第 7 题最终可以收敛成：

> **Chrome 用多个进程划分职责和安全边界：Browser 负责总调度，Network 负责网络请求，Renderer 负责整个页面渲染逻辑，GPU 负责最终合成；Renderer 内部再通过 Main、Compositor、Raster 等线程完成具体工作。不同进程拥有独立内存空间，通过 IPC 发送受控的结构化消息进行协作，因此既能完成从 URL 到页面展示的完整流水线，又能够保证较好的隔离性、稳定性和安全性。**

## 第8题 为什么主线程长任务会导致页面卡顿？应该如何优化？

### 题目

为什么主线程长任务会导致页面卡顿？应该如何优化？

### 问题

请你从**浏览器渲染和线程调度**的角度回答，不要只回答“JS 是单线程”。

重点回答下面几个问题：

1. 为什么 JavaScript 执行时间过长，会影响页面的 Layout、Paint 和用户点击响应？
2. 为什么有时候页面已经显示出来了，但用户点击、输入时仍然感觉“卡住了”？
3. 什么叫 Long Task？为什么文档把 **超过 50ms 的任务**作为重点关注对象？`基于Chrome浏览器渲染原理.md`
4. 如果有一个耗时 300ms 的计算任务，有哪些方法可以降低它对主线程的阻塞？
   - 拆分任务和一次性执行完有什么区别？
   - `requestAnimationFrame`、`setTimeout` / `postMessage`、`requestIdleCallback` 分别大概适合什么场景？
5. **Web Worker 为什么能够缓解主线程压力？**
   - Worker 和主线程是什么关系？
   - Worker 能不能直接操作 DOM？
   - 什么任务适合放到 Worker 中？`基于Chrome浏览器渲染原理.md`
6. `OffscreenCanvas` 又解决了什么问题？它和普通 Web Worker 的主要区别是什么？`基于Chrome浏览器渲染原理.md`

你可以重点围绕这条主线回答：

> **主线程为什么会阻塞 → 阻塞以后渲染和交互为什么受影响 → 怎么让出主线程 → 什么任务可以直接搬到其他线程。**

### 回答要点

按照 **“为什么会阻塞 → 为什么页面显示了仍可能卡 → Long Task → 怎么让出主线程 → 怎么搬离主线程”** 的顺序回答。
#### 1. 为什么长任务会导致卡顿

- 页面里的 JavaScript 执行、DOM/CSS 处理、Layout、Paint 等很多工作都依赖渲染进程的主线程。
- 如果主线程正在执行一个耗时很长的 JS 任务，浏览器就很难及时插入布局、绘制和用户输入处理。
- 因此会出现掉帧、点击延迟、输入卡顿等现象。`基于Chrome浏览器渲染原理.md`
#### 2. 为什么页面已经显示出来，仍然可能“点不动”

- 页面已经完成一次绘制，只能说明内容已经显示。
- 用户点击、输入等事件仍然需要主线程处理。
- 如果此时主线程继续执行大量 JavaScript，页面虽然“看得见”，但交互任务得不到及时执行，所以用户会感觉页面卡住。`基于Chrome浏览器渲染原理.md`
#### 3. Long Task

- 文档把执行时间超过 **50ms** 的主线程任务称为 Long Task。
- 长任务会连续占用主线程，使渲染和输入处理长时间得不到执行机会，因此是页面卡顿的重要关注对象。`基于Chrome浏览器渲染原理.md`
#### 4. 优化有两条主线

- **拆任务**：任务仍然在主线程执行，但拆成多个小任务，中间主动让出主线程。
- **搬任务**：对于不依赖 DOM/CSSOM 的工作，直接放到 Web Worker 等其他线程执行。

一句话：

> **拆任务解决“不要一次占太久”，Worker 解决“这件事尽量不要占主线程”。**

---

### 标准回答

主线程长任务会导致页面卡顿，核心原因是：

> **主线程不仅执行 JavaScript，同时还承担页面渲染和用户交互中的很多关键工作。**

例如 JavaScript 执行、HTML/CSS 相关处理、Layout、Paint，以及点击、输入等事件处理，都和主线程密切相关。

因此，如果主线程正在执行一个 300ms 的复杂计算，这 300ms 内主线程一直没有把控制权交还给浏览器，那么其他等待执行的工作就很难及时得到处理。文档将这种情况概括为：长任务会直接导致渲染阻塞、页面卡顿和交互延迟。`基于Chrome浏览器渲染原理.md`

可以简单理解成主线程只有一个“工作窗口”：

```text
正常情况：

JS
↓
让出主线程
↓
Layout / Paint
↓
处理用户点击
↓
执行下一段 JS
```

如果出现一个很长的任务：

```text
300ms JavaScript 长任务
─────────────────────────
Layout 等待
Paint 等待
用户点击等待
```

所以用户就会感觉到卡顿。

---
#### 为什么页面已经显示出来了，还可能点不动？

因为：

> **页面已经显示和页面能够及时交互，不是一回事。**

浏览器可能已经完成了前面的 DOM、Layout 和首次 Paint，所以用户已经能看到页面。

但是后面如果还有很大的 JavaScript 文件正在解析、编译或者执行，主线程仍然可能被占用。

这时用户点击按钮，点击事件虽然发生了，但对应的回调需要等主线程有空才能处理。

因此就会出现：

> **页面已经看得见，但点按钮没反应、输入延迟、滚动卡顿。**

文档中也明确指出，页面首次绘制完成后，如果主线程继续被 JavaScript 等任务占用，页面仍然可能无法及时响应用户交互。`基于Chrome浏览器渲染原理.md`

---
#### 什么是 Long Task？

文档把主线程中**执行时间超过 50ms 的任务**作为 Long Task 来重点关注。

原因并不是说：

> 50ms 一到页面就一定完全卡死。

而是从性能分析角度看，一个任务如果长时间连续占据主线程，就会让浏览器缺少处理渲染和用户输入的机会。

因此文档的优化目标是：

> **减少 Long Task，让主线程经常出现短暂的空闲时间。**

这样浏览器才能在这些空档里处理 Layout、Paint、用户输入等更重要的工作。`基于Chrome浏览器渲染原理.md`

---
#### 如果现在有一个 300ms 的计算任务，应该怎么优化？

主要有两种思路。
#### 第一种：把长任务拆成多个小任务

假设：

```text
原来：

一个任务连续执行 300ms
```

可以拆成：

```text
10ms
↓
让出主线程
↓
10ms
↓
让出主线程
↓
10ms
……
```

虽然整个计算任务最终需要的总时间未必明显减少，但最大的区别是：

> **中间给了浏览器处理渲染和用户输入的机会。**

这就是文档所说的：

> **主动拆分任务并让出主线程。** `基于Chrome浏览器渲染原理.md`
##### `requestAnimationFrame`

如果任务和页面动画、DOM 更新、下一帧渲染有关，可以使用 `requestAnimationFrame`。

它适合：

> **需要和浏览器渲染帧保持节奏的任务。**

例如一批视觉更新，不要一次全部执行，而是分散到多帧中处理。`基于Chrome浏览器渲染原理.md`

---
##### `setTimeout(0)` / `postMessage`

如果任务本身和页面帧没有直接关系，只是想：

> **先把当前任务结束，把控制权还给浏览器，再继续执行下一块。**

就可以使用 `setTimeout(0)` 或 `postMessage` 将任务拆开。

文档的核心表述是：

> 通过让出一个宏任务的执行时机，让浏览器有机会处理渲染和输入。`基于Chrome浏览器渲染原理.md`

所以可以简单理解：

- `requestAnimationFrame`：**跟着渲染帧干活**；
- `setTimeout/postMessage`：**单纯把一个大任务切开，让主线程中间有机会处理其他事情**。

---
##### `requestIdleCallback`

如果任务本身并不重要，例如：

- 日志上报；
- 埋点；
- 非紧急数据处理；

可以等主线程空闲时再做。

这就是 `requestIdleCallback`。

它的思想是：

> **“这件事不着急，你有空再执行。”**

文档还强调最好设置 `timeout`，防止页面一直很忙，导致这个任务长期没有机会执行。`基于Chrome浏览器渲染原理.md`

因此三者可以这样记：

> **与渲染有关 → requestAnimationFrame**  
> **普通任务拆分 → setTimeout / postMessage**  
> **低优先级任务 → requestIdleCallback**

---
#### Web Worker 为什么能进一步减轻主线程压力？

前面的三种方法，本质上仍然是：

> **任务还在主线程执行，只是不要一次执行太久。**

Web Worker 则不一样。

它是：

> **直接创建一个独立于主线程的 Worker 线程，把计算任务搬过去执行。**

所以如果有一个 300ms 的纯计算任务：

```text
主线程：
300ms 计算
```

改成 Worker 后可以变成：

```text
主线程                  Worker
处理页面                  300ms计算
处理用户输入        ←       ↓
正常渲染             返回结果
```

这样纯计算任务不会长期占用主线程，主线程可以继续处理渲染和用户交互。`基于Chrome浏览器渲染原理.md`

---
#### Worker 能不能直接操作 DOM？

**不能。**

文档中 Web Worker 的定位就是：

> **处理不依赖 DOM/CSSOM 的纯计算任务。**

例如：

- 大数据处理；
- JSON 数据解析；
- 排序和筛选；
- 数据压缩、解压；
- 路径规划；
- 一些 CPU 密集型计算。`基于Chrome浏览器渲染原理.md`

Worker 如果计算出了结果，需要通过消息：

```javascript
worker.postMessage(...)
```

和主线程通信，再让主线程根据结果去更新页面。`基于Chrome浏览器渲染原理.md`

所以可以记成：

> **Worker 负责算，主线程负责改 DOM。**

---
#### OffscreenCanvas 又解决什么问题？

普通 Web Worker 主要适合把**计算任务**搬离主线程。

但是如果页面有大量 Canvas 绘制，例如：

- 高频实时图表；
- 大量 Canvas 动画；
- 复杂可视化；

这些绘制本身也可能给主线程造成很大压力。

这时候可以使用 **OffscreenCanvas**。

它允许把 Canvas 的绘制控制权转移给 Worker，让 Canvas 的绘制逻辑也可以在 Worker 线程中执行。`基于Chrome浏览器渲染原理.md`

所以区别可以简单记成：

> **Web Worker：主要把“计算”搬出去。**  
> **OffscreenCanvas：进一步把“Canvas 绘制”也搬出去。**

---
#### 最终收敛回答

> **主线程长任务导致卡顿，本质上是因为 JavaScript、页面渲染和用户交互都需要主线程参与。当一个长任务持续占用主线程时，Layout、Paint 和用户输入只能等待，所以即使页面已经显示出来，也可能出现“看得见但点不动”的情况。优化的核心有两条：第一，把长任务拆成多个小任务，通过 `requestAnimationFrame`、`setTimeout/postMessage`、`requestIdleCallback` 主动让出主线程；第二，把不依赖 DOM/CSSOM 的纯计算直接放到 Web Worker 中，而大量 Canvas 绘制可以进一步通过 OffscreenCanvas 搬到 Worker。最终目标就是让主线程持续保持足够的空闲时间去处理渲染和交互。**

## 第9题 为什么浏览器需要预加载扫描器？它和 HTML 解析器是什么关系？

### 题目

为什么浏览器需要预加载扫描器？它和 HTML 解析器是什么关系？

### 问题

请你重点回答下面几个问题：

1. 浏览器在解析 HTML 时，为什么不能等主解析器真正解析到 `<script>`、`<link>`、`<img>` 这些标签时才开始下载资源？
2. **预加载扫描器（Preload Scanner）** 是做什么的？它和主线程上的 HTML 解析器是串行还是并行关系？`基于Chrome浏览器渲染原理.md`
3. 如果普通 `<script>` 会阻塞 HTML 解析，为什么脚本、CSS、图片等资源仍然可能继续并行下载？
4. 预加载扫描器提前发现资源之后，真正的网络请求是由谁完成的？这里怎么和前面第 7 题的 **Network Process** 联系起来？
5. `async`、`defer` 和预加载扫描器之间是什么关系？
   - 预加载扫描器解决的是“什么时候开始下载”；
   - `async/defer` 主要解决的又是什么？
6. 最后请说明为什么：
   > **“HTML 解析被 JS 阻塞”不等于“浏览器所有资源下载也全部停止”。**

文档的核心逻辑是：浏览器一边接收和解析 HTML，预加载扫描器一边提前发现外部资源并发起请求，从而尽量让**解析和资源下载并行进行**。`基于Chrome浏览器渲染原理.md`

### 回答要点

可以按照 **“为什么需要 → 怎么工作 → 为什么 JS 阻塞解析但不阻塞所有下载 → 和 Network Process 的关系 → async/defer 的区别”** 来回答。

预加载扫描器的核心作用是：

> **在主线程正常解析 HTML 的同时，提前发现页面中后续需要加载的外部资源，并尽早启动这些资源的网络请求。**

如果浏览器完全等 HTML 主解析器真正走到 `<link>`、`<script>`、`<img>` 标签时才开始请求资源，那么一旦 HTML 解析被普通 JavaScript 阻塞，后面那些还没解析到的 CSS、JS、图片也只能继续等待，网络就会出现大量空闲时间。

所以浏览器增加了预加载扫描器，让它可以和主 HTML 解析过程并行工作，提前扫描 HTML 中的资源引用。`基于Chrome浏览器渲染原理.md`

---

### 标准回答

浏览器需要预加载扫描器，核心目的是**提高资源加载的并行度，减少因为 HTML 解析顺序而产生的网络等待时间**。

正常情况下，浏览器会从上到下解析 HTML，并在解析过程中构建 DOM。

例如：

```html
<div>...</div>
<script src="a.js"></script>
<img src="a.png">
<link rel="stylesheet" href="style.css">
```

如果浏览器只有一个 HTML 主解析器，那么它只有真正解析到某个资源标签时，才知道：

> 这里还有一个 JS、图片或者 CSS 需要下载。

问题在于，HTML 解析并不是一直顺畅向下执行的。

例如遇到一个没有 `async` 或 `defer` 的普通 `<script>` 时，HTML 解析器需要暂停，等待脚本处理完成之后再继续向下解析。文档明确指出，普通脚本会暂停 HTML 解析。`基于Chrome浏览器渲染原理.md`

假设后面还有：

```html
<script src="a.js"></script>

<!-- 后面 -->
<link rel="stylesheet" href="style.css">
<img src="banner.png">
<script src="b.js"></script>
```

如果完全依赖主解析器，那么当解析器停在 `a.js` 这里时，它还没有真正走到后面的 `style.css`、`banner.png` 和 `b.js`，这些资源就不能及时开始请求。

这样就会浪费等待 `a.js` 期间的网络能力。

因此浏览器引入了**预加载扫描器 Preload Scanner**。

它会在主线程正常构建 DOM 的同时，额外向前扫描 HTML，提前识别：

- `<script src="">`
- `<link rel="stylesheet">`
- `<img src="">`
- Web 字体等外部资源

从而提前启动这些资源的请求。`基于Chrome浏览器渲染原理.md`

所以它和 HTML 主解析器的关系可以简单理解成：

> **主解析器负责真正理解 HTML 并构建 DOM；预加载扫描器负责提前往后看，看看还有哪些资源需要下载。**

两者是**并行工作的**。

---
#### 为什么普通 JS 会阻塞 HTML 解析，但其他资源仍然可以继续下载？

这里最容易混淆的是：

> **HTML 解析和资源下载不是同一件事情。**

当普通 `<script>` 阻塞时，被暂停的是：

> **HTML 主解析器继续向下构建 DOM 的过程。**

但这并不代表：

> **整个浏览器、整个网络进程也停止工作。**

预加载扫描器可能已经提前扫描到了后面的 CSS、JS、图片资源，并提前发出了请求。

因此就可能出现：

```text
HTML 主解析器
        ↓
遇到普通 script
        ↓
暂停 HTML 解析
        │
        │      预加载扫描器之前已经发现：
        │      style.css
        │      b.js
        │      image.png
        │
        ↓
等待脚本执行

与此同时：

style.css   → 下载中
b.js        → 下载中
image.png   → 下载中
```

所以：

> **JS 阻塞 HTML 解析，不等于 JS 阻塞所有网络下载。**

文档明确说明，预加载扫描器与主线程 DOM 解析并行工作，其作用就是提前发现并下载外部资源。`基于Chrome浏览器渲染原理.md`

---
#### 那预加载扫描器发现资源以后，真正是谁去下载？

这里可以直接和第 7 题的多进程架构联系起来。

预加载扫描器负责的主要是：

> **“发现这个页面后面需要某个资源。”**

而真正执行：

- DNS；
- 建立连接；
- HTTP 请求；
- 接收响应；

这些网络请求工作的，仍然是：

> **Network Process。**

因此可以理解成：

```text
Renderer Process
HTML解析 / 预加载扫描器
        ↓
发现需要 style.css
        ↓
请求网络资源
        ↓
Network Process
        ↓
真正执行网络请求
```

也就是说：

> **预加载扫描器负责发现资源，Network Process 负责真正把资源下载回来。**

这和前面第 7 题完全一致：Renderer Process 负责页面解析和渲染逻辑，Network Process 负责实际网络请求。文档前面也说明预加载扫描器会提前启动资源请求，而网络进程负责实际网络请求流程。`基于Chrome浏览器渲染原理.md`

---
#### 预加载扫描器和 async、defer 是什么关系？

这几个概念容易混在一起，但解决的问题并不完全相同。
#### 预加载扫描器主要解决“什么时候开始下载”

它的目的就是：

> **不要等主 HTML 解析器真正走到资源标签时才开始下载，而是提前发现并请求资源。**

所以它解决的是：

> **资源发现和下载时机。**

---
#### async / defer 主要解决“脚本下载完成以后什么时候执行”

例如：

```html
<script src="a.js" async></script>
```

或者：

```html
<script src="a.js" defer></script>
```

它们都可以让脚本资源的下载与 HTML 解析并行进行，但真正重要的区别在于**执行时机**。

`async`：

> 脚本并行下载，下载完成后尽快执行，执行时可能打断当前 HTML 解析。

`defer`：

> 脚本并行下载，但等 HTML 解析完成之后再按规则执行。

而普通 `<script>`：

> 脚本执行会阻塞 HTML 主解析器。

所以可以这样区分：

> **Preload Scanner 解决“资源早点发现、早点下载”。**  
> **async/defer 解决“JavaScript 怎么下载、什么时候执行，以及是否阻塞 HTML 解析”。**

文档也将预加载扫描器和 `async/defer` 放在一起说明：预加载扫描器负责提前下载资源，而 `async/defer` 可以进一步减少脚本对 DOM 解析流程的阻塞。`基于Chrome浏览器渲染原理.md`

---
#### 一个完整例子

例如：

```html
<html>
<head>
  <script src="a.js"></script>
  <link rel="stylesheet" href="style.css">
  <script src="b.js" defer></script>
</head>
<body>
  <img src="banner.png">
</body>
</html>
```

HTML 主解析器从上往下执行。

解析到：

```html
<script src="a.js"></script>
```

因为这是普通脚本，HTML 解析可能暂停等待它执行。

但与此同时，预加载扫描器可以提前向后扫描，发现：

```text
style.css、b.js、banner.png
```

然后把这些资源请求提前发出去。

真正负责下载这些资源的是 Network Process。

所以在等待 `a.js` 的过程中，其他资源仍然可以处于下载状态。

等 `a.js` 执行完成之后，HTML 主解析器继续向下构建 DOM。

而 `b.js` 使用了 `defer`，即使它已经提前下载完成，也会按照 `defer` 的执行规则，在 HTML 解析完成以后再执行。

整个过程可以理解成：

```text
HTML主解析器
    ↓
构建DOM
    ↓
遇到普通JS
    ↓
暂停解析
    ↓
执行JS
    ↓
继续解析

与此同时

预加载扫描器
    ↓
提前发现 CSS / JS / 图片
    ↓
通知发起请求
    ↓
Network Process
    ↓
并行下载资源
```

---
#### 最终收敛回答

> **预加载扫描器是浏览器为了提高资源加载并行度而设计的机制。HTML 主解析器负责真正解析 HTML 和构建 DOM，而预加载扫描器会和它并行工作，提前扫描后续的 `<script>`、`<link>`、`<img>` 等资源引用，并尽早发起网络请求。真正的下载工作由 Network Process 完成。因此，普通 JavaScript 虽然会暂停 HTML 主解析器，但并不意味着浏览器所有网络请求都停止，因为预加载扫描器可能已经提前发现并启动了后续资源的下载。预加载扫描器主要解决资源“什么时候开始下载”，而 `async`、`defer` 主要决定脚本下载和执行如何与 HTML 解析协同。**

## 第10题 强缓存和协商缓存分别是什么？浏览器的缓存判断流程是怎样的？

### 题目

浏览器为什么需要 HTTP 缓存？强缓存和协商缓存分别是什么？它们各自由哪些 HTTP 头控制？浏览器请求一个已经缓存过的资源时，完整的缓存判断流程是怎样的？

### 问题

回答时需要说明：

1. 浏览器使用缓存的目的是什么？
2. 什么是强缓存？强缓存命中后是否还需要请求服务器？
3. 强缓存中的 `Cache-Control` 和 `Expires` 分别有什么作用？
4. `Cache-Control` 中的 `max-age`、`no-cache`、`no-store` 分别是什么意思？
5. 什么是协商缓存？
6. `ETag / If-None-Match` 和 `Last-Modified / If-Modified-Since` 分别如何工作？
7. 协商缓存返回 `304 Not Modified` 和返回新资源分别意味着什么？
8. 浏览器完整的缓存判断顺序是什么？

---

### 回答要点

按照以下顺序回答：

**缓存目的 → 强缓存 → Cache-Control / Expires → no-cache / no-store → 协商缓存 → ETag / If-None-Match → Last-Modified / If-Modified-Since → 304 / 新响应 → 完整流程**

核心内容：
#### 1. 缓存目的

- 复用已经获取过的资源。
- 减少重复网络请求和数据传输。
- 降低加载延迟、节省带宽、减轻服务器压力。
#### 2. 强缓存

- 缓存仍然有效时直接使用本地资源。
- 命中后不需要向服务器发起验证请求。
- 主要通过 `Cache-Control` 和 `Expires` 控制。
#### 3. Cache-Control

- `max-age`：缓存可以直接使用的有效时间。
- `no-cache`：可以缓存，但再次使用前必须向服务器验证。
- `no-store`：不存储该响应。
#### 4. Expires

- 使用一个绝对时间表示缓存过期时间。
- 与 `Cache-Control: max-age` 同时存在时，通常优先使用 `max-age`。
#### 5. 协商缓存

- 缓存不能直接使用时，向服务器验证本地缓存是否仍然有效。
- 主要有两套机制：
  - `ETag` ↔ `If-None-Match`
  - `Last-Modified` ↔ `If-Modified-Since`
#### 6. 协商结果

- 资源未变化：`304 Not Modified`，继续使用本地缓存。
- 资源已变化：服务器返回新的完整响应，浏览器使用并更新缓存。
#### 7. 整体顺序

- 先判断缓存能否直接使用。
- 能直接使用 → 强缓存。
- 不能直接使用 → 发起条件请求进行协商验证。

---

### 标准回答

浏览器使用 HTTP 缓存，主要是为了**复用之前已经获取过的资源，减少重复的网络请求和数据传输，从而降低页面加载延迟、节省带宽，同时减轻服务器压力**。

当浏览器再次请求一个已经缓存过的资源时，首先会判断这份缓存能不能直接使用，也就是通常所说的**强缓存**。
#### 1. 强缓存

强缓存指的是：

> **浏览器发现本地缓存仍然处于有效状态，因此直接使用本地资源，不需要向服务器发送验证请求。**

强缓存主要通过 `Cache-Control` 和 `Expires` 控制。

最常见的是：

```http
Cache-Control: max-age=3600
```

表示这个响应在规定时间内可以直接使用缓存。

`Cache-Control` 中还需要重点区分：

```http
Cache-Control: no-cache
```

`no-cache` 并不是“不缓存”，而是：

> **资源可以保存到缓存中，但再次使用之前必须先向服务器验证。**

而：

```http
Cache-Control: no-store
```

表示：

> **不存储这个响应。**

因此可以简单记成：

```text
max-age
→ 有效期内直接使用缓存

no-cache
→ 可以缓存，但使用前必须验证

no-store
→ 不存储缓存
```

另一种控制缓存有效期的方式是：

```http
Expires: <具体时间>
```

`Expires` 使用的是一个绝对过期时间，而 `Cache-Control: max-age` 表示相对的有效时长。

如果两者同时存在，通常以 `Cache-Control: max-age` 为准。

---
#### 2. 协商缓存

如果缓存已经过期，或者因为 `no-cache` 等原因不能直接使用，那么浏览器并不一定马上重新下载整个资源，而是可以向服务器询问：

> **“我本地这份资源还是最新的吗？”**

这就是协商缓存。

协商缓存主要有两套验证机制。

第一套是：

```text
ETag
↓
If-None-Match
```

服务器第一次返回资源时，可以在响应头中返回：

```http
ETag: "abc123"
```

浏览器保存这个 ETag。

下一次需要验证时，在请求头中发送：

```http
If-None-Match: "abc123"
```

服务器根据当前资源的 ETag 判断资源是否发生变化。

第二套是：

```text
Last-Modified
↓
If-Modified-Since
```

服务器第一次返回资源时，可以返回：

```http
Last-Modified: <资源最后修改时间>
```

浏览器保存这个时间。

下一次请求时发送：

```http
If-Modified-Since: <上次的修改时间>
```

服务器据此判断资源之后是否发生过修改。

---
#### 3. 协商之后的结果

如果服务器判断资源**没有变化**，返回：

```http
304 Not Modified
```

这时不需要重新传输完整资源，浏览器继续使用本地缓存。

流程是：

```text
发送条件请求
     ↓
服务器判断资源没变
     ↓
304 Not Modified
     ↓
继续使用本地缓存
```

如果服务器判断资源**已经变化**，则返回新的完整响应，浏览器使用新的资源，并根据缓存规则更新本地缓存。

---
#### 4. 完整缓存判断流程

整个过程可以理解为：

```text
浏览器请求资源
      ↓
查找本地缓存
      ↓
缓存能否直接使用？
      ↓
┌───────────────┐
│               │
能              不能
│               │
↓               ↓
强缓存          协商缓存
│               │
直接使用缓存     向服务器发送条件请求
不验证服务器          ↓
                 服务器判断资源是否变化
                       ↓
              ┌──────────────┐
              │              │
            没变化          已变化
              │              │
              ↓              ↓
             304          返回新资源
              │              │
              ↓              ↓
         使用本地缓存      使用新资源
```

最终可以收敛为：

> **HTTP 缓存首先判断本地缓存能否直接使用。强缓存主要由 `Cache-Control` 和 `Expires` 控制，命中后不需要向服务器验证；其中 `no-cache` 表示可以缓存但使用前必须验证，`no-store` 表示不存储。缓存不能直接使用时进入协商缓存，通过 `ETag / If-None-Match` 或 `Last-Modified / If-Modified-Since` 向服务器验证。资源没有变化时返回 304 并继续使用本地缓存，资源发生变化时则返回新的资源。**

## 第11题 HTTPS 是什么？它相比 HTTP 解决了什么问题？

### 题目

HTTPS 是什么？它相比 HTTP 解决了什么问题？

### 问题

1. HTTP 本身存在哪些安全问题？
2. HTTPS 和 HTTP 的关系是什么？
3. HTTPS 中 TLS/SSL 主要起什么作用？
4. HTTPS 主要解决哪三类安全问题？
   - 身份认证
   - 数据加密
   - 完整性保护
5. 为什么不能简单地说“HTTPS 就是 HTTP 加密”？

### 回答要点

按照下面的顺序回答：

**HTTP 的安全问题 → HTTPS 与 HTTP 的关系 → TLS 的作用 → 身份认证 → 数据加密 → 完整性保护**

核心内容：

1. HTTP 本身采用明文传输，存在数据被窃听、内容被篡改、通信对象身份无法可靠确认的问题。
2. HTTPS 不是完全独立于 HTTP 的另一套应用层协议，而是在 HTTP 通信基础上加入 TLS/SSL 安全层。
3. TLS/SSL 主要提供三类安全能力：
   - 身份认证：确认通信服务器的身份。
   - 数据加密：防止传输内容被直接读取。
   - 完整性保护：发现数据在传输过程中是否被篡改。
4. 因此 HTTPS 不能只理解成“HTTP 加密”，因为它除了加密，还提供身份认证和完整性保护。

### 标准回答

HTTP 本身采用明文传输，因此通信过程中存在几个明显的安全问题：第一，数据可能被第三方窃听；第二，数据在传输过程中可能被篡改；第三，客户端本身无法仅依靠 HTTP 可靠确认正在通信的服务器身份。

HTTPS 的作用就是解决这些问题。

HTTPS 可以理解为在 HTTP 通信基础上加入了 TLS/SSL 安全层：

```text
HTTP
 ↓
TLS / SSL
 ↓
底层传输
```

也就是说，HTTP 仍然负责请求和响应的应用层语义，而 TLS 负责为这段通信提供安全能力。

TLS 主要提供三方面的保护。

第一是**身份认证**。

身份认证解决的是：

> 客户端正在连接的服务器，到底是不是自己真正想访问的服务器。

TLS 会通过相应的身份认证机制验证服务器身份，从而降低连接到伪造服务器的风险。

第二是**数据加密**。

HTTP 如果直接明文传输，那么请求参数、Cookie、响应内容等信息一旦被截获，就可能被直接读取。

TLS 会对传输数据进行加密，因此即使通信内容被截获，也不能直接看到原始的 HTTP 数据。

第三是**完整性保护**。

数据除了可能被窃听，还可能在传输过程中被修改。

TLS 会提供完整性校验机制，用来发现通信数据是否在传输过程中遭到篡改。

所以 HTTPS 不能简单地理解成：

> HTTP 加密。

更准确的说法是：

> **HTTPS 是在 HTTP 通信基础上引入 TLS/SSL，通过 TLS 提供身份认证、数据加密和完整性保护，从而降低 HTTP 明文通信中被窃听、篡改和身份冒充的风险。**

## 第12题 TLS/SSL 是如何在 HTTPS 中建立安全通信环境的？

### 题目

TLS/SSL 是如何在 HTTPS 中建立安全通信环境的？

### 问题

1. TLS/SSL 在 HTTPS 中处于什么位置，主要负责什么？
2. TLS 为什么需要同时使用哈希、对称加密和非对称密码学？
3. 哈希、对称加密和非对称密码学分别解决什么问题？
4. 为什么单独使用哈希无法保证消息不被中间人篡改？
5. 为什么 TLS 不直接使用非对称加密传输所有数据？
6. 数字证书解决了什么问题？服务器如何申请证书，客户端又如何验证证书？
7. TLS 握手过程中，客户端和服务器如何建立共享秘密并派生会话密钥？
8. TLS 如何验证整个握手过程没有被篡改？
9. TLS 握手完成以后，HTTP 数据如何进行安全传输？

### 回答要点

建议按照这条主线回答：

**TLS 的目标 → 三类密码学机制的分工 → 数字证书完成身份认证 → TLS 握手建立共享秘密 → 验证握手完整性 → 派生会话密钥 → 对称加密保护后续 HTTP 数据。**

核心要点：

- TLS 的作用是为 HTTP 建立一个安全通信环境，主要解决**身份认证、数据机密性和消息完整性**三个问题。
- 哈希用于生成数据摘要，是完整性验证、数字签名、握手 Transcript Hash 等机制的基础，但**单独的哈希不能抵抗主动中间人篡改**。
- 对称加密速度快，适合大量业务数据，但问题是通信双方一开始没有共同密钥。
- 非对称密码学主要用于**身份认证和共享秘密建立**，解决双方如何在不安全网络中建立安全密钥材料的问题。
- 数字证书解决的是**服务器身份与服务器公钥之间的可信绑定**问题。
- TLS 1.3 中，客户端和服务器通过 `ClientHello`、`ServerHello` 等消息交换协商参数和密钥交换参数，在两端计算相同的共享秘密，并从中派生握手密钥和应用流量密钥。
- `Certificate` 用于提供服务器身份和公钥证明，`CertificateVerify` 证明服务器确实持有对应私钥。
- TLS 会维护整个握手过程的 `Transcript Hash`，并通过 `CertificateVerify`、`Finished` 等机制验证握手过程的完整性。
- 握手完成后，后续 HTTP 数据主要使用高效的对称 AEAD 算法进行加密和完整性保护。

### 标准回答

TLS/SSL 位于 HTTP 与底层网络传输之间，它的主要作用是为 HTTP 建立一个**安全的通信环境**。它主要解决三个问题：第一，确认当前通信的服务器身份是否可信；第二，对传输数据进行加密，避免数据以明文形式被窃听；第三，保证消息完整性，使传输过程中的篡改能够被发现。

为了实现这三个目标，TLS 并不是只使用一种密码算法，而是综合使用**哈希、非对称密码学和对称加密**。
#### 1. 三类密码学机制的分工

哈希函数可以把任意数据计算成固定长度的消息摘要。原始数据只要发生变化，摘要通常也会变化，所以它可以作为判断消息是否发生变化的基础。

但单独使用哈希不能真正抵抗中间人篡改。例如直接发送：

```text
消息 M + Hash(M)
```

中间人完全可以把消息修改成 `M'`，然后重新计算 `Hash(M')`。因此 TLS 不会简单地依靠“消息 + 普通哈希”来保证安全，而是把哈希和数字签名、MAC、AEAD 等具有密钥认证能力的机制结合起来。

对称加密的特点是通信双方使用同一组共享密钥进行加密和解密。它的优势是**速度快、计算成本低**，非常适合大量 HTTP 数据传输。

但它存在一个核心问题：

> 客户端和服务器第一次通信时，双方怎么安全地得到同一个秘密？

如果直接把对称密钥放在网络上传输，中间人一旦截获密钥，后面的加密通信就失去了意义。

因此 TLS 还需要非对称密码学。

非对称密码学在 TLS 中主要解决两个问题：

> **身份认证和共享秘密建立。**

现代 TLS 并不是简单地生成一个对称密钥，然后用服务器公钥加密后发给客户端。更准确地说，是通信双方交换公开的密钥协商参数，同时保留自己的私有参数，然后分别在本地计算，最终得到相同的共享秘密。

可以简单理解为：

```text
客户端                         服务器
私有参数                       私有参数
   ↓                              ↓
公开参数  ─────── 相互交换 ────── 公开参数
   ↓                              ↓
本地计算                         本地计算
   └────────→ 相同共享秘密 ←──────┘
```

这个共享秘密本身并不会直接在网络中传输。

之所以不直接使用非对称密码学加密全部 HTTP 数据，是因为非对称密码运算的计算开销远高于对称密码。因此 TLS 采用的是一种分工策略：

> **先使用非对称密码学完成身份认证和共享秘密建立，再从共享秘密派生对称流量密钥，最后使用对称加密保护大量业务数据。**
#### 2. 数字证书解决服务器身份认证问题

即使有了非对称密码学，还存在另一个问题：

> 客户端怎么知道自己收到的公钥真的属于目标服务器，而不是中间人的公钥？

如果没有可信的身份认证机制，中间人完全可以截获服务器的公开信息，然后把自己的公钥发送给客户端。

因此需要数字证书。

数字证书的核心作用是建立：

> **服务器身份与服务器公钥之间的可信绑定关系。**

服务器首先生成自己的公钥和私钥，然后生成 CSR 向 CA 申请证书。CSR 中包含服务器的公钥、身份信息等，并使用对应的服务器私钥生成数字签名，用来证明申请者确实拥有这把公钥对应的私钥。

CA 完成相关身份验证后，会把服务器的公钥、域名、有效期等信息写入证书，并使用 **CA 私钥对证书进行数字签名**。

这里不能简单理解成：

> CA 用私钥“加密”证书，客户端再用公钥“解密”。

更准确的是：

> **CA 用私钥生成数字签名，客户端使用 CA 公钥验证数字签名。**

TLS 握手时，服务器把证书发送给客户端。客户端会根据证书链逐级验证到自己信任的根 CA，同时检查证书签名、域名、有效期等信息。

验证通过后，客户端就可以相信：

> **证书中的这个公钥确实属于当前访问的服务器。**
#### 3. TLS 握手如何建立密钥并保证完整性

在 TLS 1.3 中，客户端首先发送 `ClientHello`，其中包含自己支持的 TLS 版本、密码套件、随机数以及密钥交换参数等。

服务器收到后返回 `ServerHello`，选择相应的算法和协议参数，并返回自己的密钥交换信息。

```text
Client
  │
  │ ClientHello
  │ 版本、算法、key_share 等
  │────────────────────────→
  │
  │ ServerHello
  │ 选择参数、Server key_share
  │←────────────────────────
Server
```

双方随后利用交换的公开参数和自己保存的私有参数，在本地计算出相同的**共享秘密**，再从共享秘密中派生出握手阶段使用的密钥以及后续应用数据使用的流量密钥。

与此同时，TLS 会持续维护整个握手过程的 **Transcript Hash**。它可以理解为对已经发生的握手消息不断形成一个整体摘要，例如：

```text
ClientHello
+
ServerHello
+
EncryptedExtensions
+
Certificate
+
CertificateVerify
+
……
        ↓
Transcript Hash
```

因此 TLS 并不是在开始阶段简单发送“一个明文消息和一个普通 Hash”来防止篡改，而是把前面的整个握手过程逐步绑定到后续的数字签名、密钥派生和 Finished 验证中。

服务器随后发送 `Certificate`，让客户端验证自己的数字证书；再通过 `CertificateVerify` 使用证书对应的私钥对当前握手上下文进行数字签名。

因此：

```text
Certificate
→ 建立“服务器身份 ↔ 公钥”的可信关系

CertificateVerify
→ 证明当前服务器确实拥有对应的私钥
```

最后双方还会通过 `Finished` 消息对整个握手过程进行确认。

`Finished` 会结合已经建立的密钥和前面的 `Transcript Hash` 生成验证信息。如果中间人修改过握手中的关键消息，可能会提前导致密钥计算、解密或 `CertificateVerify` 验证失败；即使没有提前发现，最终也可能导致 `Finished` 验证失败。

所以 `Finished` 可以理解为：

> **对前面整个 TLS 握手过程进行最终的完整性确认和密钥确认。**

握手成功以后，客户端和服务器已经拥有双方共同派生出的应用流量密钥。

后续真正大量的：

```text
HTTP Request
HTTP Response
```

就主要使用高效的**对称 AEAD 算法**进行保护。它不仅提供数据加密，还同时提供完整性和认证保护。

因此整个 TLS 的逻辑最终可以收敛成：

> **TLS 首先通过数字证书和非对称密码学确认服务器身份并建立共享秘密，再根据共享秘密派生握手密钥和应用流量密钥；同时利用 Transcript Hash、CertificateVerify 和 Finished 等机制保证整个握手过程没有被未检测地篡改。握手完成以后，再使用高效的对称加密保护后续 HTTP 数据。这样就共同实现了身份认证、数据机密性和消息完整性。**

## 第13题 DNS 域名解析的完整过程是什么？

### 题目

DNS 域名解析的完整过程是什么？

### 问题

1. DNS 的作用是什么？为什么访问网站时需要进行 DNS 解析？
2. 浏览器拿到域名以后，会先从哪些缓存中查找结果？
3. 本地没有结果时，查询请求会发送给谁？
4. 递归 DNS 解析器如何通过根 DNS、顶级域 DNS 和权威 DNS 找到最终结果？
5. 根域名服务器、顶级域名服务器和权威域名服务器分别负责什么？
6. 查询得到 IP 地址以后，DNS 解析器和客户端会做什么？
7. DNS 查询为什么经常使用 UDP？什么时候会使用 TCP？
8. DNS 查询中的“递归查询”和“迭代查询”有什么区别？

### 回答要点

核心要点如下：
#### 1. DNS 的目标

- DNS 负责把域名转换成应用真正需要使用的资源记录，例如把域名解析为 IP 地址。
- 浏览器访问 `www.example.com` 时，需要先获得目标服务器的 IP 地址，才能继续建立网络连接。
#### 2. 缓存查询

- 客户端会优先利用已有的 DNS 缓存结果，例如浏览器、操作系统或本地解析组件的缓存。
- 如果本地没有可用结果，则把查询交给配置的递归 DNS 解析器。
- 递归解析器自身也会检查缓存；命中后可以直接返回。
#### 3. 完整 DNS 查询链路

- 递归解析器没有缓存时，从根域名服务器开始寻找。
- 根 DNS 通常不直接返回目标 IP，而是告诉解析器应该继续查询哪个顶级域服务器。
- 顶级域 DNS 再提供负责目标域名的权威 DNS 信息。
- 权威 DNS 最终返回目标域名对应的资源记录。
- 解析器把结果缓存一定时间，并返回给客户端。RFC 1034 将这种“得到 referral 后继续寻找更接近答案的服务器”的过程作为解析器的基本工作方式。([RFC 编辑器](https://www.rfc-editor.org/info/rfc1034/?utm_source=chatgpt.com))
#### 4. 递归查询和迭代查询

- 客户端通常向递归解析器发起递归查询：希望直接得到最终答案或错误。
- 递归解析器向根、TLD、权威 DNS 查询时，通常根据服务器返回的 referral 逐步继续查询。
- 因此不能简单说“浏览器自己依次访问根 DNS、顶级域 DNS、权威 DNS”。
#### 5. UDP 与 TCP

- DNS 支持 UDP 和 TCP，传统普通查询大量使用 UDP，因为无需建立 TCP 连接，开销较低。
- 当 UDP 响应被截断等情况下，可以改用 TCP。
- 现代规范要求通用 DNS 实现同时支持 UDP 和 TCP，因此不能再简单表述为“DNS 查询只用 UDP”。([RFC 编辑器](https://www.rfc-editor.org/info/rfc7766/?utm_source=chatgpt.com))

---

### 标准回答

DNS，也就是 Domain Name System，核心作用是**把人容易使用的域名转换成网络通信需要的资源记录**。例如访问：

```text
www.example.com
```

浏览器最终需要得到服务器对应的 IP 地址，之后才能继续建立 TCP、QUIC 等网络连接。因此在访问一个域名时，DNS 解析通常是建立网络通信之前的重要步骤。
#### 1. DNS 查询首先从缓存开始

假设浏览器准备访问：

```text
www.example.com
```

并不意味着它马上就去请求根域名服务器，而是会优先寻找已经存在的解析结果。

可以简单理解成：

```text
www.example.com
      ↓
检查本地可用 DNS 缓存
      ↓
有有效记录？
   ↓       ↓
  有       没有
  ↓         ↓
直接使用    请求递归 DNS 解析器
```

具体实现中，缓存可能存在于浏览器或应用、操作系统解析组件以及递归 DNS 解析器等位置。DNS 记录带有 TTL，解析器可以在 TTL 有效期间缓存结果，减少重复查询。RFC 1034 也明确将缓存作为 DNS 解析机制的重要组成部分。([RFC 编辑器](https://www.rfc-editor.org/info/rfc1034/?utm_source=chatgpt.com))

如果递归 DNS 解析器自身也没有缓存，就需要继续寻找真正负责这个域名的权威 DNS 服务器。

---
#### 2. 从根 DNS 一直查询到权威 DNS

这里最容易理解错误的一点是：

> **通常不是浏览器自己依次访问根 DNS、顶级域 DNS和权威 DNS。**

一般情况下，客户端把问题交给一个**递归 DNS 解析器**：

```text
“帮我找到 www.example.com 的 IP”
```

然后由递归解析器完成后面的查询工作。

假设所有相关缓存都没有命中，整个过程可以理解为：

```text
浏览器 / 操作系统
        │
        │ 查询 www.example.com
        ↓
递归 DNS 解析器
        │
        │ ① 查询根 DNS
        ↓
根域名服务器
        │
        │ “我不知道最终 IP，
        │  但 .com 的服务器在这里”
        ↓
递归 DNS 解析器
        │
        │ ② 查询 .com 顶级域 DNS
        ↓
.com 顶级域服务器
        │
        │ “example.com 的权威 DNS
        │  在这里”
        ↓
递归 DNS 解析器
        │
        │ ③ 查询 example.com 权威 DNS
        ↓
权威 DNS
        │
        │ 返回 www.example.com 的记录
        ↓
递归 DNS 解析器
        │
        │ 缓存结果
        ↓
客户端
```

RFC 1034 描述的解析过程就是：解析器从自己已经知道的、尽可能接近目标名称的服务器开始，如果服务器不能给最终答案，就根据返回的 **referral** 找到更接近目标的服务器，直到得到权威答案。([RFC 编辑器](https://www.rfc-editor.org/info/rfc1034/?utm_source=chatgpt.com))

这里三个 DNS 层次的职责可以这样理解：

```text
根 DNS
→ 告诉你去哪里找顶级域

顶级域 DNS
→ 告诉你目标域名由哪个权威 DNS 管理

权威 DNS
→ 保存该域名真正的 DNS 记录并返回结果
```

例如查：

```text
www.example.com
```

大致就是：

```text
根 .
 ↓
.com
 ↓
example.com 的权威 DNS
 ↓
www.example.com 对应的记录
```

因此根 DNS 通常不是直接告诉你 `www.example.com` 的 IP，而是**不断把解析器引导到更接近最终答案的服务器**。([RFC 编辑器](https://www.rfc-editor.org/info/rfc1034/?utm_source=chatgpt.com))

查询得到最终结果后，递归解析器会根据记录的 TTL 缓存结果，然后把结果返回给客户端，这样后续请求就可能不必重新走完整查询链路。([RFC 编辑器](https://www.rfc-editor.org/info/rfc1034/?utm_source=chatgpt.com))

---
#### 3. 递归查询和迭代查询要区分

这也是 DNS 面试中比较重要的一点。

客户端通常向递归解析器表达的需求是：

> **“你帮我查完，最终告诉我答案。”**

这可以理解成**递归查询**。

RFC 1034 对递归模式的定义是：如果服务器提供递归服务，它最终向客户端返回答案或者错误，而不是让客户端自己继续追踪 referral。([RFC 编辑器](https://www.rfc-editor.org/info/rfc1034/?utm_source=chatgpt.com))

而解析器向其他 DNS 服务器查询时，可能得到：

```text
我不知道最终答案，
但你可以去问这个服务器。
```

这种返回其他服务器信息、让查询方继续查找的方式，就是 DNS 解析过程中非常典型的**迭代/referral 查询过程**。

所以可以记成：

```text
客户端 → 递归解析器
“你帮我找到最终答案”

递归解析器 → 根/TLD/权威服务器
“你知道就告诉我，
不知道就告诉我下一步问谁”
```

---
#### 4. DNS 为什么经常使用 UDP？什么时候使用 TCP？

DNS 传统的普通查询大量使用 UDP，最直观的原因是：

> **UDP 不需要像 TCP 一样先建立连接，因此对于短小的请求-响应式查询，额外开销比较小。**

经典 DNS 规范 RFC 1035 同时规定了 DNS 可以使用 UDP 53 和 TCP 53；早期标准查询推荐使用 UDP，而区域传送等场景使用 TCP。([RFC 编辑器](https://www.rfc-editor.org/info/rfc1035/?utm_source=chatgpt.com))

如果 UDP 响应过大而被截断，DNS 报文中会设置 `TC`（Truncated）标志，客户端可以改用 TCP 重新查询。([RFC 编辑器](https://www.rfc-editor.org/info/rfc1035/?utm_source=chatgpt.com))

不过面试中不要再回答成：

> “DNS 默认只能使用 UDP，只有超过 512 字节才使用 TCP。”

这是过度简化。

现代 DNS 已经大量使用 EDNS、DNSSEC 等机制，报文可能明显超过早期的 512 字节限制。RFC 7766 进一步要求通用 DNS 实现**必须同时支持 UDP 和 TCP**，而且解析器在特定情况下也可以直接选择 TCP。([RFC 编辑器](https://www.rfc-editor.org/info/rfc7766/?utm_source=chatgpt.com))

因此比较准确的回答是：

> **普通 DNS 查询传统上大量使用 UDP，因为无需建立连接、开销较低；DNS 同时支持 TCP，当 UDP 响应被截断、需要传输较大数据，或者出于实现和协议需求时可以使用 TCP。现代 DNS 实现必须支持 UDP 和 TCP。**

---

整个 DNS 解析过程最终可以收敛成：

```text
浏览器访问域名
      ↓
检查本地 DNS 缓存
      ↓
没有可用结果
      ↓
请求递归 DNS 解析器
      ↓
解析器检查自己的缓存
      ↓
仍然没有
      ↓
查询根 DNS
      ↓
得到顶级域 DNS referral
      ↓
查询顶级域 DNS
      ↓
得到权威 DNS referral
      ↓
查询权威 DNS
      ↓
获得目标资源记录
      ↓
递归解析器缓存结果
      ↓
把结果返回客户端
      ↓
客户端获得 IP 等信息
      ↓
继续建立网络连接
```

最适合面试的收敛表达是：

> **DNS 的作用是把域名解析成 IP 等资源记录。客户端首先利用本地缓存，没有结果时通常把请求交给递归 DNS 解析器。递归解析器先检查自己的缓存，如果仍然没有结果，就根据 DNS 的层次结构从根域名服务器开始查询；根 DNS 返回顶级域服务器的信息，顶级域 DNS 再返回目标域名对应的权威 DNS，最终由权威 DNS 返回实际资源记录。解析器将结果按照 TTL 缓存并返回客户端。客户端到递归解析器通常是递归查询，而递归解析器在查询根、TLD 和权威服务器时会根据 referral 逐级寻找答案。DNS 同时支持 UDP 和 TCP，普通查询传统上大量使用 UDP，但现代 DNS 实现必须同时支持两种传输方式。** ([RFC 编辑器](https://www.rfc-editor.org/info/rfc1034/?utm_source=chatgpt.com))

---

**Sources:**

- [RFC 1034: Domain names - concepts and facilities | RFC Editor](https://www.rfc-editor.org/info/rfc1034/?utm_source=chatgpt.com)

## 第14题 TCP 和 UDP 有什么区别？分别适合什么场景？

### 题目

TCP 和 UDP 有什么区别？分别适合什么场景？

### 问题

1. TCP 和 UDP 在连接方式上有什么区别？
2. TCP 为什么能够提供可靠传输？它主要依靠哪些机制？
3. TCP 的“面向字节流”和 UDP 的“面向报文”分别是什么意思？
4. TCP 中的流量控制和拥塞控制分别解决什么问题？
5. TCP 和 UDP 在传输开销、延迟和可靠性上有什么区别？
6. 为什么实时音视频、游戏、DNS 等场景经常使用 UDP，而需要可靠传输的业务通常更适合 TCP？
7. 应该如何根据业务需求选择 TCP 或 UDP？

### 回答要点

核心要点如下：
#### 1. TCP 的特点

- 面向连接，正式传输数据之前需要建立连接。
- 提供可靠、有序的字节流传输。
- 通过序列号、确认机制、重传等手段实现可靠性。
- 具有流量控制和拥塞控制机制。
- 协议机制较复杂，通常会带来更多状态维护和传输开销。([RFC 编辑器](https://www.rfc-editor.org/info/rfc9293/?utm_source=chatgpt.com))
#### 2. UDP 的特点

- 无连接，发送数据前不需要建立类似 TCP 的连接状态。
- 面向数据报，每个 UDP Datagram 保留独立消息边界。
- 协议本身不提供 TCP 那样的确认、重传、有序交付和流量控制机制。
- 协议机制简单，适合希望降低传输层额外机制和时延的场景。([RFC 编辑器](https://www.rfc-editor.org/info/rfc768/?utm_source=chatgpt.com))
#### 3. TCP 的可靠传输

- 序列号：标识字节位置，保证数据能够按顺序重组。
- ACK：接收方确认已经收到的数据。
- 重传：发现数据丢失后重新发送。
- 校验和：检测传输中的比特错误。
- TCP 因而向应用提供可靠、有序的字节流。([RFC 编辑器](https://www.rfc-editor.org/info/rfc9293/?utm_source=chatgpt.com))
#### 4. 字节流和数据报

- TCP 面向字节流：应用写入的数据在 TCP 看来是一串连续字节，本身不保留应用层消息边界。
- UDP 面向数据报：一次发送的 Datagram 作为独立消息进行传递，保留报文边界。([RFC 编辑器](https://www.rfc-editor.org/info/rfc9293/?utm_source=chatgpt.com))
#### 5. 流量控制和拥塞控制

- 流量控制：解决“接收方来不及接收”的问题，发送方受接收窗口 `rwnd` 限制。
- 拥塞控制：解决“网络承载不了这么多数据”的问题，发送方通过拥塞窗口 `cwnd` 等机制控制进入网络的数据量。实际可发送量同时受到 `rwnd` 和 `cwnd` 的约束。([RFC 编辑器](https://www.rfc-editor.org/info/rfc5681/?utm_source=chatgpt.com))
#### 6. 选择原则

- 如果业务非常重视可靠、有序交付，可以优先考虑 TCP。
- 如果业务更强调实时性，并且愿意由应用层自己处理丢包、重传、排序等问题，可以考虑 UDP。
- 不能简单理解为“TCP 慢、UDP 快”，真正的区别是两种协议提供的传输语义和机制不同。

---

### 标准回答

TCP 和 UDP 都属于传输层协议，但它们提供给应用程序的服务模型不同。

最核心的区别可以先概括成：

> **TCP 提供面向连接、可靠、有序的字节流服务；UDP 提供机制更精简的数据报服务，本身不负责把数据变成像 TCP 那样的可靠、有序字节流。** ([RFC 编辑器](https://www.rfc-editor.org/info/rfc9293/?utm_source=chatgpt.com))
#### 1. TCP 和 UDP 的核心区别

TCP 是**面向连接**的。通信双方在正式交换应用数据之前，需要先建立 TCP 连接，并在整个连接过程中维护序列号、确认状态、窗口等信息。

TCP 向应用提供的是：

> **可靠、有序的字节流。**

RFC 9293 明确将 TCP 定义为 reliable、in-order、byte-stream service。([RFC 编辑器](https://www.rfc-editor.org/info/rfc9293/?utm_source=chatgpt.com))

UDP 则不同。UDP 的设计目标是提供一种机制非常精简的 **datagram mode**，应用程序可以直接向另一个端点发送 UDP 数据报，而不需要先建立类似 TCP 的连接状态。([RFC 编辑器](https://www.rfc-editor.org/info/rfc768/?utm_source=chatgpt.com))

所以最基础的对比是：

```text
TCP
→ 面向连接
→ 可靠
→ 有序
→ 面向字节流
→ 自带较完整的可靠性和控制机制

UDP
→ 无连接
→ 不提供 TCP 式可靠性
→ 不保证按序交付
→ 面向数据报
→ 协议机制相对精简
```

这里不能简单说：

> TCP 一定慢，UDP 一定快。

更准确的是：

> **TCP 帮应用层承担了更多可靠传输和网络控制工作；UDP 提供的传输层机制更少，因此应用可以获得更直接的数据报传输能力，但需要自己决定是否实现可靠性、重传、排序等能力。**

---
#### 2. TCP 为什么能够实现可靠传输？

TCP 的可靠性不是来自某一个单独机制，而是多个机制共同完成的。

首先是**序列号**。

TCP 把应用数据看成连续的字节流，并给这些字节进行编号。这样接收方就能判断：

- 哪些数据已经收到；
- 哪些数据丢失；
- 哪些数据重复；
- 数据应该按什么顺序重新组织。

RFC 9293 对 TCP 可靠性的描述包括利用序列号检测数据丢失，并通过重传进行恢复。([RFC 编辑器](https://www.rfc-editor.org/info/rfc9293/?utm_source=chatgpt.com))

其次是**确认 ACK**。

接收方收到数据以后，会通过确认信息告诉发送方：

> “哪些数据我已经收到了。”

发送方根据 ACK 推进发送状态。

如果发送出去的数据一直没有得到正确确认，就可能进入重传过程。

所以核心流程可以理解为：

```text
发送数据
   ↓
序列号标识
   ↓
接收方收到
   ↓
返回 ACK
   ↓
发送方确认数据成功到达
```

如果出现丢包：

```text
发送数据
   ↓
数据丢失
   ↓
没有得到预期确认
或通过其他丢失检测机制发现
   ↓
重新发送
```

TCP 还使用校验和检测传输中的错误。因此 TCP 最终可以向上层提供可靠、有序的数据流。([RFC 编辑器](https://www.rfc-editor.org/info/rfc9293/?utm_source=chatgpt.com))

可以把它收敛成：

> **TCP 的可靠性主要依靠序列号、确认、丢失检测和重传等机制共同实现。**

---
#### 3. “面向字节流”和“面向报文”是什么意思？

这也是 TCP 和 UDP 非常重要的区别。

TCP 是**面向字节流**的。

假设应用层连续执行：

```text
send("ABC")
send("DEF")
```

对于 TCP 来说，本质上处理的是：

```text
A B C D E F
```

也就是一串连续的字节。

TCP **不保证接收方按照应用调用 `send()` 的边界收到数据**。

接收方可能一次读到：

```text
ABCDEF
```

也可能是：

```text
AB
CDEF
```

因此使用 TCP 时，应用层协议需要自己设计：

- 固定长度；
- 长度字段；
- 特殊分隔符；

等方式来识别消息边界。TCP 规范本身提供的是字节流服务。([RFC 编辑器](https://www.rfc-editor.org/info/rfc9293/?utm_source=chatgpt.com))

UDP 是**面向数据报**的。

如果应用发送两个独立 UDP Datagram：

```text
Datagram 1：ABC

Datagram 2：DEF
```

它们仍然是两个独立的数据报，而不是像 TCP 那样被抽象成一个连续字节流。RFC 768 定义的就是 datagram-oriented service。([RFC 编辑器](https://www.rfc-editor.org/info/rfc768/?utm_source=chatgpt.com))

因此可以记成：

> **TCP 关注“这是一串连续字节”，UDP 关注“这是一个个独立的数据报”。**

---
#### 4. 流量控制和拥塞控制分别解决什么问题？

这两个概念很容易混淆。

**流量控制解决的是接收方的问题：**

> **发送方发得太快，接收方处理不过来怎么办？**

TCP 接收方可以通过接收窗口：

```text
rwnd
```

告诉发送方自己目前还能接收多少未确认数据。

因此流量控制的核心目标是：

> **不要把接收方撑爆。**

---

**拥塞控制解决的是网络的问题：**

> **即使接收方处理得过来，中间网络可能也承载不了这么大的发送速度。**

TCP 通过拥塞窗口：

```text
cwnd
```

控制发送端在未收到确认之前可以注入网络的数据量。

TCP 的经典拥塞控制机制包括：

- 慢启动；
- 拥塞避免；
- 快速重传；
- 快速恢复。([RFC 编辑器](https://www.rfc-editor.org/info/rfc5681/?utm_source=chatgpt.com))

所以可以直接记：

```text
流量控制
→ 看接收方能不能接得住
→ rwnd

拥塞控制
→ 看网络能不能承受
→ cwnd
```

真正允许发送的数据量，需要同时受到接收窗口和拥塞窗口的约束。RFC 5681 明确指出，传输受到 `cwnd` 与 `rwnd` 中较小者的限制。([RFC 编辑器](https://www.rfc-editor.org/info/rfc5681/?utm_source=chatgpt.com))

---
#### 5. 为什么有些业务选择 TCP，有些选择 UDP？

选择 TCP 还是 UDP，本质上取决于：

> **业务到底更需要什么样的传输语义。**

如果业务非常重视：

```text
数据不能丢 + 数据顺序不能错 + 希望传输层负责重传和控制
```

那么 TCP 更合适。

例如很多需要完整数据交付的应用层协议和业务，会利用 TCP 提供的可靠字节流能力。

如果业务更关注：

```text
低延迟 + 允许一定程度的数据丢失 + 希望应用自己决定是否重传
```

那么 UDP 往往更有吸引力。

例如实时语音或视频场景中，一段几百毫秒之前的数据即使重新传回来，也可能已经失去播放价值。此时应用可能宁可接受部分丢失，也不希望因为等待旧数据重传而增加延迟。

游戏中的实时状态同步也可能有类似需求：

```text
100 ms 前的位置
```

如果已经过时，重新把它可靠传回来可能意义不大。

因此 UDP 给应用更多自由度：

> **你可以不要重传，也可以自己实现只重传重要数据，还可以自己设计排序、可靠性和拥塞控制策略。**

---

但需要特别注意：

> **UDP 本身没有可靠性，不等于“基于 UDP 的协议都不可靠”。**

应用完全可以在 UDP 之上自行实现可靠传输。

例如现代 QUIC 就运行在 UDP 之上，但自己实现了可靠传输、拥塞控制、多路复用和加密等能力。因此协议选择不能只看最底层是 TCP 还是 UDP，而要看上层到底提供了什么传输语义。

---

最终可以把 TCP 和 UDP 收敛成：

> **TCP 是面向连接的可靠、有序字节流协议，通过序列号、ACK、丢失检测和重传保证可靠性，并通过流量控制避免接收方过载，通过拥塞控制限制对网络的压力。UDP 则提供更精简的无连接数据报服务，不负责 TCP 式的可靠、有序交付，也不会自动完成相同的重传和流量控制。TCP 更适合希望传输层直接提供可靠、有序数据流的场景；UDP 更适合需要低延迟、希望应用层自行控制可靠性和传输策略的场景。选择 TCP 还是 UDP，本质上不是简单比较谁更快，而是看业务需要哪一种传输语义。**

---

**Sources:**

- [RFC 9293: Transmission Control Protocol (TCP) | RFC Editor](https://www.rfc-editor.org/info/rfc9293/?utm_source=chatgpt.com)

## 第15题 TCP 三次握手的过程是什么？为什么不能只进行两次握手？

### 题目

TCP 三次握手的过程是什么？为什么不能只进行两次握手？

### 问题

1. TCP 为什么在正式传输数据之前需要建立连接？
2. 三次握手中客户端和服务器分别发送什么报文？
3. `SYN`、`ACK`、`seq`、`ack` 分别表示什么？
4. 三次握手完成以后，双方实际上确认了什么？
5. 为什么不能只进行两次握手？
6. 三次握手如何处理网络中滞留的历史 `SYN` 报文？
7. 三次握手过程中客户端和服务器的状态如何变化？

### 回答要点

核心要点如下：
#### 1. 三次握手的目的

- TCP 是面向连接的协议，通信之前需要让双方建立连接状态。
- 更核心的是让双方**同步彼此的初始序列号 ISN**。
- 三次握手还用于避免网络中旧的、重复的连接请求造成错误连接。RFC 9293 将防止旧的重复连接请求引起混淆列为三次握手的主要原因。([RFC 编辑器](https://www.rfc-editor.org/rfc/rfc9293.html?utm_source=chatgpt.com))
#### 2. 第一次握手

- 客户端发送 `SYN=1`。
- 假设客户端初始序列号为 `x`，则发送 `seq=x`。
- 客户端进入 `SYN-SENT` 状态。
#### 3. 第二次握手

- 服务器收到客户端 SYN 后返回 `SYN + ACK`。
- 服务器选择自己的初始序列号 `y`。
- `seq=y`，`ack=x+1`。
- `ack=x+1` 表示已经收到客户端的 SYN，并期待客户端下一序列号为 `x+1`。
- 服务器进入 `SYN-RECEIVED` 状态。([RFC 编辑器](https://www.rfc-editor.org/rfc/rfc9293.html?utm_source=chatgpt.com))
#### 4. 第三次握手

- 客户端收到服务器的 `SYN+ACK` 后发送 ACK。
- `seq=x+1`，`ack=y+1`。
- 客户端确认收到了服务器的 SYN 和初始序列号。
- 客户端进入 `ESTABLISHED`；服务器收到该 ACK 后也进入 `ESTABLISHED`。([RFC 编辑器](https://www.rfc-editor.org/rfc/rfc9293.html?utm_source=chatgpt.com))
#### 5. 为什么需要第三次

- 两次只能让服务器确认客户端的 SYN，但服务器还不知道自己的 SYN 和初始序列号是否真正被客户端接受。
- 第三次 ACK 完成了服务器初始序列号的确认。
- 更重要的是，它允许 TCP 判断第一次收到的 SYN 是否可能是历史连接留下的旧重复报文，降低错误建立连接的可能性。([RFC 编辑器](https://www.rfc-editor.org/info/rfc9293/?utm_source=chatgpt.com))
#### 6. 序列号机制

- `SYN` 会占用一个序列号，所以收到 `seq=x` 的 SYN 后确认号是 `x+1`。
- 单纯的 ACK 不占用序列号空间。([RFC 编辑器](https://www.rfc-editor.org/rfc/rfc9293.html?utm_source=chatgpt.com))

---

### 标准回答

TCP 是面向连接的可靠传输协议，在正式传输数据之前需要通过三次握手建立连接。

三次握手最核心的作用不是简单地“确认双方在线”，而是：

> **让客户端和服务器交换并确认彼此的初始序列号，同时降低旧的重复连接请求造成错误连接的可能性。**

TCP 的可靠传输依赖序列号，因此连接建立时，双方必须知道：

```text
客户端准备从哪个序列号开始发送 + 服务器准备从哪个序列号开始发送
```

RFC 9293 明确指出，建立 TCP 连接时双方必须同步彼此的初始序列号，每一方既要把自己的初始序列号告诉对方，也要得到对方对这个序列号的确认。([RFC 编辑器](https://www.rfc-editor.org/rfc/rfc9293.html?utm_source=chatgpt.com))
#### 1. 三次握手的具体过程

假设：

```text
客户端初始序列号：x
服务器初始序列号：y
```

第一次握手，客户端向服务器发送：

```text
Client                              Server

SYN=1
seq=x
  ───────────────────────────────→
```

`SYN` 的含义是 Synchronize，也就是：

> **我要建立连接，并告诉你我的初始序列号是 x。**

此时客户端：

```text
CLOSED
  ↓
SYN-SENT
```

---

服务器收到以后进行第二次握手：

```text
Client                              Server

        SYN=1, ACK=1
        seq=y
        ack=x+1
  ←───────────────────────────────
```

这里服务器同时完成两件事。

第一：

```text
ACK=1
ack=x+1
```

告诉客户端：

> **你的 SYN 和初始序列号 x 我收到了，我下一步期待收到 x+1。**

第二：

```text
SYN=1
seq=y
```

告诉客户端：

> **这是我的 SYN，我自己的初始序列号是 y。**

因此第二次握手本质上是：

```text
确认客户端 ISN + 发送服务器自己的 ISN
```

服务器此时进入：

```text
LISTEN
  ↓
SYN-RECEIVED
```

RFC 9293 中的基本三次握手正是：客户端 `SYN seq=100`，服务器返回 `SYN,ACK seq=300 ack=101`。([RFC 编辑器](https://www.rfc-editor.org/rfc/rfc9293.html?utm_source=chatgpt.com))

---

客户端收到以后进行第三次握手：

```text
Client                              Server

ACK=1
seq=x+1
ack=y+1
  ───────────────────────────────→
```

这个 ACK 的意思是：

> **服务器的 SYN 和初始序列号 y 我也已经收到，我下一步期待的是 y+1。**

客户端发送 ACK 后进入：

```text
ESTABLISHED
```

服务器收到这个 ACK 后也进入：

```text
ESTABLISHED
```

至此 TCP 连接建立完成。RFC 9293 的基本握手示例同样显示，第三个报文通过 `ACK=y+1` 完成对服务器 SYN 的确认。([RFC 编辑器](https://www.rfc-editor.org/rfc/rfc9293.html?utm_source=chatgpt.com))

因此整个过程可以记成：

```text
Client                                  Server

SYN
seq=x
─────────────────────────────────────→
             第一次握手

                 SYN + ACK
                 seq=y
                 ack=x+1
←─────────────────────────────────────
             第二次握手

ACK
seq=x+1
ack=y+1
─────────────────────────────────────→
             第三次握手

ESTABLISHED                         ESTABLISHED
```
#### 2. 为什么一定需要第三次，不能只有两次？

这是这道题真正的重点。

如果只有两次：

```text
Client                         Server

SYN seq=x
────────────────────────────→

        SYN+ACK seq=y ack=x+1
←────────────────────────────
```

此时服务器已经证明：

> **我收到了客户端的 SYN。**

客户端收到第二个报文以后也知道：

> **服务器收到了我的 SYN，而且我也收到了服务器的 SYN。**

但是服务器此时还不知道：

> **客户端到底有没有收到并接受服务器的 SYN 和初始序列号 y。**

因此还需要客户端发送：

```text
ACK y+1
```

完成对服务器初始序列号的确认。

从初始序列号同步角度看：

```text
第一次：
Client → Server
服务器知道 Client 的 ISN=x

第二次：
Server → Client
客户端知道 Server 已确认 x
客户端也知道 Server 的 ISN=y

第三次：
Client → Server
服务器知道 Client 已确认 y
```

于是双方的初始序列号才真正完成双向同步。RFC 9293 对这一要求的描述就是：每一端都必须发送自己的初始序列号、收到对方的初始序列号，并收到对自己初始序列号的确认。([RFC 编辑器](https://www.rfc-editor.org/info/rfc9293/?utm_source=chatgpt.com))

---

三次握手还有一个非常重要的作用：

> **避免历史失效的 SYN 报文导致错误建立连接。**

假设客户端很久以前发送过：

```text
SYN
seq=90
```

因为网络异常，这个 SYN 长时间滞留在网络中。

后来客户端重新发起了一个真正的新连接：

```text
SYN
seq=100
```

但是旧的：

```text
SYN seq=90
```

反而先到服务器。

服务器仅凭收到这个 SYN，并不知道：

> “这是一个新的连接请求，还是以前滞留在网络中的旧请求？”

RFC 9293 明确说明，接收到第一个 SYN 的一方并没有天然办法判断它是否是旧报文，因此需要让发送方进一步确认；这也是三次握手存在的重要原因。([RFC 编辑器](https://www.rfc-editor.org/rfc/rfc9293.html?utm_source=chatgpt.com))

可以理解成：

```text
旧连接留下：

SYN seq=90
    ...
    ... 网络中滞留很久
    ...
                     ↓
                   Server
```

服务器返回：

```text
SYN + ACK
ack=91
```

而当前客户端发现：

> **我现在根本没有发送 seq=90 的 SYN。**

因此不会按照一个正常的新连接继续完成第三次握手，而可以通过 TCP 的复位处理结束这个错误连接尝试。RFC 9293 专门给出了“旧重复 SYN”的恢复示例，并指出三次握手的主要原因就是防止这种旧连接请求造成混淆。([RFC 编辑器](https://www.rfc-editor.org/rfc/rfc9293.html?utm_source=chatgpt.com))

所以“为什么不能两次握手”比较准确的标准回答不是简单一句：

> “为了确认双方都有发送和接收能力。”

这种说法可以帮助理解，但不够准确。

更规范的回答应该是：

> **TCP 建立连接时需要同步双方的初始序列号。第一次 SYN 把客户端的 ISN 告诉服务器，第二次 SYN+ACK 确认客户端 ISN 并把服务器 ISN 告诉客户端，第三次 ACK 再确认服务器 ISN，从而完成双向序列号同步。同时，第三次确认能够降低网络中旧的、重复的 SYN 导致服务器错误建立连接的可能性，这也是 TCP 规范给出的三次握手的主要原因。**

最后可以把整个过程收敛成：

```text
第一次 SYN
→ Client 把自己的 ISN 告诉 Server

第二次 SYN + ACK
→ Server 确认 Client ISN
→ 同时把自己的 ISN 告诉 Client

第三次 ACK
→ Client 确认 Server ISN

最终：
双方 ISN 完成同步
+
过滤旧重复连接请求
+
TCP 进入 ESTABLISHED
```

这就是三次握手真正的核心逻辑。([RFC 编辑器](https://www.rfc-editor.org/rfc/rfc9293.html?utm_source=chatgpt.com))

---

**Sources:**

- [RFC 9293: Transmission Control Protocol (TCP)](https://www.rfc-editor.org/rfc/rfc9293.html?utm_source=chatgpt.com)

## 第16题 TCP 四次挥手的过程是什么？为什么通常需要四次而不是三次？

### 题目

TCP 四次挥手的过程是什么？为什么通常需要四次而不是三次？

### 问题

1. TCP 为什么需要通过挥手过程关闭连接？
2. 四次挥手中，主动关闭方和被动关闭方分别发送什么报文？
3. `FIN` 和 `ACK` 分别表示什么？
4. 为什么第二次 `ACK` 和第三次 `FIN` 通常不能像三次握手中的 `SYN+ACK` 一样合并？
5. `FIN-WAIT-1`、`FIN-WAIT-2`、`CLOSE-WAIT`、`LAST-ACK`、`TIME-WAIT` 分别表示什么？
6. 为什么主动关闭方发送最后一个 ACK 后不能立即进入 `CLOSED`？
7. `TIME-WAIT` 为什么需要持续一段时间？
8. 如果最后一个 ACK 丢失，会发生什么？

### 回答要点

核心要点如下：
#### 1. 四次挥手的目的

- TCP 是全双工通信，两个方向的数据传输需要分别关闭。
- 一方发送 `FIN`，只代表“我这一方向的数据已经发送完毕”，并不代表对方也已经发送完毕。
- 正常关闭需要保证双方剩余数据能够可靠传输完成。RFC 9293 明确允许 TCP 处于只关闭一个方向的 half-closed 状态。([RFC 编辑器](https://www.rfc-editor.org/rfc/rfc9293.html?utm_source=chatgpt.com))
#### 2. 四次挥手过程

- 第一次：主动关闭方发送 `FIN`，进入 `FIN-WAIT-1`。
- 第二次：被动关闭方收到 `FIN` 后立即返回 `ACK`，进入 `CLOSE-WAIT`；主动方收到 ACK 后进入 `FIN-WAIT-2`。
- 第三次：被动关闭方自己的数据也发送完成、应用决定关闭后，再发送 `FIN`，进入 `LAST-ACK`。
- 第四次：主动关闭方收到 `FIN` 后返回 `ACK`，进入 `TIME-WAIT`；被动关闭方收到 ACK 后进入 `CLOSED`。([RFC 编辑器](https://www.rfc-editor.org/rfc/rfc9293.html?utm_source=chatgpt.com))
#### 3. 为什么通常需要四次

- 收到对方 `FIN` 时，只能说明对方不再发送数据。
- 被动方可能仍然有数据要发送，所以必须先 ACK 对方的 FIN，但自己的 FIN 可以晚一些发送。
- 因此 ACK 和 FIN 通常分成两个报文。
- 如果被动方收到 FIN 时恰好也已经准备关闭，**ACK 和 FIN 可以放在同一个报文里，因此实际也可能出现“三个报文”的关闭过程**。
#### 4. TIME-WAIT

- 主动关闭方收到对方 FIN 并发送最后一个 ACK 后进入 `TIME-WAIT`。
- 作用一：如果最后一个 ACK 丢失，对方会重传 FIN，主动方还能再次发送 ACK。
- 作用二：让旧连接中可能滞留的报文逐渐从网络中消失，避免影响后续使用相同连接标识的新连接。
- RFC 9293 要求主动关闭的一端通常保持 `TIME-WAIT` 达 `2 × MSL`。([RFC 编辑器](https://www.rfc-editor.org/info/rfc9293/?utm_source=chatgpt.com))
#### 5. 最后 ACK 丢失

- 被动关闭方因为没有收到对自己 FIN 的确认，会重传 FIN。
- 主动关闭方仍在 `TIME-WAIT`，收到重传 FIN 后会再次发送 ACK，并重新启动 `2MSL` 定时器。([RFC 编辑器](https://www.rfc-editor.org/rfc/rfc9293.html?utm_source=chatgpt.com))

---

### 标准回答

TCP 是一个**全双工协议**，也就是说连接建立后：

```text
客户端 ───────→ 服务器
客户端 ←─────── 服务器
```

两个方向的数据传输是相对独立的。

因此关闭 TCP 连接不能简单理解成“一方说关闭，整个连接立即消失”，而是：

> **一个方向一个方向地关闭，确保双方剩余的数据都能够传输完成。**

这也是 TCP 正常关闭通常表现为四次挥手的根本原因。RFC 9293 明确指出，TCP 的两个方向可以独立关闭，因此存在 half-closed connection。([RFC 编辑器](https://www.rfc-editor.org/rfc/rfc9293.html?utm_source=chatgpt.com))
#### 1. 四次挥手的完整过程

假设客户端主动关闭连接，服务器被动关闭。

第一次挥手，客户端发现自己的数据已经全部发送完成，于是发送：

```text
FIN
```

告诉服务器：

> **“我已经没有数据需要继续发送给你了。”**

此时客户端：

```text
ESTABLISHED
     ↓
FIN-WAIT-1
```

需要注意：

> `FIN` 表示客户端这一方向不再发送数据，并不是说整个 TCP 连接已经立即彻底关闭。

服务器仍然可以继续给客户端发送数据。

---

服务器收到客户端的 `FIN` 后，进行第二次挥手，立即返回：

```text
ACK
```

表示：

> **“你的 FIN 我收到了。”**

此时：

```text
客户端                       服务器

FIN
────────────────────────→

                      ACK
←────────────────────────
```

状态发生变化：

```text
客户端：
FIN-WAIT-1
    ↓
FIN-WAIT-2

服务器：
ESTABLISHED
    ↓
CLOSE-WAIT
```

这里的 `CLOSE-WAIT` 很重要，它表示：

> **服务器已经知道对方不会继续发送数据了，但是服务器自己的发送方向还没有关闭，正在等待本地应用决定关闭。**

RFC 9293 对 `CLOSE-WAIT` 的定义就是等待本地用户发起关闭。([RFC 编辑器](https://www.rfc-editor.org/info/rfc9293/?utm_source=chatgpt.com))

---

服务器可能还有一些数据没有发送完成：

```text
客户端                     服务器

     ←──── 剩余数据 ──────
     ←──── 剩余数据 ──────
```

等服务器把自己的数据发送完，而且服务器应用程序也调用关闭操作后，服务器才进行第三次挥手：

```text
FIN
```

告诉客户端：

> **“我的数据也发送完了，我这一方向也准备关闭。”**

服务器进入：

```text
CLOSE-WAIT
    ↓
LAST-ACK
```

客户端此时仍然处于 `FIN-WAIT-2`，等待的就是服务器自己的 FIN。RFC 9293 将 `FIN-WAIT-2` 定义为等待远端发送连接终止请求。([RFC 编辑器](https://www.rfc-editor.org/info/rfc9293/?utm_source=chatgpt.com))

---

客户端收到服务器 FIN 后，进行第四次挥手：

```text
ACK
```

完整过程就变成：

```text
Client                                  Server

FIN
─────────────────────────────────────→
FIN-WAIT-1

                    ACK
←─────────────────────────────────────
FIN-WAIT-2                          CLOSE-WAIT

FIN
←─────────────────────────────────────
                                     LAST-ACK

ACK
─────────────────────────────────────→
TIME-WAIT                            CLOSED

      等待 2MSL
          ↓
        CLOSED
```

服务器收到最后一个 ACK 后，可以进入 `CLOSED`。

但是客户端不能立即关闭，而是进入：

```text
TIME-WAIT
```

RFC 9293 给出的正常关闭流程就是这一状态转换。([RFC 编辑器](https://www.rfc-editor.org/rfc/rfc9293.html?utm_source=chatgpt.com))

---
#### 2. 为什么通常是四次，而三次握手只有三次？

核心原因不是：

> “建立连接比较简单，关闭连接比较复杂。”

真正原因是：

> **TCP 是全双工的，两个发送方向需要分别关闭。**

三次握手时，服务器收到客户端 SYN 后，可以把：

```text
确认客户端 SYN + 发送自己的 SYN
```

直接合并成：

```text
SYN + ACK
```

所以三次就够了。

但是关闭时不一样。

服务器收到：

```text
Client FIN
```

只能说明：

> **客户端没有数据发送了。**

并不能推出：

> **服务器也没有数据要发送了。**

所以服务器首先必须快速回复：

```text
ACK
```

确认客户端 FIN。

但是服务器自己的：

```text
FIN
```

必须等自己的剩余数据发送完成、本地应用也决定关闭以后才能发送。

所以通常是：

```text
收到 FIN
   ↓
马上 ACK
   ↓
继续发送自己的剩余数据
   ↓
自己的数据也结束
   ↓
再发送 FIN
```

因此：

```text
ACK
和
FIN
```

通常分开，最终形成四个报文。

不过这里有一个面试中很容易说错的地方：

> **TCP 并不是绝对必须产生四个独立报文。**

如果服务器收到客户端 FIN 的时候：

```text
自己的数据也已经发送完 + 自己的应用也准备关闭
```

那么服务器完全可能把：

```text
ACK + FIN
```

放进同一个 TCP Segment。

于是实际就可能变成：

```text
Client                      Server

FIN
────────────────────────→

                  FIN + ACK
←────────────────────────

ACK
────────────────────────→
```

也就是三个报文。

因此更准确的说法是：

> **TCP 正常关闭通常称为“四次挥手”，因为 ACK 和 FIN 往往需要分开发送；但协议并不要求它们一定是四个独立报文，如果被动关闭方已经准备好关闭，ACK 和 FIN 可以合并。**

---
#### 3. 为什么最后一定要有 TIME-WAIT？

这是四次挥手真正重要的面试点。

客户端发送第四次 ACK 后：

```text
Client                      Server

ACK
────────────────────────→
```

为什么客户端不能马上：

```text
CLOSED
```

而必须先：

```text
TIME-WAIT
```

主要有两个原因。

第一，**保证服务器有机会收到最后的 ACK**。

假设最后这个 ACK 在网络中丢失：

```text
Client                      Server

ACK
────────── X
          丢失
```

服务器一直没有收到 ACK，因此还停留在：

```text
LAST-ACK
```

服务器会认为：

> **“我的 FIN 可能没有到达对方。”**

于是重新发送：

```text
FIN
```

如果客户端已经彻底关闭连接，就无法正常处理这个 FIN。

但如果客户端仍然处于：

```text
TIME-WAIT
```

那么它收到重传 FIN 后可以再次回复：

```text
ACK
```

RFC 9293 明确规定，`TIME-WAIT` 状态收到远端 FIN 的重传后，应重新发送 ACK，并重新启动 `2MSL` 定时器。([RFC 编辑器](https://www.rfc-editor.org/rfc/rfc9293.html?utm_source=chatgpt.com))

所以第一层作用是：

> **保证最后一次关闭确认具有可靠重传的机会。**

---

第二，**让旧连接中的历史报文有时间从网络中消失。**

TCP 连接通常由源 IP、源端口、目标 IP、目标端口等信息标识。

假设旧连接刚关闭：

```text
Connection A
```

网络里还有一个旧报文：

```text
Old Segment
```

因为网络延迟，它一直没有消失。

这时如果立即用相同端点组合建立：

```text
Connection B
```

旧连接中的延迟报文理论上可能对新连接造成干扰。

所以 TCP 让主动关闭方保持：

```text
TIME-WAIT
```

一段时间，让旧连接中可能存在的报文逐渐失效。

RFC 9293 对 `TIME-WAIT` 的描述就包含两个目标：

> 确保远端收到连接终止确认，并避免前一个连接的延迟报文影响新的连接。([RFC 编辑器](https://www.rfc-editor.org/info/rfc9293/?utm_source=chatgpt.com))

---
#### 4. 为什么是 2MSL？

`MSL` 是：

```text
Maximum Segment Lifetime
```

也就是：

> **一个 TCP Segment 被认为可能在网络中存活的最大时间。**

RFC 9293 规定，主动关闭 TCP 连接后通常需要保持：

```text
2 × MSL
```

的 `TIME-WAIT`。([RFC 编辑器](https://www.rfc-editor.org/info/rfc9293/?utm_source=chatgpt.com))

从面试理解上可以把它看成覆盖一次可能的“最后 FIN → ACK”往返以及让旧报文充分过期的等待窗口：

```text
服务器重传 FIN
        ↓
最多在网络存在一个 MSL
        ↓
客户端收到并重新发送 ACK
        ↓
ACK 也可能在网络存在一个 MSL
        ↓
总等待窗口按 2MSL 处理
```

更重要的是记住它的**目的**，而不是死记数字：

```text
TIME-WAIT
    ↓
保证最后 ACK 有重发机会
    +
让旧连接延迟报文失效
```

---

最终，这道题可以收敛成：

> **TCP 是全双工协议，所以两个方向需要分别关闭。主动关闭方首先发送 FIN，进入 FIN-WAIT-1；被动关闭方收到后立即返回 ACK 并进入 CLOSE-WAIT，主动方收到 ACK 后进入 FIN-WAIT-2。被动方可以继续发送剩余数据，等本地应用也决定关闭以后，再发送自己的 FIN 并进入 LAST-ACK；主动方收到 FIN 后返回最后一个 ACK，并进入 TIME-WAIT，被动方收到 ACK 后进入 CLOSED。之所以通常需要四次，是因为收到 FIN 后必须先确认，但被动方自己的发送方向可能还没有关闭，所以 ACK 和 FIN通常需要分开发送；如果被动方已经准备好关闭，两者也可以合并。主动关闭方最后进入 TIME-WAIT，主要是为了在最后 ACK 丢失时还能响应对方重传的 FIN，同时让旧连接中的延迟报文充分失效，之后才真正进入 CLOSED。** ([RFC 编辑器](https://www.rfc-editor.org/rfc/rfc9293.html?utm_source=chatgpt.com))

---

**Sources:**

- [RFC 9293: Transmission Control Protocol (TCP)](https://www.rfc-editor.org/rfc/rfc9293.html?utm_source=chatgpt.com)

## 第17题 TCP 的拥塞控制是怎么做的？慢启动、拥塞避免、快速重传和快速恢复分别是什么？

### 题目

TCP 的拥塞控制是怎么做的？慢启动、拥塞避免、快速重传和快速恢复分别是什么？

### 问题

1. TCP 为什么需要拥塞控制？它和流量控制有什么区别？
2. 什么是拥塞窗口 `cwnd`？它和接收窗口 `rwnd` 有什么关系？
3. 什么是慢启动？`cwnd` 是如何增长的？
4. 什么是慢启动阈值 `ssthresh`？什么时候进入拥塞避免？
5. 拥塞避免阶段 `cwnd` 如何增长？
6. TCP 如何通过超时和重复 ACK 判断可能发生了丢包？
7. 什么是快速重传？为什么可以不等待超时？
8. 什么是快速恢复？
9. 超时重传和三个重复 ACK 出现后，对 `cwnd` 的处理为什么不同？
10. TCP 整个拥塞控制过程应该如何串起来理解？

### 回答要点

核心要点如下：
#### 1. 拥塞控制的目标

- 拥塞控制解决的是“**网络能不能承受当前发送速度**”的问题。
- 流量控制解决的是“**接收方能不能接得住**”的问题。
- `cwnd` 是发送端根据网络拥塞情况维护的拥塞窗口；`rwnd` 是接收方通告的接收窗口。
- 实际能够保持在途的数据量同时受到两者限制，可以理解为受 `min(cwnd, rwnd)` 约束。([RFC 编辑器](https://www.rfc-editor.org/info/rfc5681/?utm_source=chatgpt.com))
#### 2. 慢启动

- TCP 刚开始并不知道网络能够承受多大的发送量，所以从较小的 `cwnd` 开始探测。
- 每收到对新数据的 ACK，就增加 `cwnd`。
- 因此一个 RTT 内收到一轮 ACK 后，`cwnd` 通常呈现近似翻倍的增长，即近似指数增长。
- 当 `cwnd` 达到 `ssthresh` 后，转入拥塞避免。([RFC 编辑器](https://www.rfc-editor.org/info/rfc5681/?utm_source=chatgpt.com))
#### 3. 拥塞避免

- 网络容量已经探测到一定程度后，不再继续高速扩大窗口。
- `cwnd` 改为近似线性增长，经典算法中约每个 RTT 增加一个 SMSS。
- 核心思想是从“快速探测”转变为“谨慎增加”。([RFC 编辑器](https://www.rfc-editor.org/rfc/rfc5681.html?utm_source=chatgpt.com))
#### 4. 拥塞判断

- 经典 TCP 主要把丢包视为拥塞信号，同时也可以通过 ECN 显式获取拥塞信号。
- **重传超时 RTO**：通常认为情况比较严重。
- **三个重复 ACK**：说明后面的报文仍然能够到达，只是中间某个报文很可能丢失，因此网络通常没有完全失去传输能力。([RFC 编辑器](https://www.rfc-editor.org/info/rfc5681/?utm_source=chatgpt.com))
#### 5. 快速重传与快速恢复

- 收到三个重复 ACK 后，不等待 RTO 超时，立即重传推测丢失的报文，这就是快速重传。
- 同时降低 `ssthresh` 和 `cwnd`，但不会像超时那样完全回到最保守状态，而进入快速恢复。
- 丢失数据恢复后，进入拥塞避免继续发送。([RFC 编辑器](https://www.rfc-editor.org/rfc/rfc5681.html?utm_source=chatgpt.com))
#### 6. 完整过程

- `慢启动 → 达到 ssthresh → 拥塞避免`
- 如果发生超时：大幅降低发送速率，再重新慢启动。
- 如果收到三个重复 ACK：快速重传 → 快速恢复 → 拥塞避免。

---

### 标准回答

TCP 拥塞控制的目的，是防止发送方一次向网络中注入过多数据，超过中间链路、路由器等网络资源能够承受的能力，从而导致大量丢包，甚至出现拥塞崩溃。

这里首先要区分**拥塞控制和流量控制**。

流量控制关注的是：

> **接收方能不能接得住。**

接收方通过 `rwnd`，也就是接收窗口，告诉发送方自己的接收能力。

而拥塞控制关注的是：

> **整个网络能不能承受当前发送速度。**

发送端维护一个：

```text
cwnd
Congestion Window
```

表示根据当前网络状况，自己允许有多少数据处于未确认状态。

所以发送量同时受到两个窗口约束：

```text
rwnd
→ 接收方允许我发多少

cwnd
→ 网络状况允许我发多少

实际发送
→ 同时受到二者限制
```

经典 TCP 中可以理解为：

```text
发送窗口 ≈ min(rwnd, cwnd)
```

RFC 5681 正是用 `cwnd` 和 `rwnd` 分别作为网络拥塞和接收能力的限制。([RFC 编辑器](https://www.rfc-editor.org/info/rfc5681/?utm_source=chatgpt.com))
#### 1. 慢启动和拥塞避免

TCP 刚建立连接以后，并不知道当前网络到底能够承受多大的发送量。

如果一开始就发送大量数据：

```text
大量数据
   ↓
突然进入网络
   ↓
路由器队列塞满
   ↓
大量丢包
```

所以 TCP 需要先**探测网络容量**，这就是慢启动。

它从一个相对较小的 `cwnd` 开始发送数据，然后根据 ACK 不断扩大窗口。

可以用一个简化例子理解：

```text
第 1 个 RTT：cwnd = 1

第 2 个 RTT：cwnd ≈ 2

第 3 个 RTT：cwnd ≈ 4

第 4 个 RTT：cwnd ≈ 8
```

因为每个被确认的数据都会推动窗口增长，所以在理想情况下：

> **慢启动阶段的 cwnd 大约每经过一个 RTT 翻倍。**

因此“慢启动”这个名字其实容易产生误解。

它的“慢”不是指：

> `cwnd` 增长得很慢。

而是指：

> **TCP 不会一开始就直接把窗口设置得很大，而是从较小窗口逐步探测网络。**

实际上它增长得非常快，近似指数增长。RFC 5681 对慢启动的定义就是通过 ACK 驱动 `cwnd` 增长，以探测未知网络容量。([RFC 编辑器](https://www.rfc-editor.org/info/rfc5681/?utm_source=chatgpt.com))

但是不能一直这样翻倍，否则：

```text
1 → 2 → 4 → 8 → 16 → 32 → 64……
```

很快就可能把网络打满。

因此 TCP 还有一个变量：

```text
ssthresh
Slow Start Threshold
慢启动阈值
```

它决定应该使用慢启动还是拥塞避免。

可以简单记成：

```text
cwnd < ssthresh
→ 慢启动
→ 快速增长

cwnd 达到 ssthresh 附近
→ 转向拥塞避免
```

进入**拥塞避免**以后，TCP 会变得更加保守。

不再：

```text
每 RTT 近似翻倍
```

而是经典情况下：

```text
每个 RTT
cwnd 大约增加 1 个 SMSS
```

于是增长趋势从：

```text
慢启动：

1 → 2 → 4 → 8 → 16
```

变成：

```text
拥塞避免：

16 → 17 → 18 → 19 → 20……
```

这里可以把两个阶段理解成：

> **慢启动负责快速找到网络大概能承受多少数据；拥塞避免则在接近网络容量以后，小心地继续向上试探。**

RFC 5681 把这两个算法作为控制进入网络的在途数据量的核心机制。([RFC 编辑器](https://www.rfc-editor.org/info/rfc5681/?utm_source=chatgpt.com))
#### 2. 网络出现丢包以后怎么办？

经典 TCP 拥塞控制通常把**丢包**看作网络可能发生拥塞的重要信号。

主要存在两种典型情况：

```text
情况一：重传定时器超时 RTO

情况二：收到 3 个重复 ACK
```

这两个信号虽然都可能意味着有数据丢失，但严重程度不同。
##### 第一种：RTO 超时

假设发送：

```text
1  2  3  4
```

但长时间没有获得期望的确认，最终：

```text
RTO timeout
```

这意味着：

> **网络可能已经发生了比较严重的拥塞。**

经典 RFC 5681 的处理思路是：

1. 把 `ssthresh` 降低到当前在途数据量的大约一半，但至少保留规定的下限；
2. 把 `cwnd` 大幅降低；
3. 重新通过慢启动探测网络。([RFC 编辑器](https://www.rfc-editor.org/rfc/rfc5681.html?utm_source=chatgpt.com))

可以理解成：

```text
原来：

cwnd = 16

发生严重拥塞 / RTO
        ↓
ssthresh ≈ 原在途数据的一半
        ↓
cwnd 大幅下降
        ↓
重新慢启动
```

核心思想就是：

> **既然连 ACK 都长时间收不到，就认为网络情况比较差，发送速度必须明显降低。**

---

第二种情况是收到**三个重复 ACK**。

假设发送：

```text
1  2  3  4  5
```

其中：

```text
2
```

丢了。

接收方可能收到：

```text
1
3
4
5
```

因为 2 没收到，所以即使 3、4、5 到了，接收方仍然会不断告诉发送方：

> **“我下一步还在等 2。”**

于是发送方可能看到：

```text
ACK 2、ACK 2、ACK 2、ACK 2
```

也就是多个重复 ACK。

这里和超时有一个重要区别：

> **虽然有一个报文丢了，但后面的报文仍然不断到达接收方。**

这说明网络：

```text
不是完全传不动了
```

而更可能是：

```text
某个 Segment 丢失了
```

因此没必要等到 RTO 才行动。

当收到 **3 个重复 ACK** 后，经典 TCP 会直接推测：

> **某个数据段很可能已经丢失。**

马上重传它。

这就是：

> **Fast Retransmit--快速重传。** ([RFC 编辑器](https://www.rfc-editor.org/rfc/rfc5681.html?utm_source=chatgpt.com))

流程可以理解为：

```text
发送 Segment 1
发送 Segment 2   ← 丢失
发送 Segment 3
发送 Segment 4
发送 Segment 5
       ↓
接收方不断返回重复 ACK
       ↓
发送方收到 3 个重复 ACK
       ↓
不用等 RTO
       ↓
立即重传 Segment 2
```

快速重传的意义就是：

> **通过重复 ACK 提前发现可能的丢包，从而减少等待超时带来的延迟。**
#### 3. 快速恢复为什么不像超时那样重新从头慢启动？

这是整个拥塞控制最关键的逻辑之一。

三个重复 ACK 的出现其实还透露了一个重要信息：

> **后续的数据仍然能够穿过网络并到达接收方。**

因为如果后面的数据根本没有到达：

```text
3、4、5 都没到
```

接收方也不会连续产生这些重复 ACK。

所以三个重复 ACK 说明：

```text
网络发生了一定拥塞
但网络仍然具有传输能力
```

因此 TCP 不需要像 RTO 一样：

```text
把速度降到非常低
↓
重新慢启动
```

而是降低窗口以后进入：

> **Fast Recovery--快速恢复。**

经典 RFC 5681 的基本思想是：

```text
3 个重复 ACK
      ↓
认为出现丢包
      ↓
降低 ssthresh
      ↓
快速重传丢失 Segment
      ↓
进入快速恢复
      ↓
丢失数据得到确认
      ↓
cwnd 回到降低后的水平
      ↓
进入拥塞避免
```

也就是说：

> **快速恢复不会完全放弃之前已经探测到的网络容量，而是在降低发送速率以后继续工作。** ([RFC 编辑器](https://www.rfc-editor.org/rfc/rfc5681.html?utm_source=chatgpt.com))

因此必须区分两种情况：

```text
RTO 超时
→ 拥塞可能较严重
→ 大幅降低 cwnd
→ 重新慢启动

3 个重复 ACK
→ 局部丢包，但网络仍在传输
→ 快速重传
→ 快速恢复
→ 拥塞避免
```

这就是为什么两种丢包信号的处理方式不一样。

---

把整个经典 TCP 拥塞控制串起来，就是：

```text
TCP 开始发送
     ↓
慢启动
cwnd 快速增长
     ↓
达到 ssthresh
     ↓
拥塞避免
cwnd 线性增长
     ↓
网络发生丢包
     ↓
┌─────────────────────┐
│                     │
RTO 超时            3 个重复 ACK
│                     │
↓                     ↓
认为拥塞较严重        网络仍有传输能力
│                     │
降低 ssthresh         降低 ssthresh
大幅降低 cwnd         快速重传
│                     │
重新慢启动            快速恢复
                      ↓
                   拥塞避免
```

这里还有一点需要注意：经典 RFC 5681 主要以**丢包**作为拥塞信号，但 TCP 也可以通过 **ECN（Explicit Congestion Notification）** 获得显式拥塞通知，所以不能把“丢包”理解为现代 TCP 唯一可能的拥塞信号。([RFC 编辑器](https://www.rfc-editor.org/info/rfc5681/?utm_source=chatgpt.com))

最终面试中可以收敛成：

> **TCP 拥塞控制主要通过拥塞窗口 `cwnd` 控制发送方能够向网络中注入多少未确认数据。刚开始网络容量未知，因此使用慢启动，从较小窗口开始，通过 ACK 使 cwnd 近似指数增长；达到慢启动阈值 `ssthresh` 后进入拥塞避免，cwnd 改为近似线性增长。如果发生 RTO 超时，TCP 认为拥塞比较严重，会降低 `ssthresh`、大幅降低 `cwnd` 并重新慢启动；如果收到三个重复 ACK，则说明某个报文很可能丢失，但后续数据仍能通过网络，因此立即进行快速重传，并进入快速恢复，之后继续拥塞避免。流量控制解决的是接收方能不能接住，而拥塞控制解决的是网络能不能承受，实际发送量同时受到 `rwnd` 和 `cwnd` 的约束。** ([RFC 编辑器](https://www.rfc-editor.org/info/rfc5681/?utm_source=chatgpt.com))

---

**Sources:**

- [RFC 5681: TCP Congestion Control | RFC Editor](https://www.rfc-editor.org/info/rfc5681/?utm_source=chatgpt.com)

## 第18题 TCP 的流量控制是怎么实现的？滑动窗口起什么作用？

### 题目

TCP 的流量控制是怎么实现的？滑动窗口起什么作用？

### 问题

1. TCP 为什么需要流量控制？
2. TCP 的流量控制和拥塞控制有什么区别？
3. 什么是滑动窗口？
4. 接收方的接收能力为什么会影响发送方的发送量？
5. ACK、序列号和滑动窗口是怎样配合工作的？
6. TCP 实际发送数据时，为什么既要考虑接收方的窗口，也要考虑拥塞窗口？

### 回答要点

核心要点如下：
#### 1. 流量控制的目标

- TCP 的发送方和接收方处理数据的速度可能不同。
- 如果发送方持续以过快速度发送数据，接收方可能来不及处理。
- 因此 TCP 通过流量控制限制发送速度，避免接收方处理不过来。`基于Chrome浏览器渲染原理.md`
#### 2. 滑动窗口

- TCP 通过滑动窗口控制发送方能够连续发送的数据范围。
- 发送方不需要每发送一个数据段就停下来等待 ACK，而可以在窗口允许范围内连续发送多个数据。
- 当部分数据得到确认以后，窗口向后移动，从而允许发送新的数据。
#### 3. ACK 与序列号

- TCP 是面向字节流的可靠传输协议。
- 序列号用于标识数据在字节流中的位置。
- ACK 用于确认已经成功接收的数据。
- 随着 ACK 返回，已经确认的数据移出发送窗口，窗口继续向前滑动。资料将确认、重传和滑动窗口分别作为 TCP 可靠传输与流量控制的重要机制。`基于Chrome浏览器渲染原理.md`
#### 4. 流量控制和拥塞控制

- 流量控制解决的是：**接收方能不能处理这么多数据。**
- 拥塞控制解决的是：**中间网络能不能承受这么多数据。**
- 两者虽然都会限制发送量，但控制目标不同。`基于Chrome浏览器渲染原理.md`
#### 5. 发送量的限制

- 发送方不能只根据接收方能力发送，还要考虑网络拥塞情况。
- 因此实际发送过程同时受到接收侧窗口和拥塞窗口的约束。你的材料将这一关系列为 TCP 流量控制的核心考点，但没有进一步展开具体计算公式。`基于Chrome浏览器渲染原理.md`

---

### 标准回答

TCP 的流量控制主要解决的是：

> **发送方发送得太快，而接收方来不及处理的问题。**

TCP 是可靠的字节流协议，发送方可能具有很强的数据发送能力，但接收方的数据处理速度和缓冲能力是有限的。如果发送方完全不考虑接收方状态，持续发送大量数据，就可能导致接收方无法及时处理。

因此 TCP 使用**滑动窗口机制**进行流量控制。`基于Chrome浏览器渲染原理.md`

可以先把整个过程简单理解成：

```text
发送方                        接收方

数据 1 ───────────────────→
数据 2 ───────────────────→
数据 3 ───────────────────→
数据 4 ───────────────────→

       ←────────── ACK

窗口向前移动
      ↓
继续发送新的数据
```

滑动窗口的意义在于，TCP 不需要：

```text
发送一个数据
    ↓
等待 ACK
    ↓
再发送下一个
```

而是可以在当前窗口允许的范围内，连续发送一批尚未确认的数据。

例如可以把一个发送窗口抽象成：

```text
已经确认        已发送未确认        当前还能发送
────────┬────────────────┬────────────
        │                │
        └──── 当前窗口 ────┘
```

当接收方确认前面的一部分数据以后：

```text
ACK 返回
   ↓
前面的数据得到确认
   ↓
窗口向右移动
   ↓
发送方可以继续发送后面的新数据
```

这就是所谓的：

> **滑动窗口。**

TCP 的序列号、ACK 和滑动窗口是配合工作的。

TCP 是面向字节流的协议，因此数据具有对应的序列位置。发送方通过序列号标识数据，接收方收到以后通过 ACK 告诉发送方已经成功收到哪些数据。TCP 本身还通过确认和重传机制保证可靠传输。`基于Chrome浏览器渲染原理.md`

因此可以理解为：

```text
序列号
→ 标识发送的是哪一部分数据

ACK
→ 告诉发送方哪些数据已经收到

滑动窗口
→ 根据确认结果不断向前移动，
   控制还有多少数据可以继续发送
```

这样既避免了“一次只能发送一个数据然后等待”的低效率，也避免发送方完全无限制地发送数据。

这里还需要把**流量控制和拥塞控制**区分开。

流量控制关注的是：

> **接收方能不能接得住。**

而拥塞控制关注的是：

> **整个网络能不能承受当前的数据发送量。**

可以直接记成：

```text
流量控制
→ 控制发送方不要压垮接收方

拥塞控制
→ 控制发送方不要压垮网络
```

你的材料也明确把两者区分为：滑动窗口用于避免接收方处理不过来，而慢启动、拥塞避免、快速重传等机制用于避免网络拥堵。`基于Chrome浏览器渲染原理.md`

因此实际 TCP 发送数据时，不能只看接收方还能接收多少数据，还需要同时考虑当前网络的拥塞情况。材料也将“根据返回窗口和拥塞窗口计算”列为了流量控制的面试考点。`基于Chrome浏览器渲染原理.md`

整个逻辑可以收敛成：

```text
发送方准备发送数据
        ↓
根据接收方能力限制发送量
        ↓
在窗口允许范围内连续发送数据
        ↓
接收方收到数据并返回 ACK
        ↓
前面数据得到确认
        ↓
滑动窗口向前移动
        ↓
允许发送新的数据
        ↓
持续进行可靠数据传输
```

最终可以概括为：

> **TCP 的流量控制主要解决发送方速度超过接收方处理能力的问题。TCP 使用滑动窗口控制能够连续发送的数据范围，发送方可以在窗口允许范围内发送多个尚未确认的数据；接收方返回 ACK 后，已确认的数据退出窗口，窗口继续向前滑动，从而允许发送新的数据。序列号负责标识数据位置，ACK 负责确认数据，滑动窗口负责控制发送范围。流量控制关注接收方的处理能力，而拥塞控制关注网络的承载能力，因此 TCP 实际发送数据时需要同时受到接收侧窗口和拥塞窗口的限制。**

补充说明：当前材料没有展开 `rwnd=0` 后的具体零窗口探测机制，因此这一点不适合在本题标准回答中继续扩展。

## 第19题 HTTP 请求报文和响应报文分别由哪些部分组成？

### 题目

HTTP 请求报文和响应报文分别由哪些部分组成？

### 问题

1. HTTP 在整个网络通信过程中主要负责什么？
2. HTTP 请求报文由哪些部分组成？
3. 请求行中的请求方法、Request-URI、HTTP 版本分别表示什么？
4. 请求头有什么作用？
5. 请求体什么时候存在？
6. HTTP 响应报文由哪些部分组成？
7. 响应行中的 HTTP 版本、状态码和状态描述分别是什么？
8. `1xx`～`5xx` 五类状态码分别表示什么？
9. 从浏览器发出请求到服务器返回 HTML、JSON 等数据，完整的请求-响应过程是什么？

### 回答要点

核心要点如下：
#### 1. HTTP 的作用

- HTTP 是应用层协议。
- 它定义客户端和服务器交换请求、响应报文的格式和方式。
- 浏览器构造 HTTP 请求后，通过下面的传输层将数据发送到服务器。`基于Chrome浏览器渲染原理.md`
#### 2. HTTP 请求报文

- 请求行 `Request Line`
- 请求头 `Request Headers`
- 空行
- 可选请求体 `Request Body`
- 请求行格式为：
  ```text
  请求方法 Request-URI HTTP版本
  ```
  例如：
  ```http
  GET /index.html HTTP/1.1
  ```
`基于Chrome浏览器渲染原理.md`
#### 3. 请求行

- Method：希望服务器执行什么操作，如 GET、POST、PUT、DELETE。
- Request-URI：访问哪个资源，例如 `/index.html`。
- HTTP Version：使用哪个 HTTP 协议版本。
#### 4. 请求头

- 使用键值对携带请求的附加信息。
- 例如材料中的 HTTP 请求：
  ```http
  GET / HTTP/1.1
  Host: www.baidu.com
  User-Agent: ...
  Accept: ...
  ```
`基于Chrome浏览器渲染原理.md`
#### 5. 请求体

- 用于携带客户端提交给服务器的实体数据。
- 材料主要以 POST、PUT 为例。
- 可以承载表单、JSON 等数据。`基于Chrome浏览器渲染原理.md`
#### 6. HTTP 响应报文

- 响应行 `Response Line`
- 响应头 `Response Headers`
- 空行
- 响应体 `Response Body`
- 响应行格式：
  ```text
  HTTP版本 状态码 状态描述
  ```
`基于Chrome浏览器渲染原理.md`
#### 7. 状态码

- `1xx`：信息性状态
- `2xx`：成功
- `3xx`：重定向
- `4xx`：客户端错误
- `5xx`：服务器错误
`基于Chrome浏览器渲染原理.md`
#### 8. 响应头和响应体

- 响应头描述服务器以及响应体相关信息。
- 常见字段包括 `Content-Type`、`Content-Length`、`Set-Cookie`、`Cache-Control` 等。
- 响应体是真正返回给浏览器的 HTML、JSON、图片等资源。`基于Chrome浏览器渲染原理.md`

---

### 标准回答

HTTP 是应用层协议，它定义了客户端和服务器之间进行请求和响应时所使用的报文格式。

整个 HTTP 通信可以先理解成：

```text
浏览器
   ↓
构造 HTTP 请求报文
   ↓
发送给服务器
   ↓
服务器解析请求并进行处理
   ↓
构造 HTTP 响应报文
   ↓
返回浏览器
```

材料中的浏览器访问过程就是：浏览器构造请求，通过 TCP 发送到服务器；服务器根据 URL 匹配资源或调用后端程序，最终生成 HTML、JSON、图片等 HTTP 响应。`基于Chrome浏览器渲染原理.md`
#### 1. HTTP 请求报文

HTTP 请求报文可以按下面的结构理解：

```text
请求行、请求头、空行、请求体（可选）
```

例如：

```http
GET /index.html HTTP/1.1
Host: www.example.com
User-Agent: ...
Accept: ...
```

其中第一行：

```http
GET /index.html HTTP/1.1
```

就是**请求行**。

请求行由：

```text
请求方法 + Request-URI + HTTP版本
```

组成。`基于Chrome浏览器渲染原理.md`

例如：

```http
GET /index.html HTTP/1.1
```

可以拆成：

```text
GET
↓
请求方法

/index.html
↓
请求的资源地址

HTTP/1.1
↓
使用的 HTTP 协议版本
```

请求方法表示客户端希望服务器进行什么操作。材料中列出的常见方法包括：

```text
GET、POST、PUT、DELETE、HEAD、OPTIONS、PATCH
```

例如：

```text
GET
→ 请求资源

POST
→ 提交数据

PUT
→ 更新资源

DELETE
→ 删除资源
```

`基于Chrome浏览器渲染原理.md`

请求行后面是**请求头**。

请求头用于携带这次 HTTP 请求的附加信息。

材料给出的示例是：

```http
GET / HTTP/1.1
Host: www.baidu.com
User-Agent: ...
Accept: ...
```

其中：

```text
Host
→ 指定请求对应的主机

User-Agent
→ 携带客户端相关信息

Accept
→ 描述客户端希望接收的内容
```

材料还特别提到，`Host` 字段可以用来指定服务器域名，从而区分同一个物理服务器上的不同虚拟主机。`基于Chrome浏览器渲染原理.md` `基于Chrome浏览器渲染原理.md`

请求头后面通过一个**空行**和请求体分隔。

请求体 `Request Body` 用于携带客户端真正提交给服务器的数据。

例如：

```text
表单数据
JSON
```

材料主要以 POST、PUT 等请求为例说明请求体的使用。`基于Chrome浏览器渲染原理.md`

所以请求报文可以收敛为：

```text
HTTP Request

请求行
↓
我要做什么、访问什么资源、使用什么 HTTP 版本

请求头
↓
描述这次请求的附加信息

空行
↓
分隔 Header 和 Body

请求体
↓
真正提交的数据，可选
```
#### 2. HTTP 响应报文

服务器处理完请求以后，会构造 HTTP 响应。

响应报文对应的结构是：

```text
响应行、响应头、空行、响应体
```

`基于Chrome浏览器渲染原理.md`

例如材料给出了这样的响应：

```http
HTTP/1.1 200 OK
Content-Type: text/html
Content-Length: 1024

<html>...</html>
```

`基于Chrome浏览器渲染原理.md`

第一行：

```http
HTTP/1.1 200 OK
```

就是**响应行**。

其结构为：

```text
HTTP版本 + 状态码 + 状态描述
```

例如：

```text
HTTP/1.1
→ 协议版本

200
→ 状态码

OK
→ 状态描述
```

`基于Chrome浏览器渲染原理.md`

状态码用于告诉客户端：

> **服务器对这次请求的处理结果是什么。**

材料将状态码分成五类：

```text
1xx
→ 信息性状态

2xx
→ 请求成功

3xx
→ 重定向

4xx
→ 客户端错误

5xx
→ 服务器错误
```

例如：

```text
200 OK
→ 请求成功

301 Moved Permanently
→ 永久重定向

302 Found
→ 临时重定向

304 Not Modified
→ 资源没有修改，可以使用缓存

404 Not Found
→ 请求资源不存在

500 Internal Server Error
→ 服务器内部错误
```

`基于Chrome浏览器渲染原理.md`

响应行之后是**响应头**。

材料列出的常见响应头包括：

```text
Content-Type
→ 响应体的数据类型

Content-Length
→ 响应体长度

Server
→ 服务器软件信息

Set-Cookie
→ 设置 Cookie

Cache-Control
→ 缓存策略

Date
→ 响应时间

Connection
→ 连接状态
```

`基于Chrome浏览器渲染原理.md`

随后通过空行进入**响应体**。

响应体就是服务器真正返回给客户端的资源，例如：

```text
HTML 页面、JSON 数据、图片
```

而响应体的内容类型可以由 `Content-Type` 描述。`基于Chrome浏览器渲染原理.md`

---

因此完整的 HTTP 请求-响应流程可以整理成：

```text
浏览器需要一个资源
        ↓
构造 HTTP Request
        ↓
请求行
请求头
空行
请求体（可选）
        ↓
发送给服务器
        ↓
服务器解析请求
        ↓
根据 URL 找资源 / 调用后端
        ↓
生成处理结果
        ↓
构造 HTTP Response
        ↓
响应行
响应头
空行
响应体
        ↓
返回浏览器
        ↓
浏览器根据状态码、响应头和响应体继续处理
```

最终可以收敛为：

> **HTTP 请求报文主要由请求行、请求头、空行和可选请求体组成。请求行告诉服务器“要执行什么操作、访问什么资源、使用什么 HTTP 版本”；请求头携带请求的附加信息；请求体用于提交具体数据。服务器处理完成后返回 HTTP 响应，响应报文由响应行、响应头、空行和响应体组成。响应行包含 HTTP 版本、状态码和状态描述；响应头描述响应相关信息；响应体则包含真正返回给客户端的 HTML、JSON、图片等资源。**

## 第20题 HTTP 的“无状态”和“持久连接”分别是什么意思？两者是否矛盾？

### 题目

HTTP 的“无状态”和“持久连接”分别是什么意思？两者是否矛盾？

### 问题

1. 什么叫 HTTP 的**无状态**？
2. 为什么说每一次 HTTP 请求在协议语义上都是相对独立的？
3. HTTP 本身不保存用户状态，那么网站是如何实现“登录状态”“购物车”等功能的？
4. Cookie、Session、Token 分别可以怎样帮助应用维护状态？
5. 什么叫 HTTP 的**持久连接（长连接）**？
6. 持久连接主要复用的是什么：HTTP 请求本身，还是底层 TCP 连接？
7. 为什么复用 TCP 连接能够减少通信开销？
8. **HTTP 无状态**和**TCP 连接可以持续复用**是否矛盾？为什么？
9. HTTP/1.1 中，一个 TCP 连接为什么可以承载多个 HTTP 请求和响应？

### 回答要点

核心要点如下：
#### 1. HTTP 无状态

- HTTP 本身不会自动保存客户端上一次请求的上下文信息。
- 每一次 HTTP 请求都可以看作相对独立的请求。
- 服务器处理当前请求时，主要依据当前请求携带的信息。`基于Chrome浏览器渲染原理.md`
#### 2. 无状态带来的问题

- HTTP 本身无法自动跟踪用户会话。
- 例如用户是否已经登录、购物车中有哪些商品等，都需要额外的状态管理机制。
- 常见机制包括 Cookie、Session、Token。`基于Chrome浏览器渲染原理.md`
#### 3. Cookie、Session、Token

- Cookie：浏览器保存信息，并在后续请求中携带给服务器。
- Session：服务器保存用户状态，客户端通常通过 Cookie 保存 Session ID。
- Token：客户端保存代表身份或权限的信息，并在后续请求中携带。`基于Chrome浏览器渲染原理.md`
#### 4. 持久连接

- HTTP/1.1 支持持久连接。
- 一个 TCP 连接建立后不必在每个 HTTP 请求结束后立即关闭。
- 后续多个 HTTP 请求可以继续复用同一个 TCP 连接。`基于Chrome浏览器渲染原理.md`
#### 5. 持久连接的作用

- 减少重复建立和关闭 TCP 连接的次数。
- 减少反复进行 TCP 三次握手所产生的时间和通信开销。`基于Chrome浏览器渲染原理.md`
#### 6. 无状态和持久连接不矛盾

- 无状态描述的是：HTTP 是否自动保存前后请求之间的业务上下文。
- 持久连接描述的是：底层 TCP 连接是否继续保留并复用。
- TCP 连接可以保持，但 HTTP 请求之间仍然可以保持无状态。`基于Chrome浏览器渲染原理.md`

---

### 标准回答

HTTP 的**无状态**和**持久连接**描述的是两个不同层面的问题，因此并不矛盾。
#### 1. 什么叫 HTTP 无状态？

HTTP 无状态指的是：

> **HTTP 协议本身不会自动保存前一次请求的上下文，每一次请求都是相对独立的。**

也就是说，客户端第一次请求服务器之后，服务器并不会因为 HTTP 协议本身，就自动记住：

```text
这个用户是谁、之前访问过什么、有没有登录、购物车里有什么
```

下一次客户端再发送 HTTP 请求时，服务器仍然需要根据**当前这一次请求携带的信息**进行处理。`基于Chrome浏览器渲染原理.md`

可以简单理解为：

```text
第 1 次请求
Client ─────────→ Server

第 2 次请求
Client ─────────→ Server
```

对于 HTTP 协议本身来说，这两个请求之间不会自动产生：

```text
第 1 次请求的状态
        ↓
自动传递给第 2 次请求
```

因此材料中将 HTTP 无状态概括为：

> **服务器不会自动保留客户端之前请求的信息，每次 HTTP 请求相对独立。** `基于Chrome浏览器渲染原理.md`

---

但是实际网站显然需要状态。

例如用户登录以后：

```text
/login
```

再访问：

```text
/user/profile
```

服务器必须知道：

> **这个请求还是刚才已经登录的那个用户发来的。**

购物网站也一样：

```text
第一次请求
→ 加入商品 A

第二次请求
→ 加入商品 B

第三次请求
→ 打开购物车
```

如果完全没有额外机制，HTTP 本身并不会自动知道三个请求属于同一个用户。材料也用购物车举例说明了这一点。`基于Chrome浏览器渲染原理.md`

因此应用通常通过：

```text
Cookie、Session、Token
```

来补充状态管理能力。`基于Chrome浏览器渲染原理.md`

其中可以简单理解成：

```text
Cookie
→ 信息保存在浏览器
→ 后续请求时携带给服务器
```

例如：

```http
Cookie: session_id=abc123
```

这样服务器虽然不会因为 HTTP 本身“记住”这个用户，但可以根据请求中的 Cookie 找到相关状态。

---

Session 的思路是：

```text
服务器：
保存用户状态

客户端：
保存一个 Session ID
```

例如：

```text
服务器：

session_id = abc123
        ↓
user = 张三
login = true
cart = [...]
```

浏览器请求时：

```http
Cookie: session_id=abc123
```

服务器根据 Session ID 找到对应的用户状态。

因此可以理解为：

> **Session 把主要状态保存在服务器端，客户端只携带能够找到这份状态的标识。**

材料正是将 Session 描述为服务器保存用户状态，客户端通过 Cookie 保存会话 ID。`基于Chrome浏览器渲染原理.md`

Token 则可以理解为：

```text
用户登录
   ↓
服务器产生 Token
   ↓
客户端保存 Token
   ↓
后续每次请求携带 Token
   ↓
服务器根据 Token 判断身份
```

例如：

```http
Authorization: Bearer xxxxx
```

所以：

> **HTTP 本身无状态，但应用层完全可以借助 Cookie、Session、Token 等机制实现有状态的业务。**

---
#### 2. 什么叫持久连接？

持久连接讨论的不是：

> “服务器记不记得上一次请求。”

而是：

> **底层 TCP 连接要不要在一次 HTTP 请求结束后立即关闭。**

在非持续连接下，可以理解为：

```text
HTTP 请求 1
   ↓
建立 TCP
   ↓
发送请求
   ↓
接收响应
   ↓
关闭 TCP

HTTP 请求 2
   ↓
重新建立 TCP
   ↓
……
```

这样每次请求都需要重新进行 TCP 连接建立，会产生额外开销。

而 HTTP/1.1 支持持久连接：

```text
建立一次 TCP
        ↓
HTTP Request 1
HTTP Response 1
        ↓
HTTP Request 2
HTTP Response 2
        ↓
HTTP Request 3
HTTP Response 3
        ↓
最终再关闭 TCP
```

也就是说：

> **同一个 TCP 连接可以被多个 HTTP 请求和响应复用。**

材料明确指出，持续连接下 TCP 连接默认不立即关闭，可以被多个请求复用，其好处之一就是避免重复 TCP 三次握手。`基于Chrome浏览器渲染原理.md`

因此持久连接主要解决的是：

```text
减少 TCP 重复建立 + 减少 TCP 重复关闭 + 减少握手开销 + 降低通信延迟
```

---
#### 3. 无状态和持久连接为什么不矛盾？

这是本题最关键的地方。

因为两者关注的根本不是同一个问题。

可以直接这样区分：

```text
HTTP 无状态
↓
讨论“请求之间的业务上下文是否自动保存”

持久连接
↓
讨论“底层 TCP 连接是否继续保留”
```

举个最简单的例子。

客户端和服务器已经建立了一个 TCP 长连接：

```text
Client ================= Server
        同一个 TCP
```

在这个 TCP 连接上发送：

```text
Request 1
→ GET /products

Request 2
→ GET /user

Request 3
→ GET /orders
```

这三个 HTTP 请求完全可以共用：

```text
同一个 TCP Connection
```

但是服务器在处理 `Request 2` 时，并不会因为它和 `Request 1` 共用了同一个 TCP 连接，就自动获得：

```text
Request 1 的所有业务上下文
```

如果 Request 2 需要知道用户身份，依然需要通过：

```text
Cookie、Session ID、Token
```

等机制携带相关信息。

因此：

```text
TCP 连接是否还活着
≠
HTTP 是否自动保存业务状态
```

材料也明确指出，HTTP/1.1 即使复用了底层 TCP 连接，HTTP 层仍然保持无状态特性。`基于Chrome浏览器渲染原理.md`

所以可以形成这样一张关系图：

```text
HTTP Request 1 ─┐
HTTP Request 2 ─┼──→ 同一个 TCP 连接
HTTP Request 3 ─┘

      ↑
      │
TCP 可以复用

但是：

Request 1
Request 2
Request 3

在 HTTP 状态语义上
仍然不会自动保存彼此的业务上下文
```

最终可以收敛为：

> **HTTP 无状态指的是 HTTP 协议本身不会自动保存前后请求之间的业务上下文，每一次请求都需要携带完成处理所需要的信息。如果应用需要保存登录状态、购物车等信息，可以通过 Cookie、Session、Token 等机制实现。HTTP 持久连接则表示底层 TCP 连接在一次请求响应结束后可以继续保留，供后续多个 HTTP 请求复用，从而减少重复建立和关闭 TCP 连接的开销。因此，无状态描述的是“请求之间是否自动保存状态”，持久连接描述的是“TCP 连接是否复用”，两者处于不同层面，并不矛盾。**

## 第21题 HTTP/1.1 的管道传输是什么？为什么会出现队头阻塞？HTTP/2 的多路复用又是如何解决这一问题的？

### 题目

HTTP/1.1 的管道传输是什么？为什么会出现队头阻塞？HTTP/2 的多路复用又是如何解决这一问题的？

### 问题

1. HTTP/1.1 为什么引入持久连接之后，可以进一步支持管道传输（Pipelining）？
2. 什么叫 HTTP/1.1 的**管道传输**？
3. 管道传输和普通的“请求一个、响应一个”相比，有什么区别？
4. 为什么 HTTP/1.1 即使可以连续发送多个请求，服务器响应仍然需要按请求顺序返回？
5. 什么叫**队头阻塞（Head-of-Line Blocking）**？
6. 如果第一个请求处理得非常慢，后面的请求会发生什么？
7. HTTP/2 的多路复用主要解决 HTTP/1.1 中哪一类问题？所谓“多路复用”具体是什么意思？
8. HTTP/1.1 的持久连接、管道传输和 HTTP/2 多路复用三者之间是什么关系？

### 回答要点

核心要点如下：
#### 1. 持久连接

- HTTP/1.1 可以让多个 HTTP 请求复用同一个 TCP 连接。
- 不必每完成一次请求就关闭 TCP，再为下一次请求重新建立连接。
- 持久连接解决的核心问题是**减少 TCP 连接反复建立和关闭的开销**。
#### 2. HTTP/1.1 管道传输

- 在同一个 TCP 连接上，客户端不需要等待前一个响应返回，就可以继续发送后续请求。
- 例如：
  ```text
  Request A
  Request B
  Request C
  ```
  可以连续发送，而不必变成：
  ```text
  Request A → Response A
  Request B → Response B
  Request C → Response C
  ```
#### 3. 为什么响应必须按请求顺序返回

- HTTP/1.1 同一连接中的请求/响应没有 HTTP/2 Stream ID 这样的独立标识机制。
- 客户端主要依靠响应出现的顺序，将响应与请求一一对应：
  ```text
  第1个响应 → Request A
  第2个响应 → Request B
  第3个响应 → Request C
  ```
- 因此即使服务器内部先处理完 Request B，也不能先把 Response B 发出去，否则客户端无法按照 HTTP/1.1 的规则正确匹配请求和响应。
#### 4. HTTP/1.1 队头阻塞

- 如果 Request A 很慢，而 B、C 很快：
  ```text
  A：5s
  B：100ms
  C：200ms
  ```
- 即使 B、C 已处理完成，因为 Response A 还没有返回，Response B、C 仍然要等待。
- 这就是 HTTP/1.1 Pipelining 的**应用层队头阻塞**。
#### 5. HTTP/2 多路复用

- HTTP/2 在一个 TCP 连接中建立多个独立的逻辑 **Stream**。
- 每个请求/响应属于自己的 Stream。
- HTTP 消息进一步被拆成多个 **Frame**。
- 每个 Frame 带有 Stream ID，接收方可以知道它属于哪个请求。
- 因此不同 Stream 的 Frame 可以交错传输：
  ```text
  A1 → B1 → C1 → A2 → B2 → C2
  ```
- B 不需要等待整个 A 响应完成以后才能继续传输。
#### 6. HTTP/2 解决了什么

- 它解决了 HTTP/1.1 中因为响应必须严格按顺序返回而产生的**HTTP 层队头阻塞**。
- 但 HTTP/2 仍然运行在 TCP 上。
- TCP 本身要求可靠、有序交付，因此发生 TCP 丢包时仍可能产生**TCP 层队头阻塞**。
- 所以不能说 HTTP/2 消灭了所有队头阻塞。
#### 7. 三者关系

```text
持久连接
→ 一个 TCP 连接可以处理多个 HTTP 请求

管道传输
→ 一个 TCP 连接上可以连续发送多个 HTTP/1.1 请求
→ 但响应仍必须按顺序返回

HTTP/2 多路复用
→ 一个 TCP 连接中建立多个 Stream
→ 每个请求/响应有自己的 Stream
→ Frame 可以交错传输
→ 不再要求整个 Response A 完成后才能发送 Response B
```

### 标准回答

HTTP/1.1 的持久连接、管道传输和 HTTP/2 的多路复用，是 HTTP 为了提高一个连接中多个请求的传输效率而逐步演进出来的机制。
#### 1. HTTP/1.1 持久连接和管道传输

首先是**持久连接**。

如果每发送一个 HTTP 请求都要重新建立 TCP：

```text
建立 TCP
→ Request A
→ Response A
→ 关闭 TCP

重新建立 TCP
→ Request B
→ Response B
→ 关闭 TCP
```

那么会重复产生 TCP 建连和关闭的开销。

HTTP/1.1 使用持久连接后，可以变成：

```text
建立一次 TCP
      ↓
Request A / Response A
      ↓
Request B / Response B
      ↓
Request C / Response C
      ↓
最终关闭 TCP
```

也就是说，**多个 HTTP 请求可以共用同一个 TCP 连接**。

但是仅有持久连接时，请求仍然可以按照：

```text
Request A
   ↓
等待 Response A
   ↓
Request B
```

这种串行方式工作。

HTTP/1.1 的 Pipelining 进一步允许客户端：

```text
Request A ─────→
Request B ─────→
Request C ─────→
```

不需要等 Response A 返回，就继续发送 B、C。

因此管道传输解决的是：

> **前一个请求的响应没有返回时，后续请求能不能先发送出去的问题。**

---
#### 2. 为什么 HTTP/1.1 仍然会发生队头阻塞？

虽然客户端可以连续发送：

```text
Request A、Request B、Request C
```

但是服务器返回响应时仍然必须保持：

```text
Response A、Response B、Response C
```

的对应顺序。

为什么？

核心原因在于 HTTP/1.1 的请求和响应匹配方式。

假设客户端发送：

```text
1. GET /a
2. GET /b
3. GET /c
```

HTTP/1.1 并没有像 HTTP/2 那样给每一个请求建立独立的 Stream ID。

也就是说，不存在这种机制：

```text
Request A → ID=1
Request B → ID=2
Request C → ID=3
```

然后响应再明确告诉客户端：

```text
Response → ID=2
```

所以客户端需要依靠**响应顺序**完成请求和响应之间的匹配：

```text
第1个响应
→ 第1个未完成请求 A

第2个响应
→ 第2个未完成请求 B

第3个响应
→ 第3个未完成请求 C
```

假设服务器处理速度是：

```text
A：5 秒、B：100 ms、C：200 ms
```

服务器内部可能出现：

```text
0.1s：B 已经完成
0.2s：C 已经完成
5.0s：A 才完成
```

但它不能直接返回：

```text
Response B、Response C、Response A
```

否则客户端收到第一个响应后，会按照请求顺序把它当成：

```text
Request A 的响应
```

请求与响应就无法正确对应。

所以即使 B、C 已经处理完，也必须：

```text
等待 A
   ↓
Response A
   ↓
Response B
   ↓
Response C
```

于是形成：

```text
A 很慢
  ↓
B 被 A 挡住
  ↓
C 也被 A 挡住
```

这就是：

> **HTTP/1.1 Pipelining 的应用层队头阻塞。**

因此管道传输只解决了：

```text
请求能不能提前发送
```

并没有解决：

```text
响应能不能彼此独立返回
```

---
#### 3. HTTP/2 的多路复用到底是什么意思？

HTTP/2 解决这个问题的关键，是引入了：

```text
Stream + Frame + Stream ID
```

HTTP/2 仍然可以只建立**一个 TCP 连接**：

```text
Client ================= Server
             TCP
```

但是在这个 TCP 连接内部，不再只有一条逻辑上的 HTTP 请求响应队列，而是可以同时建立多个独立的逻辑 Stream：

```text
一个 TCP Connection
│
├── Stream 1
│      └── Request / Response A
│
├── Stream 3
│      └── Request / Response B
│
└── Stream 5
       └── Request / Response C
```

这里的 **Stream 可以理解为同一个 TCP 连接内部的一条逻辑通信通道**。

所谓：

> **多路**

就是一个 TCP 连接内部同时存在多个 Stream。

所谓：

> **复用**

就是这些 Stream **共同复用同一个底层 TCP 连接**。

这就是“多路复用”这个词真正的含义。

---

HTTP/2 又进一步把每一个 HTTP 消息拆成更小的 **Frame**。

例如：

```text
Response A
→ A1 A2 A3 A4

Response B
→ B1 B2

Response C
→ C1 C2 C3
```

每个 Frame 都知道自己属于哪个 Stream。

因此底层真正传输时，可以变成：

```text
A1、B1、C1、A2、B2、C2、A3、C3、A4
```

也就是：

> **不同请求和响应的数据可以在同一个 TCP 连接中交错传输。**

接收方看到：

```text
A1
```

知道：

```text
属于 Stream A
```

看到：

```text
B1
```

知道：

```text
属于 Stream B
```

最后分别重新组装：

```text
Stream A
→ A1 + A2 + A3 + A4

Stream B
→ B1 + B2

Stream C
→ C1 + C2 + C3
```

因此假设 A 很慢：

```text
Stream A：A1 ───── A2 ───────── A3

Stream B：   B1 B2
                  ↓
                 完成

Stream C：      C1 C2 C3
                        ↓
                       完成
```

B、C 不需要等 A 的整个响应结束以后才能返回。

所以 HTTP/2 解决了 HTTP/1.1 的这个限制：

```text
HTTP/1.1：

Response A 必须完成
        ↓
Response B 才能继续
        ↓
Response C

HTTP/2：

Stream A
Stream B
Stream C
   ↓
彼此可以交错传输
```

---

但是需要注意，HTTP/2 **没有彻底消灭所有队头阻塞**。

因为 HTTP/2 仍然建立在 TCP 之上，而 TCP 提供的是可靠、有序字节流。

假设 TCP 数据是：

```text
Segment 1
Segment 2  ← 丢失
Segment 3
Segment 4
```

即使 Segment 3、4 已经到达，TCP 仍然需要等待 Segment 2 被重传和恢复以后，才能保证按序向上层交付完整字节流。

而所有 HTTP/2 Stream 又共用这一条 TCP 连接，因此一次 TCP 丢包可能同时影响多个 Stream。

所以应当准确地区分：

```text
HTTP/1.1 Pipelining
        ↓
存在 HTTP 应用层队头阻塞

HTTP/2 Multiplexing
        ↓
解决 HTTP 层响应顺序造成的队头阻塞

但是 HTTP/2 基于 TCP
        ↓
仍然存在 TCP 层队头阻塞
```

最终整个演进关系可以总结为：

```text
HTTP/1.1 持久连接
        ↓
一个 TCP 可以复用多个 HTTP 请求
        ↓

HTTP/1.1 Pipelining
        ↓
多个请求可以连续发送
        ↓
但响应必须按请求顺序返回
        ↓
前面的 Response 慢
        ↓
后面的 Response 全部等待
        ↓
HTTP 层队头阻塞
        ↓

HTTP/2 Multiplexing
        ↓
一个 TCP 内建立多个 Stream
        ↓
每个请求/响应属于独立 Stream
        ↓
消息拆成带 Stream ID 的 Frame
        ↓
不同 Stream 的 Frame 可以交错传输
        ↓
某个 HTTP 响应慢
不会再因为 HTTP 响应顺序限制
阻塞其他 Stream
```

面试时可以最终收敛为：

> **HTTP/1.1 Pipelining 允许客户端在同一个持久 TCP 连接中连续发送多个请求，不必等待前一个响应返回。但是 HTTP/1.1 没有为同一连接中的各个请求提供类似 Stream ID 的独立标识，因此客户端依靠响应顺序匹配请求和响应，服务器必须按照请求顺序发送响应。如果排在前面的请求处理很慢，后面的响应即使已经准备好，也必须等待，从而产生应用层队头阻塞。HTTP/2 则在一个 TCP 连接内部建立多个独立 Stream，每个请求和响应属于自己的 Stream，并把消息拆成带 Stream ID 的 Frame，不同 Stream 的 Frame 可以交错传输，这就是多路复用。因此 HTTP/2 解决了 HTTP/1.1 的应用层队头阻塞，但由于底层仍然使用 TCP，所以仍然存在 TCP 层的队头阻塞。**

## 第22题 HTTP/2 为什么仍然存在队头阻塞？HTTP/3 为什么改用 QUIC？

### 题目

HTTP/2 为什么仍然存在队头阻塞？HTTP/3 为什么改用 QUIC？

### 问题

1. HTTP/2 已经实现了多路复用，为什么仍然可能发生队头阻塞？
2. HTTP/2 中多个 Stream 和底层 TCP 连接是什么关系？
3. 当 TCP 中某个 Segment 丢失时，为什么可能同时影响多个 HTTP/2 Stream？
4. HTTP/3 为什么不再直接建立在 TCP 之上，而选择 QUIC？
5. QUIC 是基于 TCP 还是 UDP？为什么选择这种设计？
6. QUIC 中多个 Stream 是如何实现相对独立传输的？一个 Stream 丢包后，为什么通常不会像 HTTP/2 + TCP 那样阻塞其他 Stream？
7. HTTP/3 相比 HTTP/2，在**连接建立、队头阻塞、加密和多路复用**方面有哪些核心变化？
8. 应该如何串联理解：**HTTP/1.1 → HTTP/2 → HTTP/3** 这三个版本主要解决了哪些网络传输问题？

### 回答要点

核心要点如下：
#### 1. HTTP/1.1：解决连接复用，但并发能力仍受限制

- HTTP/1.1 通过持久连接减少重复建立 TCP 连接的开销。
- Pipelining 可以连续发送多个请求，但响应仍需按顺序返回。
- 因此前面的响应慢，会阻塞后面的响应，产生 HTTP 层队头阻塞。([RFC 编辑器](https://www.rfc-editor.org/rfc/rfc9113.html?utm_source=chatgpt.com))
#### 2. HTTP/2：通过多路复用解决 HTTP 层队头阻塞

- HTTP/2 在一个 TCP 连接中建立多个 Stream。
- 每个请求/响应使用自己的 Stream，不同 Stream 的数据可以交错传输。
- 一个 HTTP 请求处理较慢时，不需要阻止其他 Stream 的 HTTP 数据继续传输。([RFC 编辑器](https://www.rfc-editor.org/rfc/rfc9113.html?utm_source=chatgpt.com))
- 但所有 Stream **仍然共用同一个 TCP 连接**。
#### 3. HTTP/2 仍然存在 TCP 层队头阻塞

- TCP 提供可靠、有序的字节流。
- 如果 TCP 中前面的数据丢失，后续数据需要等待丢失的数据恢复后才能按序向上交付。
- 因为多个 HTTP/2 Stream 共用一条 TCP，所以一个 TCP 丢包可能让多个 Stream 暂时停顿。
- 因此 HTTP/2 解决了**HTTP 层队头阻塞**，但没有解决**TCP 层队头阻塞**。([RFC 编辑器](https://www.rfc-editor.org/rfc/rfc9113.html?utm_source=chatgpt.com))
#### 4. HTTP/3：把传输层从 TCP 换成 QUIC

- HTTP/3 使用 QUIC，而不是 HTTP/2 的 TCP。
- QUIC 运行在 UDP 之上，但可靠传输、多路复用、拥塞控制等能力由 **QUIC 自己实现**，不是依靠 UDP 实现。([RFC 编辑器](https://www.rfc-editor.org/rfc/rfc9114.html?utm_source=chatgpt.com))
- QUIC 原生支持多个相对独立的 Stream，一个 Stream 因丢包等待恢复时，不要求其他无关 Stream 一起等待。([RFC 编辑器](https://www.rfc-editor.org/rfc/rfc9114.html?utm_source=chatgpt.com))
#### 5. QUIC 主要解决三个问题

- **进一步减少队头阻塞**：把可靠、有序交付限制到各个 Stream，而不是让整个连接共享一条有序字节流。
- **降低连接建立延迟**：QUIC 将传输连接建立与加密握手结合起来，并支持低延迟连接建立。([RFC 编辑器](https://www.rfc-editor.org/info/rfc9114/?utm_source=chatgpt.com))
- **安全能力内置**：QUIC 集成 TLS 1.3，为 HTTP/3 提供加密和身份认证。([RFC 编辑器](https://www.rfc-editor.org/info/rfc9114/?utm_source=chatgpt.com))
#### 6. 整个发展过程

```text
HTTP/1.1
→ 重点解决 TCP 连接反复建立的问题
→ 持久连接、Pipelining
→ 仍有 HTTP 层队头阻塞

HTTP/2
→ Stream + Frame + 多路复用
→ 解决 HTTP 层队头阻塞
→ 但多个 Stream 共用 TCP
→ 仍有 TCP 层队头阻塞

HTTP/3
→ HTTP over QUIC
→ QUIC 原生支持独立 Stream
→ 避免 TCP 有序字节流造成的跨 Stream 队头阻塞
→ 同时优化连接建立和安全握手
```

---

### 标准回答

HTTP/1.1、HTTP/2 到 HTTP/3 的演进，可以围绕一个核心问题理解：

> **如何让多个 HTTP 请求更高效地共享网络连接，同时减少相互等待。**
#### 1. HTTP/1.1：开始复用连接

HTTP/1.1 的一个重要改进是**持久连接**。

以前可以理解为：

```text
请求 A
→ 建 TCP
→ 发送
→ 返回
→ 关闭

请求 B
→ 再建 TCP
→ 发送
→ 返回
→ 关闭
```

HTTP/1.1 可以让多个 HTTP 请求复用同一个 TCP：

```text
一个 TCP
│
├── 请求 A
├── 请求 B
└── 请求 C
```

这样减少了不断建立、关闭 TCP 连接的开销。

HTTP/1.1 还可以通过 Pipelining 连续发送多个请求，但它仍存在明显的问题：**响应需要按照请求顺序对应返回**。因此如果 A 很慢：

```text
A：很慢、B：很快、C：很快
```

仍然可能形成：

```text
A
↓
B 等待
↓
C 等待
```

这就是 HTTP/1.1 的应用层队头阻塞。RFC 9113 在介绍 HTTP/2 出现的背景时，也明确指出 HTTP/1.1 的 Pipelining 仍然存在应用层队头阻塞。([RFC 编辑器](https://www.rfc-editor.org/rfc/rfc9113.html?utm_source=chatgpt.com))

---
#### 2. HTTP/2：用多路复用解决 HTTP 层排队

HTTP/2 最大的变化之一，就是上一题讲到的：

> **多路复用。**

在一个 TCP 连接中建立多个 Stream：

```text
一个 TCP Connection
│
├── Stream A
├── Stream B
└── Stream C
```

不同请求和响应属于不同 Stream，数据可以交错传输。

所以：

```text
Stream A：A1 ───── A2 ───── A3
Stream B：   B1 B2
Stream C：      C1 C2 C3
```

即使 A 比较慢，B、C 也不用因为 **HTTP 响应必须按 A→B→C 顺序完整返回**而等待。

这就解决了 HTTP/1.1 的 HTTP 层队头阻塞。HTTP/2 标准明确将每个请求/响应关联到自己的 Stream，不同 Stream 可以在一个连接中并发、交错传输。([RFC 编辑器](https://www.rfc-editor.org/rfc/rfc9113.html?utm_source=chatgpt.com))

但是这里还有一个问题：

```text
Stream A ─┐
Stream B ─┼──→ 同一个 TCP
Stream C ─┘
```

HTTP/2 的多个 Stream 虽然在 HTTP 层是独立的，但底层**仍然只有一条 TCP 连接**。

TCP 本身要求可靠、有序地交付数据。

例如：

```text
TCP 数据：

1 → 2 → 3 → 4
        ↑
       丢失
```

即使后面的数据已经到了，TCP 也需要先把缺失的数据恢复，才能继续按照顺序向上层交付。

于是可能出现：

```text
TCP 丢包
   ↓
TCP 等待重传
   ↓
这一 TCP 连接暂时无法继续按序交付数据
   ↓
上面的多个 HTTP/2 Stream 都可能受到影响
```

因此：

> **HTTP/2 解决了 HTTP 层队头阻塞，但是没有解决 TCP 层队头阻塞。**

这也是 RFC 9113 明确指出的 HTTP/2 局限。([RFC 编辑器](https://www.rfc-editor.org/rfc/rfc9113.html?utm_source=chatgpt.com))

---
#### 3. HTTP/3：为什么要提出 QUIC？

到了 HTTP/3，思路发生了进一步变化：

> **既然 HTTP/2 的多路复用已经做好了，但问题出在底层 TCP，那么就需要改变底层传输方式。**

于是 HTTP/3 不再使用：

```text
HTTP/2
↓
TLS
↓
TCP
```

而变成：

```text
HTTP/3
↓
QUIC
↓
UDP
```

HTTP/3 标准规定 HTTP/3 将 HTTP 语义映射到 QUIC 上，而 QUIC 本身提供 Stream 多路复用、流控制以及低延迟连接建立等能力。([RFC 编辑器](https://www.rfc-editor.org/rfc/rfc9114.html?utm_source=chatgpt.com))

这里容易出现一个误区：

> **HTTP/3 使用 UDP，并不意味着 HTTP/3 是“不可靠传输”。**

UDP 本身确实没有 TCP 那套可靠传输机制，但 QUIC 是建立在 UDP 之上的一套新的传输协议：

```text
UDP
↓
只负责发送数据报

QUIC
↓
自己实现
可靠传输
拥塞控制
丢包恢复
多路复用
加密
```

RFC 9000 将 QUIC 定义为一种基于 UDP 的、安全的、多路复用传输协议。([RFC 编辑器](https://www.rfc-editor.org/info/rfc9000/?utm_source=chatgpt.com))

所以更准确的理解是：

> **不是“把 TCP 简单换成 UDP”，而是利用 UDP 作为承载，在用户空间重新实现了一套更适合现代 HTTP 的 QUIC 传输协议。**

---
#### 4. QUIC 主要解决了什么？

这里掌握三个概念即可。

**第一，进一步解决队头阻塞。**

QUIC 自己原生支持多个 Stream：

```text
QUIC Connection
│
├── Stream A
├── Stream B
└── Stream C
```

各个 Stream 的可靠、有序传输主要在**各自 Stream 内部**维护。

所以如果：

```text
Stream A
某个数据丢失
```

A 可以等待自己的数据恢复，但不会因为“整个连接是一条必须统一按序交付的字节流”，强制 B、C 一起等待。HTTP/3 标准明确指出，一个 QUIC Stream 被阻塞或遭遇丢包时，不会阻止其他 Stream 继续推进。([RFC 编辑器](https://www.rfc-editor.org/rfc/rfc9114.html?utm_source=chatgpt.com))

概念上可以理解为：

```text
HTTP/2：

多个 Stream
    ↓
共用一条 TCP 有序字节流
    ↓
TCP 丢包
    ↓
多个 Stream 可能一起等

HTTP/3：

多个 QUIC Stream
    ↓
Stream 相对独立
    ↓
A 丢包
    ↓
主要由 A 等待恢复
B、C 可以继续
```

---

**第二，减少连接建立延迟。**

传统 HTTPS 建立通信，大体需要完成：

```text
建立 TCP + 建立 TLS 安全连接
```

QUIC 则把传输连接建立和安全握手更加紧密地结合起来，设计目标之一就是降低连接建立延迟。它还支持在满足条件时使用 0-RTT 更早发送应用数据。([RFC 编辑器](https://www.rfc-editor.org/info/rfc9114/?utm_source=chatgpt.com))

这一题不需要记握手报文细节，只需要知道：

> **QUIC 的一个重要目标，是比传统 TCP + TLS 组合更快地建立可用的安全连接。**

---

**第三，QUIC 内置安全能力。**

QUIC 集成了 TLS 1.3，HTTP/3 依靠 QUIC 提供数据机密性、完整性和对端认证。([RFC 编辑器](https://www.rfc-editor.org/info/rfc9114/?utm_source=chatgpt.com))

因此不需要把它理解成：

```text
UDP 不安全
↓
HTTP/3 也不安全
```

而应该理解成：

```text
UDP
↓
QUIC
├── 可靠传输
├── 多路复用
├── 拥塞控制
└── TLS 1.3 安全能力
↓
HTTP/3
```

---
#### HTTP/1.1 → HTTP/2 → HTTP/3 如何整体理解？

把三个版本放到一起，发展路线就非常清楚：

```text
HTTP/1.1
│
│  持久连接
│  一个 TCP 可以处理多个请求
│
├── 解决：
│   减少重复建立 TCP
│
└── 问题：
    HTTP 层队头阻塞
            ↓

HTTP/2
│
│  Stream + Frame + 多路复用
│
├── 解决：
│   HTTP 层队头阻塞
│
└── 问题：
    所有 Stream 仍共用 TCP
    TCP 丢包可能阻塞多个 Stream
            ↓

HTTP/3
│
│  HTTP over QUIC
│
│  QUIC over UDP
│
├── QUIC 原生多 Stream
├── Stream 之间更加独立
├── 集成 TLS 1.3
└── 优化连接建立
```

所以这道题最终可以收敛成：

> **HTTP/1.1 主要通过持久连接减少重复建立 TCP 的开销，但多个请求之间仍存在 HTTP 层队头阻塞；HTTP/2 引入 Stream 和多路复用，让多个请求可以在同一个 TCP 连接中并发、交错传输，从而解决 HTTP 层队头阻塞，但由于所有 Stream 仍共享一条 TCP 有序字节流，TCP 丢包仍可能导致多个 Stream 一起等待。HTTP/3 因此进一步采用基于 UDP 构建的 QUIC，由 QUIC 原生提供多 Stream、可靠传输、拥塞控制和 TLS 1.3 安全能力，使不同 Stream 的丢包恢复更加独立，从而解决 HTTP/2 受 TCP 队头阻塞影响的问题，同时降低安全连接建立的延迟。** ([RFC 编辑器](https://www.rfc-editor.org/rfc/rfc9113.html?utm_source=chatgpt.com))

---

**Sources:**

- [RFC 9113: HTTP/2](https://www.rfc-editor.org/rfc/rfc9113.html?utm_source=chatgpt.com)

## 第23题 HTTP 常见请求方法分别有什么作用？安全性和幂等性应该如何理解？

### 题目

HTTP 常见请求方法分别有什么作用？安全性和幂等性应该如何理解？

### 问题

1. HTTP 中常见的 **GET、POST、PUT、PATCH、DELETE、HEAD、OPTIONS** 分别表示什么语义？各自通常用于什么场景？
2. GET 和 POST 最核心的区别是什么？能不能简单理解为“GET 用于查询、POST 用于提交”？
3. PUT 和 PATCH 都可以修改资源，它们之间的主要区别是什么？
4. DELETE 请求执行多次时，为什么通常仍然可以认为它具有**幂等性**？
5. 什么叫 HTTP 方法的**安全（Safe）**？什么叫**幂等（Idempotent）**？这两个概念有什么区别？
6. GET、HEAD、OPTIONS 为什么属于安全方法？安全方法是否意味着服务器绝对不会发生任何状态变化？
7. GET、PUT、DELETE 为什么属于幂等方法，而 POST 通常不是幂等方法？
8. PATCH 是否一定不是幂等的？它的幂等性应该如何判断？
9. HEAD 和 GET 有什么关系？为什么有时只需要发送 HEAD 请求？
10. OPTIONS 请求主要解决什么问题？浏览器进行跨域请求时，为什么经常会看到 OPTIONS 预检请求？

### 回答要点

核心要点如下：
#### 1. 常见 HTTP 方法的语义

- `GET`：获取目标资源当前的表示。
- `POST`：让目标资源根据请求内容执行特定处理，例如创建资源、提交表单、触发业务操作。
- `PUT`：使用请求中的内容**创建或整体替换**目标资源的状态。
- `PATCH`：对已有资源进行**部分修改**。
- `DELETE`：请求删除目标资源与其当前功能之间的关联。
- `HEAD`：语义与 GET 类似，但响应中不传输响应内容。
- `OPTIONS`：查询目标资源或服务器支持的通信选项。([RFC 编辑器](https://www.rfc-editor.org/info/rfc9110/?utm_source=chatgpt.com))
#### 2. GET 和 POST 的区别首先是“语义”

- GET 的语义是**获取资源**。
- POST 的语义是**把请求内容交给目标资源进行处理**。
- “GET 查询、POST 提交”可以作为常见使用习惯帮助记忆，但不是 HTTP 标准对二者最根本的定义。([RFC 编辑器](https://www.rfc-editor.org/info/rfc9110/?utm_source=chatgpt.com))
#### 3. PUT 和 PATCH

- PUT 更强调：用这份表示去**创建或整体替换目标资源状态**。
- PATCH 更强调：给服务器一组修改指令，**部分修改已有资源**。
- PUT 本身是幂等方法；PATCH 按标准定义不是天然幂等，但具体 PATCH 操作可以设计成幂等。([RFC 编辑器](https://www.rfc-editor.org/info/rfc9110/?utm_source=chatgpt.com))
#### 4. 安全性 Safe

- “安全”指方法定义的语义本质上是**只读的**，客户端没有要求服务器改变资源状态。
- GET、HEAD、OPTIONS 都属于安全方法。
- 安全不代表服务器内部绝对没有任何变化，比如记录访问日志、统计访问次数等副作用仍然可能发生。([RFC 编辑器](https://www.rfc-editor.org/info/rfc9110/?utm_source=chatgpt.com))
#### 5. 幂等性 Idempotent

- 对同一个请求执行一次和执行多次，服务器产生的**预期效果相同**，就是幂等。
- GET、HEAD、OPTIONS、PUT、DELETE 都是幂等方法。
- POST 通常不是幂等方法。
- 幂等关注的是**最终预期效果**，不是“每次响应完全一样”。([RFC 编辑器](https://www.rfc-editor.org/info/rfc9110/?utm_source=chatgpt.com))
#### 6. DELETE 为什么幂等

- 第一次：
  ```text
  删除资源 A
  → A 不存在
  ```
- 再删除：
  ```text
  删除资源 A
  → A 仍然不存在
  ```
- 最终目标状态没有进一步改变，因此 DELETE 的语义是幂等的。
- 两次返回的状态码可以不同，但不影响幂等性的判断。([RFC 编辑器](https://www.rfc-editor.org/info/rfc9110/?utm_source=chatgpt.com))
#### 7. PATCH 的幂等性

- PATCH 标准本身没有定义为幂等。
- 但具体操作可以设计成幂等。
- 判断的关键仍然是：**相同 PATCH 重复执行，预期结果是否与执行一次相同。** ([RFC 编辑器](https://www.rfc-editor.org/info/rfc5789/?utm_source=chatgpt.com))
#### 8. HEAD

- 相当于获取 GET 本来会返回的元数据，但不传输响应内容。
- 常用于检查资源是否存在、查看 `Content-Length`、`Last-Modified`、`ETag` 等元数据，从而避免下载完整资源。([RFC 编辑器](https://www.rfc-editor.org/info/rfc9110/?utm_source=chatgpt.com))
#### 9. OPTIONS

- 用来查询目标资源支持什么通信能力。
- 浏览器的 CORS 预检请求会使用 OPTIONS，询问服务器是否允许接下来真正要发送的跨域方法和请求头。([RFC 编辑器](https://www.rfc-editor.org/info/rfc9110/?utm_source=chatgpt.com))

---

### 标准回答

HTTP 方法最重要的不是记住“GET 查、POST 增、PUT 改、DELETE 删”这类 CRUD 对应关系，而是理解：

> **HTTP Method 表达客户端希望对目标资源执行什么语义。**
#### 1. 常见 HTTP 方法

首先可以建立整体认识：

| 方法 | 核心语义 | 常见场景 | Safe | Idempotent |
|---|---|---|---|---|
| GET | 获取资源表示 | 查询数据、获取页面 | 是 | 是 |
| HEAD | 与 GET 类似，但不返回响应内容 | 获取资源元数据 | 是 | 是 |
| POST | 让资源处理请求内容 | 创建资源、提交数据、触发操作 | 否 | 否 |
| PUT | 创建或整体替换目标资源 | 整体更新资源 | 否 | 是 |
| PATCH | 对资源进行部分修改 | 修改部分字段 | 否 | 不保证 |
| DELETE | 删除目标资源的关联 | 删除资源 | 否 | 是 |
| OPTIONS | 查询通信选项 | 查询支持方法、CORS 预检 | 是 | 是 |

这些属性来自 HTTP Semantics 标准；PATCH 的语义则由 RFC 5789 定义。([RFC 编辑器](https://www.rfc-editor.org/info/rfc9110/?utm_source=chatgpt.com))

例如有这样一个资源：

```text
/users/1001
```

GET：

```http
GET /users/1001
```

表示：

```text
获取用户 1001 的当前表示
```

POST：

```http
POST /users
```

可能表示：

```text
把这份数据交给 /users 处理
→ 创建一个新用户
```

PUT：

```http
PUT /users/1001
```

通常表示：

```text
使用当前请求内容
整体替换 /users/1001 的资源状态
```

PATCH：

```http
PATCH /users/1001
```

可能表示：

```text
只修改用户 1001 的某些字段
```

DELETE：

```http
DELETE /users/1001
```

表示请求删除这个目标资源的关联。([RFC 编辑器](https://www.rfc-editor.org/info/rfc9110/?utm_source=chatgpt.com))

---
#### 2. GET 和 POST 最核心的区别是什么？

可以用：

```text
GET → 查询
POST → 提交
```

帮助记忆，但不能把它当作标准定义。

更准确的是：

```text
GET
↓
请求获取目标资源当前的表示
```

而：

```text
POST
↓
把请求内容提交给目标资源
↓
让服务器按照这个资源自己的语义进行处理
```

所以 POST 不一定只是“新增数据”。

例如：

```http
POST /orders
```

可以创建订单。

但：

```http
POST /orders/1001/cancel
```

也可能是触发“取消订单”操作。

因此两者最根本的区别是：

> **GET 表达资源获取语义；POST 表达让目标资源处理请求内容的语义。** ([RFC 编辑器](https://www.rfc-editor.org/info/rfc9110/?utm_source=chatgpt.com))

---
#### 3. PUT 和 PATCH 有什么区别？

这两个方法都经常用于修改资源，但关注点不同。

PUT 更接近：

```text
原资源：

{
  "name": "Tom",
  "age": 20,
  "city": "Tokyo"
}

        ↓ PUT

{
  "name": "Jack",
  "age": 21,
  "city": "Shanghai"
}

        ↓

用新的表示替换目标资源状态
```

HTTP 标准定义 PUT 的语义就是：使用请求内容创建或替换目标资源的状态。([RFC 编辑器](https://www.rfc-editor.org/info/rfc9110/?utm_source=chatgpt.com))

PATCH 则更接近：

```text
原资源：

{
  "name": "Tom",
  "age": 20,
  "city": "Tokyo"
}

PATCH：

只把 age 改为 21

        ↓

{
  "name": "Tom",
  "age": 21,
  "city": "Tokyo"
}
```

所以可以记成：

```text
PUT
→ 整体创建 / 替换

PATCH
→ 部分修改
```

RFC 5789 正是因为 PUT 只有完整替换语义，而很多应用需要部分修改资源，才定义了 PATCH。([RFC 编辑器](https://www.rfc-editor.org/info/rfc5789/?utm_source=chatgpt.com))

---
#### 4. 什么是安全性？

HTTP 中的 Safe 不是：

```text
HTTPS、数据加密、没有漏洞、不会被攻击
```

这里的“安全”完全不是网络安全意义上的安全。

它指的是：

> **客户端发起这个方法时，没有要求服务器修改目标资源状态，方法的定义语义本质上是只读的。** ([RFC 编辑器](https://www.rfc-editor.org/info/rfc9110/?utm_source=chatgpt.com))

典型的安全方法是：

```text
GET、HEAD、OPTIONS
```

比如：

```http
GET /users/1001
```

我的意图只是：

```text
把这个用户的数据给我
```

而不是：

```text
修改这个用户
```

---

但是 Safe 并不意味着：

> 服务器内部一丁点变化都不能发生。

例如执行 GET 时：

```text
GET /article/1
        ↓
服务器记录：
访问日志 +1
访问统计 +1
```

这些副作用是允许存在的。

因为 GET 的**请求语义本身**仍然是读取资源，客户端并没有请求服务器修改目标资源。

所以判断安全性看的是：

> **客户端请求的语义是否以改变服务器状态为目的。** ([RFC 编辑器](https://www.rfc-editor.org/info/rfc9110/?utm_source=chatgpt.com))

---
#### 5. 什么是幂等性？

幂等的核心定义是：

> **对于相同请求，执行一次和执行多次，对服务器产生的预期效果相同。** ([RFC 编辑器](https://www.rfc-editor.org/info/rfc9110/?utm_source=chatgpt.com))

比如 PUT：

```http
PUT /users/1001

{
  "name": "Tom"
}
```

执行一次：

```text
用户 1001
→ name = Tom
```

再执行一次：

```text
用户 1001
→ name = Tom
```

再执行十次：

```text
用户 1001
→ name = Tom
```

最终预期状态都一样：

```text
name = Tom
```

所以 PUT 是幂等的。

---
#### 6. DELETE 为什么也是幂等的？

假设：

```http
DELETE /users/1001
```

第一次执行：

```text
用户存在
↓
删除
↓
用户不存在
```

第二次执行：

```text
用户已经不存在
↓
仍然不存在
```

第三次：

```text
仍然不存在
```

所以从请求的预期效果来看：

```text
执行一次
→ 资源不存在

执行十次
→ 资源还是不存在
```

因此 DELETE 是幂等的。([RFC 编辑器](https://www.rfc-editor.org/info/rfc9110/?utm_source=chatgpt.com))

这里有一个特别重要的地方：

> **幂等不要求每一次 HTTP 响应完全相同。**

比如第一次 DELETE 可能返回：

```text
204 No Content
```

第二次因为资源已经不存在，服务器可能返回另一种结果。

这不影响 DELETE 方法本身的幂等语义，因为资源最终都处于：

```text
不存在
```

的状态。([RFC 编辑器](https://www.rfc-editor.org/info/rfc9110/?utm_source=chatgpt.com))

---
#### 7. 为什么 POST 通常不是幂等的？

比如：

```http
POST /orders
```

请求内容：

```json
{
  "product": "Book"
}
```

执行一次：

```text
创建订单 001
```

再执行一次：

```text
又创建订单 002
```

再执行：

```text
又创建订单 003
```

于是：

```text
执行一次
→ 1 个订单

执行三次
→ 3 个订单
```

预期效果不同，所以 POST 在 HTTP 标准中不是幂等方法。([RFC 编辑器](https://www.rfc-editor.org/info/rfc9110/?utm_source=chatgpt.com))

不过这并不是说：

> “所有使用 POST 的业务永远不可能做成幂等。”

应用完全可以通过：

```text
幂等键、业务唯一 ID、去重机制
```

把某个具体 POST 接口设计成重复调用仍产生同一个业务效果。

但是：

> **POST 方法本身没有 HTTP 标准提供的幂等语义保证。** ([RFC 编辑器](https://www.rfc-editor.org/info/rfc9110/?utm_source=chatgpt.com))

---
#### 8. PATCH 到底是不是幂等的？

PATCH 在标准中被定义为：

> **不是天然幂等的方法。**

但是 PATCH **可以被设计成幂等操作**。([RFC 编辑器](https://www.rfc-editor.org/info/rfc5789/?utm_source=chatgpt.com))

比如：

```text
把 age 设置为 20
```

重复执行：

```text
20
20
20
```

结果可能保持一致。

但是：

```text
把 age 增加 1
```

第一次：

```text
20 → 21
```

第二次：

```text
21 → 22
```

第三次：

```text
22 → 23
```

这显然不幂等。

所以不要机械记成：

```text
PATCH = 一定不幂等
```

更准确的是：

> **HTTP 标准没有赋予 PATCH 幂等性保证；具体 PATCH 是否表现为幂等，要看补丁格式和操作语义。** ([RFC 编辑器](https://www.rfc-editor.org/info/rfc5789/?utm_source=chatgpt.com))

---
#### 9. HEAD 和 GET 有什么关系？

HEAD 可以理解为：

> **和 GET 获取相同资源的元数据，但不传输 GET 会返回的响应内容。** ([RFC 编辑器](https://www.rfc-editor.org/info/rfc9110/?utm_source=chatgpt.com))

例如：

```http
GET /image.png
```

可能返回：

```text
响应头 + 5 MB 图片数据
```

而：

```http
HEAD /image.png
```

主要获得：

```text
Content-Type、Content-Length、Last-Modified、ETag、……
```

但是：

```text
不传输图片本身
```

所以如果客户端只是想知道：

```text
文件是否存在？、多大？、什么时候修改？、缓存是否可能变化？
```

就没有必要下载整个资源。

这就是 HEAD 的价值。([RFC 编辑器](https://www.rfc-editor.org/info/rfc9110/?utm_source=chatgpt.com))

---
#### 10. OPTIONS 和 CORS 预检是什么关系？

OPTIONS 的标准语义是：

> **查询目标资源可以使用哪些通信选项或服务器能力。** ([RFC 编辑器](https://www.rfc-editor.org/info/rfc9110/?utm_source=chatgpt.com))

例如客户端可以通过 OPTIONS 去询问目标资源支持什么通信方式。

浏览器的 CORS 又利用了 OPTIONS 的这个特点。

假设网页要跨域发起一个比较复杂的请求：

```text
https://a.com
        ↓
跨域请求
        ↓
https://api.b.com
```

浏览器在真正发送请求之前，某些情况下会先发送：

```http
OPTIONS /resource
```

其中告诉服务器：

```text
我之后准备使用什么 Method
我之后准备携带哪些请求头
```

服务器通过响应中的 CORS 相关信息告诉浏览器：

```text
是否允许这个 Origin、是否允许这个 Method、是否允许这些 Headers
```

如果预检通过：

```text
OPTIONS 预检
    ↓
允许
    ↓
发送真正的跨域请求
```

如果预检失败：

```text
OPTIONS 预检
    ↓
不允许
    ↓
浏览器不会按该 CORS 请求继续完成实际跨域访问
```

WHATWG Fetch Standard 明确定义 CORS preflight 使用 `OPTIONS` 方法，并通过 `Access-Control-Request-Method` 和可选的 `Access-Control-Request-Headers` 告知服务器后续请求计划使用的方法和请求头。([Fetch Standard](https://fetch.spec.whatwg.org/?utm_source=chatgpt.com))

---

所以这一题最重要的是把 **Safe 和 Idempotent 分开**：

```text
Safe
↓
关注“这个请求是不是以修改服务器状态为目的”

Idempotent
↓
关注“同一个请求重复执行，预期效果是否与执行一次相同”
```

二者关系可以记成：

```text
GET
→ Safe
→ Idempotent

HEAD
→ Safe
→ Idempotent

OPTIONS
→ Safe
→ Idempotent

PUT
→ 不 Safe
→ Idempotent

DELETE
→ 不 Safe
→ Idempotent

POST
→ 不 Safe
→ 不保证 Idempotent

PATCH
→ 不 Safe
→ 不保证 Idempotent
```

最终面试时可以收敛成：

> **HTTP 方法表达客户端希望对目标资源执行的操作语义。GET 用于获取资源表示；POST 用于让目标资源处理请求内容；PUT 用请求内容创建或整体替换目标资源；PATCH 用于部分修改；DELETE 请求删除目标资源；HEAD 与 GET 语义类似但不传输响应内容；OPTIONS 用于查询通信能力。Safe 表示方法本身的定义语义基本只读，GET、HEAD、OPTIONS 属于安全方法；Idempotent 表示相同请求执行多次与执行一次具有相同的预期效果，因此 GET、HEAD、OPTIONS、PUT、DELETE 都是幂等的。POST 不提供幂等保证，PATCH 也不是天然幂等，但具体应用可以把它们设计成幂等操作。** ([RFC 编辑器](https://www.rfc-editor.org/info/rfc9110/?utm_source=chatgpt.com))

---

**Sources:**

- [RFC 9110: HTTP Semantics | RFC Editor](https://www.rfc-editor.org/info/rfc9110/?utm_source=chatgpt.com)
- [Fetch Standard](https://fetch.spec.whatwg.org/?utm_source=chatgpt.com)

## 第24题 HTTP 状态码应该如何分类？常见状态码之间有什么区别？

### 题目

HTTP 状态码应该如何分类？常见状态码之间有什么区别？

### 问题

1. HTTP 状态码整体分为哪五类？`1xx、2xx、3xx、4xx、5xx` 分别表示什么含义？
2. `200 OK`、`201 Created`、`202 Accepted`、`204 No Content` 分别适用于什么场景？它们之间有什么区别？
3. `301 Moved Permanently` 和 `302 Found` 都属于重定向，它们最核心的区别是什么？
4. `302`、`303`、`307` 在重定向时，对原请求方法的处理有什么不同？为什么 `307` 会强调保持原来的 HTTP Method？
5. `301` 和 `308` 都可以表示永久重定向，它们之间有什么区别？
6. `304 Not Modified` 为什么属于 `3xx`，却不是普通意义上的“跳转到另一个 URL”？它和浏览器协商缓存是什么关系？
7. `400 Bad Request`、`401 Unauthorized`、`403 Forbidden`、`404 Not Found` 分别表示什么？其中 `401` 和 `403` 最容易混淆的地方是什么？
8. `405 Method Not Allowed` 和 `404 Not Found` 有什么区别？
9. `429 Too Many Requests` 一般表示什么问题？通常用于解决什么场景？
10. `500 Internal Server Error`、`502 Bad Gateway`、`503 Service Unavailable`、`504 Gateway Timeout` 分别表示什么？特别是 `502` 和 `504` 为什么通常和代理、网关、反向代理有关？
11. 面试中如果让你根据“请求是否成功、是否需要跳转、错误发生在客户端还是服务器端”快速判断状态码，应该如何建立整体判断逻辑？

### 回答要点

核心要点如下：
#### 1. 五类状态码

- `1xx`：信息性响应，请求仍在继续处理。
- `2xx`：请求已成功接收、理解并处理。
- `3xx`：客户端还需要采取额外动作才能完成请求，典型场景包括重定向和缓存验证。
- `4xx`：客户端侧请求存在问题，例如参数、认证、权限、资源地址。
- `5xx`：服务器知道请求是有效请求，但服务器端在处理过程中失败。([RFC 编辑器](https://www.rfc-editor.org/info/rfc9110/?utm_source=chatgpt.com))
#### 2. 常见 2xx

- `200 OK`：请求正常成功。
- `201 Created`：请求成功，并创建了新的资源。
- `202 Accepted`：服务器已经接受请求，但处理**尚未完成**。
- `204 No Content`：请求处理成功，但不需要返回响应内容。([RFC 编辑器](https://www.rfc-editor.org/info/rfc9110/?utm_source=chatgpt.com))
#### 3. 301 与 302

- `301`：资源已经永久迁移，以后应优先使用新的 URI。
- `302`：资源暂时位于另一个 URI，以后的请求仍应继续使用原 URI。([RFC 编辑器](https://www.rfc-editor.org/info/rfc9110/?utm_source=chatgpt.com))
#### 4. 303、307

- `302`：临时重定向；由于历史兼容行为，原来是 POST 时，客户端可能把后续请求改成 GET。
- `303`：明确让客户端去另一个 URI 获取结果，HTTP 中通常使用 GET 或 HEAD。
- `307`：临时重定向，而且明确**不得改变原请求方法**。([RFC 编辑器](https://www.rfc-editor.org/info/rfc9110/?utm_source=chatgpt.com))
#### 5. 301 与 308

- 都表示永久重定向。
- `301` 在历史兼容行为下允许 POST 重定向后变成 GET。
- `308` 明确要求重定向时保持原 HTTP Method。([RFC 编辑器](https://www.rfc-editor.org/info/rfc9110/?utm_source=chatgpt.com))
#### 6. 304

- 不是普通的 URL 跳转。
- 它用于条件 GET/HEAD：
  ```text
  客户端有缓存
  → 带验证条件请求服务器
  → 资源没变化
  → 304
  → 客户端继续使用本地缓存
  ```
- 所以 304 可以理解为“重新指向已经保存的表示”，而不是让浏览器访问另一个 URL。([RFC 编辑器](https://www.rfc-editor.org/info/rfc9110/?utm_source=chatgpt.com))
#### 7. 常见 4xx

- `400`：请求本身有问题，服务器无法或不愿按当前请求处理。
- `401`：缺少有效的身份认证凭证，需要认证。
- `403`：服务器理解请求，但拒绝执行。
- `404`：目标资源不存在，或服务器不愿透露目标资源是否存在。
- `401` 和 `403` 的核心区别：
  ```text
  401 → 你是谁还没有被有效认证
  403 → 我知道这个请求，但不允许你执行
  ```
#### 8. 405 与 404

- `404`：目标资源找不到。
- `405`：资源存在，但该资源不支持当前 HTTP Method。
- 例如：
  ```text
  GET /users/1     → 支持
  DELETE /users/1  → 不允许
  ```
  就可能返回 `405 Method Not Allowed`。
#### 9. 429

- 表示客户端在一定时间内发送的请求过多，即**限流**。
- 常用于 API 调用频率限制、防止滥用或保护服务器。
- 响应可以通过 `Retry-After` 告诉客户端多久后重试。([RFC 编辑器](https://www.rfc-editor.org/info/rfc6585/?utm_source=chatgpt.com))
#### 10. 常见 5xx

- `500`：服务器内部处理发生未明确分类的错误。
- `502`：当前服务器作为网关/代理时，从上游服务器收到了无效响应。
- `503`：服务器当前暂时无法处理请求，例如过载或维护。
- `504`：当前服务器作为网关/代理时，等待上游服务器响应超时。
#### 11. 整体判断思路

```text
请求仍在处理中？
→ 1xx

请求已经成功？
→ 2xx

还需要客户端去别处或使用缓存等额外动作？
→ 3xx

请求、认证、权限、资源等客户端侧有问题？
→ 4xx

服务器或上游服务处理失败？
→ 5xx
```

---

### 标准回答

HTTP 状态码是服务器对一次 HTTP 请求处理结果的标准化表达。面试中不建议孤立地死记每个数字，而应该先理解**五大类别**，再理解几个容易混淆的状态码。
#### 1. 五类状态码怎么理解？

HTTP 状态码第一位数字就代表大的处理类别：

```text
1xx → Information
      信息性响应

2xx → Success
      请求成功

3xx → Redirection
      还需要进一步动作

4xx → Client Error
      请求侧存在问题

5xx → Server Error
      服务器处理失败
```

例如：

```text
200 → 请求成功
404 → 找不到资源
500 → 服务器内部错误
```

因此面试中先看第一位，就能快速判断问题的大方向。([RFC 编辑器](https://www.rfc-editor.org/info/rfc9110/?utm_source=chatgpt.com))

---
#### 2. 200、201、202、204 有什么区别？

这四个状态码全部属于成功，但“成功到了什么程度”并不相同。

**200 OK**

最通用的成功状态。

例如：

```http
GET /users/1001
```

服务器正常返回用户：

```text
200 OK + 用户数据
```

表示：

> 请求已经成功处理。

---

**201 Created**

表示：

> 请求成功，而且服务器创建了一个新的资源。

例如：

```http
POST /users
```

创建一个用户后：

```text
201 Created
Location: /users/1001
```

此时不仅是“操作成功”，还明确产生了一个新的资源。RFC 9110 规定，对于成功创建资源的场景，服务器可以通过 `Location` 指向新创建的主要资源。([RFC 编辑器](https://www.rfc-editor.org/info/rfc9110/?utm_source=chatgpt.com))

---

**202 Accepted**

它最容易理解错。

202 不是：

> “任务已经执行成功。”

而是：

> **服务器已经接受了这个请求，但是处理还没有完成。**

例如：

```text
提交视频转码任务
        ↓
服务器收到任务
        ↓
放入后台任务队列
        ↓
立即返回 202
```

之后客户端可能再通过任务 ID 查询：

```http
GET /tasks/123
```

因此 202 很适合：

```text
异步任务、批处理、大文件处理、后台计算
```

---

**204 No Content**

表示：

> 请求已经成功，但是服务器没有必要返回响应内容。

比如：

```http
DELETE /users/1001
```

删除成功后：

```text
204 No Content
```

客户端只需要知道：

```text
删除成功
```

不需要服务器再返回 JSON。

因此四者可以记成：

```text
200
→ 成功

201
→ 成功 + 创建资源

202
→ 已接受，但还没处理完

204
→ 成功，但没有响应内容
```

---
#### 3. 301 和 302 有什么区别？

两者都表示：

```text
当前 URI
↓
资源在另一个 URI
```

区别主要在于**永久还是临时**。

`301 Moved Permanently`：

```text
旧地址
↓
永久搬家
↓
新地址
```

意思是：

> 资源已经被永久分配到了新的 URI，以后应该使用新地址。([RFC 编辑器](https://www.rfc-editor.org/info/rfc9110/?utm_source=chatgpt.com))

而 `302 Found`：

```text
旧地址
↓
暂时去另一个地址
```

表示目标资源当前暂时位于另一个 URI，但以后访问时仍应继续以原始 URI 为入口。([RFC 编辑器](https://www.rfc-editor.org/info/rfc9110/?utm_source=chatgpt.com))

所以最简单的区别：

```text
301 → 永久
302 → 临时
```

---
#### 4. 302、303、307 为什么容易混淆？

这三个都涉及临时重定向，但关键区别是：

> **重定向以后 HTTP Method 怎么处理。**

假设原请求是：

```http
POST /orders
```

如果返回：

```text
302 Found
Location: /result
```

由于 HTTP 长期以来的历史兼容行为，一些用户代理会把后续请求转换成：

```http
GET /result
```

RFC 9110 也明确保留了这种兼容行为。([RFC 编辑器](https://www.rfc-editor.org/info/rfc9110/?utm_source=chatgpt.com))

---

`303 See Other` 则更加明确：

```text
POST /orders
      ↓
处理成功
      ↓
303
      ↓
去另一个资源查看结果
      ↓
GET /result
```

它特别适合：

```text
提交表单
↓
服务器执行操作
↓
跳转到结果页面
```

也就是常见的：

```text
POST
↓
Redirect
↓
GET
```

---

而 `307 Temporary Redirect` 最重要的特点就是：

> **不能改变原来的 HTTP Method。**

原来是：

```http
POST /upload
```

307 后仍然必须是：

```http
POST /new-upload
```

而不能自动变成：

```http
GET /new-upload
```

所以：

```text
302
→ 临时重定向
→ 历史原因下 POST 可能变 GET

303
→ 去另一个资源获取结果
→ 通常改成 GET/HEAD

307
→ 临时重定向
→ Method 必须保持
```

RFC 9110 专门引入 307 来明确表达“临时重定向但保持请求方法”的语义。([RFC 编辑器](https://www.rfc-editor.org/info/rfc9110/?utm_source=chatgpt.com))

---
#### 5. 那 301 和 308 又是什么关系？

它们都是：

```text
永久重定向
```

区别和 302 / 307 非常相似。

`301`：

```text
永久迁移
```

但是由于历史行为，如果原请求是 POST，客户端可能在重定向时把它改成 GET。([RFC 编辑器](https://www.rfc-editor.org/info/rfc9110/?utm_source=chatgpt.com))

`308`：

```text
永久迁移 + 必须保持 HTTP Method
```

所以可以形成对应关系：

```text
临时：

302 → 方法可能变化
307 → 保持方法

永久：

301 → 方法可能变化
308 → 保持方法
```

这是面试中非常实用的一组对应关系。([RFC 编辑器](https://www.rfc-editor.org/errata/eid7109?utm_source=chatgpt.com))

---
#### 6. 为什么 304 属于 3xx，却不是普通重定向？

`304 Not Modified` 通常用于**协商缓存**。

第一次请求：

```text
Client                     Server

GET /app.js ─────────────→

          ←────────────── 200 OK
                           ETag: "abc"
                           app.js
```

浏览器保存：

```text
资源 + ETag
```

下一次请求：

```http
GET /app.js
If-None-Match: "abc"
```

服务器检查以后发现：

```text
资源没变
```

于是返回：

```text
304 Not Modified
```

这时候服务器不需要再把完整的 `app.js` 发回来。

客户端直接：

```text
使用本地已有缓存
```

所以：

```text
304
≠
跳转到另一个 URL

304
=
服务器告诉客户端：
你已有的那份资源仍然有效，继续使用
```

RFC 9110 将 304 归入 3xx，是因为客户端需要转而使用自己已经保存的表示完成本次请求。([RFC 编辑器](https://www.rfc-editor.org/info/rfc9110/?utm_source=chatgpt.com))

---
#### 7. 400、401、403、404 怎么区分？

这四个都是非常高频的状态码。

**400 Bad Request**

表示：

> 服务器认为请求本身存在问题，无法或不愿按照当前请求进行处理。

常见场景：

```text
请求格式错误、非法参数、协议格式异常
```

---

**401 Unauthorized**

这个名字容易让人误认为：

> “没有权限。”

其实 401 更准确地理解为：

> **当前请求缺少有效的身份认证凭证。**

例如：

```text
访问个人中心
↓
没有登录凭证
↓
401
```

所以重点是：

```text
你是谁？
还没有被有效证明
```

---

**403 Forbidden**

403 表示：

> 服务器理解这个请求，但拒绝执行。

例如：

```text
普通用户已经登录
↓
请求管理员后台
↓
403
```

所以：

```text
401
→ 身份认证有问题

403
→ 已经能够理解你的请求，但不给你执行权限
```

可以记成：

```text
401 → “你是谁？”

403 → “知道了，但你不能访问。”
```

---

**404 Not Found**

最典型是：

```text
目标资源不存在
```

例如：

```http
GET /users/999999
```

服务器没有这个资源：

```text
404 Not Found
```

此外出于安全或隐藏资源存在性的需要，服务器也可以在某些情况下选择不透露目标资源是否存在。

---
#### 8. 404 和 405 有什么区别？

假设服务器存在：

```text
/users/1001
```

GET 是支持的：

```http
GET /users/1001

→ 200
```

但是服务器不允许：

```http
POST /users/1001
```

那么可能返回：

```text
405 Method Not Allowed
```

所以：

```text
404
→ 资源本身找不到

405
→ 资源存在
→ 但是这个 HTTP Method 不允许
```

例如：

```text
DELETE /news/1
```

如果 `/news/1` 根本不存在：

```text
404
```

如果 `/news/1` 存在，但是接口只允许 GET：

```text
405
```

---
#### 9. 429 是什么？

`429 Too Many Requests` 表示：

> **客户端在一定时间内发送了太多请求。**

也就是典型的：

```text
Rate Limiting
限流
```

例如服务器规定：

```text
每个用户
每分钟最多 100 次 API 请求
```

客户端发送第 101 次：

```text
429 Too Many Requests
```

服务器还可以返回：

```http
Retry-After: 60
```

告诉客户端：

```text
60 秒以后再试
```

因此 429 常见于：

```text
API 限流、防止接口滥用、防止爬虫过度请求、保护服务器容量
```

RFC 6585 专门定义了 429，并允许使用 `Retry-After` 表达建议等待时间。([RFC 编辑器](https://www.rfc-editor.org/info/rfc6585/?utm_source=chatgpt.com))

---
#### 10. 500、502、503、504 怎么区分？

这四个都属于：

```text
服务器侧错误
```

但发生的位置不同。

**500 Internal Server Error**

可以理解为：

```text
请求到服务器
↓
服务器自己处理时出错
```

例如：

```text
程序异常、未捕获异常、数据库操作触发错误、内部逻辑错误
```

所以 500 是一个比较通用的服务器内部错误。

---

**502 Bad Gateway**

重点是：

> **当前服务器作为网关或代理，从上游服务器获得了无效响应。**

例如架构：

```text
Browser
   ↓
Nginx
   ↓
Backend
```

如果 Nginx 请求 Backend：

```text
Backend 返回异常/无效响应
```

Nginx 可能向浏览器返回：

```text
502 Bad Gateway
```

所以可以理解为：

```text
网关找上游
↓
上游“回了”
↓
但是回得不对
↓
502
```

---

**503 Service Unavailable**

表示：

> 服务器当前暂时无法处理请求。

典型：

```text
服务器过载、服务器维护、服务临时不可用
```

它强调：

```text
服务现在不可用
但可能只是暂时的
```

---

**504 Gateway Timeout**

也是网关/代理场景。

例如：

```text
Browser
   ↓
Nginx
   ↓
Backend
```

Nginx 已经把请求发给 Backend：

```text
等……、等……、等……
```

超过规定时间 Backend 还没返回：

```text
504 Gateway Timeout
```

所以区分 502 和 504 最好记：

```text
502
→ 上游返回了
→ 但是响应无效

504
→ 上游迟迟没有在规定时间内响应
```

可以画成：

```text
Client
  ↓
Gateway / Nginx
  ↓
Upstream Server

上游响应有问题
→ 502

上游响应超时
→ 504
```

---
#### 最后如何快速判断状态码？

面试中可以直接建立下面这棵判断树：

```text
HTTP 请求
│
├─ 只是中间信息、仍需继续？
│      └─ 1xx
│
├─ 已经成功？
│      └─ 2xx
│
├─ 需要进一步动作？
│      ├─ 换 URI
│      └─ 使用缓存
│             └─ 3xx
│
├─ 请求侧有问题？
│      ├─ 请求错误 → 400
│      ├─ 没认证 → 401
│      ├─ 没权限 → 403
│      ├─ 没资源 → 404
│      ├─ Method 不允许 → 405
│      └─ 请求太频繁 → 429
│
└─ 服务器侧失败？
       ├─ 内部错误 → 500
       ├─ 上游响应无效 → 502
       ├─ 服务暂不可用 → 503
       └─ 上游超时 → 504
```

其中几组最容易混淆的状态码，可以单独记成：

```text
401 vs 403
401 → 认证问题
403 → 权限问题

404 vs 405
404 → 资源不存在
405 → 资源存在，但 Method 不允许

301 vs 302
301 → 永久重定向
302 → 临时重定向

302 vs 307
302 → POST 可能因历史行为变 GET
307 → Method 必须保持

301 vs 308
301 → 永久，但 Method 可能变化
308 → 永久，并保持 Method

502 vs 504
502 → 上游响应无效
504 → 等上游超时
```

最终面试时可以收敛为：

> **HTTP 状态码分为五类：1xx 表示信息性响应，2xx 表示成功，3xx 表示还需要进一步动作，4xx 表示请求侧存在问题，5xx 表示服务器侧处理失败。常见的成功码中，200 表示一般成功，201 表示创建资源成功，202 表示已接受但尚未处理完成，204 表示成功但无响应内容；重定向中，301/302 分别表示永久和临时重定向，307/308 则明确保持原请求方法，304 用于缓存验证；客户端错误中重点区分 401 的认证问题和 403 的权限问题；服务器错误中重点区分 500 的服务器内部错误、502 的无效上游响应、503 的服务暂不可用和 504 的上游响应超时。** ([RFC 编辑器](https://www.rfc-editor.org/info/rfc9110/?utm_source=chatgpt.com))

---

**Sources:**

- [RFC 9110: HTTP Semantics | RFC Editor](https://www.rfc-editor.org/info/rfc9110/?utm_source=chatgpt.com)

## 第25题 HTTPS/TLS 能防御哪些网络攻击？它的安全边界是什么？

### 题目

HTTPS/TLS 能防御哪些网络攻击？它的安全边界是什么？

### 问题

1. 在没有 HTTPS/TLS 保护的 HTTP 通信中，为什么会面临**窃听、篡改和身份伪造**等风险？
2. TLS 提供的**机密性（Confidentiality）**、**完整性（Integrity）**和**身份认证（Authentication）**分别解决什么问题？
3. 什么叫**窃听攻击（Eavesdropping）**？TLS 是如何让攻击者即使抓到网络数据，也无法直接读取 HTTP 请求和响应内容的？
4. 什么叫**中间人攻击（MITM）**？为什么“只对数据进行加密”还不足以抵御中间人攻击？数字证书和证书链在这里发挥什么作用？
5. 什么叫**数据篡改攻击**？TLS 如何让通信双方发现传输的数据被修改？
6. **身份伪造**与中间人攻击有什么关系？浏览器为什么需要校验证书中的域名、有效期和证书链？
7. HTTPS 是否意味着攻击者一定无法窃取用户的 Cookie 或登录状态？TLS 对**会话劫持**能提供什么保护，又不能解决哪些问题？
8. TLS 能否简单理解为“可以彻底防止重放攻击”？TLS 层的防重放能力和应用层防止“重复下单、重复支付”等业务重放有什么区别？
9. 什么叫**协议降级攻击（Downgrade Attack）**？为什么现代 TLS 需要防止客户端和服务器被诱导使用过时的协议版本或弱算法？
10. 最终应该如何理解 HTTPS/TLS 的安全边界：它主要保护的是**通信链路**，还是能够同时解决钓鱼网站、XSS、服务器被入侵、业务权限漏洞等所有 Web 安全问题？

### 回答要点

核心要点如下：
#### 1. HTTPS/TLS 主要解决三类通信安全问题

- **机密性**：网络中的第三方不能直接读取通信明文。
- **完整性**：通信数据被修改后能够被检测出来。
- **身份认证**：客户端能够确认自己连接的是预期服务器，而不是冒充者。
- TLS 1.3 将这三类能力作为安全通道的重要目标。([RFC 编辑器](https://www.rfc-editor.org/info/rfc8446/?utm_source=chatgpt.com))
#### 2. 窃听攻击

- HTTP 明文在传输链路上可能被能够观察流量的攻击者直接获取。
- TLS 建立共享密钥后，对应用数据进行加密。
- 攻击者即使截获网络数据，通常只能看到密文，不能直接恢复 HTTP 内容。([RFC 编辑器](https://www.rfc-editor.org/info/rfc8446/?utm_source=chatgpt.com))
#### 3. 中间人攻击

- 攻击者插入客户端与服务器之间，同时冒充双方。
- 如果只是“拿到一个公钥就加密”，客户端无法确定这个公钥是不是真正服务器的。
- 因此 TLS 需要使用证书和 PKI，将服务器身份与公钥绑定起来，并由客户端验证证书链和服务器身份。([RFC 编辑器](https://www.rfc-editor.org/rfc//rfc5280?utm_source=chatgpt.com))
#### 4. 数据篡改

- TLS 不仅加密，还提供完整性保护。
- 攻击者修改受保护的数据后，接收方无法通过认证校验，从而发现数据被篡改。([RFC 编辑器](https://www.rfc-editor.org/info/rfc8446/?utm_source=chatgpt.com))
#### 5. 证书校验

- 浏览器不是看到“有证书”就信任服务器。
- 需要验证证书链是否能建立到受信任根，以及服务器身份是否与访问目标匹配。
- 身份匹配是防止攻击者拿其他服务器的有效证书冒充当前网站的重要环节。([RFC 编辑器](https://www.rfc-editor.org/rfc//rfc5280?utm_source=chatgpt.com))
#### 6. TLS 可以降低网络窃取 Cookie 的风险，但不能保证 Cookie 永远不会被盗

- Cookie 通过 HTTPS 传输时，能够受到 TLS 的链路加密保护。
- `Secure` Cookie 可以限制浏览器只在安全通道中发送 Cookie。
- 但 Cookie 仍可能受到应用层漏洞、终端失陷、错误配置等影响，因此还需要 `Secure`、`HttpOnly`、`SameSite`、会话管理等额外措施。RFC 6265 也明确指出，单靠传输层加密不能解决 Cookie 的全部安全问题。([RFC 编辑器](https://www.rfc-editor.org/info/rfc6265/?utm_source=chatgpt.com))
#### 7. TLS 不能简单理解为“彻底防止所有重放攻击”

- 普通 TLS 1.3 记录层具有顺序保护和防止同一记录被重复接受的机制。
- 但是 TLS 1.3 的 `0-RTT` 数据明确没有跨连接的完整防重放保证。
- 更重要的是，“重复支付”“重复下单”属于业务语义问题，仍需要业务层的幂等键、唯一流水号、nonce、状态检查等机制。([RFC 编辑器](https://www.rfc-editor.org/info/rfc8446/?utm_source=chatgpt.com))
#### 8. 协议降级攻击

- 攻击者试图干扰协商过程，让双方使用更旧的协议版本或更弱的安全参数。
- TLS 1.3 专门设计了降级保护机制，防止网络攻击者任意改变双方最终协商的安全参数。([RFC 编辑器](https://www.rfc-editor.org/info/rfc8446/?utm_source=chatgpt.com))
#### 9. TLS 的核心安全边界是通信链路

- 它保护客户端与服务器之间传输的数据。
- 它不能自动解决：
  - XSS；
  - 业务越权；
  - SQL 注入；
  - 服务器已经被攻击者控制；
  - 用户主动进入了另一个攻击者自己的合法 HTTPS 网站。
- 因此：
  > **HTTPS 表示“你和当前认证服务器之间的通信受到保护”，不等于“这个网站的所有代码和业务都一定安全”。**

---

### 标准回答

HTTPS 可以理解为：

```text
HTTP + TLS 安全通道
```

TLS 最核心解决的是网络通信中的三个安全问题：

```text
机密性 + 完整性 + 身份认证
```

也就是说：

```text
防止别人直接看 + 防止别人偷偷改 + 确认你到底在跟谁通信
```

TLS 1.3 的标准安全目标中就明确包括通信内容的机密性和完整性，同时握手协议承担通信双方认证、参数协商以及密钥建立等任务。([RFC 编辑器](https://www.rfc-editor.org/info/rfc8446/?utm_source=chatgpt.com))
#### 1. TLS 如何防窃听？

假设使用普通 HTTP：

```text
Browser
   ↓
username=Tom&password=123456
   ↓
Server
```

如果攻击者能够观察网络链路，那么明文内容可能直接暴露。

而 HTTPS 建立 TLS 连接之后：

```text
HTTP 明文
   ↓
TLS 加密
   ↓
密文
   ↓
网络传输
   ↓
TLS 解密
   ↓
HTTP 明文
```

攻击者即使抓到了数据：

```text
Client ── 密文 ──→ Attacker ── 密文 ──→ Server
```

通常也不能直接读取里面的：

```text
URL 请求内容、Cookie、表单数据、JSON、HTML
```

因为实际应用数据由握手建立出来的通信密钥进行保护。TLS 1.3 的安全模型要求建立安全通道以后，应用数据对非通信端点保持机密。([RFC 编辑器](https://www.rfc-editor.org/info/rfc8446/?utm_source=chatgpt.com))

因此：

> **窃听攻击主要由 TLS 的机密性解决。**

---
#### 2. 为什么仅仅“加密”还不能解决中间人攻击？

这是本题最关键的地方。

假设客户端想访问真正的服务器：

```text
Client
   ↓
Server
```

攻击者插到中间：

```text
Client
   ↓
Attacker
   ↓
Server
```

如果客户端只是要求：

> “给我一个公钥，我用这个公钥加密。”

攻击者完全可以告诉客户端：

```text
这是服务器公钥
```

实际上给的是：

```text
攻击者自己的公钥
```

于是可能形成：

```text
Client
↓
与攻击者建立加密通信
↓
Attacker
↓
再和真实 Server 建立另一条加密通信
```

此时：

```text
两边都是“加密的”
```

但是客户端加密给了**错误的人**。

所以：

> **加密只能解决“别人能不能看”，不能自动解决“你究竟在和谁加密”。**

因此 TLS 还必须做：

> **服务器身份认证。**

---

服务器会提供数字证书。

证书最核心的意义可以理解为：

```text
域名 / 服务身份
        +
服务器公钥
        ↓
由可信 CA 进行签名证明
```

浏览器会检查证书链：

```text
服务器证书
   ↓
中间 CA
   ↓
根 CA
   ↓
浏览器信任库
```

同时还要检查服务器身份是否与自己真正想访问的服务相匹配。PKIX 的证书路径验证负责验证证书链中的身份与公钥绑定，而当前 TLS 服务身份标准要求客户端验证目标 DNS 名称或其他参考身份。([RFC 编辑器](https://www.rfc-editor.org/rfc//rfc5280?utm_source=chatgpt.com))

因此：

```text
TLS 加密
→ 防止别人读取数据

数字证书
→ 证明公钥到底属于谁

证书链
→ 证明这份证书为什么值得信任

服务器身份匹配
→ 确认当前证书确实适用于我要访问的目标
```

所以：

> **中间人攻击主要依靠“身份认证 + 密钥协商 + 加密 + 完整性保护”共同抵御，而不是只靠加密。**

---
#### 3. TLS 怎么防止数据被偷偷修改？

假设客户端发送：

```text
amount=100
```

攻击者想在网络中改成：

```text
amount=10000
```

如果协议只有普通加密而没有完整性保护，那么理论上仍需要考虑数据是否能够被恶意修改的问题。

现代 TLS 使用经过认证的加密机制保护数据。

可以概念化理解成：

```text
原始数据
   ↓
加密 + 完整性认证
   ↓
发送
```

接收方：

```text
收到数据
   ↓
验证完整性
   ↓

正确
→ 接受

被修改
→ 验证失败
→ 拒绝
```

因此攻击者如果把 TLS 保护的数据修改了：

```text
原密文
↓
篡改
↓
新密文
```

接收端无法通过认证检查。

TLS 1.3 明确要求记录层提供完整性：攻击者不能制造一个不同的记录而仍让接收方正常接受。([RFC 编辑器](https://www.rfc-editor.org/info/rfc8446/?utm_source=chatgpt.com))

因此：

> **篡改攻击主要由 TLS 的完整性保护解决。**

---
#### 4. 为什么浏览器还要校验证书里的身份、证书链等信息？

因为：

> **“这是一张合法证书”与“这就是我要访问的网站”不是完全相同的问题。**

假设攻击者自己合法拥有：

```text
attacker.example
```

的证书。

这确实可能是一张有效证书。

但是你访问的是：

```text
bank.example
```

攻击者不能拿：

```text
attacker.example 的证书
```

来证明：

```text
我是 bank.example
```

因此客户端除了建立证书信任链，还必须验证：

```text
证书声明的服务器身份
        ↓
是否与自己真正访问的服务相匹配
```

当前 TLS 服务身份验证标准明确要求客户端对 DNS 名称等参考身份进行匹配。([RFC 编辑器](https://www.rfc-editor.org/info/rfc9525/?utm_source=chatgpt.com))

整个逻辑可以理解为：

```text
证书链正确
↓
这个证书确实来自可信体系

身份匹配
↓
这个证书确实适用于我要访问的服务器

两者都满足
↓
才可以认为服务器身份认证成立
```

---
#### 5. HTTPS 能不能防止 Cookie 被盗？

需要分情况。

如果攻击者只是：

```text
在网络链路中抓包
```

HTTPS 能很好地保护 Cookie 的传输内容。

例如：

```http
Cookie: session_id=abc123
```

在 HTTPS 中不会直接以 HTTP 明文形式暴露给普通网络窃听者。

而 Cookie 还可以设置：

```http
Secure
```

告诉浏览器只通过安全通道发送该 Cookie。([RFC 编辑器](https://www.rfc-editor.org/info/rfc6265/?utm_source=chatgpt.com))

但是：

> **HTTPS 并不意味着 Cookie 永远不会泄露。**

因为 Cookie 还可能从其他位置出问题。

例如：

```text
应用自身漏洞、终端被恶意软件控制、错误的 Cookie 配置、脚本攻击、服务端会话泄漏
```

因此 Web 应用通常还会组合：

```text
HTTPS + Secure + HttpOnly + SameSite + 合理的 Session 管理
```

RFC 6265 也专门强调，HTTPS 的传输层加密不能单独解决 Cookie 机制的所有安全问题。([RFC 编辑器](https://www.rfc-editor.org/rfc/rfc6265.html?utm_source=chatgpt.com))

所以可以记：

```text
TLS
→ 保护 Cookie “在路上”

Cookie 安全策略
→ 进一步保护 Cookie 的使用

应用安全
→ 防止其他渠道把 Cookie 偷走
```

---
#### 6. TLS 能不能彻底防止重放攻击？

不能这么说。

这一点需要区分：

```text
TLS 协议层重放
```

和：

```text
业务层重复操作
```

TLS 1.3 的普通记录层具有顺序保护和防止已接受记录被再次正常接受的机制。([RFC 编辑器](https://www.rfc-editor.org/info/rfc8446/?utm_source=chatgpt.com))

但是 TLS 1.3 还有一个特别重要的例外：

```text
0-RTT Early Data
```

TLS 1.3 标准明确指出：

> 0-RTT 数据不具备跨连接的完整防重放保证。([RFC 编辑器](https://www.rfc-editor.org/info/rfc8446/?utm_source=chatgpt.com))

因此不能简单说：

```text
TLS = 所有重放攻击全部解决
```

---

更加重要的是：

假设用户发送：

```http
POST /pay
amount=100
```

应用服务器成功执行：

```text
支付 100 元
```

如果由于业务设计问题，相同业务请求又被合法地提交一次：

```text
再次支付 100 元
```

TLS 并不知道：

```text
“这个业务动作只能执行一次”
```

因为 TLS 只负责：

```text
安全传输字节
```

它并不理解：

```text
这是支付、这是订单、这笔业务只能执行一次
```

所以业务层仍然需要：

```text
订单号、唯一请求 ID、幂等键、nonce、时间戳、服务端状态检查
```

等机制。

因此：

> **TLS 防止的是传输协议层面的非法记录重放，而“重复下单、重复支付”属于业务语义，需要应用层自己保证幂等性和唯一性。**

---
#### 7. 什么是协议降级攻击？

假设：

```text
客户端支持 TLS 1.3
服务器也支持 TLS 1.3
```

正常应该协商：

```text
TLS 1.3
```

攻击者希望把协商过程干扰成：

```text
TLS 1.0
或
某种更弱的配置
```

这样就叫：

> **Downgrade Attack，协议降级攻击。**

攻击思路可以概念化成：

```text
Client
支持强协议
   ↓
Attacker 干扰协商
   ↓
Server
   ↓
双方误以为只能使用较弱协议
```

TLS 1.3 为此专门提供降级检测和握手完整性保护，目标就是让网络中的攻击者无法任意改变双方最终协商出来的安全参数。([RFC 编辑器](https://www.rfc-editor.org/info/rfc8446/?utm_source=chatgpt.com))

所以：

> **协议协商本身也必须受到保护，否则攻击者可能让双方“主动”选择一个更弱的安全方案。**

---
#### 8. 最重要的是：TLS 到底保护什么？

可以把整个 HTTPS/TLS 的职责收敛为：

```text
Client
        ⇄
     网络链路
        ⇄
Server
```

TLS 重点保护的是中间这一段：

```text
通信链路
```

它主要保证：

```text
别人不能直接看
→ Confidentiality

别人不能偷偷改
→ Integrity

我要确认对面是谁
→ Authentication
```

但它并不能自动解决网站内部的所有安全问题。

例如：

```text
XSS
```

如果网站自己允许恶意 JavaScript 在页面上下文中运行，TLS 不能自动修复代码漏洞。

又例如：

```text
服务器已经被攻击者控制
```

这时 TLS 仍然可能建立：

```text
Client ⇄ 被控制的 Server
```

通信本身还是加密的，但服务器内部已经不可信。

再例如攻击者自己建立：

```text
https://fake-bank.example
```

并合法获得：

```text
fake-bank.example
```

的证书。

这说明：

```text
你和 fake-bank.example
之间的通信是安全的
```

并不能说明：

```text
fake-bank.example
就是真正的银行
```

TLS 认证的是：

> **“当前连接的服务器身份是否与这个域名/服务匹配”。**

而不是：

> **“这个网站的商业身份和页面内容一定可信”。**

因此这一题最核心的边界是：

```text
HTTPS/TLS
        ↓
解决网络通信安全

不等于
        ↓
解决所有 Web 安全
```

最终面试时可以收敛成：

> **HTTPS 本质上是 HTTP 运行在 TLS 提供的安全通道之上。TLS 主要提供三类能力：机密性用于防止网络窃听，完整性用于发现数据篡改，身份认证通过证书和证书链确认通信服务器的身份，从而抵御中间人冒充。它还能保护 Cookie 等敏感数据在网络传输过程中的机密性，但不能保证 Cookie 不会通过 XSS、终端失陷或应用漏洞等其他方式泄露。TLS 也不能简单理解为彻底解决所有重放攻击，尤其 TLS 1.3 的 0-RTT 数据存在重放风险，而重复支付、重复下单等业务重放仍需应用层通过幂等键、唯一请求标识等机制处理。最终，TLS 主要保护的是客户端与正确服务器之间的通信链路，并不能替代 XSS 防护、权限控制、服务器安全和业务安全。** ([RFC 编辑器](https://www.rfc-editor.org/info/rfc8446/?utm_source=chatgpt.com))

---

**Sources:**

- [RFC 8446: The Transport Layer Security (TLS) Protocol Version 1.3 | RFC Editor](https://www.rfc-editor.org/info/rfc8446/?utm_source=chatgpt.com)

## 第26题 Promise 是什么？它为什么能解决异步代码组织问题？

### 题目

Promise 是什么？它为什么能解决异步代码组织问题？

### 问题

1. JavaScript 中为什么需要异步编程？如果耗时操作都采用同步等待，会产生什么问题？
2. 在 Promise 出现之前，异步结果通常如何通过回调函数处理？为什么多个存在依赖关系的异步操作容易形成“回调地狱”？
3. **Promise 本质上是什么？** Promise 本身是否等于一个异步任务？
4. Promise 有哪三种状态？`pending`、`fulfilled`、`rejected` 分别表示什么？
5. Promise 的状态为什么具有不可逆性？`fulfilled` 之后还能变成 `rejected` 吗？
6. `resolve()` 和 `reject()` 分别有什么作用？调用 `resolve()` 是否一定意味着 Promise 立即进入 `fulfilled`？
7. `then()`、`catch()`、`finally()` 分别有什么作用？
8. 为什么 Promise 可以进行链式调用？`then()` 返回的是原来的 Promise 还是一个新的 Promise？
9. `then()` 回调返回普通值、抛出异常、返回另一个 Promise 时，后续 Promise 分别会发生什么？
10. Promise 是否把异步任务变成了同步任务？它真正解决的问题是什么？
11. `Callback → Promise → async/await` 之间应该如何理解？`async/await` 和 Promise 是替代关系吗？

---

### 回答要点

#### 1. Promise 是“未来结果”的抽象

- ECMAScript 将 Promise 定义为一个对象，用来表示某个延迟计算最终产生的结果。
- Promise 本身不是“异步任务”的同义词，而是对异步或延迟结果进行统一表示和组合的机制。([TC39](https://tc39.es/ecma262/multipage/control-abstraction-objects.html?utm_source=chatgpt.com))
#### 2. Promise 有三种状态

- `pending`：尚未确定最终结果。
- `fulfilled`：操作成功完成，并具有 fulfillment value。
- `rejected`：操作失败，并具有 rejection reason。
- `fulfilled` 和 `rejected` 统称 `settled`。([TC39](https://tc39.es/ecma262/multipage/control-abstraction-objects.html?utm_source=chatgpt.com))
#### 3. 状态一旦 settled 就不会再次改变

```text
pending → fulfilled
pending → rejected
```
一旦进入 `fulfilled` 或 `rejected`，后续再次尝试改变结果不会产生作用。([TC39](https://tc39.es/ecma262/multipage/control-abstraction-objects.html?utm_source=chatgpt.com))
#### 4. 注意：resolved 不完全等于 fulfilled

- 调用 `resolve(value)` 时，如果 `value` 是普通值，通常最终会 fulfilled。
- 如果 `value` 是另一个 Promise 或 thenable，当前 Promise 会采用它的最终状态。
- 因此 Promise 可能已经 **resolved**，但暂时仍然是 `pending`。
- 这是 Promise 高频易错点。([TC39](https://tc39.es/ecma262/multipage/control-abstraction-objects.html?utm_source=chatgpt.com))
#### 5. `then()` 是 Promise 链的核心

- `then(onFulfilled, onRejected)` 注册结果处理逻辑。
- 每次调用 `then()` 都会创建并返回一个**新的 Promise**。
- 因此才能把多个操作连续组合起来。ECMAScript 的 `Promise.prototype.then` 明确会创建新的 Promise capability，并返回其 Promise。([TC39](https://tc39.es/ecma262/pr/3770/multipage/control-abstraction-objects.html?utm_source=chatgpt.com))
#### 6. `then()` 回调的返回结果决定新 Promise

- 返回普通值 → 后续 Promise 通常以该值 fulfilled。
- 抛出异常 → 后续 Promise rejected。
- 返回 Promise/thenable → 后续 Promise 采用其最终结果。
#### 7. `catch()`

- 本质上相当于：
  ```js
  promise.then(undefined, onRejected)
  ```
- 用于处理 Promise 链中的 rejection。([TC39](https://tc39.es/ecma262/pr/3770/multipage/control-abstraction-objects.html?utm_source=chatgpt.com))
#### 8. `finally()`

- 无论前一个 Promise fulfilled 还是 rejected，都会执行收尾逻辑。
- 常用于清理状态，例如关闭 loading。
- 正常情况下不会把前面的成功值或失败原因替换掉；如果 `finally` 自己抛错或产生 rejected Promise，则会影响后续结果。([TC39](https://tc39.es/ecma262/pr/3770/multipage/control-abstraction-objects.html?utm_source=chatgpt.com))
#### 9. Promise 没有把异步变成同步

- Promise 改变的是**异步结果的表达和组合方式**。
- 它让成功处理、失败传播和多步骤异步流程有统一模型。
#### 10. `async/await` 建立在 Promise 机制之上

 - `async` 函数使用 Promise 表达最终完成结果。
 - `await` 会暂停当前 async 函数的后续执行，等待对应结果后再恢复，而不是阻塞整个 JavaScript 执行线程。([TC39](https://tc39.es/ecma262/2025/multipage/control-abstraction-objects.html?utm_source=chatgpt.com))

---

### 标准回答

Promise 是 JavaScript 用来处理异步结果的核心抽象。按照 ECMAScript 的定义，**Promise 是一个表示延迟计算最终结果的对象**。所以更准确地说，Promise 不是“异步任务本身”，而是对一个现在可能还没有得到、未来才会确定的结果进行封装。([TC39](https://tc39.es/ecma262/multipage/control-abstraction-objects.html?utm_source=chatgpt.com))
#### 1. Promise 为什么会出现？

传统异步操作可以通过回调函数处理。

例如有三个依赖关系：

```text
获取用户
↓
根据用户获取订单
↓
根据订单获取详情
```

使用嵌套回调可能写成：

```js
getUser(function (user) {
  getOrders(user.id, function (orders) {
    getDetail(orders[0].id, function (detail) {
      console.log(detail)
    })
  })
})
```

当异步步骤越来越多时：

```text
Callback
└─ Callback
   └─ Callback
      └─ Callback
```

容易出现几个问题：

```text
嵌套越来越深、控制流程不直观、错误处理容易分散、多个异步操作不容易组合
```

Promise 提供了一套统一的：

```text
结果表示 + 状态管理 + 结果传递 + 错误传播
```

机制，使异步流程可以从“嵌套回调”转变成更容易组合的链式结构。

---
#### 2. Promise 到底是什么？

可以把 Promise 理解成：

> **现在先拿到一个对象，这个对象代表未来会确定的结果。**

例如：

```js
const promise = getUser()
```

此时用户数据可能还没有回来，但 `promise` 已经可以代表这个未来结果。

整个过程可以理解为：

```text
Promise
│
├─ 结果还没确定
│   → pending
│
├─ 最终成功
│   → fulfilled
│
└─ 最终失败
    → rejected
```

ECMAScript 规范明确规定 Promise 有且只有这三个互斥状态。([TC39](https://tc39.es/ecma262/multipage/control-abstraction-objects.html?utm_source=chatgpt.com))

---
#### 3. Promise 的三种状态

Promise 初始通常处于：

```text
pending
```

后续可能变成：

```text
pending
↓
fulfilled
```

表示成功。

或者：

```text
pending
↓
rejected
```

表示失败。

其中：

```text
fulfilled
+
rejected
=
settled
```

一旦 Promise 已经 settled，最终结果就确定了。

因此不能：

```text
fulfilled
↓
rejected
```

也不能：

```text
rejected
↓
fulfilled
```

对已经确定结果的 Promise 再进行 resolve 或 reject，不会再次修改它的最终结果。([TC39](https://tc39.es/ecma262/multipage/control-abstraction-objects.html?utm_source=chatgpt.com))

---
#### 4. `resolve()` 和 `reject()` 怎么理解？

创建 Promise：

```js
const p = new Promise((resolve, reject) => {
  // ...
})
```

如果操作失败，可以：

```js
reject(error)
```

让 Promise 以对应的失败原因进入 rejected 状态。

但 `resolve()` 有一个很容易答错的地方：

> **调用 `resolve()` 不一定等于“立即 fulfilled”。**

例如：

```js
const p1 = new Promise(resolve => {
  resolve(100)
})
```

这里传进去的是普通值，所以最终得到：

```text
fulfilled
value = 100
```

但如果：

```js
const p2 = new Promise(resolve => {
  resolve(otherPromise)
})
```

那么 `p2` 会采用 `otherPromise` 的最终结果。

因此可能出现：

```text
p2 已经 resolved
↓
otherPromise 仍然 pending
↓
p2 暂时仍然 pending
```

所以严格区分：

```text
resolved
≠
一定已经 fulfilled
```

Promise 的 `resolved` 和三种状态并不是完全相同的概念。([TC39](https://tc39.es/ecma262/multipage/control-abstraction-objects.html?utm_source=chatgpt.com))

这是 Promise 面试中比较重要的加分点。

---
#### 5. `then()` 为什么可以链式调用？

例如：

```js
getUser()
  .then(user => getOrders(user.id))
  .then(orders => getDetail(orders[0].id))
  .then(detail => {
    console.log(detail)
  })
```

关键不是“`then` 可以一直写”。

真正的原因是：

> **每次调用 `then()` 都会返回一个新的 Promise。**

规范中的逻辑可以概念化成：

```text
Promise1
↓
then()
↓
创建 Promise2
↓
返回 Promise2
↓
then()
↓
创建 Promise3
↓
返回 Promise3
```

因此才形成：

```text
Promise1
  ↓
Promise2
  ↓
Promise3
  ↓
Promise4
```

ECMAScript 对 `Promise.prototype.then()` 的定义明确会为结果创建新的 Promise capability，然后返回对应的新 Promise。([TC39](https://tc39.es/ecma262/pr/3770/multipage/control-abstraction-objects.html?utm_source=chatgpt.com))

所以：

```js
const p2 = p1.then(fn)
```

通常：

```js
p1 !== p2
```

---
#### 6. `then()` 返回什么，会发生什么？

这是理解 Promise 链的核心。

假设：

```js
const p2 = p1.then(value => {
  return ???
})
```

主要有三种情况。

**第一种：返回普通值**

```js
p1.then(() => {
  return 100
})
```

新的 Promise 最终会得到：

```text
fulfilled
value = 100
```

于是：

```js
Promise.resolve()
  .then(() => 100)
  .then(value => {
    console.log(value) // 100
  })
```

---

**第二种：抛出异常**

```js
Promise.resolve()
  .then(() => {
    throw new Error('失败')
  })
```

新 Promise 会变成 rejected：

```text
throw Error
↓
新的 Promise rejected
↓
后续 rejection handler / catch 可以处理
```

因此：

```js
Promise.resolve()
  .then(() => {
    throw new Error('失败')
  })
  .catch(error => {
    console.log(error)
  })
```

---

**第三种：返回另一个 Promise**

```js
getUser()
  .then(user => {
    return getOrders(user.id)
  })
  .then(orders => {
    console.log(orders)
  })
```

后一个 Promise 会采用返回 Promise 的最终结果。

因此：

```text
获取用户
↓
等待用户结果
↓
获取订单
↓
等待订单结果
↓
继续下一步
```

这就是为什么 Promise 可以非常自然地表达**存在依赖关系的异步操作**。

---
#### 7. `then()`、`catch()`、`finally()` 怎么区分？

最简单可以记：

```text
then
→ 处理结果并继续链式转换

catch
→ 处理 rejected

finally
→ 无论成功失败都执行收尾逻辑
```

例如：

```js
showLoading()

request()
  .then(data => {
    render(data)
  })
  .catch(error => {
    showError(error)
  })
  .finally(() => {
    hideLoading()
  })
```

其中 `catch(onRejected)` 在规范上相当于：

```js
then(undefined, onRejected)
```

([TC39](https://tc39.es/ecma262/pr/3770/multipage/control-abstraction-objects.html?utm_source=chatgpt.com))

`finally()` 更适合：

```text
关闭 loading、释放资源、恢复按钮状态
```

因为这些操作通常不关心前面到底成功还是失败。

---
#### 8. Promise 有没有把异步变成同步？

**没有。**

例如：

```js
console.log(1)

Promise.resolve().then(() => {
  console.log(2)
})

console.log(3)
```

Promise 没有把异步流程变成：

```text
1
2
3
```

Promise 解决的是：

> **如何表示、组合和传递异步操作的结果。**

所以不要回答：

> “Promise 可以把异步代码变成同步代码。”

更准确的说法是：

> **Promise 没有改变异步执行本身，而是提供了一套结构化的异步结果管理机制。**

至于 `then()` 回调具体什么时候执行，属于下一层 **Promise Job / 微任务 / Event Loop** 的知识点，可以之后再展开。

---
#### 9. Callback、Promise、async/await 是什么关系？

可以理解为三种不同层次的异步代码组织方式。

最基础的是：

```text
Callback
```

例如：

```js
request(result => {
  // 处理结果
})
```

能解决问题，但是多层依赖容易嵌套。

之后出现 Promise：

```text
Callback
↓
Promise
```

将异步结果对象化：

```js
request()
  .then(...)
  .then(...)
  .catch(...)
```

使结果组合和错误传播更加统一。

再往上：

```text
Promise
↓
async / await
```

例如：

```js
async function load() {
  const user = await getUser()
  const orders = await getOrders(user.id)
  const detail = await getDetail(orders[0].id)

  return detail
}
```

它看起来更加接近：

```text
先做 A、再做 B、再做 C
```

但是：

> **`async/await` 并没有取代 Promise，它建立在 Promise 机制之上。**

ECMAScript 对 async function 的执行就是通过 Promise capability 表示其最终结果；`await` 则会暂停当前 async function 的执行，并在等待的结果完成后恢复，而不是阻塞整个执行线程。([TC39](https://tc39.es/ecma262/2025/multipage/control-abstraction-objects.html?utm_source=chatgpt.com))

所以三者可以收敛为：

```text
Callback
→ 用函数接收未来结果

Promise
→ 把未来结果对象化、可组合化

async / await
→ 用更接近同步流程的语法组织 Promise
```
#### 面试收敛回答

> **Promise 是 JavaScript 用来表示延迟或异步操作最终结果的对象。它有 pending、fulfilled 和 rejected 三种状态，一旦进入 fulfilled 或 rejected，最终状态就不会再次改变。Promise 最核心的能力是统一表示成功和失败结果，并通过 `then()` 进行链式组合；每次调用 `then()` 都会返回一个新的 Promise，而回调函数的返回值、抛出的异常或返回的另一个 Promise 会决定这个新 Promise 的结果。`catch()` 用于处理 rejection，`finally()` 用于执行与成功失败无关的收尾逻辑。Promise 并没有把异步变成同步，它解决的是异步结果的表示、组合和错误传播问题；`async/await` 则建立在 Promise 机制之上，用更接近同步流程的语法来组织异步代码。** ([TC39](https://tc39.es/ecma262/multipage/control-abstraction-objects.html?utm_source=chatgpt.com))

---

**Sources:**

- [ECMAScript® 2027 Language Specification](https://tc39.es/ecma262/multipage/control-abstraction-objects.html?utm_source=chatgpt.com)

## 第27题 `Promise.all`、`Promise.race`、`Promise.allSettled` 和 `Promise.any` 有什么区别？

### 题目

`Promise.all`、`Promise.race`、`Promise.allSettled` 和 `Promise.any` 有什么区别？

### 问题

1. 这四个方法分别解决什么类型的 Promise 组合问题？
2. `Promise.all()` 在什么情况下 fulfilled？什么情况下 rejected？
3. `Promise.all()` 的结果顺序取决于任务完成顺序还是输入顺序？
4. `Promise.race()` 是“谁先成功”还是“谁先 settled”？
5. `Promise.allSettled()` 和 `Promise.all()` 有什么核心区别？
6. `Promise.any()` 和 `Promise.race()` 有什么核心区别？
7. `Promise.any()` 什么时候会 rejected？为什么会产生 `AggregateError`？
8. 输入中存在普通值而不是 Promise 时，会怎样处理？
9. 为什么这些方法内部都可以统一处理 Promise、thenable 和普通值？
10. 不同业务场景应该分别选择哪个方法？

---

### 回答要点

#### 1. `Promise.all()`：全部成功才成功

- 等待所有输入项 fulfilled。
- 只要一个输入 rejected，返回的 Promise 就会 rejected。
- 成功结果数组按照**输入顺序**排列，而不是完成顺序。([TC39](https://tc39.es/ecma262/2026/multipage/control-abstraction-objects.html))
#### 2. `Promise.race()`：谁先 settled 就采用谁

- 不区分 fulfilled 和 rejected。
- 第一个 settled 的输入决定返回 Promise 的结果。
- 所以不能说成“谁先成功返回谁”。([TC39](https://tc39.es/ecma262/2026/multipage/control-abstraction-objects.html))
#### 3. `Promise.allSettled()`：等待全部结束

- 不会因为其中一个失败就提前结束。
- 等所有输入都 settled 后 fulfilled。
- 返回每一项的状态和对应的 `value` 或 `reason`。
- 适合需要统计所有任务执行结果的场景。([TC39](https://tc39.es/ecma262/2026/multipage/control-abstraction-objects.html))
#### 4. `Promise.any()`：第一个成功就成功

- 忽略前面的失败，继续等待其他输入。
- 只要有一个 fulfilled，就立即以该值 fulfilled。
- 只有所有输入都 rejected，才会整体 rejected，并产生 `AggregateError`。([TC39](https://tc39.es/ecma262/2026/multipage/control-abstraction-objects.html))
#### 5. 四者的核心判断条件

| 方法 | 什么时候成功 | 什么时候失败 |
|---|---|---|
| `Promise.all` | 全部成功 | 任意一个失败 |
| `Promise.allSettled` | 全部结束后总是成功返回结果集合 | 正常输入情况下不会因某项 rejected 而整体失败 |
| `Promise.race` | 第一个结束的是成功 | 第一个结束的是失败 |
| `Promise.any` | 任意一个成功 | 全部失败 |
#### 6. 普通值也可以传入

- 这些方法接收的是 iterable，不要求每一项本身都是 Promise。
- 每一项都会通过 Promise 构造器对应的 `resolve` 机制进行统一处理。([TC39](https://tc39.es/ecma262/2026/multipage/))

---

### 标准回答

这四个方法本质上都是 **Promise 组合器**，用于把多个异步结果组合成一个新的 Promise。

最核心的区别可以记成：

```text
all
→ 全部成功

allSettled
→ 全部结束

race
→ 第一个结束

any
→ 第一个成功
```
#### 1. `Promise.all()`

例如：

```js
const p1 = Promise.resolve('A')
const p2 = Promise.resolve('B')
const p3 = Promise.resolve('C')

Promise.all([p1, p2, p3])
  .then(result => {
    console.log(result)
  })
```

得到：

```js
['A', 'B', 'C']
```

`Promise.all()` 要求：

> **所有输入都 fulfilled，整体才 fulfilled。**

只要其中一个 rejected：

```js
Promise.all([
  Promise.resolve('A'),
  Promise.reject('error'),
  Promise.resolve('C')
])
```

整体就会 rejected。

因此可以理解成：

```text
A 成功 ─┐
B 成功 ─┼→ 全部成功 → all 成功
C 成功 ─┘
```

如果：

```text
A 成功、B 失败、C ...
```

那么：

```text
B rejected
↓
Promise.all rejected
```

ECMAScript 中 `PerformPromiseAll` 会为每个输入位置保存对应结果，因此最终数组按照**原始迭代顺序**组织，而不是哪个 Promise 先完成就排在前面。([TC39](https://tc39.es/ecma262/2026/multipage/control-abstraction-objects.html))

例如：

```js
const p1 = new Promise(resolve => {
  setTimeout(() => resolve('A'), 3000)
})

const p2 = new Promise(resolve => {
  setTimeout(() => resolve('B'), 1000)
})

Promise.all([p1, p2]).then(console.log)
```

虽然：

```text
B 先完成
A 后完成
```

最终仍然是：

```js
['A', 'B']
```

而不是：

```js
['B', 'A']
```

所以 `all()` 特别适合：

> **多个任务必须全部成功，才能进入下一步。**

例如：

```text
页面初始化
├─ 用户信息
├─ 权限信息
└─ 系统配置

三个都拿到
↓
初始化页面
```

---
#### 2. `Promise.race()`

`race` 的关键字不是：

> 第一个成功。

而是：

> **第一个 settled。**

也就是谁最先变成：

```text
fulfilled
或
rejected
```

谁就决定最终结果。([TC39](https://tc39.es/ecma262/2026/multipage/control-abstraction-objects.html))

例如：

```js
const p1 = new Promise(resolve => {
  setTimeout(() => resolve('A'), 3000)
})

const p2 = new Promise(resolve => {
  setTimeout(() => resolve('B'), 1000)
})

Promise.race([p1, p2])
  .then(console.log)
```

结果：

```text
B
```

但如果：

```js
const p1 = new Promise(resolve => {
  setTimeout(() => resolve('成功'), 3000)
})

const p2 = new Promise((resolve, reject) => {
  setTimeout(() => reject('失败'), 1000)
})
```

那么：

```js
Promise.race([p1, p2])
```

会：

```text
rejected
```

因为最先结束的是失败的 `p2`。

所以：

```text
race
≠
谁先成功用谁

race
=
谁先结束用谁
```

一个典型应用是**超时控制**：

```js
Promise.race([
  requestData(),
  timeout(5000)
])
```

请求和超时 Promise 谁先 settled，就采用谁。

---
#### 3. `Promise.allSettled()`

`allSettled()` 与 `all()` 最大的区别在于：

```text
all
→ 有一个失败就整体失败

allSettled
→ 不管成功失败，都等全部结束
```

ECMAScript 对它的定义就是：等待所有输入 Promise 都 settled 后，再返回每一项的状态快照。([TC39](https://tc39.es/ecma262/2026/multipage/control-abstraction-objects.html))

例如：

```js
Promise.allSettled([
  Promise.resolve('A'),
  Promise.reject('B失败'),
  Promise.resolve('C')
]).then(console.log)
```

概念上得到：

```js
[
  {
    status: 'fulfilled',
    value: 'A'
  },
  {
    status: 'rejected',
    reason: 'B失败'
  },
  {
    status: 'fulfilled',
    value: 'C'
  }
]
```

所以即使：

```text
任务1 成功、任务2 失败、任务3 成功、任务4 失败
```

`allSettled()` 仍然会等到：

```text
1、2、3、4 全部结束
```

然后一次性告诉你：

```text
谁成功、谁失败、成功结果是什么、失败原因是什么
```

因此非常适合：

```text
批量上传、批量删除、批量请求、批量任务执行
```

因为这些场景经常允许：

> **部分成功、部分失败。**

---
#### 4. `Promise.any()`

`any()` 可以理解成：

> **只要有一个成功，我就成功。**

例如：

```js
Promise.any([
  Promise.reject('A失败'),
  Promise.resolve('B成功'),
  Promise.resolve('C成功')
])
```

最终：

```text
fulfilled
value = B成功
```

即使 A 先失败：

```text
A rejected
↓
继续等待
```

不会立刻结束。

直到：

```text
B fulfilled
↓
Promise.any fulfilled
```

所以：

```text
race
→ 第一个结束

any
→ 第一个成功
```

这是二者最重要的区别。

ECMAScript 明确将 `Promise.any` 定义为在某个输入 fulfilled 时短路；如果所有输入都 rejected，则最终以 `AggregateError` rejected。([TC39](https://tc39.es/ecma262/2026/multipage/control-abstraction-objects.html))

例如：

```js
Promise.any([
  Promise.reject('A'),
  Promise.reject('B'),
  Promise.reject('C')
])
.catch(error => {
  console.log(error)
})
```

此时三个都失败：

```text
A rejected
B rejected
C rejected
↓
已经没有成功可能
↓
Promise.any rejected
↓
AggregateError
```

之所以使用 `AggregateError`，是因为这里需要表示：

> **多个 Promise 的失败结果共同导致了最终失败。**

---
#### 5. 为什么普通值也可以传进去？

例如：

```js
Promise.all([
  Promise.resolve(1),
  2,
  Promise.resolve(3)
])
```

最终可以得到：

```js
[1, 2, 3]
```

因为这些 Promise 组合方法并不要求 iterable 中的每一项原本都是 Promise。

规范算法会获取构造器的 Promise resolve 方法，然后对每个输入元素进行统一处理。([TC39](https://tc39.es/ecma262/2026/multipage/))

面试时可以简单理解成类似：

```js
Promise.resolve(item)
```

所以：

```js
2
```

可以被视为：

```js
Promise.resolve(2)
```

thenable 同样可以按照 Promise resolution 机制被处理。

因此：

```text
普通值、Promise、thenable
```

都能够作为这些组合方法的输入。

---
#### 6. 四个方法怎么选？

最容易记的是看**你到底在等什么**：

```text
我要等所有任务都成功
→ Promise.all
```

```text
我要知道所有任务最终怎么样
不在乎其中是否失败
→ Promise.allSettled
```

```text
我只关心谁最先结束
成功失败都接受
→ Promise.race
```

```text
我只需要最快的一个成功结果
前面的失败可以忽略
→ Promise.any
```

对应题目中的四个场景：

| 场景 | 选择 |
|---|---|
| 页面初始化必须等 3 个接口全部成功 | `Promise.all()` |
| 上传 10 个文件，要统计每一个成功/失败 | `Promise.allSettled()` |
| 主服务和备用服务谁先 settled 就采用谁 | `Promise.race()` |
| 多个镜像节点，只要一个成功即可 | `Promise.any()` |

这里要特别注意第三个场景。

如果业务真正想表达的是：

> “即使最快的服务失败了，也继续等另一个成功服务。”

那就不应该使用 `race()`，而应该使用：

```js
Promise.any()
```

---
#### 最终面试收敛回答

> **`Promise.all`、`allSettled`、`race` 和 `any` 都用于组合多个异步结果。`Promise.all` 要求所有任务都 fulfilled，只要一个 rejected 就整体 rejected，而且成功结果按照输入顺序返回；`Promise.allSettled` 会等待所有任务都结束，并返回每项的成功或失败状态，适合允许部分失败的批量任务；`Promise.race` 采用第一个 settled 的结果，因此第一个完成的任务无论成功还是失败都会决定最终状态；`Promise.any` 则采用第一个 fulfilled 的结果，会忽略前面的失败，只有全部 rejected 时才以 `AggregateError` 失败。可以简单记成：all 是“全部成功”，allSettled 是“全部结束”，race 是“第一个结束”，any 是“第一个成功”。** ([TC39](https://tc39.es/ecma262/2026/multipage/control-abstraction-objects.html))

---

**Sources:**

- [ECMAScript® 2026 Language Specification](https://tc39.es/ecma262/2026/multipage/control-abstraction-objects.html)

## 第28题 Event Loop 是什么？Promise、微任务和宏任务是如何决定代码执行顺序的？

### 题目

Event Loop 是什么？Promise、微任务和宏任务是如何决定代码执行顺序的？

### 问题

1. JavaScript 为什么需要 **Event Loop（事件循环）**？它主要解决什么问题？
2. JavaScript 是单线程执行的，那么 `setTimeout`、网络请求等异步任务为什么不会一直阻塞主线程？
3. **调用栈（Call Stack）**、任务队列和 Event Loop 之间是什么关系？
4. 什么是宏任务（Task）？常见的任务有哪些？
5. 什么是微任务（Microtask）？常见的微任务有哪些？
6. 为什么 `Promise.then()` 通常比 `setTimeout(..., 0)` 更早执行？
7. 一轮 Event Loop 中，任务、微任务和页面渲染是什么关系？
8. 如果微任务不断产生新的微任务，会发生什么？
9. `fetch()` 应该简单归类为宏任务还是微任务吗？
10. `requestAnimationFrame()` 为什么不能简单归类为普通宏任务？
11. `setTimeout(fn, 0)` 为什么不是立即执行？
12. 如何完整理解：
   ```text
   同步代码
   → Promise 微任务
   → 浏览器渲染机会
   → 后续任务
   ```

---

### 回答要点

#### 1. Event Loop 负责协调异步任务的执行

- JavaScript 在一个 agent 中，同一时刻执行一段 ECMAScript 代码。
- 浏览器本身并不是单线程的，网络、计时器等工作可以由宿主环境在 JavaScript 执行之外推进。
- Event Loop 负责决定什么时候执行已经准备好的任务、什么时候清空微任务，以及什么时候进行渲染。WHATWG 的事件循环处理模型明确规定：选择并执行一个 task 后，要进行一次 microtask checkpoint。([HTML Living Standard](https://html.spec.whatwg.org/multipage/webappapis.html))
#### 2. “宏任务”是面试常用术语，规范主要叫 `task`

- HTML Standard 使用 `task`、`task queue`、`task source`。
- 常见 task 来源包括：
  - 定时器；
  - 用户事件；
  - HTML 解析；
  - 资源处理；
  - 部分 DOM 操作后的处理。
- 微任务队列不是普通 task queue。([HTML Living Standard](https://html.spec.whatwg.org/multipage/webappapis.html))
#### 3. 常见微任务

- `Promise.then/catch/finally` 对应的 Promise reaction。
- `queueMicrotask()`。
- `MutationObserver` 回调也通过微任务机制调度。
- HTML 对 ECMAScript 的 `HostEnqueuePromiseJob` 明确规定：Promise 相关 Job 会进入 microtask queue。([HTML Living Standard](https://html.spec.whatwg.org/multipage/webappapis.html))
#### 4. 核心顺序

```text
执行一个 task
↓
task 执行结束
↓
执行 microtask checkpoint
↓
清空当前微任务队列
↓
浏览器可能获得 rendering opportunity
↓
后续 task
```
但不能死记成“每个宏任务后一定渲染一次”，浏览器并不保证每轮事件循环都进行渲染。([HTML Living Standard](https://html.spec.whatwg.org/multipage/webappapis.html))
#### 5. 微任务会清到队列为空

- 微任务执行过程中产生的新微任务仍会继续处理。
- 如果不断产生微任务，就可能导致后续 task 和页面更新长时间得不到执行机会。([HTML Living Standard](https://html.spec.whatwg.org/multipage/webappapis.html))
#### 6. `setTimeout(fn, 0)` 不是立即执行

- `0` 表示计时延迟参数，并不意味着立即抢占执行。
- 当前代码和微任务仍要先执行。
- 定时器规范也明确说明，不保证回调严格按指定时间执行；CPU 负载、其他任务等都会造成延迟。([HTML Living Standard](https://html.spec.whatwg.org/multipage/timers-and-user-prompts.html))
#### 7. `requestAnimationFrame()` 不是普通 task

- callback 会登记到 animation frame callback 集合。
- 浏览器在 rendering update 流程中执行这些 callback，然后再进行相关 style/layout 更新。
- 因此它与浏览器帧渲染周期直接相关。([HTML Living Standard](https://html.spec.whatwg.org/multipage/webappapis.html))

---

### 标准回答

Event Loop 可以理解为：

> **浏览器协调 JavaScript 任务、微任务以及页面渲染的一套调度机制。**

需要先纠正一个常见说法：**JavaScript 执行是单线程的，不代表整个浏览器只有一个线程。** WHATWG 将 JavaScript agent 概念描述为执行 JavaScript 的理想化单线程，而网络、计时器等浏览器能力可以在 JavaScript 代码执行之外推进。([HTML Living Standard](https://html.spec.whatwg.org/multipage/webappapis.html))
#### 1. Task、调用栈和 Event Loop 是什么关系？

假设浏览器现在要执行一段 JavaScript：

```js
function a() {
  b()
}

function b() {
  console.log('hello')
}

a()
```

函数执行过程中会形成调用关系：

```text
Call Stack

b()
a()
全局代码
```

同步 JavaScript 会按照调用栈正常向下执行。

而浏览器的 Event Loop 会不断寻找当前可以执行的 **task**。

WHATWG 的处理模型可以简化为：

```text
Event Loop
↓
选择一个可运行 task
↓
执行这个 task
↓
task 执行结束
↓
Microtask Checkpoint
↓
继续事件循环
```

规范明确规定，一个 task 执行结束以后，要执行一次 **microtask checkpoint**。([HTML Living Standard](https://html.spec.whatwg.org/multipage/webappapis.html))

所以面试里的：

```text
宏任务
```

更准确地对应 HTML 规范里的：

```text
task
```

“宏任务”本身更偏社区和面试术语。

常见 task 包括：

```text
setTimeout 回调、用户事件处理、HTML 解析工作、资源处理、某些 DOM 相关工作
```

HTML Standard 本身就把事件、解析、callback 和资源处理列为典型 task 工作。([HTML Living Standard](https://html.spec.whatwg.org/multipage/webappapis.html))

---
#### 2. 什么是微任务？为什么 Promise 比 setTimeout 先执行？

Promise 的回调不是普通 task。

例如：

```js
Promise.resolve().then(() => {
  console.log('Promise')
})
```

当 Promise reaction 可以执行时，ECMAScript 会产生 Promise Job；在浏览器环境中，HTML 的 `HostEnqueuePromiseJob` 会把它放入 **microtask queue**。([TC39](https://tc39.es/ecma262/2025/multipage/control-abstraction-objects.html?utm_source=chatgpt.com))

因此来看这段代码：

```js
console.log(1)

setTimeout(() => {
  console.log(2)
}, 0)

Promise.resolve().then(() => {
  console.log(3)
})

console.log(4)
```

最终输出：

```text
1
4
3
2
```

执行过程是：

```text
开始当前 script task
│
├─ console.log(1)
│      → 输出 1
│
├─ setTimeout(...)
│      → 注册定时器
│      → 回调未来作为 task 执行
│
├─ Promise.then(...)
│      → Promise reaction 将进入微任务机制
│
├─ console.log(4)
│      → 输出 4
│
└─ 当前同步代码结束
```

此时：

```text
同步结果：1 4
```

当前 task 结束以后，Event Loop 要进行：

```text
microtask checkpoint
```

于是：

```js
() => console.log(3)
```

执行：

```text
1 4 3
```

微任务处理结束后，未来 Event Loop 才可能选择已经可运行的 timer task：

```text
1 4 3 2
```

因此不是：

> Promise 天生“速度比 setTimeout 快”。

而是：

> **它们进入了不同的调度机制；当前 task 结束后，微任务 checkpoint 会先于后续 timer task 的执行。**

---
#### 3. 一轮 Event Loop 到底是什么顺序？

面试中可以先记：

```text
执行当前 Task
↓
执行同步 JavaScript
↓
Task 结束
↓
清空 Microtask Queue
↓
浏览器可能进行一次渲染
↓
进入后续 Task
```

但这里有两个细节需要特别注意。

**第一，微任务不是只执行一个。**

规范的 microtask checkpoint 是：

```text
只要 microtask queue 非空
↓
取出一个
↓
执行
↓
继续检查
↓
直到为空
```

([HTML Living Standard](https://html.spec.whatwg.org/multipage/webappapis.html))

所以：

```js
queueMicrotask(() => {
  console.log(1)

  queueMicrotask(() => {
    console.log(2)
  })
})
```

在第一个微任务里创建的第二个微任务，也会继续在这个 checkpoint 中执行。

因此如果写成：

```js
function loop() {
  queueMicrotask(loop)
}

loop()
```

就可能：

```text
微任务
↓
产生新微任务
↓
执行新微任务
↓
继续产生
↓
……
```

导致：

```text
后续 task 得不到执行
页面也迟迟得不到更新机会
```

这叫 **microtask starvation（微任务饥饿）** 的典型情况。

---

**第二，不能说每个 task 后浏览器一定渲染。**

常见面试口诀：

```text
宏任务
→ 微任务
→ 渲染
→ 下一个宏任务
```

方便理解，但不是严格规范描述。

更准确应该说：

```text
Task
↓
Microtask Checkpoint
↓
如果出现合适的 rendering opportunity
↓
浏览器进行渲染相关处理
```

浏览器会根据刷新率、页面状态以及是否真的需要更新等因素决定渲染机会，并不是每执行一个 task 就强制绘制一次。([HTML Living Standard](https://html.spec.whatwg.org/multipage/webappapis.html))

---
#### 4. `fetch()`、`requestAnimationFrame()` 和 `setTimeout()` 怎么理解？

这三个很容易被错误地全部塞进“宏任务/微任务”二分法。
##### `fetch()`

不建议回答：

```text
fetch 是微任务
```

或者：

```text
fetch 是宏任务
```

因为这句话粒度太粗。

更准确的是：

```js
fetch('/api')
  .then(response => {
    // ...
  })
```

可以拆成：

```text
调用 fetch()
↓
立即获得 Promise
↓
网络请求由 Web 平台异步推进
↓
响应满足条件
↓
fetch 返回的 Promise 被 resolve
↓
对应 .then() Promise reaction
↓
作为微任务执行
```

Fetch Standard 本身包含异步/并行处理，以及通过 fetch task 处理部分响应步骤；而开发者写的 `.then()` 属于 Promise reaction，最终由 Promise Job 的微任务机制执行。([Fetch Standard](https://fetch.spec.whatwg.org/?utm_source=chatgpt.com))

所以面试里最稳的回答是：

> **不要简单说 fetch 是宏任务或者微任务。网络请求是浏览器的异步能力，而 fetch 返回 Promise，Promise 的 `.then()` 回调按照微任务机制执行。**

---
##### `requestAnimationFrame()`

它也不应该简单说：

```text
rAF 是一个普通宏任务
```

`requestAnimationFrame(callback)` 会把 callback 注册进 animation frame callbacks 集合。浏览器在更新渲染的过程中运行这些 callback；当前 HTML Standard 的 rendering update 流程中，animation frame callbacks 会在后续样式与布局更新步骤之前运行。([HTML Living Standard](https://html.spec.whatwg.org/multipage/webappapis.html))

所以：

```js
requestAnimationFrame(() => {
  // 更新动画
})
```

表达的更接近：

> **“下一次合适的渲染机会到来时，请在渲染流程里执行我的动画回调。”**

因此它很适合：

```text
视觉动画、DOM 动画更新、与屏幕刷新同步的操作
```

而不是单纯拿来当普通异步定时器。

---
##### `setTimeout(fn, 0)`

```js
setTimeout(fn, 0)
```

也不能理解成：

```text
0ms 后立即执行
```

准确理解是：

```text
注册 timer
↓
满足 timer 的时间条件
↓
对应工作有机会成为可运行 task
↓
等待 Event Loop 调度
↓
执行 fn
```

即使参数是 `0`：

```text
当前 JavaScript
必须先执行完

当前 checkpoint 的微任务
也必须先处理
```

而且 HTML Standard 明确说明，timer 并不保证严格按照指定时间执行，CPU 负载和其他任务都可能让它延后；深层嵌套 timer 还会受到最小 4ms 限制。([HTML Living Standard](https://html.spec.whatwg.org/multipage/timers-and-user-prompts.html))

所以 `0` 更应该理解为：

> **尽快调度到后续执行机会，而不是立即执行。**

---
#### 最终面试收敛回答

> **Event Loop 是浏览器协调 JavaScript 任务、微任务和页面渲染的调度机制。HTML 规范中更准确的术语是 task，而“宏任务”主要是面试中的常用说法。Event Loop 执行一个 task 后，会进行一次 microtask checkpoint，把当前微任务队列持续执行到为空，所以 Promise 的 `then/catch/finally`、`queueMicrotask` 等微任务通常会先于后续的 `setTimeout` task 执行。需要注意，浏览器并不是每执行一个 task 就一定渲染一次，而是在合适的 rendering opportunity 更新页面；`requestAnimationFrame` 也属于渲染流程中的动画帧回调，不能简单归为普通宏任务。`fetch` 同样不能整体归为宏任务或微任务：网络请求由浏览器异步推进，而它返回的 Promise 的 `.then()` 回调按照微任务机制执行。** ([HTML Living Standard](https://html.spec.whatwg.org/multipage/webappapis.html))

---

**Sources:**

- [HTML Standard](https://html.spec.whatwg.org/multipage/webappapis.html)
- [ECMAScript® 2025 Language Specification](https://tc39.es/ecma262/2025/multipage/control-abstraction-objects.html?utm_source=chatgpt.com)
- [Fetch Standard](https://fetch.spec.whatwg.org/?utm_source=chatgpt.com)

## 第29题 JavaScript 中的 `this` 是什么？`call`、`apply`、`bind` 有什么区别？

### 题目

JavaScript 中的 `this` 是什么？`call`、`apply`、`bind` 有什么区别？

### 问题

1. JavaScript 中的 `this` 是什么？它是在函数定义时确定，还是调用时确定？
2. 普通函数以下几种调用方式中，`this` 分别如何确定？
   - `fn()`
   - `obj.fn()`
   - `fn.call(obj)`
   - `new Fn()`
3. 严格模式和非严格模式下，普通函数直接调用时的 `this` 有什么区别？
4. 为什么把 `obj.fn` 赋值给一个变量后直接调用，可能出现 `this` 丢失？
5. 箭头函数有没有自己的 `this`？它的 `this` 从哪里来？
6. 为什么 `call()`、`apply()`、`bind()` 不能修改箭头函数的 `this`？
7. `call()` 和 `apply()` 有什么共同点和区别？
8. `bind()` 与 `call()/apply()` 最大区别是什么？
9. `bind()` 返回的新函数被 `new` 调用时，之前绑定的 `this` 是否继续生效？
10. 实际开发中 `call`、`apply`、`bind` 分别适合什么场景？
11. 如何理解默认调用、方法调用、显式指定、构造调用和箭头函数的词法 `this`？

---

### 回答要点

#### 1. 普通函数的 `this` 主要由调用方式决定

- 不是看函数在哪里定义，也不是简单看“函数属于哪个对象”。
- 普通函数调用时，根据具体调用形式确定 `this`。
- 箭头函数是例外，它没有自己的 `this`，而是使用外层词法环境中的 `this`。([TC39](https://tc39.es/ecma262/2026/multipage/ordinary-and-exotic-objects-behaviours.html?utm_source=chatgpt.com))
#### 2. 普通函数常见的 `this` 情况

```text
fn()
→ 普通直接调用

obj.fn()
→ this 通常是 obj

fn.call(obj)
→ 显式指定 this 为 obj

new Fn()
→ this 指向新创建的实例
```
#### 3. 直接调用的严格模式区别

- 严格模式：`this` 保持传入的 `undefined`。
- 非严格模式：`undefined/null` 会被替换为全局对象；原始值会被包装为对象。([TC39](https://tc39.es/ecma262/2026/multipage/ordinary-and-exotic-objects-behaviours.html?utm_source=chatgpt.com))
#### 4. 方法提取可能导致 `this` 丢失

```js
const fn = obj.say
fn()
```
此时调用形式已经从：
```js
obj.say()
```
变成：
```js
fn()
```
因此不再以 `obj` 作为调用基对象。
#### 5. 箭头函数没有自己的 `this`

- 创建箭头函数时使用 `lexical-this`。
- 内部 `this` 从外层词法环境解析。
- `call/apply/bind` 传入的 `thisArg` 对箭头函数不会生效。([TC39](https://tc39.es/ecma262/2024/multipage/ecmascript-language-functions-and-classes.html?utm_source=chatgpt.com))
#### 6. `call` 和 `apply` 都立即调用函数

- `call(thisArg, a, b)`
- `apply(thisArg, [a, b])`
- 核心区别是参数传递形式。([TC39](https://tc39.es/ecma262/multipage/fundamental-objects.html?utm_source=chatgpt.com))
#### 7. `bind` 不立即执行

- 返回一个新的 bound function。
- 可以预先绑定 `this` 和部分参数。
- 后续再调用这个新函数。([TC39](https://tc39.es/ecma262/multipage/fundamental-objects.html?utm_source=chatgpt.com))
#### 8. `new` 调用 bound function 是重要边界

- 如果目标函数可以被构造，绑定后的函数也可以被 `new`。
- 此时之前通过 `bind()` 指定的 `thisArg` 不再作为实例的 `this` 使用。
- `new` 创建的新实例成为构造调用中的 `this`。

---

### 标准回答

`this` 是 JavaScript 在执行函数时提供的一个特殊绑定，用于表示当前函数调用所关联的上下文。

对于**普通函数**，`this` 通常不是在函数定义时固定，而是由**调用方式**决定。ECMAScript 内部会根据函数的 `[[ThisMode]]` 和调用时传入的 `thisArgument` 建立 `this` 绑定；箭头函数则使用 lexical this，不建立自己的 `this`。([TC39](https://tc39.es/ecma262/2026/multipage/ordinary-and-exotic-objects-behaviours.html?utm_source=chatgpt.com))
#### 1. 普通函数的 `this` 怎么判断？

最常见的情况可以这样理解。
##### 直接调用

```js
function show() {
  console.log(this)
}

show()
```

这里没有：

```text
某个对象.show()
```

这样的调用基对象。

如果函数是**严格模式函数**：

```js
'use strict'

function show() {
  console.log(this)
}

show()
```

那么：

```text
this === undefined
```

如果是非严格模式普通函数，调用时传入的 `this` 是 `undefined` 或 `null`，语言会将其替换成对应 Realm 的全局对象。([TC39](https://tc39.es/ecma262/2026/multipage/ordinary-and-exotic-objects-behaviours.html?utm_source=chatgpt.com))

所以面试时不要简单背：

> “普通函数直接调用，this 永远是 window。”

这并不准确。

更准确是：

```text
严格模式
→ undefined

非严格模式普通函数
→ undefined/null 会被替换为全局对象
```

并且在 ES Module 中，代码天然处于严格模式语义下，因此也不能到处套用“this 就是 window”。

---
##### 对象方法调用

例如：

```js
const user = {
  name: 'Tom',

  say() {
    console.log(this.name)
  }
}

user.say()
```

这里：

```text
this → user
```

因为调用形式是：

```js
user.say()
```

因此可以简单记：

> **普通方法通过 `obj.fn()` 调用时，函数中的 `this` 通常就是调用表达式中的 `obj`。**

---
#### 2. 为什么会出现 `this` 丢失？

例如：

```js
const user = {
  name: 'Tom',

  say() {
    console.log(this.name)
  }
}

const fn = user.say

fn()
```

很多人会认为：

```text
fn 本来是 user.say
所以 this 还是 user
```

这是错误的。

关键不是函数“原来放在哪里”，而是：

> **现在怎么调用它。**

原来是：

```js
user.say()
```

调用时保留了 `user` 这个引用基对象。

但：

```js
const fn = user.say
fn()
```

执行时已经变成普通函数调用：

```text
fn()
```

因此不会自动记住原来的 `user`。

这就是日常开发中经常说的：

> **方法被单独取出来后可能发生 `this` 丢失。**

这也是为什么事件回调、定时器回调等场景中经常会使用 `bind()` 或箭头函数保存需要的上下文。

---
#### 3. `call()`、`apply()`、`bind()` 有什么区别？

三者都定义在：

```js
Function.prototype
```

上。

其中 `call()` 和 `apply()` 都会：

> **立即调用目标函数，并提供一个 `thisArg`。**

ECMAScript 对 `call()` 的处理最终会执行：

```text
Call(func, thisArg, args)
```

而 `apply()` 同样调用目标函数，只不过它先把数组或类数组参数转换成参数列表。([TC39](https://tc39.es/ecma262/multipage/fundamental-objects.html?utm_source=chatgpt.com))

例如：

```js
function add(a, b) {
  return this.num + a + b
}

const obj = {
  num: 10
}
```

使用 `call()`：

```js
add.call(obj, 1, 2)
```

相当于：

```text
this → obj
a → 1
b → 2
```

结果：

```text
13
```

使用 `apply()`：

```js
add.apply(obj, [1, 2])
```

结果同样：

```text
13
```

所以二者核心区别非常简单：

```text
call
→ 参数一个一个传

apply
→ 参数通过数组或类数组传
```

即：

```js
fn.call(obj, 1, 2, 3)

fn.apply(obj, [1, 2, 3])
```

二者都会**立即执行函数**。

---

而 `bind()` 不一样。

```js
const newFn = add.bind(obj, 1)
```

这一步：

```text
不会执行 add
```

而是返回：

```text
一个新的绑定函数
```

然后：

```js
newFn(2)
```

最终相当于：

```js
add.call(obj, 1, 2)
```

所以可以直接记：

```text
call
→ 改 this
→ 立即执行
→ 参数逐个传

apply
→ 改 this
→ 立即执行
→ 参数数组传

bind
→ 绑定 this
→ 不立即执行
→ 返回新函数
→ 还可以预置参数
```

ECMAScript 中 `bind()` 会通过 `BoundFunctionCreate` 创建一个新的 bound function，并记录目标函数、绑定的 `this` 和预置参数。([TC39](https://tc39.es/ecma262/multipage/fundamental-objects.html?utm_source=chatgpt.com))

---
#### 4. 箭头函数的 `this` 为什么特殊？

这是 `this` 最重要的边界之一。

例如：

```js
const obj = {
  name: 'Tom',

  normal() {
    console.log(this.name)
  },

  arrow: () => {
    console.log(this)
  }
}
```

不能因为 `arrow` 写在 `obj` 中，就认为：

```text
arrow 的 this = obj
```

箭头函数：

> **没有自己的 `this` 绑定。**

ECMAScript 创建箭头函数时明确使用 `lexical-this`；箭头函数中的 `this` 会继续向外层词法环境寻找。([TC39](https://tc39.es/ecma262/2024/multipage/ecmascript-language-functions-and-classes.html?utm_source=chatgpt.com))

因此：

```js
const arrow = () => {
  console.log(this)
}
```

再执行：

```js
arrow.call(obj)
```

`obj` 不会成为箭头函数的 `this`。

同理：

```js
arrow.apply(obj)
arrow.bind(obj)
```

也不能改变它的 `this`。

ECMAScript 对 `call` 和 `apply` 也明确指出，如果目标是箭头函数，其传入的 `thisArg` 会被函数调用机制忽略。([TC39](https://tc39.es/ecma262/multipage/fundamental-objects.html?utm_source=chatgpt.com))

所以：

```text
普通函数
→ this 通常看调用方式

箭头函数
→ 没有自己的 this
→ 使用外层词法 this
```

---
#### 5. 为什么箭头函数经常用在回调里？

例如：

```js
const user = {
  name: 'Tom',

  printLater() {
    setTimeout(() => {
      console.log(this.name)
    }, 1000)
  }
}
```

调用：

```js
user.printLater()
```

进入 `printLater` 时：

```text
this → user
```

内部箭头函数没有自己的 `this`：

```text
箭头函数 this
↓
向外找
↓
printLater 的 this
↓
user
```

所以最终可以访问：

```js
this.name
```

这就是箭头函数特别适合某些回调场景的原因之一。

---
#### 6. `bind()` 后再 `new` 会发生什么？

这是一个比较容易答错的追问。

例如：

```js
function Person(name) {
  this.name = name
}

const obj = {}

const BoundPerson = Person.bind(obj)

const p = new BoundPerson('Tom')
```

很多人会认为：

```text
bind 绑定 obj
↓
this 永远等于 obj
```

这是错误的。

Bound Function 如果目标函数可以被构造，那么它本身也可以参与构造调用。

执行：

```js
new BoundPerson('Tom')
```

时，之前 `bind(obj)` 中绑定的 `obj` 不会作为构造函数内部的实例 `this`。

最终：

```text
this
→ new 创建出来的实例
```

所以：

```js
p.name
```

是：

```text
Tom
```

而不是把 `name` 写到原来的 `obj` 上。

因此面试时可以记：

> **普通调用 bound function 时使用绑定的 `this`；作为构造函数被 `new` 调用时，绑定的 `thisArg` 会被忽略。**

`bind()` 返回的函数本身是特殊的 Bound Function Exotic Object，这也是为什么不能把它简单理解成“永远把 this 写死”。([TC39](https://tc39.es/ecma262/multipage/fundamental-objects.html?utm_source=chatgpt.com))

---
#### 7. 几种 `this` 情况怎么统一记忆？

面试时可以先掌握下面这套判断方式：

```text
① fn()
普通直接调用
→ 严格模式通常 undefined
→ 非严格模式下 undefined/null 会进行全局对象替换

② obj.fn()
方法调用
→ this = obj

③ fn.call(obj)
   fn.apply(obj)
   fn.bind(obj)
显式绑定
→ 普通函数按指定对象处理 this

④ new Fn()
构造调用
→ this = 新创建的实例

⑤ () => {}
箭头函数
→ 没有自己的 this
→ 从外层词法环境获取
```

但不要机械理解成“五种谁优先级更高”就能解决所有情况，因为：

- 箭头函数根本没有自己的动态 `this`；
- Bound Function 还有 `new` 的特殊构造语义；
- 严格模式会影响普通函数对 `thisArgument` 的处理。

---
#### 最终面试收敛回答

> **JavaScript 中普通函数的 `this` 主要由调用方式决定，而不是由函数定义位置决定。普通函数直接调用时，严格模式下 `this` 通常是 `undefined`，非严格模式下 `undefined/null` 会被替换为全局对象；通过 `obj.fn()` 调用时，`this` 通常指向 `obj`；通过 `call`、`apply` 可以显式指定 `this`，二者都会立即执行函数，区别主要是 `call` 逐个传参，而 `apply` 使用数组或类数组传参；`bind` 不立即执行，而是返回一个绑定了 `this` 和可选预置参数的新函数。箭头函数没有自己的 `this`，它使用外层词法环境中的 `this`，所以 `call`、`apply`、`bind` 都不能改变它的 `this`。另外，绑定函数如果通过 `new` 构造调用，之前 `bind` 设置的 `thisArg` 会被忽略，此时 `this` 指向新创建的实例。** ([TC39](https://tc39.es/ecma262/multipage/fundamental-objects.html?utm_source=chatgpt.com))

---

**Sources:**

- [ECMAScript® 2026 Language Specification](https://tc39.es/ecma262/2026/multipage/ordinary-and-exotic-objects-behaviours.html?utm_source=chatgpt.com)

## 第30题 JavaScript 的原型和原型链是什么？`prototype`、`[[Prototype]]`、`__proto__` 有什么区别？

### 题目

JavaScript 的原型和原型链是什么？`prototype`、`[[Prototype]]`、`__proto__` 有什么区别？

### 问题

1. JavaScript 为什么需要原型机制？它主要解决什么问题？
2. 什么是对象内部的 `[[Prototype]]`？一个对象访问不到自身属性时，为什么还可能在别处找到？
3. 什么是**原型链**？属性查找会沿着什么顺序进行？
4. `prototype` 和 `[[Prototype]]` 是不是同一个东西？
5. 为什么不能简单说“所有对象都有 `prototype`”？
6. `__proto__` 和 `[[Prototype]]` 是什么关系？实际开发中更推荐通过什么标准 API 获取或设置对象原型？
7. 看下面代码：

```js
function Person() {}

const p = new Person()
```

下面两个关系是否成立？为什么？

```js
p.__proto__ === Person.prototype

Object.getPrototypeOf(p) === Person.prototype
```

8. `Person.prototype` 自己也是一个对象，那么它的原型又是谁？这条链最终通常会走到哪里？

```text
p
↓
Person.prototype
↓
Object.prototype
↓
null
```

9. 当访问：

```js
p.name
```

如果 `p` 自身没有 `name`，JavaScript 会如何沿原型链查找？如果一直找到 `null` 都没有，会返回什么？
10. 如果实例和原型上存在同名属性，例如：

```js
Person.prototype.name = 'prototype'

p.name = 'instance'
```

访问 `p.name` 时为什么得到 `'instance'`？
11. 原型上的方法为什么可以被多个实例共享？这和“每个实例都复制一份方法”相比有什么区别？
12. `Object.create(proto)` 做了什么？它和直接复制一个对象有什么本质区别？
13. 最后请你说明下面三个概念分别属于哪一层：

```text
Person.prototype、p 的 [[Prototype]]、p.__proto__
```

这一题继续沿着上一题的 JavaScript 对象机制深入，先把**原型与原型链本身**讲清楚；下一层再连接 `new` 到底做了什么，以及 `instanceof` 为什么本质上是在检查原型链。题目范围对应知识点映射中对 `[[Prototype]]`、`prototype`、`Object.create()` 和原型链属性查找的要求。`面试回答要点映射.md`

### 回答要点

#### 1. `[[Prototype]]` 是对象内部真正的原型关联

- 普通对象内部都有 `[[Prototype]]`。
- 它的值要么是另一个对象，要么是 `null`。
- JavaScript 通过它实现属性继承。([TC39](https://tc39.es/ecma262/2026/multipage/ordinary-and-exotic-objects-behaviours.html?utm_source=chatgpt.com))
#### 2. 原型链就是多个 `[[Prototype]]` 串起来形成的链

```text
实例
↓
构造函数.prototype
↓
Object.prototype
↓
null
```
#### 3. 属性查找先找自身，再沿原型链向上

- 当前对象没有该属性，就获取它的原型继续查找。
- 一直找到 `null` 仍没有，就返回 `undefined`。([TC39](https://tc39.es/ecma262/2026/multipage/ordinary-and-exotic-objects-behaviours.html?utm_source=chatgpt.com))
#### 4. `prototype` 和 `[[Prototype]]` 不是一个东西

- `[[Prototype]]`：对象内部的原型引用。
- `prototype`：某些函数对象上的普通属性，其值通常是一个对象，用于构造实例时建立实例的原型关系。
- 因此不能说“所有对象都有 `prototype`”。([TC39](https://tc39.es/ecma262/2024/?utm_source=chatgpt.com))
#### 5. `__proto__` 只是访问原型的一种接口

- `obj.__proto__` 本质上来自 `Object.prototype` 上的访问器。
- getter 最终读取对象的 `[[Prototype]]`。
- 更规范地获取原型使用 `Object.getPrototypeOf(obj)`；修改则使用 `Object.setPrototypeOf()`。([TC39](https://tc39.es/ecma262/pr/3713/multipage/fundamental-objects.html?utm_source=chatgpt.com))
#### 6. 构造函数与实例的典型关系

```js
function Person() {}
const p = new Person()
```

一般成立：

```js
Object.getPrototypeOf(p) === Person.prototype
```
#### 7. 原型方法可以被实例共享

- 方法放在 `Person.prototype` 上。
- 多个实例通过原型链访问同一个方法，而不是每个实例各自保存一份。
#### 8. `Object.create(proto)`

- 创建一个新对象。
- 并直接把新对象的 `[[Prototype]]` 设置为传入的 `proto`。
- 它不是复制 `proto` 的属性。([TC39](https://tc39.es/ecma262/2026/multipage/fundamental-objects.html))

---

### 标准回答

JavaScript 的继承机制本质上建立在**原型**之上。

每个普通对象内部都有一个 `[[Prototype]]` 内部槽，它保存该对象的原型对象或者 `null`。当访问一个对象自身不存在的属性时，JavaScript 会沿着这个 `[[Prototype]]` 一层层向上查找，这条连续的查找关系就是**原型链**。([TC39](https://tc39.es/ecma262/2026/multipage/ordinary-and-exotic-objects-behaviours.html?utm_source=chatgpt.com))
#### 1. 原型和原型链是什么？

例如：

```js
const parent = {
  name: 'Tom'
}

const child = Object.create(parent)
```

这里：

```text
child
↓ [[Prototype]]
parent
```

也就是说：

```js
Object.getPrototypeOf(child) === parent
```

虽然：

```js
child
```

自身并没有：

```js
name
```

但执行：

```js
child.name
```

仍然得到：

```text
Tom
```

因为属性查找过程是：

```text
child 自己有没有 name？
↓
没有
↓
获取 child 的 [[Prototype]]
↓
parent 有没有 name？
↓
有
↓
返回 parent.name
```

ECMAScript 的普通对象 `[[Get]]` 算法就是这样规定的：如果当前对象没有自身属性，就取得其原型继续执行属性查找；如果原型已经是 `null`，则返回 `undefined`。([TC39](https://tc39.es/ecma262/2026/multipage/ordinary-and-exotic-objects-behaviours.html?utm_source=chatgpt.com))

所以原型链可以概括为：

> **对象在自身找不到属性时，沿 `[[Prototype]]` 不断向上查找形成的链。**

---
#### 2. `prototype` 和 `[[Prototype]]` 到底有什么区别？

这是这一题最重要的地方。

先看：

```js
function Person() {}
```

`Person` 是一个函数对象。

它通常有一个普通属性：

```js
Person.prototype
```

这个属性的值本身是一个对象。

所以：

```text
Person
│
└── prototype
      ↓
      一个对象
```

而：

```text
[[Prototype]]
```

不是我们正常写出来的普通 JavaScript 属性，它是对象内部用于建立继承关系的内部槽。普通对象的 `[[Prototype]]` 要么指向另一个对象，要么是 `null`。([TC39](https://tc39.es/ecma262/2026/multipage/ordinary-and-exotic-objects-behaviours.html?utm_source=chatgpt.com))

因此两者分别是：

```text
prototype
→ 函数对象上的一个属性

[[Prototype]]
→ 对象内部真正的原型引用
```

不能把它们混成一个概念。

也不能说：

> 所有对象都有 `prototype`。

例如：

```js
const obj = {}
```

通常：

```js
obj.prototype
```

是：

```text
undefined
```

但是 `obj` 依然有内部的：

```text
[[Prototype]]
```

通常指向：

```js
Object.prototype
```

另一方面，即使是函数，也不意味着所有函数对象都有自己的 `"prototype"` 属性。例如规范中的 `Function.prototype` 自己就是函数对象，但没有 `"prototype"` 属性。([TC39](https://tc39.es/ecma262/2026/multipage/fundamental-objects.html?utm_source=chatgpt.com))

---
#### 3. `new Person()` 到底建立了什么关系？

例如：

```js
function Person() {}

const p = new Person()
```

创建实例时，构造过程会使用构造函数的 `"prototype"` 属性来确定新对象的 `[[Prototype]]`。([TC39](https://tc39.es/ecma262/2024/?utm_source=chatgpt.com))

因此通常有：

```js
Object.getPrototypeOf(p) === Person.prototype
```

也就是：

```text
Person
│
│ prototype
↓
Person.prototype
↑
│ [[Prototype]]
│
p
```

面试中最常背的：

```js
p.__proto__ === Person.prototype
```

在普通环境下一般也成立。

但更推荐写：

```js
Object.getPrototypeOf(p) === Person.prototype
```

因为它直接使用标准 API 表达“获取对象原型”的语义。

---
#### 4. `__proto__` 又是什么？

`__proto__` 很容易被误认为是：

> “对象内部真正存储的原型属性”。

这不准确。

规范中 `Object.prototype.__proto__` 是一个**访问器属性**。读取它时，其 getter 最终调用对象的 `[[GetPrototypeOf]]()`，也就是读取内部的原型关系。([TC39](https://tc39.es/ecma262/pr/3713/multipage/fundamental-objects.html?utm_source=chatgpt.com))

所以可以理解成：

```text
obj.__proto__
↓
一个访问 [[Prototype]] 的接口

Object.getPrototypeOf(obj)
↓
标准 API 获取 [[Prototype]]
```

因此三者关系是：

```text
[[Prototype]]
→ 真正的内部原型关系

__proto__
→ 对这个内部关系的一种访问方式

Object.getPrototypeOf()
→ 标准 API
```

---
#### 5. 一个完整的原型链长什么样？

例如：

```js
function Person() {}

const p = new Person()
```

通常：

```js
Object.getPrototypeOf(p) === Person.prototype
```

继续：

```js
Object.getPrototypeOf(Person.prototype)
  === Object.prototype
```

而：

```js
Object.getPrototypeOf(Object.prototype)
  === null
```

所以原型链是：

```text
p
↓
Person.prototype
↓
Object.prototype
↓
null
```

`Object.prototype` 是这里的顶层普通原型对象，它自己的 `[[Prototype]]` 就是 `null`。([TC39](https://tc39.es/ecma262/2026/multipage/fundamental-objects.html?utm_source=chatgpt.com))

---
#### 6. 属性查找为什么是“就近原则”？

例如：

```js
function Person() {}

Person.prototype.name = 'prototype'

const p = new Person()

p.name = 'instance'
```

现在：

```js
console.log(p.name)
```

得到：

```text
instance
```

不是：

```text
prototype
```

因为查找顺序是：

```text
先检查 p 自身
↓
找到 name
↓
直接返回
```

只有自身找不到时，才会继续：

```text
p
↓
Person.prototype
↓
Object.prototype
↓
null
```

这也是为什么实例属性可以**遮蔽**原型上的同名属性。

---
#### 7. 为什么把方法放在 `prototype` 上可以共享？

假设：

```js
function Person(name) {
  this.name = name
}

Person.prototype.say = function () {
  console.log(this.name)
}
```

创建：

```js
const p1 = new Person('A')
const p2 = new Person('B')
```

这里：

```text
p1
┐
├→ Person.prototype.say
│
p2
┘
```

`p1` 和 `p2` 自身都不需要保存一份 `say` 函数。

它们都通过：

```text
[[Prototype]]
```

找到：

```js
Person.prototype.say
```

因此共享同一个方法。

如果改成：

```js
function Person(name) {
  this.name = name

  this.say = function () {
    console.log(this.name)
  }
}
```

那么每执行一次：

```js
new Person()
```

都会为实例创建自己的 `say` 函数属性。

所以原型机制的重要价值之一就是：

> **多个对象可以通过原型共享属性和方法。**

ECMAScript 对 prototype 的定义也明确指出，构造函数的 `"prototype"` 属性用于实现继承和共享属性。([TC39](https://tc39.es/ecma262/2024/?utm_source=chatgpt.com))

---
#### 8. `Object.create()` 做了什么？

例如：

```js
const parent = {
  say() {
    console.log('hello')
  }
}

const child = Object.create(parent)
```

它不是：

```text
复制 parent
↓
生成 child
```

而是：

```text
创建 child
↓
child.[[Prototype]] = parent
```

所以：

```js
Object.getPrototypeOf(child) === parent
```

成立。

ECMAScript 对 `Object.create(O)` 的定义就是创建一个新对象，并以参数 `O` 作为指定的原型。([TC39](https://tc39.es/ecma262/2026/multipage/fundamental-objects.html))

因此：

```text
Object.assign
→ 更偏属性复制

Object.create
→ 建立原型关系
```

这两个一定不要混。

---
#### 三个概念最终怎么记？

用下面这段代码：

```js
function Person() {}

const p = new Person()
```

直接记：

```text
Person.prototype
→ Person 函数上的普通属性
→ 值是一个对象

p.[[Prototype]]
→ p 内部真正的原型引用
→ 指向 Person.prototype

p.__proto__
→ 访问 p 原型的一种接口
→ 通常得到 Person.prototype
```

所以：

```js
Object.getPrototypeOf(p) === Person.prototype
```

一般成立。

而常见环境下：

```js
p.__proto__ === Person.prototype
```

也成立。

---
#### 最终面试收敛回答

> **JavaScript 的继承建立在原型机制上。普通对象内部都有一个 `[[Prototype]]`，它指向另一个对象或者 `null`。访问属性时，会先查对象自身，如果没有，就沿着 `[[Prototype]]` 向上查找，直到找到属性或者到达 `null`，这条链就是原型链。`prototype` 和 `[[Prototype]]` 不是一个概念：`prototype` 是某些函数对象上的普通属性，构造调用时它通常会成为新实例的 `[[Prototype]]`；而 `[[Prototype]]` 是对象内部真正用于继承的原型引用。`__proto__` 则是访问这一内部原型关系的访问器，更推荐使用 `Object.getPrototypeOf()`。例如 `const p = new Person()` 后，通常有 `Object.getPrototypeOf(p) === Person.prototype`，原型链继续向上通常是 `Person.prototype → Object.prototype → null`。** ([TC39](https://tc39.es/ecma262/2026/multipage/ordinary-and-exotic-objects-behaviours.html?utm_source=chatgpt.com))

---

**Sources:**

- [ECMAScript® 2026 Language Specification](https://tc39.es/ecma262/2026/multipage/ordinary-and-exotic-objects-behaviours.html?utm_source=chatgpt.com)

## 第31题 `new` 操作符到底做了什么？`instanceof` 为什么和原型链有关？

### 题目

`new` 操作符到底做了什么？`instanceof` 为什么和原型链有关？

### 问题

1. 执行下面代码时：

```js
function Person(name) {
  this.name = name
}

const p = new Person('Tom')
```

`new Person('Tom')` 到底做了哪些事情？

2. `new` 创建出来的新对象，为什么通常满足：

```js
Object.getPrototypeOf(p) === Person.prototype
```

3. 构造函数执行时，为什么里面的 `this` 会指向新创建的对象？
4. 如果构造函数没有显式 `return`，`new` 最终返回什么？
5. 如果构造函数显式返回一个**对象**，例如：

```js
function Person() {
  this.name = 'Tom'

  return {
    name: 'Jerry'
  }
}
```

那么：

```js
new Person()
```

最终返回谁？

6. 如果构造函数显式返回一个**基本类型**，例如：

```js
function Person() {
  this.name = 'Tom'
  return 123
}
```

`new Person()` 最终返回什么？

7. 为什么箭头函数不能被 `new` 调用？
8. `instanceof` 的作用是什么？下面代码为什么通常返回 `true`？

```js
p instanceof Person
```

9. `instanceof` 本质上是在比较：

```text
p.constructor === Person
```

还是在检查：

```text
Person.prototype
```

是否出现在 `p` 的原型链中？

10. 看下面代码：

```js
function Person() {}

const p = new Person()

Person.prototype = {}

console.log(p instanceof Person)
```

结果会是什么？为什么修改 `Person.prototype` 后，会影响 `instanceof` 的判断？

11. 为什么下面结果成立？

```js
[] instanceof Array
[] instanceof Object
```

请你结合这条原型链解释：

```text
数组实例
↓
Array.prototype
↓
Object.prototype
↓
null
```

12. `instanceof` 为什么不适合直接判断普通基本类型？

```js
1 instanceof Number
```

为什么是 `false`，而：

```js
new Number(1) instanceof Number
```

却是 `true`？

13. 最后请你把前两题串起来说明：

```text
构造函数
↓
new
↓
实例
↓
[[Prototype]]
↓
Constructor.prototype
↓
instanceof
```

这题是在原型链基础上的最后一层自然深入：把 **`new` 如何建立实例与 `prototype` 的关系**，以及 **`instanceof` 如何利用这条原型链判断对象关系** 串起来。材料也将 `new`、`Object.create()`、`instanceof` 和原型链作为同一组高频追问。`面试回答要点映射.md` `面试回答要点映射.md`

### 回答要点

#### 1. `new` 的核心作用

- 检查目标是否是构造器，也就是是否具有 `[[Construct]]`。
- 对普通基础构造函数，创建一个新对象。
- 新对象的 `[[Prototype]]` 通常来自 `Constructor.prototype`。
- 以新对象作为 `this` 执行构造函数。
- 根据构造函数的返回值决定最终返回谁。([TC39](https://tc39.es/ecma262/2026/multipage/ecmascript-language-expressions.html?utm_source=chatgpt.com))
#### 2. 普通构造函数可以简化记成四步

```text
创建新对象
↓
建立原型关系
↓
this 指向新对象并执行构造函数
↓
根据构造函数返回值决定最终结果
```
#### 3. 构造函数的返回规则

- 没有显式返回对象 → 返回新创建的实例。
- 显式返回对象 → 返回这个对象。
- 普通基础构造函数返回基本类型 → 基本类型被忽略，仍返回新实例。([TC39](https://tc39.es/ecma262/2026/multipage/ordinary-and-exotic-objects-behaviours.html?utm_source=chatgpt.com))
#### 4. 箭头函数不能 `new`

- `new` 要求右侧是 constructor。
- constructor 必须具有 `[[Construct]]`。
- 箭头函数没有构造能力，因此：
  ```js
  new (() => {})
  ```
  会抛出 `TypeError`。([TC39](https://tc39.es/ecma262/2026/multipage/ecmascript-language-expressions.html?utm_source=chatgpt.com))
#### 5. `instanceof` 不是比较 `constructor`

- 普通情况下，本质是检查：
  ```text
  Constructor.prototype
  ```
  是否出现在左侧对象的原型链中。
- 更严格地说，`instanceof` 会先考虑右侧对象的 `Symbol.hasInstance`；默认函数行为才进一步执行普通原型链判断。([TC39](https://tc39.es/ecma262/2026/multipage/ecmascript-language-expressions.html))
#### 6. 因此 `new` 和 `instanceof` 正好连接起来

```text
new
→ 建立实例的 [[Prototype]]

instanceof
→ 沿实例的 [[Prototype]] 链检查 Constructor.prototype
```

---

### 标准回答

`new` 和 `instanceof` 都与 JavaScript 的**构造机制和原型链**直接相关。

先看：

```js
function Person(name) {
  this.name = name
}

const p = new Person('Tom')
```

从 ECMAScript 规范角度，`new` 会先检查 `Person` 是否是构造器，如果不是构造器就抛出 `TypeError`；如果可以构造，则调用它的 `[[Construct]]` 内部方法。对于这种普通的基础构造函数，可以在面试中简化成“创建对象 → 建立原型 → 绑定 this → 执行构造函数 → 确定返回值”。([TC39](https://tc39.es/ecma262/2026/multipage/ecmascript-language-expressions.html?utm_source=chatgpt.com))
#### 1. `new Person()` 到底做了什么？

可以先用面试版四步理解。
##### 第一步：创建一个新对象

概念上相当于先得到：

```js
const obj = {}
```

但这只是理解方式，并不是规范真的执行这一句 JavaScript。
##### 第二步：建立原型关系

对于普通构造函数，新对象的原型通常来自：

```js
Person.prototype
```

所以：

```js
Object.getPrototypeOf(p) === Person.prototype
```

通常为：

```text
true
```

因此形成：

```text
p
↓ [[Prototype]]
Person.prototype
```

这正是上一题原型链知识和 `new` 之间的连接点。普通基础构造函数的 `[[Construct]]` 会通过 `OrdinaryCreateFromConstructor` 创建对象。([TC39](https://tc39.es/ecma262/2026/multipage/ordinary-and-exotic-objects-behaviours.html?utm_source=chatgpt.com))

---
##### 第三步：把新对象作为 `this` 执行构造函数

执行：

```js
new Person('Tom')
```

时：

```js
function Person(name) {
  this.name = name
}
```

其中：

```text
this → 新创建的对象
```

于是：

```js
this.name = 'Tom'
```

实际就是给新实例创建：

```js
p.name = 'Tom'
```

所以：

```js
console.log(p.name)
```

得到：

```text
Tom
```

规范中，对普通 base constructor 创建出 `thisArgument` 后，会把它绑定为该次构造调用中的 `this`。([TC39](https://tc39.es/ecma262/2026/multipage/ordinary-and-exotic-objects-behaviours.html?utm_source=chatgpt.com))

---
##### 第四步：根据构造函数返回值决定最终返回结果

这是 `new` 的高频考点。
#### 2. 构造函数不写 `return`

例如：

```js
function Person() {
  this.name = 'Tom'
}

const p = new Person()
```

最终：

```text
返回新创建的实例
```

也就是：

```js
p.name === 'Tom'
```

---
#### 3. 构造函数返回对象

例如：

```js
function Person() {
  this.name = 'Tom'

  return {
    name: 'Jerry'
  }
}

const p = new Person()
```

结果：

```js
console.log(p.name)
```

得到：

```text
Jerry
```

因为构造函数显式返回了一个对象：

```js
{
  name: 'Jerry'
}
```

对于普通基础构造函数，如果构造函数返回的是对象，`new` 的最终结果就是这个对象，而不是最开始创建的实例。([TC39](https://tc39.es/ecma262/2026/multipage/ordinary-and-exotic-objects-behaviours.html?utm_source=chatgpt.com))

---
#### 4. 构造函数返回基本类型

例如：

```js
function Person() {
  this.name = 'Tom'

  return 123
}

const p = new Person()
```

这里：

```js
return 123
```

不会让：

```js
p === 123
```

对于这种普通基础构造函数，基本类型返回值会被忽略，最终仍然返回之前创建的实例。

所以：

```js
p.name
```

仍然是：

```text
Tom
```

可以直接记：

```text
构造函数返回对象
→ 返回该对象

构造函数不返回 / 返回基本类型
→ 返回 new 创建的实例
```

([TC39](https://tc39.es/ecma262/2026/multipage/ordinary-and-exotic-objects-behaviours.html?utm_source=chatgpt.com))

这里说的是题目中的**普通基础构造函数**；派生 class constructor 的返回规则还有更严格的边界，不需要混进这道基础题里。

---
#### 5. 为什么箭头函数不能被 `new`？

例如：

```js
const Person = () => {}

new Person()
```

会抛：

```text
TypeError
```

原因不能只回答：

> “因为箭头函数没有 prototype。”

更根本的原因是：

> **箭头函数不是 constructor，没有 `[[Construct]]` 内部方法。**

`new` 执行时会先进行构造器检查：

```text
IsConstructor(Person)
```

如果不是构造器：

```text
false
↓
TypeError
```

ECMAScript 明确规定，能够被 `new` 构造的对象必须具备 `[[Construct]]`。([TC39](https://tc39.es/ecma262/2026/multipage/ecmascript-language-expressions.html?utm_source=chatgpt.com))

所以：

```text
没有 [[Construct]]
↓
不能 new
```

才是根本原因。

---
#### 6. `instanceof` 到底判断什么？

例如：

```js
p instanceof Person
```

很多人会误以为它判断：

```js
p.constructor === Person
```

这不是 `instanceof` 的默认核心机制。

普通情况下，它真正关注的是：

> **`Person.prototype` 是否存在于 `p` 的原型链中。**

例如：

```text
p
↓
Person.prototype
↓
Object.prototype
↓
null
```

因为：

```text
Person.prototype
```

确实出现在 `p` 的原型链里，所以：

```js
p instanceof Person
```

结果为：

```text
true
```

ECMAScript 的 `InstanceofOperator` 更完整：它会先查询右侧对象的 `Symbol.hasInstance`；普通函数继承默认实现时，最终执行普通的原型链判断。([TC39](https://tc39.es/ecma262/2026/multipage/ecmascript-language-expressions.html))

面试时可以说：

> **默认情况下，`instanceof` 会检查右侧构造函数的 `prototype` 是否出现在左侧对象的原型链上。**

这样既准确，也不会过度复杂。

---
#### 7. 为什么修改 `Person.prototype` 会影响 `instanceof`？

看：

```js
function Person() {}

const p = new Person()

Person.prototype = {}

console.log(p instanceof Person)
```

结果是：

```text
false
```

原因是创建 `p` 时：

```text
p.[[Prototype]]
↓
旧的 Person.prototype
```

假设旧对象叫：

```text
prototypeA
```

那么：

```text
p
↓
prototypeA
↓
Object.prototype
```

随后执行：

```js
Person.prototype = {}
```

只是把：

```text
Person.prototype
```

这个属性重新指向了一个**新的对象**，假设叫：

```text
prototypeB
```

现在：

```text
Person.prototype
↓
prototypeB
```

但是已经创建的 `p` 不会自动改原型：

```text
p
↓
prototypeA
```

所以 `instanceof` 检查：

```text
当前 Person.prototype
也就是 prototypeB

是否存在于 p 的原型链？
```

答案：

```text
不存在
```

因此：

```js
p instanceof Person
```

变成：

```text
false
```

这也再次说明：

> **`instanceof` 判断的不是对象身上的 `constructor` 字段，而是默认情况下检查当前 `Constructor.prototype` 与对象原型链之间的关系。**

([TC39](https://tc39.es/ecma262/2026/multipage/ecmascript-language-expressions.html))

---
#### 8. 为什么数组既是 `Array` 的实例，又是 `Object` 的实例？

例如：

```js
const arr = []

arr instanceof Array
```

结果：

```text
true
```

同时：

```js
arr instanceof Object
```

也是：

```text
true
```

因为数组的原型链大致是：

```text
arr
↓
Array.prototype
↓
Object.prototype
↓
null
```

判断：

```js
arr instanceof Array
```

是在问：

```text
Array.prototype
```

是否出现在原型链中。

答案：

```text
是
```

再判断：

```js
arr instanceof Object
```

是在问：

```text
Object.prototype
```

是否出现在原型链中。

答案也是：

```text
是
```

所以两个结果都是 `true`。

---
#### 9. 为什么 `1 instanceof Number` 是 false？

看：

```js
1 instanceof Number
```

结果：

```text
false
```

因为：

```js
1
```

是一个 Number **基本类型值**，不是对象。

普通 `instanceof` 判断中，如果左侧不是对象，默认 `OrdinaryHasInstance` 会直接得到 `false`。`instanceof` 不是在问“这个值的数据类型是不是 number”，而是在问对象是否属于某个原型链体系。([TC39](https://tc39.es/ecma262/2023/multipage/abstract-operations.html?utm_source=chatgpt.com))

所以：

```js
typeof 1
```

得到：

```text
number
```

而：

```js
1 instanceof Number
```

得到：

```text
false
```

两者解决的问题不一样。

---

但：

```js
new Number(1) instanceof Number
```

结果：

```text
true
```

因为：

```js
new Number(1)
```

创建的是一个 Number 包装对象。

其原型链中存在：

```text
Number.prototype
```

因此：

```text
Number 对象
↓
Number.prototype
↓
Object.prototype
↓
null
```

所以默认 `instanceof` 判断为 `true`。

---
#### 10. 把 `new` 和 `instanceof` 串起来

现在可以把第 30、31 题整个连起来：

```text
function Person() {}
        │
        │ prototype
        ↓
 Person.prototype
        ↑
        │ [[Prototype]]
        │
   new Person()
        ↓
        p
```

`new` 做的核心事情之一：

```text
建立：
p.[[Prototype]]
=
Person.prototype
```

而：

```js
p instanceof Person
```

默认判断的核心就是：

```text
Person.prototype、是否在、p 的原型链中？
```

因此：

```text
new
↓
建立原型关系
↓
instanceof
↓
检查这条原型关系
```

这两个知识点本质上是连在一起的。

---
#### 最终面试收敛回答

> **对于普通构造函数，`new` 可以理解为四个核心步骤：先创建一个新对象，把这个对象的 `[[Prototype]]` 关联到构造函数的 `prototype`，再把新对象作为 `this` 执行构造函数，最后根据构造函数返回值决定结果。如果显式返回对象，就返回该对象；如果没有返回或者返回基本类型，普通基础构造函数最终返回创建的新实例。箭头函数不能被 `new`，根本原因是它没有 `[[Construct]]`，不是 constructor。`instanceof` 默认也和原型链直接相关，它不是比较 `constructor` 属性，而是检查右侧构造函数当前的 `prototype` 是否出现在左侧对象的原型链中。因此 `new` 负责建立实例与 `Constructor.prototype` 的原型关系，而 `instanceof` 默认利用这条关系进行判断。** ([TC39](https://tc39.es/ecma262/2026/multipage/ecmascript-language-expressions.html?utm_source=chatgpt.com))

---

**Sources:**

- [ECMAScript® 2026 Language Specification](https://tc39.es/ecma262/2026/multipage/ecmascript-language-expressions.html?utm_source=chatgpt.com)

## 第32题 Flex 布局是什么？它有哪些常用属性？

### 题目

Flex 布局是什么？它有哪些常用属性？

### 问题

1. Flex 是什么？它主要解决什么类型的布局问题？
2. Flex 中的 **Flex Container、Flex Item、主轴、交叉轴** 分别是什么？
3. 主轴和交叉轴是不是固定对应水平和垂直方向？
4. Flex 容器上常用的属性有哪些？分别控制什么？
5. `justify-content`、`align-items`、`align-content` 有什么区别？
6. Flex 项目自身常用的属性有哪些？
7. `flex-grow`、`flex-shrink`、`flex-basis` 分别表示什么？
8. `align-items` 和 `align-self` 有什么区别？
9. `flex: 1` 是什么含义？
10. Flex 和 Grid 在布局模型上有什么区别？

### 回答要点

#### 1. Flex 的基本概念

- Flex 是 CSS 中的一种**一维布局模型**。
- 主要解决元素在一个方向上的排列、对齐和空间分配问题。
- 可以用于水平布局，也可以用于垂直布局。
- 如果需要同时精确控制行和列，一般更适合使用 Grid。
#### 2. Flex 的核心模型

- 设置 `display: flex` 的元素叫 **Flex Container**。
- 它的直接子元素叫 **Flex Item**。
- Flex 布局围绕两条轴展开：
  - Main Axis：主轴。
  - Cross Axis：交叉轴。
- 主轴方向由 `flex-direction` 决定，因此主轴不一定是水平方向。
#### 3. Flex 容器属性

- `flex-direction`：设置主轴方向。
- `flex-wrap`：控制项目是否换行。
- `justify-content`：控制项目在主轴方向的对齐和空间分配。
- `align-items`：控制项目在交叉轴上的默认对齐。
- `align-content`：多行情况下，控制各行在交叉轴上的分布。
- `gap`：设置项目之间的间距。
#### 4. Flex 项目属性

- `flex-grow`：有剩余空间时，项目如何增长。
- `flex-shrink`：空间不足时，项目如何收缩。
- `flex-basis`：参与伸缩计算前的基础尺寸。
- `flex`：`grow`、`shrink`、`basis` 的简写。
- `align-self`：单独设置某个项目在交叉轴上的对齐。
- `order`：调整项目的视觉排列顺序。
#### 5. 高频区别

- `align-items` 是**容器属性**，控制所有项目默认的交叉轴对齐。
- `align-self` 是**项目属性**，只控制当前项目，并可以覆盖 `align-items`。
- `flex: 1` 常见情况下可理解为：
  ```css
  flex-grow: 1;
  flex-shrink: 1;
  flex-basis: 0;
  ```

---

### 标准回答

Flex 是 CSS 中的一种**一维布局模型**，主要用于解决元素在水平或者垂直一个方向上的排列、对齐以及空间分配问题。它比较适合导航栏、工具栏、水平居中、垂直居中、左右布局以及一行多个元素自适应这类场景。

Flex 中首先要理解四个基本概念：

```text
Flex Container → Flex 容器
Flex Item      → Flex 项目
Main Axis      → 主轴
Cross Axis     → 交叉轴
```

例如：

```css
.container {
  display: flex;
}
```

此时 `.container` 是 Flex 容器，它的直接子元素就是 Flex Item。

主轴和交叉轴并不是固定对应水平和垂直方向。**主轴由 `flex-direction` 决定，交叉轴与主轴垂直。**

例如：

```css
flex-direction: row;
```

在常见书写模式下主轴是水平方向；而：

```css
flex-direction: column;
```

主轴就会变成垂直方向。
#### Flex 容器属性

Flex 的属性最好分成**容器属性**和**项目属性**来记。

容器属性主要负责整个 Flex 布局的整体规则。

`flex-direction` 用来设置主轴方向：

```css
flex-direction: row;
flex-direction: row-reverse;
flex-direction: column;
flex-direction: column-reverse;
```

`flex-wrap` 控制 Flex Item 是否允许换行：

```css
flex-wrap: nowrap;
flex-wrap: wrap;
```

默认通常是：

```css
flex-wrap: nowrap;
```

因此空间不足时，项目通常会先参与收缩，而不是直接换行。

对齐方面最常用的是：

```css
justify-content
align-items
```

其中：

```text
justify-content
→ 容器属性
→ 控制主轴方向上的对齐和空间分配

align-items
→ 容器属性
→ 控制项目在交叉轴上的默认对齐
```

例如：

```css
.container {
  display: flex;
  justify-content: center;
  align-items: center;
}
```

当主轴为水平方向时，可以实现常见的水平、垂直居中。

还有：

```css
align-content
```

它同样是**容器属性**，主要用于存在多行 Flex Item 时，控制多行整体在交叉轴上的分布。

此外：

```css
gap: 16px;
```

可以统一设置 Flex Item 之间的间距。

所以容器属性可以整体记成：

```text
flex-direction、flex-wrap、justify-content、align-items、align-content、gap
```
#### Flex 项目属性

项目属性控制的是某一个 Flex Item 自己如何参与布局。

最重要的是：

```text
flex-grow、flex-shrink、flex-basis
```

`flex-grow` 表示：

> 容器存在剩余空间时，这个项目按照什么比例参与增长。

`flex-shrink` 表示：

> 容器空间不足时，这个项目按照什么规则参与收缩。

`flex-basis` 表示：

> 在 Flex 进行伸缩计算之前，该项目在主轴方向上的基础尺寸。

这三个属性可以通过：

```css
flex
```

简写。

例如：

```css
.item {
  flex: 1;
}
```

常见情况下可以理解为：

```css
flex-grow: 1;
flex-shrink: 1;
flex-basis: 0;
```

也就是这个项目：

```text
可以增长 + 可以收缩 + 以 0 作为弹性分配的基础尺寸
```

因此经常用于让元素自动占据剩余空间。

另一个非常容易和 `align-items` 混淆的是：

```css
align-self
```

这里一定要区分：

```text
align-items
→ 容器属性
→ 设置所有 Flex Item 默认的交叉轴对齐

align-self
→ 项目属性
→ 单独修改当前 Flex Item 的交叉轴对齐
```

例如：

```css
.container {
  display: flex;
  align-items: center;
}

.item {
  align-self: flex-start;
}
```

其他项目仍然按照 `center` 对齐，而这个 `.item` 单独使用 `flex-start`。

项目自身还可以通过：

```css
order
```

调整视觉排列顺序。

因此项目属性可以整体记成：

```text
flex-grow、flex-shrink、flex-basis、flex、align-self、order
```

最后，Flex 和 Grid 的核心区别可以概括为：

```text
Flex
→ 一维布局
→ 主要解决一行或一列

Grid
→ 二维布局
→ 同时处理行和列
```
#### 最终面试收敛回答

> **Flex 是 CSS 中的一维布局模型，主要解决元素在水平或垂直一个方向上的排列、对齐和空间分配问题。设置 `display: flex` 的元素叫 Flex Container，它的直接子元素叫 Flex Item。Flex 通过主轴和交叉轴组织布局，主轴方向由 `flex-direction` 决定。Flex 属性最好分成两类来记：容器属性包括 `flex-direction`、`flex-wrap`、`justify-content`、`align-items`、`align-content` 和 `gap`；项目属性包括 `flex-grow`、`flex-shrink`、`flex-basis`、`flex`、`align-self` 和 `order`。其中 `justify-content` 控制主轴，`align-items` 是容器属性，控制项目在交叉轴上的默认对齐，而 `align-self` 是项目属性，可以单独覆盖某个项目的对齐。`flex: 1` 常见情况下可以理解为 `flex: 1 1 0`。**

## 第33题 BFC 是什么？它为什么能解决高度塌陷、Margin 折叠和浮动遮盖问题？

### 题目

BFC 是什么？它为什么能解决高度塌陷、Margin 折叠和浮动遮盖问题？

### 问题

1. BFC 是什么？它是一种 CSS 属性，还是一种布局上下文？
2. 为什么可以把 BFC 理解成一个**独立的布局边界**？
3. 哪些常见情况会创建新的 BFC？
4. BFC 所谓的“内部和外部相对隔离”到底是什么意思？
5. 为什么父元素创建 BFC 后，能够包含内部浮动元素，从而解决高度塌陷？
6. 为什么 BFC 能解决父子元素之间的 `margin` 折叠？
7. **两个相邻兄弟元素各自创建 BFC，外边距就一定不会折叠吗？**
8. 为什么一个元素创建 BFC 后，可以避免与旁边的浮动元素发生盒级重叠？
9. 高度塌陷、Margin 折叠、浮动遮盖这三个现象，能不能统一从“BFC 建立独立布局边界”来理解？

---

### 回答要点

#### 1. BFC 的本质：建立一个独立的布局环境

BFC 全称 **Block Formatting Context，块级格式化上下文**。

它不是一个 CSS 属性，也不是浏览器真的给元素外面新增了一层 DOM 或盒子，而是：

> **某个盒子为自己的内容建立了一套独立的块级布局环境。**

可以把它抽象成：

```text
外部 Formatting Context

┌────────── BFC 边界 ──────────┐
│                              │
│     内部元素按照这个 BFC      │
│     的规则进行布局             │
│                              │
└──────────────────────────────┘
```

这个“边界”是**布局计算上的边界**。

CSS Display 规范对 independent formatting context 的描述也非常接近这个理解：除盒子自身尺寸等联系外，内部后代的布局通常不受外部格式化上下文内容影响，内部布局的影响通常也不会向外逃逸。([W3C](https://www.w3.org/TR/css-display-3/?utm_source=chatgpt.com))

---
#### 2. 常见创建 BFC 的方式

例如：

```css
display: flow-root;
```

以及常见的：

```css
overflow: hidden;
overflow: auto;
overflow: scroll;
```

还有：

```text
float 不为 none
position: absolute / fixed
display: inline-block
table-cell 等
```

CSS2 规范明确列出了浮动、绝对定位、`inline-block`、`table-cell`、部分 `overflow` 非 `visible` 的块盒等会建立新的 BFC。([W3C](https://www.w3.org/TR/CSS2/visuren.html))

现代 CSS 中如果单纯为了建立 BFC，最容易理解的是：

```css
display: flow-root;
```

因为它的语义就是建立一个新的块级格式化上下文。([W3C](https://www.w3.org/TR/css-display-3/?utm_source=chatgpt.com))

---
#### 3. 三个作用的共同原理

可以把 BFC 的核心原理统一理解成：

```text
创建 BFC
↓
形成独立的块级格式化上下文
↓
形成布局计算边界
↓
浮动、margin、块盒布局
按照 BFC 边界相关规则处理
```

所以 BFC 解决的三个经典问题：

```text
高度塌陷、Margin 折叠、浮动遮盖
```

确实都可以从：

> **BFC 建立了新的布局上下文和布局边界**

这个角度理解。

但三个问题对应的**具体规范规则并不完全一样**，这一点面试时讲出来会更准确。

---

### 标准回答

BFC 是 **Block Formatting Context，块级格式化上下文**。

它不是一个具体 CSS 属性，而是一种**独立的块级布局环境**。

一个元素满足建立 BFC 的条件以后，并不是浏览器真的在它外面多套一个盒子，而是：

> **这个元素的内部内容开始在一个新的 Formatting Context 中进行布局。**

因此可以把 BFC 理解成存在一条**布局边界**：

```text
外部布局环境

┌──────────── BFC ────────────┐
│                             │
│       内部自己的布局环境      │
│                             │
└─────────────────────────────┘
```

内部和外部并不是“完全没有任何联系”，因为 BFC 本身的尺寸仍然会参与父级布局。

更准确的是：

> **内部的布局规则和影响通常不会直接跨越 Formatting Context 边界，外部的相关布局影响通常也不会直接进入内部。**

CSS Display 对 independent formatting context 的定义就是：内部后代的布局通常不受外部 Formatting Context 的规则和内容影响，反过来也一样；其中还特别举出了 float 和 margin 的例子。([W3C](https://www.w3.org/TR/css-display-3/?utm_source=chatgpt.com))
#### 一、为什么 BFC 能解决浮动导致的高度塌陷？

例如：

```html
<div class="parent">
  <div class="child"></div>
</div>
```

```css
.child {
  float: left;
  width: 100px;
  height: 100px;
}
```

浮动元素不再按照普通流的方式参与周围盒子的常规排布，所以普通父元素可能出现：

```text
parent
┌────────────────┐
└────────────────┘

child float
┌────────┐
│        │
│        │
└────────┘
```

看起来父元素没有被浮动子元素撑起来，也就是常说的**高度塌陷**。

如果让父元素建立新的 BFC：

```css
.parent {
  display: flow-root;
}
```

这时候：

```text
parent 建立 BFC
↓
child 是这个 BFC 内部的浮动
↓
这个浮动的影响被限制在当前 Formatting Context
↓
BFC 根计算高度时需要包含内部浮动
↓
parent 高度被撑开
```

可以画成：

```text
┌──────────── parent / BFC ────────────┐
│                                      │
│   ┌──── float child ────┐            │
│   │                     │            │
│   │                     │            │
│   └─────────────────────┘            │
│                                      │
└──────────────────────────────────────┘
```

所以统一理解是：

> **BFC 把内部浮动限制在自己的布局环境中，并按照 BFC 的高度规则将内部浮动纳入 BFC 根的尺寸计算，因此能够包含浮动。**

CSS Display 也明确用 float 说明独立格式化上下文：float 的影响不会逃出自己的 Formatting Context，而建立该上下文的盒子会增长以包含它们。([W3C](https://www.w3.org/TR/css-display-3/?utm_source=chatgpt.com))

---
#### 二、为什么 BFC 能解决父子 Margin 折叠？

普通情况下：

```html
<div class="parent">
  <div class="child"></div>
</div>
```

```css
.child {
  margin-top: 50px;
}
```

在满足 margin collapse 条件时：

```text
parent
┌──────────────────────────┐
│
│ child 的 margin-top
│ 可能与 parent 的 margin
│ 发生折叠
```

可以表现得像：

```text
child 的 margin
“越过了父元素的边界”
```

原因是父元素和子元素原本参与同一个 BFC，满足 margin adjoining 的条件。

CSS2 对 margin collapse 有一个非常关键的前提：

> 两个 margin 要发生折叠，它们必须属于**参与同一个 BFC 的正常流块级盒子**。([W3C](https://www.w3.org/TR/CSS2/box.html))

如果父元素自己建立新的 BFC：

```css
.parent {
  display: flow-root;
}
```

那么：

```text
外部 BFC
│
├─ parent
│   │
│   └── 新 BFC
│        ↓
│       child
```

父元素自身的外部布局和子元素参与的内部 BFC 被分开。

所以：

```text
child 的内部 margin
×
不能跨 Formatting Context 边界
与 parent 外部 margin 折叠
```

这就是为什么：

> **创建 BFC 可以阻断典型的父子 margin 折叠。**

CSS2 也直接规定，建立新 BFC 的元素，其 margin 不会和正常流子元素的 margin 折叠。([W3C](https://www.w3.org/TR/CSS2/box.html))

---
#### 三、但“两个兄弟各自是 BFC，就一定不 Margin 折叠”是不准确的

这是这里最重要的修正。

假设：

```html
<div class="a"></div>
<div class="b"></div>
```

即使：

```css
.a {
  display: flow-root;
  margin-bottom: 20px;
}

.b {
  display: flow-root;
  margin-top: 30px;
}
```

`.a` 和 `.b` **内部**分别有自己的 BFC：

```text
父 BFC

┌──── a ────┐
│ a 的 BFC   │
└───────────┘
    margin

    margin
┌──── b ────┐
│ b 的 BFC   │
└───────────┘
```

但是：

```text
a 的 margin-bottom
b 的 margin-top
```

是 `.a` 和 `.b` **自身的外部 margin**。

这两个盒子作为兄弟，仍然参与父元素建立的**同一个 BFC**。

所以它们的外部垂直 margin：

> **仍然可能发生折叠。**

CSS2 甚至直接规定：正常流块级元素的 bottom margin 与后续正常流块级兄弟的 top margin，在满足条件时会折叠。([W3C](https://www.w3.org/TR/CSS2/box.html))

因此一定不要记成：

```text
两个元素分别创建 BFC
↓
两个兄弟 margin 一定不折叠
```

不成立。

真正要抓住的是：

> **Margin 不能跨 Formatting Context 边界折叠。**

但 BFC 根自己的**外部 margin**仍然属于它所在的父 Formatting Context。

所以：

```text
父子 margin
→ 建立 BFC 通常可以阻断

BFC 内部与外部 margin
→ 不能跨边界 collapse

两个 BFC 根作为兄弟的外部 margin
→ 仍可能在共同父 BFC 中 collapse
```

这三个要区分开。

---
#### 四、为什么 BFC 能避免浮动元素遮盖？

例如：

```html
<div class="left"></div>
<div class="right"></div>
```

```css
.left {
  float: left;
  width: 200px;
}
```

普通 `.right`：

```text
float
┌───────┐
│ left  │  right 的内容可能绕着 float
│       │
└───────┘
```

如果：

```css
.right {
  display: flow-root;
}
```

`.right` 创建新的 BFC。

那么 CSS 对 BFC 根还有一个明确规则：

> **正常流中建立新 BFC 的元素，其 border box 不允许与同一个外部 BFC 中 float 的 margin box 重叠。** ([W3C](https://www.w3.org/TR/CSS2/visuren.html))

因此浏览器会调整它：

```text
┌─────────┐ ┌──────────────────┐
│  float  │ │     right BFC    │
│  left   │ │                  │
│         │ │                  │
└─────────┘ └──────────────────┘
```

这仍然可以从“布局边界”理解：

```text
right 创建 BFC
↓
成为独立的布局区域
↓
BFC 根不能直接侵入 float 的区域
↓
浏览器重新计算 right 的可用区域
↓
避免盒级遮盖
```

这里并不是因为：

```text
margin 不互相影响
```

而是因为 **BFC 与 float 有专门的避让规则**。([W3C](https://www.w3.org/TR/CSS2/visuren.html))

---
#### 最终面试收敛回答

> **BFC 是 Block Formatting Context，也就是块级格式化上下文。它不是一个 CSS 属性，而是一种独立的块级布局环境。元素建立 BFC 后，可以把它理解成形成了一条布局计算上的边界：内部后代按照这个 Formatting Context 的规则进行布局，内部布局的影响通常不会直接逃逸到外部，外部 Formatting Context 的相关布局影响通常也不会直接进入内部。BFC 能解决的几个经典问题都可以从这个“布局边界”理解。第一，对于浮动，内部 float 的影响被限制在 BFC 内，同时 BFC 根计算尺寸时会包含内部 float，所以能解决父元素高度塌陷；第二，margin 折叠要求相关 margin 参与同一个 BFC，因此建立新的 BFC 可以阻断典型的父子 margin 折叠，但两个 BFC 根作为兄弟时，它们自己的外部 margin 仍可能在共同父 BFC 中折叠；第三，一个正常流元素建立 BFC 后，其 border box 按规范不能和同一个外部 BFC 中 float 的 margin box 重叠，因此能够避免浮动元素造成的盒级覆盖。所以统一原理可以记成：BFC 建立独立布局边界，但高度、margin 和 float 分别有对应的具体布局规则。** ([W3C](https://www.w3.org/TR/css-display-3/?utm_source=chatgpt.com))

---

**Sources:**

- [CSS Display Module Level 3](https://www.w3.org/TR/css-display-3/?utm_source=chatgpt.com)

## 第34题 CSS 中有哪些定位方式？`relative`、`absolute`、`fixed`、`sticky` 分别以谁为参考？

### 题目

CSS 中有哪些定位方式？`relative`、`absolute`、`fixed`、`sticky` 分别以谁为参考？

### 问题

1. CSS 的 `position` 有哪些常见取值？
2. 哪些定位方式脱离普通文档流，哪些仍然参与普通流？
3. `static` 的特点是什么？为什么设置 `top / left` 通常没有效果？
4. `relative` 以谁作为偏移参考？移动后原来的位置是否保留？
5. `absolute` 脱离普通流后，相对于谁进行定位？
6. 为什么不能简单说 `absolute` 一定相对于父元素？
7. `fixed` 和 `absolute` 的主要区别是什么？
8. `sticky` 是否脱离普通文档流？
9. Sticky 为什么同时需要理解两个参考对象：
   - **最近的滚动容器**
   - **自己的包含块/父级范围**
10. Sticky 的 `top: 0` 到底是相对于谁计算的？
11. 为什么父级滚出相应区域后，Sticky 元素最终也会跟着离开？
12. 为什么有时写了：

```css
position: sticky;
top: 0;
```

仍然看不到粘性效果？

---

### 回答要点

#### 1. 五种定位方式

| 定位 | 是否脱离普通流 | 主要参考 |
|---|---|---|
| `static` | 否 | 正常文档流 |
| `relative` | 否 | 自己原来的位置 |
| `absolute` | 是 | absolute containing block |
| `fixed` | 是 | 通常是视口 |
| `sticky` | 否 | **滚动参考 + 包含块限制** |

理解定位最重要的三个问题是：

```text
是否脱离普通流？、以谁作为定位参考？、滚动以后会发生什么？
```

---
#### 2. `static`

`static` 是默认定位方式。

```css
.item {
  position: static;
}
```

元素完全按照正常文档流进行排列：

```text
元素 A
↓
元素 B
↓
元素 C
```

它不是定位元素，所以：

```css
top: 10px;
left: 20px;
```

通常不会产生定位偏移。

可以记：

> **static = 正常排版，没有额外的定位参考系。**

CSS Position 规范将 `static` 定义为按照正常格式化上下文布局，inset 属性不适用于这种定位方式。([W3C 邮件列表存档](https://lists.w3.org/Archives/Public/public-css-archive/2018Apr/0044.html?utm_source=chatgpt.com))

---
#### 3. `relative`

`relative` 不脱离普通文档流。

它首先按照普通流得到自己的原始位置：

```text
正常布局位置
      ↓
┌─────────┐
│  item   │
└─────────┘
```

然后：

```css
position: relative;
top: 20px;
left: 30px;
```

再从原位置发生偏移。

关键在于：

> **视觉位置移动了，但是它原来占据的布局空间仍然保留。**

所以：

```text
relative
→ 不脱离普通流
→ 参考自己原来的位置
→ 原来的占位仍然存在
```

---
#### 4. `absolute`

`absolute` 最大特点是：

> **脱离普通文档流。**

因此普通流中的其他元素不会再为它保留原来的位置。

它定位时并不是简单找：

```text
直接父元素
```

而是寻找自己的 **containing block**。

项目中最常见：

```css
.parent {
  position: relative;
}

.child {
  position: absolute;
  top: 0;
  left: 0;
}
```

此时可以理解为：

```text
parent
建立 absolute 的定位参考

        ↓

child absolute
相对于 parent 定位
```

所以经常总结：

```text
父 relative
子 absolute
```

但更严格的说法是：

> **absolute 相对于建立其 absolute positioning containing block 的祖先定位。**

因此不能死记成“相对于父元素”。

---
#### 5. `fixed`

`fixed` 和 `absolute` 一样：

```text
都会脱离普通文档流
```

区别主要在参考系。

一般：

```css
position: fixed;
top: 0;
```

参考的是：

```text
Viewport
浏览器视口
```

所以页面滚动：

```text
页面内容 ↓↓↓

fixed 元素
保持在视口相同位置
```

因此非常适合：

```text
全屏遮罩、右下角悬浮按钮、固定工具栏、回到顶部
```

可以先记：

```text
absolute
→ 局部定位参考

fixed
→ 通常相对于视口
```

严格来说，某些祖先的 `transform` 等属性也可能改变 fixed 的 containing block，因此“永远相对 viewport”也不是绝对的。

---
#### 6. Sticky 是这一题最需要讲清楚的

`sticky` 最重要的第一点：

> **Sticky 没有脱离普通文档流。**

例如：

```css
.header {
  position: sticky;
  top: 0;
}
```

它首先仍然像正常元素一样参与布局：

```text
内容 A

┌───────────┐
│  sticky   │
└───────────┘

内容 B
内容 C
```

它原来占据的位置是存在的。

这一点和：

```text
absolute
fixed
```

不同。

---
##### Sticky 要看两个参考

理解 Sticky 最核心的地方，就是**它其实同时受到两套约束**。

可以直接记：

```text
Sticky
│
├── ① 滚动参考
│      → 最近的 Scroll Container / Scrollport
│      → 决定“粘在哪里”
│
└── ② 活动范围
       → Sticky 自己的 containing block
       → 决定“最多能粘多久”
```

这是 Sticky 最清晰的理解模型。

---
###### 最近的滚动容器

例如：

```html
<div class="scroll">
  <div class="parent">
    <div class="sticky">标题</div>
  </div>
</div>
```

```css
.scroll {
  overflow: auto;
  height: 500px;
}

.sticky {
  position: sticky;
  top: 0;
}
```

那么 Sticky 的：

```css
top: 0;
```

主要参考的不是：

```text
parent 顶部
```

而是最近 scrollport 的顶部。

也就是这里的：

```text
.scroll
```

所以：

```text
.scroll
┌──────────────────────────┐ ← top: 0 的参考边缘
│ sticky                   │
│                          │
│                          │
└──────────────────────────┘
```

随着 `.scroll` 滚动，当 Sticky 原本的位置即将超过这个限制：

```text
sticky 到达 scrollport top: 0
```

浏览器开始对它进行粘性偏移。

CSS Position 规范对 sticky 的定义就是：它类似 relative positioning，但偏移会参考**最近 scrollport**进行调整。([W3C 邮件列表存档](https://lists.w3.org/Archives/Public/public-css-archive/2022Jul/0244.html?utm_source=chatgpt.com))

---
###### “最近滚动容器”怎么理解？

开发中经常简单记成：

> **向上寻找最近设置了 `overflow` 滚动机制的祖先。**

例如：

```css
overflow: auto;
overflow: scroll;
overflow: hidden;
```

都可能改变 Sticky 所参考的最近 scrollport。

因此一个很经典的 Sticky Bug 是：

```html
<body>
  <div class="wrapper">
    <div class="sticky"></div>
  </div>
</body>
```

```css
.wrapper {
  overflow: hidden;
}
```

你原本以为：

```text
sticky
→ 相对浏览器窗口吸顶
```

但实际上这个祖先可能已经改变了它所关联的滚动环境。

所以排查 Sticky 时一定要向父级检查：

```text
overflow
```

需要注意，`overflow: clip` 和 `overflow: hidden` 在滚动容器语义上并不完全一样，不能简单概括成所有“不是 visible”的值效果完全相同。([W3C 邮件列表存档](https://lists.w3.org/Archives/Public/public-css-archive/2018Apr/0157.html?utm_source=chatgpt.com))

---
###### Containing Block 限制 Sticky 的活动范围

这是 Sticky 和 Fixed 最大的区别之一。

Sticky 虽然可以：

```text
“吸附”
```

但它并不能无限粘在整个页面上。

因为：

> **Sticky 本身仍然属于正常文档流，也仍然受到自身 containing block 的范围约束。**

例如：

```html
<div class="parent">
  <div class="sticky">标题</div>

  很多内容……
</div>

<div class="next">
  下一个区域
</div>
```

开始时：

```text
┌──────── parent ──────────┐
│ sticky                   │
│                          │
│ 很多内容                  │
│                          │
└──────────────────────────┘

next
```

向下滚动以后：

```text
viewport top
──────────────────────────

sticky ← 暂时粘在这里

parent 其余内容
```

但是继续滚：

```text
parent 的底部
逐渐接近 sticky
```

Sticky 不能继续无限向下脱离自己的 containing block。

最终：

```text
parent 整体离开
↓
sticky 也跟着离开
```

所以你刚才的理解可以收敛成一句非常好的面试回答：

> **Sticky“粘在哪里”主要由最近 scrollport 决定，而“最多能粘多久、能活动到哪里”受到自身 containing block 的范围限制。**

这比简单说：

```text
sticky = relative + fixed
```

准确很多。

---
##### Sticky 的两个角色可能来自不同祖先

例如：

```html
<div class="scroll">
  <div class="section">
    <div class="sticky"></div>
  </div>
</div>
```

假设：

```css
.scroll {
  overflow: auto;
}

.sticky {
  position: sticky;
  top: 0;
}
```

那么可以理解：

```text
.scroll
↓
提供最近 scrollport
↓
决定 top: 0 相对于哪里

.section
↓
参与确定 sticky 的 containing block
↓
限制 sticky 的活动范围
```

也就是说：

```text
“粘在哪里”
和
“能粘到什么时候”

不一定由同一个元素决定
```

这是 Sticky 最核心的知识点。

---
##### 为什么父级离开以后 Sticky 也会消失？

这里不要简单解释为：

> “因为 Sticky 是父元素的孩子，所以父元素没了它也没了。”

应该从布局模型解释：

```text
sticky
仍然参与普通流
↓
它有自己的 containing block
↓
粘性定位只是对正常位置进行约束性偏移
↓
它不能无限逃离自己的 containing block
↓
包含区域滚动离开
↓
sticky 也必须随之离开
```

因此 Sticky 和 Fixed 本质不同：

```text
fixed

viewport
┌─────────────────────┐
│ fixed               │
│                     │
└─────────────────────┘

父内容滚走
fixed 通常仍然存在
```

而：

```text
sticky

viewport
┌─────────────────────┐
│ sticky              │
│                     │
└─────────────────────┘

所属 containing block 滚走
sticky 最终也离开
```

---
##### 为什么 Sticky 有时候不生效？

可以直接按三个条件排查。
###### 看有没有阈值：

```css
position: sticky;
top: 0;
```

如果只有：

```css
position: sticky;
```

通常没有明确的粘性约束边缘。
###### 看最近滚动容器到底是谁：

向祖先检查：

```css
overflow
```

特别是：

```text
auto、scroll、hidden
```

因为你以为参考 viewport，但实际上中间某个祖先可能已经改变了最近 scrollport。
###### 看 containing block 有没有足够的活动范围。

例如父元素只有：

```text
50px 高
```

Sticky 自己也是：

```text
50px 高
```

那它基本没有能够产生明显 sticky 效果的移动区间。

所以 Sticky 是否正常工作，可以记：

```text
有 sticky inset
+
找对最近 scrollport
+
containing block 有足够活动空间
```

---

### 标准回答

> **CSS 的定位主要有 `static`、`relative`、`absolute`、`fixed` 和 `sticky`。`static` 是默认正常布局，不能通过 `top/left` 等进行定位偏移；`relative` 不脱离普通流，以自己原来的位置为参考偏移，而且原来的布局空间仍然保留；`absolute` 脱离普通流，相对于自己的 containing block 定位，项目中常见的是父 `relative`、子 `absolute`；`fixed` 也脱离普通流，通常相对于 viewport 定位，因此页面滚动后仍保持在视口固定位置。**
>
> **Sticky 比较特殊，它不脱离普通流，同时要看两个参考：第一是最近的 scrollport，它决定 Sticky“粘在哪里”，例如 `top: 0` 是相对于最近 scrollport 的顶部进行限制；第二是 Sticky 自己的 containing block，它决定 Sticky“最多能够粘多久、活动到哪里”。因此 Sticky 到达滚动阈值后会产生吸附效果，但不能无限脱离自己的包含区域，当包含区域最终滚走时 Sticky 也会一起离开。所以 Sticky 可以概括为：正常流决定它属于哪里，最近 scrollport 决定它粘在哪里，containing block 决定它能粘到什么时候。** ([W3C 邮件列表存档](https://lists.w3.org/Archives/Public/public-css-archive/2018Apr/0044.html?utm_source=chatgpt.com))

---

**Sources:**

- [[csswg-drafts] [css-position] ‘Sticky’ as position scheme that uses containing block and margin is too limiting? from jonjohnjohnson via GitHub on 2018-04-03 (public-css-archive@w3.org from April 2018)](https://lists.w3.org/Archives/Public/public-css-archive/2018Apr/0044.html?utm_source=chatgpt.com)

## 第35题 Vue 的响应式原理是什么？Vue2 和 Vue3 分别是怎么实现的？

### 题目

Vue 的响应式原理是什么？Vue2 和 Vue3 分别是怎么实现的？

### 问题

1. 什么是 MVVM？View、Model、ViewModel 分别是什么？
2. 在 Vue 中，View → Model 和 Model → View 分别是怎么实现的？
3. 为什么说真正的“Vue 响应式原理”重点解决的是 **Model → View**？
4. Vue 响应式系统的核心链路是什么？
5. Vue2 为什么使用 `Object.defineProperty`？依赖收集和派发更新是怎么完成的？
6. Vue2 中 `Dep` 和 `Watcher` 分别起什么作用？
7. Vue2 为什么无法自然监听对象属性的新增、删除，以及数组下标修改？
8. Vue2 是如何解决对象新增/删除属性和数组变更问题的？
9. Vue3 为什么将 `Object.defineProperty` 改成 `Proxy`？
10. Vue3 中 `Proxy`、`track`、`trigger`、`effect` 分别负责什么？
11. Vue3 为什么使用 `WeakMap → Map → Set` 保存依赖关系？三层分别对应什么？
12. `reactive` 和 `ref` 有什么区别？为什么基本类型通常需要 `ref`？
13. `ref` 包装对象时和 `reactive` 是什么关系？
14. Vue2 和 Vue3 的响应式原理有哪些相同点，又有哪些实现层面的区别？

---

### 回答要点

#### 1. 先从 MVVM 理解 Vue 要解决什么问题

MVVM 可以分成：

```text
View
→ 视图层

ViewModel
→ View 与 Model 之间的中间层

Model
→ 数据层
```

它希望建立：

```text
View  ⇄  ViewModel  ⇄  Model
```

即：

```text
Model 变化
→ View 自动更新

View 中用户输入
→ Model 自动更新
```

不过面试中最好补一句：

> Vue 的设计受到 MVVM 启发，但 Vue 官方并没有把 Vue 严格定义为一个标准 MVVM 框架。Vue2 官方文档也明确使用了“受 MVVM 启发，而不是严格与 MVVM 关联”的表述。([Vue.js](https://v2.vuejs.org/v2/guide/instance?utm_source=chatgpt.com))

---
#### 2. “双向绑定”实际上是两条不同链路

##### View → Model

例如：

```html
<input v-model="name">
```

本质可以理解成：

```html
<input
  :value="name"
  @input="name = $event.target.value"
>
```

也就是：

```text
用户操作 DOM
↓
触发 input / change 等 DOM 事件
↓
执行事件处理函数
↓
修改 JavaScript 数据
```

所以这一方向本质上主要是：

> **属性绑定 + DOM 事件监听 + 赋值。**

Vue 的 `v-model` 帮我们把这套代码封装成了声明式语法。Vue 官方文档也是这样解释 `v-model` 的。([Vue.js](https://vuejs.org/guide/components/v-model.html?utm_source=chatgpt.com))
##### Model → View

真正需要响应式系统解决的是：

```text
数据变了
↓
Vue 怎么知道数据变了？
↓
哪些视图使用过这个数据？
↓
只通知这些依赖更新
↓
重新执行组件更新
↓
更新 DOM
```

因此 Vue 响应式系统的核心重点是：

> **Model → View。**

---
#### 3. Vue 响应式的统一原理

无论 Vue2 还是 Vue3，都可以抽象成三个核心步骤：

```text
数据劫持 / 数据访问拦截
↓
依赖收集
↓
数据变化后触发依赖更新
```

也就是：

```text
读取数据
→ 记录“谁依赖了这个数据”

修改数据
→ 找出“谁依赖这个数据”

通知它们更新
```

Vue2 和 Vue3的**思想基本一致**，主要区别在于底层数据拦截和依赖管理的实现方式不同。

---

### 标准回答

Vue 的响应式原理，我会先从 MVVM 的数据流开始理解。

MVVM 中主要有三部分：

```text
View
→ 页面视图

Model
→ 数据

ViewModel
→ 连接 View 和 Model
```

它希望实现：

```text
View ⇄ Model
```

也就是数据变化时视图自动更新，用户修改视图时数据也能够同步更新。

不过 Vue 并不是严格意义上的标准 MVVM 实现，更准确地说是它的设计受到 MVVM 思想影响。([Vue.js](https://v2.vuejs.org/v2/guide/instance?utm_source=chatgpt.com))

在 Vue 中，“双向同步”实际上可以拆成两个方向。
#### 一、View → Model：本质是事件监听

比如：

```html
<input v-model="name">
```

Vue 帮我们实现的核心逻辑可以理解成：

```html
<input
  :value="name"
  @input="name = $event.target.value"
>
```

也就是：

```text
用户输入
↓
DOM 触发 input 事件
↓
事件处理函数执行
↓
修改 name
```

所以：

> **View → Model 主要依赖 DOM 事件监听和赋值，Vue 的 `v-model` 只是帮我们把属性绑定和事件处理封装起来。**

Vue 官方文档也明确说明，原生表单上的 `v-model` 会展开成相应的 DOM property 和事件，例如文本输入框对应 `value + input`。([Vue.js](https://vuejs.org/guide/essentials/forms.html?source=post_page---------------------------&utm_source=chatgpt.com))

而 Vue 响应式系统真正重点解决的是另外一个方向：

```text
Model → View
```

也就是：

> **当数据发生变化以后，如何知道哪些页面和逻辑使用了这个数据，并通知它们更新。**

整个响应式原理可以概括成：

```text
数据劫持
↓
依赖收集
↓
数据变化
↓
依赖通知
↓
页面更新
```

---
#### 二、Vue2：`Object.defineProperty + Dep + Watcher`

Vue2 的数据劫持主要通过：

```js
Object.defineProperty()
```

实现。

初始化 `data` 时，Vue 会遍历数据对象，对已有属性建立 getter 和 setter。

可以简化理解成：

```js
Object.defineProperty(obj, 'name', {
  get() {
    // 收集依赖
    return value
  },

  set(newValue) {
    value = newValue

    // 通知依赖更新
  }
})
```

因此 Vue2 的响应式闭环是：

```text
组件第一次渲染
↓
读取 data 中的属性
↓
触发 getter
↓
进行依赖收集
↓
记录哪些 Watcher 使用了这个属性

之后属性发生修改
↓
触发 setter
↓
通知对应依赖
↓
Watcher 更新
↓
组件重新渲染
```

Vue2 官方文档描述的也是这个过程：组件渲染时会有对应的 watcher，它记录渲染过程中访问到的响应式属性；之后这些属性的 setter 被触发时，会通知 watcher，使组件重新渲染。([Vue.js](https://v2.vuejs.org/v2/guide/reactivity.html?utm_source=chatgpt.com))

这里可以把几个角色分开：

```text
getter
→ 发现“当前属性被使用了”

Dep
→ 保存当前属性的依赖

Watcher
→ 代表需要在数据变化后重新执行的观察者/组件更新逻辑

setter
→ 数据变化后通知 Dep

Dep
→ 通知相关 Watcher 更新
```

所以结构上可以理解成：

```text
属性
↓
Dep
↓
Watcher A
Watcher B
Watcher C
```

---
#### 三、为什么 Vue2 有响应式局限？

根本原因在于：

> **`Object.defineProperty` 是针对“已有对象属性”进行 getter/setter 转换，而不是直接代理整个对象的所有操作。**

例如初始化：

```js
data: {
  user: {
    name: 'Tom'
  }
}
```

Vue 可以在初始化阶段处理：

```text
user.name
```

但是之后：

```js
user.age = 18
```

这是一个全新的属性。

因为初始化时并不存在：

```text
age
```

所以 Vue 没有提前给它建立对应的 getter/setter。

因此：

```text
新增属性
→ 没有对应响应式 getter/setter
→ 无法按原机制收集和触发依赖
```

删除属性同理。

所以 Vue2 提供：

```js
Vue.set()
Vue.delete()
```

来显式处理这种情况。([Vue.js](https://v2.vuejs.org/v2/guide/reactivity.html?utm_source=chatgpt.com))

---

数组也是 Vue2 的典型限制。

这里要稍微修正一个常见说法：

> 不是 JavaScript 的 `Object.defineProperty` “完全无法处理数组下标”，而是 Vue2 的响应式实现**没有对数组每个索引都进行和普通对象属性完全相同的拦截方式**。

因此：

```js
arr[0] = newValue
```

这样的直接索引赋值，在 Vue2 中无法可靠触发响应式更新。

Vue2 对数组采用了另一套方案：

> **重写数组中会改变原数组的 7 个方法。**

分别是：

```text
push、pop、shift、unshift、splice、sort、reverse
```

例如：

```js
arr.push(1)
```

Vue 可以在重写后的 `push` 中完成：

```text
执行原始 push + 观察新增数据 + 通知依赖更新
```

所以 Vue2 的问题可以总结成：

```text
Object.defineProperty
→ 主要围绕已有属性建立 getter/setter
↓
新增属性不自然
删除属性不自然
数组索引修改不自然
↓
Vue.set / Vue.delete
+
重写数组变更方法
```

([Vue.js](https://v2.vuejs.org/v2/guide/reactivity.html?utm_source=chatgpt.com))

---
#### 四、Vue3：`Proxy + track + trigger + effect`

Vue3 的总体思想没有变：

```text
拦截数据
↓
收集依赖
↓
数据变化
↓
触发依赖
```

但是数据劫持从：

```text
Vue2
Object.defineProperty
```

变成了：

```text
Vue3
Proxy
```

Vue3：

```js
const state = reactive({
  name: 'Tom',
  age: 18
})
```

本质上返回的是：

```text
原始对象
↓
Proxy
↓
响应式代理对象
```

Vue 官方文档明确说明，`reactive()` 返回的是原对象的 Proxy。([Vue.js](https://vuejs.org/api/reactivity-core.html?utm_source=chatgpt.com))

核心思想可以简化成：

```js
new Proxy(target, {
  get(target, key) {
    track(target, key)

    return target[key]
  },

  set(target, key, value) {
    target[key] = value

    trigger(target, key)

    return true
  }
})
```

因此：

```text
读取属性
↓
Proxy get
↓
track()
↓
依赖收集
```

修改属性：

```text
修改属性
↓
Proxy set
↓
trigger()
↓
找到相关依赖
↓
触发 effect
```

Vue 官方对 Vue3 响应式的伪代码也正是 `Proxy get → track`、`Proxy set → trigger` 这一结构。([Vue.js](https://vuejs.org/guide/extras/reactivity-in-depth.html?m=o&u=t&utm_source=chatgpt.com))

严格来说 Proxy 不只有：

```text
get
set
```

还可以拦截：

```text
deleteProperty、has、ownKeys、……
```

因此对于：

```js
state.age = 18
delete state.name
```

这种新增、删除操作，Vue3 都可以在代理层感知。

这也是 Vue3 能解决 Vue2 一部分响应式局限的根本原因：

```text
Vue2
→ 劫持已有属性

Vue3
→ 代理对象操作
```

---
#### 五、Vue3 怎么保存依赖：`WeakMap → Map → Set`

因为 Vue3 是代理整个对象，所以必须进一步知道：

> **这个对象的哪个属性，被哪些 effect 使用了？**

因此不能只保存：

```text
对象 → effect
```

而需要：

```text
对象
→ 属性
→ effect
```

也就是：

```text
target
→ key
→ effects
```

典型依赖结构可以理解成：

```text
WeakMap
   ↓
目标对象 target

Map
   ↓
属性 key

Set
   ↓
依赖这个属性的 effect
```

即：

```text
WeakMap<Target, Map<Key, Set<Effect>>>
```

假设：

```js
const user = reactive({
  name: 'Tom',
  age: 18
})
```

最终可能形成：

```text
WeakMap
│
└── user
    │
    └── Map
        │
        ├── name
        │    └── Set
        │        ├── renderEffect
        │        └── watchEffectA
        │
        └── age
             └── Set
                 └── computedEffect
```

三层分别对应：

```text
WeakMap
→ 哪个对象？

Map
→ 对象中的哪个属性？

Set
→ 哪些 effect 使用了这个属性？
```

这样就可以实现精确依赖更新。

例如：

```js
user.name = 'Jerry'
```

Vue 不需要通知所有依赖 `user` 的逻辑。

而是：

```text
trigger(user, 'name')
↓
WeakMap 找 user
↓
Map 找 name
↓
Set 找依赖 name 的 effects
↓
只触发这些 effects
```

另外第一层使用 `WeakMap` 有一个重要原因：

> 当原始对象已经没有其他强引用时，`WeakMap` 不会因为依赖表本身而阻止这个对象被垃圾回收。

Vue 的依赖跟踪本质就是把当前正在运行的副作用与被访问的响应式属性建立关联。([Vue.js](https://vuejs.org/guide/extras/reactivity-in-depth.html?m=o&u=t&utm_source=chatgpt.com))

---
#### 六、`effect` 是什么？

`effect` 可以理解为：

> **依赖响应式数据、并在这些数据变化以后需要重新执行的函数。**

例如概念上：

```js
effect(() => {
  console.log(state.count)
})
```

第一次执行：

```text
effect 开始执行
↓
当前 activeEffect = 这个 effect
↓
读取 state.count
↓
Proxy get
↓
track(state, 'count')
↓
把 activeEffect 放入 count 对应的 Set
```

于是：

```text
state.count
→ effect
```

这个依赖关系就建立了。

之后：

```js
state.count++
```

发生：

```text
Proxy set
↓
trigger(state, 'count')
↓
找到 count 对应的 Set
↓
找到 effect
↓
重新调度 effect
```

组件的 render effect、`computed`、`watchEffect`、`watch` 等能力，都建立在这套响应式系统之上。([Vue.js](https://vuejs.org/api/reactivity-core?utm_source=chatgpt.com))

这里再补一个工程层细节：

> 数据变化后，组件 DOM 更新通常并不是每次 setter 后马上同步修改 DOM，而是 Vue 会对更新任务进行调度和批处理，在更新周期中统一刷新。Vue 官方也明确说明 DOM 更新会缓冲到下一次 tick。([Vue.js](https://vuejs.org/guide/essentials/reactivity-fundamentals.html?noteId=note-cc0b26eb-a6c6-4372-91bf-1725f76529cd&utm_source=chatgpt.com))

---
#### 七、`reactive` 和 `ref`

这一部分你刚才的“React”应该是 **`reactive`**，“Promise”应该是 **`Proxy`**。

`reactive`：

```js
const state = reactive({
  count: 0
})
```

主要用于：

```text
对象、数组、Map、Set、等对象类型
```

底层通过：

```text
Proxy
```

代理对象。

它不能直接处理：

```js
reactive(1)
reactive('Tom')
reactive(true)
```

这样的基本类型，因为 Proxy 的代理目标必须是对象。

Vue 官方也明确指出 `reactive()` 只支持对象类型，不能直接保存 `string / number / boolean` 等基本类型。([Vue.js](https://vuejs.org/guide/essentials/reactivity-fundamentals.html?noteId=note-cc0b26eb-a6c6-4372-91bf-1725f76529cd&utm_source=chatgpt.com))

所以 Vue 提供：

```js
const count = ref(0)
```

`ref` 返回一个带：

```js
.value
```

属性的响应式容器：

```text
ref
↓
创建一个对象
↓
value 保存真正的数据
```

访问：

```js
count.value
```

时进行依赖追踪。

修改：

```js
count.value = 2
```

时触发依赖。

Vue3 官方关于响应式原理的说明中特别指出：

```text
reactive 对象
→ Proxy

ref
→ .value 的 getter / setter
```

([Vue.js](https://vuejs.org/guide/extras/reactivity-in-depth.html?m=o&u=t&utm_source=chatgpt.com))

---
#### 八、如果 `ref` 里面放的是对象呢？

例如：

```js
const user = ref({
  name: 'Tom'
})
```

这时不是说整个对象永远只靠 `.value` 的 getter/setter 完成深层响应式。

Vue 会把内部非基本类型进一步转成响应式对象。

也就是概念上：

```text
ref({
  name: 'Tom'
})

↓
ref 容器

.value
↓
reactive({
  name: 'Tom'
})

↓
Proxy
```

因此：

```js
user.value.name = 'Jerry'
```

内部对象仍然可以深度响应。

Vue 官方文档明确说明：如果 `ref` 接收到对象，该对象会通过 `reactive()` 转成深层响应式 Proxy。([Vue.js](https://vuejs.org/api/reactivity-core?utm_source=chatgpt.com))

所以不要说：

```text
ref 只用于基本类型
```

更准确的是：

```text
reactive
→ 只能接对象类型

ref
→ 可以接任何类型
→ 基本类型通过 .value 响应
→ 对象值内部会进一步 reactive 化
```

---
#### 最终面试收敛回答

> **Vue 的响应式我会先从 MVVM 的数据流来理解。MVVM 希望通过 ViewModel 连接 View 和 Model，实现 View 和 Model 的同步。这里实际上有两个方向：View 到 Model 主要是通过 DOM 事件监听实现，例如 `v-model` 本质上可以理解为 `:value` 加 `@input`，用户操作触发事件后修改 JavaScript 数据；真正属于 Vue 响应式系统核心的是 Model 到 View，也就是数据发生变化以后，Vue 怎么知道哪些视图依赖了这个数据，然后通知这些依赖更新。**
>
> **Vue 响应式的统一原理就是“数据访问拦截 → 依赖收集 → 数据变化 → 触发依赖更新”。Vue2 使用 `Object.defineProperty`，在初始化时递归处理已有属性，为属性建立 getter 和 setter。属性在组件渲染过程中被读取时，getter 通过 Dep 收集对应 Watcher；属性修改触发 setter 后，Dep 再通知相关 Watcher 更新组件。由于 `Object.defineProperty` 主要针对初始化时已有属性建立 getter/setter，所以新增、删除属性以及数组索引等场景存在局限，Vue2 通过 `Vue.set`、`Vue.delete` 以及重写 `push、pop、shift、unshift、splice、sort、reverse` 七个数组变更方法进行补充。**
>
> **Vue3 的基本思想没有改变，但把数据劫持改成了 `Proxy`。`reactive` 返回整个对象的 Proxy，当属性被读取时触发 `get` trap，再通过 `track` 收集当前 `effect`；当属性被修改、增加或删除时，通过 `set`、`deleteProperty` 等代理操作进入 `trigger`，找到相关依赖并进行调度更新。因为 Proxy 代理的是整个对象，所以 Vue3 能更自然地监听属性新增、删除和数组索引变化。**
>
> **Vue3 的依赖关系可以用 `WeakMap → Map → Set` 理解：WeakMap 的 key 是目标对象 `target`，value 是这个对象的依赖 Map；Map 的 key 是属性 `key`，value 是依赖该属性的 Set；Set 中存放所有依赖这个属性的 effect。这样就形成了“对象 → 属性 → 依赖函数”的精确映射。当某个属性变化时，只需要找到这个属性对应的 effect 集合进行更新。**
>
> **最后，`reactive` 只能直接处理对象类型，底层使用 Proxy；`ref` 可以处理基本类型也可以处理对象，它通过 `.value` 提供一个可追踪的响应式访问入口。如果 `ref` 中保存的是基本类型，就通过 `.value` 的 getter/setter 做 track 和 trigger；如果保存的是对象，内部对象还会通过 `reactive()` 转成深层响应式 Proxy。所以 Vue2 和 Vue3 的核心思想是一致的，都是“数据拦截 + 依赖收集 + 派发更新”，真正变化的是数据劫持方式以及依赖系统的实现。** ([Vue.js](https://v2.vuejs.org/v2/guide/reactivity.html?utm_source=chatgpt.com))

---

**Sources:**

- [The Vue Instance — Vue.js](https://v2.vuejs.org/v2/guide/instance?utm_source=chatgpt.com)
- [Component v-model | Vue.js](https://vuejs.org/guide/components/v-model.html?utm_source=chatgpt.com)

## 第36题 Vue 的生命周期是什么？Vue2、Vue3 以及 Composition API 的生命周期如何理解？

### 题目

Vue 的生命周期是什么？Vue2、Vue3 以及 Composition API 的生命周期如何理解？

### 问题

1. 什么是 Vue 组件的生命周期？生命周期钩子解决什么问题？
2. Vue3 Options API 中，一个组件从创建到卸载主要经历哪些阶段？
3. `beforeCreate` 和 `created` 分别发生在什么时候？此时响应式数据和真实 DOM 分别处于什么状态？
4. `beforeMount` 和 `mounted` 的区别是什么？`mounted` 到底保证了哪些事情，又不保证哪些事情？
5. 为什么操作 DOM、获取元素尺寸、初始化 ECharts 等逻辑通常放在 `mounted / onMounted`？
6. 响应式数据发生变化以后，`beforeUpdate` 和 `updated` 分别什么时候执行？
7. 为什么不能简单理解为“数据一变，DOM 就立刻同步更新”？`nextTick()` 在这里解决什么问题？
8. `beforeUnmount` 和 `unmounted` 有什么区别？哪些资源需要在卸载阶段主动清理？
9. 父子组件存在时，挂载、更新、卸载阶段的生命周期执行关系是什么？
10. Vue2 和 Vue3 的生命周期名称有哪些主要区别？
11. Vue3 中的 `setup()` 到底是什么？它是不是 Vue2 `created()` 的替代品？
12. `<script setup>`、`setup()`、`onMounted()` 三者分别是什么关系？
13. 使用 `<KeepAlive>` 后，为什么会增加 `activated / deactivated`？它们和 `mounted / unmounted` 有什么区别？
14. 哪些生命周期钩子不会在 SSR 阶段执行？

---

### 回答要点

#### 1. 生命周期本质

- 一个组件从实例初始化、状态建立、首次渲染、DOM 挂载、响应式更新，到最终卸载，会经历一系列阶段。
- 生命周期钩子就是 Vue 在这些阶段提供的执行入口。Vue 官方将其描述为组件实例初始化过程中，在特定阶段运行用户代码的机制。([Vue.js](https://vuejs.org/guide/essentials/lifecycle.html?utm_source=chatgpt.com))
#### 2. Vue3 Options API 主流程

```text
beforeCreate
→ created
→ beforeMount
→ mounted

数据变化：
beforeUpdate
→ DOM 更新
→ updated

组件卸载：
beforeUnmount
→ unmounted
```

Vue3 仍然存在 `beforeCreate`、`created`、`mounted` 等 Options API 生命周期，并不是 Vue3 把它们全部删除了。([Vue.js](https://vuejs.org/api/options-lifecycle?utm_source=chatgpt.com))
#### 3. 创建阶段

- `beforeCreate`：实例已经初始化、props 已解析，但 `data()`、`computed` 等状态选项还在随后进行设置。
- `created`：响应式数据、computed、methods、watchers 等状态相关选项已经处理完成。
- `created` 时挂载阶段尚未开始，`$el` 还不可用。([Vue.js](https://vuejs.org/api/options-lifecycle?utm_source=chatgpt.com))
#### 4. 挂载阶段

- `beforeMount`：响应式状态已经准备完成，但还没有创建本轮真实 DOM，马上执行首次 DOM render effect。
- `mounted`：当前组件自己的 DOM 树已经创建并插入父容器，而且所有**同步子组件**已经挂载完成。
- 不保证异步组件、`<Suspense>` 内组件、网络请求、图片资源等都已经完成。([Vue.js](https://vuejs.org/api/composition-api-lifecycle?utm_source=chatgpt.com))
#### 5. 更新阶段

- `beforeUpdate`：响应式状态变化导致 DOM 即将更新之前。
- `updated`：本轮组件 DOM 更新完成以后。
- Vue 会对多个状态变化进行批量处理，因此如果要等待“某一次具体状态修改对应的 DOM 更新完成”，优先使用 `nextTick()`。
- 不要在 `updated` 中无条件修改组件状态，否则很容易造成循环更新。([Vue.js](https://vuejs.org/api/composition-api-lifecycle?utm_source=chatgpt.com))
#### 6. 卸载阶段

- `beforeUnmount`：组件即将卸载，此时实例仍然完全可用。
- `unmounted`：所有子组件已经卸载，并且组件关联的 render effect、`setup()` 中创建的 computed/watchers 等响应式作用已经停止。
- 手动创建的计时器、DOM 事件、服务器连接等外部副作用仍应主动清理。([Vue.js](https://vuejs.org/api/composition-api-lifecycle?utm_source=chatgpt.com))
#### 7. 父子组件

- 父组件的 `mounted` 一定在所有同步子组件 `mounted` 之后。
- 父组件的 `updated` 在子组件的 `updated` 之后。
- 父组件被视为 `unmounted` 时，所有子组件已经先完成卸载。
- 因此常见结果是“创建向下、完成向上”，但不要把它机械扩展到所有异步组件和所有场景。([Vue.js](https://vuejs.org/api/composition-api-lifecycle?utm_source=chatgpt.com))
#### 8. Vue2 与 Vue3

- Vue2：
  ```text
  beforeDestroy
  destroyed
  ```
- Vue3：
  ```text
  beforeUnmount
  unmounted
  ```
- 创建、挂载、更新阶段的大部分 Options API 名称仍然保留。([Vue.js](https://v2.vuejs.org/v2/api/?redirect=true&utm_source=chatgpt.com))
#### 9. Composition API

- `setup()` 是 **Composition API 的入口函数**。
- Vue 官方明确规定：`setup()` 在所有 Options API 生命周期之前执行，甚至早于 `beforeCreate()`。
- 因此不能简单说：
  ```text
  setup = created
  ```
- Composition API 没有 `onBeforeCreate()` 和 `onCreated()`；初始化逻辑直接在 `setup()` / `<script setup>` 的 setup 阶段执行。([Vue.js](https://vuejs.org/api/composition-api-setup.html?utm_source=chatgpt.com))
#### 10. KeepAlive

- 被缓存组件切走时不是正常卸载，而是进入 deactivated 状态。
- 重新插回 DOM 时进入 activated。
- `activated` 初次挂载时也会触发，`deactivated` 在真正卸载时也会触发。([Vue.js](https://vuejs.org/guide/built-ins/keep-alive?utm_source=chatgpt.com))

---

### 标准回答

Vue 的生命周期，本质上就是：

> **一个组件从实例初始化、建立响应式状态、首次渲染和挂载，到后续响应式更新，再到最终卸载的完整过程。Vue 在这些关键阶段提供生命周期钩子，让开发者能够在正确的时间执行对应逻辑。** ([Vue.js](https://vuejs.org/guide/essentials/lifecycle.html?utm_source=chatgpt.com))

Vue3 Options API 的主流程可以先记成：

```text
创建
beforeCreate
↓
created

挂载
beforeMount
↓
mounted

更新
beforeUpdate
↓
updated

卸载
beforeUnmount
↓
unmounted
```
##### 1. 创建和挂载阶段

`beforeCreate` 是实例初始化后的早期阶段。Vue 官方的定义是：实例已经初始化并解析了 props，随后才会继续设置响应式 props、`data()`、`computed` 等状态。

到了 `created`：

```text
reactive data、computed、methods、watchers
```

这些状态相关选项已经处理完成。

但是这时候：

```text
还没有进入挂载阶段
$el 仍然不可用
```

所以：

```text
created
→ 可以处理数据和普通业务逻辑
→ 不能依赖真实组件 DOM
```

([Vue.js](https://vuejs.org/api/options-lifecycle?utm_source=chatgpt.com))

接下来进入：

```text
beforeMount
↓
mounted
```

`beforeMount` 时，响应式状态已经设置完成，但 Vue 还没有执行首次 DOM render effect。

到了 `mounted`，官方给出的条件有两个：

```text
1. 当前组件自己的 DOM 树已经创建并插入父容器
2. 所有同步子组件都已经完成 mounted
```

([Vue.js](https://vuejs.org/api/composition-api-lifecycle?utm_source=chatgpt.com))

因此：

```js
onMounted(() => {
  // 获取 template ref
  // 获取 DOM 尺寸
  // 初始化 ECharts
  // 初始化地图实例
})
```

这些依赖真实 DOM 的操作适合放在 `mounted / onMounted`。

但 `mounted` 不能理解成：

> “整个页面的一切都加载完成了。”

它**不保证**：

```text
异步组件已经完成、Suspense 内组件已经完成、接口请求已经完成、图片已经加载完成、其他异步任务已经完成
```

官方明确指出，`mounted` 对子组件的保证只包括**同步子组件**，不包括异步组件和 `<Suspense>` 中的组件。([Vue.js](https://vuejs.org/api/composition-api-lifecycle?utm_source=chatgpt.com))

---
##### 2. 更新阶段

组件挂载完成以后，响应式状态发生变化，会进入更新流程：

```text
响应式状态变化
↓
beforeUpdate
↓
Vue 更新 DOM
↓
updated
```

`beforeUpdate` 表示：

> **因为响应式状态变化，当前组件即将更新 DOM，但 DOM 还没有完成本轮更新。**

此时可以读取更新前的 DOM 状态。

`updated` 则表示：

> **当前组件因为响应式状态变化而产生的 DOM 更新已经完成。**

([Vue.js](https://vuejs.org/api/composition-api-lifecycle?utm_source=chatgpt.com))

不过这里有一个很重要的点。

Vue 并不是：

```text
state 修改一次
→ DOM 马上同步改一次
```

为了性能，多个状态修改可能被批处理到同一个渲染周期。

所以例如：

```js
count.value++
```

之后，如果你需要明确等待这次状态变化反映到 DOM：

```js
count.value++

await nextTick()

// 此时再读取更新后的 DOM
```

比把代码全部塞进 `updated` 更精准。

Vue 官方也明确建议：如果要在**某个特定状态变化以后**访问更新后的 DOM，应使用 `nextTick()`。([Vue.js](https://vuejs.org/api/composition-api-lifecycle?utm_source=chatgpt.com))

同时：

```js
onUpdated(() => {
  count.value++
})
```

这种无条件修改当前组件状态的写法应避免，因为可能形成：

```text
数据变化
↓
DOM 更新
↓
updated
↓
再次修改数据
↓
再次更新
↓
updated
...
```

导致无限更新循环。([Vue.js](https://vuejs.org/api/composition-api-lifecycle?utm_source=chatgpt.com))

---
##### 3. 卸载阶段

组件离开组件树时：

```text
beforeUnmount
↓
unmounted
```

`beforeUnmount`：

> 组件即将卸载，但组件实例此时仍然完全可用。

`unmounted`：

> 组件已经完成卸载。

Vue 官方对“已经 unmounted”的定义还更加具体：

```text
所有子组件已经卸载
+
当前组件相关的响应式 effect 已停止
```

包括：

```text
组件 render effect
setup() 中创建的 computed
setup() 中创建的 watcher
```

([Vue.js](https://vuejs.org/api/composition-api-lifecycle?utm_source=chatgpt.com))

但是 Vue 自动停止自己的响应式作用，不代表所有资源都会自动帮你清掉。

比如：

```js
window.addEventListener(...)
setInterval(...)
WebSocket(...)
第三方图表实例
第三方地图实例
```

这些属于你手动创建的外部副作用，仍然应该在卸载阶段清理：

```js
onUnmounted(() => {
  clearInterval(timer)
  window.removeEventListener('resize', handler)
  socket.close()
})
```

官方也明确把定时器、DOM 事件监听和服务器连接列为 `onUnmounted` 的典型清理对象。([Vue.js](https://vuejs.org/api/composition-api-lifecycle?utm_source=chatgpt.com))

---
##### 4. 父子组件生命周期怎么执行？

这一块不能简单背一句：

```text
父 → 子 → 子 → 父
```

而应该理解 Vue 官方真正保证的关系。

假设：

```text
Parent
└── Child
```

挂载过程中，父组件先进入自己的挂载流程，在渲染过程中创建子组件。

但：

> **Parent 的 mounted 必须等所有同步 Child 完成 mounted 后才能执行。**

所以普通同步父子组件的典型挂载顺序可以理解为：

```text
Parent beforeMount
↓
Child beforeMount
↓
Child mounted
↓
Parent mounted
```

其中最关键、官方明确保证的是：

```text
子同步组件 mounted 完成
↓
父组件 mounted
```

([Vue.js](https://vuejs.org/api/composition-api-lifecycle?utm_source=chatgpt.com))

更新阶段官方同样明确：

> **父组件的 `updated` 在子组件的 `updated` 之后调用。**

因此如果父子组件同时因为这一轮变化而更新：

```text
...
Child updated
↓
Parent updated
```

([Vue.js](https://vuejs.org/api/composition-api-lifecycle?utm_source=chatgpt.com))

卸载阶段也是类似的“完成向上”：

父组件只有在：

```text
所有子组件已经 unmounted
```

以后，才被认为完成了自己的 `unmounted`。

因此：

```text
Children unmounted
↓
Parent unmounted
```

是官方明确保证的关系。([Vue.js](https://vuejs.org/api/composition-api-lifecycle?utm_source=chatgpt.com))

所以面试中可以收敛成：

> **父组件先启动对子树的处理，但挂载、更新、卸载的“完成钩子”通常需要等子组件对应工作完成，因此常看到子组件的 mounted / updated / unmounted 先于父组件对应完成钩子。**

不要把这个规律无限扩展到异步组件，因为 `mounted` 明确不等待异步组件或 `<Suspense>` 中的组件。([Vue.js](https://vuejs.org/api/composition-api-lifecycle?utm_source=chatgpt.com))

---
##### 5. Vue3 的 `setup()` 到底是什么？

这也是生命周期题非常容易答错的地方。

不能说：

```text
setup 是 Vue3 的 created
```

Vue 官方对 `setup()` 的定义是：

> **Composition API 的入口。**

它是组件选项中的一个函数：

```js
export default {
  setup() {
    // Composition API 逻辑
  }
}
```

而：

```vue
<script setup>
```

则是 SFC 中使用 Composition API 的**编译时语法**，不是一个生命周期钩子。Vue 官方推荐 SFC 使用 Composition API 时优先采用 `<script setup>`。([Vue.js](https://vuejs.org/api/composition-api-setup.html?utm_source=chatgpt.com))

更关键的是，Vue 官方明确规定：

```text
setup()
↓
beforeCreate
↓
created
```

也就是说，如果 Composition API 和 Options API 混用：

> **`setup()` 比 `beforeCreate()` 还早。**

([Vue.js](https://vuejs.org/api/options-lifecycle?utm_source=chatgpt.com))

因此：

```text
setup ≠ created
```

两者只是都有“适合做初始化逻辑”的部分用途重叠。

Composition API 中没有：

```text
onBeforeCreate()
onCreated()
```

因为初始化逻辑本身就在 setup 阶段执行。

后续真正的生命周期注册 API 是：

```js
onBeforeMount()
onMounted()

onBeforeUpdate()
onUpdated()

onBeforeUnmount()
onUnmounted()
```

而且这些 API 必须在组件的 `setup()` 阶段同步注册。([Vue.js](https://cn.vuejs.org/api/composition-api-lifecycle?utm_source=chatgpt.com))

所以最准确的关系是：

```text
setup()
→ Composition API 的执行入口

<script setup>
→ setup 阶段的编译时语法

onMounted()
→ 在 setup 阶段注册“挂载完成后”的回调
```

---
##### 6. Vue2 和 Vue3 生命周期的主要区别

Vue2 常见：

```text
beforeCreate
created

beforeMount
mounted

beforeUpdate
updated

beforeDestroy
destroyed
```

Vue3 Options API 中：

```text
beforeCreate
created

beforeMount
mounted

beforeUpdate
updated

beforeUnmount
unmounted
```

最明显的命名变化就是：

```text
Vue2                 Vue3
beforeDestroy   →    beforeUnmount
destroyed       →    unmounted
```

Vue3 并没有删除 `created`、`mounted` 等 Options API 生命周期函数。([Vue.js](https://v2.vuejs.org/v2/api/?redirect=true&utm_source=chatgpt.com))

而如果使用 Composition API，通常写成：

```text
onBeforeMount
onMounted

onBeforeUpdate
onUpdated

onBeforeUnmount
onUnmounted
```

初始化逻辑放在 `setup()` / `<script setup>` 中。

---
##### 7. KeepAlive 生命周期

正常情况下组件切换出去：

```text
组件离开
↓
unmount
↓
组件实例销毁
```

但是：

```vue
<KeepAlive>
  <component :is="current" />
</KeepAlive>
```

会缓存组件实例。

这时组件切走不会正常卸载，而是：

```text
DOM 中移除
↓
deactivated
↓
实例仍然缓存
```

重新显示：

```text
从缓存重新插入 DOM
↓
activated
```

([Vue.js](https://vuejs.org/guide/built-ins/keep-alive?utm_source=chatgpt.com))

所以：

```text
mounted / unmounted
→ 真正的挂载和卸载生命周期

activated / deactivated
→ KeepAlive 缓存树中的激活和停用
```

还有一个容易漏掉的官方细节：

- `activated` 在**首次 mount** 时也会调用；
- `deactivated` 在**最终 unmount** 时也会调用。([Vue.js](https://vuejs.org/guide/built-ins/keep-alive?utm_source=chatgpt.com))

---
#### 最终面试收敛回答

> **Vue 生命周期就是组件从实例初始化、建立响应式状态、首次渲染和挂载，到响应式状态变化后的更新，再到最终卸载的完整过程。Vue3 Options API 的主要流程是 `beforeCreate → created → beforeMount → mounted → beforeUpdate → updated → beforeUnmount → unmounted`。其中 `created` 时响应式数据、computed、methods 和 watchers 等已经处理完成，但还没开始挂载，所以 `$el` 不可用；`mounted` 时组件自己的 DOM 已经插入父容器，并且所有同步子组件已经挂载完成，因此适合 DOM 操作和第三方 DOM 库初始化，但它并不保证异步组件、接口请求和图片资源都完成。** ([Vue.js](https://vuejs.org/api/options-lifecycle?utm_source=chatgpt.com))
>
> **响应式状态变化后会经历 `beforeUpdate → DOM 更新 → updated`。Vue 会批量调度更新，因此如果要等待某次具体状态修改对应的 DOM 更新完成，应使用 `nextTick()`，而不要依赖 `updated`；同时不要在 `updated` 中无条件修改状态，否则容易形成无限更新。卸载时经历 `beforeUnmount → unmounted`，当 `unmounted` 执行时子组件已经卸载，组件自己的响应式 effects 也已经停止，而定时器、DOM 监听、WebSocket 等手动创建的副作用需要开发者自行清理。** ([Vue.js](https://vuejs.org/api/composition-api-lifecycle?utm_source=chatgpt.com))
>
> **父子组件方面，完成阶段通常是“子先完成、父后完成”：父组件的 `mounted` 要等所有同步子组件 mounted，父组件的 `updated` 在子组件 updated 之后，父组件完成 unmounted 时子组件已经全部卸载。Vue2 和 Vue3 最明显的生命周期命名变化是 `beforeDestroy / destroyed` 改成了 `beforeUnmount / unmounted`。** ([Vue.js](https://vuejs.org/api/composition-api-lifecycle?utm_source=chatgpt.com))
>
> **Composition API 中，`setup()` 不是 `created()` 的简单替代，它是 Composition API 的入口，而且官方明确规定 `setup()` 在所有 Options API 钩子之前执行，甚至早于 `beforeCreate()`。`<script setup>` 是 setup 阶段的编译时语法，而 `onMounted / onUpdated / onUnmounted` 等才是 Composition API 的生命周期注册函数。使用 `<KeepAlive>` 时，组件切走并不会立即卸载，而会进入 `deactivated`，重新插入时进入 `activated`。** ([Vue.js](https://vuejs.org/api/options-lifecycle?utm_source=chatgpt.com))

---

**Sources:**

- [Lifecycle Hooks | Vue.js](https://vuejs.org/guide/essentials/lifecycle.html?utm_source=chatgpt.com)
- [API — Vue.js](https://v2.vuejs.org/v2/api/?redirect=true&utm_source=chatgpt.com)
- [组合式 API：生命周期钩子 | Vue.js](https://cn.vuejs.org/api/composition-api-lifecycle?utm_source=chatgpt.com)

## 第37题 Vue 从模板编译到页面更新，完整的渲染过程是什么？

### 题目

Vue 从模板编译到页面更新，完整的渲染过程是什么？

### 问题

1. Vue 为什么需要模板编译？模板最终会被编译成什么？
2. Vue 的响应式系统和渲染系统分别解决什么问题？
3. Vue2 和 Vue3 的模板编译流程分别是什么？
4. AST 是什么？为什么模板要先转换成 AST？
5. `render` 函数是什么？它的输入和输出分别是什么？
6. 什么是 VNode？VNode Tree 和真实 DOM Tree 有什么关系？
7. `render` 执行过程中为什么会发生响应式依赖收集？
8. Vue 第一次渲染时，从 VNode 到真实 DOM 经历了什么？
9. 响应式数据变化以后，Vue 为什么会重新执行 `render`？
10. `patch` 和 `diff` 分别是什么？二者是什么关系？
11. Vue 判断新旧 VNode 能否复用的基本原则是什么？
12. 如果新旧 VNode 不能复用会怎样？如果可以复用又会比较什么？
13. 为什么 Vue 的 Diff 可以理解为同层比较，而不是跨层搜索节点？
14. Vue2 的子节点 Diff 为什么叫“双端 Diff”？具体比较顺序是什么？
15. `key` 在 Diff 中到底起什么作用？为什么动态列表应该使用稳定的业务 ID？
16. Vue3 的子节点 Diff 和 Vue2 有什么变化？
17. Vue3 为什么引入 `PatchFlag`？
18. 什么是静态缓存/静态提升？它解决什么问题？
19. 什么是 Block Tree / Tree Flattening？它和 `PatchFlag` 有什么区别？
20. 为什么修改多次响应式数据不会立即执行多次 DOM 更新？`nextTick()` 又是什么时候执行的？

---

### 回答要点

#### 1. Vue 的核心目标

Vue 要解决的核心问题可以拆成两套系统：

```text
响应式系统
→ 决定“什么时候需要更新、谁需要更新”

渲染系统
→ 决定“更新时 DOM 应该怎么改”
```

因此完整链路可以先记成：

```text
模板
↓
编译成 render
↓
执行 render
↓
VNode Tree
↓
首次 mount
↓
真实 DOM

响应式数据变化
↓
触发组件 render effect
↓
重新执行 render
↓
新的 VNode Tree
↓
patch / diff
↓
只修改必要的真实 DOM
```

这与 Vue 官方给出的 `Compile → Mount → Patch` 渲染管线一致。([Vue.js](https://vuejs.org/guide/extras/rendering-mechanism?utm_source=chatgpt.com))
#### 2. 为什么需要编译

更准确的说法不是单纯“浏览器只认识 HTML/CSS/JS”，而是：

> Vue 模板中存在 `{{ }}`、`v-if`、`v-for`、`v-bind`、`v-on` 等 Vue 特有的声明式语义，浏览器本身不会把它们转换成 Vue 的响应式 DOM 更新逻辑，所以 Vue 编译器需要把模板转换成可执行的 JavaScript `render` 函数。

Vue 官方明确说明：Vue template 最终会被编译成返回 Virtual DOM Tree 的 render function。([Vue.js](https://vuejs.org/guide/extras/rendering-mechanism?utm_source=chatgpt.com))
#### 3. 编译阶段

Vue2 可以准确概括为：

```text
parse
→ optimize
→ generate
```

即：

```text
template
↓
AST
↓
静态节点/静态根优化
↓
render + staticRenderFns
```

Vue2 官方源码中的 `baseCompile()` 就是依次执行 `parse()`、`optimize()`、`generate()`。([GitHub](https://raw.githubusercontent.com/vuejs/vue/v2.7.16/src/compiler/index.ts))

Vue3 更准确的编译流程是：

```text
parse
→ transform
→ generate
```

也就是：

```text
模板
↓
AST
↓
transform 阶段处理 v-if / v-for / v-bind / v-on 等
并分析静态与动态信息
↓
generate
↓
render function
```

所以对于 Vue3，不应该把“标记静态节点”单独说成固定的第二阶段；它属于 `transform` 过程中进行的编译分析和优化。Vue3 当前 `compiler-core` 源码的 `baseCompile()` 就是 `baseParse → transform → generate`。([GitHub](https://github.com/vuejs/core/blob/main/packages/compiler-core/src/compile.ts?utm_source=chatgpt.com))
#### 4. Render 与依赖收集

`render` 函数的作用：

```text
当前组件状态
↓
render()
↓
VNode Tree
```

VNode 是 JavaScript 对象，用来描述元素、组件、属性、children 等 UI 信息。

组件挂载时，render 的执行属于响应式 effect。执行过程中读取到的响应式数据会被追踪，因此 Vue 知道：

```text
这个组件 render
依赖了哪些响应式数据
```

以后这些数据变化，就可以重新调度这个组件的 render effect。([Vue.js](https://vuejs.org/guide/extras/rendering-mechanism?utm_source=chatgpt.com))
#### 5. 首次挂载与后续更新

首次没有旧 VNode：

```text
render
↓
VNode Tree
↓
mount
↓
创建真实 DOM
↓
插入页面
```

因为没有旧 VNode，所以不存在新旧树 Diff。

后续更新：

```text
响应式数据变化
↓
trigger
↓
组件 render effect 被调度
↓
重新 render
↓
new VNode Tree
↓
old VNode Tree + new VNode Tree
↓
patch
↓
真实 DOM 更新
```

Vue 官方将遍历比较两棵 VDOM 树并将必要变化应用到 DOM 的过程称为 `patch`，也称 diffing / reconciliation。([Vue.js](https://vuejs.org/guide/extras/rendering-mechanism?utm_source=chatgpt.com))
#### 6. Diff 的基本思想

可以按：

```text
节点身份判断
↓
节点自身更新
↓
children 更新
```

理解。

如果新旧节点不能视为同一个 VNode：

```text
旧 VNode
→ 卸载

新 VNode
→ 创建并挂载
```

不会为了寻找一点局部相同内容而继续对两棵完全不同的子树进行任意跨层搜索。

如果能复用：

```text
继续比较 props、class / style、文本、事件相关属性、children、……
```

Vue3 当前源码判断两个 VNode 类型是否相同时，核心条件就是 `type` 与 `key` 都一致。([GitHub](https://github.com/vuejs/core/blob/main/packages/runtime-core/src/vnode.ts))
#### 7. Vue2 子节点 Diff

Vue2 对同一父节点下的数组 children 使用经典双端比较：

```text
旧头 ↔ 新头、旧尾 ↔ 新尾、旧头 ↔ 新尾、旧尾 ↔ 新头
```

四种情况都无法匹配时，再创建旧 children 的 `key → index` 映射，根据新节点的 key 去旧列表中寻找可复用节点。

最终：

```text
旧列表先结束
→ 新列表剩余部分全部新增

新列表先结束
→ 旧列表剩余部分全部删除
```

这正是 Vue2 `updateChildren()` 的实际实现。([GitHub](https://github.com/vuejs/vue/blob/v2.7.16/src/core/vdom/patch.ts))
#### 8. key

`key` 不是简单为了“提高性能”。

更准确地说：

> `key` 用于告诉 VDOM 算法一个节点的稳定身份。

例如：

```vue
<li v-for="item in list" :key="item.id">
```

可以形成：

```text
旧 id=1001
↕
新 id=1001
```

Vue 因此能够知道：

```text
这是原来的节点移动了
```

而不是：

```text
这是当前位置出现了一个全新的业务节点
```

Vue 官方也明确将 `key` 定义为 Diff 新旧节点列表时用于识别 VNode 的提示。([Vue.js](https://vuejs.org/api/built-in-special-attributes.html?utm_source=chatgpt.com))
#### 9. 批量更新与 nextTick

响应式状态修改以后，Vue 的 DOM 更新不是同步立即执行。

例如：

```js
count.value++
count.value++
count.value++
```

并不意味着组件必然立即连续进行三次 DOM 更新。

Vue 会缓存更新任务，在下一次 DOM update flush 中统一处理，使组件在一批状态变化中尽可能只更新一次。

`nextTick()`：

```js
count.value++

await nextTick()

// DOM 已完成这一批更新
```

本质上就是：

> 等待 Vue 当前这批 DOM 更新 flush 完成。

所以比“在事件循环尾执行一个回调”这个说法更准确。([Vue.js](https://vuejs.org/api/general.html?utm_source=chatgpt.com))

---

### 标准回答

Vue 整个模板渲染过程，我会从它解决的问题开始讲。

Vue 的核心目标之一，就是：

> **响应式数据变化以后，让对应视图自动更新，并且尽量减少不必要的真实 DOM 操作。**

因此 Vue 可以理解为有两套核心机制配合：

```text
响应式系统
→ 解决什么时候需要更新、哪个组件需要更新

渲染系统
→ 解决组件更新以后真实 DOM 到底怎么改
```

整个过程可以概括成：

```text
template
↓
compile
↓
render function
↓
VNode Tree
↓
mount
↓
真实 DOM

之后：

响应式数据变化
↓
组件 render effect 被触发
↓
重新执行 render
↓
new VNode Tree
↓
和 old VNode Tree patch / diff
↓
把必要变化同步到真实 DOM
```

Vue 官方本身也把整体渲染管线概括为 `Compile → Mount → Patch`。([Vue.js](https://vuejs.org/guide/extras/rendering-mechanism?utm_source=chatgpt.com))
#### 1. 模板编译

Vue 首先需要进行模板编译。

例如：

```vue
<div>
  <p>{{ name }}</p>
  <button @click="count++">+</button>
</div>
```

其中：

```text
{{ name }}
@click
v-if
v-for
v-bind
……
```

都属于 Vue 的模板语义。

浏览器不会自己理解“读取响应式 name，以后 name 变化自动重新更新这个文本”这样的 Vue 语义。

因此 Vue 会先把：

```text
template
```

转换成：

```text
JavaScript render function
```

`render` 函数的职责就是：

> **根据当前组件状态生成 VNode Tree。**

([Vue.js](https://vuejs.org/guide/extras/rendering-mechanism?utm_source=chatgpt.com))

这里 Vue2 和 Vue3 要稍微区分。

Vue2 编译流程可以记成：

```text
parse
↓
optimize
↓
codegen / generate
```

第一步：

```text
template
↓
parse
↓
AST
```

AST 就是抽象语法树，它把原本的字符串模板变成编译器能够遍历和分析的数据结构。

第二步 `optimize` 会分析静态节点、静态根等信息。

最后：

```text
AST
↓
generate
↓
render function
+
staticRenderFns
```

Vue2 官方源码就是严格按 `parse → optimize → generate` 执行的。([GitHub](https://raw.githubusercontent.com/vuejs/vue/v2.7.16/src/compiler/index.ts))

Vue3 的流程改成：

```text
parse
↓
transform
↓
generate
```

首先：

```text
template
↓
baseParse
↓
AST
```

然后 `transform` 遍历 AST，处理：

```text
v-if、v-for、v-bind、v-on、插值表达式、元素节点、……
```

同时进行各种编译期分析和优化。

最后：

```text
generate
↓
render function
```

所以 Vue3 更准确的说法不是：

```text
parse
→ 标记静态节点
→ codegen
```

而是：

```text
parse
→ transform
→ generate
```

静态分析、PatchFlag、Block 等优化信息是在编译过程中产生的。([GitHub](https://github.com/vuejs/core/blob/main/packages/compiler-core/src/compile.ts?utm_source=chatgpt.com))

---
#### 2. render 执行、依赖收集和首次挂载

编译完成以后，Vue 得到了：

```text
render function
```

执行：

```js
render()
```

得到：

```text
VNode Tree
```

VNode 本质就是 JavaScript 对象。

例如概念上：

```js
{
  type: 'div',
  props: {},
  children: [...]
}
```

它描述：

```text
节点是什么类型、有什么属性、有什么 children、是什么组件、……
```

因此：

```text
render
→ 生成 VNode

VNode Tree
→ 描述当前 UI 应该长什么样
```

Vue 官方将 VNode 描述为表示真实元素的普通 JavaScript 对象。([Vue.js](https://vuejs.org/guide/extras/rendering-mechanism?utm_source=chatgpt.com))

这里就会和前面的**响应式原理**连接起来。

组件首次 render 并不是普通执行一次就结束，而是作为响应式 effect 的一部分执行。

例如：

```vue
<div>{{ count }}</div>
```

render 执行：

```text
读取 count
↓
响应式 get
↓
依赖追踪
↓
建立：

count
→ 当前组件 render effect
```

于是 Vue 就知道：

> 当前组件渲染依赖 `count`。

Vue 官方的 Render Pipeline 也明确说明：mount 阶段会作为 reactive effect 执行，从而追踪 render 过程中使用到的所有响应式依赖。([Vue.js](https://vuejs.org/guide/extras/rendering-mechanism?utm_source=chatgpt.com))

第一次执行时：

```text
没有 old VNode
↓
render 生成 VNode Tree
↓
Renderer 遍历 VNode
↓
创建对应真实 DOM
↓
插入页面
```

这个过程更准确叫：

```text
mount
```

实现内部可以进入 `patch(null, vnode, ...)` 的挂载分支，但在概念上：

> **首次渲染是 mount，不需要做新旧 VNode Diff。**

---
#### 3. 数据更新、Patch 和 Diff

后面如果：

```js
count.value++
```

响应式系统会找到：

```text
依赖 count 的 render effect
```

然后调度组件重新更新：

```text
count 改变
↓
render effect 重新运行
↓
重新执行 render
↓
产生 new VNode Tree
```

这时候：

```text
old VNode Tree + new VNode Tree
```

同时存在。

Renderer 就需要：

```text
比较新旧 VNode
↓
确定哪里变化
↓
把变化同步到真实 DOM
```

整个过程 Vue 官方称为：

```text
patch
```

同时也称：

```text
diffing
reconciliation
```

所以面试中可以为了方便区分：

```text
Diff
→ 比较新旧 VNode，找到差异

Patch
→ 根据比较结果更新真实 DOM
```

但严格按 Vue 官方术语：

> **比较并把变化应用到真实 DOM 的整个更新过程都可以称作 patch。**

([Vue.js](https://vuejs.org/guide/extras/rendering-mechanism?utm_source=chatgpt.com))

Diff 首先要判断：

```text
old VNode
new VNode
```

是不是能够继续复用的节点。

Vue3 当前源码核心判断为：

```js
n1.type === n2.type &&
n1.key === n2.key
```

([GitHub](https://github.com/vuejs/core/blob/main/packages/runtime-core/src/vnode.ts))

如果节点身份不同：

```text
旧节点卸载
↓
新节点重新创建
↓
新子树重新 mount
```

不会继续深入尝试做任意跨层匹配。

如果是同一个 VNode 类型：

```text
继续 patch
↓
检查节点自身
↓
props / class / style / text 等
↓
再处理 children
```

因此 Diff 可以从整体思想上理解成：

```text
父节点不同
→ 整棵子树替换

父节点可以复用
→ 继续比较 children
```

所谓“同层比较”，本质是：

> Vue 在当前父节点的 children 范围内寻找和匹配节点，并不会执行一个通用算法，跨越任意树层级寻找“长得相似”的节点。

---
##### Vue2 的 children Diff

Vue2 最经典的是双端 Diff。

假设：

```text
oldChildren
A B C D

newChildren
A C B D
```

它维护：

```text
oldStart
oldEnd

newStart
newEnd
```

然后依次尝试四种匹配：

```text
1. oldStart ↔ newStart

2. oldEnd ↔ newEnd

3. oldStart ↔ newEnd

4. oldEnd ↔ newStart
```

找到相同节点：

```text
patch + 必要时移动 DOM + 移动指针
```

如果四种都匹配不到：

```text
根据 key 建立旧节点映射
↓
使用 newStart.key 在旧节点中寻找
```

如果找不到：

```text
说明是新节点
→ 创建
```

如果找到：

```text
说明旧节点可以复用
→ patch
→ 移动到正确位置
```

比较完成后：

```text
旧 children 已结束
但新 children 还有
→ 新增

新 children 已结束
但旧 children 还有
→ 删除
```

这就是 Vue2 `updateChildren()` 的实际算法。([GitHub](https://github.com/vuejs/vue/blob/v2.7.16/src/core/vdom/patch.ts))

这也是 `key` 的意义。

例如：

```vue
<li v-for="item in list" :key="item.id">
```

`key` 建立：

```text
业务项、↕、VNode 身份
```

它告诉 Vue：

> 新列表里的这个节点，是不是旧列表里的那个节点。

所以：

```text
key
≠ 单纯性能优化

key
= 稳定标识 VNode 身份
```

这也是为什么动态列表通常应该用：

```text
item.id
```

而不是：

```text
index
```

因为列表插入、删除、排序以后，`index` 对应的业务对象可能已经发生变化。Vue 官方也明确将 `key` 定义为帮助 VDOM 算法在新旧列表 Diff 时识别 VNode 的提示。([Vue.js](https://vuejs.org/api/built-in-special-attributes.html?utm_source=chatgpt.com))

---
#### 4. 批量更新，以及 Vue3 为什么更快

数据变化以后，也不能理解为：

```text
执行一次 set
↓
立刻 render
↓
立刻修改一次 DOM
```

例如：

```js
count.value++
count.value++
count.value++
```

Vue 会缓存组件更新任务，并在后续 DOM update flush 中批量执行。

这样可以避免：

```text
修改三次
→ render 三次
→ DOM 更新三次
```

尽量合并为：

```text
多次状态修改
↓
一次更新调度
↓
一次组件更新
```

Vue 官方明确说明 DOM 更新并不是同步应用，而是会缓存到 next tick，保证一个组件即使发生多次状态变化，也尽可能只更新一次。([Vue.js](https://vuejs.org/api/general.html?utm_source=chatgpt.com))

所以：

```js
count.value++

await nextTick()
```

含义就是：

> **等待当前这一批 Vue DOM 更新完成。**

不要简单背成：

```text
nextTick = 事件循环最后执行
```

更准确的是：

```text
nextTick
→ 等待 Vue 当前 DOM update flush
```

---

最后就是 Vue3 相比 Vue2 很重要的**编译器 + Renderer 协同优化**。

Vue 官方把它称为：

> Compiler-Informed Virtual DOM。([Vue.js](https://vuejs.org/guide/extras/rendering-mechanism?utm_source=chatgpt.com))

最重要可以记三个。
##### 第一，静态缓存 / 静态提升

例如：

```vue
<div>
  <h1>Hello</h1>
  <p>{{ count }}</p>
</div>
```

其中：

```text
<h1>Hello</h1>
```

永远不依赖响应式数据。

Vue3 编译器可以知道它是静态内容，因此不需要每次 render 都：

```text
创建新的 VNode
↓
再拿去 Diff
```

而是：

```text
首次创建
↓
缓存 / 提升
↓
后续 render 直接复用
```

Vue 当前官方文档称这一优化为 **Cache Static**；面试里也经常称“静态提升”。([Vue.js](https://vuejs.org/guide/extras/rendering-mechanism?utm_source=chatgpt.com))
##### 第二，PatchFlag

例如：

```vue
<div :class="active">
  hello
</div>
```

编译器已经知道：

```text
这个节点不是所有东西都可能变
真正动态的是 class
```

因此生成 VNode 时可以附带：

```text
PatchFlag.CLASS
```

以后 patch 时直接知道：

```text
重点检查 class
```

而不需要重新完整检查所有 props。

所以：

```text
PatchFlag
→ 描述一个动态 VNode“具体哪里会变”
```

([Vue.js](https://vuejs.org/guide/extras/rendering-mechanism?utm_source=chatgpt.com))
##### 第三，Block Tree / Tree Flattening

假设：

```text
root
├── static
├── dynamic A
└── static
    └── dynamic B
```

真正需要更新的只有：

```text
dynamic A
dynamic B
```

Vue3 的 Block 可以收集动态后代：

```text
Block
↓
dynamicChildren
├── A
└── B
```

这样更新时不需要：

```text
每次重新完整遍历整棵树
```

而可以优先直接访问动态节点集合。

因此：

```text
PatchFlag
→ 一个节点“哪里会变”

Block Tree
→ 一棵树中“哪些节点值得比较”
```

Vue 官方把这种将动态后代打平成数组的优化称为 **Tree Flattening**。([Vue.js](https://vuejs.org/guide/extras/rendering-mechanism?utm_source=chatgpt.com))

另外 Vue3 的 keyed children Diff 本身也改变了。它不再沿用 Vue2 那套完整的四次双端比较，而是先同步相同前缀、后缀，再处理未知中间序列；在需要移动节点时，会构建 key 映射，并通过**最长递增子序列**保留已经处于相对正确顺序的节点，从而减少真实 DOM 移动。Vue3 当前 Renderer 源码中可以直接看到 `keyToNewIndexMap`、`newIndexToOldIndexMap` 以及 `getSequence()`。([GitHub](https://raw.githubusercontent.com/vuejs/core/main/packages/runtime-core/src/renderer.ts))

---
#### 最终面试收敛回答

> **Vue 的完整渲染过程可以从“响应式系统 + 渲染系统”两部分理解。响应式系统负责在数据变化时确定哪个组件需要更新，渲染系统负责通过 VNode、Diff 和 Patch 尽量只修改必要的真实 DOM。首先 Vue 会把 template 编译成 render function。Vue2 的编译可以概括成 `parse → optimize → generate`：先把模板解析成 AST，再进行静态节点优化，最后生成 render；Vue3 更准确是 `parse → transform → generate`，各种指令转换和静态、动态分析主要发生在 transform 阶段。** ([GitHub](https://raw.githubusercontent.com/vuejs/vue/v2.7.16/src/compiler/index.ts))
>
> **编译完成以后执行 render，render 根据当前数据生成 VNode Tree。VNode 是描述目标 UI 的 JavaScript 对象。组件首次 render 会作为响应式 effect 执行，因此执行过程中读取响应式数据时会完成依赖追踪。第一次没有旧 VNode，所以 Renderer 直接根据 VNode Tree 创建真实 DOM 并挂载到页面。后续响应式数据变化以后，对应的 render effect 会重新运行，生成新的 VNode Tree，再和旧 VNode Tree 进行 patch。Patch 会判断节点是否可以复用，如果节点身份不同就卸载旧子树并挂载新子树；可以复用则继续更新 props、文本和 children。** ([Vue.js](https://vuejs.org/guide/extras/rendering-mechanism?utm_source=chatgpt.com))
>
> **children Diff 中，Vue2 使用经典双端比较，同时维护新旧 children 的首尾指针，依次比较旧头新头、旧尾新尾、旧头新尾、旧尾新头；都无法匹配时再通过 key 查找旧节点。key 的本质是标识 VNode 的稳定身份，而不仅仅是性能优化，因此动态列表通常应该使用稳定的业务 ID。Vue3 的 keyed Diff 则进一步采用前后相同序列同步、key 映射以及最长递增子序列等方式减少节点移动。** ([GitHub](https://github.com/vuejs/vue/blob/v2.7.16/src/core/vdom/patch.ts))
>
> **Vue3 进一步利用编译器和运行时协同优化：静态缓存/静态提升让不会变化的节点无需每次重新创建；PatchFlag 告诉运行时一个动态节点具体哪部分可能变化；Block Tree / Tree Flattening 则记录真正的动态后代，使 Renderer 不必每次完整遍历整棵 VNode Tree。最后，响应式状态变化也不会每次立即同步修改 DOM，Vue 会批量调度更新，`nextTick()` 的作用就是等待当前这一批 DOM 更新完成。整个流程最终可以收敛成：`template → compile → render → VNode → mount → 数据变化 → render → new VNode → patch/diff → DOM`。** ([Vue.js](https://vuejs.org/guide/extras/rendering-mechanism?utm_source=chatgpt.com))

---

**Sources:**

- [Rendering Mechanism | Vue.js](https://vuejs.org/guide/extras/rendering-mechanism?utm_source=chatgpt.com)
- [raw.githubusercontent.com](https://raw.githubusercontent.com/vuejs/vue/v2.7.16/src/compiler/index.ts)
- [core/packages/compiler-core/src/compile.ts at main · vuejs/core · GitHub](https://github.com/vuejs/core/blob/main/packages/compiler-core/src/compile.ts?utm_source=chatgpt.com)

## 第38题 Vue 中 `computed`、`watch` 和 `watchEffect` 有什么区别？它们分别适合什么场景？

### 题目

Vue 中 `computed`、`watch` 和 `watchEffect` 有什么区别？它们分别适合什么场景？

### 问题

1. `computed`、`watch`、`watchEffect` 都建立在 Vue 响应式系统之上，它们分别解决什么问题？
2. `computed` 为什么属于“派生状态”，而 `watch` 更偏“副作用处理”？
3. `computed` 为什么具有缓存能力？什么情况下它会重新计算？
4. `computed` 默认是只读的吗？什么情况下可以定义可写的 computed？
5. `watch` 的第一个参数可以监听哪些类型的 source？
6. `watch` 为什么能够拿到 `newValue` 和 `oldValue`？
7. `watch` 默认是不是立即执行？`immediate: true` 有什么作用？
8. `deep: true` 解决什么问题？为什么监听 reactive 对象和监听 getter 返回对象时表现可能不同？
9. `watchEffect` 和 `watch` 最大的区别是什么？
10. `watchEffect` 是如何自动收集依赖的？它会收集回调函数中所有异步代码访问到的响应式数据吗？
11. `watchEffect` 为什么默认会立即执行一次，而 `watch` 默认不会？
12. `watch` / `watchEffect` 中为什么需要 cleanup？它适合解决什么异步竞态问题？
13. 当响应式数据变化时，watcher 回调是同步立即执行的吗？Vue 的 `flush: 'pre' | 'post' | 'sync'` 分别意味着什么？
14. 如果需要在 watcher 中访问**已经完成本轮更新的 DOM**，应该选择什么方式？
15. 以下三个场景应该分别使用谁？
   - 根据 `firstName` 和 `lastName` 计算 `fullName`
   - `userId` 变化后重新请求接口
   - 一个副作用同时依赖多个响应式变量，但不想手动维护依赖列表
16. 为什么下面这种写法通常不推荐？

```js
watchEffect(() => {
  fullName.value = firstName.value + lastName.value
})
```

而更适合：

```js
const fullName = computed(() => {
  return firstName.value + lastName.value
})
```

这一题重点建立下面这个区分：

```text
computed
→ 根据已有响应式状态计算新的“派生状态”
→ 强调返回值和缓存

watch
→ 明确监听指定数据源
→ 数据变化后执行副作用

watchEffect
→ 立即执行副作用
→ 执行过程中自动追踪使用到的响应式依赖
```

以及把它们和前面第 35、37 题串起来：

```text
响应式数据
↓
依赖追踪
↓
├── component render effect → 页面更新
├── computed → 派生状态重新求值
├── watch → 指定 source 变化后执行回调
└── watchEffect → 自动追踪依赖并重新执行副作用
```

### 回答要点

#### 1. 三者都建立在 Vue 响应式系统之上

- `computed`：根据已有响应式状态得到一个新的**派生状态**。
- `watch`：明确监听一个或多个 source，在 source 变化后执行**副作用**。
- `watchEffect`：立即执行副作用，并在同步执行过程中**自动收集依赖**。([Vue.js](https://vuejs.org/api/reactivity-core.html?utm_source=chatgpt.com))
#### 2. `computed`

- 有返回值，本质是一个计算得到的 ref。
- 默认只读，也可以提供 `get + set` 创建可写 computed。
- 会根据响应式依赖进行缓存；依赖没有变化时，多次读取直接复用之前的结果。([Vue.js](https://cn.vuejs.org/guide/essentials/computed?utm_source=chatgpt.com))
#### 3. `watch`

- 显式指定依赖。
- source 可以是 `ref`、computed ref、getter、reactive object，或者它们组成的数组。
- 默认懒执行；source 真正发生变化后才执行 callback。
- callback 可以获得 `newValue`、`oldValue`。
- `immediate: true` 可以创建时立即执行。([Vue.js](https://vuejs.org/api/reactivity-core.html?utm_source=chatgpt.com))
#### 4. `watchEffect`

- 不需要显式指定 source。
- 默认立即执行一次。
- 执行过程中读取到的响应式数据会自动成为依赖。
- 如果 callback 是 async，只会自动追踪**第一个 `await` 之前同步访问的响应式数据**。([Vue.js](https://vuejs.org/guide/essentials/watchers.html?utm_source=chatgpt.com))
#### 5. 深度监听

- 直接 `watch(reactiveObject, ...)` 时，会隐式进行深度监听。
- `watch(() => state.someObject, ...)` 默认主要观察 getter 返回值是否替换；如果还要监听内部深层修改，需要 `deep: true`。
- 深度监听由于对象本身没有被替换，深层 mutation 触发时 `newValue` 和 `oldValue` 可能是同一个对象。([Vue.js](https://cn.vuejs.org/api/reactivity-core?utm_source=chatgpt.com))
#### 6. 执行时机

- 默认 `flush: 'pre'`：父组件更新以后、当前组件 DOM 更新以前。
- `flush: 'post'`：当前组件 DOM 更新以后。
- `flush: 'sync'`：响应式 mutation 时同步触发，不进行正常批处理，谨慎使用。([Vue.js](https://cn.vuejs.org/guide/essentials/watchers?utm_source=chatgpt.com))
#### 7. cleanup

- watcher 重新执行前可以清理上一轮副作用。
- 典型用途是取消已经失效的网络请求、定时任务等，防止旧异步任务覆盖新结果。([Vue.js](https://vuejs.org/api/reactivity-core.html?utm_source=chatgpt.com))

---

### 标准回答

`computed`、`watch` 和 `watchEffect` 都建立在 Vue 的响应式系统上，但它们解决的问题并不一样。

可以先用一句话区分：

```text
computed
→ 响应式数据 → 派生数据

watch
→ 指定响应式数据变化 → 执行副作用

watchEffect
→ 执行副作用 → 自动发现自己依赖哪些响应式数据
```

---
#### 1. `computed`：用来表示派生状态

例如：

```js
const firstName = ref('Tom')
const lastName = ref('Smith')

const fullName = computed(() => {
  return `${firstName.value} ${lastName.value}`
})
```

这里：

```text
firstName
+
lastName
↓
fullName
```

`fullName` 本身不是一个需要单独维护的源状态，而是可以由其他状态计算出来。

所以 `computed` 最适合描述：

> **一个值可以由其他响应式状态确定地推导出来。**

Vue 官方 `computed()` API 会返回一个响应式 ref。默认情况下，它是只读的；如果提供 getter 和 setter，也可以创建可写的 computed。([Vue.js](https://vuejs.org/api/reactivity-core.html?utm_source=chatgpt.com))
##### computed 为什么有缓存？

假设：

```js
const expensiveResult = computed(() => {
  return hugeList.value
    .filter(...)
    .map(...)
})
```

如果：

```text
hugeList 没有变化
```

连续读取：

```js
expensiveResult.value
expensiveResult.value
expensiveResult.value
```

Vue 不需要每次重新运行 getter。

它会基于响应式依赖缓存之前的计算结果：

```text
依赖没变
→ 使用缓存

依赖变了
→ 重新计算
→ 得到新的结果
```

这就是 `computed` 和普通方法的重要区别。Vue 官方明确说明，computed 的值会根据其响应式依赖进行缓存。([Vue.js](https://cn.vuejs.org/guide/essentials/computed?utm_source=chatgpt.com))

所以：

```js
const now = computed(() => Date.now())
```

并不会持续变化，因为：

```text
Date.now()
```

不是响应式依赖。

---
#### 2. `watch`：明确监听某个 source，然后执行副作用

例如：

```js
const userId = ref(1)

watch(userId, (newId, oldId) => {
  fetchUser(newId)
})
```

这里我们的目标不是计算出一个新的响应式值，而是：

```text
userId 变化
↓
产生一个外部行为
↓
发送请求
```

这就是典型的：

```text
side effect
副作用
```

常见副作用包括：

```text
请求接口、写 localStorage、操作 DOM、记录日志、调用第三方库、启动/停止定时器
```

所以：

> **如果目标是根据某个状态变化去“做一件事”，通常考虑 watch。**

---
#### 3. `watch` 可以监听什么？

Composition API 中常见有四类。
##### 监听 ref

```js
const count = ref(0)

watch(count, (newValue, oldValue) => {
  console.log(newValue, oldValue)
})
```
##### 监听 computed

```js
const double = computed(() => count.value * 2)

watch(double, (value) => {
  console.log(value)
})
```
##### 监听 getter

```js
const state = reactive({
  count: 0
})

watch(
  () => state.count,
  (newValue, oldValue) => {}
)
```
##### 同时监听多个 source

```js
watch(
  [firstName, lastName],
  ([newFirst, newLast], [oldFirst, oldLast]) => {
    // ...
  }
)
```

也就是说可以理解成：

```text
watch(
  source,
  callback
)
```

`source` 决定：

> **谁变化才需要触发 callback。**

这是它和 `watchEffect` 非常重要的区别。([Vue.js](https://vuejs.org/api/reactivity-core.html?utm_source=chatgpt.com))

---
#### 4. `watch` 默认是懒执行的

例如：

```js
const count = ref(0)

watch(count, () => {
  console.log('执行')
})
```

创建 watcher 的时候：

```text
不会立即执行 callback
```

等到：

```js
count.value++
```

以后才执行。

所以：

```text
watch
→ 默认 lazy
```

如果需要创建时先执行一次：

```js
watch(
  count,
  (value) => {
    console.log(value)
  },
  {
    immediate: true
  }
)
```

这样：

```text
创建 watcher
→ 立即执行一次

之后 count 变化
→ 再执行
```

Vue 官方明确规定，`watch` 默认是懒执行，`immediate: true` 可以立即调用 callback，并且第一次执行时 `oldValue` 是 `undefined`。([Vue.js](https://cn.vuejs.org/guide/essentials/watchers?utm_source=chatgpt.com))

---
#### 5. `watchEffect`：自动收集依赖

例如：

```js
const userId = ref(1)
const token = ref('xxx')

watchEffect(() => {
  fetch(`/user/${userId.value}`, {
    headers: {
      Authorization: token.value
    }
  })
})
```

这里没有写：

```js
watch([userId, token], ...)
```

但是 `watchEffect` 执行时读取了：

```text
userId.value
token.value
```

Vue 就自动知道：

```text
这个 effect、依赖 userId、依赖 token
```

所以：

```text
userId 改变
→ watchEffect 重跑

token 改变
→ watchEffect 重跑
```

这和前面讲的响应式依赖收集完全一样：

```text
watchEffect 开始执行
↓
成为当前 reactive effect
↓
读取响应式数据
↓
track
↓
自动建立依赖
```

因此：

> **watchEffect 把“依赖收集”和“副作用执行”放在了同一个函数里。**

Vue 官方也明确区分：

```text
watch
→ 只追踪显式 source

watchEffect
→ 自动追踪同步执行过程中访问的响应式属性
```

([Vue.js](https://vuejs.org/guide/essentials/watchers.html?utm_source=chatgpt.com))

---
#### 6. `watchEffect` 默认立即执行

例如：

```js
watchEffect(() => {
  console.log(count.value)
})
```

创建时：

```text
立即执行一次
↓
读取 count
↓
完成依赖收集
```

以后：

```text
count 改变
↓
再次执行
```

所以：

```text
watch
→ 默认 lazy

watchEffect
→ 默认立即执行
```

这背后的原因也很好理解：

`watchEffect` 必须先执行一次，才能知道：

> **这个函数到底依赖了哪些响应式数据。**

---
#### 7. async `watchEffect` 有一个重要边界

例如：

```js
watchEffect(async () => {
  console.log(a.value)

  await fetch('/api')

  console.log(b.value)
})
```

这里：

```text
a.value
→ 在第一个 await 之前读取
→ 会被自动追踪
```

但是：

```text
b.value
→ await 之后才读取
→ 不会被这一轮自动依赖追踪捕获
```

Vue 官方明确说明：

> `watchEffect` 只会追踪同步执行期间访问的依赖；async callback 中只有第一次 `await` 之前访问的属性会被追踪。([Vue.js](https://vuejs.org/guide/essentials/watchers.html?utm_source=chatgpt.com))

这是很高频的追问。

---
#### 8. `deep` 深度监听

例如：

```js
const user = reactive({
  profile: {
    name: 'Tom'
  }
})
```

如果直接：

```js
watch(user, () => {
  console.log('user changed')
})
```

Vue 对 reactive 对象本身的 watcher 会隐式进行深层监听。

因此：

```js
user.profile.name = 'Jerry'
```

也可以触发 watcher。([Vue.js](https://cn.vuejs.org/api/reactivity-core?utm_source=chatgpt.com))

但是如果：

```js
watch(
  () => user.profile,
  () => {}
)
```

这里监听的是：

```text
getter 的返回值
```

默认主要是在：

```text
user.profile 被替换
```

时触发。

如果希望：

```js
user.profile.name = 'Jerry'
```

这种内部修改也触发，可以：

```js
watch(
  () => user.profile,
  () => {},
  {
    deep: true
  }
)
```

所以：

```text
watch(reactiveObject)
→ 隐式深度监听

watch(() => reactiveObject.someObject)
→ 默认观察返回对象是否替换
→ 深层 mutation 要考虑 deep: true
```

Vue 3.5+ 中：

```js
deep: 2
```

甚至可以使用数字限制最大遍历深度。([Vue.js](https://cn.vuejs.org/api/reactivity-core?utm_source=chatgpt.com))
##### 为什么深度 watch 的 newValue 和 oldValue 可能一样？

例如：

```js
watch(
  user,
  (newValue, oldValue) => {
    console.log(newValue === oldValue)
  }
)
```

如果只是：

```js
user.profile.name = 'Jerry'
```

对象本身没有被替换：

```text
newValue
和
oldValue

都还是同一个 user Proxy
```

所以可能：

```js
newValue === oldValue // true
```

这不是 bug。

因为：

> 发生的是对象内部 mutation，而不是整个对象引用被替换。([Vue.js](https://cn.vuejs.org/api/reactivity-core?utm_source=chatgpt.com))

---
#### 9. watcher 的执行时机：`flush`

默认：

```js
flush: 'pre'
```

这部分一定不要简单回答成：

> watcher 一定在 DOM 更新后执行。

默认实际上是：

```text
响应式状态变化
↓
父组件更新（如果有）
↓
watch callback
↓
当前组件 DOM 更新
```

所以默认 watcher 中读取：

```text
当前组件 DOM
```

通常看到的还是更新前状态。Vue 官方明确规定默认 callback 位于父组件更新之后、所属组件 DOM 更新之前。([Vue.js](https://cn.vuejs.org/guide/essentials/watchers?utm_source=chatgpt.com))

---
##### `flush: 'post'`

如果你需要：

> watcher 中读取已经更新完成的当前组件 DOM

使用：

```js
watch(source, callback, {
  flush: 'post'
})
```

或者：

```js
watchEffect(callback, {
  flush: 'post'
})
```

还有快捷 API：

```js
watchPostEffect(() => {})
```

执行关系可以理解：

```text
响应式数据变化
↓
当前组件 DOM 更新
↓
post watcher
```

([Vue.js](https://cn.vuejs.org/guide/essentials/watchers?utm_source=chatgpt.com))

---
##### `flush: 'sync'`

也可以：

```js
watch(source, callback, {
  flush: 'sync'
})
```

这时：

```text
响应式数据修改
↓
watch callback 立即同步执行
```

但要特别注意：

> sync watcher 不走正常的 batching。

所以：

```js
for (...) {
  arr.value.push(...)
}
```

可能触发很多次同步 watcher。

官方明确建议：

```text
sync
→ 可以用于简单状态
→ 不适合大量同步 mutation 的数据
```

([Vue.js](https://cn.vuejs.org/guide/essentials/watchers?utm_source=chatgpt.com))

所以：

```text
pre
→ 默认，当前组件 DOM 更新前

post
→ 当前组件 DOM 更新后

sync
→ mutation 时同步触发，不批处理
```

---
#### 10. cleanup 为什么重要？

假设：

```js
const userId = ref(1)

watch(userId, async (id) => {
  const result = await fetch(`/user/${id}`)
  data.value = await result.json()
})
```

快速修改：

```text
userId = 1
↓
发请求 A

马上：
userId = 2
↓
发请求 B
```

可能发生：

```text
请求 B 先回来
→ 页面显示 user 2

请求 A 后回来
→ 又把页面覆盖成 user 1
```

这就是典型的：

```text
stale async work
异步竞态
```

所以 watcher 可以注册 cleanup。

例如 Vue 3.5+：

```js
watch(userId, (id) => {
  const controller = new AbortController()

  fetch(`/user/${id}`, {
    signal: controller.signal
  })

  onWatcherCleanup(() => {
    controller.abort()
  })
})
```

当：

```text
userId 再次变化
```

旧 watcher 失效，在新一轮执行之前：

```text
cleanup
↓
取消旧请求
↓
再发新请求
```

Vue 官方明确将“取消已经失效的异步请求”作为 watcher cleanup 的主要场景。([Vue.js](https://vuejs.org/api/reactivity-core.html?utm_source=chatgpt.com))

---
#### 11. 三个经典场景怎么选？

##### 场景一：计算 fullName

```js
const firstName = ref('Tom')
const lastName = ref('Smith')
```

要得到：

```text
fullName
```

使用：

```js
const fullName = computed(() => {
  return `${firstName.value} ${lastName.value}`
})
```

因为：

```text
输入状态
↓
纯计算
↓
派生状态
```

应该用：

```text
computed
```

---
##### 场景二：userId 改变以后请求接口

```js
watch(userId, async (id) => {
  // 请求接口
})
```

因为：

```text
userId 变化
↓
产生外部副作用
```

而且：

```text
依赖是谁非常明确
```

所以更适合：

```text
watch
```

---
##### 场景三：副作用同时依赖很多数据

例如：

```js
watchEffect(() => {
  console.log(
    user.value.name,
    settings.value.theme,
    route.params.id
  )
})
```

如果你不想手动维护：

```js
watch(
  [user, settings, ...]
)
```

那么：

```text
watchEffect
```

更方便，因为会自动收集真正读取的响应式属性。([Vue.js](https://vuejs.org/guide/essentials/watchers.html?utm_source=chatgpt.com))

---
#### 12. 为什么派生状态不要滥用 `watchEffect`？

例如：

```js
const fullName = ref('')

watchEffect(() => {
  fullName.value =
    firstName.value + ' ' + lastName.value
})
```

虽然能工作，但这实际上是在：

```text
firstName / lastName
↓
副作用
↓
手动修改另一个 ref
```

你因此维护了：

```text
源状态 + 派生状态副本
```

更合理的是：

```js
const fullName = computed(() => {
  return `${firstName.value} ${lastName.value}`
})
```

因为：

```text
fullName 本身没有独立状态
只是 firstName + lastName 的结果
```

这样表达更加直接，也不会产生不必要的状态同步问题。

所以一个非常重要的判断标准是：

```text
如果目的是“得到一个值”
→ computed

如果目的是“做一件事”
→ watch / watchEffect
```

---
#### 最终面试收敛回答

> **`computed`、`watch` 和 `watchEffect` 都建立在 Vue 的响应式 effect 系统上，但职责不同。`computed` 用来表示派生状态，它接收 getter，自动追踪 getter 中使用的响应式依赖，并根据依赖进行缓存；依赖不变时重复读取会直接复用结果。`computed` 默认返回只读 ref，也可以通过 getter 和 setter 创建可写 computed。因此如果一个值能够由其他响应式状态计算出来，例如 `fullName = firstName + lastName`，优先使用 computed。** ([Vue.js](https://cn.vuejs.org/guide/essentials/computed?utm_source=chatgpt.com))
>
> **`watch` 用来明确监听一个或多个响应式 source，并在 source 真正变化以后执行副作用。source 可以是 ref、computed、getter、reactive object 或 source 数组，callback 可以获得 newValue 和 oldValue。`watch` 默认懒执行，通过 `immediate: true` 可以立即执行；直接 watch reactive object 时会隐式进行深度监听，而监听一个返回对象的 getter 时，内部深层变化通常需要 `deep: true`。因此接口请求、localStorage 同步、第三方 API 调用等“状态变化以后做某件事”的场景更适合 watch。** ([Vue.js](https://vuejs.org/api/reactivity-core.html?utm_source=chatgpt.com))
>
> **`watchEffect` 同样用于副作用，但它不需要显式声明 source，而是在立即执行 callback 的过程中自动追踪同步访问到的响应式数据，以后任一依赖变化都会重新执行。它和 watch 的核心区别是：watch 将“依赖是谁”和“副作用是什么”分开，控制更加精确；watchEffect 把依赖追踪和副作用放在一起，使用更简洁但依赖不够显式。需要注意，如果 watchEffect 使用 async callback，只会追踪第一个 await 之前同步读取到的依赖。** ([Vue.js](https://vuejs.org/guide/essentials/watchers.html?utm_source=chatgpt.com))
>
> **watcher 默认采用 `flush: 'pre'`，也就是父组件更新之后、当前组件 DOM 更新之前执行；需要访问已经更新后的当前组件 DOM 时使用 `flush: 'post'` 或 `watchPostEffect`；`flush: 'sync'` 会在响应式 mutation 时同步触发，并且不进行正常批处理，因此要谨慎使用。watch 和 watchEffect 还支持 cleanup，可以在下一轮 watcher 执行前取消上一轮已经失效的请求、定时器等副作用，避免异步竞态。最终可以记成一句话：`computed` 是“根据状态得到值”，`watch` 是“明确监听状态再做事”，`watchEffect` 是“先做事并自动发现自己依赖哪些状态”。** ([Vue.js](https://cn.vuejs.org/guide/essentials/watchers?utm_source=chatgpt.com))

---

**Sources:**

- [Reactivity API: Core | Vue.js](https://vuejs.org/api/reactivity-core.html?utm_source=chatgpt.com)
- [计算属性 | Vue.js](https://cn.vuejs.org/guide/essentials/computed?utm_source=chatgpt.com)

## 第39题 Vue 和 React 常见的数据通信方式有哪些？不同组件关系下应该如何选择？

### 题目

Vue 和 React 常见的数据通信方式有哪些？不同组件关系下应该如何选择？

### 问题

1. Vue 和 React 的组件通信为什么可以按照“组件之间的关系”来分类？
2. 父组件向子组件传递数据时，Vue 和 React 分别怎么做？
3. 子组件需要通知父组件修改状态时，Vue 和 React 分别怎么做？
4. 为什么组件通信通常强调“状态由上层持有，数据向下传，修改请求向上传”？
5. Vue 中 `props + emit` 和 React 中 `props + callback` 有什么对应关系？
6. Vue 的组件 `v-model` 和 `props + emit` 是什么关系？
7. 当祖先组件需要向深层后代传递数据时，Vue 的 `provide / inject` 和 React 的 Context 分别怎么工作？
8. `provide / inject` 和 Context 主要解决的是什么问题？为什么不应该所有数据都使用它们传递？
9. 两个兄弟组件需要共享并修改同一份状态时，为什么通常要进行“状态提升”？
10. 什么叫“提升到最近的共同父组件”？提升以后数据如何在兄弟组件之间流动？
11. 什么情况下状态应该继续保留在局部组件或公共父组件，而不需要进入全局 Store？
12. 什么情况下才更适合使用全局状态管理？
13. Vue 中常见的全局状态管理方案是什么？React 中常见方案是什么？
14. React 的 Context 和 Redux 是一回事吗？它们分别更适合解决什么问题？
15. 最终如何根据“父子 → 跨层 → 兄弟 → 全局”这几个层级快速选择通信方案？

---

### 回答要点

#### 1. 先按照组件关系分类

Vue 和 React 虽然 API 不一样，但组件通信的整体思想非常接近：

```text
父子通信
↓
跨层通信
↓
兄弟通信
↓
全局共享状态
```

可以先记住这张对应关系：

| 场景 | Vue | React |
|---|---|---|
| 父 → 子 | `props` | `props` |
| 子 → 父 | `emit` | 父组件通过 `props` 传 callback |
| 祖先 → 深层后代 | `provide / inject` | Context |
| 兄弟组件 | 状态提升到共同父组件 | 状态提升到共同父组件 |
| 全局共享状态 | Pinia | Redux / Redux Toolkit 等 |

---
#### 2. 父子通信

父传子，两者核心都是：

```text
Parent State
↓
props
↓
Child
```

Vue：

```vue
<UserCard :user="user" />
```

React：

```jsx
<UserCard user={user} />
```

子传父有所区别。

Vue 更常见：

```text
Child
↓
emit
↓
Parent
```

例如：

```vue
emit('change', value)
```

父组件监听：

```vue
<Child @change="handleChange" />
```

React 没有 Vue 这种组件 `emit` 机制，通常是父组件把函数作为 prop 传给子组件：

```text
Parent
↓
callback prop
↓
Child
↓
调用 callback
↓
Parent 修改 state
```

例如：

```jsx
<Child onChange={handleChange} />
```

React 官方也明确说明 props 可以传递包括函数在内的任意 JavaScript 值。([React](https://react.dev/learn/passing-props-to-a-component?utm_source=chatgpt.com))

所以可以对应记忆：

```text
Vue
父 → 子：props
子 → 父：emit

React
父 → 子：props
子 → 父：callback props
```

Vue 的组件 `v-model` 也不需要单独看成一种完全不同的通信机制，其核心仍然可以理解为：

```text
prop + update 事件
```

也就是对父子状态同步的一层封装。

---
#### 3. 祖先和深层后代通信

如果：

```text
App
└── A
    └── B
        └── C
            └── D
```

D 需要 App 中的数据。

一直使用 props：

```text
App
↓
A
↓
B
↓
C
↓
D
```

就会出现：

```text
Props Drilling
逐层透传
```

很多中间组件明明不需要数据，却不得不负责继续传递。

Vue 提供：

```text
provide + inject
```

祖先：

```js
provide('user', user)
```

后代：

```js
const user = inject('user')
```

于是：

```text
Ancestor
↓ provide

中间组件无需逐层传递

↓ inject
Deep Child
```

Vue 官方正是把 `provide / inject` 作为解决深层 prop drilling 的机制。([Vue.js](https://vuejs.org/guide/components/provide-inject?utm_source=chatgpt.com))

React 对应的是：

```text
Context
```

基本过程是：

```text
createContext
↓
上层 Provider 提供 value
↓
深层组件 useContext
```

Context 可以让父级向组件树中任意深度的后代提供数据，而不需要逐层传 props。([React](https://react.dev/learn/passing-data-deeply-with-context?utm_source=chatgpt.com))

所以可以直接对应：

```text
Vue
provide / inject

React
Context
```

它们主要解决的是：

> **组件树范围内的跨层数据传递。**

---
#### 4. 兄弟组件通信：状态提升

假设：

```text
       Parent
       /    \
      A      B
```

A 和 B 需要共享一个：

```text
selectedId
```

如果：

```text
A 自己保存 selectedId
B 自己也保存 selectedId
```

就会形成两份状态，很容易不同步。

更合理的方法是：

```text
       Parent
   selectedId
      /    \
     ↓      ↓
   props   props
    A       B
```

如果 A 修改：

```text
A
↓
emit / callback
↓
Parent
↓
修改 selectedId
↓
重新通过 props 给 A、B
```

这就叫：

> **状态提升（Lifting State Up）。**

核心是把：

```text
两个组件共同需要的状态
```

移动到：

```text
它们最近的共同父组件
```

由父组件成为这份状态的：

```text
Single Source of Truth
单一数据源
```

React 官方直接把“把两个组件的状态移动到最近共同父组件”定义为 lifting state up。([React](https://react.dev/learn/sharing-state-between-components?utm_source=chatgpt.com))

Vue 中虽然不会把它单独做成某个 API，但设计思想完全一样：

```text
Parent 持有状态
↓
props 给兄弟组件

Child 修改需求
↓
emit 给 Parent
```

因此兄弟组件通信不需要专门寻找：

```text
A → B
```

这样的直接通信机制。

更推荐：

```text
A
↓
Parent
↓
B
```

---
#### 5. 再往上才是全局状态管理

这里最重要的是不要把：

> “两个组件都用了这个状态”

直接等同于：

> “应该放进全局 Store”。

因为两个兄弟组件共享状态，完全可以：

```text
状态提升
→ 最近共同父组件
```

就解决。

应该形成这样的层级：

```text
只属于一个组件
→ Local State

几个相邻组件共享
→ Lift State Up

组件树深层上下文
→ provide/inject 或 Context

跨多个页面、多个远距离组件共同使用
→ Global Store
```

---

### 标准回答

Vue 和 React 的组件通信方式虽然 API 不完全一样，但整体上可以按照：

```text
父子
→ 祖先后代
→ 兄弟
→ 全局
```

四个层级来理解。
#### 1. 父子组件：`props + emit/callback`

父组件向子组件传递数据时，Vue 和 React 都主要使用 `props`：

```text
Parent State
↓
props
↓
Child
```

Vue：

```vue
<UserCard :user="user" />
```

React：

```jsx
<UserCard user={user} />
```

React 官方将 props 定义为组件之间传递信息的基本方式，而且 props 可以是任意 JavaScript 值，包括函数。([React](https://react.dev/learn/passing-props-to-a-component?utm_source=chatgpt.com))

区别主要出现在子组件通知父组件时。

Vue 一般使用：

```text
emit
```

例如：

```js
emit('change', value)
```

父组件：

```vue
<Child @change="handleChange" />
```

也就是：

```text
Child
↓
emit event
↓
Parent
```

Vue 官方的组件事件机制就是由子组件 `$emit()` / `emit()` 发出事件，父组件通过 `v-on` 监听。([Vue.js](https://vuejs.org/guide/components/events?utm_source=chatgpt.com))

React 没有与 Vue `emit` 完全对应的组件事件 API。

React 更常见的是：

```jsx
function Parent() {
  const handleChange = value => {
    // 修改父组件 state
  }

  return <Child onChange={handleChange} />
}
```

子组件：

```jsx
function Child({ onChange }) {
  return (
    <button onClick={() => onChange(1)}>
      修改
    </button>
  )
}
```

本质是：

```text
Parent
↓
把 callback 作为 prop 传给 Child
↓
Child 调用 callback
↓
Parent 修改自己的 state
```

因此父子通信可以直接对照记成：

```text
Vue：
props down
events up

React：
props down
callback props up
```

二者背后的核心思想是一样的：

> **父组件拥有状态，子组件读取父组件传下来的数据；需要修改时由子组件通知父组件，而不是直接改变父组件的数据。**

Vue 中的组件 `v-model` 本质上仍然是这种模式的一种封装，也就是：

```text
prop + update event
```

不需要把它再理解成一套独立的数据通信体系。

---
#### 2. 祖先和后代：`provide/inject` 与 Context

如果组件嵌套很深：

```text
App
└── Layout
    └── Main
        └── Form
            └── Input
```

而 Input 需要 App 中的数据。

如果全部使用 props：

```text
App
↓
Layout
↓
Main
↓
Form
↓
Input
```

中间组件即使不使用这份数据，也必须负责传递，这就是：

```text
Props Drilling
```

Vue 可以使用：

```text
provide / inject
```

祖先：

```js
provide('user', user)
```

后代：

```js
const user = inject('user')
```

祖先负责提供依赖，任意深度的后代都可以注入，中间组件不需要继续传递。([Vue.js](https://vuejs.org/guide/components/provide-inject?utm_source=chatgpt.com))

React 对应的是：

```text
Context
```

基本模式：

```text
createContext
↓
上层提供 Context value
↓
深层组件 useContext()
```

React 官方说明，Context 就是为了让父级向任意深度的后代提供信息，而不需要一层一层传 props。([React](https://react.dev/learn/passing-data-deeply-with-context?utm_source=chatgpt.com))

所以这一层可以直接记：

```text
Vue
provide / inject

React
Context
```

它们主要针对：

> **存在明确祖先-后代关系，但 props 层层透传过于麻烦的情况。**

---
#### 3. 兄弟组件：状态提升

兄弟组件之间：

```text
       Parent
       /    \
      A      B
```

通常不应该设计成：

```text
A
→ 直接修改 B
```

更常见的设计是：

> **把 A、B 共同需要的状态提升到最近共同父组件。**

例如：

```text
          Parent
       selectedId
        /       \
       ↓         ↓
    props       props
      A           B
```

如果 A 需要修改 selectedId：

Vue：

```text
A
↓ emit
Parent 修改 state
↓ props
A / B
```

React：

```text
A
↓ callback
Parent setState
↓ props
A / B
```

这就是：

```text
Lifting State Up
状态提升
```

React 官方给出的原则也是：当两个组件需要协调状态时，把状态移动到最近的共同父组件，再通过 props 向下传递，同时把 event handler 传给子组件，让子组件通知父组件修改状态。([React](https://react.dev/learn/sharing-state-between-components?utm_source=chatgpt.com))

因此 Vue 和 React 在这一点上的核心思想其实完全一致：

```text
共享状态
↓
最近共同父组件持有
↓
保持单一数据源
```

---
#### 4. 全局通信：Pinia 与 Redux

只有当状态的共享范围继续扩大，例如：

```text
Header、Sidebar、Page A、Page B、Dialog、多个业务模块
```

都需要访问或修改同一份状态时，才需要进一步考虑全局状态管理。

Vue3 中常见的是：

```text
Pinia
```

Store 集中管理：

```text
state、getters、actions
```

供多个组件共同使用。Pinia 是 Vue 生态中专门的 Store 方案。([Pinia](https://pinia.vuejs.org/introduction.html?utm_source=chatgpt.com))

React 中常见的一个方案是：

```text
Redux
```

现代项目通常使用：

```text
Redux Toolkit + React-Redux
```

Redux 官方将 Redux 定义为管理全局应用状态的库，并明确指出 Redux 更适合大量状态被应用多个部分共同使用、更新逻辑较复杂等场景。([Redux](https://redux.js.org/tutorials/fundamentals/part-1-overview?utm_source=chatgpt.com))

这里需要注意：

> **Redux 不是 React 自带功能。**

它是独立的状态管理库，只是经常和 React 一起使用。

React 自带的：

```text
Context
+
useState / useReducer
```

本身也能处理不少共享状态场景，因此不能说：

```text
React 全局状态 = Redux
```

更准确的是：

```text
React 内置
→ Context / state / reducer

复杂全局状态
→ 常见可选择 Redux 等状态库
```

Redux 官方本身也强调，并不是所有应用都需要 Redux；如果 React 自身状态管理已经足够，就没有必要为了使用 Redux 而使用 Redux。([Redux](https://redux.js.org/faq/general/?utm_source=chatgpt.com))

---
#### 最重要：局部状态和全局状态怎么划分？

这一点比背通信 API 更重要。

不要形成：

```text
只要两个组件使用
→ Pinia / Redux
```

这种判断。

应该从小到大判断：

```text
① 只有当前组件需要
→ Local State
```

例如：

```text
弹窗是否打开、按钮 hover、输入框临时值
```

就放在组件内部。

如果：

```text
② 几个关系较近的组件需要
```

先考虑：

```text
状态提升
→ 最近共同父组件
```

如果：

```text
③ 是组件树中深层后代都需要的上下文
```

考虑：

```text
Vue：provide / inject
React：Context
```

只有当：

```text
④ 很多没有直接组件关系的地方都需要
```

或者出现：

```text
跨页面共享、大量组件共同读写、状态生命周期接近整个应用、更新逻辑较复杂、需要统一维护和调试
```

这时再考虑：

```text
Vue → Pinia
React → Redux 等全局 Store
```

Redux 官方的建议本身也是：不是所有状态都应该进入 Redux，局部组件状态完全合理。([Redux](https://redux.js.org/faq/organizing-state?utm_source=chatgpt.com))

所以更准确的原则不是：

> “多个组件共享就一定放全局。”

而是：

> **状态应该尽量放在离使用它的组件最近、同时又能够保证单一数据源的位置。只有共享范围扩大到普通状态提升或组件树上下文已经不合适时，再提升成全局状态。**

---
#### 最终面试收敛回答

> **Vue 和 React 的组件通信可以按照父子、祖先后代、兄弟以及全局四个层级来理解。父组件向子组件传数据时，两者都使用 props；子组件通知父组件时，Vue 通常通过 emit 发出组件事件，而 React 通常由父组件把 callback 作为 prop 传给子组件，再由子组件调用。因此两者本质上都遵循“状态由上层持有、数据向下传递、修改请求向上传递”的单向数据流思想。** ([Vue.js](https://vuejs.org/guide/components/events?utm_source=chatgpt.com))
>
> **对于深层祖先和后代通信，Vue 使用 `provide / inject`，祖先 provide 数据或依赖，深层后代直接 inject；React 对应的是 Context，由上层提供 Context value，后代通过 `useContext` 读取。二者主要用于解决多层组件之间的 props drilling。** ([Vue.js](https://vuejs.org/guide/components/provide-inject?utm_source=chatgpt.com))
>
> **兄弟组件通信通常使用状态提升：把兄弟组件共同需要的状态移动到最近的共同父组件，由父组件统一管理，再通过 props 向下传递。Vue 中子组件通过 emit 通知父组件修改，React 中则调用父组件传下来的 callback。这样可以保证这份状态只有一个真正的数据源。** ([React](https://react.dev/learn/sharing-state-between-components?utm_source=chatgpt.com))
>
> **如果状态的共享范围进一步扩大到多个页面、多个远距离组件或多个业务模块，再考虑全局状态管理。Vue3 常见使用 Pinia，React 中复杂全局状态常见 Redux / Redux Toolkit。不过不是多个组件使用一份数据就一定需要全局 Store：能够通过局部状态解决就保留局部；几个相邻组件共享就优先状态提升；深层组件树共享可以考虑 provide/inject 或 Context；只有共享范围、生命周期和更新复杂度进一步扩大时，再使用 Pinia 或 Redux。核心原则就是：状态尽量放在离使用者最近、同时能够保证单一数据源的位置。** ([Redux](https://redux.js.org/faq/general/?utm_source=chatgpt.com))

---

**Sources:**

- [Passing Props to a Component – React](https://react.dev/learn/passing-props-to-a-component?utm_source=chatgpt.com)
- [Provide / Inject | Vue.js](https://vuejs.org/guide/components/provide-inject?utm_source=chatgpt.com)
- [Introduction | Pinia](https://pinia.vuejs.org/introduction.html?utm_source=chatgpt.com)
- [Redux Fundamentals, Part 1: Redux Overview | Redux](https://redux.js.org/tutorials/fundamentals/part-1-overview?utm_source=chatgpt.com)

## 第40题 前端包管理器是做什么的？

### 题目

前端包管理器是做什么的？

### 问题

1. 前端项目为什么需要包管理器？如果没有包管理器会有什么问题？
2. 包管理器主要解决哪些问题？为什么说它能够提高项目的可复现性和团队协作效率？
3. 前端常见的包管理器有哪些？`npm`、`Yarn`、`pnpm` 分别有什么特点？
4. `package.json` 是做什么的？它在依赖管理中承担什么角色？
5. `dependencies` 和 `devDependencies` 有什么区别？分别适合存放哪些依赖？
6. 已经有 `package.json` 了，为什么还需要 `package-lock.json`、`yarn.lock` 或 `pnpm-lock.yaml`？
7. 为什么说 `package.json` 主要描述“依赖范围”，而 lock 文件负责记录“实际安装结果”？
8. `npm install` 安装依赖时大致经历哪些步骤？最终安装的依赖放在哪里？
9. `node_modules` 是什么？项目运行时为什么能够从其中找到依赖？
10. `npm install` 和 `npm ci` 有什么区别？为什么 CI/CD 环境通常更适合使用 `npm ci`？
11. npm 和早期 Yarn 为什么会采用依赖提升（Hoisting）？它解决了什么问题？
12. 什么是幽灵依赖（Phantom Dependency）？它为什么和传统扁平化 `node_modules` 结构有关？
13. pnpm 为什么能够减少幽灵依赖问题？它的依赖隔离是怎么实现的？
14. pnpm 为什么比传统 npm / Yarn 更节省磁盘空间？全局 Store、硬链接和符号链接分别起什么作用？
15. pnpm 的全局 Store 和“全局安装一个包”是同一回事吗？
16. 什么是 `npx`？它和 `npm install` 有什么区别？为什么很多 CLI 工具可以通过 `npx` 直接运行？

### 回答要点

建议按照：

**为什么需要包管理器 → package.json → lock 文件 → npm install / npm ci → node_modules → npm/Yarn/pnpm → 依赖提升 → 幽灵依赖 → pnpm 存储机制 → npx**

这个顺序回答。
#### 1. 为什么需要前端包管理器

现代前端项目会依赖大量第三方包，例如：

```text
Vue、React、Axios、ECharts、Vite、Webpack、ESLint、Vitest、...
```

如果没有包管理器：

- 需要自己寻找和下载依赖；
- 需要手动维护不同依赖的版本；
- 还要继续处理依赖本身依赖的其他包；
- 不同开发人员可能安装不同版本；
- 开发、测试和部署环境容易出现依赖不一致。

包管理器主要解决：

```text
依赖安装 + 版本管理 + 依赖关系管理 + 可重复安装 + 团队协作
```

核心价值是：

> **让项目能够根据配置一键恢复依赖环境，并尽可能保证不同机器、不同阶段得到一致、可复现的依赖结果。**

---
#### 2. `package.json` 是做什么的

`package.json` 可以理解为一个 Node / 前端项目的**项目描述文件和依赖声明文件**。

例如：

```json
{
  "dependencies": {
    "vue": "^3.5.0",
    "axios": "^1.7.0"
  },
  "devDependencies": {
    "vite": "^7.0.0",
    "eslint": "^9.0.0"
  }
}
```

它可以记录：

- 项目名称、版本；
- scripts；
- dependencies；
- devDependencies；
- Node / npm 等环境要求；
- 其他项目配置。

其中依赖主要分成：

```text
dependencies
→ 应用运行所需要的依赖

devDependencies
→ 开发、构建、测试、代码检查等过程中需要的依赖
```

例如：

```text
Vue
Axios
→ dependencies

Vite
ESLint
Vitest
→ devDependencies
```

需要注意，不能简单理解成：

```text
dependencies 一定会被打包
devDependencies 一定不会被打包
```

更准确的是：

> **dependencies 表示生产运行所需要的依赖，devDependencies 表示开发、构建、测试等阶段需要的依赖；最终哪些代码进入浏览器 Bundle，由实际 import 情况和构建工具决定。**

---
#### 3. 为什么有 `package.json` 还需要 lock 文件

问题在于 `package.json` 中经常写的是**版本范围**。

例如：

```json
"axios": "^1.7.0"
```

`^1.7.0` 并不是只允许：

```text
1.7.0
```

而是允许满足语义化版本规则的一定版本范围。

所以只依赖 `package.json`：

```text
开发者 A 今天安装
→ 可能得到一个版本

开发者 B 一段时间以后安装
→ 可能得到更新版本
```

而且第三方包还有自己的依赖：

```text
项目
↓
A
↓
B
↓
C
```

最终真正安装的是一棵完整的依赖树。

所以需要 lock 文件：

```text
package-lock.json、yarn.lock、pnpm-lock.yaml
```

它会记录实际解析出来的：

- 精确版本；
- 间接依赖版本；
- 整体依赖解析结果；
- 包来源以及完整性校验等信息。

因此可以理解为：

```text
package.json
→ 我允许安装什么

lock 文件
→ 这次最终具体安装什么
```

核心目的是：

> **提高不同机器和不同时间安装结果的一致性与可复现性。**

---
#### 4. `npm install` 大致经历什么过程

执行：

```bash
npm install
```

可以大致理解成：

```text
读取 package.json
        ↓
结合 package-lock.json
        ↓
解析依赖和版本
        ↓
构建依赖关系
        ↓
从 registry / 本地缓存获取包
        ↓
组织 node_modules
        ↓
执行必要的生命周期脚本
        ↓
更新 package-lock.json（必要时）
```

最终安装好的依赖通常会出现在：

```text
node_modules
```

---
#### 5. `node_modules` 是什么

可以简单理解成：

> **当前项目已经安装好的依赖包目录。**

例如：

```text
project
├── package.json
├── package-lock.json
└── node_modules
    ├── vue
    ├── axios
    ├── lodash
    └── ...
```

当代码：

```js
import axios from 'axios'
```

运行构建和模块解析时，会按照模块解析规则找到对应依赖。

所以：

```text
package.json
→ 声明依赖

lock
→ 固定具体解析结果

node_modules
→ 依赖真正安装后的文件结构
```

`node_modules` 通常由包管理器自动维护，不应该手动修改其中的代码。

---
#### 6. `npm install` 和 `npm ci` 有什么区别

`npm install` 更适合：

```text
日常开发、添加依赖、修改依赖、更新依赖
```

它会综合：

```text
package.json + package-lock.json
```

解析依赖，并且在需要的时候可能修改 lock 文件。

而：

```bash
npm ci
```

更强调：

> **严格按照已有 `package-lock.json` 进行一次干净、可复现的安装。**

通常会：

- 要求存在 lock 文件；
- 要求 lock 与 `package.json` 保持一致；
- 删除已有 `node_modules` 后重新安装；
- 不为了重新解析版本而修改 lock 文件。

因此：

```text
本地开发
→ npm install

CI / CD / 自动化测试 / 构建
→ npm ci
```

因为 CI 最关心的是：

> **同一份代码使用同一套确定的依赖进行构建，而不是今天安装一套、明天又安装另一套。**

---
#### 7. npm、Yarn 和 pnpm 有什么区别

三者本质上都在解决：

```text
依赖声明、依赖解析、依赖安装、版本锁定、脚本执行
```

但是内部依赖组织方式和优化策略不同。

可以粗略理解：

```text
npm
→ Node.js 生态默认、使用最广泛

Yarn
→ 早期重点改善安装速度、并行安装和确定性

pnpm
→ 更强调磁盘复用、安装效率和严格的依赖隔离
```

---
#### 8. 什么是依赖提升

假设：

```text
项目
├── A
│   └── lodash
└── B
    └── lodash
```

如果完全按照嵌套结构：

```text
node_modules
├── A
│   └── node_modules
│       └── lodash
└── B
    └── node_modules
        └── lodash
```

可能出现大量重复依赖和非常深的目录。

npm 和早期 Yarn 因此采用了依赖提升：

```text
node_modules
├── A
├── B
└── lodash
```

把能够提升的公共依赖放到较高层甚至项目根目录。

这样可以：

- 减少重复安装；
- 降低目录嵌套深度；
- 节省一定磁盘空间；
- 配合 Node 模块向上查找规则复用依赖。

所以：

> **依赖提升就是在满足版本兼容条件的情况下，把原本属于子依赖的包提升到更高层的 `node_modules` 中进行共享。**

---
#### 9. 什么是幽灵依赖

依赖提升同时带来了一个问题。

假设项目：

```json
{
  "dependencies": {
    "A": "1.0.0"
  }
}
```

项目并没有声明：

```text
lodash
```

但是：

```text
A
↓
依赖 lodash
```

因为 lodash 被提升到了：

```text
项目/node_modules/lodash
```

这时候项目自己的代码可能也能：

```js
import lodash from 'lodash'
```

虽然自己的 `package.json` 根本没有声明 lodash。

这就是：

> **幽灵依赖：当前项目没有显式声明某个依赖，但是由于其他依赖把它间接安装到了当前项目能够访问的位置，项目代码仍然可以使用它。**

风险在于：

```text
今天 A 依赖 lodash
→ 项目能运行

以后 A 不再依赖 lodash
→ lodash 消失
→ 项目突然报错
```

所以代码实际上依赖了一个自己没有声明的依赖。

---
#### 10. pnpm 为什么能够减少幽灵依赖

pnpm 更强调：

> **一个 package 原则上只能访问自己明确声明的依赖。**

它不会简单把所有依赖都平铺成：

```text
node_modules
├── A
├── B
├── C
├── D
├── lodash
├── axios
└── ...
```

让当前项目轻易访问全部间接依赖。

而是通过自己的：

```text
.pnpm + 符号链接组织
```

建立更严格的依赖结构。

因此：

```text
项目声明了 A
→ 项目可以正常访问 A

A 声明了 lodash
→ A 可以访问 lodash

项目没有声明 lodash
→ 项目不应该因为 A 使用了 lodash
   就顺便直接使用 lodash
```

所以 pnpm 可以有效减少传统扁平化结构导致的幽灵依赖。

---
#### 11. pnpm 为什么更节省磁盘

这是 pnpm 一个非常重要的特点。

如果有三个项目：

```text
Project A
→ lodash 4.17.21

Project B
→ lodash 4.17.21

Project C
→ lodash 4.17.21
```

传统思路可能三个项目分别保存一份依赖文件。

pnpm 则会维护一个**内容寻址的全局 Store**。

可以简化理解成：

```text
             pnpm Store
                 │
        lodash 的真实文件数据
          ↙      ↓      ↘
    Project A Project B Project C
```

多个项目可以复用同一份包内容。

---
#### 12. 硬链接和符号链接分别做什么

这里需要把两者区分开。
##### 硬链接

可以理解成：

> **多个文件路径指向文件系统中的同一份实际数据。**

所以 pnpm 可以让项目复用 Store 中已经存在的数据，避免每个项目复制一份相同文件。

核心作用：

```text
硬链接
→ 共享真实文件数据
→ 减少重复存储
```
##### 符号链接

符号链接更像：

> **一个路径指向另一个路径。**

pnpm 使用符号链接组织 `node_modules` 中包与包之间的依赖关系。

核心作用：

```text
符号链接
→ 组织依赖目录关系
→ 保证每个包只能看到自己应该看到的依赖
```

因此可以直接记：

```text
硬链接
→ 解决“文件不要重复存”

符号链接
→ 解决“依赖目录怎么组织”
```

---
#### 13. pnpm Store 和全局安装是不是一回事

**不是。**

pnpm Store：

```text
pnpm Store
```

本质上是：

> **包管理器用于存储和复用依赖内容的共享仓库。**

它的目的是：

```text
多个项目共享相同依赖文件
→ 避免重复下载
→ 避免重复存储
```

而全局安装：

```bash
npm install -g xxx
```

表示：

> **把某个工具安装到全局环境，让用户可以直接在命令行中使用。**

所以：

```text
全局 Store
→ 包管理器内部复用依赖的数据仓库

全局安装
→ 给用户提供全局可使用的软件 / CLI
```

二者不是一回事。

---
#### 14. `npx` 是做什么的

`npm install` 主要解决：

> **把一个包安装下来，作为项目依赖使用。**

而 `npx` 更关注：

> **找到并执行 npm 包提供的命令行程序。**

例如：

```bash
npx vite
```

如果项目本地已经安装了 Vite，可以直接执行本地版本。

很多场景下，如果本地没有对应工具，`npx` 还能够获取相应包后执行，而不需要先：

```bash
npm install -g xxx
```

因此它最大的价值之一是：

> **避免为了执行一次 CLI 命令而长期进行全局安装，也减少不同项目使用不同 CLI 版本时产生的全局版本冲突。**

所以可以记：

```text
npm install
→ 安装依赖

npx
→ 执行 npm 包提供的命令
```

---

### 标准回答

前端包管理器主要是用来解决**项目依赖的安装、版本管理、依赖关系管理以及环境可复现问题**。

现代前端项目通常会依赖 Vue、React、Axios、Vite、ESLint 等大量第三方包，而且这些包本身还会继续依赖其他包。如果没有包管理器，就需要人工下载依赖、管理版本以及处理复杂的间接依赖关系，很难保证团队成员以及开发、测试、部署环境使用的是同一套依赖。

因此包管理器最重要的价值可以概括为：

```text
一键安装依赖 + 统一版本管理 + 自动处理依赖关系 + 保证环境可复现 + 提高团队协作效率
```

首先，前端项目会通过 `package.json` 声明自己的依赖。

例如：

```json
{
  "dependencies": {
    "vue": "^3.5.0",
    "axios": "^1.7.0"
  },
  "devDependencies": {
    "vite": "^7.0.0",
    "eslint": "^9.0.0"
  }
}
```

其中 `dependencies` 主要表示应用生产运行需要的依赖，而 `devDependencies` 主要表示开发、构建、测试、代码检查等阶段需要的工具。

不过 `package.json` 通常声明的是一个**版本约束范围**，例如：

```text
^1.7.0
```

并不意味着任何时候都只能安装 `1.7.0`。

所以还需要：

```text
package-lock.json、yarn.lock、pnpm-lock.yaml
```

这样的 lock 文件。

可以把二者区别理解成：

```text
package.json
→ 声明“我需要什么依赖、允许什么版本范围”

lock
→ 记录“最终实际解析出了哪些具体版本”
```

lock 文件不仅会固定直接依赖，也会记录间接依赖的具体解析结果，从而提高不同开发人员以及 CI/CD 环境安装结果的一致性。

执行：

```bash
npm install
```

时，npm 会读取 `package.json` 和已有的 lock 信息，解析完整的依赖关系，然后从 registry 或缓存中获取相应包，组织依赖结构并把依赖安装到 `node_modules` 中，在需要的时候还会更新 `package-lock.json`。

所以这三个东西可以直接对应：

```text
package.json
→ 声明依赖

package-lock.json
→ 固定具体依赖解析结果

node_modules
→ 已经实际安装好的依赖
```

`npm install` 和 `npm ci` 的使用场景也不同。

`npm install` 更适合日常开发，因为开发过程中可能添加、删除或者升级依赖，因此它允许重新进行依赖解析并在必要时更新 lock 文件。

而：

```bash
npm ci
```

更强调严格按照已有 `package-lock.json` 进行一次干净安装，要求 `package.json` 和 lock 文件保持一致，并且不会为了重新解析依赖版本去修改 lock 文件。

所以一般：

```text
本地开发
→ npm install

CI/CD、自动化测试、正式构建
→ npm ci
```

因为 CI/CD 最重要的是保证：

> **同一份代码使用同一套确定的依赖环境进行构建。**

前端常见的包管理器主要包括 npm、Yarn 和 pnpm。

它们解决的核心问题相同，但是 `node_modules` 的组织方式存在差异。

npm 和早期 Yarn 为了解决嵌套依赖目录过深以及公共依赖重复安装的问题，会进行**依赖提升 Hoisting**。

例如 A 和 B 都依赖 lodash，本来可能形成：

```text
A/node_modules/lodash
B/node_modules/lodash
```

在满足版本条件时，可以把 lodash 提升到：

```text
项目/node_modules/lodash
```

A 和 B 都可以通过 Node 的模块查找机制访问它。

这样能够减少重复依赖和目录嵌套，但是也带来了**幽灵依赖**问题。

也就是：

```text
项目没有声明 lodash
↓
A 声明了 lodash
↓
lodash 被提升到项目根 node_modules
↓
项目代码竟然也能够 import lodash
```

这样当前项目就使用了一个自己没有显式声明的依赖。一旦以后 A 不再依赖 lodash，当前项目就可能突然无法运行。

pnpm 对这个问题采用了更加严格的依赖组织方式：

> **一个 package 原则上只能访问自己明确声明的依赖。**

即使某个间接依赖已经实际存在于磁盘中，也不意味着当前项目可以直接访问它，这能够有效减少幽灵依赖问题。

pnpm 另一个重要特点是磁盘空间利用率较高。

pnpm 会维护一个**内容寻址的全局 Store**，相同版本的相同文件不需要在每一个项目中重新保存一份，而可以被多个项目复用。

在这个过程中可以把：

```text
硬链接
→ 负责复用真实文件数据

符号链接
→ 负责组织 node_modules 中的依赖关系
```

作为核心理解。

因此：

```text
pnpm Store
```

并不等于：

```text
全局安装
```

Store 是包管理器内部用于共享和复用依赖内容的仓库，而全局安装是把 CLI 工具等安装到用户的全局环境中供命令行直接使用。

最后还有 `npx`。

`npm install` 主要解决的是：

```text
把依赖安装下来
```

而 `npx` 主要解决的是：

```text
执行 npm 包提供的 CLI 命令
```

它会优先使用项目本地已经安装的命令，在适当情况下也可以获取对应包以后执行，因此很多 CLI 工具不需要为了运行一次命令就进行全局安装。

所以整个前端包管理体系最终可以理解为：

```text
package.json
↓
声明需要哪些依赖
↓
lock 文件
↓
记录精确的依赖解析结果
↓
npm / Yarn / pnpm
↓
解析、下载并安装依赖
↓
node_modules
↓
项目实际使用依赖
```

其中：

```text
npm install
→ 日常安装和修改依赖

npm ci
→ 严格按照 lock 进行可复现安装

依赖提升
→ 减少重复和目录嵌套

幽灵依赖
→ 使用了自己没有声明的依赖

pnpm
→ Store 复用 + 更严格依赖隔离

npx
→ 执行 npm 包提供的 CLI
```
#### 最终面试收敛回答

> **前端包管理器主要解决依赖安装、版本管理、依赖关系管理以及环境可复现问题。项目通过 `package.json` 声明需要哪些依赖，其中 `dependencies` 主要是生产运行依赖，`devDependencies` 主要是开发、构建和测试依赖；但 package.json 通常声明的是版本范围，所以还需要 lock 文件记录最终解析出来的精确版本和依赖关系，从而尽可能保证不同机器得到一致的安装结果。**
>
> **执行 `npm install` 时，npm 会读取 package.json 和 lock 文件，解析完整依赖关系、获取依赖并组织到 `node_modules` 中，必要时还会更新 lock；而 `npm ci` 更强调严格按照现有 lock 文件进行一次干净、可复现的安装，因此更适合 CI/CD 和自动化构建。**
>
> **npm 和早期 Yarn 为了减少重复依赖和目录嵌套，会进行依赖提升，把满足条件的公共依赖提升到上层 `node_modules`。但这样可能产生幽灵依赖，也就是项目没有在 package.json 中声明某个依赖，却因为其他包依赖它并被提升到了根目录，导致项目代码也能直接使用它。pnpm 通过更严格的依赖隔离，让一个 package 原则上只能访问自己声明的依赖，从而减少这种问题。**
>
> **同时 pnpm 使用内容寻址的全局 Store 来复用相同依赖文件，硬链接主要负责共享真实文件数据、避免重复存储，符号链接主要负责组织依赖目录关系。这个 Store 只是包管理器用于复用依赖的数据仓库，并不等于全局安装。最后，`npx` 主要用于执行 npm 包提供的 CLI 命令，它会优先使用本地命令，并可以避免为了执行某个工具而长期进行全局安装。最终可以记成：package.json 负责“声明依赖”，lock 负责“锁定解析结果”，node_modules 负责“存放安装结果”，包管理器负责“解析和安装”，npx 负责“执行包提供的命令”。**

## 第41题 什么是 JavaScript 模块化？CommonJS 和 ES Module 有什么区别？

### 题目

什么是 JavaScript 模块化？模块化主要解决哪些问题？JavaScript 在正式模块规范出现之前是如何利用 IIFE 实现作用域隔离的？

进一步说明 CommonJS 和 ES Module 两种模块体系的导入导出方式及实现机制，并重点比较两者在**导出机制、依赖加载方式、静态分析和动态导入**方面的区别。

---

### 问题

1. 什么是 JavaScript 模块化？为什么说模块化的本质是“分而治之”？
2. 没有模块化时，JavaScript 主要会面临哪些问题？什么是全局变量污染、依赖混乱和数据安全问题？
3. 模块化分别通过什么机制解决这三个问题？
4. 模块化最终希望达到什么目标？为什么通常强调高内聚、低耦合？
5. 前端常见的模块化方式有哪些？功能模块化、组件化、业务模块化分别解决什么问题？
6. 在正式模块规范出现以前，IIFE 是怎么实现变量隔离的？它为什么能够减少全局变量污染？
7. IIFE 为什么还不能算一套完整的标准模块规范？它存在哪些局限？
8. CommonJS 是什么？它和 Node.js 是什么关系？
9. CommonJS 中 `module.exports`、`exports` 和 `require()` 分别有什么作用？
10. `exports` 和 `module.exports` 是什么关系？为什么 `exports.xxx = xxx` 可以导出，而直接执行 `exports = xxx` 不能替换最终导出结果？
11. `require()` 返回的到底是什么？是否可以通过对象接收、解构和重命名？
12. Node.js 为什么能够在 CommonJS 文件中直接使用 `module`、`exports`、`require`、`__filename`、`__dirname`？
13. ES Module 是什么？为什么说它是 JavaScript 官方模块标准？
14. ESM 有哪些常见导出方式？命名导出、默认导出、混合导出分别怎么写？
15. 命名导入、默认导入、重命名和 `import * as xxx` 分别是什么意思？
16. CommonJS 和 ESM 的第一个核心区别是什么？为什么不能简单把 CommonJS 概括成“所有东西都是值拷贝”？
17. CommonJS 导出基本类型以后，模块内部原变量重新赋值，为什么导入方通常不会同步变化？
18. CommonJS 导出对象以后，为什么修改对象属性时导入方又能够看到变化？如果原变量重新指向一个新对象又会怎样？
19. 什么是 ESM 的 Live Binding？基本类型和引用类型在 ESM 中分别如何表现？
20. CommonJS 和 ESM 的第二个核心区别是什么？
21. 为什么 `require()` 可以写在 `if`、函数等运行时逻辑中？为什么说 CommonJS 的依赖更偏运行时确定？
22. CommonJS 的 `require()` 为什么通常是同步的？
23. ESM 的静态 `import` 为什么必须位于模块顶层？为什么这使依赖关系可以在执行前分析？
24. ESM 如果需要条件加载或按需加载怎么办？`import()` 和静态 `import` 有什么区别？
25. 为什么 ESM 的静态结构更有利于 Tree Shaking？

---

### 回答要点

建议按照这一条主线组织，不需要把知识点拆得过碎：

**模块化是什么、解决什么问题 → 常见模块化方式 → IIFE → CommonJS 的机制 → ESM 的机制 → 第一组区别：导出机制 → 第二组区别：静态与动态加载 → Tree Shaking。**
#### 1. 模块化的本质是分而治之。

把一个复杂程序按照职责拆成多个相对独立的小模块，每个模块负责自己的功能，通过明确的导入和导出把模块组合起来。模块化不是简单地“把一个大文件切成很多小文件”，关键是建立**独立作用域、明确职责边界和显式依赖关系**。

它主要解决三个问题：

- **全局变量污染**：如果大量变量、函数都放在全局作用域，不同代码可能使用相同变量名，产生覆盖、冲突甚至执行错误。模块通过模块作用域把内部变量隔离起来。
- **依赖混乱**：早期多个 `<script>` 之间通常依靠加载顺序维护依赖，例如 B 使用 A，就必须保证 A 先执行。模块系统通过 `require` 或 `import` 显式声明“当前模块依赖谁”，使依赖关系清晰。
- **数据和实现边界问题**：全局数据可以被其他代码任意访问和修改，而模块可以把内部状态保留在内部，只导出必要的函数和数据，从而形成封装边界。这里的“数据安全”主要是代码层面的封装和访问控制，而不是网络安全意义上的安全机制。

因此模块化最终是为了**降低复杂度，提高代码复用性、可维护性、可测试性和团队协作效率**。模块设计通常追求“高内聚、低耦合”：一个模块内部围绕同一类职责组织，而模块之间通过尽量少且明确的接口交互。
#### 2. 前端中的模块化可以体现在不同层次。

功能模块化主要解决逻辑复用，例如把 `formatDate`、校验函数、请求封装、Storage 操作提取到 `utils`、`services` 中；组件化主要解决 UI 和交互复用，例如 Button、Table、Dialog、UserCard，组件化可以理解为模块化思想在 UI 层的具体应用；业务模块化则按照业务领域拆分，例如用户、订单、商品、权限、支付模块。大型项目往往同时存在功能、组件、业务、状态等多个层次的模块化，而不是只能选择一种。
#### 3. 正式模块系统出现以前，常见做法之一是 IIFE。

IIFE 是 Immediately Invoked Function Expression，即立即调用函数表达式。它真正能够减少全局污染的原因，不是“只执行一次”，而是**函数创建了自己的作用域**：

```js
(function () {
  var count = 0

  function add() {
    count++
  }
})()
```

`count` 和 `add` 被限制在函数作用域中，不会直接成为全局变量。MDN 也把“创建新作用域、避免污染全局命名空间”列为 IIFE 的典型用途。([MDN Web Docs](https://developer.mozilla.org/en-US/docs/Glossary/IIFE?utm_source=chatgpt.com))

但 IIFE 只是利用函数作用域模拟模块边界，它没有像 `import/export`、`require/module.exports` 这样的标准导入导出规则，模块之间往往仍需要依赖全局变量、参数传递或者返回对象，因此依赖管理和团队规范仍然不够统一。
#### 4. CommonJS 是 Node.js 原始的模块格式。

当前 Node.js 同时支持 CommonJS 和 ECMAScript Modules，所以不宜再说“Node.js 只有 CommonJS”或“CommonJS 永远是 Node.js 唯一默认规范”。Node.js 官方把 CommonJS 描述为其“original way to package JavaScript code”，也就是 Node.js 最早采用的模块体系。([Node.js](https://nodejs.org/api/modules.html?utm_source=chatgpt.com))

CommonJS 中真正决定当前模块导出内容的是：

```js
module.exports
```

例如：

```js
function add(a, b) {
  return a + b
}

module.exports = {
  add
}
```

导入：

```js
const math = require('./math')
```

`require()` 对 CommonJS 模块返回的就是目标模块导出的内容，也就是它的 `module.exports`。Node.js 官方也将 `require(id)` 的返回值定义为 exported module content。([Node.js](https://nodejs.org/api/modules.html?utm_source=chatgpt.com))

因此可以：

```js
const math = require('./math')
math.add(1, 2)
```

也可以：

```js
const { add } = require('./math')
```

还可以使用 JavaScript 解构重命名：

```js
const { add: myAdd } = require('./math')
```

`exports` 则只是 `module.exports` 的一个快捷引用。模块开始执行时，可以简化理解为：

```js
exports = module.exports
```

所以：

```js
exports.add = add
```

实际上修改的是两者共同指向的那个对象，因此能够正常导出。

但：

```js
exports = {
  add
}
```

只是让局部变量 `exports` 重新指向另一个对象：

```text
原来：

exports ───────┐
               ↓
              {}
               ↑
module.exports ┘

重新赋值后：

exports → 新对象

module.exports → 原对象
```

而最终真正被 `require()` 使用的是 `module.exports`，所以直接重新赋值 `exports` 不能替代 `module.exports`。这与 Node.js 官方对 `exports` shortcut 的描述完全一致。([Node.js](https://nodejs.org/api/modules.html?utm_source=chatgpt.com))

CommonJS 还有一个很重要的内部机制：Node.js 在执行模块代码之前，会将它包装成类似：

```js
(function (
  exports,
  require,
  module,
  __filename,
  __dirname
) {
  // 当前模块代码
})
```

因此 CommonJS 文件顶层定义的 `var`、`let`、`const` 不会直接变成全局变量，同时模块内部才可以直接使用 `module`、`exports`、`require`、`__filename`、`__dirname`。这是 Node.js 官方明确说明的 module wrapper 机制。([Node.js](https://nodejs.org/api/modules.html?utm_source=chatgpt.com))
#### 5. ES Module 是 ECMAScript 官方定义的 JavaScript 模块标准。

Node.js 官方将 ECMAScript Modules 描述为“official standard format to package JavaScript code for reuse”，浏览器也原生支持 `import/export`。([Node.js](https://nodejs.org/api/esm.html?utm_source=chatgpt.com))

ESM 的命名导出可以写成：

```js
export const name = 'Tom'

export function add(a, b) {
  return a + b
}
```

也可以统一导出：

```js
const name = 'Tom'
const age = 18

export {
  name,
  age
}
```

对应的命名导入：

```js
import {
  name,
  age
} from './user.js'
```

命名导入可以重命名：

```js
import {
  name as userName
} from './user.js'
```

默认导出：

```js
export default user
```

对应：

```js
import user from './user.js'
```

默认导入不需要花括号，而且本地名字由导入方决定。

一个模块可以同时拥有默认导出和多个命名导出，例如：

```js
export const name = 'Tom'
export const age = 18

export default user
```

对应：

```js
import user, {
  name,
  age
} from './user.js'
```

还可以：

```js
import * as userModule from './user.js'
```

这里得到的是模块命名空间对象，可以通过：

```js
userModule.name
userModule.age
userModule.default
```

访问对应导出。MDN 官方列出的静态 import 形式就包括 default import、named import 和 namespace import。([MDN Web Docs](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/import?utm_source=chatgpt.com))
#### 6. CommonJS 和 ESM 的第一组核心区别，是导出的关系不同。

这里不建议把 CommonJS 简化成一句“值拷贝”，因为这很容易在对象场景下说错。更准确的官方机制是：

> **CommonJS 的 `require()` 得到目标模块的 `module.exports`；CommonJS 不提供 ESM 那种变量级的 Live Binding。**

例如：

```js
let count = 0

module.exports = {
  count
}

count = 10
```

当执行：

```js
module.exports = {
  count
}
```

时，`module.exports.count` 得到的是当时 `count` 的值 `0`。之后：

```js
count = 10
```

只修改了局部变量 `count`，并没有再次修改：

```js
module.exports.count
```

所以导入方不会自动从 `0` 变成 `10`。

这就是为什么在基本类型场景下，经常口语化地说 CommonJS 得到的是“当时值的快照”。

但是如果导出对象：

```js
const user = {
  name: 'Tom'
}

module.exports = {
  user
}
```

`module.exports.user` 保存的是对象引用：

```text
局部变量 user ───→ 对象 A
                     ↑
module.exports.user ─┘
```

所以：

```js
user.name = 'Jack'
```

修改的是同一个对象 A，导入方自然也能看到：

```text
name = Jack
```

这并不是 Live Binding，而只是因为双方保存的是**同一个对象引用**。

如果：

```js
let user = {
  name: 'Tom'
}

module.exports = {
  user
}

user = {
  name: 'Jack'
}
```

重新赋值之后：

```text
局部 user → 对象 B

module.exports.user → 对象 A
```

导入方仍然拿着对象 A，不会自动跟着局部变量重新绑定。

所以 CommonJS 最准确的总结应该是：

> **它没有把“模块内部原变量”和“导入方”建立持续的变量绑定；`module.exports` 中保存什么，`require()` 就获得什么。基本类型通常表现为当时的值，对象则表现为对象引用。**

ESM 则明确采用 **Live Binding**。MDN 对静态 `import` 的官方定义就是：它导入的是由其他模块导出的 **read-only live bindings**；这些绑定可以被导出模块更新，但不能由导入模块重新赋值。([MDN Web Docs](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/import?utm_source=chatgpt.com))

例如：

```js
// counter.js

export let count = 0

export function add() {
  count++
}
```

导入：

```js
import {
  count,
  add
} from './counter.js'

console.log(count) // 0

add()

console.log(count) // 1
```

导入方不是在第一次 import 时简单永久复制一个 `0`，而是读取 `counter.js` 中 `count` 这个导出绑定当前对应的值。

对象也一样：

```js
export let user = {
  name: 'Tom'
}
```

如果：

```js
user.name = 'Jack'
```

导入方能看到对象内部属性改变。

如果导出模块执行：

```js
user = {
  name: 'Mike'
}
```

因为 `user` 是一个被导出的 `let` 绑定，导入方后续读取到的也是新的对象。

因此这里最严谨的判断标准不是“基本类型还是引用类型”，而是：

> **ESM 导入的是被导出的绑定，只要导出模块更新这个绑定，导入方读取时就能观察到最新值。**

同时导入方不能：

```js
import { count } from './counter.js'

count = 100
```

因为 imported binding 对导入模块是只读的。
#### 7. CommonJS 和 ESM 的第二组核心区别，是依赖的确定方式不同。

CommonJS 的：

```js
require()
```

是运行时调用，因此可以写：

```js
if (condition) {
  const moduleA = require('./a')
} else {
  const moduleB = require('./b')
}
```

也可以：

```js
const path =
  condition ? './a' : './b'

const module = require(path)
```

因此最终加载哪个模块可以根据运行时状态决定：

```text
运行程序
   ↓
判断 condition
   ↓
执行 require()
   ↓
确定真正加载哪个模块
```

所以通常说：

> **CommonJS 的依赖关系更偏运行时确定，`require()` 具有动态调用能力。**

传统 CommonJS 的 `require()` 又是同步接口：

```js
const user = require('./user')

console.log(user)
```

当前执行流程需要先完成模块解析、加载和执行，得到导出结果后，才继续执行下面的 `console.log`。这里说“同步”或者“当前执行流程会等待”比笼统说“它会阻塞所有线程”更加准确。

ESM 的静态 import 则完全不同：

```js
import {
  getUser
} from './user.js'
```

这条语句具有固定的语法结构。MDN 明确说明，`import` 声明被设计得非常严格，只能位于模块顶层，这使模块能够在真正执行之前进行静态分析和链接。([MDN Web Docs](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/import?utm_source=chatgpt.com))

因此运行代码之前就能知道：

```text
当前模块
   ↓
依赖 ./user.js
   ↓
使用 getUser
```

多个模块进一步组成：

```text
A
├── B
│   └── D
└── C
```

这样的模块依赖图。

这里需要纠正一个常见表述：

> 静态 `import` 要求的是**模块顶层**，不等于必须机械地写在“文件第一行”。

例如：

```js
if (condition) {
  import { user } from './user.js'
}
```

不合法，因为它位于 `if` 块内部；但静态 import 声明本身具有提升行为，MDN 也指出通常把它们集中写在代码顶部主要是为了提高依赖可读性。([MDN Web Docs](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Errors/import_decl_module_top_level?utm_source=chatgpt.com))

ESM 同样支持真正的动态导入：

```js
import('./user.js')
```

它和：

```js
import user from './user.js'
```

不是同一种语法。

静态 import：

```text
import ... from ...
→ 模块顶层
→ 依赖关系提前确定
→ 模块加载阶段处理
```

动态 import：

```text
import(...)
→ 是表达式
→ 可以运行时执行
→ 可以用于条件加载
→ 返回 Promise
```

例如：

```js
if (condition) {
  const module =
    await import('./user.js')
}
```

MDN 明确说明 `import()` 是异步、动态加载 ESM 的语法，并返回一个 Promise，成功时 Promise 的值是模块命名空间对象。([MDN Web Docs](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/import?utm_source=chatgpt.com))

因此它很适合：

```text
路由懒加载、按需加载、代码分割、某个功能真正使用时再加载
```
#### 8. ESM 的静态结构也是它更适合 Tree Shaking 的关键原因。

比如：

```js
// utils.js

export function add() {}

export function minus() {}

export function multiply() {}
```

业务代码只写：

```js
import {
  add
} from './utils.js'
```

因为 ESM 的 `import/export` 能够静态分析，构建工具可以在运行之前知道：

```text
add
→ 被引用

minus
→ 没有被引用

multiply
→ 没有被引用
```

于是生产构建中就有机会移除没有真正使用的导出。webpack 官方将 Tree Shaking 定义为依赖 ES2015 `import/export` 静态结构的 Dead Code Elimination；Rollup 也明确说明它会静态分析导入代码并排除未使用部分。([Rollup](https://rollupjs.org/introduction/?utm_source=chatgpt.com))

所以完整逻辑是：

```text
ESM 静态 import / export
        ↓
模块依赖可以静态分析
        ↓
建立模块依赖图
        ↓
判断哪些 export 真正被使用
        ↓
构建阶段移除无用代码
        ↓
Tree Shaking
```

---

### 标准回答

JavaScript 模块化本质上是一种**分而治之**的代码组织方式：把一个复杂程序按照职责拆分成多个相对独立的模块，每个模块负责自己的功能，再通过明确的导入和导出把这些模块组合起来。它并不只是把一个大文件拆成很多小文件，真正重要的是建立独立作用域、明确职责边界和显式依赖关系。

模块化主要解决三个问题。第一个是全局变量污染。如果大量变量和函数都定义在全局作用域中，不同文件出现同名变量时可能发生覆盖和冲突。模块化通过模块作用域将内部变量隔离起来，从而减少不同模块之间的变量污染。第二个是依赖混乱。在早期通过多个 `script` 标签组织代码时，如果 B 依赖 A，就必须人工保证 A 先于 B 加载和执行；模块化通过 `require` 或 `import` 显式声明依赖，使“当前代码依赖谁”直接体现在代码中。第三个是数据和实现边界问题。全局变量可以被其他代码任意访问和修改，而模块可以把内部数据隐藏在自己的作用域中，只暴露必要的接口，从而形成更明确的封装边界。

因此模块化最终是为了降低系统复杂度，提高代码复用性、可维护性、可测试性以及团队协作效率。模块设计通常强调高内聚、低耦合：模块内部尽量围绕同一类职责组织，模块之间尽量通过少量、稳定、明确的接口交互。

在前端项目中，模块化又可以体现在不同层次。把日期格式化、请求封装、校验函数等公共逻辑提取到 `utils`、`services` 中，属于功能模块化，主要解决逻辑复用；把 Button、Table、Dialog 等 UI 和交互逻辑封装成 Vue 或 React 组件属于组件化，组件化可以理解为模块化思想在 UI 层的具体应用；按照用户、订单、商品、权限等业务领域进行拆分，则属于业务模块化。实际大型项目通常同时存在这些不同层次的模块。

在正式模块规范出现以前，JavaScript 经常通过 IIFE，也就是立即调用函数表达式，解决一部分作用域隔离问题。IIFE 定义后立即执行，但它能够避免全局变量污染的真正原因是**函数会创建自己的作用域**。函数内部定义的变量不会直接进入全局命名空间。IIFE 因此可以模拟模块的私有变量，但是它没有标准化的导入导出语法，模块之间通常仍依赖全局变量、参数或返回对象传递能力，所以还不能提供完整统一的模块依赖管理。MDN 也将“创建作用域、避免污染全局命名空间”列为 IIFE 的典型用途。([MDN Web Docs](https://developer.mozilla.org/en-US/docs/Glossary/IIFE?utm_source=chatgpt.com))

CommonJS 是 Node.js 最早采用的模块体系之一，当前 Node.js 已经同时支持 CommonJS 和 ECMAScript Modules。CommonJS 中真正控制模块导出内容的是 `module.exports`，而 `require()` 用于加载模块并得到其导出的内容。([Node.js](https://nodejs.org/api/modules.html?utm_source=chatgpt.com))

例如：

```js
function add(a, b) {
  return a + b
}

module.exports = {
  add
}
```

导入：

```js
const math = require('./math')
```

或者：

```js
const { add } = require('./math')
```

`exports` 只是 `module.exports` 的快捷引用。初始化时可以理解为两者指向同一个对象，所以：

```js
exports.add = add
```

实际上修改的仍然是 `module.exports` 对应的那个对象。但是：

```js
exports = {
  add
}
```

只是让局部变量 `exports` 重新指向另一个对象，并没有替换 `module.exports`，所以不能用这种方式替换最终导出内容。Node.js 官方也明确说明 `exports` 是 `module.exports` 的 shortcut，而重新赋值 `exports` 只会重新绑定这个局部变量。([Node.js](https://nodejs.org/api/modules.html?utm_source=chatgpt.com))

CommonJS 模块还有一个重要的内部实现：Node.js 在执行模块之前，会把代码包装成类似：

```js
(function (
  exports,
  require,
  module,
  __filename,
  __dirname
) {
  // 模块代码
})
```

因此模块中的顶层变量被限制在当前模块作用域中，而 `module`、`exports`、`require`、`__filename` 和 `__dirname` 则由 Node.js 作为模块包装器参数提供。([Node.js](https://nodejs.org/api/modules.html?utm_source=chatgpt.com))

ES Module，简称 ESM，是 ECMAScript 官方定义的 JavaScript 模块标准，浏览器原生支持，Node.js 也完整支持。([Node.js](https://nodejs.org/api/esm.html?utm_source=chatgpt.com)) 它主要使用 `export` 和 `import`。

命名导出：

```js
export const name = 'Tom'
export const age = 18
```

对应：

```js
import {
  name,
  age
} from './user.js'
```

可以重命名：

```js
import {
  name as userName
} from './user.js'
```

默认导出：

```js
export default user
```

对应：

```js
import user from './user.js'
```

一个模块可以同时存在默认导出和多个命名导出，还可以：

```js
import * as userModule from './user.js'
```

把模块导出的内容作为模块命名空间对象访问。([MDN Web Docs](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/import?utm_source=chatgpt.com))

CommonJS 和 ESM 第一组最核心的区别是**导出机制不同**。

这里不应该简单说“CommonJS 就是值拷贝”，更准确地说，CommonJS 的 `require()` 得到的是目标模块的 `module.exports`，它不会像 ESM 一样为局部原变量建立 Live Binding。

例如：

```js
let count = 0

module.exports = {
  count
}

count = 10
```

把 `count` 放入 `module.exports` 时，`module.exports.count` 得到的是当时的基本类型值 `0`。之后重新修改局部变量 `count`，并不会自动修改 `module.exports.count`，所以导入方不会自动同步。

如果导出的是对象：

```js
const user = {
  name: 'Tom'
}

module.exports = {
  user
}
```

`module.exports.user` 保存的是对象引用，因此模块内部：

```js
user.name = 'Jack'
```

修改的是双方共同指向的同一个对象，所以导入方可以看到属性变化。

但是如果模块内部重新执行：

```js
user = {
  name: 'Mike'
}
```

那么只是局部变量 `user` 改成指向另一个对象，原来的 `module.exports.user` 仍然指向旧对象，因此导入方不会自动跟随重新绑定。

所以 CommonJS 应该理解为：

> **`module.exports` 中保存什么，`require()` 就获得什么；它没有 ESM 那种变量级 Live Binding。基本类型通常表现为当时的值，对象则表现为对象引用。**

ESM 则明确采用 Live Binding。MDN 对静态 `import` 的定义就是导入其他模块导出的只读 Live Binding：导出模块可以更新这个绑定，而导入模块不能自己重新赋值。([MDN Web Docs](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/import?utm_source=chatgpt.com))

例如：

```js
export let count = 0

export function add() {
  count++
}
```

导入：

```js
import {
  count,
  add
} from './counter.js'

console.log(count) // 0

add()

console.log(count) // 1
```

导入方读取的是 `count` 这个导出绑定当前对应的值。

对于对象：

```js
export let user = {
  name: 'Tom'
}
```

修改：

```js
user.name = 'Jack'
```

导入方可以看到对象内容变化；如果导出模块进一步执行：

```js
user = {
  name: 'Mike'
}
```

由于被导出的 `user` 绑定本身重新指向了新对象，导入方之后读取到的也是这个新对象。

因此 ESM 中真正的判断标准不是“基本类型还是引用类型”，而是：

> **导入方持有对导出绑定的 Live Binding，导出模块更新这个绑定后，导入方能够读取到最新值。**

CommonJS 和 ESM 第二组核心区别是**依赖关系的确定方式不同**。

CommonJS 的 `require()` 是运行时调用，所以可以：

```js
if (condition) {
  const a = require('./a')
}
```

甚至：

```js
const path =
  condition ? './a' : './b'

const module = require(path)
```

也就是说最终加载哪个模块可以根据程序运行状态决定，因此 CommonJS 的依赖更偏运行时动态确定。传统 CommonJS 的 `require()` 又是同步接口，当前 JavaScript 执行流程需要先完成模块加载并得到导出结果，才能继续执行后面的代码。

ESM 的静态：

```js
import {
  getUser
} from './user.js'
```

则具有固定的语法结构。静态 `import` 必须出现在模块顶层，不能嵌套到 `if`、函数、循环等运行时结构中。这里的“顶层”并不意味着一定要写在文件第一行，而是不能位于其他语句块内部。MDN 明确指出，这种语法上的严格性使模块可以在执行之前进行静态分析和链接。([MDN Web Docs](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Errors/import_decl_module_top_level?utm_source=chatgpt.com))

因此构建工具可以提前得到：

```text
当前模块
→ 依赖哪些模块
→ 从这些模块使用哪些导出
```

然后进一步建立整个项目的模块依赖图。

ESM 并不是不能动态导入。如果确实需要根据条件、路由或者用户行为按需加载模块，可以使用：

```js
import('./user.js')
```

动态 `import()` 是运行时执行的表达式，可以出现在条件语句或函数中，并且返回 Promise：

```js
const module =
  await import('./user.js')
```

因此：

```text
静态 import
→ 顶层声明
→ 依赖提前确定
→ 适合普通模块依赖

动态 import()
→ 运行时执行
→ 异步并返回 Promise
→ 适合条件加载、路由懒加载、按需加载和代码分割
```

MDN 和 Node.js 官方都明确把 `import()` 描述为异步的动态模块加载机制。([MDN Web Docs](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/import?utm_source=chatgpt.com))

最后，ESM 的静态结构也是它更适合 Tree Shaking 的原因。因为构建工具在真正执行代码之前就能分析 `import/export`，知道模块导出了哪些内容以及业务代码真正使用了哪些导出，因此可以在生产构建过程中删除没有被使用的代码。webpack 官方明确指出 Tree Shaking 依赖 ES2015 `import/export` 的静态结构，Rollup 也通过静态分析移除未使用内容。([Rollup](https://rollupjs.org/introduction/?utm_source=chatgpt.com))

所以这一题最终应该形成一条完整的知识链：

**模块化首先通过作用域隔离、显式依赖和接口暴露解决全局污染、依赖混乱和封装问题；IIFE 是正式模块规范之前利用函数作用域实现隔离的早期方式；CommonJS 使用 `module.exports/exports + require()`，Node.js 通过模块包装函数实现模块作用域；ESM 使用 `export/import`，是 JavaScript 官方模块标准。两者最核心的区别，一是 CommonJS 的 `require()` 获得 `module.exports`，没有 ESM 的变量级 Live Binding，而 ESM 导入的是只读的 Live Binding；二是 CommonJS 的 `require()` 可以在运行时动态决定依赖并且传统接口是同步的，而 ESM 的静态 `import/export` 在执行前即可分析和链接，需要运行时动态加载时使用异步的 `import()`。也正因为 ESM 的静态可分析性，它更适合 Tree Shaking。**

---

**Sources:**

- [IIFE - Glossary | MDN](https://developer.mozilla.org/en-US/docs/Glossary/IIFE?utm_source=chatgpt.com)
- [Modules: CommonJS modules | Node.js v26.7.0 Documentation](https://nodejs.org/api/modules.html?utm_source=chatgpt.com)
- [Introduction - Rollup.js](https://rollupjs.org/introduction/?utm_source=chatgpt.com)

## 第42题 Babel 是做什么的？为什么前端项目需要 Babel？

### 题目

Babel 是什么？它主要解决前端开发中的什么问题？

请说明 Babel 在**现代 JavaScript 语法转换、JSX/TypeScript 处理、运行时 API 兼容、AST 转换、Plugin/Preset 配置以及目标环境适配**中的作用，并说明 Babel 和 Webpack、Vite 这类构建工具之间的边界。

---

### 问题

1. Babel 是什么？为什么说它本质上是一个 JavaScript 编译器？
2. 浏览器本身能够执行 JavaScript，为什么前端项目还可能需要 Babel？
3. Babel 所说的“语法转换”是什么？箭头函数、可选链等新语法是怎么处理的？
4. Babel 能不能直接解决所有 JavaScript 兼容性问题？为什么要区分**语法兼容**和**运行时 API 兼容**？
5. `Promise`、`Map`、`Set`、`Array.from` 这类能力为什么通常不能只靠语法转换解决？Polyfill 和 `core-js` 是什么作用？
6. Babel 能不能处理 JSX 和 TypeScript？处理 TypeScript 是否等于进行了类型检查？
7. Babel 转换一段代码时，整体为什么可以概括成 **Parse → Transform → Generate**？AST 在其中起什么作用？
8. Babel 的 Plugin 和 Preset 分别是什么？两者是什么关系？
9. `@babel/preset-env` 是做什么的？`targets` / Browserslist 为什么会影响 Babel 最终做哪些转换？
10. Babel 是不是打包工具？它和 Webpack、Vite 的职责边界是什么？

---

### 回答要点

建议按照：

**Babel 是什么 → 为什么需要 → 语法转换与 API 兼容 → JSX/TS → AST 工作流程 → Plugin/Preset → preset-env → Babel 与构建工具的边界**

这条逻辑回答。
#### 1. Babel 的核心定位

Babel 官方对自己的定义非常直接：

> **Babel is a JavaScript compiler。**

它主要把较新的 JavaScript 代码转换成目标运行环境能够理解的 JavaScript，同时还可以通过第三方 Polyfill 方案补充目标环境缺少的能力。([Babel](https://babeljs.io/docs/?utm_source=chatgpt.com))

所以 Babel 最核心解决的是：

```text
开发时希望使用现代 JavaScript
          ↓
目标浏览器 / Node 环境不一定全部支持
          ↓
Babel 根据目标环境进行代码转换
          ↓
输出目标环境可以运行的 JavaScript
```

例如开发时写：

```js
const add = (a, b) => a + b
```

对于不支持箭头函数的目标环境，可以转换成类似：

```js
var add = function (a, b) {
  return a + b
}
```

这就是最典型的**语法转换**。Babel 官方首页也直接用箭头函数到普通函数的转换作为示例。([Babel](https://babeljs.io/docs/?utm_source=chatgpt.com))

不过要注意：**现代前端项目并不是一定必须手动使用 Babel。** 如果目标环境本身已经支持所使用的语法，或者 Vite、SWC、esbuild 等工具已经承担了对应转换，就不一定需要额外接入 Babel。Babel 是解决代码转换问题的一种成熟工具链，而不是所有项目必须存在的一层。

---
#### 2. Babel 最重要的是区分“语法兼容”和“API 兼容”

这是这一题最容易答混的地方。

第一类是**语法问题**。

例如：

```js
const add = (a, b) => a + b

const name = user?.profile?.name

const result = value ?? 'default'
```

如果目标环境不能识别这些语法，Babel 可以通过对应的 transform plugin 将源码改写为目标环境能够解析、执行的形式。

也就是说：

```text
新语法
↓
Babel 改写代码结构
↓
旧环境能够执行的语法
```

这是 Babel 最典型的工作。

但第二类问题不是“语法”，而是**运行环境根本没有某个 API**。

例如：

```js
new Promise(...)

new Map()

new Set()

Array.from(...)
```

假设某个旧浏览器根本没有：

```js
window.Promise
```

那么单纯把代码：

```js
new Promise(...)
```

换一种写法，并不能凭空让这个浏览器拥有 Promise 的实现。

所以：

```text
语法不认识
→ Transform

环境里没有这个 API
→ Polyfill
```

Babel 官方明确说明，它能够进行 syntax transform；缺少的运行时特性则需要借助 `core-js` 等第三方 Polyfill。([Babel](https://babeljs.io/docs/?utm_source=chatgpt.com))

因此面试时不要说：

> Babel 可以把所有新 JavaScript 都转换成旧浏览器支持的代码。

更准确的是：

> **Babel 可以进行语法转换；对于目标环境缺失的内置对象和 API，通常还需要 Polyfill。**

---
#### 3. Polyfill 和 core-js 是什么关系？

Polyfill 可以理解为：

> **在运行环境原本没有某项标准能力时，用 JavaScript 提供一份兼容实现。**

比如目标浏览器没有 Promise，就需要给运行环境补充 Promise 实现。

`core-js` 是 JavaScript 生态中常见的标准库 Polyfill 实现，Babel 可以根据目标环境与配置配合相关 Polyfill 工具注入所需要的能力。Babel 的 `preset-env` 会根据目标环境支持情况建立语法转换、浏览器能力以及 `core-js` Polyfill 之间的映射。([Babel](https://babeljs.io/docs/babel-preset-env/?utm_source=chatgpt.com))

可以把关系简单理解成：

```text
Babel
→ 判断 / 转换代码

core-js 等 Polyfill
→ 真正提供环境缺失的 API 实现
```

这里还有一个版本细节需要注意：很多旧教程会介绍 Babel 7 中：

```js
useBuiltIns
corejs
```

与 `@babel/preset-env` 配合的方式；当前 Babel 8 官方文档已经说明，这两个 `preset-env` 选项被移除，Polyfill 注入推荐使用专门的 polyfill plugin，例如 `babel-plugin-polyfill-corejs3`。因此理解机制比死背旧配置更重要。([Babel](https://babeljs.io/docs/babel-preset-env/?utm_source=chatgpt.com))

---
#### 4. Babel 还可以处理 JSX 和 TypeScript

Babel 不只转换 ECMAScript 新语法。

例如 React 中写：

```jsx
const element = <div>Hello</div>
```

浏览器的 JavaScript 引擎不能直接把 JSX 当普通 JavaScript 执行，因此可以通过 `@babel/preset-react` 中的 JSX transform 将其转换成普通 JavaScript 调用。当前 React automatic runtime 下，会转换为对应 `jsx` runtime 调用。([Babel](https://babeljs.io/docs/babel-preset-react/?utm_source=chatgpt.com))

TypeScript 也可以：

```ts
const count: number = 10
```

通过：

```text
@babel/preset-typescript
```

处理成：

```js
const count = 10
```

也就是把类型语法去掉。([Babel](https://babeljs.io/docs/babel-preset-typescript/?utm_source=chatgpt.com))

但这里必须注意：

> **Babel 可以转换 TypeScript 语法，不等于 Babel 会做 TypeScript 类型检查。**

Babel 官方明确说明，它可以移除 TypeScript 类型标注，但不负责 type checking；真正的类型检查仍需要 TypeScript 等工具完成。([Babel](https://babeljs.io/docs/?utm_source=chatgpt.com))

所以：

```text
Babel + TypeScript
→ 可以把 TS 代码转换成 JS

tsc / TypeScript Language Service
→ 负责类型检查
```

两件事情不要混淆。

---
#### 5. Babel 的基本工作原理：Parse → Transform → Generate

理解 Babel，核心要理解 AST。

假设源代码：

```js
const add = (a, b) => a + b
```

Babel 并不是简单做字符串替换：

```text
看到 =>
→ 换成 function
```

真正的过程可以抽象为：

```text
源代码
  ↓
Parse
  ↓
AST
  ↓
Transform
  ↓
新的 AST
  ↓
Generate
  ↓
新的 JavaScript 代码
```

首先是 **Parse**。

`@babel/parser` 会把 JavaScript 源码解析成 AST，也就是：

> **Abstract Syntax Tree，抽象语法树。**

Babel 官方 parser 的输出就是 Babel AST。([Babel](https://babeljs.io/docs/babel-parser?utm_source=chatgpt.com))

例如：

```js
const age = 18
```

不会再被 Babel 单纯理解成字符串，而会形成类似：

```text
VariableDeclaration
└── VariableDeclarator
    ├── Identifier(age)
    └── NumericLiteral(18)
```

这样的结构化语法树。

然后进入 **Transform**。

Babel 会遍历 AST：

```text
AST
↓
找到目标节点
↓
Plugin 对节点进行处理
↓
替换 / 修改 / 删除 AST 节点
```

`@babel/traverse` 官方文档就展示了对 AST 节点进行遍历和修改的能力。([Babel](https://babeljs.io/docs/babel-traverse?utm_source=chatgpt.com))

例如：

```text
ArrowFunctionExpression
```

经过转换插件之后，可能被转换为：

```text
FunctionExpression
```

最后进入 **Generate**。

`@babel/generator` 的职责就是：

> **把 Babel AST 再生成 JavaScript 代码。**

Babel 官方对此直接定义为 “Turns Babel AST into code”。([Babel](https://babeljs.io/docs/babel-generator/?utm_source=chatgpt.com))

所以 Babel 最核心的编译过程就是：

```text
源码
→ AST
→ 修改 AST
→ 新源码
```

---
#### 6. Plugin 和 Preset 是什么？

Babel 真正完成各种代码转换的核心是 **Plugin**。

例如某个 Plugin 可以负责：

```text
箭头函数转换、JSX 转换、TypeScript 语法转换、某种 Proposal 语法转换
```

Babel 官方说明，代码转换能力是通过配置 Plugin 或 Preset 来启用的。([Babel](https://babeljs.io/docs/plugins/?utm_source=chatgpt.com))

因此 Plugin 可以理解成：

> **一个具体的 Babel 转换规则或扩展能力。**

但一个现代项目可能需要几十个转换规则。

如果用户需要自己写：

```json
{
  "plugins": [
    "插件1",
    "插件2",
    "插件3",
    "插件4",
    "插件5"
  ]
}
```

配置会非常复杂。

所以 Babel 提供了 **Preset**。

Preset 本质上就是：

> **一组可以共享和复用的 Babel Plugins 和相关配置的集合。**

这是 Babel 官方对 Preset 的定义。([Babel](https://babeljs.io/docs/presets/?utm_source=chatgpt.com))

所以可以记：

```text
Plugin
→ 一个具体转换能力

Preset
→ 一组 Plugin / 配置的集合
```

例如：

```text
@babel/preset-env
→ ECMAScript 环境适配

@babel/preset-react
→ React / JSX

@babel/preset-typescript
→ TypeScript
```

这些都是 Babel 官方提供的 Preset。([Babel](https://babeljs.io/docs/presets/?utm_source=chatgpt.com))

---
#### 7. `@babel/preset-env` 是做什么的？

`@babel/preset-env` 最重要的作用不是：

> “把所有新语法全部转成 ES5。”

而是：

> **根据你的目标运行环境，决定究竟需要哪些转换。**

例如你的项目只支持最新 Chrome：

```text
Chrome 最新版本
```

很多现代语法本身已经支持，就没有必要全部降级。

但如果要求支持更老的浏览器：

```text
Chrome 旧版本、Safari 旧版本、……
```

需要进行的转换就会增加。

所以：

```text
targets / Browserslist
        ↓
目标浏览器范围
        ↓
preset-env 查询兼容性数据
        ↓
决定需要哪些 Babel transform
```

Babel 官方说明，`preset-env` 会结合 Browserslist、兼容性数据以及目标环境，计算所需要的一组转换插件。([Babel](https://babeljs.io/docs/babel-preset-env/?utm_source=chatgpt.com))

例如可以通过 Browserslist 表达：

```text
> 0.25%
not dead
```

然后 Babel 根据这些目标决定哪些语法需要转换。

因此：

> **Babel 不是简单地“越旧越好”，而应该围绕项目真正需要支持的目标环境进行转换。**

这样既保证兼容性，也避免生成大量没有必要的降级代码。

---
#### 8. Babel 和 Webpack / Vite 的关系

最后一定要把 Babel 的边界讲清楚。

Babel **不是一个完整的模块打包工具**。

例如项目：

```text
main.js
├── user.js
├── order.js
├── style.css
├── logo.png
└── lodash
```

Webpack 这类构建工具会关心：

```text
入口是什么？、模块之间怎么依赖？、需要生成几个 chunk？、CSS 怎么处理？、图片怎么处理？、资源怎么输出？、如何代码分割？、最终 dist 是什么？
```

而 Babel 更关注：

```text
这一份 JavaScript / JSX / TS 源代码
↓
需要进行什么语法转换
↓
输出什么 JavaScript
```

所以：

```text
Babel
→ 编译 / 转换代码

Webpack
→ 构建模块依赖图、处理各种资源并打包

Vite
→ 提供开发服务器和完整构建工具链
```

Babel 官方也明确建议，在生产项目中通常让 Webpack、Rollup、Parcel 等构建系统集成 Babel，而不是在浏览器里直接运行 Babel。([Babel](https://babeljs.io/docs/babel-standalone/?utm_source=chatgpt.com))

它们之间可以形成：

```text
Webpack
    ↓
发现某个 JS 文件
    ↓
交给 Babel 转换
    ↓
得到转换后的 JS
    ↓
Webpack 继续完成依赖分析、打包和输出
```

所以两者不是竞争关系。

更加准确地说：

> **Babel 解决“代码怎么转换”，Webpack/Vite 解决“整个项目怎么开发、组织、构建和输出”。**

---

### 标准回答

Babel 本质上是一个 **JavaScript 编译器和代码转换工具链**。它主要解决的问题是：我们在开发阶段希望使用现代 JavaScript、JSX、TypeScript 等语法，但是最终代码运行的浏览器或者其他 JavaScript 环境不一定全部支持这些写法，因此需要在代码真正运行之前进行一次转换。Babel 官方也把自己的核心定位定义为 JavaScript compiler，主要用于把现代 ECMAScript 代码转换为目标环境能够执行的 JavaScript。([Babel](https://babeljs.io/docs/?utm_source=chatgpt.com))

Babel 最基础的能力是**语法转换**。比如开发时使用箭头函数：

```js
const add = (a, b) => a + b
```

如果目标环境不支持箭头函数，Babel 可以通过对应的转换插件生成兼容性更高的普通函数形式。类似的现代 JavaScript 语法，也可以根据目标环境决定是否需要转换。

但是这里需要区分两个不同的兼容性问题：**语法兼容和运行时 API 兼容**。

像箭头函数这类问题属于语法兼容，因为旧浏览器只是无法解析这种代码结构，所以 Babel 可以通过改写语法解决。但是 `Promise`、`Map`、`Set`、`Array.from` 等属于运行时提供的内置对象或 API。如果目标浏览器本身根本没有 `Promise`，简单修改语法无法凭空产生 Promise 实现，因此还需要 Polyfill。Babel 可以根据配置配合 `core-js` 等第三方 Polyfill 方案，为目标环境补充缺失的标准能力。([Babel](https://babeljs.io/docs/?utm_source=chatgpt.com))

因此这两个概念一定要分开：

```text
语法不支持
→ Babel Transform

运行环境缺少 API
→ Polyfill
```

除了 ECMAScript 新语法以外，Babel 还可以处理 JSX 和 TypeScript。React 中的 JSX 可以通过 `@babel/preset-react` 转换成普通 JavaScript runtime 调用；TypeScript 可以通过 `@babel/preset-typescript` 去除类型语法并输出 JavaScript。([Babel](https://babeljs.io/docs/babel-preset-react/?utm_source=chatgpt.com))

但 Babel 处理 TypeScript 并不代表进行了类型检查。比如：

```ts
const count: number = 10
```

Babel 可以转换成：

```js
const count = 10
```

但不会像 TypeScript 编译器那样完整检查变量类型是否正确。Babel 官方明确说明，它可以移除 TypeScript 类型标注，但类型检查仍需要 TypeScript 等工具完成。([Babel](https://babeljs.io/docs/?utm_source=chatgpt.com))

Babel 内部的基本工作流程可以概括成：

```text
Parse
→ Transform
→ Generate
```

首先 Babel Parser 把源代码解析成 AST，也就是抽象语法树。AST 把代码从普通文本转换成结构化的语法节点。然后 Babel 根据配置的 Plugin 遍历和修改 AST，例如把某种新的语法节点转换成兼容性更好的节点。最后 Babel Generator 再根据修改后的 AST 生成新的 JavaScript 源码。Babel 官方分别提供 `@babel/parser`、`@babel/traverse` 和 `@babel/generator` 来完成这些 AST 相关能力。([Babel](https://babeljs.io/docs/babel-parser?utm_source=chatgpt.com))

因此 Babel 并不是简单做字符串替换，而更接近：

```text
JavaScript
↓
AST
↓
Plugin 修改 AST
↓
新的 AST
↓
新的 JavaScript
```

Babel 中真正承担具体转换工作的主要是 **Plugin**。一个 Plugin 可以负责一种具体的语法或者代码转换能力，例如 JSX 转换等。([Babel](https://babeljs.io/docs/plugins/?utm_source=chatgpt.com))

但是实际项目需要的转换规则很多，如果每个项目都自己维护大量 Plugin，会非常麻烦，所以 Babel 又提供了 **Preset**。Preset 可以理解为一组预先组织好的 Plugins 和配置。Babel 官方目前提供的常见 Preset 包括 `@babel/preset-env`、`@babel/preset-react` 和 `@babel/preset-typescript`。([Babel](https://babeljs.io/docs/presets/?utm_source=chatgpt.com))

所以二者关系可以记成：

```text
Plugin
→ 单个具体转换能力

Preset
→ 一组 Plugin / 配置的集合
```

其中非常重要的是 `@babel/preset-env`。它并不是无脑把所有代码都转换成最老的 JavaScript，而是会根据项目配置的目标运行环境，结合 Browserslist 和兼容性数据，判断哪些语法需要转换，然后选择对应的 transform plugins。([Babel](https://babeljs.io/docs/babel-preset-env/?utm_source=chatgpt.com))

所以整体关系是：

```text
targets / Browserslist
↓
告诉 Babel 项目需要支持哪些环境
↓
preset-env 判断这些环境支持哪些能力
↓
只选择需要的转换
```

这样可以在兼容性和产物体积之间取得更合理的平衡。

最后还需要区分 **Babel 和 Webpack、Vite**。

Babel 不是完整的打包工具，它主要关注的是：

> **一份源代码应该怎样转换成另一份 JavaScript。**

Webpack 这类工具则需要从项目入口出发处理模块之间的依赖关系，并进一步处理 JavaScript、CSS、图片、字体等资源，最终生成 Bundle、Chunk 和可部署的静态产物。Vite 则进一步提供开发服务器以及生产构建等完整的工程化能力。

因此：

```text
Babel
→ 代码编译与转换

Webpack / Vite
→ 项目级开发和构建体系
```

实际项目中它们可以配合，例如 Webpack 发现一个 JavaScript 模块之后，可以把它交给 Babel 转换，再继续参与后续模块打包。Babel 官方也推荐生产应用通常通过 Webpack、Rollup 等构建系统在构建阶段完成 Babel 转换，而不是在浏览器运行时直接编译。([Babel](https://babeljs.io/docs/babel-standalone/?utm_source=chatgpt.com))

所以这一题最终应该形成这样的完整认识：

> **Babel 是 JavaScript 编译转换工具，核心解决现代代码和目标运行环境之间的兼容问题。它通过 Parse → AST → Transform → Generate 的过程修改代码，其中 Plugin 提供具体转换能力，Preset 是一组 Plugin 和配置的集合，`preset-env` 根据 targets/Browserslist 决定真正需要进行哪些转换。语法兼容主要依靠 Babel transform，而 Promise、Map 等运行时 API 缺失需要 Polyfill；Babel 可以处理 JSX、TypeScript 语法，但不负责 TypeScript 类型检查。最后，Babel 解决的是“代码怎么转换”，Webpack、Vite 解决的是“整个项目怎么构建”，两者职责不同但可以组合使用。**

---

**Sources:**

- [What is Babel? · Babel](https://babeljs.io/docs/?utm_source=chatgpt.com)

## 第43题 前端打包工具的基本构建流程是什么？代码拆分和代码优化分别做什么？

### 题目

前端打包工具在执行生产构建时，整体会经历怎样的流程？

重点说明：

- 如何从入口出发建立模块依赖图；
- 为什么需要进行代码拆分，最终形成多个 Chunk；
- 多入口、公共模块、第三方依赖和动态 `import()` 分别如何影响代码拆分；
- 代码拆分和懒加载是什么关系；
- Tree Shaking 和代码压缩分别解决什么问题；
- 最终如何生成 Bundle 和静态资源并输出到构建目录。

这一题先掌握**现代模块打包工具的通用构建思想**，暂时不讨论 Webpack 的 Loader、Plugin，也不展开 Vite 的具体实现。

---

### 问题

1. 什么是前端打包？为什么现代前端项目需要打包工具？
2. 一个前端项目执行生产构建时，整体流程可以分成哪些主要阶段？
3. 打包工具为什么需要入口？它是如何从入口递归分析依赖并建立 Dependency Graph 的？
4. 建立依赖图时，打包工具主要分析哪些依赖关系？`import`、动态 `import()`、资源引用分别起什么作用？
5. 什么是代码拆分（Code Splitting）？它和把代码生成多个 Chunk 是什么关系？
6. Chunk、Bundle、Bundler 三个概念分别是什么？
7. 常见的代码拆分依据有哪些？多入口、公共模块、第三方依赖、动态 `import()` 分别属于什么情况？
8. 公共模块为什么可能被抽取成独立 Chunk？第三方依赖为什么经常会被单独拆分？
9. 动态 `import()` 为什么经常会形成一个异步 Chunk？
10. 代码拆分和懒加载是什么关系？有代码拆分是否就一定等于懒加载？
11. 代码拆分的主要目标是什么？它会不会直接减少整个项目的总代码量？
12. 什么是 Tree Shaking？它主要删除什么代码？
13. Tree Shaking 为什么特别依赖 ES Module 的静态结构？
14. Tree Shaking 和代码压缩是不是一回事？
15. 代码压缩（Minification）具体做了什么？为什么还能继续减小 Bundle 体积？
16. Tree Shaking 和代码压缩在构建过程中是什么关系？
17. 打包工具完成依赖分析、拆分和优化以后，最终会生成什么？
18. 为什么经常看到构建产物放在 `dist` 目录？`dist` 是不是所有工具强制规定的？
19. “依赖图 → Chunk → 优化 → Bundle 输出”是不是所有打包工具完全相同的内部执行顺序？
20. Webpack、Rollup、Vite 等工具是否都可以用这套流程理解？

---

### 回答要点

这一题建议只记住一条主线：

```text
确定入口
   ↓
解析模块
   ↓
递归分析依赖
   ↓
建立 Dependency Graph
   ↓
模块转换
   ↓
代码拆分 / Chunk 划分
   ↓
Tree Shaking 等无用代码消除
   ↓
Minification 代码压缩
   ↓
生成 Bundle / Chunk / Asset
   ↓
输出到 dist 等目录
```

但要注意：

> **这是理解打包过程的概念流程，不是说所有 Bundler 内部都严格按照这几个步骤串行执行。**

真实实现中，依赖分析、Tree Shaking、Chunk 划分等阶段可能交叉进行。Webpack 官方将自身描述为从一个或多个入口建立 Dependency Graph，然后将项目需要的模块组合成一个或多个 Bundle。Rollup 同样以模块分析、Tree Shaking 和 Code Splitting 为核心能力。([webpack](https://webpack.js.org/concepts/))

---
#### 1. 前端打包到底在做什么？

现代项目源码通常不是最终直接部署给浏览器的形态。

例如：

```text
src/
├── main.js
├── user.js
├── order.js
├── components/
├── styles/
├── images/
└── node_modules/
```

代码之间存在：

```js
import user from './user.js'
import axios from 'axios'
import './style.css'
```

还可能存在：

```js
import('./UserPage.js')
```

打包工具要做的核心事情，就是：

> **理解这些模块之间的关系，对源码进行必要的转换、拆分和优化，最终生成适合浏览器加载和部署的静态资源。**

所以整个过程可以概括为：

```text
源码模块
↓
分析关系
↓
组织模块
↓
优化模块
↓
生成部署产物
```

---
#### 2. 从入口建立依赖图

打包工具首先需要知道：

> **从哪里开始分析项目。**

例如：

```js
src/main.js
```

是入口。

假设：

```js
// main.js
import App from './App.js'
import './style.css'
```

然后：

```js
// App.js
import User from './User.js'
import axios from 'axios'
```

那么打包工具会从：

```text
main.js
```

开始递归分析：

```text
main.js
├── App.js
│   ├── User.js
│   └── axios
└── style.css
```

继续分析 `User.js` 的依赖，直到所有可达模块都被分析完成。

最终得到：

> **Dependency Graph，也就是模块依赖图。**

Webpack 官方对此的描述就是：从一个或多个 Entry Point 出发，递归建立包含应用所需模块的 Dependency Graph。([webpack](https://webpack.js.org/concepts/dependency-graph/))

因此这里需要理解：

```text
入口
↓
找到直接依赖
↓
继续找到依赖的依赖
↓
递归处理
↓
完整 Dependency Graph
```

---
#### 3. 为什么需要依赖图？

因为后面很多工作都建立在依赖图之上。

打包工具需要知道：

```text
谁依赖谁？、哪些模块必须一起加载？、哪些模块被多个地方共同使用？、哪些模块只在某个页面使用？、哪些代码从来没有被使用？、哪些依赖是同步依赖？、哪些依赖是动态加载的？
```

有了这些信息以后，才能进一步决定：

```text
哪些代码放在一起、哪些代码拆开、哪些代码可以删除、最终生成多少个文件
```

因此 Dependency Graph 是整个打包过程非常核心的数据结构。

---
#### 4. 模块转换发生在哪里？

依赖分析过程中，源码还可能需要转换。

例如：

```text
TypeScript、JSX、新的 JavaScript 语法、CSS 预处理器、其他静态资源
```

都可能需要转换成构建工具或浏览器能够继续处理的形式。

例如 JavaScript：

```text
现代 JS
↓
Babel / SWC / esbuild 等
↓
目标环境可执行 JavaScript
```

这一部分就是上一题 Babel 所处的位置。

所以可以理解为：

```text
依赖解析 + 代码转换 + 依赖图构建
```

会共同完成对源码模块的处理。

---
#### 5. 代码拆分 Code Splitting

当依赖图建立起来以后，并不意味着：

> 所有代码一定全部塞进一个巨大的 JS 文件。

如果项目非常大：

```text
main.bundle.js
20 MB
```

用户第一次打开首页就必须下载全部代码，即使其中：

```text
后台管理、报表页面、设置页面、编辑器
```

当前根本没有使用。

因此打包工具会进行：

> **Code Splitting，代码拆分。**

Webpack 官方对 Code Splitting 的定义就是：把代码拆成多个 Bundle，这些 Bundle 可以按需加载或者并行加载，从而控制加载优先级并减小单次加载的 Bundle。([webpack](https://webpack.js.org/guides/code-splitting/))

因此：

```text
原来

所有模块
↓
main.js

代码拆分以后

main.js
vendor.js
common.js
UserPage.js
AdminPage.js
...
```

这些拆出来的代码单元通常称为：

> **Chunk。**

---
##### Chunk、Bundle、Bundler 一定要区分

这是前面讨论中容易说混的地方。
###### Bundler

是：

> **打包工具。**

例如：

```text
Webpack、Rollup、Rolldown、esbuild
```

不要说：

> “拆成多个 Bundler”。

这是错误的。

---
###### Chunk

更偏向：

> **Bundler 在构建过程中划分出来的一组模块。**

例如：

```text
Main Chunk、Vendor Chunk、Common Chunk、Async Chunk
```

Chunk 是构建层面的逻辑代码块。

---
###### Bundle

通常指：

> **最终生成并交付给运行环境加载的打包产物。**

例如：

```text
main.abc123.js、vendor.efg456.js、UserPage.xyz789.js
```

在很多日常面试语境里，Chunk 和最终生成的 JS Bundle 经常被近似地混着使用，但严格理解时：

```text
模块 Module
↓
组织成 Chunk
↓
渲染成最终输出文件 / Bundle
```

这样理解更清楚。

---
#### 6. 代码通常根据什么进行拆分？

这部分是这一题的重点。

不应该简单背：

> “打包工具会自动拆包。”

要知道它为什么拆。

常见来源主要有下面几类。
##### 多个入口

例如一个多页面应用：

```text
home.html
→ home.js

admin.html
→ admin.js
```

那么：

```text
home.js
admin.js
```

本身就是不同入口。

打包工具可以围绕不同入口形成不同的 Entry Chunk。

Webpack 官方也将 **Entry Points** 列为代码拆分方式之一。([webpack](https://webpack.js.org/guides/code-splitting/))

---
##### 公共模块

例如：

```text
Page A
├── lodash
└── common.js

Page B
├── lodash
└── common.js
```

如果分别打：

```text
A.js
→ lodash + common

B.js
→ lodash + common
```

就会造成重复。

所以可以抽取：

```text
common.js
     ↑
   /   \
A.js   B.js
```

Webpack 的 `SplitChunksPlugin` 就可以把公共依赖提取到已有 Chunk 或新的 Chunk，从而进行去重。([webpack](https://webpack.js.org/guides/code-splitting/))

所以所谓：

> **公共组件拆包**

更准确的说法应该是：

> **被多个入口或 Chunk 共享的模块，可以根据拆分策略被提取成共享 Chunk。**

它不一定非得是 Vue/React 的“组件”。

---
##### 第三方依赖

例如：

```js
import vue from 'vue'
import axios from 'axios'
import lodash from 'lodash'
```

这些通常来自：

```text
node_modules
```

在一些构建策略中，可以把它们单独组织成类似：

```text
vendor.js
```

为什么？

因为：

```text
业务代码
→ 经常修改

第三方库
→ 相对稳定
```

如果分开：

```text
main.[hash].js
vendor.[hash].js
```

修改业务代码时，稳定的第三方 Chunk 有机会继续利用长期缓存。

不过这里要注意：

> **“第三方依赖必须单独打成 vendor”不是所有打包工具的固定规则。**

它只是常见的 Chunk 划分策略之一。现代 Bundler 会根据自身默认策略和用户配置决定如何拆分。

---
##### 动态 `import()`

这是代码拆分和懒加载之间最重要的连接点。

例如：

```js
import('./UserPage.js')
```

Webpack 官方明确把动态 `import()` 列为动态 Code Splitting 的推荐方式。([webpack](https://webpack.js.org/guides/code-splitting/))

打包工具在分析代码时可以看到：

```js
import('./UserPage.js')
```

于是通常会把：

```text
UserPage
及其相关依赖
```

形成异步 Chunk。

例如构建以后：

```text
main.js
UserPage.abc123.js
```

而不是全部放进：

```text
main.js
```

---
#### 7. 动态 import 为什么既和代码拆分有关，又和懒加载有关？

这是两个不同阶段的概念。

假设源码：

```js
const UserPage = () => import('./UserPage.js')
```
##### 构建阶段

Bundler 看到：

```js
import('./UserPage.js')
```

把它识别成一个异步依赖边界。

于是：

```text
UserPage
↓
单独组织成 Async Chunk
```

这一步叫：

> **Code Splitting。**

---
##### 运行阶段

浏览器刚打开首页时：

```text
不请求 UserPage Chunk
```

直到用户真正进入用户页面：

```text
执行 import()
↓
浏览器请求 UserPage.xxx.js
↓
模块加载完成
↓
执行模块
```

这一步叫：

> **Lazy Loading，懒加载。**

所以二者关系可以记成：

```text
动态 import()
      ↓

构建阶段
→ Code Splitting
→ 生成异步 Chunk

      ↓

运行阶段
→ 执行 import()
→ 请求异步 Chunk
→ Lazy Loading
```

因此：

> **代码拆分解决“代码怎样被拆成独立资源”，懒加载解决“这些资源什么时候加载”。**

二者高度相关，但不是同一个概念。

---
#### 8. 有代码拆分是不是一定等于懒加载？

不是。

例如：

```text
main.js、vendor.js、common.js
```

虽然已经拆成三个文件：

```text
Code Splitting
```

但如果 HTML 一开始：

```html
<script src="main.js"></script>
<script src="vendor.js"></script>
<script src="common.js"></script>
```

全部立即请求，那么：

```text
拆包了
```

但是：

```text
没有懒加载
```

因此：

```text
Code Splitting
≠
Lazy Loading
```

而：

```text
动态 import()
```

经常把两者连接起来。

---
#### 9. 代码拆分会不会减少整个项目的总代码量？

这点也要区分。

代码拆分主要解决的是：

> **怎么组织和加载代码。**

例如：

```text
原来：
main.js = 1 MB
```

拆成：

```text
main.js = 300 KB
vendor.js = 400 KB
admin.js = 300 KB
```

总代码可能仍然接近：

```text
1 MB
```

甚至因为各 Chunk 存在少量运行时代码，总代码可能略有增加。

但是首屏只需要：

```text
main.js + 必要依赖
```

而不需要：

```text
admin.js
```

所以它优化的是：

> **首次加载体积、加载优先级和资源加载时机。**

Webpack 官方同样强调 Code Splitting 的价值在于更小的单个 Bundle、按需或并行加载，以及控制资源优先级。([webpack](https://webpack.js.org/guides/code-splitting/))

真正负责：

> **把不需要的代码直接删除**

的是后面的 Tree Shaking 等优化。

---
#### 10. 代码优化--Tree Shaking

例如：

```js
// utils.js

export function add() {}

export function minus() {}

export function multiply() {}
```

业务代码只使用：

```js
import { add } from './utils.js'
```

那么：

```text
add
→ 使用

minus
→ 没有使用

multiply
→ 没有使用
```

构建工具就可以分析：

```text
哪些 export 被使用
哪些 export 没有使用
```

然后让没有使用并且可以安全删除的代码进入 Dead Code Elimination。

这就是 Tree Shaking。

所以：

> **Tree Shaking 的目标是删除最终程序中没有被使用、并且能够安全删除的代码。**

---
#### 11. 为什么 Tree Shaking 和 ESM 关系很大？

因为前面第41题已经讲过：

```js
import { add } from './utils.js'
```

和：

```js
export function add() {}
```

属于：

> **静态模块结构。**

在代码执行之前，就可以分析：

```text
这个模块有哪些 export
↓
另一个模块 import 了哪些内容
↓
哪些 export 实际被使用
```

所以：

```text
ESM
↓
静态分析
↓
Used Exports 分析
↓
Dead Code
↓
Tree Shaking
```

Webpack 官方给出的 Tree Shaking 使用条件中也明确强调 ES2015 `import/export`，并指出需要正确处理副作用。([webpack](https://webpack.js.org/guides/tree-shaking/))

因此不能简单说：

> “没有被 import 的函数肯定会被删掉。”

还要考虑：

```text
Side Effects
副作用
```

例如：

```js
import './polyfill.js'
```

虽然没有使用任何 export，但：

```text
polyfill.js
```

可能修改全局对象。

这种代码不能随便删除。

---
#### 12. Tree Shaking 和代码压缩不是一回事

这是这一题另一个重点。

假设：

```js
function add(a, b) {
  return a + b
}

function unused() {
  console.log('unused')
}

console.log(add(1, 2))
```

Tree Shaking / Dead Code Elimination 关注的是：

```text
unused
是否根本不需要存在
```

如果安全：

```text
直接删除
```

---

而 Minification 关注的是：

> **剩下的代码怎样写得更小。**

例如：

```js
function add(a, b) {
  return a + b;
}

console.log(add(1, 2));
```

压缩以后可能变成类似：

```js
function a(n,o){return n+o}console.log(a(1,2));
```

主要可能包括：

```text
删除空格、删除换行、删除注释、缩短变量名、简化表达式、合并某些语句、其他安全的压缩优化
```

因此：

```text
Tree Shaking
→ 哪些代码不要

Minification
→ 保留下来的代码怎样更小
```

两者目标都是：

```text
减小产物体积
```

但机制不同。

Webpack 官方 Tree Shaking 示例中也明确区分了 used exports / dead code 标记与后续 Minifier 真正删除、压缩代码的过程。([webpack](https://webpack.js.org/guides/tree-shaking/))

---
#### 13. 因此优化阶段应该怎样理解？

可以形成：

```text
Dependency Graph
↓
知道有哪些模块

Code Splitting
↓
决定这些模块怎么分组、怎么加载

Tree Shaking
↓
判断哪些代码是不需要的

Minification
↓
进一步压缩保留下来的代码

Output
↓
生成最终文件
```

这里一定要区分三个目的：

| 操作 | 核心问题 |
|---|---|
| Code Splitting | **代码怎么拆、什么时候加载？** |
| Tree Shaking | **哪些代码根本不需要？** |
| Minification | **剩下的代码怎么变得更小？** |

这是这道题最值得记住的一组关系。

---
#### 14. 最后生成什么？

完成前面的分析、拆分和优化之后，会生成：

```text
JS Chunk / Bundle、CSS、图片、字体、Source Map、其他静态资源
```

例如：

```text
dist/
├── index.html
├── assets/
│   ├── index-a81f.js
│   ├── vendor-b72d.js
│   ├── UserPage-e18c.js
│   ├── index-c29f.css
│   └── logo-a81b.png
```

Webpack 默认会把生成文件输出到 `dist`，同时允许通过 `output` 修改输出位置和文件名。官方文档明确说明，`output` 控制编译文件如何写入磁盘。([webpack](https://webpack.js.org/concepts/output/))

因此：

> **`dist` 是非常常见的默认/约定输出目录，但不是“前端打包理论上必须叫 dist”。**

不同工具和项目都可以调整。

---
#### 15. 这是不是 Webpack 独有的流程？

不是。

这一点你前面问得很关键。

更准确地说：

> **这是现代模块 Bundler 生产构建的一种通用概念模型。**

例如 Webpack 官方描述的核心过程就是：

```text
Entry
↓
Dependency Graph
↓
Modules
↓
one or more Bundles
```

并支持 Code Splitting、Tree Shaking、Minification。([webpack](https://webpack.js.org/concepts/))

Rollup 官方同样强调：

```text
Modules
↓
Tree Shaking
↓
Code Splitting
↓
Output
```

并明确支持根据**不同入口和动态 import** 进行代码拆分。([Rollup](https://rollupjs.org/?utm_source=chatgpt.com))

Vite 的生产构建同样会进行 Bundling、Chunking 和生产优化；当前 Vite 官方文档中生产构建由 Rolldown 驱动，并允许配置 Chunking Strategy。([vitejs](https://vite.dev/guide/?utm_source=chatgpt.com))

因此可以说：

```text
Webpack、Rollup、Rolldown、Vite 的生产构建、……
```

从面试理解层面都可以套用：

```text
入口
→ 依赖分析
→ 模块图
→ Chunk 划分
→ 优化
→ 输出
```

但：

> **不同工具内部的数据结构、插件体系、优化算法和实际执行顺序并不完全相同。**

所以不要把这条逻辑流程说成某个统一标准规定的固定流水线。

---

### 标准回答

前端打包工具的核心作用，是把开发阶段大量相互依赖的模块进行解析、转换、拆分和优化，最终生成适合浏览器加载和生产部署的静态资源。

如果从生产构建的整体流程来看，我会把它概括为：

> **从入口出发建立依赖图，然后进行代码拆分和代码优化，最后生成一个或多个 Bundle 以及其他静态资源并输出。**

第一步是**确定入口并构建模块依赖图**。

打包工具会从一个或者多个入口开始解析代码。例如 `main.js` 中通过 `import` 引用了 `App.js`，`App.js` 又引用了其他组件和第三方库，打包工具就会沿着这些依赖递归分析，最终形成 Dependency Graph。依赖图记录了模块之间的关系，例如谁依赖谁、哪些模块被多个入口共享、哪些依赖是同步的、哪些是动态的。Webpack 官方对自身核心流程的定义也是从 Entry Point 出发递归建立 Dependency Graph，再将需要的模块组合成一个或多个 Bundle。([webpack](https://webpack.js.org/concepts/))

在依赖分析过程中，还可能进行必要的**模块转换**。例如现代 JavaScript 可以经过 Babel、SWC 等工具处理，TypeScript、JSX、CSS 以及其他资源也可能经过对应转换流程，最终变成打包工具能够继续处理并输出给目标环境的模块。

建立依赖关系以后，第二个重要阶段是**代码拆分，也就是 Code Splitting**。代码拆分不是删除代码，而是决定“现有代码应该如何分组成不同的 Chunk，以及这些 Chunk 应该如何加载”。

常见的拆分来源包括几个方面。

第一种是**多个入口**。例如多页面应用存在 `home` 和 `admin` 两个入口，它们可以分别形成对应的入口 Chunk。Webpack 官方也把 Entry Points 列为 Code Splitting 的基本方式之一。([webpack](https://webpack.js.org/guides/code-splitting/))

第二种是**公共依赖**。如果多个入口或异步模块都使用同一个公共模块，如果每个 Bundle 都各自包含一份，就会出现重复代码，因此打包工具可以根据策略把公共依赖提取为共享 Chunk。Webpack 的 SplitChunksPlugin 就具有提取公共依赖、减少重复的能力。([webpack](https://webpack.js.org/guides/code-splitting/))

第三种是**第三方依赖**。例如 Vue、React、lodash 等依赖通常相对业务代码更加稳定，因此有些项目会按照 Chunk 策略把这类依赖拆成独立的 vendor Chunk，从而配合浏览器缓存。但第三方依赖并不是所有 Bundler 都强制单独拆包，这只是常见策略之一。

第四种也是非常重要的一种，就是**动态 `import()`**：

```js
import('./UserPage.js')
```

打包工具在构建阶段通常会把这个动态依赖识别为异步拆分边界，把相关模块组织成独立的异步 Chunk。Webpack 官方就把动态 `import()` 作为动态 Code Splitting 的推荐方式。([webpack](https://webpack.js.org/guides/code-splitting/))

这也解释了**代码拆分和懒加载的关系**。

代码拆分发生在构建阶段，它解决的是：

> **代码怎么拆成独立 Chunk。**

懒加载发生在运行阶段，它解决的是：

> **这些 Chunk 什么时候真正请求和执行。**

例如：

```js
const UserPage = () => import('./UserPage.js')
```

构建时，Bundler 可以把 `UserPage` 拆成异步 Chunk；运行时，只有代码真正执行到 `import()` 时才请求该 Chunk，这才形成懒加载。

所以：

> **代码拆分不等于懒加载。代码拆分提供独立资源，懒加载利用这些资源在真正需要时再加载。动态 `import()` 经常同时把构建阶段的代码拆分和运行阶段的懒加载连接起来。**

代码拆分本身也不一定减少整个项目的总代码量。它主要优化的是首屏加载体积、并行加载和资源加载时机。真正负责减少无用代码的是后面的 **Tree Shaking**。

Tree Shaking 会根据模块使用关系分析哪些导出真正被使用，以及哪些代码在保证副作用语义正确的情况下可以安全移除。它特别依赖 ES Module 的静态 `import/export` 结构，因为构建工具可以在执行代码以前分析模块之间的导入导出关系。Webpack 官方也明确要求利用 ES2015 Module Syntax，并需要正确处理 `sideEffects` 等信息。([webpack](https://webpack.js.org/guides/tree-shaking/))

Tree Shaking 之后还有一个容易混淆的步骤，就是**代码压缩 Minification**。

Tree Shaking 解决的是：

```text
哪些代码不要？
```

例如一个模块导出了三个函数，但项目只使用其中一个，那么另外两个在满足删除条件时可以被消除。

Minification 解决的则是：

```text
剩下的代码怎样写得更小？
```

例如：

- 删除不必要的空格、换行和注释；
- 缩短局部变量名称；
- 简化表达式；
- 对代码进行其他安全的压缩转换。

因此两者都会降低 Bundle 体积，但是机制不同：

```text
Tree Shaking
→ 删除不需要的代码

Minification
→ 压缩需要保留的代码
```

Webpack 官方的 Tree Shaking 文档也明确展示了先标记未使用代码，再由生产模式中的 Minifier 删除和压缩最终产物的过程。([webpack](https://webpack.js.org/guides/tree-shaking/))

完成代码拆分和代码优化之后，打包工具会根据 Chunk 生成最终输出文件，例如：

```text
main.js、vendor.js、common.js、UserPage.js、style.css、图片、字体等资源
```

这些最终可以输出到 `dist` 等构建目录。`dist` 是非常常见的目录名称，例如 Webpack 默认就会向 `dist` 输出生成文件，但输出路径本身通常可以配置，因此并不是所有打包工具都强制要求必须叫 `dist`。([webpack](https://webpack.js.org/concepts/output/))

所以从面试角度，整个前端打包构建过程可以整理成：

```text
入口 Entry
↓
递归解析模块依赖
↓
建立 Dependency Graph
↓
进行必要的模块转换
↓
根据入口、共享依赖、动态 import 等进行 Code Splitting
↓
形成不同 Chunk
↓
Tree Shaking 移除可安全删除的无用代码
↓
Minification 压缩剩余代码
↓
生成 Bundle / Chunk / CSS / Asset
↓
输出到 dist 等构建目录
```

最后还需要说明，这套流程**不是 Webpack 独有的固定流水线**，而是理解现代模块打包工具生产构建过程的一种通用模型。Webpack、Rollup、Rolldown，以及 Vite 的生产构建都具有依赖分析、Chunk 划分、代码优化和输出等类似概念，只是各自内部实现和实际执行顺序并不完全一致。([webpack](https://webpack.js.org/concepts/))

因此这一题真正需要掌握的是三组区别：

| 概念 | 解决的问题 |
|---|---|
| **Code Splitting** | 代码应该**怎么拆、怎么加载** |
| **Tree Shaking** | 哪些代码**根本不需要，可以删除** |
| **Minification** | 保留下来的代码**怎样进一步变小** |

掌握这一层之后，再进入下一题 **Webpack 的具体工作原理**，就会比较顺畅。

---

**Sources:**

- [Concepts | webpack](https://webpack.js.org/concepts/)
- [Rollup](https://rollupjs.org/?utm_source=chatgpt.com)
- [Getting Started | Vite](https://vite.dev/guide/?utm_source=chatgpt.com)

## 第44题 Webpack 是什么？它是怎样完成一次构建的？

### 题目

Webpack 是什么？为什么说它是一个 **Static Module Bundler（静态模块打包工具）**？

结合 `entry`、Module、Loader、Plugin、Chunk 和 `output`，说明 Webpack 如何从入口出发解析项目依赖、处理不同类型的模块，最终生成浏览器可以加载的构建产物。

---

### 问题

1. Webpack 是什么？它主要解决前端工程中的什么问题？
2. 为什么 Webpack 官方把自己称为 **Static Module Bundler**？这里的“Static”是什么意思？
3. Webpack 中的 `entry` 是什么？为什么构建必须先确定入口？
4. Webpack 如何从 Entry 出发递归分析 `import`、`require` 等依赖，建立 Dependency Graph？
5. Webpack 为什么能把 JavaScript、CSS、图片、字体等都纳入模块依赖关系？
6. Loader 是什么？为什么说 Loader 主要负责**模块源代码的转换**？
7. 一个资源为什么可以经过多个 Loader？Loader 和 Babel 是什么关系？
8. Plugin 是什么？为什么说 Plugin 可以介入 Webpack 更广泛的构建过程？
9. Loader 和 Plugin 最核心的区别是什么？
10. Webpack 在建立模块依赖图以后，怎样进一步形成 Chunk，并最终通过 `output` 生成实际文件？
11. `output` 负责哪些事情？为什么可以有多个 Entry，却只有一份 `output` 配置？
12. 如果面试官让你完整描述“一次 Webpack 构建”，应该怎样把整个过程串起来？

---

### 回答要点

这一题建议沿着这一条主线回答：

```text
Webpack 是什么
    ↓
读取配置并确定 Entry
    ↓
从入口解析模块
    ↓
Loader 转换模块源码
    ↓
分析模块中的依赖
    ↓
递归构建 Dependency Graph
    ↓
根据依赖关系组织 Chunk
    ↓
Plugin / 内置优化参与构建过程
    ↓
生成最终 Assets
    ↓
output 输出文件
```

这里有一个很重要的点：

> **不要机械地理解成“Loader 全执行完以后才执行 Plugin”。**

Loader 是针对模块内容进行转换的；Plugin 则可以通过 Webpack 的构建生命周期介入多个阶段，所以 Plugin 是贯穿构建流程的扩展机制，不是固定排在 Loader 后面的单独一步。Webpack 官方明确说明，Plugin 的 `apply` 方法会获得 Compiler，从而访问整个 compilation lifecycle。([webpack](https://webpack.js.org/concepts/plugins/))

---
#### 1. Webpack 是什么？

Webpack 官方的定义是：

> Webpack 的核心是一个面向现代 JavaScript 应用的 **static module bundler**。

它会从一个或多个入口开始，在内部建立 Dependency Graph，然后把项目需要的模块组合为一个或者多个 Bundle，最终形成可以部署的静态资源。([webpack](https://webpack.js.org/concepts/))

所以 Webpack 不应该只理解成：

> “把几个 JS 文件合成一个 JS 文件。”

它真正解决的是一个完整的**模块构建问题**：

```text
项目里有大量模块
        ↓
模块之间存在依赖
        ↓
不同资源需要不同处理
        ↓
需要组织、转换、拆分和优化
        ↓
最终生成浏览器可以加载的资源
```

Webpack 的核心思维就是：

> **以模块和依赖关系为中心组织整个前端项目。**

---
#### 2. 为什么叫 Static Module Bundler？

这里的 `static` 很容易理解错。

它不是说：

> Webpack 只能处理“静态文件”。

也不是说：

> Webpack 不支持动态 `import()`。

更准确地理解是：

> **Webpack 在构建阶段从入口出发分析模块之间能够识别的依赖关系，建立模块依赖图，并根据这张图生成最终静态构建产物。**

例如：

```js
import App from './App.js'
import './style.css'
```

Webpack 不需要真正把应用启动起来、让用户点击页面以后，才知道：

```text
main.js
→ App.js
→ style.css
```

这些依赖可以在构建过程中被解析。

Webpack 官方描述也是：从 Entry Points 出发，递归建立 Dependency Graph，然后把模块组合成 Bundle。([webpack](https://webpack.js.org/concepts/dependency-graph/))

因此面试中更稳妥地说：

> **Webpack 的“静态模块打包”强调的是构建阶段对模块依赖关系进行分析和组织，而不是说它完全不支持动态依赖。**

例如：

```js
import('./UserPage.js')
```

Webpack 同样能够识别，并把它作为异步依赖参与 Chunk 划分。

---
#### 3. Entry 是什么？

`entry` 就是：

> **Webpack 开始构建 Dependency Graph 的起点。**

例如：

```js
export default {
  entry: './src/main.js'
}
```

Webpack 首先找到：

```text
main.js
```

然后分析：

```js
import App from './App.js'
import './style.css'
```

再找到：

```text
App.js
style.css
```

如果 `App.js` 中：

```js
import User from './User.js'
import axios from 'axios'
```

继续找到：

```text
User.js
axios
```

形成：

```text
main.js
├── App.js
│   ├── User.js
│   └── axios
└── style.css
```

然后继续递归，直到把从入口能够到达的依赖分析出来。

Webpack 官方对 Entry 的解释正是：Entry 告诉 Webpack 从哪个模块开始建立内部 Dependency Graph，并继续寻找它直接和间接依赖的模块。([webpack](https://webpack.js.org/concepts/))

因此：

```text
Entry
≠ 最终输出文件

Entry
= 依赖分析的起点
```

Webpack 既可以有：

```text
单入口
```

也可以配置：

```text
多个入口
```

例如多页面应用：

```js
export default {
  entry: {
    home: './src/home.js',
    admin: './src/admin.js'
  }
}
```

Webpack 官方也支持从多个 Entry 构建相应的依赖关系。([webpack](https://webpack.js.org/concepts/entry-points/))

---
#### 4. Webpack 是怎么建立 Dependency Graph 的？

核心过程可以理解成：

```text
Entry
↓
读取入口模块
↓
对模块进行必要转换
↓
解析模块内容
↓
找到 import / require / 资源引用
↓
解析这些依赖对应的模块
↓
重复执行
↓
Dependency Graph
```

例如：

```js
// main.js

import App from './App.js'
```

Webpack 得到：

```text
main.js
→ App.js
```

然后：

```js
// App.js

import User from './User.js'
```

继续得到：

```text
main.js
→ App.js
→ User.js
```

只要一个文件依赖另外一个文件，Webpack 就可以把这种关系记录为 Dependency。Webpack 官方还特别说明，这不仅包括代码，也可以包括图片和 Web Font 等非代码资源。([webpack](https://webpack.js.org/concepts/dependency-graph/))

最后形成：

> **Dependency Graph。**

这张图是后面：

- Chunk 划分；
- 公共依赖分析；
- Tree Shaking；
- Code Splitting；
- 最终 Bundle 生成

等工作的基础。

---
#### 5. 为什么 Webpack 能处理 CSS、图片、字体，而不仅仅是 JS？

Webpack 的一个核心设计思想是：

> **依赖关系不局限于 JavaScript 文件。**

例如：

```js
import './style.css'
import logo from './logo.png'
```

Webpack 可以把这些资源也纳入模块依赖关系。官方 Dependency Graph 文档明确说明，Webpack 可以把图片、Web Font 等非代码资源作为应用依赖处理。([webpack](https://webpack.js.org/concepts/dependency-graph/))

不过这里需要区分具体处理机制。

传统情况下，例如 CSS：

```js
import './style.css'
```

往往需要：

```text
css-loader
style-loader
```

等 Loader 处理。

Webpack 官方 Loader 文档就是以 CSS、TypeScript 为例，说明 Loader 可以将这些文件转换成 Webpack 可以继续处理的模块。([webpack](https://webpack.js.org/concepts/loaders/))

而图片、字体等资源在 Webpack 5 中还可以通过 **Asset Modules** 原生处理，不一定再依赖旧的 `file-loader`、`url-loader`。所以面试里不要绝对地说：

> “Webpack 所有非 JS 文件必须通过 Loader。”

更准确的是：

> **Webpack 能把不同资源纳入模块体系；Loader 是扩展模块转换能力的重要机制，而 Webpack 5 对部分静态资源还提供 Asset Modules 等内置能力。**

---
#### 6. Loader 到底是什么？

Webpack 官方的定义很直接：

> **Loaders are transformations that are applied to the source code of a module.**

也就是：

> **Loader 本质上是模块源代码转换器。** ([webpack](https://webpack.js.org/concepts/loaders/))

例如：

```text
TypeScript
↓
ts-loader
↓
JavaScript
```

或者：

```text
现代 JavaScript / JSX
↓
babel-loader
↓
调用 Babel
↓
转换后的 JavaScript
```

所以 Loader 自己和 Babel 不是同一个东西。

例如：

```js
{
  test: /\.js$/,
  use: 'babel-loader'
}
```

关系实际上是：

```text
Webpack
↓
发现 .js 模块需要处理
↓
babel-loader
↓
调用 Babel
↓
返回转换后的代码
↓
Webpack 继续处理
```

因此可以把：

```text
Babel
```

理解为真正负责 JavaScript 编译转换的工具；

而：

```text
babel-loader
```

负责把 Babel 接入 Webpack 的模块处理流程。

Webpack 官方示例同样使用 `babel-loader` 转换匹配的 `.js` 文件。([webpack](https://webpack.js.org/concepts/))

---
#### 7. 为什么一个模块可以经过多个 Loader？

因为一种资源可能需要多个处理步骤。

例如 SCSS：

```text
.scss
↓
sass-loader
↓
CSS
↓
css-loader
↓
处理 CSS import / url 等依赖
↓
style-loader
↓
把样式注入页面
```

因此 Webpack 支持 Loader Chain。

配置例如：

```js
{
  test: /\.scss$/,
  use: [
    'style-loader',
    'css-loader',
    'sass-loader'
  ]
}
```

Webpack 官方说明，普通 Loader 链在执行转换阶段通常按照**从右到左，也就是从下到上**执行。([webpack](https://webpack.js.org/concepts/loaders/))

所以：

```text
sass-loader
↓
css-loader
↓
style-loader
```

这体现了 Loader 的特点：

> **针对某类模块做链式转换。**

这一题记住这个结论即可，Loader 内部 pitch / normal 等更细的执行机制可以后面再展开。

---
#### 8. Plugin 是什么？

Plugin 和 Loader 的定位完全不同。

Webpack 官方说明：

> Loader 主要用于转换特定类型的模块，而 Plugin 可以完成更广泛的任务，例如 Bundle 优化、Asset 管理、环境变量注入等。([webpack](https://webpack.js.org/concepts/))

例如：

```text
HtmlWebpackPlugin
→ 生成 HTML 并注入构建后的资源

DefinePlugin
→ 注入编译期常量

ProgressPlugin
→ 控制构建进度输出
```

Plugin 的关键不是：

> “处理一种文件。”

而是：

> **扩展 Webpack 的整体构建能力。**

一个 Webpack Plugin 通常提供：

```js
apply(compiler) {
  // 注册构建过程中的处理逻辑
}
```

Webpack Compiler 会调用 `apply`，Plugin 因此可以访问 compilation lifecycle。([webpack](https://webpack.js.org/concepts/plugins/))

所以可以理解成：

```text
Plugin
↓
接入 Webpack 构建生命周期
↓
在对应阶段执行自己的逻辑
```

这也是为什么 Plugin 能做：

```text
资源生成、资源优化、HTML 生成、环境变量处理、构建分析、压缩、进度统计、……
```

而不仅仅是修改某一个 `.js` 或 `.css` 文件。

---
#### 9. Loader 和 Plugin 最核心的区别是什么？

这部分面试中最好不要只背：

> Loader 转换文件，Plugin 扩展功能。

还要解释为什么。

可以这样区分：

| | Loader | Plugin |
|---|---|---|
| 主要对象 | **某个 Module 的源码** | **整个 Webpack 构建过程** |
| 主要职责 | 转换模块内容 | 扩展构建能力 |
| 典型形式 | 输入模块 → 转换 → 返回结果 | 接入 Compiler / Compilation 生命周期 |
| 常见例子 | `babel-loader`、`css-loader`、`sass-loader` | `HtmlWebpackPlugin`、`DefinePlugin` |
| 典型问题 | “这个文件怎么处理？” | “整个构建过程还要做什么？” |

因此最容易记成：

```text
Loader
→ 管“模块怎么转换”

Plugin
→ 管“构建过程怎么扩展”
```

Webpack 官方同样明确将 Loader 定位为模块源码转换，将 Plugin 定位为完成 Loader 无法覆盖的更广泛构建任务。([webpack](https://webpack.js.org/concepts/loaders/))

---
#### 10. Module、Chunk、Bundle 在 Webpack 中是什么关系？

这一题需要把第43题和 Webpack 串起来。

源码中的：

```text
main.js、App.js、User.js、style.css、axios
```

都可以进入 Webpack 的：

> **Module Graph。**

也就是：

```text
Module
```

Webpack根据依赖关系和拆分规则，再把多个 Module 组织成：

```text
Chunk
```

例如：

```text
Entry Chunk、Async Chunk、Shared Chunk
```

最后 Webpack 根据 Chunk 生成实际输出资源：

```text
main.js、vendors.js、UserPage.js
```

可以简化成：

```text
Module
↓
Dependency Graph

多个 Module
↓
组织成 Chunk

Chunk
↓
代码生成
↓
最终 Asset / Bundle
```

这也就是上一题“通用打包流程”到了 Webpack 内部以后对应的具体结构。

---
#### 11. output 是什么？

`output` 解决的问题不是：

> “打包哪些模块。”

这件事主要由入口和依赖关系决定。

`output` 主要告诉 Webpack：

> **最终构建产生的文件应该怎样写到磁盘。**

例如：

```js
export default {
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].[contenthash].js'
  }
}
```

其中：

```text
path
→ 输出到哪里

filename
→ 输出文件叫什么
```

Webpack 官方定义也是：`output` 告诉 Webpack 如何把编译文件写到磁盘。([webpack](https://webpack.js.org/concepts/output/))

默认情况下，主输出文件会进入：

```text
./dist
```

但这可以配置。([webpack](https://webpack.js.org/concepts/))

Webpack 可以有多个：

```text
Entry
```

例如：

```js
entry: {
  app: './app.js',
  search: './search.js'
}
```

但是只有一份：

```js
output
```

配置对象。

这不意味着只能生成一个文件。

例如：

```js
output: {
  filename: '[name].js'
}
```

可以生成：

```text
app.js
search.js
```

Webpack 官方 Output 文档也特别说明：可以有多个 Entry，但只配置一个 `output`，通过类似 `[name]` 的占位符控制不同 Chunk 对应的文件名。([webpack](https://webpack.js.org/concepts/output/))

---

### 标准回答

Webpack 本质上是一个**静态模块打包工具，也可以理解为一个以模块依赖图为核心的前端构建工具**。

它解决的核心问题是：现代前端项目由大量 JavaScript、CSS、图片、字体以及第三方依赖组成，这些资源之间又存在复杂的依赖关系。Webpack 会从一个或者多个入口开始分析这些依赖，把项目组织成模块依赖图，然后对模块进行必要的转换、拆分和优化，最终生成浏览器可以加载的静态资源。Webpack 官方对自己的定义就是 Static Module Bundler：它会从 Entry Points 出发建立 Dependency Graph，再将项目需要的模块组合成一个或多个 Bundle。([webpack](https://webpack.js.org/concepts/))

Webpack 这里的“静态”并不是说它只能处理静态文件，也不是说它不能支持动态 `import()`。更准确地说，是 Webpack 在**构建阶段**会根据源码中能够分析到的模块依赖关系建立 Dependency Graph，再根据依赖图生成最终静态构建产物。

Webpack 一次基础构建首先从 **Entry** 开始。

例如：

```js
entry: './src/main.js'
```

Entry 告诉 Webpack从哪里开始建立依赖图。Webpack读取 `main.js` 后，如果发现：

```js
import App from './App.js'
import './style.css'
```

就会继续解析 `App.js` 和 `style.css`；如果 `App.js` 又依赖 `User.js` 和 `axios`，Webpack继续递归解析，最终得到整个应用从入口可达的 Dependency Graph。Webpack 官方就是把 Entry 定义为构建内部依赖图的起点，并递归跟踪其直接和间接依赖。([webpack](https://webpack.js.org/concepts/entry-points/))

在处理这些模块时，一个重要机制就是 **Loader**。

Loader 本质上是：

> **对模块源代码进行转换的函数链。**

Webpack 原生能够理解主要的 JavaScript、JSON 模块；对于 TypeScript、CSS 等其他类型的源文件，可以通过 Loader 转换为 Webpack 可以继续处理的模块。Webpack 官方将 Loader 定义为 applied to the source code of a module 的 transformations。([webpack](https://webpack.js.org/concepts/loaders/))

例如：

```js
{
  test: /\.js$/,
  use: 'babel-loader'
}
```

当 Webpack 遇到符合条件的 JavaScript 模块时，会交给 `babel-loader`，再由它调用 Babel 对源码进行转换。因此 Babel 和 `babel-loader` 不是一个东西：

```text
Babel
→ 真正进行 JavaScript 编译转换

babel-loader
→ 把 Babel 接入 Webpack 的模块转换流程
```

一个资源还可以经过多个 Loader。例如 SCSS 可能形成：

```text
SCSS
↓
sass-loader
↓
CSS
↓
css-loader
↓
处理 CSS 依赖
↓
style-loader
↓
把样式用于页面
```

普通 Loader 链的转换阶段一般按照从右到左执行。([webpack](https://webpack.js.org/concepts/loaders/))

除了 Loader 以外，Webpack 另一个非常重要的扩展机制是 **Plugin**。

Loader 主要解决：

> **某一种模块应该怎样转换。**

Plugin 解决的是：

> **整个 Webpack 构建过程还需要增加什么能力。**

例如 Plugin 可以用于资源优化、生成 HTML、注入环境变量、分析构建结果等。Webpack Plugin 会通过 `apply(compiler)` 接入 Compiler，并能够访问 Webpack 的 compilation lifecycle，因此 Plugin 不是只处理某个文件，而是可以介入更广泛的构建阶段。([webpack](https://webpack.js.org/concepts/plugins/))

所以 Loader 和 Plugin 最核心的区别可以概括成：

```text
Loader
→ 面向 Module
→ 解决“这个模块怎么转换”

Plugin
→ 面向整个构建流程
→ 解决“Webpack 构建过程怎么扩展”
```

而且不要把流程机械理解成：

```text
所有 Loader
↓
所有 Plugin
```

因为 Plugin 可以贯穿 Webpack 的多个构建阶段，Loader 则是在具体模块构建过程中参与源码转换。

Webpack 在递归处理模块之后，会形成完整的模块依赖图。接下来可以根据 Entry、动态 `import()` 以及代码拆分配置等，将不同 Module 组织成不同 **Chunk**。

所以可以理解成：

```text
Module
→ 项目中的基本模块

Dependency Graph
→ Module 之间的依赖关系

Chunk
→ Webpack 根据依赖和拆分规则组织的一组 Module

Asset / Bundle
→ 最终根据 Chunk 生成的输出文件
```

例如：

```text
main.js、UserPage.js、vendors.js
```

都可能成为最终输出的 JavaScript 资源。

最后由 **output** 控制这些构建文件怎样写入磁盘。

例如：

```js
output: {
  path: path.resolve(__dirname, 'dist'),
  filename: '[name].[contenthash].js'
}
```

其中 `path` 决定输出目录，`filename` 决定输出文件名。Webpack 可以存在多个 Entry，但只配置一个 `output` 对象；通过 `[name]` 等占位符，一份 `output` 规则仍然可以生成多个不同文件。([webpack](https://webpack.js.org/concepts/output/))

因此，如果让我完整描述一次 Webpack 基础构建，我会这样回答：

> **Webpack 是一个以模块依赖图为核心的静态模块打包工具。构建开始以后，它首先读取配置并确定 Entry，然后从入口模块开始解析。对于需要转换的模块，会按照 `module.rules` 使用相应 Loader，例如通过 `babel-loader` 调用 Babel 转换 JavaScript。Webpack 再分析转换后模块中的依赖关系，例如 `import`、`require` 等，找到依赖以后继续递归执行相同过程，最终形成完整的 Dependency Graph。之后 Webpack 根据入口、动态依赖以及代码拆分规则，把不同 Module 组织成 Chunk，并进行代码生成和相应优化。在整个过程中 Plugin 可以通过 Compiler / Compilation 生命周期参与资源生成、优化、环境变量注入等更广泛的构建工作。最后 Webpack 根据这些 Chunk 生成最终的 JavaScript、CSS、图片等 Assets，再按照 `output` 配置把文件写入 `dist` 等输出目录。** ([webpack](https://webpack.js.org/concepts/))

这一题真正需要形成的核心关系就是：

```text
Entry
→ 从哪里开始构建

Dependency Graph
→ 项目模块之间是什么关系

Loader
→ 一个模块怎样转换

Plugin
→ Webpack 构建过程怎样扩展

Chunk
→ 模块最终怎样被组织

Output
→ 构建结果怎样写成最终文件
```

以及完整流程：

```text
读取配置 / 注册 Plugin
        ↓
确定 Entry
        ↓
读取入口 Module
        ↓
Loader 转换需要处理的模块
        ↓
解析 Module 的依赖
        ↓
递归处理依赖
        ↓
建立 Dependency Graph
        ↓
组织 Module 为 Chunk
        ↓
进行代码生成和构建优化
        ↓
生成 Assets
        ↓
按照 output 输出
```

这就是第43题“通用前端打包流程”在 Webpack 中的具体落地。

## 第45题：Vite 的整体构建体系是什么？为什么 Vite 能提升前端开发和构建效率？

---

### 题目

Vite 是什么？相比 Webpack 这类传统 Bundle-first 构建工具，Vite 为什么能够提升开发效率？

### 问题

请说明：

1. Vite 的定位是什么？为什么说它不是单纯的打包器？
2. 传统 Bundle-first 构建模式存在什么问题？
3. Vite 为什么将开发阶段和生产阶段采用不同的构建策略？
4. Vite 开发阶段是如何工作的？
5. Vite 为什么需要 Dependency Pre-Bundling（依赖预构建）？
6. Vite 如何通过 Native ESM、import rewrite、Module Graph 和 HMR 实现快速开发？
7. Vite 生产阶段为什么仍然需要 Bundle？
8. Vite 和 Rollup 的关系是什么？

---

### 回答要点

#### 1. Vite 的定位：现代前端构建工具，而不是单纯的 Bundler

Vite 首先需要明确定位：它不是一个简单替代 Webpack 的打包工具，而是一套面向现代前端项目的构建体系。

传统 Webpack 更强调：

> 将多个模块提前分析、转换并组合成 Bundle。

而 Vite 更关注完整的开发体验，包括：

- 开发服务器启动速度；
- 模块加载和转换；
- 热更新速度；
- 生产环境资源构建。

因此 Vite 的核心思想不是“重新发明一个更快的打包器”，而是：

> 重新设计开发阶段的模块处理方式，减少开发过程中不必要的 Bundle 工作；而在生产阶段仍然使用成熟的 Bundle 技术生成优化后的产物。

Vite 将整个流程分成两个阶段：

- 开发阶段（Development）
- 生产阶段（Production Build）

两个阶段的目标不同，因此采用不同策略。

开发阶段关注：

> 修改代码后，开发者能够快速看到结果。

生产阶段关注：

> 用户访问网站时，资源加载性能最佳。

---
#### 2. 传统 Bundle-first 构建模式存在的问题

Webpack 这类传统 Bundler 采用的是 Bundle-first 思想。

也就是说：

> 在浏览器运行代码之前，先由构建工具完成模块分析和资源组织。

一个典型流程：

```text
入口文件

↓

递归分析 import 依赖

↓

建立完整依赖图

↓

Loader / Plugin 转换模块

↓

生成 Bundle

↓

浏览器加载
```

这种方式的优势是：

- 浏览器只需要加载少量文件；
- 可以进行 Tree Shaking；
- 可以进行代码压缩和优化。

但是在开发阶段，它存在两个明显问题。
##### 启动速度慢

因为开发服务器启动之前，需要提前处理整个应用。

随着项目规模扩大：

- JavaScript 文件数量增加；
- 第三方依赖增加；
- 依赖关系更加复杂；

构建工具需要分析和转换的内容越来越多。

因此：

> 项目越大，开发服务器首次启动时间越长。

---
##### 代码更新速度慢

修改一个文件时：

例如修改：

```text
src/components/Button.vue
```

传统方式需要：

- 判断模块依赖关系；
- 重新处理相关模块；
- 更新 Bundle；
- 通知浏览器刷新。

虽然 HMR 可以减少刷新范围，但是它仍然建立在 Bundle 系统之上。

因此：

> 传统构建工具的问题不是不能优化，而是开发阶段承担了大量本可以延迟的构建工作。

---
#### 3. Vite 的核心设计思想：开发阶段减少 Bundle，生产阶段继续优化 Bundle

Vite 的核心设计思想是：

> 不要在开发阶段提前构建整个应用，而是利用浏览器已经具备的模块加载能力，让浏览器参与模块解析。

因此 Vite 将代码分为两类处理。

---
##### 业务源码

例如：

```text
src/
 ├── components
 ├── pages
 └── utils
```

业务源码特点：

- 经常修改；
- 需要快速反馈。

所以 Vite 不会在启动阶段把全部业务代码打成 Bundle。

而是：

> 当浏览器请求某个模块时，Vite 再实时转换并返回该模块。

---
##### 第三方依赖

例如：

```text
react、vue、lodash、axios
```

第三方依赖特点：

- 修改频率低；
- 模块数量多；
- 可能存在 CommonJS 格式。

这些依赖如果每次都重新处理，会浪费大量时间。

所以 Vite 会提前进行：

> Dependency Pre-Bundling（依赖预构建）。

也就是：

先处理一次第三方依赖，然后缓存结果。

---
#### 4. Vite 开发阶段如何工作？

Vite 开发阶段的核心特点是：

> 不提前构建整个应用 Bundle，而是根据浏览器请求按需处理模块。

假设项目入口：

```javascript
// main.js

import App from './App.vue'
```

传统 Bundler：

会在启动阶段：

```text
main.js

↓

App.vue

↓

其他依赖

↓

全部分析

↓

生成 Bundle
```

而 Vite：

首先启动一个 Dev Server。

浏览器访问页面后，请求入口模块：

```text
浏览器

↓

请求 main.js

↓

Vite 收到请求

↓

转换 main.js

↓

返回浏览器
```

浏览器继续解析：

```javascript
import App from './App.vue'
```

发现需要：

```text
App.vue
```

于是继续请求。

Vite 收到请求后：

- 判断文件类型；
- 调用对应转换逻辑；
- 返回浏览器可以执行的 ES Module。

例如 Vue：

```text
App.vue

↓

Vue SFC 转换

↓

JavaScript Module

↓

浏览器执行
```

因此 Vite 开发阶段的模式是：

> 浏览器需要哪个模块，Vite 就处理哪个模块。

而不是：

> 项目启动时，Vite 先把整个项目全部构建完成。

---
#### 5. Native ESM 为什么是 Vite 开发模式成立的基础？

过去浏览器不支持模块化开发。

例如：

```javascript
import App from './App.js'
```

浏览器无法直接执行。

因此需要：

```text
多个模块

↓

Webpack

↓

Bundle

↓

浏览器
```

也就是说：

过去 Bundler 同时承担两个职责：

1. 分析模块依赖；
2. 帮助浏览器加载模块。

现代浏览器支持 ES Module 后：

浏览器自身可以：

- 解析 import；
- 请求依赖模块；
- 管理模块加载关系。

因此 Vite 可以减少 Bundler 在开发阶段承担的工作。

Vite 主要负责：

- 转换浏览器无法直接理解的代码；
- 提供模块；
- 管理开发过程。

这就是 Vite 官方提出的：

> Serve source code over native ESM.

---
#### 6. Dependency Pre-Bundling 为什么存在？

Dependency Pre-Bundling（依赖预构建）是 Vite 针对第三方依赖设计的优化机制。

它不是为了打包业务代码，而是解决：

> 第三方依赖无法直接按照业务源码方式交给浏览器加载的问题。

主要解决两个问题。
##### CommonJS 兼容问题

npm 生态发展过程中，大量第三方包仍然采用 CommonJS：

```javascript
const xxx = require('xxx')
```

或者：

```javascript
module.exports = xxx
```

但是浏览器原生模块系统使用：

```javascript
import
export
```

两者格式不同。

因此 Vite 会提前处理：

```text
CommonJS

↓

转换

↓

ES Module

↓

浏览器加载
```

---
##### 减少大量模块请求

即使第三方依赖本身是 ES Module，也可能存在大量内部模块。

例如：

一个库：

```text
module A、module B、module C、...、module N
```

如果完全交给浏览器加载：

浏览器需要发送大量请求。

因此 Vite 会提前：

- 分析依赖；
- 优化模块结构；
- 合并处理。

最终减少浏览器请求数量。

---
##### 预构建结果缓存

第三方依赖通常不会频繁变化。

所以：

第一次启动：

```text
扫描依赖

↓

预构建

↓

缓存
```

之后启动：

直接复用缓存结果。

因此：

> Vite 将变化少的第三方依赖提前处理，将变化多的业务源码延迟处理，这是开发阶段速度快的重要原因。

---
#### 7. Vite 如何实现快速 HMR？

Vite 的 HMR（Hot Module Replacement）并不是简单地“重新编译修改文件”。

核心是：

> 根据模块之间的依赖关系，找到受影响范围，只更新必要模块。

为此 Vite 在开发阶段维护：

Module Graph。

它记录：

- 哪些模块被哪些模块引用；
- 模块之间的依赖关系；
- 模块状态。

例如：

```text
App.vue

↓

User.vue

↓

Avatar.vue
```

当 Avatar.vue 修改时：

Vite 可以沿着 Module Graph 查找：

- 谁依赖 Avatar；
- 哪个模块能够接受更新；
- 更新边界在哪里。

这个边界称为：

HMR Boundary。

因此更新过程：

```text
文件变化

↓

定位模块

↓

查询 Module Graph

↓

寻找 HMR Boundary

↓

只更新相关模块
```

而不是：

```text
重新构建整个项目
```

所以 Vite 的 HMR 性能不会简单随着项目规模增加而下降。

---
#### 8. 为什么 Vite 生产阶段仍然需要 Bundle？

虽然 Vite 开发阶段减少 Bundle，但是生产环境仍然需要。

原因：

开发阶段目标：

> 提高开发者反馈速度。

生产阶段目标：

> 提高用户加载性能。

如果生产环境直接部署大量 ES Module：

会产生：

- 大量 HTTP 请求；
- 网络开销增加；
- 加载时间增加。

因此生产环境仍然需要：

- Bundle；
- Tree Shaking；
- Code Splitting；
- 压缩；
- 缓存优化。

生产流程：

```text
入口

↓

依赖分析

↓

模块转换

↓

代码拆分

↓

Tree Shaking

↓

压缩

↓

输出 Bundle
```

---
#### 9. Vite 和 Rollup 的关系

Vite 并不是自己重新实现完整 Bundler。

它采用：

> Vite 核心能力 + Rollup 生产构建能力。

开发阶段：

Vite：

- Dev Server；
- Native ESM；
- HMR；
- Module Graph。

生产阶段：

Rollup：

- 模块分析；
- Tree Shaking；
- Code Splitting；
- Bundle 输出。

所以：

```text
Vite

开发：
自己的 Dev Server

生产：
调用 Rollup 完成构建
```

可以总结：

> Vite 不是取消 Bundle，而是把 Bundle 从开发阶段移动到了生产阶段，让开发阶段采用更适合快速反馈的模块服务模式。

---

### 标准回答

Vite 是一个现代前端构建工具，它不是简单的 JavaScript 打包器，而是一套包含开发服务器、模块转换、热更新以及生产构建能力的工程化工具。

传统 Webpack 采用 Bundle-first 模式，在开发阶段通常需要先从入口文件开始递归分析整个项目依赖，建立完整依赖图，然后完成模块转换并生成 Bundle。这样虽然能够方便生产优化，但是项目规模增加后，会导致开发服务器启动慢、代码修改反馈慢。

Vite 针对这个问题重新设计了开发阶段流程。它认为开发阶段和生产阶段的目标不同：开发阶段关注开发者反馈速度，而生产阶段关注最终用户加载性能。因此 Vite 采用两套策略。

开发阶段，Vite 不提前构建整个应用 Bundle，而是利用现代浏览器支持的 Native ES Module，让浏览器参与模块加载。当浏览器请求入口模块后，Vite 根据请求实时转换对应模块并返回浏览器。如果浏览器继续解析 import 发现新的依赖，则继续请求，Vite 再处理对应模块。因此 Vite 的开发阶段是一个请求驱动的模块转换过程。

但是第三方依赖不能完全按照业务源码处理，因为 npm 生态中存在 CommonJS 模块，同时部分第三方库内部包含大量模块。如果直接交给浏览器加载，会导致兼容性问题和大量网络请求。因此 Vite 引入 Dependency Pre-Bundling，对第三方依赖提前进行优化，将 CommonJS 转换为 ES Module，同时减少模块数量，并缓存预构建结果。

另外，由于浏览器无法直接解析 npm 裸模块导入，例如 `import React from 'react'`，Vite 会通过 import rewrite 将其转换为浏览器能够访问的路径。

在热更新方面，Vite 通过维护 Module Graph 记录模块之间的依赖关系。当文件发生变化时，Vite 不需要重新构建整个项目，而是根据模块关系找到受影响范围以及 HMR Boundary，只更新必要模块，因此能够保持较快的更新速度。

生产阶段由于目标变成用户加载性能，因此仍然需要 Bundle。Vite 使用 Rollup 完成生产构建，通过模块分析、Tree Shaking、代码拆分、压缩等方式生成最终静态资源。

因此，Vite 的核心设计思想可以总结为：

> 开发阶段利用浏览器原生 ES Module，减少传统 Bundle 工作，通过依赖预构建、import rewrite 和 HMR 提升开发体验；生产阶段继续利用成熟的 Bundle 技术生成高性能产物。Vite 的本质不是取消构建，而是重新划分开发阶段和生产阶段的构建职责。

后续 Vite 插件生命周期那一题会单独按照同样密度整理，不再把“微内核 + 插件 Hook”混入这一题。

## 第46题：Vite 的插件体系是什么？Vite Plugin 生命周期是如何工作的？

---

### 题目

Vite 为什么采用“微内核 + 插件化”的架构？Vite 插件在开发和生产构建过程中是如何参与整个流程的？

### 问题

请说明：

1. Vite 为什么需要插件体系？
2. Vite 的插件体系为什么称为微内核 + 插件化？
3. Vite Plugin 和 Rollup Plugin 的关系是什么？
4. 一个 Vite 插件的基本结构是什么？
5. Vite 插件生命周期中的核心 Hook 有哪些？
6. `resolveId`、`load`、`transform` 等 Hook 分别负责什么？
7. Vite 开发阶段和生产阶段插件执行流程有什么区别？
8. Vue、React、TypeScript 等能力是如何通过插件实现的？

---

### 回答要点

#### 1. Vite 为什么需要插件体系？

Vite 本身并不会把所有文件类型、框架语法和工程能力全部内置到核心代码中。

原因是现代前端项目中的资源类型非常复杂：

- JavaScript；
- TypeScript；
- Vue 单文件组件；
- React JSX；
- CSS；
- 图片字体等静态资源。

如果所有能力都直接写入 Vite 核心：

一方面会导致核心代码越来越复杂；

另一方面不同框架之间存在大量差异，Vite 很难针对所有场景维护。

因此 Vite 采用插件化设计：

> 核心只负责提供构建流程和生命周期机制，具体的文件解析、转换和扩展能力交给插件完成。

例如：

Vue 项目：

```text
.vue 文件

↓

@vitejs/plugin-vue

↓

转换成 JavaScript Module
```

React 项目：

```text
.jsx 文件

↓

@vitejs/plugin-react

↓

转换成浏览器可执行代码
```

因此插件体系本质解决的是：

> 如何让构建工具具备扩展能力，同时保持核心简单稳定。

---
#### 2. 什么是 Vite 的“微内核 + 插件化”架构？

微内核思想：

> 核心只保留最基本的调度能力，把具体功能通过插件扩展出去。

Vite 核心负责：

- Dev Server；
- 模块请求处理；
- Module Graph 管理；
- HMR；
- 插件生命周期调度；
- 生产构建流程组织。

而具体能力：

例如：

- Vue 文件解析；
- React JSX 转换；
- CSS 处理；
- 图片资源处理；

交给插件完成。

整体结构：

```text
                 Vite Core

        ┌─────────────────────┐

        插件生命周期调度

        Module Graph

        Dev Server

        HMR

↓

Vue Plugin   React Plugin   CSS Plugin
```

这样设计的优势：

第一，提高扩展能力。

新增一种文件类型，不需要修改 Vite 核心，只需要新增插件。

第二，提高维护性。

核心逻辑稳定，具体功能独立维护。

第三，提高生态兼容。

Vite 可以复用 Rollup 成熟的插件生态。

---
#### 3. Vite Plugin 和 Rollup Plugin 的关系是什么？

这是理解 Vite 插件体系的关键。

Vite 并不是完全重新设计了一套插件规范，而是在 Rollup Plugin 基础上进行了扩展。

原因：

Rollup 已经具备成熟的模块处理生命周期，例如：

- 模块解析；
- 模块加载；
- 代码转换；
- Bundle 输出。

因此 Vite 复用了 Rollup 的插件 API。

但是：

Vite 和 Rollup 工作阶段不同。

Rollup：

主要服务于：

> 生产构建阶段。

Vite：

需要同时支持：

- 开发服务器；
- 生产构建。

所以 Vite 在 Rollup Plugin 基础上增加了开发阶段相关 Hook。

例如：

开发阶段：

```text
configureServer

↓

transform

↓

HMR相关处理
```

生产阶段：

```text
buildStart

↓

resolveId

↓

load

↓

transform

↓

generateBundle
```

因此可以理解：

> Vite 插件兼容 Rollup 插件，同时扩展了开发服务器生命周期。

---
#### 4. 一个 Vite 插件的基本结构是什么？

一个最简单的 Vite 插件：

```javascript
export default function myPlugin() {
  return {
    name: 'my-plugin',

    transform(code, id) {
      return code
    }
  }
}
```

一个插件通常包含：
##### name

插件名称。

这是插件必须提供的信息。

用于：

- 标识插件；
- 调试；
- 日志输出。

---
##### 生命周期 Hook

插件真正工作的地方。

例如：

- 解析模块；
- 加载文件；
- 修改代码。

---
#### 5. Vite Plugin 的核心生命周期

Vite 插件生命周期可以按照模块处理流程理解：

```
模块请求

↓

resolveId

↓

load

↓

transform

↓

执行模块

↓

构建输出
```

---
#### 6. resolveId：模块解析阶段

`resolveId` 的作用：

> 判断一个 import 路径最终对应哪个模块。

例如：

代码：

```javascript
import Button from '@/components/Button.vue'
```

浏览器看到：

```text
@/components/Button.vue
```

但是它不知道：

@ 对应什么目录。

插件可以通过：

```text
resolveId

↓

解析路径

↓

返回真实文件位置
```

例如：

```text
@/components/Button.vue

↓

src/components/Button.vue
```

因此：

resolveId 解决：

> “这个模块在哪里？”

---
#### 7. load：模块加载阶段

resolveId 找到模块之后：

需要读取模块内容。

load 的作用：

> 根据模块 ID 获取模块源码。

例如：

请求：

```text
App.vue
```

插件：

读取：

```text
App.vue 文件内容
```

返回：

```javascript
<script>
export default {}
</script>
```

因此：

load 解决：

> “这个模块里面是什么内容？”

---
#### 8. transform：代码转换阶段

transform 是 Vite 插件中最常用的 Hook。

作用：

> 对读取后的源码进行转换。

例如：

Vue：

输入：

```vue
<template>
<div>Hello</div>
</template>
```

插件：

```text
Vue Compiler

↓

JavaScript
```

React：

输入：

```jsx
<div>Hello</div>
```

转换：

```javascript
React.createElement(...)
```

TypeScript：

输入：

```typescript
interface User{}
```

转换：

```javascript
JavaScript
```

因此：

transform 解决：

> “如何把某种源码转换成浏览器可以执行的代码？”

---
#### 9. Vite 开发阶段插件执行流程

开发阶段：

核心流程：

```text
浏览器请求模块

↓

Vite Dev Server 接收请求

↓

resolveId解析模块

↓

load读取模块

↓

transform转换代码

↓

返回浏览器
```

例如：

请求：

```text
App.vue
```

流程：

第一步：

Vue Plugin 通过 resolveId 找到文件。

第二步：

load 获取 Vue 文件内容。

第三步：

transform 调用 Vue Compiler。

第四步：

返回：

```javascript
App.js Module
```

浏览器执行。

---
#### 10. Vite 生产构建阶段插件执行流程

生产阶段：

Vite 使用 Rollup 构建。

流程：

```text
buildStart

↓

模块分析

↓

resolveId

↓

load

↓

transform

↓

Tree Shaking

↓

generateBundle
```

---
##### buildStart

构建开始时执行。

通常用于：

- 初始化状态；
- 创建缓存；
- 读取配置。

---
##### generateBundle

Bundle 即将生成时执行。

可以：

- 修改输出文件；
- 添加资源；
- 处理最终产物。

例如：

生成：

```text
dist/
 ├── index.js
 ├── style.css
```

插件可以在这里修改输出内容。

---
#### 11. Vue、React 等能力为什么都是插件？

因为 Vite 核心并不知道：

`.vue`

`.jsx`

`.tsx`

这些文件是什么意思。

例如：

Vite 核心看到：

```text
App.vue
```

它只知道：

这是一个文件。

但是：

Vue Plugin 知道：

```text
.vue

=

template
+
script
+
style
```

于是：

插件完成：

```text
.vue

↓

Vue Compiler

↓

JavaScript Module
```

React：

```text
.jsx

↓

Babel/SWC

↓

JavaScript
```

因此：

框架支持并不是 Vite 核心实现的，而是插件扩展出来的。

---

### 标准回答

Vite 采用的是一种微内核加插件化的架构设计。它的核心思想是：Vite 核心只负责构建流程管理、模块请求处理和生命周期调度，而具体的文件解析和代码转换能力通过插件扩展。

这样设计的原因是现代前端项目包含大量不同类型资源，例如 Vue 单文件组件、React JSX、TypeScript、CSS 和静态资源。如果所有能力都直接集成到 Vite 核心，会导致核心复杂度不断增加，同时难以适应不同框架的发展。因此 Vite 将这些能力拆分为独立插件。

Vite 插件体系主要基于 Rollup Plugin API，同时针对开发服务器场景进行了扩展。因为 Rollup 主要用于生产构建，而 Vite 还需要支持开发阶段的模块按需加载和 HMR，所以 Vite 在兼容 Rollup 生命周期的基础上增加了开发服务器相关能力。

一个 Vite 插件通常包含 name 和多个生命周期 Hook。最核心的模块处理流程可以理解为：

当浏览器请求一个模块时，Vite 首先通过 resolveId 确定模块位置，然后通过 load 获取模块内容，最后通过 transform 对源码进行转换，生成浏览器能够执行的 JavaScript Module。

例如 Vue 文件：

`.vue`

不是浏览器原生支持的模块格式，因此 Vue 插件会在 transform 阶段调用 Vue Compiler，将 Vue 单文件组件转换成 JavaScript 模块。

React JSX、TypeScript 等能力也是通过类似方式实现。

在开发阶段，插件主要参与 Dev Server 的模块处理流程：

浏览器请求模块后，Vite 调度插件完成模块解析、加载和转换，然后返回浏览器执行。

在生产阶段，Vite 调用 Rollup 完成 Bundle 构建，插件继续参与：

- 模块解析；
- 代码转换；
- Tree Shaking；
- Bundle 输出。

因此，Vite 的插件体系本质上体现了微内核设计：

> Vite 核心提供稳定的构建框架和生命周期机制，插件负责具体能力扩展。通过这种方式，Vite 可以支持不同框架和不同资源类型，同时保持核心简单、生态可扩展。

总结来说：

> Vite 通过“核心调度 + 插件扩展”的方式构建完整生态。开发阶段插件参与模块解析和实时转换，生产阶段插件参与 Rollup 构建流程。Vue、React、TypeScript 等能力本质上都是通过插件扩展实现的。

## 第47题 前端项目从源码到线上部署经历了哪些过程？

### 题目

一个 Vue / React 前端项目，从开发阶段的源码，到最终用户在浏览器中访问页面，中间完整经历了哪些过程？

### 问题

重点说明：

1. 开发环境和生产环境分别解决什么问题？
2. 构建工具在生产构建过程中做了什么？
3. 为什么需要代码转换、代码拆分、Tree Shaking 和压缩？
4. 构建完成以后到底生成了什么？
5. 这些静态资源如何通过 Nginx、CDN 等部署？
6. 用户访问线上页面以后，浏览器又经历了什么过程？
7. SPA 的 History 路由为什么需要服务器配置？

---

### 回答要点

这道题不要只回答成：

> `npm run build → dist → Nginx`

这样只能说明“做了什么”，没有把**前端工程从开发态变成生产态的完整链路**讲清楚。

更好的回答顺序是：

**开发源码 → 生产构建 → 产物优化 → 静态资源部署 → 浏览器请求资源 → 前端应用运行**

可以先记住整个链路：

```text
开发源码
   ↓
构建工具
   ↓
模块解析 / 代码转换
   ↓
Tree Shaking / Code Splitting / Minification
   ↓
生成 HTML / JS Chunk / CSS / 图片字体等静态资源
   ↓
部署到 Nginx / 对象存储 / CDN
   ↓
浏览器请求 index.html
   ↓
继续请求 JS / CSS / 图片等资源
   ↓
解析和执行 JavaScript
   ↓
框架挂载 + 前端路由接管
   ↓
页面运行
```

---
#### 1. 开发环境和生产环境的目标不同

首先要理解，**开发环境和生产环境解决的不是同一个问题。**

开发阶段最关心的是：

- 启动快；
- 修改代码后反馈快；
- HMR 快；
- Source Map 方便调试；
- 错误信息完整。

生产阶段最关心的是：

- 用户下载的资源尽可能小；
- 首屏需要加载的代码尽可能少；
- 网络请求合理；
- 浏览器能够高效缓存；
- 兼容目标浏览器；
- 最终资源适合部署。

所以现代构建工具通常会针对两个阶段采取不同策略。

以 Vite 为例，开发阶段提供 Dev Server 和基于 ESM 的模块服务；执行 `vite build` 时则进入生产构建，输出适合静态托管的生产资源。当前 Vite 官方文档已经将生产 Bundler 描述为 **Rolldown**；旧版本 Vite 长期使用的是 Rollup，所以前面整理的“Vite 生产阶段使用 Rollup”属于旧版本体系。([vitejs](https://vite.dev/guide/?utm_source=chatgpt.com))

这一点在后面的题目里最好统一更新。

---
#### 2. 为什么源码不能简单原样放到服务器？

开发时项目里通常存在很多工程化代码：

```text
src/
├── main.ts
├── App.vue
├── router/
├── stores/
├── components/
├── styles/
└── assets/
```

这里面可能包含：

- Vue SFC；
- JSX / TSX；
- TypeScript；
- CSS Modules；
- Sass/Less；
- npm 包；
- 动态 `import()`；
- 图片、字体等资源引用。

浏览器最终真正需要的是：

```text
HTML、CSS、JavaScript、图片、字体、其他静态资源
```

因此需要通过构建工具把：

> **适合开发和维护的工程源码**

转换成：

> **适合浏览器下载和执行的生产资源。**

这就是生产构建最核心的目的。

---
#### 3. 生产构建具体经历哪些过程？

前面第 43 题已经讲过 Bundler 的生产构建模型，因此这里不要重新把所有内部细节讲一遍，而是放到整个“上线链路”中理解。

可以概括成：

```text
确定入口
  ↓
解析模块
  ↓
建立依赖关系
  ↓
代码转换
  ↓
模块优化
  ↓
Chunk 划分
  ↓
代码压缩
  ↓
资源输出
```

现代 Bundler 的生产流程可以用“模块分析 → Chunk 划分 → 优化 → 输出”来理解，但具体实现因构建工具不同而不同。`Chrome浏览器渲染原理_前四十五题整理(3).md`

---
#### 4. 模块解析和依赖分析

例如：

```javascript
// main.ts
import { createApp } from 'vue'
import App from './App.vue'
import router from './router'

createApp(App).use(router).mount('#app')
```

构建工具需要知道：

```text
main.ts
 ├─ vue
 ├─ App.vue
 │   ├─ Header.vue
 │   └─ Home.vue
 └─ router
     ├─ Home.vue
     └─ User.vue
```

也就是说，需要分析：

- 一个模块依赖哪些模块；
- 哪些是静态依赖；
- 哪些是动态依赖；
- 哪些资源属于入口；
- 哪些模块可以共享。

最终形成整个应用的模块依赖关系。

---
#### 5. 代码和资源转换

项目源码并不一定直接就是最终 JavaScript。

例如：

```text
.vue
 ↓
Vue Compiler
 ↓
JavaScript

.ts / .tsx
 ↓
语法转换
 ↓
JavaScript

.scss
 ↓
CSS 预处理
 ↓
CSS
```

以 Vue 为例：

```vue
<template>
  <button @click="count++">
    {{ count }}
  </button>
</template>
```

浏览器并不认识 `.vue` 文件。

Vue 插件需要通过 Vue Compiler 把它转成 JavaScript 模块。

这也正好承接上一题的 Vite Plugin：

```text
模块
 ↓
resolve
 ↓
load
 ↓
transform
 ↓
转换后的 JavaScript Module
```

也就是说：

> **插件体系负责“不同资源怎么处理”，Bundler 负责“整个项目怎么组织和构建”。**

这正是第 46 题插件体系和第 47 题生产构建之间的关系。`Chrome浏览器渲染原理_前四十五题整理(3).md`

---
#### 6. Tree Shaking

模块分析完成以后，并不是所有源码最终都需要进入生产包。

例如：

```javascript
// utils.js
export function add() {}

export function remove() {}

export function update() {}
```

业务只使用：

```javascript
import { add } from './utils'
```

那么构建器可以分析：

```text
add       → 被使用
remove    → 未使用
update    → 未使用
```

在满足安全删除条件时，把没有使用的代码从生产构建结果中移除。

这就是：

> **Tree Shaking。**

Tree Shaking 主要依赖 ES Module 静态 `import/export` 的可分析性，同时还要考虑模块副作用，不能简单理解成“没有 import 的函数一定会被删掉”。`Chrome浏览器渲染原理_前四十五题整理(3).md`

它解决的问题是：

> **哪些代码根本不需要进入生产包？**

---
#### 7. Code Splitting

如果整个项目最终全部打成：

```text
app.js
10 MB
```

那么用户第一次进入首页，就必须先下载整个应用的 10 MB JavaScript。

但实际上用户可能只访问首页。

例如：

```javascript
const User = () => import('./views/User.vue')
```

构建工具可以将它拆成独立 Chunk：

```text
index.js、vendor.js、home.js、user.js、admin.js
```

首次进入首页只加载：

```text
index.js、vendor.js、home.js
```

等用户真正进入 `/user`：

```text
/user
 ↓
动态 import
 ↓
请求 user.js
```

所以 Code Splitting 解决的是：

> **代码应该怎样拆开，以及什么时候加载。**

Vite 的生产构建也会针对异步 Chunk 处理 CSS 拆分和相关 preload 优化。([vitejs](https://vite.dev/guide/features?utm_source=chatgpt.com))

---
#### 8. Minification

Tree Shaking 删除的是：

> **不需要的代码。**

Minification 处理的是：

> **需要保留的代码还能不能进一步变小。**

例如开发代码：

```javascript
function calculateUserScore(userScore, bonusScore) {
  const finalScore = userScore + bonusScore
  return finalScore
}
```

生产代码可能被压缩成类似：

```javascript
function a(b,c){return b+c}
```

同时还可能：

- 删除空格；
- 删除换行；
- 删除注释；
- 缩短局部变量名；
- 简化表达式；
- 合并部分语句。

因此三者一定要区分：

| 优化 | 解决的问题 |
|---|---|
| Code Splitting | 代码怎么拆、什么时候加载 |
| Tree Shaking | 哪些代码不用，可以删除 |
| Minification | 剩下的代码怎样进一步变小 |

这一组区别在前面的构建题中已经建立，可以直接沿用。`Chrome浏览器渲染原理_前四十五题整理(3).md`

---
#### 9. 最终会生成什么？

执行：

```bash
npm run build
```

对于默认 Vite 项目，最终通常生成：

```text
dist/
├── index.html
└── assets/
    ├── index-D7a8f3.js
    ├── vendor-C9fd21.js
    ├── User-B81a3c.js
    ├── index-A3c2d1.css
    └── logo-F281da.png
```

Vite 官方默认生产输出目录是 `dist`，但可以通过 `build.outDir` 修改，因此 `dist` 只是默认值，并不是前端规范强制规定。([vitejs](https://vite.dev/guide/static-deploy.html?utm_source=chatgpt.com))

最终产物本质上就是：

```text
HTML + JavaScript Chunk + CSS + 图片 + 字体 + 其他静态资源
```

---
#### 10. 为什么生产资源文件名经常带 Hash？

例如：

```text
index-D7a8f3.js
```

而不是：

```text
index.js
```

这是为了配合浏览器缓存。

假设第一次部署：

```text
index-AAA.js
```

用户浏览器缓存：

```text
index-AAA.js
```

后来代码发生改变。

重新构建：

```text
index-BBB.js
```

HTML 中引用也变成：

```html
<script src="/assets/index-BBB.js"></script>
```

浏览器发现这是一个新的 URL，就会重新请求。

没有变化的资源：

```text
vendor-CCC.js
```

文件名可能保持不变，就仍然能够复用浏览器/CDN 缓存。

Vite 会把参与构建资源图的静态资源生成带 hash 的文件名。([vitejs](https://vite.dev/guide/assets.html?utm_source=chatgpt.com))

所以生产环境常见的缓存策略就是：

```text
HTML
→ 不长期强缓存 / 每次验证

带内容 Hash 的 JS、CSS、图片
→ 长期强缓存
```

这也和前面的 HTTP 缓存题能够串起来。

---
#### 11. 构建完成以后怎么部署？

对于普通 CSR SPA 来说，构建完成以后已经没有：

```text
.vue、.ts、.tsx
```

这些开发源码的运行需求。

真正需要部署的是：

```text
dist/
```

也就是说：

> **普通前端 SPA 的生产产物，本质上是一组静态资源。**

Vite 官方也明确说明，`vite build` 默认生成的应用 Bundle 可以交给静态托管服务，默认 `dist` 可以部署到相应的平台。([vitejs](https://vite.dev/guide/build?utm_source=chatgpt.com))

---
#### 12. Nginx 在这里负责什么？

例如服务器：

```text
/var/www/app/
├── index.html
└── assets/
```

可以通过 Nginx：

```nginx
server {
    listen 80;
    server_name example.com;

    root /var/www/app;

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

用户访问：

```text
https://example.com
```

请求先到：

```text
Nginx
```

Nginx 查找：

```text
index.html
```

然后把 HTML 返回给浏览器。

浏览器解析 HTML：

```html
<script type="module" src="/assets/index-D7a8f3.js"></script>
<link rel="stylesheet" href="/assets/index-A3c2d1.css">
```

然后继续请求：

```text
index-D7a8f3.js
index-A3c2d1.css
```

所以：

```text
浏览器
   ↓
Nginx
   ↓
静态资源
```

Nginx 在这种场景下主要充当：

> **静态资源服务器和 Web 入口。**

当然实际项目中还经常承担：

- HTTPS；
- gzip / Brotli；
- Cache-Control；
- API 反向代理；
- 负载均衡等。

---
#### 13. CDN 又处于什么位置？

大型项目通常不会让所有用户都直接访问源站。

而是：

```text
                 ┌── CDN 北京节点
浏览器 ──→ CDN ──┼── CDN 上海节点
                 ├── CDN 东京节点
                 └── CDN 新加坡节点
                       ↓
                     源站
```

例如 JS：

```text
/assets/index-D7a8f3.js
```

第一次访问时：

```text
用户
 ↓
CDN
 ↓ 未命中
源站
 ↓
返回资源
 ↓
CDN缓存
 ↓
用户
```

后续用户：

```text
用户
 ↓
CDN边缘节点
 ↓
直接返回
```

所以 CDN 主要解决：

> **让静态资源离用户更近，并通过边缘缓存减少访问延迟和源站压力。**

---
#### 14. History 路由为什么上线以后容易 404？

这是前端部署里非常高频的追问。

例如 Vue Router 使用 History 模式：

```text
https://example.com/user/123
```

如果用户从首页进入 `/user/123`：

```text
index.html
 ↓
Vue Router
 ↓
切换 User 页面
```

这没有问题。

但如果用户直接刷新：

```text
https://example.com/user/123
```

浏览器会真正向服务器发：

```http
GET /user/123
```

Nginx 默认会在服务器上找：

```text
/user/123
```

但是服务器里实际只有：

```text
index.html
assets/
```

根本没有 `/user/123` 文件。

于是：

```text
404
```

---
##### 正确处理方式

配置：

```nginx
location / {
    try_files $uri $uri/ /index.html;
}
```

含义可以理解成：

```text
请求 /user/123

先找真实文件 /user/123
        ↓
      没有
        ↓
返回 /index.html
        ↓
浏览器启动 Vue/React
        ↓
前端 Router 读取 /user/123
        ↓
匹配 User 页面
```

Nginx 官方对 `try_files` 的定义就是按顺序检查文件，如果均不存在，则内部重定向到最后指定的 URI。([Nginx](https://nginx.org/en/docs/http/ngx_http_core_module.html?utm_source=chatgpt.com))

所以 History 模式的核心不是：

> “Nginx 帮 Vue Router 做路由。”

而是：

> **Nginx 把不存在的前端路由统一回退给 `index.html`，真正的路由匹配仍然由前端 Router 完成。**

---
#### 15. 浏览器拿到生产资源以后发生什么？

这时又可以和最开始的浏览器渲染原理串起来。

```text
用户输入 URL
 ↓
DNS
 ↓
TCP / TLS
 ↓
HTTP
 ↓
获取 index.html
 ↓
解析 HTML
 ↓
发现 CSS / JS
 ↓
继续请求静态资源
 ↓
CSSOM / DOM
 ↓
执行 JavaScript
 ↓
Vue / React 初始化
 ↓
组件渲染
 ↓
Render / Layout / Paint / Composite
 ↓
页面显示
```

如果使用 SPA：

```text
Vue / React 启动
      ↓
Router 初始化
      ↓
读取当前 URL
      ↓
匹配路由组件
      ↓
渲染页面
```

因此这里其实把前面的几个知识体系串在了一起：

```text
构建工具
   ↓
部署
   ↓
HTTP
   ↓
浏览器加载
   ↓
浏览器渲染
   ↓
框架运行
```

---

### 标准回答

如果面试官问我一个前端项目从源码到线上部署经历了哪些过程，我会把它分成 **开发、生产构建、部署和浏览器运行四个阶段**。

首先是开发阶段。我们实际开发的代码通常包含 Vue 单文件组件、TypeScript、JSX、CSS 预处理器以及 npm 模块等工程化内容，这些代码是为了方便开发和维护，并不等于最终直接部署给浏览器的资源。开发环境更关注启动速度、HMR、Source Map 和调试体验。

真正上线之前会执行生产构建。构建工具会从入口开始分析模块之间的依赖关系，然后通过插件或者编译器处理 Vue、JSX、TypeScript、CSS 等不同类型的源码，再根据依赖关系进行 Chunk 划分和代码优化。

生产优化里面几个比较重要的概念是 **Tree Shaking、Code Splitting 和 Minification**。Tree Shaking 主要删除满足安全删除条件的未使用代码；Code Splitting 是把整个应用拆成多个 Chunk，让路由或者功能模块可以按需加载，而不是首屏一次性下载所有 JavaScript；Minification 则继续对保留下来的代码做压缩，减少传输体积。

构建完成以后，普通 SPA 最终会生成 HTML、JavaScript Chunk、CSS、图片和字体等静态资源。以 Vite 为例，默认会输出到 `dist`，并且参与构建的资源通常会带内容 hash，这样资源变化以后 URL 会跟着变化，可以很好地配合浏览器和 CDN 的长期缓存。Vite 官方当前版本的生产构建底层已经采用 Rolldown，旧版本长期使用的是 Rollup。([vitejs](https://vite.dev/guide/?utm_source=chatgpt.com))

接下来是部署阶段。对于普通 CSR 项目，本质上就是把这些构建后的静态资源部署到 Nginx、对象存储或者 CDN，而不是把 `.vue`、`.ts` 这些源码直接部署出去。Nginx 可以负责返回 `index.html`、JavaScript、CSS 等资源，同时还可以处理 HTTPS、缓存、压缩以及 API 反向代理。Vite 官方也把默认生产输出定位成可以直接用于静态托管的应用资源。([vitejs](https://vite.dev/guide/static-deploy.html?utm_source=chatgpt.com))

用户访问网站以后，浏览器首先请求 `index.html`，解析 HTML 后发现其中引用的 JavaScript、CSS、图片等资源，再继续发起请求。JavaScript 下载并执行以后，Vue 或 React 启动，Router 根据当前 URL 匹配组件，然后完成应用挂载和页面渲染。

如果项目使用的是 History 路由，还需要服务端做 fallback。例如直接访问 `/user/123` 时，这其实是一个真实的 HTTP 请求，但服务器上不存在 `/user/123` 文件，所以 Nginx 一般会通过 `try_files` 把没有匹配到真实静态文件的请求回退到 `index.html`，再由 Vue Router 或 React Router 完成真正的前端路由匹配。([Nginx](https://nginx.org/en/docs/http/ngx_http_core_module.html?utm_source=chatgpt.com))

所以整个流程可以收敛成：

```text
开发源码
  ↓
模块解析与代码转换
  ↓
Tree Shaking / Code Splitting / Minification
  ↓
HTML + JS Chunk + CSS + 静态资源
  ↓
Nginx / CDN 部署
  ↓
浏览器请求 index.html
  ↓
加载 JS / CSS
  ↓
框架和 Router 初始化
  ↓
页面渲染
```

一句话总结就是：

> **前端上线的本质，是把面向开发的模块化工程源码，通过生产构建转换、拆分和优化成适合浏览器加载的静态资源，再通过 Web Server/CDN 对外提供；浏览器获取入口 HTML 后继续加载相关资源，执行框架代码并完成页面渲染。**
##### 高频关键词

`development`、`production`、模块依赖、代码转换、Bundler、Rolldown、Tree Shaking、Code Splitting、Minification、Chunk、Content Hash、`dist`、静态资源、Nginx、CDN、缓存、History Router、`try_files`、SPA
##### 易追问

- Tree Shaking、Code Splitting 和 Minification 有什么区别？
- 为什么生产文件需要 hash？
- 为什么 HTML 和带 hash 的 JS 缓存策略不一样？
- CDN 和 Nginx 分别解决什么问题？
- 为什么 History 路由刷新会 404？
- `try_files` 到底做了什么？
- 为什么 `vite preview` 不能作为正式生产服务器？
- Vite 当前生产构建为什么从 Rollup 转向 Rolldown？

其中有一个知识点需要同步修正：你前面第 45、46 题目前写的是 **Vite 生产阶段使用 Rollup**。当前 Vite 官方文档已经改为 **Rolldown**，后续整理时建议统一改成“旧版本 Rollup，当前版本 Rolldown”，避免面试时回答成过时版本。([vitejs](https://vite.dev/guide/build.html?utm_source=chatgpt.com))

---

**Sources:**

- [Getting Started | Vite](https://vite.dev/guide/?utm_source=chatgpt.com)
- [Module ngx_http_core_module](https://nginx.org/en/docs/http/ngx_http_core_module.html?utm_source=chatgpt.com)

## 第48题 前端完整缓存体系是怎样工作的？浏览器缓存、CDN、Nginx 和 Service Worker 分别处于什么位置？

### 题目

一个前端项目构建并部署上线以后，静态资源从源站到最终用户浏览器，中间可能同时经过 **Nginx、CDN、浏览器 HTTP 缓存以及 Service Worker 缓存**。

请从完整请求链路出发，说明前端缓存体系是怎样工作的，以及这些缓存层分别解决什么问题。

### 问题

重点说明：

1. **前端静态资源通常部署在哪里？**
   - 前端构建后的 HTML、JS、CSS、图片、字体等静态资源通常如何部署？
   - Nginx 和后端应用服务器是否一定需要分开部署？
   - 静态资源是否需要部署到每一台后端业务服务器？

2. **Nginx 在静态资源体系中的作用是什么？**
   - Nginx 如何根据 URL 返回静态文件？
   - Nginx 除了静态资源托管，还可以承担哪些能力？
   - API 请求为什么又可以通过 Nginx 反向代理到后端应用服务器？
   - 多个后端实例如何通过 Nginx 做负载均衡？

3. **CDN 和 Nginx 是什么关系？**
   - CDN 能不能直接托管 JS、CSS、图片、字体等静态资源？
   - 如果源站使用 Nginx，CDN 第一次访问资源时发生什么？
   - 什么叫 **CDN 回源**？
   - CDN 命中缓存以后，请求还会不会到达 Nginx？
   - 为什么 CDN 能降低源站压力和用户访问延迟？

4. **一个静态资源请求的完整链路是什么？**

   例如：

   ```text
   浏览器
      ↓
   CDN
      ↓
   Nginx / 源站
   ```

   需要说明 CDN **命中**和**未命中**时，请求路径分别是什么。

5. **浏览器缓存和 CDN 缓存是什么关系？**
   - 浏览器缓存解决什么问题？
   - CDN 缓存解决什么问题？
   - 两者能否同时存在？
   - 如果浏览器已经命中强缓存，请求还会不会发送到 CDN？
   - 如果浏览器需要重新验证资源，请求又会经过哪些节点？

6. **前端常见的浏览器 HTTP 缓存机制是什么？**
   - 强缓存与协商缓存分别是什么？
   - `Cache-Control`、`max-age`、`no-cache`、`no-store` 分别是什么？
   - `ETag / If-None-Match` 和 `Last-Modified / If-Modified-Since` 如何工作？
   - 为什么生产环境中的 JS/CSS 通常采用长缓存？

7. **为什么构建后的 JS、CSS 文件通常带 Hash？**

   例如：

   ```text
   app.a81f32.js
   ```

   需要说明：

   - Hash 和浏览器缓存是什么关系？
   - 为什么文件发生变化以后可以生成新的 URL？
   - 为什么带 Hash 的资源适合：

   ```http
   Cache-Control: max-age=31536000, immutable
   ```

8. **为什么 `index.html` 一般不能和 JS/CSS 使用完全相同的长期缓存策略？**
   - HTML 为什么需要更及时地获取新版本？
   - HTML 和带 Hash 静态资源之间是什么引用关系？
   - 如果 HTML 被 CDN 或浏览器长时间缓存，为什么可能出现“发布了新版本但用户仍然看到旧页面”？

9. **线上更新后仍然出现旧资源，应该如何排查？**

   需要考虑：

   - 浏览器缓存；
   - CDN 缓存；
   - HTML 是否更新；
   - HTML 引用的 JS Hash 是否正确；
   - CDN 是否已经刷新；
   - 多个源站节点版本是否一致；
   - 部署顺序是否正确。

10. **Service Worker 和普通 HTTP 缓存有什么区别？**
    - Service Worker 为什么可以拦截请求？
    - Cache Storage 是什么？
    - 为什么说 Service Worker 是一种**可编程缓存**？
    - 它和 `Cache-Control / ETag` 这种 HTTP 缓存最大的区别是什么？

11. **Service Worker 为什么能够实现离线访问和 PWA？**

    需要说明类似下面的流程：

    ```text
    页面请求资源
        ↓
    Service Worker 拦截 fetch
        ↓
    Cache Storage 是否存在
       ↙       ↘
     存在       不存在
      ↓           ↓
    返回缓存     请求网络
    ```

    以及为什么即使断网：

    ```text
    Network ❌
       ↓
    Cache Storage
       ↓
    返回页面资源
    ```

    应用仍然可以展示部分内容。

12. **Service Worker 常见的缓存策略有哪些？**
    - Cache First
    - Network First
    - Stale While Revalidate

    分别适合什么资源？

13. **普通 Vue / React 项目为什么通常不一定需要 Service Worker？**
    - 浏览器 HTTP 缓存 + CDN 为什么已经能满足大多数普通 Web 项目？
    - 什么情况下才真正需要 Service Worker？
    - PWA、离线访问、弱网场景、可编程缓存分别属于什么需求？

---
#### 这道题的核心考察方向

不要把这道题回答成几个独立定义，而是要能够建立一条完整的缓存链路：

```text
                ┌──────── 浏览器 HTTP Cache
                │
用户浏览器 ──────┤
                │
                └──────── Service Worker / Cache Storage
                         ↓
                       CDN
                         ↓
                      Nginx
                         ↓
                后端应用服务器
```

最终要能解释清楚四层职责：

```text
浏览器缓存
→ 减少用户本机重复请求

Service Worker
→ 可编程地决定请求走缓存还是网络

CDN
→ 在离用户更近的边缘节点缓存资源

Nginx
→ 源站静态资源服务 + 反向代理 + 负载均衡
```

这道题适合作为第 **48 题**。它正好承接上一题“前端源码 → 构建 → Nginx/CDN 部署”，然后把其中的 **线上静态资源访问和缓存机制单独展开成一套完整体系**。

### 回答要点

#### 1. 完整缓存链路

这道题的核心不是分别背四种技术，而是先建立一条完整链路：

```text
构建后的前端静态资源
        ↓
源站：Nginx / 对象存储等
        ↓
CDN 边缘节点
        ↓
Internet
        ↓
浏览器
 ├─ HTTP Cache
 └─ Service Worker + Cache Storage
        ↓
页面运行
```

但这里有一个很重要的点：

> **这不是严格意义上的四级串行缓存。**

浏览器 HTTP Cache 属于浏览器网络栈管理的 HTTP 缓存；Service Worker 是一个**可编程的请求拦截层**，它可以自己访问 Cache Storage，也可以继续 `fetch()` 网络，而网络请求过程中仍可能使用浏览器 HTTP Cache。CDN 则是浏览器之外的共享缓存层，Nginx 可以是源站，也可以是反向代理入口。

所以更准确的理解是：

```text
浏览器内部
┌────────────────────────────┐
│ 页面请求                    │
│    ↓                       │
│ Service Worker（如果存在） │
│   ↙              ↘        │
│ Cache Storage     fetch()  │
│                     ↓      │
│               HTTP Cache   │
└─────────────────────┬──────┘
                      ↓
                     CDN
                      ↓
                   Origin
              Nginx / Object Storage
                      ↓
               Backend Application
```

---
#### 2. 先把 Nginx、CDN 和后端服务器的关系说清楚

##### 前端静态资源一定部署在 Nginx 吗？

**不一定。**

这是前面讨论里最需要修正的一点。

Vue、React 项目生产构建以后，一般生成：

```text
dist/
├── index.html
└── assets/
    ├── index-a81f3.js
    ├── index-71a2.css
    └── logo-f31a.png
```

这些本质上都是静态文件。

它们可以部署在：

- Nginx；
- Apache；
- 对象存储；
- CDN 静态托管；
- 云平台静态站点；
- Node Server；
- 甚至后端应用自身的 static 目录。

所以不能回答：

> “现代前端一定有一台 Nginx 服务器。”

正确说法应该是：

> **Nginx 是非常常见的 Web Server 和反向代理方案，但不是前端部署的必选组件。**

---
#### 3. 为什么实际项目经常看到 Nginx + 后端应用服务器？

因为前端静态资源和动态业务请求的特点完全不同。

例如：

```text
GET /assets/index-a81f3.js
```

只需要找到磁盘上的文件然后返回。

而：

```text
POST /api/orders
```

可能需要：

```text
权限校验
 ↓
业务逻辑
 ↓
数据库
 ↓
Redis
 ↓
RPC
 ↓
生成响应
```

因此常见架构会把两种请求分开：

```text
                     ┌→ 静态资源
浏览器 → Nginx ──────┤
                     │
                     └→ /api/*
                           ↓
                       Spring Boot
                       Node
                       Go
                       ...
```

Nginx 官方的 `root` / `alias` 能够把 URL 映射到服务器上的静态文件；而 `proxy_pass` 则可以把请求代理给其他服务器。([Nginx](https://nginx.org/en/docs/http/ngx_http_core_module.html?utm_source=chatgpt.com))

例如：

```nginx
server {
    root /var/www/frontend;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api/ {
        proxy_pass http://backend;
    }
}
```

这里：

```text
/assets/app.js
    ↓
Nginx直接返回

/api/users
    ↓
Nginx
    ↓
backend
```

---
#### 4. 后端有多台服务器时怎么办？

例如有三台 Spring Boot：

```text
Backend 1、Backend 2、Backend 3
```

可以配置：

```nginx
upstream backend {
    server 10.0.0.1:8080;
    server 10.0.0.2:8080;
    server 10.0.0.3:8080;
}

location /api/ {
    proxy_pass http://backend;
}
```

请求：

```text
              ┌→ Backend 1
浏览器 → Nginx ├→ Backend 2
              └→ Backend 3
```

所以 Nginx 可以承担：

> **反向代理 + 负载均衡。**

NGINX 官方也明确将反向代理用于把请求交给应用服务器以及实现负载分发。([NGINX 文档](https://docs.nginx.com/nginx/admin-guide/web-server/reverse-proxy?utm_source=chatgpt.com))

---
#### 5. 那前端静态资源是不是只需要部署一次？

在一种典型前后端分离架构下，可以这样理解：

```text
              Nginx
             /     \
       前端dist     /api
                     ↓
              Backend 1
              Backend 2
              Backend 3
```

前端资源放在静态资源服务器或者 CDN 上：

```text
index.html、app.xxx.js、app.xxx.css
```

后端服务器只运行：

```text
Java / Node / Go
业务代码
```

因此确实：

> **没有必要在每一台后端应用服务器上重复部署前端静态资源。**

但是不能把它说成绝对规则。

有些项目会：

```text
Spring Boot jar
 └─ static/
     └─ 前端资源
```

或者整个前后端打进同一个 Docker Image。

所以面试中更准确的表述是：

> 在典型前后端分离架构中，前端构建产物通常由独立的静态资源服务或 CDN 提供，后端应用部署多个实例处理动态业务，两者没有必要部署在同一台服务器上。

---
#### 6. CDN 和 Nginx 到底是什么关系？

这是这一题最重要的一层。

假设：

```text
源站：
www.example.com
        ↓
Nginx
        ↓
/assets/app-a81f3.js
```

如果接入 CDN：

```text
用户
 ↓
CDN Edge
 ↓
Nginx Origin
```

也就是说：

> **Nginx 可以充当 Origin Server（源站），CDN 位于用户和源站之间。**

---
#### 7. 第一次访问 CDN 静态资源会发生什么？

用户请求：

```text
https://cdn.example.com/app-a81f3.js
```

CDN 节点检查：

```text
CDN Cache

有没有 app-a81f3.js？
```

如果没有：

```text
Cache MISS
```

那么：

```text
用户
 ↓
CDN
 ↓ MISS
Nginx / Origin
 ↓
app-a81f3.js
 ↓
CDN
 ↓
用户
```

CDN 同时把资源保存下来。

这就是：

> **回源。**

Cloudflare 对 `MISS` 的定义就是：资源不在 CDN Cache，因此需要从 Origin 获取；而 `HIT` 表示资源已经存在于边缘缓存中。([Cloudflare Docs](https://developers.cloudflare.com/cache/concepts/cache-responses/?utm_source=chatgpt.com))

---
#### 8. 第二个用户再访问会怎么样？

假设 CDN Cache 还有效：

```text
User A
 ↓
Tokyo CDN
 ↓ HIT
直接返回 app.js
```

此时：

```text
Nginx
```

根本不会收到这个请求。

因此 CDN 的两个主要作用就是：
##### 降低网络延迟

原来：

```text
日本用户
 ↓
中国源站
```

现在：

```text
日本用户
 ↓
东京 CDN 节点
```

资源离用户更近。
##### 降低源站压力

假设：

```text
100 万次 app.js 请求
```

大部分：

```text
CDN HIT
```

源站可能只承担非常少的一部分回源请求。

---
#### 9. CDN 和浏览器缓存有什么区别？

这是第二个高频追问。
##### 浏览器缓存

缓存位置：

```text
用户自己的电脑
```

解决：

> **同一个用户重复访问资源的问题。**

例如：

```text
第一次访问
Browser → CDN → Origin

第二次访问
Browser Cache → 直接使用
```

---
##### CDN 缓存

缓存位置：

```text
CDN 边缘服务器
```

解决：

> **大量不同用户访问同一个资源的问题。**

例如：

```text
User A ─┐
User B ─┼→ Tokyo CDN → Origin
User C ─┘
```

CDN 缓存一次以后，可以服务大量用户。

---
##### 因此两者关系是

```text
浏览器缓存
→ 用户级缓存

CDN
→ 大量用户共享的边缘缓存
```

HTTP `Cache-Control` 本身既可以控制浏览器这样的私有缓存，也可以控制 CDN/Proxy 这样的共享缓存。([MDN Web Docs](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Cache-Control?utm_source=chatgpt.com))

---
#### 10. 如果浏览器强缓存命中了，请求还会到 CDN 吗？

不会。

例如之前返回：

```http
Cache-Control: max-age=31536000
```

浏览器发现：

```text
app.a81f3.js
仍然 fresh
```

那么：

```text
页面
 ↓
Browser HTTP Cache
 ↓
直接返回
```

不会出现：

```text
Browser → CDN
```

也更不会：

```text
Browser → CDN → Nginx
```

这也是为什么：

> **离用户越近的缓存命中，节省的成本越大。**

---
#### 11. 浏览器缓存完整机制

国内面试通常把 HTTP Cache 分成：

```text
强缓存 + 协商缓存
```

如果按照 HTTP 标准术语，更准确的是：

```text
Freshness
+
Validation / Revalidation
```

但面试回答使用“强缓存/协商缓存”没有问题。

---
#### 12. 强缓存是什么？

服务器第一次：

```http
HTTP/1.1 200 OK
Cache-Control: max-age=3600
```

表示该响应可以在一定时间内保持新鲜。

之后再次请求：

```text
浏览器判断缓存仍 fresh
        ↓
直接使用缓存
```

不访问网络。

---
#### 13. Cache-Control 几个关键词一定要分清

##### `max-age`

```http
Cache-Control: max-age=3600
```

表示缓存的 freshness lifetime。

---
##### `no-cache`

这个名字非常容易答错。

它不是：

> 不允许缓存。

而是：

> **可以存储，但是复用之前必须向服务器验证。**

例如：

```text
Browser Cache
    ↓
有缓存
    ↓
必须 Revalidate
    ↓
Server
```

MDN 也明确指出 `no-cache` 的作用是强制验证，而不是完全禁止存储。([MDN Web Docs](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Caching?utm_source=chatgpt.com))

---
##### `no-store`

这个才是：

> **不要存储这个响应。**

例如：

```http
Cache-Control: no-store
```

适合非常敏感、确实不希望持久缓存的内容。

---
##### `private`

```http
Cache-Control: private
```

允许：

```text
Browser Cache
```

但是不应该存入：

```text
CDN / Shared Cache
```

常见于个性化内容。

---
##### `public`

允许共享缓存存储。

---
##### `s-maxage`

这个很适合 CDN 题里补一句。

```http
Cache-Control: max-age=60, s-maxage=3600
```

可以理解成：

```text
Browser
→ 60 秒

Shared Cache / CDN
→ 3600 秒
```

因为 `s-maxage` 针对共享缓存。

---
#### 14. 协商缓存是什么？

缓存已经存在，但是不能直接相信它还新鲜：

```text
Browser
 ↓
带验证条件
 ↓
Server
```

常见两套机制。

---
##### ETag

第一次：

```http
HTTP/1.1 200 OK
ETag: "abc123"
```

浏览器保存：

```text
资源 + ETag
```

下一次：

```http
If-None-Match: "abc123"
```

服务器比较当前版本：
###### 没变化

```http
304 Not Modified
```

没有响应 Body。

浏览器继续使用旧资源。
###### 变化了

```http
200 OK
ETag: "xyz789"

新的资源
```

MDN 将 ETag 定义为资源特定版本的标识，`If-None-Match` 可以用于重新验证缓存；匹配时可返回 `304`。([MDN Web Docs](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/ETag?utm_source=chatgpt.com))

---
#### 15. Last-Modified

服务器：

```http
Last-Modified: Sat, 22 Aug 2026 03:20:00 GMT
```

浏览器下次：

```http
If-Modified-Since: Sat, 22 Aug 2026 03:20:00 GMT
```

如果没变：

```http
304
```

发生变化：

```http
200 + 新资源
```

`Last-Modified` 是基于修改时间的验证器，精确程度通常不如 ETag。([MDN Web Docs](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Last-Modified?utm_source=chatgpt.com))

所以一般可以回答：

```text
ETag / If-None-Match
→ 内容版本验证

Last-Modified / If-Modified-Since
→ 修改时间验证
```

而不是死记：

> “ETag 优先级就是比 Last-Modified 高。”

更准确是如果条件请求中同时存在相关验证条件，HTTP 规范规定了对应处理规则；从缓存实践角度，ETag 往往能提供更细粒度的版本验证。([MDN Web Docs](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Caching?utm_source=chatgpt.com))

---
#### 16. 为什么生产 JS/CSS 一定喜欢加 Hash？

假设没有 Hash：

```text
app.js
```

浏览器：

```text
app.js
→ 缓存一年
```

现在你发布了新代码：

```text
app.js
```

但是 URL 没变。

浏览器可能仍然认为：

```text
app.js
=
旧资源
```

这就非常麻烦。

---

采用内容 Hash：

```text
旧版本：
app.a81f3.js

新版本：
app.e71ab.js
```

代码改变：

```text
content
 ↓
hash改变
 ↓
URL改变
```

浏览器看到：

```text
app.e71ab.js
```

这是一个完全不同的 URL，自然重新请求。

这个机制通常叫：

> **Cache Busting。**

MDN 也把“内容改变时改变 URL”作为长期缓存静态资源的典型策略。([MDN Web Docs](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Caching?utm_source=chatgpt.com))

---
#### 17. 所以 JS/CSS 可以怎么缓存？

对于：

```text
app.a81f3.js、style.813aa.css、logo.79adb.png
```

可以采用：

```http
Cache-Control: public, max-age=31536000, immutable
```

意思大致就是：

> 这个 URL 对应的内容一年内不会变，不需要反复验证。

如果代码发生变化：

```text
app.a81f3.js
↓
app.91bc2.js
```

URL 自动变化。

这就是：

> **内容 Hash + 长期缓存。**

MDN 也推荐带版本标识的静态子资源配合长期 `max-age` 和 `immutable`。([MDN Web Docs](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Caching?utm_source=chatgpt.com))

---
#### 18. 为什么 index.html 不能也缓存一年？

这是整套缓存设计的关键。

假设：

```html
<!-- 旧 index.html -->

<script src="/assets/app.a81f3.js"></script>
```

你发布：

```text
app.91bc2.js
```

新的 HTML：

```html
<script src="/assets/app.91bc2.js"></script>
```

但是用户浏览器一直缓存：

```text
旧 index.html
```

那么用户永远看到：

```text
app.a81f3.js
```

因为：

```text
HTML、负责告诉浏览器、应该加载哪个 JS
```

所以整个更新链其实是：

```text
index.html
     ↓
新的 JS Hash
     ↓
新的 CSS Hash
```

因此：

> **HTML 必须能及时更新。**

---
#### 19. 生产环境常见缓存策略

非常适合面试直接回答成：

```text
index.html
→ 不做长期强缓存
→ no-cache / 验证缓存

带 Hash 的 JS / CSS / 图片
→ 长期强缓存
→ max-age=31536000 + immutable
```

例如：
##### HTML

```http
Cache-Control: no-cache
ETag: "xxx"
```

每次复用前确认：

```text
HTML有没有变化？
```

如果没变化：

```text
304
```

---
##### Hash 静态资源

```http
Cache-Control: public, max-age=31536000, immutable
```

直接长期缓存。

MDN 对 main resource HTML 和带版本号的 subresource 正是给出了这两种不同策略。([MDN Web Docs](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Caching?utm_source=chatgpt.com))

---
#### 20. CDN 怎么和这套策略配合？

例如：

```text
app.a81f3.js
```

源站返回：

```http
Cache-Control: public, max-age=31536000, immutable
```

那么：

```text
Browser
→ 可以缓存

CDN
→ 也可以缓存
```

于是完整效果：

```text
第一位用户

Browser
 ↓ MISS
CDN
 ↓ MISS
Origin
 ↓
返回 app.js
 ↑
CDN缓存
 ↑
Browser缓存
```

下一次同一个用户：

```text
Browser HIT
```

另一个用户：

```text
Browser MISS
 ↓
CDN HIT
```

整个系统就形成：

```text
本地缓存 + 边缘缓存 + 源站
```

三级访问优化。

---
#### 21. 如果发布后用户一直看到旧页面，怎么排查？

不要第一反应就是：

> “浏览器缓存有问题。”

应该按照资源依赖链排查。
##### 检查 index.html

先确认浏览器拿到的是不是：

```text
最新 index.html
```

查看：

```text
Network
→ index.html
→ Response
```

里面引用的是：

```text
app.newhash.js
```

还是：

```text
app.oldhash.js
```

---
##### 检查 HTML 的缓存头

有没有错误配置：

```http
Cache-Control: max-age=31536000
```

如果给 HTML 配了一年强缓存，就容易出现旧入口问题。

---
##### 检查 CDN

可能：

```text
Origin
→ 新 HTML

CDN
→ 旧 HTML
```

因此用户虽然经过 CDN，拿到的还是旧入口。

需要检查：

```text
CDN HIT/MISS、Age、缓存规则、缓存刷新
```

---
##### 检查部署顺序

错误部署：

```text
先发布 index.html
     ↓
index引用 app.new.js
     ↓
但 app.new.js 还没上传
```

这时用户：

```text
index.html
 ↓
GET app.new.js
 ↓
404
```

因此更安全的顺序一般是：

```text
先发布新 Hash 静态资源
        ↓
确认存在
        ↓
最后发布新的 index.html
```

因为旧资源 URL 和新资源 URL 不冲突，所以可以并存一段时间。

---
#### 22. Service Worker 又是什么？

如果普通 HTTP Cache 已经这么强了，为什么还要 Service Worker？

关键区别只有一句话：

> **HTTP Cache 是 HTTP 规则驱动的缓存；Service Worker 提供可编程的请求拦截和响应控制。**

普通 HTTP Cache：

```text
浏览器
 ↓
根据 Cache-Control / ETag
 ↓
决定使用缓存还是网络
```

程序不能随便写：

> “如果今天周五就返回 A 缓存，否则请求网络。”

---

Service Worker 可以：

```javascript
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => response || fetch(event.request))
  )
})
```

Service Worker 的 `fetch` 事件能够拦截其控制范围内页面的资源请求，并通过 `respondWith()` 提供自定义 Response。([MDN Web Docs](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API?utm_source=chatgpt.com))

---
#### 23. Cache Storage 是什么？

Service Worker 可以通过：

```javascript
caches.open('app-v1')
```

得到一个 Cache：

```text
Cache Storage
└── app-v1
    ├── /index.html
    ├── /app.js
    ├── /style.css
    └── /offline.html
```

这里存储的是：

```text
Request
→
Response
```

映射。

`CacheStorage` 就是浏览器提供的 Cache 集合管理接口，可以 `open()`、`match()` 等。([MDN Web Docs](https://developer.mozilla.org/en-US/docs/Web/API/CacheStorage?utm_source=chatgpt.com))

---
#### 24. 为什么 Service Worker 能实现离线访问？

假设用户第一次正常联网：

```text
页面
 ↓
Service Worker install
 ↓
预缓存
 ↓
Cache Storage
```

例如：

```javascript
cache.addAll([
  '/',
  '/index.html',
  '/app.js',
  '/style.css',
  '/offline.html'
])
```

MDN 也把 `install` 阶段预缓存资源作为 Service Worker 的典型使用方式。([MDN Web Docs](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API?utm_source=chatgpt.com))

---

第二次访问：

```text
页面请求 app.js
       ↓
Service Worker fetch
       ↓
caches.match()
       ↓
存在
       ↓
直接返回
```

哪怕：

```text
Internet ❌
```

依然可以：

```text
Service Worker
      ↓
Cache Storage
      ↓
index.html
app.js
style.css
      ↓
页面
```

所以 PWA 可以具有离线能力。

---
#### 25. Service Worker 生命周期

Service Worker 这里至少记三个阶段：

```text
install
   ↓
activate
   ↓
fetch
```
##### install

通常：

```text
预缓存 App Shell
```

---
##### activate

通常：

```text
删除旧 Cache、处理版本升级、接管客户端
```

---
##### fetch

运行阶段：

```text
请求
 ↓
选择缓存策略
 ↓
Cache 或 Network
```

MDN 对 `install`、`activate`、`fetch` 的职责也是这样划分的。([MDN Web Docs](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API?utm_source=chatgpt.com))

---
#### 26. 三种 Service Worker 缓存策略

##### Cache First

```text
Request
 ↓
Cache？
 ├─ 有 → 返回
 └─ 无
      ↓
    Network
      ↓
    Cache
```

适合：

```text
图片、字体、带 Hash 的静态资源
```

特点：

> 快，但可能不够新。

---
##### Network First

```text
Request
 ↓
Network
 ├─ 成功 → 返回 + 更新缓存
 └─ 失败
      ↓
    Cache
```

适合：

```text
新闻、API 数据、动态页面
```

特点：

> 优先保证新鲜度，断网再降级缓存。

---
##### Stale While Revalidate

这是很常见的一种折中策略。

```text
Request
 ↓
Cache
 ↓
立即返回旧数据
      +
后台请求 Network
      ↓
更新 Cache
```

用户：

```text
马上看到内容
```

同时：

```text
缓存后台刷新
```

下一次：

```text
拿到新内容
```

可以理解成：

> **先给旧的，后台更新新的。**

HTTP `Cache-Control` 本身也存在 `stale-while-revalidate` 指令，但在 PWA 中同样常用 Service Worker 手动实现类似的运行时策略。([MDN Web Docs](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Cache-Control?utm_source=chatgpt.com))

---
#### 27. 普通 Vue / React 项目为什么通常不需要 Service Worker？

因为普通网站最核心的问题只是：

```text
资源加载快 + 减少重复请求
```

通常：

```text
Content Hash + HTTP Cache + CDN
```

已经能很好解决。

例如：

```text
JS/CSS
→ Hash + 长缓存

HTML
→ no-cache

静态资源
→ CDN
```

足以覆盖大多数 Web 项目。

引入 Service Worker 以后反而增加一套缓存状态：

```text
HTTP Cache + CDN Cache + Cache Storage + Service Worker版本
```

如果更新策略没有做好，很容易出现：

```text
代码已经发布
但 SW 仍然返回旧资源
```

所以不能回答：

> “Service Worker 缓存更高级，所以项目最好都用。”

而应该回答：

> **只有存在明确的离线能力、PWA、弱网体验、应用壳缓存或复杂可编程缓存需求时，才有必要引入 Service Worker。**

---
#### 28. 最后把整个缓存体系串起来

假设访问：

```text
https://example.com/assets/app.a81f3.js
```

没有 Service Worker 时：

```text
页面请求资源
     ↓
浏览器 HTTP Cache
     ↓
   HIT？
  ↙    ↘
是      否
↓       ↓
返回    CDN
        ↓
       HIT？
      ↙   ↘
     是    否
     ↓     ↓
    返回  Origin
           ↓
         Nginx
           ↓
         返回资源
```

这条链的目标非常明确：

```text
浏览器缓存
→ 尽量别出用户电脑

CDN
→ 出了用户电脑，也尽量别回源

Nginx / Origin
→ CDN没缓存才真正访问源站
```

---

如果存在 Service Worker，就变成：

```text
页面 Request
     ↓
Service Worker
     ↓
根据程序决定
 ┌──────┼──────────┐
 ↓      ↓          ↓
Cache   Network   Fallback
Storage   ↓
          ↓
      HTTP Cache
          ↓
         CDN
          ↓
        Origin
```

这就是 Service Worker 所谓的：

> **Programmable Network Proxy + Programmable Cache。**

---

### 标准回答

如果面试官问我前端完整缓存体系，我会从**浏览器、CDN 和源站三个层级**来回答，如果项目使用 PWA，再补充 Service Worker。

首先，前端项目生产构建以后，本质上会变成 HTML、JavaScript、CSS、图片和字体等静态资源。这些资源可以部署在 Nginx、对象存储或者其他静态托管服务上，并不代表所有前端项目一定都有一台 Nginx 服务器。在典型前后端分离架构里，Nginx 经常作为 Web Server 或反向代理入口，静态资源可以由它直接返回，而 `/api` 这样的动态请求通过 `proxy_pass` 转发到 Spring Boot、Node 等后端服务；后端如果部署多个实例，还可以继续通过负载均衡进行流量分发。([Nginx](https://nginx.org/en/docs/http/ngx_http_core_module.html?utm_source=chatgpt.com))

如果接入 CDN，CDN 通常位于用户和源站之间。第一次请求某个静态资源时，如果边缘节点没有缓存，会发生 Cache Miss，CDN 向源站获取资源，也就是回源；资源缓存以后，后续请求如果 Cache Hit，就直接由距离用户较近的 CDN 节点返回，不再访问源站。所以可以理解成：**Nginx 或对象存储提供源站资源，CDN 提供分布式边缘缓存。**([Cloudflare Docs](https://developers.cloudflare.com/cache/concepts/cache-responses/?utm_source=chatgpt.com))

在用户浏览器内部还有 HTTP Cache。浏览器缓存解决的是同一个用户重复访问的问题，而 CDN 是多个用户共享的边缘缓存。如果浏览器本地缓存仍然新鲜，可以直接使用缓存，请求甚至不会发送到 CDN；如果浏览器没有可直接使用的缓存，才会继续访问 CDN，CDN 再决定是否需要回源。

浏览器 HTTP 缓存面试中通常分为强缓存和协商缓存。强缓存主要通过 `Cache-Control: max-age` 控制，在缓存仍然 fresh 时直接复用。协商缓存则使用验证器，例如服务器返回 `ETag`，浏览器下次携带 `If-None-Match`；如果资源没有变化，服务器返回 `304`，浏览器继续使用已有缓存。另一套机制是 `Last-Modified / If-Modified-Since`。其中 `no-cache` 不是完全不缓存，而是允许存储，但是再次使用前要求验证；`no-store` 才表示不应存储响应。([MDN Web Docs](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Caching?utm_source=chatgpt.com))

生产环境中通常会把 JS、CSS 等静态资源做 Content Hash，例如 `app.a81f3.js`。只要文件内容变化，Hash 和 URL 就变化，因此旧 URL 可以安全长期缓存。对于这种资源，可以使用类似 `Cache-Control: public, max-age=31536000, immutable` 的长期缓存策略；而 `index.html` 一般不能采用同样的长期缓存，因为 HTML 负责引用最新的 JS 和 CSS 文件，如果 HTML 长期停留在旧版本，即使服务器已经发布了新的 Hash 文件，用户仍然会继续请求旧资源。因此 HTML 更适合 `no-cache` 配合 ETag 等验证机制。([MDN Web Docs](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Caching?utm_source=chatgpt.com))

如果项目还使用 Service Worker，那么还会多出一套可编程缓存机制。Service Worker 可以监听 `fetch` 事件，拦截受它控制页面的请求，并通过 `respondWith()` 决定返回 Cache Storage 中的响应，还是继续访问网络。Cache Storage 保存的是 Request/Response 对，因此开发者可以实现 Cache First、Network First、Stale While Revalidate 等策略。([MDN Web Docs](https://developer.mozilla.org/en-US/docs/Web/API/CacheStorage?utm_source=chatgpt.com))

Service Worker 之所以可以支持 PWA 和离线访问，本质就是**请求拦截 + 可编程 Cache Storage**。在 `install` 阶段可以提前缓存 HTML、JS、CSS 等 App Shell，之后即使网络不可用，`fetch` 事件仍然可以从本地 Cache Storage 返回这些资源，所以页面依旧能够运行。([MDN Web Docs](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API?utm_source=chatgpt.com))

因此整个缓存体系可以收敛成：

```text
浏览器 HTTP Cache
→ 解决单个用户的重复请求

Service Worker + Cache Storage
→ 解决可编程缓存、离线和 PWA

CDN
→ 解决大量用户共享的边缘缓存和访问延迟

Nginx / Origin
→ 提供源站静态资源，同时可承担反向代理和负载均衡
```

最终可以记一句：

> **前端缓存优化的核心，就是尽量让请求在距离用户最近的一层被解决：浏览器有缓存就不要访问 CDN，CDN 有缓存就不要回源；普通项目主要依赖 HTTP Cache + CDN，而需要离线和可编程缓存时，再通过 Service Worker + Cache Storage 接管请求策略。**

---

**Sources:**

- [Module ngx_http_core_module](https://nginx.org/en/docs/http/ngx_http_core_module.html?utm_source=chatgpt.com)
- [NGINX Reverse Proxy | NGINX Documentation](https://docs.nginx.com/nginx/admin-guide/web-server/reverse-proxy?utm_source=chatgpt.com)
- [Cloudflare cache responses · Cloudflare Cache (CDN) docs](https://developers.cloudflare.com/cache/concepts/cache-responses/?utm_source=chatgpt.com)
- [Cache-Control header - HTTP | MDN](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Cache-Control?utm_source=chatgpt.com)
## 第49题 浏览器有哪些本地存储方式？Cookie、Web Storage、IndexedDB 和 Cache Storage 有什么区别？

### 题目

浏览器为什么需要提供多种本地存储机制？

请系统说明 **Cookie、`localStorage`、`sessionStorage`、IndexedDB 和 Cache Storage** 分别解决什么问题，它们在存储模型、生命周期、作用域、数据规模、读写方式以及使用场景上有什么区别，并说明实际项目中应该如何进行存储选型。

本题重点讨论**浏览器端数据如何保存，以及不同存储方案如何选型**。Cookie 先只讨论它作为浏览器存储和 HTTP 状态载体的基本作用；`HttpOnly`、`Secure`、`SameSite`、Cookie 与 Session、Token / JWT、XSS / CSRF 等登录态和安全问题放到下一题单独展开。

### 问题

这一题不要只背各个 API 的定义，而要先建立“**存储解决什么问题、缓存解决什么问题**”的整体认知，再理解不同方案为什么存在，以及真实项目里应该如何选型。

1. **存储（Storage）和缓存（Cache）有什么区别？它们各自的核心目标是什么？**
   - 为什么说存储主要是为了“让应用记住数据和状态”？
   - 为什么说缓存主要是为了“复用已有结果、减少重复获取、提高访问性能”？
   - 缓存为什么通常能够减少重复 HTTP 请求、回源、资源下载和网络等待时间？
   - 缓存除了性能优化以外，为什么还可以进一步支持弱网和离线访问？
   - 为什么说存储和缓存不是完全割裂的概念，而是设计目标和使用语义不同？

2. **浏览器为什么需要本地存储？普通 JavaScript 变量为什么不能替代浏览器持久化存储？**
   - 页面刷新以后普通变量中的数据会发生什么？
   - 页面关闭、浏览器重启以后，如果还想保留用户主题、语言、表单草稿等数据应该怎么办？
   - 为什么真实应用需要跨刷新、跨页面会话甚至跨浏览器重启保存数据？

3. **浏览器为什么要提供多种不同的本地存储机制，而不是只提供一个统一的“万能存储”？**
   - 少量简单配置和大量结构化业务数据的存储需求为什么不同？
   - 会话标识和普通业务数据为什么不应该完全按照同一种方式保存？
   - 网络 Request / Response 的缓存和普通业务数据的存储为什么又是不同的问题？

4. **浏览器中常见的数据保存机制有哪些？它们分别处于什么层面？**
   - Cookie；
   - `localStorage`；
   - `sessionStorage`；
   - IndexedDB；
   - Cache Storage；
   - HTTP Cache。
   - 为什么 HTTP Cache 不应该和 Web Storage、IndexedDB 简单混成同一种“前端存储”？

5. **Cookie 在浏览器存储体系中是什么？**
   - Cookie 保存在哪里？
   - 为什么说 Cookie 不只是普通的前端 Key-Value 存储？
   - 服务端如何通过 `Set-Cookie` 让浏览器保存 Cookie？
   - 浏览器为什么可以在满足条件的后续 HTTP 请求中自动携带 Cookie？
   - Cookie 为什么更适合保存少量、需要和服务端请求状态建立联系的数据？
   - 为什么不适合把大量普通业务数据都放进 Cookie？
   - Cookie 的具体属性、安全性以及 Session / Token / JWT 的登录态问题，本题为什么暂时不展开？

6. **什么是 Web Storage？`localStorage` 和 `sessionStorage` 有什么共同点？**
   - 它们为什么都属于简单 Key-Value 存储？
   - 常用的 `setItem()`、`getItem()`、`removeItem()`、`clear()` 分别做什么？
   - 为什么 Web Storage 更适合体量较小、结构简单的前端业务状态？

7. **`localStorage` 是什么？它的数据生命周期和作用域是怎样的？**
   - 页面刷新以后数据是否还存在？
   - 浏览器关闭、重新打开以后是否还存在？
   - 为什么说 `localStorage` 主要按照 Origin 隔离？
   - “协议 + 主机 + 端口”在这里意味着什么？
   - 哪些场景适合使用 `localStorage`？例如主题、语言、用户偏好、简单搜索历史等。

8. **`sessionStorage` 是什么？它和 `localStorage` 最大的区别是什么？**
   - `sessionStorage` 中的“session”具体指什么？
   - 页面刷新以后 `sessionStorage` 是否还存在？
   - 当前 Tab / 页面会话结束以后数据会怎样？
   - 为什么它可以理解为“Origin + 当前页面会话”的隔离？
   - 它适合保存哪些当前页面会话中的临时状态？

9. **`localStorage` 和 `sessionStorage` 应该如何做完整对比？**
   - 生命周期；
   - 隔离范围；
   - 页面刷新后的表现；
   - Tab 关闭后的表现；
   - 浏览器重启后的表现；
   - 典型业务场景。

10. **Web Storage 实际保存的是什么类型的数据？**
    - Key 和 Value 为什么最终都是字符串？
    - 保存数字以后读取出来是什么类型？
    - 保存对象为什么通常要使用 `JSON.stringify()`？
    - 读取对象为什么通常要使用 `JSON.parse()`？
    - 为什么这也说明 Web Storage 并不是一个真正的对象数据库？

11. **为什么不能把所有业务数据都放进 `localStorage`？**
    - 它的数据模型为什么太简单？
    - 为什么缺少对象仓库、索引、事务、复杂查询等能力？
    - 如果把大量聊天记录整体序列化成一个 JSON 字符串，会遇到什么问题？
    - 为什么这种方式不适合大量、复杂、需要局部查询的数据？

12. **为什么说 Web Storage 的同步 API 可能影响页面性能？**
    - `localStorage.getItem()` / `setItem()` 为什么属于同步操作？
    - 当读写数据量较大或频率较高时，为什么可能占用主线程？
    - 为什么小量简单数据适合 Web Storage，而大量复杂数据更应该考虑 IndexedDB？

13. **IndexedDB 是什么？为什么浏览器有了 `localStorage` 还需要 IndexedDB？**
    - IndexedDB 为什么可以理解为浏览器中的客户端结构化数据库？
    - Database、Object Store、Key、Index、Transaction 分别是什么？
    - 为什么它不是简单的字符串 Key-Value 存储？
    - 为什么它可以直接保存结构化 JavaScript 数据？

14. **IndexedDB 和传统关系型数据库、localStorage 分别有什么区别？**
    - IndexedDB 为什么更偏对象存储，而不是 SQL Table / Row / Column 模型？
    - 它为什么支持索引和事务？
    - 为什么它更适合保存大量结构化数据？
    - 为什么它主要使用异步 API？

15. **IndexedDB 适合哪些实际业务场景？**
    - 大量聊天记录；
    - 离线文档；
    - 邮件；
    - 大量表单草稿；
    - 客户端业务数据；
    - PWA 离线业务数据。
    - 为什么这些场景通常不适合全部塞进 `localStorage`？

16. **Cache Storage 是什么？它为什么和普通业务数据存储不同？**
    - Cache Storage 中主要保存的为什么是 `Request → Response` 映射？
    - HTML、JS、CSS、图片、API Response 为什么适合放入 Cache Storage？
    - 为什么用户主题、用户配置等普通业务对象通常不应该用 Cache Storage 保存？
    - `caches.open()`、`cache.add()`、`cache.match()`、`cache.put()`、`cache.delete()` 分别解决什么问题？

17. **Cache Storage 和 Service Worker 是什么关系？**
    - Cache Storage 是不是 Service Worker 专属？
    - 为什么它最经典的使用方式仍然是 `Service Worker → fetch → Cache Storage`？
    - Service Worker 如何利用 Cache Storage 实现 Cache First、Network First 等可编程缓存策略？
    - 为什么这套机制可以进一步支持离线和弱网场景？

18. **Cache Storage 和 HTTP Cache 有什么本质区别？**
    - HTTP Cache 主要由哪些 HTTP Header 和浏览器缓存规则控制？
    - `Cache-Control`、`ETag`、`Last-Modified` 等属于哪一套机制？
    - Cache Storage 为什么属于 JavaScript 可编程管理的缓存？
    - 两套缓存机制能不能同时存在？
    - 为什么不能把 Cache Storage 和浏览器传统 HTTP Cache 当成一回事？

19. **Cookie、`localStorage`、`sessionStorage`、IndexedDB、Cache Storage 最终应该如何选型？**
    - 数据是否需要和 HTTP 请求、服务端状态产生关联？
    - 数据是否需要跨页面刷新或浏览器重启长期存在？
    - 数据是否只属于当前页面会话？
    - 数据量是否较大？
    - 是否需要保存结构化对象、建立索引或事务？
    - 保存的是业务数据，还是 HTTP Request / Response 网络资源？

20. **如果让你设计一个真实前端项目，你会如何建立统一的浏览器存储与缓存模型？**
    - Cookie 负责什么？
    - `localStorage` 负责什么？
    - `sessionStorage` 负责什么？
    - IndexedDB 负责什么？
    - Cache Storage 负责什么？
    - HTTP Cache 又负责什么？
    - 为什么选型的第一步应该先判断“这是为了让应用记住数据，还是为了复用结果、减少重复请求并提高性能”？

### 回答要点

#### 1. 先区分“存储”和“缓存”的目标

在浏览器里，**存储（Storage）和缓存（Cache）虽然最终都可能把数据保存在本地，但它们解决的问题不同。**

存储更关注的是：

> **把应用需要的数据保存下来，让应用在页面刷新、重新进入页面甚至重新打开浏览器以后，还能“记住”之前的状态。**

例如：

```text
用户登录相关状态、用户主题和语言配置、表单草稿、搜索历史、聊天记录、离线业务数据
```

所以存储的核心目标是：

```text
保存业务数据 / 用户状态
        ↓
让应用能够长期或按会话记住这些数据
```

而缓存更关注的是：

> **复用已经获取或计算过的结果，避免重复请求、重复下载或重复计算，从而提高访问速度和页面性能。**

例如浏览器已经下载过：

```text
app.js、style.css、logo.png、某个 API Response
```

如果资源没有变化，就没有必要每次都重新通过网络获取。

因此缓存的核心目标可以概括成：

```text
减少重复 HTTP 请求 / 回源
        ↓
减少网络传输和等待时间
        ↓
提高资源加载速度
        ↓
提高页面访问性能
```

所以二者可以先这样区分：

```text
存储
→ 重点是“数据要留下来”
→ 让应用记住用户状态和业务数据

缓存
→ 重点是“已有结果尽量复用”
→ 减少重复请求和重复获取，提高性能
```

不过二者不是完全割裂的概念。缓存本身也需要某种存储介质保存数据，而且像 Cache Storage 除了性能优化，还可以进一步支持弱网和离线访问。区别主要在于**设计目标和使用语义**。

---
#### 2. 浏览器为什么需要多种本地存储机制？

JavaScript 中普通变量的数据主要存在当前页面运行环境的内存中，例如：

```javascript
let user = {
  name: 'Tom'
}
```

页面刷新或者对应执行环境被销毁以后，这些运行时数据通常也会消失。

但真实应用中，有很多数据需要跨刷新、跨页面会话甚至跨浏览器重启保存，例如：

```text
用户主题、语言配置、表单草稿、用户偏好、搜索历史、离线业务数据
```

同时，不同数据的特点并不一样：

```text
用户主题
→ 少量简单配置

大量聊天记录
→ 大量结构化数据

JS / CSS / 图片 / API Response
→ 网络资源

会话标识
→ 需要和 HTTP 请求发生关系
```

因此浏览器没有只提供一种万能存储方案，而是提供了不同机制：

```text
浏览器端数据保存

├── Cookie
│   └── 小量数据，并且与 HTTP 请求天然关联
│
├── Web Storage
│   ├── localStorage
│   └── sessionStorage
│       └── 简单 Key-Value 业务数据
│
├── IndexedDB
│   └── 大量、结构化的本地业务数据
│
└── Cache Storage
    └── Request / Response 网络资源缓存
```

此外还有上一题讲过的 **HTTP Cache**。它主要属于浏览器网络缓存机制，不应该和 `localStorage`、IndexedDB 这类业务数据存储简单混为一谈。

---
#### 3. Cookie 在存储体系中是什么？

Cookie 可以先理解成：

> **浏览器保存的一小段与站点相关的数据，同时它与 HTTP 请求/响应机制天然关联。**

服务器可以通过响应头：

```http
Set-Cookie: sessionId=abc123
```

让浏览器保存 Cookie。

之后浏览器访问符合条件的资源时，可以在 HTTP 请求中自动携带对应 Cookie：

```http
Cookie: sessionId=abc123
```

这也是 Cookie 和 `localStorage` 一个非常重要的结构性区别：

```text
localStorage
→ 主要给前端 JavaScript 自己保存和读取业务数据

Cookie
→ 不只是浏览器本地保存数据
→ 还可以参与 HTTP 请求和服务端状态关联
```

因此 Cookie 通常更适合保存**少量、需要与服务端请求产生联系的状态信息**，而不适合当成普通的大容量前端数据库。

Cookie 的具体属性、安全机制以及如何配合 Session、Token/JWT 实现登录态，下一题再展开。

---
#### 4. 什么是 Web Storage？

Web Storage 主要包括：

```text
localStorage
sessionStorage
```

它们都提供非常简单的：

```text
Key → Value
```

存储模型。

例如：

```javascript
localStorage.setItem('theme', 'dark')

const theme = localStorage.getItem('theme')

localStorage.removeItem('theme')
```

两者都通过 `Storage` 接口提供 `setItem()`、`getItem()`、`removeItem()` 和 `clear()` 等能力。

Web Storage 更适合：

> **保存体量不大、结构简单的前端业务状态。**

---
#### 5. `localStorage` 是什么？

`localStorage` 适合保存：

> **简单、体量不大，并且希望跨页面刷新和浏览器重启继续存在的业务数据。**

例如：

```javascript
localStorage.setItem('theme', 'dark')
localStorage.setItem('language', 'zh-CN')
```

它最核心的生命周期特点是：

```text
页面刷新
→ 数据仍然存在

关闭浏览器
→ 数据通常仍然存在

重新打开网站
→ 仍然可以读取
```

`localStorage` 主要按 Origin 隔离，也就是通常按照：

```text
协议 + 主机 + 端口
```

划分存储空间。

因此同一个 Origin 下的页面通常可以共享同一份 `localStorage`。

常见场景包括：

```text
主题配置、语言配置、用户偏好、简单搜索历史、非敏感页面配置
```

---
#### 6. `sessionStorage` 是什么？

`sessionStorage` 的 API 和 `localStorage` 基本一致：

```javascript
sessionStorage.setItem('step', '2')
sessionStorage.getItem('step')
```

但是它的生命周期和隔离范围不同。

可以先理解成：

```text
localStorage
→ 更偏 Origin 级持久存储

sessionStorage
→ Origin + 当前页面会话
```

因此 `sessionStorage` 更接近：

> **当前 Tab / 页面会话中的临时业务存储。**

页面刷新时：

```text
sessionStorage
→ 通常仍然存在
```

而对应页面会话结束以后：

```text
sessionStorage
→ 会被清理
```

所以它比较适合：

```text
多步骤表单当前步骤、当前 Tab 的筛选条件、临时页面状态、一次页面流程中的数据
```

---
#### 7. `localStorage` 和 `sessionStorage` 最大区别是什么？

可以从生命周期和隔离范围理解，而不只是简单记成“一个永久，一个临时”。

```text
localStorage
→ 主要按 Origin 隔离
→ 数据长期保留，除非主动清理或被浏览器清理

sessionStorage
→ 还与页面会话相关
→ 页面刷新通常保留
→ 页面会话结束后清除
```

例如用户主题：

```text
dark / light
```

希望下次重新打开浏览器仍然存在，更适合：

```text
localStorage
```

而一个三步表单：

```text
Step 1
↓
Step 2
↓
Step 3
```

如果只是希望当前 Tab 刷新时不要丢失步骤，可以考虑：

```text
sessionStorage
```

---
#### 8. Web Storage 保存的是什么类型的数据？

Web Storage 的 Key 和 Value 最终都是字符串。

例如：

```javascript
localStorage.setItem('age', 18)
```

读取以后得到的实际上是：

```text
"18"
```

如果需要保存对象：

```javascript
const user = {
  name: 'Tom',
  age: 18
}
```

通常需要：

```javascript
localStorage.setItem(
  'user',
  JSON.stringify(user)
)
```

读取时再：

```javascript
const user = JSON.parse(
  localStorage.getItem('user')
)
```

因此 Web Storage 本质上更适合：

```text
简单字符串 Key-Value
```

而不是复杂的本地数据库需求。

---
#### 9. 为什么不能把所有业务数据都放进 `localStorage`？

主要有两个原因。

第一，**数据模型过于简单**。

它本质上只有：

```text
string key
→
string value
```

没有真正的：

```text
对象仓库、索引、事务、复杂查询
```

例如有十万条聊天记录，如果全部序列化成一个巨大 JSON：

```javascript
localStorage.setItem(
  'messages',
  JSON.stringify(messages)
)
```

后续进行复杂查询、局部修改和维护都会很麻烦。

第二，**Web Storage API 是同步的**。

例如：

```javascript
localStorage.getItem()
localStorage.setItem()
```

都会同步执行。

如果频繁读写大量数据，会占用主线程执行时间，因此不适合承担大规模复杂数据存储。

所以可以先记：

```text
少量、简单数据
→ Web Storage

大量、结构化数据
→ IndexedDB
```

---
#### 10. IndexedDB 是什么？

IndexedDB 可以理解为：

> **浏览器内置的客户端结构化数据库。**

它和 `localStorage` 已经不是同一个层级的数据模型。

`localStorage` 更接近：

```text
key
↓
string
```

而 IndexedDB 可以形成：

```text
Database
  ↓
Object Store
  ↓
Object
  ↓
Index
```

例如一个聊天数据库：

```text
chat-database

messages
├── id
├── userId
├── content
├── timestamp
└── status
```

还可以针对 `userId`、`timestamp` 等字段建立索引。

IndexedDB 支持对象存储、索引和事务，因此更适合保存大量结构化客户端数据。

---
#### 11. 为什么 IndexedDB 更适合大量数据？

主要可以从三个方面理解。

第一，**可以直接保存结构化数据**。

例如：

```javascript
{
  id: 1,
  name: 'Tom',
  age: 18,
  tags: ['Vue', 'React']
}
```

而不需要像 Web Storage 一样把整个对象先转换成一个字符串再管理。

第二，**支持索引和事务**。

例如可以给：

```text
userId、timestamp、email
```

建立索引，从而更高效地查找数据。

第三，**主要 API 是异步的**。

例如：

```javascript
const request = indexedDB.open('app-db')
```

因此它比大量同步 Web Storage 操作更适合复杂、本地数据量较大的场景。

---
#### 12. IndexedDB 适合什么场景？

例如：

```text
大量聊天记录、离线文档、邮件数据、大量表单草稿、客户端业务数据、PWA 离线业务数据
```

都可以考虑 IndexedDB。

例如聊天应用需要保存几万条：

```javascript
{
  id,
  senderId,
  content,
  timestamp,
  status
}
```

这样的消息对象，就明显比全部塞入 `localStorage` 更适合 IndexedDB。

---
#### 13. Cache Storage 是什么？

Cache Storage 和前面的业务数据存储机制不同。

它主要管理的是：

```text
Cache
```

而一个 Cache 中保存的核心关系可以理解为：

```text
Request
↓
Response
```

例如：

```text
GET /app.js
→ app.js Response

GET /logo.png
→ logo.png Response

GET /api/news
→ API Response
```

因此 Cache Storage 更适合：

> **缓存网络请求和响应，而不是保存普通用户配置或业务对象。**

例如：

```javascript
const cache = await caches.open('app-v1')
await cache.add('/app.js')
```

之后可以：

```javascript
const response = await cache.match('/app.js')
```

它最常和 Service Worker 配合，实现静态资源缓存、运行时缓存以及离线访问。

---
#### 14. Cache Storage 是 Service Worker 专属的吗？

不是。

Service Worker 非常常用 Cache Storage，但 Cache Storage 本身并不是只能在 Service Worker 中使用。

它可以在支持该 API 的 Window 和 Worker 环境访问。

只是最经典的组合仍然是：

```text
Service Worker
       ↓
拦截 fetch
       ↓
Cache Storage
```

由 Service Worker 决定：

```text
先查缓存？、先请求网络？、网络失败再走缓存？
```

从而实现可编程缓存和离线能力。

---
#### 15. Cache Storage 和 HTTP Cache 有什么区别？

这一点正好和第48题衔接。

HTTP Cache 主要由浏览器网络栈按照 HTTP 缓存规则管理，例如：

```http
Cache-Control
ETag
Last-Modified
Expires
```

浏览器根据这些响应头判断资源能否直接复用、是否需要重新验证。

因此它更接近：

```text
HTTP 缓存规则驱动
→ 浏览器自动管理
```

而 Cache Storage 提供：

```javascript
caches.open()
cache.put()
cache.match()
cache.delete()
```

允许 JavaScript 主动管理缓存。

因此可以区分为：

```text
HTTP Cache
→ HTTP 协议和浏览器网络缓存规则驱动

Cache Storage
→ JavaScript 可编程管理的 Request / Response 缓存
```

两套缓存可以同时存在。

---
#### 16. Cookie、Web Storage、IndexedDB 和 Cache Storage 应该怎么选？

不要把它们背成四个独立 API，而应该先判断：

> **我要保存的到底是什么数据？**

如果是**少量、需要和 HTTP 请求及服务端状态产生关联的数据**：

```text
→ 考虑 Cookie
```

如果是**少量、简单、希望长期保存的前端业务配置**：

```text
→ localStorage
```

如果是**只需要在当前页面会话中保存的临时状态**：

```text
→ sessionStorage
```

如果是**大量、结构化、需要索引和事务的客户端业务数据**：

```text
→ IndexedDB
```

如果保存的是**HTTP Request / Response、静态资源或者接口响应缓存**：

```text
→ Cache Storage
```

因此可以最终记成：

```text
Cookie
→ 小量、与 HTTP 状态相关的数据

localStorage
→ 简单、长期保存的业务数据

sessionStorage
→ 当前页面会话中的临时业务数据

IndexedDB
→ 大量、结构化的客户端业务数据

Cache Storage
→ Request / Response 网络资源缓存
```

---

### 标准回答

浏览器提供多种本地数据保存机制，是因为不同数据的目标、生命周期和规模并不一样。在回答具体 API 之前，我会先区分**存储和缓存**。

存储更关注的是“数据要留下来”。它的主要目标是保存业务数据和用户状态，让应用在页面刷新、重新进入页面甚至重新打开浏览器以后，还能够记住之前的信息，例如用户配置、主题、表单草稿、搜索历史和离线业务数据。

缓存更关注的是“已有结果尽量复用”。它的核心目的是避免重复 HTTP 请求、重复下载或者重复计算，从而减少网络等待时间，提高资源加载速度和页面性能。例如浏览器已经下载过某个 JS、CSS、图片或者 API Response，如果资源仍然可以使用，就没有必要再次完整获取。缓存还可以进一步支持弱网和离线场景，但它最核心的设计目标仍然是复用结果和提升访问效率。

所以可以先概括成：**存储主要解决应用如何记住数据，缓存主要解决如何减少重复获取并提高性能。**

在具体存储方式里，首先是 Cookie。Cookie 可以看成浏览器保存的一小段站点相关数据，但它和普通前端存储不同，它与 HTTP 请求/响应机制天然关联。服务器可以通过 `Set-Cookie` 让浏览器保存 Cookie，之后符合条件的 HTTP 请求可以自动携带对应 Cookie。因此 Cookie 更适合保存少量、需要和服务端请求状态建立联系的数据，而不适合承担大量普通业务数据存储。Cookie 的属性、安全机制以及它如何和 Session、Token/JWT 配合实现登录态，可以单独作为下一题展开。

第二类是 Web Storage，包括 `localStorage` 和 `sessionStorage`。它们都提供简单的字符串 Key-Value 存储。`localStorage` 主要按 Origin 隔离，数据通常可以跨页面刷新以及浏览器重启继续存在，所以更适合主题、语言、用户偏好等简单持久化配置；`sessionStorage` 还和当前页面会话相关，页面刷新时通常仍然保留，但页面会话结束以后会被清理，所以更适合当前 Tab 的临时页面状态。

Web Storage 的优势是使用简单，但它的数据模型只是字符串 Key-Value，而且 API 是同步的。因此它适合小规模、简单业务数据，不适合大量复杂数据。如果要保存对象，通常还需要通过 `JSON.stringify()` 和 `JSON.parse()` 进行序列化和反序列化。

如果需要保存大量结构化数据，就更适合使用 IndexedDB。IndexedDB 是浏览器提供的客户端结构化数据库，支持 Object Store、Key、Index 和 Transaction，可以直接保存结构化 JavaScript 数据，并且主要通过异步 API 操作。因此大量聊天记录、离线文档、邮件、本地业务数据等场景，都比 `localStorage` 更适合使用 IndexedDB。

最后是 Cache Storage。它和前面的普通业务数据存储不同，它主要用于保存网络请求和响应，可以理解成 `Request → Response` 的映射，因此特别适合缓存 HTML、JavaScript、CSS、图片和 API Response。它经常和 Service Worker 配合，通过 Cache First、Network First 等策略实现可编程缓存和离线访问。

Cache Storage 还需要和上一题的 HTTP Cache 区分。HTTP Cache 主要由浏览器网络栈依据 `Cache-Control`、`ETag`、`Last-Modified` 等 HTTP 缓存规则自动管理，而 Cache Storage 则可以通过 JavaScript 使用 `caches.open()`、`cache.match()`、`cache.put()` 等 API 主动控制。两套缓存机制可以同时存在。

因此整个浏览器数据保存体系可以最终收敛成：

```text
Cookie
→ 小量、与 HTTP 状态相关的数据

localStorage
→ 简单、长期保存的业务数据

sessionStorage
→ 当前页面会话中的临时数据

IndexedDB
→ 大量、结构化的客户端业务数据

Cache Storage
→ Request / Response 网络资源缓存
```

实际选型时，我会先判断：这个数据是为了**让应用记住业务状态**，还是为了**复用资源、减少重复请求并提高性能**；然后再根据数据是否需要和服务器请求关联、是否需要长期保存、是否只属于当前页面会话、数据量是否很大、是否需要结构化查询，以及保存的是业务数据还是网络资源，选择对应的存储或缓存方案。

---

**Sources:**

- [Web Storage API - MDN](https://developer.mozilla.org/en-US/docs/Web/API/Web_Storage_API)
- [Using the Web Storage API - MDN](https://developer.mozilla.org/en-US/docs/Web/API/Web_Storage_API/Using_the_Web_Storage_API)
- [IndexedDB API - MDN](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API)
- [CacheStorage - MDN](https://developer.mozilla.org/en-US/docs/Web/API/CacheStorage)

## 第50题 前端登录态和会话控制是怎么实现的？Cookie、Session、Token 和 JWT 分别是什么？

### 题目

HTTP 本身是无状态协议，那么用户完成一次登录后，系统为什么还能在后续请求中持续知道“当前用户是谁”，并判断“这个用户能做什么”？

请从**会话控制**出发，说明 Cookie、Session、Token、JWT 在登录体系中分别承担什么职责；进一步说明 Cookie 的生命周期和安全属性、Session 有状态认证、Token/JWT 的认证机制、Access Token 与 Refresh Token 的设计原因，以及 Token 刷新、轮换、并发刷新、退出登录和主动撤销是如何解决的。

---

### 问题

1. **什么是会话控制？为什么 HTTP 需要额外的会话控制机制？**
   - HTTP 的“无状态”具体是什么意思？
   - 用户第一次登录成功之后，后续请求为什么不需要每次重新提交用户名和密码？
   - 会话控制真正要解决的是“保存数据”，还是“持续识别同一个已经认证的用户”？

2. **认证 Authentication 和授权 Authorization 有什么区别？**
   - Authentication 解决什么问题？
   - Authorization 解决什么问题？
   - 用户登录、获取身份、访问受保护接口之间是什么关系？

3. **Cookie、Session、Token、JWT 到底是什么关系？**
   - Cookie、Session、Token 是不是三种完全并列的登录方案？
   - Cookie 在其中承担的是认证逻辑，还是浏览器保存和发送状态的机制？
   - Token 是什么概念？
   - JWT 为什么只是 Token 的一种具体形式？

4. **Cookie 为什么天然适合参与 Web 会话控制？**
   - Cookie 最关键的 HTTP 特性是什么？
   - 为什么浏览器能够在后续请求中自动携带 Cookie？
   - 服务端如何通过 `Set-Cookie` 建立 Cookie？
   - Cookie 为什么常被用于保存 `sessionId` 或其他认证相关凭证？

5. **前端设置 Cookie 和服务端设置 Cookie 有什么区别？**
   - `document.cookie` 可以做什么？
   - 服务端 `Set-Cookie` 可以做什么？
   - 为什么主题、语言等普通偏好可以由前端 Cookie 保存？
   - 为什么登录态等敏感 Cookie 通常更适合由服务端下发？
   - 为什么前端 JavaScript 不能设置 `HttpOnly`？

6. **Session Cookie 和 Persistent Cookie 有什么区别？**
   - `Expires` 和 `Max-Age` 分别是什么？
   - 没有设置显式过期时间时为什么通常称为 Session Cookie？
   - 设置过期时间以后为什么属于持久 Cookie？
   - 为什么不能简单把二者理解成“一个存在内存、一个存在磁盘”？
   - Session Cookie 和服务端的 Session 是不是同一个概念？

7. **Cookie 的 `Domain` 和 `Path` 分别解决什么问题？**
   - `Domain` 控制什么范围？
   - `Path` 控制什么范围？
   - 为什么二者本质上是 Cookie 的发送范围匹配规则？
   - `Path` 能不能当作真正的安全隔离机制？

8. **Cookie 的 `HttpOnly` 是什么？为什么登录 Cookie 常设置它？**
   - 设置 `HttpOnly` 后 JavaScript 是否还能通过 `document.cookie` 读取？
   - `HttpOnly` 主要降低什么风险？
   - 它为什么和 XSS 有关系？
   - `HttpOnly` 能不能真正阻止 XSS？
   - 恶意脚本虽然不能读取 HttpOnly Cookie，还能不能利用当前用户身份发送请求？

9. **Cookie 的 `Secure` 是什么？**
   - `Secure` 控制的是 Cookie 的存储还是传输？
   - 为什么登录 Cookie 通常应该通过 HTTPS 发送？
   - 设置 `Secure` 是否意味着 Cookie 内容本身已经被加密？

10. **Cookie 的 `SameSite` 是什么？它和 Domain、Path 有什么区别？**
    - `Strict`、`Lax`、`None` 分别代表什么？
    - 为什么 `SameSite=None` 通常需要同时使用 `Secure`？
    - Domain/Path 判断的是什么？
    - SameSite 判断的又是什么？
    - 为什么不能说“SameSite 决定 Cookie 发给哪个域名”？

11. **什么是 XSS？为什么它会威胁前端登录凭证？**
    - 什么是 Stored XSS？
    - 恶意脚本是怎样进入目标站点并在其他用户浏览器中执行的？
    - XSS 成功后能够读取哪些页面数据？
    - 为什么 `localStorage` 中的 Token 容易在 XSS 成功以后被直接读取？
    - 为什么非 HttpOnly Cookie 也可能被读取？
    - `HttpOnly` 能解决哪一步风险，又解决不了什么？

12. **什么是 CSRF？为什么它和 Cookie 的自动携带特性有关？**
    - 攻击者是否必须先知道用户 Cookie 的具体值？
    - 为什么用户登录目标网站以后，再访问恶意网站可能形成风险？
    - 浏览器为什么可能自动携带目标网站的 Cookie？
    - `SameSite` 为什么能够降低部分 CSRF 风险？
    - 除 SameSite 之外，为什么还会有 CSRF Token、Origin/Referer 校验等机制？

13. **Session 是什么？它为什么被称为服务端有状态会话？**
    - Session 本身存在哪里？
    - 浏览器中保存的是 Session 数据还是 `sessionId`？
    - 服务端为什么需要维护 `sessionId → Session Data` 的映射？
    - Session 中通常保存哪些用户状态？

14. **Cookie + Session 的完整登录流程是什么？**
    - 用户提交用户名和密码以后发生什么？
    - 服务端什么时候创建 Session？
    - `sessionId` 是怎样生成和返回给浏览器的？
    - 为什么通常把 `sessionId` 放进 Cookie？
    - 浏览器后续请求怎样自动携带它？
    - 服务端拿到 `sessionId` 后怎样恢复当前用户身份？

15. **Session 为什么在分布式部署下会出现共享问题？**
    - 如果 Session 只存在 Server A 的内存里，请求下一次被负载均衡到 Server B 会怎样？
    - 为什么生产环境常把 Session 放入 Redis、数据库或独立 Session Store？
    - Session 的“有状态”具体给系统带来了什么成本？
    - 有状态又为什么使退出登录和强制下线更加容易？

16. **Token 是什么？为什么 Token 并不等于 JWT？**
    - Token 的本质是什么？
    - Token 是否一定包含用户身份信息？
    - 什么是 Opaque Token？
    - Opaque Token 为什么依然可能需要服务端查询 Token Store？
    - 为什么“使用 Token”并不意味着“服务端一定无状态”？

17. **JWT 是什么？为什么它能够作为自包含 Token？**
    - JWT 常见的 `header.payload.signature` 三部分分别是什么？
    - Header 通常存什么？
    - Payload 中的 Claims 通常包含什么？
    - `sub`、`iss`、`aud`、`exp`、`iat` 分别表示什么？
    - Signature 的作用是什么？

18. **JWT 的签名和加密有什么区别？**
    - JWT Payload 默认能不能被别人看到？
    - Base64URL 是不是加密？
    - Signature 为什么主要保证完整性和真实性？
    - 为什么密码、密钥等敏感数据不能直接放进普通 JWT Payload？

19. **服务端收到 JWT 后应该怎样验证？**
    - 是否只验证 Signature 就够了？
    - 为什么还需要验证 Token 使用的算法？
    - `iss` 为什么要检查？
    - `aud` 为什么要检查？
    - `exp` 和 `nbf` 分别控制什么？
    - role、scope 等权限信息什么时候参与授权判断？
    - 为什么“签名正确”并不等于“当前请求一定允许通过”？

20. **为什么现代 Token 体系通常还要拆成 Access Token 和 Refresh Token？**
    - 如果只有一个长期 Token，会有什么安全问题？
    - 如果所有 Token 都只有几分钟有效期，又会造成什么用户体验问题？
    - 为什么 Access Token 一般生命周期短？
    - 为什么 Refresh Token 生命周期可以更长？
    - 长短 Token 的设计本质上是在平衡什么？

21. **Access Token 为什么通常用于访问业务 API？**
    - 为什么 OAuth Bearer Token 常通过 `Authorization: Bearer <access_token>` 发送？
    - 与 Cookie 自动携带相比，Authorization Header 有什么区别？
    - 为什么客户端可以明确控制哪些 API 请求发送 Access Token？
    - 为什么 Access Token 不需要跟随图片、CSS 等所有请求自动发送？

22. **浏览器中的 Access Token 应该存在哪里？**
    - 为什么很多实现会选择只放在 JavaScript 内存或状态管理中？
    - 页面刷新以后 Access Token 丢失怎么办？
    - 为什么可以依赖 Refresh Token 恢复新的 Access Token？
    - `localStorage` 和 `sessionStorage` 为什么使用方便但存在 XSS 后可直接读取的问题？
    - 为什么 Access Token 的存储方式不是绝对固定的，而要根据具体架构决定？

23. **Refresh Token 为什么需要比 Access Token 更严格的保护？**
    - 为什么 Access Token 泄露的风险窗口通常受它的短有效期限制？
    - 为什么 Refresh Token 泄露后攻击者可能持续获取新的 Access Token？
    - 浏览器应用为什么常见使用 `Secure + HttpOnly Cookie` 保存长期 Refresh 凭证？
    - 这种方式为什么能够减少 JavaScript 直接读取 Refresh Token 的机会？
    - 为什么不能把“Refresh Token 必须存在 Cookie”说成 OAuth 协议的强制规定？

24. **什么是 Refresh Token Rotation？为什么需要轮换？**
    - 为什么一个长期可重复使用的 Refresh Token 泄露以后风险很高？
    - 为什么每次刷新时可以同时签发新的 Refresh Token？
    - 为什么新 Token 签发以后旧 Refresh Token 要立即失效？
    - Rotation 真正解决的是什么安全问题？

25. **为什么旧 Refresh Token 被再次使用时意味着可能发生了重放攻击？**
    - 假设合法用户和攻击者同时持有 RT-1，会发生什么？
    - 合法用户先把 RT-1 换成 RT-2 后，RT-1 应处于什么状态？
    - 如果之后又有人拿 RT-1 刷新，服务端为什么能够判断出现异常？
    - 为什么服务端此时无法可靠判断到底攻击者还是合法用户拥有最新 Token？
    - 为什么安全策略可能需要撤销当前 Refresh Token Family / Grant 并要求重新登录？

26. **为什么 Refresh Token Rotation 会重新引入服务端状态？**
    - 服务端如果完全不保存任何 Refresh Token 状态，怎样知道 RT-1 已经使用过？
    - 为什么需要保存当前有效 Token、已使用 Token、Token Family 或 Grant 关系？
    - 这是否说明现代认证并不一定追求“绝对无状态”？
    - 为什么更合理的设计往往是“Access Token 尽量无状态 + Refresh 会话有状态控制”？

27. **Access Token 过期时，多个接口为什么不能同时 Refresh？**
    - 如果 `/user`、`/orders`、`/messages` 同时返回 `401` 会发生什么？
    - 三个请求如果各自发送 Refresh 会造成什么问题？
    - 在 Refresh Token Rotation 下，为什么并发 Refresh 甚至可能被服务端识别为旧 Refresh Token 重放？

28. **前端怎样通过全局状态解决 Refresh 并发问题？**
    - `isRefreshing` 的作用是什么？
    - 第一个遇到 Access Token 过期的请求负责做什么？
    - 后续请求发现正在 Refresh 后应该做什么？
    - 为什么通常需要一个等待队列或者共享 Refresh Promise？
    - Refresh 成功后什么时候更新 Access Token？

29. **Refresh 成功后，之前失败的 HTTP 请求到底怎么处理？**
    - 是不是所有请求直接共享 Refresh 请求的响应？
    - 为什么不是？
    - `/user`、`/orders`、`/messages` 应该怎样分别处理？
    - 为什么它们只是共同等待 Refresh 完成，而之后仍然要分别带着新的 Access Token 重新发送？
    - 为什么最终每个调用方拿到的仍然是自己原接口的响应？

30. **Refresh 失败以后为什么应该统一退出，而不是继续无限重试？**
    - Refresh Token 过期意味着什么？
    - Refresh Token 被撤销意味着什么？
    - 检测到 Rotation 重放意味着什么？
    - 等待队列中的请求应该怎么处理？
    - 为什么必须防止形成 `401 → Refresh → 401 → Refresh` 的无限循环？

31. **为什么 JWT 登录的退出和主动撤销通常比 Session 更复杂？**
    - Session 为什么可以直接删除服务端记录实现立即失效？
    - 自包含 JWT 为什么不存在天然的 Session 记录可删除？
    - 用户退出登录并删除本地 JWT 后，攻击者手中的 JWT 为什么可能仍然有效？
    - `exp` 到达之前服务器为什么仍可能接受这个 Token？

32. **JWT 如果需要立即失效，可以怎样解决？**
    - 短生命周期 Access Token 能解决什么？
    - Refresh Token Revocation 能解决什么？
    - Token Blacklist / Revocation List 是什么思路？
    - `jti` 可以怎样参与撤销？
    - Token Version / Session Version 可以怎样实现用户全部下线？
    - 为什么这些能力又会增加服务器状态管理？

33. **为什么实际系统经常采用“短 Access Token + 有状态 Refresh Token/登录 Session”的组合？**
    - 为什么普通 API 请求希望尽量减少 Session Store 查询？
    - 为什么 Refresh、退出登录、设备管理、强制下线又需要服务器状态？
    - 为什么这是一种性能、安全和可控性的折中？
    - 为什么“完全无状态”本身并不是认证系统最终追求的目标？

34. **最终应该怎样统一理解整个前端登录态体系？**
    - Cookie 解决什么？
    - Session 解决什么？
    - Token 解决什么？
    - JWT 解决什么？
    - Access Token 和 Refresh Token 为什么拆分？
    - Rotation、Revocation 和前端 Refresh 队列分别解决什么工程问题？

---

### 回答要点

#### 1. 先从“为什么需要会话控制”开始理解

会话控制解决的根本问题不是“Token 放在哪里”，而是：

> **HTTP 请求彼此独立，应用如何把多次请求关联到同一个已经认证的用户。**

例如用户先登录：

```text
POST /login
```

后面又连续访问：

```text
GET /users/me、GET /orders、POST /comments
```

HTTP 协议本身不会因为第一个请求已经登录，就自动替应用记住后面三个请求是谁发出的。

所以系统需要建立一条状态链：

```text
用户第一次证明身份
        ↓
服务端完成认证
        ↓
建立或签发登录凭证
        ↓
客户端后续请求携带凭证
        ↓
服务端恢复或验证用户身份
        ↓
根据用户身份判断权限
```

这就是会话控制。

这里还必须区分：

```text
Authentication
认证：你是谁？

Authorization
授权：你能做什么？
```

例如用户名和密码验证成功，是认证；已经确定用户是 `userId=1001` 后，再判断他能不能删除订单，是授权。
#### 2. Cookie、Session、Token 不是严格意义上的“三种并列方案”

这一点需要先修正概念。

更准确的关系是：

```text
Cookie
→ 浏览器保存并按规则自动发送数据的一种 HTTP 状态机制

Session
→ 服务端保存会话状态的一种方案

Token
→ 客户端向服务端证明身份/授权的一类凭证

JWT
→ Token 的一种具体、自包含格式
```

所以真实系统经常是组合关系，而不是：

```text
Cookie vs Session vs Token
```

例如经典方案就是：

```text
Cookie + Session
```

现代浏览器应用也可能是：

```text
Cookie + Refresh Token
+
Authorization Header + Access Token
```

或者 BFF 架构下甚至：

```text
浏览器只持有 HttpOnly Session Cookie
        ↓
BFF 在服务器侧持有 Access / Refresh Token
```

因此这一题虽然按照 **Cookie → Session → Token** 的顺序讲，但要始终知道它们解决的是不同层面的问题。
#### 3. Cookie 为什么天然适合参与会话控制

Cookie 最重要的特点之一是：

> **浏览器可以根据 Cookie 的匹配规则自动在 HTTP 请求中携带它。**

服务器可以：

```http
Set-Cookie: sessionId=abc123
```

浏览器保存以后，后续满足条件的请求可以自动产生：

```http
Cookie: sessionId=abc123
```

因此 Cookie 特别适合承载：

```text
sessionId、会话标识、某些认证相关的长期凭证
```

而不需要每个页面都自己手动拼接。

Cookie 之所以在 Web 登录体系中长期存在，核心原因就是它本身就是 HTTP 状态管理机制。
#### 4. 前端创建 Cookie 和服务端下发 Cookie 的目的不同

前端可以：

```javascript
document.cookie = 'theme=dark'
```

这种 Cookie 可以用于：

```text
主题、语言、某些非敏感偏好
```

但 JavaScript 自己设置的 Cookie 无法设置 `HttpOnly`。

而登录态通常更希望：

```text
JavaScript 不要直接读取凭证
```

因此认证 Cookie 更常见的做法是由服务端通过：

```http
Set-Cookie
```

下发，例如：

```http
Set-Cookie: __Host-session=abc123;
            Path=/;
            Secure;
            HttpOnly;
            SameSite=Lax
```

这样浏览器负责保存和发送，但 JavaScript 无法直接拿到其中的认证值。
#### 5. Session Cookie 和 Persistent Cookie 的区别是“有没有显式持久过期时间”

这里不能理解成：

```text
Session Cookie = 一定存在内存
Persistent Cookie = 一定存在磁盘
```

这种说法属于实现层面的过度简化。

更准确的语义是：
##### Session Cookie

没有显式设置：

```text
Expires
Max-Age
```

按 Cookie 语义属于会话级 Cookie。
##### Persistent Cookie

设置了：

```http
Max-Age=2592000
```

或者：

```http
Expires=...
```

浏览器会按照过期时间维护它。

所以决定两者身份的是：

> **Cookie 是否具有显式持久化生命周期，而不是浏览器内部究竟把字节放在内存还是磁盘。**

而且现代浏览器存在 Session Restore，关闭浏览器并不意味着所有 Session Cookie 在所有实际情况下都必然立即消失，因此面试中不要把“关闭浏览器一定删除”说得过于绝对。
#### 6. Cookie 的核心属性要按照“解决什么问题”理解

##### Domain：控制主机范围

`Domain` 主要决定：

> **这个 Cookie 可以发送给哪些 Host。**

如果不设置 `Domain`，通常形成更严格的 Host-only Cookie，只发送给设置它的 Host。
##### Path：控制 URL 路径范围

例如：

```http
Path=/api
```

那么 `/api/user`、`/api/orders` 可以匹配，而 `/news` 不匹配。

因此：

```text
Domain
→ 哪个主机

Path
→ 主机下的哪个路径
```

需要注意，`Path` 是发送范围控制，不是真正的安全隔离机制。
##### HttpOnly：限制 JavaScript 直接读取

设置 `HttpOnly` 后，页面 JavaScript 无法通过 `document.cookie` 读取该 Cookie。

它主要降低的是：

> **发生 XSS 后，认证 Cookie 被恶意 JavaScript 直接读取并上传给攻击者的风险。**

但必须注意：

```text
HttpOnly
≠
防止 XSS 本身
```

脚本仍可能利用当前用户身份在页面中发起请求。
##### Secure：限制通过安全连接发送

`Secure` 表示 Cookie 只应通过 HTTPS 等安全连接发送。

它解决的是：

```text
避免认证 Cookie 通过普通明文 HTTP 链路发送
```

而不是：

```text
Secure
→ Cookie 自身被加密
```
##### SameSite：控制跨站上下文是否允许携带

常见：

```text
SameSite=Strict
SameSite=Lax
SameSite=None
```

其中 `None` 需要同时配合 `Secure`。

这里必须和 Domain/Path 区分：

```text
Domain / Path
→ 当前目标 URL 是否匹配这个 Cookie

SameSite
→ 当前请求处于什么 Site Context，跨站情况下是否允许携带 Cookie
```

所以不能说：

> SameSite 决定 Cookie 发到哪个域名或路径。

那是 Domain/Path 的职责。

SameSite 的核心是：

> **限制跨站上下文中 Cookie 的自动发送，从而降低部分 CSRF 风险。**
#### 7. 为什么 HttpOnly 和 SameSite 会分别联系到 XSS 和 CSRF

这两个攻击必须分开。
##### XSS：恶意脚本获得可信站点的执行能力

XSS 的本质是：

> **攻击者控制的内容进入页面，并最终以 JavaScript 等可执行内容的形式在目标网站的 Origin 中运行。**

例如 Stored XSS：

```text
攻击者提交恶意内容
        ↓
服务端把内容保存
        ↓
正常用户打开页面
        ↓
页面把恶意内容作为可执行代码输出
        ↓
用户浏览器执行攻击代码
```

因为脚本已经运行在目标 Origin 中，所以它可能：

```text
读取页面数据
操作 DOM
发起用户权限范围内的请求
读取 localStorage
读取非 HttpOnly Cookie
```

这就是为什么把认证凭证放进 `localStorage` 会扩大 XSS 后凭证被直接窃取的风险。

`HttpOnly` 能保护 Cookie 的可读性，但解决 XSS 的根本方式仍然是正确输出编码、HTML Sanitization、避免危险 DOM Sink，并配合 CSP 等防御。
##### CSRF：利用浏览器自动携带凭证

CSRF 的核心不是攻击者读取到了 Cookie。

恰恰相反：

> **攻击者可以不知道 Cookie 的具体值，只利用浏览器会自动带上它。**

例如：

```text
用户已经登录 bank.example
        ↓
浏览器存在登录 Cookie
        ↓
用户访问 attacker.example
        ↓
攻击者诱导浏览器向 bank.example
发送一个修改状态的请求
        ↓
如果 Cookie 满足发送条件
浏览器自动附带登录 Cookie
```

服务器如果只判断：

```text
有 Cookie
→ 就认为一定是用户主动发出的请求
```

就可能被利用。

因此：

```text
SameSite
CSRF Token
Origin / Referer 校验
```

等机制用于防御 CSRF。

`SameSite` 应该理解为重要的一层防御，而不是所有 Cookie 认证场景中唯一的 CSRF 防御。
#### 8. Session 是典型的“服务端有状态会话”

经典 Session 模型：

```text
浏览器
sessionId = A7F92...
       ↓
服务器
       ↓
Session Store
A7F92...
   ↓
{
  userId: 1001,
  role: admin,
  ...
}
```

浏览器保存的通常只是 `sessionId`，真正的用户 ID、权限、会话状态、登录时间等保存在服务端。

所以登录过程是：

```text
账号密码
   ↓
服务端认证成功
   ↓
创建 Session
   ↓
生成 sessionId
   ↓
通过 Set-Cookie 给浏览器
   ↓
浏览器后续自动携带 sessionId
   ↓
服务端查 Session Store
   ↓
恢复用户身份
```

Session ID 本身应该只是随机、不可预测、没有业务含义的标识，真正业务状态保存在服务端。
#### 9. Session 为什么在分布式系统中需要共享状态

单机时：

```text
Server A
└── Session Memory
```

问题不大。

但是：

```text
                 ┌→ Server A
Browser → Nginx/LB
                 └→ Server B
```

用户第一次请求可能落在 A，A 创建 Session；第二次请求落在 B，B 可能找不到这条 Session。

所以常见解决方式是：

```text
Server A ─┐
          ├→ Redis / Session DB
Server B ─┘
```

所有服务器访问同一个 Session Store。

因此 Session 的核心代价之一就是：

> **服务端必须维护每个活动会话的状态，并解决状态共享问题。**

但它也获得一个重要优势：

```text
删除 Session
→ 用户几乎可以立即下线
```

会话控制能力非常直接。
#### 10. Token 是凭证模型，而不是 JWT 的同义词

Token 可以泛指：

> **客户端携带、服务端据此判断身份或授权的一类凭证。**

它既可以是 Opaque Token，例如一段随机字符串：

```text
8af84ac93...
```

服务器拿它去 Token Store 查询：

```text
8af84ac93
↓
userId=1001
```

这种 Token 仍然是有状态的。

也可以是 Self-contained Token，例如 JWT。

所以：

```text
Token
├── Opaque Token
│   └── 通常需要服务端查询状态
│
└── Self-contained Token
    └── JWT 是典型形式
```

这也是为什么：

> **用了 Token，并不意味着系统天然无状态。**
#### 11. JWT 为什么能够减少每次请求的 Session 查询

最常见的签名 JWT 可以概念化为：

```text
Header.Payload.Signature
```

Header 描述 Token 类型、签名算法等信息；Payload 存放 Claims，例如 `sub`、`iss`、`aud`、`exp`、`iat`、role、scope；Signature 用于验证 Header + Payload 是否由可信一方签发，以及内容有没有被修改。

必须强调：

```text
Signature
→ 保证完整性 / 真实性

不等于
→ Payload 被加密
```

Payload 通常只是编码后可读取的数据，不能把密码、密钥等秘密直接放进去。
#### 12. JWT 验证不是“签名成功就通过”

服务端收到 JWT 后，至少要按照具体认证协议和业务要求检查：

```text
Token 格式是否合法
        ↓
算法是否是预期算法
        ↓
签名是否正确
        ↓
iss 是否可信
        ↓
aud 是否是当前服务
        ↓
exp 是否已经过期
        ↓
nbf 是否已经生效
        ↓
scope / role 是否允许访问当前资源
```

所以：

```text
签名正确
≠
这个 Token 当前一定可用
```

例如 Signature 正确但 `exp` 已过期，仍然必须拒绝。
#### 13. 为什么 Token 体系通常拆成 Access Token 和 Refresh Token

如果只有一个 Token，会面临直接矛盾。

如果 Token 生命周期很长，例如 90 天：用户体验好，但一旦泄露，攻击窗口也很长。

如果 Token 生命周期很短，例如 5～15 分钟：泄露后的风险窗口小，但用户不能每几分钟重新登录。

所以拆成：

```text
Access Token + Refresh Token
```

Access Token 生命周期短，用于频繁访问业务 API；Refresh Token 生命周期更长，不参与普通业务请求，只用于获取新的 Access Token，并需要更严格保护。

这就是长短 Token 设计最核心的“为什么”。
#### 14. 为什么 Access Token 通常放 Authorization Header

OAuth Bearer Token 的资源访问常见标准形式是：

```http
Authorization: Bearer <access_token>
```

这样做有一个重要工程意义：

> **客户端明确决定哪些 API 请求携带 Access Token。**

和 Cookie 不同：

```text
Cookie
→ 浏览器根据 Cookie 规则自动携带

Authorization Header
→ 客户端明确给目标请求附加凭证
```

因此 Access Token 可以只给业务 API 请求发送，不必跟随图片、CSS 等所有请求自动携带。

对纯浏览器 SPA，如果 JavaScript 需要自己构造 Authorization Header，一种常见安全思路是把短期 Access Token 只放在内存，而不是长期持久化到 `localStorage`，因为 XSS 一旦执行便可能直接读取 Web Storage。
#### 15. Refresh Token 为什么通常需要更严格的保存方式

因为：

```text
Access Token 泄露
→ 通常只能用到它过期

Refresh Token 泄露
→ 可能持续换取新的 Access Token
```

所以浏览器架构中常见一种实现：

```text
Access Token
→ JavaScript 内存
→ Authorization Header

Refresh Token
→ Secure + HttpOnly Cookie
→ JavaScript 不能直接读取
```

这是一种常见安全设计，但不是 OAuth 协议强制所有 Refresh Token 都必须放 Cookie。

例如 BFF 模式甚至可以让浏览器完全不接触 OAuth Token：

```text
Browser
↓ HttpOnly Session Cookie
BFF
↓ Access Token
API
```
#### 16. 为什么需要 Refresh Token Rotation

如果一个 Refresh Token 可以无限次使用：

```text
RT-1
→ Access Token
RT-1
→ Access Token
RT-1
→ Access Token
```

那么它一旦被窃取，攻击者也可以长期刷新。

Refresh Token Rotation 的思想是：

```text
RT-1
↓ 使用
AT-2 + RT-2

RT-1
↓ 立即失效
```

下一次只能使用 RT-2。

因此 Rotation 本质是在解决：

> **Refresh Token 被复制以后如何检测重放。**
#### 17. 为什么发现旧 Refresh Token 被再次使用时要撤销当前 Token 链

假设合法客户端和攻击者都拿到了 RT-1。

合法客户端先使用：

```text
RT-1
↓
RT-2

RT-1 已失效
```

后来攻击者再次提交 RT-1。

服务端发现：

```text
一个已经使用过并失效的 Refresh Token
又出现了
```

这意味着 Token 很可能被复制。

但此时服务器无法可靠判断：

```text
现在拿 RT-2 的到底是合法用户？
还是攻击者？
```

因此安全策略通常需要撤销当前活动 Refresh Token 或整个 Token Family / Grant，使双方都必须重新认证。
#### 18. Refresh Token Rotation 为什么会引入服务端状态

因为服务器必须知道：

```text
RT-1
→ 已经使用过

RT-2
→ 当前有效

RT-1 / RT-2
→ 属于同一个授权关系
```

否则看到 RT-1 第二次出现时，服务器无法知道它以前已经使用过。

因此 Rotation 至少需要保存足够的：

```text
Refresh Token 状态
Token Family / Grant 关系
撤销状态
```

这也是为什么现代系统经常不是“完全有状态”和“完全无状态”二选一，而是：

```text
Access Token
→ 尽量短期、自包含
→ 普通 API 请求不查 Session

Refresh Token / Login Session
→ 服务端保留必要状态
→ 管理刷新、撤销、设备下线、安全事件
```

也就是：

> **请求路径尽量无状态 + 会话生命周期有状态控制。**
#### 19. Access Token 过期时为什么要做客户端并发控制

假设页面同时请求：

```text
GET /user、GET /orders、GET /messages
```

三个请求的 Access Token 同时过期，全部返回 `401`。

错误做法是：

```text
/user     → Refresh
/orders   → Refresh
/messages → Refresh
```

这样会同时出现三个 Refresh 请求。

如果正在使用 Refresh Token Rotation，更危险：第一次刷新可能已经让旧 Refresh Token 失效，后面的刷新继续使用旧 Token，就可能被服务端识别成旧 Token 重放。

所以前端需要把刷新过程串行化。
#### 20. 前端通常通过“全局刷新状态 + 等待队列”解决并发刷新

核心状态可以是：

```javascript
let isRefreshing = false
```

第一个发现 Access Token 失效的请求：

```text
401
↓
发现 isRefreshing = false
↓
设置 true
↓
发 Refresh 请求
```

另外两个请求看到：

```text
isRefreshing = true
```

就不再 Refresh，而是把自己的重试逻辑加入等待队列，或者统一等待同一个 Refresh Promise。

刷新成功后：

```text
更新 Access Token
↓
释放等待队列
```

但是这里必须明确：

> **不是三个请求共享 Refresh 请求的业务响应。**

真正发生的是：

```text
原来的 /user 请求
→ 带新 Access Token 再发送一次
→ 得到 /user 自己的响应

原来的 /orders 请求
→ 带新 Access Token 再发送一次
→ 得到 /orders 自己的响应

原来的 /messages 请求
→ 带新 Access Token 再发送一次
→ 得到 /messages 自己的响应
```

所以共享的只有：

```text
“等待这一次 Refresh 完成”
```

不是：

```text
“共享同一个 HTTP 业务响应”
```

这正是客户端 Token 刷新的典型并发控制问题。
#### 21. Refresh 失败时为什么不能继续重试原请求

如果 Refresh Token 已经过期、被撤销或被检测为重放，说明当前客户端已经没有合法续期能力。

此时应该：

```text
Refresh 失败
↓
结束 refreshing 状态
↓
拒绝等待队列
↓
清理客户端认证状态
↓
跳转重新登录
```

不能继续无限 Refresh，否则很容易形成：

```text
401
→ Refresh
→ 401
→ Refresh
→ 无限循环
```
#### 22. 为什么 JWT 的退出登录比 Session 更复杂

Session 的状态就在服务端：

```text
sessionId
↓
Session Store
```

因此退出时删除 Session，就能够让会话立即失效。

而一个完全自包含的 JWT，如果服务器普通请求只检查签名、`exp`、`aud` 等 Claims，那么用户点击退出以后，即使本地把 JWT 删除，攻击者如果此前复制了一份 Token，它在 `exp` 到达之前仍可能通过服务端验证。

所以 JWT 的无状态优势同时意味着：

> **服务端缺少天然的“删除这一条会话记录即可立即失效”的控制点。**
#### 23. JWT 如果需要主动撤销，就需要重新引入状态或缩短风险窗口

常见方案包括：

```text
短生命周期 Access Token
Refresh Token Revocation
Token Blacklist / Revocation List
jti 撤销列表
Token Version / Session Version
设备级 Session
```

例如用户修改密码后，可以增加用户的 `tokenVersion`，服务端发现 JWT 中版本低于当前版本时就拒绝。

但这也说明：

> **真正需要强会话控制的 JWT 系统，往往最终还是会引入一定服务端状态。**

所以“JWT 完全无状态”不能绝对化。
#### 24. 为什么实际系统经常采用“短 Access Token + 有状态 Refresh Session”

一个常见折中架构是：

```text
Access Token
短生命周期
      ↓
普通请求只做 Token 验证
      ↓
不必每次查询 Session Store
```

同时：

```text
Refresh Token
长期
      ↓
服务器维护 Refresh 状态
      ↓
支持：
轮换
撤销
主动下线
密码修改失效
风险检测
```

因此系统既获得普通 API 请求路径相对简单，又保留关键会话生命周期的服务端控制能力。

所以更成熟的回答不是：

> “现在主流一定是完全无状态 JWT。”

而是：

> **实际系统通常会根据安全要求保留必要状态；比较常见的设计是短期 Access Token 承担高频资源访问，Refresh Token 或登录 Session 由服务端进行可控管理。完全无状态并不是认证系统本身的目标，安全、撤销能力、扩展性和性能之间的平衡才是目标。**

---

### 标准回答

会话控制首先是为了解决 HTTP 无状态的问题。用户第一次通过账号密码等方式完成认证以后，HTTP 协议不会自动帮应用记住后续请求还是这个用户发来的，所以应用需要建立一套机制，让客户端在后续请求中能够持续提供身份凭证，服务端再根据凭证恢复用户身份，并进一步完成权限判断。这里认证 Authentication 解决的是“你是谁”，授权 Authorization 解决的是“你能做什么”。

在 Web 中首先会遇到 Cookie。Cookie 本身不能简单理解成一种和 Session、Token 并列的认证方案，它更准确是一种浏览器保存并按照规则自动参与 HTTP 请求的状态机制。服务器可以通过 `Set-Cookie` 让浏览器保存 Cookie，之后只要请求满足 Domain、Path、Secure、SameSite 等条件，浏览器就可以自动携带对应 Cookie。因此 Cookie 特别适合承担 `sessionId` 或某些认证凭证的传输。

Cookie 可以由前端通过 `document.cookie` 设置，也可以由服务端通过 `Set-Cookie` 下发。前端设置更适合主题、偏好等非敏感数据；认证相关 Cookie 一般更希望由服务端下发，因为服务端可以设置 `HttpOnly`，这样 JavaScript 就不能直接读取 Cookie。Cookie 又可以区分会话型和持久型：关键看是否设置了 `Expires` 或 `Max-Age` 等显式生命周期，而不是简单理解成一个“存在内存”、一个“存在磁盘”。浏览器究竟怎样物理保存是实现细节，而且现代浏览器还存在 Session Restore。

Cookie 的几个属性最好按照它们解决的问题理解。`Domain` 决定 Cookie 可以发送给哪些主机范围，`Path` 决定哪些 URL 路径匹配；它们解决的是“请求目标是否匹配”。`SameSite` 则解决另一个维度，它判断请求是否处于跨站上下文，以及这种情况下 Cookie 是否允许发送，所以 Domain/Path 和 SameSite 不能混在一起。`HttpOnly` 禁止 JavaScript 直接读取 Cookie，`Secure` 限制 Cookie 只通过安全连接发送，而 `SameSite` 可以降低部分 CSRF 风险。

这里就会涉及 XSS 和 CSRF。XSS 的核心是攻击者控制的脚本最终在目标站点的 Origin 中执行。例如 Stored XSS 中，攻击内容被服务器保存，其他用户访问页面时恶意内容又被输出并执行。此时脚本可能读取页面数据、`localStorage` 或非 HttpOnly Cookie，也可以利用用户权限发请求。因此 `HttpOnly` 能降低认证 Cookie 被脚本直接窃取的风险，但并不能消灭 XSS；真正防 XSS 仍然依赖正确输出编码、HTML Sanitization、安全 DOM API 和 CSP 等措施。

CSRF 则不同，它往往不需要知道 Cookie 的具体内容，而是利用浏览器会自动携带 Cookie 的特点。用户已经登录目标网站以后，如果访问攻击者页面，攻击者可能诱导浏览器向目标站点发送修改状态的请求，而浏览器又自动附带了用户的登录 Cookie。`SameSite` 就是限制这种跨站上下文 Cookie 发送的重要机制之一，实际系统还会结合 CSRF Token、Origin/Referer 校验等手段。

在 Cookie 之上，经典的会话方案是 Cookie + Session。用户登录成功以后，服务端创建 Session，把真正的用户 ID、权限、会话状态等信息保存在服务端，然后生成一个随机的 `sessionId`，通过 Cookie 发给浏览器。以后浏览器自动携带 `sessionId`，服务端根据它到 Session Store 中查找用户状态。这是一种有状态认证，因为服务器必须维护 `sessionId → Session Data` 的关系。

Session 的优点是控制能力强。例如用户退出登录时，服务端直接删除 Session，就可以立即让登录失效；缺点是分布式系统需要共享会话状态。如果有多台应用服务器，Session 只放单机内存就可能导致请求落到另一台机器时找不到登录信息，因此生产环境常把 Session 放在 Redis、数据库或专门的 Session Store 中。

另一类方案是 Token。Token 是客户端证明身份或授权的一类凭证，但 Token 不等于 JWT。Token 可以只是随机字符串，服务端收到后再去数据库查询，这种 Opaque Token 本身仍然是有状态的；也可以使用自包含 Token，例如 JWT。JWT 常见形式是 `header.payload.signature`，Header 描述算法等信息，Payload 保存 `sub`、`iss`、`aud`、`exp` 等 Claims，Signature 用于验证 Token 的真实性和完整性。需要注意，普通签名 JWT 的 Payload 并没有被加密，所以不能把密码、密钥等秘密直接放进去。

服务端验证 JWT 时也不能只检查签名。完整验证通常还包括算法是不是预期算法、`iss` 是否可信、`aud` 是否对应当前服务、`exp` 是否过期、`nbf` 是否已经生效以及 scope、role 等权限条件。也就是说签名正确只代表 Token 没有被非法修改并且能够由相应密钥验证，不等于它当前一定可以访问这个 API。

Token 体系中又经常把凭证拆成 Access Token 和 Refresh Token，这是为了解决安全与用户体验之间的矛盾。如果 Access Token 设置得很长，一旦泄露攻击窗口就很长；如果设置得很短，用户又不能每几分钟重新登录。所以 Access Token 通常生命周期较短，用于频繁访问 API；Refresh Token 生命周期更长，只在 Access Token 失效时用于换取新的 Access Token。

Access Token 在 OAuth Bearer Token 模式下通常通过 `Authorization: Bearer <token>` 发送，这让客户端可以明确控制哪些资源请求携带它。对纯浏览器 SPA，如果前端自己持有 Access Token，一个常见安全思路是只把短期 Access Token 放在内存中，而不是长期放到 `localStorage`。Refresh Token 因为长期续期能力更强，需要更严格保护；浏览器架构中常见的一种设计是使用 `Secure + HttpOnly` Cookie 保存 Refresh Token，使 JavaScript 无法直接读取，但这是一种架构实践，并不是 OAuth 协议强制规定所有 Refresh Token 必须放 Cookie。BFF 架构甚至可以让浏览器完全不接触 Access Token 和 Refresh Token。

为了进一步控制 Refresh Token 泄露风险，现代 OAuth 安全实践会使用 Refresh Token Rotation。每次 RT-1 换取新的 Access Token 时，同时返回新的 RT-2，并立即让 RT-1 失效。如果以后服务器再次收到 RT-1，就说明旧 Refresh Token 很可能被复制并发生了重放。在 Rotation 模式下服务器需要保留旧 Token 与当前 Token 的关系，才能检测重放。

如果服务器发现一个已经失效的旧 Refresh Token 被再次使用，它其实无法判断到底攻击者还是合法客户端先使用了旧 Token，因此需要撤销当前活动 Refresh Token，甚至整个 Token Family 或 Grant，使整个授权关系重新认证。也正因为如此，Refresh Token Rotation 本身需要一定的服务端状态。服务器不一定保存 Refresh Token 明文，但至少要保存足够的 Token family、有效性和撤销关系。

这也说明现代认证系统没有必要为了“无状态”而追求完全无状态。一个很常见的折中是：Access Token 生命周期较短，普通 API 请求主要验证 Token，不需要每次查询中心 Session；而 Refresh Token、设备会话、撤销关系由服务器保留必要状态，用于轮换、退出登录、强制下线、密码修改和安全事件。这实际上是“高频资源访问尽量无状态，关键会话生命周期有状态控制”。

前端还有一个很重要的工程问题是并发刷新。如果三个接口同时因为 Access Token 过期返回 `401`，不能让三个请求各自发一次 Refresh，特别是在 Refresh Token Rotation 下，第一次刷新可能已经让旧 Refresh Token 失效，后面的刷新就可能被识别为旧 Token 重放。

所以客户端通常维护一个全局 `isRefreshing` 状态和等待队列。第一个发现 Token 失效的请求负责发起 Refresh，并把 `isRefreshing` 设置为 `true`；其他请求发现正在刷新，就不再发送 Refresh，而是等待这一次刷新完成。Refresh 成功以后更新 Access Token，然后之前失败的每一个 HTTP 请求都带着新的 Access Token**分别重新发送一次**。它们共享的是“等待 Refresh 完成”这个 Promise 或状态，不是共享同一个业务响应。`/user` 重试后仍然拿 `/user` 的响应，`/orders` 重试后仍然拿 `/orders` 的响应，`/messages` 也是一样。如果 Refresh 本身失败，则应该拒绝等待队列、清理登录状态并要求重新认证，而不是继续无限刷新。

最后，JWT 相比 Session 的另一个代价是退出和主动撤销更复杂。Session 在服务端有明确记录，删除 Session 就能够立即失效；而完全自包含的 JWT 如果已经被攻击者复制，即使用户本地退出并删除 Token，只要 JWT 还没到 `exp`，服务端又没有额外的撤销状态，它仍可能继续有效。因此工程上通常通过短生命周期 Access Token、撤销 Refresh Token、Token Version、黑名单或设备 Session 等机制获得主动控制。

所以这套知识最后可以收敛成：

```text
会话控制
│
├─ Cookie
│   └─ 浏览器保存和自动发送状态的机制
│
├─ Cookie + Session
│   └─ 服务端有状态会话
│
└─ Token
    ├─ Opaque Token
    │   └─ 可以有状态
    │
    └─ JWT
        └─ 可以自包含
            ↓
      Access Token：短期资源访问
            +
      Refresh Token：长期续期与会话控制
            ↓
      Rotation / Revocation / 并发刷新控制
```

真正需要理解的不是“Cookie、Session、JWT 哪一个最好”，而是每一层为什么存在：**Cookie 解决浏览器怎样保存和发送状态，Session 解决服务端怎样维护会话，Token 解决客户端怎样携带凭证，JWT 解决凭证怎样自包含表达，Access/Refresh Token 解决安全与体验的矛盾，而 Refresh Rotation、撤销状态和前端刷新队列则解决真实工程中的泄露、下线和并发问题。**

---

**Sources:**

- [Set-Cookie header - MDN](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Set-Cookie)
- [Secure cookie configuration - MDN](https://developer.mozilla.org/en-US/docs/Web/Security/Practical_implementation_guides/Cookies)
- [Session Management Cheat Sheet - OWASP](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html)
- [Cross Site Scripting Prevention Cheat Sheet - OWASP](https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html)
- [Cross-Site Request Forgery Prevention Cheat Sheet - OWASP](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html)
- [RFC 6750: OAuth 2.0 Bearer Token Usage](https://www.rfc-editor.org/info/rfc6750)
- [RFC 7519: JSON Web Token](https://www.rfc-editor.org/info/rfc7519)
- [RFC 9700: Best Current Practice for OAuth 2.0 Security](https://www.rfc-editor.org/info/rfc9700)

## 第51题 什么是同源策略？为什么会产生跨源问题？CORS 和代理是如何解决跨源问题的？

### 题目

什么是浏览器的**同源策略（Same-Origin Policy）**？浏览器为什么需要限制不同 Origin 之间的数据访问？

当前端页面需要请求不同 Origin 的后端接口时，为什么会出现跨源问题？工程中通常有哪些解决方式？

请说明：

- Origin 和同源判断规则；
- 同源策略真正限制的内容和作用范围；
- 为什么浏览器会出现跨源限制，而 Server-to-Server 请求通常不存在浏览器意义上的 CORS 问题；
- CORS 和反向代理两类跨源解决方案；
- CORS 的授权机制和 Preflight；
- 带登录凭证的跨源请求如何处理；
- Cookie 的 SameSite 与 CORS 的关系；
- Fetch 中 `mode`、`credentials` 的作用；
- CORS、SameSite 和 CSRF 的安全边界。

### 问题

### 1. 什么是 Origin 和同源策略？浏览器为什么需要同源策略？

需要说明：

- Origin 由哪些部分组成；
- 协议、主机、端口不同分别会发生什么；
- Path 是否参与同源判断；
- 同源策略为什么是浏览器的安全机制；
- 它主要防止什么安全问题。

### 2. 同源策略到底限制什么？为什么跨源问题主要发生在浏览器环境？

需要回答：

- 浏览器是不是完全禁止所有 Cross-Origin Request；
- 为什么 `<img>`、`<script>`、`<link>` 等可以跨源加载；
- “HTTP 请求发送成功”和“JavaScript 能读取 Response”有什么区别；
- 为什么后端已经返回 `200`，前端仍可能报 CORS Error；
- 为什么 Node、Java、Nginx 等 Server-to-Server 请求不存在浏览器意义上的 CORS 限制。

### 3. 工程上解决跨源问题主要有哪些方式？

需要建立两种基本思路：
#### CORS

```text
Browser
↓ Cross-Origin
API Server
```

浏览器确实访问另一个 Origin，由目标服务器明确授权。
#### Proxy

```text
Browser
↓ Same-Origin
Proxy
↓
Backend
```

让浏览器始终访问同一个 Origin，再由服务器代理转发。

需要说明：

- CORS 为什么属于“允许跨源”；
- Proxy 为什么属于“避免浏览器直接跨源”；
- 为什么 Proxy 能成立的根本原因是 Server-to-Server 请求不受浏览器同源策略约束。

### 4. CORS 是如何完成跨源授权的？为什么还会出现 Preflight？

需要统一说明：

- `Origin` 是什么；
- `Access-Control-Allow-Origin` 是什么；
- 为什么说 CORS 是“服务器授权、浏览器执行”；
- 哪些请求可以直接发送；
- 哪些请求需要 Preflight；
- `OPTIONS` 预检请求的作用；
- `Access-Control-Request-Method`、`Access-Control-Request-Headers` 是什么；
- `Access-Control-Allow-Methods`、`Access-Control-Allow-Headers` 是什么；
- 为什么预检通过后还需要发送真正业务请求；
- `Access-Control-Max-Age` 的作用。

### 5. 带登录状态的跨源请求如何处理？Credentials 是什么？

需要说明：

- Credentials 是什么；
- Cookie 为什么属于 Credentials；
- Fetch 的 `credentials` 配置控制什么；
- `omit`、`same-origin`、`include` 分别是什么意思；
- 为什么默认是 `same-origin`；
- `credentials: "include"` 做了什么；
- 为什么服务端还要返回：
  ```http
  Access-Control-Allow-Credentials: true
  ```
- 为什么带 Credentials 的 CORS 响应不能简单使用：
  ```http
  Access-Control-Allow-Origin: *
  ```

### 6. CORS 已经允许跨源以后，为什么 Cookie 仍然可能不会发送？

需要说明：

- CORS 和 Cookie 发送规则分别负责什么；
- `Domain`、`Path`、`Secure`、`SameSite` 等规则是否仍然生效；
- `credentials: "include"` 能不能绕过 Cookie 自身规则；
- Cross-Origin 和 Cross-Site 有什么区别；
- 为什么一个请求可以 Cross-Origin，但仍然 Same-Site。

### 7. Fetch 中的 Request Mode 是什么？`same-origin`、`cors`、`no-cors` 有什么区别？

需要回答：

- `mode` 在 Fetch 中控制什么；
- `same-origin` 的作用；
- `cors` 的作用；
- `no-cors` 是什么类型的请求模式；
- 什么是 opaque Response；
- `no-cors` 为什么适用于某些只需要加载或发送、但不需要读取完整响应的场景；
- 为什么普通 JSON API 不能依靠 `no-cors` 解决跨域。

### 8. Vite Proxy 和 Nginx 反向代理是如何解决跨源问题的？

需要说明：

- Vite Dev Server Proxy 的请求路径；
- Nginx 生产环境反向代理的请求路径；
- 浏览器看到的 Origin 为什么没有变化；
- 为什么真正的跨服务请求发生在服务器端；
- CORS 与 Proxy 应该怎样选。

### 9. CORS、SameSite 和 CSRF 分别解决什么问题？

需要明确：

```text
CORS
→ 控制跨 Origin 的脚本能否访问响应

SameSite
→ 控制跨 Site 场景下 Cookie 是否发送

CSRF 防御
→ 防止攻击者借助用户已有身份执行非预期操作
```

并说明为什么三者有关联，但不能相互替代。

### 回答要点

#### 1. 同源策略与 Origin

同源策略的起点是浏览器需要为不同网站建立数据访问边界。

假设用户已经登录：

```text
https://bank.example
```

同时又访问：

```text
https://evil.example
```

如果 `evil.example` 中的 JavaScript 能够直接执行：

```javascript
const response = await fetch(
  'https://bank.example/account'
)

const data = await response.json()
```

并读取用户的银行账户信息，那么用户只要访问一个恶意页面，其他已经登录网站中的数据就可能被窃取。

因此浏览器建立了 **Same-Origin Policy**：

> 一个 Origin 中的脚本，默认不能随意访问另一个 Origin 中受保护的数据。

对于普通 HTTP/HTTPS URL，Origin 主要由：

```text
scheme + host + port
```

组成，即：

```text
协议 + 主机 + 端口
```

例如：

```text
https://example.com:443
```

可以拆成：

```text
scheme = https
host   = example.com
port   = 443
```

只有三者全部一致才属于同源。Path 不参与 Origin 判断。

例如：

```text
https://example.com/user
https://example.com/orders
```

同源。

但：

```text
http://example.com
https://example.com
```

协议不同，跨源。

```text
https://app.example.com
https://api.example.com
```

Host 不同，跨源。

```text
http://localhost:5173
http://localhost:8080
```

端口不同，也跨源。

因此前后端分离开发环境中，即使前后端都运行在本机，也经常产生 Cross-Origin Request。
#### 2. 同源策略的限制范围

同源策略并不是规定：

```text
Cross-Origin
→ 所有 HTTP 请求都不能发送
```

浏览器本身就允许很多跨源资源加载，例如：

```html
<img src="https://cdn.example.com/logo.png">

<script src="https://cdn.example.com/app.js"></script>

<link
  rel="stylesheet"
  href="https://cdn.example.com/app.css"
>
```

HTML 表单同样可以向其他站点发送请求。

同源策略重点限制的是：

> **一个 Origin 中的脚本对另一个 Origin 数据的访问能力。**

因此需要区分两个阶段：

```text
HTTP Request 是否真正发送

和

JavaScript 是否能够读取 Response
```

例如前端执行：

```javascript
fetch('https://api.example.com/user')
```

可能发生：

```text
Browser
↓
GET /user

Server
↓
正常处理
↓
200 OK + JSON

Browser
↓
执行 CORS 检查

检查失败
↓
不把 Response 暴露给 JavaScript
```

所以后端日志完全可能看到：

```text
200 OK
```

而前端看到：

```text
Blocked by CORS policy
```

这两件事并不冲突。
##### Server-to-Server 请求

Same-Origin Policy 和 CORS 是**浏览器执行的安全机制**。

例如：

```text
Browser
↓
API
```

请求过程中存在浏览器，浏览器会执行同源策略和 CORS 检查。

而：

```text
Nginx
↓
Spring Boot
```

或者：

```text
Node Server
↓
Java Service
```

属于服务器之间的 HTTP 通信。

服务器本身不会因为：

```text
host 不同
port 不同
```

就执行浏览器的 Same-Origin Policy。

服务器之间当然仍然需要处理：

```text
认证、授权、TLS、防火墙、网络 ACL
```

等安全问题，但这些并不是 CORS。

因此：

> **所谓的前端跨源问题，本质上主要来自浏览器的安全模型，而不是 HTTP 协议禁止不同服务器互相通信。**

这也是反向代理能够解决浏览器跨源问题的基础。
#### 3. 跨源问题的两类解决方案

工程上解决跨源问题主要有两类思路。
##### CORS：允许浏览器跨源访问

例如：

```text
Frontend
https://app.example.com

↓

Backend
https://api.example.com
```

浏览器确实产生：

```text
Cross-Origin Request
```

此时让：

```text
API Server
```

通过 CORS Header 明确授权：

> `app.example.com` 可以访问我的资源。

结构是：

```text
Browser
↓ Cross-Origin
Backend
↓
CORS Authorization
```

这是：

> **保留跨源架构，通过授权解决。**
##### Proxy：避免浏览器直接跨源

例如：

```text
Browser
↓
https://example.com/api/user
↓
Nginx
↓
http://backend:8080/user
```

对于 Browser：

```text
页面：
https://example.com

接口：
https://example.com/api/user
```

仍然是 Same-Origin。

真正不同服务之间的调用发生在：

```text
Nginx
→ Backend
```

这一段属于 Server-to-Server。

因此：

```text
Browser
↓ Same-Origin
Proxy
↓ Server-to-Server
Backend
```

不会触发浏览器的 Cross-Origin API 限制。

所以两种方案可以这样理解：

```text
CORS
→ Browser 确实跨源
→ Server 授权 Browser
```

```text
Proxy
→ Browser 不直接跨源
→ Server 帮 Browser 转发
```

它们不是同一种机制。
#### 4. CORS 的授权机制与 Preflight

CORS 全称：

```text
Cross-Origin Resource Sharing
```

是一套基于 HTTP Header 的跨源资源共享机制。

例如：

```text
Frontend:
https://app.example.com

Backend:
https://api.example.com
```

浏览器发送跨源请求时，可以带：

```http
Origin: https://app.example.com
```

这个 Header 表示：

> 请求所属的 Origin 是谁。

如果资源服务器允许这个 Origin 访问，可以返回：

```http
Access-Control-Allow-Origin: https://app.example.com
```

表示：

> 我允许这个 Origin 读取当前响应。

最后由 Browser 执行检查。

因此 CORS 可以概括成：

```text
Browser
↓
Origin:
“请求来自哪个 Origin？”

Server
↓
Access-Control-Allow-Origin:
“哪些 Origin 可以访问？”

Browser
↓
执行授权检查
```

所以 CORS 的控制关系是：

> **Server 声明授权，Browser 执行授权。**
##### CORS 请求为什么有的直接发送，有的需要预检？

CORS 中存在一组 safelist 条件。

符合条件的一些：

```text
GET、HEAD、POST
```

以及规定范围内的 Header 和 Content-Type，可以不经过 Preflight，直接发送业务请求。

例如：

```text
GET /user
```

可能直接：

```text
Browser
↓
GET /user
↓
Server
↓
Response
↓
Browser 执行 CORS Check
```

所以：

```text
没有 Preflight
≠
没有 CORS
```

只是没有额外的 OPTIONS 检查。

如果请求超出了 safelist，例如使用：

```text
PUT
DELETE
```

或者：

```http
Authorization: Bearer xxx
```

或者一些自定义 Header，浏览器通常需要先执行 Preflight。

例如真正准备发送：

```http
DELETE /users/1001

Authorization: Bearer xxx
```

浏览器先发送：

```http
OPTIONS /users/1001

Origin: https://app.example.com

Access-Control-Request-Method: DELETE

Access-Control-Request-Headers: authorization
```

它是在询问服务器：

> 这个 Origin 是否允许使用 DELETE，并携带 Authorization Header？

服务器如果允许，可以返回：

```http
Access-Control-Allow-Origin:
https://app.example.com

Access-Control-Allow-Methods:
DELETE

Access-Control-Allow-Headers:
Authorization
```

浏览器确认后，再发送真正的：

```http
DELETE /users/1001
```

因此完整结构是：

```text
非 Safelisted Cross-Origin Request
↓
OPTIONS Preflight
↓
服务器返回允许的
Origin / Method / Headers
↓
Browser 检查通过
↓
真正业务 Request
```

Preflight 本身不处理真正业务，只负责确认这类跨源能力是否得到服务器授权。

服务器还可以返回：

```http
Access-Control-Max-Age: 86400
```

让浏览器缓存预检结果，减少重复 OPTIONS 请求产生的额外网络开销。
#### 5. 带凭证的 CORS 请求

前面的 CORS 主要解决：

> **当前 Origin 有没有访问这个资源的权限。**

实际登录系统还会出现另外一个问题：

> **这次跨源 Request 是否需要携带用户的身份凭证？**

这里涉及 **Credentials**。

在 Fetch 语境中，Credentials 是服务器可以用来认证用户的身份凭证，例如：

```text
HTTP Cookie
TLS Client Certificate
HTTP Authentication Credentials
```

对于普通 Web 登录，最常见的是：

```text
Cookie
```

例如浏览器保存：

```text
sessionId=abc123
```

跨源请求 API 时，就需要决定这个 Cookie 是否参与请求。

Fetch 提供：

```javascript
credentials
```

控制浏览器如何处理 Credentials。

主要有三个值：
##### `omit`

```text
不包含 Credentials
```
##### `same-origin`

默认值：

```text
Same-Origin Request
→ 包含相应 Credentials

Cross-Origin Request
→ 不按跨源携带 Credentials 的方式处理
```
##### `include`

```text
即使 Cross-Origin
也允许包含 Credentials
```

例如：

```javascript
fetch('https://api.example.com/user', {
  credentials: 'include'
})
```

表示：

> 这个跨源 Fetch 允许携带相应的 Credentials。

默认使用 `same-origin` 而不是 `include`，是因为 Cookie 等 Credentials 通常代表用户已经建立的认证状态，如果任意跨源请求默认都携带用户身份，会扩大跨站身份请求带来的安全暴露面，因此 Fetch 使用更加保守的默认策略。
##### 服务端的 Credentials 授权

如果：

```javascript
credentials: 'include'
```

服务器还必须明确同意带凭证的 CORS：

```http
Access-Control-Allow-Credentials: true
```

并且：

```http
Access-Control-Allow-Origin
```

需要指定明确 Origin，例如：

```http
Access-Control-Allow-Origin:
https://app.example.com
```

不能使用：

```http
Access-Control-Allow-Origin: *
```

来响应带 Credentials 的 CORS 请求。

因此 Credentialed CORS 的关系是：

```text
Client
credentials: include
↓
允许跨源请求包含 Credentials

+

Server
Access-Control-Allow-Credentials: true
↓
允许 Credentialed CORS

+

Access-Control-Allow-Origin:
https://app.example.com
↓
明确允许这个 Origin
```
#### 6. 跨源请求中的 Cookie 与 SameSite

CORS 配置正确：

```text
≠
Cookie 一定发送
```

这是因为：

```text
CORS
```

和：

```text
Cookie Sending Rules
```

解决的是两个不同的问题。

CORS 解决：

> **这个 Origin 的 JavaScript 能否进行跨源资源访问。**

Cookie 是否发送还需要检查：

```text
Domain、Path、Secure、SameSite、Expiration、浏览器 Cookie 策略
```

等规则。

因此：

```javascript
credentials: 'include'
```

并不是：

> 强制 Browser 把所有 Cookie 都发出去。

它只是允许这个请求在 Cross-Origin 情况下包含 Credentials。

Cookie 自己仍然需要满足发送条件。
##### Cross-Origin 和 Cross-Site 的区别

Origin 主要看：

```text
scheme + host + port
```

Site 则基于站点概念，主要涉及 scheme 和 registrable domain，端口不是 Site 判断的核心。

例如：

```text
https://app.example.com
https://api.example.com
```

由于 Host 不同，所以：

```text
Cross-Origin
```

但它们可以仍然属于：

```text
Same-Site
```

因此：

```text
Cross-Origin
≠
Cross-Site
```

这也意味着：

```text
CORS
```

和：

```text
SameSite Cookie
```

不能混为同一个“跨域机制”。

`SameSite` 主要控制 Cookie 是否参与 Cross-Site Request。
#### 7. Fetch Request Mode

Fetch API 还提供一个：

```javascript
mode
```

配置。

`mode` 描述这个 Request 采用怎样的浏览器请求模式。

对普通前端请求，主要关注：

```text
same-origin、cors、no-cors
```
##### `same-origin`

表示：

> 请求只允许访问 Same-Origin Resource。

如果目标是其他 Origin：

```text
Request 失败
```
##### `cors`

表示：

> 如果目标 Cross-Origin，则使用 CORS 机制处理。

例如：

```javascript
fetch('https://api.example.com/user', {
  mode: 'cors'
})
```

浏览器会根据请求情况执行：

```text
CORS
↓
必要时 Preflight
↓
真正 Request
↓
CORS Response Check
```

对于需要 JavaScript 正常读取跨源 API Response 的请求，这是主要模式。

普通 `fetch()` 的默认 `mode` 是 `cors`。
##### `no-cors`

`no-cors` 是一种**受限制的跨源请求模式**。

使用它时，请求可以使用的 Method 和 Header 会受到限制。例如 Method 主要限制为：

```text
GET、HEAD、POST
```

Header 也只能使用受允许的有限集合。

更重要的是，跨源 Response 对 JavaScript 来说通常会变成：

```text
opaque Response
```

其特点包括：

```text
status = 0
headers 不向 JS 暴露
body 无法由 JS 读取
```

因此：

```javascript
const response = await fetch(url, {
  mode: 'no-cors'
})
```

不能把 `no-cors` 理解成：

> 允许 JavaScript 随意读取跨源接口。

它提供的是：

> **受限制地发起跨源请求，同时不向 JavaScript 暴露正常的跨源响应内容。**

这类模式适合某些：

```text
只需要发送 或 只需要加载
```

而不需要 JavaScript 读取完整 Response 的场景。

例如部分：

```text
资源加载
日志/统计发送
Service Worker 缓存场景
```

可以使用类似模式。

但普通 REST API 通常需要：

```javascript
const data = await response.json()
```

这就要求 JavaScript 能访问 Response Body。

因此：

```text
JSON API
↓
需要读取 Response
↓
no-cors 不适合
```

应使用：

```text
正常 CORS
```

或者：

```text
Proxy
```
#### 8. Vite Proxy 与 Nginx 反向代理

Proxy 方案的核心是：

> **让 Browser 发出的请求本身保持 Same-Origin。**
##### 开发环境

例如：

```text
Frontend:
http://localhost:5173

Backend:
http://localhost:8080
```

直接：

```javascript
fetch('http://localhost:8080/api/user')
```

是 Cross-Origin。

配置 Vite Proxy 后：

```javascript
fetch('/api/user')
```

浏览器实际访问：

```text
http://localhost:5173/api/user
```

流程：

```text
Browser
↓
localhost:5173/api/user
↓
Vite Dev Server
↓
localhost:8080/api/user
```

对于 Browser：

```text
Page Origin
=
API Request Origin
=
http://localhost:5173
```

因此没有浏览器层面的 Cross-Origin API Request。
##### 生产环境

Nginx 也可以形成：

```text
Browser
↓
https://example.com

Nginx
├── /
│   → Frontend Static Files
│
└── /api
    → Backend:8080
```

前端：

```javascript
fetch('/api/user')
```

浏览器看到：

```text
Page:
https://example.com

API:
https://example.com/api/user
```

仍然 Same-Origin。

真正：

```text
Nginx
→ Backend:8080
```

发生在 Server-to-Server。

所以生产环境中非常常见：

```text
一个公网 Origin + 内部多个服务
```

由：

```text
Nginx、API Gateway、BFF
```

统一代理。
##### CORS 和 Proxy 的选择

可以这样理解：

```text
CORS
→ 架构上确实需要 Browser 直接访问多个 Origin
```

例如：

```text
app.example.com
↓
api.other.com
```

则配置 CORS。

而：

```text
Proxy
→ 可以通过统一入口让 Browser 保持 Same-Origin
```

例如：

```text
example.com
/api/*
```

统一经过 Gateway / Nginx 转发。

二者都合理，选择取决于系统部署方式和安全架构。
#### 9. CORS、SameSite 与 CSRF 的安全边界

最后需要把三个容易混淆的概念分开。
##### CORS

主要解决：

> **一个 Origin 中的 JavaScript 是否可以访问另一个 Origin 的 Response。**
##### SameSite

主要解决：

> **在 Cross-Site Request 中，Cookie 是否允许发送。**

例如：

```http
SameSite=Strict
SameSite=Lax
SameSite=None
```

控制的是 Cookie 的 Cross-Site 发送行为。
##### CSRF

解决的是：

> **如何防止攻击者借助用户已有的认证状态，让目标服务器执行用户没有主动意图发起的操作。**

例如：

```text
用户已经登录银行
↓
攻击者诱导用户访问恶意网站
↓
浏览器向银行发出请求
↓
如果认证 Cookie 被带上
↓
服务器可能把它当成用户请求
```

攻击者不一定需要读取：

```text
Response
```

只要：

```text
转账、删除、修改
```

真正发生，攻击目的就可能已经达到。

所以：

```text
CORS
≠
CSRF Protection
```

CSRF 通常仍需要结合：

```text
SameSite
CSRF Token
Origin / Referer Validation
```

等机制。

### 标准回答

同源策略是浏览器的一项核心安全机制。对于普通 HTTP 和 HTTPS URL，Origin 主要由协议、主机和端口组成，只有这三部分全部一致才属于同源，Path 不参与判断。例如 `localhost:5173` 和 `localhost:8080` 虽然都在本机，但端口不同，所以属于两个不同 Origin。

浏览器之所以需要同源策略，是为了隔离不同网站的数据访问。比如用户已经登录银行网站，同时又打开了恶意网站，如果恶意网站中的 JavaScript 可以随意读取银行接口返回的数据，就可能直接窃取用户信息。因此浏览器默认限制一个 Origin 中的脚本访问另一个 Origin 中受保护的数据。

但同源策略并不是禁止所有跨源 HTTP 请求。像 `<img>`、`<script>`、`<link>`、表单等本来就可以产生一定程度的跨源加载或提交。真正需要区分的是：**请求有没有真正发送到服务器，以及 JavaScript 最终能不能读取 Response，是两个不同阶段。** 一个跨源 GET 可能已经到达后端，服务器也返回了 `200`，但如果 Response 没有通过 CORS 检查，浏览器仍然不会把响应内容暴露给 JavaScript，所以前端依然会看到 CORS Error。

跨源问题还要注意它的作用范围。同源策略和 CORS 主要由浏览器执行，所以 Browser 直接请求另一个 Origin 时需要接受这些安全检查；但 Node、Java、Nginx 等服务器之间的 HTTP 调用并不会因为 Host 或 Port 不同而出现浏览器意义上的 CORS Error。服务器之间仍然需要认证、授权、TLS、防火墙等安全控制，但那属于服务器安全，不属于浏览器 Same-Origin Policy。

因此工程上解决跨源问题主要有两条思路。

第一条是 **CORS**。如果浏览器确实要直接访问不同 Origin，例如前端在 `app.example.com`，后端 API 在 `api.example.com`，那么就保留这种 Cross-Origin 架构，由 API Server 通过 CORS 明确授权浏览器访问。

第二条是 **Proxy**。通过 Vite、Nginx、API Gateway 或 BFF，让 Browser 始终请求当前 Origin，再由服务器把请求转发到真正 Backend。它之所以能够解决浏览器跨源问题，根本原因就是 Browser → Proxy 是 Same-Origin，而 Proxy → Backend 属于 Server-to-Server，不受浏览器同源策略约束。

如果采用 CORS，基本授权过程是：浏览器在跨源请求中通过 `Origin` 表明请求来源，例如：

```http
Origin: https://app.example.com
```

服务器如果允许这个 Origin 访问，就返回：

```http
Access-Control-Allow-Origin: https://app.example.com
```

浏览器再根据服务器的 CORS Header 判断是否允许当前 JavaScript 获取 Response。所以 CORS 的基本关系可以理解为：**服务器声明授权，浏览器负责执行授权。**

CORS 请求又可以根据是否需要 Preflight 分成两类。一些满足 CORS safelist 条件的 GET、HEAD、POST 等请求可以直接发送，但 Response 返回以后仍然必须接受 CORS 检查；没有 Preflight 并不等于没有 CORS。

如果请求使用了 PUT、DELETE、Authorization Header 或其他超出 safelist 的能力，浏览器通常会先发送一个 OPTIONS Preflight。预检中通过 `Access-Control-Request-Method` 和 `Access-Control-Request-Headers` 告诉服务器真正请求准备使用什么 Method 和 Header；服务器再通过 `Access-Control-Allow-Methods`、`Access-Control-Allow-Headers` 和 `Access-Control-Allow-Origin` 表示是否允许。预检成功以后，浏览器才发送真正的业务请求。所以 OPTIONS 只负责跨源权限确认，真正的 POST、PUT、DELETE 仍然是后续另一条 HTTP Request。预检结果还可以通过 `Access-Control-Max-Age` 缓存，减少重复 OPTIONS。

如果这个跨源请求还需要用户登录身份，就会涉及 Credentials。Fetch 中的 Credentials 是服务器可以用来认证用户的身份凭证，例如 Cookie、HTTP Authentication 凭证和 TLS Client Certificate，其中前端登录体系最常见的是 Cookie。

Fetch 的 `credentials` 决定请求怎样处理 Credentials，主要有 `omit`、`same-origin` 和 `include`。默认是 `same-origin`，也就是同源请求正常处理凭证；如果跨源请求明确需要携带凭证，需要使用：

```javascript
fetch(url, {
  credentials: 'include'
})
```

`include` 表示即使请求 Cross-Origin，也允许包含相应 Credentials。

但客户端设置 `include` 还不够，服务器还需要返回：

```http
Access-Control-Allow-Credentials: true
```

同时 `Access-Control-Allow-Origin` 必须明确指定允许的 Origin，不能直接使用 `*`。这样客户端和服务器两边都明确允许带凭证的 CORS。

即使 CORS 和 Credentials 都配置正确，Cookie 也不一定真正发送，因为 Cookie 自己还必须满足 Domain、Path、Secure、SameSite、过期时间和浏览器 Cookie 策略。`credentials: "include"` 只允许跨源请求包含 Credentials，并不能绕过这些 Cookie 规则。

这里还要区分 Cross-Origin 和 Cross-Site。Origin 主要由 scheme、host、port 决定，而 Site 使用的是另一套站点概念。因此 `app.example.com` 和 `api.example.com` 可以是 Cross-Origin，但仍然可能属于 Same-Site。CORS 主要围绕 Origin 工作，而 Cookie 的 `SameSite` 主要控制 Cross-Site 场景下 Cookie 是否发送，两者不能混为同一种“跨域机制”。

Fetch 里还有一个 `mode` 配置，它描述 Request 采用的浏览器请求模式。`same-origin` 表示不允许访问其他 Origin；`cors` 表示 Cross-Origin 时使用 CORS 机制；`no-cors` 则是一种受限制的跨源请求模式。普通 `fetch()` 默认使用 `cors`。

`no-cors` 模式下，请求能够使用的 Method 和 Header 都受到限制，而且 Cross-Origin Response 通常会成为 opaque Response。对于 JavaScript 来说，它的真实 Status、Headers 和 Body 都不能正常读取。因此 `no-cors` 适合的是一些只需要完成受限加载或者发送、并不要求 JavaScript 获取完整响应内容的场景，而不是普通 JSON API。普通 API 如果需要执行 `response.json()`，仍然应该正确配置 CORS，或者使用 Proxy。

开发环境中的 Vite Proxy 就属于 Proxy 方案。比如浏览器运行在 `localhost:5173`，Backend 在 `localhost:8080`，前端不直接请求 8080，而是请求 `/api/user`，由 Vite Dev Server 把 `/api` 转发到 Backend。浏览器看到的始终是 `localhost:5173`，所以保持 Same-Origin。

生产环境中的 Nginx 也是同样的思路。浏览器统一访问 `https://example.com`，Nginx 可以让 `/` 返回前端静态文件，让 `/api` 转发到内部 Backend。Browser 始终只看到一个 Origin，真正的服务间通信发生在 Nginx 与 Backend 之间。因此 CORS 和 Proxy 的区别可以概括成：**CORS 是允许 Browser Cross-Origin，Proxy 是避免 Browser 直接 Cross-Origin。**

最后还需要区分 CORS、SameSite 和 CSRF。CORS 主要控制跨 Origin 的 JavaScript 能不能访问 Response；SameSite 主要控制 Cross-Site 场景下 Cookie 是否发送；CSRF 防御则解决攻击者能否利用用户已经存在的认证状态执行非预期操作。攻击者进行 CSRF 时甚至不一定需要读取 Response，只要请求产生转账、删除等副作用就可能已经成功，所以 CORS 不能替代 SameSite、CSRF Token、Origin/Referer 校验等 CSRF 防御。

整个体系可以最终收敛为：

```text
浏览器 Same-Origin Policy
        ↓
产生 Cross-Origin 访问限制
        ↓
工程上两种解决路线
        │
        ├── CORS
        │   ↓
        │   Server 授权 Browser
        │   ↓
        │   普通 CORS / Preflight
        │   ↓
        │   如果需要身份
        │   → Credentialed CORS
        │   → Cookie 自身规则
        │
        └── Proxy
            ↓
            Browser 保持 Same-Origin
            ↓
            Server-to-Server 转发

Fetch API 中：
mode
→ 控制请求模式

credentials
→ 控制凭证处理方式
```

这样整道题的核心逻辑就是：**先理解浏览器为什么建立同源安全边界，再判断跨源问题发生在哪里，然后选择“允许浏览器跨源”的 CORS，或者“避免浏览器跨源”的 Proxy；CORS 内部再根据请求能力决定是否需要 Preflight，如果请求还需要用户身份，再处理 Credentials 和 Cookie 规则。**

---

**Sources:**

- [Origin - MDN](https://developer.mozilla.org/en-US/docs/Glossary/Origin)
- [Same-origin policy - MDN](https://developer.mozilla.org/en-US/docs/Web/Security/Defenses/Same-origin_policy)
- [Cross-Origin Resource Sharing (CORS) - MDN](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CORS)
- [Using the Fetch API - MDN](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API/Using_Fetch)
- [Request.credentials - MDN](https://developer.mozilla.org/en-US/docs/Web/API/Request/credentials)
- [Request.mode - MDN](https://developer.mozilla.org/en-US/docs/Web/API/Request/mode)
- [Set-Cookie header - MDN](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Set-Cookie)
- [Vite Server Options - server.proxy](https://vite.dev/config/server-options.html)

## 第52题 WebSocket 的完整工作机制是什么？从通信选型到断线恢复应如何设计？

### 题目

WebSocket 是什么？它解决了什么问题？

请从实时通信方案选型出发，依次说明 WebSocket 如何建立连接、完成鉴权、传输消息、检测连接状态、处理异常、执行重连，并恢复断线前的业务状态。

---

### 问题

1. WebSocket 是什么？它适合解决哪些实时通信问题？
2. 短轮询、长轮询、SSE 和 WebSocket 分别怎样工作？应该如何选型？
3. WebSocket 如何通过 HTTP 握手建立连接？
4. 握手成功以后，消息如何传输？浏览器怎样管理连接状态？
5. 浏览器 WebSocket 可以在哪两个阶段完成鉴权？
6. 已经建立连接以后为什么还需要心跳？
7. 协议层 Ping/Pong 和业务层 Ping/Pong 分别解决什么问题？
8. 如何统一处理 `error`、`close` 和心跳超时？
9. WebSocket 断线后为什么使用指数退避重连？
10. 重连成功以后，如何恢复鉴权、订阅和断线消息？

---

### 回答要点

#### 1. 技术定位：WebSocket 解决高频双向实时通信问题

##### 核心结论

WebSocket 是一种应用层实时通信协议。它通过一条持久连接，让客户端和服务端都可以主动发送消息。

它主要解决的是：

> HTTP 请求—响应模型不适合高频、低延迟、双向通信的问题。
##### 三个核心特点

| 特点 | 含义 |
|---|---|
| 持久连接 | 建立连接后不会在每条消息结束时关闭 |
| 全双工 | 客户端和服务端可以同时、独立发送消息 |
| 低重复开销 | 握手后使用 WebSocket Frame，不再为每条消息重复携带完整 HTTP Header |
##### 适合的场景

WebSocket 适合同时满足以下条件的业务：

- 数据更新频率高；
- 对延迟比较敏感；
- 客户端和服务端都需要主动发送消息；
- 连接需要持续存在。

典型场景包括即时聊天、协同编辑、在线游戏、实时行情、实时告警、多人在线状态同步和客户端实时控制任务。

如果业务只是几分钟刷新一次状态，使用普通轮询更简单；如果只是服务端向客户端单向推送日志、通知或 AI 文本流，SSE 可能更合适。
#### 2. 方案选型：从短轮询、长轮询和 SSE 过渡到 WebSocket

##### 核心结论

短轮询、长轮询和 SSE 都可以实现一定程度的实时数据更新，但它们的通信方向、请求开销和适用场景不同。

| 方案 | 工作方式 | 通信方向 | 主要问题 | 适用场景 |
|---|---|---|---|---|
| 短轮询 | 客户端定时请求，服务端立即响应 | 客户端主动 | 无效请求多，实时性受轮询间隔影响 | 低频状态刷新 |
| 长轮询 | 服务端挂起请求，有数据或超时再响应 | 以服务端推送效果为主 | 每次响应后仍要重新请求 | 兼容性要求高的近实时场景 |
| SSE | 服务端通过持续 HTTP 响应发送事件 | 服务端到客户端 | 原生只支持单向推送 | 通知、日志流、AI 文本流 |
| WebSocket | 建立持久连接，双方随时发送消息 | 双向 | 连接管理复杂 | 高频双向实时通信 |
##### 短轮询

基本流程：

```text
客户端请求
→ 服务端立即响应
→ 等待固定时间
→ 再次请求
```

即使没有新数据，客户端也会继续请求，服务端也要返回一次结果，因此会产生较多无效请求。轮询间隔太长会提高延迟，间隔太短又会增加服务器压力。
##### 长轮询

基本流程：

```text
客户端请求
→ 服务端暂不返回
→ 有新数据或者等待超时
→ 服务端响应
→ 客户端立即发起下一次请求
```

长轮询可以实现接近实时的效果，也能减少短轮询中的无效响应，但一次响应结束后仍然需要重新发起下一次请求，还要处理超时、续接和大量挂起请求。

因此不能说长轮询“无法实时通信”。更准确的表述是：

> 长轮询可以实现近实时推送，但在高频双向通信中，连接和请求管理成本通常高于 WebSocket。
##### SSE

SSE 通过一个持续的 HTTP 响应，让服务端不断向客户端发送事件：

```text
客户端建立 HTTP 连接
→ 服务端保持响应
→ 服务端持续发送 Event
```

它适合服务端单向推送，并且浏览器原生支持自动重连。但客户端如果要向服务端发送数据，仍然需要使用 `fetch` 等普通 HTTP 请求。
##### WebSocket

WebSocket 建立连接后，客户端和服务端都能主动发送消息，更适合高频双向交互。

最终选型逻辑是：

```text
低频查询
→ 短轮询

需要近实时并兼容受限环境
→ 长轮询

只需要服务端单向推送
→ SSE

需要高频双向实时通信
→ WebSocket
```
#### 3. 连接建立：通过 HTTP 握手进入 WebSocket 通信

##### 核心结论

WebSocket 不是 HTTP 长连接，但经典 WebSocket 会先借助 HTTP 完成握手。握手成功以后，继续复用底层连接，并切换为 WebSocket Frame 通信。
##### 客户端申请升级

浏览器执行：

```javascript
const socket = new WebSocket(
  'wss://example.com/socket'
)
```

随后发送经典 HTTP/1.1 请求：

```http
GET /socket HTTP/1.1
Host: example.com
Upgrade: websocket
Connection: Upgrade
Sec-WebSocket-Key: xxxxxxxxx
Sec-WebSocket-Version: 13
Origin: https://app.example.com
```

| 字段 | 作用 |
|---|---|
| `Upgrade: websocket` | 希望将当前连接升级为 WebSocket |
| `Connection: Upgrade` | 当前连接需要执行协议升级 |
| `Sec-WebSocket-Key` | 浏览器生成的随机值 |
| `Sec-WebSocket-Version` | 声明支持的 WebSocket 版本 |
| `Origin` | 告诉服务端连接由哪个页面来源发起 |
##### 服务端接受升级

服务端校验请求后返回：

```http
HTTP/1.1 101 Switching Protocols
Upgrade: websocket
Connection: Upgrade
Sec-WebSocket-Accept: xxxxxxxxx
```

`101 Switching Protocols` 表示服务端同意协议升级。

`Sec-WebSocket-Accept` 的计算过程是：

```text
Sec-WebSocket-Key
+
固定 GUID
↓
SHA-1
↓
Base64
```

它用于确认服务端真正理解并处理了 WebSocket 握手。它不是用户鉴权，也不负责加密。
##### 浏览器确认连接建立

浏览器校验 `Sec-WebSocket-Accept` 后：

```text
握手成功
→ 触发 open
→ 进入 WebSocket 消息通信
```

底层连接继续复用，但后续不再使用 HTTP 请求—响应报文，而是使用 WebSocket Frame。经典流程由 [RFC 6455](https://www.rfc-editor.org/rfc/rfc6455) 定义。

`ws://` 直接运行在 TCP 上，不提供 TLS 保护；`wss://` 在 WebSocket 和 TCP 之间增加 TLS，生产环境通常应该使用 `wss://`。

经典面试回答说明 HTTP/1.1 Upgrade 和 `101` 即可。更严格地说，HTTP/2 和 HTTP/3 可以通过 Extended CONNECT 建立 WebSocket，所以不能绝对地说所有 WebSocket 都一定返回 `101`。
#### 4. 消息通信：通过 Frame 完成全双工传输

##### 核心结论

握手成功以后，WebSocket 连接进入 `OPEN` 状态。双方通过 WebSocket Frame 传输消息，不再遵循 HTTP 请求—响应顺序。
##### Message 与 Frame

应用层处理的是 Message，网络上传输的是 Frame：

```text
一条 Message
↓
一个或多个 Frame
↓
通过底层连接发送
↓
接收方重新组装为完整 Message
```

所以一条 Message 不一定只对应一个 Frame。较大的消息可以被拆成多个 Frame，但接收方最终会得到完整消息。

| 帧类型 | 作用 |
|---|---|
| Text Frame | 传输 UTF-8 文本 |
| Binary Frame | 传输二进制数据 |
| Ping Frame | 协议层连接探测 |
| Pong Frame | 响应 Ping |
| Close Frame | 发起关闭握手 |

TCP 是连续字节流，本身没有消息边界。WebSocket 在 TCP 之上增加 Frame 和 Message，因此接收方能够区分不同消息。

浏览器客户端发送的 Frame 必须 Mask，服务端发送的 Frame 通常不 Mask。Mask 不是加密，消息保密仍然依靠 `wss://` 和 TLS。
##### 浏览器连接状态

| `readyState` | 常量 | 含义 |
|---:|---|---|
| `0` | `CONNECTING` | 正在建立连接 |
| `1` | `OPEN` | 已经建立，可以通信 |
| `2` | `CLOSING` | 正在关闭 |
| `3` | `CLOSED` | 已经关闭 |

| 事件 | 触发时机 |
|---|---|
| `open` | 握手完成，连接建立 |
| `message` | 收到一条完整消息 |
| `error` | 建连或传输过程中发生错误 |
| `close` | 连接结束 |

调用 `socket.send(data)` 只表示把数据交给浏览器的发送流程，不代表服务端已经处理完成。

`bufferedAmount` 表示已经排队但尚未通过网络发送的字节数。如果它持续增长，说明数据产生速度超过网络发送速度。经典 WebSocket API 没有完整的背压机制，因此高频发送时需要限制频率、合并更新、丢弃过时状态或者设置发送队列上限。
#### 5. 连接准入：鉴权只分为握手阶段和握手后阶段

##### 核心结论

浏览器 WebSocket 鉴权按照发生时间只分为两种：

```text
握手阶段鉴权 或 握手成功后的首次消息鉴权
```

Cookie、URL Ticket、Access Token 是凭证的传递方式，不是与这两个鉴权阶段平行的分类。
##### 握手阶段鉴权

目标是：

> 在建立 WebSocket 连接之前识别用户，鉴权失败就拒绝升级。

| 传递方式 | 说明 |
|---|---|
| Cookie | 浏览器自动携带符合条件的 Cookie |
| URL Ticket | URL 中携带短期、一次性连接票据 |
| Authorization Header | 非浏览器客户端可以使用，浏览器原生 API 不能自行设置 |

浏览器原生构造函数只有：

```javascript
new WebSocket(url, protocols)
```

不能像 `fetch` 一样传入自定义 `Authorization` 请求头。

如果 Session ID 或 Access Token 存在 Cookie 中，并且满足 `Domain`、`Path`、`Secure`、`SameSite` 和浏览器策略，浏览器可以在握手时自动携带 Cookie。服务端读取 Cookie，验证通过则接受升级，不通过则拒绝连接。

URL 中携带 Ticket 仍然属于握手阶段：

```javascript
new WebSocket(
  'wss://example.com/socket?ticket=' + ticket
)
```

这里更适合使用短生命周期、一次性、最小权限并且仅用于建连的 Ticket。不建议直接放长期 Access Token，因为 URL 可能被服务器、代理、监控和错误日志记录。

使用 Cookie 鉴权时，服务端必须校验 `Origin`。否则恶意网站可能建立指向目标服务的 WebSocket，并利用浏览器自动携带的 Cookie 形成跨站 WebSocket 劫持。
##### 握手后的首次消息鉴权

第二种方式是先建立传输连接，再规定第一条消息必须完成业务鉴权：

```json
{
  "type": "auth",
  "token": "xxx"
}
```

此时需要区分：

```text
CONNECTED_UNAUTHENTICATED
→ 已连接但未鉴权

AUTHENTICATED
→ 已连接且鉴权成功
```

在鉴权成功前，服务端不能处理普通业务消息、允许订阅频道或访问用户数据，并且需要设置鉴权超时。鉴权失败或超时后应关闭连接。

Access Token 描述凭证用途，JWT 描述凭证格式。Access Token 可以采用 JWT，也可以是不透明随机字符串。这属于鉴权凭证的概念边界，不是第三种鉴权方式。
#### 6. 连接维护：心跳用于发现“连接看似正常，实际已失效”

##### 核心结论

心跳不是因为 WebSocket 没有建立连接，而是因为：

> 长连接建立以后，连接可能已经失效，但客户端和服务端无法立即收到明确通知。

常见原因包括：

- Wi-Fi 和移动网络切换；
- 设备休眠；
- NAT 映射过期；
- 代理服务器清理空闲连接；
- 服务器异常退出；
- 网络只在一个方向上失效；
- TCP 没有立即感知物理链路变化。

因此：

```javascript
socket.readyState === WebSocket.OPEN
```

只表示浏览器目前没有确认连接已经关闭，不能证明消息一定能够到达服务端、服务端一定能够处理，或者客户端一定能够收到返回数据。

心跳主要解决三个问题：

1. 检测连接是否真实可用；
2. 及时清理无效连接；
3. 发现失效后触发关闭和重连。

对于存在空闲超时的代理，周期性心跳还可以减少正常连接因长期无数据而被中间设备清理的情况。
#### 7. 连接探测：协议层和业务层 Ping/Pong 分工不同

##### 核心结论

| 心跳方式 | 所在层次 | 主要验证内容 | 浏览器 JS 能否主动控制 |
|---|---|---|---|
| 协议层 Ping/Pong | WebSocket 协议层 | 连接和对端协议栈是否存活 | 不能 |
| 业务层 Ping/Pong | 应用消息层 | 消息是否经过业务处理链路 | 可以 |
##### 协议层 Ping/Pong

基本流程：

```text
一端发送 Ping Frame
→ 对端协议栈收到
→ 返回 Pong Frame
→ 发送端确认连接可达
```

它主要验证底层连接能否传输数据以及对端 WebSocket 协议栈能否响应。

服务端和 Node WebSocket 库通常能够发送协议层 Ping。浏览器会在内部处理协议层 Ping/Pong，但原生 JavaScript API 没有暴露 `socket.ping()` 或 `socket.onpong`。
##### 业务层 Ping/Pong

浏览器前端通常会定义普通 WebSocket 消息：

```json
{
  "type": "ping",
  "timestamp": 123456
}
```

服务端业务层收到后返回：

```json
{
  "type": "pong",
  "timestamp": 123456
}
```

完整逻辑是：

```text
连接进入 OPEN
→ 启动心跳定时器
→ 定时发送业务 ping
→ 服务端业务层处理
→ 返回业务 pong
→ 客户端更新 lastPongTime
```

如果超过阈值没有收到 Pong：

```text
判定心跳超时
→ 停止心跳
→ 关闭旧连接
→ 进入统一重连流程
```

协议层 Pong 主要说明 WebSocket 协议栈能够响应，不一定说明业务线程、消息路由和用户会话都正常。业务层 Pong 经过应用自己的消息处理逻辑，因此能够更接近验证“业务链路是否正常”。

两种心跳不是规范要求必须同时使用。浏览器项目经常增加业务层心跳，主要是因为 JavaScript 无法直接控制协议层 Ping/Pong，同时业务层也需要获得可观察的连接健康状态。
#### 8. 异常收敛：先判断连接为什么失效，再决定是否重连

##### 核心结论

异常处理应该按照下面的顺序收敛：

```text
发现异常
→ 停止心跳
→ 关闭旧连接
→ 进入 close 处理
→ 判断关闭原因
→ 决定是否重连
```

不能让 `error`、`close` 和心跳超时分别独立创建新连接。

| 信号 | 表示什么 | 主要用途 |
|---|---|---|
| `error` | 建连或传输发生错误 | 记录错误，不单独判断具体原因 |
| `close` | 连接已经结束 | 统一决定是否重连 |
| 心跳超时 | 主动探测失败 | 主动关闭旧连接 |

`error` 事件通常只是普通 `Event`，不会稳定提供底层错误类型。更稳的处理方式是：

```text
onerror
→ 记录错误
→ 等待或主动进入关闭流程

onclose
→ 读取关闭信息
→ 统一判断是否重连
```
##### 常见关闭码

| 关闭码 | 含义 | 处理方向 |
|---:|---|---|
| `1000` | 正常关闭 | 通常不重连 |
| `1001` | 对端离开 | 根据场景判断 |
| `1006` | 异常关闭，没有正常 Close Frame | 通常可以重连 |
| `1008` | 违反策略 | 先检查鉴权和权限 |
| `1009` | 消息过大 | 调整消息或限制 |
| `1011` | 服务端内部异常 | 退避后重连 |

`1006` 表示没有收到正常 Close Frame 的异常关闭，只能作为本地观察结果，不能真正发送给对端。

协议关闭码和业务错误码不是一回事：

```text
关闭码
→ 解释为什么结束连接

业务码
→ 解释为什么业务操作失败
```

例如 Token 过期可以通过应用消息返回业务码。客户端先刷新 Token 或要求重新登录，再决定是否重连。
#### 9. 连接恢复：可恢复异常使用指数退避重连

##### 核心结论

WebSocket 协议本身不提供自动重连。工程中最常见的策略是：

> 指数退避，并设置最大等待间隔。

指数退避过程可以表示为：

```text
第1次失败：等待1秒、第2次失败：等待2秒、第3次失败：等待4秒、第4次失败：等待8秒、第5次失败：等待16秒
```

计算思路：

```javascript
delay = Math.min(
  maxDelay,
  baseDelay * 2 ** retryCount
)
```

最大间隔可以根据业务设置为 30 秒或 60 秒，避免等待时间无限增长。工程中通常还会增加少量随机抖动，避免服务器恢复时所有客户端同时重连。随机抖动是指数退避的辅助参数，不需要单独理解成另一套主要重连算法。
##### 可以自动重连

- 临时网络中断；
- 心跳超时；
- `1006` 异常关闭；
- 服务端临时故障；
- 服务重启；
- 代理连接被意外清理。
##### 不能直接重连

- 用户主动退出；
- 页面主动销毁连接；
- Token 无法刷新；
- 账号被封禁；
- 权限不足；
- 协议格式错误；
- 客户端版本不兼容。

这些问题不解决，重连只会重复失败。

前端连接管理器至少需要维护：

| 状态 | 作用 |
|---|---|
| `manualClose` | 区分主动关闭与异常断线 |
| `reconnecting` | 防止并行重连 |
| `reconnectTimer` | 保证只有一个等待任务 |
| `retryCount` | 计算下一次退避时间 |

最大重连次数没有统一标准。普通后台系统可以限制次数，失败后提示用户；即时通信系统可以持续低频重连；鉴权失败和账号封禁不应持续重连。
#### 10. 业务恢复：重连成功后重新建立会话状态

##### 核心结论

重连成功只表示新 WebSocket 连接已经建立，不表示旧连接上的业务状态已经自动恢复。

完整恢复顺序是：

```text
重新连接
→ 重新鉴权
→ 重新订阅
→ 获取当前快照
→ 补拉断线增量
→ 恢复消息发送
```

重连得到的是一条新连接，服务端不能默认它继承旧连接的身份状态。因此必须重新进行握手阶段鉴权或首条消息鉴权。

聊天室、实时大屏和协同系统通常会在旧连接上维护房间、频道、用户订阅和推送范围。这些连接级状态可能随旧连接关闭而被清理，因此新连接需要重新订阅。

WebSocket 在一条健康连接中依靠 TCP 提供可靠、有序传输，但不会自动保存和补发断线期间的消息。

| 机制 | 解决的问题 |
|---|---|
| `messageId` | 唯一标识消息 |
| `sequence` | 判断顺序和消息缺口 |
| ACK | 确认消息是否已经处理 |
| 去重 | 防止重复消费 |
| 幂等 | 防止重复执行产生副作用 |
| Cursor | 从上次位置补拉增量 |
| Snapshot | 缺口过大时恢复完整状态 |

必须明确：

```text
send() 没有抛错
≠
服务端已经收到

服务端已经收到
≠
业务已经处理完成
```

如果业务要求确认处理结果，需要应用层 ACK。

---

### 标准回答

WebSocket 是一种用于实时双向通信的应用层协议。它建立连接以后，客户端和服务端可以在同一条持久连接上独立发送消息，因此核心特点是持久连接、全双工和低重复报文开销。它适合聊天、协同编辑、实时游戏、行情推送和多人状态同步等高频双向通信场景。

理解为什么需要 WebSocket，可以先看 HTTP 中的几种实时通信方案。

短轮询是客户端按照固定间隔不断请求服务端，服务端每次立即响应。即使没有新数据，也会产生完整请求和响应，所以无效请求较多，实时性和服务器压力还会受到轮询间隔影响。

长轮询是客户端发起请求后，服务端在没有数据时先挂起，等有数据或者超时以后再返回；客户端收到响应后立即发起下一次请求。它能够实现接近实时的效果，也能减少无效响应，但每次响应结束后仍然要重新发起请求，需要处理超时、请求续接和连接管理。

SSE 则通过一个持续的 HTTP 响应，让服务端不断向客户端发送事件，适合通知、日志流和 AI 文本流等单向推送场景。如果业务需要客户端和服务端高频双向发送数据，WebSocket 更合适。

确定使用 WebSocket 后，首先需要建立连接。经典 WebSocket 通常运行在 TCP 之上，`wss://` 则在 TCP 之上增加 TLS。

WebSocket 不是 HTTP 长连接，但会先借助 HTTP 完成初始握手。客户端发送带有 `Upgrade: websocket`、`Connection: Upgrade`、`Sec-WebSocket-Key`、`Sec-WebSocket-Version` 和 `Origin` 等字段的请求。服务端同意升级后返回 `101 Switching Protocols`，并返回根据客户端 Key 计算出的 `Sec-WebSocket-Accept`。

浏览器校验通过后触发 `open`。双方继续复用底层连接，但是 HTTP 握手已经结束，后续改用 WebSocket Frame 进行通信。

WebSocket 在应用层处理的是 Message，在网络上传输的是 Frame。一条 Message 可以由一个或多个 Frame 组成，支持文本、二进制以及 Ping、Pong、Close 等控制帧。客户端发送的帧必须 Mask，但 Mask 不是加密，生产环境仍然需要使用 `wss://` 保护传输安全。

连接建立后，需要完成业务鉴权。浏览器 WebSocket 鉴权按照发生时间分为两种。

第一种是握手阶段鉴权。浏览器原生 WebSocket 不能像 `fetch` 一样自定义 `Authorization` 请求头，因此可以自动携带符合条件的 Cookie，或者在 URL 中携带短期、一次性 Ticket。URL Ticket 只是握手阶段传递凭证的一种方式，不是独立的第三个鉴权阶段。使用 Cookie 鉴权时，服务端还必须校验 `Origin`，防止跨站 WebSocket 劫持。

第二种是握手后的首次消息鉴权。连接成功后，客户端把第一条消息定义为认证消息。认证通过以前，服务端不处理普通业务消息，也不允许订阅频道，并且需要设置认证超时。这里必须区分“连接成功”和“鉴权成功”。

完成鉴权以后，双方进入正常消息通信。但 WebSocket 是长连接，网络切换、设备休眠、代理空闲超时和服务器异常都可能形成假活连接。此时 `readyState` 可能仍然是 `OPEN`，但消息已经无法正常到达，因此需要心跳机制。

心跳分为协议层 Ping/Pong 和业务层 Ping/Pong。

协议层 Ping/Pong 使用 WebSocket 控制帧，主要验证连接和对端 WebSocket 协议栈是否存活。服务端和 Node WebSocket 库通常可以发送协议层 Ping，但浏览器 JavaScript 无法直接发送 Ping Frame，也无法监听协议层 Pong。

因此浏览器前端通常还会设计业务层心跳。客户端定时发送普通 `ping` 消息，服务端业务层处理后返回 `pong`。客户端记录最后一次收到 Pong 的时间，如果超过阈值没有响应，就认为连接已经失效。

协议层心跳主要验证传输通道，业务层心跳则进一步验证消息是否能够经过业务处理链路。两种心跳不是规范要求必须同时存在，但浏览器项目通常需要业务层心跳，因为前端无法直接控制协议层 Ping/Pong。

心跳超时后，客户端应该停止心跳并关闭旧连接，让异常统一进入关闭处理。`onerror` 通常只提供普通 Event，不能稳定给出底层错误原因，所以主要用于记录错误；真正是否重连，应在统一的 `onclose` 或连接管理器中根据关闭原因判断。

对于临时断网、心跳超时、`1006` 异常关闭和服务端暂时不可用等可恢复错误，通常采用指数退避重连。等待时间可以按照 1、2、4、8、16 秒逐渐增加，并设置最大间隔。工程中还会加入少量随机抖动，避免大量客户端同时重连。

用户主动退出、Token 无法刷新、账号被封禁、权限不足和协议错误等情况不应该直接重连，因为不解决根因，重连只会重复失败。

最后，重连成功只表示建立了一条新连接，不代表业务已经恢复。客户端还要重新鉴权、重新加入房间或订阅频道，并根据最后收到的消息序列号补拉断线期间的数据。

如果业务要求消息不能丢失，还需要在应用层设计消息 ID、序列号、ACK、去重、幂等、Cursor 和 Snapshot。WebSocket 只负责建立实时双向通信通道，不会自动完成业务状态恢复。

因此，WebSocket 的完整工作机制可以按照一条主线理解：

> 先根据通信方向和实时性选择 WebSocket；再通过握手建立连接并完成鉴权；连接运行期间通过消息帧通信，并使用协议层或业务层心跳检测连接；发现异常后统一关闭，使用指数退避重连；重连成功后重新鉴权、恢复订阅并补偿断线消息。

---

**Sources:**

- [RFC 6455: The WebSocket Protocol](https://www.rfc-editor.org/rfc/rfc6455)
- [WHATWG WebSockets Standard](https://websockets.spec.whatwg.org/)
- [MDN WebSocket API](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket)
- [RFC 8441: Bootstrapping WebSockets with HTTP/2](https://www.rfc-editor.org/rfc/rfc8441)
- [RFC 9220: Bootstrapping WebSockets with HTTP/3](https://www.rfc-editor.org/rfc/rfc9220)
- [OWASP WebSocket Security Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/WebSocket_Security_Cheat_Sheet.html)

## 第53题 MQTT 是如何实现消息发布与转发的？它与 WebSocket 是什么关系？

### 题目

MQTT 是什么？它如何通过 Broker 和 Topic 实现消息的发布、订阅与转发？

请说明 MQTT 底层如何建立网络连接，为什么浏览器中的 MQTT 通常运行在 WebSocket 之上，以及 WebSocket 与 MQTT 分别负责什么。

---

### 问题

1. WebSocket 和 MQTT 分别解决什么问题？为什么不能将二者理解成完全对等的协议？
2. TCP 连接究竟由谁建立？HTTP、WebSocket 和 MQTT 是否会自己建立 TCP 连接？
3. 为什么浏览器 JavaScript 可以使用 HTTP 和 WebSocket，却不能直接通过普通 MQTT TCP 端口连接 Broker？
4. 普通程序中的 MQTT 与浏览器中的 MQTT，底层连接方式有什么区别？
5. MQTT 中的 Client、Broker、Publisher、Subscriber 和 Topic 分别是什么？
6. Broker 转发的是“客户端与服务端之间的消息”，还是“多个 MQTT Client 之间的消息”？
7. Broker 如何根据 Topic 将消息转发给不同订阅者？
8. MQTT 的 QoS 0、QoS 1 和 QoS 2 分别解决什么问题？
9. 实际项目中应该使用 WebSocket、MQTT，还是 MQTT over WebSocket？

---

### 回答要点

#### 1. 协议职责：WebSocket 提供通信通道，MQTT 规定消息如何流转

##### 核心结论

从网络分层看，WebSocket 和 MQTT 都属于应用层协议；但从功能职责看，二者处于不同的抽象层次，不能简单理解成两种完全对等、相互替代的实时通信方案。

WebSocket 主要解决：

> 客户端和服务端如何在一条持久连接上进行低开销的全双工通信。

它规定了连接握手、消息帧、Ping/Pong 和连接关闭等机制，但不规定业务消息应该发送给谁，也不直接提供 Broker、Topic、发布订阅和多级 QoS。

MQTT 主要解决：

> 消息如何发布、订阅、路由和按照不同可靠性等级进行交付。

它规定了 `CONNECT`、`PUBLISH`、`SUBSCRIBE` 等 MQTT Control Packet，以及 Broker、Topic、QoS、会话、保留消息和遗嘱消息等消息能力。

二者的职责可以概括为：

```text
WebSocket
→ 强调通信通道怎样建立、双方怎样实时传输数据

MQTT
→ 强调消息怎样发布、订阅、路由和可靠交付
```

#### 2. 底层连接：TCP 由操作系统网络栈建立

HTTP、WebSocket 和 MQTT 都不会脱离操作系统直接创建 TCP 连接。实际过程是：

```text
应用或客户端库发起连接
→ 调用浏览器或操作系统提供的网络能力
→ 操作系统网络栈建立 TCP 连接
→ 在连接上传输应用层协议报文
```

因此，不能简单说“WebSocket 能建立 TCP，而 MQTT 不能建立 TCP”。更准确的表述是：

> WebSocket 和 MQTT 都依赖底层网络连接；具体连接由浏览器网络栈或客户端实现通过操作系统 Socket 建立。

##### 浏览器中的 HTTP

JavaScript 调用 `fetch()` 或 `XMLHttpRequest` 后，JavaScript 并不会获得 TCP Socket。浏览器内部负责 DNS 解析、建立 TCP/QUIC、完成 TLS 握手并发送 HTTP 请求。

##### 浏览器中的 WebSocket

JavaScript 调用：

```javascript
const socket = new WebSocket(
  'wss://example.com/socket'
)
```

浏览器内部负责建立 TCP/TLS 连接，并完成 WebSocket 握手。经典 WebSocket 通过 HTTP Upgrade 握手后，在同一条底层连接上使用 WebSocket Frame 进行全双工通信。

##### 普通程序中的 MQTT

Java、Go、C++、Python、Node.js 或物联网设备中的 MQTT Client，可以通过操作系统 Socket 建立到 Broker 的 TCP/TLS 连接，然后发送 MQTT `CONNECT` 报文：

```text
MQTT Client
→ 建立到 Broker 的 TCP/TLS 连接
→ 发送 MQTT CONNECT
→ Broker 返回 CONNACK
→ 开始发布和订阅消息
```

这里要区分两层连接：

```text
底层网络连接
→ TCP/TLS 连接已经建立

MQTT 协议连接
→ Client 发送 CONNECT，Broker 返回 CONNACK
```

#### 3. 浏览器限制：普通网页 JavaScript 不能操作原始 TCP Socket

普通网页中的 JavaScript 没有通用的原始 TCP Socket API，不能任意连接某个 IP 地址和端口。浏览器主要提供受安全模型约束的网络接口，例如：

- `fetch`；
- `XMLHttpRequest`；
- `WebSocket`；
- `EventSource`。

HTTP 和 WebSocket 能在网页中直接使用，不是因为 JavaScript 可以操作 TCP，而是因为浏览器原生实现并开放了对应的 Web API。

浏览器没有原生 MQTT API，因此普通网页不能直接连接：

```text
mqtt://broker.example.com:1883
```

浏览器接入 MQTT 系统时，通常使用 MQTT over WebSocket：

```text
MQTT Control Packet
↓
WebSocket Binary Frame
↓
TCP / TLS
```

此时浏览器使用 WebSocket API 建立通道，MQTT 客户端库负责生成、封装和解析 MQTT 报文，Broker 则需要提供 MQTT over WebSocket 接入地址。

#### 4. MQTT 角色：连接到 Broker 的端都属于 MQTT Client

MQTT 使用 Client—Broker 架构。所有连接到 Broker 的程序或设备都属于 MQTT Client，可以是：

- 物联网设备；
- 手机应用；
- 浏览器前端；
- Java、Go 或 Node.js 后端服务；
- 数据处理和存储服务；
- 实时监控大屏。

MQTT 中各角色的职责是：

| 概念 | 作用 |
|---|---|
| Client | 连接到 Broker 的程序或设备，可以发布和订阅消息 |
| Broker | 接收客户端连接、维护订阅关系并转发消息 |
| Publisher | 向某个 Topic 发布消息的 Client |
| Subscriber | 订阅某个 Topic Filter 的 Client |
| Topic | 消息分类和路由所使用的名称 |

Publisher 和 Subscriber 不是固定的程序类型，而是客户端在某条消息链路中的角色。同一个 MQTT Client 可以同时发布和订阅不同的 Topic。

因此，Broker 转发的不是狭义的“客户端与服务端之间的消息”，而是：

> 多个 MQTT Client 之间通过 Broker 间接交换的消息。

后端服务虽然在业务架构中属于服务端，但只要它连接到 MQTT Broker，在 MQTT 协议关系中同样是 MQTT Client。

#### 5. 消息路由：Broker 只向匹配 Topic 的订阅者转发

MQTT 使用 Topic 对消息进行分类。例如车辆 001 发布位置：

```text
vehicle/001/location
```

不同客户端可以订阅：

```text
vehicle/001/location
vehicle/+/location
vehicle/#
```

完整路由过程是：

```text
Subscriber 向 Broker 订阅 Topic Filter
→ Broker 保存订阅关系
→ Publisher 向某个 Topic 发布消息
→ Broker 匹配 Topic 和 Topic Filter
→ 只转发给匹配的 Subscriber
```

因此，Broker 不会默认把每一条消息广播给所有客户端。设备只会收到自己订阅并且与 Topic Filter 匹配的消息，从而减少无关数据传输，并解除消息生产者与消费者之间的直接依赖。

#### 6. 消息流程：先连接和订阅，再发布和转发

一个典型 MQTT 消息流程是：

```text
1. Client 建立底层 TCP/TLS 或 WebSocket 连接
2. Client 发送 CONNECT
3. Broker 返回 CONNACK
4. Subscriber 发送 SUBSCRIBE
5. Broker 返回 SUBACK，并保存订阅关系
6. Publisher 发送 PUBLISH
7. Broker 根据 Topic 匹配订阅者
8. Broker 向匹配的 Subscriber 转发 PUBLISH
```

例如：

```text
GPS 设备
→ 发布 vehicle/001/location

Java 后端服务
→ 订阅 vehicle/+/location
→ 处理并存储数据
→ 发布 vehicle/001/alarm

浏览器地图大屏
→ 订阅 vehicle/+/location
→ 订阅 vehicle/+/alarm
```

GPS 设备、Java 后端和浏览器大屏在 MQTT 协议中都属于 Client，只是在不同消息流中承担 Publisher 或 Subscriber 角色。

#### 7. 可靠性：MQTT 通过 QoS 定义消息交付等级

MQTT 提供三个 QoS 等级：

| QoS | 含义 | 可能结果 |
|---:|---|---|
| 0 | At most once，至多一次 | 消息可能丢失，不进行协议重试 |
| 1 | At least once，至少一次 | 保证协议层交付，但可能重复 |
| 2 | Exactly once，恰好一次 | 在 MQTT 协议交付过程中避免丢失和重复，开销最高 |

在 Broker 架构中，下面两段属于独立的交付过程：

```text
Publisher → Broker
Broker → Subscriber
```

它们实际使用的 QoS 可能不同。

MQTT QoS 保证的是协议发送端与接收端之间的消息交付语义，不等于整个业务系统天然实现“恰好处理一次”。如果消息到达后还要写数据库、扣减库存或调用下游服务，仍然需要幂等、事务和去重机制。

#### 8. 组合关系：MQTT 可以直接基于 TCP，也可以基于 WebSocket

普通程序和物联网设备中的常见协议关系是：

```text
MQTT
↓
TCP / TLS
↓
IP
```

浏览器中的常见协议关系是：

```text
MQTT
↓
WebSocket
↓
TCP / TLS
↓
IP
```

在 MQTT over WebSocket 中：

- WebSocket 负责提供浏览器能够使用的全双工通信通道；
- MQTT 负责 `CONNECT`、`PUBLISH`、`SUBSCRIBE`、Topic、QoS 和会话等消息规则；
- MQTT Control Packet 通过 WebSocket Binary Frame 传输；
- WebSocket 子协议使用 `mqtt`；
- 生产环境通常使用 `wss://`。

因此，MQTT 和 WebSocket 不一定是二选一关系。浏览器场景下，WebSocket 可以作为承载 MQTT 报文的底层通信通道。

#### 9. 最终选型：判断业务需要通信通道还是完整消息体系

如果业务只是需要浏览器与业务服务之间进行实时双向通信，例如聊天、协同编辑、实时进度、在线游戏和实时看板，可以直接使用 WebSocket，再根据业务需要自行设计消息格式、房间、ACK 和状态恢复。

如果业务需要大量设备接入、Broker 统一管理、Topic 路由、发布订阅、一对多分发、QoS、会话和设备上下线管理，更适合使用 MQTT。

如果浏览器需要加入已经存在的 MQTT 消息体系，则使用 MQTT over WebSocket。

```text
只需要浏览器实时双向通信通道
→ WebSocket

需要 Broker、Topic 和发布订阅消息体系
→ MQTT

浏览器需要加入 MQTT 消息体系
→ MQTT over WebSocket
```

---

### 标准回答

WebSocket 和 MQTT 都属于应用层协议，但它们解决的问题不在同一个功能抽象层次，因此不能简单理解成两种相互替代的实时通信协议。

WebSocket 的核心作用是提供一条持久、全双工的双向通信通道。经典 WebSocket 由浏览器内部先建立 TCP/TLS 连接，再通过 HTTP Upgrade 完成握手；握手成功后，双方在同一条底层连接上使用 WebSocket Frame 传输消息。JavaScript 本身没有直接操作 TCP Socket，而是通过浏览器提供的 WebSocket API 使用这种通信能力。

MQTT 的核心作用则是规定消息如何发布、订阅、路由和交付。它依赖一个已经可用的有序、无损、双向网络连接。普通 Java、Go、C++、Node.js 或物联网设备中的 MQTT Client，可以通过操作系统 Socket 建立到 Broker 的 TCP/TLS 连接，然后发送 MQTT `CONNECT`、`PUBLISH` 和 `SUBSCRIBE` 等报文。

这里需要区分底层网络连接和 MQTT 协议连接。TCP/TLS 连接建立以后，MQTT Client 还要发送 `CONNECT`，Broker 返回 `CONNACK`，此后才表示 MQTT 协议层连接已经建立。因此不能简单说“WebSocket 能建立 TCP，而 MQTT 不能建立 TCP”；二者都依赖底层网络连接，连接由浏览器网络栈或客户端实现调用操作系统网络能力建立。

普通网页中的 JavaScript 没有通用的原始 TCP Socket API，而且浏览器没有原生 MQTT API，因此不能直接连接 Broker 的普通 MQTT TCP 端口。浏览器接入 MQTT 系统时，通常使用 MQTT over WebSocket：浏览器先使用 WebSocket API 建立通道，MQTT 客户端库再把 MQTT Control Packet 封装到 WebSocket Binary Frame 中传输。此时 WebSocket 负责提供全双工通信通道，MQTT 负责发布订阅、Topic 路由、QoS 和会话等消息规则。

MQTT 使用 Client—Broker 架构。所有连接到 Broker 的端都属于 MQTT Client，可以是物联网设备、浏览器、手机应用，也可以是 Java 后端服务。Publisher 和 Subscriber 只是客户端在某条消息链路中的角色，同一个 Client 可以同时发布和订阅不同的 Topic。

Publisher 向某个 Topic 发布消息，Broker 根据已经保存的订阅关系匹配 Topic Filter，只把消息转发给匹配的 Subscriber，而不是发送给所有客户端。因此 Broker 实现的是多个 MQTT Client 之间基于 Topic 的间接通信和消息解耦。

MQTT 还通过 QoS 0、QoS 1 和 QoS 2 定义不同的协议交付等级。QoS 0 表示至多一次，消息可能丢失；QoS 1 表示至少一次，能够保证协议层交付，但可能重复；QoS 2 表示在 MQTT 协议交付过程中恰好一次，可靠性最高但开销也最大。QoS 保证的是 MQTT 协议端点之间的交付语义，数据库写入等业务操作仍然需要幂等、事务和去重机制。

所以，WebSocket 强调的是如何建立和维护实时全双工通信通道；MQTT 强调的是消息如何发布、订阅、路由和可靠交付。普通浏览器实时业务可以直接使用 WebSocket；大量设备接入和发布订阅场景更适合 MQTT；浏览器如果需要加入已有的 MQTT 消息体系，则使用 MQTT over WebSocket。

---

**Sources:**

- [RFC 6455: The WebSocket Protocol](https://www.rfc-editor.org/rfc/rfc6455)
- [MQTT Version 5.0: OASIS Standard](https://docs.oasis-open.org/mqtt/mqtt/v5.0/mqtt-v5.0.html)
- [MDN WebSocket API](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket)

## 第54题 V8 如何执行 JavaScript？它的垃圾回收机制是怎样的？

### 题目

V8 是什么？JavaScript 代码从源码到执行需要经过哪些阶段？

请说明 V8 的解析、字节码执行、JIT 优化和反优化过程，并进一步说明 V8 如何管理内存、判断垃圾对象、进行分代回收，以及如何预防和排查内存泄漏。

---

### 问题

1. V8 是什么？JavaScript 为什么需要 JavaScript 引擎才能运行？
2. JavaScript 源码如何经过解析、编译和执行？
3. Ignition、Sparkplug、Maglev 和 TurboFan 分别负责什么？
4. 什么是运行反馈、热点代码、推测优化和反优化？
5. JavaScript 的调用栈和堆分别保存什么？
6. 垃圾回收解决什么问题？内存泄漏又是什么？
7. V8 如何通过可达性分析判断对象能否回收？
8. GC Root 包括哪些对象？
9. V8 为什么采用分代回收？
10. 新生代 Minor GC 如何工作？
11. 新生代对象什么时候晋升到老生代？
12. 老生代 Major GC 如何工作？
13. Mark-Sweep 和 Mark-Compact 有什么区别？是否一定前后执行？
14. 并行、增量和并发垃圾回收分别解决什么问题？
15. Minor GC 和 Major GC 分别在什么时候触发？
16. 一个对象从创建到最终回收的完整流程是什么？
17. 常见内存泄漏有哪些？如何预防和排查？

---

### 回答要点

#### 1. V8 的定位：负责解析、编译和执行 JavaScript

JavaScript 首先是一套语言规范。ECMAScript 规定了语法、类型、对象、函数和执行语义，但规范本身不能直接执行代码。

V8 是 JavaScript 和 WebAssembly 引擎，主要应用在 Chrome、Node.js 等运行环境中。它负责：

- 读取和解析 JavaScript 源码；
- 检查语法并生成抽象语法树；
- 编译生成字节码；
- 解释执行字节码；
- 收集代码运行反馈；
- 将适合优化的代码编译成机器码；
- 在优化假设失效时执行反优化；
- 管理 JavaScript 堆内存和垃圾回收。

因此可以概括为：

> ECMAScript 规定 JavaScript 应该具有什么语义，V8 负责按照这些语义真正执行 JavaScript 代码。

#### 2. JavaScript 从源码到执行的基本流程

V8 执行 JavaScript 的主线可以概括为：

~~~text
JavaScript 源码
→ 词法分析，生成 Token
→ 语法分析，生成 AST
→ 编译为 Ignition Bytecode
→ Ignition 解释执行
→ 收集运行反馈
→ 分层编译为机器码
→ 假设失效时 Deoptimization
~~~

词法分析器先把源码拆分成 Token。Parser 再根据语法规则将 Token 组织成抽象语法树 AST。AST 表示变量声明、函数调用、参数列表、表达式和返回语句等程序结构；如果源码不符合语法规则，会在解析阶段抛出语法错误。

AST 随后被编译成 Ignition 可以执行的字节码。Ignition 是 V8 的解释器，负责解释执行字节码。

执行过程中，V8 会通过 Feedback Vector 等结构收集运行信息，例如：

- 函数参数出现过哪些类型；
- 某个属性访问遇到了哪些对象形状；
- 某个调用位置通常调用哪个函数；
- 哪些函数或循环执行频繁。

这些运行反馈会成为后续 JIT 优化的依据。

#### 3. 现代 V8 使用分层执行体系

经典面试回答经常只讲：

~~~text
Ignition → TurboFan
~~~

但现代 V8 的执行体系还包括 Sparkplug 和 Maglev：

| 执行层级 | 主要作用 |
|---|---|
| Ignition | 将源码编译成字节码并解释执行 |
| Sparkplug | 快速把字节码编译成非优化机器码，减少解释器分派开销 |
| Maglev | 中间层优化编译器，较快地产生性能较好的优化代码 |
| TurboFan | 高层优化编译器，编译成本较高，但追求峰值性能 |

整体可以理解为：

~~~text
Ignition 字节码
    ↓
Sparkplug 基线机器码
    ↓
Maglev 中层优化机器码
    ↓
TurboFan 高层优化机器码
~~~

实际执行时，不是每段代码都必然经过所有层级。V8 会根据函数执行频率、反馈稳定程度和编译成本决定是否升级。

这种设计解决的是启动速度和峰值性能之间的矛盾：先用成本较低的方式快速开始执行，再根据运行情况逐级优化，可以兼顾启动速度、编译成本和长期运行性能。

#### 4. 推测优化和反优化

JavaScript 是动态类型语言，同一个函数可能在不同时间接收不同类型的数据。

例如：

~~~javascript
function add(a, b) {
  return a + b
}

for (let i = 0; i < 10000; i++) {
  add(i, i + 1)
}

add('hello', 'world')
~~~

前面大量调用中，参数一直是数字。V8 可以根据运行反馈作出推测：

~~~text
这个调用位置以后大概率仍然传入数字
~~~

优化编译器于是可以生成更高效的数字加法机器码，减少通用类型判断。

后来传入字符串，原来的类型假设被打破。优化代码中的守卫检查失败，就可能触发反优化：

~~~text
优化机器码
→ 类型假设失效
→ 恢复原来的执行状态
→ 回退到低层级代码或字节码
→ 根据新的运行反馈继续执行
~~~

反优化不是程序错误，而是动态语言推测优化的正常组成部分。V8 通过“快速执行—收集反馈—推测优化—必要时反优化”的过程，在正确性和性能之间取得平衡。

#### 5. 调用栈和堆内存

调用栈主要用于保存函数执行状态，例如：

- 函数调用帧；
- 返回地址；
- 参数；
- 局部执行状态；
- 部分临时值和引用；
- 当前执行位置。

堆主要保存需要动态分配、生命周期不能只由一次函数调用决定的数据，例如：

- 对象和数组；
- 函数对象；
- 闭包需要保存的上下文；
- 字符串及其他运行时对象；
- V8 内部管理的数据结构。

不能绝对地说“基本类型都在栈、引用类型都在堆”。更准确的表述是：

> 调用栈保存函数调用帧和部分执行状态，JavaScript 堆保存由 V8 动态管理的对象；具体值还可能被保存在寄存器、栈或堆中，也可能被优化器消除。

例如，部分数字和字符串可能需要堆内存，被闭包捕获的变量也可能进入堆上的上下文对象。垃圾回收主要管理 JavaScript 堆中的对象。

#### 6. 垃圾回收与内存泄漏不是一回事

垃圾回收的作用是：

> 自动找出已经不可达的堆对象，释放或复用它们占用的内存。

但垃圾回收不能保证程序一定没有内存泄漏。

内存泄漏是指：

> 数据已经失去业务价值，但仍然被某条强引用链持有，导致垃圾回收器认为它仍然可达，无法释放。

这里的“泄漏”是内存资源管理问题，不是安全领域中的数据泄露。内存泄漏可能导致页面内存持续增长、GC 越来越频繁、页面卡顿、标签页崩溃或 Node.js 进程内存溢出。

#### 7. 可达性分析：从 GC Root 出发判断对象是否存活

V8 使用追踪式垃圾回收，核心判断原则是可达性。

垃圾回收器从一组 GC Root 出发，沿对象之间的引用关系遍历：

~~~text
GC Root
→ 标记 Root 直接引用的对象
→ 继续遍历这些对象的属性
→ 递归标记所有能够访问到的对象
~~~

能够从 GC Root 访问到的对象属于存活对象；无法从任何 GC Root 访问到的对象属于不可达对象，可以在后续回收中释放。

常见 GC Root 来源包括：

- 当前线程的执行栈；
- 全局对象和全局句柄；
- 当前有效的函数执行上下文；
- V8 的 Handle Scope；
- 编译缓存、符号表等运行时内部结构；
- 由嵌入环境保存的活动引用。

对象不可达只表示它已经具备被回收的条件，不表示内存会在这一行代码执行后立即释放。具体回收时机由 V8 调度。

#### 8. 可达性分析能够处理循环引用

例如：

~~~javascript
function createCycle() {
  const a = {}
  const b = {}

  a.other = b
  b.other = a
}

createCycle()
~~~

函数执行结束后，如果外部没有保留二者：

~~~text
a ⇄ b
~~~

虽然 a 和 b 互相引用，但整个对象组无法从 GC Root 到达，因此可以被回收。

引用计数只统计对象被引用的次数，单独使用时难以处理孤立循环。需要注意：

> 引用计数是一种垃圾回收思路，但不能说 V8 先使用引用计数、后来才改成可达性分析。现代 V8 使用的是基于可达性的追踪式垃圾回收。

#### 9. 为什么采用分代回收

V8 将堆划分为新生代和老生代，核心依据是分代假说：

> 大部分新创建的对象会很快失去引用，只有少量对象会长期存活。

如果每次都扫描整个堆，成本会很高。因此 V8 按对象生命周期划分空间：

| 区域 | 主要对象 | 特点 |
|---|---|---|
| 新生代 | 新创建、生命周期通常较短的对象 | 空间较小，回收频繁，单次速度快 |
| 老生代 | 多次回收后仍然存活的对象 | 空间较大，存活率较高，回收频率低但成本高 |

分代以后，可以针对不同对象生命周期使用不同的回收算法。

#### 10. 新生代 Minor GC：复制存活对象

V8 新生代回收称为 Minor GC，核心回收器是 Scavenger。

新生代可以概念性地理解为两个半空间：

~~~text
From-Space
To-Space
~~~

当当前分配区域接近无法继续分配时，会触发 Minor GC。基本流程是：

~~~text
1. 从栈、全局引用和老生代指向新生代的引用出发
2. 找出新生代中仍然可达的对象
3. 将存活对象从 From-Space 复制到 To-Space
4. 更新所有指向这些对象的引用
5. 不复制不可达对象
6. 直接释放整个原 From-Space
7. 交换 From-Space 和 To-Space 的角色
~~~

这里不是逐个删除垃圾对象，而是只复制存活对象，未被复制的对象会随着原空间整体丢弃。

复制算法适合新生代，是因为大部分新对象很快死亡，需要复制的存活对象通常较少。存活对象还会被连续排列在新空间中，因此能够自然消除内存碎片。

#### 11. 新生代对象晋升到老生代

对象经历 Minor GC 后仍然存活，会获得更高的存活年龄。典型流程是：

~~~text
新对象进入新生代活动空间
→ Minor GC 后仍然存活
→ 复制到另一半空间
→ From/To 角色交换
→ 后续 Minor GC 中仍然存活
→ 晋升到老生代
~~~

面试中可以说“对象多次经历 Minor GC 仍然存活，通常会晋升到老生代”，但不要把“恰好存活两次”说成固定规范。

V8 可能根据对象的存活年龄、To-Space 剩余容量、晋升策略和当前内存压力决定是否晋升。

Minor GC 还需要考虑老生代指向新生代的引用。V8 使用写屏障维护这类引用信息，避免为了回收新生代而扫描整个老生代。

#### 12. 老生代 Major GC：标记、清除和选择性整理

当老生代空间压力增大时，V8 会执行 Major GC。Major GC 会处理整个 JavaScript 堆，核心阶段包括：

~~~text
Mark
→ 标记可达对象

Sweep
→ 回收不可达对象占用的空间

Compact
→ 在需要时整理碎片严重的内存页
~~~

##### Mark-Sweep

首先从 GC Root 出发标记所有可达对象，然后把未标记对象占用的空间加入 Free List，供后续内存分配复用。

它不需要移动大量存活对象，回收开销相对较低，但可能留下不连续的内存空洞，产生内存碎片。

##### Mark-Compact

Mark-Compact 同样先完成可达性标记，然后移动存活对象，使其更加紧凑，并更新所有指向这些对象的引用。

整理后：

~~~text
存活对象集中排列
→ 垃圾空间集中到一侧
→ 一次性释放剩余连续空间
~~~

Mark-Compact 最终同样会回收不可达对象，只是通过移动存活对象让垃圾空间集中起来。

它的开销更高，是因为还需要复制或移动对象、更新引用、维护对象移动后的地址信息，并处理与运行时的关联。换来的优势是减少碎片、获得连续空间并提高后续大对象分配效率。

##### 二者是不是严格前后执行

不能简单理解为每次先完整执行 Mark-Sweep，再完整执行 Mark-Compact。

现代 V8 的 Major GC 会先统一进行标记，再根据内存页的碎片程度选择策略：

~~~text
部分内存页只进行 Sweep
部分碎片严重的内存页进行 Compact
~~~

整理通常是选择性的，并不是每次 Major GC 都整理全部老生代。

#### 13. 并行、增量和并发回收解决主线程停顿

垃圾回收如果完全暂停 JavaScript 并在主线程执行，会产生 Stop-the-World 停顿，导致动画卡顿、输入延迟和帧率下降。

V8 的 Orinoco GC 使用并行、增量和并发技术降低停顿：

| 方式 | 工作方式 | 主要作用 |
|---|---|---|
| Parallel | JavaScript 暂停时，主线程与多个辅助线程共同执行 GC | 缩短单次暂停时间 |
| Incremental | 将较大的标记任务拆成多个小片段，与 JavaScript 交替执行 | 避免一次长时间暂停 |
| Concurrent | 辅助线程在后台执行部分 GC 工作，主线程继续执行 JavaScript | 将更多工作移出主线程 |

并发和增量标记期间，JavaScript 仍可能修改对象引用。V8 需要使用写屏障记录这些变化，保证标记结果正确。

#### 14. Minor GC 和 Major GC 的触发时机

Minor GC 通常在新生代当前分配区域无法继续满足对象分配，或者空间接近耗尽时触发。

它的特点是新生代空间较小、对象创建频繁、回收频率高，但大多数对象会快速死亡，因此单次回收通常较快。

Major GC 通常与以下情况有关：

- 老生代接近动态堆限制；
- 大量新生代对象晋升；
- 老生代无法满足新的内存分配；
- 整体内存压力增大；
- V8 根据分配速率预测需要提前开始并发标记；
- 嵌入环境在空闲时间安排部分 GC 任务。

因此，Major GC 不是简单等到“老生代完全满了”才开始，V8 会根据动态内存限制和分配速度提前调度。

#### 15. 一个对象从创建到最终回收的完整流程

整个对象生命周期可以串成一条主线：

~~~text
JavaScript 创建对象
→ 对象通常进入新生代
→ 新生代空间不足
→ 触发 Minor GC
→ 找到新生代中的存活对象
→ 复制到另一半空间
→ From/To 角色交换
→ 连续存活的对象晋升到老生代
→ 老生代对象逐渐增加
→ 接近动态内存限制
→ 启动 Major GC
→ 从 GC Root 标记存活对象
→ 清除不可达对象
→ 对碎片严重的页面进行整理
→ 更新对象引用
→ 释放或复用内存
~~~

这个流程体现了 V8 的核心设计：

> 生命周期短的对象采用频繁、快速的复制回收；生命周期长的对象采用成本更高但频率更低的标记、清除和整理。

#### 16. 常见内存泄漏场景

内存泄漏的共同本质是：

~~~text
对象已经没有业务价值
但仍然可以从 GC Root 到达
所以垃圾回收器不能释放
~~~

常见情况包括：

1. 全局变量长期持有大量对象；
2. 闭包长期引用已经不再需要的数据；
3. 定时器没有及时清理；
4. 事件监听器没有移除；
5. DOM 节点已经移除，但 JavaScript 仍然保留引用；
6. 缓存、Map 或数组持续增长且没有淘汰策略；
7. WebSocket、观察者和发布订阅没有关闭或取消；
8. 组件卸载后，异步回调仍然持有组件状态；
9. DevTools Console 或调试断点意外保留对象。

闭包、定时器和事件监听器本身不是内存泄漏。只有当它们长期保留已经不再需要的数据时，才构成泄漏。

#### 17. 如何预防和排查内存泄漏

##### 预防措施

- 减少不必要的全局变量；
- 组件卸载时清理定时器；
- 移除不再使用的事件监听；
- 关闭 WebSocket、观察者和订阅；
- 对缓存设置容量、数量或过期时间；
- 避免闭包长期捕获大对象；
- DOM 删除后同步清除 JavaScript 引用；
- 使用 AbortController 取消不再需要的异步任务；
- 在合适的对象关联场景使用 WeakMap 或 WeakSet。

WeakMap 不是通用的内存泄漏修复工具。它适合“关联数据的生命周期不应该超过作为 Key 的对象生命周期”的场景；普通缓存仍然需要明确的淘汰策略。

##### 排查流程

可以按照“发现—定位—确认”的顺序排查：

1. 使用 Chrome Task Manager 或 Performance 面板观察 JavaScript Heap、DOM Node 和 Listener 数量；
2. 重复执行同一组操作，观察完成回收后内存基线是否持续上升；
3. 在操作前后分别拍摄 Heap Snapshot；
4. 使用 Comparison 查看哪些对象数量和 Retained Size 持续增加；
5. 检查 Detached DOM；
6. 通过 Retainers 查看对象到 GC Root 的保留路径；
7. 使用 Allocation Timeline 或 Allocation Sampling 查找持续分配内存的函数。

Retainers 能够回答“对象为什么没有被回收”，通常比只看对象数量更重要。

---

### 标准回答

V8 是用于解析、编译和执行 JavaScript 的引擎。ECMAScript 只规定 JavaScript 的语言语义，真正运行代码需要 V8 这样的 JavaScript 引擎。

V8 获取源码后，先进行词法和语法分析，生成抽象语法树 AST，再将代码编译成 Ignition 字节码并解释执行。执行过程中，V8 会收集参数类型、对象形状和调用目标等运行反馈。代码达到一定条件后，可以由 Sparkplug 快速编译成非优化机器码，再由 Maglev 或 TurboFan 根据运行反馈生成优化机器码。

这些优化通常建立在运行时假设上。例如一个加法函数长期只接收数字，优化编译器可以生成针对数字加法的高效机器码。如果后来传入字符串，类型假设失效，V8 就可能触发反优化，回退到更通用的低层级代码继续执行。通过分层编译、推测优化和反优化，V8 在启动速度、编译成本和峰值性能之间取得平衡。

代码执行过程中还会持续创建对象，因此 V8 需要管理调用栈和堆。调用栈主要保存函数调用帧和执行状态，JavaScript 堆主要保存动态分配的对象。不能严格地把它简化为“基本类型都在栈、引用类型都在堆”，因为实际存储位置会受到值的表示方式、闭包和编译优化影响。

V8 判断对象是否可以回收，核心依据是可达性。垃圾回收器从执行栈、全局对象和运行时句柄等 GC Root 出发，递归标记所有能够访问到的对象。无法从任何 GC Root 访问到的对象属于不可达对象，可以被回收。即使多个对象存在循环引用，只要整个对象组从 GC Root 不可达，也可以被回收。

为了提高回收效率，V8 采用分代回收。大部分新对象生命周期很短，因此新创建的对象通常先进入新生代。新生代空间不足时触发 Minor GC，Scavenger 找出存活对象并将其从 From-Space 复制到 To-Space，随后交换两个空间的角色。没有被复制的不可达对象会随原空间一起释放。对象连续经历多次 Minor GC 后仍然存活，或者满足其他晋升条件，就会进入老生代。

老生代空间压力增大时会执行 Major GC。Major GC 首先从 GC Root 标记可达对象，再清除不可达对象占用的空间。Mark-Sweep 不移动存活对象，开销较低，但可能产生内存碎片；Mark-Compact 会移动存活对象并更新引用，使空闲空间连续，开销较高但能够解决碎片问题。现代 V8 通常根据内存页的碎片情况选择性整理，而不是每次都对整个老生代依次执行完整的 Mark-Sweep 和 Mark-Compact。

为了减少垃圾回收造成的主线程停顿，V8 还采用并行、增量和并发技术。并行回收让多个线程共同完成 GC；增量回收把较大的工作拆成多个小阶段；并发回收让辅助线程在 JavaScript 继续执行时完成部分标记和清除工作。

垃圾回收只能释放不可达对象。如果对象已经没有业务价值，但仍然被全局变量、闭包、定时器、事件监听器、缓存或已分离 DOM 节点引用，它仍然可达，就会形成内存泄漏。工程中需要及时清理定时器和监听器、取消订阅、限制缓存容量，并在适合的对象关联场景使用 WeakMap。

排查内存泄漏时，可以先观察内存是否在重复操作后持续增长，再通过 Chrome DevTools 的 Heap Snapshot 对比前后对象数量，使用 Allocation Timeline 查找持续分配的对象，最后通过 Retainers 定位对象到 GC Root 的引用链，确认究竟是谁阻止了垃圾回收。

---

**Sources:**

- [V8: Maglev - V8's Fastest Optimizing JIT](https://v8.dev/blog/maglev)
- [V8: Sparkplug - a non-optimizing JavaScript compiler](https://v8.dev/blog/sparkplug)
- [V8: Trash talk - the Orinoco garbage collector](https://v8.dev/blog/trash-talk)
- [Chrome DevTools: Memory terminology](https://developer.chrome.com/docs/devtools/memory-problems/get-started)
- [Chrome DevTools: Record heap snapshots](https://developer.chrome.com/docs/devtools/memory-problems/heap-snapshots)
- [Chrome DevTools: Fix memory problems](https://developer.chrome.com/docs/devtools/memory-problems)
