<template>
    <div class="page-container">
        <el-card class="box-card">
            <template #header>
                <div class="card-header">
                    <span>我卖出的宝贝 (卖家中心)</span>
                    <el-button link type="primary" @click="fetchSales">刷新</el-button>
                </div>
            </template>

            <el-table :data="salesList" style="width: 100%" v-loading="loading">
                <el-table-column label="商品" width="250">
                    <template #default="scope">
                        <div class="item-info">
                            <el-image :src="scope.row.main_image" style="width: 40px; height: 40px; border-radius: 4px"
                                fit="cover" />
                            <span class="text-truncate">{{ scope.row.item_title }}</span>
                        </div>
                    </template>
                </el-table-column>

                <el-table-column label="买家/收货信息" width="280">
                    <template #default="scope">
                        <div class="buyer-info">
                            <div><el-icon>
                                    <User />
                                </el-icon> {{ scope.row.buyer_name }}</div>
                            <div class="addr-text">地址: {{ scope.row.delivery_snapshot }}</div>
                            <div class="addr-text">电话: {{ scope.row.receiver_phone }}</div>
                        </div>
                    </template>
                </el-table-column>

                <el-table-column label="金额" width="100">
                    <template #default="scope">¥{{ scope.row.total_amount }}</template>
                </el-table-column>

                <el-table-column label="状态" width="100">
                    <template #default="scope">
                        <el-tag :type="getStatusType(scope.row.status)">
                            {{ getStatusText(scope.row.status) }}
                        </el-tag>
                    </template>
                </el-table-column>

                <el-table-column label="操作">
                    <template #default="scope">
                        <el-popconfirm v-if="scope.row.status === 1" title="确认按地址发货吗？"
                            @confirm="handleShip(scope.row.order_id)">
                            <template #reference>
                                <el-button type="primary" size="small">立即发货</el-button>
                            </template>
                        </el-popconfirm>

                        <span v-else-if="scope.row.status === 0" style="color:#999">等待买家付款</span>
                        <span v-else-if="scope.row.status === 2" style="color:#67C23A">已发货，待收货</span>
                        <span v-else-if="scope.row.status === 3" style="color:#67C23A">交易成功</span>
                        <span v-else style="color:#999">已取消</span>
                    </template>
                </el-table-column>
            </el-table>
        </el-card>
    </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import request from '../utils/request';
import { ElMessage } from 'element-plus';
import { User } from '@element-plus/icons-vue';

const loading = ref(false);
const salesList = ref<any[]>([]);

const getStatusText = (status: number) => {
    const map: any = { 0: '待付款', 1: '待发货', 2: '待收货', 3: '已完成', 4: '已取消' };
    return map[status] || '未知';
};
const getStatusType = (status: number) => {
    const map: any = { 0: 'warning', 1: 'danger', 2: 'primary', 3: 'success', 4: 'info' };
    return map[status] || 'info';
};

const fetchSales = async () => {
    loading.value = true;
    try {
        const res: any = await request.get('/orders/sales');
        if (res.code === 200) salesList.value = res.data;
    } catch (e) {
        console.error(e);
    } finally {
        loading.value = false;
    }
};

const handleShip = async (orderId: number) => {
    try {
        const res: any = await request.post(`/orders/${orderId}/ship`);
        if (res.code === 200) {
            ElMessage.success('发货成功！');
            fetchSales();
        }
    } catch (e) { }
};

onMounted(() => fetchSales());
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
    gap: 8px;
}

.buyer-info {
    font-size: 12px;
    line-height: 1.5;
    color: #606266;
}

.addr-text {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    max-width: 250px;
}

.text-truncate {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    max-width: 150px;
}
</style>