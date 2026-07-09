import React, { useEffect, useState } from "react";

export function UseEffectDemo() {
  const [count, setCount] = useState(() => 0);

  const handleClick = () => setCount((c) => c + 1);

  //   当状态发生变化后，还想做一些其他操作，副作用
  useEffect(() => {
    document.title = `You clicked ${count} times`;

    return () => {
      document.title = "妙码学院";
    };
  }, [count]);

  return (
    <div>
      <p>You clicked {count} times</p>
      <button onClick={handleClick}>Click me</button>
    </div>
  );
}
