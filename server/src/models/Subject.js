import mongoose from "mongoose";

const subjectSchema = new mongoose.Schema(
  {
    institutionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Institution",
      required: true,
    },
    name: { type: String, required: true },
    code: { type: String, default: null },
    color: { type: String, required: true },
    periods_per_week: { type: Number, default: 4 },
    // Flex plan: isolates records by mode (school | college)
    modeType: {
      type: String,
      enum: ["school", "college"],
      default: null,
    },
  },
  { timestamps: true }
);

// Compound index for mode-aware filtering
subjectSchema.index({ institutionId: 1, modeType: 1 });

subjectSchema.method("toJSON", function () {
  const { _id, __v, ...obj } = this.toObject();
  obj.id = _id;
  return obj;
});

export default mongoose.model("Subject", subjectSchema);
