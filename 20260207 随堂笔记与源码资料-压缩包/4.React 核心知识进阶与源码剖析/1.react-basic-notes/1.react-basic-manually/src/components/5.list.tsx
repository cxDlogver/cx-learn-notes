import React, { useState } from "react";

export type ListDemoProps = {
  onClick?: () => void;
};

export type ListItemType = {
  id: string;
  label: string;
};

// 具名导出 ✅
export const ListDemo = (props: ListDemoProps) => {
  const [list, setList] = useState<ListItemType[]>([]);

  return (
    <div>
      {list.map((item) => (
        <div key={item.id}>{item.label}</div>
      ))}

      <button
        onClick={() =>
          setList([...list, { id: `${list.length}`, label: `选项 ${list.length}` }])
        }
      >
        添加元素
      </button>
    </div>
  );
};

// export function Props() {}
// 默认导出
