<script setup lang="ts">
import { ref, onMounted, nextTick, computed } from 'vue'
import request from '../utils/request'
import * as echarts from 'echarts'
import {
    DataLine,
    Goods,
    User,
    List,
    ChatDotRound,
    Warning,
    Checked,
    UserFilled,
    ShoppingCart,
    Money,
    TrendCharts,
    Setting,
    Avatar,
    OfficeBuilding
} from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'

const activeTab = ref('dashboard') // dashboard, items, users, orders, reviews, complaints, auth, sysUsers, roles, departs

// 数据列表
const pendingItems = ref<any[]>([])
const users = ref<any[]>([])
const orders = ref<any[]>([])
const reviews = ref<any[]>([])
const complaints = ref<any[]>([])
const pendingAuthUsers = ref<any[]>([])

// RBAC 数据
const sysUsers = ref<any[]>([])
const roles = ref<any[]>([])
const departs = ref<any[]>([])

// 当前管理员信息
const currentAdmin = computed(() => {
    const info = localStorage.getItem('admin_info')
    return info ? JSON.parse(info) : {}
})
const isSuperAdmin = computed(() => currentAdmin.value.roles?.includes('SUPER_ADMIN'))

// 统计数据
const platformStats = ref<any>({})
const pendingStats = ref<any>({})
const orderTrend = ref<any[]>([])
const categoryStats = ref<any[]>([])
const orderStatusStats = ref<any[]>([])
const creditDistribution = ref<any[]>([])

// 筛选条件
const orderFilter = ref({ status: '', keyword: '', start_date: '', end_date: '' })
const reviewFilter = ref({ status: '', keyword: '' })

// 投诉处理弹窗
const showComplaintModal = ref(false)
const currentComplaintId = ref<number | null>(null)
const complaintForm = ref({ result: 'resolved', reply: '', deduct_points: 0 })

// 订单详情弹窗
const showOrderModal = ref(false)
const currentOrderDetail = ref<any>(null)

// 认证材料预览弹窗
const showAuthImageModal = ref(false)
const currentAuthImage = ref('')

// 批量选择
const selectedItems = ref<number[]>([])

// 驳回弹窗
const showRejectModal = ref(false)
const rejectForm = ref({ item_id: 0, reject_reason: '', is_batch: false })

// RBAC 弹窗
const showSysUserModal = ref(false)
const showRoleModal = ref(false)
const showDepartModal = ref(false)
const isEditMode = ref(false)

// RBAC 表单
const sysUserForm = ref({
    id: '',
    username: '',
    password: '',
    realname: '',
    org_code: '',
    status: 1,
    role_ids: [] as string[],
    depart_ids: [] as string[]
})
const roleForm = ref({ id: '', role_name: '', role_code: '' })
const departForm = ref({ id: '', depart_name: '', org_code: '' })

// 图表实例
let orderTrendChart: echarts.ECharts | null = null
let categoryChart: echarts.ECharts | null = null
let orderStatusChart: echarts.ECharts | null = null
let creditChart: echarts.ECharts | null = null

// --- 数据看板 ---
const fetchDashboardData = async () => {
    try {
        const [statsRes, pendingRes, trendRes, categoryRes, statusRes, creditRes] = await Promise.all([
            request.get('/stats'),
            request.get('/stats/pending'),
            request.get('/stats/order-trend?days=7'),
            request.get('/stats/category'),
            request.get('/stats/order-status'),
            request.get('/stats/credit-distribution')
        ])
        if (statsRes.code === 200) platformStats.value = statsRes.data
        if (pendingRes.code === 200) pendingStats.value = pendingRes.data
        if (trendRes.code === 200) orderTrend.value = trendRes.data
        if (categoryRes.code === 200) categoryStats.value = categoryRes.data
        if (statusRes.code === 200) orderStatusStats.value = statusRes.data
        if (creditRes.code === 200) creditDistribution.value = creditRes.data

        await nextTick()
        renderCharts()
    } catch (err) {
        console.error('获取统计数据失败:', err)
    }
}

const renderCharts = () => {
    // 订单趋势折线图
    const trendDom = document.getElementById('orderTrendChart')
    if (trendDom) {
        if (orderTrendChart) orderTrendChart.dispose()
        orderTrendChart = echarts.init(trendDom)
        orderTrendChart.setOption({
            title: { text: '近7天订单趋势', left: 'center' },
            tooltip: { trigger: 'axis' },
            xAxis: {
                type: 'category',
                data: orderTrend.value.map((d: any) => d.date?.substring(5, 10) || '')
            },
            yAxis: [
                { type: 'value', name: '订单数' },
                { type: 'value', name: '金额', position: 'right' }
            ],
            series: [
                {
                    name: '订单数',
                    type: 'bar',
                    data: orderTrend.value.map((d: any) => d.order_count || 0),
                    itemStyle: { color: '#409eff' }
                },
                {
                    name: '销售额',
                    type: 'line',
                    yAxisIndex: 1,
                    data: orderTrend.value.map((d: any) => d.total_amount || 0),
                    itemStyle: { color: '#67c23a' }
                }
            ]
        })
    }

    // 分类商品数量柱状图
    const categoryDom = document.getElementById('categoryChart')
    if (categoryDom) {
        if (categoryChart) categoryChart.dispose()
        categoryChart = echarts.init(categoryDom)
        categoryChart.setOption({
            title: { text: '各分类商品数量', left: 'center' },
            tooltip: { trigger: 'axis' },
            xAxis: {
                type: 'category',
                data: categoryStats.value.map((d: any) => d.category_name),
                axisLabel: { rotate: 30 }
            },
            yAxis: { type: 'value', name: '商品数' },
            series: [{
                type: 'bar',
                data: categoryStats.value.map((d: any) => d.item_count || 0),
                itemStyle: { color: '#e6a23c' }
            }]
        })
    }

    // 订单状态饼图
    const statusDom = document.getElementById('orderStatusChart')
    if (statusDom) {
        if (orderStatusChart) orderStatusChart.dispose()
        orderStatusChart = echarts.init(statusDom)
        orderStatusChart.setOption({
            title: { text: '订单状态分布', left: 'center' },
            tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
            series: [{
                type: 'pie',
                radius: '60%',
                data: orderStatusStats.value.map((d: any) => ({
                    name: d.name,
                    value: d.count
                })),
                emphasis: {
                    itemStyle: {
                        shadowBlur: 10,
                        shadowOffsetX: 0,
                        shadowColor: 'rgba(0, 0, 0, 0.5)'
                    }
                }
            }]
        })
    }

    // 信誉分分布饼图
    const creditDom = document.getElementById('creditChart')
    if (creditDom) {
        if (creditChart) creditChart.dispose()
        creditChart = echarts.init(creditDom)
        creditChart.setOption({
            title: { text: '用户信誉分分布', left: 'center' },
            tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
            color: ['#67c23a', '#409eff', '#e6a23c', '#f56c6c'],
            series: [{
                type: 'pie',
                radius: '60%',
                data: creditDistribution.value.map((d: any) => ({
                    name: d.level,
                    value: d.count
                }))
            }]
        })
    }
}

// --- 商品审核 ---
const fetchPendingItems = async () => {
    const res: any = await request.get('/admin/items/pending')
    if (res.code === 200) pendingItems.value = res.data
}

// 打开驳回弹窗
const openRejectModal = (itemId: number, isBatch: boolean = false) => {
    rejectForm.value = { item_id: itemId, reject_reason: '', is_batch: isBatch }
    showRejectModal.value = true
}

