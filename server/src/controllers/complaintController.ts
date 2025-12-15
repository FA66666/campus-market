import { Request, Response } from "express";
import pool from "../config/db";

// 提交投诉
export const submitComplaint = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const reporterId = req.user.userId;
    // target_type: 1:用户, 2:商品, 3:订单
    const { target_id, target_type, reason, proof_img } = req.body;

    if (!target_id || !target_type || !reason) {
      res.status(400).json({ message: "投诉信息不完整" });
      return;
    }

    // 插入投诉记录，默认状态 0 (待处理)
    await pool.query(
      `INSERT INTO Complaints (reporter_id, target_id, target_type, reason, proof_img, status)
       VALUES (?, ?, ?, ?, ?, 0)`,
      [reporterId, target_id, target_type, reason, proof_img || null]
    );

    res
      .status(201)
      .json({ code: 200, message: "投诉提交成功，等待管理员处理" });
  } catch (error) {
    console.error("投诉提交失败:", error);
    res.status(500).json({ message: "提交失败" });
  }
};

// 获取我的投诉记录
export const getMyComplaints = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const userId = req.user.userId;
    const sql = `
      SELECT * FROM Complaints 
      WHERE reporter_id = ? 
      ORDER BY created_at DESC
    `;
    const [rows] = await pool.query(sql, [userId]);
    res.json({ code: 200, data: rows });
  } catch (error) {
    res.status(500).json({ message: "获取记录失败" });
  }
};
