<script setup lang="ts">
import { useRouter } from 'vue-router'
import { SwitchButton } from '@element-plus/icons-vue'

const router = useRouter()

const handleLogout = () => {
    localStorage.removeItem('admin_token')
    localStorage.removeItem('admin_info')
    router.push('/admin/login')
}
</script>

<template>
    <el-container class="admin-layout">
        <el-header class="admin-header">
            <div class="header-left">
                <span class="logo">校园二手交易平台 - 管理后台</span>
            </div>
            <div class="header-right">
                <span>超级管理员</span>
                <el-button link :icon="SwitchButton" @click="handleLogout">退出</el-button>
            </div>
        </el-header>

        <el-main class="admin-main">
            <router-view />
        </el-main>
    </el-container>
</template>

<style scoped>
.admin-layout {
    height: 100vh;
    flex-direction: column;
}

.admin-header {
    background: #304156;
    color: white;
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0 20px;
    height: 60px;
}

.header-left .logo {
    font-size: 18px;
    font-weight: bold;
}

.header-right {
    display: flex;
    align-items: center;
    gap: 15px;
    font-size: 14px;
}

.header-right .el-button {
    color: white;
}

.admin-main {
    background: #f0f2f5;
    padding: 0;
    overflow: hidden;
}
</style>