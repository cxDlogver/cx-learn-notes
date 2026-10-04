# Chrome 浏览器渲染原理答题整理

## 第1题 从输入 URL 到页面最终展示，浏览器经历了哪些过程？

### 题目

在 Chrome 浏览器地址栏输入一个 URL（例如 `https://www.baidu.com`）并回车，到最终看到页面，中间完整经历了哪些过程？

### 回答要点

建议按照 **“网络请求阶段 → 页面渲染阶段”** 两部分展开：

1. **URL 解析**
   - 解析协议、域名、端口、路径、查询参数。

2. **DNS 解析**
   - 先检查浏览器相关缓存、操作系统 DNS 缓存、本地 DNS 服务器缓存。
   - 未命中时，本地 DNS 服务器依次向根 DNS、顶级 DNS、权威 DNS 查询。
   - 最终获得服务器 IP 地址。

3. **建立连接**
   - 基于 TCP 的 HTTP 通信先进行 TCP 三次握手。
   - HTTPS 还要进行 TLS 握手，完成服务器身份认证、数字证书校验和会话密钥协商。

4. **HTTP 请求与响应**
   - 浏览器发送 HTTP 请求。
   - 服务器处理请求并返回 HTML 等资源。

5. **解析 HTML、CSS、JavaScript**
   - HTML 解析生成 DOM。
   - CSS 解析生成 CSSOM。
   - 普通同步 JavaScript 可能阻塞 HTML 解析；`async`、`defer` 有不同的加载和执行机制。

6. **生成渲染树**
   - DOM 与 CSSOM 结合生成 Render Tree。

7. **布局 Layout**
   - 计算元素的尺寸和位置。

8. **绘制 Paint**
   - 生成文字、颜色、边框、图片等绘制指令。

9. **分层、栅格化与合成**
   - 浏览器根据页面情况进行分层。
   - 图层经过栅格化后交给合成线程和 GPU。
   - 最终完成 Composite 并输出到屏幕。

一句话收敛：

**URL 解析 → DNS → TCP/TLS → HTTP 请求/响应 → DOM/CSSOM → Render Tree → Layout → Paint → Raster → Composite → 页面显示。**

### 标准回答

在 Chrome 浏览器中，从输入 URL 到最终看到页面，整体可以分成两个大的阶段：**网络请求阶段和页面渲染阶段**。

首先是网络请求阶段。

用户在地址栏输入 URL 并回车以后，浏览器会先解析 URL，从中获取协议、域名、端口号、路径以及查询参数等信息。

接下来浏览器需要根据域名获取目标服务器的 IP 地址，也就是进行 DNS 解析。浏览器会先检查已有的 DNS 缓存，例如浏览器相关缓存、操作系统 DNS 缓存以及本地 DNS 服务器缓存。如果缓存命中，就可以直接得到 IP 地址；如果没有命中，则本地 DNS 服务器继续向根域名服务器、顶级域名服务器以及权威域名服务器逐级查询，最终获得域名对应的 IP 地址并返回给浏览器。

浏览器拿到服务器 IP 后，需要建立网络连接。对于基于 TCP 的 HTTP 通信，客户端和服务器通过三次握手建立 TCP 连接：客户端发送 SYN，服务器返回 SYN+ACK，客户端再返回 ACK。

如果访问的是 HTTPS，还需要在 TCP 连接之上进行 TLS 握手。TLS 握手主要完成服务器身份认证、数字证书校验以及后续通信使用的会话密钥协商。

连接建立后，浏览器向服务器发送 HTTP 请求。服务器接收到请求后，根据 URL 和业务逻辑进行处理，并返回 HTTP 响应。对于普通网页访问，初始响应通常包含 HTML，之后页面中的 CSS、JavaScript、图片、字体等资源还会继续产生新的网络请求。

拿到 HTML 数据以后，就进入页面渲染阶段。

浏览器会逐步解析 HTML，构建 DOM 树；与此同时，页面中的 CSS 会被下载并解析形成 CSSOM 树。浏览器还可以通过预加载扫描器提前发现 CSS、JavaScript、图片等外部资源并发起下载。

如果 HTML 解析过程中遇到没有设置 `async` 或 `defer` 的普通 `<script>`，浏览器会暂停当前 HTML 解析，等待脚本准备并执行完成以后，再继续向后解析。

当浏览器获得 DOM 和 CSSOM 后，会结合两者生成 Render Tree，也就是渲染树。

随后进入 Layout 阶段，浏览器根据渲染树计算各个元素的具体尺寸和位置，例如宽度、高度以及页面中的坐标。

Layout 完成后进入 Paint 阶段，浏览器根据布局结果生成文字、背景、边框、图片、阴影等内容对应的绘制指令。

之后浏览器还会根据元素特性进行分层，并将图层内容进行栅格化，转换为 GPU 可以处理的纹理。最后由合成线程和 GPU 根据图层顺序以及相关属性完成 Composite，也就是图层合成，并将最终生成的一帧画面提交到屏幕显示。

因此整个过程可以概括为：

**URL 解析 → DNS 解析 → 建立 TCP/TLS 连接 → HTTP 请求/响应 → HTML/CSS/JS 解析 → DOM + CSSOM → Render Tree → Layout → Paint → Raster → Composite → 页面显示。**

---

## 第2题 CSS 会不会阻塞 HTML 解析和页面渲染？

### 题目

CSS 到底会不会阻塞 HTML 的解析？会不会阻塞页面渲染？为什么？

例如：

```html
<head>
  <link rel="stylesheet" href="index.css">
</head>

<body>
  <div>Hello</div>
</body>
```

如果 `index.css` 下载非常慢：

1. 浏览器还能不能继续构建 DOM？
2. 能不能直接把 `Hello` 绘制到屏幕上？
3. 为什么？

### 回答要点

按照下面三个层次回答：

1. **CSS 不阻塞 DOM 构建**
   - HTML 解析器仍然可以继续解析 HTML。
   - DOM 树可以继续构建。
   - CSS 的下载和解析可以与 HTML 解析并行进行。

2. **CSS 会阻塞页面渲染**
   - CSS 需要先解析形成 CSSOM。
   - Render Tree 的生成依赖 DOM 和 CSSOM。
   - CSSOM 没有准备好时，浏览器无法确定元素最终样式，因此不能完成后续渲染。

3. **核心关系**
   - CSS 不阻塞：`HTML → DOM`
   - CSS 会阻塞：`DOM + CSSOM → Render Tree → Layout → Paint`

一句话收敛：

**CSS 不会阻塞 HTML 解析和 DOM 构建，但会阻塞 Render Tree 的生成以及页面绘制。**

### 标准回答

CSS **不会阻塞 DOM 树的构建，但是会阻塞页面渲染**。

浏览器解析 HTML 时，如果遇到外部 CSS，会同时下载并解析 CSS，因此 HTML 解析本身仍然可以继续进行，DOM 树也可以继续构建。

但是 CSS 需要解析形成 CSSOM，而后续 Render Tree 的生成依赖 **DOM 和 CSSOM**。在 CSSOM 没有准备好之前，浏览器还无法确定 DOM 节点最终应该应用什么样式，因此不能完成 Render Tree 的生成，也就不能继续进行后面的 Layout、Paint 等渲染过程。

例如：

```html
<head>
  <link rel="stylesheet" href="index.css">
</head>

<body>
  <div>Hello</div>
</body>
```

即使 `index.css` 下载很慢，浏览器仍然可以继续解析 `<body>` 和 `<div>`，并构建 DOM。

但是此时浏览器还不能确定 `Hello` 最终的颜色、字体、大小、布局等样式，因此需要等待 CSSOM 准备完成，再结合 DOM 生成 Render Tree，之后才能完成后续渲染。

所以最终可以总结为：

**CSS 不阻塞 HTML 解析和 DOM 构建，但会阻塞 Render Tree 的生成以及页面绘制。**

---

## 第3题 JavaScript 为什么会阻塞 HTML 解析？普通 script、async 和 defer 有什么区别？

### 题目

JavaScript 为什么会阻塞 HTML 解析？普通 `<script>`、`async` 和 `defer` 三种脚本分别有什么区别？

同时需要说明 JavaScript、DOM 和 CSSOM 之间的阻塞关系。

例如：

```html
<script src="a.js"></script>

<script async src="b.js"></script>

<script defer src="c.js"></script>
```

需要说明：

1. 普通 JavaScript 为什么会阻塞 DOM 解析？
2. CSSOM 与 JavaScript 执行之间是什么关系？
3. 普通 `script`、`async`、`defer` 的下载和执行时机分别是什么？
4. 三者分别适合什么场景？

### 回答要点

建议按照 **“JS 为什么阻塞 DOM → CSSOM 与 JS 的关系 → 普通 script → async → defer → 使用场景”** 的顺序回答。

1. **JavaScript 为什么会阻塞 DOM**
   - JavaScript 可以读取和修改 DOM、CSSOM。
   - HTML 解析与 JavaScript 执行都涉及渲染进程主线程。
   - 因此普通脚本执行时，HTML 解析器会暂停。
   - 等 JS 执行结束后，才继续构建 DOM。

2. **CSSOM 与 JavaScript 的关系**
   - CSS 下载和 CSSOM 构建本身不会直接阻塞 HTML 解析。
   - 但普通脚本可能读取元素的计算样式，因此脚本执行前可能需要等待前面相关样式表准备完成。
   - 常见依赖链可以理解为：

     **等待 CSS/CSSOM → 执行 JS → JS 执行完成 → HTML 继续解析 → DOM 继续构建。**

3. **普通 `<script>`**
   - 解析到脚本时暂停 HTML 解析。
   - 等待脚本资源准备好。
   - 如前面存在会阻塞脚本执行的样式表，还需要等待相关 CSS。
   - 执行脚本。
   - 执行结束后继续 HTML 解析。

4. **`async`**
   - 下载过程与 HTML 解析并行。
   - 下载期间不阻塞 DOM 构建。
   - 也不会停止 CSSOM 自己的构建过程。
   - 脚本准备好后尽快执行，执行时可能打断当前 HTML 解析。
   - 多个 `async` 不保证执行顺序。
   - 适合不依赖完整 DOM、不依赖脚本执行顺序的独立脚本。

5. **`defer`**
   - 下载过程与 HTML 解析并行。
   - 下载期间不阻塞 DOM 构建。
   - 等 HTML/DOM 解析完成后再执行。
   - 多个 `defer` 按文档顺序执行。
   - 在 `DOMContentLoaded` 之前执行。
   - 适合依赖 DOM 结构以及脚本执行顺序的业务代码。

一句话收敛：

**普通 script：阻塞 HTML 解析；async：并行下载、准备好就执行，可能打断解析；defer：并行下载、DOM 解析完成后按顺序执行。**

### 标准回答

JavaScript 会影响 HTML 的解析，核心原因是 **JavaScript 可以直接读取和修改 DOM 和 CSSOM，而 HTML 解析和 JavaScript 执行又都需要渲染进程主线程参与**。

所以浏览器在解析 HTML 时，如果遇到一个没有设置 `async` 或 `defer` 的普通 `<script>`：

```html
<script src="app.js"></script>
```

会暂停当前 HTML 的解析，等待 JavaScript 准备并执行完成以后，再继续向后解析 HTML、构建 DOM。

这里还需要把 **CSSOM、JavaScript 和 DOM 三者之间的关系**说清楚。

CSS 本身不会直接阻塞 HTML 解析，所以浏览器可以一边继续解析 HTML、构建 DOM，一边下载和解析 CSS、构建 CSSOM。

但是 JavaScript 可能读取元素最终的计算样式，因此如果一个普通脚本之前已经存在尚未准备完成、会影响脚本执行的样式表，那么浏览器需要先等待相关样式准备完成，再执行这个 JavaScript。

因此对于普通脚本，可以把依赖关系理解为：

**等待 CSS/CSSOM → JavaScript 执行 → JavaScript 执行结束 → HTML 继续解析 → DOM 继续构建。**

也就是说，CSS 通常不是直接阻塞 DOM 解析，而是可能通过阻塞普通 JavaScript 的执行，间接延长 DOM 解析被暂停的时间。

对于普通 `script`：

```html
<script src="a.js"></script>
```

浏览器解析到它以后，会暂停 HTML 解析。脚本资源准备好，并满足执行条件以后立即执行，执行结束后再继续解析 HTML，因此它会直接阻塞 DOM 树的继续构建。

对于 `async`：

```html
<script async src="b.js"></script>
```

`async` 脚本的下载过程与 HTML 解析并行进行，因此下载期间不会阻塞 DOM 的构建；CSS 也可以继续独立下载和构建 CSSOM。

但是 `async` 脚本一旦准备好，就会尽快执行，因此可能在 DOM 还没有解析完成时开始执行，并打断当前 HTML 解析。

