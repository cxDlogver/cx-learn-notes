import { createRoot } from "react-dom/client";
import { App } from "./app/App";
import "./styles.css";

const mount = document.getElementById("root");
if (!mount) throw new Error("Web root element is missing");
createRoot(mount).render(<App />);
