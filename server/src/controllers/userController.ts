import { Request, Response } from "express";
import pool from "../config/db";
import { RowDataPacket } from "mysql2";

// 获取个人档案
export const getUserProfile = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const userId = req.user.userId;

    // 查询字段包含：信誉分、实名信息、注册时间等
    const sql = `
      SELECT 
        user_id, username, student_id, real_name, 
        credit_score, status, created_at
      FROM Users 
      WHERE user_id = ?
    `;

    const [rows] = await pool.query<RowDataPacket[]>(sql, [userId]);

    if (rows.length === 0) {
      res.status(404).json({ message: "用户不存在" });
      return;
    }

    const user = rows[0];

    // 简单的统计数据 (可选)：该用户发布的商品数、买到的订单数
    // 这里用两个简单的子查询
    const [stats]: any = await pool.query(
      `
      SELECT 
        (SELECT COUNT(*) FROM Items WHERE seller_id = ?) AS sell_count,
        (SELECT COUNT(*) FROM Orders WHERE buyer_id = ?) AS buy_count
    `,
      [userId, userId]
    );

    res.json({
      code: 200,
      data: {
        ...user,
        stats: stats[0],
      },
    });
  } catch (error) {
    console.error("获取个人信息失败:", error);
    res.status(500).json({ message: "获取失败" });
  }
};