// 提交驳回
const submitReject = async () => {
    try {
        if (rejectForm.value.is_batch) {
            // 批量驳回
            const res: any = await request.post('/admin/items/batch/audit', {
                item_ids: selectedItems.value,
                action: 'reject',
                reject_reason: rejectForm.value.reject_reason || '审核未通过'
            })
            if (res.code === 200) {
                ElMessage.success('批量驳回成功')
                selectedItems.value = []
                fetchPendingItems()
            }
        } else {
            // 单个驳回
            const res: any = await request.post(`/admin/items/${rejectForm.value.item_id}/audit`, {
                action: 'reject',
                reject_reason: rejectForm.value.reject_reason || '审核未通过'
            })
            if (res.code === 200) {
                ElMessage.success('驳回成功')
                fetchPendingItems()
            }
        }
        showRejectModal.value = false
    } catch (err) {
        ElMessage.error('操作失败')
    }
}

// 通过审核
const approveItem = async (id: number) => {
    try {
        const res: any = await request.post(`/admin/items/${id}/audit`, { action: 'approve' })
        if (res.code === 200) {
            ElMessage.success('审核通过')
            fetchPendingItems()
        }
    } catch (err) {
        ElMessage.error('操作失败')
    }
}

// 批量通过
const batchApproveItems = async () => {
    if (selectedItems.value.length === 0) {
        ElMessage.warning('请先选择商品')
        return
    }
    try {
        const res: any = await request.post('/admin/items/batch/audit', {
            item_ids: selectedItems.value,
            action: 'approve'
        })
        if (res.code === 200) {
            ElMessage.success('批量通过成功')
            selectedItems.value = []
            fetchPendingItems()
        }
    } catch (err) {
        ElMessage.error('操作失败')
    }
}

// 批量驳回（打开弹窗）
const batchRejectItems = () => {
    if (selectedItems.value.length === 0) {
        ElMessage.warning('请先选择商品')
        return
    }
    openRejectModal(0, true)
}

const toggleItemSelect = (itemId: number) => {
    const idx = selectedItems.value.indexOf(itemId)
    if (idx > -1) {
        selectedItems.value.splice(idx, 1)
    } else {
        selectedItems.value.push(itemId)
    }
}

const toggleSelectAll = () => {
    if (selectedItems.value.length === pendingItems.value.length) {
        selectedItems.value = []
    } else {
        selectedItems.value = pendingItems.value.map(i => i.item_id)
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

    try {
        await ElMessageBox.confirm(`确定要${confirmText}用户 ${user.username} 吗？`, '确认操作', {
            confirmButtonText: '确定',
            cancelButtonText: '取消',
            type: 'warning'
        })
        const res: any = await request.post(`/admin/users/${user.user_id}/manage`, { action })
        if (res.code === 200) {
            ElMessage.success('操作成功')
            fetchUsers()
        }
    } catch (err: any) {
        if (err !== 'cancel') {
            ElMessage.error('操作失败')
        }
    }
}

// --- 订单管理 ---
const fetchOrders = async () => {
    const params = new URLSearchParams()
    if (orderFilter.value.status) params.append('status', orderFilter.value.status)
    if (orderFilter.value.keyword) params.append('keyword', orderFilter.value.keyword)
    if (orderFilter.value.start_date) params.append('start_date', orderFilter.value.start_date)
    if (orderFilter.value.end_date) params.append('end_date', orderFilter.value.end_date)

    const res: any = await request.get(`/admin/orders?${params.toString()}`)
    if (res.code === 200) orders.value = res.data
}

const viewOrderDetail = async (orderId: number) => {
    const res: any = await request.get(`/admin/orders/${orderId}`)
    if (res.code === 200) {
        currentOrderDetail.value = res.data
        showOrderModal.value = true
    }
}

const getOrderStatusText = (status: number) => {
    const map: { [key: number]: string } = {
        0: '待付款', 1: '待发货', 2: '待收货', 3: '已完成', 4: '已取消'
    }
    return map[status] || '未知'
}

// --- 评价管理 ---
const fetchReviews = async () => {
    const params = new URLSearchParams()
    if (reviewFilter.value.status !== '') params.append('status', reviewFilter.value.status)
    if (reviewFilter.value.keyword) params.append('keyword', reviewFilter.value.keyword)

    const res: any = await request.get(`/admin/reviews?${params.toString()}`)
    if (res.code === 200) reviews.value = res.data
}

const toggleReviewVisibility = async (review: any) => {
    const action = review.is_hidden === 0 ? 'hide' : 'show'
    const confirmText = action === 'hide' ? '屏蔽' : '恢复显示'

    try {
        await ElMessageBox.confirm(`确定要${confirmText}这条评价吗？`, '确认操作', {
            confirmButtonText: '确定',
            cancelButtonText: '取消',
            type: 'warning'
        })
        const res: any = await request.post(`/admin/reviews/${review.review_id}/toggle`, { action })
        if (res.code === 200) {
            ElMessage.success(res.message || '操作成功')
            fetchReviews()
        }
    } catch (err: any) {
        if (err !== 'cancel') {
            ElMessage.error('操作失败')
        }
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
            ElMessage.success('处理完成')
            showComplaintModal.value = false
            fetchComplaints()
        }
    } catch (err) {
        ElMessage.error('提交失败')
    }
}

// --- 用户认证审核 ---
const fetchPendingAuthUsers = async () => {
    const res: any = await request.get('/admin/users/pending-auth')
    if (res.code === 200) pendingAuthUsers.value = res.data
}

const viewAuthImage = (imagePath: string) => {
    // 构建完整的图片URL
    currentAuthImage.value = import.meta.env.VITE_API_BASE_URL?.replace('/api', '') + imagePath || 'http://localhost:3000' + imagePath
    showAuthImageModal.value = true
}

const verifyUser = async (userId: number, action: string) => {
    try {
        const res: any = await request.post(`/admin/users/${userId}/verify`, { action })
        if (res.code === 200) {
            ElMessage.success(res.message || '操作成功')
            fetchPendingAuthUsers()
        }
    } catch (err) {
        ElMessage.error('操作失败')
    }
}

// ============================================
// RBAC 管理方法
// ============================================

// --- 系统管理员管理 ---
const fetchSysUsers = async () => {
    const res: any = await request.get('/admin/sys-users')
    if (res.code === 200) sysUsers.value = res.data
}

const openSysUserModal = async (user?: any) => {
    isEditMode.value = !!user
    if (user) {
        // 编辑模式：获取详情
        const res: any = await request.get(`/admin/sys-users/${user.id}`)
        if (res.code === 200) {
            sysUserForm.value = {
                id: res.data.id,
                username: res.data.username,
                password: '',
                realname: res.data.realname || '',
                org_code: res.data.org_code || '',
                status: res.data.status,
                role_ids: res.data.role_ids || [],
                depart_ids: res.data.depart_ids || []
            }
        }
    } else {
        // 新增模式
        sysUserForm.value = {
            id: '',
            username: '',
            password: '',
            realname: '',
            org_code: '',
            status: 1,
            role_ids: [],
            depart_ids: []
        }
    }
    // 确保有角色和部门列表
    if (roles.value.length === 0) await fetchRoles()
    if (departs.value.length === 0) await fetchDeparts()
    showSysUserModal.value = true
}

