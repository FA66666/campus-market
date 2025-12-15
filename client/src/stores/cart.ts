import { defineStore } from "pinia";
import { ref, computed } from "vue";

export interface CartItem {
  seller_id: number;
  item_id: number;
  title: string;
  price: number;
  main_image: string;
  quantity: number;
}

export const useCartStore = defineStore("cart", () => {
  const items = ref<CartItem[]>([]);

  // 添加商品
  const addItem = (product: any) => {
    const existing = items.value.find((i) => i.item_id === product.item_id);
    if (existing) {
      existing.quantity++;
    } else {
      items.value.push({
        seller_id: product.seller_id,
        item_id: product.item_id,
        title: product.title,
        price: Number(product.price),
        main_image: product.main_image,
        quantity: 1,
      });
    }
  };

  // 移除商品
  const removeItem = (itemId: number) => {
    const idx = items.value.findIndex((i) => i.item_id === itemId);
    if (idx > -1) items.value.splice(idx, 1);
  };

  // 清空购物车
  const clearCart = () => {
    items.value = [];
  };

  // 计算总价
  const totalPrice = computed(() => {
    return items.value
      .reduce((sum, item) => sum + item.price * item.quantity, 0)
      .toFixed(2);
  });

  // 计算总数量
  const totalCount = computed(() => {
    return items.value.reduce((sum, item) => sum + item.quantity, 0);
  });

  return { items, addItem, removeItem, clearCart, totalPrice, totalCount };
});
