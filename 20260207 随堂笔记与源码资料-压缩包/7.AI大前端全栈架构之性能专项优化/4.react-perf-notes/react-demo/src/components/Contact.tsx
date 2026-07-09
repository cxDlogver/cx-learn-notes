// import { useEffect, useReducer } from "react";
// import { produce } from "immer";

// const initialState = { todos: [] };

// // 使用 Immer 编写 reducer
// const reducer = (state = initialState, action) => {
//   return produce(state, (draft) => {
//     switch (action.type) {
//       case "ADD_TODO":
//         draft.todos.push({ id: Date.now(), text: action.payload });
//         break;
//       case "TOGGLE_TODO":
//         const todo = draft.todos.find((todo) => todo.id === action.payload);
//         if (todo) todo.completed = !todo.completed;
//         break;
//       default:
//         break;
//     }
//   });
// };

// const ContactContent = ({ state, addTodo, toggleTodo }) => {

//   useEffect(() => {
//     console.log(state);
//   }, [state]);
//   return (
//     <div>
//       <h1>Contact</h1>
//       <input
//         type="text"
//         placeholder="Add a new todo"
//         onKeyPress={(e) => e.key === "Enter" && addTodo(e.target.value)}
//       />
//       <button onClick={() => addTodo("")}>Add</button>
//       <ul>
//         {state.todos.map((todo) => (
//           <li key={todo.id}>
//             {todo.text}
//             <input
//               onClick={() => toggleTodo(todo.id)}
//               type="checkbox"
//               checked={todo.completed}
//             />
//           </li>
//         ))}
//       </ul>
//     </div>
//   );
// }

// const Contact = () => {
//   // 组件中使用 Immer
//   const [state, dispatch] = useReducer(reducer, initialState);

//   const addTodo = (text) => dispatch({ type: "ADD_TODO", payload: text });
//   const toggleTodo = (id) => dispatch({ type: "TOGGLE_TODO", payload: id });

//   return (
//     <ContactContent state={state} addTodo={addTodo} toggleTodo={toggleTodo} />
//   );
// };
// export default Contact;
import { useTodoStore } from "../stores/todoStore";

const ContactItem = ({ index }) => {
  const todo = useTodoStore((state) => state.todos[index]);
  const toggleTodo = useTodoStore((state) => state.toggleTodo);
  
  return (
    <li key={todo.id}>
      {todo.text}
      <input
        onClick={() => toggleTodo(todo.id)}
        type="checkbox"
        checked={todo.completed}
      />
    </li>
  );
};

const ContactContent = () => {
  const todosCount = useTodoStore((state) => {
    return state.todos.length;
  });
  console.log("🚀 ~ ContactContent ~ todosCount:", todosCount);

  return (
    <div>
      <ul>
        {Array.from({ length: todosCount }).map((_, index) => (
          <ContactItem key={index} index={index} />
        ))}
      </ul>
    </div>
  );
};

const Contact = () => {
  const addTodo = useTodoStore((state) => state.addTodo);

  return (
    <>
      <h1>Contact</h1>
      <input
        type="text"
        placeholder="Add a new todo"
        onKeyPress={(e) => e.key === "Enter" && addTodo(e.target.value)}
      />
      <button onClick={() => addTodo("")}>Add</button>
      <ContactContent />
    </>
  );
};
export default Contact;
