<template>
    <div class="page-container">
        <el-card class="box-card">
            <template #header>
                <div class="card-header">
                    <span>我的订单 (买家)</span>
                    <el-button link type="primary" @click="fetchOrders">刷新</el-button>
                </div>
            </template>

            <el-table :data="orderList" style="width: 100%" v-loading="loading">
                <el-table-column label="商品信息" width="300">
                    <template #default="scope">
                        <div class="item-info">
                            <el-image :src="scope.row.main_image" style="width: 50px; height: 50px; border-radius: 4px"
                                fit="cover" />
                            <span class="item-title">{{ scope.row.item_title }}</span>
                        </div>
                    </template>
                </el-table-column>

                <el-table-column label="实付金额" width="120">
                    <template #default="scope">
                        <span style="color: #f56c6c; font-weight: bold;">¥ {{ scope.row.total_amount }}</span>
                    </template>
                </el-table-column>

                <el-table-column label="状态" width="100">
                    <template #default="scope">
                        <el-tag :type="getStatusType(scope.row.status)">
                            {{ getStatusText(scope.row.status) }}
                        </el-tag>
                    </template>
                </el-table-column>

                <el-table-column prop="created_at" label="下单时间" width="180">
                    <template #default="scope">
                        {{ new Date(scope.row.created_at).toLocaleString() }}
                    </template>
                </el-table-column>

                <el-table-column label="操作" width="220">
                    <template #default="scope">

                        <div v-if="scope.row.status === 0">
                            <el-button size="small" type="success"
                                @click="handlePay(scope.row.order_id)">去支付</el-button>
                            <el-popconfirm title="确定取消该订单吗？" @confirm="handleCancel(scope.row.order_id)">
                                <template #reference>
                                    <el-button size="small" type="danger">取消</el-button>
                                </template>
                            </el-popconfirm>
                        </div>

                        <span v-else-if="scope.row.status === 1" style="color: #E6A23C; font-size: 13px;">等待发货...</span>

                        <div v-else-if="scope.row.status === 2">
                            <el-popconfirm title="确认收到货了吗？" @confirm="handleReceive(scope.row.order_id)">
                                <template #reference>
                                    <el-button size="small" type="primary">确认收货</el-button>
                                </template>
                            </el-popconfirm>
                        </div>

                        <div v-else-if="scope.row.status === 3">
                            <div v-if="scope.row.my_rating">
                                <el-button size="small" plain @click="viewReview(scope.row)">查看评价</el-button>
                                <el-tag size="small" type="success" effect="plain" style="margin-left: 5px">已评</el-tag>
                            </div>
                            <div v-else>
                                <el-button size="small" type="warning" plain
                                    @click="openReviewDialog(scope.row)">去评价</el-button>
                            </div>
                        </div>

                        <span v-else style="color: #999; font-size: 13px">无法操作</span>
                    </template>
                </el-table-column>
            </el-table>
        </el-card>

        <el-dialog v-model="reviewDialogVisible" :title="isReadOnly ? '历史评价详情' : '交易评价'" width="400px">
            <el-form :model="reviewForm" label-position="top">
                <el-form-item label="评分">
                    <el-rate v-model="reviewForm.rating" show-text :disabled="isReadOnly" />
                </el-form-item>
                <el-form-item label="评价内容">
                    <el-input v-model="reviewForm.content" type="textarea" :rows="3"
                        :placeholder="isReadOnly ? '没有填写文字评价' : '这件商品怎么样？卖家人好吗？'" :readonly="isReadOnly" />
                </el-form-item>
            </el-form>
            <template #footer>
                <el-button @click="reviewDialogVisible = false">{{ isReadOnly ? '关闭' : '取消' }}</el-button>
                <el-button v-if="!isReadOnly" type="primary" @click="submitReview">提交评价</el-button>
            </template>
        </el-dialog>
    </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import request from '../utils/request';
import { ElMessage } from 'element-plus';

// 1. 更新接口定义
interface Order {
    order_id: number;
    total_amount: string;
    status: number;
    created_at: string;
    item_title: string;
    main_image: string;
    // 新增字段
    my_rating?: number;
    my_review?: string;
}

const loading = ref(false);
const orderList = ref<Order[]>([]);

// 评价弹窗状态
const reviewDialogVisible = ref(false);
const isReadOnly = ref(false); // 新增：是否只读模式
const reviewForm = reactive({
    order_id: 0,
    rating: 5,
    content: ''
});

const getStatusText = (status: number) => {
    const map: any = { 0: '待付款', 1: '待发货', 2: '待收货', 3: '已完成', 4: '已取消' };
    return map[status] || '未知';
};
const getStatusType = (status: number) => {
    const map: any = { 0: 'warning', 1: 'danger', 2: 'primary', 3: 'success', 4: 'info' };
    return map[status] || 'info';
};

const fetchOrders = async () => {
    loading.value = true;
    try {
        const res: any = await request.get('/orders');
        if (res.code === 200) {
            orderList.value = res.data;
        }
    } catch (error) {
        console.error(error);
    } finally {
        loading.value = false;
    }
};

// 动作：打开评价 (写模式)
const openReviewDialog = (order: Order) => {
    isReadOnly.value = false; // 允许编辑
    reviewForm.order_id = order.order_id;
    reviewForm.rating = 5;
    reviewForm.content = '';
    reviewDialogVisible.value = true;
};

// 动作：查看评价 (读模式)
const viewReview = (order: Order) => {
    isReadOnly.value = true; // 禁止编辑
    reviewForm.order_id = order.order_id;
    // 回显数据
    reviewForm.rating = order.my_rating || 0;
    reviewForm.content = order.my_review || '';
    reviewDialogVisible.value = true;
};

// 动作：提交评价
const submitReview = async () => {
    if (reviewForm.rating === 0) return ElMessage.warning('请打分');
    try {
        const res: any = await request.post('/reviews', reviewForm);
        if (res.code === 200) {
            ElMessage.success('评价成功！');
            reviewDialogVisible.value = false;
            fetchOrders(); // 刷新列表，按钮会变成“查看评价”
        }
    } catch (e) { }
};

const handleCancel = async (orderId: number) => {
    try {
        const res: any = await request.post(`/orders/${orderId}/cancel`);
        if (res.code === 200) { ElMessage.success('订单已取消'); fetchOrders(); }
    } catch (e) { }
};
const handlePay = async (orderId: number) => {
    try {
        const res: any = await request.post(`/orders/${orderId}/pay`);
        if (res.code === 200) { ElMessage.success('支付成功'); fetchOrders(); }
    } catch (e) { }
};
const handleReceive = async (orderId: number) => {
    try {
        const res: any = await request.post(`/orders/${orderId}/receive`);
        if (res.code === 200) { ElMessage.success('交易完成'); fetchOrders(); }
    } catch (e) { }
};

onMounted(() => {
    fetchOrders();
});
</script>

<style scoped>
.page-container {
    padding: 20px;
}

.card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.item-info {
    display: flex;
    align-items: center;
    gap: 10px;
}

.item-title {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 200px;
}
</style>