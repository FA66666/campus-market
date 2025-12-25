<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import request from '../utils/request'
import { useCartStore } from '../stores/cart'
import { ElMessage, ElMessageBox } from 'element-plus'
import { ShoppingCart, Search, Filter, Sort } from '@element-plus/icons-vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const cartStore = useCartStore()

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
    view_count?: number
    collect_count?: number
}

const items = ref<Item[]>([])
const loading = ref(false)

// 筛选条件
const filters = ref({
    keyword: '',
    minPrice: undefined as number | undefined,
    maxPrice: undefined as number | undefined,
    sortBy: 'created_at',
    hasStock: false
})

// 排序选项
const sortOptions = [
    { value: 'created_at', label: '最新发布' },
    { value: 'price_asc', label: '价格从低到高' },
    { value: 'price_desc', label: '价格从高到低' },
    { value: 'view_count', label: '浏览量最高' },
    { value: 'collect_count', label: '收藏量最高' }
]

// 结算相关状态
const showCartModal = ref(false)
const address = ref('')
const phone = ref('')

// 地址相关
interface Address {
    address_id: number
    receiver_name: string
    receiver_phone: string
    address: string
    is_default: number
}
const addresses = ref<Address[]>([])
const selectedAddressId = ref<number | null>(null)

// 获取用户地址列表
const fetchAddresses = async () => {
    try {
        const res: any = await request.get('/addresses')
        if (res.code === 200) {
            addresses.value = res.data
            // 自动选择默认地址
            const defaultAddr = addresses.value.find(a => a.is_default === 1)
            if (defaultAddr) {
                selectedAddressId.value = defaultAddr.address_id
                address.value = defaultAddr.address
                phone.value = defaultAddr.receiver_phone
            }
        }
    } catch (err) {
        console.error('获取地址失败:', err)
    }
}

// 地址选择变化
const handleAddressChange = (addrId: number) => {
    const addr = addresses.value.find(a => a.address_id === addrId)
    if (addr) {
        address.value = addr.address
        phone.value = addr.receiver_phone
    }
}

// 图片路径处理
const getImageUrl = (img: string | null) => {
    if (!img) return 'https://via.placeholder.com/300x300?text=No+Image';
    if (img.startsWith('/uploads')) {
        return `http://localhost:3000${img}`;
    }
    return img;
}

// 提取所有图片
const getItemImages = (item: Item) => {
    const list: string[] = [];
    if (item.main_image) list.push(item.main_image);
    if (item.description) {
        const regex = /<img[^>]+src="([^">]+)"/g;
        let match;
        while ((match = regex.exec(item.description)) !== null) {
            if (!list.includes(match[1])) {
                list.push(match[1]);
            }
        }
    }
    return list;
}

// 获取商品列表
const fetchItems = async () => {
    loading.value = true
    try {
        const params: Record<string, any> = {}
        if (filters.value.keyword) params.keyword = filters.value.keyword
        if (filters.value.minPrice !== undefined) params.minPrice = filters.value.minPrice
        if (filters.value.maxPrice !== undefined) params.maxPrice = filters.value.maxPrice
        if (filters.value.sortBy) params.sortBy = filters.value.sortBy
        if (filters.value.hasStock) params.hasStock = 'true'

        const res: any = await request.get('/items/market', { params })
        if (res.code === 200) {
            items.value = res.data
        }
    } catch (error) {
        ElMessage.error('获取商品列表失败')
    } finally {
        loading.value = false
    }
}

// 重置筛选条件
const resetFilters = () => {
    filters.value = {
        keyword: '',
        minPrice: undefined,
        maxPrice: undefined,
        sortBy: 'created_at',
        hasStock: false
    }
    fetchItems()
}

// 搜索
const handleSearch = () => {
    fetchItems()
}

// ✅ 跳转到详情页
const goToDetail = (item: Item) => {
    router.push({
        name: 'itemDetail',
        params: { id: item.item_id }
    })
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
    cartStore.loadCart()
    fetchAddresses()
})
</script>

