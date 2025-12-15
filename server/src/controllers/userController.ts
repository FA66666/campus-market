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
