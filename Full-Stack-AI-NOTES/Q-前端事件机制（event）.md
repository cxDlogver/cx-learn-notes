---
title: 7.前端事件机制（event）
tags: 前端面试题
categories:
  - 前端面试
date: 2025-12-24 02:07:32
---

1. 如何描述JavaScript DOM？
2. 如何描述JavaScript的事件？
3. JS事件绑定方式有哪些，事件对象是什么，它的常用属性有哪些？
4. 如何理解事件冒泡和事件委托？
5. 如何自定义一个JS事件？
6. 如何描述Vue的事件监听机制？

<!--more-->

## 前端的事件机制（event)

> [JavaScript DOM / event](https://cxdlogver.github.io/2025/08/04/前端学习/JavaScript核心总结/#JavaScript-DOM)

### 1. JavaScript DOM

DOM（Document Object Model，文档对象模型）是 **Web API 的一部分**，用于将 HTML 页面以一种**树形结构**的方式抽象成对象模型。简单来说，DOM 会把整个页面结构“对象化”，页面中的**标签、文本、注释等都会被表示为节点（Node）**，共同组成一棵 DOM 树。

在 DOM 中，**`document` 对象表示整个页面**，它是 JavaScript 访问和操作页面的入口。浏览器会将 HTML 文档解析后，封装成一个 `document` 对象，通过它可以获取页面中的任意节点，同时也可以访问页面的 URL、域名等信息。

通过 `document` 对象，可以使用多种方式获取页面中的元素节点，例如：

- `getElementById`
- `getElementsByClassName`
- `getElementsByTagName`
- `querySelector` / `querySelectorAll`

这些方法最终都会返回**一个节点或节点集合（元素对象）**。

每一个元素对象在 DOM 树中都对应一个节点，它既是树结构中的一个成员，也可以作为操作起点，对与之相关的其他节点进行操作。例如，可以获取其父节点、子节点、兄弟节点，也可以在 DOM 树中插入新节点或删除已有节点。

除了结构操作之外，DOM 还支持对节点内容和表现形式的修改，包括但不限于：

- 修改文本内容
- 修改属性
- 修改样式
- 动态增删节点

其中，**事件机制是 DOM 设计的核心功能之一**。DOM 的设计初衷就是让网页能够与用户产生动态交互，而这种交互正是通过事件系统实现的。通过为元素绑定事件监听器，JavaScript 可以在用户点击、输入、滚动等操作发生时执行相应的逻辑，从而实现页面的动态行为。

### 2. JavaScript Event

在 JavaScript 中，事件通过**绑定回调函数**来处理用户的各种操作。当用户在页面上进行点击、输入、移动鼠标等行为时，浏览器会触发相应的事件；一旦事件被触发，与之绑定的**事件监听器**就会调用对应的**回调函数**。因此，事件回调函数也常被称为**事件处理函数或事件响应函数**。

#### 【事件的绑定方式】

JavaScript 中常见的事件绑定方式主要有三种：

1. **通过 HTML 标签的事件属性**（不推荐）

   ```
   <button onclick="handleClick()">点击</button>
   ```

2. **通过元素对象的事件属性**

   ```
   element.onclick = function () {};
   ```

3. **通过 `addEventListener` 绑定事件监听器（推荐）**

   ```
   element.addEventListener('click', function () {});
   ```

其中，`addEventListener` 是最灵活、最规范的方式，支持多个监听器、事件捕获与冒泡控制。

#### 【事件对象（Event Object）】

当事件触发时，浏览器会自动向事件回调函数传入一个参数，这个参数就是**事件对象（event）**。事件对象中包含了与当前事件相关的各种信息。

`Event` 是所有事件对象的基类，在此基础上派生出多种具体事件类型，例如：

- `MouseEvent`：处理鼠标事件（点击、移动、坐标等）
- `KeyboardEvent`：处理键盘事件（按键、键值等）
- `InputEvent`：处理输入相关事件

常用的事件对象属性包括：

- `event.type`：事件类型
- `event.target`：触发事件的元素
- `event.currentTarget`：当前绑定事件的元素
- `event.bubbles`：是否支持冒泡
- `event.cancelable`：是否可以取消默认行为
- `event.timeStamp`：事件发生的时间

#### 【事件传播机制】

要理解事件冒泡和事件委托，首先需要了解**事件传播的三个阶段**：

1. **捕获阶段**
   事件从 `window` 开始，沿着 DOM 树向下传播，直到目标元素。在这一阶段，默认情况下不会触发事件监听器。
2. **目标阶段**
   事件到达目标元素，在目标元素上触发对应的事件监听器。
3. **冒泡阶段**
   事件从目标元素开始，沿着 DOM 树向上传播，直到 `document`，依次触发祖先元素上绑定的事件监听器（如果存在）。

这是“已确定 target 的情况下”才存在的传播路径，

#### 【事件冒泡与事件委托】

事件冒泡的一个重要作用是实现**事件委托**。

事件委托的核心思想是：

> 如果父元素和其多个子元素需要处理同一类事件，可以只在父元素上绑定一次事件监听器，利用事件冒泡统一处理。

例如，在一个包含多个子元素的大容器中，如果希望监听鼠标移动事件：

- 鼠标移动时，事件会先在目标子元素上触发
- 随后通过冒泡传播到父元素
- 父元素即可统一处理该事件

这样做的好处是：

- 不需要为每个子元素单独绑定事件
- 减少代码量
- 降低逻辑复杂度
- **对动态新增的子元素同样有效**

当然，并不是所有事件都适合冒泡。如果某些事件**不希望被祖先元素接收到**，可以通过关闭冒泡或阻止传播来控制。

### 3. 自定义一个JS事件

```js
<div id="outer" style="padding:20px;border:2px solid #999;">
  outer
  <div id="inner" style="margin-top:10px;padding:20px;border:2px solid #666;">
    inner
    <button id="btn">dispatch</button>
  </div>
</div>

<script>
  const outer = document.getElementById("outer");
  const inner = document.getElementById("inner");
  const btn = document.getElementById("btn");

  // 打印工具：你能一眼看到 target/currentTarget 以及处于哪个阶段
  function log(tag) {
    return function (e) {
      const phaseMap = { 1: "capture", 2: "target", 3: "bubble" };
      console.log(
        `[${tag}] phase=${phaseMap[e.eventPhase]} ` +
        `target=#${e.target.id} currentTarget=#${e.currentTarget.id} ` +
        `detail=${JSON.stringify(e.detail)}`
      );
    };
  }

  // 1) 监听器：捕获阶段
  outer.addEventListener("num-threshold", log("outer CAPTURE"), true);
  inner.addEventListener("num-threshold", log("inner CAPTURE"), true);
	// 这里的 true 表示：监听器在「事件捕获阶段」执行。

  // 2) 监听器：冒泡阶段（默认 false）
  outer.addEventListener("num-threshold", log("outer BUBBLE"));
  inner.addEventListener("num-threshold", log("inner BUBBLE"));
  btn.addEventListener("num-threshold", log("btn BUBBLE"));

  // 3) 点击按钮：创建并派发自定义事件
  btn.addEventListener("click", () => {
    const ev = new CustomEvent("num-threshold", {
      detail: { num: 5, threshold: 5 },
      bubbles: true,   // 允许冒泡（否则只有目标阶段）
      cancelable: true // 允许 preventDefault（自定义事件通常用不到，但可演示）
    });

    console.log("---- dispatch start ----");
    btn.dispatchEvent(ev); // 派发到目标：btn
    console.log("---- dispatch end ----");
  });
