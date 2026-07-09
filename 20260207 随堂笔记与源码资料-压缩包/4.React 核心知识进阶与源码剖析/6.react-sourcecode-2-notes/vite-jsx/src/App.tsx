import { useState } from "react";
import "./App.css";

function App() {
  const [count, setCount] = useState({ user: "heyi" });

  return (
    <div>
      <span>妙码-{JSON.stringify(count)}</span>
      <span>合一</span>
    </div>
  );
}

export default App;
