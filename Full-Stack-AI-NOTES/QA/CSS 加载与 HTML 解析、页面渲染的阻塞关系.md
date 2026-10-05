# CSS 加载与 HTML 解析、页面渲染的阻塞关系

## 【知识概述】

**CSS 的下载本身通常不直接阻塞 HTML 解析，但符合条件的样式表会阻塞渲染；它还可能通过脚本对样式的依赖间接影响解析进度。**

CSS **不会阻塞 DOM 树的构建，但是会阻塞页面渲染**。

浏览器解析 HTML 时，如果遇到外部 CSS，会同时下载并解析 CSS，因此 HTML 解析本身仍然可以继续进行，DOM 树也可以继续构建。

但是 CSS 需要解析形成 CSSOM，而后续的 Render Tree 是由 **DOM 和 CSSOM 共同生成的**。在 CSSOM 没有构建完成之前，浏览器还无法确定 DOM 节点最终应该应用什么样式，因此无法完成 Render Tree 的构建，也就不能继续进行后面的 Layout、Paint 等渲染过程。[相关知识](<../J-基于Chrome浏览器渲染原理.md>)

**CSS 不阻塞 HTML 解析和 DOM 构建，但会阻塞 Render Tree 的生成以及页面绘制。**

即使 `index.css` 下载得很慢，浏览器仍然可以继续解析 `<body>` 和 `<div>`，构建 DOM；但是此时浏览器还不能确定 `Hello` 最终的颜色、字体、大小、布局等样式，因此需要等待 CSSOM 准备好，再结合 DOM 生成 Render Tree，之后才能完成后续渲染。[相关知识](<../J-基于Chrome浏览器渲染原理.md>)

理解这组机制，可以沿以下主线展开：

先把构建 DOM 与计算样式、绘制页面区分开。

用慢速外部样式表说明 HTML 能继续解析而首屏可能等待样式

再把普通脚本读取样式的情形放回流程，解释 CSS、脚本和解析之间的依赖。

并非所有 CSS 都必然阻塞所有渲染，媒体条件、引入位置和加载方式会影响行为；不能据此断言 CSS 永远不会间接阻塞解析。相关完整知识可结合 [基于Chrome浏览器渲染原理](<../J-基于Chrome浏览器渲染原理.md>) 阅读。

以下加载案例主要讨论文档中用于首屏、媒体条件匹配的外部样式表。后续普通脚本可能等待它们，这会使解析间接等待 CSS；这个依赖与样式表下载直接阻塞解析并不是同一件事。

## 1. 机制示例

这些片段展示当前主题需要解释的操作、数据关系或请求路径。判断时应关注前后的依赖和边界，后续机制说明给出对应原因。

```html
<head>
  <link rel="stylesheet" href="index.css">
</head>

<body>
  <div>Hello</div>
</body>
```

## 2. 机制说明与工程判断

按照下面三个层次回答最清楚：
### 【CSS 不会阻塞 DOM 构建】

- HTML 解析器仍然可以继续解析 HTML、构建 DOM。
- CSS 的下载和解析可以与 HTML 解析并行进行。
### 【CSS 会阻塞页面渲染】

- CSS 需要先解析形成 CSSOM。
- Render Tree 的生成依赖 **DOM + CSSOM**。
- CSSOM 没有准备好时，浏览器无法确定元素最终样式，因此不能完成 Render Tree 和后续绘制。
### 【核心关系】

- CSS 不阻塞：`HTML → DOM`
- CSS 会阻塞：`DOM + CSSOM → Render Tree → Paint`

其关系可以概括为：CSS 不阻塞 DOM 构建，但会阻塞 Render Tree 和页面绘制。[相关知识](<../J-基于Chrome浏览器渲染原理.md>)

## 3. 完整回答与表达组织

CSS **不会阻塞 DOM 树的构建，但是会阻塞页面渲染**。

浏览器解析 HTML 时，如果遇到外部 CSS，会同时下载并解析 CSS，因此 HTML 解析本身仍然可以继续进行，DOM 树也可以继续构建。

但是 CSS 需要解析形成 CSSOM，而后续的 Render Tree 是由 **DOM 和 CSSOM 共同生成的**。在 CSSOM 没有构建完成之前，浏览器还无法确定 DOM 节点最终应该应用什么样式，因此无法完成 Render Tree 的构建，也就不能继续进行后面的 Layout、Paint 等渲染过程。[相关知识](<../J-基于Chrome浏览器渲染原理.md>)

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

即使 `index.css` 下载得很慢，浏览器仍然可以继续解析 `<body>` 和 `<div>`，构建 DOM；但是此时浏览器还不能确定 `Hello` 最终的颜色、字体、大小、布局等样式，因此需要等待 CSSOM 准备好，再结合 DOM 生成 Render Tree，之后才能完成后续渲染。[相关知识](<../J-基于Chrome浏览器渲染原理.md>)

