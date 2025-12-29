<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import request from '../utils/request'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Warning } from '@element-plus/icons-vue'
import { useRouter } from 'vue-router'

const router = useRouter()

// --- 接口定义 ---
interface SaleOrder {
    order_id: number
    item_title: string
    main_image: string | null
    total_amount: string
    status: number
    buyer_id: number
    buyer_name: string
    delivery_snapshot: string
    receiver_phone: string
    transaction_ref: string | null
    payment_proof: string | null
    created_at: string
}

interface MyItem {
    item_id: number
    title: string
    price: number
    stock_quantity: number
    status: number
    main_image: string
    description?: string
    reject_reason?: string
    created_at: string
}

// --- 状态变量 ---
const activeTab = ref('orders')
const loading = ref(false)
const salesList = ref<SaleOrder[]>([])
const myItems = ref<MyItem[]>([])

// 编辑相关
const editVisible = ref(false)
const submitting = ref(false)
const editFile = ref<File | null>(null)
// ✅ 新增：图片预览地址
const previewImage = ref('')

// 交易凭证预览
const showPaymentProofModal = ref(false)
const currentPaymentProof = ref('')
const currentTransactionRef = ref('')

const editForm = reactive({
    item_id: 0,
    title: '',
    price: 0,
    stock_quantity: 0,
    description: '',
    status: 0
})

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
        { text: '已发货', type: 'primary' },
        { text: '交易成功', type: 'success' },
        { text: '已取消', type: 'info' }
    ]
    return map[status] || { text: '未知', type: '' }
}

// 商品状态文字
const getItemStatusText = (status: number) => {
    const map: Record<number, string> = {
        0: '待审核',
        1: '出售中',
        2: '已售罄',
        3: '审核未通过',
        4: '已下架'
    }
    return map[status] || '未知'
}

// 商品状态标签类型
const getItemStatusType = (status: number) => {
    const map: Record<number, string> = {
        0: 'warning',
        1: 'success',
        2: 'info',
        3: 'danger',
        4: 'info'
    }
    return map[status] || 'info'
}

// --- API 请求 ---
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

const contactBuyer = (order: SaleOrder) => {
    router.push({
        path: '/messages',
        query: {
            to: order.buyer_id,
            name: order.buyer_name
        }
    })
}

// 查看买家主页
const goToBuyerPage = (buyerId: number) => {
    router.push({
        name: 'userPage',
        params: { id: buyerId }
    })
}

// 查看交易凭证
const viewPaymentProof = (order: SaleOrder) => {
    if (order.payment_proof) {
        // 构建完整的图片URL
        const baseUrl = import.meta.env.VITE_API_BASE_URL?.replace('/api', '') || 'http://localhost:3000'
        currentPaymentProof.value = baseUrl + order.payment_proof
        currentTransactionRef.value = order.transaction_ref || ''
        showPaymentProofModal.value = true
    }
}

// --- 编辑功能 ---

// 打开编辑弹窗
const openEditModal = (item: MyItem) => {
    editForm.item_id = item.item_id
    editForm.title = item.title
    editForm.price = Number(item.price)
    editForm.stock_quantity = item.stock_quantity
    editForm.description = item.description || ''
    editForm.status = item.status

    // 重置文件选择
    editFile.value = null
    // ✅ 设置初始预览图为原图
    previewImage.value = getImageUrl(item.main_image)

    editVisible.value = true
}

// 监听文件选择
const handleEditFileChange = (e: Event) => {
    const target = e.target as HTMLInputElement
    if (target.files && target.files.length > 0) {
        const file = target.files[0]
        if (file) {
            editFile.value = file
            previewImage.value = URL.createObjectURL(file)
        }
    }
}

// 提交编辑
const submitEdit = async () => {
    if (!editForm.title || editForm.price < 0) {
        ElMessage.warning('请检查标题和价格')
        return
    }

    submitting.value = true
    try {
        const formData = new FormData()
        formData.append('title', editForm.title)
        formData.append('price', String(editForm.price))
        formData.append('stock_quantity', String(editForm.stock_quantity))
        formData.append('description', editForm.description)
        formData.append('status', String(editForm.status))

        if (editFile.value) {
            formData.append('main_image', editFile.value)
        }

        const res: any = await request.put(`/items/${editForm.item_id}`, formData)

        if (res.code === 200) {
            ElMessage.success('修改成功')
            editVisible.value = false
            fetchMyItems()
        }
    } catch (e) {
        // 错误提示由拦截器处理
    } finally {
        submitting.value = false
    }
}

