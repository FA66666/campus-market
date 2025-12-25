import { defineStore } from "pinia";
import { ref, computed, watch } from "vue";
import request from "../utils/request";

// 定义购物车商品接口
export interface CartItem {
  item_id: number;
  title: string;
  price: number;
  main_image: string | null;
  seller_id: number;
  quantity: number;
  stock_quantity: number;
}

export const useCartStore = defineStore("cart", () => {
  // 购物车列表
  const items = ref<CartItem[]>([]);
  const isLoading = ref(false);
  const isInitialized = ref(false);

  // 从服务器加载购物车
  const loadCart = async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      items.value = [];
      return;
    }

    isLoading.value = true;
    try {
      const res: any = await request.get("/cart");
      if (res.code === 200 && res.data) {
        items.value = res.data.map((item: any) => ({
          item_id: item.item_id,
          title: item.title,
          price: item.price,
          main_image: item.main_image,
          seller_id: item.seller_id,
          quantity: item.quantity,
          stock_quantity: item.stock_quantity,
        }));
      }
    } catch (err) {
      console.error("加载购物车失败:", err);
    } finally {
      isLoading.value = false;
      isInitialized.value = true;
    }
  };

  // 添加商品到购物车
  const addItem = async (product: any, count: number = 1) => {
    const existingItem = items.value.find(
      (item) => item.item_id === product.item_id
    );

    if (existingItem) {
      const newQuantity = existingItem.quantity + count;
      if (newQuantity <= existingItem.stock_quantity) {
        existingItem.quantity = newQuantity;
      } else {
        existingItem.quantity = existingItem.stock_quantity;
      }
    } else {
      items.value.push({
        item_id: product.item_id,
        title: product.title,
        price: product.price,
        main_image: product.main_image,
        seller_id: product.seller_id,
        quantity: count,
        stock_quantity: product.stock_quantity,
      });
    }

    // 同步到服务器
    const token = localStorage.getItem("token");
    if (token) {
      try {
        await request.post("/cart", {
          item_id: product.item_id,
          quantity: count,
        });
      } catch (err) {
        console.error("同步购物车失败:", err);
      }
    }
  };

  // 更新商品数量
  const updateQuantity = async (itemId: number, quantity: number) => {
    const item = items.value.find((i) => i.item_id === itemId);
    if (item) {
      item.quantity = quantity;

      const token = localStorage.getItem("token");
      if (token) {
        try {
          await request.put(`/cart/${itemId}`, { quantity });
        } catch (err) {
          console.error("更新数量失败:", err);
        }
      }
    }
  };

  // 移除商品
  const removeItem = async (itemId: number) => {
    items.value = items.value.filter((item) => item.item_id !== itemId);

    const token = localStorage.getItem("token");
    if (token) {
      try {
        await request.delete(`/cart/${itemId}`);
      } catch (err) {
        console.error("移除商品失败:", err);
      }
    }
  };

  // 清空购物车
  const clearCart = async () => {
    items.value = [];

    const token = localStorage.getItem("token");
    if (token) {
      try {
        await request.delete("/cart");
      } catch (err) {
        console.error("清空购物车失败:", err);
      }
    }
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
    isLoading,
    isInitialized,
    loadCart,
    addItem,
    updateQuantity,
    removeItem,
    clearCart,
    totalCount,
    totalPrice,
  };
});
