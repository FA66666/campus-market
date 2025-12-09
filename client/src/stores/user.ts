import { defineStore } from "pinia";
import { ref } from "vue";
import request from "../utils/request";

export const useUserStore = defineStore("user", () => {
  const token = ref<string>(localStorage.getItem("token") || "");
  const userInfo = ref<any>(null);

  // 登录动作
  const login = async (loginForm: any) => {
    try {
      // 调用后端接口 /api/auth/login
      const res: any = await request.post("/auth/login", loginForm);
      token.value = res.token;
      userInfo.value = res.user;

      // 持久化存储 Token
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

  return { token, userInfo, login, register, logout };
});
