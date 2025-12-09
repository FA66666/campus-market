import { createApp } from "vue";
import { createPinia } from "pinia";
import ElementPlus from "element-plus";
import "element-plus/dist/index.css"; // 引入 Element Plus 样式
import App from "./App.vue";
import router from "./router";

import "./style.css"; // 也可以保留默认样式

const app = createApp(App);

app.use(createPinia());
app.use(router);
app.use(ElementPlus); // 注册 Element Plus

app.mount("#app");
