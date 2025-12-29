<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import request from '../utils/request'
import { ElMessage } from 'element-plus'
import { useUserStore } from '../stores/user'
import {
    User, Star, StarFilled, Goods, ShoppingBag, Clock, ChatDotRound,
    View, ArrowLeft
} from '@element-plus/icons-vue'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()

// 用户信息
interface UserCredit {
    user_id: number
    username: string
    credit_score: number
    member_since: string
    review_stats: {
        total_reviews: number
        avg_rating: number
        good_reviews: number
        bad_reviews: number
    }
    trade_stats: {
        sold_count: number
        bought_count: number
    }
}

interface Review {
    review_id: number
    order_id: number
    rating: number
    content: string
    created_at: string
    reviewer_name: string
}

interface Item {
    item_id: number
    title: string
    price: number
    main_image: string | null
    stock_quantity: number
    status: number
    created_at: string
    view_count?: number
    collect_count?: number
}

const loading = ref(true)
const userCredit = ref<UserCredit | null>(null)
const reviews = ref<Review[]>([])
const items = ref<Item[]>([])
const activeTab = ref('items')

const userId = computed(() => route.params.id as string)
const isOwnPage = computed(() => userStore.userInfo?.user_id === Number(userId.value))

const getImageUrl = (img: string | null) => {
    if (!img) return 'https://via.placeholder.com/300x300?text=No+Image'
    if (img.startsWith('http')) return img
    const baseUrl = import.meta.env.VITE_API_BASE_URL?.replace('/api', '') || 'http://localhost:3000'
    return baseUrl + img
}

const getCreditLevel = (score: number) => {
    if (score >= 90) return { text: '优秀卖家', color: '#67c23a', type: 'success' }
    if (score >= 70) return { text: '良好卖家', color: '#409eff', type: 'primary' }
    if (score >= 50) return { text: '普通卖家', color: '#e6a23c', type: 'warning' }
    return { text: '信誉较低', color: '#f56c6c', type: 'danger' }
}

const fetchUserCredit = async () => {
    try {
        const res: any = await request.get(`/users/${userId.value}/credit`)
        if (res.code === 200) {
            userCredit.value = res.data
        }
    } catch (error) {
        ElMessage.error('获取用户信息失败')
    }
}

const fetchUserReviews = async () => {
    try {
        const res: any = await request.get(`/reviews/users/${userId.value}`)
        if (res.code === 200) {
            reviews.value = res.data.reviews || []
        }
    } catch (error) {
        console.error('获取评价失败:', error)
    }
}

const fetchUserItems = async () => {
    try {
        const res: any = await request.get(`/items/user/${userId.value}`)
        if (res.code === 200) {
            items.value = res.data || []
        }
    } catch (error) {
        console.error('获取商品失败:', error)
    }
}

const goToDetail = (item: Item) => {
    router.push({ name: 'itemDetail', params: { id: item.item_id } })
}

const contactUser = () => {
    if (!userCredit.value) return
    router.push({
        path: '/messages',
        query: {
            to: userCredit.value.user_id,
            name: userCredit.value.username
        }
    })
}

const goBack = () => {
    router.back()
}

onMounted(async () => {
    loading.value = true
    await Promise.all([
        fetchUserCredit(),
        fetchUserReviews(),
        fetchUserItems()
    ])
    loading.value = false
})
</script>