这意味着，如果 `async` 脚本依赖页面后面尚未解析出来的 DOM 元素，或者依赖其他脚本已经执行，就可能出现问题。

因此更准确地说：

**如果脚本依赖完整 DOM、依赖某个特定 DOM 节点已经存在，或者依赖其他脚本的执行顺序，一般不适合使用 `async`。**

`async` 更适合统计、埋点、广告等相对独立的脚本。多个 `async` 脚本不保证按照 HTML 中的声明顺序执行。

对于 `defer`：

```html
<script defer src="c.js"></script>
```

它同样会和 HTML 解析并行下载，因此下载过程不会阻塞 DOM 构建。

但它不会在下载完成后立即执行，而是等 HTML 文档解析完成以后再执行。多个 `defer` 脚本按照文档中的顺序执行，并且会在 `DOMContentLoaded` 事件触发之前完成。

因此，`defer` 更适合依赖 DOM 结构，并且要求脚本执行顺序的业务代码。

最终可以总结为：

- **普通 script**：阻塞 HTML 解析，执行前还可能等待前面的相关样式准备完成。
- **async**：并行下载，准备好就执行，执行时可能打断 DOM 解析，不保证脚本顺序，适合独立脚本。
- **defer**：并行下载，DOM 解析完成后按顺序执行，并在 `DOMContentLoaded` 前完成，适合依赖 DOM 和执行顺序的业务脚本。

---

## 第4题 DOMContentLoaded 和 load 有什么区别？

### 题目

`DOMContentLoaded` 和 `load` 分别在什么时候触发？它们会等待哪些资源？通常分别适用于什么场景？

需要重点说明：

1. `DOMContentLoaded` 触发时，DOM 是否已经构建完成？
2. 图片、CSS、字体、iframe 是否必须加载完成？
3. `defer` 脚本和 `DOMContentLoaded` 的先后关系是什么？
4. `load` 什么时候触发？
5. 两个事件分别适合处理什么逻辑？

### 回答要点

按照 **“DOMContentLoaded → JavaScript 关系 → 不等待的资源 → load → 使用场景”** 的顺序回答。

1. **DOMContentLoaded**
   - HTML 文档解析完成。
   - DOM 树构建完成。
   - DOM 节点已经可以安全访问和操作。

2. **与 JavaScript 的关系**
   - 普通阻塞脚本会影响 HTML 解析，因此需要按照解析规则执行完成后，HTML 才能继续向后解析。
   - `defer` 脚本会在 DOM 解析完成后执行，并且在 `DOMContentLoaded` 触发之前完成。
   - 不能简单表述为“所有 JS 都已经执行完成”。

3. **DOMContentLoaded 不等待所有资源**
   - 不等待图片。
   - 不等待 iframe。
   - 不等待视频、音频等资源。
   - 不保证所有 CSS、字体等资源都已经加载完成。

4. **DOMContentLoaded 与渲染的关系**
   - 它表示 DOM 已就绪。
   - 它不是 CSSOM、Render Tree、Paint 或整个页面渲染完成的标志。

5. **load**
   - 页面所有资源加载完成后触发。
   - 包括 HTML、CSS、JavaScript、图片、字体、iframe、视频、音频等。

6. **典型使用场景**
   - `DOMContentLoaded`：DOM 初始化、事件绑定、DOM 操作、框架挂载。
   - `load`：依赖图片尺寸、iframe 或全部页面资源的逻辑。

一句话收敛：

**DOMContentLoaded 表示 DOM 已准备完成；load 表示整个页面资源已经加载完成。**

### 标准回答

`DOMContentLoaded` 和 `load` 的核心区别，在于它们代表页面加载过程中的不同完成阶段。

首先是 `DOMContentLoaded`。

当浏览器已经完成 **HTML 文档的解析并构建完成 DOM 树**之后，会触发 `DOMContentLoaded`。

此时 DOM 已经准备完成，因此可以安全地访问 DOM 节点，可以使用 `document.querySelector` 等 DOM API，也可以执行事件绑定、修改 DOM、初始化页面以及 Vue、React 等框架的挂载操作。

在 JavaScript 方面，需要结合不同脚本的执行规则理解。

普通阻塞脚本会暂停 HTML 解析，因此浏览器需要按照脚本解析和执行规则处理完相关脚本以后，才能继续完成后续 HTML 解析。

对于 `defer` 脚本，它的下载不会阻塞 HTML 解析，但会在 **DOM 解析完成以后、DOMContentLoaded 事件触发之前执行**。

所以更准确的表述是：

**DOMContentLoaded 表示 DOM 已经构建完成，并且需要在该事件之前完成的脚本已经按照相应规则处理；但不能简单理解为页面中的所有 JavaScript 都已经全部执行完成。**

同时，`DOMContentLoaded` 并不要求页面所有外部资源都已经加载完成。

例如图片、iframe、视频和音频等资源，此时可能仍然处于加载过程中；同时也不保证所有 CSS 和字体资源都已经全部加载完成。

因此：

**DOMContentLoaded 主要表示“DOM 已就绪”，而不是“整个页面已经全部加载完成”。**

同时它也不能直接作为 CSSOM、Render Tree 或整个渲染流程是否完成的判断标准。它关注的是 HTML 解析和 DOM 构建这一阶段。

而 `load` 事件触发得更晚。

当页面中的 **所有资源都已经加载完成以后**，浏览器才会触发 `load`，其中包括 HTML、CSS、JavaScript、图片、字体、iframe，以及视频、音频等资源。

因此二者的典型使用场景也不同。

如果只是需要访问 DOM、绑定事件或者初始化页面逻辑，一般关注 `DOMContentLoaded`。

如果逻辑依赖图片真实尺寸、iframe 内容或者整个页面的所有资源都已经准备完成，则更适合使用 `load`。

最终可以总结为：

**`DOMContentLoaded`：HTML 解析完成，DOM 树构建完成，可以安全操作 DOM，但不等待图片、iframe 等全部外部资源。**

**`load`：DOM 已经完成，并且页面中的 CSS、JavaScript、图片、字体、iframe 等所有资源都已经加载完成。**

面试时最简洁的一句话就是：

> **DOMContentLoaded 看 DOM 是否就绪，load 看整个页面资源是否全部加载完成。**

---

## 第5题 什么是重排（Reflow）、重绘（Repaint）和合成（Composite）？它们有什么区别？

### 题目

什么是重排（Reflow）、重绘（Repaint）和合成（Composite）？它们之间有什么区别？

例如：

```javascript
const box = document.querySelector('.box');

box.style.width = '500px';
box.style.backgroundColor = 'red';
box.style.transform = 'translateX(100px)';
```

需要说明：

1. 修改 `width` 为什么可能触发重排？
2. 修改 `backgroundColor` 为什么通常只需要重绘？
3. 为什么重排通常比重绘开销更大？
4. `transform` 为什么通常比直接修改 `left`、`top` 更适合做动画？
5. 重排、重绘、合成三者之间是什么关系？

### 回答要点

按照 **“重排 → 重绘 → 二者关系 → 合成 → transform 优化”** 的顺序回答。

1. **重排（Reflow / Layout）**
   - 元素几何属性或布局结构发生变化。
   - 浏览器重新计算元素的位置和尺寸。
   - 常见属性包括 `width`、`height`、`margin`、`padding`、`display` 等。
   - DOM 结构变化也可能触发重排。

2. **重绘（Repaint）**
   - 元素外观发生变化，但尺寸和位置没有变化。
   - 不需要重新计算布局，只需要重新绘制像素。
   - 常见属性包括 `color`、`background-color`、`box-shadow` 等。

3. **重排与重绘的关系**
   - 重排会继续触发后续重绘和合成。
   - 重绘不一定触发重排。
   - 所以重排通常比单纯重绘开销更大。

4. **合成（Composite）**
   - 浏览器将不同图层按照正确的层级和位置组合成最终页面。
   - 某些属性变化可以跳过 Layout 和 Paint，直接进行合成。
   - `transform`、`opacity` 是典型例子。

5. **为什么动画推荐 transform**
   - 修改 `left`、`top` 等布局属性可能触发重排。
   - `transform` 不需要改变正常布局中的几何关系。
   - 可以直接由合成线程处理相关图层。
   - 因此可以减少主线程上的 Layout 和 Paint 工作，更适合高频动画。

一句话收敛：

**改变布局 → 重排；只改变外观 → 重绘；只改变图层位置或透明度等合成属性 → 尽量只做合成。**

### 标准回答

重排、重绘和合成代表浏览器页面更新时不同级别的渲染工作。

首先是 **重排，也叫 Reflow 或 Layout**。

当页面元素的几何信息发生变化，例如元素的宽度、高度、位置、边距、内边距发生改变，或者增加、删除 DOM 节点导致页面布局结构变化时，浏览器原来计算好的布局信息就可能失效，因此需要重新计算受影响元素的位置和尺寸。

例如：

```javascript
box.style.width = '500px';
```

`width` 发生变化以后，元素自身的尺寸发生变化，同时还可能影响周围其他元素的位置，因此浏览器需要重新执行 Layout，这就是重排。

其次是 **重绘，也叫 Repaint**。

如果元素的几何位置和尺寸没有发生变化，只是视觉外观发生了变化，例如修改：

```javascript
box.style.backgroundColor = 'red';
```

此时浏览器不需要重新计算元素的位置和尺寸，只需要重新绘制元素的视觉内容，因此会进入 Paint，而不需要重新 Layout。

按照渲染关系，**重排会继续触发后面的重绘和合成，而单纯的重绘不一定需要重新进行重排**。

因此可以概括为：

**重排：Layout → Paint → Composite**

**重绘：Paint → Composite**

而浏览器还有一种更轻量的更新方式，就是 **只进行 Composite，也就是图层合成**。

浏览器可以将页面中的部分内容放入不同的图层，然后由合成线程按照图层的位置、顺序和变换关系组合成最终画面。

像 `transform`、`opacity` 这样的属性，在适合走合成阶段的场景下，可以直接修改图层的变换或透明度，而不需要重新计算 DOM 布局，也不需要重新绘制元素内容，因此可以跳过 Layout 和 Paint，直接进入 Composite。

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

---

## 第6题 什么是浏览器的合成层？为什么合成层能够提升动画性能？

### 题目

什么是浏览器的合成层（Compositing Layer）？浏览器为什么要进行分层？主线程、合成线程和 GPU / 栅格线程分别负责什么？合成阶段浏览器维护的 Layer Tree、Property Trees 和 Draw Quads 分别是什么？`transform`、`opacity` 为什么适合在合成阶段处理？图层是不是越多越好？

### 回答要点

按照 **“什么是合成层 → 为什么分层 → 渲染流程与三类角色 → 合成阶段三个核心结构 → transform/opacity → 分层代价”** 的顺序回答。

1. **什么是合成层**
   - 浏览器不会把整个页面始终作为一张大图处理。
   - 会根据元素特性和性能需求，将部分内容划分为独立图层。
   - 每个图层可以拥有自己的绘制结果，并在最终阶段独立参与合成。
   - 浏览器不会给每一个 DOM 元素都创建独立图层，而是根据性能收益和资源成本进行分层决策。

2. **为什么需要分层**
   - 页面局部发生适合合成处理的变化时，可以复用已有图层纹理。
   - 不需要重新处理整个页面。
   - 可以减少 Layout 和 Paint 的执行。
   - 提高滚动、动画等高频页面更新的效率。
   - 但并不是所有图层变化都可以绕过 Layout 和 Paint。

3. **三个核心角色**
   - **主线程**：负责页面内容的计算和准备，包括 DOM/CSS 处理、JavaScript 执行、样式计算、Layout、Paint、生成绘制列表以及进行分层决策，产出后续合成需要的图层和绘制信息。
   - **合成线程**：接收主线程提交的图层及绘制信息，负责组织图层、维护合成侧的数据结构、处理部分滚动和合成动画、判断哪些区域需要更新、调度栅格化，并组织最终提交给 GPU 的合成数据。
   - **GPU / 栅格线程**：栅格线程或 GPU 将绘制列表真正转换成位图或纹理；GPU 再根据合成线程提交的图层信息和 Draw Quads，对纹理进行变换、混合和叠加，形成最终帧。

   可以收敛为：

   **主线程决定“画什么”，合成线程决定“图层怎么组织和更新”，栅格线程负责“变成纹理”，GPU 负责“把纹理合成为最终画面”。**

