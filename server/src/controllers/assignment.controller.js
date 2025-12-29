import TeacherSubject from "../models/TeacherSubject.js";
import TeacherClassAssignment from "../models/TeacherClassAssignment.js";
import Teacher from "../models/Teacher.js";
import Subject from "../models/Subject.js";
import Class from "../models/Class.js";
import { logAuditFromRequest } from "../utils/auditLogger.js";

/**
 * GET /api/teacher-subjects
 */
export const getTeacherSubjects = async (req, res) => {
  try {
    // CRITICAL: Filter by institutionId for multi-tenancy
    if (!req.user.institutionId) {
      return res.status(403).json({
        message: "You must be part of an institution to access teacher subjects",
      });
    }

    const data = await TeacherSubject.find({
      institutionId: req.user.institutionId,
    });
    res.json(data);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/**
 * POST /api/teacher-subjects
 */
export const assignTeacherSubject = async (req, res) => {
  try {
    const { teacherId, subjectId } = req.body;

    if (!teacherId || !subjectId) {
      return res.status(400).json({
        message: "teacherId and subjectId are required",
      });
    }

    // CRITICAL: Verify both teacher and subject belong to user's institution
    if (!req.user.institutionId) {
      return res.status(403).json({
        message: "You must be part of an institution to assign subjects",
      });
    }

    const teacher = await Teacher.findOne({
      _id: teacherId,
      institutionId: req.user.institutionId,
    });
    if (!teacher) {
      return res.status(404).json({ message: "Teacher not found" });
    }

    const subject = await Subject.findOne({
      _id: subjectId,
      institutionId: req.user.institutionId,
    });
    if (!subject) {
      return res.status(404).json({ message: "Subject not found" });
    }

    const exists = await TeacherSubject.findOne({
      teacherId,
      subjectId,
      institutionId: req.user.institutionId,
    });
    if (exists) {
      return res.status(409).json({ message: "Already assigned" });
    }

    const assignment = await TeacherSubject.create({
      teacherId,
      subjectId,
      institutionId: req.user.institutionId,
    });

    // Audit log: Log AFTER successful assignment
    logAuditFromRequest(
      req,
      "ASSIGN_TEACHER_SUBJECT",
      "teacher_subject",
      assignment._id,
      { teacherName: teacher.name, subjectName: subject.name }
    ).catch(() => {}); // Silently ignore logging errors

    res.status(201).json(assignment);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

/**
 * DELETE /api/teacher-subjects/:teacherId/:subjectId
 */
export const removeTeacherSubject = async (req, res) => {
  try {
    const { teacherId, subjectId } = req.params;

    if (!teacherId || !subjectId) {
      return res.status(400).json({ message: "Missing IDs" });
    }

    // CRITICAL: Verify ownership before delete
    if (!req.user.institutionId) {
      return res.status(403).json({
        message: "You must be part of an institution to remove assignments",
      });
    }

    const assignment = await TeacherSubject.findOneAndDelete({
      teacherId,
      subjectId,
      institutionId: req.user.institutionId,
    });

    if (!assignment) {
      return res.status(404).json({ message: "Assignment not found" });
    }

    // Get teacher and subject names for audit log
    const teacher = await Teacher.findById(teacherId);
    const subject = await Subject.findById(subjectId);

    // Audit log: Log AFTER successful removal
    logAuditFromRequest(
      req,
      "REMOVE_TEACHER_SUBJECT",
      "teacher_subject",
      assignment._id,
      { teacherName: teacher?.name, subjectName: subject?.name }
    ).catch(() => {}); // Silently ignore logging errors

    res.json({ message: "Subject removed from teacher" });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

/**
 * GET /api/teacher-class-assignments
 */
export const getTeacherClassAssignments = async (req, res) => {
  try {
    // CRITICAL: Filter by institutionId for multi-tenancy
    if (!req.user.institutionId) {
      return res.status(403).json({
        message: "You must be part of an institution to access assignments",
      });
    }

    const data = await TeacherClassAssignment.find({
      institutionId: req.user.institutionId,
    });
    res.json(data);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/**
 * POST /api/teacher-class-assignments
 */
export const assignTeacherClass = async (req, res) => {
  try {
    const { teacher_id, subject_id, class_id } = req.body;

    if (!teacher_id || !subject_id || !class_id) {
      return res.status(400).json({
        message: "teacher_id, subject_id, and class_id are required",
      });
    }

    // CRITICAL: Verify all entities belong to user's institution
    if (!req.user.institutionId) {
      return res.status(403).json({
        message: "You must be part of an institution to create assignments",
      });
    }

    const teacher = await Teacher.findOne({
      _id: teacher_id,
      institutionId: req.user.institutionId,
    });
    if (!teacher) {
      return res.status(404).json({ message: "Teacher not found" });
    }

    const subject = await Subject.findOne({
      _id: subject_id,
      institutionId: req.user.institutionId,
    });
    if (!subject) {
      return res.status(404).json({ message: "Subject not found" });
    }

    const classEntity = await Class.findOne({
      _id: class_id,
      institutionId: req.user.institutionId,
    });
    if (!classEntity) {
      return res.status(404).json({ message: "Class not found" });
    }

    const record = await TeacherClassAssignment.create({
      ...req.body,
      institutionId: req.user.institutionId,
    });
    res.status(201).json(record);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

/**
 * DELETE /api/teacher-class-assignments/:id
 */
export const removeTeacherClassAssignment = async (req, res) => {
  try {
    // CRITICAL: Verify ownership before delete
    if (!req.user.institutionId) {
      return res.status(403).json({
        message: "You must be part of an institution to delete assignments",
      });
    }

    const assignment = await TeacherClassAssignment.findOne({
      _id: req.params.id,
      institutionId: req.user.institutionId,
    });

    if (!assignment) {
      return res.status(404).json({ message: "Assignment not found" });
    }

    await TeacherClassAssignment.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};
