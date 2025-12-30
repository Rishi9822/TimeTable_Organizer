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
 * Handle successful checkout
 * @param {object} session - Stripe checkout session
 */
export const handleCheckoutSuccess = async (session) => {
  const Institution = (await import("../models/Institution.js")).default;
  
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

    institution.stripeCustomerId = customerId;
    institution.stripeSubscriptionId = subscriptionId;
    institution.stripePriceId = priceId;
    institution.stripeCurrentPeriodEnd = new Date(subscription.current_period_end * 1000);
    institution.plan = plan;
    institution.status = "active"; // Activate institution
    await institution.save();

    console.log(`✅ [STRIPE] Institution ${institutionId} upgraded to ${plan} plan`);

    return { success: true, institution, plan };
  } catch (error) {
    console.error(`❌ [STRIPE] Error handling checkout success:`, error.message);
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
  
  try {
    const institution = await Institution.findOne({ stripeCustomerId: customerId });
    
    if (!institution) {
      console.warn(`⚠️ [STRIPE] Institution not found for customer ${customerId}`);
      return { success: false, error: "Institution not found" };
    }

    // Don't delete data - just suspend
    if (institution.status === "active") {
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
    institution.status = "suspended";
    institution.stripeSubscriptionId = null;
    institution.stripePriceId = null;
    institution.stripeCurrentPeriodEnd = null;
    await institution.save();

    console.log(`⚠️ [STRIPE] Institution ${institution._id} subscription canceled, status set to suspended`);

    return { success: true, institution };
  } catch (error) {
    console.error(`❌ [STRIPE] Error handling subscription deletion:`, error.message);
    return { success: false, error: error.message };
  }
};

