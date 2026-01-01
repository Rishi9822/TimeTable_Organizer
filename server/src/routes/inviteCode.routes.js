import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import { requireRole } from "../middleware/roleMiddleware.js";
import { requireWritableInstitution, institutionStatusMiddleware } from "../middleware/institutionStatusMiddleware.js";
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

router.post(
  "/invite-codes",
  authMiddleware,
  institutionStatusMiddleware,
  requireRole(["admin"]),
  requireWritableInstitution,
  createInviteCode
);

router.delete(
  "/invite-codes/:id",
  authMiddleware,
  institutionStatusMiddleware,
  requireRole(["admin"]),
  requireWritableInstitution,
  deleteInviteCode
);

export default router;
