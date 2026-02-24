import Stripe from "stripe";

/**
 * Stripe Service
 * Handles all Stripe payment operations
 */

let stripeInstance = null;

/**
 * Get Stripe instance (singleton)
 */
export const getStripe = () => {
  if (!stripeInstance) {
    const secretKey = process.env.STRIPE_SECRET_KEY;
    
    if (!secretKey) {
      console.warn("⚠️ [STRIPE] STRIPE_SECRET_KEY not configured. Stripe features will be disabled.");
      return null;
    }

    stripeInstance = new Stripe(secretKey, {
      apiVersion: "2024-11-20.acacia", // Use latest stable API version
    });
    
    console.log("✅ [STRIPE] Stripe instance initialized");
  }

  return stripeInstance;
};

/**
 * Get Stripe pricing IDs from environment
 */
export const getStripePriceIds = () => {
  return {
    standard: process.env.STRIPE_PRICE_ID_STANDARD || null,
    flex: process.env.STRIPE_PRICE_ID_FLEX || null,
  };
};

/**
 * Create Stripe Checkout Session
 * @param {string} institutionId - Institution ID
 * @param {string} plan - Plan type (standard or flex)
 * @param {string} email - Customer email
 * @param {string} institutionName - Institution name
 * @returns {Promise<{sessionId: string, url: string}>}
 */
export const createCheckoutSession = async (institutionId, plan, email, institutionName) => {
  const stripe = getStripe();
  
  if (!stripe) {
    throw new Error("Stripe is not configured");
  }

  const priceIds = getStripePriceIds();
  const priceId = plan === "flex" ? priceIds.flex : priceIds.standard;

  if (!priceId) {
    throw new Error(`Stripe price ID for ${plan} plan is not configured`);
  }

  const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      customer_email: email,
      client_reference_id: institutionId.toString(),
      metadata: {
        institutionId: institutionId.toString(),
        plan: plan,
        institutionName: institutionName,
      },
      success_url: `${frontendUrl}/admin?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${frontendUrl}/admin?canceled=true`,
      subscription_data: {
        metadata: {
          institutionId: institutionId.toString(),
          plan: plan,
        },
      },
    });

    console.log(`✅ [STRIPE] Checkout session created for institution ${institutionId}, plan: ${plan}`);
    
    return {
      sessionId: session.id,
      url: session.url,
    };
  } catch (error) {
    console.error(`❌ [STRIPE] Error creating checkout session:`, error.message);
    throw error;
  }
};

/**
 * Set modeType on all existing docs for an institution (used when upgrading to Flex).
 * Only updates docs where modeType is null or missing.
 */
async function backfillModeTypeForInstitution(institutionId, mode) {
  if (!institutionId || !["school", "college"].includes(mode)) return;
  const filter = {
    institutionId,
    $or: [{ modeType: null }, { modeType: { $exists: false } }],
  };
  const set = { $set: { modeType: mode } };
  const Teacher = (await import("../models/Teacher.js")).default;
  const Subject = (await import("../models/Subject.js")).default;
  const Class = (await import("../models/Class.js")).default;
  const TeacherSubject = (await import("../models/TeacherSubject.js")).default;
  const TeacherClassAssignment = (await import("../models/TeacherClassAssignment.js")).default;
  const Timetable = (await import("../models/Timetable.js")).default;
  const Assignment = (await import("../models/Assignment.js")).default;
  const models = [
    [Teacher, "Teacher"],
    [Subject, "Subject"],
    [Class, "Class"],
    [TeacherSubject, "TeacherSubject"],
    [TeacherClassAssignment, "TeacherClassAssignment"],
    [Timetable, "Timetable"],
    [Assignment, "Assignment"],
  ];
  for (const [Model] of models) {
    await Model.updateMany(filter, set);
  }
  console.log(`✅ [STRIPE] Backfilled modeType="${mode}" for institution ${institutionId}`);
}

/**
 * Handle successful checkout
 * @param {object} session - Stripe checkout session
 */
