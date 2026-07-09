# React 源码解读【二】

上节课，关注工程化设计、执行流程

## 定义对象

## React 核心流程

创建
更新

**resolveDispatcher**

```js
// ReactHooks.js 核心代码
import ReactSharedInternals from 'shared/ReactSharedInternals';

function resolveDispatcher() {
  const dispatcher = ReactSharedInternals.H;
  if (__DEV__ && dispatcher === null) {
    throw new Error('Hooks can only be called inside function components...');
  }
  return dispatcher;
}

// 所有 Hook 都这么写：
export function useState(initialState) {
  const dispatcher = resolveDispatcher();
  return dispatcher.useState(initialState);
}
```

1. 动态切换实现，Mount/Update/DEV
    - 挂载阶段，H = HooksDispatcherOnMount
    - 更新阶段，H = HooksDispatcherOnUpdate
    - DEV 环境，H = HooksDispatcherOnMountInDev/HooksDispatcherOnUpdateInDev
2. 与渲染器分离，跨平台，相当于一套 useState，可以使用与 ReactDOM、React Native、React Three Fibe


## 手写简版 React

在没有 react 时，我们都是通过事件操作 dom 更新
- 重排 reflow
- 跨平台

增加一个抽象层，虚拟 DOM（json），先通过抽象层确定哪些需要更新，后续一次性更新 DOM 减少重排问题

以一个简单的例子，点击按钮后数字+1 举例

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>DOM Example</title>
</head>
<body>
  <div id="counter">0</div>
  <button id="incrementBtn">Increment</button>

  <script>
    const counter = document.getElementById('counter');
    const incrementBtn = document.getElementById('incrementBtn');

    incrementBtn.addEventListener('click', () => {
      let count = parseInt(counter.innerText, 10);
      count += 1;
      counter.innerText = count;
    });
  </script>
</body>
</html>
```

```jsx
import React, { useState } from 'react';
import ReactDOM from 'react-dom';

function Counter() {
  const [count, setCount] = useState(0);

  return (
    <div>
      <div>{count}</div>
      <button onClick={() => setCount(count + 1)}>Increment</button>
    </div>
  );
}

ReactDOM.render(<Counter />, document.getElementById('root'));
```


源码实现的关键：
1. 必须要实现一套调度机制，处理任务优先级（scheduler， 浏览器 requestIdleCallback、 scheduler）
2. 实现状态管理
3. 提交变更，渲染视图