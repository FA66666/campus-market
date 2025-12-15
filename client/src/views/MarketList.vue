<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import request from '../utils/request'
import { useCartStore } from '../stores/cart'

// 定义商品接口
interface Item {
    item_id: number
    title: string
    price: number
    main_image: string | null
    seller_name: string
    seller_id: number
    category_name?: string // 假设后端关联查询返回了分类名
    description: string
    status: number
}

const items = ref<Item[]>([])
const loading = ref(false)
const cartStore = useCartStore()

// 结算相关状态
const showCartModal = ref(false)
const address = ref('')
const phone = ref('')

// --- 新增：详情弹窗相关状态 ---
const showDetailModal = ref(false)
const selectedItem = ref<Item | null>(null)

// 图片处理：如果没有图片，显示默认占位图
const getImageUrl = (img: string | null) => {
    // 这里可以使用一个本地的 placeholder.png 或者在线图床地址
    return img || 'https://via.placeholder.com/300x300?text=No+Image'
}

// 获取商品列表
const fetchItems = async () => {
    loading.value = true
    try {
        // 假设后端接口 /items/market 返回的数据中包含了 category_name 和 description
        const res: any = await request.get('/items/market')
        if (res.code === 200) {
            items.value = res.data
        }
    } finally {
        loading.value = false
    }
}

// 打开详情弹窗
const openDetailModal = (item: Item) => {
    selectedItem.value = item
    showDetailModal.value = true
}

// 加入购物车 (阻止冒泡，避免触发详情弹窗)
const addToCart = (item: Item, event?: Event) => {
    if (event) event.stopPropagation()
    cartStore.addItem(item)
    // 可以替换为更友好的 Toast 提示
    alert(`${item.title} 已加入购物车`)
}

// 在详情页加入购物车并关闭弹窗
const addToCartFromDetail = () => {
    if (selectedItem.value) {
        addToCart(selectedItem.value)
        showDetailModal.value = false
    }
}

// 提交订单 (合并结算)
const submitOrder = async () => {
    if (!address.value || !phone.value) {
        alert('请填写收货地址和电话')
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
            alert(`下单成功！订单号: ${orderIds}\n请前往“我的订单”进行支付。`)
            cartStore.clearCart()
            showCartModal.value = false
        } else {
            alert(res.message || '下单失败')
        }
    } catch (err: any) {
        console.error(err)
        alert('下单发生错误: ' + (err.response?.data?.message || err.message))
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

        <div v-if="loading" class="loading-state">加载中...</div>

        <div class="items-grid">
            <div v-for="item in items" :key="item.item_id" class="item-card" @click="openDetailModal(item)">
                <div class="image-container">
                    <img :src="getImageUrl(item.main_image)" :alt="item.title" class="item-image" />
                </div>
                <div class="card-body">
                    <h3 class="item-title" :title="item.title">{{ item.title }}</h3>
                    <div class="item-meta">
                        <span class="price">¥{{ item.price }}</span>
                        <span class="seller">👤 {{ item.seller_name }}</span>
                    </div>
                    <button @click="addToCart(item, $event)" class="btn-add-cart">
                        加入购物车
                    </button>
                </div>
            </div>
        </div>

        <div class="cart-float" @click="showCartModal = true">
            <span class="cart-icon">🛒</span>
            <span class="cart-count" v-if="cartStore.totalCount > 0">{{ cartStore.totalCount }}</span>
        </div>

        <div v-if="showDetailModal && selectedItem" class="modal-overlay" @click.self="showDetailModal = false">
            <div class="modal-content detail-modal">
                <button class="close-btn" @click="showDetailModal = false">×</button>
                <div class="detail-layout">
                    <div class="detail-image-box">
                        <img :src="getImageUrl(selectedItem.main_image)" class="detail-image" />
                    </div>
                    <div class="detail-info-box">
                        <h3>{{ selectedItem.title }}</h3>
                        <p class="detail-price">¥{{ selectedItem.price }}</p>
                        <div class="detail-meta">
                            <p><strong>卖家:</strong> {{ selectedItem.seller_name }}</p>
                            <p v-if="selectedItem.category_name"><strong>分类:</strong> {{ selectedItem.category_name }}
                            </p>
                        </div>
                        <div class="detail-description">
                            <p><strong>商品描述:</strong></p>
                            <div class="desc-text">{{ selectedItem.description || '暂无描述' }}</div>
                        </div>
                        <div class="detail-actions">
                            <button @click="addToCartFromDetail" class="btn-primary btn-large">加入购物车</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <div v-if="showCartModal" class="modal-overlay" @click.self="showCartModal = false">
            <div class="modal-content cart-modal">
                <div class="modal-header">
                    <h3>购物车结算</h3>
                    <button class="close-btn" @click="showCartModal = false">×</button>
                </div>

                <div v-if="cartStore.items.length === 0" class="empty-cart">
                    购物车是空的，快去选购吧~
                </div>
                <div v-else>
                    <ul class="cart-list">
                        <li v-for="item in cartStore.items" :key="item.item_id">
                            <div class="cart-item-info">
                                <img :src="getImageUrl(item.main_image)" class="cart-thumb" />
                                <div>
                                    <div class="cart-item-title">{{ item.title }}</div>
                                    <div class="cart-item-qty">数量: {{ item.quantity }}</div>
                                </div>
                            </div>
                            <div class="cart-item-right">
                                <span class="cart-item-price">¥{{ (item.price * item.quantity).toFixed(2) }}</span>
                                <button @click="cartStore.removeItem(item.item_id)" class="btn-text-danger">删除</button>
                            </div>
                        </li>
                    </ul>

                    <div class="cart-summary">
                        <p class="total-price">总计: <span>¥{{ cartStore.totalPrice }}</span></p>
                        <div class="form-group">
                            <label>收货地址</label>
                            <input v-model="address" placeholder="请输入详细地址" />
                        </div>
                        <div class="form-group">
                            <label>联系电话</label>
                            <input v-model="phone" placeholder="请输入手机号" />
                        </div>
                    </div>

                    <div class="modal-actions">
                        <button @click="submitOrder" class="btn-primary btn-block">确认下单支付</button>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped>
/* 页面容器 */
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

.page-header h2 {
    color: #303133;
    margin-bottom: 5px;
}

.subtitle {
    color: #909399;
    font-size: 14px;
}

/* 商品网格 */
.items-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
    gap: 25px;
}

