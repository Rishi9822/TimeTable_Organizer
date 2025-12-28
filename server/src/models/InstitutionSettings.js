import mongoose from "mongoose";

const schema = new mongoose.Schema(
  {
    institutionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Institution",
      required: true,
      unique: true,
    },

    institution_name: String,
    institution_type: { type: String, enum: ["school", "college"] },
    working_days: [String],
    periods_per_day: Number,
    period_duration: Number,
    start_time: String,
    lab_duration: Number,
    breaks: Array,
    is_setup_complete: Boolean,
  },
  { timestamps: true }
);


schema.method("toJSON", function () {
  const { _id, __v, ...obj } = this.toObject();
  obj.id = _id;
  return obj;
});

export default mongoose.model("InstitutionSettings", schema);
