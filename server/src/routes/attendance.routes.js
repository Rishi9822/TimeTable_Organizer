import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import { requireRole } from "../middleware/roleMiddleware.js";
import Attendance from "../models/Attendance.js";
import AttendanceRecord from "../models/AttendanceRecord.js";

const router = express.Router();

/**
 * POST /api/attendance
 * Mark attendance for a class (teacher/admin)
 */
router.post("/", authMiddleware, requireRole(["admin", "teacher"]), async (req, res) => {
  try {
    const { classId, date, period, subjectId, records } = req.body;
    if (!classId || !records?.length) {
      return res.status(400).json({ message: "classId and records are required" });
    }

    // Upsert attendance header
    let attendance = await Attendance.findOneAndUpdate(
      { classId, date: new Date(date), period, institutionId: req.user.institutionId },
      {
        classId,
        date: new Date(date),
        period: period || null,
        subjectId: subjectId || null,
        markedBy: req.user._id,
        institutionId: req.user.institutionId,
      },
      { upsert: true, new: true }
    );

    // Delete old records for this attendance session
    await AttendanceRecord.deleteMany({ attendanceId: attendance._id });

    // Insert new records
    const recordDocs = records.map((r) => ({
      attendanceId: attendance._id,
      studentId: r.student_id || r.studentId,
      status: r.status || "present",
      remarks: r.remarks || null,
    }));

    await AttendanceRecord.insertMany(recordDocs);

    res.json({ message: "Attendance saved", attendanceId: attendance._id });
  } catch (err) {
    console.error("[Attendance] mark error:", err);
    res.status(500).json({ message: "Failed to mark attendance" });
  }
});

/**
 * GET /api/attendance?classId=&date=
 * Get attendance by class and date
 */
router.get("/", authMiddleware, async (req, res) => {
  try {
    const query = { institutionId: req.user.institutionId };
    if (req.query.classId) query.classId = req.query.classId;
    if (req.query.date) query.date = new Date(req.query.date);

    const attendance = await Attendance.find(query)
      .populate("subjectId", "name")
      .sort({ date: -1 })
      .lean();

    // Attach records to each attendance
    for (const att of attendance) {
      att.attendance_records = await AttendanceRecord.find({ attendanceId: att._id })
        .populate("studentId", "name rollNumber")
        .lean();
    }

    res.json(attendance);
  } catch (err) {
    console.error("[Attendance] fetch error:", err);
    res.status(500).json({ message: "Failed to fetch attendance" });
  }
});

/**
 * GET /api/attendance/institution?startDate=&endDate=
 * Admin: get all institution attendance within a date range
 */
router.get("/institution", authMiddleware, requireRole(["admin"]), async (req, res) => {
  try {
    const query = { institutionId: req.user.institutionId };
    if (req.query.startDate || req.query.endDate) {
      query.date = {};
      if (req.query.startDate) query.date.$gte = new Date(req.query.startDate);
      if (req.query.endDate) query.date.$lte = new Date(req.query.endDate);
    }

    const attendance = await Attendance.find(query)
      .populate("classId", "name")
      .populate("subjectId", "name")
      .sort({ date: -1 })
      .lean();

    for (const att of attendance) {
      att.attendance_records = await AttendanceRecord.find({ attendanceId: att._id }).lean();
    }

    res.json(attendance);
  } catch (err) {
    console.error("[Attendance] institution error:", err);
    res.status(500).json({ message: "Failed to fetch institution attendance" });
  }
});

/**
 * GET /api/attendance/student/:studentId
 * Get a student's attendance history
 */
router.get("/student/:studentId", authMiddleware, async (req, res) => {
  try {
    const records = await AttendanceRecord.find({ studentId: req.params.studentId })
      .populate({
        path: "attendanceId",
        populate: [
          { path: "classId", select: "name" },
          { path: "subjectId", select: "name" },
        ],
      })
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();

    res.json(records);
  } catch (err) {
    console.error("[Attendance] student error:", err);
    res.status(500).json({ message: "Failed to fetch student attendance" });
  }
});

export default router;
