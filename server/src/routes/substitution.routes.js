import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import { requireRole } from "../middleware/roleMiddleware.js";
import Substitution from "../models/Substitution.js";

const router = express.Router();

/**
 * GET /api/substitutions
 * List substitutions, optional date range filter
 */
router.get("/", authMiddleware, async (req, res) => {
  try {
    const query = { institutionId: req.user.institutionId };
    if (req.query.startDate || req.query.endDate) {
      query.date = {};
      if (req.query.startDate) query.date.$gte = new Date(req.query.startDate);
      if (req.query.endDate) query.date.$lte = new Date(req.query.endDate);
    }

    const substitutions = await Substitution.find(query)
      .populate("originalTeacherId", "name")
      .populate("substituteTeacherId", "name")
      .populate("classId", "name")
      .populate("subjectId", "name")
      .sort({ date: 1 })
      .lean();

    res.json(substitutions);
  } catch (err) {
    console.error("[Substitutions] fetch error:", err);
    res.status(500).json({ message: "Failed to fetch substitutions" });
  }
});

/**
 * POST /api/substitutions
 * Create substitution (admin)
 */
router.post("/", authMiddleware, requireRole(["admin"]), async (req, res) => {
  try {
    const {
      originalTeacherId, substituteTeacherId, classId, subjectId,
      date, periodNumber, leaveRequestId, notes
    } = req.body;

    if (!originalTeacherId || !substituteTeacherId || !classId || !subjectId || !date) {
      return res.status(400).json({ message: "All required fields must be provided" });
    }

    const substitution = await Substitution.create({
      institutionId: req.user.institutionId,
      leaveRequestId: leaveRequestId || null,
      originalTeacherId,
      substituteTeacherId,
      classId,
      subjectId,
      date: new Date(date),
      periodNumber: periodNumber || 1,
      notes: notes || null,
      createdBy: req.user._id,
    });

    res.status(201).json(substitution);
  } catch (err) {
    console.error("[Substitutions] create error:", err);
    res.status(500).json({ message: "Failed to create substitution" });
  }
});

export default router;
