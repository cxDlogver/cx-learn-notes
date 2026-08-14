// react
// import { createRoot } from "react-dom/client";
// import App from "./App.jsx";

// const app = createRoot(document.getElementById("app")!);
// app.render(<App />);

// vue
import { createApp } from "vue";
import App from "./App.vue";

const app = createApp(App);

app.mount("#app");
