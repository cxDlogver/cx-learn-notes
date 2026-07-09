import { useCallback, useReducer } from "react";

const initialState = {
  count: 0,
  name: "",
  age: 10,
};

const reducer = (state, action) => {
  switch (action.type) {
    case "updateCount": {
      return { ...state, count: action.count };
    }
    case "updateName": {
      return { ...state, name: action.name };
    }
    case "updateAge": {
      return { ...state, age: action.age };
    }
  }
};

export function UseReducer() {
  // const [person, setPerson] = useState();
  const [state, dispatch] = useReducer(reducer, initialState);

  const handleClick = useCallback(() => {
    // setCount((c) => c + 1);
    // setPerson((c) => ({ ...c, count: 1 }));
    dispatch({ type: "updateCount", count: 100 });
    // setPerson((c) => ({ ...c, name: "1" }));
    // setPerson((c) => ({ ...c, age: 18 }));
  }, []);
  return (
    <div>
      <div>{state.count}</div>
      <button onClick={handleClick}>+</button>
    </div>
  );
}
