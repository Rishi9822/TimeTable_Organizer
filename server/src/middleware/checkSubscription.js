import Subscription from "../models/Subscription.js";

/**
 * checkSubscription Middleware
 * Blocks requests with HTTP 402 when a trial plan has expired.
 * Must run AFTER authMiddleware (requires req.user).
 *
 * Apply this to ALL protected institution-scoped data routes.
 * Frontend must redirect to /upgrade on receiving 402.
 */
const checkSubscription = async (req, res, next) => {
    try {
        // Super admin bypasses subscription checks
        if (!req.user || req.user.role === "super_admin") {
            return next();
        }

        // Skip if user has no institution (they can't have a subscription either)
        if (!req.user.institutionId) {
            return next();
        }

        const subscription = await Subscription.findOne({
            institutionId: req.user.institutionId,
        });

        // If no subscription record exists yet, let through (legacy/migration path)
        if (!subscription) {
            return next();
        }

        // Hard block: trial has expired
        if (subscription.plan === "trial" && subscription.trialEndsAt < new Date()) {
            return res.status(402).json({
                message: "Trial expired. Please upgrade your plan to continue.",
                code: "TRIAL_EXPIRED",
            });
        }

        // Hard block: subscription was cancelled
        if (subscription.status === "cancelled") {
            return res.status(402).json({
                message: "Subscription cancelled. Please renew your plan.",
                code: "SUBSCRIPTION_CANCELLED",
            });
        }

        // Attach subscription to req for downstream use
        req.subscription = subscription;
        next();
    } catch (error) {
        console.error("[checkSubscription] Error:", error);
        // Non-fatal: allow request through rather than blocking everything
        next();
    }
};

export default checkSubscription;
