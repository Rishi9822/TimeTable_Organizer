import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import { requireRole } from "../middleware/roleMiddleware.js";
import {
  getSubjects,
  createSubject,
  deleteSubject,
} from "../controllers/subject.controller.js";

const router = express.Router();

// All subject routes require authentication and admin/scheduler role
router.get(
  "/",
  authMiddleware,
  requireRole(["admin", "scheduler"]),
  getSubjects
);
router.post(
  "/",
  authMiddleware,
  requireRole(["admin", "scheduler"]),
  createSubject
);
router.delete(
  "/:id",
  authMiddleware,
  requireRole(["admin", "scheduler"]),
  deleteSubject
);

export default router;
