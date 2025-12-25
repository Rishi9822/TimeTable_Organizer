import express from "express";
import Assignment from "../models/Assignment.js";

import {
  getTeacherSubjects,
  assignTeacherSubject,
  removeTeacherSubject,
  getTeacherClassAssignments,
  assignTeacherClass,
  removeTeacherClassAssignment,
} from "../controllers/assignment.controller.js";

const router = express.Router();

router.get("/classes/:classId/assignments", async (req, res) => {
  try {
    const { classId } = req.params;

    const assignments = await Assignment.find({ classId })
      .populate("teacherId", "name")
      .populate("subjectId", "name code color periods_per_week");

    res.json(assignments);
  } catch (err) {
    console.error("FETCH CLASS ASSIGNMENTS ERROR:", err);
    res.status(500).json({ message: "Failed to fetch class assignments" });
  }
});

// Teacher ↔ Subject
router.get("/teacher-subjects", getTeacherSubjects);
router.post("/teacher-subjects", assignTeacherSubject);
router.delete(
  "/teacher-subjects/:teacherId/:subjectId",
  removeTeacherSubject
);

// Teacher ↔ Class
router.get("/teacher-class-assignments", getTeacherClassAssignments);
router.post("/teacher-class-assignments", assignTeacherClass);
router.delete("/teacher-class-assignments/:id", removeTeacherClassAssignment);

export default router;