<template>
    <div class="market-container">
        <div class="page-header">
            <h2>二手商品广场</h2>
            <p class="subtitle">发现校园里的宝藏</p>
        </div>

        <!-- 筛选栏 -->
        <el-card class="filter-card" shadow="never">
            <div class="filter-row">
                <div class="search-box">
                    <el-input v-model="filters.keyword" placeholder="搜索商品名称..." clearable @keyup.enter="handleSearch"
                        style="width: 250px;">
                        <template #prefix>
                            <el-icon>
                                <Search />
                            </el-icon>
                        </template>
                    </el-input>
                    <el-button type="primary" @click="handleSearch">搜索</el-button>
                </div>

                <div class="filter-group">
                    <span class="filter-label">价格区间:</span>
                    <el-input-number v-model="filters.minPrice" :min="0" :precision="0" placeholder="最低价"
                        controls-position="right" style="width: 100px;" />
                    <span class="price-sep">-</span>
                    <el-input-number v-model="filters.maxPrice" :min="0" :precision="0" placeholder="最高价"
                        controls-position="right" style="width: 100px;" />
                </div>

                <div class="filter-group">
                    <span class="filter-label">排序:</span>
                    <el-select v-model="filters.sortBy" style="width: 140px;" @change="fetchItems">
                        <el-option v-for="opt in sortOptions" :key="opt.value" :label="opt.label" :value="opt.value" />
                    </el-select>
                </div>

                <div class="filter-group">
                    <el-checkbox v-model="filters.hasStock" @change="fetchItems">只看有货</el-checkbox>
                </div>

                <el-button @click="resetFilters">重置</el-button>
            </div>
        </el-card>

        <div v-if="loading" class="loading-state" v-loading="loading" style="min-height: 200px;"></div>

        <div v-else class="items-grid">
            <el-card v-for="item in items" :key="item.item_id" class="item-card" :body-style="{ padding: '0px' }"
                shadow="hover" @click="goToDetail(item)">

                <div class="image-container">
                    <el-carousel trigger="click" height="180px" :autoplay="false" indicator-position="none"
                        arrow="hover" @click.stop="goToDetail(item)">
                        <el-carousel-item v-for="(img, index) in getItemImages(item)" :key="index">
                            <img :src="getImageUrl(img)" :alt="item.title" class="item-image" />
                        </el-carousel-item>
                    </el-carousel>

                    <div v-if="item.stock_quantity <= 0" class="sold-out-mask">
                        <span>已售罄</span>
                    </div>
                </div>

                <div class="card-body">
                    <h3 class="item-title" :title="item.title">{{ item.title }}</h3>
                    <p class="item-desc">{{ item.description ? item.description.replace(/<[^>]+>/g, '') : '暂无详细描述' }}
                    </p>

                    <div class="item-meta">
                        <span class="price">¥{{ item.price }}</span>
                        <span class="stock-tag">库存: {{ item.stock_quantity }}</span>
                    </div>
                    <div class="item-footer">
                        <span class="seller">👤 {{ item.seller_name }}</span>
                    </div>
                </div>
            </el-card>
        </div>

        <div class="cart-float" @click="showCartModal = true">
            <el-badge :value="cartStore.totalCount" :hidden="cartStore.totalCount === 0" class="cart-badge">
                <el-button type="warning" circle size="large" :icon="ShoppingCart"
                    style="font-size: 24px; width: 60px; height: 60px;" />
            </el-badge>
        </div>

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
                        <el-form-item label="选择收货地址" v-if="addresses.length > 0">
                            <el-select v-model="selectedAddressId" placeholder="选择已保存的地址" style="width: 100%;"
                                @change="handleAddressChange">
                                <el-option v-for="addr in addresses" :key="addr.address_id" :value="addr.address_id"
                                    :label="`${addr.receiver_name} ${addr.receiver_phone} - ${addr.address}`">
                                    <div style="display: flex; justify-content: space-between; align-items: center;">
                                        <span>{{ addr.receiver_name }} {{ addr.receiver_phone }}</span>
                                        <el-tag v-if="addr.is_default === 1" type="warning" size="small">默认</el-tag>
                                    </div>
                                    <div style="font-size: 12px; color: #909399;">{{ addr.address }}</div>
                                </el-option>
                            </el-select>
                        </el-form-item>
                        <el-form-item label="收货地址">
                            <el-input v-model="address" placeholder="请输入详细地址" />
                        </el-form-item>
                        <el-form-item label="联系电话">
                            <el-input v-model="phone" placeholder="请输入手机号" />
                        </el-form-item>
                        <div v-if="addresses.length === 0" class="no-address-tip">
                            <router-link to="/addresses">还没有保存的地址？去添加</router-link>
                        </div>
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

.filter-card {
    margin-bottom: 20px;
    background: #fff;
}

.filter-row {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 15px;
}

.search-box {
    display: flex;
    gap: 10px;
}

.filter-group {
    display: flex;
    align-items: center;
    gap: 8px;
}

.filter-label {
    color: #606266;
    font-size: 14px;
    white-space: nowrap;
}

.price-sep {
    color: #909399;
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
    z-index: 10;
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

.cart-float {
    position: fixed;
    bottom: 50px;
    right: 50px;
    z-index: 1000;
}

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

.no-address-tip {
    text-align: center;
    padding: 10px 0;
}

.no-address-tip a {
    color: #409eff;
    text-decoration: none;
}

.no-address-tip a:hover {
    text-decoration: underline;
}
</style>