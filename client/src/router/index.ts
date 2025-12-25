import { createRouter, createWebHistory } from "vue-router";
import HomeView from "../views/HomeView.vue";
import AdminLayout from "../layouts/AdminLayout.vue";

// 引入前台页面
import LoginView from "../views/LoginView.vue";
import MarketList from "../views/MarketList.vue";
import PublishForm from "../views/PublishForm.vue";
import OrderList from "../views/OrderList.vue";
import SellerOrderList from "../views/SellerOrderList.vue";
import UserProfile from "../views/UserProfile.vue";
import ItemDetail from "../views/ItemDetail.vue";
import MessageCenter from "../views/MessageCenter.vue";
import AddressManage from "../views/AddressManage.vue";

// 引入后台页面
import AdminLogin from "../views/AdminLogin.vue";
import AdminDashboard from "../views/AdminDashboard.vue";
import ItemAudit from "../views/ItemAudit.vue";
// 后续如果加上 ComplaintManage 等，请在这里引入

import { useUserStore } from "../stores/user";

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    // =========== 1. 前台路由 ===========
    {
      path: "/login",
      name: "login",
      component: LoginView,
    },
    {
      path: "/",
      component: HomeView, // 前台布局
      children: [
        { path: "", name: "market", component: MarketList },
        { path: "market/:id", name: "itemDetail", component: ItemDetail },
        { path: "publish", name: "publish", component: PublishForm },
        { path: "orders", name: "orders", component: OrderList },
        { path: "sales", name: "sales", component: SellerOrderList },
        { path: "messages", name: "messages", component: MessageCenter },
        { path: "profile", name: "profile", component: UserProfile },
        { path: "addresses", name: "addresses", component: AddressManage },
      ],
    },

    // =========== 2. 后台路由 (完全独立) ===========
    {
      path: "/admin/login",
      name: "adminLogin",
      component: AdminLogin,
      meta: { isPublic: true }, // 标记为公开访问
    },
    {
      path: "/admin",
      component: AdminLayout, // 后台布局
      meta: { requiresAdmin: true }, // 标记需要管理员权限
      children: [
        { path: "", name: "adminDashboard", component: AdminDashboard },
        { path: "audit", name: "itemAudit", component: ItemAudit },
        // 这里可以继续添加 users, complaints 等路由
      ],
    },
  ],
});

// =========== 3. 全局路由守卫 (核心修复) ===========
router.beforeEach(async (to, _from, next) => {
  // ------------------------------------------------
  // 情况 A: 访问后台页面 (以 /admin 开头，排除登录页)
  // ------------------------------------------------
  if (to.path.startsWith("/admin") && to.path !== "/admin/login") {
    const adminToken = localStorage.getItem("admin_token");
    if (!adminToken) {
      // 没 Token，去后台登录页
      next("/admin/login");
    } else {
      // 有 Token，放行
      next();
    }
    return; // ⚠️ 重要：处理完后台逻辑直接 return，不再执行后面的代码
  }

  // ------------------------------------------------
  // 情况 B: 访问前台页面
  // ------------------------------------------------

  // 1. 如果去的是前台或后台登录页，直接放行
  if (to.path === "/login" || to.path === "/admin/login") {
    next();
    return;
  }

  const token = localStorage.getItem("token");

  // 2. 如果没有前台 Token，强制去前台登录
  if (!token) {
    next({ name: "login" });
    return;
  }

  // 3. 尝试恢复用户信息 (防止刷新页面丢失 Store 数据)
  // ⚠️ 修复点：确保这里只在前台路由触发
  const userStore = useUserStore();
  if (!userStore.userInfo) {
    try {
      await userStore.fetchUserInfo();
    } catch (e) {
      // 如果 Token 过期或无效，request.ts 可能会自动跳登录，或者这里手动处理
      console.error("前台 Token 失效", e);
      // 可选：localStorage.removeItem("token"); next({ name: "login" });
    }
  }

  next();
});

export default router;
