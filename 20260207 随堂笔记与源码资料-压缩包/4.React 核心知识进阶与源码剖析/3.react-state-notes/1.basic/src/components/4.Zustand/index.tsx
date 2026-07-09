import { useCounter } from "../../stores/useCounter";

export function Zustand() {
  const { count, info, add, sub, changeName } = useCounter();
  return (
    <div>
      <div>{count}</div>
      <div>
        {info.name}---{info.age}
      </div>
      <button onClick={add}>+</button>
      <button onClick={sub}>-</button>
      <button onClick={changeName}>修改用户信息</button>
    </div>
  );
}
