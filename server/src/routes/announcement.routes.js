import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import { requireRole } from "../middleware/roleMiddleware.js";
import { requireWritableInstitution } from "../middleware/institutionStatusMiddleware.js";
import Announcement from "../models/AnnouncementModel.js";
import Institution from "../models/Institution.js";

const router = express.Router();

/**
 * GET /api/announcements
 * Active announcements for current institution, mode-aware
 */
router.get("/", authMiddleware, async (req, res) => {
  try {
    const institution = await Institution.findById(req.user.institutionId);
    const query = { institutionId: req.user.institutionId, isActive: true };
    if (institution?.plan === "flex" && institution.activeMode) {
      query.$or = [{ modeType: institution.activeMode }, { modeType: null }];
    }

    const announcements = await Announcement.find(query)
      .populate("createdBy", "name")
      .sort({ createdAt: -1 })
      .lean();

    res.json(announcements);
  } catch (err) {
    console.error("[Announcements] fetch error:", err);
    res.status(500).json({ message: "Failed to fetch announcements" });
  }
});

/**
 * POST /api/announcements
 * Create announcement (admin)
 */
router.post("/", authMiddleware, requireRole(["admin"]), requireWritableInstitution, async (req, res) => {
  try {
    const { title, content, priority, audienceType, expiresAt } = req.body;
    if (!title || !content) {
      return res.status(400).json({ message: "Title and content are required" });
    }

    const institution = await Institution.findById(req.user.institutionId);

    const announcement = await Announcement.create({
      title,
      content,
      priority: priority || "normal",
      audienceType: audienceType || "all",
      institutionId: req.user.institutionId,
      createdBy: req.user._id,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
      modeType: institution?.activeMode || null,
    });

    res.status(201).json(announcement);
  } catch (err) {
    console.error("[Announcements] create error:", err);
    res.status(500).json({ message: "Failed to create announcement" });
  }
});

/**
 * PUT /api/announcements/:id
 * Update announcement (admin)
 */
router.put("/:id", authMiddleware, requireRole(["admin"]), requireWritableInstitution, async (req, res) => {
  try {
    const announcement = await Announcement.findOneAndUpdate(
      { _id: req.params.id, institutionId: req.user.institutionId },
      { $set: req.body },
      { new: true }
    );
    if (!announcement) return res.status(404).json({ message: "Announcement not found" });
    res.json(announcement);
  } catch (err) {
    console.error("[Announcements] update error:", err);
    res.status(500).json({ message: "Failed to update announcement" });
  }
});

/**
 * DELETE /api/announcements/:id
 * Soft delete announcement (admin) — sets isActive=false
 */
router.delete("/:id", authMiddleware, requireRole(["admin"]), requireWritableInstitution, async (req, res) => {
  try {
    const announcement = await Announcement.findOneAndUpdate(
      { _id: req.params.id, institutionId: req.user.institutionId },
      { isActive: false },
      { new: true }
    );
    if (!announcement) return res.status(404).json({ message: "Announcement not found" });
    res.json({ message: "Announcement deleted" });
  } catch (err) {
    console.error("[Announcements] delete error:", err);
    res.status(500).json({ message: "Failed to delete announcement" });
  }
});

export default router;
