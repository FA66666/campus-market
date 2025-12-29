<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import request from '../utils/request'
import { useCartStore } from '../stores/cart'
import { ElMessage } from 'element-plus'
import { ShoppingCart, ChatDotRound, ArrowLeft, Star, StarFilled, View, Goods, ShoppingBag, Clock } from '@element-plus/icons-vue'

const route = useRoute()
const router = useRouter()
const cartStore = useCartStore()

// 定义商品接口
interface Item {
    item_id: number
    title: string
    price: number
    main_image: string | null
    seller_name: string
    seller_id: number
    seller_credit_score?: number
    category_name?: string
    description: string
    stock_quantity: number
    status: number
    created_at?: string
    view_count?: number
    collect_count?: number
}

// 评价接口
interface Review {
    review_id: number
    rating: number
    content: string
    created_at: string
    reviewer_name: string
}

const item = ref<Item | null>(null)
const loading = ref(false)
const buyCount = ref(1)
const activeImage = ref('') // 当前选中的图片
const imageList = ref<string[]>([]) // 所有图片列表

// 收藏相关
const isFavorited = ref(false)
const favoriteLoading = ref(false)

// 评价相关
const reviews = ref<Review[]>([])
const avgRating = ref(0)
const reviewsLoading = ref(false)

// 卖家信誉弹窗
const showCreditModal = ref(false)
const sellerCredit = ref<any>(null)
const creditLoading = ref(false)

// 1. 获取图片完整路径
const getImageUrl = (img: string | null) => {
    if (!img) return 'https://via.placeholder.com/400x400?text=No+Image';
    if (img.startsWith('http')) return img;
    const baseUrl = import.meta.env.VITE_API_BASE_URL?.replace('/api', '') || 'http://localhost:3000';
    return baseUrl + img;
}

// 2. 提取所有图片 (封面 + 描述中的图片)
const processImages = (data: Item) => {
    const list: string[] = [];
    if (data.main_image) list.push(data.main_image);

    if (data.description) {
        const regex = /<img[^>]+src="([^">]+)"/g;
        let match;
        while ((match = regex.exec(data.description)) !== null) {
            if (!list.includes(match[1])) {
                list.push(match[1]);
            }
        }
    }
    imageList.value = list;
    // 默认显示第一张图
    if (list.length > 0) activeImage.value = list[0];
}

// 3. 获取商品详情
const fetchItemDetail = async () => {
    loading.value = true
    const id = route.params.id
    try {
        const res: any = await request.get(`/items/${id}`)
        if (res.code === 200) {
            item.value = res.data
            processImages(res.data)
        } else {
            ElMessage.error(res.message || '获取商品详情失败')
        }
    } catch (error) {
        ElMessage.error('加载商品失败')
        console.error(error)
    } finally {
        loading.value = false
    }
}

// 4. 增加浏览量
const incrementViewCount = async () => {
    const id = route.params.id
    try {
        await request.post(`/items/${id}/view`)
    } catch (error) {
        console.error('浏览计数失败:', error)
    }
}

// 5. 检查收藏状态
const checkFavoriteStatus = async () => {
    const id = route.params.id
    try {
        const res: any = await request.get(`/items/${id}/favorite`)
        if (res.code === 200) {
            isFavorited.value = res.isFavorited
        }
    } catch (error) {
        console.error('检查收藏状态失败:', error)
    }
}

// 6. 切换收藏状态
const toggleFavorite = async () => {
    if (!item.value) return
    favoriteLoading.value = true
    try {
        const res: any = await request.post(`/items/${item.value.item_id}/collect`)
        if (res.code === 200) {
            isFavorited.value = res.action === 'added'
            // 更新收藏数
            if (item.value) {
                item.value.collect_count = (item.value.collect_count || 0) + (res.action === 'added' ? 1 : -1)
            }
            ElMessage.success(res.message)
        }
    } catch (error) {
        ElMessage.error('操作失败')
        console.error(error)
    } finally {
        favoriteLoading.value = false
    }
}

