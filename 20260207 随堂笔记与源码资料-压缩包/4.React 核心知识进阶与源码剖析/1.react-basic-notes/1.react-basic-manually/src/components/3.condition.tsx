import React, { useEffect, useState } from "react";

// 具名导出 ✅
export const ConditionDemo = () => {
  const [count, setCount] = useState(1);

  const flag =
    count % 2 === 0 ? <span style={{ color: "pink" }}>偶数</span> : "奇数";
  console.log("🚀 ~ ConditionDemo ~ count % 2:", count, count % 2);
  console.log("🚀 ~ ConditionDemo ~ flag:", flag);

  useEffect(() => {
    setInterval(() => {
      setCount((c) => c + 1);
    }, 1000);
  }, []);

  return (
    <div>
      <div>{flag}</div>
      <button onClick={() => setCount(count + 1)}>+</button>
    </div>
  );
};

// export function Props() {}
// 默认导出