const saveSysUser = async () => {
    try {
        if (!sysUserForm.value.username) {
            ElMessage.warning('请输入用户名')
            return
        }
        if (!isEditMode.value && !sysUserForm.value.password) {
            ElMessage.warning('请输入密码')
            return
        }

        if (isEditMode.value) {
            const res: any = await request.put(`/admin/sys-users/${sysUserForm.value.id}`, sysUserForm.value)
            if (res.code === 200) {
                ElMessage.success('更新成功')
                showSysUserModal.value = false
                fetchSysUsers()
            }
        } else {
            const res: any = await request.post('/admin/sys-users', sysUserForm.value)
            if (res.code === 200) {
                ElMessage.success('创建成功')
                showSysUserModal.value = false
                fetchSysUsers()
            }
        }
    } catch (err: any) {
        ElMessage.error(err.response?.data?.message || '操作失败')
    }
}

const deleteSysUser = async (user: any) => {
    try {
        await ElMessageBox.confirm(`确定要删除管理员 ${user.username} 吗？`, '确认删除', {
            confirmButtonText: '确定',
            cancelButtonText: '取消',
            type: 'warning'
        })
        const res: any = await request.delete(`/admin/sys-users/${user.id}`)
        if (res.code === 200) {
            ElMessage.success('删除成功')
            fetchSysUsers()
        }
    } catch (err: any) {
        if (err !== 'cancel') {
            ElMessage.error(err.response?.data?.message || '删除失败')
        }
    }
}

// --- 角色管理 ---
const fetchRoles = async () => {
    const res: any = await request.get('/admin/roles')
    if (res.code === 200) roles.value = res.data
}

const openRoleModal = (role?: any) => {
    isEditMode.value = !!role
    if (role) {
        roleForm.value = { id: role.id, role_name: role.role_name, role_code: role.role_code }
    } else {
        roleForm.value = { id: '', role_name: '', role_code: '' }
    }
    showRoleModal.value = true
}

const saveRole = async () => {
    try {
        if (!roleForm.value.role_name || !roleForm.value.role_code) {
            ElMessage.warning('请填写角色名称和编码')
            return
        }

        if (isEditMode.value) {
            const res: any = await request.put(`/admin/roles/${roleForm.value.id}`, roleForm.value)
            if (res.code === 200) {
                ElMessage.success('更新成功')
                showRoleModal.value = false
                fetchRoles()
            }
        } else {
            const res: any = await request.post('/admin/roles', roleForm.value)
            if (res.code === 200) {
                ElMessage.success('创建成功')
                showRoleModal.value = false
                fetchRoles()
            }
        }
    } catch (err: any) {
        ElMessage.error(err.response?.data?.message || '操作失败')
    }
}

const deleteRole = async (role: any) => {
    try {
        await ElMessageBox.confirm(`确定要删除角色 ${role.role_name} 吗？`, '确认删除', {
            confirmButtonText: '确定',
            cancelButtonText: '取消',
            type: 'warning'
        })
        const res: any = await request.delete(`/admin/roles/${role.id}`)
        if (res.code === 200) {
            ElMessage.success('删除成功')
            fetchRoles()
        }
    } catch (err: any) {
        if (err !== 'cancel') {
            ElMessage.error(err.response?.data?.message || '删除失败')
        }
    }
}

// --- 部门管理 ---
const fetchDeparts = async () => {
    const res: any = await request.get('/admin/departs')
    if (res.code === 200) departs.value = res.data
}

const openDepartModal = (depart?: any) => {
    isEditMode.value = !!depart
    if (depart) {
        departForm.value = { id: depart.id, depart_name: depart.depart_name, org_code: depart.org_code }
    } else {
        departForm.value = { id: '', depart_name: '', org_code: '' }
    }
    showDepartModal.value = true
}

const saveDepart = async () => {
    try {
        if (!departForm.value.depart_name || !departForm.value.org_code) {
            ElMessage.warning('请填写部门名称和组织编码')
            return
        }

        if (isEditMode.value) {
            const res: any = await request.put(`/admin/departs/${departForm.value.id}`, departForm.value)
            if (res.code === 200) {
                ElMessage.success('更新成功')
                showDepartModal.value = false
                fetchDeparts()
            }
        } else {
            const res: any = await request.post('/admin/departs', departForm.value)
            if (res.code === 200) {
                ElMessage.success('创建成功')
                showDepartModal.value = false
                fetchDeparts()
            }
        }
    } catch (err: any) {
        ElMessage.error(err.response?.data?.message || '操作失败')
    }
}

const deleteDepart = async (depart: any) => {
    try {
        await ElMessageBox.confirm(`确定要删除部门 ${depart.depart_name} 吗？`, '确认删除', {
            confirmButtonText: '确定',
            cancelButtonText: '取消',
            type: 'warning'
        })
        const res: any = await request.delete(`/admin/departs/${depart.id}`)
        if (res.code === 200) {
            ElMessage.success('删除成功')
            fetchDeparts()
        }
    } catch (err: any) {
        if (err !== 'cancel') {
            ElMessage.error(err.response?.data?.message || '删除失败')
        }
    }
}

onMounted(() => {
    fetchDashboardData()
})

const switchTab = (tab: string) => {
    activeTab.value = tab
    if (tab === 'dashboard') fetchDashboardData()
    if (tab === 'items') fetchPendingItems()
    if (tab === 'users') fetchUsers()
    if (tab === 'orders') fetchOrders()
    if (tab === 'reviews') fetchReviews()
    if (tab === 'complaints') fetchComplaints()
    if (tab === 'auth') fetchPendingAuthUsers()
    if (tab === 'sysUsers') fetchSysUsers()
    if (tab === 'roles') fetchRoles()
    if (tab === 'departs') fetchDeparts()
}

// 监听窗口大小变化，重新调整图表
window.addEventListener('resize', () => {
    orderTrendChart?.resize()
    categoryChart?.resize()
    orderStatusChart?.resize()
    creditChart?.resize()
})
</script>

