import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import { requireRole } from "../middleware/roleMiddleware.js";
import {
  getInviteCodes,
  createInviteCode,
  deleteInviteCode,
} from "../controllers/inviteCode.controller.js";

const router = express.Router();

/**
 * GET /api/institutions/:institutionId/invite-codes
 * Only admins can view invite codes
 */
router.get(
  "/:institutionId/invite-codes",
  authMiddleware,
  requireRole(["admin"]),
  getInviteCodes
);

/**
 * POST /api/institutions/invite-codes
 * Only admins can create invite codes
 */
router.post(
  "/invite-codes",
  authMiddleware,
  requireRole(["admin"]),
  createInviteCode
);

/**
 * DELETE /api/institutions/invite-codes/:id
 * Only admins can delete invite codes
 * Multi-tenant safety: Admin can only delete codes from their own institution
 */
router.delete(
  "/invite-codes/:id",
  authMiddleware,
  requireRole(["admin"]),
  deleteInviteCode
);

export default router;
