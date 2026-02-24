import Timetable from "../models/Timetable.js";
import Class from "../models/Class.js";
import Teacher from "../models/Teacher.js";
import Subject from "../models/Subject.js";
import Institution from "../models/Institution.js";
import { logAuditFromRequest } from "../utils/auditLogger.js";

/**
 * GET /api/timetables
 * Get all timetables for the institution (for conflict detection)
 */
export const getAllTimetables = async (req, res) => {
  try {
    if (!req.user.institutionId) {
      return res.status(403).json({
        message: "You must be part of an institution to access timetables",
      });
    }
    const institution = await Institution.findById(req.user.institutionId);
    const now = new Date();
    const year = now.getFullYear();
    const academicYear = `${year}-${year + 1}`;
    const query = { institutionId: req.user.institutionId, academicYear };
    if (institution?.plan === "flex" && institution.activeMode) {
      query.modeType = institution.activeMode;
    }
    const timetables = await Timetable.find(query).select("classId periods isPublished academicYear");

    // Convert to array format expected by frontend
    const result = timetables.map((tt) => ({
      classId: tt.classId,
      periods: tt.periods instanceof Map ? Object.fromEntries(tt.periods) : tt.periods,
      isPublished: tt.isPublished,
      academicYear: tt.academicYear,
    }));

    res.json(result);
  } catch (error) {
    console.error("Get all timetables error:", error);
    res.status(500).json({ message: "Failed to fetch timetables" });
  }
};

/**
 * GET /api/timetables/:classId
 * Returns draft if exists, else published timetable for the class
 */
