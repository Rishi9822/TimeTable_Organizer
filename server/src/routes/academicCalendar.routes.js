import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import { requireRole } from "../middleware/roleMiddleware.js";
import { requireWritableInstitution } from "../middleware/institutionStatusMiddleware.js";
import AcademicCalendar from "../models/AcademicCalendar.js";
import Institution from "../models/Institution.js";

const router = express.Router();

/**
 * GET /api/academic-calendar
 * All events for current institution, mode-aware
 */
router.get("/", authMiddleware, async (req, res) => {
  try {
    const institution = await Institution.findById(req.user.institutionId);
    const query = { institutionId: req.user.institutionId };
    if (institution?.plan === "flex" && institution.activeMode) {
      query.$or = [{ modeType: institution.activeMode }, { modeType: null }];
    }

    const events = await AcademicCalendar.find(query)
      .sort({ startDate: 1 })
      .lean();

    res.json(events);
  } catch (err) {
    console.error("[AcademicCalendar] fetch error:", err);
    res.status(500).json({ message: "Failed to fetch calendar events" });
  }
});

/**
 * POST /api/academic-calendar
 * Create event (admin)
 */
router.post("/", authMiddleware, requireRole(["admin"]), requireWritableInstitution, async (req, res) => {
  try {
    const { title, description, eventType, startDate, endDate, blocksTimetable } = req.body;
    if (!title || !startDate || !endDate) {
      return res.status(400).json({ message: "Title, start date, and end date are required" });
    }

    const institution = await Institution.findById(req.user.institutionId);

    const event = await AcademicCalendar.create({
      title,
      description: description || null,
      eventType: eventType || "holiday",
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      blocksTimetable: blocksTimetable !== false,
      institutionId: req.user.institutionId,
      createdBy: req.user._id,
      modeType: institution?.activeMode || null,
    });

    res.status(201).json(event);
  } catch (err) {
    console.error("[AcademicCalendar] create error:", err);
    res.status(500).json({ message: "Failed to create event" });
  }
});

/**
 * PUT /api/academic-calendar/:id
 * Update event (admin)
 */
router.put("/:id", authMiddleware, requireRole(["admin"]), requireWritableInstitution, async (req, res) => {
  try {
    const event = await AcademicCalendar.findOneAndUpdate(
      { _id: req.params.id, institutionId: req.user.institutionId },
      { $set: req.body },
      { new: true }
    );
    if (!event) return res.status(404).json({ message: "Event not found" });
    res.json(event);
  } catch (err) {
    console.error("[AcademicCalendar] update error:", err);
    res.status(500).json({ message: "Failed to update event" });
  }
});

/**
 * DELETE /api/academic-calendar/:id
 * Hard delete event (admin)
 */
router.delete("/:id", authMiddleware, requireRole(["admin"]), requireWritableInstitution, async (req, res) => {
  try {
    const event = await AcademicCalendar.findOneAndDelete({
      _id: req.params.id,
      institutionId: req.user.institutionId,
    });
    if (!event) return res.status(404).json({ message: "Event not found" });
    res.json({ message: "Event deleted" });
  } catch (err) {
    console.error("[AcademicCalendar] delete error:", err);
    res.status(500).json({ message: "Failed to delete event" });
  }
});

export default router;