4. **合成阶段三个重要结构**
   - **Layer Tree（图层树）**：描述独立图层以及图层之间的层级关系。
   - **Property Trees（属性树）**：保存 `transform`、`opacity`、`clip` 等可以独立更新的属性。
   - **Draw Quads（绘制四边形）**：将已经准备好的图层纹理组织成 GPU 可以处理的绘制单元，描述纹理的位置、尺寸和变换方式。

   三者的职责关系可以理解为：
   - 主线程先产生页面的图层、属性和绘制信息；
   - 合成线程侧维护和使用 Layer Tree、Property Trees，并在最终合成准备阶段组织生成 Draw Quads；
   - GPU 消费这些 Draw Quads 和纹理，完成最终合成。

5. **栅格化优化**
   - **Tiling**：把大图层切成多个 tile。
   - **Occlusion Culling**：不处理被完全遮挡的区域。
   - **Partial Raster**：只重新栅格化发生变化的区域。

6. **为什么 `transform`、`opacity` 性能较好**
   - `transform` 主要改变图层的平移、缩放、旋转等变换。
   - `opacity` 改变透明度。
   - 在满足合成条件时，只需要更新属性树和相关合成信息。
   - 可以跳过 Layout 和 Paint，直接进入 Composite。

7. **图层不是越多越好**
   - 每个图层都需要额外的内存和 GPU 资源。
   - 图层越多，图层树、纹理以及合成关系的管理成本越高。
   - 过度使用 `will-change`、`translateZ(0)` 可能造成“图层爆炸”。

一句话收敛：

> **主线程负责产出页面内容和绘制信息，合成线程负责组织图层、维护合成结构并调度栅格化，栅格线程把内容转换为纹理，GPU 根据 Draw Quads 将纹理合成为最终帧；合成层的价值在于让 `transform`、`opacity` 等变化复用已有图层，尽量绕开 Layout 和 Paint。**

### 标准回答

合成层可以理解为浏览器为了提高页面渲染效率，将页面中的部分内容划分成独立图层，并在最终阶段再将这些图层组合成完整页面。

浏览器并不会为每一个 DOM 元素都创建独立图层，因为如果每个元素都有一个图层，会产生非常大的内存和管理开销。因此浏览器会根据元素特性以及性能收益进行**分层决策**，只把适合独立处理的内容提升为独立图层。

分层最重要的价值是**复用已有的绘制结果**。

假设某个元素已经形成独立图层，而且后续只是修改这个图层的 `transform`，那么图层里面原有的文字、背景、图片等内容本身没有发生变化，浏览器就不需要重新执行 Layout 和 Paint，而可以复用原来的图层纹理，只修改这个图层最终显示时的位置或变换信息，然后重新进行 Composite。

因此，分层特别适合滚动和动画等高频更新场景。

不过需要注意，**成为合成层并不意味着元素以后发生任何变化都可以绕过重排和重绘。**

如果修改：

```css
width
height
margin
left
top
```

这些影响页面布局的属性，仍然需要重新执行 Layout。

如果修改：

```css
background-color
box-shadow
```

这类改变元素实际像素内容的属性，则仍然可能需要重新 Paint。

因此，合成层主要优化的是**能够只在合成阶段处理的变化**。

整个过程中，可以把浏览器的工作划分为 **主线程、合成线程以及 GPU / 栅格线程**三个角色。

首先是 **主线程**。

主线程负责页面内容本身的计算和准备，包括执行 JavaScript、进行样式计算、Layout 和 Paint、生成绘制列表，并根据页面内容决定哪些部分需要形成独立图层。

因此主线程主要解决的是：

> **页面是什么，以及应该画什么。**

主线程完成这些工作以后，会把图层、属性和绘制相关的信息提交给合成线程。

其次是 **合成线程**。

合成线程主要负责组织主线程产生的图层信息，维护图层之间的位置、层级和变换关系，处理能够脱离主线程运行的部分滚动和合成动画，同时判断哪些区域需要更新、哪些内容需要重新栅格化，并调度后续的栅格任务。

因此合成线程解决的是：

> **这些图层应该怎么组织、怎么更新，以及最后怎么组合。**

这里还有三个重要的合成结构。

首先是 **Layer Tree，也就是图层树**，它记录页面中的独立图层以及各图层之间的层级关系，确定最终合成时哪些图层在上、哪些图层在下。

其次是 **Property Trees，也就是属性树**，它主要保存 `transform`、`opacity`、`clip` 等可以独立更新的图层属性。这样，当一个图层只是发生位置、缩放、旋转或者透明度变化时，可以直接更新属性信息，而不必重新执行 Layout 和 Paint。

最后是 **Draw Quads，也就是绘制四边形**。它会把已经准备好的图层纹理组织成 GPU 可以处理的绘制单元，描述每一块纹理应该放在哪里、大小是多少以及采用什么变换方式。

从职责关系上看，可以理解为：

> **主线程先产生页面的图层、属性和绘制信息；合成线程侧维护和使用 Layer Tree、Property Trees，并在最终合成准备阶段组织 Draw Quads；之后再交给 GPU 处理。**

图层本身还不能直接显示到屏幕上，在最终合成之前还需要进行**栅格化 Rasterization**。

栅格化就是把图层对应的绘制列表真正转换成像素位图或者 GPU 可以处理的纹理。

这里需要区分：

> **合成线程主要负责判断和调度哪些内容需要栅格化，真正将绘制指令转换成纹理的工作则由栅格线程或 GPU 完成。**

为了提高栅格化效率，浏览器还会使用一些优化方法：

- Tiling：把大图层切成多个 Tile；
- Occlusion Culling：跳过完全被遮挡的区域；
- Partial Raster：只重新栅格化发生变化的区域。

栅格化完成以后，就得到了 GPU 可以使用的纹理。

最后由 **GPU** 根据合成线程准备好的 Draw Quads、图层层级、位置、`transform`、`opacity` 等信息，对这些纹理进行平移、缩放、旋转、透明度混合和图层叠加，最终形成一帧完整画面并提交显示。

因此整个职责关系可以收敛为：

> **主线程决定“画什么”；合成线程决定“图层怎么组织和更新”；栅格线程负责“把绘制内容变成纹理”；GPU 负责“把这些纹理最终组合成一帧”。**

这也是为什么 `transform` 和 `opacity` 非常适合做动画。

例如：

```css
transform: translateX(100px);
```

改变的主要是图层最终显示时的位置或形态，并不需要修改元素在正常文档流中的布局。

而：

```css
opacity: 0.5;
```

主要改变图层透明度。

当元素满足合成条件时，这些变化可以只修改 Property Trees 中相应的属性，然后直接重新进行 Composite，而不需要重新执行 Layout 和 Paint。

但需要注意，`transform` 并不代表一定会创建独立图层，浏览器仍然会根据性能收益和内存成本决定是否分层；而 `opacity` 如果元素没有进入适合独立合成的状态，也可能仍然产生 Paint。

最后，**合成层也不是越多越好**。

每一个图层都需要占用额外的内存和 GPU 资源，同时浏览器还需要维护图层树、属性信息、纹理以及最终的合成关系。因此如果大量使用：

```css
will-change: transform;
transform: translateZ(0);
```

强制大量元素创建图层，就可能造成图层数量过多，增加 GPU 内存和图层管理成本，反而降低性能。

最终可以收敛为：

> **合成层的核心价值不是“让元素永远不重排重绘”，而是让适合合成处理的属性变化复用已有图层；主线程完成页面计算和绘制准备，合成线程组织图层并维护合成结构，栅格线程生成纹理，GPU 最终完成图层合成，从而尽量绕开 Layout 和 Paint，提高动画和滚动的流畅度。**

---

## 第7题 Chrome 为什么采用多进程架构？从输入 URL 到页面展示，各进程和线程如何协作？

### 题目

Chrome 为什么采用多进程架构？浏览器主要有哪些进程，各自负责什么？

请从**进程视角**说明用户输入 URL 到最终页面显示的完整流水线，并解释：

1. 浏览器主进程、网络进程、渲染进程、GPU 进程分别负责什么？
2. 一个页面是否一定对应一个渲染进程？Chrome 如何决定创建还是复用 Renderer Process？
3. Renderer Process 内部为什么还会有 Main Thread、Compositor Thread、Raster Thread？这些线程和 Network Process、GPU Process 有什么区别？
4. 从输入 URL 到页面最终展示，各个阶段分别由哪些进程和线程参与，它们之间如何调度和协作？
5. 不同进程之间为什么需要 IPC？Chrome 的结构化消息 IPC 和操作系统提供的进程通信机制是什么关系？
6. IPC 为什么既能让进程之间通信，又不会破坏进程隔离？
7. 多进程架构为什么能够提高 Chrome 的安全性和稳定性？

### 回答要点

按照 **“为什么采用多进程 → 进程和线程怎么分 → URL 到页面展示的完整流水线 → 页面和渲染进程的关系 → IPC → 隔离和安全”** 的顺序回答。

### 1. 为什么 Chrome 采用多进程架构

Chrome 采用多进程架构，核心目的是实现**进程隔离，提高稳定性和安全性**。

不同进程拥有独立的资源和内存空间，因此：

- 某一个网页或组件出现异常，不容易直接拖垮整个浏览器；
- 不同页面、不同站点之间的数据可以进行隔离；
- 网络、页面渲染、GPU 合成等工作被拆分到不同进程中，职责更加独立；
- 再配合 Site Isolation、沙箱和权限控制，提高浏览器整体安全性。

文档将这一点概括为：

> **进程管资源，线程做执行；隔离保安全，IPC 传消息。**

### 2. Chrome 中主要有哪些进程？和线程是什么关系？

与页面加载最相关的核心进程主要包括：

- **Browser Process**：浏览器主进程，负责整体调度、导航、进程管理和权限管理；
- **Network Process**：网络进程，负责整个网络请求过程；
- **Renderer Process**：渲染进程，负责把 HTML、CSS、JavaScript 等资源变成页面；
- **GPU Process**：GPU 进程，负责配合图层和纹理完成最终画面合成与显示。

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

渲染进程内部的核心线程是**主线程、合成线程和栅格线程**，并不是把网络线程作为渲染进程的核心线程。真正的网络请求由独立的 Network Process 负责。

其中：

- **Main Thread**：负责 JS、DOM/CSS、样式计算、Layout、Paint 等页面主要逻辑；
- **Compositor Thread**：负责组织图层和合成调度；
- **Raster Thread**：负责图层栅格化；
- **GPU Process** 则不是 Renderer 里面的线程，而是独立进程，负责最终图层合成和画面呈现。

### 3. 从输入 URL 到页面展示的完整进程流水线

整个过程最好不要分开背每个进程，而要理解成一条连续流水线：

> **输入 URL → 浏览器调度 → 网络请求 → 页面渲染 → 图层合成 → 页面显示**

#### 第一阶段：用户输入 URL，Browser Process 接管

用户在地址栏输入 URL 后，首先由 **Browser Process** 接收到这个操作。

它负责判断这是一次什么导航、目标 URL 是什么，以及应该使用哪个 Renderer Process 来承载这个页面。

如果需要，它还会创建新的 Renderer Process；如果满足条件，也可能复用已有的 Renderer Process。

所以这一阶段可以简单理解为：

> **Browser Process 负责接收用户操作和总调度。**

它自己并不负责真正下载 HTML，也不负责解析 DOM。

#### 第二阶段：进入网络请求，Network Process 获取资源

确定导航以后，Browser Process 会协调 **Network Process** 发起网络请求。

Network Process 负责整个网络请求过程，包括：

缓存检查、DNS、建立 TCP 或 QUIC 连接、HTTPS 下的 TLS 握手、发送 HTTP 请求、接收 HTTP 响应，以及缓存、Cookie、连接复用等网络相关工作。

这些内容不需要拆散理解，本质上就是一句话：

> **Network Process 负责根据 URL 把网页需要的资源从服务器拿回来。**

#### 第三阶段：收到 HTML 后，Renderer Process 开始把资源变成页面

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
- 合成前准备。

所以这一阶段最简单的理解是：

> **Network Process 负责把资源拿回来，Renderer Process 负责把这些资源变成页面。**

Renderer Process 内部又由多个线程合作。

首先是 **Main Thread** 完成主要页面逻辑，包括 JavaScript、DOM/CSS、Layout 和 Paint。

之后 **Compositor Thread** 负责组织图层和合成相关信息。

再由 **Raster Thread** 负责将需要绘制的图层进行栅格化。

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

#### 第四阶段：GPU Process 完成最终画面

Renderer Process 完成图层以及合成相关准备以后，会将相关图层和合成信息提交给 **GPU Process**。

GPU Process 主要负责配合纹理和图层完成最终合成，例如处理图层的层级、位置、`transform`、`opacity` 等，然后形成最终的一帧画面并提交给系统显示管线。

所以整个过程最终可以概括成：

> **Browser Process 负责调度 → Network Process 负责获取资源 → Renderer Process 负责生成页面 → GPU Process 负责最终合成并上屏。**

