import "./assets/main.css";

import { createApp } from "vue";
import { createPinia } from "pinia";
import App from "./App.vue";
import { createLogger } from "./pinia/plugins/createLogger";

const pinia = createPinia();

pinia.use(createLogger())

createApp(App).use(pinia).mount("#app");
