import { memo, useState } from "react";

// 对于纯函数组件缓存
type HeaderProps = {
  id: number;
  label: number;
};

export const Header = memo(
  (props: HeaderProps) => {
    return (
      <div>
        {props.id} --- {props.label}
      </div>
    );
  },
  (prev, curr) => {
    return prev.id === curr.id;
  },
);

export const HeaderDemo = () => {
  const [id, setId] = useState(0);
  const [label, setLabel] = useState(0);

  const [count, setCount] = useState(0);

  const handleChange = () => {
    setId(id + 1);
    setLabel(label + 2);
  };

  return (
    <div>
      <Header id={id} label={label} />
      <button onClick={handleChange}>更新</button>
      <button onClick={() => setCount(count + 1)}>+</button>
    </div>
  );
};
