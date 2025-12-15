<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import request from '../utils/request'

interface Order {
    order_id: number
    total_amount: string
    status: number // 0:待付, 1:待发, 2:待收, 3:完成, 4:取消
    item_title: string
    main_image: string | null
    created_at: string
    seller_name?: string // 假设后端关联了卖家名
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
const getStatusInfo = (status: number) => {
    const map = [
        { text: '待付款', class: 'status-pending' },
        { text: '待发货', class: 'status-waiting' },
        { text: '待收货', class: 'status-shipping' },
        { text: '已完成', class: 'status-success' },
        { text: '已取消', class: 'status-info' }
    ]
    return map[status] || { text: '未知', class: '' }
}

const fetchOrders = async () => {
    loading.value = true
    try {
        const res: any = await request.get('/orders/my')
        if (res.code === 200) orders.value = res.data
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
        alert('请填写流水号并上传凭证')
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
            alert('支付凭证提交成功')
            showPayModal.value = false
            fetchOrders()
        }
    } catch (err) {
        alert('提交失败')
    }
}

// --- 确认收货 ---
const confirmReceipt = async (id: number) => {
    if (!confirm('确认收到商品了吗？并将打款给卖家。')) return
    try {
        const res: any = await request.post(`/orders/${id}/receipt`)
        if (res.code === 200) fetchOrders()
    } catch (err) {
        alert('操作失败')
    }
}

