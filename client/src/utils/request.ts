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
    // 判断是否为管理员接口（URL 包含 /admin/ 或 /stats/）
    const isAdminRequest =
      config.url?.includes("/admin/") || config.url?.includes("/stats/");

    // 也可以根据当前页面路径判断（如果在管理员页面，就使用admin_token）
    const isAdminPage = window.location.pathname.startsWith("/admin");

    if (isAdminRequest || isAdminPage) {
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
    // 获取请求 URL，确保安全访问
    const requestUrl = error.config?.url || "";

    // 判断请求类型
    const isAdminRequest = requestUrl.includes("/admin/");
    // 只要 URL 包含 /login，就认为是登录接口（涵盖了 /login 和 /admin/login）
    const isLoginRequest = requestUrl.includes("/login");

    // 如果收到 401，说明 Token 过期或未登录
    if (error.response && error.response.status === 401) {
      // 1. 如果是登录接口本身返回 401，说明是账号密码错误，绝对不要跳转
      if (isLoginRequest) {
        ElMessage.error(error.response?.data?.message || "账号或密码错误");
        return Promise.reject(error);
      }

      // 2. 如果是其他接口返回 401，说明 Token 失效，需要处理跳转
      if (isAdminRequest) {
        // 管理员 token 失效
        // 关键修复：如果当前已经在管理员登录页，不要再执行跳转（防止页面刷新）
        if (!window.location.pathname.includes("/admin/login")) {
          ElMessage.error("管理员登录已过期，请重新登录");
          localStorage.removeItem("admin_token");
          localStorage.removeItem("admin_info");
          window.location.href = "/admin/login";
        }
      } else {
        // 前台 token 失效
        // 关键修复：如果当前已经在前台登录页，不要再执行跳转
        if (!window.location.pathname.includes("/login")) {
          ElMessage.error("登录已过期，请重新登录");
          localStorage.removeItem("token");
          window.location.href = "/login";
        }
      }
    } else if (
      error.response?.status === 400 ||
      error.response?.status === 403
    ) {
      // 400 或 403 错误，只显示错误信息，不跳转
      ElMessage.error(error.response?.data?.message || "请求失败");
    } else {
      // 其他错误
      ElMessage.error(error.response?.data?.message || "网络连接异常");
    }
    return Promise.reject(error);
  }
);

export default request;
