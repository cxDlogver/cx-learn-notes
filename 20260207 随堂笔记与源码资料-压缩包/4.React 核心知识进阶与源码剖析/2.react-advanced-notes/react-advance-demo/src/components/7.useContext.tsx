// import React from "react";

// function GradSon(props: { count: number }) {
//   return <div>{props.count}</div>;
// }
// function Son(props: { count: number }) {
//   return <GradSon {...props} />;
// }
// function Parent(props: { count: number }) {
//   return <Son {...props} />;
// }
// function GrandPa(props: { count: number }) {
//   return <Parent {...props} />;
// }

// export function UseReducerDemo() {
//     return <GrandPa count={0} />;
// }

import React, { useContext, useState } from "react";

// vue3 provide  inject
// react context provide

const CountContext = React.createContext(0);
// function GradSon() {
//   return (
//     <CountContext.Consumer>
//       {(value) => <div>{value}</div>}
//     </CountContext.Consumer>
//   );
// }
function GradSon() {
  const value = useContext(CountContext);
  return <div>{value}</div>;
}
function Son() {
  return <GradSon />;
}
function Parent() {
  return <Son />;
}
function GrandPa() {
  return <Parent />;
}

export function UseContextDemo() {
  const [count, setCount] = useState(0);
  return (
    <div>
      <button onClick={() => setCount(count + 1)}>+</button>
      <CountContext.Provider value={count}>
        <GrandPa />
      </CountContext.Provider>
    </div>
  );
}
