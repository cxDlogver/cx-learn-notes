# Vue2 与 Vue3 的响应式依赖收集和更新通知

## 【知识概述】

**Vue 响应式把数据读取与更新逻辑建立依赖关系，在写入时通知相关逻辑；表单双向绑定还包含用户事件到数据赋值的另一条链路。**

也就是数据变化时视图自动更新，用户修改视图时数据也能够同步更新。

不过 Vue 并不是严格意义上的标准 MVVM 实现，更准确地说是它的设计受到 MVVM 思想影响。[[1]](https://v2.vuejs.org/v2/guide/instance)

在 Vue 中，“双向同步”实际上可以拆成两个方向。

**View → Model 主要依赖 DOM 事件监听和赋值，Vue 的 `v-model` 只是帮我们把属性绑定和事件处理封装起来。**

Vue 官方文档也明确说明，原生表单上的 `v-model` 会展开成相应的 DOM property 和事件，例如文本输入框对应 `value + input`。[[2]](https://vuejs.org/guide/essentials/forms.html)

理解这组机制，可以沿以下主线展开：

先拆开数据驱动视图与输入事件更新数据。

解释 Vue2 的 getter、setter、Dep、Watcher 如何记录依赖。

再对比 Vue3 Proxy、ref 及 track、trigger 的拦截与通知机制。

Vue3 并非所有数据都靠 Proxy，例如 ref 有自己的访问机制；解构、原始对象和异步更新也有使用边界。相关完整知识可结合 [Vue3进阶学习](<../V-Vue3进阶学习.md>) 阅读。

## 1. 机制说明与工程判断

### 【先从 MVVM 理解 Vue 要解决什么问题】

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

> Vue 的设计受到 MVVM 启发，但 Vue 官方并没有把 Vue 严格定义为一个标准 MVVM 框架。Vue2 官方文档也明确使用了“受 MVVM 启发，而不是严格与 MVVM 关联”的表述。[[1]](https://v2.vuejs.org/v2/guide/instance)

---
### 【“双向绑定”实际上是两条不同链路】

#### <u>1. View → Model</u>

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

Vue 的 `v-model` 帮我们把这套代码封装成了声明式语法。Vue 官方文档也是这样解释 `v-model` 的。[[3]](https://vuejs.org/guide/components/v-model.html)
#### <u>2. Model → View</u>

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
### 【Vue 响应式的统一原理】

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

## 2. 完整回答与表达组织

Vue 的响应式机制可以从 MVVM 的数据流开始理解。

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

不过 Vue 并不是严格意义上的标准 MVVM 实现，更准确地说是它的设计受到 MVVM 思想影响。[[1]](https://v2.vuejs.org/v2/guide/instance)

在 Vue 中，“双向同步”实际上可以拆成两个方向。
### 【View → Model：本质是事件监听】

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

Vue 官方文档也明确说明，原生表单上的 `v-model` 会展开成相应的 DOM property 和事件，例如文本输入框对应 `value + input`。[[2]](https://vuejs.org/guide/essentials/forms.html)

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
### 【Vue2：`Object.defineProperty + Dep + Watcher`】

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

Vue2 官方文档描述的也是这个过程：组件渲染时会有对应的 watcher，它记录渲染过程中访问到的响应式属性；之后这些属性的 setter 被触发时，会通知 watcher，使组件重新渲染。[[4]](https://v2.vuejs.org/v2/guide/reactivity.html)

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
### 【为什么 Vue2 有响应式局限？】

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

来显式处理这种情况。[[4]](https://v2.vuejs.org/v2/guide/reactivity.html)

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

[[4]](https://v2.vuejs.org/v2/guide/reactivity.html)

---
### 【Vue3：`Proxy + track + trigger + effect`】

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

Vue 官方文档明确说明，`reactive()` 返回的是原对象的 Proxy。[[5]](https://vuejs.org/api/reactivity-core.html)

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

Vue 官方对 Vue3 响应式的伪代码也正是 `Proxy get → track`、`Proxy set → trigger` 这一结构。[[6]](https://vuejs.org/guide/extras/reactivity-in-depth.html?m=o&u=t)

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
### 【Vue3 怎么保存依赖：`WeakMap → Map → Set`】

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

Vue 的依赖跟踪本质就是把当前正在运行的副作用与被访问的响应式属性建立关联。[[6]](https://vuejs.org/guide/extras/reactivity-in-depth.html?m=o&u=t)

---
### 【`effect` 是什么？】

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

组件的 render effect、`computed`、`watchEffect`、`watch` 等能力，都建立在这套响应式系统之上。[[7]](https://vuejs.org/api/reactivity-core)

这里再补一个工程层细节：

> 数据变化后，组件 DOM 更新通常并不是每次 setter 后马上同步修改 DOM，而是 Vue 会对更新任务进行调度和批处理，在更新周期中统一刷新。Vue 官方也明确说明 DOM 更新会缓冲到下一次 tick。[[8]](https://vuejs.org/guide/essentials/reactivity-fundamentals.html?noteId=note-cc0b26eb-a6c6-4372-91bf-1725f76529cd)

---
### 【`reactive` 和 `ref`】

Vue3 中这里对应的接口与机制分别是 `reactive` 和 `Proxy`。

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

Vue 官方也明确指出 `reactive()` 只支持对象类型，不能直接保存 `string / number / boolean` 等基本类型。[[8]](https://vuejs.org/guide/essentials/reactivity-fundamentals.html?noteId=note-cc0b26eb-a6c6-4372-91bf-1725f76529cd)

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

[[6]](https://vuejs.org/guide/extras/reactivity-in-depth.html?m=o&u=t)

---
### 【如果 `ref` 里面放的是对象呢？】

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

Vue 官方文档明确说明：如果 `ref` 接收到对象，该对象会通过 `reactive()` 转成深层响应式 Proxy。[[7]](https://vuejs.org/api/reactivity-core)

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
### 【最终面试收敛回答】

> **Vue 的响应式可以从 MVVM 的数据流来理解。MVVM 希望通过 ViewModel 连接 View 和 Model，实现 View 和 Model 的同步。这里实际上有两个方向：View 到 Model 主要是通过 DOM 事件监听实现，例如 `v-model` 本质上可以理解为 `:value` 加 `@input`，用户操作触发事件后修改 JavaScript 数据；真正属于 Vue 响应式系统核心的是 Model 到 View，也就是数据发生变化以后，Vue 怎么知道哪些视图依赖了这个数据，然后通知这些依赖更新。**
>
> **Vue 响应式的统一原理就是“数据访问拦截 → 依赖收集 → 数据变化 → 触发依赖更新”。Vue2 使用 `Object.defineProperty`，在初始化时递归处理已有属性，为属性建立 getter 和 setter。属性在组件渲染过程中被读取时，getter 通过 Dep 收集对应 Watcher；属性修改触发 setter 后，Dep 再通知相关 Watcher 更新组件。由于 `Object.defineProperty` 主要针对初始化时已有属性建立 getter/setter，所以新增、删除属性以及数组索引等场景存在局限，Vue2 通过 `Vue.set`、`Vue.delete` 以及重写 `push、pop、shift、unshift、splice、sort、reverse` 七个数组变更方法进行补充。**
>
> **Vue3 的基本思想没有改变，但把数据劫持改成了 `Proxy`。`reactive` 返回整个对象的 Proxy，当属性被读取时触发 `get` trap，再通过 `track` 收集当前 `effect`；当属性被修改、增加或删除时，通过 `set`、`deleteProperty` 等代理操作进入 `trigger`，找到相关依赖并进行调度更新。因为 Proxy 代理的是整个对象，所以 Vue3 能更自然地监听属性新增、删除和数组索引变化。**
>
> **Vue3 的依赖关系可以用 `WeakMap → Map → Set` 理解：WeakMap 的 key 是目标对象 `target`，value 是这个对象的依赖 Map；Map 的 key 是属性 `key`，value 是依赖该属性的 Set；Set 中存放所有依赖这个属性的 effect。这样就形成了“对象 → 属性 → 依赖函数”的精确映射。当某个属性变化时，只需要找到这个属性对应的 effect 集合进行更新。**
>
> **最后，`reactive` 只能直接处理对象类型，底层使用 Proxy；`ref` 可以处理基本类型也可以处理对象，它通过 `.value` 提供一个可追踪的响应式访问入口。如果 `ref` 中保存的是基本类型，就通过 `.value` 的 getter/setter 做 track 和 trigger；如果保存的是对象，内部对象还会通过 `reactive()` 转成深层响应式 Proxy。所以 Vue2 和 Vue3 的核心思想是一致的，都是“数据拦截 + 依赖收集 + 派发更新”，真正变化的是数据劫持方式以及依赖系统的实现。** [[4]](https://v2.vuejs.org/v2/guide/reactivity.html)

## 3. 参考文献

[1] [The Vue Instance — Vue.js](<https://v2.vuejs.org/v2/guide/instance>)[EB/OL].

[2] [Vue.js](<https://vuejs.org/guide/essentials/forms.html>)[EB/OL].

[3] [Component v-model | Vue.js](<https://vuejs.org/guide/components/v-model.html>)[EB/OL].

[4] [Vue.js](<https://v2.vuejs.org/v2/guide/reactivity.html>)[EB/OL].

[5] [Vue.js](<https://vuejs.org/api/reactivity-core.html>)[EB/OL].

[6] [Vue.js](<https://vuejs.org/guide/extras/reactivity-in-depth.html?m=o&u=t>)[EB/OL].

[7] [Vue.js](<https://vuejs.org/api/reactivity-core>)[EB/OL].

[8] [Vue.js](<https://vuejs.org/guide/essentials/reactivity-fundamentals.html?noteId=note-cc0b26eb-a6c6-4372-91bf-1725f76529cd>)[EB/OL].
