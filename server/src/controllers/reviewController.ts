import { Request, Response } from "express";
import pool from "../config/db";
import { RowDataPacket } from "mysql2";

// 提交评价
export const createReview = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const userId = req.user.userId; // 当前操作人（评价人）
    const { order_id, rating, content } = req.body;

    if (!order_id || !rating) {
      res.status(400).json({ message: "评分和订单ID必填" });
      return;
    }

    // 1. 先查订单信息，确认是否有权限评价，以及确定被评价人
    const [orders] = await pool.query<RowDataPacket[]>(
      "SELECT buyer_id, seller_id, status FROM Orders WHERE order_id = ?",
      [order_id]
    );

    if (orders.length === 0) {
      res.status(404).json({ message: "订单不存在" });
      return;
    }

    const order = orders[0];

    // 2. 只有“已完成”的订单才能评价
    if (order.status !== 3) {
      res.status(400).json({ message: "交易未完成，无法评价" });
      return;
    }

    // 3. 确定被评价人 (to_user_id)
    let toUserId = 0;
    if (userId === order.buyer_id) {
      toUserId = order.seller_id; // 买家评卖家
    } else if (userId === order.seller_id) {
      toUserId = order.buyer_id; // 卖家评买家
    } else {
      res.status(403).json({ message: "您不是该订单的当事人，无权评价" });
      return;
    }

    // 4. 插入评价 (数据库设置了唯一索引 uk_order_review，重复评价会自动报错)
    await pool.query(
      `INSERT INTO Reviews (order_id, user_id, to_user_id, rating, content)
       VALUES (?, ?, ?, ?, ?)`,
      [order_id, userId, toUserId, rating, content || ""]
    );

    res.status(201).json({ code: 200, message: "评价发布成功" });
  } catch (error: any) {
    // 捕获唯一索引冲突 (Duplicate entry)
    if (error.code === "ER_DUP_ENTRY") {
      res.status(409).json({ message: "您已评价过该订单，不可重复评价" });
    } else {
      console.error("评价失败:", error);
      res.status(500).json({ message: "评价失败" });
    }
  }
};
