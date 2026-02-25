import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    password: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      enum: ["super_admin", "admin", "scheduler", "teacher", "student"],
      default: "student",
    },

    // Platform-level flag — super_admin must always have null institutionId
    institutionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Institution",
      default: null,
      validate: {
        validator: function (value) {
          if (this.role === "super_admin") return value === null || value === undefined;
          return true; // other roles: institutionId can be null until they join
        },
        message: "super_admin users must not belong to an institution (institutionId must be null)",
      },
    },

    // Allows super admin to block users platform-wide
    isBlocked: {
      type: Boolean,
      default: false,
    },

    // Email verification fields
    emailVerified: {
      type: Boolean,
      default: false,
    },
    emailVerificationToken: String,
    emailVerificationExpires: Date,

    // Password reset fields
    passwordResetToken: String,
    passwordResetExpires: Date,

    // isSetupComplete: {
    //   type: Boolean,
    //   default: false,
    // },

  },
  { timestamps: true }
);

userSchema.index({ isBlocked: 1 });

// 🔐 HASH PASSWORD BEFORE SAVE
userSchema.pre("save", async function () {
  if (!this.isModified("password")) return;

  this.password = await bcrypt.hash(this.password, 10);
});


// 🔐 COMPARE PASSWORD
userSchema.methods.comparePassword = function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

export default mongoose.model("User", userSchema);
