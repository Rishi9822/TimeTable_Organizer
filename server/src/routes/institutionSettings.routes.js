import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import { requireRole } from "../middleware/roleMiddleware.js";
import {
  getInstitutionSettings,
  upsertInstitutionSettings,
} from "../controllers/institution.controller.js";

const router = express.Router();

// CRITICAL: Only admins can view/modify institution settings
router.get(
  "/",
  authMiddleware,
  requireRole(["admin"]),
  getInstitutionSettings
);
router.post(
  "/",
  authMiddleware,
  requireRole(["admin"]),
  upsertInstitutionSettings
);

export default router;
