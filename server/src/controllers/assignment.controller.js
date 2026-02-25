import TeacherSubject from "../models/TeacherSubject.js";
import TeacherClassAssignment from "../models/TeacherClassAssignment.js";
import Teacher from "../models/Teacher.js";
import Subject from "../models/Subject.js";
import Class from "../models/Class.js";
import Institution from "../models/Institution.js";
import { logAuditFromRequest } from "../utils/auditLogger.js";

/**
 * GET /api/teacher-subjects
 */
export const getTeacherSubjects = async (req, res) => {
  try {
    const targetInstitutionId = req.user.institutionId?._id || req.user.institutionId;
    if (!targetInstitutionId) {
      return res.status(403).json({
        message: "You must be part of an institution to access teacher subjects",
      });
    }
    const institution = await Institution.findById(targetInstitutionId);
    const query = { institutionId: targetInstitutionId };
    if (institution?.plan === "flex" && institution.activeMode) {
      query.modeType = institution.activeMode;
    }
    const data = await TeacherSubject.find(query);
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

    const targetInstitutionId = req.user.institutionId?._id || req.user.institutionId;
    // CRITICAL: Verify both teacher and subject belong to user's institution
    if (!targetInstitutionId) {
      return res.status(403).json({
        message: "You must be part of an institution to assign subjects",
      });
    }

    const institution = await Institution.findById(targetInstitutionId);
    const baseQuery = { institutionId: targetInstitutionId };
    const modeFilter = institution?.plan === "flex" && institution.activeMode ? { modeType: institution.activeMode } : {};
    const teacher = await Teacher.findOne({ _id: teacherId, ...baseQuery, ...modeFilter });
    if (!teacher) {
      return res.status(404).json({ message: "Teacher not found" });
    }
    const subject = await Subject.findOne({ _id: subjectId, ...baseQuery, ...modeFilter });
    if (!subject) {
      return res.status(404).json({ message: "Subject not found" });
    }
    const exists = await TeacherSubject.findOne({
      teacherId,
      subjectId,
      institutionId: targetInstitutionId,
      ...modeFilter,
    });
    if (exists) {
      return res.status(409).json({ message: "Already assigned" });
    }
    const createPayload = {
      teacherId,
      subjectId,
      institutionId: targetInstitutionId,
    };
    if (institution?.plan === "flex" && institution.activeMode) {
      createPayload.modeType = institution.activeMode;
    }
    const assignment = await TeacherSubject.create(createPayload);

    // Audit log: Log AFTER successful assignment
    logAuditFromRequest(
      req,
      "ASSIGN_TEACHER_SUBJECT",
      "teacher_subject",
      assignment._id,
      { teacherName: teacher.name, subjectName: subject.name }
    ).catch(() => { }); // Silently ignore logging errors

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

    const targetInstitutionId = req.user.institutionId?._id || req.user.institutionId;
    // CRITICAL: Verify ownership before delete
    if (!targetInstitutionId) {
      return res.status(403).json({
        message: "You must be part of an institution to remove assignments",
      });
    }

    const institution = await Institution.findById(targetInstitutionId);
    const deleteQuery = { teacherId, subjectId, institutionId: targetInstitutionId };
    if (institution?.plan === "flex" && institution.activeMode) {
      deleteQuery.modeType = institution.activeMode;
    }
    const assignment = await TeacherSubject.findOneAndDelete(deleteQuery);

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
    ).catch(() => { }); // Silently ignore logging errors

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
    const targetInstitutionId = req.user.institutionId?._id || req.user.institutionId;
    if (!targetInstitutionId) {
      return res.status(403).json({
        message: "You must be part of an institution to access assignments",
      });
    }
    const institution = await Institution.findById(targetInstitutionId);
    const query = { institutionId: targetInstitutionId };
    if (institution?.plan === "flex" && institution.activeMode) {
      query.modeType = institution.activeMode;
    }
    const data = await TeacherClassAssignment.find(query);
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

    const targetInstitutionId = req.user.institutionId?._id || req.user.institutionId;
    // CRITICAL: Verify all entities belong to user's institution
    if (!targetInstitutionId) {
      return res.status(403).json({
        message: "You must be part of an institution to create assignments",
      });
    }

    const institution = await Institution.findById(targetInstitutionId);
    const baseQuery = { institutionId: targetInstitutionId };
    const modeFilter = institution?.plan === "flex" && institution.activeMode ? { modeType: institution.activeMode } : {};
    const teacher = await Teacher.findOne({ _id: teacher_id, ...baseQuery, ...modeFilter });
    if (!teacher) {
      return res.status(404).json({ message: "Teacher not found" });
    }
    const subject = await Subject.findOne({ _id: subject_id, ...baseQuery, ...modeFilter });
    if (!subject) {
      return res.status(404).json({ message: "Subject not found" });
    }
    const classEntity = await Class.findOne({ _id: class_id, ...baseQuery, ...modeFilter });
    if (!classEntity) {
      return res.status(404).json({ message: "Class not found" });
    }
    const createPayload = { ...req.body, institutionId: targetInstitutionId };
    if (institution?.plan === "flex" && institution.activeMode) {
      createPayload.modeType = institution.activeMode;
    }
    const record = await TeacherClassAssignment.create(createPayload);
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
    const targetInstitutionId = req.user.institutionId?._id || req.user.institutionId;
    // CRITICAL: Verify ownership before delete
    if (!targetInstitutionId) {
      return res.status(403).json({
        message: "You must be part of an institution to delete assignments",
      });
    }

    const institution = await Institution.findById(targetInstitutionId);
    const ownershipQuery = { _id: req.params.id, institutionId: targetInstitutionId };
    if (institution?.plan === "flex" && institution.activeMode) {
      ownershipQuery.modeType = institution.activeMode;
    }
    const assignment = await TeacherClassAssignment.findOne(ownershipQuery);

    if (!assignment) {
      return res.status(404).json({ message: "Assignment not found" });
    }

    await TeacherClassAssignment.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};
