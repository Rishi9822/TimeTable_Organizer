import mongoose from "mongoose";

const teacherSchema = new mongoose.Schema(
  {
    institutionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Institution",
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      default: null,
    },
    phone: {
      type: String,
      default: null,
    },
    department: {
      type: String,
      default: null,
    },
    max_periods_per_day: {
      type: Number,
      default: 6,
    },
  },
  { timestamps: true }
);

/**
 * Convert _id → id (Supabase compatible)
 */
teacherSchema.method("toJSON", function () {
  const { _id, __v, ...obj } = this.toObject();
  obj.id = _id;
  return obj;
});

export default mongoose.model("Teacher", teacherSchema);
