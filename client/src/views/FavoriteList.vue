<script setup lang="ts">
import { ref, onMounted } from 'vue'
import request from '../utils/request'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Star, StarFilled, Delete, View } from '@element-plus/icons-vue'
import { useRouter } from 'vue-router'

const router = useRouter()

interface FavoriteItem {
    item_id: number
    title: string
    price: number
    main_image: string | null
    seller_name: string
    stock_quantity: number
    status: number
    collected_at: string
    view_count?: number
    collect_count?: number
}

const favorites = ref<FavoriteItem[]>([])
const loading = ref(false)

const getImageUrl = (img: string | null) => {
    if (!img) return 'https://via.placeholder.com/300x300?text=No+Image'
    if (img.startsWith('http')) return img
    const baseUrl = import.meta.env.VITE_API_BASE_URL?.replace('/api', '') || 'http://localhost:3000'
    return baseUrl + img
}

const fetchFavorites = async () => {
    loading.value = true
    try {
        const res: any = await request.get('/items/favorites')
        if (res.code === 200) {
            favorites.value = res.data
        }
    } catch (error) {
        ElMessage.error('获取收藏列表失败')
    } finally {
        loading.value = false
    }
}

const goToDetail = (item: FavoriteItem) => {
    router.push({
        name: 'itemDetail',
        params: { id: item.item_id }
    })
}

const removeFavorite = async (item: FavoriteItem) => {
    try {
        await ElMessageBox.confirm(
            `确定要取消收藏「${item.title}」吗？`,
            '取消收藏',
            {
                confirmButtonText: '确定',
                cancelButtonText: '取消',
                type: 'warning'
            }
        )

        const res: any = await request.post(`/items/${item.item_id}/collect`)
        if (res.code === 200 && res.action === 'removed') {
            favorites.value = favorites.value.filter(f => f.item_id !== item.item_id)
            ElMessage.success('已取消收藏')
        }
    } catch (error: any) {
        if (error !== 'cancel') {
            ElMessage.error('操作失败')
        }
    }
}

const getStatusTag = (status: number, stock: number) => {
    if (stock <= 0) return { text: '已售罄', type: 'info' }
    if (status === 1) return { text: '在售中', type: 'success' }
    if (status === 4) return { text: '已下架', type: 'warning' }
    return { text: '未上架', type: 'info' }
}

onMounted(() => {
    fetchFavorites()
})
</script>

<template>
    <div class="favorite-container">
        <div class="page-header">
            <h2><el-icon><StarFilled /></el-icon> 我的收藏</h2>
            <p class="subtitle">共收藏了 {{ favorites.length }} 件商品</p>
        </div>

        <div v-if="loading" class="loading-state" v-loading="loading" style="min-height: 300px;"></div>

        <div v-else-if="favorites.length === 0" class="empty-state">
            <el-empty description="还没有收藏任何商品">
                <el-button type="primary" @click="router.push('/')">去逛逛</el-button>
            </el-empty>
        </div>

        <div v-else class="favorites-grid">
            <el-card v-for="item in favorites" :key="item.item_id" class="favorite-card" shadow="hover">
                <div class="card-content" @click="goToDetail(item)">
                    <div class="image-container">
                        <el-image :src="getImageUrl(item.main_image)" fit="cover" class="item-image">
                            <template #error>
                                <div class="image-error">
                                    <el-icon><Star /></el-icon>
                                </div>
                            </template>
                        </el-image>
                        <div v-if="item.stock_quantity <= 0 || item.status !== 1" class="status-mask">
                            <span>{{ item.stock_quantity <= 0 ? '已售罄' : '已下架' }}</span>
                        </div>
                    </div>

                    <div class="info-section">
                        <h3 class="item-title">{{ item.title }}</h3>

                        <div class="item-meta">
                            <span class="price">¥{{ item.price }}</span>
                            <el-tag :type="getStatusTag(item.status, item.stock_quantity).type" size="small">
                                {{ getStatusTag(item.status, item.stock_quantity).text }}
                            </el-tag>
                        </div>

                        <div class="item-stats">
                            <span class="stat-item">
                                <el-icon><View /></el-icon>
                                {{ item.view_count || 0 }}
                            </span>
                            <span class="stat-item">
                                <el-icon><StarFilled /></el-icon>
                                {{ item.collect_count || 0 }}
                            </span>
                        </div>

                        <div class="item-footer">
                            <span class="seller">卖家: {{ item.seller_name }}</span>
                            <span class="collect-time">收藏于 {{ new Date(item.collected_at).toLocaleDateString() }}</span>
                        </div>
                    </div>
                </div>

                <div class="card-actions">
                    <el-button type="primary" size="small" @click="goToDetail(item)">
                        查看详情
                    </el-button>
                    <el-button type="danger" size="small" :icon="Delete" @click.stop="removeFavorite(item)">
                        取消收藏
                    </el-button>
                </div>
            </el-card>
        </div>
    </div>
