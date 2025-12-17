import { createRouter, createWebHistory } from "vue-router";
import LoginView from "../views/LoginView.vue";
import HomeView from "../views/HomeView.vue";
import MarketList from "../views/MarketList.vue";
import PublishForm from "../views/PublishForm.vue";
import OrderList from "../views/OrderList.vue";
import SellerOrderList from "../views/SellerOrderList.vue";
import UserProfile from "../views/UserProfile.vue";
import AdminDashboard from "../views/AdminDashboard.vue";
import ItemAudit from "../views/ItemAudit.vue";
import MessageCenter from "../views/MessageCenter.vue";
// ✅ 引入 user store
import { useUserStore } from "../stores/user";

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
      children: [
        {
          path: "",
          name: "market",
          component: MarketList,
        },
        {
          path: "publish",
          name: "publish",
          component: PublishForm,
        },
        {
          path: "orders",
          name: "orders",
          component: OrderList,
        },
        {
          path: "sales",
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
router.beforeEach(async (to, _from, next) => {
  const token = localStorage.getItem("token");

  // 1. 如果去登录页，直接放行
  if (to.name === "login") {
    next();
    return;
  }

  // 2. 如果没有 Token，强制跳登录
  if (!token) {
    next({ name: "login" });
    return;
  }

  // 3. ✅ 关键修改：如果有 Token 但没有用户信息 (说明是刷新了页面)，尝试恢复数据
  const userStore = useUserStore();
  if (!userStore.userInfo) {
    try {
      await userStore.fetchUserInfo();
    } catch (e) {
      // 获取失败可能是 Token 过期，拦截器会处理，这里不用管
    }
  }

  // 4. 放行
  next();
});

export default router;
