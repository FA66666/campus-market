<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import request from '../utils/request'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useRouter } from 'vue-router'
import { Clock } from '@element-plus/icons-vue'

const router = useRouter()

// ✅ 配置：超时时间设为 1 分钟 (60000毫秒)
const TIMEOUT_DURATION = 1 * 60 * 1000

interface Order {
    order_id: number
    total_amount: string
    status: number // 0:待付, 1:待发, 2:待收, 3:完成, 4:取消
    item_title: string
    main_image: string | null
    created_at: string
    seller_name: string
    seller_id: number
    seller_credit_score?: number
    my_rating?: number
}

const orders = ref<Order[]>([])
const loading = ref(false)

// 弹窗状态管理
const activeOrderId = ref<number | null>(null)
const showPayModal = ref(false)
const payForm = ref({ transaction_ref: '', proof_img: null as File | null })
const showReviewModal = ref(false)
const reviewForm = ref({ rating: 5, content: '' })
const showComplaintModal = ref(false)
const complaintForm = ref({ reason: '', proof_img: null as File | null, target_type: 3 })

// --- 倒计时与自动取消逻辑 (核心修改) ---
const currentTime = ref(Date.now())
let timer: any = null
// 用来记录正在发起取消请求的订单ID，防止重复请求
const processingOrders = ref<Set<number>>(new Set())

const getRemainingMs = (createTimeStr: string) => {
    const createTime = new Date(createTimeStr).getTime()
    const expireTime = createTime + TIMEOUT_DURATION
    return expireTime - currentTime.value
}

const formatCountdown = (createTimeStr: string) => {
    const diff = getRemainingMs(createTimeStr)
    if (diff <= 0) return '即将取消...'

    const m = Math.floor(diff / 60000)
    const s = Math.floor((diff % 60000) / 1000)
    return `${m}分${s}秒`
}

const isExpired = (createTimeStr: string) => {
    return getRemainingMs(createTimeStr) <= 0
}

// ✅ 新增：静默自动取消函数
const handleAutoCancel = async (orderId: number) => {
    // 如果已经在处理中，直接返回
    if (processingOrders.value.has(orderId)) return

    processingOrders.value.add(orderId)
    console.log(`[AutoCancel] 订单 ${orderId} 已超时，正在请求取消...`)

    try {
        const res: any = await request.post(`/orders/${orderId}/cancel`)
        if (res.code === 200) {
            ElMessage.warning(`订单 ${orderId} 因超时已自动取消`)
            // 刷新列表
            await fetchOrders()
        }
    } catch (e) {
        console.error(`订单 ${orderId} 自动取消失败`, e)
    } finally {
        // 无论成功失败，移除处理标记（如果失败了，下一次轮询还会尝试）
        processingOrders.value.delete(orderId)
    }
}

// ✅ 新增：每秒检查是否有订单需要取消
const checkAutoCancel = () => {
    orders.value.forEach(order => {
        // 只有待付款(0)的订单需要检查
        if (order.status === 0) {
            if (isExpired(order.created_at)) {
                handleAutoCancel(order.order_id)
            }
        }
    })
}

const getImageUrl = (img: string | null) => {
    if (!img) return 'https://via.placeholder.com/100x100?text=No+Image'
    // 如果已经是完整URL，直接返回
    if (img.startsWith('http')) return img
    // 拼接服务器基础URL
    const baseUrl = import.meta.env.VITE_API_BASE_URL?.replace('/api', '') || 'http://localhost:3000'
    return baseUrl + img
}

const getStatusTag = (status: number) => {
    const map = [
        { text: '待付款', type: 'warning' },
        { text: '待发货', type: 'danger' },
        { text: '待收货', type: 'success' },
        { text: '已完成', type: 'info' },
        { text: '已取消', type: 'info' }
    ]
    return map[status] || { text: '未知', type: '' }
}

const fetchOrders = async () => {
    // 注意：如果是自动刷新引发的调用，最好不要全屏 loading，体验不好
    // 这里简单处理，如果已经在 loading 就不重复设 true
    if (!loading.value) loading.value = true
    try {
        const res: any = await request.get('/orders/my')
        if (res.code === 200) orders.value = res.data
    } catch (err) {
        ElMessage.error('获取订单列表失败')
    } finally {
        loading.value = false
    }
}

// 联系卖家
const contactSeller = (order: Order) => {
    router.push({
        path: '/messages',
        query: {
            to: order.seller_id,
            name: order.seller_name
        }
    })
}

