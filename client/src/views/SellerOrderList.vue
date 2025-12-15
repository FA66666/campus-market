<script setup lang="ts">
import { ref, onMounted } from 'vue'
import request from '../utils/request'

interface SaleOrder {
    order_id: number
    item_title: string
    main_image: string | null
    total_amount: string
    status: number // 0:待付, 1:待发, 2:待收, 3:完成, 4:取消
    buyer_name: string
    delivery_snapshot: string
    receiver_phone: string
    created_at: string
}

const loading = ref(false)
const salesList = ref<SaleOrder[]>([])

// 图片处理
const getImageUrl = (img: string | null) => img || 'https://via.placeholder.com/100x100?text=No+Image'

// 状态显示辅助函数
const getStatusInfo = (status: number) => {
    const map = [
        { text: '待付款', class: 'status-pending' },
        { text: '待发货', class: 'status-waiting' }, // 卖家的重点关注状态
        { text: '已发货', class: 'status-shipping' },
        { text: '交易成功', class: 'status-success' },
        { text: '已取消', class: 'status-info' }
    ]
    return map[status] || { text: '未知', class: '' }
}

const fetchSales = async () => {
    loading.value = true
    try {
        const res: any = await request.get('/orders/sales')
        if (res.code === 200) salesList.value = res.data
    } catch (e) {
        console.error(e)
    } finally {
        loading.value = false
    }
}

const handleShip = async (orderId: number) => {
    if (!confirm('确认按照买家地址发货吗？')) return
    try {
        const res: any = await request.post(`/orders/${orderId}/ship`)
        if (res.code === 200) {
            alert('发货成功！')
            fetchSales()
        }
    } catch (e) {
        alert('操作失败')
    }
}

onMounted(() => fetchSales())
</script>

<template>
    <div class="page-container">
        <div class="page-header">
            <h2>📦 我卖出的宝贝</h2>
            <button @click="fetchSales" class="btn btn-default">刷新列表</button>
        </div>

        <div v-if="loading" class="loading-state">加载中...</div>
        <div v-if="!loading && salesList.length === 0" class="empty-state">暂无销售记录，快去发布商品吧~</div>

        <div class="order-list">
            <div v-for="order in salesList" :key="order.order_id" class="order-item">
                <div class="order-header">
                    <span class="order-no">订单号: {{ order.order_id }}</span>
                    <span class="order-time">{{ new Date(order.created_at).toLocaleString() }}</span>
                </div>

                <div class="order-content">
                    <div class="product-info">
                        <img :src="getImageUrl(order.main_image)" class="product-thumb" />
                        <div class="product-details">
                            <h3 class="product-title">{{ order.item_title }}</h3>
                            <p class="amount">成交价: <strong>¥{{ order.total_amount }}</strong></p>
                        </div>
                    </div>

                    <div class="buyer-info-box">
                        <div class="info-row">
                            <span class="icon">👤</span>
                            <span class="buyer-name">{{ order.buyer_name }}</span>
                        </div>
                        <div class="info-row">
                            <span class="icon">📞</span>
                            <span>{{ order.receiver_phone }}</span>
                        </div>
                        <div class="info-row address-row">
                            <span class="icon">📍</span>
                            <span class="address" :title="order.delivery_snapshot">{{ order.delivery_snapshot }}</span>
                        </div>
                    </div>

                    <div class="status-action-box">
                        <div class="status-display">
                            <span :class="['status-badge', getStatusInfo(order.status).class]">
                                {{ getStatusInfo(order.status).text }}
                            </span>
                        </div>

                        <div class="action-buttons">
                            <button v-if="order.status === 1" @click="handleShip(order.order_id)"
                                class="btn btn-primary">
                                立即发货
                            </button>

                            <span v-else-if="order.status === 0" class="status-text pending">等待买家付款</span>
                            <span v-else-if="order.status === 2" class="status-text shipping">等待买家收货</span>
                            <span v-else-if="order.status === 3" class="status-text success">订单已完成</span>
                            <span v-else class="status-text info">订单已关闭</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped>