### 4. 一个页面一定对应一个 Renderer Process 吗？

**不一定。**

不能简单理解成：

> 一个页面 = 一个 Renderer Process。

更准确地说，页面与 Renderer Process 不是严格的一对一关系。

Browser Process 在导航过程中会根据页面关系、站点隔离以及进程分配策略决定：

- 是复用已有 Renderer Process；
- 还是创建新的 Renderer Process。

因此更准确的说法是：

> **每个页面都会由某个 Renderer Process 承载，但并不意味着每个页面都一定独占一个 Renderer Process。**

Chrome 还会通过 Site Isolation，将需要隔离的不同站点内容分配到不同 Renderer Process 中，从而提高安全性。

### 5. Renderer Process 里的线程，和 Network Process、GPU Process 有什么区别？

这是第 7 题非常容易混淆的地方。

**进程是资源和隔离的单位，而线程是一个进程内部真正执行任务的单位。**

例如：

Renderer Process 是一个完整的进程，它有自己独立的内存空间。

但是这个进程内部又有：

- Main Thread；
- Compositor Thread；
- Raster Thread。

这些线程属于同一个 Renderer Process，因此共享该进程内部的资源。

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

### 6. 不同进程之间怎么通信？—— IPC

由于 Browser、Network、Renderer、GPU 是不同进程，所以它们拥有独立的内存空间。

也就是说，Renderer Process 不能直接读取 Network Process 内存中的变量，也不能像同一个进程里的函数调用一样直接进入 Network Process 执行代码。

因此不同进程之间需要使用：

> **IPC，Inter-Process Communication，进程间通信。**

IPC 的核心可以非常简单地理解成：

> **一个进程把数据包装成结构化消息发送出去，另一个进程收到消息后解析并执行，再把结果作为消息返回。**

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

### 7. Chrome 的 IPC 和操作系统 IPC 有什么区别？

两者不是完全不同的东西，而是**上下层关系**。

操作系统本身提供了基础的进程间通信能力，例如：

- Named Pipe；
- socketpair；
- 共享内存等。

这些机制主要解决：

> **如何把数据从一个进程传到另一个进程。**

Chrome 在这些操作系统能力之上，又使用 **Mojo** 对 IPC 进行进一步封装。

Mojo 主要负责：

- 定义进程之间可以调用哪些接口；
- 规定消息的数据结构；
- 将数据进行序列化和反序列化；
- 将消息发送给正确的服务。

所以可以非常直白地理解为：

> **操作系统 IPC 解决“消息怎么送过去”，Mojo 解决“发送什么消息、消息是什么格式、谁允许调用什么能力”。**

因此 Chrome 所说的结构化消息 IPC，本质上还是建立在操作系统的进程通信机制之上的，只不过 Chrome 又在上层定义了一套统一的通信规则。

### 8. IPC 为什么不会破坏进程隔离？

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

可以用一个直白的比喻理解：

> **Renderer Process 被放在一个独立房间里，它不能直接跑进 Network Process 或 Browser Process 的房间。如果需要某种能力，只能通过 IPC 窗口提出请求，由有权限的进程决定怎么处理。**

### 标准回答

Chrome 采用多进程架构，核心目的是通过**进程隔离提高浏览器的稳定性和安全性**。不同进程拥有独立的内存空间，因此一个网页或组件出现异常时，不容易直接影响整个浏览器；同时配合 Site Isolation 和沙箱，可以进一步隔离不同站点以及限制网页直接访问系统资源。

和页面加载最相关的主要有 Browser Process、Network Process、Renderer Process 和 GPU Process，但这些进程最好放到一次完整的 URL 访问流程中理解。

用户输入 URL 后，首先由 **Browser Process** 接收。它相当于浏览器的总调度中心，负责导航管理、进程管理和权限管理，同时判断当前页面应该使用已有 Renderer Process，还是创建新的 Renderer Process。

之后进入网络请求阶段。Browser Process 会协调 **Network Process** 获取页面资源。Network Process 负责完整的网络请求过程，包括缓存、DNS、连接建立、TLS、HTTP 请求和响应等，因此可以简单理解成：

> **Network Process 负责根据 URL 把网页资源从服务器拿回来。**

HTML 数据返回之后，就进入 **Renderer Process**。Renderer Process 负责把 HTML、CSS 和 JavaScript 等资源真正变成页面，包括 HTML 到 DOM、CSS 到 CSSOM、JavaScript 执行、Render Tree、Layout、Paint 和分层等整个渲染逻辑。

Renderer Process 本身又包含多个线程，其中 **Main Thread** 负责页面主要计算和执行，**Compositor Thread** 负责图层组织和合成调度，**Raster Thread** 负责栅格化。

所以要特别注意：

> **Renderer Process 是一个进程，而 Main Thread、Compositor Thread 和 Raster Thread 是这个进程内部的线程。**

Network Process 和 GPU Process 则都是 Renderer Process 之外的独立进程。

渲染完成以后，图层和合成相关信息会交给 **GPU Process**。GPU Process 负责配合纹理、图层位置、层级、`transform`、`opacity` 等信息完成最终图层合成，并生成最终一帧画面提交给显示系统。

因此从进程视角看，整个页面加载流程可以总结为：

> **Browser Process 负责调度 → Network Process 负责获取资源 → Renderer Process 负责生成页面 → GPU Process 负责最终合成和显示。**

另外，一个页面并不一定严格对应一个 Renderer Process。页面与 Renderer Process 不是严格的一对一关系，具体是否复用或创建新的 Renderer Process，由 Browser Process 根据站点隔离和进程分配策略决定。

由于这些进程拥有独立的内存空间，所以不同进程之间不能像同一进程内部的线程那样直接共享对象和调用函数，而必须通过 **IPC** 进行通信。

IPC 本质上就是：

> **发送结构化消息 → 对方接收并解析 → 执行任务 → 返回结果。**

例如 Renderer Process 中的 JavaScript 调用 `fetch` 时，Renderer 并不会自己完成 DNS、TCP 和 HTTP，而是通过 IPC 向 Network Process 发送网络请求信息，由 Network Process 真正完成请求，然后再通过 IPC 返回结果。

Chrome 的 IPC 和操作系统 IPC 并不是两套完全不同的机制。操作系统提供 Named Pipe、socketpair、共享内存等底层通信能力，解决“数据怎样从一个进程传到另一个进程”；Chrome 则通过 Mojo 在这些能力之上定义接口、消息结构和服务，解决“进程之间允许发送什么消息以及应该怎样处理”。

最后，IPC 并不会破坏进程隔离。

进程本身仍然拥有独立的内存空间，Renderer Process 不能直接访问 Browser、Network 或 GPU Process 的内部资源，只能够通过预定义的 IPC 接口提出请求。同时 Renderer Process 运行在沙箱中，Browser Process 负责重要权限的裁决，并且 IPC 接口还会对调用和参数进行限制。

所以整个第 7 题最终可以收敛成：

> **Chrome 用多个进程划分职责和安全边界：Browser 负责总调度，Network 负责网络请求，Renderer 负责整个页面渲染逻辑，GPU 负责最终合成；Renderer 内部再通过 Main、Compositor、Raster 等线程完成具体工作。不同进程拥有独立内存空间，通过 IPC 发送受控的结构化消息进行协作，因此既能完成从 URL 到页面展示的完整流水线，又能够保证较好的隔离性、稳定性和安全性。**

---

## 第8题 为什么主线程长任务会导致页面卡顿？应该如何优化？

### 题目

为什么主线程长任务会导致页面卡顿？应该如何优化？

请从**浏览器渲染和线程调度**的角度回答：

1. 为什么 JavaScript 执行时间过长，会影响页面的 Layout、Paint 和用户点击响应？
2. 为什么有时候页面已经显示出来了，但用户点击、输入时仍然感觉“卡住了”？
3. 什么叫 Long Task？为什么把超过 50ms 的主线程任务作为重点关注对象？
4. 如果有一个耗时 300ms 的计算任务，怎样通过“拆任务”降低对主线程的连续占用？
5. `requestAnimationFrame`、`setTimeout` / `postMessage`、`requestIdleCallback` 分别适合什么场景？
6. Web Worker 为什么能够缓解主线程压力？Worker 和主线程是什么关系？它能不能直接操作 DOM？
7. 什么任务适合放到 Web Worker 中？
8. OffscreenCanvas 解决了什么问题？它和普通 Web Worker 的主要区别是什么？

### 回答要点

按照 **“为什么会阻塞 → 为什么页面显示了仍可能卡 → Long Task → 怎么让出主线程 → 怎么搬离主线程”** 的顺序回答。

1. **为什么长任务会导致卡顿**
   - 页面里的 JavaScript 执行、DOM/CSS 处理、Layout、Paint 等很多工作都依赖渲染进程的主线程。
   - 如果主线程正在执行一个耗时很长的 JS 任务，浏览器就很难及时插入布局、绘制和用户输入处理。
   - 因此会出现掉帧、点击延迟、输入卡顿等现象。

2. **为什么页面已经显示出来，仍然可能“点不动”**
   - 页面已经完成一次绘制，只能说明内容已经显示。
   - 用户点击、输入等事件仍然需要主线程处理。
   - 如果此时主线程继续执行大量 JavaScript，页面虽然“看得见”，但交互任务得不到及时执行，所以用户会感觉页面卡住。

3. **Long Task**
   - 文档把执行时间超过 **50ms** 的主线程任务称为 Long Task。
   - 长任务会连续占用主线程，使渲染和输入处理长时间得不到执行机会，因此是页面卡顿的重要关注对象。

4. **优化有两条主线**
   - **拆任务**：任务仍然在主线程执行，但拆成多个小任务，中间主动让出主线程。
   - **搬任务**：对于不依赖 DOM/CSSOM 的工作，直接放到 Web Worker 等其他线程执行。

一句话：

> **拆任务解决“不要一次占太久”，Worker 解决“这件事尽量不要占主线程”。**

### 标准回答

主线程长任务会导致页面卡顿，核心原因是：

> **主线程不仅执行 JavaScript，同时还承担页面渲染和用户交互中的很多关键工作。**

例如 JavaScript 执行、HTML/CSS 相关处理、Layout、Paint，以及点击、输入等事件处理，都和主线程密切相关。

因此，如果主线程正在执行一个 300ms 的复杂计算，这 300ms 内主线程一直没有把控制权交还给浏览器，那么其他等待执行的工作就很难及时得到处理。

可以简单理解成：

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

### 为什么页面已经显示出来了，还可能点不动？

因为：

> **页面已经显示和页面能够及时交互，不是一回事。**

浏览器可能已经完成了前面的 DOM、Layout 和首次 Paint，所以用户已经能看到页面。

但是后面如果还有很大的 JavaScript 文件正在解析、编译或者执行，主线程仍然可能被占用。

这时用户点击按钮，点击事件虽然发生了，但对应的回调需要等主线程有空才能处理。

因此就会出现：

> **页面已经看得见，但点按钮没反应、输入延迟、滚动卡顿。**

### 什么是 Long Task？

文档把主线程中**执行时间超过 50ms 的任务**作为 Long Task 来重点关注。

原因并不是说：

> 50ms 一到页面就一定完全卡死。

而是从性能分析角度看，一个任务如果长时间连续占据主线程，就会让浏览器缺少处理渲染和用户输入的机会。

因此文档的优化目标是：

> **减少 Long Task，让主线程经常出现短暂的空闲时间。**

这样浏览器才能在这些空档里处理 Layout、Paint、用户输入等更重要的工作。

### 如果现在有一个 300ms 的计算任务，应该怎么优化？

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

这就是“主动拆分任务并让出主线程”。

#### `requestAnimationFrame`

如果任务和页面动画、DOM 更新、下一帧渲染有关，可以使用 `requestAnimationFrame`。

它适合：

> **需要和浏览器渲染帧保持节奏的任务。**

例如一批视觉更新，不要一次全部执行，而是分散到多帧中处理。

#### `setTimeout(0)` / `postMessage`

如果任务本身和页面帧没有直接关系，只是想：

> **先把当前任务结束，把控制权还给浏览器，再继续执行下一块。**

就可以使用 `setTimeout(0)` 或 `postMessage` 将任务拆开。

所以可以简单理解：

- `requestAnimationFrame`：**跟着渲染帧干活**；
- `setTimeout/postMessage`：**单纯把一个大任务切开，让主线程中间有机会处理其他事情**。

#### `requestIdleCallback`

如果任务本身并不重要，例如：

- 日志上报；
- 埋点；
- 非紧急数据处理；

可以等主线程空闲时再做。

这就是 `requestIdleCallback`。

它的思想是：

> **“这件事不着急，你有空再执行。”**

通常还需要设置 `timeout`，防止页面一直很忙，导致这个任务长期没有机会执行。

