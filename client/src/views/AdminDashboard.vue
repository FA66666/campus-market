<template>
    <div class="admin-container">
        <div class="header">
            <div class="header-left">
                <h2>后台管理系统 - 数据大屏</h2>
                <span class="subtitle">Platform Operation Center</span>
            </div>
            <div class="header-actions">
                <el-button type="primary" size="large" @click="$router.push('/admin/audit')">
                    <el-icon style="margin-right: 5px">
                        <Stamp />
                    </el-icon> 商品审核
                </el-button>
                <el-button size="large" @click="$router.push('/')">
                    <el-icon style="margin-right: 5px">
                        <HomeFilled />
                    </el-icon> 返回前台
                </el-button>
            </div>
        </div>

        <el-row :gutter="20" class="card-row">
            <el-col :span="6">
                <el-card shadow="hover" class="data-card bg-blue">
                    <div class="card-content">
                        <div class="card-title">平台活跃用户</div>
                        <div class="card-num">
                            {{ stats.total_active_users }}
                            <span class="unit">人</span>
                        </div>
                    </div>
                    <div class="card-icon"><el-icon>
                            <User />
                        </el-icon></div>
                </el-card>
            </el-col>

            <el-col :span="6">
                <el-card shadow="hover" class="data-card bg-green">
                    <div class="card-content">
                        <div class="card-title">在售商品数</div>
                        <div class="card-num">
                            {{ stats.active_items }}
                            <span class="unit">件</span>
                        </div>
                    </div>
                    <div class="card-icon"><el-icon>
                            <Goods />
                        </el-icon></div>
                </el-card>
            </el-col>

            <el-col :span="6">
                <el-card shadow="hover" class="data-card bg-orange">
                    <div class="card-content">
                        <div class="card-title">累计成交订单</div>
                        <div class="card-num">
                            {{ stats.completed_orders }}
                            <span class="unit">笔</span>
                        </div>
                    </div>
                    <div class="card-icon"><el-icon>
                            <List />
                        </el-icon></div>
                </el-card>
            </el-col>

            <el-col :span="6">
                <el-card shadow="hover" class="data-card bg-red">
                    <div class="card-content">
                        <div class="card-title">平台总 GMV</div>
                        <div class="card-num">
                            <span class="currency">¥</span>
                            {{ stats.total_gmv }}
                        </div>
                    </div>
                    <div class="card-icon"><el-icon>
                            <Wallet />
                        </el-icon></div>
                </el-card>
            </el-col>
        </el-row>

        <el-row :gutter="20" class="chart-row">
            <el-col :span="16">
                <el-card class="chart-card">
                    <template #header>
                        <div class="chart-header">
                            <span><el-icon>
                                    <TrendCharts />
                                </el-icon> 近七日交易趋势</span>
                            <el-tag type="info" size="small">实时数据</el-tag>
                        </div>
                    </template>
                    <div class="chart-placeholder">
                        <div class="bar-group">
                            <div class="bar" style="height: 40%"></div>
                            <span class="label">周一</span>
                        </div>
                        <div class="bar-group">
                            <div class="bar" style="height: 60%"></div>
                            <span class="label">周二</span>
                        </div>
                        <div class="bar-group">
                            <div class="bar" style="height: 35%"></div>
                            <span class="label">周三</span>
                        </div>
                        <div class="bar-group">
                            <div class="bar" style="height: 85%"></div>
                            <span class="label">周四</span>
                        </div>
                        <div class="bar-group">
                            <div class="bar" style="height: 55%"></div>
                            <span class="label">周五</span>
                        </div>
                        <div class="bar-group">
                            <div class="bar active" style="height: 95%"></div>
                            <span class="label">周六</span>
                        </div>
                        <div class="bar-group">
                            <div class="bar" style="height: 75%"></div>
                            <span class="label">周日</span>
                        </div>
                    </div>
                </el-card>
            </el-col>

            <el-col :span="8">
                <el-card class="chart-card">
                    <template #header>
                        <span>快捷操作</span>
                    </template>
                    <div class="quick-actions">
                        <el-button class="action-btn" @click="$router.push('/admin/audit')">
                            待审核队列 <el-badge is-dot class="item" type="danger" />
                        </el-button>
                        <el-button class="action-btn" disabled>用户投诉处理 (开发中)</el-button>
                        <el-button class="action-btn" disabled>系统日志查看 (开发中)</el-button>
                    </div>
                </el-card>
            </el-col>
        </el-row>
    </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import request from '../utils/request';
