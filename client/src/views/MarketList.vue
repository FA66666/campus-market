<template>
    <div class="page-container">

        <div class="filter-toolbar">
            <div class="search-box">
                <el-input v-model="queryParams.keyword" placeholder="搜索商品..." class="input-with-select"
                    @keyup.enter="handleSearch" clearable @clear="handleSearch">
                    <template #append>
                        <el-button :icon="Search" @click="handleSearch" />
                    </template>
                </el-input>
            </div>

            <el-tabs v-model="activeCategory" @tab-click="handleTabClick" class="category-tabs">
                <el-tab-pane label="全部" name="0"></el-tab-pane>
                <el-tab-pane label="数码产品" name="1"></el-tab-pane>
                <el-tab-pane label="教材书籍" name="2"></el-tab-pane>
                <el-tab-pane label="生活用品" name="3"></el-tab-pane>
            </el-tabs>
        </div>

        <div v-if="loading" class="loading-state">
            <el-skeleton :rows="3" animated />
        </div>

        <el-row v-else :gutter="20">
            <el-col v-for="item in itemList" :key="item.item_id" :xs="24" :sm="12" :md="8" :lg="6" :xl="4">
                <el-card class="item-card" shadow="hover" :body-style="{ padding: '0px' }">

                    <div class="image-wrapper" @click="showDetail(item)">
                        <el-image :src="item.main_image" fit="cover" class="item-image" loading="lazy">
                            <template #error>
                                <div class="image-slot"><el-icon>
                                        <Picture />
                                    </el-icon></div>
                            </template>
                        </el-image>

                        <div v-if="item.stock_quantity === 0" class="sold-out-mask">已售罄</div>

                        <div class="fav-btn" @click.stop="handleCollect(item)">
                            <el-icon :size="20" :color="item.is_collected ? '#F56C6C' : '#fff'">
                                <StarFilled v-if="item.is_collected" />
                                <Star v-else />
                            </el-icon>
                        </div>
                    </div>

                    <div class="card-content">
                        <h3 class="item-title" :title="item.title">{{ item.title }}</h3>

                        <div class="price-row">
                            <div><span class="currency">¥</span><span class="amount">{{ item.price }}</span></div>
                            <div class="stock-tag">库存: {{ item.stock_quantity }}</div>
                        </div>

                        <div class="item-meta">
                            <span class="seller-info"><el-icon>
                                    <User />
                                </el-icon> {{ item.seller_name }}</span>
                            <div class="meta-stats">
                                <span><el-icon>
                                        <View />
                                    </el-icon> {{ item.view_count }}</span>
                                <span><el-icon>
                                        <Star />
                                    </el-icon> {{ item.collect_count }}</span>
                            </div>
                        </div>

                        <div class="action-area">
                            <el-button type="danger" size="small" class="buy-btn" :disabled="item.stock_quantity === 0"
                                @click.stop="openBuyDialog(item)">
                                {{ item.stock_quantity > 0 ? '立即购买' : '缺货' }}
                            </el-button>
                        </div>
                    </div>
                </el-card>
            </el-col>
        </el-row>

        <el-empty v-if="!loading && itemList.length === 0" description="没有找到相关商品" />

        <el-dialog v-model="dialogVisible" title="确认订单" width="400px" append-to-body>
            <div v-if="selectedItem">
                <p>您正在购买：<strong>{{ selectedItem.title }}</strong></p>
                <p class="dialog-price">总价：¥ {{ selectedItem.price }}</p>
                <el-form :model="orderForm" label-position="top" class="mt-20">
                    <el-form-item label="收货地址" required>
                        <el-input v-model="orderForm.address" placeholder="例如：西区宿舍 5号楼 201" />
                    </el-form-item>
                    <el-form-item label="联系电话" required>
                        <el-input v-model="orderForm.phone" placeholder="请输入手机号" />
                    </el-form-item>
                </el-form>
            </div>
            <template #footer>
                <span class="dialog-footer">
                    <el-button @click="dialogVisible = false">取消</el-button>
                    <el-button type="primary" @click="confirmBuy" :loading="submitting">确认支付</el-button>
                </span>
            </template>
        </el-dialog>

        <el-dialog v-model="detailVisible" width="600px" title="商品详情" append-to-body>
            <div v-if="selectedItem" class="detail-container">
                <el-image :src="selectedItem.main_image" class="detail-img" fit="contain" />

                <h2 class="detail-title">{{ selectedItem.title }}</h2>

                <div class="detail-price-row">
                    <span class="detail-price">¥ {{ selectedItem.price }}</span>
                    <el-tag v-if="selectedItem.stock_quantity > 0" type="success">有货</el-tag>
                    <el-tag v-else type="info">已售罄</el-tag>
                </div>

                <div class="detail-section">
                    <div class="section-label">商品描述</div>
                    <div class="detail-desc">{{ selectedItem.description || '卖家很懒，没有填写详细描述' }}</div>
                </div>

                <div class="detail-meta-row">
                    <div class="meta-item"><el-icon>
                            <User />
                        </el-icon> 卖家: {{ selectedItem.seller_name }}</div>
                    <div class="meta-item"><el-icon>
                            <View />
                        </el-icon> 浏览: {{ selectedItem.view_count }}</div>
                    <div class="meta-item"><el-icon>
                            <Star />
                        </el-icon> 收藏: {{ selectedItem.collect_count }}</div>
                    <div class="meta-item"><el-icon>
                            <Clock />
                        </el-icon> 发布于: {{ new Date(selectedItem.created_at || '').toLocaleDateString() }}</div>
                </div>
            </div>
            <template #footer>
                <el-button @click="detailVisible = false">关闭</el-button>
                <el-button type="danger" @click="openBuyDialog(selectedItem!)"
                    :disabled="selectedItem?.stock_quantity === 0">
                    立即购买
                </el-button>
            </template>
        </el-dialog>
    </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import request from '../utils/request';
