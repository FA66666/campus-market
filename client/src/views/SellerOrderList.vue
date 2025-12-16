<script setup lang="ts">
import { ref, onMounted } from 'vue'
import request from '../utils/request'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import { useRouter } from 'vue-router'

const router = useRouter()

// --- 订单相关接口与数据 ---
interface SaleOrder {
    order_id: number
    item_title: string
    main_image: string | null
    total_amount: string
    status: number
    buyer_name: string
    delivery_snapshot: string
    receiver_phone: string
    created_at: string
}

// --- 商品相关接口与数据 ---
interface MyItem {
    item_id: number
    title: string
    price: number
    stock_quantity: number
    status: number // 0: 上架, 1: 下架 (根据业务定义，此处假设 0 为正常上架)
    main_image: string
    created_at: string
    view_count?: number
}

const activeTab = ref('orders')
const loading = ref(false)
const salesList = ref<SaleOrder[]>([])
const myItems = ref<MyItem[]>([])

const getImageUrl = (img: string | null) => img || 'https://via.placeholder.com/100x100?text=No+Image'

// 订单状态 Tag
const getStatusTag = (status: number) => {
    const map = [
        { text: '待付款', type: 'warning' },
        { text: '待发货', type: 'danger' },
        { text: '已发货', type: 'primary' },
        { text: '交易成功', type: 'success' },
        { text: '已取消', type: 'info' }
    ]
    return map[status] || { text: '未知', type: '' }
}

// 获取销售订单
const fetchSales = async () => {
    loading.value = true
    try {
        const res: any = await request.get('/orders/sales')
        if (res.code === 200) salesList.value = res.data
    } catch (e) {
        ElMessage.error('获取销售记录失败')
    } finally {
        loading.value = false
    }
}

// 获取我发布的商品 (新增逻辑)
const fetchMyItems = async () => {
    loading.value = true
    try {
        const res: any = await request.get('/items/my')
        if (res.code === 200) myItems.value = res.data
    } catch (e) {
        ElMessage.error('获取商品列表失败')
    } finally {
        loading.value = false
    }
}

// 处理发货
const handleShip = async (orderId: number) => {
    try {
        await ElMessageBox.confirm('确认按照买家地址发货吗？', '发货确认', {
            confirmButtonText: '确认发货',
            cancelButtonText: '取消',
            type: 'warning'
        })

        const res: any = await request.post(`/orders/${orderId}/ship`)
        if (res.code === 200) {
            ElMessage.success('发货成功！')
            fetchSales()
        }
    } catch (e) {
        if (e !== 'cancel') ElMessage.error('操作失败')
    }
}

// 切换 Tab 时刷新数据
const handleTabClick = () => {
    if (activeTab.value === 'orders') {
        fetchSales()
    } else if (activeTab.value === 'items') {
        fetchMyItems()
    }
}

const goToPublish = () => {
    router.push('/publish')
}

onMounted(() => fetchSales())
</script>

<template>
    <div class="page-container">
        <div class="page-header">
            <h2>🏪 卖家中心</h2>
            <el-button v-if="activeTab === 'items'" type="primary" :icon="Plus" @click="goToPublish">
                发布新商品
            </el-button>
            <el-button v-else @click="fetchSales">刷新列表</el-button>
        </div>

        <el-tabs v-model="activeTab" class="demo-tabs" @tab-change="handleTabClick">
            <el-tab-pane label="我卖出的订单" name="orders">
                <el-skeleton v-if="loading" :rows="3" />
                <el-empty v-if="!loading && salesList.length === 0" description="暂无销售记录" />

                <div class="order-list" v-if="!loading">
                    <el-card v-for="order in salesList" :key="order.order_id" class="order-item" shadow="hover">
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
                                    <el-tooltip :content="order.delivery_snapshot" placement="top">
                                        <span class="address">{{ order.delivery_snapshot }}</span>
                                    </el-tooltip>
                                </div>
                            </div>

                            <div class="status-action-box">
                                <div class="status-display">
                                    <el-tag :type="getStatusTag(order.status).type as any" effect="dark">
                                        {{ getStatusTag(order.status).text }}
                                    </el-tag>
                                </div>

                                <div class="action-buttons">
                                    <el-button v-if="order.status === 1" type="primary" size="small"
                                        @click="handleShip(order.order_id)">
                                        立即发货
                                    </el-button>
                                    <span v-else-if="order.status === 0" class="status-text pending">等待买家付款</span>
                                    <span v-else-if="order.status === 2" class="status-text shipping">等待买家收货</span>
                                    <span v-else-if="order.status === 3" class="status-text success">订单已完成</span>
                                    <span v-else class="status-text info">订单已关闭</span>
                                </div>
                            </div>
                        </div>
                    </el-card>
                </div>
            </el-tab-pane>

            <el-tab-pane label="我发布的商品" name="items">
                <el-skeleton v-if="loading" :rows="3" />
                <el-empty v-if="!loading && myItems.length === 0" description="您还没有发布商品" />

                <div v-if="!loading && myItems.length > 0">
                    <el-table :data="myItems" style="width: 100%" stripe>
                        <el-table-column label="商品信息" width="300">
                            <template #default="scope">
                                <div style="display: flex; align-items: center; gap: 10px;">
                                    <el-image :src="getImageUrl(scope.row.main_image)"
                                        style="width: 50px; height: 50px; border-radius: 4px;" fit="cover" />
                                    <span style="font-weight: 500;">{{ scope.row.title }}</span>
                                </div>
                            </template>
                        </el-table-column>
                        <el-table-column prop="price" label="价格" width="120">
                            <template #default="scope">
                                <span style="color: #f56c6c; font-weight: bold;">¥{{ scope.row.price }}</span>
                            </template>
                        </el-table-column>
                        <el-table-column prop="stock_quantity" label="库存" width="100" />
                        <el-table-column label="状态" width="120">
                            <template #default="scope">
                                <el-tag :type="scope.row.status === 0 ? 'success' : 'info'">
                                    {{ scope.row.status === 0 ? '出售中' : '已下架' }}
                                </el-tag>
                            </template>
                        </el-table-column>
                        <el-table-column label="发布时间" width="180">
                            <template #default="scope">
                                {{ new Date(scope.row.created_at).toLocaleDateString() }}
                            </template>
                        </el-table-column>
                        <el-table-column label="操作">
                            <template #default>
                                <el-button size="small" type="primary" link>编辑</el-button>
                            </template>
                        </el-table-column>
                    </el-table>
                </div>
            </el-tab-pane>
        </el-tabs>
    </div>
</template>

<style scoped>
.page-container {
    max-width: 1000px;
    margin: 20px auto;
    padding: 20px;
}

.page-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
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
    gap: 20px;
    align-items: center;
}

.product-info {
    flex: 2;
    display: flex;
    gap: 15px;
}

.product-thumb {
    width: 70px;
    height: 70px;
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
}

.amount strong {
    color: #f56c6c;
}

.buyer-info-box {
    flex: 2;
    background: #f8f9fa;
    padding: 10px;
    border-radius: 6px;
    font-size: 13px;
    color: #606266;
}

.info-row {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 4px;
}

.address {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    max-width: 200px;
    display: inline-block;
    vertical-align: middle;
}

.status-action-box {
    flex: 1.5;
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 10px;
    padding-left: 20px;
    border-left: 1px solid #f0f2f5;
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
</style>