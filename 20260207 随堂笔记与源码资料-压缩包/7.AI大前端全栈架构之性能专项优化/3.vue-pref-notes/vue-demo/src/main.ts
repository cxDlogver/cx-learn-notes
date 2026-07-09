import { createApp, defineAsyncComponent } from "vue";
import { createRouter, createWebHistory } from "vue-router";
import { createPinia } from "pinia";
// import Home from "./components/Home.vue";
// import About from "./components/About.vue";

const Home = defineAsyncComponent(() => import("./components/Home.vue"));
const About = defineAsyncComponent(() => import("./components/About.vue"));

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: "/home",
      component: Home,
    },
    {
      path: "/about",
      component: About,
    },
  ],
});

import "./style.css";
import App from "./App.vue";
import { createPersistedStatePlugin } from "./plugins/persiste";

const app = createApp(App);

const pinia = createPinia();

pinia.use(createPersistedStatePlugin());

app.use(router);
app.use(pinia);

app.mount("#app");
