<script setup lang="ts">
import { ref, onMounted, watch, nextTick } from 'vue'
import request from '../utils/request'
import * as echarts from 'echarts'

const activeTab = ref('dashboard') // dashboard, items, users, orders, reviews, complaints, auth

// 数据列表
const pendingItems = ref<any[]>([])
const users = ref<any[]>([])
const orders = ref<any[]>([])
const reviews = ref<any[]>([])
const complaints = ref<any[]>([])
const pendingAuthUsers = ref<any[]>([])

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

// 批量选择
const selectedItems = ref<number[]>([])

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

const batchAuditItems = async (action: string) => {
    if (selectedItems.value.length === 0) {
        alert('请先选择商品')
        return
    }
    try {
        const res: any = await request.post('/admin/items/batch/audit', {
            item_ids: selectedItems.value,
            action
        })
        if (res.code === 200) {
            alert('批量操作成功')
            selectedItems.value = []
            fetchPendingItems()
        }
    } catch (err) {
        alert('操作失败')
    }
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
    if (!confirm(`确定要${confirmText}这条评价吗？`)) return

    try {
        const res: any = await request.post(`/admin/reviews/${review.review_id}/toggle`, { action })
        if (res.code === 200) {
            alert(res.message)
            fetchReviews()
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

// --- 用户认证审核 ---
const fetchPendingAuthUsers = async () => {
    const res: any = await request.get('/admin/users/pending-auth')
    if (res.code === 200) pendingAuthUsers.value = res.data
}

const verifyUser = async (userId: number, action: string) => {
    try {
        const res: any = await request.post(`/admin/users/${userId}/verify`, { action })
        if (res.code === 200) {
            alert(res.message || '操作成功')
            fetchPendingAuthUsers()
        }
    } catch (err) {
        alert('操作失败')
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
            <h3>后台管理</h3>
            <ul>
                <li :class="{ active: activeTab === 'dashboard' }" @click="switchTab('dashboard')">数据看板</li>
                <li :class="{ active: activeTab === 'items' }" @click="switchTab('items')">
                    商品审核
                    <span v-if="pendingStats.pending_items" class="badge">{{ pendingStats.pending_items }}</span>
                </li>
                <li :class="{ active: activeTab === 'users' }" @click="switchTab('users')">用户管理</li>
                <li :class="{ active: activeTab === 'orders' }" @click="switchTab('orders')">订单管理</li>
                <li :class="{ active: activeTab === 'reviews' }" @click="switchTab('reviews')">评价管理</li>
                <li :class="{ active: activeTab === 'complaints' }" @click="switchTab('complaints')">
                    投诉处理
                    <span v-if="pendingStats.pending_complaints" class="badge">{{ pendingStats.pending_complaints
                        }}</span>
                </li>
                <li :class="{ active: activeTab === 'auth' }" @click="switchTab('auth')">
                    认证审核
                    <span v-if="pendingStats.pending_auth" class="badge">{{ pendingStats.pending_auth }}</span>
                </li>
            </ul>
        </div>

        <div class="main-content">
            <!-- 数据看板 -->
            <div v-if="activeTab === 'dashboard'">
                <h2>数据看板</h2>

                <!-- KPI卡片 -->
                <div class="stats-cards">
                    <div class="stat-card">
                        <div class="stat-value">{{ platformStats.total_active_users || 0 }}</div>
                        <div class="stat-label">活跃用户</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value">{{ platformStats.active_items || 0 }}</div>
                        <div class="stat-label">上架商品</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value">{{ platformStats.completed_orders || 0 }}</div>
                        <div class="stat-label">完成订单</div>
                    </div>
                    <div class="stat-card highlight">
                        <div class="stat-value">¥{{ (platformStats.total_gmv || 0).toFixed(2) }}</div>
                        <div class="stat-label">平台GMV</div>
                    </div>
                </div>

                <!-- 待处理提醒 -->
                <div class="pending-alerts" v-if="pendingStats.pending_items || pendingStats.pending_complaints || pendingStats.pending_auth">
                    <div class="alert-item" v-if="pendingStats.pending_items" @click="switchTab('items')">
                        <span class="alert-count">{{ pendingStats.pending_items }}</span> 件商品待审核
                    </div>
                    <div class="alert-item" v-if="pendingStats.pending_complaints" @click="switchTab('complaints')">
                        <span class="alert-count">{{ pendingStats.pending_complaints }}</span> 条投诉待处理
                    </div>
                    <div class="alert-item" v-if="pendingStats.pending_auth" @click="switchTab('auth')">
                        <span class="alert-count">{{ pendingStats.pending_auth }}</span> 个用户待认证
                    </div>
                </div>

                <!-- 图表区域 -->
                <div class="charts-container">
                    <div class="chart-row">
                        <div id="orderTrendChart" class="chart-box"></div>
                        <div id="categoryChart" class="chart-box"></div>
                    </div>
                    <div class="chart-row">
                        <div id="orderStatusChart" class="chart-box"></div>
                        <div id="creditChart" class="chart-box"></div>
                    </div>
                </div>
            </div>

            <!-- 商品审核 -->
            <div v-if="activeTab === 'items'">
                <h2>待审核商品</h2>
                <div class="batch-actions" v-if="pendingItems.length > 0">
                    <button @click="toggleSelectAll" class="btn-primary">
                        {{ selectedItems.length === pendingItems.length ? '取消全选' : '全选' }}
                    </button>
                    <button @click="batchAuditItems('approve')" class="btn-success"
                        :disabled="selectedItems.length === 0">
                        批量通过 ({{ selectedItems.length }})
                    </button>
                    <button @click="batchAuditItems('reject')" class="btn-danger"
                        :disabled="selectedItems.length === 0">
                        批量驳回 ({{ selectedItems.length }})
                    </button>
                </div>
                <table class="data-table">
                    <thead>
                        <tr>
                            <th style="width: 40px;"></th>
                            <th>ID</th>
                            <th>标题</th>
                            <th>卖家</th>
                            <th>价格</th>
                            <th>操作</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-for="item in pendingItems" :key="item.item_id">
                            <td>
                                <input type="checkbox" :checked="selectedItems.includes(item.item_id)"
                                    @change="toggleItemSelect(item.item_id)" />
                            </td>
                            <td>{{ item.item_id }}</td>
                            <td>{{ item.title }}</td>
                            <td>{{ item.seller_name }}</td>
                            <td>¥{{ item.price }}</td>
                            <td>
                                <button @click="auditItem(item.item_id, 'approve')" class="btn-success">通过</button>
                                <button @click="auditItem(item.item_id, 'reject')" class="btn-danger">驳回</button>
                            </td>
                        </tr>
                    </tbody>
                </table>
                <div v-if="pendingItems.length === 0" class="empty-tip">暂无待审核商品</div>
            </div>

            <!-- 用户管理 -->
            <div v-if="activeTab === 'users'">
                <h2>用户管理</h2>
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>用户名</th>
                            <th>学号</th>
                            <th>信誉分</th>
                            <th>状态</th>
                            <th>操作</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-for="u in users" :key="u.user_id">
                            <td>{{ u.user_id }}</td>
                            <td>{{ u.username }}</td>
                            <td>{{ u.student_id || '-' }}</td>
                            <td>{{ u.credit_score }}</td>
                            <td>
                                <span :class="u.status === 1 ? 'text-green' : 'text-red'">
                                    {{ u.status === 1 ? '正常' : (u.status === 0 ? '封禁' : '待认证') }}
                                </span>
                            </td>
                            <td>
                                <button v-if="u.status === 1" @click="toggleBanUser(u)" class="btn-danger">封禁</button>
                                <button v-else-if="u.status === 0" @click="toggleBanUser(u)"
                                    class="btn-success">解封</button>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <!-- 订单管理 -->
            <div v-if="activeTab === 'orders'">
                <h2>订单管理</h2>
                <div class="filter-bar">
                    <select v-model="orderFilter.status">
                        <option value="">全部状态</option>
                        <option value="0">待付款</option>
                        <option value="1">待发货</option>
                        <option value="2">待收货</option>
                        <option value="3">已完成</option>
                        <option value="4">已取消</option>
                    </select>
                    <input type="text" v-model="orderFilter.keyword" placeholder="订单ID/用户名" />
                    <input type="date" v-model="orderFilter.start_date" />
                    <span>至</span>
                    <input type="date" v-model="orderFilter.end_date" />
                    <button @click="fetchOrders" class="btn-primary">搜索</button>
                </div>
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>订单ID</th>
                            <th>买家</th>
                            <th>卖家</th>
                            <th>金额</th>
                            <th>状态</th>
                            <th>创建时间</th>
                            <th>操作</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-for="order in orders" :key="order.order_id">
                            <td>{{ order.order_id }}</td>
                            <td>{{ order.buyer_name }}</td>
                            <td>{{ order.seller_name }}</td>
                            <td>¥{{ order.total_price }}</td>
                            <td>
                                <span :class="'status-' + order.status">{{ getOrderStatusText(order.status) }}</span>
                            </td>
                            <td>{{ order.created_at?.substring(0, 16) }}</td>
                            <td>
                                <button @click="viewOrderDetail(order.order_id)" class="btn-primary">详情</button>
                            </td>
                        </tr>
                    </tbody>
                </table>
                <div v-if="orders.length === 0" class="empty-tip">暂无订单数据</div>
            </div>

            <!-- 评价管理 -->
            <div v-if="activeTab === 'reviews'">
                <h2>评价管理</h2>
                <div class="filter-bar">
                    <select v-model="reviewFilter.status">
                        <option value="">全部状态</option>
                        <option value="0">正常</option>
                        <option value="1">已屏蔽</option>
                    </select>
                    <input type="text" v-model="reviewFilter.keyword" placeholder="评价内容/用户名" />
                    <button @click="fetchReviews" class="btn-primary">搜索</button>
                </div>
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>评价人</th>
                            <th>被评价人</th>
                            <th>评分</th>
                            <th>内容</th>
                            <th>状态</th>
                            <th>时间</th>
                            <th>操作</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-for="r in reviews" :key="r.review_id">
                            <td>{{ r.review_id }}</td>
                            <td>{{ r.reviewer_name }}</td>
                            <td>{{ r.reviewed_name }}</td>
                            <td>
                                <span class="rating">{{ '★'.repeat(r.rating) }}{{ '☆'.repeat(5 - r.rating) }}</span>
                            </td>
                            <td class="content-cell">{{ r.content || '-' }}</td>
                            <td>
                                <span :class="r.is_hidden === 0 ? 'text-green' : 'text-red'">
                                    {{ r.is_hidden === 0 ? '正常' : '已屏蔽' }}
                                </span>
                            </td>
                            <td>{{ r.created_at?.substring(0, 10) }}</td>
                            <td>
                                <button v-if="r.is_hidden === 0" @click="toggleReviewVisibility(r)"
                                    class="btn-danger">屏蔽</button>
                                <button v-else @click="toggleReviewVisibility(r)" class="btn-success">恢复</button>
                            </td>
                        </tr>
                    </tbody>
                </table>
                <div v-if="reviews.length === 0" class="empty-tip">暂无评价数据</div>
            </div>

            <!-- 投诉处理 -->
            <div v-if="activeTab === 'complaints'">
                <h2>投诉列表</h2>
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>投诉人</th>
                            <th>投诉类型</th>
                            <th>原因</th>
                            <th>状态</th>
                            <th>时间</th>
                            <th>操作</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-for="c in complaints" :key="c.complaint_id">
                            <td>{{ c.complaint_id }}</td>
                            <td>{{ c.reporter_name }}</td>
                            <td>{{ c.target_type === 1 ? '用户' : (c.target_type === 2 ? '商品' : '订单') }}</td>
                            <td class="content-cell">{{ c.reason }}</td>
                            <td>
                                <span
                                    :class="c.status === 0 ? 'text-orange' : (c.status === 1 ? 'text-gray' : 'text-green')">
                                    {{ c.status === 0 ? '待处理' : (c.status === 1 ? '已驳回' : '已处理') }}
                                </span>
                            </td>
                            <td>{{ c.created_at?.substring(0, 10) }}</td>
                            <td>
                                <button v-if="c.status === 0" @click="openComplaintHandle(c.complaint_id)"
                                    class="btn-primary">处理</button>
                                <span v-else class="text-gray">已归档</span>
                            </td>
                        </tr>
                    </tbody>
                </table>
                <div v-if="complaints.length === 0" class="empty-tip">暂无投诉数据</div>
            </div>

            <!-- 认证审核 -->
            <div v-if="activeTab === 'auth'">
                <h2>待认证用户</h2>
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>用户名</th>
                            <th>学号</th>
                            <th>真实姓名</th>
                            <th>认证材料</th>
                            <th>注册时间</th>
                            <th>操作</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-for="u in pendingAuthUsers" :key="u.user_id">
                            <td>{{ u.user_id }}</td>
                            <td>{{ u.username }}</td>
                            <td>{{ u.student_id }}</td>
                            <td>{{ u.real_name }}</td>
                            <td>
                                <a v-if="u.auth_material" :href="u.auth_material" target="_blank" class="link-primary">
                                    查看材料
                                </a>
                                <span v-else class="text-gray">未提交</span>
                            </td>
                            <td>{{ u.created_at?.substring(0, 10) }}</td>
                            <td>
                                <button @click="verifyUser(u.user_id, 'approve')" class="btn-success">通过</button>
                                <button @click="verifyUser(u.user_id, 'reject')" class="btn-danger">驳回</button>
                            </td>
                        </tr>
                    </tbody>
                </table>
                <div v-if="pendingAuthUsers.length === 0" class="empty-tip">暂无待审核的认证申请</div>
            </div>
        </div>

        <!-- 投诉处理弹窗 -->
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

        <!-- 订单详情弹窗 -->
        <div v-if="showOrderModal" class="modal-overlay">
            <div class="modal-content modal-large">
                <h3>订单详情 #{{ currentOrderDetail?.order?.order_id }}</h3>
                <div class="order-info" v-if="currentOrderDetail">
                    <div class="info-row">
                        <span class="label">买家:</span>
                        <span>{{ currentOrderDetail.order.buyer_name }} ({{ currentOrderDetail.order.buyer_real_name ||
                            '-' }})</span>
                    </div>
                    <div class="info-row">
                        <span class="label">卖家:</span>
                        <span>{{ currentOrderDetail.order.seller_name }} ({{ currentOrderDetail.order.seller_real_name
                            || '-' }})</span>
                    </div>
                    <div class="info-row">
                        <span class="label">订单金额:</span>
                        <span class="price">¥{{ currentOrderDetail.order.total_price }}</span>
                    </div>
                    <div class="info-row">
                        <span class="label">订单状态:</span>
                        <span>{{ getOrderStatusText(currentOrderDetail.order.status) }}</span>
                    </div>
                    <div class="info-row">
                        <span class="label">创建时间:</span>
                        <span>{{ currentOrderDetail.order.created_at }}</span>
                    </div>

                    <h4>商品列表</h4>
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>商品</th>
                                <th>单价</th>
                                <th>数量</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr v-for="item in currentOrderDetail.items" :key="item.item_id">
                                <td>{{ item.title }}</td>
                                <td>¥{{ item.price }}</td>
                                <td>{{ item.quantity }}</td>
                            </tr>
                        </tbody>
                    </table>

                    <h4 v-if="currentOrderDetail.reviews?.length">评价记录</h4>
                    <div v-for="review in currentOrderDetail.reviews" :key="review.review_id" class="review-item">
                        <span class="reviewer">{{ review.reviewer_name }}</span>
                        <span class="rating">{{ '★'.repeat(review.rating) }}</span>
                        <span class="content">{{ review.content || '无评价内容' }}</span>
                    </div>
                </div>
                <div class="actions">
                    <button @click="showOrderModal = false" class="btn-primary">关闭</button>
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
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.sidebar li.active {
    background: #409eff;
    color: white;
}

.sidebar li .badge {
    background: #f56c6c;
    color: white;
    padding: 2px 6px;
    border-radius: 10px;
    font-size: 12px;
}

.sidebar li.active .badge {
    background: white;
    color: #f56c6c;
}

.main-content {
    flex: 1;
    padding: 20px;
    overflow-x: auto;
}

/* 统计卡片 */
.stats-cards {
    display: flex;
    gap: 20px;
    margin-bottom: 20px;
}

.stat-card {
    flex: 1;
    background: white;
    border-radius: 8px;
    padding: 20px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    text-align: center;
}

.stat-card.highlight {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
}

.stat-value {
    font-size: 28px;
    font-weight: bold;
    margin-bottom: 5px;
}

.stat-label {
    font-size: 14px;
    color: #666;
}

.stat-card.highlight .stat-label {
    color: rgba(255, 255, 255, 0.8);
}

/* 待处理提醒 */
.pending-alerts {
    display: flex;
    gap: 15px;
    margin-bottom: 20px;
}

.alert-item {
    background: #fff3e0;
    border-left: 4px solid #e6a23c;
    padding: 10px 15px;
    border-radius: 4px;
    cursor: pointer;
    transition: background 0.2s;
}

.alert-item:hover {
    background: #ffe8cc;
}

.alert-count {
    font-weight: bold;
    color: #e6a23c;
}

/* 图表容器 */
.charts-container {
    margin-top: 20px;
}

.chart-row {
    display: flex;
    gap: 20px;
    margin-bottom: 20px;
}

.chart-box {
    flex: 1;
    height: 300px;
    background: white;
    border-radius: 8px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

/* 筛选栏 */
.filter-bar {
    display: flex;
    gap: 10px;
    align-items: center;
    margin-bottom: 15px;
    flex-wrap: wrap;
}

.filter-bar select,
.filter-bar input {
    padding: 8px;
    border: 1px solid #dcdfe6;
    border-radius: 4px;
}

.filter-bar input[type="text"] {
    width: 150px;
}

/* 表格 */
.data-table {
    width: 100%;
    border-collapse: collapse;
    margin-top: 10px;
    background: white;
}

.data-table th,
.data-table td {
    border: 1px solid #ebeef5;
    padding: 10px;
    text-align: left;
}

.data-table th {
    background-color: #f5f7fa;
    font-weight: 500;
}

.data-table tr:hover {
    background-color: #f5f7fa;
}

.content-cell {
    max-width: 200px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

/* 按钮 */
.btn-success {
    background: #67c23a;
    color: white;
    border: none;
    padding: 6px 12px;
    border-radius: 4px;
    cursor: pointer;
    margin-right: 5px;
}

.btn-danger {
    background: #f56c6c;
    color: white;
    border: none;
    padding: 6px 12px;
    border-radius: 4px;
    cursor: pointer;
}

.btn-primary {
    background: #409eff;
    color: white;
    border: none;
    padding: 6px 12px;
    border-radius: 4px;
    cursor: pointer;
}

.btn-success:hover {
    background: #85ce61;
}

.btn-danger:hover {
    background: #f78989;
}

.btn-primary:hover {
    background: #66b1ff;
}

/* 状态文字 */
.text-green {
    color: #67c23a;
}

.text-red {
    color: #f56c6c;
}

.text-orange {
    color: #e6a23c;
}

.text-gray {
    color: #909399;
}

.status-0 {
    color: #909399;
}

.status-1 {
    color: #e6a23c;
}

.status-2 {
    color: #409eff;
}

.status-3 {
    color: #67c23a;
}

.status-4 {
    color: #f56c6c;
}

.rating {
    color: #f7ba2a;
}

.link-primary {
    color: #409eff;
    text-decoration: none;
}

.link-primary:hover {
    text-decoration: underline;
}

.batch-actions {
    display: flex;
    gap: 10px;
    margin-bottom: 10px;
}

.batch-actions button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
}

.empty-tip {
    text-align: center;
    padding: 40px;
    color: #909399;
}

/* 弹窗样式 */
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
    z-index: 1000;
}

.modal-content {
    background: white;
    padding: 20px;
    border-radius: 8px;
    width: 400px;
    max-height: 80vh;
    overflow-y: auto;
}

.modal-large {
    width: 600px;
}

.form-group {
    margin-bottom: 15px;
}

.form-group label {
    display: block;
    margin-bottom: 5px;
    font-weight: 500;
}

.form-group input,
.form-group select,
.form-group textarea {
    width: 100%;
    padding: 8px;
    box-sizing: border-box;
    border: 1px solid #dcdfe6;
    border-radius: 4px;
}

.actions {
    display: flex;
    justify-content: flex-end;
    gap: 10px;
    margin-top: 20px;
}

/* 订单详情 */
.order-info {
    margin-top: 15px;
}

.info-row {
    display: flex;
    margin-bottom: 10px;
}

.info-row .label {
    width: 80px;
    color: #909399;
}

.info-row .price {
    color: #f56c6c;
    font-weight: bold;
}

.order-info h4 {
    margin: 20px 0 10px;
    padding-bottom: 5px;
    border-bottom: 1px solid #ebeef5;
}

.review-item {
    padding: 10px;
    background: #f5f7fa;
    border-radius: 4px;
    margin-bottom: 10px;
}

.review-item .reviewer {
    font-weight: 500;
    margin-right: 10px;
}

.review-item .content {
    display: block;
    margin-top: 5px;
    color: #606266;
}
</style>
