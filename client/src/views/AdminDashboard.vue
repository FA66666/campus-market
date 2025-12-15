<script setup lang="ts">
import { ref, onMounted } from 'vue'
import request from '../utils/request'

const activeTab = ref('items') // items, users, complaints

// 数据列表
const pendingItems = ref<any[]>([])
const users = ref<any[]>([])
const complaints = ref<any[]>([])

// 投诉处理弹窗
const showComplaintModal = ref(false)
const currentComplaintId = ref<number | null>(null)
const complaintForm = ref({ result: 'resolved', reply: '', deduct_points: 0 })

// --- 商品审核 ---
const fetchPendingItems = async () => {
    const res: any = await request.get('/admin/items/pending')
    if (res.code === 200) pendingItems.value = res.data
}

const auditItem = async (id: number, action: string) => {
    try {
        const res: any = await request.post(`/admin/items/${id}/audit`, { action })
        if (res.code === 200) {
            alert('操作成功')
            fetchPendingItems()
        }
    } catch (err) {
        alert('操作失败')
    }
}

// --- 用户管理 ---
const fetchUsers = async () => {
    const res: any = await request.get('/admin/users')
    if (res.code === 200) users.value = res.data
}

const toggleBanUser = async (user: any) => {
    const action = user.status === 1 ? 'ban' : 'unban'
    const confirmText = action === 'ban' ? '封禁' : '解封'
    if (!confirm(`确定要${confirmText}用户 ${user.username} 吗？`)) return

    try {
        const res: any = await request.post(`/admin/users/${user.user_id}/manage`, { action })
        if (res.code === 200) {
            alert('操作成功')
            fetchUsers()
        }
    } catch (err) {
        alert('操作失败')
    }
}

// --- 投诉处理 ---
const fetchComplaints = async () => {
    const res: any = await request.get('/admin/complaints')
    if (res.code === 200) complaints.value = res.data
}

const openComplaintHandle = (id: number) => {
    currentComplaintId.value = id
    complaintForm.value = { result: 'resolved', reply: '', deduct_points: 0 }
    showComplaintModal.value = true
}

const submitComplaintHandle = async () => {
    if (!currentComplaintId.value) return
    try {
        const res: any = await request.post(`/admin/complaints/${currentComplaintId.value}/resolve`, complaintForm.value)
        if (res.code === 200) {
            alert('处理完成')
            showComplaintModal.value = false
            fetchComplaints()
        }
    } catch (err) {
        alert('提交失败')
    }
}

onMounted(() => {
    fetchPendingItems()
})

const switchTab = (tab: string) => {
    activeTab.value = tab
    if (tab === 'items') fetchPendingItems()
    if (tab === 'users') fetchUsers()
    if (tab === 'complaints') fetchComplaints()
}
</script>