// 支付逻辑
const openPayModal = (id: number) => {
    activeOrderId.value = id
    payForm.value = { transaction_ref: '', proof_img: null }
    showPayModal.value = true
}

const handleFileChange = (e: Event) => {
    const target = e.target as HTMLInputElement
    if (target.files && target.files.length > 0) {
        payForm.value.proof_img = target.files[0] || null
    }
}

const submitPayment = async () => {
    if (!activeOrderId.value || !payForm.value.transaction_ref || !payForm.value.proof_img) {
        ElMessage.warning('请填写流水号并上传凭证')
        return
    }
    const formData = new FormData()
    formData.append('transaction_ref', payForm.value.transaction_ref)
    formData.append('payment_proof', payForm.value.proof_img)

    try {
        const res: any = await request.post(`/orders/${activeOrderId.value}/pay`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        })
        if (res.code === 200) {
            ElMessage.success('支付凭证提交成功')
            showPayModal.value = false
            fetchOrders()
        }
    } catch (err) {
        ElMessage.error('提交失败')
    }
}

// 确认收货
const confirmReceipt = async (id: number) => {
    try {
        await ElMessageBox.confirm('确认收到商品了吗？并将打款给卖家。', '收货确认', {
            confirmButtonText: '确认收货',
            cancelButtonText: '取消',
            type: 'warning'
        })

        const res: any = await request.post(`/orders/${id}/receipt`)
        if (res.code === 200) {
            ElMessage.success('交易完成！')
            fetchOrders()
        }
    } catch (err) {
        if (err !== 'cancel') ElMessage.error('操作失败')
    }
}

// 手动取消订单
const cancelOrder = async (id: number) => {
    try {
        await ElMessageBox.confirm('确定取消该订单吗？', '取消订单', {
            confirmButtonText: '确定取消',
            cancelButtonText: '再想想',
            type: 'warning'
        })

        const res: any = await request.post(`/orders/${id}/cancel`)
        if (res.code === 200) {
            ElMessage.success('订单已取消')
            fetchOrders()
        }
    } catch (err) {
        if (err !== 'cancel') ElMessage.error('操作失败')
    }
}

// 评价逻辑
const openReviewModal = (id: number) => {
    activeOrderId.value = id
    reviewForm.value = { rating: 5, content: '' }
    showReviewModal.value = true
}

const submitReview = async () => {
    try {
        const res: any = await request.post('/reviews', {
            order_id: activeOrderId.value,
            rating: reviewForm.value.rating,
            content: reviewForm.value.content
        })
        if (res.code === 200) {
            ElMessage.success('评价成功')
            showReviewModal.value = false
            fetchOrders()
        }
    } catch (err: any) {
        ElMessage.error(err.response?.data?.message || '评价失败')
    }
}

// 投诉逻辑
const openComplaintModal = (id: number) => {
    activeOrderId.value = id
    complaintForm.value = { reason: '', proof_img: null, target_type: 3 }
    showComplaintModal.value = true
}

const handleComplaintFile = (e: Event) => {
    const target = e.target as HTMLInputElement
    if (target.files && target.files.length > 0) {
        complaintForm.value.proof_img = target.files[0] || null
    }
}

const submitComplaint = async () => {
    try {
        const res: any = await request.post('/complaints/submit', {
            target_id: activeOrderId.value,
            target_type: 3,
            reason: complaintForm.value.reason,
            proof_img: 'placeholder_for_demo.jpg'
        })
        if (res.code === 200) {
            ElMessage.success('提交成功，管理员将介入处理')
            showComplaintModal.value = false
        }
    } catch (err) {
        ElMessage.error('提交失败')
    }
}

onMounted(() => {
    fetchOrders()
    // 启动定时器，每秒更新时间并检查超时
    timer = setInterval(() => {
        currentTime.value = Date.now()
        checkAutoCancel()
    }, 1000)
})

onUnmounted(() => {
    if (timer) clearInterval(timer)
})
</script>

