import { Router } from "express";
import { register, login } from "../controllers/authController";

const router = Router();

// 定义 POST 路由
router.post("/register", register);
router.post("/login", login);

export default router;