import { ElMessage } from 'element-plus';
import {
    Picture, User, Search, Star, StarFilled,
    View, Clock
} from '@element-plus/icons-vue';

interface MarketItem {
    item_id: number;
    seller_id: number;
    title: string;
    price: string;
    stock_quantity: number;
    main_image: string;
    seller_name: string;
    view_count: number;
    collect_count: number;
    description?: string; // 详情描述
    created_at?: string;
    is_collected?: boolean; // 前端辅助状态
}

const loading = ref(false);
const itemList = ref<MarketItem[]>([]);

// 筛选状态
const activeCategory = ref('0');
const queryParams = reactive({ keyword: '' });

// 弹窗状态
const dialogVisible = ref(false); // 购买弹窗
const detailVisible = ref(false); // 详情弹窗
const submitting = ref(false);
const selectedItem = ref<MarketItem | null>(null);
const orderForm = reactive({ address: '', phone: '' });

// 1. 获取商品列表
const fetchItems = async () => {
    loading.value = true;
    try {
        const params: any = {};
        if (activeCategory.value !== '0') params.category = activeCategory.value;
        if (queryParams.keyword) params.keyword = queryParams.keyword;

        const res: any = await request.get('/items', { params });
        if (res.code === 200) {
            itemList.value = res.data || [];
        }
    } catch (error) {
        console.error(error);
    } finally {
        loading.value = false;
    }
};

// 筛选事件
const handleSearch = () => fetchItems();
const handleTabClick = () => fetchItems();

// 2. 收藏逻辑
const handleCollect = async (item: MarketItem) => {
    try {
        const res: any = await request.post(`/items/${item.item_id}/collect`);
        if (res.code === 200) {
            item.is_collected = !item.is_collected; // 切换图标
            // 视觉更新数字
            if (res.action === 'added') {
                item.collect_count++;
                ElMessage.success('收藏成功');
            } else {
                item.collect_count--;
                ElMessage.info('已取消收藏');
            }
        }
    } catch (e) { }
};

// 3. 详情与浏览量逻辑
const showDetail = (item: MarketItem) => {
    selectedItem.value = item;
    detailVisible.value = true;

    // 异步增加浏览量 (不阻塞UI)
    request.post(`/items/${item.item_id}/view`).then(() => {
        item.view_count++; // 前端即时反馈
    });
};

// 4. 购买逻辑
const openBuyDialog = (item: MarketItem) => {
    // 如果当前还在详情弹窗里，先关掉详情弹窗体验更好，或者层叠显示也可以
    // 这里选择保持详情弹窗开启，直接叠购买弹窗
    selectedItem.value = item;
    dialogVisible.value = true;
};

