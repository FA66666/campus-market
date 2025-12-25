// 文件路径: server/src/routes/addressRoutes.ts
import { Router } from "express";
import {
  getAddresses,
  addAddress,
  updateAddress,
  deleteAddress,
  setDefaultAddress,
  getDefaultAddress,
} from "../controllers/addressController";
import { authenticateToken } from "../middlewares/auth";

const router = Router();

// 所有地址接口都需要登录
router.use(authenticateToken);

// 获取用户的所有收货地址
router.get("/", getAddresses);

// 获取默认地址
router.get("/default", getDefaultAddress);

// 添加新的收货地址
router.post("/", addAddress);

// 更新收货地址
router.put("/:id", updateAddress);

// 删除收货地址
router.delete("/:id", deleteAddress);

// 设置默认地址
router.post("/:id/default", setDefaultAddress);

export default router;