<template>
    <div class="user-page">
        <div class="nav-header">
            <el-button link :icon="ArrowLeft" @click="goBack">返回</el-button>
        </div>

        <div v-if="loading" class="loading-state" v-loading="loading" style="min-height: 400px;"></div>

        <template v-else-if="userCredit">
            <!-- 用户信息卡片 -->
            <el-card class="profile-card" shadow="never">
                <div class="profile-header">
                    <div class="avatar-section">
                        <el-avatar :size="80" class="user-avatar">
                            {{ userCredit.username.charAt(0).toUpperCase() }}
                        </el-avatar>
                        <div class="user-basic">
                            <h2 class="username">{{ userCredit.username }}</h2>
                            <el-tag :type="getCreditLevel(userCredit.credit_score).type as any" size="large">
                                {{ getCreditLevel(userCredit.credit_score).text }}
                            </el-tag>
                        </div>
                    </div>

                    <div class="credit-section">
                        <div class="credit-score">
                            <span class="score-number" :style="{ color: getCreditLevel(userCredit.credit_score).color }">
                                {{ userCredit.credit_score }}
                            </span>
                            <span class="score-label">信誉积分</span>
                        </div>
                    </div>

                    <div class="action-section" v-if="!isOwnPage">
                        <el-button type="primary" :icon="ChatDotRound" @click="contactUser">
                            发消息
                        </el-button>
                    </div>
                </div>

                <el-divider />

                <!-- 统计数据 -->
                <div class="stats-row">
                    <div class="stat-item">
                        <el-icon><Goods /></el-icon>
                        <div class="stat-info">
                            <span class="stat-value">{{ userCredit.trade_stats.sold_count }}</span>
                            <span class="stat-label">成功售出</span>
                        </div>
                    </div>
                    <div class="stat-item">
                        <el-icon><ShoppingBag /></el-icon>
                        <div class="stat-info">
                            <span class="stat-value">{{ userCredit.trade_stats.bought_count }}</span>
                            <span class="stat-label">成功购买</span>
                        </div>
                    </div>
                    <div class="stat-item">
                        <el-icon><StarFilled /></el-icon>
                        <div class="stat-info">
                            <span class="stat-value">{{ userCredit.review_stats.total_reviews }}</span>
                            <span class="stat-label">收到评价</span>
                        </div>
                    </div>
                    <div class="stat-item">
                        <el-icon><Star /></el-icon>
                        <div class="stat-info">
                            <span class="stat-value">{{ Number(userCredit.review_stats.avg_rating).toFixed(1) }}</span>
                            <span class="stat-label">平均评分</span>
                        </div>
                    </div>
                    <div class="stat-item">
                        <el-icon><Clock /></el-icon>
                        <div class="stat-info">
                            <span class="stat-value">{{ new Date(userCredit.member_since).toLocaleDateString() }}</span>
                            <span class="stat-label">注册时间</span>
                        </div>
                    </div>
                </div>

                <!-- 评价分布 -->
                <div class="review-distribution" v-if="userCredit.review_stats.total_reviews > 0">
                    <div class="dist-header">评价分布</div>
                    <div class="dist-bar">
                        <div class="good-bar" :style="{ width: `${(userCredit.review_stats.good_reviews / userCredit.review_stats.total_reviews) * 100}%` }">
                            好评 {{ userCredit.review_stats.good_reviews }}
                        </div>
                        <div class="bad-bar" v-if="userCredit.review_stats.bad_reviews > 0" :style="{ width: `${(userCredit.review_stats.bad_reviews / userCredit.review_stats.total_reviews) * 100}%` }">
                            差评 {{ userCredit.review_stats.bad_reviews }}
                        </div>
                    </div>
                </div>
            </el-card>

            <!-- Tab 切换 -->
            <el-card class="content-card" shadow="never">
                <el-tabs v-model="activeTab">
                    <el-tab-pane label="在售商品" name="items">
                        <template #label>
                            <span><el-icon><Goods /></el-icon> 在售商品 ({{ items.length }})</span>
                        </template>

                        <div v-if="items.length === 0" class="empty-state">
                            <el-empty description="暂无在售商品" />
                        </div>

                        <div v-else class="items-grid">
                            <div v-for="item in items" :key="item.item_id" class="item-card" @click="goToDetail(item)">
                                <div class="item-image-box">
                                    <el-image :src="getImageUrl(item.main_image)" fit="cover" class="item-image">
                                        <template #error>
                                            <div class="image-error"><el-icon><Goods /></el-icon></div>
                                        </template>
                                    </el-image>
                                    <div v-if="item.stock_quantity <= 0" class="sold-out-mask">已售罄</div>
                                </div>
                                <div class="item-info">
                                    <h4 class="item-title">{{ item.title }}</h4>
                                    <div class="item-meta">
                                        <span class="price">¥{{ item.price }}</span>
                                        <span class="stock">库存 {{ item.stock_quantity }}</span>
                                    </div>
                                    <div class="item-stats">
                                        <span><el-icon><View /></el-icon> {{ item.view_count || 0 }}</span>
                                        <span><el-icon><StarFilled /></el-icon> {{ item.collect_count || 0 }}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </el-tab-pane>

                    <el-tab-pane label="收到的评价" name="reviews">
                        <template #label>
                            <span><el-icon><StarFilled /></el-icon> 收到的评价 ({{ reviews.length }})</span>
                        </template>

                        <div v-if="reviews.length === 0" class="empty-state">
                            <el-empty description="暂无评价" />
                        </div>

                        <div v-else class="reviews-list">
                            <div v-for="review in reviews" :key="review.review_id" class="review-item">
                                <div class="review-header">
                                    <span class="reviewer-name">{{ review.reviewer_name }}</span>
                                    <el-rate v-model="review.rating" disabled show-score text-color="#ff9900" />
                                </div>
                                <div class="review-content">{{ review.content || '用户未填写评价内容' }}</div>
                                <div class="review-time">{{ new Date(review.created_at).toLocaleString() }}</div>
                            </div>
                        </div>
                    </el-tab-pane>
                </el-tabs>
            </el-card>
        </template>

        <el-empty v-else description="用户不存在" />
    </div>
