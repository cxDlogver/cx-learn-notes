import "./assets/main.css";

import { createApp } from "vue";
import App from "./App.vue";
import { router } from "./router";

const app = createApp(App);

// vue 插件化体系注册路由
app.use(router)

app.mount("#app");
