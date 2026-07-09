import { useCallback, useState } from "react";

export function UseState() {
  const [count, setCount] = useState(0);
  const [age, setAge] = useState(0);
  // const [name, setName] = useState(0);

  // const [person, setPerson] = useState({
  //   count: 0,
  //   name: "",
  //   age: 10,
  // });

  const handleClick = useCallback(() => {
    setCount((c) => c + 1);
    // setPerson((c) => ({ ...c, count: 1 }));
    // setPerson((c) => ({ ...c, name: "1" }));
    // setPerson((c) => ({ ...c, age: 18 }));
  }, []);
  return (
    <div>
      <div>{count}</div>
      <button onClick={handleClick}>+</button>
      <div>{age}</div>
      <button
        onClick={() => {
          setAge((age) => age + 1);
        }}
      >
        +
      </button>
    </div>
  );
}