// 7. 获取商品评价
const fetchReviews = async () => {
    reviewsLoading.value = true
    const id = route.params.id
    try {
        const res: any = await request.get(`/reviews/items/${id}`)
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

// 5. 加入购物车
const addToCart = () => {
    if (!item.value) return
    if (item.value.stock_quantity <= 0) {
        ElMessage.warning('该商品暂时缺货')
        return
    }
    cartStore.addItem(item.value, buyCount.value)
    ElMessage.success(`已将 ${buyCount.value} 件加入购物车`)
}

// 联系卖家
const contactSeller = () => {
    if (!item.value) return
    router.push({
        path: '/messages',
        query: {
            to: item.value.seller_id,
            name: item.value.seller_name
        }
    })
}

// 查看卖家主页
const goToSellerPage = () => {
    if (!item.value) return
    router.push({
        name: 'userPage',
        params: { id: item.value.seller_id }
    })
}

const goBack = () => {
    router.back()
}

// 8. 显示卖家信誉详情
const showSellerCredit = async () => {
    if (!item.value) return
    showCreditModal.value = true
    creditLoading.value = true
    try {
        const res: any = await request.get(`/users/${item.value.seller_id}/credit`)
        if (res.code === 200) {
            sellerCredit.value = res.data
        }
    } catch (error) {
        console.error('获取卖家信誉失败:', error)
    } finally {
        creditLoading.value = false
    }
}

// 获取信誉等级文字
const getCreditLevel = (score: number) => {
    if (score >= 90) return { text: '优秀', color: '#67c23a' }
    if (score >= 70) return { text: '良好', color: '#409eff' }
    if (score >= 50) return { text: '一般', color: '#e6a23c' }
    return { text: '较差', color: '#f56c6c' }
}

onMounted(() => {
    fetchItemDetail()
    fetchReviews()
    incrementViewCount()
    checkFavoriteStatus()
})
</script>

<template>
    <div class="detail-page">
        <div class="nav-header">
            <el-button link :icon="ArrowLeft" @click="goBack">返回列表</el-button>
        </div>

        <div v-if="loading" class="loading-state" v-loading="loading" style="height: 400px;"></div>

        <div v-else-if="item" class="product-container">
            <div class="product-top-section">
                <div class="gallery-column">
                    <div class="main-image-box">
                        <el-image :src="getImageUrl(activeImage)" fit="contain" class="main-img"
                            :preview-src-list="imageList.map(img => getImageUrl(img))"
                            :initial-index="imageList.indexOf(activeImage)" />
                        <div v-if="item.stock_quantity <= 0" class="sold-out-mask">已售罄</div>
                    </div>
                    <div class="thumbnail-list" v-if="imageList.length > 1">
                        <div v-for="(img, idx) in imageList" :key="idx" class="thumb-item"
                            :class="{ active: activeImage === img }" @click="activeImage = img">
                            <img :src="getImageUrl(img)" />
                        </div>
                    </div>
                </div>

                <div class="info-column">
                    <h1 class="product-title">{{ item.title }}</h1>

                    <div class="price-box">
                        <span class="currency">¥</span>
                        <span class="amount">{{ item.price }}</span>
                    </div>

                    <div class="meta-info">
                        <div class="meta-row">
                            <span class="label">卖家</span>
                            <span class="value seller-info">
                                <span class="seller-link" @click="goToSellerPage">
                                    <el-avatar :size="24" class="seller-avatar">
                                        {{ item.seller_name.charAt(0).toUpperCase() }}
                                    </el-avatar>
                                    {{ item.seller_name }}
                                </span>
                                <el-icon class="chat-icon" @click="contactSeller">
                                    <ChatDotRound />
                                </el-icon>
                                <el-tag
                                    :type="(item.seller_credit_score || 0) >= 80 ? 'success' : (item.seller_credit_score || 0) >= 60 ? 'warning' : 'danger'"
                                    size="small"
                                    class="credit-tag"
                                    @click="showSellerCredit">
                                    信誉 {{ item.seller_credit_score || 100 }}
                                </el-tag>
                            </span>
                        </div>
                        <div class="meta-row">
                            <span class="label">库存</span>
                            <span class="value">{{ item.stock_quantity }} 件</span>
                        </div>
                        <div class="meta-row" v-if="item.category_name">
                            <span class="label">分类</span>
                            <span class="value"><el-tag size="small">{{ item.category_name }}</el-tag></span>
                        </div>
                        <div class="meta-row">
                            <span class="label">发布时间</span>
                            <span class="value">{{ new Date(item.created_at || '').toLocaleDateString() }}</span>
                        </div>
                        <div class="meta-row stats-row">
                            <span class="stat-item">
                                <el-icon><View /></el-icon>
                                {{ item.view_count || 0 }} 浏览
                            </span>
                            <span class="stat-item">
                                <el-icon><Star /></el-icon>
                                {{ item.collect_count || 0 }} 收藏
                            </span>
                        </div>
                    </div>

                    <el-divider border-style="dashed" />

                    <div class="action-area">
                        <div class="qty-selector">
                            <span>数量：</span>
                            <el-input-number v-model="buyCount" :min="1" :max="item.stock_quantity"
                                :disabled="item.stock_quantity <= 0" />
                        </div>

                        <div class="buttons">
                            <el-button type="primary" size="large" :icon="ShoppingCart" @click="addToCart"
                                :disabled="item.stock_quantity <= 0" class="buy-btn">
                                加入购物车
                            </el-button>
                            <el-button
                                size="large"
                                :icon="isFavorited ? StarFilled : Star"
                                :type="isFavorited ? 'warning' : 'default'"
                                :loading="favoriteLoading"
                                @click="toggleFavorite">
                                {{ isFavorited ? '已收藏' : '收藏' }}
                            </el-button>
                            <el-button size="large" :icon="ChatDotRound" @click="contactSeller">
                                联系卖家
                            </el-button>
                        </div>
                    </div>
                </div>
            </div>

            <div class="product-detail-section">
                <h3>商品详情</h3>
                <div class="detail-content html-content" v-html="item.description || '暂无描述'"></div>
            </div>

            <!-- 商品评价区域 -->
            <div class="reviews-section">
                <h3>
                    商品评价
                    <span class="review-summary" v-if="reviews.length > 0">
                        （{{ reviews.length }} 条评价，平均 {{ avgRating }} 分）
                    </span>
                </h3>

                <div v-if="reviewsLoading" v-loading="reviewsLoading" style="min-height: 100px;"></div>

                <div v-else-if="reviews.length === 0" class="no-reviews">
                    <el-empty description="暂无评价" :image-size="80" />
                </div>

                <div v-else class="review-list">
                    <div v-for="review in reviews" :key="review.review_id" class="review-item">
                        <div class="review-header">
                            <span class="reviewer-name">{{ review.reviewer_name }}</span>
                            <el-rate v-model="review.rating" disabled show-score text-color="#ff9900" />
                        </div>
                        <div class="review-content">{{ review.content || '用户未填写评价内容' }}</div>
                        <div class="review-time">{{ new Date(review.created_at).toLocaleString() }}</div>
                    </div>
                </div>
            </div>
        </div>

        <el-empty v-else description="商品不存在或已被删除" />

        <!-- 卖家信誉详情弹窗 -->
        <el-dialog v-model="showCreditModal" title="卖家信誉详情" width="400px" align-center>
            <div v-if="creditLoading" v-loading="creditLoading" style="min-height: 150px;"></div>
            <div v-else-if="sellerCredit" class="credit-detail">
                <div class="credit-header">
                    <div class="credit-score-big">
                        <span class="score-number" :style="{ color: getCreditLevel(sellerCredit.credit_score).color }">
                            {{ sellerCredit.credit_score }}
                        </span>
                        <span class="score-label">信誉积分</span>
                    </div>
                    <div class="credit-level">
                        <el-tag :type="sellerCredit.credit_score >= 80 ? 'success' : sellerCredit.credit_score >= 60 ? 'warning' : 'danger'" size="large">
                            {{ getCreditLevel(sellerCredit.credit_score).text }}
                        </el-tag>
                    </div>
                </div>

                <el-divider />

                <div class="credit-stats">
                    <div class="stat-item">
                        <span class="stat-value">{{ sellerCredit.username }}</span>
                        <span class="stat-label">用户名</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-value">{{ sellerCredit.review_stats?.total_reviews || 0 }}</span>
                        <span class="stat-label">收到评价</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-value">{{ Number(sellerCredit.review_stats?.avg_rating || 0).toFixed(1) }}</span>
                        <span class="stat-label">平均评分</span>
                    </div>
                </div>

                <div class="trade-stats">
                    <div class="trade-item">
                        <el-icon><Goods /></el-icon>
                        <span>成功售出 {{ sellerCredit.trade_stats?.sold_count || 0 }} 件</span>
                    </div>
                    <div class="trade-item">
                        <el-icon><ShoppingBag /></el-icon>
                        <span>成功购买 {{ sellerCredit.trade_stats?.bought_count || 0 }} 件</span>
                    </div>
                    <div class="trade-item">
                        <el-icon><Clock /></el-icon>
                        <span>注册于 {{ new Date(sellerCredit.member_since).toLocaleDateString() }}</span>
                    </div>
                </div>

                <div class="review-breakdown" v-if="sellerCredit.review_stats?.total_reviews > 0">
                    <el-divider content-position="left">评价分布</el-divider>
                    <div class="breakdown-bar">
                        <span class="good">好评 {{ sellerCredit.review_stats?.good_reviews || 0 }}</span>
                        <span class="bad">差评 {{ sellerCredit.review_stats?.bad_reviews || 0 }}</span>
                    </div>
                </div>
            </div>
            <template #footer>
                <el-button @click="showCreditModal = false">关闭</el-button>
                <el-button type="primary" @click="contactSeller(); showCreditModal = false">联系卖家</el-button>
            </template>
        </el-dialog>
    </div>
</template>

<style scoped>
.detail-page {
    max-width: 1200px;
    margin: 0 auto;
    padding: 30px;
    min-height: 100vh;
    background: linear-gradient(180deg, #f8fafc 0%, #eef2f7 100%);
}

.nav-header {
    margin-bottom: 25px;
}

.nav-header :deep(.el-button) {
    border-radius: 10px;
}

.product-container {
    background: #fff;
    border-radius: 20px;
    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.06);
    padding: 40px;
    animation: fadeIn 0.5s ease;
}

@keyframes fadeIn {
    from { opacity: 0; transform: translateY(20px); }
    to { opacity: 1; transform: translateY(0); }
}

.product-top-section {
    display: flex;
    gap: 50px;
    margin-bottom: 50px;
}

.gallery-column {
    flex: 1;
    max-width: 520px;
}

.main-image-box {
    width: 100%;
    height: 450px;
    border: none;
    border-radius: 16px;
    overflow: hidden;
    position: relative;
    margin-bottom: 18px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: linear-gradient(135deg, #f5f7fa 0%, #e4e8ed 100%);
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
}

.main-img {
    width: 100%;
    height: 100%;
}

.sold-out-mask {
    position: absolute;
    inset: 0;
    background: rgba(255, 255, 255, 0.9);
    backdrop-filter: blur(4px);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 28px;
    font-weight: 700;
    color: #909399;
    z-index: 10;
    letter-spacing: 3px;
}

.thumbnail-list {
    display: flex;
    gap: 12px;
    overflow-x: auto;
    padding-bottom: 8px;
}

.thumb-item {
    width: 75px;
    height: 75px;
    border: 3px solid transparent;
    border-radius: 10px;
    cursor: pointer;
    overflow: hidden;
    transition: all 0.3s;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.thumb-item:hover {
    transform: translateY(-3px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.thumb-item.active {
    border-color: #667eea;
}

.thumb-item img {
    width: 100%;
    height: 100%;
    object-fit: cover;
}

.info-column {
    flex: 1;
}

.product-title {
    font-size: 28px;
    color: #303133;
    margin-bottom: 25px;
    line-height: 1.4;
    font-weight: 700;
}

.price-box {
    color: #f56c6c;
    margin-bottom: 30px;
    background: linear-gradient(135deg, #fff5f5 0%, #ffe8e8 100%);
    padding: 16px 24px;
    border-radius: 12px;
    display: inline-block;
}

.currency {
    font-size: 20px;
    font-weight: 700;
}

.amount {
    font-size: 38px;
    font-weight: 800;
}

.meta-info {
    margin-bottom: 25px;
    background: linear-gradient(135deg, #f8fafc 0%, #f0f2f5 100%);
    padding: 20px;
    border-radius: 12px;
}

.meta-row {
    display: flex;
    margin-bottom: 14px;
    font-size: 15px;
}

.meta-row:last-child {
    margin-bottom: 0;
}

.meta-row .label {
    width: 80px;
    color: #909399;
    font-weight: 500;
}

.meta-row .value {
    color: #606266;
}

.meta-row .value.link {
    color: #667eea;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 6px;
    font-weight: 500;
    transition: color 0.3s;
}

.meta-row .value.link:hover {
    color: #764ba2;
}

.meta-row .seller-info {
    display: flex;
    align-items: center;
    gap: 12px;
}

.meta-row .seller-info .seller-link {
    color: #667eea;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 8px;
    font-weight: 500;
    transition: color 0.3s;
}

.meta-row .seller-info .seller-link:hover {
    color: #764ba2;
}

.seller-avatar {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    font-size: 12px;
    color: #fff;
}

.chat-icon {
    color: #667eea;
    cursor: pointer;
    font-size: 18px;
    transition: color 0.3s;
}

.chat-icon:hover {
    color: #764ba2;
}

.credit-tag {
    cursor: pointer;
    border-radius: 20px;
    transition: all 0.3s;
}

.credit-tag:hover {
    transform: scale(1.05);
}

.action-area {
    margin-top: 35px;
}

.qty-selector {
    margin-bottom: 24px;
    display: flex;
    align-items: center;
    gap: 12px;
    font-size: 15px;
    color: #606266;
}

.buttons {
    display: flex;
    gap: 18px;
}

.buttons :deep(.el-button) {
    border-radius: 12px;
    height: 50px;
    font-size: 16px;
    font-weight: 600;
}

.buy-btn {
    width: 180px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    border: none;
}

.buy-btn:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 25px rgba(102, 126, 234, 0.4);
}

.product-detail-section {
    border-top: 1px solid #ebeef5;
    padding-top: 40px;
}

.product-detail-section h3 {
    font-size: 20px;
    font-weight: 700;
    margin-bottom: 25px;
    border-left: 4px solid #667eea;
    padding-left: 14px;
    color: #303133;
}

.detail-content {
    line-height: 1.9;
    color: #4a4a4a;
    font-size: 15px;
}

.html-content :deep(img) {
    max-width: 100%;
    height: auto;
    border-radius: 12px;
    margin: 15px 0;
    display: block;
    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.08);
}

/* 评价区域样式 */
.reviews-section {
    border-top: 1px solid #ebeef5;
    padding-top: 40px;
    margin-top: 40px;
}

.reviews-section h3 {
    font-size: 20px;
    font-weight: 700;
    margin-bottom: 25px;
    border-left: 4px solid #667eea;
    padding-left: 14px;
    display: flex;
    align-items: center;
    gap: 12px;
    color: #303133;
}

.review-summary {
    font-size: 14px;
    color: #909399;
    font-weight: normal;
}

.review-list {
    display: flex;
    flex-direction: column;
    gap: 18px;
}

.review-item {
    background: linear-gradient(135deg, #f8fafc 0%, #f0f2f5 100%);
    padding: 20px;
    border-radius: 14px;
    border: 1px solid #ebeef5;
    transition: all 0.3s;
}

.review-item:hover {
    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.06);
    transform: translateX(5px);
}

.review-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12px;
}

.reviewer-name {
    font-weight: 600;
    color: #303133;
    font-size: 15px;
}

.review-content {
    color: #606266;
    line-height: 1.7;
    margin-bottom: 12px;
    font-size: 14px;
}

.review-time {
    font-size: 13px;
    color: #909399;
}

.no-reviews {
    padding: 30px 0;
}

/* 信誉弹窗样式 */
.credit-detail {
    padding: 15px 0;
}

.credit-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.credit-score-big {
    display: flex;
    flex-direction: column;
    align-items: center;
}

.credit-score-big .score-number {
    font-size: 56px;
    font-weight: 800;
}

.credit-score-big .score-label {
    font-size: 14px;
    color: #909399;
    margin-top: 5px;
}

.credit-stats {
    display: flex;
    justify-content: space-around;
    margin-bottom: 25px;
}

.credit-stats .stat-item {
    display: flex;
    flex-direction: column;
    align-items: center;
}

.credit-stats .stat-value {
    font-size: 20px;
    font-weight: 600;
    color: #303133;
}

.credit-stats .stat-label {
    font-size: 13px;
    color: #909399;
    margin-top: 5px;
}

.trade-stats {
    background: linear-gradient(135deg, #f8fafc 0%, #f0f2f5 100%);
    border-radius: 12px;
    padding: 18px;
}

.trade-stats .trade-item {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 10px;
    color: #606266;
    font-size: 14px;
}

.trade-stats .trade-item:last-child {
    margin-bottom: 0;
}

.review-breakdown .breakdown-bar {
    display: flex;
    justify-content: space-between;
    padding: 14px 20px;
    background: linear-gradient(135deg, #f8fafc 0%, #f0f2f5 100%);
    border-radius: 10px;
    font-weight: 500;
}

.review-breakdown .good {
    color: #67c23a;
}

.review-breakdown .bad {
    color: #f56c6c;
}

/* 弹窗美化 */
:deep(.el-dialog) {
    border-radius: 16px;
}

:deep(.el-dialog__header) {
    border-bottom: 1px solid #f0f2f5;
    padding: 20px 24px;
    margin: 0;
}

:deep(.el-dialog__body) {
    padding: 24px;
}

:deep(.el-dialog__footer) {
    border-top: 1px solid #f0f2f5;
    padding: 16px 24px;
}

@media (max-width: 768px) {
    .product-top-section {
        flex-direction: column;
        gap: 30px;
    }

    .main-image-box {
        height: 320px;
    }

    .product-title {
        font-size: 22px;
    }

    .amount {
        font-size: 30px;
    }
}
</style>