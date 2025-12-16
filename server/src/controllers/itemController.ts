// 文件路径: server/src/controllers/itemController.ts
import { Request, Response } from "express";
import pool from "../config/db";
import { RowDataPacket } from "mysql2";

export const getMarketItems = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    // 1. 获取前端传来的参数
    const { category, keyword } = req.query;

    // 2. 基础 SQL
    let sql = "SELECT * FROM v_market_items WHERE 1=1";
    const params: any[] = [];

    // 3. 动态拼接条件
    if (category) {
      sql += " AND category_id = ?";
      params.push(category);
    }

    if (keyword) {
      // 模糊查询标题
      sql += " AND title LIKE ?";
      params.push(`%${keyword}%`);
    }

    // 4. 按时间倒序
    sql += " ORDER BY created_at DESC";

    const [rows] = await pool.execute<RowDataPacket[]>(sql, params);

    res.json({
      code: 200,
      data: rows,
      message: "获取成功",
    });
  } catch (error) {
    console.error("获取商品列表失败:", error);
    res.status(500).json({ message: "服务器内部错误" });
  }
};

// 新增：获取我发布的商品
export const getMyItems = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const userId = req.user.userId;
    // 查询该用户发布的所有商品
    const sql =
      "SELECT * FROM Items WHERE seller_id = ? ORDER BY created_at DESC";
    const [rows] = await pool.query(sql, [userId]);

    res.json({
      code: 200,
      data: rows,
      message: "获取成功",
    });
  } catch (error) {
    console.error("获取我的商品失败:", error);
    res.status(500).json({ message: "获取失败" });
  }
};

export const createItem = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    // 1. 从中间件获取当前登录用户的 ID
    const sellerId = req.user.userId;

    // 2. 获取前端提交的表单数据
    const {
      category_id,
      title,
      description,
      price,
      stock_quantity,
      main_image,
    } = req.body;

    // 3. 简单校验
    if (!category_id || !title || !price || !main_image) {
      res
        .status(400)
        .json({ message: "关键信息（分类、标题、价格、主图）不能为空" });
      return;
    }

    // 4. 插入数据库 (status 0: 初始/上架状态)
    const [result] = await pool.execute<any>(
      `INSERT INTO Items 
      (seller_id, category_id, title, description, price, stock_quantity, status, main_image) 
      VALUES (?, ?, ?, ?, ?, ?, 0, ?)`,
      [
        sellerId,
        category_id,
        title,
        description,
        price,
        stock_quantity || 1,
        main_image,
      ]
    );

    res.status(201).json({
      code: 201,
      message: "商品发布成功",
      itemId: result.insertId,
    });
  } catch (error) {
    console.error("发布商品失败:", error);
    res.status(500).json({ message: "发布失败，请检查输入" });
  }
};

// 4. 切换收藏状态 (收藏/取消)
export const toggleCollect = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const userId = req.user.userId;
    const itemId = req.params.id;

    // 检查是否已收藏
    const [rows]: any = await pool.query(
      "SELECT * FROM Favorites WHERE user_id = ? AND item_id = ?",
      [userId, itemId]
    );

    if (rows.length > 0) {
      // 已收藏 -> 取消收藏
      await pool.query(
        "DELETE FROM Favorites WHERE user_id = ? AND item_id = ?",
        [userId, itemId]
      );
      res.json({ code: 200, action: "removed", message: "已取消收藏" });
    } else {
      // 未收藏 -> 添加收藏
      await pool.query(
        "INSERT INTO Favorites (user_id, item_id) VALUES (?, ?)",
        [userId, itemId]
      );
      res.json({ code: 200, action: "added", message: "收藏成功" });
    }
  } catch (error) {
    console.error("收藏操作失败:", error);
    res.status(500).json({ message: "操作失败" });
  }
};

// 5. 增加浏览量
export const incrementView = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const itemId = req.params.id;
    const sql = `
      INSERT INTO Item_Statistics (item_id, view_count) VALUES (?, 1)
      ON DUPLICATE KEY UPDATE view_count = view_count + 1
    `;
    await pool.query(sql, [itemId]);
    res.json({ code: 200, message: "View counted" });
  } catch (error) {
    console.error("浏览计数失败:", error);
    res.status(200).json({ message: "ok" });
  }
};