export const getTimetable = async (req, res) => {
  try {
    const { classId } = req.params;

    // CRITICAL: Verify class belongs to user's institution
    if (!req.user.institutionId) {
      return res.status(403).json({
        message: "You must be part of an institution to access timetables",
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
    const now = new Date();
    const year = now.getFullYear();
    const academicYear = `${year}-${year + 1}`;
    const ttQuery = { classId, institutionId: req.user.institutionId, academicYear };
    if (institution?.plan === "flex" && institution.activeMode) {
      ttQuery.modeType = institution.activeMode;
    }
    let timetable = await Timetable.findOne({ ...ttQuery, isPublished: false });
    if (!timetable) {
      timetable = await Timetable.findOne({ ...ttQuery, isPublished: true });
    }

    if (!timetable) {
      // Return empty timetable structure
      return res.json({
        classId,
        academicYear,
        weekStructure: "Mon-Fri",
        periods: {},
        isPublished: false,
        isEmpty: true,
      });
    }

    // Convert Map to object for JSON serialization
    const response = timetable.toObject();
    if (response.periods instanceof Map) {
      response.periods = Object.fromEntries(response.periods);
    }
    res.json(response);
  } catch (error) {
    console.error("Get timetable error:", error);
    res.status(500).json({ message: "Failed to fetch timetable" });
  }
};

/**
 * POST /api/timetables/:classId
 * Create or update draft timetable
 */
export const saveTimetable = async (req, res) => {
  try {
    const { classId } = req.params;
    const { periods, weekStructure, academicYear } = req.body;

    // CRITICAL: Verify class belongs to user's institution
    if (!req.user.institutionId) {
      return res.status(403).json({
        message: "You must be part of an institution to save timetables",
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
    if (periods && typeof periods !== "object") {
      return res.status(400).json({ message: "Invalid periods structure" });
    }
    const now = new Date();
    const year = now.getFullYear();
    const finalAcademicYear = academicYear || `${year}-${year + 1}`;
    const ttQuery = { classId, institutionId: req.user.institutionId, academicYear: finalAcademicYear, isPublished: false };
    if (institution?.plan === "flex" && institution.activeMode) {
      ttQuery.modeType = institution.activeMode;
    }
    let timetable = await Timetable.findOne(ttQuery);
    if (timetable) {
      // Update existing draft
      // CRITICAL: Convert periods object to Map if needed
      if (periods && typeof periods === 'object' && !(periods instanceof Map)) {
        timetable.periods = new Map(Object.entries(periods));
      } else if (periods) {
        timetable.periods = periods;
      }
      timetable.weekStructure = weekStructure || timetable.weekStructure;
      await timetable.save();
    } else {
      // Create new draft
      // CRITICAL: Convert periods object to Map
      const periodsMap = periods && typeof periods === 'object' && !(periods instanceof Map)
        ? new Map(Object.entries(periods))
        : (periods || new Map());
      
      const createPayload = {
        classId,
        institutionId: req.user.institutionId,
        academicYear: finalAcademicYear,
        weekStructure: weekStructure || "Mon-Fri",
        periods: periodsMap,
        isPublished: false,
        createdBy: req.user._id,
      };
      if (institution?.plan === "flex" && institution.activeMode) {
        createPayload.modeType = institution.activeMode;
      }
      timetable = await Timetable.create(createPayload);
    }

    // Convert Map to object for JSON response
    const response = timetable.toObject();
    if (response.periods instanceof Map) {
      response.periods = Object.fromEntries(response.periods);
    }

    // Audit log: Log AFTER successful save
    logAuditFromRequest(
      req,
      "SAVE_TIMETABLE",
      "timetable",
      timetable._id,
      { className: classEntity.name, classId: classId, academicYear: finalAcademicYear }
    ).catch(() => {}); // Silently ignore logging errors

    res.json(response);
  } catch (error) {
    console.error("Save timetable error:", error);
    res.status(500).json({ message: "Failed to save timetable" });
  }
};

/**
 * PUT /api/timetables/:classId
 * Update draft timetable (same as POST but explicit)
 */
export const updateTimetable = async (req, res) => {
  return saveTimetable(req, res);
};

/**
 * POST /api/timetables/:classId/publish
 * Publish draft timetable (makes it read-only for students)
 */
export const publishTimetable = async (req, res) => {
  try {
    const { classId } = req.params;

    // CRITICAL: Verify class belongs to user's institution
    if (!req.user.institutionId) {
      return res.status(403).json({
        message: "You must be part of an institution to publish timetables",
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
    const now = new Date();
    const year = now.getFullYear();
    const academicYear = `${year}-${year + 1}`;
    const ttQuery = { classId, institutionId: req.user.institutionId, academicYear, isPublished: false };
    if (institution?.plan === "flex" && institution.activeMode) {
      ttQuery.modeType = institution.activeMode;
    }
    const draft = await Timetable.findOne(ttQuery);

    if (!draft) {
      return res.status(404).json({
        message: "No draft timetable found to publish",
      });
    }

    const unpublishQuery = { classId, institutionId: req.user.institutionId, academicYear, isPublished: true };
    if (institution?.plan === "flex" && institution.activeMode) {
      unpublishQuery.modeType = institution.activeMode;
    }
    await Timetable.updateMany(unpublishQuery, { isPublished: false });

    // Publish the draft
    draft.isPublished = true;
    await draft.save();

    // Convert Map to object for JSON response
    const response = draft.toObject();
    if (response.periods instanceof Map) {
      response.periods = Object.fromEntries(response.periods);
    }

    // Audit log: Log AFTER successful publish
    logAuditFromRequest(
      req,
      "PUBLISH_TIMETABLE",
      "timetable",
      draft._id,
      { className: classEntity.name, classId: classId, academicYear }
    ).catch(() => {}); // Silently ignore logging errors

    res.json({
      message: "Timetable published successfully",
      timetable: response,
    });
  } catch (error) {
    console.error("Publish timetable error:", error);
    res.status(500).json({ message: "Failed to publish timetable" });
  }
};

/**
 * GET /api/timetables/conflicts/:classId
 * Detect conflicts for a class timetable across all institution timetables
 */
export const detectConflicts = async (req, res) => {
  try {
    const { classId } = req.params;

    // CRITICAL: Verify class belongs to user's institution
    if (!req.user.institutionId) {
      return res.status(403).json({
        message: "You must be part of an institution to check conflicts",
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
    const now = new Date();
    const year = now.getFullYear();
    const academicYear = `${year}-${year + 1}`;
    const ttQuery = { classId, institutionId: req.user.institutionId, academicYear, isPublished: false };
    if (institution?.plan === "flex" && institution.activeMode) {
      ttQuery.modeType = institution.activeMode;
    }
    const timetable = await Timetable.findOne(ttQuery);
    if (!timetable || !timetable.periods) {
      return res.json({ conflicts: [], warnings: [] });
    }
    const allTtQuery = { institutionId: req.user.institutionId, academicYear };
    if (institution?.plan === "flex" && institution.activeMode) {
      allTtQuery.modeType = institution.activeMode;
    }
    const allTimetables = await Timetable.find(allTtQuery).populate("classId", "name section");
    const teacherQuery = { institutionId: req.user.institutionId };
    if (institution?.plan === "flex" && institution.activeMode) {
      teacherQuery.modeType = institution.activeMode;
    }
    const teachers = await Teacher.find(teacherQuery);

    const conflicts = [];
    const warnings = [];

    // Convert periods Map to object if needed
    const periods =
      timetable.periods instanceof Map
        ? Object.fromEntries(timetable.periods)
        : timetable.periods;

    // Check each period in the current timetable
    for (const [day, dayPeriods] of Object.entries(periods)) {
      if (!Array.isArray(dayPeriods)) continue;

      for (const periodData of dayPeriods) {
        const { period, teacherId, subjectId } = periodData;

        // Check for teacher conflicts across all classes
        for (const otherTimetable of allTimetables) {
          if (otherTimetable._id.toString() === timetable._id.toString()) {
            continue; // Skip self
          }

          const otherPeriods =
            otherTimetable.periods instanceof Map
              ? Object.fromEntries(otherTimetable.periods)
              : otherTimetable.periods;

          if (otherPeriods[day] && Array.isArray(otherPeriods[day])) {
            const conflict = otherPeriods[day].find(
              (p) => p.period === period && p.teacherId.toString() === teacherId.toString()
            );

            if (conflict) {
              conflicts.push({
                type: "teacher_double_booking",
                day,
                period,
                teacherId,
                conflictingClass: otherTimetable.classId.name,
                message: `Teacher is already assigned to ${otherTimetable.classId.name} at ${day} Period ${period}`,
              });
            }
          }
        }

        // Check teacher max periods per day
        const teacher = teachers.find(
          (t) => t._id.toString() === teacherId.toString()
        );
        if (teacher) {
          const teacherPeriodsToday = dayPeriods.filter(
            (p) => p.teacherId.toString() === teacherId.toString()
          ).length;

          if (teacherPeriodsToday > (teacher.max_periods_per_day || 6)) {
            warnings.push({
              type: "teacher_max_periods",
              day,
              teacherId,
              periods: teacherPeriodsToday,
              max: teacher.max_periods_per_day || 6,
              message: `Teacher exceeds maximum periods per day (${teacherPeriodsToday}/${teacher.max_periods_per_day || 6})`,
            });
          }
        }
      }
    }

    res.json({ conflicts, warnings });
  } catch (error) {
    console.error("Detect conflicts error:", error);
    res.status(500).json({ message: "Failed to detect conflicts" });
  }
};

