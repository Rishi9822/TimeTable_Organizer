import Teacher from "../models/Teacher.js";
import TeacherSubject from "../models/TeacherSubject.js";
import TeacherClassAssignment from "../models/TeacherClassAssignment.js";
import Timetable from "../models/Timetable.js";

export const getTeachers = async (req, res) => {
  try {
    // CRITICAL: Filter by institutionId for multi-tenancy
    if (!req.user.institutionId) {
      return res.status(403).json({
        message: "You must be part of an institution to access teachers",
      });
    }

    const teachers = await Teacher.find({
      institutionId: req.user.institutionId,
    }).sort({ name: 1 });
    res.json(teachers);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const createTeacher = async (req, res) => {
  try {
    // CRITICAL: Ensure user belongs to an institution
    if (!req.user.institutionId) {
      return res.status(403).json({
        message: "You must be part of an institution to create teachers",
      });
    }

    // CRITICAL: Force institutionId from authenticated user
    const teacher = await Teacher.create({
      ...req.body,
      institutionId: req.user.institutionId,
    });
    res.status(201).json(teacher);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

export const updateTeacher = async (req, res) => {
  try {
    // CRITICAL: Verify ownership before update
    const teacher = await Teacher.findOne({
      _id: req.params.id,
      institutionId: req.user.institutionId,
    });

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
    const teacherId = req.params.id;

    // CRITICAL: Verify ownership before delete
    const teacher = await Teacher.findOne({
      _id: teacherId,
      institutionId: req.user.institutionId,
    });

    if (!teacher) {
      return res.status(404).json({ message: "Teacher not found" });
    }

    // CASCADE DELETE: Remove all related mappings and references
    // 1. Delete teacher-subject mappings
    await TeacherSubject.deleteMany({
      teacherId,
      institutionId: req.user.institutionId,
    });

    // 2. Delete teacher-class assignments
    await TeacherClassAssignment.deleteMany({
      teacher_id: teacherId,
      institutionId: req.user.institutionId,
    });

    // 3. Remove teacher references from all timetables
    // Get all timetables for this institution
    const timetables = await Timetable.find({
      institutionId: req.user.institutionId,
    });

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

    res.json({
      success: true,
      message: "Teacher and all related references deleted successfully",
    });
  } catch (err) {
    console.error("Delete teacher error:", err);
    res.status(500).json({ message: err.message });
  }
};
