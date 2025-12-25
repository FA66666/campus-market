import { Request, Response } from "express";
import pool from "../config/db";
import { RowDataPacket } from "mysql2";

// 1. 获取市场商品列表 (公开) - 增强版
export const getMarketItems = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const {
      category,
      keyword,
      minPrice,
      maxPrice,
      sortBy, // price_asc, price_desc, view_count, collect_count, created_at
      hasStock, // 'true' 只看有货
    } = req.query;

    // 使用Items表而不是视图，以便支持更多筛选条件
    let sql = `
      SELECT
        i.item_id, i.seller_id, i.category_id, i.title, i.price,
        i.stock_quantity, i.main_image, i.created_at,
        u.username AS seller_name,
        IFNULL(ist.view_count, 0) AS view_count,
        IFNULL(ist.collect_count, 0) AS collect_count
      FROM Items i
      JOIN Users u ON i.seller_id = u.user_id
      LEFT JOIN Item_Statistics ist ON i.item_id = ist.item_id
      WHERE i.status = 1 AND i.deleted_at IS NULL
    `;
    const params: any[] = [];

    // 分类筛选
    if (category) {
      sql += " AND i.category_id = ?";
      params.push(category);
    }

    // 关键词搜索
    if (keyword) {
      sql += " AND i.title LIKE ?";
      params.push(`%${keyword}%`);
    }

    // 价格区间筛选
    if (minPrice) {
      sql += " AND i.price >= ?";
      params.push(Number(minPrice));
    }
    if (maxPrice) {
      sql += " AND i.price <= ?";
      params.push(Number(maxPrice));
    }

    // 库存筛选
    if (hasStock === "true") {
      sql += " AND i.stock_quantity > 0";
    }

    // 排序
    const sortMap: Record<string, string> = {
      price_asc: "i.price ASC",
      price_desc: "i.price DESC",
      view_count: "view_count DESC",
      collect_count: "collect_count DESC",
      created_at: "i.created_at DESC",
    };

    const sortSQL = sortMap[sortBy as string] || "i.created_at DESC";
    sql += ` ORDER BY ${sortSQL}`;

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

// 3. 发布新商品
export const createItem = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const sellerId = (req as any).user?.userId;

    if (!sellerId) {
      res.status(401).json({ message: "用户未登录或Token无效" });
      return;
    }

    console.log("Create Item Body:", req.body);

    const category_id = Number(req.body.category_id);
    const price = Number(req.body.price);
    const stock_quantity = Number(req.body.stock_quantity);
    const title = req.body.title;
    let description = req.body.description || "";

    const files = req.files as Express.Multer.File[];

    if (!category_id || !title || isNaN(price)) {
      res.status(400).json({ message: "标题、分类、价格为必填项且格式需正确" });
      return;
    }
    if (!files || files.length === 0) {
      res.status(400).json({ message: "请至少上传一张商品主图" });
      return;
    }

    const mainImage = `/uploads/items/${files[0].filename}`;

    if (files.length > 1) {
      let extraImagesHtml = "\n\n<br><strong>更多细节图：</strong><br>";
      for (let i = 1; i < files.length; i++) {
        const imgPath = `/uploads/items/${files[i].filename}`;
        extraImagesHtml += `<img src="${imgPath}" style="max-width:100%; margin-top:10px; border-radius:4px;"><br>`;
      }
      description += extraImagesHtml;
    }

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

// ✅ [新增] 7. 获取单个商品详情
export const getItemDetail = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const itemId = req.params.id;

    // 使用 v_market_items 视图，确保能拿到 seller_name 等信息
    const sql = "SELECT * FROM v_market_items WHERE item_id = ?";
    const [rows]: any = await pool.query(sql, [itemId]);

    if (rows.length === 0) {
      res.status(404).json({ code: 404, message: "商品不存在或已下架" });
      return;
    }

    res.json({
      code: 200,
      data: rows[0],
      message: "获取成功",
    });
  } catch (error) {
    console.error("获取详情失败:", error);
    res.status(500).json({ message: "服务器内部错误" });
  }
};

// ✅ [新增] 8. 批量更新商品状态 (卖家批量操作)
export const batchUpdateItemStatus = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const sellerId = (req as any).user.userId;
    const { item_ids, status } = req.body; // item_ids: 数组, status: 1=上架, 4=下架

    if (!item_ids || !Array.isArray(item_ids) || item_ids.length === 0) {
      res.status(400).json({ code: 400, message: "请选择要操作的商品" });
      return;
    }

    if (![1, 4].includes(Number(status))) {
      res.status(400).json({ code: 400, message: "无效的状态值" });
      return;
    }

    // 只能操作自己的商品
    await pool.query(
      "UPDATE Items SET status = ? WHERE item_id IN (?) AND seller_id = ?",
      [status, item_ids, sellerId]
    );

    res.json({
      code: 200,
      message: status === 1 ? "批量上架成功" : "批量下架成功",
    });
  } catch (error) {
    console.error("批量操作失败:", error);
    res.status(500).json({ code: 500, message: "操作失败" });
  }
};

// 9. 获取用户收藏列表
export const getMyFavorites = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const userId = (req as any).user.userId;

    const sql = `
      SELECT
        i.item_id, i.title, i.price, i.main_image, i.stock_quantity, i.status,
        u.username AS seller_name,
        f.created_at AS collected_at,
        IFNULL(ist.view_count, 0) AS view_count,
        IFNULL(ist.collect_count, 0) AS collect_count
      FROM Favorites f
      JOIN Items i ON f.item_id = i.item_id
      JOIN Users u ON i.seller_id = u.user_id
      LEFT JOIN Item_Statistics ist ON i.item_id = ist.item_id
      WHERE f.user_id = ?
      ORDER BY f.created_at DESC
    `;
    const [rows] = await pool.query<RowDataPacket[]>(sql, [userId]);

    res.json({
      code: 200,
      data: rows,
      message: "获取成功",
    });
  } catch (error) {
    console.error("获取收藏列表失败:", error);
    res.status(500).json({ message: "获取失败" });
  }
};

// 10. 检查是否已收藏某商品
export const checkFavorite = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const userId = (req as any).user.userId;
    const itemId = req.params.id;

    const [rows]: any = await pool.query(
      "SELECT 1 FROM Favorites WHERE user_id = ? AND item_id = ?",
      [userId, itemId]
    );

    res.json({
      code: 200,
      isFavorited: rows.length > 0,
    });
  } catch (error) {
    console.error("检查收藏状态失败:", error);
    res.status(500).json({ message: "检查失败" });
  }
};

