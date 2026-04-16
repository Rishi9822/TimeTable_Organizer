import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import { requireRole } from "../middleware/roleMiddleware.js";
import HomeworkAssignment from "../models/HomeworkAssignment.js";
import AssignmentSubmission from "../models/AssignmentSubmission.js";
import Student from "../models/Student.js";
import Institution from "../models/Institution.js";

const router = express.Router();

/**
 * GET /api/homework?classId=
 * Assignments by class
 */
router.get("/", authMiddleware, async (req, res) => {
  try {
    const query = { institutionId: req.user.institutionId, status: "active" };
    if (req.query.classId) query.classId = req.query.classId;

    const assignments = await HomeworkAssignment.find(query)
      .populate("classId", "name")
      .populate("subjectId", "name code color")
      .populate("teacherId", "name")
      .sort({ dueDate: 1 })
      .lean();

    res.json(assignments);
  } catch (err) {
    console.error("[Homework] fetch error:", err);
    res.status(500).json({ message: "Failed to fetch assignments" });
  }
});

/**
 * GET /api/homework/teacher/:teacherId
 * Assignments by teacher
 */
router.get("/teacher/:teacherId", authMiddleware, async (req, res) => {
  try {
    const assignments = await HomeworkAssignment.find({
      teacherId: req.params.teacherId,
      institutionId: req.user.institutionId,
      status: "active",
    })
      .populate("classId", "name")
      .populate("subjectId", "name code color")
      .sort({ dueDate: 1 })
      .lean();

    res.json(assignments);
  } catch (err) {
    console.error("[Homework] teacher fetch error:", err);
    res.status(500).json({ message: "Failed to fetch teacher assignments" });
  }
});

/**
 * POST /api/homework
 * Create assignment (teacher/admin)
 */
router.post("/", authMiddleware, requireRole(["admin", "teacher"]), async (req, res) => {
  try {
    const { classId, subjectId, teacherId, title, description, dueDate, maxMarks } = req.body;
    if (!classId || !subjectId || !teacherId || !title || !dueDate) {
      return res.status(400).json({ message: "Required fields missing" });
    }

    const institution = await Institution.findById(req.user.institutionId);

    const assignment = await HomeworkAssignment.create({
      institutionId: req.user.institutionId,
      classId,
      subjectId,
      teacherId,
      title,
      description: description || null,
      dueDate: new Date(dueDate),
      maxMarks: maxMarks || null,
      modeType: institution?.activeMode || null,
      createdBy: req.user._id,
    });

    const populated = await HomeworkAssignment.findById(assignment._id)
      .populate("classId", "name")
      .populate("subjectId", "name code color")
      .populate("teacherId", "name");

    res.status(201).json(populated);
  } catch (err) {
    console.error("[Homework] create error:", err);
    res.status(500).json({ message: "Failed to create assignment" });
  }
});

/**
 * DELETE /api/homework/:id
 * Soft delete assignment (archive)
 */
router.delete("/:id", authMiddleware, requireRole(["admin", "teacher"]), async (req, res) => {
  try {
    const assignment = await HomeworkAssignment.findOneAndUpdate(
      { _id: req.params.id, institutionId: req.user.institutionId },
      { status: "archived" },
      { new: true }
    );
    if (!assignment) return res.status(404).json({ message: "Assignment not found" });
    res.json({ message: "Assignment archived" });
  } catch (err) {
    console.error("[Homework] delete error:", err);
    res.status(500).json({ message: "Failed to delete assignment" });
  }
});

/**
 * GET /api/homework/:id/submissions
 * Get all submissions for an assignment (teacher view)
 */
router.get("/:id/submissions", authMiddleware, async (req, res) => {
  try {
    const submissions = await AssignmentSubmission.find({ assignmentId: req.params.id })
      .populate("studentId", "name rollNumber email")
      .sort({ submittedAt: -1 })
      .lean();

    res.json(submissions);
  } catch (err) {
    console.error("[Homework] submissions error:", err);
    res.status(500).json({ message: "Failed to fetch submissions" });
  }
});

/**
 * POST /api/homework/:id/submit
 * Submit assignment (student) — upsert allows resubmission
 */
router.post("/:id/submit", authMiddleware, async (req, res) => {
  try {
    const { studentId, remarks } = req.body;
    if (!studentId) return res.status(400).json({ message: "studentId is required" });

    const submission = await AssignmentSubmission.findOneAndUpdate(
      { assignmentId: req.params.id, studentId },
      {
        assignmentId: req.params.id,
        studentId,
        submittedAt: new Date(),
        remarks: remarks || null,
        status: "submitted",
      },
      { upsert: true, new: true }
    );

    res.json(submission);
  } catch (err) {
    console.error("[Homework] submit error:", err);
    res.status(500).json({ message: "Failed to submit assignment" });
  }
});

/**
 * PATCH /api/homework/submissions/:id/grade
 * Grade a submission (teacher)
 */
router.patch("/submissions/:id/grade", authMiddleware, requireRole(["admin", "teacher"]), async (req, res) => {
  try {
    const { grade } = req.body;
    if (grade === undefined || grade === null) {
      return res.status(400).json({ message: "Grade is required" });
    }

    const submission = await AssignmentSubmission.findByIdAndUpdate(
      req.params.id,
      {
        grade,
        gradedAt: new Date(),
        gradedBy: req.user._id,
        status: "graded",
      },
      { new: true }
    );

    if (!submission) return res.status(404).json({ message: "Submission not found" });
    res.json(submission);
  } catch (err) {
    console.error("[Homework] grade error:", err);
    res.status(500).json({ message: "Failed to grade submission" });
  }
});

/**
 * GET /api/homework/my-submissions?studentId=
 * Student's own submissions
 */
router.get("/my-submissions", authMiddleware, async (req, res) => {
  try {
    const { studentId } = req.query;
    if (!studentId) return res.status(400).json({ message: "studentId query param required" });

    const submissions = await AssignmentSubmission.find({ studentId })
      .populate("assignmentId", "title dueDate maxMarks")
      .sort({ submittedAt: -1 })
      .lean();

    res.json(submissions);
  } catch (err) {
    console.error("[Homework] my-submissions error:", err);
    res.status(500).json({ message: "Failed to fetch submissions" });
  }
});

export default router;