</template>

<style scoped>
.favorite-container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 30px;
    background: linear-gradient(180deg, #f8fafc 0%, #eef2f7 100%);
    min-height: 100vh;
}

.page-header {
    margin-bottom: 30px;
    text-align: center;
}

.page-header h2 {
    font-size: 28px;
    font-weight: 700;
    background: linear-gradient(135deg, #e6a23c 0%, #f56c6c 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    margin-bottom: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
}

.page-header h2 .el-icon {
    background: linear-gradient(135deg, #e6a23c 0%, #f56c6c 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
}

.subtitle {
    color: #909399;
    font-size: 14px;
}

.empty-state {
    padding: 80px 0;
}

.favorites-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
    gap: 24px;
}

.favorite-card {
    border-radius: 16px;
    border: none;
    overflow: hidden;
    transition: all 0.3s ease;
    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.06);
}

.favorite-card:hover {
    transform: translateY(-5px);
    box-shadow: 0 15px 35px rgba(230, 162, 60, 0.15);
}

.favorite-card :deep(.el-card__body) {
    padding: 0;
}

.card-content {
    display: flex;
    cursor: pointer;
    padding: 16px;
    gap: 16px;
}

.image-container {
    width: 120px;
    height: 120px;
    flex-shrink: 0;
    border-radius: 12px;
    overflow: hidden;
    position: relative;
    background: linear-gradient(135deg, #f5f7fa 0%, #e4e8ed 100%);
}

.item-image {
    width: 100%;
    height: 100%;
}

.image-error {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #f5f7fa;
    color: #c0c4cc;
    font-size: 32px;
}

.status-mask {
    position: absolute;
    inset: 0;
    background: rgba(255, 255, 255, 0.85);
    backdrop-filter: blur(2px);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 14px;
    font-weight: 600;
    color: #909399;
}

.info-section {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-width: 0;
}

.item-title {
    font-size: 16px;
    font-weight: 600;
    color: #303133;
    margin: 0 0 10px 0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.item-meta {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 10px;
}

.price {
    font-size: 20px;
    font-weight: 700;
    color: #f56c6c;
}

.item-stats {
    display: flex;
    gap: 16px;
    margin-bottom: 10px;
}

.stat-item {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 13px;
    color: #909399;
}

.item-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-top: auto;
}

.seller {
    font-size: 13px;
    color: #606266;
}

.collect-time {
    font-size: 12px;
    color: #c0c4cc;
}

.card-actions {
    display: flex;
    gap: 10px;
    padding: 12px 16px;
    background: linear-gradient(135deg, #f9fafc 0%, #f0f2f5 100%);
    border-top: 1px solid #ebeef5;
}

.card-actions :deep(.el-button) {
    flex: 1;
    border-radius: 8px;
}

.loading-state {
    display: flex;
    justify-content: center;
    align-items: center;
}

@media (max-width: 768px) {
    .favorites-grid {
        grid-template-columns: 1fr;
    }

    .card-content {
        flex-direction: column;
    }

    .image-container {
        width: 100%;
        height: 180px;
    }
}
</style>
