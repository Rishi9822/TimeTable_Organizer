import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import { requireRole } from "../middleware/roleMiddleware.js";
import { requireWritableInstitution } from "../middleware/institutionStatusMiddleware.js";
import Assignment from "../models/Assignment.js";
import Class from "../models/Class.js";
import Institution from "../models/Institution.js";

import {
  getTeacherSubjects,
  assignTeacherSubject,
  removeTeacherSubject,
  getTeacherClassAssignments,
  assignTeacherClass,
  removeTeacherClassAssignment,
} from "../controllers/assignment.controller.js";

const router = express.Router();

// All assignment routes require authentication and admin/scheduler role
router.get(
  "/classes/:classId/assignments",
  authMiddleware,
  requireRole(["admin", "scheduler"]),
  async (req, res) => {
    try {
      const { classId } = req.params;
      if (!req.user.institutionId) {
        return res.status(403).json({
          message: "You must be part of an institution to access assignments",
        });
      }
      const institution = await Institution.findById(req.user.institutionId);
      const classQuery = { _id: classId, institutionId: req.user.institutionId };
      if (institution?.plan === "flex" && institution.activeMode) {
        classQuery.modeType = institution.activeMode;
      }
      const classEntity = await Class.findOne(classQuery);
      if (!classEntity) {
        return res.status(404).json({ message: "Class not found" });
      }
      const assignQuery = { classId, institutionId: req.user.institutionId };
      if (institution?.plan === "flex" && institution.activeMode) {
        assignQuery.modeType = institution.activeMode;
      }
      const assignments = await Assignment.find(assignQuery)
        .populate("teacherId", "name")
        .populate("subjectId", "name code color periods_per_week");
      res.json(assignments);
    } catch (err) {
      console.error("FETCH CLASS ASSIGNMENTS ERROR:", err);
      res.status(500).json({ message: "Failed to fetch class assignments" });
    }
  }
);

// Teacher ↔ Subject
router.get(
  "/teacher-subjects",
  authMiddleware,
  requireRole(["admin", "scheduler"]),
  getTeacherSubjects
);
router.post(
  "/teacher-subjects",
  authMiddleware,
  requireRole(["admin", "scheduler"]),
  requireWritableInstitution,
  assignTeacherSubject
);
router.delete(
  "/teacher-subjects/:teacherId/:subjectId",
  authMiddleware,
  requireRole(["admin", "scheduler"]),
  requireWritableInstitution,
  removeTeacherSubject
);

// Teacher ↔ Class
router.get(
  "/teacher-class-assignments",
  authMiddleware,
  requireRole(["admin", "scheduler"]),
  getTeacherClassAssignments
);
router.post(
  "/teacher-class-assignments",
  authMiddleware,
  requireRole(["admin", "scheduler"]),
  requireWritableInstitution,
  assignTeacherClass
);
router.delete(
  "/teacher-class-assignments/:id",
  authMiddleware,
  requireRole(["admin", "scheduler"]),
  requireWritableInstitution,
  removeTeacherClassAssignment
);

export default router;
