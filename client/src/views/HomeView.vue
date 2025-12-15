<template>
    <el-container class="app-wrapper">
        <el-aside width="220px" class="sidebar-container">
            <div class="logo-area">
                <el-icon :size="24" color="#fff" style="margin-right: 8px">
                    <Shop />
                </el-icon>
                <span>校园集市</span>
            </div>

            <el-menu active-text-color="#409EFF" background-color="#304156" text-color="#bfcbd9"
                :default-active="activeRoute" class="el-menu-vertical" style="border-right: none;" router>
                <el-menu-item index="/">
                    <el-icon>
                        <Goods />
                    </el-icon><span>商品广场</span>
                </el-menu-item>

                <el-menu-item index="/publish">
                    <el-icon>
                        <Sell />
                    </el-icon><span>我要发布</span>
                </el-menu-item>

                <el-menu-item index="/messages">
                    <el-icon>
                        <ChatDotRound />
                    </el-icon><span>消息中心</span>
                </el-menu-item>

                <el-menu-item index="/orders">
                    <el-icon>
                        <ShoppingCart />
                    </el-icon><span>我的订单</span>
                </el-menu-item>

                <el-menu-item index="/sales">
                    <el-icon>
                        <List />
                    </el-icon><span>我卖出的</span>
                </el-menu-item>

                <el-menu-item index="/profile">
                    <el-icon>
                        <User />
                    </el-icon><span>个人中心</span>
                </el-menu-item>
                <el-menu-item index="/admin">
                    <el-icon>
                        <Monitor />
                    </el-icon><span>数据大屏 (Admin)</span>
                </el-menu-item>
            </el-menu>
        </el-aside>

        <el-container class="main-container">
            <el-header class="navbar">
                <div class="left-panel">
                    <h3>{{ currentTitle }}</h3>
                </div>
                <div class="right-panel">
                    <el-dropdown>
                        <span class="user-profile">
                            {{ userStore.userInfo?.username || '用户' }}
                            <el-icon class="el-icon--right">
                                <ArrowDown />
                            </el-icon>
                        </span>
                        <template #dropdown>
                            <el-dropdown-menu>
                                <el-dropdown-item @click="handleLogout">退出登录</el-dropdown-item>
                            </el-dropdown-menu>
                        </template>
                    </el-dropdown>
                </div>
            </el-header>

            <el-main class="app-main">
                <el-scrollbar>
                    <router-view></router-view>
                </el-scrollbar>
            </el-main>
        </el-container>
    </el-container>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useUserStore } from '../stores/user';
import { useRouter, useRoute } from 'vue-router';
// 引入图标，新增 ChatDotRound
import { Shop, Goods, Sell, ShoppingCart, User, ArrowDown, List, Monitor, ChatDotRound } from '@element-plus/icons-vue';

const userStore = useUserStore();
const router = useRouter();
const route = useRoute();

const activeRoute = computed(() => route.path);

const currentTitle = computed(() => {
    if (route.path === '/publish') return '发布商品';
    if (route.path === '/orders') return '我的订单';
    if (route.path === '/sales') return '卖家中心';
    if (route.path === '/messages') return '消息中心'; // 新增标题
    if (route.path === '/profile') return '个人中心';
    if (route.path === '/admin') return '数据管理';
    return '商品广场';
});

const handleLogout = () => {
    userStore.logout();
    router.push('/login');
};
</script>

<style scoped>
.app-wrapper {
    width: 100%;
    height: 100%;
    display: flex;
}

.sidebar-container {
    background-color: #304156;
    height: 100%;
    overflow-y: auto;
    box-shadow: 2px 0 6px rgba(0, 21, 41, .35);
    z-index: 10;
}

.logo-area {
    height: 60px;
    background: #2b3649;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #fff;
    font-size: 16px;
    font-weight: 600;
}

.main-container {
    flex-direction: column;
    height: 100%;
    overflow: hidden;
}

.navbar {
    height: 60px;
    background: #fff;
    border-bottom: 1px solid #d8dce5;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 20px;
    box-shadow: 0 1px 4px rgba(0, 21, 41, .08);
}

.app-main {
    padding: 0;
    background-color: #f0f2f5;
    height: 100%;
}

.user-profile {
    cursor: pointer;
    display: flex;
    align-items: center;
    color: #5a5e66;
}
</style>