import React, { useState } from "react";

export function UseMemoUseCallbackDemo() {
  const [count, setCount] = useState(0);
  const [name, setName] = useState("");

  //   const doubleCount = count * 2;
  //   const doubleCount = useMemo(() => {
  //     return count * 2;
  //   }, [count]);

  //   const handleClick = useCallback(() => setCount((c) => c + 1), []);
  const doubleCount = count * 2;

  const handleClick = () => {
    setCount(count + 1);
    setName(count + "miaoma");
  };

  return (
    <div>
      <p>
        miaoma You clicked {count} times ---- double {doubleCount} --- {name}
      </p>
      <button onClick={handleClick}>Click me</button>
    </div>
  );
}
