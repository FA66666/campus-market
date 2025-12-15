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
