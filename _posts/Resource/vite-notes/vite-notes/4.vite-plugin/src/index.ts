// react
// import { createRoot } from "react-dom/client";
// import App from "./App.jsx";

// const app = createRoot(document.getElementById("app")!);
// app.render(<App />);

// vue
import { createApp, defineAsyncComponent } from "vue";
// import App from "./App.vue";
const App = defineAsyncComponent(() => import("./App.vue"));

const app = createApp(App);

app.mount("#app");