因此三者可以这样记：

> **与渲染有关 → requestAnimationFrame**  
> **普通任务拆分 → setTimeout / postMessage**  
> **低优先级任务 → requestIdleCallback**

### Web Worker 为什么能进一步减轻主线程压力？

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

这样纯计算任务不会长期占用主线程，主线程可以继续处理渲染和用户交互。

### Worker 能不能直接操作 DOM？

**不能。**

Web Worker 适合处理：

> **不依赖 DOM/CSSOM 的纯计算任务。**

例如：

- 大数据处理；
- JSON 数据解析；
- 排序和筛选；
- 数据压缩、解压；
- 路径规划；
- 一些 CPU 密集型计算。

Worker 如果计算出了结果，需要通过消息：

```javascript
worker.postMessage(...)
```

和主线程通信，再让主线程根据结果去更新页面。

所以可以记成：

> **Worker 负责算，主线程负责改 DOM。**

### OffscreenCanvas 又解决什么问题？

普通 Web Worker 主要适合把**计算任务**搬离主线程。

但是如果页面有大量 Canvas 绘制，例如：

- 高频实时图表；
- 大量 Canvas 动画；
- 复杂可视化；

这些绘制本身也可能给主线程造成很大压力。

这时候可以使用 **OffscreenCanvas**。

它允许把 Canvas 的绘制控制权转移给 Worker，让 Canvas 的绘制逻辑也可以在 Worker 线程中执行。

所以区别可以简单记成：

> **Web Worker：主要把“计算”搬出去。**  
> **OffscreenCanvas：进一步把“Canvas 绘制”也搬出去。**

最终可以收敛为：

> **主线程长任务导致卡顿，本质上是因为 JavaScript、页面渲染和用户交互都需要主线程参与。当一个长任务持续占用主线程时，Layout、Paint 和用户输入只能等待，所以即使页面已经显示出来，也可能出现“看得见但点不动”的情况。优化的核心有两条：第一，把长任务拆成多个小任务，通过 `requestAnimationFrame`、`setTimeout/postMessage`、`requestIdleCallback` 主动让出主线程；第二，把不依赖 DOM/CSSOM 的纯计算直接放到 Web Worker 中，而大量 Canvas 绘制可以进一步通过 OffscreenCanvas 搬到 Worker。最终目标就是让主线程持续保持足够的空闲时间去处理渲染和交互。**

---

## 第9题 浏览器为什么需要预加载扫描器？它和 HTML 解析器是什么关系？

### 题目

为什么浏览器需要预加载扫描器（Preload Scanner）？它和 HTML 主解析器是什么关系？

请重点回答：

1. 浏览器在解析 HTML 时，为什么不能等主解析器真正解析到 `<script>`、`<link>`、`<img>` 等标签时才开始下载资源？
2. 预加载扫描器是做什么的？它和主线程上的 HTML 解析器是串行还是并行关系？
3. 如果普通 `<script>` 会阻塞 HTML 解析，为什么脚本、CSS、图片等资源仍然可能继续并行下载？
4. 预加载扫描器提前发现资源之后，真正的网络请求由谁完成？这里怎么和 Network Process 联系起来？
5. `async`、`defer` 和预加载扫描器之间是什么关系？
6. 为什么“HTML 解析被 JS 阻塞”不等于“浏览器所有资源下载也全部停止”？

### 回答要点

可以按照 **“为什么需要 → 怎么工作 → 为什么 JS 阻塞解析但不阻塞所有下载 → 和 Network Process 的关系 → async/defer 的区别”** 来回答。

预加载扫描器的核心作用是：

> **在主线程正常解析 HTML 的同时，提前发现页面中后续需要加载的外部资源，并尽早启动这些资源的网络请求。**

如果浏览器完全等 HTML 主解析器真正走到 `<link>`、`<script>`、`<img>` 标签时才开始请求资源，那么一旦 HTML 解析被普通 JavaScript 阻塞，后面那些还没解析到的 CSS、JS、图片也只能继续等待，网络就会出现大量空闲时间。

所以浏览器增加了预加载扫描器，让它可以和主 HTML 解析过程并行工作，提前扫描 HTML 中的资源引用。

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

例如遇到一个没有 `async` 或 `defer` 的普通 `<script>` 时，HTML 解析器需要暂停，等待脚本处理完成之后再继续向下解析。

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

从而提前启动这些资源的请求。

所以它和 HTML 主解析器的关系可以简单理解成：

> **主解析器负责真正理解 HTML 并构建 DOM；预加载扫描器负责提前往后看，看看还有哪些资源需要下载。**

两者是**并行工作的**。

### 为什么普通 JS 会阻塞 HTML 解析，但其他资源仍然可以继续下载？

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

### 预加载扫描器发现资源以后，真正是谁去下载？

这里可以直接和多进程架构联系起来。

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

### 预加载扫描器和 async、defer 是什么关系？

这几个概念容易混在一起，但解决的问题并不完全相同。

#### 预加载扫描器主要解决“什么时候开始下载”

它的目的就是：

> **不要等主 HTML 解析器真正走到资源标签时才开始下载，而是提前发现并请求资源。**

所以它解决的是：

> **资源发现和下载时机。**

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

### 一个完整例子

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
style.css
b.js
banner.png
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

最终可以收敛为：

> **预加载扫描器是浏览器为了提高资源加载并行度而设计的机制。HTML 主解析器负责真正解析 HTML 和构建 DOM，而预加载扫描器会和它并行工作，提前扫描后续的 `<script>`、`<link>`、`<img>` 等资源引用，并尽早发起网络请求。真正的下载工作由 Network Process 完成。因此，普通 JavaScript 虽然会暂停 HTML 主解析器，但并不意味着浏览器所有网络请求都停止，因为预加载扫描器可能已经提前发现并启动了后续资源的下载。预加载扫描器主要解决资源“什么时候开始下载”，而 `async`、`defer` 主要决定脚本下载和执行如何与 HTML 解析协同。**

---

## 第10题 强缓存和协商缓存分别是什么？浏览器的缓存判断流程是怎样的？

### 题目

浏览器为什么需要 HTTP 缓存？强缓存和协商缓存分别是什么？它们各自由哪些 HTTP 头控制？浏览器请求一个已经缓存过的资源时，完整的缓存判断流程是怎样的？

回答时需要说明：

1. 浏览器使用缓存的目的是什么？
2. 什么是强缓存？强缓存命中后是否还需要请求服务器？
3. 强缓存中的 `Cache-Control` 和 `Expires` 分别有什么作用？
4. `Cache-Control` 中的 `max-age`、`no-cache`、`no-store` 分别是什么意思？
5. 什么是协商缓存？
6. `ETag / If-None-Match` 和 `Last-Modified / If-Modified-Since` 分别如何工作？
7. 协商缓存返回 `304 Not Modified` 和返回新资源分别意味着什么？
8. 浏览器完整的缓存判断顺序是什么？

### 回答要点

按照以下顺序回答：

**缓存目的 → 强缓存 → Cache-Control / Expires → no-cache / no-store → 协商缓存 → ETag / If-None-Match → Last-Modified / If-Modified-Since → 304 / 新响应 → 完整流程**

核心内容：

1. **缓存目的**
   - 复用已经获取过的资源。
   - 减少重复网络请求和数据传输。
   - 降低加载延迟、节省带宽、减轻服务器压力。

2. **强缓存**
   - 缓存仍然有效时直接使用本地资源。
   - 命中后不需要向服务器发起验证请求。
   - 主要通过 `Cache-Control` 和 `Expires` 控制。

3. **Cache-Control**
   - `max-age`：缓存可以直接使用的有效时间。
   - `no-cache`：可以缓存，但再次使用前必须向服务器验证。
   - `no-store`：不存储该响应。

4. **Expires**
   - 使用一个绝对时间表示缓存过期时间。
   - 与 `Cache-Control: max-age` 同时存在时，通常优先使用 `max-age`。

5. **协商缓存**
   - 缓存不能直接使用时，向服务器验证本地缓存是否仍然有效。
   - 主要有两套机制：
     - `ETag` ↔ `If-None-Match`
     - `Last-Modified` ↔ `If-Modified-Since`

6. **协商结果**
   - 资源未变化：`304 Not Modified`，继续使用本地缓存。
   - 资源已变化：服务器返回新的完整响应，浏览器使用并更新缓存。

7. **整体顺序**
   - 先判断缓存能否直接使用。
   - 能直接使用 → 强缓存。
   - 不能直接使用 → 发起条件请求进行协商验证。

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

---

## 第11题 HTTPS 是什么？它相比 HTTP 解决了什么问题？

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


---

## 第12题 TLS/SSL 是如何在 HTTPS 中建立安全通信环境的？

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

核心要点如下：

1. **TLS 的目标** 
   - HTTPS 可以理解为 HTTP 建立在 TLS 提供的安全通信通道之上。 
   - TLS 主要解决三个问题： 
     - 身份认证：确认正在通信的服务器是谁。 
     - 机密性：防止通信内容被直接窃听。 
     - 完整性：防止数据被篡改而不被发现。 
2. **三类密码学机制的分工** 
   - 哈希：生成数据摘要，参与握手完整性验证、数字签名、Finished 验证和密钥派生。 
   - 非对称密码学：完成服务器身份认证以及共享秘密的建立。 
   - 对称加密：在握手完成后高效保护大量 HTTP 数据。 
3. **数字证书** 
   - 解决“服务器提供的公钥到底是不是属于这个服务器”的问题。 
   - CA 对服务器身份与公钥之间的绑定进行数字签名。 
   - 客户端通过证书链、CA 签名、域名、有效期等验证服务器身份。 
4. **TLS 握手** 
   - `ClientHello`：客户端提供版本、算法、随机数、密钥交换参数等。 
   - `ServerHello`：服务器选择参数并返回自己的密钥交换信息。 
   - 双方根据各自的私有参数和交换的公开参数计算出相同的共享秘密。 
   - 共享秘密本身不直接在网络上传输。 
   - 再从共享秘密派生握手密钥和后续应用流量密钥。 
5. **握手完整性** 
   - TLS 持续维护整个握手过程的 `Transcript Hash`。 
   - `CertificateVerify` 证明服务器持有证书对应的私钥，并把身份认证与当前握手绑定。 
   - `Finished` 对之前的握手过程进行最终完整性验证和密钥确认。 
6. **正式通信** 
   - 握手完成后，不再使用高开销的非对称密码运算处理每一条 HTTP 数据。 
   - 使用派生出的对称流量密钥，通过 AEAD 算法同时提供加密和完整性保护。

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

非对称密码学在 TLS 中主要解决两个问题：**身份认证和共享秘密建立**。

现代 TLS 并不是简单地生成一个对称密钥，然后用服务器公钥加密后发给客户端。更准确地说，是通信双方交换公开的密钥协商参数，同时保留自己的私有参数，然后分别在本地计算，最终得到相同的共享秘密。

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

---

## 第13题 DNS 域名解析的完整过程是什么？

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

1. **DNS 的目标**
   - DNS 负责把域名转换成应用真正需要使用的资源记录，例如把域名解析为 IP 地址。
   - 浏览器访问 `www.example.com` 时，需要先获得目标服务器的 IP 地址，才能继续建立网络连接。

2. **缓存查询**
   - 客户端会优先利用已有的 DNS 缓存结果，例如浏览器、操作系统或本地解析组件的缓存。
   - 如果本地没有可用结果，则把查询交给配置的递归 DNS 解析器。
   - 递归解析器自身也会检查缓存；命中后可以直接返回。

3. **完整 DNS 查询链路**
   - 递归解析器没有缓存时，从根域名服务器开始寻找。
   - 根 DNS 通常不直接返回目标 IP，而是告诉解析器应该继续查询哪个顶级域服务器。
   - 顶级域 DNS 再提供负责目标域名的权威 DNS 信息。
   - 权威 DNS 最终返回目标域名对应的资源记录。
   - 解析器把结果缓存一定时间，并返回给客户端。

4. **递归查询和迭代查询**
   - 客户端通常向递归解析器发起递归查询：希望直接得到最终答案或错误。
   - 递归解析器向根、TLD、权威 DNS 查询时，通常根据服务器返回的 referral 逐步继续查询。
   - 因此不能简单说“浏览器自己依次访问根 DNS、顶级域 DNS、权威 DNS”。

5. **UDP 与 TCP**
   - DNS 支持 UDP 和 TCP，传统普通查询大量使用 UDP，因为无需建立 TCP 连接，开销较低。
   - 当 UDP 响应被截断等情况下，可以改用 TCP。
   - 现代通用 DNS 实现需要同时支持 UDP 和 TCP。

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

