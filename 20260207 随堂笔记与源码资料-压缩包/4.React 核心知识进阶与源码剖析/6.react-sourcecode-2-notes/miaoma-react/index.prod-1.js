// 虚拟 DOm 创建
function createElement(type, props, ...children) {
  return {
    type,
    props: {
      ...props,
      children: children.map((child) =>
        typeof child === "object" ? child : createTextElement(child),
      ),
    },
  };
}

function createTextElement(text) {
  return {
    type: "TEXT_ELEMENT",
    props: {
      nodeValue: text,
      children: [],
    },
  };
}

// 调度过程

// workinprogress 内存工作执行 fiberRoot
let wipRoot = null;
// 当前 fiberRoot
let currentRoot = null;
// 调和阶段下一次时间切片任务
let nextUnitOfWork = null;
// commit 阶段渲染
function render(element, container) {
  wipRoot = {
    dom: container,
    props: {
      children: [element],
    },
    alternate: currentRoot,
  };

  nextUnitOfWork = wipRoot;
}

// 工作循环
function workLoop(deadline) {
  let shouldYield = false;
  while (nextUnitOfWork && !shouldYield) {
    nextUnitOfWork = performUnitOfWork(nextUnitOfWork);
    shouldYield = deadline.timeRemaining() < 1;
  }

  if (!nextUnitOfWork && wipRoot) {
    // 提交阶段
    // commitRoot()
  }

  // 调度机制 requestIdleCallback， react scheduler
  requestIdleCallback(workLoop);
}
requestIdleCallback(workLoop);

function performUnitOfWork(fiber) {
  const isFunctionComponent = fiber.type instanceof Function;
  if (isFunctionComponent) {
    updateFunctionComponent(fiber);
  } else {
    updateHostComponent(fiber);
  }
  // 所有子组件也需要被调和
  if (fiber.child) {
    return fiber.child;
  }

  let nextFiber = fiber;

  while (nextFiber) {
    if (nextFiber.sibling) {
      return nextFiber.sibling;
    }

    nextFiber = nextFiber.parent;
  }
}

// dom 渲染提交阶段
function updateFunctionComponent(fiber) {
  recondileChildren(fiber, children);
}

// 缺少状态
let hookIndex = null;
function useState(initial) {
  const oldHook =
    wipFiber.alternate &&
    wipFiber.alternate.hooks &&
    wipFiber.alternate.hooks[hookIndex];
  const hook = {
    state: oldHook ? oldHook.state : initial,
    queue: [],
  };
}

// 参数汇聚一下
const Miaoct = {
  createElement,
};

function Counter() {
  //   const [count, setCount] = Miaoct.useState(0);

  //   React.createElement
  const el = Miaoct.createElement("div", {}, Miaoct.createElement("div", {}));
  console.log(el);
  //   return (
  //     <div>
  //       <div>{count}</div>
  //       <button onClick={() => setCount(count + 1)}>Increment</button>
  //     </div>
  //   );
}

Counter();

const element = Miaoct.createElement(Counter, null);
const container = document.querySelector("#app");

Miaoct.render(element, container);
