import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import { requireRole } from "../middleware/roleMiddleware.js";
import LeaveRequest from "../models/LeaveRequest.js";
import Teacher from "../models/Teacher.js";
import Institution from "../models/Institution.js";

const router = express.Router();

/**
 * GET /api/leave-requests/my
 * Teacher's own leave requests
 */
router.get("/my", authMiddleware, async (req, res) => {
  try {
    const requests = await LeaveRequest.find({ userId: req.user._id })
      .sort({ createdAt: -1 })
      .lean();
    res.json(requests);
  } catch (err) {
    console.error("[LeaveRequests] my error:", err);
    res.status(500).json({ message: "Failed to fetch leave requests" });
  }
});

/**
 * GET /api/leave-requests
 * All institution leave requests (admin), mode-aware
 */
router.get("/", authMiddleware, requireRole(["admin"]), async (req, res) => {
  try {
    const institution = await Institution.findById(req.user.institutionId);
    const query = { institutionId: req.user.institutionId };
    if (institution?.plan === "flex" && institution.activeMode) {
      query.$or = [{ modeType: institution.activeMode }, { modeType: null }];
    }

    const requests = await LeaveRequest.find(query)
      .populate("teacherId", "name")
      .populate("reviewedBy", "name")
      .sort({ createdAt: -1 })
      .lean();

    res.json(requests);
  } catch (err) {
    console.error("[LeaveRequests] all error:", err);
    res.status(500).json({ message: "Failed to fetch leave requests" });
  }
});

/**
 * POST /api/leave-requests
 * Create leave request (teacher)
 */
router.post("/", authMiddleware, async (req, res) => {
  try {
    const { startDate, endDate, leaveType, reason } = req.body;
    if (!startDate || !endDate || !reason) {
      return res.status(400).json({ message: "Start date, end date, and reason are required" });
    }

    // Find teacher profile for current user
    const teacher = await Teacher.findOne({ userId: req.user._id });
    if (!teacher) {
      return res.status(404).json({ message: "Teacher profile not found" });
    }

    const institution = await Institution.findById(req.user.institutionId);

    const request = await LeaveRequest.create({
      teacherId: teacher._id,
      userId: req.user._id,
      institutionId: req.user.institutionId,
      leaveType: leaveType || "casual",
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      reason,
      modeType: institution?.activeMode || null,
    });

    res.status(201).json(request);
  } catch (err) {
    console.error("[LeaveRequests] create error:", err);
    res.status(500).json({ message: "Failed to create leave request" });
  }
});

/**
 * PATCH /api/leave-requests/:id/review
 * Approve or reject leave request (admin)
 */
router.patch("/:id/review", authMiddleware, requireRole(["admin"]), async (req, res) => {
  try {
    const { status, reviewNotes } = req.body;
    if (!["approved", "rejected"].includes(status)) {
      return res.status(400).json({ message: "Status must be 'approved' or 'rejected'" });
    }

    const request = await LeaveRequest.findOneAndUpdate(
      { _id: req.params.id, institutionId: req.user.institutionId },
      {
        status,
        reviewNotes: reviewNotes || null,
        reviewedBy: req.user._id,
        reviewedAt: new Date(),
      },
      { new: true }
    ).populate("teacherId", "name");

    if (!request) return res.status(404).json({ message: "Leave request not found" });

    res.json(request);
  } catch (err) {
    console.error("[LeaveRequests] review error:", err);
    res.status(500).json({ message: "Failed to review leave request" });
  }
});

export default router;
