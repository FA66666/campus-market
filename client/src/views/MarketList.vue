<script setup lang="ts">
import { ref, onMounted } from 'vue'
import request from '../utils/request'
import { useCartStore } from '../stores/cart'
import { ElMessage, ElMessageBox } from 'element-plus'
import { ShoppingCart } from '@element-plus/icons-vue'

// 定义商品接口
interface Item {
    item_id: number
    title: string
    price: number
    main_image: string | null
    seller_name: string
    seller_id: number
    category_name?: string
    description: string
    stock_quantity: number
    status: number
}

const items = ref<Item[]>([])
const loading = ref(false)
const cartStore = useCartStore()

// 结算相关状态
const showCartModal = ref(false)
const address = ref('')
const phone = ref('')

// --- 详情弹窗相关状态 ---
const showDetailModal = ref(false)
const selectedItem = ref<Item | null>(null)
// ✅ 新增：详情页购买数量，默认为 1
const buyCount = ref(1)

// 图片处理
const getImageUrl = (img: string | null) => {
    return img || 'https://via.placeholder.com/300x300?text=No+Image'
}

// 获取商品列表
const fetchItems = async () => {
    loading.value = true
    try {
        const res: any = await request.get('/items/market')
        if (res.code === 200) {
            items.value = res.data
        }
    } catch (error) {
        ElMessage.error('获取商品列表失败')
    } finally {
        loading.value = false
    }
}

// 打开详情弹窗
const openDetailModal = (item: Item) => {
    selectedItem.value = item
    buyCount.value = 1 // ✅ 每次打开重置为 1
    showDetailModal.value = true
}

// ✅ 修改：加入购物车 (支持传入数量)
const addToCart = (item: Item, event?: Event, count: number = 1) => {
    if (event) event.stopPropagation()

    if (item.stock_quantity <= 0) {
        ElMessage.warning('该商品暂时缺货')
        return
    }

    // 调用 store 的 addItem，传入数量
    cartStore.addItem(item, count)
    ElMessage.success(`已将 ${count} 件 "${item.title}" 加入购物车`)
}

// ✅ 修改：在详情页加入购物车 (使用 buyCount)
const addToCartFromDetail = () => {
    if (selectedItem.value) {
        addToCart(selectedItem.value, undefined, buyCount.value)
        showDetailModal.value = false
    }
}

// 提交订单
const submitOrder = async () => {
    if (!address.value || !phone.value) {
        ElMessage.warning('请填写收货地址和电话')
        return
    }
    if (cartStore.items.length === 0) return

    try {
        const payload = {
            items: cartStore.items.map(i => ({
                seller_id: i.seller_id,
                item_id: i.item_id,
                quantity: i.quantity
            })),
            address: address.value,
            phone: phone.value
        }

        const res: any = await request.post('/orders/create', payload)

        if (res.code === 200 || res.code === 201) {
            const orderIds = res.orderIds ? res.orderIds.join(', ') : ''
            ElMessage.success(`下单成功！订单号: ${orderIds}`)
            ElMessageBox.alert('请前往“我的订单”进行支付。', '下单成功', {
                confirmButtonText: '我知道了'
            })
            cartStore.clearCart()
            showCartModal.value = false
        } else {
            ElMessage.error(res.message || '下单失败')
        }
    } catch (err: any) {
        console.error(err)
        ElMessage.error('下单发生错误: ' + (err.response?.data?.message || err.message))
    }
}

onMounted(() => {
    fetchItems()
})
</script>

