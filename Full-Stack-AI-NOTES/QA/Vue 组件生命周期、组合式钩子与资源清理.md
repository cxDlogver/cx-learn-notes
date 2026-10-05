# Vue 组件生命周期、组合式钩子与资源清理

## 【知识概述】

**生命周期描述组件从初始化、挂载、更新到卸载的阶段，钩子让逻辑在具备所需状态或 DOM 的时机执行。**

**一个组件从实例初始化、建立响应式状态、首次渲染和挂载，到后续响应式更新，再到最终卸载的完整过程。Vue 在这些关键阶段提供生命周期钩子，让开发者能够在正确的时间执行对应逻辑。** [[1]](https://vuejs.org/guide/essentials/lifecycle.html)

`beforeCreate` 是实例初始化后的早期阶段。Vue 官方的定义是：实例已经初始化并解析了 props，随后才会继续设置响应式 props、`data()`、`computed` 等状态。

[[2]](https://vuejs.org/api/options-lifecycle)

`beforeMount` 时，响应式状态已经设置完成，但 Vue 还没有执行首次 DOM render effect。

[[3]](https://vuejs.org/api/composition-api-lifecycle)

理解这组机制，可以沿以下主线展开：

先沿创建与挂载区分数据可用和真实 DOM 可用。

再解释更新调度及需要 nextTick 的情形。

对比 Vue2、Vue3 与组合式 API，最后补充父子顺序、KeepAlive 和卸载清理。

mounted 不代表异步子组件、请求或图片全部完成；服务端渲染与缓存组件也不能机械套用同一生命周期路径。相关完整知识可结合 [Vue3进阶学习](<../V-Vue3进阶学习.md>) 阅读。

## 1. 机制说明与工程判断

### 【生命周期本质】

- 一个组件从实例初始化、状态建立、首次渲染、DOM 挂载、响应式更新，到最终卸载，会经历一系列阶段。
- 生命周期钩子就是 Vue 在这些阶段提供的执行入口。Vue 官方将其描述为组件实例初始化过程中，在特定阶段运行用户代码的机制。[[1]](https://vuejs.org/guide/essentials/lifecycle.html)
### 【Vue3 Options API 主流程】

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

Vue3 仍然存在 `beforeCreate`、`created`、`mounted` 等 Options API 生命周期，并不是 Vue3 把它们全部删除了。[[2]](https://vuejs.org/api/options-lifecycle)
### 【创建阶段】

- `beforeCreate`：实例已经初始化、props 已解析，但 `data()`、`computed` 等状态选项还在随后进行设置。
- `created`：响应式数据、computed、methods、watchers 等状态相关选项已经处理完成。
- `created` 时挂载阶段尚未开始，`$el` 还不可用。[[2]](https://vuejs.org/api/options-lifecycle)
### 【挂载阶段】

- `beforeMount`：响应式状态已经准备完成，但还没有创建本轮真实 DOM，马上执行首次 DOM render effect。
- `mounted`：当前组件自己的 DOM 树已经创建并插入父容器，而且所有**同步子组件**已经挂载完成。
- 不保证异步组件、`<Suspense>` 内组件、网络请求、图片资源等都已经完成。[[3]](https://vuejs.org/api/composition-api-lifecycle)
### 【更新阶段】

- `beforeUpdate`：响应式状态变化导致 DOM 即将更新之前。
- `updated`：本轮组件 DOM 更新完成以后。
- Vue 会对多个状态变化进行批量处理，因此如果要等待“某一次具体状态修改对应的 DOM 更新完成”，优先使用 `nextTick()`。
- 不要在 `updated` 中无条件修改组件状态，否则很容易造成循环更新。[[3]](https://vuejs.org/api/composition-api-lifecycle)
### 【卸载阶段】

- `beforeUnmount`：组件即将卸载，此时实例仍然完全可用。
- `unmounted`：所有子组件已经卸载，并且组件关联的 render effect、`setup()` 中创建的 computed/watchers 等响应式作用已经停止。
- 手动创建的计时器、DOM 事件、服务器连接等外部副作用仍应主动清理。[[3]](https://vuejs.org/api/composition-api-lifecycle)
### 【父子组件】

- 父组件的 `mounted` 一定在所有同步子组件 `mounted` 之后。
- 父组件的 `updated` 在子组件的 `updated` 之后。
- 父组件被视为 `unmounted` 时，所有子组件已经先完成卸载。
- 因此常见结果是“创建向下、完成向上”，但不要把它机械扩展到所有异步组件和所有场景。[[3]](https://vuejs.org/api/composition-api-lifecycle)
### 【Vue2 与 Vue3】

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
- 创建、挂载、更新阶段的大部分 Options API 名称仍然保留。[[4]](https://v2.vuejs.org/v2/api/?redirect=true)
### 【Composition API】

- `setup()` 是 **Composition API 的入口函数**。
- Vue 官方明确规定：`setup()` 在所有 Options API 生命周期之前执行，甚至早于 `beforeCreate()`。
- 因此不能简单说：
  ```text
  setup = created
  ```
- Composition API 没有 `onBeforeCreate()` 和 `onCreated()`；初始化逻辑直接在 `setup()` / `<script setup>` 的 setup 阶段执行。[[5]](https://vuejs.org/api/composition-api-setup.html)
### 【KeepAlive】

- 被缓存组件切走时不是正常卸载，而是进入 deactivated 状态。
- 重新插回 DOM 时进入 activated。
- `activated` 初次挂载时也会触发，`deactivated` 在真正卸载时也会触发。[[6]](https://vuejs.org/guide/built-ins/keep-alive)

## 2. 完整回答与表达组织

Vue 的生命周期，本质上就是：

> **一个组件从实例初始化、建立响应式状态、首次渲染和挂载，到后续响应式更新，再到最终卸载的完整过程。Vue 在这些关键阶段提供生命周期钩子，让开发者能够在正确的时间执行对应逻辑。** [[1]](https://vuejs.org/guide/essentials/lifecycle.html)

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
### 【创建和挂载阶段】

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

[[2]](https://vuejs.org/api/options-lifecycle)

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

[[3]](https://vuejs.org/api/composition-api-lifecycle)

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

官方明确指出，`mounted` 对子组件的保证只包括**同步子组件**，不包括异步组件和 `<Suspense>` 中的组件。[[3]](https://vuejs.org/api/composition-api-lifecycle)

---
### 【更新阶段】

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

[[3]](https://vuejs.org/api/composition-api-lifecycle)

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

Vue 官方也明确建议：如果要在**某个特定状态变化以后**访问更新后的 DOM，应使用 `nextTick()`。[[3]](https://vuejs.org/api/composition-api-lifecycle)

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

导致无限更新循环。[[3]](https://vuejs.org/api/composition-api-lifecycle)

---
### 【卸载阶段】

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

[[3]](https://vuejs.org/api/composition-api-lifecycle)

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

官方也明确把定时器、DOM 事件监听和服务器连接列为 `onUnmounted` 的典型清理对象。[[3]](https://vuejs.org/api/composition-api-lifecycle)

---
### 【父子组件生命周期怎么执行？】

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

[[3]](https://vuejs.org/api/composition-api-lifecycle)

更新阶段官方同样明确：

> **父组件的 `updated` 在子组件的 `updated` 之后调用。**

因此如果父子组件同时因为这一轮变化而更新：

```text
...
Child updated
↓
Parent updated
```

[[3]](https://vuejs.org/api/composition-api-lifecycle)

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

是官方明确保证的关系。[[3]](https://vuejs.org/api/composition-api-lifecycle)

所以面试中可以收敛成：

> **父组件先启动对子树的处理，但挂载、更新、卸载的“完成钩子”通常需要等子组件对应工作完成，因此常看到子组件的 mounted / updated / unmounted 先于父组件对应完成钩子。**

不要把这个规律无限扩展到异步组件，因为 `mounted` 明确不等待异步组件或 `<Suspense>` 中的组件。[[3]](https://vuejs.org/api/composition-api-lifecycle)

---
### 【Vue3 的 `setup()` 到底是什么？】

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

则是 SFC 中使用 Composition API 的**编译时语法**，不是一个生命周期钩子。Vue 官方推荐 SFC 使用 Composition API 时优先采用 `<script setup>`。[[5]](https://vuejs.org/api/composition-api-setup.html)

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

[[2]](https://vuejs.org/api/options-lifecycle)

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

而且这些 API 必须在组件的 `setup()` 阶段同步注册。[[7]](https://cn.vuejs.org/api/composition-api-lifecycle)

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
### 【Vue2 和 Vue3 生命周期的主要区别】

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

Vue3 并没有删除 `created`、`mounted` 等 Options API 生命周期函数。[[4]](https://v2.vuejs.org/v2/api/?redirect=true)

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
### 【KeepAlive 生命周期】

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

[[6]](https://vuejs.org/guide/built-ins/keep-alive)

所以：

```text
mounted / unmounted
→ 真正的挂载和卸载生命周期

activated / deactivated
→ KeepAlive 缓存树中的激活和停用
```

还有一个容易漏掉的官方细节：

- `activated` 在**首次 mount** 时也会调用；
- `deactivated` 在**最终 unmount** 时也会调用。[[6]](https://vuejs.org/guide/built-ins/keep-alive)

---
### 【最终面试收敛回答】

> **Vue 生命周期就是组件从实例初始化、建立响应式状态、首次渲染和挂载，到响应式状态变化后的更新，再到最终卸载的完整过程。Vue3 Options API 的主要流程是 `beforeCreate → created → beforeMount → mounted → beforeUpdate → updated → beforeUnmount → unmounted`。其中 `created` 时响应式数据、computed、methods 和 watchers 等已经处理完成，但还没开始挂载，所以 `$el` 不可用；`mounted` 时组件自己的 DOM 已经插入父容器，并且所有同步子组件已经挂载完成，因此适合 DOM 操作和第三方 DOM 库初始化，但它并不保证异步组件、接口请求和图片资源都完成。** [[2]](https://vuejs.org/api/options-lifecycle)
>
> **响应式状态变化后会经历 `beforeUpdate → DOM 更新 → updated`。Vue 会批量调度更新，因此如果要等待某次具体状态修改对应的 DOM 更新完成，应使用 `nextTick()`，而不要依赖 `updated`；同时不要在 `updated` 中无条件修改状态，否则容易形成无限更新。卸载时经历 `beforeUnmount → unmounted`，当 `unmounted` 执行时子组件已经卸载，组件自己的响应式 effects 也已经停止，而定时器、DOM 监听、WebSocket 等手动创建的副作用需要开发者自行清理。** [[3]](https://vuejs.org/api/composition-api-lifecycle)
>
> **父子组件方面，完成阶段通常是“子先完成、父后完成”：父组件的 `mounted` 要等所有同步子组件 mounted，父组件的 `updated` 在子组件 updated 之后，父组件完成 unmounted 时子组件已经全部卸载。Vue2 和 Vue3 最明显的生命周期命名变化是 `beforeDestroy / destroyed` 改成了 `beforeUnmount / unmounted`。** [[3]](https://vuejs.org/api/composition-api-lifecycle)
>
> **Composition API 中，`setup()` 不是 `created()` 的简单替代，它是 Composition API 的入口，而且官方明确规定 `setup()` 在所有 Options API 钩子之前执行，甚至早于 `beforeCreate()`。`<script setup>` 是 setup 阶段的编译时语法，而 `onMounted / onUpdated / onUnmounted` 等才是 Composition API 的生命周期注册函数。使用 `<KeepAlive>` 时，组件切走并不会立即卸载，而会进入 `deactivated`，重新插入时进入 `activated`。** [[2]](https://vuejs.org/api/options-lifecycle)

## 3. 参考文献

[1] [Lifecycle Hooks | Vue.js](<https://vuejs.org/guide/essentials/lifecycle.html>)[EB/OL].

[2] [Vue.js](<https://vuejs.org/api/options-lifecycle>)[EB/OL].

[3] [Vue.js](<https://vuejs.org/api/composition-api-lifecycle>)[EB/OL].

[4] [API — Vue.js](<https://v2.vuejs.org/v2/api/?redirect=true>)[EB/OL].

[5] [Vue.js](<https://vuejs.org/api/composition-api-setup.html>)[EB/OL].

[6] [Vue.js](<https://vuejs.org/guide/built-ins/keep-alive>)[EB/OL].

[7] [组合式 API：生命周期钩子 | Vue.js](<https://cn.vuejs.org/api/composition-api-lifecycle>)[EB/OL].
