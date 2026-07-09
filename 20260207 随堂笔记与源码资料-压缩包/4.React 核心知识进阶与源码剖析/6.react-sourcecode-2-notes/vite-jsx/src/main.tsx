import { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
// import App from './App.tsx'

const app = createRoot(document.getElementById("root")!);
console.log("🚀 ~ app:", app);

// eslint-disable-next-line react-refresh/only-export-components
function App() {
  const [count] = useState({ user: "heyi" });
  const [age, setAge] = useState(18);
  const [info] = useState(0);

  useEffect(() => {
    console.log(age)
  }, [age])

  return (
    <div>
      <span>
        妙码-{JSON.stringify(count)}---{age}---{info}
      </span>
      <span>合一</span>
      <button
        onClick={() => {
          setAge((age) => age + 1);
          console.log(app);
        }}
      >
        +
      </button>
    </div>
  );
}

console.log("🚀 ~ <App />:", <App />);
app.render(<App />);
// app.render(
//   <StrictMode>
//     <App />
//   </StrictMode>,
// );
