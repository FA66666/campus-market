import { defineStore } from "pinia";
import { ref } from "vue";
import request from "../utils/request";

export const useUserStore = defineStore("user", () => {
  const token = ref<string>(localStorage.getItem("token") || "");
  const userInfo = ref<any>(null);

  // 登录动作
  const login = async (loginForm: any) => {
    try {
      const res: any = await request.post("/auth/login", loginForm);
      token.value = res.token;
      userInfo.value = res.user;

      localStorage.setItem("token", res.token);
      return true;
    } catch (error) {
      return false;
    }
  };

  // 注册动作
  const register = async (registerForm: any) => {
    await request.post("/auth/register", registerForm);
  };

  // 登出
  const logout = () => {
    token.value = "";
    userInfo.value = null;
    localStorage.removeItem("token");
  };

  // ✅ 新增：恢复用户信息 (用于刷新页面后)
  const fetchUserInfo = async () => {
    if (!token.value) return;
    try {
      // 调用之前写好的获取个人资料接口
      const res: any = await request.get("/users/profile");
      if (res.code === 200) {
        userInfo.value = res.data;
      }
    } catch (error) {
      console.error("获取用户信息失败", error);
      // 如果 Token 过期或无效，这里可以选择登出
      // logout();
    }
  };

  return { token, userInfo, login, register, logout, fetchUserInfo };
});
