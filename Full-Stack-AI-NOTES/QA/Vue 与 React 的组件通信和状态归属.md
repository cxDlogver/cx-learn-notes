# Vue 与 React 的组件通信和状态归属

## 【知识概述】

**组件通信应先根据关系确定状态属于谁，再选择 props、事件、上下文或状态容器；API 名称不同不改变数据流责任。**

Vue 和 React 的组件通信方式虽然 API 不完全一样，但整体上可以按照：

四个层级来理解。

父组件向子组件传递数据时，Vue 和 React 都主要使用 `props`：

React 官方将 props 定义为组件之间传递信息的基本方式，而且 props 可以是任意 JavaScript 值，包括函数。[[1]](https://react.dev/learn/passing-props-to-a-component)

Vue 官方的组件事件机制就是由子组件 `$emit()` / `emit()` 发出事件，父组件通过 `v-on` 监听。[[2]](https://vuejs.org/guide/components/events)

理解这组机制，可以沿以下主线展开：

先用父子关系说明向下传值与向上报告意图

兄弟组件共享状态时提升到共同祖先

深层后代按边界使用 provide、inject 或 Context，跨区域共享再考虑状态管理。

上下文传值不自动替代所有状态管理，事件总线也需要处理生命周期；全局存储应有明确的所有权和更新约束。相关完整知识可结合 [Vue3进阶学习](<../V-Vue3进阶学习.md>) 阅读。

## 1. 机制说明与工程判断

### 【先按照组件关系分类】

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
### 【父子通信】

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

React 官方也明确说明 props 可以传递包括函数在内的任意 JavaScript 值。[[1]](https://react.dev/learn/passing-props-to-a-component)

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
### 【祖先和深层后代通信】

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

Vue 官方正是把 `provide / inject` 作为解决深层 prop drilling 的机制。[[3]](https://vuejs.org/guide/components/provide-inject)

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

Context 可以让父级向组件树中任意深度的后代提供数据，而不需要逐层传 props。[[4]](https://react.dev/learn/passing-data-deeply-with-context)

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
### 【兄弟组件通信：状态提升】

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

React 官方直接把“把两个组件的状态移动到最近共同父组件”定义为 lifting state up。[[5]](https://react.dev/learn/sharing-state-between-components)

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
### 【再往上才是全局状态管理】

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

## 2. 完整回答与表达组织

Vue 和 React 的组件通信方式虽然 API 不完全一样，但整体上可以按照：

```text
父子
→ 祖先后代
→ 兄弟
→ 全局
```

四个层级来理解。
### 【父子组件：`props + emit/callback`】

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

React 官方将 props 定义为组件之间传递信息的基本方式，而且 props 可以是任意 JavaScript 值，包括函数。[[1]](https://react.dev/learn/passing-props-to-a-component)

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

Vue 官方的组件事件机制就是由子组件 `$emit()` / `emit()` 发出事件，父组件通过 `v-on` 监听。[[2]](https://vuejs.org/guide/components/events)

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
### 【祖先和后代：`provide/inject` 与 Context】

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

祖先负责提供依赖，任意深度的后代都可以注入，中间组件不需要继续传递。[[3]](https://vuejs.org/guide/components/provide-inject)

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

React 官方说明，Context 就是为了让父级向任意深度的后代提供信息，而不需要一层一层传 props。[[4]](https://react.dev/learn/passing-data-deeply-with-context)

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
### 【兄弟组件：状态提升】

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

React 官方给出的原则也是：当两个组件需要协调状态时，把状态移动到最近的共同父组件，再通过 props 向下传递，同时把 event handler 传给子组件，让子组件通知父组件修改状态。[[5]](https://react.dev/learn/sharing-state-between-components)

因此 Vue 和 React 在这一点上的核心思想其实完全一致：

```text
共享状态
↓
最近共同父组件持有
↓
保持单一数据源
```

---
### 【全局通信：Pinia 与 Redux】

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

供多个组件共同使用。Pinia 是 Vue 生态中专门的 Store 方案。[[6]](https://pinia.vuejs.org/introduction.html)

React 中常见的一个方案是：

```text
Redux
```

现代项目通常使用：

```text
Redux Toolkit + React-Redux
```

Redux 官方将 Redux 定义为管理全局应用状态的库，并明确指出 Redux 更适合大量状态被应用多个部分共同使用、更新逻辑较复杂等场景。[[7]](https://redux.js.org/tutorials/fundamentals/part-1-overview)

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

Redux 官方本身也强调，并不是所有应用都需要 Redux；如果 React 自身状态管理已经足够，就没有必要为了使用 Redux 而使用 Redux。[[8]](https://redux.js.org/faq/general/)

---
### 【最重要：局部状态和全局状态怎么划分？】

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

Redux 官方的建议本身也是：不是所有状态都应该进入 Redux，局部组件状态完全合理。[[9]](https://redux.js.org/faq/organizing-state)

所以更准确的原则不是：

> “多个组件共享就一定放全局。”

而是：

> **状态应该尽量放在离使用它的组件最近、同时又能够保证单一数据源的位置。只有共享范围扩大到普通状态提升或组件树上下文已经不合适时，再提升成全局状态。**

---
### 【最终面试收敛回答】

> **Vue 和 React 的组件通信可以按照父子、祖先后代、兄弟以及全局四个层级来理解。父组件向子组件传数据时，两者都使用 props；子组件通知父组件时，Vue 通常通过 emit 发出组件事件，而 React 通常由父组件把 callback 作为 prop 传给子组件，再由子组件调用。因此两者本质上都遵循“状态由上层持有、数据向下传递、修改请求向上传递”的单向数据流思想。** [[2]](https://vuejs.org/guide/components/events)
>
> **对于深层祖先和后代通信，Vue 使用 `provide / inject`，祖先 provide 数据或依赖，深层后代直接 inject；React 对应的是 Context，由上层提供 Context value，后代通过 `useContext` 读取。二者主要用于解决多层组件之间的 props drilling。** [[3]](https://vuejs.org/guide/components/provide-inject)
>
> **兄弟组件通信通常使用状态提升：把兄弟组件共同需要的状态移动到最近的共同父组件，由父组件统一管理，再通过 props 向下传递。Vue 中子组件通过 emit 通知父组件修改，React 中则调用父组件传下来的 callback。这样可以保证这份状态只有一个真正的数据源。** [[5]](https://react.dev/learn/sharing-state-between-components)
>
> **如果状态的共享范围进一步扩大到多个页面、多个远距离组件或多个业务模块，再考虑全局状态管理。Vue3 常见使用 Pinia，React 中复杂全局状态常见 Redux / Redux Toolkit。不过不是多个组件使用一份数据就一定需要全局 Store：能够通过局部状态解决就保留局部；几个相邻组件共享就优先状态提升；深层组件树共享可以考虑 provide/inject 或 Context；只有共享范围、生命周期和更新复杂度进一步扩大时，再使用 Pinia 或 Redux。核心原则就是：状态尽量放在离使用者最近、同时能够保证单一数据源的位置。** [[8]](https://redux.js.org/faq/general/)

## 3. 参考文献

[1] [Passing Props to a Component – React](<https://react.dev/learn/passing-props-to-a-component>)[EB/OL].

[2] [Vue.js](<https://vuejs.org/guide/components/events>)[EB/OL].

[3] [Provide / Inject | Vue.js](<https://vuejs.org/guide/components/provide-inject>)[EB/OL].

[4] [React](<https://react.dev/learn/passing-data-deeply-with-context>)[EB/OL].

[5] [React](<https://react.dev/learn/sharing-state-between-components>)[EB/OL].

[6] [Introduction | Pinia](<https://pinia.vuejs.org/introduction.html>)[EB/OL].

[7] [Redux Fundamentals, Part 1: Redux Overview | Redux](<https://redux.js.org/tutorials/fundamentals/part-1-overview>)[EB/OL].

[8] [Redux](<https://redux.js.org/faq/general/>)[EB/OL].

[9] [Redux](<https://redux.js.org/faq/organizing-state>)[EB/OL].