</template>

<style scoped>
.user-page {
    max-width: 1000px;
    margin: 0 auto;
    padding: 30px;
    background: linear-gradient(180deg, #f8fafc 0%, #eef2f7 100%);
    min-height: 100vh;
}

.nav-header {
    margin-bottom: 20px;
}

.profile-card {
    border-radius: 20px;
    border: none;
    margin-bottom: 24px;
    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.06);
}

.profile-card :deep(.el-card__body) {
    padding: 30px;
}

.profile-header {
    display: flex;
    align-items: center;
    gap: 30px;
    flex-wrap: wrap;
}

.avatar-section {
    display: flex;
    align-items: center;
    gap: 20px;
}

.user-avatar {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    font-size: 32px;
    font-weight: 700;
    color: #fff;
}

.user-basic {
    display: flex;
    flex-direction: column;
    gap: 10px;
}

.username {
    font-size: 24px;
    font-weight: 700;
    color: #303133;
    margin: 0;
}

.credit-section {
    margin-left: auto;
}

.credit-score {
    display: flex;
    flex-direction: column;
    align-items: center;
    background: linear-gradient(135deg, #f8fafc 0%, #f0f2f5 100%);
    padding: 15px 30px;
    border-radius: 16px;
}

.score-number {
    font-size: 48px;
    font-weight: 800;
    line-height: 1;
}

.score-label {
    font-size: 14px;
    color: #909399;
    margin-top: 5px;
}

.action-section {
    margin-left: 20px;
}

.action-section :deep(.el-button) {
    border-radius: 12px;
    height: 44px;
    padding: 0 24px;
}

.stats-row {
    display: flex;
    justify-content: space-around;
    flex-wrap: wrap;
    gap: 20px;
    margin-bottom: 20px;
}

.stat-item {
    display: flex;
    align-items: center;
    gap: 12px;
    background: linear-gradient(135deg, #f8fafc 0%, #f0f2f5 100%);
    padding: 16px 24px;
    border-radius: 14px;
    min-width: 140px;
}

.stat-item > .el-icon {
    font-size: 24px;
    color: #667eea;
}

.stat-info {
    display: flex;
    flex-direction: column;
}

.stat-value {
    font-size: 20px;
    font-weight: 700;
    color: #303133;
}

.stat-label {
    font-size: 13px;
    color: #909399;
}

.review-distribution {
    background: linear-gradient(135deg, #f8fafc 0%, #f0f2f5 100%);
    padding: 20px;
    border-radius: 14px;
}

.dist-header {
    font-size: 14px;
    font-weight: 600;
    color: #606266;
    margin-bottom: 12px;
}

.dist-bar {
    display: flex;
    height: 32px;
    border-radius: 8px;
    overflow: hidden;
    background: #e4e7ed;
}

.good-bar {
    background: linear-gradient(135deg, #67c23a 0%, #85ce61 100%);
    display: flex;
    align-items: center;
    justify-content: center;
    color: #fff;
    font-size: 13px;
    font-weight: 500;
    min-width: fit-content;
    padding: 0 12px;
}

.bad-bar {
    background: linear-gradient(135deg, #f56c6c 0%, #f78989 100%);
    display: flex;
    align-items: center;
    justify-content: center;
    color: #fff;
    font-size: 13px;
    font-weight: 500;
    min-width: fit-content;
    padding: 0 12px;
}

.content-card {
    border-radius: 20px;
    border: none;
    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.06);
}

.content-card :deep(.el-card__body) {
    padding: 24px;
}

.content-card :deep(.el-tabs__item) {
    font-size: 15px;
}

.content-card :deep(.el-tabs__item .el-icon) {
    margin-right: 6px;
}

.empty-state {
    padding: 40px 0;
}

.items-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: 20px;
}

.item-card {
    background: #fff;
    border-radius: 14px;
    overflow: hidden;
    cursor: pointer;
    transition: all 0.3s ease;
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
}

.item-card:hover {
    transform: translateY(-5px);
    box-shadow: 0 12px 30px rgba(102, 126, 234, 0.15);
}

.item-image-box {
    width: 100%;
    height: 160px;
    position: relative;
    background: linear-gradient(135deg, #f5f7fa 0%, #e4e8ed 100%);
}

.item-image {
    width: 100%;
    height: 100%;
}

.image-error {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #c0c4cc;
    font-size: 40px;
}

.sold-out-mask {
    position: absolute;
    inset: 0;
    background: rgba(255, 255, 255, 0.85);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 16px;
    font-weight: 600;
    color: #909399;
}

.item-info {
    padding: 14px;
}

.item-title {
    font-size: 15px;
    font-weight: 600;
    color: #303133;
    margin: 0 0 10px 0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.item-meta {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 8px;
}

.item-meta .price {
    font-size: 18px;
    font-weight: 700;
    color: #f56c6c;
}

.item-meta .stock {
    font-size: 12px;
    color: #909399;
}

.item-stats {
    display: flex;
    gap: 16px;
    font-size: 12px;
    color: #909399;
}

.item-stats span {
    display: flex;
    align-items: center;
    gap: 4px;
}

.reviews-list {
    display: flex;
    flex-direction: column;
    gap: 16px;
}

.review-item {
    background: linear-gradient(135deg, #f8fafc 0%, #f0f2f5 100%);
    padding: 18px;
    border-radius: 14px;
    border: 1px solid #ebeef5;
}

.review-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 10px;
}

.reviewer-name {
    font-weight: 600;
    color: #303133;
    font-size: 15px;
}

.review-content {
    color: #606266;
    line-height: 1.7;
    margin-bottom: 10px;
    font-size: 14px;
}

.review-time {
    font-size: 13px;
    color: #909399;
}

.loading-state {
    display: flex;
    justify-content: center;
    align-items: center;
}

@media (max-width: 768px) {
    .profile-header {
        flex-direction: column;
        align-items: flex-start;
    }

    .credit-section {
        margin-left: 0;
    }

    .action-section {
        margin-left: 0;
        width: 100%;
    }

    .action-section :deep(.el-button) {
        width: 100%;
    }

    .stats-row {
        justify-content: flex-start;
    }

    .stat-item {
        flex: 1;
        min-width: calc(50% - 10px);
    }
}
</style>
