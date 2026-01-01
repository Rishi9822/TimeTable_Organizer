import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import { requireRole } from "../middleware/roleMiddleware.js";
import { requireWritableInstitution, institutionStatusMiddleware } from "../middleware/institutionStatusMiddleware.js";
import {
  getTeachers,
  createTeacher,
  updateTeacher,
  deleteTeacher,
} from "../controllers/teacher.controller.js";

const router = express.Router();

// All teacher routes require authentication and admin/scheduler role
router.get(
  "/",
  authMiddleware,
  requireRole(["admin", "scheduler"]),
  getTeachers
);
router.post(
  "/",
  authMiddleware,
  institutionStatusMiddleware,
  requireRole(["admin", "scheduler"]),
  requireWritableInstitution,
  createTeacher
);

router.put(
  "/:id",
  authMiddleware,
  institutionStatusMiddleware,
  requireRole(["admin", "scheduler"]),
  requireWritableInstitution,
  updateTeacher
);

router.delete(
  "/:id",
  authMiddleware,
  institutionStatusMiddleware,
  requireRole(["admin", "scheduler"]),
  requireWritableInstitution,
  deleteTeacher
);

export default router;
