import express from "express";
import {
  getInstitutionSettings,
  upsertInstitutionSettings,
} from "../controllers/institution.controller.js";

const router = express.Router();

router.get("/", getInstitutionSettings);
router.post("/", upsertInstitutionSettings);

export default router;
