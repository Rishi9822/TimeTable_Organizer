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

    // Flex Plan: Track which modes are completed and which is active
    completedModes: {
      type: [String],
      enum: ["school", "college"],
      default: [],
    },
    activeMode: {
      type: String,
      enum: ["school", "college"],
      default: null,
    },
    // Track if institution type is locked (for Standard plan after setup)
    institutionTypeLocked: {
      type: Boolean,
      default: false,
    },
    // ONLY for Standard: the locked type value. MUST be null for Flex.
    lockedInstitutionType: {
      type: String,
      enum: ["school", "college"],
      default: null,
    },
  },
  { timestamps: true }
);

institutionSchema.index({ plan: 1 });
institutionSchema.index({ status: 1 });

// Calculate trialEndsAt before save (synchronous document middleware)
institutionSchema.pre("save", function () {
  // Only set trialEndsAt if this is a new trial institution
  if (this.isNew && this.status === "trial" && !this.trialEndsAt) {
    const endDate = new Date(this.trialStartedAt || Date.now());
    endDate.setDate(endDate.getDate() + (this.trialDays || 14));
    this.trialEndsAt = endDate;
  }

  // SaaS Logic: Lock institution type for Standard plan after setup is complete.
  // Flex must NEVER have lockedInstitutionType set.
  if (this.plan === "standard" && this.isSetupComplete && !this.institutionTypeLocked) {
    this.institutionTypeLocked = true;
  }
  if (this.plan === "flex") {
    this.lockedInstitutionType = null;
  }

  // SaaS Logic: For Flex plan, ensure activeMode is set if only one mode is completed
  if (this.plan === "flex" && this.completedModes.length === 1 && !this.activeMode) {
    this.activeMode = this.completedModes[0];
  }
});
export default mongoose.model("Institution", institutionSchema);
