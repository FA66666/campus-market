<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import request from '../utils/request'
import { useUserStore } from '../stores/user'
import { ElMessage, ElMessageBox } from 'element-plus'

// 评价接口
interface Review {
    review_id: number
    order_id: number
    rating: number
    content: string
    created_at: string
    reviewer_name: string
}

const user = ref<any>({})
const userStore = useUserStore()
const router = useRouter()
const isEditing = ref(false)
const editForm = ref({ real_name: '', auth_material: '' })

// 评价相关
const reviews = ref<Review[]>([])
const avgRating = ref(0)
const reviewsLoading = ref(false)

const fetchProfile = async () => {
    try {
        const res: any = await request.get('/users/profile')
        if (res.code === 200) {
            user.value = res.data
            editForm.value.real_name = res.data.real_name
            editForm.value.auth_material = res.data.auth_material
            // 获取用户收到的评价
            fetchReviews(res.data.user_id)
        }
    } catch (err) {
        console.error(err)
    }
}

// 获取用户收到的评价
const fetchReviews = async (userId: number) => {
    reviewsLoading.value = true
    try {
        const res: any = await request.get(`/reviews/users/${userId}`)
        if (res.code === 200) {
            reviews.value = res.data.reviews || []
            avgRating.value = res.data.avgRating || 0
        }
    } catch (error) {
        console.error('获取评价失败:', error)
    } finally {
        reviewsLoading.value = false
    }
}

const updateProfile = async () => {
    try {
        const res: any = await request.put('/users/profile', editForm.value)
        if (res.code === 200) {
            ElMessage.success('更新成功')
            isEditing.value = false
            fetchProfile()
        }
    } catch (err) {
        ElMessage.error('更新失败')
    }
}

// 账号注销
const cancelAccount = async () => {
    try {
        await ElMessageBox.confirm(
            '确定要继续吗？您的数据将保留但账号将永久停用。注销后您将无法再次登录该账号！',
            '危险操作警告',
            {
                confirmButtonText: '确定注销',
                cancelButtonText: '取消',
                type: 'error',
                draggable: true
            }
        )

        const res: any = await request.post('/users/cancel')
        if (res.code === 200) {
            ElMessage.success(res.message)
            userStore.logout()
            router.push('/login')
        }
    } catch (err) {
        if (err !== 'cancel') ElMessage.error('注销失败')
    }
}

const logout = () => {
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
        <el-card class="box-card">
            <template #header>
                <div class="card-header">
                    <span>我的资料</span>
                    <el-button v-if="!isEditing" type="primary" link @click="isEditing = true">编辑资料</el-button>
                </div>
            </template>

            <div v-if="!isEditing">
                <el-descriptions :column="1" border>
                    <el-descriptions-item label="用户名">{{ user.username }}</el-descriptions-item>
                    <el-descriptions-item label="学号">{{ user.student_id }}</el-descriptions-item>
                    <el-descriptions-item label="真实姓名">{{ user.real_name }}</el-descriptions-item>
                    <el-descriptions-item label="信誉积分">
                        <span class="score">{{ user.credit_score }}</span>
                    </el-descriptions-item>
                    <el-descriptions-item label="账号状态">
                        <el-tag :type="user.status === 1 ? 'success' : 'danger'">
                            {{ user.status === 1 ? '正常' : '异常' }}
                        </el-tag>
                    </el-descriptions-item>
                </el-descriptions>

                <div class="actions">
                    <el-button @click="logout">退出登录</el-button>
                </div>
            </div>

            <div v-else class="edit-mode">
                <el-form :model="editForm" label-width="100px">
                    <el-form-item label="真实姓名">
                        <el-input v-model="editForm.real_name" />
                    </el-form-item>
                    <el-form-item label="认证材料(URL)">
                        <el-input v-model="editForm.auth_material" placeholder="请输入图片链接" />
                    </el-form-item>
                    <el-form-item>
                        <el-button type="success" @click="updateProfile">保存</el-button>
                        <el-button @click="isEditing = false">取消</el-button>
                    </el-form-item>
                </el-form>
            </div>
        </el-card>

        <!-- 收到的评价 -->
        <el-card class="box-card reviews-card">
            <template #header>
                <div class="card-header">
                    <span>收到的评价</span>
                    <span class="review-summary" v-if="reviews.length > 0">
                        {{ reviews.length }} 条评价，平均 {{ avgRating }} 分
                    </span>
                </div>
            </template>

            <div v-if="reviewsLoading" v-loading="reviewsLoading" style="min-height: 100px;"></div>

            <div v-else-if="reviews.length === 0" class="no-reviews">
                <el-empty description="暂无收到的评价" :image-size="80" />
            </div>

            <div v-else class="review-list">
                <div v-for="review in reviews" :key="review.review_id" class="review-item">
                    <div class="review-header">
                        <span class="reviewer-name">{{ review.reviewer_name }}</span>
                        <el-rate v-model="review.rating" disabled show-score text-color="#ff9900" />
                    </div>
                    <div class="review-content">{{ review.content || '用户未填写评价内容' }}</div>
                    <div class="review-meta">
                        <span class="review-time">{{ new Date(review.created_at).toLocaleString() }}</span>
                        <span class="order-info">订单号: {{ review.order_id }}</span>
                    </div>
                </div>
            </div>
        </el-card>

        <div class="danger-zone">
            <h3>危险区域</h3>
            <p>注销账号将导致无法登录，请谨慎操作。</p>
            <el-button type="danger" @click="cancelAccount">注销账号</el-button>
        </div>
    </div>
</template>

<style scoped>
.profile-container {
    max-width: 600px;
    margin: 20px auto;
    padding: 20px;
}

.box-card {
    margin-bottom: 30px;
}

.card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.score {
    color: #67c23a;
    font-weight: bold;
}

.actions {
    margin-top: 20px;
    text-align: center;
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

/* 评价区域样式 */
.reviews-card {
    margin-bottom: 30px;
}

.review-summary {
    font-size: 14px;
    color: #909399;
    font-weight: normal;
}

.review-list {
    display: flex;
    flex-direction: column;
    gap: 15px;
}

.review-item {
    background: #f9fafc;
    padding: 15px;
    border-radius: 8px;
    border: 1px solid #ebeef5;
}

.review-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 10px;
}

.reviewer-name {
    font-weight: 500;
    color: #303133;
}

.review-content {
    color: #606266;
    line-height: 1.6;
    margin-bottom: 10px;
}

.review-meta {
    display: flex;
    justify-content: space-between;
    font-size: 12px;
    color: #909399;
}

.no-reviews {
    padding: 20px 0;
}
</style>