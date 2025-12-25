import { Request, Response } from "express";
import pool from "../config/db";
import { RowDataPacket } from "mysql2";

// 1. 获取个人资料
export const getProfile = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const userId = req.user.userId;
    const [rows] = await pool.query<RowDataPacket[]>(
      "SELECT user_id, username, student_id, real_name, auth_material, credit_score, status, created_at FROM Users WHERE user_id = ?",
      [userId]
    );

    if (rows.length === 0) {
      res.status(404).json({ message: "用户不存在" });
      return;
    }

    res.json({ code: 200, data: rows[0] });
  } catch (error) {
    res.status(500).json({ message: "获取失败" });
  }
};

// 2. 更新个人资料 (主要用于上传认证材料或修改基本信息)
export const updateProfile = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const userId = req.user.userId;
    const { real_name, auth_material } = req.body;

    // 动态构建 SQL
    let sql = "UPDATE Users SET updated_at = NOW()";
    const params: any[] = [];

    if (real_name) {
      sql += ", real_name = ?";
      params.push(real_name);
    }
    if (auth_material) {
      sql += ", auth_material = ?";
      params.push(auth_material);
      // 如果上传了新材料，通常需要重置为待审核状态 (status=2)
      sql += ", status = 2";
    }

    sql += " WHERE user_id = ?";
    params.push(userId);

    await pool.query(sql, params);
    res.json({ code: 200, message: "更新成功" });
  } catch (error) {
    res.status(500).json({ message: "更新失败" });
  }
};

// 3. 账号注销 (软删除) - 核心需求
export const cancelAccount = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const userId = req.user.userId;

    // 逻辑：软删除保留历史数据，但禁止登录 (Auth控制器已处理禁止登录逻辑)
    // 级联处理：数据库外键约束会自动级联删除收藏 (Favorites)，但保留订单 (Orders)

    await pool.query("UPDATE Users SET deleted_at = NOW() WHERE user_id = ?", [
      userId,
    ]);

    res.json({ code: 200, message: "账号已注销，您将被登出" });
  } catch (error) {
    console.error("注销失败:", error);
    res.status(500).json({ message: "操作失败，请联系管理员" });
  }
};

// 4. 获取用户公开信誉信息（可查看任意用户）
export const getUserCredit = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const userId = req.params.id;

    // 获取用户基本信息和信誉分
    const [users] = await pool.query<RowDataPacket[]>(
      `SELECT user_id, username, credit_score, created_at
       FROM Users
       WHERE user_id = ? AND deleted_at IS NULL`,
      [userId]
    );

    if (users.length === 0) {
      res.status(404).json({ code: 404, message: "用户不存在" });
      return;
    }

    const user = users[0];

    // 获取该用户收到的评价统计
    const [reviewStats] = await pool.query<RowDataPacket[]>(
      `SELECT
         COUNT(*) AS total_reviews,
         IFNULL(AVG(rating), 0) AS avg_rating,
         SUM(CASE WHEN rating >= 4 THEN 1 ELSE 0 END) AS good_reviews,
         SUM(CASE WHEN rating <= 2 THEN 1 ELSE 0 END) AS bad_reviews
       FROM Reviews
       WHERE to_user_id = ? AND is_hidden = 0`,
      [userId]
    );

    // 获取交易统计
    const [tradeStats] = await pool.query<RowDataPacket[]>(
      `SELECT
         (SELECT COUNT(*) FROM Orders WHERE seller_id = ? AND status = 3) AS sold_count,
         (SELECT COUNT(*) FROM Orders WHERE buyer_id = ? AND status = 3) AS bought_count
      `,
      [userId, userId]
    );

    res.json({
      code: 200,
      data: {
        user_id: user.user_id,
        username: user.username,
        credit_score: user.credit_score,
        member_since: user.created_at,
        review_stats: reviewStats[0] || {
          total_reviews: 0,
          avg_rating: 0,
          good_reviews: 0,
          bad_reviews: 0,
        },
        trade_stats: tradeStats[0] || {
          sold_count: 0,
          bought_count: 0,
        },
      },
    });
  } catch (error) {
    console.error("获取用户信誉失败:", error);
    res.status(500).json({ message: "获取失败" });
  }
};
