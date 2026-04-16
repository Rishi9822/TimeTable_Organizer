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

// All timetable routes require authentication and admin/scheduler role
router.get(
  "/:classId",
  authMiddleware,
  requireRole(["admin", "scheduler"]),
  getTimetable
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


/**
 * POST /generate — Auto-generate timetable for a class
 * Greedy constraint-based algorithm:
 *  1. Fetch institution settings (periods, days, breaks)
 *  2. Fetch teacher-class-assignments for this class
 *  3. Fetch existing timetables for OTHER classes (teacher occupancy)
 *  4. Place subjects into slots, spreading evenly, avoiding conflicts
 *  5. Save draft timetable and return placement report
 */
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

      // 1. Fetch Institution Settings
      const settings = await InstitutionSettings.findOne({ institutionId });
      if (!settings) {
        return res.status(400).json({ message: "Institution settings not configured" });
      }

      const periodsPerDay = settings.periods_per_day || 8;
      const workingDays = settings.working_days || ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
      const breaks = settings.breaks || [];
      const breakPeriods = new Set(breaks.map((b) => b.afterPeriod)); // periods AFTER which a break occurs

      // 2. Fetch requirements for this class
      const assignments = await TeacherClassAssignment.find({ class_id: classId, institutionId })
        .populate("teacher_id", "name maxPeriodsPerDay max_periods_per_day")
        .populate("subject_id", "name code color");

      if (!assignments.length) {
        return res.status(400).json({ message: "No teacher-subject assignments found for this class" });
      }

      // 3. Fetch other classes' timetables to build teacher occupancy map
      const otherTimetables = await Timetable.find({
        institutionId,
        classId: { $ne: classId },
        isPublished: false,
      });

      // Build occupancy: teacherId -> Set<"day_period">
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

      // 4. Build requirements, sorted by most constrained first
      const totalSlots = workingDays.length;
      const requirements = assignments.map((a) => {
        const teacherData = a.teacher_id;
        const maxPerDay = teacherData?.maxPeriodsPerDay || teacherData?.max_periods_per_day || 6;
        return {
          teacherId: teacherData?._id?.toString(),
          teacherName: teacherData?.name,
          subjectId: a.subject_id?._id?.toString(),
          subjectName: a.subject_id?.name,
          subjectCode: a.subject_id?.code,
          subjectColor: a.subject_id?.color,
          periodsNeeded: a.periods_per_week || 4,
          maxPerDay,
        };
      });

      // Sort by constraint ratio (most constrained first)
      requirements.sort((a, b) => {
        const ratioA = a.periodsNeeded / a.maxPerDay;
        const ratioB = b.periodsNeeded / b.maxPerDay;
        return ratioB - ratioA;
      });

      // 5. Greedy placement
      // Track: classSlots[day][period] = {teacherId, subjectId}
      const classSlots = {};
      for (const day of workingDays) {
        classSlots[day] = {};
      }

      // Track per-teacher-per-day load for THIS class
      const teacherDayLoad = {}; // teacherId -> { day -> count }
      // Track per-subject-per-day count
      const subjectDayCount = {}; // subjectId -> { day -> count }

      const report = [];

      for (const req of requirements) {
        let placed = 0;
        const maxPerDayForSubject = Math.ceil(req.periodsNeeded / totalSlots) + 1;

        // Multi-pass: spread across days
        for (let pass = 0; pass < periodsPerDay && placed < req.periodsNeeded; pass++) {
          // Sort days: least subject assignments first, then least teacher load
          const sortedDays = [...workingDays].sort((a, b) => {
            const sa = (subjectDayCount[req.subjectId] || {})[a] || 0;
            const sb = (subjectDayCount[req.subjectId] || {})[b] || 0;
            if (sa !== sb) return sa - sb;
            const ta = (teacherDayLoad[req.teacherId] || {})[a] || 0;
            const tb = (teacherDayLoad[req.teacherId] || {})[b] || 0;
            return ta - tb;
          });

          for (const day of sortedDays) {
            if (placed >= req.periodsNeeded) break;

            const subOnDay = (subjectDayCount[req.subjectId] || {})[day] || 0;
            if (subOnDay >= maxPerDayForSubject) continue;

            const tOnDay = (teacherDayLoad[req.teacherId] || {})[day] || 0;
            if (tOnDay >= req.maxPerDay) continue;

            // Find first available period
            for (let p = 1; p <= periodsPerDay; p++) {
              if (classSlots[day][p]) continue; // slot taken

              // Check teacher not occupied in another class this slot
              const occupancyKey = `${day}_${p}`;
              if (teacherOccupancy[req.teacherId]?.has(occupancyKey)) continue;

              // Place it
              classSlots[day][p] = {
                period: p,
                subjectId: req.subjectId,
                teacherId: req.teacherId,
              };

              placed++;

              // Update trackers
              if (!teacherDayLoad[req.teacherId]) teacherDayLoad[req.teacherId] = {};
              teacherDayLoad[req.teacherId][day] = (teacherDayLoad[req.teacherId][day] || 0) + 1;

              if (!subjectDayCount[req.subjectId]) subjectDayCount[req.subjectId] = {};
              subjectDayCount[req.subjectId][day] = (subjectDayCount[req.subjectId][day] || 0) + 1;

              // Also mark this teacher as occupied globally
              if (!teacherOccupancy[req.teacherId]) teacherOccupancy[req.teacherId] = new Set();
              teacherOccupancy[req.teacherId].add(occupancyKey);

              break; // placed in this day, move to next day
            }
          }
        }

        report.push({
          subject: req.subjectName,
          subjectCode: req.subjectCode,
          teacher: req.teacherName,
          placed,
          requested: req.periodsNeeded,
          complete: placed >= req.periodsNeeded,
        });
      }

      // 6. Convert to timetable model format and save
      const periodsMap = new Map();
      for (const day of workingDays) {
        const daySlots = Object.values(classSlots[day]).map((s) => ({
          period: s.period,
          subjectId: s.subjectId,
          teacherId: s.teacherId,
        }));
        if (daySlots.length > 0) {
          periodsMap.set(day, daySlots);
        }
      }

      // Upsert draft timetable
      const now = new Date();
      const academicYear = `${now.getFullYear()}-${now.getFullYear() + 1}`;

      await Timetable.findOneAndUpdate(
        { classId, institutionId, isPublished: false, academicYear },
        {
          classId,
          institutionId,
          academicYear,
          periods: periodsMap,
          isPublished: false,
          createdBy: req.user._id,
          modeType: settings.institution_type || null,
        },
        { upsert: true, new: true }
      );

      const totalPlaced = report.reduce((s, r) => s + r.placed, 0);
      const totalRequested = report.reduce((s, r) => s + r.requested, 0);
      const totalAvailable = workingDays.length * periodsPerDay;

      res.json({
        message: "Timetable generated successfully",
        summary: {
          placed: totalPlaced,
          requested: totalRequested,
          available: totalAvailable,
          percentage: totalRequested > 0 ? Math.round((totalPlaced / totalRequested) * 100) : 0,
          workingDays: workingDays.length,
          periodsPerDay,
        },
        report,
      });
    } catch (error) {
      console.error("❌ [TIMETABLE] Auto-generate error:", error);
      res.status(500).json({ message: error.message || "Failed to generate timetable" });
    }
  }
);

export default router;

