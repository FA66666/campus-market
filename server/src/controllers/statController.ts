import { Request, Response } from "express";
import pool from "../config/db";
import { RowDataPacket } from "mysql2";

export const getPlatformStats = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    // 直接查询我们在 view.sql 里定义的视图
    const sql = "SELECT * FROM v_platform_stats";
    const [rows] = await pool.query<RowDataPacket[]>(sql);

    // 视图只有一行数据
    const stats = rows[0] || {
      total_active_users: 0,
      active_items: 0,
      completed_orders: 0,
      total_gmv: 0,
    };

    res.json({
      code: 200,
      data: stats,
    });
  } catch (error) {
    console.error("获取平台数据失败:", error);
    res.status(500).json({ message: "获取失败" });
  }
};
