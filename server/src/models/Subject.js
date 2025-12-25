import mongoose from "mongoose";

const subjectSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    code: { type: String, default: null },
    color: { type: String, required: true },
    periods_per_week: { type: Number, default: 4 },
  },
  { timestamps: true }
);

subjectSchema.method("toJSON", function () {
  const { _id, __v, ...obj } = this.toObject();
  obj.id = _id;
  return obj;
});

export default mongoose.model("Subject", subjectSchema);
