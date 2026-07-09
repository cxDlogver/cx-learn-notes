import React, { PropsWithChildren } from "react";

export type PropsDemoProps = PropsWithChildren & {
  id: string;
  onClick?: () => void;
};

// 具名导出 ✅
export const PropsDemo = (props: PropsDemoProps) => {
  return (
    <div>
      {props.id}----{props.children}
      <button onClick={props.onClick}>内部 click</button>
    </div>
  );
};

// export function Props() {}
// 默认导出