.page-container {
    max-width: 1000px;
    margin: 20px auto;
    padding: 20px;
    background: #fff;
    border-radius: 8px;
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.05);
    min-height: 80vh;
}

.page-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 1px solid #eee;
    padding-bottom: 15px;
    margin-bottom: 20px;
}

.page-header h2 {
    margin: 0;
    color: #303133;
}

.empty-state,
.loading-state {
    text-align: center;
    padding: 40px;
    color: #909399;
}

/* 订单卡片 */
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
    align-items: flex-start;
    /* 顶部对齐 */
    gap: 20px;
}

/* 1. 商品信息区域 */
.product-info {
    flex: 2;
    display: flex;
    gap: 15px;
}

.product-thumb {
    width: 70px;
    height: 70px;
    object-fit: cover;
    border-radius: 6px;
    border: 1px solid #eee;
}

.product-details {
    display: flex;
    flex-direction: column;
    justify-content: space-between;
}

.product-title {
    margin: 0 0 5px 0;
    font-size: 16px;
    color: #303133;
    line-height: 1.4;
}

.amount {
    margin: 0;
    font-size: 14px;
    color: #606266;
}

.amount strong {
    color: #f56c6c;
    font-size: 16px;
}

/* 2. 买家信息区域 */
.buyer-info-box {
    flex: 2;
    background: #f8f9fa;
    padding: 10px;
    border-radius: 6px;
    font-size: 13px;
    color: #606266;
    border: 1px dashed #e4e7ed;
}

.info-row {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 4px;
}

.info-row:last-child {
    margin-bottom: 0;
}

.icon {
    font-size: 14px;
}

.buyer-name {
    font-weight: 500;
    color: #303133;
}

.address-row {
    align-items: flex-start;
}

.address {
    line-height: 1.4;
    overflow: hidden;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
}

/* 3. 状态与操作区域 */
.status-action-box {
    flex: 1.5;
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    justify-content: space-between;
    height: 100%;
    min-height: 70px;
    /* 保证高度与左侧大致对齐 */
    padding-left: 20px;
    border-left: 1px solid #f0f2f5;
}

/* 状态标签 */
.status-badge {
    padding: 4px 12px;
    border-radius: 20px;
    font-size: 12px;
    font-weight: 500;
    margin-bottom: 10px;
    display: inline-block;
}

.status-pending {
    background: #fdf6ec;
    color: #e6a23c;
}

.status-waiting {
    background: #fef0f0;
    color: #f56c6c;
    /* 红色醒目，提示卖家发货 */
}

.status-shipping {
    background: #ecf5ff;
    color: #409eff;
}

.status-success {
    background: #f0f9eb;
    color: #67c23a;
}

.status-info {
    background: #f4f4f5;
    color: #909399;
}

/* 操作按钮/文本 */
.btn {
    padding: 8px 16px;
    border-radius: 4px;
    cursor: pointer;
    font-size: 14px;
    border: 1px solid transparent;
    transition: all 0.2s;
}

.btn-primary {
    background: #409eff;
    color: white;
}

.btn-primary:hover {
    background: #66b1ff;
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

.status-text {
    font-size: 13px;
    font-weight: 500;
}

.status-text.pending {
    color: #e6a23c;
}

.status-text.shipping {
    color: #409eff;
}

.status-text.success {
    color: #67c23a;
}

.status-text.info {
    color: #909399;
}

/* 响应式适配 */
@media (max-width: 768px) {
    .order-content {
        flex-direction: column;
        gap: 15px;
    }

    .status-action-box {
        width: 100%;
        flex-direction: row;
        align-items: center;
        border-left: none;
        border-top: 1px solid #f0f2f5;
        padding-top: 15px;
        padding-left: 0;
    }
}
</style>