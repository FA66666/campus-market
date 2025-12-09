<template>
    <div class="login-wrapper">
        <div class="login-box shadow-lg">
            <div class="login-banner">
                <div class="banner-content">
                    <h1>校园二手街</h1>
                    <p>University Second-Hand Market</p>
                    <p class="sub-text">安全 · 便捷 · 校内直达</p>
                </div>
            </div>

            <div class="login-form-container">
                <div class="form-header">
                    <h2>{{ isLogin ? '用户登录' : '注册新账号' }}</h2>
                    <div class="switch-type">
                        <span v-if="isLogin">还没有账号？<a @click="toggleMode">立即注册</a></span>
                        <span v-else>已有账号？<a @click="toggleMode">去登录</a></span>
                    </div>
                </div>

                <el-form v-if="isLogin" ref="loginRef" :model="loginForm" size="large" @keyup.enter="handleLogin">
                    <el-form-item>
                        <el-input v-model="loginForm.username" placeholder="请输入用户名/学号" :prefix-icon="User" />
                    </el-form-item>
                    <el-form-item>
                        <el-input v-model="loginForm.password" type="password" placeholder="请输入密码" :prefix-icon="Lock"
                            show-password />
                    </el-form-item>
                    <el-button type="primary" class="w-100 submit-btn" @click="handleLogin" :loading="loading">
                        立即登录
                    </el-button>
                </el-form>

                <el-form v-else ref="regRef" :model="regForm" size="large">
                    <el-form-item>
                        <el-input v-model="regForm.username" placeholder="设置用户名 (英文/数字)" :prefix-icon="User" />
                    </el-form-item>
                    <el-form-item>
                        <el-input v-model="regForm.password" type="password" placeholder="设置登录密码" :prefix-icon="Lock" />
                    </el-form-item>
                    <el-form-item>
                        <el-input v-model="regForm.real_name" placeholder="真实姓名" :prefix-icon="CreditCard" />
                    </el-form-item>
                    <el-form-item>
                        <el-input v-model="regForm.student_id" placeholder="学号 (作为唯一凭证)" :prefix-icon="School" />
                    </el-form-item>
                    <el-button type="success" class="w-100 submit-btn" @click="handleRegister" :loading="loading">
                        注册并登录
                    </el-button>
                </el-form>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue';
import { useUserStore } from '../stores/user';
import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import { User, Lock, School, CreditCard } from '@element-plus/icons-vue';

const isLogin = ref(true);
const loading = ref(false);
const userStore = useUserStore();
const router = useRouter();

const loginForm = reactive({ username: '', password: '' });
const regForm = reactive({ username: '', password: '', real_name: '', student_id: '' });

const toggleMode = () => {
    isLogin.value = !isLogin.value;
    // 清空表单错误状态等（可选）
};

// 调试用的登录函数
const handleLogin = async () => {
    if (!loginForm.username || !loginForm.password) {
        return ElMessage.warning('账号和密码不能为空');
    }

    loading.value = true;
    console.log('正在尝试登录...', loginForm); // F12 Console 查看日志

    try {
        const success = await userStore.login(loginForm);
        if (success) {
            ElMessage.success('登录成功');
            router.push('/');
        } else {
            // 具体的错误信息已经在 request.ts 拦截器中弹出了
            console.error('登录返回 false');
        }
    } catch (error) {
        console.error('登录过程发生异常:', error);
    } finally {
        loading.value = false;
    }
};

const handleRegister = async () => {
    if (!regForm.username || !regForm.password || !regForm.student_id) {
        return ElMessage.warning('请填写所有必填项');
    }
    loading.value = true;
    try {
        await userStore.register(regForm);
        ElMessage.success('注册成功，请直接登录');
        isLogin.value = true;
    } catch (error) {
        console.error(error);
    } finally {
        loading.value = false;
    }
};
</script>

<style scoped>
.login-wrapper {
    display: flex;
    justify-content: center;
    align-items: center;
    height: 100vh;
    width: 100vw;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    /* 深色背景更显专业 */
}

.login-box {
    display: flex;
    width: 900px;
    /* PC端宽度 */
    height: 550px;
    background: #fff;
    border-radius: 12px;
    overflow: hidden;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
}

/* 左侧 Banner */
.login-banner {
    width: 50%;
    background: url('https://source.unsplash.com/random/800x1200/?university,library') no-repeat center center;
    background-size: cover;
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
}

.login-banner::after {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(58, 80, 107, 0.7);
    /* 遮罩层 */
}

.banner-content {
    position: relative;
    z-index: 2;
    color: #fff;
    text-align: center;
}

.banner-content h1 {
    font-size: 2.5rem;
    margin-bottom: 10px;
}

.banner-content p {
    font-size: 1.2rem;
    opacity: 0.9;
}

.sub-text {
    margin-top: 20px;
    font-size: 0.9rem;
    letter-spacing: 2px;
}

/* 右侧 Form */
.login-form-container {
    width: 50%;
    padding: 40px 50px;
    display: flex;
    flex-direction: column;
    justify-content: center;
}

.form-header {
    margin-bottom: 30px;
    text-align: left;
}

.form-header h2 {
    font-size: 24px;
    color: #333;
    margin-bottom: 10px;
}

.switch-type {
    font-size: 14px;
    color: #666;
}

.switch-type a {
    color: #409EFF;
    cursor: pointer;
    text-decoration: none;
    margin-left: 5px;
}

.submit-btn {
    padding: 22px 0;
    font-size: 16px;
    border-radius: 6px;
    margin-top: 10px;
}

.w-100 {
    width: 100%;
}
</style>