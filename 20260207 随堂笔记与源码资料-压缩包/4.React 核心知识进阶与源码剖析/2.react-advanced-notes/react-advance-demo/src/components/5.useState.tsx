import React, { useState } from "react";

export function UseStateDemo() {
  //   const [count, setCount] = useState(0);
  const [count, setCount] = useState(() => 0);
//   const [count, setCount] = useState(() => 0);
//   const [count, setCount] = useState(() => 0);
//   const [count, setCount] = useState(() => 0);

  const handleClick = () => setCount((c) => c + 1);

  return (
    <div>
      <p>You clicked {count} times</p>
      {/* <button onClick={() => setCount(count + 1)}>Click me</button> */}
      <button onClick={handleClick}>Click me</button>
    </div>
  );
}
