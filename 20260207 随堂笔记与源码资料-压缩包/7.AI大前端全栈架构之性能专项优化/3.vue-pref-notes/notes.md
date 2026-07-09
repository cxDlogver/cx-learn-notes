# Vue 应用级性能分析与优化

## 性能优化概要

1. 识别性能瓶颈
2. 组件设计优化
3. 状态优化
4. 持续监控性能问题，监控平台 sentry/自建 SDK + 分析平台

->  AI 化「上报数据 -> LLM 分析问题 -> code agent 修复问题」


### 识别性能瓶颈

1. 浏览器开发者工具，Performance、Memory
2. 应用开发工具，vue devtools、react devtools
3. 性能报告，Lighthouse、webpageTest

### 组件设计优化

- 减少不必要的重新渲染: 使用 v-if 或 v-show 控制组件的渲染，避免不必要的渲染开销。
- 按需加载组件: 使用动态导入和 Vue 的 async component 特性，按需加载组件，减少初始加载时间。
- 使用 key属性: 在 v-for 列表中使用唯一的 key 属性，确保 Vue 能够高效地更新 DOM。
- 事件监听的解绑: 当组件销毁时，确保解绑不再需要的事件监听器。

### 状态优化

- 更新粒度控制：一定要确保更新的状态是尽可能小范围的，这样才能够尽可能少更新视图内容。
- 模块化管理: 使用 Pinia 时，建议将状态拆分为多个 store 模块，以避免单一状态树过于庞大和复杂。这不仅有助于维护，还能提升性能。
- 懒加载 Store: 通过 Pinia 的 defineStore 动态创建 store，当某个 store 仅在特定页面或组件中需要时，可以延迟加载它。这样可以减少应用的初始加载时间。
- State 持久化: 如果某些状态需要在页面刷新后保持，可以使用 Pinia 的插件功能将状态持久化到 localStorage 或 sessionStorage，避免不必要的网络请求或重新计算。
- 避免不必要的深度响应: Pinia 允许你明确哪些状态需要响应式，哪些不需要。对于不需要响应式的复杂对象，可以使用 shallowRef 或 shallowReactive 来减少响应式开销。

### 性能监控

1. sentry 为例学会监控平台使用和功能
2. 尝试归一化性能、异常指标，webvitals、Performance
3. 自定义性能、异常、用户行为 SDK + 可视化平台

### AI 融合


## 性能瓶颈分析与基础优化

页面加载开始分析，首屏加载时间【FP、FCP、FMP】
