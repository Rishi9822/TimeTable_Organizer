import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import UserNotification from "../models/UserNotification.js";

const router = express.Router();

/**
 * GET /api/notifications/my
 * Get current user's notification inbox (latest 50)
 */
router.get("/my", authMiddleware, async (req, res) => {
    try {
        const notifications = await UserNotification.find({ userId: req.user._id })
            .sort({ createdAt: -1 })
            .limit(50)
            .populate({
                path: "notificationId",
                select: "title message channel audienceType createdAt",
            })
            .lean();

        // Shape response to match frontend expectations
        const result = notifications.map((n) => ({
            id: n._id,
            isRead: n.isRead,
            readAt: n.readAt,
            createdAt: n.createdAt,
            notification: n.notificationId,
        }));

        res.json(result);
    } catch (error) {
        console.error("[Notifications] fetch error:", error);
        res.status(500).json({ message: "Failed to fetch notifications" });
    }
});

/**
 * PATCH /api/notifications/mark-all-read
 * Must be BEFORE /:id/read to avoid route conflict
 */
router.patch("/mark-all-read", authMiddleware, async (req, res) => {
    try {
        await UserNotification.updateMany(
            { userId: req.user._id, isRead: false },
            { $set: { isRead: true, readAt: new Date() } }
        );

        res.json({ message: "All notifications marked as read" });
    } catch (error) {
        res.status(500).json({ message: "Failed to mark all as read" });
    }
});

/**
 * PATCH /api/notifications/:id/read
 * Mark a single notification as read
 */
router.patch("/:id/read", authMiddleware, async (req, res) => {
    try {
        const notification = await UserNotification.findOneAndUpdate(
            { _id: req.params.id, userId: req.user._id }, // security: user can only mark their own
            { $set: { isRead: true, readAt: new Date() } },
            { new: true }
        );

        if (!notification) {
            return res.status(404).json({ message: "Notification not found" });
        }

        res.json({ message: "Notification marked as read", notification });
    } catch (error) {
        res.status(500).json({ message: "Failed to mark notification as read" });
    }
});

export default router;
