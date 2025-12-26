<script setup lang="ts">
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '../stores/user'
import { ElMessage } from 'element-plus'
import { User, Lock, School, Plus } from '@element-plus/icons-vue'
import type { UploadFile } from 'element-plus'

const router = useRouter()
const userStore = useUserStore()

const isLogin = ref(true) // 控制登录/注册切换
const loading = ref(false)

const form = reactive({
    student_id: '',
    username: '',
    password: '',
    confirmPassword: '',
    real_name: ''
})

// 认证图片
const authImage = ref<UploadFile | null>(null)

// 切换模式时重置表单
const toggleMode = () => {
    isLogin.value = !isLogin.value
    form.username = ''
    form.password = ''
    form.confirmPassword = ''
    form.student_id = ''
    form.real_name = ''
    authImage.value = null
}

// 处理图片选择
const handleImageChange = (file: UploadFile) => {
    // 校验文件类型
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif']
    if (file.raw && !allowedTypes.includes(file.raw.type)) {
        ElMessage.warning('只支持 jpg, png, gif 格式的图片')
        return false
    }
    // 校验文件大小 (5MB)
    if (file.raw && file.raw.size > 5 * 1024 * 1024) {
        ElMessage.warning('图片大小不能超过 5MB')
        return false
    }
    authImage.value = file
    return false // 阻止自动上传
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
        if (!authImage.value || !authImage.value.raw) {
            ElMessage.warning('请上传认证材料图片（学生证/工作证）')
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
            const formData = new FormData()
            formData.append('username', form.username)
            formData.append('password', form.password)
            formData.append('student_id', form.student_id)
            formData.append('real_name', form.real_name)
            formData.append('auth_image', authImage.value!.raw!)

            await userStore.register(formData)
            ElMessage.success('注册申请已提交，请等待管理员审核')
            isLogin.value = true // 切换回登录
        }
    } catch (error: any) {
        console.error(error)
    } finally {
        loading.value = false
    }
}

// 跳转到管理员登录
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

                <!-- 认证材料上传 -->
                <el-form-item v-if="!isLogin" class="upload-item">
                    <div class="upload-label">上传认证材料（学生证/工作证）</div>
                    <el-upload class="auth-uploader" :show-file-list="false" :auto-upload="false"
                        :on-change="handleImageChange" accept="image/*">
                        <div v-if="authImage" class="upload-preview">
                            <img :src="authImage.url" alt="认证材料" />
                            <div class="preview-mask">点击更换</div>
                        </div>
                        <div v-else class="upload-placeholder">
                            <el-icon :size="28">
                                <Plus />
                            </el-icon>
                            <span>点击上传</span>
                        </div>
                    </el-upload>
                    <div class="upload-tip">支持 jpg、png、gif 格式，大小不超过 5MB</div>
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
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    position: relative;
    overflow: hidden;
}

.login-container::before {
    content: '';
    position: absolute;
    top: -50%;
    left: -50%;
    width: 200%;
    height: 200%;
    background: radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 60%);
    animation: float 15s ease-in-out infinite;
}

@keyframes float {
    0%, 100% { transform: translate(0, 0) rotate(0deg); }
    50% { transform: translate(30px, 30px) rotate(180deg); }
}

.login-box {
    width: 420px;
    background: rgba(255, 255, 255, 0.95);
    padding: 45px 40px;
    border-radius: 20px;
    box-shadow: 0 25px 50px rgba(0, 0, 0, 0.15);
    backdrop-filter: blur(10px);
    position: relative;
    z-index: 1;
    animation: slideUp 0.5s ease-out;
}

@keyframes slideUp {
    from {
        opacity: 0;
        transform: translateY(30px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
}

.login-header {
    text-align: center;
    margin-bottom: 35px;
}

.login-header h2 {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    font-size: 32px;
    font-weight: 700;
    margin-bottom: 10px;
    letter-spacing: 2px;
}

.login-header p {
    color: #8c8c8c;
    font-size: 14px;
}

.login-box :deep(.el-input__wrapper) {
    border-radius: 10px;
    padding: 8px 15px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
    transition: all 0.3s;
}

.login-box :deep(.el-input__wrapper:hover) {
    box-shadow: 0 4px 12px rgba(102, 126, 234, 0.15);
}

.login-box :deep(.el-input__wrapper.is-focus) {
    box-shadow: 0 4px 12px rgba(102, 126, 234, 0.25);
}

.submit-btn {
    width: 100%;
    margin-top: 15px;
    font-weight: 600;
    height: 46px;
    border-radius: 10px;
    font-size: 16px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    border: none;
    transition: all 0.3s;
    letter-spacing: 2px;
}

.submit-btn:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 25px rgba(102, 126, 234, 0.4);
}

.form-footer {
    margin-top: 25px;
    text-align: center;
}

.toggle-link {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    cursor: pointer;
    font-size: 14px;
    font-weight: 500;
    transition: all 0.3s;
}

.toggle-link:hover {
    opacity: 0.8;
}

.admin-entry {
    margin-top: 30px;
    text-align: center;
}

.admin-entry :deep(.el-button) {
    border-radius: 8px;
}

/* 认证材料上传样式 */
.upload-item {
    width: 100%;
}

.upload-label {
    font-size: 14px;
    color: #606266;
    margin-bottom: 10px;
    font-weight: 500;
}

.auth-uploader {
    width: 100%;
}

.auth-uploader :deep(.el-upload) {
    width: 100%;
}

.upload-placeholder {
    width: 100%;
    height: 130px;
    border: 2px dashed #e0e0e0;
    border-radius: 12px;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    color: #909399;
    cursor: pointer;
    transition: all 0.3s;
    background: #fafafa;
}

.upload-placeholder:hover {
    border-color: #667eea;
    color: #667eea;
    background: rgba(102, 126, 234, 0.05);
}

.upload-placeholder span {
    margin-top: 10px;
    font-size: 14px;
}

.upload-preview {
    width: 100%;
    height: 130px;
    border: 2px solid #e0e0e0;
    border-radius: 12px;
    overflow: hidden;
    position: relative;
    cursor: pointer;
}

.upload-preview img {
    width: 100%;
    height: 100%;
    object-fit: cover;
}

.preview-mask {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(102, 126, 234, 0.7);
    display: flex;
    justify-content: center;
    align-items: center;
    color: #fff;
    font-size: 14px;
    font-weight: 500;
    opacity: 0;
    transition: opacity 0.3s;
}

.upload-preview:hover .preview-mask {
    opacity: 1;
}

.upload-tip {
    font-size: 12px;
    color: #909399;
    margin-top: 10px;
}
</style>