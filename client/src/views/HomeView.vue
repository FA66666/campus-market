<template>
    <el-container class="app-wrapper">
        <el-header class="top-header" height="60px">
            <div class="header-inner">
                <div class="logo-area" @click="router.push('/')">
                    <el-icon :size="24" color="#409EFF" style="margin-right: 8px">
                        <Shop />
                    </el-icon>
                    <span class="logo-text">校园集市</span>
                </div>

                <div class="menu-container">
                    <el-menu :default-active="activeRoute" mode="horizontal" background-color="#304156"
                        text-color="#bfcbd9" active-text-color="#409EFF" router :ellipsis="false" class="top-menu">
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
                        <el-menu-item index="/favorites">
                            <el-icon>
                                <Star />
                            </el-icon><span>我的收藏</span>
                        </el-menu-item>
                        <el-menu-item index="/sales">
                            <el-icon>
                                <List />
                            </el-icon><span>卖家中心</span>
                        </el-menu-item>
                        <el-menu-item index="/profile">
                            <el-icon>
                                <User />
                            </el-icon><span>个人中心</span>
                        </el-menu-item>
                    </el-menu>
                </div>

                <div class="user-area">
                    <el-dropdown>
                        <span class="user-profile">
                            <el-avatar :size="30" style="margin-right: 8px; background-color: #409EFF;">
                                {{ (userStore.userInfo?.username || 'U').charAt(0).toUpperCase() }}
                            </el-avatar>
                            <span class="username">{{ userStore.userInfo?.username || '请登录' }}</span>
                            <el-icon class="el-icon--right">
                                <ArrowDown />
                            </el-icon>
                        </span>
                        <template #dropdown>
                            <el-dropdown-menu>
                                <el-dropdown-item @click="router.push('/profile')">个人资料</el-dropdown-item>
                                <el-dropdown-item @click="router.push('/addresses')">收货地址</el-dropdown-item>
                                <el-dropdown-item divided @click="handleLogout">退出登录</el-dropdown-item>
                            </el-dropdown-menu>
                        </template>
                    </el-dropdown>
                </div>
            </div>
        </el-header>

        <el-main class="app-main">
            <div class="content-wrapper">
                <router-view v-slot="{ Component }">
                    <transition name="fade-transform" mode="out-in">
                        <component :is="Component" />
                    </transition>
                </router-view>
            </div>
        </el-main>
    </el-container>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useUserStore } from '../stores/user';
import { useRouter, useRoute } from 'vue-router';
import { Shop, Goods, Sell, ShoppingCart, User, ArrowDown, List, ChatDotRound, Star } from '@element-plus/icons-vue';

const userStore = useUserStore();
const router = useRouter();
const route = useRoute();

const activeRoute = computed(() => route.path);

const handleLogout = () => {
    userStore.logout();
    router.push('/login');
};
</script>

<style scoped>
/* 1. 整体布局容器：垂直排列 */
.app-wrapper {
    height: 100vh;
    width: 100vw;
    display: flex;
    flex-direction: column;
    overflow: hidden;
}

/* 2. 顶部 Header 样式 */
.top-header {
    background-color: #304156;
    padding: 0;
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.12);
    z-index: 100;
}

.header-inner {
    display: flex;
    align-items: center;
    justify-content: space-between;
    height: 100%;
    /* max-width: 1200px; 如果希望内容居中且限制宽度，可取消注释 */
    margin: 0 auto;
    padding: 0 20px;
    width: 100%;
    box-sizing: border-box;
}

/* Logo 区域 */
.logo-area {
    display: flex;
    align-items: center;
    cursor: pointer;
    min-width: 150px;
    margin-right: 20px;
}

.logo-text {
    font-size: 18px;
    font-weight: 600;
    color: #fff;
    letter-spacing: 1px;
    white-space: nowrap;
}

/* 菜单区域 */
.menu-container {
    flex: 1;
    display: flex;
    justify-content: flex-start;
    overflow: hidden;
}

.top-menu {
    border-bottom: none !important;
    width: 100%;
    /* 移除背景色，由父级控制，避免渲染问题 */
    background-color: transparent !important;
}

/* 深度选择器修改 Element Plus 菜单样式 */
:deep(.el-menu--horizontal > .el-menu-item) {
    height: 60px;
    line-height: 60px;
    border-bottom: none !important;
    font-size: 15px;
}

:deep(.el-menu--horizontal > .el-menu-item.is-active) {
    background-color: rgba(0, 0, 0, 0.2) !important;
    /* 选中项深色背景 */
    color: #409EFF !important;
    border-bottom: 3px solid #409EFF !important;
    /* 选中项下划线 */
}

:deep(.el-menu--horizontal > .el-menu-item:hover) {
    background-color: rgba(255, 255, 255, 0.05) !important;
    color: #fff !important;
}

/* 用户信息区域 */
.user-area {
    min-width: 120px;
    display: flex;
    justify-content: flex-end;
}

.user-profile {
    display: flex;
    align-items: center;
    cursor: pointer;
    color: #bfcbd9;
    padding: 5px 10px;
    border-radius: 4px;
    transition: background 0.3s;
}

.user-profile:hover {
    background: rgba(255, 255, 255, 0.1);
    color: #fff;
}

.username {
    margin-right: 5px;
    font-size: 14px;
    max-width: 100px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

/* 3. 主内容区域 */
.app-main {
    flex: 1;
    background-color: #f0f2f5;
    padding: 0;
    overflow-y: auto;
    /* 内容溢出滚动 */
}

.content-wrapper {
    /* 如果页面需要固定宽度居中，可在这里加 max-width */
    padding: 20px;
    min-height: 100%;
    box-sizing: border-box;
}

/* 4. 过渡动画 */
.fade-transform-enter-active,
.fade-transform-leave-active {
    transition: all 0.3s;
}

.fade-transform-enter-from {
    opacity: 0;
    transform: translateX(-10px);
}

.fade-transform-leave-to {
    opacity: 0;
    transform: translateX(10px);
}
</style>