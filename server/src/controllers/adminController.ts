import { Request, Response } from "express";
import pool from "../config/db";

// 获取待审核商品列表
export const getPendingItems = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    // 查询 status = 0 的商品
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
