import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import { requireRole } from "../middleware/roleMiddleware.js";
import { requireWritableInstitution } from "../middleware/institutionStatusMiddleware.js";
import Student from "../models/Student.js";
import User from "../models/User.js";
import Institution from "../models/Institution.js";
import crypto from "crypto";
import bcrypt from "bcryptjs";

const router = express.Router();

// Helper: build mode-aware query
function modeQuery(institutionId, institution) {
  const q = { institutionId };
  if (institution?.plan === "flex" && institution.activeMode) {
    q.$or = [{ modeType: institution.activeMode }, { modeType: null }];
  }
  return q;
}

// Helper: generate secure password
function generatePassword(length = 12) {
  const charset = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$";
  const bytes = crypto.randomBytes(length);
  let password = "";
  for (let i = 0; i < length; i++) {
    password += charset[bytes[i] % charset.length];
  }
  return password;
}

/**
 * GET /api/students
 * List students, optional classId filter, mode-aware
 */
router.get("/", authMiddleware, async (req, res) => {
  try {
    const institution = await Institution.findById(req.user.institutionId);
    const query = modeQuery(req.user.institutionId, institution);
    if (req.query.classId) query.classId = req.query.classId;

    const students = await Student.find(query)
      .populate("classId", "name grade section")
      .sort({ rollNumber: 1, name: 1 })
      .lean();

    res.json(students);
  } catch (err) {
    console.error("[Students] fetch error:", err);
    res.status(500).json({ message: "Failed to fetch students" });
  }
});

/**
 * GET /api/students/me
 * Get current user's student profile
 */
router.get("/me", authMiddleware, async (req, res) => {
  try {
    const student = await Student.findOne({ userId: req.user._id })
      .populate("classId", "name grade section")
      .lean();

    if (!student) {
      return res.status(404).json({ message: "Student profile not found" });
    }
    res.json(student);
  } catch (err) {
    console.error("[Students] me error:", err);
    res.status(500).json({ message: "Failed to fetch student profile" });
  }
});

/**
 * POST /api/students
 * Create student (admin only)
 */
router.post("/", authMiddleware, requireRole(["admin"]), requireWritableInstitution, async (req, res) => {
  try {
    const { name, email, phone, rollNumber, classId, modeType } = req.body;
    if (!name) return res.status(400).json({ message: "Name is required" });

    const student = await Student.create({
      name,
      email: email || undefined,
      phone: phone || undefined,
      rollNumber: rollNumber || undefined,
      classId: classId || undefined,
      institutionId: req.user.institutionId,
      modeType: modeType || null,
    });

    res.status(201).json(student);
  } catch (err) {
    console.error("[Students] create error:", err);
    res.status(500).json({ message: "Failed to create student" });
  }
});

/**
 * PUT /api/students/:id
 * Update student (admin only)
 */
router.put("/:id", authMiddleware, requireRole(["admin"]), requireWritableInstitution, async (req, res) => {
  try {
    const student = await Student.findOneAndUpdate(
      { _id: req.params.id, institutionId: req.user.institutionId },
      { $set: req.body },
      { new: true }
    );
    if (!student) return res.status(404).json({ message: "Student not found" });
    res.json(student);
  } catch (err) {
    console.error("[Students] update error:", err);
    res.status(500).json({ message: "Failed to update student" });
  }
});

/**
 * DELETE /api/students/:id
 * Delete student (admin only)
 */
router.delete("/:id", authMiddleware, requireRole(["admin"]), requireWritableInstitution, async (req, res) => {
  try {
    const student = await Student.findOneAndDelete({
      _id: req.params.id,
      institutionId: req.user.institutionId,
    });
    if (!student) return res.status(404).json({ message: "Student not found" });
    res.json({ message: "Student deleted" });
  } catch (err) {
    console.error("[Students] delete error:", err);
    res.status(500).json({ message: "Failed to delete student" });
  }
});

/**
 * POST /api/students/create-account
 * Create student + login account (admin only)
 */
router.post("/create-account", authMiddleware, requireRole(["admin"]), requireWritableInstitution, async (req, res) => {
  try {
    const { name, email, phone, rollNumber, classId, modeType } = req.body;
    if (!name || !email) return res.status(400).json({ message: "Name and email are required" });

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).json({ message: "A user with this email already exists" });

    const password = generatePassword();

    // Create auth user
    const user = await User.create({
      name,
      email,
      password,
      role: "student",
      institutionId: req.user.institutionId,
      emailVerified: true, // admin-created accounts are pre-verified
    });

    // Create student record linked to auth user
    const student = await Student.create({
      name,
      email,
      phone: phone || undefined,
      rollNumber: rollNumber || undefined,
      classId: classId || undefined,
      userId: user._id,
      institutionId: req.user.institutionId,
      modeType: modeType || null,
    });

    res.status(201).json({
      student,
      credentials: { email, password },
    });
  } catch (err) {
    console.error("[Students] create-account error:", err);
    res.status(500).json({ message: "Failed to create student account" });
  }
});

/**
 * POST /api/students/bulk-create-accounts
 * Bulk create students with accounts (admin only)
 */
router.post("/bulk-create-accounts", authMiddleware, requireRole(["admin"]), requireWritableInstitution, async (req, res) => {
  try {
    const { students: studentList, classId, modeType } = req.body;
    if (!Array.isArray(studentList)) return res.status(400).json({ message: "Students array required" });

    const results = [];
    for (const s of studentList) {
      try {
        if (!s.name) {
          results.push({ name: s.name, status: "error", error: "Name is required" });
          continue;
        }

        let credentials = null;
        let userId = null;

        if (s.email) {
          const existingUser = await User.findOne({ email: s.email });
          if (existingUser) {
            results.push({ name: s.name, email: s.email, status: "error", error: "Email already exists" });
            continue;
          }

          const password = generatePassword();
          const user = await User.create({
            name: s.name,
            email: s.email,
            password,
            role: "student",
            institutionId: req.user.institutionId,
            emailVerified: true,
          });
          userId = user._id;
          credentials = { email: s.email, password };
        }

        await Student.create({
          name: s.name,
          email: s.email || undefined,
          phone: s.phone || undefined,
          rollNumber: s.rollNumber || undefined,
          classId: classId || undefined,
          userId,
          institutionId: req.user.institutionId,
          modeType: modeType || null,
        });

        results.push({
          name: s.name,
          email: s.email || null,
          password: credentials?.password || null,
          status: "success",
        });
      } catch (innerErr) {
        results.push({ name: s.name, status: "error", error: innerErr.message });
      }
    }

    res.json({ results });
  } catch (err) {
    console.error("[Students] bulk-create error:", err);
    res.status(500).json({ message: "Failed to bulk create students" });
  }
});

/**
 * POST /api/students/:id/reset-password
 * Reset student password (admin only)
 */
router.post("/:id/reset-password", authMiddleware, requireRole(["admin"]), async (req, res) => {
  try {
    const student = await Student.findOne({
      _id: req.params.id,
      institutionId: req.user.institutionId,
    });
    if (!student || !student.userId) {
      return res.status(404).json({ message: "Student or linked account not found" });
    }

    const password = generatePassword();
    const user = await User.findById(student.userId);
    if (!user) return res.status(404).json({ message: "User account not found" });

    user.password = password;
    await user.save();

    res.json({ password });
  } catch (err) {
    console.error("[Students] reset-password error:", err);
    res.status(500).json({ message: "Failed to reset password" });
  }
});

export default router;