<template>
    <div class="market-container">
        <div class="page-header">
            <h2>🛍️ 二手商品广场</h2>
            <p class="subtitle">发现校园里的宝藏</p>
        </div>

        <div v-if="loading" class="loading-state" v-loading="loading" style="min-height: 200px;"></div>

        <div v-else class="items-grid">
            <el-card v-for="item in items" :key="item.item_id" class="item-card" :body-style="{ padding: '0px' }"
                shadow="hover" @click="openDetailModal(item)">
                <div class="image-container">
                    <img :src="getImageUrl(item.main_image)" :alt="item.title" class="item-image" />
                    <div v-if="item.stock_quantity <= 0" class="sold-out-mask">
                        <span>已售罄</span>
                    </div>
                </div>
                <div class="card-body">
                    <h3 class="item-title" :title="item.title">{{ item.title }}</h3>
                    <p class="item-desc">{{ item.description || '暂无详细描述' }}</p>

                    <div class="item-meta">
                        <span class="price">¥{{ item.price }}</span>
                        <span class="stock-tag">库存: {{ item.stock_quantity }}</span>
                    </div>
                    <div class="item-footer">
                        <span class="seller">👤 {{ item.seller_name }}</span>
                    </div>

                    <el-button type="primary" :icon="ShoppingCart" class="w-100" @click="addToCart(item, $event, 1)"
                        :disabled="item.stock_quantity <= 0" style="margin-top: 10px;">
                        {{ item.stock_quantity > 0 ? '加入购物车' : '缺货' }}
                    </el-button>
                </div>
            </el-card>
        </div>

        <div class="cart-float" @click="showCartModal = true">
            <el-badge :value="cartStore.totalCount" :hidden="cartStore.totalCount === 0" class="cart-badge">
                <el-button type="warning" circle size="large" :icon="ShoppingCart"
                    style="font-size: 24px; width: 60px; height: 60px;" />
            </el-badge>
        </div>

        <el-dialog v-model="showDetailModal" title="商品详情" width="700px" align-center destroy-on-close>
            <div v-if="selectedItem" class="detail-layout">
                <div class="detail-image-box">
                    <img :src="getImageUrl(selectedItem.main_image)" class="detail-image" />
                </div>
                <div class="detail-info-box">
                    <h3>{{ selectedItem.title }}</h3>
                    <p class="detail-price">¥{{ selectedItem.price }}</p>
                    <div class="detail-meta">
                        <p><strong>卖家:</strong> {{ selectedItem.seller_name }}</p>
                        <p><strong>库存:</strong> {{ selectedItem.stock_quantity }} 件</p>
                        <p v-if="selectedItem.category_name"><strong>分类:</strong> {{ selectedItem.category_name }}</p>
                    </div>
                    <el-divider content-position="left">商品描述 / 参数</el-divider>
                    <div class="detail-description">
                        <div class="desc-text">{{ selectedItem.description || '暂无描述' }}</div>
                    </div>

                    <div class="detail-actions"
                        style="margin-top: 20px; display: flex; align-items: center; gap: 15px;">
                        <span>购买数量:</span>
                        <el-input-number v-model="buyCount" :min="1" :max="selectedItem.stock_quantity" />
                    </div>
                </div>
            </div>
            <template #footer>
                <span class="dialog-footer">
                    <el-button @click="showDetailModal = false">关闭</el-button>
                    <el-button type="primary" @click="addToCartFromDetail"
                        :disabled="selectedItem?.stock_quantity! <= 0">
                        加入购物车
                    </el-button>
                </span>
            </template>
        </el-dialog>

        <el-dialog v-model="showCartModal" title="购物车结算" width="600px" align-center>
            <div v-if="cartStore.items.length === 0" class="empty-cart">
                <el-empty description="购物车是空的，快去选购吧~" />
            </div>
            <div v-else>
                <div class="cart-list-container">
                    <div v-for="item in cartStore.items" :key="item.item_id" class="cart-item-row">
                        <el-image :src="getImageUrl(item.main_image)" class="cart-thumb" fit="cover" />
                        <div class="cart-info">
                            <div class="cart-title">{{ item.title }}</div>
                            <div class="cart-meta" style="font-size: 12px; color: #999;">库存: {{ item.stock_quantity }}
                            </div>
                        </div>

                        <div class="cart-qty-control">
                            <el-input-number v-model="item.quantity" :min="1" :max="item.stock_quantity" size="small"
                                style="width: 100px;" />
                        </div>

                        <div class="cart-price-action">
                            <div class="price">¥{{ (item.price * item.quantity).toFixed(2) }}</div>
                            <el-button type="danger" link size="small" @click="cartStore.removeItem(item.item_id)">
                                删除
                            </el-button>
                        </div>
                    </div>
                </div>

                <div class="cart-summary">
                    <div class="total-row">
                        <span>总计:</span>
                        <span class="total-price-text">¥{{ cartStore.totalPrice }}</span>
                    </div>
                    <el-form label-position="top">
                        <el-form-item label="收货地址">
                            <el-input v-model="address" placeholder="请输入详细地址" />
                        </el-form-item>
                        <el-form-item label="联系电话">
                            <el-input v-model="phone" placeholder="请输入手机号" />
                        </el-form-item>
                    </el-form>
                </div>
            </div>
            <template #footer>
                <span class="dialog-footer">
                    <el-button @click="showCartModal = false">再逛逛</el-button>
                    <el-button type="primary" @click="submitOrder" :disabled="cartStore.items.length === 0">
                        确认下单支付
                    </el-button>
                </span>
            </template>
        </el-dialog>
    </div>
