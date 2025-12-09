import { createRouter, createWebHistory } from "vue-router";
import LoginView from "../views/LoginView.vue";
import HomeView from "../views/HomeView.vue";
import MarketList from "../views/MarketList.vue";
import PublishForm from "../views/PublishForm.vue";
import OrderList from "../views/OrderList.vue";
import SellerOrderList from "../views/SellerOrderList.vue"; // 引入卖家订单页
import UserProfile from "../views/UserProfile.vue";
import AdminDashboard from "../views/AdminDashboard.vue";
import ItemAudit from "../views/ItemAudit.vue";
import MessageCenter from "../views/MessageCenter.vue";

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: "/login",
      name: "login",
      component: LoginView,
    },
    {
      path: "/admin",
      name: "admin",
      component: AdminDashboard,
    },
    {
      path: "/",
      name: "home",
      component: HomeView,
      // 子路由配置
      children: [
        {
          path: "", // 默认：商品广场
          name: "market",
          component: MarketList,
        },
        {
          path: "publish", // 我要发布
          name: "publish",
          component: PublishForm,
        },
        {
          path: "orders", // 我买的
          name: "orders",
          component: OrderList,
        },
        {
          path: "sales", // 我卖出的 (新增)
          name: "sales",
          component: SellerOrderList,
        },
        {
          path: "/admin/audit",
          name: "itemAudit",
          component: ItemAudit,
        },
        {
          path: "messages",
          name: "messages",
          component: MessageCenter,
        },
        {
          path: "profile",
          name: "profile",
          component: UserProfile,
        },
      ],
    },
  ],
});

// 全局路由守卫
router.beforeEach((to, from, next) => {
  const token = localStorage.getItem("token");
  if (to.name === "login") {
    next();
  } else if (!token) {
    next({ name: "login" });
  } else {
    next();
  }
});

export default router;
