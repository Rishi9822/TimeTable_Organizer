import mongoose from "mongoose";

const schema = new mongoose.Schema(
  {
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
