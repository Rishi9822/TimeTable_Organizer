import express from "express";
import mongoose from "mongoose";
import authMiddleware from "../middleware/authMiddleware.js";
import { requireSuperAdmin } from "../middleware/roleMiddleware.js";
import User from "../models/User.js";
import Institution from "../models/Institution.js";
import Subscription from "../models/Subscription.js";
import Notification from "../models/Notification.js";
import UserNotification from "../models/UserNotification.js";

const router = express.Router();

// ─── Apply auth + super admin guard to ALL routes in this file ───────────────
router.use(authMiddleware, requireSuperAdmin);

// ════════════════════════════════════════════════════════════════════
// STATS
// ════════════════════════════════════════════════════════════════════

/**
 * GET /api/super-admin/stats
 * Platform-wide overview stats
 */
router.get("/stats", async (req, res) => {
    try {
        const [
            total_orgs,
            suspended_orgs,
            total_users,
            trial_subs,
            standard_subs,
            flex_subs,
        ] = await Promise.all([
            Institution.countDocuments({ status: { $ne: "archived" } }),
            Institution.countDocuments({ status: "suspended" }),
            User.countDocuments({ role: { $ne: "super_admin" }, isBlocked: { $ne: true } }),
            Subscription.countDocuments({ plan: "trial", status: "active" }),
            Subscription.countDocuments({ plan: "standard", status: "active" }),
            Subscription.countDocuments({ plan: "flex", status: "active" }),
        ]);

        const active_orgs = total_orgs - suspended_orgs;

        res.json({
            total_orgs,
            active_orgs,
            suspended_orgs,
            total_users,
            trial_subs,
            standard_subs,
            flex_subs,
        });
    } catch (error) {
        console.error("[SuperAdmin] stats error:", error);
        res.status(500).json({ message: "Failed to fetch stats" });
    }
});

// ════════════════════════════════════════════════════════════════════
// INSTITUTION MANAGEMENT
// ════════════════════════════════════════════════════════════════════

/**
 * GET /api/super-admin/institutions
 * All institutions with subscription + admin info
 */
router.get("/institutions", async (req, res) => {
    try {
        const institutions = await Institution.find()
            .sort({ createdAt: -1 })
            .lean();

        const institutionIds = institutions.map((i) => i._id);

        const [subscriptions, admins] = await Promise.all([
            Subscription.find({ institutionId: { $in: institutionIds } }).lean(),
            User.find({ institutionId: { $in: institutionIds }, role: "admin" })
                .select("name email institutionId")
                .lean(),
        ]);

        const subMap = {};
        subscriptions.forEach((s) => { subMap[s.institutionId.toString()] = s; });

        const adminMap = {};
        admins.forEach((a) => { adminMap[a.institutionId.toString()] = a; });

        const result = institutions.map((inst) => ({
            ...inst,
            subscription: subMap[inst._id.toString()] || null,
            admin: adminMap[inst._id.toString()] || null,
        }));

        res.json(result);
    } catch (error) {
        console.error("[SuperAdmin] institutions error:", error);
        res.status(500).json({ message: "Failed to fetch institutions" });
    }
});

/**
 * PATCH /api/super-admin/institutions/:id/suspend
 */
router.patch("/institutions/:id/suspend", async (req, res) => {
    try {
        const institution = await Institution.findById(req.params.id);
        if (!institution) return res.status(404).json({ message: "Institution not found" });

        institution.status = "suspended";
        await institution.save();

        res.json({ message: "Institution suspended", institution });
    } catch (error) {
        res.status(500).json({ message: "Failed to suspend institution" });
    }
});

/**
 * PATCH /api/super-admin/institutions/:id/activate
 */
router.patch("/institutions/:id/activate", async (req, res) => {
    try {
        const institution = await Institution.findById(req.params.id);
        if (!institution) return res.status(404).json({ message: "Institution not found" });

        institution.status = "active";
        await institution.save();

        res.json({ message: "Institution activated", institution });
    } catch (error) {
        res.status(500).json({ message: "Failed to activate institution" });
    }
});