</script>

```

当你点按钮后，控制台会按顺序输出类似：

1. `outer CAPTURE`（捕获，从外到内）
2. `inner CAPTURE`
3. `btn BUBBLE`（目标阶段：监听器会以 target 触发；eventPhase 显示 target）
4. `inner BUBBLE`（冒泡，从内到外）
5. `outer BUBBLE`

这里最关键的是两点：

- **`event.target` 永远是事件真正发生/派发的目标（btn）**
- **`event.currentTarget` 是当前正在执行监听器的那个元素（outer/inner/btn 会变化）**

------

把它和“派发/监听器过程”对应起来（你要的主线）

1. 创建事件对象(CustomEvent是DOM Level 3 Events 标准的一部分，就叫自定义事件）

```
new CustomEvent("num-threshold", { detail, bubbles })
```

2. 绑定监听器

```
addEventListener("num-threshold", handler, useCapture?)
```

3. 派发事件（关键动作）

```
btn.dispatchEvent(ev)
```

一旦派发，浏览器就会根据 DOM 树生成路径，并按阶段执行监听器：

- **捕获阶段**：window → … → outer → inner
- **目标阶段**：btn
- **冒泡阶段**：inner → outer → … → document（前提：`bubbles: true`）

### 4. Vue 事件监听机制

Vue 的事件系统并不是一套“新的事件模型”，而是**对原生 DOM 事件机制的封装与语法抽象**。
 其核心目标是：**在不改变事件本质的前提下，降低事件绑定、传播控制和逻辑组织的复杂度**。

#### 【Vue 中的事件监听方式】

Vue 使用 `v-on` 指令（简写为 `@`）来监听事件：

```js
<button @click="handleClick">点击</button>
```

从本质上看，这一写法等价于：

```js
element.addEventListener("click", handleClick);
```

不同之处在于：

- 事件绑定由 Vue 在 **组件挂载阶段** 自动完成
- 回调函数默认绑定到当前组件实例（`this` 指向组件）

#### 【Vue 事件与原生 JS 事件】

> Vue 事件 ≠ 自定义事件系统
>
> Vue 事件 = 原生 DOM 事件 + 语法层封装

具体体现在：

1. **事件触发来源**

   - Vue 的 DOM 事件最终仍由浏览器触发
   - Vue 不接管浏览器的事件派发过程

2. **事件对象**

   - Vue 事件回调中接收到的 `$event` 本质就是原生 `Event` 对象

   ```html
   <button @click="handleClick($event)">点击</button>
   ```

   ```js
   methods: {
     handleClick(e) {
       console.log(e instanceof Event); // true
     }
   }
   ```

3. **事件传播机制**

   - 捕获 → 目标 → 冒泡
   - 完全遵循 DOM 标准事件流



从 JS 视角看，Vue 事件修饰符本质是：**把“事件控制逻辑”从回调函数中前移到模板声明层**

对比：

```js
// 原生 JS
function handleClick(e) {
  e.stopPropagation();
  e.preventDefault();
}
<!-- Vue -->
<button @click.stop.prevent="handleClick"></button>
```

带来的好处：

- 事件行为一眼可见
- 减少样板代码
- 事件控制语义化
- 更利于模板阅读与维护

Vue 事件 vs JS 事件对照总结

| 对比点   | 原生 JS 事件     | Vue DOM 事件    |
| -------- | ---------------- | --------------- |
| 触发来源 | 浏览器           | 浏览器          |
| 事件对象 | Event            | Event（$event） |
| 传播机制 | 捕获/冒泡        | 完全一致        |
| 绑定方式 | addEventListener | v-on / @        |
| 事件控制 | 手动调用 API     | 修饰符声明      |
| 组件通信 | 不支持           | `$emit`         |

#### 【Vue 事件修饰符】

事件修饰符是 Vue 对**事件传播控制与默认行为控制**的语法级抽象。

 `.stop` —— 阻止冒泡

```
<button @click.stop="handleClick">点击</button>
```

等价原生写法：

```js
element.addEventListener("click", (e) => {
  e.stopPropagation();
});
```

`.prevent` —— 阻止默认行为

```
<a href="#" @click.prevent="handleClick">链接</a>
```

等价原生写法：

```js
e.preventDefault();
```

`.stop.prevent` —— 组合修饰符

```js
<form @submit.stop.prevent="submitForm"></form>
```

等价于：

```js
e.stopPropagation();
e.preventDefault();
```

`.capture` —— 捕获阶段监听

```
<div @click.capture="handleClick"></div>
```

等价于：

```js
addEventListener("click", handler, true);
```

这与 JS 中 `addEventListener(type, handler, true)` 的含义完全一致。

`.once` —— 只执行一次

```
<button @click.once="handleClick"></button>
```

等价原生写法：

```js
addEventListener("click", handler, { once: true });
```

`.self` —— 只响应自身触发

```
<div @click.self="handleClick"></div>
```

逻辑等价于：

```js
if (e.target === e.currentTarget) {
  handleClick();
}
```

常用于防止事件委托误触。