<template>
    <div class="order-container">
        <div class="page-header">
            <h2>🧾 我的订单</h2>
        </div>

        <el-skeleton v-if="loading && orders.length === 0" :rows="3" animated />

        <el-empty v-if="!loading && orders.length === 0" description="暂无订单记录" />

        <div class="order-list">
            <el-card v-for="order in orders" :key="order.order_id" class="order-item" shadow="hover">
                <template #header>
                    <div class="order-header">
                        <span class="order-no">订单号: {{ order.order_id }}</span>
                        <div class="header-right">
                            <span class="order-time">{{ new Date(order.created_at).toLocaleString() }}</span>
                        </div>
                    </div>
                </template>

                <div class="order-content">
                    <div class="product-info">
                        <el-image :src="getImageUrl(order.main_image)" class="product-thumb" fit="cover" />
                        <div class="product-details">
                            <h3 class="product-title">{{ order.item_title }}</h3>
                            <p v-if="order.seller_name" class="seller-name">
                                卖家: {{ order.seller_name }}
                                <el-tag
                                    :type="(order.seller_credit_score || 100) >= 80 ? 'success' : (order.seller_credit_score || 100) >= 60 ? 'warning' : 'danger'"
                                    size="small"
                                    class="credit-tag">
                                    信誉 {{ order.seller_credit_score || 100 }}
                                </el-tag>
                            </p>
                        </div>
                    </div>

                    <div class="order-meta">
                        <div class="price-box">
                            <p>总额</p>
                            <p class="total-price">¥{{ order.total_amount }}</p>
                        </div>
                        <div class="status-box">
                            <el-tag :type="getStatusTag(order.status).type as any">
                                {{ getStatusTag(order.status).text }}
                            </el-tag>

                            <div v-if="order.status === 0" class="countdown-tip">
                                <el-icon>
                                    <Clock />
                                </el-icon>
                                <span v-if="!isExpired(order.created_at)">
                                    剩余 {{ formatCountdown(order.created_at) }}
                                </span>
                                <span v-else class="text-expired">正在取消...</span>
                            </div>
                        </div>
                    </div>

                    <div class="order-actions">
                        <div v-if="order.status === 0" class="btn-group">
                            <el-button type="primary" size="small" :disabled="isExpired(order.created_at)"
                                @click="openPayModal(order.order_id)">
                                {{ isExpired(order.created_at) ? '已超时' : '立即支付' }}
                            </el-button>
                            <el-button size="small" @click="contactSeller(order)">联系卖家</el-button>
                            <el-button size="small" type="danger" plain
                                @click="cancelOrder(order.order_id)">取消订单</el-button>
                        </div>
                        <div v-if="order.status === 1" class="btn-group">
                            <el-button type="danger" plain size="small"
                                @click="openComplaintModal(order.order_id)">投诉/催发货</el-button>
                            <el-button size="small" @click="contactSeller(order)">联系卖家</el-button>
                        </div>
                        <div v-if="order.status === 2" class="btn-group">
                            <el-button type="primary" size="small"
                                @click="confirmReceipt(order.order_id)">确认收货</el-button>
                            <el-button size="small" @click="contactSeller(order)">联系卖家</el-button>
                            <el-button type="text" size="small"
                                @click="openComplaintModal(order.order_id)">投诉/售后</el-button>
                        </div>
                        <div v-if="order.status === 3" class="btn-group">
                            <el-button v-if="!order.my_rating" type="primary" plain size="small"
                                @click="openReviewModal(order.order_id)">评价商品</el-button>
                            <el-tag v-else type="warning" size="small">已评价</el-tag>
                            <el-button size="small" @click="contactSeller(order)">联系卖家</el-button>
                            <el-button type="text" size="small"
                                @click="openComplaintModal(order.order_id)">投诉</el-button>
                        </div>
                        <div v-if="order.status === 4">
                            <span class="info-text">订单已关闭</span>
                        </div>
                    </div>
                </div>
            </el-card>
        </div>

        <el-dialog v-model="showPayModal" title="提交支付凭证" width="400px" align-center>
            <el-alert title="请进行线下或第三方支付后，在此提交凭证" type="warning" :closable="false" show-icon
                style="margin-bottom: 15px;" />
            <el-form label-position="top">
                <el-form-item label="支付流水号">
                    <el-input v-model="payForm.transaction_ref" placeholder="请输入交易流水号" />
                </el-form-item>
                <el-form-item label="凭证截图">
                    <input type="file" @change="handleFileChange" accept="image/*" />
                </el-form-item>
            </el-form>
            <template #footer>
                <el-button @click="showPayModal = false">取消</el-button>
                <el-button type="primary" @click="submitPayment">提交审核</el-button>
            </template>
        </el-dialog>

        <el-dialog v-model="showReviewModal" title="商品评价" width="400px" align-center>
            <el-form label-position="top">
                <el-form-item label="评分">
                    <el-rate v-model="reviewForm.rating" />
                </el-form-item>
                <el-form-item label="评价内容">
                    <el-input v-model="reviewForm.content" type="textarea" placeholder="分享你的使用体验..." :rows="3" />
                </el-form-item>
            </el-form>
            <template #footer>
                <el-button @click="showReviewModal = false">取消</el-button>
                <el-button type="primary" @click="submitReview">发布评价</el-button>
            </template>
        </el-dialog>

        <el-dialog v-model="showComplaintModal" title="投诉/催发货" width="400px" align-center>
            <el-form label-position="top">
                <el-form-item label="投诉原因">
                    <el-input v-model="complaintForm.reason" type="textarea" placeholder="请详细描述您遇到的问题" :rows="3" />
                </el-form-item>
                <el-form-item label="证据图片 (可选)">
                    <input type="file" @change="handleComplaintFile" accept="image/*" />
                </el-form-item>
            </el-form>
            <template #footer>
                <el-button @click="showComplaintModal = false">取消</el-button>
                <el-button type="danger" @click="submitComplaint">提交</el-button>
            </template>
        </el-dialog>
    </div>
