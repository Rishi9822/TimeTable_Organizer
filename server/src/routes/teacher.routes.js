import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import { requireRole } from "../middleware/roleMiddleware.js";
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
  requireRole(["admin", "scheduler"]),
  createTeacher
);
router.put(
  "/:id",
  authMiddleware,
  requireRole(["admin", "scheduler"]),
  updateTeacher
);
router.delete(
  "/:id",
  authMiddleware,
  requireRole(["admin", "scheduler"]),
  deleteTeacher
);

export default router;
