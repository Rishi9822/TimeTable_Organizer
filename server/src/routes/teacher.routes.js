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

/**
 * POST /api/teachers/create-account
 * Create teacher + linked login account (admin only)
 * Mirrors POST /api/students/create-account
 */
router.post("/create-account", authMiddleware, requireRole(["admin"]), requireWritableInstitution, async (req, res) => {
  try {
    const { name, email, phone, department, max_periods_per_day, modeType } = req.body;
    if (!name || !email) {
      return res.status(400).json({ message: "Name and email are required" });
    }

    const User = (await import("../models/User.js")).default;
    const Institution = (await import("../models/Institution.js")).default;
    const crypto = (await import("crypto")).default;

    const institutionId = req.user.institutionId?._id || req.user.institutionId;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "A user with this email already exists" });
    }

    // Generate secure password
    const charset = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$";
    const bytes = crypto.randomBytes(12);
    let password = "";
    for (let i = 0; i < 12; i++) {
      password += charset[bytes[i] % charset.length];
    }

    // Create auth user
    const user = await User.create({
      name,
      email,
      password,
      role: "teacher",
      institutionId,
      emailVerified: true,
    });

    // Determine modeType from institution
    const institution = await Institution.findById(institutionId);
    const teacherModeType = (institution?.plan === "flex" && institution.activeMode)
      ? institution.activeMode
      : (modeType || null);

    // Create teacher record linked to auth user
    const teacher = await Teacher.create({
      name,
      email,
      phone: phone || undefined,
      department: department || undefined,
      max_periods_per_day: max_periods_per_day || 6,
      userId: user._id,
      institutionId,
      modeType: teacherModeType,
    });

    res.status(201).json({
      teacher,
      credentials: { email, password },
    });
  } catch (err) {
    console.error("[Teachers] create-account error:", err);
    res.status(500).json({ message: err.message || "Failed to create teacher account" });
  }
});

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

/**
 * POST /api/teachers/:id/reset-password
 * Reset teacher's login password (admin only)
 */
router.post("/:id/reset-password", authMiddleware, requireRole(["admin"]), async (req, res) => {
  try {
    const teacher = await Teacher.findOne({
      _id: req.params.id,
      institutionId: req.user.institutionId,
    });
    if (!teacher || !teacher.userId) {
      return res.status(404).json({ message: "Teacher or linked account not found" });
    }

    const User = (await import("../models/User.js")).default;
    const crypto = (await import("crypto")).default;

    const user = await User.findById(teacher.userId);
    if (!user) return res.status(404).json({ message: "User account not found" });

    // Generate a secure password
    const charset = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$";
    const bytes = crypto.randomBytes(12);
    let password = "";
    for (let i = 0; i < 12; i++) {
      password += charset[bytes[i] % charset.length];
    }

    user.password = password;
    await user.save();

    res.json({ password });
  } catch (err) {
    console.error("[Teachers] reset-password error:", err);
    res.status(500).json({ message: "Failed to reset password" });
  }
});

export default router;
