import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import { requireRole } from "../middleware/roleMiddleware.js";
import {
  getTimetable,
  getAllTimetables,
  saveTimetable,
  updateTimetable,
  publishTimetable,
  detectConflicts,
} from "../controllers/timetable.controller.js";

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
  saveTimetable
);

router.put(
  "/:classId",
  authMiddleware,
  requireRole(["admin", "scheduler"]),
  updateTimetable
);

router.post(
  "/:classId/publish",
  authMiddleware,
  requireRole(["admin", "scheduler"]),
  publishTimetable
);

router.get(
  "/:classId/conflicts",
  authMiddleware,
  requireRole(["admin", "scheduler"]),
  detectConflicts
);

export default router;

