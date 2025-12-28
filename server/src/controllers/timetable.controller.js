import Timetable from "../models/Timetable.js";
import Class from "../models/Class.js";
import Teacher from "../models/Teacher.js";
import Subject from "../models/Subject.js";

/**
 * GET /api/timetables
 * Get all timetables for the institution (for conflict detection)
 */
export const getAllTimetables = async (req, res) => {
  try {
    // CRITICAL: Verify user belongs to an institution
    if (!req.user.institutionId) {
      return res.status(403).json({
        message: "You must be part of an institution to access timetables",
      });
    }

    // Get current academic year
    const now = new Date();
    const year = now.getFullYear();
    const academicYear = `${year}-${year + 1}`;

    // Get all timetables (draft and published) for the institution
    const timetables = await Timetable.find({
      institutionId: req.user.institutionId,
      academicYear,
    }).select("classId periods isPublished academicYear");

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

    const classEntity = await Class.findOne({
      _id: classId,
      institutionId: req.user.institutionId,
    });

    if (!classEntity) {
      return res.status(404).json({ message: "Class not found" });
    }

    // Get current academic year
    const now = new Date();
    const year = now.getFullYear();
    const academicYear = `${year}-${year + 1}`;

    // Try to get draft first, then published
    let timetable = await Timetable.findOne({
      classId,
      institutionId: req.user.institutionId,
      academicYear,
      isPublished: false,
    });

    if (!timetable) {
      timetable = await Timetable.findOne({
        classId,
        institutionId: req.user.institutionId,
        academicYear,
        isPublished: true,
      });
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

    const classEntity = await Class.findOne({
      _id: classId,
      institutionId: req.user.institutionId,
    });

    if (!classEntity) {
      return res.status(404).json({ message: "Class not found" });
    }

    // Validate periods structure
    if (periods && typeof periods !== "object") {
      return res.status(400).json({ message: "Invalid periods structure" });
    }

    // Get academic year
    const now = new Date();
    const year = now.getFullYear();
    const finalAcademicYear = academicYear || `${year}-${year + 1}`;

    // Find or create draft timetable
    let timetable = await Timetable.findOne({
      classId,
      institutionId: req.user.institutionId,
      academicYear: finalAcademicYear,
      isPublished: false,
    });

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
      
      timetable = await Timetable.create({
        classId,
        institutionId: req.user.institutionId,
        academicYear: finalAcademicYear,
        weekStructure: weekStructure || "Mon-Fri",
        periods: periodsMap,
        isPublished: false,
        createdBy: req.user._id,
      });
    }

    // Convert Map to object for JSON response
    const response = timetable.toObject();
    if (response.periods instanceof Map) {
      response.periods = Object.fromEntries(response.periods);
    }
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

    const classEntity = await Class.findOne({
      _id: classId,
      institutionId: req.user.institutionId,
    });

    if (!classEntity) {
      return res.status(404).json({ message: "Class not found" });
    }

    // Get current academic year
    const now = new Date();
    const year = now.getFullYear();
    const academicYear = `${year}-${year + 1}`;

    // Find draft timetable
    const draft = await Timetable.findOne({
      classId,
      institutionId: req.user.institutionId,
      academicYear,
      isPublished: false,
    });

    if (!draft) {
      return res.status(404).json({
        message: "No draft timetable found to publish",
      });
    }

    // Unpublish previous published version if exists
    await Timetable.updateMany(
      {
        classId,
        institutionId: req.user.institutionId,
        academicYear,
        isPublished: true,
      },
      { isPublished: false }
    );

    // Publish the draft
    draft.isPublished = true;
    await draft.save();

    // Convert Map to object for JSON response
    const response = draft.toObject();
    if (response.periods instanceof Map) {
      response.periods = Object.fromEntries(response.periods);
    }

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

    const classEntity = await Class.findOne({
      _id: classId,
      institutionId: req.user.institutionId,
    });

    if (!classEntity) {
      return res.status(404).json({ message: "Class not found" });
    }

    // Get current academic year
    const now = new Date();
    const year = now.getFullYear();
    const academicYear = `${year}-${year + 1}`;

    // Get draft timetable for this class
    const timetable = await Timetable.findOne({
      classId,
      institutionId: req.user.institutionId,
      academicYear,
      isPublished: false,
    });

    if (!timetable || !timetable.periods) {
      return res.json({ conflicts: [], warnings: [] });
    }

    // Get all timetables (draft and published) for the institution
    const allTimetables = await Timetable.find({
      institutionId: req.user.institutionId,
      academicYear,
    }).populate("classId", "name section");

    // Get all teachers for max periods validation
    const teachers = await Teacher.find({
      institutionId: req.user.institutionId,
    });

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

