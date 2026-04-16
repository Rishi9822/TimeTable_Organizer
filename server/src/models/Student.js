import mongoose from "mongoose";

const studentSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, trim: true, lowercase: true },
    phone: { type: String, trim: true },
    rollNumber: { type: String, trim: true },
    classId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Class",
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    institutionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Institution",
      required: true,
      index: true,
    },
    modeType: {
      type: String,
      enum: ["school", "college"],
      default: null,
    },
  },
  { timestamps: true }
);

studentSchema.index({ institutionId: 1, modeType: 1 });
studentSchema.index({ userId: 1 });
studentSchema.index({ classId: 1 });

export default mongoose.model("Student", studentSchema);
