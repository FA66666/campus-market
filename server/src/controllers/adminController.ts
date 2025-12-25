import { Request, Response } from "express";
import pool from "../config/db";
import { RowDataPacket } from "mysql2";

// --- 商品审核模块 (原有) ---

// 获取待审核商品列表
export const getPendingItems = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const sql = `
      SELECT i.*, u.username AS seller_name 
      FROM Items i
      JOIN Users u ON i.seller_id = u.user_id
      WHERE i.status = 0
      ORDER BY i.created_at ASC
    `;
    const [rows] = await pool.query(sql);
    res.json({ code: 200, data: rows });
  } catch (error) {
    res.status(500).json({ message: "获取失败" });
  }
};

// 审核商品 (通过/驳回)
export const auditItem = async (req: Request, res: Response): Promise<void> => {
  try {
    const itemId = req.params.id;
    const { action } = req.body; // action: 'approve' | 'reject'

    if (!["approve", "reject"].includes(action)) {
      res.status(400).json({ message: "无效的操作" });
      return;
    }

    // approve -> 1 (上架), reject -> 3 (违规/驳回)
    const newStatus = action === "approve" ? 1 : 3;

    await pool.query("UPDATE Items SET status = ? WHERE item_id = ?", [
      newStatus,
      itemId,
    ]);

    res.json({ code: 200, message: "审核操作成功" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "操作失败" });
  }
};

// ✅ [新增] 批量审核商品
export const batchAuditItems = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { item_ids, action } = req.body; // item_ids: 数组, action: 'approve' | 'reject'

    if (!item_ids || !Array.isArray(item_ids) || item_ids.length === 0) {
      res.status(400).json({ message: "请选择要操作的商品" });
      return;
    }

    if (!["approve", "reject"].includes(action)) {
      res.status(400).json({ message: "无效的操作" });
      return;
    }

    const newStatus = action === "approve" ? 1 : 3;

    await pool.query("UPDATE Items SET status = ? WHERE item_id IN (?)", [
      newStatus,
      item_ids,
    ]);

    res.json({ code: 200, message: "批量审核成功" });
  } catch (error) {
    console.error("批量审核失败:", error);
    res.status(500).json({ message: "操作失败" });
  }
};

// --- 用户管理模块 (新增) ---

