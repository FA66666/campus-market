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
    if (img.startsWith('/uploads')) {
        return `http://localhost:3000${img}`;
    }
    return img;
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

// 5. 联系卖家
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
                                <span class="link" @click="contactSeller">
                                    {{ item.seller_name }} <el-icon>
                                        <ChatDotRound />
                                    </el-icon>
                                </span>
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
    max-width: 1100px;
    margin: 0 auto;
    padding: 20px;
    min-height: 80vh;
}

.nav-header {
    margin-bottom: 20px;
}

.product-container {
    background: #fff;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
    padding: 30px;
}

.product-top-section {
    display: flex;
    gap: 40px;
    margin-bottom: 40px;
}

.gallery-column {
    flex: 1;
    max-width: 500px;
}

.main-image-box {
    width: 100%;
    height: 400px;
    border: 1px solid #eee;
    border-radius: 8px;
    overflow: hidden;
    position: relative;
    margin-bottom: 15px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #f9f9f9;
}

.main-img {
    width: 100%;
    height: 100%;
}

.sold-out-mask {
    position: absolute;
    inset: 0;
    background: rgba(255, 255, 255, 0.8);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 24px;
    font-weight: bold;
    color: #909399;
    z-index: 10;
}

.thumbnail-list {
    display: flex;
    gap: 10px;
    overflow-x: auto;
    padding-bottom: 5px;
}

.thumb-item {
    width: 70px;
    height: 70px;
    border: 2px solid transparent;
    border-radius: 4px;
    cursor: pointer;
    overflow: hidden;
}

.thumb-item.active {
    border-color: #409eff;
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
    font-size: 24px;
    color: #303133;
    margin-bottom: 20px;
    line-height: 1.4;
}

.price-box {
    color: #f56c6c;
    margin-bottom: 25px;
    background: #fff5f5;
    padding: 10px 15px;
    border-radius: 4px;
    display: inline-block;
}

.currency {
    font-size: 18px;
    font-weight: bold;
}

.amount {
    font-size: 32px;
    font-weight: bold;
}

.meta-info {
    margin-bottom: 20px;
}

.meta-row {
    display: flex;
    margin-bottom: 12px;
    font-size: 14px;
}

.meta-row .label {
    width: 70px;
    color: #909399;
}

.meta-row .value {
    color: #606266;
}

.meta-row .value.link {
    color: #409eff;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 5px;
}

.meta-row .seller-info {
    display: flex;
    align-items: center;
    gap: 10px;
}

.meta-row .seller-info .link {
    color: #409eff;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 5px;
}

.credit-tag {
    cursor: pointer;
}

.credit-tag:hover {
    opacity: 0.8;
}

.action-area {
    margin-top: 30px;
}

.qty-selector {
    margin-bottom: 20px;
    display: flex;
    align-items: center;
    gap: 10px;
}

.buttons {
    display: flex;
    gap: 15px;
}

.buy-btn {
    width: 160px;
}

.product-detail-section {
    border-top: 1px solid #eee;
    padding-top: 30px;
}

.product-detail-section h3 {
    font-size: 18px;
    margin-bottom: 20px;
    border-left: 4px solid #409eff;
    padding-left: 10px;
}

.detail-content {
    line-height: 1.8;
    color: #333;
}

.html-content :deep(img) {
    max-width: 100%;
    height: auto;
    border-radius: 4px;
    margin: 10px 0;
    display: block;
}

/* 评价区域样式 */
.reviews-section {
    border-top: 1px solid #eee;
    padding-top: 30px;
    margin-top: 30px;
}

.reviews-section h3 {
    font-size: 18px;
    margin-bottom: 20px;
    border-left: 4px solid #409eff;
    padding-left: 10px;
    display: flex;
    align-items: center;
    gap: 10px;
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

.review-time {
    font-size: 12px;
    color: #909399;
}

.no-reviews {
    padding: 20px 0;
}

/* 信誉弹窗样式 */
.credit-detail {
    padding: 10px 0;
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
    font-size: 48px;
    font-weight: bold;
}

.credit-score-big .score-label {
    font-size: 14px;
    color: #909399;
}

.credit-stats {
    display: flex;
    justify-content: space-around;
    margin-bottom: 20px;
}

.credit-stats .stat-item {
    display: flex;
    flex-direction: column;
    align-items: center;
}

.credit-stats .stat-value {
    font-size: 18px;
    font-weight: 500;
    color: #303133;
}

.credit-stats .stat-label {
    font-size: 12px;
    color: #909399;
    margin-top: 4px;
}

.trade-stats {
    background: #f5f7fa;
    border-radius: 8px;
    padding: 15px;
}

.trade-stats .trade-item {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 8px;
    color: #606266;
}

.trade-stats .trade-item:last-child {
    margin-bottom: 0;
}

.review-breakdown .breakdown-bar {
    display: flex;
    justify-content: space-between;
    padding: 10px 15px;
    background: #f5f7fa;
    border-radius: 4px;
}

.review-breakdown .good {
    color: #67c23a;
}

.review-breakdown .bad {
    color: #f56c6c;
}

@media (max-width: 768px) {
    .product-top-section {
        flex-direction: column;
        gap: 20px;
    }

    .main-image-box {
        height: 300px;
    }
}
</style>