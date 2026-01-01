import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import { institutionStatusMiddleware, requireWritableInstitution } from "../middleware/institutionStatusMiddleware.js";
import { requireRole } from "../middleware/roleMiddleware.js";
import {
  getInstitutionSettings,
  upsertInstitutionSettings,
  setupInstitution,
  joinInstitutionByInvite,
  getInstitutionInfo,
  switchInstitutionMode,
} from "../controllers/institution.controller.js";

const router = express.Router();


router.post("/", authMiddleware, setupInstitution);

router.get("/info", authMiddleware, institutionStatusMiddleware, getInstitutionInfo);

router.get("/settings", authMiddleware, institutionStatusMiddleware, getInstitutionSettings);
router.post(
  "/settings",
  authMiddleware,
  institutionStatusMiddleware,
  requireWritableInstitution,
  upsertInstitutionSettings
);

// Flex-only mode switch (admin only)
router.post(
  "/switch-mode",
  authMiddleware,
  institutionStatusMiddleware,
  requireRole(["admin"]),
  requireWritableInstitution,
  switchInstitutionMode
);


router.post("/join", authMiddleware, joinInstitutionByInvite);

export default router;
