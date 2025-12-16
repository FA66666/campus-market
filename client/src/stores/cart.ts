import { defineStore } from "pinia";
import { ref, computed } from "vue";

// 定义购物车商品接口
export interface CartItem {
  item_id: number;
  title: string;
  price: number;
  main_image: string | null;
  seller_id: number;
  quantity: number;
  stock_quantity: number; // ✅ 必须包含库存，用于在购物车限制最大数量
}

export const useCartStore = defineStore("cart", () => {
  // 购物车列表
  const items = ref<CartItem[]>([]);

  // ✅ 修改：支持传入数量 count，默认为 1
  const addItem = (product: any, count: number = 1) => {
    const existingItem = items.value.find(
      (item) => item.item_id === product.item_id
    );

    if (existingItem) {
      // 如果已存在，增加数量 (检查库存上限)
      const newQuantity = existingItem.quantity + count;
      if (newQuantity <= existingItem.stock_quantity) {
        existingItem.quantity = newQuantity;
      } else {
        existingItem.quantity = existingItem.stock_quantity; // 超过库存则设为最大库存
      }
    } else {
      // 如果不存在，推入新商品
      items.value.push({
        item_id: product.item_id,
        title: product.title,
        price: product.price,
        main_image: product.main_image,
        seller_id: product.seller_id,
        quantity: count, // 使用传入的数量
        stock_quantity: product.stock_quantity, // 保存库存信息
      });
    }
  };

  const removeItem = (itemId: number) => {
    items.value = items.value.filter((item) => item.item_id !== itemId);
  };

  const clearCart = () => {
    items.value = [];
  };

  // 计算总件数
  const totalCount = computed(() => {
    return items.value.reduce((total, item) => total + item.quantity, 0);
  });

  // 计算总价
  const totalPrice = computed(() => {
    return items.value
      .reduce((total, item) => total + item.price * item.quantity, 0)
      .toFixed(2);
  });

  return {
    items,
    addItem,
    removeItem,
    clearCart,
    totalCount,
    totalPrice,
  };
});
