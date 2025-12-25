<script setup lang="ts">
import { ref, onMounted } from 'vue'
import request from '../utils/request'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Edit, Delete, Star, StarFilled } from '@element-plus/icons-vue'

interface Address {
    address_id: number
    receiver_name: string
    receiver_phone: string
    address: string
    is_default: number
}

const addresses = ref<Address[]>([])
const loading = ref(false)
const showModal = ref(false)
const isEditing = ref(false)
const currentId = ref<number | null>(null)
const form = ref({
    receiver_name: '',
    receiver_phone: '',
    address: '',
    is_default: false
})

// 获取地址列表
const fetchAddresses = async () => {
    loading.value = true
    try {
        const res: any = await request.get('/addresses')
        if (res.code === 200) {
            addresses.value = res.data
        }
    } catch (err) {
        ElMessage.error('获取地址列表失败')
    } finally {
        loading.value = false
    }
}

// 打开新增弹窗
const openAddModal = () => {
    isEditing.value = false
    currentId.value = null
    form.value = { receiver_name: '', receiver_phone: '', address: '', is_default: false }
    showModal.value = true
}

// 打开编辑弹窗
const openEditModal = (addr: Address) => {
    isEditing.value = true
    currentId.value = addr.address_id
    form.value = {
        receiver_name: addr.receiver_name,
        receiver_phone: addr.receiver_phone,
        address: addr.address,
        is_default: addr.is_default === 1
    }
    showModal.value = true
}

// 提交表单
const submitForm = async () => {
    if (!form.value.receiver_name || !form.value.receiver_phone || !form.value.address) {
        ElMessage.warning('请填写完整信息')
        return
    }

    try {
        if (isEditing.value && currentId.value) {
            const res: any = await request.put(`/addresses/${currentId.value}`, form.value)
            if (res.code === 200) {
                ElMessage.success('地址更新成功')
            }
        } else {
            const res: any = await request.post('/addresses', form.value)
            if (res.code === 201) {
                ElMessage.success('地址添加成功')
            }
        }
        showModal.value = false
        fetchAddresses()
    } catch (err) {
        ElMessage.error('操作失败')
    }
}

// 删除地址
const deleteAddress = async (id: number) => {
    try {
        await ElMessageBox.confirm('确定要删除这个地址吗？', '确认删除', {
            confirmButtonText: '确定',
            cancelButtonText: '取消',
            type: 'warning'
        })

        const res: any = await request.delete(`/addresses/${id}`)
        if (res.code === 200) {
            ElMessage.success('删除成功')
            fetchAddresses()
        }
    } catch (err) {
        if (err !== 'cancel') ElMessage.error('删除失败')
    }
}

// 设置默认地址
const setDefault = async (id: number) => {
    try {
        const res: any = await request.post(`/addresses/${id}/default`)
        if (res.code === 200) {
            ElMessage.success('已设为默认地址')
            fetchAddresses()
        }
    } catch (err) {
        ElMessage.error('操作失败')
    }
}

onMounted(() => {
    fetchAddresses()
})
</script>

<template>
    <div class="address-container">
        <div class="page-header">
            <h2>收货地址管理</h2>
            <el-button type="primary" :icon="Plus" @click="openAddModal">新增地址</el-button>
        </div>

        <div v-loading="loading">
            <div v-if="addresses.length === 0" class="empty-state">
                <el-empty description="暂无收货地址，快去添加吧~" />
            </div>

            <div v-else class="address-list">
                <el-card v-for="addr in addresses" :key="addr.address_id" class="address-card" shadow="hover">
                    <div class="address-content">
                        <div class="address-info">
                            <div class="receiver-line">
                                <span class="receiver-name">{{ addr.receiver_name }}</span>
                                <span class="receiver-phone">{{ addr.receiver_phone }}</span>
                                <el-tag v-if="addr.is_default === 1" type="warning" size="small">默认</el-tag>
                            </div>
                            <div class="address-text">{{ addr.address }}</div>
                        </div>
                        <div class="address-actions">
                            <el-button v-if="addr.is_default !== 1" type="warning" link :icon="Star"
                                @click="setDefault(addr.address_id)">
                                设为默认
                            </el-button>
                            <el-button v-else type="warning" link :icon="StarFilled" disabled>
                                默认地址
                            </el-button>
                            <el-button type="primary" link :icon="Edit" @click="openEditModal(addr)">编辑</el-button>
                            <el-button type="danger" link :icon="Delete"
                                @click="deleteAddress(addr.address_id)">删除</el-button>
                        </div>
                    </div>
                </el-card>
            </div>
        </div>

        <!-- 新增/编辑弹窗 -->
        <el-dialog v-model="showModal" :title="isEditing ? '编辑地址' : '新增地址'" width="500px" align-center>
            <el-form :model="form" label-width="100px">
                <el-form-item label="收货人">
                    <el-input v-model="form.receiver_name" placeholder="请输入收货人姓名" />
                </el-form-item>
                <el-form-item label="联系电话">
                    <el-input v-model="form.receiver_phone" placeholder="请输入联系电话" />
                </el-form-item>
                <el-form-item label="详细地址">
                    <el-input v-model="form.address" type="textarea" :rows="3" placeholder="请输入详细地址" />
                </el-form-item>
                <el-form-item label="设为默认">
                    <el-switch v-model="form.is_default" />
                </el-form-item>
            </el-form>
            <template #footer>
                <span class="dialog-footer">
                    <el-button @click="showModal = false">取消</el-button>
                    <el-button type="primary" @click="submitForm">确定</el-button>
                </span>
            </template>
        </el-dialog>
    </div>
</template>

<style scoped>
.address-container {
    max-width: 800px;
    margin: 20px auto;
    padding: 20px;
}

.page-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
}

.page-header h2 {
    margin: 0;
}

.address-list {
    display: flex;
    flex-direction: column;
    gap: 15px;
}

.address-card {
    transition: all 0.3s;
}

.address-card:hover {
    transform: translateX(5px);
}

.address-content {
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.address-info {
    flex: 1;
}

.receiver-line {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 8px;
}

.receiver-name {
    font-weight: bold;
    font-size: 16px;
}

.receiver-phone {
    color: #909399;
}

.address-text {
    color: #606266;
    font-size: 14px;
}

.address-actions {
    display: flex;
    gap: 5px;
}

.empty-state {
    padding: 40px 0;
}
</style>