export const handleCheckoutSuccess = async (session) => {
  const Institution = (await import("../models/Institution.js")).default;
  const InstitutionSettings = (await import("../models/InstitutionSettings.js")).default;
  
  const institutionId = session.client_reference_id || session.metadata?.institutionId;
  const subscriptionId = session.subscription;
  const customerId = session.customer;

  if (!institutionId) {
    console.error("❌ [STRIPE] No institution ID in checkout session");
    return { success: false, error: "No institution ID found" };
  }

  try {
    const stripe = getStripe();
    if (!stripe) {
      throw new Error("Stripe is not configured");
    }

    // Get subscription details
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    const priceId = subscription.items.data[0]?.price?.id;
    const plan = session.metadata?.plan || (priceId === getStripePriceIds().flex ? "flex" : "standard");

    // Update institution
    const institution = await Institution.findById(institutionId);
    
    if (!institution) {
      console.error(`❌ [STRIPE] Institution ${institutionId} not found`);
      return { success: false, error: "Institution not found" };
    }

    // CRITICAL: Preserve existing institution type and setup state
    // Get current settings to preserve institution type
    const settings = await InstitutionSettings.findOne({ institutionId: institution._id });
    const currentInstitutionType = settings?.institution_type;

    // Update Stripe fields
    institution.stripeCustomerId = customerId;
    institution.stripeSubscriptionId = subscriptionId;
    institution.stripePriceId = priceId;
    institution.stripeCurrentPeriodEnd = new Date(subscription.current_period_end * 1000);
    
    // SaaS Logic: Update plan and status
    const previousPlan = institution.plan;
    institution.plan = plan;
    institution.status = "active"; // Activate institution immediately

    // SaaS Logic: For Standard plan upgrade, lock institution type if setup is complete
    // Idempotent: Only update if not already locked. Flex must NEVER have lockedInstitutionType.
    if (plan === "standard" && institution.isSetupComplete && currentInstitutionType) {
      if (!institution.institutionTypeLocked) {
        institution.institutionTypeLocked = true;
        institution.lockedInstitutionType = currentInstitutionType;
      }
      // Ensure activeMode is set for consistency (Standard only has one mode)
      if (!institution.activeMode) {
        institution.activeMode = currentInstitutionType;
      }
      const completedModes = institution.completedModes || [];
      if (!completedModes.includes(currentInstitutionType)) {
        institution.completedModes = [currentInstitutionType];
      }
    }

    // SaaS Logic: For Flex plan upgrade, preserve current mode and sync setup flags
    // Flex must NEVER have lockedInstitutionType set.
    if (plan === "flex" && institution.isSetupComplete && currentInstitutionType) {
      if (institution.institutionTypeLocked) {
        institution.institutionTypeLocked = false;
      }
      institution.lockedInstitutionType = null;
      const completedModes = institution.completedModes || [];
      if (!completedModes.includes(currentInstitutionType)) {
        institution.completedModes = [...completedModes, currentInstitutionType];
      }
      if (!institution.activeMode) {
        institution.activeMode = currentInstitutionType;
      }
      // Ensure current mode’s setup flag is set (Trial→Flex and Standard→Flex)
      const flag = currentInstitutionType === "school" ? "schoolSetupComplete" : "collegeSetupComplete";
      await InstitutionSettings.findOneAndUpdate(
        { institutionId: institution._id },
        { $set: { [flag]: true } },
        { upsert: false }
      ).catch(() => {});
    }

    // SaaS Logic: Handle upgrade from Standard to Flex (unlock type, preserve setup)
    if (previousPlan === "standard" && plan === "flex") {
      if (institution.institutionTypeLocked) {
        institution.institutionTypeLocked = false;
      }
      institution.lockedInstitutionType = null;
      if (currentInstitutionType) {
        const completedModes = institution.completedModes || [];
        if (!completedModes.includes(currentInstitutionType)) {
          institution.completedModes = [...completedModes, currentInstitutionType];
        }
        if (!institution.activeMode) {
          institution.activeMode = currentInstitutionType;
        }
        // Setup flag for current mode already set in the Flex block above
      }
    }

    // SaaS Logic: Clean up trial state when upgrading from trial
    if (previousPlan === "trial" && institution.status === "trial") {
      // Trial is now over - status will be set to active above
      // Keep trial metadata for historical purposes but mark as upgraded
    }

    await institution.save();

    // When upgrading to Flex: backfill modeType on existing data so lists aren’t empty
    if (plan === "flex" && (institution.activeMode || currentInstitutionType)) {
      const mode = institution.activeMode || currentInstitutionType;
      await backfillModeTypeForInstitution(institution._id, mode).catch((err) => {
        console.warn("⚠️ [STRIPE] Flex modeType backfill failed (non-fatal):", err?.message);
      });
    }

    console.log(`✅ [STRIPE] Institution ${institutionId} upgraded from ${previousPlan} to ${plan} plan, status: ${institution.status}`);

    return { success: true, institution, plan };
  } catch (error) {
    console.error(`❌ [STRIPE] Error handling checkout success:`, error.message);
    return { success: false, error: error.message };
  }
};

