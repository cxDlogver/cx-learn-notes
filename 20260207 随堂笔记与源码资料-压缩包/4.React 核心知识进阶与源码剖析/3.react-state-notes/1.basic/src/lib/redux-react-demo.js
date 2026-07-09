// 定义 Action 类型
/**
 * @typedef {Object} Action
 * @property {string} type
 */

// 定义 Reducer 类型
/**
 * @callback Reducer
 * @param {any} state
 * @param {Action} action
 * @returns {any}
 */

// 定义 Store 类型
/**
 * @typedef {Object} Store
 * @property {function(): any} getState
 * @property {function(Action): void} dispatch
 * @property {function(function(): void): function(): void} subscribe
 */

// 创建 store
/**
 * @type {CreateStore}
 */
function createStore(reducer, initialState, enhancer) {
  if (enhancer) {
    return enhancer(createStore)(reducer, initialState);
  }

  let state = initialState;
  let listeners = [];

  function getState() {
    return state;
  }

  function dispatch(action) {
    state = reducer(state, action);
    listeners.forEach(listener => listener());
  }

  function subscribe(listener) {
    listeners.push(listener);
    return () => {
      listeners = listeners.filter(l => l !== listener);
    };
  }

  return { getState, dispatch, subscribe };
}

// 合并多个 reducer
/**
 * @param {Object<string, Reducer>} reducers
 * @returns {Reducer}
 */
function combineReducers(reducers) {
  return (state = {}, action) => {
    const newState = {};
    for (const key in reducers) {
      newState[key] = reducers[key](state[key], action);
    }
    return newState;
  };
}

// 组合函数
/**
 * @param  {...function} funcs
 * @returns {function}
 */
function compose(...funcs) {
  if (funcs.length === 0) {
    return arg => arg;
  }

  if (funcs.length === 1) {
    return funcs[0];
  }

  return funcs.reduce((a, b) => (...args) => a(b(...args)));
}

// 应用中间件
/**
 * @param {...Middleware} middlewares
 * @returns {function(CreateStore): CreateStore}
 */
function applyMiddleware(...middlewares) {
  return createStore => (reducer, initialState) => {
    const store = createStore(reducer, initialState);
    let dispatch = store.dispatch;

    const middlewareAPI = {
      getState: store.getState,
      dispatch: action => dispatch(action),
    };

    const chain = middlewares.map(middleware => middleware(middlewareAPI));
    dispatch = compose(...chain)(store.dispatch);

    return {
      ...store,
      dispatch,
    };
  };
}

// 示例代码
const initialState = { count: 0 };

const counterReducer = (state = initialState, action) => {
  switch (action.type) {
    case 'INCREMENT':
      return { count: state.count + 1 };
    case 'DECREMENT':
      return { count: state.count - 1 };
    default:
      return state;
  }
};

const loggerMiddleware = ({ getState }) => next => action => {
  console.log('will dispatch', action);
  next(action);
  console.log('state after dispatch', getState());
};

const store = createStore(
  counterReducer,
  initialState,
  applyMiddleware(loggerMiddleware)
);

store.subscribe(() => {
  console.log('State updated:', store.getState());
});

store.dispatch({ type: 'INCREMENT' });
store.dispatch({ type: 'DECREMENT' });



/**
 * ----------------------------------------
 * ----------------------------------------
 * ----------------------------------------
 */



import React from "react";
import { useSyncExternalStore } from "react";

// 自定义 Hook
function useReduxStore(store) {
  return useSyncExternalStore(store.subscribe, store.getState, store.getState);
}

// 示例组件
function Counter() {
  const state = useReduxStore(store);

  return (
    <div>
      <p>Count: {state.count}</p>
      <button onClick={() => store.dispatch({ type: "INCREMENT" })}>
        Increment
      </button>
      <button onClick={() => store.dispatch({ type: "DECREMENT" })}>
        Decrement
      </button>
    </div>
  );
}

// 渲染组件
import { createRoot } from "react-dom/client";

const container = document.getElementById("root");
const root = createRoot(container);
root.render(<Counter />);
