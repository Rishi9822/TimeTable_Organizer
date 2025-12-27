import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import {
  getInstitutionSettings,
  upsertInstitutionSettings,
  setupInstitution,
  joinInstitutionByInvite,
} from "../controllers/institution.controller.js";

const router = express.Router();


router.post("/", authMiddleware, setupInstitution);

router.get("/settings", authMiddleware, getInstitutionSettings);
router.post("/settings", authMiddleware, upsertInstitutionSettings);

router.post("/join", authMiddleware, joinInstitutionByInvite);

export default router;