// --- 取消订单 ---
const cancelOrder = async (id: number) => {
    if (!confirm('确定取消该订单吗？')) return
    try {
        const res: any = await request.post(`/orders/${id}/cancel`)
        if (res.code === 200) fetchOrders()
    } catch (err) {
        alert('操作失败')
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
            alert('评价成功')
            showReviewModal.value = false
            fetchOrders()
        }
    } catch (err: any) {
        alert(err.response?.data?.message || '评价失败')
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
        // 简化演示：假设后端暂只接收文本。若需传图请参考支付接口使用 FormData
        const res: any = await request.post('/complaints/submit', {
            target_id: activeOrderId.value,
            target_type: 3,
            reason: complaintForm.value.reason,
            proof_img: 'placeholder_for_demo.jpg'
        })
        if (res.code === 200) {
            alert('投诉提交成功，管理员将介入处理')
            showComplaintModal.value = false
        }
    } catch (err) {
        alert('提交失败')
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
        <div v-if="loading" class="loading-state">加载中...</div>
        <div v-if="!loading && orders.length === 0" class="empty-state">暂无订单记录</div>

        <div class="order-list">
            <div v-for="order in orders" :key="order.order_id" class="order-item">
                <div class="order-header">
                    <span class="order-no">订单号: {{ order.order_id }}</span>
                    <span class="order-time">{{ new Date(order.created_at).toLocaleString() }}</span>
                </div>

                <div class="order-content">
                    <div class="product-info">
                        <img :src="getImageUrl(order.main_image)" class="product-thumb" />
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
                            <span :class="['status-badge', getStatusInfo(order.status).class]">
                                {{ getStatusInfo(order.status).text }}
                            </span>
                        </div>
                    </div>

                    <div class="order-actions">
                        <div v-if="order.status === 0" class="btn-group">
                            <button @click="openPayModal(order.order_id)" class="btn btn-primary">立即支付</button>
                            <button @click="cancelOrder(order.order_id)" class="btn btn-text">取消订单</button>
                        </div>
                        <div v-if="order.status === 1" class="btn-group">
                            <button @click="openComplaintModal(order.order_id)"
                                class="btn btn-outline-danger">投诉/催发货</button>
                        </div>
                        <div v-if="order.status === 2" class="btn-group">
                            <button @click="confirmReceipt(order.order_id)" class="btn btn-primary">确认收货</button>
                            <button @click="openComplaintModal(order.order_id)"
                                class="btn btn-text-danger">申请售后</button>
                        </div>
                        <div v-if="order.status === 3" class="btn-group">
                            <button v-if="!order.my_rating" @click="openReviewModal(order.order_id)"
                                class="btn btn-outline-primary">评价商品</button>
                            <span v-else class="rated-tag">已评价 ({{ order.my_rating }}⭐)</span>
                            <button @click="openComplaintModal(order.order_id)"
                                class="btn btn-text-danger">交易投诉</button>
                        </div>
                        <div v-if="order.status === 4">
                            <span class="info-text">订单已关闭</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <div v-if="showPayModal" class="modal-overlay" @click.self="showPayModal = false">
            <div class="modal-content">
                <div class="modal-header">
                    <h3>提交支付凭证</h3><button class="close-btn" @click="showPayModal = false">×</button>
                </div>
                <div class="modal-body">
                    <p class="tip-text">请进行线下或第三方支付后，在此提交凭证。</p>
                    <div class="form-group">
                        <label>支付流水号</label>
                        <input v-model="payForm.transaction_ref" placeholder="请输入交易流水号" class="input-field" />
                    </div>
                    <div class="form-group">
                        <label>凭证截图</label>
                        <input type="file" @change="handleFileChange" class="file-input" />
                    </div>
                </div>
                <div class="modal-footer">
                    <button @click="showPayModal = false" class="btn btn-default">取消</button>
                    <button @click="submitPayment" class="btn btn-primary">提交审核</button>
                </div>
            </div>
        </div>

        <div v-if="showReviewModal" class="modal-overlay" @click.self="showReviewModal = false">
            <div class="modal-content">
                <div class="modal-header">
                    <h3>商品评价</h3><button class="close-btn" @click="showReviewModal = false">×</button>
                </div>
                <div class="modal-body">
                    <div class="form-group rating-group">
                        <label>评分:</label>
                        <div class="rating-stars">
                            <span v-for="i in 5" :key="i" @click="reviewForm.rating = i"
                                :class="{ active: i <= reviewForm.rating }">★</span>
                        </div>
                    </div>
                    <div class="form-group">
                        <textarea v-model="reviewForm.content" placeholder="分享你的使用体验..."
                            class="textarea-field"></textarea>
                    </div>
                </div>
                <div class="modal-footer">
                    <button @click="showReviewModal = false" class="btn btn-default">取消</button>
                    <button @click="submitReview" class="btn btn-primary">发布评价</button>
                </div>
            </div>
        </div>

        <div v-if="showComplaintModal" class="modal-overlay" @click.self="showComplaintModal = false">
            <div class="modal-content">
                <div class="modal-header">
                    <h3>发起投诉</h3><button class="close-btn" @click="showComplaintModal = false">×</button>
                </div>
                <div class="modal-body">
                    <div class="form-group">
                        <label>投诉原因</label>
                        <textarea v-model="complaintForm.reason" placeholder="请详细描述您遇到的问题"
                            class="textarea-field"></textarea>
                    </div>
                    <div class="form-group">
                        <label>证据图片 (可选)</label>
                        <input type="file" @change="handleComplaintFile" class="file-input" />
                    </div>
                </div>
                <div class="modal-footer">
                    <button @click="showComplaintModal = false" class="btn btn-default">取消</button>
                    <button @click="submitComplaint" class="btn btn-danger">提交投诉</button>
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped>
.order-container {
    max-width: 1000px;
    margin: 20px auto;
    padding: 20px;
    background: #fff;
    border-radius: 8px;
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.05);
    min-height: 80vh;
}

.page-header h2 {
    color: #303133;
    border-bottom: 1px solid #eee;
    padding-bottom: 15px;
    margin-bottom: 20px;
}

.empty-state,
.loading-state {
    text-align: center;
    padding: 40px;
    color: #909399;
}

/* 订单列表项 */
.order-item {
    border: 1px solid #ebeef5;
    border-radius: 8px;
    margin-bottom: 20px;
    overflow: hidden;
    transition: box-shadow 0.2s;
}

.order-item:hover {
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}

.order-header {
    background: #f9fafc;
    padding: 10px 20px;
    display: flex;
    justify-content: space-between;
    color: #606266;
    font-size: 13px;
    border-bottom: 1px solid #ebeef5;
}

.order-content {
    display: flex;
    padding: 20px;
    align-items: center;
}

/* 左侧商品 */
.product-info {
    flex: 2;
    display: flex;
    gap: 15px;
}