// 获取用户列表 (支持搜索)
export const getUsers = async (req: Request, res: Response): Promise<void> => {
  try {
    const { keyword } = req.query;
    let sql = `
      SELECT user_id, username, student_id, real_name, credit_score, status, created_at 
      FROM Users 
      WHERE deleted_at IS NULL
    `;
    const params: any[] = [];

    if (keyword) {
      sql += " AND (username LIKE ? OR real_name LIKE ? OR student_id LIKE ?)";
      params.push(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`);
    }

    sql += " ORDER BY created_at DESC";

    const [rows] = await pool.query(sql, params);
    res.json({ code: 200, data: rows });
  } catch (error) {
    console.error("获取用户列表失败:", error);
    res.status(500).json({ message: "服务器内部错误" });
  }
};

// 管理用户状态 (封禁/解封)
export const manageUser = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const userId = req.params.id;
    const { action } = req.body; // 'ban' | 'unban'

    if (!["ban", "unban"].includes(action)) {
      res.status(400).json({ message: "无效的操作类型" });
      return;
    }

    // 0:封禁, 1:正常
    const newStatus = action === "ban" ? 0 : 1;

    await pool.query("UPDATE Users SET status = ? WHERE user_id = ?", [
      newStatus,
      userId,
    ]);

    res.json({ code: 200, message: "用户状态更新成功" });
  } catch (error) {
    res.status(500).json({ message: "操作失败" });
  }
};

// --- 投诉处理模块 (新增) ---

// 获取投诉列表
export const getComplaints = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    //status: 0:待处理, 1:驳回, 2:已处理
    const sql = `
      SELECT c.*, u.username AS reporter_name
      FROM Complaints c
      JOIN Users u ON c.reporter_id = u.user_id
      ORDER BY c.status ASC, c.created_at DESC
    `;
    const [rows] = await pool.query(sql);
    res.json({ code: 200, data: rows });
  } catch (error) {
    res.status(500).json({ message: "获取投诉失败" });
  }
};

// 处理投诉 (回复 + 可选扣分)
export const resolveComplaint = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const complaintId = req.params.id;
    // result: 'resolved' | 'rejected'
    // deduct_points: 扣除信誉分数值 (仅当 resolved 时有效)
    const { result, reply, deduct_points } = req.body;

    if (!["resolved", "rejected"].includes(result)) {
      res.status(400).json({ message: "处理结果无效" });
      return;
    }

    const newStatus = result === "resolved" ? 2 : 1;

    // 开启事务
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      // 1. 更新投诉表
      await connection.query(
        "UPDATE Complaints SET status = ?, admin_reply = ?, updated_at = NOW() WHERE complaint_id = ?",
        [newStatus, reply || "", complaintId]
      );

      // 2. 如果是“已处理”且需要扣分，则扣除被投诉人的信誉分
      if (newStatus === 2 && deduct_points && Number(deduct_points) > 0) {
        // 先查询被投诉人 ID
        const [rows]: any = await connection.query(
          "SELECT target_id, target_type FROM Complaints WHERE complaint_id = ?",
          [complaintId]
        );

        if (rows.length > 0) {
          const { target_id, target_type } = rows[0];
          let userIdToPunish = 0;

          // 根据 target_type 找到对应的 UserID
          if (target_type === 1) {
            // 投诉用户
            userIdToPunish = target_id;
          } else if (target_type === 2) {
            // 投诉商品
            const [items]: any = await connection.query(
              "SELECT seller_id FROM Items WHERE item_id = ?",
              [target_id]
            );
            if (items.length > 0) userIdToPunish = items[0].seller_id;
          } else if (target_type === 3) {
            // 投诉订单
            const [orders]: any = await connection.query(
              "SELECT seller_id FROM Orders WHERE order_id = ?",
              [target_id]
            );
            if (orders.length > 0) userIdToPunish = orders[0].seller_id;
          }

          if (userIdToPunish > 0) {
            // 执行扣分，使用 GREATEST 防止负分 (虽然表有约束，但业务层处理更安全)
            await connection.query(
              "UPDATE Users SET credit_score = GREATEST(credit_score - ?, 0) WHERE user_id = ?",
              [deduct_points, userIdToPunish]
            );
          }
        }
      }

      await connection.commit();
      res.json({ code: 200, message: "投诉处理完成" });
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error("处理投诉失败:", error);
    res.status(500).json({ message: "处理失败" });
  }
};

// --- 用户认证审核模块 (新增) ---

/**
 * 获取待认证用户列表
 */
export const getPendingAuthUsers = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const sql = `
      SELECT user_id, username, student_id, real_name, auth_material, status, created_at
      FROM Users
      WHERE status = 2 AND deleted_at IS NULL AND auth_material IS NOT NULL
      ORDER BY created_at ASC
    `;
    const [rows] = await pool.query(sql);
    res.json({ code: 200, data: rows });
  } catch (error) {
    console.error("获取待认证用户失败:", error);
    res.status(500).json({ message: "获取失败" });
  }
};

/**
 * 审核用户认证
 */
export const verifyUser = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const userId = req.params.id;
    const { action, reason } = req.body; // action: 'approve' | 'reject', reason: 驳回理由

    if (!["approve", "reject"].includes(action)) {
      res.status(400).json({ message: "无效的操作" });
      return;
    }

    // approve -> 1 (正常), reject -> 3 (认证驳回)
    const newStatus = action === "approve" ? 1 : 3;

    // 如果是驳回，可以记录驳回理由（这里简化处理，可以扩展一个rejection_reason字段）
    await pool.query("UPDATE Users SET status = ? WHERE user_id = ?", [
      newStatus,
      userId,
    ]);

    res.json({
      code: 200,
      message: action === "approve" ? "认证通过" : "已驳回认证",
    });
  } catch (error) {
    console.error("审核认证失败:", error);
    res.status(500).json({ message: "操作失败" });
  }
};

// --- 评价管理模块 (新增) ---

/**
 * 获取所有评价列表（管理员）
 */
export const getReviews = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { keyword, status } = req.query;
    let sql = `
      SELECT
        r.review_id, r.order_id, r.rating, r.content, r.is_hidden, r.created_at,
        u1.username AS reviewer_name, u1.user_id AS reviewer_id,
        u2.username AS reviewed_name, u2.user_id AS reviewed_id
      FROM Reviews r
      JOIN Users u1 ON r.user_id = u1.user_id
      JOIN Users u2 ON r.to_user_id = u2.user_id
      WHERE 1=1
    `;
    const params: any[] = [];

    // 按状态筛选 (0: 正常, 1: 已屏蔽)
    if (status !== undefined && status !== "") {
      sql += " AND r.is_hidden = ?";
      params.push(status);
    }

    // 按关键词搜索（评价内容或用户名）
    if (keyword) {
      sql += " AND (r.content LIKE ? OR u1.username LIKE ? OR u2.username LIKE ?)";
      params.push(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`);
    }

    sql += " ORDER BY r.created_at DESC";

    const [rows] = await pool.query(sql, params);
    res.json({ code: 200, data: rows });
  } catch (error) {
    console.error("获取评价列表失败:", error);
    res.status(500).json({ message: "获取评价列表失败" });
  }
};

