import Teacher from "../models/Teacher.js";
import TeacherSubject from "../models/TeacherSubject.js";
import TeacherClassAssignment from "../models/TeacherClassAssignment.js";
import Timetable from "../models/Timetable.js";
import Institution from "../models/Institution.js";
import { getPlanLimits, hasReachedTeacherLimit } from "../utils/planLimits.js";
import { logAuditFromRequest } from "../utils/auditLogger.js";

export const getTeachers = async (req, res) => {
  try {
    const targetInstitutionId = req.user.institutionId?._id || req.user.institutionId;
    // CRITICAL: Filter by institutionId for multi-tenancy
    if (!targetInstitutionId) {
      return res.status(403).json({
        message: "You must be part of an institution to access teachers",
      });
    }

    const institution = await Institution.findById(targetInstitutionId);
    const query = { institutionId: targetInstitutionId };
    if (institution?.plan === "flex" && institution.activeMode) {
      query.modeType = institution.activeMode;
    }
    const teachers = await Teacher.find(query).sort({ name: 1 });
    res.json(teachers);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const createTeacher = async (req, res) => {
  try {
    const targetInstitutionId = req.user.institutionId?._id || req.user.institutionId;
    // CRITICAL: Ensure user belongs to an institution
    if (!targetInstitutionId) {
      return res.status(403).json({
        message: "You must be part of an institution to create teachers",
      });
    }

    const institution = await Institution.findById(targetInstitutionId);
    if (institution && institution.plan === "trial") {
      const currentTeacherCount = await Teacher.countDocuments({
        institutionId: targetInstitutionId,
      });

      if (hasReachedTeacherLimit(institution.plan, currentTeacherCount)) {
        const limits = getPlanLimits(institution.plan);
        return res.status(403).json({
          message: `You have reached the maximum number of teachers (${limits.maxTeachers}) for your trial plan. Please upgrade your plan to add more teachers.`,
          limitReached: true,
          currentCount: currentTeacherCount,
          maxAllowed: limits.maxTeachers,
          plan: institution.plan,
        });
      }
    }
    // CRITICAL: Force institutionId from authenticated user; Flex: set modeType for isolation
    const createPayload = {
      ...req.body,
      institutionId: targetInstitutionId,
    };
    if (institution?.plan === "flex" && institution.activeMode) {
      createPayload.modeType = institution.activeMode;
    }
    const teacher = await Teacher.create(createPayload);

    // Audit log: Log AFTER successful creation
    logAuditFromRequest(
      req,
      "CREATE_TEACHER",
      "teacher",
      teacher._id,
      { teacherName: teacher.name }
    ).catch(() => { }); // Silently ignore logging errors

    res.status(201).json(teacher);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

export const updateTeacher = async (req, res) => {
  try {
    const targetInstitutionId = req.user.institutionId?._id || req.user.institutionId;
    const institution = await Institution.findById(targetInstitutionId);
    const ownershipQuery = { _id: req.params.id, institutionId: targetInstitutionId };
    if (institution?.plan === "flex" && institution.activeMode) {
      ownershipQuery.modeType = institution.activeMode;
    }
    const teacher = await Teacher.findOne(ownershipQuery);

    if (!teacher) {
      return res.status(404).json({ message: "Teacher not found" });
    }

    // CRITICAL: Prevent institutionId change
    const updateData = { ...req.body };
    delete updateData.institutionId;

    const updated = await Teacher.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    );

    // Audit log: Log AFTER successful update
    logAuditFromRequest(
      req,
      "UPDATE_TEACHER",
      "teacher",
      updated._id,
      { teacherName: updated.name }
    ).catch(() => { }); // Silently ignore logging errors

    res.json(updated);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

/**
 * DELETE /api/teachers/:id
 * Cascade deletion: Removes teacher and all related references
 * - TeacherSubject mappings (teacher-subject relationships)
 * - TeacherClassAssignment mappings (teacher-class assignments)
 * - Timetable period assignments (removes periods with this teacherId from all timetables)
 */
export const deleteTeacher = async (req, res) => {
  try {
    const targetInstitutionId = req.user.institutionId?._id || req.user.institutionId;
    const teacherId = req.params.id;
    const institution = await Institution.findById(targetInstitutionId);
    const ownershipQuery = { _id: teacherId, institutionId: targetInstitutionId };
    if (institution?.plan === "flex" && institution.activeMode) {
      ownershipQuery.modeType = institution.activeMode;
    }
    const teacher = await Teacher.findOne(ownershipQuery);

    if (!teacher) {
      return res.status(404).json({ message: "Teacher not found" });
    }

    // CASCADE DELETE: Remove all related mappings and references
    // 1. Delete teacher-subject mappings
    await TeacherSubject.deleteMany({
      teacherId,
      institutionId: targetInstitutionId,
    });

    // 2. Delete teacher-class assignments
    await TeacherClassAssignment.deleteMany({
      teacher_id: teacherId,
      institutionId: targetInstitutionId,
    });

    // 3. Remove teacher references from all timetables (same mode for Flex)
    const timetableQuery = { institutionId: targetInstitutionId };
    if (institution?.plan === "flex" && institution.activeMode) {
      timetableQuery.modeType = institution.activeMode;
    }
    const timetables = await Timetable.find(timetableQuery);

    // Update each timetable to remove periods with this teacherId
    for (const timetable of timetables) {
      if (timetable.periods && timetable.periods.size > 0) {
        let hasChanges = false;
        const updatedPeriods = new Map();

        // Iterate through each day's periods
        for (const [day, periodsArray] of timetable.periods.entries()) {
          if (Array.isArray(periodsArray)) {
            // Filter out periods with the deleted teacherId
            const filteredPeriods = periodsArray.filter(
              (p) => p.teacherId?.toString() !== teacherId.toString()
            );

            // Only update if periods were removed
            if (filteredPeriods.length !== periodsArray.length) {
              hasChanges = true;
              if (filteredPeriods.length > 0) {
                updatedPeriods.set(day, filteredPeriods);
              }
              // If all periods for this day were removed, don't add the day to updatedPeriods
            } else {
              // Keep the day as-is if no periods were removed
              updatedPeriods.set(day, periodsArray);
            }
          }
        }

        // Save updated timetable if changes were made
        if (hasChanges) {
          timetable.periods = updatedPeriods;
          await timetable.save();
        }
      }
    }

    // 4. Finally, delete the teacher document
    await Teacher.findByIdAndDelete(teacherId);

    // Audit log: Log AFTER successful deletion
    logAuditFromRequest(
      req,
      "DELETE_TEACHER",
      "teacher",
      teacherId,
      { teacherName: teacher.name }
    ).catch(() => { }); // Silently ignore logging errors

    res.json({
      success: true,
      message: "Teacher and all related references deleted successfully",
    });
  } catch (err) {
    console.error("Delete teacher error:", err);
    res.status(500).json({ message: err.message });
  }
};