具体实现中，缓存可能存在于浏览器或应用、操作系统解析组件以及递归 DNS 解析器等位置。DNS 记录带有 TTL，解析器可以在 TTL 有效期间缓存结果，减少重复查询。

如果递归 DNS 解析器自身也没有缓存，就需要继续寻找真正负责这个域名的权威 DNS 服务器。

#### 2. 从根 DNS 一直查询到权威 DNS

这里最容易理解错误的一点是：

> **通常不是浏览器自己依次访问根 DNS、顶级域 DNS 和权威 DNS。**

一般情况下，客户端把问题交给一个**递归 DNS 解析器**：

> “帮我找到 `www.example.com` 的 IP。”

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

三个层次的职责可以这样理解：

```text
根 DNS
→ 告诉解析器去哪里找对应的顶级域服务器

顶级域 DNS
→ 告诉解析器目标域名由哪个权威 DNS 管理

权威 DNS
→ 保存目标域名真正的 DNS 记录并返回结果
```

例如查询：

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
www.example.com 对应的资源记录
```

因此根 DNS 通常并不会直接告诉解析器 `www.example.com` 的 IP，而是不断把解析器引导到更接近最终答案的 DNS 服务器。

查询得到最终结果后，递归解析器会根据记录的 TTL 缓存结果，然后把结果返回给客户端，这样后续请求就可能不必重新走完整查询链路。

#### 3. 递归查询和迭代查询

客户端通常向递归解析器表达的需求是：

> **“你帮我查完，最终告诉我答案。”**

这可以理解成**递归查询**。

而递归解析器向根 DNS、顶级域 DNS 等服务器查询时，如果当前服务器没有最终答案，它可能返回下一步应该查询的服务器信息，也就是 referral。

所以可以简单记成：

```text
客户端 → 递归解析器
“你帮我找到最终答案”

递归解析器 → 根/TLD/权威服务器
“你知道就告诉我，
不知道就告诉我下一步应该问谁”
```

因此不要把 DNS 的完整查询过程理解成“浏览器亲自依次访问根 DNS、TLD 和权威 DNS”；大多数情况下，是递归解析器代替客户端完成后续查找过程。

#### 4. DNS 为什么经常使用 UDP？什么时候使用 TCP？

DNS 传统的普通查询大量使用 UDP，主要原因是 UDP 不需要像 TCP 那样先建立连接，对于短小的请求—响应式查询，额外开销更低。

但 DNS 并不是只能使用 UDP，它同时支持 TCP。

例如，当 UDP 响应过大而被截断时，客户端可以改用 TCP 重新查询。区域传送等场景也会使用 TCP。现代 DNS 还存在 EDNS、DNSSEC 等机制，因此不能简单用“超过 512 字节才使用 TCP”概括全部情况。

所以更准确的说法是：

> **普通 DNS 查询传统上大量使用 UDP，因为开销较低；DNS 同时支持 TCP，当 UDP 响应被截断、需要传输较大数据，或者协议和实现需要时可以使用 TCP。**

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

最终可以概括为：

> **DNS 的作用是把域名解析成 IP 等资源记录。客户端首先利用本地缓存，没有结果时通常把请求交给递归 DNS 解析器。递归解析器先检查自己的缓存，如果仍然没有结果，就根据 DNS 的层次结构从根域名服务器开始查询；根 DNS 返回顶级域服务器的信息，顶级域 DNS 再返回目标域名对应的权威 DNS，最终由权威 DNS 返回实际资源记录。解析器将结果按照 TTL 缓存并返回客户端。客户端到递归解析器通常是递归查询，而递归解析器在查询根、TLD 和权威服务器时会根据 referral 逐级寻找答案。DNS 同时支持 UDP 和 TCP，普通查询传统上大量使用 UDP，但在 UDP 响应被截断或其他协议需求下也会使用 TCP。**

---

## 第14题 TCP 和 UDP 有什么区别？分别适合什么场景？

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

1. **TCP 的特点**
   - 面向连接，正式传输数据之前需要建立连接。
   - 提供可靠、有序的字节流传输。
   - 通过序列号、确认机制、重传等手段实现可靠性。
   - 具有流量控制和拥塞控制机制。
   - 协议机制较复杂，通常会带来更多状态维护和传输开销。

2. **UDP 的特点**
   - 无连接，发送数据前不需要建立类似 TCP 的连接状态。
   - 面向数据报，每个 UDP Datagram 保留独立消息边界。
   - 协议本身不提供 TCP 那样的确认、重传、有序交付和流量控制机制。
   - 协议机制简单，适合希望降低传输层额外机制和时延的场景。

3. **TCP 的可靠传输**
   - 序列号：标识字节位置，保证数据能够按顺序重组。
   - ACK：接收方确认已经收到的数据。
   - 重传：发现数据丢失后重新发送。
   - 校验和：检测传输中的比特错误。
   - TCP 因而向应用提供可靠、有序的字节流。

4. **字节流和数据报**
   - TCP 面向字节流：应用写入的数据在 TCP 看来是一串连续字节，本身不保留应用层消息边界。
   - UDP 面向数据报：一次发送的 Datagram 作为独立消息进行传递，保留报文边界。

5. **流量控制和拥塞控制**
   - 流量控制：解决“接收方来不及接收”的问题，发送方受接收窗口 `rwnd` 限制。
   - 拥塞控制：解决“网络承载不了这么多数据”的问题，发送方通过拥塞窗口 `cwnd` 等机制控制进入网络的数据量。
   - 实际可发送量同时受到 `rwnd` 和 `cwnd` 的约束。

6. **选择原则**
   - 如果业务非常重视可靠、有序交付，可以优先考虑 TCP。
   - 如果业务更强调实时性，并且愿意由应用层自己处理丢包、重传、排序等问题，可以考虑 UDP。
   - 不能简单理解为“TCP 慢、UDP 快”，真正的区别是两种协议提供的传输语义和机制不同。

### 标准回答

TCP 和 UDP 都属于传输层协议，但它们提供给应用程序的服务模型不同。

最核心的区别可以先概括成：

> **TCP 提供面向连接、可靠、有序的字节流服务；UDP 提供机制更精简的数据报服务，本身不负责把数据变成像 TCP 那样的可靠、有序字节流。**

#### 1. TCP 和 UDP 的核心区别

TCP 是**面向连接**的。通信双方在正式交换应用数据之前，需要先建立 TCP 连接，并在整个连接过程中维护序列号、确认状态、窗口等信息。

TCP 向应用提供的是：

> **可靠、有序的字节流。**

UDP 则不同。UDP 提供的是一种机制非常精简的数据报服务，应用程序可以直接向另一个端点发送 UDP 数据报，而不需要先建立类似 TCP 的连接状态。

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

#### 2. TCP 为什么能够实现可靠传输？

TCP 的可靠性不是来自某一个单独机制，而是多个机制共同完成的。

首先是**序列号**。

TCP 把应用数据看成连续的字节流，并给这些字节进行编号。这样接收方就能判断：

- 哪些数据已经收到；
- 哪些数据丢失；
- 哪些数据重复；
- 数据应该按什么顺序重新组织。

其次是**确认 ACK**。

接收方收到数据以后，会通过确认信息告诉发送方：

> “哪些数据我已经收到了。”

发送方根据 ACK 推进发送状态。

如果发送出去的数据一直没有得到正确确认，就可能进入重传过程。

核心流程可以理解为：

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

TCP 还使用校验和检测传输中的错误。因此可以把 TCP 的可靠性收敛为：

> **TCP 的可靠性主要依靠序列号、确认、丢失检测和重传等机制共同实现。**

#### 3. “面向字节流”和“面向报文”是什么意思？

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

因此使用 TCP 时，应用层协议需要自己设计固定长度、长度字段、特殊分隔符等方式来识别消息边界。

UDP 是**面向数据报**的。

如果应用发送两个独立 UDP Datagram：

```text
Datagram 1：ABC

Datagram 2：DEF
```

它们仍然是两个独立的数据报，而不是像 TCP 那样被抽象成一个连续字节流。

因此可以记成：

> **TCP 关注“这是一串连续字节”，UDP 关注“这是一个个独立的数据报”。**

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
- 快速恢复。

所以可以直接记：

```text
流量控制
→ 看接收方能不能接得住
→ rwnd

拥塞控制
→ 看网络能不能承受
→ cwnd
```

真正允许发送的数据量，需要同时受到接收窗口和拥塞窗口的约束。

#### 5. 为什么有些业务选择 TCP，有些选择 UDP？

选择 TCP 还是 UDP，本质上取决于：

> **业务到底更需要什么样的传输语义。**

如果业务非常重视：

```text
数据不能丢
+
数据顺序不能错
+
希望传输层负责重传和控制
```

那么 TCP 更合适。

如果业务更关注：

```text
低延迟
+
允许一定程度的数据丢失
+
希望应用自己决定是否重传
```

那么 UDP 往往更有吸引力。

例如实时语音或视频场景中，一段已经过时的数据即使重新传回来，也可能已经失去播放价值。此时应用可能宁可接受部分丢失，也不希望因为等待旧数据重传而增加延迟。

游戏中的实时状态同步也可能有类似需求：已经过时的位置状态，重新可靠传回来可能意义不大。

因此 UDP 给应用更多自由度：

> **可以不要重传，也可以自己实现只重传重要数据，还可以自己设计排序、可靠性和拥塞控制策略。**

但需要特别注意：

> **UDP 本身没有可靠性，不等于“基于 UDP 的协议都不可靠”。**

应用完全可以在 UDP 之上自行实现可靠传输。例如现代 QUIC 就运行在 UDP 之上，但自己实现了可靠传输、拥塞控制、多路复用和加密等能力。

最终可以收敛为：

> **TCP 是面向连接的可靠、有序字节流协议，通过序列号、ACK、丢失检测和重传保证可靠性，并通过流量控制避免接收方过载，通过拥塞控制限制对网络的压力。UDP 则提供更精简的无连接数据报服务，不负责 TCP 式的可靠、有序交付，也不会自动完成相同的重传和流量控制。TCP 更适合希望传输层直接提供可靠、有序数据流的场景；UDP 更适合需要低延迟、希望应用层自行控制可靠性和传输策略的场景。选择 TCP 还是 UDP，本质上不是简单比较谁更快，而是看业务需要哪一种传输语义。**

---

## 第15题 TCP 三次握手的过程是什么？为什么不能只进行两次握手？

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

1. **三次握手的目的**
   - TCP 是面向连接的协议，通信之前需要让双方建立连接状态。
   - 更核心的是让双方同步彼此的初始序列号 ISN。
   - 三次握手还用于避免网络中旧的、重复的连接请求造成错误连接。

2. **第一次握手**
   - 客户端发送 `SYN=1`。
   - 假设客户端初始序列号为 `x`，则发送 `seq=x`。
   - 客户端进入 `SYN-SENT` 状态。

3. **第二次握手**
   - 服务器收到客户端 SYN 后返回 `SYN + ACK`。
   - 服务器选择自己的初始序列号 `y`。
   - `seq=y`，`ack=x+1`。
   - `ack=x+1` 表示已经收到客户端的 SYN，并期待客户端下一序列号为 `x+1`。
   - 服务器进入 `SYN-RECEIVED` 状态。

4. **第三次握手**
   - 客户端收到服务器的 `SYN+ACK` 后发送 ACK。
   - `seq=x+1`，`ack=y+1`。
   - 客户端确认收到了服务器的 SYN 和初始序列号。
   - 客户端进入 `ESTABLISHED`；服务器收到该 ACK 后也进入 `ESTABLISHED`。

5. **为什么需要第三次**
   - 两次只能让服务器确认客户端的 SYN，但服务器还不知道自己的 SYN 和初始序列号是否真正被客户端接受。
   - 第三次 ACK 完成了服务器初始序列号的确认。
   - 同时，它允许 TCP 判断第一次收到的 SYN 是否可能是历史连接留下的旧重复报文，降低错误建立连接的可能性。

6. **序列号机制**
   - `SYN` 会占用一个序列号，所以收到 `seq=x` 的 SYN 后确认号是 `x+1`。
   - 单纯的 ACK 不占用序列号空间。

### 标准回答

TCP 是面向连接的可靠传输协议，在正式传输数据之前需要通过三次握手建立连接。

三次握手最核心的作用不是简单地“确认双方在线”，而是：

> **让客户端和服务器交换并确认彼此的初始序列号，同时降低旧的重复连接请求造成错误连接的可能性。**

TCP 的可靠传输依赖序列号，因此连接建立时，双方必须知道：

```text
客户端准备从哪个序列号开始发送
+
服务器准备从哪个序列号开始发送
```

假设客户端初始序列号是 `x`，服务器初始序列号是 `y`。

#### 1. 三次握手的具体过程

第一次握手，客户端向服务器发送：

```text
Client                              Server

