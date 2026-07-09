import { useEffect, useState } from "react";

// 具名导出 ✅
export const StateDemo = () => {
  const [count, setCount] = useState(1);

  //   useEffect(() => {
  //     setInterval(() => {
  //       setCount(count + 1);
  //     }, 1000);
  //   }, [count]);
  useEffect(() => {
    console.log("🚀 ~ StateDemo ~ useEffect:", useEffect);
    setInterval(() => {
      setCount((c) => c + 1);
    }, 1000);
  }, []);

  return (
    <div>
      <div>{count}</div>
      <button onClick={() => setCount(count + 1)}>+</button>
    </div>
  );
};

// export function Props() {}
// 默认导出