const confirmBuy = async () => {
    if (!orderForm.address || !orderForm.phone) return ElMessage.warning('请填写收货信息');
    if (!selectedItem.value?.seller_id) return ElMessage.error('商品信息缺失');

    submitting.value = true;
    try {
        const res: any = await request.post('/orders', {
            item_id: selectedItem.value.item_id,
            seller_id: selectedItem.value.seller_id,
            quantity: 1,
            address: orderForm.address,
            phone: orderForm.phone
        });
        if (res.code === 200) {
            ElMessage.success('下单成功！');
            dialogVisible.value = false;
            detailVisible.value = false; // 如果在详情页买的，顺便关掉详情
            fetchItems(); // 刷新库存
        }
    } catch (e) { } finally { submitting.value = false; }
};

onMounted(() => {
    fetchItems();
});
</script>

<style scoped>
.page-container {
    padding: 20px;
}

/* 工具栏 */
.filter-toolbar {
    margin-bottom: 20px;
}

.search-box {
    max-width: 400px;
    margin-bottom: 10px;
}

/* 卡片样式 */
.item-card {
    margin-bottom: 20px;
    border-radius: 8px;
    border: none;
    overflow: hidden;
    transition: transform 0.3s;
}

.item-card:hover {
    transform: translateY(-4px);
    box-shadow: 0 12px 24px rgba(0, 0, 0, 0.1);
}

.image-wrapper {
    width: 100%;
    padding-bottom: 100%;
    position: relative;
    background: #f5f7fa;
    cursor: pointer;
}

.item-image {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    transition: transform 0.3s;
}

.image-wrapper:hover .item-image {
    transform: scale(1.05);
}

/* 收藏按钮 */
.fav-btn {
    position: absolute;
    top: 10px;
    right: 10px;
    width: 32px;
    height: 32px;
    background: rgba(0, 0, 0, 0.3);
    border-radius: 50%;
    display: flex;
    justify-content: center;
    align-items: center;
    cursor: pointer;
    transition: all 0.2s;
    z-index: 5;
}

.fav-btn:hover {
    background: rgba(0, 0, 0, 0.6);
    transform: scale(1.1);
}

.sold-out-mask {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.6);
    color: #fff;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 24px;
    font-weight: bold;
    z-index: 2;
}

/* 卡片内容 */
.card-content {
    padding: 12px 16px;
}

.item-title {
    font-size: 15px;
    color: #333;
    margin-bottom: 8px;
    height: 22px;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
}

.price-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 8px;
}

.currency {
    font-size: 12px;
    color: #ff5000;
}

.amount {
    font-size: 18px;
    color: #ff5000;
    font-weight: bold;
}

.stock-tag {
    font-size: 12px;
    color: #999;
    background: #f4f4f5;
    padding: 2px 6px;
    border-radius: 4px;
}

.item-meta {
    display: flex;
    justify-content: space-between;
    font-size: 12px;
    color: #999;
    margin-bottom: 12px;
}

.meta-stats {
    display: flex;
    gap: 8px;
}

.meta-stats span {
    display: flex;
    align-items: center;
    gap: 2px;
}

.action-area {
    display: flex;
    justify-content: flex-end;
}

.buy-btn {
    width: 100%;
}

/* 详情弹窗样式 */
.detail-img {
    width: 100%;
    height: 300px;
    background: #f8f8f8;
    border-radius: 8px;
    margin-bottom: 20px;
}

.detail-title {
    margin: 0 0 10px 0;
    font-size: 20px;
    color: #333;
}

.detail-price-row {
    display: flex;
    align-items: center;
    gap: 15px;
    margin-bottom: 20px;
}

.detail-price {
    font-size: 28px;
    color: #ff5000;
    font-weight: bold;
}

.detail-section {
    background: #f9f9f9;
    padding: 15px;
    border-radius: 6px;
    margin-bottom: 20px;
}

.section-label {
    font-weight: bold;
    margin-bottom: 8px;
    font-size: 14px;
    color: #333;
}

.detail-desc {
    font-size: 14px;
    color: #666;
    line-height: 1.6;
}

.detail-meta-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
    font-size: 13px;
    color: #909399;
}

.meta-item {
    display: flex;
    align-items: center;
    gap: 5px;
}

.mt-20 {
    margin-top: 20px;
}

.dialog-price {
    font-size: 20px;
    color: #ff5000;
    font-weight: bold;
    margin: 10px 0;
}
</style>