SYN=1
seq=x
  ───────────────────────────────→
```

`SYN` 表示客户端希望建立连接，并把自己的初始序列号 `x` 告诉服务器。

此时客户端从：

```text
CLOSED
  ↓
SYN-SENT
```

第二次握手，服务器收到以后返回：

```text
Client                              Server

        SYN=1, ACK=1
        seq=y
        ack=x+1
  ←───────────────────────────────
```

这里服务器同时做了两件事：

- `ACK=1, ack=x+1`：确认已经收到客户端的 SYN 和初始序列号 `x`；
- `SYN=1, seq=y`：把服务器自己的初始序列号 `y` 告诉客户端。

因此第二次握手本质上是：

```text
确认客户端 ISN
+
发送服务器自己的 ISN
```

服务器进入：

```text
LISTEN
  ↓
SYN-RECEIVED
```

第三次握手，客户端收到服务器的 `SYN+ACK` 后发送：

```text
Client                              Server

ACK=1
seq=x+1
ack=y+1
  ───────────────────────────────→
```

这个 ACK 表示：

> **服务器的 SYN 和初始序列号 `y` 我也已经收到。**

客户端发送 ACK 后进入 `ESTABLISHED`，服务器收到该 ACK 后也进入 `ESTABLISHED`。

完整过程可以表示为：

```text
Client                                  Server

SYN
seq=x
─────────────────────────────────────→

                 SYN + ACK
                 seq=y
                 ack=x+1
←─────────────────────────────────────

ACK
seq=x+1
ack=y+1
─────────────────────────────────────→

ESTABLISHED                         ESTABLISHED
```

#### 2. 为什么不能只进行两次握手？

如果只有两次：

```text
Client                         Server

SYN seq=x
────────────────────────────→

        SYN+ACK seq=y ack=x+1
←────────────────────────────
```

此时服务器已经知道客户端的 SYN 到达了，客户端也知道服务器收到了自己的 SYN，并且客户端已经拿到了服务器的初始序列号 `y`。

但是服务器还不知道：

> **客户端是否真的收到了并接受了服务器的 SYN 和初始序列号 `y`。**

因此还需要第三次 ACK：

```text
ACK y+1
```

来完成服务器初始序列号的确认。

从序列号同步角度看：

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

这样双方的初始序列号才真正完成双向同步。

三次握手还有一个重要作用，就是防止历史失效的 SYN 报文导致错误建立连接。

例如客户端曾经发送过：

```text
SYN seq=90
```

这个报文因为网络异常长期滞留，后来才到达服务器。

服务器单凭收到这个 SYN，并不能知道它到底是当前的新连接请求，还是过去遗留的旧请求。

服务器可能返回：

```text
SYN + ACK
ack=91
```

如果当前客户端实际上并没有发起这个连接，就不会按照一个正常的新连接继续完成第三次握手。这样服务器就不会仅凭一个迟到的历史 SYN 就错误地建立完整连接。

所以“为什么不能两次握手”更准确的回答是：

> **TCP 建立连接时需要同步双方的初始序列号。第一次 SYN 把客户端的 ISN 告诉服务器；第二次 SYN+ACK 确认客户端 ISN，并把服务器 ISN 告诉客户端；第三次 ACK 再确认服务器 ISN，从而完成双向序列号同步。同时，第三次确认也有助于避免网络中旧的重复 SYN 导致错误建立连接。**

最终可以收敛为：

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
避免旧重复连接请求造成错误连接
+
TCP 进入 ESTABLISHED
```

---

## 第16题 TCP 四次挥手的过程是什么？为什么通常需要四次而不是三次？

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

1. **四次挥手的目的**
   - TCP 是全双工通信，两个方向的数据传输需要分别关闭。
   - 一方发送 `FIN`，只代表“我这一方向的数据已经发送完毕”，并不代表对方也已经发送完毕。
   - 正常关闭需要保证双方剩余数据能够可靠传输完成。

2. **四次挥手过程**
   - 第一次：主动关闭方发送 `FIN`，进入 `FIN-WAIT-1`。
   - 第二次：被动关闭方收到 `FIN` 后立即返回 `ACK`，进入 `CLOSE-WAIT`；主动方收到 ACK 后进入 `FIN-WAIT-2`。
   - 第三次：被动关闭方自己的数据也发送完成、应用决定关闭后，再发送 `FIN`，进入 `LAST-ACK`。
   - 第四次：主动关闭方收到 `FIN` 后返回 `ACK`，进入 `TIME-WAIT`；被动关闭方收到 ACK 后进入 `CLOSED`。

3. **为什么通常需要四次**
   - 收到对方 `FIN` 时，只能说明对方不再发送数据。
   - 被动方可能仍然有数据要发送，所以必须先 ACK 对方的 FIN，但自己的 FIN 可以晚一些发送。
   - 因此 ACK 和 FIN 通常分成两个报文。
   - 如果被动方收到 FIN 时恰好也已经准备关闭，ACK 和 FIN 可以放在同一个报文里，因此实际也可能出现“三个报文”的关闭过程。

4. **TIME-WAIT**
   - 主动关闭方收到对方 FIN 并发送最后一个 ACK 后进入 `TIME-WAIT`。
   - 作用一：如果最后一个 ACK 丢失，对方会重传 FIN，主动方还能再次发送 ACK。
   - 作用二：让旧连接中可能滞留的报文逐渐从网络中消失，避免影响后续使用相同连接标识的新连接。
   - 主动关闭的一端通常保持 `TIME-WAIT` 达 `2 × MSL`。

5. **最后 ACK 丢失**
   - 被动关闭方因为没有收到对自己 FIN 的确认，会重传 FIN。
   - 主动关闭方仍在 `TIME-WAIT`，收到重传 FIN 后会再次发送 ACK，并重新启动等待计时。

### 标准回答

TCP 是一个**全双工协议**，也就是说连接建立后：

```text
客户端 ───────→ 服务器
客户端 ←─────── 服务器
```

两个方向的数据传输是相对独立的。

因此关闭 TCP 连接不能简单理解成“一方说关闭，整个连接立即消失”，而是：

> **一个方向一个方向地关闭，确保双方剩余的数据都能够传输完成。**

这也是 TCP 正常关闭通常表现为四次挥手的根本原因。

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

这里的 `CLOSE-WAIT` 表示：

> **服务器已经知道对方不会继续发送数据了，但是服务器自己的发送方向还没有关闭，正在等待本地应用决定关闭。**

服务器此时可能仍然有剩余数据需要发送。

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

客户端此时处于 `FIN-WAIT-2`，等待服务器自己的 FIN。

客户端收到服务器 FIN 后，进行第四次挥手：

```text
ACK
```

完整过程可以表示为：

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

#### 2. 为什么通常是四次，而三次握手只有三次？

核心原因是：

> **TCP 是全双工的，两个发送方向需要分别关闭。**

三次握手时，服务器收到客户端 SYN 后，可以把：

```text
确认客户端 SYN
+
发送自己的 SYN
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

因此 `ACK` 和 `FIN` 通常分开，最终形成四个报文。

不过 TCP 并不是绝对必须产生四个独立报文。

如果服务器收到客户端 FIN 时，自己的数据也已经发送完、应用也准备关闭，那么服务器可以把：

```text
ACK + FIN
```

放在同一个 TCP Segment 中，于是实际关闭过程也可能只有三个报文。

因此更准确的说法是：

> **TCP 正常关闭通常称为“四次挥手”，因为 ACK 和 FIN 往往需要分开发送；但协议并不要求它们一定是四个独立报文，如果被动关闭方已经准备好关闭，ACK 和 FIN 可以合并。**

#### 3. 为什么最后一定要有 TIME-WAIT？

客户端发送第四次 ACK 后，不能马上进入 `CLOSED`，而要先进入 `TIME-WAIT`，主要有两个原因。

第一，**保证服务器有机会收到最后的 ACK**。

假设最后这个 ACK 在网络中丢失：

```text
Client                      Server

ACK
────────── X
          丢失
```

服务器一直没有收到 ACK，因此还停留在 `LAST-ACK`，随后会重新发送：

```text
FIN
```

如果客户端已经彻底关闭连接，就无法正常处理这个 FIN。

但如果客户端仍然处于 `TIME-WAIT`，那么它收到重传 FIN 后可以再次回复 ACK。

所以第一层作用是：

> **保证最后一次关闭确认具有可靠重传的机会。**

第二，**让旧连接中的历史报文有时间从网络中消失。**

如果一个旧连接刚关闭，网络里还有旧报文因为延迟没有消失，而此时立即使用相同的端点组合建立新连接，这些旧报文就可能对新连接造成干扰。

所以 TCP 让主动关闭方保持 `TIME-WAIT` 一段时间，让旧连接中可能存在的延迟报文逐渐失效。

#### 4. 为什么是 2MSL？

`MSL` 是：

```text
Maximum Segment Lifetime
```

也就是一个 TCP Segment 被认为可能在网络中存活的最大时间。

主动关闭 TCP 连接后通常需要保持：

```text
2 × MSL
```

的 `TIME-WAIT`。

从理解上可以把它看成覆盖一次可能的“最后 FIN → ACK”往返以及让旧报文充分过期的等待窗口：

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

更重要的是记住它的目的：

```text
TIME-WAIT
    ↓
保证最后 ACK 有重发机会
    +
让旧连接延迟报文失效
```

最终可以收敛为：

> **TCP 是全双工协议，所以两个方向需要分别关闭。主动关闭方首先发送 FIN，进入 FIN-WAIT-1；被动关闭方收到后立即返回 ACK 并进入 CLOSE-WAIT，主动方收到 ACK 后进入 FIN-WAIT-2。被动方可以继续发送剩余数据，等本地应用也决定关闭以后，再发送自己的 FIN 并进入 LAST-ACK；主动方收到 FIN 后返回最后一个 ACK，并进入 TIME-WAIT，被动方收到 ACK 后进入 CLOSED。之所以通常需要四次，是因为收到 FIN 后必须先确认，但被动方自己的发送方向可能还没有关闭，所以 ACK 和 FIN 通常需要分开发送；如果被动方已经准备好关闭，两者也可以合并。主动关闭方最后进入 TIME-WAIT，主要是为了在最后 ACK 丢失时还能响应对方重传的 FIN，同时让旧连接中的延迟报文充分失效，之后才真正进入 CLOSED。**

---

## 第17题 TCP 的拥塞控制是怎么做的？慢启动、拥塞避免、快速重传和快速恢复分别是什么？

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

1. **拥塞控制的目标**
   - 拥塞控制解决的是“网络能不能承受当前发送速度”的问题。
   - 流量控制解决的是“接收方能不能接得住”的问题。
   - `cwnd` 是发送端根据网络拥塞情况维护的拥塞窗口；`rwnd` 是接收方通告的接收窗口。
   - 实际能够保持在途的数据量同时受到两者限制，可以理解为受 `min(cwnd, rwnd)` 约束。

2. **慢启动**
   - TCP 刚开始并不知道网络能够承受多大的发送量，所以从较小的 `cwnd` 开始探测。
   - 每收到对新数据的 ACK，就增加 `cwnd`。
   - 因此一个 RTT 内收到一轮 ACK 后，`cwnd` 通常呈现近似翻倍的增长，即近似指数增长。
   - 当 `cwnd` 达到 `ssthresh` 后，转入拥塞避免。

3. **拥塞避免**
   - 网络容量已经探测到一定程度后，不再继续高速扩大窗口。
   - `cwnd` 改为近似线性增长，经典算法中约每个 RTT 增加一个 SMSS。
   - 核心思想是从“快速探测”转变为“谨慎增加”。

4. **拥塞判断**
   - 经典 TCP 主要把丢包视为拥塞信号，同时也可以通过 ECN 显式获取拥塞信号。
   - **重传超时 RTO**：通常认为情况比较严重。
   - **三个重复 ACK**：说明后面的报文仍然能够到达，只是中间某个报文很可能丢失，因此网络通常没有完全失去传输能力。

5. **快速重传与快速恢复**
   - 收到三个重复 ACK 后，不等待 RTO 超时，立即重传推测丢失的报文，这就是快速重传。
   - 同时降低 `ssthresh` 和 `cwnd`，但不会像超时那样完全回到最保守状态，而进入快速恢复。
   - 丢失数据恢复后，进入拥塞避免继续发送。

6. **完整过程**
   - `慢启动 → 达到 ssthresh → 拥塞避免`
   - 如果发生超时：大幅降低发送速率，再重新慢启动。
   - 如果收到三个重复 ACK：快速重传 → 快速恢复 → 拥塞避免。

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

因此“慢启动”的“慢”不是指 `cwnd` 增长得慢，而是 TCP 不会一开始就把窗口直接设置得很大，而是从较小窗口逐步探测网络。实际上它的增长近似指数增长。

但是不能一直这样翻倍，否则很快就可能把网络打满。

因此 TCP 还有一个变量：

```text
ssthresh
Slow Start Threshold
慢启动阈值
```

可以简单记成：

```text
cwnd < ssthresh
→ 慢启动
→ 快速增长

