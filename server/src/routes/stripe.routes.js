import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import { createCheckoutSession, getStripe, handleCheckoutSuccess } from "../utils/stripeService.js";

const router = express.Router();

/**
 * POST /api/stripe/create-checkout
 * Create Stripe Checkout Session
 */
router.post("/create-checkout", authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Only admins can create checkout sessions" });
    }

    // CRITICAL: Enforce email verification requirement
    if (!req.user.emailVerified) {
      return res.status(403).json({ 
        message: "Please verify your email address before upgrading your plan. Check your inbox for the verification link.",
        requiresEmailVerification: true 
      });
    }

    if (!req.user.institutionId) {
      return res.status(403).json({ message: "You must be part of an institution" });
    }

    const { plan } = req.body;

    if (!plan || !["standard", "flex"].includes(plan)) {
      return res.status(400).json({ message: "Valid plan (standard or flex) is required" });
    }

    const Institution = (await import("../models/Institution.js")).default;
    const institution = await Institution.findById(req.user.institutionId);
    
    if (!institution) {
      return res.status(404).json({ message: "Institution not found" });
    }

    const stripeInstance = getStripe();
    if (!stripeInstance) {
      return res.status(503).json({ message: "Payment service is not configured" });
    }

    const { sessionId, url } = await createCheckoutSession(
      institution._id,
      plan,
      req.user.email,
      institution.name
    );

    res.json({ sessionId, url });
  } catch (error) {
    console.error("❌ [STRIPE] Create checkout error:", error);
    res.status(500).json({ message: error.message || "Failed to create checkout session" });
  }
});

/**
 * GET /api/stripe/verify-session
 * Verify checkout session completion and return updated institution state
 * Frontend calls this after redirect to check if payment succeeded
 */
router.get("/verify-session", authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Only admins can verify sessions" });
    }

    const { session_id } = req.query;

    if (!session_id) {
      return res.status(400).json({ message: "Session ID is required" });
    }

    if (!req.user.institutionId) {
      return res.status(403).json({ message: "You must be part of an institution" });
    }

    const stripeInstance = getStripe();
    if (!stripeInstance) {
      return res.status(503).json({ message: "Payment service is not configured" });
    }

    // Retrieve the checkout session from Stripe
    const session = await stripeInstance.checkout.sessions.retrieve(session_id);

    // Check if payment was successful
    if (session.payment_status !== "paid") {
      return res.status(400).json({
        message: "Payment not completed",
        payment_status: session.payment_status,
      });
    }

    // SECURITY: Ensure the session belongs to this institution (no cross-tenant verification)
    const sessionInstitutionId =
      session.client_reference_id || session.metadata?.institutionId || null;
    if (!sessionInstitutionId || sessionInstitutionId.toString() !== req.user.institutionId.toString()) {
      return res.status(403).json({ message: "Session does not belong to your institution" });
    }

    // Get updated institution state
    const Institution = (await import("../models/Institution.js")).default;
    let institution = await Institution.findById(req.user.institutionId);

    if (!institution) {
      return res.status(404).json({ message: "Institution not found" });
    }

    /**
     * REAL SAAS SYNC:
     * Webhooks are the final authority, but they can be delayed.
     * If the user is back from checkout and Stripe confirms `paid`,
     * we reconcile state server-side (idempotent) to avoid requiring manual refresh/logout/login.
     */
    if (institution.status !== "active" || !["standard", "flex"].includes(institution.plan)) {
      await handleCheckoutSuccess(session);
      institution = await Institution.findById(req.user.institutionId);
    }

    // Return updated institution state
    res.json({
      success: true,
      institution: {
        id: institution._id,
        plan: institution.plan,
        status: institution.status,
        stripeSubscriptionId: institution.stripeSubscriptionId,
      },
    });
  } catch (error) {
    console.error("❌ [STRIPE] Verify session error:", error);
    res.status(500).json({ message: error.message || "Failed to verify session" });
  }
});

export default router;
