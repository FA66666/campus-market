<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import request from '../utils/request'
import { useUserStore } from '../stores/user'

const user = ref<any>({})
const userStore = useUserStore()
const router = useRouter()
const isEditing = ref(false)
const editForm = ref({ real_name: '', auth_material: '' })

const fetchProfile = async () => {
    try {
        const res: any = await request.get('/users/profile')
        if (res.code === 200) {
            user.value = res.data
            editForm.value.real_name = res.data.real_name
            editForm.value.auth_material = res.data.auth_material
        }
    } catch (err) {
        console.error(err)
    }
}

const updateProfile = async () => {
    try {
        const res: any = await request.put('/users/profile', editForm.value)
        if (res.code === 200) {
            alert('更新成功')
            isEditing.value = false
            fetchProfile()
        }
    } catch (err) {
        alert('更新失败')
    }
}

// 账号注销
const cancelAccount = async () => {
    const confirm1 = confirm('警告：注销后您将无法再次登录该账号！')
    if (!confirm1) return
    const confirm2 = confirm('确定要继续吗？您的数据将保留但账号将永久停用。')
    if (!confirm2) return

    try {
        const res: any = await request.post('/users/cancel')
        if (res.code === 200) {
            alert(res.message)
            // 修复：Store 中没有 clearUser，应使用 logout
            userStore.logout()
            router.push('/login')
        }
    } catch (err) {
        alert('注销失败')
    }
}

const logout = () => {
    // 修复：同上
    userStore.logout()
    router.push('/login')
}

onMounted(() => {
    fetchProfile()
})
</script>

<template>
    <div class="profile-container">
        <h2>个人中心</h2>
        <div class="card">
            <div v-if="!isEditing">
                <p><strong>用户名:</strong> {{ user.username }}</p>
                <p><strong>学号:</strong> {{ user.student_id }}</p>
                <p><strong>真实姓名:</strong> {{ user.real_name }}</p>
                <p><strong>信誉积分:</strong> <span class="score">{{ user.credit_score }}</span></p>
                <p><strong>状态:</strong> {{ user.status === 1 ? '正常' : '异常' }}</p>

                <div class="actions">
                    <button @click="isEditing = true" class="btn-primary">编辑资料</button>
                    <button @click="logout" class="btn-default">退出登录</button>
                </div>
            </div>

            <div v-else class="edit-mode">
                <div class="form-group">
                    <label>真实姓名:</label>
                    <input v-model="editForm.real_name" />
                </div>
                <div class="form-group">
                    <label>认证材料(URL):</label>
                    <input v-model="editForm.auth_material" placeholder="请输入图片链接" />
                </div>
                <div class="actions">
                    <button @click="updateProfile" class="btn-success">保存</button>
                    <button @click="isEditing = false" class="btn-default">取消</button>
                </div>
            </div>
        </div>

        <div class="danger-zone">
            <h3>危险区域</h3>
            <button @click="cancelAccount" class="btn-danger">注销账号</button>
        </div>
    </div>
</template>

<style scoped>
.profile-container {
    max-width: 600px;
    margin: 20px auto;
    padding: 20px;
}

.card {
    background: #f9f9f9;
    padding: 20px;
    border-radius: 8px;
    margin-bottom: 30px;
}

.score {
    color: #67c23a;
    font-weight: bold;
}

.actions {
    margin-top: 20px;
    display: flex;
    gap: 10px;
}

.form-group {
    margin-bottom: 15px;
}

.form-group label {
    display: block;
    margin-bottom: 5px;
    font-weight: bold;
}

.form-group input {
    width: 100%;
    padding: 8px;
}

.danger-zone {
    border: 1px solid #f56c6c;
    padding: 20px;
    border-radius: 8px;
    background: #fef0f0;
}

.danger-zone h3 {
    color: #f56c6c;
    margin-top: 0;
}

button {
    padding: 8px 16px;
    cursor: pointer;
    border-radius: 4px;
    border: 1px solid #ccc;
}

.btn-primary {
    background: #409eff;
    color: white;
    border: none;
}

.btn-success {
    background: #67c23a;
    color: white;
    border: none;
}

.btn-danger {
    background: #f56c6c;
    color: white;
    border: none;
}

.btn-default {
    background: white;
}
</style>