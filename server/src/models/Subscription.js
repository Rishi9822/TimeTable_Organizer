import mongoose from "mongoose";

/**
 * Subscription Model
 * Separate from Institution — owns all billing/plan state.
 * Created automatically when an Institution is created.
 */
const subscriptionSchema = new mongoose.Schema(
    {
        institutionId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Institution",
            required: true,
            unique: true,
        },

        plan: {
            type: String,
            enum: ["trial", "standard", "flex"],
            default: "trial",
        },

        status: {
            type: String,
            enum: ["active", "expired", "cancelled"],
            default: "active",
        },

        trialStartedAt: {
            type: Date,
            default: Date.now,
        },

        // trialStartedAt + 14 days — set automatically on create
        trialEndsAt: {
            type: Date,
        },

        upgradedAt: {
            type: Date,
            default: null,
        },

        // Set on Standard plan upgrade — locks the mode permanently
        lockedInstitutionType: {
            type: String,
            enum: ["school", "college", null],
            default: null,
        },

        // Stripe billing fields
        stripeCustomerId: {
            type: String,
            default: null,
        },
        stripeSubscriptionId: {
            type: String,
            default: null,
        },
    },
    { timestamps: true }
);

// Auto-calculate trialEndsAt (14 days from trialStartedAt) on new docs
subscriptionSchema.pre("save", function () {
    if (this.isNew && !this.trialEndsAt) {
        const end = new Date(this.trialStartedAt || Date.now());
        end.setDate(end.getDate() + 14);
        this.trialEndsAt = end;
    }
});

// Indexes
subscriptionSchema.index({ institutionId: 1 }, { unique: true });

export default mongoose.model("Subscription", subscriptionSchema);