<template>
    <div class="admin-dashboard">
        <div class="sidebar">
            <h3>后台管理</h3>
            <ul>
                <li :class="{ active: activeTab === 'items' }" @click="switchTab('items')">商品审核</li>
                <li :class="{ active: activeTab === 'users' }" @click="switchTab('users')">用户管理</li>
                <li :class="{ active: activeTab === 'complaints' }" @click="switchTab('complaints')">投诉处理</li>
            </ul>
        </div>

        <div class="main-content">
            <div v-if="activeTab === 'items'">
                <h2>待审核商品</h2>
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>标题</th>
                            <th>卖家</th>
                            <th>价格</th>
                            <th>操作</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-for="item in pendingItems" :key="item.item_id">
                            <td>{{ item.item_id }}</td>
                            <td>{{ item.title }}</td>
                            <td>{{ item.seller_name }}</td>
                            <td>{{ item.price }}</td>
                            <td>
                                <button @click="auditItem(item.item_id, 'approve')" class="btn-success">通过</button>
                                <button @click="auditItem(item.item_id, 'reject')" class="btn-danger">驳回</button>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <div v-if="activeTab === 'users'">
                <h2>用户管理</h2>
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>用户名</th>
                            <th>信誉分</th>
                            <th>状态</th>
                            <th>操作</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-for="u in users" :key="u.user_id">
                            <td>{{ u.user_id }}</td>
                            <td>{{ u.username }}</td>
                            <td>{{ u.credit_score }}</td>
                            <td>
                                <span :class="u.status === 1 ? 'text-green' : 'text-red'">
                                    {{ u.status === 1 ? '正常' : '封禁' }}
                                </span>
                            </td>
                            <td>
                                <button v-if="u.status === 1" @click="toggleBanUser(u)" class="btn-danger">封禁</button>
                                <button v-else @click="toggleBanUser(u)" class="btn-success">解封</button>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <div v-if="activeTab === 'complaints'">
                <h2>投诉列表</h2>
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>投诉人</th>
                            <th>原因</th>
                            <th>状态</th>
                            <th>操作</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-for="c in complaints" :key="c.complaint_id">
                            <td>{{ c.complaint_id }}</td>
                            <td>{{ c.reporter_name }}</td>
                            <td>{{ c.reason }}</td>
                            <td>{{ c.status === 0 ? '待处理' : (c.status === 1 ? '驳回' : '已处理') }}</td>
                            <td>
                                <button v-if="c.status === 0" @click="openComplaintHandle(c.complaint_id)"
                                    class="btn-primary">处理</button>
                                <span v-else>已归档</span>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>

        <div v-if="showComplaintModal" class="modal-overlay">
            <div class="modal-content">
                <h3>处理投诉</h3>
                <div class="form-group">
                    <label>处理结果:</label>
                    <select v-model="complaintForm.result">
                        <option value="resolved">投诉成立（已解决）</option>
                        <option value="rejected">驳回投诉</option>
                    </select>
                </div>
                <div class="form-group" v-if="complaintForm.result === 'resolved'">
                    <label>扣除信誉分:</label>
                    <input type="number" v-model="complaintForm.deduct_points" min="0" />
                </div>
                <div class="form-group">
                    <label>管理员回复:</label>
                    <textarea v-model="complaintForm.reply" rows="3"></textarea>
                </div>
                <div class="actions">
                    <button @click="showComplaintModal = false">取消</button>
                    <button @click="submitComplaintHandle" class="btn-primary">确认处理</button>
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped>
.admin-dashboard {
    display: flex;
    min-height: 80vh;
}

.sidebar {
    width: 200px;
    background: #f0f2f5;
    padding: 20px;
}

.sidebar li {
    list-style: none;
    padding: 10px;
    cursor: pointer;
    border-radius: 4px;
    margin-bottom: 5px;
}

.sidebar li.active {
    background: #409eff;
    color: white;
}

.main-content {
    flex: 1;
    padding: 20px;
}

.data-table {
    width: 100%;
    border-collapse: collapse;
    margin-top: 20px;
}

.data-table th,
.data-table td {
    border: 1px solid #ddd;
    padding: 8px;
    text-align: left;
}

.data-table th {
    background-color: #f5f5f5;
}

.btn-success {
    background: #67c23a;
    color: white;
    border: none;
    padding: 4px 8px;
    border-radius: 4px;
    cursor: pointer;
    margin-right: 5px;
}

.btn-danger {
    background: #f56c6c;
    color: white;
    border: none;
    padding: 4px 8px;
    border-radius: 4px;
    cursor: pointer;
}

.btn-primary {
    background: #409eff;
    color: white;
    border: none;
    padding: 4px 8px;
    border-radius: 4px;
    cursor: pointer;
}

.text-green {
    color: #67c23a;
}

.text-red {
    color: #f56c6c;
}

/* 弹窗样式复用 */
.modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    justify-content: center;
    align-items: center;
}

.modal-content {
    background: white;
    padding: 20px;
    border-radius: 8px;
    width: 400px;
}

.form-group {
    margin-bottom: 15px;
}

.form-group label {
    display: block;
    margin-bottom: 5px;
}

.form-group input,
.form-group select,
.form-group textarea {
    width: 100%;
    padding: 8px;
    box-sizing: border-box;
}

.actions {
    display: flex;
    justify-content: flex-end;
    gap: 10px;
}
</style>