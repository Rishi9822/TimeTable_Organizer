import mongoose from "mongoose";

const classSchema = new mongoose.Schema(
  {
    institutionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Institution",
      required: true,
      index: true,
    },
    name: { type: String, required: true },
    grade: { type: String, default: null },
    section: { type: String, default: null },
    institution_type: {
      type: String,
      enum: ["school", "college"],
      required: true,
    },
    capacity: { type: Number, default: 40 },
    // Flex plan: isolates records by mode (school | college). When set, used for Flex filtering.
    modeType: {
      type: String,
      enum: ["school", "college"],
      default: null,
    },
  },
  { timestamps: true }
);

classSchema.method("toJSON", function () {
  const { _id, __v, ...obj } = this.toObject();
  obj.id = _id;
  return obj;
});

export default mongoose.model("Class", classSchema);
