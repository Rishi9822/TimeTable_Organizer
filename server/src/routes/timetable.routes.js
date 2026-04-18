import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import { requireRole } from "../middleware/roleMiddleware.js";
import { requireWritableInstitution } from "../middleware/institutionStatusMiddleware.js";
import {
  getTimetable,
  getAllTimetables,
  saveTimetable,
  updateTimetable,
  publishTimetable,
  detectConflicts,
} from "../controllers/timetable.controller.js";

import Timetable from "../models/Timetable.js";
import TeacherClassAssignment from "../models/TeacherClassAssignment.js";
import InstitutionSettings from "../models/InstitutionSettings.js";
import Teacher from "../models/Teacher.js";
import Subject from "../models/Subject.js";

const router = express.Router();

// Get all timetables for institution (for conflict detection)
router.get(
  "/",
  authMiddleware,
  requireRole(["admin", "scheduler"]),
  getAllTimetables
);

/**
 * GET /api/timetables/teacher/:teacherId
 * Get all timetable entries for a specific teacher (across all classes).
 * Returns flattened array: [{ day_of_week, period_number, subjectId, classId, ... }]
 */
router.get("/teacher/:teacherId", authMiddleware, async (req, res) => {
  try {
    const { teacherId } = req.params;
    const institutionId = req.user.institutionId?._id || req.user.institutionId;

    if (!institutionId) {
      return res.status(403).json({ message: "No institution" });
    }

    const Institution = (await import("../models/Institution.js")).default;
    const institution = await Institution.findById(institutionId);
    const Class = (await import("../models/Class.js")).default;

    const ttQuery = { institutionId };
    if (institution?.plan === "flex" && institution.activeMode) {
      ttQuery.modeType = institution.activeMode;
    }

    const timetables = await Timetable.find(ttQuery);
    const entries = [];

    for (const tt of timetables) {
      const classDoc = await Class.findById(tt.classId).select("name section grade").lean();
      const periods = tt.periods instanceof Map ? tt.periods : new Map(Object.entries(tt.periods || {}));

      for (const [day, slots] of periods) {
        for (const slot of slots) {
          if (slot.teacherId?.toString() === teacherId) {
            const subjectDoc = await Subject.findById(slot.subjectId).select("name code color").lean();
            entries.push({
              _id: `${tt._id}_${day}_${slot.period}`,
              day_of_week: day,
              dayOfWeek: day,
              period_number: slot.period,
              periodNumber: slot.period,
              subjectId: slot.subjectId,
              subjects: subjectDoc,
              subject: subjectDoc,
              teacherId: slot.teacherId,
              classId: tt.classId,
              class_id: tt.classId,
              classes: classDoc,
              class: classDoc,
            });
          }
        }
      }
    }

    // Sort by day then period
    const dayOrder = { Monday: 1, Tuesday: 2, Wednesday: 3, Thursday: 4, Friday: 5, Saturday: 6 };
    entries.sort((a, b) => (dayOrder[a.day_of_week] || 7) - (dayOrder[b.day_of_week] || 7) || a.period_number - b.period_number);

    res.json(entries);
  } catch (error) {
    console.error("[Timetable] teacher entries error:", error);
    res.status(500).json({ message: "Failed to fetch teacher timetable" });
  }
});

/**
 * GET /api/timetables/class/:classId
 * Get timetable entries for a specific class (for student view).
 * Optionally filter by ?day=Monday
 * Returns flattened array: [{ day_of_week, period_number, subjectId, teacherId, ... }]
 */
