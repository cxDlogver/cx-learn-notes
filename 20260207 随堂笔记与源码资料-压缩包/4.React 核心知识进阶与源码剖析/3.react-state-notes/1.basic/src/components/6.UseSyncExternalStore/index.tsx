// 这个 hook 帮助 react 将 外部状态与视图进行同步
// 发布订阅
// 1. 订阅参数
// 2. 状态快照
// 3. 服务端渲染，获取状态快照

import { useSyncExternalStore } from "react";

let count = 0;

let listensers = [];

const reducer = (state, action: { type: "ADD" | "SUB" }) => {
  switch (action.type) {
    case "ADD":
      return { count: state.count + 1 };
    case "SUB":
      return { count: state.count - 1 };

    default:
      return state;
  }
};

// 监听函数调用，要通过 dispatch 来完成
function dispatch(action) {
  count = reducer({ count }, action).count;

  // 触发订阅函数执行
  for (const listenser of listensers) {
    listenser();
  }
}

// 当 count 变化时，应该要通知 react 更新视图
const subscribe = (fn: () => void) => {
  console.log("🚀 ~ subscribe ~ fn:", fn);
  listensers.push(fn);

  //   清除订阅
  return () => {
    listensers = listensers.filter((l) => l !== fn);
  };
};

export const UseSyncExternalStore = () => {
  // 使用订阅函数来订阅 count 外部状态变化，一旦 count 更新，通知给我，我会使用获取状态快照函数获取最新结果
  const state = useSyncExternalStore(
    subscribe,
    () => count,
    () => count,
  );
  return (
    <div>
      {state}
      <button onClick={() => dispatch({ type: "ADD" })}>+</button>
    </div>
  );
};
