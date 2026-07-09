import { Hello } from "@/components/Hello";
import React from "react";
import { createRoot } from "react-dom/client";

const render = () => {
  const app = createRoot(document.querySelector("#app")!);
  app.render(<Hello />);
};

render();
