import axios from "axios";
import { ElMessage } from "element-plus";

// 创建 axios 实例
const request = axios.create({
  baseURL: "http://localhost:3000/api", // 指向我们的后端接口
  timeout: 5000,
});

// 请求拦截器：根据请求URL自动携带对应的 Token
request.interceptors.request.use(
  (config) => {
    // 判断是否为管理员接口（URL 包含 /admin/）
    const isAdminRequest = config.url?.includes("/admin/");

    if (isAdminRequest) {
      // 管理员请求，携带 admin_token
      const adminToken = localStorage.getItem("admin_token");
      if (adminToken) {
        config.headers.Authorization = `Bearer ${adminToken}`;
      }
    } else {
      // 前台请求，携带普通 token
      const token = localStorage.getItem("token");
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// 响应拦截器：根据请求类型分别处理错误
request.interceptors.response.use(
  (response) => response.data,
  (error) => {
    // 判断是否为管理员接口
    const isAdminRequest = error.config?.url?.includes("/admin/");

    // 如果收到 401，说明 Token 过期或未登录
    if (error.response && error.response.status === 401) {
      // 特殊情况：如果是登录接口本身返回401，不要跳转页面
      const isLoginRequest = error.config?.url?.includes("/login");

      if (isLoginRequest) {
        // 登录接口返回401，只显示错误信息，不跳转
        ElMessage.error(error.response?.data?.message || "账号或密码错误");
        return Promise.reject(error);
      }

      if (isAdminRequest) {
        // 管理员 token 失效，跳转到管理员登录页
        ElMessage.error("管理员登录已过期，请重新登录");
        localStorage.removeItem("admin_token");
        localStorage.removeItem("admin_info");
        window.location.href = "/admin/login";
      } else {
        // 前台 token 失效，跳转到前台登录页
        ElMessage.error("登录已过期，请重新登录");
        localStorage.removeItem("token");
        window.location.href = "/login";
      }
    } else if (error.response?.status === 400 || error.response?.status === 403) {
      // 400 或 403 错误，只显示错误信息，不跳转
      ElMessage.error(error.response?.data?.message || "请求失败");
    } else {
      // 其他错误
      ElMessage.error(error.response?.data?.message || "请求失败");
    }
    return Promise.reject(error);
  }
);

export default request;