</template>

<style scoped>
.market-container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 20px;
    background-color: #f5f7fa;
    min-height: 90vh;
}

.page-header {
    margin-bottom: 20px;
}

.subtitle {
    color: #909399;
    font-size: 14px;
}

.items-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
    gap: 25px;
}

.item-card {
    cursor: pointer;
    transition: all 0.3s;
}

.item-card:hover {
    transform: translateY(-5px);
}

.image-container {
    width: 100%;
    height: 180px;
    background: #f8f9fa;
    overflow: hidden;
    position: relative;
}

.item-image {
    width: 100%;
    height: 100%;
    object-fit: cover;
}

.sold-out-mask {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(255, 255, 255, 0.7);
    display: flex;
    justify-content: center;
    align-items: center;
    color: #909399;
    font-weight: bold;
    font-size: 20px;
}

.card-body {
    padding: 15px;
}

.item-title {
    font-size: 16px;
    color: #303133;
    margin: 0 0 5px 0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.item-desc {
    font-size: 13px;
    color: #909399;
    margin: 0 0 10px 0;
    height: 36px;
    line-height: 18px;
    overflow: hidden;
    display: -webkit-box;
    line-clamp: 2;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
}

.item-meta {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 5px;
}

.price {
    color: #f56c6c;
    font-weight: bold;
    font-size: 18px;
}

.stock-tag {
    font-size: 12px;
    color: #67c23a;
    background: #f0f9eb;
    padding: 2px 6px;
    border-radius: 4px;
}

.item-footer {
    display: flex;
    justify-content: flex-end;
}

.seller {
    font-size: 12px;
    color: #909399;
    background: #f4f4f5;
    padding: 2px 6px;
    border-radius: 4px;
}

.w-100 {
    width: 100%;
}

/* 悬浮购物车 */
.cart-float {
    position: fixed;
    bottom: 50px;
    right: 50px;
    z-index: 1000;
}

/* 详情弹窗样式 */
.detail-layout {
    display: flex;
    gap: 20px;
}

.detail-image-box {
    flex: 1;
    border-radius: 4px;
    overflow: hidden;
    background: #f5f7fa;
    display: flex;
    align-items: center;
    justify-content: center;
}

.detail-image {
    max-width: 100%;
    max-height: 300px;
}

.detail-info-box {
    flex: 1.5;
}

.detail-price {
    font-size: 24px;
    color: #f56c6c;
    font-weight: bold;
    margin: 10px 0;
}

.desc-text {
    color: #606266;
    line-height: 1.6;
    white-space: pre-wrap;
    background: #f9fafc;
    padding: 10px;
    border-radius: 4px;
    max-height: 150px;
    overflow-y: auto;
}

/* 购物车列表样式 */
.cart-list-container {
    max-height: 300px;
    overflow-y: auto;
    margin-bottom: 20px;
    border: 1px solid #ebeef5;
    border-radius: 4px;
    padding: 10px;
}

.cart-item-row {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 10px;
    padding-bottom: 10px;
    border-bottom: 1px solid #f0f2f5;
}

.cart-item-row:last-child {
    border-bottom: none;
    margin-bottom: 0;
    padding-bottom: 0;
}

.cart-thumb {
    width: 50px;
    height: 50px;
    border-radius: 4px;
}

.cart-info {
    flex: 1;
}

.cart-title {
    font-size: 14px;
    font-weight: 500;
}

.cart-qty-control {
    margin: 0 15px;
}

.cart-price-action {
    text-align: right;
    min-width: 80px;
}

.cart-summary {
    background: #f9fafc;
    padding: 15px;
    border-radius: 4px;
}

.total-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 10px;
    font-weight: bold;
    font-size: 16px;
}

.total-price-text {
    color: #f56c6c;
    font-size: 20px;
}
</style>