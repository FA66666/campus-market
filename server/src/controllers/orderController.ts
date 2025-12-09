import { Request, Response } from "express";
import pool from "../config/db";

// 1. 创建订单
export const createOrder = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const buyerId = req.user.userId;
    const { seller_id, item_id, quantity, address, phone } = req.body;

    if (!seller_id || !item_id || !address || !phone) {
      res.status(400).json({ message: "订单信息不完整" });
      return;
    }

    const itemsJson = JSON.stringify([
      { item_id: Number(item_id), qty: Number(quantity || 1) },
    ]);

    const sql = `
      CALL sp_create_order(?, ?, ?, ?, ?, @res_code, @order_id);
      SELECT @res_code AS res_code, @order_id AS order_id;
    `;

    const [results]: any = await pool.query(sql, [
      buyerId,
      seller_id,
      itemsJson,
      address,
      phone,
    ]);
    const output = results[1][0];
    const code = output.res_code;
    const orderId = output.order_id;

    if (code === 200) {
      res.status(201).json({ code: 200, message: "下单成功", orderId });
    } else {
      res.status(400).json({ message: "下单失败，错误码：" + code });
    }
  } catch (error) {
    console.error("创建订单失败:", error);
    res.status(500).json({ message: "服务器内部错误" });
  }
};

// 2. 获取我的订单 (买家视角) - 修改版：包含评价信息
export const getMyOrders = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const buyerId = req.user.userId;

    // 使用 LEFT JOIN 关联 Reviews 表
    // 条件是: r.order_id = o.order_id 且 r.user_id = o.buyer_id (确保查的是我自己写的评价)
    const sql = `
      SELECT 
        o.order_id, 
        o.total_amount, 
        o.status, 
        o.created_at,
        i.title AS item_title, 
        i.main_image,
        r.rating AS my_rating,      -- 新增字段：我的评分
        r.content AS my_review      -- 新增字段：我的评价内容
      FROM Orders o
      JOIN Order_Items oi ON o.order_id = oi.order_id
      JOIN Items i ON oi.item_id = i.item_id
      LEFT JOIN Reviews r ON o.order_id = r.order_id AND r.user_id = o.buyer_id
      WHERE o.buyer_id = ?
      ORDER BY o.created_at DESC
    `;

    const [rows] = await pool.query(sql, [buyerId]);
    res.json({ code: 200, data: rows });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "获取订单失败" });
  }
};

// 3. 取消订单
export const cancelOrder = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const buyerId = req.user.userId;
    const orderId = req.params.id;
    await pool.query(
      "UPDATE Orders SET status = 4 WHERE order_id = ? AND buyer_id = ? AND status = 0",
      [orderId, buyerId]
    );
    res.json({ code: 200, message: "订单已取消" });
  } catch (error) {
    res.status(500).json({ message: "取消失败" });
  }
};

// --- 以下是新增的方法 ---

// 4. 获取我卖出的 (卖家视角)
export const getMySales = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const sellerId = req.user.userId;
    const sql = `
      SELECT o.order_id, o.total_amount, o.status, o.created_at, o.buyer_id,
             o.delivery_snapshot, o.receiver_phone,
             i.title AS item_title, i.main_image,
             u.real_name AS buyer_name
      FROM Orders o
      JOIN Order_Items oi ON o.order_id = oi.order_id
      JOIN Items i ON oi.item_id = i.item_id
      JOIN Users u ON o.buyer_id = u.user_id
      WHERE o.seller_id = ?
      ORDER BY o.created_at DESC
    `;
    const [rows] = await pool.query(sql, [sellerId]);
    res.json({ code: 200, data: rows });
  } catch (error) {
    console.error("获取销售记录失败:", error); // 加上日志方便排查
    res.status(500).json({ message: "获取失败" });
  }
};

// 5. 支付订单 (状态 0 -> 1)
export const payOrder = async (req: Request, res: Response): Promise<void> => {
  try {
    const buyerId = req.user.userId;
    const orderId = req.params.id;
    await pool.query(
      "UPDATE Orders SET status = 1 WHERE order_id = ? AND buyer_id = ? AND status = 0",
      [orderId, buyerId]
    );
    res.json({ code: 200, message: "支付成功" });
  } catch (error) {
    res.status(500).json({ message: "支付失败" });
  }
};

// 6. 发货 (状态 1 -> 2)
export const shipOrder = async (req: Request, res: Response): Promise<void> => {
  try {
    const sellerId = req.user.userId;
    const orderId = req.params.id;
    const [result]: any = await pool.query(
      "UPDATE Orders SET status = 2 WHERE order_id = ? AND seller_id = ? AND status = 1",
      [orderId, sellerId]
    );
    if (result.affectedRows === 0) {
      res.status(403).json({ message: "操作失败：无权操作或状态不符" });
      return;
    }
    res.json({ code: 200, message: "发货成功" });
  } catch (error) {
    res.status(500).json({ message: "发货失败" });
  }
};

// 7. 确认收货 (状态 2 -> 3)
export const confirmReceipt = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const buyerId = req.user.userId;
    const orderId = req.params.id;
    await pool.query(
      "UPDATE Orders SET status = 3 WHERE order_id = ? AND buyer_id = ? AND status = 2",
      [orderId, buyerId]
    );
    res.json({ code: 200, message: "交易完成" });
  } catch (error) {
    res.status(500).json({ message: "操作失败" });
  }
};
