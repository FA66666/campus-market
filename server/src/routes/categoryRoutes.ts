import { Router } from "express";
import { getCategories } from "../controllers/categoryController";

const router = Router();

// GET /api/categories
// 公开接口，无需登录即可查看分类
router.get("/", getCategories);

export default router;
