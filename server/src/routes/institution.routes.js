import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import { institutionStatusMiddleware } from "../middleware/institutionStatusMiddleware.js";
import {
  getInstitutionSettings,
  upsertInstitutionSettings,
  setupInstitution,
  joinInstitutionByInvite,
  getInstitutionInfo,
} from "../controllers/institution.controller.js";

const router = express.Router();


router.post("/", authMiddleware, setupInstitution);

router.get("/info", authMiddleware, institutionStatusMiddleware, getInstitutionInfo);

router.get("/settings", authMiddleware, institutionStatusMiddleware, getInstitutionSettings);
router.post("/settings", authMiddleware, institutionStatusMiddleware, upsertInstitutionSettings);

router.post("/join", authMiddleware, joinInstitutionByInvite);

export default router;
