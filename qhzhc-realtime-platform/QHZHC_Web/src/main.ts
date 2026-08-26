import Vue from "vue";
import axios from "axios";
import * as echarts from "echarts";
import ElementUI from "element-ui";
import "element-ui/lib/theme-chalk/index.css";
import "qweather-icons/font/qweather-icons.css";
import App from "./App.vue";
import router from "./router";
import store from "./store";
import "./assets/css/reset.scss";
import "./assets/icon/iconfont.css";
import "./assets/weather-icon/iconfont.css";
import "@/assets/weather-icon/iconfont.js";
import "./assets/css/text.css";
import "./assets/css/global.scss";
import "./assets/css/map-runtime-fixes.scss";

Vue.config.productionTip = false;
Vue.prototype.$axios = axios;
Vue.prototype.$echarts = echarts;
Vue.use(ElementUI);

new Vue({
  router,
  store,
  render: (createElement) => createElement(App),
  beforeCreate() {
    Vue.prototype.$bus = this;
  },
}).$mount("#app");
