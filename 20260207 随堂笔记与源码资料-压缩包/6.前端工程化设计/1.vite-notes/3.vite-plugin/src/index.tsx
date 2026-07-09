// document.body.style.backgroundColor = "red";
import React, { Suspense, useState } from "react";
import { createRoot } from "react-dom/client";
// import { Header } from "@/components/Header";
const Header = React.lazy(() => import("./components/Header"));

const App = () => {
  const [count, setCount] = useState(0);
  return (
    <div onClick={() => setCount(count + 1)}>
      <Suspense>
        <Header /> {count}
      </Suspense>
    </div>
  );
};

const app = createRoot(document.querySelector("#app")!);

app.render(<App />);
