import { Request, Response } from "express";
import pool from "../config/db";

// 1. 发送消息
export const sendMessage = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const senderId = req.user.userId;
    const { receiver_id, item_id, content } = req.body;

    if (!receiver_id || !content) {
      res.status(400).json({ message: "接收人和内容必填" });
      return;
    }

    await pool.query(
      "INSERT INTO Messages (sender_id, receiver_id, item_id, content) VALUES (?, ?, ?, ?)",
      [senderId, receiver_id, item_id || null, content]
    );

    res.json({ code: 200, message: "发送成功" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "发送失败" });
  }
};

// 2. 获取我的会话列表 (难点 SQL)
// 逻辑：查找我发出的或我收到的消息，按对方ID分组，取最新的一条
export const getConversations = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const userId = req.user.userId;

    // 这是一个经典的“查找最近联系人”的 SQL
    // 我们获取每一个对话方 (counterpart_id) 的最新一条消息时间
    const sql = `
      SELECT 
        u.user_id AS counterpart_id,
        u.username AS counterpart_name,
        u.real_name,
        m.content AS last_message,
        m.created_at,
        m.item_id,
        (SELECT COUNT(*) FROM Messages WHERE sender_id = u.user_id AND receiver_id = ? AND is_read = 0) AS unread_count
      FROM Users u
      JOIN Messages m ON (
        (m.sender_id = ? AND m.receiver_id = u.user_id) 
        OR 
        (m.receiver_id = ? AND m.sender_id = u.user_id)
      )
      WHERE m.message_id IN (
        SELECT MAX(message_id) 
        FROM Messages 
        WHERE sender_id = ? OR receiver_id = ?
        GROUP BY IF(sender_id = ?, receiver_id, sender_id)
      )
      ORDER BY m.created_at DESC
    `;

    // 参数需要填 5 次 userId (为了匹配各种 WHERE 条件)
    const [rows] = await pool.query(sql, [
      userId,
      userId,
      userId,
      userId,
      userId,
      userId,
    ]);

    res.json({ code: 200, data: rows });
  } catch (error) {
    console.error("获取会话失败:", error);
    res.status(500).json({ message: "获取失败" });
  }
};

// 3. 获取特定用户的聊天记录
export const getHistory = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const myId = req.user.userId;
    const targetId = req.params.userId;

    // 查我和他之间的所有往来
    const sql = `
      SELECT * FROM Messages 
      WHERE (sender_id = ? AND receiver_id = ?) 
         OR (sender_id = ? AND receiver_id = ?)
      ORDER BY created_at ASC
    `;

    const [rows] = await pool.query(sql, [myId, targetId, targetId, myId]);

    // 顺便把对方发给我的未读消息标记为已读
    await pool.query(
      "UPDATE Messages SET is_read = 1 WHERE sender_id = ? AND receiver_id = ? AND is_read = 0",
      [targetId, myId]
    );

    res.json({ code: 200, data: rows });
  } catch (error) {
    res.status(500).json({ message: "获取记录失败" });
  }
};
