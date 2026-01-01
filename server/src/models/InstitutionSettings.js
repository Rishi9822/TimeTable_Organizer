import mongoose from "mongoose";

const schema = new mongoose.Schema(
  {
    institutionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Institution",
      required: true,
      unique: true,
    },

    // =========================
    // Legacy single-mode fields
    // (always mirror activeMode)
    // =========================
    institution_name: String,
    institution_type: { type: String, enum: ["school", "college"] },
    working_days: { type: [String], default: [] },
    periods_per_day: Number,
    period_duration: Number,
    start_time: String,
    lab_duration: Number,
    breaks: { type: Array, default: [] },
    is_setup_complete: { type: Boolean, default: false },

    // =========================
    // Flex-only multi-mode fields
    // =========================
    activeMode: {
      type: String,
      enum: ["school", "college", null],
      default: null,
    },

    schoolConfig: {
      institution_type: {
        type: String,
        enum: ["school"],
        required: true,
      },
      working_days: { type: [String], default: [] },
      periods_per_day: Number,
      period_duration: Number,
      start_time: String,
      lab_duration: Number,
      breaks: { type: Array, default: [] },
      is_setup_complete: { type: Boolean, default: false },
    },

    collegeConfig: {
      institution_type: {
        type: String,
        enum: ["college"],
        required: true,
      },
      working_days: { type: [String], default: [] },
      periods_per_day: Number,
      period_duration: Number,
      start_time: String,
      lab_duration: Number,
      breaks: { type: Array, default: [] },
      is_setup_complete: { type: Boolean, default: false },
    },

    schoolSetupComplete: { type: Boolean, default: false },
    collegeSetupComplete: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Normalize output
schema.method("toJSON", function () {
  const { _id, __v, ...obj } = this.toObject();
  obj.id = _id;
  return obj;
});

export default mongoose.model("InstitutionSettings", schema);