/**
 * Handle successful payment (invoice.payment_succeeded)
 * This is called for recurring payments, not just initial checkout
 * @param {object} invoice - Stripe invoice
 */
export const handlePaymentSucceeded = async (invoice) => {
  const Institution = (await import("../models/Institution.js")).default;
  
  const customerId = invoice.customer;
  const subscriptionId = invoice.subscription;

  if (!subscriptionId) {
    console.warn("⚠️ [STRIPE] No subscription ID in invoice");
    return { success: false, error: "No subscription ID found" };
  }

  try {
    const stripe = getStripe();
    if (!stripe) {
      throw new Error("Stripe is not configured");
    }

    // Get subscription to find institution
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    const institution = await Institution.findOne({ stripeSubscriptionId: subscriptionId });
    
    if (!institution) {
      console.warn(`⚠️ [STRIPE] Institution not found for subscription ${subscriptionId}`);
      return { success: false, error: "Institution not found" };
    }

    // Idempotent: Only update if period end has changed
    const newPeriodEnd = new Date(subscription.current_period_end * 1000);
    if (!institution.stripeCurrentPeriodEnd || 
        institution.stripeCurrentPeriodEnd.getTime() !== newPeriodEnd.getTime()) {
      institution.stripeCurrentPeriodEnd = newPeriodEnd;
    }
    
    // SaaS Logic: Ensure status is active on successful payment
    // This handles cases where status might have been set to suspended due to previous failures
    // Idempotent: Only update if currently suspended
    if (institution.status === "suspended" && (institution.plan === "standard" || institution.plan === "flex")) {
      institution.status = "active";
      console.log(`✅ [STRIPE] Reactivated institution ${institution._id} after successful payment`);
    }

    await institution.save();

    console.log(`✅ [STRIPE] Payment succeeded for institution ${institution._id}, subscription renewed`);

    return { success: true, institution };
  } catch (error) {
    console.error(`❌ [STRIPE] Error handling payment succeeded:`, error.message);
    return { success: false, error: error.message };
  }
};

/**
 * Handle payment failure
 * @param {object} invoice - Stripe invoice
 */
export const handlePaymentFailure = async (invoice) => {
  const Institution = (await import("../models/Institution.js")).default;
  
  const customerId = invoice.customer;
  const subscriptionId = invoice.subscription;
  
  try {
    // Try to find by subscription ID first (more reliable)
    let institution = subscriptionId 
      ? await Institution.findOne({ stripeSubscriptionId: subscriptionId })
      : null;
    
    // Fallback to customer ID if not found
    if (!institution && customerId) {
      institution = await Institution.findOne({ stripeCustomerId: customerId });
    }
    
    if (!institution) {
      console.warn(`⚠️ [STRIPE] Institution not found for customer ${customerId} or subscription ${subscriptionId}`);
      return { success: false, error: "Institution not found" };
    }

    // Don't delete data - just suspend
    // Idempotent: Only update if currently active
    if (institution.status === "active" && (institution.plan === "standard" || institution.plan === "flex")) {
      institution.status = "suspended";
      await institution.save();
      console.log(`⚠️ [STRIPE] Institution ${institution._id} suspended due to payment failure`);
    }

    return { success: true, institution };
  } catch (error) {
    console.error(`❌ [STRIPE] Error handling payment failure:`, error.message);
    return { success: false, error: error.message };
  }
};

/**
 * Handle subscription deletion
 * @param {object} subscription - Stripe subscription
 */
export const handleSubscriptionDeleted = async (subscription) => {
  const Institution = (await import("../models/Institution.js")).default;
  
  const subscriptionId = subscription.id;
  
  try {
    const institution = await Institution.findOne({ stripeSubscriptionId: subscriptionId });
    
    if (!institution) {
      console.warn(`⚠️ [STRIPE] Institution not found for subscription ${subscriptionId}`);
      return { success: false, error: "Institution not found" };
    }

    // Downgrade to suspended (don't delete data)
    // Idempotent: Only update if currently has a paid plan
    if (institution.plan === "standard" || institution.plan === "flex") {
      // Keep plan for historical purposes, but suspend access
      institution.status = "suspended";
      institution.stripeSubscriptionId = null;
      institution.stripePriceId = null;
      institution.stripeCurrentPeriodEnd = null;
      await institution.save();

      console.log(`⚠️ [STRIPE] Institution ${institution._id} subscription canceled, status set to suspended`);
    }

    return { success: true, institution };
  } catch (error) {
    console.error(`❌ [STRIPE] Error handling subscription deletion:`, error.message);
    return { success: false, error: error.message };
  }
};

