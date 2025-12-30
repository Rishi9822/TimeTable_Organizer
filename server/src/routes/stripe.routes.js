import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import { createCheckoutSession, getStripe } from "../utils/stripeService.js";

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

export default router;
