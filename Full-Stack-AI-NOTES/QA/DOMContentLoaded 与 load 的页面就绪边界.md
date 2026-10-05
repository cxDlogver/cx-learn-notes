# DOMContentLoaded 与 load 的页面就绪边界

## 【知识概述】

**DOMContentLoaded 表示文档解析及相关延后脚本完成，load 还等待参与页面加载的资源；两者都不能单独证明业务已经就绪。**

`DOMContentLoaded` 和 `load` 的核心区别，在于它们代表页面加载过程中的不同完成阶段。

当浏览器已经完成 **HTML 文档的解析并构建完成 DOM 树**之后，会触发 `DOMContentLoaded`。

此时 DOM 已经准备完成，因此可以安全地访问 DOM 节点，可以使用 `document.querySelector` 等 DOM API，也可以执行事件绑定、修改 DOM、初始化页面以及 Vue、React 等框架的挂载操作。[相关知识](<../J-基于Chrome浏览器渲染原理.md>)

在 JavaScript 方面，需要结合不同脚本的执行规则理解。

普通阻塞脚本会暂停 HTML 解析，因此浏览器需要按照脚本解析和执行规则处理完相关脚本以后，才能继续完成后续 HTML 解析。

理解这组机制，可以沿以下主线展开：

先以 DOM 构建完成为节点说明 DOMContentLoaded 的用途。

再解释 defer、模块脚本和样式依赖如何影响这个节点。

对比图片等资源加载与 load，最后按事件绑定、资源读取和业务条件选择等待方式。

DOMContentLoaded 不保证画面已全部绘制，load 也不保证接口数据或框架异步逻辑全部完成。相关完整知识可结合 [基于Chrome浏览器渲染原理](<../J-基于Chrome浏览器渲染原理.md>) 阅读。

## 1. 机制示例

这些片段展示当前主题需要解释的操作、数据关系或请求路径。判断时应关注前后的依赖和边界，后续机制说明给出对应原因。

```html
<link rel="stylesheet" href="index.css">
<script defer src="app.js"></script>
<img src="large-image.jpg">
<iframe src="child.html"></iframe>
```

## 2. 机制说明与工程判断

按照 **“DOMContentLoaded → JavaScript关系 → 不等待的资源 → load → 使用场景”** 回答。
### 【DOMContentLoaded】

- HTML 文档解析完成。
- DOM 树构建完成。
- DOM 节点已经可以安全访问和操作。
### 【与 JavaScript 的关系】

- 普通阻塞脚本会影响 HTML 解析，因此需要按照解析规则执行完成后，HTML 才能继续向后解析。
- `defer` 脚本会在 DOM 解析完成后执行，并且在 `DOMContentLoaded` 触发之前完成。
- 不能简单表述为“所有 JS 都已经执行完成”。
### 【DOMContentLoaded 不等待所有资源】

- 不等待图片。
- 不等待 iframe。
- 不等待视频、音频等资源。
- 不保证所有 CSS、字体等资源都已经加载完成。[相关知识](<../J-基于Chrome浏览器渲染原理.md>)
### 【DOMContentLoaded 与渲染的关系】

- 它表示 DOM 已就绪。
- 它不是 CSSOM、Render Tree、Paint 或整个页面渲染完成的标志。
### 【load】

- 页面所有资源加载完成后触发。
- 包括 HTML、CSS、JavaScript、图片、字体、iframe、视频、音频等。[相关知识](<../J-基于Chrome浏览器渲染原理.md>)
### 【典型使用场景】

- `DOMContentLoaded`：DOM 初始化、事件绑定、DOM 操作、框架挂载。
- `load`：依赖图片尺寸、iframe 或全部页面资源的逻辑。

一句话收敛：

**DOMContentLoaded 表示 DOM 已准备完成；load 表示整个页面资源已经加载完成。**

## 3. 完整回答与表达组织

`DOMContentLoaded` 和 `load` 的核心区别，在于它们代表页面加载过程中的不同完成阶段。

首先是 `DOMContentLoaded`。

当浏览器已经完成 **HTML 文档的解析并构建完成 DOM 树**之后，会触发 `DOMContentLoaded`。

此时 DOM 已经准备完成，因此可以安全地访问 DOM 节点，可以使用 `document.querySelector` 等 DOM API，也可以执行事件绑定、修改 DOM、初始化页面以及 Vue、React 等框架的挂载操作。[相关知识](<../J-基于Chrome浏览器渲染原理.md>)

在 JavaScript 方面，需要结合不同脚本的执行规则理解。

普通阻塞脚本会暂停 HTML 解析，因此浏览器需要按照脚本解析和执行规则处理完相关脚本以后，才能继续完成后续 HTML 解析。

对于 `defer` 脚本，它的下载不会阻塞 HTML 解析，但会在 **DOM 解析完成以后、DOMContentLoaded 事件触发之前执行**。[相关知识](<../J-基于Chrome浏览器渲染原理.md>)

所以更准确的表述是：

**DOMContentLoaded 表示 DOM 已经构建完成，并且需要在该事件之前完成的脚本已经按照相应规则处理；但不能简单理解为页面中的所有 JavaScript 都已经全部执行完成。**

同时，`DOMContentLoaded` 并不要求页面所有外部资源都已经加载完成。

例如图片、iframe、视频和音频等资源，此时可能仍然处于加载过程中；文档也说明，此时不保证所有 CSS 和字体资源都已经全部加载完成。[相关知识](<../J-基于Chrome浏览器渲染原理.md>)

因此：

**DOMContentLoaded 主要表示“DOM 已就绪”，而不是“整个页面已经全部加载完成”。**

同时它也不能直接作为 CSSOM、Render Tree 或整个渲染流程是否完成的判断标准。它关注的是 HTML 解析和 DOM 构建这一阶段。

而 `load` 事件触发得更晚。

当页面中的 **所有资源都已经加载完成以后**，浏览器才会触发 `load`。根据文档，其中包括 HTML、CSS、JavaScript、图片、字体、iframe，以及视频、音频等资源。[相关知识](<../J-基于Chrome浏览器渲染原理.md>)

因此二者的典型使用场景也不同。

如果只是需要访问 DOM、绑定事件或者初始化页面逻辑，一般关注 `DOMContentLoaded`。

如果逻辑依赖图片真实尺寸、iframe 内容或者整个页面的所有资源都已经准备完成，则更适合使用 `load`。[相关知识](<../J-基于Chrome浏览器渲染原理.md>) [相关知识](<../J-基于Chrome浏览器渲染原理.md>)

最终可以总结为：

**`DOMContentLoaded`：HTML 解析完成，DOM 树构建完成，可以安全操作 DOM，但不等待图片、iframe 等全部外部资源。**

**`load`：DOM 已经完成，并且页面中的 CSS、JavaScript、图片、字体、iframe 等所有资源都已经加载完成。**

面试时最简洁的一句话就是：

> **DOMContentLoaded 看 DOM 是否就绪，load 看整个页面资源是否全部加载完成。**