<template>
    <div class="admin-dashboard">
        <div class="sidebar">
            <ul class="menu-list">
                <li :class="{ active: activeTab === 'dashboard' }" @click="switchTab('dashboard')">
                    <el-icon><DataLine /></el-icon>
                    <span>数据看板</span>
                </li>
                <li :class="{ active: activeTab === 'items' }" @click="switchTab('items')">
                    <el-icon><Goods /></el-icon>
                    <span>商品审核</span>
                    <span v-if="pendingStats.pending_items" class="badge">{{ pendingStats.pending_items }}</span>
                </li>
                <li :class="{ active: activeTab === 'users' }" @click="switchTab('users')">
                    <el-icon><User /></el-icon>
                    <span>用户管理</span>
                </li>
                <li :class="{ active: activeTab === 'orders' }" @click="switchTab('orders')">
                    <el-icon><List /></el-icon>
                    <span>订单管理</span>
                </li>
                <li :class="{ active: activeTab === 'reviews' }" @click="switchTab('reviews')">
                    <el-icon><ChatDotRound /></el-icon>
                    <span>评价管理</span>
                </li>
                <li :class="{ active: activeTab === 'complaints' }" @click="switchTab('complaints')">
                    <el-icon><Warning /></el-icon>
                    <span>投诉处理</span>
                    <span v-if="pendingStats.pending_complaints" class="badge">{{ pendingStats.pending_complaints }}</span>
                </li>
                <li :class="{ active: activeTab === 'auth' }" @click="switchTab('auth')">
                    <el-icon><Checked /></el-icon>
                    <span>认证审核</span>
                    <span v-if="pendingStats.pending_auth" class="badge">{{ pendingStats.pending_auth }}</span>
                </li>

                <!-- RBAC 权限管理 (仅超级管理员可见) -->
                <template v-if="isSuperAdmin">
                    <li class="menu-divider">
                        <span class="divider-text">权限管理</span>
                    </li>
                    <li :class="{ active: activeTab === 'sysUsers' }" @click="switchTab('sysUsers')">
                        <el-icon><Avatar /></el-icon>
                        <span>管理员管理</span>
                    </li>
                    <li :class="{ active: activeTab === 'roles' }" @click="switchTab('roles')">
                        <el-icon><Setting /></el-icon>
                        <span>角色管理</span>
                    </li>
                    <li :class="{ active: activeTab === 'departs' }" @click="switchTab('departs')">
                        <el-icon><OfficeBuilding /></el-icon>
                        <span>部门管理</span>
                    </li>
                </template>
            </ul>
        </div>

        <div class="main-content">
            <!-- 数据看板 -->
            <div v-if="activeTab === 'dashboard'" class="page-section">
                <div class="page-header">
                    <h2>数据看板</h2>
                    <p class="subtitle">平台运营数据概览</p>
                </div>

                <!-- KPI卡片 -->
                <div class="stats-cards">
                    <div class="stat-card users">
                        <div class="stat-icon">
                            <el-icon><UserFilled /></el-icon>
                        </div>
                        <div class="stat-info">
                            <div class="stat-value">{{ platformStats.total_active_users || 0 }}</div>
                            <div class="stat-label">活跃用户</div>
                        </div>
                    </div>
                    <div class="stat-card items">
                        <div class="stat-icon">
                            <el-icon><Goods /></el-icon>
                        </div>
                        <div class="stat-info">
                            <div class="stat-value">{{ platformStats.active_items || 0 }}</div>
                            <div class="stat-label">上架商品</div>
                        </div>
                    </div>
                    <div class="stat-card orders">
                        <div class="stat-icon">
                            <el-icon><ShoppingCart /></el-icon>
                        </div>
                        <div class="stat-info">
                            <div class="stat-value">{{ platformStats.completed_orders || 0 }}</div>
                            <div class="stat-label">完成订单</div>
                        </div>
                    </div>
                    <div class="stat-card gmv">
                        <div class="stat-icon">
                            <el-icon><Money /></el-icon>
                        </div>
                        <div class="stat-info">
                            <div class="stat-value">¥{{ Number(platformStats.total_gmv || 0).toFixed(2) }}</div>
                            <div class="stat-label">平台GMV</div>
                        </div>
                    </div>
                </div>

                <!-- 待处理提醒 -->
                <div class="pending-alerts" v-if="pendingStats.pending_items || pendingStats.pending_complaints || pendingStats.pending_auth">
                    <div class="alert-item warning" v-if="pendingStats.pending_items" @click="switchTab('items')">
                        <el-icon><Goods /></el-icon>
                        <span><strong>{{ pendingStats.pending_items }}</strong> 件商品待审核</span>
                    </div>
                    <div class="alert-item danger" v-if="pendingStats.pending_complaints" @click="switchTab('complaints')">
                        <el-icon><Warning /></el-icon>
                        <span><strong>{{ pendingStats.pending_complaints }}</strong> 条投诉待处理</span>
                    </div>
                    <div class="alert-item info" v-if="pendingStats.pending_auth" @click="switchTab('auth')">
                        <el-icon><Checked /></el-icon>
                        <span><strong>{{ pendingStats.pending_auth }}</strong> 个用户待认证</span>
                    </div>
                </div>

                <!-- 图表区域 -->
                <div class="charts-container">
                    <div class="chart-row">
                        <div class="chart-card">
                            <div id="orderTrendChart" class="chart-box"></div>
                        </div>
                        <div class="chart-card">
                            <div id="categoryChart" class="chart-box"></div>
                        </div>
                    </div>
                    <div class="chart-row">
                        <div class="chart-card">
                            <div id="orderStatusChart" class="chart-box"></div>
                        </div>
                        <div class="chart-card">
                            <div id="creditChart" class="chart-box"></div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- 商品审核 -->
            <div v-if="activeTab === 'items'" class="page-section">
                <div class="page-header">
                    <h2>待审核商品</h2>
                    <div class="batch-actions" v-if="pendingItems.length > 0">
                        <el-button @click="toggleSelectAll" type="primary" plain>
                            {{ selectedItems.length === pendingItems.length ? '取消全选' : '全选' }}
                        </el-button>
                        <el-button @click="batchApproveItems" type="success" :disabled="selectedItems.length === 0">
                            批量通过 ({{ selectedItems.length }})
                        </el-button>
                        <el-button @click="batchRejectItems" type="danger" :disabled="selectedItems.length === 0">
                            批量驳回 ({{ selectedItems.length }})
                        </el-button>
                    </div>
                </div>
                <div class="table-card">
                    <el-table :data="pendingItems" stripe style="width: 100%">
                        <el-table-column width="55">
                            <template #default="{ row }">
                                <el-checkbox :model-value="selectedItems.includes(row.item_id)" @change="toggleItemSelect(row.item_id)" />
                            </template>
                        </el-table-column>
                        <el-table-column prop="item_id" label="ID" width="80" />
                        <el-table-column prop="title" label="标题" min-width="200" />
                        <el-table-column prop="seller_name" label="卖家" width="120" />
                        <el-table-column label="价格" width="100">
                            <template #default="{ row }">
                                <span class="price">¥{{ row.price }}</span>
                            </template>
                        </el-table-column>
                        <el-table-column label="操作" width="160" fixed="right">
                            <template #default="{ row }">
                                <el-button type="success" size="small" @click="approveItem(row.item_id)">通过</el-button>
                                <el-button type="danger" size="small" @click="openRejectModal(row.item_id)">驳回</el-button>
                            </template>
                        </el-table-column>
                    </el-table>
                    <el-empty v-if="pendingItems.length === 0" description="暂无待审核商品" />
                </div>
            </div>

            <!-- 用户管理 -->
            <div v-if="activeTab === 'users'" class="page-section">
                <div class="page-header">
                    <h2>用户管理</h2>
                </div>
                <div class="table-card">
                    <el-table :data="users" stripe style="width: 100%">
                        <el-table-column prop="user_id" label="ID" width="80" />
                        <el-table-column prop="username" label="用户名" width="150" />
                        <el-table-column prop="student_id" label="学号" width="150">
                            <template #default="{ row }">{{ row.student_id || '-' }}</template>
                        </el-table-column>
                        <el-table-column prop="credit_score" label="信誉分" width="100">
                            <template #default="{ row }">
                                <el-tag :type="row.credit_score >= 80 ? 'success' : row.credit_score >= 60 ? 'warning' : 'danger'">
                                    {{ row.credit_score }}
                                </el-tag>
                            </template>
                        </el-table-column>
                        <el-table-column label="状态" width="100">
                            <template #default="{ row }">
                                <el-tag :type="row.status === 1 ? 'success' : row.status === 0 ? 'danger' : 'info'">
                                    {{ row.status === 1 ? '正常' : (row.status === 0 ? '封禁' : '待认证') }}
                                </el-tag>
                            </template>
                        </el-table-column>
                        <el-table-column label="操作" width="100" fixed="right">
                            <template #default="{ row }">
                                <el-button v-if="row.status === 1" type="danger" size="small" @click="toggleBanUser(row)">封禁</el-button>
                                <el-button v-else-if="row.status === 0" type="success" size="small" @click="toggleBanUser(row)">解封</el-button>
                            </template>
                        </el-table-column>
                    </el-table>
                </div>
            </div>

            <!-- 订单管理 -->
            <div v-if="activeTab === 'orders'" class="page-section">
                <div class="page-header">
                    <h2>订单管理</h2>
                </div>
                <div class="filter-card">
                    <el-select v-model="orderFilter.status" placeholder="全部状态" clearable style="width: 120px">
                        <el-option label="待付款" value="0" />
                        <el-option label="待发货" value="1" />
                        <el-option label="待收货" value="2" />
                        <el-option label="已完成" value="3" />
                        <el-option label="已取消" value="4" />
                    </el-select>
                    <el-input v-model="orderFilter.keyword" placeholder="订单ID/用户名" clearable style="width: 180px" />
                    <el-date-picker v-model="orderFilter.start_date" type="date" placeholder="开始日期" value-format="YYYY-MM-DD" style="width: 150px" />
                    <span class="date-separator">至</span>
                    <el-date-picker v-model="orderFilter.end_date" type="date" placeholder="结束日期" value-format="YYYY-MM-DD" style="width: 150px" />
                    <el-button type="primary" @click="fetchOrders">搜索</el-button>
                </div>
                <div class="table-card">
                    <el-table :data="orders" stripe style="width: 100%">
                        <el-table-column prop="order_id" label="订单ID" width="100" />
                        <el-table-column prop="buyer_name" label="买家" width="120" />
                        <el-table-column prop="seller_name" label="卖家" width="120" />
                        <el-table-column label="金额" width="100">
                            <template #default="{ row }">
                                <span class="price">¥{{ row.total_price }}</span>
                            </template>
                        </el-table-column>
                        <el-table-column label="状态" width="100">
                            <template #default="{ row }">
                                <el-tag :type="['info', 'warning', 'primary', 'success', 'danger'][row.status]">
                                    {{ getOrderStatusText(row.status) }}
                                </el-tag>
                            </template>
                        </el-table-column>
                        <el-table-column label="创建时间" width="160">
                            <template #default="{ row }">{{ row.created_at?.substring(0, 16) }}</template>
                        </el-table-column>
                        <el-table-column label="操作" width="80" fixed="right">
                            <template #default="{ row }">
                                <el-button type="primary" size="small" link @click="viewOrderDetail(row.order_id)">详情</el-button>
                            </template>
                        </el-table-column>
                    </el-table>
                    <el-empty v-if="orders.length === 0" description="暂无订单数据" />
                </div>
            </div>

            <!-- 评价管理 -->
            <div v-if="activeTab === 'reviews'" class="page-section">
                <div class="page-header">
                    <h2>评价管理</h2>
                </div>
                <div class="filter-card">
                    <el-select v-model="reviewFilter.status" placeholder="全部状态" clearable style="width: 120px">
                        <el-option label="正常" value="0" />
                        <el-option label="已屏蔽" value="1" />
                    </el-select>
                    <el-input v-model="reviewFilter.keyword" placeholder="评价内容/用户名" clearable style="width: 180px" />
                    <el-button type="primary" @click="fetchReviews">搜索</el-button>
                </div>
                <div class="table-card">
                    <el-table :data="reviews" stripe style="width: 100%">
                        <el-table-column prop="review_id" label="ID" width="80" />
                        <el-table-column prop="reviewer_name" label="评价人" width="120" />
                        <el-table-column prop="reviewed_name" label="被评价人" width="120" />
                        <el-table-column label="评分" width="140">
                            <template #default="{ row }">
                                <el-rate v-model="row.rating" disabled />
                            </template>
                        </el-table-column>
                        <el-table-column prop="content" label="内容" min-width="200" show-overflow-tooltip>
                            <template #default="{ row }">{{ row.content || '-' }}</template>
                        </el-table-column>
                        <el-table-column label="状态" width="100">
                            <template #default="{ row }">
                                <el-tag :type="row.is_hidden === 0 ? 'success' : 'danger'">
                                    {{ row.is_hidden === 0 ? '正常' : '已屏蔽' }}
                                </el-tag>
                            </template>
                        </el-table-column>
                        <el-table-column label="时间" width="120">
                            <template #default="{ row }">{{ row.created_at?.substring(0, 10) }}</template>
                        </el-table-column>
                        <el-table-column label="操作" width="80" fixed="right">
                            <template #default="{ row }">
                                <el-button v-if="row.is_hidden === 0" type="danger" size="small" @click="toggleReviewVisibility(row)">屏蔽</el-button>
                                <el-button v-else type="success" size="small" @click="toggleReviewVisibility(row)">恢复</el-button>
                            </template>
                        </el-table-column>
                    </el-table>
                    <el-empty v-if="reviews.length === 0" description="暂无评价数据" />
                </div>
            </div>

            <!-- 投诉处理 -->
            <div v-if="activeTab === 'complaints'" class="page-section">
                <div class="page-header">
                    <h2>投诉列表</h2>
                </div>
                <div class="table-card">
                    <el-table :data="complaints" stripe style="width: 100%">
                        <el-table-column prop="complaint_id" label="ID" width="80" />
                        <el-table-column prop="reporter_name" label="投诉人" width="120" />
                        <el-table-column label="投诉类型" width="100">
                            <template #default="{ row }">
                                <el-tag type="info">{{ row.target_type === 1 ? '用户' : (row.target_type === 2 ? '商品' : '订单') }}</el-tag>
                            </template>
                        </el-table-column>
                        <el-table-column prop="reason" label="原因" min-width="200" show-overflow-tooltip />
                        <el-table-column label="状态" width="100">
                            <template #default="{ row }">
                                <el-tag :type="row.status === 0 ? 'warning' : (row.status === 1 ? 'info' : 'success')">
                                    {{ row.status === 0 ? '待处理' : (row.status === 1 ? '已驳回' : '已处理') }}
                                </el-tag>
                            </template>
                        </el-table-column>
                        <el-table-column label="时间" width="120">
                            <template #default="{ row }">{{ row.created_at?.substring(0, 10) }}</template>
                        </el-table-column>
                        <el-table-column label="操作" width="100" fixed="right">
                            <template #default="{ row }">
                                <el-button v-if="row.status === 0" type="primary" size="small" @click="openComplaintHandle(row.complaint_id)">处理</el-button>
                                <span v-else class="text-muted">已归档</span>
                            </template>
                        </el-table-column>
                    </el-table>
                    <el-empty v-if="complaints.length === 0" description="暂无投诉数据" />
                </div>
            </div>

            <!-- 认证审核 -->
            <div v-if="activeTab === 'auth'" class="page-section">
                <div class="page-header">
                    <h2>待认证用户</h2>
                </div>
                <div class="table-card">
                    <el-table :data="pendingAuthUsers" stripe style="width: 100%">
                        <el-table-column prop="user_id" label="ID" width="80" />
                        <el-table-column prop="username" label="用户名" width="150" />
                        <el-table-column prop="student_id" label="学号" width="150" />
                        <el-table-column prop="real_name" label="真实姓名" width="120" />
                        <el-table-column label="认证材料" width="120">
                            <template #default="{ row }">
                                <el-button v-if="row.auth_material" type="primary" size="small" link @click="viewAuthImage(row.auth_material)">
                                    查看图片
                                </el-button>
                                <span v-else class="text-muted">未提交</span>
                            </template>
                        </el-table-column>
                        <el-table-column label="注册时间" width="120">
                            <template #default="{ row }">{{ row.created_at?.substring(0, 10) }}</template>
                        </el-table-column>
                        <el-table-column label="操作" width="160" fixed="right">
                            <template #default="{ row }">
                                <el-button type="success" size="small" @click="verifyUser(row.user_id, 'approve')">通过</el-button>
                                <el-button type="danger" size="small" @click="verifyUser(row.user_id, 'reject')">驳回</el-button>
                            </template>
                        </el-table-column>
                    </el-table>
                    <el-empty v-if="pendingAuthUsers.length === 0" description="暂无待审核的认证申请" />
                </div>
            </div>

            <!-- ============================================ -->
            <!-- RBAC 管理页面 -->
            <!-- ============================================ -->

            <!-- 管理员管理 -->
            <div v-if="activeTab === 'sysUsers'" class="page-section">
                <div class="page-header">
                    <h2>管理员管理</h2>
                    <el-button type="primary" @click="openSysUserModal()">新增管理员</el-button>
                </div>
                <div class="table-card">
                    <el-table :data="sysUsers" stripe style="width: 100%">
                        <el-table-column prop="username" label="用户名" width="150" />
                        <el-table-column prop="realname" label="真实姓名" width="120">
                            <template #default="{ row }">{{ row.realname || '-' }}</template>
                        </el-table-column>
                        <el-table-column label="角色" min-width="180">
                            <template #default="{ row }">
                                <template v-if="row.role_names">
                                    <el-tag v-for="role in row.role_names.split(',')" :key="role" size="small" class="role-tag">
                                        {{ role }}
                                    </el-tag>
                                </template>
                                <span v-else class="text-muted">未分配</span>
                            </template>
                        </el-table-column>
                        <el-table-column label="部门" min-width="150">
                            <template #default="{ row }">
                                <template v-if="row.depart_names">
                                    <el-tag v-for="dep in row.depart_names.split(',')" :key="dep" type="info" size="small" class="role-tag">
                                        {{ dep }}
                                    </el-tag>
                                </template>
                                <span v-else class="text-muted">未分配</span>
                            </template>
                        </el-table-column>
                        <el-table-column label="状态" width="80">
                            <template #default="{ row }">
                                <el-tag :type="row.status === 1 ? 'success' : 'danger'" size="small">
                                    {{ row.status === 1 ? '正常' : '冻结' }}
                                </el-tag>
                            </template>
                        </el-table-column>
                        <el-table-column label="创建时间" width="120">
                            <template #default="{ row }">{{ row.created_at?.substring(0, 10) }}</template>
                        </el-table-column>
                        <el-table-column label="操作" width="140" fixed="right">
                            <template #default="{ row }">
                                <el-button type="primary" size="small" link @click="openSysUserModal(row)">编辑</el-button>
                                <el-button type="danger" size="small" link @click="deleteSysUser(row)">删除</el-button>
                            </template>
                        </el-table-column>
                    </el-table>
                    <el-empty v-if="sysUsers.length === 0" description="暂无管理员数据" />
                </div>
            </div>

            <!-- 角色管理 -->
            <div v-if="activeTab === 'roles'" class="page-section">
                <div class="page-header">
                    <h2>角色管理</h2>
                    <el-button type="primary" @click="openRoleModal()">新增角色</el-button>
                </div>
                <div class="table-card">
                    <el-table :data="roles" stripe style="width: 100%">
                        <el-table-column prop="role_name" label="角色名称" width="200" />
                        <el-table-column prop="role_code" label="角色编码" width="200">
                            <template #default="{ row }">
                                <el-tag type="warning" effect="plain">{{ row.role_code }}</el-tag>
                            </template>
                        </el-table-column>
                        <el-table-column label="关联用户数" width="120">
                            <template #default="{ row }">
                                <el-tag type="info" size="small">{{ row.user_count || 0 }} 人</el-tag>
                            </template>
                        </el-table-column>
                        <el-table-column label="操作" width="140" fixed="right">
                            <template #default="{ row }">
                                <el-button type="primary" size="small" link @click="openRoleModal(row)">编辑</el-button>
                                <el-button type="danger" size="small" link @click="deleteRole(row)" :disabled="row.user_count > 0">删除</el-button>
                            </template>
                        </el-table-column>
                    </el-table>
                    <el-empty v-if="roles.length === 0" description="暂无角色数据" />
                </div>
            </div>

            <!-- 部门管理 -->
            <div v-if="activeTab === 'departs'" class="page-section">
                <div class="page-header">
                    <h2>部门管理</h2>
                    <el-button type="primary" @click="openDepartModal()">新增部门</el-button>
                </div>
                <div class="table-card">
                    <el-table :data="departs" stripe style="width: 100%">
                        <el-table-column prop="depart_name" label="部门名称" width="200" />
                        <el-table-column prop="org_code" label="组织编码" width="200">
                            <template #default="{ row }">
                                <el-tag type="info" effect="plain">{{ row.org_code }}</el-tag>
                            </template>
                        </el-table-column>
                        <el-table-column label="关联用户数" width="120">
                            <template #default="{ row }">
                                <el-tag type="info" size="small">{{ row.user_count || 0 }} 人</el-tag>
                            </template>
                        </el-table-column>
                        <el-table-column label="操作" width="140" fixed="right">
                            <template #default="{ row }">
                                <el-button type="primary" size="small" link @click="openDepartModal(row)">编辑</el-button>
                                <el-button type="danger" size="small" link @click="deleteDepart(row)" :disabled="row.user_count > 0">删除</el-button>
                            </template>
                        </el-table-column>
                    </el-table>
                    <el-empty v-if="departs.length === 0" description="暂无部门数据" />
                </div>
            </div>
        </div>

        <!-- 投诉处理弹窗 -->
        <el-dialog v-model="showComplaintModal" title="处理投诉" width="480px">
            <el-form label-width="100px">
                <el-form-item label="处理结果">
                    <el-select v-model="complaintForm.result" style="width: 100%">
                        <el-option label="投诉成立（已解决）" value="resolved" />
                        <el-option label="驳回投诉" value="rejected" />
                    </el-select>
                </el-form-item>
                <el-form-item v-if="complaintForm.result === 'resolved'" label="扣除信誉分">
                    <el-input-number v-model="complaintForm.deduct_points" :min="0" :max="100" />
                </el-form-item>
                <el-form-item label="管理员回复">
                    <el-input v-model="complaintForm.reply" type="textarea" :rows="3" placeholder="请输入回复内容" />
                </el-form-item>
            </el-form>
            <template #footer>
                <el-button @click="showComplaintModal = false">取消</el-button>
                <el-button type="primary" @click="submitComplaintHandle">确认处理</el-button>
            </template>
        </el-dialog>

        <!-- 订单详情弹窗 -->
        <el-dialog v-model="showOrderModal" title="订单详情" width="640px">
            <div class="order-detail" v-if="currentOrderDetail">
                <el-descriptions :column="2" border>
                    <el-descriptions-item label="订单ID">{{ currentOrderDetail.order?.order_id }}</el-descriptions-item>
                    <el-descriptions-item label="订单状态">
                        <el-tag>{{ getOrderStatusText(currentOrderDetail.order?.status) }}</el-tag>
                    </el-descriptions-item>
                    <el-descriptions-item label="买家">{{ currentOrderDetail.order?.buyer_name }} ({{ currentOrderDetail.order?.buyer_real_name || '-' }})</el-descriptions-item>
                    <el-descriptions-item label="卖家">{{ currentOrderDetail.order?.seller_name }} ({{ currentOrderDetail.order?.seller_real_name || '-' }})</el-descriptions-item>
                    <el-descriptions-item label="订单金额">
                        <span class="price">¥{{ currentOrderDetail.order?.total_price }}</span>
                    </el-descriptions-item>
                    <el-descriptions-item label="创建时间">{{ currentOrderDetail.order?.created_at }}</el-descriptions-item>
                </el-descriptions>

                <h4 class="section-title">商品列表</h4>
                <el-table :data="currentOrderDetail.items" size="small" border>
                    <el-table-column prop="title" label="商品" />
                    <el-table-column label="单价" width="100">
                        <template #default="{ row }">¥{{ row.price }}</template>
                    </el-table-column>
                    <el-table-column prop="quantity" label="数量" width="80" />
                </el-table>

                <template v-if="currentOrderDetail.reviews?.length">
                    <h4 class="section-title">评价记录</h4>
                    <div v-for="review in currentOrderDetail.reviews" :key="review.review_id" class="review-card">
                        <div class="review-header">
                            <span class="reviewer">{{ review.reviewer_name }}</span>
                            <el-rate v-model="review.rating" disabled />
                        </div>
                        <div class="review-content">{{ review.content || '无评价内容' }}</div>
                    </div>
                </template>
            </div>
            <template #footer>
                <el-button type="primary" @click="showOrderModal = false">关闭</el-button>
            </template>
        </el-dialog>

        <!-- 驳回原因弹窗 -->
        <el-dialog v-model="showRejectModal" title="驳回商品" width="450px">
            <el-form label-width="100px">
                <el-form-item label="驳回原因">
                    <el-input
                        v-model="rejectForm.reject_reason"
                        type="textarea"
                        :rows="3"
                        placeholder="请输入驳回原因，将通知卖家（选填）"
                    />
                </el-form-item>
                <el-form-item label="常用原因">
                    <div class="quick-reasons">
                        <el-tag
                            v-for="reason in ['商品信息不完整', '图片不清晰', '价格异常', '违禁商品', '描述与图片不符']"
                            :key="reason"
                            @click="rejectForm.reject_reason = reason"
                            class="reason-tag"
                            effect="plain"
                        >
                            {{ reason }}
                        </el-tag>
                    </div>
                </el-form-item>
            </el-form>
            <template #footer>
                <el-button @click="showRejectModal = false">取消</el-button>
                <el-button type="danger" @click="submitReject">确认驳回</el-button>
            </template>
        </el-dialog>

        <!-- 认证材料预览弹窗 -->
        <el-dialog v-model="showAuthImageModal" title="认证材料预览" width="600px">
            <div class="auth-image-preview">
                <img :src="currentAuthImage" alt="认证材料" />
            </div>
            <template #footer>
                <el-button type="primary" @click="showAuthImageModal = false">关闭</el-button>
            </template>
        </el-dialog>

        <!-- ============================================ -->
        <!-- RBAC 管理弹窗 -->
        <!-- ============================================ -->

        <!-- 管理员编辑弹窗 -->
        <el-dialog v-model="showSysUserModal" :title="isEditMode ? '编辑管理员' : '新增管理员'" width="560px">
            <el-form :model="sysUserForm" label-width="100px">
                <el-form-item label="用户名" required>
                    <el-input v-model="sysUserForm.username" :disabled="isEditMode" placeholder="请输入登录用户名" />
                </el-form-item>
                <el-form-item label="密码" :required="!isEditMode">
                    <el-input v-model="sysUserForm.password" type="password" show-password :placeholder="isEditMode ? '留空则不修改密码' : '请输入密码'" />
                </el-form-item>
                <el-form-item label="真实姓名">
                    <el-input v-model="sysUserForm.realname" placeholder="请输入真实姓名" />
                </el-form-item>
                <el-form-item label="组织编码">
                    <el-input v-model="sysUserForm.org_code" placeholder="请输入组织机构编码" />
                </el-form-item>
                <el-form-item label="状态">
                    <el-radio-group v-model="sysUserForm.status">
                        <el-radio :value="1">正常</el-radio>
                        <el-radio :value="2">冻结</el-radio>
                    </el-radio-group>
                </el-form-item>
                <el-form-item label="分配角色">
                    <el-select v-model="sysUserForm.role_ids" multiple placeholder="请选择角色" style="width: 100%">
                        <el-option v-for="role in roles" :key="role.id" :label="role.role_name" :value="role.id">
                            <span>{{ role.role_name }}</span>
                            <span style="color: #909399; font-size: 12px; margin-left: 8px;">{{ role.role_code }}</span>
                        </el-option>
                    </el-select>
                </el-form-item>
                <el-form-item label="分配部门">
                    <el-select v-model="sysUserForm.depart_ids" multiple placeholder="请选择部门" style="width: 100%">
                        <el-option v-for="dep in departs" :key="dep.id" :label="dep.depart_name" :value="dep.id">
                            <span>{{ dep.depart_name }}</span>
                            <span style="color: #909399; font-size: 12px; margin-left: 8px;">{{ dep.org_code }}</span>
                        </el-option>
                    </el-select>
                </el-form-item>
            </el-form>
            <template #footer>
                <el-button @click="showSysUserModal = false">取消</el-button>
                <el-button type="primary" @click="saveSysUser">确定</el-button>
            </template>
        </el-dialog>

        <!-- 角色编辑弹窗 -->
        <el-dialog v-model="showRoleModal" :title="isEditMode ? '编辑角色' : '新增角色'" width="450px">
            <el-form :model="roleForm" label-width="100px">
                <el-form-item label="角色名称" required>
                    <el-input v-model="roleForm.role_name" placeholder="如：超级管理员、审核员" />
                </el-form-item>
                <el-form-item label="角色编码" required>
                    <el-input v-model="roleForm.role_code" placeholder="如：SUPER_ADMIN、AUDITOR" />
                    <div class="form-tip">编码用于系统权限判断，建议使用大写英文和下划线</div>
                </el-form-item>
            </el-form>
            <template #footer>
                <el-button @click="showRoleModal = false">取消</el-button>
                <el-button type="primary" @click="saveRole">确定</el-button>
            </template>
        </el-dialog>

        <!-- 部门编辑弹窗 -->
        <el-dialog v-model="showDepartModal" :title="isEditMode ? '编辑部门' : '新增部门'" width="450px">
            <el-form :model="departForm" label-width="100px">
                <el-form-item label="部门名称" required>
                    <el-input v-model="departForm.depart_name" placeholder="如：运营部、审核部" />
                </el-form-item>
                <el-form-item label="组织编码" required>
                    <el-input v-model="departForm.org_code" placeholder="如：A01、A02" />
                    <div class="form-tip">组织编码用于标识部门层级结构</div>
                </el-form-item>
            </el-form>
            <template #footer>
                <el-button @click="showDepartModal = false">取消</el-button>
                <el-button type="primary" @click="saveDepart">确定</el-button>
            </template>
        </el-dialog>
    </div>
