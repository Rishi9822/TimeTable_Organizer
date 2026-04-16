import mongoose from "mongoose";

const announcementSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    content: { type: String, required: true },
    priority: {
      type: String,
      enum: ["normal", "important", "urgent"],
      default: "normal",
    },
    audienceType: {
      type: String,
      enum: ["all", "teachers", "students"],
      default: "all",
    },
    audienceId: { type: mongoose.Schema.Types.ObjectId },
    institutionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Institution",
      required: true,
      index: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    isActive: { type: Boolean, default: true },
    expiresAt: { type: Date },
    modeType: {
      type: String,
      enum: ["school", "college"],
      default: null,
    },
  },
  { timestamps: true }
);

announcementSchema.index({ institutionId: 1, isActive: 1 });

export default mongoose.model("Announcement", announcementSchema);
