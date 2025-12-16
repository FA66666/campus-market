// 文件路径: server/src/controllers/itemController.ts
import { Request, Response } from "express";
import pool from "../config/db";
import { RowDataPacket } from "mysql2";

// 1. 获取市场商品列表 (公开)
export const getMarketItems = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { category, keyword } = req.query;

    let sql = "SELECT * FROM v_market_items WHERE 1=1";
    const params: any[] = [];

    if (category) {
      sql += " AND category_id = ?";
      params.push(category);
    }

    if (keyword) {
      sql += " AND title LIKE ?";
      params.push(`%${keyword}%`);
    }

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

// 2. 获取我发布的商品 (卖家中心)
export const getMyItems = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const userId = req.user.userId;
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

// 3. 发布新商品
export const createItem = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const sellerId = req.user.userId;
    const {
      category_id,
      title,
      description,
      price,
      stock_quantity,
      main_image,
    } = req.body;

    if (!category_id || !title || !price || !main_image) {
      res
        .status(400)
        .json({ message: "关键信息（分类、标题、价格、主图）不能为空" });
      return;
    }

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

// 4. 切换收藏状态
export const toggleCollect = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const userId = req.user.userId;
    const itemId = req.params.id;

    const [rows]: any = await pool.query(
      "SELECT * FROM Favorites WHERE user_id = ? AND item_id = ?",
      [userId, itemId]
    );

    if (rows.length > 0) {
      await pool.query(
        "DELETE FROM Favorites WHERE user_id = ? AND item_id = ?",
        [userId, itemId]
      );
      res.json({ code: 200, action: "removed", message: "已取消收藏" });
    } else {
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

// ✅ 6. 更新商品信息 (支持图片上传)
export const updateItem = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const sellerId = req.user.userId;
    const itemId = req.params.id;

    // 如果是 FormData 上传，req.body 中包含文本字段
    const { title, price, stock_quantity, description, status } = req.body;

    // 1. 基础 SQL
    let sql =
      "UPDATE Items SET title = ?, price = ?, stock_quantity = ?, description = ?, status = ?";
    const params: any[] = [title, price, stock_quantity, description, status];

    // 2. 如果有文件上传，追加更新 main_image 字段
    if (req.file) {
      // 这里的路径需要配合 express.static 使用
      const newImagePath = `/uploads/items/${req.file.filename}`;
      sql += ", main_image = ?";
      params.push(newImagePath);
    }

    // 3. 加上 WHERE 条件，确保只能改自己的
    sql += " WHERE item_id = ? AND seller_id = ?";
    params.push(itemId, sellerId);

    const [result]: any = await pool.query(sql, params);

    if (result.affectedRows === 0) {
      res.status(403).json({ message: "操作失败：商品不存在或无权修改" });
      return;
    }

    res.json({ code: 200, message: "商品信息更新成功" });
  } catch (error) {
    console.error("更新商品失败:", error);
    res.status(500).json({ message: "更新失败" });
  }
};