</template>

<style scoped>
.order-container {
    max-width: 1000px;
    margin: 0 auto;
    padding: 30px;
    min-height: 100vh;
    background: linear-gradient(180deg, #f8fafc 0%, #eef2f7 100%);
}

.page-header h2 {
    font-size: 28px;
    font-weight: 700;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    border-bottom: none;
    padding-bottom: 0;
    margin-bottom: 30px;
}

.order-item {
    margin-bottom: 24px;
    border-radius: 16px;
    border: none;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05);
    transition: all 0.3s;
    overflow: hidden;
}

.order-item:hover {
    box-shadow: 0 8px 30px rgba(102, 126, 234, 0.12);
    transform: translateY(-2px);
}

.order-item :deep(.el-card__header) {
    background: linear-gradient(135deg, #f8fafc 0%, #f0f2f5 100%);
    padding: 16px 24px;
    border-bottom: 1px solid #ebeef5;
}

.order-item :deep(.el-card__body) {
    padding: 24px;
}

.order-header {
    display: flex;
    justify-content: space-between;
    font-size: 14px;
    color: #606266;
}

.order-no {
    font-weight: 600;
    color: #303133;
}

.order-content {
    display: flex;
    align-items: center;
    gap: 20px;
}

.product-info {
    flex: 2;
    display: flex;
    gap: 20px;
}

.product-thumb {
    width: 90px;
    height: 90px;
    border-radius: 12px;
    border: 1px solid #eee;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.product-details {
    display: flex;
    flex-direction: column;
    justify-content: center;
}

.product-title {
    margin: 0 0 12px 0;
    font-size: 17px;
    font-weight: 600;
    color: #303133;
}

.seller-name {
    color: #606266;
    font-size: 14px;
    margin: 0;
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
}

.credit-tag {
    vertical-align: middle;
    border-radius: 20px;
}

.order-meta {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 15px;
    border-left: 1px solid #f0f2f5;
    border-right: 1px solid #f0f2f5;
    padding: 0 25px;
}

.price-box p {
    margin: 0;
    text-align: center;
    color: #909399;
    font-size: 13px;
}

.total-price {
    font-size: 22px;
    font-weight: 700;
    color: #f56c6c !important;
}

.status-box {
    text-align: center;
}

.status-box :deep(.el-tag) {
    border-radius: 20px;
    padding: 4px 14px;
    font-weight: 500;
}

.countdown-tip {
    font-size: 13px;
    color: #f56c6c;
    margin-top: 8px;
    display: flex;
    align-items: center;
    gap: 5px;
    background: #fef0f0;
    padding: 4px 10px;
    border-radius: 20px;
}

.text-expired {
    color: #909399;
}

.order-actions {
    flex: 1;
    display: flex;
    justify-content: flex-end;
    padding-left: 25px;
}

.btn-group {
    display: flex;
    flex-direction: column;
    gap: 10px;
    align-items: flex-end;
}

.btn-group :deep(.el-button) {
    border-radius: 8px;
    min-width: 100px;
}

.info-text {
    color: #909399;
    font-size: 14px;
    font-weight: 500;
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
</style>