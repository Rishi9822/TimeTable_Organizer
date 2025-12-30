import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import { requireRole } from "../middleware/roleMiddleware.js";
import { getAuditLogs } from "../controllers/auditLog.controller.js";

const router = express.Router();

/**
 * GET /api/audit-logs
 * Get audit logs for the user's institution
 * Read-only, paginated, sorted by newest first
 * Accessible only to admin and scheduler
 */
router.get(
  "/",
  authMiddleware,
  requireRole(["admin", "scheduler"]),
  getAuditLogs
);

export default router;





