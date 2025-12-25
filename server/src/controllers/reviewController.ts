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

    // 2. 只有"已完成"的订单才能评价
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

/**
 * 获取商品的所有评价
 */
export const getItemReviews = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const itemId = parseInt(req.params.itemId);

    const [reviews] = await pool.query<RowDataPacket[]>(
      `SELECT
        r.review_id, r.rating, r.content, r.created_at,
        u.username AS reviewer_name
       FROM Reviews r
       JOIN Orders o ON r.order_id = o.order_id
       JOIN Order_Items oi ON o.order_id = oi.order_id
       JOIN Users u ON r.user_id = u.user_id
       WHERE oi.item_id = ? AND r.is_hidden = 0
       ORDER BY r.created_at DESC`,
      [itemId]
    );

    // 计算平均评分
    let avgRating = 0;
    if (reviews.length > 0) {
      const totalRating = reviews.reduce((sum, r) => sum + r.rating, 0);
      avgRating = parseFloat((totalRating / reviews.length).toFixed(1));
    }

    res.json({
      code: 200,
      data: {
        reviews,
        avgRating,
        total: reviews.length,
      },
    });
  } catch (error) {
    console.error("获取商品评价失败:", error);
    res.status(500).json({ code: 500, message: "获取评价失败" });
  }
};

/**
 * 获取用户收到的评价
 */
export const getUserReviews = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const userId = parseInt(req.params.userId);

    const [reviews] = await pool.query<RowDataPacket[]>(
      `SELECT
        r.review_id, r.order_id, r.rating, r.content, r.created_at,
        u.username AS reviewer_name
       FROM Reviews r
       JOIN Users u ON r.user_id = u.user_id
       WHERE r.to_user_id = ? AND r.is_hidden = 0
       ORDER BY r.created_at DESC`,
      [userId]
    );

    // 计算平均评分
    let avgRating = 0;
    if (reviews.length > 0) {
      const totalRating = reviews.reduce((sum, r) => sum + r.rating, 0);
      avgRating = parseFloat((totalRating / reviews.length).toFixed(1));
    }

    res.json({
      code: 200,
      data: {
        reviews,
        avgRating,
        total: reviews.length,
      },
    });
  } catch (error) {
    console.error("获取用户评价失败:", error);
    res.status(500).json({ code: 500, message: "获取评价失败" });
  }
};

/**
 * 获取订单的评价详情
 */
export const getOrderReviews = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const orderId = parseInt(req.params.orderId);

    const [reviews] = await pool.query<RowDataPacket[]>(
      `SELECT
        r.review_id, r.user_id, r.to_user_id, r.rating, r.content, r.created_at,
        u1.username AS reviewer_name,
        u2.username AS reviewed_name
       FROM Reviews r
       JOIN Users u1 ON r.user_id = u1.user_id
       JOIN Users u2 ON r.to_user_id = u2.user_id
       WHERE r.order_id = ?
       ORDER BY r.created_at ASC`,
      [orderId]
    );

    res.json({
      code: 200,
      data: reviews,
    });
  } catch (error) {
    console.error("获取订单评价失败:", error);
    res.status(500).json({ code: 500, message: "获取评价失败" });
  }
};