// --- 其他逻辑 ---
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
                                    <span class="buyer-link" @click="goToBuyerPage(order.buyer_id)">
                                        <el-avatar :size="20" class="buyer-avatar">{{ order.buyer_name.charAt(0).toUpperCase() }}</el-avatar>
                                        {{ order.buyer_name }}
                                    </span>
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
                                <!-- 交易凭证信息 -->
                                <div v-if="order.payment_proof" class="info-row proof-row">
                                    <span class="icon">🧾</span>
                                    <span class="proof-label">已上传凭证</span>
                                    <el-button type="primary" size="small" link @click="viewPaymentProof(order)">
                                        点击查看
                                    </el-button>
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
                                    <el-button v-if="order.payment_proof" type="success" size="small" plain
                                        @click="viewPaymentProof(order)">
                                        查看凭证
                                    </el-button>
                                    <el-button size="small" @click="contactBuyer(order)">联系买家</el-button>
                                    <div style="margin-top: 5px;">
                                        <span v-if="order.status === 0" class="status-text pending">等待买家付款</span>
                                        <span v-else-if="order.status === 2" class="status-text shipping">等待买家收货</span>
                                        <span v-else-if="order.status === 3" class="status-text success">订单已完成</span>
                                    </div>
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
                        <el-table-column label="状态" width="140">
                            <template #default="scope">
                                <el-tag :type="getItemStatusType(scope.row.status)">
                                    {{ getItemStatusText(scope.row.status) }}
                                </el-tag>
                                <el-tooltip v-if="scope.row.status === 3 && scope.row.reject_reason" :content="scope.row.reject_reason" placement="top">
                                    <el-icon style="margin-left: 4px; cursor: pointer; color: #f56c6c;"><Warning /></el-icon>
                                </el-tooltip>
                            </template>
                        </el-table-column>
                        <el-table-column label="发布时间" width="180">
                            <template #default="scope">
                                {{ new Date(scope.row.created_at).toLocaleDateString() }}
                            </template>
                        </el-table-column>
                        <el-table-column label="操作">
                            <template #default="scope">
                                <el-button size="small" type="primary" link @click="openEditModal(scope.row)">
                                    编辑
                                </el-button>
                            </template>
                        </el-table-column>
                    </el-table>
                </div>
            </el-tab-pane>
        </el-tabs>

        <el-dialog v-model="editVisible" title="编辑商品信息" width="500px">
            <el-form :model="editForm" label-width="80px">
                <el-form-item label="商品标题">
                    <el-input v-model="editForm.title" />
                </el-form-item>

                <el-form-item label="更换图片">
                    <div class="upload-area">
                        <el-image v-if="previewImage" :src="previewImage"
                            style="width: 100px; height: 100px; border-radius: 4px; margin-bottom: 10px; border: 1px solid #ddd;"
                            fit="cover" />

                        <input type="file" @change="handleEditFileChange" accept="image/*" />
                        <div style="font-size: 12px; color: #999; margin-top: 5px;">如果不修改图片，请留空</div>
                    </div>
                </el-form-item>

                <el-form-item label="价格">
                    <el-input-number v-model="editForm.price" :precision="2" :step="1" :min="0" style="width: 100%" />
                </el-form-item>
                <el-form-item label="库存">
                    <el-input-number v-model="editForm.stock_quantity" :min="0" :step="1" style="width: 100%" />
                </el-form-item>
                <el-form-item label="状态">
                    <el-radio-group v-model="editForm.status">
                        <el-radio :label="1">上架出售</el-radio>
                        <el-radio :label="4">下架</el-radio>
                    </el-radio-group>
                </el-form-item>
                <el-form-item label="描述">
                    <el-input v-model="editForm.description" type="textarea" rows="3" />
                </el-form-item>
            </el-form>
            <template #footer>
                <span class="dialog-footer">
                    <el-button @click="editVisible = false">取消</el-button>
                    <el-button type="primary" @click="submitEdit" :loading="submitting">保存修改</el-button>
                </span>
            </template>
        </el-dialog>

        <!-- 交易凭证预览弹窗 -->
        <el-dialog v-model="showPaymentProofModal" title="交易凭证" width="500px">
            <div class="payment-proof-content">
                <div class="transaction-ref">
                    <span class="label">交易流水号：</span>
                    <span class="value">{{ currentTransactionRef || '未提供' }}</span>
                </div>
                <div class="proof-image">
                    <img :src="currentPaymentProof" alt="交易凭证" />
                </div>
            </div>
            <template #footer>
                <el-button type="primary" @click="showPaymentProofModal = false">关闭</el-button>
            </template>
        </el-dialog>
    </div>