/**
 * 隐藏/显示评价（管理员删除恶意评价）
 */
export const toggleReviewVisibility = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const reviewId = req.params.id;
    const { action } = req.body; // action: 'hide' | 'show'

    if (!["hide", "show"].includes(action)) {
      res.status(400).json({ message: "无效的操作类型" });
      return;
    }

    // hide -> 1 (屏蔽), show -> 0 (正常)
    const newStatus = action === "hide" ? 1 : 0;

    await pool.query("UPDATE Reviews SET is_hidden = ? WHERE review_id = ?", [
      newStatus,
      reviewId,
    ]);

    res.json({
      code: 200,
      message: action === "hide" ? "评价已屏蔽" : "评价已恢复显示",
    });
  } catch (error) {
    console.error("操作评价失败:", error);
    res.status(500).json({ message: "操作失败" });
  }
};

// --- 订单管理模块 (新增) ---

/**
 * 获取所有订单列表（管理员）
 */
export const getOrders = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { status, keyword, start_date, end_date } = req.query;
    let sql = `
      SELECT
        o.order_id, o.total_price, o.status, o.created_at, o.updated_at,
        buyer.username AS buyer_name, buyer.user_id AS buyer_id,
        seller.username AS seller_name, seller.user_id AS seller_id
      FROM Orders o
      JOIN Users buyer ON o.buyer_id = buyer.user_id
      JOIN Users seller ON o.seller_id = seller.user_id
      WHERE 1=1
    `;
    const params: any[] = [];

    // 按订单状态筛选
    if (status !== undefined && status !== "") {
      sql += " AND o.status = ?";
      params.push(status);
    }

    // 按关键词搜索（订单ID或用户名）
    if (keyword) {
      sql += " AND (o.order_id = ? OR buyer.username LIKE ? OR seller.username LIKE ?)";
      const orderId = parseInt(keyword as string) || 0;
      params.push(orderId, `%${keyword}%`, `%${keyword}%`);
    }

    // 按日期范围筛选
    if (start_date) {
      sql += " AND o.created_at >= ?";
      params.push(start_date);
    }
    if (end_date) {
      sql += " AND o.created_at <= ?";
      params.push(end_date + " 23:59:59");
    }

    sql += " ORDER BY o.created_at DESC LIMIT 500";

    const [rows] = await pool.query(sql, params);
    res.json({ code: 200, data: rows });
  } catch (error) {
    console.error("获取订单列表失败:", error);
    res.status(500).json({ message: "获取订单列表失败" });
  }
};

/**
 * 获取订单详情（管理员）
 */
export const getOrderDetail = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const orderId = req.params.id;

    // 获取订单基本信息
    const [orders] = await pool.query<RowDataPacket[]>(
      `SELECT
        o.*,
        buyer.username AS buyer_name, buyer.real_name AS buyer_real_name,
        seller.username AS seller_name, seller.real_name AS seller_real_name
      FROM Orders o
      JOIN Users buyer ON o.buyer_id = buyer.user_id
      JOIN Users seller ON o.seller_id = seller.user_id
      WHERE o.order_id = ?`,
      [orderId]
    );

    if (orders.length === 0) {
      res.status(404).json({ message: "订单不存在" });
      return;
    }

    // 获取订单商品
    const [items] = await pool.query<RowDataPacket[]>(
      `SELECT oi.*, i.title, i.cover_img
       FROM Order_Items oi
       JOIN Items i ON oi.item_id = i.item_id
       WHERE oi.order_id = ?`,
      [orderId]
    );

    // 获取订单评价
    const [reviews] = await pool.query<RowDataPacket[]>(
      `SELECT r.*, u.username AS reviewer_name
       FROM Reviews r
       JOIN Users u ON r.user_id = u.user_id
       WHERE r.order_id = ?`,
      [orderId]
    );

    res.json({
      code: 200,
      data: {
        order: orders[0],
        items,
        reviews,
      },
    });
  } catch (error) {
    console.error("获取订单详情失败:", error);
    res.status(500).json({ message: "获取订单详情失败" });
  }
};
