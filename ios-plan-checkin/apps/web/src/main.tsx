import { createRoot } from "react-dom/client";
import { penColors } from "@plan-checkin/design-tokens";
import { App } from "./app/App";
import "./styles.css";

const mount = document.getElementById("root");
if (!mount) throw new Error("Web root element is missing");
for (const [name, value] of Object.entries(penColors))
  document.documentElement.style.setProperty(`--pen-${name}`, value);
createRoot(mount).render(<App />);
