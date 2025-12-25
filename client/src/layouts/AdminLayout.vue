<script setup lang="ts">
import { useRouter } from 'vue-router'
import {
    Odometer,
    List,
    UserFilled,
    Warning,
    SwitchButton
} from '@element-plus/icons-vue'

const router = useRouter()

const handleLogout = () => {
    localStorage.removeItem('admin_token')
    localStorage.removeItem('admin_info')
    router.push('/admin/login')
}
</script>

<template>
    <el-container class="admin-layout">
        <el-aside width="220px" class="admin-aside">
            <div class="logo">管理后台</div>
            <el-menu router :default-active="$route.path" background-color="#304156" text-color="#bfcbd9"
                active-text-color="#409EFF" class="admin-menu">
                <el-menu-item index="/admin">
                    <el-icon>
                        <Odometer />
                    </el-icon>
                    <span>仪表盘</span>
                </el-menu-item>

                <el-menu-item index="/admin/audit">
                    <el-icon>
                        <List />
                    </el-icon>
                    <span>商品审核</span>
                </el-menu-item>

                <el-menu-item index="/admin/users">
                    <el-icon>
                        <UserFilled />
                    </el-icon>
                    <span>用户管理</span>
                </el-menu-item>

                <el-menu-item index="/admin/complaints">
                    <el-icon>
                        <Warning />
                    </el-icon>
                    <span>投诉处理</span>
                </el-menu-item>
            </el-menu>
        </el-aside>

        <el-container>
            <el-header class="admin-header">
                <div class="header-right">
                    <span>超级管理员</span>
                    <el-button link :icon="SwitchButton" @click="handleLogout">退出</el-button>
                </div>
            </el-header>

            <el-main class="admin-main">
                <router-view />
            </el-main>
        </el-container>
    </el-container>
</template>

<style scoped>
.admin-layout {
    height: 100vh;
}

.admin-aside {
    background-color: #304156;
    color: white;
}

.logo {
    height: 60px;
    line-height: 60px;
    text-align: center;
    font-size: 20px;
    font-weight: bold;
    background: #2b3649;
}

.admin-menu {
    border-right: none;
}

.admin-header {
    background: #fff;
    border-bottom: 1px solid #dcdfe6;
    display: flex;
    justify-content: flex-end;
    align-items: center;
    padding: 0 20px;
}

.header-right {
    display: flex;
    align-items: center;
    gap: 15px;
    font-size: 14px;
}

.admin-main {
    background: #f0f2f5;
    padding: 20px;
}
</style>