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

/**
 * 获取订单趋势统计（按日期）
 */
export const getOrderTrend = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { days = 7 } = req.query;
    const dayCount = Math.min(parseInt(days as string) || 7, 30);

    const sql = `
      SELECT
        DATE(created_at) AS date,
        COUNT(*) AS order_count,
        SUM(total_amount) AS total_amount
      FROM Orders
      WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `;

    const [rows] = await pool.query<RowDataPacket[]>(sql, [dayCount]);
    res.json({ code: 200, data: rows });
  } catch (error) {
    console.error("获取订单趋势失败:", error);
    res.status(500).json({ message: "获取失败" });
  }
};

/**
 * 获取分类统计（商品数量和销售额）
 */
export const getCategoryStats = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const sql = `
      SELECT
        c.category_id,
        c.category_name,
        COUNT(DISTINCT i.item_id) AS item_count,
        COALESCE(SUM(CASE WHEN o.status = 3 THEN oi.quantity * oi.unit_price ELSE 0 END), 0) AS sales_amount
      FROM Categories c
      LEFT JOIN Items i ON c.category_id = i.category_id AND i.status = 1
      LEFT JOIN Order_Items oi ON i.item_id = oi.item_id
      LEFT JOIN Orders o ON oi.order_id = o.order_id
      GROUP BY c.category_id, c.category_name
      ORDER BY item_count DESC
    `;

    const [rows] = await pool.query<RowDataPacket[]>(sql);
    res.json({ code: 200, data: rows });
  } catch (error) {
    console.error("获取分类统计失败:", error);
    res.status(500).json({ message: "获取失败" });
  }
};

/**
 * 获取订单状态分布
 */
export const getOrderStatusStats = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const sql = `
      SELECT
        status,
        COUNT(*) AS count
      FROM Orders
      GROUP BY status
      ORDER BY status ASC
    `;

    const [rows] = await pool.query<RowDataPacket[]>(sql);

    // 转换为前端友好的格式
    const statusMap: { [key: number]: string } = {
      0: "待付款",
      1: "待发货",
      2: "待收货",
      3: "已完成",
      4: "已取消",
    };

    const data = (rows as any[]).map((row) => ({
      status: row.status,
      name: statusMap[row.status] || "未知",
      count: row.count,
    }));

    res.json({ code: 200, data });
  } catch (error) {
    console.error("获取订单状态统计失败:", error);
    res.status(500).json({ message: "获取失败" });
  }
};

/**
 * 获取用户信誉分分布
 */
export const getCreditScoreDistribution = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const sql = `
      SELECT
        CASE
          WHEN credit_score >= 90 THEN '优秀(90-100)'
          WHEN credit_score >= 70 THEN '良好(70-89)'
          WHEN credit_score >= 50 THEN '一般(50-69)'
          ELSE '较差(<50)'
        END AS level,
        COUNT(*) AS count
      FROM Users
      WHERE deleted_at IS NULL AND status = 1
      GROUP BY level
      ORDER BY FIELD(level, '优秀(90-100)', '良好(70-89)', '一般(50-69)', '较差(<50)')
    `;

    const [rows] = await pool.query<RowDataPacket[]>(sql);
    res.json({ code: 200, data: rows });
  } catch (error) {
    console.error("获取信誉分分布失败:", error);
    res.status(500).json({ message: "获取失败" });
  }
};

/**
 * 获取近期活跃数据（新增用户、新增商品、新增订单）
 */
export const getRecentActivity = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { days = 7 } = req.query;
    const dayCount = Math.min(parseInt(days as string) || 7, 30);

    // 新增用户
    const [users] = await pool.query<RowDataPacket[]>(
      `SELECT DATE(created_at) AS date, COUNT(*) AS count
       FROM Users
       WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL ? DAY) AND deleted_at IS NULL
       GROUP BY DATE(created_at)
       ORDER BY date ASC`,
      [dayCount]
    );

    // 新增商品
    const [items] = await pool.query<RowDataPacket[]>(
      `SELECT DATE(created_at) AS date, COUNT(*) AS count
       FROM Items
       WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
       GROUP BY DATE(created_at)
       ORDER BY date ASC`,
      [dayCount]
    );

    // 新增订单
    const [orders] = await pool.query<RowDataPacket[]>(
      `SELECT DATE(created_at) AS date, COUNT(*) AS count
       FROM Orders
       WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
       GROUP BY DATE(created_at)
       ORDER BY date ASC`,
      [dayCount]
    );

    res.json({
      code: 200,
      data: {
        users,
        items,
        orders,
      },
    });
  } catch (error) {
    console.error("获取近期活跃数据失败:", error);
    res.status(500).json({ message: "获取失败" });
  }
};

/**
 * 获取待处理事项统计
 */
export const getPendingStats = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    // 待审核商品
    const [pendingItems] = await pool.query<RowDataPacket[]>(
      "SELECT COUNT(*) AS count FROM Items WHERE status = 0"
    );

    // 待处理投诉
    const [pendingComplaints] = await pool.query<RowDataPacket[]>(
      "SELECT COUNT(*) AS count FROM Complaints WHERE status = 0"
    );

    // 待认证用户
    const [pendingAuth] = await pool.query<RowDataPacket[]>(
      "SELECT COUNT(*) AS count FROM Users WHERE status = 2 AND auth_material IS NOT NULL"
    );

    res.json({
      code: 200,
      data: {
        pending_items: (pendingItems as any[])[0]?.count || 0,
        pending_complaints: (pendingComplaints as any[])[0]?.count || 0,
        pending_auth: (pendingAuth as any[])[0]?.count || 0,
      },
    });
  } catch (error) {
    console.error("获取待处理统计失败:", error);
    res.status(500).json({ message: "获取失败" });
  }
};
