import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import { requireRole } from "../middleware/roleMiddleware.js";
import { requireWritableInstitution } from "../middleware/institutionStatusMiddleware.js";
import {
  getTeachers,
  createTeacher,
  updateTeacher,
  deleteTeacher,
} from "../controllers/teacher.controller.js";

import Teacher from "../models/Teacher.js";

const router = express.Router();

// Teacher self-lookup — any authenticated user can look up their own teacher profile
router.get("/me", authMiddleware, async (req, res) => {
  try {
    const teacher = await Teacher.findOne({ userId: req.user._id });
    if (!teacher) {
      return res.status(404).json({ message: "Teacher profile not found" });
    }
    res.json(teacher);
  } catch (err) {
    console.error("[Teachers] /me error:", err);
    res.status(500).json({ message: "Failed to fetch teacher profile" });
  }
});

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
  requireWritableInstitution,
  createTeacher
);
router.put(
  "/:id",
  authMiddleware,
  requireRole(["admin", "scheduler"]),
  requireWritableInstitution,
  updateTeacher
);
router.delete(
  "/:id",
  authMiddleware,
  requireRole(["admin", "scheduler"]),
  requireWritableInstitution,
  deleteTeacher
);

export default router;
