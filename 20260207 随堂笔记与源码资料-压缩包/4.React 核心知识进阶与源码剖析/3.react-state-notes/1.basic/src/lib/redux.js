// 首先我们关注入口函数
// reducer 是用于生成新状态的
// initialState 是初始状态
export function createStore(reducer, initialState) {
  // 初始状态
  // 所有状态都挂载到这个变量上，这也就是我们说的状态树
  let state = initialState;

  // 注册事件
  const listeners = [];

  // 新状态的生成一定要借助动作
  function dispatch(action) {
    // 为什么说 reducer 是一个纯函数
    state = reducer(state, action);
    // 通知那些订阅了状态更新的事件
    listeners.forEach((listener) => listener());
  }

  // 获取状态
  function getState() {
    return state;
  }

  // 订阅状态更新
  function subscribe(listener) {
    listeners.push(listener);
    // 事件只要有订阅就一定有取消订阅
    return () => {
      const index = listeners.indexOf(listener);
      listeners.splice(index, 1);
    };
  }

  return {
    dispatch,
    getState,
    subscribe,
  };
}

/**
 * ---------------------------
 * ---------------------------
 * 使用示例
 */