</template>

<style scoped>
.admin-dashboard {
    display: flex;
    height: calc(100vh - 60px);
    background: #f5f7fa;
}

/* 侧边栏样式 */
.sidebar {
    width: 220px;
    background: linear-gradient(180deg, #1e3a5f 0%, #152238 100%);
    padding: 0;
    flex-shrink: 0;
    box-shadow: 2px 0 8px rgba(0, 0, 0, 0.15);
}

.menu-list {
    list-style: none;
    padding: 12px 0;
    margin: 0;
}

.menu-list li {
    display: flex;
    align-items: center;
    padding: 14px 24px;
    cursor: pointer;
    color: rgba(255, 255, 255, 0.7);
    transition: all 0.3s ease;
    border-left: 3px solid transparent;
    margin: 4px 0;
}

.menu-list li .el-icon {
    margin-right: 12px;
    font-size: 18px;
}

.menu-list li span {
    flex: 1;
    font-size: 14px;
}

.menu-list li:hover {
    background: rgba(255, 255, 255, 0.08);
    color: #fff;
}

.menu-list li.active {
    background: linear-gradient(90deg, rgba(64, 158, 255, 0.3) 0%, transparent 100%);
    color: #fff;
    border-left-color: #409eff;
}

.menu-list li .badge {
    background: linear-gradient(135deg, #f56c6c 0%, #e64545 100%);
    color: white;
    padding: 2px 8px;
    border-radius: 12px;
    font-size: 12px;
    font-weight: 500;
    min-width: 20px;
    text-align: center;
    box-shadow: 0 2px 4px rgba(245, 108, 108, 0.4);
}

/* 主内容区 */
.main-content {
    flex: 1;
    padding: 24px;
    overflow-y: auto;
    overflow-x: hidden;
}

.page-section {
    animation: fadeIn 0.3s ease;
}

@keyframes fadeIn {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
}

.page-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 24px;
}

.page-header h2 {
    margin: 0;
    font-size: 22px;
    font-weight: 600;
    color: #303133;
}

.page-header .subtitle {
    margin: 4px 0 0;
    font-size: 14px;
    color: #909399;
}

/* 统计卡片 */
.stats-cards {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 20px;
    margin-bottom: 24px;
}

.stat-card {
    background: white;
    border-radius: 12px;
    padding: 24px;
    display: flex;
    align-items: center;
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
    transition: all 0.3s ease;
}

.stat-card:hover {
    transform: translateY(-4px);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
}

.stat-icon {
    width: 56px;
    height: 56px;
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-right: 16px;
}

.stat-icon .el-icon {
    font-size: 28px;
    color: white;
}

.stat-card.users .stat-icon {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.stat-card.items .stat-icon {
    background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
}

.stat-card.orders .stat-icon {
    background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
}

.stat-card.gmv .stat-icon {
    background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%);
}

.stat-info {
    flex: 1;
}

.stat-value {
    font-size: 28px;
    font-weight: 700;
    color: #303133;
    line-height: 1.2;
}

.stat-label {
    font-size: 14px;
    color: #909399;
    margin-top: 4px;
}

/* 待处理提醒 */
.pending-alerts {
    display: flex;
    gap: 16px;
    margin-bottom: 24px;
}

.alert-item {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 14px 20px;
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.3s ease;
    flex: 1;
}

.alert-item .el-icon {
    font-size: 20px;
}

.alert-item.warning {
    background: linear-gradient(135deg, #fff8e6 0%, #fff3cd 100%);
    border: 1px solid #ffeeba;
    color: #856404;
}

.alert-item.danger {
    background: linear-gradient(135deg, #ffe6e6 0%, #ffcccc 100%);
    border: 1px solid #f5c6cb;
    color: #721c24;
}

.alert-item.info {
    background: linear-gradient(135deg, #e6f4ff 0%, #cce5ff 100%);
    border: 1px solid #b8daff;
    color: #004085;
}

.alert-item:hover {
    transform: translateX(4px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

/* 图表区域 */
.charts-container {
    margin-top: 24px;
}

.chart-row {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 20px;
    margin-bottom: 20px;
}

.chart-card {
    background: white;
    border-radius: 12px;
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
    overflow: hidden;
}

.chart-box {
    height: 320px;
    padding: 16px;
}

/* 筛选卡片 */
.filter-card {
    background: white;
    border-radius: 12px;
    padding: 16px 20px;
    margin-bottom: 16px;
    display: flex;
    align-items: center;
    gap: 12px;
    flex-wrap: wrap;
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
}

.date-separator {
    color: #909399;
    font-size: 14px;
}

/* 表格卡片 */
.table-card {
    background: white;
    border-radius: 12px;
    padding: 20px;
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
}

.table-card :deep(.el-table) {
    border-radius: 8px;
    overflow: hidden;
}

.table-card :deep(.el-table th) {
    background: #f8fafc !important;
    font-weight: 600;
    color: #606266;
}

.table-card :deep(.el-table--striped .el-table__body tr.el-table__row--striped td) {
    background: #fafbfc;
}

/* 价格样式 */
.price {
    color: #f56c6c;
    font-weight: 600;
}

/* 文本样式 */
.text-muted {
    color: #909399;
    font-size: 13px;
}

/* 批量操作 */
.batch-actions {
    display: flex;
    gap: 10px;
}

/* 订单详情 */
.order-detail {
    padding: 10px 0;
}

.section-title {
    margin: 24px 0 12px;
    padding-bottom: 8px;
    border-bottom: 1px solid #ebeef5;
    font-size: 15px;
    font-weight: 600;
    color: #303133;
}

.review-card {
    padding: 16px;
    background: #f8fafc;
    border-radius: 8px;
    margin-bottom: 12px;
}

.review-header {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 8px;
}

.review-header .reviewer {
    font-weight: 600;
    color: #303133;
}

.review-content {
    color: #606266;
    font-size: 14px;
    line-height: 1.6;
}

/* 响应式布局 */
@media (max-width: 1400px) {
    .stats-cards {
        grid-template-columns: repeat(2, 1fr);
    }
}

@media (max-width: 1200px) {
    .chart-row {
        grid-template-columns: 1fr;
    }
}

@media (max-width: 768px) {
    .sidebar {
        width: 200px;
    }

    .stats-cards {
        grid-template-columns: 1fr;
    }

    .pending-alerts {
        flex-direction: column;
    }

    .filter-card {
        flex-direction: column;
        align-items: stretch;
    }
}

/* 驳回原因快捷标签 */
.quick-reasons {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
}

.reason-tag {
    cursor: pointer;
    transition: all 0.2s;
}

.reason-tag:hover {
    background: #f56c6c;
    color: white;
    border-color: #f56c6c;
}

/* 认证材料预览 */
.auth-image-preview {
    text-align: center;
    padding: 10px;
}

.auth-image-preview img {
    max-width: 100%;
    max-height: 400px;
    border-radius: 8px;
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
}

/* ============================================ */
/* RBAC 管理样式 */
/* ============================================ */

/* 菜单分隔线 */
.menu-divider {
    padding: 12px 24px 8px !important;
    cursor: default !important;
    border-left: none !important;
}

.menu-divider:hover {
    background: transparent !important;
}

.divider-text {
    font-size: 12px;
    color: rgba(255, 255, 255, 0.4);
    text-transform: uppercase;
    letter-spacing: 1px;
}

/* 角色标签 */
.role-tag {
    margin-right: 4px;
    margin-bottom: 4px;
}

/* 表单提示 */
.form-tip {
    font-size: 12px;
    color: #909399;
    margin-top: 4px;
    line-height: 1.4;
}
</style>
