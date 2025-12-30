import mongoose from "mongoose";

/**
 * AuditLog Model
 * Records important actions performed by Admins and Schedulers
 * Read-only logs for compliance and accountability
 */
const auditLogSchema = new mongoose.Schema(
  {
    action: {
      type: String,
      required: true,
      index: true,
    },
    entityType: {
      type: String,
      required: true,
      index: true,
    },
    entityId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
      index: true,
    },
    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    role: {
      type: String,
      enum: ["admin", "scheduler"],
      required: true,
    },
    institutionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Institution",
      required: true,
      index: true,
    },
    meta: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for efficient querying by institution and date
auditLogSchema.index({ institutionId: 1, createdAt: -1 });

// Index for filtering by action type
auditLogSchema.index({ institutionId: 1, action: 1, createdAt: -1 });

auditLogSchema.method("toJSON", function () {
  const { _id, __v, ...obj } = this.toObject();
  obj.id = _id;
  return obj;
});

export default mongoose.model("AuditLog", auditLogSchema);













