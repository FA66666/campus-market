import { Request, Response } from "express";
import pool from "../config/db";
import { RowDataPacket } from "mysql2";
import bcrypt from "bcryptjs";
import { v4 as uuidv4 } from "uuid";

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
    const { action, reject_reason } = req.body; // action: 'approve' | 'reject', reject_reason: 驳回原因

    if (!["approve", "reject"].includes(action)) {
      res.status(400).json({ message: "无效的操作" });
      return;
    }

    // approve -> 1 (上架), reject -> 3 (违规/驳回)
    const newStatus = action === "approve" ? 1 : 3;

    if (action === "reject") {
      // 驳回时更新状态和驳回原因
      await pool.query(
        "UPDATE Items SET status = ?, reject_reason = ? WHERE item_id = ?",
        [newStatus, reject_reason || "审核未通过", itemId]
      );
    } else {
      // 通过时清空驳回原因
      await pool.query(
        "UPDATE Items SET status = ?, reject_reason = NULL WHERE item_id = ?",
        [newStatus, itemId]
      );
    }

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
    const { item_ids, action, reject_reason } = req.body; // item_ids: 数组, action: 'approve' | 'reject', reject_reason: 驳回原因

    if (!item_ids || !Array.isArray(item_ids) || item_ids.length === 0) {
      res.status(400).json({ message: "请选择要操作的商品" });
      return;
    }

    if (!["approve", "reject"].includes(action)) {
      res.status(400).json({ message: "无效的操作" });
      return;
    }

    const newStatus = action === "approve" ? 1 : 3;

    if (action === "reject") {
      await pool.query(
        "UPDATE Items SET status = ?, reject_reason = ? WHERE item_id IN (?)",
        [newStatus, reject_reason || "审核未通过", item_ids]
      );
    } else {
      await pool.query(
        "UPDATE Items SET status = ?, reject_reason = NULL WHERE item_id IN (?)",
        [newStatus, item_ids]
      );
    }

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
        o.order_id, o.total_amount AS total_price, o.status, o.created_at, o.updated_at,
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
        o.order_id, o.buyer_id, o.seller_id, o.total_amount AS total_price,
        o.delivery_snapshot, o.receiver_phone, o.transaction_ref, o.payment_proof,
        o.status, o.created_at, o.updated_at,
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
      `SELECT oi.detail_id, oi.order_id, oi.item_id, oi.quantity, oi.unit_price AS price, i.title, i.main_image
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

// ============================================
// RBAC 管理模块 - 系统管理员管理
// ============================================

/**
 * 获取系统管理员列表
 */
export const getSysUsers = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const sql = `
      SELECT
        u.id, u.username, u.realname, u.org_code, u.status, u.created_at,
        GROUP_CONCAT(DISTINCT r.role_name) AS role_names,
        GROUP_CONCAT(DISTINCT d.depart_name) AS depart_names
      FROM sys_user u
      LEFT JOIN sys_user_role ur ON u.id = ur.user_id
      LEFT JOIN sys_role r ON ur.role_id = r.id
      LEFT JOIN sys_user_depart ud ON u.id = ud.user_id
      LEFT JOIN sys_depart d ON ud.dep_id = d.id
      GROUP BY u.id
      ORDER BY u.created_at DESC
    `;
    const [rows] = await pool.query(sql);
    res.json({ code: 200, data: rows });
  } catch (error) {
    console.error("获取管理员列表失败:", error);
    res.status(500).json({ message: "获取管理员列表失败" });
  }
};

/**
 * 获取单个管理员详情（包含角色和部门ID）
 */
export const getSysUserDetail = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const userId = req.params.id;

    // 获取管理员基本信息
    const [users] = await pool.query<RowDataPacket[]>(
      "SELECT id, username, realname, org_code, status FROM sys_user WHERE id = ?",
      [userId]
    );

    if (users.length === 0) {
      res.status(404).json({ message: "管理员不存在" });
      return;
    }

    // 获取关联的角色ID
    const [roles] = await pool.query<RowDataPacket[]>(
      "SELECT role_id FROM sys_user_role WHERE user_id = ?",
      [userId]
    );

    // 获取关联的部门ID
    const [departs] = await pool.query<RowDataPacket[]>(
      "SELECT dep_id FROM sys_user_depart WHERE user_id = ?",
      [userId]
    );

    res.json({
      code: 200,
      data: {
        ...users[0],
        role_ids: roles.map((r) => r.role_id),
        depart_ids: departs.map((d) => d.dep_id),
      },
    });
  } catch (error) {
    console.error("获取管理员详情失败:", error);
    res.status(500).json({ message: "获取管理员详情失败" });
  }
};

/**
 * 创建系统管理员
 */
export const createSysUser = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { username, password, realname, org_code, role_ids, depart_ids } = req.body;

    if (!username || !password) {
      res.status(400).json({ message: "用户名和密码不能为空" });
      return;
    }

    // 检查用户名是否已存在
    const [existing] = await pool.query<RowDataPacket[]>(
      "SELECT id FROM sys_user WHERE username = ?",
      [username]
    );

    if (existing.length > 0) {
      res.status(400).json({ message: "用户名已存在" });
      return;
    }

    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      // 生成UUID和密码哈希
      const userId = uuidv4().replace(/-/g, "");
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(password, salt);

      // 插入管理员
      await connection.query(
        "INSERT INTO sys_user (id, username, realname, password, salt, org_code, status) VALUES (?, ?, ?, ?, ?, ?, 1)",
        [userId, username, realname || "", passwordHash, salt, org_code || ""]
      );

      // 分配角色
      if (role_ids && role_ids.length > 0) {
        for (const roleId of role_ids) {
          const relId = uuidv4().replace(/-/g, "");
          await connection.query(
            "INSERT INTO sys_user_role (id, user_id, role_id) VALUES (?, ?, ?)",
            [relId, userId, roleId]
          );
        }
      }

      // 分配部门
      if (depart_ids && depart_ids.length > 0) {
        for (const depId of depart_ids) {
          const relId = uuidv4().replace(/-/g, "");
          await connection.query(
            "INSERT INTO sys_user_depart (id, user_id, dep_id) VALUES (?, ?, ?)",
            [relId, userId, depId]
          );
        }
      }

      await connection.commit();
      res.json({ code: 200, message: "管理员创建成功", data: { id: userId } });
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error("创建管理员失败:", error);
    res.status(500).json({ message: "创建管理员失败" });
  }
};

/**
 * 更新系统管理员
 */
export const updateSysUser = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const userId = req.params.id;
    const { realname, org_code, status, password, role_ids, depart_ids } = req.body;

    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      // 更新基本信息
      let updateSql = "UPDATE sys_user SET realname = ?, org_code = ?, status = ?";
      const params: any[] = [realname || "", org_code || "", status ?? 1];

      // 如果提供了新密码，则更新密码
      if (password) {
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);
        updateSql += ", password = ?, salt = ?";
        params.push(passwordHash, salt);
      }

      updateSql += " WHERE id = ?";
      params.push(userId);

      await connection.query(updateSql, params);

      // 更新角色关联（先删后插）
      if (role_ids !== undefined) {
        await connection.query("DELETE FROM sys_user_role WHERE user_id = ?", [userId]);
        if (role_ids && role_ids.length > 0) {
          for (const roleId of role_ids) {
            const relId = uuidv4().replace(/-/g, "");
            await connection.query(
              "INSERT INTO sys_user_role (id, user_id, role_id) VALUES (?, ?, ?)",
              [relId, userId, roleId]
            );
          }
        }
      }

      // 更新部门关联（先删后插）
      if (depart_ids !== undefined) {
        await connection.query("DELETE FROM sys_user_depart WHERE user_id = ?", [userId]);
        if (depart_ids && depart_ids.length > 0) {
          for (const depId of depart_ids) {
            const relId = uuidv4().replace(/-/g, "");
            await connection.query(
              "INSERT INTO sys_user_depart (id, user_id, dep_id) VALUES (?, ?, ?)",
              [relId, userId, depId]
            );
          }
        }
      }

      await connection.commit();
      res.json({ code: 200, message: "管理员更新成功" });
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error("更新管理员失败:", error);
    res.status(500).json({ message: "更新管理员失败" });
  }
};

/**
 * 删除系统管理员
 */
export const deleteSysUser = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const userId = req.params.id;

    // 检查是否是当前登录用户（不能删除自己）
    const currentUserId = (req as any).user?.userId;
    if (userId === currentUserId) {
      res.status(400).json({ message: "不能删除当前登录账号" });
      return;
    }

    // 级联删除会自动删除 sys_user_role 和 sys_user_depart 中的关联记录
    await pool.query("DELETE FROM sys_user WHERE id = ?", [userId]);
    res.json({ code: 200, message: "管理员删除成功" });
  } catch (error) {
    console.error("删除管理员失败:", error);
    res.status(500).json({ message: "删除管理员失败" });
  }
};

// ============================================
// RBAC 管理模块 - 角色管理
// ============================================

/**
 * 获取角色列表
 */
export const getRoles = async (req: Request, res: Response): Promise<void> => {
  try {
    const sql = `
      SELECT r.*, COUNT(ur.user_id) AS user_count
      FROM sys_role r
      LEFT JOIN sys_user_role ur ON r.id = ur.role_id
      GROUP BY r.id
      ORDER BY r.role_code
    `;
    const [rows] = await pool.query(sql);
    res.json({ code: 200, data: rows });
  } catch (error) {
    console.error("获取角色列表失败:", error);
    res.status(500).json({ message: "获取角色列表失败" });
  }
};

/**
 * 创建角色
 */
export const createRole = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { role_name, role_code } = req.body;

    if (!role_name || !role_code) {
      res.status(400).json({ message: "角色名称和编码不能为空" });
      return;
    }

    // 检查编码是否已存在
    const [existing] = await pool.query<RowDataPacket[]>(
      "SELECT id FROM sys_role WHERE role_code = ?",
      [role_code]
    );

    if (existing.length > 0) {
      res.status(400).json({ message: "角色编码已存在" });
      return;
    }

    const roleId = uuidv4().replace(/-/g, "");
    await pool.query(
      "INSERT INTO sys_role (id, role_name, role_code) VALUES (?, ?, ?)",
      [roleId, role_name, role_code]
    );

    res.json({ code: 200, message: "角色创建成功", data: { id: roleId } });
  } catch (error) {
    console.error("创建角色失败:", error);
    res.status(500).json({ message: "创建角色失败" });
  }
};

/**
 * 更新角色
 */
export const updateRole = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const roleId = req.params.id;
    const { role_name, role_code } = req.body;

    if (!role_name || !role_code) {
      res.status(400).json({ message: "角色名称和编码不能为空" });
      return;
    }

    // 检查编码是否与其他角色冲突
    const [existing] = await pool.query<RowDataPacket[]>(
      "SELECT id FROM sys_role WHERE role_code = ? AND id != ?",
      [role_code, roleId]
    );

    if (existing.length > 0) {
      res.status(400).json({ message: "角色编码已被其他角色使用" });
      return;
    }

    await pool.query(
      "UPDATE sys_role SET role_name = ?, role_code = ? WHERE id = ?",
      [role_name, role_code, roleId]
    );

    res.json({ code: 200, message: "角色更新成功" });
  } catch (error) {
    console.error("更新角色失败:", error);
    res.status(500).json({ message: "更新角色失败" });
  }
};

/**
 * 删除角色
 */
export const deleteRole = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const roleId = req.params.id;

    // 检查是否有用户使用此角色
    const [users] = await pool.query<RowDataPacket[]>(
      "SELECT COUNT(*) AS count FROM sys_user_role WHERE role_id = ?",
      [roleId]
    );

    if (users[0].count > 0) {
      res.status(400).json({ message: "该角色已被分配给用户，无法删除" });
      return;
    }

    await pool.query("DELETE FROM sys_role WHERE id = ?", [roleId]);
    res.json({ code: 200, message: "角色删除成功" });
  } catch (error) {
    console.error("删除角色失败:", error);
    res.status(500).json({ message: "删除角色失败" });
  }
};

// ============================================
// RBAC 管理模块 - 部门管理
// ============================================

/**
 * 获取部门列表
 */
export const getDeparts = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const sql = `
      SELECT d.*, COUNT(ud.user_id) AS user_count
      FROM sys_depart d
      LEFT JOIN sys_user_depart ud ON d.id = ud.dep_id
      GROUP BY d.id
      ORDER BY d.org_code
    `;
    const [rows] = await pool.query(sql);
    res.json({ code: 200, data: rows });
  } catch (error) {
    console.error("获取部门列表失败:", error);
    res.status(500).json({ message: "获取部门列表失败" });
  }
};

/**
 * 创建部门
 */
export const createDepart = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { depart_name, org_code } = req.body;

    if (!depart_name || !org_code) {
      res.status(400).json({ message: "部门名称和组织编码不能为空" });
      return;
    }

    // 检查编码是否已存在
    const [existing] = await pool.query<RowDataPacket[]>(
      "SELECT id FROM sys_depart WHERE org_code = ?",
      [org_code]
    );

    if (existing.length > 0) {
      res.status(400).json({ message: "组织编码已存在" });
      return;
    }

    const depId = uuidv4().replace(/-/g, "");
    await pool.query(
      "INSERT INTO sys_depart (id, depart_name, org_code) VALUES (?, ?, ?)",
      [depId, depart_name, org_code]
    );

    res.json({ code: 200, message: "部门创建成功", data: { id: depId } });
  } catch (error) {
    console.error("创建部门失败:", error);
    res.status(500).json({ message: "创建部门失败" });
  }
};

/**
 * 更新部门
 */
export const updateDepart = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const depId = req.params.id;
    const { depart_name, org_code } = req.body;

    if (!depart_name || !org_code) {
      res.status(400).json({ message: "部门名称和组织编码不能为空" });
      return;
    }

    // 检查编码是否与其他部门冲突
    const [existing] = await pool.query<RowDataPacket[]>(
      "SELECT id FROM sys_depart WHERE org_code = ? AND id != ?",
      [org_code, depId]
    );

    if (existing.length > 0) {
      res.status(400).json({ message: "组织编码已被其他部门使用" });
      return;
    }

    await pool.query(
      "UPDATE sys_depart SET depart_name = ?, org_code = ? WHERE id = ?",
      [depart_name, org_code, depId]
    );

    res.json({ code: 200, message: "部门更新成功" });
  } catch (error) {
    console.error("更新部门失败:", error);
    res.status(500).json({ message: "更新部门失败" });
  }
};

/**
 * 删除部门
 */
export const deleteDepart = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const depId = req.params.id;

    // 检查是否有用户属于此部门
    const [users] = await pool.query<RowDataPacket[]>(
      "SELECT COUNT(*) AS count FROM sys_user_depart WHERE dep_id = ?",
      [depId]
    );

    if (users[0].count > 0) {
      res.status(400).json({ message: "该部门下有管理员，无法删除" });
      return;
    }

    await pool.query("DELETE FROM sys_depart WHERE id = ?", [depId]);
    res.json({ code: 200, message: "部门删除成功" });
  } catch (error) {
    console.error("删除部门失败:", error);
    res.status(500).json({ message: "删除部门失败" });
  }
};
