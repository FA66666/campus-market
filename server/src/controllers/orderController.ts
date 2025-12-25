import { Request, Response } from "express";
import pool from "../config/db";

// 1. 创建订单 (支持购物车多商家拆单)
export const createOrder = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const buyerId = (req as any).user.userId;
    const { items, address, phone } = req.body;

    if (
      !items ||
      !Array.isArray(items) ||
      items.length === 0 ||
      !address ||
      !phone
    ) {
      res
        .status(400)
        .json({ message: "订单信息不完整（需包含商品列表、地址、电话）" });
      return;
    }

    // --- 核心逻辑：订单拆分 ---
    const ordersBySeller = new Map<number, any[]>();
    for (const item of items) {
      const sid = Number(item.seller_id);
      if (!sid || !item.item_id) continue;

      if (!ordersBySeller.has(sid)) {
        ordersBySeller.set(sid, []);
      }

      ordersBySeller.get(sid)!.push({
        item_id: Number(item.item_id),
        qty: Number(item.quantity || 1),
      });
    }

    const createdOrderIds: number[] = [];
    const errors: string[] = [];

    // 遍历每个商家，分别调用存储过程下单
    for (const [sellerId, sellerItems] of ordersBySeller) {
      const itemsJson = JSON.stringify(sellerItems);

      const sql = `
        CALL sp_create_order(?, ?, ?, ?, ?, @res_code, @order_id);
        SELECT @res_code AS res_code, @order_id AS order_id;
      `;

      try {
        const [results] = await pool.query(sql, [
          buyerId,
          sellerId,
          itemsJson,
          address,
          phone,
        ]);

        const rows = results as any[];
        const output = rows[1] ? rows[1][0] : null;

        if (output && output.res_code === 200) {
          createdOrderIds.push(output.order_id);
        } else {
          const code = output ? output.res_code : "Unknown";
          errors.push(`卖家(ID:${sellerId})订单创建失败，错误码: ${code}`);
        }
      } catch (err: any) {
        console.error(`卖家 ${sellerId} 拆单异常:`, err);
        errors.push(`卖家(ID:${sellerId})系统处理异常`);
      }
    }

    if (createdOrderIds.length > 0) {
      res.status(201).json({
        code: 200,
        message: "下单处理完成",
        orderIds: createdOrderIds,
        warnings: errors.length > 0 ? errors : undefined,
      });
    } else {
      res.status(400).json({ message: "下单失败", errors });
    }
  } catch (error) {
    console.error("创建订单全局失败:", error);
    res.status(500).json({ message: "服务器内部错误" });
  }
};

// 2. 获取我的订单 (买家视角)
export const getMyOrders = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const buyerId = (req as any).user.userId;
    // ✅ 修改：关联 Users 表获取 seller_name、seller_credit_score
    const sql = `
      SELECT
        o.order_id,
        o.total_amount,
        o.status,
        o.created_at,
        o.seller_id,
        u.username AS seller_name,
        u.credit_score AS seller_credit_score,
        i.title AS item_title,
        i.main_image,
        r.rating AS my_rating,
        r.content AS my_review
      FROM Orders o
      JOIN Users u ON o.seller_id = u.user_id
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
    const buyerId = (req as any).user.userId;
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

// 4. 获取我卖出的 (卖家视角)
export const getMySales = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const sellerId = (req as any).user.userId;
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
    console.error("获取销售记录失败:", error);
    res.status(500).json({ message: "获取失败" });
  }
};

// 5. 支付订单
export const payOrder = async (req: Request, res: Response): Promise<void> => {
  try {
    const buyerId = (req as any).user.userId;
    const orderId = req.params.id;

    const { transaction_ref } = req.body;
    const file = (req as any).file;

    if (!transaction_ref || !file) {
      res.status(400).json({ message: "支付失败：必须提供支付凭证图和流水号" });
      return;
    }

    const payment_proof = `/uploads/payment_proofs/${file.filename}`;

    const [result]: any = await pool.query(
      `UPDATE Orders 
       SET status = 1, transaction_ref = ?, payment_proof = ?
       WHERE order_id = ? AND buyer_id = ? AND status = 0`,
      [transaction_ref, payment_proof, orderId, buyerId]
    );

    if (result.affectedRows === 0) {
      res.status(400).json({ message: "操作失败：订单不存在或状态不正确" });
      return;
    }

    res.json({ code: 200, message: "支付提交成功，请等待卖家发货" });
  } catch (error) {
    console.error("支付异常", error);
    res.status(500).json({ message: "支付失败" });
  }
};

// 6. 发货
export const shipOrder = async (req: Request, res: Response): Promise<void> => {
  try {
    const sellerId = (req as any).user.userId;
    const orderId = req.params.id;
    const [result]: any = await pool.query(
      "UPDATE Orders SET status = 2 WHERE order_id = ? AND seller_id = ? AND status = 1",
      [orderId, sellerId]
    );
    if (result.affectedRows === 0) {
      res.status(403).json({ message: "操作失败：无权操作或订单状态不符" });
      return;
    }
    res.json({ code: 200, message: "发货成功" });
  } catch (error) {
    res.status(500).json({ message: "发货失败" });
  }
};

// 7. 确认收货
export const confirmReceipt = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const buyerId = (req as any).user.userId;
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
