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

    const [rows] = await pool.query<RowDataPacket[]>(sql, params);

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
    const userId = (req as any).user.userId;
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

// ✅ 3. 发布新商品 (修复 500 错误核心版 + 类型安全检查)
export const createItem = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    // ✅ 增加安全检查：确保 user 存在
    const sellerId = (req as any).user?.userId;

    if (!sellerId) {
      res.status(401).json({ message: "用户未登录或Token无效" });
      return;
    }

    // 🔍 调试日志
    console.log("Create Item Body:", req.body);

    // ⚠️ 关键修改：显式类型转换
    // FormData 传过来的是字符串，必须转为 Number 才能存入 INT/DECIMAL 字段
    const category_id = Number(req.body.category_id);
    const price = Number(req.body.price);
    const stock_quantity = Number(req.body.stock_quantity);
    const title = req.body.title;
    let description = req.body.description || "";

    // 获取上传的文件
    const files = req.files as Express.Multer.File[];

    // 校验
    if (!category_id || !title || isNaN(price)) {
      res.status(400).json({ message: "标题、分类、价格为必填项且格式需正确" });
      return;
    }
    if (!files || files.length === 0) {
      res.status(400).json({ message: "请至少上传一张商品主图" });
      return;
    }

    // 1. 处理封面图 (第一张)
    // 确保路径以 /uploads 开头
    const mainImage = `/uploads/items/${files[0].filename}`;

    // 2. 处理附图 (追加到描述)
    if (files.length > 1) {
      let extraImagesHtml = "\n\n<br><strong>更多细节图：</strong><br>";
      for (let i = 1; i < files.length; i++) {
        const imgPath = `/uploads/items/${files[i].filename}`;
        extraImagesHtml += `<img src="${imgPath}" style="max-width:100%; margin-top:10px; border-radius:4px;"><br>`;
      }
      description += extraImagesHtml;
    }

    // 3. 插入数据库 (⚠️ 改用 pool.query，兼容性更好)
    const [result]: any = await pool.query(
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
        mainImage,
      ]
    );

    console.log("商品发布成功，ID:", result.insertId);

    res.status(201).json({
      code: 201,
      message: "商品发布成功",
      itemId: result.insertId,
    });
  } catch (error) {
    // 打印完整错误堆栈，方便排查
    console.error("发布商品严重错误:", error);
    res.status(500).json({ message: "发布失败，请检查服务器日志" });
  }
};

// 4. 切换收藏状态
export const toggleCollect = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const userId = (req as any).user.userId;
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

// 6. 更新商品信息
export const updateItem = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const sellerId = (req as any).user.userId;
    const itemId = req.params.id;

    // 同样需要类型转换
    const title = req.body.title;
    const price = Number(req.body.price);
    const stock_quantity = Number(req.body.stock_quantity);
    const description = req.body.description;
    const status = Number(req.body.status);

    let sql =
      "UPDATE Items SET title = ?, price = ?, stock_quantity = ?, description = ?, status = ?";
    const params: any[] = [title, price, stock_quantity, description, status];

    if (req.file) {
      const newImagePath = `/uploads/items/${req.file.filename}`;
      sql += ", main_image = ?";
      params.push(newImagePath);
    }

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