router.get("/class/:classId", authMiddleware, async (req, res) => {
  try {
    const { classId } = req.params;
    const { day } = req.query;
    const institutionId = req.user.institutionId?._id || req.user.institutionId;

    if (!institutionId) {
      return res.status(403).json({ message: "No institution" });
    }

    const Institution = (await import("../models/Institution.js")).default;
    const institution = await Institution.findById(institutionId);

    const ttQuery = { classId, institutionId };
    if (institution?.plan === "flex" && institution.activeMode) {
      ttQuery.modeType = institution.activeMode;
    }

    // Prefer published timetable for student view
    let timetable = await Timetable.findOne({ ...ttQuery, isPublished: true });
    if (!timetable) {
      timetable = await Timetable.findOne({ ...ttQuery, isPublished: false });
    }

    if (!timetable) {
      return res.json([]);
    }

    const periods = timetable.periods instanceof Map ? timetable.periods : new Map(Object.entries(timetable.periods || {}));
    const entries = [];

    for (const [dayKey, slots] of periods) {
      if (day && dayKey !== day) continue;

      for (const slot of slots) {
        const subjectDoc = await Subject.findById(slot.subjectId).select("name code color").lean();
        const teacherDoc = await Teacher.findById(slot.teacherId).select("name").lean();

        entries.push({
          _id: `${timetable._id}_${dayKey}_${slot.period}`,
          day_of_week: dayKey,
          dayOfWeek: dayKey,
          period_number: slot.period,
          periodNumber: slot.period,
          subjectId: subjectDoc,
          subjects: subjectDoc,
          subject: subjectDoc,
          teacherId: teacherDoc,
          teachers: teacherDoc,
          teacher: teacherDoc,
        });
      }
    }

    entries.sort((a, b) => {
      const dayOrder = { Monday: 1, Tuesday: 2, Wednesday: 3, Thursday: 4, Friday: 5, Saturday: 6 };
      return (dayOrder[a.day_of_week] || 7) - (dayOrder[b.day_of_week] || 7) || a.period_number - b.period_number;
    });

    res.json(entries);
  } catch (error) {
    console.error("[Timetable] class entries error:", error);
    res.status(500).json({ message: "Failed to fetch class timetable" });
  }
});

// Admin: Get timetable by classId (draft or published)
router.get(
  "/:classId",
  authMiddleware,
  requireRole(["admin", "scheduler"]),
  getTimetable
);