/**
 * DELETE /api/super-admin/institutions/:id
 * Soft delete (status = 'archived')
 */
router.delete("/institutions/:id", async (req, res) => {
    try {
        const institution = await Institution.findById(req.params.id);
        if (!institution) return res.status(404).json({ message: "Institution not found" });

        institution.status = "archived";
        await institution.save();

        res.json({ message: "Institution archived (soft deleted)" });
    } catch (error) {
        res.status(500).json({ message: "Failed to archive institution" });
    }
});

// ════════════════════════════════════════════════════════════════════
// USER MANAGEMENT
// ════════════════════════════════════════════════════════════════════

/**
 * GET /api/super-admin/users
 * All non-super-admin users
 */
router.get("/users", async (req, res) => {
    try {
        const users = await User.find({ role: { $ne: "super_admin" } })
            .select("-password -emailVerificationToken -passwordResetToken")
            .sort({ createdAt: -1 })
            .lean();

        const institutionIds = users
            .filter((u) => u.institutionId)
            .map((u) => u.institutionId);

        const institutions = await Institution.find({ _id: { $in: institutionIds } })
            .select("name")
            .lean();

        const instMap = {};
        institutions.forEach((i) => { instMap[i._id.toString()] = i.name; });

        const result = users.map((u) => ({
            ...u,
            institutionName: u.institutionId ? instMap[u.institutionId.toString()] || null : null,
        }));

        res.json(result);
    } catch (error) {
        res.status(500).json({ message: "Failed to fetch users" });
    }
});

/**
 * PATCH /api/super-admin/users/:id/block
 */
router.patch("/users/:id/block", async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) return res.status(404).json({ message: "User not found" });
        if (user.role === "super_admin") return res.status(400).json({ message: "Cannot block a super admin" });

        user.isBlocked = true;
        await user.save();

        res.json({ message: "User blocked" });
    } catch (error) {
        res.status(500).json({ message: "Failed to block user" });
    }
});

/**
 * PATCH /api/super-admin/users/:id/unblock
 */
router.patch("/users/:id/unblock", async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) return res.status(404).json({ message: "User not found" });

        user.isBlocked = false;
        await user.save();

        res.json({ message: "User unblocked" });
    } catch (error) {
        res.status(500).json({ message: "Failed to unblock user" });
    }
});

/**
 * PATCH /api/super-admin/users/:id/role
 * Change user role. Cannot promote to super_admin via API.
 */
router.patch("/users/:id/role", async (req, res) => {
    try {
        const { role } = req.body;
        const allowedRoles = ["admin", "scheduler", "teacher", "student"];

        if (!role || !allowedRoles.includes(role)) {
            return res.status(400).json({
                message: `Invalid role. Allowed: ${allowedRoles.join(", ")}. super_admin can only be set via direct DB operation.`,
            });
        }

        const user = await User.findById(req.params.id);
        if (!user) return res.status(404).json({ message: "User not found" });
        if (user.role === "super_admin") return res.status(400).json({ message: "Cannot change a super admin's role via API" });

        user.role = role;
        await user.save();

        res.json({ message: "User role updated", role });
    } catch (error) {
        res.status(500).json({ message: "Failed to update user role" });
    }
});

// ════════════════════════════════════════════════════════════════════
// SUBSCRIPTION MANAGEMENT
// ════════════════════════════════════════════════════════════════════

/**
 * GET /api/super-admin/subscriptions
 * All subscriptions with institution names
 */