/* 商品卡片设计 */
.item-card {
    background: white;
    border-radius: 12px;
    overflow: hidden;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
    transition: transform 0.3s, box-shadow 0.3s;
    cursor: pointer;
    border: 1px solid #ebeef5;
}

.item-card:hover {
    transform: translateY(-5px);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
}

.image-container {
    width: 100%;
    height: 180px;
    background: #f0f2f5;
    overflow: hidden;
}

.item-image {
    width: 100%;
    height: 100%;
    object-fit: cover;
    /* 保持比例填充 */
    transition: transform 0.5s;
}

.item-card:hover .item-image {
    transform: scale(1.05);
}

.card-body {
    padding: 15px;
}

.item-title {
    font-size: 16px;
    color: #303133;
    margin: 0 0 10px 0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.item-meta {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 15px;
}

.price {
    color: #f56c6c;
    font-weight: bold;
    font-size: 18px;
}

.seller {
    font-size: 12px;
    color: #909399;
    background: #f4f4f5;
    padding: 2px 6px;
    border-radius: 4px;
}

.btn-add-cart {
    width: 100%;
    padding: 10px;
    background-color: #409eff;
    color: white;
    border: none;
    border-radius: 6px;
    font-weight: 500;
    cursor: pointer;
    transition: background-color 0.2s;
}

.btn-add-cart:hover {
    background-color: #66b1ff;
}

/* 悬浮购物车 */
.cart-float {
    position: fixed;
    bottom: 40px;
    right: 40px;
    background: linear-gradient(135deg, #ffba00, #ff9900);
    color: white;
    width: 64px;
    height: 64px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 6px 16px rgba(255, 153, 0, 0.3);
    cursor: pointer;
    z-index: 1000;
    position: relative;
    font-size: 24px;
    transition: transform 0.2s;
}

.cart-float:hover {
    transform: scale(1.1);
}

.cart-count {
    position: absolute;
    top: 0;
    right: 0;
    background: #f56c6c;
    color: white;
    font-size: 12px;
    padding: 2px 6px;
    border-radius: 10px;
    border: 2px solid white;
}

/* --- 通用弹窗样式 --- */
.modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.6);
    backdrop-filter: blur(2px);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 2000;
    animation: fadeIn 0.2s ease-out;
}

