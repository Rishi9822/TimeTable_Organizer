import Stripe from "stripe";

let stripeInstance = null;

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

export const handleCheckoutSuccess = async (session) => {
  const Institution = (await import("../models/Institution.js")).default;

  try {
    const institutionId =
      session.client_reference_id || session.metadata?.institutionId;

    if (!institutionId) {
      throw new Error("Institution ID missing in checkout session");
    }

    const stripe = getStripe();
    if (!stripe) {
      throw new Error("Stripe not initialized");
    }

    // Fetch subscription details
    const subscription = await stripe.subscriptions.retrieve(
      session.subscription
    );

    const priceId = subscription.items.data[0]?.price?.id;

    const priceIds = getStripePriceIds();
    const plan =
      priceId === priceIds.flex
        ? "flex"
        : priceId === priceIds.standard
        ? "standard"
        : "standard";

    // ✅ FETCH INSTITUTION FIRST
    const institution = await Institution.findById(institutionId);

    if (!institution) {
      throw new Error(`Institution not found: ${institutionId}`);
    }

    // ✅ UPDATE SAFELY
    institution.plan = plan;
    institution.status = "active";
    institution.stripeCustomerId = session.customer;
    institution.stripeSubscriptionId = subscription.id;
    institution.stripePriceId = priceId;
    institution.stripeCurrentPeriodEnd = new Date(
      subscription.current_period_end * 1000
    );

    await institution.save();

    console.log(
      `✅ [STRIPE] Institution ${institution._id} activated with plan ${plan}`
    );

    return { success: true };
  } catch (error) {
    console.error(
      "❌ [STRIPE] handleCheckoutSuccess failed:",
      error.message
    );
    throw error;
  }
};


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

