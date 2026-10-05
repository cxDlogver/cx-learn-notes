# Vue 模板编译、VNode 与响应式渲染更新

## 【知识概述】

**Vue 编译器把模板转换为渲染函数，运行时根据状态生成 VNode 并挂载或更新 DOM；响应式系统负责触发更新，渲染系统负责落实变化。**

**响应式数据变化以后，让对应视图自动更新，并且尽量减少不必要的真实 DOM 操作。**

Vue 官方本身也把整体渲染管线概括为 `Compile → Mount → Patch`。[[1]](https://vuejs.org/guide/extras/rendering-mechanism)

浏览器不会自己理解“读取响应式 name，以后 name 变化自动重新更新这个文本”这样的 Vue 语义。

[[1]](https://vuejs.org/guide/extras/rendering-mechanism)

AST 就是抽象语法树，它把原本的字符串模板变成编译器能够遍历和分析的数据结构。

理解这组机制，可以沿以下主线展开：

先沿模板、AST、渲染函数解释编译

首次 render 建立 VNode 和响应式依赖，再挂载真实 DOM

数据改变后通过调度重新 render，并以 patch 结合编译信息减少不必要操作。

模板编译可在构建阶段完成，虚拟 DOM 不保证所有场景更快；Vue2 与 Vue3 的优化和 diff 实现需要分版本说明。相关完整知识可结合 [Vue3进阶学习](<../V-Vue3进阶学习.md>) 阅读。

## 1. 机制说明与工程判断

### 【Vue 的核心目标】

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

这与 Vue 官方给出的 `Compile → Mount → Patch` 渲染管线一致。[[1]](https://vuejs.org/guide/extras/rendering-mechanism)
### 【为什么需要编译】

更准确的说法不是单纯“浏览器只认识 HTML/CSS/JS”，而是：

> Vue 模板中存在 `{{ }}`、`v-if`、`v-for`、`v-bind`、`v-on` 等 Vue 特有的声明式语义，浏览器本身不会把它们转换成 Vue 的响应式 DOM 更新逻辑，所以 Vue 编译器需要把模板转换成可执行的 JavaScript `render` 函数。

Vue 官方明确说明：Vue template 最终会被编译成返回 Virtual DOM Tree 的 render function。[[1]](https://vuejs.org/guide/extras/rendering-mechanism)
### 【编译阶段】

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

Vue2 官方源码中的 `baseCompile()` 就是依次执行 `parse()`、`optimize()`、`generate()`。[[2]](https://raw.githubusercontent.com/vuejs/vue/v2.7.16/src/compiler/index.ts)

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

所以对于 Vue3，不应该把“标记静态节点”单独说成固定的第二阶段；它属于 `transform` 过程中进行的编译分析和优化。Vue3 当前 `compiler-core` 源码的 `baseCompile()` 就是 `baseParse → transform → generate`。[[3]](https://github.com/vuejs/core/blob/main/packages/compiler-core/src/compile.ts)
### 【Render 与依赖收集】

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

以后这些数据变化，就可以重新调度这个组件的 render effect。[[1]](https://vuejs.org/guide/extras/rendering-mechanism)
### 【首次挂载与后续更新】

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

Vue 官方将遍历比较两棵 VDOM 树并将必要变化应用到 DOM 的过程称为 `patch`，也称 diffing / reconciliation。[[1]](https://vuejs.org/guide/extras/rendering-mechanism)
### 【Diff 的基本思想】

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

Vue3 当前源码判断两个 VNode 类型是否相同时，核心条件就是 `type` 与 `key` 都一致。[[4]](https://github.com/vuejs/core/blob/main/packages/runtime-core/src/vnode.ts)
### 【Vue2 子节点 Diff】

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

这正是 Vue2 `updateChildren()` 的实际实现。[[5]](https://github.com/vuejs/vue/blob/v2.7.16/src/core/vdom/patch.ts)
### 【key】

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

Vue 官方也明确将 `key` 定义为 Diff 新旧节点列表时用于识别 VNode 的提示。[[6]](https://vuejs.org/api/built-in-special-attributes.html)
### 【批量更新与 nextTick】

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

所以比“在事件循环尾执行一个回调”这个说法更准确。[[7]](https://vuejs.org/api/general.html)

## 2. 完整回答与表达组织

Vue 的模板渲染机制需要从数据变化与视图更新的关系开始理解。

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

Vue 官方本身也把整体渲染管线概括为 `Compile → Mount → Patch`。[[1]](https://vuejs.org/guide/extras/rendering-mechanism)
### 【模板编译】

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

[[1]](https://vuejs.org/guide/extras/rendering-mechanism)

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

Vue2 官方源码就是严格按 `parse → optimize → generate` 执行的。[[2]](https://raw.githubusercontent.com/vuejs/vue/v2.7.16/src/compiler/index.ts)

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

静态分析、PatchFlag、Block 等优化信息是在编译过程中产生的。[[3]](https://github.com/vuejs/core/blob/main/packages/compiler-core/src/compile.ts)

---
### 【render 执行、依赖收集和首次挂载】

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

Vue 官方将 VNode 描述为表示真实元素的普通 JavaScript 对象。[[1]](https://vuejs.org/guide/extras/rendering-mechanism)

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

Vue 官方的 Render Pipeline 也明确说明：mount 阶段会作为 reactive effect 执行，从而追踪 render 过程中使用到的所有响应式依赖。[[1]](https://vuejs.org/guide/extras/rendering-mechanism)

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
### 【数据更新、Patch 和 Diff】

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

[[1]](https://vuejs.org/guide/extras/rendering-mechanism)

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

[[4]](https://github.com/vuejs/core/blob/main/packages/runtime-core/src/vnode.ts)

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
#### <u>1. Vue2 的 children Diff</u>

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

这就是 Vue2 `updateChildren()` 的实际算法。[[5]](https://github.com/vuejs/vue/blob/v2.7.16/src/core/vdom/patch.ts)

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

因为列表插入、删除、排序以后，`index` 对应的业务对象可能已经发生变化。Vue 官方也明确将 `key` 定义为帮助 VDOM 算法在新旧列表 Diff 时识别 VNode 的提示。[[6]](https://vuejs.org/api/built-in-special-attributes.html)

---
### 【批量更新，以及 Vue3 为什么更快】

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

Vue 官方明确说明 DOM 更新并不是同步应用，而是会缓存到 next tick，保证一个组件即使发生多次状态变化，也尽可能只更新一次。[[7]](https://vuejs.org/api/general.html)

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

> Compiler-Informed Virtual DOM。[[1]](https://vuejs.org/guide/extras/rendering-mechanism)

最重要可以记三个。
#### <u>1. 第一，静态缓存 / 静态提升</u>

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

Vue 当前官方文档称这一优化为 **Cache Static**；面试里也经常称“静态提升”。[[1]](https://vuejs.org/guide/extras/rendering-mechanism)
#### <u>2. 第二，PatchFlag</u>

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

[[1]](https://vuejs.org/guide/extras/rendering-mechanism)
#### <u>3. 第三，Block Tree / Tree Flattening</u>

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

Vue 官方把这种将动态后代打平成数组的优化称为 **Tree Flattening**。[[1]](https://vuejs.org/guide/extras/rendering-mechanism)

另外 Vue3 的 keyed children Diff 本身也改变了。它不再沿用 Vue2 那套完整的四次双端比较，而是先同步相同前缀、后缀，再处理未知中间序列；在需要移动节点时，会构建 key 映射，并通过**最长递增子序列**保留已经处于相对正确顺序的节点，从而减少真实 DOM 移动。Vue3 当前 Renderer 源码中可以直接看到 `keyToNewIndexMap`、`newIndexToOldIndexMap` 以及 `getSequence()`。[[8]](https://raw.githubusercontent.com/vuejs/core/main/packages/runtime-core/src/renderer.ts)

---
### 【最终面试收敛回答】

> **Vue 的完整渲染过程可以从“响应式系统 + 渲染系统”两部分理解。响应式系统负责在数据变化时确定哪个组件需要更新，渲染系统负责通过 VNode、Diff 和 Patch 尽量只修改必要的真实 DOM。首先 Vue 会把 template 编译成 render function。Vue2 的编译可以概括成 `parse → optimize → generate`：先把模板解析成 AST，再进行静态节点优化，最后生成 render；Vue3 更准确是 `parse → transform → generate`，各种指令转换和静态、动态分析主要发生在 transform 阶段。** [[2]](https://raw.githubusercontent.com/vuejs/vue/v2.7.16/src/compiler/index.ts)
>
> **编译完成以后执行 render，render 根据当前数据生成 VNode Tree。VNode 是描述目标 UI 的 JavaScript 对象。组件首次 render 会作为响应式 effect 执行，因此执行过程中读取响应式数据时会完成依赖追踪。第一次没有旧 VNode，所以 Renderer 直接根据 VNode Tree 创建真实 DOM 并挂载到页面。后续响应式数据变化以后，对应的 render effect 会重新运行，生成新的 VNode Tree，再和旧 VNode Tree 进行 patch。Patch 会判断节点是否可以复用，如果节点身份不同就卸载旧子树并挂载新子树；可以复用则继续更新 props、文本和 children。** [[1]](https://vuejs.org/guide/extras/rendering-mechanism)
>
> **children Diff 中，Vue2 使用经典双端比较，同时维护新旧 children 的首尾指针，依次比较旧头新头、旧尾新尾、旧头新尾、旧尾新头；都无法匹配时再通过 key 查找旧节点。key 的本质是标识 VNode 的稳定身份，而不仅仅是性能优化，因此动态列表通常应该使用稳定的业务 ID。Vue3 的 keyed Diff 则进一步采用前后相同序列同步、key 映射以及最长递增子序列等方式减少节点移动。** [[5]](https://github.com/vuejs/vue/blob/v2.7.16/src/core/vdom/patch.ts)
>
> **Vue3 进一步利用编译器和运行时协同优化：静态缓存/静态提升让不会变化的节点无需每次重新创建；PatchFlag 告诉运行时一个动态节点具体哪部分可能变化；Block Tree / Tree Flattening 则记录真正的动态后代，使 Renderer 不必每次完整遍历整棵 VNode Tree。最后，响应式状态变化也不会每次立即同步修改 DOM，Vue 会批量调度更新，`nextTick()` 的作用就是等待当前这一批 DOM 更新完成。整个流程最终可以收敛成：`template → compile → render → VNode → mount → 数据变化 → render → new VNode → patch/diff → DOM`。** [[1]](https://vuejs.org/guide/extras/rendering-mechanism)

## 3. 参考文献

[1] [Rendering Mechanism | Vue.js](<https://vuejs.org/guide/extras/rendering-mechanism>)[EB/OL].

[2] [raw.githubusercontent.com](<https://raw.githubusercontent.com/vuejs/vue/v2.7.16/src/compiler/index.ts>)[EB/OL].

[3] [core/packages/compiler-core/src/compile.ts at main · vuejs/core · GitHub](<https://github.com/vuejs/core/blob/main/packages/compiler-core/src/compile.ts>)[EB/OL].

[4] [GitHub](<https://github.com/vuejs/core/blob/main/packages/runtime-core/src/vnode.ts>)[EB/OL].

[5] [GitHub](<https://github.com/vuejs/vue/blob/v2.7.16/src/core/vdom/patch.ts>)[EB/OL].

[6] [Vue.js](<https://vuejs.org/api/built-in-special-attributes.html>)[EB/OL].

[7] [Vue.js](<https://vuejs.org/api/general.html>)[EB/OL].

[8] [GitHub](<https://raw.githubusercontent.com/vuejs/core/main/packages/runtime-core/src/renderer.ts>)[EB/OL].