router.get("/subscriptions", async (req, res) => {
    try {
        const [subscriptions, institutions] = await Promise.all([
            Subscription.find().sort({ createdAt: -1 }).lean(),
            Institution.find({ status: { $ne: "archived" } }).select("name plan status trialEndsAt").lean(),
        ]);

        const subMap = {};
        subscriptions.forEach((s) => { subMap[s.institutionId?.toString()] = s; });

        // Merge: each institution gets its Subscription record.
        // If no Subscription record exists yet (pre-model institutions), synthesise one from Institution fields.
        const result = institutions.map((inst) => {
            const sub = subMap[inst._id.toString()];
            if (sub) {
                return { ...sub, institutionName: inst.name };
            }
            // Fallback for institutions that pre-date the Subscription model
            return {
                _id: `legacy-${inst._id}`,
                institutionId: inst._id,
                institutionName: inst.name,
                plan: inst.plan || "trial",
                status: inst.status === "active" ? "active" : inst.status,
                trialEndsAt: inst.trialEndsAt || null,
                legacy: true, // flag: no Subscription record in DB yet
            };
        });

        res.json(result);
    } catch (error) {
        res.status(500).json({ message: "Failed to fetch subscriptions" });
    }
});

/**
 * PATCH /api/super-admin/subscriptions/:institutionId/extend-trial
 * Extend trial by N days
 */
router.patch("/subscriptions/:institutionId/extend-trial", async (req, res) => {
    try {
        const { days } = req.body;
        if (!days || isNaN(days) || days <= 0) {
            return res.status(400).json({ message: "Valid number of days required" });
        }

        let subscription = await Subscription.findOne({
            institutionId: req.params.institutionId,
        });

        if (!subscription) {
            // Create record if it doesn't exist (legacy)
            const inst = await Institution.findById(req.params.institutionId);
            if (!inst) return res.status(404).json({ message: "Institution not found" });

            subscription = new Subscription({
                institutionId: inst._id,
                plan: inst.plan || "trial",
                status: inst.status === "active" ? "active" : inst.status,
                trialEndsAt: inst.trialEndsAt || new Date(),
            });
        }

        const newEnd = new Date(subscription.trialEndsAt || Date.now());
        newEnd.setDate(newEnd.getDate() + Number(days));
        subscription.trialEndsAt = newEnd;

        // If previously expired, restore to active
        if (subscription.status === "expired") {
            subscription.status = "active";
        }

        await subscription.save();

        // Also sync back to Institution
        await Institution.findByIdAndUpdate(req.params.institutionId, {
            trialEndsAt: subscription.trialEndsAt,
            status: subscription.status === "active" && (await Institution.findById(req.params.institutionId)).status === "suspended" ? "suspended" : "active"
        });

        res.json({ message: `Trial extended by ${days} day(s)`, subscription });
    } catch (error) {
        res.status(500).json({ message: "Failed to extend trial" });
    }
});

/**
 * PATCH /api/super-admin/subscriptions/:institutionId/update-plan
 * Manually override subscription plan
 */
router.patch("/subscriptions/:institutionId/update-plan", async (req, res) => {
    try {
        const { plan } = req.body;
        const allowedPlans = ["trial", "standard", "flex"];

        if (!plan || !allowedPlans.includes(plan)) {
            return res.status(400).json({ message: `Valid plan required: ${allowedPlans.join(", ")}` });
        }

        let subscription = await Subscription.findOne({
            institutionId: req.params.institutionId,
        });

        if (!subscription) {
            // Create record if it doesn't exist (legacy)
            const inst = await Institution.findById(req.params.institutionId);
            if (!inst) return res.status(404).json({ message: "Institution not found" });

            subscription = new Subscription({
                institutionId: inst._id,
                plan: inst.plan || "trial",
                status: inst.status === "active" ? "active" : inst.status,
            });
        }

        subscription.plan = plan;
        subscription.status = "active";
        if (plan !== "trial") {
            subscription.upgradedAt = new Date();
        }

        await subscription.save();

        // Also update Institution.plan for backward compatibility
        await Institution.findByIdAndUpdate(req.params.institutionId, { plan, status: "active" });

        res.json({ message: "Plan updated", subscription });
    } catch (error) {
        res.status(500).json({ message: "Failed to update plan" });
    }
});

/**
 * PATCH /api/super-admin/subscriptions/:institutionId/cancel
 */
