import mongoose from "mongoose";

const institutionSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    isSetupComplete: {
      type: Boolean,
      default: false,
    },

    // SaaS: Institution lifecycle status
    status: {
      type: String,
      enum: ["trial", "active", "suspended", "archived"],
      default: "trial",
    },

    // SaaS: Plan type
    plan: {
      type: String,
      enum: ["trial", "standard", "flex"],
      default: "trial",
    },

    // SaaS: Trial information
    trialStartedAt: {
      type: Date,
      default: Date.now,
    },
    trialDays: {
      type: Number,
      default: 14, // Default 14-day trial
    },
    trialEndsAt: {
      type: Date,
    },

    // Stripe payment fields (backward compatible - defaults to null)
    stripeCustomerId: {
      type: String,
      default: null,
    },
    stripeSubscriptionId: {
      type: String,
      default: null,
    },
    stripePriceId: {
      type: String,
      default: null,
    },
    stripeCurrentPeriodEnd: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

// Calculate trialEndsAt before save (synchronous document middleware)
institutionSchema.pre("save", function () {
  // Only set trialEndsAt if this is a new trial institution
  if (this.isNew && this.status === "trial" && !this.trialEndsAt) {
    const endDate = new Date(this.trialStartedAt || Date.now());
    endDate.setDate(endDate.getDate() + (this.trialDays || 14));
    this.trialEndsAt = endDate;
  }
});
export default mongoose.model("Institution", institutionSchema);
