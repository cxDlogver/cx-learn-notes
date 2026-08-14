// 1. 基础 js 文件作为入口，实现简单应用
// document.body.style.background = "yellow";

// 2. 引入 vue 应用，实现简单应用
import { createApp } from "vue";
import App from "./App.vue";

const app = createApp(App);

app.mount("#app");

// 3. 引入 react 应用，来实现简单应用
// import { createRoot } from "react-dom/client";
// import App from "./App.jsx";

// const app = createRoot(document.getElementById("app"));
// app.render(<App />);
