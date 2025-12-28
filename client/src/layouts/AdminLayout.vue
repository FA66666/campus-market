<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { SwitchButton, User } from '@element-plus/icons-vue'

const router = useRouter()

// 获取当前管理员信息
const adminInfo = computed(() => {
    const info = localStorage.getItem('admin_info')
    return info ? JSON.parse(info) : {}
})

// 角色显示名称映射
const roleDisplayNames: Record<string, string> = {
    'SUPER_ADMIN': '超级管理员',
    'AUDITOR': '审核员'
}

// 格式化角色显示
const roleDisplay = computed(() => {
    const roles = adminInfo.value.roles || []
    if (roles.length === 0) return '未分配角色'
    return roles.map((r: string) => roleDisplayNames[r] || r).join('、')
})

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
                <div class="admin-info">
                    <el-icon><User /></el-icon>
                    <span class="admin-name">{{ adminInfo.realname || adminInfo.username || '管理员' }}</span>
                    <el-tag size="small" type="warning" effect="plain" class="role-tag">{{ roleDisplay }}</el-tag>
                </div>
                <el-divider direction="vertical" />
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
    background: linear-gradient(90deg, #1e3a5f 0%, #2c5282 100%);
    color: white;
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0 24px;
    height: 60px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

.header-left .logo {
    font-size: 18px;
    font-weight: bold;
    letter-spacing: 1px;
}

.header-right {
    display: flex;
    align-items: center;
    gap: 16px;
}

.admin-info {
    display: flex;
    align-items: center;
    gap: 8px;
}

.admin-info .el-icon {
    font-size: 18px;
}

.admin-name {
    font-size: 14px;
    font-weight: 500;
}

.role-tag {
    margin-left: 4px;
}

.header-right .el-divider {
    border-color: rgba(255, 255, 255, 0.3);
    height: 20px;
}

.header-right .el-button {
    color: white;
}

.header-right .el-button:hover {
    color: #ffd666;
}

.admin-main {
    background: #f0f2f5;
    padding: 0;
    overflow: hidden;
}
</style>