// IMPORTANT: /generate must be before /:classId to prevent route shadowing
router.post(
  "/generate",
  authMiddleware,
  requireRole(["admin", "scheduler"]),
  requireWritableInstitution,
  async (req, res) => {
    try {
      const { classId } = req.body;
      if (!classId) {
        return res.status(400).json({ message: "classId is required" });
      }

      const institutionId = req.user.institutionId;

      const settings = await InstitutionSettings.findOne({ institutionId });
      if (!settings) {
        return res.status(400).json({ message: "Institution settings not configured" });
      }

      const periodsPerDay = settings.periods_per_day || 8;
      const workingDays = settings.working_days || ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

      const assignments = await TeacherClassAssignment.find({ class_id: classId, institutionId })
        .populate("teacher_id", "name maxPeriodsPerDay max_periods_per_day")
        .populate("subject_id", "name code color");

      if (!assignments.length) {
        return res.status(400).json({ message: "No teacher-subject assignments found for this class" });
      }

      const otherTimetables = await Timetable.find({
        institutionId, classId: { $ne: classId }, isPublished: false,
      });

      const teacherOccupancy = {};
      for (const tt of otherTimetables) {
        const periods = tt.periods instanceof Map ? tt.periods : new Map(Object.entries(tt.periods || {}));
        for (const [day, slots] of periods) {
          for (const slot of slots) {
            const tid = slot.teacherId?.toString();
            if (tid) {
              if (!teacherOccupancy[tid]) teacherOccupancy[tid] = new Set();
              teacherOccupancy[tid].add(`${day}_${slot.period}`);
            }
          }
        }
      }

      const totalSlots = workingDays.length;
      const requirements = assignments.map((a) => {
        const td = a.teacher_id;
        return {
          teacherId: td?._id?.toString(), teacherName: td?.name,
          subjectId: a.subject_id?._id?.toString(), subjectName: a.subject_id?.name,
          subjectCode: a.subject_id?.code, subjectColor: a.subject_id?.color,
          periodsNeeded: a.periods_per_week || 4,
          maxPerDay: td?.maxPeriodsPerDay || td?.max_periods_per_day || 6,
        };
      });
      requirements.sort((a, b) => (b.periodsNeeded / b.maxPerDay) - (a.periodsNeeded / a.maxPerDay));

      const classSlots = {};
      for (const day of workingDays) classSlots[day] = {};
      const teacherDayLoad = {}, subjectDayCount = {}, report = [];

      for (const r of requirements) {
        let placed = 0;
        const maxPerDayForSubject = Math.ceil(r.periodsNeeded / totalSlots) + 1;
        for (let pass = 0; pass < periodsPerDay && placed < r.periodsNeeded; pass++) {
          const sortedDays = [...workingDays].sort((a, b) => {
            const sa = (subjectDayCount[r.subjectId] || {})[a] || 0;
            const sb = (subjectDayCount[r.subjectId] || {})[b] || 0;
            if (sa !== sb) return sa - sb;
            return ((teacherDayLoad[r.teacherId] || {})[a] || 0) - ((teacherDayLoad[r.teacherId] || {})[b] || 0);
          });
          for (const day of sortedDays) {
            if (placed >= r.periodsNeeded) break;
            if (((subjectDayCount[r.subjectId] || {})[day] || 0) >= maxPerDayForSubject) continue;
            if (((teacherDayLoad[r.teacherId] || {})[day] || 0) >= r.maxPerDay) continue;
            for (let p = 1; p <= periodsPerDay; p++) {
              if (classSlots[day][p]) continue;
              if (teacherOccupancy[r.teacherId]?.has(`${day}_${p}`)) continue;
              classSlots[day][p] = { period: p, subjectId: r.subjectId, teacherId: r.teacherId };
              placed++;
              if (!teacherDayLoad[r.teacherId]) teacherDayLoad[r.teacherId] = {};
              teacherDayLoad[r.teacherId][day] = (teacherDayLoad[r.teacherId][day] || 0) + 1;
              if (!subjectDayCount[r.subjectId]) subjectDayCount[r.subjectId] = {};
              subjectDayCount[r.subjectId][day] = (subjectDayCount[r.subjectId][day] || 0) + 1;
              if (!teacherOccupancy[r.teacherId]) teacherOccupancy[r.teacherId] = new Set();
              teacherOccupancy[r.teacherId].add(`${day}_${p}`);
              break;
            }
          }
        }
        report.push({ subject: r.subjectName, subjectCode: r.subjectCode, teacher: r.teacherName, placed, requested: r.periodsNeeded, complete: placed >= r.periodsNeeded });
      }

      const periodsMap = new Map();
      for (const day of workingDays) {
        const daySlots = Object.values(classSlots[day]).map(s => ({ period: s.period, subjectId: s.subjectId, teacherId: s.teacherId }));
        if (daySlots.length > 0) periodsMap.set(day, daySlots);
      }

      const now = new Date();
      const academicYear = `${now.getFullYear()}-${now.getFullYear() + 1}`;
      await Timetable.findOneAndUpdate(
        { classId, institutionId, isPublished: false, academicYear },
        { classId, institutionId, academicYear, periods: periodsMap, isPublished: false, createdBy: req.user._id, modeType: settings.institution_type || null },
        { upsert: true, new: true }
      );

      const totalPlaced = report.reduce((s, r) => s + r.placed, 0);
      const totalRequested = report.reduce((s, r) => s + r.requested, 0);
      res.json({
        message: "Timetable generated successfully",
        summary: { placed: totalPlaced, requested: totalRequested, available: workingDays.length * periodsPerDay, percentage: totalRequested > 0 ? Math.round((totalPlaced / totalRequested) * 100) : 0, workingDays: workingDays.length, periodsPerDay },
        report,
      });
    } catch (error) {
      console.error("❌ [TIMETABLE] Auto-generate error:", error);
      res.status(500).json({ message: error.message || "Failed to generate timetable" });
    }
  }
);

router.post(
  "/:classId",
  authMiddleware,
  requireRole(["admin", "scheduler"]),
  requireWritableInstitution,
  saveTimetable
);

router.put(
  "/:classId",
  authMiddleware,
  requireRole(["admin", "scheduler"]),
  requireWritableInstitution,
  updateTimetable
);

router.post(
  "/:classId/publish",
  authMiddleware,
  requireRole(["admin", "scheduler"]),
  requireWritableInstitution,
  publishTimetable
);

router.get(
  "/:classId/conflicts",
  authMiddleware,
  requireRole(["admin", "scheduler"]),
  detectConflicts
);


export default router;