cwnd 达到 ssthresh 附近
→ 转向拥塞避免
```

进入**拥塞避免**以后，TCP 会变得更加保守。

不再每个 RTT 近似翻倍，而是经典情况下：

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

可以把两个阶段理解成：

> **慢启动负责快速找到网络大概能承受多少数据；拥塞避免则在接近网络容量以后，小心地继续向上试探。**

#### 2. 网络出现丢包以后怎么办？

经典 TCP 拥塞控制通常把**丢包**看作网络可能发生拥塞的重要信号。

主要有两种典型情况：

```text
情况一：重传定时器超时 RTO

情况二：收到 3 个重复 ACK
```

这两个信号虽然都可能意味着有数据丢失，但严重程度不同。

第一种是 **RTO 超时**。

如果发送出去的数据长时间没有获得期望确认，最终发生 RTO timeout，通常认为网络可能发生了比较严重的拥塞。

经典处理思路是：

1. 把 `ssthresh` 降低到当前在途数据量的大约一半；
2. 把 `cwnd` 大幅降低；
3. 重新通过慢启动探测网络。

可以理解为：

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

核心思想是：

> **既然连 ACK 都长时间收不到，就认为网络情况比较差，发送速度必须明显降低。**

第二种情况是收到**三个重复 ACK**。

假设发送：

```text
1  2  3  4  5
```

其中 `2` 丢失，但 `3、4、5` 后续仍然到达接收方。接收方会不断返回相同的 ACK，表示：

> **“我下一步还在等 2。”**

发送方因此能够观察到多个重复 ACK。

这里和超时有一个重要区别：

> **虽然有一个报文丢了，但后面的报文仍然不断到达接收方。**

说明网络并没有完全失去传输能力，更可能只是某个 Segment 丢失。

因此，当收到 **3 个重复 ACK** 后，TCP 不再继续等待 RTO，而是立即重传推测已经丢失的报文。

这就是：

> **Fast Retransmit——快速重传。**

快速重传的意义就是：

> **通过重复 ACK 提前发现可能的丢包，从而减少等待超时带来的延迟。**

#### 3. 快速恢复为什么不像超时那样重新从头慢启动？

三个重复 ACK 的出现说明：

> **后续的数据仍然能够穿过网络并到达接收方。**

因此网络发生了一定程度的拥塞或丢包，但仍然具有传输能力。

所以 TCP 不需要像 RTO 一样把发送速度重新降到非常保守的水平，而是在降低窗口后进入：

> **Fast Recovery——快速恢复。**

整个逻辑可以理解为：

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

因此需要区分：

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

最终可以收敛为：

> **TCP 拥塞控制主要通过拥塞窗口 `cwnd` 控制发送方能够向网络中注入多少未确认数据。刚开始网络容量未知，因此使用慢启动，从较小窗口开始，通过 ACK 使 cwnd 近似指数增长；达到慢启动阈值 `ssthresh` 后进入拥塞避免，cwnd 改为近似线性增长。如果发生 RTO 超时，TCP 认为拥塞比较严重，会降低 `ssthresh`、大幅降低 `cwnd` 并重新慢启动；如果收到三个重复 ACK，则说明某个报文很可能丢失，但后续数据仍能通过网络，因此立即进行快速重传，并进入快速恢复，之后继续拥塞避免。流量控制解决的是接收方能不能接住，而拥塞控制解决的是网络能不能承受，实际发送量同时受到 `rwnd` 和 `cwnd` 的约束。**

---

## 第18题 TCP 的流量控制是怎么实现的？滑动窗口起什么作用？

### 问题

1. TCP 为什么需要流量控制？
2. TCP 的流量控制和拥塞控制有什么区别？
3. 什么是滑动窗口？
4. 接收方的接收能力为什么会影响发送方的发送量？
5. ACK、序列号和滑动窗口是怎样配合工作的？
6. TCP 实际发送数据时，为什么既要考虑接收方的窗口，也要考虑拥塞窗口？

### 回答要点

核心要点如下：

1. **流量控制的目标**
   - TCP 的发送方和接收方处理数据的速度可能不同。
   - 如果发送方持续以过快速度发送数据，接收方可能来不及处理。
   - 因此 TCP 通过流量控制限制发送速度，避免接收方处理不过来。

2. **滑动窗口**
   - TCP 通过滑动窗口控制发送方能够连续发送的数据范围。
   - 发送方不需要每发送一个数据段就停下来等待 ACK，而可以在窗口允许范围内连续发送多个数据。
   - 当部分数据得到确认以后，窗口向后移动，从而允许发送新的数据。

3. **ACK 与序列号**
   - TCP 是面向字节流的可靠传输协议。
   - 序列号用于标识数据在字节流中的位置。
   - ACK 用于确认已经成功接收的数据。
   - 随着 ACK 返回，已经确认的数据移出发送窗口，窗口继续向前滑动。

4. **流量控制和拥塞控制**
   - 流量控制解决的是：**接收方能不能处理这么多数据。**
   - 拥塞控制解决的是：**中间网络能不能承受这么多数据。**
   - 两者虽然都会限制发送量，但控制目标不同。

5. **发送量的限制**
   - 发送方不能只根据接收方能力发送，还要考虑网络拥塞情况。
   - 因此实际发送过程同时受到接收侧窗口和拥塞窗口的约束。

### 标准回答

TCP 的流量控制主要解决的是：

> **发送方发送得太快，而接收方来不及处理的问题。**

TCP 是可靠的字节流协议，发送方可能具有很强的数据发送能力，但接收方的数据处理速度和缓冲能力是有限的。如果发送方完全不考虑接收方状态，持续发送大量数据，就可能导致接收方无法及时处理。

因此 TCP 使用**滑动窗口机制**进行流量控制。

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

TCP 是面向字节流的协议，因此数据具有对应的序列位置。发送方通过序列号标识数据，接收方收到以后通过 ACK 告诉发送方已经成功收到哪些数据。

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

因此实际 TCP 发送数据时，不能只看接收方还能接收多少数据，还需要同时考虑当前网络的拥塞情况。

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

---

## 第19题 HTTP 请求报文和响应报文分别由哪些部分组成？

### 问题

1. HTTP 在整个网络通信过程中主要负责什么？
2. HTTP 请求报文由哪些部分组成？
3. 请求行中的请求方法、Request-URI、HTTP 版本分别表示什么？
4. 请求头有什么作用？
5. 请求体什么时候存在？
6. HTTP 响应报文由哪些部分组成？
7. 响应行中的 HTTP 版本、状态码和状态描述分别是什么？
8. `1xx`～`5xx` 五类状态码分别表示什么？
9. 从浏览器发出请求到服务器返回 HTML、JSON 等数据，完整的请求—响应过程是什么？

### 回答要点

核心要点如下：

1. **HTTP 的作用**
   - HTTP 是应用层协议。
   - 它定义客户端和服务器交换请求、响应报文的格式和方式。
   - 浏览器构造 HTTP 请求后，通过下面的传输层将数据发送到服务器。

2. **HTTP 请求报文**
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

3. **请求行**
   - Method：希望服务器执行什么操作，如 GET、POST、PUT、DELETE。
   - Request-URI：访问哪个资源，例如 `/index.html`。
   - HTTP Version：使用哪个 HTTP 协议版本。

4. **请求头**
   - 使用键值对携带请求的附加信息。
   - 常见字段包括 `Host`、`User-Agent`、`Accept` 等。

5. **请求体**
   - 用于携带客户端提交给服务器的实体数据。
   - 常见于 POST、PUT 等请求。
   - 可以承载表单、JSON 等数据。

6. **HTTP 响应报文**
   - 响应行 `Response Line`
   - 响应头 `Response Headers`
   - 空行
   - 响应体 `Response Body`
   - 响应行格式：
     ```text
     HTTP版本 状态码 状态描述
     ```

7. **状态码**
   - `1xx`：信息性状态
   - `2xx`：成功
   - `3xx`：重定向
   - `4xx`：客户端错误
   - `5xx`：服务器错误

8. **响应头和响应体**
   - 响应头描述服务器以及响应体相关信息。
   - 常见字段包括 `Content-Type`、`Content-Length`、`Set-Cookie`、`Cache-Control` 等。
   - 响应体是真正返回给浏览器的 HTML、JSON、图片等资源。

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

#### 1. HTTP 请求报文

HTTP 请求报文可以按下面的结构理解：

```text
请求行
请求头
空行
请求体（可选）
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

组成。

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

请求方法表示客户端希望服务器进行什么操作，例如：

```text
GET
POST
PUT
DELETE
HEAD
OPTIONS
PATCH
```

可以简单理解为：

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

请求行后面是**请求头**。

请求头用于携带这次 HTTP 请求的附加信息，例如：

```http
GET / HTTP/1.1
Host: www.example.com
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

请求头后面通过一个**空行**和请求体分隔。

请求体 `Request Body` 用于携带客户端真正提交给服务器的数据，例如：

```text
表单数据
JSON
```

因此请求报文可以收敛为：

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
响应行
响应头
空行
响应体
```

例如：

```http
HTTP/1.1 200 OK
Content-Type: text/html
Content-Length: 1024

<html>...</html>
```

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

状态码用于告诉客户端：

> **服务器对这次请求的处理结果是什么。**

状态码可以分成五类：

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

常见状态码例如：

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

响应行之后是**响应头**。

常见响应头包括：

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

随后通过空行进入**响应体**。

响应体就是服务器真正返回给客户端的资源，例如：

```text
HTML 页面
JSON 数据
图片
```

而响应体的内容类型可以由 `Content-Type` 描述。

完整的 HTTP 请求—响应流程可以整理成：

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

---

## 第20题 HTTP 的“无状态”和“持久连接”分别是什么意思？两者是否矛盾？

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

1. **HTTP 无状态**
   - HTTP 本身不会自动保存客户端上一次请求的上下文信息。
   - 每一次 HTTP 请求都可以看作相对独立的请求。
   - 服务器处理当前请求时，主要依据当前请求携带的信息。

2. **无状态带来的问题**
   - HTTP 本身无法自动跟踪用户会话。
   - 例如用户是否已经登录、购物车中有哪些商品等，都需要额外的状态管理机制。
   - 常见机制包括 Cookie、Session、Token。

3. **Cookie、Session、Token**
   - Cookie：浏览器保存信息，并在后续请求中携带给服务器。
   - Session：服务器保存用户状态，客户端通常通过 Cookie 保存 Session ID。
   - Token：客户端保存代表身份或权限的信息，并在后续请求中携带。

4. **持久连接**
   - HTTP/1.1 支持持久连接。
   - 一个 TCP 连接建立后不必在每个 HTTP 请求结束后立即关闭。
   - 后续多个 HTTP 请求可以继续复用同一个 TCP 连接。

5. **持久连接的作用**
   - 减少重复建立和关闭 TCP 连接的次数。
   - 减少反复进行 TCP 三次握手所产生的时间和通信开销。

6. **无状态和持久连接不矛盾**
   - 无状态描述的是：HTTP 是否自动保存前后请求之间的业务上下文。
   - 持久连接描述的是：底层 TCP 连接是否继续保留并复用。
   - TCP 连接可以保持，但 HTTP 请求之间仍然可以保持无状态。

### 标准回答

HTTP 的**无状态**和**持久连接**描述的是两个不同层面的问题，因此并不矛盾。

#### 1. 什么叫 HTTP 无状态？

HTTP 无状态指的是：

> **HTTP 协议本身不会自动保存前一次请求的上下文，每一次请求都是相对独立的。**

也就是说，客户端第一次请求服务器之后，服务器并不会因为 HTTP 协议本身，就自动记住：

```text
这个用户是谁
之前访问过什么
有没有登录
购物车里有什么
```

下一次客户端再发送 HTTP 请求时，服务器仍然需要根据**当前这一次请求携带的信息**进行处理。

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

因此，HTTP 本身无法自动维护登录状态、购物车等业务状态。

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

如果完全没有额外机制，HTTP 本身并不会自动知道三个请求属于同一个用户。

因此应用通常通过：

```text
Cookie
Session
Token
```

来补充状态管理能力。

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

因此持久连接主要解决的是：

```text
减少 TCP 重复建立
+
减少 TCP 重复关闭
+
减少握手开销
+
降低通信延迟
```

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
Cookie
Session ID
Token
```

等机制携带相关信息。

因此：

```text
TCP 连接是否还活着
≠
HTTP 是否自动保存业务状态
```

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