router.patch("/subscriptions/:institutionId/cancel", async (req, res) => {
    try {
        let subscription = await Subscription.findOne({
            institutionId: req.params.institutionId,
        });

        if (!subscription) {
            // Create record if it doesn't exist (legacy)
            const inst = await Institution.findById(req.params.institutionId);
            if (!inst) return res.status(404).json({ message: "Institution not found" });

            subscription = new Subscription({
                institutionId: inst._id,
                plan: inst.plan || "trial",
                status: inst.status === "active" ? "active" : inst.status,
            });
        }

        subscription.status = "cancelled";
        await subscription.save();

        // Also update Institution status for backward compatibility
        await Institution.findByIdAndUpdate(req.params.institutionId, { status: "cancelled" });

        res.json({ message: "Subscription cancelled", subscription });
    } catch (error) {
        res.status(500).json({ message: "Failed to cancel subscription" });
    }
});

// ════════════════════════════════════════════════════════════════════
// NOTIFICATIONS
// ════════════════════════════════════════════════════════════════════

/**
 * POST /api/super-admin/notifications/send
 * Send a broadcast notification
 */
router.post("/notifications/send", async (req, res) => {
    try {
        const { title, message, channel, audienceType, audienceId } = req.body;

        if (!title || !message) {
            return res.status(400).json({ message: "title and message are required" });
        }

        const validChannels = ["in_app", "email", "both"];
        const validAudiences = ["all_users", "all_tenants", "institution", "user"];

        if (!validChannels.includes(channel)) {
            return res.status(400).json({ message: `channel must be one of: ${validChannels.join(", ")}` });
        }
        if (!validAudiences.includes(audienceType)) {
            return res.status(400).json({ message: `audienceType must be one of: ${validAudiences.join(", ")}` });
        }

        if ((audienceType === "institution" || audienceType === "user") && !audienceId) {
            return res.status(400).json({ message: "audienceId required for institution/user audience types" });
        }

        // Create master notification document
        const notification = await Notification.create({
            title,
            message,
            channel,
            audienceType,
            audienceId: audienceId ? new mongoose.Types.ObjectId(audienceId) : null,
            sentBy: req.user._id,
        });

        // Determine recipients
        let recipientQuery = {};
        switch (audienceType) {
            case "all_users":
                recipientQuery = { role: { $ne: "super_admin" }, isBlocked: { $ne: true } };
                break;
            case "all_tenants":
                recipientQuery = { role: "admin", isBlocked: { $ne: true } };
                break;
            case "institution":
                recipientQuery = { institutionId: new mongoose.Types.ObjectId(audienceId), isBlocked: { $ne: true } };
                break;
            case "user":
                recipientQuery = { _id: new mongoose.Types.ObjectId(audienceId) };
                break;
        }

        const recipients = await User.find(recipientQuery).select("_id").lean();

        if (recipients.length === 0) {
            return res.json({
                message: "Notification created but no recipients found",
                notification,
                recipients_count: 0,
            });
        }

        // Bulk insert UserNotification inbox records
        const inboxRecords = recipients.map((r) => ({
            notificationId: notification._id,
            userId: r._id,
        }));

        await UserNotification.insertMany(inboxRecords, { ordered: false });

        console.log(`✅ [SuperAdmin] Notification sent to ${recipients.length} recipients`);

        res.json({
            message: "Notification sent",
            notification,
            recipients_count: recipients.length,
        });
    } catch (error) {
        console.error("[SuperAdmin] send notification error:", error);
        res.status(500).json({ message: "Failed to send notification" });
    }
});

/**
 * GET /api/super-admin/notifications
 * Notification history (sent by super admins)
 */
router.get("/notifications", async (req, res) => {
    try {
        const notifications = await Notification.find()
            .sort({ createdAt: -1 })
            .limit(100)
            .populate("sentBy", "name email")
            .lean();

        res.json(notifications);
    } catch (error) {
        res.status(500).json({ message: "Failed to fetch notifications" });
    }
});

export default router;