</template>

<style scoped>
.page-container {
    max-width: 1100px;
    margin: 0 auto;
    padding: 30px;
    min-height: 100vh;
    background: linear-gradient(180deg, #f8fafc 0%, #eef2f7 100%);
}

.page-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 30px;
}

.page-header h2 {
    font-size: 28px;
    font-weight: 700;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    margin: 0;
}

.page-header :deep(.el-button) {
    border-radius: 10px;
}

:deep(.el-tabs__nav-wrap::after) {
    height: 1px;
    background: #ebeef5;
}

:deep(.el-tabs__item) {
    font-size: 15px;
    font-weight: 500;
}

:deep(.el-tabs__item.is-active) {
    color: #667eea;
}

:deep(.el-tabs__active-bar) {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
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
    padding: 14px 24px;
    border-bottom: 1px solid #ebeef5;
}

.order-item :deep(.el-card__body) {
    padding: 20px 24px;
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
    gap: 24px;
    align-items: center;
}

.product-info {
    flex: 2;
    display: flex;
    gap: 18px;
}

.product-thumb {
    width: 80px;
    height: 80px;
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
    margin: 0 0 8px 0;
    font-size: 17px;
    font-weight: 600;
    color: #303133;
}

.amount {
    font-size: 14px;
    color: #606266;
}

.amount strong {
    color: #f56c6c;
    font-size: 18px;
}

.buyer-info-box {
    flex: 2;
    background: linear-gradient(135deg, #f8fafc 0%, #f0f2f5 100%);
    padding: 14px 16px;
    border-radius: 12px;
    font-size: 13px;
    color: #606266;
}

.info-row {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 6px;
}

.info-row .icon {
    font-size: 14px;
}

.buyer-link {
    display: flex;
    align-items: center;
    gap: 8px;
    cursor: pointer;
    color: #667eea;
    font-weight: 600;
    transition: color 0.3s;
}

.buyer-link:hover {
    color: #764ba2;
}

.buyer-avatar {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    font-size: 10px;
    color: #fff;
}

.buyer-name {
    font-weight: 600;
    color: #303133;
}

.address {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    max-width: 200px;
    display: inline-block;
    vertical-align: middle;
}

.proof-row {
    margin-top: 10px;
    padding-top: 10px;
    border-top: 1px dashed #e4e7ed;
}

.proof-label {
    color: #67c23a;
    font-weight: 600;
}

.status-action-box {
    flex: 1.5;
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 12px;
    padding-left: 24px;
    border-left: 1px solid #f0f2f5;
}

.status-display :deep(.el-tag) {
    border-radius: 20px;
    padding: 4px 14px;
    font-weight: 500;
}

.action-buttons {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 8px;
}

.action-buttons :deep(.el-button) {
    border-radius: 8px;
    min-width: 90px;
}

.status-text {
    font-size: 13px;
    font-weight: 500;
    padding: 4px 10px;
    border-radius: 20px;
}

.status-text.pending {
    color: #e6a23c;
    background: #fdf6ec;
}

.status-text.shipping {
    color: #409eff;
    background: #ecf5ff;
}

.status-text.success {
    color: #67c23a;
    background: #f0f9eb;
}

.status-text.info {
    color: #909399;
    background: #f4f4f5;
}

/* 商品表格美化 */
:deep(.el-table) {
    border-radius: 12px;
    overflow: hidden;
}

:deep(.el-table th) {
    background: linear-gradient(135deg, #f8fafc 0%, #f0f2f5 100%) !important;
    font-weight: 600;
}

:deep(.el-table td) {
    padding: 16px 0;
}

.upload-area {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
}

/* 交易凭证预览样式 */
.payment-proof-content {
    text-align: center;
}

.transaction-ref {
    margin-bottom: 20px;
    padding: 16px;
    background: linear-gradient(135deg, #f8fafc 0%, #f0f2f5 100%);
    border-radius: 12px;
}

.transaction-ref .label {
    color: #606266;
    font-weight: 500;
}

.transaction-ref .value {
    color: #303133;
    font-weight: 700;
    font-family: 'Courier New', monospace;
    font-size: 16px;
}

.proof-image {
    padding: 15px;
}

.proof-image img {
    max-width: 100%;
    max-height: 400px;
    border-radius: 12px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
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