.product-thumb {
    width: 80px;
    height: 80px;
    object-fit: cover;
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

/* 中间信息 */
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

/* 状态徽章 */
.status-badge {
    padding: 4px 12px;
    border-radius: 20px;
    font-size: 12px;
    font-weight: 500;
}

.status-pending {
    background: #fdf6ec;
    color: #e6a23c;
}

.status-waiting {
    background: #ecf5ff;
    color: #409eff;
}

.status-shipping {
    background: #f0f9eb;
    color: #67c23a;
}

.status-success {
    background: #f4f4f5;
    color: #909399;
}

.status-info {
    background: #eee;
    color: #bbb;
}

/* 右侧操作 */
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
    width: 100%;
}

.rated-tag {
    color: #e6a23c;
    font-size: 13px;
}

.info-text {
    color: #999;
    font-size: 13px;
}

/* 按钮样式体系 */
.btn {
    padding: 8px 16px;
    border-radius: 4px;
    cursor: pointer;
    font-size: 14px;
    transition: all 0.2s;
    border: 1px solid transparent;
}

.btn-primary {
    background: #409eff;
    color: white;
}

.btn-primary:hover {
    background: #66b1ff;
}

.btn-danger {
    background: #f56c6c;
    color: white;
}

.btn-danger:hover {
    background: #f78989;
}

.btn-default {
    background: #fff;
    border-color: #dcdfe6;
    color: #606266;
}

.btn-default:hover {
    color: #409eff;
    border-color: #c6e2ff;
    background: #ecf5ff;
}

.btn-outline-primary {
    background: #fff;
    border-color: #409eff;
    color: #409eff;
}

.btn-outline-primary:hover {
    background: #409eff;
    color: white;
}

.btn-outline-danger {
    background: #fff;
    border-color: #f56c6c;
    color: #f56c6c;
}

.btn-outline-danger:hover {
    background: #f56c6c;
    color: white;
}

.btn-text {
    background: none;
    color: #606266;
    padding: 4px 8px;
}

.btn-text:hover {
    color: #409eff;
}

.btn-text-danger {
    background: none;
    color: #f56c6c;
    padding: 4px 8px;
}

.btn-text-danger:hover {
    text-decoration: underline;
}

/* 统一弹窗样式 */
.modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.6);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 2000;
}

.modal-content {
    background: white;
    border-radius: 8px;
    width: 450px;
    max-width: 90%;
    overflow: hidden;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
    animation: slideUp 0.2s ease-out;
}

.modal-header {
    padding: 15px 20px;
    border-bottom: 1px solid #eee;
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: #f9fafc;
}

.modal-header h3 {
    margin: 0;
    font-size: 18px;
    color: #303133;
}

.close-btn {
    border: none;
    background: none;
    font-size: 20px;
    color: #909399;
    cursor: pointer;
}

.modal-body {
    padding: 20px;
}

.modal-footer {
    padding: 15px 20px;
    border-top: 1px solid #eee;
    display: flex;
    justify-content: flex-end;
    gap: 10px;
    background: #f9fafc;
}

.tip-text {
    color: #e6a23c;
    font-size: 13px;
    margin-bottom: 15px;
    background: #fdf6ec;
    padding: 8px;
    border-radius: 4px;
}

.form-group {
    margin-bottom: 15px;
}

.form-group label {
    display: block;
    margin-bottom: 8px;
    font-weight: 500;
    color: #606266;
}

.input-field,
.textarea-field,
.file-input {
    width: 100%;
    padding: 10px;
    border: 1px solid #dcdfe6;
    border-radius: 4px;
    box-sizing: border-box;
}

.textarea-field {
    height: 100px;
    resize: vertical;
}

.file-input {
    padding: 8px;
    background: #f5f7fa;
}

.rating-stars {
    font-size: 24px;
    color: #dcdfe6;
    cursor: pointer;
}

.rating-stars .active {
    color: #e6a23c;
}

@keyframes slideUp {
    from {
        transform: translateY(20px);
        opacity: 0;
    }

    to {
        transform: translateY(0);
        opacity: 1;
    }
}
</style>