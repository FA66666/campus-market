<template>
    <div class="page-container">
        <el-row :gutter="20">
            <el-col :span="8">
                <el-card class="user-card" v-loading="loading">
                    <div class="avatar-area">
                        <el-avatar :size="100"
                            src="https://cube.elemecdn.com/0/88/03b0d39583f48206768a7534e55bcpng.png" />
                        <h2 class="username">{{ userInfo.real_name || userInfo.username }}</h2>
                        <p class="role-tag">
                            <el-tag type="success" v-if="userInfo.status === 1">已认证用户</el-tag>
                            <el-tag type="warning" v-else>待审核</el-tag>
                        </p>
                    </div>

                    <el-divider />

                    <div class="stats-row">
                        <div class="stat-item">
                            <div class="num">{{ userInfo.stats?.buy_count || 0 }}</div>
                            <div class="label">已买入</div>
                        </div>
                        <div class="stat-item">
                            <div class="num">{{ userInfo.stats?.sell_count || 0 }}</div>
                            <div class="label">已发布</div>
                        </div>
                        <div class="stat-item">
                            <div class="num text-blue">{{ userInfo.credit_score }}</div>
                            <div class="label">信誉分</div>
                        </div>
                    </div>
                </el-card>
            </el-col>

            <el-col :span="16">
                <el-card class="info-card" title="基本资料">
                    <template #header>
                        <div class="card-header">
                            <span>账户详情</span>
                        </div>
                    </template>

                    <el-descriptions :column="1" border>
                        <el-descriptions-item label="用户账号">
                            {{ userInfo.username }}
                        </el-descriptions-item>
                        <el-descriptions-item label="真实姓名">
                            {{ userInfo.real_name }}
                        </el-descriptions-item>
                        <el-descriptions-item label="学号/工号">
                            {{ userInfo.student_id }}
                        </el-descriptions-item>
                        <el-descriptions-item label="注册时间">
                            {{ new Date(userInfo.created_at).toLocaleString() }}
                        </el-descriptions-item>
                        <el-descriptions-item label="当前状态">
                            <span v-if="userInfo.status === 1" style="color: green">正常 (Active)</span>
                            <span v-else style="color: red">异常</span>
                        </el-descriptions-item>
                    </el-descriptions>

                    <div class="logout-area">
                        <el-popconfirm title="确定要退出登录吗？" @confirm="handleLogout">
                            <template #reference>
                                <el-button type="danger">退出登录</el-button>
                            </template>
                        </el-popconfirm>
                    </div>
                </el-card>

                <el-card class="mt-20" shadow="never">
                    <h4><el-icon>
                            <InfoFilled />
                        </el-icon> 信誉积分规则 </h4>
                    <ul class="rules-list">
                        <li>初始信誉积分为 100 分。</li>
                        <li>每完成一次正常交易，买卖双方信誉良好。</li>
                        <li>若发生违规操作（如发布虚假商品、恶意拒收），管理员将扣除相应积分。</li>
                        <li>积分低于 60 分将被限制发布商品，归零则封号。</li>
                    </ul>
                </el-card>
            </el-col>
        </el-row>
    </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useUserStore } from '../stores/user';
import { useRouter } from 'vue-router';
import request from '../utils/request';
import { InfoFilled } from '@element-plus/icons-vue';

const userStore = useUserStore();
const router = useRouter();
const loading = ref(false);
const userInfo = ref<any>({});

const fetchProfile = async () => {
    loading.value = true;
    try {
        const res: any = await request.get('/users/profile');
        if (res.code === 200) {
            userInfo.value = res.data;
        }
    } catch (e) {
        console.error(e);
    } finally {
        loading.value = false;
    }
};

const handleLogout = () => {
    userStore.logout();
    router.push('/login');
};

onMounted(() => {
    fetchProfile();
});
</script>

<style scoped>
.page-container {
    padding: 20px;
}

.avatar-area {
    text-align: center;
    padding: 20px 0;
}

.username {
    margin: 10px 0 5px;
    font-size: 20px;
}

.role-tag {
    margin-bottom: 0;
}

.stats-row {
    display: flex;
    justify-content: space-around;
    text-align: center;
    padding-bottom: 10px;
}

.stat-item .num {
    font-size: 24px;
    font-weight: bold;
    color: #303133;
}

.stat-item .label {
    font-size: 12px;
    color: #909399;
    margin-top: 5px;
}

.text-blue {
    color: #409EFF !important;
}

.mt-20 {
    margin-top: 20px;
}

.logout-area {
    margin-top: 30px;
    display: flex;
    justify-content: flex-end;
}

.rules-list {
    font-size: 13px;
    color: #666;
    line-height: 1.8;
    padding-left: 20px;
}
</style>