import {
    User, Goods, List, Wallet,
    Stamp, HomeFilled, TrendCharts
} from '@element-plus/icons-vue';

const stats = ref({
    total_active_users: 0,
    active_items: 0,
    completed_orders: 0,
    total_gmv: 0
});

const fetchStats = async () => {
    try {
        const res: any = await request.get('/stats');
        if (res.code === 200) {
            stats.value = res.data;
        }
    } catch (e) {
        console.error(e);
    }
};

onMounted(() => {
    fetchStats();
});
</script>

<style scoped>
.admin-container {
    padding: 30px;
    background-color: #f0f2f5;
    min-height: 100vh;
    box-sizing: border-box;
}

/* 头部样式 */
.header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 30px;
    background: #fff;
    padding: 20px 30px;
    border-radius: 8px;
    box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.05);
}

.header h2 {
    margin: 0;
    color: #303133;
    font-size: 24px;
}

.subtitle {
    font-size: 14px;
    color: #909399;
    margin-left: 5px;
}

.header-actions {
    display: flex;
    gap: 15px;
}

/* 数据卡片样式 */
.card-row {
    margin-bottom: 30px;
}

.data-card {
    position: relative;
    color: #fff;
    border: none;
    overflow: hidden;
    height: 160px;
    display: flex;
    align-items: center;
}

.card-content {
    z-index: 2;
    padding: 0 10px;
}

.card-title {
    font-size: 16px;
    opacity: 0.9;
    margin-bottom: 10px;
}

.card-num {
    font-size: 36px;
    font-weight: bold;
}

.unit {
    font-size: 14px;
    font-weight: normal;
    margin-left: 4px;
    opacity: 0.8;
}

.currency {
    font-size: 24px;
    margin-right: 4px;
}

.card-icon {
    position: absolute;
    right: 20px;
    top: 50%;
    transform: translateY(-50%);
    font-size: 64px;
    opacity: 0.2;
    z-index: 1;
}

/* 颜色渐变 */
.bg-blue {
    background: linear-gradient(135deg, #3a8ee6, #66b1ff);
    box-shadow: 0 4px 12px rgba(64, 158, 255, 0.4);
}

.bg-green {
    background: linear-gradient(135deg, #529b2e, #95d475);
    box-shadow: 0 4px 12px rgba(103, 194, 58, 0.4);
}

.bg-orange {
    background: linear-gradient(135deg, #b88230, #f3d19e);
    box-shadow: 0 4px 12px rgba(230, 162, 60, 0.4);
}

.bg-red {
    background: linear-gradient(135deg, #c45656, #fab6b6);
    box-shadow: 0 4px 12px rgba(245, 108, 108, 0.4);
}

/* 图表区域 */
.chart-row {
    margin-top: 20px;
}

.chart-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.chart-placeholder {
    height: 300px;
    display: flex;
    align-items: flex-end;
    justify-content: space-around;
    padding: 20px 40px;
    background: #fff;
}

.bar-group {
    display: flex;
    flex-direction: column;
    align-items: center;
    height: 100%;
    justify-content: flex-end;
    width: 40px;
}

.bar {
    width: 100%;
    background-color: #409EFF;
    border-radius: 4px 4px 0 0;
    opacity: 0.6;
    transition: height 0.8s ease;
}

.bar.active {
    opacity: 1;
    background-color: #337ecc;
}

.label {
    margin-top: 10px;
    color: #606266;
    font-size: 12px;
}

/* 快捷操作 */
.quick-actions {
    display: flex;
    flex-direction: column;
    gap: 15px;
    padding: 10px 0;
}

.action-btn {
    width: 100%;
    height: 50px;
    justify-content: flex-start;
    padding-left: 20px;
    font-size: 14px;
}
</style>