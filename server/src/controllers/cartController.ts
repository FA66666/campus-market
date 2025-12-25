// 文件路径: server/src/controllers/cartController.ts
import { Request, Response } from "express";
import pool from "../config/db";
import { RowDataPacket, ResultSetHeader } from "mysql2";

/**
 * 获取用户的购物车
 */
export const getCart = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;

    const [cart] = await pool.query<RowDataPacket[]>(
      `SELECT
        c.cart_id, c.item_id, c.quantity, c.created_at,
        i.title, i.price, i.stock_quantity, i.main_image, i.status,
        i.seller_id, u.username AS seller_name
       FROM Cart_Items c
       JOIN Items i ON c.item_id = i.item_id
       JOIN Users u ON i.seller_id = u.user_id
       WHERE c.user_id = ? AND i.deleted_at IS NULL
       ORDER BY c.created_at DESC`,
      [userId]
    );

    res.json({
      code: 200,
      data: cart,
    });
  } catch (error) {
    console.error("获取购物车失败:", error);
    res.status(500).json({ code: 500, message: "获取购物车失败" });
  }
};

/**
 * 添加商品到购物车
 */
export const addToCart = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const userId = req.user?.userId;
    const { item_id, quantity } = req.body;

    if (!item_id || !quantity || quantity < 1) {
      res.status(400).json({ code: 400, message: "参数错误" });
      return;
    }

    // 检查商品是否存在且有效
    const [items] = await pool.query<RowDataPacket[]>(
      `SELECT seller_id, stock_quantity, status
       FROM Items
       WHERE item_id = ? AND deleted_at IS NULL`,
      [item_id]
    );

    if (items.length === 0) {
      res.status(404).json({ code: 404, message: "商品不存在" });
      return;
    }

    const item = items[0];

    // 检查是否为自己的商品
    if (item.seller_id === userId) {
      res.status(400).json({ code: 400, message: "不能购买自己发布的商品" });
      return;
    }

    // 检查商品状态
    if (item.status !== 1) {
      res.status(400).json({ code: 400, message: "商品未上架，无法加入购物车" });
      return;
    }

    // 检查库存
    if (item.stock_quantity < quantity) {
      res.status(400).json({ code: 400, message: "库存不足" });
      return;
    }

    // 插入或更新购物车（如果已存在则累加数量）
    await pool.query(
      `INSERT INTO Cart_Items (user_id, item_id, quantity)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE quantity = quantity + ?`,
      [userId, item_id, quantity, quantity]
    );

    res.json({
      code: 200,
      message: "添加到购物车成功",
    });
  } catch (error) {
    console.error("添加到购物车失败:", error);
    res.status(500).json({ code: 500, message: "添加到购物车失败" });
  }
};

/**
 * 更新购物车商品数量
 */
export const updateCartItem = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const userId = req.user?.userId;
    const itemId = parseInt(req.params.itemId);
    const { quantity } = req.body;

    if (!quantity || quantity < 1) {
      res.status(400).json({ code: 400, message: "数量必须大于0" });
      return;
    }

    // 检查购物车项是否存在且归属当前用户
    const [carts] = await pool.query<RowDataPacket[]>(
      "SELECT cart_id FROM Cart_Items WHERE user_id = ? AND item_id = ?",
      [userId, itemId]
    );

    if (carts.length === 0) {
      res.status(404).json({ code: 404, message: "购物车中没有该商品" });
      return;
    }

    // 检查库存
    const [items] = await pool.query<RowDataPacket[]>(
      "SELECT stock_quantity FROM Items WHERE item_id = ?",
      [itemId]
    );

    if (items.length === 0 || items[0].stock_quantity < quantity) {
      res.status(400).json({ code: 400, message: "库存不足" });
      return;
    }

    // 更新数量
    await pool.query(
      "UPDATE Cart_Items SET quantity = ? WHERE user_id = ? AND item_id = ?",
      [quantity, userId, itemId]
    );

    res.json({
      code: 200,
      message: "更新购物车成功",
    });
  } catch (error) {
    console.error("更新购物车失败:", error);
    res.status(500).json({ code: 500, message: "更新购物车失败" });
  }
};

/**
 * 从购物车移除商品
 */
export const removeFromCart = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const userId = req.user?.userId;
    const itemId = parseInt(req.params.itemId);

    await pool.query("DELETE FROM Cart_Items WHERE user_id = ? AND item_id = ?", [
      userId,
      itemId,
    ]);

    res.json({
      code: 200,
      message: "移除成功",
    });
  } catch (error) {
    console.error("移除商品失败:", error);
    res.status(500).json({ code: 500, message: "移除商品失败" });
  }
};

/**
 * 清空购物车
 */
export const clearCart = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const userId = req.user?.userId;

    await pool.query("DELETE FROM Cart_Items WHERE user_id = ?", [userId]);

    res.json({
      code: 200,
      message: "购物车已清空",
    });
  } catch (error) {
    console.error("清空购物车失败:", error);
    res.status(500).json({ code: 500, message: "清空购物车失败" });
  }
};

/**
 * 批量删除购物车商品
 */
export const batchRemoveFromCart = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const userId = req.user?.userId;
    const { item_ids } = req.body; // 数组

    if (!item_ids || !Array.isArray(item_ids) || item_ids.length === 0) {
      res.status(400).json({ code: 400, message: "参数错误" });
      return;
    }

    await pool.query(
      "DELETE FROM Cart_Items WHERE user_id = ? AND item_id IN (?)",
      [userId, item_ids]
    );

    res.json({
      code: 200,
      message: "批量删除成功",
    });
  } catch (error) {
    console.error("批量删除失败:", error);
    res.status(500).json({ code: 500, message: "批量删除失败" });
  }
};
