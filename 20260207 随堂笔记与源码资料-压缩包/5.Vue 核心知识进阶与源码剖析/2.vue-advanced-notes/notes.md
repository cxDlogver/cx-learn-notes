# Vue3 进阶特性

## 核心 Composition API

- 基础响应式 Composition API
  - ref
  - reactive
  - computed
  - readonly
  - watchEffect
  - watchPostEffect
  - watchSyncEffect
  - watch
- 响应式工具
  - isRef，判断一个对象是否是 ref 响应式数据对象
  - isReactive，判断一对象是否是 reactive 响应式对象
  - isReadonly
  - unref，将 ref 转为基础数据
  - toRef
  - toValue
  - toRefs
  - isProxy
- 响应式进阶
  - shallowRef
  - triggerRef
  - customRef
  - shallowReactive
  - shallowReadonly
  - toRaw
  - markRaw
  - effectScope
  - onScopeDispose
- 生命周期

### 基础响应式 API


#### ref、reactive

ref、reactive

ref 一般用作基础数据类型的响应式定义
reactive 一般用于引用数据类型的响应式定义

ref 实现基于对 getter/setter
reactive 实现基于 proxy

```js
// ref
class RefImpl<T = any> {
    get value() {
        // 实现响应式追踪 track
    }
    set value() {
        // 实现响应式触发 trigger
    }
}
```

```js
// reactive

function createReactiveObject(target) {
    // ....
    const hanlders = {}
    const proxy = new Proxy(target, /**数据响应式拦截逻辑 */, handlers)
}

function reactive(target) {
    return createReactiveOjbect(target)
}


```

#### readonly

为了保证状态不被外部修改，从而 readonly 保护

#### 副作用

在状态发生变化时，做一个额外的操作
1. count 状态发生变化时，修改浏览器的标题
2. 后端获取到的结果拿到后，同步修改前端视图对应的状态值

watchSyncEffect
watchEffect
watchPostEffect

watch

watch 非常灵活，可以替代掉三个方法，immediate 组件挂载立即执行，deep 深层侦听，once 只在首次侦听


## 异步组件和 Suspense

因为有时候组件本身体积非常大，初始化页面渲染的时候也许不需要加载组件代码。
将这个组件变成异步组件

异步组件，为了优化首次加载代码体积

## 指令，自定义指令

- v-show  控制显示隐藏
- v-if    条件渲染
- v-else  条件渲染
- v-for   列表循环
- v-slot  插槽
- v-bind  自定义绑定属性
- v-on    自定义事件绑定
- v-model 实现数据双向绑定


## 内置组件

Suspense
KeepAlive
Teleport

react 中 createPortal，将组件挂载到任意位置


## 自定义 Composition API

达成状态数据规范化，与组件渲染逻辑分离