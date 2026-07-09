import React, { useState } from "react";

export type EventDemoProps = {
  onClick?: () => void;
};

// 具名导出 ✅
export const EventDemo = (props: EventDemoProps) => {
  const [count, setCount] = useState(1);

  return (
    <div>
      <div>{count}</div>
      <button onClick={() => setCount(count + 1)}>+</button>
      <button onClick={props.onClick}>外部 click</button>
    </div>
  );
};

// export function Props() {}
// 默认导出
