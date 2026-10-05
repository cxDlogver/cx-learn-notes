# 经典脚本、async 与 defer 的加载和执行时机

## 【知识概述】

**脚本加载属性主要改变下载与执行时机；判断是否阻塞解析、是否保序和是否影响 DOMContentLoaded，需要把这三个维度分开。**

JavaScript 会影响 HTML 的解析，核心原因是 **JavaScript 可以直接读取和修改 DOM 和 CSSOM，而 HTML 解析和 JavaScript 执行又都需要渲染进程主线程参与**。

所以浏览器在解析 HTML 时，如果遇到一个没有设置 `async` 或 `defer` 的普通 `<script>`：

会暂停当前 HTML 的解析，等待 JavaScript 准备并执行完成以后，再继续向后解析 HTML、构建 DOM。文档对此的描述也是：普通阻塞脚本会“暂停 HTML 解析，等待脚本下载并执行完成后，再继续解析 HTML”。[相关知识](<../J-基于Chrome浏览器渲染原理.md>)

这里还需要把 **CSSOM、JavaScript 和 DOM 三者之间的关系**说清楚。

CSS 本身不会阻塞 HTML 解析，所以浏览器可以一边继续解析 HTML、构建 DOM，一边下载和解析 CSS、构建 CSSOM。但是 CSS 会影响 JavaScript 的执行，因为 JavaScript 可能读取元素最终的计算样式。如果在一个普通脚本之前已经存在尚未加载完成、会阻塞脚本的样式表，那么浏览器需要等待相关样式表准备好，再执行这个普通脚本。HTML 标准专门定义了“script-blocking style sheet”这一机制。[[1]](https://html.spec.whatwg.org/multipage/semantics.html)

理解这组机制，可以沿以下主线展开：

先说明普通解析器插入的经典脚本为何暂停 HTML 解析。

再比较 async 下载后尽快执行与 defer 等待解析完成并保持文档顺序的行为。

最后把脚本执行、DOM 可用性和页面事件放进同一时间线。

这些结论主要针对相应的外部经典脚本；模块脚本默认具有类似延后的行为，动态插入脚本也需要单独判断。相关完整知识可结合 [基于Chrome浏览器渲染原理](<../J-基于Chrome浏览器渲染原理.md>) 阅读。

## 1. 机制示例

这些片段展示当前主题需要解释的操作、数据关系或请求路径。判断时应关注前后的依赖和边界，后续机制说明给出对应原因。

```html
<script src="a.js"></script>

<script async src="b.js"></script>

<script defer src="c.js"></script>
```

## 2. 机制说明与工程判断

按照 **“JS 为什么阻塞 DOM → CSSOM 与 JS 的关系 → 三类脚本区别 → 使用场景”** 的顺序回答。
### 【JavaScript 为什么会阻塞 DOM 解析】

- JavaScript 可以读取和修改 DOM、CSSOM。
- HTML 解析与 JavaScript 执行都涉及渲染进程主线程。
- 因此普通脚本执行时，HTML 解析器会暂停，等 JS 执行结束后再继续构建 DOM。文档也明确指出，普通 `<script>` 会暂停 HTML 解析。[相关知识](<../J-基于Chrome浏览器渲染原理.md>)
### 【CSSOM 与 JavaScript 的阻塞关系】

- CSS 的下载和 CSSOM 构建本身不会阻塞 HTML 继续解析。
- 但是对于前面已经发现、会阻塞脚本执行的样式表，普通解析阻塞脚本通常需要等待相关 CSS 样式准备好再执行，因为 JS 可能读取元素的计算样式。
- 因此常见依赖链可以理解为：  
  **CSSOM 未准备好 → JS 等待执行 → JS 未执行完 → DOM 解析继续等待。**  
  MDN 也明确说明，CSS 不阻塞 HTML 解析，但会阻塞需要依赖它的 JavaScript 执行。[[2]](https://developer.mozilla.org/en-US/docs/Web/Performance/Guides/How_browsers_work)
### 【普通 `<script>`】

- 浏览器解析到脚本时暂停 HTML 解析。
- 等脚本资源准备好，并等待前面阻塞脚本执行的 CSS。
- 执行 JS。
- JS 执行结束后继续解析 HTML。
- 因此普通脚本是典型的 **解析阻塞脚本**。[[3]](https://html.spec.whatwg.org/multipage/scripting.html)
### 【`async`】

- JS 文件与 HTML 解析并行下载。
- 下载期间不阻塞 DOM 构建，也不会停止 CSSOM 自己的构建过程。
- 文件准备好后尽快执行，执行时可能打断当前 HTML 解析。
- 多个 `async` 不保证执行顺序。[[4]](https://html.spec.whatwg.org/dev/scripting.html)
- 因此更适合**不依赖完整 DOM、不依赖其他脚本执行顺序**的独立脚本，例如统计、埋点、广告等。
### 【`defer`】

- JS 文件与 HTML 解析并行下载。
- 下载期间不阻塞 DOM 构建。
- 等整个 HTML 解析完成后再执行。
- 多个 `defer` 脚本按照文档中的顺序执行。
- 并且在 `DOMContentLoaded` 事件之前执行。[相关知识](<../J-基于Chrome浏览器渲染原理.md>) [[5]](https://html.spec.whatwg.org/multipage/parsing.html)
- 因此更适合**依赖 DOM 结构、并且要求脚本执行顺序**的业务代码。

## 3. 完整回答与表达组织

JavaScript 会影响 HTML 的解析，核心原因是 **JavaScript 可以直接读取和修改 DOM 和 CSSOM，而 HTML 解析和 JavaScript 执行又都需要渲染进程主线程参与**。

所以浏览器在解析 HTML 时，如果遇到一个没有设置 `async` 或 `defer` 的普通 `<script>`：

```html
<script src="app.js"></script>
```

会暂停当前 HTML 的解析，等待 JavaScript 准备并执行完成以后，再继续向后解析 HTML、构建 DOM。文档对此的描述也是：普通阻塞脚本会“暂停 HTML 解析，等待脚本下载并执行完成后，再继续解析 HTML”。[相关知识](<../J-基于Chrome浏览器渲染原理.md>)

这里还需要把 **CSSOM、JavaScript 和 DOM 三者之间的关系**说清楚。

CSS 本身不会阻塞 HTML 解析，所以浏览器可以一边继续解析 HTML、构建 DOM，一边下载和解析 CSS、构建 CSSOM。但是 CSS 会影响 JavaScript 的执行，因为 JavaScript 可能读取元素最终的计算样式。如果在一个普通脚本之前已经存在尚未加载完成、会阻塞脚本的样式表，那么浏览器需要等待相关样式表准备好，再执行这个普通脚本。HTML 标准专门定义了“script-blocking style sheet”这一机制。[[1]](https://html.spec.whatwg.org/multipage/semantics.html)

因此对于普通脚本，可以形成这样一条典型的阻塞链：

**等待 CSS → CSSOM/样式准备完成 → 执行 JavaScript → JavaScript 执行结束 → HTML 继续解析 → DOM 继续构建。**

也就是说：

**CSS 通常不直接阻塞 DOM 解析，但它可以通过阻塞普通 JS 的执行，间接延长 DOM 解析被暂停的时间。** [[2]](https://developer.mozilla.org/en-US/docs/Web/Performance/Guides/How_browsers_work)

对于三种脚本，可以分别理解。

普通 `script`：

```html
<script src="a.js"></script>
```

浏览器遇到它以后会暂停 HTML 解析。脚本准备好并满足执行条件后立即执行，执行完成以后再继续解析 HTML。所以它会直接阻塞 DOM 树的继续构建。[[4]](https://html.spec.whatwg.org/dev/scripting.html)

`async`：

```html
<script async src="b.js"></script>
```

`async` 脚本的**下载过程与 HTML 解析并行进行**，因此下载期间不会阻塞 DOM 的构建；CSS 也可以继续独立下载和构建 CSSOM。

但 `async` 脚本一旦准备好，就会尽快执行，因此可能在 DOM 还没有解析完成时执行，并打断当前 HTML 解析过程。[相关知识](<../J-基于Chrome浏览器渲染原理.md>)

这意味着，如果一个 `async` 脚本直接依赖页面后面尚未解析出来的 DOM 元素，或者依赖其他脚本已经执行，就可能出现问题。

因此不能简单说“操作 DOM 就绝对不能用 async”，更准确的说法是：

**如果脚本依赖完整 DOM、特定 DOM 节点已经存在，或者依赖其他脚本的执行顺序，一般不适合使用 `async`。**

`async` 更适合相对独立的脚本，例如统计、埋点、广告等。多个 `async` 脚本也是谁先准备好谁就可能先执行，不保证 HTML 中的声明顺序。[[4]](https://html.spec.whatwg.org/dev/scripting.html)

而 `defer`：

```html
<script defer src="c.js"></script>
```

同样会和 HTML 解析并行下载，因此下载过程不会阻塞 DOM 构建。但是它不会在下载完成后立即执行，而是等 **HTML 文档解析完成以后再执行**。多个 `defer` 脚本按照文档顺序执行，并且都会在 `DOMContentLoaded` 触发之前完成。[相关知识](<../J-基于Chrome浏览器渲染原理.md>) [[5]](https://html.spec.whatwg.org/multipage/parsing.html)

因此三者可以最终收敛为：

**普通 script：下载/执行会造成解析阻塞，执行前还可能等待前面的阻塞样式表。**

**async：并行下载，准备好就尽快执行，执行时可能打断 DOM 解析，不保证脚本顺序，适合独立脚本。**

**defer：并行下载，DOM 解析完成后按顺序执行，DOMContentLoaded 之前执行，适合依赖 DOM 和执行顺序的业务脚本。**

## 4. 参考文献

[1] [HTML Living Standard](<https://html.spec.whatwg.org/multipage/semantics.html>)[EB/OL].

[2] [Populating the page: how browsers work - Performance | MDN](<https://developer.mozilla.org/en-US/docs/Web/Performance/Guides/How_browsers_work>)[EB/OL].

[3] [HTML Standard](<https://html.spec.whatwg.org/multipage/scripting.html>)[EB/OL].

[4] [HTML Living Standard](<https://html.spec.whatwg.org/dev/scripting.html>)[EB/OL].

[5] [HTML Living Standard](<https://html.spec.whatwg.org/multipage/parsing.html>)[EB/OL].
