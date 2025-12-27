import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import { requireRole } from "../middleware/roleMiddleware.js";
import {
  getClasses,
  createClass,
  deleteClass,
} from "../controllers/class.controller.js";

const router = express.Router();

// All class routes require authentication and admin/scheduler role
router.get(
  "/",
  authMiddleware,
  requireRole(["admin", "scheduler"]),
  getClasses
);
router.post(
  "/",
  authMiddleware,
  requireRole(["admin", "scheduler"]),
  createClass
);
router.delete(
  "/:id",
  authMiddleware,
  requireRole(["admin", "scheduler"]),
  deleteClass
);

export default router;
