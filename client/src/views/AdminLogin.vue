<script setup lang="ts">
import { ref, reactive } from "vue";
import { useRouter } from "vue-router";
import { User, Lock } from "@element-plus/icons-vue";
import { ElMessage } from "element-plus";
import request from "../utils/request";

const router = useRouter();
const loading = ref(false);

const form = reactive({
    username: "",
    password: "",
});

const handleAdminLogin = async () => {
    if (!form.username || !form.password) {
        ElMessage.warning("请输入管理员账号和密码");
        return;
    }

    loading.value = true;
    try {
        const res: any = await request.post("/admin/login", form);

        if (res.code === 200) {
            // 先存储 Admin Token
            localStorage.setItem("admin_token", res.token);
            localStorage.setItem("admin_info", JSON.stringify(res.data));

            ElMessage.success("登录成功");

            // 延迟一下再跳转，确保 localStorage 已更新
            setTimeout(() => {
                router.push({ name: "adminDashboard" });
            }, 100);
        } else {
            // 后端返回非200的错误
            ElMessage.error(res.message || "登录失败");
        }
    } catch (err: any) {
        // 网络错误或其他异常
        // 401/400/403 等错误已经在 request.ts 拦截器中处理了
        // 这里只处理网络连接异常等情况
        if (!err.response) {
            ElMessage.error("网络连接异常，请检查服务器是否启动");
        }
        // 其他错误已经在拦截器中显示过了，这里不再重复显示
    } finally {
        loading.value = false;
    }
};
</script>

<template>
    <div class="admin-login-bg">
        <div class="login-card">
            <h2 class="title">🛡️ 校园集市管理后台</h2>
            <el-form size="large">
                <el-form-item>
                    <el-input v-model="form.username" placeholder="管理员账号" :prefix-icon="User" />
                </el-form-item>
                <el-form-item>
                    <el-input v-model="form.password" type="password" placeholder="密码" :prefix-icon="Lock" show-password
                        @keyup.enter="handleAdminLogin" />
                </el-form-item>
                <el-button type="primary" class="submit-btn" :loading="loading" @click="handleAdminLogin">
                    安全登录
                </el-button>
            </el-form>
            <div class="footer-link">
                <router-link to="/login">返回前台商城</router-link>
            </div>
        </div>
    </div>
</template>

<style scoped>
.admin-login-bg {
    height: 100vh;
    background-color: #2d3a4b;
    display: flex;
    justify-content: center;
    align-items: center;
}

.login-card {
    width: 400px;
    background: #fff;
    padding: 40px;
    border-radius: 4px;
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
}

.title {
    text-align: center;
    margin-bottom: 30px;
    color: #303133;
}

.submit-btn {
    width: 100%;
}

.footer-link {
    margin-top: 15px;
    text-align: right;
    font-size: 14px;
}

.footer-link a {
    color: #909399;
    text-decoration: none;
}
</style>