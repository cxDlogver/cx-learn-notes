import React, { useReducer, useState } from "react";

// export function UseReducerDemo() {
//   const [count, setCount] = useState("");
//   const [id, setId] = useState("");
//   const [name, setName] = useState("");

//   return (
//     <div>
//       <form action={(formData) => console.log(formData.get("name"))}>
//         <input
//           name="count"
//           value={count}
//           onChange={(ev) => setCount(ev.target.value)}
//         />
//         <input name="id" value={id} onChange={(ev) => setId(ev.target.value)} />
//         <input
//           name="name"
//           value={name}
//           onChange={(ev) => setName(ev.target.value)}
//         />

//         <button type="submit">提交</button>
//       </form>
//     </div>
//   );
// }
// export function UseReducerDemo() {
//   const [info, setInfo] = useState({ count: "", name: "", id: "" });

//   return (
//     <div>
//       <form action={(formData) => console.log(formData.get("name"))}>
//         <input
//           name="count"
//           value={info.count}
//           onChange={(ev) => setInfo({ ...info, count: ev.target.value })}
//         />
//         <input
//           name="id"
//           value={info.id}
//           onChange={(ev) => setInfo({ ...info, id: ev.target.value })}
//         />
//         <input
//           name="name"
//           value={info.name}
//           onChange={(ev) => setInfo({ ...info, name: ev.target.value })}
//         />

//         <button type="submit">提交</button>
//       </form>
//     </div>
//   );
// }
const initialState = { count: "", name: "", id: "" };
const reducer = (
  state: typeof initialState,
  action: { type: "updateName" | "updateId" | "updateCount"; payload: string },
) => {
  switch (action.type) {
    case "updateName":
      return { ...state, name: action.payload };
    case "updateId":
      return { ...state, id: action.payload };
    case "updateCount":
      return { ...state, count: action.payload };
    default:
      throw new Error();
  }
};
export function UseReducerDemo() {
  const [info, dispatch] = useReducer(reducer, initialState);
  console.log("🚀 ~ UseReducerDemo ~ info:", info);

  return (
    <div>
      <form action={(formData) => console.log(formData.get("name"))}>
        <input
          name="count"
          value={info.count}
          onChange={(ev) =>
            dispatch({ type: "updateCount", payload: ev.target.value })
          }
        />
        <input
          name="id"
          value={info.id}
          onChange={(ev) =>
            dispatch({ type: "updateId", payload: ev.target.value })
          }
        />
        <input
          name="name"
          value={info.name}
          onChange={(ev) =>
            dispatch({ type: "updateName", payload: ev.target.value })
          }
        />

        <button type="submit">提交</button>
      </form>
    </div>
  );
}
