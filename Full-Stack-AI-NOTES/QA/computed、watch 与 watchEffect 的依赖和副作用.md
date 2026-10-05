# computed、watch 与 watchEffect 的依赖和副作用

## 【知识概述】

**computed 表达可缓存的派生状态，watch 监听指定来源执行副作用，watchEffect 运行副作用并自动收集依赖。**

`computed`、`watch` 和 `watchEffect` 都建立在 Vue 的响应式系统上，但它们解决的问题并不一样。

`fullName` 本身不是一个需要单独维护的源状态，而是可以由其他状态计算出来。

Vue 官方 `computed()` API 会返回一个响应式 ref。默认情况下，它是只读的；如果提供 getter 和 setter，也可以创建可写的 computed。[[1]](https://vuejs.org/api/reactivity-core.html)

这就是 `computed` 和普通方法的重要区别。Vue 官方明确说明，computed 的值会根据其响应式依赖进行缓存。[[2]](https://cn.vuejs.org/guide/essentials/computed)

理解这组机制，可以沿以下主线展开：

先以可推导的展示值说明 computed 的依赖缓存。

对比明确 source 的 watch 与自动跟踪的 watchEffect。

再沿异步请求说明执行时机、清理失效任务与防止旧结果覆盖的必要性。

缓存依据响应式依赖，watchEffect 异步函数只能跟踪相应同步阶段的读取；副作用还需处理清理和竞态。相关完整知识可结合 [Vue3进阶学习](<../V-Vue3进阶学习.md>) 阅读。

## 1. 机制示例

这些片段展示当前主题需要解释的操作、数据关系或请求路径。判断时应关注前后的依赖和边界，后续机制说明给出对应原因。

```js
watchEffect(() => {
  fullName.value = firstName.value + lastName.value
})
```

```js
const fullName = computed(() => {
  return firstName.value + lastName.value
})
```

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

## 2. 机制说明与工程判断

### 【三者都建立在 Vue 响应式系统之上】

- `computed`：根据已有响应式状态得到一个新的**派生状态**。
- `watch`：明确监听一个或多个 source，在 source 变化后执行**副作用**。
- `watchEffect`：立即执行副作用，并在同步执行过程中**自动收集依赖**。[[1]](https://vuejs.org/api/reactivity-core.html)
### 【`computed`】

- 有返回值，本质是一个计算得到的 ref。
- 默认只读，也可以提供 `get + set` 创建可写 computed。
- 会根据响应式依赖进行缓存；依赖没有变化时，多次读取直接复用之前的结果。[[2]](https://cn.vuejs.org/guide/essentials/computed)
### 【`watch`】

- 显式指定依赖。
- source 可以是 `ref`、computed ref、getter、reactive object，或者它们组成的数组。
- 默认懒执行；source 真正发生变化后才执行 callback。
- callback 可以获得 `newValue`、`oldValue`。
- `immediate: true` 可以创建时立即执行。[[1]](https://vuejs.org/api/reactivity-core.html)
### 【`watchEffect`】

- 不需要显式指定 source。
- 默认立即执行一次。
- 执行过程中读取到的响应式数据会自动成为依赖。
- 如果 callback 是 async，只会自动追踪**第一个 `await` 之前同步访问的响应式数据**。[[3]](https://vuejs.org/guide/essentials/watchers.html)
### 【深度监听】

- 直接 `watch(reactiveObject, ...)` 时，会隐式进行深度监听。
- `watch(() => state.someObject, ...)` 默认主要观察 getter 返回值是否替换；如果还要监听内部深层修改，需要 `deep: true`。
- 深度监听由于对象本身没有被替换，深层 mutation 触发时 `newValue` 和 `oldValue` 可能是同一个对象。[[4]](https://cn.vuejs.org/api/reactivity-core)
### 【执行时机】

- 默认 `flush: 'pre'`：父组件更新以后、当前组件 DOM 更新以前。
- `flush: 'post'`：当前组件 DOM 更新以后。
- `flush: 'sync'`：响应式 mutation 时同步触发，不进行正常批处理，谨慎使用。[[5]](https://cn.vuejs.org/guide/essentials/watchers)
### 【cleanup】

- watcher 重新执行前可以清理上一轮副作用。
- 典型用途是取消已经失效的网络请求、定时任务等，防止旧异步任务覆盖新结果。[[1]](https://vuejs.org/api/reactivity-core.html)

## 3. 完整回答与表达组织

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
### 【`computed`：用来表示派生状态】

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

Vue 官方 `computed()` API 会返回一个响应式 ref。默认情况下，它是只读的；如果提供 getter 和 setter，也可以创建可写的 computed。[[1]](https://vuejs.org/api/reactivity-core.html)
#### <u>1. computed 为什么有缓存？</u>

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

这就是 `computed` 和普通方法的重要区别。Vue 官方明确说明，computed 的值会根据其响应式依赖进行缓存。[[2]](https://cn.vuejs.org/guide/essentials/computed)

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
### 【`watch`：明确监听某个 source，然后执行副作用】

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
### 【`watch` 可以监听什么？】

Composition API 中常见有四类。
#### <u>1. 监听 ref</u>

```js
const count = ref(0)

watch(count, (newValue, oldValue) => {
  console.log(newValue, oldValue)
})
```
#### <u>2. 监听 computed</u>

```js
const double = computed(() => count.value * 2)

watch(double, (value) => {
  console.log(value)
})
```
#### <u>3. 监听 getter</u>

```js
const state = reactive({
  count: 0
})

watch(
  () => state.count,
  (newValue, oldValue) => {}
)
```
#### <u>4. 同时监听多个 source</u>

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

这是它和 `watchEffect` 非常重要的区别。[[1]](https://vuejs.org/api/reactivity-core.html)

---
### 【`watch` 默认是懒执行的】

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

Vue 官方明确规定，`watch` 默认是懒执行，`immediate: true` 可以立即调用 callback，并且第一次执行时 `oldValue` 是 `undefined`。[[5]](https://cn.vuejs.org/guide/essentials/watchers)

---
### 【`watchEffect`：自动收集依赖】

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

[[3]](https://vuejs.org/guide/essentials/watchers.html)

---
### 【`watchEffect` 默认立即执行】

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
### 【async `watchEffect` 有一个重要边界】

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

> `watchEffect` 只会追踪同步执行期间访问的依赖；async callback 中只有第一次 `await` 之前访问的属性会被追踪。[[3]](https://vuejs.org/guide/essentials/watchers.html)

这是很高频的追问。

---
### 【`deep` 深度监听】

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

也可以触发 watcher。[[4]](https://cn.vuejs.org/api/reactivity-core)

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

甚至可以使用数字限制最大遍历深度。[[4]](https://cn.vuejs.org/api/reactivity-core)
#### <u>1. 为什么深度 watch 的 newValue 和 oldValue 可能一样？</u>

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

> 发生的是对象内部 mutation，而不是整个对象引用被替换。[[4]](https://cn.vuejs.org/api/reactivity-core)

---
### 【watcher 的执行时机：`flush`】

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

通常看到的还是更新前状态。Vue 官方明确规定默认 callback 位于父组件更新之后、所属组件 DOM 更新之前。[[5]](https://cn.vuejs.org/guide/essentials/watchers)

---
#### <u>1. `flush: 'post'`</u>

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

[[5]](https://cn.vuejs.org/guide/essentials/watchers)

---
#### <u>2. `flush: 'sync'`</u>

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

[[5]](https://cn.vuejs.org/guide/essentials/watchers)

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
### 【cleanup 为什么重要？】

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

Vue 官方明确将“取消已经失效的异步请求”作为 watcher cleanup 的主要场景。[[1]](https://vuejs.org/api/reactivity-core.html)

---
### 【三个经典场景怎么选？】

#### <u>1. 场景一：计算 fullName</u>

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
#### <u>2. 场景二：userId 改变以后请求接口</u>

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
#### <u>3. 场景三：副作用同时依赖很多数据</u>

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

更方便，因为会自动收集真正读取的响应式属性。[[3]](https://vuejs.org/guide/essentials/watchers.html)

---
### 【为什么派生状态不要滥用 `watchEffect`？】

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
### 【最终面试收敛回答】

> **`computed`、`watch` 和 `watchEffect` 都建立在 Vue 的响应式 effect 系统上，但职责不同。`computed` 用来表示派生状态，它接收 getter，自动追踪 getter 中使用的响应式依赖，并根据依赖进行缓存；依赖不变时重复读取会直接复用结果。`computed` 默认返回只读 ref，也可以通过 getter 和 setter 创建可写 computed。因此如果一个值能够由其他响应式状态计算出来，例如 `fullName = firstName + lastName`，优先使用 computed。** [[2]](https://cn.vuejs.org/guide/essentials/computed)
>
> **`watch` 用来明确监听一个或多个响应式 source，并在 source 真正变化以后执行副作用。source 可以是 ref、computed、getter、reactive object 或 source 数组，callback 可以获得 newValue 和 oldValue。`watch` 默认懒执行，通过 `immediate: true` 可以立即执行；直接 watch reactive object 时会隐式进行深度监听，而监听一个返回对象的 getter 时，内部深层变化通常需要 `deep: true`。因此接口请求、localStorage 同步、第三方 API 调用等“状态变化以后做某件事”的场景更适合 watch。** [[1]](https://vuejs.org/api/reactivity-core.html)
>
> **`watchEffect` 同样用于副作用，但它不需要显式声明 source，而是在立即执行 callback 的过程中自动追踪同步访问到的响应式数据，以后任一依赖变化都会重新执行。它和 watch 的核心区别是：watch 将“依赖是谁”和“副作用是什么”分开，控制更加精确；watchEffect 把依赖追踪和副作用放在一起，使用更简洁但依赖不够显式。需要注意，如果 watchEffect 使用 async callback，只会追踪第一个 await 之前同步读取到的依赖。** [[3]](https://vuejs.org/guide/essentials/watchers.html)
>
> **watcher 默认采用 `flush: 'pre'`，也就是父组件更新之后、当前组件 DOM 更新之前执行；需要访问已经更新后的当前组件 DOM 时使用 `flush: 'post'` 或 `watchPostEffect`；`flush: 'sync'` 会在响应式 mutation 时同步触发，并且不进行正常批处理，因此要谨慎使用。watch 和 watchEffect 还支持 cleanup，可以在下一轮 watcher 执行前取消上一轮已经失效的请求、定时器等副作用，避免异步竞态。最终可以记成一句话：`computed` 是“根据状态得到值”，`watch` 是“明确监听状态再做事”，`watchEffect` 是“先做事并自动发现自己依赖哪些状态”。** [[5]](https://cn.vuejs.org/guide/essentials/watchers)

## 4. 参考文献

[1] [Reactivity API: Core | Vue.js](<https://vuejs.org/api/reactivity-core.html>)[EB/OL].

[2] [计算属性 | Vue.js](<https://cn.vuejs.org/guide/essentials/computed>)[EB/OL].

[3] [Vue.js](<https://vuejs.org/guide/essentials/watchers.html>)[EB/OL].

[4] [Vue.js](<https://cn.vuejs.org/api/reactivity-core>)[EB/OL].

[5] [Vue.js](<https://cn.vuejs.org/guide/essentials/watchers>)[EB/OL].
