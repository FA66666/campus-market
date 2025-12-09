import { Router } from "express";
import { getPendingItems, auditItem } from "../controllers/adminController";
import { authenticateToken } from "../middlewares/auth";

const router = Router();

// GET /api/admin/items/pending
router.get("/items/pending", authenticateToken, getPendingItems);

// POST /api/admin/items/:id/audit
router.post("/items/:id/audit", authenticateToken, auditItem);

export default router;