.modal-content {
    background: white;
    padding: 24px;
    border-radius: 16px;
    box-shadow: 0 12px 32px rgba(0, 0, 0, 0.2);
    position: relative;
    animation: slideUp 0.2s ease-out;
}

.close-btn {
    position: absolute;
    top: 15px;
    right: 20px;
    font-size: 24px;
    color: #909399;
    background: none;
    border: none;
    cursor: pointer;
}

/* 详情弹窗特定样式 */
.detail-modal {
    width: 700px;
    max-width: 95%;
}

.detail-layout {
    display: flex;
    gap: 30px;
}

.detail-image-box {
    flex: 2;
    height: 350px;
    background: #f8f9fa;
    border-radius: 8px;
    overflow: hidden;
}

.detail-image {
    width: 100%;
    height: 100%;
    object-fit: contain;
}

.detail-info-box {
    flex: 3;
    display: flex;
    flex-direction: column;
}

.detail-info-box h3 {
    margin-top: 0;
    font-size: 22px;
    color: #303133;
}

.detail-price {
    font-size: 28px;
    color: #f56c6c;
    font-weight: bold;
    margin: 15px 0;
}

.detail-meta p {
    margin: 5px 0;
    color: #606266;
}

.detail-description {
    margin-top: 20px;
    flex-grow: 1;
    border-top: 1px solid #eee;
    padding-top: 15px;
}

.desc-text {
    color: #606266;
    line-height: 1.6;
    white-space: pre-wrap;
    max-height: 120px;
    overflow-y: auto;
}

.detail-actions {
    margin-top: 20px;
}

/* 购物车弹窗特定样式 */
.cart-modal {
    width: 420px;
    max-width: 95%;
}

.modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
}

.modal-header h3 {
    margin: 0;
}

.cart-list {
    list-style: none;
    padding: 0;
    margin: 0 0 20px 0;
    max-height: 300px;
    overflow-y: auto;
}

.cart-list li {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 15px;
    padding-bottom: 15px;
    border-bottom: 1px solid #f0f2f5;
}

.cart-item-info {
    display: flex;
    align-items: center;
    gap: 10px;
}

.cart-thumb {
    width: 60px;
    height: 60px;
    object-fit: cover;
    border-radius: 4px;
    border: 1px solid #eee;
}

.cart-item-title {
    font-weight: 500;
    color: #303133;
}

.cart-item-qty {
    font-size: 12px;
    color: #909399;
}

.cart-item-right {
    text-align: right;
}

.cart-item-price {
    display: block;
    font-weight: bold;
    color: #303133;
    margin-bottom: 5px;
}

.btn-text-danger {
    color: #f56c6c;
    background: none;
    border: none;
    cursor: pointer;
    font-size: 12px;
    padding: 0;
}

.cart-summary {
    background: #f9fafc;
    padding: 15px;
    border-radius: 8px;
    margin-bottom: 20px;
}

.total-price {
    font-size: 16px;
    font-weight: bold;
    text-align: right;
    margin-bottom: 15px;
}

.total-price span {
    color: #f56c6c;
    font-size: 20px;
}

.form-group {
    margin-bottom: 12px;
}

.form-group label {
    display: block;
    margin-bottom: 5px;
    font-weight: 500;
    font-size: 14px;
}

.form-group input {
    width: 100%;
    padding: 10px;
    border: 1px solid #dcdfe6;
    border-radius: 4px;
    box-sizing: border-box;
}

.btn-primary {
    background-color: #409eff;
    color: white;
    border: none;
    padding: 10px 20px;
    border-radius: 6px;
    cursor: pointer;
    font-weight: 500;
}

.btn-primary:hover {
    background-color: #66b1ff;
}

.btn-block {
    width: 100%;
    padding: 12px;
    font-size: 16px;
}

.btn-large {
    padding: 12px 30px;
    font-size: 16px;
}

@keyframes fadeIn {
    from {
        opacity: 0;
    }

    to {
        opacity: 1;
    }
}

@keyframes slideUp {
    from {
        transform: translateY(20px);
        opacity: 0;
    }

    to {
        transform: translateY(0);
        opacity: 1;
    }
}
</style>