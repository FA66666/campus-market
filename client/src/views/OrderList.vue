<script setup lang="ts">
import { ref, onMounted } from 'vue'
import request from '../utils/request'
import { ElMessage, ElMessageBox } from 'element-plus'

interface Order {
    order_id: number
    total_amount: string
    status: number // 0:待付, 1:待发, 2:待收, 3:完成, 4:取消
    item_title: string
    main_image: string | null
    created_at: string
    seller_name?: string
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

// 图片处理
const getImageUrl = (img: string | null) => img || 'https://via.placeholder.com/100x100?text=No+Image'

// 状态显示辅助函数
const getStatusTag = (status: number) => {
    const map = [
        { text: '待付款', type: 'warning' },
        { text: '待发货', type: 'primary' },
        { text: '待收货', type: 'success' },
        { text: '已完成', type: 'info' },
        { text: '已取消', type: 'info' }
    ]
    return map[status] || { text: '未知', type: '' }
}

const fetchOrders = async () => {
    loading.value = true
    try {
        const res: any = await request.get('/orders/my')
        if (res.code === 200) orders.value = res.data
    } catch (err) {
        ElMessage.error('获取订单列表失败')
    } finally {
        loading.value = false
    }
}

// --- 支付逻辑 ---
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

// --- 确认收货 ---
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

// --- 取消订单 ---
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

// --- 评价逻辑 ---
const openReviewModal = (id: number) => {
    activeOrderId.value = id
    reviewForm.value = { rating: 5, content: '' }
    showReviewModal.value = true
}

const submitReview = async () => {
    try {
        const res: any = await request.post('/reviews/create', {
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

// --- 投诉逻辑 ---
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
            ElMessage.success('投诉提交成功，管理员将介入处理')
            showComplaintModal.value = false
        }
    } catch (err) {
        ElMessage.error('提交失败')
    }
}

onMounted(() => {
    fetchOrders()
})
</script>

<template>
    <div class="order-container">
        <div class="page-header">
            <h2>🧾 我的订单</h2>
        </div>

        <el-skeleton v-if="loading" :rows="3" animated />

        <el-empty v-if="!loading && orders.length === 0" description="暂无订单记录" />

        <div class="order-list">
            <el-card v-for="order in orders" :key="order.order_id" class="order-item" shadow="hover">
                <template #header>
                    <div class="order-header">
                        <span class="order-no">订单号: {{ order.order_id }}</span>
                        <span class="order-time">{{ new Date(order.created_at).toLocaleString() }}</span>
                    </div>
                </template>

                <div class="order-content">
                    <div class="product-info">
                        <el-image :src="getImageUrl(order.main_image)" class="product-thumb" fit="cover" />
                        <div class="product-details">
                            <h3 class="product-title">{{ order.item_title }}</h3>
                            <p v-if="order.seller_name" class="seller-name">卖家: {{ order.seller_name }}</p>
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
                        </div>
                    </div>

                    <div class="order-actions">
                        <div v-if="order.status === 0" class="btn-group">
                            <el-button type="primary" size="small"
                                @click="openPayModal(order.order_id)">立即支付</el-button>
                            <el-button size="small" @click="cancelOrder(order.order_id)">取消订单</el-button>
                        </div>
                        <div v-if="order.status === 1" class="btn-group">
                            <el-button type="danger" plain size="small"
                                @click="openComplaintModal(order.order_id)">投诉/催发货</el-button>
                        </div>
                        <div v-if="order.status === 2" class="btn-group">
                            <el-button type="primary" size="small"
                                @click="confirmReceipt(order.order_id)">确认收货</el-button>
                            <el-button type="text" size="small"
                                @click="openComplaintModal(order.order_id)">申请售后</el-button>
                        </div>
                        <div v-if="order.status === 3" class="btn-group">
                            <el-button v-if="!order.my_rating" type="primary" plain size="small"
                                @click="openReviewModal(order.order_id)">评价商品</el-button>
                            <el-tag v-else type="warning" size="small">已评价 ({{ order.my_rating }}⭐)</el-tag>
                            <el-button type="text" size="small"
                                @click="openComplaintModal(order.order_id)">交易投诉</el-button>
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

        <el-dialog v-model="showComplaintModal" title="发起投诉" width="400px" align-center>
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
                <el-button type="danger" @click="submitComplaint">提交投诉</el-button>
            </template>
        </el-dialog>
    </div>
</template>

<style scoped>
.order-container {
    max-width: 1000px;
    margin: 20px auto;
    padding: 20px;
}

.page-header h2 {
    color: #303133;
    border-bottom: 1px solid #eee;
    padding-bottom: 15px;
    margin-bottom: 20px;
}

.order-item {
    margin-bottom: 20px;
}

.order-header {
    display: flex;
    justify-content: space-between;
    font-size: 13px;
    color: #606266;
}

.order-content {
    display: flex;
    align-items: center;
}

.product-info {
    flex: 2;
    display: flex;
    gap: 15px;
}

.product-thumb {
    width: 80px;
    height: 80px;
    border-radius: 6px;
    border: 1px solid #eee;
}

.product-details {
    display: flex;
    flex-direction: column;
    justify-content: center;
}

.product-title {
    margin: 0 0 10px 0;
    font-size: 16px;
    color: #303133;
}

.seller-name {
    color: #909399;
    font-size: 13px;
    margin: 0;
}

.order-meta {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 15px;
    border-left: 1px solid #f0f2f5;
    border-right: 1px solid #f0f2f5;
    padding: 0 20px;
}

.price-box p {
    margin: 0;
    text-align: center;
    color: #909399;
    font-size: 12px;
}

.total-price {
    font-size: 18px;
    font-weight: bold;
    color: #f56c6c !important;
}

.order-actions {
    flex: 1;
    display: flex;
    justify-content: flex-end;
    padding-left: 20px;
}

.btn-group {
    display: flex;
    flex-direction: column;
    gap: 10px;
    align-items: flex-end;
}

.info-text {
    color: #999;
    font-size: 13px;
}
</style>