<template>
    <div class="audit-container">
        <div class="header">
            <h2>商品审核队列</h2>
            <el-button @click="$router.push('/admin')">返回大屏</el-button>
        </div>

        <el-table :data="pendingList" style="width: 100%" v-loading="loading">
            <el-table-column prop="item_id" label="ID" width="80" />

            <el-table-column label="商品图" width="100">
                <template #default="scope">
                    <el-image :src="scope.row.main_image" style="width: 60px; height: 60px"
                        :preview-src-list="[scope.row.main_image]" fit="cover" />
                </template>
            </el-table-column>

            <el-table-column label="标题/描述" width="300">
                <template #default="scope">
                    <div class="title">{{ scope.row.title }}</div>
                    <div class="desc">{{ scope.row.description }}</div>
                </template>
            </el-table-column>

            <el-table-column label="价格" width="120">
                <template #default="scope">¥ {{ scope.row.price }}</template>
            </el-table-column>

            <el-table-column prop="seller_name" label="发布人" width="150" />
            <el-table-column prop="created_at" label="提交时间" />

            <el-table-column label="操作" fixed="right" width="200">
                <template #default="scope">
                    <el-button type="success" size="small"
                        @click="handleAudit(scope.row.item_id, 'approve')">通过</el-button>
                    <el-button type="danger" size="small"
                        @click="handleAudit(scope.row.item_id, 'reject')">驳回</el-button>
                </template>
            </el-table-column>
        </el-table>

        <el-empty v-if="!loading && pendingList.length === 0" description="暂无待审核商品" />
    </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import request from '../utils/request';
import { ElMessage } from 'element-plus';

const loading = ref(false);
const pendingList = ref<any[]>([]);

const fetchPending = async () => {
    loading.value = true;
    try {
        const res: any = await request.get('/admin/items/pending');
        if (res.code === 200) {
            pendingList.value = res.data;
        }
    } catch (e) {
        console.error(e);
    } finally {
        loading.value = false;
    }
};

const handleAudit = async (itemId: number, action: 'approve' | 'reject') => {
    try {
        const res: any = await request.post(`/admin/items/${itemId}/audit`, { action });
        if (res.code === 200) {
            ElMessage.success(action === 'approve' ? '已通过上架' : '已驳回');
            fetchPending(); // 刷新列表
        }
    } catch (e) { }
};

onMounted(() => {
    fetchPending();
});
</script>

<style scoped>
.audit-container {
    padding: 30px;
    background: #fff;
    min-height: 100vh;
}

.header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
}

.title {
    font-weight: bold;
    margin-bottom: 5px;
}

.desc {
    font-size: 12px;
    color: #666;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}
</style>