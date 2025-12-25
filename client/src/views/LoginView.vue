<script setup lang="ts">
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '../stores/user'
import { ElMessage } from 'element-plus'
import { User, Lock, School } from '@element-plus/icons-vue' // 引入 School 图标

const router = useRouter()
const userStore = useUserStore()

const isLogin = ref(true) // 控制登录/注册切换
const loading = ref(false)

const form = reactive({
    student_id: '',
    username: '',
    password: '',
    confirmPassword: '',
    real_name: '' // 注册时需要
})

// 切换模式时重置表单
const toggleMode = () => {
    isLogin.value = !isLogin.value
    form.username = ''
    form.password = ''
    form.confirmPassword = ''
    form.student_id = ''
    form.real_name = ''
}

const handleSubmit = async () => {
    // 简单校验
    if (!form.username || !form.password) {
        ElMessage.warning('请输入账号和密码')
        return
    }

    if (!isLogin.value) {
        // 注册校验
        if (form.password !== form.confirmPassword) {
            ElMessage.warning('两次密码输入不一致')
            return
        }
        if (!form.student_id || !form.real_name) {
            ElMessage.warning('请补全学号和真实姓名')
            return
        }
    }

    loading.value = true
    try {
        if (isLogin.value) {
            // --- 登录逻辑 ---
            await userStore.login({
                username: form.username,
                password: form.password
            })
            ElMessage.success('登录成功，欢迎回来！')
            router.push('/')
        } else {
            // --- 注册逻辑 ---
            await userStore.register({
                username: form.username,
                password: form.password,
                student_id: form.student_id,
                real_name: form.real_name
            })
            ElMessage.success('注册成功，请登录')
            isLogin.value = true // 切换回登录
        }
    } catch (error: any) {
        // 错误已经在 store 或 request 中处理了一部分，这里兜底
        console.error(error)
    } finally {
        loading.value = false
    }
}

// ✅ 跳转到管理员登录
const goToAdmin = () => {
    router.push({ name: 'adminLogin' })
}
</script>

<template>
    <div class="login-container">
        <div class="login-box">
            <div class="login-header">
                <h2>🛍️ 校园二手街</h2>
                <p>{{ isLogin ? '账号登录' : '新用户注册' }}</p>
            </div>

            <el-form size="large" class="login-form">
                <el-form-item v-if="!isLogin">
                    <el-input v-model="form.student_id" placeholder="学号/工号" :prefix-icon="School" />
                </el-form-item>

                <el-form-item v-if="!isLogin">
                    <el-input v-model="form.real_name" placeholder="真实姓名 (实名认证用)" :prefix-icon="User" />
                </el-form-item>

                <el-form-item>
                    <el-input v-model="form.username" placeholder="用户名/账号" :prefix-icon="User" />
                </el-form-item>

                <el-form-item>
                    <el-input v-model="form.password" type="password" placeholder="密码" :prefix-icon="Lock" show-password
                        @keyup.enter="handleSubmit" />
                </el-form-item>

                <el-form-item v-if="!isLogin">
                    <el-input v-model="form.confirmPassword" type="password" placeholder="确认密码" :prefix-icon="Lock"
                        show-password />
                </el-form-item>

                <el-button type="primary" class="submit-btn" :loading="loading" @click="handleSubmit">
                    {{ isLogin ? '立即登录' : '注册账号' }}
                </el-button>

                <div class="form-footer">
                    <span @click="toggleMode" class="toggle-link">
                        {{ isLogin ? '没有账号？去注册' : '已有账号？去登录' }}
                    </span>
                </div>
            </el-form>

            <div class="admin-entry">
                <el-divider>如果是管理员</el-divider>
                <el-button text bg size="small" @click="goToAdmin">
                    进入后台管理系统
                </el-button>
            </div>
        </div>
    </div>
</template>

<style scoped>
.login-container {
    height: 100vh;
    display: flex;
    justify-content: center;
    align-items: center;
    background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
    /* 简单的背景渐变 */
}

.login-box {
    width: 420px;
    background: #fff;
    padding: 40px;
    border-radius: 12px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
}

.login-header {
    text-align: center;
    margin-bottom: 30px;
}

.login-header h2 {
    color: #409eff;
    font-size: 28px;
    margin-bottom: 10px;
}

.login-header p {
    color: #909399;
}

.submit-btn {
    width: 100%;
    margin-top: 10px;
    font-weight: bold;
}

.form-footer {
    margin-top: 20px;
    text-align: center;
}

.toggle-link {
    color: #409eff;
    cursor: pointer;
    font-size: 14px;
}

.toggle-link:hover {
    text-decoration: underline;
}

/* ✅ 管理员入口样式 */
.admin-entry {
    margin-top: 30px;
    text-align: center;
}
</style>