import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import { requireRole } from "../middleware/roleMiddleware.js";
import { requireWritableInstitution } from "../middleware/institutionStatusMiddleware.js";
import {
  getSubjects,
  createSubject,
  deleteSubject,
} from "../controllers/subject.controller.js";

const router = express.Router();

// All subject routes require authentication and admin/scheduler role
router.get(
  "/",
  authMiddleware,
  requireRole(["admin", "scheduler"]),
  getSubjects
);
router.post(
  "/",
  authMiddleware,
  requireRole(["admin", "scheduler"]),
  requireWritableInstitution,
  createSubject
);
router.delete(
  "/:id",
  authMiddleware,
  requireRole(["admin", "scheduler"]),
  requireWritableInstitution,
  deleteSubject
);

export default router;
